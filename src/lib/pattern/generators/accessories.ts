import type { Piece, SeamRelation } from '../types';
import type { GeneratorResult, PatternGenerator, Params } from '../generator';
import { num } from '../generator';
import { edgeLength } from '../outline';
import { formatLength } from '../../units';

/** Rectangles describe seam lines; cutting margins belong exclusively to edges. */
function rectangle(id: string, name: string, w: number, h: number, sa: number, fabric: Piece['cut']['fabric'] = 'principal'): Piece {
  const nodes = [{ id: 'a', x: 0, y: 0 }, { id: 'b', x: w, y: 0 }, { id: 'c', x: w, y: h }, { id: 'd', x: 0, y: h }];
  return { id, name, source: 'generada', nodes,
    edges: ['superior', 'derecho', 'inferior', 'izquierdo'].map((id, i) => ({ id, label: ['Superior', 'Derecho', 'Inferior', 'Izquierdo'][i], from: nodes[i].id, to: nodes[(i + 1) % 4].id, kind: 'line', allowance: sa, finish: 'costura' })),
    grain: { a: { x: w / 2, y: h * 0.2 }, b: { x: w / 2, y: h * 0.8 } }, cut: { qty: 1, mirrorPairs: false, onFold: false, fabric }, notches: [], lines: [], marks: [] };
}
function equal(id: string, label: string, a: string, ae: string[], b: string, be: string[]): SeamRelation {
  return { id, label, kind: 'igual', a: [{ pieceId: a, edgeIds: ae }], b: [{ pieceId: b, edgeIds: be }], ratioMin: 0.999, ratioMax: 1.001, tolerance: 0.1 };
}
const margin = { key: 'margen', label: 'Margen de costura', group: 'margenes', type: 'length', min: 3, max: 20 } as const;
const experiment = { level: 'aviso', code: 'muestra-pendiente', message: 'Experimental: imprime y cose una muestra antes de cortar la tela definitiva.' } as const;

export function generateSleeve(_ctx: unknown, p: Params): GeneratorResult {
  const circumference = num(p, 'contorno', 210), height = num(p, 'alto', 110), overlap = num(p, 'traslape', 25), ease = num(p, 'holgura', 5), sa = num(p, 'margen', 7);
  const w = circumference + ease + overlap;
  const exterior = rectangle('exterior', 'Exterior de la funda', w, height, sa);
  const lining = rectangle('forro', 'Forro de la funda', w, height, sa, 'forro');
  for (const piece of [exterior, lining]) {
    piece.lines.push({ id: 'traslape', kind: 'colocacion', a: { x: w - overlap, y: 0 }, b: { x: w - overlap, y: height }, label: 'Inicio del traslape' });
    piece.notes = ['Funda abierta por arriba y abajo; ajusta el velcro con el recipiente real.'];
  }
  return { pieces: [exterior, lining], seams: [equal('perimetro', 'Exterior con forro', exterior.id, exterior.edges.map(e => e.id), lining.id, lining.edges.map(e => e.id))],
    checks: [{ key: 'contorno', label: 'Contorno útil sin traslape', body: circumference, ease, target: circumference + ease, measured: edgeLength(exterior, exterior.edges[0]) - overlap, tolerance: 0.1 }],
    materials: [{ id: 'velcro', label: 'Cinta de gancho y bucle (velcro)', qty: formatLength(height - 20, 'cm') }, { id: 'hilo', label: 'Hilo de coser', qty: '1 carrete' }],
    assumptions: ['Mide el contorno del recipiente, sin deducirlo de su capacidad.', 'Funda para lata, vaso o botella casi cilíndrica. Sin base y sin aislamiento térmico certificado.', 'El traslape se añade una vez; los márgenes de costura se añaden por fuera.'],
    steps: [
      { id: 'cortar', title: 'Corta exterior y forro', detail: 'Corta una pieza exterior y una de forro, respetando los márgenes.', pieces: ['exterior', 'forro'] },
      { id: 'unir', title: 'Une las dos capas', detail: 'Derecho con derecho, cose el contorno dejando una abertura de 4 cm. Rebaja las esquinas, voltea y cierra la abertura.', pieces: ['exterior', 'forro'], seams: ['perimetro'] },
      { id: 'cierre', title: 'Coloca el velcro', detail: 'Envuelve el recipiente. Cose las dos caras del velcro en extremos opuestos y caras opuestas para formar el traslape marcado.', pieces: ['exterior', 'forro'] }
    ], notices: [experiment, ...(overlap >= w / 2 || height <= 20 ? [{ level: 'error' as const, code: 'dimensiones-funda', message: 'Revisa el alto y el traslape: la funda necesita un alto mayor a 2 cm y espacio para envolver el recipiente.' }] : [])] };
}
export const sleeveGenerator: PatternGenerator = {
  id: 'funda-bebida', name: 'Funda ajustable para lata o vaso', summary: 'Funda con forro y velcro, calculada con el contorno real del recipiente.', status: 'experimental', requiredMeasures: [], optionalMeasures: [],
  defaults: () => ({ contorno: 210, alto: 110, traslape: 25, holgura: 5, margen: 7 }), generate: generateSleeve,
  params: [{ key: 'contorno', label: 'Contorno del recipiente', group: 'diseno', type: 'length', min: 100, max: 600 }, { key: 'alto', label: 'Alto terminado', group: 'diseno', type: 'length', min: 40, max: 300 }, { key: 'traslape', label: 'Traslape del cierre', group: 'diseno', type: 'length', min: 15, max: 60 }, { key: 'holgura', label: 'Holgura alrededor del recipiente', group: 'holgura', type: 'length', min: 0, max: 20 }, margin]
};

export function generateCushion(_ctx: unknown, p: Params): GeneratorResult {
  const w = num(p, 'ancho', 400), h = num(p, 'alto', 400), overlap = num(p, 'traslape', 120), sa = num(p, 'margen', 10), hem = num(p, 'dobladillo', 20);
  const front = rectangle('frente', 'Frente del cojín', w, h, sa);
  const backA = rectangle('espalda-a', 'Espalda superior', w, (h + overlap) / 2, sa);
  const backB = rectangle('espalda-b', 'Espalda inferior', w, (h + overlap) / 2, sa);
  backA.edges[2] = { ...backA.edges[2], finish: 'dobladillo', allowance: hem, label: 'Dobladillo de la abertura' };
  backB.edges[0] = { ...backB.edges[0], finish: 'dobladillo', allowance: hem, label: 'Dobladillo de la abertura' };
  const upper = edgeLength(backA, backA.edges[1]), lower = edgeLength(backB, backB.edges[1]);
  return { pieces: [front, backA, backB], seams: [equal('superior', 'Borde superior', front.id, ['superior'], backA.id, ['superior']), equal('inferior', 'Borde inferior', front.id, ['inferior'], backB.id, ['inferior'])],
    checks: [{ key: 'alto', label: 'Alto de las espaldas después del traslape', target: h, measured: upper + lower - overlap, tolerance: 0.1 }, { key: 'ancho', label: 'Ancho terminado', target: w, measured: edgeLength(front, front.edges[0]), tolerance: 0.1 }],
    materials: [{ id: 'relleno', label: 'Relleno de cojín', qty: `${formatLength(w, 'cm')} × ${formatLength(h, 'cm')}` }, { id: 'hilo', label: 'Hilo de coser', qty: '1 carrete' }],
    assumptions: ['Medidas terminadas de la funda, sin holgura adicional. Ajusta a tu relleno.', 'Las dos espaldas se superponen la distancia indicada; los dobladillos se agregan fuera de la línea terminada.'],
    steps: [
      { id: 'cortar', title: 'Corta las tres piezas', detail: 'Corta un frente y las dos espaldas. Borda o aplica adornos al frente antes de unir.', pieces: ['frente', 'espalda-a', 'espalda-b'] },
      { id: 'dobladillos', title: 'Termina la abertura', detail: 'En el borde marcado de cada espalda, dobla la mitad del margen y vuelve a doblar hasta la línea terminada; pespuntea.', pieces: ['espalda-a', 'espalda-b'] },
      { id: 'armar', title: 'Superpone y cose', detail: `Coloca las espaldas sobre el frente, derecho con derecho; superpón las aberturas ${formatLength(overlap, 'cm')} y alinea los bordes exteriores. Cose los cuatro lados, remata y voltea por la abertura.`, pieces: ['frente', 'espalda-a', 'espalda-b'], seams: ['superior', 'inferior'] }
    ], notices: [experiment, ...(overlap >= h || overlap < 30 ? [{ level: 'error' as const, code: 'traslape-cojin', message: 'El traslape debe medir al menos 3 cm y ser menor que el alto de la funda.' }] : [])] };
}
export const cushionGenerator: PatternGenerator = {
  id: 'cojin-sobre', name: 'Funda de cojín con cierre de sobre', summary: 'Frente y dos espaldas con traslape; sin cierre ni botones.', status: 'experimental', requiredMeasures: [], optionalMeasures: [],
  defaults: () => ({ ancho: 400, alto: 400, traslape: 120, margen: 10, dobladillo: 20 }), generate: generateCushion,
  params: [{ key: 'ancho', label: 'Ancho terminado', group: 'diseno', type: 'length', min: 150, max: 1000 }, { key: 'alto', label: 'Alto terminado', group: 'diseno', type: 'length', min: 150, max: 1000 }, { key: 'traslape', label: 'Traslape de la abertura', group: 'diseno', type: 'length', min: 30, max: 300 }, margin, { key: 'dobladillo', label: 'Margen de dobladillo doble', group: 'margenes', type: 'length', min: 10, max: 40 }]
};

export function generateScrunchie(_ctx: unknown, p: Params): GeneratorResult {
  const elastic = num(p, 'elastico', 180), fullness = num(p, 'frunce', 3), width = num(p, 'ancho', 40), sa = num(p, 'margen', 7);
  const piece = rectangle('tubo', 'Tubo de tela de la dona', elastic * fullness, 2 * width, sa);
  return { pieces: [piece], seams: [equal('tubo', 'Costura longitudinal del tubo', piece.id, ['superior'], piece.id, ['inferior']), equal('cierre', 'Extremos de la dona', piece.id, ['izquierdo'], piece.id, ['derecho'])],
    checks: [{ key: 'ancho', label: 'Ancho plano del tubo terminado', target: width, measured: edgeLength(piece, piece.edges[1]) / 2, tolerance: 0.1 }, { key: 'frunce', label: 'Tela antes del frunce', target: elastic * fullness, measured: edgeLength(piece, piece.edges[0]), tolerance: 0.1 }],
    materials: [{ id: 'elastico', label: 'Elástico de 5–8 mm', qty: formatLength(elastic + 20, 'cm'), note: 'Largo del aro + 2 cm para unir los extremos.' }, { id: 'hilo', label: 'Hilo de coser', qty: '1 carrete' }],
    assumptions: ['Dona para cabello. El ancho se refiere al tubo aplanado, sin contar el frunce.', 'El aro de elástico es una medida independiente de las tallas de ropa.'],
    steps: [{ id: 'cortar', title: 'Corta el tubo', detail: 'Corta una pieza al hilo con los márgenes indicados.', pieces: ['tubo'] }, { id: 'tubo', title: 'Cose y voltea el tubo', detail: 'Dobla a lo largo, derecho con derecho. Une los bordes largos dejando libres 3 cm en cada extremo y voltea con un pasacintas.', pieces: ['tubo'], seams: ['tubo'] }, { id: 'elastico', title: 'Coloca el elástico y cierra', detail: 'Pasa el elástico, superpón 2 cm y cose sus extremos con varias pasadas. Une los extremos cortos de la tela, esconde los márgenes y cierra la abertura a mano.', pieces: ['tubo'], seams: ['cierre'] }], notices: [experiment] };
}
export const scrunchieGenerator: PatternGenerator = {
  id: 'dona-cabello', name: 'Dona de tela para cabello', summary: 'Scrunchie con ancho, frunce y elástico independientes.', status: 'experimental', requiredMeasures: [], optionalMeasures: [],
  defaults: () => ({ elastico: 180, frunce: 3, ancho: 40, margen: 7 }), generate: generateScrunchie,
  params: [{ key: 'elastico', label: 'Contorno terminado del aro de elástico', group: 'diseno', type: 'length', min: 100, max: 400 }, { key: 'frunce', label: 'Largo de tela / largo de elástico', group: 'diseno', type: 'ratio', min: 2, max: 5 }, { key: 'ancho', label: 'Ancho del tubo aplanado', group: 'diseno', type: 'length', min: 15, max: 100 }, margin]
};

export function generateBandana(_ctx: unknown, p: Params): GeneratorResult {
  const w = num(p, 'ancho', 700), h = num(p, 'alto', 300), sa = num(p, 'margen', 7);
  const triangle = (id: string, name: string, fabric: Piece['cut']['fabric']): Piece => ({ id, name, source: 'generada', nodes: [{ id: 'a', x: 0, y: 0 }, { id: 'b', x: w, y: 0 }, { id: 'c', x: w / 2, y: h }], edges: [{ id: 'superior', label: 'Borde largo', from: 'a', to: 'b', kind: 'line', allowance: sa, finish: 'costura' }, { id: 'derecho', label: 'Punta derecha', from: 'b', to: 'c', kind: 'line', allowance: sa, finish: 'costura' }, { id: 'izquierdo', label: 'Punta izquierda', from: 'c', to: 'a', kind: 'line', allowance: sa, finish: 'costura' }], grain: { a: { x: w / 2, y: h * 0.15 }, b: { x: w / 2, y: h * 0.8 } }, cut: { qty: 1, mirrorPairs: false, onFold: false, fabric }, notches: [], lines: [], marks: [] });
  const a = triangle('exterior', 'Cara principal de la bandana', 'principal'), b = triangle('reverso', 'Reverso de la bandana', 'contraste');
  return { pieces: [a, b], seams: [equal('perimetro', 'Contorno de las dos caras', a.id, a.edges.map(e => e.id), b.id, b.edges.map(e => e.id))],
    checks: [{ key: 'ancho', label: 'Ancho terminado de punta a punta', target: w, measured: edgeLength(a, a.edges[0]), tolerance: 0.1 }, { key: 'alto', label: 'Profundidad del triángulo', target: h, measured: a.nodes[2].y - a.nodes[0].y, tolerance: 0.1 }],
    materials: [{ id: 'hilo', label: 'Hilo de coser', qty: '1 carrete' }], assumptions: ['Bandana triangular reversible para adulto. No es una talla de cuello; comprueba el largo necesario para anudar con comodidad.', 'El margen se agrega perpendicularmente a cada lado; recorta y gradúa las puntas antes de voltear.'],
    steps: [{ id: 'cortar', title: 'Corta las dos caras', detail: 'Corta una cara principal y un reverso. Añade bordados o aplicaciones antes de unir.', pieces: ['exterior', 'reverso'] }, { id: 'unir', title: 'Cose el contorno', detail: 'Coloca derecho con derecho y cose los tres lados dejando 5 cm abiertos en el lado largo. Rebaja las puntas sin cortar la costura.', pieces: ['exterior', 'reverso'], seams: ['perimetro'] }, { id: 'cerrar', title: 'Voltea y termina', detail: 'Voltea, saca las puntas con suavidad, plancha y cierra la abertura. Pespuntea si deseas.', pieces: ['exterior', 'reverso'] }], notices: [experiment] };
}
export const bandanaGenerator: PatternGenerator = {
  id: 'bandana-reversible', name: 'Bandana triangular reversible', summary: 'Dos caras listas para intervenir con retazos o bordados.', status: 'experimental', requiredMeasures: [], optionalMeasures: [],
  defaults: () => ({ ancho: 700, alto: 300, margen: 7 }), generate: generateBandana,
  params: [{ key: 'ancho', label: 'Ancho terminado de punta a punta', group: 'diseno', type: 'length', min: 400, max: 1200 }, { key: 'alto', label: 'Alto del triángulo', group: 'diseno', type: 'length', min: 100, max: 600 }, margin]
};

/** Shared construction for reversible rectangular textiles, with no hidden sizing. */
export function generateReversibleRectangle(_ctx: unknown, p: Params): GeneratorResult {
  const w = num(p, 'ancho', 450), h = num(p, 'alto', 320), sa = num(p, 'margen', 7);
  const a = rectangle('cara-a', 'Cara principal', w, h, sa), b = rectangle('cara-b', 'Cara de contraste', w, h, sa, 'contraste');
  return { pieces: [a, b], seams: [equal('contorno', 'Contorno de las dos caras', a.id, a.edges.map(e => e.id), b.id, b.edges.map(e => e.id))],
    checks: [{ key: 'ancho', label: 'Ancho terminado', target: w, measured: edgeLength(a, a.edges[0]), tolerance: 0.1 }, { key: 'alto', label: 'Alto terminado', target: h, measured: edgeLength(a, a.edges[1]), tolerance: 0.1 }],
    materials: [{ id: 'hilo', label: 'Hilo de coser', qty: '1 carrete' }], assumptions: ['Objeto textil plano y rectangular con dos caras cosidas; sin relleno, sin bolsillos ni protección térmica.', 'Los márgenes se agregan fuera del rectángulo terminado. No incluye reducción por acolchado.'],
    steps: [{ id: 'cortar', title: 'Corta las dos caras', detail: 'Corta una cara principal y una de contraste. Borda o aplica adornos antes de unir.', pieces: ['cara-a', 'cara-b'] }, { id: 'unir', title: 'Cose las dos caras', detail: 'Coloca derecho con derecho. Cose el contorno dejando una abertura que permita voltear la pieza. Rebaja las esquinas sin cortar la costura.', pieces: ['cara-a', 'cara-b'], seams: ['contorno'] }, { id: 'terminar', title: 'Voltea, plancha y cierra', detail: 'Voltea, acomoda las esquinas y plancha. Cierra la abertura a mano o con un pespunte por todo el borde.', pieces: ['cara-a', 'cara-b'] }], notices: [experiment] };
}
export const reversibleRectangleGenerator: PatternGenerator = {
  id: 'textil-doble-cara', name: 'Textil rectangular de doble cara', summary: 'Base real para individuales, posavasos, servilletas y marcapáginas reversibles.', status: 'experimental', requiredMeasures: [], optionalMeasures: [],
  defaults: () => ({ ancho: 450, alto: 320, margen: 7 }), generate: generateReversibleRectangle,
  params: [{ key: 'ancho', label: 'Ancho terminado', group: 'diseno', type: 'length', min: 30, max: 1600 }, { key: 'alto', label: 'Alto terminado', group: 'diseno', type: 'length', min: 30, max: 1600 }, margin]
};
