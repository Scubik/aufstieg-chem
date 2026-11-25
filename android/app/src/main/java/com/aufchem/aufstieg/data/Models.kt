package com.aufchem.aufstieg.data

import android.graphics.Bitmap

data class CatalogItem(
    val path: String,
    val full: String,
    val name: String,
    val author: String,
    val year: String,
    val drug: String,
) {
    val isDrug: Boolean = drug.isNotBlank()
    val yearInt: Int = year.toIntOrNull() ?: 0
    val displayTitle: String = name.ifBlank { full }
    val searchBlob: String = "$full $name $author $year $drug".lowercase()
}

data class ChemBitmap(
    val bitmap: Bitmap,
    val isColored: Boolean,
) {
    val width: Int get() = bitmap.width
    val height: Int get() = bitmap.height
}

data class ReactionParts(
    val reagent: ChemBitmap?,
    val conditions: ChemBitmap?,
    val combined: ChemBitmap,
)

data class StepModel(
    val stepIndex: Int,
    val reagentNum: Int,
    val substrate: ChemBitmap,
    val reaction: ReactionParts,
    val product: ChemBitmap,
    val namedReaction: ChemBitmap?,
    val subsequence: SequenceModel?,
)

data class SequenceModel(
    val name: String,
    val path: String,
    val doi: String,
    val start: ChemBitmap?,
    val citation: ChemBitmap?,
    val steps: List<StepModel>,
)

data class HistoryEntry(
    val path: String,
    val lastStep: Int,
    val totalSteps: Int,
    val timestamp: Long,
)

enum class AppThemeMode { SYSTEM, LIGHT, DARK }

enum class ViewMode { FEED, CANVAS }

enum class CatalogFilter { ALL, DRUGS, NATURAL }

enum class SortOption { NAME_ASC, YEAR_DESC, YEAR_ASC, AUTHOR_ASC }

sealed class DbInitState {
    data object Checking : DbInitState()
    data class Copying(val progress: Float, val copiedMb: Int, val totalMb: Int) : DbInitState()
    data object Ready : DbInitState()
    data class Error(val message: String) : DbInitState()
}
