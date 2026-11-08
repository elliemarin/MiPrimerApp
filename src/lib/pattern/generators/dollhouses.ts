import { num, str, type GeneratorContext, type GeneratorResult, type ParamDef, type Params, type PatternGenerator } from '../generator';
import type { FabricRole, Issue, Mark, Piece, SeamRelation } from '../types';
import type { Pt } from '../../geom/vec';
import { seamPolygon } from '../outline';
import { P, cm, edge, equal, invalid, rectangle } from './kidsShared';
import { exp, margin, match, notchAt, plush, runLength, safety, side, type A, type ToyScale } from './toyKit';
import { polyRuns, strips } from './cushionKit';
import { furniture, furnitureBox, type Furniture, type Part } from './dollFurniture';

/* Casitas de muñecas de tela (2026-11-08), diseños propios a partir de las
 * fotos de la usuaria: casita libro (casa o calabaza), casita bolsa que se
 * dobla por la mitad, casita plegable en cruz con asas, casita cubo con tejado y
 * asa, tapete de cuatro habitaciones y libro de páginas de fieltro. Todo se
 * escala con el alto de la muñeca. Los muebles son interactivos y su silueta
 * se marca en la pared para coserlos en su sitio (y para proyectarlos). */

/** A furniture slot: the piece of wall (mm) where a piece of furniture is fitted, standing on the bottom edge. */
export interface Slot { type: string; box: [number, number, number, number]; flip?: boolean }
export interface PanelDef {
  id: string; name: string; anchors: A[]; qty: number; fabric: FabricRole; felt?: boolean; mirrorPairs?: boolean;
  slots: Slot[]; lines?: Piece['lines']; marks?: Mark[];
  labels?: Record<string, string>; hems?: Record<string, number>;
  /** Shown in the illustration, at this offset. */
  show?: [number, number];
}
export interface DollhouseLayout { panels: PanelDef[]; loose: string[]; s0: number; extra: Piece[]; seams: SeamRelation[]; notes: Issue[]; steps: { id: string; title: string; detail: string }[]; materials: { id: string; label: string; qty: string }[]; size: [number, number] }
export interface PlacedPart { part: Part; pts: Pt[]; lines: [Pt, Pt][]; wall: [Pt, Pt][] }

const rectA = (x0: number, y0: number, x1: number, y1: number, run = 'contorno'): A[] => [[x0, y0, run, 'cl'], [x1, y0, undefined, 'cl'], [x1, y1, undefined, 'cl'], [x0, y1, undefined, 'cl']];
/** Mirror an outline (x → W − x), keeping it clockwise and each edge in its run. */
const mirrorA = (a: A[], W: number): A[] => {
  const n = a.length, runOf: string[] = [];
  let run = a[0][2] ?? 'contorno';
  for (let i = 0; i < n; i++) { run = a[i][2] ?? run; runOf.push(run); }
  const out: A[] = [];
  for (let i = 0; i < n; i++) {
    // Mirrored edge i runs over original edge n−i−1 backwards; it keeps that edge's run and straightness.
    const src = a[(n - i) % n], e = n - i - 1, r = runOf[e], prevRun = i ? runOf[n - i] : undefined;
    out.push([W - src[0], src[1], i === 0 || r !== prevRun ? r : undefined, a[e][3]]);
  }
  return out;
};
const line = (id: string, kind: Piece['lines'][number]['kind'], a: Pt, b: Pt, label?: string) => ({ id, kind, a, b, label } as Piece['lines'][number]);

/** Where each part of a piece of furniture lands on a panel, fitted into its slot. */
export function placeSlot(slot: Slot, s0: number): { f: Furniture; sc: number; parts: PlacedPart[] } {
  const f = furniture(slot.type), bb = furnitureBox(f), [x0, y0, x1, y1] = slot.box;
  const sc = Math.min(s0 * 1.1, (x1 - x0) / (bb.maxX - bb.minX), (y1 - y0) / (bb.maxY - bb.minY));
  const dx = (x0 + x1) / 2 - ((bb.minX + bb.maxX) / 2) * sc, dy = y1 - bb.maxY * sc, cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
  const map = (p: Pt) => { const q = P(p.x * sc + dx, p.y * sc + dy); return slot.flip ? P(2 * cx - q.x, 2 * cy - q.y) : q; };
  return { f, sc, parts: f.parts.filter(p => !p.loose).map(part => ({ part, pts: part.poly.map(map), lines: (part.lines ?? []).map(([a, b]) => [map(a), map(b)] as [Pt, Pt]), wall: (part.wall ?? []).map(([a, b]) => [map(a), map(b)] as [Pt, Pt]) })) };
}
/** Vertical topstitching lines inside an outline (quilting), every `step` mm. */
function quilt(piece: Piece, step: number, label: string) {
  const poly = seamPolygon(piece, 0.5), xs = poly.map(p => p.x);
  for (let x = Math.min(...xs) + step, i = 0; x < Math.max(...xs) - step / 3; x += step, i++) {
    const ys: number[] = [];
    poly.forEach((p, j) => { const q = poly[(j + 1) % poly.length]; if ((p.x - x) * (q.x - x) < 0) ys.push(p.y + ((x - p.x) * (q.y - p.y)) / (q.x - p.x)); });
    if (ys.length >= 2) piece.lines.push(line(`acolchado-${i}`, 'pespunte', P(x, Math.min(...ys) + 6), P(x, Math.max(...ys) - 6), i ? undefined : label));
  }
}

// ------------------------------------------------------------------ Layouts
function bookLayout(p: Params, s0: number, sa: number): DollhouseLayout {
  const pumpkin = str(p, 'forma') === 'calabaza', W = (pumpkin ? 170 : 165) * s0, S = 22 * s0;
  const Hw = 175 * s0, Hr = 85 * s0, H = pumpkin ? 180 * s0 : Hr + Hw, top = pumpkin ? 0.24 * H : Hr, T = 2 * W + S;
  const anchors: A[] = pumpkin
    ? [[8 * s0, H, 'contorno'], [0, 0.6 * H], [6 * s0, 0.25 * H], [0.18 * W, 0.05 * H], [0.42 * W, 0.01 * H], [0.5 * W, 0.08 * H, undefined, 'c'], [0.58 * W, 0.01 * H], [0.82 * W, 0.05 * H], [W - 4 * s0, 0.22 * H, undefined, 'c'], [W + S + 4 * s0, 0.22 * H, undefined, 'c'],
      [W + S + 0.18 * W, 0.05 * H], [W + S + 0.42 * W, 0.01 * H], [W + S + 0.5 * W, 0.08 * H, undefined, 'c'], [W + S + 0.58 * W, 0.01 * H], [W + S + 0.82 * W, 0.05 * H], [T - 6 * s0, 0.25 * H], [T, 0.6 * H, 'lado'], [T - 8 * s0, H, 'contorno', 'l']]
    : [[0, H, 'contorno', 'cl'], [0, Hr, undefined, 'cl'], [W / 2, 0, undefined, 'cl'], [W, Hr, undefined, 'cl'], [W + S, Hr, undefined, 'cl'], [W + S + W / 2, 0, undefined, 'cl'], [T, Hr, 'lado', 'cl'], [T, H, 'contorno', 'cl']];
  const room = (x: number): [number, number, number, number] => [x + 12 * s0, top + 10 * s0, x + W - 12 * s0, H - 12 * s0];
  const [lx0, ly0, lx1, ly1] = room(0), [rx0, , rx1, ry1] = room(W + S);
  const inSlots: Slot[] = [
    { type: 'ropero', box: [lx0, ly0 + 0.25 * (ly1 - ly0), lx1, ly1] },
    { type: 'cama', box: [rx0 + 0.12 * (rx1 - rx0), ly0, rx1 - 0.12 * (rx1 - rx0), ry1] },
    ...(pumpkin ? [] : [{ type: 'banderines', box: [W * 0.12, Hr * 0.35, W * 0.88, Hr * 0.95] as [number, number, number, number] }])
  ];
  const outSlots: Slot[] = pumpkin
    ? [{ type: 'puerta', box: [0.3 * W, 0.5 * H, 0.7 * W, H - 14 * s0] }, { type: 'banderines', box: [0.1 * W, 0.18 * H, 0.9 * W, 0.42 * H] }]
    : [{ type: 'puerta', box: [0.32 * W, Hr + 0.45 * Hw, 0.68 * W, H - 12 * s0] }, { type: 'fachada', box: [0.06 * W, Hr + 0.08 * Hw, 0.94 * W, Hr + 0.4 * Hw] }];
  const folds = [line('lomo-1', 'pespunte', P(W, top), P(W, H), 'Lomo: pespunte de doblez'), line('lomo-2', 'pespunte', P(W + S, top), P(W + S, H))];
  const tab = rectangle('lengueta', 'Lengüeta de cierre (con velcro)', 50 * s0, 34 * s0, [edge('union', 'Unión: entra en el canto derecho', 'costura', sa), edge('canto', 'Canto', 'costura', sa), edge('punta', 'Punta', 'costura', sa), edge('canto-b', 'Canto', 'costura', sa)], { qty: 2, fabric: 'contraste' });
  const extra: Piece[] = [tab];
  const materials = [{ id: 'velcro', label: 'Velcro cosible de 2 cm', qty: cm(40 * s0) }];
  if (pumpkin) {
    const leaf = plush('hoja', 'Hoja de la calabaza (2, con un botón de fieltro o velcro)', [[0, 0, 'union', 'cl'], [24, 0, 'contorno', 'c'], [44, -14], [60, -40], [50, -66], [22, -74], [-6, -60], [-16, -30]], { k: s0, sa: Math.min(sa, 6), felt: false }, { qty: 2, mirrorPairs: true, fabric: 'contraste' });
    const stem = rectangle('tallo', 'Tallo (doblar en tubo)', 60 * s0, 50 * s0, [edge('punta', 'Punta', 'costura', sa), edge('lado', 'Lado', 'costura', sa), edge('base', 'Base: entra en la costura de arriba', 'costura', sa), edge('lado-b', 'Lado', 'costura', sa)], { qty: 1, fabric: 'contraste' });
    extra.push(leaf, stem);
  }
  return {
    s0, loose: [], extra, seams: [], materials, size: [T, H],
    notes: [{ level: 'ok', code: 'casita-libro', message: `Se abre como un libro: dos ${pumpkin ? 'calabazas' : 'casas'} de ${cm(W)} × ${cm(H)} con un lomo de ${cm(S)}. Dentro, ropero-bolsillo y cama con manta-bolsillo.` }],
    steps: [
      { id: 'muebles', title: 'Muebles', detail: 'Cose el ropero-bolsillo y la cama sobre el interior siguiendo sus líneas de colocación; fuera, la puerta y las ventanas (o la puerta y los banderines de la calabaza).' },
      { id: 'capas', title: 'Capas', detail: 'Pon exterior y interior derecho con derecho sobre la guata, mete la lengüeta en el canto derecho, cose alrededor dejando una abertura abajo, voltea y cierra.' },
      { id: 'acolchar', title: 'Acolcha', detail: 'Pespuntea las líneas de acolchado y los dos pespuntes del lomo para que se doble como un libro.' }
    ],
    panels: [
      { id: 'interior', name: `Interior (${pumpkin ? 'dos calabazas' : 'dos casas'} y lomo)`, anchors, qty: 1, fabric: 'principal', slots: inSlots, lines: folds, show: [0, 0], labels: { lado: 'Canto derecho: aquí va la lengüeta' } },
      { id: 'exterior', name: 'Exterior (la fachada queda delante al cerrar)', anchors: mirrorA(anchors, T), qty: 1, fabric: 'contraste', slots: outSlots, lines: folds.map(l => ({ ...l, a: P(T - l.a.x, l.a.y), b: P(T - l.b.x, l.b.y) })), show: [0, H + 40 * s0] },
      { id: 'guata', name: 'Guata o entretela acolchada (sin margen)', anchors, qty: 1, fabric: 'entretela', felt: true, slots: [] }
    ]
  };
}

function bagLayout(p: Params, s0: number, sa: number): DollhouseLayout {
  const shape = str(p, 'forma'), rooms = str(p, 'habitaciones'), W = 300 * s0, Hh = 230 * s0, n = 16 * s0;
  const end = (top: boolean): A[] => {
    const y = (v: number) => (top ? v : 2 * Hh - v), pts: A[] = [];
    if (shape === 'redonda') { const ry = 0.4 * Hh; for (let i = 1; i < 12; i++) { const a = Math.PI * (i / 12); pts.push([W / 2 - (W / 2) * Math.cos(a), y(ry - ry * Math.sin(a))]); } }
    else if (shape === 'tejado') pts.push([W / 2, y(0), undefined, 'cl']);
    else { const r = 24 * s0; for (let i = 1; i < 4; i++) { const a = (Math.PI / 2) * (i / 4); pts.push([r - r * Math.cos(a), y(r - r * Math.sin(a))]); } pts.push([W - r, y(0), undefined, 'cl']); for (let i = 1; i < 4; i++) { const a = Math.PI / 2 + (Math.PI / 2) * (i / 4); pts.push([W - r - r * Math.cos(a), y(r - r * Math.sin(a))]); } }
    return top ? pts : pts.reverse();
  };
  const startY = shape === 'redonda' ? 0.4 * Hh : shape === 'tejado' ? 0.35 * W : 24 * s0;
  const anchors: A[] = [
    [0, startY, 'contorno', shape === 'redonda' ? 'c' : 'cl'], ...end(true), [W, startY, undefined, shape === 'redonda' ? 'cl' : 'cl'], [W, Hh - n, undefined, 'cl'], [W - 14 * s0, Hh, undefined, 'cl'], [W, Hh + n, undefined, 'cl'],
    [W, 2 * Hh - startY, undefined, shape === 'redonda' ? 'c' : 'cl'], ...end(false), [0, 2 * Hh - startY, undefined, 'cl'], [0, Hh + n, undefined, 'cl'], [14 * s0, Hh, undefined, 'cl'], [0, Hh - n, undefined, 'cl']
  ];
  const yT0 = startY * (shape === 'redonda' ? 0.55 : 1) + 6 * s0, yF = Hh - 18 * s0, yB0 = Hh + 22 * s0, yB1 = 2 * Hh - startY * (shape === 'redonda' ? 0.45 : 0.9);
  const top: Slot[] = rooms === 'cocina-dormitorio'
    ? [{ type: 'fregadero', box: [0.05 * W, yT0 + 0.4 * (yF - yT0), 0.55 * W, yF] }, { type: 'campana', box: [0.15 * W, yT0, 0.45 * W, yT0 + 0.4 * (yF - yT0)] }, { type: 'nevera', box: [0.6 * W, yT0, 0.95 * W, yF] }]
    : rooms === 'salon-dormitorio'
      ? [{ type: 'ventana', box: [0.3 * W, yT0, 0.7 * W, yT0 + 0.5 * (yF - yT0)] }, { type: 'mesa', box: [0.1 * W, yT0 + 0.45 * (yF - yT0), 0.9 * W, yF] }]
      : [{ type: 'banera', box: [0.04 * W, yT0 + 0.15 * (yF - yT0), 0.55 * W, yF - 20 * s0] }, { type: 'espejo', box: [0.62 * W, yT0, 0.92 * W, yT0 + 0.45 * (yF - yT0)] }, { type: 'lavabo', box: [0.62 * W, yT0 + 0.45 * (yF - yT0), 0.92 * W, yF - 20 * s0] }, { type: 'alfombra', box: [0.25 * W, yF - 22 * s0, 0.75 * W, yF] }];
  const bottom: Slot[] = [
    { type: 'banderines', box: [0.12 * W, yB0, 0.88 * W, yB0 + 0.16 * (yB1 - yB0)] },
    ...(rooms === 'bano-dormitorio' ? [{ type: 'cama', box: [0.08 * W, yB0 + 0.24 * (yB1 - yB0), 0.46 * W, yB1] }, { type: 'cama', box: [0.54 * W, yB0 + 0.24 * (yB1 - yB0), 0.92 * W, yB1] }] as Slot[]
      : rooms === 'salon-dormitorio' ? [{ type: 'cama', box: [0.08 * W, yB0 + 0.24 * (yB1 - yB0), 0.46 * W, yB1] }, { type: 'sillon', box: [0.54 * W, yB0 + 0.4 * (yB1 - yB0), 0.94 * W, yB1] }] as Slot[]
        : [{ type: 'cama', box: [0.08 * W, yB0 + 0.24 * (yB1 - yB0), 0.46 * W, yB1] }, { type: 'armario', box: [0.56 * W, yB0 + 0.24 * (yB1 - yB0), 0.9 * W, yB1] }] as Slot[])
  ];
  const strap = rectangle('asa', 'Asa (doblar en cuatro y pespuntear)', 88 * s0, 280 * s0, [edge('extremo', 'Extremo', 'costura', sa), edge('canto', 'Canto doblado', 'sin-margen', 0), edge('extremo-b', 'Extremo', 'costura', sa), edge('canto-b', 'Canto doblado', 'sin-margen', 0)], { qty: 2, fabric: 'contraste' });
  for (const f of [0.25, 0.5, 0.75]) strap.lines.push(line(`doblez-${f}`, 'doblez', P(88 * s0 * f, 0), P(88 * s0 * f, 280 * s0), f === 0.25 ? 'Planchar en cuatro a lo largo' : undefined));
  const marks: Mark[] = [0.3, 0.7].flatMap(f => [{ id: `asa-${f}`, kind: 'cruz' as const, at: P(f * W, startY * 0.35 + 6 * s0), label: 'Asa (extremo)' }, { id: `asa-b-${f}`, kind: 'cruz' as const, at: P(f * W, 2 * Hh - startY * 0.35 - 6 * s0), label: 'Asa (extremo)' }]);
  const zip = str(p, 'cierre') === 'cremallera';
  const fold = line('doblez', 'pespunte', P(14 * s0, Hh), P(W - 14 * s0, Hh), 'Doblez: pespunte para que se doble por la mitad');
  const panelPiece = plush('tmp', 'tmp', anchors, { k: 1, sa, felt: true });
  const half = runLength(panelPiece, 'contorno') / 2 - (W - 28 * s0);
  return {
    s0, loose: ['muneca'], extra: [strap], seams: [], size: [W, 2 * Hh],
    materials: zip ? [{ id: 'cremallera', label: `Cremallera de doble carro de ${cm(Math.ceil(half / 50) * 50)} (rodea el borde de una mitad)`, qty: '1' }] : [{ id: 'broches', label: 'Broches de presión de plástico (o velcro)', qty: '2 pares' }],
    notes: [{ level: 'ok', code: 'casita-bolsa', message: `Se dobla por la mitad y se lleva por las asas: dos habitaciones de ${cm(W)} × ${cm(Hh)}.` }],
    steps: [
      { id: 'muebles', title: 'Muebles', detail: 'Cose los muebles en el interior siguiendo sus líneas: arriba la habitación de día y abajo el dormitorio.' },
      { id: 'asas', title: 'Asas', detail: 'Dobla cada asa en cuatro, pespuntea y préndelas en las marcas de los dos extremos, hacia dentro.' },
      { id: 'cerrar', title: 'Capas y cierre', detail: `Cose exterior e interior sobre la guata dejando una abertura, voltea y pespuntea el doblez del centro. ${zip ? 'Cose la cremallera alrededor del borde de una mitad y de la otra.' : 'Pon los broches en los lados para que no se abra.'}` }
    ],
    panels: [
      { id: 'interior', name: 'Interior: dos habitaciones', anchors, qty: 1, fabric: 'principal', slots: [...top, ...bottom], lines: [fold], marks, show: [0, 0] },
      { id: 'exterior', name: 'Exterior (fachada en la mitad de arriba)', anchors: mirrorA(anchors, W), qty: 1, fabric: 'contraste', slots: [{ type: 'puerta', box: [0.38 * W, yT0 + 0.3 * (yF - yT0), 0.62 * W, yF] }, { type: 'fachada', box: [0.05 * W, yT0, 0.95 * W, yT0 + 0.45 * (yF - yT0)] }], lines: [fold], marks },
      { id: 'guata', name: 'Guata (sin margen)', anchors, qty: 1, fabric: 'entretela', felt: true, slots: [] }
    ]
  };
}

function foldLayout(_p: Params, s0: number, sa: number): DollhouseLayout {
  const W = 210 * s0, H = 190 * s0, L = 126 * s0, ch = 30 * s0, X = 2 * L + W;
  const anchors: A[] = [[L + ch, 0, 'contorno', 'cl'], [L + W - ch, 0, undefined, 'cl'], [L + W, ch, undefined, 'cl'], [L + W, H, undefined, 'cl'], [X, H, undefined, 'cl'], [X, 2 * H, undefined, 'cl'], [0, 2 * H, undefined, 'cl'], [0, H, undefined, 'cl'], [L, H, undefined, 'cl'], [L, ch, undefined, 'cl']];
  const r = (x0: number, y0: number, w: number, h: number) => (fx0: number, fy0: number, fx1: number, fy1: number): [number, number, number, number] => [x0 + fx0 * w, y0 + fy0 * h, x0 + fx1 * w, y0 + fy1 * h];
  const T = r(L, 0, W, H), C = r(L, H, W, H), Lr = r(0, H, L, H), Rr = r(L + W, H, L, H);
  const slots: Slot[] = [
    { type: 'campana', box: T(0.1, 0.2, 0.45, 0.48) }, { type: 'fregadero', box: T(0.04, 0.48, 0.58, 0.96) }, { type: 'nevera', box: T(0.62, 0.18, 0.96, 0.96) },
    { type: 'ventana', box: C(0.25, 0.03, 0.75, 0.48) }, { type: 'mesa', box: C(0.04, 0.46, 0.96, 0.96) },
    { type: 'cama', box: Lr(0.06, 0.12, 0.94, 0.96) },
    { type: 'espejo', box: Rr(0.5, 0.06, 0.94, 0.38) }, { type: 'inodoro', box: Rr(0.04, 0.4, 0.5, 0.96) }, { type: 'lavabo', box: Rr(0.52, 0.42, 0.98, 0.96) }
  ];
  const folds = [line('doblez-1', 'pespunte', P(L, H), P(L, 2 * H), 'Doblez: pespunte entre habitaciones'), line('doblez-2', 'pespunte', P(L + W, H), P(L + W, 2 * H)), line('doblez-3', 'pespunte', P(L, H), P(L + W, H))];
  const strap = rectangle('asa', 'Asa (doblar en cuatro y pespuntear)', 88 * s0, 300 * s0, [edge('extremo', 'Extremo', 'costura', sa), edge('canto', 'Canto doblado', 'sin-margen', 0), edge('extremo-b', 'Extremo', 'costura', sa), edge('canto-b', 'Canto doblado', 'sin-margen', 0)], { qty: 2, fabric: 'contraste' });
  const marks: Mark[] = [0.25, 0.75].flatMap(f => [{ id: `asa-${f}`, kind: 'cruz' as const, at: P(L + f * W, 10 * s0), label: 'Asa' }, { id: `asa-b-${f}`, kind: 'cruz' as const, at: P(L + f * W, 2 * H - 10 * s0), label: 'Asa' }]);
  marks.push({ id: 'velcro-i', kind: 'punto', at: P(16 * s0, 1.5 * H), label: 'Velcro: cierra los laterales' }, { id: 'velcro-d', kind: 'punto', at: P(X - 16 * s0, 1.5 * H) });
  const out = mirrorA(anchors, X);
  return {
    s0, loose: ['muneca'], extra: [strap], seams: [], size: [X, 2 * H], materials: [{ id: 'velcro', label: 'Velcro cosible de 2 cm', qty: cm(80 * s0) }],
    notes: [{ level: 'ok', code: 'casita-plegable', message: `Cuatro habitaciones: cocina arriba, comedor en el centro, dormitorio y baño a los lados (${cm(L)} de ancho, se doblan como puertas).` }],
    steps: [
      { id: 'muebles', title: 'Muebles', detail: 'Cose los muebles en el interior siguiendo sus líneas: cocina, comedor, dormitorio y baño.' },
      { id: 'fachada', title: 'Fachada', detail: 'En el exterior, cose la puerta y las ventanas en la parte de arriba: es lo que se ve con la casita cerrada.' },
      { id: 'cerrar', title: 'Capas, asas y ribete', detail: 'Hilvana exterior, guata e interior, pespuntea los dobleces, préndelas asas en las marcas y ribetea todo el borde al bies. Dobla los laterales sobre el comedor, sube el comedor sobre la cocina y lleva la casita por las asas.' }
    ],
    panels: [
      { id: 'interior', name: 'Interior: cuatro habitaciones en cruz', anchors, qty: 1, fabric: 'principal', slots, lines: folds, marks, show: [0, 0] },
      { id: 'exterior', name: 'Exterior (fachada arriba)', anchors: out, qty: 1, fabric: 'contraste', slots: [{ type: 'fachada', box: [X - (L + 0.96 * W), 0.08 * H, X - (L + 0.04 * W), 0.45 * H] }, { type: 'puerta', box: [X - (L + 0.62 * W), 0.45 * H, X - (L + 0.38 * W), 0.96 * H] }], lines: folds.map(l => ({ ...l, a: P(X - l.a.x, l.a.y), b: P(X - l.b.x, l.b.y) })), marks },
      { id: 'guata', name: 'Guata (sin margen)', anchors, qty: 1, fabric: 'entretela', felt: true, slots: [] }
    ]
  };
}

function cubeLayout(p: Params, s0: number, sa: number): DollhouseLayout {
  const k = s0 * 1.2, A = 152 * k, F = 102 * k, Hw = 102 * k, r = F / Math.SQRT2, Lt = 2 * r + 2 * Hw + F;
  const strip: A[] = [[0, 0, 'borde', 'cl'], [A, 0, 'cosido-d', 'cl'], [A, Lt - Hw, 'frente-d', 'cl'], [A, Lt, 'borde-b', 'cl'], [0, Lt, 'frente-i', 'cl'], [0, Lt - Hw, 'cosido-i', 'cl']];
  const gable: A[] = [[0, F / 2 + Hw, 'frente', 'cl'], [0, F / 2, 'cosido', 'cl'], [F / 2, 0, undefined, 'cl'], [F, F / 2, undefined, 'cl'], [F, F / 2 + Hw, undefined, 'cl']];
  const segs = [['Tejado delantero', 0, r], ['Tejado trasero', r, 2 * r], ['Pared del fondo', 2 * r, 2 * r + Hw], ['Suelo', 2 * r + Hw, 2 * r + Hw + F], ['Frente (se abre y es el jardín)', 2 * r + Hw + F, Lt]] as const;
  const folds = segs.slice(1).map(([name, y0], i) => line(`pliegue-${i}`, 'doblez', P(0, y0), P(A, y0), `Pliegue: ${name.toLowerCase()}`));
  const yWall = 2 * r + Hw, slots: Slot[] = [
    { type: 'ventana', box: [0.12 * A, 2 * r + 6 * k, 0.88 * A, yWall - 6 * k] },
    { type: 'alfombra', box: [0.15 * A, yWall + 0.55 * F, 0.85 * A, yWall + 0.8 * F] },
    { type: 'jardin', box: [0.05 * A, Lt - 0.5 * Hw, 0.95 * A, Lt - 4 * k], flip: false }
  ];
  const zip = str(p, 'cierre') === 'botones';
  const gableIn = [{ type: 'espejo', box: [0.25 * F, F / 2 + 4 * k, 0.75 * F, F / 2 + 0.6 * Hw] as [number, number, number, number] }];
  const gableIn2 = [{ type: 'cuadro', box: [0.2 * F, F / 2 + 4 * k, 0.8 * F, F / 2 + 0.55 * Hw] as [number, number, number, number] }];
  const strap = rectangle('asa', 'Asa del tejado (doblar en cuatro y pespuntear)', 88 * s0, 1.5 * A, [edge('extremo', 'Extremo', 'costura', sa), edge('canto', 'Canto doblado', 'sin-margen', 0), edge('extremo-b', 'Extremo', 'costura', sa), edge('canto-b', 'Canto doblado', 'sin-margen', 0)], { qty: 1, fabric: 'contraste' });
  // Outer strip in two fabrics: roof and walls, joined straight across.
  const roofOut = rectangle('franja-tejado', 'Exterior del tejado (2 aguas en una pieza)', A, 2 * r, [edge('borde', 'Alero delantero', 'costura', sa), edge('lado', 'Une con el hastial', 'costura', sa), edge('union', 'Une con las paredes', 'costura', sa), edge('lado-b', 'Une con el hastial', 'costura', sa)], { qty: 1, fabric: 'contraste' });
  roofOut.lines.push(line('cumbrera', 'doblez', P(0, r), P(A, r), 'Cumbrera: aquí va el asa'));
  const wallsOut = rectangle('franja-paredes', 'Exterior de paredes, suelo y frente', A, 2 * Hw + F, [edge('union', 'Une con el tejado', 'costura', sa), edge('lado', 'Lado', 'costura', sa), edge('borde', 'Borde del frente', 'costura', sa), edge('lado-b', 'Lado', 'costura', sa)], { qty: 1, fabric: 'principal' });
  for (const [i, y] of [Hw, Hw + F].entries()) wallsOut.lines.push(line(`pliegue-${i}`, 'doblez', P(0, y), P(A, y), i ? 'Pliegue del frente' : 'Pliegue del suelo'));
  const front = placeSlot({ type: 'puerta', box: [0.38 * A, Hw + F + 6 * k, 0.62 * A, 2 * Hw + F - 4 * k], flip: true }, s0), win = placeSlot({ type: 'fachada', box: [0.05 * A, Hw + F + 0.45 * Hw, 0.95 * A, 2 * Hw + F - 6 * k], flip: true }, s0);
  for (const pl of [front, win]) for (const pp of pl.parts) pp.pts.forEach((q, i) => { const b = pp.pts[(i + 1) % pp.pts.length]; wallsOut.lines.push(line(`fachada-${pp.part.key}-${i}`, 'colocacion', q, b, i ? undefined : pp.part.name)); });
  const stiff = segs.map(([name, y0, y1], i) => rectangle(`refuerzo-${i}`, `Refuerzo: ${name.toLowerCase()} (espuma de 3 mm, sin margen)`, A - 6, y1 - y0 - 6, [edge('a', 'Borde', 'sin-margen', 0), edge('b', 'Borde', 'sin-margen', 0), edge('c', 'Borde', 'sin-margen', 0), edge('d', 'Borde', 'sin-margen', 0)], { qty: 1, fabric: 'entretela' }));
  const gableStiff = plush('refuerzo-hastial', 'Refuerzo del hastial (espuma, recorta 3 mm alrededor)', gable, { k: 1, sa: 0, felt: true }, { qty: 2, fabric: 'entretela' });
  const extra = [roofOut, wallsOut, strap, ...stiff, gableStiff];
  return {
    s0, loose: ['cama-suelta', 'muneca'], extra, size: [A + 2 * F + 40, Lt],
    seams: [match('tejado-paredes', 'Tejado con paredes (exterior)', side(roofOut, 'union'), side(wallsOut, 'union'))],
    materials: [{ id: 'espuma', label: 'Espuma de 3 mm o entretela muy gruesa para las paredes', qty: `${cm(A + 2 * F)} × ${cm(Lt)}` }, zip ? { id: 'botones', label: 'Botones planos y elástico para las presillas (no para bebés)', qty: '2 + 20 cm' } : { id: 'velcro', label: 'Velcro cosible de 2 cm', qty: cm(2 * Hw) }],
    notes: [{ level: 'ok', code: 'casita-cubo', message: `Casita de ${cm(A)} × ${cm(F)} × ${cm(Hw)} con tejado a dos aguas a 45° (cada agua de ${cm(r)}): el frente se abre y es el jardín. Medidas como la referencia de 6 × 4 × 4 pulgadas, escaladas con la muñeca.` }],
    steps: [
      { id: 'interior', title: 'Interior', detail: 'Cose la ventana, la alfombra y el jardín en la franja interior y los adornos en los hastiales interiores.' },
      { id: 'exterior', title: 'Exterior', detail: 'Une el tejado con las paredes y cose la puerta y las ventanas en el frente. Mete los refuerzos entre exterior e interior, uno en cada tramo, y pespuntea los pliegues.' },
      { id: 'montar', title: 'Monta', detail: `Cose cada hastial (exterior, refuerzo e interior) a la franja desde el suelo, por la pared y el tejado; el frente queda libre. Cose el asa en la cumbrera y ${zip ? 'las presillas con botón' : 'el velcro'} para cerrar el frente.` }
    ],
    panels: [
      { id: 'franja-interior', name: 'Franja interior: tejado, pared, suelo y frente', anchors: strip, qty: 1, fabric: 'principal', slots, lines: [...folds, line('cumbrera', 'pespunte', P(0.2 * A, r), P(0.8 * A, r), 'Cumbrera: el asa se cose aquí')], show: [F + 20, 0], labels: { 'cosido-d': 'Une con el hastial', 'cosido-i': 'Une con el hastial', 'frente-d': 'Frente: libre (se abre)', 'frente-i': 'Frente: libre (se abre)', borde: 'Alero', 'borde-b': 'Borde del jardín' } },
      { id: 'hastial-izquierdo', name: 'Hastial interior izquierdo (con espejo)', anchors: gable, qty: 1, fabric: 'principal', slots: gableIn, show: [0, 2 * r + Hw - F / 2], labels: { frente: 'Frente: libre (cierre)', cosido: 'Une con la franja' } },
      { id: 'hastial-derecho', name: 'Hastial interior derecho (con cuadro)', anchors: mirrorA(gable, F), qty: 1, fabric: 'principal', slots: gableIn2, show: [F + 40 + A, 2 * r + Hw - F / 2], labels: { frente: 'Frente: libre (cierre)', cosido: 'Une con la franja' } },
      { id: 'hastial-exterior', name: 'Hastial exterior (2)', anchors: gable, qty: 2, fabric: 'contraste', slots: [], labels: { frente: 'Frente: libre (cierre)', cosido: 'Une con la franja' } }
    ]
  };
}

function matLayout(_p: Params, s0: number, sa: number): DollhouseLayout {
  const w = 210 * s0, h = 190 * s0, Hr = 95 * s0, Wt = 2 * w, Ht = Hr + 2 * h;
  const anchors: A[] = [[0, Hr, 'contorno', 'cl'], [w / 2, 0, undefined, 'cl'], [w, Hr, undefined, 'cl'], [Wt, Hr, undefined, 'cl'], [Wt, Ht, undefined, 'cl'], [0, Ht, undefined, 'cl']];
  const R = (x0: number, y0: number) => (a: number, b: number, c: number, d: number): [number, number, number, number] => [x0 + a * w, y0 + b * h, x0 + c * w, y0 + d * h];
  const K = R(0, Hr), D = R(w, Hr), B = R(0, Hr + h), Bd = R(w, Hr + h);
  const slots: Slot[] = [
    { type: 'banderines', box: [0.18 * w, 0.4 * Hr, 0.82 * w, 0.95 * Hr] },
    { type: 'nevera', box: K(0.04, 0.1, 0.36, 0.96) }, { type: 'campana', box: K(0.5, 0.04, 0.86, 0.4) }, { type: 'fregadero', box: K(0.4, 0.46, 0.97, 0.96) },
    { type: 'ventana', box: D(0.24, 0.03, 0.76, 0.46) }, { type: 'mesa', box: D(0.04, 0.46, 0.96, 0.96) },
    { type: 'toalla', box: B(0.05, 0.04, 0.38, 0.44) }, { type: 'espejo', box: B(0.44, 0.03, 0.7, 0.42) }, { type: 'banera', box: B(0.03, 0.48, 0.66, 0.96) }, { type: 'inodoro', box: B(0.7, 0.46, 0.98, 0.96) },
    { type: 'cuadro', box: Bd(0.05, 0.04, 0.42, 0.36) }, { type: 'lampara', box: Bd(0.62, 0.0, 0.86, 0.22) }, { type: 'sillon', box: Bd(0.03, 0.5, 0.46, 0.96) }, { type: 'cama', box: Bd(0.5, 0.26, 0.97, 0.98) }
  ];
  const dividers = [line('separacion-v', 'colocacion', P(w, Hr), P(w, Ht), 'Cinta o puntilla entre habitaciones'), line('separacion-h', 'colocacion', P(0, Hr + h), P(Wt, Hr + h))];
  const folds = [line('doblez-v', 'pespunte', P(w, Hr + 4), P(w, Ht - 4), 'Doblez: pespunte sobre la cinta'), line('doblez-h', 'pespunte', P(4, Hr + h), P(Wt - 4, Hr + h))];
  const tab = rectangle('lengueta', 'Lengüeta de cierre (con velcro)', 60 * s0, 40 * s0, [edge('union', 'Unión: entra en el ribete', 'costura', sa), edge('canto', 'Canto', 'costura', sa), edge('punta', 'Punta', 'costura', sa), edge('canto-b', 'Canto', 'costura', sa)], { qty: 2, fabric: 'contraste' });
  const out = mirrorA(anchors, Wt);
  return {
    s0, loose: ['muneca'], extra: [tab], seams: [], size: [Wt, Ht],
    materials: [{ id: 'puntilla', label: 'Puntilla o cinta de 1,5 cm para separar las habitaciones', qty: cm(2 * h + Wt + 60) }, { id: 'velcro', label: 'Velcro cosible de 2 cm', qty: cm(60 * s0) }],
    notes: [{ level: 'ok', code: 'casita-tapete', message: `Cuatro habitaciones de ${cm(w)} × ${cm(h)} y desván. Se dobla en cuatro: cerrada queda una casita con tejado.` }],
    steps: [
      { id: 'muebles', title: 'Muebles interactivos', detail: 'Cose cada mueble en su línea: nevera y armarios con puertas, horno, cortinas con alzapaños, mantel, toallero, bañera-bolsillo, tapa del inodoro, sillón con libro y cama con manta-bolsillo.' },
      { id: 'cintas', title: 'Separaciones', detail: 'Cose la puntilla sobre las líneas que separan las habitaciones.' },
      { id: 'cerrar', title: 'Capas y ribete', detail: 'Hilvana exterior, guata e interior, pespuntea los dobleces sobre la puntilla, mete la lengüeta en el borde y ribetea todo al bies.' }
    ],
    panels: [
      { id: 'interior', name: 'Interior: cuatro habitaciones y desván', anchors, qty: 1, fabric: 'principal', slots, lines: [...dividers, ...folds], show: [0, 0] },
      { id: 'exterior', name: 'Exterior (la fachada queda delante al cerrar)', anchors: out, qty: 1, fabric: 'contraste', slots: [{ type: 'fachada', box: [Wt - w + 0.04 * w, Hr + 0.05 * h, Wt - 0.04 * w, Hr + 0.5 * h] }, { type: 'puerta', box: [Wt - w / 2 - 0.16 * w, Hr + 0.45 * h, Wt - w / 2 + 0.16 * w, Hr + 0.97 * h] }], lines: folds.map(l => ({ ...l, a: P(Wt - l.a.x, l.a.y), b: P(Wt - l.b.x, l.b.y) })) },
      { id: 'guata', name: 'Guata (sin margen)', anchors, qty: 1, fabric: 'entretela', felt: true, slots: [] }
    ]
  };
}

const PAGES: [string, string, Slot['type'][]][] = [
  ['tapa', 'Tapa: fachada', ['fachada', 'puerta', 'jardin']], ['bano', 'Baño', ['toalla', 'espejo', 'banera']], ['armario', 'Armario', ['armario']], ['cocina', 'Cocina', ['platero', 'horno']],
  ['salon', 'Salón', ['lampara', 'cuadro', 'sillon']], ['dormitorio', 'Dormitorio', ['cuadro', 'cama']], ['lavadero', 'Lavadero', ['lavadora']], ['comedor', 'Comedor', ['ventana', 'mesa']]
];
function pagesLayout(s0: number): DollhouseLayout {
  const Pw = 160 * s0, Ph = 220 * s0, g = 16 * s0, m = 12 * s0;
  const slotsFor = (types: string[]): Slot[] => {
    const box = (a: number, b: number, c: number, d: number): [number, number, number, number] => [m + 14 * s0 + a * (Pw - 2 * m - 14 * s0), m + b * (Ph - 2 * m), m + 14 * s0 + c * (Pw - 2 * m - 14 * s0), m + d * (Ph - 2 * m)];
    const map: Record<string, [number, number, number, number]> = {
      fachada: box(0, 0.05, 1, 0.42), puerta: box(0.3, 0.45, 0.7, 0.85), jardin: box(0, 0.84, 1, 1), toalla: box(0.02, 0.05, 0.45, 0.45), espejo: box(0.55, 0.04, 0.98, 0.42),
      banera: box(0, 0.5, 1, 1), armario: box(0.1, 0.06, 0.9, 1), platero: box(0.05, 0.02, 0.45, 0.6), horno: box(0.45, 0.45, 1, 1), lampara: box(0.55, 0, 0.95, 0.25),
      cuadro: box(0.05, 0.04, 0.5, 0.36), sillon: box(0.05, 0.45, 0.95, 1), cama: box(0.15, 0.3, 0.85, 1), lavadora: box(0.05, 0.05, 0.95, 1), ventana: box(0.15, 0.02, 0.85, 0.5), mesa: box(0, 0.5, 1, 1)
    };
    return types.map(type => ({ type, box: map[type] }));
  };
  const cols = 4;
  return {
    s0, loose: ['muneca'], extra: [], seams: [], size: [cols * (Pw + g), 2 * (Ph + g)], materials: [{ id: 'anillas', label: 'Cinta de algodón para encuadernar (o anillas de libreta, no para bebés)', qty: cm(600 * s0) }],
    notes: [{ level: 'ok', code: 'casita-paginas', message: `Libro de ${PAGES.length} páginas de fieltro de ${cm(Pw)} × ${cm(Ph)}, cada una con un mueble que se abre, se mete o se cuelga, y una muñequita con gato.` }],
    steps: [
      { id: 'muebles', title: 'Muebles', detail: 'Cose los muebles de fieltro en cada página con puntada de festón o pespunte, siguiendo sus líneas.' },
      { id: 'paginas', title: 'Páginas', detail: 'Une las páginas de dos en dos espalda con espalda con festón y encuadérnalas por los agujeros con cinta.' }
    ],
    panels: PAGES.map(([id, name, types], i) => ({
      id: `pagina-${id}`, name: `Página: ${name} (fieltro, sin margen)`, anchors: rectA(0, 0, Pw, Ph, 'borde'), qty: 1, fabric: 'principal' as FabricRole, felt: true, slots: slotsFor(types),
      marks: [{ id: 'agujero-1', kind: 'punto' as const, at: P(8 * s0, 0.25 * Ph), label: 'Agujero para encuadernar' }, { id: 'agujero-2', kind: 'punto' as const, at: P(8 * s0, 0.75 * Ph) }],
      show: [(i % cols) * (Pw + g), Math.floor(i / cols) * (Ph + g)] as [number, number]
    }))
  };
}

export const DOLLHOUSE_LAYOUTS: Record<string, (p: Params, s0: number, sa: number) => DollhouseLayout> = {
  'casita-libro': bookLayout, 'casita-bolsa': bagLayout, 'casita-plegable': foldLayout, 'casita-cubo': cubeLayout, 'casita-tapete': matLayout, 'casita-paginas': (_p, s0) => pagesLayout(s0)
};
export function dollhouseLayout(id: string, p: Params) { const s0 = num(p, 'muneca') / 120; return DOLLHOUSE_LAYOUTS[id](p, s0, num(p, 'margen')); }

// ------------------------------------------------------------------ Pieces from a layout
const ROLE_FABRIC: Record<string, string> = { pared: 'tela de pared', suelo: 'tela de suelo', tela1: 'tela estampada A', tela2: 'tela estampada B', madera: 'fieltro marrón', blanco: 'fieltro blanco', metal: 'fieltro gris', espejo: 'lámina de espejo de seguridad', verde: 'fieltro verde', agua: 'fieltro azul claro', noche: 'fieltro azul noche', amarillo: 'fieltro amarillo', rosa: 'fieltro rosa' };
function partPiece(id: string, part: Part, pts: Pt[], sa: number, qty: number): { piece: Piece; feltForced: boolean } {
  const xs = pts.map(q => q.x), ys = pts.map(q => q.y), narrow = Math.min(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys));
  // Lined parts narrower than 16 mm cannot be turned: cut them in felt instead.
  const forced = (part.make === 'forrado' || part.make === 'relleno') && narrow < 16;
  const felt = part.make === 'fieltro' || part.make === 'aplique' || forced;
  const what = part.make === 'aplique' ? 'tela con entretela termoadhesiva, sin margen' : forced ? 'fieltro, sin margen: a este tamaño no se puede voltear' : felt ? 'fieltro, sin margen' : part.make === 'relleno' ? 'relleno' : 'forrado: 2 capas';
  const how = part.opens === 'bolsillo' ? 'Bolsillo: se cose por los lados y el bajo.' : part.opens ? `Se abre: cose solo el lado ${part.opens === 'izquierda' ? 'izquierdo' : part.opens === 'derecha' ? 'derecho' : part.opens === 'arriba' ? 'de arriba' : 'de abajo'}.` : part.loose ? 'Pieza suelta.' : 'Se cose sobre la pared.';
  const piece = polyRuns(id, `${part.name.replace(/\s*\(.*\)$/, '')} (${what})`, pts, () => (felt ? 'borde' : 'contorno'), { k: 1, sa: felt ? 0 : Math.min(sa, 6), felt }, { qty: forced && part.make === 'forrado' ? Math.max(1, qty / 2) : qty, mirrorPairs: !!part.mirror && !felt, fabric: felt ? 'contraste' : 'principal' });
  piece.notes = [`${how} Color: ${ROLE_FABRIC[part.role] ?? part.role}.`];
  for (const [i, [a, b]] of (part.lines ?? []).entries()) piece.lines.push(line(`pespunte-${i}`, 'pespunte', a, b, i ? undefined : 'Pespunte o bordado'));
  return { piece, feltForced: forced };
}

export function buildDollhouse(id: string, p: Params): GeneratorResult {
  const D = num(p, 'muneca'), sa = num(p, 'margen');
  if (!(D >= 90 && D <= 200) || !(sa >= 4 && sa <= 10)) return invalid('casita-medidas', 'La muñeca va de 9 a 20 cm y el margen de 4 a 10 mm.');
  const L = DOLLHOUSE_LAYOUTS[id](p, D / 120, sa), t: ToyScale = { k: 1, sa, felt: false };
  const pieces: Piece[] = [], seams: SeamRelation[] = [...L.seams], notices: Issue[] = [exp('Casita de muñecas'), safety, ...L.notes];
  const furn = new Map<string, Piece>(), how = new Map<string, string>(), scales = new Map<string, number>();
  let forced = false;
  const addPart = (type: string, part: Part, sc: number) => {
    const base = `${type}-${part.cut ?? part.key}`, prev = scales.get(base);
    const key = prev === undefined || Math.abs(prev - sc) / sc < 0.02 ? base : `${base}-${Math.round(sc * 100)}`;
    if (prev === undefined) scales.set(base, sc);
    const qty = part.qty ?? (part.make === 'forrado' || part.make === 'relleno' ? 2 : 1), got = furn.get(key);
    if (got) { got.cut.qty += part.make === 'forrado' && got.edges.every(e => e.finish === 'sin-margen') ? Math.max(1, qty / 2) : qty; if (part.mirror) got.cut.mirrorPairs = got.edges.some(e => e.finish === 'costura'); return; }
    const local = part.poly.map(q => P(q.x * sc, q.y * sc)), made = partPiece(key, { ...part, lines: (part.lines ?? []).map(([a, b]) => [P(a.x * sc, a.y * sc), P(b.x * sc, b.y * sc)] as [Pt, Pt]) }, local, sa, qty);
    forced ||= made.feltForced;
    furn.set(key, made.piece);
  };
  for (const panel of L.panels) {
    const piece = plush(panel.id, panel.name, panel.anchors, { ...t, felt: !!panel.felt }, { qty: Math.max(1, panel.qty), fabric: panel.fabric, labels: panel.labels, hems: panel.hems });
    pieces.push(piece);
    piece.lines.push(...(panel.lines ?? []));
    piece.marks.push(...(panel.marks ?? []));
    for (const slot of panel.slots) {
      const pl = placeSlot(slot, L.s0);
      how.set(pl.f.type, pl.f.how);
      for (const pp of pl.parts) {
        pp.pts.forEach((q, i) => { const b = pp.pts[(i + 1) % pp.pts.length]; piece.lines.push(line(`${panel.id}-${pl.f.type}-${pp.part.key}-${slot.box[0].toFixed(0)}-${i}`, 'colocacion', q, b, i ? undefined : pp.part.name.replace(/\s*\(.*\)$/, ''))); });
        pp.wall.forEach(([a, b], i) => piece.lines.push(line(`${panel.id}-${pl.f.type}-${pp.part.key}-${slot.box[0].toFixed(0)}-bordado-${i}`, 'pespunte', a, b, i ? undefined : 'Bordar en la pared')));
        addPart(pl.f.type, pp.part, pl.sc);
      }
      for (const part of pl.f.parts.filter(x => x.loose)) addPart(pl.f.type, part, pl.sc);
    }
  }
  for (const type of L.loose) { const f = furniture(type); how.set(type, f.how); for (const part of f.parts) addPart(type, part, L.s0); }
  // Quilting on the outer layer of the quilted houses.
  const ext = pieces.find(x => x.id === 'exterior');
  if (ext && id !== 'casita-paginas') quilt(ext, 30 * L.s0, 'Acolchado: pespunte cada 3 cm a través de las tres capas');
  pieces.push(...L.extra, ...furn.values());
  // Binding around the quilted mats, or a turning opening for bagged ones.
  const inner = pieces.find(x => x.id === 'interior');
  if (inner && (id === 'casita-plegable' || id === 'casita-tapete' || str(p, 'acabado') === 'ribete')) {
    const total = inner.edges.reduce((sum, e) => sum + runLength({ ...inner, edges: [e] }, e.id), 0);
    const s = strips('ribete', 'Ribete al bies (ancho de corte 4 cm, doblar en cuatro)', total, 40, 0, 'contraste', { maxLen: 1300, bias: true, endSa: 15 });
    s.piece.edges.forEach(e => { if (e.id.startsWith('canto')) { e.finish = 'sin-margen'; e.allowance = 0; } });
    pieces.push(s.piece);
    seams.push(equal('ribete', 'Ribete alrededor de toda la casita', [{ pieceId: s.piece.id, edgeIds: ['canto'], factor: s.n }], [{ pieceId: inner.id, edgeIds: inner.edges.map(e => e.id) }], 0.8));
  } else if (inner) {
    const run = inner.edges[0].id.replace(/-\d+$/, ''), Lr = runLength(inner, run);
    notchAt(inner, run, Lr * 0.04, 'Abertura para voltear (se cierra con el pespunte de alrededor)', 'abertura-a'); notchAt(inner, run, Lr * 0.04 + Math.min(120, Lr * 0.15), 'Fin de la abertura', 'abertura-b');
  }
  // The cube's gables are sewn to the strip from the floor over the roof.
  const strip = pieces.find(x => x.id === 'franja-interior'), gl = pieces.find(x => x.id === 'hastial-izquierdo'), gr = pieces.find(x => x.id === 'hastial-derecho'), go = pieces.find(x => x.id === 'hastial-exterior');
  if (strip && gl && gr && go) seams.push(match('hastial-i', 'Hastial izquierdo con la franja', side(gl, 'cosido'), side(strip, 'cosido-i')), match('hastial-d', 'Hastial derecho con la franja', side(gr, 'cosido'), side(strip, 'cosido-d')),
    match('hastial-exterior', 'Hastial exterior con el interior', side(go, 'cosido'), side(gl, 'cosido')), match('frente', 'Frente que se abre con el canto libre del hastial', side(strip, 'frente-d'), side(gl, 'frente')));
  if (forced) notices.push({ level: 'aviso', code: 'casita-fieltro', message: 'A este tamaño algunas puertas o bolsillos forrados son demasiado estrechos para voltearlos: se cortan en fieltro.' });
  notices.push({ level: 'aviso', code: 'casita-piezas-sueltas', message: 'Las piezas sueltas pequeñas (platos, pinzas, ropa, libro, gatito) no son para menores de 3 años: cóselas fijas o guárdalas aparte.' });
  const interactive = [...how.entries()].filter(([, h]) => h).map(([type, h]) => `${furniture(type).name}: ${h}`);
  return {
    pieces, seams, notices,
    checks: [{ key: 'muneca', label: 'Muñeca para la que está pensada', target: D, measured: D, tolerance: 0.5 }],
    materials: [{ id: 'tela', label: 'Algodón o lino para paredes (interior) y fachada (exterior)', qty: `${cm(L.size[0] + 60)} × ${cm(L.size[1] + 60)} de cada` }, { id: 'guata', label: 'Guata fina o entretela acolchada', qty: `${cm(L.size[0] + 20)} × ${cm(L.size[1] + 20)}` },
      { id: 'fieltro', label: 'Fieltro de colores y retales estampados para los muebles', qty: 'Retales' }, ...L.materials, { id: 'hilo', label: 'Hilo de coser y de bordar', qty: '1 + 3' }],
    assumptions: [`Hecha para una muñeca de ${cm(D)}; todo se escala con ella. Las líneas de colocación marcan dónde va cada mueble: también se ven al proyectar.`, ...interactive],
    steps: L.steps.map(s => ({ ...s, pieces: [] }))
  };
}

const dollParam: ParamDef = { key: 'muneca', label: 'Alto de la muñeca', group: 'diseno', type: 'length', min: 90, max: 200 };
const choice = (key: string, label: string, opts: [string, string][]): ParamDef => ({ key, label, group: 'diseno', type: 'choice', choices: opts.map(([value, l]) => ({ value, label: l })) });
const gen = (id: string, name: string, summary: string, extra: Params, params: ParamDef[]): PatternGenerator => ({
  id, name, status: 'experimental', summary, requiredMeasures: [], optionalMeasures: [], params: [dollParam, ...params, margin],
  defaults: () => ({ muneca: 120, margen: 6, ...extra }),
  generate: (ctx: GeneratorContext, params: Params) => { void ctx; return buildDollhouse(id, { muneca: 120, margen: 6, ...extra, ...params }); }
});
export const DOLLHOUSE_GENERATORS: PatternGenerator[] = [
  gen('casita-libro', 'Casita libro', 'Casita que se abre como un libro, en forma de casa o de calabaza, con ropero-bolsillo, cama y lengüeta.', { forma: 'casa' }, [choice('forma', 'Forma', [['casa', 'Dos casas con tejado'], ['calabaza', 'Calabaza']])]),
  gen('casita-bolsa', 'Casita bolsa', 'Dos habitaciones que se doblan por la mitad y se llevan por las asas.', { forma: 'redonda', habitaciones: 'bano-dormitorio', cierre: 'broches' }, [
    choice('forma', 'Forma', [['redonda', 'Redondeada'], ['tejado', 'Con tejado en los dos extremos'], ['rectangular', 'Rectangular']]),
    choice('habitaciones', 'Habitaciones', [['bano-dormitorio', 'Baño y dormitorio'], ['cocina-dormitorio', 'Cocina y dormitorio'], ['salon-dormitorio', 'Salón y dormitorio']]),
    choice('cierre', 'Cierre', [['broches', 'Broches de presión'], ['cremallera', 'Cremallera alrededor']])]),
  gen('casita-plegable', 'Casita plegable con asas', 'Cuatro habitaciones en cruz: los laterales se doblan como puertas y se lleva por las asas.', {}, []),
  gen('casita-cubo', 'Casita cubo con tejado', 'Casita con volumen: paredes con refuerzo, tejado a dos aguas con asa y frente que se abre como jardín.', { cierre: 'velcro' }, [choice('cierre', 'Cierre del frente', [['velcro', 'Velcro (bebés)'], ['botones', 'Botón y presilla']])]),
  gen('casita-tapete', 'Tapete casita de cuatro habitaciones', 'Libro-tapete acolchado con cocina, comedor, baño y dormitorio llenos de muebles que se abren.', {}, []),
  gen('casita-paginas', 'Libro de casita de fieltro', 'Ocho páginas de fieltro, cada una con un mueble interactivo, y muñequita con gato.', {}, [])
];
