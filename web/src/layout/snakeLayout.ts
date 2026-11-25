import type { ChemBitmap, SequenceModel, StepModel } from '../types/models';

export interface SnakeLayoutConfig {
  gapMin: number;
  gapPad: number;
  rowVgapMin: number;
  arrowInset: number;
  blockPad: number;
  turnSideGap: number;
  turnBlobPad: number;
  margin: number;
  labelVgap: number;
  optimizeA4: boolean;
}

export const SCREEN_SNAKE_CONFIG: SnakeLayoutConfig = {
  gapMin: 260,
  gapPad: 120,
  rowVgapMin: 210,
  arrowInset: 18,
  blockPad: 24,
  turnSideGap: 64,
  turnBlobPad: 80,
  margin: 80,
  labelVgap: 18,
  optimizeA4: false,
};

export const PDF_SNAKE_CONFIG: SnakeLayoutConfig = {
  gapMin: 165,
  gapPad: 96,
  rowVgapMin: 120,
  arrowInset: 14,
  blockPad: 24,
  turnSideGap: 38,
  turnBlobPad: 36,
  margin: 16,
  labelVgap: 14,
  optimizeA4: true,
};

export interface LayoutNode {
  index: number;
  x: number;
  y: number;
  width: number;
  height: number;
  bitmap: ChemBitmap;
  hiddenByDefault: boolean;
  stageNumber: number;
}

export interface LayoutLabel {
  x: number;
  y: number;
  width: number;
  height: number;
  bitmap: ChemBitmap;
  stepIndex: number;
}

export interface LayoutArrow {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  stepIndex: number;
}

export interface SnakeBoard {
  width: number;
  height: number;
  nodes: LayoutNode[];
  labels: LayoutLabel[];
  arrows: LayoutArrow[];
}

const ROW_STEPS = 5.0;
const ROW_TARGET = 10000;
export const A4_PAGE_W = 1106;
export const A4_PAGE_H = 771;
export const A4_PAGE_H_CIT = 720;

function gapFor(step: StepModel, cfg: SnakeLayoutConfig): number {
  let w = cfg.gapMin;
  if (step.reaction.reagent) w = Math.max(w, step.reaction.reagent.width + cfg.gapPad);
  if (step.reaction.conditions) w = Math.max(w, step.reaction.conditions.width + cfg.gapPad);
  return w;
}

function partitionRows(
  steps: StepModel[],
  kInput: number,
  cfg: SnakeLayoutConfig,
): Array<[number, number]> {
  const n = steps.length;
  if (n === 0) return [[0, -1]];
  const k = Math.max(1, Math.min(n, kInput));

  const nodeW = new Float64Array(n + 1);
  nodeW[0] = steps[0].substrate.width;
  for (let i = 0; i < n; i++) nodeW[i + 1] = steps[i].product.width;

  const gaps = new Float64Array(n);
  for (let i = 0; i < n; i++) gaps[i] = gapFor(steps[i], cfg);

  const pn = new Float64Array(n + 2);
  for (let i = 0; i <= n; i++) pn[i + 1] = pn[i] + nodeW[i];

  const pg = new Float64Array(n + 1);
  for (let i = 0; i < n; i++) pg[i + 1] = pg[i] + gaps[i];

  const rowWR0 = (a: number, b: number) => pn[b + 2] - pn[a] + (pg[b + 1] - pg[a]);
  const rowWRn = (a: number, b: number) => {
    if (!cfg.optimizeA4) return rowWR0(a, b);
    if (a === b) return pn[a + 2] - pn[a + 1];
    return pn[b + 2] - pn[a + 1] + (pg[b + 1] - pg[a + 1]);
  };

  const dp: number[][] = Array.from({ length: k + 1 }, () => new Array(n + 1).fill(Infinity));
  const cut: number[][] = Array.from({ length: k + 1 }, () => new Array(n + 1).fill(-1));
  dp[0][0] = 0;

  for (let j = 1; j <= k; j++) {
    for (let i = j; i <= n; i++) {
      for (let t = j - 1; t < i; t++) {
        const prev = dp[j - 1][t];
        if (!Number.isFinite(prev)) continue;
        const rw = j === 1 ? rowWR0(t, i - 1) : rowWRn(t, i - 1);
        const v = Math.max(prev, rw);
        if (v < dp[j][i]) {
          dp[j][i] = v;
          cut[j][i] = t;
        }
      }
    }
  }

  const rows: Array<[number, number]> = [];
  let i = n;
  let rem = k;
  while (rem > 0) {
    const t = cut[rem][i];
    rows.push([t, i - 1]);
    i = t;
    rem--;
  }
  rows.reverse();
  return rows;
}

interface RawLayout {
  posX: number[];
  posY: number[];
  arrows: LayoutArrow[];
  labels: LayoutLabel[];
}

function layoutForRows(
  steps: StepModel[],
  rows: Array<[number, number]>,
  cfg: SnakeLayoutConfig,
): RawLayout {
  const nNodes = steps.length + 1;
  const posX = new Array<number>(nNodes).fill(0);
  const posY = new Array<number>(nNodes).fill(0);
  const rowOfNode = new Array<number>(nNodes).fill(0);

  const [a0, b0] = rows[0];
  posX[0] = 0;
  for (let i = a0; i <= b0; i++) {
    const gap = gapFor(steps[i], cfg);
    posX[i + 1] = posX[i] + steps[i].substrate.width + gap;
    rowOfNode[i + 1] = 0;
  }

  for (let r = 1; r < rows.length; r++) {
    const [a, b] = rows[r];
    const s = a;
    const dir = r % 2 === 1 ? -1 : 1;
    const cx = posX[s] + steps[s - 1].product.width / 2;
    const wNext = cfg.optimizeA4 ? steps[s].product.width : steps[s].substrate.width;
    posX[s + 1] = cx - wNext / 2;
    rowOfNode[s + 1] = r;
    for (let i = s + 1; i <= b; i++) {
      const gap = gapFor(steps[i], cfg);
      posX[i + 1] =
        dir > 0
          ? posX[i] + steps[i].substrate.width + gap
          : posX[i] - gap - steps[i].product.width;
      rowOfNode[i + 1] = r;
    }
  }

  const nodeH = (idx: number) =>
    idx > 0 ? steps[idx - 1].product.height : steps[0].substrate.height;

  const topExt = new Array<number>(rows.length).fill(0);
  const botExt = new Array<number>(rows.length).fill(0);

  for (let r = 0; r < rows.length; r++) {
    const [a, b] = rows[r];
    const startNode = r === 0 ? a : a + 1;
    let t = 0;
    for (let n = startNode; n <= b + 1; n++) t = Math.max(t, nodeH(n) / 2);
    let btm = t;
    const startStep = r === 0 ? a : a + 1;
    for (let i = startStep; i <= b; i++) {
      if (steps[i].reaction.reagent) {
        t = Math.max(t, steps[i].reaction.reagent!.height + cfg.blockPad);
      }
      if (steps[i].reaction.conditions) {
        btm = Math.max(btm, steps[i].reaction.conditions!.height + cfg.blockPad);
      }
    }
    topExt[r] = t;
    botExt[r] = btm;
  }

  const mid = new Array<number>(rows.length).fill(0);
  mid[0] = topExt[0];
  for (let r = 1; r < rows.length; r++) {
    const s = rows[r][0];
    const bottomOfS = mid[r - 1] + nodeH(s) / 2;
    const turn = steps[s];
    let blobH = 0;
    if (turn.reaction.reagent) blobH += turn.reaction.reagent.height + cfg.labelVgap;
    if (turn.reaction.conditions) blobH += turn.reaction.conditions.height + cfg.labelVgap;
    const vgap = Math.max(cfg.rowVgapMin, blobH + cfg.turnBlobPad);
    const rowTop = bottomOfS + vgap;
    if (cfg.optimizeA4) {
      const minDist = botExt[r - 1] + topExt[r] + 28;
      mid[r] = Math.max(mid[r - 1] + minDist, rowTop + topExt[r]);
    } else {
      mid[r] = rowTop + topExt[r];
    }
  }

  for (let i = 0; i < nNodes; i++) {
    posY[i] = mid[rowOfNode[i]] - nodeH(i) / 2;
  }

  const arrows: LayoutArrow[] = [];
  const labels: LayoutLabel[] = [];

  for (let r = 0; r < rows.length; r++) {
    const [a, b] = rows[r];
    const dir = r === 0 ? 1 : r % 2 === 1 ? -1 : 1;
    const startStep = r === 0 ? a : a + 1;
    for (let i = startStep; i <= b; i++) {
      let x1: number;
      let x2: number;
      if (dir > 0) {
        x1 = posX[i] + steps[i].substrate.width + cfg.arrowInset;
        x2 = posX[i + 1] - cfg.arrowInset;
      } else {
        x1 = posX[i] - cfg.arrowInset;
        x2 = posX[i + 1] + steps[i].product.width + cfg.arrowInset;
      }
      const y = mid[r];
      arrows.push({ x1, y1: y, x2, y2: y, stepIndex: i });
      const cx = (x1 + x2) / 2;
      if (steps[i].reaction.reagent) {
        const img = steps[i].reaction.reagent!;
        labels.push({
          x: cx - img.width / 2,
          y: y - cfg.blockPad - img.height,
          width: img.width,
          height: img.height,
          bitmap: img,
          stepIndex: i,
        });
      }
      if (steps[i].reaction.conditions) {
        const img = steps[i].reaction.conditions!;
        labels.push({
          x: cx - img.width / 2,
          y: y + cfg.blockPad,
          width: img.width,
          height: img.height,
          bitmap: img,
          stepIndex: i,
        });
      }
    }

    if (r > 0) {
      const s = a;
      const cx = posX[s] + steps[s - 1].product.width / 2;
      const y1 = mid[r - 1] + nodeH(s) / 2 + cfg.arrowInset;
      const y2 = posY[s + 1] - cfg.arrowInset;
      arrows.push({ x1: cx, y1, x2: cx, y2, stepIndex: s });

      const parts = [steps[s].reaction.reagent, steps[s].reaction.conditions].filter(
        (p): p is ChemBitmap => p !== null,
      );
      if (parts.length > 0) {
        const w = Math.max(...parts.map((p) => p.width));
        const h = parts.reduce((acc, p) => acc + p.height, 0) + cfg.labelVgap * (parts.length - 1);
        const turnDir = r % 2 === 1 ? -1 : 1;
        const x = turnDir > 0 ? cx - cfg.turnSideGap - w : cx + cfg.turnSideGap;
        let y = (y1 + y2) / 2 - h / 2;
        for (const p of parts) {
          labels.push({
            x: x + (w - p.width) / 2,
            y,
            width: p.width,
            height: p.height,
            bitmap: p,
            stepIndex: s,
          });
          y += p.height + cfg.labelVgap;
        }
      }
    }
  }

  return { posX, posY, arrows, labels };
}

function bboxSize(steps: StepModel[], raw: RawLayout, margin: number): [number, number] {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (let i = 0; i <= steps.length; i++) {
    const bmp = i > 0 ? steps[i - 1].product : steps[0].substrate;
    minX = Math.min(minX, raw.posX[i]);
    minY = Math.min(minY, raw.posY[i]);
    maxX = Math.max(maxX, raw.posX[i] + bmp.width);
    maxY = Math.max(maxY, raw.posY[i] + bmp.height);
  }
  for (const l of raw.labels) {
    minX = Math.min(minX, l.x);
    minY = Math.min(minY, l.y);
    maxX = Math.max(maxX, l.x + l.width);
    maxY = Math.max(maxY, l.y + l.height);
  }
  for (const a of raw.arrows) {
    minX = Math.min(minX, Math.min(a.x1, a.x2));
    minY = Math.min(minY, Math.min(a.y1, a.y2));
    maxX = Math.max(maxX, Math.max(a.x1, a.x2));
    maxY = Math.max(maxY, Math.max(a.y1, a.y2));
  }
  return [maxX - minX + 2 * margin, maxY - minY + 2 * margin];
}

export function buildSnakeBoard(
  sequence: SequenceModel,
  cfg: SnakeLayoutConfig = SCREEN_SNAKE_CONFIG,
  pageW: number = A4_PAGE_W,
  pageH: number = A4_PAGE_H,
): SnakeBoard {
  const steps = sequence.steps;
  if (steps.length === 0) {
    const start = sequence.start;
    if (start) {
      return {
        width: start.width + 2 * cfg.margin,
        height: start.height + 2 * cfg.margin,
        nodes: [
          {
            index: 0,
            x: cfg.margin,
            y: cfg.margin,
            width: start.width,
            height: start.height,
            bitmap: start,
            hiddenByDefault: false,
            stageNumber: 0,
          },
        ],
        labels: [],
        arrows: [],
      };
    }
    return { width: 100, height: 100, nodes: [], labels: [], arrows: [] };
  }

  let raw: RawLayout;
  if (!cfg.optimizeA4) {
    const total =
      steps.reduce((acc, s) => acc + s.substrate.width + gapFor(s, cfg), 0) +
      steps[steps.length - 1].product.width;
    let k = Math.max(1, Math.min(steps.length, Math.round(steps.length / ROW_STEPS)));
    while (k < steps.length && total / k > ROW_TARGET) k++;
    const rows = partitionRows(steps, k, cfg);
    raw = layoutForRows(steps, rows, cfg);
  } else {
    let bestScale = -1;
    let bestLayout: RawLayout | null = null;
    const maxK = Math.min(steps.length, 14);
    for (let k = 1; k <= maxK; k++) {
      let rows = partitionRows(steps, k, cfg);
      for (let iter = 0; iter < 3; iter++) {
        let improved = false;
        const l0 = layoutForRows(steps, rows, cfg);
        const [w0, h0] = bboxSize(steps, l0, cfg.margin);
        let sc0 = Math.min(pageW / Math.max(1, w0), pageH / Math.max(1, h0));
        for (let bIdx = 0; bIdx < rows.length - 1; bIdx++) {
          for (const delta of [-1, 1]) {
            const [a1, b1] = rows[bIdx];
            const [a2, b2] = rows[bIdx + 1];
            const nb1 = b1 + delta;
            const na2 = a2 + delta;
            if (nb1 < a1 || na2 > b2) continue;
            const cand = rows.map((r, idx) =>
              idx === bIdx ? ([a1, nb1] as [number, number]) : idx === bIdx + 1 ? ([na2, b2] as [number, number]) : r,
            );
            const lc = layoutForRows(steps, cand, cfg);
            const [wc, hc] = bboxSize(steps, lc, cfg.margin);
            const scc = Math.min(pageW / Math.max(1, wc), pageH / Math.max(1, hc));
            if (scc > sc0 + 1e-6) {
              rows = cand;
              sc0 = scc;
              improved = true;
            }
          }
        }
        if (!improved) break;
      }
      const res = layoutForRows(steps, rows, cfg);
      const [w, h] = bboxSize(steps, res, cfg.margin);
      const sc = Math.min(pageW / Math.max(1, w), pageH / Math.max(1, h));
      if (sc > bestScale) {
        bestScale = sc;
        bestLayout = res;
      }
    }
    raw = bestLayout!;
  }

  const nNodes = steps.length + 1;
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (let i = 0; i < nNodes; i++) {
    const bmp = i > 0 ? steps[i - 1].product : steps[0].substrate;
    minX = Math.min(minX, raw.posX[i]);
    minY = Math.min(minY, raw.posY[i]);
    maxX = Math.max(maxX, raw.posX[i] + bmp.width);
    maxY = Math.max(maxY, raw.posY[i] + bmp.height);
  }
  for (const l of raw.labels) {
    minX = Math.min(minX, l.x);
    minY = Math.min(minY, l.y);
    maxX = Math.max(maxX, l.x + l.width);
    maxY = Math.max(maxY, l.y + l.height);
  }
  for (const a of raw.arrows) {
    minX = Math.min(minX, Math.min(a.x1, a.x2));
    minY = Math.min(minY, Math.min(a.y1, a.y2));
    maxX = Math.max(maxX, Math.max(a.x1, a.x2));
    maxY = Math.max(maxY, Math.max(a.y1, a.y2));
  }

  const dx = cfg.margin - minX;
  const dy = cfg.margin - minY;
  const boardW = maxX - minX + 2 * cfg.margin;
  const boardH = maxY - minY + 2 * cfg.margin;

  let stageCounter = 0;
  const nodes: LayoutNode[] = [];
  for (let i = 0; i < nNodes; i++) {
    const bmp = i > 0 ? steps[i - 1].product : steps[0].substrate;
    const hidden = i >= 1 && i < nNodes - 1;
    if (hidden) stageCounter++;
    nodes.push({
      index: i,
      x: raw.posX[i] + dx,
      y: raw.posY[i] + dy,
      width: bmp.width,
      height: bmp.height,
      bitmap: bmp,
      hiddenByDefault: hidden,
      stageNumber: hidden ? stageCounter : 0,
    });
  }

  return {
    width: boardW,
    height: boardH,
    nodes,
    labels: raw.labels.map((l) => ({ ...l, x: l.x + dx, y: l.y + dy })),
    arrows: raw.arrows.map((a) => ({
      ...a,
      x1: a.x1 + dx,
      y1: a.y1 + dy,
      x2: a.x2 + dx,
      y2: a.y2 + dy,
    })),
  };
}
