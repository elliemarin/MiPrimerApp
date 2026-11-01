import type { Mat, Pt } from '../../lib/geom/vec';
import { matApply } from '../../lib/geom/vec';
import type { LineStyle } from '../../lib/draw/drawable';
import { applyH, localScale, type Homography } from '../../lib/projector/homography';
import { visibleTable, type ScreenSize } from '../../lib/projector/calibration';
import type { ScenePiece } from '../../lib/projector/scene';
import { PROJECTOR_COLORS, type ProjectorTheme } from '../../lib/pdf/projector';

/* Dibujo en canvas: los puntos se transforman uno a uno con la homografía, así
 * las líneas quedan nítidas a cualquier escala y el grosor se mide en píxeles. */

export const LINE: Record<LineStyle, { w: number; dash: number[] }> = {
  corte: { w: 2.6, dash: [] }, costura: { w: 1.5, dash: [10, 7] }, doblez: { w: 2, dash: [18, 6, 3, 6] },
  final: { w: 1.5, dash: [6, 5] }, pespunte: { w: 1.2, dash: [2, 6] }, referencia: { w: 1, dash: [] },
  colocacion: { w: 1.5, dash: [10, 6] }, hilo: { w: 2, dash: [] }, piquete: { w: 2.6, dash: [] }, bordado: { w: 1.6, dash: [6, 3, 2, 3] }
};
const ESSENTIAL: LineStyle[] = ['corte', 'piquete', 'doblez'];

export interface RenderOptions {
  size: ScreenSize; dpr: number; H: Homography; theme: ProjectorTheme; lineScale: number;
  pieces: ScenePiece[]; M: Mat; showSeam: boolean; showLabels: boolean; showGrid: boolean;
  /** Table point (mm) where the 5 cm control square is drawn. */
  check?: Pt;
}

export function tableToScreen(H: Homography, M: Mat | undefined, p: Pt): Pt { return applyH(H, M ? matApply(M, p) : p); }

function polyline(ctx: CanvasRenderingContext2D, pts: Pt[], closed = false) {
  ctx.beginPath();
  pts.forEach((p, i) => i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y));
  if (closed) ctx.closePath();
  ctx.stroke();
}

export function drawGrid(ctx: CanvasRenderingContext2D, H: Homography, size: ScreenSize, color: string, step = 100) {
  const vb = visibleTable(H, size);
  if (!vb) return;
  const clamp = (v: number) => Math.max(-6000, Math.min(6000, v));
  const minX = clamp(vb.minX), maxX = clamp(vb.maxX), minY = clamp(vb.minY), maxY = clamp(vb.maxY);
  ctx.save();
  ctx.strokeStyle = color; ctx.setLineDash([]);
  for (let x = Math.ceil(minX / step) * step; x <= maxX; x += step) { ctx.lineWidth = x % (step * 5) === 0 ? 1.6 : .8; polyline(ctx, [applyH(H, { x, y: minY }), applyH(H, { x, y: maxY })]); }
  for (let y = Math.ceil(minY / step) * step; y <= maxY; y += step) { ctx.lineWidth = y % (step * 5) === 0 ? 1.6 : .8; polyline(ctx, [applyH(H, { x: minX, y }), applyH(H, { x: maxX, y })]); }
  ctx.restore();
}

/** Square of `side` mm with centimetre ticks, centred on a table point. */
export function drawControlSquare(ctx: CanvasRenderingContext2D, H: Homography, center: Pt, side: number, color: string, label: string, ticks = true) {
  const h = side / 2, at = (x: number, y: number) => applyH(H, { x: center.x + x, y: center.y + y });
  ctx.save();
  ctx.strokeStyle = color; ctx.lineWidth = 2; ctx.setLineDash([]);
  polyline(ctx, [at(-h, -h), at(h, -h), at(h, h), at(-h, h)], true);
  if (ticks) {
    ctx.lineWidth = 1.2;
    for (let mm = 10; mm < side; mm += 10) {
      const t = mm % 50 === 0 ? 8 : 4;
      polyline(ctx, [at(-h + mm, -h), at(-h + mm, -h + t)]); polyline(ctx, [at(-h + mm, h), at(-h + mm, h - t)]);
      polyline(ctx, [at(-h, -h + mm), at(-h + t, -h + mm)]); polyline(ctx, [at(h, -h + mm), at(h - t, -h + mm)]);
    }
  }
  const c = at(0, 0), fontPx = Math.min(28, side * localScale(H, center) * .2);
  if (fontPx >= 8) {
    ctx.fillStyle = color; ctx.font = `600 ${fontPx}px system-ui, sans-serif`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(label, c.x, c.y);
  }
  ctx.restore();
}

function arrowHead(ctx: CanvasRenderingContext2D, tip: Pt, from: Pt, size: number) {
  const len = Math.hypot(tip.x - from.x, tip.y - from.y) || 1, d = { x: (tip.x - from.x) / len, y: (tip.y - from.y) / len }, n = { x: -d.y, y: d.x };
  ctx.beginPath(); ctx.moveTo(tip.x, tip.y);
  ctx.lineTo(tip.x - d.x * size + n.x * size * .45, tip.y - d.y * size + n.y * size * .45);
  ctx.lineTo(tip.x - d.x * size - n.x * size * .45, tip.y - d.y * size - n.y * size * .45);
  ctx.closePath(); ctx.fill();
}

export function renderProjection(ctx: CanvasRenderingContext2D, o: RenderOptions) {
  const colors = PROJECTOR_COLORS[o.theme], map = (p: Pt) => tableToScreen(o.H, o.M, p);
  ctx.setTransform(o.dpr, 0, 0, o.dpr, 0, 0);
  ctx.fillStyle = colors.fondo; ctx.fillRect(0, 0, o.size.w, o.size.h);
  if (o.showGrid) drawGrid(ctx, o.H, o.size, colors.cuadricula);
  ctx.lineJoin = 'round'; ctx.lineCap = 'butt';
  for (const piece of o.pieces) {
    for (const line of piece.lines) {
      if (!o.showSeam && !ESSENTIAL.includes(line.style)) continue;
      const spec = LINE[line.style];
      ctx.strokeStyle = colors[line.style]; ctx.lineWidth = spec.w * o.lineScale; ctx.setLineDash(spec.dash.map(v => v * o.lineScale));
      polyline(ctx, line.pts.map(map), line.closed);
    }
    ctx.setLineDash([]); ctx.strokeStyle = colors.hilo; ctx.fillStyle = colors.hilo; ctx.lineWidth = LINE.hilo.w * o.lineScale;
    for (const g of piece.grains) {
      const a = map(g.a), b = map(g.b);
      polyline(ctx, [a, b]); arrowHead(ctx, b, a, 10 * o.lineScale); arrowHead(ctx, a, b, 10 * o.lineScale);
    }
    if (o.showLabels) {
      ctx.fillStyle = colors.texto; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      for (const label of piece.labels) {
        const tablePoint = matApply(o.M, label.at), at = applyH(o.H, tablePoint), px = localScale(o.H, tablePoint);
        // Direction of the label after placement and projection, kept readable.
        const rad = (label.angle ?? 0) * Math.PI / 180, dir = { x: Math.cos(rad), y: Math.sin(rad) };
        const end = map({ x: label.at.x + dir.x * 10, y: label.at.y + dir.y * 10 });
        let angle = Math.atan2(end.y - at.y, end.x - at.x);
        if (angle > Math.PI / 2) angle -= Math.PI; else if (angle < -Math.PI / 2) angle += Math.PI;
        // Real size: a label too small to read is skipped, never enlarged over the lines.
        const fontPx = label.size * 1.3 * px;
        if (fontPx < 7) continue;
        ctx.save(); ctx.translate(at.x, at.y); ctx.rotate(angle);
        ctx.font = `${label.bold ? '700 ' : ''}${fontPx}px system-ui, sans-serif`;
        ctx.fillText(label.text, 0, 0); ctx.restore();
      }
    }
  }
  if (o.check) drawControlSquare(ctx, o.H, o.check, 50, colors.costura, '5 cm');
}
