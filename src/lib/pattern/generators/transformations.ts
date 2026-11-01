import type { GeneratorContext, GeneratorResult, ParamDef, Params, PatternGenerator } from '../generator';
import { num, str } from '../generator';
import type { Issue, Piece, SeamRelation } from '../types';
import { edgeLength } from '../outline';
import { formatLength } from '../../units';
import { TRANSFORMATION_CONSTRUCTIONS, type TransformationConstruction } from '../../../data/transformations';

const length = (key: string, label: string, min: number, max: number, help?: string): ParamDef => ({ key, label, min, max, help, group: 'diseno', type: 'length' });
const margin: ParamDef = { ...length('margen', 'Margen de costura', 3, 20), group: 'margenes' };
const quantity: ParamDef = { key: 'cantidad', label: 'Cuántas unidades', group: 'diseno', type: 'choice', choices: [{ value: '1', label: 'Una' }, { value: '2', label: 'Dos' }, { value: '4', label: 'Cuatro' }] };
const counts = (p: Params) => Number(p.cantidad ?? 1);
const cm = (n: number) => formatLength(n, 'cm');
const check = (key: string, label: string, target: number, measured: number) => ({ key, label, target, measured, tolerance: .1 });
const equal = (id: string, label: string, a: Piece, ae: string[], b: Piece, be: string[]): SeamRelation => ({ id, label, kind: 'igual', a: [{ pieceId: a.id, edgeIds: ae }], b: [{ pieceId: b.id, edgeIds: be }], ratioMin: .999, ratioMax: 1.001, tolerance: .1 });
function rect(id: string, name: string, w: number, h: number, sa: number, qty: number, fabric: Piece['cut']['fabric'] = 'contraste'): Piece {
  const nodes = [{ id: 'a', x: 0, y: 0 }, { id: 'b', x: w, y: 0 }, { id: 'c', x: w, y: h }, { id: 'd', x: 0, y: h }];
  return { id, name, nodes, source: 'generada', edges: ['superior', 'derecho', 'inferior', 'izquierdo'].map((id, i) => ({ id, label: ['Superior', 'Derecho', 'Inferior', 'Izquierdo'][i], from: nodes[i].id, to: nodes[(i + 1) % 4].id, kind: 'line', allowance: sa, finish: 'costura' })), grain: { a: { x: w / 2, y: h * .25 }, b: { x: w / 2, y: h * .75 } }, cut: { qty, onFold: false, mirrorPairs: false, fabric }, notches: [], marks: [], lines: [] };
}
function base(pieces: Piece[]): GeneratorResult {
  const ids = pieces.map(piece => piece.id);
  return {
    pieces, seams: [], checks: [], materials: [{ id: 'tela', label: 'Tela prelavada compatible con la prenda', qty: 'Según las piezas y cantidades de corte del patrón.' }, { id: 'hilo', label: 'Hilo y aguja adecuados a las dos telas', qty: '1 carrete' }],
    assumptions: ['Este patrón contiene solamente las piezas nuevas de la transformación. La prenda existente no está incluida.', 'Mide sobre las futuras líneas de costura, con la prenda extendida sin estirar. Los márgenes se añaden por fuera una sola vez.', 'Prueba en retazos y después hilvana sobre la prenda antes de cortar o coser definitivamente. La tela original debe estar sana y ser compatible con la nueva.'],
    steps: [{ id: 'marcar', title: 'Prueba y marca sobre la prenda', detail: 'Ponte la prenda y señala la ubicación. Extiéndela sin estirar y mide desde dos referencias fijas, por ejemplo centro delantero y bajo. Copia esas distancias al otro lado si lleva dos unidades. Comprueba bolsillos, cierres y forros por el reverso.', pieces: ids }, { id: 'cortar', title: 'Prepara las piezas nuevas', detail: 'Imprime al 100 % y mide el cuadrado de 5 cm. Monta las hojas siguiendo los códigos. Recorta por la línea de corte; los márgenes ya están incluidos. Respeta el hilo y las cantidades indicadas en cada pieza.', pieces: ids }],
    notices: [{ level: 'aviso', code: 'transformacion-experimental', message: 'Experimental: verifica una muestra y la compatibilidad con tu prenda antes del corte definitivo.' }]
  };
}
function pocket(p: Params, kind: TransformationConstruction): GeneratorResult {
  const w = num(p, 'ancho', 160), h = num(p, 'largo', 190), sa = num(p, 'margen', 10), qty = counts(p), depth = num(p, 'profundidad', 35), flapHeight = num(p, 'tapa', 55);
  const front = rect('bolsillo', 'Frente del bolsillo', w, h, sa, qty);
  front.edges[0] = { ...front.edges[0], allowance: 20, finish: 'dobladillo', label: 'Boca: dobladillo doble de 1 cm' };
  const r = base([front]);
  r.checks.push(check('ancho', 'Ancho útil del bolsillo', w, edgeLength(front, front.edges[0])), check('alto', 'Alto terminado del bolsillo', h, edgeLength(front, front.edges[1])));
  r.steps.push({ id: 'boca', title: 'Termina la boca del bolsillo', detail: 'Dobla el margen superior 1 cm y otra vez 1 cm. Plancha y pespuntea sin cerrar la entrada.', pieces: ['bolsillo'] });
  if (kind === 'bolsillo-fuelle') {
    const strip = rect('fuelle', 'Fuelle de costados y fondo', 2 * h + w, depth, sa, qty);
    strip.edges[1] = { ...strip.edges[1], finish: 'dobladillo', allowance: 20, label: 'Boca derecha: dobladillo doble' };
    strip.edges[3] = { ...strip.edges[3], finish: 'dobladillo', allowance: 20, label: 'Boca izquierda: dobladillo doble' };
    strip.notches.push({ id: 'esquina-a', edgeId: 'superior', s: h, count: 1, label: 'Primera esquina del fondo' }, { id: 'esquina-b', edgeId: 'superior', s: h + w, count: 2, label: 'Segunda esquina del fondo' });
    r.pieces.push(strip);
    r.seams.push(equal('fuelle-bolsillo', 'Fuelle con costados y fondo del bolsillo', front, ['derecho', 'inferior', 'izquierdo'], strip, ['superior']));
    r.checks.push(check('fuelle', 'Profundidad terminada del fuelle', depth, edgeLength(strip, strip.edges[1])));
    r.steps.push({ id: 'fuelle', title: 'Une el fuelle al bolsillo', detail: 'Haz los dobladillos dobles de 1 cm en los extremos cortos del fuelle. Une su borde largo superior al costado, fondo y otro costado del bolsillo, derecho con derecho. Los piquetes corresponden a las dos esquinas inferiores; detén la aguja en la esquina y gira. Haz piquetes solo en el margen para acomodar el giro.', pieces: ['bolsillo', 'fuelle'], seams: ['fuelle-bolsillo'] }, { id: 'colocar', title: 'Fija el bolsillo con volumen', detail: 'Plancha hacia dentro el margen largo libre del fuelle. Hilvana ese borde formando la U sobre la prenda, conservando la profundidad y la boca abierta. Pespuntea sin atrapar la espalda o el forro. Refuerza los dos extremos superiores.', pieces: ['bolsillo', 'fuelle'] });
  } else {
    r.steps.push({ id: 'colocar', title: 'Coloca el bolsillo', detail: 'Plancha los márgenes de costados y fondo hacia dentro por la línea de costura. Hilvana y cose esos tres lados sobre la prenda; deja la boca libre. Refuerza las dos esquinas superiores y no atrapes el reverso de la prenda.', pieces: ['bolsillo'] });
  }
  if (kind === 'bolsillo-tapa') {
    const flap = rect('tapa', 'Cara de la tapa del bolsillo', w, flapHeight, sa, 2 * qty);
    flap.marks.push({ id: 'broche', kind: 'boton', at: { x: w / 2, y: flapHeight * .6 }, label: 'Broche: comprobar con la prenda' });
    r.pieces.push(flap);
    r.seams.push(equal('tapa-caras', 'Dos caras de cada tapa', flap, ['derecho', 'inferior', 'izquierdo'], flap, ['derecho', 'inferior', 'izquierdo']));
    r.checks.push(check('tapa', 'Ancho de tapa y bolsillo', w, edgeLength(flap, flap.edges[0])));
    r.materials.push({ id: 'broches', label: 'Broches de presión compatibles con el espesor', qty: `${qty} juegos`, note: 'Refuerza con entretela las zonas de los broches.' });
    r.steps.push({ id: 'tapa', title: 'Confecciona y fija la tapa', detail: 'Une dos caras derecho con derecho por costados y borde inferior; deja el superior abierto. Rebaja esquinas, voltea y plancha. Dobla los márgenes superiores al interior. Coloca la tapa 1 cm por encima de la boca del bolsillo y cose el borde superior con dos pespuntes. Transfiere el broche al bolsillo después de comprobar el cierre.', pieces: ['bolsillo', 'tapa'], seams: ['tapa-caras'] });
  }
  r.steps[0].pieces = r.steps[1].pieces = r.pieces.map(piece => piece.id);
  return r;
}

function generate(kind: TransformationConstruction, p: Params): GeneratorResult {
  if (kind.startsWith('bolsillo')) return pocket(p, kind);
  const w = num(p, 'ancho', 100), h = num(p, 'largo', 300), sa = num(p, 'margen', 10), qty = counts(p);
  if (kind === 'panel') {
    const panel = rect('panel', 'Panel rectangular de sustitución', w, h, sa, qty);
    const r = base([panel]);
    r.checks.push(check('ancho', 'Ancho de la ventana terminada', w, edgeLength(panel, panel.edges[0])), check('largo', 'Largo de la ventana terminada', h, edgeLength(panel, panel.edges[1])));
    r.assumptions.push('Panel que sustituye una ventana rectangular sin alterar la talla. No es una ampliación del contorno ni un molde para curvas de cadera.', 'El rectángulo debe caber íntegro en una zona que se pueda aplanar, fuera de cintura, tiro, sisas y bolsillos. Si necesita curvas, traza esa zona de la prenda por separado.');
    r.steps.push({ id: 'ventana', title: 'Marca la ventana y reserva sus márgenes', detail: `Dibuja sobre la prenda un rectángulo de ${cm(w)} × ${cm(h)}: será la línea de unión. Dibuja otro ${cm(sa)} hacia dentro de sus cuatro lados. Solo después de comprobar ambas unidades, corta por el rectángulo interior. Haz un corte diagonal en cada esquina interior hasta quedar a 1 mm del vértice de la línea de unión; no rebases ese vértice.`, pieces: ['panel'] }, { id: 'unir', title: 'Inserta el panel por tramos', detail: 'Une el panel y la prenda derecho con derecho, alineando las líneas de costura. Cose cada lado entre vértices y aparta los demás márgenes al girar. Comprueba que no haya pliegues ni tensión. Refuerza las esquinas, remata juntos los márgenes y plancha. Haz un pespunte exterior si la tela lo permite.', pieces: ['panel'] });
    if (Math.min(w, h) <= 2 * sa + 5) r.notices.push({ level: 'error', code: 'transform-panel-margen', message: 'La ventana necesita más de dos márgenes de ancho y de largo para reservar tela al recortar.' });
    return r;
  }
  if (kind === 'cuna') {
    const opening = num(p, 'abertura', 300), increase = num(p, 'aumento', 180), height = Math.sqrt(Math.max(1, opening * opening - increase * increase / 4));
    const triangle: Piece = { ...rect('cuna', 'Cuña de amplitud', increase, height, sa, qty), nodes: [{ id: 'a', x: increase / 2, y: 0 }, { id: 'b', x: increase, y: height }, { id: 'c', x: 0, y: height }], edges: [{ id: 'derecho', label: 'Unión derecha con abertura', from: 'a', to: 'b', kind: 'line', allowance: sa, finish: 'costura' }, { id: 'bajo', label: 'Dobladillo doble', from: 'b', to: 'c', kind: 'line', allowance: 20, finish: 'dobladillo' }, { id: 'izquierdo', label: 'Unión izquierda con abertura', from: 'c', to: 'a', kind: 'line', allowance: sa, finish: 'costura' }] };
    const r = base([triangle]);
    triangle.notches.push({ id: 'medio-der', edgeId: 'derecho', s: opening / 2, count: 1 }, { id: 'medio-izq', edgeId: 'izquierdo', s: opening / 2, count: 1 });
    r.checks.push(check('derecho', 'Costura derecha igual al largo de abertura', opening, edgeLength(triangle, triangle.edges[0])), check('izquierdo', 'Costura izquierda igual al largo de abertura', opening, edgeLength(triangle, triangle.edges[2])), check('amplitud', 'Amplitud añadida por cuña en el bajo', increase, edgeLength(triangle, triangle.edges[1])));
    r.assumptions.push('El largo de abertura corresponde a CADA costura inclinada, no a la altura vertical de la cuña. El motor resuelve la altura para que las costuras coincidan.', `Cada abertura añadirá ${cm(increase)} al contorno del bajo. El dobladillo final debe revisarse sobre la prenda puesta; el patrón no corrige la caída del tejido.`);
    r.steps.push({ id: 'abrir', title: 'Abre y prepara la costura', detail: `Descose el dobladillo y abre una costura existente ${cm(opening)} desde su línea de bajo terminada. Conserva márgenes suficientes; marca el punto superior y la mitad de cada lado. Si haces una abertura nueva, reserva el margen y refuerza la punta con una pequeña pieza de entretela antes de cortar.`, pieces: ['cuna'] }, { id: 'cuña', title: 'Cose desde la punta hacia el bajo', detail: 'Coloca derecho con derecho y une cada lado de la cuña con su lado de abertura, de la punta hacia abajo. Empareja las marcas de mitad sin estirar. Remata la punta, remata márgenes y prueba la prenda; nivela el bajo solo después de comprobar la caída.', pieces: ['cuna'] }, { id: 'dobladillo', title: 'Termina el bajo', detail: 'Dobla 1 cm y otra vez 1 cm en el bajo de la cuña. Reconstruye el dobladillo de la prenda sin coser pliegues ni estirar las uniones.', pieces: ['cuna'] });
    if (increase >= opening * 1.8) r.notices.push({ level: 'error', code: 'transform-cuna-ancha', message: 'El aumento del bajo debe ser menor a 1.8 veces el largo de la abertura para formar una cuña útil.' });
    return r;
  }
  if (kind === 'volante') {
    const target = num(p, 'recorrido', 800), height = num(p, 'alto', 120), fullness = num(p, 'frunce', 1.7), closed = str(p, 'cerrado', 'no') === 'si';
    const strip = rect('volante', 'Tira del volante antes de fruncir', target * fullness, height, sa, qty);
    strip.edges[2] = { ...strip.edges[2], finish: 'dobladillo', allowance: 12, label: 'Dobladillo doble de 6 mm' };
    if (!closed) for (const index of [1, 3]) strip.edges[index] = { ...strip.edges[index], finish: 'dobladillo', allowance: 12 };
    for (let n = 1; n <= 3; n++) strip.notches.push({ id: `cuarto-${n}`, edgeId: 'superior', s: target * fullness * n / 4, count: 1, label: `Cuarto ${n}` });
    const r = base([strip]);
    r.checks.push(check('recorrido', 'Largo de unión después del frunce', target, edgeLength(strip, strip.edges[0]) / fullness), check('alto', 'Altura terminada del volante', height, edgeLength(strip, strip.edges[1])));
    if (closed) r.seams.push(equal('aro-volante', 'Cierre del aro de volante', strip, ['derecho'], strip, ['izquierdo']));
    r.assumptions.push(`Fruncido de ${fullness}:1; ajusta a ${cm(target)} exactos antes de coser. ${closed ? 'Volante cerrado en aro.' : 'Volante abierto, con los extremos cortos terminados.'} Una tira muy larga puede empalmarse con costuras adicionales: añade el margen en cada nuevo corte.`);
    r.steps.push({ id: 'bordes', title: 'Prepara los bordes', detail: closed ? 'Cierra cada tira como aro uniendo los extremos cortos derecho con derecho. Remata esa unión y haz el dobladillo inferior de 6 mm + 6 mm.' : 'Haz dobladillos de 6 mm + 6 mm en ambos extremos cortos y el borde inferior, plegando limpiamente las esquinas.', pieces: ['volante'], seams: closed ? ['aro-volante'] : undefined }, { id: 'fruncir', title: 'Frunce y distribuye por cuartos', detail: `Pasa dos pespuntes largos dentro del margen superior. Marca también cuatro partes iguales en la prenda. Tira de los hilos hasta que la tira mida ${cm(target)}, alinea cuartos y distribuye los frunces.`, pieces: ['volante'] }, { id: 'unir', title: 'Une el volante', detail: 'Hilvana derecho con derecho por la línea elegida, comprueba ambos extremos o el cierre del aro y cose sin atrapar otra capa de la prenda. Retira los hilos visibles y remata el margen.', pieces: ['volante'] });
    return r;
  }
  if (kind === 'puno' || kind === 'banda') {
    const target = num(p, 'recorrido', 400), height = num(p, 'alto', 60), ratio = kind === 'puno' ? num(p, 'reduccion', .85) : 1, circumference = target * ratio;
    const strip = rect('banda', kind === 'puno' ? 'Puño de punto doble' : 'Banda doble de prolongación', circumference, 2 * height, sa, qty, kind === 'puno' ? 'punto-elastico' : 'contraste');
    strip.lines.push({ id: 'doblez', kind: 'doblez', a: { x: 0, y: height }, b: { x: circumference, y: height }, label: 'Doblar: borde exterior terminado' });
    for (let n = 1; n <= 3; n++) strip.notches.push({ id: `cuarto-${n}`, edgeId: 'superior', s: circumference * n / 4, count: 1, label: `Cuarto ${n}` });
    const r = base([strip]);
    r.seams.push(equal('cerrar-banda', 'Cierre de la banda en aro', strip, ['derecho'], strip, ['izquierdo']));
    r.checks.push(check('altura', 'Altura terminada de la banda doblada', height, edgeLength(strip, strip.edges[1]) / 2), check('contorno', 'Contorno en reposo de la banda', circumference, edgeLength(strip, strip.edges[0])));
    r.assumptions.push(kind === 'puno' ? `El puño mide ${cm(circumference)} en reposo y se estira para unir a ${cm(target)}. La tela debe estirar al menos ${Math.ceil((1 / ratio - 1) * 100)} % y recuperar su forma. Prueba que la mano pase antes de coser.` : 'La banda mantiene el contorno medido: sin frunces ni elasticidad descontada. Solo funciona sobre una abertura cerrada y de borde casi recto, no en una chaqueta con cierre abierto.');
    r.steps.push({ id: 'aro', title: 'Forma el aro y dóblalo', detail: 'Cose los extremos cortos derecho con derecho. Abre la costura y dobla por la mitad de la altura, revés con revés, haciendo coincidir los bordes largos. Marca sus cuatro cuartos.', pieces: ['banda'], seams: ['cerrar-banda'] }, { id: 'montar', title: kind === 'puno' ? 'Monta el puño por cuartos' : 'Monta la banda sin estirar', detail: `${kind === 'puno' ? 'Prueba que la mano pase por el aro. ' : ''}Descose el acabado anterior y mide de nuevo el contorno de unión. Empareja cuartos y cose ambas capas de la banda con el derecho de la prenda. ${kind === 'puno' ? 'Estira solamente el puño entre las marcas, sin estirar la manga; usa una puntada elástica.' : 'No estires ni frunzas ninguna capa.'} Remata el margen hacia el interior.`, pieces: ['banda'] });
    return r;
  }
  if (kind === 'parche') {
    const outer = rect('parche', 'Cara visible del parche', w, h, sa, qty), lining = rect('reverso', 'Reverso del parche', w, h, sa, qty, 'forro');
    const r = base([outer, lining]);
    r.seams.push(equal('capas', 'Contorno de las dos capas del parche', outer, outer.edges.map(e => e.id), lining, lining.edges.map(e => e.id)));
    r.checks.push(check('ancho', 'Ancho terminado del parche', w, edgeLength(outer, outer.edges[0])), check('alto', 'Alto terminado del parche', h, edgeLength(outer, outer.edges[1])));
    r.assumptions.push('Parche rectangular plano con reverso fino. Para una reparación, debe solaparse sobre tela sana alrededor de toda la zona desgastada.');
    r.steps.push({ id: 'capas', title: 'Confecciona el parche', detail: 'Cose las dos caras derecho con derecho dejando una abertura para voltear. Rebaja las esquinas, voltea y plancha. Cierra la abertura con puntada invisible.', pieces: ['parche', 'reverso'], seams: ['capas'] }, { id: 'fijar', title: 'Aplica el parche', detail: 'Hilvana sobre la prenda extendida sin tensión y comprueba la movilidad con la prenda puesta. Pespuntea el contorno sin atrapar el reverso o forro de la prenda. En tejido de punto, estabiliza antes de coser.', pieces: ['parche'] });
    return r;
  }
  const strip = rect('trabilla', 'Tira tubular para trabilla', h, 2 * w, sa, qty);
  strip.lines.push({ id: 'mitad', kind: 'doblez', a: { x: 0, y: w }, b: { x: h, y: w }, label: 'Doblar a lo largo' });
  strip.lines.push({ id: 'sujecion-a', kind: 'colocacion', a: { x: 20, y: 0 }, b: { x: 20, y: 2 * w }, label: '20 mm de sujeción' }, { id: 'sujecion-b', kind: 'colocacion', a: { x: h - 20, y: 0 }, b: { x: h - 20, y: 2 * w }, label: '20 mm de sujeción' });
  const r = base([strip]);
  r.seams.push(equal('tubo', 'Costura longitudinal de la trabilla', strip, ['superior'], strip, ['inferior']));
  r.checks.push(check('ancho', 'Ancho terminado de la trabilla', w, edgeLength(strip, strip.edges[1]) / 2), check('libre', 'Largo libre descontando dos sujeciones de 2 cm', h - 40, edgeLength(strip, strip.edges[0]) - 40));
  r.assumptions.push('El largo incluye 2 cm de apoyo en cada extremo. Trabilla para objetos ligeros; no es un punto de seguridad ni sirve para suspender cargas.');
  r.materials.push({ id: 'refuerzo', label: 'Retazo de refuerzo para el reverso de la prenda', qty: `${qty * 2} piezas que cubran las zonas de sujeción` });
  r.steps.push({ id: 'tubo', title: 'Cose la tira como tubo', detail: 'Dobla longitudinalmente derecho con derecho. Cose el borde largo dejando una abertura central para voltear; cose los extremos cortos. Rebaja, voltea, plancha y cierra la abertura.', pieces: ['trabilla'], seams: ['tubo'] }, { id: 'fijar', title: 'Fija los dos extremos', detail: 'Coloca un refuerzo al reverso de cada apoyo. Superpón 2 cm de cada extremo sobre tela sana y cose una caja con cruz en cada apoyo. Comprueba el paso del objeto y la resistencia con poca carga.', pieces: ['trabilla'] });
  return r;
}

const dimensions: Record<TransformationConstruction, ParamDef[]> = {
  panel: [length('ancho', 'Ancho visible del panel', 35, 500, 'Ancho de la ventana, sin márgenes.'), length('largo', 'Largo visible del panel', 60, 1400)],
  cuna: [length('abertura', 'Largo de cada lado de la abertura', 80, 900, 'Mide desde la punta hasta la línea del bajo, siguiendo la costura.'), length('aumento', 'Amplitud que añade cada cuña en el bajo', 30, 900)],
  volante: [length('recorrido', 'Recorrido de unión en la prenda', 100, 4000, 'Por unidad; en un aro, mide todo el contorno.'), length('alto', 'Alto terminado del volante', 25, 400), { key: 'frunce', label: 'Frunce (largo de tela / recorrido)', group: 'diseno', type: 'ratio', min: 1.2, max: 3 }, { key: 'cerrado', label: 'Forma de unión', group: 'diseno', type: 'choice', choices: [{ value: 'no', label: 'Abierta, con dos extremos' }, { value: 'si', label: 'Cerrada en aro' }] }],
  puno: [length('recorrido', 'Contorno de la boca de una manga', 100, 700), length('alto', 'Alto del puño terminado', 25, 200), { key: 'reduccion', label: 'Proporción del canalé en reposo', help: '0.85 significa 85 % de la abertura; prueba el paso de la mano.', group: 'diseno', type: 'ratio', min: .7, max: 1 }],
  bolsillo: [length('ancho', 'Ancho útil del bolsillo', 50, 500), length('largo', 'Alto útil del bolsillo', 60, 500)],
  'bolsillo-tapa': [length('ancho', 'Ancho útil del bolsillo', 60, 500), length('largo', 'Alto útil del bolsillo', 80, 500), length('tapa', 'Alto terminado de la tapa', 30, 140)],
  'bolsillo-fuelle': [length('ancho', 'Ancho útil del bolsillo', 70, 500), length('largo', 'Alto útil del bolsillo', 80, 500), length('profundidad', 'Profundidad del fuelle', 15, 100)],
  parche: [length('ancho', 'Ancho terminado del parche', 50, 600), length('largo', 'Alto terminado del parche', 50, 800)],
  trabilla: [length('ancho', 'Ancho terminado de la trabilla', 15, 60), length('largo', 'Largo total, incluidas las sujeciones', 70, 400, 'Se reservan 2 cm en cada extremo; el resto queda libre.')],
  banda: [length('recorrido', 'Contorno de unión en la prenda', 150, 4000, 'Mide el contorno completo, no el ancho en plano.'), length('alto', 'Largo que añade la banda', 25, 300)]
};
const defaults: Record<TransformationConstruction, Params> = {
  panel: { ancho: 100, largo: 650 }, cuna: { abertura: 300, aumento: 180 }, volante: { recorrido: 800, alto: 120, frunce: 1.7, cerrado: 'no' }, puno: { recorrido: 260, alto: 65, reduccion: .85 },
  bolsillo: { ancho: 160, largo: 190 }, 'bolsillo-tapa': { ancho: 160, largo: 190, tapa: 55 }, 'bolsillo-fuelle': { ancho: 160, largo: 190, profundidad: 35 }, parche: { ancho: 130, largo: 160 }, trabilla: { ancho: 25, largo: 160 }, banda: { recorrido: 900, alto: 90 }
};
export const transformationGeneratorId = (construction: TransformationConstruction) => `transform-${construction}`;
export const TRANSFORMATION_CONTEXT: GeneratorContext = { body: {}, kind: 'mujer', fabric: 'plano', stretch: 0, fit: 'regular' };
export const TRANSFORMATION_GENERATORS: PatternGenerator[] = (Object.keys(dimensions) as TransformationConstruction[]).map(kind => {
  const params = [...dimensions[kind], quantity, margin];
  return { id: transformationGeneratorId(kind), name: `${TRANSFORMATION_CONSTRUCTIONS[kind]} para una prenda existente`, summary: 'Piezas añadidas, calculadas con medidas tomadas sobre la prenda. La base no está incluida.', status: 'experimental', requiredMeasures: [], optionalMeasures: [], params,
    defaults: () => ({ ...defaults[kind], cantidad: '1', margen: 10 }),
    generate: (_ctx, raw) => {
      const p: Params = { ...defaults[kind], cantidad: '1', margen: 10, ...raw };
      const issues: Issue[] = [];
      for (const def of params) {
        const value = p[def.key];
        const valid = def.type === 'choice' ? def.choices!.some(option => option.value === String(value)) : typeof value === 'number' && Number.isFinite(value) && value >= (def.min ?? -Infinity) && value <= (def.max ?? Infinity);
        if (!valid) issues.push({ level: 'error', code: `transform-medida-${def.key}`, message: `Revisa «${def.label}»: ${def.type === 'choice' ? 'elige una opción válida.' : `debe estar entre ${def.type === 'length' ? cm(def.min!) : def.min} y ${def.type === 'length' ? cm(def.max!) : def.max}.`}` });
      }
      // Invalid inputs never reach offset geometry; the visible errors block PDF export.
      if (issues.length) return { ...base([]), notices: issues };
      const result = generate(kind, p);
      return { ...result, notices: [...result.notices, ...issues] };
    }
  };
});
