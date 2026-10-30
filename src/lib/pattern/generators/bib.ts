import { formatLength } from '../../units';
import type { PEdge, Piece, PNode } from '../types';
import { GeneratorContext, GeneratorResult, Params, PatternGenerator, num, str, round1 } from '../generator';
import type { Pt } from '../../geom/vec';
import { edgeLength } from '../outline';

export function bibDefaults(ctx: GeneratorContext): Params {
  const neck = ctx.body.cuello ?? 250;
  return { holguraCuello: 15, traslape: 20, anchoTira: round1(Math.max(22, neck * 0.12)), largo: round1(neck * 0.95), ancho: round1(neck * 0.85), acabado: 'vuelta', margen: 6 };
}

/** Arco de circunferencia como cúbicas (ángulos en grados, y hacia abajo). */
function arc(r: number, a0: number, a1: number): { pts: Pt[]; ctrl: [Pt, Pt][] } {
  const steps = Math.max(1, Math.ceil(Math.abs(a1 - a0) / 45));
  const pts: Pt[] = [];
  const ctrl: [Pt, Pt][] = [];
  const P = (a: number) => ({ x: r * Math.cos((a * Math.PI) / 180), y: r * Math.sin((a * Math.PI) / 180) });
  for (let i = 0; i <= steps; i++) pts.push(P(a0 + ((a1 - a0) * i) / steps));
  for (let i = 0; i < steps; i++) {
    const t0 = ((a0 + ((a1 - a0) * i) / steps) * Math.PI) / 180;
    const t1 = ((a0 + ((a1 - a0) * (i + 1)) / steps) * Math.PI) / 180;
    const k = (4 / 3) * Math.tan((t1 - t0) / 4) * r;
    ctrl.push([
      { x: pts[i].x - k * Math.sin(t0), y: pts[i].y + k * Math.cos(t0) },
      { x: pts[i + 1].x + k * Math.sin(t1), y: pts[i + 1].y - k * Math.cos(t1) }
    ]);
  }
  return { pts, ctrl };
}

export function generateBib(ctx: GeneratorContext, P: Params): GeneratorResult {
  const neck = ctx.body.cuello!;
  const ease = num(P, 'holguraCuello', 15);
  const overlap = num(P, 'traslape', 20);
  const tw = num(P, 'anchoTira', 30);
  const Hb = num(P, 'largo', 240);
  const Wb = num(P, 'ancho', 210) / 2;
  const turned = str(P, 'acabado', 'vuelta') === 'vuelta';
  const SA = turned ? num(P, 'margen', 6) : 0;
  // El arco interior (300°) mide cuello terminado + traslape del broche.
  const span = 300;
  const neckFinished = neck + ease;
  const rn = (neckFinished + overlap) / ((2 * Math.PI * span) / 360);
  const ro = rn + tw;
  const nodes: PNode[] = [];
  const edges: PEdge[] = [];
  const add = (id: string, p: Pt) => nodes.push({ id, x: p.x, y: p.y });
  const finish = turned ? 'costura' : 'sin-margen';
  // Arco del cuello de 300° a 600° (= -60° a 240° pasando por abajo).
  const inner = arc(rn, -60, 240);
  inner.pts.forEach((p, i) => add(`cuello-${i}`, p));
  inner.ctrl.forEach((c, i) => edges.push({ id: `cuello-${i}`, label: 'Escote', from: `cuello-${i}`, to: `cuello-${i + 1}`, kind: 'cubic', c1: c[0], c2: c[1], allowance: SA, finish }));
  const outerL = arc(ro, 240, 205);
  add('tira-izq', outerL.pts[0]);
  edges.push({ id: 'extremo-izq', label: 'Extremo de la tira', from: `cuello-${inner.pts.length - 1}`, to: 'tira-izq', kind: 'line', allowance: SA, finish });
  add('cuerpo-izq', outerL.pts[outerL.pts.length - 1]);
  edges.push({ id: 'tira-izq', label: 'Tira izquierda', from: 'tira-izq', to: 'cuerpo-izq', kind: 'cubic', c1: outerL.ctrl[0][0], c2: outerL.ctrl[0][1], allowance: SA, finish });
  const L0 = outerL.pts[outerL.pts.length - 1];
  const bl: Pt = { x: -Wb, y: Hb * 0.45 };
  const bot: Pt = { x: 0, y: Hb };
  const br: Pt = { x: Wb, y: Hb * 0.45 };
  const outerR = arc(ro, -25, -60);
  const R0 = outerR.pts[0];
  add('lado-izq', bl);
  add('abajo', bot);
  add('lado-der', br);
  add('cuerpo-der', R0);
  edges.push(
    { id: 'borde-1', label: 'Borde', from: 'cuerpo-izq', to: 'lado-izq', kind: 'cubic', c1: { x: L0.x - Wb * 0.35, y: L0.y + ro * 0.05 }, c2: { x: -Wb, y: Hb * 0.12 }, allowance: SA, finish },
    { id: 'borde-2', label: 'Borde', from: 'lado-izq', to: 'abajo', kind: 'cubic', c1: { x: -Wb, y: Hb * 0.85 }, c2: { x: -Wb * 0.55, y: Hb }, allowance: SA, finish },
    { id: 'borde-3', label: 'Borde', from: 'abajo', to: 'lado-der', kind: 'cubic', c1: { x: Wb * 0.55, y: Hb }, c2: { x: Wb, y: Hb * 0.85 }, allowance: SA, finish },
    { id: 'borde-4', label: 'Borde', from: 'lado-der', to: 'cuerpo-der', kind: 'cubic', c1: { x: Wb, y: Hb * 0.12 }, c2: { x: R0.x + Wb * 0.35, y: R0.y + ro * 0.05 }, allowance: SA, finish }
  );
  add('tira-der', outerR.pts[outerR.pts.length - 1]);
  edges.push({ id: 'tira-der', label: 'Tira derecha', from: 'cuerpo-der', to: 'tira-der', kind: 'cubic', c1: outerR.ctrl[0][0], c2: outerR.ctrl[0][1], allowance: SA, finish });
  edges.push({ id: 'extremo-der', label: 'Extremo de la tira', from: 'tira-der', to: 'cuello-0', kind: 'line', allowance: SA, finish });
  const mid = (a: number, r: number) => ({ x: r * Math.cos((a * Math.PI) / 180), y: r * Math.sin((a * Math.PI) / 180) });
  const piece: Piece = {
    id: 'babero',
    name: 'Babero',
    source: 'generada',
    nodes,
    edges,
    grain: { a: { x: 0, y: rn + 15 }, b: { x: 0, y: Hb - 25 } },
    cut: { qty: turned ? 2 : 1, mirrorPairs: false, onFold: false, fabric: 'principal' },
    notches: [],
    lines: [],
    marks: [
      { id: 'broche-a', kind: 'boton', at: mid(-60 + 8, rn + tw / 2), label: 'Broche' },
      { id: 'broche-b', kind: 'boton', at: mid(240 - 8, rn + tw / 2), label: 'Broche' }
    ],
    notes: [turned ? 'Corta dos capas (exterior y reverso), cose derecho con derecho dejando 5 cm abiertos y voltea.' : 'Una capa: termina todo el contorno con bies.']
  };
  // Medida verificable: arco interior − traslape = cuello terminado.
  const innerLen = piece.edges.filter((e) => e.id.startsWith('cuello-')).reduce((s, e) => s + edgeLength(piece, e), 0);
  const perimeter = piece.edges.reduce((s, e) => s + edgeLength(piece, e), 0);
  return {
    pieces: [piece],
    seams: [],
    checks: [{ key: 'cuello', label: 'Abertura de cuello terminada', body: neck, ease, target: neckFinished, measured: innerLen - overlap, tolerance: 0.5 }],
    materials: [
      { id: 'broche', label: 'Broche de presión o velcro', qty: '1', note: `Traslape de ${formatLength(overlap, 'cm')}.` },
      ...(turned ? [] : [{ id: 'bies', label: 'Bies de 12 mm', qty: formatLength(perimeter + 150, 'cm'), note: 'Contorno aproximado más 15 cm.' }])
    ],
    assumptions: [`El escote es un arco de ${span}°: mide el cuello terminado (${formatLength(neckFinished, 'cm')}) más el traslape del broche.`, 'Propuesta experimental: verifica con una muestra.'],
    steps: [
      { id: 'cortar', title: 'Corta el babero', detail: turned ? 'Corta dos capas: exterior y reverso (toalla o algodón).' : 'Corta una capa.', pieces: ['babero'] },
      turned
        ? { id: 'coser', title: 'Cose y voltea', detail: 'Derecho con derecho, cose todo el contorno dejando 5 cm abiertos en el borde inferior. Recorta márgenes en las curvas, voltea y pespuntea al canto cerrando la abertura.', pieces: ['babero'] }
        : { id: 'bies', title: 'Coloca el bies', detail: 'Ribetea todo el contorno con bies, empezando por el escote.', pieces: ['babero'] },
      { id: 'broche', title: 'Coloca el broche', detail: 'Marca los dos puntos indicados y coloca el broche de presión.', pieces: ['babero'] }
    ],
    notices: []
  };
}

export const bibGenerator: PatternGenerator = {
  id: 'babero',
  name: 'Babero con broche',
  summary: 'Babero de una o dos capas con tiras que se abrochan detrás del cuello.',
  status: 'experimental',
  requiredMeasures: ['cuello'],
  optionalMeasures: [],
  params: [
    { key: 'largo', label: 'Largo bajo el cuello', group: 'diseno', type: 'length', min: 80, max: 500 },
    { key: 'ancho', label: 'Ancho', group: 'diseno', type: 'length', min: 80, max: 500 },
    { key: 'anchoTira', label: 'Ancho de las tiras', group: 'diseno', type: 'length', min: 15, max: 60 },
    { key: 'traslape', label: 'Traslape del broche', group: 'diseno', type: 'length', min: 10, max: 50 },
    { key: 'acabado', label: 'Acabado', group: 'diseno', type: 'choice', choices: [{ value: 'vuelta', label: 'Dos capas volteadas' }, { value: 'bies', label: 'Una capa con bies' }] },
    { key: 'holguraCuello', label: 'Holgura de cuello', group: 'holgura', type: 'length', min: 0, max: 60 },
    { key: 'margen', label: 'Margen de costura', group: 'margenes', type: 'length', min: 3, max: 15, when: (p) => p.acabado !== 'bies' }
  ],
  defaults: bibDefaults,
  generate: generateBib
};
