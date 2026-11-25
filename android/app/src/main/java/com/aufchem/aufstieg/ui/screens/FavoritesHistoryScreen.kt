package com.aufchem.aufstieg.ui.screens

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
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.CheckCircleOutline
import androidx.compose.material.icons.rounded.DeleteOutline
import androidx.compose.material.icons.rounded.FavoriteBorder
import androidx.compose.material.icons.rounded.History
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.SegmentedButton
import androidx.compose.material3.SegmentedButtonDefaults
import androidx.compose.material3.SingleChoiceSegmentedButtonRow
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import com.aufchem.aufstieg.data.CatalogItem
import com.aufchem.aufstieg.data.ChemBitmap
import com.aufchem.aufstieg.data.HistoryEntry

@Composable
fun FavoritesHistoryScreen(
    itemsByPath: Map<String, CatalogItem>,
    favorites: Set<String>,
    completed: Set<String>,
    history: List<HistoryEntry>,
    onToggleFavorite: (String) -> Unit,
    onToggleCompleted: (String) -> Unit,
    getCachedPreview: (String) -> ChemBitmap?,
    loadPreview: suspend (String) -> ChemBitmap?,
    onClearHistory: () -> Unit,
    onOpenItem: (CatalogItem) -> Unit,
    modifier: Modifier = Modifier,
) {
    var selectedTab by remember { mutableIntStateOf(0) }

    val favoriteItems = remember(favorites, itemsByPath) {
        favorites.mapNotNull { itemsByPath[it] }.sortedBy { it.displayTitle.lowercase() }
    }
    val completedItems = remember(completed, itemsByPath) {
        completed.mapNotNull { itemsByPath[it] }.sortedBy { it.displayTitle.lowercase() }
    }

    Column(
        modifier = modifier
            .fillMaxSize()
            .statusBarsPadding(),
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 16.dp, vertical = 14.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.SpaceBetween,
        ) {
            Text(
                text = "Коллекция",
                style = MaterialTheme.typography.headlineSmall,
                color = MaterialTheme.colorScheme.onBackground,
            )
            if (selectedTab == 2 && history.isNotEmpty()) {
                TextButton(onClick = onClearHistory) {
                    Icon(Icons.Rounded.DeleteOutline, contentDescription = null, modifier = Modifier.size(18.dp))
                    Spacer(Modifier.size(4.dp))
                    Text("Очистить")
                }
            }
        }

        SingleChoiceSegmentedButtonRow(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 16.dp),
        ) {
            SegmentedButton(
                selected = selectedTab == 0,
                onClick = { selectedTab = 0 },
                shape = SegmentedButtonDefaults.itemShape(0, 3, RoundedCornerShape(12.dp)),
                label = {
                    Text(
                        "Избранное (${favoriteItems.size})",
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis,
                    )
                },
            )
            SegmentedButton(
                selected = selectedTab == 1,
                onClick = { selectedTab = 1 },
                shape = SegmentedButtonDefaults.itemShape(1, 3, RoundedCornerShape(12.dp)),
                label = {
                    Text(
                        "Сделано (${completedItems.size})",
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis,
                    )
                },
            )
            SegmentedButton(
                selected = selectedTab == 2,
                onClick = { selectedTab = 2 },
                shape = SegmentedButtonDefaults.itemShape(2, 3, RoundedCornerShape(12.dp)),
                label = {
                    Text(
                        "История (${history.size})",
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis,
                    )
                },
            )
        }

        Spacer(Modifier.height(12.dp))

        when (selectedTab) {
            0 -> {
                if (favoriteItems.isEmpty()) {
                    EmptyCollectionState(
                        icon = Icons.Rounded.FavoriteBorder,
                        title = "Пока нет избранных синтезов",
                        subtitle = "Нажмите на сердечко рядом с любым синтезом, чтобы быстро возвращаться к нему",
                    )
                } else {
                    LazyColumn(
                        contentPadding = PaddingValues(horizontal = 16.dp, vertical = 4.dp),
                        verticalArrangement = Arrangement.spacedBy(10.dp),
                        modifier = Modifier.fillMaxSize(),
                    ) {
                        items(favoriteItems, key = { it.path }) { item ->
                            SynthesisCatalogCard(
                                item = item,
                                isFavorite = true,
                                isCompleted = completed.contains(item.path),
                                onToggleFavorite = { onToggleFavorite(item.path) },
                                onToggleCompleted = { onToggleCompleted(item.path) },
                                getCachedPreview = getCachedPreview,
                                loadPreview = loadPreview,
                                onClick = { onOpenItem(item) },
                            )
                        }
                        item { Spacer(Modifier.height(16.dp)) }
                    }
                }
            }

            1 -> {
                if (completedItems.isEmpty()) {
                    EmptyCollectionState(
                        icon = Icons.Rounded.CheckCircleOutline,
                        title = "Пока нет сделанных синтезов",
                        subtitle = "Нажмите на галочку рядом с лайком, чтобы отмечать пройденные синтезы",
                    )
                } else {
                    LazyColumn(
                        contentPadding = PaddingValues(horizontal = 16.dp, vertical = 4.dp),
                        verticalArrangement = Arrangement.spacedBy(10.dp),
                        modifier = Modifier.fillMaxSize(),
                    ) {
                        items(completedItems, key = { it.path }) { item ->
                            SynthesisCatalogCard(
                                item = item,
                                isFavorite = favorites.contains(item.path),
                                isCompleted = true,
                                onToggleFavorite = { onToggleFavorite(item.path) },
                                onToggleCompleted = { onToggleCompleted(item.path) },
                                getCachedPreview = getCachedPreview,
                                loadPreview = loadPreview,
                                onClick = { onOpenItem(item) },
                            )
                        }
                        item { Spacer(Modifier.height(16.dp)) }
                    }
                }
            }

            else -> {
                val historyItems = remember(history, itemsByPath) {
                    history.mapNotNull { h -> itemsByPath[h.path]?.let { it to h } }
                }
                if (historyItems.isEmpty()) {
                    EmptyCollectionState(
                        icon = Icons.Rounded.History,
                        title = "История пуста",
                        subtitle = "Здесь будут появляться синтезы, которые вы недавно открывали",
                    )
                } else {
                    LazyColumn(
                        contentPadding = PaddingValues(horizontal = 16.dp, vertical = 4.dp),
                        verticalArrangement = Arrangement.spacedBy(10.dp),
                        modifier = Modifier.fillMaxSize(),
                    ) {
                        items(historyItems, key = { it.first.path }) { (item, entry) ->
                            val badge = if (entry.totalSteps > 0) {
                                "Шаг ${entry.lastStep + 1}/${entry.totalSteps}"
                            } else null
                            SynthesisCatalogCard(
                                item = item,
                                isFavorite = favorites.contains(item.path),
                                isCompleted = completed.contains(item.path),
                                onToggleFavorite = { onToggleFavorite(item.path) },
                                onToggleCompleted = { onToggleCompleted(item.path) },
                                getCachedPreview = getCachedPreview,
                                loadPreview = loadPreview,
                                onClick = { onOpenItem(item) },
                                trailingBadge = badge,
                            )
                        }
                        item { Spacer(Modifier.height(16.dp)) }
                    }
                }
            }
        }
    }
}

@Composable
private fun EmptyCollectionState(
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    title: String,
    subtitle: String,
) {
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
                imageVector = icon,
                contentDescription = null,
                modifier = Modifier.size(52.dp),
                tint = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.45f),
            )
            Text(
                text = title,
                style = MaterialTheme.typography.titleMedium,
                color = MaterialTheme.colorScheme.onSurface,
            )
            Text(
                text = subtitle,
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                textAlign = androidx.compose.ui.text.style.TextAlign.Center,
            )
        }
    }
}
