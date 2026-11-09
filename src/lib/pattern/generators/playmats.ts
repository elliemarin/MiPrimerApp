import { num, str, type GeneratorContext, type GeneratorResult, type ParamDef, type Params, type PatternGenerator } from '../generator';
import type { FabricRole, Issue, Piece, SeamRelation } from '../types';
import type { Pt } from '../../geom/vec';
import { P, cm, edge, equal, invalid, rectangle } from './kidsShared';
import { exp, notchAt, runLength } from './toyKit';
import { polyRuns, strips } from './cushionKit';
import { circle, ellipse, pos, rrect, uni } from '../../applique/shapes';
import { differencePolygons, offsetPolygons, strokePolyline, unionPolygons } from '../../geom/polyoffset';
import { bendFor, biggest, box, clipLines, halfOnFold, inset, insidePoly, mirrorX, near, rightOfFold, smooth, spline } from './shapeKit';
import { SENSORY, cloudShape, heart, ring, uShape, type SensElement } from './sensoryKit';

/* Tapetes de juego (2026-11-09): en francés «tapis d'éveil», en alemán
 * «Krabbeldecke» o «Spieldecke», en inglés «play mat» o «activity mat».
 * Diseños propios a partir de 16 fotos de la usuaria:
 * - tapetes con forma, acolchados: sol, arcoíris de bandas, oso, conejo, flor,
 *   hojas (acorazonada, ovalada, ginkgo, festoneada y monstera) y fresa;
 * - tapete con borde de pétalos rellenos (redondo, o colchoneta con cabecero);
 * - tapete puzle de cojines que encajan;
 * - tapetes sensoriales de cuadros (3 × 3 o 4 × 4) y hexagonal, con el kit de
 *   elementos de sensoryKit.ts.
 * Las líneas de acolchado, los apliques y los elementos se marcan en las
 * piezas: se imprimen y se proyectan. Las piezas simétricas se pueden cortar
 * enteras (para proyectar) o al doblez (la mitad de papel). */

type Step = { id: string; title: string; detail: string };
type Mat = { id: string; label: string; qty: string };
/** Illustration item: a filled outline, or a stroked line when `line` is set (width in mm). */
export interface MatArt { pts: Pt[]; role: string; line?: number; dash?: boolean }
export interface MatApp { id: string; name: string; poly: Pt[]; color: string; pair?: boolean }
export interface MatLayout {
  /** Seam line of the whole mat (mm), x = 0 on the axis of symmetry. */
  body: Pt[]; symmetric: boolean; bodyName: string;
  /** The top is made of panels in `extras`; the body piece is only the back. */
  pieced?: boolean;
  quilt: Pt[][]; apps: MatApp[]; emb: Pt[][]; places: { name: string; poly: Pt[] }[]; marks: { at: Pt; label: string }[];
  extras: Piece[]; seams: SeamRelation[];
  runOf?: (a: Pt, b: Pt) => string;
  onBody?: (body: Piece, fold: boolean) => SeamRelation[];
  behind: MatArt[]; front: MatArt[];
  notes: Issue[]; steps: Step[]; materials: Mat[];
  bindStraight?: boolean; turnedOnly?: boolean;
  size: { label: string; measured: number };
}
const lay = (l: Partial<MatLayout> & Pick<MatLayout, 'body' | 'bodyName' | 'size'>): MatLayout =>
  ({ symmetric: true, quilt: [], apps: [], emb: [], places: [], marks: [], extras: [], seams: [], behind: [], front: [], notes: [], steps: [], materials: [], ...l });

const TAU = Math.PI * 2;
const arc = (r: number, a0: number, a1: number, n: number, cx = 0, cy = 0) => Array.from({ length: n + 1 }, (_, i) => { const a = a0 + ((a1 - a0) * i) / n; return P(cx + r * Math.cos(a), cy + r * Math.sin(a)); });
const loop = (pts: Pt[]) => [...pts, pts[0]];
const bboxW = (pts: Pt[]) => Math.max(...pts.map(q => q.x)) - Math.min(...pts.map(q => q.x));
const bboxH = (pts: Pt[]) => Math.max(...pts.map(q => q.y)) - Math.min(...pts.map(q => q.y));
const perimeter = (pts: Pt[]) => pts.reduce((s, q, i) => { const r = pts[(i + 1) % pts.length]; return s + Math.hypot(r.x - q.x, r.y - q.y); }, 0);
export const runIds = (pc: Piece, run: string) => pc.edges.filter(e => e.id === run || new RegExp(`^${run}-\\d+$`).test(e.id)).map(e => e.id);
const instances = (a: MatApp) => (a.pair ? [a.poly, mirrorX(a.poly)] : [a.poly]);
/** Half ring (or half disc when r1 = 0) standing on y = 0; on the fold only its right quarter. */
function halfRing(r1: number, r2: number, fold: boolean, n = 72): Pt[] {
  if (fold) return [...arc(r2, -Math.PI / 2, 0, n / 2), ...(r1 > 0 ? arc(r1, 0, -Math.PI / 2, n / 2) : [P(0, 0)])];
  return [...arc(r2, -Math.PI, 0, n), ...(r1 > 0 ? arc(r1, 0, -Math.PI, n) : [])];
}
const ringRuns = (r2: number, fold: boolean) => (a: Pt, b: Pt) =>
  near(a.y, 0) && near(b.y, 0) ? ((a.x + b.x) / 2 >= 0 ? 'bajo' : 'extremo') : fold && near(a.x, 0) && near(b.x, 0) ? 'doblez' : Math.abs(Math.hypot(a.x, a.y) - r2) < 0.5 && Math.abs(Math.hypot(b.x, b.y) - r2) < 0.5 ? 'exterior' : 'interior';

// ------------------------------------------------------------------ Shaped quilted mats
function sun(p: Params): MatLayout {
  const D = num(p, 'diametro'), n = Math.round(num(p, 'rayos')), R = D / 2, Rv = 0.8 * R, body: Pt[] = [];
  for (let i = 0; i < n; i++) { const a = -Math.PI / 2 + (i * TAU) / n, b = a + Math.PI / n; body.push(P(R * Math.cos(a), R * Math.sin(a)), P(Rv * Math.cos(b), Rv * Math.sin(b))); }
  const spiral = str(p, 'acolchado') !== 'circulos', step = 0.085 * D, rEnd = Rv - 0.04 * D, raw: Pt[][] = [];
  if (spiral) { const r0 = 0.035 * D, pts: Pt[] = []; for (let t = 0, r = r0; r <= rEnd; t += Math.min(0.25, 12 / r), r = r0 + (step * t) / TAU) pts.push(P(r * Math.cos(t), r * Math.sin(t))); raw.push(pts); }
  else for (let r = 0.08 * D; r <= rEnd; r += step) raw.push(loop(arc(r, 0, TAU, Math.max(48, Math.round(r / 12)))));
  const toys = str(p, 'juguetes') !== 'no', anchors = toys ? [200, 330, 15].map(a => P(0.55 * R * Math.cos((a * Math.PI) / 180), 0.55 * R * Math.sin((a * Math.PI) / 180))) : [];
  const tabs = anchors.map(a => box(a.x - 20, a.y - 55, a.x + 20, a.y + 55));
  const L = lay({
    body, symmetric: !spiral, bodyName: `Sol de ${n} rayos`, size: { label: 'Diámetro de punta a punta', measured: 2 * Math.max(...body.map(q => Math.hypot(q.x, q.y))) },
    quilt: clipLines(raw, body, 30, tabs, 20), places: tabs.map(t => ({ name: 'Lengüeta de anclaje', poly: t })), marks: anchors.map(a => ({ at: P(a.x, a.y + 40), label: 'Broche' })),
    notes: [{ level: 'ok', code: 'sol', message: `${n} rayos y acolchado ${spiral ? 'en espiral desde el centro' : 'en círculos'} cada ${cm(step)}.${spiral ? ' La espiral no es simétrica: el sol se corta entero.' : ''}` }],
    steps: spiral ? [{ id: 'espiral', title: 'Espiral', detail: 'Pespuntea la espiral desde el centro hacia fuera, girando la tela poco a poco, con el prensatelas de doble arrastre si lo tienes.' }] : []
  });
  if (toys) {
    const s6 = 6, tab = (id: string, name: string, w: number, h: number, qty: number) => rectangle(id, name, w, h, [edge('a', 'Canto', 'costura', s6), edge('b', 'Extremo', 'costura', s6), edge('c', 'Canto', 'costura', s6), edge('d', 'Extremo', 'costura', s6)], { qty, fabric: 'contraste' });
    const cloud = smooth([cloudShape(150)], bendFor(s6)), arch = halfRing(34, 100, false);
    L.extras.push(tab('anclaje', 'Lengüeta de anclaje con broche (3 × 2)', 40, 110, 6), tab('lengueta-juguete', 'Lengüeta de cada juguete con su anilla (3 × 2)', 36, 120, 6),
      polyRuns('nube-colgante', 'Nube colgante (2 nubes, rellena)', cloud, () => 'contorno', { k: 1, sa: s6, felt: false }, { qty: 4, fabric: 'contraste' }),
      polyRuns('arcoiris-colgante', 'Arcoíris colgante: base (rellena)', arch, () => 'contorno', { k: 1, sa: s6, felt: false }, { qty: 2, fabric: 'contraste' }),
      ...[[40, 56], [60, 76], [80, 94]].map(([a, b], i) => polyRuns(`arcoiris-banda-${i + 1}`, `Arcoíris colgante: banda ${i + 1} (aplique)`, halfRing(a, b, false), () => 'borde', { k: 1, sa: 0, felt: true }, { qty: 2, fabric: 'contraste' })));
    L.materials.push({ id: 'anillas', label: 'Anillas de madera sin barniz o de silicona de 5 a 6,5 cm', qty: '3' }, { id: 'broches', label: 'Broches de presión de plástico', qty: '3' });
    L.steps.push({ id: 'juguetes', title: 'Juguetes con anilla', detail: 'Cose las lengüetas de anclaje sobre el delantero antes de acolchar. Cose la nube y el arcoíris con su lengüeta y su anilla; se enganchan a la lengüeta del sol con el broche, sin cintas largas.' });
    const [a0, a1, a2] = anchors;
    const hang = (a: Pt, shape: Pt[], role: string, dy: number) => [{ pts: box(a.x - 20, a.y - 55, a.x + 20, a.y + 55), role: 'tela2' }, { pts: ring(a.x, a.y + 70, 28), role: 'madera', line: 9 }, { pts: shape.map(q => P(q.x + a.x, q.y + a.y + dy)), role }];
    L.front.push(...hang(a0, arch, 'tela1', 210), ...[0, 1, 2].map(i => ({ pts: halfRing(40 + 20 * i, 56 + 20 * i, false).map(q => P(q.x + a0.x, q.y + a0.y + 210)), role: ['agua', 'rosa', 'amarillo'][i] })), ...hang(a1, cloud, 'agua', 210), ...hang(a2, cloud, 'blanco', 210));
  }
  return L;
}

function rainbow(p: Params, sa: number): MatLayout {
  const W = num(p, 'ancho'), R = W / 2, nb = Math.round(num(p, 'bandas')), r0 = 0.36 * R, bw = (R - r0) / nb, fold = str(p, 'corte') === 'doblez';
  const radii = Array.from({ length: nb + 1 }, (_, i) => r0 + i * bw), roles = ['tela1', 'blanco', 'tela2', 'rosa', 'amarillo', 'agua'];
  const fabrics: FabricRole[] = ['principal', 'contraste'], onAxis = (q: Pt) => near(q.y, 0) || (fold && near(q.x, 0));
  const center = polyRuns('centro', `Centro del arcoíris (medio círculo${fold ? ', al doblez' : ''})`, halfRing(0, r0, fold), ringRuns(r0, fold), { k: 1, sa, felt: false }, { qty: 1, fold: fold ? 'doblez' : undefined, onFold: fold }, onAxis);
  const bands = radii.slice(1).map((r2, i) => polyRuns(`banda-${i + 1}`, `Banda ${i + 1} de ${nb}${fold ? ' (al doblez)' : ''}`, halfRing(radii[i], r2, fold), ringRuns(r2, fold), { k: 1, sa, felt: false }, { qty: 1, fabric: fabrics[i % 2], fold: fold ? 'doblez' : undefined, onFold: fold }, onAxis));
  const seams = bands.map((b, i) => { const prev = i ? bands[i - 1] : center; return equal(`arco-${i + 1}`, `Banda ${i + 1} sobre ${i ? `la banda ${i}` : 'el centro'}`, [{ pieceId: prev.id, edgeIds: runIds(prev, 'exterior') }], [{ pieceId: b.id, edgeIds: runIds(b, 'interior') }], 1); });
  // Quilting: a line along the middle of each wide band.
  bands.forEach((b, i) => {
    const rm = (radii[i] + radii[i + 1]) / 2; if (bw < 70) return;
    const d = 30 / rm, pts = fold ? arc(rm, -Math.PI / 2, -d, 40) : arc(rm, -Math.PI + d, -d, 80);
    pts.slice(1).forEach((q, j) => b.lines.push({ id: `acolchado-${j}`, kind: 'pespunte', a: pts[j], b: q, label: j ? undefined : 'Acolchado' }));
  });
  const heartOn = str(p, 'corazon') !== 'no', h = heart(0, -0.45 * r0, 0.62 * r0), extras: Piece[] = [center, ...bands];
  if (heartOn) {
    const outline = fold ? rightOfFold([loop(h)]) : [loop(h)];
    outline.forEach((l, j) => l.slice(1).forEach((q, i) => center.lines.push({ id: `aplique-corazon-${j}-${i}`, kind: 'colocacion', a: l[i], b: q, label: i || j ? undefined : 'Corazón: colocación' })));
    extras.push(polyRuns('aplique-corazon', 'Corazón (aplique sin margen)', h, () => 'borde', { k: 1, sa: 0, felt: true }, { qty: 1, fabric: 'contraste' }));
  }
  return lay({
    body: halfRing(0, R, false), bodyName: 'Arcoíris', pieced: true, size: { label: 'Ancho', measured: 2 * R }, extras, seams,
    front: [...radii.slice(1).reverse().map((r2, j) => ({ pts: halfRing(0, r2, false), role: roles[(nb - 1 - j) % roles.length] })), { pts: halfRing(0, r0, false), role: 'blanco' },
      ...radii.slice(1).map((r2, i) => ({ pts: arc((radii[i] + r2) / 2, -Math.PI + 0.03, -0.03, 60), role: 'detalle', line: 2, dash: true })), ...(heartOn ? [{ pts: h, role: 'rosa' }] : [])],
    notes: [{ level: 'ok', code: 'arcoiris', message: `${nb} bandas de ${cm(bw)} y centro de ${cm(2 * r0)}. Cada banda se une a la anterior por un arco del mismo largo.` }],
    steps: [{ id: 'bandas', title: 'Bandas', detail: 'Une el centro con la banda 1 y cada banda con la siguiente, casando los arcos desde el medio con alfileres cada 5 cm. Plancha los márgenes hacia fuera.' }]
  });
}

function bear(p: Params): MatLayout {
  const D = num(p, 'diametro'), R = D / 2;
  const body = biggest(uni(circle(0, 0, R, 160), ...[-1, 1].map(sg => circle(sg * 0.7 * R, -0.66 * R, 0.27 * R, 56))));
  const apps: MatApp[] = [
    { id: 'oreja-interior', name: 'Interior de la oreja (rayas)', poly: ellipse(-0.7 * R * 1.105 / 0.962, -0.66 * R * 1.105 / 0.962, 0.15 * R, 0.085 * R, (Math.atan2(-0.66, -0.7) * 180) / Math.PI + 90, 40), color: 'rosa', pair: true },
    { id: 'hocico', name: 'Hocico (rayas)', poly: ellipse(0, 0.12 * R, 0.25 * R, 0.18 * R, 0, 60), color: 'rosa' },
    { id: 'nariz', name: 'Nariz', poly: ellipse(0, 0.04 * R, 0.095 * R, 0.068 * R, 0, 40), color: 'madera' },
    { id: 'ojo', name: 'Ojo', poly: circle(-0.2 * R, -0.17 * R, 0.05 * R, 32), color: 'noche', pair: true }
  ];
  const mouth = [[P(0, 0.108 * R), P(0, 0.2 * R)], [P(0, 0.2 * R), P(-0.04 * R, 0.225 * R), P(-0.09 * R, 0.225 * R), P(-0.12 * R, 0.2 * R)], [P(0, 0.2 * R), P(0.04 * R, 0.225 * R), P(0.09 * R, 0.225 * R), P(0.12 * R, 0.2 * R)]];
  const rings = [0.42, 0.72, 1].map(f => loop(arc(f * R, 0, TAU, 160)));
  return lay({
    body, bodyName: 'Oso', size: { label: 'Diámetro de la cabeza', measured: D }, apps, emb: mouth,
    quilt: clipLines(rings, body, 30, apps.flatMap(instances), 8),
    notes: [{ level: 'ok', code: 'oso', message: 'Tres anillos de acolchado: el de fuera separa las orejas de la cabeza. Ojos y nariz de tela aplicada, nunca botones.' }],
    steps: [{ id: 'boca', title: 'Boca', detail: 'Borda la boca con pespunte triple o punto atrás, por encima del hocico.' }]
  });
}

function bunny(p: Params): MatLayout {
  const H = num(p, 'alto');
  const raw = biggest(uni(ellipse(0, 1125, 500, 375, 0, 120), ellipse(-235, 410, 150, 400, -9, 72), ellipse(235, 410, 150, 400, 9, 72)));
  const y0 = Math.min(...raw.map(q => q.y)), g = H / bboxH(raw), T = (pts: Pt[]) => pts.map(q => P(q.x * g, (q.y - y0) * g));
  const nose = biggest(offsetPolygons(offsetPolygons([[P(-40, 1215), P(40, 1215), P(0, 1262)]], -8), 8));
  const apps: MatApp[] = [
    { id: 'oreja-interior', name: 'Interior de la oreja', poly: T(ellipse(-235, 440, 72, 290, -9, 48)), color: 'rosa', pair: true },
    { id: 'ojo', name: 'Ojo', poly: T(ellipse(-250, 1090, 32, 40, 0, 32)), color: 'noche', pair: true },
    { id: 'mejilla', name: 'Mejilla', poly: T(circle(-340, 1225, 46, 32)), color: 'rosa', pair: true },
    { id: 'nariz', name: 'Nariz', poly: T(nose), color: 'rosa' }
  ];
  const body = T(raw), lines = Array.from({ length: 12 }, (_, i) => T([P(-700, 120 + i * 120), P(700, 120 + i * 120)]));
  return lay({
    body, bodyName: 'Conejo', size: { label: 'Alto con las orejas', measured: bboxH(body) }, apps,
    emb: [T([P(0, 1262), P(0, 1290)]), T([P(0, 1290), P(-14, 1304), P(-32, 1302), P(-42, 1292)]), T([P(0, 1290), P(14, 1304), P(32, 1302), P(42, 1292)])],
    quilt: clipLines(lines, body, 30, apps.flatMap(instances), 22),
    notes: [{ level: 'ok', code: 'conejo', message: `Cabeza de ${cm(1000 * g)} de ancho y orejas de ${cm(800 * g)}. Cara propia: nariz, boca bordada y mejillas.` }],
    steps: [{ id: 'boca', title: 'Boca', detail: 'Borda la boca bajo la nariz con pespunte triple.' }]
  });
}

function flower(p: Params): MatLayout {
  const D = num(p, 'diametro'), n = Math.round(num(p, 'petalos')), R = D / 2, sn = Math.sin(Math.PI / n), d = R / (1 + 1.15 * sn), rp = R - d, rc = 0.2 * R;
  const ang = (i: number) => -Math.PI / 2 + (i * TAU) / n;
  const body = biggest(uni(circle(0, 0, d, 96), ...Array.from({ length: n }, (_, i) => circle(d * Math.cos(ang(i)), d * Math.sin(ang(i)), rp, 72))));
  const notch = d * Math.cos(Math.PI / n) + Math.sqrt(Math.max(0, rp * rp - (d * sn) ** 2)), raw: Pt[][] = [loop(arc(rc, 0, TAU, 72))];
  for (let i = 0; i < n; i++) {
    const b = ang(i + 0.5); raw.push([P(rc * Math.cos(b), rc * Math.sin(b)), P(notch * Math.cos(b), notch * Math.sin(b))]);
    for (const f of [-0.4, 0, 0.4]) { const a = ang(i) + (f * Math.PI) / n; raw.push([P(rc * Math.cos(a), rc * Math.sin(a)), P(R * Math.cos(a), R * Math.sin(a))]); }
  }
  return lay({
    body, bodyName: `Flor de ${n} pétalos`, size: { label: 'Diámetro', measured: 2 * Math.max(...body.map(q => Math.hypot(q.x, q.y))) },
    quilt: clipLines(raw, body, 35), notes: [{ level: 'ok', code: 'flor', message: `${n} pétalos con acolchado radial desde un centro de ${cm(2 * rc)}.` }]
  });
}

type Anchor = [number, number, string?];
/** Symmetric spline outline from the top (x = 0) down the right side to the bottom (x = 0), mirrored. */
function symSpline(top: Anchor, right: Anchor[], bottom?: Anchor): Pt[] {
  const a: [number, number, string | undefined, string | undefined][] = [[0, top[1], 'contorno', top[2]], ...right.map(([x, y, f]) => [x, y, undefined, f] as [number, number, undefined, string | undefined])];
  if (bottom) a.push([0, bottom[1], undefined, bottom[2]]);
  a.push(...[...right].reverse().map(([x, y, f]) => [-x, y, undefined, f] as [number, number, undefined, string | undefined]));
  return spline(a);
}
const LEAF_SIZE: Record<string, string> = { acorazonada: 'Hoja acorazonada', ovalada: 'Hoja ovalada', ginkgo: 'Hoja de ginkgo', festoneada: 'Hoja festoneada', monstera: 'Hoja de monstera' };
function leaf(p: Params): MatLayout {
  const H = num(p, 'alto'), forma = str(p, 'forma'), veins: Pt[][] = [];
  const side = (y: number, dir: number) => { const pts: Pt[] = []; for (let i = 0; i <= 12; i++) { const t = i / 12, x = 0.6 * t, yy = y + dir * (0.16 * t * t + 0.02 * t); pts.push(P(x, yy)); } return pts; };
  const both = (l: Pt[]) => [l, l.map(q => P(-q.x, q.y))];
  let unit: Pt[];
  if (forma === 'acorazonada') {
    unit = symSpline([0, 0.13, 'c'], [[0.1, 0.03], [0.27, 0], [0.42, 0.08], [0.48, 0.27], [0.43, 0.5], [0.3, 0.72], [0.13, 0.9]], [0, 1, 'c']);
    veins.push([P(0, 0.15), P(0, 0.96)], ...[0.25, 0.38, 0.51, 0.64, 0.77].flatMap(y => both(side(y, 1))), ...both([P(0, 0.16), P(0.17, 0.1), P(0.34, 0.08)]), ...both([P(0, 0.17), P(0.24, 0.2), P(0.44, 0.3)]));
  } else if (forma === 'ginkgo') {
    unit = biggest(uni(symSpline([0, 0.1, 'c'], [[0.08, 0.02], [0.22, 0], [0.34, 0.05], [0.41, 0.17], [0.36, 0.34], [0.24, 0.52], [0.11, 0.68]], [0, 0.76, 'c']), box(-0.03, 0.72, 0.03, 1)));
    for (const deg of [-50, -36, -22, -8, 8, 22, 36, 50]) { const a = (deg * Math.PI) / 180; veins.push([P(0, 0.74), P(Math.sin(a), 0.74 - Math.cos(a))]); }
  } else if (forma === 'festoneada') {
    const blade = symSpline([0, 0, 'c'], [[0.16, 0.06], [0.33, 0.2], [0.4, 0.42], [0.37, 0.66], [0.25, 0.86]], [0, 0.97, 'c']);
    const bumps: Pt[][] = []; let acc = 0;
    blade.forEach((q, i) => { const r = blade[(i + 1) % blade.length]; acc += Math.hypot(r.x - q.x, r.y - q.y); if (acc >= 0.075 && q.y > 0.05 && q.y < 0.92) { acc = 0; const dx = q.x, dy = q.y - 0.5, l = Math.hypot(dx, dy) || 1; bumps.push(circle(q.x - (dx / l) * 0.025, q.y - (dy / l) * 0.025, 0.045, 24)); } });
    unit = biggest(uni(blade, ...bumps, box(-0.03, 0.93, 0.03, 1)));
    veins.push([P(0, 0.05), P(0, 0.95)], ...[0.2, 0.32, 0.44, 0.56, 0.68, 0.8].flatMap(y => both(side(y, -1))));
  } else if (forma === 'monstera') {
    unit = symSpline([0, 0], [[0.18, 0.03], [0.35, 0.12], [0.46, 0.3], [0.49, 0.5], [0.45, 0.7], [0.35, 0.86], [0.2, 0.98], [0.08, 0.97]], [0, 0.9, 'c']);
    veins.push([P(0, 0.06), P(0, 0.88)], ...[0.2, 0.4, 0.6, 0.8].flatMap(y => both(side(y, -1))));
  } else {
    unit = biggest(uni(symSpline([0, 0, 'c'], [[0.13, 0.07], [0.31, 0.23], [0.39, 0.43], [0.37, 0.62], [0.27, 0.79], [0.11, 0.9]], [0, 0.93, 'c']), box(-0.035, 0.88, 0.035, 1)));
    veins.push([P(0, 0.05), P(0, 0.92)], ...[0.22, 0.34, 0.46, 0.58, 0.7, 0.82].flatMap(y => both(side(y, -1))));
  }
  const y0 = Math.min(...unit.map(q => q.y)), g = H / bboxH(unit), T = (pts: Pt[]) => pts.map(q => P(q.x * g, (q.y - y0) * g));
  let body = T(unit);
  if (forma === 'monstera') {
    // Slits along the side veins, 7 cm wide so they can be turned or bound.
    const slits = [0.3, 0.5, 0.7].flatMap(y => [1, -1].map(sg => biggest(strokePolyline(T([P(sg * 0.2, y + 0.06), P(sg * 0.62, y - 0.06)]), 70))));
    body = biggest(differencePolygons([body], slits));
  }
  return lay({
    body, bodyName: LEAF_SIZE[forma] ?? 'Hoja', size: { label: 'Alto', measured: bboxH(body) }, quilt: clipLines(veins.map(T), body, 35),
    notes: [{ level: 'ok', code: 'hoja', message: `${LEAF_SIZE[forma] ?? 'Hoja'} de ${cm(bboxW(body))} × ${cm(bboxH(body))}: el acolchado dibuja el nervio central y los nervios.${forma === 'monstera' ? ' Los cortes miden 7 cm de ancho para poder voltearlos o ribetearlos.' : ''}` }]
  });
}

function strawberry(p: Params): MatLayout {
  const H = num(p, 'alto');
  const unit = biggest(uni(symSpline([0, 0.08, 'c'], [[0.16, 0.05], [0.33, 0.09], [0.44, 0.21], [0.47, 0.37], [0.41, 0.57], [0.29, 0.77], [0.13, 0.94]], [0, 1, 'c']), box(-0.035, 0, 0.035, 0.1)));
  const y0 = Math.min(...unit.map(q => q.y)), g = H / bboxH(unit), T = (pts: Pt[]) => pts.map(q => P(q.x * g, (q.y - y0) * g)), body = T(unit);
  const c = P(0, 0.17), sepals = [170, 130, 90, 50, 10].map(a => { const r = (a * Math.PI) / 180; return ellipse(c.x + Math.cos(r) * 0.1, c.y + Math.sin(r) * 0.1, 0.11, 0.03, a, 32); });
  const calyx = inset(T(biggest(uni(...sepals, box(-0.025, 0, 0.025, 0.18), circle(c.x, c.y, 0.05, 24)))), body, 8);
  const region = offsetPolygons([body], -40), avoid = offsetPolygons([calyx], 25), seeds: Pt[][] = [];
  const inside = (q: Pt) => region.some(r => insidePoly(q, r)) && !avoid.some(r => insidePoly(q, r));
  for (let j = 0; j < 9; j++) for (let i = -6; i <= 6; i++) {
    const x = (i + (j % 2 ? 0.5 : 0)) * 0.1, y = 0.3 + j * 0.085, seed = loop(T(ellipse(x, y, 0.012, 0.022, 0, 12)));
    if (seed.every(inside)) seeds.push(seed);
  }
  return lay({
    body, bodyName: 'Fresa', size: { label: 'Alto', measured: bboxH(body) }, apps: [{ id: 'caliz', name: 'Hojas y rabito de la fresa', poly: calyx, color: 'verde' }], quilt: seeds,
    notes: [{ level: 'ok', code: 'fresa', message: `${seeds.length} pepitas pespunteadas, cada una de ${cm(0.044 * H)}.` }],
    steps: [{ id: 'pepitas', title: 'Pepitas', detail: 'Pespuntea cada pepita dando la vuelta completa y remata sin cortar el hilo entre una y otra si vas en fila.' }]
  });
}

// ------------------------------------------------------------------ Petal border mat
function petals(p: Params, sa: number): MatLayout {
  const W = num(p, 'ancho'), round = str(p, 'forma') !== 'rectangular', h = num(p, 'petalo'), Lr = round ? W : num(p, 'largo'), rc = 0.12 * W;
  const body = round ? circle(0, W / 2, W / 2, 180) : rrect(-W / 2, 0, W, Lr, rc);
  const perim = perimeter(body), N = Math.max(8, 2 * Math.round(perim / (1.6 * 0.8 * h))), b = perim / N, s6 = Math.min(sa, 10);
  const petal = polyRuns('petalo', `Pétalo del borde (${N} pétalos: ${2 * N} piezas en telas variadas)`, uShape(b, h), (a, c) => (near(a.y, 0) && near(c.y, 0) ? 'union' : 'contorno'), { k: 1, sa: s6, felt: false }, { qty: 2 * N, fabric: 'contraste' });
  petal.notes = ['Cose cada pétalo dejando abierta la base, voltéalo, rellénalo poco e hilvana la base.'];
  const raw: Pt[][] = [];
  if (round) for (let t = -W; t <= W; t += 0.1 * W) raw.push([P(t - W, W / 2 - W), P(t + W, W / 2 + W)], [P(t - W, W / 2 + W), P(t + W, W / 2 - W)]);
  else { const f = 0.13 * W; raw.push(loop(rrect(-W / 2 + f, f, W - 2 * f, Lr - 2 * f, rc)), [P(0, f), P(0, Lr - f)], [P(-W / 2 + f, Lr / 2), P(W / 2 - f, Lr / 2)]); }
  // Petals around the outline, for the drawing.
  const colors = ['rosa', 'amarillo', 'agua', 'verde', 'tela2', 'tela1', 'lila'], border: MatArt[] = [];
  let acc = 0, k = 0;
  for (let i = 0; i < body.length && k < N; i++) {
    const a = body[i], c = body[(i + 1) % body.length], l = Math.hypot(c.x - a.x, c.y - a.y);
    while (acc + l >= (k + 0.5) * b && k < N) {
      const t = ((k + 0.5) * b - acc) / l, m = P(a.x + (c.x - a.x) * t, a.y + (c.y - a.y) * t), deg = (Math.atan2(c.y - a.y, c.x - a.x) * 180) / Math.PI;
      const rad = (deg * Math.PI) / 180, out = uShape(b * 0.98, h).map(q => P(m.x + q.x * Math.cos(rad) - q.y * Math.sin(rad), m.y + q.x * Math.sin(rad) + q.y * Math.cos(rad)));
      border.push({ pts: out, role: colors[k % colors.length] }); k++;
    }
    acc += l;
  }
  // The outline runs clockwise on screen, so "up" in the petal frame points outwards; check with the centroid.
  const cy = round ? W / 2 : Lr / 2, outward = border.length && Math.hypot(border[0].pts[8].x, border[0].pts[8].y - cy) > Math.hypot(border[0].pts[0].x, border[0].pts[0].y - cy);
  if (!outward) border.forEach(r => { const m = P((r.pts[0].x + r.pts[r.pts.length - 1].x) / 2, (r.pts[0].y + r.pts[r.pts.length - 1].y) / 2); r.pts = r.pts.map(q => P(2 * m.x - q.x, 2 * m.y - q.y)); });
  const L = lay({
    body, bodyName: round ? 'Centro redondo' : 'Colchoneta', size: { label: round ? 'Diámetro del centro' : 'Ancho de la colchoneta', measured: bboxW(body) }, turnedOnly: true,
    quilt: clipLines(raw, body, 30), extras: [petal], behind: border,
    onBody: (pc, fold) => {
      const total = runLength(pc, 'contorno'), count = fold ? N / 2 : N, step = total / count;
      for (let i = 1; i < count; i++) notchAt(pc, 'contorno', i * step, i === 1 ? 'Unión entre pétalos' : '', `petalo-${i}`);
      return [equal('petalos', 'Los pétalos cubren todo el borde', [{ pieceId: petal.id, edgeIds: runIds(petal, 'union'), factor: N }], [{ pieceId: pc.id, edgeIds: runIds(pc, 'contorno'), factor: fold ? 2 : 1 }], 0.012 * perim)];
    },
    notes: [{ level: 'ok', code: 'petalos', message: `${N} pétalos de ${cm(b)} × ${cm(h)} rodean todo el borde (${cm(perim)}).` }, { level: 'aviso', code: 'petalos-seguridad', message: 'Los rebordes rellenos son para jugar sentado o boca abajo con un adulto delante: no uses este tapete para dormir ni en la cuna.' }],
    steps: [{ id: 'petalos', title: 'Pétalos', detail: `Cose los ${N} pétalos, voltéalos y rellénalos poco. Hilvánalos por la base sobre el delantero, derecho con derecho y con las puntas hacia dentro, casando cada unión con un piquete.` }],
    materials: [{ id: 'relleno', label: 'Relleno de fibra hueca para los pétalos', qty: `unos ${Math.round((N * b * h) / 4000 / 10) * 10} g` }]
  });
  if (!round && str(p, 'cabecero') !== 'no') {
    const rh = 0.36 * W, half = halfRing(0, rh, false);
    const head = polyRuns('cabecero', 'Cabecero de media luna (delante y detrás)', half, (a, c) => (near(a.y, 0) && near(c.y, 0) ? 'base' : 'arco'), { k: 1, sa, felt: false }, { qty: 2 });
    const gus = strips('fuelle-cabecero', 'Fuelle del cabecero', Math.PI * rh + 2 * rh, 100 + 2 * sa, sa, 'principal', { maxLen: 1300 });
    L.extras.push(head, gus.piece);
    L.seams.push(equal('cabecero', 'El fuelle rodea el cabecero', [{ pieceId: gus.piece.id, edgeIds: ['canto'], factor: gus.n }], [{ pieceId: head.id, edgeIds: [...runIds(head, 'arco'), ...runIds(head, 'base')] }], 2));
    L.front.push({ pts: half.map(q => P(q.x, q.y + 0.36 * W)), role: 'blanco' });
    L.steps.push({ id: 'cabecero', title: 'Cabecero', detail: 'Cose el fuelle alrededor de la media luna delantera y luego de la trasera, dejando 15 cm abiertos en la base. Voltea, rellena firme y cierra a mano. Es un cojín suelto: retíralo si el bebé se tumba.' });
  }
  return L;
}

// ------------------------------------------------------------------ Sensory mats
const GRID3 = ['textura', 'etiquetas', 'mordedor', 'nube', 'liso', 'orejas', 'banderines', 'flor', 'estrella'];
const GRID4 = ['etiquetas', 'mariposa', 'bolsillo-zanahorias', 'orejas', 'nube', 'liso', 'textura', 'hojas', 'banderines', 'textura', 'liso', 'flor', 'solapas', 'oruga', 'mordedor', 'estrella'];
const HEX = ['hojas', 'oruga', 'mordedor', 'mariposa', 'solapas', 'flor'];
export const SENSORY_LAYOUTS = { 3: GRID3, 4: GRID4, hex: HEX };

/** Pattern pieces of a sensory element at scale k (cell / 300 mm). */
/** Stuffed and lined parts get their concave bends rounded for the seam allowance (in cell units). */
const partShape = (pt: SensElement['parts'][number], poly: Pt[], k: number, sa: number) => (pt.make === 'aplique' ? poly : smooth([poly], bendFor(Math.min(sa, 6)) / k));
function elementPieces(e: SensElement, k: number, sa: number): Piece[] {
  return e.parts.map(pt => {
    const shape = partShape(pt, pt.shape, k, sa).map(q => P(q.x * k, q.y * k)), ys = shape.map(q => q.y), yMin = Math.min(...ys), yMax = Math.max(...ys), felt = pt.make === 'aplique';
    const open = (a: Pt, b: Pt) => (pt.open === 'abajo' ? Math.abs(a.y - yMax) < 0.5 && Math.abs(b.y - yMax) < 0.5 : pt.open === 'arriba' ? Math.abs(a.y - yMin) < 0.5 && Math.abs(b.y - yMin) < 0.5 : false);
    const pc = polyRuns(`${e.id}-${pt.key}`, `${e.name}: ${pt.name}`, shape, (a, b) => (open(a, b) ? 'union' : felt ? 'borde' : 'contorno'), { k: 1, sa: felt ? 0 : Math.min(sa, 6), felt }, { qty: pt.qty, mirrorPairs: !!pt.mirror, fabric: 'contraste' });
    pc.notes = [felt ? 'Aplique sin margen: plancha entretela de doble cara y cóselo con zigzag.' : pt.open ? 'Deja abierto el lado de unión: se cose sobre el cuadro.' : 'Deja 4 cm abiertos para voltear y cierra a mano.', ...(pt.crinkle ? ['Lleva papel crujiente (lámina de polipropileno) entre las capas, siempre cerrado dentro.'] : []), ...(pt.make === 'relleno' ? ['Relleno de fibra, poco y repartido.'] : [])];
    return pc;
  });
}
/** Placement lines, stitching and marks of an element on its square (origin = top-left of the 300 mm cell). */
function elementOn(pc: Piece, e: SensElement, k: number, ox: number, oy: number, sa: number) {
  const T = (q: Pt) => P(ox + q.x * k, oy + q.y * k);
  e.parts.forEach(pt => pt.at.map(poly => partShape(pt, poly, k, sa)).forEach((poly, j) => loop(poly).slice(1).forEach((q, i, arr) => pc.lines.push({ id: `${e.id}-${pt.key}-${j}-${i}`, kind: 'colocacion', a: T(i ? arr[i - 1] : poly[0]), b: T(q), label: i || j ? undefined : `${pt.name.replace(/\s*\(.*\)$/, '')}: colocación` }))));
  e.stitch.forEach((l, j) => l.slice(1).forEach((q, i) => pc.lines.push({ id: `${e.id}-pespunte-${j}-${i}`, kind: 'pespunte', a: T(l[i]), b: T(q), label: i || j ? undefined : 'Pespunte o bordado' })));
  e.marks.forEach((m, i) => pc.marks.push({ id: `${e.id}-marca-${i}`, kind: 'cruz', at: T(m.at), label: m.label }));
}
function elementArt(e: SensElement, k: number, ox: number, oy: number, sa: number): MatArt[] {
  const T = (pts: Pt[]) => pts.map(q => P(ox + q.x * k, oy + q.y * k));
  return [...e.parts.flatMap(pt => pt.at.map(poly => ({ pts: T(partShape(pt, poly, k, sa)), role: pt.color }))), ...e.stitch.map(l => ({ pts: T(l), role: 'detalle', line: Math.max(2, 3 * k) })), ...e.draw.map(d => ({ pts: T(d.pts), role: d.color, line: d.width * k }))];
}
const sensoryNotes = (cells: string[]): Issue[] => [
  { level: 'aviso', code: 'sensorial-seguridad', message: 'Seguridad: cintas en bucle cortas y con doble pespunte, anillas de 5 cm o más, papel crujiente siempre cerrado dentro y sin botones, cuentas ni espejos de cristal. Revisa las costuras antes de cada uso.' },
  { level: 'ok', code: 'sensorial', message: `Elementos: ${cells.filter(c => !SENSORY[c].texture).map(c => SENSORY[c].name.toLowerCase()).join(', ')}.` }
];
function addElements(ids: string[], k: number, sa: number, extras: Piece[], materials: Mat[], steps: Step[]) {
  for (const id of new Set(ids)) {
    const e = SENSORY[id]; if (e.texture) continue;
    extras.push(...elementPieces(e, k, sa));
    for (const m of e.materials) materials.push({ ...m, id: `${e.id}-${m.id}` });
    steps.push({ id: `elemento-${e.id}`, title: e.name, detail: e.step });
  }
}

function sensoryGrid(p: Params, sa: number): MatLayout {
  const n = Math.round(num(p, 'cuadros')), c = num(p, 'lado'), W = n * c, k = c / 300, ids = n === 4 ? GRID4 : GRID3;
  const extras: Piece[] = [], materials: Mat[] = [], steps: Step[] = [], front: MatArt[] = [], roles = ['tela1', 'base', 'tela2'];
  const side = (label: string) => [edge('arriba', label, 'costura', sa), edge('derecha', label, 'costura', sa), edge('abajo', label, 'costura', sa), edge('izquierda', label, 'costura', sa)] as [ReturnType<typeof edge>, ReturnType<typeof edge>, ReturnType<typeof edge>, ReturnType<typeof edge>];
  const count = (t: string) => ids.filter(x => x === t).length;
  for (const t of ['liso', 'textura'] as const) if (count(t)) extras.push(rectangle(`cuadro-${t}`, t === 'liso' ? 'Cuadro liso' : 'Cuadro de textura (minky, pana o rizo)', c, c, side('Une con el cuadro de al lado'), { qty: count(t), fabric: t === 'liso' ? 'principal' : 'contraste' }));
  ids.forEach((id, i) => {
    const r = Math.floor(i / n), col = i % n, x0 = -W / 2 + col * c, y0 = r * c, e = SENSORY[id];
    front.push({ pts: box(x0, y0, x0 + c, y0 + c), role: e.texture === 'textura' ? 'textura' : roles[(r + col) % 3] });
    if (!e.texture) {
      const cell = rectangle(`cuadro-${id}`, `Cuadro ${r * n + col + 1}: ${e.name.toLowerCase()}`, c, c, side('Une con el cuadro de al lado o el ribete'), { qty: 1, fabric: (r + col) % 2 ? 'contraste' : 'principal' });
      elementOn(cell, e, k, 0, 0, sa); extras.push(cell);
      front.push(...elementArt(e, k, x0, y0, sa));
    }
  });
  addElements(ids, k, sa, extras, materials, steps);
  const first = extras.find(x => x.id.startsWith('cuadro-'))!, grid: Pt[][] = [];
  for (let j = 1; j < n; j++) grid.push([P(-W / 2 + j * c, 0), P(-W / 2 + j * c, W)], [P(-W / 2, j * c), P(W / 2, j * c)]);
  return lay({
    body: box(-W / 2, 0, W / 2, W), bodyName: `Tapete sensorial de ${n} × ${n}`, pieced: true, size: { label: 'Lado de cada cuadro', measured: c }, extras, front, quilt: grid, materials, bindStraight: true,
    runOf: (a, b) => (near(a.y, 0) && near(b.y, 0) ? 'arriba' : near(a.x, 0) && near(b.x, 0) ? 'doblez' : 'contorno'),
    onBody: (pc, fold) => [equal('ancho', 'Una fila de cuadros mide lo mismo que el trasero', [{ pieceId: first.id, edgeIds: ['arriba'], factor: n }], [{ pieceId: pc.id, edgeIds: runIds(pc, 'arriba'), factor: fold ? 2 : 1 }], 1)],
    notes: sensoryNotes(ids),
    steps: [{ id: 'cuadros', title: 'Cuadros', detail: 'Cose primero cada elemento sobre su cuadro, siguiendo sus líneas de colocación. Une los cuadros en filas y las filas entre sí, casando las esquinas.' }, ...steps]
  });
}

function sensoryHex(p: Params, sa: number): MatLayout {
  const Ls = num(p, 'lado'), cy = (Math.sqrt(3) / 2) * Ls, V = Array.from({ length: 6 }, (_, i) => P(Ls * Math.cos((i * Math.PI) / 3), cy + Ls * Math.sin((i * Math.PI) / 3)));
  const C = P(0, cy), k = (0.4 * Ls) / 300, extras: Piece[] = [], materials: Mat[] = [], steps: Step[] = [], front: MatArt[] = [], roles = ['tela1', 'base', 'tela2'];
  const tris: Piece[] = [];
  V.forEach((v, i) => {
    const w = V[(i + 1) % 6], tri = [C, v, w], g = P((C.x + v.x + w.x) / 3, (C.y + v.y + w.y) / 3), e = SENSORY[HEX[i]];
    const pc = polyRuns(`triangulo-${i + 1}`, `Triángulo ${i + 1}: ${e.name.toLowerCase()}`, tri, (a, b) => (Math.hypot(a.x - C.x, a.y - C.y) > 1 && Math.hypot(b.x - C.x, b.y - C.y) > 1 ? 'borde' : 'radio'), { k: 1, sa, felt: false }, { qty: 1, fabric: i % 2 ? 'contraste' : 'principal' });
    elementOn(pc, e, k, g.x - 150 * k, g.y - 150 * k, sa); tris.push(pc);
    front.push({ pts: tri, role: roles[i % 3] }, ...elementArt(e, k, g.x - 150 * k, g.y - 150 * k, sa));
  });
  extras.push(...tris);
  addElements(HEX, k, sa, extras, materials, steps);
  return lay({
    body: V, bodyName: 'Tapete sensorial hexagonal', pieced: true, size: { label: 'Lado del hexágono', measured: Math.hypot(V[1].x - V[0].x, V[1].y - V[0].y) }, extras, front, materials, bindStraight: true,
    quilt: V.map(v => [C, v]),
    onBody: (pc, fold) => [equal('borde', 'Los seis triángulos rodean el trasero', [{ pieceId: tris[0].id, edgeIds: runIds(tris[0], 'borde'), factor: 6 }], [{ pieceId: pc.id, edgeIds: runIds(pc, 'contorno'), factor: fold ? 2 : 1 }], 1)],
    notes: sensoryNotes(HEX),
    steps: [{ id: 'triangulos', title: 'Triángulos', detail: 'Cose cada elemento sobre su triángulo. Une los triángulos de tres en tres y luego las dos mitades, casando el centro.' }, ...steps]
  });
}

// ------------------------------------------------------------------ Puzzle mat
type SideKind = 'flat' | 'knob' | 'hole';
/** Outline of one puzzle cushion (seam line, mm): square of side s with knobs and holes; holes get ease for the stuffed knob. */
export function puzzleShape(s: number, sides: SideKind[], sa: number): Pt[] {
  const n = 0.1 * s, r = 0.15 * s, c = 0.18 * s, e = Math.max(8, 0.03 * s);
  const frames: [Pt, Pt][] = [[P(s / 2, 0), P(0, -1)], [P(s, s / 2), P(1, 0)], [P(s / 2, s), P(0, 1)], [P(0, s / 2), P(-1, 0)]];
  const neck = (m: Pt, u: Pt, from: number, to: number, w: number) => { const v = P(-u.y, u.x), a = P(m.x + u.x * from, m.y + u.y * from), b = P(m.x + u.x * to, m.y + u.y * to); return pos([P(a.x + v.x * w, a.y + v.y * w), P(b.x + v.x * w, b.y + v.y * w), P(b.x - v.x * w, b.y - v.y * w), P(a.x - v.x * w, a.y - v.y * w)]); };
  const add: Pt[][] = [box(0, 0, s, s)], cut: Pt[][] = [];
  sides.forEach((kind, i) => {
    const [m, u] = frames[i];
    if (kind === 'knob') add.push(circle(m.x + u.x * c, m.y + u.y * c, r, 48), neck(m, u, -2, c, n));
    if (kind === 'hole') cut.push(circle(m.x - u.x * c, m.y - u.y * c, r + e, 48), neck(m, u, 2, -c, n + e));
  });
  return smooth([biggest(differencePolygons(unionPolygons(add), cut))], bendFor(sa));
}
export function puzzleSides(rows: number, cols: number, i: number, j: number): SideKind[] {
  const h = (ri: number, cj: number) => ((ri + cj) % 2 === 0 ? 'left' : 'right'), v = (ri: number, cj: number) => ((ri + cj) % 2 === 1 ? 'up' : 'down');
  const top: SideKind = i === 0 ? 'flat' : v(i - 1, j) === 'down' ? 'hole' : 'knob';
  const bottom: SideKind = i === rows - 1 ? 'flat' : v(i, j) === 'down' ? 'knob' : 'hole';
  const left: SideKind = j === 0 ? 'flat' : h(i, j - 1) === 'left' ? 'hole' : 'knob';
  const right: SideKind = j === cols - 1 ? 'flat' : h(i, j) === 'left' ? 'knob' : 'hole';
  return [top, right, bottom, left];
}
function puzzle(p: Params, sa: number): MatLayout {
  const s = num(p, 'lado'), rows = Math.round(num(p, 'filas')), cols = Math.round(num(p, 'columnas')), extras: Piece[] = [], front: MatArt[] = [], roles = ['tela1', 'base', 'tela2'];
  for (let i = 0; i < rows; i++) for (let j = 0; j < cols; j++) {
    const shape = puzzleShape(s, puzzleSides(rows, cols, i, j), sa), name = `${'ABCD'[i]}${j + 1}`;
    const pc = polyRuns(`pieza-${name.toLowerCase()}`, `Pieza ${name} (delante y detrás)`, shape, () => 'contorno', { k: 1, sa, felt: false }, { qty: 2, fabric: (i + j) % 2 ? 'contraste' : 'principal' });
    pc.notes = ['Deja 12 cm abiertos en un tramo recto para voltear y rellenar; cierra a mano.'];
    extras.push(pc);
    front.push({ pts: shape.map(q => P(q.x + j * s - (cols * s) / 2, q.y + i * s)), role: roles[(i + j) % 3] });
  }
  const g = Math.round((120 * (s / 350) ** 2 * rows * cols) / 10) * 10;
  return lay({
    body: box(-(cols * s) / 2, 0, (cols * s) / 2, rows * s), bodyName: 'Puzle', symmetric: false, size: { label: 'Lado de cada pieza', measured: s }, extras, front,
    notes: [{ level: 'ok', code: 'puzle', message: `${rows * cols} cojines de ${cm(s)} que encajan: cada hueco es ${cm(Math.max(8, 0.03 * s))} más ancho que la pestaña para que entre ya rellena.` }],
    steps: [{ id: 'cojines', title: 'Cojines', detail: 'Cose cada pieza delantera con su trasera dejando la abertura, recorta márgenes en las curvas, voltea, rellena (las pestañas primero) y cierra a mano.' }],
    materials: [{ id: 'relleno', label: 'Relleno de fibra hueca', qty: `unos ${g} g` }]
  });
}

// ------------------------------------------------------------------ Build
interface Def { id: string; name: string; summary: string; params: ParamDef[]; defaults: Params; make: (p: Params, sa: number) => MatLayout; puzzle?: boolean }
const choice = (key: string, label: string, opts: [string, string][], when?: ParamDef['when']): ParamDef => ({ key, label, group: 'diseno', type: 'choice', choices: opts.map(([value, l]) => ({ value, label: l })), when });
const len = (key: string, label: string, min: number, max: number, when?: ParamDef['when']): ParamDef => ({ key, label, group: 'diseno', type: 'length', min, max, when });
const ratio = (key: string, label: string, min: number, max: number, when?: ParamDef['when']): ParamDef => ({ key, label, group: 'diseno', type: 'ratio', min, max, when });
const FINISH = choice('acabado', 'Acabado del borde', [['volteado', 'Volteado y pespunteado'], ['ribete', 'Ribete al bies']]);
const CUT = (when?: ParamDef['when']) => choice('corte', 'Corte de la pieza grande', [['entera', 'Entera (para proyectar)'], ['doblez', 'Al doblez (la mitad de papel)']], when);
const MARGIN: ParamDef = { key: 'margen', label: 'Margen de costura', group: 'margenes', type: 'length', min: 6, max: 15 };

const DEFS: Def[] = [
  { id: 'tapete-sol', name: 'Tapete sol', summary: 'Sol de rayos con acolchado en espiral y juguetes con anilla.', make: sun,
    params: [len('diametro', 'Diámetro', 800, 1400), ratio('rayos', 'Rayos', 12, 20), choice('acolchado', 'Acolchado', [['espiral', 'Espiral'], ['circulos', 'Círculos']]), choice('juguetes', 'Juguetes con anilla', [['si', 'Sí'], ['no', 'No']]), FINISH, CUT(p => p.acolchado === 'circulos')],
    defaults: { diametro: 1100, rayos: 16, acolchado: 'espiral', juguetes: 'si', acabado: 'volteado' } },
  { id: 'tapete-arcoiris', name: 'Tapete arcoíris', summary: 'Medio círculo de bandas cosidas, con corazón aplicado.', make: rainbow,
    params: [len('ancho', 'Ancho', 900, 1500), ratio('bandas', 'Bandas', 3, 6), choice('corazon', 'Corazón aplicado', [['si', 'Sí'], ['no', 'No']]), FINISH, CUT()], defaults: { ancho: 1200, bandas: 5, corazon: 'si', acabado: 'volteado' } },
  { id: 'tapete-oso', name: 'Tapete oso', summary: 'Cabeza de oso con orejas, anillos acolchados y hocico aplicado.', make: bear, params: [len('diametro', 'Diámetro de la cabeza', 700, 1300), FINISH, CUT()], defaults: { diametro: 1000, acabado: 'ribete' } },
  { id: 'tapete-conejo', name: 'Tapete conejo', summary: 'Cabeza de conejo con orejas largas, cara propia y acolchado en franjas.', make: bunny, params: [len('alto', 'Alto con las orejas', 1000, 1700), FINISH, CUT()], defaults: { alto: 1500, acabado: 'volteado' } },
  { id: 'tapete-flor', name: 'Tapete flor', summary: 'Flor de 5 a 8 pétalos con acolchado radial.', make: flower, params: [len('diametro', 'Diámetro', 800, 1400), ratio('petalos', 'Pétalos', 5, 8), FINISH, CUT()], defaults: { diametro: 1100, petalos: 6, acabado: 'volteado' } },
  { id: 'tapete-hoja', name: 'Tapete hoja', summary: 'Hoja acolchada con sus nervios: acorazonada, ovalada, ginkgo, festoneada o monstera.', make: leaf,
    params: [len('alto', 'Alto', 800, 1600), choice('forma', 'Forma', [['acorazonada', 'Acorazonada'], ['ovalada', 'Ovalada'], ['ginkgo', 'Ginkgo'], ['festoneada', 'Festoneada'], ['monstera', 'Monstera']]), FINISH, CUT()], defaults: { alto: 1200, forma: 'acorazonada', acabado: 'volteado' } },
  { id: 'tapete-fresa', name: 'Tapete fresa', summary: 'Fresa con hojas aplicadas y pepitas pespunteadas.', make: strawberry, params: [len('alto', 'Alto', 800, 1300), FINISH, CUT()], defaults: { alto: 1000, acabado: 'volteado' } },
  { id: 'tapete-petalos', name: 'Tapete con borde de pétalos', summary: 'Centro acolchado redondo o colchoneta, rodeado de pétalos rellenos.', make: petals,
    params: [len('ancho', 'Ancho o diámetro del centro', 700, 1300), choice('forma', 'Forma', [['redondo', 'Redondo'], ['rectangular', 'Colchoneta rectangular']]), len('largo', 'Largo de la colchoneta', 900, 1600, p => p.forma === 'rectangular'), len('petalo', 'Alto de cada pétalo', 100, 200), choice('cabecero', 'Cabecero de media luna', [['si', 'Sí'], ['no', 'No']], p => p.forma === 'rectangular'), CUT()],
    defaults: { ancho: 900, forma: 'redondo', largo: 1000, petalo: 150, cabecero: 'si' } },
  { id: 'tapete-puzle', name: 'Tapete puzle', summary: 'Cojines cuadrados que encajan como un puzle.', make: puzzle, puzzle: true, params: [len('lado', 'Lado de cada pieza', 250, 450), ratio('filas', 'Filas', 2, 4), ratio('columnas', 'Columnas', 2, 4)], defaults: { lado: 350, filas: 3, columnas: 3 } },
  { id: 'tapete-sensorial', name: 'Tapete sensorial de cuadros', summary: 'Cuadros de 3 × 3 o 4 × 4 con un elemento sensorial en cada uno.', make: sensoryGrid, params: [len('lado', 'Lado de cada cuadro', 250, 350), ratio('cuadros', 'Cuadros por lado', 3, 4), FINISH, CUT()], defaults: { lado: 300, cuadros: 3, acabado: 'ribete' } },
  { id: 'tapete-sensorial-hexagonal', name: 'Tapete sensorial hexagonal', summary: 'Seis triángulos con un elemento sensorial en cada uno.', make: sensoryHex, params: [len('lado', 'Lado del hexágono', 450, 700), FINISH, CUT()], defaults: { lado: 600, acabado: 'ribete' } }
];
export const PLAYMAT_IDS = DEFS.map(d => d.id);
const full = (d: Def, p: Params): Params => ({ margen: 10, corte: 'entera', ...d.defaults, ...p });
export function playmatLayout(id: string, p: Params) { const d = DEFS.find(x => x.id === id)!, q = full(d, p); return d.make(q, num(q, 'margen')); }
/** The finished mat for the card drawing. */
export function playmatArt(id: string, p: Params): MatArt[] {
  const L = playmatLayout(id, p);
  return [...L.behind, { pts: L.body, role: 'base' }, ...L.quilt.map(l => ({ pts: l, role: 'detalle', line: 2.5, dash: true })), ...L.places.map(pl => ({ pts: pl.poly, role: 'tela2' })),
    ...L.apps.flatMap(a => instances(a).map(poly => ({ pts: poly, role: a.color }))), ...L.emb.map(l => ({ pts: l, role: 'detalle', line: 4 })), ...L.front];
}

function build(d: Def, p: Params): GeneratorResult {
  const sa = num(p, 'margen');
  for (const def of d.params) if ((def.type === 'length' || def.type === 'ratio') && (!def.when || def.when(p)) && !(num(p, def.key) >= def.min! && num(p, def.key) <= def.max!))
    return invalid('tapete-medidas', `${def.label}: de ${def.type === 'length' ? cm(def.min!) : def.min} a ${def.type === 'length' ? cm(def.max!) : def.max}.`);
  if (!(sa >= 6 && sa <= 15)) return invalid('tapete-medidas', 'El margen va de 6 a 15 mm.');
  const L = d.make(p, sa), size = d.params[0], target = num(p, size.key);
  const notices: Issue[] = [exp(d.name), { level: 'aviso', code: 'tapete-seguridad', message: 'Tapete de juego para usarlo con un adulto delante: no es para dormir ni para la cuna. Lava antes las telas y usa guata lavable.' }, ...L.notes];
  const checks = [{ key: size.key, label: L.size.label, target, measured: L.size.measured, tolerance: 0.03 * target }];
  if (d.puzzle) {
    return { pieces: L.extras, seams: L.seams, notices, checks, materials: [{ id: 'tela', label: 'Dos telas de algodón o minky que alternen', qty: `unos ${cm(Math.ceil((num(p, 'filas') * num(p, 'columnas') * 2 * (1.7 * num(p, 'lado')) ** 2) / 1500 / 100) * 100)} × 150 cm` }, ...L.materials, { id: 'hilo', label: 'Hilo de coser', qty: '1' }],
      assumptions: ['Cada pieza lleva el margen incluido. Las pestañas van en damero: cada pieza encaja con todas sus vecinas.'], steps: L.steps.map(s => ({ ...s, pieces: [] })) };
  }
  const fold = L.symmetric && str(p, 'corte') === 'doblez', bound = !L.turnedOnly && str(p, 'acabado') === 'ribete';
  const outline = fold ? halfOnFold(L.body, bendFor(sa)) : smooth([L.body], bendFor(sa));
  const runOf = L.runOf ?? ((a: Pt, b: Pt) => (fold && near(a.x, 0) && near(b.x, 0) ? 'doblez' : 'contorno'));
  const body = polyRuns(L.pieced ? 'trasero' : 'tapete', L.pieced ? `Trasero${fold ? ' (al doblez)' : ''}` : `${L.bodyName}: delantero y trasero${fold ? ' (al doblez)' : ''}`, outline, (a, b) => (fold && near(a.x, 0) && near(b.x, 0) ? 'doblez' : runOf(a, b)), { k: 1, sa, felt: false }, { qty: L.pieced ? 1 : 2, fold: fold ? 'doblez' : undefined, onFold: fold }, q => fold && near(q.x, 0));
  body.notes = ['Corta también la guata con esta pieza, por la línea de costura (sin margen).'];
  const half = (lines: Pt[][]) => (fold ? rightOfFold(lines) : lines);
  const put = (lines: Pt[][], id: string, kind: 'pespunte' | 'colocacion', label: string) => half(lines).forEach((l, j) => l.slice(1).forEach((q, i) => body.lines.push({ id: `${id}-${j}-${i}`, kind, a: l[i], b: q, label: i || j ? undefined : label })));
  put(L.quilt, 'acolchado', 'pespunte', L.pieced ? 'Acolchado en la costura' : 'Acolchado');
  for (const a of L.apps) put(instances(a).map(loop), `aplique-${a.id}`, 'colocacion', `${a.name.replace(/\s*\(.*\)$/, '')}: colocación`);
  L.places.forEach((pl, i) => put([loop(pl.poly)], `colocacion-${i}`, 'colocacion', `${pl.name}: colocación`));
  put(L.emb, 'bordado', 'pespunte', 'Bordar');
  L.marks.filter(m => !fold || m.at.x >= 0).forEach((m, i) => body.marks.push({ id: `marca-${i}`, kind: 'cruz', at: m.at, label: m.label }));
  const pieces: Piece[] = [body, ...L.apps.map(a => polyRuns(`aplique-${a.id}`, `${a.name} (aplique sin margen)`, a.poly, () => 'borde', { k: 1, sa: 0, felt: true }, { qty: a.pair ? 2 : 1, mirrorPairs: !!a.pair, fabric: 'contraste' })), ...L.extras];
  const seams = [...L.seams, ...(L.onBody?.(body, fold) ?? [])];
  const around = body.edges.filter(e => e.finish !== 'doblez').map(e => e.id), total = around.reduce((s, id) => s + runLength({ ...body, edges: body.edges.filter(e => e.id === id) }, id), 0) * (fold ? 2 : 1);
  if (bound) {
    const st = strips('ribete', `Ribete ${L.bindStraight ? 'al hilo' : 'al bies'} (ancho de corte 6 cm, doblar en cuatro)`, total, 60, 0, 'contraste', { maxLen: 1400, bias: !L.bindStraight, endSa: 15 });
    st.piece.edges.forEach(e => { if (e.id.startsWith('canto')) { e.finish = 'sin-margen'; e.allowance = 0; } });
    pieces.push(st.piece);
    seams.push(equal('ribete', 'Ribete alrededor del tapete', [{ pieceId: st.piece.id, edgeIds: ['canto'], factor: st.n }], [{ pieceId: body.id, edgeIds: around, factor: fold ? 2 : 1 }], 0.005 * total));
  } else {
    const run = runIds(body, 'contorno').length ? 'contorno' : around[0], Lc = runLength(body, run), s0 = Math.max(0, Lc * 0.5 - 150);
    notchAt(body, run, s0, 'Abertura para voltear: se cierra con el pespunte del borde', 'abertura-a');
    notchAt(body, run, s0 + Math.min(300, 0.25 * Lc), 'Fin de la abertura', 'abertura-b');
  }
  const W = bboxW(L.body), H = bboxH(L.body);
  if (L.symmetric) notices.push({ level: 'ok', code: 'tapete-proyectar', message: fold ? 'Pieza al doblez: la mitad de papel. Para marcar el acolchado en la otra mitad, usa «Voltear» en el proyector.' : 'Pieza entera, lista para proyectar con todo el acolchado. Para imprimir en papel, elige «Al doblez»: la mitad de hojas.' });
  return {
    pieces, seams, notices, checks,
    materials: [
      { id: 'tela', label: L.pieced ? 'Telas de algodón para el delantero (ver piezas) y una para el trasero' : 'Tela de algodón, lino lavado o muselina para delantero y trasero', qty: `2 piezas de ${cm(W + 2 * sa + 40)} × ${cm(H + 2 * sa + 40)}` },
      { id: 'guata', label: L.turnedOnly ? 'Guata gruesa (200 g/m², o dos capas)' : 'Guata de poliéster o algodón (150-200 g/m²)', qty: `${cm(W + 60)} × ${cm(H + 60)}` },
      ...(L.apps.length ? [{ id: 'entretela', label: 'Entretela termoadhesiva de doble cara para los apliques', qty: 'Retales' }] : []),
      ...L.materials, { id: 'hilo', label: 'Hilo de coser (y de bordar para la cara)', qty: '2' }],
    assumptions: [`Piezas a tamaño real con ${cm(sa)} de margen. Delantero, guata y trasero se acolchan juntos: las líneas de acolchado están marcadas en la pieza.`, bound ? 'Acabado con ribete de 1,5 cm alrededor.' : 'Acabado volteado: delantero y trasero derecho con derecho con la guata, se voltea y se pespuntea a 1 cm del borde.'],
    steps: [
      { id: 'cortar', title: 'Corta y marca', detail: 'Corta las piezas (o proyéctalas sobre la tela) y marca las líneas de acolchado y de colocación con rotulador que se borra con agua o calor.', pieces: [body.id] },
      ...(L.apps.length ? [{ id: 'apliques', title: 'Apliques', detail: 'Plancha entretela de doble cara en el revés de los apliques, colócalos en sus líneas y cóselos con zigzag apretado (punto de raso).', pieces: [] }] : []),
      ...L.steps.map(s => ({ ...s, pieces: [] })),
      bound ? { id: 'acolchar', title: 'Acolcha', detail: 'Haz el sándwich: trasero boca abajo, guata y delantero boca arriba. Sujeta con imperdibles cada 15 cm y pespuntea las líneas de acolchado desde el centro hacia fuera.', pieces: [] }
        : { id: 'cerrar', title: 'Cose y voltea', detail: `Pon la guata, encima el trasero y el delantero derecho con derecho${L.turnedOnly ? ' (con los pétalos entre los dos)' : ''}. Cose alrededor dejando la abertura, recorta la guata del margen, da piquetes en los entrantes y voltea.`, pieces: [] },
      bound ? { id: 'ribete', title: 'Ribetea', detail: 'Une los tramos del ribete, cóselo por el derecho alrededor (estirando un poco en las curvas hacia dentro), dóblalo al revés y remátalo a mano o con pespunte en la zanja.', pieces: [] }
        : { id: 'acolchar', title: 'Cierra y acolcha', detail: 'Cierra la abertura, pespuntea a 1 cm del borde y acolcha las líneas marcadas desde el centro hacia fuera.', pieces: [] }
    ]
  };
}

export const PLAYMAT_GENERATORS: PatternGenerator[] = DEFS.map(d => ({
  id: d.id, name: d.name, status: 'experimental', summary: d.summary, requiredMeasures: [], optionalMeasures: [],
  params: [...d.params, MARGIN],
  defaults: () => full(d, {}),
  generate: (ctx: GeneratorContext, params: Params) => { void ctx; return build(d, full(d, params)); }
}));
