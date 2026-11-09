import { num, str, type GeneratorContext, type GeneratorResult, type ParamDef, type Params, type PatternGenerator } from '../generator';
import type { Issue, Piece, SeamRelation } from '../types';
import type { Pt } from '../../geom/vec';
import { P, cm, edge, equal, invalid, rectangle, type EdgeDef } from './kidsShared';
import { exp, notchAt } from './toyKit';
import { polyRuns } from './cushionKit';
import { circle, ellipse, rect, rrect, uni } from '../../applique/shapes';
import { differencePolygons, intersectPolygons, offsetPolygons, polygonsArea } from '../../geom/polyoffset';
import { bendFor, biggest, insidePoly, near, smooth } from './shapeKit';
import { heart, star, uShape } from './sensoryKit';
import { arcPts, tagged, type Seg } from './bags';

/* Casitas de juego de tela (2026-11-09), a partir de 10 fotos de la usuaria.
 * Dos construcciones propias:
 * - casita de rincón: tejado triangular forrado que cuelga de un gancho en la
 *   esquina, faldón decorado y pared de cortina en una barra de rincón;
 * - casita de mesa: funda de mesa con techo, cuatro paredes, puerta y ventanas.
 * Encima, temas propios (honguito, princesa, payasos, hada del bosque,
 * chocolate con glaseado, noche estrellada, castillo, jardín…) que eligen el
 * faldón, la ventana, la puerta y los apliques. Ventanas y puerta se marcan en
 * las piezas para cortarlas y ribetearlas; todo se imprime y se proyecta. */

export type ValanceStyle = 'ondas' | 'goteo' | 'picos' | 'hojas' | 'almenas' | 'ninguno';
export type WindowStyle = 'cruz' | 'redonda' | 'corazon' | 'arco' | 'rombo';
export type DoorStyle = 'cortinas' | 'arco' | 'enrollable' | 'paneles';
export interface Deco { id: string; name: string; poly: Pt[]; color: string; on: 'pared' | 'tejado' }
export interface HouseArt { pts: Pt[]; role: string; line?: number; dash?: boolean; closed?: boolean }
interface Frame { W: number; H: number; door?: { x: number; w: number; h: number }; wins: { cx: number; cy: number; w: number; h: number }[]; roof?: { W: number; Hr: number } }
interface Theme { name: string; valance: ValanceStyle; window: WindowStyle; door: DoorStyle; shutters?: boolean; attic?: boolean; decor: (f: Frame) => Deco[]; prints?: ('pared' | 'tejado' | 'faldon' | 'cortinas')[] }

// ------------------------------------------------------------------ Shapes
/** Decorative valance strip: straight top on y = 0 (sewn into the seam), shaped bottom edge, n units exactly. */
export function valanceShape(style: ValanceStyle, width: number, n: number, sa: number): Pt[] {
  const s = width / n, b = 30, parts: Pt[][] = [rect(0, 0, width, b + 2)];
  for (let i = 0; i < n; i++) {
    const x = i * s, c = x + s / 2;
    if (style === 'ondas') parts.push(Array.from({ length: 25 }, (_, k) => { const a = (k / 24) * Math.PI; return P(c + (s / 2 - 1) * Math.cos(a), b - 2 + 0.42 * s * Math.sin(a)); }));
    else if (style === 'goteo') { const L = (i % 2 ? 0.95 : 0.6) * s, w = 0.62 * s; parts.push(uShape(w, L).map(q => P(c + q.x, b - 4 - q.y))); }
    else if (style === 'picos') parts.push([P(x + 1, b), P(x + s - 1, b), P(c, b + 0.7 * s)]);
    else if (style === 'hojas') parts.push([P(x + 2, b), P(x + 0.18 * s, b + 0.36 * s), P(c, b + 0.78 * s), P(x + 0.82 * s, b + 0.36 * s), P(x + s - 2, b)]);
    else if (style === 'almenas') parts.push(rect(x + 0.2 * s, b - 2, 0.6 * s, 0.42 * s + 2));
  }
  const raw = biggest(uni(...parts));
  // Round the inner corners so the lined valance turns and its cut line never loops.
  return smooth([raw], bendFor(sa) + 4).map(q => P(q.x, Math.abs(q.y) < 0.05 ? 0 : q.y));
}
export function windowShape(style: WindowStyle, cx: number, cy: number, w: number, h: number): { poly: Pt[]; bars: Pt[][] } {
  const cross = [[P(cx, cy - h / 2), P(cx, cy + h / 2)], [P(cx - w / 2, cy), P(cx + w / 2, cy)]];
  if (style === 'redonda') { const r = Math.min(w, h) / 2; return { poly: circle(cx, cy, r, 48), bars: [[P(cx, cy - r), P(cx, cy + r)], [P(cx - r, cy), P(cx + r, cy)]] }; }
  if (style === 'corazon') return { poly: heart(cx, cy - 0.06 * w, w), bars: [] };
  if (style === 'rombo') return { poly: [P(cx, cy - h / 2), P(cx + w / 2, cy), P(cx, cy + h / 2), P(cx - w / 2, cy)], bars: [] };
  if (style === 'arco') return { poly: biggest(uni(rect(cx - w / 2, cy - h / 2 + w / 2, w, h - w / 2), circle(cx, cy - h / 2 + w / 2, w / 2, 48))), bars: [[P(cx, cy - h / 2), P(cx, cy + h / 2)], [P(cx - w / 2, cy + 0.1 * h), P(cx + w / 2, cy + 0.1 * h)]] };
  return { poly: rrect(cx - w / 2, cy - h / 2, w, h, 25), bars: cross };
}
const crownShape = (cx: number, y: number, w: number) => { const h = 0.7 * w; return biggest(uni([P(cx - w / 2, y), P(cx + w / 2, y), P(cx + w / 2, y - h * 0.7), P(cx + w / 4, y - h * 0.35), P(cx, y - h), P(cx - w / 4, y - h * 0.35), P(cx - w / 2, y - h * 0.7)], circle(cx, y - h, 0.07 * w, 16), circle(cx + w / 2, y - h * 0.7, 0.06 * w, 16), circle(cx - w / 2, y - h * 0.7, 0.06 * w, 16))); };
const flowerShape = (cx: number, cy: number, r: number) => biggest(uni(...Array.from({ length: 5 }, (_, i) => { const a = (i * 2 * Math.PI) / 5 - Math.PI / 2; return circle(cx + Math.cos(a) * r * 0.55, cy + Math.sin(a) * r * 0.55, r * 0.5, 20); })));
const mushroomCap = (cx: number, y: number, w: number) => biggest(uni(ellipse(cx, y, w / 2, 0.42 * w, 0, 32).filter(q => q.y <= y + 0.02 * w), rect(cx - w / 2, y - 2, w, 0.12 * w)));
const leaf = (cx: number, cy: number, l: number, deg: number) => ellipse(cx, cy, l / 2, l / 5, deg, 20);
const moon = (cx: number, cy: number, r: number) => biggest(differencePolygons([circle(cx, cy, r, 40)], [circle(cx + 0.45 * r, cy - 0.2 * r, 0.85 * r, 40)]));
const bowShape = (cx: number, cy: number, w: number) => biggest(uni(ellipse(cx - w * 0.27, cy, w * 0.26, w * 0.17, -15, 20), ellipse(cx + w * 0.27, cy, w * 0.26, w * 0.17, 15, 20), circle(cx, cy, w * 0.1, 16)));
const D = (id: string, name: string, poly: Pt[], color: string, on: Deco['on'] = 'pared'): Deco => ({ id, name, poly, color, on });
/** Free horizontal zones at the bottom of a wall, left and right of the door. */
const zones = (f: Frame) => f.door ? [[70, f.door.x - f.door.w / 2 - 70], [f.door.x + f.door.w / 2 + 70, f.W - 70]].filter(([a, b]) => b - a > 120) : [[70, f.W - 70]];
const belowWindow = (f: Frame) => f.wins.length ? Math.max(...f.wins.map(w => w.cy + w.h / 2)) + 60 : 0.45 * f.H;

// ------------------------------------------------------------------ Themes (own designs)
export const THEMES: Record<string, Theme> = {
  honguito: { name: 'Honguito', valance: 'ondas', window: 'redonda', door: 'cortinas', decor: f => [
    ...(f.roof ? ([[0.5, 0.36, 0.045], [0.37, 0.62, 0.06], [0.63, 0.6, 0.05], [0.28, 0.86, 0.04], [0.71, 0.86, 0.05], [0.5, 0.82, 0.035]] as const).map(([x, y, r], i) => D(`lunar-${i + 1}`, 'Lunar del sombrero', circle(x * f.roof!.W, y * f.roof!.Hr, r * f.roof!.W, 32), 'blanco', 'tejado')) : []),
    ...zones(f).flatMap(([a, b], i) => { const pts: Pt[] = [P(a, f.H - 45)]; for (let x = a; x <= b; x += 40) pts.push(P(Math.min(x, b), f.H - 45 - ((x - a) / 40 % 2 ? 105 : 55))); pts.push(P(b, f.H - 45)); return [D(`hierba-${i + 1}`, 'Hierba', pts, 'verde')]; }),
    ...zones(f).slice(-1).flatMap(([a, b]) => { const x = Math.min(b - 110, a + 130); return [D('seta-sombrero', 'Sombrero de seta', mushroomCap(x, f.H - 230, 150), 'rojo'), D('seta-pie', 'Pie de seta', rrect(x - 26, f.H - 232, 52, 110, 18), 'blanco')]; })
  ] },
  princesa: { name: 'Princesa', valance: 'ondas', window: 'corazon', door: 'cortinas', decor: f => [
    ...(f.door && f.H - f.door.h - 140 > 150 ? [D('corona', 'Corona', crownShape(f.door.x, f.H - f.door.h - 30, 150), 'amarillo')] : []),
    ...zones(f).map(([a, b], i) => D(`corazon-${i + 1}`, 'Corazón', heart((a + b) / 2, f.H - 170, 110), 'rosa')),
    ...f.wins.map((w, i) => D(`estrella-${i + 1}`, 'Estrella', star(w.cx, w.cy + w.h / 2 + 90, 45, 20), 'amarillo'))
  ] },
  payasos: { name: 'Payasos', valance: 'picos', window: 'rombo', door: 'cortinas', prints: ['tejado'], decor: f => {
    const [a, b] = zones(f).slice(-1)[0] ?? [f.W / 2 - 150, f.W / 2 + 150], cx = (a + b) / 2, top = belowWindow(f), r = Math.max(50, Math.min(95, (b - a) / 2 - 60, (f.H - top - 120) / 2.9)), cy = Math.min(f.H - r - 75, top + 1.8 * r + 10);
    return [
      D('payaso-pelo', 'Pelo del payaso', biggest(uni(...[-1, 1].flatMap(sg => [circle(cx + sg * r * 0.95, cy - r * 0.15, r * 0.38, 20), circle(cx + sg * r * 1.05, cy + r * 0.25, r * 0.32, 20)]))), 'naranja'),
      D('payaso-cara', 'Cara del payaso', circle(cx, cy, r, 40), 'blanco'),
      D('payaso-sombrero', 'Sombrero de payaso', [P(cx - r * 0.55, cy - r * 0.8), P(cx + r * 0.55, cy - r * 0.8), P(cx + 0.1 * r, cy - r * 1.75)], 'azul'),
      D('payaso-nariz', 'Nariz', circle(cx, cy + 0.08 * r, r * 0.2, 20), 'rojo'),
      D('payaso-boca', 'Sonrisa', biggest(differencePolygons([ellipse(cx, cy + 0.38 * r, r * 0.5, r * 0.28, 0, 30)], [ellipse(cx, cy + 0.26 * r, r * 0.52, r * 0.22, 0, 30)])), 'rojo'),
      ...([[-1.6, 0.2, 'amarillo'], [1.7, -0.3, 'azul'], [1.5, 0.9, 'verde']] as const).map(([dx, dy, col], i) => D(`confeti-${i + 1}`, 'Confeti', circle(cx + dx * r, cy + dy * r, 0.28 * r, 20), col)),
      ...(f.roof ? [D('estrella-tejado', 'Estrella', star(f.roof.W / 2, 0.6 * f.roof.Hr, 70, 32), 'amarillo', 'tejado')] : [])
    ];
  } },
  hada: { name: 'Hada del bosque', valance: 'hojas', window: 'arco', door: 'cortinas', decor: f => {
    const out: Deco[] = [], z = zones(f).slice(-1)[0];
    if (z) {
      const [a, b] = z, n = Math.max(3, Math.floor((b - a) / 90));
      for (let i = 0; i < n; i++) out.push(D(`hoja-${i + 1}`, 'Hoja de la guirnalda', leaf(a + 45 + i * ((b - a - 90) / Math.max(1, n - 1)), f.H - 110 - (i % 2) * 40, 90, i % 2 ? -30 : 30), 'verde'));
      out.push(D('seta-sombrero', 'Sombrero de seta', mushroomCap(a + 80, f.H - 250, 120), 'rojo'), D('seta-pie', 'Pie de seta', rrect(a + 60, f.H - 252, 40, 90, 14), 'blanco'));
      out.push(D('flor-1', 'Flor', flowerShape(Math.min(b - 60, a + 230), f.H - 250, 50), 'rosa'), D('flor-2', 'Flor', flowerShape(Math.min(b - 60, a + 360), f.H - 230, 45), 'amarillo'));
    }
    const w = f.wins[0];
    if (w && w.cx + w.w / 2 + 170 < f.W - 40) out.push(D('mariposa', 'Mariposa', biggest(uni(ellipse(w.cx + w.w / 2 + 75, w.cy, 34, 22, -30, 20), ellipse(w.cx + w.w / 2 + 125, w.cy, 34, 22, 30, 20), rect(w.cx + w.w / 2 + 95, w.cy - 30, 10, 60))), 'lila'));
    return out;
  } },
  chocolate: { name: 'Chocolate con glaseado', valance: 'goteo', window: 'cruz', door: 'cortinas', decor: f => [
    ...(f.roof ? Array.from({ length: 24 }, (_, i) => { const fr = (v: number) => v - Math.floor(v), W = f.roof!.W, Hr = f.roof!.Hr, y = (0.35 + 0.55 * fr(i * 0.382 + 0.1)) * Hr, x = W / 2 + (fr(i * 0.618) - 0.5) * 2 * ((y / Hr) * W / 2 - 70);
      return { x, y, i }; }).filter(({ x, y }) => Math.abs(x - f.roof!.W / 2) < (y / f.roof!.Hr) * f.roof!.W / 2 - 70).slice(0, 12).map(({ x, y, i }, k) => D(`grajea-${k + 1}`, 'Grajea', ellipse(x, y, 30, 9, (i * 47) % 180, 16), ['rosa', 'amarillo', 'azul', 'verde', 'blanco'][k % 5], 'tejado')) : []),
    ...zones(f).slice(-1).map(([a, b]) => D('corazon', 'Corazón de galleta', heart((a + b) / 2, f.H - 170, 110), 'blanco'))
  ] },
  estrellas: { name: 'Noche estrellada', valance: 'ondas', window: 'cruz', door: 'cortinas', attic: true, shutters: true, decor: f => [
    ...(f.roof ? [D('luna', 'Luna', moon(0.32 * f.roof.W, 0.78 * f.roof.Hr, 60), 'amarillo', 'tejado'), D('estrella-tejado', 'Estrella', star(0.68 * f.roof.W, 0.8 * f.roof.Hr, 45, 20), 'blanco', 'tejado')] : []),
    ...zones(f).flatMap(([a, b], i) => [D(`estrella-${i + 1}`, 'Estrella', star((a + b) / 2, f.H - 200, 55, 24), 'blanco')])
  ] },
  castillo: { name: 'Castillo', valance: 'almenas', window: 'arco', door: 'arco', decor: f => [
    ...(f.roof ? [D('bandera', 'Banderín del torreón', [P(f.roof.W / 2 + 10, 0.2 * f.roof.Hr), P(f.roof.W / 2 + 130, 0.27 * f.roof.Hr), P(f.roof.W / 2 + 10, 0.34 * f.roof.Hr)], 'rojo', 'tejado')] : []),
    ...zones(f).flatMap(([a, b], i) => [[0.3, 0.74], [0.68, 0.86]].map(([fx, fy], j) => D(`piedra-${i + 1}-${j + 1}`, 'Piedra', rrect(a + (b - a) * fx - 55, f.H * fy, 110, 55, 22), 'gris')))
  ] },
  jardin: { name: 'Jardín', valance: 'ninguno', window: 'cruz', door: 'enrollable', decor: f => {
    const out: Deco[] = [];
    zones(f).forEach(([a, b], z) => { const n = Math.max(2, Math.floor((b - a) / 95)); for (let i = 0; i < n; i++) { const x = a + i * ((b - a) / n) + 12; out.push(D(`valla-${z + 1}-${i + 1}`, 'Tabla de la valla', [P(x, f.H - 45), P(x + 70, f.H - 45), P(x + 70, f.H - 225), P(x + 35, f.H - 260), P(x, f.H - 225)], 'blanco')); } });
    zones(f).forEach(([a, b], z) => out.push(D(`flor-${z + 1}`, 'Flor', flowerShape((a + b) / 2, f.H - 190, 48), z ? 'rosa' : 'rojo')));
    if (f.door) {
      const x0 = f.door.x + f.door.w / 2 + 50, next = Math.min(f.W - 60, ...f.wins.filter(w => w.cx > f.door!.x).map(w => w.cx - w.w / 2 - 40));
      if (next - x0 >= 120) out.push(D('farol', 'Farol', biggest(uni([P(x0, f.H - f.door.h + 60), P(x0 + 90, f.H - f.door.h + 60), P(x0 + 72, f.H - f.door.h + 180), P(x0 + 18, f.H - f.door.h + 180)], rect(x0 + 32, f.H - f.door.h + 20, 26, 45))), 'negro'));
    }
    return out;
  } },
  lunares: { name: 'Lunares rosa', valance: 'ondas', window: 'cruz', door: 'cortinas', prints: ['faldon', 'cortinas'], decor: f => f.wins.map((w, i) => D(`lazo-${i + 1}`, 'Lazo', bowShape(w.cx, w.cy + w.h / 2 + 70, 120), 'rosa')) },
  rayas: { name: 'Rayas', valance: 'ondas', window: 'cruz', door: 'cortinas', prints: ['pared'], decor: () => [] },
  menta: { name: 'Menta con persianas', valance: 'ninguno', window: 'cruz', door: 'enrollable', shutters: true, decor: () => [] },
  sencilla: { name: 'Sencilla', valance: 'ondas', window: 'cruz', door: 'paneles', decor: () => [] }
};
export const THEME_IDS = Object.keys(THEMES);

// ------------------------------------------------------------------ Pieces
/** Lined valance: its straight top (y = 0) is the run sewn into the seam. */
const valancePiece = (id: string, name: string, style: ValanceStyle, len: number, sa: number, qty: number) =>
  polyRuns(id, name, valanceShape(style, len, units(len), sa), (a, b) => (near(a.y, 0) && near(b.y, 0) ? 'union' : 'contorno'), { k: 1, sa, felt: false }, { qty, fabric: 'contraste' }, q => near(q.y, 0));
/** A wall (seam line, (0,0)-(W,H)) with the door cut from the bottom edge. */
function wallSegs(W: number, H: number, door?: { x: number; w: number; h: number; arch: boolean }): Seg[] {
  const segs: Seg[] = [{ run: 'arriba', pts: [P(0, 0), P(W, 0)] }, { run: 'lado', pts: [P(W, 0), P(W, H)] }];
  if (!door) segs.push({ run: 'bajo', pts: [P(W, H), P(0, H)] });
  else {
    const xr = door.x + door.w / 2, xl = door.x - door.w / 2, top = H - door.h, r = door.arch ? door.w / 2 : 60;
    segs.push({ run: 'bajo', pts: [P(W, H), P(xr, H)] });
    const arc = door.arch ? arcPts(door.x, top + r, r, 0, -Math.PI, 24) : [...arcPts(xr - r, top + r, r, 0, -Math.PI / 2, 8), ...arcPts(xl + r, top + r, r, -Math.PI / 2, -Math.PI, 8).slice(1)];
    segs.push({ run: 'puerta', pts: [P(xr, H), ...arc, P(xl, H)] });
    segs.push({ run: 'bajo-b', pts: [P(xl, H), P(0, H)] });
  }
  segs.push({ run: 'lado-b', pts: [P(0, H), P(0, 0)] });
  return segs;
}
const segPiece = (id: string, name: string, segs: Seg[], sa: number, qty: number, o: { hems?: Record<string, number>; raw?: string[]; fabric?: Piece['cut']['fabric']; felt?: boolean } = {}) => {
  const t = tagged(segs);
  return polyRuns(id, name, t.pts, a => t.runOf(a), { k: 1, sa: o.felt ? 0 : sa, felt: !!o.felt }, { qty, fabric: o.fabric ?? 'principal', hems: o.hems, raw: o.raw }, q => t.keep(q));
};
const ref = (pc: Piece, id: string, poly: Pt[], label: string) => [...poly, poly[0]].slice(1).forEach((q, i, arr) => pc.lines.push({ id: `${id}-${i}`, kind: 'referencia', a: i ? arr[i - 1] : poly[0], b: q, label: i ? undefined : label }));
const place = (pc: Piece, id: string, poly: Pt[], label: string, closed = true) => { const pts = closed ? [...poly, poly[0]] : poly; pts.slice(1).forEach((q, i) => pc.lines.push({ id: `${id}-${i}`, kind: 'colocacion', a: pts[i], b: q, label: i ? undefined : label })); };
const runIds = (pc: Piece, run: string) => pc.edges.filter(e => e.id === run || new RegExp(`^${run}-\\d+$`).test(e.id)).map(e => e.id);
const rect4 = (id: string, name: string, w: number, h: number, e: [string, string, string, string], fin: [number, number, number, number], qty: number, fabric: Piece['cut']['fabric'] = 'principal', hemMask: [boolean, boolean, boolean, boolean] = [false, false, false, false]) =>
  rectangle(id, name, w, h, e.map((x, i) => edge(x, x, hemMask[i] ? 'dobladillo' : fin[i] > 0 ? 'costura' : 'sin-margen', fin[i])) as [EdgeDef, EdgeDef, EdgeDef, EdgeDef], { qty, fabric });
const units = (len: number) => Math.max(3, Math.round(len / 200));
function addWindows(pc: Piece, f: Frame, style: WindowStyle, prefix = 'ventana') {
  f.wins.forEach((w, i) => {
    const sh = windowShape(style, w.cx, w.cy, w.w, w.h);
    ref(pc, `${prefix}-${i + 1}`, sh.poly, 'Ventana: corta por aquí y ribetea con bies (sin margen)');
    sh.bars.forEach((b, j) => place(pc, `${prefix}-${i + 1}-barra-${j + 1}`, b, j ? '' : 'Barras de la ventana (bies cosido encima)', false));
  });
}
function decoPieces(decos: Deco[], target: Piece, on: Deco['on']): Piece[] {
  const out: Piece[] = [], seen = new Map<string, Piece>();
  for (const d of decos.filter(x => x.on === on)) {
    place(target, `aplique-${d.id}`, d.poly, `${d.name}: colocación`);
    const key = d.id.replace(/-\d+(-\d+)?$/, ''), prev = seen.get(key);
    if (prev) { prev.cut.qty += 1; continue; }
    const pc = polyRuns(`aplique-${key}`, `${d.name} (aplique sin margen)`, d.poly, () => 'borde', { k: 1, sa: 0, felt: true }, { qty: 1, fabric: 'contraste' });
    seen.set(key, pc); out.push(pc);
  }
  return out;
}
/** Keeps the motifs that fit: inside their piece, clear of the door, windows and valance. A motif
 * (ids sharing the first word, like seta-sombrero and seta-pie) stays or goes as a whole. */
function fitDecos(decos: Deco[], f: Frame, wall: Pt[], valanceDepth: number, attic?: Pt[]): Deco[] {
  const wallIn = offsetPolygons([wall], -25), roofIn = f.roof ? offsetPolygons([[P(f.roof.W / 2, 0), P(f.roof.W, f.roof.Hr), P(0, f.roof.Hr)]], -30) : [];
  const holes = [...f.wins.map(w => windowShape('cruz', w.cx, w.cy, w.w + 50, w.h + 50).poly), ...(f.door ? [rect(f.door.x - f.door.w / 2 - 25, f.H - f.door.h - 25, f.door.w + 50, f.door.h + 25)] : []), rect(-10, -10, f.W + 20, valanceDepth + 25)];
  const ok = (d: Deco) => d.on === 'tejado'
    ? d.poly.every(q => roofIn.some(r => insidePoly(q, r))) && (!attic || polygonsArea(intersectPolygons([d.poly], offsetPolygons([attic], 25))) < 1)
    : d.poly.every(q => wallIn.some(r => insidePoly(q, r))) && holes.every(h => polygonsArea(intersectPolygons([d.poly], [h])) < 1);
  const bad = new Set(decos.filter(d => !ok(d)).map(d => d.id.split('-')[0]));
  return decos.filter(d => !bad.has(d.id.split('-')[0]));
}
const valanceDepthOf = (style: ValanceStyle, len: number, sa: number) => (style === 'ninguno' ? 0 : Math.max(...valanceShape(style, len, units(len), sa).map(q => q.y)));
const sumBias = (polys: Pt[][]) => polys.reduce((s, poly) => s + poly.reduce((t, q, i) => { const r = poly[(i + 1) % poly.length]; return t + Math.hypot(r.x - q.x, r.y - q.y); }, 0), 0);

// ------------------------------------------------------------------ Layouts
export interface HouseLayout { pieces: Piece[]; seams: SeamRelation[]; notes: Issue[]; materials: { id: string; label: string; qty: string }[]; steps: { id: string; title: string; detail: string; pieces: string[] }[]; art: HouseArt[]; size: { key: string; label: string; target: number; measured: number } }
const themeOf = (p: Params) => THEMES[str(p, 'tema')] ?? THEMES.sencilla;
const valanceOf = (p: Params, t: Theme): ValanceStyle => (str(p, 'faldon') && str(p, 'faldon') !== 'tema' ? (str(p, 'faldon') as ValanceStyle) : t.valance);

function corner(p: Params, sa: number): HouseLayout {
  const t = themeOf(p), W = num(p, 'ancho'), H = num(p, 'alto'), Hr = num(p, 'altoTejado'), vs = valanceOf(p, t), door = t.door;
  const dw = Math.max(380, Math.min(560, 0.36 * W)), dh = 0.7 * H, dx = 0.3 * W, ww = Math.min(340, 0.24 * W), wh = Math.min(300, 0.27 * H);
  const f: Frame = { W, H, door: { x: dx, w: dw, h: dh }, wins: [{ cx: 0.73 * W, cy: 0.42 * H, w: ww, h: wh }], roof: { W, Hr } };
  const atticPoly = t.attic ? windowShape('cruz', W / 2, 0.55 * Hr, 0.12 * W, 0.1 * W).poly : undefined;
  const decos = door === 'paneles' ? [] : fitDecos(t.decor(f), f, tagged(wallSegs(W, H, { x: dx, w: dw, h: dh, arch: door === 'arco' || t.window === 'arco' })).pts, valanceDepthOf(vs, W, sa) - 30, atticPoly), pieces: Piece[] = [], seams: SeamRelation[] = [], art: HouseArt[] = [];
  // Roof: lined triangle hanging from the corner hook.
  const roofSegs: Seg[] = [{ run: 'lado', pts: [P(W / 2, 0), P(W, Hr)] }, { run: 'base', pts: [P(W, Hr), P(0, Hr)] }, { run: 'lado-b', pts: [P(0, Hr), P(W / 2, 0)] }];
  const roof = segPiece('tejado', 'Tejado (1 de tela y 1 de forro)', roofSegs, sa, 2);
  roof.marks.push({ id: 'gancho', kind: 'cruz', at: P(W / 2, 25), label: 'Presilla con anilla para el gancho' });
  notchAt(roof, 'base', W / 2, 'Centro', 'centro');
  if (t.attic) { const a = windowShape('cruz', W / 2, 0.55 * Hr, 0.12 * W, 0.1 * W); ref(roof, 'buhardilla', a.poly, 'Ventana de la buhardilla: corta y ribetea con bies'); a.bars.forEach((b, j) => place(roof, `buhardilla-barra-${j + 1}`, b, j ? '' : 'Barras de la buhardilla', false)); }
  pieces.push(roof, ...decoPieces(decos, roof, 'tejado'));
  const casing = rect4('jareta-tejado', 'Jareta del tejado para la barra (doblada)', W, 120, ['canto', 'extremo', 'canto-b', 'extremo-b'], [sa, 20, sa, 20], 1, 'forro', [false, true, false, true]);
  casing.lines.push({ id: 'doblez', kind: 'doblez', a: P(0, 60), b: P(W, 60), label: 'Doblar a la mitad' });
  pieces.push(casing);
  seams.push(equal('jareta', 'Jareta con la base del tejado', [{ pieceId: casing.id, edgeIds: ['canto'] }], [{ pieceId: roof.id, edgeIds: runIds(roof, 'base') }], 1));
  if (vs !== 'ninguno') {
    const val = valancePiece('faldon', `Faldón de ${vs} (1 de tela y 1 de forro)`, vs, W, sa, 2);
    pieces.push(val);
    seams.push(equal('faldon', 'Faldón con la base del tejado', [{ pieceId: val.id, edgeIds: runIds(val, 'union') }], [{ pieceId: roof.id, edgeIds: runIds(roof, 'base') }], 1));
  }
  // Walls.
  const hemTop = 60, hemSide = 25, hemBottom = 40;
  if (door === 'paneles') {
    const ws = [0.16, 0.38, 0.46].map(x => x * W), names = ['Panel izquierdo', 'Panel de la puerta (se enrolla)', 'Panel de la ventana'], ids = ['panel-izquierdo', 'panel-puerta', 'panel-ventana'];
    let x0 = 0;
    ws.forEach((w, i) => {
      const pw = w + (i === 1 ? 60 : 30), pc = rect4(ids[i], names[i], pw, H, ['arriba', 'lado', 'bajo', 'lado-b'], [hemTop, hemSide, hemBottom, hemSide], 1, 'principal', [true, true, true, true]);
      if (i === 2) addWindows(pc, { ...f, wins: [{ cx: pw / 2, cy: 0.42 * H, w: ww, h: wh }] }, t.window);
      if (i === 1) [0.25, 0.75].forEach((fx, j) => pc.marks.push({ id: `cinta-${j + 1}`, kind: 'cruz', at: P(pw * fx, 120), label: 'Lengüeta con velcro para recoger' }));
      pieces.push(pc); x0 += w;
    });
    pieces.push(rect4('lengueta-recoger', 'Lengüeta con velcro para recoger la puerta (doblada)', 50, 300, ['a', 'b', 'c', 'd'], [sa, sa, sa, sa], 4));
  } else {
    const wall = segPiece('pared', 'Pared de cortina', wallSegs(W, H, { x: dx, w: dw, h: dh, arch: door === 'arco' || t.window === 'arco' }), sa, 1, { hems: { arriba: hemTop, lado: hemSide, 'lado-b': hemSide, bajo: hemBottom, 'bajo-b': hemBottom }, raw: ['puerta'] });
    addWindows(wall, f, t.window);
    pieces.push(wall, ...decoPieces(decos, wall, 'pared'));
    if (door === 'cortinas') {
      const cw = 0.75 * dw + 40, ch = dh + 60;
      pieces.push(rect4('cortina', 'Cortina de la puerta (2)', cw, ch, ['arriba', 'lado', 'bajo', 'lado-b'], [40, 20, 30, 20], 2, 'contraste', [true, true, true, true]), rect4('alzapano', 'Alzapaño con velcro (doblado)', 60, 220, ['a', 'b', 'c', 'd'], [sa, sa, sa, sa], 2, 'contraste'));
      wall.marks.push({ id: 'cortinas', kind: 'cruz', at: P(dx, H - dh - 40), label: 'Cortinas: cósela por detrás, 4 cm sobre la puerta' });
    }
  }
  if (t.shutters) {
    const w = f.wins[0], pc = rect4('persiana', 'Persiana enrollable de la ventana (tela y forro)', ww + 80, wh + 80, ['arriba', 'lado', 'bajo', 'lado-b'], [sa, sa, sa, sa], 2, 'contraste');
    pieces.push(pc, rect4('tira-persiana', 'Tira con velcro de la persiana', 30, 160, ['a', 'b', 'c', 'd'], [sa, sa, sa, sa], 4));
    const wall = pieces.find(x => x.id === 'pared' || x.id === 'panel-ventana');
    if (wall && wall.id === 'pared') place(wall, 'persiana', [P(w.cx - ww / 2 - 40, w.cy - wh / 2 - 60), P(w.cx + ww / 2 + 40, w.cy - wh / 2 - 60)], 'Persiana: se cose por arriba', false);
  }
  // Art (front view): roof above, wall below the rod at y = Hr.
  const roofPoly = [P(W / 2, 0), P(W, Hr), P(0, Hr)], wallBox = (x0: number, w: number) => [P(x0, Hr), P(x0 + w, Hr), P(x0 + w, Hr + H), P(x0, Hr + H)];
  art.push({ pts: roofPoly, role: t.prints?.includes('tejado') ? 'tejado-rayas' : 'tejado' });
  decos.filter(d => d.on === 'tejado').forEach(d => art.push({ pts: d.poly, role: d.color }));
  if (t.attic) { const a = windowShape('cruz', W / 2, 0.55 * Hr, 0.12 * W, 0.1 * W); art.push({ pts: a.poly, role: 'hueco' }, ...a.bars.map(b => ({ pts: b, role: 'blanco', line: 10 })), { pts: a.poly, role: 'blanco', line: 8, closed: true }); }
  const wallsArt = (dx0: number, dy: number) => (q: Pt) => P(q.x + dx0, q.y + dy);
  if (door === 'paneles') {
    const ws = [0.16, 0.38, 0.46].map(x => x * W); let x0 = 0;
    ws.forEach((w, i) => { art.push({ pts: wallBox(x0, w), role: t.prints?.includes('pared') ? 'pared-rayas' : 'pared' }); if (i === 2) { const sh = windowShape(t.window, x0 + w / 2, Hr + 0.42 * H, ww, wh); art.push({ pts: sh.poly, role: 'hueco' }, { pts: sh.poly, role: 'contraste', line: 18, closed: true }, ...sh.bars.map(b => ({ pts: b, role: 'contraste', line: 14 }))); } if (i === 1) art.push(...[0.25, 0.75].map(fx => ({ pts: [P(x0 + w * fx, Hr + 60), P(x0 + w * fx, Hr + 0.45 * H)], role: 'pared-borde', line: 10 }))); x0 += w; });
  } else {
    const wall = tagged(wallSegs(W, H, { x: dx, w: dw, h: dh, arch: door === 'arco' || t.window === 'arco' })).pts.map(wallsArt(0, Hr));
    const doorHole = [P(dx - dw / 2, Hr + H), P(dx + dw / 2, Hr + H), P(dx + dw / 2, Hr + H - dh), P(dx - dw / 2, Hr + H - dh)];
    art.push({ pts: doorHole, role: 'hueco' });
    if (door === 'cortinas') { const top = Hr + H - dh + 10; art.push({ pts: [P(dx - dw / 2 - 10, top), P(dx - 0.05 * dw, top), P(dx - 0.28 * dw, Hr + H - 0.45 * dh), P(dx - 0.2 * dw, Hr + H), P(dx - dw / 2 - 10, Hr + H)], role: t.prints?.includes('cortinas') ? 'cortina-lunares' : 'cortina' }, { pts: [P(dx + 0.05 * dw, top), P(dx + dw / 2 + 10, top), P(dx + dw / 2 + 10, Hr + H), P(dx + 0.2 * dw, Hr + H), P(dx + 0.28 * dw, Hr + H - 0.45 * dh)], role: t.prints?.includes('cortinas') ? 'cortina-lunares' : 'cortina' }); }
    art.push({ pts: wall, role: t.prints?.includes('pared') ? 'pared-rayas' : 'pared' });
    f.wins.forEach(w0 => { const sh = windowShape(t.window, w0.cx, Hr + w0.cy, w0.w, w0.h); art.push({ pts: sh.poly, role: 'hueco' }, { pts: sh.poly, role: 'contraste', line: 18, closed: true }, ...sh.bars.map(b => ({ pts: b, role: 'contraste', line: 14 }))); });
    decos.filter(d => d.on === 'pared').forEach(d => art.push({ pts: d.poly.map(wallsArt(0, Hr)), role: d.color }));
  }
  if (t.shutters) { const w = f.wins[0], x = door === 'paneles' ? 0.54 * W + 0.23 * W : w.cx; art.push({ pts: [P(x - ww / 2 - 30, Hr + w.cy - wh / 2 - 60), P(x + ww / 2 + 30, Hr + w.cy - wh / 2 - 60), P(x + ww / 2 + 30, Hr + w.cy - wh / 2 + 10), P(x - ww / 2 - 30, Hr + w.cy - wh / 2 + 10)], role: 'contraste' }); }
  if (vs !== 'ninguno') art.push({ pts: valanceShape(vs, W, units(W), sa).map(q => P(q.x, q.y + Hr - 30)), role: t.prints?.includes('faldon') ? 'faldon-lunares' : 'faldon' });
  art.push({ pts: [P(-40, Hr - 6), P(W + 40, Hr - 6)], role: 'barra', line: 22 });
  const bias = sumBias(f.wins.map(w => windowShape(t.window, w.cx, w.cy, w.w, w.h).poly)) + (door === 'paneles' ? 0 : dw + 2 * dh);
  return {
    pieces, seams, art, size: { key: 'ancho', label: 'Ancho de la barra', target: W, measured: W },
    notes: [{ level: 'ok', code: 'casita-rincon', message: `${t.name}: tejado de ${cm(W)} × ${cm(Hr)} con faldón de ${vs === 'ninguno' ? 'borde recto' : vs}, pared de ${cm(H)} con puerta ${door === 'paneles' ? 'de panel enrollable' : door === 'arco' ? 'en arco' : 'con cortinas'} y ventana ${t.window}.` }],
    materials: [{ id: 'barra', label: 'Barra de rincón (telescópica o de cortina con soportes)', qty: cm(W + 100) }, { id: 'gancho', label: 'Gancho fuerte para el vértice del tejado (con taco)', qty: '1' }, { id: 'anilla', label: 'Anilla de 3 cm para la presilla', qty: '1' }, { id: 'bies', label: 'Bies de 2,5 cm para ventanas y puerta', qty: cm(Math.ceil((bias + 600) / 100) * 100) }, { id: 'velcro', label: 'Velcro de 2 cm', qty: '40 cm' }],
    steps: [
      { id: 'tejado', title: 'Tejado', detail: `Cose los apliques del tejado. Mete el faldón entre tela y forro en la base y cose los lados y la base; voltea por el vértice, cose la presilla con su anilla y la jareta por detrás.`, pieces: ['tejado', 'faldon', 'jareta-tejado'] },
      { id: 'pared', title: 'Pared', detail: `Corta ${door === 'paneles' ? 'las ventanas de los paneles' : 'la ventana y la puerta'} por sus líneas y ribetéalas con bies; cose las barras de la ventana. Haz los dobladillos de los lados y del bajo y la jareta de arriba para la barra.`, pieces: ['pared', 'panel-ventana'] },
      { id: 'montar', title: 'Cuelga la casita', detail: 'Fija la barra en la esquina y el gancho en el vértice. Pasa la pared y el tejado por la barra y engancha la anilla.', pieces: ['tejado'] }
    ]
  };
}

function table(p: Params, sa: number): HouseLayout {
  const t = themeOf(p), L = num(p, 'largo'), Wd = num(p, 'fondo'), H = num(p, 'alto'), vs = valanceOf(p, t), open = str(p, 'esquinas') === 'abiertas';
  const dw = Math.max(320, Math.min(480, 0.3 * L)), dh = Math.min(0.72 * H, H - 160), dx = L / 2, ww = Math.min(300, 0.2 * L), wh = Math.min(280, 0.36 * H), wy = 0.42 * H;
  const frontWins = L >= 1000 ? [{ cx: 0.16 * L + 30, cy: wy, w: ww, h: wh }, { cx: 0.84 * L - 30, cy: wy, w: ww, h: wh }] : [{ cx: 0.8 * L, cy: wy, w: Math.min(ww, 0.24 * L), h: wh }];
  const f: Frame = { W: L, H, door: { x: dx, w: dw, h: dh }, wins: frontWins }, decos = fitDecos(t.decor(f), f, tagged(wallSegs(L, H, { x: dx, w: dw, h: dh, arch: t.door === 'arco' })).pts, valanceDepthOf(vs, L, sa)), pieces: Piece[] = [], seams: SeamRelation[] = [], art: HouseArt[] = [];
  const top = rect4('techo', 'Techo (sobre la mesa)', L, Wd, ['largo', 'ancho', 'largo-b', 'ancho-b'], [sa, sa, sa, sa], 1);
  const hems: Record<string, number> = { bajo: 30, 'bajo-b': 30, ...(open ? { lado: 20, 'lado-b': 20 } : {}) };
  const front = segPiece('pared-frente', 'Pared de delante con puerta', wallSegs(L, H, { x: dx, w: dw, h: dh, arch: t.door === 'arco' }), sa, 1, { hems, raw: ['puerta'] });
  addWindows(front, f, t.window);
  const back = segPiece('pared-trasera', 'Pared de atrás', wallSegs(L, H), sa, 1, { hems });
  addWindows(back, { ...f, wins: [{ cx: L / 2, cy: wy, w: ww, h: wh }] }, t.window);
  const side = segPiece('pared-lateral', 'Pared lateral (2)', wallSegs(Wd, H), sa, 2, { hems });
  addWindows(side, { ...f, W: Wd, wins: [{ cx: Wd / 2, cy: wy, w: Math.min(ww, 0.4 * Wd), h: wh }] }, t.window);
  pieces.push(top, front, back, side, ...decoPieces(decos, front, 'pared'));
  seams.push(
    equal('frente-techo', 'Pared de delante con el techo', [{ pieceId: front.id, edgeIds: runIds(front, 'arriba') }], [{ pieceId: top.id, edgeIds: ['largo'] }], 1),
    equal('trasera-techo', 'Pared de atrás con el techo', [{ pieceId: back.id, edgeIds: runIds(back, 'arriba') }], [{ pieceId: top.id, edgeIds: ['largo-b'] }], 1),
    equal('lateral-techo', 'Pared lateral con el techo', [{ pieceId: side.id, edgeIds: runIds(side, 'arriba') }], [{ pieceId: top.id, edgeIds: ['ancho'] }], 1)
  );
  if (!open) seams.push(equal('esquina', 'Esquinas: delante con lateral', [{ pieceId: front.id, edgeIds: runIds(front, 'lado') }], [{ pieceId: side.id, edgeIds: runIds(side, 'lado-b') }], 1));
  if (vs !== 'ninguno') {
    for (const [id, len, name] of [['faldon-largo', L, 'Faldón largo (2 de tela y 2 de forro)'], ['faldon-ancho', Wd, 'Faldón corto (2 de tela y 2 de forro)']] as const) {
      const pc = valancePiece(id, name, vs, len, sa, 4);
      pieces.push(pc);
      seams.push(equal(id, `${name.split(' (')[0]} con el techo`, [{ pieceId: pc.id, edgeIds: runIds(pc, 'union') }], [{ pieceId: top.id, edgeIds: [id === 'faldon-largo' ? 'largo' : 'ancho'] }], 1));
    }
  }
  if (t.door === 'cortinas') pieces.push(rect4('cortina', 'Cortina de la puerta (2)', 0.75 * dw + 40, dh + 60, ['arriba', 'lado', 'bajo', 'lado-b'], [40, 20, 30, 20], 2, 'contraste', [true, true, true, true]), rect4('alzapano', 'Alzapaño con velcro (doblado)', 60, 220, ['a', 'b', 'c', 'd'], [sa, sa, sa, sa], 2, 'contraste'));
  if (t.door === 'enrollable') { pieces.push(rect4('puerta-enrollable', 'Puerta enrollable (tela y forro)', dw + 80, dh + 60, ['arriba', 'lado', 'bajo', 'lado-b'], [sa, sa, sa, sa], 2, 'contraste'), rect4('tira-puerta', 'Tira con velcro para recogerla', 40, 200, ['a', 'b', 'c', 'd'], [sa, sa, sa, sa], 4)); place(front, 'puerta-enrollable', [P(dx - dw / 2 - 40, H - dh - 50), P(dx + dw / 2 + 40, H - dh - 50)], 'Puerta enrollable: se cose por arriba', false); }
  if (t.shutters) pieces.push(rect4('persiana', 'Persiana enrollable de cada ventana (tela y forro)', ww + 80, wh + 80, ['arriba', 'lado', 'bajo', 'lado-b'], [sa, sa, sa, sa], 2 * (frontWins.length + 3), 'contraste'), rect4('tira-persiana', 'Tira con velcro de la persiana', 30, 160, ['a', 'b', 'c', 'd'], [sa, sa, sa, sa], 2 * (frontWins.length + 3)));
  if (open) pieces.push(rect4('tira-esquina', 'Tira con velcro para cerrar las esquinas', 40, 120, ['a', 'b', 'c', 'd'], [sa, sa, sa, sa], 12));
  // Art: front wall with the side wall and top in perspective.
  const dxp = 0.45 * Wd, dyp = 0.28 * Wd, skew = (q: Pt) => P(L + (q.x / Wd) * dxp, q.y - (q.x / Wd) * dyp);
  art.push({ pts: [P(0, 0), P(L, 0), P(L + dxp, -dyp), P(dxp, -dyp)], role: 'techo' });
  art.push({ pts: [P(L, 0), P(L + dxp, -dyp), P(L + dxp, H - dyp), P(L, H)], role: t.prints?.includes('pared') ? 'pared-rayas-sombra' : 'pared-sombra' });
  { const sh = windowShape(t.window, Wd / 2, wy, Math.min(ww, 0.4 * Wd), wh); art.push({ pts: sh.poly.map(skew), role: 'hueco' }, { pts: sh.poly.map(skew), role: 'contraste', line: 14, closed: true }); }
  art.push({ pts: [P(dx - dw / 2, H), P(dx + dw / 2, H), P(dx + dw / 2, H - dh), P(dx - dw / 2, H - dh)], role: 'hueco' });
  if (t.door === 'cortinas') { const tp = H - dh + 10; art.push({ pts: [P(dx - dw / 2 - 10, tp), P(dx - 0.05 * dw, tp), P(dx - 0.28 * dw, H - 0.45 * dh), P(dx - 0.2 * dw, H), P(dx - dw / 2 - 10, H)], role: t.prints?.includes('cortinas') ? 'cortina-lunares' : 'cortina' }, { pts: [P(dx + 0.05 * dw, tp), P(dx + dw / 2 + 10, tp), P(dx + dw / 2 + 10, H), P(dx + 0.2 * dw, H), P(dx + 0.28 * dw, H - 0.45 * dh)], role: t.prints?.includes('cortinas') ? 'cortina-lunares' : 'cortina' }); }
  art.push({ pts: tagged(wallSegs(L, H, { x: dx, w: dw, h: dh, arch: t.door === 'arco' })).pts, role: t.prints?.includes('pared') ? 'pared-rayas' : 'pared' });
  if (t.door === 'enrollable') art.push({ pts: rrect(dx - dw / 2 - 30, H - dh - 60, dw + 60, 70, 35), role: 'contraste' });
  frontWins.forEach(w => { const sh = windowShape(t.window, w.cx, w.cy, w.w, w.h); art.push({ pts: sh.poly, role: 'hueco' }, { pts: sh.poly, role: 'contraste', line: 14, closed: true }, ...sh.bars.map(b => ({ pts: b, role: 'contraste', line: 12 }))); if (t.shutters) art.push({ pts: rrect(w.cx - w.w / 2 - 30, w.cy - w.h / 2 - 50, w.w + 60, 60, 30), role: 'contraste' }); });
  decos.filter(d => d.on === 'pared').forEach(d => art.push({ pts: d.poly, role: d.color }));
  if (vs !== 'ninguno') { art.push({ pts: valanceShape(vs, L, units(L), sa), role: t.prints?.includes('faldon') ? 'faldon-lunares' : 'faldon' }); art.push({ pts: valanceShape(vs, Wd, units(Wd), sa).map(skew), role: 'faldon-sombra' }); }
  const bias = sumBias([...frontWins, { cx: 0, cy: 0, w: ww, h: wh }, { cx: 0, cy: 0, w: ww, h: wh }, { cx: 0, cy: 0, w: ww, h: wh }].map(w => windowShape(t.window, w.cx, w.cy, w.w, w.h).poly)) + dw + 2 * dh;
  return {
    pieces, seams, art, size: { key: 'largo', label: 'Largo de la mesa', target: L, measured: L },
    notes: [{ level: 'ok', code: 'casita-mesa', message: `${t.name}: funda para una mesa de ${cm(L)} × ${cm(Wd)} y ${cm(H)} de alto (mide la tuya con el tablero), puerta de ${cm(dw)} × ${cm(dh)} y ${frontWins.length + 3} ventanas.` }],
    materials: [{ id: 'bies', label: 'Bies de 2,5 cm para ventanas y puerta', qty: cm(Math.ceil((bias + 600) / 100) * 100) }, { id: 'velcro', label: 'Velcro de 2 cm', qty: open ? '120 cm' : '40 cm' }],
    steps: [
      { id: 'apliques', title: 'Apliques y ventanas', detail: 'Cose los apliques de la pared de delante. Corta las ventanas y la puerta por sus líneas, ribetéalas con bies y cose las barras.', pieces: ['pared-frente', 'pared-trasera', 'pared-lateral'] },
      { id: 'techo', title: 'Techo y paredes', detail: `${vs !== 'ninguno' ? 'Hilvana los faldones en los bordes del techo. ' : ''}Cose cada pared al techo por su canto de arriba${open ? '' : ' y une las esquinas'}.`, pieces: ['techo', 'pared-frente', 'pared-trasera', 'pared-lateral'] },
      { id: 'acabado', title: 'Acabado', detail: `Haz el dobladillo del bajo${open ? ', remata los cantos de las esquinas y cose las tiras con velcro' : ''}. Pon la funda sobre la mesa.`, pieces: ['pared-frente'] }
    ]
  };
}

// ------------------------------------------------------------------ Generators
const L_ = (key: string, label: string, min: number, max: number): ParamDef => ({ key, label, group: 'diseno', type: 'length', min, max });
const themeParam: ParamDef = { key: 'tema', label: 'Tema', group: 'diseno', type: 'choice', choices: THEME_IDS.map(id => ({ value: id, label: THEMES[id].name })) };
const valanceParam: ParamDef = { key: 'faldon', label: 'Faldón', group: 'diseno', type: 'choice', choices: [['tema', 'El del tema'], ['ondas', 'Ondas'], ['goteo', 'Goteo de glaseado'], ['picos', 'Picos'], ['hojas', 'Hojas'], ['almenas', 'Almenas'], ['ninguno', 'Sin faldón']].map(([value, label]) => ({ value, label })) };
const M: ParamDef = { key: 'margen', label: 'Margen de costura', group: 'margenes', type: 'length', min: 6, max: 15 };
interface Def { id: string; name: string; summary: string; params: ParamDef[]; defaults: Params; make: (p: Params, sa: number) => HouseLayout }
const DEFS: Def[] = [
  { id: 'casita-rincon', name: 'Casita de rincón', summary: 'Tejado triangular que cuelga de la esquina, faldón decorado y pared de cortina en una barra.', make: corner,
    params: [L_('ancho', 'Ancho de la barra', 900, 1600), L_('alto', 'Alto de la pared', 700, 1300), L_('altoTejado', 'Alto del tejado', 500, 1000), themeParam, valanceParam, M], defaults: { ancho: 1300, alto: 980, altoTejado: 850, tema: 'sencilla', faldon: 'tema' } },
  { id: 'casita-mesa', name: 'Casita de mesa', summary: 'Funda de mesa con techo, cuatro paredes, puerta y ventanas.', make: table,
    params: [L_('largo', 'Largo de la mesa', 700, 1800), L_('fondo', 'Fondo de la mesa', 500, 1000), L_('alto', 'Alto de la mesa', 450, 800), themeParam, valanceParam, { key: 'esquinas', label: 'Esquinas', group: 'diseno', type: 'choice', choices: [{ value: 'cosidas', label: 'Cosidas' }, { value: 'abiertas', label: 'Abiertas con velcro' }] }, M], defaults: { largo: 1200, fondo: 700, alto: 720, tema: 'jardin', faldon: 'tema', esquinas: 'cosidas' } }
];
export const PLAYHOUSE_IDS = DEFS.map(d => d.id);
const full = (d: Def, p: Params): Params => ({ margen: 10, ...d.defaults, ...p });
export function playhouseLayout(id: string, p: Params) { const d = DEFS.find(x => x.id === id)!, q = full(d, p); return d.make(q, num(q, 'margen')); }
function build(d: Def, p: Params): GeneratorResult {
  const sa = num(p, 'margen');
  for (const def of d.params) if (def.type === 'length' && !(num(p, def.key) >= def.min! && num(p, def.key) <= def.max!)) return invalid('casita-medidas', `${def.label}: de ${cm(def.min!)} a ${cm(def.max!)}.`);
  const L = d.make(p, sa);
  return {
    pieces: L.pieces, seams: L.seams,
    notices: [exp(d.name), { level: 'aviso', code: 'casita-seguridad', message: 'Seguridad: fija la barra, el gancho o la funda para que no se caigan; nada de cordones (alzapaños y persianas con velcro) y apliques bien cosidos. La casita no es para colgarse de ella ni para dormir dentro sin vigilancia.' }, ...L.notes],
    checks: [{ key: L.size.key, label: L.size.label, target: L.size.target, measured: L.size.measured, tolerance: 1 }],
    materials: [{ id: 'tela', label: 'Loneta o lona de algodón para paredes y tejado', qty: 'Ver piezas (ancho de 150 cm)' }, { id: 'contraste', label: 'Tela de contraste para faldón, cortinas y apliques', qty: 'Ver piezas' }, { id: 'entretela', label: 'Entretela termoadhesiva de doble cara para los apliques', qty: 'Retales' }, ...L.materials, { id: 'hilo', label: 'Hilo resistente', qty: '2' }],
    assumptions: [`Piezas a tamaño real con ${cm(sa)} de margen; dobladillos y jaretas incluidos. Ventanas y puerta se cortan por su línea y se ribetean con bies.`],
    steps: L.steps
  };
}
export const PLAYHOUSE_GENERATORS: PatternGenerator[] = DEFS.map(d => ({
  id: d.id, name: d.name, status: 'experimental', summary: d.summary, requiredMeasures: [], optionalMeasures: [], params: d.params,
  defaults: () => full(d, {}),
  generate: (ctx: GeneratorContext, params: Params) => { void ctx; return build(d, full(d, params)); }
}));
