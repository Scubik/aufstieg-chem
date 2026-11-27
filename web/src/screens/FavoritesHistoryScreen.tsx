import React, { useMemo, useState } from 'react';
import { CheckCircle2, Circle, Heart, History, Trash2 } from 'lucide-react';
import type { CatalogItem, HistoryEntry, InorganicChainMeta } from '../types/models';
import { CatalogCard } from '../components/CatalogCard';
import { getGalaxyById } from '../data/galaxies';

interface FavoritesHistoryScreenProps {
  itemsByPath: Map<string, CatalogItem>;
  inorganicById: Map<string, InorganicChainMeta>;
  favorites: Set<string>;
  completed: Set<string>;
  inorganicFavorites: Set<string>;
  inorganicCompleted: Set<string>;
  history: HistoryEntry[];
  isDark: boolean;
  adaptiveDark: boolean;
  onToggleFavorite: (path: string) => void;
  onToggleCompleted: (path: string) => void;
  onToggleInorganicFavorite: (id: string) => void;
  onToggleInorganicCompleted: (id: string) => void;
  onClearHistory: () => void;
  onOpenItem: (item: CatalogItem) => void;
  onOpenInorganicChain: (id: string) => void;
}

export const FavoritesHistoryScreen: React.FC<FavoritesHistoryScreenProps> = ({
  itemsByPath,
  inorganicById,
  favorites,
  completed,
  inorganicFavorites,
  inorganicCompleted,
  history,
  isDark,
  adaptiveDark,
  onToggleFavorite,
  onToggleCompleted,
  onToggleInorganicFavorite,
  onToggleInorganicCompleted,
  onClearHistory,
  onOpenItem,
  onOpenInorganicChain,
}) => {
  const [tab, setTab] = useState<0 | 1 | 2>(0);

  const favoriteItems = useMemo(
    () =>
      Array.from(favorites)
        .map((p) => itemsByPath.get(p))
        .filter((x): x is CatalogItem => Boolean(x))
        .sort((a, b) => a.displayTitle.localeCompare(b.displayTitle, 'ru')),
    [favorites, itemsByPath],
  );

  const completedItems = useMemo(
    () =>
      Array.from(completed)
        .map((p) => itemsByPath.get(p))
        .filter((x): x is CatalogItem => Boolean(x))
        .sort((a, b) => a.displayTitle.localeCompare(b.displayTitle, 'ru')),
    [completed, itemsByPath],
  );

  const favoriteInorganic = useMemo(
    () =>
      Array.from(inorganicFavorites)
        .map((id) => inorganicById.get(id))
        .filter((x): x is InorganicChainMeta => Boolean(x)),
    [inorganicFavorites, inorganicById],
  );

  const completedInorganic = useMemo(
    () =>
      Array.from(inorganicCompleted)
        .map((id) => inorganicById.get(id))
        .filter((x): x is InorganicChainMeta => Boolean(x)),
    [inorganicCompleted, inorganicById],
  );

  const historyItems = useMemo(
    () =>
      history
        .map((h) => {
          const item = itemsByPath.get(h.path);
          return item ? { item, entry: h } : null;
        })
        .filter((x): x is { item: CatalogItem; entry: HistoryEntry } => Boolean(x)),
    [history, itemsByPath],
  );

  const favTotal = favoriteItems.length + favoriteInorganic.length;
  const compTotal = completedItems.length + completedInorganic.length;

  return (
    <div className="page-scroll">
      <div className="page-container">
        <div className="catalog-head-row">
          <h1 className="page-title">Коллекция</h1>
          {tab === 2 && history.length > 0 && (
            <button type="button" className="text-action-btn" onClick={onClearHistory}>
              <Trash2 size={16} />
              Очистить историю
            </button>
          )}
        </div>

        <div className="segmented" style={{ width: 'fit-content', maxWidth: '100%' }}>
          <button
            type="button"
            className={`seg-btn ${tab === 0 ? 'active' : ''}`}
            onClick={() => setTab(0)}
          >
            Избранное ({favTotal})
          </button>
          <button
            type="button"
            className={`seg-btn ${tab === 1 ? 'active' : ''}`}
            onClick={() => setTab(1)}
          >
            Изучено ({compTotal})
          </button>
          <button
            type="button"
            className={`seg-btn ${tab === 2 ? 'active' : ''}`}
            onClick={() => setTab(2)}
          >
            История ({historyItems.length})
          </button>
        </div>

        {tab === 0 && (
          favTotal === 0 ? (
            <div className="center-screen">
              <Heart size={48} style={{ opacity: 0.4 }} />
              <div style={{ fontSize: 16, fontWeight: 600 }}>Пока нет избранного</div>
              <div style={{ fontSize: 13.5, color: 'var(--on-surface-variant)' }}>
                Отмечайте сердечком органические синтезы и неорганические цепочки
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              {favoriteInorganic.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <div className="section-title">Неорганические цепочки ({favoriteInorganic.length})</div>
                  <div className="inorganic-grid" style={{ padding: 0 }}>
                    {favoriteInorganic.map((ch) => (
                      <div
                        key={ch.id}
                        role="button"
                        tabIndex={0}
                        className="element-card"
                        onClick={() => onOpenInorganicChain(ch.id)}
                      >
                        <div className="element-card-top">
                          <div className="element-symbol-badge">{ch.element}</div>
                          <button
                            type="button"
                            className="card-action-btn"
                            onClick={(e) => {
                              e.stopPropagation();
                              onToggleInorganicFavorite(ch.id);
                            }}
                          >
                            <Heart size={17} color="var(--primary)" fill="var(--primary)" />
                          </button>
                        </div>
                        <div className="element-card-title">{ch.title}</div>
                        <div className="element-card-sub">{getGalaxyById(ch.galaxyId).label}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {favoriteItems.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <div className="section-title">Органические синтезы ({favoriteItems.length})</div>
                  <div className="catalog-list">
                    {favoriteItems.map((item) => (
                      <CatalogCard
                        key={item.path}
                        item={item}
                        isFavorite
                        isCompleted={completed.has(item.path)}
                        isDark={isDark}
                        adaptiveDark={adaptiveDark}
                        onToggleFavorite={onToggleFavorite}
                        onToggleCompleted={onToggleCompleted}
                        onOpen={onOpenItem}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )
        )}

        {tab === 1 && (
          compTotal === 0 ? (
            <div className="center-screen">
              <CheckCircle2 size={48} style={{ opacity: 0.4 }} />
              <div style={{ fontSize: 16, fontWeight: 600 }}>Пока нет изученных материалов</div>
              <div style={{ fontSize: 13.5, color: 'var(--on-surface-variant)' }}>
                Нажмите на кружок-галочку, чтобы отмечать пройденные синтезы и элементы
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              {completedInorganic.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <div className="section-title">Неорганические цепочки ({completedInorganic.length})</div>
                  <div className="inorganic-grid" style={{ padding: 0 }}>
                    {completedInorganic.map((ch) => (
                      <div
                        key={ch.id}
                        role="button"
                        tabIndex={0}
                        className="element-card completed"
                        onClick={() => onOpenInorganicChain(ch.id)}
                      >
                        <div className="element-card-top">
                          <div className="element-symbol-badge">{ch.element}</div>
                          <button
                            type="button"
                            className="card-action-btn"
                            onClick={(e) => {
                              e.stopPropagation();
                              onToggleInorganicCompleted(ch.id);
                            }}
                          >
                            {inorganicCompleted.has(ch.id) ? (
                              <CheckCircle2 size={17} color="var(--success)" />
                            ) : (
                              <Circle size={17} />
                            )}
                          </button>
                        </div>
                        <div className="element-card-title">{ch.title}</div>
                        <div className="element-card-sub">{getGalaxyById(ch.galaxyId).label}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {completedItems.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <div className="section-title">Органические синтезы ({completedItems.length})</div>
                  <div className="catalog-list">
                    {completedItems.map((item) => (
                      <CatalogCard
                        key={item.path}
                        item={item}
                        isFavorite={favorites.has(item.path)}
                        isCompleted
                        isDark={isDark}
                        adaptiveDark={adaptiveDark}
                        onToggleFavorite={onToggleFavorite}
                        onToggleCompleted={onToggleCompleted}
                        onOpen={onOpenItem}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )
        )}

        {tab === 2 && (
          historyItems.length === 0 ? (
            <div className="center-screen">
              <History size={48} style={{ opacity: 0.4 }} />
              <div style={{ fontSize: 16, fontWeight: 600 }}>История пуста</div>
              <div style={{ fontSize: 13.5, color: 'var(--on-surface-variant)' }}>
                Здесь будут появляться синтезы, которые вы недавно открывали
              </div>
            </div>
          ) : (
            <div className="catalog-list">
              {historyItems.map(({ item, entry }) => {
                const badge =
                  entry.totalSteps > 0 ? `Шаг ${entry.lastStep + 1}/${entry.totalSteps}` : null;
                return (
                  <CatalogCard
                    key={item.path}
                    item={item}
                    isFavorite={favorites.has(item.path)}
                    isCompleted={completed.has(item.path)}
                    isDark={isDark}
                    adaptiveDark={adaptiveDark}
                    trailingBadge={badge}
                    onToggleFavorite={onToggleFavorite}
                    onToggleCompleted={onToggleCompleted}
                    onOpen={onOpenItem}
                  />
                );
              })}
            </div>
          )
        )}
      </div>
    </div>
  );
};
