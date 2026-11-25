package com.aufchem.aufstieg.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.BrightnessAuto
import androidx.compose.material.icons.rounded.Casino
import androidx.compose.material.icons.rounded.CheckCircle
import androidx.compose.material.icons.rounded.CheckCircleOutline
import androidx.compose.material.icons.rounded.Close
import androidx.compose.material.icons.rounded.DarkMode
import androidx.compose.material.icons.rounded.Favorite
import androidx.compose.material.icons.rounded.FavoriteBorder
import androidx.compose.material.icons.rounded.LightMode
import androidx.compose.material.icons.rounded.Medication
import androidx.compose.material.icons.rounded.Science
import androidx.compose.material.icons.rounded.Search
import androidx.compose.material.icons.rounded.Sort
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.FilterChip
import androidx.compose.material3.FilterChipDefaults
import androidx.compose.material3.FloatingActionButton
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.produceState
import androidx.compose.runtime.remember
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import kotlin.math.abs
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import com.aufchem.aufstieg.data.AppThemeMode
import com.aufchem.aufstieg.data.CatalogFilter
import com.aufchem.aufstieg.data.CatalogItem
import com.aufchem.aufstieg.data.ChemBitmap
import com.aufchem.aufstieg.data.SortOption
import com.aufchem.aufstieg.ui.components.AufstiegChairLogo
import com.aufchem.aufstieg.ui.components.ChemDiagramImage

@Composable
fun CatalogScreen(
    items: List<CatalogItem>,
    totalCount: Int,
    drugCount: Int,
    naturalCount: Int,
    query: String,
    filter: CatalogFilter,
    sort: SortOption,
    favorites: Set<String>,
    completed: Set<String>,
    themeMode: AppThemeMode,
    selectedRandomPath: String?,
    randomScrollRequest: Int,
    onQueryChange: (String) -> Unit,
    onFilterChange: (CatalogFilter) -> Unit,
    onSortChange: (SortOption) -> Unit,
    onCycleTheme: () -> Unit,
    onToggleFavorite: (String) -> Unit,
    onToggleCompleted: (String) -> Unit,
    getCachedPreview: (String) -> ChemBitmap?,
    loadPreview: suspend (String) -> ChemBitmap?,
    onOpenItem: (CatalogItem) -> Unit,
    onSelectRandom: () -> Unit,
    modifier: Modifier = Modifier,
) {
    val listState = rememberLazyListState()
    var sortMenuExpanded by remember { mutableStateOf(false) }
    var lastHandledScrollReq by rememberSaveable { mutableIntStateOf(0) }

    LaunchedEffect(randomScrollRequest, selectedRandomPath) {
        if (randomScrollRequest > lastHandledScrollReq && selectedRandomPath != null) {
            lastHandledScrollReq = randomScrollRequest
            val idx = items.indexOfFirst { it.path == selectedRandomPath }
            if (idx >= 0) {
                if (abs(idx - listState.firstVisibleItemIndex) > 18) {
                    listState.scrollToItem(idx)
                } else {
                    listState.animateScrollToItem(idx)
                }
            }
        }
    }

    Box(modifier = modifier.fillMaxSize()) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .statusBarsPadding(),
        ) {
            // Clean modern top header
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp, vertical = 12.dp),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.SpaceBetween,
            ) {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(10.dp),
                ) {
                    Surface(
                        shape = RoundedCornerShape(12.dp),
                        color = MaterialTheme.colorScheme.primaryContainer,
                        modifier = Modifier.size(40.dp),
                    ) {
                        AufstiegChairLogo(
                            modifier = Modifier
                                .fillMaxSize()
                                .padding(6.dp),
                            strokeColor = MaterialTheme.colorScheme.primary,
                            flagColor = MaterialTheme.colorScheme.primary,
                        )
                    }
                    Column {
                        Text(
                            text = "Aufstieg | Химия",
                            style = MaterialTheme.typography.titleLarge,
                            color = MaterialTheme.colorScheme.onBackground,
                        )
                        Text(
                            text = "Показано ${items.size} из $totalCount синтезов",
                            style = MaterialTheme.typography.labelMedium,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                        )
                    }
                }

                IconButton(
                    onClick = onCycleTheme,
                    modifier = Modifier
                        .clip(CircleShape)
                        .background(MaterialTheme.colorScheme.surfaceContainer),
                ) {
                    val icon = when (themeMode) {
                        AppThemeMode.SYSTEM -> Icons.Rounded.BrightnessAuto
                        AppThemeMode.LIGHT -> Icons.Rounded.LightMode
                        AppThemeMode.DARK -> Icons.Rounded.DarkMode
                    }
                    Icon(
                        imageVector = icon,
                        contentDescription = "Сменить тему",
                        tint = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                }
            }

            // Search bar
            OutlinedTextField(
                value = query,
                onValueChange = onQueryChange,
                placeholder = {
                    Text(
                        "Поиск молекулы, автора, года, препарата...",
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis,
                    )
                },
                leadingIcon = {
                    Icon(
                        Icons.Rounded.Search,
                        contentDescription = null,
                        tint = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                },
                trailingIcon = {
                    if (query.isNotEmpty()) {
                        IconButton(onClick = { onQueryChange("") }) {
                            Icon(Icons.Rounded.Close, contentDescription = "Очистить")
                        }
                    }
                },
                singleLine = true,
                shape = RoundedCornerShape(16.dp),
                colors = OutlinedTextFieldDefaults.colors(
                    focusedContainerColor = MaterialTheme.colorScheme.surface,
                    unfocusedContainerColor = MaterialTheme.colorScheme.surface,
                    focusedBorderColor = MaterialTheme.colorScheme.primary,
                    unfocusedBorderColor = MaterialTheme.colorScheme.outlineVariant,
                ),
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp),
            )

            Spacer(Modifier.height(10.dp))

            // Filter & Sort chips row
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .horizontalScroll(rememberScrollState())
                    .padding(horizontal = 16.dp),
                horizontalArrangement = Arrangement.spacedBy(8.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                FilterChip(
                    selected = filter == CatalogFilter.ALL,
                    onClick = { onFilterChange(CatalogFilter.ALL) },
                    label = { Text("Все ($totalCount)") },
                    shape = RoundedCornerShape(12.dp),
                )
                FilterChip(
                    selected = filter == CatalogFilter.DRUGS,
                    onClick = { onFilterChange(CatalogFilter.DRUGS) },
                    label = { Text("Лекарства ($drugCount)") },
                    leadingIcon = {
                        Icon(
                            Icons.Rounded.Medication,
                            contentDescription = null,
                            modifier = Modifier.size(16.dp),
                        )
                    },
                    shape = RoundedCornerShape(12.dp),
                )
                FilterChip(
                    selected = filter == CatalogFilter.NATURAL,
                    onClick = { onFilterChange(CatalogFilter.NATURAL) },
                    label = { Text("Природные ($naturalCount)") },
                    shape = RoundedCornerShape(12.dp),
                )

                Box {
                    val sortLabel = when (sort) {
                        SortOption.NAME_ASC -> "А→Я"
                        SortOption.YEAR_DESC -> "Новые"
                        SortOption.YEAR_ASC -> "Старые"
                        SortOption.AUTHOR_ASC -> "Автор"
                    }
                    FilterChip(
                        selected = sort != SortOption.NAME_ASC,
                        onClick = { sortMenuExpanded = true },
                        label = { Text(sortLabel) },
                        leadingIcon = {
                            Icon(
                                Icons.Rounded.Sort,
                                contentDescription = null,
                                modifier = Modifier.size(16.dp),
                            )
                        },
                        colors = FilterChipDefaults.filterChipColors(
                            selectedContainerColor = MaterialTheme.colorScheme.secondaryContainer,
                            selectedLabelColor = MaterialTheme.colorScheme.onSecondaryContainer,
                        ),
                        shape = RoundedCornerShape(12.dp),
                    )
                    DropdownMenu(
                        expanded = sortMenuExpanded,
                        onDismissRequest = { sortMenuExpanded = false },
                    ) {
                        DropdownMenuItem(
                            text = { Text("По названию (А→Я)") },
                            onClick = { onSortChange(SortOption.NAME_ASC); sortMenuExpanded = false },
                        )
                        DropdownMenuItem(
                            text = { Text("Сначала новые") },
                            onClick = { onSortChange(SortOption.YEAR_DESC); sortMenuExpanded = false },
                        )
                        DropdownMenuItem(
                            text = { Text("Сначала старые") },
                            onClick = { onSortChange(SortOption.YEAR_ASC); sortMenuExpanded = false },
                        )
                        DropdownMenuItem(
                            text = { Text("По автору (А→Я)") },
                            onClick = { onSortChange(SortOption.AUTHOR_ASC); sortMenuExpanded = false },
                        )
                    }
                }
            }

            Spacer(Modifier.height(6.dp))

            if (items.isEmpty()) {
                Box(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(32.dp),
                    contentAlignment = Alignment.Center,
                ) {
                    Column(
                        horizontalAlignment = Alignment.CenterHorizontally,
                        verticalArrangement = Arrangement.spacedBy(8.dp),
                    ) {
                        Icon(
                            Icons.Rounded.Search,
                            contentDescription = null,
                            modifier = Modifier.size(48.dp),
                            tint = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.5f),
                        )
                        Text(
                            text = "Ничего не найдено",
                            style = MaterialTheme.typography.titleMedium,
                            color = MaterialTheme.colorScheme.onSurface,
                        )
                        Text(
                            text = "Попробуйте изменить запрос или сбросить фильтр",
                            style = MaterialTheme.typography.bodyMedium,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                        )
                    }
                }
            } else {
                LazyColumn(
                    state = listState,
                    contentPadding = PaddingValues(
                        start = 16.dp,
                        end = 16.dp,
                        top = 4.dp,
                        bottom = 88.dp,
                    ),
                    verticalArrangement = Arrangement.spacedBy(10.dp),
                    modifier = Modifier.fillMaxSize(),
                ) {
                    items(
                        items = items,
                        key = { it.path },
                        contentType = { if (it.isDrug) "drug" else "nat" },
                    ) { item ->
                        val isRandomSelected = item.path == selectedRandomPath
                        SynthesisCatalogCard(
                            item = item,
                            isFavorite = favorites.contains(item.path),
                            isCompleted = completed.contains(item.path),
                            isHighlighted = isRandomSelected,
                            trailingBadge = if (isRandomSelected) "Случайный" else null,
                            onToggleFavorite = { onToggleFavorite(item.path) },
                            onToggleCompleted = { onToggleCompleted(item.path) },
                            getCachedPreview = getCachedPreview,
                            loadPreview = loadPreview,
                            onClick = { onOpenItem(item) },
                        )
                    }
                }
            }
        }

        // Random Synthesis FAB (dice icon only — selects without opening)
        FloatingActionButton(
            onClick = onSelectRandom,
            containerColor = MaterialTheme.colorScheme.primary,
            contentColor = MaterialTheme.colorScheme.onPrimary,
            shape = RoundedCornerShape(16.dp),
            modifier = Modifier
                .align(Alignment.BottomEnd)
                .padding(16.dp),
        ) {
            Icon(Icons.Rounded.Casino, contentDescription = "Выбрать случайный синтез")
        }
    }
}

@Composable
fun SynthesisCatalogCard(
    item: CatalogItem,
    isFavorite: Boolean,
    isCompleted: Boolean,
    onToggleFavorite: () -> Unit,
    onToggleCompleted: () -> Unit,
    getCachedPreview: (String) -> ChemBitmap?,
    loadPreview: suspend (String) -> ChemBitmap?,
    onClick: () -> Unit,
    isHighlighted: Boolean = false,
    trailingBadge: String? = null,
    modifier: Modifier = Modifier,
) {
    val preview by produceState<ChemBitmap?>(
        initialValue = getCachedPreview(item.path),
        key1 = item.path,
    ) {
        if (value == null) {
            value = loadPreview(item.path)
        }
    }

    Surface(
        shape = RoundedCornerShape(16.dp),
        color = if (isHighlighted) {
            MaterialTheme.colorScheme.primaryContainer.copy(alpha = 0.32f)
        } else {
            MaterialTheme.colorScheme.surface
        },
        tonalElevation = if (isHighlighted) 3.dp else 1.dp,
        shadowElevation = 0.dp,
        border = androidx.compose.foundation.BorderStroke(
            width = if (isHighlighted) 2.dp else 1.dp,
            color = when {
                isHighlighted -> MaterialTheme.colorScheme.primary
                isCompleted -> MaterialTheme.colorScheme.secondary.copy(alpha = 0.55f)
                else -> MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.7f)
            },
        ),
        modifier = modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(16.dp))
            .clickable(onClick = onClick),
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(start = 10.dp, end = 6.dp, top = 10.dp, bottom = 10.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            // Target molecule preview thumbnail
            Surface(
                shape = RoundedCornerShape(12.dp),
                color = MaterialTheme.colorScheme.surfaceContainerLow,
                border = androidx.compose.foundation.BorderStroke(
                    width = 1.dp,
                    color = MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.5f),
                ),
                modifier = Modifier.size(width = 78.dp, height = 64.dp),
            ) {
                Box(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(5.dp),
                    contentAlignment = Alignment.Center,
                ) {
                    val bmp = preview
                    if (bmp != null) {
                        ChemDiagramImage(
                            chem = bmp,
                            contentDescription = item.displayTitle,
                            modifier = Modifier.fillMaxSize(),
                        )
                    } else {
                        Icon(
                            Icons.Rounded.Science,
                            contentDescription = null,
                            tint = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.25f),
                            modifier = Modifier.size(24.dp),
                        )
                    }
                }
            }

            Column(
                modifier = Modifier.weight(1f),
                verticalArrangement = Arrangement.spacedBy(4.dp),
            ) {
                Text(
                    text = item.displayTitle,
                    style = MaterialTheme.typography.titleMedium,
                    color = MaterialTheme.colorScheme.onSurface,
                    maxLines = 2,
                    overflow = TextOverflow.Ellipsis,
                )

                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                ) {
                    val subtitle = buildString {
                        if (item.author.isNotBlank()) append(item.author)
                        if (item.year.isNotBlank()) {
                            if (isNotEmpty()) append(" · ")
                            append(item.year)
                        }
                    }
                    if (subtitle.isNotBlank()) {
                        Text(
                            text = subtitle,
                            style = MaterialTheme.typography.bodyMedium,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis,
                            modifier = Modifier.weight(1f, fill = false),
                        )
                    }
                    if (trailingBadge != null) {
                        Surface(
                            shape = RoundedCornerShape(8.dp),
                            color = MaterialTheme.colorScheme.primaryContainer,
                        ) {
                            Text(
                                text = trailingBadge,
                                style = MaterialTheme.typography.labelMedium,
                                color = MaterialTheme.colorScheme.onPrimaryContainer,
                                modifier = Modifier.padding(horizontal = 7.dp, vertical = 2.dp),
                            )
                        }
                    }
                }

                if (item.isDrug) {
                    Spacer(Modifier.height(2.dp))
                    Surface(
                        shape = RoundedCornerShape(8.dp),
                        color = MaterialTheme.colorScheme.tertiaryContainer,
                    ) {
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(4.dp),
                            modifier = Modifier.padding(horizontal = 8.dp, vertical = 3.dp),
                        ) {
                            Icon(
                                Icons.Rounded.Medication,
                                contentDescription = null,
                                tint = MaterialTheme.colorScheme.onTertiaryContainer,
                                modifier = Modifier.size(13.dp),
                            )
                            Text(
                                text = item.drug,
                                style = MaterialTheme.typography.labelMedium.copy(fontWeight = FontWeight.Medium),
                                color = MaterialTheme.colorScheme.onTertiaryContainer,
                                maxLines = 1,
                                overflow = TextOverflow.Ellipsis,
                            )
                        }
                    }
                }
            }

            Column(
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.spacedBy(2.dp),
            ) {
                IconButton(
                    onClick = onToggleFavorite,
                    modifier = Modifier.size(36.dp),
                ) {
                    Icon(
                        imageVector = if (isFavorite) Icons.Rounded.Favorite else Icons.Rounded.FavoriteBorder,
                        contentDescription = if (isFavorite) "Убрать из избранного" else "В избранное",
                        tint = if (isFavorite) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.6f),
                        modifier = Modifier.size(21.dp),
                    )
                }
                IconButton(
                    onClick = onToggleCompleted,
                    modifier = Modifier.size(36.dp),
                ) {
                    Icon(
                        imageVector = if (isCompleted) Icons.Rounded.CheckCircle else Icons.Rounded.CheckCircleOutline,
                        contentDescription = if (isCompleted) "Снять отметку о выполнении" else "Отметить как сделанный",
                        tint = if (isCompleted) MaterialTheme.colorScheme.secondary else MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.55f),
                        modifier = Modifier.size(21.dp),
                    )
                }
            }
        }
    }
}
