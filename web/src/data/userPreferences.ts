import type { AppThemeMode, HistoryEntry, ViewMode } from '../types/models';

const KEYS = {
  theme: 'aufstieg_theme_mode',
  adaptiveDark: 'aufstieg_adaptive_dark',
  viewMode: 'aufstieg_default_view',
  favorites: 'aufstieg_favorites',
  completed: 'aufstieg_completed',
  history: 'aufstieg_history',
} as const;

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeJson(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore quota errors
  }
}

export function loadThemeMode(): AppThemeMode {
  const val = localStorage.getItem(KEYS.theme);
  if (val === 'light' || val === 'dark' || val === 'system') return val;
  return 'system';
}

export function saveThemeMode(mode: AppThemeMode): void {
  localStorage.setItem(KEYS.theme, mode);
}

export function loadAdaptiveDark(): boolean {
  const val = localStorage.getItem(KEYS.adaptiveDark);
  return val === null ? true : val === 'true';
}

export function saveAdaptiveDark(enabled: boolean): void {
  localStorage.setItem(KEYS.adaptiveDark, String(enabled));
}

export function loadDefaultViewMode(): ViewMode {
  const val = localStorage.getItem(KEYS.viewMode);
  return val === 'canvas' ? 'canvas' : 'feed';
}

export function saveDefaultViewMode(mode: ViewMode): void {
  localStorage.setItem(KEYS.viewMode, mode);
}

export function loadFavorites(): string[] {
  return readJson<string[]>(KEYS.favorites, []);
}

export function saveFavorites(list: string[]): void {
  writeJson(KEYS.favorites, list);
}

export function loadCompleted(): string[] {
  return readJson<string[]>(KEYS.completed, []);
}

export function saveCompleted(list: string[]): void {
  writeJson(KEYS.completed, list);
}

export function loadHistory(): HistoryEntry[] {
  return readJson<HistoryEntry[]>(KEYS.history, []);
}

export function saveHistory(list: HistoryEntry[]): void {
  writeJson(KEYS.history, list.slice(0, 60));
}
