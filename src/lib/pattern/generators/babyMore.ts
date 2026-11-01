import { num, round1, str, type GeneratorContext, type GeneratorResult, type Params, type PatternGenerator } from '../generator';
import type { Issue, Piece, SeamRelation } from '../types';
import { K, P, arc, bindingStrip, clamp, cm, copyPiece, edge, equal, finite, invalid, len, lens, outline, rectangle, solve, type EdgeDef } from './kidsShared';
import { bloomerDefaults, generateBloomers, generateBonnet, generateBooties, generateBandanaBib } from './babyPlus';
import { bowPieces } from './kidsBlocks';
import { buttonTopDefaults, casingDressDefaults, generateButtonTop, generateCasingDress, generateHeadband, generatePeasant, generateRufflesRomper, headbandDefaults, peasantDefaults, rufflesRomperDefaults } from './kidsTops';
import { generatePants, pantsDefaults } from './pants';
import { generateTrapezeTop, trapezeTopDefaults } from './kidsBatch2';

/* Más prendas de bebé: peto (pelele corto u overol largo) con tirantes y
 * abertura de broches en piernas y entrepierna, gorro de punto con orejitas,
 * sombrero pescador y conjuntos que reúnen varios patrones reales. */

const small = (ctx: GeneratorContext) => ctx.kind === 'bebe' || ctx.kind === 'toddler';
const experimental = (code: string, what: string): Issue => ({ level: 'aviso', code, message: `${what} experimental: imprime al 100 %, comprueba la escala y cose una muestra antes de usarlo.` });

// ------------------------------------------------------------------ Peto de bebé
export function overallDefaults(ctx: GeneratorContext): Params {
  return { largo: 'corto', holgura: 80, anchoEntrepierna: ctx.kind === 'bebe' ? 70 : 80, anchoTirante: 22, margen: 8, dobladillo: 15 };
}

export function generateOverall(ctx: GeneratorContext, params: Params): GeneratorResult {
  const p = { ...overallDefaults(ctx), ...params }, b = ctx.body;
  if (!small(ctx)) return invalid('peto-talla', 'Este peto se traza con medidas de bebé y 1–4 años sobre pañal. Elige una talla por meses o de 1–4 años.');
  const chest = b.pecho ?? 0, hips = b.cadera ?? 0, rise = b.tiro ?? 0, inseam = b.entrepierna ?? 0, talle = b.talleEspalda ?? 0, thigh = b.muslo ?? hips * .55, ankle = b.tobillo ?? 130;
  const longLeg = str(p, 'largo', 'corto') === 'largo', ease = num(p, 'holgura'), crotch = num(p, 'anchoEntrepierna'), strapW = num(p, 'anchoTirante'), sa = num(p, 'margen'), hem = num(p, 'dobladillo');
  if (!finite(chest, hips, rise, inseam, talle, ease, crotch, strapW, sa, hem) || chest < 300 || hips < 300 || rise < 80 || inseam < 100 || talle < 100 || ease < 40 || ease > 160 || crotch < 50 || crotch > 120 || strapW < 15 || strapW > 35 || sa < 5 || sa > 12 || hem < 10 || hem > 30)
    return invalid('peto-medidas', 'Revisa pecho, cadera, tiro, entrepierna y holgura.');
  const s = clamp(chest / 480, .8, 1.3);
  const Wq = (hips + ease) / 4, bw = chest * .16, hb = talle * .42, hipY = hb + rise * .55, yC = hb + rise + 25, cw = crotch / 2;
  const legTop = (thigh + 50) / 2, xo = Math.max(Wq + 5, cw + legTop);
  const legLen = longLeg ? inseam + 20 : 35 * s, yHem = yC + legLen;
  const hemHalf = longLeg ? Math.max(ankle * 1.6, legTop * 1.1) / 2 : legTop + 6 * s;
  const xmid = (xo + cw) / 2, xoh = xmid + hemHalf / 2, xih = xmid - hemHalf / 2;
  if (xih < 5 || bw >= Wq - 10) return invalid('peto-proporcion', 'El bajo de la pierna resulta demasiado ancho o el peto más ancho que el cuerpo. Revisa holgura y medidas.');
  const lower = (id: string, name: string, top: { pts: ReturnType<typeof P>[]; edges: EdgeDef[] }) => outline(id, name, [...top.pts, P(Wq, hb), P(Wq, hipY), P(xo, yC), P(xoh, yHem), P(xih, yHem), P(cw, yC), P(0, yC)], [
    ...top.edges, edge('costado-sup', 'Costado', 'costura', sa), edge('costado-med', 'Costado de la pierna', 'costura', sa, P(Wq, hipY + (yC - hipY) * .45), P(xo, yC - (yC - hipY) * .35)),
    edge('costado-inf', 'Costado de la pierna', 'costura', sa), edge('bajo', 'Bajo', 'dobladillo', hem), edge('abertura-pierna', 'Abertura de pierna (cinta de broches)', 'costura', sa),
    edge('abertura-entrepierna', 'Abertura de entrepierna (cinta de broches)', 'costura', sa), edge('centro', 'Centro (al doblez)', 'doblez', 0)], { onFold: true });
  const front = lower('delantero', 'Delantero con peto al doblez', { pts: [P(0, 0), P(bw, 0)], edges: [edge('peto-superior', 'Borde superior del peto (ribete)', 'sin-margen', 0), edge('peto-lado', 'Lado del peto (ribete)', 'sin-margen', 0, P(bw + (Wq - bw) * .1, hb * .55), P(Wq - (Wq - bw) * .25, hb))] });
  const backTop = hb * .5;
  const back = lower('espalda', 'Espalda al doblez', { pts: [P(0, backTop), P(Wq, backTop)], edges: [edge('espalda-superior', 'Borde superior de la espalda (ribete)', 'sin-margen', 0), edge('lado-superior', 'Lado superior (ribete)', 'sin-margen', 0)] });
  for (const piece of [front, back]) piece.grain = { a: P(Wq * .5, hb + 10), b: P(Wq * .5, yC - 10) };
  back.marks.push({ id: 'tirante', kind: 'cruz', at: P(Wq * .45, backTop + 12), label: 'Coser el tirante (cruzado al otro lado)' });
  front.marks.push({ id: 'broche-tirante-1', kind: 'boton', at: P(bw - 14 * s, 14 * s), label: 'Broche del tirante' }, { id: 'broche-tirante-2', kind: 'boton', at: P(bw - 14 * s, 38 * s), label: 'Segundo broche (para crecer)' });
  const strapL = talle * 1.15 + 80 * s;
  const strap = rectangle('tirante', 'Tirante (tubo doblado)', strapL, 2 * strapW, [edge('a', 'Canto largo', 'costura', sa), edge('b', 'Extremo con broche', 'costura', sa), edge('c', 'Canto largo', 'costura', sa), edge('d', 'Extremo que se cose a la espalda', 'costura', sa)], { qty: 2 }, true);
  strap.lines.push({ id: 'doblez', kind: 'doblez', a: P(0, strapW), b: P(strapL, strapW), label: 'Doblar a lo largo' });
  strap.marks.push({ id: 'broche', kind: 'boton', at: P(strapL - 15 * s, strapW / 2), label: 'Broche' });
  const pieces: Piece[] = [front, back, strap, bindingStrip('ribete-peto', 'Ribete del peto', 2 * len(front, 'peto-superior') + 2 * len(front, 'peto-lado'), 8, 1, 10), bindingStrip('ribete-espalda', 'Ribete de la espalda', 2 * len(back, 'espalda-superior') + 2 * len(back, 'lado-superior'), 8, 1, 10)];
  const opening = 2 * lens(front, ['abertura-pierna', 'abertura-entrepierna']);
  const seams: SeamRelation[] = [
    equal('costados', 'Costados: delantero con espalda', [{ pieceId: 'delantero', edgeIds: ['costado-sup', 'costado-med', 'costado-inf'] }], [{ pieceId: 'espalda', edgeIds: ['costado-sup', 'costado-med', 'costado-inf'] }]),
    equal('abertura', 'Abertura con cinta de broches: delantero y espalda', [{ pieceId: 'delantero', edgeIds: ['abertura-pierna', 'abertura-entrepierna'] }], [{ pieceId: 'espalda', edgeIds: ['abertura-pierna', 'abertura-entrepierna'] }]),
    equal('ribete-peto', 'Peto con su ribete', [{ pieceId: 'delantero', edgeIds: ['peto-superior', 'peto-lado'], factor: 2 }], [{ pieceId: 'ribete-peto', edgeIds: ['largo-superior'] }]),
    equal('ribete-espalda', 'Espalda con su ribete', [{ pieceId: 'espalda', edgeIds: ['espalda-superior', 'lado-superior'], factor: 2 }], [{ pieceId: 'ribete-espalda', edgeIds: ['largo-superior'] }])
  ];
  const legCirc = 2 * (xo - cw);
  return {
    pieces, seams,
    checks: [
      { key: 'cadera', label: 'Contorno sobre pañal', body: hips, ease, target: hips + ease, measured: 4 * Wq, tolerance: .5 },
      { key: 'pierna', label: 'Contorno de pierna en la entrepierna', body: thigh, ease: legCirc - thigh, target: legCirc, measured: 2 * (xo - cw), tolerance: .5 },
      { key: 'largo-pierna', label: 'Largo de pierna bajo la entrepierna', target: legLen, measured: yHem - yC, tolerance: .5 }
    ],
    materials: [
      { id: 'tela', label: 'Pana fina, gabardina ligera, mezclilla suave o lino', qty: 'Según acomodo', note: 'Prelava.' },
      { id: 'cinta-broches', label: 'Cinta de broches de presión (dos tiras que se superponen)', qty: `2 × ${cm(opening + 20)}`, note: 'Para abrir piernas y entrepierna al cambiar el pañal.' },
      { id: 'broches', label: 'Broches de presión infantiles', qty: '4 juegos (tirantes)' }, { id: 'bies', label: 'Bies de algodón de 8 mm', qty: cm(len(pieces[3], 'largo-superior') + len(pieces[4], 'largo-superior') + 40) },
      { id: 'hilo', label: 'Hilo de coser', qty: '1 carrete' }
    ],
    assumptions: [`${longLeg ? 'Overol de pierna larga' : 'Pelele de pierna corta'} con peto: delantero y espalda al doblez, cuerpo de ${cm(hips + ease)} sobre pañal.`, 'Piernas y entrepierna se abren con cinta de broches para cambiar el pañal; delantero y espalda tienen la misma abertura.', 'Los tirantes se cruzan en la espalda y se abrochan al peto con dos posiciones para crecer.'],
    notices: [legCirc < thigh + 30 ? { level: 'error', code: 'peto-pierna', message: 'La pierna queda justa en el muslo. Reduce el ancho de entrepierna o aumenta la holgura.' } : { level: 'ok', code: 'peto-pierna', message: `Pierna de ${cm(legCirc)} en la entrepierna.` }, experimental('peto-experimental', 'Peto de bebé')],
    steps: [
      { id: 'cortar', title: 'Corta las piezas', detail: 'Delantero y espalda al doblez, dos tirantes y los ribetes.', pieces: pieces.map(piece => piece.id) },
      { id: 'tirantes', title: 'Prepara los tirantes', detail: 'Dobla cada tirante a lo largo, cose el canto y un extremo, voltea y pespuntea. Coloca un broche en el extremo cerrado.', pieces: ['tirante'] },
      { id: 'costados', title: 'Cose los costados', detail: 'Une delantero y espalda por los costados, de la cintura al bajo. Termina los márgenes.', pieces: ['delantero', 'espalda'], seams: ['costados'] },
      { id: 'ribetes', title: 'Ribetea peto y espalda', detail: 'Hilvana los tirantes cruzados en la espalda sobre su marca. Ribetea el borde superior y los lados del peto y de la espalda atrapando los tirantes.', pieces: ['delantero', 'espalda', 'ribete-peto', 'ribete-espalda', 'tirante'], seams: ['ribete-peto', 'ribete-espalda'] },
      { id: 'abertura', title: 'Cinta de broches', detail: 'Cose una tira de la cinta de broches por toda la abertura del delantero (pierna, entrepierna, pierna) y la otra tira a la espalda, de modo que se superpongan al cerrar. Remata los extremos dentro del dobladillo.', pieces: ['delantero', 'espalda'], seams: ['abertura'] },
      { id: 'bajos', title: 'Bajos y broches', detail: `Dobladilla los bajos (${cm(hem)}). Coloca los broches del peto y prueba el largo de los tirantes sobre el bebé.`, pieces: ['delantero', 'espalda'] }
    ]
  };
}

export const overallGenerator: PatternGenerator = {
  id: 'peto-bebe', name: 'Peto de bebé con tirantes', status: 'experimental',
  summary: 'Pelele corto u overol largo con peto, tirantes cruzados y abertura de broches en piernas y entrepierna.',
  requiredMeasures: ['pecho', 'cadera', 'tiro', 'entrepierna', 'talleEspalda'], optionalMeasures: ['muslo', 'tobillo'],
  defaults: overallDefaults, generate: generateOverall,
  params: [
    { key: 'largo', label: 'Largo de pierna', group: 'diseno', type: 'choice', choices: [{ value: 'corto', label: 'Corto (pelele)' }, { value: 'largo', label: 'Largo (overol)' }] },
    { key: 'anchoEntrepierna', label: 'Ancho de entrepierna', group: 'diseno', type: 'length', min: 50, max: 120 },
    { key: 'anchoTirante', label: 'Ancho de tirante', group: 'diseno', type: 'length', min: 15, max: 35 },
    { key: 'holgura', label: 'Holgura sobre pañal', group: 'holgura', type: 'length', min: 40, max: 160 },
    { key: 'margen', label: 'Margen de costura', group: 'margenes', type: 'length', min: 5, max: 12 },
    { key: 'dobladillo', label: 'Dobladillo', group: 'margenes', type: 'length', min: 10, max: 30 }
  ]
};

// ------------------------------------------------------------- Gorro con orejitas
export function earHatDefaults(ctx: GeneratorContext): Params {
  const H = ctx.body.cabeza ?? 420;
  return { reduccion: .1, alto: round1(H * .4), doblez: round1(H * .1), orejas: 'oso', margen: 6 };
}

export function generateEarHat(ctx: GeneratorContext, params: Params): GeneratorResult {
  const p = { ...earHatDefaults(ctx), ...params }, H = ctx.body.cabeza ?? 0;
  const red = num(p, 'reduccion'), crownH = num(p, 'alto'), brim = num(p, 'doblez'), sa = num(p, 'margen'), ears = str(p, 'orejas', 'oso');
  if (!finite(H, red, crownH, brim, sa) || H < 300 || H > 620 || red < 0 || red > .25 || crownH < 80 || crownH > 300 || brim < 0 || brim > 100 || sa < 3 || sa > 10 || !['oso', 'gato', 'conejo'].includes(ears))
    return invalid('gorro-orejas-medidas', 'Revisa contorno de cabeza, alto y doblez.');
  const w = H * (1 - red) / 2, dome = w * .42, total = crownH + 2 * brim;
  const hat = outline('gorro', 'Gorro (delantero y trasero)', [P(0, total), P(0, dome), P(w / 2, 0), P(w, dome), P(w, total)], [
    edge('costado-izq', 'Costado', 'costura', sa), edge('copa-izq', 'Copa', 'costura', sa, P(0, dome * (1 - K)), P(w / 2 * (1 - K), 0)),
    edge('copa-der', 'Copa', 'costura', sa, P(w / 2 + w / 2 * K, 0), P(w, dome * (1 - K))), edge('costado-der', 'Costado', 'costura', sa), edge('borde', 'Borde del doblez', 'orillo', 0)], { qty: 2, fabric: 'punto-elastico' });
  hat.lines.push({ id: 'doblez', kind: 'doblez', a: P(0, total - brim), b: P(w, total - brim), label: 'Doblez del borde' });
  const copa = len(hat, 'copa-izq');
  for (const id of ['copa-izq', 'copa-der']) hat.notches.push({ id: `oreja-${id}`, edgeId: id, s: id === 'copa-izq' ? copa * .45 : copa * .55, count: 1, label: 'Centro de la oreja' });
  const ew = H * (ears === 'conejo' ? .09 : .12), eh = ew * (ears === 'conejo' ? 2.4 : ears === 'gato' ? 1.05 : .85);
  const earEdges = ears === 'gato'
    ? [edge('base', 'Base (entre las dos piezas del gorro)', 'costura', sa), edge('lado-der', 'Lado', 'costura', sa), edge('lado-izq', 'Lado', 'costura', sa)]
    : [edge('base', 'Base (entre las dos piezas del gorro)', 'costura', sa), edge('contorno-der', 'Contorno', 'costura', sa, P(ew, -eh * .55), P(ew * .78, -eh)), edge('contorno-izq', 'Contorno', 'costura', sa, P(ew * .22, -eh), P(0, -eh * .55))];
  const earPts = ears === 'gato' ? [P(0, 0), P(ew, 0), P(ew * .55, -eh)] : [P(0, 0), P(ew, 0), P(ew / 2, -eh)];
  const ear = outline('oreja', 'Oreja exterior', earPts, earEdges, { qty: 2, fabric: 'punto-elastico' });
  ear.grain = { a: P(ew / 2, -eh * .2), b: P(ew / 2, -eh * .7) };
  const inner = copyPiece(ear, 'oreja-interior', 'Oreja interior (contraste)', { fabric: 'contraste' });
  return {
    pieces: [hat, ear, inner],
    seams: [equal('costados', 'Costados y copa', [{ pieceId: 'gorro', edgeIds: ['costado-izq', 'copa-izq'] }], [{ pieceId: 'gorro', edgeIds: ['costado-der', 'copa-der'] }]),
      equal('orejas', 'Oreja exterior con interior', [{ pieceId: 'oreja', edgeIds: ear.edges.map(e => e.id) }], [{ pieceId: 'oreja-interior', edgeIds: inner.edges.map(e => e.id) }])],
    checks: [{ key: 'cabeza', label: 'Contorno del gorro', body: H, ease: -H * red, target: H * (1 - red), measured: 2 * w, tolerance: .5 }],
    materials: [{ id: 'punto', label: 'Punto elástico suave (rib, interlock o polar fino)', qty: `2 piezas de ${cm(w + 2 * sa)} × ${cm(total + sa)}` }, { id: 'contraste', label: 'Retazo de contraste para el interior de las orejas', qty: '2 piezas' }, { id: 'hilo', label: 'Hilo para punto', qty: '1 carrete' }],
    assumptions: [`Holgura negativa del ${Math.round(red * 100)} %: el gorro mide ${cm(2 * w)} para una cabeza de ${cm(H)}.`, `Orejas de ${ears}: se cosen dobladas dentro de la costura de la copa, en los piquetes.`],
    notices: [...(ctx.fabric !== 'punto' ? [{ level: 'aviso' as const, code: 'gorro-punto', message: 'Este gorro necesita tejido de punto elástico.' }] : []), { level: 'aviso', code: 'gorro-seguridad', message: 'No lo uses para dormir. Cose las orejas firmemente y comprueba que no se desprendan.' }, experimental('gorro-orejas-experimental', 'Gorro con orejitas')],
    steps: [
      { id: 'cortar', title: 'Corta las piezas', detail: 'Dos piezas de gorro con la elasticidad alrededor de la cabeza, dos orejas exteriores y dos interiores.', pieces: ['gorro', 'oreja', 'oreja-interior'] },
      { id: 'orejas', title: 'Arma las orejas', detail: 'Enfrenta cada oreja con su interior, cose el contorno dejando la base abierta, voltea y pespuntea. Dobla ligeramente la base hacia el centro.', pieces: ['oreja', 'oreja-interior'], seams: ['orejas'] },
      { id: 'coser', title: 'Une el gorro atrapando las orejas', detail: 'Coloca las orejas sobre la copa de una pieza en los piquetes, con el interior hacia el derecho. Pon la otra pieza encima y cose costados y copa con puntada elástica.', pieces: ['gorro', 'oreja'], seams: ['costados'] },
      { id: 'doblez', title: 'Dobla el borde', detail: 'Voltea y dobla el borde hacia afuera por la línea de doblez.', pieces: ['gorro'] }
    ]
  };
}

export const earHatGenerator: PatternGenerator = {
  id: 'gorro-orejas', name: 'Gorro de punto con orejitas', status: 'experimental',
  summary: 'Gorro de dos piezas con doblez y orejas de oso, gato o conejo cosidas en la copa.',
  requiredMeasures: ['cabeza'], optionalMeasures: [], defaults: earHatDefaults, generate: generateEarHat,
  params: [
    { key: 'orejas', label: 'Orejas', group: 'diseno', type: 'choice', choices: [{ value: 'oso', label: 'Oso' }, { value: 'gato', label: 'Gato' }, { value: 'conejo', label: 'Conejo' }] },
    { key: 'alto', label: 'Alto de la copa', group: 'diseno', type: 'length', min: 80, max: 300 },
    { key: 'doblez', label: 'Alto del doblez', group: 'diseno', type: 'length', min: 0, max: 100 },
    { key: 'reduccion', label: 'Reducción por elasticidad', group: 'holgura', type: 'ratio', min: 0, max: .25 },
    { key: 'margen', label: 'Margen de costura', group: 'margenes', type: 'length', min: 3, max: 10 }
  ]
};

// ------------------------------------------------------------ Sombrero pescador
export function bucketDefaults(ctx: GeneratorContext): Params {
  const H = ctx.body.cabeza ?? 560, s = clamp(H / 570, .6, 1.1);
  return { holgura: 15, altoCopa: round1(75 * s), anchoAla: round1(62 * s), caida: .75, barbiquejo: small(ctx) ? 'si' : 'no', lazo: 'no', margen: 7 };
}

/** Cone sector (two arcs split in halves): inner/outer circumferences and slant width. */
function coneSector(id: string, name: string, inner: number, outer: number, width: number, innerEdge: [string, string], outerEdge: [string, string], innerFinish: 'costura', outerFinish: 'costura' | 'dobladillo', sa: number, qty: number, fabric: Piece['cut']['fabric'] = 'principal', parts = 2): Piece {
  // Each piece covers 1/parts of the full ring; radii follow from the circumferences.
  const r1 = width * inner / (outer - inner), r2 = r1 + width, theta = inner / r1 / parts;
  const a0 = Math.PI / 2 - theta / 2, a1 = Math.PI / 2 + theta / 2, mid = Math.PI / 2, O = P(0, 0);
  const i1 = arc(O, r1, a0, mid), i2 = arc(O, r1, mid, a1), o1 = arc(O, r2, a1, mid), o2 = arc(O, r2, mid, a0);
  const piece = outline(id, name, [i1.start, i1.end, i2.end, o1.start, o1.end, o2.end], [
    edge(innerEdge[0], innerEdge[1], innerFinish, sa, i1.c1, i1.c2), edge(`${innerEdge[0]}-b`, innerEdge[1], innerFinish, sa, i2.c1, i2.c2),
    edge('lado-b', 'Lado (une la otra mitad)', 'costura', sa), edge(outerEdge[0], outerEdge[1], outerFinish, sa, o1.c1, o1.c2),
    edge(`${outerEdge[0]}-b`, outerEdge[1], outerFinish, sa, o2.c1, o2.c2), edge('lado-a', 'Lado (une la otra mitad)', 'costura', sa)], { qty, fabric });
  piece.grain = { a: P(0, r1 + width * .2), b: P(0, r2 - width * .2) };
  return piece;
}

export function generateBucket(ctx: GeneratorContext, params: Params): GeneratorResult {
  const p = { ...bucketDefaults(ctx), ...params }, H = ctx.body.cabeza ?? 0;
  const ease = num(p, 'holgura'), hc = num(p, 'altoCopa'), wb = num(p, 'anchoAla'), droop = num(p, 'caida'), sa = num(p, 'margen'), strap = str(p, 'barbiquejo', 'no') === 'si';
  if (!finite(H, ease, hc, wb, droop, sa) || H < 300 || H > 650 || ease < 0 || ease > 40 || hc < 40 || hc > 120 || wb < 30 || wb > 110 || droop < .5 || droop > .95 || sa < 5 || sa > 10)
    return invalid('sombrero-medidas', 'Revisa contorno de cabeza, alto de copa, ancho y caída del ala.');
  const C1 = H + ease, Ct = C1 * .86, a = Ct / (2 * Math.PI) * 1.08, bAx = Ct / (2 * Math.PI) * .925;
  // Oval top: solve the semi-axes so its perimeter matches the band top exactly.
  const ovalFor = (k: number) => { const A = a * k, B = bAx * k; return outline('copa', 'Copa superior', [P(A, 0), P(0, B), P(-A, 0), P(0, -B)], [
    edge('contorno-1', 'Contorno', 'costura', sa, P(A, B * K), P(A * K, B)), edge('contorno-2', 'Contorno', 'costura', sa, P(-A * K, B), P(-A, B * K)),
    edge('contorno-3', 'Contorno', 'costura', sa, P(-A, -B * K), P(-A * K, -B)), edge('contorno-4', 'Contorno', 'costura', sa, P(A * K, -B), P(A, -B * K))]); };
  const top = ovalFor(solve(k => lens(ovalFor(k), ['contorno-1', 'contorno-2', 'contorno-3', 'contorno-4']), Ct, .5, 1.5));
  top.grain = { a: P(0, -bAx * .5), b: P(0, bAx * .5) };
  const band = coneSector('banda', 'Banda de la copa (mitad)', Ct, C1, hc, ['superior', 'Une la copa'], ['inferior', 'Une el ala'], 'costura', 'costura', sa, 2);
  const brimOuter = C1 + 2 * Math.PI * wb * droop;
  const brim = coneSector('ala', 'Ala (mitad)', C1, brimOuter, wb, ['interior', 'Une la banda'], ['canto', 'Canto del ala'], 'costura', 'costura', sa, 2);
  const pieces: Piece[] = [top, copyPiece(top, 'copa-forro', 'Copa superior (forro)', { fabric: 'forro' }), band, copyPiece(band, 'banda-forro', 'Banda (forro, mitad)', { qty: 2, fabric: 'forro' }), brim, copyPiece(brim, 'ala-forro', 'Ala (reverso, mitad)', { qty: 2, fabric: 'forro' })];
  if (strap) {
    const tab = rectangle('barbiquejo', 'Barbiquejo (dos caras)', H * .2, 24, [edge('a', 'Canto', 'costura', sa), edge('b', 'Extremo con broche', 'costura', sa), edge('c', 'Canto', 'costura', sa), edge('d', 'Extremo que se cose', 'costura', sa)], { qty: 4 }, true);
    tab.marks.push({ id: 'broche', kind: 'boton', at: P(H * .2 - 12, 12), label: 'Broche (una mitad en cada lado)' });
    pieces.push(tab);
  }
  const bow = str(p, 'lazo', 'no') === 'si';
  if (bow) {
    const sb = clamp(H / 570, .6, 1.1);
    pieces.push(...bowPieces('', 55 * sb, 18 * sb, sa, 'principal'));
    band.marks.push({ id: 'lazo', kind: 'cruz', at: P(band.nodes[1].x, (band.nodes[1].y + band.nodes[4].y) / 2), label: 'Lazo decorativo cosido fijo (en un lado)' });
  }
  const both = (id: string, ids: string[]) => ({ pieceId: id, edgeIds: ids, factor: 2 });
  return {
    pieces,
    seams: [
      equal('copa', 'Copa superior con la banda', [{ pieceId: 'copa', edgeIds: ['contorno-1', 'contorno-2', 'contorno-3', 'contorno-4'] }], [both('banda', ['superior', 'superior-b'])], 1),
      equal('ala', 'Banda con el ala', [both('banda', ['inferior', 'inferior-b'])], [both('ala', ['interior', 'interior-b'])], 1),
      equal('banda-lados', 'Lados de la banda', [{ pieceId: 'banda', edgeIds: ['lado-a'] }], [{ pieceId: 'banda', edgeIds: ['lado-b'] }]),
      equal('ala-lados', 'Lados del ala', [{ pieceId: 'ala', edgeIds: ['lado-a'] }], [{ pieceId: 'ala', edgeIds: ['lado-b'] }])
    ],
    checks: [{ key: 'contorno', label: 'Contorno interior del sombrero', body: H, ease, target: C1, measured: 2 * lens(band, ['inferior', 'inferior-b']), tolerance: 1 }],
    materials: [{ id: 'tela', label: 'Algodón, lino, mezclilla ligera o lona', qty: 'Copa, banda y ala' }, { id: 'reverso', label: 'Tela de reverso (puede ser otro estampado: sombrero reversible)', qty: 'Copa, banda y ala' },
      { id: 'entretela', label: 'Entretela para el ala', qty: 'Dos mitades de ala' }, ...(strap ? [{ id: 'broche', label: 'Broche de presión infantil', qty: '1 juego' }] : []), { id: 'hilo', label: 'Hilo de coser', qty: '1 carrete' }],
    assumptions: [`Contorno interior ${cm(C1)} (cabeza + ${cm(ease)}). La copa es oval y su contorno se resuelve para coincidir con la banda.`, `Ala de ${cm(wb)} con caída ${Math.round(droop * 100)} %: es un cono, no un aro plano.`],
    notices: [...(strap ? [{ level: 'aviso' as const, code: 'barbiquejo', message: 'El barbiquejo se cierra con broche; no lo cambies por cintas largas y quita el sombrero para dormir.' }] : []), experimental('sombrero-experimental', 'Sombrero pescador')],
    steps: [
      { id: 'cortar', title: 'Corta exterior y reverso', detail: 'Copa, dos mitades de banda y dos mitades de ala en cada tela; entretela en el ala exterior.', pieces: pieces.map(piece => piece.id) },
      { id: 'armar', title: 'Arma cada sombrero', detail: 'Une los lados de la banda y del ala. Cose la banda a la copa repartiendo por cuartos y después el ala a la banda. Repite con el reverso.', pieces: ['copa', 'banda', 'ala', 'copa-forro', 'banda-forro', 'ala-forro'], seams: ['copa', 'ala', 'banda-lados', 'ala-lados'] },
      { id: 'unir', title: 'Une exterior y reverso', detail: `Mete un sombrero dentro del otro derecho con derecho${strap ? ' con el barbiquejo hilvanado a los lados' : ''}, cose el canto del ala dejando una abertura, voltea, cierra y pespuntea el ala en círculos cada 8–10 mm.`, pieces: ['ala', 'ala-forro', ...(strap ? ['barbiquejo'] : [])] },
      ...(bow ? [{ id: 'lazo', title: 'Lazo decorativo', detail: 'Arma el lazo y cóselo a mano sobre la banda, en un lado. El sombrero deja de ser reversible por ese lado.', pieces: ['lazo', 'lazo-colas', 'lazo-nudo', 'banda'] }] : [])
    ]
  };
}

export const bucketGenerator: PatternGenerator = {
  id: 'sombrero-pescador', name: 'Sombrero pescador reversible', status: 'experimental',
  summary: 'Sombrero bucket de copa oval, banda cónica y ala con caída; reversible y con barbiquejo opcional para bebé.',
  requiredMeasures: ['cabeza'], optionalMeasures: [], defaults: bucketDefaults, generate: generateBucket,
  params: [
    { key: 'altoCopa', label: 'Alto de la banda', group: 'diseno', type: 'length', min: 40, max: 120 },
    { key: 'anchoAla', label: 'Ancho del ala', group: 'diseno', type: 'length', min: 30, max: 110 },
    { key: 'caida', label: 'Caída del ala', group: 'diseno', type: 'ratio', min: .5, max: .95 },
    { key: 'barbiquejo', label: 'Barbiquejo con broche', group: 'diseno', type: 'choice', choices: [{ value: 'no', label: 'Sin barbiquejo' }, { value: 'si', label: 'Con barbiquejo' }] },
    { key: 'lazo', label: 'Lazo decorativo', group: 'diseno', type: 'choice', choices: [{ value: 'no', label: 'Sin lazo' }, { value: 'si', label: 'Con lazo' }] },
    { key: 'holgura', label: 'Holgura de cabeza', group: 'holgura', type: 'length', min: 0, max: 40 },
    { key: 'margen', label: 'Margen de costura', group: 'margenes', type: 'length', min: 5, max: 10 }
  ]
};

// ------------------------------------------------------------------ Conjuntos
type Part = { prefix: string; label: string; generate: (ctx: GeneratorContext, p: Params) => GeneratorResult; defaults: (ctx: GeneratorContext) => Params; params: Params; ctx?: Partial<GeneratorContext> };
export const SETS: Record<string, { name: string; parts: Part[] }> = {
  verano: { name: 'Conjunto de verano: pelele y sombrero pescador', parts: [
    { prefix: 'pelele', label: 'Pelele', generate: generateOverall, defaults: overallDefaults, params: { largo: 'corto' } },
    { prefix: 'sombrero', label: 'Sombrero', generate: generateBucket, defaults: bucketDefaults, params: { barbiquejo: 'si' } }] },
  invierno: { name: 'Conjunto de invierno: overol y gorro con orejitas', parts: [
    { prefix: 'overol', label: 'Overol', generate: generateOverall, defaults: overallDefaults, params: { largo: 'largo' } },
    { prefix: 'gorro', label: 'Gorro', generate: generateEarHat, defaults: earHatDefaults, params: { orejas: 'oso' }, ctx: { fabric: 'punto', stretch: 30 } }] },
  'recien-nacido': { name: 'Conjunto de recién nacido: bonete, patucos y babero', parts: [
    { prefix: 'bonete', label: 'Bonete', generate: generateBonnet, defaults: () => ({}), params: {} },
    { prefix: 'patucos', label: 'Patucos', generate: generateBooties, defaults: () => ({}), params: {} },
    { prefix: 'babero', label: 'Babero', generate: generateBandanaBib, defaults: () => ({}), params: {} }] },
  vestido: { name: 'Conjunto de vestido con jaretas y cubrepañal con olanes', parts: [
    { prefix: 'vestido', label: 'Vestido', generate: generateCasingDress, defaults: casingDressDefaults, params: { lazo: 'si' } },
    { prefix: 'cubrepanal', label: 'Cubrepañal', generate: generateBloomers, defaults: bloomerDefaults, params: { olanes: 'si', lazo: 'si' } }] },
  'pelele-diadema': { name: 'Pelele de volantes y diadema con lazo', parts: [
    { prefix: 'pelele', label: 'Pelele', generate: generateRufflesRomper, defaults: rufflesRomperDefaults, params: { tirantes: 'si' } },
    { prefix: 'diadema', label: 'Diadema', generate: generateHeadband, defaults: headbandDefaults, params: {}, ctx: { fabric: 'punto', stretch: 40 } }] },
  campesino: { name: 'Blusa campesina y short abullonado', parts: [
    { prefix: 'blusa', label: 'Blusa', generate: generatePeasant, defaults: peasantDefaults, params: { manga: 'corta', volante: 'si' } },
    { prefix: 'short', label: 'Short', generate: generatePants, defaults: c => bubbleShortDefaults(c), params: {} }] },
  rayas: { name: 'Blusa con botones y pantalón bombacho', parts: [
    { prefix: 'blusa', label: 'Blusa', generate: generateButtonTop, defaults: buttonTopDefaults, params: {} },
    { prefix: 'pantalon', label: 'Pantalón', generate: generatePants, defaults: c => ({ ...pantsDefaults(c), estilo: 'bombacho' }), params: {} }] },
  trapecio: { name: 'Blusa trapecio y cubrepañal', parts: [
    { prefix: 'blusa', label: 'Blusa', generate: generateTrapezeTop, defaults: trapezeTopDefaults, params: {} },
    { prefix: 'cubrepanal', label: 'Cubrepañal', generate: generateBloomers, defaults: bloomerDefaults, params: {} }] },
  vichy: { name: 'Blusa trapecio con volante y pantalón ancho capri', parts: [
    { prefix: 'blusa', label: 'Blusa', generate: generateTrapezeTop, defaults: trapezeTopDefaults, params: { volanteBajo: 'si' } },
    { prefix: 'pantalon', label: 'Pantalón', generate: generatePants, defaults: c => ({ ...pantsDefaults(c), estilo: 'ancho', corte: 'capri' }), params: {} }] }
};

/** Short bombacho: hem as wide as the leg, elastic casing with a small frill. */
export function bubbleShortDefaults(ctx: GeneratorContext): Params {
  const d = pantsDefaults(ctx), b = ctx.body, H = b.cadera ?? 500, he = H + num(d, 'holguraCadera') + num(d, 'panal') * 1.2;
  // Leg length starts below the eased rise (with diaper): a minimum inseam keeps both legs drafted.
  const rise = (b.tiro ?? 150) + num(d, 'holguraTiro') + num(d, 'panal');
  return { ...d, estilo: 'bombacho', largo: round1(rise + Math.max(50, (b.entrepierna ?? 250) * .28)), bajo: round1(he * (.5 + 1 / 16 + 1 / 10) * .92), volantito: 12 };
}

/** Merges real patterns, prefixing every id so pieces, seams and steps stay traceable. */
export function generateSet(ctx: GeneratorContext, params: Params): GeneratorResult {
  const set = SETS[str(params, 'conjunto', 'verano')];
  if (!set) return invalid('conjunto', 'Elige un conjunto de la lista.');
  if (!small(ctx)) return invalid('conjunto-talla', 'Los conjuntos de bebé usan tallas por meses o de 1–4 años.');
  const out: GeneratorResult = { pieces: [], seams: [], checks: [], materials: [], steps: [], assumptions: [], notices: [] };
  for (const part of set.parts) {
    const c = { ...ctx, ...part.ctx }, r = part.generate(c, { ...part.defaults(c), ...part.params });
    const id = (x: string) => `${part.prefix}-${x}`;
    if (!r.pieces.length) return { ...out, pieces: [], notices: r.notices.map(n => ({ ...n, message: `${part.label}: ${n.message}` })) };
    out.pieces.push(...r.pieces.map(piece => ({ ...piece, id: id(piece.id), name: `${part.label} · ${piece.name}` })));
    out.seams.push(...r.seams.map(seam => ({ ...seam, id: id(seam.id), label: `${part.label}: ${seam.label}`, a: seam.a.map(side => ({ ...side, pieceId: id(side.pieceId) })), b: seam.b.map(side => ({ ...side, pieceId: id(side.pieceId) })) })));
    out.checks.push(...r.checks.map(check => ({ ...check, key: id(check.key), label: `${part.label}: ${check.label}` })));
    out.materials.push(...r.materials.map(m => ({ ...m, id: id(m.id), label: `${part.label}: ${m.label}` })));
    out.steps.push(...r.steps.map(step => ({ ...step, id: id(step.id), title: `${part.label}: ${step.title}`, pieces: step.pieces.map(id), ...(step.seams ? { seams: step.seams.map(id) } : {}) })));
    out.assumptions.push(...r.assumptions.map(a => `${part.label}: ${a}`));
    out.notices.push(...r.notices.filter(n => !/experimental/.test(n.code)).map(n => ({ ...n, code: id(n.code), message: `${part.label}: ${n.message}` })));
  }
  out.notices.push(experimental('conjunto-experimental', 'Conjunto'));
  out.assumptions.unshift(`${set.name}. Cada prenda conserva su propio patrón, comprobaciones y pasos; se cortan y cosen por separado.`);
  return out;
}

export const setGenerator: PatternGenerator = {
  id: 'conjunto-bebe', name: 'Conjuntos de bebé', status: 'experimental',
  summary: 'Reúne patrones reales de bebé en un solo proyecto: pelele y sombrero, overol y gorro, o bonete, patucos y babero.',
  requiredMeasures: ['pecho', 'cadera', 'tiro', 'entrepierna', 'talleEspalda', 'cabeza', 'cuello'], optionalMeasures: ['estatura', 'muslo', 'tobillo'],
  defaults: () => ({ conjunto: 'verano' }), generate: generateSet,
  params: [{ key: 'conjunto', label: 'Conjunto', group: 'diseno', type: 'choice', choices: Object.entries(SETS).map(([value, set]) => ({ value, label: set.name })) }]
};

export const BABY_MORE_GENERATORS = [overallGenerator, earHatGenerator, bucketGenerator, setGenerator];
