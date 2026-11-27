import React, { useEffect, useRef, useState } from 'react';
import { CheckCircle2, Circle, FlaskConical, Heart, Pill } from 'lucide-react';
import type { CatalogItem, ChemBitmap } from '../types/models';
import { repository } from '../data/cbydRepository';
import { ChemDiagramImage } from './ChemDiagramImage';
import { hapticLight } from '../utils/telegram';

interface CatalogCardProps {
  item: CatalogItem;
  isFavorite: boolean;
  isCompleted: boolean;
  isDark: boolean;
  adaptiveDark: boolean;
  isHighlighted?: boolean;
  trailingBadge?: string | null;
  onToggleFavorite: (path: string) => void;
  onToggleCompleted: (path: string) => void;
  onOpen: (item: CatalogItem) => void;
  cardRef?: (el: HTMLDivElement | null) => void;
}

export const CatalogCard: React.FC<CatalogCardProps> = React.memo(({
  item,
  isFavorite,
  isCompleted,
  isDark,
  adaptiveDark,
  isHighlighted = false,
  trailingBadge = null,
  onToggleFavorite,
  onToggleCompleted,
  onOpen,
  cardRef,
}) => {
  const [preview, setPreview] = useState<ChemBitmap | undefined>(() =>
    repository.getCachedPreview(item.path),
  );
  const boxRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const cached = repository.getCachedPreview(item.path);
    if (cached) {
      setPreview(cached);
      return;
    }

    const el = boxRef.current;
    if (!el) return;

    let cancelled = false;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          observer.disconnect();
          repository.loadTargetPreview(item.path).then((bmp) => {
            if (!cancelled && bmp) setPreview(bmp);
          });
        }
      },
      { rootMargin: '250px' },
    );

    observer.observe(el);
    return () => {
      cancelled = true;
      observer.disconnect();
    };
  }, [item.path]);

  const subtitle = [item.author, item.year].filter(Boolean).join(' · ');

  return (
    <div
      ref={(el) => {
        boxRef.current = el;
        cardRef?.(el);
      }}
      role="button"
      tabIndex={0}
      onClick={() => {
        hapticLight();
        onOpen(item);
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onOpen(item);
        }
      }}
      className={`catalog-card ${isCompleted ? 'completed' : ''} ${isHighlighted ? 'highlighted' : ''}`}
    >
      <div className="thumb-box">
        {preview ? (
          <ChemDiagramImage
            chem={preview}
            alt={item.displayTitle}
            isDark={isDark}
            adaptiveDark={adaptiveDark}
          />
        ) : (
          <FlaskConical size={24} style={{ opacity: 0.25 }} />
        )}
      </div>

      <div className="card-meta">
        <div className="card-title">{item.displayTitle}</div>
        {(subtitle || trailingBadge) && (
          <div className="card-sub-row">
            {subtitle && <span className="card-subtitle">{subtitle}</span>}
            {trailingBadge && <span className="badge-primary">{trailingBadge}</span>}
          </div>
        )}
        {item.isDrug && (
          <div className="badge-drug">
            <Pill size={13} style={{ flexShrink: 0 }} />
            <span>{item.drug}</span>
          </div>
        )}
      </div>

      <div className="card-actions">
        <button
          type="button"
          className="card-icon-btn"
          aria-label={isFavorite ? 'Убрать из избранного' : 'В избранное'}
          onClick={(e) => {
            e.stopPropagation();
            hapticLight();
            onToggleFavorite(item.path);
          }}
        >
          <Heart
            size={20}
            color={isFavorite ? 'var(--primary)' : 'currentColor'}
            fill={isFavorite ? 'var(--primary)' : 'none'}
            style={{ opacity: isFavorite ? 1 : 0.6 }}
          />
        </button>

        <button
          type="button"
          className="card-icon-btn"
          aria-label={isCompleted ? 'Снять отметку о выполнении' : 'Отметить как сделанный'}
          onClick={(e) => {
            e.stopPropagation();
            hapticLight();
            onToggleCompleted(item.path);
          }}
        >
          {isCompleted ? (
            <CheckCircle2 size={20} color="var(--secondary)" />
          ) : (
            <Circle size={20} style={{ opacity: 0.55 }} />
          )}
        </button>
      </div>
    </div>
  );
});
