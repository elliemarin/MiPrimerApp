import type { Pt } from '../../geom/vec';
import { formatLength } from '../../units';
import type { GeneratorResult } from '../generator';
import { edgeLength, edgesLength } from '../outline';
import type { EdgeFinish, FabricRole, Piece, SeamRelation } from '../types';

/** Shared drafting helpers for the infant and girls' collection.
 * Every piece is drawn on its finished seam line; allowances are added once by
 * the engine from each edge, never baked into the coordinates. */
export interface EdgeDef { id: string; label: string; finish: EdgeFinish; allowance: number; c1?: Pt; c2?: Pt }
export interface CutDef { qty?: number; mirrorPairs?: boolean; onFold?: boolean; fabric?: FabricRole }

export const K = .5522847498307936;
export const cm = (mm: number) => formatLength(mm, 'cm');
export const P = (x: number, y: number): Pt => ({ x, y });
export const edge = (id: string, label: string, finish: EdgeFinish, allowance: number, c1?: Pt, c2?: Pt): EdgeDef =>
  ({ id, label, finish, allowance: finish === 'doblez' ? 0 : allowance, ...(c1 && c2 ? { c1, c2 } : {}) });

export function outline(id: string, name: string, points: Pt[], edges: EdgeDef[], cut: CutDef = {}): Piece {
  if (points.length !== edges.length) throw new Error(`${id}: ${points.length} nodos y ${edges.length} bordes`);
  const xs = points.map(p => p.x), ys = points.map(p => p.y);
  const minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys), maxY = Math.max(...ys);
  return {
    id, name, source: 'generada',
    nodes: points.map((p, i) => ({ id: `n${i}`, x: p.x, y: p.y })),
    edges: edges.map((e, i) => ({ id: e.id, label: e.label, from: `n${i}`, to: `n${(i + 1) % points.length}`, kind: e.c1 && e.c2 ? 'cubic' as const : 'line' as const, ...(e.c1 && e.c2 ? { c1: e.c1, c2: e.c2 } : {}), allowance: e.allowance, finish: e.finish })),
    grain: { a: P((minX + maxX) / 2, minY + (maxY - minY) * .22), b: P((minX + maxX) / 2, minY + (maxY - minY) * .78) },
    cut: { qty: cut.qty ?? 1, mirrorPairs: cut.mirrorPairs ?? false, onFold: cut.onFold ?? false, fabric: cut.fabric ?? 'principal' },
    notches: [], lines: [], marks: []
  };
}

/** Rectangle edges run top, right, bottom, left. */
export function rectangle(id: string, name: string, w: number, h: number, edges: [EdgeDef, EdgeDef, EdgeDef, EdgeDef], cut: CutDef = {}, horizontalGrain = false): Piece {
  const piece = outline(id, name, [P(0, 0), P(w, 0), P(w, h), P(0, h)], edges, cut);
  if (horizontalGrain) piece.grain = { a: P(w * .2, h / 2), b: P(w * .8, h / 2) };
  return piece;
}

/** Same contour for the lining or reverse; IDs stay stable for overrides. */
export function copyPiece(source: Piece, id: string, name: string, cut: CutDef): Piece {
  return { ...structuredClone(source), id, name, cut: { ...source.cut, ...cut }, notches: [], lines: [], marks: [] };
}

/** Cubic of a circular arc from angle a0 to a1 (radians, y axis down). */
export function arc(center: Pt, r: number, a0: number, a1: number) {
  const k = 4 / 3 * Math.tan((a1 - a0) / 4);
  const start = P(center.x + r * Math.cos(a0), center.y + r * Math.sin(a0));
  const end = P(center.x + r * Math.cos(a1), center.y + r * Math.sin(a1));
  return { start, end, c1: P(start.x - k * r * Math.sin(a0), start.y + k * r * Math.cos(a0)), c2: P(end.x + k * r * Math.sin(a1), end.y - k * r * Math.cos(a1)) };
}

export const len = (piece: Piece, id: string) => edgeLength(piece, piece.edges.find(e => e.id === id)!);
export const lens = (piece: Piece, ids: string[]) => edgesLength(piece, ids);

export function equal(id: string, label: string, a: SeamRelation['a'], b: SeamRelation['b'], tolerance = .5): SeamRelation {
  return { id, label, kind: 'igual', a, b, ratioMin: .999, ratioMax: 1.001, tolerance };
}
export function ratio(id: string, label: string, kind: 'fruncido' | 'estirado' | 'embebido', a: SeamRelation['a'], b: SeamRelation['b'], target: number, spread = .03, note?: string): SeamRelation {
  return { id, label, kind, a, b, ratioMin: target - spread, ratioMax: target + spread, ...(note ? { note } : {}) };
}

export function invalid(code: string, message: string): GeneratorResult {
  return { pieces: [], seams: [], checks: [], materials: [], steps: [], assumptions: [], notices: [{ level: 'error', code, message }] };
}

/** Monotone bisection for geometric targets (lengths grow with the parameter). */
export function solve(f: (x: number) => number, target: number, lo: number, hi: number): number {
  for (let i = 0; i < 60; i++) { const mid = (lo + hi) / 2; if (f(mid) < target) lo = mid; else hi = mid; }
  return (lo + hi) / 2;
}

/** Bias or knit strip; the long edge is the stitched reference length. */
export function bindingStrip(id: string, name: string, length: number, finishedWidth: number, qty: number, endAllowance: number, fabric: FabricRole = 'contraste'): Piece {
  const ends = endAllowance > 0 ? 'costura' : 'sin-margen';
  const strip = rectangle(id, name, length, 4 * finishedWidth, [
    edge('largo-superior', 'Canto de unión', 'sin-margen', 0), edge('extremo-der', 'Extremo', ends, endAllowance),
    edge('largo-inferior', 'Canto libre', 'sin-margen', 0), edge('extremo-izq', 'Extremo', ends, endAllowance)
  ], { qty, fabric }, true);
  for (const f of [.25, .5, .75]) strip.lines.push({ id: `pliegue-${f}`, kind: 'doblez', a: P(0, 4 * finishedWidth * f), b: P(length, 4 * finishedWidth * f), label: 'Planchar en cuatro a lo largo' });
  strip.notes = [`Cortar al bies (45°). Ancho de corte ${cm(4 * finishedWidth)}; ribete visible ${cm(finishedWidth)}.`];
  return strip;
}

/** Point on a cubic edge for placement marks and ruffle rows. */
export function cubicPoint(p0: Pt, c1: Pt, c2: Pt, p3: Pt, t: number): Pt {
  const u = 1 - t;
  return P(u * u * u * p0.x + 3 * u * u * t * c1.x + 3 * u * t * t * c2.x + t * t * t * p3.x, u * u * u * p0.y + 3 * u * u * t * c1.y + 3 * u * t * t * c2.y + t * t * t * p3.y);
}
export const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
export const finite = (...values: number[]) => values.every(Number.isFinite);
