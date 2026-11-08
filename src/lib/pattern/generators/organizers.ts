import { num, str, type GeneratorContext, type GeneratorResult, type ParamDef, type Params, type PatternGenerator } from '../generator';
import type { FabricRole, Issue, Mark, Piece, SeamRelation } from '../types';
import type { Pt } from '../../geom/vec';
import { seamPolygon } from '../outline';
import { P, cm, edge, equal, invalid, rectangle } from './kidsShared';
import { embroider, exp, plush, runLength, sleepyEye, smile, type A } from './toyKit';
import { polyRuns, strips } from './cushionKit';
import { circle, ellipse, rect, rrect, uni, type Shape } from '../../applique/shapes';
import { intersectPolygons, offsetPolygons, strokePolyline } from '../../geom/polyoffset';

/* Bolsilleros (2026-11-08): organizadores colgantes de tela —en francés
 * «porte-objets» o «vide-poches mural», en alemán «Utensilo», en inglés «wall
 * pocket organizer»—, rehechos como diseños propios a partir de las fotos de la
 * usuaria. Cada uno es una silueta acolchada (delantero, trasero y entretela)
 * con bolsillos forrados o con pliegues, apliques de fieltro, cara bordada y
 * un colgador. Los bolsillos y apliques se marcan en el delantero para coserlos
 * en su sitio y para proyectarlos. */

export interface OrgPocket {
  id: string; name: string;
  /** Where it is sewn on the front (mm). */
  place: Pt[];
  /** The pattern piece (mm); defaults to `place`. */
  piece?: Pt[];
  boca: (a: Pt, b: Pt) => boolean;
  lined: boolean; qty?: number; batting?: boolean; color: string; fabric?: FabricRole;
  dividers?: [Pt, Pt][]; folds?: [Pt, Pt][]; notes?: string;
  /** Decorative topstitching on the pocket itself (mm). */
  stitches?: Pt[][];
}
/** Appliqué; with qty 2 the second one is the mirror image on the other side of the (centred) body. */
export interface OrgDecor { id: string; name: string; poly: Pt[]; color: string; qty?: number }
export const decorPolys = (d: OrgDecor): Pt[][] => ((d.qty ?? 1) === 2 ? [d.poly, d.poly.map(q => P(-q.x, q.y)).reverse()] : [d.poly]);
/** Extra drawing for the card: behind the body, between body and pockets (`under`), or in front. */
export interface OrgDraw { poly: Pt[]; color: string; behind?: boolean; under?: boolean }
export interface OrgLayout {
  body: Pt[]; bodyName: string; bodyQty: number; foldBottom?: boolean;
  pockets: OrgPocket[]; decor: OrgDecor[]; emb: { pts: [number, number][]; label: string }[];
  hang: { kind: 'presilla' | 'tira' | 'jareta'; at: Pt[] };
  extras: Piece[]; draw: OrgDraw[]; seams: SeamRelation[];
  notes: Issue[]; steps: { id: string; title: string; detail: string }[]; materials: { id: string; label: string; qty: string }[];
  baby?: boolean;
  /** Overall width measured on something wider than the body (the fox's pocket strip), in mm. */
  span?: number;
  /** Embroidery seen only in the card drawing (on loose parts such as the bunny), in mm. */
  drawLines?: Pt[][];
}

const S = (k: number) => (pts: Pt[]) => pts.map(q => P(q.x * k, q.y * k));
const biggest = (s: Shape) => [...s].sort((a, b) => b.length - a.length)[0];
const smooth = (s: Shape, r: number) => biggest(offsetPolygons(offsetPolygons(s, r), -r));
/** Radius for concave bends with a given seam allowance: a tighter bend makes the cutting line loop over itself. */
const bendFor = (sa: number) => 1.5 * sa + 4;
const spline = (a: A[]) => seamPolygon(plush('t', 't', a, { k: 1, sa: 0, felt: true }), 0.4);
const near = (v: number, w: number) => Math.abs(v - w) < 0.05;
const topEdge = (y: number) => (a: Pt, b: Pt) => near(a.y, y) && near(b.y, y);
/** The part of a silhouette below a cut line (left to right), and a test for edges on the cut. */
function below(body: Pt[], cut: Pt[]): { poly: Pt[]; boca: (a: Pt, b: Pt) => boolean } {
  const xs = body.map(q => q.x), ys = body.map(q => q.y), x0 = Math.min(...xs) - 50, x1 = Math.max(...xs) + 50, y1 = Math.max(...ys) + 50;
  const line = [P(x0, cut[0].y), ...cut, P(x1, cut[cut.length - 1].y)], region = [...line, P(x1, y1), P(x0, y1)];
  const dist = (p: Pt) => Math.min(...line.slice(1).map((b, i) => { const a = line[i], dx = b.x - a.x, dy = b.y - a.y, t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / (dx * dx + dy * dy || 1))); return Math.hypot(p.x - a.x - t * dx, p.y - a.y - t * dy); }));
  return { poly: biggest(intersectPolygons([body], [region])), boca: (a, b) => dist(a) < 0.05 && dist(b) < 0.05 };
}
const box = (x0: number, y0: number, x1: number, y1: number) => [P(x0, y0), P(x1, y0), P(x1, y1), P(x0, y1)];
/** Rounds every concave bend of a body to at least radius r (mm) so the cutting line never crosses itself.
 * On a fold the whole (mirrored) shape is rounded and cut back at the fold. */
function closeBody(body: Pt[], r: number, fold: boolean): Pt[] {
  if (!fold) return smooth([body], r);
  const xs = body.map(q => q.x), ys = body.map(q => q.y), yMax = Math.max(...ys);
  const whole = smooth([body, body.map(q => P(q.x, 2 * yMax - q.y)).reverse()], r);
  return biggest(intersectPolygons([whole], [box(Math.min(...xs) - 10, Math.min(...ys) - 10, Math.max(...xs) + 10, yMax)]));
}
/** An appliqué kept at least d (mm) inside the body's seam line. */
const inset = (poly: Pt[], body: Pt[], d: number) => biggest(intersectPolygons([poly], offsetPolygons([body], -d)));
/** Convex hull (monotone chain). */
function hull(pts: Pt[]): Pt[] {
  const q = [...pts].sort((a, b) => a.x - b.x || a.y - b.y), cross = (o: Pt, a: Pt, b: Pt) => (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);
  const half = (list: Pt[]) => { const h: Pt[] = []; for (const p of list) { while (h.length >= 2 && cross(h[h.length - 2], h[h.length - 1], p) <= 0) h.pop(); h.push(p); } h.pop(); return h; };
  return [...half(q), ...half([...q].reverse())];
}
const pocketBox = (id: string, name: string, x0: number, y0: number, x1: number, y1: number, color: string, extra: Partial<OrgPocket> = {}): OrgPocket => ({ id, name, place: box(x0, y0, x1, y1), boca: topEdge(y0), lined: true, color, ...extra });
/** Rectangle pocket with rounded bottom corners. */
const roundPocket = (id: string, name: string, x0: number, y0: number, x1: number, y1: number, r: number, color: string): OrgPocket =>
  ({ id, name, place: biggest(uni(rect(x0, y0, x1 - x0, (y1 - y0) / 2), rrect(x0, y0, x1 - x0, y1 - y0, r))), boca: topEdge(y0), lined: true, color });
const scalePocket = (p: OrgPocket, s: (pts: Pt[]) => Pt[], k: number): OrgPocket => {
  const scaleSeg = ([a, b]: [Pt, Pt]): [Pt, Pt] => [P(a.x * k, a.y * k), P(b.x * k, b.y * k)];
  return { ...p, place: s(p.place), piece: p.piece && s(p.piece), boca: (a, b) => p.boca(P(a.x / k, a.y / k), P(b.x / k, b.y / k)), dividers: p.dividers?.map(scaleSeg), folds: p.folds?.map(scaleSeg), stitches: p.stitches?.map(s) };
};

// ------------------------------------------------------------------ Designs (mm at the reference size)
function cat(k: number, sa: number): OrgLayout {
  const s = S(k);
  const body = spline([[0, 150, 'contorno', 'c'], [4, 80], [30, 4, undefined, 'c'], [84, 62, undefined, 'c'], [140, 54], [196, 62, undefined, 'c'], [250, 4, undefined, 'c'], [276, 80], [280, 150, undefined, 'cl'], [280, 684, undefined, 'c'], [264, 700, undefined, 'cl'], [16, 700, undefined, 'c'], [0, 684, undefined, 'cl']]);
  const tail = plush('cola', 'Cola (2, rellena poco)', [[0, 0, 'union', 'cl'], [38, 0, 'contorno', 'c'], [44, 96], [36, 166], [4, 206], [-42, 204], [-62, 180], [-50, 154], [-20, 146], [2, 96]], { k, sa: Math.min(sa, 6), felt: false }, { qty: 2 });
  return {
    body: s(body), bodyName: 'Gato: delantero y trasero', bodyQty: 2,
    pockets: [pocketBox('bolsillo-arriba', 'Bolsillo de arriba (forrado)', 30, 300, 250, 450, 'tela2'), pocketBox('bolsillo-abajo', 'Bolsillo de abajo (forrado)', 30, 480, 250, 662, 'tela2')].map(p => scalePocket(p, s, k)),
    decor: [],
    emb: [{ pts: [[86, 168], [100, 159], [114, 168], [100, 177], [86, 168]], label: 'Bordar ojos, nariz, boca y bigotes' }, { pts: [[166, 168], [180, 159], [194, 168], [180, 177], [166, 168]], label: '' },
      { pts: [[132, 196], [148, 196], [140, 206], [132, 196]], label: '' }, { pts: [[124, 214], [132, 220], [140, 210], [148, 220], [156, 214]], label: '' },
      ...[[-1, 0], [-1, 1], [1, 0], [1, 1]].map(([d, i]) => ({ pts: [[140 + d * 22, 200 + i * 8], [140 + d * 62, 192 + i * 16]] as [number, number][], label: '' }))],
    hang: { kind: 'presilla', at: s([P(84, 62), P(196, 62)]) },
    extras: [tail], draw: [{ poly: s(seamPolygon(tail, 0.4).map(q => P(q.x / k + 196, q.y / k + 700))), color: 'pared', behind: true }],
    seams: [], notes: [{ level: 'ok', code: 'gato', message: 'Remaches o presillas de refuerzo en las 8 esquinas de los bolsillos, como en la referencia (para bebés, solo presillas cosidas).' }],
    steps: [{ id: 'cara', title: 'Cara', detail: 'Borda ojos, nariz, boca y bigotes en el delantero.' }, { id: 'cola', title: 'Cola', detail: 'Cose la cola, voltéala, rellénala poco y préndela en el bajo, hacia dentro.' }],
    materials: [{ id: 'remaches', label: 'Remaches o broches decorativos (no para bebés)', qty: '8' }]
  };
}
function cribDrop(k: number, sa: number): OrgLayout {
  const s = S(k), body = spline([[0, 0, 'contorno'], [44, 10], [70, 60], [96, 130], [105, 190], [92, 245], [52, 276], [0, 282], [-52, 276], [-92, 245], [-105, 190], [-96, 130], [-70, 60], [-44, 10]]);
  const cut = [P(-110, 150), P(-60, 158), P(0, 168), P(60, 158), P(110, 150)], front = below(body, cut);
  const leaf = plush('hoja', 'Hoja decorativa (2, tela de contraste)', [[-14, 0, 'union', 'cl'], [14, 0, 'contorno', 'c'], [30, 30], [22, 80], [0, 122, undefined, 'c'], [-22, 80], [-30, 30]], { k, sa: Math.min(sa, 6), felt: false }, { qty: 2, fabric: 'contraste' });
  leaf.lines.push({ id: 'nervio', kind: 'pespunte', a: P(0, 6 * k), b: P(0, 110 * k), label: 'Pespunte del nervio' });
  return {
    body: s(body), bodyName: 'Pieza trasera: 1 de tela y 1 de forro', bodyQty: 2,
    pockets: [scalePocket({ id: 'bolsillo', name: 'Bolsillo delantero (1 de tela y 1 de forro)', place: front.poly, boca: front.boca, lined: true, batting: true, color: 'tela1' }, s, k)],
    decor: [], emb: [], hang: { kind: 'tira', at: s([P(0, 0)]) }, extras: [leaf],
    draw: [{ poly: s(seamPolygon(leaf, 0.4).map(q => P(-q.x / k, -q.y / k + 26))), color: 'verde' }],
    seams: [], baby: true,
    notes: [{ level: 'aviso', code: 'cuna', message: 'Cuélgalo por fuera de los barrotes con la tira corta de broche, sin cordones, y quítalo cuando el bebé ya se ponga de pie.' }],
    steps: [{ id: 'bolsillo', title: 'Bolsillo', detail: 'Plancha la entretela, cose el bolsillo con su forro por la boca, voltea y pespuntea. Hilvánalo sobre la pieza trasera de tela.' }, { id: 'hoja', title: 'Hoja y tira', detail: 'Cose la hoja y voltéala. Dobla la tira, pespuntéala y pon el broche. Mete hoja y tira arriba, entre tela y forro.' }],
    materials: [{ id: 'broche', label: 'Broche de presión grande o automático', qty: '1' }]
  };
}
function whale(k: number, sa: number): OrgLayout {
  const s = S(k), raw = spline([[560, 500, 'doblez', 'cl'], [20, 500, 'contorno', 'c'], [0, 400], [8, 250], [60, 130], [160, 52], [280, 36], [380, 64], [460, 130], [500, 170, undefined, 'c'], [530, 110], [560, 40, undefined, 'c'], [590, 96], [646, 78, undefined, 'c'], [600, 150], [556, 210, undefined, 'c'], [548, 300], [556, 420]]);
  const xAt = (y: number) => { const xs: number[] = []; raw.forEach((p, i) => { const q = raw[(i + 1) % raw.length]; if ((p.y - y) * (q.y - y) < 0) xs.push(p.x + ((y - p.y) * (q.x - p.x)) / (q.y - p.y)); }); return [Math.min(...xs), Math.max(...xs)]; };
  const yT = 330, yB = 486, [l1, r1] = xAt(yT), [l2, r2] = xAt(yB), x0 = Math.max(l1, l2) + 18, x1 = Math.min(r1, r2) - 18, n = 3, pleat = 22, wc = (x1 - x0) / n, h = yB - yT, W = x1 - x0 + 2 * n * pleat;
  const folds: [Pt, Pt][] = [], dividers: [Pt, Pt][] = [];
  for (let i = 0; i < n; i++) { const c = (wc + 2 * pleat) * i + (wc + 2 * pleat) / 2; for (const dx of [-pleat, 0, pleat]) folds.push([P(c + dx, 0), P(c + dx, 2 * h)]); }
  for (let i = 1; i < n; i++) dividers.push([P(x0 + wc * i, yT), P(x0 + wc * i, yB)]);
  folds.push([P(0, h), P(W, h)]);
  const strip: OrgPocket = { id: 'bolsillos', name: `Franja de ${n} bolsillos con pliegue encontrado (doblar por la mitad: el doblez es la boca)`, place: box(x0, yT, x1, yB), piece: box(0, 0, W, 2 * h), boca: () => false, lined: false, color: 'tela1', dividers, folds,
    notes: 'En cada bolsillo lleva las dos líneas de fuera a la del centro (pliegue encontrado) y plancha.' };
  const fin = plush('aleta', 'Aleta (2: tela y forro)', [[0, 0, 'union', 'cl'], [56, 0, 'contorno', 'c'], [58, 34], [44, 72], [18, 100], [-4, 104], [-8, 70], [-2, 32]], { k, sa: Math.min(sa, 6), felt: false }, { qty: 2 });
  return {
    body: s(raw), bodyName: 'Ballena: delantero y trasero (al doblez de abajo)', bodyQty: 1, foldBottom: true,
    pockets: [scalePocket(strip, s, k)],
    decor: [{ id: 'ojo', name: 'Ojo (fieltro; para bebés, bordado)', poly: s(circle(120, 232, 11, 24)), color: 'noche' }],
    emb: [{ pts: smile(110, 270, 90), label: 'Bordar la sonrisa' }],
    hang: { kind: 'presilla', at: s([P(250, 36)]) }, extras: [fin],
    draw: [{ poly: s(seamPolygon(fin, 0.4).map(q => P(q.x / k + 230, -q.y / k + 300))), color: 'tela2' }],
    seams: [], notes: [{ level: 'ok', code: 'ballena', message: `Tres bolsillos de ${cm(wc * k)} con un pliegue encontrado de ${cm(2 * pleat * k)} cada uno: la franja mide ${cm(W * k)} para quedar en ${cm((x1 - x0) * k)}.` }],
    steps: [{ id: 'bolsillos', title: 'Bolsillos', detail: 'Dobla la franja por la boca, marca y plancha los pliegues encontrados, hilvana el bajo y los lados sobre el delantero y pespuntea las divisiones.' }, { id: 'aleta', title: 'Aleta y cara', detail: 'Cose la aleta, voltéala y cósela solo por la unión. Cose o borda el ojo y borda la sonrisa.' }],
    materials: []
  };
}
function flower(k: number, sa: number): OrgLayout {
  const s = S(k), R = 150, body = circle(0, 0, R, 96);
  const petal = plush('petalo', 'Pétalo (8 × 2 en varias telas)', [[-40, 0, 'union', 'cl'], [40, 0, 'contorno', 'c'], [72, -30], [76, -80], [44, -122], [0, -132], [-44, -122], [-76, -80], [-72, -30]], { k, sa: Math.min(sa, 8), felt: false }, { qty: 16 });
  const petalBat = plush('petalo-guata', 'Guata del pétalo (8, sin margen)', [[-40, 0, 'union', 'cl'], [40, 0, 'contorno', 'c'], [72, -30], [76, -80], [44, -122], [0, -132], [-44, -122], [-76, -80], [-72, -30]], { k, sa: 0, felt: true }, { qty: 8, fabric: 'entretela' });
  const stem = rectangle('tallo', 'Tallo (2 de tela y 1 de guata)', 34 * k, 230 * k, [edge('arriba', 'Entra bajo la flor', 'costura', sa), edge('lado', 'Lado', 'costura', sa), edge('punta', 'Punta', 'costura', sa), edge('lado-b', 'Lado', 'costura', sa)], { qty: 2, fabric: 'contraste' });
  const leafA: A[] = [[0, 0, 'union', 'cl'], [20, 0, 'contorno', 'c'], [70, -26], [140, -20], [150, 0, undefined, 'c'], [90, 28], [30, 22]];
  const leaf = plush('hoja', 'Hoja (2 × 2 de tela y 2 de guata)', leafA, { k, sa: Math.min(sa, 8), felt: false }, { qty: 4, mirrorPairs: true, fabric: 'contraste' });
  leaf.lines.push({ id: 'nervio', kind: 'pespunte', a: P(10 * k, 2 * k), b: P(146 * k, 0), label: 'Pespunte del nervio' });
  const colors = ['verde', 'tela2', 'rosa', 'tela1', 'agua', 'tela2', 'rosa', 'verde'];
  const draw: OrgDraw[] = [];
  for (let i = 0; i < 8; i++) {
    const a = (-90 + i * 45) * Math.PI / 180, ux = Math.cos(a), uy = Math.sin(a), base = R - 40;
    // Rotate the petal (pointing up) so it points outwards from the centre.
    const rot = (q: Pt) => P(ux * base - uy * q.x - ux * q.y, uy * base + ux * q.x - uy * q.y);
    draw.push({ poly: s(seamPolygon(petal, 0.4).map(q => rot(P(q.x / k, q.y / k)))), color: colors[i], behind: true });
  }
  draw.push({ poly: s(box(-17, R - 20, 17, R + 210)), color: 'verde', behind: true }, { poly: s(seamPolygon(leaf, 0.4).map(q => P(q.x / k + 10, q.y / k + R + 110))), color: 'verde', behind: true }, { poly: s(seamPolygon(leaf, 0.4).map(q => P(-q.x / k - 10, q.y / k + R + 140))), color: 'verde', behind: true });
  const cols: [number, number][] = [[-106, -38], [-34, 34], [38, 106]], rows: [number, number][] = [[-84, -10], [6, 82]], pk = ['tela1', 'tela2', 'rosa', 'agua', 'tela2', 'tela1'];
  return {
    body: s(body), bodyName: 'Centro de la flor: delantero y trasero', bodyQty: 2,
    pockets: rows.flatMap(([y0, y1], r) => cols.map(([x0, x1], c) => scalePocket(pocketBox(`bolsillo-${r * 3 + c + 1}`, `Bolsillo ${r * 3 + c + 1} (2 de tela y 1 de guata)`, x0, y0, x1, y1, pk[r * 3 + c], { batting: true }), s, k))),
    decor: [], emb: [], hang: { kind: 'presilla', at: s([P(-60, -138), P(60, -138)]) },
    extras: [petal, petalBat, stem, leaf, plush('hoja-guata', 'Guata de la hoja (2, sin margen)', leafA, { k, sa: 0, felt: true }, { qty: 2, fabric: 'entretela' })], draw, seams: [],
    notes: [{ level: 'ok', code: 'flor', message: '8 pétalos, 6 bolsillos, tallo y 2 hojas, todo con guata como en la referencia. Los pétalos se meten 4 cm bajo el centro.' }],
    steps: [{ id: 'petalos', title: 'Pétalos, tallo y hojas', detail: 'Cose cada pétalo y cada hoja con su guata, voltea y acolcha. Cose el tallo en tubo con su guata.' }, { id: 'centro', title: 'Centro', detail: 'Cose los 6 bolsillos en el centro delantero. Hilvana los pétalos alrededor (4 cm hacia dentro), el tallo abajo y las presillas arriba; cose el centro trasero encima y voltea.' }],
    materials: [{ id: 'retales', label: 'Retales de 5 telas (lino, vichy, cuadros) para pétalos y bolsillos', qty: '5 de 30 × 40 cm' }]
  };
}
function carrot(k: number, sa: number): OrgLayout {
  const s = S(k), body = spline([[-70, 20, 'contorno', 'c'], [-40, 4], [0, 0], [40, 4], [70, 20, undefined, 'c'], [74, 60], [60, 150], [34, 240], [6, 312], [0, 322, undefined, 'c'], [-6, 312], [-34, 240], [-60, 150], [-74, 60]]);
  const pocket = below(body, [P(-80, 150), P(80, 150)]);
  const leafA: A[] = [[-16, 0, 'union', 'cl'], [16, 0, 'contorno', 'c'], [26, -40], [18, -100], [0, -118], [-18, -100], [-26, -40]];
  const leaf = plush('hoja', 'Hoja de la zanahoria (3 × 2 en verdes)', leafA, { k, sa: Math.min(sa, 6), felt: false }, { qty: 6, fabric: 'contraste' });
  const bunnyBody = biggest(uni(ellipse(0, -150, 36, 32, 0, 36), ellipse(0, -76, 44, 58, 0, 40), ellipse(-44, -96, 11, 28, 30, 24), ellipse(44, -96, 11, 28, -30, 24), ellipse(-20, -12, 15, 16, 0, 24), ellipse(20, -12, 15, 16, 0, 24)));
  const bunny = polyRuns('conejito', 'Conejito (delante y detrás)', smooth([s(bunnyBody)], bendFor(Math.min(sa, 5))), () => 'contorno', { k: 1, sa: Math.min(sa, 5), felt: false }, { qty: 2 });
  embroider(bunny, 'ojo-i', [[-12, -154], [-12, -148]], k, 'Bordar ojos, nariz y mejillas'); embroider(bunny, 'ojo-d', [[12, -154], [12, -148]], k, ''); embroider(bunny, 'nariz', [[-4, -140], [4, -140], [0, -136], [-4, -140]], k, '');
  const ear = plush('oreja-conejito', 'Oreja del conejito (2 de tela y 2 de contraste)', [[-11, 0, 'union', 'cl'], [11, 0, 'contorno', 'c'], [16, -40], [10, -78], [0, -86], [-10, -78], [-16, -40]], { k, sa: Math.min(sa, 5), felt: false }, { qty: 4 });
  const scarf = rectangle('bufanda', 'Bufanda (punto o fieltro, sin margen)', 16 * k, 200 * k, [edge('a', 'Borde', 'sin-margen', 0), edge('b', 'Extremo', 'sin-margen', 0), edge('c', 'Borde', 'sin-margen', 0), edge('d', 'Extremo', 'sin-margen', 0)], { qty: 1, fabric: 'contraste' });
  // The carrot's ridges are topstitched on the pocket, which is the visible front.
  const ribs = [[-50, 182, 26], [8, 218, 26], [-26, 256, 18]].map(([x, y, w]) => [P(x, y), P(x + w * 0.5, y + 4), P(x + w, y)]);
  const draw: OrgDraw[] = [-28, 0, 28].map((x, i) => ({ poly: s(seamPolygon(leaf, 0.4).map(q => { const a = (i - 1) * 0.35, X = q.x / k, Y = q.y / k; return P(x + X * Math.cos(a) - Y * Math.sin(a), 14 + X * Math.sin(a) + Y * Math.cos(a)); })), color: i === 1 ? 'tela2' : 'verde', behind: true }));
  // The bunny sits in the pocket: ears, body and scarf, drawn under the pocket.
  const earPoly = seamPolygon(ear, 0.4).map(q => P(q.x / k, q.y / k));
  for (const sg of [-1, 1]) draw.push({ poly: s(earPoly.map(q => { const a = sg * 0.22; return P(4 + sg * 15 + q.x * Math.cos(a) - q.y * Math.sin(a), 30 + q.x * Math.sin(a) + q.y * Math.cos(a)); })), color: 'blanco', under: true });
  draw.push({ poly: s(bunnyBody.map(q => P(q.x + 4, q.y + 205))), color: 'blanco', under: true }, { poly: s(box(-30, 84, 38, 96)), color: 'rosa', under: true });
  return {
    body: s(body), bodyName: 'Zanahoria: delantero y trasero', bodyQty: 2,
    pockets: [scalePocket({ id: 'bolsillo', name: 'Bolsillo-saco del conejito (tela y forro)', place: pocket.poly, boca: pocket.boca, lined: true, color: 'pared', stitches: ribs }, s, k)],
    decor: [], emb: [], hang: { kind: 'presilla', at: s([P(0, 0)]) }, extras: [leaf, bunny, ear, scarf], draw, seams: [],
    drawLines: [[[-8, 51], [-8, 57]], [[16, 51], [16, 57]], [[0, 65], [8, 65], [4, 69], [0, 65]]].map(l => s(l.map(([x, y]) => P(x, y)))),
    notes: [{ level: 'ok', code: 'zanahoria', message: 'Saco-zanahoria con conejito: el bolsillo es la cama del conejito.' }, { level: 'aviso', code: 'juguete-seguridad', message: 'Para menores de 3 años: ojos y nariz bordados y bufanda cosida, sin piezas sueltas.' }],
    steps: [{ id: 'hojas', title: 'Hojas', detail: 'Cose las 3 hojas por pares, voltéalas y préndelas arriba, hacia dentro.' }, { id: 'conejito', title: 'Conejito', detail: 'Cose las orejas, mételas en la cabeza, cose el cuerpo dejando una abertura, voltea, rellena y cierra. Anuda la bufanda.' }],
    materials: []
  };
}
function clover(k: number, n: number): OrgLayout {
  // Hearts that touch side by side around the centre, with a gap at the bottom for the stem.
  const L = 150, D = 0.6 * L, r = (D * Math.sin(Math.PI / n) * 0.97) / 1.7, e = 0.7 * r, notch = Math.sqrt(r * r - e * e), parts: Pt[][] = [], leaves: { u: Pt; c: Pt }[] = [];
  for (let i = 0; i < n; i++) {
    const a = Math.PI / 2 + Math.PI / n + (i * 2 * Math.PI) / n, u = P(Math.cos(a), Math.sin(a)), v = P(-u.y, u.x), c = P(u.x * D, u.y * D);
    const lobes = [-1, 1].map(sg => circle(c.x + sg * v.x * e, c.y + sg * v.y * e, r, 48));
    parts.push(...lobes, hull([P(0, 0), ...lobes.flat().filter(q => (q.x - c.x) * u.x + (q.y - c.y) * u.y <= 0)]));
    leaves.push({ u, c });
  }
  const stem = biggest(strokePolyline([P(0, 0.1 * L), P(0.06 * L, 0.95 * L), P(0.3 * L, 1.55 * L)], 0.15 * L));
  const raw = biggest(uni(...parts, stem, circle(0, 0, 0.45 * D, 36))), ys = raw.map(q => q.y), g = 450 / (Math.max(...ys) - Math.min(...ys)), kk = k * g, s = S(kk);
  const pockets = leaves.map(({ u, c }, i) => {
    const pc = P(c.x - 0.25 * r * u.x, c.y - 0.25 * r * u.y), w = 1.3 * r, h = 1.1 * r;
    const p = roundPocket(`bolsillo-${i + 1}`, `Bolsillo ${i + 1}`, pc.x - w / 2, pc.y - h / 2, pc.x + w / 2, pc.y + h / 2, 0.6 * r, ['tela2', 'tela1'][i % 2]);
    return scalePocket({ ...p, lined: false, notes: 'Una capa: dobladillo de 1,5 cm en la boca; plancha el resto del margen hacia dentro y pespuntea sobre el delantero.' }, s, kk);
  });
  const tops = leaves.filter(({ u }) => u.y < -0.6).map(({ u, c }) => P(c.x + u.x * notch, c.y + u.y * notch));
  return {
    body: s(raw), bodyName: `Trébol de ${n} hojas con tallo: delantero y trasero`, bodyQty: 2,
    pockets, decor: [], emb: [], hang: { kind: 'presilla', at: s(tops) },
    extras: [], draw: [], seams: [], notes: [{ level: 'ok', code: 'trebol', message: `${n} hojas en corazón con un bolsillo cada una. En la muesca de cada corazón y entre hojas, da piquetes hasta 2 mm de la costura antes de voltear.` }],
    steps: [{ id: 'bolsillos', title: 'Bolsillos', detail: 'Dobladilla la boca de cada bolsillo, plancha el margen del resto hacia dentro y pespuntéalos sobre el delantero antes de montar.' }], materials: []
  };
}
function koala(k: number): OrgLayout {
  const s = S(k), body = smooth(uni(ellipse(0, 150, 150, 135, 0, 72), circle(-150, 60, 72, 48), circle(150, 60, 72, 48), rrect(-125, 180, 250, 580, 40)), 20);
  const bottom = below(body, [P(-140, 560), P(140, 560)]);
  return {
    body: s(body), bodyName: 'Koala: delantero y trasero', bodyQty: 2,
    pockets: [roundPocket('bolsillo-arriba', 'Bolsillo de arriba (forrado)', -106, 330, 106, 530, 34, 'tela1'), { id: 'bolsillo-abajo', name: 'Bolsillo de abajo (forrado, sigue el bajo del cuerpo)', place: bottom.poly, boca: bottom.boca, lined: true, color: 'tela2' }].map(p => scalePocket(p, s, k)),
    decor: [{ id: 'oreja-interior', name: 'Interior de la oreja (borreguito, sin margen)', poly: s(circle(-156, 62, 44, 36)), color: 'blanco', qty: 2 }, { id: 'nariz', name: 'Nariz (fieltro o polipiel, sin margen)', poly: s(ellipse(0, 176, 26, 34, 0, 28)), color: 'madera' }],
    emb: [{ pts: [[-52, 134], [-46, 140], [-52, 146], [-58, 140], [-52, 134]], label: 'Bordar ojos y boca' }, { pts: [[52, 134], [58, 140], [52, 146], [46, 140], [52, 134]], label: '' }, { pts: smile(0, 222, 30), label: '' }],
    hang: { kind: 'presilla', at: s([P(0, 16)]) }, extras: [], draw: [], seams: [],
    notes: [{ level: 'ok', code: 'koala', message: 'El bolsillo de abajo se corta con la misma silueta del cuerpo y queda atrapado en la costura de alrededor.' }],
    steps: [{ id: 'cara', title: 'Cara y orejas', detail: 'Cose el interior de las orejas y la nariz con zigzag y borda ojos y boca.' }], materials: [{ id: 'borreguito', label: 'Retal de borreguito para el interior de las orejas', qty: '20 × 10 cm' }]
  };
}
function foxPanel(k: number): OrgLayout {
  const s = S(k), head = spline([[-150, 0, 'contorno', 'c'], [-70, 62, undefined, 'c'], [0, 54], [70, 62, undefined, 'c'], [150, 0, undefined, 'c'], [176, 100], [190, 160, undefined, 'c'], [90, 214], [0, 250, undefined, 'c'], [-90, 214], [-190, 160, undefined, 'c'], [-176, 100]]);
  const body = smooth(uni(head, rect(-150, 200, 300, 500)), 6);
  const mask = inset(spline([[-196, 160, 'contorno', 'c'], [-100, 140], [-30, 170], [0, 186, undefined, 'c'], [30, 170], [100, 140], [196, 160, undefined, 'c'], [90, 220], [0, 260, undefined, 'c'], [-90, 220]]), body, 8);
  const ear = inset(spline([[-146, 4, 'contorno', 'c'], [-84, 64, undefined, 'c'], [-124, 80]]), body, 8);
  return {
    body: s(body), bodyName: 'Zorro con panel: delantero y trasero', bodyQty: 2,
    pockets: [pocketBox('bolsillo-arriba', 'Bolsillo de arriba (forrado)', -138, 270, 138, 390, 'tela1'), pocketBox('bolsillo-izquierdo', 'Bolsillo izquierdo (forrado)', -138, 450, -6, 680, 'tela2'), pocketBox('bolsillo-derecho', 'Bolsillo derecho (forrado)', 6, 450, 138, 680, 'verde')].map(p => scalePocket(p, s, k)),
    decor: [{ id: 'mascara', name: 'Cara blanca (fieltro, sin margen)', poly: s(mask), color: 'blanco' }, { id: 'oreja-interior', name: 'Interior de la oreja (fieltro rosa, 2 en espejo)', poly: s(ear), color: 'rosa', qty: 2 }, { id: 'nariz', name: 'Nariz (fieltro, sin margen)', poly: s(ellipse(0, 236, 14, 10, 0, 20)), color: 'noche' }],
    emb: [{ pts: sleepyEye(-70, 168, 34, true), label: 'Bordar los ojos cerrados' }, { pts: sleepyEye(70, 168, 34, true), label: '' }],
    hang: { kind: 'presilla', at: s([P(-60, 58), P(60, 58)]) }, extras: [], draw: [], seams: [],
    notes: [], steps: [{ id: 'cara', title: 'Cara', detail: 'Cose la cara blanca, el interior de las orejas y la nariz con pespunte al borde, y borda los ojos.' }], materials: []
  };
}
function foxDowel(k: number, sa: number): OrgLayout {
  const s = S(k), head = spline([[-105, 0, 'contorno', 'c'], [-50, 44, undefined, 'c'], [0, 38], [50, 44, undefined, 'c'], [105, 0, undefined, 'c'], [123, 70], [133, 112, undefined, 'c'], [63, 150], [0, 175, undefined, 'c'], [-63, 150], [-133, 112, undefined, 'c'], [-123, 70]]);
  const body = smooth(uni(head, ellipse(0, 250, 92, 110, 0, 60)), 6);
  const clip = biggest(intersectPolygons([body], [box(-400, -10, 400, 330)]));
  const tailA: A[] = [[0, 0, 'contorno', 'c'], [40, -40], [70, -110], [60, -170], [20, -200, undefined, 'c'], [36, -140], [20, -70], [-20, -30]];
  const tail = plush('cola', 'Cola (2 de tela y 2 de guata fina)', tailA, { k, sa: Math.min(sa, 6), felt: false }, { qty: 2 });
  const W = 380, h = 120, y0 = 260, n = 4, wp = W / n, x0 = -W / 2;
  const colors = ['rosa', 'tela2', 'madera', 'blanco'];
  const fronts = Array.from({ length: n }, (_, i) => rectangle(`bolsillo-${i + 1}`, `Frente del bolsillo ${i + 1} (tela ${'ABCD'[i]})`, wp * k, h * k, [edge('boca', 'Boca', 'costura', sa), edge('lado', 'Une con el bolsillo de al lado', 'costura', sa), edge('fondo', 'Fondo', 'costura', sa), edge('lado-b', 'Une con el bolsillo de al lado', 'costura', sa)], { qty: 1, fabric: 'contraste' }));
  const lining = rectangle('forro-bolsillos', 'Forro de la franja de bolsillos', W * k, h * k, [edge('boca', 'Boca', 'costura', sa), edge('lado', 'Lado', 'costura', sa), edge('fondo', 'Fondo', 'costura', sa), edge('lado-b', 'Lado', 'costura', sa)], { qty: 1 });
  const dowel = rectangle('jareta', 'Jareta para el bastón (por detrás)', 200 * k, 36 * k, [edge('a', 'Canto', 'costura', sa), edge('b', 'Extremo (abierto)', 'dobladillo', 10), edge('c', 'Canto', 'costura', sa), edge('d', 'Extremo (abierto)', 'dobladillo', 10)], { qty: 1, fabric: 'contraste' });
  const draw: OrgDraw[] = [{ poly: s(box(-280, 130, 280, 146)), color: 'madera', behind: true }, { poly: s(seamPolygon(tail, 0.4).map(q => P(q.x / k + 92, q.y / k + 262))), color: 'pared', behind: true }];
  fronts.forEach((_, i) => draw.push({ poly: s(box(x0 + i * wp, y0, x0 + (i + 1) * wp, y0 + h)), color: colors[i] }));
  const mask = inset(spline([[-140, 112, 'contorno', 'c'], [-70, 96], [-20, 118], [0, 132, undefined, 'c'], [20, 118], [70, 96], [140, 112, undefined, 'c'], [63, 156], [0, 180, undefined, 'c'], [-63, 156]]), clip, 6);
  return {
    body: s(clip), bodyName: 'Zorro: delantero y trasero', bodyQty: 2,
    pockets: [],
    decor: [{ id: 'mascara', name: 'Cara blanca (fieltro, sin margen)', poly: s(mask), color: 'blanco' }, { id: 'ojo', name: 'Ojo (fieltro; para bebés, bordado)', poly: s(ellipse(-44, 100, 11, 13, 0, 20)), color: 'noche', qty: 2 },
      { id: 'mejilla', name: 'Mejilla (fieltro rosa)', poly: s(circle(-64, 122, 13, 20)), color: 'rosa', qty: 2 }, { id: 'nariz', name: 'Nariz (fieltro)', poly: s(ellipse(0, 150, 11, 8, 0, 16)), color: 'madera' }, { id: 'oreja-interior', name: 'Interior de la oreja (fieltro, 2 en espejo)', poly: s(inset(spline([[-104, 4, 'contorno', 'c'], [-58, 46, undefined, 'c'], [-90, 56]]), clip, 7)), color: 'blanco', qty: 2 }],
    emb: [{ pts: smile(0, 162, 22), label: 'Bordar la boca' }],
    hang: { kind: 'jareta', at: [] }, extras: [tail, ...fronts, lining, dowel], draw, span: W * k,
    seams: [equal('franja', 'Los 4 frentes de bolsillo suman el forro', fronts.map(f => ({ pieceId: f.id, edgeIds: ['fondo'] })), [{ pieceId: lining.id, edgeIds: ['fondo'] }], 0.6)],
    notes: [{ level: 'ok', code: 'zorro-barra', message: `Cuatro bolsillos de ${cm(wp * k)} en cuatro telas; se cuelga de un bastón de madera que pasa por la jareta de detrás.` }],
    steps: [{ id: 'bolsillos', title: 'Franja de bolsillos', detail: 'Une los 4 frentes por los lados, forra la franja por la boca, voltea y pespuntea las divisiones. Cósela por detrás al bajo del zorro.' }, { id: 'jareta', title: 'Jareta y cola', detail: 'Dobladilla los extremos de la jareta y cósela por detrás, a la altura del cuello. Cose la cola y préndela en el costado.' }],
    materials: [{ id: 'baston', label: 'Bastón de madera de 12 mm con bolas en los extremos', qty: cm(560 * k) }]
  };
}

// ------------------------------------------------------------------ Generators
interface Def { id: string; name: string; summary: string; ref: number; key: 'alto' | 'ancho'; min: number; max: number; build: (k: number, sa: number, p: Params) => OrgLayout; extra?: ParamDef[]; defaults?: Params }
const DEFS: Def[] = [
  { id: 'bolsillero-gato', name: 'Bolsillero gato', summary: 'Gato de pared con dos bolsillos, cara bordada y cola.', ref: 696, key: 'alto', min: 450, max: 1000, build: (k, sa) => cat(k, sa), defaults: { alto: 700 } },
  { id: 'organizador-cuna', name: 'Organizador de cuna en gota', summary: 'Bolsillo para colgar por fuera de la cuna, con tira de broche y hoja.', ref: 282, key: 'alto', min: 200, max: 450, build: (k, sa) => cribDrop(k, sa), defaults: { alto: 280 } },
  { id: 'bolsillero-ballena', name: 'Bolsillero ballena', summary: 'Ballena al doblez con tres bolsillos de pliegue encontrado y aleta.', ref: 646, key: 'ancho', min: 400, max: 900, build: (k, sa) => whale(k, sa), defaults: { ancho: 650 } },
  { id: 'bolsillero-flor', name: 'Bolsillero flor', summary: 'Flor acolchada de 8 pétalos con 6 bolsillos, tallo y hojas.', ref: 300, key: 'ancho', min: 200, max: 450, build: (k, sa) => flower(k, sa) },
  { id: 'zanahoria-conejito', name: 'Zanahoria con conejito', summary: 'Saco-zanahoria con bolsillo y conejito con bufanda.', ref: 322, key: 'alto', min: 240, max: 500, build: (k, sa) => carrot(k, sa), defaults: { alto: 320 } },
  { id: 'bolsillero-trebol', name: 'Bolsillero trébol', summary: 'Trébol de 3 a 5 hojas con un bolsillo por hoja y tallo.', ref: 450, key: 'alto', min: 300, max: 750, build: (k, _sa, p) => clover(k, Math.round(num(p, 'hojas'))), extra: [{ key: 'hojas', label: 'Número de hojas', group: 'diseno', type: 'ratio', min: 3, max: 5 }], defaults: { hojas: 5, margen: 12 } },
  { id: 'bolsillero-koala', name: 'Bolsillero koala', summary: 'Koala de cabeza redonda con dos bolsillos, orejas de borreguito y nariz.', ref: 772, key: 'alto', min: 450, max: 1000, build: k => koala(k), defaults: { alto: 770 } },
  { id: 'bolsillero-zorro', name: 'Bolsillero zorro', summary: 'Cabeza de zorro sobre un panel con tres bolsillos.', ref: 700, key: 'alto', min: 450, max: 1000, build: k => foxPanel(k) },
  { id: 'portalapices-zorro', name: 'Portalápices zorro con barra', summary: 'Zorro con franja de cuatro bolsillos que se cuelga de un bastón.', ref: 380, key: 'ancho', min: 260, max: 600, build: (k, sa) => foxDowel(k, sa) }
];
export const ORGANIZER_IDS = DEFS.map(d => d.id);
export function organizerLayout(id: string, p: Params): { layout: OrgLayout; k: number } {
  const d = DEFS.find(x => x.id === id)!, k = num(p, d.key) / d.ref;
  return { layout: d.build(k, num(p, 'margen'), p), k };
}

function build(d: Def, p: Params): GeneratorResult {
  const size = num(p, d.key), sa = num(p, 'margen');
  if (!(size >= d.min && size <= d.max) || !(sa >= 6 && sa <= 15)) return invalid('bolsillero-medidas', `El ${d.key} va de ${cm(d.min)} a ${cm(d.max)} y el margen de 6 a 15 mm.`);
  if (d.id === 'bolsillero-trebol' && !(num(p, 'hojas') >= 3 && num(p, 'hojas') <= 5)) return invalid('bolsillero-medidas', 'El trébol tiene de 3 a 5 hojas.');
  const k = size / d.ref, L = d.build(k, sa, p), small = Math.min(sa, 8), bound = str(p, 'acabado') === 'ribete';
  const pieces: Piece[] = [], seams: SeamRelation[] = [...L.seams];
  const notices: Issue[] = [exp(d.name), { level: 'aviso', code: 'bolsillero-seguridad', message: 'Cuélgalo fuera del alcance de la cuna y de los niños pequeños, con una presilla corta (sin cordones largos). Para bebés, ojos bordados y sin remaches.' }, ...L.notes];
  const outline = closeBody(L.body, bendFor(sa), !!L.foldBottom), ys = outline.map(q => q.y), yMax = Math.max(...ys);
  const body = polyRuns('cuerpo', `${L.bodyName}`, outline, (a, b) => (L.foldBottom && near(a.y, yMax) && near(b.y, yMax) ? 'doblez' : 'contorno'), { k: 1, sa, felt: false }, { qty: L.bodyQty, fold: L.foldBottom ? 'doblez' : undefined, onFold: L.foldBottom });
  const batting = polyRuns('entretela', 'Entretela o guata (sin margen, recorta 3 mm)', outline, (a, b) => (L.foldBottom && near(a.y, yMax) && near(b.y, yMax) ? 'doblez' : 'contorno'), { k: 1, sa: 0, felt: true }, { qty: 1, fabric: 'entretela', fold: L.foldBottom ? 'doblez' : undefined });
  pieces.push(body, batting);
  const lineOn = (pc: Piece, id: string, pts: Pt[], label: string, kind: Piece['lines'][number]['kind'] = 'colocacion') => pts.forEach((q, i) => { const b = pts[(i + 1) % pts.length]; pc.lines.push({ id: `${id}-${i}`, kind, a: q, b, label: i ? undefined : label }); });
  for (const pk of L.pockets) {
    lineOn(body, `bolsillo-${pk.id}`, pk.place, `${pk.name.replace(/\s*\(.*\)$/, '')}: colocación`);
    for (const [i, [a, b]] of (pk.dividers ?? []).entries()) body.lines.push({ id: `${pk.id}-division-${i}`, kind: 'pespunte', a, b, label: i ? undefined : 'Pespunte de división' });
    const shape = pk.piece ?? pk.place, foldStrip = !!pk.folds?.length;
    const piece = polyRuns(pk.id, pk.name, shape, (a, b) => (pk.boca(a, b) ? 'boca' : 'contorno'), { k: 1, sa: foldStrip ? sa : pk.lined ? small : sa, felt: false }, { qty: pk.qty ?? (pk.lined ? 2 : 1), fabric: pk.fabric ?? 'contraste', hems: !pk.lined && !foldStrip ? { boca: 15 } : undefined });
    for (const [i, st] of (pk.stitches ?? []).entries()) for (let j = 0; j < st.length - 1; j++) piece.lines.push({ id: `pespunte-${i}-${j}`, kind: 'pespunte', a: st[j], b: st[j + 1], label: i || j ? undefined : 'Pespunte decorativo' });
    for (const [i, [a, b]] of (pk.folds ?? []).entries()) piece.lines.push({ id: `pliegue-${i}`, kind: 'doblez', a, b, label: i ? undefined : pk.notes ?? 'Pliegue' });
    piece.notes = [pk.lined ? 'Bolsillo forrado: cose tela y forro por la boca, voltea, pespuntea y cóselo por los lados y el bajo.' : pk.notes ?? 'Bolsillo de una capa.'];
    pieces.push(piece);
    if (pk.batting) pieces.push(polyRuns(`${pk.id}-guata`, `${pk.name.replace(/\s*\(.*\)$/, '')}: guata (sin margen)`, shape, () => 'contorno', { k: 1, sa: 0, felt: true }, { qty: 1, fabric: 'entretela' }));
  }
  for (const dc of L.decor) {
    decorPolys(dc).forEach((poly, i) => lineOn(body, `aplique-${dc.id}${i ? '-b' : ''}`, poly, i ? '' : dc.name.replace(/\s*\(.*\)$/, '')));
    pieces.push(polyRuns(dc.id, dc.name, dc.poly, () => 'borde', { k: 1, sa: 0, felt: true }, { qty: dc.qty ?? 1, mirrorPairs: (dc.qty ?? 1) > 1, fabric: 'contraste' }));
  }
  for (const [i, e] of L.emb.entries()) embroider(body, `bordado-${i}`, e.pts, k, e.label);
  // Hanger.
  const marks: Mark[] = L.hang.at.map((at, i) => ({ id: `colgador-${i}`, kind: 'cruz', at, label: L.hang.kind === 'tira' ? 'Tira de broche: entra en la costura de arriba' : 'Presilla: entra en la costura, hacia dentro' }));
  body.marks.push(...marks);
  if (L.hang.kind === 'presilla' && L.hang.at.length) {
    const loop = rectangle('presilla', 'Presilla para colgar (doblar en cuatro y pespuntear)', 48 * Math.max(0.8, k), 160 * k, [edge('extremo', 'Extremo', 'costura', sa), edge('canto', 'Canto doblado', 'sin-margen', 0), edge('extremo-b', 'Extremo', 'costura', sa), edge('canto-b', 'Canto doblado', 'sin-margen', 0)], { qty: L.hang.at.length, fabric: 'contraste' });
    pieces.push(loop);
  }
  if (L.hang.kind === 'tira') {
    const strap = rectangle('tira', 'Tira de broche (doblar por la mitad con los cantos hacia dentro)', 72 * Math.max(0.8, k), 240 * k, [edge('extremo', 'Extremo: entra arriba', 'costura', sa), edge('canto', 'Canto', 'costura', sa), edge('extremo-b', 'Extremo con broche', 'costura', sa), edge('canto-b', 'Canto', 'costura', sa)], { qty: 1, fabric: 'contraste' });
    strap.marks.push({ id: 'broche-1', kind: 'boton', at: P(36 * Math.max(0.8, k), 200 * k), label: 'Broche' }, { id: 'broche-2', kind: 'boton', at: P(36 * Math.max(0.8, k), 120 * k), label: 'Broche (pareja)' });
    pieces.push(strap);
  }
  pieces.push(...L.extras);
  // Edge: bound with bias or bagged and turned.
  if (bound) {
    const total = body.edges.filter(e => e.finish !== 'doblez').reduce((s2, e) => s2 + runLength({ ...body, edges: [e] }, e.id), 0) * (L.foldBottom ? 2 : 1);
    const st = strips('ribete', 'Ribete al bies (ancho de corte 4 cm, doblar en cuatro)', total, 40, 0, 'contraste', { maxLen: 1300, bias: true, endSa: 15 });
    st.piece.edges.forEach(e => { if (e.id.startsWith('canto')) { e.finish = 'sin-margen'; e.allowance = 0; } });
    pieces.push(st.piece);
    seams.push(equal('ribete', 'Ribete alrededor del bolsillero', [{ pieceId: st.piece.id, edgeIds: ['canto'], factor: st.n }], [{ pieceId: body.id, edgeIds: body.edges.filter(e => e.finish !== 'doblez').map(e => e.id), factor: L.foldBottom ? 2 : 1 }], 0.8));
  } else {
    const Lc = runLength(body, 'contorno'), at = Lc * 0.5;
    const s0 = Math.max(0, at - 60 * k);
    const edgeAt = (s: number) => { let left = s; for (const e of body.edges.filter(x => x.id === 'contorno' || /^contorno-\d+$/.test(x.id))) { const l = runLength({ ...body, edges: [e] }, e.id); if (left <= l) return { e, s: left }; left -= l; } return undefined; };
    for (const [id, s] of [['abertura-a', s0], ['abertura-b', s0 + Math.min(140 * k, Lc * 0.2)]] as const) { const hit = edgeAt(s); if (hit) body.notches.push({ id, edgeId: hit.e.id, s: hit.s, count: 1, label: id.endsWith('a') ? 'Abertura para voltear: se cierra con el pespunte de alrededor' : 'Fin de la abertura' }); }
  }
  const area = (() => { const poly = L.body; let a = 0; for (let i = 0; i < poly.length; i++) { const q = poly[i], r = poly[(i + 1) % poly.length]; a += q.x * r.y - r.x * q.y; } return Math.abs(a / 2); })();
  return {
    pieces, seams, notices,
    checks: [{ key: d.key, label: d.key === 'alto' ? 'Alto del cuerpo' : 'Ancho del cuerpo', target: size, measured: d.key === 'alto' ? (Math.max(...ys) - Math.min(...ys)) : L.span ?? (Math.max(...outline.map(q => q.x)) - Math.min(...outline.map(q => q.x))), tolerance: 0.05 * size }],
    materials: [{ id: 'tela', label: 'Pana, lino, loneta o terciopelo para el cuerpo', qty: `unos ${cm(Math.sqrt(area) * 1.6 + 100)} × 1 ancho` }, { id: 'bolsillos', label: 'Tela de contraste y forro para los bolsillos', qty: 'Retales' }, { id: 'entretela', label: 'Entretela termoadhesiva gruesa o guata fina (para que no se doble)', qty: `${cm(Math.sqrt(area) * 1.3)} × ${cm(Math.sqrt(area) * 1.3)}` }, ...L.materials, { id: 'hilo', label: 'Hilo de coser y de bordar', qty: '1 + 1' }],
    assumptions: [`Escala ${Math.round(k * 100)} % del tamaño de la referencia. Bolsillos y apliques se marcan en el delantero para coserlos (o proyectarlos) en su sitio.`, bound ? 'Acabado con ribete al bies alrededor.' : 'Acabado volteado: delantero y trasero derecho con derecho, se voltea por la abertura y se pespuntea a 5 mm del borde.'],
    steps: [
      { id: 'entretela', title: 'Entretela', detail: 'Plancha la entretela en el revés del delantero (o hilvana la guata entre las dos capas).', pieces: ['cuerpo', 'entretela'] },
      { id: 'bolsillos', title: 'Bolsillos y apliques', detail: 'Cose los bolsillos y los apliques sobre el delantero siguiendo sus líneas de colocación.', pieces: [] },
      ...L.steps.map(st => ({ ...st, pieces: [] })),
      { id: 'cerrar', title: 'Cierra', detail: `Prende el colgador ${L.hang.kind === 'jareta' ? '(la jareta va por detrás)' : 'hacia dentro'}. ${bound ? 'Une delantero y trasero revés con revés y ribetea todo el borde.' : 'Cose delantero con trasero derecho con derecho dejando la abertura, voltea, cierra y pespuntea alrededor.'}`, pieces: ['cuerpo'] }
    ]
  };
}
const finish: ParamDef = { key: 'acabado', label: 'Acabado del borde', group: 'diseno', type: 'choice', choices: [{ value: 'volteado', label: 'Volteado y pespunteado' }, { value: 'ribete', label: 'Ribete al bies' }] };
const sm: ParamDef = { key: 'margen', label: 'Margen de costura', group: 'margenes', type: 'length', min: 6, max: 15 };
export const ORGANIZER_GENERATORS: PatternGenerator[] = DEFS.map(d => ({
  id: d.id, name: d.name, status: 'experimental', summary: d.summary, requiredMeasures: [], optionalMeasures: [],
  params: [{ key: d.key, label: d.key === 'alto' ? 'Alto' : 'Ancho', group: 'diseno', type: 'length', min: d.min, max: d.max }, ...(d.extra ?? []), finish, sm],
  defaults: () => ({ [d.key]: d.ref, margen: 10, acabado: 'volteado', ...(d.defaults ?? {}) }),
  generate: (ctx: GeneratorContext, params: Params) => { void ctx; return build(d, { [d.key]: d.ref, margen: 10, acabado: 'volteado', ...(d.defaults ?? {}), ...params }); }
}));
