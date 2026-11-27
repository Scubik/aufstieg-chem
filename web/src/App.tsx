import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Atom,
  AtSign,
  Bookmark,
  Compass,
  FlaskConical,
  Moon,
  Search,
  Sun,
  SunMoon,
  X,
} from 'lucide-react';
import type {
  AppSection,
  AppThemeMode,
  CatalogFilter,
  CatalogItem,
  GalaxyId,
  HistoryEntry,
  InorganicChainDetail,
  InorganicChainMeta,
  SequenceModel,
  SortOption,
  ViewMode,
} from './types/models';
import { repository } from './data/cbydRepository';
import { inorganicRepository } from './data/inorganicRepository';
import {
  loadAdaptiveDark,
  loadCompleted,
  loadDefaultViewMode,
  loadFavorites,
  loadHistory,
  loadInorganicCompleted,
  loadInorganicFavorites,
  loadThemeMode,
  saveAdaptiveDark,
  saveCompleted,
  saveDefaultViewMode,
  saveFavorites,
  saveHistory,
  saveInorganicCompleted,
  saveInorganicFavorites,
  saveThemeMode,
} from './data/userPreferences';
import { exportSynthesisPdf } from './pdf/pdfExporter';
import { AufstiegChairLogo } from './components/AufstiegLogo';
import { OverviewScreen } from './screens/OverviewScreen';
import { CatalogScreen } from './screens/CatalogScreen';
import { InorganicCatalogScreen } from './screens/InorganicCatalogScreen';
import { InorganicChainScreen } from './screens/InorganicChainScreen';
import { FavoritesHistoryScreen } from './screens/FavoritesHistoryScreen';
import { ContactsScreen } from './screens/ContactsScreen';
import { SynthesisScreen } from './screens/SynthesisScreen';
import { getTgWebApp, initTelegramApp, syncTelegramChrome } from './utils/telegram';

const HISTORIC_SYNTHESIS_PATHS = [
  'images/Tropinone%20%28Robinson%201917%29',
  'images/Indigo%20%28Baeyer%201882%29',
  'images/Coniine%20%28Ladenberg%201886%29',
  'images/Cubane%20%28Eaton%201964%29',
  'images/Estrone%20%28Torgov%201963%29',
  'images/Menthol%20%28Takasago%201980%29',
  'images/Cantharidin%20%28Dauben%201980%29',
  'images/Prismane%20%28Katz%201973%29',
  'images/Endiandric%20Acid%20C%20%28Nicolaou%201982%29',
];

export const App: React.FC = () => {
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [loadError, setLoadError] = useState<string | null>(null);
  const [allItems, setAllItems] = useState<CatalogItem[]>([]);
  const [inorganicItems, setInorganicItems] = useState<InorganicChainMeta[]>([]);

  const [section, setSection] = useState<AppSection>('overview');
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<CatalogFilter>('all');
  const [sort, setSort] = useState<SortOption>('name_asc');

  const [inorganicQuery, setInorganicQuery] = useState('');
  const [inorganicGalaxy, setInorganicGalaxy] = useState<GalaxyId | 'all'>('all');

  const [themeMode, setThemeMode] = useState<AppThemeMode>(loadThemeMode);
  const [adaptiveDark, setAdaptiveDark] = useState<boolean>(loadAdaptiveDark);
  const [defaultViewMode, setDefaultViewMode] = useState<ViewMode>(loadDefaultViewMode);

  const [favoritesList, setFavoritesList] = useState<string[]>(loadFavorites);
  const [completedList, setCompletedList] = useState<string[]>(loadCompleted);
  const [inorgFavList, setInorgFavList] = useState<string[]>(loadInorganicFavorites);
  const [inorgCompList, setInorgCompList] = useState<string[]>(loadInorganicCompleted);
  const [history, setHistory] = useState<HistoryEntry[]>(loadHistory);

  const [systemDark, setSystemDark] = useState<boolean>(() => {
    const tg = getTgWebApp();
    if (tg?.colorScheme) return tg.colorScheme === 'dark';
    return window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? true;
  });

  const [selectedRandomPath, setSelectedRandomPath] = useState<string | null>(null);
  const [randomScrollReq, setRandomScrollReq] = useState(0);
  const [selectedRandomInorganicId, setSelectedRandomInorganicId] = useState<string | null>(null);
  const [randomInorganicScrollReq, setRandomInorganicScrollReq] = useState(0);

  const [activeItem, setActiveItem] = useState<CatalogItem | null>(null);
  const [seqStack, setSeqStack] = useState<SequenceModel[]>([]);
  const [seqLoading, setSeqLoading] = useState(false);
  const [seqError, setSeqError] = useState<string | null>(null);
  const [isExportingPdf, setIsExportingPdf] = useState(false);

  const [activeChainId, setActiveChainId] = useState<string | null>(null);
  const [activeChain, setActiveChain] = useState<InorganicChainDetail | null>(null);
  const [chainLoading, setChainLoading] = useState(false);
  const [chainError, setChainError] = useState<string | null>(null);

  const [quickSearchOpen, setQuickSearchOpen] = useState(false);
  const [quickSearchQuery, setQuickSearchQuery] = useState('');
  const [toast, setToast] = useState<string | null>(null);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2600);
    return () => clearTimeout(t);
  }, [toast]);

  // Keyboard shortcut Ctrl+K / Cmd+K for global quick search
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setQuickSearchOpen((v) => !v);
      } else if (e.key === 'Escape') {
        setQuickSearchOpen(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  // Telegram & system theme listeners
  useEffect(() => {
    initTelegramApp();
    const mq = window.matchMedia?.('(prefers-color-scheme: dark)');
    const onMqChange = () => {
      const tg = getTgWebApp();
      if (tg?.colorScheme) setSystemDark(tg.colorScheme === 'dark');
      else if (mq) setSystemDark(mq.matches);
    };
    mq?.addEventListener?.('change', onMqChange);
    const tg = getTgWebApp();
    tg?.onEvent?.('themeChanged', onMqChange);
    return () => {
      mq?.removeEventListener?.('change', onMqChange);
      tg?.offEvent?.('themeChanged', onMqChange);
    };
  }, []);

  const isDark = themeMode === 'dark' || (themeMode === 'system' && systemDark);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
    syncTelegramChrome(isDark);
  }, [isDark]);

  const initData = useCallback(async () => {
    setStatus('loading');
    setLoadError(null);
    try {
      const [organic, inorganic] = await Promise.all([
        repository.loadCatalog(),
        inorganicRepository.loadIndex(),
      ]);
      setAllItems(organic);
      setInorganicItems(inorganic);
      setStatus('ready');
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : String(err));
      setStatus('error');
    }
  }, []);

  useEffect(() => {
    initData();
  }, [initData]);

  const favorites = useMemo(() => new Set(favoritesList), [favoritesList]);
  const completed = useMemo(() => new Set(completedList), [completedList]);
  const inorganicFavorites = useMemo(() => new Set(inorgFavList), [inorgFavList]);
  const inorganicCompleted = useMemo(() => new Set(inorgCompList), [inorgCompList]);

  const itemsByPath = useMemo(() => {
    const m = new Map<string, CatalogItem>();
    for (const item of allItems) m.set(item.path, item);
    return m;
  }, [allItems]);

  const inorganicById = useMemo(() => {
    const m = new Map<string, InorganicChainMeta>();
    for (const item of inorganicItems) m.set(item.id, item);
    return m;
  }, [inorganicItems]);

  const drugCount = useMemo(() => allItems.filter((i) => i.isDrug).length, [allItems]);
  const naturalCount = allItems.length - drugCount;

  const filteredCatalog = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = allItems.filter((item) => {
      if (filter === 'drugs' && !item.isDrug) return false;
      if (filter === 'natural' && item.isDrug) return false;
      if (q && !item.searchBlob.includes(q)) return false;
      return true;
    });

    list.sort((a, b) => {
      switch (sort) {
        case 'name_asc':
          return a.displayTitle.localeCompare(b.displayTitle, 'ru');
        case 'year_desc':
          return b.yearInt - a.yearInt || a.displayTitle.localeCompare(b.displayTitle, 'ru');
        case 'year_asc':
          return a.yearInt - b.yearInt || a.displayTitle.localeCompare(b.displayTitle, 'ru');
        case 'author_asc':
          return (
            a.author.localeCompare(b.author, 'ru') ||
            a.displayTitle.localeCompare(b.displayTitle, 'ru')
          );
      }
    });

    return list;
  }, [allItems, query, filter, sort]);

  const featuredOrganic = useMemo(() => {
    const historic = HISTORIC_SYNTHESIS_PATHS.map((p) => itemsByPath.get(p)).filter(
      (x): x is CatalogItem => Boolean(x),
    );
    if (historic.length > 0) return historic;
    return allItems.slice(0, 6);
  }, [allItems, itemsByPath]);

  const quickSearchResults = useMemo(() => {
    const q = quickSearchQuery.trim().toLowerCase();
    if (!q) {
      return {
        inorganic: inorganicItems.slice(0, 6),
        organic: allItems.slice(0, 6),
      };
    }
    const inorg = inorganicItems
      .filter(
        (c) =>
          c.element.toLowerCase().includes(q) ||
          c.title.toLowerCase().includes(q) ||
          c.groupTitle.toLowerCase().includes(q),
      )
      .slice(0, 8);
    const org = allItems.filter((it) => it.searchBlob.includes(q)).slice(0, 12);
    return { inorganic: inorg, organic: org };
  }, [quickSearchQuery, inorganicItems, allItems]);

  const toggleFavorite = useCallback((path: string) => {
    setFavoritesList((prev) => {
      const next = prev.includes(path) ? prev.filter((p) => p !== path) : [...prev, path];
      saveFavorites(next);
      return next;
    });
  }, []);

  const toggleCompleted = useCallback((path: string) => {
    setCompletedList((prev) => {
      const next = prev.includes(path) ? prev.filter((p) => p !== path) : [...prev, path];
      saveCompleted(next);
      return next;
    });
  }, []);

  const toggleInorganicFavorite = useCallback((id: string) => {
    setInorgFavList((prev) => {
      const next = prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id];
      saveInorganicFavorites(next);
      return next;
    });
  }, []);

  const toggleInorganicCompleted = useCallback((id: string) => {
    setInorgCompList((prev) => {
      const next = prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id];
      saveInorganicCompleted(next);
      return next;
    });
  }, []);

  const recordHistory = useCallback((path: string, lastStep: number, totalSteps: number) => {
    setHistory((prev) => {
      const filtered = prev.filter((e) => e.path !== path);
      const next: HistoryEntry[] = [
        { path, lastStep, totalSteps, timestamp: Date.now() },
        ...filtered,
      ].slice(0, 60);
      saveHistory(next);
      return next;
    });
  }, []);

  const clearHistory = useCallback(() => {
    setHistory([]);
    saveHistory([]);
    showToast('История просмотров очищена');
  }, [showToast]);

  const handleThemeChange = (mode: AppThemeMode) => {
    setThemeMode(mode);
    saveThemeMode(mode);
  };

  const handleAdaptiveDarkChange = (v: boolean) => {
    setAdaptiveDark(v);
    saveAdaptiveDark(v);
  };

  const handleDefaultViewChange = (v: ViewMode) => {
    setDefaultViewMode(v);
    saveDefaultViewMode(v);
  };

  const openSynthesis = useCallback(
    async (item: CatalogItem) => {
      setActiveChainId(null);
      setActiveChain(null);
      setActiveItem(item);
      setSeqStack([]);
      setSeqError(null);
      setSeqLoading(true);
      try {
        const seq = await repository.loadSequence(item.path);
        if (!seq) {
          setSeqError('Схема синтеза не найдена в данных.');
        } else {
          setSeqStack([seq]);
          recordHistory(item.path, 0, seq.steps.length);
        }
      } catch (err) {
        setSeqError(err instanceof Error ? err.message : String(err));
      } finally {
        setSeqLoading(false);
      }
    },
    [recordHistory],
  );

  const openInorganicChain = useCallback(async (chainId: string) => {
    setActiveItem(null);
    setSeqStack([]);
    setActiveChainId(chainId);
    setActiveChain(null);
    setChainError(null);
    setChainLoading(true);
    try {
      const detail = await inorganicRepository.loadChain(chainId);
      setActiveChain(detail);
    } catch (err) {
      setChainError(err instanceof Error ? err.message : String(err));
    } finally {
      setChainLoading(false);
    }
  }, []);

  const handleBackFromSynthesis = useCallback(() => {
    if (seqStack.length > 1) {
      setSeqStack((prev) => prev.slice(0, -1));
    } else {
      setActiveItem(null);
      setSeqStack([]);
      setSeqError(null);
    }
  }, [seqStack.length]);

  const handleBackFromChain = useCallback(() => {
    setActiveChainId(null);
    setActiveChain(null);
    setChainError(null);
  }, []);

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
    }
    if (activeChainId) {
      bb.show();
      bb.onClick(handleBackFromChain);
      return () => {
        bb.offClick(handleBackFromChain);
        bb.hide();
      };
    }
    bb.hide();
  }, [activeItem, activeChainId, handleBackFromSynthesis, handleBackFromChain]);

  const handleSelectRandomOrganic = () => {
    const pool = filteredCatalog.length > 0 ? filteredCatalog : allItems;
    if (pool.length === 0) return;
    const pick = pool[Math.floor(Math.random() * pool.length)];
    if (section === 'organic') {
      setSelectedRandomPath(pick.path);
      setRandomScrollReq((n) => n + 1);
      showToast(`Выбран синтез: ${pick.displayTitle}`);
    } else {
      openSynthesis(pick);
    }
  };

  const handleSelectRandomInorganic = () => {
    const q = inorganicQuery.trim().toLowerCase();
    const filteredPool = inorganicItems.filter((item) => {
      if (inorganicGalaxy !== 'all' && item.galaxyId !== inorganicGalaxy) return false;
      if (!q) return true;
      return (
        item.element.toLowerCase().includes(q) ||
        item.title.toLowerCase().includes(q) ||
        item.groupTitle.toLowerCase().includes(q)
      );
    });
    const pool = filteredPool.length > 0 ? filteredPool : inorganicItems;
    if (pool.length === 0) return;
    const pick = pool[Math.floor(Math.random() * pool.length)];
    if (section === 'inorganic') {
      setSelectedRandomInorganicId(pick.id);
      setRandomInorganicScrollReq((n) => n + 1);
      showToast(`Выбран элемент: ${pick.title}`);
    } else {
      openInorganicChain(pick.id);
    }
  };

  const handleExportPdf = async (revealed: Set<number>) => {
    const seq = seqStack[seqStack.length - 1];
    if (!seq || !activeItem) return;
    setIsExportingPdf(true);
    try {
      await exportSynthesisPdf(activeItem, seq, revealed);
      showToast(`PDF сохранён: ${activeItem.displayTitle}`);
    } catch (err) {
      showToast(`Ошибка PDF: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setIsExportingPdf(false);
    }
  };

  if (status === 'loading') {
    return (
      <div className="app-shell">
        <div className="center-screen">
          <div className="spinner" />
          <div style={{ fontSize: 15, color: 'var(--on-surface-variant)' }}>
            Загрузка каталога синтезов и элементов…
          </div>
        </div>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="app-shell">
        <div className="center-screen">
          <div style={{ fontSize: 19, fontWeight: 600 }}>Не удалось загрузить данные</div>
          <div style={{ fontSize: 13.5, color: 'var(--error)' }}>{loadError}</div>
          <button type="button" className="btn-primary" style={{ maxWidth: 200 }} onClick={initData}>
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

  if (activeChainId) {
    return (
      <>
        <InorganicChainScreen
          chain={activeChain}
          isLoading={chainLoading}
          error={chainError}
          isFavorite={inorganicFavorites.has(activeChainId)}
          isCompleted={inorganicCompleted.has(activeChainId)}
          onBack={handleBackFromChain}
          onToggleFavorite={() => toggleInorganicFavorite(activeChainId)}
          onToggleCompleted={() => toggleInorganicCompleted(activeChainId)}
        />
        {toast && <div className="toast">{toast}</div>}
      </>
    );
  }

  const navItems: Array<{ id: AppSection; label: string; icon: React.ReactNode }> = [
    { id: 'overview', label: 'Обзор', icon: <Compass size={16} /> },
    { id: 'organic', label: 'Органика', icon: <FlaskConical size={16} /> },
    { id: 'inorganic', label: 'Неорганика', icon: <Atom size={16} /> },
    { id: 'collection', label: 'Коллекция', icon: <Bookmark size={16} /> },
    { id: 'contacts', label: 'Контакты', icon: <AtSign size={16} /> },
  ];

  return (
    <div className="app-shell">
      <header className="site-header">
        <div className="site-header-inner">
          <button
            type="button"
            className="brand-btn"
            onClick={() => setSection('overview')}
          >
            <span className="brand-mark">
              <AufstiegChairLogo strokeColor="#FFFFFF" flagColor="#BAE6FD" />
            </span>
            <span className="brand-text-col">
              <span className="brand-title">Aufstieg | Химия</span>
              <span className="brand-sub">Органика · Неорганика</span>
            </span>
          </button>

          <nav className="site-nav" aria-label="Основная навигация">
            {navItems.map((n) => (
              <button
                key={n.id}
                type="button"
                className={`site-nav-btn ${section === n.id ? 'active' : ''}`}
                onClick={() => setSection(n.id)}
              >
                {n.icon}
                <span>{n.label}</span>
              </button>
            ))}
          </nav>

          <div className="header-actions">
            <button
              type="button"
              className="global-search-trigger"
              onClick={() => setQuickSearchOpen(true)}
              aria-label="Быстрый поиск"
            >
              <Search size={15} />
              <span>Поиск…</span>
              <span className="kbd-hint">Ctrl+K</span>
            </button>

            <button
              type="button"
              className="icon-btn"
              onClick={() => {
                const next: AppThemeMode =
                  themeMode === 'dark' ? 'light' : themeMode === 'light' ? 'system' : 'dark';
                handleThemeChange(next);
              }}
              aria-label="Сменить тему"
              title="Сменить тему"
            >
              {themeMode === 'system' ? (
                <SunMoon size={18} />
              ) : themeMode === 'light' ? (
                <Sun size={18} />
              ) : (
                <Moon size={18} />
              )}
            </button>
          </div>
        </div>
      </header>

      <div className="main-content">
        {section === 'overview' && (
          <OverviewScreen
            organicCount={allItems.length}
            inorganicItems={inorganicItems}
            featuredOrganic={featuredOrganic}
            favorites={favorites}
            completed={completed}
            isDark={isDark}
            adaptiveDark={adaptiveDark}
            onSelectGalaxy={(galaxyId) => {
              setInorganicGalaxy(galaxyId);
              setSection('inorganic');
            }}
            onOpenInorganicChain={openInorganicChain}
            onGoOrganic={() => setSection('organic')}
            onGoInorganic={() => setSection('inorganic')}
            onRandomOrganic={handleSelectRandomOrganic}
            onRandomInorganic={handleSelectRandomInorganic}
            onOpenOrganicItem={openSynthesis}
            onToggleOrganicFavorite={toggleFavorite}
            onToggleOrganicCompleted={toggleCompleted}
          />
        )}

        {section === 'organic' && (
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
            isDark={isDark}
            adaptiveDark={adaptiveDark}
            selectedRandomPath={selectedRandomPath}
            randomScrollRequest={randomScrollReq}
            onQueryChange={setQuery}
            onFilterChange={setFilter}
            onSortChange={setSort}
            onToggleFavorite={toggleFavorite}
            onToggleCompleted={toggleCompleted}
            onOpenItem={openSynthesis}
            onSelectRandom={handleSelectRandomOrganic}
          />
        )}

        {section === 'inorganic' && (
          <InorganicCatalogScreen
            items={inorganicItems}
            query={inorganicQuery}
            activeGalaxy={inorganicGalaxy}
            favorites={inorganicFavorites}
            completed={inorganicCompleted}
            isDark={isDark}
            selectedRandomId={selectedRandomInorganicId}
            randomScrollRequest={randomInorganicScrollReq}
            onQueryChange={setInorganicQuery}
            onGalaxyChange={setInorganicGalaxy}
            onToggleFavorite={toggleInorganicFavorite}
            onToggleCompleted={toggleInorganicCompleted}
            onOpenChain={openInorganicChain}
            onSelectRandom={handleSelectRandomInorganic}
          />
        )}

        {section === 'collection' && (
          <FavoritesHistoryScreen
            itemsByPath={itemsByPath}
            inorganicById={inorganicById}
            favorites={favorites}
            completed={completed}
            inorganicFavorites={inorganicFavorites}
            inorganicCompleted={inorganicCompleted}
            history={history}
            isDark={isDark}
            adaptiveDark={adaptiveDark}
            onToggleFavorite={toggleFavorite}
            onToggleCompleted={toggleCompleted}
            onToggleInorganicFavorite={toggleInorganicFavorite}
            onToggleInorganicCompleted={toggleInorganicCompleted}
            onClearHistory={clearHistory}
            onOpenItem={openSynthesis}
            onOpenInorganicChain={openInorganicChain}
          />
        )}

        {section === 'contacts' && (
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

      <nav className="mobile-bottom-nav" aria-label="Мобильная навигация">
        {navItems.map((n) => (
          <button
            key={n.id}
            type="button"
            className={`mobile-nav-item ${section === n.id ? 'active' : ''}`}
            onClick={() => setSection(n.id)}
          >
            {n.icon}
            <span>{n.label}</span>
          </button>
        ))}
      </nav>

      {quickSearchOpen && (
        <div
          className="quick-search-backdrop"
          onClick={() => setQuickSearchOpen(false)}
        >
          <div
            className="quick-search-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="quick-search-head">
              <Search size={18} color="var(--primary)" />
              <input
                autoFocus
                type="text"
                value={quickSearchQuery}
                onChange={(e) => setQuickSearchQuery(e.target.value)}
                placeholder="Быстрый поиск по синтезам и химическим элементам…"
              />
              <button
                type="button"
                className="icon-btn"
                style={{ width: 32, height: 32 }}
                onClick={() => setQuickSearchOpen(false)}
                aria-label="Закрыть поиск"
              >
                <X size={16} />
              </button>
            </div>

            <div className="quick-search-results">
              {quickSearchResults.inorganic.length > 0 && (
                <>
                  <div className="section-title" style={{ padding: '6px 8px 2px' }}>
                    Неорганика
                  </div>
                  {quickSearchResults.inorganic.map((ch) => (
                    <button
                      key={ch.id}
                      type="button"
                      className="quick-search-item"
                      onClick={() => {
                        setQuickSearchOpen(false);
                        openInorganicChain(ch.id);
                      }}
                    >
                      <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span className="stage-pill mono">{ch.element}</span>
                        <span style={{ fontWeight: 600 }}>{ch.title}</span>
                      </span>
                      <span style={{ fontSize: 12, color: 'var(--on-surface-variant)' }}>
                        {ch.xCount} X
                      </span>
                    </button>
                  ))}
                </>
              )}

              {quickSearchResults.organic.length > 0 && (
                <>
                  <div className="section-title" style={{ padding: '10px 8px 2px' }}>
                    Органические синтезы
                  </div>
                  {quickSearchResults.organic.map((it) => (
                    <button
                      key={it.path}
                      type="button"
                      className="quick-search-item"
                      onClick={() => {
                        setQuickSearchOpen(false);
                        openSynthesis(it);
                      }}
                    >
                      <span style={{ fontWeight: 600, textAlign: 'left' }}>{it.displayTitle}</span>
                      <span style={{ fontSize: 12, color: 'var(--on-surface-variant)', flexShrink: 0 }}>
                        {[it.author, it.year].filter(Boolean).join(' · ')}
                      </span>
                    </button>
                  ))}
                </>
              )}

              {quickSearchResults.inorganic.length === 0 &&
                quickSearchResults.organic.length === 0 && (
                  <div style={{ padding: 24, textAlign: 'center', color: 'var(--on-surface-variant)' }}>
                    Ничего не найдено
                  </div>
                )}
            </div>
          </div>
        </div>
      )}

      {toast && <div className="toast">{toast}</div>}
    </div>
  );
};
