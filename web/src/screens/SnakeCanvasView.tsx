import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Eye, EyeOff, Maximize2, Minus, Plus } from 'lucide-react';
import type { ChemBitmap, SequenceModel } from '../types/models';
import { SCREEN_SNAKE_CONFIG, buildSnakeBoard } from '../layout/snakeLayout';
import { hapticLight } from '../utils/telegram';

interface SnakeCanvasViewProps {
  sequence: SequenceModel;
  revealedNodes: Set<number>;
  isDark: boolean;
  adaptiveDark: boolean;
  onRevealedNodesChange: (next: Set<number>) => void;
}

function tintCanvas(src: HTMLCanvasElement, color: string): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = src.width;
  c.height = src.height;
  const ctx = c.getContext('2d');
  if (!ctx) return src;
  ctx.drawImage(src, 0, 0);
  ctx.globalCompositeOperation = 'source-in';
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, c.width, c.height);
  return c;
}

export const SnakeCanvasView: React.FC<SnakeCanvasViewProps> = ({
  sequence,
  revealedNodes,
  isDark,
  adaptiveDark,
  onRevealedNodesChange,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const board = useMemo(() => buildSnakeBoard(sequence, SCREEN_SNAKE_CONFIG), [sequence]);
  const useDarkBoard = isDark && adaptiveDark;
  const inkColor = useDarkBoard ? '#E6EDF3' : '#0F172A';

  // Prepare tinted monochrome canvases once per board/theme
  const drawableMap = useMemo(() => {
    const map = new Map<HTMLCanvasElement, HTMLCanvasElement>();
    const process = (bmp: ChemBitmap) => {
      if (map.has(bmp.canvas)) return;
      if (!bmp.isColored && useDarkBoard) {
        map.set(bmp.canvas, tintCanvas(bmp.canvas, '#E6EDF3'));
      } else if (!bmp.isColored) {
        map.set(bmp.canvas, tintCanvas(bmp.canvas, '#0F172A'));
      } else {
        map.set(bmp.canvas, bmp.canvas);
      }
    };
    board.nodes.forEach((n) => process(n.bitmap));
    board.labels.forEach((l) => process(l.bitmap));
    return map;
  }, [board, useDarkBoard]);

  const hiddenCount = useMemo(
    () => board.nodes.filter((n) => n.hiddenByDefault).length,
    [board],
  );
  const allRevealed = hiddenCount > 0 && revealedNodes.size >= hiddenCount;

  const transformRef = useRef({ scale: 1, panX: 0, panY: 0, fitScale: 1 });
  const [size, setSize] = useState({ w: 300, h: 300 });

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const w = size.w;
    const h = size.h;
    if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) {
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
    }

    ctx.save();
    ctx.scale(dpr, dpr);

    // Background
    ctx.fillStyle = useDarkBoard ? '#0D1117' : '#FFFFFF';
    ctx.fillRect(0, 0, w, h);

    const { scale, panX, panY } = transformRef.current;
    ctx.translate(panX, panY);
    ctx.scale(scale, scale);

    // Arrows
    const arrowStroke = Math.max(5.5, 1.8 / scale);
    const headLen = Math.max(28, 9 / scale);
    const headW = headLen * 0.45;
    ctx.strokeStyle = inkColor;
    ctx.fillStyle = inkColor;
    ctx.lineWidth = arrowStroke;
    ctx.lineCap = 'round';

    for (const a of board.arrows) {
      const angle = Math.atan2(a.y2 - a.y1, a.x2 - a.x1);
      const ex = a.x2 - Math.cos(angle) * (headLen * 0.7);
      const ey = a.y2 - Math.sin(angle) * (headLen * 0.7);
      ctx.beginPath();
      ctx.moveTo(a.x1, a.y1);
      ctx.lineTo(ex, ey);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(a.x2, a.y2);
      ctx.lineTo(
        a.x2 - Math.cos(angle) * headLen + Math.sin(angle) * headW,
        a.y2 - Math.sin(angle) * headLen - Math.cos(angle) * headW,
      );
      ctx.lineTo(
        a.x2 - Math.cos(angle) * headLen - Math.sin(angle) * headW,
        a.y2 - Math.sin(angle) * headLen + Math.cos(angle) * headW,
      );
      ctx.closePath();
      ctx.fill();
    }

    // Labels
    for (const l of board.labels) {
      if (l.bitmap.isColored && useDarkBoard) {
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.roundRect(l.x - 8, l.y - 8, l.width + 16, l.height + 16, 14);
        ctx.fill();
      }
      const img = drawableMap.get(l.bitmap.canvas) ?? l.bitmap.canvas;
      ctx.drawImage(img, l.x, l.y, l.width, l.height);
    }

    // Nodes
    const maskFill = useDarkBoard ? '#1E293B' : '#F1F5F9';
    const maskStroke = useDarkBoard ? '#475569' : '#CBD5E1';
    const maskText = useDarkBoard ? '#CBD5E1' : '#334155';

    for (const n of board.nodes) {
      const isMasked = n.hiddenByDefault && !revealedNodes.has(n.index);
      if (isMasked) {
        const cr = Math.max(20, 10 / scale);
        ctx.fillStyle = maskFill;
        ctx.strokeStyle = maskStroke;
        ctx.lineWidth = Math.max(4, 1.5 / scale);
        ctx.beginPath();
        ctx.roundRect(n.x, n.y, n.width, n.height, cr);
        ctx.fill();
        ctx.stroke();

        const fontSize = Math.max(48, Math.min(130, Math.min(n.width, n.height) * 0.28));
        ctx.fillStyle = maskText;
        ctx.font = `bold ${fontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(String(n.stageNumber), n.x + n.width / 2, n.y + n.height / 2);
      } else {
        if (n.bitmap.isColored && useDarkBoard) {
          ctx.fillStyle = '#FFFFFF';
          ctx.beginPath();
          ctx.roundRect(n.x - 10, n.y - 10, n.width + 20, n.height + 20, 16);
          ctx.fill();
        }
        const img = drawableMap.get(n.bitmap.canvas) ?? n.bitmap.canvas;
        ctx.drawImage(img, n.x, n.y, n.width, n.height);
      }
    }

    ctx.restore();
  }, [board, drawableMap, inkColor, revealedNodes, size, useDarkBoard]);

  const resetFit = useCallback(() => {
    const fitScale = Math.min(size.w / Math.max(1, board.width), size.h / Math.max(1, board.height)) * 0.94;
    transformRef.current = {
      scale: fitScale,
      fitScale,
      panX: (size.w - board.width * fitScale) / 2,
      panY: (size.h - board.height * fitScale) / 2,
    };
    draw();
  }, [board, draw, size]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const cr = entry.contentRect;
        if (cr.width > 0 && cr.height > 0) {
          setSize({ w: cr.width, h: cr.height });
        }
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    resetFit();
  }, [resetFit]);

  useEffect(() => {
    draw();
  }, [draw]);

  const zoomAt = (px: number, py: number, factor: number) => {
    const t = transformRef.current;
    const minScale = Math.max(0.02, t.fitScale * 0.45);
    const maxScale = Math.max(1.5, t.fitScale * 14);
    const next = Math.max(minScale, Math.min(maxScale, t.scale * factor));
    const ratio = next / t.scale;
    t.panX = px - (px - t.panX) * ratio;
    t.panY = py - (py - t.panY) * ratio;
    t.scale = next;
    draw();
  };

  // Pointer gesture handling (pan, pinch, tap, double-tap)
  const pointersRef = useRef<Map<number, { x: number; y: number }>>(new Map());
  const gestureRef = useRef<{
    startX: number;
    startY: number;
    moved: boolean;
    lastPinchDist: number;
    lastMidX: number;
    lastMidY: number;
  }>({ startX: 0, startY: 0, moved: false, lastPinchDist: 0, lastMidX: 0, lastMidY: 0 });
  const lastTapRef = useRef(0);

  const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    pointersRef.current.set(e.pointerId, { x, y });

    if (pointersRef.current.size === 1) {
      gestureRef.current = {
        startX: x,
        startY: y,
        moved: false,
        lastPinchDist: 0,
        lastMidX: x,
        lastMidY: y,
      };
    } else if (pointersRef.current.size === 2) {
      const pts = Array.from(pointersRef.current.values());
      gestureRef.current.lastPinchDist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
      gestureRef.current.lastMidX = (pts[0].x + pts[1].x) / 2;
      gestureRef.current.lastMidY = (pts[0].y + pts[1].y) / 2;
      gestureRef.current.moved = true;
    }
  };

  const onPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!pointersRef.current.has(e.pointerId)) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const prev = pointersRef.current.get(e.pointerId)!;
    pointersRef.current.set(e.pointerId, { x, y });

    if (pointersRef.current.size === 1) {
      const dx = x - prev.x;
      const dy = y - prev.y;
      if (Math.hypot(x - gestureRef.current.startX, y - gestureRef.current.startY) > 6) {
        gestureRef.current.moved = true;
      }
      transformRef.current.panX += dx;
      transformRef.current.panY += dy;
      draw();
    } else if (pointersRef.current.size === 2) {
      const pts = Array.from(pointersRef.current.values());
      const dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
      const midX = (pts[0].x + pts[1].x) / 2;
      const midY = (pts[0].y + pts[1].y) / 2;

      const t = transformRef.current;
      const minScale = Math.max(0.02, t.fitScale * 0.45);
      const maxScale = Math.max(1.5, t.fitScale * 14);
      const factor = dist / Math.max(1, gestureRef.current.lastPinchDist);
      const nextScale = Math.max(minScale, Math.min(maxScale, t.scale * factor));
      const ratio = nextScale / t.scale;

      t.panX = midX - (midX - t.panX) * ratio + (midX - gestureRef.current.lastMidX);
      t.panY = midY - (midY - t.panY) * ratio + (midY - gestureRef.current.lastMidY);
      t.scale = nextScale;

      gestureRef.current.lastPinchDist = dist;
      gestureRef.current.lastMidX = midX;
      gestureRef.current.lastMidY = midY;
      gestureRef.current.moved = true;
      draw();
    }
  };

  const onPointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const wasSingleTap = pointersRef.current.size === 1 && !gestureRef.current.moved;
    pointersRef.current.delete(e.pointerId);

    if (wasSingleTap) {
      const t = transformRef.current;
      const bx = (x - t.panX) / t.scale;
      const by = (y - t.panY) / t.scale;
      const hit = board.nodes.find(
        (n) =>
          n.hiddenByDefault &&
          bx >= n.x - 16 &&
          bx <= n.x + n.width + 16 &&
          by >= n.y - 16 &&
          by <= n.y + n.height + 16,
      );

      if (hit) {
        hapticLight();
        const next = new Set(revealedNodes);
        if (next.has(hit.index)) next.delete(hit.index);
        else next.add(hit.index);
        onRevealedNodesChange(next);
        return;
      }

      const now = Date.now();
      if (now - lastTapRef.current < 280) {
        if (t.scale > t.fitScale * 1.4) resetFit();
        else zoomAt(x, y, 2.4);
        lastTapRef.current = 0;
      } else {
        lastTapRef.current = now;
      }
    }
  };

  const onWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    zoomAt(x, y, e.deltaY < 0 ? 1.15 : 0.87);
  };

  return (
    <div ref={containerRef} className="snake-container">
      <canvas
        ref={canvasRef}
        className="snake-canvas"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onWheel={onWheel}
      />

      {hiddenCount > 0 && (
        <div className="snake-hint-pill">
          Нажмите на карточку с номером, чтобы открыть · зум двумя пальцами
        </div>
      )}

      <div className="snake-controls">
        <button
          type="button"
          onClick={() => zoomAt(size.w / 2, size.h / 2, 0.78)}
          aria-label="Уменьшить"
        >
          <Minus size={18} />
        </button>
        <button type="button" onClick={resetFit} aria-label="Вместить">
          <Maximize2 size={17} />
        </button>
        <button
          type="button"
          onClick={() => zoomAt(size.w / 2, size.h / 2, 1.28)}
          aria-label="Увеличить"
        >
          <Plus size={18} />
        </button>
        {hiddenCount > 0 && (
          <button
            type="button"
            onClick={() => {
              hapticLight();
              if (allRevealed) {
                onRevealedNodesChange(new Set());
              } else {
                onRevealedNodesChange(
                  new Set(board.nodes.filter((n) => n.hiddenByDefault).map((n) => n.index)),
                );
              }
            }}
            aria-label={allRevealed ? 'Скрыть промежуточные' : 'Показать все'}
            style={{ color: 'var(--primary)' }}
          >
            {allRevealed ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        )}
      </div>
    </div>
  );
};
