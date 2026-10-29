import { formatLength } from '../../units';
import type { Piece, SeamRelation } from '../types';
import { GeneratorContext, GeneratorResult, Params, PatternGenerator, num, str } from '../generator';

export function toteDefaults(_ctx: GeneratorContext): Params {
  return { ancho: 380, alto: 400, fondo: 100, largoAsa: 600, anchoAsa: 30, forro: 'si', margen: 10, dobladilloBoca: 30 };
}

function body(id: string, name: string, W: number, H: number, D: number, SA: number, topA: number, topFinish: 'costura' | 'dobladillo', fabric: Piece['cut']['fabric']): Piece {
  const c = D / 2;
  return {
    id,
    name,
    source: 'generada',
    nodes: [
      { id: 'boca-izq', x: 0, y: 0 },
      { id: 'boca-der', x: W, y: 0 },
      { id: 'lat-der', x: W, y: H - c },
      { id: 'esq-der', x: W - c, y: H - c },
      { id: 'fondo-der', x: W - c, y: H },
      { id: 'fondo-izq', x: c, y: H },
      { id: 'esq-izq', x: c, y: H - c },
      { id: 'lat-izq', x: 0, y: H - c }
    ],
    edges: [
      { id: 'boca', label: 'Boca', from: 'boca-izq', to: 'boca-der', kind: 'line', allowance: topA, finish: topFinish },
      { id: 'lateral-der', label: 'Costado derecho', from: 'boca-der', to: 'lat-der', kind: 'line', allowance: SA, finish: 'costura' },
      { id: 'base-der-a', label: 'Base de esquina (costado)', from: 'lat-der', to: 'esq-der', kind: 'line', allowance: SA, finish: 'costura' },
      { id: 'base-der-b', label: 'Base de esquina (fondo)', from: 'esq-der', to: 'fondo-der', kind: 'line', allowance: SA, finish: 'costura' },
      { id: 'fondo', label: 'Fondo', from: 'fondo-der', to: 'fondo-izq', kind: 'line', allowance: SA, finish: 'costura' },
      { id: 'base-izq-b', label: 'Base de esquina (fondo)', from: 'fondo-izq', to: 'esq-izq', kind: 'line', allowance: SA, finish: 'costura' },
      { id: 'base-izq-a', label: 'Base de esquina (costado)', from: 'esq-izq', to: 'lat-izq', kind: 'line', allowance: SA, finish: 'costura' },
      { id: 'lateral-izq', label: 'Costado izquierdo', from: 'lat-izq', to: 'boca-izq', kind: 'line', allowance: SA, finish: 'costura' }
    ],
    grain: { a: { x: W / 2, y: H * 0.15 }, b: { x: W / 2, y: H * 0.7 } },
    cut: { qty: 2, mirrorPairs: false, onFold: false, fabric },
    notches: [{ id: 'boca-mitad', edgeId: 'boca', s: W / 2, count: 1, label: 'Centro' }],
    lines: [],
    marks: []
  };
}

export function generateTote(_ctx: GeneratorContext, P: Params): GeneratorResult {
  const W = num(P, 'ancho', 380);
  const H = num(P, 'alto', 400);
  const D = num(P, 'fondo', 100);
  const SA = num(P, 'margen', 10);
  const lining = str(P, 'forro', 'si') === 'si';
  const strapL = num(P, 'largoAsa', 600);
  const strapW = num(P, 'anchoAsa', 30);
  const hemTop = num(P, 'dobladilloBoca', 30);
  const outer = body('exterior', 'Exterior', W, H, D, SA, lining ? SA : hemTop, lining ? 'costura' : 'dobladillo', 'principal');
  // Ubicación de las asas.
  for (const x of [W * 0.28, W * 0.72]) {
    outer.lines.push({ id: `asa-${Math.round(x)}`, kind: 'colocacion', a: { x: x - strapW / 2, y: 0 }, b: { x: x - strapW / 2, y: 40 }, label: 'Asa' });
    outer.lines.push({ id: `asa2-${Math.round(x)}`, kind: 'colocacion', a: { x: x + strapW / 2, y: 0 }, b: { x: x + strapW / 2, y: 40 } });
  }
  const pieces: Piece[] = [outer];
  if (lining) pieces.push(body('forro', 'Forro', W, H, D, SA, SA, 'costura', 'forro'));
  const sw = strapW * 4;
  pieces.push({
    id: 'asa',
    name: 'Asa',
    source: 'generada',
    nodes: [
      { id: 'a', x: 0, y: 0 },
      { id: 'b', x: sw, y: 0 },
      { id: 'c', x: sw, y: strapL },
      { id: 'd', x: 0, y: strapL }
    ],
    edges: [
      { id: 'extremo-1', label: 'Extremo', from: 'a', to: 'b', kind: 'line', allowance: SA, finish: 'costura' },
      { id: 'canto-1', label: 'Canto doblado', from: 'b', to: 'c', kind: 'line', allowance: 0, finish: 'sin-margen' },
      { id: 'extremo-2', label: 'Extremo', from: 'c', to: 'd', kind: 'line', allowance: SA, finish: 'costura' },
      { id: 'canto-2', label: 'Canto doblado', from: 'd', to: 'a', kind: 'line', allowance: 0, finish: 'sin-margen' }
    ],
    grain: { a: { x: sw / 2, y: strapL * 0.2 }, b: { x: sw / 2, y: strapL * 0.8 } },
    cut: { qty: 2, mirrorPairs: false, onFold: false, fabric: 'principal' },
    notches: [],
    lines: [
      { id: 'd1', kind: 'doblez', a: { x: sw / 4, y: 0 }, b: { x: sw / 4, y: strapL } },
      { id: 'd2', kind: 'doblez', a: { x: sw / 2, y: 0 }, b: { x: sw / 2, y: strapL }, label: 'Doblar en cuatro' },
      { id: 'd3', kind: 'doblez', a: { x: (3 * sw) / 4, y: 0 }, b: { x: (3 * sw) / 4, y: strapL } }
    ],
    marks: [],
    notes: ['Dobla los cantos al centro y luego a la mitad; pespuntea ambos lados.']
  });

  const seams: SeamRelation[] = [
    { id: 'costados', label: 'Costados del exterior', kind: 'igual', a: [{ pieceId: 'exterior', edgeIds: ['lateral-der'] }], b: [{ pieceId: 'exterior', edgeIds: ['lateral-izq'] }], ratioMin: 0.99, ratioMax: 1.01, tolerance: 0.5 },
    {
      id: 'base',
      label: 'Base en caja del exterior',
      kind: 'igual',
      a: [{ pieceId: 'exterior', edgeIds: ['base-der-a'], factor: 2 }],
      b: [{ pieceId: 'exterior', edgeIds: ['base-der-b'], factor: 2 }],
      ratioMin: 0.99,
      ratioMax: 1.01,
      tolerance: 0.5
    }
  ];
  if (lining) seams.push({ id: 'boca-forro', label: 'Boca: exterior con forro', kind: 'igual', a: [{ pieceId: 'exterior', edgeIds: ['boca'] }], b: [{ pieceId: 'forro', edgeIds: ['boca'] }], ratioMin: 0.99, ratioMax: 1.01, tolerance: 0.5 });

  const steps = [
    { id: 'cortar', title: 'Corta las piezas', detail: pieces.map((p) => `${p.name}: ${p.cut.qty}`).join('; ') + '.', pieces: pieces.map((p) => p.id) },
    { id: 'asas', title: 'Prepara las asas', detail: `Dobla cada asa en cuatro a lo largo hasta ${formatLength(strapW, 'cm')} de ancho y pespuntea ambos cantos.`, pieces: ['asa'] },
    { id: 'exterior', title: 'Cose el exterior', detail: 'Une las dos piezas exteriores por costados y fondo. Abre las esquinas, haz coincidir costura de costado con la del fondo y cose la base en caja.', pieces: ['exterior'], seams: ['costados', 'base'] },
    lining
      ? { id: 'forro', title: 'Cose el forro y únelo', detail: 'Repite con el forro dejando 12 cm abiertos en el fondo. Hilvana las asas en las marcas, une exterior y forro por la boca, voltea por la abertura y ciérrala.', pieces: ['forro', 'asa', 'exterior'], seams: ['boca-forro'] }
      : { id: 'boca', title: 'Haz el dobladillo de la boca', detail: `Dobla 1 cm y luego el resto hasta ${formatLength(hemTop, 'cm')}; mete los extremos de las asas en las marcas y cose.`, pieces: ['exterior', 'asa'] }
  ];

  return {
    pieces,
    seams,
    checks: [
      { key: 'ancho', label: 'Ancho de la boca', target: W, measured: W, tolerance: 0.5 },
      { key: 'fondo', label: 'Fondo en caja', target: D, measured: D, tolerance: 0.5 }
    ],
    materials: [
      { id: 'hilo', label: 'Hilo de coser', qty: '1 carrete' },
      ...(lining ? [{ id: 'forro', label: 'Tela de forro', qty: 'Ver estimación de tela' }] : []),
      { id: 'entretela', label: 'Entretela (opcional)', qty: 'Para dar cuerpo al exterior' }
    ],
    assumptions: [
      `Bolsa terminada: ${formatLength(W, 'cm')} de ancho, ${formatLength(H - D / 2, 'cm')} de alto y ${formatLength(D, 'cm')} de fondo.`,
      'Las esquinas recortadas forman la base en caja; miden la mitad del fondo sobre la línea de costura.'
    ],
    steps,
    notices: []
  };
}

export const toteGenerator: PatternGenerator = {
  id: 'bolsa-tote',
  name: 'Bolsa tote con base en caja',
  summary: 'Bolsa con fondo en caja, asas dobladas en cuatro y forro opcional.',
  status: 'implementado',
  requiredMeasures: [],
  optionalMeasures: [],
  params: [
    { key: 'ancho', label: 'Ancho', group: 'diseno', type: 'length', min: 100, max: 800 },
    { key: 'alto', label: 'Alto de la pieza (incluye media base)', group: 'diseno', type: 'length', min: 100, max: 800 },
    { key: 'fondo', label: 'Fondo de la base', group: 'diseno', type: 'length', min: 0, max: 300 },
    { key: 'largoAsa', label: 'Largo del asa', group: 'diseno', type: 'length', min: 150, max: 1400 },
    { key: 'anchoAsa', label: 'Ancho del asa terminada', group: 'diseno', type: 'length', min: 10, max: 80 },
    { key: 'forro', label: 'Forro', group: 'diseno', type: 'choice', choices: [{ value: 'si', label: 'Con forro' }, { value: 'no', label: 'Sin forro' }] },
    { key: 'margen', label: 'Margen de costura', group: 'margenes', type: 'length', min: 0, max: 30 },
    { key: 'dobladilloBoca', label: 'Dobladillo de la boca', group: 'margenes', type: 'length', min: 0, max: 80, when: (p) => p.forro === 'no' }
  ],
  defaults: toteDefaults,
  generate: generateTote
};
