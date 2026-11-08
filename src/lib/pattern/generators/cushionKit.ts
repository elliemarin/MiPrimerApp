import type { Pt } from '../../geom/vec';
import type { FabricRole, Issue, Piece, SeamRelation } from '../types';
import { edgeLength, seamPolygon } from '../outline';
import { cm, edge, equal, ratio, rectangle } from './kidsShared';
import { intersectPolygons } from '../../geom/polyoffset';
import { notchAt, plush, runLength, side, type A, type PieceOpts, type ToyScale } from './toyKit';

/* Kit de cojines (2026-11-08): vivo, fuelle, cierre, tiras largas partidas en
 * tramos y piezas que se cortan de una silueta (franjas, sombrero y pie). Todo
 * en milímetros reales; el margen se añade fuera de la línea de costura como en
 * cualquier patrón de Hilvana, así que cada cojín se imprime o se proyecta 1:1. */

export const CUSHION_SLEEP: Issue = { level: 'aviso', code: 'cojin-seguridad', message: 'Los cojines y peluches no van en la cuna de un bebé menor de 12 meses ni sirven para dormirlo: úsalos con el bebé despierto y acompañado. Ojos y detalles bordados, sin botones ni piezas que se suelten.' };
export const CUSHION_BEADS: Issue = { level: 'aviso', code: 'cojin-bolitas', message: 'Si lo rellenas con bolitas, mételas en una funda interior cerrada y usa una cremallera con tope o cosida: las bolitas son peligrosas si un niño las aspira.' };
export const cushionMargin = { key: 'margen', label: 'Margen de costura', group: 'margenes' as const, type: 'length' as const, min: 6, max: 15 };
export const pipingParam = { key: 'vivo', label: 'Vivo en la costura', group: 'diseno' as const, type: 'choice' as const, choices: [{ value: 'no', label: 'Sin vivo' }, { value: 'si', label: 'Con vivo (cordón de 5 mm forrado al bies)' }] };
export const gussetParam = (max = 150) => ({ key: 'fuelle', label: 'Fuelle: grosor del costado (0 = cojín plano)', group: 'diseno' as const, type: 'length' as const, min: 0, max });
export const closureParam = { key: 'cierre', label: 'Cierre', group: 'diseno' as const, type: 'choice' as const, choices: [{ value: 'abertura', label: 'Abertura cerrada a mano' }, { value: 'cremallera', label: 'Cremallera invisible (funda lavable)' }] };

export interface CushionCommon { sa: number; vivo: boolean; fuelle: number; zip: boolean }
export function readCommon(p: Record<string, string | number>, maxGusset = 150): CushionCommon | string {
  // A pattern without a gusset ignores any value left over from another cushion.
  const sa = Number(p.margen), fuelle = maxGusset > 0 ? Number(p.fuelle ?? 0) : 0;
  if (!(sa >= 6 && sa <= 15)) return 'El margen va de 6 a 15 mm.';
  if (!(fuelle >= 0 && fuelle <= maxGusset)) return `El fuelle va de 0 a ${cm(maxGusset)}.`;
  return { sa, vivo: p.vivo === 'si', fuelle, zip: p.cierre === 'cremallera' };
}

/** Every sewn edge of a piece (fold edges are not seams). */
export const sewnEdges = (piece: Piece) => piece.edges.filter(e => e.finish !== 'doblez');
const isFold = (piece: Piece) => piece.edges.some(e => e.finish === 'doblez');
/** Length of the seam around a piece, counting both halves of a piece cut on the fold. */
export function sewnLength(piece: Piece) {
  return sewnEdges(piece).reduce((s, e) => s + edgeLength(piece, e), 0) * (isFold(piece) ? 2 : 1);
}
/** A seam side covering every sewn edge of a piece. */
export const around = (piece: Piece, factor = 1) => ({ pieceId: piece.id, edgeIds: sewnEdges(piece).map(e => e.id), factor: factor * (isFold(piece) ? 2 : 1) });

/** Area enclosed by the seam line (mm²), both halves for a piece cut on the fold. */
export function seamArea(piece: Piece) {
  const poly = seamPolygon(piece, 0.5);
  let a = 0;
  for (let i = 0; i < poly.length; i++) { const p = poly[i], q = poly[(i + 1) % poly.length]; a += p.x * q.y - q.x * p.y; }
  return Math.abs(a / 2) * (isFold(piece) ? 2 : 1);
}
/** Fibre for a stuffed cushion: about 0,22 g per cm² of face, more with a gusset. */
export const stuffing = (faceMm2: number, fuelle = 0) => ({ id: 'relleno', label: 'Relleno de fibra hueca siliconada', qty: `unos ${Math.max(20, Math.round(faceMm2 / 100 * 0.22 * (1 + fuelle / 120) / 10) * 10)} g` });

/**
 * A long strip (gusset, piping, ruffle) cut in equal lengths no longer than
 * `maxLen` mm; the long edges are the stitched reference length.
 */
export function strips(id: string, name: string, total: number, width: number, sa: number, fabric: FabricRole, o: { maxLen?: number; hem?: number; bias?: boolean; endSa?: number } = {}) {
  const n = Math.max(1, Math.ceil(total / (o.maxLen ?? 1100))), L = total / n, ends = o.endSa ?? sa;
  const piece = rectangle(id, n > 1 ? `${name} (${n} tramos iguales: únelos por los extremos)` : name, L, width, [
    edge('canto', 'Canto de unión', 'costura', sa), edge('extremo', 'Extremo: une con el tramo siguiente', 'costura', ends),
    o.hem !== undefined ? edge('canto-b', 'Bajo (dobladillo)', 'dobladillo', o.hem) : edge('canto-b', 'Canto de unión', 'costura', sa), edge('extremo-b', 'Extremo', 'costura', ends)
  ], { qty: n, fabric }, true);
  if (o.bias) piece.notes = ['Cortar al bies (45°) para que siga las curvas.'];
  return { piece, n };
}

type SideRef = { pieceId: string; edgeIds: string[]; factor?: number };
/** The seam that goes around a cushion: which edges and how long (mm). */
export interface Perimeter { sides: SideRef[]; length: number }
export const perimeterOf = (face: Piece, count = 1): Perimeter => ({ sides: [around(face, count)], length: sewnLength(face) * count });
export const perimeterOfRuns = (parts: [Piece, string][], count = 1): Perimeter =>
  ({ sides: parts.map(([p, r]) => ({ ...side(p, r), factor: count })), length: parts.reduce((t, [p, r]) => t + runLength(p, r), 0) * count });

export interface FinishOpts {
  /** Where the opening or the invisible zipper goes (0–1 along the run, centre). */
  open?: { piece: Piece; run: string; at?: number };
  /** Prefix for piece and seam ids when one pattern has several cushions. */
  prefix?: string;
  zipMax?: number;
  name?: string;
}
/**
 * Common cushion finishing: opening or invisible zipper marked on the face,
 * piping strip and gusset strip whose lengths are checked against the seam.
 */
export function finishCushion(perim: Perimeter, c: CushionCommon, out: { pieces: Piece[]; seams: SeamRelation[]; notices: Issue[]; materials: { id: string; label: string; qty: string }[] }, o: FinishOpts = {}) {
  const pre = o.prefix ?? '', of = o.name ? ` (${o.name})` : '';
  let opening = 0;
  if (o.open) {
    const L = runLength(o.open.piece, o.open.run), at = (o.open.at ?? 0.5) * L;
    opening = c.zip ? Math.max(150, Math.min(o.zipMax ?? 600, Math.floor(0.6 * L / 50) * 50)) : Math.max(60, Math.min(160, 0.45 * L));
    if (c.zip && opening > 0.9 * L) opening = Math.floor(0.9 * L / 10) * 10;
    const s0 = Math.max(0, Math.min(L - opening, at - opening / 2));
    const what = c.zip ? `Cremallera invisible de ${cm(opening)}${c.fuelle ? ' (va en el fuelle, a esta altura)' : ' (entre delantero y trasero)'}` : `Abertura para voltear y rellenar${c.fuelle ? ' (déjala en el fuelle, a esta altura)' : ' (solo en una pieza)'}: se cierra a punto escondido`;
    notchAt(o.open.piece, o.open.run, s0, what, `${pre}abertura-a`); notchAt(o.open.piece, o.open.run, s0 + opening, c.zip ? 'Fin de la cremallera' : 'Fin de la abertura', `${pre}abertura-b`);
    if (c.zip) out.materials.push({ id: `${pre}cremallera`, label: `Cremallera invisible de ${cm(opening)}${of}`, qty: '1' });
  }
  if (c.vivo) {
    const s = strips(`${pre}vivo`, `Tira al bies para el vivo${of} (envuelve un cordón de 5 mm)`, perim.length, 40, 0, 'contraste', { maxLen: 1300, bias: true, endSa: 15 });
    s.piece.edges.forEach(e => { if (e.id.startsWith('canto')) { e.finish = 'sin-margen'; e.allowance = 0; } });
    out.pieces.push(s.piece);
    out.seams.push(equal(`${pre}vivo`, `Vivo alrededor de la costura${of}`, [{ pieceId: s.piece.id, edgeIds: ['canto'], factor: s.n }], perim.sides, 0.6));
    out.materials.push({ id: `${pre}cordon`, label: `Cordón de algodón de 5 mm para el vivo${of}`, qty: cm(perim.length + 60) });
  }
  if (c.fuelle > 0) {
    const fab = out.pieces.find(x => x.id === perim.sides[0].pieceId)?.cut.fabric ?? 'principal';
    const s = strips(`${pre}fuelle`, `Fuelle de ${cm(c.fuelle)}${of} (costado del cojín)`, perim.length, c.fuelle, c.sa, fab);
    out.pieces.push(s.piece);
    out.seams.push(equal(`${pre}fuelle`, `Fuelle con el contorno del delantero${of}`, [{ pieceId: s.piece.id, edgeIds: ['canto'], factor: s.n }], perim.sides, 0.6),
      equal(`${pre}fuelle-b`, `Fuelle con el contorno del trasero${of}`, [{ pieceId: s.piece.id, edgeIds: ['canto-b'], factor: s.n }], perim.sides, 0.6));
  }
  return { opening };
}

/** Gathered ruffle strip: its stitched edge is `fullness` times the seam it is gathered into. */
export function ruffle(perim: Perimeter, width: number, fullness: number, sa: number, out: { pieces: Piece[]; seams: SeamRelation[] }, fabric: FabricRole = 'contraste') {
  const total = perim.length * fullness;
  const s = strips('volante', `Volante (${fullness} veces el contorno, fruncido)`, total, width, sa, fabric, { maxLen: 1400, hem: 8 });
  out.pieces.push(s.piece);
  out.seams.push(ratio('volante', 'Volante fruncido alrededor del cojín', 'fruncido', [{ pieceId: s.piece.id, edgeIds: ['canto'], factor: s.n }], perim.sides, fullness, 0.02));
  return s;
}

/** Douglas–Peucker on a closed polygon, never dropping the points `keep` marks. */
function simplify(pts: Pt[], tol: number, keep: (p: Pt) => boolean): Pt[] {
  if (pts.length < 8) return pts;
  const mark = new Array(pts.length).fill(false);
  const anchors = pts.map((p, i) => (keep(p) ? i : -1)).filter(i => i >= 0);
  // Always keep the extreme points so the closed ring splits into open runs.
  let far = 0;
  for (let i = 1; i < pts.length; i++) if (Math.hypot(pts[i].x - pts[0].x, pts[i].y - pts[0].y) > Math.hypot(pts[far].x - pts[0].x, pts[far].y - pts[0].y)) far = i;
  const fixed = [...new Set([0, far, ...anchors])].sort((a, b) => a - b);
  fixed.forEach(i => { mark[i] = true; });
  const dp = (a: number, b: number) => {
    const A = pts[a], B = pts[b % pts.length], dx = B.x - A.x, dy = B.y - A.y, L = Math.hypot(dx, dy) || 1;
    let worst = -1, wd = tol;
    for (let i = a + 1; i < b; i++) { const P0 = pts[i % pts.length], d = Math.abs(dy * (P0.x - A.x) - dx * (P0.y - A.y)) / L; if (d > wd) { wd = d; worst = i; } }
    if (worst > 0) { mark[worst % pts.length] = true; dp(a, worst); dp(worst, b); }
  };
  for (let j = 0; j < fixed.length; j++) dp(fixed[j], j + 1 < fixed.length ? fixed[j + 1] : fixed[0] + pts.length);
  return pts.filter((_, i) => mark[i]);
}

/** Piece from a polygon (mm): straight edges, runs named by `runOf` for each edge. */
export function polyRuns(id: string, name: string, pts: Pt[], runOf: (a: Pt, b: Pt) => string, t: ToyScale, o: PieceOpts = {}, keep: (p: Pt) => boolean = () => false): Piece {
  let area = 0;
  for (let i = 0; i < pts.length; i++) { const a = pts[i], b = pts[(i + 1) % pts.length]; area += a.x * b.y - b.x * a.y; }
  let q = area < 0 ? [...pts].reverse() : [...pts];
  // Merge points closer than half a millimetre, keeping corners that must stay (cut lines).
  const merged: Pt[] = [];
  for (const p of q) {
    const last = merged[merged.length - 1];
    if (last && Math.hypot(p.x - last.x, p.y - last.y) < 0.5) { if (keep(p) && !keep(last)) merged[merged.length - 1] = p; continue; }
    merged.push(p);
  }
  while (merged.length > 3 && Math.hypot(merged[0].x - merged[merged.length - 1].x, merged[0].y - merged[merged.length - 1].y) < 0.5) {
    if (keep(merged[merged.length - 1]) && !keep(merged[0])) merged.shift(); else merged.pop();
  }
  q = simplify(merged, 0.3, keep);
  const runs = q.map((a, i) => runOf(a, q[(i + 1) % q.length]));
  let start = runs.findIndex((r, i) => r !== runs[(i - 1 + runs.length) % runs.length]);
  if (start < 0) start = 0;
  const order = q.map((_, i) => (i + start) % q.length);
  const anchors: A[] = order.map((idx, j) => [q[idx].x, q[idx].y, j === 0 || runs[idx] !== runs[order[j - 1]] ? runs[idx] : undefined, 'cl']);
  return plush(id, name, anchors, { ...t, k: 1 }, o);
}

/**
 * Cut a silhouette (a piece drawn on its seam line) into horizontal bands at the
 * given heights (mm). Each band keeps the silhouette's edges as `contorno` and
 * gets `arriba` / `abajo` along the cuts, so neighbouring bands match exactly.
 */
export function bandsOf(silhouette: Piece, cuts: number[], make: (i: number) => { id: string; name: string; o: PieceOpts }, t: ToyScale): Piece[] {
  const poly = seamPolygon(silhouette, 0.2), ys = poly.map(p => p.y), top = Math.min(...ys) - 10, bottom = Math.max(...ys) + 10;
  const lines = [top, ...cuts, bottom], out: Piece[] = [];
  for (let i = 0; i < lines.length - 1; i++) {
    const y0 = lines[i], y1 = lines[i + 1];
    const band = intersectPolygons([poly], [[{ x: -1e5, y: y0 }, { x: 1e5, y: y0 }, { x: 1e5, y: y1 }, { x: -1e5, y: y1 }]]);
    const biggest = band.sort((a, b) => b.length - a.length)[0];
    const near = (v: number, w: number) => Math.abs(v - w) < 0.01;
    const m = make(i);
    out.push(polyRuns(m.id, m.name, biggest, (a, b) => i > 0 && near(a.y, y0) && near(b.y, y0) ? 'arriba' : i < lines.length - 2 && near(a.y, y1) && near(b.y, y1) ? 'abajo' : 'contorno', t, m.o, q => near(q.y, y0) || near(q.y, y1)));
  }
  return out;
}

/** Distance along a run to the node closest to a point. */
export function sAtPoint(piece: Piece, run: string, at: Pt) {
  let best = 0, bestD = Infinity, s = 0;
  const es = piece.edges.filter(e => e.id === run || new RegExp(`^${run}-\\d+$`).test(e.id));
  for (const e of es) {
    const n = piece.nodes.find(x => x.id === e.from)!, d = Math.hypot(n.x - at.x, n.y - at.y);
    if (d < bestD) { bestD = d; best = s; }
    s += edgeLength(piece, e);
  }
  return best;
}
