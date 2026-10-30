import { formatLength } from '../../units';
import type { Piece } from '../types';
import { GeneratorContext, GeneratorResult, Params, PatternGenerator, num, round1 } from '../generator';

export function beanieDefaults(ctx: GeneratorContext): Params {
  const H = ctx.body.cabeza ?? 480;
  return { reduccion: 0.1, alto: round1(H * 0.42), doblez: round1(H * 0.11), margen: 6 };
}

export function generateBeanie(ctx: GeneratorContext, P: Params): GeneratorResult {
  const H = ctx.body.cabeza!;
  const red = num(P, 'reduccion', 0.1);
  const crownH = num(P, 'alto');
  const brim = num(P, 'doblez');
  const SA = num(P, 'margen', 6);
  // Holgura negativa: el punto se estira para ajustar.
  const C = H * (1 - red);
  const w = C / 2;
  const domeH = w * 0.42;
  const total = crownH + brim * 2;
  const k = 0.5523;
  const piece: Piece = {
    id: 'gorro',
    name: 'Gorro',
    source: 'generada',
    nodes: [
      { id: 'bajo-izq', x: 0, y: total },
      { id: 'lado-izq', x: 0, y: domeH },
      { id: 'cima', x: w / 2, y: 0 },
      { id: 'lado-der', x: w, y: domeH },
      { id: 'bajo-der', x: w, y: total }
    ],
    edges: [
      { id: 'costado-izq', label: 'Costado', from: 'bajo-izq', to: 'lado-izq', kind: 'line', allowance: SA, finish: 'costura' },
      { id: 'copa-izq', label: 'Copa', from: 'lado-izq', to: 'cima', kind: 'cubic', c1: { x: 0, y: domeH * (1 - k) }, c2: { x: (w / 2) * (1 - k), y: 0 }, allowance: SA, finish: 'costura' },
      { id: 'copa-der', label: 'Copa', from: 'cima', to: 'lado-der', kind: 'cubic', c1: { x: w / 2 + (w / 2) * k, y: 0 }, c2: { x: w, y: domeH * (1 - k) }, allowance: SA, finish: 'costura' },
      { id: 'costado-der', label: 'Costado', from: 'lado-der', to: 'bajo-der', kind: 'line', allowance: SA, finish: 'costura' },
      { id: 'borde', label: 'Borde del doblez', from: 'bajo-der', to: 'bajo-izq', kind: 'line', allowance: 0, finish: 'orillo' }
    ],
    grain: { a: { x: w / 2, y: domeH + 10 }, b: { x: w / 2, y: total - 10 } },
    cut: { qty: 2, mirrorPairs: false, onFold: false, fabric: 'punto-elastico' },
    notches: [],
    lines: [{ id: 'doblez', kind: 'doblez', a: { x: 0, y: total - brim }, b: { x: w, y: total - brim }, label: 'Doblez del borde' }],
    marks: [],
    notes: ['La elasticidad del tejido va a lo ancho (alrededor de la cabeza).']
  };
  return {
    pieces: [piece],
    seams: [{ id: 'costados', label: 'Costados y copa: delantera con trasera', kind: 'igual', a: [{ pieceId: 'gorro', edgeIds: ['costado-izq', 'copa-izq'] }], b: [{ pieceId: 'gorro', edgeIds: ['costado-der', 'copa-der'] }], ratioMin: 0.99, ratioMax: 1.01, tolerance: 0.5 }],
    checks: [{ key: 'cabeza', label: 'Contorno del gorro', body: H, ease: -H * red, target: C, measured: 2 * w, tolerance: 0.5 }],
    materials: [{ id: 'punto', label: 'Punto elástico (rib o jersey con elastano)', qty: `2 piezas de ${formatLength(w + 2 * SA, 'cm')} × ${formatLength(total + SA, 'cm')}` }],
    assumptions: [`Holgura negativa del ${Math.round(red * 100)} %: el gorro mide ${formatLength(C, 'cm')} para una cabeza de ${formatLength(H, 'cm')}.`, 'El alto se estima como proporción del contorno de cabeza: compruébalo con una muestra.', 'Propuesta experimental.'],
    steps: [
      { id: 'cortar', title: 'Corta dos piezas', detail: 'Con la elasticidad a lo ancho.', pieces: ['gorro'] },
      { id: 'coser', title: 'Une las piezas', detail: 'Derecho con derecho, cose costados y copa con puntada elástica o remalle.', pieces: ['gorro'] },
      { id: 'doblez', title: 'Dobla el borde', detail: 'Dobla hacia afuera por la línea de doblez. El borde del tejido de punto no se deshilacha.', pieces: ['gorro'] }
    ],
    notices: ctx.fabric !== 'punto' ? [{ level: 'aviso', code: 'gorro-punto', message: 'Este gorro necesita tejido de punto elástico.' }] : []
  };
}

export const beanieGenerator: PatternGenerator = {
  id: 'gorro',
  name: 'Gorro de punto',
  summary: 'Gorro de dos piezas con copa redondeada y doblez, con holgura negativa.',
  status: 'experimental',
  requiredMeasures: ['cabeza'],
  optionalMeasures: [],
  params: [
    { key: 'alto', label: 'Alto de la copa', group: 'diseno', type: 'length', min: 80, max: 400 },
    { key: 'doblez', label: 'Alto del doblez', group: 'diseno', type: 'length', min: 0, max: 120 },
    { key: 'reduccion', label: 'Reducción por elasticidad', group: 'holgura', type: 'ratio', min: 0, max: 0.25 },
    { key: 'margen', label: 'Margen de costura', group: 'margenes', type: 'length', min: 3, max: 15 }
  ],
  defaults: beanieDefaults,
  generate: generateBeanie
};
