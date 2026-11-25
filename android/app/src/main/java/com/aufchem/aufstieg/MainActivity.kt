package com.aufchem.aufstieg

import android.content.Intent
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.BackHandler
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.activity.viewModels
import androidx.compose.animation.Crossfade
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.AlternateEmail
import androidx.compose.material.icons.rounded.Bookmarks
import androidx.compose.material.icons.rounded.Science
import androidx.compose.material3.Button
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.Scaffold
import androidx.compose.material3.SnackbarHost
import androidx.compose.material3.SnackbarHostState
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.aufchem.aufstieg.data.AppThemeMode
import com.aufchem.aufstieg.data.DbInitState
import com.aufchem.aufstieg.ui.components.AufstiegChairLogo
import com.aufchem.aufstieg.ui.screens.CatalogScreen
import com.aufchem.aufstieg.ui.screens.ContactsScreen
import com.aufchem.aufstieg.ui.screens.FavoritesHistoryScreen
import com.aufchem.aufstieg.ui.screens.SynthesisScreen
import com.aufchem.aufstieg.ui.theme.AufstiegTheme
import kotlinx.coroutines.launch

class MainActivity : ComponentActivity() {
    private val viewModel: AppViewModel by viewModels()

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContent {
            val themeMode by viewModel.themeMode.collectAsStateWithLifecycle()
            val adaptiveDark by viewModel.adaptiveDarkDiagrams.collectAsStateWithLifecycle()

            AufstiegTheme(
                themeMode = themeMode,
                adaptiveDarkDiagrams = adaptiveDark,
            ) {
                AufstiegApp(viewModel = viewModel)
            }
        }
    }
}

@Composable
private fun AufstiegApp(viewModel: AppViewModel) {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    val snackbarHostState = remember { SnackbarHostState() }

    val dbState by viewModel.dbState.collectAsStateWithLifecycle()
    val synthesisState by viewModel.synthesisState.collectAsStateWithLifecycle()

    val allItems by viewModel.allItems.collectAsStateWithLifecycle()
    val filteredCatalog by viewModel.filteredCatalog.collectAsStateWithLifecycle()
    val itemsByPath by viewModel.itemsByPath.collectAsStateWithLifecycle()
    val drugCount by viewModel.drugCount.collectAsStateWithLifecycle()
    val naturalCount by viewModel.naturalCount.collectAsStateWithLifecycle()

    val searchQuery by viewModel.searchQuery.collectAsStateWithLifecycle()
    val filter by viewModel.filter.collectAsStateWithLifecycle()
    val sort by viewModel.sort.collectAsStateWithLifecycle()
    val themeMode by viewModel.themeMode.collectAsStateWithLifecycle()
    val adaptiveDark by viewModel.adaptiveDarkDiagrams.collectAsStateWithLifecycle()
    val defaultViewMode by viewModel.defaultViewMode.collectAsStateWithLifecycle()
    val favorites by viewModel.favorites.collectAsStateWithLifecycle()
    val completed by viewModel.completed.collectAsStateWithLifecycle()
    val history by viewModel.history.collectAsStateWithLifecycle()
    val selectedRandomPath by viewModel.selectedRandomPath.collectAsStateWithLifecycle()
    val randomScrollRequest by viewModel.randomScrollRequest.collectAsStateWithLifecycle()

    var currentTab by rememberSaveable { mutableIntStateOf(0) }

    // Open exported PDF via system viewer / share sheet
    LaunchedEffect(synthesisState.exportedPdfUri) {
        val uri = synthesisState.exportedPdfUri ?: return@LaunchedEffect
        val viewIntent = Intent(Intent.ACTION_VIEW).apply {
            setDataAndType(uri, "application/pdf")
            addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
        }
        try {
            context.startActivity(Intent.createChooser(viewIntent, "Открыть PDF-флешкарту"))
        } catch (_: Exception) {
            val sendIntent = Intent(Intent.ACTION_SEND).apply {
                type = "application/pdf"
                putExtra(Intent.EXTRA_STREAM, uri)
                addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
            }
            try {
                context.startActivity(Intent.createChooser(sendIntent, "Сохранить или отправить PDF"))
            } catch (_: Exception) {
                snackbarHostState.showSnackbar("Нет приложения для открытия PDF")
            }
        } finally {
            viewModel.clearExportedPdf()
        }
    }

    LaunchedEffect(synthesisState.pdfError) {
        val err = synthesisState.pdfError ?: return@LaunchedEffect
        snackbarHostState.showSnackbar(err)
        viewModel.clearExportedPdf()
    }

    // Handle system Back button inside synthesis viewer
    BackHandler(enabled = synthesisState.item != null) {
        if (!viewModel.popSubsequence()) {
            viewModel.closeSynthesis()
        }
    }

    Surface(
        modifier = Modifier.fillMaxSize(),
        color = MaterialTheme.colorScheme.background,
    ) {
        when (val st = dbState) {
            is DbInitState.Checking, is DbInitState.Copying -> {
                DbSetupScreen(state = st)
            }

            is DbInitState.Error -> {
                Box(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(28.dp),
                    contentAlignment = Alignment.Center,
                ) {
                    Column(
                        horizontalAlignment = Alignment.CenterHorizontally,
                        verticalArrangement = Arrangement.spacedBy(12.dp),
                    ) {
                        Text(
                            text = "Не удалось подготовить базу",
                            style = MaterialTheme.typography.titleLarge,
                        )
                        Text(
                            text = st.message,
                            style = MaterialTheme.typography.bodyMedium,
                            color = MaterialTheme.colorScheme.error,
                            textAlign = TextAlign.Center,
                        )
                        Button(onClick = { viewModel.initializeDatabase() }) {
                            Text("Повторить")
                        }
                    }
                }
            }

            is DbInitState.Ready -> {
                if (synthesisState.item != null) {
                    Box(modifier = Modifier.fillMaxSize()) {
                        SynthesisScreen(
                            state = synthesisState,
                            defaultViewMode = defaultViewMode,
                            isFavorite = favorites.contains(synthesisState.item?.path),
                            isCompleted = completed.contains(synthesisState.item?.path),
                            onBack = {
                                if (!viewModel.popSubsequence()) {
                                    viewModel.closeSynthesis()
                                }
                            },
                            onToggleFavorite = {
                                synthesisState.item?.path?.let { viewModel.toggleFavorite(it) }
                            },
                            onToggleCompleted = {
                                synthesisState.item?.path?.let { viewModel.toggleCompleted(it) }
                            },
                            onExportPdf = { revealed -> viewModel.exportActivePdf(revealed) },
                            onPushSubsequence = { viewModel.pushSubsequence(it) },
                            onStepChanged = { viewModel.updateStepProgress(it) },
                        )
                        SnackbarHost(
                            hostState = snackbarHostState,
                            modifier = Modifier.align(Alignment.BottomCenter),
                        )
                    }
                } else {
                    Scaffold(
                        snackbarHost = { SnackbarHost(hostState = snackbarHostState) },
                        bottomBar = {
                            NavigationBar {
                                NavigationBarItem(
                                    selected = currentTab == 0,
                                    onClick = { currentTab = 0 },
                                    icon = { Icon(Icons.Rounded.Science, contentDescription = null) },
                                    label = { Text("Синтезы") },
                                )
                                NavigationBarItem(
                                    selected = currentTab == 1,
                                    onClick = { currentTab = 1 },
                                    icon = { Icon(Icons.Rounded.Bookmarks, contentDescription = null) },
                                    label = { Text("Коллекция") },
                                )
                                NavigationBarItem(
                                    selected = currentTab == 2,
                                    onClick = { currentTab = 2 },
                                    icon = { Icon(Icons.Rounded.AlternateEmail, contentDescription = null) },
                                    label = { Text("Контакты") },
                                )
                            }
                        },
                    ) { innerPadding ->
                        Crossfade(
                            targetState = currentTab,
                            label = "main_tabs",
                            modifier = Modifier
                                .fillMaxSize()
                                .padding(innerPadding),
                        ) { tab ->
                            when (tab) {
                                0 -> CatalogScreen(
                                    items = filteredCatalog,
                                    totalCount = allItems.size,
                                    drugCount = drugCount,
                                    naturalCount = naturalCount,
                                    query = searchQuery,
                                    filter = filter,
                                    sort = sort,
                                    favorites = favorites,
                                    completed = completed,
                                    themeMode = themeMode,
                                    selectedRandomPath = selectedRandomPath,
                                    randomScrollRequest = randomScrollRequest,
                                    onQueryChange = viewModel::setSearchQuery,
                                    onFilterChange = viewModel::setFilter,
                                    onSortChange = viewModel::setSort,
                                    onCycleTheme = {
                                        val next = when (themeMode) {
                                            AppThemeMode.SYSTEM -> AppThemeMode.LIGHT
                                            AppThemeMode.LIGHT -> AppThemeMode.DARK
                                            AppThemeMode.DARK -> AppThemeMode.SYSTEM
                                        }
                                        viewModel.setThemeMode(next)
                                    },
                                    onToggleFavorite = viewModel::toggleFavorite,
                                    onToggleCompleted = viewModel::toggleCompleted,
                                    getCachedPreview = viewModel::getCachedPreview,
                                    loadPreview = viewModel::loadTargetPreview,
                                    onOpenItem = viewModel::openSynthesis,
                                    onSelectRandom = viewModel::selectRandomSynthesis,
                                )

                                1 -> FavoritesHistoryScreen(
                                    itemsByPath = itemsByPath,
                                    favorites = favorites,
                                    completed = completed,
                                    history = history,
                                    onToggleFavorite = viewModel::toggleFavorite,
                                    onToggleCompleted = viewModel::toggleCompleted,
                                    getCachedPreview = viewModel::getCachedPreview,
                                    loadPreview = viewModel::loadTargetPreview,
                                    onClearHistory = viewModel::clearHistory,
                                    onOpenItem = viewModel::openSynthesis,
                                )

                                2 -> ContactsScreen(
                                    themeMode = themeMode,
                                    adaptiveDarkDiagrams = adaptiveDark,
                                    defaultViewMode = defaultViewMode,
                                    onThemeModeChange = viewModel::setThemeMode,
                                    onAdaptiveDarkChange = viewModel::setAdaptiveDarkDiagrams,
                                    onDefaultViewModeChange = viewModel::setDefaultViewMode,
                                    onShowMessage = { msg ->
                                        scope.launch { snackbarHostState.showSnackbar(msg) }
                                    },
                                )
                            }
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun DbSetupScreen(state: DbInitState) {
    Box(
        modifier = Modifier
            .fillMaxSize()
            .padding(32.dp),
        contentAlignment = Alignment.Center,
    ) {
        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(16.dp),
            modifier = Modifier.fillMaxWidth(),
        ) {
            Surface(
                shape = RoundedCornerShape(22.dp),
                color = MaterialTheme.colorScheme.primaryContainer,
                modifier = Modifier.size(84.dp),
            ) {
                AufstiegChairLogo(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(14.dp),
                    strokeColor = MaterialTheme.colorScheme.primary,
                    flagColor = MaterialTheme.colorScheme.primary,
                )
            }

            Text(
                text = "Aufstieg | Химия",
                style = MaterialTheme.typography.headlineSmall,
            )

            when (state) {
                is DbInitState.Checking -> {
                    CircularProgressIndicator()
                    Text(
                        text = "Подготовка базы синтезов...",
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                }

                is DbInitState.Copying -> {
                    Text(
                        text = "Первый запуск: распаковка базы (${state.copiedMb} / ${state.totalMb} МБ)",
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        textAlign = TextAlign.Center,
                    )
                    LinearProgressIndicator(
                        progress = { state.progress },
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(8.dp),
                    )
                    Text(
                        text = "Это займёт несколько секунд и больше не повторится",
                        style = MaterialTheme.typography.labelMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                }

                else -> Unit
            }

            Spacer(Modifier.height(8.dp))
        }
    }
}
