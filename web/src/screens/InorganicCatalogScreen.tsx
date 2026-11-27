import React, { useMemo } from 'react';
import { CheckCircle2, Circle, Dices, Heart, Search, X } from 'lucide-react';
import type { GalaxyId, InorganicChainMeta } from '../types/models';
import { ELEMENT_GALAXIES, getGalaxyById } from '../data/galaxies';
import { hapticLight } from '../utils/telegram';

interface InorganicCatalogScreenProps {
  items: InorganicChainMeta[];
  query: string;
  activeGalaxy: GalaxyId | 'all';
  favorites: Set<string>;
  completed: Set<string>;
  isDark: boolean;
  onQueryChange: (q: string) => void;
  onGalaxyChange: (g: GalaxyId | 'all') => void;
  onToggleFavorite: (id: string) => void;
  onToggleCompleted: (id: string) => void;
  onOpenChain: (id: string) => void;
  onSelectRandom: () => void;
}

export const InorganicCatalogScreen: React.FC<InorganicCatalogScreenProps> = ({
  items,
  query,
  activeGalaxy,
  favorites,
  completed,
  isDark,
  onQueryChange,
  onGalaxyChange,
  onToggleFavorite,
  onToggleCompleted,
  onOpenChain,
  onSelectRandom,
}) => {
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((item) => {
      if (activeGalaxy !== 'all' && item.galaxyId !== activeGalaxy) return false;
      if (!q) return true;
      return (
        item.element.toLowerCase().includes(q) ||
        item.title.toLowerCase().includes(q) ||
        item.groupTitle.toLowerCase().includes(q)
      );
    });
  }, [items, query, activeGalaxy]);

  return (
    <div className="catalog-wrap">
      <div className="catalog-toolbar-wrap">
        <div className="catalog-head-row">
          <div>
            <h1 className="page-title">Неорганические цепочки</h1>
            <div style={{ fontSize: 13, color: 'var(--on-surface-variant)', marginTop: 4 }}>
              Показано {filtered.length} из {items.length} элементов · Н. В. Мещеряков
            </div>
          </div>

          <button type="button" className="btn-cta-secondary" onClick={onSelectRandom}>
            <Dices size={16} />
            Случайный элемент
          </button>
        </div>

        <div className="catalog-controls-bar">
          <div className="search-box">
            <Search size={18} color="var(--on-surface-variant)" />
            <input
              type="text"
              value={query}
              onChange={(e) => onQueryChange(e.target.value)}
              placeholder="Поиск элемента (Mn, платина, 15 группа)…"
              aria-label="Поиск неорганических цепочек"
            />
            {query && (
              <button
                type="button"
                onClick={() => onQueryChange('')}
                aria-label="Очистить поиск"
                style={{ color: 'var(--on-surface-variant)', display: 'flex' }}
              >
                <X size={17} />
              </button>
            )}
          </div>
        </div>

        <div className="chips-row">
          <button
            type="button"
            className={`chip ${activeGalaxy === 'all' ? 'selected' : ''}`}
            onClick={() => onGalaxyChange('all')}
          >
            Все ({items.length})
          </button>
          {ELEMENT_GALAXIES.map((g) => {
            const cnt = items.filter((it) => it.galaxyId === g.id).length;
            const dotColor = isDark ? g.color : g.lightColor;
            return (
              <button
                key={g.id}
                type="button"
                className={`chip ${activeGalaxy === g.id ? 'selected' : ''}`}
                onClick={() => onGalaxyChange(g.id)}
              >
                <span
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    backgroundColor: dotColor,
                    display: 'inline-block',
                  }}
                />
                {g.label} ({cnt})
              </button>
            );
          })}
        </div>
      </div>

      <div className="catalog-grid-scroll">
        {filtered.length === 0 ? (
          <div className="center-screen">
            <div style={{ fontSize: 17, fontWeight: 600 }}>Элементы не найдены</div>
            <button
              type="button"
              className="btn-cta-secondary"
              onClick={() => {
                onQueryChange('');
                onGalaxyChange('all');
              }}
            >
              Сбросить фильтры
            </button>
          </div>
        ) : (
          <div className="inorganic-grid">
            {filtered.map((item) => {
              const gal = getGalaxyById(item.galaxyId);
              const isFav = favorites.has(item.id);
              const isDone = completed.has(item.id);
              return (
                <div
                  key={item.id}
                  role="button"
                  tabIndex={0}
                  className={`element-card ${isDone ? 'completed' : ''}`}
                  onClick={() => {
                    hapticLight();
                    onOpenChain(item.id);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      onOpenChain(item.id);
                    }
                  }}
                >
                  <div className="element-card-top">
                    <div className="element-symbol-badge">{item.element}</div>
                    <div style={{ display: 'flex', gap: 2 }}>
                      <button
                        type="button"
                        className="card-action-btn"
                        aria-label="В избранное"
                        onClick={(e) => {
                          e.stopPropagation();
                          hapticLight();
                          onToggleFavorite(item.id);
                        }}
                      >
                        <Heart
                          size={17}
                          color={isFav ? 'var(--primary)' : 'currentColor'}
                          fill={isFav ? 'var(--primary)' : 'none'}
                        />
                      </button>
                      <button
                        type="button"
                        className="card-action-btn"
                        aria-label="Отметить изученным"
                        onClick={(e) => {
                          e.stopPropagation();
                          hapticLight();
                          onToggleCompleted(item.id);
                        }}
                      >
                        {isDone ? (
                          <CheckCircle2 size={17} color="var(--success)" />
                        ) : (
                          <Circle size={17} />
                        )}
                      </button>
                    </div>
                  </div>

                  <div>
                    <div className="element-card-title">{item.title}</div>
                    <div className="element-card-sub">{gal.label} · {item.groupTitle}</div>
                  </div>

                  <div className="element-card-footer">
                    <span className="mono">{item.xCount} веществ X</span>
                    {item.bookPage ? <span>стр. {item.bookPage}</span> : <span>Схема</span>}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
