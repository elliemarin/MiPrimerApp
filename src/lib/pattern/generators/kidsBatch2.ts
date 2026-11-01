import { num, round1, str, type GeneratorContext, type GeneratorResult, type Params, type PatternGenerator } from '../generator';
import type { Issue, Piece, SeamRelation } from '../types';
import { P, bindingStrip, clamp, cm, copyPiece, edge, equal, finite, invalid, len, lens, outline, ratio, rectangle, solve } from './kidsShared';
import { bowPieces, experimentalNotice, isKid, isSmall, kidBody } from './kidsBlocks';
import { chinTab } from './kidsHats';
import { generateTrapeze, trapezeDefaults, trapezeDressGenerator } from './girls';

/* Segundo lote de diseños digitalizados desde fotos (2026-11-01): bonete de
 * tres piezas con volante, delantal pichi de una pieza, mono y peto con
 * tirantes (tres estilos) y blusa trapecio con volante opcional. Todo se traza
 * desde medidas; los cierres son botones o broches, nunca cintas al cuello. */

const notKid = (code: string) => invalid(code, 'Este patrón usa proporciones infantiles. Elige una talla de bebé, 1–4 años o niñas y niños.');
const sizeOf = (ctx: GeneratorContext) => clamp((ctx.body.pecho ?? 560) / 560, .7, 1.45);
const margin = { key: 'margen', label: 'Margen de costura', group: 'margenes' as const, type: 'length' as const, min: 5, max: 15 };

// ------------------------------------------------------------------ Bonete de tres piezas con volante
export function ruffleBonnetDefaults(ctx: GeneratorContext): Params {
  const H = ctx.body.cabeza ?? 420;
  return { volante: 'tela', altoVolante: round1(clamp(H * .085, 25, 55)), fruncido: 1.8, margen: 7 };
}

export function generateRuffleBonnet(ctx: GeneratorContext, params: Params): GeneratorResult {
  if (!isKid(ctx)) return notKid('bonete-volante-talla');
  const p = { ...ruffleBonnetDefaults(ctx), ...params }, H = ctx.body.cabeza ?? 0;
  const kind = str(p, 'volante'), vh = num(p, 'altoVolante'), gather = num(p, 'fruncido'), sa = num(p, 'margen');
  if (!finite(H, vh, gather, sa) || H < 300 || H > 580 || vh < 15 || vh > 80 || gather < 1.2 || gather > 2.5 || sa < 4 || sa > 10 || !['tela', 'doble', 'encaje', 'ninguno'].includes(kind))
    return invalid('bonete-volante-medidas', 'Revisa contorno de cabeza, volante y margen.');
  // Face opening (ear to ear over the top) ≈ 62 % of the head: two side faces plus the strip front.
  const h = H * .245, wcF = H * .13, wcB = H * .07, Lc = H * .56;
  const sideFor = (w: number) => outline('lateral', 'Lateral (par en espejo)', [P(0, 0), P(w, h * .45), P(w * .8, h), P(0, h)], [
    edge('central-a', 'Unión a la pieza central', 'costura', sa, P(w * .55, 0), P(w, h * .12)), edge('central-b', 'Unión a la pieza central', 'costura', sa, P(w, h * .75), P(w * .9, h * .95)),
    edge('cuello', 'Canto del cuello (une el forro)', 'costura', sa, P(w * .5, h + 6), P(w * .2, h + 4)), edge('cara', 'Canto de la cara (une volante y forro)', 'costura', sa)], { qty: 2, mirrorPairs: true });
  const w = solve(x => lens(sideFor(x), ['central-a', 'central-b']), Lc, H * .1, H * .6), side = sideFor(w);
  side.grain = { a: P(w * .35, h * .2), b: P(w * .35, h * .85) };
  side.marks.push({ id: 'aplique', kind: 'cruz', at: P(w * .45, h * .45), label: 'Aplique o adorno (opcional)' }, { id: 'barbiquejo', kind: 'cruz', at: P(8, h - 8), label: 'Lengüeta de barbilla' });
  const hc = Math.sqrt(Lc * Lc - ((wcF - wcB) / 2) ** 2);
  const strip = outline('central', 'Pieza central', [P(-wcF / 2, 0), P(wcF / 2, 0), P(wcB / 2, hc), P(-wcB / 2, hc)], [
    edge('cara', 'Canto de la cara', 'costura', sa), edge('lado-der', 'Unión al lateral', 'costura', sa), edge('nuca', 'Canto de la nuca', 'costura', sa), edge('lado-izq', 'Unión al lateral', 'costura', sa)]);
  strip.grain = { a: P(0, hc * .2), b: P(0, hc * .8) };
  const pieces: Piece[] = [side, strip, copyPiece(side, 'forro-lateral', 'Forro lateral (par en espejo)', { fabric: 'forro' }), copyPiece(strip, 'forro-central', 'Forro de la pieza central', { fabric: 'forro' })];
  const face = 2 * len(side, 'cara') + len(strip, 'cara');
  const seams: SeamRelation[] = [equal('central', 'Lateral con la pieza central (por lado)', [{ pieceId: 'lateral', edgeIds: ['central-a', 'central-b'] }], [{ pieceId: 'central', edgeIds: ['lado-der'] }], .5)];
  if (kind === 'tela' || kind === 'doble') {
    const ruffle = (id: string, name: string, height: number) => {
      const r = rectangle(id, name, face * gather, 2 * height, [edge('union', 'Unión a la cara (fruncir)', 'costura', sa), edge('extremo-a', 'Extremo (doblar)', 'costura', sa), edge('canto', 'Unión (capa interior)', 'costura', sa), edge('extremo-b', 'Extremo (doblar)', 'costura', sa)], { fabric: 'contraste' }, true);
      r.lines.push({ id: 'doblez', kind: 'doblez', a: P(0, height), b: P(face * gather, height), label: 'Doblar a lo largo: el doblez es el canto visible' });
      return r;
    };
    pieces.push(ruffle('volante', 'Volante de la cara (doblado)', vh));
    seams.push(ratio('volante', 'Volante fruncido a la cara', 'fruncido', [{ pieceId: 'volante', edgeIds: ['union'] }], [{ pieceId: 'lateral', edgeIds: ['cara'], factor: 2 }, { pieceId: 'central', edgeIds: ['cara'] }], gather, .05));
    if (kind === 'doble') pieces.push(ruffle('volante-interior', 'Segundo volante, más corto', vh * .65));
  }
  pieces.push(chinTab(H, sa));
  return {
    pieces, seams,
    notices: [experimentalNotice('bonete-volante-experimental', 'Bonete con volante'), { level: 'ok', code: 'sin-cintas', message: 'Cierre con lengüeta y broche bajo la barbilla: sin cintas largas. Quita el bonete para dormir.' }],
    checks: [{ key: 'cara', label: 'Contorno de la cara (de oreja a oreja por arriba)', body: H, target: H * .62, measured: face, tolerance: .5 }],
    materials: [
      { id: 'tela', label: 'Lino, algodón o pana fina (exterior)', qty: 'Dos laterales y la pieza central' }, { id: 'forro', label: 'Algodón suave para el forro', qty: 'Las mismas piezas' },
      ...(kind === 'encaje' ? [{ id: 'encaje', label: 'Puntilla o encaje fruncido', qty: cm(face * gather + 40) }] : []),
      { id: 'broche', label: 'Broche de presión infantil', qty: '1 juego' }, { id: 'adorno', label: 'Aplique o adorno cosido muy firme (opcional)', qty: '1' }
    ],
    assumptions: [`Cara de ${cm(face)} de oreja a oreja (62 % de la cabeza); pieza central de ${cm(Lc)} de la frente a la nuca.`, 'Los laterales se resuelven para que su unión mida exactamente lo mismo que la pieza central.', kind === 'ninguno' ? 'Sin volante.' : kind === 'encaje' ? 'Volante de puntilla comprada, fruncido 1,8 veces.' : `Volante doblado de ${cm(vh)}${kind === 'doble' ? ' y otro más corto encima' : ''}, fruncido ${gather.toFixed(1)} veces.`, 'Las cintas de la referencia se cambiaron por una lengüeta con broche.'],
    steps: [
      { id: 'cortar', title: 'Corta', detail: 'Dos laterales y una pieza central en exterior y en forro, el volante y las lengüetas.', pieces: pieces.map(x => x.id) },
      { id: 'armar', title: 'Arma exterior y forro', detail: 'Cose cada lateral a la pieza central, de la cara a la nuca, repartiendo la curva. Repite en el forro.', pieces: ['lateral', 'central', 'forro-lateral', 'forro-central'], seams: ['central'] },
      ...(kind !== 'ninguno' ? [{ id: 'volante', title: 'Volante', detail: kind === 'encaje' ? 'Frunce la puntilla y hilvánala por el derecho del canto de la cara.' : 'Dobla el volante a lo largo, frúncelo y hilvánalo por el derecho del canto de la cara, dejando 1 cm libre en cada extremo.', pieces: ['lateral', 'central', ...(kind === 'tela' || kind === 'doble' ? ['volante'] : [])], seams: kind === 'tela' || kind === 'doble' ? ['volante'] : [] }] : []),
      { id: 'forrar', title: 'Forra y cierra', detail: 'Hilvana las lengüetas en las marcas. Une exterior y forro por la cara y el cuello dejando 5 cm abiertos en la nuca, voltea, cierra y pespuntea.', pieces: ['lateral', 'forro-lateral', 'barbiquejo'] }
    ]
  };
}

export const ruffleBonnetGenerator: PatternGenerator = {
  id: 'bonete-volante', name: 'Bonete de tres piezas con volante', status: 'experimental',
  summary: 'Bonete forrado de dos laterales y pieza central, con volante de tela, doble o de puntilla, y lengüeta con broche.',
  requiredMeasures: ['cabeza'], optionalMeasures: [], defaults: ruffleBonnetDefaults, generate: generateRuffleBonnet,
  params: [
    { key: 'volante', label: 'Volante de la cara', group: 'diseno', type: 'choice', choices: [{ value: 'tela', label: 'De tela, doblado' }, { value: 'doble', label: 'Doble' }, { value: 'encaje', label: 'Puntilla comprada' }, { value: 'ninguno', label: 'Sin volante' }] },
    { key: 'altoVolante', label: 'Alto del volante', group: 'diseno', type: 'length', min: 15, max: 80, when: p => p.volante === 'tela' || p.volante === 'doble' },
    { key: 'fruncido', label: 'Fruncido del volante', group: 'diseno', type: 'ratio', min: 1.2, max: 2.5 },
    { key: 'margen', label: 'Margen de costura', group: 'margenes', type: 'length', min: 4, max: 10 }
  ]
};

// ------------------------------------------------------------------ Delantal pichi de una pieza
export function pinaforeApronDefaults(ctx: GeneratorContext): Params {
  const k = kidBody(ctx);
  return { volantes: 'si', bolsillo: 'si', largoDelantero: round1(clamp(k.talle + k.height * .26, 220, 700)), holgura: round1(clamp(k.chest * .18 + 40, 90, 200)), anchoBies: 8, margen: 10, dobladillo: 15 };
}

export function generatePinaforeApron(ctx: GeneratorContext, params: Params): GeneratorResult {
  if (!isKid(ctx) || ctx.kind === 'bebe') return invalid('delantal-pichi-talla', 'Este delantal es para niñas y niños desde 1 año. Elige una talla de 1–4 años o infantil.');
  const p = { ...pinaforeApronDefaults(ctx), ...params }, k = kidBody(ctx), s = sizeOf(ctx);
  const ruffles = str(p, 'volantes') === 'si', pocket = str(p, 'bolsillo') === 'si', Lf = num(p, 'largoDelantero'), ease = num(p, 'holgura'), bias = num(p, 'anchoBies'), sa = num(p, 'margen'), hem = num(p, 'dobladillo');
  if (!finite(Lf, ease, bias, sa, hem) || ease < 40 || ease > 300 || bias < 5 || bias > 12 || sa < 5 || sa > 15 || hem < 8 || hem > 40) return invalid('delantal-pichi-medidas', 'Revisa largo, holgura, ribete y márgenes.');
  const Wq = (k.chest + ease) / 4, armD = k.talle * .45 + 20 * s, Lb = k.talle * 1.05, yS = Lb, sw = 35 * s, nb = 20 * s, nf = 55 * s;
  const nw = Math.max(k.neck / 6 + 22 * s, (k.head + 20 - 2 * (nb + nf)) / 4), sx = nw + sw;
  if (sx > Wq - 15 * s || Lf < armD + 120 * s || Lb < armD + 30 * s) return invalid('delantal-pichi-proporcion', 'El hombro, la sisa o el largo no caben con estas medidas. Aumenta la holgura o el largo.');
  const vh = ruffles ? clamp(45 * s, 30, 70) : 0, Wb = Wq * 1.08, Wf = Wq * 1.35, yH = yS + Lf - vh;
  const apron = outline('delantal', 'Delantal de una pieza al doblez (espalda arriba, delantero abajo)', [
    P(0, 0), P(Wb, 0), P(Wq, yS - armD), P(sx, yS), P(Wq, yS + armD), P(Wf, yH), P(0, yH), P(0, yS + nf), P(nw, yS + nf), P(nw, yS - nb), P(0, yS - nb)
  ], [
    edge('bajo-espalda', 'Bajo de la espalda (ribete)', 'sin-margen', 0), edge('lado-espalda', 'Lado de la espalda (ribete)', 'sin-margen', 0),
    edge('sisa-espalda', 'Sisa de espalda (ribete)', 'sin-margen', 0, P(Wq - (Wq - sx) * .1, yS - armD * .45), P(sx + (Wq - sx) * .1, yS - armD * .05)),
    edge('sisa-delantera', 'Sisa delantera (ribete)', 'sin-margen', 0, P(sx + (Wq - sx) * .1, yS + armD * .05), P(Wq - (Wq - sx) * .1, yS + armD * .45)),
    edge('lado-delantero', 'Lado del delantero (ribete)', 'sin-margen', 0), ruffles ? edge('bajo', 'Bajo (une el volante)', 'costura', sa) : edge('bajo', 'Bajo', 'dobladillo', hem),
    edge('centro-delantero', 'Centro delantero (al doblez)', 'doblez', 0), edge('cuello-delantero', 'Escote delantero (ribete)', 'sin-margen', 0), edge('cuello-lado', 'Escote (ribete)', 'sin-margen', 0),
    edge('cuello-espalda', 'Escote de espalda (ribete)', 'sin-margen', 0), edge('centro-espalda', 'Centro de espalda (al doblez)', 'doblez', 0)
  ], { onFold: true });
  apron.grain = { a: P(Wq * .55, yS + armD + 20), b: P(Wq * .55, yH - 30) };
  apron.lines.push({ id: 'hombro', kind: 'referencia', a: P(nw, yS), b: P(sx, yS), label: 'Línea de hombro: no se corta, la pieza pasa por encima' });
  const yWf = yS + k.talle * .95;
  apron.marks.push({ id: 'cinta-delantera', kind: 'cruz', at: P(Wq + (Wf - Wq) * ((yWf - yS - armD) / (yH - yS - armD)) - 6, yWf), label: 'Cinta delantera' }, { id: 'cinta-espalda', kind: 'cruz', at: P(Wb - 8, 10), label: 'Cinta de espalda' });
  const tieL = clamp(Wq * .9, 150, 300), tie = rectangle('cinta', 'Cinta lateral (máx. 30 cm)', tieL, 2 * 14 * s, [edge('a', 'Canto', 'costura', sa), edge('b', 'Extremo cosido', 'costura', sa), edge('c', 'Canto', 'costura', sa), edge('d', 'Extremo libre', 'costura', sa)], { qty: 4 }, true);
  tie.lines.push({ id: 'doblez', kind: 'doblez', a: P(0, 14 * s), b: P(tieL, 14 * s), label: 'Doblar a lo largo' });
  const contour = 2 * lens(apron, ['bajo-espalda', 'lado-espalda', 'sisa-espalda', 'sisa-delantera', 'lado-delantero']) + 2 * lens(apron, ['cuello-delantero', 'cuello-lado', 'cuello-espalda']);
  const pieces: Piece[] = [apron, tie, bindingStrip('bies', 'Ribete del contorno y del escote', contour, bias, 1, 10)];
  const seams: SeamRelation[] = [];
  if (ruffles) {
    pieces.push(rectangle('volante-bajo', 'Volante del bajo al doblez', Wf * 1.6, vh, [edge('union', 'Unión (fruncir)', 'costura', sa), edge('lado', 'Lado (dobladillo estrecho)', 'dobladillo', 6), edge('bajo', 'Bajo', 'dobladillo', hem), edge('centro', 'Centro (al doblez)', 'doblez', 0)], { onFold: true, fabric: 'contraste' }, true));
    const armTop = lens(apron, ['sisa-espalda', 'sisa-delantera']) * .7;
    const fr = rectangle('volante-hombro', 'Volante del hombro (doblado)', armTop * 1.6, 2 * clamp(35 * s, 25, 55), [edge('union', 'Unión a la sisa (fruncir)', 'costura', sa), edge('extremo-a', 'Extremo', 'costura', sa), edge('canto', 'Unión (capa interior)', 'costura', sa), edge('extremo-b', 'Extremo', 'costura', sa)], { qty: 2, fabric: 'contraste' }, true);
    fr.lines.push({ id: 'doblez', kind: 'doblez', a: P(0, clamp(35 * s, 25, 55)), b: P(armTop * 1.6, clamp(35 * s, 25, 55)), label: 'Doblar a lo largo' });
    pieces.push(fr);
    seams.push(ratio('volante-bajo', 'Volante fruncido al bajo', 'fruncido', [{ pieceId: 'volante-bajo', edgeIds: ['union'] }], [{ pieceId: 'delantal', edgeIds: ['bajo'] }], 1.6, .05));
  }
  if (pocket) {
    const pw = clamp(Wq * .62, 60, 150), ph = pw * .9, r = pw * .18;
    pieces.push(outline('bolsillo', 'Bolsillo de parche', [P(0, 0), P(pw, 0), P(pw, ph - r), P(pw - r, ph), P(r, ph), P(0, ph - r)], [
      edge('boca', 'Boca (doble doblez)', 'dobladillo', 20), edge('lado-der', 'Lado (doblar)', 'costura', 7), edge('esquina-der', 'Esquina', 'costura', 7, P(pw, ph - r * .45), P(pw - r * .45, ph)),
      edge('fondo', 'Fondo (doblar)', 'costura', 7), edge('esquina-izq', 'Esquina', 'costura', 7, P(r * .45, ph), P(0, ph - r * .45)), edge('lado-izq', 'Lado (doblar)', 'costura', 7)], { fabric: 'contraste' }));
    const y0 = yWf + 30 * s;
    apron.lines.push({ id: 'bolsillo', kind: 'colocacion', a: P(Math.max(15 * s, Wq * .25), y0), b: P(Math.max(15 * s, Wq * .25) + pw, y0), label: 'Bolsillo (un lado; voltea el patrón para centrarlo si prefieres)' });
  }
  const hole = 2 * (2 * nw) + 2 * (nb + nf);
  return {
    pieces, seams,
    notices: [experimentalNotice('delantal-pichi-experimental', 'Delantal pichi'),
      hole < k.head + 20 ? { level: 'error', code: 'paso-cabeza', message: 'El escote no deja pasar la cabeza.' } : { level: 'ok', code: 'paso-cabeza', message: `Escote de ${cm(hole)}: pasa una cabeza de ${cm(k.head)}.` },
      { level: 'aviso', code: 'cintas-cortas', message: `Cintas laterales de ${cm(tieL)} como máximo, solo en la cintura (norma de seguridad infantil). Si prefieres, cámbialas por un broche.` }],
    checks: [{ key: 'pecho', label: 'Ancho de pecho (delantero + espalda)', body: k.chest, ease, target: k.chest + ease, measured: 4 * Wq, tolerance: .5 }],
    materials: [
      { id: 'tela', label: 'Lino, algodón grueso o lona ligera', qty: 'Según acomodo' }, { id: 'contraste', label: 'Tela de contraste para volantes, bolsillo y cintas', qty: 'Según acomodo' },
      { id: 'bies', label: `Bies de ${cm(bias)}`, qty: cm(contour + 40) }
    ],
    assumptions: [`Delantal de una sola pieza que pasa por encima de los hombros: espalda de ${cm(Lb)} y delantero de ${cm(Lf)}.`, `Escote cuadrado de ${cm(2 * nw)} × ${cm(nb + nf)} que pasa la cabeza sin abertura.`, 'Lados abiertos y ribeteados; se cierra con cintas cortas en la cintura.', 'Las medidas de la referencia (60 cm de falda, 18 cm de escote) no indicaban talla; el trazo sale de las medidas.'],
    steps: [
      { id: 'cortar', title: 'Corta', detail: 'Corta el delantal al doblez, las cuatro cintas, el bies' + (ruffles ? ', el volante del bajo y los del hombro' : '') + (pocket ? ' y el bolsillo' : '') + '.', pieces: pieces.map(x => x.id) },
      ...(pocket ? [{ id: 'bolsillo', title: 'Bolsillo', detail: 'Dobla la boca dos veces, dobla el contorno y cóselo sobre su línea.', pieces: ['bolsillo', 'delantal'] }] : []),
      ...(ruffles ? [{ id: 'volantes', title: 'Volantes', detail: 'Dobladilla y frunce el volante del bajo y cóselo al bajo del delantero. Dobla los volantes del hombro, frúncelos e hilvánalos sobre la parte alta de cada sisa.', pieces: ['volante-bajo', 'volante-hombro', 'delantal'], seams: ['volante-bajo'] }] : []),
      { id: 'cintas', title: 'Cintas', detail: 'Cose las cintas en tubo, voltea e hilvánalas en sus marcas, hacia dentro.', pieces: ['cinta', 'delantal'] },
      { id: 'ribete', title: 'Ribete', detail: 'Ribetea el escote y luego todo el contorno (lados, sisas y bajo de espalda) atrapando cintas y volantes. Dobladilla el bajo si no lleva volante.', pieces: ['bies', 'delantal'] }
    ]
  };
}

export const pinaforeApronGenerator: PatternGenerator = {
  id: 'delantal-pichi-infantil', name: 'Delantal pichi infantil de una pieza', status: 'experimental',
  summary: 'Delantal que pasa por encima de los hombros, con escote cuadrado, lados ribeteados, cintas cortas, volantes y bolsillo.',
  requiredMeasures: ['pecho', 'cuello', 'talleEspalda', 'cabeza'], optionalMeasures: ['estatura'],
  defaults: pinaforeApronDefaults, generate: generatePinaforeApron,
  params: [
    { key: 'volantes', label: 'Volantes en hombros y bajo', group: 'diseno', type: 'choice', choices: [{ value: 'si', label: 'Sí' }, { value: 'no', label: 'No' }] },
    { key: 'bolsillo', label: 'Bolsillo', group: 'diseno', type: 'choice', choices: [{ value: 'si', label: 'Sí' }, { value: 'no', label: 'No' }] },
    { key: 'largoDelantero', label: 'Largo del delantero (hombro a bajo)', group: 'diseno', type: 'length', min: 200, max: 900 },
    { key: 'anchoBies', label: 'Ancho del ribete', group: 'diseno', type: 'length', min: 5, max: 12 },
    { key: 'holgura', label: 'Holgura de pecho', group: 'holgura', type: 'length', min: 40, max: 300 },
    margin, { key: 'dobladillo', label: 'Dobladillo', group: 'margenes', type: 'length', min: 8, max: 40 }
  ]
};

// ------------------------------------------------------------------ Mono y peto con tirantes
export function strapRomperDefaults(ctx: GeneratorContext): Params {
  return { forma: 'pichi', largo: 'corto', bajo: 'dobladillo', bolsillos: 'si', entrepierna: isSmall(ctx) ? 'broches' : 'cerrada', lazos: 'no', holgura: 100, margen: 10, dobladillo: 20 };
}

export function generateStrapRomper(ctx: GeneratorContext, params: Params): GeneratorResult {
  if (!isKid(ctx)) return notKid('mono-tirantes-talla');
  const p = { ...strapRomperDefaults(ctx), ...params }, k = kidBody(ctx), s = sizeOf(ctx);
  const form = str(p, 'forma'), long = str(p, 'largo') === 'largo', hemType = str(p, 'bajo'), pockets = str(p, 'bolsillos') === 'si', snaps = str(p, 'entrepierna') === 'broches', bows = str(p, 'lazos') === 'si';
  const ease = num(p, 'holgura'), sa = num(p, 'margen'), hem = num(p, 'dobladillo');
  if (!finite(ease, sa, hem) || ease < 40 || ease > 220 || sa < 5 || sa > 15 || hem < 10 || hem > 40 || !['pichi', 'pico', 'peto'].includes(form) || !['dobladillo', 'volante', 'vuelta'].includes(hemType))
    return invalid('mono-tirantes-medidas', 'Revisa forma, bajo, holgura y márgenes.');
  const diaper = ctx.kind === 'bebe' ? 25 : ctx.kind === 'toddler' ? 15 : 0;
  const q = Math.max((k.chest + ease) / 4, (k.hips + ease * .8 + diaper * 1.2) / 4), ad = k.talle * .45 + 25 * s, yW = k.talle;
  const yC = yW + k.rise + 20 * s + diaper, Fe = q * .28, Be = q * .42, hF = Fe * 1.6, hB = Be * 1.4;
  const vh = hemType === 'volante' ? clamp(45 * s, 30, 70) : 0, turn = hemType === 'vuelta' ? clamp(35 * s, 25, 55) : 0;
  const ankle = k.chest * .27, inseam = ctx.body.entrepierna ?? k.rise * 2;
  const legL = long ? inseam + 10 * s + 2 * turn : Math.max(30 * s, Math.max(40 * s, inseam * .18) + 2 * turn - vh * .5);
  const yH = yC + legL, hwF = long ? Math.max(ankle * 1.7, (q + Fe) * .72) : q + Fe, hwB = hwF + (Be - Fe);
  if (legL < 25 * s || hwF < 60) return invalid('mono-tirantes-largo', 'La pierna queda demasiado corta o estrecha.');
  // Upper edge by style. Coordinates: x from centre (0) to side (q); crotch extension to negative x.
  const nw = k.neck / 6 + 16 * s, sw = clamp(32 * s, 24, 45), sy = 6 * s, ext = 15 * s;
  const yT = ad * .45, xt = q - Math.max(k.arm * .3, 30 * s), yBib = ad * .35, bw = Math.max(k.chest * .17, 55 * s), yO = yW + 30 * s, yBT = ad * .55;
  const lower = (back: boolean) => {
    const E = back ? Be : Fe, hc = back ? hB : hF, hw = back ? hwB : hwF;
    return {
      pts: [P(q, yH), P(q - hw, yH), P(-E, yC), P(0, yC - hc)],
      edges: [
        hemType === 'volante' ? edge('bajo', 'Bajo (une el volante)', 'costura', sa) : edge('bajo', 'Bajo', 'dobladillo', hemType === 'vuelta' ? 15 : hem),
        edge('entrepierna', snaps ? 'Entrepierna (cinta de broches)' : 'Entrepierna', 'costura', sa),
        edge('tiro', back ? 'Tiro trasero' : 'Tiro delantero', 'costura', sa, P(-E * .55, yC), P(0, yC - hc * .45))
      ]
    };
  };
  const piece = (back: boolean) => {
    const low = lower(back), id = back ? 'espalda' : 'delantero', name = back ? 'Espalda (par en espejo)' : 'Delantero (par en espejo)';
    let pts: ReturnType<typeof P>[], edges: ReturnType<typeof edge>[];
    if (form === 'pico') {
      const depth = back ? 40 * s : ad * .7, top = back ? 0 : -ext;
      pts = [P(0, depth), P(nw, top), P(nw + sw, sy + top), P(q, ad)];
      edges = [edge('cuello', back ? 'Escote de espalda (ribete)' : 'Escote en pico (ribete)', 'sin-margen', 0, back ? P(nw * .45, depth) : P(nw * .3, depth * .62), back ? P(nw * .8, depth * .72) : P(nw * .72, depth * .2)),
        edge('hombro', back ? 'Hombro (ribete, botón)' : 'Hombro (ribete, ojal; se cruza sobre la espalda)', 'sin-margen', 0),
        edge('sisa', 'Sisa (ribete)', 'sin-margen', 0, P(nw + sw + 6, sy + top + (ad - sy) * .45), P(q - (q - nw - sw) * .55, ad))];
    } else if (form === 'pichi' || back) {
      const t = form === 'peto' ? yBT : back ? yT - 10 * s : yT;
      pts = [P(0, t), P(xt, t), P(q, ad)];
      edges = [edge('superior', 'Canto superior (ribete)', 'sin-margen', 0), edge('sisa', 'Sisa (ribete)', 'sin-margen', 0, P(xt + 4, t + (ad - t) * .55), P(q - (q - xt) * .45, ad))];
      if (form === 'peto') { pts = [P(0, t), P(q, t), P(q, yO)]; edges = [edge('superior', 'Canto superior (ribete)', 'sin-margen', 0), edge('abertura', 'Abertura lateral (ribete)', 'sin-margen', 0)]; }
    } else {
      pts = [P(0, yBib), P(bw, yBib), P(q, yO)];
      edges = [edge('superior', 'Canto del peto (ribete)', 'sin-margen', 0), edge('lado-peto', 'Lado del peto y abertura (ribete)', 'sin-margen', 0, P(bw + 4, yBib + (yO - yBib) * .55), P(q - (q - bw) * .35, yO - 6))];
    }
    const sideTop = pts[pts.length - 1];
    const o = outline(id, name, [...pts, ...low.pts], [...edges, edge('costado', 'Costado', 'costura', sa), ...low.edges, edge('centro', back ? 'Centro de espalda' : 'Centro delantero', 'costura', sa)], { qty: 2, mirrorPairs: true });
    o.grain = { a: P(q * .45, Math.max(sideTop.y, yW) + 10), b: P(q * .45, yH - 30) };
    if (turn) o.lines.push({ id: 'vuelta', kind: 'doblez', a: P(q - hw(back) + 4, yH - turn), b: P(q - 4, yH - turn), label: `Vuelta: doblar ${cm(turn)} hacia fuera` });
    return o;
  };
  const hw = (back: boolean) => back ? hwB : hwF;
  const front = piece(false), back = piece(true);
  const pieces: Piece[] = [front, back];
  const seams: SeamRelation[] = [
    equal('costados', 'Costados', [{ pieceId: 'delantero', edgeIds: ['costado'] }], [{ pieceId: 'espalda', edgeIds: ['costado'] }]),
    equal('entrepierna', snaps ? 'Entrepierna con cinta de broches' : 'Entrepierna', [{ pieceId: 'delantero', edgeIds: ['entrepierna'] }], [{ pieceId: 'espalda', edgeIds: ['entrepierna'] }])];
  const strapW = clamp(22 * s, 16, 32);
  if (form !== 'pico') {
    const strapL = form === 'peto' ? (yBib + yBT) * 1.15 + 80 * s : 2 * yT + 70 * s;
    const strap = rectangle('tirante', form === 'peto' ? 'Tirante (se cruza en la espalda)' : 'Tirante', strapL, 2 * strapW, [edge('a', 'Canto', 'costura', sa), edge('b', 'Extremo con ojales', 'costura', sa), edge('c', 'Canto', 'costura', sa), edge('d', 'Extremo que se cose a la espalda', 'costura', sa)], { qty: 2 }, true);
    strap.lines.push({ id: 'doblez', kind: 'doblez', a: P(0, strapW), b: P(strapL, strapW), label: 'Doblar a lo largo' });
    for (const [i, x] of [18 * s, 42 * s].entries()) strap.marks.push({ id: `ojal-${i + 1}`, kind: 'ojal', at: P(strapL - x, strapW / 2), label: 'Ojal (dos posiciones para crecer)' });
    pieces.push(strap);
    front.marks.push({ id: 'boton-tirante', kind: 'boton', at: P(form === 'peto' ? bw - 14 * s : xt - 14 * s, (form === 'peto' ? yBib : yT) + 12 * s), label: 'Botón del tirante' });
    back.marks.push({ id: 'tirante', kind: 'cruz', at: P(form === 'peto' ? q * .45 : xt - 14 * s, (form === 'peto' ? yBT : yT - 10 * s) + 10 * s), label: form === 'peto' ? 'Coser el tirante (cruzado al otro lado)' : 'Coser el tirante' });
    if (form === 'peto') { front.marks.push({ id: 'boton-lateral', kind: 'boton', at: P(q - 16 * s, yO - 18 * s), label: 'Botón lateral' }); back.marks.push({ id: 'ojal-lateral', kind: 'ojal', at: P(q - 10 * s, yO - 18 * s), label: 'Presilla u ojal lateral' }); }
  } else {
    front.marks.push({ id: 'ojal-hombro', kind: 'ojal', at: P(nw + sw / 2, -ext + 10 * s), label: 'Ojal del hombro' });
    back.marks.push({ id: 'boton-hombro', kind: 'boton', at: P(nw + sw / 2, sy * .5 + 10 * s), label: 'Botón del hombro' });
  }
  if (bows) pieces.push(...bowPieces('', 30 * s, 11 * s, 6, 'principal', 2));
  if (hemType === 'volante') {
    pieces.push(rectangle('volante', 'Volante de pierna', (hwF + hwB) * 1.6, vh, [edge('union', 'Unión (fruncir)', 'costura', sa), edge('lado-a', 'Costura del anillo', 'costura', sa), edge('bajo', 'Bajo', 'dobladillo', 10), edge('lado-b', 'Costura del anillo', 'costura', sa)], { qty: 2 }, true));
    seams.push(ratio('volante', 'Volante fruncido al bajo de la pierna', 'fruncido', [{ pieceId: 'volante', edgeIds: ['union'] }], [{ pieceId: 'delantero', edgeIds: ['bajo'] }, { pieceId: 'espalda', edgeIds: ['bajo'] }], 1.6, .05));
  }
  if (pockets) {
    if (form === 'peto') {
      const pw = Math.min(bw * 1.4, 110 * s), ph = pw * .85;
      pieces.push(rectangle('bolsillo', 'Bolsillo del peto (centrado sobre la costura)', pw, ph, [edge('boca', 'Boca (doble doblez)', 'dobladillo', 20), edge('lado-der', 'Lado (doblar)', 'costura', 7), edge('fondo', 'Fondo (doblar)', 'costura', 7), edge('lado-izq', 'Lado (doblar)', 'costura', 7)]));
      front.lines.push({ id: 'bolsillo', kind: 'colocacion', a: P(0, yBib + 25 * s), b: P(pw / 2, yBib + 25 * s), label: 'Bolsillo del peto: mitad en cada delantero' });
    } else {
      const pw = clamp(q * .55, 45, 120), ph = pw * 1.05, r = pw * .25;
      pieces.push(outline('bolsillo', 'Bolsillo de parche', [P(0, 0), P(pw, 0), P(pw, ph - r), P(pw - r, ph), P(r, ph), P(0, ph - r)], [
        edge('boca', 'Boca (doble doblez)', 'dobladillo', 20), edge('lado-der', 'Lado (doblar)', 'costura', 7), edge('esquina-der', 'Esquina', 'costura', 7, P(pw, ph - r * .45), P(pw - r * .45, ph)),
        edge('fondo', 'Fondo (doblar)', 'costura', 7), edge('esquina-izq', 'Esquina', 'costura', 7, P(r * .45, ph), P(0, ph - r * .45)), edge('lado-izq', 'Lado (doblar)', 'costura', 7)], { qty: 2, mirrorPairs: true }));
      const y0 = yW + 10 * s, x0 = Math.max(12 * s, (q - pw) * .4);
      front.lines.push({ id: 'bolsillo', kind: 'colocacion', a: P(x0, y0), b: P(x0 + pw, y0), label: 'Bolsillo: canto superior' });
    }
  }
  const binding = lens(front, form === 'pico' ? ['cuello', 'hombro', 'sisa'] : form === 'peto' ? ['superior', 'lado-peto'] : ['superior', 'sisa']) + lens(back, form === 'pico' ? ['cuello', 'hombro', 'sisa'] : form === 'peto' ? ['superior', 'abertura'] : ['superior', 'sisa']);
  pieces.push(bindingStrip('bies', 'Ribete de los cantos superiores', binding, 8, 2, 10));
  const notices: Issue[] = [experimentalNotice('mono-tirantes-experimental', form === 'peto' ? 'Peto infantil' : 'Mono infantil'), { level: 'ok', code: 'sin-cintas', message: form === 'pico' ? 'Hombros con botón y ojal (sin cintas al cuello); los lazos, si los pones, son decorativos y van cosidos.' : 'Tirantes con botones y dos posiciones para crecer; sin cintas al cuello.' }];
  if (ctx.kind === 'bebe') notices.push({ level: 'aviso', code: 'botones-bebe', message: 'En bebés usa broches de presión o revisa los botones antes de cada uso.' });
  return {
    pieces, seams, notices,
    checks: [{ key: 'contorno', label: 'Contorno del cuerpo terminado', body: Math.max(k.chest, k.hips), ease: 4 * q - Math.max(k.chest, k.hips), target: 4 * q, measured: 2 * front.nodes.find(n => Math.abs(n.y - yH) < 1e-6 && n.x > 0)!.x + 2 * back.nodes.find(n => Math.abs(n.y - yH) < 1e-6 && n.x > 0)!.x, tolerance: .5 }],
    materials: [
      { id: 'tela', label: 'Lino, algodón, chambray, mezclilla ligera o pana fina', qty: 'Según acomodo' }, { id: 'bies', label: 'Bies de 8 mm', qty: `2 tiras de ${cm(binding + 20)}` },
      { id: 'botones', label: 'Botones de 15–18 mm o broches', qty: form === 'peto' ? '6' : form === 'pico' ? '2' : '2' },
      ...(snaps ? [{ id: 'cinta-broches', label: 'Cinta de broches', qty: `2 × ${cm(2 * len(front, 'entrepierna') + 20)}`, note: 'Para abrir la entrepierna al cambiar el pañal.' }] : [])
    ],
    assumptions: [
      `${form === 'peto' ? 'Peto con tirantes cruzados y aberturas laterales con botón' : form === 'pico' ? 'Mono de escote en pico con hombros abotonados' : 'Mono pichi con canto recto y tirantes abotonados'}, ${long ? 'pierna larga' : 'pierna corta'}${hemType === 'volante' ? ' con volante' : hemType === 'vuelta' ? ' con vuelta' : ''}.`,
      `Contorno del cuerpo ${cm(4 * q)} (el mayor de pecho y cadera más holgura${diaper ? ' y espacio para el pañal' : ''}). Delantero y espalda en dos mitades con costura central.`,
      'Las entrepiernas miden lo mismo: el trasero lleva más extensión de tiro y la misma inclinación de pierna.',
      'Las cintas para atar de las referencias se cambiaron por tirantes con botones; las medidas de las fotos no correspondían a una talla coherente y no se copiaron.'
    ],
    steps: [
      { id: 'cortar', title: 'Corta', detail: 'Dos delanteros y dos espaldas en espejo' + (form !== 'pico' ? ', dos tirantes' : '') + (pockets ? ', bolsillos' : '') + (hemType === 'volante' ? ', dos volantes' : '') + ' y el ribete.', pieces: pieces.map(x => x.id) },
      ...(pockets ? [{ id: 'bolsillos', title: 'Bolsillos', detail: 'Dobla la boca dos veces, dobla el contorno y cose cada bolsillo sobre su línea.', pieces: ['bolsillo', 'delantero'] }] : []),
      { id: 'centros', title: 'Costuras centrales', detail: 'Une los dos delanteros por el centro y el tiro; repite con las espaldas.', pieces: ['delantero', 'espalda'] },
      { id: 'costados', title: 'Costados', detail: 'Cose los costados.', pieces: ['delantero', 'espalda'], seams: ['costados'] },
      { id: 'ribetes', title: 'Ribetes y tirantes', detail: form === 'pico' ? 'Ribetea escote, hombros y sisas; haz el ojal del hombro delantero y cose el botón en la espalda.' : 'Hilvana los tirantes en la espalda y ribetea los cantos superiores y sisas atrapándolos. Haz los ojales del tirante y cose los botones.', pieces: ['delantero', 'espalda', 'bies', ...(form !== 'pico' ? ['tirante'] : [])] },
      { id: 'entrepierna', title: snaps ? 'Entrepierna con broches' : 'Entrepierna', detail: snaps ? 'Cose una cinta de broches en la entrepierna del delantero y la otra en la de la espalda, de bajo a bajo, para que se superpongan.' : 'Cose la entrepierna de un bajo al otro, haciendo coincidir la costura central.', pieces: ['delantero', 'espalda'], seams: ['entrepierna'] },
      { id: 'bajos', title: 'Bajos', detail: hemType === 'volante' ? 'Cierra cada volante en anillo, dobladíllalo, frúncelo y cóselo al bajo de la pierna.' : hemType === 'vuelta' ? 'Dobladilla y dobla la vuelta hacia fuera.' : 'Dobladilla los bajos.', pieces: ['delantero', 'espalda', ...(hemType === 'volante' ? ['volante'] : [])], seams: hemType === 'volante' ? ['volante'] : [] }
    ]
  };
}

export const strapRomperGenerator: PatternGenerator = {
  id: 'mono-tirantes-infantil', name: 'Mono y peto infantil con tirantes', status: 'experimental',
  summary: 'Mono pichi, mono de escote en pico con hombros abotonados o peto con tirantes cruzados; corto o largo, con bolsillos, volante o vuelta.',
  requiredMeasures: ['pecho', 'cadera', 'cuello', 'talleEspalda', 'tiro'], optionalMeasures: ['entrepierna', 'estatura'],
  defaults: strapRomperDefaults, generate: generateStrapRomper,
  params: [
    { key: 'forma', label: 'Forma', group: 'diseno', type: 'choice', choices: [{ value: 'pichi', label: 'Pichi: canto recto y tirantes' }, { value: 'pico', label: 'Escote en pico, hombros abotonados' }, { value: 'peto', label: 'Peto con tirantes cruzados' }] },
    { key: 'largo', label: 'Pierna', group: 'diseno', type: 'choice', choices: [{ value: 'corto', label: 'Corta' }, { value: 'largo', label: 'Larga' }] },
    { key: 'bajo', label: 'Bajo', group: 'diseno', type: 'choice', choices: [{ value: 'dobladillo', label: 'Dobladillo' }, { value: 'volante', label: 'Volante' }, { value: 'vuelta', label: 'Vuelta' }] },
    { key: 'bolsillos', label: 'Bolsillos', group: 'diseno', type: 'choice', choices: [{ value: 'si', label: 'Sí' }, { value: 'no', label: 'No' }] },
    { key: 'entrepierna', label: 'Entrepierna', group: 'diseno', type: 'choice', choices: [{ value: 'broches', label: 'Con broches (pañal)' }, { value: 'cerrada', label: 'Cerrada' }] },
    { key: 'lazos', label: 'Lazos decorativos', group: 'diseno', type: 'choice', choices: [{ value: 'no', label: 'No' }, { value: 'si', label: 'Sí, cosidos' }] },
    { key: 'holgura', label: 'Holgura', group: 'holgura', type: 'length', min: 40, max: 220 },
    margin, { key: 'dobladillo', label: 'Dobladillo', group: 'margenes', type: 'length', min: 10, max: 40 }
  ]
};

// ------------------------------------------------------------------ Blusa trapecio con volante opcional
export function trapezeTopDefaults(ctx: GeneratorContext): Params {
  const talle = ctx.body.talleEspalda ?? 260, altoVolante = round1(clamp(talle * .3, 35, 110));
  // The visible finished-length default fits either variant. Generation never
  // increases a requested length to make room for the optional ruffle.
  const largo = Math.ceil(Math.max(talle * 1.35, talle * .42 + 25 + 125 + altoVolante) * 10) / 10;
  return { ...trapezeDefaults(ctx), largo, amplitudBajo: 1.35, volanteBajo: 'no', altoVolante };
}

export function generateTrapezeTop(ctx: GeneratorContext, params: Params): GeneratorResult {
  const p = { ...trapezeTopDefaults(ctx), ...params }, ruffle = str(p, 'volanteBajo') === 'si', vh = num(p, 'altoVolante'), sa = num(p, 'margen', 10), hem = num(p, 'dobladillo', 12);
  if (ruffle && (!finite(vh) || vh < 30 || vh > 160)) return invalid('blusa-trapecio-volante', 'Revisa el alto del volante.');
  // The ruffle replaces part of the finished length, without shortening the
  // body below the drafting limit or silently lengthening the garment.
  const armDepth = (ctx.body.talleEspalda ?? 260) * .42 + 15 + (str(p, 'manga', 'sin') === 'sin' ? 10 : 0);
  const finishedL = num(p, 'largo'), bodyL = finishedL - (ruffle ? vh : 0);
  if (!finite(finishedL) || finishedL > 950 || (ruffle && bodyL < armDepth + 125 - 1e-7))
    return invalid('blusa-trapecio-largo', ruffle
      ? `El largo total incluye el volante de ${cm(vh)}. Con esta sisa debe medir al menos ${cm(Math.ceil(armDepth + 125 + vh))} y como máximo 95 cm; aumenta el largo o reduce el alto del volante.`
      : 'Revisa el largo total de la blusa: debe ser finito y no superar 95 cm.');
  const r = generateTrapeze(ctx, { ...p, largo: bodyL });
  const rename = (t: string) => t.replace(/Vestido trapecio/g, 'Blusa trapecio').replace(/vestido/g, 'blusa');
  const out: GeneratorResult = { ...r, notices: r.notices.map(n => ({ ...n, message: rename(n.message) })), assumptions: r.assumptions.map(rename), steps: r.steps.map(st => ({ ...st, title: rename(st.title), detail: rename(st.detail) })) };
  if (!r.pieces.length || !ruffle) return out;
  for (const piece of out.pieces.filter(x => x.id === 'delantero' || x.id === 'espalda')) piece.edges = piece.edges.map(e => e.id === 'bajo' ? { ...e, label: 'Bajo (une el volante)', finish: 'costura', allowance: sa } : e);
  const front = out.pieces.find(x => x.id === 'delantero')!, wv = len(front, 'bajo') * 1.6;
  const rufflePiece = rectangle('volante-bajo', 'Volante del bajo al doblez (delantero y espalda)', wv, vh, [edge('union', 'Unión (fruncir)', 'costura', sa), edge('costado', 'Costado', 'costura', sa), edge('bajo', 'Bajo', 'dobladillo', hem), edge('centro', 'Centro (al doblez)', 'doblez', 0)], { qty: 2, onFold: true }, true);
  out.pieces.push(rufflePiece);
  out.checks = out.checks.map(check => check.key === 'largo-centro' ? {
    ...check, label: 'Largo total desde la línea de hombro al bajo (centro delantero, incluye volante)',
    target: finishedL, measured: front.nodes[6].y + len(rufflePiece, 'costado')
  } : check);
  out.seams.push(ratio('volante-bajo', 'Volante fruncido al bajo', 'fruncido', [{ pieceId: 'volante-bajo', edgeIds: ['union'] }], [{ pieceId: 'delantero', edgeIds: ['bajo'] }], 1.6, .06));
  out.steps = out.steps.map(st => st.id === 'cortar'
    ? { ...st, detail: `${st.detail} Volante del bajo: 2 al doblez (uno delantero y uno trasero).`, pieces: [...st.pieces, 'volante-bajo'] }
    : st.id === 'bajo' ? { id: 'volante', title: 'Volante y botón', detail: 'Une los volantes por los costados, dobladilla su bajo, frúncelos y cóselos al bajo de la blusa. Cose el botón frente a la presilla.', pieces: ['volante-bajo', 'delantero', 'espalda'], seams: ['volante-bajo'] } : st);
  out.assumptions.push(`Largo total terminado de ${cm(finishedL)} en el centro delantero: cuerpo de ${cm(bodyL)} más volante de ${cm(vh)}, fruncido 1,6 veces. Los márgenes se añaden por separado.`);
  return out;
}

export const trapezeTopGenerator: PatternGenerator = {
  ...trapezeDressGenerator, id: 'blusa-trapecio-infantil', name: 'Blusa trapecio infantil', summary: 'Blusa sin mangas en trapecio con abertura y botón en la espalda, escote y sisas al bies y volante opcional en el bajo.',
  defaults: trapezeTopDefaults, generate: generateTrapezeTop,
  params: [
    ...trapezeDressGenerator.params.map(param => param.key === 'largo' ? { ...param, label: 'Largo total desde el hombro (incluye volante)' } : param),
    { key: 'volanteBajo', label: 'Volante en el bajo', group: 'diseno', type: 'choice', choices: [{ value: 'no', label: 'No' }, { value: 'si', label: 'Sí' }] },
    { key: 'altoVolante', label: 'Alto del volante', group: 'diseno', type: 'length', min: 30, max: 160, when: p => p.volanteBajo === 'si' }
  ]
};

export const KIDS_BATCH2_GENERATORS = [ruffleBonnetGenerator, pinaforeApronGenerator, strapRomperGenerator, trapezeTopGenerator];
