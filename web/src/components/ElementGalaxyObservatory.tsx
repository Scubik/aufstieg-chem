import React, { useEffect, useRef } from 'react';
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
  element: GalaxyElementStar;
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
  daySprite: HTMLCanvasElement;
  nightSprite: HTMLCanvasElement;
}

const glowCache = new Map<string, HTMLCanvasElement>();

function getGlowCanvas(color: string, radius: number): HTMLCanvasElement {
  const key = `${color}:${radius}`;
  const cached = glowCache.get(key);
  if (cached) return cached;
  const size = radius * 2;
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  const gctx = c.getContext('2d')!;
  const grad = gctx.createRadialGradient(radius, radius, 1, radius, radius, radius);
  grad.addColorStop(0, color);
  grad.addColorStop(1, 'transparent');
  gctx.fillStyle = grad;
  gctx.fillRect(0, 0, size, size);
  glowCache.set(key, c);
  return c;
}

function bakeNightSprite(img: HTMLImageElement): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = img.width;
  c.height = img.height;
  const bctx = c.getContext('2d')!;
  bctx.imageSmoothingEnabled = false;
  bctx.drawImage(img, 0, 0);
  const data = bctx.getImageData(0, 0, c.width, c.height);
  const px = data.data;
  for (let i = 0; i < px.length; i += 4) {
    if (px[i + 3] === 0) continue;
    px[i] = Math.round(px[i] * 0.6);
    px[i + 1] = Math.round(px[i + 1] * 0.63);
    px[i + 2] = Math.round(px[i + 2] * 0.7);
  }
  bctx.putImageData(data, 0, 0);
  return c;
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

type RgbTuple = [number, number, number];

function lerpRgb(a: RgbTuple, b: RgbTuple, k: number): RgbTuple {
  return [
    Math.round(a[0] + (b[0] - a[0]) * k),
    Math.round(a[1] + (b[1] - a[1]) * k),
    Math.round(a[2] + (b[2] - a[2]) * k),
  ];
}

function rgbStr(c: RgbTuple, alpha = 1): string {
  return alpha >= 0.999
    ? `rgb(${c[0]},${c[1]},${c[2]})`
    : `rgba(${c[0]},${c[1]},${c[2]},${alpha.toFixed(3)})`;
}

const SKY_NIGHT: [RgbTuple, RgbTuple, RgbTuple] = [
  [4, 9, 20],
  [8, 21, 41],
  [14, 36, 68],
];
const SKY_TWILIGHT: [RgbTuple, RgbTuple, RgbTuple] = [
  [28, 37, 82],
  [180, 83, 104],
  [251, 146, 60],
];
const SKY_DAY: [RgbTuple, RgbTuple, RgbTuple] = [
  [96, 165, 250],
  [147, 197, 253],
  [219, 234, 254],
];

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
  const tooltipElRef = useRef<HTMLDivElement | null>(null);

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
    let inViewport = true;
    let pageVisible = document.visibilityState !== 'hidden';

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
    const nightSprites = new Map<string, HTMLCanvasElement>();
    Promise.all(
      spriteEntries.map(async ([key, url]) => {
        try {
          const img = await loadSprite(url);
          if (cancelled) return;
          sprites.set(key, img);
          if (
            key === 'island-s' ||
            key === 'island-p' ||
            key === 'island-d' ||
            key === 'island-platinum-noble'
          ) {
            nightSprites.set(key, bakeNightSprite(img));
          }
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
    const galaxyOrbits = new Map<GalaxyId, ElementOrbitSeed[]>();
    const shellRadii = [0.76, 1.04, 1.32];
    const shellYOffsets = [-8, 1, 9];
    const shellTilts = [-0.26, 0.16, -0.1];
    const shellSpeeds = [1.12, 0.86, 0.68];

    for (const galaxy of ELEMENT_GALAXIES) {
      const isNightLit = galaxy.id === 'noble-gases' || galaxy.id === 'f';
      const count = galaxy.stars.length;
      const shellCount = count > 14 ? 3 : count > 7 ? 2 : 1;
      const shells: number[][] = Array.from({ length: shellCount }, () => []);
      galaxy.stars.forEach((_, idx) => {
        shells[idx % shellCount].push(idx);
      });

      const seeds: ElementOrbitSeed[] = [];
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
          const daySprite = getElementPixelSprite(el.visualKind, el.shape, el.colors, false);
          const nightSprite = isNightLit
            ? daySprite
            : getElementPixelSprite(el.visualKind, el.shape, el.colors, true);
          seeds.push({
            element: el,
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
            daySprite,
            nightSprite,
          });
        });
      });
      galaxyOrbits.set(galaxy.id, seeds);
    }

    let width = 760;
    let height = 490;
    let skyGradDark: CanvasGradient | null = null;
    let skyGradLight: CanvasGradient | null = null;
    let targetMouseX = 0;
    let targetMouseY = 0;
    let smoothMouseX = 0;
    let smoothMouseY = 0;

    let stoneHits: ProjectedStoneHit[] = [];
    let islandHits: ProjectedIslandHit[] = [];
    let hoveredStone: ProjectedStoneHit | null = null;
    let hoveredIsland: ElementGalaxyConfig | null = null;
    let lastHasHover = false;

    const TRANS_DURATION = 1.25;
    let dayProgress = isDarkRef.current ? 0 : 1;
    let lastDark = isDarkRef.current;
    let transActive = false;
    let transFrom = dayProgress;
    let transTo = dayProgress;
    let transStart = 0;

    const rebuildSkyGradients = () => {
      const darkG = ctx.createLinearGradient(0, 0, 0, height);
      darkG.addColorStop(0, '#040914');
      darkG.addColorStop(0.6, '#081529');
      darkG.addColorStop(1, '#0e2444');
      skyGradDark = darkG;

      const lightG = ctx.createLinearGradient(0, 0, 0, height);
      lightG.addColorStop(0, '#60a5fa');
      lightG.addColorStop(0.55, '#93c5fd');
      lightG.addColorStop(1, '#dbeafe');
      skyGradLight = lightG;
    };

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      width = canvas.clientWidth || 760;
      height = canvas.clientHeight || 490;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.imageSmoothingEnabled = false;
      rebuildSkyGradients();
    };

    const drawTiledMountains = (
      img: HTMLImageElement | undefined,
      scale: number,
      offsetX: number,
      alpha: number,
      yOffset = 0,
    ) => {
      if (!img || !img.complete || img.width === 0) return;
      const drawW = img.width * scale;
      const drawH = img.height * scale;
      const y = Math.round(height - drawH + yOffset);
      let startX = Math.round(((offsetX % drawW) + drawW) % drawW) - drawW;
      ctx.globalAlpha = alpha;
      while (startX < width) {
        ctx.drawImage(img, Math.round(startX), y, drawW, drawH);
        startX += drawW;
      }
      ctx.globalAlpha = 1;
    };

    const drawPixelSun = (t: number, dayP: number, isMobile: boolean) => {
      if (dayP <= 0.02) return;
      const arc = 1 - dayP;
      const sx = Math.round(width - (isMobile ? 48 : 74) - arc * (isMobile ? 28 : 44) + smoothMouseX * 4);
      const sy = Math.round((isMobile ? 28 : 52) + arc * arc * height * 0.72 + smoothMouseY * (isMobile ? 2 : 3));
      const pulse = Math.sin(t * 1.8) > 0 ? 1 : 0;
      const lowSun = Math.max(0, 1 - dayP / 0.65);

      const haloAlpha = 0.25 * dayP;
      ctx.fillStyle = lowSun > 0.2
        ? `rgba(251, 146, 60, ${(haloAlpha * 1.25).toFixed(3)})`
        : `rgba(253, 224, 71, ${haloAlpha.toFixed(3)})`;
      ctx.fillRect(sx - 22 - pulse * 2, sy - 22 - pulse * 2, 44 + pulse * 4, 44 + pulse * 4);

      const rayColor = rgbStr(lerpRgb([253, 224, 71], [249, 115, 22], lowSun), Math.min(1, dayP * 1.3));
      const bodyColor = rgbStr(lerpRgb([250, 204, 21], [251, 146, 60], lowSun));
      const coreColor = rgbStr(lerpRgb([254, 249, 195], [253, 224, 71], lowSun));

      ctx.fillStyle = rayColor;
      ctx.fillRect(sx - 24 - pulse * 3, sy - 2, 6, 4);
      ctx.fillRect(sx + 18 + pulse * 3, sy - 2, 6, 4);
      ctx.fillRect(sx - 2, sy - 24 - pulse * 3, 4, 6);
      ctx.fillRect(sx - 2, sy + 18 + pulse * 3, 4, 6);
      ctx.fillStyle = bodyColor;
      ctx.fillRect(sx - 14, sy - 10, 28, 20);
      ctx.fillRect(sx - 10, sy - 14, 20, 28);
      ctx.fillStyle = coreColor;
      ctx.fillRect(sx - 8, sy - 8, 16, 16);
    };

    const drawDayCloud = (cx: number, cy: number, sc: number, alpha: number, twilight: number) => {
      const topRgb = lerpRgb([255, 255, 255], [254, 215, 170], twilight * 0.7);
      const botRgb = lerpRgb([186, 230, 253], [244, 114, 182], twilight * 0.45);
      ctx.fillStyle = rgbStr(topRgb, 0.85 * alpha);
      ctx.fillRect(cx - 10 * sc, cy - 2 * sc, 20 * sc, 5 * sc);
      ctx.fillRect(cx - 7 * sc, cy - 5 * sc, 12 * sc, 4 * sc);
      ctx.fillRect(cx - 3 * sc, cy - 7 * sc, 7 * sc, 3 * sc);
      ctx.fillStyle = rgbStr(botRgb, 0.7 * alpha);
      ctx.fillRect(cx - 9 * sc, cy + 2 * sc, 18 * sc, 2 * sc);
    };

    const draw = (now: number) => {
      if (cancelled || !inViewport || !pageVisible) {
        rafId = 0;
        return;
      }

      const t = now * 0.001;
      const wantDark = isDarkRef.current;
      if (wantDark !== lastDark) {
        lastDark = wantDark;
        transFrom = dayProgress;
        transTo = wantDark ? 0 : 1;
        transStart = t;
        transActive = true;
      }
      if (transActive) {
        const u = Math.min(1, (t - transStart) / TRANS_DURATION);
        const eased = u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2;
        dayProgress = transFrom + (transTo - transFrom) * eased;
        if (u >= 1) {
          dayProgress = transTo;
          transActive = false;
        }
      }

      const dark = dayProgress < 0.5;
      const nightFactor = 1 - dayProgress;
      const twilight = Math.sin(dayProgress * Math.PI);

      smoothMouseX += (targetMouseX - smoothMouseX) * 0.06;
      smoothMouseY += (targetMouseY - smoothMouseY) * 0.06;

      ctx.imageSmoothingEnabled = false;

      // 1. Sky (Night <-> Golden/Rose Twilight <-> Clear Day)
      if (dayProgress <= 0.001) {
        ctx.fillStyle = skyGradDark ?? '#040914';
      } else if (dayProgress >= 0.999) {
        ctx.fillStyle = skyGradLight ?? '#93c5fd';
      } else {
        const grad = ctx.createLinearGradient(0, 0, 0, height);
        const pMid = 0.48;
        const [topC, midC, botC] =
          dayProgress < pMid
            ? [
                lerpRgb(SKY_NIGHT[0], SKY_TWILIGHT[0], dayProgress / pMid),
                lerpRgb(SKY_NIGHT[1], SKY_TWILIGHT[1], dayProgress / pMid),
                lerpRgb(SKY_NIGHT[2], SKY_TWILIGHT[2], dayProgress / pMid),
              ]
            : [
                lerpRgb(SKY_TWILIGHT[0], SKY_DAY[0], (dayProgress - pMid) / (1 - pMid)),
                lerpRgb(SKY_TWILIGHT[1], SKY_DAY[1], (dayProgress - pMid) / (1 - pMid)),
                lerpRgb(SKY_TWILIGHT[2], SKY_DAY[2], (dayProgress - pMid) / (1 - pMid)),
              ];
        grad.addColorStop(0, rgbStr(topC));
        grad.addColorStop(0.58, rgbStr(midC));
        grad.addColorStop(1, rgbStr(botC));
        ctx.fillStyle = grad;
      }
      ctx.fillRect(0, 0, width, height);

      // Subtle pixel-stepped warm horizon band during sunrise/sunset
      if (twilight > 0.03) {
        ctx.fillStyle = `rgba(251, 146, 60, ${(twilight * 0.22).toFixed(3)})`;
        ctx.fillRect(0, Math.round(height * 0.64), width, Math.round(height * 0.36));
        ctx.fillStyle = `rgba(253, 224, 71, ${(twilight * 0.14).toFixed(3)})`;
        ctx.fillRect(0, Math.round(height * 0.74), width, Math.round(height * 0.26));
      }

      // 2. Night stars + Rising/Setting Sun + Day clouds
      if (dayProgress < 0.75) {
        const starVis = Math.max(0, 1 - dayProgress / 0.75);
        for (let i = 0; i < skyStars.length; i++) {
          const st = skyStars[i];
          const sx = Math.round(st.rx * width + smoothMouseX * 8);
          const sy = Math.round(st.ry * height + smoothMouseY * 5);
          const tw = 0.45 + 0.55 * Math.sin(t * st.speed + st.phase);
          ctx.globalAlpha = st.baseAlpha * tw * starVis;
          ctx.fillStyle = st.isCross ? '#e0f2fe' : '#bae6fd';
          if (st.isCross && tw > 0.72) {
            ctx.fillRect(sx - 2, sy, 6, 2);
            ctx.fillRect(sx, sy - 2, 2, 6);
          } else {
            ctx.fillRect(sx, sy, st.pxSize, st.pxSize);
          }
        }
        ctx.globalAlpha = 1;
      }

      const isMobile = width < 640;

      drawPixelSun(t, dayProgress, isMobile);

      if (dayProgress > 0.18) {
        const cloudVis = Math.min(1, (dayProgress - 0.18) / 0.65);
        for (let i = 0; i < dayClouds.length; i++) {
          const cl = dayClouds[i];
          const cx = Math.round(((cl.rx + t * cl.speed) % 1.15 - 0.08) * width);
          const cy = Math.round(cl.ry * height * (isMobile ? 0.85 : 1));
          drawDayCloud(cx, cy, cl.scale, cloudVis, twilight);
        }
      }

      // 3. Far mountains (day/night crossfade)
      const mtnScale = 3;
      const farYOffset = isMobile ? 14 : 0;
      const farAlpha = 0.9 + 0.02 * dayProgress;
      if (dayProgress <= 0.001) {
        drawTiledMountains(sprites.get('mountains-far'), mtnScale, -smoothMouseX * 16, farAlpha, farYOffset);
      } else if (dayProgress >= 0.999) {
        drawTiledMountains(sprites.get('mountains-far-day'), mtnScale, -smoothMouseX * 16, farAlpha, farYOffset);
      } else {
        drawTiledMountains(
          sprites.get('mountains-far'),
          mtnScale,
          -smoothMouseX * 16,
          farAlpha * (1 - dayProgress),
          farYOffset,
        );
        drawTiledMountains(
          sprites.get('mountains-far-day'),
          mtnScale,
          -smoothMouseX * 16,
          farAlpha * dayProgress,
          farYOffset,
        );
      }

      // 4. Floating islands + realistic orbiting element sprites
      const nextStoneHits: ProjectedStoneHit[] = [];
      const nextIslandHits: ProjectedIslandHit[] = [];
      const islandScale = 3;

      ELEMENT_GALAXIES.forEach((galaxy, gi) => {
        const pos = ISLAND_POSITIONS[galaxy.id];
        const isNightLit = galaxy.id === 'noble-gases' || galaxy.id === 'f';
        const isDenseIsland = galaxy.id === 's' || galaxy.id === 'p' || galaxy.id === 'd';
        const baseObjScale = isMobile
          ? isDenseIsland
            ? 1.85
            : 2.4
          : isDenseIsland
            ? 2
            : 3;

        const bob = Math.sin(t * pos.bobSpeed + gi * 1.35) * pos.bobAmp;
        let cx: number;
        let cy: number;
        if (isMobile) {
          const slotSpacing = Math.max(200, width * 0.64);
          const trackLen = ELEMENT_GALAXIES.length * slotSpacing;
          const paradeSpeed = 30; // px/sec left-to-right
          const rawX = (gi * slotSpacing + t * paradeSpeed) % trackLen;
          cx = Math.round(rawX - slotSpacing * 0.5 + smoothMouseX * 6);
          cy = Math.round(height * 0.34 + bob + (gi % 2 === 0 ? -4 : 4));
          if (cx < -130 || cx > width + 130) return;
        } else {
          cx = Math.round(pos.rx * width + smoothMouseX * (10 + (gi % 2) * 5));
          cy = Math.round(pos.ry * height + bob + smoothMouseY * 6);
        }

        const orbitScale = isMobile ? 0.76 : 1;
        const orbitRx = pos.orbitRx * orbitScale;
        const orbitRy = pos.orbitRy * orbitScale;

        const seeds = galaxyOrbits.get(galaxy.id) ?? [];
        const projectedItems: Array<{
          x: number;
          y: number;
          z: number;
          seed: ElementOrbitSeed;
        }> = new Array(seeds.length);

        for (let i = 0; i < seeds.length; i++) {
          const seed = seeds[i];
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
          projectedItems[i] = {
            x: cx + ox,
            y: cy + oy,
            z: Math.sin(ang),
            seed,
          };
        }

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
        for (let i = 0; i < projectedItems.length; i++) {
          const item = projectedItems[i];
          item.x = Math.round(item.x);
          item.y = Math.round(item.y);
          if (item.z < 0) backItems.push(item);
          else frontItems.push(item);
        }

        backItems.sort((a, b) => a.z - b.z);
        frontItems.sort((a, b) => a.z - b.z);

        const drawOrbitElement = (s: (typeof backItems)[number], isFront: boolean) => {
          const el = s.seed.element;
          const hasChain = Boolean(el.chainId);
          const isHov =
            hoveredStone &&
            hoveredStone.galaxy.id === galaxy.id &&
            hoveredStone.element.symbol === el.symbol;

          const sc = isHov ? baseObjScale + 0.75 : baseObjScale;
          const sw = Math.round(s.seed.daySprite.width * sc);
          const sh = Math.round(s.seed.daySprite.height * sc);
          const sx = Math.round(s.x - sw / 2);
          const sy = Math.round(s.y - sh / 2);

          // Cached glow sprite for noble gas tubes or f-block nuclei at night
          if (el.visualKind === 'gas-tube') {
            const glowR = isFront ? 16 : 11;
            ctx.globalAlpha = isFront ? 0.3 + 0.15 * nightFactor : 0.2;
            ctx.drawImage(getGlowCanvas(el.colors[1], glowR), s.x - glowR, s.y - glowR);
          } else if (nightFactor > 0.05 && el.visualKind === 'nucleus') {
            const glowR = isFront ? 13 : 9;
            ctx.globalAlpha = (isFront ? 0.32 : 0.18) * nightFactor;
            ctx.drawImage(getGlowCanvas(el.colors[2], glowR), s.x - glowR, s.y - glowR);
          }

          const baseAlpha =
            el.visualKind === 'gas-cloud'
              ? isFront
                ? 0.92
                : 0.62
              : isFront
                ? hasChain
                  ? 1
                  : 0.85
                : hasChain
                  ? 0.68
                  : 0.5;

          if (isHov) {
            ctx.globalAlpha = baseAlpha;
            ctx.strokeStyle = dark ? '#e0f2fe' : '#0f172a';
            ctx.lineWidth = 2;
            ctx.strokeRect(sx - 3, sy - 3, sw + 6, sh + 6);
          }

          if (isNightLit || dayProgress >= 0.999) {
            ctx.globalAlpha = baseAlpha;
            ctx.drawImage(s.seed.daySprite, sx, sy, sw, sh);
          } else if (dayProgress <= 0.001) {
            ctx.globalAlpha = baseAlpha;
            ctx.drawImage(s.seed.nightSprite, sx, sy, sw, sh);
          } else {
            ctx.globalAlpha = baseAlpha * (1 - dayProgress);
            ctx.drawImage(s.seed.nightSprite, sx, sy, sw, sh);
            ctx.globalAlpha = baseAlpha * dayProgress;
            ctx.drawImage(s.seed.daySprite, sx, sy, sw, sh);
          }

          nextStoneHits.push({
            x: s.x,
            y: s.y,
            size: Math.max(15, Math.max(sw, sh) * 0.72),
            galaxy,
            element: el,
          });
        };

        for (let i = 0; i < backItems.length; i++) drawOrbitElement(backItems[i], false);
        ctx.globalAlpha = 1;

        const islandKey = `island-${galaxy.id}`;
        const dayIsland = sprites.get(islandKey);
        const nightIsland = nightSprites.get(islandKey) ?? dayIsland;
        const iw = (dayIsland?.width || 32) * islandScale;
        const ih = (dayIsland?.height || 32) * islandScale;
        const ix = Math.round(cx - iw / 2);
        const iy = Math.round(cy - ih / 2);

        if (dayIsland && nightIsland) {
          if (isNightLit || dayProgress >= 0.999) {
            ctx.drawImage(dayIsland, ix, iy, iw, ih);
          } else if (dayProgress <= 0.001) {
            ctx.drawImage(nightIsland, ix, iy, iw, ih);
          } else {
            ctx.globalAlpha = 1 - dayProgress;
            ctx.drawImage(nightIsland, ix, iy, iw, ih);
            ctx.globalAlpha = dayProgress;
            ctx.drawImage(dayIsland, ix, iy, iw, ih);
            ctx.globalAlpha = 1;
          }
        }

        nextIslandHits.push({
          x: cx,
          y: cy,
          r: Math.max(iw, ih) * 0.55,
          galaxy,
        });

        for (let i = 0; i < frontItems.length; i++) drawOrbitElement(frontItems[i], true);
        ctx.globalAlpha = 1;
      });

      // 5. Near mountains (day/night crossfade) + highlighted summit peak with waving Aufstieg flag
      const nearNightImg = sprites.get('mountains-near');
      const nearDayImg = sprites.get('mountains-near-day');
      const nearMtnImg = dark ? nearNightImg : nearDayImg;
      const nearOffsetX = -smoothMouseX * 32;
      const nearYOffset = isMobile ? 22 : 0;
      const nearAlpha = 0.96 + 0.02 * dayProgress;
      if (dayProgress <= 0.001) {
        drawTiledMountains(nearNightImg, mtnScale, nearOffsetX, nearAlpha, nearYOffset);
      } else if (dayProgress >= 0.999) {
        drawTiledMountains(nearDayImg, mtnScale, nearOffsetX, nearAlpha, nearYOffset);
      } else {
        drawTiledMountains(nearNightImg, mtnScale, nearOffsetX, nearAlpha * (1 - dayProgress), nearYOffset);
        drawTiledMountains(nearDayImg, mtnScale, nearOffsetX, nearAlpha * dayProgress, nearYOffset);
      }

      if (nearMtnImg && nearMtnImg.complete && nearMtnImg.width > 0) {
        const drawW = nearMtnImg.width * mtnScale;
        const drawH = nearMtnImg.height * mtnScale;
        const baseY = Math.round(height - drawH + nearYOffset);
        const peakPx = 41;
        const peakPy = 6;
        const targetX = width * (isMobile ? 0.5 : 0.62);
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

          if (nightFactor > 0.05) {
            const glowR = px * 10;
            ctx.globalAlpha = 0.28 * nightFactor;
            ctx.drawImage(
              getGlowCanvas('#7dd3fc', glowR),
              bestPeakX - glowR,
              peakY - px * 2 - glowR,
            );
            ctx.globalAlpha = 1;
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
          for (let i = 0; i < frame.length; i++) {
            const [dx, dy] = frame[i];
            ctx.fillStyle = dx >= 4 ? '#5f9ef0' : '#3e7ad0';
            ctx.fillRect(bestPeakX + dx * px, peakY + dy * px, px, px);
          }
        }
      }

      stoneHits = nextStoneHits;
      islandHits = nextIslandHits;

      rafId = requestAnimationFrame(draw);
    };

    const ensureLoop = () => {
      if (!cancelled && inViewport && pageVisible && rafId === 0) {
        rafId = requestAnimationFrame(draw);
      }
    };

    const pickAt = (mx: number, my: number) => {
      let bestStone: ProjectedStoneHit | null = null;
      let bestSDist = Infinity;
      for (let i = 0; i < stoneHits.length; i++) {
        const s = stoneHits[i];
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
      for (let i = 0; i < islandHits.length; i++) {
        const isl = islandHits[i];
        const d = Math.hypot(mx - isl.x, my - isl.y);
        if (d <= isl.r && d < bestIDist) {
          bestIDist = d;
          bestIsland = isl.galaxy;
        }
      }
      return { stone: null, galaxy: bestIsland };
    };

    const updateTooltipDom = (stone: ProjectedStoneHit | null, clientX: number, clientY: number) => {
      const el = tooltipElRef.current;
      if (!el) return;
      if (stone) {
        const tx = Math.min(window.innerWidth - 64, clientX + 12);
        const ty = Math.max(10, clientY - 30);
        if (el.textContent !== stone.element.symbol) {
          el.textContent = stone.element.symbol;
        }
        el.style.display = 'block';
        el.style.transform = `translate3d(${tx}px, ${ty}px, 0)`;
      } else {
        el.style.display = 'none';
      }
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
      const hasHover = Boolean(stone || galaxy);
      if (hasHover !== lastHasHover) {
        lastHasHover = hasHover;
        canvas.style.cursor = hasHover ? 'pointer' : 'default';
      }
      updateTooltipDom(stone, e.clientX, e.clientY);
    };

    const handleMouseLeave = () => {
      targetMouseX = 0;
      targetMouseY = 0;
      hoveredStone = null;
      hoveredIsland = null;
      if (lastHasHover) {
        lastHasHover = false;
        canvas.style.cursor = 'default';
      }
      updateTooltipDom(null, 0, 0);
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

    const io = new IntersectionObserver(
      (entries) => {
        inViewport = entries.some((entry) => entry.isIntersecting);
        if (inViewport) ensureLoop();
      },
      { threshold: 0.01 },
    );
    io.observe(canvas);

    const handleVisibility = () => {
      pageVisible = document.visibilityState !== 'hidden';
      if (pageVisible) ensureLoop();
    };
    document.addEventListener('visibilitychange', handleVisibility);

    resize();
    ensureLoop();
    window.addEventListener('resize', resize);
    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mouseleave', handleMouseLeave);
    canvas.addEventListener('click', handleClick);

    return () => {
      cancelled = true;
      if (rafId) cancelAnimationFrame(rafId);
      io.disconnect();
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('resize', resize);
      canvas.removeEventListener('mousemove', handleMouseMove);
      canvas.removeEventListener('mouseleave', handleMouseLeave);
      canvas.removeEventListener('click', handleClick);
    };
  }, []);

  return (
    <div className="galaxy-stage">
      <canvas ref={canvasRef} className="galaxy-canvas" />
      <div ref={tooltipElRef} className="galaxy-tooltip-pill" style={{ display: 'none' }} />
    </div>
  );
};
