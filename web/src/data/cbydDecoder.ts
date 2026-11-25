import { XzReadableStream } from 'xz-decompress';
import type { ChemBitmap, ReactionParts, SequenceModel, StepModel } from '../types/models';

const GRAY4_ALPHA = [255, 170, 85, 0]; // 255 - [0, 85, 170, 255]
const SPLIT_MIN_GAP = 40;
const TRIM_PAD = 8;

interface RawImageRecord {
  mode: number;
  width: number;
  height: number;
  offset: number;
  length: number;
}

interface TreeStepJson {
  idx?: number;
  rnum?: number;
  reagent?: number;
  target?: number;
  nr?: number;
  sub?: TreeJson | null;
}

interface TreeJson {
  name?: string;
  path?: string;
  doi?: string;
  start?: number;
  citation?: number;
  steps?: TreeStepJson[];
}

export async function decompressXz(payload: Uint8Array): Promise<Uint8Array> {
  const copy = new Uint8Array(payload.byteLength);
  copy.set(payload);
  const inputStream = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(copy);
      controller.close();
    },
  });

  const decompressedStream = new XzReadableStream(inputStream);
  const reader = decompressedStream.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (value && value.byteLength > 0) {
      chunks.push(value);
      total += value.byteLength;
    }
  }

  const out = new Uint8Array(total);
  let offset = 0;
  for (const c of chunks) {
    out.set(c, offset);
    offset += c.byteLength;
  }
  return out;
}

function makeCanvas(w: number, h: number): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = Math.max(1, w);
  c.height = Math.max(1, h);
  return c;
}

function isInkPixel(data: Uint8ClampedArray, idx: number, isColored: boolean): boolean {
  const a = data[idx + 3];
  if (!isColored) {
    return a > 8;
  }
  const r = data[idx];
  const g = data[idx + 1];
  const b = data[idx + 2];
  return a > 8 && Math.min(r, g, b) < 245;
}

function trimCanvas(chem: ChemBitmap, pad: number = TRIM_PAD): ChemBitmap {
  const { canvas, width: w, height: h, isColored } = chem;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return chem;

  const img = ctx.getImageData(0, 0, w, h);
  const data = img.data;

  let minX = w;
  let minY = h;
  let maxX = -1;
  let maxY = -1;

  for (let y = 0; y < h; y++) {
    const rowOff = y * w * 4;
    for (let x = 0; x < w; x++) {
      if (isInkPixel(data, rowOff + x * 4, isColored)) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }

  if (maxX < minX || maxY < minY) return chem;

  const cropW = maxX - minX + 1;
  const cropH = maxY - minY + 1;
  const outW = cropW + pad * 2;
  const outH = cropH + pad * 2;

  const out = makeCanvas(outW, outH);
  const outCtx = out.getContext('2d');
  if (!outCtx) return chem;

  if (isColored) {
    outCtx.fillStyle = '#ffffff';
    outCtx.fillRect(0, 0, outW, outH);
  }
  outCtx.drawImage(canvas, minX, minY, cropW, cropH, pad, pad, cropW, cropH);

  return { canvas: out, width: outW, height: outH, isColored };
}

function splitReaction(chem: ChemBitmap): ReactionParts {
  const { canvas, width: w, height: h, isColored } = chem;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  const combined = trimCanvas(chem, TRIM_PAD);
  if (!ctx) return { reagent: null, conditions: combined, combined };

  const data = ctx.getImageData(0, 0, w, h).data;
  const rowHasInk = new Uint8Array(h);

  for (let y = 0; y < h; y++) {
    const rowOff = y * w * 4;
    for (let x = 0; x < w; x++) {
      if (isInkPixel(data, rowOff + x * 4, isColored)) {
        rowHasInk[y] = 1;
        break;
      }
    }
  }

  let bestStart = -1;
  let bestEnd = -1;
  let bestLen = 0;
  let runStart = -1;

  for (let y = 0; y < h; y++) {
    if (rowHasInk[y] === 0 && runStart === -1) {
      runStart = y;
    } else if (rowHasInk[y] === 1 && runStart !== -1) {
      const runEnd = y - 1;
      if (runStart > 0 && runEnd < h - 1) {
        const len = runEnd - runStart + 1;
        if (len > bestLen) {
          bestLen = len;
          bestStart = runStart;
          bestEnd = runEnd;
        }
      }
      runStart = -1;
    }
  }

  if (bestLen >= SPLIT_MIN_GAP && bestStart >= 70 && h - 1 - bestEnd >= 70) {
    const topCanvas = makeCanvas(w, bestStart);
    const topCtx = topCanvas.getContext('2d');
    topCtx?.drawImage(canvas, 0, 0, w, bestStart, 0, 0, w, bestStart);

    const botH = h - (bestEnd + 1);
    const botCanvas = makeCanvas(w, botH);
    const botCtx = botCanvas.getContext('2d');
    botCtx?.drawImage(canvas, 0, bestEnd + 1, w, botH, 0, 0, w, botH);

    const reagent = trimCanvas({ canvas: topCanvas, width: w, height: bestStart, isColored }, TRIM_PAD);
    const conditions = trimCanvas({ canvas: botCanvas, width: w, height: botH, isColored }, TRIM_PAD);
    return { reagent, conditions, combined };
  }

  return { reagent: null, conditions: combined, combined };
}

async function decodeRecord(raw: Uint8Array, rec: RawImageRecord): Promise<ChemBitmap | null> {
  if (rec.mode === 0) {
    const w = rec.width;
    const h = rec.height;
    if (w <= 0 || h <= 0) return null;

    const canvas = makeCanvas(w, h);
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    const imgData = ctx.createImageData(w, h);
    const px = imgData.data;
    const stride = (w + 3) >> 2;

    let srcRow = rec.offset;
    let dst = 0;
    for (let y = 0; y < h; y++) {
      let x = 0;
      let s = srcRow;
      while (x < w) {
        const b = raw[s++];
        // rgb = (0, 0, 0), alpha = GRAY4_ALPHA
        px[dst + 3] = GRAY4_ALPHA[(b >> 6) & 0x03];
        dst += 4;
        if (x + 1 < w) {
          px[dst + 3] = GRAY4_ALPHA[(b >> 4) & 0x03];
          dst += 4;
        }
        if (x + 2 < w) {
          px[dst + 3] = GRAY4_ALPHA[(b >> 2) & 0x03];
          dst += 4;
        }
        if (x + 3 < w) {
          px[dst + 3] = GRAY4_ALPHA[b & 0x03];
          dst += 4;
        }
        x += 4;
      }
      srcRow += stride;
    }

    ctx.putImageData(imgData, 0, 0);
    return { canvas, width: w, height: h, isColored: false };
  }

  // Colored PNG/JPEG/WEBP embedded image
  const slice = raw.subarray(rec.offset, rec.offset + rec.length);
  const blobCopy = new Uint8Array(slice.byteLength);
  blobCopy.set(slice);
  const blob = new Blob([blobCopy]);
  const url = URL.createObjectURL(blob);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = (e) => reject(e);
      el.src = url;
    });
    const w = img.naturalWidth || rec.width;
    const h = img.naturalHeight || rec.height;
    const canvas = makeCanvas(w, h);
    const ctx = canvas.getContext('2d');
    ctx?.drawImage(img, 0, 0);
    return { canvas, width: w, height: h, isColored: true };
  } finally {
    URL.revokeObjectURL(url);
  }
}

function parseRecords(raw: Uint8Array, startPos: number): RawImageRecord[] {
  const records: RawImageRecord[] = [];
  let pos = startPos;
  while (pos + 9 <= raw.length) {
    const mode = raw[pos];
    const w = raw[pos + 1] | (raw[pos + 2] << 8);
    const h = raw[pos + 3] | (raw[pos + 4] << 8);
    const dlen =
      (raw[pos + 5] |
        (raw[pos + 6] << 8) |
        (raw[pos + 7] << 16) |
        (raw[pos + 8] << 24)) >>>
      0;
    pos += 9;
    if (pos + dlen > raw.length) break;
    records.push({ mode, width: w, height: h, offset: pos, length: dlen });
    pos += dlen;
  }
  return records;
}

export async function unpackSequence(payload: Uint8Array): Promise<SequenceModel> {
  const raw = await decompressXz(payload);
  const view = new DataView(raw.buffer, raw.byteOffset, raw.byteLength);
  const treeLen = view.getInt32(0, true);
  const treeStr = new TextDecoder('utf-8').decode(raw.subarray(4, 4 + treeLen));
  const tree: TreeJson = JSON.parse(treeStr);

  const records = parseRecords(raw, 4 + treeLen);
  const decodedCache = new Map<number, ChemBitmap | null>();
  const trimmedCache = new Map<number, ChemBitmap | null>();

  async function getRaw(idx: number): Promise<ChemBitmap | null> {
    if (idx < 0 || idx >= records.length) return null;
    if (decodedCache.has(idx)) return decodedCache.get(idx) ?? null;
    const decoded = await decodeRecord(raw, records[idx]);
    decodedCache.set(idx, decoded);
    return decoded;
  }

  async function getTrimmed(idx: number, pad: number = TRIM_PAD): Promise<ChemBitmap | null> {
    if (idx < 0 || idx >= records.length) return null;
    if (pad === TRIM_PAD && trimmedCache.has(idx)) {
      return trimmedCache.get(idx) ?? null;
    }
    const base = await getRaw(idx);
    if (!base) return null;
    const t = trimCanvas(base, pad);
    if (pad === TRIM_PAD) trimmedCache.set(idx, t);
    return t;
  }

  async function parseSeq(obj: TreeJson): Promise<SequenceModel> {
    const startIdx = typeof obj.start === 'number' ? obj.start : -1;
    const citIdx = typeof obj.citation === 'number' ? obj.citation : -1;

    const [startImg, citImg] = await Promise.all([
      getTrimmed(startIdx),
      getTrimmed(citIdx, 4),
    ]);

    const stepsJson = Array.isArray(obj.steps) ? obj.steps : [];
    const steps: StepModel[] = [];
    let currentSub = startImg;

    for (let i = 0; i < stepsJson.length; i++) {
      const st = stepsJson[i];
      const rIdx = typeof st.reagent === 'number' ? st.reagent : -1;
      const tIdx = typeof st.target === 'number' ? st.target : -1;
      const nrIdx = typeof st.nr === 'number' ? st.nr : -1;

      const [rawReaction, targetImg] = await Promise.all([
        getRaw(rIdx),
        getTrimmed(tIdx),
      ]);

      if (rawReaction && targetImg && currentSub) {
        const parts = splitReaction(rawReaction);
        const [nrImg, subSeq] = await Promise.all([
          nrIdx >= 0 ? getTrimmed(nrIdx) : Promise.resolve(null),
          st.sub ? parseSeq(st.sub) : Promise.resolve(null),
        ]);

        steps.push({
          stepIndex: typeof st.idx === 'number' ? st.idx : i + 1,
          reagentNum: typeof st.rnum === 'number' ? st.rnum : 0,
          substrate: currentSub,
          reaction: parts,
          product: targetImg,
          namedReaction: nrImg,
          subsequence: subSeq,
        });
        currentSub = targetImg;
      }
    }

    return {
      name: obj.name ?? '',
      path: obj.path ?? '',
      doi: obj.doi ?? '',
      start: startImg,
      citation: citImg,
      steps,
    };
  }

  return parseSeq(tree);
}

export async function unpackTargetPreview(
  payload: Uint8Array,
  maxDim: number = 220,
): Promise<ChemBitmap | null> {
  const raw = await decompressXz(payload);
  if (raw.length < 4) return null;

  const view = new DataView(raw.buffer, raw.byteOffset, raw.byteLength);
  const treeLen = view.getInt32(0, true);
  if (treeLen <= 0 || 4 + treeLen > raw.length) return null;

  const treeStr = new TextDecoder('utf-8').decode(raw.subarray(4, 4 + treeLen));
  const tree: TreeJson = JSON.parse(treeStr);

  const stepsJson = Array.isArray(tree.steps) ? tree.steps : [];
  let targetIdx =
    stepsJson.length > 0 && typeof stepsJson[stepsJson.length - 1].target === 'number'
      ? (stepsJson[stepsJson.length - 1].target as number)
      : typeof tree.start === 'number'
        ? tree.start
        : -1;

  if (targetIdx < 0 && typeof tree.start === 'number') {
    targetIdx = tree.start;
  }
  if (targetIdx < 0) return null;

  const records = parseRecords(raw, 4 + treeLen);
  if (targetIdx >= records.length) return null;

  const decoded = await decodeRecord(raw, records[targetIdx]);
  if (!decoded) return null;

  const trimmed = trimCanvas(decoded, 6);
  const longest = Math.max(trimmed.width, trimmed.height);
  if (longest <= maxDim) return trimmed;

  const scale = maxDim / longest;
  const dstW = Math.max(1, Math.round(trimmed.width * scale));
  const dstH = Math.max(1, Math.round(trimmed.height * scale));
  const scaled = makeCanvas(dstW, dstH);
  const ctx = scaled.getContext('2d');
  if (!ctx) return trimmed;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(trimmed.canvas, 0, 0, dstW, dstH);

  return { canvas: scaled, width: dstW, height: dstH, isColored: trimmed.isColored };
}
