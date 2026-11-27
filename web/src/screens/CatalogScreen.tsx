import React, { useEffect, useRef, useState } from 'react';
import {
  ArrowUpDown,
  Dices,
  Pill,
  Search,
  X,
} from 'lucide-react';
import type { CatalogFilter, CatalogItem, SortOption } from '../types/models';
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
  isDark: boolean;
  adaptiveDark: boolean;
  selectedRandomPath: string | null;
  randomScrollRequest: number;
  onQueryChange: (q: string) => void;
  onFilterChange: (f: CatalogFilter) => void;
  onSortChange: (s: SortOption) => void;
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
  isDark,
  adaptiveDark,
  selectedRandomPath,
  randomScrollRequest,
  onQueryChange,
  onFilterChange,
  onSortChange,
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
      <div className="catalog-toolbar-wrap">
        <div className="catalog-head-row">
          <div>
            <h1 className="page-title">Органические синтезы</h1>
            <div style={{ fontSize: 13, color: 'var(--on-surface-variant)', marginTop: 4 }}>
              Показано {items.length.toLocaleString('ru-RU')} из {totalCount.toLocaleString('ru-RU')} синтезов · Chemistry By Design
            </div>
          </div>

          <button
            type="button"
            className="btn-cta-secondary"
            onClick={() => {
              hapticLight();
              onSelectRandom();
            }}
          >
            <Dices size={16} />
            Случайный синтез
          </button>
        </div>

        <div className="catalog-controls-bar">
          <div className="search-box">
            <Search size={18} color="var(--on-surface-variant)" style={{ flexShrink: 0 }} />
            <input
              type="search"
              value={query}
              onChange={(e) => onQueryChange(e.target.value)}
              placeholder="Поиск молекулы, автора, года, препарата…"
              enterKeyHint="search"
            />
            {query && (
              <button
                type="button"
                onClick={() => onQueryChange('')}
                aria-label="Очистить"
                style={{ color: 'var(--on-surface-variant)', display: 'flex' }}
              >
                <X size={17} />
              </button>
            )}
          </div>

          <div className="chips-row">
            <button
              type="button"
              className={`chip ${filter === 'all' ? 'selected' : ''}`}
              onClick={() => onFilterChange('all')}
            >
              Все ({totalCount})
            </button>
            <button
              type="button"
              className={`chip ${filter === 'drugs' ? 'selected' : ''}`}
              onClick={() => onFilterChange('drugs')}
            >
              <Pill size={14} />
              Лекарства ({drugCount})
            </button>
            <button
              type="button"
              className={`chip ${filter === 'natural' ? 'selected' : ''}`}
              onClick={() => onFilterChange('natural')}
            >
              Природные ({naturalCount})
            </button>
            <button
              ref={sortBtnRef}
              type="button"
              className={`chip ${sort !== 'name_asc' ? 'selected' : ''}`}
              onClick={openSortMenu}
            >
              <ArrowUpDown size={14} />
              {sortLabel}
            </button>
          </div>
        </div>
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
        <div ref={listRef} className="catalog-grid-scroll" onScroll={handleScroll}>
          <div className="catalog-grid">
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
          </div>
          {visibleCount < items.length && (
            <div style={{ maxWidth: 1400, margin: '0 auto', padding: '0 24px 32px' }}>
              <button
                type="button"
                className="btn-cta-secondary"
                style={{ width: '100%' }}
                onClick={() => setVisibleCount((c) => Math.min(items.length, c + PAGE_STEP))}
              >
                Показать ещё ({items.length - visibleCount})
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
