import { num, str, type GeneratorContext, type GeneratorResult, type Params, type PatternGenerator } from '../generator';
import type { Issue, Piece, SeamRelation } from '../types';
import { P, cm, invalid, rectangle, edge, ratio, solve } from './kidsShared';
import { bowPieces } from './kidsBlocks';
import { MIN_TURN_WIDTH, altoParam, ellipsePiece, embroider, equal2, exp, fiber, insertion, margin, match, notchAt, placeOval, plush, polyPiece, runLength, safety, side, sleepyEye, smile, turnCheck, type A, type ToyScale } from './toyKit';
import { ellipse, leaf, uni } from '../../applique/shapes';
import { TOY_GENERATORS_2 } from './toys2';
import { DOLLHOUSE_GENERATORS } from './dollhouses';

/* Juguetes y peluches (2026-11-08), reconstruidos a partir de las fotos de la
 * usuaria como diseños propios: muñecos de trapo (muñeca, conejita, gatito,
 * perrito, patito, abeja y muñeca flor) con ropa calculada desde su cuerpo,
 * bichito redondo, hada de fieltro, libélula de tela y conejo 3D con fuelle de
 * cabeza, panza y suelas. Todo se escala con el alto; los márgenes se suman
 * después, en milímetros. No hay medidas corporales. */

// ================================================================== Muñecos de trapo
type Character = 'muneca' | 'conejita' | 'conejo' | 'gatito' | 'perrito' | 'patito' | 'abeja' | 'flor';
interface Body {
  head: A[]; body: A[]; arm: A[]; leg: A[];
  headH: number; bodyH: number; legLen: number; neckW: number;
  /** Distance down the right side seam to the top of the arm. */
  armAt: number; armW: number; legW: number;
  chestW: number; waistW: number; hipW: number; yChest: number; yWaist: number;
  armLen: number;
}
const DOLL_HEAD: A[] = [[52, 0, 'contorno'], [86, 10], [104, 46], [96, 78], [69, 98, 'cuello', 'cl'], [35, 98, 'contorno', 'c'], [8, 78], [0, 46], [18, 10]];
const DOLL_BODY: A[] = [[22, 0, 'cuello', 'cl'], [56, 0, 'costado', 'c'], [64, 8], [76, 26], [74, 62], [78, 92], [72, 104, 'base', 'cl'], [6, 104, 'costado', 'c'], [0, 92], [4, 62], [2, 26], [14, 8]];
const DOLL_ARM: A[] = [[0, 0, 'union', 'cl'], [24, 0, 'contorno', 'c'], [27, 40], [28, 74], [16, 94], [2, 84], [-2, 40]];
const DOLL_LEG: A[] = [[0, 0, 'union', 'cl'], [32, 0, 'contorno', 'c'], [33, 54], [37, 84], [20, 98], [2, 90], [-1, 54]];
const DOLL: Body = { head: DOLL_HEAD, body: DOLL_BODY, arm: DOLL_ARM, leg: DOLL_LEG, headH: 98, bodyH: 104, legLen: 98, neckW: 34, armAt: 30, armW: 24, legW: 32, chestW: 76, waistW: 70, hipW: 78, yChest: 124, yWaist: 166, armLen: 94 };

const BODIES: Record<Character, Body> = {
  muneca: DOLL,
  conejita: { ...DOLL, head: [[52, 2, 'contorno'], [90, 12], [107, 50], [97, 82], [69, 98, 'cuello', 'cl'], [35, 98, 'contorno', 'c'], [7, 82], [-3, 50], [14, 12]], headH: 96 },
  conejo: { ...DOLL, head: [[52, 4, 'contorno'], [88, 12], [106, 48], [98, 82], [69, 98, 'cuello', 'cl'], [35, 98, 'contorno', 'c'], [6, 82], [-2, 48], [16, 12]], headH: 94 },
  gatito: { ...DOLL, head: [[52, 10, 'contorno'], [72, 7], [88, -16, undefined, 'c'], [102, 14], [108, 50], [97, 82], [69, 98, 'cuello', 'cl'], [35, 98, 'contorno', 'c'], [7, 82], [-4, 50], [2, 14], [16, -16, undefined, 'c'], [32, 7]], headH: 114 },
  perrito: { ...DOLL, head: [[52, 0, 'contorno'], [92, 8], [110, 46], [99, 80], [69, 98, 'cuello', 'cl'], [35, 98, 'contorno', 'c'], [5, 80], [-6, 46], [12, 8]] },
  patito: {
    ...DOLL, body: [[22, 0, 'cuello', 'cl'], [56, 0, 'costado', 'c'], [72, 12], [90, 46], [88, 84], [76, 104, 'base', 'cl'], [2, 104, 'costado', 'c'], [-10, 84], [-12, 46], [6, 12]],
    arm: [[0, 0, 'union', 'cl'], [22, 0, 'contorno', 'c'], [34, 30], [30, 70], [12, 84], [-2, 50]], armAt: 22, armW: 22, armLen: 84,
    leg: [[0, 0, 'union', 'cl'], [24, 0, 'contorno', 'c'], [25, 70], [35, 92], [16, 100], [-3, 92], [-1, 70]], legW: 24, legLen: 100, chestW: 98, waistW: 102, hipW: 100
  },
  abeja: {
    ...DOLL, head: [[58, 0, 'contorno'], [96, 10], [116, 46], [106, 80], [83, 98, 'cuello', 'cl'], [33, 98, 'contorno', 'c'], [10, 80], [0, 46], [20, 10]], neckW: 50,
    body: [[31, 0, 'cuello', 'cl'], [81, 0, 'costado', 'c'], [94, 16], [106, 52], [112, 88], [102, 110, 'base', 'cl'], [10, 110, 'costado', 'c'], [0, 88], [6, 52], [18, 16]], bodyH: 110,
    arm: [[0, 0, 'union', 'cl'], [26, 0, 'contorno', 'c'], [30, 44], [30, 80], [16, 100], [2, 88], [-2, 44]], armAt: 20, armW: 26, armLen: 100,
    leg: [[0, 0, 'union', 'cl'], [30, 0, 'contorno', 'c'], [31, 60], [32, 78], [16, 92], [0, 80], [-1, 60]], legW: 30, legLen: 92, chestW: 100, waistW: 108, hipW: 112
  },
  flor: DOLL
};
const NAME: Record<Character, string> = { muneca: 'Muñeca de trapo', conejita: 'Conejita', conejo: 'Conejo de orejas largas', gatito: 'Gatito', perrito: 'Perrito', patito: 'Patito', abeja: 'Abeja', flor: 'Muñeca flor' };
const FACE: Record<Character, (cx: number) => { id: string; pts: [number, number][]; label: string }[]> = {
  muneca: c => [{ id: 'ojo-i', pts: sleepyEye(c - 17, 52, 14), label: 'Bordar ojos dormidos' }, { id: 'ojo-d', pts: sleepyEye(c + 17, 52, 14), label: '' }, { id: 'boca', pts: smile(c, 68, 12), label: 'Bordar sonrisa' }],
  conejita: c => [{ id: 'ojo-i', pts: sleepyEye(c - 18, 56, 14), label: 'Bordar ojos dormidos' }, { id: 'ojo-d', pts: sleepyEye(c + 18, 56, 14), label: '' }, { id: 'nariz', pts: [[c - 5, 63], [c, 67], [c + 5, 63]], label: 'Bordar nariz' }, { id: 'boca', pts: [[c, 67], [c, 71], [c - 4, 74]], label: '' }],
  conejo: c => [{ id: 'ojo-i', pts: sleepyEye(c - 19, 50, 13), label: 'Bordar ojos dormidos' }, { id: 'ojo-d', pts: sleepyEye(c + 19, 50, 13), label: '' }],
  gatito: c => [{ id: 'ojo-i', pts: sleepyEye(c - 18, 56, 13), label: 'Bordar ojos' }, { id: 'ojo-d', pts: sleepyEye(c + 18, 56, 13), label: '' }, { id: 'nariz', pts: [[c - 5, 64], [c + 5, 64], [c, 69], [c - 5, 64]], label: 'Bordar nariz' }, { id: 'bigote-i', pts: [[c - 10, 70], [c - 32, 66]], label: 'Bordar bigotes' }, { id: 'bigote-d', pts: [[c + 10, 70], [c + 32, 66]], label: '' }],
  perrito: c => [{ id: 'ojo-i', pts: sleepyEye(c - 20, 52, 13, true), label: 'Bordar ojos' }, { id: 'ojo-d', pts: sleepyEye(c + 20, 52, 13, true), label: '' }, { id: 'nariz', pts: [[c - 7, 62], [c + 7, 62], [c, 70], [c - 7, 62]], label: 'Bordar nariz' }, { id: 'boca', pts: [[c, 70], [c, 76]], label: '' }],
  patito: c => [{ id: 'ojo-i', pts: [[c - 22, 50], [c - 18, 54], [c - 22, 58], [c - 26, 54], [c - 22, 50]], label: 'Bordar ojos' }, { id: 'ojo-d', pts: [[c + 22, 50], [c + 26, 54], [c + 22, 58], [c + 18, 54], [c + 22, 50]], label: '' }],
  abeja: c => [{ id: 'ojo-i', pts: sleepyEye(c - 20, 54, 16), label: 'Bordar ojos dormidos' }, { id: 'ojo-d', pts: sleepyEye(c + 20, 54, 16), label: '' }, { id: 'boca', pts: smile(c, 70, 14), label: 'Bordar sonrisa' }],
  flor: () => [{ id: 'ojo-i', pts: sleepyEye(-15, -2, 12), label: 'Bordar ojos' }, { id: 'ojo-d', pts: sleepyEye(15, -2, 12), label: '' }, { id: 'boca', pts: smile(0, 12, 12), label: 'Bordar sonrisa' }]
};

export function ragDefaults(): Params { return { personaje: 'muneca', alto: 300, ropa: 'ninguna', accesorio: 'ninguno', cabello: 'si', parche: 'no', petalos: 8, petalo: 'redondo', brazos: 'brazo', antenas: 'tela', margen: 6 }; }

export function generateRag(ctx: GeneratorContext, params: Params): GeneratorResult {
  void ctx;
  const p = { ...ragDefaults(), ...params }, who = str(p, 'personaje') as Character, B = BODIES[who];
  if (!B) return invalid('trapo-personaje', 'Elige un personaje de la lista.');
  const alto = num(p, 'alto'), sa = num(p, 'margen'), ropa = str(p, 'ropa'), acc = str(p, 'accesorio');
  if (!(alto >= 220 && alto <= 700) || !(sa >= 4 && sa <= 10)) return invalid('trapo-medidas', 'El alto va de 22 a 70 cm y el margen de 4 a 10 mm.');
  const total = B.headH + B.bodyH + B.legLen, k = alto / total, t: ToyScale = { k, sa, felt: false };
  const pieces: Piece[] = [], seams: SeamRelation[] = [], notices: Issue[] = [exp(NAME[who]), safety];
  const skin = 'principal' as const;

  // ---------- Head
  let head: Piece;
  const flower = who === 'flor';
  if (flower) {
    head = ellipsePiece('cabeza', 'Cabeza (delantera y trasera)', 46, 44, 'contorno', t, { qty: 2, fabric: skin });
    const P0 = runLength(head, 'contorno'), gap = B.neckW * k, n = Math.round(Math.max(5, Math.min(12, num(p, 'petalos')))), pw = (P0 - gap) / n, pl = 54 * k;
    notchAt(head, 'contorno', P0 / 2 - gap / 2, 'Abertura del cuello: aquí entra el cuerpo', 'cuello-a'); notchAt(head, 'contorno', P0 / 2 + gap / 2, 'Abertura del cuello', 'cuello-b');
    for (let i = 1; i < n; i++) notchAt(head, 'contorno', (P0 / 2 + gap / 2 + i * pw) % P0, i === 1 ? 'Unión entre pétalos' : '', `petalo-${i}`);
    const pk = pw / k, plk = pl / k, pointed = str(p, 'petalo') === 'puntiagudo';
    const petal = plush('petalo', `Pétalo (${n} por cada cara, ${2 * n} en total)`, pointed
      ? [[0, plk, 'contorno', 'c'], [-pk * 0.15, plk * 0.5], [pk / 2, 0, undefined, 'c'], [pk * 1.15, plk * 0.5], [pk, plk, 'union', 'cl']]
      : [[0, plk, 'contorno', 'c'], [-pk * 0.28, plk * 0.42], [pk / 2, 0], [pk * 1.28, plk * 0.42], [pk, plk, 'union', 'cl']], t, { qty: 2 * n, fabric: 'contraste' });
    pieces.push(head, petal);
    // The petal ring must cover exactly the head outline outside the neck opening.
    if (Math.abs(n * runLength(petal, 'union') - (P0 - gap)) > 0.6) notices.push({ level: 'error', code: 'petalos', message: 'Los pétalos no cubren el contorno de la cabeza.' });
    else notices.push({ level: 'ok', code: 'petalos', message: `${n} pétalos de ${cm(pw)} de base cubren justo el contorno de la cabeza, dejando ${cm(gap)} para el cuello.` });
    if (pw < MIN_TURN_WIDTH) notices.push({ level: 'error', code: 'petalos-estrechos', message: 'Con tantos pétalos la base queda demasiado estrecha para voltearlos. Usa menos pétalos o más alto.' });
  } else {
    head = plush('cabeza', 'Cabeza (delantera y trasera)', B.head, t, { qty: 2, mirrorPairs: false, fabric: skin });
    pieces.push(head);
  }
  for (const f of FACE[who](who === 'abeja' ? 58 : 52)) embroider(head, f.id, f.pts, k, f.label ? `${f.label} (solo en la cara delantera)` : '');

  // ---------- Body, arms and legs
  const body = plush('cuerpo', 'Cuerpo (delantero y trasero)', B.body, t, { qty: 2, fabric: who === 'abeja' ? 'principal' : skin });
  const armIsLeaf = flower && str(p, 'brazos') === 'hoja';
  const armA: A[] = armIsLeaf ? [[0, 0, 'union', 'cl'], [18, 0, 'contorno', 'c'], [34, 30], [30, 64], [10, 82, undefined, 'c'], [-6, 40]] : B.arm;
  const armW = armIsLeaf ? 18 : B.armW;
  const arm = plush('brazo', who === 'patito' ? 'Ala (2 pares en espejo)' : armIsLeaf ? 'Brazo hoja (2 pares en espejo)' : 'Brazo (2 pares en espejo)', armA, t, { qty: 4, mirrorPairs: true, fabric: armIsLeaf ? 'contraste' : skin });
  const leg = plush('pierna', 'Pierna (2 pares en espejo)', B.leg, t, { qty: 4, mirrorPairs: true, fabric: who === 'patito' ? 'contraste' : skin });
  pieces.push(body, arm, leg);
  insertion(body, 'costado', (B.armAt + armW / 2) * k / runLength(body, 'costado'), armW * k, 'Brazo', 'brazo');
  const base = runLength(body, 'base');
  insertion(body, 'base', 0.25, B.legW * k, 'Pierna', 'pierna-1'); insertion(body, 'base', 0.75, B.legW * k, 'Pierna', 'pierna-2');
  const cost = runLength(body, 'costado');
  notchAt(body, 'costado', cost * 0.62, 'Abertura para voltear (solo en la pieza trasera)', 'abertura-a'); notchAt(body, 'costado', cost * 0.62 + Math.max(40, 0.32 * B.bodyH * k), 'Abertura', 'abertura-b');
  if (!flower) seams.push(match('cuello', 'Cuello de la cabeza con el cuello del cuerpo', side(head, 'cuello'), side(body, 'cuello')));
  if (2 * B.legW * k > base + 0.5) notices.push({ level: 'error', code: 'piernas-base', message: 'Las piernas no caben en la base del cuerpo.' });
  turnCheck([[who === 'patito' ? 'alas' : 'brazos', armW * k], ['piernas', B.legW * k]], notices);

  // ---------- Character extras
  const ear = (id: string, name: string, a: A[], qty: number, fabric: 'principal' | 'contraste') => plush(id, name, a, t, { qty, mirrorPairs: true, fabric });
  if (who === 'conejita' || who === 'conejo') {
    // The long-eared bunny has longer, wider ears and an appliquéd muzzle.
    const long = who === 'conejo', eW = long ? 26 : 24;
    const e = ear('oreja', long ? 'Oreja larga (2 de tela y 2 de contraste)' : 'Oreja (2 de tela y 2 de contraste)', long
      ? [[20, 0, 'contorno'], [42, 36], [40, 130], [33, 168, 'union', 'cl'], [7, 168, 'contorno', 'c'], [-1, 130], [-2, 36]]
      : [[18, 0, 'contorno'], [37, 30], [34, 100], [30, 128, 'union', 'cl'], [6, 128, 'contorno', 'c'], [0, 100], [0, 30]], 4, 'principal');
    pieces.push(e);
    const H = runLength(head, 'contorno');
    notchAt(head, 'contorno', 10 * k, 'Oreja', 'oreja-d-a'); notchAt(head, 'contorno', 10 * k + eW * k, 'Oreja', 'oreja-d-b');
    notchAt(head, 'contorno', H - 10 * k - eW * k, 'Oreja', 'oreja-i-a'); notchAt(head, 'contorno', H - 10 * k, 'Oreja', 'oreja-i-b');
    turnCheck([['orejas', eW * k]], notices);
    if (long) {
      const muzzle = ellipsePiece('hocico', 'Hocico (borde doblado, un poco de relleno)', 24, 17, 'borde', t, { qty: 1, fabric: 'contraste', labels: { borde: 'Borde: doblar 5 mm y coser sobre la cara' } });
      muzzle.edges.forEach(x => { x.finish = 'dobladillo'; x.allowance = 5; });
      embroider(muzzle, 'nariz', [[-6, -7], [6, -7], [0, 0], [-6, -7]], k, 'Bordar nariz y boca');
      embroider(muzzle, 'boca', [[0, 0], [0, 5], [-5, 9]], k, ''); embroider(muzzle, 'boca-b', [[0, 5], [5, 9]], k, '');
      head.marks.push({ id: 'hocico', kind: 'cruz', at: P(52 * k, 70 * k), label: 'Centro del hocico (solo delante)' });
      pieces.push(muzzle);
    }
  }
  if (who === 'perrito') {
    pieces.push(ear('oreja', 'Oreja caída (2 de tela y 2 de forro)', [[0, 0, 'union', 'cl'], [22, 0, 'contorno', 'c'], [30, 40], [26, 80], [12, 90], [0, 76], [-4, 36]], 4, 'principal'));
    const H = runLength(head, 'contorno');
    insertion(head, 'contorno', (26 * k) / H, 22 * k, 'Oreja', 'oreja-d'); insertion(head, 'contorno', 1 - (26 * k) / H, 22 * k, 'Oreja', 'oreja-i');
  }
  if (who === 'patito') pieces.push(plush('pico', 'Pico (relleno, se cose a la cara)', [[0, 0, 'contorno', 'c'], [24, 8], [32, 14], [24, 20], [0, 26, 'union', 'cl']], t, { qty: 2, mirrorPairs: false, fabric: 'contraste' }));
  if (who === 'abeja') {
    const wings = uni(ellipse(46, 30, 44, 26, -25), ellipse(46, 74, 30, 20, 25), ellipse(154, 30, 44, 26, 25), ellipse(154, 74, 30, 20, -25), ellipse(100, 52, 14, 24));
    pieces.push(polyPiece('alas', 'Alas (fieltro o tul doble, sin margen)', wings[0].filter((_, i) => i % 3 === 0).map(q => [q.x, q.y] as [number, number]), 'borde', { ...t, felt: true }, { qty: 1, fabric: 'contraste' }));
    if (str(p, 'antenas') === 'tela') {
      pieces.push(rectangle('antena', 'Tira de antena (doblar en cuatro)', 24 * k, 64 * k, [edge('borde', 'Borde (doblado hacia dentro)', 'sin-margen', 0), edge('punta', 'Punta', 'sin-margen', 0), edge('borde-b', 'Borde', 'sin-margen', 0), edge('base', 'Base: se mete en la costura de la cabeza', 'sin-margen', 0)], { qty: 2, fabric: 'contraste' }));
      pieces.push(ellipsePiece('bola-antena', 'Bola de antena (fruncir el borde y rellenar)', 15, 15, 'borde', t, { qty: 2, fabric: 'contraste', raw: ['borde'], labels: { borde: 'Hilván fruncido a 3 mm del borde' } }));
      insertion(head, 'contorno', 0.06, 6 * k, 'Antena', 'antena-d'); insertion(head, 'contorno', 0.94, 6 * k, 'Antena', 'antena-i');
    } else notices.push({ level: 'ok', code: 'antenas', message: 'Antenas bordadas: sin piezas sueltas, apto para bebés.' });
  }
  if (who === 'gatito') notices.push({ level: 'ok', code: 'orejas', message: 'Las orejas forman parte del contorno de la cabeza: no hay piezas sueltas.' });

  // ---------- Clothes, from this character's body
  const g = garments(B, ropa, t, sa, who);
  pieces.push(...g.pieces); seams.push(...g.seams); notices.push(...g.notices);
  if (acc === 'moño') pieces.push(...bowPieces('', 34 * k, 14 * k, sa, 'contraste'));
  if (acc === 'bolso') pieces.push(...bag(t, sa, B));
  if (acc === 'sombrero') { const h = hat(B, t); pieces.push(...h.pieces); seams.push(...h.seams); notices.push(h.notice); }
  if (acc === 'hueso') pieces.push(plush('hueso', 'Hueso de juguete (2 piezas)', [[10, 0, 'contorno'], [20, 6], [30, 4], [60, 4], [70, 6], [80, 0], [90, 8], [86, 18], [90, 28], [80, 36], [70, 30], [60, 28], [30, 28], [20, 30], [10, 36], [0, 28], [4, 18], [0, 8]], t, { qty: 2, fabric: 'contraste' }));
  if (acc === 'bufanda') pieces.push(rectangle('bufanda', 'Bufanda (doblar a lo largo)', 2.4 * B.neckW * 2 * 0.95 * k + 60 * k, 2 * 16 * k, [edge('canto', 'Canto largo', 'costura', sa), edge('extremo', 'Extremo (flecos o costura)', 'costura', sa), edge('canto-b', 'Canto largo', 'costura', sa), edge('extremo-b', 'Extremo', 'costura', sa)], { qty: 1, fabric: 'contraste' }, true));
  if (acc === 'zapatos') { const s = shoes(B, t); pieces.push(...s.pieces); seams.push(...s.seams); }
  if (who === 'muneca' && str(p, 'cabello') !== 'no') pieces.push(plush('base-cabello', 'Base del cabello (opcional: para coser o pegar lana)', [[52, -3, 'contorno'], [89, 8], [107, 46, 'borde', 'cl'], [-3, 46, 'contorno', 'c'], [15, 8]], t, { qty: 2, fabric: 'contraste', hems: { borde: 6 } }));
  if (str(p, 'parche') === 'patchwork') { const pp = patchwork(B, t, sa); pieces.push(...pp.pieces); notices.push(...pp.notices); }

  const measured = (B.headH + B.bodyH + B.legLen) * k;
  return {
    pieces, seams, notices,
    checks: [{ key: 'alto', label: 'Alto terminado (cabeza, cuerpo y piernas, de pie)', target: alto, measured, tolerance: 0.5 }],
    materials: [
      { id: 'tela', label: who === 'abeja' ? 'Punto de rayas (calcetín o camiseta) o algodón a rayas' : 'Lino, algodón o loneta suave (color piel o del animal)', qty: 'Según acomodo' },
      ...(who === 'patito' || flower || armIsLeaf ? [{ id: 'contraste', label: who === 'patito' ? 'Algodón mostaza para pico y patas' : 'Algodón para pétalos y hojas', qty: 'Retales' }] : []),
      fiber(110 * k ** 3), { id: 'hilo', label: 'Hilo resistente y hilo de bordar para la cara', qty: '1 carrete + 1 madeja' }
    ],
    assumptions: [`Escala ${Math.round(k * 100)} % de un diseño de 30 cm; el margen de ${cm(sa)} se suma después, sin escalar.`, 'Cabeza, cuerpo, brazos y piernas se cosen por separado o unidos por el cuello; la ropa se calcula con el contorno del cuerpo relleno (unos 0,92 × el doble del ancho plano) más holgura.'],
    steps: [
      { id: 'cortar', title: 'Corta y marca', detail: 'Corta todas las piezas con el hilo de la tela vertical. Marca los piquetes y borda la cara en la pieza delantera de la cabeza antes de coser.', pieces: pieces.map(x => x.id) },
      { id: 'brazos', title: 'Brazos, piernas y extras', detail: 'Une cada par por el contorno dejando abierta la unión, recorta los márgenes en las curvas, voltea y rellena sin llenar los últimos 2 cm.', pieces: ['brazo', 'pierna'] },
      { id: 'frente', title: 'Cabeza con cuerpo', detail: flower ? 'Cose los pétalos por pares, voltéalos y rellénalos poco. Hilvánalos alrededor de la cabeza delantera entre los piquetes, cose la trasera encima dejando abierto el cuello.' : 'Une la cabeza delantera con el cuerpo delantero por el cuello, y lo mismo con las piezas traseras.', pieces: ['cabeza', 'cuerpo'], seams: ['cuello'] },
      { id: 'cerrar', title: 'Cierra el muñeco', detail: 'Hilvana brazos, piernas, orejas o antenas hacia dentro entre sus piquetes. Cose delantero con trasero alrededor dejando la abertura del costado. Voltea, rellena firme y cierra con punto escondido.', pieces: ['cuerpo', 'cabeza'] },
      ...(g.pieces.length ? [{ id: 'ropa', title: 'Ropa', detail: g.step, pieces: g.pieces.map(x => x.id) }] : [])
    ]
  };
}

/** Clothes drafted from the stuffed body: circumference ≈ 0.92 × twice the flat width, plus ease. */
function garments(B: Body, ropa: string, t: ToyScale, sa: number, who: Character) {
  const pieces: Piece[] = [], seams: SeamRelation[] = [], notices: Issue[] = [];
  if (ropa === 'ninguna' || who === 'abeja') {
    if (ropa !== 'ninguna') notices.push({ level: 'aviso', code: 'ropa-abeja', message: 'La abeja va sin ropa: sus rayas son la tela.' });
    return { pieces, seams, notices, step: '' };
  }
  const yNeck = B.headH, yCrotch = B.headH + B.bodyH, circ = (w: number, ease: number) => 2 * w * 0.92 + ease;
  const hipHalf = circ(B.hipW, 16) / 4, waistHalf = circ(B.waistW, 16) / 4, legHalf = (2 * B.legW * 0.95 + 14) / 2;
  const peto = ropa === 'peto' || ropa === 'peto-largo';
  if (peto) {
    const bibTop = yNeck + 26, bw = B.chestW * 0.27, waist = B.yWaist, crotch = yCrotch + 6, hem = yCrotch + (ropa === 'peto-largo' ? B.legLen * 0.86 : B.legLen * 0.34);
    const legOut = hipHalf + 2, legIn = Math.max(3, legOut - legHalf), y = (v: number) => v - bibTop;
    const front = plush('peto-delantero', 'Peto delantero (al doblez)', [[0, 0, 'borde', 'cl'], [bw, 0, 'lado', 'cl'], [bw, y(waist), 'cintura', 'cl'], [waistHalf, y(waist), 'costado', 'c'], [hipHalf, y(B.yWaist + (yCrotch - B.yWaist) * 0.75)], [legOut, y(hem), 'bajo', 'cl'], [legIn, y(hem), 'entrepierna', 'cl'], [0, y(crotch), 'centro', 'cl']], t, { fold: 'centro', hems: { borde: 8, lado: 8, cintura: 8, bajo: 12 }, fabric: 'contraste' });
    const back = plush('peto-trasero', 'Peto trasero (al doblez)', [[0, y(waist) - 6, 'cintura', 'c'], [waistHalf, y(waist), 'costado', 'c'], [hipHalf, y(B.yWaist + (yCrotch - B.yWaist) * 0.75)], [legOut, y(hem), 'bajo', 'cl'], [legIn, y(hem), 'entrepierna', 'cl'], [0, y(crotch), 'centro', 'cl']], t, { fold: 'centro', hems: { cintura: 8, bajo: 12 }, fabric: 'contraste' });
    front.marks.push({ id: 'boton', kind: 'boton', at: P((bw - 6) * t.k, 6 * t.k), label: 'Botón o broche del tirante' });
    const strap = (bibTop - (yNeck + 10)) + (waist - (yNeck + 10)) + 24;
    pieces.push(front, back, rectangle('tirante', 'Tirante (doblar en cuatro y pespuntear)', 4 * 7 * t.k, strap * t.k, [edge('punta', 'Extremo', 'costura', sa), edge('canto', 'Canto (doblado)', 'sin-margen', 0), edge('punta-b', 'Extremo', 'costura', sa), edge('canto-b', 'Canto', 'sin-margen', 0)], { qty: 2, fabric: 'contraste' }),
      rectangle('bolsillo', 'Bolsillo del peto', bw * 1.2 * t.k, bw * 1.05 * t.k, [edge('boca', 'Boca', 'dobladillo', 10), edge('lado', 'Lado', 'costura', sa), edge('fondo', 'Fondo', 'costura', sa), edge('lado-b', 'Lado', 'costura', sa)], { qty: 1, fabric: 'contraste' }));
    seams.push(match('peto-costado', 'Costados del peto', side(front, 'costado'), side(back, 'costado')), match('peto-entrepierna', 'Entrepiernas del peto', side(front, 'entrepierna'), side(back, 'entrepierna')));
    return { pieces, seams, notices, step: 'Dobladilla peto, lados y cintura delantera. Une costados y entrepiernas, dobladilla los bajos. Cose los tirantes a la cintura trasera, crúzalos y abróchalos al peto.' };
  }
  const vestido = ropa === 'vestido' || ropa === 'vestido-chaqueta', blusa = ropa === 'blusa-pantalon';
  if (vestido || blusa) {
    // The blouse is the same bodice cut at the hip, with a gathered ruffle.
    const pre = blusa ? 'blusa' : 'vestido', what = blusa ? 'Blusa' : 'Vestido';
    const chestHalf = circ(B.chestW, 14) / 4, neck = 2 * B.neckW * 0.95, nw = neck / 6 + 2, sh = B.chestW * 0.34, L = blusa ? B.yWaist + 12 - yNeck : (yCrotch + B.legLen * 0.42) - yNeck, hemHalf = chestHalf * (blusa ? 1.12 : 1.55);
    const front = plush(`${pre}-delantero`, `${what} delantero (al doblez)`, [[0, 12, 'escote', 'c'], [nw, 0, 'hombro', 'cl'], [sh, 4, 'sisa', 'c'], [chestHalf, 26, 'costado', 'cl'], [hemHalf, L, 'bajo', 'cl'], [0, L + 2, 'centro', 'cl']], t, { fold: 'centro', hems: { bajo: 10 }, fabric: 'contraste', labels: { escote: 'Escote (ribete al bies)', sisa: 'Sisa (ribete al bies)' } });
    const back = plush(`${pre}-espalda`, `${what} espalda (par en espejo)`, [[-8, 4, 'escote', 'c'], [nw, 0, 'hombro', 'cl'], [sh, 4, 'sisa', 'c'], [chestHalf, 26, 'costado', 'cl'], [hemHalf, L, 'bajo', 'cl'], [-8, L, 'centro', 'cl']], t, { qty: 2, mirrorPairs: true, hems: { bajo: 10, centro: 8 }, fabric: 'contraste', labels: { escote: 'Escote (ribete al bies)', sisa: 'Sisa (ribete al bies)', centro: 'Centro de espalda: doblar y poner broches' } });
    for (let i = 0; i < (blusa ? 2 : 3); i++) back.marks.push({ id: `broche-${i}`, kind: 'cruz', at: P(-4 * t.k, (10 + i * 22) * t.k), label: 'Broche' });
    pieces.push(front, back);
    seams.push(match(`${pre}-hombro`, 'Hombros', side(front, 'hombro'), side(back, 'hombro')), match(`${pre}-costado`, 'Costados', side(front, 'costado'), side(back, 'costado')));
    if (blusa) {
      const hem = 2 * runLength(front, 'bajo') + 2 * runLength(back, 'bajo');
      const ruffle = rectangle('volante', 'Volante de la blusa (2 tiras: fruncir al bajo)', 1.7 * hem / 2, 24 * t.k, [edge('union', 'Unión: fruncir y coser al bajo de la blusa', 'costura', sa), edge('lado', 'Lado (une las dos tiras)', 'costura', sa), edge('bajo', 'Bajo', 'dobladillo', 8), edge('lado-b', 'Lado', 'costura', sa)], { qty: 2, fabric: 'contraste' }, true);
      const pp = pantsPiece(B, t);
      pieces.push(ruffle, pp.piece);
      seams.push(ratio('blusa-volante', 'Volante fruncido al bajo de la blusa', 'fruncido', [side(ruffle, 'union', 2)], [side(front, 'bajo', 2), side(back, 'bajo', 2)], 1.7), ...pp.seams);
      return { pieces, seams, notices, step: 'Blusa: une hombros, ribetea escote y sisas al bies y cierra costados. Une las dos tiras del volante, dobladilla el bajo, frúncelo y cóselo al bajo de la blusa; broches en la espalda. Pantalón: une los tiros, cierra las entrepiernas, haz la jareta y pasa el elástico.' };
    }
    if (ropa === 'vestido') return { pieces, seams, notices, step: 'Une hombros, ribetea escote y sisas al bies, cierra los costados, dobladilla el bajo y pon broches en la espalda.' };
  }
  // Jacket (and pants for the jeans outfit), drop shoulder.
  const ch = circ(B.chestW, 24) / 4, nw = 13, armH = 30, Lj = yCrotch + 6 - yNeck;
  const jb = plush('chaqueta-espalda', 'Chaqueta espalda (al doblez)', [[0, 4, 'escote', 'c'], [nw, 0, 'hombro', 'cl'], [ch, 5, 'sisa', 'cl'], [ch, 5 + armH, 'costado', 'cl'], [ch + 2, Lj, 'bajo', 'cl'], [0, Lj, 'centro', 'cl']], t, { fold: 'centro', hems: { bajo: 8 }, fabric: 'contraste' });
  const jf = plush('chaqueta-delantero', 'Chaqueta delantero (par en espejo)', [[-6, 14, 'escote', 'c'], [nw, 0, 'hombro', 'cl'], [ch, 5, 'sisa', 'cl'], [ch, 5 + armH, 'costado', 'cl'], [ch + 2, Lj, 'bajo', 'cl'], [-6, Lj, 'canto', 'cl']], t, { qty: 2, mirrorPairs: true, hems: { bajo: 8, canto: 8 }, fabric: 'contraste' });
  const wrist = 2 * B.armW * 0.95 + 14, cap = 2 * Math.hypot(0, armH), sl = B.armLen - (ch - B.chestW / 2) - 6;
  const sleeve = plush('manga', 'Manga (par)', [[0, 0, 'copa', 'cl'], [cap, 0, 'costura-manga', 'cl'], [cap - (cap - wrist) / 2, sl, 'puno', 'cl'], [(cap - wrist) / 2, sl, 'costura-manga-b', 'cl']], t, { qty: 2, mirrorPairs: true, hems: { puno: 8 }, fabric: 'contraste' });
  pieces.push(jb, jf, sleeve);
  seams.push(match('chaqueta-hombro', 'Hombros', side(jf, 'hombro'), side(jb, 'hombro')), match('chaqueta-costado', 'Costados', side(jf, 'costado'), side(jb, 'costado')),
    equal2('manga-sisa', 'Copa de la manga con las sisas', side(sleeve, 'copa'), [side(jf, 'sisa'), side(jb, 'sisa')]),
    match('manga-costura', 'Costura de la manga', side(sleeve, 'costura-manga'), side(sleeve, 'costura-manga-b')));
  if (ropa === 'pantalon-chaqueta') { const pp = pantsPiece(B, t); pieces.push(pp.piece); seams.push(...pp.seams); }
  return { pieces, seams, notices, step: `${vestido ? 'Cose el vestido (hombros, ribetes, costados, bajo y broches). ' : ''}${ropa === 'pantalon-chaqueta' ? 'Pantalón: une los tiros, cierra las entrepiernas, haz la jareta y pasa el elástico. ' : ''}Chaqueta: une hombros, cose las mangas planas a la sisa, cierra costados y mangas de un tirón y dobladilla cantos, bajo y puños.` };
}
/** Pull-on pants, one piece per leg, from the stuffed hip and leg. */
function pantsPiece(B: Body, t: ToyScale) {
  const yCrotch = B.headH + B.bodyH, legHalf = (2 * B.legW * 0.95 + 14) / 2;
  const W = (2 * B.hipW * 0.92 + 18) / 2, ext = 8, rise = yCrotch - B.yWaist + 2, L = yCrotch + B.legLen * 0.9 - B.yWaist, lw = legHalf + 4;
  const pants = plush('pantalon', 'Pantalón (par en espejo: una pieza por pierna)', [[0, 0, 'cintura', 'cl'], [W, 0, 'tiro-tr', 'c'], [W + 0.5, rise * 0.55], [W + ext, rise, 'entrepierna-tr', 'c'], [W / 2 + lw, L, 'bajo', 'cl'], [W / 2 - lw, L, 'entrepierna-del', 'c'], [-ext, rise, 'tiro-del', 'c'], [-0.5, rise * 0.55]], t, { qty: 2, mirrorPairs: true, hems: { cintura: 14, bajo: 12 }, fabric: 'contraste', labels: { cintura: 'Cintura (jareta para elástico)' } });
  return { piece: pants, seams: [match('pantalon-entrepierna', 'Entrepierna delantera con trasera', side(pants, 'entrepierna-del'), side(pants, 'entrepierna-tr')), match('pantalon-tiro', 'Tiro delantero con tiro delantero de la otra pierna', side(pants, 'tiro-del'), side(pants, 'tiro-del'))] };
}
/** Small hat that sits on top of the head: a double brim with the crown line marked, and a two-piece crown that fits it. */
function hat(B: Body, t: ToyScale) {
  const xs = B.head.map(a => a[0]), headW = Math.max(...xs) - Math.min(...xs), rx = headW * 0.3, ry = headW * 0.22, k = t.k;
  const brim = ellipsePiece('sombrero-ala', 'Ala del sombrero (2: arriba y debajo)', rx + 24, ry + 20, 'borde', t, { qty: 2, fabric: 'contraste', labels: { borde: 'Borde exterior' } });
  const inner = placeOval(brim, 'copa', 0, 0, rx * k, ry * k, 'Línea de la copa: coser aquí y recortar el centro a 5 mm', 48);
  const W = inner / 2 / k, H = headW * 0.3;
  const crown = plush('sombrero-copa', 'Copa del sombrero (2: delante y detrás)', [[W, H, 'base', 'cl'], [0, H, 'contorno', 'c'], [W * 0.06, H * 0.3], [W / 2, 0], [W * 0.94, H * 0.3]], t, { qty: 2, fabric: 'contraste', labels: { base: 'Base: se cose a la línea del ala' } });
  return {
    pieces: [brim, crown],
    seams: [match('sombrero-copa', 'Las dos mitades de la copa', side(crown, 'contorno'), side(crown, 'contorno'))] as SeamRelation[],
    notice: { level: 'ok', code: 'sombrero', message: `La base de la copa (2 × ${cm(W * k)}) mide justo la línea marcada en el ala. El sombrero se cose a la cabeza con unas puntadas: no lleva cintas al cuello.` } as Issue
  };
}

function shoes(B: Body, t: ToyScale) {
  const rx = B.legW * 0.62, ry = B.legW * 0.36;
  const sole = ellipsePiece('suela', 'Suela del zapato (fieltro o cuero fino)', rx, ry, 'contorno', t, { qty: 2, labels: { contorno: 'Unión a la parte de arriba' } });
  const per = runLength(sole, 'contorno') / t.k;
  const upper = plush('zapato', 'Zapato: parte de arriba (par)', [[0, 0, 'boca', 'cl'], [per, 0, 'talon', 'cl'], [per, 16, 'suela', 'cl'], [0, 16, 'talon-b', 'cl']], t, { qty: 2, hems: { boca: 6 }, fabric: 'contraste' });
  return { pieces: [upper, sole], seams: [match('zapato-suela', 'Zapato con su suela', side(upper, 'suela'), side(sole, 'contorno')), match('zapato-talon', 'Talón', side(upper, 'talon'), side(upper, 'talon-b'))] as SeamRelation[] };
}
function bag(t: ToyScale, sa: number, B: Body) {
  const w = 30, h = 26;
  return [
    rectangle('bolso', 'Bolso (doblar por la mitad)', w * t.k, 2 * h * t.k, [edge('boca', 'Boca', 'dobladillo', 6), edge('lado', 'Lado', 'costura', sa), edge('boca-b', 'Boca', 'dobladillo', 6), edge('lado-b', 'Lado', 'costura', sa)], { qty: 1, fabric: 'contraste' }),
    plush('solapa', 'Solapa del bolso (2: exterior y vista)', [[0, 0, 'union', 'cl'], [w, 0, 'borde', 'cl'], [w, h * 0.45], [w / 2, h * 0.7], [0, h * 0.45]], t, { qty: 2, fabric: 'contraste' }),
    rectangle('asa', 'Asa cruzada (doblar en cuatro)', 4 * 5 * t.k, (2 * (B.headH + B.bodyH * 0.6) * 0.62 + 40) * t.k, [edge('punta', 'Extremo', 'costura', sa), edge('canto', 'Canto', 'sin-margen', 0), edge('punta-b', 'Extremo', 'costura', sa), edge('canto-b', 'Canto', 'sin-margen', 0)], { qty: 1, fabric: 'contraste' })
  ];
}
function patchwork(B: Body, t: ToyScale, sa: number) {
  const w = B.chestW * 0.7, h = (B.bodyH - 26) * 0.62;
  const patch = ellipsePiece('parche', 'Parche de la panza (cortar del bloque de retales)', w / 2, h / 2, 'borde', t, { qty: 1, fabric: 'contraste', labels: { borde: 'Borde: doblar 5 mm y coser a punto escondido' } });
  patch.edges.forEach(e => { e.finish = 'dobladillo'; e.allowance = 5; });
  const sq = rectangle('retal', 'Retal del patchwork (4 telas distintas)', (w / 2) * t.k + 6, (h / 2) * t.k + 6, [edge('a', 'Lado', 'costura', sa), edge('b', 'Lado', 'costura', sa), edge('c', 'Lado', 'costura', sa), edge('d', 'Lado', 'costura', sa)], { qty: 4, fabric: 'contraste' });
  return { pieces: [sq, patch], notices: [{ level: 'ok', code: 'patchwork', message: 'Une los 4 retales en un bloque de 2 × 2, plancha las costuras abiertas, centra la plantilla del parche en el cruce y recórtalo.' } as Issue] };
}

const RAG_CHOICES = (key: string) => ({
  personaje: [['muneca', 'Muñeca'], ['conejita', 'Conejita'], ['conejo', 'Conejo de orejas largas'], ['gatito', 'Gatito'], ['perrito', 'Perrito'], ['patito', 'Patito'], ['abeja', 'Abeja de rayas'], ['flor', 'Muñeca flor']],
  ropa: [['ninguna', 'Sin ropa'], ['peto', 'Peto corto'], ['peto-largo', 'Peto largo'], ['vestido', 'Vestido'], ['vestido-chaqueta', 'Vestido y chaqueta'], ['pantalon-chaqueta', 'Pantalón y chaqueta'], ['blusa-pantalon', 'Blusa con volante y pantalón']],
  accesorio: [['ninguno', 'Ninguno'], ['moño', 'Moño'], ['bolso', 'Bolso cruzado'], ['bufanda', 'Bufanda'], ['hueso', 'Hueso de juguete'], ['zapatos', 'Zapatos'], ['sombrero', 'Sombrero']],
  parche: [['no', 'Sin parche'], ['patchwork', 'Parche de patchwork en la panza']],
  petalo: [['redondo', 'Pétalos redondos'], ['puntiagudo', 'Pétalos en punta']],
  brazos: [['brazo', 'Brazos'], ['hoja', 'Brazos en forma de hoja']],
  antenas: [['tela', 'De tela con bolita'], ['bordadas', 'Bordadas (bebés)']]
} as Record<string, string[][]>)[key].map(([value, label]) => ({ value, label }));

export const ragGenerator: PatternGenerator = {
  id: 'muneco-trapo', name: 'Muñecos y animalitos de trapo', status: 'experimental',
  summary: 'Muñeca, conejita, conejo de orejas largas, gatito, perrito, patito, abeja o muñeca flor de 22 a 70 cm, con ropa calculada desde su cuerpo.',
  requiredMeasures: [], optionalMeasures: [], defaults: ragDefaults, generate: generateRag,
  params: [
    { key: 'personaje', label: 'Personaje', group: 'diseno', type: 'choice', choices: RAG_CHOICES('personaje') }, altoParam(220, 700),
    { key: 'ropa', label: 'Ropa', group: 'diseno', type: 'choice', choices: RAG_CHOICES('ropa'), when: q => q.personaje !== 'abeja' },
    { key: 'accesorio', label: 'Accesorio', group: 'diseno', type: 'choice', choices: RAG_CHOICES('accesorio') },
    { key: 'parche', label: 'Panza', group: 'diseno', type: 'choice', choices: RAG_CHOICES('parche') },
    { key: 'cabello', label: 'Base para el cabello', group: 'diseno', type: 'choice', choices: [{ value: 'si', label: 'Sí: casquete para coser la lana' }, { value: 'no', label: 'No' }], when: q => q.personaje === 'muneca' },
    { key: 'petalos', label: 'Número de pétalos', group: 'diseno', type: 'ratio', min: 5, max: 12, when: q => q.personaje === 'flor' },
    { key: 'petalo', label: 'Forma de los pétalos', group: 'diseno', type: 'choice', choices: RAG_CHOICES('petalo'), when: q => q.personaje === 'flor' },
    { key: 'brazos', label: 'Brazos', group: 'diseno', type: 'choice', choices: RAG_CHOICES('brazos'), when: q => q.personaje === 'flor' },
    { key: 'antenas', label: 'Antenas', group: 'diseno', type: 'choice', choices: RAG_CHOICES('antenas'), when: q => q.personaje === 'abeja' },
    margin
  ]
};

// ================================================================== Bichito redondo (mariquita)
export function bugDefaults(): Params { return { alto: 220, lazo: 'si', antenas: 'tela', margen: 6 }; }
export function generateBug(ctx: GeneratorContext, params: Params): GeneratorResult {
  void ctx;
  const p = { ...bugDefaults(), ...params }, alto = num(p, 'alto'), sa = num(p, 'margen');
  if (!(alto >= 140 && alto <= 500) || !(sa >= 4 && sa <= 10)) return invalid('bichito-medidas', 'El alto va de 14 a 50 cm y el margen de 4 a 10 mm.');
  const k = alto / 220, t: ToyScale = { k, sa, felt: false }, notices: Issue[] = [exp('Bichito redondo'), safety];
  const headBack = ellipsePiece('cabeza-trasera', 'Cabeza trasera (estampado)', 62, 60, 'contorno', t, { qty: 1, fabric: 'principal' });
  const headFront = ellipsePiece('cabeza-delantera', 'Cabeza delantera (estampado)', 62, 60, 'contorno', t, { qty: 1, fabric: 'principal' });
  const face = ellipsePiece('cara', 'Cara (color piel, aplicada con borde doblado)', 40, 38, 'borde', t, { qty: 1, fabric: 'contraste', labels: { borde: 'Borde: doblar 5 mm y coser sobre la cabeza delantera' } });
  face.edges.forEach(e => { e.finish = 'dobladillo'; e.allowance = 5; });
  for (const f of [{ id: 'ojo-i', pts: [[-14, -4], [-12, 0], [-14, 4], [-16, 0], [-14, -4]] as [number, number][] }, { id: 'ojo-d', pts: [[14, -4], [16, 0], [14, 4], [12, 0], [14, -4]] as [number, number][] }, { id: 'boca', pts: smile(0, 14, 12) }]) embroider(face, f.id, f.pts, k, f.id === 'ojo-i' ? 'Bordar ojos y sonrisa' : '');
  const neck = 40;
  const P0 = runLength(headBack, 'contorno');
  notchAt(headBack, 'contorno', P0 / 2 - neck * k / 2, 'Abertura del cuello', 'cuello-a'); notchAt(headBack, 'contorno', P0 / 2 + neck * k / 2, 'Abertura del cuello', 'cuello-b');
  const body = plush('cuerpo', 'Cuerpo (delantero y trasero)', [[32, 0, 'cuello', 'cl'], [72, 0, 'costado', 'c'], [92, 20], [104, 56], [94, 92], [52, 104], [10, 92], [0, 56], [12, 20]], t, { qty: 2, fabric: 'principal' });
  const arm = plush('bracito', 'Bracito (2 pares en espejo)', [[0, 0, 'union', 'cl'], [26, 0, 'contorno', 'c'], [30, 30], [24, 54], [6, 52], [-2, 24]], t, { qty: 4, mirrorPairs: true });
  const foot = plush('patita', 'Patita (2 pares)', [[0, 0, 'union', 'cl'], [30, 0, 'contorno', 'c'], [36, 16], [28, 32], [2, 32], [-6, 16]], t, { qty: 4 });
  const wing = plush('ala', 'Ala (2 pares en espejo, tela de contraste)', [[0, 0, 'contorno', 'c'], [46, 6], [74, 40], [62, 82], [0, 98, 'union', 'cl']], t, { qty: 4, mirrorPairs: true, fabric: 'contraste' });
  const spot = ellipsePiece('lunar', 'Lunar de las alas (fieltro, sin margen)', 7, 7, 'borde', { ...t, felt: true }, { qty: 6, fabric: 'contraste' });
  insertion(body, 'costado', 0.22, 26 * k, 'Bracito', 'brazo');
  const pieces = [headFront, face, headBack, body, arm, foot, wing, spot];
  const seams: SeamRelation[] = [match('cabeza', 'Cabeza delantera con trasera', side(headFront, 'contorno'), side(headBack, 'contorno'))];
  if (str(p, 'antenas') === 'tela') {
    pieces.push(rectangle('antena', 'Tira de antena (doblar en cuatro)', 24 * k, 56 * k, [edge('borde', 'Borde', 'sin-margen', 0), edge('punta', 'Punta', 'sin-margen', 0), edge('borde-b', 'Borde', 'sin-margen', 0), edge('base', 'Base: entra en la costura de la cabeza', 'sin-margen', 0)], { qty: 2, fabric: 'contraste' }),
      ellipsePiece('bola-antena', 'Bola de antena (fruncir y rellenar)', 14, 14, 'borde', t, { qty: 2, fabric: 'contraste', raw: ['borde'], labels: { borde: 'Hilván fruncido a 3 mm del borde' } }));
    insertion(headFront, 'contorno', 0.08, 6 * k, 'Antena', 'antena-d'); insertion(headFront, 'contorno', 0.92, 6 * k, 'Antena', 'antena-i');
  }
  if (str(p, 'lazo') === 'si') pieces.push(...bowPieces('', 34 * k, 16 * k, sa, 'contraste'));
  turnCheck([['bracitos', 26 * k], ['patitas', 30 * k]], notices);
  return {
    pieces, seams, notices,
    checks: [{ key: 'alto', label: 'Alto terminado (cabeza y cuerpo)', target: alto, measured: (120 + 104) * k * 0.98, tolerance: 0.05 * alto }],
    materials: [{ id: 'tela', label: 'Terciopelo, algodón estampado o lino', qty: 'Según acomodo' }, { id: 'contraste', label: 'Algodón color piel para la cara y tela negra o lisa para las alas', qty: 'Retales' }, fiber(90 * k ** 3), { id: 'hilo', label: 'Hilo de bordar negro y rosa', qty: '1 madeja' }],
    assumptions: [`Escala ${Math.round(k * 100)} % de un diseño de 22 cm. La cabeza es una bola plana de dos círculos; el cuerpo entra por la abertura del cuello y se cose a punto escondido.`],
    steps: [
      { id: 'cara', title: 'Cara', detail: 'Borda ojos y sonrisa, dobla el borde de la cara y cósela sobre la cabeza delantera, un poco por debajo del centro.', pieces: ['cara', 'cabeza-delantera'] },
      { id: 'cabeza', title: 'Cabeza', detail: 'Hilvana las antenas entre sus piquetes, cose delantera con trasera dejando abierto el cuello, voltea y rellena.', pieces: ['cabeza-delantera', 'cabeza-trasera'], seams: ['cabeza'] },
      { id: 'cuerpo', title: 'Cuerpo y patitas', detail: 'Cose y rellena bracitos y patitas. Mételos entre las piezas del cuerpo, cose alrededor dejando el cuello abierto, voltea y rellena.', pieces: ['cuerpo', 'bracito', 'patita'] },
      { id: 'unir', title: 'Une y decora', detail: 'Mete el cuello del cuerpo en la cabeza y cóselo a punto escondido. Cose las alas por pares, voltéalas, aplica los lunares y cóselas a la espalda. Añade el lazo.', pieces: ['ala', 'lunar'] }
    ]
  };
}
export const bugGenerator: PatternGenerator = {
  id: 'peluche-bichito', name: 'Bichito redondo con alas', status: 'experimental', summary: 'Mariquita o bichito de cabeza redonda con cara aplicada, alas forradas, antenas y lazo.',
  requiredMeasures: [], optionalMeasures: [], defaults: bugDefaults, generate: generateBug,
  params: [altoParam(140, 500), { key: 'lazo', label: 'Lazo', group: 'diseno', type: 'choice', choices: [{ value: 'si', label: 'Con lazo' }, { value: 'no', label: 'Sin lazo' }] },
    { key: 'antenas', label: 'Antenas', group: 'diseno', type: 'choice', choices: RAG_CHOICES('antenas') }, margin]
};

// ================================================================== Hada de fieltro
export function fairyDefaults(): Params { return { alto: 200 }; }
export function generateFairy(ctx: GeneratorContext, params: Params): GeneratorResult {
  void ctx;
  const p = { ...fairyDefaults(), ...params }, alto = num(p, 'alto');
  if (!(alto >= 120 && alto <= 400)) return invalid('hada-medidas', 'El alto va de 12 a 40 cm.');
  const k = alto / 200, t: ToyScale = { k, sa: 0, felt: true };
  const head = ellipsePiece('cabeza', 'Cabeza (fieltro color piel)', 30, 32, 'borde', t, { qty: 2 });
  for (const f of [{ id: 'ojo-i', pts: sleepyEye(-10, 2, 9, true) }, { id: 'ojo-d', pts: sleepyEye(10, 2, 9, true) }, { id: 'boca', pts: smile(0, 14, 6) }]) embroider(head, f.id, f.pts, k, f.id === 'ojo-i' ? 'Bordar ojos y boca (solo delante)' : '');
  const hair = plush('cabello', 'Cabello (fieltro, se cose sobre la cabeza delantera)', [[0, -36, 'borde'], [26, -28], [34, -2], [28, 14, undefined, 'c'], [18, -8], [0, -16, undefined, 'c'], [-18, -8], [-28, 14, undefined, 'c'], [-34, -2], [-26, -28]], t, { qty: 1, fabric: 'contraste' });
  const body = plush('cuerpo', 'Cuerpo (fieltro de color)', [[30, 0, 'borde'], [52, 20], [60, 80], [48, 130], [30, 140], [12, 130], [0, 80], [8, 20]], t, { qty: 2, fabric: 'contraste' });
  const arm = plush('brazo', 'Brazo (fieltro color piel)', [[0, 0, 'borde', 'c'], [14, 0], [16, 40], [10, 62], [2, 60], [-2, 36]], t, { qty: 4, mirrorPairs: true });
  const upper = polyPiece('ala-superior', 'Ala superior (fieltro blanco, en espejo)', leaf(0, 60, 120, 0, 54, 0.04).filter((_, i) => i % 2 === 0).map(q => [q.x, q.y] as [number, number]), 'borde', t, { qty: 2, mirrorPairs: true, fabric: 'contraste' });
  const lower = polyPiece('ala-inferior', 'Ala inferior (fieltro blanco, en espejo)', leaf(0, 0, 96, 50, 42, -0.04).filter((_, i) => i % 2 === 0).map(q => [q.x, q.y] as [number, number]), 'borde', t, { qty: 2, mirrorPairs: true, fabric: 'contraste' });
  embroider(upper, 'nervio', [[14, 54], [50, 34], [90, 14]], k, 'Bordar nervio con hojitas (opcional)');
  const pieces = [head, hair, body, arm, upper, lower];
  return {
    pieces, seams: [match('cabeza', 'Cabeza delantera con trasera (festón)', side(head, 'borde'), side(head, 'borde')), match('cuerpo', 'Cuerpo delantero con trasero (festón)', side(body, 'borde'), side(body, 'borde'))],
    notices: [exp('Hada de fieltro'), safety, { level: 'ok', code: 'fieltro', message: 'Fieltro: se corta por la línea, sin margen, y se cose a mano con punto de festón por fuera.' }],
    checks: [{ key: 'alto', label: 'Alto de cabeza y cuerpo', target: alto, measured: (64 + 140 - 8) * k, tolerance: 0.05 * alto }],
    materials: [{ id: 'fieltro', label: 'Fieltro de lana: piel, color del cuerpo, cabello y blanco para las alas', qty: '4 láminas de 20 × 30 cm' }, fiber(30 * k ** 3), { id: 'cinta', label: 'Cinta de raso para el lazo y botón o flor decorativa (no para bebés)', qty: `${cm(300 * k)}` }, { id: 'hilo', label: 'Hilo de bordar a juego', qty: '3 madejas' }],
    assumptions: ['Fieltro sin margen: las piezas se unen por el borde con festón. Las antenas se bordan o se hacen con hilo encerado (no alambre si es para niños pequeños).'],
    steps: [
      { id: 'cara', title: 'Cara y cabello', detail: 'Borda ojos y boca en una cabeza, cose encima el cabello con puntadas pequeñas y une las dos cabezas con festón rellenando poco.', pieces: ['cabeza', 'cabello'] },
      { id: 'cuerpo', title: 'Cuerpo y brazos', detail: 'Une cada par de brazos y el cuerpo con festón, rellena y cose la cabeza encima del cuerpo y los brazos a los lados.', pieces: ['cuerpo', 'brazo'] },
      { id: 'alas', title: 'Alas', detail: 'Borda las alas, cóselas a la espalda solapando superior e inferior y tapa la unión con el lazo.', pieces: ['ala-superior', 'ala-inferior'] }
    ]
  };
}
export const fairyGenerator: PatternGenerator = {
  id: 'fieltro-hada', name: 'Hada de fieltro con alas bordadas', status: 'experimental', summary: 'Figura plana de fieltro: cabeza con cabello aplicado, cuerpo, brazos y dos pares de alas.',
  requiredMeasures: [], optionalMeasures: [], defaults: fairyDefaults, generate: generateFairy, params: [altoParam(120, 400)]
};

// ================================================================== Libélula de tela
export function dragonflyDefaults(): Params { return { largo: 420, margen: 6 }; }
export function generateDragonfly(ctx: GeneratorContext, params: Params): GeneratorResult {
  void ctx;
  const p = { ...dragonflyDefaults(), ...params }, L = num(p, 'largo'), sa = num(p, 'margen');
  if (!(L >= 300 && L <= 900) || !(sa >= 4 && sa <= 10)) return invalid('libelula-medidas', 'El largo va de 30 a 90 cm y el margen de 4 a 10 mm.');
  const k = L / 420, t: ToyScale = { k, sa, felt: false };
  const r = 26;
  const head = plush('cabeza', 'Cabeza (media esfera, tela clara)', [[r, 0, 'contorno'], [r * 1.74, r * 0.26], [2 * r, r, 'base', 'cl'], [0, r, 'contorno', 'c'], [r * 0.26, r * 0.26]], t, { qty: 2 });
  head.marks.push({ id: 'ojo-i', kind: 'punto', at: P(r * 0.6 * k, r * 0.7 * k), label: 'Ojo bordado' }, { id: 'ojo-d', kind: 'punto', at: P(r * 1.4 * k, r * 0.7 * k), label: 'Ojo bordado' });
  const C0 = 2 * runLength(head, 'base') / k, band = (420 - 2 * r) * 1.32, tail = 34;
  const body = plush('cuerpo', 'Cuerpo: banda larga (al doblez, se frunce cada 4 cm)', [[0, 0, 'centro', 'cl'], [band, 0, 'punta', 'c'], [band + tail * 0.45, tail * 0.25], [band, tail / 2, 'costado', 'c'], [0, C0 / 2, 'union', 'cl']], t, { fold: 'centro', labels: { union: 'Unión a la cabeza', costado: 'Costado: se cose doblado en tubo' } });
  for (let x = 40, i = 0; x < band - 10; x += 40, i++) body.lines.push({ id: `frunce-${i}`, kind: 'referencia', a: P(x * k, 0), b: P(x * k, (C0 / 2 - (C0 / 2 - tail / 2) * (x / band)) * k), label: i === 0 ? 'Fruncir aquí atando con hilo fuerte' : undefined } as Piece['lines'][number]);
  const wing = (id: string, name: string, len: number, w: number) => plush(id, name, [[0, w * 0.3, 'union', 'cl'], [0, -w * 0.3, 'contorno', 'c'], [len * 0.35, -w * 0.55], [len * 0.85, -w * 0.4], [len, 0], [len * 0.82, w * 0.42], [len * 0.35, w * 0.5]], t, { qty: 4, mirrorPairs: true, fabric: 'contraste' });
  const up = wing('ala-superior', 'Ala superior (4: dos pares en espejo)', 420 * 0.42, 44), low = wing('ala-inferior', 'Ala inferior (4: dos pares en espejo)', 420 * 0.36, 40);
  const strip = rectangle('tira', 'Tira de unión de las alas', 60 * k, 25 * k, [edge('a', 'Canto (doblar)', 'sin-margen', 0), edge('b', 'Extremo', 'costura', sa), edge('c', 'Canto (doblar)', 'sin-margen', 0), edge('d', 'Extremo', 'costura', sa)], { qty: 1, fabric: 'contraste' });
  const pieces = [head, body, up, low, strip], notices: Issue[] = [exp('Libélula de tela'), safety];
  turnCheck([['cola del cuerpo', tail * k], ['alas', 0.6 * 40 * k]], notices);
  return {
    pieces,
    seams: [match('cabeza', 'Las dos medias esferas de la cabeza', side(head, 'contorno'), side(head, 'contorno')), match('cuello', 'Boca del cuerpo con la base de la cabeza (dos mitades)', side(body, 'union', 2), side(head, 'base', 2))],
    notices,
    checks: [{ key: 'largo', label: 'Largo terminado (cabeza y cuerpo fruncido)', target: L, measured: (2 * r + band / 1.32) * k, tolerance: 0.5 }],
    materials: [{ id: 'tela', label: 'Lino o algodón crema para cuerpo y cabeza', qty: `${cm(band * k + 60)} × ${cm(C0 * k + 30)}` }, { id: 'contraste', label: 'Lino rosa o mostaza para las alas', qty: 'Medio metro' }, fiber(60 * k ** 3), { id: 'hilo', label: 'Hilo fuerte para fruncir y hilo de bordar negro', qty: '1 + 1' }],
    assumptions: [`El cuerpo se corta un 32 % más largo: al fruncir cada 4 cm vuelve a ${cm(L - 2 * r * k)}.`],
    steps: [
      { id: 'cuerpo', title: 'Cuerpo', detail: 'Dobla la banda por el doblez, cose el costado y la punta, voltea, rellena y ata un hilo fuerte en cada línea de frunce.', pieces: ['cuerpo'] },
      { id: 'cabeza', title: 'Cabeza', detail: 'Une las dos medias esferas, borda los ojos, rellena y cósela a la boca del cuerpo a punto escondido.', pieces: ['cabeza'], seams: ['cabeza', 'cuello'] },
      { id: 'alas', title: 'Alas', detail: 'Cose las alas por pares, voltea, pespuntea a 5 mm del borde y frúncelas por la unión. Átalas al cuerpo envolviendo la unión con la tira.', pieces: ['ala-superior', 'ala-inferior', 'tira'] }
    ]
  };
}
export const dragonflyGenerator: PatternGenerator = {
  id: 'peluche-libelula', name: 'Libélula de tela fruncida', status: 'experimental', summary: 'Cuerpo largo relleno y fruncido por segmentos, cabeza de dos medias esferas y dos pares de alas forradas.',
  requiredMeasures: [], optionalMeasures: [], defaults: dragonflyDefaults, generate: generateDragonfly,
  params: [{ key: 'largo', label: 'Largo de la libélula', group: 'diseno', type: 'length', min: 300, max: 900 }, margin]
};

// ================================================================== Conejo 3D con fuelle, panza y suelas
export function bunny3dDefaults(): Params { return { alto: 320, margen: 6 }; }
export function generateBunny3d(ctx: GeneratorContext, params: Params): GeneratorResult {
  void ctx;
  const p = { ...bunny3dDefaults(), ...params }, alto = num(p, 'alto'), sa = num(p, 'margen');
  if (!(alto >= 220 && alto <= 700) || !(sa >= 4 && sa <= 10)) return invalid('conejo3d-medidas', 'El alto va de 22 a 70 cm y el margen de 4 a 10 mm.');
  const k = alto / 320, t: ToyScale = { k, sa, felt: false }, notices: Issue[] = [exp('Conejo 3D'), safety];
  // Head profile facing left: gusset from nose over the crown to the nape.
  const sideHead = plush('cabeza-lateral', 'Cabeza lateral (par en espejo)', [[0, 60, 'fuelle', 'c'], [14, 28], [42, 8], [82, 0], [112, 22], [118, 42, 'nuca', 'c'], [114, 70], [112, 82, 'cuello', 'cl'], [54, 94, 'barbilla', 'c'], [24, 86], [6, 74]], t, { qty: 2, mirrorPairs: true });
  for (const f of [{ id: 'ojo', pts: [[34, 44], [38, 48], [34, 52], [30, 48], [34, 44]] as [number, number][] }]) embroider(sideHead, f.id, f.pts, k, 'Bordar el ojo');
  const gLen = runLength(sideHead, 'fuelle');
  const gusset = (D: number) => plush('fuelle', 'Fuelle central de la cabeza', [[0, 0, 'lado', 'c'], [D * 0.3, -17 * k], [D * 0.68, -12 * k], [D, 0, 'lado-b', 'c'], [D * 0.68, 12 * k], [D * 0.3, 17 * k]], { ...t, k: 1 }, { qty: 1 });
  const D = solve(d => runLength(gusset(d), 'lado'), gLen, gLen * 0.6, gLen);
  const fu = gusset(D);
  notchAt(fu, 'lado', 0, 'Nariz', 'nariz'); notchAt(sideHead, 'fuelle', 0, 'Nariz', 'nariz');
  insertion(sideHead, 'fuelle', 0.66, 24 * k, 'Oreja', 'oreja');
  const ear = plush('oreja', 'Oreja (2 de tela y 2 de contraste)', [[18, 0, 'contorno'], [39, 30], [36, 110], [29, 138, 'union', 'cl'], [5, 138, 'contorno', 'c'], [0, 110], [0, 30]], t, { qty: 4, mirrorPairs: true });
  // Body: neck = head neck minus half the belly neck, so both openings match.
  const headNeck = runLength(sideHead, 'cuello') / k, bellyNeck = 12;
  const nb = 34 + headNeck - bellyNeck;
  const sideBody = plush('cuerpo-lateral', 'Cuerpo lateral (par en espejo)', [[34, 0, 'cuello', 'cl'], [nb, 0, 'espalda', 'c'], [nb + 24, 40], [nb + 30, 100], [nb + 18, 150], [nb - 4, 172, 'base', 'cl'], [30, 172, 'frente', 'c'], [12, 140], [6, 90], [18, 40]], t, { qty: 2, mirrorPairs: true });
  const front = runLength(sideBody, 'frente');
  const belly = (H: number) => plush('panza', 'Panza (al doblez)', [[0, 0, 'cuello', 'cl'], [bellyNeck * k, 0, 'lado', 'c'], [30 * k, H * 0.45], [20 * k, H, 'base', 'cl'], [0, H, 'centro', 'cl']], { ...t, k: 1 }, { fold: 'centro', fabric: 'contraste' });
  const Hb = solve(h => runLength(belly(h), 'lado'), front, front * 0.6, front * 1.2), panza = belly(Hb);
  const arm = plush('brazo', 'Brazo (2 pares en espejo)', [[0, 0, 'contorno'], [30, 4], [36, 50], [30, 96], [14, 104], [0, 92, 'abertura', 'c'], [-4, 50, 'contorno']], t, { qty: 4, mirrorPairs: true });
  sideBody.marks.push({ id: 'brazo', kind: 'cruz', at: P((nb - 6) * k, 46 * k), label: 'Coser aquí el brazo' }, { id: 'pierna', kind: 'cruz', at: P((nb - 10) * k, 140 * k), label: 'Coser aquí la pierna' });
  const leg = plush('pierna', 'Pierna (2 pares en espejo)', [[0, 0, 'contorno'], [38, 4], [42, 50], [46, 84], [50, 104, 'planta', 'cl'], [0, 104, 'contorno', 'c'], [-4, 50]], t, { qty: 4, mirrorPairs: true });
  const foot = runLength(leg, 'planta') * 2;
  { const L0 = runLength(leg, 'contorno'); notchAt(leg, 'contorno', L0 * 0.12, 'Abertura para rellenar (solo en una pieza)', 'abertura-a'); notchAt(leg, 'contorno', L0 * 0.12 + 36 * k, 'Abertura', 'abertura-b'); }
  const sole = (rx: number) => ellipsePiece('suela', 'Suela (tela de contraste)', rx, rx * 0.56, 'contorno', { ...t, k: 1 }, { qty: 2, fabric: 'contraste' }, false);
  const rx = solve(x => runLength(sole(x), 'contorno'), foot, 5, foot), soleP = sole(rx);
  const tail = ellipsePiece('cola', 'Cola (2 piezas)', 20, 18, 'contorno', t, { qty: 2, fabric: 'contraste' });
  const pieces = [sideHead, fu, ear, sideBody, panza, arm, leg, soleP, tail];
  const seams: SeamRelation[] = [
    match('fuelle', 'Fuelle con cada cabeza lateral (de la nariz a la nuca)', side(fu, 'lado'), side(sideHead, 'fuelle')),
    match('fuelle-b', 'Fuelle, segundo lado', side(fu, 'lado-b'), side(sideHead, 'fuelle')),
    match('panza', 'Lado de la panza con el frente del cuerpo', side(panza, 'lado'), side(sideBody, 'frente')),
    equal2('cuello', 'Cuello de la cabeza con el cuello del cuerpo y de la panza', side(sideHead, 'cuello', 2), [side(sideBody, 'cuello', 2), side(panza, 'cuello', 2)]),
    match('suela', 'Suela con la planta de la pierna (dos mitades)', side(soleP, 'contorno'), side(leg, 'planta', 2))
  ];
  turnCheck([['brazos', 30 * k], ['orejas', 24 * k]], notices);
  return {
    pieces, seams, notices,
    checks: [{ key: 'alto', label: 'Alto de cabeza y cuerpo (sin orejas)', target: alto, measured: (94 + 172 + 54) * k, tolerance: 0.06 * alto }],
    materials: [{ id: 'tela', label: 'Algodón de vichy, lino o franela', qty: 'Medio metro' }, { id: 'contraste', label: 'Tela de corazones o lisa para panza, orejas, suelas y cola', qty: 'Retales' }, fiber(200 * k ** 3), { id: 'hilo', label: 'Hilo resistente y de bordar', qty: '1 + 1' }],
    assumptions: ['El fuelle de la cabeza, la panza y las suelas se calculan para que midan exactamente lo mismo que el borde al que se cosen.'],
    steps: [
      { id: 'cabeza', title: 'Cabeza', detail: 'Hilvana las orejas a una cabeza lateral entre los piquetes. Cose el fuelle a cada lado de la nariz a la nuca, une las barbillas y voltea.', pieces: ['cabeza-lateral', 'fuelle', 'oreja'], seams: ['fuelle', 'fuelle-b'] },
      { id: 'cuerpo', title: 'Cuerpo', detail: 'Cose la panza a los dos cuerpos laterales, une la espalda dejando abertura y la base. Une cabeza y cuerpo por el cuello.', pieces: ['cuerpo-lateral', 'panza'], seams: ['panza', 'cuello'] },
      { id: 'piernas', title: 'Brazos, piernas y suelas', detail: 'Cose brazos y piernas por pares; en las piernas cose la suela en la planta repartiendo con los piquetes. Voltea, rellena y cóselos al cuerpo en las marcas.', pieces: ['brazo', 'pierna', 'suela'], seams: ['suela'] },
      { id: 'final', title: 'Rellena y cierra', detail: 'Rellena firme cabeza y cuerpo por la abertura de la espalda, cierra a punto escondido y cose la cola.', pieces: ['cola'] }
    ]
  };
}
export const bunny3dGenerator: PatternGenerator = {
  id: 'peluche-conejo-3d', name: 'Conejo 3D con fuelle, panza y suelas', status: 'experimental', summary: 'Peluche con volumen: cabeza con fuelle central, orejas, panza, brazos y piernas con suela.',
  requiredMeasures: [], optionalMeasures: [], defaults: bunny3dDefaults, generate: generateBunny3d, params: [altoParam(220, 700), margin]
};

export const TOY_GENERATORS: PatternGenerator[] = [ragGenerator, bugGenerator, fairyGenerator, dragonflyGenerator, bunny3dGenerator, ...TOY_GENERATORS_2, ...DOLLHOUSE_GENERATORS];
