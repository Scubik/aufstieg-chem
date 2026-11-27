import React from 'react';
import { Atom, Dices, FlaskConical } from 'lucide-react';
import type { CatalogItem, GalaxyId, InorganicChainMeta } from '../types/models';
import { ElementGalaxyObservatory } from '../components/ElementGalaxyObservatory';
import { CatalogCard } from '../components/CatalogCard';

interface OverviewScreenProps {
  organicCount: number;
  inorganicItems: InorganicChainMeta[];
  featuredOrganic: CatalogItem[];
  favorites: Set<string>;
  completed: Set<string>;
  isDark: boolean;
  adaptiveDark: boolean;
  onSelectGalaxy: (galaxyId: GalaxyId) => void;
  onOpenInorganicChain: (chainId: string) => void;
  onGoOrganic: () => void;
  onGoInorganic: () => void;
  onRandomOrganic: () => void;
  onRandomInorganic: () => void;
  onOpenOrganicItem: (item: CatalogItem) => void;
  onToggleOrganicFavorite: (path: string) => void;
  onToggleOrganicCompleted: (path: string) => void;
}

export const OverviewScreen: React.FC<OverviewScreenProps> = ({
  organicCount,
  inorganicItems,
  featuredOrganic,
  favorites,
  completed,
  isDark,
  adaptiveDark,
  onSelectGalaxy,
  onOpenInorganicChain,
  onGoOrganic,
  onGoInorganic,
  onRandomOrganic,
  onRandomInorganic,
  onOpenOrganicItem,
  onToggleOrganicFavorite,
  onToggleOrganicCompleted,
}) => {
  return (
    <div className="page-scroll">
      <div className="page-container">
        <section className="observatory-hero">
          <div className="observatory-sidebar">
            <div>
              <h1 className="hero-headline" style={{ marginTop: 0 }}>
                Тоталсинтезы и&nbsp;химия элементов
              </h1>
              <p className="hero-lead">
                Интерактивные цепочки по неорганической химии Н.&nbsp;В.&nbsp;Мещерякова и&nbsp;база
                полных органических синтезов Chemistry By Design.
              </p>
            </div>

            <div className="hero-stats-grid">
              <div className="hero-stat-tile">
                <div className="hero-stat-val">{organicCount.toLocaleString('ru-RU')}</div>
                <div className="hero-stat-lbl">Синтезов</div>
              </div>
              <div className="hero-stat-tile">
                <div className="hero-stat-val">{inorganicItems.length}</div>
                <div className="hero-stat-lbl">Цепочек</div>
              </div>
            </div>

            <div className="hero-cta-row">
              <button type="button" className="btn-cta-primary" onClick={onGoOrganic}>
                <FlaskConical size={16} />
                Органика
              </button>
              <button type="button" className="btn-cta-secondary" onClick={onGoInorganic}>
                <Atom size={16} />
                Неорганика
              </button>
              <button
                type="button"
                className="btn-cta-secondary"
                onClick={onRandomOrganic}
                title="Случайный органический синтез"
              >
                <Dices size={16} />
                Случайный синтез
              </button>
              <button
                type="button"
                className="btn-cta-secondary"
                onClick={onRandomInorganic}
                title="Случайная неорганическая цепочка"
              >
                <Dices size={16} />
                Случайный элемент
              </button>
            </div>
          </div>

          <ElementGalaxyObservatory
            isDark={isDark}
            onSelectGalaxy={onSelectGalaxy}
            onOpenChain={onOpenInorganicChain}
          />
        </section>

        {featuredOrganic.length > 0 && (
          <section style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div className="section-heading-row">
              <h2 className="section-heading">Важнейшие синтезы</h2>
              <button type="button" className="link-btn" onClick={onGoOrganic}>
                Открыть каталог →
              </button>
            </div>

            <div className="catalog-list">
              {featuredOrganic.map((item) => (
                <CatalogCard
                  key={item.path}
                  item={item}
                  isFavorite={favorites.has(item.path)}
                  isCompleted={completed.has(item.path)}
                  isDark={isDark}
                  adaptiveDark={adaptiveDark}
                  onToggleFavorite={onToggleOrganicFavorite}
                  onToggleCompleted={onToggleOrganicCompleted}
                  onOpen={onOpenOrganicItem}
                />
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
};
