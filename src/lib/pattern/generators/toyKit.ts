import type { Pt } from '../../geom/vec';
import type { EdgeFinish, Piece, SeamRelation } from '../types';
import { P, edge, equal, outline, type CutDef, type EdgeDef } from './kidsShared';
import { edgeLength } from '../outline';

/* Kit para juguetes y peluches cosidos. Cada pieza se dibuja sobre su línea de
 * costura en una caja de diseño a 30 cm de alto (1 unidad = 1 mm) y se escala
 * con el alto pedido; el margen se añade después, en milímetros reales, como en
 * cualquier patrón de Hilvana. Los bordes llevan nombre para comprobar que las
 * costuras que se unen midan lo mismo. */

/** Anchor: x, y, name of the edge run that starts here, flags: c = corner, l = straight to the next anchor. */
export type A = [x: number, y: number, run?: string, flags?: string];

export interface ToyScale {
  /** Escala respecto a la caja de diseño. */
  k: number;
  /** Margen de costura (mm), 0 en fieltro. */
  sa: number;
  felt: boolean;
}

const RUN_LABEL: Record<string, string> = {
  contorno: 'Contorno', cuello: 'Cuello (une cabeza y cuerpo)', costado: 'Costado', base: 'Base (aquí van las piernas)', union: 'Unión: se mete en la costura del cuerpo',
  abertura: 'Abertura para voltear y rellenar: no coser', centro: 'Centro', borde: 'Borde', bajo: 'Bajo', cintura: 'Cintura', entrepierna: 'Entrepierna', escote: 'Escote', hombro: 'Hombro',
  sisa: 'Sisa', tiro: 'Tiro', copa: 'Copa de la manga', puno: 'Bajo de la manga', boca: 'Boca', suela: 'Unión a la suela', talon: 'Talón', frente: 'Frente', lado: 'Lado'
};

export interface PieceOpts extends CutDef {
  /** Run cut on the fold. */
  fold?: string;
  /** Runs finished with a hem instead of a seam: run → hem allowance (mm). */
  hems?: Record<string, number>;
  /** Runs left raw (felt, gathered or glued edges). */
  raw?: string[];
  labels?: Record<string, string>;
}

/** Smooth closed outline through anchors (cardinal spline); corners and straight runs where flagged. */
export function plush(id: string, name: string, anchors: A[], t: ToyScale, o: PieceOpts = {}): Piece {
  const pts = anchors.map(([x, y]) => P(x * t.k, y * t.k)), n = pts.length;
  if (!anchors[0][2]) throw new Error(`${id}: el primer punto debe nombrar su borde`);
  const flag = (i: number, f: string) => (anchors[(i + n) % n][3] ?? '').includes(f);
  const tangent = (i: number, outgoing: boolean): Pt => {
    const prev = pts[(i - 1 + n) % n], cur = pts[i], next = pts[(i + 1) % n];
    const d = flag(i, 'c') ? (outgoing ? { x: next.x - cur.x, y: next.y - cur.y } : { x: cur.x - prev.x, y: cur.y - prev.y }) : { x: next.x - prev.x, y: next.y - prev.y };
    const l = Math.hypot(d.x, d.y) || 1;
    return { x: d.x / l, y: d.y / l };
  };
  const count = new Map<string, number>();
  let run = anchors[0][2]!;
  const edges: EdgeDef[] = pts.map((a, i) => {
    run = anchors[i][2] ?? run;
    const c = (count.get(run) ?? 0) + 1;
    count.set(run, c);
    const eid = c === 1 ? run : `${run}-${c}`, b = pts[(i + 1) % n], chord = Math.hypot(b.x - a.x, b.y - a.y);
    const finish: EdgeFinish = o.fold === run ? 'doblez' : t.felt || o.raw?.includes(run) ? 'sin-margen' : o.hems?.[run] !== undefined ? 'dobladillo' : 'costura';
    const allowance = finish === 'dobladillo' ? o.hems![run] : finish === 'costura' ? t.sa : 0;
    const label = o.labels?.[run] ?? RUN_LABEL[run] ?? run;
    if (flag(i, 'l')) return edge(eid, label, finish, allowance);
    const t0 = tangent(i, true), t1 = tangent((i + 1) % n, false);
    return edge(eid, label, finish, allowance, P(a.x + t0.x * chord / 3, a.y + t0.y * chord / 3), P(b.x - t1.x * chord / 3, b.y - t1.y * chord / 3));
  });
  return outline(id, name, pts, edges, o);
}

/** Every edge of a named run (`run`, `run-2`, `run-3`…). */
export const ids = (piece: Piece, run: string) => piece.edges.filter(e => e.id === run || new RegExp(`^${run}-\\d+$`).test(e.id)).map(e => e.id);
export const runLength = (piece: Piece, run: string) => ids(piece, run).reduce((s, id) => s + edgeLength(piece, piece.edges.find(e => e.id === id)!), 0);

/** Notch at a distance (mm) along a run, measured from its start. */
export function notchAt(piece: Piece, run: string, s: number, label: string, id = `${run}-${Math.round(s)}`, count: 1 | 2 = 1) {
  let left = s;
  for (const eid of ids(piece, run)) {
    const l = edgeLength(piece, piece.edges.find(e => e.id === eid)!);
    if (left <= l + 1e-6) { piece.notches.push({ id, edgeId: eid, s: Math.max(0, Math.min(l, left)), count, label }); return; }
    left -= l;
  }
}
/** Two notches marking where a part of the given width is inserted, centred at fraction f of the run. */
export function insertion(piece: Piece, run: string, f: number, width: number, label: string, id: string) {
  const L = runLength(piece, run), c = L * f;
  notchAt(piece, run, c - width / 2, label, `${id}-a`);
  notchAt(piece, run, c + width / 2, label, `${id}-b`);
}

export const side = (piece: Piece, run: string, factor?: number) => ({ pieceId: piece.id, edgeIds: ids(piece, run), ...(factor ? { factor } : {}) });
export const match = (id: string, label: string, a: ReturnType<typeof side>, b: ReturnType<typeof side>, tolerance = 0.6): SeamRelation => equal(id, label, [a], [b], tolerance);

/** Ellipse outline as four cubic arcs, one named run (soles, eyes, bases). */
export function ellipsePiece(id: string, name: string, rx: number, ry: number, run: string, t: ToyScale, o: PieceOpts = {}, ksc = true): Piece {
  const kx = ksc ? t.k : 1, K = 0.5522847498;
  const a = rx * kx, b = ry * kx, pts = [P(0, -b), P(a, 0), P(0, b), P(-a, 0)];
  const ctrl: [Pt, Pt][] = [[P(a * K, -b), P(a, -b * K)], [P(a, b * K), P(a * K, b)], [P(-a * K, b), P(-a, b * K)], [P(-a, -b * K), P(-a * K, -b)]];
  const finish: EdgeFinish = t.felt || o.raw?.includes(run) ? 'sin-margen' : 'costura';
  const label = o.labels?.[run] ?? RUN_LABEL[run] ?? run;
  return outline(id, name, pts, ctrl.map(([c1, c2], i) => edge(i ? `${run}-${i + 1}` : run, label, finish, finish === 'costura' ? t.sa : 0, c1, c2)), o);
}

/** Straight polygon piece (all edges in one run), for strips, wings in felt and simple parts. */
export function polyPiece(id: string, name: string, pts: [number, number][], run: string, t: ToyScale, o: PieceOpts = {}): Piece {
  // Outlines run clockwise on screen (positive shoelace with y down).
  let a = 0;
  for (let i = 0; i < pts.length; i++) { const [x0, y0] = pts[i], [x1, y1] = pts[(i + 1) % pts.length]; a += x0 * y1 - x1 * y0; }
  const ordered = a < 0 ? [...pts].reverse() : pts;
  return plush(id, name, ordered.map(([x, y], i) => [x, y, i === 0 ? run : undefined, 'cl'] as A), t, o);
}

/** Embroidery guide on a piece (straight segments; curves as short polylines). */
export function embroider(piece: Piece, id: string, pts: [number, number][], k: number, label: string) {
  for (let i = 0; i < pts.length - 1; i++) piece.lines.push({ id: `${id}-${i}`, kind: 'pespunte', a: P(pts[i][0] * k, pts[i][1] * k), b: P(pts[i + 1][0] * k, pts[i + 1][1] * k), label: i === 0 ? label : undefined } as Piece['lines'][number]);
}
/** Closed-eye arc ("ojo dormido") as a short polyline, centred at (cx, cy). */
export const sleepyEye = (cx: number, cy: number, w: number, up = false): [number, number][] => Array.from({ length: 6 }, (_, i) => { const t = i / 5; return [cx - w / 2 + w * t, cy + (up ? -1 : 1) * Math.sin(Math.PI * t) * w * 0.32] as [number, number]; });
export const smile = (cx: number, cy: number, w: number): [number, number][] => Array.from({ length: 6 }, (_, i) => { const t = i / 5; return [cx - w / 2 + w * t, cy + Math.sin(Math.PI * t) * w * 0.28] as [number, number]; });

/** Narrowest finished width a stuffed part can have and still be turned right side out. */
export const MIN_TURN_WIDTH = 16;
