import { num, str, type GeneratorContext, type GeneratorResult, type Params, type ParamDef, type PatternGenerator } from '../generator';
import type { Issue, Piece, SeamRelation } from '../types';
import type { Pt } from '../../geom/vec';
import { P, cm, edge, equal, invalid, rectangle, solve } from './kidsShared';
import { bowPieces } from './kidsBlocks';
import { ellipsePiece, embroider, exp, insertion, match, notchAt, plush, runLength, side, sleepyEye, smile, turnCheck, type A, type ToyScale } from './toyKit';
import {
  CUSHION_BEADS, CUSHION_SLEEP, bandsOf, closureParam, cushionMargin, finishCushion, gussetParam, perimeterOf, perimeterOfRuns, pipingParam, polyRuns,
  readCommon, ruffle, sAtPoint, seamArea, stuffing, type CushionCommon
} from './cushionKit';
import { circle, ellipse, leaf, uni } from '../../applique/shapes';
import { offsetPolygons } from '../../geom/polyoffset';
import { seamPolygon } from '../outline';

/* Cojines (2026-11-08): 16 patrones de referencia de la usuaria revisados como
 * lo haría una patronista: se respetan las medidas que cuadran, se corrigen las
 * que no (piezas que faltan, cantidades imposibles, troncos mal trazados) y se
 * añade lo que una costurera necesita: margen, piquetes, abertura o cremallera,
 * vivo y fuelle opcionales, y costuras que se comprueban. Todo sale a tamaño
 * real para imprimir o proyectar. */

type Out = { pieces: Piece[]; seams: SeamRelation[]; notices: Issue[]; materials: { id: string; label: string; qty: string }[] };
const out0 = (what: string, extra: Issue[] = []): Out => ({ pieces: [], seams: [], notices: [exp(what), CUSHION_SLEEP, ...extra], materials: [] });
const sizeParam = (key: string, label: string, min: number, max: number): ParamDef => ({ key, label, group: 'diseno', type: 'length', min, max });
const choice = (key: string, label: string, opts: [string, string][], when?: ParamDef['when']): ParamDef => ({ key, label, group: 'diseno', type: 'choice', choices: opts.map(([value, l]) => ({ value, label: l })), ...(when ? { when } : {}) });
const commonParams = (o: { fuelle?: number; vivo?: boolean; cierre?: boolean } = {}): ParamDef[] => [
  ...(o.vivo === false ? [] : [pipingParam]), ...(o.fuelle ? [gussetParam(o.fuelle)] : []), ...(o.cierre === false ? [] : [closureParam]), cushionMargin];
const commonDefaults = { margen: 10, vivo: 'no', fuelle: 0, cierre: 'abertura' } as const;
const ROUND = (cx: number, cy: number, r: number): [number, number][] => Array.from({ length: 9 }, (_, i) => [cx + r * Math.sin((i * Math.PI) / 4), cy - r * Math.cos((i * Math.PI) / 4)] as [number, number]);
const arcPts = (cx: number, cy: number, r: number, from: number, to: number, step = 22.5): [number, number][] => {
  const n = Math.max(1, Math.round(Math.abs(to - from) / step)), pts: [number, number][] = [];
  for (let i = 1; i < n; i++) { const a = ((from + ((to - from) * i) / n) * Math.PI) / 180; pts.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]); }
  return pts;
};
const fabricMat = (label: string, qty = 'Según acomodo') => ({ id: 'tela', label, qty });
const thread = { id: 'hilo', label: 'Hilo de poliéster resistente y aguja para punto escondido', qty: '1 carrete' };
type Step = Omit<GeneratorResult['steps'][number], 'pieces'> & { pieces?: string[] };
function result(o: Out, extra: Pick<GeneratorResult, 'checks' | 'assumptions'> & { steps: Step[] }): GeneratorResult {
  return { pieces: o.pieces, seams: o.seams, notices: o.notices, materials: o.materials, ...extra, steps: extra.steps.map(s => ({ ...s, pieces: s.pieces ?? [] })) };
}
function setup(p: Params, maxGusset = 150): CushionCommon | GeneratorResult {
  const c = readCommon(p as Record<string, string | number>, maxGusset);
  return typeof c === 'string' ? invalid('cojin-margen', c) : c;
}
const isResult = (c: CushionCommon | GeneratorResult): c is GeneratorResult => 'pieces' in c;

// ================================================================== Pino al doblez (49 cm)
/** Half tree on the fold, from the reference: tiers 26, 34 and 42 cm wide, trunk 7 cm. */
const PINE: A[] = [[0, 0, 'contorno', 'cl'], [130, 115, undefined, 'cl'], [60, 151, undefined, 'cl'], [170, 244, undefined, 'cl'], [79, 302, undefined, 'cl'], [210, 385, 'bajo', 'cl'], [35, 458, 'tronco', 'cl'], [35, 490, 'base', 'cl'], [0, 490, 'doblez', 'cl']];
export function pineDefaults(): Params { return { alto: 490, ...commonDefaults }; }
export function generatePine(ctx: GeneratorContext, params: Params): GeneratorResult {
  void ctx;
  const p = { ...pineDefaults(), ...params }, alto = num(p, 'alto'), c = setup(p, 100);
  if (isResult(c)) return c;
  if (!(alto >= 250 && alto <= 900)) return invalid('pino-medidas', 'El alto va de 25 a 90 cm.');
  const k = alto / 490, t: ToyScale = { k, sa: c.sa, felt: false }, o = out0('Cojín pino');
  const tree = plush('arbol', 'Pino (delantero y trasero, al doblez)', PINE, t, { qty: 2, fold: 'doblez', onFold: true, labels: { contorno: 'Contorno: piquetea cada entrada hasta 2 mm de la costura', bajo: 'Último piso', tronco: 'Tronco', base: 'Base del tronco', doblez: 'Doblez: centro del árbol' } });
  o.pieces.push(tree);
  finishCushion(perimeterOf(tree), c, o, { open: { piece: tree, run: 'bajo', at: 0.45 } });
  o.notices.push({ level: 'ok', code: 'pino-referencia', message: `Medidas de la referencia escaladas: ${cm(490 * k)} de alto, pisos de ${cm(260 * k)}, ${cm(340 * k)} y ${cm(420 * k)} de ancho y tronco de ${cm(70 * k)}.` });
  o.materials.push(fabricMat('Terciopelo, lino o pana fina', `${cm(450 * k + 40)} × ${cm(1000 * k + 40)}`), stuffing(seamArea(tree), c.fuelle), thread);
  return result(o, {
    checks: [{ key: 'alto', label: 'Alto del pino', target: alto, measured: 490 * k, tolerance: 0.5 }],
    assumptions: ['El tronco del dibujo de referencia es una punta mal trazada; se interpreta como un tronco de 7 cm de ancho, como en la foto.', 'Las puntas van en ángulo: corta el margen en diagonal en cada punta y piquetea cada entrada antes de voltear.'],
    steps: [
      { id: 'cortar', title: 'Corta', detail: 'Dobla la tela, apoya el doblez del patrón en el doblez de la tela y corta dos árboles (delantero y trasero). Marca los piquetes.', pieces: ['arbol'] },
      { id: 'coser', title: 'Cose', detail: `${c.vivo ? 'Hilvana el vivo alrededor del delantero. ' : ''}Cose delantero con trasero derecho con derecho dejando la abertura del último piso${c.fuelle ? ' (o cose primero el fuelle)' : ''}. Corta las puntas y piquetea las entradas.`, pieces: ['arbol'] },
      { id: 'rellenar', title: 'Voltea y rellena', detail: 'Voltea, saca bien las puntas con un palillo romo, rellena empezando por las puntas y cierra a punto escondido.' }
    ]
  });
}

// ================================================================== Hipocampo de cuerpo largo
const SEAHORSE: A[] = [
  [282, 70, 'contorno'], [318, 118], [420, 128], [470, 132, undefined, 'c'], [478, 160], [468, 188, undefined, 'c'], [390, 192], [336, 222], [318, 274], [352, 344], [398, 432], [394, 522], [352, 602],
  [300, 680], [226, 742], [150, 772], [80, 756], [38, 706], [34, 646], [52, 600], [82, 574], [114, 584], [120, 612], [100, 640], [106, 682], [148, 704], [204, 690], [238, 650],
  [244, 590, 'espalda'], [232, 520], [212, 440], [196, 360], [180, 302, 'cresta', 'c'], [134, 274], [172, 246, undefined, 'c'], [128, 212], [170, 190, undefined, 'c'], [140, 146], [184, 128, undefined, 'c'], [168, 80], [206, 84, undefined, 'c'], [222, 30, 'contorno']
];
export function seahorseDefaults(): Params { return { alto: 800, aleta: 'si', compartimentos: 'si', ...commonDefaults }; }
export function generateSeahorse(ctx: GeneratorContext, params: Params): GeneratorResult {
  void ctx;
  const p = { ...seahorseDefaults(), ...params }, alto = num(p, 'alto'), c = setup(p, 0);
  if (isResult(c)) return c;
  if (!(alto >= 450 && alto <= 1100)) return invalid('hipocampo-medidas', 'El alto va de 45 a 110 cm.');
  const k = alto / 800, t: ToyScale = { k, sa: c.sa, felt: false }, o = out0('Cojín hipocampo');
  const body = plush('cuerpo', 'Cuerpo (par en espejo: derecho e izquierdo)', SEAHORSE, t, { qty: 2, mirrorPairs: true, labels: { cresta: 'Cresta: piquetea entre las puntas', espalda: 'Espalda' } });
  embroider(body, 'ojo', sleepyEye(262, 150, 38), k, 'Bordar el ojo dormido (en las dos piezas)');
  for (const [i, [x, y]] of [[330, 420], [300, 486], [356, 500], [292, 560], [340, 566]].entries()) body.marks.push({ id: `lunar-${i}`, kind: 'punto', at: P(x * k, y * k), label: i ? undefined : 'Lunares bordados (opcional)' });
  if (str(p, 'compartimentos') === 'si') for (const [i, [a, b]] of [[[216, 352], [338, 352]], [[240, 520], [378, 520]]].entries()) body.lines.push({ id: `compartimento-${i}`, kind: 'referencia', a: P(a[0] * k, a[1] * k), b: P(b[0] * k, b[1] * k), label: 'Pespunte de compartimento: cóselo cuando la parte de arriba esté rellena' });
  o.pieces.push(body);
  if (str(p, 'aleta') === 'si') {
    const fin = plush('aleta', 'Aleta (par en espejo)', [[0, 0, 'union', 'cl'], [110, 0, 'contorno', 'c'], [100, -34], [58, -76], [0, -100], [-32, -92], [-24, -42]], t, { qty: 2, mirrorPairs: true, fabric: 'contraste' });
    o.pieces.push(fin);
    const L = runLength(body, 'espalda');
    insertion(body, 'espalda', sAtPoint(body, 'espalda', P(212 * k, 440 * k)) / L, 110 * k, 'Aleta', 'aleta');
  }
  finishCushion(perimeterOf(body), c, o, { open: { piece: body, run: 'espalda', at: 0.18 } });
  turnCheck([['cola', 62 * k], ['hocico', 56 * k], ['cresta', 34 * k]], o.notices);
  o.materials.push(fabricMat('Punto de algodón grueso, minky o felpa (estira poco)'), { id: 'contraste', label: 'Retal de contraste para la aleta', qty: 'Retal' }, stuffing(seamArea(body), 60), thread);
  return result(o, {
    checks: [{ key: 'alto', label: 'Alto del hipocampo', target: alto, measured: 772 * k, tolerance: 0.04 * alto }],
    assumptions: ['La referencia está hecha con IA (rótulos sin sentido); se rediseña la silueta con la cola en gancho y la cresta de puntas redondeadas para que se pueda voltear.', 'Las líneas de compartimento del dibujo se convierten en pespuntes opcionales para que el relleno no baje.'],
    steps: [
      { id: 'bordar', title: 'Borda', detail: 'Borda el ojo dormido en las dos piezas (una es el espejo de la otra) y los lunares si los quieres.', pieces: ['cuerpo'] },
      { id: 'aleta', title: 'Aleta', detail: 'Cose las dos piezas de la aleta dejando abierta la unión, voltea, pespuntea las rayas y rellena poco.', pieces: ['aleta'] },
      { id: 'cuerpo', title: 'Cuerpo', detail: 'Hilvana la aleta en la espalda entre los piquetes. Cose las dos piezas alrededor dejando la abertura de la espalda. Piquetea la cresta, el hocico y la curva de la cola.', pieces: ['cuerpo'] },
      { id: 'rellenar', title: 'Rellena por partes', detail: 'Rellena primero la cabeza y cose el primer compartimento con un pespunte; sigue con el cuerpo y la cola. Cierra a punto escondido.' }
    ]
  });
}

// ================================================================== Cojín de lactancia en U (70 × 52 cm, brazo 22 cm)
function nursingAnchors(W: number, H: number, b: number): A[] {
  const R = W / 2, r = R - b, yS = H - R;
  return [
    [0, 0, 'extremo', 'cl'], [b, 0, 'interior', 'cl'], [b, yS], ...arcPts(R, yS, r, 180, 0).map(([x, y]) => [x, y] as A), [W - b, yS, undefined, 'l'],
    [W - b, 0, 'extremo', 'cl'], [W, 0, 'exterior', 'cl'], [W, yS], ...arcPts(R, yS, R, 0, 180).map(([x, y]) => [x, y] as A), [0, yS, undefined, 'l']
  ];
}
export function nursingDefaults(): Params { return { ancho: 700, alto: 520, brazo: 220, ...commonDefaults, cierre: 'cremallera' }; }
export function generateNursing(ctx: GeneratorContext, params: Params): GeneratorResult {
  void ctx;
  const p = { ...nursingDefaults(), ...params }, W = num(p, 'ancho'), H = num(p, 'alto'), b = num(p, 'brazo'), c = setup(p, 120);
  if (isResult(c)) return c;
  if (!(W >= 500 && W <= 900 && H >= W / 2 + 20 && H <= 750 && b >= 150 && b <= W / 2 - 60)) return invalid('lactancia-medidas', 'Revisa las medidas: ancho de 50 a 90 cm, alto mayor que medio ancho y brazo de 15 cm hasta dejar al menos 12 cm de hueco.');
  const t: ToyScale = { k: 1, sa: c.sa, felt: false }, o = out0('Cojín de lactancia');
  const face = plush('cojin', 'Cojín en U (delantero y trasero)', nursingAnchors(W, H, b), t, { qty: 2, labels: { extremo: 'Extremo del brazo', interior: 'Curva interior (cintura)', exterior: 'Curva exterior' } });
  o.pieces.push(face);
  finishCushion(perimeterOf(face), c, o, { open: { piece: face, run: 'exterior', at: 0.5 }, zipMax: 600 });
  o.notices.push({ level: 'ok', code: 'lactancia-referencia', message: `${cm(W)} de ancho, ${cm(H)} de alto y brazos de ${cm(b)}: el hueco para tu cintura mide ${cm(W - 2 * b)} de ancho y ${cm(H - b)} de fondo.` });
  o.materials.push(fabricMat('Algodón, muselina o punto (funda) y forro de algodón (cojín interior)'), stuffing(seamArea(face) * 1.4, c.fuelle), thread);
  return result(o, {
    checks: [{ key: 'ancho', label: 'Ancho total', target: W, measured: W, tolerance: 0.5 }, { key: 'alto', label: 'Alto total', target: H, measured: H, tolerance: 0.5 }],
    assumptions: ['Medidas de la referencia: 70 × 52 cm con brazos de 22 cm. Las curvas son concéntricas: exterior de radio 35 cm e interior de 13 cm.', c.zip ? 'Con cremallera: corta el mismo patrón dos veces más en tela de forro para el cojín interior.' : 'Cojín cerrado: rellénalo firme para que no se aplaste al dar de comer.'],
    steps: [
      { id: 'cortar', title: 'Corta', detail: `Corta delantero y trasero${c.zip ? ' en la tela de la funda y otros dos en forro para el cojín interior' : ''}. Marca los piquetes de la ${c.zip ? 'cremallera' : 'abertura'}.`, pieces: ['cojin'] },
      { id: 'coser', title: 'Cose', detail: `${c.zip ? 'Pon la cremallera invisible entre los piquetes de la curva exterior. ' : ''}${c.fuelle ? 'Cose el fuelle al delantero y luego al trasero. ' : 'Cose delantero con trasero alrededor. '}Piquetea la curva interior cada 2 cm.`, pieces: ['cojin'] },
      { id: 'rellenar', title: 'Rellena', detail: 'Rellena firme, sobre todo los brazos. No dejes al bebé dormido sobre el cojín.' }
    ]
  });
}

// ================================================================== Puf conejo (60 × 40 × 30 cm)
export function bunnyPoufDefaults(): Params { return { largo: 600, ancho: 400, alto: 300, ...commonDefaults, cierre: 'cremallera' }; }
export function generateBunnyPouf(ctx: GeneratorContext, params: Params): GeneratorResult {
  void ctx;
  const p = { ...bunnyPoufDefaults(), ...params }, L = num(p, 'largo'), W = num(p, 'ancho'), H = num(p, 'alto'), c = setup(p, 0);
  if (isResult(c)) return c;
  if (!(L >= 400 && L <= 1000 && W >= 300 && W <= 700 && H >= W / 2 + 40 && H <= 700)) return invalid('puf-medidas', 'Largo de 40 a 100 cm, ancho de 30 a 70 cm y alto al menos medio ancho más 4 cm.');
  const R = W / 2, t: ToyScale = { k: 1, sa: c.sa, felt: false }, o = out0('Puf conejo', [CUSHION_BEADS]);
  const end = plush('testero', 'Testero en arco (delantero y trasero)', [[0, H, 'arco', 'cl'], [0, R], ...arcPts(R, R, R, 180, 360).map(([x, y]) => [x, y] as A), [W, R, undefined, 'cl'], [W, H, 'base', 'cl']], t, { qty: 2, labels: { arco: 'Arco: lados y techo', base: 'Base' } });
  const arch = runLength(end, 'arco');
  const wrap = rectangle('envolvente', 'Envolvente: lados y techo (una pieza)', L, arch, [edge('lado', 'Une con la base', 'costura', c.sa), edge('arco', 'Une con el arco del testero delantero', 'costura', c.sa), edge('lado-b', 'Une con la base', 'costura', c.sa), edge('arco-b', 'Une con el arco del testero trasero', 'costura', c.sa)], { qty: 1 }, true);
  o.pieces.push(end, wrap);
  o.seams.push(match('arco', 'Envolvente con el testero delantero', side(wrap, 'arco'), side(end, 'arco')), match('arco-b', 'Envolvente con el testero trasero', side(wrap, 'arco-b'), side(end, 'arco')));
  if (c.zip) {
    const half = rectangle('base', 'Base (2 mitades, cremallera en el centro)', L, R, [edge('lado', 'Une con la envolvente', 'costura', c.sa), edge('extremo', 'Une con la base del testero', 'costura', c.sa), edge('cremallera', 'Cremallera', 'costura', 20), edge('extremo-b', 'Une con la base del otro testero', 'costura', c.sa)], { qty: 2, fabric: 'principal' }, true);
    o.pieces.push(half);
    o.seams.push(match('base-lado', 'Base con la envolvente', side(half, 'lado'), side(wrap, 'lado')), equal('base-testero', 'Base de las dos mitades con la base del testero', [side(half, 'extremo', 2)], [side(end, 'base')], 0.6));
    o.materials.push({ id: 'cremallera', label: `Cremallera normal de ${cm(Math.max(300, L - 100))}`, qty: '1' });
  } else {
    const baseP = rectangle('base', 'Base', L, W, [edge('lado', 'Une con la envolvente', 'costura', c.sa), edge('extremo', 'Une con el testero', 'costura', c.sa), edge('lado-b', 'Une con la envolvente', 'costura', c.sa), edge('extremo-b', 'Une con el otro testero', 'costura', c.sa)], { qty: 1 }, true);
    notchAt(baseP, 'lado-b', L * 0.3, 'Abertura para rellenar: se cierra a punto escondido', 'abertura-a'); notchAt(baseP, 'lado-b', L * 0.7, 'Fin de la abertura', 'abertura-b');
    o.pieces.push(baseP);
    o.seams.push(match('base-lado', 'Base con la envolvente', side(baseP, 'lado'), side(wrap, 'lado')), match('base-testero', 'Base con el testero', side(baseP, 'extremo'), side(end, 'base')));
  }
  // Ears stand on the front arch, the same distance either side of the top.
  const earW = 150 * W / 400, earH = 200 * W / 400, mid = arch / 2;
  const ear = plush('oreja', 'Oreja (2 de tela y 2 de contraste)', [[earW, earH, 'union', 'cl'], [0, earH, 'contorno', 'c'], [-earW * 0.03, earH * 0.45], [earW * 0.2, earH * 0.06], [earW / 2, 0], [earW * 0.8, earH * 0.06], [earW * 1.03, earH * 0.45]], t, { qty: 4 });
  for (const [i, s] of [mid - earW - 30, mid + 30].entries()) { notchAt(end, 'arco', s, 'Oreja (solo en el testero delantero)', `oreja-${i}-a`); notchAt(end, 'arco', s + earW, 'Oreja', `oreja-${i}-b`); }
  const tail = ellipsePiece('cola', 'Cola: círculo fruncido y relleno (o un pompón de lana)', 70, 70, 'borde', t, { qty: 1, fabric: 'contraste', raw: ['borde'], labels: { borde: 'Hilván fruncido a 5 mm del borde' } });
  o.pieces.push(ear, tail);
  if (c.vivo) finishCushion(perimeterOfRuns([[end, 'arco'], [end, 'base']], 2), { ...c, fuelle: 0 }, o, { name: 'testeros' });
  o.notices.push({ level: 'ok', code: 'puf-referencia', message: `Arco de ${cm(W)} con lados rectos de ${cm(H - R)}: la envolvente mide ${cm(arch)} (en la referencia 26 + 30 + 26 cm ≈ 83 cm para 40 × 30).` });
  o.materials.push(fabricMat('Loneta, pana gruesa o terciopelo de tapicería'), { id: 'entretela', label: 'Entretela gruesa o espuma de 3 mm para que las orejas se mantengan de pie', qty: `${cm(earW * 2.4)} × ${cm(earH + 30)}` },
    { id: 'relleno', label: `Bloque de espuma de ${cm(W)} × ${cm(L)} × ${cm(H - R)} con fibra encima, o bolitas en funda interior`, qty: '1' }, thread);
  return result(o, {
    checks: [{ key: 'largo', label: 'Largo', target: L, measured: L, tolerance: 0.5 }, { key: 'alto', label: 'Alto', target: H, measured: (H - R) + R, tolerance: 0.5 }],
    assumptions: ['La referencia mide 60 × 40 × 30 cm: testero en arco de 40 cm de ancho con lados de 10 cm, envolvente de 60 × 83 cm y base de 60 × 40 cm.', 'Las orejas se entretelan para que se sostengan.'],
    steps: [
      { id: 'orejas', title: 'Orejas', detail: 'Plancha entretela en las orejas de tela. Cose cada una con su contraste dejando abierta la base, voltea y haz un pliegue en la base.', pieces: ['oreja'] },
      { id: 'cuerpo', title: 'Cuerpo', detail: `Hilvana las orejas en el arco del testero delantero entre sus piquetes${c.vivo ? ' y el vivo alrededor de los testeros' : ''}. Cose la envolvente a la base${c.zip ? ' (pon antes la cremallera entre las dos mitades)' : ''} y luego los testeros, repartiendo con los piquetes.`, pieces: ['testero', 'envolvente', 'base'] },
      { id: 'cola', title: 'Cola y relleno', detail: 'Frunce la cola alrededor de un puñado de relleno y cósela al testero trasero. Mete la espuma o la funda interior con bolitas.', pieces: ['cola'] }
    ]
  });
}

// ================================================================== Puf pera con orejas de conejo
const BAND = (h: number): A[] => [[-140, 0, 'doblez', 'cl'], [140, 0, 'lado', 'c'], [96, 60 * h / 340], [70, 100 * h / 340], [52, 200 * h / 340], [40, h, 'bajo', 'cl'], [-40, h, 'lado-b', 'c'], [-52, 200 * h / 340], [-70, 100 * h / 340], [-96, 60 * h / 340]];
const TEAR = (h: number): A[] => {
  const y = (v: number) => (v * h) / 340;
  return [[0, 0, 'lado', 'c'], [40, y(40)], [70, y(100)], [96, y(180)], [100, y(230)], [90, y(290)], [72, y(316), 'base', 'c'], [0, y(340)], [-72, y(316), 'lado-b', 'c'], [-90, y(290)], [-100, y(230)], [-96, y(180)], [-70, y(100)], [-40, y(40)]];
};
export function bunnyBeanDefaults(): Params { return { alto: 700, ...commonDefaults, cierre: 'cremallera' }; }
export function generateBunnyBean(ctx: GeneratorContext, params: Params): GeneratorResult {
  void ctx;
  const p = { ...bunnyBeanDefaults(), ...params }, alto = num(p, 'alto'), c = setup(p, 0);
  if (isResult(c)) return c;
  if (!(alto >= 340 && alto <= 1000)) return invalid('puf-pera-medidas', 'El alto va de 34 a 100 cm.');
  const k = alto / 340, t: ToyScale = { k, sa: c.sa, felt: false }, o = out0('Puf pera con orejas', [CUSHION_BEADS]);
  const band = plush('banda', 'Banda: lados y techo (al doblez de arriba)', BAND(340), t, { qty: 1, fold: 'doblez', onFold: true, labels: { doblez: 'Doblez: techo del puf', lado: 'Une con el frente en gota', 'lado-b': 'Une con la espalda en gota', bajo: 'Bajo: une con la base' } });
  // The side teardrop is solved in height so each half measures what the band edge measures.
  const target = runLength(band, 'lado');
  const tearOf = (h: number) => plush('gota', 'Frente y espalda en gota (2)', TEAR(h), t, { qty: 2, labels: { lado: 'Une con la banda (lado derecho)', 'lado-b': 'Une con la banda (lado izquierdo)', base: 'Une con la base' } });
  const tear = tearOf(solve(h => runLength(tearOf(h), 'lado'), target, 150, 700));
  const baseLen = 2 * runLength(band, 'bajo') + 2 * runLength(tear, 'base');
  const r = solve(x => 2 * Math.PI * x, baseLen, 10, 1e4) / k;
  const basePiece = c.zip
    ? plush('base', 'Base: medio círculo (2, cremallera en el centro)', [[-r, 0, 'cremallera', 'cl'], [r, 0, 'contorno', 'c'], ...arcPts(0, 0, r, 0, 180, 15).map(([x, y]) => [x, y] as A)], t, { qty: 2, labels: { cremallera: 'Cremallera (margen de 2 cm)' } })
    : plush('base', 'Base (círculo)', arcPts(0, 0, r, -90, 270, 15).map(([x, y], i) => [x, y, i ? undefined : 'contorno'] as A), t, { qty: 1 });
  if (c.zip) basePiece.edges.filter(e => e.id === 'cremallera').forEach(e => { e.allowance = 20; });
  o.pieces.push(band, tear, basePiece);
  const baseRun = c.zip ? side(basePiece, 'contorno', 2) : side(basePiece, 'contorno');
  o.seams.push(match('banda-derecha', 'Gota con la banda (lado derecho)', side(tear, 'lado'), side(band, 'lado')), match('banda-izquierda', 'Gota con la banda (lado izquierdo)', side(tear, 'lado-b'), side(band, 'lado-b')),
    equal('base', 'Base con el bajo de la banda y de las gotas', [baseRun], [side(band, 'bajo', 2), side(tear, 'base', 2)], 1));
  const earW = 70, earH = 220;
  const ear = plush('oreja', 'Oreja (2 de tela y 2 de contraste)', [[earW, earH, 'union', 'cl'], [0, earH, 'contorno', 'c'], [-12, earH * 0.5], [6, earH * 0.12], [earW / 2, 0], [earW - 6, earH * 0.12], [earW + 12, earH * 0.5]], t, { qty: 4 });
  insertion(tear, 'lado', 0.16, earW * k, 'Oreja derecha (solo en el frente)', 'oreja-d'); insertion(tear, 'lado-b', 0.84, earW * k, 'Oreja izquierda (solo en el frente)', 'oreja-i');
  o.pieces.push(ear);
  if (c.zip) o.materials.push({ id: 'cremallera', label: `Cremallera con tope de ${cm(Math.round(1.6 * r * k / 50) * 50)}`, qty: '1' });
  if (c.vivo) finishCushion(perimeterOfRuns([[tear, 'lado'], [tear, 'lado-b']], 2), { ...c, fuelle: 0 }, o, { name: 'frente y espalda' });
  turnCheck([['orejas', earW * k]], o.notices);
  o.notices.push({ level: 'ok', code: 'puf-pera', message: `La gota del frente y la espalda se ajusta a ${cm(tear.nodes.reduce((m, n) => Math.max(m, n.y), 0))} de alto para medir lo mismo que la banda; la base sale de ${cm(2 * r * k)} de diámetro.` });
  o.materials.push(fabricMat('Pana, borreguito o loneta'), { id: 'entretela', label: 'Entretela gruesa para las orejas', qty: 'Retal' }, { id: 'relleno', label: 'Bolitas de poliestireno en una funda interior cerrada (mismo patrón en forro)', qty: `unos ${Math.round(0.08 * k ** 3 * 10) / 10 * 100} l` }, thread);
  return result(o, {
    checks: [{ key: 'alto', label: 'Alto del costado', target: alto, measured: tear.nodes.reduce((m, n) => Math.max(m, n.y), 0), tolerance: 0.12 * alto }],
    assumptions: ['La referencia (rusa) está dibujada a 34 cm: gota de 20 cm de ancho (frente y espalda), banda de lados y techo al doblez de 28 cm arriba y 8 cm abajo, y base de 23 cm. Aquí se escala y se recalculan la gota y la base para que todo cierre.', 'Las bolitas van siempre en una funda interior cerrada.'],
    steps: [
      { id: 'orejas', title: 'Orejas', detail: 'Entretela, cose cada oreja con su contraste, voltea y pliega la base.', pieces: ['oreja'] },
      { id: 'gotas', title: 'Frente y espalda', detail: 'Hilvana las orejas en la gota del frente, a los lados de la punta. Cose la banda alrededor de la gota del frente desde la base derecha, por arriba, hasta la base izquierda, y luego la espalda.', pieces: ['banda', 'gota'], seams: ['banda-derecha', 'banda-izquierda'] },
      { id: 'base', title: 'Base', detail: `${c.zip ? 'Une las dos mitades de la base con la cremallera. ' : ''}Cose la base repartiendo con los piquetes. Mete la funda interior con las bolitas.`, pieces: ['base'], seams: ['base'] }
    ]
  });
}

// ================================================================== Sillón cojín plegable (módulos de 30 cm)
export function loungerDefaults(): Params { return { lado: 300, ...commonDefaults }; }
export function generateLounger(ctx: GeneratorContext, params: Params): GeneratorResult {
  void ctx;
  const p = { ...loungerDefaults(), ...params }, l = num(p, 'lado'), c = setup(p, 150);
  if (isResult(c)) return c;
  if (!(l >= 250 && l <= 700)) return invalid('sillon-medidas', 'El lado del módulo va de 25 a 70 cm.');
  const h = l / 2, t: ToyScale = { k: 1, sa: c.sa, felt: false }, o = out0('Sillón cojín plegable');
  const sq = rectangle('cuadrado', 'Cojín cuadrado: asiento y respaldo (2 cojines × 2 caras)', l, l, [edge('arriba', 'Lado', 'costura', c.sa), edge('derecha', 'Lado', 'costura', c.sa), edge('abajo', 'Lado (abertura)', 'costura', c.sa), edge('izquierda', 'Lado', 'costura', c.sa)], { qty: 4 });
  const head = rectangle('cabecero', 'Cabecero (1 cojín × 2 caras)', l, h, [edge('arriba', 'Lado largo', 'costura', c.sa), edge('derecha', 'Lado corto', 'costura', c.sa), edge('abajo', 'Lado largo (abertura)', 'costura', c.sa), edge('izquierda', 'Lado corto', 'costura', c.sa)], { qty: 2 }, true);
  const arm = plush('brazo', 'Brazo en triángulo (2 cuñas × 2 caras, en espejo)', [[l, 0, 'alto', 'cl'], [l, h, 'base', 'cl'], [0, h, 'diagonal', 'cl']], t, { qty: 4, mirrorPairs: true, labels: { alto: 'Lado corto', base: 'Base (abertura)', diagonal: 'Diagonal' } });
  o.pieces.push(sq, head, arm);
  finishCushion(perimeterOf(sq, 2), c, o, { open: { piece: sq, run: 'abajo' }, prefix: 'cuadrado-', name: 'cojines cuadrados' });
  finishCushion(perimeterOf(head), c, o, { open: { piece: head, run: 'abajo' }, prefix: 'cabecero-', name: 'cabecero' });
  finishCushion(perimeterOf(arm, 2), c, o, { open: { piece: arm, run: 'base' }, prefix: 'brazo-', name: 'brazos' });
  const hinge = rectangle('bisagra', 'Bisagra que une dos cojines (doblar a lo largo)', l, 100, [edge('canto', 'Canto', 'costura', c.sa), edge('extremo', 'Extremo', 'costura', c.sa), edge('canto-b', 'Canto', 'costura', c.sa), edge('extremo-b', 'Extremo', 'costura', c.sa)], { qty: 4 }, true);
  hinge.lines.push({ id: 'doblez', kind: 'doblez', a: P(0, 50), b: P(l, 50), label: 'Doblar a lo largo' });
  o.pieces.push(hinge);
  o.notices.push({ level: 'ok', code: 'sillon-referencia', message: `Módulo de ${cm(l)}: cuadrados de ${cm(l)}, cabecero de ${cm(l)} × ${cm(h)} y triángulos de ${cm(l)} × ${cm(h)} con diagonal de ${cm(Math.hypot(l, h))} (la referencia dice 33,5 cm para 30 × 15: cuadra).` });
  if (!c.fuelle) o.notices.push({ level: 'aviso', code: 'sillon-fuelle', message: 'Sin fuelle salen cojines planos como en la referencia; para el grosor de la foto pon un fuelle de 8 a 10 cm.' });
  o.materials.push(fabricMat('Algodón de vichy, loneta o lona'), stuffing(2 * l * l * 2 + l * h + l * h, c.fuelle), thread);
  return result(o, {
    checks: [{ key: 'lado', label: 'Lado del módulo', target: l, measured: l, tolerance: 0.5 }],
    assumptions: ['Piezas de la referencia: 4 cuadrados de 30 × 30, 2 rectángulos de 30 × 15 y 4 triángulos de 30 × 15. Se añaden fuelle opcional y bisagras para que se doble como en la foto.'],
    steps: [
      { id: 'cojines', title: 'Cose los cojines', detail: `Cose cada pareja de caras${c.fuelle ? ' con su fuelle' : ''} dejando la abertura marcada. Voltea y rellena: los cuadrados y el cabecero firmes, los brazos muy firmes.`, pieces: ['cuadrado', 'cabecero', 'brazo'] },
      { id: 'unir', title: 'Une con bisagras', detail: 'Dobla cada bisagra, cóselas a mano entre cabecero y respaldo, respaldo y asiento, y entre cada brazo y el respaldo, para que se plieguen.', pieces: ['bisagra'] }
    ]
  });
}

// ================================================================== Pato redondo
const egg = (H: number, W: number): A[] => Array.from({ length: 16 }, (_, i) => {
  const th = (i / 16) * 2 * Math.PI, f = 1 - 0.1 * Math.cos(th);
  return [(W / 2) * Math.sin(th) * f, (H / 2) * (1 - Math.cos(th)), i ? undefined : 'contorno'] as A;
});
export function duckDefaults(): Params { return { alto: 400, ...commonDefaults, fuelle: 100 }; }
export function generateDuck(ctx: GeneratorContext, params: Params): GeneratorResult {
  void ctx;
  const p = { ...duckDefaults(), ...params }, alto = num(p, 'alto'), c = setup(p, 200);
  if (isResult(c)) return c;
  if (!(alto >= 250 && alto <= 700)) return invalid('pato-medidas', 'El alto va de 25 a 70 cm.');
  const k = alto / 400, t: ToyScale = { k, sa: c.sa, felt: false }, small: ToyScale = { ...t, sa: Math.min(c.sa, 6) }, o = out0('Cojín pato');
  const body = plush('cuerpo', 'Cuerpo: huevo (delantero y trasero)', egg(400, 336), t, { qty: 2 });
  embroider(body, 'ojo-i', ROUND(-58, 120, 9), k, 'Bordar ojos rellenos (solo delante)'); embroider(body, 'ojo-d', ROUND(58, 120, 9), k, '');
  body.marks.push({ id: 'pico', kind: 'cruz', at: P(0, 160 * k), label: 'Centro del pico (solo delante)' });
  const L = runLength(body, 'contorno'), at = (deg: number) => sAtPoint(body, 'contorno', P(168 * k * Math.sin(deg * Math.PI / 180), 200 * k * (1 - Math.cos(deg * Math.PI / 180))));
  for (const [id, deg] of [['ala-d', 90], ['ala-i', 270]] as const) { const s = at(deg); notchAt(body, 'contorno', s - 30 * k, 'Ala', `${id}-a`); notchAt(body, 'contorno', s + 30 * k, 'Ala', `${id}-b`); }
  for (const [id, deg] of [['pata-d', 157.5], ['pata-i', 202.5]] as const) { const s = at(deg); notchAt(body, 'contorno', s - 13 * k, 'Pata', `${id}-a`); notchAt(body, 'contorno', s + 13 * k, 'Pata', `${id}-b`); }
  const wing = plush('ala', 'Ala (2 pares en espejo)', [[0, 0, 'union', 'cl'], [60, 0, 'contorno', 'c'], [96, 30], [104, 90], [80, 140], [40, 150], [8, 120], [-6, 60]], t, { qty: 4, mirrorPairs: true });
  const leg = plush('pata', 'Pata con pie palmeado (2 pares en espejo)', [[0, 0, 'union', 'cl'], [26, 0, 'contorno', 'c'], [27, 140], [56, 166], [68, 206], [34, 222], [-8, 222], [-42, 206], [-30, 166], [-1, 140]], small, { qty: 4, mirrorPairs: true, fabric: 'contraste' });
  embroider(leg, 'dedo-1', [[13, 170], [24, 206]], k, 'Pespunte de los dedos'); embroider(leg, 'dedo-2', [[13, 170], [2, 206]], k, '');
  const beakUp = plush('pico-arriba', 'Pico de arriba (2)', [[0, 0, 'union', 'cl'], [92, 0, 'contorno', 'c'], [86, 24], [46, 34], [6, 24]], small, { qty: 2, fabric: 'contraste' });
  const beakDown = plush('pico-abajo', 'Pico de abajo (2)', [[0, 0, 'union', 'cl'], [70, 0, 'contorno', 'c'], [58, 22], [35, 28], [12, 22]], small, { qty: 2, fabric: 'contraste' });
  o.pieces.push(body, wing, leg, beakUp, beakDown);
  finishCushion(perimeterOf(body), c, o, { open: { piece: body, run: 'contorno', at: at(120) / L } });
  turnCheck([['patas', 26 * k], ['pico', 28 * k]], o.notices);
  o.notices.push({ level: 'ok', code: 'pato-referencia', message: 'La referencia pide cortar 2 cuerpos delanteros y 2 traseros iguales: con piezas enteras solo puede ser exterior y forro. Aquí el cuerpo es delantero y trasero con un fuelle para el volumen de la foto (pon 0 para hacerlo plano).' });
  o.materials.push(fabricMat('Minky, felpa o borreguito suave'), { id: 'contraste', label: 'Minky naranja para pico y patas', qty: 'Retales' }, stuffing(seamArea(body), c.fuelle), thread);
  return result(o, {
    checks: [{ key: 'alto', label: 'Alto del cuerpo', target: alto, measured: 400 * k, tolerance: 0.5 }],
    assumptions: ['Pico y alas se rellenan poco; las patas llevan el pie palmeado pespunteado.'],
    steps: [
      { id: 'piezas', title: 'Alas, patas y pico', detail: 'Cose cada par dejando abierta la unión, piquetea, voltea y rellena poco. Pespuntea los dedos de las patas. Cose el pico de arriba sobre el de abajo.', pieces: ['ala', 'pata', 'pico-arriba', 'pico-abajo'] },
      { id: 'cara', title: 'Cara', detail: 'Borda los ojos y cose el pico a punto escondido en la marca del delantero.', pieces: ['cuerpo'] },
      { id: 'cuerpo', title: 'Cuerpo', detail: `Hilvana alas y patas hacia dentro entre sus piquetes. ${c.fuelle ? 'Cose el fuelle al delantero y al trasero' : 'Cose delantero con trasero'} dejando la abertura, voltea, rellena y cierra.`, pieces: ['cuerpo'] }
    ]
  });
}

// ================================================================== Árbol de Navidad con estrella y patas
const TREE_BODY: A[] = [[-14, 0, 'estrella', 'cl'], [14, 0, 'contorno', 'c'], [44, 40], [78, 88], [62, 106, undefined, 'c'], [104, 160], [88, 182, undefined, 'c'], [132, 252], [138, 300], [110, 338], [50, 352, 'base', 'c'], [-50, 352, 'contorno', 'c'], [-110, 338], [-138, 300], [-132, 252], [-88, 182, undefined, 'c'], [-104, 160], [-62, 106, undefined, 'c'], [-78, 88], [-44, 40]];
function starAnchors(R: number, ratio: number, union?: number): A[] {
  const pts: A[] = [];
  for (let i = 0; i < 10; i++) {
    const a = ((-90 + 36 * i) * Math.PI) / 180, r = i % 2 ? R * ratio : R;
    if (union && i === 5) { const y = R * ratio * 0.98; pts.push([union / 2, y, 'union', 'c'], [-union / 2, y, 'contorno', 'c']); continue; }
    pts.push([r * Math.cos(a), r * Math.sin(a), i === 0 ? 'contorno' : undefined]);
  }
  return pts;
}
export function xmasTreeDefaults(): Params { return { alto: 350, ...commonDefaults }; }
export function generateXmasTree(ctx: GeneratorContext, params: Params): GeneratorResult {
  void ctx;
  const p = { ...xmasTreeDefaults(), ...params }, alto = num(p, 'alto'), c = setup(p, 80);
  if (isResult(c)) return c;
  if (!(alto >= 250 && alto <= 600)) return invalid('arbol-medidas', 'El alto va de 25 a 60 cm.');
  const k = alto / 350, t: ToyScale = { k, sa: c.sa, felt: false }, o = out0('Árbol con patas');
  const tree = plush('arbol', 'Árbol (delantero y trasero)', TREE_BODY, t, { qty: 2, labels: { estrella: 'Aquí entra la estrella', base: 'Base: aquí van las patas' } });
  embroider(tree, 'ojo-i', ROUND(-32, 196, 7), k, 'Bordar ojos, cejas y sonrisa (solo delante)'); embroider(tree, 'ojo-d', ROUND(32, 196, 7), k, '');
  embroider(tree, 'boca', smile(0, 226, 48), k, '');
  for (const [i, [x, y, a]] of [[-40, 120, 30], [40, 104, -30], [-80, 236, 20], [84, 230, -40], [0, 280, 0], [-56, 300, 60], [60, 296, -60], [0, 70, 90]].entries()) {
    const d = 9, r = (a * Math.PI) / 180;
    embroider(tree, `adorno-${i}`, [[x - d * Math.cos(r), y - d * Math.sin(r)], [x + d * Math.cos(r), y + d * Math.sin(r)]], k, i ? '' : 'Puntadas de adorno (bordado)');
  }
  const star = plush('estrella', 'Estrella (2, tela amarilla)', starAnchors(58, 0.5, 28), t, { qty: 2, fabric: 'contraste' });
  // Legs: a tube whose bottom edge is exactly the perimeter of the oval sole.
  const sole = ellipsePiece('suela', 'Suela de la pata (óvalo)', 28, 20, 'contorno', t, { qty: 2, fabric: 'contraste' });
  const per = runLength(sole, 'contorno') / k;
  const leg = rectangle('pata', 'Pata: tubo (doblar a lo largo)', per * k, 64 * k, [edge('union', 'Arriba: se aplana y entra en la base', 'costura', c.sa), edge('lado', 'Costura del tubo', 'costura', c.sa), edge('suela', 'Abajo: une con la suela', 'costura', c.sa), edge('lado-b', 'Costura del tubo', 'costura', c.sa)], { qty: 2, fabric: 'contraste' }, true);
  const B = runLength(tree, 'base');
  for (const [i, f] of [0.27, 0.73].entries()) { notchAt(tree, 'base', B * f - per * k / 4, 'Pata', `pata-${i}-a`); notchAt(tree, 'base', B * f + per * k / 4, 'Pata', `pata-${i}-b`); }
  o.pieces.push(tree, star, leg, sole);
  o.seams.push(match('estrella', 'Base de la estrella con la punta del árbol', side(star, 'union'), side(tree, 'estrella')), match('suela', 'Tubo de la pata con la suela', side(leg, 'suela'), side(sole, 'contorno')), match('tubo', 'Costura del tubo', side(leg, 'lado'), side(leg, 'lado-b')));
  finishCushion(perimeterOf(tree), c, o, { open: { piece: tree, run: 'contorno', at: 0.33 } });
  turnCheck([['puntas de la estrella', 40 * k]], o.notices);
  o.materials.push(fabricMat('Forro polar, minky o borreguito verde'), { id: 'contraste', label: 'Polar amarillo (estrella) y beige (patas)', qty: 'Retales' }, stuffing(seamArea(tree), c.fuelle), { id: 'bordado', label: 'Hilo de bordar negro y blanco', qty: '2 madejas' }, thread);
  return result(o, {
    checks: [{ key: 'alto', label: 'Alto del árbol (sin estrella)', target: alto, measured: 352 * k, tolerance: 0.03 * alto }],
    assumptions: ['En la referencia la estrella va pegada al árbol; aquí es una pieza aparte de otro color que entra en la costura de arriba, como en la foto.', 'Las patas son un tubo cerrado con una suela ovalada: el tubo mide justo el contorno de la suela.'],
    steps: [
      { id: 'cara', title: 'Cara', detail: 'Borda ojos, sonrisa y las puntadas de adorno en el árbol delantero.', pieces: ['arbol'] },
      { id: 'estrella', title: 'Estrella y patas', detail: 'Cose la estrella dejando abierta la base, voltea y rellena. Cierra cada pata en tubo, cose la suela, voltea y rellena poco.', pieces: ['estrella', 'pata', 'suela'], seams: ['estrella', 'suela'] },
      { id: 'cuerpo', title: 'Cuerpo', detail: 'Hilvana la estrella arriba y las patas abajo, hacia dentro. Cose delantero con trasero dejando la abertura, piquetea las entradas, voltea, rellena y cierra.', pieces: ['arbol'] }
    ]
  });
}

// ================================================================== Estrella (con brazos y piernas largos, o sola)
export function starDefaults(): Params { return { alto: 500, extremidades: 'si', lazo: 'si', cara: 'si', ...commonDefaults }; }
export function generateStar(ctx: GeneratorContext, params: Params): GeneratorResult {
  void ctx;
  const p = { ...starDefaults(), ...params }, alto = num(p, 'alto'), c = setup(p, 80), limbs = str(p, 'extremidades') === 'si';
  if (isResult(c)) return c;
  if (!(alto >= (limbs ? 300 : 180) && alto <= 700)) return invalid('estrella-medidas', limbs ? 'Con brazos y piernas el alto va de 30 a 70 cm.' : 'El alto va de 18 a 70 cm.');
  const t: ToyScale = { k: 1, sa: c.sa, felt: false }, k = alto / 500, o = out0(limbs ? 'Estrella con brazos y piernas' : 'Cojín estrella');
  // The rounded points bulge past their anchors: solve the radius so the seam line is exactly the height asked.
  const starOf = (R: number) => plush('estrella', 'Estrella (delantera y trasera)', starAnchors(R, 0.6).map(([x, y, r]) => [x, y + R, r] as A), t, { qty: 2 });
  const height = (R: number) => { const ys = seamPolygon(starOf(R), 0.2).map(q => q.y); return Math.max(...ys) - Math.min(...ys); };
  const R = solve(height, alto, alto / 4, alto), star = starOf(R);
  if (str(p, 'cara') === 'si') {
    const f = alto / 500;
    embroider(star, 'ojo-i', sleepyEye(-60 * f, R + 20 * f - 30 * f, 56 * f, true), 1, 'Bordar ojos felices, pestañas y sonrisa (solo delante)'); embroider(star, 'ojo-d', sleepyEye(60 * f, R - 10 * f, 56 * f, true), 1, '');
    embroider(star, 'boca', smile(0, R + 40 * f, 70 * f), 1, '');
    embroider(star, 'mejilla-i', ROUND(-96 * f, R + 34 * f, 20 * f), 1, 'Mejillas: espiral bordada o fieltro'); embroider(star, 'mejilla-d', ROUND(96 * f, R + 34 * f, 20 * f), 1, '');
  }
  o.pieces.push(star);
  const nodeS = (i: number) => sAtPoint(star, 'contorno', star.nodes[i]);
  if (limbs) {
    const lim: ToyScale = { k, sa: Math.min(c.sa, 6), felt: false }, L = runLength(star, 'contorno'), arm = plush('brazo', 'Brazo largo (2 pares en espejo)', [[0, 0, 'union', 'cl'], [45, 0, 'contorno', 'c'], [48, 150], [44, 280], [22, 300], [2, 282], [-3, 150]], lim, { qty: 4, mirrorPairs: true });
    const legTop = plush('pierna', 'Pierna (2 pares en espejo)', [[0, 0, 'union', 'cl'], [50, 0, 'contorno', 'c'], [52, 125], [50, 250, 'tobillo', 'cl'], [0, 250, 'contorno', 'c'], [-2, 125]], lim, { qty: 4, mirrorPairs: true });
    const shoe = plush('zapato', 'Zapato (2 pares en espejo, contraste)', [[0, 0, 'tobillo', 'cl'], [50, 0, 'contorno', 'c'], [56, 22], [74, 34], [72, 52], [40, 56], [6, 54], [-4, 30]], lim, { qty: 4, mirrorPairs: true, fabric: 'contraste' });
    embroider(shoe, 'raya-1', [[8, 14], [46, 14]], k, 'Rayas bordadas'); embroider(shoe, 'raya-2', [[8, 24], [48, 24]], k, '');
    // Arms under the side points, legs inside the two bottom points.
    const sArm = nodeS(2) + 0.3 * (nodeS(3) - nodeS(2)), sArmL = L - sArm;
    for (const [id, s] of [['brazo-d', sArm], ['brazo-i', sArmL - 45 * k]] as const) { notchAt(star, 'contorno', s, 'Brazo', `${id}-a`); notchAt(star, 'contorno', s + 45 * k, 'Brazo', `${id}-b`); }
    const sLeg = nodeS(4) + 0.5 * (nodeS(5) - nodeS(4)), sLegL = L - sLeg;
    for (const [id, s] of [['pierna-d', sLeg], ['pierna-i', sLegL - 50 * k]] as const) { notchAt(star, 'contorno', s, 'Pierna', `${id}-a`); notchAt(star, 'contorno', s + 50 * k, 'Pierna', `${id}-b`); }
    o.pieces.push(arm, legTop, shoe);
    o.seams.push(match('tobillo', 'Pierna con zapato', side(legTop, 'tobillo'), side(shoe, 'tobillo')));
    turnCheck([['brazos', 45 * k], ['piernas', 50 * k]], o.notices);
  }
  if (str(p, 'lazo') === 'si') o.pieces.push(...bowPieces('', 60 * k, 24 * k, c.sa, 'principal'));
  finishCushion(perimeterOf(star), c, o, { open: { piece: star, run: 'contorno', at: (nodeS(6) + 0.5 * (nodeS(7) - nodeS(6))) / runLength(star, 'contorno') } });
  o.notices.push({ level: 'ok', code: 'estrella-referencia', message: `Estrella de ${cm(alto)} de alto y ${cm(2 * R * Math.sin(2 * Math.PI / 5))} de ancho. La referencia dice 50 cm de alto y 20 de ancho, imposible para una estrella de cinco puntas: se toma el alto.` });
  o.materials.push(fabricMat('Forro polar, minky o borreguito'), ...(limbs ? [{ id: 'contraste', label: 'Retal de contraste para los zapatos', qty: 'Retal' }] : []), stuffing(seamArea(star), c.fuelle), { id: 'bordado', label: 'Hilo de bordar negro y rosa', qty: '2 madejas' }, thread);
  return result(o, {
    checks: [{ key: 'alto', label: 'Alto de la estrella', target: alto, measured: height(R), tolerance: 0.5 }],
    assumptions: limbs ? ['Piernas de 25 cm con zapato de 5 cm y 7 cm de punta, como en la referencia, escaladas con el alto.'] : ['Para las estrellitas de 20 y 22 cm de la referencia, pon ese alto sin brazos ni piernas.'],
    steps: [
      { id: 'cara', title: 'Cara', detail: 'Borda ojos, sonrisa y mejillas en la estrella delantera.', pieces: ['estrella'] },
      ...(limbs ? [{ id: 'piernas', title: 'Brazos y piernas', detail: 'Une cada pierna con su zapato, cose los pares dejando abierta la unión, voltea con una varilla y rellena poco para que se doblen.', pieces: ['brazo', 'pierna', 'zapato'], seams: ['tobillo'] }] : []),
      { id: 'cuerpo', title: 'Cuerpo', detail: `${limbs ? 'Hilvana brazos y piernas entre sus piquetes. ' : ''}Cose delantera con trasera dejando la abertura, piquetea las entradas, voltea, rellena las puntas primero y cierra. Cose el lazo en una punta.`, pieces: ['estrella'] }
    ]
  });
}

// ================================================================== Conejo redondo con orejas y lazo
export function roundBunnyDefaults(): Params { return { diametro: 350, forma: 'disco', lazo: 'si', ...commonDefaults }; }
export function generateRoundBunny(ctx: GeneratorContext, params: Params): GeneratorResult {
  void ctx;
  const p = { ...roundBunnyDefaults(), ...params }, D = num(p, 'diametro'), ball = str(p, 'forma') === 'bola', c = setup(p, 120);
  if (isResult(c)) return c;
  if (!(D >= 250 && D <= 550)) return invalid('conejo-redondo-medidas', 'El diámetro va de 25 a 55 cm.');
  const R = D / 2, t: ToyScale = { k: 1, sa: c.sa, felt: false }, o = out0(ball ? 'Cojín conejo bola' : 'Cojín conejo redondo');
  const EB = 0.16 * D, EL = 0.75 * D;
  const ear = plush('oreja', 'Oreja exterior (2 pares en espejo)', [[EB, 0, 'union', 'cl'], [0, 0, 'contorno', 'c'], [-0.06 * D, -0.35 * EL], [0.02 * D, -0.8 * EL], [EB / 2, -EL], [EB - 0.02 * D, -0.8 * EL], [EB + 0.06 * D, -0.35 * EL]], t, { qty: 4, mirrorPairs: true });
  const inner = plush('oreja-interior', 'Interior de la oreja (2, borde doblado y aplicado)', [[0, 0, 'borde'], [0.08 * D, -0.3 * EL], [0.1 * D, -0.62 * EL], [0.03 * D, -0.78 * EL], [-0.04 * D, -0.62 * EL], [-0.06 * D, -0.3 * EL]], t, { qty: 2, mirrorPairs: true, fabric: 'contraste', hems: { borde: 5 } });
  let head: Piece, earRun = 'contorno';
  if (ball) {
    const n = 6, Lg = Math.PI * R, hw = (s: number) => (Math.PI * R * Math.sin(s / R)) / n, fr = [0.15, 0.32, 0.5, 0.68, 0.85];
    head = plush('gajo', 'Gajo de la bola (6)', [[0, 0, 'lado', 'c'], ...fr.map(f => [hw(f * Lg), f * Lg] as A), [0, Lg, 'lado-b', 'c'], ...[...fr].reverse().map(f => [-hw(f * Lg), f * Lg] as A)], t, { qty: n });
    o.pieces.push(head);
    o.seams.push(match('gajos', 'Lados de los gajos', side(head, 'lado'), side(head, 'lado-b')));
    earRun = 'lado';
    insertion(head, 'lado', 0.2, EB, 'Oreja (en dos costuras vecinas)', 'oreja');
    notchAt(head, 'lado', Lg * 0.55, 'Abertura para rellenar (en una sola costura)', 'abertura-a'); notchAt(head, 'lado', Lg * 0.55 + Math.min(150, 0.3 * Lg), 'Fin de la abertura', 'abertura-b');
    if (c.vivo || c.fuelle || c.zip) o.notices.push({ level: 'aviso', code: 'bola-opciones', message: 'En la bola de gajos no se usan vivo, fuelle ni cremallera: se cierra a mano.' });
  } else {
    head = ellipsePiece('cabeza', 'Cabeza: círculo (delantera y trasera)', R, R, 'contorno', t, { qty: 2 });
    o.pieces.push(head);
    const Lc = runLength(head, 'contorno'), arc = (deg: number) => (Lc * deg) / 360;
    notchAt(head, 'contorno', Lc - arc(26) - EB, 'Oreja', 'oreja-i-a'); notchAt(head, 'contorno', Lc - arc(26), 'Oreja', 'oreja-i-b');
    notchAt(head, 'contorno', arc(26), 'Oreja', 'oreja-d-a'); notchAt(head, 'contorno', arc(26) + EB, 'Oreja', 'oreja-d-b');
    finishCushion(perimeterOf(head), c, o, { open: { piece: head, run: 'contorno', at: 0.5 } });
  }
  void earRun;
  o.pieces.push(ear, inner);
  if (str(p, 'lazo') === 'si') o.pieces.push(...bowPieces('', 0.17 * D, 0.07 * D, c.sa, 'contraste'));
  o.notices.push({ level: 'ok', code: 'conejo-referencia', message: 'La referencia corta 2 orejas exteriores y 2 interiores de distinto tamaño: con eso no se pueden cerrar. Cada oreja lleva delante y detrás exterior (4) y el interior se aplica encima (2).' });
  o.materials.push(fabricMat('Terciopelo, borreguito o franela'), { id: 'contraste', label: 'Retal claro para el interior de las orejas y el lazo', qty: 'Retales' }, stuffing(Math.PI * R * R, ball ? 200 : c.fuelle), thread);
  return result(o, {
    checks: [{ key: 'diametro', label: 'Diámetro de la cabeza', target: D, measured: 2 * R, tolerance: 0.5 }],
    assumptions: [ball ? 'La bola de 6 gajos tiene el diámetro elegido; las orejas entran en dos costuras vecinas arriba.' : 'Para el volumen de la foto pon un fuelle de 6 a 8 cm o elige la bola de gajos.'],
    steps: [
      { id: 'orejas', title: 'Orejas', detail: 'Aplica el interior sobre una oreja de cada par doblando 5 mm el borde. Cose cada par dejando abierta la base, voltea y haz un pliegue en la base.', pieces: ['oreja', 'oreja-interior'] },
      { id: 'cabeza', title: 'Cabeza', detail: ball ? 'Une los gajos de tres en tres metiendo las orejas en su sitio y luego las dos mitades, dejando la abertura.' : `Hilvana las orejas entre sus piquetes. ${c.fuelle ? 'Cose el fuelle a cada círculo' : 'Cose los dos círculos'} dejando la abertura.`, pieces: [ball ? 'gajo' : 'cabeza'] },
      { id: 'final', title: 'Rellena y lazo', detail: 'Voltea, rellena firme, cierra a punto escondido y cose el lazo en la base de las orejas.' }
    ]
  });
}

// ================================================================== Mariposa con volante de encaje
const WING_HALF: [number, number, string?][] = [[0, 70, 'c'], [40, 30], [120, 0], [230, 6], [290, 50], [300, 120], [270, 175], [200, 196, 'c'], [250, 240], [250, 300], [200, 345], [120, 350], [50, 320], [0, 280, 'c']];
export function laceButterflyDefaults(): Params { return { ancho: 600, volante: 'encaje', ...commonDefaults }; }
export function generateLaceButterfly(ctx: GeneratorContext, params: Params): GeneratorResult {
  void ctx;
  const p = { ...laceButterflyDefaults(), ...params }, W = num(p, 'ancho'), c = setup(p, 0), vol = str(p, 'volante');
  if (isResult(c)) return c;
  if (!(W >= 400 && W <= 900)) return invalid('mariposa-medidas', 'El ancho va de 40 a 90 cm.');
  const k = W / 600, t: ToyScale = { k, sa: c.sa, felt: false }, o = out0('Cojín mariposa con volante');
  const right = WING_HALF.map(([x, y, f], i) => [x, y, i ? undefined : 'contorno', f] as A);
  const left = WING_HALF.slice(1, -1).reverse().map(([x, y, f]) => [-x, y, undefined, f] as A);
  const face = plush('mariposa', 'Mariposa: dos alas (delantera y trasera)', [...right, ...left], t, { qty: 2 });
  face.lines.push({ id: 'centro', kind: 'colocacion', a: P(0, 70 * k), b: P(0, 280 * k), label: 'Centro: aquí se cose el cuerpo' });
  const body = plush('cuerpo', 'Cuerpo (2 piezas, relleno)', [[0, 0, 'contorno'], [32, 8], [40, 40], [34, 80], [24, 140], [14, 190], [0, 200], [-14, 190], [-24, 140], [-34, 80], [-40, 40], [-32, 8]], t, { qty: 2 });
  const ant = rectangle('antenas', 'Tira de las antenas (doblar en cuatro y pespuntear; se dobla en V)', 48 * k, 240 * k, [edge('canto', 'Canto (doblado hacia dentro)', 'sin-margen', 0), edge('punta', 'Punta', 'sin-margen', 0), edge('canto-b', 'Canto', 'sin-margen', 0), edge('base', 'Base', 'sin-margen', 0)], { qty: 1 });
  o.pieces.push(face, body, ant);
  const perim = perimeterOf(face);
  if (vol === 'tela') ruffle(perim, 70 * k, 2, c.sa, o);
  if (vol === 'encaje') o.materials.push({ id: 'encaje', label: 'Puntilla de encaje de 6 a 8 cm (el doble del contorno, fruncida)', qty: cm(2 * perim.length + 100) });
  const L = runLength(face, 'contorno');
  finishCushion(perim, c, o, { open: { piece: face, run: 'contorno', at: sAtPoint(face, 'contorno', P(120 * k, 350 * k)) / L } });
  notchAt(body, 'contorno', runLength(body, 'contorno') * 0.3, 'Abertura para rellenar el cuerpo', 'abertura-a'); notchAt(body, 'contorno', runLength(body, 'contorno') * 0.3 + 40 * k, 'Fin de la abertura', 'abertura-b');
  turnCheck([['cuerpo', 28 * k]], o.notices);
  o.notices.push({ level: 'ok', code: 'mariposa-referencia', message: `Alas de ${cm(300 * k)} × ${cm(350 * k)} cada una (envergadura ${cm(W)}), cuerpo de ${cm(200 * k)} × ${cm(80 * k)} y antenas de ${cm(100 * k)}, como en la referencia.` });
  o.materials.push(fabricMat('Terciopelo, lino o algodón satinado'), stuffing(seamArea(face), 20), thread);
  return result(o, {
    checks: [{ key: 'ancho', label: 'Envergadura', target: W, measured: 600 * k, tolerance: 0.5 }],
    assumptions: ['El volante se frunce al doble del contorno y queda atrapado en la costura entre delantera y trasera.'],
    steps: [
      { id: 'volante', title: 'Volante', detail: vol === 'no' ? 'Sin volante.' : `${vol === 'tela' ? 'Une los tramos del volante, dobladilla el bajo' : 'Une la puntilla en un anillo'}, frúncelo y hilvánalo alrededor de la mariposa delantera, hacia dentro.`, pieces: ['mariposa'] },
      { id: 'coser', title: 'Mariposa', detail: 'Cose delantera con trasera dejando la abertura, piquetea las entradas entre las alas, voltea, rellena y cierra.', pieces: ['mariposa'] },
      { id: 'cuerpo', title: 'Cuerpo y antenas', detail: 'Cose y rellena el cuerpo. Dobla la tira de antenas en cuatro, pespuntéala, dóblala en V y cóselas bajo la cabeza del cuerpo. Cose el cuerpo en el centro a punto escondido.', pieces: ['cuerpo', 'antenas'] }
    ]
  });
}

// ================================================================== Abeja de franjas
const BEE: A[] = [[0, 0, 'contorno'], [62, 10], [92, 60], [84, 116], [70, 146], [100, 172], [146, 232], [158, 318], [140, 392], [92, 440], [0, 452], [-92, 440], [-140, 392], [-158, 318], [-146, 232], [-100, 172], [-70, 146], [-84, 116], [-92, 60], [-62, 10]];
export function beeDefaults(): Params { return { alto: 450, franjas: 3, antenas: 'tela', ...commonDefaults }; }
export function generateBee(ctx: GeneratorContext, params: Params): GeneratorResult {
  void ctx;
  const p = { ...beeDefaults(), ...params }, alto = num(p, 'alto'), n = Math.round(num(p, 'franjas')), c = setup(p, 0);
  if (isResult(c)) return c;
  if (!(alto >= 320 && alto <= 700 && n >= 2 && n <= 6)) return invalid('abeja-medidas', 'El alto va de 32 a 70 cm y las franjas de 2 a 6.');
  const k = alto / 450, t: ToyScale = { k, sa: Math.min(c.sa, 10), felt: false }, o = out0('Cojín abeja');
  if (c.sa > 10) o.notices.push({ level: 'aviso', code: 'abeja-margen', message: 'En la abeja el margen se limita a 1 cm: la curva del cuello no admite más sin que el corte se monte.' });
  const silhouette = plush('silueta', 'Silueta', BEE, t, {});
  // The head ends where the silhouette is narrowest, so no sliver of the body flare stays on the head.
  const sil = seamPolygon(silhouette, 0.05), widthAt = (y: number) => {
    const xs: number[] = [];
    sil.forEach((q, i) => { const r = sil[(i + 1) % sil.length]; if ((q.y - y) * (r.y - y) <= 0 && q.y !== r.y) xs.push(q.x + ((y - q.y) * (r.x - q.x)) / (r.y - q.y)); });
    return xs.length ? Math.max(...xs) - Math.min(...xs) : Infinity;
  };
  let neck = 150 * k;
  for (let y = 120 * k, best = Infinity; y <= 180 * k; y += 0.1) { const w = widthAt(y); if (w < best - 1e-6) { best = w; neck = y; } }
  const cuts = [neck, ...Array.from({ length: n - 1 }, (_, i) => neck + ((i + 1) * (452 * k - neck)) / n)];
  const parts = bandsOf(silhouette, cuts, i => i === 0
    ? { id: 'cabeza', name: 'Cabeza (tela C: mostaza; delantera y trasera)', o: { qty: 2, fabric: 'contraste' } }
    : { id: `franja-${i}`, name: `Franja ${i} (tela ${i % 2 ? 'A' : 'B'}; delantera y trasera)`, o: { qty: 2, fabric: 'principal' } }, t);
  o.pieces.push(...parts);
  for (let i = 0; i < parts.length - 1; i++) o.seams.push(match(`union-${i}`, i ? `Franja ${i} con franja ${i + 1}` : 'Cabeza con la primera franja', side(parts[i], 'abajo'), side(parts[i + 1], 'arriba')));
  const head = parts[0], Ln = runLength(head, 'abajo');
  embroider(head, 'ojo-i', ROUND(-34, 92, 0.1), k, ''); void embroider;
  // Wings go into the neck seam of the front only; antennae into the top of the head.
  const wing = plush('ala', 'Ala (2 pares en espejo)', [[0, 0, 'union', 'cl'], [50, 0, 'contorno', 'c'], [100, 50], [140, 170], [120, 290], [60, 330], [10, 290], [-20, 170], [-10, 50]], t, { qty: 4, mirrorPairs: true });
  for (const [i, f] of [0.5 - 40 * k / Ln, 0.5 + 40 * k / Ln].entries()) insertion(head, 'abajo', f, 50 * k, 'Ala (solo en la cabeza delantera)', `ala-${i}`);
  o.pieces.push(wing);
  if (str(p, 'antenas') === 'tela') {
    const ant = plush('antena', 'Antena con bolita (2 pares en espejo)', [[0, 0, 'union', 'cl'], [24, 0, 'contorno', 'c'], [25, 70], [34, 88], [36, 108], [24, 124], [0, 124], [-12, 108], [-10, 88], [-1, 70]], { ...t, sa: Math.min(c.sa, 6) }, { qty: 4, mirrorPairs: true, fabric: 'contraste' });
    const Lc = runLength(head, 'contorno');
    for (const [i, x] of [-38, 38].entries()) { const s = sAtPoint(head, 'contorno', P(x * k, 12 * k)); notchAt(head, 'contorno', Math.max(0, Math.min(Lc - 24 * k, s - 12 * k)), 'Antena', `antena-${i}-a`); notchAt(head, 'contorno', Math.max(24 * k, Math.min(Lc, s + 12 * k)), 'Antena', `antena-${i}-b`); }
    o.pieces.push(ant);
    turnCheck([['antenas', 24 * k]], o.notices);
  } else o.notices.push({ level: 'ok', code: 'antenas', message: 'Antenas bordadas: sin piezas sueltas.' });
  const last = parts[parts.length - 1];
  finishCushion(perimeterOfRuns(parts.map(x => [x, 'contorno'] as [Piece, string])), c, o, { open: { piece: last, run: 'contorno', at: 0.5 } });
  o.notices.push({ level: 'ok', code: 'abeja-referencia', message: `La referencia pide cortar 1 cabeza y 1 cuerpo: un cojín necesita delantera y trasera, así que se corta 2 de cada franja. Alas: 2 por ala (4). ${n} franjas de ${cm((452 * k - neck) / n)}.` });
  o.materials.push(fabricMat('Terciopelo en dos colores para las franjas (A y B)'), { id: 'contraste', label: 'Terciopelo mostaza para la cabeza y las antenas (tela C)', qty: 'Medio metro' }, stuffing(seamArea(silhouette), 0), thread);
  return result(o, {
    checks: [{ key: 'alto', label: 'Alto de la abeja', target: alto, measured: 452 * k, tolerance: 0.03 * alto }],
    assumptions: ['Las franjas se cortan de una sola silueta: cada costura entre franjas mide lo mismo arriba y abajo.'],
    steps: [
      { id: 'franjas', title: 'Une las franjas', detail: 'Une cabeza y franjas en orden para formar la abeja delantera y, aparte, la trasera. Plancha las costuras abiertas.', pieces: parts.map(x => x.id), seams: parts.slice(1).map((_, i) => `union-${i}`) },
      { id: 'alas', title: 'Alas y antenas', detail: 'Cose cada ala con su pareja, voltea, pespuntea a 1 cm del borde y rellena poco. Cose y rellena las antenas.', pieces: ['ala', 'antena'] },
      { id: 'cerrar', title: 'Cierra', detail: 'Cose las alas sobre la costura de la cabeza delantera y hilvana las antenas arriba. Cose delantera con trasera dejando la abertura en la última franja, voltea, rellena y cierra.' }
    ]
  });
}

// ================================================================== Manzana
const APPLE: A[] = [[0, 34, 'contorno', 'c'], [60, 8], [136, 0], [188, 48], [204, 150], [186, 246], [190, 300], [160, 362], [90, 396], [0, 386, undefined, 'c'], [-90, 396], [-160, 362], [-190, 300], [-186, 246], [-204, 150], [-194, 58], [-140, 2], [-56, 4]];
export function appleDefaults(): Params { return { ancho: 400, hoja: 'tela', ...commonDefaults }; }
export function generateApple(ctx: GeneratorContext, params: Params): GeneratorResult {
  void ctx;
  const p = { ...appleDefaults(), ...params }, W = num(p, 'ancho'), c = setup(p, 120), felt = str(p, 'hoja') === 'fieltro';
  if (isResult(c)) return c;
  if (!(W >= 250 && W <= 700)) return invalid('manzana-medidas', 'El ancho va de 25 a 70 cm.');
  const k = W / 408, t: ToyScale = { k, sa: c.sa, felt: false }, o = out0('Cojín manzana');
  const face = plush('manzana', 'Manzana (delantera y trasera)', APPLE, t, { qty: 2 });
  const L = runLength(face, 'contorno');
  notchAt(face, 'contorno', L - 24 * k, 'Tallo y hoja entre estos piquetes', 'tallo-a'); notchAt(face, 'contorno', 24 * k, 'Tallo y hoja', 'tallo-b');
  const stem = rectangle('tallo', 'Tallo (enrollar en tubo y coser)', 70 * k, 110 * k, [edge('punta', 'Punta (doblar hacia dentro)', 'costura', c.sa), edge('lado', 'Lado', 'costura', c.sa), edge('base', 'Base: entra en la costura', 'costura', c.sa), edge('lado-b', 'Lado', 'costura', c.sa)], { qty: 1, fabric: 'contraste' });
  const leafPts = leaf(0, 0, 150, -60, 64, 0.12).filter((_, i) => i % 3 === 0).map(q => P(q.x * k, q.y * k));
  const leafP = polyRuns('hoja', felt ? 'Hoja (fieltro, sin margen)' : 'Hoja (par en espejo)', leafPts, () => 'contorno', { ...t, felt }, { qty: felt ? 1 : 2, mirrorPairs: !felt, fabric: 'contraste' });
  if (!felt) leafP.lines.push({ id: 'nervio', kind: 'pespunte', a: P(10 * k, -4 * k), b: P(140 * k, -56 * k), label: 'Pespunte del nervio (deja abierta la base para voltear)' });
  o.pieces.push(face, stem, leafP);
  finishCushion(perimeterOf(face), c, o, { open: { piece: face, run: 'contorno', at: 0.36 } });
  o.notices.push({ level: 'ok', code: 'manzana-referencia', message: `${cm(W)} de ancho. La referencia corta 1 hoja: una hoja de tela necesita 2 piezas para voltearse (o 1 de fieltro sin margen).` });
  o.materials.push(fabricMat('Terciopelo o bouclé'), { id: 'contraste', label: 'Retales marrón (tallo) y verde (hoja)', qty: 'Retales' }, stuffing(seamArea(face), c.fuelle), thread);
  return result(o, {
    checks: [{ key: 'ancho', label: 'Ancho de la manzana', target: W, measured: 408 * k, tolerance: 0.5 }],
    assumptions: ['Las dos marcas de la referencia (arriba y abajo) son los hoyuelos de la manzana: piquetéalos hasta 2 mm de la costura.'],
    steps: [
      { id: 'tallo', title: 'Tallo y hoja', detail: 'Enrolla el tallo en tubo y cóselo con la punta doblada. Cose la hoja (o córtala en fieltro) y pespuntea el nervio.', pieces: ['tallo', 'hoja'] },
      { id: 'coser', title: 'Manzana', detail: `Hilvana tallo y hoja hacia dentro entre los piquetes de arriba. ${c.fuelle ? 'Cose el fuelle a cada cara' : 'Cose delantera con trasera'} dejando la abertura, piquetea los hoyuelos, voltea, rellena y cierra.`, pieces: ['manzana'] }
    ]
  });
}

// ================================================================== Nubes (grande, mediana y pequeña)
const CLOUDS: Record<string, { base: [number, number, number, number]; bumps: [number, number, number][]; ancho: number }> = {
  grande: { base: [500, 400, 440, 150], bumps: [[160, 380, 150], [380, 250, 210], [640, 230, 200], [840, 340, 150], [300, 470, 120], [560, 490, 110], [780, 470, 110]], ancho: 550 },
  mediana: { base: [520, 390, 420, 140], bumps: [[190, 330, 160], [430, 220, 210], [690, 270, 180], [870, 360, 130], [350, 460, 110], [640, 460, 110]], ancho: 430 },
  pequena: { base: [500, 380, 400, 130], bumps: [[200, 330, 180], [480, 230, 220], [780, 320, 180], [500, 450, 140]], ancho: 300 }
};
export function cloudDefaults(): Params { return { forma: 'grande', ancho: 550, ...commonDefaults }; }
export function generateCloud(ctx: GeneratorContext, params: Params): GeneratorResult {
  void ctx;
  const p = { ...cloudDefaults(), ...params }, shape = CLOUDS[str(p, 'forma')], W = num(p, 'ancho'), c = setup(p, 120);
  if (isResult(c)) return c;
  if (!shape) return invalid('nube-forma', 'Elige nube grande, mediana o pequeña.');
  if (!(W >= 250 && W <= 800)) return invalid('nube-medidas', 'El ancho va de 25 a 80 cm.');
  const o = out0('Cojín nube'), t: ToyScale = { k: 1, sa: c.sa, felt: false };
  const [bx, by, brx, bry] = shape.base;
  // Close the union so the valleys between bumps are rounded and can be sewn and turned.
  const poly = offsetPolygons(offsetPolygons(uni(ellipse(bx, by, brx, bry, 0, 96), ...shape.bumps.map(([x, y, r]) => circle(x, y, r, 72))), 70), -70).sort((a, b) => b.length - a.length)[0];
  const xs = poly.map(q => q.x), ys = poly.map(q => q.y), s = W / (Math.max(...xs) - Math.min(...xs));
  const pts: Pt[] = poly.filter((_, i) => i % 3 === 0).map(q => P((q.x - Math.min(...xs)) * s, (q.y - Math.min(...ys)) * s));
  const face = polyRuns('nube', 'Nube (par en espejo: delantera y trasera)', pts, () => 'contorno', t, { qty: 2, mirrorPairs: true });
  o.pieces.push(face);
  const H = Math.max(...pts.map(q => q.y)), low = pts.reduce((b, q) => (Math.abs(q.x - W / 2) < W * 0.2 && q.y > b.y ? q : b), P(W / 2, 0));
  finishCushion(perimeterOf(face), c, o, { open: { piece: face, run: 'contorno', at: sAtPoint(face, 'contorno', low) / runLength(face, 'contorno') } });
  o.notices.push({ level: 'ok', code: 'nube-tamano', message: `Nube ${str(p, 'forma') === 'pequena' ? 'pequeña' : str(p, 'forma')} de ${cm(W)} × ${cm(H)}. Tamaños de la foto: grande 55 cm, mediana 43 cm y pequeña 30 cm.` });
  o.materials.push(fabricMat('Pelo sintético, borreguito o minky'), stuffing(seamArea(face), c.fuelle), thread);
  return result(o, {
    checks: [{ key: 'ancho', label: 'Ancho de la nube', target: W, measured: W, tolerance: 0.5 }],
    assumptions: ['Con pelo largo, corta por el revés solo el tejido base (con cúter o tijera de punta) para no cortar el pelo, y peina el pelo hacia dentro al coser.'],
    steps: [{ id: 'coser', title: 'Cose', detail: `${c.fuelle ? 'Cose el fuelle a cada nube' : 'Cose delantera con trasera'} dejando la abertura de abajo, piquetea cada entrada entre bultos, voltea, rellena y cierra.`, pieces: ['nube'] }]
  });
}

// ================================================================== Hongo y bellota
const MUSH_CAP: A[] = [[72, 178, 'union', 'cl'], [-72, 178, 'contorno', 'c'], [-150, 186], [-205, 196], [-212, 160], [-196, 80], [-130, 18], [0, 0], [130, 18], [196, 80], [212, 160], [205, 196], [150, 186]];
const MUSH_STEM: A[] = [[-72, 178, 'union', 'cl'], [72, 178, 'contorno', 'c'], [64, 232], [78, 330], [104, 410], [92, 448], [40, 452], [0, 446], [-40, 452], [-92, 448], [-104, 410], [-78, 330], [-64, 232]];
export function mushroomDefaults(): Params { return { alto: 450, lunares: 'si', ...commonDefaults }; }
export function generateMushroom(ctx: GeneratorContext, params: Params): GeneratorResult {
  void ctx;
  const p = { ...mushroomDefaults(), ...params }, alto = num(p, 'alto'), c = setup(p, 100);
  if (isResult(c)) return c;
  if (!(alto >= 300 && alto <= 700)) return invalid('hongo-medidas', 'El alto va de 30 a 70 cm.');
  const k = alto / 452, t: ToyScale = { k, sa: c.sa, felt: false }, o = out0('Cojín hongo');
  const cap = plush('sombrero', 'Sombrero (delantero y trasero)', MUSH_CAP, t, { qty: 2, labels: { union: 'Une con el pie' } });
  const stem = plush('pie', 'Pie (delantero y trasero)', MUSH_STEM, t, { qty: 2, fabric: 'contraste', labels: { union: 'Une con el sombrero' } });
  o.pieces.push(cap, stem);
  o.seams.push(match('union', 'Sombrero con pie', side(cap, 'union'), side(stem, 'union')));
  if (str(p, 'lunares') === 'si') {
    const felt = { ...t, felt: true };
    o.pieces.push(ellipsePiece('lunar-grande', 'Lunar grande (fieltro, sin margen)', 22, 22, 'borde', felt, { qty: 8, fabric: 'contraste' }), ellipsePiece('lunar-pequeno', 'Lunar pequeño (fieltro, sin margen)', 14, 14, 'borde', felt, { qty: 6, fabric: 'contraste' }));
    for (const [i, [x, y]] of [[-120, 90], [-40, 50], [60, 70], [140, 110], [0, 130], [-150, 150]].entries()) cap.marks.push({ id: `lunar-${i}`, kind: 'punto', at: P(x * k, y * k), label: i ? undefined : 'Lunares (solo delante, o en las dos caras)' });
  }
  finishCushion(perimeterOfRuns([[cap, 'contorno'], [stem, 'contorno']]), c, o, { open: { piece: stem, run: 'contorno', at: 0.22 } });
  o.notices.push({ level: 'ok', code: 'hongo-referencia', message: 'La referencia es una sola silueta: se corta en sombrero y pie para poder hacerlos en dos telas como en la foto, con la unión recta del mismo largo.' });
  o.materials.push(fabricMat('Pana o terciopelo para el sombrero'), { id: 'contraste', label: 'Pana crema para el pie y fieltro blanco para los lunares', qty: 'Medio metro + retales' }, stuffing(seamArea(cap) + seamArea(stem), c.fuelle), thread);
  return result(o, {
    checks: [{ key: 'alto', label: 'Alto del hongo', target: alto, measured: 452 * k, tolerance: 0.5 }],
    assumptions: ['Si quieres la franja crema bajo el sombrero de la foto, cose una cinta o una tira al bies sobre la costura de unión.'],
    steps: [
      { id: 'lunares', title: 'Lunares', detail: 'Cose los lunares de fieltro en el sombrero delantero con puntadas pequeñas.', pieces: ['sombrero'] },
      { id: 'unir', title: 'Une sombrero y pie', detail: 'Une cada sombrero con su pie por la línea recta y plancha la costura.', pieces: ['sombrero', 'pie'], seams: ['union'] },
      { id: 'cerrar', title: 'Cierra', detail: `${c.fuelle ? 'Cose el fuelle a cada cara' : 'Cose delantero con trasero'} dejando la abertura en el pie, piquetea las curvas del sombrero, voltea, rellena y cierra.` }
    ]
  });
}
const ACORN_CAP: A[] = [[170, 168, 'union', 'c'], [0, 182], [-170, 168, 'contorno', 'c'], [-182, 120], [-150, 60], [-80, 22], [0, 12], [80, 22], [150, 60], [182, 120]];
const ACORN_NUT: A[] = [[-170, 168, 'union', 'c'], [0, 182], [170, 168, 'contorno', 'c'], [176, 230], [150, 310], [90, 372], [24, 398], [0, 406], [-24, 398], [-90, 372], [-150, 310], [-176, 230]];
export function acornDefaults(): Params { return { alto: 406, ...commonDefaults }; }
export function generateAcorn(ctx: GeneratorContext, params: Params): GeneratorResult {
  void ctx;
  const p = { ...acornDefaults(), ...params }, alto = num(p, 'alto'), c = setup(p, 100);
  if (isResult(c)) return c;
  if (!(alto >= 280 && alto <= 650)) return invalid('bellota-medidas', 'El alto va de 28 a 65 cm.');
  const k = alto / 406, t: ToyScale = { k, sa: c.sa, felt: false }, o = out0('Cojín bellota');
  const cap = plush('capucha', 'Capucha (delantera y trasera)', ACORN_CAP, t, { qty: 2, fabric: 'contraste', labels: { union: 'Une con el fruto' } });
  const nut = plush('fruto', 'Fruto (delantero y trasero)', ACORN_NUT, t, { qty: 2, labels: { union: 'Une con la capucha' } });
  const Lc = runLength(cap, 'contorno'), top = sAtPoint(cap, 'contorno', P(0, 12 * k));
  notchAt(cap, 'contorno', top - 16 * k, 'Rabito', 'rabito-a'); notchAt(cap, 'contorno', top + 16 * k, 'Rabito', 'rabito-b'); void Lc;
  const stem = rectangle('rabito', 'Rabito (enrollar en tubo)', 64 * k, 120 * k, [edge('punta', 'Punta (doblar hacia dentro)', 'costura', c.sa), edge('lado', 'Lado', 'costura', c.sa), edge('base', 'Base: entra en la costura', 'costura', c.sa), edge('lado-b', 'Lado', 'costura', c.sa)], { qty: 1, fabric: 'contraste' });
  o.pieces.push(cap, nut, stem);
  o.seams.push(match('union', 'Capucha con fruto (curva)', side(cap, 'union'), side(nut, 'union')));
  finishCushion(perimeterOfRuns([[cap, 'contorno'], [nut, 'contorno']]), c, o, { open: { piece: nut, run: 'contorno', at: 0.25 } });
  o.notices.push({ level: 'ok', code: 'bellota-referencia', message: 'La curva de unión es la misma en la capucha y en el fruto: miden igual y casan sin fruncir.' });
  o.materials.push(fabricMat('Terciopelo para el fruto'), { id: 'contraste', label: 'Bouclé o rafia de tapicería para la capucha y el rabito', qty: 'Medio metro' }, stuffing(seamArea(cap) + seamArea(nut), c.fuelle), thread);
  return result(o, {
    checks: [{ key: 'alto', label: 'Alto de la bellota', target: alto, measured: 406 * k, tolerance: 0.5 }],
    assumptions: ['El rabito se enrolla y se mete en la costura de arriba.'],
    steps: [
      { id: 'unir', title: 'Une capucha y fruto', detail: 'Une cada capucha con su fruto por la curva, casando los extremos y el centro. Enrolla y cose el rabito.', pieces: ['capucha', 'fruto', 'rabito'], seams: ['union'] },
      { id: 'cerrar', title: 'Cierra', detail: `Hilvana el rabito arriba entre los piquetes. ${c.fuelle ? 'Cose el fuelle a cada cara' : 'Cose delantera con trasera'} dejando la abertura en el fruto, voltea, rellena y cierra.` }
    ]
  });
}

// ================================================================== Mariposa de alas rellenas con banda
const WING3D: A[] = [[0, 90, 'contorno', 'c'], [40, 30], [120, 0], [210, 4], [270, 50], [280, 120], [240, 172], [196, 186, undefined, 'c'], [244, 226], [252, 284], [210, 322], [130, 318], [50, 280], [0, 246, 'centro', 'cl']];
export function puffButterflyDefaults(): Params { return { ancho: 520, ...commonDefaults, vivo: 'si' }; }
export function generatePuffButterfly(ctx: GeneratorContext, params: Params): GeneratorResult {
  void ctx;
  const p = { ...puffButterflyDefaults(), ...params }, W = num(p, 'ancho'), c = setup(p, 0);
  if (isResult(c)) return c;
  if (!(W >= 380 && W <= 800)) return invalid('mariposa-alas-medidas', 'El ancho va de 38 a 80 cm.');
  const k = W / 560, t: ToyScale = { k, sa: c.sa, felt: false }, o = out0('Cojín mariposa de alas rellenas');
  const wing = plush('ala', 'Ala (4: dos pares en espejo, delantera y trasera de cada ala)', WING3D, t, { qty: 4, mirrorPairs: true, labels: { centro: 'Centro: queda abierto para rellenar y se une con la otra ala' } });
  const center = runLength(wing, 'centro'), bandW = 70 * k, bandL = 2 * (0.45 * center + 60 * k) + 30;
  const band = rectangle('banda', 'Banda central (doblar a lo largo)', bandL, 2 * bandW, [edge('canto', 'Canto', 'costura', c.sa), edge('extremo', 'Extremo', 'costura', c.sa), edge('canto-b', 'Canto', 'costura', c.sa), edge('extremo-b', 'Extremo', 'costura', c.sa)], { qty: 1, fabric: 'contraste' }, true);
  band.lines.push({ id: 'doblez', kind: 'doblez', a: P(0, bandW), b: P(bandL, bandW), label: 'Doblar a lo largo' });
  o.pieces.push(wing, band);
  finishCushion(perimeterOfRuns([[wing, 'contorno']], 2), { ...c, zip: false }, o, { name: 'dos alas' });
  o.notices.push({ level: 'ok', code: 'mariposa-alas', message: `Cada ala mide ${cm(280 * k)} × ${cm(322 * k)} con un centro recto de ${cm(center)}. La banda se ajusta apretando el centro antes de cerrarla.` });
  o.materials.push(fabricMat('Terciopelo'), { id: 'contraste', label: 'Lino o terciopelo crema para la banda', qty: 'Retal' }, stuffing(2 * seamArea(wing), 30), thread);
  return result(o, {
    checks: [{ key: 'ancho', label: 'Envergadura', target: W, measured: 560 * k, tolerance: 0.04 * W }],
    assumptions: ['Referencia: cortar 4 alas (2 por lado) con el centro recto y una banda larga con el hilo a lo largo.'],
    steps: [
      { id: 'alas', title: 'Alas', detail: `${c.vivo ? 'Hilvana el vivo alrededor de un ala de cada par. ' : ''}Cose cada par alrededor dejando abierto el centro, piquetea la entrada entre lóbulos, voltea y rellena.`, pieces: ['ala'] },
      { id: 'unir', title: 'Une y ajusta', detail: 'Cierra el centro de cada ala, únelas por el centro con puntadas fuertes, frunce un poco el centro y envuélvelo con la banda doblada, cerrándola por detrás a punto escondido.', pieces: ['banda'] }
    ]
  });
}

// ================================================================== Registro
const gen = (id: string, name: string, summary: string, defaults: () => Params, generate: PatternGenerator['generate'], params: ParamDef[]): PatternGenerator =>
  ({ id, name, status: 'experimental', summary, requiredMeasures: [], optionalMeasures: [], defaults, generate, params });
export const CUSHION_GENERATORS: PatternGenerator[] = [
  gen('cojin-pino', 'Cojín pino al doblez', 'Pino de tres pisos de 49 cm al doblez, con tronco y vivo opcional.', pineDefaults, generatePine, [sizeParam('alto', 'Alto del pino', 250, 900), ...commonParams({ fuelle: 100 })]),
  gen('cojin-hipocampo', 'Cojín hipocampo de cuerpo largo', 'Hipocampo para abrazar con cresta, cola en gancho, aleta y pespuntes de compartimento.', seahorseDefaults, generateSeahorse, [sizeParam('alto', 'Alto del hipocampo', 450, 1100), choice('aleta', 'Aleta', [['si', 'Con aleta'], ['no', 'Sin aleta']]), choice('compartimentos', 'Pespuntes de compartimento', [['si', 'Sí, para que el relleno no baje'], ['no', 'No']]), ...commonParams()]),
  gen('cojin-lactancia', 'Cojín de lactancia en U', 'U de 70 × 52 cm con brazos de 22 cm, funda con cremallera y fuelle opcional.', nursingDefaults, generateNursing, [sizeParam('ancho', 'Ancho total', 500, 900), sizeParam('alto', 'Alto total', 270, 750), sizeParam('brazo', 'Ancho del brazo', 150, 300), ...commonParams({ fuelle: 120 })]),
  gen('puf-conejo', 'Puf conejo en arco', 'Puf de 60 × 40 × 30 cm con testeros en arco, envolvente, base con cremallera, orejas y cola.', bunnyPoufDefaults, generateBunnyPouf, [sizeParam('largo', 'Largo', 400, 1000), sizeParam('ancho', 'Ancho', 300, 700), sizeParam('alto', 'Alto', 190, 700), ...commonParams()]),
  gen('puf-pera-conejo', 'Puf pera con orejas', 'Puf pera de banda y costados en gota con base redonda y orejas de conejo.', bunnyBeanDefaults, generateBunnyBean, [sizeParam('alto', 'Alto del costado', 340, 1000), ...commonParams()]),
  gen('cojin-sillon', 'Sillón cojín plegable', 'Cuadrados, cabecero y brazos en triángulo que se pliegan en sillón o colchoneta.', loungerDefaults, generateLounger, [sizeParam('lado', 'Lado del módulo', 250, 700), ...commonParams({ fuelle: 150 })]),
  gen('cojin-pato', 'Cojín pato redondo', 'Pato de cuerpo en huevo con fuelle, alas, patas palmeadas y pico relleno.', duckDefaults, generateDuck, [sizeParam('alto', 'Alto del cuerpo', 250, 700), ...commonParams({ fuelle: 200 })]),
  gen('cojin-arbol', 'Árbol de Navidad con patas', 'Árbol de pisos redondeados con estrella, cara bordada y patas con suela.', xmasTreeDefaults, generateXmasTree, [sizeParam('alto', 'Alto del árbol', 250, 600), ...commonParams({ fuelle: 80 })]),
  gen('cojin-estrella', 'Cojín estrella', 'Estrella de cinco puntas, sola o con brazos y piernas largas, lazo y cara bordada.', starDefaults, generateStar, [sizeParam('alto', 'Alto de la estrella', 180, 700), choice('extremidades', 'Brazos y piernas', [['si', 'Con brazos y piernas largas'], ['no', 'Solo la estrella']]), choice('lazo', 'Lazo', [['si', 'Con lazo'], ['no', 'Sin lazo']]), choice('cara', 'Cara bordada', [['si', 'Sí'], ['no', 'No']]), ...commonParams({ fuelle: 80 })]),
  gen('cojin-conejo-redondo', 'Cojín conejo redondo', 'Cabeza redonda con orejas forradas y lazo; en disco o en bola de gajos.', roundBunnyDefaults, generateRoundBunny, [sizeParam('diametro', 'Diámetro de la cabeza', 250, 550), choice('forma', 'Forma', [['disco', 'Disco (como la referencia)'], ['bola', 'Bola de 6 gajos']]), choice('lazo', 'Lazo', [['si', 'Con lazo'], ['no', 'Sin lazo']]), ...commonParams({ fuelle: 120 })]),
  gen('cojin-mariposa-volante', 'Cojín mariposa con volante', 'Mariposa de dos alas con cuerpo relleno, antenas y volante de encaje o de tela.', laceButterflyDefaults, generateLaceButterfly, [sizeParam('ancho', 'Envergadura', 400, 900), choice('volante', 'Volante', [['encaje', 'Puntilla de encaje'], ['tela', 'Volante de tela'], ['no', 'Sin volante']]), ...commonParams()]),
  gen('cojin-abeja', 'Cojín abeja de franjas', 'Abeja de cabeza y franjas cortadas de una silueta, alas rellenas y antenas.', beeDefaults, generateBee, [sizeParam('alto', 'Alto de la abeja', 320, 700), { key: 'franjas', label: 'Número de franjas', group: 'diseno', type: 'ratio', min: 2, max: 6 }, choice('antenas', 'Antenas', [['tela', 'De tela con bolita'], ['bordadas', 'Bordadas (bebés)']]), ...commonParams()]),
  gen('cojin-manzana', 'Cojín manzana', 'Manzana con hoyuelos, tallo enrollado y hoja de tela o fieltro.', appleDefaults, generateApple, [sizeParam('ancho', 'Ancho de la manzana', 250, 700), choice('hoja', 'Hoja', [['tela', 'De tela (2 piezas)'], ['fieltro', 'De fieltro (1 pieza)']]), ...commonParams({ fuelle: 120 })]),
  gen('cojin-nube', 'Cojín nube', 'Nube grande, mediana o pequeña.', cloudDefaults, generateCloud, [choice('forma', 'Forma', [['grande', 'Grande'], ['mediana', 'Mediana'], ['pequena', 'Pequeña']]), sizeParam('ancho', 'Ancho de la nube', 250, 800), ...commonParams({ fuelle: 120 })]),
  gen('cojin-hongo', 'Cojín hongo', 'Hongo de sombrero y pie en dos telas con lunares de fieltro.', mushroomDefaults, generateMushroom, [sizeParam('alto', 'Alto del hongo', 300, 700), choice('lunares', 'Lunares', [['si', 'Con lunares de fieltro'], ['no', 'Sin lunares']]), ...commonParams({ fuelle: 100 })]),
  gen('cojin-bellota', 'Cojín bellota', 'Bellota de capucha y fruto unidos por una curva, con rabito.', acornDefaults, generateAcorn, [sizeParam('alto', 'Alto de la bellota', 280, 650), ...commonParams({ fuelle: 100 })]),
  gen('cojin-mariposa-alas', 'Cojín mariposa de alas rellenas', 'Cuatro alas rellenas con vivo, unidas por el centro y ceñidas con una banda.', puffButterflyDefaults, generatePuffButterfly, [sizeParam('ancho', 'Envergadura', 380, 800), pipingParam, cushionMargin])
];
