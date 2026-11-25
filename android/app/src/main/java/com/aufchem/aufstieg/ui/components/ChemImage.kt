package com.aufchem.aufstieg.ui.components

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.gestures.detectTapGestures
import androidx.compose.foundation.gestures.rememberTransformableState
import androidx.compose.foundation.gestures.transformable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.Close
import androidx.compose.material.icons.rounded.FitScreen
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableFloatStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.ColorFilter
import androidx.compose.ui.graphics.FilterQuality
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.StrokeJoin
import androidx.compose.ui.graphics.asImageBitmap
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.window.DialogProperties
import com.aufchem.aufstieg.data.ChemBitmap
import com.aufchem.aufstieg.ui.theme.LocalChemDiagramTheme

@Composable
fun ChemDiagramImage(
    chem: ChemBitmap,
    contentDescription: String?,
    modifier: Modifier = Modifier,
    contentScale: ContentScale = ContentScale.Fit,
) {
    val diagTheme = LocalChemDiagramTheme.current
    val imageBitmap = remember(chem.bitmap) { chem.bitmap.asImageBitmap() }

    val needsPaperPlate = chem.isColored || (diagTheme.isDark && !diagTheme.adaptiveDark)
    val tintColorFilter = when {
        chem.isColored -> null
        diagTheme.isDark && diagTheme.adaptiveDark -> ColorFilter.tint(diagTheme.darkInkColor)
        else -> ColorFilter.tint(diagTheme.lightInkColor)
    }

    if (needsPaperPlate) {
        Box(
            modifier = modifier
                .clip(RoundedCornerShape(12.dp))
                .background(diagTheme.paperBackground)
                .padding(8.dp),
            contentAlignment = Alignment.Center,
        ) {
            Image(
                bitmap = imageBitmap,
                contentDescription = contentDescription,
                contentScale = contentScale,
                filterQuality = FilterQuality.High,
                colorFilter = tintColorFilter,
                modifier = Modifier.fillMaxSize(),
            )
        }
    } else {
        Image(
            bitmap = imageBitmap,
            contentDescription = contentDescription,
            contentScale = contentScale,
            filterQuality = FilterQuality.High,
            colorFilter = tintColorFilter,
            modifier = modifier,
        )
    }
}

/**
 * Vector chair-cyclohexane + flag logo of Aufstieg | Химия.
 */
@Composable
fun AufstiegChairLogo(
    modifier: Modifier = Modifier,
    strokeColor: Color = MaterialTheme.colorScheme.primary,
    flagColor: Color = MaterialTheme.colorScheme.primary,
) {
    Canvas(modifier = modifier) {
        val sx = size.width / 148f
        val sy = size.height / 136f
        val s = minOf(sx, sy)
        val ox = (size.width - 148f * s) / 2f
        val oy = (size.height - 136f * s) / 2f

        fun pt(x: Float, y: Float) = Offset(ox + x * s, oy + y * s)

        val chairPath = Path().apply {
            moveTo(ox + 14f * s, oy + 124f * s)
            lineTo(ox + 34f * s, oy + 72f * s)
            lineTo(ox + 74f * s, oy + 72f * s)
            lineTo(ox + 114f * s, oy + 44f * s)
            lineTo(ox + 94f * s, oy + 96f * s)
            lineTo(ox + 54f * s, oy + 96f * s)
            close()
        }
        drawPath(
            path = chairPath,
            color = strokeColor,
            style = Stroke(width = 5.2f * s, cap = StrokeCap.Round, join = StrokeJoin.Round),
        )
        // Three internal double bonds
        drawLine(strokeColor, pt(25f, 111f), pt(38.5f, 79f), strokeWidth = 3.9f * s, cap = StrokeCap.Round)
        drawLine(strokeColor, pt(78.5f, 77.5f), pt(103f, 60.5f), strokeWidth = 3.9f * s, cap = StrokeCap.Round)
        drawLine(strokeColor, pt(57.5f, 88.5f), pt(87.5f, 88.5f), strokeWidth = 3.9f * s, cap = StrokeCap.Round)

        // Flagpole + pennant
        drawLine(flagColor, pt(114f, 44f), pt(114f, 9f), strokeWidth = 4.8f * s, cap = StrokeCap.Round)
        val pennant = Path().apply {
            moveTo(ox + 114f * s, oy + 9f * s)
            lineTo(ox + 136f * s, oy + 18.5f * s)
            lineTo(ox + 114f * s, oy + 28f * s)
            close()
        }
        drawPath(pennant, color = flagColor.copy(alpha = 0.25f))
        drawPath(
            pennant,
            color = flagColor,
            style = Stroke(width = 4.4f * s, cap = StrokeCap.Round, join = StrokeJoin.Round),
        )
    }
}

@Composable
fun ZoomableImageDialog(
    chem: ChemBitmap,
    title: String,
    onDismiss: () -> Unit,
) {
    Dialog(
        onDismissRequest = onDismiss,
        properties = DialogProperties(usePlatformDefaultWidth = false),
    ) {
        var scale by remember { mutableFloatStateOf(1f) }
        var offset by remember { mutableStateOf(Offset.Zero) }

        val transformState = rememberTransformableState { zoomChange, panChange, _ ->
            val nextScale = (scale * zoomChange).coerceIn(1f, 6f)
            scale = nextScale
            offset = if (nextScale <= 1.01f) {
                Offset.Zero
            } else {
                offset + panChange
            }
        }

        Surface(
            modifier = Modifier.fillMaxSize(),
            color = MaterialTheme.colorScheme.background.copy(alpha = 0.97f),
        ) {
            Box(modifier = Modifier.fillMaxSize()) {
                Box(
                    modifier = Modifier
                        .fillMaxSize()
                        .pointerInput(Unit) {
                            detectTapGestures(
                                onDoubleTap = {
                                    if (scale > 1.2f) {
                                        scale = 1f
                                        offset = Offset.Zero
                                    } else {
                                        scale = 2.6f
                                    }
                                }
                            )
                        }
                        .transformable(state = transformState)
                        .padding(20.dp),
                    contentAlignment = Alignment.Center,
                ) {
                    ChemDiagramImage(
                        chem = chem,
                        contentDescription = title,
                        modifier = Modifier
                            .fillMaxSize()
                            .graphicsLayer(
                                scaleX = scale,
                                scaleY = scale,
                                translationX = offset.x,
                                translationY = offset.y,
                            ),
                    )
                }

                // Top overlay bar
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .statusBarsPadding()
                        .padding(horizontal = 16.dp, vertical = 12.dp)
                        .align(Alignment.TopCenter),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.SpaceBetween,
                ) {
                    Surface(
                        shape = RoundedCornerShape(20.dp),
                        color = MaterialTheme.colorScheme.surfaceContainer.copy(alpha = 0.92f),
                        modifier = Modifier.weight(1f, fill = false),
                    ) {
                        Text(
                            text = title,
                            style = MaterialTheme.typography.titleSmall,
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis,
                            modifier = Modifier.padding(horizontal = 14.dp, vertical = 8.dp),
                        )
                    }
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        if (scale > 1.05f) {
                            IconButton(
                                onClick = {
                                    scale = 1f
                                    offset = Offset.Zero
                                },
                                modifier = Modifier
                                    .clip(CircleShape)
                                    .background(MaterialTheme.colorScheme.surfaceContainer),
                            ) {
                                Icon(Icons.Rounded.FitScreen, contentDescription = "Сбросить зум")
                            }
                        }
                        IconButton(
                            onClick = onDismiss,
                            modifier = Modifier
                                .clip(CircleShape)
                                .background(MaterialTheme.colorScheme.surfaceContainer),
                        ) {
                            Icon(Icons.Rounded.Close, contentDescription = "Закрыть")
                        }
                    }
                }
            }
        }
    }
}
