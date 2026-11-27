import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  CheckCircle2,
  Circle,
  Eye,
  EyeOff,
  Heart,
  Maximize2,
  Minus,
  Plus,
} from 'lucide-react';
import type { InorganicChainDetail } from '../types/models';
import { getGalaxyById } from '../data/galaxies';
import { hapticLight } from '../utils/telegram';

interface InorganicChainScreenProps {
  chain: InorganicChainDetail | null;
  isLoading: boolean;
  error: string | null;
  isFavorite: boolean;
  isCompleted: boolean;
  onBack: () => void;
  onToggleFavorite: () => void;
  onToggleCompleted: () => void;
}

interface BoardTransform {
  scale: number;
  x: number;
  y: number;
  fitScale: number;
}

function parseViewBoxDims(vb: string): { vx: number; vy: number; vw: number; vh: number } {
  const nums = vb
    .trim()
    .split(/[\s,]+/)
    .map((n) => parseFloat(n))
    .filter((n) => Number.isFinite(n));
  if (nums.length === 4 && nums[2] > 0 && nums[3] > 0) {
    return { vx: nums[0], vy: nums[1], vw: nums[2], vh: nums[3] };
  }
  return { vx: 0, vy: 0, vw: 475, vh: 700 };
}

export const InorganicChainScreen: React.FC<InorganicChainScreenProps> = ({
  chain,
  isLoading,
  error,
  isFavorite,
  isCompleted,
  onBack,
  onToggleFavorite,
  onToggleCompleted,
}) => {
  const panelRef = useRef<HTMLDivElement | null>(null);
  const pillRefs = useRef<Map<string, HTMLButtonElement>>(new Map());
  const [selectedX, setSelectedX] = useState<string | null>(null);
  const [hoveredX, setHoveredX] = useState<string | null>(null);
  const [revealedKeys, setRevealedKeys] = useState<Set<string>>(new Set());
  const [dragging, setDragging] = useState(false);
  const [tf, setTf] = useState<BoardTransform>({ scale: 1, x: 20, y: 20, fitScale: 1 });
  const tfRef = useRef(tf);
  tfRef.current = tf;

  const pointersRef = useRef<Map<number, { x: number; y: number }>>(new Map());
  const capturedPointerRef = useRef<number | null>(null);
  const dragRef = useRef<{ active: boolean; sx: number; sy: number; ox: number; oy: number }>({
    active: false,
    sx: 0,
    sy: 0,
    ox: 0,
    oy: 0,
  });
  const pinchRef = useRef<{ dist: number; scale: number; mx: number; my: number; ox: number; oy: number } | null>(null);
  const dragMovedRef = useRef(false);

  const vb = useMemo(() => parseViewBoxDims(chain?.viewbox || ''), [chain?.viewbox]);

  const compoundKeys = useMemo(() => {
    if (!chain) return [];
    return Object.keys(chain.compounds).sort((a, b) => Number(a) - Number(b));
  }, [chain]);

  const clampTransform = useCallback(
    (next: BoardTransform): BoardTransform => {
      const panel = panelRef.current;
      if (!panel) return next;
      const pw = panel.clientWidth || 720;
      const ph = panel.clientHeight || 560;
      const bw = vb.vw * next.scale;
      const bh = vb.vh * next.scale;
      const keepVisible = 80;
      const minX = Math.min(pw - keepVisible, keepVisible - bw);
      const maxX = Math.max(pw - keepVisible, keepVisible - bw);
      const minY = Math.min(ph - keepVisible, keepVisible - bh);
      const maxY = Math.max(ph - keepVisible, keepVisible - bh);
      return {
        ...next,
        x: Math.max(minX, Math.min(maxX, next.x)),
        y: Math.max(minY, Math.min(maxY, next.y)),
      };
    },
    [vb.vw, vb.vh],
  );

  const fitBoard = useCallback(() => {
    const panel = panelRef.current;
    if (!panel) return;
    const pw = panel.clientWidth || 720;
    const ph = panel.clientHeight || 560;
    const pad = 28;
    const fitScale = Math.min((pw - pad * 2) / vb.vw, (ph - pad * 2) / vb.vh);
    const scale = Math.max(0.25, Math.min(3.5, fitScale));
    const x = (pw - vb.vw * scale) / 2;
    const y = (ph - vb.vh * scale) / 2;
    setTf({ scale, x, y, fitScale: scale });
  }, [vb.vw, vb.vh]);

  useEffect(() => {
    setSelectedX(compoundKeys[0] ?? null);
    setHoveredX(null);
    setRevealedKeys(new Set());
    const id = requestAnimationFrame(fitBoard);
    return () => cancelAnimationFrame(id);
  }, [chain?.id, fitBoard, compoundKeys]);

  useEffect(() => {
    window.addEventListener('resize', fitBoard);
    return () => window.removeEventListener('resize', fitBoard);
  }, [fitBoard]);

  const zoomBy = useCallback(
    (factor: number, cx?: number, cy?: number) => {
      const panel = panelRef.current;
      if (!panel) return;
      const px = cx ?? panel.clientWidth / 2;
      const py = cy ?? panel.clientHeight / 2;
      setTf((prev) => {
        const nextScale = Math.max(
          prev.fitScale * 0.5,
          Math.min(prev.fitScale * 8, prev.scale * factor),
        );
        const ratio = nextScale / prev.scale;
        return clampTransform({
          ...prev,
          scale: nextScale,
          x: px - (px - prev.x) * ratio,
          y: py - (py - prev.y) * ratio,
        });
      });
    },
    [clampTransform],
  );

  // Non-passive wheel listener for smooth cursor-anchored zoom without scrolling the page
  useEffect(() => {
    const panel = panelRef.current;
    if (!panel) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const rect = panel.getBoundingClientRect();
      const factor = Math.max(0.75, Math.min(1.35, Math.exp(-e.deltaY * 0.0018)));
      zoomBy(factor, e.clientX - rect.left, e.clientY - rect.top);
    };
    panel.addEventListener('wheel', onWheel, { passive: false });
    return () => panel.removeEventListener('wheel', onWheel);
  }, [zoomBy, chain?.id, isLoading]);

  const focusOnCompound = useCallback(
    (xKey: string) => {
      const panel = panelRef.current;
      const comp = chain?.compounds[xKey];
      const box = comp?.boxes[0];
      if (!panel || !box) return;
      const pw = panel.clientWidth || 720;
      const ph = panel.clientHeight || 560;
      const bx = box.x + box.w / 2 - vb.vx;
      const by = box.y + box.h / 2 - vb.vy;
      setTf((prev) => {
        const sx = prev.x + bx * prev.scale;
        const sy = prev.y + by * prev.scale;
        const margin = 64;
        if (sx >= margin && sx <= pw - margin && sy >= margin && sy <= ph - margin) {
          return prev;
        }
        return clampTransform({
          ...prev,
          x: pw / 2 - bx * prev.scale,
          y: ph / 2 - by * prev.scale,
        });
      });
    },
    [chain, vb.vx, vb.vy, clampTransform],
  );

  const handleSelectX = useCallback((xKey: string, focus = false) => {
    hapticLight();
    setSelectedX(xKey);
    requestAnimationFrame(() => {
      pillRefs.current.get(xKey)?.scrollIntoView({
        block: 'nearest',
        inline: 'nearest',
        behavior: 'smooth',
      });
    });
    if (focus) focusOnCompound(xKey);
  }, [focusOnCompound]);

  const handleRevealX = useCallback((xKey: string) => {
    hapticLight();
    setRevealedKeys((prev) => {
      const next = new Set(prev);
      next.add(xKey);
      return next;
    });
  }, []);

  // Keyboard shortcuts: + / - zoom, 0 fit, ArrowLeft/ArrowRight cycle X
  useEffect(() => {
    if (!chain) return;
    const onKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      if (e.key === '+' || e.key === '=') {
        e.preventDefault();
        zoomBy(1.18);
      } else if (e.key === '-' || e.key === '_') {
        e.preventDefault();
        zoomBy(0.84);
      } else if (e.key === '0') {
        e.preventDefault();
        fitBoard();
      } else if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
        if (compoundKeys.length === 0) return;
        e.preventDefault();
        const curIdx = selectedX ? compoundKeys.indexOf(selectedX) : -1;
        const delta = e.key === 'ArrowRight' ? 1 : -1;
        const nextIdx =
          curIdx === -1 ? 0 : (curIdx + delta + compoundKeys.length) % compoundKeys.length;
        handleSelectX(compoundKeys[nextIdx], true);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [chain, compoundKeys, selectedX, zoomBy, fitBoard, handleSelectX]);

  const handleRevealAll = () => {
    setRevealedKeys(new Set(compoundKeys));
  };

  const handleHideAll = () => {
    setRevealedKeys(new Set());
  };

  const activeCompound = chain && selectedX ? chain.compounds[selectedX] : null;
  const gal = chain ? getGalaxyById(chain.galaxyId) : null;

  return (
    <div className="chain-shell">
      <div className="chain-topbar">
        <div className="chain-topbar-inner">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
            <button type="button" className="syn-icon-btn" onClick={onBack} aria-label="Назад">
              <ArrowLeft size={20} />
            </button>
            <div style={{ minWidth: 0 }}>
              <div className="syn-title">{chain?.title || 'Загрузка цепочки…'}</div>
              <div className="syn-meta">
                {gal ? `${gal.label} · ` : ''}
                {chain?.groupTitle || ''}
                {chain?.bookPage ? ` · стр. ${chain.bookPage}` : ''}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <button
              type="button"
              className="btn-cta-secondary"
              style={{ width: 'auto', height: 36, padding: '0 12px', fontSize: 12.5 }}
              onClick={revealedKeys.size >= compoundKeys.length ? handleHideAll : handleRevealAll}
            >
              {revealedKeys.size >= compoundKeys.length ? <EyeOff size={15} /> : <Eye size={15} />}
              {revealedKeys.size >= compoundKeys.length ? 'Скрыть все' : 'Открыть все'}
            </button>
            <button type="button" className="syn-icon-btn" onClick={onToggleFavorite} aria-label="Избранное">
              <Heart
                size={19}
                color={isFavorite ? 'var(--primary)' : 'currentColor'}
                fill={isFavorite ? 'var(--primary)' : 'none'}
              />
            </button>
            <button type="button" className="syn-icon-btn" onClick={onToggleCompleted} aria-label="Изучено">
              {isCompleted ? (
                <CheckCircle2 size={19} color="var(--success)" />
              ) : (
                <Circle size={19} />
              )}
            </button>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="center-screen">
          <div className="spinner" />
          <div style={{ color: 'var(--on-surface-variant)' }}>Загрузка схемы элемента…</div>
        </div>
      ) : error || !chain ? (
        <div className="center-screen">
          <div style={{ color: 'var(--error)', fontWeight: 600 }}>{error || 'Цепочка не найдена'}</div>
        </div>
      ) : (
        <div className="chain-workspace">
          <div
            ref={panelRef}
            className={`chain-canvas-panel ${dragging ? 'dragging' : ''}`}
            onDoubleClick={(e) => {
              if ((e.target as HTMLElement).closest('button')) return;
              const rect = e.currentTarget.getBoundingClientRect();
              const cur = tfRef.current;
              if (cur.scale > cur.fitScale * 1.25) {
                fitBoard();
              } else {
                zoomBy(2, e.clientX - rect.left, e.clientY - rect.top);
              }
            }}
            onPointerDown={(e) => {
              if ((e.target as HTMLElement).closest('button')) return;
              pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

              if (pointersRef.current.size === 1) {
                dragMovedRef.current = false;
                dragRef.current = {
                  active: true,
                  sx: e.clientX,
                  sy: e.clientY,
                  ox: tfRef.current.x,
                  oy: tfRef.current.y,
                };
                pinchRef.current = null;
                setDragging(false);
              } else if (pointersRef.current.size === 2) {
                const pts = Array.from(pointersRef.current.values());
                const rect = e.currentTarget.getBoundingClientRect();
                const dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
                pinchRef.current = {
                  dist: Math.max(1, dist),
                  scale: tfRef.current.scale,
                  mx: (pts[0].x + pts[1].x) / 2 - rect.left,
                  my: (pts[0].y + pts[1].y) / 2 - rect.top,
                  ox: tfRef.current.x,
                  oy: tfRef.current.y,
                };
                dragRef.current.active = false;
                dragMovedRef.current = true;
              }
            }}
            onPointerMove={(e) => {
              if (!pointersRef.current.has(e.pointerId)) return;
              pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

              if (pointersRef.current.size === 2 && pinchRef.current) {
                const pts = Array.from(pointersRef.current.values());
                const dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
                const p = pinchRef.current;
                setTf((prev) => {
                  const nextScale = Math.max(
                    prev.fitScale * 0.5,
                    Math.min(prev.fitScale * 8, p.scale * (dist / p.dist)),
                  );
                  const ratio = nextScale / p.scale;
                  return clampTransform({
                    ...prev,
                    scale: nextScale,
                    x: p.mx - (p.mx - p.ox) * ratio,
                    y: p.my - (p.my - p.oy) * ratio,
                  });
                });
              } else if (pointersRef.current.size === 1 && dragRef.current.active) {
                const dx = e.clientX - dragRef.current.sx;
                const dy = e.clientY - dragRef.current.sy;
                if (!dragMovedRef.current && Math.hypot(dx, dy) > 5) {
                  dragMovedRef.current = true;
                  setDragging(true);
                  if (capturedPointerRef.current !== e.pointerId) {
                    try {
                      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
                      capturedPointerRef.current = e.pointerId;
                    } catch {
                      // ignore
                    }
                  }
                }
                if (dragMovedRef.current) {
                  setTf((prev) =>
                    clampTransform({
                      ...prev,
                      x: dragRef.current.ox + dx,
                      y: dragRef.current.oy + dy,
                    }),
                  );
                }
              }
            }}
            onPointerUp={(e) => {
              pointersRef.current.delete(e.pointerId);
              if (capturedPointerRef.current === e.pointerId) {
                try {
                  (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
                } catch {
                  // ignore
                }
                capturedPointerRef.current = null;
              }
              if (pointersRef.current.size < 2) pinchRef.current = null;
              if (pointersRef.current.size === 0) {
                dragRef.current.active = false;
                setDragging(false);
              }
            }}
            onPointerCancel={(e) => {
              pointersRef.current.delete(e.pointerId);
              if (capturedPointerRef.current === e.pointerId) {
                try {
                  (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
                } catch {
                  // ignore
                }
                capturedPointerRef.current = null;
              }
              pinchRef.current = null;
              dragRef.current.active = false;
              setDragging(false);
            }}
          >
            <div
              className="chain-board-transform"
              style={{
                width: vb.vw,
                height: vb.vh,
                transform: `translate(${tf.x}px, ${tf.y}px) scale(${tf.scale})`,
              }}
            >
              <div
                className="chain-svg-layer"
                style={{ width: '100%', height: '100%' }}
                dangerouslySetInnerHTML={{ __html: chain.svg }}
              />

              <svg
                className="chain-hot-overlay"
                viewBox={`${vb.vx} ${vb.vy} ${vb.vw} ${vb.vh}`}
                preserveAspectRatio="none"
              >
                {compoundKeys.map((xKey) => {
                  const comp = chain.compounds[xKey];
                  const isHov = hoveredX === xKey;
                  return comp.boxes.map((box, bIdx) => (
                    <rect
                      key={`${xKey}-${bIdx}`}
                      x={box.x}
                      y={box.y}
                      width={box.w}
                      height={box.h}
                      rx={1.5}
                      className={`chain-box-rect ${isHov ? 'hovered' : ''}`}
                      onMouseEnter={() => setHoveredX(xKey)}
                      onMouseLeave={() => setHoveredX((cur) => (cur === xKey ? null : cur))}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (dragMovedRef.current) return;
                        handleSelectX(xKey);
                      }}
                    >
                      <title>X{xKey}: нажмите, чтобы выбрать в панели справа</title>
                    </rect>
                  ));
                })}
              </svg>
            </div>

            <div className="chain-zoom-bar">
              <button type="button" onClick={() => zoomBy(0.84)} aria-label="Уменьшить">
                <Minus size={15} />
              </button>
              <button type="button" onClick={fitBoard} aria-label="Сбросить масштаб">
                <Maximize2 size={14} /> {Math.round((tf.scale / tf.fitScale) * 100)}%
              </button>
              <button type="button" onClick={() => zoomBy(1.18)} aria-label="Увеличить">
                <Plus size={15} />
              </button>
            </div>
          </div>

          <aside className="chain-inspector">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 13, fontWeight: 700 }}>Соединения X</span>
              <span className="mono" style={{ fontSize: 12, color: 'var(--on-surface-variant)' }}>
                {revealedKeys.size} / {compoundKeys.length} открыто
              </span>
            </div>

            <div className="compound-pills-grid">
              {compoundKeys.map((xKey) => {
                const isActive = selectedX === xKey;
                const isRev = revealedKeys.has(xKey);
                return (
                  <button
                    key={xKey}
                    ref={(el) => {
                      if (el) pillRefs.current.set(xKey, el);
                      else pillRefs.current.delete(xKey);
                    }}
                    type="button"
                    className={`compound-x-btn ${isRev ? 'revealed' : ''} ${isActive ? 'active' : ''}`}
                    onClick={() => handleSelectX(xKey, true)}
                  >
                    X{xKey}
                  </button>
                );
              })}
            </div>

            {selectedX && activeCompound ? (
              <div className="inspector-detail-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span className="stage-pill">Вещество X{selectedX}</span>
                  {!revealedKeys.has(selectedX) && (
                    <button
                      type="button"
                      className="link-btn"
                      onClick={() => handleRevealX(selectedX)}
                    >
                      Открыть ответ
                    </button>
                  )}
                </div>

                {revealedKeys.has(selectedX) ? (
                  <>
                    <div
                      className="inspector-formula"
                      dangerouslySetInnerHTML={{
                        __html: activeCompound.formulaHtml || activeCompound.formulaPlain,
                      }}
                    />
                    {activeCompound.trivial && (
                      <div className="inspector-kv">
                        <span className="inspector-kv-label">Тривиальное название</span>
                        <span>{activeCompound.trivial}</span>
                      </div>
                    )}
                    {activeCompound.color && (
                      <div className="inspector-kv">
                        <span className="inspector-kv-label">Цвет / вид</span>
                        <span>{activeCompound.color}</span>
                      </div>
                    )}
                    {activeCompound.omega && (
                      <div className="inspector-kv">
                        <span className="inspector-kv-label">{chain.omegaLabel}, %</span>
                        <span className="mono">{activeCompound.omega}%</span>
                      </div>
                    )}
                    {activeCompound.sources && (
                      <div className="inspector-kv">
                        <span className="inspector-kv-label">Источники</span>
                        <span style={{ color: 'var(--on-surface-variant)' }}>{activeCompound.sources}</span>
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    {activeCompound.omega && (
                      <div className="inspector-kv">
                        <span className="inspector-kv-label">{chain.omegaLabel}, %</span>
                        <span className="mono" style={{ fontSize: 16, fontWeight: 700, color: 'var(--primary)' }}>
                          {activeCompound.omega}%
                        </span>
                      </div>
                    )}
                    <div style={{ fontSize: 13, color: 'var(--on-surface-variant)', padding: '2px 0' }}>
                      Нажмите «Открыть ответ», чтобы увидеть формулу и свойства.
                    </div>
                  </>
                )}
              </div>
            ) : (
              <div className="inspector-detail-card" style={{ color: 'var(--on-surface-variant)', fontSize: 13.5 }}>
                Наведите и кликните по веществу X на схеме или выберите номер выше.
              </div>
            )}

            {chain.notes && (
              <div className="inspector-kv" style={{ paddingTop: 6, borderTop: '1px solid var(--outline-variant)' }}>
                <span className="inspector-kv-label">Примечания к схеме</span>
                <span style={{ fontSize: 12.5, lineHeight: 1.45, color: 'var(--on-surface-variant)' }}>
                  {chain.notes}
                </span>
              </div>
            )}
          </aside>
        </div>
      )}
    </div>
  );
};
