package com.aufchem.aufstieg.data

import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.Canvas
import android.graphics.Color
import org.json.JSONArray
import org.json.JSONObject
import org.tukaani.xz.XZInputStream
import java.io.ByteArrayInputStream
import java.io.ByteArrayOutputStream
import java.nio.ByteBuffer
import java.nio.ByteOrder

/**
 * Decodes `gray4_lzma_v1` synthesis BLOBs from cbyd.db into trimmed Android Bitmaps.
 *
 * Monochrome images (mode 0) are decoded as black ink with alpha = (255 - gray) so they
 * composite identically on white paper/PDF AND can be cleanly tinted in dark mode without
 * white boxes or halo artifacts.
 */
object CbydDecoder {
    private val GRAY4_ALPHA = intArrayOf(255, 170, 85, 0) // 255 - [0, 85, 170, 255]
    private const val SPLIT_MIN_GAP = 40
    private const val TRIM_PAD = 8

    private data class RawImageRecord(
        val mode: Int,
        val width: Int,
        val height: Int,
        val offset: Int,
        val length: Int,
    )

    fun unpackSequence(payload: ByteArray): SequenceModel {
        val raw = decompressXz(payload)
        val bb = ByteBuffer.wrap(raw).order(ByteOrder.LITTLE_ENDIAN)
        val treeLen = bb.int
        val treeJson = String(raw, 4, treeLen, Charsets.UTF_8)
        val tree = JSONObject(treeJson)

        var pos = 4 + treeLen
        val records = ArrayList<RawImageRecord>()
        while (pos + 9 <= raw.size) {
            val mode = raw[pos].toInt() and 0xFF
            val w = (raw[pos + 1].toInt() and 0xFF) or ((raw[pos + 2].toInt() and 0xFF) shl 8)
            val h = (raw[pos + 3].toInt() and 0xFF) or ((raw[pos + 4].toInt() and 0xFF) shl 8)
            val dlen = (raw[pos + 5].toInt() and 0xFF) or
                ((raw[pos + 6].toInt() and 0xFF) shl 8) or
                ((raw[pos + 7].toInt() and 0xFF) shl 16) or
                ((raw[pos + 8].toInt() and 0xFF) shl 24)
            pos += 9
            if (dlen < 0 || pos + dlen > raw.size) break
            records.add(RawImageRecord(mode, w, h, pos, dlen))
            pos += dlen
        }

        val decodedCache = arrayOfNulls<ChemBitmap>(records.size)
        val trimmedCache = arrayOfNulls<ChemBitmap>(records.size)

        fun decodeRaw(idx: Int): ChemBitmap? {
            if (idx < 0 || idx >= records.size) return null
            decodedCache[idx]?.let { return it }
            val rec = records[idx]
            val decoded = decodeRecord(raw, rec)
            decodedCache[idx] = decoded
            return decoded
        }

        fun decodeTrimmed(idx: Int, pad: Int = TRIM_PAD): ChemBitmap? {
            if (idx < 0 || idx >= records.size) return null
            if (pad == TRIM_PAD) {
                trimmedCache[idx]?.let { return it }
            }
            val base = decodeRaw(idx) ?: return null
            val t = trimBitmap(base, pad)
            if (pad == TRIM_PAD) trimmedCache[idx] = t
            return t
        }

        fun parseSeq(obj: JSONObject): SequenceModel {
            val startIdx = obj.optInt("start", -1)
            val citIdx = obj.optInt("citation", -1)
            val startImg = decodeTrimmed(startIdx)
            val citImg = decodeTrimmed(citIdx, pad = 4)

            val stepsJson: JSONArray = obj.optJSONArray("steps") ?: JSONArray()
            val steps = ArrayList<StepModel>(stepsJson.length())
            var currentSub = startImg

            for (i in 0 until stepsJson.length()) {
                val st = stepsJson.getJSONObject(i)
                val rIdx = st.optInt("reagent", -1)
                val tIdx = st.optInt("target", -1)
                val nrIdx = st.optInt("nr", -1)
                val subObj = st.optJSONObject("sub")

                val rawReaction = decodeRaw(rIdx)
                val targetImg = decodeTrimmed(tIdx)
                if (rawReaction != null && targetImg != null && currentSub != null) {
                    val parts = splitReaction(rawReaction)
                    val nrImg = if (nrIdx >= 0) decodeTrimmed(nrIdx) else null
                    val subSeq = subObj?.let { parseSeq(it) }
                    steps.add(
                        StepModel(
                            stepIndex = st.optInt("idx", i + 1),
                            reagentNum = st.optInt("rnum", 0),
                            substrate = currentSub,
                            reaction = parts,
                            product = targetImg,
                            namedReaction = nrImg,
                            subsequence = subSeq,
                        )
                    )
                    currentSub = targetImg
                }
            }

            return SequenceModel(
                name = obj.optString("name", ""),
                path = obj.optString("path", ""),
                doi = obj.optString("doi", ""),
                start = startImg,
                citation = citImg,
                steps = steps,
            )
        }

        return parseSeq(tree)
    }

    /**
     * Fast path for catalog thumbnails: decodes only the final target molecule (or start molecule
     * if there are no steps) and scales it down to fit within [maxDim] px.
     */
    fun unpackTargetPreview(payload: ByteArray, maxDim: Int = 220): ChemBitmap? {
        val raw = decompressXz(payload)
        if (raw.size < 4) return null
        val bb = ByteBuffer.wrap(raw).order(ByteOrder.LITTLE_ENDIAN)
        val treeLen = bb.int
        if (treeLen <= 0 || 4 + treeLen > raw.size) return null
        val treeJson = String(raw, 4, treeLen, Charsets.UTF_8)
        val tree = JSONObject(treeJson)

        val stepsJson = tree.optJSONArray("steps")
        val targetIdx = if (stepsJson != null && stepsJson.length() > 0) {
            stepsJson.getJSONObject(stepsJson.length() - 1).optInt("target", -1)
        } else {
            tree.optInt("start", -1)
        }
        val idxToDecode = if (targetIdx >= 0) targetIdx else tree.optInt("start", -1)
        if (idxToDecode < 0) return null

        var pos = 4 + treeLen
        var currentIdx = 0
        var targetRecord: RawImageRecord? = null
        while (pos + 9 <= raw.size) {
            val mode = raw[pos].toInt() and 0xFF
            val w = (raw[pos + 1].toInt() and 0xFF) or ((raw[pos + 2].toInt() and 0xFF) shl 8)
            val h = (raw[pos + 3].toInt() and 0xFF) or ((raw[pos + 4].toInt() and 0xFF) shl 8)
            val dlen = (raw[pos + 5].toInt() and 0xFF) or
                ((raw[pos + 6].toInt() and 0xFF) shl 8) or
                ((raw[pos + 7].toInt() and 0xFF) shl 16) or
                ((raw[pos + 8].toInt() and 0xFF) shl 24)
            pos += 9
            if (dlen < 0 || pos + dlen > raw.size) break
            if (currentIdx == idxToDecode) {
                targetRecord = RawImageRecord(mode, w, h, pos, dlen)
                break
            }
            pos += dlen
            currentIdx++
        }

        val rec = targetRecord ?: return null
        val decoded = decodeRecord(raw, rec) ?: return null
        val trimmed = trimBitmap(decoded, pad = 6)
        if (trimmed.bitmap !== decoded.bitmap) decoded.bitmap.recycle()

        val bmp = trimmed.bitmap
        val longest = maxOf(bmp.width, bmp.height)
        if (longest <= maxDim) return trimmed

        val scale = maxDim.toFloat() / longest.toFloat()
        val dstW = (bmp.width * scale).toInt().coerceAtLeast(1)
        val dstH = (bmp.height * scale).toInt().coerceAtLeast(1)
        val scaled = Bitmap.createScaledBitmap(bmp, dstW, dstH, true)
        if (scaled !== bmp) bmp.recycle()
        return ChemBitmap(scaled, trimmed.isColored)
    }

    private fun decompressXz(payload: ByteArray): ByteArray {
        XZInputStream(ByteArrayInputStream(payload)).use { xzis ->
            val out = ByteArrayOutputStream(payload.size * 4)
            val buf = ByteArray(16384)
            while (true) {
                val n = xzis.read(buf)
                if (n <= 0) break
                out.write(buf, 0, n)
            }
            return out.toByteArray()
        }
    }

    private fun decodeRecord(raw: ByteArray, rec: RawImageRecord): ChemBitmap? {
        if (rec.mode == 0) {
            val w = rec.width
            val h = rec.height
            if (w <= 0 || h <= 0) return null
            val stride = (w + 3) / 4
            val pixels = IntArray(w * h)
            var srcRow = rec.offset
            var dstRow = 0
            for (y in 0 until h) {
                var x = 0
                var s = srcRow
                while (x < w) {
                    val b = raw[s++].toInt() and 0xFF
                    pixels[dstRow + x] = GRAY4_ALPHA[(b ushr 6) and 0x03] shl 24
                    if (x + 1 < w) pixels[dstRow + x + 1] = GRAY4_ALPHA[(b ushr 4) and 0x03] shl 24
                    if (x + 2 < w) pixels[dstRow + x + 2] = GRAY4_ALPHA[(b ushr 2) and 0x03] shl 24
                    if (x + 3 < w) pixels[dstRow + x + 3] = GRAY4_ALPHA[b and 0x03] shl 24
                    x += 4
                }
                srcRow += stride
                dstRow += w
            }
            val bmp = Bitmap.createBitmap(w, h, Bitmap.Config.ARGB_8888)
            bmp.setPixels(pixels, 0, w, 0, 0, w, h)
            return ChemBitmap(bmp, isColored = false)
        } else {
            val bmp = BitmapFactory.decodeByteArray(raw, rec.offset, rec.length) ?: return null
            val argb = if (bmp.config == Bitmap.Config.ARGB_8888) bmp else bmp.copy(Bitmap.Config.ARGB_8888, false)
            return ChemBitmap(argb, isColored = true)
        }
    }

    private fun isInk(pixel: Int, isColored: Boolean): Boolean {
        val a = (pixel ushr 24) and 0xFF
        if (!isColored) {
            return a > 8
        }
        val r = (pixel ushr 16) and 0xFF
        val g = (pixel ushr 8) and 0xFF
        val b = pixel and 0xFF
        val rgbMin = minOf(r, g, b)
        return a > 8 && rgbMin < 245
    }

    private fun trimBitmap(chem: ChemBitmap, pad: Int = TRIM_PAD): ChemBitmap {
        val bmp = chem.bitmap
        val w = bmp.width
        val h = bmp.height
        val pixels = IntArray(w * h)
        bmp.getPixels(pixels, 0, w, 0, 0, w, h)

        var minX = w
        var minY = h
        var maxX = -1
        var maxY = -1
        for (y in 0 until h) {
            val row = y * w
            for (x in 0 until w) {
                if (isInk(pixels[row + x], chem.isColored)) {
                    if (x < minX) minX = x
                    if (x > maxX) maxX = x
                    if (y < minY) minY = y
                    if (y > maxY) maxY = y
                }
            }
        }
        if (maxX < minX || maxY < minY) return chem

        val cropW = maxX - minX + 1
        val cropH = maxY - minY + 1
        val outW = cropW + pad * 2
        val outH = cropH + pad * 2
        val out = Bitmap.createBitmap(outW, outH, Bitmap.Config.ARGB_8888)
        if (chem.isColored) {
            out.eraseColor(Color.WHITE)
        }
        val cropped = Bitmap.createBitmap(bmp, minX, minY, cropW, cropH)
        Canvas(out).drawBitmap(cropped, pad.toFloat(), pad.toFloat(), null)
        if (cropped !== bmp) cropped.recycle()
        return ChemBitmap(out, chem.isColored)
    }

    /**
     * Port of html_generator.py's split_reaction():
     * Splits a reaction image into (reagent above arrow, conditions below arrow)
     * along the widest empty horizontal band (>= 40px, with >= 70px margin on both sides).
     */
    private fun splitReaction(chem: ChemBitmap): ReactionParts {
        val bmp = chem.bitmap
        val w = bmp.width
        val h = bmp.height
        val pixels = IntArray(w * h)
        bmp.getPixels(pixels, 0, w, 0, 0, w, h)

        val rowHasInk = BooleanArray(h)
        for (y in 0 until h) {
            val row = y * w
            var found = false
            for (x in 0 until w) {
                if (isInk(pixels[row + x], chem.isColored)) {
                    found = true
                    break
                }
            }
            rowHasInk[y] = found
        }

        val combined = trimBitmap(chem, TRIM_PAD)

        var bestStart = -1
        var bestEnd = -1
        var bestLen = 0
        var runStart = -1
        for (y in 0 until h) {
            if (!rowHasInk[y] && runStart == -1) {
                runStart = y
            } else if (rowHasInk[y] && runStart != -1) {
                val runEnd = y - 1
                if (runStart > 0 && runEnd < h - 1) {
                    val len = runEnd - runStart + 1
                    if (len > bestLen) {
                        bestLen = len
                        bestStart = runStart
                        bestEnd = runEnd
                    }
                }
                runStart = -1
            }
        }

        if (bestLen >= SPLIT_MIN_GAP && bestStart >= 70 && (h - 1 - bestEnd) >= 70) {
            val topCrop = Bitmap.createBitmap(bmp, 0, 0, w, bestStart)
            val botCrop = Bitmap.createBitmap(bmp, 0, bestEnd + 1, w, h - (bestEnd + 1))
            val topTrim = trimBitmap(ChemBitmap(topCrop, chem.isColored), TRIM_PAD)
            val botTrim = trimBitmap(ChemBitmap(botCrop, chem.isColored), TRIM_PAD)
            if (topCrop !== bmp && topCrop !== topTrim.bitmap) topCrop.recycle()
            if (botCrop !== bmp && botCrop !== botTrim.bitmap) botCrop.recycle()
            return ReactionParts(reagent = topTrim, conditions = botTrim, combined = combined)
        }

        return ReactionParts(reagent = null, conditions = combined, combined = combined)
    }
}
