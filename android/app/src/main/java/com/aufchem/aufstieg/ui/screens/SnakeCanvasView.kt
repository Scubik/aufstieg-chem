package com.aufchem.aufstieg.ui.screens

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.gestures.detectTapGestures
import androidx.compose.foundation.gestures.detectTransformGestures
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxWithConstraints
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.Add
import androidx.compose.material.icons.rounded.FitScreen
import androidx.compose.material.icons.rounded.Remove
import androidx.compose.material.icons.rounded.Visibility
import androidx.compose.material.icons.rounded.VisibilityOff
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableFloatStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.produceState
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberUpdatedState
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clipToBounds
import androidx.compose.ui.geometry.CornerRadius
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.ColorFilter
import androidx.compose.ui.graphics.FilterQuality
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.asImageBitmap
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.graphics.drawscope.withTransform
import androidx.compose.ui.graphics.nativeCanvas
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.unit.IntOffset
import androidx.compose.ui.unit.IntSize
import androidx.compose.ui.unit.dp
import com.aufchem.aufstieg.data.SequenceModel
import com.aufchem.aufstieg.layout.SCREEN_SNAKE_CONFIG
import com.aufchem.aufstieg.layout.SnakeBoard
import com.aufchem.aufstieg.layout.SnakeLayoutEngine
import com.aufchem.aufstieg.ui.theme.LocalChemDiagramTheme
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import kotlin.math.atan2
import kotlin.math.cos
import kotlin.math.max
import kotlin.math.min
import kotlin.math.roundToInt
import kotlin.math.sin

@Composable
fun SnakeCanvasView(
    sequence: SequenceModel,
    revealedNodes: Set<Int>,
    onRevealedNodesChange: (Set<Int>) -> Unit,
    modifier: Modifier = Modifier,
) {
    val board by produceState<SnakeBoard?>(initialValue = null, key1 = sequence) {
        value = withContext(Dispatchers.Default) {
            SnakeLayoutEngine.build(sequence, cfg = SCREEN_SNAKE_CONFIG)
        }
    }

    val currentBoard = board
    if (currentBoard == null) {
        Box(modifier = modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
            CircularProgressIndicator()
        }
        return
    }

    val diagTheme = LocalChemDiagramTheme.current
    val useDarkBoard = diagTheme.isDark && diagTheme.adaptiveDark
    val boardBg = if (useDarkBoard) MaterialTheme.colorScheme.background else Color.White
    val inkColor = if (useDarkBoard) diagTheme.darkInkColor else diagTheme.lightInkColor
    val maskFillColor = if (useDarkBoard) Color(0xFF1E293B) else Color(0xFFF1F5F9)
    val maskStrokeColor = if (useDarkBoard) Color(0xFF475569) else Color(0xFFCBD5E1)
    val maskTextColor = if (useDarkBoard) android.graphics.Color.rgb(203, 213, 225) else android.graphics.Color.rgb(51, 65, 85)
    val monoTint = remember(inkColor) { ColorFilter.tint(inkColor) }

    val nodeBitmaps = remember(currentBoard) {
        currentBoard.nodes.map { it.bitmap.bitmap.asImageBitmap() }
    }
    val labelBitmaps = remember(currentBoard) {
        currentBoard.labels.map { it.bitmap.bitmap.asImageBitmap() }
    }

    val hiddenCount = remember(currentBoard) { currentBoard.nodes.count { it.hiddenByDefault } }
    val allRevealed = hiddenCount > 0 && revealedNodes.size >= hiddenCount
    val latestRevealedNodes by rememberUpdatedState(revealedNodes)
    val latestOnRevealedNodesChange by rememberUpdatedState(onRevealedNodesChange)

    BoxWithConstraints(
        modifier = modifier
            .fillMaxSize()
            .background(boardBg)
            .clipToBounds(),
    ) {
        val density = LocalDensity.current
        val viewW = with(density) { maxWidth.toPx() }.coerceAtLeast(1f)
        val viewH = with(density) { maxHeight.toPx() }.coerceAtLeast(1f)

        val fitScale = remember(currentBoard, viewW, viewH) {
            min(viewW / max(1f, currentBoard.width), viewH / max(1f, currentBoard.height)) * 0.94f
        }
        val minScale = (fitScale * 0.45f).coerceAtLeast(0.02f)
        val maxScale = max(fitScale * 14f, 1.5f)

        var scale by remember(currentBoard) { mutableFloatStateOf(fitScale) }
        var pan by remember(currentBoard) {
            mutableStateOf(
                Offset(
                    (viewW - currentBoard.width * fitScale) / 2f,
                    (viewH - currentBoard.height * fitScale) / 2f,
                )
            )
        }

        fun resetFit() {
            scale = fitScale
            pan = Offset(
                (viewW - currentBoard.width * fitScale) / 2f,
                (viewH - currentBoard.height * fitScale) / 2f,
            )
        }

        LaunchedEffect(currentBoard, viewW, viewH) {
            resetFit()
        }

        fun zoomAt(pivot: Offset, factor: Float) {
            val next = (scale * factor).coerceIn(minScale, maxScale)
            val ratio = next / scale
            pan = Offset(
                pivot.x - (pivot.x - pan.x) * ratio,
                pivot.y - (pivot.y - pan.y) * ratio,
            )
            scale = next
        }

        val textPaint = remember(maskTextColor) {
            android.graphics.Paint(android.graphics.Paint.ANTI_ALIAS_FLAG).apply {
                color = maskTextColor
                textAlign = android.graphics.Paint.Align.CENTER
                typeface = android.graphics.Typeface.create(android.graphics.Typeface.SANS_SERIF, android.graphics.Typeface.BOLD)
            }
        }

        Canvas(
            modifier = Modifier
                .fillMaxSize()
                .pointerInput(currentBoard, minScale, maxScale) {
                    detectTransformGestures { centroid, panDelta, zoomDelta, _ ->
                        val nextScale = (scale * zoomDelta).coerceIn(minScale, maxScale)
                        val ratio = nextScale / scale
                        pan = Offset(
                            centroid.x - (centroid.x - pan.x) * ratio + panDelta.x,
                            centroid.y - (centroid.y - pan.y) * ratio + panDelta.y,
                        )
                        scale = nextScale
                    }
                }
                .pointerInput(currentBoard) {
                    detectTapGestures(
                        onTap = { tapPos ->
                            val bx = (tapPos.x - pan.x) / scale
                            val by = (tapPos.y - pan.y) / scale
                            val hit = currentBoard.nodes.firstOrNull { n ->
                                n.hiddenByDefault &&
                                    bx >= n.x - 16f && bx <= n.x + n.width + 16f &&
                                    by >= n.y - 16f && by <= n.y + n.height + 16f
                            }
                            if (hit != null) {
                                val curr = latestRevealedNodes
                                latestOnRevealedNodesChange(
                                    if (curr.contains(hit.index)) {
                                        curr - hit.index
                                    } else {
                                        curr + hit.index
                                    }
                                )
                            }
                        },
                        onDoubleTap = { tapPos ->
                            if (scale > fitScale * 1.4f) {
                                resetFit()
                            } else {
                                zoomAt(tapPos, 2.4f)
                            }
                        },
                    )
                },
        ) {
            withTransform({
                translate(left = pan.x, top = pan.y)
                scale(scaleX = scale, scaleY = scale, pivot = Offset.Zero)
            }) {
                // Arrows
                val arrowStroke = max(5.5f, 1.8f / scale)
                val headLen = max(28f, 9f / scale)
                val headW = headLen * 0.45f
                for (a in currentBoard.arrows) {
                    val angle = atan2((a.y2 - a.y1).toDouble(), (a.x2 - a.x1).toDouble()).toFloat()
                    val ex = a.x2 - cos(angle) * (headLen * 0.7f)
                    val ey = a.y2 - sin(angle) * (headLen * 0.7f)
                    drawLine(
                        color = inkColor,
                        start = Offset(a.x1, a.y1),
                        end = Offset(ex, ey),
                        strokeWidth = arrowStroke,
                        cap = StrokeCap.Round,
                    )
                    val head = Path().apply {
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
                    drawPath(head, color = inkColor)
                }

                // Reaction labels
                currentBoard.labels.forEachIndexed { idx, l ->
                    val img = labelBitmaps[idx]
                    if (l.bitmap.isColored && useDarkBoard) {
                        drawRoundRect(
                            color = Color.White,
                            topLeft = Offset(l.x - 8f, l.y - 8f),
                            size = Size(l.width + 16f, l.height + 16f),
                            cornerRadius = CornerRadius(14f, 14f),
                        )
                    }
                    drawImage(
                        image = img,
                        dstOffset = IntOffset(l.x.roundToInt(), l.y.roundToInt()),
                        dstSize = IntSize(l.width.roundToInt().coerceAtLeast(1), l.height.roundToInt().coerceAtLeast(1)),
                        colorFilter = if (l.bitmap.isColored) null else monoTint,
                        filterQuality = FilterQuality.Medium,
                    )
                }

                // Molecule nodes
                currentBoard.nodes.forEachIndexed { idx, n ->
                    val isMasked = n.hiddenByDefault && !revealedNodes.contains(n.index)
                    if (isMasked) {
                        val cr = max(20f, 10f / scale)
                        drawRoundRect(
                            color = maskFillColor,
                            topLeft = Offset(n.x, n.y),
                            size = Size(n.width, n.height),
                            cornerRadius = CornerRadius(cr, cr),
                        )
                        drawRoundRect(
                            color = maskStrokeColor,
                            topLeft = Offset(n.x, n.y),
                            size = Size(n.width, n.height),
                            cornerRadius = CornerRadius(cr, cr),
                            style = Stroke(width = max(4f, 1.5f / scale)),
                        )
                        textPaint.textSize = (min(n.width, n.height) * 0.28f).coerceIn(48f, 130f)
                        val fm = textPaint.fontMetrics
                        val cy = n.y + n.height / 2f - (fm.ascent + fm.descent) / 2f
                        drawContext.canvas.nativeCanvas.drawText(
                            n.stageNumber.toString(),
                            n.x + n.width / 2f,
                            cy,
                            textPaint,
                        )
                    } else {
                        if (n.bitmap.isColored && useDarkBoard) {
                            drawRoundRect(
                                color = Color.White,
                                topLeft = Offset(n.x - 10f, n.y - 10f),
                                size = Size(n.width + 20f, n.height + 20f),
                                cornerRadius = CornerRadius(16f, 16f),
                            )
                        }
                        drawImage(
                            image = nodeBitmaps[idx],
                            dstOffset = IntOffset(n.x.roundToInt(), n.y.roundToInt()),
                            dstSize = IntSize(n.width.roundToInt().coerceAtLeast(1), n.height.roundToInt().coerceAtLeast(1)),
                            colorFilter = if (n.bitmap.isColored) null else monoTint,
                            filterQuality = FilterQuality.Medium,
                        )
                    }
                }
            }
        }

        // Floating hint pill at top
        if (hiddenCount > 0) {
            Surface(
                shape = RoundedCornerShape(20.dp),
                color = MaterialTheme.colorScheme.surfaceContainer.copy(alpha = 0.88f),
                modifier = Modifier
                    .align(Alignment.TopCenter)
                    .padding(top = 10.dp),
            ) {
                Text(
                    text = "Нажмите на карточку с номером, чтобы открыть · зум двумя пальцами",
                    style = MaterialTheme.typography.labelMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    modifier = Modifier.padding(horizontal = 12.dp, vertical = 6.dp),
                )
            }
        }

        // Bottom floating controls
        Surface(
            shape = RoundedCornerShape(24.dp),
            color = MaterialTheme.colorScheme.surfaceContainer.copy(alpha = 0.94f),
            tonalElevation = 3.dp,
            shadowElevation = 4.dp,
            modifier = Modifier
                .align(Alignment.BottomCenter)
                .padding(bottom = 16.dp),
        ) {
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(2.dp),
                modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp),
            ) {
                IconButton(onClick = { zoomAt(Offset(viewW / 2f, viewH / 2f), 0.78f) }) {
                    Icon(Icons.Rounded.Remove, contentDescription = "Уменьшить")
                }
                IconButton(onClick = { resetFit() }) {
                    Icon(Icons.Rounded.FitScreen, contentDescription = "Вместить")
                }
                IconButton(onClick = { zoomAt(Offset(viewW / 2f, viewH / 2f), 1.28f) }) {
                    Icon(Icons.Rounded.Add, contentDescription = "Увеличить")
                }
                if (hiddenCount > 0) {
                    IconButton(
                        onClick = {
                            onRevealedNodesChange(
                                if (allRevealed) {
                                    emptySet()
                                } else {
                                    currentBoard.nodes.filter { it.hiddenByDefault }.map { it.index }.toSet()
                                }
                            )
                        }
                    ) {
                        Icon(
                            imageVector = if (allRevealed) Icons.Rounded.VisibilityOff else Icons.Rounded.Visibility,
                            contentDescription = if (allRevealed) "Скрыть промежуточные" else "Показать все",
                            tint = MaterialTheme.colorScheme.primary,
                        )
                    }
                }
            }
        }
    }
}
