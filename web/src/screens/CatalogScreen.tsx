import React, { useEffect, useRef, useState } from 'react';
import {
  ArrowUpDown,
  Dices,
  Moon,
  Pill,
  Search,
  Sun,
  SunMoon,
  X,
} from 'lucide-react';
import type { AppThemeMode, CatalogFilter, CatalogItem, SortOption } from '../types/models';
import { AufstiegChairLogo } from '../components/AufstiegLogo';
import { CatalogCard } from '../components/CatalogCard';
import { hapticLight } from '../utils/telegram';

interface CatalogScreenProps {
  items: CatalogItem[];
  totalCount: number;
  drugCount: number;
  naturalCount: number;
  query: string;
  filter: CatalogFilter;
  sort: SortOption;
  favorites: Set<string>;
  completed: Set<string>;
  themeMode: AppThemeMode;
  isDark: boolean;
  adaptiveDark: boolean;
  selectedRandomPath: string | null;
  randomScrollRequest: number;
  onQueryChange: (q: string) => void;
  onFilterChange: (f: CatalogFilter) => void;
  onSortChange: (s: SortOption) => void;
  onCycleTheme: () => void;
  onToggleFavorite: (path: string) => void;
  onToggleCompleted: (path: string) => void;
  onOpenItem: (item: CatalogItem) => void;
  onSelectRandom: () => void;
}

const PAGE_STEP = 60;

export const CatalogScreen: React.FC<CatalogScreenProps> = ({
  items,
  totalCount,
  drugCount,
  naturalCount,
  query,
  filter,
  sort,
  favorites,
  completed,
  themeMode,
  isDark,
  adaptiveDark,
  selectedRandomPath,
  randomScrollRequest,
  onQueryChange,
  onFilterChange,
  onSortChange,
  onCycleTheme,
  onToggleFavorite,
  onToggleCompleted,
  onOpenItem,
  onSelectRandom,
}) => {
  const [visibleCount, setVisibleCount] = useState(PAGE_STEP);
  const [sortOpen, setSortOpen] = useState(false);
  const [menuPos, setMenuPos] = useState<{ top: number; left: number }>({ top: 180, left: 16 });
  const sortBtnRef = useRef<HTMLButtonElement | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);
  const cardRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const lastHandledReq = useRef(0);

  useEffect(() => {
    setVisibleCount(PAGE_STEP);
  }, [query, filter, sort]);

  useEffect(() => {
    if (randomScrollRequest > lastHandledReq.current && selectedRandomPath) {
      lastHandledReq.current = randomScrollRequest;
      const idx = items.findIndex((it) => it.path === selectedRandomPath);
      if (idx >= 0) {
        if (idx >= visibleCount) {
          setVisibleCount(idx + 20);
        }
        requestAnimationFrame(() => {
          const targetEl = cardRefs.current.get(selectedRandomPath);
          targetEl?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        });
      }
    }
  }, [randomScrollRequest, selectedRandomPath, items, visibleCount]);

  const handleScroll = () => {
    const el = listRef.current;
    if (!el) return;
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 400) {
      if (visibleCount < items.length) {
        setVisibleCount((c) => Math.min(items.length, c + PAGE_STEP));
      }
    }
  };

  const openSortMenu = () => {
    const rect = sortBtnRef.current?.getBoundingClientRect();
    if (rect) {
      setMenuPos({
        top: rect.bottom + 6,
        left: Math.min(window.innerWidth - 226, Math.max(16, rect.left)),
      });
    }
    setSortOpen((v) => !v);
  };

  const sortLabel =
    sort === 'name_asc'
      ? 'А→Я'
      : sort === 'year_desc'
        ? 'Новые'
        : sort === 'year_asc'
          ? 'Старые'
          : 'Автор';

  const visibleItems = items.slice(0, visibleCount);

  return (
    <div className="catalog-wrap">
      <div className="top-header">
        <div className="brand-row">
          <div className="brand-badge">
            <AufstiegChairLogo strokeColor="var(--primary)" flagColor="var(--primary)" />
          </div>
          <div>
            <div className="brand-title">Aufstieg | Химия</div>
            <div className="brand-sub">
              Показано {items.length} из {totalCount} синтезов
            </div>
          </div>
        </div>

        <button
          type="button"
          className="icon-circle-btn"
          onClick={() => {
            hapticLight();
            onCycleTheme();
          }}
          aria-label="Сменить тему"
          title="Сменить тему"
        >
          {themeMode === 'system' ? (
            <SunMoon size={20} />
          ) : themeMode === 'light' ? (
            <Sun size={20} />
          ) : (
            <Moon size={20} />
          )}
        </button>
      </div>

      <div className="search-box-wrap">
        <div className="search-box">
          <Search size={19} color="var(--on-surface-variant)" style={{ flexShrink: 0 }} />
          <input
            type="search"
            className="search-input"
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            placeholder="Поиск молекулы, автора, года, препарата..."
            enterKeyHint="search"
          />
          {query && (
            <button type="button" onClick={() => onQueryChange('')} aria-label="Очистить">
              <X size={18} color="var(--on-surface-variant)" />
            </button>
          )}
        </div>
      </div>

      <div className="chips-row">
        <button
          type="button"
          className={`chip-btn ${filter === 'all' ? 'selected' : ''}`}
          onClick={() => onFilterChange('all')}
        >
          Все ({totalCount})
        </button>
        <button
          type="button"
          className={`chip-btn ${filter === 'drugs' ? 'selected' : ''}`}
          onClick={() => onFilterChange('drugs')}
        >
          <Pill size={15} />
          Лекарства ({drugCount})
        </button>
        <button
          type="button"
          className={`chip-btn ${filter === 'natural' ? 'selected' : ''}`}
          onClick={() => onFilterChange('natural')}
        >
          Природные ({naturalCount})
        </button>

        <button
          ref={sortBtnRef}
          type="button"
          className={`chip-btn ${sort !== 'name_asc' ? 'selected-secondary' : ''}`}
          onClick={openSortMenu}
        >
          <ArrowUpDown size={15} />
          {sortLabel}
        </button>
      </div>

      {sortOpen && (
        <>
          <div
            style={{ position: 'fixed', inset: 0, zIndex: 35 }}
            onClick={() => setSortOpen(false)}
          />
          <div className="dropdown-menu" style={{ top: menuPos.top, left: menuPos.left }}>
            {[
              ['name_asc', 'По названию (А→Я)'],
              ['year_desc', 'Сначала новые'],
              ['year_asc', 'Сначала старые'],
              ['author_asc', 'По автору (А→Я)'],
            ].map(([val, label]) => (
              <button
                key={val}
                type="button"
                className={`dropdown-item ${sort === val ? 'active' : ''}`}
                onClick={() => {
                  onSortChange(val as SortOption);
                  setSortOpen(false);
                }}
              >
                {label}
              </button>
            ))}
          </div>
        </>
      )}

      {items.length === 0 ? (
        <div className="center-screen">
          <Search size={48} style={{ opacity: 0.4 }} />
          <div style={{ fontSize: 16, fontWeight: 600 }}>Ничего не найдено</div>
          <div style={{ fontSize: 13.5, color: 'var(--on-surface-variant)' }}>
            Попробуйте изменить запрос или сбросить фильтр
          </div>
        </div>
      ) : (
        <div ref={listRef} className="catalog-list" onScroll={handleScroll}>
          {visibleItems.map((item) => {
            const isRandom = item.path === selectedRandomPath;
            return (
              <CatalogCard
                key={item.path}
                item={item}
                isFavorite={favorites.has(item.path)}
                isCompleted={completed.has(item.path)}
                isDark={isDark}
                adaptiveDark={adaptiveDark}
                isHighlighted={isRandom}
                trailingBadge={isRandom ? 'Случайный' : null}
                onToggleFavorite={onToggleFavorite}
                onToggleCompleted={onToggleCompleted}
                onOpen={onOpenItem}
                cardRef={(el) => {
                  if (el) cardRefs.current.set(item.path, el);
                  else cardRefs.current.delete(item.path);
                }}
              />
            );
          })}
          {visibleCount < items.length && (
            <button
              type="button"
              className="load-more-btn"
              onClick={() => setVisibleCount((c) => Math.min(items.length, c + PAGE_STEP))}
            >
              Показать ещё ({items.length - visibleCount})
            </button>
          )}
        </div>
      )}

      <button
        type="button"
        className="fab-random"
        onClick={() => {
          hapticLight();
          onSelectRandom();
        }}
        aria-label="Выбрать случайный синтез"
        title="Выбрать случайный синтез"
      >
        <Dices size={24} />
      </button>
    </div>
  );
};
