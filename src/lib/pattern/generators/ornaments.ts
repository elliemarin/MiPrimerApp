import { num, str, type GeneratorContext, type GeneratorResult, type ParamDef, type Params, type PatternGenerator } from '../generator';
import type { FabricRole, Issue, Piece, SeamRelation } from '../types';
import type { Pt } from '../../geom/vec';
import { P, cm, edge, equal, invalid, rectangle } from './kidsShared';
import { exp, plush, runLength, type A } from './toyKit';
import { polyRuns } from './cushionKit';
import { circle, ellipse, leaf, pos, rect, rrect, svg, uni, type Shape } from '../../applique/shapes';
import { differencePolygons, intersectPolygons, offsetPolygons, polygonArea, strokePolyline } from '../../geom/polyoffset';
import { insidePoly, near } from './shapeKit';
import { heart } from './sensoryKit';
import { ORNAMENT_DIGITS } from './ornamentDigits';

/* Adornos navideños (2026-11-11), rehechos como diseños propios a partir de 9
 * fotos de la usuaria: casita nevada, reno, galleta de jengibre, árbol por capas,
 * árbol escalonado de retales, figuritas del calendario de adviento y bota
 * navideña. Los adornos pequeños son de fieltro: cada pieza se corta por su
 * contorno y lleva marcada la puntada (festón o pespunte a mano) a unos mm del
 * borde; los apliques se marcan en su sitio para coserlos o proyectarlos. La
 * bota es de tela, forrada y con margen, como cualquier patrón de Hilvana. */

// ------------------------------------------------------------------ Geometry helpers (design units ≈ mm)
const area = (p: Pt[]) => Math.abs(polygonArea(p));
const largest = (s: Pt[][]) => pos([...s].sort((a, b) => area(b) - area(a))[0]);
/** Rounds concave bends (closing) and convex corners (opening). */
const roundP = (shape: Shape | Pt[], close: number, open = close): Pt[] => {
  let s: Pt[][] = Array.isArray((shape as Pt[][])[0]) ? (shape as Pt[][]).map(pos) : [pos(shape as Pt[])];
  if (close > 0) s = offsetPolygons(offsetPolygons(s, close), -close);
  if (open > 0) s = offsetPolygons(offsetPolygons(s, -open), open);
  return largest(s);
};
const one = (s: Shape) => largest(s);
const both = (a: Pt[], b: Pt[]) => one(intersectPolygons([pos(a)], [pos(b)]));
const minusP = (a: Pt[], ...b: Pt[][]) => one(differencePolygons([pos(a)], b.map(pos)));
const strokeP = (pts: Pt[], w: number) => largest(strokePolyline(pts, w));
const turnP = (pts: Pt[], deg: number, c = P(0, 0)) => { const a = (deg * Math.PI) / 180, co = Math.cos(a), si = Math.sin(a); return pts.map(q => P(c.x + (q.x - c.x) * co - (q.y - c.y) * si, c.y + (q.x - c.x) * si + (q.y - c.y) * co)); };
const moveP = (pts: Pt[], dx: number, dy: number) => pts.map(q => P(q.x + dx, q.y + dy));
const flipP = (pts: Pt[]) => pts.map(q => P(-q.x, q.y)).reverse();
const box = (x0: number, y0: number, x1: number, y1: number) => [P(x0, y0), P(x1, y0), P(x1, y1), P(x0, y1)];
const arch = (cx: number, top: number, w: number, bottom: number) => one(uni(rect(cx - w / 2, top + w / 2, w, bottom - top - w / 2), circle(cx, top + w / 2, w / 2, 48)));
/** Five-pointed star with rounded points. */
const starP = (cx: number, cy: number, R: number, r: number, round = 0.1 * R) => {
  const pts = Array.from({ length: 10 }, (_, i) => { const a = -Math.PI / 2 + (i * Math.PI) / 5, rr = i % 2 ? r : R; return P(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr); });
  return largest(offsetPolygons(offsetPolygons([pos(pts)], -round), round));
};
/** Smooth line through points (Catmull-Rom). */
function curvePts(pts: Pt[], n = 10): Pt[] {
  const out: Pt[] = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(pts.length - 1, i + 2)];
    for (let j = 0; j < n; j++) { const t = j / n, t2 = t * t, t3 = t2 * t; out.push(P(0.5 * (2 * p1.x + (-p0.x + p2.x) * t + (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 + (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3), 0.5 * (2 * p1.y + (-p0.y + p2.y) * t + (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 + (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3))); }
  }
  out.push(pts[pts.length - 1]);
  return out;
}
/** Wavy line from a to b (icing, cuff edges). */
const wave = (a: Pt, b: Pt, amp: number, waves: number) => { const dx = b.x - a.x, dy = b.y - a.y, L = Math.hypot(dx, dy), nx = -dy / L, ny = dx / L, n = Math.max(12, waves * 8); return Array.from({ length: n + 1 }, (_, i) => { const t = i / n, s = amp * Math.sin(t * waves * 2 * Math.PI); return P(a.x + dx * t + nx * s, a.y + dy * t + ny * s); }); };
/** Region above (or below) a wavy horizontal line, as wide as needed. */
const waveRegion = (y: number, amp: number, period: number, above: boolean, x0 = -400, x1 = 400) => { const line = wave(P(x0, y), P(x1, y), amp, Math.round((x1 - x0) / period)); return pos([...line, P(x1, above ? y - 2000 : y + 2000), P(x0, above ? y - 2000 : y + 2000)]); };
const asterisk = (c: Pt, r: number): Pt[][] => [0, 60, 120].map(a => { const t = (a * Math.PI) / 180; return [P(c.x - r * Math.cos(t), c.y - r * Math.sin(t)), P(c.x + r * Math.cos(t), c.y + r * Math.sin(t))]; });
const bow = (cx: number, cy: number, w: number, deg = 0) => {
  const h = 0.62 * w, wing = one(uni(pos([P(0, -0.14 * h), P(-0.4 * w, -0.5 * h), P(-0.4 * w, 0.5 * h), P(0, 0.14 * h)]), ellipse(-0.38 * w, 0, 0.12 * w, 0.5 * h, 0, 32)));
  const s = roundP(uni(wing, pos(flipP(wing))), 0.03 * w, 0.03 * w);
  return { bow: turnP(moveP(s, cx, cy), deg, P(cx, cy)), knot: turnP(moveP(rrect(-0.11 * w, -0.2 * w, 0.22 * w, 0.4 * w, 0.05 * w), cx, cy), deg, P(cx, cy)) };
};
/** Santa hat (body, brim, pompom), brim centred at (0, 0) and pointing up, then turned and moved. */
const santaHat = (w: number, deg: number, at: Pt) => {
  const k = w / 46, T = (pts: Pt[]) => moveP(turnP(pts.map(q => P(q.x * k, q.y * k)), deg), at.x, at.y);
  const body = roundP(pos(curvePts([P(-19, 2), P(-15, -16), P(-4, -31), P(12, -36), P(26, -31), P(31, -24), P(22, -21), P(17, -12), P(19, 2)], 6)), 0, 2);
  return { body: T(body), brim: T(rrect(-23, -5, 46, 12, 5)), pompom: T(wavyCircle(30, -24, 6.4, 0.7, 9)) };
};
const wavyCircle = (cx: number, cy: number, r: number, amp: number, lobes: number) => pos(Array.from({ length: 96 }, (_, i) => { const t = (i / 96) * 2 * Math.PI, rr = r + amp * Math.cos(lobes * t); return P(cx + rr * Math.cos(t), cy + rr * Math.sin(t)); }));
const scallops = (x0: number, x1: number, y: number, n: number) => { const s = (x1 - x0) / n; return Array.from({ length: n }, (_, i) => circle(x0 + s * (i + 0.5), y, s / 2, 32)); };
/** Holly leaf: an ellipse with bites along both edges. */
const holly = (a: Pt, b: Pt, w: number) => {
  const base = leaf(a.x, a.y, b.x, b.y, w), dx = b.x - a.x, dy = b.y - a.y, L = Math.hypot(dx, dy), nx = -dy / L, ny = dx / L, bites: Pt[][] = [];
  for (const t of [0.3, 0.55, 0.78]) for (const sg of [-1, 1]) { const half = (w / 2) * Math.pow(Math.sin(Math.PI * t), 0.85); bites.push(circle(a.x + dx * t + nx * sg * (half + 0.18 * w), a.y + dy * t + ny * sg * (half + 0.18 * w), 0.3 * w, 20)); }
  return roundP(differencePolygons([pos(base)], bites.map(pos)), 0, 0.03 * w);
};
const digitShape = (text: string, cx: number, cy: number, h: number): Pt[][] => {
  let adv = 0; const rings: Pt[][] = [];
  for (const ch of text) { const g = ORNAMENT_DIGITS[ch]; if (!g) continue; for (const ring of svg(g.d)) rings.push(ring.map(q => P(q.x + adv, q.y))); adv += g.advance; }
  const xs = rings.flat().map(q => q.x), ys = rings.flat().map(q => q.y), k = h / (Math.max(...ys) - Math.min(...ys)), mx = (Math.max(...xs) + Math.min(...xs)) / 2, my = (Math.max(...ys) + Math.min(...ys)) / 2;
  return rings.map(r => r.map(q => P(cx + (q.x - mx) * k, cy + (q.y - my) * k)));
};

// ------------------------------------------------------------------ Design model
export interface OrnPart {
  id: string; name: string; color: string;
  /** Where each copy sits on the finished ornament; the piece is cut as the first one. */
  at: Pt[][];
  /** Layers per copy (2 for parts made of front and back). */
  layers?: number;
  /** Copies are left/right mirror images. */
  mirror?: boolean;
  /** `entre`: inserted between front and back; `aplique`: sewn on top. */
  kind: 'entre' | 'aplique';
  /** Piece it is sewn on (default the body). */
  on?: string;
}
export interface OrnEmb { pts: Pt[]; label: string; color: string; w?: number; on?: string }
export interface OrnDot { at: Pt; r: number; color: string; label: string; kind: 'boton' | 'punto' }
export interface OrnPaint { shape: Pt[][]; color: string; label: string; on?: string }
interface Step { id: string; title: string; detail: string }
interface Design {
  body: Pt[]; bodyName: string; bodyQty: number; bodyMirror?: boolean; bodyColor: string;
  parts: OrnPart[]; emb: OrnEmb[]; dots: OrnDot[]; paint: OrnPaint[]; loop: Pt;
  notes: string[]; steps: Step[]; materials: { id: string; label: string; qty: string }[];
}
export interface OrnArt { pts: Pt[]; role: string; line?: number; dash?: boolean; closed?: boolean; rings?: Pt[][]; stitchOn?: string }
const D = (d: Partial<Design> & Pick<Design, 'body' | 'bodyName' | 'bodyColor'>): Design => ({ bodyQty: 2, parts: [], emb: [], dots: [], paint: [], loop: P(0, 0), notes: [], steps: [], materials: [], ...d });
const part = (id: string, name: string, color: string, at: Pt[][], o: Partial<OrnPart> = {}): OrnPart => ({ id, name, color, at, kind: 'aplique', ...o });

// ------------------------------------------------------------------ Designs (own, at their reference size)
function house(p: Params): Design {
  const deco = str(p, 'adorno'), twoWindows = deco !== 'corazon';
  const body = roundP(pos([P(0, 7), P(45, 47), P(39, 50), P(39, 110), P(-39, 110), P(-39, 50), P(-45, 47)]), 2, 3);
  const outer = pos([P(0, 0), P(57, 52), P(-57, 52)]), inner = moveP(outer, 0, 16);
  const band = both(minusP(outer, inner), box(-49, -5, 49, 50));
  const bumps = [-1, 1].flatMap(sg => [0.2, 0.38, 0.56, 0.74, 0.92].map(t => circle(sg * 49 * t, 16 + 49 * t * (52 / 57), 5.2, 28)));
  const snow = roundP(uni(band, ...bumps), 1.2, 1.2);
  const chimney = rrect(19, 3, 12, 38, 1.5), cap = roundP(uni(rect(17, 1, 16, 8), ...scallops(17, 33, 9, 3)), 0.8, 0.8);
  const win = (cx: number, cy: number) => ({ frame: rrect(cx - 9.5, cy - 9, 19, 18, 2.5), glass: rrect(cx - 7, cy - 6.5, 14, 13, 1.2), cx, cy });
  const wins = twoWindows ? [win(-22, 67), win(22, 67)] : [win(-21, 69)];
  const dx = twoWindows ? 0 : 15, frame = arch(dx, 72, 28, 104), door = arch(dx, 75, 22, 104);
  const parts: OrnPart[] = [
    part('chimenea', 'Chimenea (2 capas, entra entre delantero y trasero)', 'chimenea', [chimney], { kind: 'entre', layers: 2 }),
    part('nieve-chimenea', 'Nieve de la chimenea', 'nieve', [cap], { on: 'chimenea' }),
    part('tejado', 'Tejado nevado', 'nieve', [snow]),
    part('marco-ventana', 'Marco de la ventana', 'blanco', wins.map(w => w.frame)),
    part('cristal', 'Cristal de la ventana', 'amarillo', wins.map(w => w.glass), { on: 'marco-ventana' }),
    part('marco-puerta', 'Marco de la puerta', 'blanco', [frame]),
    part('puerta', 'Puerta', 'puerta', [door], { on: 'marco-puerta' })
  ];
  if (deco === 'estrella') parts.push(part('estrella', 'Estrella', 'amarillo', [starP(0, 37, 9, 4.2)]));
  if (deco === 'corazon') parts.push(part('corazon', 'Corazón', 'rojo', [heart(0, 38, 17)]));
  const emb: OrnEmb[] = [
    ...wins.flatMap(w => [[P(w.cx, w.cy - 6.5), P(w.cx, w.cy + 6.5)], [P(w.cx - 7, w.cy), P(w.cx + 7, w.cy)]].map((pts, i) => ({ pts, label: i ? '' : 'Cruz de la ventana: pespunte blanco', color: 'hilo', w: 1.6, on: 'cristal' }))),
    ...[-5.5, 0, 5.5].map((x, i) => ({ pts: [P(dx + x, x ? 80 : 77), P(dx + x, 102)], label: i ? '' : 'Tablas de la puerta: pespunte', color: 'hilo', w: 0.9, on: 'puerta' }))
  ];
  return D({
    body, bodyName: 'Casita: delantero y trasero', bodyColor: 'cuerpo', parts, emb, loop: P(0, 7),
    dots: [{ at: P(dx + 7, 92), r: 1.5, color: 'dorado', label: 'Pomo: cuenta dorada o nudo francés', kind: 'boton' }],
    steps: [{ id: 'apliques', title: 'Apliques', detail: `Cose el marco y la puerta, ${twoWindows ? 'las ventanas' : 'la ventana'} y el tejado nevado sobre el delantero con puntadas pequeñas; borda la cruz de la ventana y las tablas de la puerta.` }, { id: 'chimenea', title: 'Chimenea', detail: 'Cose la nieve en la chimenea y une sus dos capas por el borde.' }]
  });
}

function reindeer(p: Params): Design {
  const acc = str(p, 'accesorio');
  const head = roundP(pos(curvePts([P(0, 40), P(14, 40.5), P(25, 46), P(31, 58), P(31, 70), P(27, 83), P(16, 95), P(0, 99), P(-16, 95), P(-27, 83), P(-31, 70), P(-31, 58), P(-25, 46), P(-14, 40.5), P(0, 40)], 6)), 0, 0);
  const ear = pos(leaf(21, 53, 47, 45, 15)), earIn = pos(leaf(27, 51.5, 43, 46.5, 7.5));
  const antler = roundP(uni(strokeP([P(9, 47), P(12, 33), P(15, 21), P(18, 10), P(20, 2)], 8), strokeP([P(12.5, 31), P(6, 23), P(3.5, 15)], 6.5), strokeP([P(15.5, 21), P(25, 16), P(31, 8)], 6.5)), 1.6, 0);
  const parts: OrnPart[] = [
    part('cuerno', 'Cuerno (2 capas por lado, uno en espejo)', 'cuerno', [antler, flipP(antler)], { kind: 'entre', layers: 2, mirror: true }),
    part('oreja', 'Oreja (entra entre las capas)', 'cuerpo', [ear, flipP(ear)], { kind: 'entre', mirror: true }),
    part('oreja-dentro', 'Interior de la oreja', 'rosa', [earIn, flipP(earIn)], { mirror: true, on: 'oreja' }),
    part('hocico', 'Hocico', 'crema', [ellipse(0, 79, 19, 13, 0, 48)]),
    part('nariz', 'Nariz (rellena un poco)', 'rojo', [ellipse(0, 69.5, 7.5, 5.5, 0, 32)])
  ];
  if (acc === 'pajarita') { const b = bow(0, 100, 36); parts.push(part('pajarita', 'Pajarita', 'acento', [b.bow]), part('nudo', 'Nudo de la pajarita', 'acento', [b.knot], { on: 'pajarita' })); }
  if (acc === 'lazo') { const b = bow(-17, 43, 24, -25); parts.push(part('lazo', 'Lazo', 'acento', [b.bow]), part('nudo', 'Nudo del lazo', 'acento', [b.knot], { on: 'lazo' })); }
  if (acc === 'gorro') { const h = santaHat(40, 12, P(4, 43)); parts.push(part('gorro', 'Gorro', 'rojo', [h.body]), part('borde-gorro', 'Borde del gorro', 'blanco', [h.brim]), part('pompon', 'Pompón', 'blanco', [h.pompom])); }
  return D({
    body: head, bodyName: 'Cabeza: delantero y trasero', bodyColor: 'cuerpo', parts, loop: P(0, 40),
    emb: [{ pts: [P(0, 75), P(0, 82)], label: 'Boca: pespunte', color: 'oscuro', w: 1.2, on: 'hocico' }, { pts: curvePts([P(-5.5, 81), P(0, 84), P(5.5, 81)], 4), label: '', color: 'oscuro', w: 1.2, on: 'hocico' }],
    dots: [...[-1, 1].map(sg => ({ at: P(sg * 11, 59), r: 2.4, color: 'negro', label: 'Ojo: cuenta negra de 4–5 mm o nudo francés', kind: 'boton' as const })), ...[-1, 1].map(sg => ({ at: P(sg * 19.5, 68), r: 3.6, color: 'mejilla', label: 'Mejilla: colorete en crema o rotulador textil', kind: 'punto' as const }))],
    steps: [{ id: 'cara', title: 'Cara', detail: 'Cose el hocico y la nariz (mete un poco de relleno bajo la nariz), borda la boca y cose los ojos. Cose el interior de las orejas.' }, { id: 'cuernos', title: 'Cuernos', detail: 'Une las dos capas de cada cuerno por el borde.' }]
  });
}

function gingerbread(p: Params): Design {
  const look = str(p, 'ropa');
  const arm = strokeP([P(-14, 50), P(-42, 60)], 19), legL = strokeP([P(-11, 82), P(-18, 107)], 22);
  const body = roundP(uni(circle(0, 22, 19.5, 64), rrect(-21, 36, 42, 54, 14), arm, flipP(arm), legL, flipP(legL)), 4, 1);
  const icing: OrnEmb[] = [...[-1, 1].map(sg => ({ pts: wave(P(sg * 39, 52.5), P(sg * 35.5, 66.5), 1.6, 2), label: sg < 0 ? 'Glaseado: pespunte blanco ondulado' : '', color: 'blanco', w: 1.6 })), ...[-1, 1].map(sg => ({ pts: wave(P(sg * 7.5, 106), P(sg * 27.5, 103), 1.6, 3), label: '', color: 'blanco', w: 1.6 }))];
  const parts: OrnPart[] = [], emb: OrnEmb[] = [...icing, { pts: curvePts([P(-6, 25), P(0, 28.5), P(6, 25)], 6), label: 'Sonrisa: pespunte', color: 'oscuro', w: 1.3 }];
  const dots: OrnDot[] = [...[-1, 1].map(sg => ({ at: P(sg * 7, 19), r: 2.2, color: 'negro', label: 'Ojo: cuenta negra o nudo francés', kind: 'boton' as const })), ...[-1, 1].map(sg => ({ at: P(sg * 12.5, 26), r: 3.2, color: 'mejilla', label: 'Mejilla: colorete', kind: 'punto' as const }))];
  if (look === 'botones') {
    parts.push(part('boton-rojo', 'Botón rojo', 'rojo', [circle(0, 52, 3.8, 24), circle(0, 76, 3.8, 24)]), part('boton-verde', 'Botón verde', 'verde', [circle(0, 64, 3.8, 24)]));
    for (const y of [52, 64, 76]) emb.push({ pts: [P(-1.6, y - 1.6), P(1.6, y + 1.6)], label: y === 52 ? 'Puntada en cruz del botón' : '', color: 'blanco', w: 1 }, { pts: [P(-1.6, y + 1.6), P(1.6, y - 1.6)], label: '', color: 'blanco', w: 1 });
  }
  if (look === 'falda') {
    const skirt = roundP(pos([P(-21, 60), P(21, 60), ...curvePts([P(33, 91), P(0, 95), P(-33, 91)], 8)]), 0, 2.5), b = bow(13, 5, 22, 18);
    parts.push(part('falda', 'Falda', 'acento', [skirt]), part('lazo', 'Lazo', 'rojo', [b.bow]), part('nudo', 'Nudo del lazo', 'rojo', [b.knot], { on: 'lazo' }));
    [P(-13, 76), P(0, 71), P(13, 79)].forEach((c, i) => asterisk(c, 4.5).forEach((pts, j) => emb.push({ pts, label: i || j ? '' : 'Copos: pespunte blanco', color: 'blanco', w: 1, on: 'falda' })));
    dots.push(...[P(-6, 84), P(7, 68), P(-19, 70), P(21, 86)].map(at => ({ at, r: 1, color: 'blanco', label: 'Nudo francés blanco', kind: 'punto' as const })));
  }
  if (look === 'bufanda') {
    const band = roundP(pos([P(-21, 36), ...curvePts([P(-21, 36), P(0, 39.5), P(21, 36)], 6).slice(1), P(21, 45), ...curvePts([P(21, 45), P(0, 48.5), P(-21, 45)], 6).slice(1)]), 0, 1.5);
    const tail = turnP(rrect(-4.5, 0, 9, 32, 1.5), -14).map(q => P(q.x + 12, q.y + 41)), h = santaHat(36, 16, P(2, 5));
    parts.push(part('bufanda-punta', 'Punta de la bufanda', 'acento', [tail]), part('bufanda', 'Bufanda', 'acento', [band]), part('gorro', 'Gorro', 'rojo', [h.body]), part('borde-gorro', 'Borde del gorro', 'blanco', [h.brim]), part('pompon', 'Pompón', 'blanco', [h.pompom]));
    const end = turnP([P(-4.5, 25), P(4.5, 25)], -14).map(q => P(q.x + 12, q.y + 41));
    for (let i = 0; i < 5; i++) { const t = (i + 0.5) / 5, a = P(end[0].x + (end[1].x - end[0].x) * t, end[0].y + (end[1].y - end[0].y) * t), d = turnP([P(0, 7)], -14)[0]; emb.push({ pts: [a, P(a.x + d.x, a.y + d.y)], label: i ? '' : 'Flecos: corta hasta aquí', color: 'blanco', w: 0.8, on: 'bufanda-punta' }); }
  }
  return D({
    body, bodyName: 'Galleta: delantero y trasero', bodyColor: 'cuerpo', parts, emb, dots, loop: P(0, 2.5),
    steps: [{ id: 'cara', title: 'Cara y glaseado', detail: 'Borda el glaseado ondulado de manos y pies y la sonrisa; cose los ojos y pinta las mejillas.' }, ...(parts.length ? [{ id: 'ropa', title: 'Ropa', detail: 'Cose la ropa y los adornos sobre el delantero siguiendo sus líneas.' }] : [])]
  });
}

/** Scalloped tree layer: apex, base line, width and number of scallops. */
const treeLayer = (apex: number, base: number, w: number, n: number) => { const s = w / n, r = s / 2; return roundP(uni(pos([P(0, apex), P(w / 2, base - r), P(-w / 2, base - r)]), ...scallops(-w / 2, w / 2, base - r, n)), 1.2, 3); };
function layeredTree(): Design {
  const top = treeLayer(20, 56, 62, 3), mid = treeLayer(38, 90, 92, 4), low = treeLayer(62, 126, 122, 5);
  const back = roundP(uni(top, mid, low), 1.5, 0), trunk = roundP(pos([P(-11, 116), P(11, 116), P(10, 148), P(-10, 148)]), 0, 2.5), star = starP(0, 16.5, 16, 7, 1.6);
  const visible = (layer: Pt[], above?: Pt[]) => (above ? minusP(layer, offsetPolygons([above], 3)[0]) : layer);
  const garland = (pts: Pt[], layer: Pt[], above: Pt[] | undefined) => { const region = offsetPolygons([visible(layer, above)], -5); return curvePts(pts, 10).filter(q => region.some(r => insidePoly(q, r))); };
  const balls = { rojo: [P(11, 45), P(-22, 77), P(23, 112)], blanco: [P(-10, 50), P(26, 74), P(-34, 112)] };
  return D({
    body: back, bodyName: 'Trasera del árbol (silueta entera)', bodyQty: 1, bodyColor: 'cuerpo', loop: P(0, 0.5),
    parts: [
      part('estrella', 'Estrella (2 capas, entra entre las capas)', 'amarillo', [star], { kind: 'entre', layers: 2 }),
      part('tronco', 'Tronco (2 capas, entra entre las capas)', 'tronco', [trunk], { kind: 'entre', layers: 2 }),
      part('capa-baja', 'Capa de abajo', 'cuerpo', [low]), part('capa-media', 'Capa del medio', 'cuerpo', [mid]), part('capa-alta', 'Capa de arriba', 'cuerpo', [top]),
      part('bola-roja', 'Bola roja (o pompón de 1 cm)', 'rojo', balls.rojo.map(c => circle(c.x, c.y, 5, 24))), part('bola-blanca', 'Bola blanca (o pompón de 1 cm)', 'blanco', balls.blanco.map(c => circle(c.x, c.y, 5, 24)))
    ],
    emb: [
      { pts: garland([P(-20, 40), P(0, 44), P(22, 37)], top, undefined), label: 'Guirnalda: cuentas doradas o cadeneta', color: 'dorado', w: 1.8 },
      { pts: garland([P(-38, 68), P(0, 72), P(38, 62)], mid, top), label: '', color: 'dorado', w: 1.8 },
      { pts: garland([P(-52, 100), P(0, 104), P(54, 94)], low, mid), label: '', color: 'dorado', w: 1.8 },
      ...[P(1, 34), P(4, 82), P(-6, 118), P(40, 104)].flatMap((c, i) => asterisk(c, 3.2).map((pts, j) => ({ pts, label: i || j ? '' : 'Copos: pespunte blanco', color: 'blanco', w: 0.9 })))
    ],
    steps: [{ id: 'capas', title: 'Capas', detail: 'Hilvana la capa de abajo sobre la trasera, luego la del medio y la de arriba, cada una por su línea. Borda la guirnalda y los copos y cose las bolas.' }, { id: 'estrella', title: 'Estrella y tronco', detail: 'Une las dos capas de la estrella y del tronco por el borde y métalas entre la trasera y las capas.' }]
  });
}

function adventShape(form: string): Design {
  const cuff = (b: Pt[], y: number) => both(b, waveRegion(y, 1.4, 6, true));
  const mk = (body: Pt[], name: string, extra: Partial<Design> = {}) => D({ body, bodyName: `${name}: delantero y trasero`, bodyColor: 'cuerpo', ...extra });
  if (form === 'manopla') {
    const b = roundP(uni(rrect(-17, 14, 34, 61, 16), ellipse(-19, 46, 7.5, 11.5, -28, 40), rrect(-21, 0, 42, 18, 4)), 3, 1.5);
    return mk(b, 'Manopla', { bodyMirror: true, parts: [part('puno', 'Puño', 'blanco', [cuff(b, 16)])], loop: P(0, 0) });
  }
  if (form === 'botita') {
    const b = roundP(uni(rect(-14, 0, 28, 56), rrect(-15.5, 36, 45.5, 39, 17)), 5, 2.5);
    return mk(b, 'Botita', { bodyMirror: true, loop: P(-9, 0), parts: [part('puno', 'Puño', 'blanco', [cuff(b, 15)]), part('talon', 'Talón', 'acento', [both(b, circle(-17, 77, 17, 40))]), part('puntera', 'Puntera', 'acento', [both(b, circle(34, 63, 16, 40))])] });
  }
  if (form === 'gorrito') {
    const dome = both(circle(0, 52, 31, 64), box(-40, 0, 40, 56)), pom = wavyCircle(0, 15, 10, 1.3, 10);
    const b = roundP(uni(dome, rrect(-33, 52, 66, 21, 6), pom), 1.6, 1);
    return mk(b, 'Gorrito', { loop: P(0, 5), parts: [part('vuelta', 'Vuelta del gorro', 'blanco', [both(b, waveRegion(54, 1.4, 6, false))]), part('pompon', 'Pompón', 'blanco', [both(b, circle(0, 15, 12.5, 48))])],
      emb: [{ pts: [P(0, 26), P(0, 52)], label: 'Pespunte decorativo', color: 'hilo', w: 1 }, { pts: curvePts([P(-14, 30), P(-20, 42), P(-21, 52)], 4), label: '', color: 'hilo', w: 1 }, { pts: curvePts([P(14, 30), P(20, 42), P(21, 52)], 4), label: '', color: 'hilo', w: 1 }] });
  }
  if (form === 'esfera') {
    const b = roundP(uni(circle(0, 44, 31, 96), rrect(-9, 4, 18, 13, 2)), 2, 1);
    return mk(b, 'Esfera', { loop: P(0, 4), parts: [part('casquillo', 'Casquillo', 'dorado', [roundP(uni(rect(-9, 4, 18, 11), ...scallops(-9, 9, 15, 3)), 0.6, 0.4)]), part('franja', 'Franja', 'blanco', [both(b, both(waveRegion(27, 1.4, 7, false), waveRegion(33, 1.4, 7, true)))])] });
  }
  if (form === 'estrella') {
    const b = starP(0, 40, 38, 17, 3.2);
    return mk(b, 'Estrella', { loop: P(0, 2), emb: [{ pts: [...starP(0, 40, 26, 11.5, 2.4), starP(0, 40, 26, 11.5, 2.4)[0]], label: 'Pespunte decorativo', color: 'hilo', w: 1 }] });
  }
  if (form === 'arbol') {
    const star = starP(0, 8.5, 8, 3.6, 0.8), trunk = rect(-6, 62, 12, 12);
    const b = roundP(uni(pos([P(0, 10), P(15, 30), P(-15, 30)]), pos([P(0, 20), P(22, 47), P(-22, 47)]), pos([P(0, 34), P(28, 65), P(-28, 65)]), trunk, star), 1.2, 1.4);
    return mk(b, 'Árbol', { loop: P(0, 0.5), parts: [part('estrella', 'Estrella', 'amarillo', [both(b, circle(0, 8.5, 8.5, 40))]), part('tronco', 'Tronco', 'tronco', [both(b, rect(-8, 65.5, 16, 12))])] });
  }
  if (form === 'regalo') {
    const loops = [ellipse(-10, 14, 10, 6.5, 22, 40), ellipse(10, 14, 10, 6.5, -22, 40)];
    const b = roundP(uni(rrect(-26, 32, 52, 42, 3), rrect(-29, 22, 58, 12, 3), ...loops, circle(0, 19, 4.5, 24)), 2, 1);
    return mk(b, 'Regalo', { loop: P(0, 8), parts: [part('cinta', 'Cinta', 'acento', [both(b, rect(-4, 22, 8, 55))]), part('lazo', 'Lazo', 'acento', [both(b, box(-30, 0, 30, 22))])],
      emb: [{ pts: [P(-28, 34), P(-4, 34)], label: 'Borde de la tapa: pespunte', color: 'hilo', w: 1 }, { pts: [P(4, 34), P(28, 34)], label: '', color: 'hilo', w: 1 }, ...[-1, 1].map(sg => ({ pts: [...ellipse(sg * 10, 14, 4.5, 2.2, sg * -22, 16), ellipse(sg * 10, 14, 4.5, 2.2, sg * -22, 16)[0]], label: sg < 0 ? 'Hueco del lazo: pespunte' : '', color: 'oscuro', w: 1, on: 'lazo' }))] });
  }
  if (form === 'corazon') {
    const b = heart(0, 40, 66);
    return mk(b, 'Corazón', { loop: P(0, b.reduce((m, q) => (Math.abs(q.x) < 3 ? Math.min(m, q.y) : m), 1e9)), emb: [{ pts: [...heart(0, 40, 48), heart(0, 40, 48)[0]], label: 'Pespunte decorativo', color: 'hilo', w: 1 }] });
  }
  // Bastón de caramelo.
  const line = [P(8, 74), P(8, 22), ...Array.from({ length: 13 }, (_, i) => { const a = (i / 12) * Math.PI; return P(-4 + 12 * Math.cos(a), 22 - 12 * Math.sin(a)); }), P(-16, 30)];
  const b = strokeP(line, 13), stripes: Pt[][] = [];
  for (let i = -6; i < 9; i++) { const y = 10 + i * 9; const s = intersectPolygons([b], [pos([P(-40, y), P(40, y - 26), P(40, y - 21), P(-40, y + 5)])]); stripes.push(...s.filter(r => area(r) > 6)); }
  return mk(b, 'Bastón', { bodyMirror: true, loop: P(-4, 3.5), paint: [{ shape: stripes, color: 'rojo', label: 'Rayas: borda con punto lleno o cose cinta roja de 4 mm' }] });
}
/** Where the day number goes on each figure (the cane is too narrow for one). */
const ADVENT_NUM: Record<string, { at: Pt; h: number }> = { manopla: { at: P(0, 46), h: 20 }, botita: { at: P(0, 33), h: 16 }, gorrito: { at: P(0, 41), h: 15 }, esfera: { at: P(0, 52), h: 20 }, estrella: { at: P(0, 43), h: 17 }, arbol: { at: P(0, 54), h: 13 }, regalo: { at: P(-14, 54), h: 15 }, corazon: { at: P(0, 37), h: 19 } };
/** The day number, as big as it fits inside the figure and clear of its appliqués. */
export function fitNumber(n: string, form: string, body: Pt[], parts: OrnPart[]): Pt[][] | undefined {
  const spot = ADVENT_NUM[form];
  if (!spot) return undefined;
  const inside = offsetPolygons([pos(body)], -4.5), apps = parts.filter(x => x.kind === 'aplique').flatMap(x => x.at).map(pos);
  for (let h = spot.h; h >= 0.45 * spot.h; h *= 0.93) {
    const rings = digitShape(n, spot.at.x, spot.at.y, h), grown = offsetPolygons(rings.map(pos), 1.5);
    if (rings.flat().every(q => inside.some(r => insidePoly(q, r))) && apps.every(a => intersectPolygons(grown, [a]).every(r => area(r) < 0.3))) return rings;
  }
  return undefined;
}
function advent(p: Params): Design {
  const form = str(p, 'forma'), d = adventShape(form), n = str(p, 'numero');
  if (n && n !== 'ninguno') {
    const rings = fitNumber(n, form, d.body, d.parts);
    if (rings) d.paint.push({ shape: rings, color: 'numero', label: `Número ${n}: borda con punto lleno o pinta con rotulador textil` });
    else d.notes.push(`El número ${n} no cabe en esta figura: bórdalo en una etiqueta o elige otra figura.`);
  }
  d.steps.push({ id: 'detalles', title: 'Detalles', detail: 'Cose los apliques sobre el delantero por sus líneas y borda los detalles y el número del día.' });
  return d;
}

// ------------------------------------------------------------------ Felt ornament assembly
export interface OrnLayout { design: Design; k: number; m: number; pieces: Piece[]; art: OrnArt[]; height: number; width: number }
/** Felt piece cut on its outline with the hand stitch marked m mm inside. */
function feltPiece(id: string, name: string, poly: Pt[], qty: number, m: number, fabric: FabricRole, mirror = false, label = 'Puntada'): Piece {
  const pc = polyRuns(id, name, poly, () => 'borde', { k: 1, sa: 0, felt: true }, { qty, fabric, mirrorPairs: mirror });
  offsetPolygons([pos(poly)], -m).filter(r => area(r) > 4).forEach((ring, j) => ring.forEach((q, i) => pc.lines.push({ id: `puntada-${j}-${i}`, kind: 'pespunte', a: q, b: ring[(i + 1) % ring.length], label: i || j ? undefined : `${label} a ${cm(m)} del borde` })));
  return pc;
}
const placeLines = (pc: Piece, id: string, poly: Pt[], label: string, closed = true, kind: 'colocacion' | 'pespunte' = 'colocacion') => {
  const pts = closed ? [...poly, poly[0]] : poly;
  pts.slice(1).forEach((q, i) => pc.lines.push({ id: `${id}-${i}`, kind, a: pts[i], b: q, label: i ? undefined : label }));
};
function assemble(d0: Design, alto: number, m: number): OrnLayout {
  // Scale so the finished height (body and inserted parts) is the one asked for.
  const outline = [d0.body, ...d0.parts.filter(x => x.kind === 'entre').flatMap(x => x.at)].flat(), ys = outline.map(q => q.y), k = alto / (Math.max(...ys) - Math.min(...ys));
  const S = (pts: Pt[]) => pts.map(q => P(q.x * k, q.y * k));
  const d: Design = { ...d0, body: S(d0.body), loop: P(d0.loop.x * k, d0.loop.y * k), parts: d0.parts.map(x => ({ ...x, at: x.at.map(S) })), emb: d0.emb.map(e => ({ ...e, pts: S(e.pts) })), dots: d0.dots.map(x => ({ ...x, at: P(x.at.x * k, x.at.y * k), r: x.r * k })), paint: d0.paint.map(x => ({ ...x, shape: x.shape.map(S) })) };
  const pieces: Piece[] = [], byId = new Map<string, Piece>();
  const body = feltPiece('cuerpo', d.bodyName, d.body, d.bodyQty, m, 'principal', d.bodyMirror, d.bodyQty === 2 ? 'Festón o pespunte a mano que une delantero y trasero' : 'Festón o pespunte a mano');
  pieces.push(body); byId.set('cuerpo', body);
  const stitchApp = Math.min(m, 1.5);
  for (const x of d.parts) {
    const pc = feltPiece(x.id, x.name, x.at[0], x.at.length * (x.layers ?? 1), x.kind === 'entre' ? m : stitchApp, x.kind === 'entre' ? 'principal' : 'contraste', x.mirror, x.kind === 'entre' ? 'Puntada' : 'Puntada del aplique');
    pieces.push(pc); byId.set(x.id, pc);
    const target = byId.get(x.on ?? 'cuerpo') ?? body, short = x.name.replace(/\s*\(.*\)$/, '');
    if (x.kind === 'entre') x.at.forEach((poly, i) => { const lap = intersectPolygons([pos(poly)], [pos(d.body)]).filter(r => area(r) > 1); lap.forEach((r, j) => placeLines(body, `entre-${x.id}-${i}-${j}`, r, i || j ? '' : `${short}: entra entre las capas`)); });
    else (x.on ? x.at.slice(0, 1) : x.at).forEach((poly, i) => placeLines(target, `aplique-${x.id}-${i}`, poly, i ? '' : `${short}: colocación`));
  }
  d.emb.forEach((e, i) => placeLines(byId.get(e.on ?? 'cuerpo') ?? body, `bordado-${i}`, e.pts, e.label, false, 'pespunte'));
  d.paint.forEach((x, i) => x.shape.forEach((ring, j) => placeLines(byId.get(x.on ?? 'cuerpo') ?? body, `relleno-${i}-${j}`, ring, j ? '' : x.label)));
  d.dots.forEach((x, i) => body.marks.push({ id: `punto-${i}`, kind: x.kind, at: x.at, label: x.label }));
  body.marks.push({ id: 'presilla', kind: 'cruz', at: d.loop, label: 'Presilla de cinta: entra entre las capas' });
  // Drawing, back to front.
  const art: OrnArt[] = [], all = [d.body, ...d.parts.flatMap(x => x.at)].flat(), H = Math.max(...all.map(q => q.y)) - Math.min(...all.map(q => q.y));
  const loopH = 0.24 * H, lp = d.loop;
  art.push({ pts: curvePts([P(lp.x - 0.04 * H, lp.y + 2), P(lp.x - 0.07 * H, lp.y - 0.6 * loopH), P(lp.x, lp.y - loopH), P(lp.x + 0.07 * H, lp.y - 0.6 * loopH), P(lp.x + 0.04 * H, lp.y + 2)], 8), role: 'cinta', line: Math.max(1.4, 0.022 * H) });
  const stitch = (poly: Pt[], inset: number, on: string) => offsetPolygons([pos(poly)], -inset).filter(r => area(r) > 2).forEach(r => art.push({ pts: [...r, r[0]], role: 'hilo', line: Math.max(0.6, 0.008 * H), dash: true, stitchOn: on }));
  const drawPart = (x: OrnPart) => { x.at.forEach(poly => { art.push({ pts: poly, role: x.color }); stitch(poly, x.kind === 'entre' ? m : Math.min(stitchApp, 0.8 * m), x.color); }); d.parts.filter(y => y.on === x.id).forEach(drawPart); d.emb.filter(e => e.on === x.id).forEach(drawEmb); };
  const drawEmb = (e: OrnEmb) => art.push({ pts: e.pts, role: e.color, line: (e.w ?? 1.2) * k });
  d.parts.filter(x => x.kind === 'entre').forEach(drawPart);
  art.push({ pts: d.body, role: d.bodyColor }); stitch(d.body, m, d.bodyColor);
  d.parts.filter(x => x.kind === 'aplique' && !x.on).forEach(drawPart);
  d.parts.filter(x => x.kind === 'aplique' && x.on && !d.parts.some(y => y.id === x.on)).forEach(drawPart);
  d.paint.forEach(x => art.push({ pts: x.shape[0], rings: x.shape, role: x.color }));
  d.emb.filter(e => !e.on).forEach(drawEmb);
  d.dots.forEach(x => art.push({ pts: circle(x.at.x, x.at.y, x.r, 24), role: x.color }));
  const xs = all.map(q => q.x);
  return { design: d, k, m, pieces, art, height: Math.max(...outline.map(q => q.y * k)) - Math.min(...outline.map(q => q.y * k)), width: Math.max(...xs) - Math.min(...xs) };
}

// ------------------------------------------------------------------ Patchwork tree (fabric sandwich, pinked edge)
export function patchworkOutline(alto: number, tiers: number): Pt[] {
  const W = 100, trunkH = 18, Ht = 122, k = alto / (Ht + trunkH), half: Pt[] = [P(0, 0)];
  let prev = 0;
  for (let i = 0; i < tiers; i++) {
    const y1 = ((i + 1) * Ht) / tiers, b = (W / 2) * (0.45 + (0.55 * (i + 1)) / tiers);
    if (i > 0) half.push(P(0.62 * prev, (i * Ht) / tiers));
    half.push(P(b, y1)); prev = b;
  }
  half.push(P(11, Ht), P(11, Ht + trunkH));
  return [...half, ...flipP(half).filter(q => q.x < -0.01)].map(q => P(q.x * k, q.y * k));
}
/** Pinking-shears edge: the outline resampled every `step` mm, alternately in and out. */
function pinked(poly: Pt[], step: number, amp: number): Pt[] {
  const out: Pt[] = [], n = poly.length;
  let carry = 0, k = 0;
  for (let i = 0; i < n; i++) {
    const a = poly[i], b = poly[(i + 1) % n], L = Math.hypot(b.x - a.x, b.y - a.y), nx = (b.y - a.y) / (L || 1), ny = -(b.x - a.x) / (L || 1);
    for (let t = carry; t < L; t += step, k++) { const sg = k % 2 ? 1 : -1, f = t / L; out.push(P(a.x + (b.x - a.x) * f + nx * amp * sg, a.y + (b.y - a.y) * f + ny * amp * sg)); }
    carry = ((carry - L) % step + step) % step;
  }
  return out;
}
function patchwork(p: Params, sa: number): { pieces: Piece[]; seams: SeamRelation[]; art: OrnArt[]; outline: Pt[] } {
  const alto = num(p, 'alto'), tiers = Number(str(p, 'pisos')) || 3, outline = patchworkOutline(alto, tiers);
  const keepAll = () => true;
  const front = polyRuns('delantero', 'Delantero (tela A)', outline, () => 'contorno', { k: 1, sa, felt: false }, { qty: 1, fabric: 'principal' }, keepAll);
  const back = polyRuns('trasero', 'Trasero (tela B)', outline, () => 'contorno', { k: 1, sa, felt: false }, { qty: 1, fabric: 'contraste' }, keepAll);
  const bat = polyRuns('guata', 'Guata o entretela (sin margen)', outline, () => 'contorno', { k: 1, sa: 0, felt: true }, { qty: 1, fabric: 'entretela' }, keepAll);
  for (const pc of [front, back]) pc.edges.forEach(e => { e.label = 'Pespunte; después recorta el margen con tijeras de zigzag'; });
  front.marks.push({ id: 'estrella', kind: 'boton', at: P(0, 0.06 * alto), label: 'Botón de estrella (sujeta la presilla)' }, { id: 'presilla', kind: 'cruz', at: P(0, 0), label: 'Presilla de cinta' });
  const ids = (pc: Piece) => pc.edges.map(e => e.id);
  const top = P(0, 0), star = starP(0, 0.07 * alto, 0.06 * alto, 0.028 * alto, 0.006 * alto), loopH = 0.2 * alto;
  return { pieces: [front, back, bat], seams: [equal('contorno', 'Delantero con trasero', [{ pieceId: front.id, edgeIds: ids(front) }], [{ pieceId: back.id, edgeIds: ids(back) }], 0.5)], outline,
    art: [
      { pts: curvePts([P(-0.035 * alto, 0.05 * alto), P(-0.06 * alto, -0.6 * loopH), P(top.x, -loopH), P(0.06 * alto, -0.6 * loopH), P(0.035 * alto, 0.05 * alto)], 8), role: 'cinta', line: 0.03 * alto },
      { pts: pinked(largest(offsetPolygons([pos(outline)], sa, 'miter')), Math.max(2, 0.018 * alto), Math.max(0.8, 0.007 * alto)), role: 'margen' }, { pts: outline, role: 'cuerpo' },
      { pts: [...outline, outline[0]], role: 'hilo', line: Math.max(0.6, 0.006 * alto), dash: true }, { pts: star, role: 'madera' }
    ] };
}

// ------------------------------------------------------------------ Christmas stocking (lined fabric)
const STOCKING: A[] = [[0, 0, 'boca', 'cl'], [190, 0, 'costado', 'c'], [189, 236], [200, 278], [238, 307], [290, 333], [322, 366], [330, 408], [310, 440], [264, 452], [152, 450], [70, 438], [20, 404], [3, 350, undefined, 'cl']];
export interface StockingLayout { pieces: Piece[]; seams: SeamRelation[]; art: OrnArt[]; body: Pt[]; cuffH: number; zone: Pt[]; applique: { id: string; polys: Pt[][] }[]; patches: Pt[][]; notes: string[] }
function stocking(p: Params, sa: number): StockingLayout {
  const alto = num(p, 'alto'), k = alto / 452, cuffStyle = str(p, 'puno'), heelToe = str(p, 'talon') === 'si', app = str(p, 'aplique');
  const t = { k, sa, felt: false };
  const ext = plush('exterior', 'Bota: delantero y trasero (1 y 1 en espejo)', STOCKING, t, { qty: 2, mirrorPairs: true, fabric: 'principal' });
  const lining = plush('forro', 'Forro (1 y 1 en espejo)', STOCKING, t, { qty: 2, mirrorPairs: true, fabric: 'forro' });
  const body = largestSeam(ext), pieces: Piece[] = [ext, lining], seams: SeamRelation[] = [], art: OrnArt[] = [];
  const boca = runLength(ext, 'boca'), cuffH = (cuffStyle === 'ondas' ? 100 : 115) * k;
  seams.push(equal('forro', 'Forro con la bota', [{ pieceId: ext.id, edgeIds: ext.edges.map(e => e.id) }], [{ pieceId: lining.id, edgeIds: lining.edges.map(e => e.id) }], 0.6));
  // Cuff.
  let cuffArt: Pt[];
  if (cuffStyle === 'ondas') {
    // Felt cuff: the scalloped edge stays raw, so its bends need no allowance room.
    const n = 5, s = boca / n, r = s / 2, band = uni(rect(0, 0, boca, cuffH - r), ...scallops(0, boca, cuffH - r, n)), shape = both(one(uni(roundP(band, Math.min(4, 0.15 * r), 0), rect(0, 0, boca, cuffH - r))), box(0, 0, boca, 2 * cuffH)).map(q => P(Math.abs(q.x) < 0.05 ? 0 : Math.abs(q.x - boca) < 0.05 ? boca : q.x, Math.abs(q.y) < 0.05 ? 0 : q.y));
    const cuff = polyRuns('puno', 'Puño de ondas de fieltro (delantero y trasero)', shape, (a, b) => (near(a.y, 0) && near(b.y, 0) ? 'union' : (near(a.x, 0) && near(b.x, 0)) || (near(a.x, boca) && near(b.x, boca)) ? 'costado' : 'ondas'), { k: 1, sa, felt: false }, { qty: 2, fabric: 'contraste', raw: ['ondas'] }, q => near(q.y, 0) || near(q.x, 0) || near(q.x, boca));
    pieces.push(cuff);
    seams.push(equal('puno', 'Puño con la boca de la bota', [{ pieceId: cuff.id, edgeIds: cuff.edges.filter(e => e.id === 'union' || e.id.startsWith('union-')).map(e => e.id) }], [{ pieceId: ext.id, edgeIds: ['boca'] }], 0.6));
    [0.2, 0.5, 0.8].forEach((fx, i) => asterisk(P(fx * boca, 0.42 * cuffH), 0.09 * cuffH).forEach((pts, j) => placeLines(cuff, `copo-${i}-${j}`, pts, i || j ? '' : 'Copos: pespunte decorativo en el puño delantero', false, 'pespunte')));
    cuffArt = shape;
  } else {
    const cuff = rectangle('puno', 'Puño doble (doblar por la mitad a lo largo)', 2 * boca, 2 * cuffH, [edge('union', 'Une con la boca (los dos cantos juntos)', 'costura', sa), edge('costado', 'Costura del puño', 'costura', sa), edge('union-b', 'Une con la boca', 'costura', sa), edge('costado-b', 'Costura del puño', 'costura', sa)], { qty: 1, fabric: 'contraste' }, true);
    cuff.lines.push({ id: 'doblez', kind: 'doblez', a: P(0, cuffH), b: P(2 * boca, cuffH), label: 'Doblez: borde de abajo del puño' });
    pieces.push(cuff);
    seams.push({ id: 'puno', label: 'Puño (anillo) con la boca de la bota', kind: 'igual', a: [{ pieceId: cuff.id, edgeIds: ['union'] }], b: [{ pieceId: ext.id, edgeIds: ['boca'], factor: 2 }], ratioMin: 0.999, ratioMax: 1.001, tolerance: 0.6 });
    cuffArt = pos([...curvePts([P(-0.02 * boca, 0), P(0.5 * boca, -0.012 * boca), P(1.02 * boca, 0)], 6), P(1.03 * boca, cuffH - 0.05 * cuffH), P(boca * 1.0, cuffH), P(0, cuffH), P(-0.03 * boca, cuffH - 0.05 * cuffH)]);
  }
  // Loop.
  const loopL = Math.max(150, 200 * k), loop = rectangle('presilla', 'Presilla (doblar en cuatro y pespuntear)', 88, loopL, [edge('extremo', 'Extremo', 'costura', sa), edge('canto', 'Canto doblado', 'sin-margen', 0), edge('extremo-b', 'Extremo', 'costura', sa), edge('canto-b', 'Canto doblado', 'sin-margen', 0)], { qty: 1, fabric: 'contraste' });
  pieces.push(loop);
  ext.marks.push({ id: 'presilla', kind: 'cruz', at: P(12 * k, 0), label: 'Presilla: entra en la costura del costado, por dentro' });
  // Heel and toe patches: their outer edge is caught in the stocking seam, the inner arc is turned under.
  const patches: Pt[][] = [];
  if (heelToe) {
    for (const [id, name, c, r] of [['talon', 'Talón (1 y 1 en espejo)', P(0, 462 * k), 104 * k], ['puntera', 'Puntera (1 y 1 en espejo)', P(342 * k, 428 * k), 96 * k]] as const) {
      const disc = circle(c.x, c.y, r, 96), poly = both(body, disc), onArc = (q: Pt) => Math.abs(Math.hypot(q.x - c.x, q.y - c.y) - r) < 0.05;
      const pc = polyRuns(id, name, poly, (a, b) => (onArc(a) && onArc(b) ? 'borde' : 'contorno'), { k: 1, sa, felt: false }, { qty: 2, mirrorPairs: true, fabric: 'contraste', raw: ['borde'], labels: { borde: 'Borde curvo: sin margen, cóselo con zigzag o festón' } }, onArc);
      pieces.push(pc); patches.push(poly);
      const arc = poly.filter(onArc).sort((a, b) => Math.atan2(a.y - c.y, a.x - c.x) - Math.atan2(b.y - c.y, b.x - c.x));
      placeLines(ext, `colocacion-${id}`, arc, `${name.replace(/\s*\(.*\)$/, '')}: colocación (borde doblado)`, false);
    }
  }
  // Appliqué on the front: inside the leg clear of the seam allowance, below the cuff and clear of the patches.
  const zone = minusP(both(offsetPolygons([body], -(sa + 4))[0], box(-1e3, cuffH + 8, 1e4, 1e4)), ...patches.map(q => largest(offsetPolygons([pos(q)], 4))));
  const specs: { id: string; name: string; color: string; polys: Pt[][] }[] = [], spots: Pt[] = [], eyes: Pt[] = [], notes: string[] = [];
  const A = (id: string, name: string, color: string, polys: Pt[][]) => specs.push({ id, name, color, polys });
  if (app === 'reno') {
    // Deer facing left over the leg and the foot, with a sprig of holly above its back.
    const M = (poly: Pt[]) => moveP(poly, -15, 0);
    const deer = roundP(uni(ellipse(160, 330, 68, 38, -6, 64), strokeP([P(116, 318), P(98, 252)], 34), ellipse(92, 230, 27, 22, -12, 48), ellipse(66, 243, 17, 12, 18, 32), strokeP([P(118, 340), P(112, 410)], 14), strokeP([P(140, 350), P(140, 414)], 14), strokeP([P(196, 344), P(202, 410)], 14), strokeP([P(218, 336), P(228, 404)], 14), pos(leaf(212, 318, 232, 305, 13))), 5, 2);
    const antlers = roundP(uni(strokeP([P(98, 210), P(104, 186), P(116, 166), P(132, 156)], 8), strokeP([P(105, 186), P(90, 168), P(88, 156)], 6.5), strokeP([P(113, 170), P(116, 151)], 6), strokeP([P(86, 210), P(80, 186), P(68, 168)], 8), strokeP([P(81, 188), P(94, 175)], 6)), 1.5, 0);
    const b = bow(112, 268, 46, -10);
    A('cuernos', 'Cuernos del reno', 'cuerno', [M(antlers)]); A('reno', 'Reno', 'reno', [M(deer)]); A('oreja', 'Oreja del reno', 'reno-claro', [M(pos(leaf(110, 214, 136, 202, 13)))]);
    A('pecho', 'Pecho del reno', 'crema', [M(pos(ellipse(124, 306, 14, 26, 22, 32)))]); A('nariz', 'Nariz del reno', 'oscuro', [M(circle(51, 244, 6.5, 24))]);
    A('lazo', 'Lazo', 'rojo', [M(b.bow)]); A('nudo', 'Nudo del lazo', 'rojo', [M(b.knot)]);
    A('acebo', 'Hoja de acebo', 'verde', [holly(P(146, 183), P(174, 170), 15), holly(P(148, 189), P(166, 212), 15)]);
    A('baya', 'Baya', 'rojo', [circle(143, 181, 5, 24), circle(151, 187, 5, 24), circle(140, 191, 5, 24)]);
    spots.push(...M([P(170, 312), P(186, 326), P(158, 322), P(200, 318), P(176, 340)])); eyes.push(...M([P(90, 226)]));
  }
  if (app === 'arbol') {
    const tiers = [pos([P(130, 175), P(168, 232), P(92, 232)]), pos([P(130, 205), P(184, 282), P(76, 282)]), pos([P(130, 245), P(204, 340), P(56, 340)])];
    A('arbol', 'Árbol', 'verde', [roundP(uni(...tiers), 2, 4)]); A('tronco', 'Tronco', 'tronco', [rrect(116, 336, 28, 36, 3)]); A('estrella', 'Estrella', 'amarillo', [starP(130, 172, 20, 9, 2)]);
    A('bola', 'Bola', 'rojo', [P(118, 230), P(150, 262), P(104, 296), P(146, 318), P(176, 316)].map(c => circle(c.x, c.y, 8, 24)));
  }
  // Design units to millimetres, shrunk about the motif's centre until it fits the zone.
  const applique: { id: string; polys: Pt[][] }[] = [], appArt: OrnArt[] = [], all = specs.flatMap(x => x.polys.flat());
  if (all.length) {
    const xs = all.map(q => q.x * k), ys = all.map(q => q.y * k), cx = (Math.min(...xs) + Math.max(...xs)) / 2, cy = (Math.min(...ys) + Math.max(...ys)) / 2;
    // Largest scale first, then the smallest nudge (up to 8 % of the height) that fits.
    const base = app === 'reno' ? 0.86 : 1;
    let f = base, dx = 0, dy = 0;
    const T = (q: Pt) => P(cx + dx + (q.x * k - cx) * f, cy + dy + (q.y * k - cy) * f), fits = () => all.every(q => insidePoly(T(q), zone));
    const nudges = [-2, -1, 0, 1, 2].flatMap(i => [-2, -1, 0, 1, 2].map(j => [i * 0.04 * alto, j * 0.04 * alto])).sort((a, b) => Math.hypot(a[0], a[1]) - Math.hypot(b[0], b[1]));
    const search = () => nudges.some(([x, y]) => { dx = x; dy = y; return fits(); });
    while (f > 0.6 * base && !search()) f *= 0.97;
    if (!fits()) notes.push('El aplique no cabe en una bota tan pequeña con este margen: se omite.');
    else {
      if (f < 0.97 * base) notes.push(`El aplique se reduce al ${Math.round((f / base) * 100)} % para que no entre en la costura ni toque el puño, el talón o la puntera.`);
      for (const x of specs) {
        const ps = x.polys.map(poly => poly.map(T));
        applique.push({ id: x.id, polys: ps });
        pieces.push(feltPiece(`aplique-${x.id}`, `${x.name} (fieltro, sin margen)`, ps[0], ps.length, Math.min(1.5, 2 * k * f), 'contraste', false, 'Puntada del aplique'));
        ps.forEach((poly, i) => placeLines(ext, `aplique-${x.id}-${i}`, poly, i ? '' : `${x.name}: colocación (solo en el delantero)`));
        art.push(...ps.map(poly => ({ pts: poly, role: x.color })));
      }
      spots.map(T).forEach((at, i) => { ext.marks.push({ id: `mancha-${i}`, kind: 'punto', at, label: i ? '' : 'Manchas: nudos franceses blancos' }); appArt.push({ pts: circle(at.x, at.y, 3 * k * f, 12), role: 'blanco' }); });
      eyes.map(T).forEach(at => { ext.marks.push({ id: 'ojo', kind: 'boton', at, label: 'Ojo: botón negro o bordado' }); appArt.push({ pts: circle(at.x, at.y, 4.2 * k * f, 16), role: 'oscuro' }); });
    }
  }
  // Drawing.
  const H = alto;
  art.unshift({ pts: body, role: 'cuerpo' }, ...patches.map(pts => ({ pts, role: 'parche' })), ...patches.flatMap(pts => offsetPolygons([pts], -3 * k).map(r => ({ pts: [...r, r[0]], role: 'hilo', line: 0.006 * H, dash: true }))));
  art.push(...appArt);
  art.push({ pts: cuffArt, role: 'puno' }, { pts: curvePts([P(10 * k, 4), P(-4 * k, -60 * k), P(22 * k, -86 * k), P(34 * k, -50 * k), P(24 * k, 4)], 8), role: 'cinta', line: 0.024 * H });
  if (cuffStyle === 'ondas') art.push(...[0.2, 0.5, 0.8].flatMap(fx => asterisk(P(fx * boca, 0.42 * cuffH), 0.09 * cuffH).map(pts => ({ pts, role: 'hilo', line: 0.005 * H }))));
  return { pieces, seams, art, body, cuffH, zone, applique, patches, notes };
}
const largestSeam = (pc: Piece) => {
  // Seam outline of a plush piece, densified.
  const pts: Pt[] = [];
  for (const e of pc.edges) {
    const a = pc.nodes.find(n => n.id === e.from)!, b = pc.nodes.find(n => n.id === e.to)!;
    if (e.kind === 'cubic' && e.c1 && e.c2) for (let i = 0; i < 16; i++) { const t = i / 16, u = 1 - t; pts.push(P(u * u * u * a.x + 3 * u * u * t * e.c1.x + 3 * u * t * t * e.c2.x + t * t * t * b.x, u * u * u * a.y + 3 * u * u * t * e.c1.y + 3 * u * t * t * e.c2.y + t * t * t * b.y)); }
    else pts.push(P(a.x, a.y));
  }
  return pos(pts);
};

// ------------------------------------------------------------------ Generators
const NUMBERS = [{ value: 'ninguno', label: 'Sin número' }, ...Array.from({ length: 24 }, (_, i) => ({ value: String(i + 1), label: String(i + 1) }))];
const FORMS: [string, string][] = [['manopla', 'Manopla'], ['botita', 'Botita'], ['gorrito', 'Gorrito'], ['esfera', 'Esfera'], ['estrella', 'Estrella'], ['arbol', 'Árbol'], ['regalo', 'Regalo'], ['corazon', 'Corazón'], ['baston', 'Bastón de caramelo']];
export const ADVENT_FORMS = FORMS.map(([v]) => v);
const choice = (key: string, label: string, opts: [string, string][]): ParamDef => ({ key, label, group: 'diseno', type: 'choice', choices: opts.map(([value, l]) => ({ value, label: l })) });
const alto = (min: number, max: number, label = 'Alto del adorno terminado'): ParamDef => ({ key: 'alto', label, group: 'diseno', type: 'length', min, max });
const FELT_MARGIN: ParamDef = { key: 'margen', label: 'Puntada desde el borde', group: 'margenes', type: 'length', min: 2, max: 8 };
type Kind = 'fieltro' | 'retales' | 'bota';
interface Def { id: string; name: string; summary: string; kind: Kind; params: ParamDef[]; defaults: Params; design?: (p: Params) => Design }
const DEFS: Def[] = [
  { id: 'adorno-casita', name: 'Casita nevada', summary: 'Casita de fieltro con tejado nevado, chimenea, ventanas, puerta en arco y estrella o corazón.', kind: 'fieltro', design: house,
    params: [alto(70, 200), choice('adorno', 'Adorno', [['estrella', 'Estrella y dos ventanas'], ['corazon', 'Corazón y una ventana']]), FELT_MARGIN], defaults: { alto: 110, adorno: 'estrella', margen: 3 } },
  { id: 'adorno-reno', name: 'Reno', summary: 'Cabeza de reno de fieltro con cuernos y orejas entre las capas, hocico, nariz y pajarita, gorro o lazo.', kind: 'fieltro', design: reindeer,
    params: [alto(80, 200, 'Alto (de la punta del cuerno a la barbilla)'), choice('accesorio', 'Accesorio', [['pajarita', 'Pajarita'], ['gorro', 'Gorro'], ['lazo', 'Lazo']]), FELT_MARGIN], defaults: { alto: 110, accesorio: 'pajarita', margen: 3 } },
  { id: 'adorno-jengibre', name: 'Galleta de jengibre', summary: 'Galleta de fieltro con glaseado bordado y botones, falda con lazo o bufanda con gorro.', kind: 'fieltro', design: gingerbread,
    params: [alto(80, 200), choice('ropa', 'Ropa', [['botones', 'Botones'], ['falda', 'Falda y lazo'], ['bufanda', 'Bufanda y gorro']]), FELT_MARGIN], defaults: { alto: 120, ropa: 'botones', margen: 3 } },
  { id: 'adorno-arbol', name: 'Árbol por capas', summary: 'Árbol de fieltro de tres capas con ondas, estrella, tronco, bolas y guirnalda.', kind: 'fieltro', design: layeredTree,
    params: [alto(100, 250), FELT_MARGIN], defaults: { alto: 150, margen: 3 } },
  { id: 'adorno-arbol-retales', name: 'Árbol escalonado de retales', summary: 'Árbol de tela en sándwich con guata, pespunte a la vista y margen recortado en zigzag.', kind: 'retales',
    params: [alto(90, 220), choice('pisos', 'Pisos', [['3', '3 pisos'], ['4', '4 pisos']]), { key: 'margen', label: 'Margen recortado en zigzag', group: 'margenes', type: 'length', min: 4, max: 10 }], defaults: { alto: 140, pisos: '3', margen: 6 } },
  { id: 'adorno-adviento', name: 'Figurita de adviento', summary: 'Nueve figuritas de fieltro para el calendario de adviento, con el número del día bordado.', kind: 'fieltro', design: advent,
    params: [alto(50, 130, 'Alto de la figurita'), choice('forma', 'Figura', FORMS), { key: 'numero', label: 'Número del día', group: 'diseno', type: 'choice', choices: NUMBERS }, FELT_MARGIN], defaults: { alto: 75, forma: 'manopla', numero: 'ninguno', margen: 3 } },
  { id: 'bota-navidena', name: 'Bota navideña', summary: 'Bota forrada con puño doble o de ondas, presilla, talón y puntera de contraste y aplique de reno o árbol.', kind: 'bota',
    params: [alto(250, 600, 'Alto de la bota (sin la presilla)'), choice('puno', 'Puño', [['recto', 'Puño doble recto'], ['ondas', 'Puño de ondas']]), choice('talon', 'Talón y puntera', [['no', 'De la misma tela'], ['si', 'De tela de contraste']]), choice('aplique', 'Aplique', [['ninguno', 'Sin aplique'], ['reno', 'Reno con acebo'], ['arbol', 'Árbol con bolas']]), { key: 'margen', label: 'Margen de costura', group: 'margenes', type: 'length', min: 6, max: 15 }],
    defaults: { alto: 450, puno: 'recto', talon: 'no', aplique: 'ninguno', margen: 10 } }
];
export const ORNAMENT_IDS = DEFS.map(d => d.id);
const full = (d: Def, p: Params): Params => ({ ...d.defaults, ...p });
/** The finished ornament (pieces and drawing) for the card drawing and the tests. */
export function ornamentLayout(id: string, params: Params): { art: OrnArt[]; felt?: OrnLayout; stocking?: StockingLayout; patchwork?: ReturnType<typeof patchwork> } {
  const d = DEFS.find(x => x.id === id)!, p = full(d, params), sa = num(p, 'margen');
  if (d.kind === 'fieltro') { const L = assemble(d.design!(p), num(p, 'alto'), sa); return { art: L.art, felt: L }; }
  if (d.kind === 'retales') { const L = patchwork(p, sa); return { art: L.art, patchwork: L }; }
  const L = stocking(p, sa); return { art: L.art, stocking: L };
}
const SAFETY: Issue = { level: 'aviso', code: 'adorno-seguridad', message: 'Es un adorno, no un juguete: botones, cuentas, cascabeles y pompones son piezas pequeñas. Cuélgalo fuera del alcance de bebés y niños pequeños, con una presilla corta; si es para niños, borda los ojos y los botones.' };
const STOCKING_SAFETY: Issue = { level: 'aviso', code: 'bota-seguridad', message: 'Cuelga la bota lejos de la chimenea encendida, velas y estufas, con la presilla corta. Los apliques de fieltro y los botones no son para bebés.' };
function build(d: Def, p: Params): GeneratorResult {
  const sa = num(p, 'margen');
  for (const def of d.params) if (def.type === 'length' && !(num(p, def.key) >= def.min! && num(p, def.key) <= def.max!)) return invalid('adorno-medidas', `${def.label}: de ${cm(def.min!)} a ${cm(def.max!)}.`);
  const H = num(p, 'alto');
  if (d.kind === 'fieltro') {
    const L = assemble(d.design!(p), H, sa), dz = L.design, body = L.pieces[0];
    const bodyArea = area(dz.body), stuffing = Math.max(5, Math.round((bodyArea / 100) * 0.08 / 5) * 5);
    return {
      pieces: L.pieces, seams: [],
      notices: [exp(d.name), SAFETY, { level: 'ok', code: 'adorno-medidas-ok', message: `${d.name} de ${cm(L.height)} de alto. Fieltro cortado por el contorno, sin margen añadido: la puntada va a ${cm(sa)} del borde.` }, ...dz.notes.map(message => ({ level: 'ok' as const, code: 'adorno-nota', message }))],
      checks: [{ key: 'alto', label: 'Alto del adorno', target: H, measured: L.height, tolerance: 0.5 }],
      materials: [{ id: 'fieltro', label: 'Fieltro de 1–2 mm (lana o mezcla) en los colores del dibujo', qty: `${cm(Math.ceil(L.width / 10) * 10 + 20)} × ${cm(Math.ceil(L.height / 10) * 10 + 20)} de cada color principal y retales` }, { id: 'relleno', label: 'Relleno de fibra (poco, para darle cuerpo)', qty: `unos ${stuffing} g` }, { id: 'cinta', label: 'Cinta o cordón de 3–6 mm para la presilla', qty: '15 cm' }, { id: 'hilo', label: 'Hilo de bordar (mouliné) a juego y blanco', qty: '2–3 madejas' }, ...dz.materials],
      assumptions: ['Piezas de fieltro a tamaño real, sin margen: se cortan por la línea y se cosen a mano con festón o pespunte por la línea discontinua.', `Escala ${Math.round(L.k * 100)} % del diseño de referencia.`],
      steps: [
        ...dz.steps.map(s => ({ ...s, pieces: [] as string[] })),
        { id: 'unir', title: 'Une y rellena', detail: `Dobla la cinta en presilla y prende sus puntas arriba, entre las capas${L.design.parts.some(x => x.kind === 'entre') ? ', junto con las piezas que entran entre ellas' : ''}. ${dz.bodyQty === 2 ? 'Cose delantero y trasero' : 'Cose las capas sobre la trasera'} con festón por la línea, deja 3 cm sin coser, rellena poco y cierra.`, pieces: [body.id] }
      ]
    };
  }
  if (d.kind === 'retales') {
    const L = patchwork(p, sa);
    return {
      pieces: L.pieces, seams: L.seams,
      notices: [exp(d.name), SAFETY, { level: 'ok', code: 'adorno-medidas-ok', message: `Árbol de ${cm(H)} con ${str(p, 'pisos')} pisos: se cose revés con revés, sin voltear, y el margen de ${cm(sa)} se recorta con tijeras de zigzag.` }],
      checks: [{ key: 'alto', label: 'Alto del árbol', target: H, measured: Math.max(...L.outline.map(q => q.y)) - Math.min(...L.outline.map(q => q.y)), tolerance: 0.5 }],
      materials: [{ id: 'tela', label: 'Dos retales de algodón (lunares, rayas, flores)', qty: `${cm(H + 40)} × ${cm(H * 0.8 + 40)} cada uno` }, { id: 'guata', label: 'Guata fina o entretela gruesa', qty: `${cm(H)} × ${cm(H * 0.8)}` }, { id: 'boton', label: 'Botón de estrella de madera', qty: '1' }, { id: 'cinta', label: 'Cinta de 1 cm para la presilla', qty: '20 cm' }, { id: 'tijeras', label: 'Tijeras de zigzag', qty: '1' }],
      assumptions: [`Pieza dibujada en la línea de pespunte con ${cm(sa)} de margen, que queda a la vista recortado en zigzag.`],
      steps: [
        { id: 'sandwich', title: 'Sándwich', detail: 'Pon el trasero del revés, la guata encima y el delantero del derecho. Prende la presilla arriba, entre las telas.', pieces: ['delantero', 'trasero', 'guata'] },
        { id: 'pespunte', title: 'Pespunte', detail: 'Pespuntea por la línea de costura alrededor, con puntada corta.', pieces: ['delantero'] },
        { id: 'zigzag', title: 'Zigzag y botón', detail: 'Recorta el margen con tijeras de zigzag sin cortar el pespunte. Cose el botón de estrella sobre la presilla.', pieces: ['delantero'] }
      ]
    };
  }
  const L = stocking(p, sa);
  return {
    pieces: L.pieces, seams: L.seams,
    notices: [exp(d.name), STOCKING_SAFETY, { level: 'ok', code: 'adorno-medidas-ok', message: `Bota de ${cm(H)} de alto con boca de ${cm(runLength(L.pieces[0], 'boca'))} y puño de ${cm(L.cuffH)}${str(p, 'aplique') !== 'ninguno' ? '; el aplique va solo en el delantero' : ''}.` }, ...L.notes.map(message => ({ level: 'aviso' as const, code: 'bota-aplique', message }))],
    checks: [{ key: 'alto', label: 'Alto de la bota', target: H, measured: Math.max(...L.body.map(q => q.y)) - Math.min(...L.body.map(q => q.y)), tolerance: 0.01 * H }],
    materials: [{ id: 'tela', label: 'Fieltro grueso, terciopelo, lana o loneta para la bota', qty: `${cm(H * 1.6)} × ${cm(H * 0.8)}` }, { id: 'forro', label: 'Forro de algodón', qty: `${cm(H * 1.6)} × ${cm(H * 0.8)}` }, { id: 'contraste', label: 'Tela de contraste para el puño, la presilla, el talón y la puntera', qty: `${cm(H * 0.9)} × ${cm(H * 0.6)}` }, ...(str(p, 'aplique') !== 'ninguno' ? [{ id: 'fieltro', label: 'Fieltro para el aplique y entretela termoadhesiva de doble cara', qty: 'Retales' }] : [])],
    assumptions: [`Piezas a tamaño real con ${cm(sa)} de margen; el aplique y sus piezas de fieltro van sin margen.`],
    steps: [
      { id: 'apliques', title: 'Delantero', detail: `${str(p, 'talon') === 'si' ? 'Hilvana el talón y la puntera sobre la bota y cose su borde curvo con zigzag o festón (en fieltro, o en tela con entretela termoadhesiva). ' : ''}${str(p, 'aplique') !== 'ninguno' ? 'Cose el aplique en el delantero, de atrás hacia delante, con puntadas pequeñas o zigzag corto.' : ''}`.trim() || 'Plancha las piezas.', pieces: ['exterior'] },
      { id: 'bota', title: 'Bota y forro', detail: 'Cose delantero y trasero derecho con derecho por el contorno, sin la boca; piquetea las curvas y voltea. Cose el forro igual, sin voltear.', pieces: ['exterior', 'forro'] },
      { id: 'puno', title: 'Puño y presilla', detail: str(p, 'puno') === 'ondas' ? 'Une las dos piezas de fieltro del puño por los costados; las ondas quedan con el borde cortado. Borda los copos en el delantero.' : 'Cierra el puño en anillo y dóblalo por la mitad.', pieces: ['puno'] },
      { id: 'montar', title: 'Monta', detail: 'Mete el forro en la bota. Prende la presilla doblada en el costado de atrás y el puño por fuera, con los cantos en la boca; cose alrededor y vuelve el puño hacia abajo.', pieces: ['exterior', 'puno', 'presilla'] }
    ]
  };
}
export const ORNAMENT_GENERATORS: PatternGenerator[] = DEFS.map(d => ({
  id: d.id, name: d.name, status: 'experimental', summary: d.summary, requiredMeasures: [], optionalMeasures: [], params: d.params,
  defaults: () => full(d, {}),
  generate: (ctx: GeneratorContext, params: Params) => { void ctx; return build(d, full(d, params)); }
}));
