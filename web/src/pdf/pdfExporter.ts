import { jsPDF } from 'jspdf';
import type { CatalogItem, SequenceModel } from '../types/models';
import {
  A4_PAGE_H,
  A4_PAGE_H_CIT,
  A4_PAGE_W,
  PDF_SNAKE_CONFIG,
  buildSnakeBoard,
  type SnakeBoard,
} from '../layout/snakeLayout';

export function pluralSteps(n: number): string {
  const m100 = n % 100;
  if (m100 >= 11 && m100 <= 14) return 'стадий';
  switch (n % 10) {
    case 1:
      return 'стадия';
    case 2:
    case 3:
    case 4:
      return 'стадии';
    default:
      return 'стадий';
  }
}

const PAGE_W = 842;
const PAGE_H = 595;
const RENDER_SCALE = 2; // 2x crispness (~1684x1190 px per page)
const MARGIN_X = 22;
const HEADER_H = 38;
const FOOTER_H = 34;

async function loadLogoImage(): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = './aufstieg_logo.png';
  });
}

function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function renderPdfPageToCanvas(
  item: CatalogItem,
  sequence: SequenceModel,
  board: SnakeBoard,
  showAnswers: boolean,
  revealedNodeIndices: Set<number>,
  logoImg: HTMLImageElement | null,
): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = PAGE_W * RENDER_SCALE;
  canvas.height = PAGE_H * RENDER_SCALE;
  const ctx = canvas.getContext('2d')!;
  ctx.scale(RENDER_SCALE, RENDER_SCALE);

  // White paper background
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, PAGE_W, PAGE_H);

  // Header
  ctx.fillStyle = '#0F172A';
  ctx.font = 'bold 14px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  const title = sequence.name.trim() || item.displayTitle;
  ctx.fillText(title, MARGIN_X, 20, PAGE_W - MARGIN_X * 2 - 74);

  const parts: string[] = [];
  if (item.author.trim()) parts.push(item.author);
  if (item.year.trim()) parts.push(item.year);
  parts.push(`${sequence.steps.length} ${pluralSteps(sequence.steps.length)}`);
  if (sequence.doi.trim()) {
    let doi = sequence.doi;
    try {
      doi = decodeURIComponent(doi);
    } catch {
      // keep raw
    }
    parts.push(`doi:${doi}`);
  }
  ctx.fillStyle = '#64748B';
  ctx.font = '9.5px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillText(parts.join(' · '), MARGIN_X, 32, PAGE_W - MARGIN_X * 2 - 74);

  // Badge on right
  const bw = 64;
  const bh = 18;
  const bx = PAGE_W - MARGIN_X - bw;
  const by = 11;
  drawRoundedRect(ctx, bx, by, bw, bh, 9);
  ctx.fillStyle = showAnswers ? '#DCFCE7' : '#DBEAFE';
  ctx.fill();
  ctx.fillStyle = showAnswers ? '#15803D' : '#1D4ED8';
  ctx.font = 'bold 9.5px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(showAnswers ? 'Ответы' : 'Задание', bx + bw / 2, by + bh / 2 + 0.5);
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';

  // Divider
  ctx.strokeStyle = '#E2E8F0';
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.moveTo(MARGIN_X, HEADER_H);
  ctx.lineTo(PAGE_W - MARGIN_X, HEADER_H);
  ctx.stroke();

  // Board
  const availW = PAGE_W - 2 * MARGIN_X;
  const availH = PAGE_H - HEADER_H - FOOTER_H - 12;
  const scale = Math.min(availW / Math.max(1, board.width), availH / Math.max(1, board.height));
  const drawW = board.width * scale;
  const drawH = board.height * scale;
  const offsetX = (PAGE_W - drawW) / 2;
  const offsetY = HEADER_H + 6 + (availH - drawH) / 2;

  ctx.save();
  ctx.translate(offsetX, offsetY);
  ctx.scale(scale, scale);

  // Arrows
  const strokeW = Math.max(4.5, 1.35 / scale);
  const headLen = Math.max(22, 6.5 / scale);
  const headW = headLen * 0.45;
  ctx.strokeStyle = '#1E293B';
  ctx.fillStyle = '#1E293B';
  ctx.lineWidth = strokeW;
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
    ctx.lineTo(a.x2 - Math.cos(angle) * headLen + Math.sin(angle) * headW, a.y2 - Math.sin(angle) * headLen - Math.cos(angle) * headW);
    ctx.lineTo(a.x2 - Math.cos(angle) * headLen - Math.sin(angle) * headW, a.y2 - Math.sin(angle) * headLen + Math.cos(angle) * headW);
    ctx.closePath();
    ctx.fill();
  }

  // Reaction labels
  for (const l of board.labels) {
    ctx.drawImage(l.bitmap.canvas, l.x, l.y, l.width, l.height);
  }

  // Nodes
  const dash = Math.max(14, 4 / scale);
  for (const node of board.nodes) {
    const isMasked = node.hiddenByDefault && !showAnswers && !revealedNodeIndices.has(node.index);
    if (isMasked) {
      const radius = Math.max(14, 6 / scale);
      ctx.save();
      drawRoundedRect(ctx, node.x, node.y, node.width, node.height, radius);
      ctx.strokeStyle = 'rgba(155, 168, 184, 0.34)';
      ctx.lineWidth = Math.max(3.5, 1.1 / scale);
      ctx.setLineDash([dash, dash * 0.7]);
      ctx.stroke();
      ctx.restore();

      const fontSize = Math.max(36, Math.min(96, Math.min(node.width, node.height) * 0.28));
      ctx.fillStyle = 'rgba(130, 144, 162, 0.28)';
      ctx.font = `bold ${fontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(String(node.stageNumber), node.x + node.width / 2, node.y + node.height / 2);
      ctx.textAlign = 'left';
      ctx.textBaseline = 'alphabetic';
    } else {
      ctx.drawImage(node.bitmap.canvas, node.x, node.y, node.width, node.height);
    }
  }

  ctx.restore();

  // Footer
  const yTop = PAGE_H - FOOTER_H;
  ctx.strokeStyle = '#E2E8F0';
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.moveTo(MARGIN_X, yTop);
  ctx.lineTo(PAGE_W - MARGIN_X, yTop);
  ctx.stroke();

  if (sequence.citation) {
    const cit = sequence.citation;
    const maxH = FOOTER_H - 8;
    const maxW = PAGE_W * 0.65;
    const sc = Math.min(maxH / Math.max(1, cit.height), maxW / Math.max(1, cit.width));
    const cw = cit.width * sc;
    const ch = cit.height * sc;
    ctx.drawImage(cit.canvas, MARGIN_X, yTop + (FOOTER_H - ch) / 2, cw, ch);
  }

  if (logoImg && logoImg.height > 0) {
    const targetH = 22;
    const targetW = targetH * (logoImg.width / logoImg.height);
    ctx.save();
    ctx.globalAlpha = 0.25;
    ctx.drawImage(
      logoImg,
      PAGE_W - MARGIN_X - targetW,
      yTop + (FOOTER_H - targetH) / 2,
      targetW,
      targetH,
    );
    ctx.restore();
  }

  return canvas;
}

export async function exportSynthesisPdf(
  item: CatalogItem,
  sequence: SequenceModel,
  revealedNodeIndices: Set<number> = new Set(),
): Promise<void> {
  const pageBoardH = sequence.citation ? A4_PAGE_H_CIT : A4_PAGE_H;
  const board = buildSnakeBoard(sequence, PDF_SNAKE_CONFIG, A4_PAGE_W, pageBoardH);
  const logoImg = await loadLogoImage();

  const page1Canvas = renderPdfPageToCanvas(item, sequence, board, false, revealedNodeIndices, logoImg);
  const page2Canvas = renderPdfPageToCanvas(item, sequence, board, true, new Set(), logoImg);

  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'pt',
    format: [PAGE_W, PAGE_H],
    compress: true,
  });

  doc.addImage(page1Canvas.toDataURL('image/png'), 'PNG', 0, 0, PAGE_W, PAGE_H, undefined, 'FAST');
  doc.addPage([PAGE_W, PAGE_H], 'landscape');
  doc.addImage(page2Canvas.toDataURL('image/png'), 'PNG', 0, 0, PAGE_W, PAGE_H, undefined, 'FAST');

  const rawName = item.full.trim() || sequence.name.trim() || 'synthesis';
  const safeName = rawName.replace(/[^a-zA-Z0-9а-яА-ЯёЁ._\- ]/g, '_').trim().slice(0, 80) || 'synthesis';

  doc.save(`${safeName}.pdf`);
}
