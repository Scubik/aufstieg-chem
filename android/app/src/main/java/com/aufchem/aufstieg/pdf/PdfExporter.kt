package com.aufchem.aufstieg.pdf

import android.content.Context
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.DashPathEffect
import android.graphics.Paint
import android.graphics.Path
import android.graphics.RectF
import android.graphics.Typeface
import android.graphics.pdf.PdfDocument
import android.net.Uri
import androidx.core.content.FileProvider
import com.aufchem.aufstieg.data.CatalogItem
import com.aufchem.aufstieg.data.SequenceModel
import com.aufchem.aufstieg.layout.PDF_SNAKE_CONFIG
import com.aufchem.aufstieg.layout.SnakeBoard
import com.aufchem.aufstieg.layout.SnakeLayoutEngine
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import java.io.File
import java.io.FileOutputStream
import java.net.URLDecoder
import kotlin.math.atan2
import kotlin.math.cos
import kotlin.math.max
import kotlin.math.min
import kotlin.math.sin

/**
 * Generates a crisp 2-page A4 landscape PDF natively using android.graphics.pdf.PdfDocument:
 *  - Page 1: Synthesis puzzle ("змейка") with intermediate products masked as numbered boxes
 *  - Page 2: Answer key ("Ответы") with all intermediate structures revealed
 */
object PdfExporter {
    // A4 Landscape in PostScript points (72 dpi): 297mm x 210mm
    private const val PAGE_W = 842
    private const val PAGE_H = 595
    private const val MARGIN_X = 22f
    private const val HEADER_H = 38f
    private const val FOOTER_H = 34f

    suspend fun exportSynthesisPdf(
        context: Context,
        item: CatalogItem,
        sequence: SequenceModel,
        revealedNodeIndices: Set<Int> = emptySet(),
    ): Uri = withContext(Dispatchers.Default) {
        val pageBoardH = if (sequence.citation != null) SnakeLayoutEngine.A4_PAGE_H_CIT else SnakeLayoutEngine.A4_PAGE_H
        val board = SnakeLayoutEngine.build(
            sequence = sequence,
            cfg = PDF_SNAKE_CONFIG,
            pageW = SnakeLayoutEngine.A4_PAGE_W,
            pageH = pageBoardH,
        )

        val pdf = PdfDocument()
        val logoBitmap = loadOriginalLogo(context)
        try {
            drawPage(
                pdf = pdf,
                pageNumber = 1,
                item = item,
                sequence = sequence,
                board = board,
                showAnswers = false,
                revealedNodeIndices = revealedNodeIndices,
                logoBitmap = logoBitmap,
            )
            drawPage(
                pdf = pdf,
                pageNumber = 2,
                item = item,
                sequence = sequence,
                board = board,
                showAnswers = true,
                revealedNodeIndices = emptySet(),
                logoBitmap = logoBitmap,
            )

            val dir = File(context.cacheDir, "pdfs").apply { mkdirs() }
            // Keep cache tidy (delete older temporary PDFs beyond 15)
            dir.listFiles()?.sortedByDescending { it.lastModified() }?.drop(15)?.forEach { it.delete() }

            val safeName = (item.full.ifBlank { sequence.name })
                .replace(Regex("[^a-zA-Z0-9а-яА-ЯёЁ._\\- ]"), "_")
                .trim()
                .take(80)
                .ifBlank { "synthesis" }
            val outFile = File(dir, "$safeName.pdf")
            FileOutputStream(outFile).use { fos ->
                pdf.writeTo(fos)
            }
            FileProvider.getUriForFile(context, "${context.packageName}.fileprovider", outFile)
        } finally {
            logoBitmap?.recycle()
            pdf.close()
        }
    }

    private fun loadOriginalLogo(context: Context): Bitmap? = try {
        context.assets.open("aufstieg_logo.png").use { input ->
            BitmapFactory.decodeStream(input)
        }
    } catch (_: Exception) {
        null
    }

    private fun drawPage(
        pdf: PdfDocument,
        pageNumber: Int,
        item: CatalogItem,
        sequence: SequenceModel,
        board: SnakeBoard,
        showAnswers: Boolean,
        revealedNodeIndices: Set<Int>,
        logoBitmap: Bitmap?,
    ) {
        val pageInfo = PdfDocument.PageInfo.Builder(PAGE_W, PAGE_H, pageNumber).create()
        val page = pdf.startPage(pageInfo)
        val canvas = page.canvas

        // Clean white paper background
        canvas.drawColor(Color.WHITE)

        drawHeader(canvas, item, sequence, showAnswers)

        // Compute scale to fit board neatly between header and footer
        val availW = PAGE_W - 2f * MARGIN_X
        val availH = PAGE_H - HEADER_H - FOOTER_H - 12f
        val scale = min(availW / max(1f, board.width), availH / max(1f, board.height))
        val drawW = board.width * scale
        val drawH = board.height * scale
        val offsetX = (PAGE_W - drawW) / 2f
        val offsetY = HEADER_H + 6f + (availH - drawH) / 2f

        canvas.save()
        canvas.translate(offsetX, offsetY)
        canvas.scale(scale, scale)

        val bmpPaint = Paint(Paint.ANTI_ALIAS_FLAG or Paint.FILTER_BITMAP_FLAG)

        // Draw arrows
        val arrowPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
            color = Color.rgb(30, 41, 59)
            strokeWidth = max(4.5f, 1.35f / scale)
            style = Paint.Style.STROKE
            strokeCap = Paint.Cap.ROUND
        }
        val arrowFillPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
            color = Color.rgb(30, 41, 59)
            style = Paint.Style.FILL
        }
        val headLen = max(22f, 6.5f / scale)
        val headW = headLen * 0.45f

        for (a in board.arrows) {
            val angle = atan2((a.y2 - a.y1).toDouble(), (a.x2 - a.x1).toDouble()).toFloat()
            val ex = a.x2 - cos(angle) * (headLen * 0.7f)
            val ey = a.y2 - sin(angle) * (headLen * 0.7f)
            canvas.drawLine(a.x1, a.y1, ex, ey, arrowPaint)

            val path = Path().apply {
                moveTo(a.x2, a.y2)
                lineTo(
                    a.x2 - cos(angle) * headLen + sin(angle) * headW,
                    a.y2 - sin(angle) * headLen - cos(angle) * headW,
                )
                lineTo(
                    a.x2 - cos(angle) * headLen - sin(angle) * headW,
                    a.y2 - sin(angle) * headLen + cos(angle) * headW,
                )
                close()
            }
            canvas.drawPath(path, arrowFillPaint)
        }

        // Draw reaction labels
        for (l in board.labels) {
            val dst = RectF(l.x, l.y, l.x + l.width, l.y + l.height)
            canvas.drawBitmap(l.bitmap.bitmap, null, dst, bmpPaint)
        }

        // Draw nodes (or practically transparent quiz masks on page 1)
        val dash = max(14f, 4f / scale)
        val maskStroke = Paint(Paint.ANTI_ALIAS_FLAG).apply {
            color = Color.argb(86, 155, 168, 184)
            strokeWidth = max(3.5f, 1.1f / scale)
            style = Paint.Style.STROKE
            pathEffect = DashPathEffect(floatArrayOf(dash, dash * 0.7f), 0f)
        }
        val numPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
            color = Color.argb(62, 130, 144, 162)
            textAlign = Paint.Align.CENTER
            typeface = Typeface.create(Typeface.SANS_SERIF, Typeface.BOLD)
        }

        for (node in board.nodes) {
            val dst = RectF(node.x, node.y, node.x + node.width, node.y + node.height)
            val isMasked = node.hiddenByDefault && !showAnswers && !revealedNodeIndices.contains(node.index)
            if (isMasked) {
                val radius = max(14f, 6f / scale)
                canvas.drawRoundRect(dst, radius, radius, maskStroke)
                numPaint.textSize = (min(node.width, node.height) * 0.28f).coerceIn(36f, 96f)
                val fm = numPaint.fontMetrics
                val textY = dst.centerY() - (fm.ascent + fm.descent) / 2f
                canvas.drawText(node.stageNumber.toString(), dst.centerX(), textY, numPaint)
            } else {
                canvas.drawBitmap(node.bitmap.bitmap, null, dst, bmpPaint)
            }
        }

        canvas.restore()

        drawFooter(canvas, sequence, logoBitmap)
        pdf.finishPage(page)
    }

    private fun drawHeader(
        canvas: Canvas,
        item: CatalogItem,
        sequence: SequenceModel,
        showAnswers: Boolean,
    ) {
        val titlePaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
            color = Color.rgb(15, 23, 42)
            textSize = 14f
            typeface = Typeface.create(Typeface.SANS_SERIF, Typeface.BOLD)
        }
        val metaPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
            color = Color.rgb(100, 116, 139)
            textSize = 9.5f
            typeface = Typeface.create(Typeface.SANS_SERIF, Typeface.NORMAL)
        }

        val title = sequence.name.ifBlank { item.displayTitle }
        canvas.drawText(title, MARGIN_X, 20f, titlePaint)

        val parts = mutableListOf<String>()
        if (item.author.isNotBlank()) parts.add(item.author)
        if (item.year.isNotBlank()) parts.add(item.year)
        parts.add("${sequence.steps.size} ${pluralSteps(sequence.steps.size)}")
        if (sequence.doi.isNotBlank()) {
            val decoded = try {
                URLDecoder.decode(sequence.doi, "UTF-8")
            } catch (_: Exception) {
                sequence.doi
            }
            parts.add("doi:$decoded")
        }
        canvas.drawText(parts.joinToString(" · "), MARGIN_X, 32f, metaPaint)

        // Badge on right
        val badgeText = if (showAnswers) "Ответы" else "Задание"
        val badgeBg = Paint(Paint.ANTI_ALIAS_FLAG).apply {
            color = if (showAnswers) Color.rgb(220, 252, 231) else Color.rgb(219, 234, 254)
            style = Paint.Style.FILL
        }
        val badgeFg = Paint(Paint.ANTI_ALIAS_FLAG).apply {
            color = if (showAnswers) Color.rgb(21, 128, 61) else Color.rgb(29, 78, 216)
            textSize = 9.5f
            typeface = Typeface.create(Typeface.SANS_SERIF, Typeface.BOLD)
            textAlign = Paint.Align.CENTER
        }
        val bw = 64f
        val bh = 18f
        val bx = PAGE_W - MARGIN_X - bw
        val by = 11f
        canvas.drawRoundRect(RectF(bx, by, bx + bw, by + bh), 9f, 9f, badgeBg)
        val fm = badgeFg.fontMetrics
        canvas.drawText(badgeText, bx + bw / 2f, by + bh / 2f - (fm.ascent + fm.descent) / 2f, badgeFg)

        // Subtle divider line
        val divPaint = Paint().apply {
            color = Color.rgb(226, 232, 240)
            strokeWidth = 0.8f
        }
        canvas.drawLine(MARGIN_X, HEADER_H, PAGE_W - MARGIN_X, HEADER_H, divPaint)
    }

    private fun drawFooter(canvas: Canvas, sequence: SequenceModel, logoBitmap: Bitmap?) {
        val yTop = PAGE_H - FOOTER_H
        val divPaint = Paint().apply {
            color = Color.rgb(226, 232, 240)
            strokeWidth = 0.8f
        }
        canvas.drawLine(MARGIN_X, yTop, PAGE_W - MARGIN_X, yTop, divPaint)

        // Citation bitmap on bottom left
        sequence.citation?.let { cit ->
            val maxH = FOOTER_H - 8f
            val maxW = PAGE_W * 0.65f
            val sc = min(maxH / max(1, cit.height), maxW / max(1, cit.width))
            val cw = cit.width * sc
            val ch = cit.height * sc
            val dst = RectF(MARGIN_X, yTop + (FOOTER_H - ch) / 2f, MARGIN_X + cw, yTop + (FOOTER_H + ch) / 2f)
            canvas.drawBitmap(cit.bitmap, null, dst, Paint(Paint.ANTI_ALIAS_FLAG or Paint.FILTER_BITMAP_FLAG))
        }

        // Original Aufstieg logo in bottom-right corner
        if (logoBitmap != null && logoBitmap.height > 0) {
            val targetH = 22f
            val targetW = targetH * (logoBitmap.width.toFloat() / logoBitmap.height.toFloat())
            val dst = RectF(
                PAGE_W - MARGIN_X - targetW,
                yTop + (FOOTER_H - targetH) / 2f,
                PAGE_W - MARGIN_X,
                yTop + (FOOTER_H + targetH) / 2f,
            )
            val logoPaint = Paint(Paint.ANTI_ALIAS_FLAG or Paint.FILTER_BITMAP_FLAG).apply {
                alpha = 64
            }
            canvas.drawBitmap(logoBitmap, null, dst, logoPaint)
        }
    }

    fun pluralSteps(n: Int): String {
        val m100 = n % 100
        if (m100 in 11..14) return "стадий"
        return when (n % 10) {
            1 -> "стадия"
            2, 3, 4 -> "стадии"
            else -> "стадий"
        }
    }
}
