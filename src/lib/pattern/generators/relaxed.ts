import { formatLength } from '../../units';
import { GeneratorContext, GeneratorResult, Params, PatternGenerator, num, str, isChild, round1 } from '../generator';
import type { Issue, PEdge, Piece, SeamRelation } from '../types';
import { edgeLength } from '../outline';

const experimental: Issue = { level: 'aviso', code: 'muestra-prenda-holgada', message: 'Patrón experimental: prueba en tela económica e imprime a escala antes de cortar la tela final.' };
const margin = { key: 'margen', label: 'Margen de costura', group: 'margenes' as const, type: 'length' as const, min: 3, max: 20 };
const hem = { key: 'dobladillo', label: 'Margen de dobladillo', group: 'margenes' as const, type: 'length' as const, min: 10, max: 50 };
type EdgeSpec = { id: string; label: string; allowance: number; finish: PEdge['finish'] };
function polygon(id: string, name: string, xy: [number, number][], specs: EdgeSpec[], qty = 1, mirror = false): Piece {
  const nodes = xy.map(([x, y], i) => ({ id: `n${i}`, x, y }));
  const edges = specs.map((s, i): PEdge => ({ ...s, kind: 'line', from: nodes[i].id, to: nodes[(i + 1) % nodes.length].id }));
  const xs = xy.map(p => p[0]), ys = xy.map(p => p[1]);
  const minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys), maxY = Math.max(...ys);
  return { id, name, source: 'generada', nodes, edges, grain: { a: { x: minX + (maxX - minX) * .75, y: minY + (maxY - minY) * .25 }, b: { x: minX + (maxX - minX) * .75, y: minY + (maxY - minY) * .75 } }, cut: { qty, mirrorPairs: mirror, onFold: false, fabric: 'principal' }, notches: [], lines: [], marks: [] };
}
const spec = (id: string, label: string, allowance: number, finish: PEdge['finish'] = 'costura'): EdgeSpec => ({ id, label, allowance, finish });
const bind = (id: string, label: string) => spec(id, label, 0, 'sin-margen');
const length = (p: Piece, edge: string) => edgeLength(p, p.edges.find(e => e.id === edge)!);
function equal(id: string, label: string, a: string, ae: string[], b: string, be: string[], af = 1, bf = 1): SeamRelation {
  return { id, label, kind: 'igual', a: [{ pieceId: a, edgeIds: ae, factor: af }], b: [{ pieceId: b, edgeIds: be, factor: bf }], ratioMin: .999, ratioMax: 1.001, tolerance: .5 };
}
function rect(id: string, name: string, w: number, h: number, sa: number, qty = 1): Piece {
  return polygon(id, name, [[0, 0], [w, 0], [w, h], [0, h]], [spec('superior', 'Superior', sa), spec('derecho', 'Derecho', sa), spec('inferior', 'Inferior', sa), spec('izquierdo', 'Izquierdo', sa)], qty);
}
function backPanel(id: string, name: string, w: number, h: number, neckW: number, neckD: number, sa: number, hemA: number, armDepth?: number): Piece {
  const nl = (w - neckW) / 2, nr = (w + neckW) / 2;
  const points: [number, number][] = [[0, 0], [nl, 0], [nl, neckD], [nr, neckD], [nr, 0], [w, 0]];
  const specs: EdgeSpec[] = [spec('hombro-izq', 'Hombro izquierdo', sa), bind('cuello-izq', 'Escote izquierdo (bies)'), bind('cuello-base', 'Escote (bies)'), bind('cuello-der', 'Escote derecho (bies)'), spec('hombro-der', 'Hombro derecho', sa)];
  if (armDepth) {
    points.push([w, armDepth], [w, h], [0, h], [0, armDepth]);
    specs.push(spec('sisa-der', 'Sisa derecha', sa), spec('costado-der', 'Costado derecho', sa), spec('bajo', 'Bajo', hemA, 'dobladillo'), spec('costado-izq', 'Costado izquierdo', sa), spec('sisa-izq', 'Sisa izquierda', sa));
  } else {
    points.push([w, h], [0, h]);
    specs.push(spec('lado-der', 'Lado abierto', hemA, 'dobladillo'), spec('bajo', 'Bajo', hemA, 'dobladillo'), spec('lado-izq', 'Lado abierto', hemA, 'dobladillo'));
  }
  return polygon(id, name, points, specs);
}

export function relaxedJacketDefaults(ctx: GeneratorContext): Params {
  const child = isChild(ctx.kind), body = ctx.body;
  const base = Math.max(body.pecho ?? 920, body.cadera ?? 1000);
  const ease = ctx.fit === 'oversize' ? base * .38 : ctx.fit === 'holgado' ? base * .26 : base * .2;
  const width = (base + ease) / 2;
  const shoulder = body.hombros ?? (child ? 280 : 400);
  return { largo: round1((body.estatura ?? 1640) * .43), holgura: round1(ease), profundidadSisa: round1((body.brazo ?? (child ? 220 : 320)) / 2 + (child ? 30 : 45)), largoManga: round1(Math.max(child ? 120 : 200, (body.largoManga ?? (child ? 380 : 600)) - Math.max(0, (width - shoulder) / 2))), anchoPuno: child ? 200 : 280, escoteAncho: round1(Math.max(child ? 100 : 150, (body.pecho ?? 920) * .18)), escoteDelante: child ? 130 : 210, manga: 'si', margen: 10, dobladillo: 25 };
}
export function generateRelaxedJacket(ctx: GeneratorContext, p: Params): GeneratorResult {
  const base = Math.max(ctx.body.pecho!, ctx.body.cadera!), ease = num(p, 'holgura', 240), b = (base + ease) / 2, f = b / 2;
  const h = num(p, 'largo', 700), arm = num(p, 'profundidadSisa', 205), neck = num(p, 'escoteAncho', 170), frontD = num(p, 'escoteDelante', 210), backD = Math.max(15, neck * .16);
  const sa = num(p, 'margen', 10), ha = num(p, 'dobladillo', 25), sleeves = str(p, 'manga', 'si') === 'si';
  const back = backPanel('espalda', 'Espalda completa', b, h, neck, backD, sa, ha, arm);
  const front = polygon('delantero', 'Delanteros en par simétrico', [[0, frontD], [neck / 2, 0], [f, 0], [f, arm], [f, h], [0, h]], [bind('escote', 'Escote diagonal (bies)'), spec('hombro', 'Hombro', sa), spec('sisa', 'Sisa', sa), spec('costado', 'Costado', sa), spec('bajo', 'Bajo', ha, 'dobladillo'), bind('frente', 'Frente abierto (bies)')], 2, true);
  if (!sleeves) for (const piece of [back, front]) for (const e of piece.edges.filter(e => e.id.startsWith('sisa'))) { e.allowance = 0; e.finish = 'sin-margen'; e.label += ' (bies)'; }
  const pieces = [back, front];
  const seams = [equal('hombros', 'Cada hombro delantero con espalda', 'delantero', ['hombro'], 'espalda', ['hombro-der']), equal('costados', 'Cada costado delantero con espalda', 'delantero', ['costado'], 'espalda', ['costado-der'])];
  if (sleeves) {
    const s = num(p, 'largoManga', 500), cuff = num(p, 'anchoPuno', 280), taper = (2 * arm - cuff) / 2;
    const sleeve = polygon('manga', 'Mangas trapezoidales en par', [[0, 0], [s, taper], [s, 2 * arm - taper], [0, 2 * arm], [0, arm]], [spec('bajo-manga-a', 'Costura inferior A', sa), spec('puno', 'Puño con dobladillo', ha, 'dobladillo'), spec('bajo-manga-b', 'Costura inferior B', sa), spec('copa-espalda', 'Unión con espalda', sa), spec('copa-frente', 'Unión con delantero', sa)], 2, true);
    sleeve.grain = { a: { x: s * .2, y: arm }, b: { x: s * .8, y: arm } };
    sleeve.notches = [{ id: 'centro-hombro', edgeId: 'copa-espalda', s: arm, count: 1, label: 'Hombro' }];
    pieces.push(sleeve);
    seams.push(equal('manga-frente', 'Manga con sisa delantera', 'manga', ['copa-frente'], 'delantero', ['sisa']), equal('manga-espalda', 'Manga con sisa trasera', 'manga', ['copa-espalda'], 'espalda', ['sisa-der']), equal('bajo-manga', 'Costura bajo cada manga', 'manga', ['bajo-manga-a'], 'manga', ['bajo-manga-b']));
  }
  const notices: Issue[] = [experimental];
  if (neck >= b - 40 || neck < 60 || arm >= h - 40 || frontD >= h - 40 || frontD <= 0 || ease < 60) notices.push({ level: 'error', code: 'proporciones-chaqueta', message: 'Revisa las proporciones: el escote y la sisa deben dejar hombro y costado útiles; conserva al menos 6 cm de holgura total.' });
  if (sleeves && ctx.body.muneca && num(p, 'anchoPuno', 280) < ctx.body.muneca + (isChild(ctx.kind) ? 35 : 50)) notices.push({ level: 'aviso', code: 'puno-mano', message: 'El puño deja poco espacio sobre la muñeca: comprueba que pase la mano y aumenta su contorno si hace falta.' });
  if (ctx.fabric === 'punto') notices.push({ level: 'aviso', code: 'chaqueta-punto', message: 'Esta base se calcula sin holgura negativa. En punto, estabiliza hombros y prueba el bies; no se reduce el patrón por elasticidad.' });
  const neckBound = length(front, 'escote') * 2 + length(front, 'frente') * 2 + ['cuello-izq', 'cuello-base', 'cuello-der'].reduce((sum, id) => sum + length(back, id), 0);
  return { pieces, seams, checks: [{ key: 'contorno', label: 'Contorno del bajo, con el frente abierto', body: base, ease, target: base + ease, measured: (back.nodes.find(n => n.id === 'n5')!.x + length(front, 'bajo') * 2), tolerance: .5 }, { key: 'largo', label: 'Largo hombro a bajo', target: h, measured: back.nodes.find(n => n.id === 'n7')!.y, tolerance: .5 }],
    materials: [{ id: 'bies', label: 'Bies flexible de 18–25 mm para escote y frente', qty: formatLength(neckBound + (sleeves ? 0 : arm * 4) + 200, 'cm'), note: 'Incluye 20 cm para uniones. Escote cuadrado: esquinas con unión en inglete.' }, { id: 'hilo', label: 'Hilo de coser', qty: '1 carrete' }],
    assumptions: ['Chaqueta abierta de hombro caído y corte geométrico, sin pinzas, cruce, forro ni cuello sastre. No equivale a una bomber, cazadora vaquera o chaqueta entallada.', `El contorno útil es el mayor de pecho/cadera más ${formatLength(ease, 'cm')} de holgura una sola vez; los márgenes van fuera.`, 'Espalda con escote cuadrado poco profundo y delanteros con escote diagonal; el contorno abierto se ribetea con bies, sin margen adicional.', 'No incluye pendiente de hombro ni ajuste de busto: es un corte geométrico deliberadamente amplio. La sisa es la mitad de la entrada total de manga; comprueba movilidad y que pase la mano por el puño.'],
    steps: [{ id: 'cortar', title: 'Corta y marca las piezas', detail: `Espalda completa: 1. Delanteros: 2 en espejo.${sleeves ? ' Mangas: 2 en espejo.' : ''} Transfiere los piquetes y conserva el hilo.`, pieces: pieces.map(piece => piece.id) }, { id: 'hombros', title: 'Une los hombros', detail: 'Derecho con derecho, une cada delantero al hombro de la espalda y termina los márgenes.', pieces: ['espalda', 'delantero'], seams: ['hombros'] }, ...(sleeves ? [{ id: 'mangas', title: 'Monta las mangas en plano', detail: 'Con el cuerpo abierto, coloca cada manga. Su piquete central coincide con el hombro; una mitad se une al delantero y la otra a la espalda. Cose antes de cerrar los costados.', pieces: ['manga', 'espalda', 'delantero'], seams: ['manga-frente', 'manga-espalda'] }] : []), { id: 'costados', title: 'Cierra costados', detail: sleeves ? 'Dobla derecho con derecho y cose de puño a axila y de axila a bajo. Las uniones de sisa deben coincidir.' : 'Une los costados desde la base de la sisa hasta el bajo. Ribetea las sisas abiertas con bies.', pieces: pieces.map(piece => piece.id), seams: sleeves ? ['bajo-manga', 'costados'] : ['costados'] }, { id: 'terminar', title: 'Ribetea y termina los bajos', detail: `Ribetea escote y frente con bies; ingleta o remata las esquinas del escote cuadrado. Dobla los bajos${sleeves ? ' y puños' : ''} con el margen indicado, prueba y pespuntea.`, pieces: pieces.map(piece => piece.id) }], notices };
}
export const relaxedJacketGenerator: PatternGenerator = {
  id: 'chaqueta-hombro-caido', name: 'Chaqueta geométrica de hombro caído', summary: 'Chaqueta abierta o chaleco con sisa recta, manga trapezoidal y frente ribeteado.', status: 'experimental', requiredMeasures: ['pecho', 'cadera'], optionalMeasures: ['estatura', 'hombros', 'brazo', 'largoManga', 'muneca'], defaults: relaxedJacketDefaults, generate: generateRelaxedJacket,
  params: [{ key: 'largo', label: 'Largo desde el hombro', group: 'diseno', type: 'length', min: 250, max: 1300 }, { key: 'manga', label: 'Mangas', group: 'diseno', type: 'choice', choices: [{ value: 'si', label: 'Con mangas' }, { value: 'no', label: 'Sin mangas (chaleco)' }] }, { key: 'profundidadSisa', label: 'Profundidad de sisa recta', group: 'diseno', type: 'length', min: 100, max: 360, help: 'La entrada total de manga mide el doble: una mitad delante y otra detrás.' }, { key: 'largoManga', label: 'Largo desde el hombro caído', group: 'diseno', type: 'length', min: 100, max: 700, when: p => p.manga !== 'no' }, { key: 'anchoPuno', label: 'Contorno terminado del puño', group: 'diseno', type: 'length', min: 120, max: 700, help: 'Debe pasar la mano sin abrir costuras. No es el contorno de muñeca.', when: p => p.manga !== 'no' }, { key: 'escoteAncho', label: 'Ancho del escote de espalda', group: 'diseno', type: 'length', min: 80, max: 300 }, { key: 'escoteDelante', label: 'Profundidad del escote delantero', group: 'diseno', type: 'length', min: 60, max: 400 }, { key: 'holgura', label: 'Holgura total sobre pecho o cadera', group: 'holgura', type: 'length', min: 60, max: 600 }, margin, hem]
};

export function ponchoDefaults(ctx: GeneratorContext): Params {
  const child = isChild(ctx.kind);
  const depth = child ? round1((ctx.body.cabeza ?? 520) * .18) : 100;
  const neckWidth = Math.max(child ? 140 : 200, ((ctx.body.cabeza ?? (child ? 520 : 580)) + 40 - 2 * depth) / 2.3);
  return { ancho: round1((ctx.body.pecho ?? 920) * 1.05 + (child ? 50 : 100)), largo: round1((ctx.body.estatura ?? 1640) * .43), escoteAncho: round1(neckWidth), escoteProfundo: depth, aperturaFrente: 'no', margen: 10, dobladillo: 20 };
}
export function generatePoncho(ctx: GeneratorContext, p: Params): GeneratorResult {
  const w = num(p, 'ancho', 1100), h = num(p, 'largo', 700), nw = num(p, 'escoteAncho', 200), nd = num(p, 'escoteProfundo', 100), backD = nw * .15, open = str(p, 'aperturaFrente', 'no') === 'si', sa = num(p, 'margen', 10), ha = num(p, 'dobladillo', 20);
  const back = backPanel('espalda', 'Panel trasero del poncho', w, h, nw, backD, sa, ha);
  const front = open ? polygon('delantero', 'Paneles delanteros de ruana', [[0, nd], [nw / 2, nd], [nw / 2, 0], [w / 2, 0], [w / 2, h], [0, h]], [bind('escote-base', 'Escote (bies)'), bind('escote-lado', 'Escote (bies)'), spec('hombro', 'Hombro', sa), spec('lado', 'Lado abierto', ha, 'dobladillo'), spec('bajo', 'Bajo', ha, 'dobladillo'), bind('frente', 'Frente abierto (bies)')], 2, true) : backPanel('delantero', 'Panel delantero del poncho', w, h, nw, nd, sa, ha);
  const pieces = [back, front];
  const seam = open ? equal('hombros', 'Cada hombro de ruana', 'delantero', ['hombro'], 'espalda', ['hombro-der']) : equal('hombros', 'Hombros de los dos paños', 'delantero', ['hombro-izq', 'hombro-der'], 'espalda', ['hombro-izq', 'hombro-der']);
  const opening = 2 * nw + 2 * (nd + backD);
  const notices: Issue[] = [experimental];
  if (nw >= w - 100 || nd >= h - 40 || nw < 60 || h <= backD + 40) notices.push({ level: 'error', code: 'proporciones-poncho', message: 'El escote debe dejar al menos 5 cm de hombro a cada lado y tela bajo la abertura.' });
  if (!open && ctx.body.cabeza && (opening < ctx.body.cabeza + 20 || Math.min(nw,nd+backD) < ctx.body.cabeza / Math.PI * .65)) notices.push({ level: 'error', code: 'poncho-no-pasa-cabeza', message: 'El escote es estrecho o su perímetro no deja 2 cm sobre la cabeza. Amplía ancho o profundidad y comprueba la abertura en una muestra.' });
  const perimeter = pieces.reduce((sum, piece) => sum + piece.edges.filter(e => e.finish === 'sin-margen').reduce((s, e) => s + edgeLength(piece, e), 0) * piece.cut.qty, 0);
  return { pieces, seams: [seam], checks: [{ key: 'ancho', label: 'Ancho de paño terminado', target: w, measured: length(back, 'bajo'), tolerance: .5 }, { key: 'largo', label: 'Largo de hombro a bajo', target: h, measured: back.nodes[6].y, tolerance: .5 }, ...(!open ? [{ key: 'escote', label: 'Perímetro de abertura de cabeza', target: opening, measured: pieces.reduce((sum, piece) => sum + piece.edges.filter(e => e.id.startsWith('cuello')).reduce((s, e) => s + edgeLength(piece, e), 0), 0), tolerance: .5 }] : [])],
    materials: [{ id: 'bies', label: 'Bies para escote y frente abierto', qty: formatLength(perimeter + 200, 'cm') }, { id: 'hilo', label: 'Hilo de coser', qty: '1 carrete' }], assumptions: ['Poncho rectangular de dos paños con costuras de hombro; los costados permanecen abiertos. No es una capa circular ni una manga montada.', open ? 'Frente dividido en dos piezas para una ruana abierta; sin cierre ni cruce.' : 'El escote cuadrado une la abertura delantera con la trasera; verifica que pase la cabeza.', 'La holgura visual proviene del ancho libre del paño. El patrón no se reduce por elasticidad.'],
    steps: [{ id: 'cortar', title: 'Corta los paños', detail: open ? 'Corta una espalda completa y dos delanteros en espejo.' : 'Corta una espalda y un delantero completos; sus escotes tienen distinta profundidad.', pieces: ['espalda', 'delantero'] }, { id: 'hombros', title: 'Une los hombros', detail: 'Coloca derecho con derecho y cose solo los dos tramos de hombro indicados; deja libre el escote y los costados.', pieces: ['espalda', 'delantero'], seams: ['hombros'] }, { id: 'escote', title: 'Ribetea el escote', detail: `Coloca bies alrededor del escote cuadrado${open ? ' y ambos frentes' : ''}, rematando las esquinas con inglete. No añadas margen extra al escote.`, pieces: ['espalda', 'delantero'] }, { id: 'dobladillos', title: 'Termina lados y bajos', detail: 'Dobla los márgenes de lados abiertos y bajos con ingletes en las esquinas. Hilvana y prueba antes de pespuntear.', pieces: ['espalda', 'delantero'] }], notices };
}
export const ponchoGenerator: PatternGenerator = { id: 'poncho-rectangular', name: 'Poncho rectangular o ruana abierta', summary: 'Dos paños con escote cuadrado, hombros cosidos y lados abiertos.', status: 'experimental', requiredMeasures: ['pecho'], optionalMeasures: ['estatura', 'cabeza'], defaults: ponchoDefaults, generate: generatePoncho, params: [{ key: 'ancho', label: 'Ancho total del paño', group: 'diseno', type: 'length', min: 400, max: 1600 }, { key: 'largo', label: 'Largo desde hombro a bajo', group: 'diseno', type: 'length', min: 250, max: 1200 }, { key: 'aperturaFrente', label: 'Frente', group: 'diseno', type: 'choice', choices: [{ value: 'no', label: 'Cerrado (poncho)' }, { value: 'si', label: 'Abierto (ruana)' }] }, { key: 'escoteAncho', label: 'Ancho de escote', group: 'diseno', type: 'length', min: 80, max: 350 }, { key: 'escoteProfundo', label: 'Profundidad de escote delantero', group: 'diseno', type: 'length', min: 40, max: 250 }, margin, hem] };

export function pinaforeDefaults(ctx: GeneratorContext): Params {
  const child = isChild(ctx.kind), chest = ctx.body.pecho ?? (child ? 600 : 920);
  return { largoFalda: round1((ctx.body.estatura ?? 1640) * .35), amplitud: child ? 1.6 : 1.5, anchoPeto: round1(chest * .28), altoPeto: round1((ctx.body.talleEspalda ?? (child ? 260 : 420)) * .66), largoTirante: round1((ctx.body.talleEspalda ?? (child ? 260 : 420)) * 1.35 + 50), anchoTirante: child ? 25 : 35, anchoElastico: child ? 20 : 30, proporcionElastico: .92, margen: 10, dobladillo: child ? 25 : 35 };
}
export function generatePinafore(ctx: GeneratorContext, p: Params): GeneratorResult {
  const hip = ctx.body.cadera!, waist = ctx.body.cintura!, fullness = num(p, 'amplitud', 1.5), total = hip * fullness, w = total / 2, h = num(p, 'largoFalda', 570), sa = num(p, 'margen', 10), ha = num(p, 'dobladillo', 35);
  const elastic = num(p, 'anchoElastico', 30), channel = elastic + 5, casing = channel + 10, bibW = num(p, 'anchoPeto', 260), bibH = num(p, 'altoPeto', 280), strapW = num(p, 'anchoTirante', 35), strapL = num(p, 'largoTirante', 620);
  const front = rect('falda-delantera', 'Falda delantera completa', w, h, sa), back = rect('falda-trasera', 'Falda trasera completa', w, h, sa);
  for (const piece of [front, back]) {
    piece.edges[0] = { ...piece.edges[0], label: 'Cintura (jareta)', allowance: casing, finish: 'jareta' };
    piece.edges[2] = { ...piece.edges[2], label: 'Bajo', allowance: ha, finish: 'dobladillo' };
    piece.lines.push({ id: 'pespunte-jareta', kind: 'pespunte', a: { x: 0, y: channel }, b: { x: w, y: channel }, label: 'Pespunte inferior de jareta' });
  }
  front.lines.push({ id: 'colocacion-peto', kind: 'colocacion', a: { x: (w - bibW) / 2, y: channel }, b: { x: (w + bibW) / 2, y: channel }, label: 'Peto: coser sobre la línea inferior de jareta después de fruncir' });
  const bib = rect('peto', 'Peto exterior y reverso', bibW, bibH, sa, 2);
  for (const [i, x] of [strapW / 2 + 12, bibW - strapW / 2 - 12].entries()) bib.marks.push({ id: `tirante-${i}`, kind: 'cruz', at: { x, y: 0 }, label: 'Centro del tirante' });
  const strap = rect('tirante', 'Tirantes para doblar y coser', strapW * 2, strapL, sa, 2);
  strap.lines.push({ id: 'doblez-central', kind: 'doblez', a: { x: strapW, y: 0 }, b: { x: strapW, y: strapL }, label: 'Doblar longitudinalmente' });
  const pieces = [front, back, bib, strap], elasticL = waist * num(p, 'proporcionElastico', .92);
  const notices: Issue[] = [experimental];
  if (total < hip + 60) notices.push({ level: 'error', code: 'jumper-no-pasa-cadera', message: 'Aumenta la amplitud: la falda debe pasar la cadera con al menos 6 cm adicionales.' });
  if (bibW < strapW * 2 + 40 || bibW >= elasticL / 2 || bibH <= sa * 3) notices.push({ level: 'error', code: 'peto-proporciones', message: 'El peto debe alojar ambos tirantes y caber en el frente de la cintura fruncida. Ajusta ancho del peto o tirantes.' });
  if (ctx.fabric === 'punto') notices.push({ level: 'aviso', code: 'peto-punto', message: 'Esta base usa holgura positiva y elástico de cintura. En punto, estabiliza peto y tirantes y prueba antes de cortar.' });
  return { pieces, seams: [equal('costados', 'Costados de falda', front.id, ['derecho'], back.id, ['izquierdo']), equal('peto-caras', 'Perímetro de las dos caras del peto', bib.id, bib.edges.map(e => e.id), bib.id, bib.edges.map(e => e.id)), equal('tirante-tubo', 'Bordes largos de cada tirante', strap.id, ['derecho'], strap.id, ['izquierdo'])],
    checks: [{ key: 'contorno-falda', label: 'Contorno sin fruncir', body: hip, ease: total - hip, target: total, measured: length(front, 'superior') + length(back, 'superior'), tolerance: .5 }, { key: 'largo-falda', label: 'Largo terminado de falda', target: h, measured: length(front, 'derecho'), tolerance: .5 }, { key: 'peto', label: 'Ancho terminado de peto', target: bibW, measured: length(bib, 'superior'), tolerance: .5 }, { key: 'tirante', label: 'Ancho terminado de tirante doblado', target: strapW, measured: length(strap, 'superior') / 2, tolerance: .5 }],
    materials: [{ id: 'elastico', label: `Elástico de ${formatLength(elastic, 'cm')}`, qty: formatLength(elasticL + 20, 'cm'), note: 'Cintura × proporción + 2 cm de traslape. Prueba su comodidad.' }, { id: 'hilo', label: 'Hilo de coser', qty: '1 carrete' }],
    assumptions: ['Jumper de falda fruncida y peto rectangular, para usar sobre otra prenda. No es un overol con pantalón ni un vestido de torso ajustado.', 'Elástico de cintura completo; el peto y los tirantes se fijan sobre el pespunte inferior de la jareta para no bloquear su canal.', 'Los tirantes se cortan con el largo indicado y se ajustan en prueba entre el peto y la cintura de espalda; no se supone una talla universal de tirante.'],
    steps: [{ id: 'cortar', title: 'Corta las piezas y marca', detail: 'Corta una falda delantera, una trasera, dos caras del peto y dos tirantes. Marca el centro delantero de la falda antes de fruncir.', pieces: pieces.map(piece => piece.id) }, { id: 'falda', title: 'Cose falda y jareta', detail: 'Une costados. Dobla 1 cm del margen superior, dobla por la línea de cintura y cose la línea inferior dejando abertura. Inserta el elástico, prueba, une sus extremos con 2 cm de traslape y cierra.', pieces: ['falda-delantera', 'falda-trasera'], seams: ['costados'] }, { id: 'tirantes', title: 'Prepara tirantes y peto', detail: 'Dobla los tirantes a lo largo derecho con derecho, cose sus bordes largos y voltea. Hilvana un extremo de cada tirante en las marcas superiores del peto. Coloca la segunda cara derecho con derecho, cose el contorno dejando abertura inferior, voltea y cierra.', pieces: ['tirante', 'peto'], seams: ['tirante-tubo', 'peto-caras'] }, { id: 'montar', title: 'Coloca el peto y ajusta los tirantes', detail: 'Centra el borde inferior del peto por fuera de la cintura delantera, alineado con el pespunte inferior de la jareta. Fija solo sobre ese pespunte. Prueba el largo de tirantes, rectos o cruzados atrás, y fíjalos sobre el pespunte inferior trasero sin atravesar el canal del elástico.', pieces: pieces.map(piece => piece.id) }, { id: 'bajo', title: 'Termina el bajo', detail: 'Hilvana el dobladillo, comprueba el largo puesto y pespuntea con el margen indicado.', pieces: ['falda-delantera', 'falda-trasera'] }], notices };
}
export const pinaforeGenerator: PatternGenerator = { id: 'jumper-peto-falda', name: 'Jumper de peto con falda fruncida', summary: 'Falda con elástico, peto de doble cara y tirantes ajustables en la prueba.', status: 'experimental', requiredMeasures: ['cintura', 'cadera'], optionalMeasures: ['pecho', 'estatura', 'talleEspalda'], defaults: pinaforeDefaults, generate: generatePinafore, params: [{ key: 'largoFalda', label: 'Largo de falda desde cintura', group: 'diseno', type: 'length', min: 180, max: 1100 }, { key: 'amplitud', label: 'Amplitud de falda / cadera', group: 'holgura', type: 'ratio', min: 1.1, max: 2.5 }, { key: 'anchoPeto', label: 'Ancho terminado del peto', group: 'diseno', type: 'length', min: 100, max: 450 }, { key: 'altoPeto', label: 'Alto terminado del peto', group: 'diseno', type: 'length', min: 100, max: 500 }, { key: 'largoTirante', label: 'Largo de tirante antes de ajustar', group: 'diseno', type: 'length', min: 250, max: 1100 }, { key: 'anchoTirante', label: 'Ancho terminado del tirante', group: 'diseno', type: 'length', min: 15, max: 60 }, { key: 'anchoElastico', label: 'Ancho de elástico de cintura', group: 'diseno', type: 'length', min: 15, max: 50 }, { key: 'proporcionElastico', label: 'Largo de elástico / cintura', group: 'holgura', type: 'ratio', min: .8, max: 1 }, margin, hem] };

/** Pulóver geométrico: comparte sisa y manga rectas, pero el delantero es completo. */
export function relaxedTopDefaults(ctx: GeneratorContext): Params {
  const head = ctx.body.cabeza ?? (isChild(ctx.kind) ? 520 : 580);
  const depth = round1(head * .18);
  const jacket = relaxedJacketDefaults(ctx);
  const neckWidth = Math.max(num(jacket, 'escoteAncho'), (head + 40 - 2 * depth) / 2.32);
  return { ...jacket, escoteAncho: round1(neckWidth), escoteDelante: depth };
}
export function generateRelaxedTop(ctx: GeneratorContext, p: Params): GeneratorResult {
  const result = generateRelaxedJacket(ctx, p);
  const back = result.pieces[0], b = length(back, 'bajo'), h = num(p, 'largo', 700), nw = num(p, 'escoteAncho', 180), nd = num(p, 'escoteDelante', 105), arm = num(p, 'profundidadSisa', 205), sa = num(p, 'margen', 10), ha = num(p, 'dobladillo', 25), sleeves = str(p, 'manga', 'si') === 'si';
  const front = backPanel('delantero', 'Delantero completo de túnica', b, h, nw, nd, sa, ha, arm);
  if (!sleeves) for (const e of front.edges.filter(e => e.id.startsWith('sisa'))) { e.allowance = 0; e.finish = 'sin-margen'; e.label += ' (bies)'; }
  const pieces = [back, front, ...result.pieces.slice(2)];
  const seams = [equal('hombros', 'Hombros del delantero con espalda', front.id, ['hombro-der', 'hombro-izq'], back.id, ['hombro-der', 'hombro-izq']), equal('costados', 'Costados del delantero con espalda', front.id, ['costado-der'], back.id, ['costado-der']), ...result.seams.filter(s => s.id.startsWith('manga-') || s.id === 'bajo-manga').map(s => s.id === 'manga-frente' ? equal('manga-frente', 'Manga con sisa delantera', 'manga', ['copa-frente'], front.id, ['sisa-der']) : s)];
  const bound = pieces.slice(0, 2).reduce((sum, piece) => sum + piece.edges.filter(e => e.finish === 'sin-margen').reduce((s, e) => s + edgeLength(piece, e), 0), 0);
  const opening = pieces.slice(0, 2).reduce((sum, piece) => sum + piece.edges.filter(e => e.id.startsWith('cuello')).reduce((s, e) => s + edgeLength(piece, e), 0), 0);
  const notices = [...result.notices];
  if (ctx.body.cabeza && (opening < ctx.body.cabeza + 20 || Math.min(nw, nd + nw * .16) < ctx.body.cabeza / Math.PI * .65)) notices.push({ level: 'error', code: 'top-no-pasa-cabeza', message: 'El escote cerrado es estrecho para la cabeza. Amplía su ancho o profundidad y prueba la abertura en tela económica.' });
  return { ...result, pieces, seams, notices,
    checks: [{ key: 'contorno', label: 'Contorno de cuerpo en el bajo', body: Math.max(ctx.body.pecho!, ctx.body.cadera!), ease: num(p, 'holgura', 240), target: b * 2, measured: length(front, 'bajo') + length(back, 'bajo'), tolerance: .5 }, { key: 'largo', label: 'Largo desde hombro a bajo', target: h, measured: front.nodes[7].y, tolerance: .5 }, { key: 'escote', label: 'Perímetro de escote cerrado', target: 2 * nw + 2 * (nd + nw * .16), measured: opening, tolerance: .5 }],
    materials: [{ id: 'bies', label: 'Bies flexible para escote y sisas abiertas', qty: formatLength(bound + 200, 'cm'), note: 'No incluye cuello de rib: el escote es cuadrado y se ribetea.' }, { id: 'hilo', label: 'Hilo de coser', qty: '1 carrete' }],
    assumptions: ['Blusón o pulóver geométrico de hombro caído, delantero cerrado, cuello cuadrado y holgura positiva; sin pinzas ni pendiente de hombro.', 'El contorno se calcula sobre el mayor de pecho y cadera y agrega holgura una sola vez. Los márgenes van fuera de la línea terminada.', 'El escote se termina con bies; no incluye rib, cierre ni una manga de copa entallada. Verifica el paso de cabeza, la movilidad y el largo puesto.'],
    steps: [{ id: 'cortar', title: 'Corta cuerpo y mangas', detail: `Corta un delantero completo y una espalda completa.${sleeves ? ' Corta dos mangas en espejo.' : ''} No cortes el centro delantero: solo el escote cuadrado indicado.`, pieces: pieces.map(piece => piece.id) }, ...result.steps.filter(s => s.id !== 'cortar' && s.id !== 'terminar').map(s => s.id === 'hombros' ? { ...s, detail: 'Derecho con derecho, une ambos hombros del delantero con la espalda y termina los márgenes.' } : s), { id: 'terminar', title: 'Ribetea el cuello y termina bajos', detail: `Coloca bies flexible en el escote cuadrado, rematando las esquinas con inglete.${sleeves ? ' Dobla y cose los puños.' : ' Ribetea también las sisas abiertas.'} Haz el dobladillo inferior después de comprobar el largo.`, pieces: pieces.map(piece => piece.id) }]
  };
}
export const relaxedTopGenerator: PatternGenerator = {
  ...relaxedJacketGenerator,
  id: 'top-hombro-caido', name: 'Blusón o pulóver geométrico holgado', summary: 'Delantero cerrado, escote cuadrado y mangas rectas de hombro caído.',
  optionalMeasures: [...relaxedJacketGenerator.optionalMeasures, 'cabeza'],
  defaults: relaxedTopDefaults, generate: generateRelaxedTop
};
