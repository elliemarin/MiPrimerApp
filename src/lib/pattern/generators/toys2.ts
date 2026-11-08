import { num, str, type GeneratorContext, type GeneratorResult, type Params, type PatternGenerator } from '../generator';
import type { Issue, Piece, SeamRelation } from '../types';
import { P, cm, equal, invalid, solve } from './kidsShared';
import { bowPieces } from './kidsBlocks';
import { altoParam, ellipsePiece, embroider, exp, fiber, fishDart, insertion, margin, match, mirrorRun, notchAt, placeOval, plush, polyPiece, runLength, safety, side, sleepyEye, smile, turnCheck, type A, type ToyScale } from './toyKit';
import { leaf } from '../../applique/shapes';

/* Juguetes y peluches, segundo lote (2026-11-08): osito y conejita planos,
 * oso 3D con fuelle y cabeza trasera, conejo sentado de orejas caídas, casa
 * hongo por gajos y casita de gnomos de fieltro. Diseños propios hechos a
 * partir de las fotos de referencia de la usuaria: se reconstruye la forma de
 * construir, no se copian medidas, marcas ni dibujos. Cada costura que se une
 * se calcula para medir lo mismo. */

const ROUND_EYE = (cx: number, cy: number, r: number): [number, number][] => Array.from({ length: 9 }, (_, i) => [cx + r * Math.sin((i * Math.PI) / 4), cy - r * Math.cos((i * Math.PI) / 4)] as [number, number]);
const lineCut = (piece: Piece, id: string, a: [number, number], b: [number, number], k: number, label: string) =>
  piece.lines.push({ id, kind: 'referencia', a: P(a[0] * k, a[1] * k), b: P(b[0] * k, b[1] * k), label });

// ================================================================== Osito y conejita planos
type FlatWho = 'oso' | 'conejita';
const FLAT_HEAD: Record<FlatWho, A[]> = {
  // Round ears are part of the head outline: no loose pieces.
  oso: [[90, 30, 'contorno'], [112, 32], [124, 22, undefined, 'c'], [142, 4], [166, 14], [168, 46, undefined, 'c'], [176, 82], [162, 120], [128, 146], [112, 150, 'cuello', 'cl'], [68, 150, 'contorno', 'c'], [52, 146], [18, 120], [4, 82], [12, 46, undefined, 'c'], [14, 14], [38, 4], [56, 22, undefined, 'c'], [68, 32]],
  conejita: [[90, 0, 'contorno'], [138, 10], [172, 56], [164, 112], [126, 144], [112, 150, 'cuello', 'cl'], [68, 150, 'contorno', 'c'], [54, 144], [16, 112], [8, 56], [42, 10]]
};
const FLAT_TOP: Record<FlatWho, number> = { oso: 4, conejita: 0 };
/** Body with the legs cut in one piece: the slit between the legs is cut after sewing. */
const FLAT_BODY: A[] = [[68, 0, 'cuello', 'cl'], [112, 0, 'costado', 'c'], [126, 10], [140, 44], [146, 104], [152, 160], [148, 196], [134, 214], [120, 216], [108, 210, 'entrepierna', 'c'], [90, 162, undefined, 'c'], [72, 210, 'costado', 'c'], [60, 216], [46, 214], [32, 196], [28, 160], [34, 104], [40, 44], [54, 10]];
const FLAT_ARM: A[] = [[0, 0, 'union', 'cl'], [34, 0, 'contorno', 'c'], [42, 26], [44, 60], [32, 80], [12, 80], [0, 64], [-4, 30]];
const FLAT_EAR: A[] = [[24, 0, 'contorno'], [50, 40], [48, 140], [40, 176, 'union', 'cl'], [8, 176, 'contorno', 'c'], [0, 140], [-2, 40]];
const FLAT_BODY_H = 216, FLAT_ARM_AT = 18, FLAT_ARM_W = 34, FLAT_EAR_W = 32;

export function flatDefaults(): Params { return { personaje: 'oso', alto: 360, hocico: 'si', lazo: 'si', margen: 6 }; }
export function generateFlat(ctx: GeneratorContext, params: Params): GeneratorResult {
  void ctx;
  const p = { ...flatDefaults(), ...params }, who = str(p, 'personaje') as FlatWho, alto = num(p, 'alto'), sa = num(p, 'margen');
  if (!FLAT_HEAD[who]) return invalid('plano-personaje', 'Elige osito o conejita.');
  if (!(alto >= 200 && alto <= 600) || !(sa >= 4 && sa <= 10)) return invalid('plano-medidas', 'El alto va de 20 a 60 cm y el margen de 4 a 10 mm.');
  const headH = 150 - FLAT_TOP[who], k = alto / (headH + FLAT_BODY_H), t: ToyScale = { k, sa, felt: false };
  const name = who === 'oso' ? 'Osito plano' : 'Conejita plana', bear = who === 'oso';
  const notices: Issue[] = [exp(name), safety];
  const head = plush('cabeza', bear ? 'Cabeza con orejas (delantera y trasera)' : 'Cabeza (delantera y trasera)', FLAT_HEAD[who], t, { qty: 2 });
  const body = plush('cuerpo', 'Cuerpo con piernas (delantero y trasero)', FLAT_BODY, t, { qty: 2 });
  const arm = plush('brazo', 'Brazo (2 pares en espejo)', FLAT_ARM, t, { qty: 4, mirrorPairs: true });
  const pieces: Piece[] = [head, body, arm];
  const seams: SeamRelation[] = [match('cuello', 'Cuello de la cabeza con el cuello del cuerpo', side(head, 'cuello'), side(body, 'cuello'))];
  // Arms go into the side seams just below the shoulders, the same distance from the neck on both sides.
  const L = runLength(body, 'costado');
  notchAt(body, 'costado', FLAT_ARM_AT * k, 'Brazo', 'brazo-d-a'); notchAt(body, 'costado', (FLAT_ARM_AT + FLAT_ARM_W) * k, 'Brazo', 'brazo-d-b');
  notchAt(body, 'costado', L - (FLAT_ARM_AT + FLAT_ARM_W) * k, 'Brazo', 'brazo-i-a'); notchAt(body, 'costado', L - FLAT_ARM_AT * k, 'Brazo', 'brazo-i-b');
  notchAt(body, 'costado', L * 0.79, 'Abertura para voltear (solo en la pieza trasera)', 'abertura-a'); notchAt(body, 'costado', L * 0.79 + 44 * k, 'Abertura', 'abertura-b');
  // The V between the legs keeps a narrower allowance so the two sides never overlap.
  body.edges.filter(e => /^entrepierna/.test(e.id)).forEach(e => { e.allowance = Math.min(sa, 5); e.label = 'Entrepierna: coser la V y piquetear hasta la costura'; });
  // Face: embroidered eyes, an appliquéd muzzle for the bear (optional).
  const cx = 90, muzzle = bear && str(p, 'hocico') === 'si';
  if (bear) {
    embroider(head, 'ojo-i', ROUND_EYE(cx - 28, 84, 5), k, 'Bordar ojos rellenos (solo delante)'); embroider(head, 'ojo-d', ROUND_EYE(cx + 28, 84, 5), k, '');
    if (muzzle) {
      const m = ellipsePiece('hocico', 'Hocico (borde doblado, aplicado)', 30, 22, 'borde', t, { qty: 1, fabric: 'contraste', labels: { borde: 'Borde: doblar 5 mm y coser sobre la cara' } });
      m.edges.forEach(e => { e.finish = 'dobladillo'; e.allowance = 5; });
      embroider(m, 'nariz', [[-8, -10], [8, -10], [0, -2], [-8, -10]], k, 'Bordar nariz y boca'); embroider(m, 'boca', [[0, -2], [0, 4], [-7, 9]], k, ''); embroider(m, 'boca-b', [[0, 4], [7, 9]], k, '');
      head.marks.push({ id: 'hocico', kind: 'cruz', at: P(cx * k, 108 * k), label: 'Centro del hocico (solo delante)' });
      pieces.push(m);
    } else { embroider(head, 'nariz', [[cx - 7, 100], [cx + 7, 100], [cx, 107], [cx - 7, 100]], k, 'Bordar nariz'); embroider(head, 'boca', smile(cx, 112, 14), k, ''); }
  } else {
    embroider(head, 'ojo-i', sleepyEye(cx - 26, 86, 18), k, 'Bordar ojos dormidos (solo delante)'); embroider(head, 'ojo-d', sleepyEye(cx + 26, 86, 18), k, '');
    embroider(head, 'nariz', [[cx - 5, 100], [cx + 5, 100], [cx, 105], [cx - 5, 100]], k, 'Bordar nariz'); embroider(head, 'boca', [[cx, 105], [cx, 110]], k, '');
    const ear = plush('oreja', 'Oreja (2 de tela y 2 de contraste)', FLAT_EAR, t, { qty: 4, mirrorPairs: true });
    pieces.push(ear);
    const H = runLength(head, 'contorno');
    notchAt(head, 'contorno', 26 * k, 'Oreja', 'oreja-d-a'); notchAt(head, 'contorno', (26 + FLAT_EAR_W) * k, 'Oreja', 'oreja-d-b');
    notchAt(head, 'contorno', H - (26 + FLAT_EAR_W) * k, 'Oreja', 'oreja-i-a'); notchAt(head, 'contorno', H - 26 * k, 'Oreja', 'oreja-i-b');
    turnCheck([['orejas', FLAT_EAR_W * k]], notices);
  }
  if (str(p, 'lazo') === 'si') pieces.push(...bowPieces('', 40 * k, 16 * k, sa, 'contraste'));
  turnCheck([['brazos', FLAT_ARM_W * k]], notices);
  if (bear) notices.push({ level: 'ok', code: 'orejas', message: 'Las orejas redondas forman parte del contorno de la cabeza: no hay piezas sueltas.' });
  return {
    pieces, seams, notices,
    checks: [{ key: 'alto', label: 'Alto terminado (cabeza y cuerpo, de pie)', target: alto, measured: (headH + FLAT_BODY_H) * k, tolerance: 0.5 }],
    materials: [{ id: 'tela', label: bear ? 'Minky, borreguito, pana fina o algodón' : 'Algodón de vichy, lino o franela', qty: 'Según acomodo' }, { id: 'contraste', label: 'Retales para hocico, orejas y lazo', qty: 'Retales' }, fiber(120 * k ** 3), { id: 'hilo', label: 'Hilo resistente y hilo de bordar', qty: '1 + 1' }],
    assumptions: [`Escala ${Math.round(k * 100)} % de un diseño de ${cm(headH + FLAT_BODY_H)}; el margen de ${cm(sa)} se suma después, sin escalar.`, 'Las piernas se cortan con el cuerpo: se cose la V de la entrepierna y se piquetea antes de voltear.'],
    steps: [
      { id: 'cara', title: 'Cara', detail: muzzle ? 'Borda los ojos en la cabeza delantera. Borda nariz y boca en el hocico, dobla su borde, rellénalo un poco y cóselo sobre la cara.' : 'Borda ojos, nariz y boca en la cabeza delantera antes de coser.', pieces: ['cabeza', ...(muzzle ? ['hocico'] : [])] },
      { id: 'brazos', title: bear ? 'Brazos' : 'Brazos y orejas', detail: 'Cose cada par por el contorno dejando abierta la unión, piquetea las curvas, voltea y rellena poco.', pieces: ['brazo', ...(bear ? [] : ['oreja'])] },
      { id: 'unir', title: 'Cabeza con cuerpo', detail: 'Une cada cabeza con su cuerpo por el cuello. Hilvana brazos (y orejas) hacia dentro entre los piquetes.', pieces: ['cabeza', 'cuerpo'], seams: ['cuello'] },
      { id: 'cerrar', title: 'Cierra', detail: 'Cose delantero con trasero alrededor dejando la abertura del costado. Piquetea la V entre las piernas, voltea, rellena firme y cierra a punto escondido. Añade el lazo cosido (sin cintas sueltas).', pieces: ['cuerpo'] }
    ]
  };
}
export const flatGenerator: PatternGenerator = {
  id: 'peluche-plano', name: 'Osito o conejita planos', status: 'experimental',
  summary: 'Peluche plano de dos caras: cabeza (el osito con las orejas en el contorno), cuerpo con piernas, brazos y lazo.',
  requiredMeasures: [], optionalMeasures: [], defaults: flatDefaults, generate: generateFlat,
  params: [
    { key: 'personaje', label: 'Personaje', group: 'diseno', type: 'choice', choices: [{ value: 'oso', label: 'Osito' }, { value: 'conejita', label: 'Conejita' }] }, altoParam(200, 600),
    { key: 'hocico', label: 'Hocico', group: 'diseno', type: 'choice', choices: [{ value: 'si', label: 'Hocico aplicado de contraste' }, { value: 'no', label: 'Nariz bordada' }], when: q => q.personaje !== 'conejita' },
    { key: 'lazo', label: 'Lazo', group: 'diseno', type: 'choice', choices: [{ value: 'si', label: 'Con lazo' }, { value: 'no', label: 'Sin lazo' }] }, margin
  ]
};

// ================================================================== Oso 3D: cabeza lateral, fuelle, cabeza trasera
const BEAR_SIDE: A[] = [[0, 78, 'fuelle', 'c'], [8, 60], [28, 48], [48, 30], [66, 10], [96, 0], [124, 10, 'nuca', 'c'], [140, 46], [138, 86], [124, 118, 'cuello', 'cl'], [52, 126, 'barbilla', 'c'], [26, 112], [8, 96]];
/** Back of the head: its side seam is the side head's nape run, traversed the other way. */
const BEAR_BACK: A[] = [[124, 118, 'lado', 'c'], [138, 86], [140, 46], [124, 10, 'centro', 'c'], [150, 22], [172, 60], [172, 100], [160, 124, 'cuello', 'cl']];
const BEAR_ARM: A[] = [[0, 0, 'contorno'], [34, 4], [46, 46], [46, 96], [34, 118], [14, 116], [2, 104, 'abertura', 'c'], [-4, 66, 'contorno', 'c'], [-6, 26]];
const BEAR_LEG: A[] = [[0, 0, 'contorno'], [44, 4], [52, 50], [52, 92], [70, 112], [74, 124, 'planta', 'cl'], [0, 124, 'contorno', 'c'], [-6, 60]];
const BEAR_EAR: A[] = [[56, 40, 'union', 'cl'], [0, 40, 'contorno', 'c'], [-2, 14], [28, -4], [58, 14]];

export function bear3dDefaults(): Params { return { alto: 400, lazo: 'si', margen: 6 }; }
export function generateBear3d(ctx: GeneratorContext, params: Params): GeneratorResult {
  void ctx;
  const p = { ...bear3dDefaults(), ...params }, alto = num(p, 'alto'), sa = num(p, 'margen');
  if (!(alto >= 250 && alto <= 700) || !(sa >= 4 && sa <= 10)) return invalid('oso3d-medidas', 'El alto va de 25 a 70 cm y el margen de 4 a 10 mm.');
  const k = alto / 400, t: ToyScale = { k, sa, felt: false }, notices: Issue[] = [exp('Oso 3D'), safety];
  // ---------- Head: two sides, a centre gusset from the nose to the crown, two back pieces.
  const sideHead = plush('cabeza-lateral', 'Cabeza lateral (par en espejo)', BEAR_SIDE, t, { qty: 2, mirrorPairs: true });
  embroider(sideHead, 'ojo', ROUND_EYE(44, 58, 4), k, 'Bordar el ojo (relleno de satén)');
  const backHead = plush('cabeza-trasera', 'Cabeza trasera (par en espejo)', BEAR_BACK, t, { qty: 2, mirrorPairs: true });
  const gLen = runLength(sideHead, 'fuelle');
  const gusset = (D: number) => plush('fuelle', 'Fuelle central de la cabeza (de la nariz a la coronilla)', [[0, 0, 'lado', 'c'], [D * 0.22, -10 * k], [D * 0.5, -22 * k], [D * 0.8, -17 * k], [D, 0, 'lado-b', 'c'], [D * 0.8, 17 * k], [D * 0.5, 22 * k], [D * 0.22, 10 * k]], { ...t, k: 1 }, { qty: 1 });
  const fu = gusset(solve(d => runLength(gusset(d), 'lado'), gLen, gLen * 0.6, gLen));
  notchAt(fu, 'lado', 0, 'Nariz', 'nariz'); notchAt(sideHead, 'fuelle', 0, 'Nariz', 'nariz');
  embroider(fu, 'nariz', [[8, -6], [8, 6], [22, 0], [8, -6]].map(([x, y]) => [x, y]) as [number, number][], k, 'Bordar la nariz (satén) después de coser');
  const earW = 56, earAt = 0.6;
  insertion(sideHead, 'fuelle', earAt, earW * k, 'Oreja', 'oreja');
  insertion(fu, 'lado', earAt, earW * k, 'Oreja', 'oreja'); insertion(fu, 'lado-b', 1 - earAt, earW * k, 'Oreja', 'oreja-b');
  const ear = plush('oreja', 'Oreja (2 pares: tela y contraste)', BEAR_EAR, t, { qty: 4, mirrorPairs: true });
  // ---------- Body: the front neck takes the side head's neck, the back neck the back head's, so the four corners line up.
  const a = runLength(sideHead, 'cuello') / k, b = runLength(backHead, 'cuello') / k;
  const costado: A[] = [[a, 0, 'costado', 'c'], [a + 16, 24], [a + 36, 80], [a + 40, 130], [a + 24, 170]];
  const front = plush('cuerpo-delantero', 'Cuerpo delantero (par en espejo)', [[0, 0, 'cuello', 'cl'], ...costado, [a + 6, 184, 'base', 'cl'], [0, 184, 'centro', 'c'], [-10, 140], [-12, 90], [-6, 40]], t, { qty: 2, mirrorPairs: true });
  const mc = mirrorRun([...costado, [a + 6, 184]]);
  const back = plush('cuerpo-trasero', 'Cuerpo trasero con pinza (par en espejo)', [[mc[0][0], mc[0][1], 'costado', 'c'], ...mc.slice(1, -1).map(([x, y]) => [x, y] as A), [-a, 0, 'cuello', 'cl'], [-a + b, 0, 'centro', 'c'], [-a + b + 10, 40], [-a + b + 20, 100], [-a + b + 14, 150], [-a + b + 4, 184, 'base', 'cl']], t, { qty: 2, mirrorPairs: true });
  fishDart(back, 'pinza', -a + b / 2 - 8, 96, 172, 12, k);
  { const C = runLength(back, 'centro'); notchAt(back, 'centro', C * 0.3, 'Abertura para rellenar (solo en un lado)', 'abertura-a'); notchAt(back, 'centro', C * 0.3 + 60 * k, 'Abertura', 'abertura-b'); }
  front.marks.push({ id: 'brazo', kind: 'cruz', at: P((a + 14) * k, 46 * k), label: 'Coser aquí el brazo' }, { id: 'pierna', kind: 'cruz', at: P((a + 10) * k, 150 * k), label: 'Coser aquí la pierna' });
  const baseLen = 2 * runLength(front, 'base') + 2 * runLength(back, 'base');
  const oval = (rx: number) => ellipsePiece('base', 'Base del cuerpo (óvalo)', rx, rx * 0.72, 'contorno', { ...t, k: 1 }, { qty: 1 }, false);
  const base = oval(solve(x => runLength(oval(x), 'contorno'), baseLen, 5, baseLen));
  // ---------- Limbs.
  const arm = plush('brazo', 'Brazo (2 pares en espejo)', BEAR_ARM, t, { qty: 4, mirrorPairs: true });
  const leg = plush('pierna', 'Pierna (2 pares en espejo)', BEAR_LEG, t, { qty: 4, mirrorPairs: true });
  { const L0 = runLength(leg, 'contorno'); notchAt(leg, 'contorno', L0 * 0.12, 'Abertura para rellenar (solo en una pieza)', 'abertura-a'); notchAt(leg, 'contorno', L0 * 0.12 + 40 * k, 'Abertura', 'abertura-b'); }
  const foot = 2 * runLength(leg, 'planta');
  const soleOf = (rx: number) => ellipsePiece('suela', 'Suela (contraste)', rx, rx * 0.6, 'contorno', { ...t, k: 1 }, { qty: 2, fabric: 'contraste' }, false);
  const sole = soleOf(solve(x => runLength(soleOf(x), 'contorno'), foot, 5, foot));
  const tail = ellipsePiece('cola', 'Cola (2 piezas)', 18, 14, 'contorno', t, { qty: 2 });
  const pieces = [sideHead, fu, backHead, ear, front, back, base, arm, leg, sole, tail];
  if (str(p, 'lazo') === 'si') pieces.push(...bowPieces('', 48 * k, 18 * k, sa, 'contraste'));
  const seams: SeamRelation[] = [
    match('fuelle', 'Fuelle con cada cabeza lateral (de la nariz a la coronilla)', side(fu, 'lado'), side(sideHead, 'fuelle')),
    match('fuelle-b', 'Fuelle, segundo lado', side(fu, 'lado-b'), side(sideHead, 'fuelle')),
    match('nuca', 'Cabeza lateral con cabeza trasera', side(sideHead, 'nuca'), side(backHead, 'lado')),
    match('cuello-delantero', 'Cuello de la cabeza lateral con el cuerpo delantero', side(sideHead, 'cuello'), side(front, 'cuello')),
    match('cuello-trasero', 'Cuello de la cabeza trasera con el cuerpo trasero', side(backHead, 'cuello'), side(back, 'cuello')),
    match('costado', 'Costados del cuerpo', side(front, 'costado'), side(back, 'costado')),
    equal('base', 'Base con el bajo de los cuatro cuerpos', [side(base, 'contorno')], [side(front, 'base', 2), side(back, 'base', 2)], 0.6),
    match('suela', 'Suela con la planta de la pierna (dos mitades)', side(sole, 'contorno'), side(leg, 'planta', 2))
  ];
  turnCheck([['brazos', 40 * k], ['orejas', earW * k]], notices);
  return {
    pieces, seams, notices,
    checks: [{ key: 'alto', label: 'Alto de pie (cabeza, cuerpo y piernas)', target: alto, measured: (126 + 184 + 88) * k, tolerance: 0.06 * alto }],
    materials: [{ id: 'tela', label: 'Franela de cuadros, lana cocida, pana o una prenda de recuerdo (sin elástico)', qty: 'Unos 50 × 70 cm' }, { id: 'contraste', label: 'Tela lisa para suelas, interior de orejas y lazo', qty: 'Retales' }, fiber(260 * k ** 3), { id: 'hilo', label: 'Hilo resistente y hilo de bordar negro', qty: '1 + 1' }],
    assumptions: ['El fuelle, la cabeza trasera, la base y las suelas se calculan para medir exactamente lo mismo que el borde al que se cosen.', 'Con telas de punto o prendas elásticas, plancha entretela fina detrás antes de cortar.'],
    steps: [
      { id: 'cabeza', title: 'Cabeza', detail: 'Cose las orejas por pares y voltéalas. Hilvánalas a una cabeza lateral entre los piquetes. Cose el fuelle a cada cabeza lateral desde la nariz, une las barbillas y luego las dos cabezas traseras por el centro y a las laterales por la nuca.', pieces: ['cabeza-lateral', 'fuelle', 'cabeza-trasera', 'oreja'], seams: ['fuelle', 'fuelle-b', 'nuca'] },
      { id: 'cuerpo', title: 'Cuerpo', detail: 'Cose las pinzas de la espalda. Une los delanteros por el centro y los traseros dejando la abertura. Cierra los costados, cose la base y une la cabeza por el cuello: delanteros con laterales y traseros con traseros.', pieces: ['cuerpo-delantero', 'cuerpo-trasero', 'base'], seams: ['costado', 'base', 'cuello-delantero', 'cuello-trasero'] },
      { id: 'patas', title: 'Brazos, piernas y suelas', detail: 'Cose brazos y piernas por pares dejando la abertura; en las piernas cose la suela repartiendo con los piquetes. Voltea, rellena y cierra.', pieces: ['brazo', 'pierna', 'suela'], seams: ['suela'] },
      { id: 'final', title: 'Rellena y monta', detail: 'Voltea, borda ojos y nariz, rellena firme por la espalda y cierra. Cose brazos y piernas en las marcas con punto escondido doble, y la cola. Lazo cosido, sin cintas sueltas.', pieces: ['cola'] }
    ]
  };
}
export const bear3dGenerator: PatternGenerator = {
  id: 'peluche-oso-3d', name: 'Oso 3D con fuelle y cabeza trasera', status: 'experimental',
  summary: 'Osito clásico con volumen: cabeza de cinco piezas, cuerpo con pinzas y base, brazos y piernas con suela.',
  requiredMeasures: [], optionalMeasures: [], defaults: bear3dDefaults, generate: generateBear3d,
  params: [altoParam(250, 700), { key: 'lazo', label: 'Lazo', group: 'diseno', type: 'choice', choices: [{ value: 'si', label: 'Con lazo' }, { value: 'no', label: 'Sin lazo' }] }, margin]
};

// ================================================================== Conejo sentado de orejas caídas
const SB_FRONT: A[] = [[40, 0, 'nuca', 'c'], [80, 20], [98, 60], [94, 100], [80, 124, 'cuello', 'cl'], [30, 124, 'perfil', 'c'], [14, 110], [4, 92], [-8, 74], [0, 56], [10, 22]];
const SB_BACK: A[] = [[80, 124, 'nuca', 'c'], [94, 100], [98, 60], [80, 20], [40, 0, 'centro', 'c'], [80, -16], [130, 0], [156, 40], [156, 92], [136, 124, 'cuello', 'cl']];
const SB_FRONT_LEG: A[] = [[0, 0, 'contorno'], [34, 4], [40, 56], [38, 104], [24, 122], [8, 118], [0, 106, 'abertura', 'c'], [-4, 66, 'contorno', 'c'], [-6, 28]];
const SB_BACK_LEG: A[] = [[0, 0, 'contorno'], [40, 2], [60, 28], [98, 46], [112, 70, 'planta', 'cl'], [6, 70, 'contorno', 'c'], [-6, 34]];
const SB_HEAD_H = 124, SB_BODY_H = 204;

export function sitBunnyDefaults(): Params { return { alto: 330, orejas: 'largas', margen: 6 }; }
export function generateSitBunny(ctx: GeneratorContext, params: Params): GeneratorResult {
  void ctx;
  const p = { ...sitBunnyDefaults(), ...params }, alto = num(p, 'alto'), sa = num(p, 'margen'), long = str(p, 'orejas') !== 'medianas';
  if (!(alto >= 200 && alto <= 600) || !(sa >= 4 && sa <= 10)) return invalid('conejo-sentado-medidas', 'El alto va de 20 a 60 cm y el margen de 4 a 10 mm.');
  const k = alto / (SB_HEAD_H + SB_BODY_H), t: ToyScale = { k, sa, felt: false }, notices: Issue[] = [exp('Conejo sentado'), safety];
  // ---------- Head in four pieces: two face halves (profile) and two back halves, joined over the top.
  const face = plush('cabeza-delantera', 'Cara (par en espejo: perfil del hocico)', SB_FRONT, t, { qty: 2, mirrorPairs: true });
  const nape = plush('cabeza-trasera', 'Cabeza trasera (par en espejo)', SB_BACK, t, { qty: 2, mirrorPairs: true });
  embroider(face, 'ojo', sleepyEye(54, 60, 18), k, 'Bordar el ojo dormido');
  face.marks.push({ id: 'nariz', kind: 'cruz', at: P(-4 * k, 78 * k), label: 'Nariz: bordar después de unir el perfil' });
  const earW = 40, earL = long ? 260 : 160;
  insertion(face, 'nuca', (12 + earW / 2) * k / runLength(face, 'nuca'), earW * k, 'Oreja', 'oreja');
  insertion(nape, 'nuca', 1 - (12 + earW / 2) * k / runLength(nape, 'nuca'), earW * k, 'Oreja', 'oreja');
  const ear = plush('oreja', long ? 'Oreja larga caída (2 de tela y 2 de contraste)' : 'Oreja (2 de tela y 2 de contraste)', [[0, 0, 'union', 'cl'], [earW, 0, 'contorno', 'c'], [earW + 12, earL * 0.22], [earW + 16, earL * 0.62], [earW + 4, earL * 0.92], [earW / 2, earL], [-4, earL * 0.92], [-16, earL * 0.62], [-12, earL * 0.22]], t, { qty: 4, mirrorPairs: true });
  // ---------- Body: a sitting pear in two halves; its neck is the face neck plus the back-of-head neck.
  const n = (runLength(face, 'cuello') + runLength(nape, 'cuello')) / k;
  const body = plush('cuerpo', 'Cuerpo (par en espejo)', [[30, 0, 'cuello', 'cl'], [30 + n, 0, 'espalda', 'c'], [54 + n, 40], [74 + n, 110], [70 + n, 170], [46 + n, 204, 'base', 'cl'], [14, 204, 'frente', 'c'], [-8, 160], [-6, 90], [12, 36]], t, { qty: 2, mirrorPairs: true });
  fishDart(body, 'pinza', 30 + n / 2, 112, 196, 14, k);
  { const E = runLength(body, 'espalda'); notchAt(body, 'espalda', E * 0.35, 'Abertura para rellenar (solo en un lado)', 'abertura-a'); notchAt(body, 'espalda', E * 0.35 + 60 * k, 'Abertura', 'abertura-b'); }
  body.marks.push({ id: 'pata-delantera', kind: 'cruz', at: P(24 * k, 100 * k), label: 'Coser aquí la pata delantera' }, { id: 'pata-trasera', kind: 'cruz', at: P((44 + n / 2) * k, 176 * k), label: 'Coser aquí la pata trasera' });
  const baseLen = 2 * runLength(body, 'base');
  const oval = (rx: number) => ellipsePiece('base', 'Base (óvalo)', rx, rx * 0.8, 'contorno', { ...t, k: 1 }, { qty: 1 }, false);
  const base = oval(solve(x => runLength(oval(x), 'contorno'), baseLen, 5, baseLen));
  // ---------- Legs and tail.
  const frontLeg = plush('pata-delantera', 'Pata delantera (2 pares en espejo)', SB_FRONT_LEG, t, { qty: 4, mirrorPairs: true });
  const backLeg = plush('pata-trasera', 'Pata trasera (2 pares en espejo)', SB_BACK_LEG, t, { qty: 4, mirrorPairs: true });
  { const L0 = runLength(backLeg, 'contorno'); notchAt(backLeg, 'contorno', L0 * 0.08, 'Abertura para rellenar (solo en una pieza)', 'abertura-a'); notchAt(backLeg, 'contorno', L0 * 0.08 + 36 * k, 'Abertura', 'abertura-b'); }
  const foot = 2 * runLength(backLeg, 'planta');
  const soleOf = (rx: number) => ellipsePiece('suela', 'Suela de la pata trasera', rx, rx * 0.46, 'contorno', { ...t, k: 1 }, { qty: 2, fabric: 'contraste' }, false);
  const sole = soleOf(solve(x => runLength(soleOf(x), 'contorno'), foot, 5, foot));
  const tail = ellipsePiece('cola', 'Cola: círculo fruncido (se rellena y se cierra frunciendo)', 40, 40, 'borde', t, { qty: 1, fabric: 'contraste', raw: ['borde'], labels: { borde: 'Hilván fruncido a 5 mm del borde' } });
  const pieces = [face, nape, ear, body, base, frontLeg, backLeg, sole, tail];
  const seams: SeamRelation[] = [
    match('nuca', 'Cara con cabeza trasera (por encima de la cabeza)', side(face, 'nuca'), side(nape, 'nuca')),
    equal('cuello', 'Cuello de la cabeza (cara y trasera) con el cuello del cuerpo', [side(face, 'cuello', 2), side(nape, 'cuello', 2)], [side(body, 'cuello', 2)], 0.6),
    equal('base', 'Base con el bajo de las dos mitades del cuerpo', [side(base, 'contorno')], [side(body, 'base', 2)], 0.6),
    match('suela', 'Suela con la planta de la pata trasera (dos mitades)', side(sole, 'contorno'), side(backLeg, 'planta', 2))
  ];
  turnCheck([['patas delanteras', 40 * k], ['orejas', earW * k]], notices);
  return {
    pieces, seams, notices,
    checks: [{ key: 'alto', label: 'Alto sentado (sin orejas)', target: alto, measured: (SB_HEAD_H + SB_BODY_H) * k, tolerance: 0.5 }],
    materials: [{ id: 'tela', label: 'Lino, algodón de rayas o vichy', qty: 'Unos 50 × 60 cm' }, { id: 'contraste', label: 'Tela lisa o estampada para interior de orejas, suelas y cola', qty: 'Retales' }, fiber(220 * k ** 3), { id: 'hilo', label: 'Hilo resistente y hilo de bordar', qty: '1 + 1' }],
    assumptions: [`Escala ${Math.round(k * 100)} % de un diseño de ${cm(SB_HEAD_H + SB_BODY_H)} sentado.`, 'Las orejas cuelgan a los lados; la cola es un círculo fruncido relleno.'],
    steps: [
      { id: 'orejas', title: 'Orejas', detail: 'Cose cada oreja de tela con su contraste dejando abierta la unión, voltea, pespuntea a 5 mm y haz un pliegue en la base.', pieces: ['oreja'] },
      { id: 'cabeza', title: 'Cabeza', detail: 'Une las dos caras por el perfil (hocico) y las dos traseras por el centro. Hilvana las orejas a la cara entre los piquetes y une cara y trasera por encima de la cabeza.', pieces: ['cabeza-delantera', 'cabeza-trasera'], seams: ['nuca'] },
      { id: 'cuerpo', title: 'Cuerpo', detail: 'Cose las pinzas, une las mitades por delante y por la espalda dejando la abertura, cose la base y une la cabeza por el cuello.', pieces: ['cuerpo', 'base'], seams: ['cuello', 'base'] },
      { id: 'patas', title: 'Patas y cola', detail: 'Cose patas delanteras y traseras (con su suela), voltea, rellena y cóselas en las marcas. Frunce la cola alrededor de un puñado de relleno y cósela atrás.', pieces: ['pata-delantera', 'pata-trasera', 'suela', 'cola'], seams: ['suela'] }
    ]
  };
}
export const sitBunnyGenerator: PatternGenerator = {
  id: 'peluche-conejo-sentado', name: 'Conejo sentado de orejas caídas', status: 'experimental',
  summary: 'Conejo con volumen: cara de perfil y cabeza trasera, orejas largas, cuerpo de pera con base, patas y cola fruncida.',
  requiredMeasures: [], optionalMeasures: [], defaults: sitBunnyDefaults, generate: generateSitBunny,
  params: [altoParam(200, 600), { key: 'orejas', label: 'Orejas', group: 'diseno', type: 'choice', choices: [{ value: 'largas', label: 'Largas y caídas' }, { value: 'medianas', label: 'Medianas' }] }, margin]
};

// ================================================================== Casa hongo por gajos
const HW = 150, RB = 70, RT = 50, RR = 116, HR = 104;
export function mushroomHouseDefaults(): Params { return { alto: 260, gajos: 6, margen: 6 }; }
export function generateMushroomHouse(ctx: GeneratorContext, params: Params): GeneratorResult {
  void ctx;
  const p = { ...mushroomHouseDefaults(), ...params }, alto = num(p, 'alto'), sa = num(p, 'margen'), N = Math.round(num(p, 'gajos'));
  if (!(alto >= 160 && alto <= 500) || !(sa >= 4 && sa <= 10) || !(N >= 5 && N <= 8)) return invalid('casa-hongo-medidas', 'El alto va de 16 a 50 cm, de 5 a 8 gajos y el margen de 4 a 10 mm.');
  const k = alto / (HW + HR), t: ToyScale = { k, sa, felt: false }, felt: ToyScale = { ...t, felt: true }, notices: Issue[] = [exp('Casa hongo'), safety];
  // ---------- Walls: N gores between a base circle and a top circle; their straight ends add up to each circle.
  const base = ellipsePiece('base', 'Base de la casa (círculo)', RB, RB, 'contorno', t, { qty: 1 });
  const lid = ellipsePiece('tapa', 'Tapa de las paredes (círculo)', RT, RT, 'contorno', t, { qty: 1 });
  lineCut(base, 'abertura', [-RB * 0.4, 0], [RB * 0.4, 0], k, 'Corte para voltear y rellenar: se cierra a punto escondido');
  lineCut(lid, 'abertura', [-RT * 0.4, 0], [RT * 0.4, 0], k, 'Corte para rellenar: queda tapado por el tejado');
  const wb = runLength(base, 'contorno') / N / k, wt = runLength(lid, 'contorno') / N / k, wm = (2 * Math.PI * ((RB + RT) / 2 + 5)) / N;
  const wall = plush('pared', `Pared (${N} gajos)`, [[-wt / 2, 0, 'arriba', 'cl'], [wt / 2, 0, 'lado', 'c'], [wm / 2, HW * 0.55], [wb / 2, HW, 'abajo', 'cl'], [-wb / 2, HW, 'lado-b', 'c'], [-wm / 2, HW * 0.55]], t, { qty: N, labels: { arriba: 'Arriba: une con la tapa', abajo: 'Abajo: une con la base' } });
  // ---------- Roof: N spherical gores ending in a scallop; the underside repeats exactly the same scallop N times.
  const R = (RR * RR + HR * HR) / (2 * HR), th0 = HR <= R ? Math.asin(RR / R) : Math.PI - Math.asin(RR / R), L = R * th0;
  const hw = (s: number) => (Math.PI * R * Math.sin(s / R)) / N, hwL = hw(L), d = hwL * 0.6;
  const fr = [0.2, 0.45, 0.72];
  const gore = plush('techo', `Gajo del tejado (${N})`, [[0, 0, 'lado', 'c'], ...fr.map(f => [hw(f * L), f * L] as A), [hwL, L, 'borde', 'c'], [0, L + d], [-hwL, L, 'lado-b', 'c'], ...[...fr].reverse().map(f => [-hw(f * L), f * L] as A)], t, { qty: N, fabric: 'contraste', labels: { borde: 'Onda del borde: une con el bajo del tejado' } });
  const Rv = hwL / Math.sin(Math.PI / N), tipR = Rv * Math.cos(Math.PI / N) + d, under: A[] = [];
  for (let i = 0; i < N; i++) { const f = -Math.PI / 2 + (2 * Math.PI * i) / N, g = f + Math.PI / N; under.push([Rv * Math.cos(f), Rv * Math.sin(f), i ? undefined : 'borde', 'c'], [tipR * Math.cos(g), tipR * Math.sin(g)]); }
  const bottom = plush('bajo-techo', `Bajo del tejado (${N} ondas)`, under, t, { qty: 1, labels: { borde: 'Ondas: una por gajo' } });
  placeOval(bottom, 'paredes', 0, 0, RT * k, RT * k, 'Coser aquí la tapa de las paredes (punto escondido)');
  lineCut(bottom, 'abertura', [-RT * 0.5, 0], [RT * 0.5, 0], k, 'Corte para voltear y rellenar: queda tapado por las paredes');
  // ---------- Felt details.
  const door = plush('puerta', 'Puerta (fieltro, sin margen)', [[-24, 76, 'borde', 'cl'], [-24, 28, undefined, 'c'], [0, 0], [24, 28, undefined, 'cl'], [24, 76, undefined, 'cl']], felt, { qty: 1, fabric: 'contraste' });
  embroider(door, 'tabla-1', [[-8, 8], [-8, 76]], k, 'Pespunte de las tablas'); embroider(door, 'tabla-2', [[8, 8], [8, 76]], k, '');
  door.marks.push({ id: 'pomo', kind: 'punto', at: P(16 * k, 46 * k), label: 'Pomo bordado (nudo francés)' });
  const win = ellipsePiece('ventana', 'Ventana (fieltro, sin margen)', 16, 16, 'borde', felt, { qty: 2, fabric: 'contraste' });
  embroider(win, 'cruz-v', [[0, -16], [0, 16]], k, 'Bordar la cruz de la ventana'); embroider(win, 'cruz-h', [[-16, 0], [16, 0]], k, '');
  const spotL = ellipsePiece('lunar-grande', 'Lunar grande del tejado (fieltro)', 14, 13, 'borde', felt, { qty: N + 2, fabric: 'contraste' });
  const spotS = ellipsePiece('lunar-pequeno', 'Lunar pequeño del tejado (fieltro)', 8, 8, 'borde', felt, { qty: N + 2, fabric: 'contraste' });
  wall.marks.push({ id: 'puerta', kind: 'cruz', at: P(0, (HW - 46) * k), label: 'Centro de la puerta (en un gajo)' }, { id: 'ventana', kind: 'cruz', at: P(0, HW * 0.36 * k), label: 'Ventana (en otros dos gajos)' });
  const pieces = [wall, base, lid, gore, bottom, door, win, spotL, spotS];
  const seams: SeamRelation[] = [
    match('pared-lado', 'Lados de los gajos de la pared', side(wall, 'lado'), side(wall, 'lado-b')),
    match('pared-base', `Bajos de los ${N} gajos con la base`, side(wall, 'abajo', N), side(base, 'contorno')),
    match('pared-tapa', `Altos de los ${N} gajos con la tapa`, side(wall, 'arriba', N), side(lid, 'contorno')),
    match('techo-lado', 'Lados de los gajos del tejado', side(gore, 'lado'), side(gore, 'lado-b')),
    match('techo-borde', `Ondas de los ${N} gajos con el bajo del tejado`, side(gore, 'borde', N), side(bottom, 'borde'))
  ];
  turnCheck([['gajos de la pared', wt * k]], notices);
  notices.push({ level: 'ok', code: 'gajos', message: `${N} gajos: la pared mide ${cm(wb * k)} abajo y ${cm(wt * k)} arriba; el tejado hace una onda de ${cm(2 * hwL * k)} por gajo.` });
  return {
    pieces, seams, notices,
    checks: [{ key: 'alto', label: 'Alto de la casa (paredes y tejado)', target: alto, measured: (HW + HR) * k, tolerance: 0.5 }],
    materials: [{ id: 'tela', label: 'Lino o algodón crema para las paredes', qty: 'Unos 40 × 50 cm' }, { id: 'contraste', label: 'Algodón rojo o terracota para el tejado y fieltro para puerta, ventanas y lunares', qty: 'Unos 50 × 50 cm + retales' }, fiber(320 * k ** 3), { id: 'hilo', label: 'Hilo resistente y hilo de bordar', qty: '1 + 1' }],
    assumptions: ['Paredes y tejado se rellenan por separado y se unen a mano: los cortes para rellenar quedan escondidos en la unión.', 'Una casa decorativa: para bebés, borda puerta y ventanas en lugar de aplicarlas.'],
    steps: [
      { id: 'detalles', title: 'Puerta, ventanas y lunares', detail: 'Cose la puerta y las ventanas de fieltro sobre tres gajos de pared y los lunares sobre los gajos del tejado, con puntadas pequeñas.', pieces: ['puerta', 'ventana', 'lunar-grande', 'lunar-pequeno'] },
      { id: 'paredes', title: 'Paredes', detail: `Une los ${N} gajos de la pared por los lados formando un tubo, cose la base abajo y la tapa arriba repartiendo con los piquetes. Voltea por el corte de la base, rellena firme y ciérralo.`, pieces: ['pared', 'base', 'tapa'], seams: ['pared-lado', 'pared-base', 'pared-tapa'] },
      { id: 'tejado', title: 'Tejado', detail: `Une los ${N} gajos del tejado por los lados hasta la punta. Cose el bajo del tejado onda con onda, piquetea las esquinas, voltea por el corte del centro y rellena.`, pieces: ['techo', 'bajo-techo'], seams: ['techo-lado', 'techo-borde'] },
      { id: 'unir', title: 'Une la casa', detail: 'Coloca la tapa de las paredes sobre el círculo marcado bajo el tejado y cóselas con punto escondido doble, dando dos vueltas.', pieces: ['bajo-techo', 'tapa'] }
    ]
  };
}
export const mushroomHouseGenerator: PatternGenerator = {
  id: 'peluche-casa-hongo', name: 'Casa hongo por gajos', status: 'experimental',
  summary: 'Casita seta con volumen: paredes de gajos con base y tapa, tejado de gajos con borde ondulado, puerta y ventanas de fieltro.',
  requiredMeasures: [], optionalMeasures: [], defaults: mushroomHouseDefaults, generate: generateMushroomHouse,
  params: [altoParam(160, 500), { key: 'gajos', label: 'Número de gajos', group: 'diseno', type: 'ratio', min: 5, max: 8 }, margin]
};

// ================================================================== Casita de gnomos de fieltro (plana)
export function gnomeHouseDefaults(): Params { return { alto: 200, colgante: 'si' }; }
export function generateGnomeHouse(ctx: GeneratorContext, params: Params): GeneratorResult {
  void ctx;
  const p = { ...gnomeHouseDefaults(), ...params }, alto = num(p, 'alto');
  if (!(alto >= 120 && alto <= 400)) return invalid('casita-gnomos-medidas', 'El alto va de 12 a 40 cm.');
  const k = alto / 200, t: ToyScale = { k, sa: 0, felt: true };
  const house = plush('casa', 'Casa (fieltro crema: delantera y trasera)', [[-50, 0, 'borde', 'cl'], [50, 0, undefined, 'c'], [58, 60], [60, 110, undefined, 'cl'], [-60, 110, undefined, 'c'], [-58, 60]], t, { qty: 2 });
  const roofA: A[] = [[0, -90, 'borde'], [56, -72], [88, -24], [92, 14, undefined, 'c']];
  for (const x of [46, 0, -46]) roofA.push([x + 23, 28], [x, 14, undefined, 'c']);
  roofA.push([-69, 28], [-92, 14, undefined, 'c'], [-88, -24], [-56, -72]);
  const roof = plush('tejado', 'Tejado (fieltro rojo: delantero y trasero)', roofA, t, { qty: 2, fabric: 'contraste' });
  const door = plush('puerta', 'Puerta (fieltro)', [[-14, 110, 'borde', 'cl'], [-14, 74, undefined, 'c'], [0, 58], [14, 74, undefined, 'cl'], [14, 110, undefined, 'cl']], t, { qty: 1, fabric: 'contraste' });
  embroider(door, 'tabla', [[0, 62], [0, 110]], k, 'Pespunte de las tablas');
  const win = ellipsePiece('ventana', 'Ventana (fieltro)', 13, 13, 'borde', t, { qty: 1, fabric: 'contraste' });
  embroider(win, 'cruz-v', [[0, -13], [0, 13]], k, 'Bordar la cruz'); embroider(win, 'cruz-h', [[-13, 0], [13, 0]], k, '');
  const roofWin = ellipsePiece('ventana-tejado', 'Ventana del tejado (fieltro)', 10, 10, 'borde', t, { qty: 1, fabric: 'contraste' });
  embroider(roofWin, 'cruz-v', [[0, -10], [0, 10]], k, 'Bordar la cruz');
  const cap = (id: string, name: string, w: number, h: number) => plush(id, name, [[-w, 0, 'borde', 'c'], [-w * 0.78, -h * 0.72], [0, -h], [w * 0.78, -h * 0.72], [w, 0, undefined, 'cl']], t, { qty: 1, fabric: 'contraste' });
  const stem = (id: string, name: string, w: number, h: number) => plush(id, name, [[-w, 0, 'borde', 'cl'], [w, 0, undefined, 'c'], [w * 1.2, h * 0.8], [0, h], [-w * 1.2, h * 0.8]], t, { qty: 1 });
  const leafPiece = polyPiece('hoja', 'Hoja (fieltro verde)', leaf(0, 0, 46, 0, 18, 0.12).filter((_, i) => i % 2 === 0).map(q => [q.x, q.y] as [number, number]), 'borde', t, { qty: 3, fabric: 'contraste' });
  embroider(leafPiece, 'nervio', [[4, 0], [42, 0]], k, 'Bordar el nervio');
  const spot = ellipsePiece('lunar', 'Lunar de las setas (fieltro blanco)', 4, 4, 'borde', t, { qty: 6, fabric: 'contraste' });
  const pieces = [house, roof, door, win, roofWin, cap('seta-grande', 'Sombrero de la seta grande', 28, 26), stem('pie-grande', 'Pie de la seta grande', 9, 26), cap('seta-pequena', 'Sombrero de la seta pequeña', 18, 17), stem('pie-pequeno', 'Pie de la seta pequeña', 6, 18), leafPiece, spot];
  house.marks.push({ id: 'ventana', kind: 'cruz', at: P(32 * k, 44 * k), label: 'Ventana' });
  roof.marks.push({ id: 'ventana-tejado', kind: 'cruz', at: P(0, -42 * k), label: 'Ventana del tejado' });
  const colgante = str(p, 'colgante') === 'si';
  if (colgante) roof.marks.push({ id: 'colgante', kind: 'punto', at: P(0, -84 * k), label: 'Cinta para colgar (entre las dos capas)' });
  return {
    pieces,
    seams: [match('casa', 'Casa delantera con trasera (festón)', side(house, 'borde'), side(house, 'borde')), match('tejado', 'Tejado delantero con trasero (festón)', side(roof, 'borde'), side(roof, 'borde'))],
    notices: [exp('Casita de gnomos'), { level: 'aviso', code: 'juguete-seguridad', message: 'Es un adorno: piezas pequeñas de fieltro y cinta para colgar. Para menores de 3 años, borda los detalles y quita la cinta.' }, { level: 'ok', code: 'fieltro', message: 'Fieltro: se corta por la línea, sin margen, y se une con punto de festón por fuera.' }],
    checks: [{ key: 'alto', label: 'Alto de la casita (tejado y casa)', target: alto, measured: 200 * k, tolerance: 0.5 }],
    materials: [{ id: 'fieltro', label: 'Fieltro de lana: crema, rojo, marrón, verde y blanco', qty: '5 láminas de 20 × 30 cm' }, fiber(25 * k ** 3), ...(colgante ? [{ id: 'cinta', label: 'Cinta de raso para colgar (solo adorno)', qty: cm(220 * k) }] : []), { id: 'hilo', label: 'Hilo de bordar a juego', qty: '4 madejas' }],
    assumptions: ['Figura plana de fieltro, poco rellena, para colgar o decorar una habitación.'],
    steps: [
      { id: 'aplicar', title: 'Aplica los detalles', detail: 'Cose puerta y ventana sobre la casa delantera, la ventana pequeña sobre el tejado delantero y los lunares sobre las setas, con puntadas pequeñas. Borda tablas, cruces y nervios.', pieces: ['puerta', 'ventana', 'ventana-tejado', 'lunar', 'hoja'] },
      { id: 'casa', title: 'Casa y tejado', detail: 'Une cada casa con su pareja con festón rellenando poco; igual el tejado, metiendo la cinta arriba si la lleva. Cose el tejado sobre la casa.', pieces: ['casa', 'tejado'], seams: ['casa', 'tejado'] },
      { id: 'setas', title: 'Setas y hojas', detail: 'Cose las setas y las hojas al pie de la casa, solapándolas sobre la base.', pieces: ['seta-grande', 'pie-grande', 'seta-pequena', 'pie-pequeno', 'hoja'] }
    ]
  };
}
export const gnomeHouseGenerator: PatternGenerator = {
  id: 'fieltro-casa-gnomos', name: 'Casita de gnomos de fieltro', status: 'experimental',
  summary: 'Casita plana de fieltro con tejado ondulado, puerta, ventanas, setas y hojas; para colgar o decorar.',
  requiredMeasures: [], optionalMeasures: [], defaults: gnomeHouseDefaults, generate: generateGnomeHouse,
  params: [altoParam(120, 400), { key: 'colgante', label: 'Para colgar', group: 'diseno', type: 'choice', choices: [{ value: 'si', label: 'Con cinta para colgar' }, { value: 'no', label: 'Sin cinta' }] }]
};

export const TOY_GENERATORS_2: PatternGenerator[] = [flatGenerator, bear3dGenerator, sitBunnyGenerator, mushroomHouseGenerator, gnomeHouseGenerator];
