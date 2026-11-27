import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  CheckCircle2,
  Circle,
  ExternalLink,
  Eye,
  EyeOff,
  FileDown,
  GitBranch,
  Hand,
  Heart,
  Info,
  List,
  Sparkles,
  X,
  ZoomIn,
} from 'lucide-react';
import type { CatalogItem, ChemBitmap, SequenceModel, StepModel, ViewMode } from '../types/models';
import { ChemDiagramImage, ZoomableImageDialog } from '../components/ChemDiagramImage';
import { SnakeCanvasView } from './SnakeCanvasView';
import { pluralSteps } from '../pdf/pdfExporter';
import { hapticLight, openExternalUrl } from '../utils/telegram';

interface SynthesisScreenProps {
  item: CatalogItem;
  activeSeq: SequenceModel | null;
  isInSubsequence: boolean;
  isLoading: boolean;
  error: string | null;
  isExportingPdf: boolean;
  defaultViewMode: ViewMode;
  isFavorite: boolean;
  isCompleted: boolean;
  isDark: boolean;
  adaptiveDark: boolean;
  onBack: () => void;
  onToggleFavorite: () => void;
  onToggleCompleted: () => void;
  onExportPdf: (revealed: Set<number>) => void;
  onPushSubsequence: (sub: SequenceModel) => void;
  onStepChanged: (stepIndex: number) => void;
}

export const SynthesisScreen: React.FC<SynthesisScreenProps> = ({
  item,
  activeSeq,
  isInSubsequence,
  isLoading,
  error,
  isExportingPdf,
  defaultViewMode,
  isFavorite,
  isCompleted,
  isDark,
  adaptiveDark,
  onBack,
  onToggleFavorite,
  onToggleCompleted,
  onExportPdf,
  onPushSubsequence,
  onStepChanged,
}) => {
  const [viewMode, setViewMode] = useState<ViewMode>(defaultViewMode);
  const [revealedSchemeNodes, setRevealedSchemeNodes] = useState<Set<number>>(new Set());
  const [showPdfDialog, setShowPdfDialog] = useState(false);
  const [showInfoSheet, setShowInfoSheet] = useState(false);
  const [zoomed, setZoomed] = useState<{ chem: ChemBitmap; title: string } | null>(null);
  const [namedReaction, setNamedReaction] = useState<ChemBitmap | null>(null);

  useEffect(() => {
    setViewMode(defaultViewMode);
  }, [item.path, defaultViewMode]);

  useEffect(() => {
    setRevealedSchemeNodes(new Set());
  }, [activeSeq]);

  const title = activeSeq?.name.trim() || item.displayTitle;
  const metaParts: string[] = [];
  if (isInSubsequence) metaParts.push('Подсинтез');
  if (item.author.trim()) metaParts.push(item.author);
  if (item.year.trim()) metaParts.push(item.year);
  if (activeSeq) metaParts.push(`${activeSeq.steps.length} ${pluralSteps(activeSeq.steps.length)}`);
  const meta = metaParts.join(' · ');

  let decodedDoi = activeSeq?.doi ?? '';
  if (decodedDoi) {
    try {
      decodedDoi = decodeURIComponent(decodedDoi);
    } catch {
      // keep raw
    }
  }

  return (
    <div className="synthesis-shell">
      <div className="synthesis-topbar">
        <div className="synthesis-top-row">
          <button type="button" className="syn-icon-btn" onClick={onBack} aria-label="Назад">
            <ArrowLeft size={20} />
          </button>

          <div className="syn-title-col">
            <div className="syn-title">{title}</div>
            {meta && <div className="syn-meta">{meta}</div>}
          </div>

          <div className="segmented synthesis-mode-switch">
            <button
              type="button"
              className={`seg-btn ${viewMode === 'feed' ? 'active' : ''}`}
              style={{ padding: '4px 10px', fontSize: 12.5 }}
              onClick={() => setViewMode('feed')}
            >
              <List size={14} />
              Лента
            </button>
            <button
              type="button"
              className={`seg-btn ${viewMode === 'canvas' ? 'active' : ''}`}
              style={{ padding: '4px 10px', fontSize: 12.5 }}
              onClick={() => setViewMode('canvas')}
            >
              <GitBranch size={14} />
              Схема
            </button>
          </div>

          <div className="synthesis-top-actions">
            <button
              type="button"
              className="syn-icon-btn"
              onClick={() => {
                hapticLight();
                onToggleFavorite();
              }}
              aria-label="Избранное"
            >
              <Heart
                size={19}
                color={isFavorite ? 'var(--primary)' : 'currentColor'}
                fill={isFavorite ? 'var(--primary)' : 'none'}
              />
            </button>

            <button
              type="button"
              className="syn-icon-btn"
              onClick={() => {
                hapticLight();
                onToggleCompleted();
              }}
              aria-label="Отметить как сделанный"
            >
              {isCompleted ? (
                <CheckCircle2 size={19} color="var(--secondary)" />
              ) : (
                <Circle size={19} />
              )}
            </button>

            <button
              type="button"
              className="syn-icon-btn"
              disabled={!activeSeq || isExportingPdf}
              onClick={() => setShowPdfDialog(true)}
              aria-label="Экспорт в PDF"
            >
              {isExportingPdf ? <span className="spinner-sm" /> : <FileDown size={19} />}
            </button>

            <button
              type="button"
              className="syn-icon-btn"
              onClick={() => setShowInfoSheet(true)}
              aria-label="Источник и DOI"
            >
              <Info size={19} />
            </button>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="center-screen">
          <div className="spinner" />
          <div style={{ fontSize: 14, color: 'var(--on-surface-variant)' }}>
            Загрузка и распаковка синтеза...
          </div>
        </div>
      ) : error ? (
        <div className="center-screen">
          <div style={{ color: 'var(--error)', fontSize: 15 }}>{error}</div>
        </div>
      ) : activeSeq ? (
        viewMode === 'feed' ? (
          <ChainFeedView
            sequence={activeSeq}
            isDark={isDark}
            adaptiveDark={adaptiveDark}
            onOpenZoom={(chem, zTitle) => setZoomed({ chem, title: zTitle })}
            onOpenNamedReaction={setNamedReaction}
            onOpenSubsequence={onPushSubsequence}
            onStepChanged={onStepChanged}
          />
        ) : (
          <SnakeCanvasView
            sequence={activeSeq}
            revealedNodes={revealedSchemeNodes}
            isDark={isDark}
            adaptiveDark={adaptiveDark}
            onRevealedNodesChange={setRevealedSchemeNodes}
          />
        )
      ) : null}

      {/* PDF Export Modal */}
      {showPdfDialog && activeSeq && (
        <div className="modal-backdrop" onClick={() => setShowPdfDialog(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div style={{ fontSize: 18, fontWeight: 700 }}>Экспорт в PDF</div>
            <div style={{ fontSize: 13.5, color: 'var(--on-surface-variant)', lineHeight: 1.45 }}>
              {revealedSchemeNodes.size > 0
                ? `На схеме открыто подсказок: ${revealedSchemeNodes.size}. Второй лист с полными ответами останется без изменений.`
                : 'Выберите вариант первого листа (второй лист с полными ответами останется без изменений).'}
            </div>
            <button
              type="button"
              className="btn-tonal"
              disabled={revealedSchemeNodes.size === 0}
              onClick={() => {
                setShowPdfDialog(false);
                onExportPdf(revealedSchemeNodes);
              }}
            >
              {revealedSchemeNodes.size > 0
                ? `С открытыми подсказками (${revealedSchemeNodes.size})`
                : 'С открытыми подсказками (не открыты)'}
            </button>
            <button
              type="button"
              className="btn-outline"
              onClick={() => {
                setShowPdfDialog(false);
                onExportPdf(new Set());
              }}
            >
              Без подсказок
            </button>
            <button
              type="button"
              style={{
                alignSelf: 'flex-end',
                color: 'var(--primary)',
                fontWeight: 600,
                padding: '6px 10px',
              }}
              onClick={() => setShowPdfDialog(false)}
            >
              Отмена
            </button>
          </div>
        </div>
      )}

      {/* Named Reaction Modal */}
      {namedReaction && (
        <div className="modal-backdrop" onClick={() => setNamedReaction(null)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ fontSize: 16, fontWeight: 600 }}>Именная реакция</div>
              <button type="button" onClick={() => setNamedReaction(null)} aria-label="Закрыть">
                <X size={20} />
              </button>
            </div>
            <div style={{ maxHeight: 320, display: 'flex', justifyContent: 'center' }}>
              <ChemDiagramImage
                chem={namedReaction}
                alt="Именная реакция"
                isDark={isDark}
                adaptiveDark={adaptiveDark}
              />
            </div>
          </div>
        </div>
      )}

      {/* Info / Citation / DOI Bottom Sheet */}
      {showInfoSheet && activeSeq && (
        <div className="sheet-backdrop" onClick={() => setShowInfoSheet(false)}>
          <div className="sheet-card" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontSize: 18, fontWeight: 700 }}>{title}</div>
              <button type="button" onClick={() => setShowInfoSheet(false)} aria-label="Закрыть">
                <X size={20} />
              </button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 13.5, color: 'var(--on-surface-variant)' }}>
              {item.author && <div>Автор: {item.author}</div>}
              {item.year && <div>Год: {item.year}</div>}
              {item.drug && <div>Препарат: {item.drug}</div>}
              <div>Стадий: {activeSeq.steps.length}</div>
            </div>

            {activeSeq.citation && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <div style={{ fontSize: 13.5, fontWeight: 600 }}>Библиографическая ссылка:</div>
                <div
                  style={{
                    background: 'var(--surface-container)',
                    borderRadius: 12,
                    padding: 10,
                    maxHeight: 140,
                    display: 'flex',
                    justifyContent: 'center',
                  }}
                >
                  <ChemDiagramImage
                    chem={activeSeq.citation}
                    alt="Citation"
                    isDark={isDark}
                    adaptiveDark={adaptiveDark}
                  />
                </div>
              </div>
            )}

            {decodedDoi && (
              <button
                type="button"
                className="btn-primary"
                onClick={() => openExternalUrl(`https://doi.org/${decodedDoi}`)}
              >
                <ExternalLink size={17} />
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  Открыть статью (doi:{decodedDoi})
                </span>
              </button>
            )}
          </div>
        </div>
      )}

      {zoomed && (
        <ZoomableImageDialog
          chem={zoomed.chem}
          title={zoomed.title}
          isDark={isDark}
          adaptiveDark={adaptiveDark}
          onClose={() => setZoomed(null)}
        />
      )}
    </div>
  );
};

interface ChainFeedViewProps {
  sequence: SequenceModel;
  isDark: boolean;
  adaptiveDark: boolean;
  onOpenZoom: (chem: ChemBitmap, title: string) => void;
  onOpenNamedReaction: (chem: ChemBitmap) => void;
  onOpenSubsequence: (sub: SequenceModel) => void;
  onStepChanged: (stepIndex: number) => void;
}

const ChainFeedView: React.FC<ChainFeedViewProps> = ({
  sequence,
  isDark,
  adaptiveDark,
  onOpenZoom,
  onOpenNamedReaction,
  onOpenSubsequence,
  onStepChanged,
}) => {
  const steps = sequence.steps;
  const [revealedReagents, setRevealedReagents] = useState<Set<number>>(new Set());
  const [revealedProducts, setRevealedProducts] = useState<Set<number>>(new Set());

  useEffect(() => {
    setRevealedReagents(new Set());
    setRevealedProducts(new Set());
  }, [sequence]);

  const intermediateIndices = useMemo(
    () => (steps.length > 1 ? Array.from({ length: steps.length - 1 }, (_, i) => i) : []),
    [steps.length],
  );
  const allShown =
    steps.length > 0 &&
    revealedReagents.size >= steps.length &&
    intermediateIndices.every((idx) => revealedProducts.has(idx));

  const toggleAll = () => {
    hapticLight();
    if (allShown) {
      setRevealedReagents(new Set());
      setRevealedProducts(new Set());
    } else {
      setRevealedReagents(new Set(steps.map((_, i) => i)));
      setRevealedProducts(new Set(intermediateIndices));
    }
  };

  return (
    <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
      <div className="feed-toolbar">
        <span className="feed-toolbar-label">Пошаговая цепочка ({steps.length})</span>
        <button type="button" className="text-action-btn" onClick={toggleAll}>
          {allShown ? <EyeOff size={16} /> : <Eye size={16} />}
          {allShown ? 'Скрыть ответы' : 'Показать все'}
        </button>
      </div>

      <div className="feed-list">
        {sequence.start && (
          <DiagramCard
            label="Исходный субстрат"
            chem={sequence.start}
            revealed
            isDark={isDark}
            adaptiveDark={adaptiveDark}
            onTapReveal={() => {}}
            onZoom={() => onOpenZoom(sequence.start!, 'Исходный субстрат')}
          />
        )}

        {steps.map((step, idx) => {
          const isLast = idx === steps.length - 1;
          const reagentRevealed = revealedReagents.has(idx);
          const productRevealed = isLast || revealedProducts.has(idx);

          return (
            <FeedStepBlock
              key={idx}
              stepNumber={idx + 1}
              isLast={isLast}
              step={step}
              reagentRevealed={reagentRevealed}
              productRevealed={productRevealed}
              isDark={isDark}
              adaptiveDark={adaptiveDark}
              onToggleReagent={() => {
                hapticLight();
                onStepChanged(idx);
                setRevealedReagents((prev) => {
                  const next = new Set(prev);
                  if (next.has(idx)) next.delete(idx);
                  else next.add(idx);
                  return next;
                });
              }}
              onToggleProduct={() => {
                if (isLast) return;
                hapticLight();
                onStepChanged(idx);
                setRevealedProducts((prev) => {
                  const next = new Set(prev);
                  if (next.has(idx)) next.delete(idx);
                  else next.add(idx);
                  return next;
                });
              }}
              onOpenZoom={onOpenZoom}
              onOpenNamedReaction={onOpenNamedReaction}
              onOpenSubsequence={onOpenSubsequence}
            />
          );
        })}
      </div>
    </div>
  );
};

interface FeedStepBlockProps {
  stepNumber: number;
  isLast: boolean;
  step: StepModel;
  reagentRevealed: boolean;
  productRevealed: boolean;
  isDark: boolean;
  adaptiveDark: boolean;
  onToggleReagent: () => void;
  onToggleProduct: () => void;
  onOpenZoom: (chem: ChemBitmap, title: string) => void;
  onOpenNamedReaction: (chem: ChemBitmap) => void;
  onOpenSubsequence: (sub: SequenceModel) => void;
}

const FeedStepBlock: React.FC<FeedStepBlockProps> = ({
  stepNumber,
  isLast,
  step,
  reagentRevealed,
  productRevealed,
  isDark,
  adaptiveDark,
  onToggleReagent,
  onToggleProduct,
  onOpenZoom,
  onOpenNamedReaction,
  onOpenSubsequence,
}) => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div className="feed-step-row">
        <div
          role="button"
          tabIndex={0}
          onClick={onToggleReagent}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              onToggleReagent();
            }
          }}
          className={`diagram-card feed-reagent-card ${reagentRevealed ? '' : 'hidden'}`}
        >
          <div className="diagram-card-head">
            <span className="stage-pill">
              {isLast ? `Финальная стадия ${stepNumber}` : `Стадия ${stepNumber}`}
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              {step.namedReaction && (
                <button
                  type="button"
                  className="syn-icon-btn"
                  style={{ width: 28, height: 28, color: 'var(--tertiary)' }}
                  onClick={(e) => {
                    e.stopPropagation();
                    onOpenNamedReaction(step.namedReaction!);
                  }}
                  aria-label="Именная реакция"
                >
                  <Sparkles size={16} />
                </button>
              )}
              {step.subsequence && (
                <button
                  type="button"
                  className="syn-icon-btn"
                  style={{ width: 28, height: 28, color: 'var(--primary)' }}
                  onClick={(e) => {
                    e.stopPropagation();
                    onOpenSubsequence(step.subsequence!);
                  }}
                  aria-label="Подсинтез"
                >
                  <GitBranch size={16} />
                </button>
              )}
              {reagentRevealed && (
                <button
                  type="button"
                  className="icon-circle-btn"
                  style={{ width: 28, height: 28 }}
                  onClick={(e) => {
                    e.stopPropagation();
                    onOpenZoom(step.reaction.combined, `Условия (стадия ${stepNumber})`);
                  }}
                  aria-label="Увеличить"
                >
                  <ZoomIn size={15} />
                </button>
              )}
            </div>
          </div>

          {reagentRevealed ? (
            <div className="diagram-body">
              <ChemDiagramImage
                chem={step.reaction.combined}
                alt={`Реагенты и условия (стадия ${stepNumber})`}
                isDark={isDark}
                adaptiveDark={adaptiveDark}
              />
            </div>
          ) : (
            <div className="hidden-prompt" style={{ minHeight: 80 }}>
              <Hand size={22} />
              <span>Показать условия</span>
            </div>
          )}
        </div>

        {/* Vertical downward arrow */}
        <div className="feed-arrow-col" aria-hidden="true">
          <svg width="28" height="100%" viewBox="0 0 28 110" preserveAspectRatio="none">
            <line
              x1="14"
              y1="6"
              x2="14"
              y2="92"
              stroke="var(--primary)"
              strokeWidth="2.8"
              strokeLinecap="round"
            />
            <polygon points="14,106 6,88 22,88" fill="var(--primary)" />
          </svg>
        </div>
      </div>

      <DiagramCard
        label={isLast ? 'Целевая молекула' : `Продукт стадии ${stepNumber}`}
        chem={step.product}
        revealed={productRevealed}
        hiddenHint={`Нажмите, чтобы открыть продукт ${stepNumber}`}
        isDark={isDark}
        adaptiveDark={adaptiveDark}
        onTapReveal={onToggleProduct}
        onZoom={() => onOpenZoom(step.product, `Продукт (стадия ${stepNumber})`)}
      />
    </div>
  );
};

interface DiagramCardProps {
  label: string;
  chem: ChemBitmap;
  revealed: boolean;
  hiddenHint?: string;
  isDark: boolean;
  adaptiveDark: boolean;
  onTapReveal: () => void;
  onZoom: () => void;
}

const DiagramCard: React.FC<DiagramCardProps> = ({
  label,
  chem,
  revealed,
  hiddenHint = '',
  isDark,
  adaptiveDark,
  onTapReveal,
  onZoom,
}) => (
  <div
    role="button"
    tabIndex={0}
    onClick={onTapReveal}
    onKeyDown={(e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        onTapReveal();
      }
    }}
    className={`diagram-card ${revealed ? '' : 'hidden'}`}
  >
    <div className="diagram-card-head">
      <span className="diagram-card-label">{label}</span>
      {revealed && (
        <button
          type="button"
          className="icon-circle-btn"
          style={{ width: 28, height: 28 }}
          onClick={(e) => {
            e.stopPropagation();
            onZoom();
          }}
          aria-label="Увеличить"
        >
          <ZoomIn size={15} />
        </button>
      )}
    </div>

    {revealed ? (
      <div className="diagram-body">
        <ChemDiagramImage
          chem={chem}
          alt={label}
          isDark={isDark}
          adaptiveDark={adaptiveDark}
        />
      </div>
    ) : (
      <div className="hidden-prompt" style={{ minHeight: 115 }}>
        <Hand size={26} />
        <span>{hiddenHint}</span>
      </div>
    )}
  </div>
);
