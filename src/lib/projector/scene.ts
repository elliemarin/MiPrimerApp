import type { BBox, Mat, Pt } from '../geom/vec';
import { bboxOf, matApply, matMul } from '../geom/vec';
import { flattenCubic } from '../geom/bezier';
import { shelfPack } from '../geom/pack';
import type { DrawLabel, Drawable, LineStyle } from '../draw/drawable';

/* Escena de proyección en milímetros reales: polilíneas por estilo, textos y
 * flechas de hilo. Mover, girar o voltear nunca cambia el tamaño. */

export interface SceneLine { style: LineStyle; pts: Pt[]; closed: boolean }
export interface ScenePiece { id: string; name: string; lines: SceneLine[]; labels: DrawLabel[]; grains: { a: Pt; b: Pt }[]; bbox: BBox }
export interface Placement { x: number; y: number; rotation: 0 | 90 | 180 | 270; mirror: boolean }

export function sceneFromDrawable(d: Drawable, tolerance = .25): ScenePiece {
  const lines: SceneLine[] = [];
  for (const path of d.paths) {
    let cur: Pt = { x: 0, y: 0 }, pts: Pt[] = [];
    const flush = (closed: boolean) => { if (pts.length > 1) lines.push({ style: path.style, pts, closed }); pts = []; };
    for (const c of path.cmds) {
      if (c.op === 'M') { flush(false); cur = c.p; pts = [c.p]; }
      else if (c.op === 'L') { pts.push(c.p); cur = c.p; }
      else if (c.op === 'C') { pts.push(...flattenCubic({ p0: cur, c1: c.c1, c2: c.c2, p3: c.p }, tolerance).slice(1)); cur = c.p; }
      else flush(true);
    }
    flush(false);
  }
  return { id: d.id, name: d.name, lines, labels: d.labels, grains: d.grains, bbox: d.bbox };
}

const shift = (p: Pt, dx: number, dy: number) => ({ x: p.x + dx, y: p.y + dy });
export function translatePiece(p: ScenePiece, dx: number, dy: number): ScenePiece {
  return { ...p, lines: p.lines.map(l => ({ ...l, pts: l.pts.map(q => shift(q, dx, dy)) })), labels: p.labels.map(l => ({ ...l, at: shift(l.at, dx, dy) })),
    grains: p.grains.map(g => ({ a: shift(g.a, dx, dy), b: shift(g.b, dx, dy) })), bbox: { minX: p.bbox.minX + dx, minY: p.bbox.minY + dy, maxX: p.bbox.maxX + dx, maxY: p.bbox.maxY + dy } };
}

/** All pieces side by side without overlaps, rows no wider than `width` mm. */
export function layoutPieces(pieces: ScenePiece[], width: number, gap = 30): ScenePiece[] {
  if (!pieces.length) return [];
  const W = Math.max(width, ...pieces.map(p => p.bbox.maxX - p.bbox.minX));
  const packed = shelfPack(pieces.map(p => ({ id: p.id, w: p.bbox.maxX - p.bbox.minX, h: p.bbox.maxY - p.bbox.minY })), W, 1e9, gap);
  return packed.placed.map(slot => { const p = pieces.find(q => q.id === slot.id)!; return translatePiece(p, slot.x - p.bbox.minX, slot.y - p.bbox.minY); });
}

export function sceneBounds(pieces: ScenePiece[]): BBox {
  return bboxOf(pieces.flatMap(p => [{ x: p.bbox.minX, y: p.bbox.minY }, { x: p.bbox.maxX, y: p.bbox.maxY }]));
}

/** Pattern mm → table mm: turn and flip about the layout centre, then place it. */
export function placementMatrix(p: Placement, center: Pt): Mat {
  const r = p.rotation * Math.PI / 180, cos = Math.round(Math.cos(r)), sin = Math.round(Math.sin(r));
  const toOrigin: Mat = [1, 0, 0, 1, -center.x, -center.y];
  const flip: Mat = [p.mirror ? -1 : 1, 0, 0, 1, 0, 0];
  const turn: Mat = [cos, sin, -sin, cos, 0, 0];
  const place: Mat = [1, 0, 0, 1, p.x, p.y];
  return matMul(place, matMul(turn, matMul(flip, toOrigin)));
}

export const applyPlacement = (m: Mat, p: Pt) => matApply(m, p);
