import { num, round1, str, type GeneratorContext, type GeneratorResult, type Params, type PatternGenerator } from '../generator';
import type { Issue, Piece, SeamRelation } from '../types';
import { P, arc, bindingStrip, clamp, cm, copyPiece, edge, equal, finite, invalid, len, lens, outline, ratio, rectangle } from './kidsShared';

/* Colección infantil (niña): vestidos y faldas con construcción propia.
 * Todas las piezas se dibujan sobre la línea de costura terminada; el motor
 * añade cada margen una sola vez. Todo entra como experimental. */

const KIDS = ['bebe', 'toddler', 'infantil'];
const childOnly = (ctx: GeneratorContext) => KIDS.includes(ctx.kind);
const elasticFor = (ctx: GeneratorContext) => ctx.kind === 'bebe' ? 15 : childOnly(ctx) ? 20 : 25;
const elasticRatioFor = (ctx: GeneratorContext) => ctx.kind === 'bebe' ? .95 : childOnly(ctx) ? .92 : .9;
const skirtLengthFor = (ctx: GeneratorContext, factor: number, adult: number) => ctx.body.estatura && childOnly(ctx) ? round1(ctx.body.estatura * factor) : adult;
const experimental = (code: string, what: string): Issue => ({ level: 'aviso', code, message: `${what} experimental: imprime al 100 %, comprueba la escala y cose una muestra antes de cortar la tela definitiva.` });

// ------------------------------------------------------------ Vestido trapecio
interface TrapezeGeometry { q: number; neckHalf: number; fDepth: number; bDepth: number; shoulderHalf: number; drop: number; armDepth: number; L: number; hemHalf: number; ySide: number }

function trapezeGeometry(ctx: GeneratorContext, p: Params): TrapezeGeometry {
  const b = ctx.body, sleeve = str(p, 'manga', 'sin');
  const chest = b.pecho ?? 560, neck = b.cuello ?? 270, shoulders = b.hombros ?? 260, talle = b.talleEspalda ?? 260;
  const q = (chest + num(p, 'holgura', 90)) / 4;
  const shoulderHalf = Math.min(shoulders / 2 - (sleeve === 'sin' ? 12 : 8), q - 15);
  // Newborn shoulders are narrow: keep at least 2 cm of shoulder seam beside the neck.
  const neckHalf = Math.min(neck * .2 + 8, shoulderHalf - 20);
  const armDepth = talle * .42 + 15 + (sleeve === 'sin' ? 10 : 0), L = num(p, 'largo', 560);
  const hemHalf = q * num(p, 'amplitudBajo', 1.7), tan = (hemHalf - q) / (L - armDepth);
  return { q, neckHalf, fDepth: neck * .25, bDepth: 18, shoulderHalf, drop: Math.max(0, (shoulderHalf - neckHalf) * .25), armDepth, L, hemHalf, ySide: L - hemHalf * tan * .5 };
}

function trapezeBodice(g: TrapezeGeometry, back: boolean, sa: number, hem: number, slit: number): Piece {
  const depth = back ? g.bDepth : g.fDepth;
  const S = P(g.shoulderHalf, g.drop), U = P(g.q, g.armDepth), H = P(g.hemHalf, g.ySide), C = P(0, g.L);
  const M = P(g.shoulderHalf - (back ? 4 : 8), g.drop + .55 * (g.armDepth - g.drop));
  const ul = Math.hypot(g.shoulderHalf - g.neckHalf, g.drop), perp = P(-g.drop / ul, (g.shoulderHalf - g.neckHalf) / ul), hU = M.y - S.y;
  const sl = Math.hypot(H.x - U.x, H.y - U.y), s = P((H.x - U.x) / sl, (H.y - U.y) / sl), tl = (U.x - M.x) * .4;
  // The armhole reaches the underarm horizontally: a perpendicular approach on
  // a strongly flared side would dip below the underarm and fold the cut line.
  const points = [P(0, depth), P(g.neckHalf, 0), S, M, U, H, C];
  const edges = [
    edge('cuello', 'Escote (ribete al bies, sin margen)', 'sin-margen', 0, P(g.neckHalf * .55, depth), P(g.neckHalf, depth * .45)),
    edge('hombro', 'Hombro', 'costura', sa),
    edge('sisa-superior', 'Sisa superior (ribete)', 'sin-margen', 0, P(S.x + perp.x * hU * .35, S.y + perp.y * hU * .35), P(M.x, M.y - hU * .3)),
    edge('sisa-inferior', 'Sisa inferior (ribete)', 'sin-margen', 0, P(M.x, M.y + (U.y - M.y) * .45), P(U.x - tl, U.y)),
    edge('costado', 'Costado', 'costura', sa),
    edge('bajo', 'Bajo', 'dobladillo', hem, P(H.x - s.y * g.hemHalf * .38, H.y + s.x * g.hemHalf * .38), P(g.hemHalf * .38, g.L))
  ];
  if (back) {
    points.push(P(0, depth + slit));
    edges.push(edge('centro-espalda', 'Centro de espalda', 'costura', sa), edge('abertura', 'Abertura de espalda (dobladillo estrecho)', 'dobladillo', sa));
  } else edges.push(edge('centro', 'Centro delantero (al doblez)', 'doblez', 0));
  const piece = outline(back ? 'espalda' : 'delantero', back ? 'Espalda (par en espejo)' : 'Delantero al doblez', points, edges, back ? { qty: 2, mirrorPairs: true } : { onFold: true });
  piece.grain = { a: P(g.q * .45, g.armDepth + 20), b: P(g.q * .45, g.L - 40) };
  piece.notches.push({ id: 'hombro-volante', edgeId: 'sisa-inferior', s: 0, count: back ? 2 : 1, label: 'Fin del volante y del tramo superior de sisa' });
  if (back) {
    piece.lines.push({ id: 'fin-abertura', kind: 'referencia', a: P(0, depth + slit), b: P(22, depth + slit), label: 'Fin de la abertura: rematar' });
    piece.marks.push({ id: 'cierre-escote', kind: 'boton', at: P(9, depth + 9), label: 'Espalda izquierda: botón · espalda derecha: presilla' });
  }
  return piece;
}

export function trapezeDefaults(ctx: GeneratorContext): Params {
  const est = ctx.body.estatura ?? (ctx.kind === 'bebe' ? 680 : 1100);
  const base: Params = {
    manga: 'sin', largo: round1(clamp(est * .5, 260, 760)), holgura: ctx.kind === 'bebe' ? 70 : 90, amplitudBajo: 1.7,
    anchoVolante: ctx.kind === 'bebe' ? 50 : 70, anchoBies: 8, margen: 10, dobladillo: ctx.kind === 'bebe' ? 12 : 15
  };
  const g = trapezeGeometry(ctx, base);
  const neckline = 2 * len(trapezeBodice(g, false, 10, 15, 60), 'cuello') + 2 * len(trapezeBodice(g, true, 10, 15, 60), 'cuello');
  const needed = Math.ceil(((ctx.body.cabeza ?? 500) + 20 - neckline) / 2) + 10;
  return { ...base, abertura: round1(clamp(needed, 60, 180)) };
}

export function generateTrapeze(ctx: GeneratorContext, params: Params): GeneratorResult {
  const p = { ...trapezeDefaults(ctx), ...params }, b = ctx.body;
  const sleeve = str(p, 'manga', 'sin'), sa = num(p, 'margen'), hem = num(p, 'dobladillo'), slit = num(p, 'abertura');
  const ease = num(p, 'holgura'), amp = num(p, 'amplitudBajo'), flutterDepth = num(p, 'anchoVolante'), bias = num(p, 'anchoBies');
  if (!childOnly(ctx)) return invalid('vestido-trapecio-talla', 'Este vestido se traza con proporciones infantiles. Elige una talla de bebé, 1–4 años o niña.');
  const g = trapezeGeometry(ctx, p);
  if (!finite(sa, hem, slit, ease, amp, flutterDepth, bias, g.L, g.q) || !b.pecho || !b.cabeza || b.pecho < 380 || b.pecho > 900
    || ease < 40 || ease > 200 || amp < 1.1 || amp > 2.4 || g.L < g.armDepth + 120 || g.L > 950 || g.shoulderHalf < g.neckHalf + 18
    || slit < 40 || slit > g.L * .45 || sa < 5 || sa > 15 || hem < 8 || hem > 40 || bias < 5 || bias > 12 || flutterDepth < 30 || flutterDepth > 140 || !['sin', 'volante'].includes(sleeve))
    return invalid('vestido-trapecio-medidas', 'Revisa largo, holgura, vuelo, abertura y márgenes: el largo debe pasar al menos 12 cm de la axila y el hombro debe quedar más ancho que el escote.');
  const front = trapezeBodice(g, false, sa, hem, slit), back = trapezeBodice(g, true, sa, hem, slit);
  const pieces: Piece[] = [front, back];
  const seams: SeamRelation[] = [
    equal('hombros', 'Hombros: delantero con espalda', [{ pieceId: 'delantero', edgeIds: ['hombro'] }], [{ pieceId: 'espalda', edgeIds: ['hombro'] }]),
    equal('costados', 'Costados: delantero con espalda', [{ pieceId: 'delantero', edgeIds: ['costado'] }], [{ pieceId: 'espalda', edgeIds: ['costado'] }])
  ];
  const neckline = 2 * len(front, 'cuello') + 2 * len(back, 'cuello');
  const armhole = lens(front, ['sisa-superior', 'sisa-inferior']) + lens(back, ['sisa-superior', 'sisa-inferior']);
  if (sleeve === 'volante') {
    const attach = len(front, 'sisa-superior') + len(back, 'sisa-superior'), r1 = attach / Math.PI, r2 = r1 + flutterDepth, O = P(0, 0);
    const a1 = arc(O, r1, Math.PI, 1.5 * Math.PI), a2 = arc(O, r1, 1.5 * Math.PI, 2 * Math.PI), b1 = arc(O, r2, 2 * Math.PI, 1.5 * Math.PI), b2 = arc(O, r2, 1.5 * Math.PI, Math.PI);
    const flutter = outline('volante', 'Volante de manga', [a1.start, a2.start, P(r1, 0), P(r2, 0), b2.start, P(-r2, 0)], [
      edge('union-a', 'Unión a sisa delantera', 'sin-margen', 0, a1.c1, a1.c2), edge('union-b', 'Unión a sisa trasera', 'sin-margen', 0, a2.c1, a2.c2),
      edge('extremo-der', 'Extremo (dobladillo estrecho)', 'dobladillo', 6), edge('volante-b', 'Canto del volante', 'dobladillo', 6, b1.c1, b1.c2),
      edge('volante-a', 'Canto del volante', 'dobladillo', 6, b2.c1, b2.c2), edge('extremo-izq', 'Extremo (dobladillo estrecho)', 'dobladillo', 6)
    ], { qty: 2 });
    flutter.grain = { a: P(0, -r1 - flutterDepth * .2), b: P(0, -r2 + flutterDepth * .2) };
    flutter.notches.push({ id: 'hombro', edgeId: 'union-b', s: 0, count: 1, label: 'Costura de hombro' });
    pieces.push(flutter);
    seams.push(equal('volante-sisa', 'Volante con el tramo superior de la sisa', [{ pieceId: 'volante', edgeIds: ['union-a', 'union-b'] }], [{ pieceId: 'delantero', edgeIds: ['sisa-superior'] }, { pieceId: 'espalda', edgeIds: ['sisa-superior'] }]));
  }
  pieces.push(bindingStrip('bies-escote', 'Bies del escote', neckline, bias, 1, 10), bindingStrip('bies-sisa', 'Bies de sisa', armhole, bias, 2, 0));
  const loop = rectangle('presilla', 'Presilla del botón (tubo al bies)', 70, 24, [edge('a', 'Canto', 'sin-margen', 0), edge('b', 'Extremo', 'sin-margen', 0), edge('c', 'Canto', 'sin-margen', 0), edge('d', 'Extremo', 'sin-margen', 0)], { fabric: 'contraste' }, true);
  pieces.push(loop);
  seams.push(
    equal('ribete-escote', 'Escote completo con su bies', [{ pieceId: 'delantero', edgeIds: ['cuello'], factor: 2 }, { pieceId: 'espalda', edgeIds: ['cuello'], factor: 2 }], [{ pieceId: 'bies-escote', edgeIds: ['largo-superior'] }]),
    equal('ribete-sisa', 'Cada sisa con su bies', [{ pieceId: 'delantero', edgeIds: ['sisa-superior', 'sisa-inferior'] }, { pieceId: 'espalda', edgeIds: ['sisa-superior', 'sisa-inferior'] }], [{ pieceId: 'bies-sisa', edgeIds: ['largo-superior'] }])
  );
  const opening = neckline + 2 * slit, head = b.cabeza;
  const notices: Issue[] = [opening < head + 20
    ? { level: 'error', code: 'paso-cabeza', message: `El escote abierto mide ${cm(opening)} y la cabeza ${cm(head)}. Alarga la abertura de espalda hasta al menos ${cm(Math.ceil((head + 20 - neckline) / 2))}.` }
    : { level: 'ok', code: 'paso-cabeza', message: `Con la abertura desabrochada el escote mide ${cm(opening)}: pasa una cabeza de ${cm(head)}.` }, experimental('vestido-trapecio-experimental', 'Vestido trapecio')];
  if (ctx.kind === 'bebe') notices.push({ level: 'aviso', code: 'boton-bebe', message: 'En bebés cose el botón con hilo doble y comprueba que no se suelte antes de cada uso; puedes sustituirlo por un broche de presión infantil.' });
  const biasTotal = neckline + 20 + 2 * armhole + 70;
  return {
    pieces, seams, notices,
    checks: [
      { key: 'contorno-pecho', label: 'Contorno de pecho terminado', body: b.pecho, ease, target: b.pecho + ease, measured: 2 * front.nodes[4].x + 2 * back.nodes[4].x, tolerance: .5 },
      { key: 'largo-centro', label: 'Largo desde la línea de hombro al bajo (centro delantero)', target: g.L, measured: front.nodes[6].y, tolerance: .5 }
    ],
    materials: [
      { id: 'tela', label: 'Tela ligera de tejido plano', qty: 'Según el acomodo de piezas y el ancho de tu tela', note: 'Popelina, batista, lino ligero o algodón estampado. Prelava.' },
      { id: 'bies', label: `Tela para bies (o bies comprado de ${cm(bias)})`, qty: `${cm(biasTotal)} de tira al bies de ${cm(4 * bias)}`, note: 'Incluye escote, dos sisas y la presilla.' },
      { id: 'boton', label: 'Botón plano de 12–15 mm', qty: '1' },
      { id: 'hilo', label: 'Hilo de coser', qty: '1 carrete' }
    ],
    assumptions: [
      `Contorno de pecho = pecho + ${cm(ease)} de holgura, aplicada una sola vez. El vestido no lleva cintura marcada: cae en trapecio desde la sisa.`,
      `Contorno de bajo aproximado: ${cm(2 * len(front, 'bajo') + 2 * len(back, 'bajo'))} (${amp.toFixed(2)} × medio contorno de pecho en cada mitad).`,
      'Escote y sisas se rematan con bies envolvente: esos bordes no llevan margen. El bajo sube ligeramente en el costado para quedar perpendicular a la costura.',
      sleeve === 'volante' ? 'El volante es un semicírculo cuyo canto interior mide exactamente el tramo superior de la sisa (de piquete a piquete).' : 'Sin mangas: la sisa queda 1 cm más baja que en la versión con volante para dar movimiento.'
    ],
    steps: [
      { id: 'cortar', title: 'Corta y marca', detail: `Delantero: 1 al doblez. Espalda: 2 en espejo. Marca piquetes de sisa y el fin de la abertura (${cm(slit)} desde el escote).${sleeve === 'volante' ? ' Volante: 2.' : ''} Corta el bies y la presilla al bies.`, pieces: pieces.map(piece => piece.id) },
      { id: 'espalda', title: 'Une el centro de espalda', detail: 'Derecho con derecho, cose el centro de espalda desde el bajo hasta la marca de abertura y remata. Termina los márgenes. Por encima de la marca, dobla dos veces el margen de la abertura hacia el revés y pespuntea.', pieces: ['espalda'] },
      { id: 'hombros', title: 'Cose los hombros', detail: 'Une delantero y espaldas por los hombros, termina los márgenes y plánchalos hacia la espalda.', pieces: ['delantero', 'espalda'], seams: ['hombros'] },
      ...(sleeve === 'volante' ? [{ id: 'volantes', title: 'Prepara y coloca los volantes', detail: 'Haz un dobladillo estrecho de 3 mm + 3 mm en el canto curvo y los extremos de cada volante. Hilvánalo por el derecho de la sisa, con el piquete en la costura de hombro y los extremos en los piquetes de sisa.', pieces: ['volante', 'delantero', 'espalda'], seams: ['volante-sisa'] }] : []),
      { id: 'sisas', title: 'Ribetea las sisas', detail: `Abre el bies, cóselo por el derecho de la sisa en su primer pliegue${sleeve === 'volante' ? ' atrapando el volante' : ''}, vuelve el bies al revés envolviendo el canto y pespuntea desde el derecho. Los extremos quedarán dentro de la costura de costado.`, pieces: ['delantero', 'espalda', 'bies-sisa'], seams: ['ribete-sisa'] },
      { id: 'costados', title: 'Cierra los costados', detail: 'Une delantero y espalda por los costados, desde el ribete de la sisa hasta el bajo. Termina y plancha los márgenes.', pieces: ['delantero', 'espalda'], seams: ['costados'] },
      { id: 'escote', title: 'Ribetea el escote y coloca la presilla', detail: 'Cose la presilla en tubo, voltéala y dóblala en U. Hilvánala en la parte alta de la espalda derecha. Ribetea el escote como las sisas, doblando 1 cm de bies hacia dentro en cada extremo de la abertura.', pieces: ['delantero', 'espalda', 'bies-escote', 'presilla'], seams: ['ribete-escote'] },
      { id: 'bajo', title: 'Haz el dobladillo y el botón', detail: `Dobla ${cm(hem)} del bajo en dos pasos, sin estirar la curva, y pespuntea. Cose el botón en la espalda izquierda frente a la presilla.`, pieces: ['delantero', 'espalda'] },
      { id: 'probar', title: 'Prueba la prenda', detail: 'Comprueba que la cabeza pase con la abertura desabrochada, que las sisas no rocen y el largo. Anota los cambios antes de cortar la tela definitiva.', pieces: ['delantero', 'espalda'] }
    ]
  };
}

export const trapezeDressGenerator: PatternGenerator = {
  id: 'vestido-trapecio-infantil', name: 'Vestido trapecio infantil', status: 'experimental',
  summary: 'Vestido sin cintura con delantero al doblez, abertura con botón en la espalda, escote y sisas al bies; sin mangas o con volantes.',
  requiredMeasures: ['pecho', 'cuello', 'hombros', 'talleEspalda', 'cabeza'], optionalMeasures: ['estatura'],
  defaults: trapezeDefaults, generate: generateTrapeze,
  params: [
    { key: 'manga', label: 'Mangas', group: 'diseno', type: 'choice', choices: [{ value: 'sin', label: 'Sin mangas' }, { value: 'volante', label: 'Volantes de mariposa' }] },
    { key: 'largo', label: 'Largo desde el hombro', group: 'diseno', type: 'length', min: 220, max: 950 },
    { key: 'amplitudBajo', label: 'Vuelo del bajo (bajo / pecho)', group: 'diseno', type: 'ratio', min: 1.1, max: 2.4 },
    { key: 'abertura', label: 'Largo de la abertura de espalda', group: 'diseno', type: 'length', min: 40, max: 300, help: 'Debe permitir pasar la cabeza con el botón abierto; el patrón lo comprueba.' },
    { key: 'anchoVolante', label: 'Ancho del volante', group: 'diseno', type: 'length', min: 30, max: 140, when: p => p.manga === 'volante' },
    { key: 'anchoBies', label: 'Ancho visible del bies', group: 'diseno', type: 'length', min: 5, max: 12 },
    { key: 'holgura', label: 'Holgura de pecho', group: 'holgura', type: 'length', min: 40, max: 200 },
    { key: 'margen', label: 'Margen de costura', group: 'margenes', type: 'length', min: 5, max: 15 },
    { key: 'dobladillo', label: 'Dobladillo', group: 'margenes', type: 'length', min: 8, max: 40 }
  ]
};

// ------------------------------------------------- Vestido de tirantes fruncido
export function sundressDefaults(ctx: GeneratorContext): Params {
  const talle = ctx.body.talleEspalda ?? 270, body = Math.round(talle * .55);
  return { largoFalda: skirtLengthFor(ctx, .3, 360), altoCuerpo: body, holgura: 60, fruncido: 1.8, anchoTirante: 15, largoTirante: round1(2 * (talle - body) + 60), margen: 10, dobladillo: 30 };
}

export function generateSundress(ctx: GeneratorContext, params: Params): GeneratorResult {
  const p = { ...sundressDefaults(ctx), ...params }, b = ctx.body;
  const chest = b.pecho ?? 0, hips = b.cadera ?? 0, ease = num(p, 'holgura'), gather = num(p, 'fruncido'), h = num(p, 'altoCuerpo');
  const skirtL = num(p, 'largoFalda'), strapW = num(p, 'anchoTirante'), strapL = num(p, 'largoTirante'), sa = num(p, 'margen'), hem = num(p, 'dobladillo');
  if (!['toddler', 'infantil'].includes(ctx.kind)) return invalid('vestido-tirantes-talla', 'Este vestido está pensado para 1–4 años y niñas. Elige una talla infantil.');
  if (!finite(chest, hips, ease, gather, h, skirtL, strapW, strapL, sa, hem) || chest < 420 || chest > 900 || hips < 420 || hips > 950 || ease < 30 || ease > 160
    || gather < 1.3 || gather > 2.6 || h < 70 || h > 260 || skirtL < 150 || skirtL > 800 || strapW < 10 || strapW > 30 || strapL < 120 || strapL > 600 || sa < 5 || sa > 15 || hem < 10 || hem > 60)
    return invalid('vestido-tirantes-medidas', 'Revisa alto del cuerpo, largo de falda, frunce, tirantes y márgenes.');
  const w = (Math.max(chest, hips) + ease) / 4, dip = 20;
  const front = outline('cuerpo-delantero', 'Cuerpo delantero al doblez', [P(0, 0), P(w, dip), P(w, h), P(0, h)], [
    edge('superior', 'Canto superior (con forro)', 'costura', sa, P(w * .5, 0), P(w * .82, dip)), edge('costado', 'Costado', 'costura', sa),
    edge('cintura', 'Cintura (une la falda)', 'costura', sa), edge('centro', 'Centro delantero (al doblez)', 'doblez', 0)
  ], { onFold: true });
  const back = outline('cuerpo-espalda', 'Cuerpo de espalda al doblez', [P(0, dip), P(w, dip), P(w, h), P(0, h)], [
    edge('superior', 'Canto superior (con forro)', 'costura', sa), edge('costado', 'Costado', 'costura', sa),
    edge('cintura', 'Cintura (une la falda)', 'costura', sa), edge('centro', 'Centro de espalda (al doblez)', 'doblez', 0)
  ], { onFold: true });
  front.marks.push({ id: 'tirante', kind: 'cruz', at: P(w * .55, 14), label: 'Coser aquí el extremo del tirante (por el derecho, antes de forrar)' });
  back.marks.push({ id: 'boton-tirante', kind: 'boton', at: P(w * .55, dip + 15), label: 'Botón del tirante' });
  const strap = rectangle('tirante', 'Tirante con dos ojales', strapL, 2 * strapW, [
    edge('largo-a', 'Canto largo', 'costura', sa), edge('extremo-ojal', 'Extremo con ojales', 'costura', sa), edge('largo-b', 'Canto largo', 'costura', sa), edge('extremo-frente', 'Extremo que se cose al delantero', 'costura', sa)
  ], { qty: 2 }, true);
  strap.lines.push({ id: 'doblez', kind: 'doblez', a: P(0, strapW), b: P(strapL, strapW), label: 'Doblar a lo largo' });
  for (const d of [22, 52]) strap.marks.push({ id: `ojal-${d}`, kind: 'ojal', at: P(strapL - d, strapW / 2), label: 'Ojal: elige el que ajuste mejor' });
  const skirt = (id: string, name: string) => rectangle(id, name, w * gather, skirtL, [
    edge('cintura', 'Cintura (fruncir)', 'costura', sa), edge('costado', 'Costado', 'costura', sa), edge('bajo', 'Bajo', 'dobladillo', hem), edge('centro', 'Centro (al doblez)', 'doblez', 0)
  ], { onFold: true });
  const pieces: Piece[] = [front, back, copyPiece(front, 'forro-delantero', 'Forro del cuerpo delantero', { fabric: 'forro' }), copyPiece(back, 'forro-espalda', 'Forro del cuerpo de espalda', { fabric: 'forro' }), strap, skirt('falda-delantera', 'Falda delantera al doblez'), skirt('falda-trasera', 'Falda trasera al doblez')];
  const both = (id: string, edgeIds: string[], factor = 2) => ({ pieceId: id, edgeIds, factor });
  const seams: SeamRelation[] = [
    equal('costados-cuerpo', 'Costados del cuerpo', [{ pieceId: 'cuerpo-delantero', edgeIds: ['costado'] }], [{ pieceId: 'cuerpo-espalda', edgeIds: ['costado'] }]),
    equal('costados-forro', 'Costados del forro', [{ pieceId: 'forro-delantero', edgeIds: ['costado'] }], [{ pieceId: 'forro-espalda', edgeIds: ['costado'] }]),
    equal('forro-superior', 'Canto superior con su forro', [both('cuerpo-delantero', ['superior']), both('cuerpo-espalda', ['superior'])], [both('forro-delantero', ['superior']), both('forro-espalda', ['superior'])]),
    equal('costados-falda', 'Costados de la falda', [{ pieceId: 'falda-delantera', edgeIds: ['costado'] }], [{ pieceId: 'falda-trasera', edgeIds: ['costado'] }]),
    ratio('cintura', 'Falda fruncida al cuerpo', 'fruncido', [both('falda-delantera', ['cintura']), both('falda-trasera', ['cintura'])], [both('cuerpo-delantero', ['cintura']), both('cuerpo-espalda', ['cintura'])], gather, .02, 'Reparte el frunce por cuartos: centros y costados coinciden.')
  ];
  const bodice = 4 * w;
  return {
    pieces, seams,
    checks: [
      { key: 'contorno-cuerpo', label: 'Contorno del cuerpo', body: Math.max(chest, hips), ease, target: Math.max(chest, hips) + ease, measured: 2 * front.nodes[1].x + 2 * back.nodes[1].x, tolerance: .5 },
      { key: 'largo-falda', label: 'Largo de falda terminado', target: skirtL, measured: pieces[5].nodes[2].y, tolerance: .5 }
    ],
    materials: [
      { id: 'tela', label: 'Algodón, popelina, lino ligero o chambray', qty: 'Según acomodo y ancho de tu tela', note: 'Prelava.' },
      { id: 'forro', label: 'Forro de algodón ligero para el cuerpo', qty: 'Las dos piezas de forro' },
      { id: 'botones', label: 'Botones de 15 mm', qty: '2' },
      { id: 'hilo', label: 'Hilo de coser', qty: '1 carrete' }
    ],
    assumptions: [
      `El cuerpo mide ${cm(bodice)} = mayor contorno entre pecho y cadera + ${cm(ease)}: no lleva cierre y se viste por los pies.`,
      `La falda mide ${gather.toFixed(2)} veces el contorno del cuerpo y se frunce a él.`,
      'Los tirantes se cosen al delantero y se abrochan en la espalda con botón; los dos ojales permiten ajustar el largo mientras crece. No usa cordones atados al cuello.'
    ],
    notices: [bodice < hips + 30 ? { level: 'error', code: 'no-pasa-cadera', message: 'El cuerpo no tiene holgura suficiente para pasar por la cadera. Aumenta la holgura.' } : { level: 'ok', code: 'pasa-cadera', message: `El cuerpo mide ${cm(bodice)}: pasa por cadera y hombros sin cierre.` }, experimental('vestido-tirantes-experimental', 'Vestido de tirantes')],
    steps: [
      { id: 'cortar', title: 'Corta las piezas', detail: 'Cuerpos delantero y de espalda al doblez en tela y en forro, dos tirantes y las dos faldas al doblez.', pieces: pieces.map(piece => piece.id) },
      { id: 'tirantes', title: 'Haz los tirantes', detail: 'Dobla cada tirante a lo largo, derecho con derecho. Cose el canto largo y el extremo de los ojales, voltea, plancha y abre los dos ojales marcados.', pieces: ['tirante'] },
      { id: 'cuerpo', title: 'Arma cuerpo y forro', detail: 'Une los costados del cuerpo exterior y, por separado, los del forro. Hilvana los tirantes por el derecho del delantero exterior en la marca, apuntando hacia abajo.', pieces: ['cuerpo-delantero', 'cuerpo-espalda', 'forro-delantero', 'forro-espalda', 'tirante'], seams: ['costados-cuerpo', 'costados-forro'] },
      { id: 'forrar', title: 'Forra el canto superior', detail: 'Mete el cuerpo exterior dentro del forro, derecho con derecho, y cose todo el canto superior. Recorta, voltea, plancha y pespuntea a 3 mm.', pieces: ['cuerpo-delantero', 'cuerpo-espalda', 'forro-delantero', 'forro-espalda'], seams: ['forro-superior'] },
      { id: 'falda', title: 'Prepara y frunce la falda', detail: 'Une los costados de la falda. Haz dos líneas de puntada larga en la cintura y frunce hasta el contorno del cuerpo, repartiendo por cuartos.', pieces: ['falda-delantera', 'falda-trasera'], seams: ['costados-falda'] },
      { id: 'cintura', title: 'Une la falda al cuerpo', detail: 'Cose la falda solo al cuerpo exterior. Dobla el margen del forro y ciérralo a mano o con pespunte de zanja sobre la costura.', pieces: ['cuerpo-delantero', 'cuerpo-espalda', 'falda-delantera', 'falda-trasera'], seams: ['cintura'] },
      { id: 'terminar', title: 'Bajo y botones', detail: `Dobla ${cm(hem)} del bajo en dos pasos y pespuntea. Cose los botones en la espalda y prueba el largo de los tirantes sobre la niña.`, pieces: ['falda-delantera', 'falda-trasera', 'cuerpo-espalda'] }
    ]
  };
}

export const sundressGenerator: PatternGenerator = {
  id: 'vestido-tirantes-fruncido', name: 'Vestido de tirantes con falda fruncida', status: 'experimental',
  summary: 'Cuerpo forrado sin cierre, tirantes abotonados en la espalda y falda fruncida al doblez.',
  requiredMeasures: ['pecho', 'cadera', 'talleEspalda'], optionalMeasures: ['estatura'],
  defaults: sundressDefaults, generate: generateSundress,
  params: [
    { key: 'largoFalda', label: 'Largo de falda', group: 'diseno', type: 'length', min: 150, max: 800 },
    { key: 'altoCuerpo', label: 'Alto del cuerpo (centro delantero)', group: 'diseno', type: 'length', min: 70, max: 260 },
    { key: 'fruncido', label: 'Frunce de la falda', group: 'diseno', type: 'ratio', min: 1.3, max: 2.6 },
    { key: 'largoTirante', label: 'Largo de tirante', group: 'diseno', type: 'length', min: 120, max: 600 },
    { key: 'anchoTirante', label: 'Ancho de tirante', group: 'diseno', type: 'length', min: 10, max: 30 },
    { key: 'holgura', label: 'Holgura del cuerpo', group: 'holgura', type: 'length', min: 30, max: 160 },
    { key: 'margen', label: 'Margen de costura', group: 'margenes', type: 'length', min: 5, max: 15 },
    { key: 'dobladillo', label: 'Dobladillo', group: 'margenes', type: 'length', min: 10, max: 60 }
  ]
};

// ------------------------------------------------------ Pretina con elástico
function elasticBand(waistBand: number, elastic: number, sa: number): Piece {
  const band = rectangle('pretina', 'Pretina doblada con elástico', waistBand, 2 * (elastic + 8), [
    edge('largo-superior', 'Canto (une a la falda)', 'costura', sa), edge('extremo-der', 'Extremo', 'costura', sa),
    edge('largo-inferior', 'Canto (une a la falda)', 'costura', sa), edge('extremo-izq', 'Extremo', 'costura', sa)
  ], {}, true);
  band.lines.push({ id: 'doblez', kind: 'doblez', a: P(0, elastic + 8), b: P(waistBand, elastic + 8), label: 'Doblar a lo largo' });
  band.notes = ['Cierra los extremos en anillo, dobla a lo largo y cose ambos cantos juntos a la falda dejando 4 cm abiertos para pasar el elástico.'];
  return band;
}
const elasticMaterial = (waist: number, elasticRatio: number, elastic: number) => ({ id: 'elastico', label: `Elástico de ${cm(elastic)}`, qty: cm(waist * elasticRatio + 20), note: 'Cintura × proporción + 2 cm de traslape. Pruébalo estirado sobre la cadera.' });
const commonSkirtParams = [
  { key: 'anchoElastico', label: 'Ancho del elástico', group: 'diseno' as const, type: 'length' as const, min: 10, max: 40 },
  { key: 'proporcionElastico', label: 'Largo de elástico / cintura', group: 'diseno' as const, type: 'ratio' as const, min: .8, max: 1 }
];

// ------------------------------------------------------------- Falda de tul
export function tulleDefaults(ctx: GeneratorContext): Params {
  return { largo: skirtLengthFor(ctx, .24, 450), capas: '3', amplitud: 3, anchoElastico: elasticFor(ctx), proporcionElastico: elasticRatioFor(ctx), margen: 10, dobladilloForro: 15, anchoTela: 1500 };
}

export function generateTulle(ctx: GeneratorContext, params: Params): GeneratorResult {
  const p = { ...tulleDefaults(ctx), ...params }, waist = ctx.body.cintura ?? 0, hips = ctx.body.cadera ?? 0;
  const L = num(p, 'largo'), layers = Number(str(p, 'capas', '3')), amp = num(p, 'amplitud'), elastic = num(p, 'anchoElastico'), er = num(p, 'proporcionElastico');
  const sa = num(p, 'margen'), hemLining = num(p, 'dobladilloForro'), fabricW = num(p, 'anchoTela'), bandF = elastic + 8, bandCirc = hips + 40;
  if (!finite(waist, hips, L, layers, amp, elastic, er, sa, hemLining, fabricW) || waist < 300 || hips < 300 || hips > 1500 || L < bandF + 80 || L > 1000
    || ![2, 3, 4, 5].includes(layers) || amp < 2 || amp > 4 || elastic < 10 || elastic > 40 || er < .8 || er > 1 || sa < 5 || sa > 15 || hemLining < 8 || hemLining > 40 || fabricW < 500)
    return invalid('falda-tul-medidas', 'Revisa largo, capas, amplitud y elástico de la falda de tul.');
  const tulleW = hips * amp / 2, tulleH = L - bandF, baseW = hips * 1.3 / 2;
  const tulle = rectangle('capa-tul', 'Capa de tul (delantera o trasera)', tulleW, tulleH, [
    edge('superior', 'Cintura (fruncir)', 'costura', sa), edge('costado-der', 'Costado', 'costura', sa), edge('bajo', 'Bajo (el tul no se deshilacha)', 'orillo', 0), edge('costado-izq', 'Costado', 'costura', sa)
  ], { qty: 2 * layers });
  const base = rectangle('falda-base', 'Falda base de forro', baseW, tulleH - 20, [
    edge('superior', 'Cintura (fruncir)', 'costura', sa), edge('costado-der', 'Costado', 'costura', sa), edge('bajo', 'Bajo', 'dobladillo', hemLining), edge('costado-izq', 'Costado', 'costura', sa)
  ], { qty: 2, fabric: 'forro' });
  const band = elasticBand(bandCirc, elastic, sa);
  const pieces = [tulle, base, band];
  const tulleRatio = tulleW * 2 / bandCirc, baseRatio = baseW * 2 / bandCirc;
  const seams: SeamRelation[] = [
    equal('costados-tul', 'Costados de cada capa de tul', [{ pieceId: 'capa-tul', edgeIds: ['costado-der'] }], [{ pieceId: 'capa-tul', edgeIds: ['costado-izq'] }]),
    equal('costados-base', 'Costados de la falda base', [{ pieceId: 'falda-base', edgeIds: ['costado-der'] }], [{ pieceId: 'falda-base', edgeIds: ['costado-izq'] }]),
    equal('pretina-anillo', 'Extremos de la pretina', [{ pieceId: 'pretina', edgeIds: ['extremo-der'] }], [{ pieceId: 'pretina', edgeIds: ['extremo-izq'] }]),
    ratio('tul-pretina', 'Cada capa de tul fruncida a la pretina', 'fruncido', [{ pieceId: 'capa-tul', edgeIds: ['superior'], factor: 2 }], [{ pieceId: 'pretina', edgeIds: ['largo-inferior'] }], tulleRatio, .02),
    ratio('base-pretina', 'Falda base fruncida a la pretina', 'fruncido', [{ pieceId: 'falda-base', edgeIds: ['superior'], factor: 2 }], [{ pieceId: 'pretina', edgeIds: ['largo-inferior'] }], baseRatio, .02)
  ];
  const notices: Issue[] = [experimental('falda-tul-experimental', 'Falda de tul')];
  if (tulleW + 2 * sa > fabricW) notices.push({ level: 'aviso', code: 'ancho-tul', message: `Cada capa mide ${cm(tulleW + 2 * sa)} de ancho y tu tul ${cm(fabricW)}: divide la capa en dos paños con una costura más.` });
  return {
    pieces, seams, notices,
    checks: [
      { key: 'contorno-pretina', label: 'Contorno de la pretina (pasa por la cadera)', body: hips, ease: 40, target: bandCirc, measured: len(band, 'largo-inferior'), tolerance: .5 },
      { key: 'largo', label: 'Largo total con pretina', target: L, measured: tulleH + bandF, tolerance: .5 }
    ],
    materials: [
      { id: 'tul', label: 'Tul suave o tul de novia', qty: `${layers * 2} paños de ${cm(tulleW)} × ${cm(tulleH)}`, note: 'El tul suave no raspa la piel; el rígido da más volumen.' },
      { id: 'forro', label: 'Forro o algodón ligero para la falda base', qty: `2 paños de ${cm(baseW)} × ${cm(tulleH - 20)}` },
      { id: 'pretina', label: 'Punto o algodón para la pretina', qty: `${cm(bandCirc + 2 * sa)} × ${cm(4 * bandF + 2 * sa)}` },
      elasticMaterial(waist, er, elastic), { id: 'hilo', label: 'Hilo de coser', qty: '1 carrete' }
    ],
    assumptions: [
      `${layers} capas de tul, cada una de ${amp.toFixed(1)} veces la cadera. La pretina mide cadera + 4 cm para pasar por la cadera y el elástico la ajusta a la cintura.`,
      'La falda base de forro, 2 cm más corta, evita que el tul toque la piel y da opacidad.',
      'El bajo del tul se deja al corte: no lleva margen ni dobladillo.'
    ],
    steps: [
      { id: 'cortar', title: 'Corta las capas', detail: `Corta ${layers * 2} paños de tul, 2 de falda base y la pretina. Usa cúter rotativo y regla para el tul.`, pieces: ['capa-tul', 'falda-base', 'pretina'] },
      { id: 'costados', title: 'Cierra cada capa en anillo', detail: 'Une los dos paños de cada capa por los costados con costura francesa o recta. Haz igual con la falda base y dobladilla su bajo.', pieces: ['capa-tul', 'falda-base'], seams: ['costados-tul', 'costados-base'] },
      { id: 'fruncir', title: 'Frunce cada capa', detail: 'Frunce cada capa por separado con dos líneas de puntada larga hasta el contorno de la pretina. Apila las capas sobre la falda base y únelas con un hilván en la cintura.', pieces: ['capa-tul', 'falda-base'], seams: ['tul-pretina', 'base-pretina'] },
      { id: 'pretina', title: 'Coloca la pretina', detail: 'Cierra la pretina en anillo, dóblala a lo largo y cose sus dos cantos juntos sobre la cintura fruncida, dejando 4 cm abiertos. Termina el margen.', pieces: ['pretina'], seams: ['pretina-anillo'] },
      { id: 'elastico', title: 'Pasa el elástico', detail: 'Pasa el elástico con un imperdible, superpón 2 cm y cóselo en zigzag. Cierra la abertura y reparte el frunce.', pieces: ['pretina'] }
    ]
  };
}

export const tulleSkirtGenerator: PatternGenerator = {
  id: 'falda-tul-elastica', name: 'Falda de tul con pretina elástica', status: 'experimental',
  summary: 'Varias capas de tul fruncidas sobre una falda base de forro, con pretina doblada y elástico.',
  requiredMeasures: ['cintura', 'cadera'], optionalMeasures: ['estatura'],
  defaults: tulleDefaults, generate: generateTulle,
  params: [
    { key: 'largo', label: 'Largo total', group: 'diseno', type: 'length', min: 100, max: 1000 },
    { key: 'capas', label: 'Capas de tul', group: 'diseno', type: 'choice', choices: ['2', '3', '4', '5'].map(value => ({ value, label: `${value} capas` })) },
    { key: 'amplitud', label: 'Volumen (tul / cadera)', group: 'diseno', type: 'ratio', min: 2, max: 4 },
    ...commonSkirtParams,
    { key: 'anchoTela', label: 'Ancho del tul', group: 'diseno', type: 'length', min: 500, max: 3200 },
    { key: 'margen', label: 'Margen de costura', group: 'margenes', type: 'length', min: 5, max: 15 },
    { key: 'dobladilloForro', label: 'Dobladillo de la falda base', group: 'margenes', type: 'length', min: 8, max: 40 }
  ]
};

// ------------------------------------------------------- Falda de olanes
export function tieredDefaults(ctx: GeneratorContext): Params {
  return { largo: skirtLengthFor(ctx, .3, 620), proporcionOlan: 1.5, amplitudSuperior: 1.3, anchoElastico: elasticFor(ctx), proporcionElastico: elasticRatioFor(ctx), margen: 10, dobladillo: 20, anchoTela: 1400 };
}

export function generateTiered(ctx: GeneratorContext, params: Params): GeneratorResult {
  const p = { ...tieredDefaults(ctx), ...params }, waist = ctx.body.cintura ?? 0, hips = ctx.body.cadera ?? 0;
  const L = num(p, 'largo'), r = num(p, 'proporcionOlan'), a = num(p, 'amplitudSuperior'), elastic = num(p, 'anchoElastico'), er = num(p, 'proporcionElastico');
  const sa = num(p, 'margen'), hem = num(p, 'dobladillo'), fabricW = num(p, 'anchoTela');
  if (!finite(waist, hips, L, r, a, elastic, er, sa, hem, fabricW) || waist < 300 || hips < 300 || hips > 1500 || L < 150 || L > 1100 || r < 1.3 || r > 2
    || a < 1.15 || a > 1.8 || elastic < 10 || elastic > 40 || er < .8 || er > 1 || sa < 5 || sa > 15 || hem < 10 || hem > 50 || fabricW < 500)
    return invalid('falda-olanes-medidas', 'Revisa largo, proporción de olanes, elástico y márgenes.');
  const heights = [.28, .33, .39].map(f => L * f), widths = [hips * a / 2, hips * a * r / 2, hips * a * r * r / 2];
  const casing = elastic + 5;
  const tiers = heights.map((h, i) => {
    const top = i === 0 ? edge('superior', 'Cintura con jareta', 'jareta', casing + 10) : edge('superior', 'Unión al olán superior (fruncir)', 'costura', sa);
    const bottom = i === 2 ? edge('inferior', 'Bajo', 'dobladillo', hem) : edge('inferior', 'Unión al olán siguiente', 'costura', sa);
    const tier = rectangle(`olan-${i + 1}`, `Olán ${i + 1} (delantero o trasero)`, widths[i], h, [top, edge('costado-der', 'Costado', 'costura', sa), bottom, edge('costado-izq', 'Costado', 'costura', sa)], { qty: 2 });
    if (i === 0) tier.lines.push({ id: 'pespunte-jareta', kind: 'pespunte', a: P(0, casing), b: P(widths[0], casing), label: 'Pespunte de jareta' });
    return tier;
  });
  const seams: SeamRelation[] = [
    ...tiers.map(tier => equal(`costados-${tier.id}`, `Costados del ${tier.name.split(' (')[0].toLowerCase()}`, [{ pieceId: tier.id, edgeIds: ['costado-der'] }], [{ pieceId: tier.id, edgeIds: ['costado-izq'] }])),
    ratio('union-1-2', 'Olán 2 fruncido al olán 1', 'fruncido', [{ pieceId: 'olan-2', edgeIds: ['superior'], factor: 2 }], [{ pieceId: 'olan-1', edgeIds: ['inferior'], factor: 2 }], r, .01),
    ratio('union-2-3', 'Olán 3 fruncido al olán 2', 'fruncido', [{ pieceId: 'olan-3', edgeIds: ['superior'], factor: 2 }], [{ pieceId: 'olan-2', edgeIds: ['inferior'], factor: 2 }], r, .01)
  ];
  const notices: Issue[] = [2 * widths[0] < hips + 50 ? { level: 'error', code: 'no-pasa-cadera', message: 'El primer olán no pasa por la cadera. Aumenta su amplitud.' } : { level: 'ok', code: 'pasa-cadera', message: `El primer olán mide ${cm(2 * widths[0])} antes de fruncir con el elástico.` }, experimental('falda-olanes-experimental', 'Falda de olanes')];
  tiers.forEach((tier, i) => { if (widths[i] + 2 * sa > fabricW) notices.push({ level: 'aviso', code: `ancho-${tier.id}`, message: `El olán ${i + 1} mide ${cm(widths[i] + 2 * sa)} de ancho: une dos paños para cada mitad.` }); });
  return {
    pieces: tiers, seams, notices,
    checks: [
      { key: 'contorno-cintura', label: 'Contorno del primer olán antes del elástico', body: hips, target: hips * a, measured: 2 * len(tiers[0], 'superior'), tolerance: .5 },
      { key: 'largo', label: 'Largo terminado', target: L, measured: heights.reduce((sum, h) => sum + h, 0), tolerance: .5 }
    ],
    materials: [
      { id: 'tela', label: 'Algodón ligero, batista, gasa doble o viscosa', qty: 'Según acomodo y ancho de tu tela' },
      elasticMaterial(waist, er, elastic), { id: 'hilo', label: 'Hilo de coser', qty: '1 carrete' }
    ],
    assumptions: [`Tres olanes de alto creciente (28 %, 33 % y 39 % del largo). Cada olán mide ${r.toFixed(2)} veces el anterior y se frunce a él.`, 'El primer olán lleva la jareta integrada; no hay pretina separada.'],
    steps: [
      { id: 'cortar', title: 'Corta los olanes', detail: 'Corta dos paños de cada olán (delantero y trasero). Si un olán no cabe en el ancho de tu tela, divide cada paño en dos y añade margen a la nueva costura.', pieces: tiers.map(t => t.id) },
      { id: 'anillos', title: 'Cierra cada olán en anillo', detail: 'Une los costados de cada olán y termina los márgenes.', pieces: tiers.map(t => t.id), seams: tiers.map(t => `costados-${t.id}`) },
      { id: 'fruncir', title: 'Frunce y une los olanes', detail: 'Frunce el canto superior del olán 2 hasta el inferior del olán 1, haciendo coincidir costados y centros; cose. Repite con el olán 3 sobre el olán 2. Plancha los márgenes hacia arriba.', pieces: tiers.map(t => t.id), seams: ['union-1-2', 'union-2-3'] },
      { id: 'jareta', title: 'Jareta y bajo', detail: `Dobla 1 cm y después hasta la línea de cintura; pespuntea la jareta dejando 3 cm abiertos y pasa el elástico. Dobla ${cm(hem)} del bajo en dos pasos y cose.`, pieces: ['olan-1', 'olan-3'] }
    ]
  };
}

export const tieredSkirtGenerator: PatternGenerator = {
  id: 'falda-olanes-escalonada', name: 'Falda de tres olanes', status: 'experimental',
  summary: 'Tres olanes rectangulares, cada uno fruncido al anterior, con jareta integrada en la cintura.',
  requiredMeasures: ['cintura', 'cadera'], optionalMeasures: ['estatura'],
  defaults: tieredDefaults, generate: generateTiered,
  params: [
    { key: 'largo', label: 'Largo terminado', group: 'diseno', type: 'length', min: 150, max: 1100 },
    { key: 'proporcionOlan', label: 'Frunce entre olanes', group: 'diseno', type: 'ratio', min: 1.3, max: 2 },
    { key: 'amplitudSuperior', label: 'Amplitud del primer olán (contorno / cadera)', group: 'holgura', type: 'ratio', min: 1.15, max: 1.8 },
    ...commonSkirtParams,
    { key: 'anchoTela', label: 'Ancho de la tela', group: 'diseno', type: 'length', min: 500, max: 3200 },
    { key: 'margen', label: 'Margen de costura', group: 'margenes', type: 'length', min: 5, max: 15 },
    { key: 'dobladillo', label: 'Dobladillo', group: 'margenes', type: 'length', min: 10, max: 50 }
  ]
};

// ------------------------------------------------------- Falda circular
export function circleDefaults(ctx: GeneratorContext): Params {
  return { vuelo: 'completo', largo: skirtLengthFor(ctx, .3, 600), holguraCintura: 40, anchoElastico: elasticFor(ctx), proporcionElastico: elasticRatioFor(ctx), margen: 10, dobladillo: 10, anchoTela: 1500 };
}

export function generateCircle(ctx: GeneratorContext, params: Params): GeneratorResult {
  const p = { ...circleDefaults(ctx), ...params }, waist = ctx.body.cintura ?? 0, hips = ctx.body.cadera ?? 0;
  const full = str(p, 'vuelo', 'completo') === 'completo', L = num(p, 'largo'), ease = num(p, 'holguraCintura'), elastic = num(p, 'anchoElastico'), er = num(p, 'proporcionElastico');
  const sa = num(p, 'margen'), hem = num(p, 'dobladillo'), fabricW = num(p, 'anchoTela');
  if (!finite(waist, hips, L, ease, elastic, er, sa, hem, fabricW) || waist < 300 || hips < 300 || hips > 1500 || L < 120 || L > 1100 || ease < 20 || ease > 120
    || elastic < 10 || elastic > 40 || er < .8 || er > 1 || sa < 5 || sa > 15 || hem < 6 || hem > 25 || fabricW < 500 || !['completo', 'medio'].includes(str(p, 'vuelo')))
    return invalid('falda-circular-medidas', 'Revisa largo, holgura de cintura, elástico y márgenes.');
  const Wc = hips + ease, fraction = full ? 1 : .5, r = Wc / (2 * Math.PI * fraction), R = r + L, phi = Math.PI * fraction / 2;
  const fold = Math.PI / 2, side = fold - phi, O = P(0, 0);
  const quarter = (id: string, name: string) => {
    const inner = arc(O, r, fold, side), outer = arc(O, R, side, fold);
    const piece = outline(id, name, [inner.start, inner.end, outer.start, outer.end], [
      edge('cintura', 'Cintura (une la pretina)', 'costura', sa, inner.c1, inner.c2), edge('costado', 'Costado', 'costura', sa),
      edge('bajo', 'Bajo (dobladillo estrecho)', 'dobladillo', hem, outer.c1, outer.c2), edge('centro', 'Centro (al doblez)', 'doblez', 0)
    ], { onFold: true });
    const x = Math.min(30, (R - r) * .12);
    piece.grain = { a: P(x, r + (R - r) * .25), b: P(x, r + (R - r) * .75) };
    piece.notches.push({ id: 'cuarto', edgeId: 'cintura', s: len(piece, 'cintura') / 2, count: 1, label: 'Mitad del cuarto' });
    return piece;
  };
  const front = quarter('falda-delantera', 'Falda delantera al doblez'), back = quarter('falda-trasera', 'Falda trasera al doblez');
  const band = elasticBand(Wc, elastic, sa);
  const notices: Issue[] = [experimental('falda-circular-experimental', 'Falda circular')];
  if (R + hem + sa > fabricW / 2) notices.push({ level: 'aviso', code: 'ancho-circulo', message: `Cada pieza necesita ${cm(R + hem + sa)} desde el doblez y la tela doblada mide ${cm(fabricW / 2)}: corta cada mitad en dos paños con costura al centro o acorta el largo.` });
  notices.push({ level: 'aviso', code: 'reposo-bies', message: 'Deja colgar la falda 24 horas antes del dobladillo: las zonas al bies ceden y el bajo se empareja después.' });
  return {
    pieces: [front, back, band], notices,
    seams: [
      equal('costados', 'Costados: delantera con trasera', [{ pieceId: 'falda-delantera', edgeIds: ['costado'] }], [{ pieceId: 'falda-trasera', edgeIds: ['costado'] }]),
      equal('pretina-anillo', 'Extremos de la pretina', [{ pieceId: 'pretina', edgeIds: ['extremo-der'] }], [{ pieceId: 'pretina', edgeIds: ['extremo-izq'] }]),
      equal('cintura', 'Cintura de la falda con la pretina', [{ pieceId: 'falda-delantera', edgeIds: ['cintura'], factor: 2 }, { pieceId: 'falda-trasera', edgeIds: ['cintura'], factor: 2 }], [{ pieceId: 'pretina', edgeIds: ['largo-inferior'] }], 1)
    ],
    checks: [
      { key: 'contorno-cintura', label: 'Cintura de la falda (pasa por la cadera)', body: hips, ease, target: Wc, measured: 2 * len(front, 'cintura') + 2 * len(back, 'cintura'), tolerance: 1 },
      { key: 'largo', label: 'Largo terminado', target: L, measured: front.nodes[3].y - front.nodes[0].y, tolerance: .5 }
    ],
    materials: [{ id: 'tela', label: 'Tela fluida: viscosa, popelina suave, crepé o punto', qty: 'Según acomodo y ancho de tu tela' }, elasticMaterial(waist, er, elastic), { id: 'hilo', label: 'Hilo de coser', qty: '1 carrete' }],
    assumptions: [`${full ? 'Círculo completo' : 'Medio círculo'}: radio de cintura ${cm(r)} para un contorno de ${cm(Wc)} (cadera + ${cm(ease)}), que el elástico ajusta a la cintura.`, 'Cada pieza es un cuarto del total cortado al doblez; el centro va al hilo recto.'],
    steps: [
      { id: 'cortar', title: 'Corta las dos mitades', detail: 'Dobla la tela al hilo, coloca el centro de cada pieza en el doblez y corta delantera y trasera. Corta la pretina.', pieces: ['falda-delantera', 'falda-trasera', 'pretina'] },
      { id: 'costados', title: 'Une los costados', detail: 'Cose los dos costados y termina los márgenes. Haz un pespunte de refuerzo en la cintura para que no se estire.', pieces: ['falda-delantera', 'falda-trasera'], seams: ['costados'] },
      { id: 'pretina', title: 'Coloca la pretina', detail: 'Cierra la pretina en anillo, dóblala a lo largo y cósela a la cintura repartiendo por cuartos, sin fruncir. Deja 4 cm abiertos, pasa el elástico, cóselo en anillo y cierra.', pieces: ['falda-delantera', 'falda-trasera', 'pretina'], seams: ['pretina-anillo', 'cintura'] },
      { id: 'bajo', title: 'Dobladillo después del reposo', detail: `Cuelga la falda un día, empareja el bajo si cedió y haz un dobladillo estrecho de ${cm(hem)}.`, pieces: ['falda-delantera', 'falda-trasera'] }
    ]
  };
}

export const circleSkirtGenerator: PatternGenerator = {
  id: 'falda-circular-elastica', name: 'Falda circular con pretina elástica', status: 'experimental',
  summary: 'Círculo completo o medio círculo calculado desde la cadera, con pretina doblada y elástico.',
  requiredMeasures: ['cintura', 'cadera'], optionalMeasures: ['estatura'],
  defaults: circleDefaults, generate: generateCircle,
  params: [
    { key: 'vuelo', label: 'Vuelo', group: 'diseno', type: 'choice', choices: [{ value: 'completo', label: 'Círculo completo' }, { value: 'medio', label: 'Medio círculo' }] },
    { key: 'largo', label: 'Largo terminado', group: 'diseno', type: 'length', min: 120, max: 1100 },
    { key: 'holguraCintura', label: 'Holgura sobre la cadera', group: 'holgura', type: 'length', min: 20, max: 120 },
    ...commonSkirtParams,
    { key: 'anchoTela', label: 'Ancho de la tela', group: 'diseno', type: 'length', min: 500, max: 3200 },
    { key: 'margen', label: 'Margen de costura', group: 'margenes', type: 'length', min: 5, max: 15 },
    { key: 'dobladillo', label: 'Dobladillo', group: 'margenes', type: 'length', min: 6, max: 25 }
  ]
};

export const GIRLS_GENERATORS: PatternGenerator[] = [trapezeDressGenerator, sundressGenerator, tulleSkirtGenerator, tieredSkirtGenerator, circleSkirtGenerator];
