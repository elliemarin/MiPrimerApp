import type { Pt } from '../../lib/geom/vec';
import type { GeneratorResult, Params } from '../../lib/pattern/generator';
import type { Piece } from '../../lib/pattern/types';
import { nodeById, pointOnEdge, edgeLength } from '../../lib/pattern/outline';
import { circle, inter, rect, uni, type Shape, type ShapeLike } from '../../lib/applique/shapes';
import { polysPath } from '../../lib/applique/figure';
import type { PlushCard } from '../../data/toys';

/* Ayudantes de dibujo para juguetes y cojines: las ilustraciones se hacen con
 * las piezas reales del patrón (o con formas en unidades de diseño). */

/** One drawn layer of the illustration (millimetres of the real pattern, or design units). */
export interface Item { d: string; fill?: string; stroke?: string; sw?: number; transform?: string; dash?: string }
export const P = (x: number, y: number): Pt => ({ x, y });
export const shape = (s: Shape | Shape[number], fill: string, extra: Partial<Item> = {}): Item => ({ d: polysPath(Array.isArray(s[0]) ? s as Shape : [s as Shape[number]]), fill, ...extra });
export const line = (pts: Pt[], color: string, sw: number, transform?: string): Item => ({ d: `M${pts.map(p => `${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' L')}`, stroke: color, sw, transform });

export function runPoints(piece: Piece, run: string): Pt[] {
  const es = piece.edges.filter(e => e.id === run || new RegExp(`^${run}-\\d+$`).test(e.id));
  return es.length ? [P(nodeById(piece, es[0].from).x, nodeById(piece, es[0].from).y), P(nodeById(piece, es[es.length - 1].to).x, nodeById(piece, es[es.length - 1].to).y)] : [P(0, 0), P(0, 0)];
}
export function pointAlong(piece: Piece, run: string, s: number): Pt {
  let left = s;
  for (const e of piece.edges.filter(x => x.id === run || new RegExp(`^${run}-\\d+$`).test(x.id))) {
    const l = edgeLength(piece, e);
    if (left <= l) return pointOnEdge(piece, e, left).p;
    left -= l;
  }
  const last = piece.edges[piece.edges.length - 1];
  return P(nodeById(piece, last.to).x, nodeById(piece, last.to).y);
}
export const mid = (a: Pt, b: Pt) => P((a.x + b.x) / 2, (a.y + b.y) / 2);
export const embroidery = (pc: Piece, color: string, transform: string): Item[] => pc.lines.filter(l => l.kind === 'pespunte' && !/^pinza/.test(l.id)).map(l => line([l.a, l.b], color, Math.max(0.9, 1.6), transform));
export const moved = (pts: Pt[], dx: number, dy: number) => pts.map(q => P(q.x + dx, q.y + dy));
/** Fabric print (gingham, plaid or stripes) clipped to a shape; `step` is the repeat in drawing units. */
export function printOver(s: ShapeLike, c: PlushCard['colors'], step: number): Item[] {
  if (!c.print || !c.ropa2) return [];
  if (c.print === 'lunares') {
    const pts = (Array.isArray(s[0]) ? (s as Shape).flat() : (s as Shape[number])), xs = pts.map(q => q.x), ys = pts.map(q => q.y), dots: Shape[number][] = [];
    const i0 = Math.floor(Math.min(...xs) / step) - 1, i1 = Math.ceil(Math.max(...xs) / step) + 1, j0 = Math.floor(Math.min(...ys) / (step * 0.87)) - 1, j1 = Math.ceil(Math.max(...ys) / (step * 0.87)) + 1;
    for (let i = i0; i <= i1; i++) for (let j = j0; j <= j1; j++) dots.push(circle(i * step + (j % 2 ? step / 2 : 0), j * step * 0.87, step * 0.16, 12));
    return [shape(inter(s, uni(...dots)), `${c.ropa2}aa`, { stroke: 'none' })];
  }
  const big = 1e4, n = Math.ceil(2 * big / step);
  const v = uni(...Array.from({ length: Math.min(n, 400) }, (_, i) => rect(-200 * step + i * step, -big, step * (c.print === 'rayas' ? 0.32 : 0.5), 2 * big)));
  const out: Item[] = [shape(inter(s, v), `${c.ropa2}${c.print === 'rayas' ? 'aa' : '66'}`, { stroke: 'none' })];
  if (c.print !== 'rayas') {
    const h = uni(...Array.from({ length: Math.min(n, 400) }, (_, i) => rect(-big, -200 * step + i * step, 2 * big, step * 0.5)));
    out.push(shape(inter(s, h), `${c.ropa2}66`, { stroke: 'none' }));
    if (c.print === 'cuadros') out.push(shape(inter(s, uni(...Array.from({ length: Math.min(n, 400) }, (_, i) => rect(-200 * step + i * step + step * 0.7, -big, step * 0.06, 2 * big)))), '#f6e7c8aa', { stroke: 'none' }));
  }
  return out;
}


export type Scene = (card: PlushCard, result: GeneratorResult | null, params: Params) => Item[];
/** Where a notch sits on its piece (millimetres). */
export function notchPoint(piece: Piece, id: string): Pt | undefined {
  const n = piece.notches.find(x => x.id === id), e = n && piece.edges.find(x => x.id === n.edgeId);
  return n && e ? pointOnEdge(piece, e, n.s).p : undefined;
}
