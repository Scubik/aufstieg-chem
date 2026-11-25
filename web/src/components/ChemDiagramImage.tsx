import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Maximize2, X } from 'lucide-react';
import type { ChemBitmap } from '../types/models';

interface ChemDiagramImageProps {
  chem: ChemBitmap;
  alt: string;
  isDark: boolean;
  adaptiveDark: boolean;
  className?: string;
}

function getChemDataUrl(chem: ChemBitmap): string {
  if (!chem.dataUrl) {
    chem.dataUrl = chem.canvas.toDataURL('image/png');
  }
  return chem.dataUrl;
}

export const ChemDiagramImage: React.FC<ChemDiagramImageProps> = ({
  chem,
  alt,
  isDark,
  adaptiveDark,
  className = '',
}) => {
  const src = useMemo(() => getChemDataUrl(chem), [chem]);
  const needsPaperPlate = chem.isColored || (isDark && !adaptiveDark);
  // Monochrome black-ink PNGs invert cleanly to light ink (#E6EDF3-like) in adaptive dark mode
  const invertMono = !chem.isColored && isDark && adaptiveDark;

  if (needsPaperPlate) {
    return (
      <div className={`chem-paper-plate ${className}`}>
        <img
          src={src}
          alt={alt}
          className="chem-img"
          draggable={false}
        />
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      className={`chem-img ${invertMono ? 'chem-img-dark-invert' : ''} ${className}`}
      draggable={false}
    />
  );
};

interface ZoomableImageDialogProps {
  chem: ChemBitmap;
  title: string;
  isDark: boolean;
  adaptiveDark: boolean;
  onClose: () => void;
}

export const ZoomableImageDialog: React.FC<ZoomableImageDialogProps> = ({
  chem,
  title,
  isDark,
  adaptiveDark,
  onClose,
}) => {
  const [scale, setScale] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const pointersRef = useRef<Map<number, { x: number; y: number }>>(new Map());
  const pinchStartRef = useRef<{ dist: number; scale: number } | null>(null);
  const dragStartRef = useRef<{ x: number; y: number; panX: number; panY: number } | null>(null);
  const lastTapRef = useRef<number>(0);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const reset = () => {
    setScale(1);
    setPan({ x: 0, y: 0 });
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (pointersRef.current.size === 1) {
      const now = Date.now();
      if (now - lastTapRef.current < 280) {
        if (scale > 1.2) {
          reset();
        } else {
          setScale(2.5);
        }
        lastTapRef.current = 0;
        return;
      }
      lastTapRef.current = now;
      dragStartRef.current = { x: e.clientX, y: e.clientY, panX: pan.x, panY: pan.y };
      pinchStartRef.current = null;
    } else if (pointersRef.current.size === 2) {
      const pts = Array.from(pointersRef.current.values());
      const dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
      pinchStartRef.current = { dist, scale };
      dragStartRef.current = null;
    }
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!pointersRef.current.has(e.pointerId)) return;
    pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (pointersRef.current.size === 2 && pinchStartRef.current) {
      const pts = Array.from(pointersRef.current.values());
      const dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
      const nextScale = Math.max(1, Math.min(6, pinchStartRef.current.scale * (dist / Math.max(1, pinchStartRef.current.dist))));
      setScale(nextScale);
      if (nextScale <= 1.01) setPan({ x: 0, y: 0 });
    } else if (pointersRef.current.size === 1 && dragStartRef.current && scale > 1.02) {
      const dx = e.clientX - dragStartRef.current.x;
      const dy = e.clientY - dragStartRef.current.y;
      setPan({ x: dragStartRef.current.panX + dx, y: dragStartRef.current.panY + dy });
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    pointersRef.current.delete(e.pointerId);
    if (pointersRef.current.size < 2) pinchStartRef.current = null;
    if (pointersRef.current.size === 0) dragStartRef.current = null;
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const factor = e.deltaY < 0 ? 1.15 : 0.87;
    const next = Math.max(1, Math.min(6, scale * factor));
    setScale(next);
    if (next <= 1.01) setPan({ x: 0, y: 0 });
  };

  return (
    <div className="zoom-overlay" role="dialog" aria-modal="true">
      <div className="zoom-topbar">
        <div className="zoom-title-pill">{title}</div>
        <div className="zoom-actions">
          {scale > 1.05 && (
            <button type="button" className="icon-circle-btn" onClick={reset} aria-label="Сбросить зум">
              <Maximize2 size={18} />
            </button>
          )}
          <button type="button" className="icon-circle-btn" onClick={onClose} aria-label="Закрыть">
            <X size={20} />
          </button>
        </div>
      </div>

      <div
        className="zoom-stage"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onWheel={handleWheel}
      >
        <div
          className="zoom-content"
          style={{
            transform: `translate3d(${pan.x}px, ${pan.y}px, 0) scale(${scale})`,
          }}
        >
          <ChemDiagramImage
            chem={chem}
            alt={title}
            isDark={isDark}
            adaptiveDark={adaptiveDark}
            className="zoom-diagram"
          />
        </div>
      </div>
    </div>
  );
};
