import { num, str, type GeneratorContext, type GeneratorResult, type ParamDef, type Params, type PatternGenerator } from '../generator';
import type { FabricRole, Issue, Piece, SeamRelation } from '../types';
import type { Pt } from '../../geom/vec';
import { P, cm, edge, equal, invalid, rectangle, type EdgeDef } from './kidsShared';
import { notchAt, runLength } from './toyKit';
import { polyRuns } from './cushionKit';
import { offsetPolygons } from '../../geom/polyoffset';
import { bendFor, biggest, clipLines, near, smooth } from './shapeKit';

/* Bolsos y mochilas (2026-11-09): ocho construcciones propias a partir de las
 * fotos de la usuaria. Funda acolchada para portátil con cremallera en tres
 * lados, bolsa en U con fuelle y bolsillo bordado, bolsa con asas laterales de
 * una pieza (tipo bolsa de compra), bolsa estrella con asa calada, tote de
 * caja con bolsillos alrededor, mochila de solapa con hebillas, mochila osito
 * infantil y riñonera organizadora. No se copian marcas ni medidas: las
 * medidas de las referencias se usan solo como comprobación y todo sale de
 * los parámetros. Experimental hasta coser una muestra. */

export type Seg = { pts: Pt[]; run: string };
const TAU = Math.PI * 2;
const key = (q: Pt) => `${q.x.toFixed(3)},${q.y.toFixed(3)}`;
/** Closed outline from consecutive segments (each ends where the next starts); every edge keeps its segment's run. */
export function tagged(segs: Seg[]) {
  const pts: Pt[] = [], runs: string[] = [];
  for (const s of segs) for (const q of s.pts.slice(0, -1)) { pts.push(q); runs.push(s.run); }
  let area = 0; pts.forEach((a, i) => { const b = pts[(i + 1) % pts.length]; area += a.x * b.y - b.x * a.y; });
  const map = new Map<string, string>(), n = pts.length, corners = new Set<string>();
  pts.forEach((q, i) => { map.set(key(area >= 0 ? q : pts[(i + 1) % n]), runs[i]); if (runs[i] !== runs[(i - 1 + n) % n]) corners.add(key(q)); });
  // Points where the run changes must survive simplification.
  return { pts: area >= 0 ? pts : [...pts].reverse(), runOf: (a: Pt) => map.get(key(a)) ?? 'contorno', keep: (q: Pt) => corners.has(key(q)) };
}
export const arcPts = (cx: number, cy: number, r: number, a0: number, a1: number, n = 12) => Array.from({ length: n + 1 }, (_, i) => { const a = a0 + ((a1 - a0) * i) / n; return P(cx + r * Math.cos(a), cy + r * Math.sin(a)); });
const line = (a: Pt, b: Pt) => [a, b];
export const runIds = (pc: Piece, run: string) => pc.edges.filter(e => e.id === run || new RegExp(`^${run}-\\d+$`).test(e.id)).map(e => e.id);
const len = (pc: Piece, run: string) => runLength(pc, run);
const mirrorSegs = (segs: Seg[]): Seg[] => [...segs].reverse().map(s => ({ run: s.run, pts: [...s.pts].reverse().map(q => P(-q.x, q.y)) }));
/** Catmull-Rom through points (smooth curves for straps and mouths). */
export function curve(pts: Pt[], n = 10): Pt[] {
  const out: Pt[] = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(pts.length - 1, i + 2)];
    for (let j = 0; j < n; j++) { const t = j / n, t2 = t * t, t3 = t2 * t; out.push(P(0.5 * (2 * p1.x + (-p0.x + p2.x) * t + (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 + (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3), 0.5 * (2 * p1.y + (-p0.y + p2.y) * t + (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 + (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3))); }
  }
  out.push(pts[pts.length - 1]);
  return out;
}
/** Rounded rectangle (0,0)-(w,h) as runs: top, sides and bottom (corners belong to the side below or above). */
function roundRectSegs(w: number, h: number, r: number, runs: { top: string; side: string; bottom: string }, bottomR = r, topR = r): Seg[] {
  const segs: Seg[] = [];
  segs.push({ run: runs.top, pts: line(P(topR, 0), P(w - topR, 0)) });
  if (topR > 0) segs.push({ run: runs.side, pts: arcPts(w - topR, topR, topR, -Math.PI / 2, 0) });
  segs.push({ run: runs.side, pts: line(P(w, topR), P(w, h - bottomR)) });
  if (bottomR > 0) segs.push({ run: runs.bottom, pts: arcPts(w - bottomR, h - bottomR, bottomR, 0, Math.PI / 2) });
  segs.push({ run: runs.bottom, pts: line(P(w - bottomR, h), P(bottomR, h)) });
  if (bottomR > 0) segs.push({ run: runs.bottom, pts: arcPts(bottomR, h - bottomR, bottomR, Math.PI / 2, Math.PI) });
  segs.push({ run: runs.side, pts: line(P(0, h - bottomR), P(0, topR)) });
  if (topR > 0) segs.push({ run: runs.side, pts: arcPts(topR, topR, topR, Math.PI, Math.PI * 1.5) });
  return segs;
}
const segPiece = (id: string, name: string, segs: Seg[], sa: number, qty: number, fabric: FabricRole = 'principal', extra: { hems?: Record<string, number>; felt?: boolean; fold?: boolean; labels?: Record<string, string> } = {}) => {
  const t = tagged(segs);
  return polyRuns(id, name, t.pts, a => t.runOf(a), { k: 1, sa: extra.felt ? 0 : sa, felt: !!extra.felt }, { qty, fabric, hems: extra.hems, labels: extra.labels, fold: extra.fold ? 'doblez' : undefined, onFold: extra.fold }, q => t.keep(q) || (!!extra.fold && near(q.x, 0)));
};
const rect4 = (id: string, name: string, w: number, h: number, e: [string, string, string, string], sa: number | [number, number, number, number], qty: number, fabric: FabricRole = 'principal', labels: [string, string, string, string] = ['Borde', 'Borde', 'Borde', 'Borde']) => {
  const s = Array.isArray(sa) ? sa : [sa, sa, sa, sa];
  return rectangle(id, name, w, h, e.map((x, i) => edge(x, labels[i], s[i] > 0 ? 'costura' : 'sin-margen', s[i])) as [EdgeDef, EdgeDef, EdgeDef, EdgeDef], { qty, fabric });
};
/** Strap folded in four lengthwise: cut 4 × the finished width. */
function strap(id: string, name: string, finished: number, length: number, sa: number, qty: number, fabric: FabricRole = 'principal'): Piece {
  const w = 4 * finished, pc = rect4(id, name, w, length, ['extremo', 'canto', 'extremo-b', 'canto-b'], [sa, 0, sa, 0], qty, fabric, ['Extremo', 'Canto doblado', 'Extremo', 'Canto doblado']);
  [0.25, 0.5, 0.75].forEach((f, i) => pc.lines.push({ id: `doblez-${i}`, kind: 'doblez', a: P(w * f, 0), b: P(w * f, length), label: i === 1 ? 'Doblar en cuatro' : undefined }));
  pc.notes = ['Plancha los cantos al centro, dobla por la mitad y pespuntea los dos cantos.'];
  return pc;
}
const place = (pc: Piece, id: string, poly: Pt[], label: string, closed = true) => {
  const pts = closed ? [...poly, poly[0]] : poly;
  pts.slice(1).forEach((q, i) => pc.lines.push({ id: `${id}-${i}`, kind: 'colocacion', a: pts[i], b: q, label: i ? undefined : label }));
};
const stitch = (pc: Piece, id: string, poly: Pt[], label: string, closed = false) => {
  const pts = closed ? [...poly, poly[0]] : poly;
  pts.slice(1).forEach((q, i) => pc.lines.push({ id: `${id}-${i}`, kind: 'pespunte', a: pts[i], b: q, label: i ? undefined : label }));
};
const box = (x0: number, y0: number, x1: number, y1: number) => [P(x0, y0), P(x1, y0), P(x1, y1), P(x0, y1)];
const lined = (pc: Piece) => { pc.notes = ['Cose tela y forro derecho con derecho dejando 5 cm para voltear; voltea, plancha y pespuntea la boca.']; return pc; };
const XP = (name: string): Issue => ({ level: 'aviso', code: 'bolso-experimental', message: `${name} experimental: imprime al 100 %, comprueba el cuadrado de 5 cm y cose una muestra antes de cortar la tela buena.` });
const quiltChannels = (outline: Pt[], step: number, inset: number, vertical = true) => {
  const xs = outline.map(q => q.x), ys = outline.map(q => q.y), raw: Pt[][] = [];
  if (vertical) for (let x = Math.min(...xs) + step; x < Math.max(...xs) - step / 3; x += step) raw.push([P(x, Math.min(...ys) - 10), P(x, Math.max(...ys) + 10)]);
  else for (let y = Math.min(...ys) + step; y < Math.max(...ys) - step / 3; y += step) raw.push([P(Math.min(...xs) - 10, y), P(Math.max(...xs) + 10, y)]);
  return clipLines(raw, outline, inset);
};

// ------------------------------------------------------------------ 1. Funda acolchada para portátil
const LAPTOPS: Record<string, [number, number, number]> = { '13': [305, 215, 15], '14': [322, 227, 18], '16': [360, 250, 20] };
function laptopSleeve(p: Params): GeneratorResult {
  const sa = num(p, 'margen'), size = str(p, 'tamano'), [dw, dh, dt] = LAPTOPS[size] ?? LAPTOPS['14'];
  const lw = size === 'medida' ? num(p, 'anchoPortatil') : dw, lh = size === 'medida' ? num(p, 'altoPortatil') : dh, lt = size === 'medida' ? num(p, 'grosor') : dt;
  const pad = 6, ease = 8, W = lw + 2 * (ease + pad), H = lh + 2 * (ease + pad), g = lt + 2 * pad + 12, r = Math.min(40, 0.16 * H);
  const Lb = W - 2 * r + Math.PI * r, Pm = 2 * (W + H) - 8 * r + TAU * r, Lz = Pm - Lb;
  const runs = { top: 'cremallera', side: 'cremallera', bottom: 'base' }, segs = roundRectSegs(W, H, r, runs);
  const outer = segPiece('cuerpo', 'Cuerpo exterior (delantero y trasero)', segs, sa, 2), lining = segPiece('cuerpo-forro', 'Cuerpo de forro', segs, sa, 2, 'forro');
  const fleece = segPiece('guata', 'Guata termoadhesiva (sin margen)', segs, 0, 2, 'entretela', { felt: true });
  const outline = tagged(segs).pts;
  const quilt = str(p, 'acolchado') === 'rombos'
    ? clipLines(Array.from({ length: 40 }, (_, i) => [P(-W + i * 45, -10), P(i * 45, H + W)]).concat(Array.from({ length: 40 }, (_, i) => [P(i * 45, -10), P(i * 45 - W - H, H + W)])), outline, 12)
    : str(p, 'acolchado') === 'no' ? [] : quiltChannels(outline, 30, 12);
  quilt.forEach((l, j) => l.slice(1).forEach((q, i) => outer.lines.push({ id: `acolchado-${j}-${i}`, kind: 'pespunte', a: l[i], b: q, label: i || j ? undefined : 'Acolchado (atraviesa la guata)' })));
  const pieces: Piece[] = [outer, lining, fleece];
  const zip = rect4('cremallera-panel', 'Panel de cremallera (2 de tela y 2 de forro)', Lz, g / 2 - 5, ['canto-cuerpo', 'extremo', 'canto-cierre', 'extremo-b'], [sa, sa, 10, sa], 4, 'principal', ['Se cose al cuerpo', 'Extremo: une con el fuelle de la base', 'Se cose a la cremallera', 'Extremo: une con el fuelle de la base']);
  const base = rect4('fuelle-base', 'Fuelle de la base (1 de tela y 1 de forro)', Lb, g, ['canto-delantero', 'extremo', 'canto-trasero', 'extremo-b'], sa, 2, 'principal', ['Se cose al delantero', 'Extremo: une con el panel de cremallera', 'Se cose al trasero', 'Extremo: une con el panel de cremallera']);
  const tab = rect4('lengueta', 'Lengüeta de los extremos de la cremallera', 40, 90, ['extremo', 'canto', 'extremo-b', 'canto-b'], sa, 2, 'principal');
  pieces.push(zip, base, tab);
  const ext = str(p, 'bolsilloExterior') !== 'no', int = str(p, 'bolsilloInterior') !== 'no';
  if (ext) {
    const pw = 0.56 * W, ph = 0.5 * H, x0 = (W - pw) / 2, y0 = 0.14 * H;
    pieces.push(lined(rect4('bolsillo-exterior', 'Bolsillo exterior (1 de tela de contraste y 1 de forro)', pw, ph, ['boca', 'lado', 'fondo', 'lado-b'], sa, 2, 'contraste')));
    place(outer, 'bolsillo-exterior', box(x0, y0, x0 + pw, y0 + ph), 'Bolsillo exterior: colocación (solo delantero)');
  }
  if (int) {
    const pw = 0.72 * W, ph = 0.42 * H, x0 = (W - pw) / 2, y0 = H - ph - 0.12 * H;
    const pk = lined(rect4('bolsillo-interior', 'Bolsillo interior con divisiones (2 de forro)', pw, ph, ['boca', 'lado', 'fondo', 'lado-b'], sa, 2, 'forro'));
    pieces.push(pk);
    place(lining, 'bolsillo-interior', box(x0, y0, x0 + pw, y0 + ph), 'Bolsillo interior: colocación');
    [0.32, 0.5, 0.62].forEach((f, i) => lining.lines.push({ id: `division-${i}`, kind: 'pespunte', a: P(x0 + pw * f, y0), b: P(x0 + pw * f, y0 + ph), label: i ? undefined : 'Divisiones (bolígrafos y tarjetas)' }));
  }
  for (const pc of [outer, lining]) { notchAt(pc, 'cremallera', 0, 'Empieza la cremallera', 'cremallera-a'); notchAt(pc, 'cremallera', len(pc, 'cremallera'), 'Termina la cremallera', 'cremallera-b'); }
  const seams: SeamRelation[] = [
    equal('cierre', 'Panel de cremallera con el contorno', [{ pieceId: zip.id, edgeIds: ['canto-cuerpo'] }], [{ pieceId: outer.id, edgeIds: runIds(outer, 'cremallera') }], 1),
    equal('base', 'Fuelle de la base con el contorno', [{ pieceId: base.id, edgeIds: ['canto-delantero'] }], [{ pieceId: outer.id, edgeIds: runIds(outer, 'base') }], 1)
  ];
  return {
    pieces, seams, notices: [XP('Funda acolchada'), { level: 'ok', code: 'funda-portatil', message: `Hueco interior de ${cm(lw + 2 * ease)} × ${cm(lh + 2 * ease)} × ${cm(lt + 12)} para un portátil de ${cm(lw)} × ${cm(lh)} × ${cm(lt)}. Mide el tuyo: los modelos del mismo tamaño varían.` }],
    checks: [{ key: 'anchoPortatil', label: 'Ancho interior', target: lw + 2 * ease, measured: W - 2 * pad, tolerance: 1 }, { key: 'cremallera', label: 'Cremallera en tres lados', target: Lz, measured: len(zip, 'canto-cuerpo'), tolerance: 1 }],
    materials: [{ id: 'cremallera', label: 'Cremallera continua de nailon n.º 5 con dos cursores', qty: cm(Math.ceil((Lz + 60) / 50) * 50) }, { id: 'guata', label: 'Guata termoadhesiva o espuma de 5 mm', qty: `${cm(W + 60)} × ${cm(2 * H + Lz / 2)}` }, { id: 'bies', label: 'Bies de 2,5 cm para rematar las costuras interiores', qty: cm(Math.ceil((2 * Pm + 400) / 100) * 100) }, { id: 'hilo', label: 'Hilo resistente', qty: '1' }],
    assumptions: [`Funda terminada de ${cm(W)} × ${cm(H)} y ${cm(g)} de fuelle, con 8 mm de holgura por lado y 6 mm de acolchado.`, 'La cremallera rodea arriba y los dos costados; la base es un fuelle sin cremallera.'],
    steps: [
      { id: 'guata', title: 'Guata y acolchado', detail: 'Plancha la guata en el revés de los cuerpos exteriores y pespuntea las líneas de acolchado.', pieces: ['cuerpo', 'guata'] },
      ...(ext ? [{ id: 'bolsillo-exterior', title: 'Bolsillo exterior', detail: 'Forra el bolsillo, voltéalo, pespuntea la boca y cóselo al delantero en sus líneas.', pieces: ['bolsillo-exterior', 'cuerpo'] }] : []),
      ...(int ? [{ id: 'bolsillo-interior', title: 'Bolsillo interior', detail: 'Forra el bolsillo y cóselo al forro con las divisiones.', pieces: ['bolsillo-interior', 'cuerpo-forro'] }] : []),
      { id: 'cremallera', title: 'Panel de cremallera', detail: 'Cose cada mitad del panel (tela y forro) a un lado de la cremallera, pespuntea y une los extremos con el fuelle de la base, con las lengüetas en las puntas.', pieces: ['cremallera-panel', 'fuelle-base', 'lengueta'], seams: ['cierre', 'base'] },
      { id: 'montar', title: 'Monta la funda', detail: 'Con la cremallera abierta, cose el anillo de fuelle al delantero y al trasero casando los piquetes. Remata las costuras interiores con bies y voltea.', pieces: ['cuerpo', 'cuerpo-forro', 'cremallera-panel', 'fuelle-base'], seams: ['cierre', 'base'] }
    ]
  };
}

// ------------------------------------------------------------------ 2. Bolsa en U con fuelle y bolsillo bordado
function uTote(p: Params): GeneratorResult {
  const sa = num(p, 'margen'), W = num(p, 'ancho'), H = num(p, 'alto'), D = num(p, 'fondo'), handle = num(p, 'largoAsa'), hw = num(p, 'anchoAsa'), r = 0.4 * W;
  const segs: Seg[] = [{ run: 'boca', pts: line(P(0, 0), P(W, 0)) }, { run: 'contorno', pts: line(P(W, 0), P(W, H - r)) }, { run: 'contorno', pts: arcPts(W - r, H - r, r, 0, Math.PI / 2, 16) }, { run: 'contorno', pts: line(P(W - r, H), P(r, H)) }, { run: 'contorno', pts: arcPts(r, H - r, r, Math.PI / 2, Math.PI, 16) }, { run: 'contorno', pts: line(P(0, H - r), P(0, 0)) }];
  const outer = segPiece('cuerpo', 'Cuerpo (delantero y trasero)', segs, sa, 2), lining = segPiece('cuerpo-forro', 'Cuerpo de forro', segs, sa, 2, 'forro');
  const pieces: Piece[] = [outer, lining], seams: SeamRelation[] = [], U = len(outer, 'contorno');
  if (D > 0) {
    for (const [id, name, fabric] of [['fuelle', 'Fuelle de costados y base', 'principal'], ['fuelle-forro', 'Fuelle de forro', 'forro']] as const) {
      const pc = rect4(id, name, D, U, ['boca', 'canto', 'boca-b', 'canto-b'], sa, 1, fabric, ['Boca', 'Se cose al delantero', 'Boca', 'Se cose al trasero']);
      notchAt(pc, 'canto', U / 2, 'Centro de la base', 'centro'); pieces.push(pc);
    }
    seams.push(equal('fuelle', 'Fuelle con el contorno del cuerpo', [{ pieceId: 'fuelle', edgeIds: ['canto'] }], [{ pieceId: outer.id, edgeIds: runIds(outer, 'contorno') }], 1));
    pieces.push(rect4('refuerzo-base', 'Refuerzo de la base (entretela gruesa, sin margen)', D - 4, W - 2 * r + 0.8 * Math.PI * r, ['a', 'b', 'c', 'd'], 0, 1, 'entretela'));
    notchAt(outer, 'contorno', U / 2, 'Centro de la base', 'centro');
  }
  const pw = 0.44 * W, ph = 0.44 * W, pr = 0.3 * pw, x0 = (W - pw) / 2, y0 = 0.3 * H;
  const pocket = segPiece('bolsillo', 'Bolsillo con bordado (1 de tela y 1 de forro)', roundRectSegs(pw, ph, pr, { top: 'boca', side: 'contorno', bottom: 'contorno' }, pr, 0), sa, 2, 'principal');
  lined(pocket);
  // Embroidery guide: three lavender-like sprigs (own design).
  [[-0.14, -8], [0, 0], [0.14, 8]].forEach(([dx, deg], i) => {
    const bx = pw / 2 + dx * pw, by = ph * 0.86, top = ph * 0.3, a = (deg * Math.PI) / 180, tip = P(bx + Math.sin(a) * (by - top), top);
    stitch(pocket, `tallo-${i}`, [P(bx, by), tip], i ? '' : 'Bordado: tallos (punto atrás) y flores (punto de cadeneta)');
    for (let k = 0; k < 5; k++) { const t = 0.08 + k * 0.09, c = P(bx + (tip.x - bx) * (1 - t), by + (tip.y - by) * (1 - t)); stitch(pocket, `flor-${i}-${k}`, [P(c.x - 6, c.y + 3), P(c.x, c.y - 5), P(c.x + 6, c.y + 3)], ''); }
  });
  place(outer, 'bolsillo', tagged(roundRectSegs(pw, ph, pr, { top: 'boca', side: 'c', bottom: 'c' }, pr, 0)).pts.map(q => P(q.x + x0, q.y + y0)), 'Bolsillo: colocación (solo delantero)');
  const strapPc = strap('asa', 'Asa (doblada en cuatro)', hw, handle + 2 * 40, sa, 2);
  for (const x of [W / 2 - 0.2 * W, W / 2 + 0.2 * W]) place(outer, `asa-${Math.round(x)}`, box(x - hw / 2, 0, x + hw / 2, 40), 'Asa: colocación');
  pieces.push(pocket, strapPc);
  seams.push(equal('boca-forro', 'Boca: cuerpo con forro', [{ pieceId: outer.id, edgeIds: runIds(outer, 'boca') }], [{ pieceId: lining.id, edgeIds: runIds(lining, 'boca') }], 0.5));
  return {
    pieces, seams, notices: [XP('Bolsa en U')],
    checks: [{ key: 'ancho', label: 'Ancho de la boca', target: W, measured: len(outer, 'boca'), tolerance: 1 }],
    materials: [{ id: 'tela', label: 'Lona, loneta o lino grueso', qty: `${cm(2 * W + 3 * D + 100)} × ${cm(H + 100)}` }, { id: 'forro', label: 'Algodón para el forro', qty: `${cm(2 * W + D + 80)} × ${cm(H + 60)}` }, { id: 'bordado', label: 'Hilo de bordar lila, malva y verde', qty: '3 madejas' }, { id: 'entretela', label: 'Entretela gruesa para la base', qty: 'Retal' }],
    assumptions: [`Bolsa terminada de ${cm(W)} de ancho, ${cm(H)} de alto y ${cm(D)} de fondo; asas de ${cm(handle)} libres.`, 'El fondo en U es un arco de radio 0,4 × ancho: el fuelle lo sigue sin pliegues.'],
    steps: [
      { id: 'bordado', title: 'Borda el bolsillo', detail: 'Calca los tallos y las flores del patrón y bórdalos antes de forrar el bolsillo.', pieces: ['bolsillo'] },
      { id: 'bolsillo', title: 'Cose el bolsillo', detail: 'Forra el bolsillo, voltéalo y cóselo al delantero en sus líneas.', pieces: ['bolsillo', 'cuerpo'] },
      ...(D > 0 ? [{ id: 'fuelle', title: 'Fuelle', detail: 'Pega el refuerzo en el centro del fuelle. Cose el fuelle al delantero y al trasero casando el piquete del centro de la base; repite con el forro.', pieces: ['fuelle', 'cuerpo', 'refuerzo-base'], seams: ['fuelle'] }] : [{ id: 'cuerpo', title: 'Cuerpo', detail: 'Cose delantero y trasero por el contorno; repite con el forro.', pieces: ['cuerpo'] }]),
      { id: 'asas', title: 'Asas y boca', detail: 'Prepara las asas e hilvánalas en sus marcas. Mete el exterior en el forro derecho con derecho, cose la boca, voltea por una abertura del forro y pespuntea.', pieces: ['asa', 'cuerpo', 'cuerpo-forro'], seams: ['boca-forro'] }
    ]
  };
}

// ------------------------------------------------------------------ 3. Bolsa con asas laterales de una pieza
function earBag(p: Params): GeneratorResult {
  const sa = num(p, 'margen'), B = num(p, 'ancho'), D = num(p, 'fondo'), Hs = num(p, 'altoCostado'), Ht = num(p, 'altoTotal'), ws = num(p, 'anchoAsa');
  const f = 0.12 * B, Dt = 0.75 * D, ym = Ht - 0.7 * Hs, S = P(B / 2 + f, Ht - Hs), xo = S.x - 8, xi = xo - ws;
  // The mouth is one symmetric curve, so its bottom is round (no kink at the centre).
  const Rb = Math.min(0.8 * xi, Math.max(45, 0.55 * xi)), a0 = (155 * Math.PI) / 180, a1 = (25 * Math.PI) / 180, A0 = P(Rb * Math.cos(a0), ym - Rb + Rb * Math.sin(a0)), A1 = P(Rb * Math.cos(a1), ym - Rb + Rb * Math.sin(a1));
  const mouth = [...curve([P(-xi, 0), P(-0.97 * xi, 0.45 * ym), A0]).slice(0, -1), ...arcPts(0, ym - Rb, Rb, a0, a1, 16).slice(0, -1), ...curve([A1, P(0.97 * xi, 0.45 * ym), P(xi, 0)])];
  const right: Seg[] = [
    { run: 'boca', pts: mouth.filter(q => q.x >= 0) },
    { run: 'punta', pts: line(P(xi, 0), P(xo, 0)) },
    { run: 'asa', pts: curve([P(xo, 0), P(xo + 0.08 * B, 0.45 * (Ht - Hs)), S]) },
    { run: 'lateral', pts: line(S, P(B / 2, Ht)) },
    { run: 'base', pts: line(P(B / 2, Ht), P(0, Ht)) }
  ];
  const left = mirrorSegs(right).map(s => ({ ...s, run: s.run === 'lateral' ? 'lateral-b' : s.run === 'asa' ? 'asa-b' : s.run === 'punta' ? 'punta-b' : s.run }));
  // Start the outline at the left tip so each run is one continuous stretch.
  const order = [...right.slice(1), ...left.slice(0, 4), { run: 'boca', pts: mouth }];
  const panel = segPiece('cuerpo', 'Cuerpo con asa (delantero y trasero)', order, sa, 2), lining = segPiece('cuerpo-forro', 'Cuerpo de forro', order, sa, 2, 'forro');
  const Ls = Math.hypot(f, Hs), hside = Math.sqrt(Math.max(1, Ls * Ls - ((D - Dt) / 2) ** 2));
  const sideSegs: Seg[] = [{ run: 'boca', pts: line(P(-Dt / 2, 0), P(Dt / 2, 0)) }, { run: 'lado', pts: line(P(Dt / 2, 0), P(D / 2, hside)) }, { run: 'base', pts: line(P(D / 2, hside), P(-D / 2, hside)) }, { run: 'lado-b', pts: line(P(-D / 2, hside), P(-Dt / 2, 0)) }];
  const side = segPiece('costado', 'Costado (2 de tela y 2 de forro)', sideSegs, sa, 4);
  const base = rect4('base', 'Base (1 de tela, 1 de forro y 1 de entretela gruesa)', B, D, ['largo', 'ancho', 'largo-b', 'ancho-b'], sa, 2);
  const seams = [
    equal('costado', 'Costado del cuerpo con el costado', [{ pieceId: panel.id, edgeIds: runIds(panel, 'lateral') }], [{ pieceId: side.id, edgeIds: runIds(side, 'lado') }], 0.8),
    equal('base-cuerpo', 'Base del cuerpo con la base', [{ pieceId: panel.id, edgeIds: runIds(panel, 'base') }], [{ pieceId: base.id, edgeIds: ['largo'] }], 0.8),
    equal('base-costado', 'Base del costado con la base', [{ pieceId: side.id, edgeIds: runIds(side, 'base') }], [{ pieceId: base.id, edgeIds: ['ancho'] }], 0.8)
  ];
  notchAt(panel, 'asa', 0, 'Empieza el asa', 'asa-inicio');
  return {
    pieces: [panel, lining, side, base], seams, notices: [XP('Bolsa con asas laterales')],
    checks: [{ key: 'altoTotal', label: 'Alto con el asa', target: Ht, measured: Ht, tolerance: 1 }, { key: 'altoCostado', label: 'Costado', target: Ls, measured: len(side, 'lado'), tolerance: 1 }],
    materials: [{ id: 'tela', label: 'Lona, gamuza sintética o pana', qty: `${cm(2 * (B + 2 * f) + 2 * D + 100)} × ${cm(Ht + 60)}` }, { id: 'forro', label: 'Forro', qty: 'La misma cantidad' }, { id: 'entretela', label: 'Entretela gruesa para la base', qty: `${cm(B)} × ${cm(D)}` }],
    assumptions: [`Base de ${cm(B)} × ${cm(D)}, costados de ${cm(hside)} y asas que suben hasta ${cm(Ht)}.`, 'Como en una bolsa de compra: la punta del asa delantera se une con la de la trasera de su mismo lado, sobre cada costado.'],
    steps: [
      { id: 'caja', title: 'Monta la caja', detail: 'Cose los costados al delantero y al trasero hasta el piquete del asa, y la base alrededor. Repite con el forro.', pieces: ['cuerpo', 'costado', 'base'], seams: ['costado', 'base-cuerpo', 'base-costado'] },
      { id: 'forro', title: 'Une exterior y forro', detail: 'Mete el exterior en el forro derecho con derecho y cose toda la boca y los cantos de las asas, dejando las puntas abiertas. Voltea por una abertura del forro.', pieces: ['cuerpo', 'cuerpo-forro'] },
      { id: 'puntas', title: 'Cierra las asas', detail: 'Une cada punta delantera con la trasera de su lado (exterior con exterior y forro con forro), mete los márgenes y pespuntea todo el borde.', pieces: ['cuerpo'] }
    ]
  };
}

// ------------------------------------------------------------------ 4. Bolsa estrella con asa calada
function starBag(p: Params): GeneratorResult {
  const sa = num(p, 'margen'), W = num(p, 'ancho'), fold = str(p, 'corte') === 'doblez';
  const R = W / (2 * Math.sin((72 * Math.PI) / 180)), ri = 0.6 * R, raw: Pt[] = [];
  for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + (i * Math.PI) / 5, rr = i % 2 ? ri : R; raw.push(P(rr * Math.cos(a), rr * Math.sin(a))); }
  const rounded = smooth([biggest(offsetPolygons(offsetPolygons([raw], -0.08 * R), 0.08 * R))], bendFor(sa) + 0.06 * R);
  const valley = P(ri * Math.cos(-0.3 * Math.PI), ri * Math.sin(-0.3 * Math.PI));
  const isMouth = (q: Pt) => q.y <= valley.y + 2 && Math.abs(q.x) <= Math.abs(valley.x) + 2;
  const outline = fold ? half(rounded) : rounded;
  const runOf = (a: Pt, b: Pt) => (fold && near(a.x, 0) && near(b.x, 0) ? 'doblez' : isMouth(a) && isMouth(b) ? 'boca' : 'contorno');
  const body = polyRuns('cuerpo', `Cuerpo estrella${fold ? ' (al doblez)' : ''}: 2 de tela exterior`, outline, runOf, { k: 1, sa, felt: false }, { qty: 2, fold: fold ? 'doblez' : undefined, onFold: fold }, q => fold && near(q.x, 0));
  const lining = polyRuns('cuerpo-forro', `Cuerpo estrella de forro${fold ? ' (al doblez)' : ''}`, outline, runOf, { k: 1, sa, felt: false }, { qty: 2, fabric: 'forro', fold: fold ? 'doblez' : undefined, onFold: fold }, q => fold && near(q.x, 0));
  // Cut-out handle in the top point.
  const hc = P(0, -0.6 * R), rx = 0.17 * R, ry = 0.22 * R, hole = Array.from({ length: 48 }, (_, i) => P(hc.x + rx * Math.cos((i * TAU) / 48), hc.y + ry * Math.sin((i * TAU) / 48)));
  const cut = biggest(offsetPolygons([hole], -sa));
  for (const pc of [body, lining]) {
    const h = fold ? hole.filter(q => q.x >= 0) : hole, c = fold ? cut.filter(q => q.x >= 0) : cut;
    stitch(pc, 'asa-costura', h, 'Costura del asa', !fold);
    pc.lines.push(...(fold ? c : [...c, c[0]]).slice(1).map((q, i, arr) => ({ id: `asa-corte-${i}`, kind: 'referencia' as const, a: i ? arr[i - 1] : c[0], b: q, label: i ? undefined : 'Corta el hueco del asa por aquí' })));
    notchAt(pc, 'boca', 0, 'Boca: de aquí a la punta no se cose con la otra cara', 'boca-a');
  }
  const reinf = biggest(offsetPolygons([rounded.filter(q => q.y <= valley.y + 30)], 0));
  const facing = polyRuns('refuerzo-asa', 'Refuerzo de la punta del asa (entretela, sin margen)', reinf.length > 2 ? reinf : rounded, () => 'borde', { k: 1, sa: 0, felt: true }, { qty: 4, fabric: 'entretela' });
  const pw = 0.42 * W, ph = 0.36 * W, pocketSegs: Seg[] = [{ run: 'boca', pts: curve([P(-pw / 2, 0), P(0, 0.08 * ph), P(pw / 2, 0)]) }, { run: 'contorno', pts: line(P(pw / 2, 0), P(pw / 2, 0.55 * ph)) }, { run: 'contorno', pts: line(P(pw / 2, 0.55 * ph), P(0, ph)) }, { run: 'contorno', pts: line(P(0, ph), P(-pw / 2, 0.55 * ph)) }, { run: 'contorno', pts: line(P(-pw / 2, 0.55 * ph), P(-pw / 2, 0)) }];
  const pocket = lined(segPiece('bolsillo', 'Bolsillo exterior (1 de estampado y 1 de forro)', pocketSegs, Math.min(sa, 10), 2, 'contraste'));
  const pPoly = tagged(pocketSegs).pts.map(q => P(q.x, q.y + 0.02 * R));
  place(body, 'bolsillo', fold ? pPoly.filter(q => q.x >= 0) : pPoly, 'Bolsillo: colocación (solo delantero)', !fold);
  return {
    pieces: [body, lining, facing, pocket], seams: [equal('boca-forro', 'Boca: exterior con forro', [{ pieceId: body.id, edgeIds: runIds(body, 'boca') }], [{ pieceId: lining.id, edgeIds: runIds(lining, 'boca') }], 0.5)],
    notices: [XP('Bolsa estrella'), { level: 'ok', code: 'estrella', message: 'Cada cara lleva su asa calada: la boca va de un entrante a otro por la punta de arriba, y el resto de la estrella se cose.' }],
    checks: [{ key: 'ancho', label: 'Ancho de punta a punta', target: W, measured: Math.max(...rounded.map(q => q.x)) - Math.min(...rounded.map(q => q.x)), tolerance: 0.06 * W }],
    materials: [{ id: 'tela', label: 'Lona o loneta', qty: `${cm(2 * W + 80)} × ${cm(W + 60)}` }, { id: 'forro', label: 'Algodón estampado para el forro', qty: 'La misma cantidad' }, { id: 'entretela', label: 'Entretela termoadhesiva media', qty: `${cm(W)} × ${cm(0.6 * W)}` }],
    assumptions: [`Estrella de ${cm(W)} de punta a punta con puntas y entrantes redondeados para poder voltear.`, 'El hueco del asa se marca en la pieza: se corta después de coserlo.'],
    steps: [
      { id: 'refuerzo', title: 'Refuerza y bolsillo', detail: 'Plancha el refuerzo en la punta de arriba de las cuatro piezas. Forra el bolsillo y cóselo al delantero.', pieces: ['refuerzo-asa', 'bolsillo', 'cuerpo'] },
      { id: 'asa', title: 'Asa calada', detail: 'Pon cada cara exterior sobre su forro derecho con derecho, cose la costura del asa y la boca, corta el hueco, da piquetes y voltea por el hueco.', pieces: ['cuerpo', 'cuerpo-forro'], seams: ['boca-forro'] },
      { id: 'cerrar', title: 'Cierra la estrella', detail: 'Une delantero y trasero por todo el contorno menos la boca (exterior con exterior y forro con forro), deja una abertura en el forro, voltea y ciérrala.', pieces: ['cuerpo', 'cuerpo-forro'] }
    ]
  };
}
/** Right half (x ≥ 0) of a symmetric outline, cut exactly at the axis. */
function half(poly: Pt[]): Pt[] {
  const out: Pt[] = [];
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i], b = poly[(i + 1) % poly.length];
    if (a.x >= 0) out.push(a);
    if ((a.x >= 0) !== (b.x >= 0)) { const t = a.x / (a.x - b.x); out.push(P(0, a.y + (b.y - a.y) * t)); }
  }
  return out;
}

// ------------------------------------------------------------------ 5. Tote de caja con bolsillos alrededor
function pocketTote(p: Params): GeneratorResult {
  const sa = num(p, 'margen'), W = num(p, 'ancho'), H = num(p, 'alto'), D = num(p, 'fondo'), hp = num(p, 'altoBolsillo'), free = num(p, 'largoAsa'), web = 30;
  const front = rect4('cuerpo', 'Delantero y espalda', W, H, ['boca', 'lado', 'fondo', 'lado-b'], sa, 2, 'principal', ['Boca', 'Costado', 'Base', 'Costado']);
  const side = rect4('costado', 'Costado', D, H, ['boca', 'lado', 'fondo', 'lado-b'], sa, 2, 'principal', ['Boca', 'Costado', 'Base', 'Costado']);
  const base = rect4('base', 'Base', W, D, ['largo', 'ancho', 'largo-b', 'ancho-b'], sa, 1);
  const lf = rect4('cuerpo-forro', 'Delantero y espalda de forro', W, H, ['boca', 'lado', 'fondo', 'lado-b'], sa, 2, 'forro'), ls = rect4('costado-forro', 'Costado de forro', D, H, ['boca', 'lado', 'fondo', 'lado-b'], sa, 2, 'forro'), lb = rect4('base-forro', 'Base de forro', W, D, ['largo', 'ancho', 'largo-b', 'ancho-b'], sa, 1, 'forro');
  const pf = rect4('bolsillo-frente', 'Bolsillo delantero y trasero (doblado: el doblez es la boca)', W, 2 * hp, ['fondo', 'lado', 'fondo-b', 'lado-b'], sa, 2, 'contraste');
  pf.lines.push({ id: 'boca', kind: 'doblez', a: P(0, hp), b: P(W, hp), label: 'Doblez: boca del bolsillo' });
  const ps = rect4('bolsillo-costado', 'Bolsillo de costado (doblado)', D, 2 * hp, ['fondo', 'lado', 'fondo-b', 'lado-b'], sa, 2, 'contraste');
  ps.lines.push({ id: 'boca', kind: 'doblez', a: P(0, hp), b: P(D, hp), label: 'Doblez: boca del bolsillo' });
  const xs = [W / 2 - 0.25 * W, W / 2 + 0.25 * W], webLen = 2 * (H - 20) + free;
  for (const x of xs) place(front, `asa-${Math.round(x)}`, box(x - web / 2, 20, x + web / 2, H), 'Cinta del asa: colocación (pespunte en X arriba)');
  place(front, 'bolsillo', box(0, H - hp, W, H), 'Bolsillo: boca');
  place(side, 'bolsillo', box(0, H - hp, D, H), 'Bolsillo: boca');
  const seams = [
    equal('costado', 'Costado con el cuerpo', [{ pieceId: side.id, edgeIds: ['lado'] }], [{ pieceId: front.id, edgeIds: ['lado'] }], 0.5),
    equal('base-largo', 'Base con el cuerpo', [{ pieceId: base.id, edgeIds: ['largo'] }], [{ pieceId: front.id, edgeIds: ['fondo'] }], 0.5),
    equal('base-ancho', 'Base con el costado', [{ pieceId: base.id, edgeIds: ['ancho'] }], [{ pieceId: side.id, edgeIds: ['fondo'] }], 0.5)
  ];
  return {
    pieces: [front, side, base, lf, ls, lb, pf, ps], seams, notices: [XP('Tote con bolsillos')],
    checks: [{ key: 'ancho', label: 'Ancho', target: W, measured: W, tolerance: 0.5 }, { key: 'altoBolsillo', label: 'Bolsillos', target: hp, measured: hp, tolerance: 0.5 }],
    materials: [{ id: 'cinta', label: `Cinta de asa (reata) de ${cm(web)}`, qty: `2 × ${cm(webLen)}` }, { id: 'tela', label: 'Fieltro grueso, lona o loneta', qty: `${cm(2 * W + 2 * D + 80)} × ${cm(H + 80)}` }, { id: 'forro', label: 'Forro', qty: `${cm(2 * W + 2 * D + 80)} × ${cm(H + 40)}` }, { id: 'bordado', label: 'Hilos de bordar para flores sueltas (opcional)', qty: 'Varios' }],
    assumptions: [`Bolsa de ${cm(W)} × ${cm(H)} × ${cm(D)} con bolsillos de ${cm(hp)} en las cuatro caras.`, 'Las cintas de las asas bajan por el delantero y la espalda y dividen el bolsillo en tres.'],
    steps: [
      { id: 'bordado', title: 'Borda (opcional)', detail: 'Borda las flores sueltas en el cuerpo y los bolsillos antes de montar.', pieces: ['cuerpo', 'bolsillo-frente'] },
      { id: 'bolsillos', title: 'Bolsillos', detail: 'Dobla cada bolsillo por su boca, hilvánalo sobre su pieza en el bajo y pon encima las cintas de las asas: pespuntéalas por los dos cantos hasta 2 cm de la boca y remata con una X.', pieces: ['bolsillo-frente', 'bolsillo-costado', 'cuerpo', 'costado'] },
      { id: 'caja', title: 'Monta la caja', detail: 'Une costados con delantero y espalda y cose la base alrededor. Repite con el forro dejando una abertura.', pieces: ['cuerpo', 'costado', 'base', 'cuerpo-forro', 'costado-forro', 'base-forro'], seams: ['costado', 'base-largo', 'base-ancho'] },
      { id: 'boca', title: 'Boca', detail: 'Une exterior y forro por la boca, voltea, cierra la abertura y pespuntea la boca.', pieces: ['cuerpo', 'cuerpo-forro'] }
    ]
  };
}

// ------------------------------------------------------------------ 6. Mochila de solapa con hebillas
function flapBackpack(p: Params): GeneratorResult {
  const sa = num(p, 'margen'), W = num(p, 'ancho'), H = num(p, 'alto'), D = num(p, 'fondo'), F = 0.6 * W, sw = 70, sl = num(p, 'largoTirante');
  const body = rect4('cuerpo', 'Delantero y espalda', W, H, ['boca', 'lado', 'fondo', 'lado-b'], sa, 2, 'principal', ['Boca (jareta)', 'Costado', 'Base', 'Costado']);
  const side = rect4('lateral', 'Lateral', D, H, ['boca', 'lado', 'fondo', 'lado-b'], sa, 2, 'principal', ['Boca (jareta)', 'Costado', 'Base', 'Costado']);
  const base = rect4('base', 'Base (tela y entretela gruesa)', W, D, ['largo', 'ancho', 'largo-b', 'ancho-b'], sa, 2);
  const flapSegs = roundRectSegs(W, F, 0.18 * W, { top: 'union', side: 'contorno', bottom: 'contorno' }, 0.18 * W, 0);
  const flap = lined(segPiece('solapa', 'Solapa (1 de tela y 1 de forro)', flapSegs, sa, 2));
  place(flap, 'hebilla', box(W / 2 - 15, F - 120, W / 2 + 15, F), 'Correa de la hebilla');
  const lb = rect4('cuerpo-forro', 'Delantero y espalda de forro', W, H, ['boca', 'lado', 'fondo', 'lado-b'], sa, 2, 'forro'), ll = rect4('lateral-forro', 'Lateral de forro', D, H, ['boca', 'lado', 'fondo', 'lado-b'], sa, 2, 'forro'), lbs = rect4('base-forro', 'Base de forro', W, D, ['largo', 'ancho', 'largo-b', 'ancho-b'], sa, 1, 'forro');
  const pw = 0.72 * W, ph = 0.36 * H, pd = 40;
  const pocket = rect4('bolsillo', 'Bolsillo delantero con fuelle (tela y forro)', pw + 2 * pd, ph + pd, ['boca', 'lado', 'fondo', 'lado-b'], sa, 2, 'principal');
  [pd, pw + pd].forEach((x, i) => pocket.lines.push({ id: `fuelle-${i}`, kind: 'doblez', a: P(x, 0), b: P(x, ph + pd), label: i ? undefined : 'Pliegue del fuelle' }));
  const pflap = lined(segPiece('solapa-bolsillo', 'Solapa del bolsillo (tela y forro)', roundRectSegs(pw + 10, 0.42 * ph, 25, { top: 'union', side: 'contorno', bottom: 'contorno' }, 25, 0), sa, 2));
  const sidePocket = rect4('bolsillo-lateral', 'Bolsillo lateral con fuelle (2 de tela)', D - 30 + 2 * 25, 0.42 * H, ['boca', 'lado', 'fondo', 'lado-b'], sa, 2);
  const sideFlap = lined(segPiece('solapa-lateral', 'Solapa del bolsillo lateral (2 de tela y 2 de forro)', roundRectSegs(D - 20, 0.16 * H, 20, { top: 'union', side: 'contorno', bottom: 'contorno' }, 20, 0), sa, 4));
  place(body, 'bolsillo', box((W - pw) / 2, H - ph - 40, (W + pw) / 2, H - 40), 'Bolsillo delantero: colocación');
  place(side, 'bolsillo', box(15, H - 0.42 * H - 30, D - 15, H - 30), 'Bolsillo lateral: colocación');
  const shoulder = rect4('tirante', 'Tirante acolchado (2 de tela y 1 de espuma por tirante)', sw + 2 * 0, sl, ['extremo', 'canto', 'extremo-b', 'canto-b'], sa, 4);
  const strapLow = strap('correa-regulable', 'Correa regulable de abajo (doblada en cuatro)', 25, 300, sa, 2);
  const handle = strap('asa', 'Asa de arriba (doblada en cuatro)', 25, 220, sa, 1);
  const buckle = strap('correa-hebilla', 'Correas de las hebillas (cortas y largas, dobladas en cuatro)', 25, 160, sa, 6);
  const channel = rect4('jareta', 'Jareta de la boca (con ojales para el cordón)', 2 * (W + D), 80, ['canto', 'extremo', 'canto-b', 'extremo-b'], sa, 1, 'forro');
  channel.lines.push({ id: 'doblez', kind: 'doblez', a: P(0, 40), b: P(2 * (W + D), 40), label: 'Doblar a la mitad' });
  for (let i = 0; i < 8; i++) channel.marks.push({ id: `ojal-${i}`, kind: 'ojal', at: P(((i + 0.5) * 2 * (W + D)) / 8, 20), label: i ? undefined : 'Ojal u ojete para el cordón' });
  const seams = [
    equal('lateral', 'Lateral con el cuerpo', [{ pieceId: side.id, edgeIds: ['lado'] }], [{ pieceId: body.id, edgeIds: ['lado'] }], 0.5),
    equal('base', 'Base con el cuerpo', [{ pieceId: base.id, edgeIds: ['largo'] }], [{ pieceId: body.id, edgeIds: ['fondo'] }], 0.5),
    equal('jareta', 'La jareta rodea la boca', [{ pieceId: channel.id, edgeIds: ['canto'] }], [{ pieceId: body.id, edgeIds: ['boca'], factor: 2 }, { pieceId: side.id, edgeIds: ['boca'], factor: 2 }], 1),
    equal('solapa', 'La solapa mide lo que la espalda', [{ pieceId: flap.id, edgeIds: runIds(flap, 'union') }], [{ pieceId: body.id, edgeIds: ['boca'] }], 0.5)
  ];
  return {
    pieces: [body, side, base, lb, ll, lbs, flap, pocket, pflap, sidePocket, sideFlap, shoulder, strapLow, handle, buckle, channel], seams, notices: [XP('Mochila de solapa')],
    checks: [{ key: 'alto', label: 'Alto del cuerpo', target: H, measured: H, tolerance: 0.5 }],
    materials: [{ id: 'hebillas', label: 'Hebillas de 25 mm (o cierres de imán ocultos bajo correas decorativas)', qty: '3' }, { id: 'regulador', label: 'Pasadores y anillas en D de 25 mm', qty: '2 + 2' }, { id: 'cordon', label: 'Cordón con tope', qty: cm(2 * (W + D) + 400) }, { id: 'espuma', label: 'Espuma de 5 mm para los tirantes', qty: `2 × ${cm(sw)} × ${cm(sl)}` }, { id: 'tela', label: 'Lona encerada o loneta gruesa', qty: `${cm(2 * W + 2 * D + 150)} × ${cm(H + 60)}` }],
    assumptions: [`Mochila de ${cm(W)} × ${cm(H)} × ${cm(D)} con solapa de ${cm(F)}, jareta y tirantes de ${cm(sl)}.`],
    steps: [
      { id: 'bolsillos', title: 'Bolsillos', detail: 'Cose los bolsillos con su fuelle doblado y sus solapas sobre el delantero y los laterales, con las correas de las hebillas.', pieces: ['bolsillo', 'solapa-bolsillo', 'bolsillo-lateral', 'solapa-lateral', 'correa-hebilla'] },
      { id: 'espalda', title: 'Espalda', detail: 'Cose los tirantes acolchados arriba de la espalda junto con el asa, y las correas regulables abajo con sus anillas.', pieces: ['cuerpo', 'tirante', 'asa', 'correa-regulable'] },
      { id: 'caja', title: 'Cuerpo', detail: 'Une laterales, delantero, espalda y base. Repite con el forro.', pieces: ['cuerpo', 'lateral', 'base', 'cuerpo-forro', 'lateral-forro', 'base-forro'], seams: ['lateral', 'base'] },
      { id: 'boca', title: 'Jareta y solapa', detail: 'Cose la solapa al canto de arriba de la espalda. Une exterior y forro por la boca atrapando la jareta, pasa el cordón por los ojales y pon el tope.', pieces: ['solapa', 'jareta'], seams: ['jareta', 'solapa'] }
    ]
  };
}

// ------------------------------------------------------------------ 7. Mochila osito infantil
function bearBackpack(p: Params): GeneratorResult {
  const sa = num(p, 'margen'), W = num(p, 'ancho'), H = num(p, 'alto'), D = num(p, 'fondo'), r = W / 2;
  const segs: Seg[] = [{ run: 'cremallera', pts: arcPts(r, r, r, Math.PI, TAU, 32) }, { run: 'cremallera', pts: line(P(W, r), P(W, r + 0.3 * (H - r))) }, { run: 'base', pts: line(P(W, r + 0.3 * (H - r)), P(W, H - 30)) }, { run: 'base', pts: arcPts(W - 30, H - 30, 30, 0, Math.PI / 2, 8) }, { run: 'base', pts: line(P(W - 30, H), P(30, H)) }, { run: 'base', pts: arcPts(30, H - 30, 30, Math.PI / 2, Math.PI, 8) }, { run: 'base', pts: line(P(0, H - 30), P(0, r + 0.3 * (H - r))) }, { run: 'cremallera', pts: line(P(0, r + 0.3 * (H - r)), P(0, r)) }];
  const front = segPiece('delantero', 'Delantero', segs, sa, 1), back = segPiece('espalda', 'Espalda', segs, sa, 1), lining = segPiece('cuerpo-forro', 'Delantero y espalda de forro', segs, sa, 2, 'forro');
  const Lz = len(front, 'cremallera'), Lb = len(front, 'base');
  const zip = rect4('banda-cremallera', 'Banda de cremallera (2 de tela y 2 de forro)', Lz, D / 2 - 5, ['canto-cuerpo', 'extremo', 'canto-cierre', 'extremo-b'], [sa, sa, 10, sa], 4, 'principal', ['Se cose al cuerpo', 'Extremo', 'Se cose a la cremallera', 'Extremo']);
  const band = rect4('banda-lateral', 'Banda de costados y base (1 de tela y 1 de forro)', Lb, D, ['canto-delantero', 'extremo', 'canto-trasero', 'extremo-b'], sa, 2, 'principal', ['Se cose al delantero', 'Extremo: une con la banda de cremallera', 'Se cose a la espalda', 'Extremo: une con la banda de cremallera']);
  const earSegs: Seg[] = [{ run: 'union', pts: line(P(-0.12 * W, 0), P(0.12 * W, 0)) }, { run: 'contorno', pts: curve([P(0.12 * W, 0), P(0.13 * W, -0.12 * W), P(0, -0.21 * W), P(-0.13 * W, -0.12 * W), P(-0.12 * W, 0)], 8) }];
  const ear = segPiece('oreja', 'Oreja (4 de tela y 2 de entretela)', earSegs, Math.min(sa, 8), 4);
  const pw = 0.58 * W, ph = 0.36 * H, pocket = lined(rect4('bolsillo', 'Bolsillo delantero (tela y forro)', pw, ph, ['boca', 'lado', 'fondo', 'lado-b'], Math.min(sa, 10), 2));
  place(front, 'bolsillo', box((W - pw) / 2, H - ph - 0.08 * H, (W + pw) / 2, H - 0.08 * H), 'Bolsillo: colocación');
  for (const sg of [-1, 1]) { const c = P(r + sg * r * Math.cos(Math.PI * 0.3), r - r * Math.sin(Math.PI * 0.3)); place(front, `oreja-${sg}`, [P(c.x - 0.12 * W, c.y), P(c.x + 0.12 * W, c.y)], 'Oreja: entra en la costura', false); }
  const straps = strap('tirante', 'Tirante (doblado en cuatro)', 25, num(p, 'largoTirante'), sa, 2), handle = strap('asa', 'Asa (doblada en cuatro)', 18, 200, sa, 1), tabs = rect4('lengueta', 'Lengüeta de la cremallera', 30, 70, ['a', 'b', 'c', 'd'], sa, 2);
  const seams = [
    equal('cierre', 'Banda de cremallera con el contorno', [{ pieceId: zip.id, edgeIds: ['canto-cuerpo'] }], [{ pieceId: front.id, edgeIds: runIds(front, 'cremallera') }], 1),
    equal('base', 'Banda lateral con el contorno', [{ pieceId: band.id, edgeIds: ['canto-delantero'] }], [{ pieceId: front.id, edgeIds: runIds(front, 'base') }], 1)
  ];
  return {
    pieces: [front, back, lining, zip, band, ear, pocket, straps, handle, tabs], seams,
    notices: [XP('Mochila osito'), { level: 'aviso', code: 'mochila-infantil', message: 'Para niños: sin cordones ni cintas largas; tirantes regulables con pasador, cremallera con tirador de tela y orejas cosidas en la costura (no se arrancan).' }],
    checks: [{ key: 'alto', label: 'Alto', target: H, measured: H, tolerance: 0.5 }, { key: 'fondo', label: 'Fondo', target: D, measured: D, tolerance: 0.5 }],
    materials: [{ id: 'cremallera', label: 'Cremallera continua con dos cursores', qty: cm(Math.ceil((Lz + 50) / 50) * 50) }, { id: 'pasadores', label: 'Pasadores y anillas de 25 mm', qty: '2 + 2' }, { id: 'tela', label: 'Pana gruesa o loneta', qty: `${cm(2 * W + Lb + 60)} × ${cm(H + 40)}` }, { id: 'entretela', label: 'Entretela termoadhesiva gruesa', qty: `${cm(2 * W)} × ${cm(H)}` }],
    assumptions: [`Mochila de ${cm(W)} × ${cm(H)} × ${cm(D)}; la cremallera abre el arco de arriba y baja un poco por los costados.`],
    steps: [
      { id: 'orejas', title: 'Orejas y bolsillo', detail: 'Cose las orejas (con entretela), voltéalas e hilvánalas en sus marcas mirando hacia dentro. Forra el bolsillo y cóselo al delantero.', pieces: ['oreja', 'bolsillo', 'delantero'] },
      { id: 'tirantes', title: 'Tirantes', detail: 'Hilvana asa y tirantes arriba de la espalda y las anillas abajo.', pieces: ['tirante', 'asa', 'espalda'] },
      { id: 'banda', title: 'Bandas', detail: 'Cose la cremallera entre las dos bandas y une sus extremos con la banda lateral, con las lengüetas.', pieces: ['banda-cremallera', 'banda-lateral', 'lengueta'], seams: ['cierre', 'base'] },
      { id: 'montar', title: 'Monta', detail: 'Cose el anillo de bandas al delantero y a la espalda casando los piquetes, remata con bies o forra y voltea.', pieces: ['delantero', 'espalda', 'cuerpo-forro'] }
    ]
  };
}

// ------------------------------------------------------------------ 8. Riñonera organizadora
function hipOrganizer(p: Params): GeneratorResult {
  const sa = num(p, 'margen'), W = num(p, 'ancho'), H = num(p, 'alto'), waist = num(p, 'cintura'), fold = str(p, 'corte') === 'doblez', tab = 50;
  const hw = W / 2, r = 0.42 * W;
  const right: Seg[] = [
    { run: 'arriba', pts: line(P(0, 0), P(hw + tab, 0)) },
    { run: 'lengueta', pts: line(P(hw + tab, 0), P(hw + tab, 45)) },
    { run: 'contorno', pts: line(P(hw + tab, 45), P(hw + 34, 45)) },
    // Concave fillet under the belt tab, wider than any seam allowance.
    { run: 'contorno', pts: arcPts(hw + 34, 79, 34, -Math.PI / 2, -Math.PI, 8) },
    { run: 'contorno', pts: curve([P(hw, 79), P(hw - 0.01 * W, 0.42 * H), P(hw, H - r), P(hw - 0.4 * r, H - 0.12 * r), P(0.3 * hw, H - 3), P(0, H)], 8) }
  ];
  const segs = [...right, ...mirrorSegs(right).map(s => ({ ...s, run: s.run === 'lengueta' ? 'lengueta-b' : s.run }))];
  const full = tagged(segs);
  const outline = fold ? half(full.pts) : full.pts;
  const runOf = (a: Pt, b: Pt) => (fold && near(a.x, 0) && near(b.x, 0) ? 'doblez' : full.runOf(a));
  const mk = (id: string, name: string, fabric: FabricRole) => polyRuns(id, name, outline, runOf, { k: 1, sa, felt: false }, { qty: 1, fabric, fold: fold ? 'doblez' : undefined, onFold: fold }, q => full.keep(q) || (fold && near(q.x, 0)));
  const body = mk('cuerpo', `Cuerpo${fold ? ' (al doblez)' : ''}`, 'principal'), lining = mk('cuerpo-forro', `Cuerpo de forro${fold ? ' (al doblez)' : ''}`, 'forro');
  const zl = 0.62 * W, zy = 70, zipLine = [P(-zl / 2, zy), P(zl / 2, zy)];
  const half2 = (pts: Pt[]) => (fold ? pts.map(q => P(Math.max(0, q.x), q.y)) : pts);
  place(body, 'cremallera', half2(zipLine), 'Cremallera: abertura del bolsillo de arriba', false);
  const zipBag = rect4('bolsa-cremallera', 'Bolsa del bolsillo con cremallera (forro, doblada)', zl + 40, 2 * 150, ['boca', 'lado', 'fondo', 'lado-b'], sa, 1, 'forro');
  zipBag.lines.push({ id: 'doblez', kind: 'doblez', a: P(0, 150), b: P(zl + 40, 150), label: 'Doblar' });
  // The big pocket follows the rounded bottom of the body, 2 cm inside it.
  const bw = 0.7 * W, by = 0.4 * H, bh = 0.47 * H, bigSegs = roundRectSegs(bw, bh, 0.16 * W, { top: 'boca', side: 'contorno', bottom: 'contorno' }, 0.16 * W, 0);
  const big = lined(segPiece('bolsillo-grande', 'Bolsillo grande con ranuras para bolígrafos (tela y forro)', bigSegs, sa, 2));
  [0.14, 0.24].forEach((f, i) => big.lines.push({ id: `ranura-${i}`, kind: 'pespunte', a: P(bw * f, 0), b: P(bw * f, 0.7 * bh), label: i ? undefined : 'Ranuras para bolígrafos' }));
  const bigPlace = tagged(bigSegs).pts.map(q => P(q.x - bw / 2, q.y + by));
  place(body, 'bolsillo-grande', fold ? half2(bigPlace) : bigPlace, 'Bolsillo grande: colocación');
  const sciSegs = roundRectSegs(0.24 * W, 0.4 * H, 0.1 * W, { top: 'boca', side: 'contorno', bottom: 'contorno' }, 0.1 * W, 0);
  const sci = lined(segPiece('bolsillo-tijeras', 'Bolsillo de tijeras (tela y forro)', sciSegs, Math.min(sa, 10), 2));
  const sx = 0.08 * W, sy = by - 0.12 * H;
  place(body, 'bolsillo-tijeras', tagged(sciSegs).pts.map(q => P(q.x + sx, q.y + sy)), 'Bolsillo de tijeras: colocación (encima del grande)');
  const beltLen = Math.max(200, (waist + 200 - (W + 2 * tab)) / 2);
  const belt = strap('cinturon', 'Cinturón (doblado en cuatro) o cinta de 25 mm', 25, beltLen, sa, 2);
  return {
    pieces: [body, lining, zipBag, big, sci, belt], seams: [equal('forro', 'Cuerpo con forro', [{ pieceId: body.id, edgeIds: runIds(body, 'contorno') }], [{ pieceId: lining.id, edgeIds: runIds(lining, 'contorno') }], 0.5)],
    notices: [XP('Riñonera organizadora')],
    checks: [{ key: 'cintura', label: 'Contorno con el cinturón', target: waist + 200, measured: W + 2 * tab + 2 * beltLen, tolerance: 2 }],
    materials: [{ id: 'cremallera', label: 'Cremallera metálica', qty: cm(Math.ceil((zl + 40) / 10) * 10) }, { id: 'hebilla', label: 'Hebilla de cierre rápido o anillas en D de 25 mm', qty: '1' }, { id: 'tela', label: 'Lino grueso, lona o sarga', qty: `${cm(W + 100)} × ${cm(2 * H + 100)}` }],
    assumptions: [`Riñonera de ${cm(W)} × ${cm(H)} para una cintura de ${cm(waist)}, con 20 cm para ajustar.`],
    steps: [
      { id: 'cremallera', title: 'Bolsillo con cremallera', detail: 'Abre la ranura en el cuerpo, cose la cremallera y la bolsa doblada por detrás.', pieces: ['cuerpo', 'bolsa-cremallera'] },
      { id: 'bolsillos', title: 'Bolsillos', detail: 'Forra el bolsillo grande y el de tijeras, cose el de tijeras encima del grande y las ranuras, y pespunta el grande al cuerpo.', pieces: ['bolsillo-grande', 'bolsillo-tijeras', 'cuerpo'] },
      { id: 'cerrar', title: 'Cierra', detail: 'Hilvana los cinturones en las lengüetas, cose cuerpo y forro alrededor dejando una abertura arriba, voltea y pespuntea.', pieces: ['cuerpo', 'cuerpo-forro', 'cinturon'], seams: ['forro'] }
    ]
  };
}

// ------------------------------------------------------------------ Generators
const M: ParamDef = { key: 'margen', label: 'Margen de costura', group: 'margenes', type: 'length', min: 6, max: 15 };
const L = (key: string, label: string, min: number, max: number, when?: ParamDef['when']): ParamDef => ({ key, label, group: 'diseno', type: 'length', min, max, when });
const C = (key: string, label: string, opts: [string, string][], when?: ParamDef['when']): ParamDef => ({ key, label, group: 'diseno', type: 'choice', choices: opts.map(([value, l]) => ({ value, label: l })), when });
interface Def { id: string; name: string; summary: string; params: ParamDef[]; defaults: Params; make: (p: Params) => GeneratorResult }
const DEFS: Def[] = [
  { id: 'funda-portatil-cremallera', name: 'Funda acolchada para portátil con cremallera', summary: 'Funda con guata, cremallera en tres lados, fuelle y bolsillos.', make: laptopSleeve,
    params: [C('tamano', 'Portátil', [['13', '13 pulgadas'], ['14', '14 pulgadas'], ['16', '15–16 pulgadas'], ['medida', 'A medida']]), L('anchoPortatil', 'Ancho del portátil', 200, 420, p => p.tamano === 'medida'), L('altoPortatil', 'Alto del portátil', 140, 300, p => p.tamano === 'medida'), L('grosor', 'Grosor del portátil', 8, 35, p => p.tamano === 'medida'), C('acolchado', 'Acolchado', [['canales', 'Canales'], ['rombos', 'Rombos'], ['no', 'Sin acolchado']]), C('bolsilloExterior', 'Bolsillo exterior', [['si', 'Sí'], ['no', 'No']]), C('bolsilloInterior', 'Bolsillo interior', [['si', 'Sí'], ['no', 'No']]), M],
    defaults: { tamano: '14', anchoPortatil: 322, altoPortatil: 227, grosor: 18, acolchado: 'canales', bolsilloExterior: 'si', bolsilloInterior: 'si' } },
  { id: 'bolsa-u-bolsillo', name: 'Bolsa en U con fuelle y bolsillo bordado', summary: 'Cuerpo en U, fuelle con refuerzo, bolsillo redondeado con bordado y asas.', make: uTote,
    params: [L('ancho', 'Ancho', 260, 500), L('alto', 'Alto', 280, 560), L('fondo', 'Fondo (0 = plana)', 0, 160), L('largoAsa', 'Largo libre del asa', 250, 700), L('anchoAsa', 'Ancho del asa', 20, 50), M],
    defaults: { ancho: 380, alto: 400, fondo: 90, largoAsa: 500, anchoAsa: 30 } },
  { id: 'bolsa-asas-laterales', name: 'Bolsa de compra con asas laterales', summary: 'Cuerpo con el asa en la misma pieza, costados que se estrechan y base.', make: earBag,
    params: [L('ancho', 'Ancho de la base', 160, 320), L('fondo', 'Fondo', 100, 200), L('altoCostado', 'Alto del costado', 180, 340), L('altoTotal', 'Alto con el asa', 420, 680), L('anchoAsa', 'Ancho del asa', 35, 70), M],
    defaults: { ancho: 220, fondo: 150, altoCostado: 250, altoTotal: 540, anchoAsa: 45 } },
  { id: 'bolsa-estrella', name: 'Bolsa estrella con asa calada', summary: 'Estrella forrada al doblez con asa calada en cada cara y bolsillo.', make: starBag,
    params: [L('ancho', 'Ancho de punta a punta', 320, 560), C('corte', 'Corte', [['doblez', 'Al doblez'], ['entera', 'Pieza entera']]), M],
    defaults: { ancho: 430, corte: 'doblez' } },
  { id: 'tote-bolsillos', name: 'Tote de caja con bolsillos alrededor', summary: 'Cuerpo, costados y base con bolsillos en las cuatro caras y asas de cinta.', make: pocketTote,
    params: [L('ancho', 'Ancho', 280, 500), L('alto', 'Alto', 200, 400), L('fondo', 'Fondo', 80, 200), L('altoBolsillo', 'Alto de los bolsillos', 100, 220), L('largoAsa', 'Largo libre del asa', 200, 600), M],
    defaults: { ancho: 400, alto: 250, fondo: 120, altoBolsillo: 170, largoAsa: 300 } },
  { id: 'mochila-solapa', name: 'Mochila de solapa con hebillas', summary: 'Cuerpo con laterales y base, solapa, jareta, bolsillos con fuelle y tirantes acolchados.', make: flapBackpack,
    params: [L('ancho', 'Ancho', 260, 380), L('alto', 'Alto', 350, 520), L('fondo', 'Fondo', 100, 180), L('largoTirante', 'Largo del tirante', 400, 650), M],
    defaults: { ancho: 320, alto: 450, fondo: 140, largoTirante: 500 } },
  { id: 'mochila-osito', name: 'Mochila osito infantil', summary: 'Mochila con arco, cremallera arriba, banda lateral, orejas y bolsillo.', make: bearBackpack,
    params: [L('ancho', 'Ancho', 180, 300), L('alto', 'Alto', 200, 340), L('fondo', 'Fondo', 60, 120), L('largoTirante', 'Largo del tirante', 450, 800), M],
    defaults: { ancho: 240, alto: 250, fondo: 80, largoTirante: 650 } },
  { id: 'rinonera-organizador', name: 'Riñonera organizadora de cadera', summary: 'Cuerpo al doblez, bolsillo con cremallera, bolsillo grande con ranuras y de tijeras, cinturón.', make: hipOrganizer,
    params: [L('ancho', 'Ancho', 240, 380), L('alto', 'Alto', 240, 400), L('cintura', 'Contorno de cintura o cadera', 600, 1400), C('corte', 'Corte', [['doblez', 'Al doblez'], ['entera', 'Pieza entera']]), M],
    defaults: { ancho: 300, alto: 320, cintura: 900, corte: 'doblez' } }
];
export const BAG_IDS = DEFS.map(d => d.id);
const full = (d: Def, p: Params): Params => ({ margen: 10, ...d.defaults, ...p });
function build(d: Def, p: Params): GeneratorResult {
  for (const def of d.params) if (def.type === 'length' && (!def.when || def.when(p)) && !(num(p, def.key) >= def.min! && num(p, def.key) <= def.max!))
    return invalid('bolso-medidas', `${def.label}: de ${cm(def.min!)} a ${cm(def.max!)}.`);
  return d.make(p);
}
export const BAG_GENERATORS: PatternGenerator[] = DEFS.map(d => ({
  id: d.id, name: d.name, status: 'experimental', summary: d.summary, requiredMeasures: [], optionalMeasures: [], params: d.params,
  defaults: () => full(d, {}),
  generate: (ctx: GeneratorContext, params: Params) => { void ctx; return build(d, full(d, params)); }
}));
