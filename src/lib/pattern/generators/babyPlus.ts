import { num, round1, str, type GeneratorContext, type GeneratorResult, type Params, type PatternGenerator } from '../generator';
import type { Issue, Piece, SeamRelation } from '../types';
import { K, P, arc, bindingStrip, clamp, cm, copyPiece, cubicPoint, edge, equal, finite, invalid, len, lens, outline, rectangle, solve } from './kidsShared';

/* Colección de bebé: prendas y accesorios con construcción propia.
 * Medidas sobre pañal; sin cordones largos ni piezas pequeñas sueltas. */

const babyKinds = ['bebe', 'toddler'];
const experimental = (code: string, what: string): Issue => ({ level: 'aviso', code, message: `${what} experimental: imprime al 100 %, comprueba la escala y cose una muestra antes de usarlo.` });
const notBaby = (code: string) => invalid(code, 'Este patrón se traza con proporciones de bebé y primera infancia. Elige una talla por meses o de 1–4 años.');
const allEdges = (piece: Piece) => piece.edges.map(e => e.id);

// ------------------------------------------------------------- Cubrepañal
export function bloomerDefaults(ctx: GeneratorContext): Params {
  return { olanes: 'no', holgura: 80, anchoEntrepierna: ctx.kind === 'bebe' ? 70 : 80, anchoElasticoCintura: 15, anchoElasticoPierna: 6, proporcionElastico: .92, margen: 8 };
}

export function generateBloomers(ctx: GeneratorContext, params: Params): GeneratorResult {
  const p = { ...bloomerDefaults(ctx), ...params }, b = ctx.body;
  const hips = b.cadera ?? 0, waist = b.cintura ?? 0, rise = b.tiro ?? 0, thigh = b.muslo ?? 0;
  const ease = num(p, 'holgura'), crotch = num(p, 'anchoEntrepierna'), ew = num(p, 'anchoElasticoCintura'), lw = num(p, 'anchoElasticoPierna'), er = num(p, 'proporcionElastico'), sa = num(p, 'margen');
  const ruffles = str(p, 'olanes', 'no') === 'si';
  if (!babyKinds.includes(ctx.kind)) return notBaby('cubrepanal-talla');
  if (!finite(hips, waist, rise, thigh, ease, crotch, ew, lw, er, sa) || hips < 300 || hips > 750 || waist < 300 || rise < 80 || rise > 260 || thigh < 150
    || ease < 40 || ease > 160 || crotch < 50 || crotch > 120 || ew < 10 || ew > 25 || lw < 4 || lw > 12 || er < .8 || er > 1 || sa < 5 || sa > 12)
    return invalid('cubrepanal-medidas', 'Revisa cadera sobre pañal, tiro, muslo, holgura y elásticos.');
  const halfF = (hips + ease) / 4, halfB = halfF + 10, side = Math.max(40, rise * .4), riseF = rise + 20, riseB = rise + 45, cw = crotch / 2, casing = ew + 5;
  const half = (id: string, name: string, w: number, depth: number, back: boolean) => {
    const c1 = P(w - (w - cw) * (back ? .5 : .55), side + (depth - side) * (back ? .1 : .08)), c2 = P(cw + 2, depth - (depth - side) * (back ? .4 : .45));
    const piece = outline(id, name, [P(0, 0), P(w, 0), P(w, side), P(cw, depth), P(0, depth)], [
      edge('cintura', 'Cintura con jareta', 'jareta', casing + 10), edge('costado', 'Costado', 'costura', sa),
      edge('pierna', 'Abertura de pierna (bies con elástico)', 'sin-margen', 0, c1, c2), edge('entrepierna', 'Entrepierna', 'costura', sa),
      edge('centro', back ? 'Centro trasero (al doblez)' : 'Centro delantero (al doblez)', 'doblez', 0)
    ], { onFold: true });
    piece.lines.push({ id: 'pespunte-jareta', kind: 'pespunte', a: P(0, casing), b: P(w, casing), label: 'Pespunte de jareta' });
    piece.grain = { a: P(cw * .7, casing + 15), b: P(cw * .7, depth - 15) };
    return piece;
  };
  const front = half('delantero', 'Delantero al doblez', halfF, riseF, false), back = half('espalda', 'Espalda al doblez', halfB, riseB, true);
  const legLoop = len(front, 'pierna') + len(back, 'pierna');
  const pieces: Piece[] = [front, back, bindingStrip('bies-pierna', 'Bies de pierna (canal del elástico)', legLoop, lw + 3, 2, 0)];
  const seams: SeamRelation[] = [
    equal('costados', 'Costados', [{ pieceId: 'delantero', edgeIds: ['costado'] }], [{ pieceId: 'espalda', edgeIds: ['costado'] }]),
    equal('entrepierna', 'Entrepierna', [{ pieceId: 'delantero', edgeIds: ['entrepierna'] }], [{ pieceId: 'espalda', edgeIds: ['entrepierna'] }]),
    equal('ribete-pierna', 'Cada pierna con su bies', [{ pieceId: 'delantero', edgeIds: ['pierna'] }, { pieceId: 'espalda', edgeIds: ['pierna'] }], [{ pieceId: 'bies-pierna', edgeIds: ['largo-superior'] }])
  ];
  const checks = [
    { key: 'contorno-cintura', label: 'Contorno de cintura antes del elástico', body: hips, ease, target: hips + ease + 20, measured: 2 * front.nodes[1].x + 2 * back.nodes[1].x, tolerance: .5 },
    { key: 'tiro-trasero', label: 'Tiro trasero sobre pañal', target: riseB, measured: back.nodes[3].y, tolerance: .5 }
  ];
  if (ruffles) {
    const leg = back.edges[2], from = back.nodes[2], to = back.nodes[3];
    // Rows cover the seat, between the side seam and the narrowing crotch.
    const lowest = riseB - 40, step = (lowest - side - 10) / 2;
    for (let k = 0; k < 3; k++) {
      const y = lowest - k * step, t = solve(t => cubicPoint(from, leg.c1!, leg.c2!, to, t).y, y, 0, 1), x = cubicPoint(from, leg.c1!, leg.c2!, to, t).x;
      const ruffle = rectangle(`olan-${k + 1}`, `Olán trasero ${k + 1}`, 2 * x * 1.8, Math.max(40, step + 8), [
        edge('superior', 'Canto que se frunce', 'costura', sa), edge('extremo-der', 'Extremo (queda dentro del bies)', 'sin-margen', 0),
        edge('bajo', 'Canto libre (dobladillo estrecho)', 'dobladillo', 6), edge('extremo-izq', 'Extremo (queda dentro del bies)', 'sin-margen', 0)
      ], { fabric: 'contraste' }, true);
      ruffle.notes = [`Fruncir a ${cm(2 * x)} y coser sobre la línea ${k + 1} de la espalda abierta.`];
      back.lines.push({ id: `olan-${k + 1}`, kind: 'colocacion', a: P(0, y), b: P(x, y), label: `Olán ${k + 1}: canto superior` });
      checks.push({ key: `olan-${k + 1}`, label: `Olán ${k + 1}: largo para fruncir a 1,8`, ease: 0, body: 2 * x, target: 2 * x * 1.8, measured: len(ruffle, 'superior'), tolerance: .5 } as typeof checks[number]);
      pieces.push(ruffle);
    }
  }
  const legElastic = Math.min(thigh + 15, legLoop * .9);
  return {
    pieces, seams, checks,
    notices: [legLoop < thigh + 15 ? { level: 'error', code: 'pierna-justa', message: `La abertura de pierna mide ${cm(legLoop)} y el muslo ${cm(thigh)}: reduce el ancho de entrepierna o aumenta la holgura.` } : { level: 'ok', code: 'pierna', message: `Abertura de pierna de ${cm(legLoop)} antes del elástico.` }, experimental('cubrepanal-experimental', 'Cubrepañal')],
    materials: [
      { id: 'tela', label: 'Algodón suave, batista, lino ligero o punto', qty: 'Según acomodo y ancho de tu tela', note: 'Prelava.' },
      { id: 'elastico-cintura', label: `Elástico suave de ${cm(ew)}`, qty: cm(waist * er + 20) },
      { id: 'elastico-pierna', label: `Elástico suave de ${cm(lw)}`, qty: `2 tramos de ${cm(legElastic)}`, note: 'No debe marcar la piel: pruébalo sobre el muslo.' },
      ...(ruffles ? [{ id: 'olanes', label: 'Tela de contraste ligera para olanes', qty: '3 tiras' }] : []),
      { id: 'hilo', label: 'Hilo de coser', qty: '1 carrete' }
    ],
    assumptions: ['Cadera y tiro medidos sobre el pañal. La espalda es 2,5 cm más profunda para cubrirlo.', 'Las piernas se rematan con bies que hace de canal del elástico: el borde no lleva margen.', ruffles ? 'Los olanes se fruncen a 1,8 veces el ancho de la espalda en su línea y sus extremos quedan atrapados en el bies.' : 'Sin olanes: espalda lisa.'],
    steps: [
      { id: 'cortar', title: 'Corta las piezas', detail: `Delantero y espalda al doblez, dos tiras de bies${ruffles ? ' y tres olanes' : ''}.`, pieces: pieces.map(piece => piece.id) },
      ...(ruffles ? [{ id: 'olanes', title: 'Coloca los olanes en la espalda', detail: 'Dobladilla el canto libre de cada olán, frúncelo al ancho de su línea y cóselo empezando por el olán 1 (el más bajo), de modo que cada uno cubra la costura del anterior.', pieces: ['espalda', 'olan-1', 'olan-2', 'olan-3'] }] : []),
      { id: 'costados', title: 'Cose los costados', detail: 'Une delantero y espalda por los costados y termina los márgenes.', pieces: ['delantero', 'espalda'], seams: ['costados'] },
      { id: 'piernas', title: 'Ribetea las piernas', detail: 'Cose cada bies a la abertura de pierna, desde la entrepierna delantera hasta la trasera, y dóblalo formando un canal. Pasa el elástico y fíjalo en los dos extremos.', pieces: ['delantero', 'espalda', 'bies-pierna'], seams: ['ribete-pierna'] },
      { id: 'entrepierna', title: 'Cierra la entrepierna', detail: 'Cose la entrepierna atrapando los extremos de bies y elástico. Remata dos veces.', pieces: ['delantero', 'espalda'], seams: ['entrepierna'] },
      { id: 'cintura', title: 'Jareta de cintura', detail: 'Dobla la jareta, pespuntea dejando 3 cm abiertos, pasa el elástico, únelo y cierra.', pieces: ['delantero', 'espalda'] }
    ]
  };
}

export const bloomerGenerator: PatternGenerator = {
  id: 'cubrepanal-bebe', name: 'Cubrepañal con elástico', status: 'experimental',
  summary: 'Bombacho de bebé con espalda más profunda, piernas con bies elástico y olanes traseros opcionales.',
  requiredMeasures: ['cintura', 'cadera', 'tiro', 'muslo'], optionalMeasures: ['estatura'],
  defaults: bloomerDefaults, generate: generateBloomers,
  params: [
    { key: 'olanes', label: 'Olanes traseros', group: 'diseno', type: 'choice', choices: [{ value: 'no', label: 'Sin olanes' }, { value: 'si', label: 'Tres olanes' }] },
    { key: 'anchoEntrepierna', label: 'Ancho de entrepierna', group: 'diseno', type: 'length', min: 50, max: 120 },
    { key: 'holgura', label: 'Holgura sobre pañal', group: 'holgura', type: 'length', min: 40, max: 160 },
    { key: 'anchoElasticoCintura', label: 'Elástico de cintura', group: 'diseno', type: 'length', min: 10, max: 25 },
    { key: 'anchoElasticoPierna', label: 'Elástico de pierna', group: 'diseno', type: 'length', min: 4, max: 12 },
    { key: 'proporcionElastico', label: 'Largo de elástico / cintura', group: 'diseno', type: 'ratio', min: .8, max: 1 },
    { key: 'margen', label: 'Margen de costura', group: 'margenes', type: 'length', min: 5, max: 12 }
  ]
};

// ------------------------------------------------------------------ Bonete
export function bonnetDefaults(ctx: GeneratorContext): Params {
  const head = ctx.body.cabeza ?? 430;
  return { largoBanda: round1(head * .66), profundidad: round1(head * .23), anchoTrasera: round1(head * .27), largoLengueta: round1(head * .24 + 20), margen: 6 };
}

export function generateBonnet(ctx: GeneratorContext, params: Params): GeneratorResult {
  const p = { ...bonnetDefaults(ctx), ...params }, head = ctx.body.cabeza ?? 0;
  const Lb = num(p, 'largoBanda'), D = num(p, 'profundidad'), wB = num(p, 'anchoTrasera'), Lt = num(p, 'largoLengueta'), sa = num(p, 'margen');
  if (!babyKinds.includes(ctx.kind)) return notBaby('bonete-talla');
  if (!finite(head, Lb, D, wB, Lt, sa) || head < 300 || head > 560 || Lb < head * .5 || Lb > head * .8 || D < 50 || D > 160 || wB < 60 || wB > Lb * .7 || Lt < 60 || Lt > 200 || sa < 4 || sa > 10)
    return invalid('bonete-medidas', 'Revisa contorno de cabeza, banda, pieza trasera y lengüeta.');
  const band = rectangle('banda', 'Banda del bonete', Lb, D, [
    edge('rostro', 'Contorno de la cara', 'costura', sa), edge('extremo-der', 'Borde del cuello (lado de la lengüeta)', 'costura', sa),
    edge('nuca', 'Unión a la pieza trasera', 'costura', sa), edge('extremo-izq', 'Borde del cuello (lado del broche)', 'costura', sa)
  ], {}, true);
  band.notches.push({ id: 'centro', edgeId: 'nuca', s: Lb / 2, count: 1, label: 'Centro: coincide con el vértice trasero' }, { id: 'lengueta', edgeId: 'extremo-der', s: D * .3, count: 1, label: 'Centro de la lengüeta' });
  band.marks.push({ id: 'broche', kind: 'boton', at: P(12, D * .3), label: 'Broche: mitad hembra, por el exterior' });
  const backPiece = (h: number) => outline('trasera', 'Pieza trasera', [P(0, 0), P(wB / 2, -h), P(wB, 0)], [
    edge('nuca-a', 'Contorno trasero', 'costura', sa, P(0, -h * K), P(wB / 2 * (1 - K), -h)),
    edge('nuca-b', 'Contorno trasero', 'costura', sa, P(wB / 2 + wB / 2 * K, -h), P(wB, -h * K)),
    edge('cuello', 'Borde del cuello', 'costura', sa)
  ]);
  const h = solve(value => lens(backPiece(value), ['nuca-a', 'nuca-b']), Lb, 5, Lb);
  const rear = backPiece(h);
  rear.notches.push({ id: 'vertice', edgeId: 'nuca-b', s: 0, count: 1, label: 'Vértice: centro de la banda' });
  rear.grain = { a: P(wB / 2, -h * .8), b: P(wB / 2, -h * .2) };
  const tab = outline('lengueta', 'Lengüeta de la barbilla', [P(0, 0), P(Lt - 14, 0), P(Lt, 14), P(Lt - 14, 28), P(0, 28)], [
    edge('superior', 'Canto', 'costura', sa), edge('punta-a', 'Punta redondeada', 'costura', sa, P(Lt - 14 + 14 * K, 0), P(Lt, 14 - 14 * K)),
    edge('punta-b', 'Punta redondeada', 'costura', sa, P(Lt, 14 + 14 * K), P(Lt - 14 + 14 * K, 28)), edge('inferior', 'Canto', 'costura', sa),
    edge('base', 'Base (se cose entre banda y forro)', 'costura', sa)
  ], { qty: 2 });
  tab.grain = { a: P(Lt * .2, 14), b: P(Lt * .7, 14) };
  tab.marks.push({ id: 'broche', kind: 'boton', at: P(Lt - 14, 14), label: 'Broche: mitad macho' });
  const pieces = [band, rear, copyPiece(band, 'banda-forro', 'Forro de la banda', { fabric: 'forro' }), copyPiece(rear, 'trasera-forro', 'Forro de la pieza trasera', { fabric: 'forro' }), tab];
  return {
    pieces,
    seams: [
      equal('nuca', 'Banda con la pieza trasera', [{ pieceId: 'banda', edgeIds: ['nuca'] }], [{ pieceId: 'trasera', edgeIds: ['nuca-a', 'nuca-b'] }]),
      equal('nuca-forro', 'Forro de banda con forro trasero', [{ pieceId: 'banda-forro', edgeIds: ['nuca'] }], [{ pieceId: 'trasera-forro', edgeIds: ['nuca-a', 'nuca-b'] }]),
      equal('rostro', 'Contorno de la cara con su forro', [{ pieceId: 'banda', edgeIds: ['rostro'] }], [{ pieceId: 'banda-forro', edgeIds: ['rostro'] }]),
      equal('cuello', 'Borde del cuello con su forro', [{ pieceId: 'banda', edgeIds: ['extremo-der', 'extremo-izq'] }, { pieceId: 'trasera', edgeIds: ['cuello'] }], [{ pieceId: 'banda-forro', edgeIds: ['extremo-der', 'extremo-izq'] }, { pieceId: 'trasera-forro', edgeIds: ['cuello'] }])
    ],
    checks: [{ key: 'contorno-cara', label: 'Contorno de la cara', body: head, target: Lb, measured: len(band, 'rostro'), tolerance: .5 }],
    materials: [
      { id: 'tela', label: 'Algodón, muselina, lino ligero o pana fina', qty: 'Banda, pieza trasera y dos lengüetas' },
      { id: 'forro', label: 'Forro suave: muselina, franela o punto de algodón', qty: 'Banda y pieza trasera' },
      { id: 'broche', label: 'Broche de presión infantil', qty: '1 juego' }, { id: 'hilo', label: 'Hilo de coser', qty: '1 carrete' }
    ],
    assumptions: ['Bonete de banda y pieza trasera: la banda enmarca la cara y la lengüeta se abrocha bajo la barbilla con broche. No lleva cintas para atar.', `La pieza trasera mide ${cm(wB)} de ancho y su contorno curvo iguala el largo de la banda (${cm(Lb)}).`],
    notices: [{ level: 'aviso', code: 'bonete-seguridad', message: 'Quita el bonete para dormir y no lo dejes puesto sin supervisión. Coloca el broche con su herramienta y comprueba que no se suelte.' }, experimental('bonete-experimental', 'Bonete')],
    steps: [
      { id: 'cortar', title: 'Corta las piezas', detail: 'Banda y pieza trasera en tela y en forro; dos lengüetas.', pieces: pieces.map(piece => piece.id) },
      { id: 'lengueta', title: 'Prepara la lengüeta', detail: 'Enfrenta las dos lengüetas, cose el contorno dejando la base abierta, voltea, plancha y pespuntea.', pieces: ['lengueta'] },
      { id: 'armar', title: 'Une banda y pieza trasera', detail: 'Cose la banda alrededor de la pieza trasera, con el piquete central en el vértice. Repite con el forro.', pieces: ['banda', 'trasera', 'banda-forro', 'trasera-forro'], seams: ['nuca', 'nuca-forro'] },
      { id: 'forrar', title: 'Forra y voltea', detail: 'Hilvana la lengüeta en el piquete del borde derecho. Enfrenta exterior y forro, cose la cara y todo el borde del cuello dejando 5 cm abiertos en la nuca. Recorta, voltea, cierra a mano y pespuntea.', pieces: ['banda', 'trasera', 'banda-forro', 'trasera-forro', 'lengueta'], seams: ['rostro', 'cuello'] },
      { id: 'broche', title: 'Coloca el broche', detail: 'Coloca la mitad macho en la lengüeta y la hembra en el lado contrario. Prueba que cierre sin apretar la barbilla.', pieces: ['lengueta', 'banda'] }
    ]
  };
}

export const bonnetGenerator: PatternGenerator = {
  id: 'bonete-bebe', name: 'Bonete de bebé con lengüeta', status: 'experimental',
  summary: 'Bonete forrado de banda y pieza trasera curva, cerrado con lengüeta y broche bajo la barbilla.',
  requiredMeasures: ['cabeza'], optionalMeasures: [],
  defaults: bonnetDefaults, generate: generateBonnet,
  params: [
    { key: 'largoBanda', label: 'Contorno de la cara', group: 'diseno', type: 'length', min: 150, max: 450 },
    { key: 'profundidad', label: 'Profundidad de la banda', group: 'diseno', type: 'length', min: 50, max: 160 },
    { key: 'anchoTrasera', label: 'Ancho de la pieza trasera', group: 'diseno', type: 'length', min: 60, max: 250 },
    { key: 'largoLengueta', label: 'Largo de la lengüeta', group: 'diseno', type: 'length', min: 60, max: 200 },
    { key: 'margen', label: 'Margen de costura', group: 'margenes', type: 'length', min: 4, max: 10 }
  ]
};

// ----------------------------------------------------------------- Patucos
export function bootieDefaults(ctx: GeneratorContext): Params {
  return { largoPie: round1(clamp((ctx.body.estatura ?? 680) * .155, 70, 150)), holguraPie: 10, altoTalon: 34, margen: 6 };
}

export function generateBooties(ctx: GeneratorContext, params: Params): GeneratorResult {
  const p = { ...bootieDefaults(ctx), ...params };
  const foot = num(p, 'largoPie'), ease = num(p, 'holguraPie'), hT = num(p, 'altoTalon'), sa = num(p, 'margen');
  if (!babyKinds.includes(ctx.kind)) return notBaby('patucos-talla');
  if (!finite(foot, ease, hT, sa) || foot < 70 || foot > 150 || ease < 5 || ease > 20 || hT < 25 || hT > 60 || sa < 4 || sa > 8)
    return invalid('patucos-medidas', 'Revisa largo del pie, holgura, alto del talón y margen.');
  const Ls = foot + ease, Ws = Ls * .44, y1 = Ls * .38;
  const sole = outline('suela', 'Suela', [P(0, 0), P(Ws / 2, y1), P(0, Ls), P(-Ws / 2, y1)], [
    edge('punta-der', 'Punta', 'costura', sa, P(Ws / 2 * .55, 0), P(Ws / 2, y1 * .42)),
    edge('talon-der', 'Talón', 'costura', sa, P(Ws / 2, y1 + (Ls - y1) * .5), P(Ws * .22, Ls)),
    edge('talon-izq', 'Talón', 'costura', sa, P(-Ws * .22, Ls), P(-Ws / 2, y1 + (Ls - y1) * .5)),
    edge('punta-izq', 'Punta', 'costura', sa, P(-Ws / 2, y1 * .42), P(-Ws / 2 * .55, 0))
  ], { qty: 2, fabric: 'contraste' });
  sole.notches.push({ id: 'lado-der', edgeId: 'talon-der', s: 0, count: 1, label: 'Unión empeine–talonera' }, { id: 'lado-izq', edgeId: 'punta-izq', s: 0, count: 1, label: 'Unión empeine–talonera' });
  const front = lens(sole, ['punta-der', 'punta-izq']), heel = lens(sole, ['talon-der', 'talon-izq']);
  const Wv = Ws * 1.3, hs = Math.sqrt(hT * hT - (Wv * .14) ** 2);
  const vamp = (sag: number) => outline('empeine', 'Empeine', [P(-Wv * .36, 0), P(Wv * .36, 0), P(Wv / 2, hs), P(0, hs + sag), P(-Wv / 2, hs)], [
    edge('boca', 'Boca (con forro)', 'costura', sa), edge('lado-der', 'Lado (une la talonera)', 'costura', sa),
    edge('suela-b', 'Unión a la suela', 'costura', sa, P(Wv / 2, hs + sag * K), P(Wv / 2 * K, hs + sag)),
    edge('suela-a', 'Unión a la suela', 'costura', sa, P(-Wv / 2 * K, hs + sag), P(-Wv / 2, hs + sag * K)),
    edge('lado-izq', 'Lado (une la talonera)', 'costura', sa)
  ], { qty: 2 });
  if (front <= Wv * 1.02) return invalid('patucos-proporcion', 'La suela es demasiado corta para su ancho. Revisa el largo del pie.');
  const upper = vamp(solve(sag => lens(vamp(sag), ['suela-a', 'suela-b']), front, .5, front));
  upper.notches.push({ id: 'centro', edgeId: 'suela-a', s: 0, count: 1, label: 'Centro de la punta' });
  const back = rectangle('talonera', 'Talonera', heel, hT, [
    edge('boca', 'Boca (canal del elástico)', 'costura', sa), edge('extremo-der', 'Une el lado del empeine', 'costura', sa),
    edge('suela', 'Unión al talón de la suela', 'costura', sa), edge('extremo-izq', 'Une el lado del empeine', 'costura', sa)
  ], { qty: 2 }, true);
  back.lines.push({ id: 'canal', kind: 'pespunte', a: P(0, 10), b: P(heel, 10), label: 'Canal del elástico (pespuntear con el forro)' });
  back.notches.push({ id: 'centro', edgeId: 'suela', s: heel / 2, count: 2, label: 'Centro del talón' });
  const pieces = [upper, back, sole, copyPiece(upper, 'empeine-forro', 'Forro del empeine', { fabric: 'forro' }), copyPiece(back, 'talonera-forro', 'Forro de la talonera', { fabric: 'forro' }), copyPiece(sole, 'suela-forro', 'Plantilla de forro', { fabric: 'forro' })];
  const elastic = Math.max(40, heel * .6);
  return {
    pieces,
    seams: [
      equal('suela-delantera', 'Empeine con la punta de la suela', [{ pieceId: 'empeine', edgeIds: ['suela-b', 'suela-a'] }], [{ pieceId: 'suela', edgeIds: ['punta-der', 'punta-izq'] }]),
      equal('suela-trasera', 'Talonera con el talón de la suela', [{ pieceId: 'talonera', edgeIds: ['suela'] }], [{ pieceId: 'suela', edgeIds: ['talon-der', 'talon-izq'] }]),
      equal('lado-der', 'Lado derecho del empeine con la talonera', [{ pieceId: 'empeine', edgeIds: ['lado-der'] }], [{ pieceId: 'talonera', edgeIds: ['extremo-der'] }]),
      equal('lado-izq', 'Lado izquierdo del empeine con la talonera', [{ pieceId: 'empeine', edgeIds: ['lado-izq'] }], [{ pieceId: 'talonera', edgeIds: ['extremo-izq'] }]),
      equal('boca', 'Boca exterior con su forro', [{ pieceId: 'empeine', edgeIds: ['boca'] }, { pieceId: 'talonera', edgeIds: ['boca'] }], [{ pieceId: 'empeine-forro', edgeIds: ['boca'] }, { pieceId: 'talonera-forro', edgeIds: ['boca'] }])
    ],
    checks: [
      { key: 'largo-suela', label: 'Largo interior de la suela', body: foot, ease, target: Ls, measured: sole.nodes[2].y - sole.nodes[0].y, tolerance: .5 },
      { key: 'contorno-suela', label: 'Contorno de suela cubierto por empeine y talonera', target: front + heel, measured: lens(upper, ['suela-a', 'suela-b']) + len(back, 'suela'), tolerance: .5 }
    ],
    materials: [
      { id: 'tela', label: 'Polar, punto grueso, pana fina o algodón acolchado', qty: 'Dos empeines y dos taloneras' },
      { id: 'suela', label: 'Suela antideslizante textil, ante sintético o fieltro grueso', qty: 'Dos suelas' },
      { id: 'forro', label: 'Forro suave de algodón o franela', qty: 'Dos empeines, dos taloneras y dos plantillas' },
      { id: 'elastico', label: 'Elástico suave de 6 mm', qty: `2 tramos de ${cm(elastic)}` }, { id: 'hilo', label: 'Hilo resistente', qty: '1 carrete' }
    ],
    assumptions: [`Suela de ${cm(Ls)} para un pie de ${cm(foot)} (+ ${cm(ease)} de holgura). El ancho es el 44 % del largo.`, 'El empeine cubre la punta de la suela entre las dos marcas laterales y la talonera cubre el talón; ambos contornos se calculan para medir exactamente su tramo.', 'Patucos para gatear o abrigar: no sustituyen al calzado para caminar.'],
    notices: [{ level: 'aviso', code: 'patucos-pie', message: 'Mide el pie del talón a la punta del dedo más largo y comprueba que entre sin forzar. No añadas botones ni adornos pequeños.' }, experimental('patucos-experimental', 'Patucos')],
    steps: [
      { id: 'cortar', title: 'Corta los pares', detail: 'Corta dos de cada pieza en tela, suela y forro.', pieces: pieces.map(piece => piece.id) },
      { id: 'forrar', title: 'Forra empeine y talonera', detail: 'Enfrenta cada empeine y talonera con su forro y cose la boca. Voltea, plancha y, en la talonera, pespuntea el canal a 1 cm del borde.', pieces: ['empeine', 'talonera', 'empeine-forro', 'talonera-forro'], seams: ['boca'] },
      { id: 'elastico', title: 'Elástico del talón', detail: 'Pasa el elástico por el canal y fíjalo en ambos extremos dentro del margen.', pieces: ['talonera'] },
      { id: 'lados', title: 'Une los lados', detail: 'Superpón los lados del empeine y la talonera, por el exterior y el forro juntos, y cóselos.', pieces: ['empeine', 'talonera'], seams: ['lado-der', 'lado-izq'] },
      { id: 'suela', title: 'Cose la suela', detail: 'Hilvana la plantilla de forro con la suela, revés con revés. Cose el empeine a la punta y la talonera al talón haciendo coincidir piquetes; termina el margen con bies o zigzag y voltea.', pieces: ['empeine', 'talonera', 'suela', 'suela-forro'], seams: ['suela-delantera', 'suela-trasera'] }
    ]
  };
}

export const bootiesGenerator: PatternGenerator = {
  id: 'patucos-bebe', name: 'Patucos de bebé', status: 'experimental',
  summary: 'Patucos forrados de empeine, talonera con elástico y suela, calculados desde el largo del pie.',
  requiredMeasures: ['estatura'], optionalMeasures: [],
  defaults: bootieDefaults, generate: generateBooties,
  params: [
    { key: 'largoPie', label: 'Largo del pie', group: 'diseno', type: 'length', min: 70, max: 150, help: 'Del talón a la punta del dedo más largo. Si no lo mides, se estima con la estatura.' },
    { key: 'altoTalon', label: 'Alto de la talonera', group: 'diseno', type: 'length', min: 25, max: 60 },
    { key: 'holguraPie', label: 'Holgura de largo', group: 'holgura', type: 'length', min: 5, max: 20 },
    { key: 'margen', label: 'Margen de costura', group: 'margenes', type: 'length', min: 4, max: 8 }
  ]
};

// ----------------------------------------------------------- Saco de dormir
export function sleepSackDefaults(ctx: GeneratorContext): Params {
  return { largo: round1(clamp((ctx.body.estatura ?? 680) * .9 + 120, 500, 1100)), holgura: 100, anchoBajo: 1.5, anchoBies: 10, margen: 10 };
}

export function generateSleepSack(ctx: GeneratorContext, params: Params): GeneratorResult {
  const p = { ...sleepSackDefaults(ctx), ...params }, b = ctx.body;
  const chest = b.pecho ?? 0, neck = b.cuello ?? 0, shoulders = b.hombros ?? 0, talle = b.talleEspalda ?? 0, head = b.cabeza ?? 0;
  const ease = num(p, 'holgura'), L = num(p, 'largo'), wide = num(p, 'anchoBajo'), bias = num(p, 'anchoBies'), sa = num(p, 'margen');
  if (!babyKinds.includes(ctx.kind)) return notBaby('saco-talla');
  const q = (chest + ease) / 4, shoulderHalf = Math.min(shoulders / 2 - 10, q - 20), neckHalf = Math.min(neck * .21 + 6, shoulderHalf - 15), fDepth = neck * .22, bDepth = 12;
  const drop = (shoulderHalf - neckHalf) * .22, armDepth = talle * .45 + 20, bh = q * wide, rc = bh * .55, zipEnd = L - 100;
  if (!finite(chest, neck, shoulders, talle, head, ease, L, wide, bias, sa) || chest < 350 || chest > 700 || neck < 180 || head < 300 || ease < 60 || ease > 180
    || wide < 1.1 || wide > 2 || L < armDepth + 250 || L > 1200 || shoulderHalf < neckHalf + 15 || bias < 6 || bias > 14 || sa < 6 || sa > 15 || L - rc < armDepth + 40)
    return invalid('saco-medidas', 'Revisa largo, holgura y anchos: el saco debe tener hombro más ancho que el escote y espacio libre bajo la sisa.');
  const S = P(shoulderHalf, drop), U = P(q, armDepth), ul = Math.hypot(shoulderHalf - neckHalf, drop), perp = P(-drop / ul, (shoulderHalf - neckHalf) / ul), hA = armDepth - drop;
  const body = (back: boolean): Piece => {
    const depth = back ? bDepth : fDepth;
    const points = [P(0, depth), P(neckHalf, 0), S, U, P(bh, L - rc), P(0, L)];
    const edges = [
      edge('cuello', 'Escote (ribete al bies)', 'sin-margen', 0, P(neckHalf * .55, depth), P(neckHalf, depth * .45)), edge('hombro', 'Hombro', 'costura', sa),
      edge('sisa', 'Sisa (ribete al bies)', 'sin-margen', 0, P(S.x + perp.x * hA * .4, S.y + perp.y * hA * .4), P(U.x - (U.x - S.x) * .55, U.y)),
      edge('costado', 'Costado', 'costura', sa), edge('bajo', 'Bajo redondeado', 'costura', sa, P(bh, L - rc * (1 - K)), P(bh * K, L))
    ];
    if (back) edges.push(edge('centro', 'Centro de espalda (al doblez)', 'doblez', 0));
    else { points.push(P(0, zipEnd)); edges.push(edge('centro-delantero', 'Centro delantero bajo el cierre', 'costura', sa), edge('cierre', 'Cierre delantero', 'costura', sa)); }
    const piece = outline(back ? 'espalda' : 'delantero', back ? 'Espalda al doblez' : 'Medio delantero (par en espejo)', points, edges, back ? { onFold: true } : { qty: 2, mirrorPairs: true });
    piece.grain = { a: P(q * .5, armDepth + 30), b: P(q * .5, L - rc) };
    if (!back) piece.notches.push({ id: 'fin-cierre', edgeId: 'cierre', s: 0, count: 1, label: 'Tope inferior del cierre' });
    return piece;
  };
  const front = body(false), rear = body(true);
  const neckline = 2 * len(front, 'cuello') + 2 * len(rear, 'cuello'), armhole = len(front, 'sisa') + len(rear, 'sisa'), zip = Math.ceil((zipEnd - fDepth) / 50) * 50;
  const guard = rectangle('protector-cierre', 'Protector del tirador (doblado)', 40, 100, [edge('a', 'Canto', 'costura', sa), edge('b', 'Canto', 'costura', sa), edge('c', 'Canto', 'costura', sa), edge('d', 'Canto', 'costura', sa)]);
  guard.lines.push({ id: 'doblez', kind: 'doblez', a: P(0, 50), b: P(40, 50), label: 'Doblar por la mitad' });
  const pieces = [front, rear, copyPiece(front, 'delantero-forro', 'Forro del medio delantero (par en espejo)', { fabric: 'forro' }), copyPiece(rear, 'espalda-forro', 'Forro de espalda al doblez', { fabric: 'forro' }),
    bindingStrip('bies-escote', 'Bies del escote', neckline, bias, 1, 10), bindingStrip('bies-sisa', 'Bies de sisa', armhole, bias, 2, 0), guard];
  const notices: Issue[] = [];
  if (neckline > head - 40) notices.push({ level: 'error', code: 'escote-seguro', message: `El escote cerrado mide ${cm(neckline)}: debe quedar al menos 4 cm por debajo del contorno de cabeza (${cm(head)}) para que el bebé no se deslice dentro.` });
  else if (neckline < neck + 30) notices.push({ level: 'error', code: 'escote-justo', message: 'El escote queda demasiado justo para el cuello. Revisa la medida de cuello.' });
  else notices.push({ level: 'ok', code: 'escote', message: `Escote cerrado de ${cm(neckline)}: holgado en el cuello y menor que la cabeza.` });
  if (armhole > head - 60) notices.push({ level: 'error', code: 'sisa-segura', message: `Cada sisa mide ${cm(armhole)}: redúcela para que la cabeza no pueda pasar por ella.` });
  notices.push({ level: 'aviso', code: 'saco-seguridad', message: 'Úsalo sin mantas sueltas, sin capucha ni mangas. Elige el grosor según la temperatura del cuarto y evita que el bebé sude.' }, experimental('saco-experimental', 'Saco de dormir'));
  const lined = (outer: Piece, lining: Piece, id: string, label: string) => equal(id, label, [{ pieceId: outer.id, edgeIds: allEdges(outer) }], [{ pieceId: lining.id, edgeIds: allEdges(lining) }]);
  return {
    pieces, notices,
    seams: [
      equal('hombros', 'Hombros', [{ pieceId: 'delantero', edgeIds: ['hombro'] }], [{ pieceId: 'espalda', edgeIds: ['hombro'] }]),
      equal('costados', 'Costados', [{ pieceId: 'delantero', edgeIds: ['costado'] }], [{ pieceId: 'espalda', edgeIds: ['costado'] }]),
      equal('bajo', 'Bajo redondeado', [{ pieceId: 'delantero', edgeIds: ['bajo'], factor: 2 }], [{ pieceId: 'espalda', edgeIds: ['bajo'], factor: 2 }]),
      lined(front, pieces[2], 'forro-delantero', 'Medio delantero con su forro'), lined(rear, pieces[3], 'forro-espalda', 'Espalda con su forro'),
      equal('ribete-escote', 'Escote con su bies', [{ pieceId: 'delantero', edgeIds: ['cuello'], factor: 2 }, { pieceId: 'espalda', edgeIds: ['cuello'], factor: 2 }], [{ pieceId: 'bies-escote', edgeIds: ['largo-superior'] }]),
      equal('ribete-sisa', 'Cada sisa con su bies', [{ pieceId: 'delantero', edgeIds: ['sisa'] }, { pieceId: 'espalda', edgeIds: ['sisa'] }], [{ pieceId: 'bies-sisa', edgeIds: ['largo-superior'] }])
    ],
    checks: [
      { key: 'contorno-pecho', label: 'Contorno de pecho terminado', body: chest, ease, target: chest + ease, measured: 2 * front.nodes[3].x + 2 * rear.nodes[3].x, tolerance: .5 },
      { key: 'largo', label: 'Largo desde el hombro', target: L, measured: rear.nodes[5].y, tolerance: .5 }
    ],
    materials: [
      { id: 'tela', label: 'Algodón, muselina doble o punto interlock', qty: 'Exterior según acomodo' }, { id: 'forro', label: 'Forro de algodón suave', qty: 'Igual que el exterior' },
      { id: 'cierre', label: `Cierre de nylon no separable de ${cm(zip)}`, qty: '1', note: 'Tirador arriba; el protector cubre su cabeza junto a la barbilla.' },
      { id: 'bies', label: `Bies de algodón de ${cm(bias)}`, qty: cm(neckline + 20 + 2 * armhole) }, { id: 'hilo', label: 'Hilo de coser', qty: '1 carrete' }
    ],
    assumptions: ['Saco sin mangas con cierre delantero y bajo redondeado; el exterior y el forro se hilvanan revés con revés y se trabajan como una capa.', `El bajo mide ${wide.toFixed(2)} veces el ancho de pecho para que las piernas se muevan libres.`, `Escote cerrado ${cm(neckline)} y sisa ${cm(armhole)}: el patrón comprueba que la cabeza no pueda pasar por ellos.`],
    steps: [
      { id: 'cortar', title: 'Corta y une capas', detail: 'Corta exterior y forro. Hilvana cada pieza con su forro, revés con revés, a 5 mm del borde.', pieces: ['delantero', 'espalda', 'delantero-forro', 'espalda-forro'], seams: ['forro-delantero', 'forro-espalda'] },
      { id: 'cierre', title: 'Coloca el cierre', detail: `Cose el centro delantero desde el bajo hasta el piquete. Coloca el cierre de ${cm(zip)} con el tirador arriba y el tope en el piquete.`, pieces: ['delantero'] },
      { id: 'hombros', title: 'Hombros y sisas', detail: 'Cose los hombros. Ribetea las sisas con bies, con los extremos dentro de la futura costura de costado.', pieces: ['delantero', 'espalda', 'bies-sisa'], seams: ['hombros', 'ribete-sisa'] },
      { id: 'costados', title: 'Costados y bajo', detail: 'Cose los costados y el bajo redondeado de una vez. Termina los márgenes con bies o zigzag para que no rocen.', pieces: ['delantero', 'espalda'], seams: ['costados', 'bajo'] },
      { id: 'escote', title: 'Escote y protector', detail: 'Cose el protector doblado sobre el extremo superior del cierre. Ribetea el escote doblando 1 cm de bies en cada extremo.', pieces: ['delantero', 'espalda', 'bies-escote', 'protector-cierre'], seams: ['ribete-escote'] }
    ]
  };
}

export const sleepSackGenerator: PatternGenerator = {
  id: 'saco-dormir-bebe', name: 'Saco de dormir sin mangas', status: 'experimental',
  summary: 'Saco forrado con cierre delantero, bajo redondeado y comprobación de escote y sisas frente a la cabeza.',
  requiredMeasures: ['pecho', 'cuello', 'hombros', 'talleEspalda', 'cabeza'], optionalMeasures: ['estatura'],
  defaults: sleepSackDefaults, generate: generateSleepSack,
  params: [
    { key: 'largo', label: 'Largo desde el hombro', group: 'diseno', type: 'length', min: 450, max: 1200 },
    { key: 'anchoBajo', label: 'Ancho del bajo / pecho', group: 'diseno', type: 'ratio', min: 1.1, max: 2 },
    { key: 'anchoBies', label: 'Ancho visible del bies', group: 'diseno', type: 'length', min: 6, max: 14 },
    { key: 'holgura', label: 'Holgura de pecho', group: 'holgura', type: 'length', min: 60, max: 180 },
    { key: 'margen', label: 'Margen de costura', group: 'margenes', type: 'length', min: 6, max: 15 }
  ]
};

// -------------------------------------------------------- Toalla con capucha
export function towelDefaults(ctx: GeneratorContext): Params {
  return { lado: ctx.kind === 'bebe' ? 760 : ctx.kind === 'toddler' ? 900 : 1000, ladoCapucha: round1(clamp((ctx.body.cabeza ?? 450) * .68, 240, 380)), radioEsquina: 60, anchoBies: 12 };
}

export function generateTowel(ctx: GeneratorContext, params: Params): GeneratorResult {
  const p = { ...towelDefaults(ctx), ...params }, head = ctx.body.cabeza ?? 0;
  const S = num(p, 'lado'), c = num(p, 'ladoCapucha'), rr = num(p, 'radioEsquina'), bias = num(p, 'anchoBies');
  if (!['bebe', 'toddler', 'infantil'].includes(ctx.kind)) return invalid('toalla-talla', 'Esta toalla está pensada para bebés y niñas o niños. Elige una talla infantil.');
  if (!finite(head, S, c, rr, bias) || head < 300 || S < 500 || S > 1400 || c < 200 || c > S * .6 || rr < 20 || rr > 120 || c < rr * 2.5 || bias < 8 || bias > 20)
    return invalid('toalla-medidas', 'Revisa los lados de toalla y capucha y el radio de las esquinas.');
  const q = Math.PI / 2, corner = (cx: number, cy: number, a0: number) => arc(P(cx, cy), rr, a0, a0 + q);
  const e1 = corner(S - rr, rr, -q), e2 = corner(S - rr, S - rr, 0), e3 = corner(rr, S - rr, q), e4 = corner(rr, rr, 2 * q);
  const towel = outline('toalla', 'Toalla', [P(rr, 0), P(S - rr, 0), P(S, rr), P(S, S - rr), P(S - rr, S), P(rr, S), P(0, S - rr), P(0, rr)], [
    edge('lado-sup', 'Canto (ribete)', 'sin-margen', 0), edge('esquina-1', 'Esquina', 'sin-margen', 0, e1.c1, e1.c2), edge('lado-der', 'Canto (ribete)', 'sin-margen', 0), edge('esquina-2', 'Esquina', 'sin-margen', 0, e2.c1, e2.c2),
    edge('lado-inf', 'Canto (ribete)', 'sin-margen', 0), edge('esquina-3', 'Esquina', 'sin-margen', 0, e3.c1, e3.c2), edge('lado-izq', 'Canto (ribete)', 'sin-margen', 0), edge('esquina-4', 'Esquina', 'sin-margen', 0, e4.c1, e4.c2)
  ]);
  towel.lines.push({ id: 'capucha', kind: 'colocacion', a: P(c, 0), b: P(0, c), label: 'Borde de la capucha' });
  const hood = outline('capucha', 'Capucha triangular', [P(rr, 0), P(c, 0), P(0, c), P(0, rr)], [
    edge('lado-a', 'Canto sobre la toalla', 'sin-margen', 0), edge('rostro', 'Contorno de la cara (ribete)', 'sin-margen', 0),
    edge('lado-b', 'Canto sobre la toalla', 'sin-margen', 0), edge('esquina', 'Esquina', 'sin-margen', 0, e4.c1, e4.c2)
  ]);
  hood.grain = { a: P(c * .2, c * .2), b: P(c * .45, c * .45) };
  const perimeter = lens(towel, allEdges(towel)), strips = Math.ceil(perimeter / 950);
  const pieces = [towel, hood, bindingStrip('bies-toalla', `Bies del contorno (${strips} tiras para unir)`, perimeter / strips, bias, strips, 10), bindingStrip('bies-capucha', 'Bies de la capucha', len(hood, 'rostro'), bias, 1, 0)];
  const face = len(hood, 'rostro');
  return {
    pieces,
    seams: [
      equal('ribete-toalla', 'Contorno con sus tiras de bies', [{ pieceId: 'toalla', edgeIds: allEdges(towel) }], [{ pieceId: 'bies-toalla', edgeIds: ['largo-superior'], factor: strips }], 1),
      equal('ribete-capucha', 'Cara de la capucha con su bies', [{ pieceId: 'capucha', edgeIds: ['rostro'] }], [{ pieceId: 'bies-capucha', edgeIds: ['largo-superior'] }])
    ],
    checks: [{ key: 'lado', label: 'Lado de la toalla', target: S, measured: towel.nodes[2].x, tolerance: .5 }],
    materials: [
      { id: 'toalla', label: 'Toalla de rizo (felpa) de algodón', qty: `${cm(S)} × ${cm(S)} y la capucha` },
      { id: 'bies', label: `Bies de algodón de ${cm(bias)}`, qty: cm(perimeter + face + 20 * strips) }, { id: 'hilo', label: 'Hilo de coser', qty: '1 carrete' }
    ],
    assumptions: ['Toalla cuadrada con esquinas redondeadas; la capucha triangular se apoya en una esquina y su borde se ribetea junto con la toalla.', 'Los cantos no llevan margen: el bies los envuelve.'],
    notices: [face < head * .75 ? { level: 'error', code: 'capucha-pequena', message: `La abertura de la capucha mide ${cm(face)}: auméntala para la cabeza de ${cm(head)}.` } : { level: 'ok', code: 'capucha', message: `Abertura de capucha de ${cm(face)}.` }, experimental('toalla-experimental', 'Toalla con capucha')],
    steps: [
      { id: 'cortar', title: 'Corta toalla y capucha', detail: 'Corta la toalla y la capucha en rizo, redondeando las esquinas con la plantilla.', pieces: ['toalla', 'capucha'] },
      { id: 'capucha', title: 'Ribetea la cara de la capucha', detail: 'Envuelve el borde largo de la capucha con su bies y pespuntea.', pieces: ['capucha', 'bies-capucha'], seams: ['ribete-capucha'] },
      { id: 'colocar', title: 'Coloca la capucha', detail: 'Pon la capucha sobre una esquina, revés con derecho de la toalla, y únelas con un hilván a 5 mm del borde.', pieces: ['capucha', 'toalla'] },
      { id: 'ribete', title: 'Ribetea todo el contorno', detail: 'Une las tiras de bies al hilo diagonal y ribetea el contorno de la toalla atrapando la capucha. Cruza los extremos al terminar.', pieces: ['toalla', 'bies-toalla'], seams: ['ribete-toalla'] }
    ]
  };
}

export const towelGenerator: PatternGenerator = {
  id: 'toalla-capucha', name: 'Toalla con capucha', status: 'experimental',
  summary: 'Toalla de esquinas redondeadas con capucha triangular y bies, calculada desde el contorno de cabeza.',
  requiredMeasures: ['cabeza'], optionalMeasures: [],
  defaults: towelDefaults, generate: generateTowel,
  params: [
    { key: 'lado', label: 'Lado de la toalla', group: 'diseno', type: 'length', min: 500, max: 1400 },
    { key: 'ladoCapucha', label: 'Lado de la capucha', group: 'diseno', type: 'length', min: 200, max: 600 },
    { key: 'radioEsquina', label: 'Radio de las esquinas', group: 'diseno', type: 'length', min: 20, max: 120 },
    { key: 'anchoBies', label: 'Ancho visible del bies', group: 'diseno', type: 'length', min: 8, max: 20 }
  ]
};

// ------------------------------------------------------------ Babero bandana
export function bandanaBibDefaults(ctx: GeneratorContext): Params {
  return { alto: round1(clamp((ctx.body.cuello ?? 250) * .62, 120, 220)), holguraCuello: 15, traslape: 30, margen: 6 };
}

export function generateBandanaBib(ctx: GeneratorContext, params: Params): GeneratorResult {
  const p = { ...bandanaBibDefaults(ctx), ...params }, neck = ctx.body.cuello ?? 0;
  const H = num(p, 'alto'), ease = num(p, 'holguraCuello'), overlap = num(p, 'traslape'), sa = num(p, 'margen');
  if (!babyKinds.includes(ctx.kind)) return notBaby('babero-bandana-talla');
  if (!finite(neck, H, ease, overlap, sa) || neck < 180 || neck > 360 || H < 100 || H > 260 || ease < 5 || ease > 40 || overlap < 20 || overlap > 50 || sa < 4 || sa > 10)
    return invalid('babero-bandana-medidas', 'Revisa cuello, alto, holgura y traslape.');
  const top = neck + ease + overlap, d = neck * .1, e = 34;
  const shape = (a: number) => outline('babero', 'Babero bandana', [P(-a, 0), P(a, 0), P(a - 8, e), P(0, H), P(-(a - 8), e)], [
    edge('cuello', 'Borde del cuello', 'costura', sa, P(-a * .45, d), P(a * .45, d)),
    edge('extremo-der', 'Extremo redondeado', 'costura', sa, P(a + 20, 0), P(a + 14, e)),
    edge('lado-der', 'Lado', 'costura', sa, P(a * .55, e + (H - e) * .1), P(14, H)),
    edge('lado-izq', 'Lado', 'costura', sa, P(-14, H), P(-a * .55, e + (H - e) * .1)),
    edge('extremo-izq', 'Extremo redondeado', 'costura', sa, P(-(a + 14), e), P(-(a + 20), 0))
  ]);
  const bib = shape(solve(a => len(shape(a), 'cuello'), top, top / 4, top / 2));
  const a = bib.nodes[1].x;
  bib.grain = { a: P(0, e), b: P(0, H * .75) };
  bib.marks.push({ id: 'broche-der', kind: 'boton', at: P(a - 4, e / 2), label: 'Broche: mitad macho (cara exterior)' }, { id: 'broche-izq', kind: 'boton', at: P(-(a - 4), e / 2), label: 'Broche: mitad hembra (reverso)' });
  const back = copyPiece(bib, 'babero-reverso', 'Reverso absorbente', { fabric: 'forro' });
  return {
    pieces: [bib, back],
    seams: [equal('contorno', 'Cara exterior con su reverso', [{ pieceId: 'babero', edgeIds: allEdges(bib) }], [{ pieceId: 'babero-reverso', edgeIds: allEdges(back) }])],
    checks: [{ key: 'cierre-cuello', label: 'Contorno cerrado del cuello', body: neck, ease, target: neck + ease, measured: len(bib, 'cuello') - overlap, tolerance: .5 }],
    materials: [
      { id: 'tela', label: 'Algodón estampado, muselina o punto', qty: '1 pieza' }, { id: 'reverso', label: 'Rizo, minky o muselina doble absorbente', qty: '1 pieza' },
      { id: 'broche', label: 'Broche de presión infantil de plástico', qty: '1 juego' }, { id: 'hilo', label: 'Hilo de coser', qty: '1 carrete' }
    ],
    assumptions: [`El borde del cuello mide ${cm(top)}: cuello + ${cm(ease)} de holgura + ${cm(overlap)} de traslape para el broche.`, 'Exterior y reverso se cosen derecho con derecho, se voltean y se pespuntean.'],
    notices: [{ level: 'aviso', code: 'babero-seguridad', message: 'Quita el babero para dormir. Usa broche infantil bien colocado, nunca cintas para atar.' }, experimental('babero-bandana-experimental', 'Babero bandana')],
    steps: [
      { id: 'cortar', title: 'Corta exterior y reverso', detail: 'Corta la cara exterior y el reverso absorbente.', pieces: ['babero', 'babero-reverso'] },
      { id: 'coser', title: 'Cose y voltea', detail: 'Enfrenta derechos y cose todo el contorno dejando 4 cm abiertos en un lado recto. Recorta las curvas, voltea, plancha y pespuntea a 4 mm cerrando la abertura.', pieces: ['babero', 'babero-reverso'], seams: ['contorno'] },
      { id: 'broche', title: 'Coloca el broche', detail: 'Coloca la mitad macho en el extremo derecho por la cara exterior y la hembra en el izquierdo por el reverso. Prueba el cierre.', pieces: ['babero'] }
    ]
  };
}

export const bandanaBibGenerator: PatternGenerator = {
  id: 'babero-bandana', name: 'Babero bandana', status: 'experimental',
  summary: 'Babero triangular de dos capas con borde de cuello calculado y broche de presión.',
  requiredMeasures: ['cuello'], optionalMeasures: [],
  defaults: bandanaBibDefaults, generate: generateBandanaBib,
  params: [
    { key: 'alto', label: 'Alto del babero', group: 'diseno', type: 'length', min: 100, max: 260 },
    { key: 'holguraCuello', label: 'Holgura de cuello', group: 'holgura', type: 'length', min: 5, max: 40 },
    { key: 'traslape', label: 'Traslape del broche', group: 'diseno', type: 'length', min: 20, max: 50 },
    { key: 'margen', label: 'Margen de costura', group: 'margenes', type: 'length', min: 4, max: 10 }
  ]
};

export const BABY_PLUS_GENERATORS: PatternGenerator[] = [bloomerGenerator, bonnetGenerator, bootiesGenerator, sleepSackGenerator, towelGenerator, bandanaBibGenerator];
