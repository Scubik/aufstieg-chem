package com.aufchem.aufstieg.ui.screens

import android.content.Intent
import android.content.res.Configuration
import android.net.Uri
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.expandVertically
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.shrinkVertically
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxWithConstraints
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.IntrinsicSize
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.rounded.ArrowBack
import androidx.compose.material.icons.automirrored.rounded.OpenInNew
import androidx.compose.material.icons.rounded.AccountTree
import androidx.compose.material.icons.rounded.AutoAwesome
import androidx.compose.material.icons.rounded.CheckCircle
import androidx.compose.material.icons.rounded.CheckCircleOutline
import androidx.compose.material.icons.rounded.Close
import androidx.compose.material.icons.rounded.ExpandLess
import androidx.compose.material.icons.rounded.ExpandMore
import androidx.compose.material.icons.rounded.Favorite
import androidx.compose.material.icons.rounded.FavoriteBorder
import androidx.compose.material.icons.rounded.Info
import androidx.compose.material.icons.rounded.PictureAsPdf
import androidx.compose.material.icons.rounded.TouchApp
import androidx.compose.material.icons.rounded.ViewAgenda
import androidx.compose.material.icons.rounded.Visibility
import androidx.compose.material.icons.rounded.VisibilityOff
import androidx.compose.material.icons.rounded.ZoomIn
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FilledTonalButton
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.platform.LocalConfiguration
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import com.aufchem.aufstieg.SynthesisUiState
import com.aufchem.aufstieg.data.ChemBitmap
import com.aufchem.aufstieg.data.SequenceModel
import com.aufchem.aufstieg.data.StepModel
import com.aufchem.aufstieg.data.ViewMode
import com.aufchem.aufstieg.pdf.PdfExporter
import com.aufchem.aufstieg.ui.components.ChemDiagramImage
import com.aufchem.aufstieg.ui.components.ZoomableImageDialog
import java.net.URLDecoder

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SynthesisScreen(
    state: SynthesisUiState,
    defaultViewMode: ViewMode,
    isFavorite: Boolean,
    isCompleted: Boolean,
    onBack: () -> Unit,
    onToggleFavorite: () -> Unit,
    onToggleCompleted: () -> Unit,
    onExportPdf: (Set<Int>) -> Unit,
    onPushSubsequence: (SequenceModel) -> Unit,
    onStepChanged: (Int) -> Unit,
    modifier: Modifier = Modifier,
) {
    val context = LocalContext.current
    val configuration = LocalConfiguration.current
    val isLandscape = configuration.orientation == Configuration.ORIENTATION_LANDSCAPE

    val activeSeq = state.activeSequence
    val item = state.item

    var viewMode by remember(state.item?.path, defaultViewMode) { mutableStateOf(defaultViewMode) }
    var landscapeBarExpanded by remember(isLandscape) { mutableStateOf(false) }
    var revealedSchemeNodes by remember(activeSeq) { mutableStateOf(setOf<Int>()) }
    var showPdfOptionsDialog by remember { mutableStateOf(false) }
    var showInfoSheet by remember { mutableStateOf(false) }
    var zoomedImage by remember { mutableStateOf<Pair<ChemBitmap, String>?>(null) }
    var namedReactionPopup by remember { mutableStateOf<ChemBitmap?>(null) }

    val showTopBar = !isLandscape || landscapeBarExpanded

    Column(
        modifier = modifier
            .fillMaxSize()
            .background(MaterialTheme.colorScheme.background)
            .statusBarsPadding(),
    ) {
        // Compact Top App Bar (auto-hidden in landscape unless expanded)
        AnimatedVisibility(
            visible = showTopBar,
            enter = fadeIn() + expandVertically(),
            exit = fadeOut() + shrinkVertically(),
        ) {
            Surface(
                color = MaterialTheme.colorScheme.surface,
                tonalElevation = 1.dp,
                modifier = Modifier.fillMaxWidth(),
            ) {
                Column(modifier = Modifier.fillMaxWidth()) {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(horizontal = 4.dp, vertical = 2.dp),
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        IconButton(
                            onClick = onBack,
                            modifier = Modifier.size(36.dp),
                        ) {
                            Icon(
                                Icons.AutoMirrored.Rounded.ArrowBack,
                                contentDescription = "Назад",
                                modifier = Modifier.size(20.dp),
                            )
                        }
                        Column(
                            modifier = Modifier
                                .weight(1f)
                                .padding(horizontal = 2.dp),
                        ) {
                            Text(
                                text = activeSeq?.name?.ifBlank { item?.displayTitle ?: "" }
                                    ?: item?.displayTitle.orEmpty(),
                                style = MaterialTheme.typography.titleSmall.copy(
                                    fontSize = 14.5.sp,
                                    fontWeight = FontWeight.SemiBold,
                                ),
                                maxLines = 1,
                                overflow = TextOverflow.Ellipsis,
                            )
                            val meta = buildString {
                                if (state.isInSubsequence) append("Подсинтез · ")
                                item?.author?.takeIf { it.isNotBlank() }?.let { append(it) }
                                item?.year?.takeIf { it.isNotBlank() }?.let {
                                    if (isNotEmpty() && !endsWith("· ")) append(" · ")
                                    append(it)
                                }
                                activeSeq?.let {
                                    if (isNotEmpty() && !endsWith("· ")) append(" · ")
                                    append("${it.steps.size} ${PdfExporter.pluralSteps(it.steps.size)}")
                                }
                            }
                            if (meta.isNotBlank()) {
                                Text(
                                    text = meta,
                                    style = MaterialTheme.typography.labelSmall.copy(fontSize = 11.sp),
                                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                                    maxLines = 1,
                                    overflow = TextOverflow.Ellipsis,
                                )
                            }
                        }

                        IconButton(
                            onClick = onToggleFavorite,
                            modifier = Modifier.size(36.dp),
                        ) {
                            Icon(
                                imageVector = if (isFavorite) Icons.Rounded.Favorite else Icons.Rounded.FavoriteBorder,
                                contentDescription = "Избранное",
                                tint = if (isFavorite) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.onSurfaceVariant,
                                modifier = Modifier.size(19.dp),
                            )
                        }
                        IconButton(
                            onClick = onToggleCompleted,
                            modifier = Modifier.size(36.dp),
                        ) {
                            Icon(
                                imageVector = if (isCompleted) Icons.Rounded.CheckCircle else Icons.Rounded.CheckCircleOutline,
                                contentDescription = if (isCompleted) "Снять отметку о выполнении" else "Отметить как сделанный",
                                tint = if (isCompleted) MaterialTheme.colorScheme.secondary else MaterialTheme.colorScheme.onSurfaceVariant,
                                modifier = Modifier.size(19.dp),
                            )
                        }
                        IconButton(
                            onClick = { showPdfOptionsDialog = true },
                            enabled = activeSeq != null && !state.isExportingPdf,
                            modifier = Modifier.size(36.dp),
                        ) {
                            if (state.isExportingPdf) {
                                CircularProgressIndicator(
                                    modifier = Modifier.size(17.dp),
                                    strokeWidth = 2.dp,
                                )
                            } else {
                                Icon(
                                    Icons.Rounded.PictureAsPdf,
                                    contentDescription = "Экспорт в PDF",
                                    modifier = Modifier.size(19.dp),
                                )
                            }
                        }
                        IconButton(
                            onClick = { showInfoSheet = true },
                            modifier = Modifier.size(36.dp),
                        ) {
                            Icon(
                                Icons.Rounded.Info,
                                contentDescription = "Источник и DOI",
                                modifier = Modifier.size(19.dp),
                            )
                        }
                        if (isLandscape) {
                            IconButton(
                                onClick = { landscapeBarExpanded = false },
                                modifier = Modifier.size(36.dp),
                            ) {
                                Icon(
                                    Icons.Rounded.ExpandLess,
                                    contentDescription = "Скрыть панель",
                                    modifier = Modifier.size(20.dp),
                                )
                            }
                        }
                    }

                    // Compact View mode selector: Лента / Схема
                    CompactModeSwitcher(
                        viewMode = viewMode,
                        onSelect = { viewMode = it },
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(start = 12.dp, end = 12.dp, bottom = 6.dp),
                    )
                }
            }
        }

        // Body
        Box(modifier = Modifier.weight(1f).fillMaxWidth()) {
            when {
                state.isLoading -> {
                    Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                        Column(
                            horizontalAlignment = Alignment.CenterHorizontally,
                            verticalArrangement = Arrangement.spacedBy(12.dp),
                        ) {
                            CircularProgressIndicator()
                            Text(
                                text = "Распаковка синтеза...",
                                style = MaterialTheme.typography.bodyMedium,
                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                            )
                        }
                    }
                }

                state.error != null -> {
                    Box(
                        modifier = Modifier
                            .fillMaxSize()
                            .padding(24.dp),
                        contentAlignment = Alignment.Center,
                    ) {
                        Text(
                            text = state.error,
                            style = MaterialTheme.typography.bodyLarge,
                            color = MaterialTheme.colorScheme.error,
                            textAlign = TextAlign.Center,
                        )
                    }
                }

                activeSeq != null -> {
                    when (viewMode) {
                        ViewMode.FEED -> ChainFeedView(
                            sequence = activeSeq,
                            isLandscape = isLandscape,
                            onOpenZoom = { bmp, title -> zoomedImage = bmp to title },
                            onOpenNamedReaction = { namedReactionPopup = it },
                            onOpenSubsequence = onPushSubsequence,
                            onStepChanged = onStepChanged,
                            modifier = Modifier.fillMaxSize(),
                        )

                        ViewMode.CANVAS -> SnakeCanvasView(
                            sequence = activeSeq,
                            revealedNodes = revealedSchemeNodes,
                            onRevealedNodesChange = { revealedSchemeNodes = it },
                            modifier = Modifier.fillMaxSize(),
                        )
                    }
                }
            }

            // Floating corner controls in landscape when top bar is hidden:
            // Back button on top-left, menu expand chevron on top-right
            if (isLandscape && !landscapeBarExpanded) {
                Surface(
                    shape = RoundedCornerShape(18.dp),
                    color = MaterialTheme.colorScheme.surfaceContainer.copy(alpha = 0.90f),
                    tonalElevation = 2.dp,
                    shadowElevation = 2.dp,
                    modifier = Modifier
                        .align(Alignment.TopStart)
                        .padding(start = 10.dp, top = 4.dp),
                ) {
                    IconButton(
                        onClick = onBack,
                        modifier = Modifier.size(32.dp),
                    ) {
                        Icon(
                            Icons.AutoMirrored.Rounded.ArrowBack,
                            contentDescription = "Назад",
                            modifier = Modifier.size(18.dp),
                        )
                    }
                }

                Surface(
                    shape = RoundedCornerShape(18.dp),
                    color = MaterialTheme.colorScheme.surfaceContainer.copy(alpha = 0.90f),
                    tonalElevation = 2.dp,
                    shadowElevation = 2.dp,
                    modifier = Modifier
                        .align(Alignment.TopEnd)
                        .padding(end = 10.dp, top = 4.dp),
                ) {
                    IconButton(
                        onClick = { landscapeBarExpanded = true },
                        modifier = Modifier.size(32.dp),
                    ) {
                        Icon(
                            Icons.Rounded.ExpandMore,
                            contentDescription = "Показать панель",
                            modifier = Modifier.size(18.dp),
                        )
                    }
                }
            }
        }
    }

    // PDF export options dialog
    if (showPdfOptionsDialog && activeSeq != null) {
        val openHintsCount = revealedSchemeNodes.size
        AlertDialog(
            onDismissRequest = { showPdfOptionsDialog = false },
            title = { Text("Экспорт в PDF") },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    Text(
                        text = if (openHintsCount > 0) {
                            "На схеме открыто подсказок: $openHintsCount. Второй лист с полными ответами останется без изменений."
                        } else {
                            "Выберите вариант первого листа (второй лист с полными ответами останется без изменений)."
                        },
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                    FilledTonalButton(
                        onClick = {
                            showPdfOptionsDialog = false
                            onExportPdf(revealedSchemeNodes)
                        },
                        enabled = openHintsCount > 0,
                        shape = RoundedCornerShape(12.dp),
                        modifier = Modifier.fillMaxWidth(),
                    ) {
                        Text(
                            if (openHintsCount > 0) {
                                "С открытыми подсказками ($openHintsCount)"
                            } else {
                                "С открытыми подсказками (не открыты)"
                            }
                        )
                    }
                    OutlinedButton(
                        onClick = {
                            showPdfOptionsDialog = false
                            onExportPdf(emptySet())
                        },
                        shape = RoundedCornerShape(12.dp),
                        modifier = Modifier.fillMaxWidth(),
                    ) {
                        Text("Без подсказок")
                    }
                }
            },
            confirmButton = {},
            dismissButton = {
                TextButton(onClick = { showPdfOptionsDialog = false }) {
                    Text("Отмена")
                }
            },
        )
    }

    // Zoomable fullscreen diagram dialog
    zoomedImage?.let { (bmp, title) ->
        ZoomableImageDialog(
            chem = bmp,
            title = title,
            onDismiss = { zoomedImage = null },
        )
    }

    // Named reaction popup
    namedReactionPopup?.let { nr ->
        Dialog(onDismissRequest = { namedReactionPopup = null }) {
            Surface(
                shape = RoundedCornerShape(22.dp),
                color = MaterialTheme.colorScheme.surface,
                tonalElevation = 4.dp,
            ) {
                Column(
                    modifier = Modifier.padding(18.dp),
                    verticalArrangement = Arrangement.spacedBy(12.dp),
                    horizontalAlignment = Alignment.CenterHorizontally,
                ) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.SpaceBetween,
                    ) {
                        Text(
                            text = "Именная реакция",
                            style = MaterialTheme.typography.titleMedium,
                        )
                        IconButton(onClick = { namedReactionPopup = null }) {
                            Icon(Icons.Rounded.Close, contentDescription = "Закрыть")
                        }
                    }
                    ChemDiagramImage(
                        chem = nr,
                        contentDescription = "Именная реакция",
                        modifier = Modifier
                            .fillMaxWidth()
                            .heightIn(min = 120.dp, max = 320.dp),
                    )
                }
            }
        }
    }

    // Info / Citation / DOI Bottom Sheet
    if (showInfoSheet && item != null && activeSeq != null) {
        ModalBottomSheet(onDismissRequest = { showInfoSheet = false }) {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 20.dp, vertical = 8.dp)
                    .navigationBarsPadding(),
                verticalArrangement = Arrangement.spacedBy(12.dp),
            ) {
                Text(
                    text = activeSeq.name.ifBlank { item.displayTitle },
                    style = MaterialTheme.typography.titleLarge,
                )
                val details = listOfNotNull(
                    item.author.takeIf { it.isNotBlank() }?.let { "Автор: $it" },
                    item.year.takeIf { it.isNotBlank() }?.let { "Год: $it" },
                    item.drug.takeIf { it.isNotBlank() }?.let { "Препарат: $it" },
                    "Стадий: ${activeSeq.steps.size}",
                )
                details.forEach { line ->
                    Text(
                        text = line,
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                }

                activeSeq.citation?.let { cit ->
                    Text(
                        text = "Библиографическая ссылка:",
                        style = MaterialTheme.typography.labelLarge,
                    )
                    Surface(
                        shape = RoundedCornerShape(12.dp),
                        color = MaterialTheme.colorScheme.surfaceContainer,
                        modifier = Modifier.fillMaxWidth(),
                    ) {
                        ChemDiagramImage(
                            chem = cit,
                            contentDescription = "Citation",
                            modifier = Modifier
                                .fillMaxWidth()
                                .heightIn(min = 48.dp, max = 140.dp)
                                .padding(10.dp),
                        )
                    }
                }

                if (activeSeq.doi.isNotBlank()) {
                    val decodedDoi = try {
                        URLDecoder.decode(activeSeq.doi, "UTF-8")
                    } catch (_: Exception) {
                        activeSeq.doi
                    }
                    Button(
                        onClick = {
                            try {
                                context.startActivity(
                                    Intent(Intent.ACTION_VIEW, Uri.parse("https://doi.org/$decodedDoi"))
                                )
                            } catch (_: Exception) {
                            }
                        },
                        shape = RoundedCornerShape(14.dp),
                        modifier = Modifier.fillMaxWidth(),
                    ) {
                        Icon(Icons.AutoMirrored.Rounded.OpenInNew, contentDescription = null)
                        Spacer(Modifier.width(8.dp))
                        Text("Открыть статью (doi:$decodedDoi)", maxLines = 1, overflow = TextOverflow.Ellipsis)
                    }
                }

                Spacer(Modifier.height(12.dp))
            }
        }
    }
}

@Composable
private fun CompactModeSwitcher(
    viewMode: ViewMode,
    onSelect: (ViewMode) -> Unit,
    modifier: Modifier = Modifier,
) {
    val modes = listOf(
        Triple(ViewMode.FEED, "Лента", Icons.Rounded.ViewAgenda),
        Triple(ViewMode.CANVAS, "Схема", Icons.Rounded.AccountTree),
    )
    Surface(
        shape = RoundedCornerShape(10.dp),
        color = MaterialTheme.colorScheme.surfaceContainer,
        border = BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.7f)),
        modifier = modifier.height(32.dp),
    ) {
        Row(modifier = Modifier.fillMaxSize()) {
            modes.forEachIndexed { idx, (mode, label, icon) ->
                val selected = viewMode == mode
                val bg = if (selected) MaterialTheme.colorScheme.secondaryContainer else Color.Transparent
                val fg = if (selected) MaterialTheme.colorScheme.onSecondaryContainer else MaterialTheme.colorScheme.onSurfaceVariant
                Box(
                    modifier = Modifier
                        .weight(1f)
                        .fillMaxHeight()
                        .background(bg)
                        .clickable { onSelect(mode) },
                    contentAlignment = Alignment.Center,
                ) {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(6.dp),
                    ) {
                        Icon(icon, contentDescription = null, tint = fg, modifier = Modifier.size(15.dp))
                        Text(
                            text = label,
                            style = MaterialTheme.typography.labelMedium.copy(
                                fontWeight = if (selected) FontWeight.SemiBold else FontWeight.Medium,
                            ),
                            color = fg,
                            maxLines = 1,
                        )
                    }
                }
                if (idx == 0) {
                    Box(
                        modifier = Modifier
                            .width(1.dp)
                            .fillMaxHeight()
                            .background(MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.7f)),
                    )
                }
            }
        }
    }
}

@Composable
private fun ChainFeedView(
    sequence: SequenceModel,
    isLandscape: Boolean,
    onOpenZoom: (ChemBitmap, String) -> Unit,
    onOpenNamedReaction: (ChemBitmap) -> Unit,
    onOpenSubsequence: (SequenceModel) -> Unit,
    onStepChanged: (Int) -> Unit,
    modifier: Modifier = Modifier,
) {
    val steps = sequence.steps
    var revealedReagents by remember(sequence) { mutableStateOf(setOf<Int>()) }
    var revealedProducts by remember(sequence) { mutableStateOf(setOf<Int>()) }

    val intermediateIndices = remember(steps.size) {
        if (steps.size > 1) (0 until steps.lastIndex).toSet() else emptySet()
    }
    val allShown = steps.isNotEmpty() &&
        revealedReagents.size >= steps.size &&
        intermediateIndices.all { it in revealedProducts }

    Column(modifier = modifier.fillMaxSize()) {
        // Compact toolbar: toggle all (in landscape leave padding for top-left Back & top-right ExpandMore)
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(
                    start = if (isLandscape) 52.dp else 16.dp,
                    end = if (isLandscape) 52.dp else 12.dp,
                    top = 2.dp,
                    bottom = 2.dp,
                ),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.SpaceBetween,
        ) {
            Text(
                text = "Пошаговая цепочка (${steps.size})",
                style = MaterialTheme.typography.labelMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
            TextButton(
                onClick = {
                    if (allShown) {
                        revealedReagents = emptySet()
                        revealedProducts = emptySet()
                    } else {
                        revealedReagents = steps.indices.toSet()
                        revealedProducts = intermediateIndices
                    }
                },
                contentPadding = PaddingValues(horizontal = 8.dp, vertical = 2.dp),
                modifier = Modifier.height(30.dp),
            ) {
                Icon(
                    imageVector = if (allShown) Icons.Rounded.VisibilityOff else Icons.Rounded.Visibility,
                    contentDescription = null,
                    modifier = Modifier.size(16.dp),
                )
                Spacer(Modifier.width(5.dp))
                Text(
                    text = if (allShown) "Скрыть ответы" else "Показать все",
                    style = MaterialTheme.typography.labelMedium,
                )
            }
        }

        if (isLandscape) {
            // Horizontal left-to-right feed: each card is sized proportionally to its molecule image
            BoxWithConstraints(
                modifier = Modifier
                    .fillMaxSize()
                    .navigationBarsPadding(),
            ) {
                val isTablet = maxHeight >= 500.dp || maxWidth >= 840.dp
                val availCardMaxH = (maxHeight - 16.dp).coerceAtLeast(180.dp)
                val chromeH = 58.dp // header + card padding
                val availImgMaxH = (availCardMaxH - chromeH).coerceAtLeast(100.dp)

                val maxMoleculePxH = remember(sequence) {
                    val startH = sequence.start?.height ?: 0
                    val stepMaxH = sequence.steps.maxOfOrNull { it.product.height } ?: 0
                    maxOf(startH, stepMaxH, 1)
                }
                val baseDpPerPx = availImgMaxH.value / maxMoleculePxH.toFloat()

                val minCardW = if (isTablet) 190.dp else 165.dp
                val maxCardW = (maxWidth * 0.72f).coerceAtLeast(minCardW)
                val minCardH = if (isTablet) 210.dp else 160.dp

                fun cardSizeFor(chem: ChemBitmap): Pair<Dp, Dp> {
                    val w = (chem.width * baseDpPerPx + 24f).dp.coerceIn(minCardW, maxCardW)
                    val h = (chem.height * baseDpPerPx + chromeH.value).dp.coerceIn(minCardH, availCardMaxH)
                    return w to h
                }

                val reactionColW = if (isTablet) {
                    (maxHeight * 0.44f).coerceIn(250.dp, 330.dp)
                } else {
                    215.dp
                }
                val arrowTopWeight = if (isTablet) 0.42f else 0.30f
                val reagentsWeight = if (isTablet) 0.58f else 0.70f

                LazyRow(
                    contentPadding = PaddingValues(
                        start = 16.dp,
                        end = 16.dp,
                        top = if (isTablet) 8.dp else 4.dp,
                        bottom = if (isTablet) 12.dp else 8.dp,
                    ),
                    horizontalArrangement = Arrangement.spacedBy(if (isTablet) 14.dp else 10.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    modifier = Modifier.fillMaxSize(),
                ) {
                    sequence.start?.let { start ->
                        item(key = "start") {
                            val (cw, ch) = cardSizeFor(start)
                            DiagramCard(
                                label = "Исходный субстрат",
                                chem = start,
                                revealed = true,
                                onTapReveal = {},
                                onZoom = { onOpenZoom(start, "Исходный субстрат") },
                                fillHeight = true,
                                modifier = Modifier
                                    .width(cw)
                                    .height(ch),
                            )
                        }
                    }

                    itemsIndexed(steps, key = { idx, _ -> idx }) { idx, step ->
                        val isLast = idx == steps.lastIndex
                        val isReagentRevealed = revealedReagents.contains(idx)
                        val isProductRevealed = isLast || revealedProducts.contains(idx)
                        val (pw, ph) = cardSizeFor(step.product)

                        HorizontalFeedStepBlock(
                            stepNumber = idx + 1,
                            isLast = isLast,
                            step = step,
                            reagentRevealed = isReagentRevealed,
                            productRevealed = isProductRevealed,
                            productCardWidth = pw,
                            productCardHeight = ph,
                            reactionColWidth = reactionColW,
                            reactionColHeight = availCardMaxH,
                            arrowTopWeight = arrowTopWeight,
                            reagentsWeight = reagentsWeight,
                            onToggleReagent = {
                                onStepChanged(idx)
                                revealedReagents = if (revealedReagents.contains(idx)) {
                                    revealedReagents - idx
                                } else {
                                    revealedReagents + idx
                                }
                            },
                            onToggleProduct = {
                                onStepChanged(idx)
                                if (!isLast) {
                                    revealedProducts = if (revealedProducts.contains(idx)) {
                                        revealedProducts - idx
                                    } else {
                                        revealedProducts + idx
                                    }
                                }
                            },
                            onOpenZoom = onOpenZoom,
                            onOpenNamedReaction = onOpenNamedReaction,
                            onOpenSubsequence = onOpenSubsequence,
                        )
                    }
                }
            }
        } else {
            LazyColumn(
                contentPadding = PaddingValues(start = 16.dp, end = 16.dp, top = 4.dp, bottom = 24.dp),
                verticalArrangement = Arrangement.spacedBy(10.dp),
                modifier = Modifier
                    .fillMaxSize()
                    .navigationBarsPadding(),
            ) {
                sequence.start?.let { start ->
                    item(key = "start") {
                        DiagramCard(
                            label = "Исходный субстрат",
                            chem = start,
                            revealed = true,
                            onTapReveal = {},
                            onZoom = { onOpenZoom(start, "Исходный субстрат") },
                            minHeight = 130,
                        )
                    }
                }

                itemsIndexed(steps, key = { idx, _ -> idx }) { idx, step ->
                    val isLast = idx == steps.lastIndex
                    val isReagentRevealed = revealedReagents.contains(idx)
                    val isProductRevealed = isLast || revealedProducts.contains(idx)

                    FeedStepBlock(
                        stepNumber = idx + 1,
                        isLast = isLast,
                        step = step,
                        reagentRevealed = isReagentRevealed,
                        productRevealed = isProductRevealed,
                        onToggleReagent = {
                            onStepChanged(idx)
                            revealedReagents = if (revealedReagents.contains(idx)) {
                                revealedReagents - idx
                            } else {
                                revealedReagents + idx
                            }
                        },
                        onToggleProduct = {
                            onStepChanged(idx)
                            if (!isLast) {
                                revealedProducts = if (revealedProducts.contains(idx)) {
                                    revealedProducts - idx
                                } else {
                                    revealedProducts + idx
                                }
                            }
                        },
                        onOpenZoom = onOpenZoom,
                        onOpenNamedReaction = onOpenNamedReaction,
                        onOpenSubsequence = onOpenSubsequence,
                    )
                }
            }
        }
    }
}

@Composable
private fun HorizontalFeedStepBlock(
    stepNumber: Int,
    isLast: Boolean,
    step: StepModel,
    reagentRevealed: Boolean,
    productRevealed: Boolean,
    productCardWidth: Dp,
    productCardHeight: Dp,
    reactionColWidth: Dp,
    reactionColHeight: Dp,
    arrowTopWeight: Float,
    reagentsWeight: Float,
    onToggleReagent: () -> Unit,
    onToggleProduct: () -> Unit,
    onOpenZoom: (ChemBitmap, String) -> Unit,
    onOpenNamedReaction: (ChemBitmap) -> Unit,
    onOpenSubsequence: (SequenceModel) -> Unit,
) {
    val arrowColor = MaterialTheme.colorScheme.primary

    Row(
        modifier = Modifier.height(productCardHeight),
        horizontalArrangement = Arrangement.spacedBy(12.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        // Reaction column: same height as product card so bottom edges align flush
        Column(
            modifier = Modifier
                .width(reactionColWidth)
                .fillMaxHeight(),
            verticalArrangement = Arrangement.spacedBy(8.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
        ) {
            Spacer(modifier = Modifier.weight(arrowTopWeight))

            // Horizontal right-pointing arrow in the middle of the screen
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(34.dp),
                contentAlignment = Alignment.Center,
            ) {
                Canvas(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(horizontal = 8.dp),
                ) {
                    val cy = size.height / 2f
                    val leftX = 4.dp.toPx()
                    val rightX = size.width - 4.dp.toPx()
                    val headLen = 14.dp.toPx()
                    val headHalfH = 7.5.dp.toPx()
                    val strokeW = 2.8.dp.toPx()

                    drawLine(
                        color = arrowColor,
                        start = Offset(leftX, cy),
                        end = Offset((rightX - headLen * 0.65f).coerceAtLeast(leftX), cy),
                        strokeWidth = strokeW,
                        cap = StrokeCap.Round,
                    )

                    val head = Path().apply {
                        moveTo(rightX, cy)
                        lineTo(rightX - headLen, cy - headHalfH)
                        lineTo(rightX - headLen, cy + headHalfH)
                        close()
                    }
                    drawPath(head, color = arrowColor)
                }
            }

            // Reagents / Conditions card strictly below the arrow
            Surface(
                shape = RoundedCornerShape(16.dp),
                color = if (reagentRevealed) MaterialTheme.colorScheme.surface else MaterialTheme.colorScheme.surfaceContainer,
                border = BorderStroke(
                    width = 1.dp,
                    color = if (reagentRevealed) {
                        MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.8f)
                    } else {
                        MaterialTheme.colorScheme.primary.copy(alpha = 0.35f)
                    },
                ),
                modifier = Modifier
                    .fillMaxWidth()
                    .weight(reagentsWeight)
                    .clip(RoundedCornerShape(16.dp))
                    .clickable(onClick = onToggleReagent),
            ) {
                Column(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(10.dp),
                    verticalArrangement = Arrangement.spacedBy(6.dp),
                ) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.SpaceBetween,
                    ) {
                        Surface(
                            shape = RoundedCornerShape(8.dp),
                            color = MaterialTheme.colorScheme.primaryContainer,
                        ) {
                            Text(
                                text = if (isLast) "Финал $stepNumber" else "Стадия $stepNumber",
                                style = MaterialTheme.typography.labelMedium.copy(fontWeight = FontWeight.SemiBold),
                                color = MaterialTheme.colorScheme.onPrimaryContainer,
                                modifier = Modifier.padding(horizontal = 7.dp, vertical = 2.dp),
                            )
                        }

                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(2.dp),
                        ) {
                            step.namedReaction?.let { nr ->
                                IconButton(
                                    onClick = { onOpenNamedReaction(nr) },
                                    modifier = Modifier.size(26.dp),
                                ) {
                                    Icon(
                                        Icons.Rounded.AutoAwesome,
                                        contentDescription = "Именная реакция",
                                        tint = MaterialTheme.colorScheme.tertiary,
                                        modifier = Modifier.size(16.dp),
                                    )
                                }
                            }
                            step.subsequence?.let { sub ->
                                IconButton(
                                    onClick = { onOpenSubsequence(sub) },
                                    modifier = Modifier.size(26.dp),
                                ) {
                                    Icon(
                                        Icons.Rounded.AccountTree,
                                        contentDescription = "Подсинтез",
                                        tint = MaterialTheme.colorScheme.primary,
                                        modifier = Modifier.size(16.dp),
                                    )
                                }
                            }
                            if (reagentRevealed) {
                                IconButton(
                                    onClick = { onOpenZoom(step.reaction.combined, "Условия (стадия $stepNumber)") },
                                    modifier = Modifier
                                        .size(26.dp)
                                        .clip(CircleShape)
                                        .background(MaterialTheme.colorScheme.surfaceContainer),
                                ) {
                                    Icon(
                                        Icons.Rounded.ZoomIn,
                                        contentDescription = "Увеличить",
                                        modifier = Modifier.size(15.dp),
                                        tint = MaterialTheme.colorScheme.onSurfaceVariant,
                                    )
                                }
                            }
                        }
                    }

                    if (reagentRevealed) {
                        Box(
                            modifier = Modifier
                                .fillMaxWidth()
                                .weight(1f),
                            contentAlignment = Alignment.Center,
                        ) {
                            ChemDiagramImage(
                                chem = step.reaction.combined,
                                contentDescription = "Реагенты и условия (стадия $stepNumber)",
                                modifier = Modifier.fillMaxSize(),
                            )
                        }
                    } else {
                        Box(
                            modifier = Modifier
                                .fillMaxWidth()
                                .weight(1f),
                            contentAlignment = Alignment.Center,
                        ) {
                            Column(
                                horizontalAlignment = Alignment.CenterHorizontally,
                                verticalArrangement = Arrangement.spacedBy(4.dp),
                            ) {
                                Icon(
                                    Icons.Rounded.TouchApp,
                                    contentDescription = null,
                                    tint = MaterialTheme.colorScheme.primary,
                                    modifier = Modifier.size(22.dp),
                                )
                                Text(
                                    text = "Показать условия",
                                    style = MaterialTheme.typography.bodyMedium,
                                    color = MaterialTheme.colorScheme.primary,
                                    textAlign = TextAlign.Center,
                                )
                            }
                        }
                    }
                }
            }
        }

        // Product card to the right of the arrow (sized proportionally to molecule image)
        DiagramCard(
            label = if (isLast) "Целевая молекула" else "Продукт стадии $stepNumber",
            chem = step.product,
            revealed = productRevealed,
            hiddenHint = "Нажмите, чтобы открыть продукт $stepNumber",
            onTapReveal = onToggleProduct,
            onZoom = { onOpenZoom(step.product, "Продукт (стадия $stepNumber)") },
            fillHeight = true,
            modifier = Modifier
                .width(productCardWidth)
                .height(productCardHeight),
        )
    }
}

@Composable
private fun FeedStepBlock(
    stepNumber: Int,
    isLast: Boolean,
    step: StepModel,
    reagentRevealed: Boolean,
    productRevealed: Boolean,
    onToggleReagent: () -> Unit,
    onToggleProduct: () -> Unit,
    onOpenZoom: (ChemBitmap, String) -> Unit,
    onOpenNamedReaction: (ChemBitmap) -> Unit,
    onOpenSubsequence: (SequenceModel) -> Unit,
) {
    val arrowColor = MaterialTheme.colorScheme.primary

    Column(
        modifier = Modifier.fillMaxWidth(),
        verticalArrangement = Arrangement.spacedBy(10.dp),
    ) {
        // Reaction transition row: conditions on the left (~72%), downward arrow on the right (~28%)
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .height(IntrinsicSize.Min),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(8.dp),
        ) {
            // Left: Conditions / Reagents card (takes ~72% of width)
            Surface(
                shape = RoundedCornerShape(16.dp),
                color = if (reagentRevealed) MaterialTheme.colorScheme.surface else MaterialTheme.colorScheme.surfaceContainer,
                border = BorderStroke(
                    width = 1.dp,
                    color = if (reagentRevealed) {
                        MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.8f)
                    } else {
                        MaterialTheme.colorScheme.primary.copy(alpha = 0.35f)
                    },
                ),
                modifier = Modifier
                    .weight(0.72f)
                    .clip(RoundedCornerShape(16.dp))
                    .clickable(onClick = onToggleReagent),
            ) {
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(12.dp),
                    verticalArrangement = Arrangement.spacedBy(8.dp),
                ) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.SpaceBetween,
                    ) {
                        Surface(
                            shape = RoundedCornerShape(8.dp),
                            color = MaterialTheme.colorScheme.primaryContainer,
                        ) {
                            Text(
                                text = if (isLast) "Финальная стадия $stepNumber" else "Стадия $stepNumber",
                                style = MaterialTheme.typography.labelMedium.copy(fontWeight = FontWeight.SemiBold),
                                color = MaterialTheme.colorScheme.onPrimaryContainer,
                                modifier = Modifier.padding(horizontal = 8.dp, vertical = 3.dp),
                            )
                        }

                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(2.dp),
                        ) {
                            step.namedReaction?.let { nr ->
                                IconButton(
                                    onClick = { onOpenNamedReaction(nr) },
                                    modifier = Modifier.size(28.dp),
                                ) {
                                    Icon(
                                        Icons.Rounded.AutoAwesome,
                                        contentDescription = "Именная реакция",
                                        tint = MaterialTheme.colorScheme.tertiary,
                                        modifier = Modifier.size(17.dp),
                                    )
                                }
                            }
                            step.subsequence?.let { sub ->
                                IconButton(
                                    onClick = { onOpenSubsequence(sub) },
                                    modifier = Modifier.size(28.dp),
                                ) {
                                    Icon(
                                        Icons.Rounded.AccountTree,
                                        contentDescription = "Подсинтез",
                                        tint = MaterialTheme.colorScheme.primary,
                                        modifier = Modifier.size(17.dp),
                                    )
                                }
                            }
                            if (reagentRevealed) {
                                IconButton(
                                    onClick = { onOpenZoom(step.reaction.combined, "Условия (стадия $stepNumber)") },
                                    modifier = Modifier
                                        .size(28.dp)
                                        .clip(CircleShape)
                                        .background(MaterialTheme.colorScheme.surfaceContainer),
                                ) {
                                    Icon(
                                        Icons.Rounded.ZoomIn,
                                        contentDescription = "Увеличить",
                                        modifier = Modifier.size(16.dp),
                                        tint = MaterialTheme.colorScheme.onSurfaceVariant,
                                    )
                                }
                            }
                        }
                    }

                    AnimatedVisibility(
                        visible = reagentRevealed,
                        enter = fadeIn(),
                        exit = fadeOut(),
                    ) {
                        Box(
                            modifier = Modifier
                                .fillMaxWidth()
                                .heightIn(min = 80.dp, max = 220.dp),
                            contentAlignment = Alignment.Center,
                        ) {
                            ChemDiagramImage(
                                chem = step.reaction.combined,
                                contentDescription = "Реагенты и условия (стадия $stepNumber)",
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .heightIn(min = 80.dp, max = 210.dp),
                            )
                        }
                    }

                    if (!reagentRevealed) {
                        Box(
                            modifier = Modifier
                                .fillMaxWidth()
                                .height(80.dp),
                            contentAlignment = Alignment.Center,
                        ) {
                            Column(
                                horizontalAlignment = Alignment.CenterHorizontally,
                                verticalArrangement = Arrangement.spacedBy(4.dp),
                            ) {
                                Icon(
                                    Icons.Rounded.TouchApp,
                                    contentDescription = null,
                                    tint = MaterialTheme.colorScheme.primary,
                                    modifier = Modifier.size(24.dp),
                                )
                                Text(
                                    text = "Показать условия",
                                    style = MaterialTheme.typography.bodyMedium,
                                    color = MaterialTheme.colorScheme.primary,
                                    textAlign = TextAlign.Center,
                                )
                            }
                        }
                    }
                }
            }

            // Right: Vertical reaction arrow (~28% of width, i.e. 1/4 to 1/3 of horizontal space)
            Box(
                modifier = Modifier
                    .weight(0.28f)
                    .fillMaxHeight()
                    .heightIn(min = 112.dp),
                contentAlignment = Alignment.Center,
            ) {
                Canvas(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(vertical = 6.dp),
                ) {
                    val cx = size.width / 2f
                    val topY = 4.dp.toPx()
                    val bottomY = size.height - 4.dp.toPx()
                    val headLen = 14.dp.toPx()
                    val headHalfW = 7.5.dp.toPx()
                    val strokeW = 2.6.dp.toPx()

                    drawLine(
                        color = arrowColor,
                        start = Offset(cx, topY),
                        end = Offset(cx, (bottomY - headLen * 0.65f).coerceAtLeast(topY)),
                        strokeWidth = strokeW,
                        cap = StrokeCap.Round,
                    )

                    val head = Path().apply {
                        moveTo(cx, bottomY)
                        lineTo(cx - headHalfW, bottomY - headLen)
                        lineTo(cx + headHalfW, bottomY - headLen)
                        close()
                    }
                    drawPath(head, color = arrowColor)
                }
            }
        }

        // Product molecule card below the arrow
        DiagramCard(
            label = if (isLast) "Целевая молекула" else "Продукт стадии $stepNumber",
            chem = step.product,
            revealed = productRevealed,
            hiddenHint = "Нажмите, чтобы открыть продукт $stepNumber",
            onTapReveal = onToggleProduct,
            onZoom = { onOpenZoom(step.product, "Продукт (стадия $stepNumber)") },
            minHeight = 120,
        )
    }
}

@Composable
private fun DiagramCard(
    label: String,
    chem: ChemBitmap,
    revealed: Boolean,
    onTapReveal: () -> Unit,
    onZoom: () -> Unit,
    hiddenHint: String = "",
    minHeight: Int = 120,
    fillHeight: Boolean = false,
    modifier: Modifier = Modifier,
) {
    Surface(
        shape = RoundedCornerShape(16.dp),
        color = if (revealed) MaterialTheme.colorScheme.surface else MaterialTheme.colorScheme.surfaceContainer,
        border = BorderStroke(
            width = 1.dp,
            color = if (revealed) {
                MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.8f)
            } else {
                MaterialTheme.colorScheme.primary.copy(alpha = 0.35f)
            },
        ),
        modifier = modifier
            .then(if (fillHeight) Modifier else Modifier.fillMaxWidth())
            .clip(RoundedCornerShape(16.dp))
            .clickable { onTapReveal() },
    ) {
        Column(
            modifier = Modifier
                .then(if (fillHeight) Modifier.fillMaxSize() else Modifier.fillMaxWidth())
                .padding(12.dp),
            verticalArrangement = Arrangement.spacedBy(8.dp),
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.SpaceBetween,
            ) {
                Text(
                    text = label,
                    style = MaterialTheme.typography.labelMedium.copy(fontWeight = FontWeight.SemiBold),
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                    modifier = Modifier.weight(1f, fill = false),
                )
                if (revealed) {
                    IconButton(
                        onClick = onZoom,
                        modifier = Modifier
                            .size(28.dp)
                            .clip(CircleShape)
                            .background(MaterialTheme.colorScheme.surfaceContainer),
                    ) {
                        Icon(
                            Icons.Rounded.ZoomIn,
                            contentDescription = "Увеличить",
                            modifier = Modifier.size(16.dp),
                            tint = MaterialTheme.colorScheme.onSurfaceVariant,
                        )
                    }
                }
            }

            if (fillHeight) {
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .weight(1f),
                    contentAlignment = Alignment.Center,
                ) {
                    if (revealed) {
                        ChemDiagramImage(
                            chem = chem,
                            contentDescription = label,
                            modifier = Modifier.fillMaxSize(),
                        )
                    } else {
                        Column(
                            horizontalAlignment = Alignment.CenterHorizontally,
                            verticalArrangement = Arrangement.spacedBy(6.dp),
                        ) {
                            Icon(
                                Icons.Rounded.TouchApp,
                                contentDescription = null,
                                tint = MaterialTheme.colorScheme.primary,
                                modifier = Modifier.size(28.dp),
                            )
                            Text(
                                text = hiddenHint,
                                style = MaterialTheme.typography.bodyMedium,
                                color = MaterialTheme.colorScheme.primary,
                                textAlign = TextAlign.Center,
                            )
                        }
                    }
                }
            } else {
                AnimatedVisibility(
                    visible = revealed,
                    enter = fadeIn(),
                    exit = fadeOut(),
                ) {
                    Box(
                        modifier = Modifier
                            .fillMaxWidth()
                            .heightIn(min = minHeight.dp, max = 260.dp),
                        contentAlignment = Alignment.Center,
                    ) {
                        ChemDiagramImage(
                            chem = chem,
                            contentDescription = label,
                            modifier = Modifier
                                .fillMaxWidth()
                                .heightIn(min = minHeight.dp, max = 250.dp),
                        )
                    }
                }

                if (!revealed) {
                    Box(
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(minHeight.dp),
                        contentAlignment = Alignment.Center,
                    ) {
                        Column(
                            horizontalAlignment = Alignment.CenterHorizontally,
                            verticalArrangement = Arrangement.spacedBy(6.dp),
                        ) {
                            Icon(
                                Icons.Rounded.TouchApp,
                                contentDescription = null,
                                tint = MaterialTheme.colorScheme.primary,
                                modifier = Modifier.size(28.dp),
                            )
                            Text(
                                text = hiddenHint,
                                style = MaterialTheme.typography.bodyMedium,
                                color = MaterialTheme.colorScheme.primary,
                                textAlign = TextAlign.Center,
                            )
                        }
                    }
                }
            }
        }
    }
}
