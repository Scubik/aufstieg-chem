package com.aufchem.aufstieg

import android.app.Application
import android.net.Uri
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.aufchem.aufstieg.data.AppThemeMode
import com.aufchem.aufstieg.data.CatalogFilter
import com.aufchem.aufstieg.data.CatalogItem
import com.aufchem.aufstieg.data.CbydDatabase
import com.aufchem.aufstieg.data.ChemBitmap
import com.aufchem.aufstieg.data.DbInitState
import com.aufchem.aufstieg.data.SequenceModel
import com.aufchem.aufstieg.data.SortOption
import com.aufchem.aufstieg.data.UserPreferences
import com.aufchem.aufstieg.data.ViewMode
import com.aufchem.aufstieg.pdf.PdfExporter
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.FlowPreview
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.debounce
import kotlinx.coroutines.flow.flowOn
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch
import kotlin.random.Random

data class SynthesisUiState(
    val item: CatalogItem? = null,
    val rootSequence: SequenceModel? = null,
    val stack: List<SequenceModel> = emptyList(),
    val isLoading: Boolean = false,
    val error: String? = null,
    val isExportingPdf: Boolean = false,
    val exportedPdfUri: Uri? = null,
    val pdfError: String? = null,
) {
    val activeSequence: SequenceModel? get() = stack.lastOrNull() ?: rootSequence
    val isInSubsequence: Boolean get() = stack.size > 1
}

class AppViewModel(application: Application) : AndroidViewModel(application) {
    val db = CbydDatabase(application.applicationContext)
    val prefs = UserPreferences(application.applicationContext)

    private val _dbState = MutableStateFlow<DbInitState>(DbInitState.Checking)
    val dbState: StateFlow<DbInitState> = _dbState.asStateFlow()

    private val _allItems = MutableStateFlow<List<CatalogItem>>(emptyList())
    val allItems: StateFlow<List<CatalogItem>> = _allItems.asStateFlow()

    private val _itemsByPath = MutableStateFlow<Map<String, CatalogItem>>(emptyMap())
    val itemsByPath: StateFlow<Map<String, CatalogItem>> = _itemsByPath.asStateFlow()

    private val _searchQuery = MutableStateFlow("")
    val searchQuery: StateFlow<String> = _searchQuery.asStateFlow()

    private val _filter = MutableStateFlow(CatalogFilter.ALL)
    val filter: StateFlow<CatalogFilter> = _filter.asStateFlow()

    private val _sort = MutableStateFlow(SortOption.NAME_ASC)
    val sort: StateFlow<SortOption> = _sort.asStateFlow()

    private val _drugCount = MutableStateFlow(0)
    val drugCount: StateFlow<Int> = _drugCount.asStateFlow()

    private val _naturalCount = MutableStateFlow(0)
    val naturalCount: StateFlow<Int> = _naturalCount.asStateFlow()

    @OptIn(FlowPreview::class)
    val filteredCatalog: StateFlow<List<CatalogItem>> = combine(
        _allItems,
        _searchQuery.debounce(110),
        _filter,
        _sort,
    ) { items, query, filter, sort ->
        val trimmed = query.trim().lowercase()
        val tokens = if (trimmed.isEmpty()) emptyList() else trimmed.split(Regex("\\s+")).filter { it.isNotEmpty() }

        val filtered = items.filter { item ->
            val passFilter = when (filter) {
                CatalogFilter.ALL -> true
                CatalogFilter.DRUGS -> item.isDrug
                CatalogFilter.NATURAL -> !item.isDrug
            }
            if (!passFilter) return@filter false
            if (tokens.isEmpty()) return@filter true
            tokens.all { tok -> item.searchBlob.contains(tok) }
        }

        when (sort) {
            SortOption.NAME_ASC -> filtered.sortedBy { it.displayTitle.lowercase() }
            SortOption.YEAR_DESC -> filtered.sortedWith(compareByDescending<CatalogItem> { it.yearInt }.thenBy { it.displayTitle.lowercase() })
            SortOption.YEAR_ASC -> filtered.sortedWith(compareBy<CatalogItem> { if (it.yearInt == 0) 9999 else it.yearInt }.thenBy { it.displayTitle.lowercase() })
            SortOption.AUTHOR_ASC -> filtered.sortedWith(compareBy<CatalogItem> { it.author.lowercase().ifBlank { "zzz" } }.thenBy { it.displayTitle.lowercase() })
        }
    }
        .flowOn(Dispatchers.Default)
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())

    private val _synthesisState = MutableStateFlow(SynthesisUiState())
    val synthesisState: StateFlow<SynthesisUiState> = _synthesisState.asStateFlow()

    private val _selectedRandomPath = MutableStateFlow<String?>(null)
    val selectedRandomPath: StateFlow<String?> = _selectedRandomPath.asStateFlow()

    private val _randomScrollRequest = MutableStateFlow(0)
    val randomScrollRequest: StateFlow<Int> = _randomScrollRequest.asStateFlow()

    val themeMode = prefs.themeMode
    val adaptiveDarkDiagrams = prefs.adaptiveDarkDiagrams
    val defaultViewMode = prefs.defaultViewMode
    val favorites = prefs.favorites
    val completed = prefs.completed
    val history = prefs.history

    init {
        initializeDatabase()
    }

    fun initializeDatabase() {
        viewModelScope.launch {
            _dbState.value = DbInitState.Checking
            try {
                db.ensureDatabaseReady { progress, copiedMb, totalMb ->
                    _dbState.value = DbInitState.Copying(progress, copiedMb, totalMb)
                }
                val catalog = db.loadCatalog()
                _allItems.value = catalog
                _itemsByPath.value = catalog.associateBy { it.path }
                val drugs = catalog.count { it.isDrug }
                _drugCount.value = drugs
                _naturalCount.value = catalog.size - drugs
                _dbState.value = DbInitState.Ready
            } catch (e: Exception) {
                _dbState.value = DbInitState.Error(e.message ?: "Ошибка инициализации базы данных")
            }
        }
    }

    fun setSearchQuery(q: String) {
        _searchQuery.value = q
    }

    fun setFilter(f: CatalogFilter) {
        _filter.value = f
    }

    fun setSort(s: SortOption) {
        _sort.value = s
    }

    fun setThemeMode(m: AppThemeMode) = prefs.setThemeMode(m)
    fun setAdaptiveDarkDiagrams(enabled: Boolean) = prefs.setAdaptiveDarkDiagrams(enabled)
    fun setDefaultViewMode(m: ViewMode) = prefs.setDefaultViewMode(m)
    fun toggleFavorite(path: String) = prefs.toggleFavorite(path)
    fun toggleCompleted(path: String) = prefs.toggleCompleted(path)
    fun clearHistory() = prefs.clearHistory()

    fun getCachedPreview(path: String): ChemBitmap? = db.getCachedPreview(path)
    suspend fun loadTargetPreview(path: String): ChemBitmap? = db.loadTargetPreview(path)

    fun openSynthesis(item: CatalogItem) {
        viewModelScope.launch {
            _synthesisState.value = SynthesisUiState(item = item, isLoading = true)
            try {
                val seq = db.loadSequence(item.path)
                if (seq == null) {
                    _synthesisState.value = SynthesisUiState(
                        item = item,
                        isLoading = false,
                        error = "Синтез не найден в базе данных.",
                    )
                } else {
                    prefs.recordHistory(item.path, 0, seq.steps.size)
                    _synthesisState.value = SynthesisUiState(
                        item = item,
                        rootSequence = seq,
                        stack = listOf(seq),
                        isLoading = false,
                    )
                }
            } catch (e: Exception) {
                _synthesisState.value = SynthesisUiState(
                    item = item,
                    isLoading = false,
                    error = "Не удалось загрузить синтез: ${e.message}",
                )
            }
        }
    }

    fun selectRandomSynthesis() {
        val pool = filteredCatalog.value
        if (pool.isEmpty()) return
        val currentPath = _selectedRandomPath.value
        val pick = if (pool.size > 1) {
            var candidate = pool[Random.nextInt(pool.size)]
            if (candidate.path == currentPath) {
                candidate = pool[(pool.indexOf(candidate) + 1) % pool.size]
            }
            candidate
        } else {
            pool.first()
        }
        _selectedRandomPath.value = pick.path
        _randomScrollRequest.value += 1
    }

    fun pushSubsequence(sub: SequenceModel) {
        val curr = _synthesisState.value
        _synthesisState.value = curr.copy(stack = curr.stack + sub)
    }

    fun popSubsequence(): Boolean {
        val curr = _synthesisState.value
        if (curr.stack.size > 1) {
            _synthesisState.value = curr.copy(stack = curr.stack.dropLast(1))
            return true
        }
        return false
    }

    fun closeSynthesis() {
        _synthesisState.value = SynthesisUiState()
    }

    fun updateStepProgress(stepIndex: Int) {
        val st = _synthesisState.value
        val item = st.item ?: return
        val root = st.rootSequence ?: return
        if (st.stack.size == 1) {
            prefs.recordHistory(item.path, stepIndex, root.steps.size)
        }
    }

    fun exportActivePdf(revealedNodeIndices: Set<Int> = emptySet()) {
        val st = _synthesisState.value
        val item = st.item ?: return
        val seq = st.activeSequence ?: return
        if (st.isExportingPdf) return

        viewModelScope.launch {
            _synthesisState.value = _synthesisState.value.copy(
                isExportingPdf = true,
                exportedPdfUri = null,
                pdfError = null,
            )
            try {
                val uri = PdfExporter.exportSynthesisPdf(
                    context = getApplication(),
                    item = item,
                    sequence = seq,
                    revealedNodeIndices = revealedNodeIndices,
                )
                _synthesisState.value = _synthesisState.value.copy(
                    isExportingPdf = false,
                    exportedPdfUri = uri,
                )
            } catch (e: Exception) {
                _synthesisState.value = _synthesisState.value.copy(
                    isExportingPdf = false,
                    pdfError = "Ошибка создания PDF: ${e.message}",
                )
            }
        }
    }

    fun clearExportedPdf() {
        _synthesisState.value = _synthesisState.value.copy(
            exportedPdfUri = null,
            pdfError = null,
        )
    }

    override fun onCleared() {
        super.onCleared()
        db.close()
    }
}
