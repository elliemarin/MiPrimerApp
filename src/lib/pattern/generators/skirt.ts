import { formatLength } from '../../units';
import type { Issue, Piece, SeamRelation } from '../types';
import { GeneratorContext, GeneratorResult, Params, PatternGenerator, isChild, num, round1 } from '../generator';

export function skirtDefaults(ctx: GeneratorContext): Params {
  const child = isChild(ctx.kind);
  const b = ctx.body;
  const waistToKnee = b.tiro && b.entrepierna ? (b.tiro + b.entrepierna) * 0.55 : 500;
  return {
    largo: round1(waistToKnee),
    amplitud: child ? 1.8 : 1.6,
    anchoElastico: ctx.kind === 'bebe' ? 15 : child ? 20 : 25,
    proporcionElastico: ctx.kind === 'bebe' ? 0.95 : child ? 0.92 : 0.9,
    margen: 10,
    dobladillo: child ? 25 : 30,
    anchoTela: 1400
  };
}

function panel(id: string, name: string, halfW: number, L: number, SA: number, casingA: number, hemA: number, casingDepth: number): Piece {
  return {
    id,
    name,
    source: 'generada',
    nodes: [
      { id: 'cintura-centro', x: 0, y: 0 },
      { id: 'cintura-lateral', x: halfW, y: 0 },
      { id: 'bajo-lateral', x: halfW, y: L },
      { id: 'bajo-centro', x: 0, y: L }
    ],
    edges: [
      { id: 'cintura', label: 'Cintura (jareta)', from: 'cintura-centro', to: 'cintura-lateral', kind: 'line', allowance: casingA, finish: 'jareta' },
      { id: 'costado', label: 'Costado', from: 'cintura-lateral', to: 'bajo-lateral', kind: 'line', allowance: SA, finish: 'costura' },
      { id: 'bajo', label: 'Bajo', from: 'bajo-lateral', to: 'bajo-centro', kind: 'line', allowance: hemA, finish: 'dobladillo' },
      { id: 'centro', label: 'Centro (al doblez)', from: 'bajo-centro', to: 'cintura-centro', kind: 'line', allowance: 0, finish: 'doblez' }
    ],
    grain: { a: { x: halfW * 0.5, y: L * 0.2 }, b: { x: halfW * 0.5, y: L * 0.8 } },
    cut: { qty: 1, mirrorPairs: false, onFold: true, fabric: 'principal' },
    notches: [{ id: 'costado-mitad', edgeId: 'costado', s: Math.min(L * 0.5, 150), count: id === 'delantera' ? 1 : 2 }],
    lines: [{ id: 'pespunte-jareta', kind: 'pespunte', a: { x: 0, y: casingDepth }, b: { x: halfW, y: casingDepth }, label: 'Pespunte de jareta' }],
    marks: []
  };
}

export function generateSkirt(ctx: GeneratorContext, P: Params): GeneratorResult {
  const H = ctx.body.cadera!;
  const W = ctx.body.cintura!;
  const L = num(P, 'largo');
  const fullness = num(P, 'amplitud', 1.6);
  const SA = num(P, 'margen', 10);
  const hemA = num(P, 'dobladillo', 30);
  const elastic = num(P, 'anchoElastico', 25);
  const casingDepth = elastic + 5;
  const casingA = casingDepth + 10;
  const C = H * fullness;
  const halfW = C / 4;
  const pieces = [panel('delantera', 'Falda delantera', halfW, L, SA, casingA, hemA, casingDepth), panel('trasera', 'Falda trasera', halfW, L, SA, casingA, hemA, casingDepth)];
  const seams: SeamRelation[] = [
    {
      id: 'costados',
      label: 'Costados: delantera con trasera',
      kind: 'igual',
      a: [{ pieceId: 'delantera', edgeIds: ['costado'] }],
      b: [{ pieceId: 'trasera', edgeIds: ['costado'] }],
      ratioMin: 0.99,
      ratioMax: 1.01,
      tolerance: 1
    }
  ];
  const elasticLen = W * num(P, 'proporcionElastico', 0.9) + 20;
  const notices: Issue[] = [];
  if (C < H + 50) notices.push({ level: 'error', code: 'no-pasa-cadera', message: 'La falda es más estrecha que la cadera más 5 cm: no podrá ponerse. Aumenta la amplitud.' });
  else notices.push({ level: 'ok', code: 'pasa-cadera', message: `Contorno de cintura antes de fruncir: ${formatLength(C, 'cm')}.` });
  const gather = C / (elasticLen - 20);
  notices.push({ level: gather > 3 ? 'aviso' : 'ok', code: 'frunce', message: `Frunce resultante: ${gather.toFixed(2)} veces el largo del elástico.` });
  const fabricW = num(P, 'anchoTela', 1400);
  const panelCutW = 2 * halfW + 2 * SA;
  if (panelCutW > fabricW) notices.push({ level: 'aviso', code: 'ancho-tela', message: `Cada panel abierto mide ${formatLength(panelCutW, 'cm')} y la tela ${formatLength(fabricW, 'cm')}: tendrás que unir paños.` });

  return {
    pieces,
    seams,
    checks: [
      { key: 'bajo', label: 'Contorno de bajo terminado', target: C, measured: 4 * halfW, tolerance: 0.5 },
      { key: 'largo', label: 'Largo terminado', target: L, measured: L, tolerance: 0.5 }
    ],
    materials: [
      { id: 'elastico', label: `Elástico de ${formatLength(elastic, 'cm')}`, qty: formatLength(elasticLen, 'cm'), note: 'Cintura × proporción + 2 cm de traslape.' },
      { id: 'hilo', label: 'Hilo de coser', qty: '1 carrete' }
    ],
    assumptions: [
      `Contorno de la falda = cadera × ${fullness} = ${formatLength(C, 'cm')}. La cadera no lleva holgura adicional porque la amplitud ya la supera.`,
      'Cada panel se corta al doblez de la tela por el centro.',
      'Es una propuesta: comprueba el largo y el frunce con una muestra.'
    ],
    steps: [
      { id: 'cortar', title: 'Corta las piezas', detail: 'Falda delantera: 1 al doblez. Falda trasera: 1 al doblez.', pieces: ['delantera', 'trasera'] },
      { id: 'costados', title: 'Cose los costados', detail: 'Derecho con derecho, une delantera y trasera por ambos costados. Termina los márgenes.', pieces: ['delantera', 'trasera'], seams: ['costados'] },
      { id: 'jareta', title: 'Haz la jareta', detail: `Dobla 1 cm y luego por la línea de cintura. Pespuntea por la línea marcada dejando 3 cm abiertos, pasa ${formatLength(elasticLen, 'cm')} de elástico y cierra.`, pieces: ['delantera', 'trasera'] },
      { id: 'bajo', title: 'Haz el dobladillo', detail: `Dobla ${formatLength(hemA, 'cm')} por la línea de bajo y cose.`, pieces: ['delantera', 'trasera'] }
    ],
    notices
  };
}

export const skirtGenerator: PatternGenerator = {
  id: 'falda-fruncida-elastica',
  name: 'Falda fruncida con elástico',
  summary: 'Falda de dos paneles cortados al doblez, con jareta y elástico en la cintura.',
  status: 'implementado',
  requiredMeasures: ['cintura', 'cadera'],
  optionalMeasures: ['tiro', 'entrepierna'],
  params: [
    { key: 'largo', label: 'Largo terminado', group: 'diseno', type: 'length', min: 100, max: 1300 },
    { key: 'amplitud', label: 'Amplitud (contorno / cadera)', group: 'holgura', type: 'ratio', min: 1.1, max: 3 },
    { key: 'anchoElastico', label: 'Ancho del elástico', group: 'diseno', type: 'length', min: 5, max: 60 },
    { key: 'proporcionElastico', label: 'Largo de elástico / cintura', group: 'diseno', type: 'ratio', min: 0.7, max: 1 },
    { key: 'anchoTela', label: 'Ancho de la tela', group: 'diseno', type: 'length', min: 300, max: 3200 },
    { key: 'margen', label: 'Margen de costura', group: 'margenes', type: 'length', min: 0, max: 30 },
    { key: 'dobladillo', label: 'Dobladillo', group: 'margenes', type: 'length', min: 0, max: 100 }
  ],
  defaults: skirtDefaults,
  generate: generateSkirt
};
