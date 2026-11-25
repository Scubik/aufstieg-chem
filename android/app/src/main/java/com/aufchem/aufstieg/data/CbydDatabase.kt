package com.aufchem.aufstieg.data

import android.content.Context
import android.database.sqlite.SQLiteDatabase
import android.util.LruCache
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.sync.Semaphore
import kotlinx.coroutines.sync.withPermit
import kotlinx.coroutines.withContext
import java.io.File
import java.io.FileOutputStream

class CbydDatabase(private val context: Context) {

    companion object {
        private const val ASSET_DB_NAME = "cbyd.db"
        private const val DB_FILE_NAME = "cbyd.db"
        private const val PREFS_NAME = "cbyd_db_meta"
        private const val KEY_INSTALLED_SIZE = "installed_asset_size"
    }

    @Volatile
    private var db: SQLiteDatabase? = null

    private val sequenceCache = LruCache<String, SequenceModel>(6)
    private val previewCache = LruCache<String, ChemBitmap>(160)
    private val previewSemaphore = Semaphore(3)

    suspend fun ensureDatabaseReady(
        onProgress: (progress: Float, copiedMb: Int, totalMb: Int) -> Unit,
    ) = withContext(Dispatchers.IO) {
        val dbFile = context.getDatabasePath(DB_FILE_NAME)
        dbFile.parentFile?.mkdirs()

        val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        val expectedSize = try {
            context.assets.openFd(ASSET_DB_NAME).use { it.length }
        } catch (_: Exception) {
            -1L
        }

        val alreadyInstalled = dbFile.exists() &&
            dbFile.length() > 1_000_000L &&
            (expectedSize <= 0L || (dbFile.length() == expectedSize && prefs.getLong(KEY_INSTALLED_SIZE, -1L) == expectedSize))

        if (!alreadyInstalled) {
            val totalBytes = if (expectedSize > 0) expectedSize else 339_000_000L
            val totalMb = (totalBytes / (1024 * 1024)).toInt().coerceAtLeast(1)

            val freeSpace = dbFile.parentFile?.usableSpace ?: Long.MAX_VALUE
            if (freeSpace < totalBytes + 32L * 1024L * 1024L) {
                val neededMb = ((totalBytes + 32L * 1024L * 1024L) / (1024 * 1024)).toInt()
                throw IllegalStateException("Недостаточно свободной памяти на устройстве (нужно около $neededMb МБ).")
            }

            val tmpFile = File(dbFile.parentFile, "$DB_FILE_NAME.tmp")
            if (tmpFile.exists()) tmpFile.delete()

            context.assets.open(ASSET_DB_NAME).use { input ->
                FileOutputStream(tmpFile).use { output ->
                    val buffer = ByteArray(256 * 1024)
                    var copied = 0L
                    var lastReport = 0L
                    while (true) {
                        val read = input.read(buffer)
                        if (read <= 0) break
                        output.write(buffer, 0, read)
                        copied += read
                        if (copied - lastReport >= 2L * 1024L * 1024L || copied >= totalBytes) {
                            lastReport = copied
                            val progress = (copied.toFloat() / totalBytes.toFloat()).coerceIn(0f, 1f)
                            val copiedMb = (copied / (1024 * 1024)).toInt()
                            onProgress(progress, copiedMb, totalMb)
                        }
                    }
                    output.fd.sync()
                }
            }

            if (dbFile.exists()) dbFile.delete()
            if (!tmpFile.renameTo(dbFile)) {
                throw IllegalStateException("Не удалось сохранить файл базы данных.")
            }
            prefs.edit().putLong(KEY_INSTALLED_SIZE, dbFile.length()).apply()
        }

        openDb(dbFile)
    }

    @Synchronized
    private fun openDb(dbFile: File): SQLiteDatabase {
        db?.let { if (it.isOpen) return it }
        val opened = SQLiteDatabase.openDatabase(
            dbFile.absolutePath,
            null,
            SQLiteDatabase.OPEN_READONLY or SQLiteDatabase.NO_LOCALIZED_COLLATORS,
        )
        db = opened
        return opened
    }

    suspend fun loadCatalog(): List<CatalogItem> = withContext(Dispatchers.IO) {
        val database = db ?: openDb(context.getDatabasePath(DB_FILE_NAME))
        val items = ArrayList<CatalogItem>(4500)
        database.rawQuery(
            "SELECT path, full, name, author, year, drug FROM catalog ORDER BY name COLLATE NOCASE ASC",
            null,
        ).use { c ->
            while (c.moveToNext()) {
                items.add(
                    CatalogItem(
                        path = c.getString(0) ?: "",
                        full = c.getString(1) ?: "",
                        name = c.getString(2) ?: "",
                        author = c.getString(3) ?: "",
                        year = c.getString(4) ?: "",
                        drug = c.getString(5) ?: "",
                    )
                )
            }
        }
        items
    }

    suspend fun loadSequence(path: String): SequenceModel? {
        sequenceCache.get(path)?.let { return it }

        val blob: ByteArray = withContext(Dispatchers.IO) {
            val database = db ?: openDb(context.getDatabasePath(DB_FILE_NAME))
            database.rawQuery(
                "SELECT payload FROM syntheses WHERE path = ? AND status = 'ok'",
                arrayOf(path),
            ).use { c ->
                if (c.moveToFirst()) c.getBlob(0) else null
            }
        } ?: return null

        val seq = withContext(Dispatchers.Default) {
            CbydDecoder.unpackSequence(blob)
        }
        sequenceCache.put(path, seq)
        return seq
    }

    fun getCachedPreview(path: String): ChemBitmap? = previewCache.get(path)

    suspend fun loadTargetPreview(path: String): ChemBitmap? {
        previewCache.get(path)?.let { return it }
        return previewSemaphore.withPermit {
            previewCache.get(path)?.let { return@withPermit it }
            val blob: ByteArray = withContext(Dispatchers.IO) {
                val database = db ?: openDb(context.getDatabasePath(DB_FILE_NAME))
                database.rawQuery(
                    "SELECT payload FROM syntheses WHERE path = ? AND status = 'ok'",
                    arrayOf(path),
                ).use { c ->
                    if (c.moveToFirst()) c.getBlob(0) else null
                }
            } ?: return@withPermit null

            val preview = withContext(Dispatchers.Default) {
                try {
                    CbydDecoder.unpackTargetPreview(blob)
                } catch (_: Exception) {
                    null
                }
            } ?: return@withPermit null

            previewCache.put(path, preview)
            preview
        }
    }

    fun close() {
        sequenceCache.evictAll()
        previewCache.evictAll()
        db?.close()
        db = null
    }
}
