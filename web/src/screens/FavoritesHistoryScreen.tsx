import React, { useMemo, useState } from 'react';
import { CheckCircle2, Heart, History, Trash2 } from 'lucide-react';
import type { CatalogItem, HistoryEntry } from '../types/models';
import { CatalogCard } from '../components/CatalogCard';

interface FavoritesHistoryScreenProps {
  itemsByPath: Map<string, CatalogItem>;
  favorites: Set<string>;
  completed: Set<string>;
  history: HistoryEntry[];
  isDark: boolean;
  adaptiveDark: boolean;
  onToggleFavorite: (path: string) => void;
  onToggleCompleted: (path: string) => void;
  onClearHistory: () => void;
  onOpenItem: (item: CatalogItem) => void;
}

export const FavoritesHistoryScreen: React.FC<FavoritesHistoryScreenProps> = ({
  itemsByPath,
  favorites,
  completed,
  history,
  isDark,
  adaptiveDark,
  onToggleFavorite,
  onToggleCompleted,
  onClearHistory,
  onOpenItem,
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

  return (
    <div className="catalog-wrap">
      <div className="top-header" style={{ paddingTop: 14, paddingBottom: 12 }}>
        <h1 className="page-title">Коллекция</h1>
        {tab === 2 && history.length > 0 && (
          <button type="button" className="text-action-btn" onClick={onClearHistory}>
            <Trash2 size={16} />
            Очистить
          </button>
        )}
      </div>

      <div style={{ padding: '0 16px 12px' }}>
        <div className="segmented">
          <button
            type="button"
            className={`seg-btn ${tab === 0 ? 'active' : ''}`}
            onClick={() => setTab(0)}
          >
            Избранное ({favoriteItems.length})
          </button>
          <button
            type="button"
            className={`seg-btn ${tab === 1 ? 'active' : ''}`}
            onClick={() => setTab(1)}
          >
            Сделано ({completedItems.length})
          </button>
          <button
            type="button"
            className={`seg-btn ${tab === 2 ? 'active' : ''}`}
            onClick={() => setTab(2)}
          >
            История ({historyItems.length})
          </button>
        </div>
      </div>

      {tab === 0 && (
        favoriteItems.length === 0 ? (
          <div className="center-screen">
            <Heart size={50} style={{ opacity: 0.4 }} />
            <div style={{ fontSize: 16, fontWeight: 600 }}>Пока нет избранных синтезов</div>
            <div style={{ fontSize: 13.5, color: 'var(--on-surface-variant)' }}>
              Нажмите на сердечко рядом с любым синтезом, чтобы быстро возвращаться к нему
            </div>
          </div>
        ) : (
          <div className="catalog-list" style={{ paddingBottom: 24 }}>
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
        )
      )}

      {tab === 1 && (
        completedItems.length === 0 ? (
          <div className="center-screen">
            <CheckCircle2 size={50} style={{ opacity: 0.4 }} />
            <div style={{ fontSize: 16, fontWeight: 600 }}>Пока нет сделанных синтезов</div>
            <div style={{ fontSize: 13.5, color: 'var(--on-surface-variant)' }}>
              Нажмите на галочку рядом с лайком, чтобы отмечать пройденные синтезы
            </div>
          </div>
        ) : (
          <div className="catalog-list" style={{ paddingBottom: 24 }}>
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
        )
      )}

      {tab === 2 && (
        historyItems.length === 0 ? (
          <div className="center-screen">
            <History size={50} style={{ opacity: 0.4 }} />
            <div style={{ fontSize: 16, fontWeight: 600 }}>История пуста</div>
            <div style={{ fontSize: 13.5, color: 'var(--on-surface-variant)' }}>
              Здесь будут появляться синтезы, которые вы недавно открывали
            </div>
          </div>
        ) : (
          <div className="catalog-list" style={{ paddingBottom: 24 }}>
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
  );
};
