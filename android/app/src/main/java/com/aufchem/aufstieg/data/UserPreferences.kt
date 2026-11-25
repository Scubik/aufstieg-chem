package com.aufchem.aufstieg.data

import android.content.Context
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import org.json.JSONArray
import org.json.JSONObject

class UserPreferences(context: Context) {

    private val prefs = context.getSharedPreferences("aufstieg_prefs", Context.MODE_PRIVATE)

    private val _themeMode = MutableStateFlow(loadThemeMode())
    val themeMode: StateFlow<AppThemeMode> = _themeMode.asStateFlow()

    private val _adaptiveDarkDiagrams = MutableStateFlow(
        prefs.getBoolean("adaptive_dark_diagrams", true)
    )
    val adaptiveDarkDiagrams: StateFlow<Boolean> = _adaptiveDarkDiagrams.asStateFlow()

    private val _defaultViewMode = MutableStateFlow(loadDefaultViewMode())
    val defaultViewMode: StateFlow<ViewMode> = _defaultViewMode.asStateFlow()

    private val _favorites = MutableStateFlow(loadFavorites())
    val favorites: StateFlow<Set<String>> = _favorites.asStateFlow()

    private val _completed = MutableStateFlow(loadCompleted())
    val completed: StateFlow<Set<String>> = _completed.asStateFlow()

    private val _history = MutableStateFlow(loadHistory())
    val history: StateFlow<List<HistoryEntry>> = _history.asStateFlow()

    fun setThemeMode(mode: AppThemeMode) {
        _themeMode.value = mode
        prefs.edit().putString("theme_mode", mode.name).apply()
    }

    fun setAdaptiveDarkDiagrams(enabled: Boolean) {
        _adaptiveDarkDiagrams.value = enabled
        prefs.edit().putBoolean("adaptive_dark_diagrams", enabled).apply()
    }

    fun setDefaultViewMode(mode: ViewMode) {
        _defaultViewMode.value = mode
        prefs.edit().putString("default_view_mode", mode.name).apply()
    }

    fun toggleFavorite(path: String) {
        val next = _favorites.value.toMutableSet()
        if (!next.add(path)) next.remove(path)
        _favorites.value = next
        prefs.edit().putStringSet("favorites", next).apply()
    }

    fun toggleCompleted(path: String) {
        val next = _completed.value.toMutableSet()
        if (!next.add(path)) next.remove(path)
        _completed.value = next
        prefs.edit().putStringSet("completed", next).apply()
    }

    fun recordHistory(path: String, stepIndex: Int, totalSteps: Int) {
        val now = System.currentTimeMillis()
        val updated = buildList {
            add(HistoryEntry(path, stepIndex, totalSteps, now))
            for (e in _history.value) {
                if (e.path != path && size < 60) add(e)
            }
        }
        _history.value = updated
        saveHistory(updated)
    }

    fun clearHistory() {
        _history.value = emptyList()
        prefs.edit().remove("history_json").apply()
    }

    private fun loadThemeMode(): AppThemeMode {
        val name = prefs.getString("theme_mode", AppThemeMode.SYSTEM.name)
        return AppThemeMode.entries.firstOrNull { it.name == name } ?: AppThemeMode.SYSTEM
    }

    private fun loadDefaultViewMode(): ViewMode {
        val name = prefs.getString("default_view_mode", ViewMode.FEED.name)
        return ViewMode.entries.firstOrNull { it.name == name } ?: ViewMode.FEED
    }

    private fun loadFavorites(): Set<String> {
        return prefs.getStringSet("favorites", emptySet())?.toSet() ?: emptySet()
    }

    private fun loadCompleted(): Set<String> {
        return prefs.getStringSet("completed", emptySet())?.toSet() ?: emptySet()
    }

    private fun loadHistory(): List<HistoryEntry> {
        val raw = prefs.getString("history_json", null) ?: return emptyList()
        return try {
            val arr = JSONArray(raw)
            buildList {
                for (i in 0 until arr.length()) {
                    val o = arr.getJSONObject(i)
                    add(
                        HistoryEntry(
                            path = o.getString("p"),
                            lastStep = o.optInt("s", 0),
                            totalSteps = o.optInt("t", 0),
                            timestamp = o.optLong("ts", 0L),
                        )
                    )
                }
            }
        } catch (_: Exception) {
            emptyList()
        }
    }

    private fun saveHistory(entries: List<HistoryEntry>) {
        val arr = JSONArray()
        for (e in entries) {
            arr.put(
                JSONObject().apply {
                    put("p", e.path)
                    put("s", e.lastStep)
                    put("t", e.totalSteps)
                    put("ts", e.timestamp)
                }
            )
        }
        prefs.edit().putString("history_json", arr.toString()).apply()
    }
}
