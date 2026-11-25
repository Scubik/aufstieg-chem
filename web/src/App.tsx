import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { AtSign, Bookmark, FlaskConical } from 'lucide-react';
import type {
  AppThemeMode,
  CatalogFilter,
  CatalogItem,
  HistoryEntry,
  SequenceModel,
  SortOption,
  ViewMode,
} from './types/models';
import { repository } from './data/cbydRepository';
import {
  loadAdaptiveDark,
  loadCompleted,
  loadDefaultViewMode,
  loadFavorites,
  loadHistory,
  loadThemeMode,
  saveAdaptiveDark,
  saveCompleted,
  saveDefaultViewMode,
  saveFavorites,
  saveHistory,
  saveThemeMode,
} from './data/userPreferences';
import { exportSynthesisPdf } from './pdf/pdfExporter';
import { AufstiegChairLogo } from './components/AufstiegLogo';
import { CatalogScreen } from './screens/CatalogScreen';
import { FavoritesHistoryScreen } from './screens/FavoritesHistoryScreen';
import { ContactsScreen } from './screens/ContactsScreen';
import { SynthesisScreen } from './screens/SynthesisScreen';
import { getTgWebApp, initTelegramApp, syncTelegramChrome } from './utils/telegram';

export const App: React.FC = () => {
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [loadError, setLoadError] = useState<string | null>(null);
  const [allItems, setAllItems] = useState<CatalogItem[]>([]);

  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<CatalogFilter>('all');
  const [sort, setSort] = useState<SortOption>('name_asc');
  const [currentTab, setCurrentTab] = useState<0 | 1 | 2>(0);

  const [themeMode, setThemeMode] = useState<AppThemeMode>(loadThemeMode);
  const [adaptiveDark, setAdaptiveDark] = useState<boolean>(loadAdaptiveDark);
  const [defaultViewMode, setDefaultViewMode] = useState<ViewMode>(loadDefaultViewMode);
  const [favoritesList, setFavoritesList] = useState<string[]>(loadFavorites);
  const [completedList, setCompletedList] = useState<string[]>(loadCompleted);
  const [history, setHistory] = useState<HistoryEntry[]>(loadHistory);

  const [systemDark, setSystemDark] = useState<boolean>(() => {
    const tg = getTgWebApp();
    if (tg?.colorScheme) return tg.colorScheme === 'dark';
    return window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false;
  });

  const [selectedRandomPath, setSelectedRandomPath] = useState<string | null>(null);
  const [randomScrollReq, setRandomScrollReq] = useState(0);

  const [activeItem, setActiveItem] = useState<CatalogItem | null>(null);
  const [seqStack, setSeqStack] = useState<SequenceModel[]>([]);
  const [seqLoading, setSeqLoading] = useState(false);
  const [seqError, setSeqError] = useState<string | null>(null);
  const [isExportingPdf, setIsExportingPdf] = useState(false);

  const [toast, setToast] = useState<string | null>(null);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2600);
    return () => clearTimeout(t);
  }, [toast]);

  // Telegram & system theme listeners
  useEffect(() => {
    initTelegramApp();
    const mq = window.matchMedia?.('(prefers-color-scheme: dark)');
    const onMqChange = () => {
      const tg = getTgWebApp();
      if (tg?.colorScheme) setSystemDark(tg.colorScheme === 'dark');
      else if (mq) setSystemDark(mq.matches);
    };
    mq?.addEventListener('change', onMqChange);
    getTgWebApp()?.onEvent?.('themeChanged', onMqChange);
    return () => {
      mq?.removeEventListener('change', onMqChange);
      getTgWebApp()?.offEvent?.('themeChanged', onMqChange);
    };
  }, []);

  const isDark = themeMode === 'dark' || (themeMode === 'system' && systemDark);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
    syncTelegramChrome(isDark);
  }, [isDark]);

  // Load catalog
  const initCatalog = useCallback(async () => {
    setStatus('loading');
    setLoadError(null);
    try {
      const items = await repository.loadCatalog();
      setAllItems(items);
      setStatus('ready');
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : 'Ошибка загрузки каталога');
      setStatus('error');
    }
  }, []);

  useEffect(() => {
    initCatalog();
  }, [initCatalog]);

  const itemsByPath = useMemo(() => {
    const map = new Map<string, CatalogItem>();
    for (const it of allItems) map.set(it.path, it);
    return map;
  }, [allItems]);

  const drugCount = useMemo(() => allItems.filter((i) => i.isDrug).length, [allItems]);
  const naturalCount = allItems.length - drugCount;

  const favorites = useMemo(() => new Set(favoritesList), [favoritesList]);
  const completed = useMemo(() => new Set(completedList), [completedList]);

  const filteredCatalog = useMemo(() => {
    const trimmed = query.trim().toLowerCase();
    const tokens = trimmed ? trimmed.split(/\s+/).filter(Boolean) : [];

    const filtered = allItems.filter((item) => {
      if (filter === 'drugs' && !item.isDrug) return false;
      if (filter === 'natural' && item.isDrug) return false;
      if (tokens.length === 0) return true;
      return tokens.every((tok) => item.searchBlob.includes(tok));
    });

    const sorted = [...filtered];
    if (sort === 'name_asc') {
      sorted.sort((a, b) => a.displayTitle.toLowerCase().localeCompare(b.displayTitle.toLowerCase()));
    } else if (sort === 'year_desc') {
      sorted.sort(
        (a, b) =>
          b.yearInt - a.yearInt ||
          a.displayTitle.toLowerCase().localeCompare(b.displayTitle.toLowerCase()),
      );
    } else if (sort === 'year_asc') {
      sorted.sort(
        (a, b) =>
          (a.yearInt || 9999) - (b.yearInt || 9999) ||
          a.displayTitle.toLowerCase().localeCompare(b.displayTitle.toLowerCase()),
      );
    } else if (sort === 'author_asc') {
      sorted.sort(
        (a, b) =>
          (a.author.toLowerCase() || 'zzz').localeCompare(b.author.toLowerCase() || 'zzz') ||
          a.displayTitle.toLowerCase().localeCompare(b.displayTitle.toLowerCase()),
      );
    }
    return sorted;
  }, [allItems, query, filter, sort]);

  const handleThemeChange = (m: AppThemeMode) => {
    setThemeMode(m);
    saveThemeMode(m);
  };

  const handleAdaptiveDarkChange = (v: boolean) => {
    setAdaptiveDark(v);
    saveAdaptiveDark(v);
  };

  const handleDefaultViewChange = (v: ViewMode) => {
    setDefaultViewMode(v);
    saveDefaultViewMode(v);
  };

  const toggleFavorite = (path: string) => {
    setFavoritesList((prev) => {
      const next = prev.includes(path) ? prev.filter((p) => p !== path) : [...prev, path];
      saveFavorites(next);
      return next;
    });
  };

  const toggleCompleted = (path: string) => {
    setCompletedList((prev) => {
      const next = prev.includes(path) ? prev.filter((p) => p !== path) : [...prev, path];
      saveCompleted(next);
      return next;
    });
  };

  const recordHistory = (path: string, lastStep: number, totalSteps: number) => {
    setHistory((prev) => {
      const filtered = prev.filter((h) => h.path !== path);
      const next: HistoryEntry[] = [
        { path, lastStep, totalSteps, timestamp: Date.now() },
        ...filtered,
      ].slice(0, 60);
      saveHistory(next);
      return next;
    });
  };

  const clearHistory = () => {
    setHistory([]);
    saveHistory([]);
  };

  const openSynthesis = async (item: CatalogItem) => {
    setActiveItem(item);
    setSeqStack([]);
    setSeqError(null);
    setSeqLoading(true);
    try {
      const seq = await repository.loadSequence(item.path);
      if (!seq) {
        setSeqError('Синтез не найден в базе данных.');
      } else {
        recordHistory(item.path, 0, seq.steps.length);
        setSeqStack([seq]);
      }
    } catch (e) {
      setSeqError(
        `Не удалось загрузить синтез: ${e instanceof Error ? e.message : 'неизвестная ошибка'}`,
      );
    } finally {
      setSeqLoading(false);
    }
  };

  const handleBackFromSynthesis = useCallback(() => {
    if (seqStack.length > 1) {
      setSeqStack((prev) => prev.slice(0, -1));
    } else {
      setActiveItem(null);
      setSeqStack([]);
      setSeqError(null);
    }
  }, [seqStack.length]);

  // Telegram native BackButton integration
  useEffect(() => {
    const bb = getTgWebApp()?.BackButton;
    if (!bb) return;
    if (activeItem) {
      bb.show();
      bb.onClick(handleBackFromSynthesis);
      return () => {
        bb.offClick(handleBackFromSynthesis);
        bb.hide();
      };
    } else {
      bb.hide();
    }
  }, [activeItem, handleBackFromSynthesis]);

  const handleSelectRandom = () => {
    if (filteredCatalog.length === 0) return;
    let pick = filteredCatalog[Math.floor(Math.random() * filteredCatalog.length)];
    if (filteredCatalog.length > 1 && pick.path === selectedRandomPath) {
      const idx = filteredCatalog.indexOf(pick);
      pick = filteredCatalog[(idx + 1) % filteredCatalog.length];
    }
    setSelectedRandomPath(pick.path);
    setRandomScrollReq((n) => n + 1);
  };

  const handleExportPdf = async (revealed: Set<number>) => {
    const activeSeq = seqStack[seqStack.length - 1];
    if (!activeItem || !activeSeq || isExportingPdf) return;
    setIsExportingPdf(true);
    try {
      await exportSynthesisPdf(activeItem, activeSeq, revealed);
      showToast('PDF-флешкарта сохранена');
    } catch (e) {
      showToast(`Ошибка создания PDF: ${e instanceof Error ? e.message : 'ошибка'}`);
    } finally {
      setIsExportingPdf(false);
    }
  };

  if (status === 'loading') {
    return (
      <div className="app-shell">
        <div className="center-screen">
          <div className="setup-logo-box">
            <AufstiegChairLogo strokeColor="var(--primary)" flagColor="var(--primary)" />
          </div>
          <div style={{ fontSize: 22, fontWeight: 700 }}>Aufstieg | Химия</div>
          <div className="spinner" />
          <div style={{ fontSize: 13.5, color: 'var(--on-surface-variant)' }}>
            Загрузка каталога синтезов...
          </div>
        </div>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="app-shell">
        <div className="center-screen">
          <div style={{ fontSize: 19, fontWeight: 600 }}>Не удалось загрузить каталог</div>
          <div style={{ fontSize: 13.5, color: 'var(--error)' }}>{loadError}</div>
          <button type="button" className="btn-primary" style={{ maxWidth: 200 }} onClick={initCatalog}>
            Повторить
          </button>
        </div>
      </div>
    );
  }

  if (activeItem) {
    const activeSeq = seqStack[seqStack.length - 1] ?? null;
    return (
      <>
        <SynthesisScreen
          item={activeItem}
          activeSeq={activeSeq}
          isInSubsequence={seqStack.length > 1}
          isLoading={seqLoading}
          error={seqError}
          isExportingPdf={isExportingPdf}
          defaultViewMode={defaultViewMode}
          isFavorite={favorites.has(activeItem.path)}
          isCompleted={completed.has(activeItem.path)}
          isDark={isDark}
          adaptiveDark={adaptiveDark}
          onBack={handleBackFromSynthesis}
          onToggleFavorite={() => toggleFavorite(activeItem.path)}
          onToggleCompleted={() => toggleCompleted(activeItem.path)}
          onExportPdf={handleExportPdf}
          onPushSubsequence={(sub) => setSeqStack((prev) => [...prev, sub])}
          onStepChanged={(stepIdx) => {
            const root = seqStack[0];
            if (seqStack.length === 1 && root) {
              recordHistory(activeItem.path, stepIdx, root.steps.length);
            }
          }}
        />
        {toast && <div className="toast">{toast}</div>}
      </>
    );
  }

  return (
    <div className="app-shell">
      <div className="main-content">
        {currentTab === 0 && (
          <CatalogScreen
            items={filteredCatalog}
            totalCount={allItems.length}
            drugCount={drugCount}
            naturalCount={naturalCount}
            query={query}
            filter={filter}
            sort={sort}
            favorites={favorites}
            completed={completed}
            themeMode={themeMode}
            isDark={isDark}
            adaptiveDark={adaptiveDark}
            selectedRandomPath={selectedRandomPath}
            randomScrollRequest={randomScrollReq}
            onQueryChange={setQuery}
            onFilterChange={setFilter}
            onSortChange={setSort}
            onCycleTheme={() => {
              const next: AppThemeMode =
                themeMode === 'system' ? 'light' : themeMode === 'light' ? 'dark' : 'system';
              handleThemeChange(next);
            }}
            onToggleFavorite={toggleFavorite}
            onToggleCompleted={toggleCompleted}
            onOpenItem={openSynthesis}
            onSelectRandom={handleSelectRandom}
          />
        )}

        {currentTab === 1 && (
          <FavoritesHistoryScreen
            itemsByPath={itemsByPath}
            favorites={favorites}
            completed={completed}
            history={history}
            isDark={isDark}
            adaptiveDark={adaptiveDark}
            onToggleFavorite={toggleFavorite}
            onToggleCompleted={toggleCompleted}
            onClearHistory={clearHistory}
            onOpenItem={openSynthesis}
          />
        )}

        {currentTab === 2 && (
          <ContactsScreen
            themeMode={themeMode}
            adaptiveDark={adaptiveDark}
            defaultViewMode={defaultViewMode}
            onThemeModeChange={handleThemeChange}
            onAdaptiveDarkChange={handleAdaptiveDarkChange}
            onDefaultViewModeChange={handleDefaultViewChange}
            onShowMessage={showToast}
          />
        )}
      </div>

      <nav className="bottom-nav" aria-label="Основная навигация">
        <button
          type="button"
          className={`nav-item ${currentTab === 0 ? 'active' : ''}`}
          onClick={() => setCurrentTab(0)}
        >
          <span className="nav-pill">
            <FlaskConical size={20} />
          </span>
          <span>Синтезы</span>
        </button>

        <button
          type="button"
          className={`nav-item ${currentTab === 1 ? 'active' : ''}`}
          onClick={() => setCurrentTab(1)}
        >
          <span className="nav-pill">
            <Bookmark size={20} />
          </span>
          <span>Коллекция</span>
        </button>

        <button
          type="button"
          className={`nav-item ${currentTab === 2 ? 'active' : ''}`}
          onClick={() => setCurrentTab(2)}
        >
          <span className="nav-pill">
            <AtSign size={20} />
          </span>
          <span>Контакты</span>
        </button>
      </nav>

      {toast && <div className="toast">{toast}</div>}
    </div>
  );
};
