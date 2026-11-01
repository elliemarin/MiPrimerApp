import type { GeneratorContext, GeneratorResult, Params, PatternGenerator } from '../generator';
import { num, round1 } from '../generator';
import type { Piece } from '../types';
import { hoodieDefaults, hoodieGenerator, generateHoodie } from './hoodie';
import { jeansDefaults, jeansGenerator, generateJeans } from './jeans';
import { edge, outline, rectangle, P, len, cm, equal, ratio } from './kidsShared';
import { panelizePattern, pieceGeometryHash, type PanelCut } from '../panels';
import { bboxOf } from '../../geom/vec';
import { seamPolygon, edgeLength } from '../outline';

/** Separate constructions, not a Cartesian product of sizes and colours. */
export const STREET_STYLES = [
  ['hoodie-cierre', 'Hoodie con cierre completo', 'Cierre separable central y capucha de dos piezas.'],
  ['hoodie-chaleco', 'Hoodie sin mangas', 'Chaleco amplio con capucha y sisas ribeteadas.'],
  ['hoodie-canguro', 'Hoodie con bolsillo canguro', 'Bolsillo canguro con dos entradas inclinadas y pespuntes de refuerzo.'],
  ['hoodie-globo', 'Hoodie de mangas globo', 'Manga ancha fruncida sobre un puño de punto independiente.'],
  ['hoodie-peplum', 'Hoodie con peplum', 'Cuerpo hasta la cintura y volante inferior fruncido independiente.'],
  ['hoodie-diagonal', 'Hoodie de corte diagonal', 'Dos paneles oblicuos de tela unidos por costura en frente y espalda.'],
  ['hoodie-bandas', 'Hoodie de tres bandas', 'Tres franjas horizontales de tela cosidas en frente y espalda.'],
  ['hoodie-canesu', 'Hoodie con canesú', 'Canesú alto separado del cuerpo por una costura horizontal.'],
  ['hoodie-panel-central', 'Hoodie con panel central', 'Panel central y dos laterales independientes, delante y detrás.'],
  ['hoodie-patchwork', 'Hoodie patchwork de cuatro bloques', 'Cuatro bloques cosidos en cada cara del cuerpo.'],
  ['hoodie-chaleco-cierre', 'Chaleco con capucha y cierre', 'Cierre separable, sisas ribeteadas y capucha; sin mangas.'],
  ['hoodie-poncho', 'Hoodie poncho de manga amplia', 'Cuerpo cuadrado muy amplio con mangas cortas anchas y capucha.'],
  ['pantalon-bootcut', 'Jeans bootcut', 'Rodilla regular y apertura moderada para cubrir la bota; cinco bolsillos.'],
  ['pantalon-setentas', 'Jeans campana setentera', 'Tiro alto, rodilla estrecha y campana amplia con cinco bolsillos.'],
  ['pantalon-palazzo', 'Palazzo de tiro alto', 'Pierna muy ancha, frente limpio, pretina con bragueta y canesú.'],
  ['pantalon-culotte', 'Culotte acampanado', 'Falda pantalón corta de pierna abierta y cintura con bragueta.'],
  ['pantalon-paperbag', 'Pantalón paperbag con cinturón', 'Pierna ancha, volante sobre la cintura elástica y cinturón independiente.'],
  ['pantalon-carpintero', 'Pantalón carpintero', 'Cinco bolsillos, bolsillo para herramientas y trabilla lateral de martillo.'],
  ['pantalon-cargo-slim', 'Cargo de pierna slim', 'Pierna estrecha con bolsillos cargo de fuelle y carteras.'],
  ['pantalon-western', 'Jeans western con paneles', 'Paneles laterales delanteros independientes para combinar mezclillas.'],
  ['pantalon-patchwork', 'Jeans de seis paneles', 'Piernas anchas divididas en seis paneles cada una para patchwork real.'],
  ['pantalon-rodilla', 'Jeans con cortes de rodilla', 'Paneles transversales de rodilla cosidos en cada delantero.'],
  ['pantalon-costura-frontal', 'Palazzo de costura frontal', 'Cada delantero se divide por una costura vertical central.'],
  ['pantalon-doble-rodilla', 'Pantalón de doble rodilla', 'Refuerzos amplios aplicados sobre ambas piernas para trabajo ligero.']
] as const;
export type StreetStyle = typeof STREET_STYLES[number][0];
export const isHoodieStyle = (style: StreetStyle) => style.startsWith('hoodie-');

export function streetDefaults(style: StreetStyle, ctx: GeneratorContext): Params {
  if (isHoodieStyle(style)) {
    const p = hoodieDefaults(ctx), base = Math.max(ctx.body.pecho ?? 920, ctx.body.cadera ?? 1000);
    if (style === 'hoodie-globo') p.anchoPuno = round1(num(p, 'profundidadSisa') * 1.7);
    if (style === 'hoodie-peplum') { p.largo = round1((ctx.body.estatura ?? 1640) * .3); p.altoVolante = round1((ctx.body.estatura ?? 1640) * .11); }
    if (style === 'hoodie-poncho') { p.holgura = round1(base * .55); p.largoManga = round1((ctx.body.largoManga ?? 600) * .23); p.anchoPuno = num(p, 'profundidadSisa') * 2; }
    return p;
  }
  const p = jeansDefaults(ctx), H = ctx.body.cadera ?? 1000;
  Object.assign(p, { tiro: 'alto', silueta: 'recto', bolsillos: 'cinco' });
  switch (style) {
    case 'pantalon-bootcut': Object.assign(p, { silueta: 'acampanado', anchoBajoExtra: -H * .12, anchoRodillaExtra: H * .04 }); break;
    case 'pantalon-setentas': Object.assign(p, { silueta: 'acampanado', anchoBajoExtra: H * .1 }); break;
    case 'pantalon-palazzo': case 'pantalon-costura-frontal': Object.assign(p, { silueta: 'ancho', bolsillos: 'ninguno', anchoRodillaExtra: H * .12, anchoBajoExtra: H * .14 }); break;
    case 'pantalon-culotte': Object.assign(p, { silueta: 'acampanado', bolsillos: 'ninguno', anchoRodillaExtra: H * .16, anchoBajoExtra: H * .12, largo: round1((ctx.body.tiro ?? 260) + (ctx.body.entrepierna ?? 780) * .62) }); break;
    case 'pantalon-paperbag': Object.assign(p, { silueta: 'ancho', cintura: 'elastica', bolsillos: 'ninguno', altoVolante: 35 }); break;
    case 'pantalon-cargo-slim': Object.assign(p, { silueta: 'pitillo', bolsillos: 'cargo', anchoRodillaExtra: H * .03, anchoBajoExtra: H * .025 }); break;
    case 'pantalon-patchwork': Object.assign(p, { silueta: 'ancho', bolsillos: 'ninguno' }); break;
  }
  return p;
}

/** Subdivide once, keeping seam relations and every construction step attached
 * to actual new pieces. Curves use the existing 0.03 mm panel tolerance. */
function divide(result: GeneratorResult, cuts: Omit<PanelCut, 'baseHash'>[]): GeneratorResult {
  if (!cuts.length) return result;
  const divided = panelizePattern(result.pieces, result.seams, cuts.map(c => ({ ...c, baseHash: pieceGeometryHash(result.pieces.find(p => p.id === c.pieceId)!) })));
  if (divided.issues.some(issue => issue.level === 'error')) return { ...result, notices: [...result.notices, ...divided.issues] };
  // Preserve whole exterior Béziers where no style cut touched them. In
  // particular a fly's tight concave transition must remain one curved edge:
  // offsetting dozens of tiny straight segments can create local loops.
  for (const panel of divided.pieces.filter(p => p.panelSource)) {
    const original = result.pieces.find(p => p.id === panel.panelSource!.pieceId)!;
    for (const curve of original.edges.filter(e => e.kind === 'cubic')) {
      const runs = panel.edges.filter(e => e.label === curve.label);
      if (!runs.length) continue;
      const first = runs[0], last = runs[runs.length - 1], a = panel.nodes.find(n => n.id === first.from)!, b = panel.nodes.find(n => n.id === last.to)!;
      const oa = original.nodes.find(n => n.id === curve.from)!, ob = original.nodes.find(n => n.id === curve.to)!;
      if (Math.hypot(a.x - oa.x, a.y - oa.y) > .001 || Math.hypot(b.x - ob.x, b.y - ob.y) > .001) continue;
      const oldIds = new Set(runs.map(e => e.id));
      const offsets = new Map<string, number>(); let total = 0;
      for (const e of runs) { offsets.set(e.id, total); total += edgeLength(panel, e); }
      panel.notches = panel.notches.map(n => oldIds.has(n.edgeId) ? { ...n, edgeId: first.id, s: (offsets.get(n.edgeId) ?? 0) + n.s } : n);
      Object.assign(first, { to: last.to, kind: 'cubic', c1: curve.c1, c2: curve.c2 });
      panel.edges = panel.edges.filter(e => !oldIds.has(e.id) || e.id === first.id);
      const nodeIds = new Set(panel.edges.flatMap(e => [e.from, e.to])); panel.nodes = panel.nodes.filter(n => nodeIds.has(n.id));
      for (const seam of divided.seams) for (const side of [...seam.a, ...seam.b].filter(side => side.pieceId === panel.id)) side.edgeIds = [...new Set(side.edgeIds.map(id => oldIds.has(id) ? first.id : id))];
    }
  }
  const joins = divided.seams.filter(s => s.id.startsWith('panel-union-'));
  return { ...result, pieces: divided.pieces, seams: divided.seams,
    steps: [...joins.slice().reverse().map(s => ({ id: s.id, title: s.label, detail: 'Corta cada panel por separado con su margen. Une derechos por la línea marcada, relaciona los piquetes y plancha los márgenes. Reconstruye primero la pieza completa y luego continúa el montaje.', pieces: [...new Set([...s.a, ...s.b].map(side => side.pieceId))], seams: [s.id] })), ...result.steps.map(s => ({ ...s, pieces: [...new Set(s.pieces.flatMap(id => divided.mapping[id] ?? [id]))] }))],
    assumptions: [...result.assumptions, 'Los paneles conservan exactamente la silueta y las medidas de la pieza base. Las costuras nuevas llevan margen por separado y sus longitudes se verifican.'] };
}

const part = (r: GeneratorResult, id: string) => r.pieces.find(p => p.id === id)!;
const box = (p: Piece) => bboxOf(seamPolygon(p, .1));
const sourceOf = (p: Piece) => p.panelSource?.pieceId ?? p.id;
const plain = (id: string, name: string, w: number, h: number, sa: number, qty = 1) => rectangle(id, name, w, h,
  [edge('arriba', 'Superior', 'costura', sa), edge('derecha', 'Derecha', 'costura', sa), edge('abajo', 'Inferior', 'costura', sa), edge('izquierda', 'Izquierda', 'costura', sa)], { qty });

function hoodie(style: StreetStyle, ctx: GeneratorContext, p: Params): GeneratorResult {
  // The sleeve length selected by the user includes the finished 65 mm cuff.
  // Removing it here avoids accidentally adding length when choosing globo.
  let r = generateHoodie(ctx, { ...p, capucha: 'si', ...(style === 'hoodie-globo' ? { largoManga: num(p, 'largoManga') - 65 } : {}) });
  if (r.notices.some(i => i.level === 'error')) return r;
  const sa = num(p, 'margen'), front = part(r, 'delantero'), width = front.nodes[4].x, height = num(p, 'largo'), arm = num(p, 'profundidadSisa');
  r.assumptions[0] = 'Base de hombro caído con holgura positiva; la construcción específica y sus piezas se describen a continuación.';
  const sleeveless = style === 'hoodie-chaleco' || style === 'hoodie-chaleco-cierre';
  if (sleeveless) {
    r.pieces = r.pieces.filter(p => p.id !== 'manga');
    r.seams = r.seams.filter(s => !s.id.includes('manga')); r.checks = r.checks.filter(c => c.key !== 'puno');
    r.steps = r.steps.filter(s => s.id !== 'mangas').map(s => ({ ...s, pieces: s.pieces.filter(id => id !== 'manga'), seams: s.seams?.filter(id => !id.includes('manga')) }));
    r.steps.find(s => s.id === 'cortar')!.detail = 'Corta delantero, espalda y dos laterales de capucha. Las sisas se terminan con bies; este diseño no lleva mangas.';
    r.steps.find(s => s.id === 'costados')!.detail = 'Une cada costado de la axila al bajo. Abre y remata los márgenes.';
    r.steps.find(s => s.id === 'dobladillos')!.detail = 'Prueba el largo y termina los bajos siguiendo el margen indicado.';
    for (const body of [front, part(r, 'espalda')]) for (const e of body.edges.filter(e => e.id.startsWith('sisa'))) { e.allowance = 0; e.finish = 'sin-margen'; }
    for (const body of [front, part(r, 'espalda')]) body.notches = body.notches.filter(n => !n.id.startsWith('manga'));
    r.materials.push({ id: 'bies-sisas', label: 'Bies flexible para ambas sisas', qty: cm(4 * arm + 120) });
    r.steps.push({ id: 'rematar-sisas', title: 'Ribetea ambas sisas', detail: 'Con costados cerrados, envuelve el borde de cada sisa con el bies sin reducir la abertura. Une los extremos y pespuntea sin estirar.', pieces: ['delantero', 'espalda'] });
  }
  if (style === 'hoodie-canguro') {
    const w = width * .56, h = Math.min(height * .27, 210), cut = Math.min(w * .2, h * .45);
    const pocket = outline('canguro', 'Bolsillo canguro', [P(cut, 0), P(w - cut, 0), P(w, cut), P(w, h), P(0, h), P(0, cut)],
      [edge('arriba', 'Pespunte superior', 'costura', sa), edge('entrada-der', 'Entrada derecha', 'dobladillo', 20), edge('lado-der', 'Lado derecho', 'costura', sa), edge('abajo', 'Fondo', 'costura', sa), edge('lado-izq', 'Lado izquierdo', 'costura', sa), edge('entrada-izq', 'Entrada izquierda', 'dobladillo', 20)]);
    const x = (width - w) / 2, y = height - h - 65;
    front.lines.push({ id: 'canguro', kind: 'colocacion', a: P(x + cut, y), b: P(x + w - cut, y), label: 'Canto superior del bolsillo canguro' });
    r.pieces.push(pocket);
    r.steps.splice(1, 0, { id: 'canguro', title: 'Monta el bolsillo canguro', detail: `Dobla dos veces 1 cm ambas entradas inclinadas. Dobla los demás márgenes y sitúa el canto superior en la línea marcada, a ${cm(y)} del hombro. Pespuntea solo superior, lados verticales y fondo; deja abiertas las dos entradas. Refuerza las cuatro esquinas de entrada.`, pieces: ['canguro', 'delantero'] });
  }
  if (style === 'hoodie-globo') {
    const sleeve = part(r, 'manga'), opening = len(sleeve, 'puno'), cuff = (ctx.body.muneca ?? 170) + 60, h = 65;
    const band = plain('puno-globo', 'Puño de punto doblado (cortar 2)', cuff, h * 2, sa, 2); band.cut.fabric = 'punto-elastico';
    band.lines.push({ id: 'doblez', kind: 'doblez', a: P(0, h), b: P(cuff, h), label: 'Doblar el puño a la mitad' });
    const e = sleeve.edges.find(e => e.id === 'puno')!; e.finish = 'costura'; e.allowance = sa;
    r.pieces.push(band); r.seams.push(ratio('puno-globo', 'Frunce de manga al puño', 'fruncido', [{ pieceId: 'manga', edgeIds: ['puno'] }], [{ pieceId: band.id, edgeIds: ['arriba'] }], opening / cuff), equal('cerrar-puno', 'Cierra cada puño', [{ pieceId: band.id, edgeIds: ['derecha'] }], [{ pieceId: band.id, edgeIds: ['izquierda'] }]));
    r.checks = r.checks.filter(c => c.key !== 'puno'); r.checks.push({ key: 'puno', label: 'Contorno del puño', target: cuff, measured: len(band, 'arriba'), tolerance: .1 });
    r.checks.push({ key: 'largo-manga', label: 'Largo total de manga con puño', target: num(p, 'largoManga'), measured: Math.max(...sleeve.nodes.map(n => n.x)) + h, tolerance: .1 });
    r.materials.push({ id: 'rib-puno', label: 'Rib para puños', qty: `${cm(cuff + 2 * sa)} × ${cm(4 * h + 4 * sa)}` });
    r.steps.find(s => s.id === 'dobladillos')!.detail = 'Dobladilla el cuerpo. La manga se une al puño por la línea de costura, sin dobladillo; los 6,5 cm del puño ya están incluidos en el largo de manga seleccionado.';
    r.steps.push({ id: 'montar-puno', title: 'Frunce las mangas y monta los puños', detail: 'Cierra los extremos cortos de cada puño, dóblalo longitudinalmente y distribuye en cuartos. Frunce la boca de manga a la medida del puño sin usar la elasticidad para corregir el patrón; cose ambos cantos abiertos de la banda juntos a la manga.', pieces: ['manga', band.id], seams: ['puno-globo', 'cerrar-puno'] });
  }
  if (style === 'hoodie-peplum') {
    const h = num(p, 'altoVolante', 180), w = width * 1.5, flounce = plain('peplum', 'Volante peplum (delantero y espalda)', w, h, sa, 2);
    flounce.edges[2] = { ...flounce.edges[2], allowance: num(p, 'dobladillo'), finish: 'dobladillo' };
    for (const body of [front, part(r, 'espalda')]) { const e = body.edges.find(e => e.id === 'bajo')!; e.finish = 'costura'; e.allowance = sa; }
    r.pieces.push(flounce); r.seams.push(ratio('montar-peplum', 'Frunce del peplum al cuerpo', 'fruncido', [{ pieceId: flounce.id, edgeIds: ['arriba'], factor: 2 }], [{ pieceId: 'delantero', edgeIds: ['bajo'] }, { pieceId: 'espalda', edgeIds: ['bajo'] }], 1.5), equal('costado-peplum', 'Costados del peplum', [{ pieceId: flounce.id, edgeIds: ['derecha'] }], [{ pieceId: flounce.id, edgeIds: ['izquierda'] }]));
    const length = r.checks.find(c => c.key === 'largo')!; length.target += h; length.measured += h; length.label = 'Largo total con peplum';
    r.steps.find(s => s.id === 'dobladillos')!.detail = 'Dobladilla los puños. El bajo del cuerpo se cose al peplum y no se dobla.';
    r.steps.push({ id: 'montar-peplum', title: 'Monta el peplum', detail: 'Une los dos volantes por sus costados. Marca cuartos en el aro y en el bajo del cuerpo. Frunce el canto superior de 1,5 a 1, une ambos derechos sin estirar el cuerpo y remata la costura. Dobladilla solo el canto inferior del peplum.', pieces: ['delantero', 'espalda', flounce.id], seams: ['montar-peplum', 'costado-peplum'] });
  }
  const cuts: Omit<PanelCut, 'baseHash'>[] = [];
  const horizontal = (id: string, y: number, suffix: string) => cuts.push({ id: `${id}-${suffix}`, pieceId: id, points: [P(-20, y), P(width + 20, y)], allowance: sa });
  for (const id of ['delantero', 'espalda']) {
    if (style === 'hoodie-diagonal') cuts.push({ id: `${id}-diagonal`, pieceId: id, points: [P(-20, arm + 50), P(width + 20, height - 80)], allowance: sa });
    if (style === 'hoodie-bandas') { horizontal(id, height * .47, 'banda-1'); horizontal(id, height * .73, 'banda-2'); }
    if (style === 'hoodie-canesu') horizontal(id, arm + 20, 'canesu');
    if (style === 'hoodie-panel-central') for (const f of [.34, .66]) cuts.push({ id: `${id}-vertical-${f}`, pieceId: id, points: [P(width * f, -20), P(width * f, height + 20)], allowance: sa });
    if (style === 'hoodie-patchwork') { horizontal(id, height * .55, 'bloques'); cuts.push({ id: `${id}-vertical`, pieceId: id, points: [P(width * .5, -20), P(width * .5, height + 20)], allowance: sa }); }
  }
  const zip = style === 'hoodie-cierre' || style === 'hoodie-chaleco-cierre';
  if (zip) cuts.push({ id: 'cremallera', pieceId: 'delantero', points: [P(width / 2, -20), P(width / 2, height + 20)], allowance: sa });
  r = divide(r, cuts);
  if (zip && !r.notices.some(i => i.level === 'error')) {
    const seam = r.seams.find(s => s.id === 'panel-union-delantero-cremallera')!;
    const zipLength = height - num(p, 'escoteDelante');
    seam.label = 'Dos cantos de la cremallera separable'; seam.note = 'Los bordes no se cosen entre sí: cada uno recibe una cinta del cierre separable.';
    const step = r.steps.find(s => s.id === seam.id)!;
    step.title = 'Coloca el cierre separable'; step.detail = `Estabiliza los dos centros con entretela de punto. El recorrido desde escote hasta bajo mide ${cm(zipLength)}: usa un cierre separable de ese largo o acórtalo por arriba conservando el cajetín inferior. Dobla el margen del centro hacia dentro y coloca cada canto junto a los dientes sin traslape; hilvana y cose cada cinta por separado. No cosas los dos delanteros entre sí. Protege los topes superiores con la boca de la capucha. Comprueba la simetría del bajo y el cuello.`;
    // Install after the garment body/hood are assembled, before final inspection.
    r.steps = [...r.steps.filter(s => s.id !== step.id), step];
    r.materials.push({ id: 'cremallera-separable', label: 'Cierre separable (ajustar por arriba)', qty: cm(zipLength), note: 'No usar cierre cerrado de pantalón.' }, { id: 'entretela-centro', label: 'Cinta de entretela para ambos centros', qty: cm(zipLength * 2) });
    r.assumptions.push('Centro abierto: los dos paneles reciben las cintas del cierre. El ancho terminado del cuerpo se mide con los cantos centrales enfrentados; prueba la cinta y el margen con tu cierre antes de cortar.');
  }
  return r;
}

function pants(style: StreetStyle, ctx: GeneratorContext, p: Params): GeneratorResult {
  let r = generateJeans(ctx, p);
  if (r.notices.some(i => i.level === 'error')) return r;
  const sa = num(p, 'margen'), front = part(r, 'delantero'), b = box(front), H = ctx.body.cadera ?? 1000, s = H / 1000, knee = front.nodes.find(n => n.id === front.edges.find(e => e.id === 'entrepierna-inf')!.from)!.y;
  if (style === 'pantalon-paperbag') {
    const frill = num(p, 'altoVolante', 35), ew = num(p, 'anchoElastico'), depth = ew + 15, length = (ctx.body.cintura ?? 760) + 800;
    if (frill < 20 || frill > 35 || ew > 30) r.notices.push({ level: 'error', code: 'paperbag-volante', message: 'Usa un volante de cintura de 2 a 3,5 cm y elástico de hasta 3 cm para conservar una jareta imprimible.' });
    for (const body of [front, part(r, 'trasero')]) { const e = body.edges.find(e => e.id === 'cintura')!; e.allowance = depth + frill * 2; e.label = 'Jareta con volante superior'; body.lines = body.lines.filter(l => l.id !== 'pespunte-jareta'); }
    const belt = plain('cinturon-paperbag', 'Cinturón de tela doblado', length, 90, sa);
    belt.lines.push({ id: 'doblez', kind: 'doblez', a: P(0, 45), b: P(length, 45), label: 'Doblar longitudinalmente' });
    r.pieces.push(belt);
    const step = r.steps.find(s => s.id === 'jareta')!;
    step.title = 'Forma la cintura paperbag'; step.detail = `El margen de cintura incluye la jareta y el volante: ${cm(depth + frill * 2)}. Primero dobla 1 cm; sitúa el pliegue superior a ${cm(frill)} por encima de la línea de cintura. Desde ese pliegue, pespuntea a ${cm(frill)} para separar el volante, y otra línea a ${cm(frill + ew + 5)} para cerrar el canal. Pasa el elástico por una abertura de 3 cm y ajusta sin retorcer. No cortes el volante como pieza adicional.`;
    r.steps.push({ id: 'cinturon', title: 'Cose el cinturón', detail: 'Dobla el cinturón derecho con derecho, cose el canto largo y los extremos dejando una abertura para voltear. Recorta las esquinas, voltea, plancha y cierra con pespunte. Úsalo sobre la jareta.', pieces: [belt.id] });
    r.assumptions.push(`La cintura paperbag sobresale ${cm(frill)} sobre la cintura corporal; ese alto se añade en el margen específico de cintura, sin alterar el tiro ni escalar la pierna.`);
  }
  if (style === 'pantalon-carpintero') {
    const w = 80 * s, h = 220 * s, pocket = plain('bolsillo-herramientas', 'Bolsillo estrecho para herramientas', w, h, sa), loop = plain('trabilla-martillo', 'Trabilla lateral para martillo', 180 * s, 60 * s, sa);
    pocket.edges[0] = { ...pocket.edges[0], finish: 'dobladillo', allowance: 20 };
    loop.lines.push({ id: 'doblez', kind: 'doblez', a: P(0, 30 * s), b: P(180 * s, 30 * s), label: 'Doblar por la mitad' });
    r.pieces.push(pocket, loop);
    front.lines.push({ id: 'herramientas', kind: 'colocacion', a: P(25 * s, knee - h - 30 * s), b: P(25 * s + w, knee - h - 30 * s), label: 'Boca de bolsillo (solo pierna derecha)' });
    r.steps.splice(1, 0, { id: 'carpintero', title: 'Coloca bolsillo y trabilla', detail: `Dobladilla la boca del bolsillo y dobla los demás márgenes. En el delantero de la pierna derecha coloca la boca sobre la marca, a ${cm(knee - h - 30 * s)} de cintura y ${cm(25 * s)} hacia dentro del costado. Pespuntea lados y fondo. Dobla y cose la trabilla, voltea y fija sus dos extremos sobre el costado de la pierna izquierda, separados 8 cm, con rectángulo y cruz; deja una lazada libre. No es un equipo de protección ni un soporte de cargas pesadas.`, pieces: [pocket.id, loop.id, 'delantero', 'trasero'] });
  }
  if (style === 'pantalon-doble-rodilla') {
    const w = H * .16, h = Math.min((b.maxY - knee) * .75 + 100, 380), reinforcement = plain('refuerzo-rodilla', 'Refuerzo de rodilla (cortar 2)', w, h, sa, 2), y = knee - h * .55;
    r.pieces.push(reinforcement); const x = (b.minX + b.maxX - w) / 2;
    front.lines.push({ id: 'refuerzo-rodilla', kind: 'colocacion', a: P(x, y), b: P(x + w, y), label: 'Canto superior del refuerzo' });
    r.steps.splice(1, 0, { id: 'refuerzo', title: 'Aplica los refuerzos de rodilla', detail: `Dobla los cuatro márgenes hacia dentro. Centra cada refuerzo en el delantero con su canto superior a ${cm(y)} de cintura; usa la línea marcada. Hilvana y pespuntea el contorno dos veces antes de cerrar las piernas. Prueba sentado que no limite la flexión.`, pieces: [reinforcement.id, 'delantero'] });
  }
  const cuts: Omit<PanelCut, 'baseHash'>[] = [];
  const cut = (id: string, points: ReturnType<typeof P>[]) => cuts.push({ id, pieceId: 'delantero', points, allowance: sa });
  const x = (b.minX + b.maxX) / 2;
  if (style === 'pantalon-western') cut('western-lateral', [P(45 * s, -100), P(45 * s, knee), P(35 * s, b.maxY + 50)]);
  if (style === 'pantalon-costura-frontal') cut('costura-frontal', [P(x, -100), P(x, b.maxY + 50)]);
  if (style === 'pantalon-patchwork') {
    cut('bloques-vertical', [P(x, -100), P(x, b.maxY + 50)]);
    for (const f of [.4, .7]) cut(`bloques-${f}`, [P(b.minX - 100, b.maxY * f), P(b.maxX + 100, b.maxY * f)]);
  }
  if (style === 'pantalon-rodilla') for (const dy of [-70, 70]) cut(`rodilla-${dy}`, [P(b.minX - 100, knee + dy * s), P(b.maxX + 100, knee + dy * s)]);
  r = divide(r, cuts);
  return r;
}

export function generateStreetStyle(style: StreetStyle, ctx: GeneratorContext, params: Params = {}): GeneratorResult {
  const p = { ...streetDefaults(style, ctx), ...params };
  return isHoodieStyle(style) ? hoodie(style, ctx, p) : pants(style, ctx, p);
}

export const STREET_STYLE_GENERATORS: PatternGenerator[] = STREET_STYLES.map(([style, name, summary]) => {
  const base = isHoodieStyle(style) ? hoodieGenerator : jeansGenerator;
  const keep = new Set(isHoodieStyle(style) ? ['largo', 'holgura', 'profundidadSisa', 'largoManga', 'anchoPuno', 'escoteAncho', 'escoteDelante', 'altoCapucha', 'margen', 'dobladillo'] : ['largo', 'anchoPretina', 'anchoElastico', 'holguraExtra', 'holguraTiro', 'margen', 'dobladillo']);
  if (style === 'hoodie-chaleco' || style === 'hoodie-chaleco-cierre') { keep.delete('largoManga'); keep.delete('anchoPuno'); }
  return { ...base, id: `street-${style}`, name, summary, params: [...base.params.filter(p => keep.has(p.key)).map(p => ({ ...p,
    ...(style === 'hoodie-peplum' && p.key === 'largo' ? { label: 'Largo del cuerpo antes del volante' } : {}),
    ...(style === 'hoodie-globo' && p.key === 'anchoPuno' ? { label: 'Contorno de manga antes del frunce' } : {}),
    ...(style === 'hoodie-poncho' && p.key === 'holgura' ? { max: 1000 } : {}),
    ...(style === 'pantalon-paperbag' && p.key === 'anchoElastico' ? { max: 30 } : {})
  })), ...(['hoodie-peplum', 'pantalon-paperbag'].includes(style) ? [{ key: 'altoVolante', label: 'Alto del volante terminado', type: 'length' as const, group: 'diseno' as const, min: style === 'pantalon-paperbag' ? 20 : 80, max: style === 'pantalon-paperbag' ? 35 : 300 }] : [])], defaults: ctx => streetDefaults(style, ctx), generate: (ctx, params) => generateStreetStyle(style, ctx, params) };
});

export { sourceOf as streetPieceSource };
