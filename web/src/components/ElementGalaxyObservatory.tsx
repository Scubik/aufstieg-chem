import React, { useEffect, useRef, useState } from 'react';
import { ELEMENT_GALAXIES, type ElementGalaxyConfig, type GalaxyElementStar } from '../data/galaxies';
import type { GalaxyId } from '../types/models';
import { getElementPixelSprite } from './pixelElementSprites';

interface ElementGalaxyObservatoryProps {
  isDark: boolean;
  onSelectGalaxy: (galaxyId: GalaxyId) => void;
  onOpenChain: (chainId: string) => void;
}

interface ProjectedStoneHit {
  x: number;
  y: number;
  size: number;
  galaxy: ElementGalaxyConfig;
  element: GalaxyElementStar;
}

interface ProjectedIslandHit {
  x: number;
  y: number;
  r: number;
  galaxy: ElementGalaxyConfig;
}

interface TooltipState {
  x: number;
  y: number;
  galaxy: ElementGalaxyConfig;
  element: GalaxyElementStar;
}

const ISLAND_POSITIONS: Record<
  GalaxyId,
  { rx: number; ry: number; orbitRx: number; orbitRy: number; bobSpeed: number; bobAmp: number }
> = {
  s: { rx: 0.14, ry: 0.24, orbitRx: 62, orbitRy: 22, bobSpeed: 1.05, bobAmp: 4 },
  p: { rx: 0.42, ry: 0.16, orbitRx: 78, orbitRy: 26, bobSpeed: 1.24, bobAmp: 5 },
  'noble-gases': { rx: 0.76, ry: 0.21, orbitRx: 60, orbitRy: 21, bobSpeed: 0.92, bobAmp: 6 },
  d: { rx: 0.24, ry: 0.56, orbitRx: 74, orbitRy: 24, bobSpeed: 1.15, bobAmp: 4 },
  'platinum-noble': { rx: 0.58, ry: 0.41, orbitRx: 62, orbitRy: 22, bobSpeed: 1.32, bobAmp: 5 },
  f: { rx: 0.85, ry: 0.55, orbitRx: 66, orbitRy: 23, bobSpeed: 0.98, bobAmp: 5 },
};

// Exact waving flag pixel frames from cbyd_flashcards/pixel_art.py relative to pole base (0, 0)
const FLAG_FRAMES: Array<Array<[number, number]>> = [
  [
    [1, -5], [2, -5],
    [1, -4], [2, -4], [3, -4], [4, -4],
    [1, -3], [2, -3], [3, -3], [4, -3],
  ],
  [
    [1, -5], [2, -5], [4, -5],
    [1, -4], [2, -4], [3, -4], [4, -4], [5, -4],
    [1, -3], [2, -3], [3, -3],
  ],
  [
    [3, -6],
    [1, -5], [2, -5], [3, -5], [4, -5],
    [1, -4], [2, -4], [4, -4], [5, -4],
    [1, -3], [2, -3],
  ],
  [
    [1, -5], [2, -5],
    [1, -4], [2, -4], [3, -4],
    [1, -3], [2, -3], [3, -3], [4, -3], [5, -3],
  ],
];

interface ElementOrbitSeed {
  angleOffset: number;
  rxMult: number;
  ryMult: number;
  cosTilt: number;
  sinTilt: number;
  speedMult: number;
  yOffset: number;
  bobPhase: number;
  bobFreq: number;
  bobAmp: number;
}

function createRng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function loadSprite(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to load ${src}`));
    img.src = src;
  });
}

export const ElementGalaxyObservatory: React.FC<ElementGalaxyObservatoryProps> = ({
  isDark,
  onSelectGalaxy,
  onOpenChain,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);
  const [cursorPointer, setCursorPointer] = useState(false);

  const isDarkRef = useRef(isDark);
  isDarkRef.current = isDark;

  const callbacksRef = useRef({ onSelectGalaxy, onOpenChain });
  callbacksRef.current = { onSelectGalaxy, onOpenChain };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let cancelled = false;
    let rafId = 0;

    const spriteEntries: Array<[string, string]> = [
      ['mountains-far', './art/mountains-far.png'],
      ['mountains-near', './art/mountains-near.png'],
      ['mountains-far-day', './art/mountains-far-day.png'],
      ['mountains-near-day', './art/mountains-near-day.png'],
      ['island-s', './art/island-s.png'],
      ['island-p', './art/island-p.png'],
      ['island-noble-gases', './art/island-noble-gases.png'],
      ['island-d', './art/island-d.png'],
      ['island-platinum-noble', './art/island-platinum-noble.png'],
      ['island-f', './art/island-f.png'],
    ];

    const sprites = new Map<string, HTMLImageElement>();
    Promise.all(
      spriteEntries.map(async ([key, url]) => {
        try {
          const img = await loadSprite(url);
          if (!cancelled) sprites.set(key, img);
        } catch {
          // ignore
        }
      }),
    );

    const rng = createRng(424242);
    const skyStars = Array.from({ length: 95 }, () => ({
      rx: rng(),
      ry: rng() * 0.78,
      pxSize: rng() > 0.72 ? 4 : 2,
      isCross: rng() > 0.88,
      phase: rng() * Math.PI * 2,
      speed: 0.7 + rng() * 1.4,
      baseAlpha: 0.3 + rng() * 0.55,
    }));

    const dayClouds = [
      { rx: 0.16, ry: 0.11, speed: 0.008, scale: 3 },
      { rx: 0.56, ry: 0.15, speed: 0.005, scale: 2 },
      { rx: 0.82, ry: 0.09, speed: 0.006, scale: 3 },
    ];

    const orbitRng = createRng(918273);
    const orbitSeeds = new Map<string, ElementOrbitSeed>();
    const shellRadii = [0.76, 1.04, 1.32];
    const shellYOffsets = [-8, 1, 9];
    const shellTilts = [-0.26, 0.16, -0.1];
    const shellSpeeds = [1.12, 0.86, 0.68];

    for (const galaxy of ELEMENT_GALAXIES) {
      const count = galaxy.stars.length;
      const shellCount = count > 14 ? 3 : count > 7 ? 2 : 1;
      const shells: number[][] = Array.from({ length: shellCount }, () => []);
      galaxy.stars.forEach((_, idx) => {
        shells[idx % shellCount].push(idx);
      });

      shells.forEach((memberIndices, shellIdx) => {
        const tilt = shellTilts[shellIdx % shellTilts.length];
        const cosTilt = Math.cos(tilt);
        const sinTilt = Math.sin(tilt);
        const rxMult = shellRadii[shellIdx % shellRadii.length];
        const ryMult = rxMult * (0.94 + shellIdx * 0.1);
        const speedMult = shellSpeeds[shellIdx % shellSpeeds.length];
        const yOffset = shellYOffsets[shellIdx % shellYOffsets.length];
        const phaseShift = shellIdx * 0.85;

        memberIndices.forEach((starIdx, slotIdx) => {
          const el = galaxy.stars[starIdx];
          const base = (slotIdx / memberIndices.length) * Math.PI * 2 + phaseShift;
          orbitSeeds.set(`${galaxy.id}:${el.symbol}`, {
            angleOffset: base + (orbitRng() - 0.5) * 0.32,
            rxMult,
            ryMult,
            cosTilt,
            sinTilt,
            speedMult,
            yOffset,
            bobPhase: orbitRng() * Math.PI * 2,
            bobFreq: 1.0 + orbitRng() * 1.1,
            bobAmp: 1.5 + orbitRng() * 0.7,
          });
        });
      });
    }

    let width = 760;
    let height = 490;
    let targetMouseX = 0;
    let targetMouseY = 0;
    let smoothMouseX = 0;
    let smoothMouseY = 0;

    let stoneHits: ProjectedStoneHit[] = [];
    let islandHits: ProjectedIslandHit[] = [];
    let hoveredStone: ProjectedStoneHit | null = null;
    let hoveredIsland: ElementGalaxyConfig | null = null;

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = canvas.clientWidth || 760;
      height = canvas.clientHeight || 490;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.imageSmoothingEnabled = false;
    };

    const drawTiledMountains = (
      img: HTMLImageElement | undefined,
      scale: number,
      offsetX: number,
      alpha: number,
    ) => {
      if (!img || !img.complete || img.width === 0) return;
      const drawW = img.width * scale;
      const drawH = img.height * scale;
      const y = Math.round(height - drawH);
      let startX = Math.round(((offsetX % drawW) + drawW) % drawW) - drawW;
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.imageSmoothingEnabled = false;
      while (startX < width) {
        ctx.drawImage(img, Math.round(startX), y, drawW, drawH);
        startX += drawW;
      }
      ctx.restore();
    };

    const drawPixelSun = (t: number) => {
      const sx = Math.round(width - 74 + smoothMouseX * 4);
      const sy = Math.round(52 + smoothMouseY * 3);
      const pulse = Math.sin(t * 1.8) > 0 ? 1 : 0;

      ctx.save();
      // Outer warm pixel halo
      ctx.fillStyle = 'rgba(253, 224, 71, 0.25)';
      ctx.fillRect(sx - 22 - pulse * 2, sy - 22 - pulse * 2, 44 + pulse * 4, 44 + pulse * 4);
      // Sun rays
      ctx.fillStyle = '#fde047';
      ctx.fillRect(sx - 24 - pulse * 3, sy - 2, 6, 4);
      ctx.fillRect(sx + 18 + pulse * 3, sy - 2, 6, 4);
      ctx.fillRect(sx - 2, sy - 24 - pulse * 3, 4, 6);
      ctx.fillRect(sx - 2, sy + 18 + pulse * 3, 4, 6);
      // Sun body
      ctx.fillStyle = '#facc15';
      ctx.fillRect(sx - 14, sy - 10, 28, 20);
      ctx.fillRect(sx - 10, sy - 14, 20, 28);
      // Bright center
      ctx.fillStyle = '#fef9c3';
      ctx.fillRect(sx - 8, sy - 8, 16, 16);
      ctx.restore();
    };

    const drawDayCloud = (cx: number, cy: number, sc: number) => {
      ctx.save();
      ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
      ctx.fillRect(cx - 10 * sc, cy - 2 * sc, 20 * sc, 5 * sc);
      ctx.fillRect(cx - 7 * sc, cy - 5 * sc, 12 * sc, 4 * sc);
      ctx.fillRect(cx - 3 * sc, cy - 7 * sc, 7 * sc, 3 * sc);
      ctx.fillStyle = 'rgba(186, 230, 253, 0.7)';
      ctx.fillRect(cx - 9 * sc, cy + 2 * sc, 18 * sc, 2 * sc);
      ctx.restore();
    };

    const draw = (now: number) => {
      const t = now * 0.001;
      const dark = isDarkRef.current;

      smoothMouseX += (targetMouseX - smoothMouseX) * 0.06;
      smoothMouseY += (targetMouseY - smoothMouseY) * 0.06;

      ctx.imageSmoothingEnabled = false;
      ctx.clearRect(0, 0, width, height);

      // 1. Sky (Night vs Clear Day)
      const skyGrad = ctx.createLinearGradient(0, 0, 0, height);
      if (dark) {
        skyGrad.addColorStop(0, '#040914');
        skyGrad.addColorStop(0.6, '#081529');
        skyGrad.addColorStop(1, '#0e2444');
      } else {
        skyGrad.addColorStop(0, '#60a5fa');
        skyGrad.addColorStop(0.55, '#93c5fd');
        skyGrad.addColorStop(1, '#dbeafe');
      }
      ctx.fillStyle = skyGrad;
      ctx.fillRect(0, 0, width, height);

      // 2. Night stars OR Day sun + clouds
      if (dark) {
        for (const st of skyStars) {
          const sx = Math.round(st.rx * width + smoothMouseX * 8);
          const sy = Math.round(st.ry * height + smoothMouseY * 5);
          const tw = 0.45 + 0.55 * Math.sin(t * st.speed + st.phase);
          ctx.save();
          ctx.globalAlpha = st.baseAlpha * tw;
          ctx.fillStyle = st.isCross ? '#e0f2fe' : '#bae6fd';
          if (st.isCross && tw > 0.72) {
            ctx.fillRect(sx - 2, sy, 6, 2);
            ctx.fillRect(sx, sy - 2, 2, 6);
          } else {
            ctx.fillRect(sx, sy, st.pxSize, st.pxSize);
          }
          ctx.restore();
        }
      } else {
        drawPixelSun(t);
        for (const cl of dayClouds) {
          const cx = Math.round(((cl.rx + t * cl.speed) % 1.15 - 0.08) * width);
          const cy = Math.round(cl.ry * height);
          drawDayCloud(cx, cy, cl.scale);
        }
      }

      // 3. Far mountains (day or night)
      const mtnScale = width < 640 ? 2 : 3;
      drawTiledMountains(
        sprites.get(dark ? 'mountains-far' : 'mountains-far-day'),
        mtnScale,
        -smoothMouseX * 16,
        dark ? 0.9 : 0.92,
      );

      // 4. Floating islands + realistic orbiting element sprites
      const nextStoneHits: ProjectedStoneHit[] = [];
      const nextIslandHits: ProjectedIslandHit[] = [];
      const islandScale = width < 640 ? 2 : 3;
      const objScale = width < 640 ? 2 : 3;

      ELEMENT_GALAXIES.forEach((galaxy, gi) => {
        const pos = ISLAND_POSITIONS[galaxy.id];
        const isNightLit = galaxy.id === 'noble-gases' || galaxy.id === 'f';
        const isDenseIsland = galaxy.id === 's' || galaxy.id === 'p' || galaxy.id === 'd';
        const baseObjScale = isDenseIsland ? (width < 640 ? 1.5 : 2) : width < 640 ? 2 : 3;
        const rx = width < 520 ? 0.5 + (pos.rx - 0.5) * 0.86 : pos.rx;

        const bob = Math.sin(t * pos.bobSpeed + gi * 1.35) * pos.bobAmp;
        const cx = Math.round(rx * width + smoothMouseX * (10 + (gi % 2) * 5));
        const cy = Math.round(pos.ry * height + bob + smoothMouseY * 6);
        const isGalHovered = hoveredIsland?.id === galaxy.id;

        const orbitScale = width < 640 ? 0.62 : 1;
        const orbitRx = pos.orbitRx * orbitScale;
        const orbitRy = pos.orbitRy * orbitScale;

        const projectedItems: Array<{
          x: number;
          y: number;
          z: number;
          element: GalaxyElementStar;
        }> = [];

        galaxy.stars.forEach((el) => {
          const seed = orbitSeeds.get(`${galaxy.id}:${el.symbol}`)!;
          const speed = galaxy.spinSpeed * 2.1 * seed.speedMult;
          const ang = seed.angleOffset + t * speed;
          const ux = Math.cos(ang) * orbitRx * seed.rxMult;
          const uy = Math.sin(ang) * orbitRy * seed.ryMult;
          const ox = ux * seed.cosTilt - uy * seed.sinTilt;
          const oy =
            ux * seed.sinTilt +
            uy * seed.cosTilt +
            seed.yOffset +
            Math.sin(t * seed.bobFreq + seed.bobPhase) * seed.bobAmp;
          const oz = Math.sin(ang);
          projectedItems.push({
            x: cx + ox,
            y: cy + oy,
            z: oz,
            element: el,
          });
        });

        // Pairwise 2D separation so orbiting stones don't overlap each other
        const minSep = isDenseIsland ? (width < 640 ? 14 : 20) : width < 640 ? 20 : 28;
        for (let pass = 0; pass < 3; pass++) {
          for (let i = 0; i < projectedItems.length; i++) {
            for (let j = i + 1; j < projectedItems.length; j++) {
              const a = projectedItems[i];
              const b = projectedItems[j];
              if (Math.abs(a.z - b.z) >= 0.75) continue;
              const dx = b.x - a.x;
              const dy = b.y - a.y;
              const dist = Math.hypot(dx, dy);
              if (dist < minSep) {
                const overlap = (minSep - dist) * 0.5;
                const nx = dist > 0.01 ? dx / dist : 1;
                const ny = dist > 0.01 ? dy / dist : 0;
                a.x -= nx * overlap;
                a.y -= ny * overlap;
                b.x += nx * overlap;
                b.y += ny * overlap;
              }
            }
          }
        }

        const backItems: typeof projectedItems = [];
        const frontItems: typeof projectedItems = [];
        for (const item of projectedItems) {
          const snapped = {
            ...item,
            x: Math.round(item.x),
            y: Math.round(item.y),
          };
          if (item.z < 0) backItems.push(snapped);
          else frontItems.push(snapped);
        }

        backItems.sort((a, b) => a.z - b.z);
        frontItems.sort((a, b) => a.z - b.z);

        const drawOrbitElement = (s: (typeof backItems)[number], isFront: boolean) => {
          const sprite = getElementPixelSprite(s.element.visualKind, s.element.shape, s.element.colors);
          const hasChain = Boolean(s.element.chainId);
          const isHov =
            hoveredStone &&
            hoveredStone.galaxy.id === galaxy.id &&
            hoveredStone.element.symbol === s.element.symbol;

          const sc = isHov ? baseObjScale + 0.75 : baseObjScale;
          const sw = Math.round(sprite.width * sc);
          const sh = Math.round(sprite.height * sc);
          const sx = Math.round(s.x - sw / 2);
          const sy = Math.round(s.y - sh / 2);

          ctx.save();
          ctx.imageSmoothingEnabled = false;
          if (s.element.visualKind === 'gas-cloud') {
            ctx.globalAlpha = isFront ? 0.92 : 0.62;
          } else {
            ctx.globalAlpha = isFront ? (hasChain ? 1 : 0.85) : hasChain ? 0.68 : 0.5;
          }

          // Subtle discharge glow for noble gas tubes, or core glow for f-block nuclei at night
          if (s.element.visualKind === 'gas-tube') {
            const glowR = isFront ? 16 : 11;
            const gGrad = ctx.createRadialGradient(s.x, s.y, 1, s.x, s.y, glowR);
            gGrad.addColorStop(0, s.element.colors[1]);
            gGrad.addColorStop(1, 'transparent');
            ctx.save();
            ctx.globalAlpha = isFront ? (dark ? 0.45 : 0.3) : 0.2;
            ctx.fillStyle = gGrad;
            ctx.beginPath();
            ctx.arc(s.x, s.y, glowR, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
          } else if (dark && s.element.visualKind === 'nucleus') {
            const glowR = isFront ? 13 : 9;
            const gGrad = ctx.createRadialGradient(s.x, s.y, 1, s.x, s.y, glowR);
            gGrad.addColorStop(0, s.element.colors[2]);
            gGrad.addColorStop(1, 'transparent');
            ctx.save();
            ctx.globalAlpha = isFront ? 0.32 : 0.18;
            ctx.fillStyle = gGrad;
            ctx.beginPath();
            ctx.arc(s.x, s.y, glowR, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
          }

          if (isHov) {
            ctx.strokeStyle = dark ? '#e0f2fe' : '#0f172a';
            ctx.lineWidth = 2;
            ctx.strokeRect(sx - 3, sy - 3, sw + 6, sh + 6);
          }

          if (dark && !isNightLit) {
            ctx.filter = 'brightness(0.64) saturate(0.82) contrast(1.06)';
          }
          ctx.drawImage(sprite, sx, sy, sw, sh);
          ctx.restore();

          nextStoneHits.push({
            x: s.x,
            y: s.y,
            size: Math.max(15, Math.max(sw, sh) * 0.72),
            galaxy,
            element: s.element,
          });
        };

        for (const s of backItems) drawOrbitElement(s, false);

        const islandImg = sprites.get(`island-${galaxy.id}`);
        const iw = (islandImg?.width || 32) * islandScale;
        const ih = (islandImg?.height || 32) * islandScale;
        const ix = Math.round(cx - iw / 2);
        const iy = Math.round(cy - ih / 2);

        ctx.save();
        ctx.imageSmoothingEnabled = false;
        if (dark && !isNightLit) {
          ctx.filter = 'brightness(0.64) saturate(0.82) contrast(1.06)';
        }
        if (islandImg && islandImg.complete && islandImg.width > 0) {
          ctx.drawImage(islandImg, ix, iy, iw, ih);
        }
        ctx.restore();

        nextIslandHits.push({
          x: cx,
          y: cy,
          r: Math.max(iw, ih) * 0.55,
          galaxy,
        });

        for (const s of frontItems) drawOrbitElement(s, true);

        // Family label
        ctx.save();
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.font = `${isGalHovered ? '700' : '600'} 12px "Space Grotesk", "Inter", sans-serif`;
        ctx.fillStyle = isGalHovered
          ? dark
            ? '#38bdf8'
            : '#1d4ed8'
          : dark
            ? 'rgba(226, 232, 240, 0.88)'
            : 'rgba(15, 23, 42, 0.88)';
        ctx.fillText(galaxy.label, cx, Math.round(cy + ih * 0.5 + 14));
        ctx.restore();
      });

      // 5. Near mountains (day or night) + highlighted summit peak with waving Aufstieg flag
      const nearMtnImg = sprites.get(dark ? 'mountains-near' : 'mountains-near-day');
      const nearOffsetX = -smoothMouseX * 32;
      drawTiledMountains(nearMtnImg, mtnScale, nearOffsetX, dark ? 0.96 : 0.98);

      if (nearMtnImg && nearMtnImg.complete && nearMtnImg.width > 0) {
        const drawW = nearMtnImg.width * mtnScale;
        const drawH = nearMtnImg.height * mtnScale;
        const baseY = Math.round(height - drawH);
        const peakPx = 41;
        const peakPy = 6;
        const targetX = width * 0.62;
        let startX = Math.round(((nearOffsetX % drawW) + drawW) % drawW) - drawW;
        let bestPeakX: number | null = null;
        let bestDist = Infinity;
        while (startX < width) {
          const candX = Math.round(startX) + peakPx * mtnScale;
          const dist = Math.abs(candX - targetX);
          if (candX >= 24 && candX <= width - 36 && dist < bestDist) {
            bestDist = dist;
            bestPeakX = candX;
          }
          startX += drawW;
        }

        if (bestPeakX !== null) {
          const peakY = baseY + peakPy * mtnScale;
          const px = mtnScale;

          ctx.save();
          ctx.imageSmoothingEnabled = false;

          // Subtle summit glow in dark mode so the flagged peak stands out
          if (dark) {
            const gGrad = ctx.createRadialGradient(bestPeakX, peakY - px * 2, 2, bestPeakX, peakY - px * 2, px * 10);
            gGrad.addColorStop(0, 'rgba(125, 211, 252, 0.28)');
            gGrad.addColorStop(1, 'transparent');
            ctx.fillStyle = gGrad;
            ctx.beginPath();
            ctx.arc(bestPeakX, peakY - px * 2, px * 10, 0, Math.PI * 2);
            ctx.fill();
          }

          // Crisp highlighted snow-crest cap on the chosen summit
          ctx.fillStyle = dark ? '#e0f2fe' : '#ffffff';
          ctx.fillRect(bestPeakX, peakY, px, px);
          ctx.fillRect(bestPeakX - px, peakY + px, px * 3, px);
          ctx.fillStyle = dark ? '#bae6fd' : '#e0f2fe';
          ctx.fillRect(bestPeakX - px * 2, peakY + px * 2, px * 5, px);

          // Flagpole (from dy=-5..-1) + finial at dy=-6
          ctx.fillStyle = dark ? '#2a1f3f' : '#334155';
          for (let dy = -5; dy <= -1; dy++) {
            ctx.fillRect(bestPeakX, peakY + dy * px, px, px);
          }
          ctx.fillStyle = dark ? '#7c86a8' : '#94a3b8';
          ctx.fillRect(bestPeakX, peakY - 6 * px, px, px);

          // Waving blue pixel flag (exact 4-frame cycle from pixel_art.py)
          const frame = FLAG_FRAMES[Math.floor(t * 4.5) % FLAG_FRAMES.length];
          for (const [dx, dy] of frame) {
            ctx.fillStyle = dx >= 4 ? '#5f9ef0' : '#3e7ad0';
            ctx.fillRect(bestPeakX + dx * px, peakY + dy * px, px, px);
          }
          ctx.restore();
        }
      }

      stoneHits = nextStoneHits;
      islandHits = nextIslandHits;

      rafId = requestAnimationFrame(draw);
    };

    const pickAt = (mx: number, my: number) => {
      let bestStone: ProjectedStoneHit | null = null;
      let bestSDist = Infinity;
      for (const s of stoneHits) {
        const d = Math.hypot(mx - s.x, my - s.y);
        if (d <= s.size && d < bestSDist) {
          bestSDist = d;
          bestStone = s;
        }
      }
      if (bestStone) {
        return { stone: bestStone, galaxy: bestStone.galaxy };
      }

      let bestIsland: ElementGalaxyConfig | null = null;
      let bestIDist = Infinity;
      for (const isl of islandHits) {
        const d = Math.hypot(mx - isl.x, my - isl.y);
        if (d <= isl.r && d < bestIDist) {
          bestIDist = d;
          bestIsland = isl.galaxy;
        }
      }
      return { stone: null, galaxy: bestIsland };
    };

    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      targetMouseX = (mx / Math.max(1, width) - 0.5) * 2;
      targetMouseY = (my / Math.max(1, height) - 0.5) * 2;

      const { stone, galaxy } = pickAt(mx, my);
      hoveredStone = stone;
      hoveredIsland = galaxy;
      setCursorPointer(Boolean(stone || galaxy));

      if (stone) {
        setTooltip({
          x: e.clientX,
          y: e.clientY,
          galaxy: stone.galaxy,
          element: stone.element,
        });
      } else {
        setTooltip(null);
      }
    };

    const handleMouseLeave = () => {
      targetMouseX = 0;
      targetMouseY = 0;
      hoveredStone = null;
      hoveredIsland = null;
      setCursorPointer(false);
      setTooltip(null);
    };

    const handleClick = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      const { stone, galaxy } = pickAt(mx, my);
      if (stone?.element.chainId) {
        callbacksRef.current.onOpenChain(stone.element.chainId);
      } else if (galaxy) {
        callbacksRef.current.onSelectGalaxy(galaxy.id);
      }
    };

    resize();
    rafId = requestAnimationFrame(draw);
    window.addEventListener('resize', resize);
    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mouseleave', handleMouseLeave);
    canvas.addEventListener('click', handleClick);

    return () => {
      cancelled = true;
      cancelAnimationFrame(rafId);
      window.removeEventListener('resize', resize);
      canvas.removeEventListener('mousemove', handleMouseMove);
      canvas.removeEventListener('mouseleave', handleMouseLeave);
      canvas.removeEventListener('click', handleClick);
    };
  }, []);

  return (
    <div className="galaxy-stage" style={{ cursor: cursorPointer ? 'pointer' : 'default' }}>
      <canvas ref={canvasRef} className="galaxy-canvas" />
      {tooltip && (
        <div
          className="galaxy-tooltip-pill"
          style={{
            left: Math.min(window.innerWidth - 64, tooltip.x + 12),
            top: Math.max(10, tooltip.y - 30),
          }}
        >
          {tooltip.element.symbol}
        </div>
      )}
    </div>
  );
};
