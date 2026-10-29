import { Cubic, cubicLength, cubicTAtLength, cubicAt, cubicTangent, flattenCubic } from '../geom/bezier';
import { Pt, dist, norm, sub, signedArea, pointAtLength, lerp } from '../geom/vec';
import type { PEdge, Piece, PNode } from './types';

export function nodeById(piece: Piece, id: string): PNode {
  const n = piece.nodes.find((n) => n.id === id);
  if (!n) throw new Error(`Nodo inexistente ${id} en ${piece.id}`);
  return n;
}

export function edgeById(piece: Piece, id: string): PEdge {
  const e = piece.edges.find((e) => e.id === id);
  if (!e) throw new Error(`Borde inexistente ${id} en ${piece.id}`);
  return e;
}

export function edgeEnds(piece: Piece, e: PEdge): [Pt, Pt] {
  const a = nodeById(piece, e.from);
  const b = nodeById(piece, e.to);
  return [{ x: a.x, y: a.y }, { x: b.x, y: b.y }];
}

export function edgeCubic(piece: Piece, e: PEdge): Cubic | null {
  if (e.kind !== 'cubic' || !e.c1 || !e.c2) return null;
  const [p0, p3] = edgeEnds(piece, e);
  return { p0, c1: e.c1, c2: e.c2, p3 };
}

export function edgePolyline(piece: Piece, e: PEdge, tol = 0.02): Pt[] {
  const c = edgeCubic(piece, e);
  if (c) return flattenCubic(c, tol);
  return edgeEnds(piece, e);
}

export function edgeLength(piece: Piece, e: PEdge): number {
  const c = edgeCubic(piece, e);
  if (c) return cubicLength(c);
  const [a, b] = edgeEnds(piece, e);
  return dist(a, b);
}

export function edgesLength(piece: Piece, ids: string[]): number {
  return ids.reduce((s, id) => s + edgeLength(piece, edgeById(piece, id)), 0);
}

export function pointOnEdge(piece: Piece, e: PEdge, s: number): { p: Pt; tangent: Pt } {
  const c = edgeCubic(piece, e);
  if (c) {
    const t = cubicTAtLength(c, s);
    return { p: cubicAt(c, t), tangent: cubicTangent(c, t) };
  }
  const [a, b] = edgeEnds(piece, e);
  const l = dist(a, b);
  return { p: lerp(a, b, l < 1e-9 ? 0 : Math.max(0, Math.min(1, s / l))), tangent: norm(sub(b, a)) };
}

export function edgeStartTangent(piece: Piece, e: PEdge): Pt {
  const c = edgeCubic(piece, e);
  if (c) return cubicTangent(c, 0);
  const [a, b] = edgeEnds(piece, e);
  return norm(sub(b, a));
}

export function edgeEndTangent(piece: Piece, e: PEdge): Pt {
  const c = edgeCubic(piece, e);
  if (c) return cubicTangent(c, 1);
  const [a, b] = edgeEnds(piece, e);
  return norm(sub(b, a));
}

/** Polígono de la línea de costura (contorno terminado), sin repetir el primer punto. */
export function seamPolygon(piece: Piece, tol = 0.05): Pt[] {
  const out: Pt[] = [];
  for (const e of piece.edges) {
    const poly = edgePolyline(piece, e, tol);
    for (let i = 0; i < poly.length - 1; i++) out.push(poly[i]);
  }
  return out;
}

/** +1 si el interior queda a la izquierda del recorrido (sentido matemático). */
export function orientation(piece: Piece): 1 | -1 {
  return signedArea(seamPolygon(piece, 0.5)) >= 0 ? 1 : -1;
}

/** Normal exterior para una tangente dada según la orientación de la pieza. */
export function outwardNormal(tangent: Pt, orient: 1 | -1): Pt {
  // Con orientación +1 el interior está a la izquierda: el exterior a la derecha.
  return orient === 1 ? { x: tangent.y, y: -tangent.x } : { x: -tangent.y, y: tangent.x };
}

const f = (v: number) => (Math.round(v * 1000) / 1000).toString();

export function edgeSvgSegment(piece: Piece, e: PEdge): string {
  const b = nodeById(piece, e.to);
  if (e.kind === 'cubic' && e.c1 && e.c2) {
    return `C ${f(e.c1.x)} ${f(e.c1.y)} ${f(e.c2.x)} ${f(e.c2.y)} ${f(b.x)} ${f(b.y)}`;
  }
  return `L ${f(b.x)} ${f(b.y)}`;
}

export function pieceSeamPath(piece: Piece): string {
  if (!piece.edges.length) return '';
  const start = nodeById(piece, piece.edges[0].from);
  return `M ${f(start.x)} ${f(start.y)} ` + piece.edges.map((e) => edgeSvgSegment(piece, e)).join(' ') + ' Z';
}

export function edgeSvgPath(piece: Piece, e: PEdge): string {
  const a = nodeById(piece, e.from);
  return `M ${f(a.x)} ${f(a.y)} ${edgeSvgSegment(piece, e)}`;
}

export function polylinePath(pts: Pt[], closed = true): string {
  if (!pts.length) return '';
  return 'M ' + pts.map((p) => `${f(p.x)} ${f(p.y)}`).join(' L ') + (closed ? ' Z' : '');
}

export { pointAtLength };
