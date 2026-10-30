import type { Pt } from '../../geom/vec';
import { formatLength } from '../../units';
import { edgesLength, edgeLength } from '../outline';
import type { GeneratorResult, ParamDef, Params, PatternGenerator } from '../generator';
import { num } from '../generator';
import type { Issue, MeasureCheck, PEdge, Piece, SeamRelation } from '../types';

const experimental: Issue = { level: 'aviso', code: 'muestra-pendiente', message: 'Experimental: verifica la impresión y cose una muestra para comprobar ajuste y montaje.' };
const length = (key: string, label: string, min: number, max: number): ParamDef => ({ key, label, min, max, type: 'length', group: 'diseno' });
const margin: ParamDef = { ...length('margen', 'Margen de costura', 3, 10), group: 'margenes' };
const measure = (key: string, label: string, target: number, measured: number, tolerance = .1): MeasureCheck => ({ key, label, target, measured, tolerance });
const thread = { id: 'hilo', label: 'Hilo de coser', qty: '1 carrete' };
function invalid(values: [string, number, number, number][]): GeneratorResult | undefined {
  const errors = values.filter(([, value, min, max]) => !Number.isFinite(value) || value < min || value > max)
    .map(([label]) => ({ level: 'error' as const, code: 'medida-disfraz-invalida', message: `Revisa ${label}: su medida queda fuera del intervalo admitido.` }));
  return errors.length ? { pieces: [], seams: [], checks: [], materials: [], assumptions: [], steps: [], notices: [experimental, ...errors] } : undefined;
}
function shape(id: string, name: string, fabric: Piece['cut']['fabric'], qty = 1, mirrorPairs = false): Piece {
  return { id, name, source: 'generada', nodes: [], edges: [], grain: { a: { x: 0, y: 0 }, b: { x: 0, y: 1 } }, cut: { qty, mirrorPairs, onFold: false, fabric }, notches: [], lines: [], marks: [] };
}
function line(piece: Piece, id: string, label: string, from: string, to: string, allowance: number) {
  piece.edges.push({ id, label, from, to, kind: 'line', allowance, finish: allowance ? 'costura' : 'sin-margen' });
}
/** Circular arcs use fixed subdivisions so node/edge IDs survive dimension edits.
 * Eight cubics per semicircle keep length error below 0.01 mm at our ranges. */
function arc(piece: Piece, prefix: string, label: string, radius: number, start: number, end: number, steps: number, from: string, to: string, sa: number) {
  const point = (angle: number): Pt => ({ x: radius * Math.cos(angle), y: radius * Math.sin(angle) });
  const delta = (end - start) / steps, k = 4 / 3 * Math.tan(delta / 4);
  for (let i = 0; i < steps; i++) {
    const a = start + i * delta, b = a + delta, p = point(a), q = point(b);
    const next = i === steps - 1 ? to : `${prefix}-n${i + 1}`;
    if (i < steps - 1) piece.nodes.push({ id: next, ...q });
    piece.edges.push({ id: `${prefix}-${i + 1}`, label, from: i === 0 ? from : `${prefix}-n${i}`, to: next,
      kind: 'cubic', c1: { x: p.x - k * radius * Math.sin(a), y: p.y + k * radius * Math.cos(a) },
      c2: { x: q.x + k * radius * Math.sin(b), y: q.y - k * radius * Math.cos(b) },
      allowance: sa, finish: sa ? 'costura' : 'sin-margen' });
  }
}
const edgeIds = (piece: Piece, prefix?: string) => piece.edges.filter(edge => !prefix || edge.id.startsWith(prefix)).map(edge => edge.id);
function equal(id: string, label: string, a: Piece, ae: string[], b: Piece, be: string[], af = 1, bf = 1): SeamRelation {
  return { id, label, kind: 'igual', a: [{ pieceId: a.id, edgeIds: ae, factor: af }], b: [{ pieceId: b.id, edgeIds: be, factor: bf }], tolerance: .1, ratioMin: .9999, ratioMax: 1.0001 };
}
function copy(piece: Piece, id: string, name: string, fabric: Piece['cut']['fabric'], sa?: number): Piece {
  const result = structuredClone(piece); result.id = id; result.name = name; result.cut.fabric = fabric;
  if (sa !== undefined) result.edges = result.edges.map(edge => ({ ...edge, allowance: sa, finish: sa ? 'costura' : 'sin-margen' }));
  return result;
}

export function generateCape(_ctx: unknown, p: Params): GeneratorResult {
  const neck = num(p, 'contornoCuello', 360), ease = num(p, 'holguraCuello', 40), long = num(p, 'largo', 700), sa = num(p, 'margen', 10);
  const bad = invalid([['el contorno de cuello', neck, 260, 600], ['la holgura del cuello', ease, 20, 100], ['el largo', long, 250, 1200], ['el margen', sa, 3, 10]]); if (bad) return bad;
  const r = (neck + ease) / Math.PI, R = r + long;
  const outer = shape('exterior', 'Cuarto de capa exterior', 'principal', 2, true);
  outer.nodes = [{ id: 'cuello-frente', x: r, y: 0 }, { id: 'bajo-frente', x: R, y: 0 }, { id: 'bajo-espalda', x: 0, y: R }, { id: 'cuello-espalda', x: 0, y: r }];
  line(outer, 'frente', 'Abertura frontal', 'cuello-frente', 'bajo-frente', sa);
  arc(outer, 'bajo', 'Bajo curvo', R, 0, Math.PI / 2, 4, 'bajo-frente', 'bajo-espalda', sa);
  line(outer, 'centro-espalda', 'Centro de espalda', 'bajo-espalda', 'cuello-espalda', sa);
  arc(outer, 'cuello', 'Escote', r, Math.PI / 2, 0, 4, 'cuello-espalda', 'cuello-frente', sa);
  outer.grain = { a: { x: r + long * .15, y: long * .12 }, b: { x: r + long * .15, y: long * .55 } };
  outer.marks = [{ id: 'cierre', kind: 'cruz', at: { x: r + 20, y: 10 }, label: 'Cierre frontal: ajustar al probar' }];
  const lining = copy(outer, 'forro', 'Cuarto de capa de reverso', 'forro');
  return { pieces: [outer, lining], seams: [equal('espalda-exterior', 'Centro de espalda de los dos exteriores', outer, ['centro-espalda'], outer, ['centro-espalda']), equal('espalda-forro', 'Centro de espalda de los dos reversos', lining, ['centro-espalda'], lining, ['centro-espalda']), equal('capas', 'Contorno exterior con reverso', outer, edgeIds(outer).filter(id => id !== 'centro-espalda'), lining, edgeIds(lining).filter(id => id !== 'centro-espalda'))],
    checks: [measure('cuello', 'Escote total de las dos mitades', neck + ease, edgesLength(outer, edgeIds(outer, 'cuello-')) * 2), measure('largo', 'Largo desde escote hasta bajo', long, edgeLength(outer, outer.edges[0]))],
    materials: [thread, { id: 'cierre', label: 'Broche frontal o cierre de velcro suave', qty: '1 juego', note: 'Fijar sobre la tela, después de probar cuello y cobertura; no incluye cordón.' }],
    assumptions: ['Capa semicircular abierta por delante, sin capucha; el patrón incluye exterior y reverso completos, divididos en centro espalda.', 'Escote terminado = contorno de cuello indicado + holgura una sola vez. Los márgenes se agregan fuera del contorno terminado.', 'El largo se mide desde el escote. Comprueba cuello, movimiento y que el bajo no arrastre en la persona; no es una talla infantil o adulta universal.', `Cada cuarto mide aproximadamente ${formatLength(R, 'cm')} por lado antes de márgenes: comprueba ancho de tela y dirección del estampado.`],
    steps: [
      { id: 'cortar', title: 'Corta cuatro cuartos en espejo', detail: 'Imprime al 100 % y comprueba el control. Corta dos exteriores y dos reversos, cada pareja en espejo, respetando el hilo. No añadas otro margen. Transfiere las marcas del cierre y decora el exterior antes de montar.', pieces: ['exterior', 'forro'] },
      { id: 'espalda', title: 'Une los centros de espalda', detail: 'Junta los dos exteriores derecho con derecho y cose únicamente centro espalda. Repite con los reversos. Abre los márgenes con plancha sin estirar el escote.', pieces: ['exterior', 'forro'], seams: ['espalda-exterior', 'espalda-forro'] },
      { id: 'capas', title: 'Cose exterior y reverso', detail: 'Enfrenta los derechos de ambas capas. Relaciona las costuras de centro espalda. Cose ambos frentes, el escote y el bajo, dejando una abertura de unos 12 cm en un frente para voltear. No cierres la abertura frontal como si fuera otra costura de espalda.', pieces: ['exterior', 'forro'], seams: ['capas'] },
      { id: 'voltear', title: 'Rebaja, voltea y asienta', detail: 'Recorta los márgenes escalonados; haz piquetes en el escote sin cortar la costura. Voltea por la abertura, acomoda las curvas y plancha. Cierra la abertura con puntada invisible y pespuntea si lo deseas.', pieces: ['exterior', 'forro'] },
      { id: 'cierre', title: 'Prueba la capa y coloca el cierre', detail: 'Prueba sobre la ropa que se usará debajo. Ajusta el broche o velcro entre los dos frentes, sin apretar el cuello. Comprueba el largo y la movilidad antes de reforzar la fijación.', pieces: ['exterior', 'forro'] }
    ], notices: [experimental] };
}
export const capeGenerator: PatternGenerator = { id: 'capa-semicircular', name: 'Capa semicircular reversible', summary: 'Dos cuartos por capa, centro de espalda y escote calculado con holgura.', status: 'experimental', requiredMeasures: [], optionalMeasures: [], defaults: () => ({ contornoCuello: 360, holguraCuello: 40, largo: 700, margen: 10 }), generate: generateCape,
  params: [length('contornoCuello', 'Contorno real del cuello', 260, 600), length('largo', 'Largo desde el escote', 250, 1200), { ...length('holguraCuello', 'Holgura total del cuello', 20, 100), group: 'holgura' }, margin] };

export function generateCrown(_ctx: unknown, p: Params): GeneratorResult {
  const head = num(p, 'contornoCabeza', 540), ease = num(p, 'holgura', 10), overlap = num(p, 'traslape', 35), band = num(p, 'altoBanda', 45), peaks = num(p, 'altoPuntas', 55), sa = num(p, 'margen', 5);
  const count = Number(p.puntas ?? '5');
  const bad = invalid([['el contorno de cabeza', head, 420, 680], ['la holgura', ease, 0, 30], ['el traslape', overlap, 25, 60], ['el alto de banda', band, 30, 80], ['el alto de puntas', peaks, 25, 100], ['el margen', sa, 3, 10], ['el número de puntas', count, 5, 7]]); if (bad) return bad;
  if (![5, 7].includes(count)) return invalid([['el número de puntas (5 o 7)', 0, 5, 7]])!;
  const circle = head + ease, w = circle + overlap, h = band + peaks;
  const outer = shape('exterior', 'Corona exterior con traslape', 'principal');
  outer.nodes = [{ id: 'bajo-izq', x: 0, y: h }, { id: 'valle-0', x: 0, y: peaks }];
  for (let i = 0; i < count; i++) outer.nodes.push({ id: `punta-${i + 1}`, x: circle * (i + .5) / count, y: 0 }, { id: `valle-${i + 1}`, x: circle * (i + 1) / count, y: peaks });
  outer.nodes.push({ id: 'traslape-superior', x: w, y: peaks }, { id: 'bajo-der', x: w, y: h });
  outer.edges = outer.nodes.map((node, i): PEdge => ({ id: `borde-${node.id}`, label: node.id.startsWith('punta') || node.id.startsWith('valle') ? 'Contorno de puntas' : 'Banda y traslape', from: node.id, to: outer.nodes[(i + 1) % outer.nodes.length].id, kind: 'line', allowance: sa, finish: 'costura' }));
  outer.grain = { a: { x: 30, y: peaks + band / 2 }, b: { x: w - 30, y: peaks + band / 2 } };
  outer.lines = [{ id: 'traslape', kind: 'colocacion', a: { x: circle, y: peaks }, b: { x: circle, y: h }, label: 'Inicio del traslape' }];
  outer.marks = [{ id: 'velcro-izq', kind: 'cruz', at: { x: overlap / 2, y: peaks + band / 2 }, label: 'Velcro en reverso' }, { id: 'velcro-der', kind: 'cruz', at: { x: circle + overlap / 2, y: peaks + band / 2 }, label: 'Velcro en exterior' }];
  const lining = copy(outer, 'reverso', 'Corona de reverso', 'forro'), interfacing = copy(outer, 'refuerzo', 'Entretela de corona sin márgenes', 'entretela', 0);
  return { pieces: [outer, lining, interfacing], seams: [equal('capas', 'Contorno de corona exterior y reverso', outer, edgeIds(outer), lining, edgeIds(lining))],
    checks: [measure('contorno', 'Contorno cerrado con el traslape indicado', head + ease, w - overlap), measure('alto', 'Alto desde base hasta puntas', h, outer.nodes[0].y - outer.nodes[2].y)],
    materials: [thread, { id: 'velcro', label: 'Velcro suave de 20 mm de ancho', qty: `1 juego de ${formatLength(overlap - 10, 'cm')}`, note: 'Cose cada mitad en una cara opuesta del traslape.' }, { id: 'refuerzo', label: 'Entretela firme compatible con la tela', qty: '1 pieza según plantilla', note: 'Prueba la fusión en un retazo; su plantilla no añade margen.' }],
    assumptions: ['Corona textil flexible, de dos caras y entretela; no incorpora alambre ni piezas rígidas.', 'Contorno cerrado = medida indicada de cabeza + holgura. El traslape se suma aparte a la tira, no al contorno cerrado.', 'Las puntas y los valles cambian su geometría con el número de puntas; revisa el margen de las esquinas al coser.'],
    steps: [
      { id: 'cortar', title: 'Corta exterior, reverso y refuerzo', detail: 'Corta una pieza de cada plantilla. Transfiere las marcas de traslape y velcro. La entretela no lleva márgenes. Añade bordados o aplicaciones antes de cerrar las capas.', pieces: ['exterior', 'reverso', 'refuerzo'] },
      { id: 'reforzar', title: 'Refuerza el exterior', detail: 'Centra el refuerzo por el revés del exterior, dentro de las líneas de costura. Fusiona o hilvana según la entretela que uses; deja los márgenes de tela libres.', pieces: ['exterior', 'refuerzo'] },
      { id: 'capas', title: 'Cose alrededor de las puntas', detail: 'Coloca exterior y reverso derecho con derecho. Cose el contorno dejando unos 6 cm abiertos en la base recta. Pivota con la aguja abajo en cada valle, manteniendo el margen marcado.', pieces: ['exterior', 'reverso'], seams: ['capas'] },
      { id: 'voltear', title: 'Forma las puntas y termina la base', detail: 'Rebaja el margen de las puntas y haz un piquete hasta cerca de la costura en cada valle. Voltea con una herramienta roma. Plancha, cierra la abertura y pespuntea la base.', pieces: ['exterior', 'reverso'] },
      { id: 'cierre', title: 'Ajusta el traslape y cose el velcro', detail: 'Prueba la corona sobre la persona con el traslape marcado. Cose una mitad de velcro en el exterior del extremo largo y la otra en el reverso del inicio. Comprueba que cierre sin apretar.', pieces: ['exterior', 'reverso'] }
    ], notices: [experimental] };
}
export const crownGenerator: PatternGenerator = { id: 'corona-textil', name: 'Corona textil de puntas', summary: 'Corona reversible con cinco o siete puntas, entretela y traslape de velcro.', status: 'experimental', requiredMeasures: [], optionalMeasures: [], defaults: () => ({ contornoCabeza: 540, holgura: 10, traslape: 35, altoBanda: 45, altoPuntas: 55, puntas: '5', margen: 5 }), generate: generateCrown,
  params: [length('contornoCabeza', 'Contorno real de cabeza', 420, 680), length('altoBanda', 'Alto de la banda', 30, 80), length('altoPuntas', 'Alto de las puntas sobre la banda', 25, 100), { key: 'puntas', label: 'Número de puntas', type: 'choice', group: 'diseno', choices: [{ value: '5', label: 'Cinco puntas' }, { value: '7', label: 'Siete puntas' }] }, { ...length('holgura', 'Holgura total de cabeza', 0, 30), group: 'holgura' }, length('traslape', 'Traslape del cierre', 25, 60), margin] };

export function generateWizardHat(_ctx: unknown, p: Params): GeneratorResult {
  const head = num(p, 'contornoCabeza', 540), ease = num(p, 'holgura', 10), height = num(p, 'alto', 330), brim = num(p, 'anchoAla', 85), sa = num(p, 'margen', 7);
  const bad = invalid([['el contorno de cabeza', head, 420, 680], ['la holgura', ease, 0, 30], ['el alto del cono', height, 150, 600], ['el ancho del ala', brim, 40, 150], ['el margen', sa, 3, 10]]); if (bad) return bad;
  const circumference = head + ease, r = circumference / (2 * Math.PI), slant = Math.hypot(height, r), angle = circumference / slant;
  const start = Math.PI / 2 - angle / 2, end = Math.PI / 2 + angle / 2;
  const cone = shape('cono', 'Cono exterior del sombrero', 'principal');
  cone.nodes = [{ id: 'punta', x: 0, y: 0 }, { id: 'base-der', x: slant * Math.cos(start), y: slant * Math.sin(start) }, { id: 'base-izq', x: slant * Math.cos(end), y: slant * Math.sin(end) }];
  line(cone, 'costura-der', 'Cierre del cono, lado derecho', 'punta', 'base-der', sa);
  arc(cone, 'base', 'Unión del cono con el ala', slant, start, end, 8, 'base-der', 'base-izq', sa);
  line(cone, 'costura-izq', 'Cierre del cono, lado izquierdo', 'base-izq', 'punta', sa);
  cone.grain = { a: { x: 0, y: slant * .2 }, b: { x: 0, y: slant * .8 } };
  cone.notches = [2, 4, 6].map(i => ({ id: `cuarto-${i / 2}`, edgeId: `base-${i}`, s: edgeLength(cone, cone.edges[i]), count: 1 as const, label: `${i / 2}/4 del contorno` }));
  const wing = shape('ala', 'Media ala exterior', 'principal', 2);
  wing.nodes = [{ id: 'interior-der', x: r, y: 0 }, { id: 'exterior-der', x: r + brim, y: 0 }, { id: 'exterior-izq', x: -r - brim, y: 0 }, { id: 'interior-izq', x: -r, y: 0 }];
  line(wing, 'union-der', 'Unión entre mitades del ala', 'interior-der', 'exterior-der', sa);
  arc(wing, 'exterior', 'Borde exterior del ala', r + brim, 0, Math.PI, 8, 'exterior-der', 'exterior-izq', sa);
  line(wing, 'union-izq', 'Unión entre mitades del ala', 'exterior-izq', 'interior-izq', sa);
  arc(wing, 'interior', 'Unión con el cono', r, Math.PI, 0, 8, 'interior-izq', 'interior-der', sa);
  wing.grain = { a: { x: -brim, y: r + brim / 2 }, b: { x: brim, y: r + brim / 2 } };
  wing.notches = [{ id: 'centro-medio-contorno', edgeId: 'interior-4', s: edgesLength(wing, ['interior-4']), count: 1, label: 'Cuarto de cabeza' }];
  const coneLining = copy(cone, 'cono-forro', 'Cono de forro', 'forro'), wingLining = copy(wing, 'ala-forro', 'Media ala de reverso', 'forro');
  const coneFacing = copy(cone, 'refuerzo-cono', 'Entretela del cono sin márgenes', 'entretela', 0), wingFacing = copy(wing, 'refuerzo-ala', 'Entretela de media ala sin márgenes', 'entretela', 0);
  coneFacing.notches = []; wingFacing.notches = [];
  const seams = [equal('cerrar-cono', 'Costura del cono exterior', cone, ['costura-der'], cone, ['costura-izq']), equal('cerrar-forro', 'Costura del cono de forro', coneLining, ['costura-der'], coneLining, ['costura-izq']), equal('mitades-ala', 'Uniones de las dos medias alas', wing, ['union-der'], wing, ['union-izq']), equal('mitades-reverso', 'Uniones de las dos medias alas de reverso', wingLining, ['union-der'], wingLining, ['union-izq']), equal('montar-cono', 'Base del cono con anillo del ala', cone, edgeIds(cone, 'base-'), wing, edgeIds(wing, 'interior-'), 1, 2), equal('montar-forro', 'Base del forro con anillo del reverso', coneLining, edgeIds(coneLining, 'base-'), wingLining, edgeIds(wingLining, 'interior-'), 1, 2), equal('borde-ala', 'Exterior y reverso del ala', wing, edgeIds(wing, 'exterior-'), wingLining, edgeIds(wingLining, 'exterior-'))];
  return { pieces: [cone, coneLining, wing, wingLining, coneFacing, wingFacing], seams,
    checks: [measure('cabeza', 'Contorno interior terminado del ala', circumference, edgesLength(wing, edgeIds(wing, 'interior-')) * 2), measure('base-cono', 'Contorno de unión del cono', circumference, edgesLength(cone, edgeIds(cone, 'base-'))), measure('ala', 'Ancho radial del ala', brim, edgeLength(wing, wing.edges[0])), measure('alto', 'Alto vertical del cono montado', height, Math.sqrt(slant ** 2 - r ** 2))],
    materials: [thread, { id: 'entretela', label: 'Entretela firme para el cono y el ala', qty: '1 cono y 2 medias alas según sus plantillas', note: 'La rigidez depende del material. Haz una muestra; el patrón no incorpora alambre.' }],
    assumptions: ['Sombrero cónico de tela con forro y ala plana. El ala se forma con dos mitades abiertas que se unen en sus radios; sus recortes tienen contornos continuos y un hueco central real al montarlos.', 'El radio interior es (cabeza + holgura) / 2π. La base del sector cónico y el anillo interior del ala tienen la misma longitud de costura.', 'Contorno de cabeza medido donde apoyará el sombrero, incluyendo peinado si hace falta. La entretela y el grosor de las capas requieren probar el ajuste.', 'La altura indicada es vertical una vez montado; el lado inclinado del sector es más largo. Las piezas de refuerzo no llevan margen.'],
    steps: [
      { id: 'cortar', title: 'Corta las seis plantillas y marca los cuartos', detail: 'Corta un cono exterior, uno de forro, dos medias alas exteriores y dos de reverso. Corta un cono y dos medias alas de entretela sin margen. Transfiere los piquetes de cuartos; decora el cono antes de cerrarlo.', pieces: ['cono', 'cono-forro', 'ala', 'ala-forro', 'refuerzo-cono', 'refuerzo-ala'] },
      { id: 'reforzar', title: 'Estabiliza cono y ala', detail: 'Aplica la entretela por el revés de las piezas exteriores, dentro de sus líneas de costura. Comprueba que sostenga la forma sin crear pliegues; no pegues los márgenes.', pieces: ['cono', 'ala', 'refuerzo-cono', 'refuerzo-ala'] },
      { id: 'conos', title: 'Cierra exterior y forro del cono', detail: 'Dobla cada sector derecho con derecho y une sus dos lados rectos hasta la punta. Rebaja el margen de la punta y abre la costura. Deja una abertura de 8 cm en la costura del forro para voltear al final.', pieces: ['cono', 'cono-forro'], seams: ['cerrar-cono', 'cerrar-forro'] },
      { id: 'anillos', title: 'Forma los dos anillos del ala', detail: 'Une los dos radios rectos de las medias alas, derecho con derecho, para obtener un anillo exterior completo. Repite con el reverso. Abre los márgenes; conserva libre el hueco circular central.', pieces: ['ala', 'ala-forro'], seams: ['mitades-ala', 'mitades-reverso'] },
      { id: 'montar', title: 'Une cada cono a su ala', detail: 'Junta derechos y relaciona los cuartos de la base del cono con el contorno interior del ala. Distribuye sin fruncir y cose exactamente por la línea marcada. Repite con forro y reverso. Haz piquetes en el margen cóncavo del ala sin cortar la costura.', pieces: ['cono', 'ala', 'cono-forro', 'ala-forro'], seams: ['montar-cono', 'montar-forro'] },
      { id: 'terminar', title: 'Une los bordes exteriores y voltea', detail: 'Coloca el sombrero exterior y su forro derecho con derecho. Une todo el borde exterior de las alas. Rebaja márgenes, voltea por la abertura del forro y cierra esa abertura con puntada invisible. Plancha el ala y prueba el contorno antes del pespunte final.', pieces: ['cono', 'cono-forro', 'ala', 'ala-forro'], seams: ['borde-ala'] }
    ], notices: [experimental] };
}
export const wizardHatGenerator: PatternGenerator = { id: 'sombrero-mago', name: 'Sombrero cónico de mago con ala', summary: 'Cono calculado por desarrollo de sector y ala en dos mitades, con forro y entretela.', status: 'experimental', requiredMeasures: [], optionalMeasures: [], defaults: () => ({ contornoCabeza: 540, holgura: 10, alto: 330, anchoAla: 85, margen: 7 }), generate: generateWizardHat,
  params: [length('contornoCabeza', 'Contorno real de cabeza', 420, 680), length('alto', 'Alto vertical del cono', 150, 600), length('anchoAla', 'Ancho radial del ala', 40, 150), { ...length('holgura', 'Holgura total de cabeza', 0, 30), group: 'holgura' }, margin] };

export function generateEars(_ctx: unknown, p: Params): GeneratorResult {
  const w = num(p, 'ancho', 95), h = num(p, 'alto', 115), sa = num(p, 'margen', 5);
  const bad = invalid([['el ancho de cada oreja', w, 50, 160], ['el alto de cada oreja', h, 60, 210], ['el margen', sa, 3, 10]]); if (bad) return bad;
  const front = shape('frente', 'Frente de oreja: cortar dos', 'principal', 2);
  front.nodes = [{ id: 'base-izq', x: 0, y: h }, { id: 'punta', x: w / 2, y: 0 }, { id: 'base-der', x: w, y: h }];
  front.edges = [
    { id: 'lado-izq', label: 'Lado curvo izquierdo', from: 'base-izq', to: 'punta', kind: 'cubic', c1: { x: w * .12, y: h * .5 }, c2: { x: w * .32, y: 0 }, allowance: sa, finish: 'costura' },
    { id: 'lado-der', label: 'Lado curvo derecho', from: 'punta', to: 'base-der', kind: 'cubic', c1: { x: w * .68, y: 0 }, c2: { x: w * .88, y: h * .5 }, allowance: sa, finish: 'costura' },
    { id: 'base', label: 'Base para voltear y fijar', from: 'base-der', to: 'base-izq', kind: 'line', allowance: sa, finish: 'costura' }
  ];
  front.grain = { a: { x: w / 2, y: h * .2 }, b: { x: w / 2, y: h * .8 } };
  front.marks = [{ id: 'fijacion', kind: 'cruz', at: { x: w / 2, y: h - 6 }, label: 'Centro de fijación a diadema' }];
  const rear = copy(front, 'reverso', 'Reverso de oreja: cortar dos', 'forro'), reinforce = copy(front, 'refuerzo', 'Refuerzo de oreja sin márgenes: cortar dos', 'entretela', 0);
  return { pieces: [front, rear, reinforce], seams: [equal('capas', 'Frente y reverso de cada oreja', front, edgeIds(front), rear, edgeIds(rear))], checks: [measure('ancho', 'Ancho terminado de cada base', w, edgesLength(front, ['base'])), measure('alto', 'Alto de cada oreja', h, front.nodes[0].y - front.nodes[1].y)],
    materials: [thread, { id: 'diadema', label: 'Diadema forrada que admita costura a mano', qty: '1 unidad', note: 'Es un soporte comprado, no una pieza incluida en el patrón.' }, { id: 'refuerzo', label: 'Entretela firme o fieltro fino', qty: '2 piezas sin margen', note: 'No se incluye relleno; prueba la rigidez de las dos capas.' }],
    assumptions: ['Dos orejas triangulares curvas, sin alambre ni relleno. Se montan sobre una diadema ya forrada.', 'Ancho y alto pertenecen a cada oreja terminada; la separación se decide al probar la diadema.', 'Las cuatro caras de tela y los dos refuerzos están incluidos; la diadema debe comprarse o reutilizarse.'],
    steps: [
      { id: 'cortar', title: 'Corta las dos orejas y sus reversos', detail: 'Corta dos frentes, dos reversos y dos refuerzos sin margen. Conserva el hilo vertical para que ambas orejas se sostengan igual. Añade los bordados antes de montar.', pieces: ['frente', 'reverso', 'refuerzo'] },
      { id: 'reforzar', title: 'Aplica los refuerzos', detail: 'Centra cada refuerzo por el revés de un frente. Fusiónalo o hilvánalo según el material; deja libres los márgenes de costura.', pieces: ['frente', 'refuerzo'] },
      { id: 'coser', title: 'Cose cada frente con su reverso', detail: 'Enfrenta derechos y cose los lados curvos. Cose la base dejando una abertura central de 3 cm. Recorta los márgenes de las curvas, voltea y plancha suavemente.', pieces: ['frente', 'reverso'], seams: ['capas'] },
      { id: 'cerrar', title: 'Cierra la base y decide la colocación', detail: 'Cierra las dos aberturas con puntada invisible. Coloca las orejas sobre la diadema y prueba separación, inclinación y estabilidad antes de fijar.', pieces: ['frente', 'reverso'] },
      { id: 'montar', title: 'Fija las orejas a la diadema', detail: 'Cose a mano cada base a la cubierta textil de la diadema con puntadas pequeñas y repetidas a lo ancho. Recoge ligeramente la base si necesitas que se mantenga vertical; evita atravesar un soporte plástico con la máquina.', pieces: ['frente', 'reverso'] }
    ], notices: [experimental] };
}
export const earsGenerator: PatternGenerator = { id: 'orejas-diadema', name: 'Orejas textiles para diadema', summary: 'Dos orejas curvas de dos caras con refuerzo; soporte de diadema comprado.', status: 'experimental', requiredMeasures: [], optionalMeasures: [], defaults: () => ({ ancho: 95, alto: 115, margen: 5 }), generate: generateEars,
  params: [length('ancho', 'Ancho de cada oreja', 50, 160), length('alto', 'Alto de cada oreja', 60, 210), margin] };

export const COSTUME_GENERATORS: PatternGenerator[] = [capeGenerator, crownGenerator, wizardHatGenerator, earsGenerator];
