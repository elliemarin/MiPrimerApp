import { num, round1, str, type GeneratorContext, type GeneratorResult, type Params, type PatternGenerator } from '../generator';
import type { Piece, SeamRelation } from '../types';
import { P, cm, copyPiece, edge, equal, finite, invalid, len, outline, rectangle } from './kidsShared';
import { experimentalNotice, isKid } from './kidsBlocks';

/* Gorros infantiles digitalizados: gorro duende (pixie) de dos piezas y gorro
 * con orejeras y orejitas. Se trazan desde el contorno de cabeza; el cierre
 * bajo la barbilla es una lengüeta corta con broche, nunca cintas largas. */

const notKid = (code: string) => invalid(code, 'Este gorro usa proporciones infantiles. Elige una talla de bebé, 1–4 años o niñas y niños.');

function chinTab(H: number, sa: number) {
  const tab = rectangle('barbiquejo', 'Lengüeta de barbilla (dos caras)', H * .16, 2 * 16, [edge('a', 'Canto', 'costura', sa), edge('b', 'Extremo con broche', 'costura', sa), edge('c', 'Canto', 'costura', sa), edge('d', 'Extremo que se cose', 'costura', sa)], { qty: 2 }, true);
  tab.lines.push({ id: 'doblez', kind: 'doblez', a: P(0, 16), b: P(H * .16, 16), label: 'Doblar a lo largo' });
  tab.marks.push({ id: 'broche', kind: 'boton', at: P(H * .16 - 12, 16), label: 'Broche de presión (una mitad en cada lengüeta)' });
  return tab;
}

// ------------------------------------------------------------------ Gorro duende
export function pixieDefaults(ctx: GeneratorContext): Params {
  const H = ctx.body.cabeza ?? 420;
  return { forro: 'si', punta: round1(H * .12), margen: 7 };
}

export function generatePixie(ctx: GeneratorContext, params: Params): GeneratorResult {
  if (!isKid(ctx)) return notKid('gorro-duende-talla');
  const p = { ...pixieDefaults(ctx), ...params }, H = ctx.body.cabeza ?? 0;
  const lined = str(p, 'forro') !== 'no', tip = num(p, 'punta'), sa = num(p, 'margen');
  if (!finite(H, tip, sa) || H < 300 || H > 580 || tip < 0 || tip > H * .3 || sa < 4 || sa > 10) return invalid('gorro-duende-medidas', 'Revisa contorno de cabeza, punta y margen.');
  const a = H * .34, fh = H * .31, N = P(a * .92, H * .33), T = P(0, 0), Pt = P(a + tip, -tip * .3), B = P(0, fh);
  const open = lined ? 'costura' as const : 'sin-margen' as const, oa = lined ? sa : 0;
  const side = outline('lateral', lined ? 'Lateral exterior (par en espejo)' : 'Lateral de fieltro (par en espejo)', [T, Pt, N, B], [
    edge('coronilla', 'Coronilla (costura central)', 'costura', sa), edge('nuca', 'Nuca (costura central)', 'costura', sa, P(Pt.x - tip * .2, Pt.y + (N.y - Pt.y) * .45), P(N.x + 8, N.y - (N.y - Pt.y) * .25)),
    edge('cuello', lined ? 'Canto del cuello (une el forro)' : 'Canto del cuello (sin margen, festón)', open, oa, P(N.x * .6, N.y + 6), P(N.x * .2, fh + 4)),
    edge('cara', lined ? 'Canto de la cara (une el forro)' : 'Canto de la cara (sin margen, festón)', open, oa)], { qty: 2, mirrorPairs: true });
  side.grain = { a: P(a * .4, fh * .2), b: P(a * .4, fh * .85) };
  side.marks.push({ id: 'barbiquejo', kind: 'cruz', at: P(8, fh - 8), label: 'Lengüeta de barbilla' });
  const pieces: Piece[] = [side];
  if (lined) pieces.push(copyPiece(side, 'forro-lateral', 'Lateral de forro (par en espejo)', { fabric: 'forro' }));
  pieces.push(chinTab(H, sa));
  const seams: SeamRelation[] = [equal('centro', 'Costura central (coronilla y nuca)', [{ pieceId: 'lateral', edgeIds: ['coronilla', 'nuca'] }], [{ pieceId: 'lateral', edgeIds: ['coronilla', 'nuca'] }])];
  const face = 2 * len(side, 'cara');
  return {
    pieces, seams,
    notices: [experimentalNotice('gorro-duende-experimental', 'Gorro duende'), { level: 'ok', code: 'sin-cintas', message: 'Cierre con lengüeta y broche: sin cintas largas bajo la barbilla. Quita el gorro para dormir.' }],
    checks: [{ key: 'cara', label: 'Canto de la cara (de oreja a oreja por arriba)', body: H, target: H * .62, measured: face, tolerance: .5 }],
    materials: [
      { id: 'tela', label: lined ? 'Polar, punto grueso o algodón (exterior y forro)' : 'Fieltro de lana o polar (no se deshilacha)', qty: `2 laterales de ${cm(a + tip + 2 * sa)} × ${cm(N.y + tip * .3 + 2 * sa)}` },
      { id: 'broche', label: 'Broche de presión infantil', qty: '1 juego' }, { id: 'pompon', label: 'Pompón o borla (opcional, cosida muy firme)', qty: '1' },
      ...(lined ? [] : [{ id: 'hilo-feston', label: 'Hilo de bordar para el punto de festón', qty: '1 madeja' }])
    ],
    assumptions: [`Cara de ${cm(face)} de oreja a oreja por arriba (62 % de la cabeza) y punta de ${cm(tip)} detrás.`, lined ? 'Forrado: exterior y forro se cosen por la cara y el cuello y se voltean.' : 'En fieltro los cantos quedan sin margen y se rematan con punto de festón.', 'El dibujo de referencia no traía medidas; las proporciones salen del contorno de cabeza.'],
    steps: [
      { id: 'cortar', title: 'Corta', detail: 'Dos laterales en espejo' + (lined ? ' en exterior y en forro' : ' en fieltro') + ' y dos lengüetas.', pieces: pieces.map(x => x.id) },
      { id: 'centro', title: 'Costura central', detail: 'Une los laterales por la coronilla y la nuca, hasta la punta.' + (lined ? ' Repite con el forro.' : ''), pieces: ['lateral'], seams: ['centro'] },
      { id: 'lenguetas', title: 'Lengüetas', detail: 'Cose cada lengüeta en tubo, voltea y colócale su mitad de broche. Hilvánalas en las marcas de cada lado.', pieces: ['barbiquejo', 'lateral'] },
      lined
        ? { id: 'forrar', title: 'Forra', detail: 'Mete el forro en el exterior derecho con derecho, cose cara y cuello dejando 5 cm abiertos en la nuca, voltea, cierra y pespuntea.', pieces: ['lateral', 'forro-lateral'] }
        : { id: 'feston', title: 'Remata', detail: 'Remata cara y cuello con punto de festón a mano, atrapando las lengüetas.', pieces: ['lateral'] }
    ]
  };
}

export const pixieHatGenerator: PatternGenerator = {
  id: 'gorro-duende', name: 'Gorro duende (pixie) de bebé', status: 'experimental',
  summary: 'Gorro de dos piezas con punta trasera, forrado o en fieltro, y lengüeta con broche bajo la barbilla.',
  requiredMeasures: ['cabeza'], optionalMeasures: [], defaults: pixieDefaults, generate: generatePixie,
  params: [
    { key: 'forro', label: 'Construcción', group: 'diseno', type: 'choice', choices: [{ value: 'si', label: 'Forrado' }, { value: 'no', label: 'Fieltro sin forro' }] },
    { key: 'punta', label: 'Largo de la punta', group: 'diseno', type: 'length', min: 0, max: 170 },
    { key: 'margen', label: 'Margen de costura', group: 'margenes', type: 'length', min: 4, max: 10 }
  ]
};

// ------------------------------------------------------------------ Gorro con orejeras
export function earflapDefaults(ctx: GeneratorContext): Params {
  const H = ctx.body.cabeza ?? 420;
  return { orejas: 'gato', reduccion: .04, orejera: round1(H * .16), margen: 7 };
}

export function generateEarflap(ctx: GeneratorContext, params: Params): GeneratorResult {
  if (!isKid(ctx)) return notKid('gorro-orejeras-talla');
  const p = { ...earflapDefaults(ctx), ...params }, H = ctx.body.cabeza ?? 0;
  const ears = str(p, 'orejas'), red = num(p, 'reduccion'), fl = num(p, 'orejera'), sa = num(p, 'margen');
  if (!finite(H, red, fl, sa) || H < 300 || H > 580 || red < 0 || red > .12 || fl < H * .08 || fl > H * .3 || sa < 4 || sa > 10 || !['gato', 'oso', 'ninguna'].includes(ears))
    return invalid('gorro-orejeras-medidas', 'Revisa contorno de cabeza, orejera y margen.');
  // Two side halves joined by a centre seam (forehead → crown → nape). The band
  // line of each half measures half the head; the earflap hangs below the ear.
  const w = H * (1 - red) / 2, hh = H * .3, e0 = w * .3, e1 = w * .64, C = P(w * .46, 0), F = P(0, hh), Nn = P(w, hh), E0 = P(e0, hh), E1 = P(e1, hh);
  const side = outline('lateral', 'Lateral exterior (par en espejo)', [F, C, Nn, E1, E0], [
    edge('centro-delantero', 'Centro delantero (frente a coronilla)', 'costura', sa, P(0, hh * .35), P(C.x * .35, 0)),
    edge('centro-trasero', 'Centro trasero (coronilla a nuca)', 'costura', sa, P(C.x + (w - C.x) * .65, 0), P(w, hh * .35)),
    edge('nuca', 'Canto de la nuca (une el forro)', 'costura', sa), edge('orejera', 'Orejera (une el forro)', 'costura', sa, P(e1 + 4, hh + fl * 1.3), P(e0 - 4, hh + fl * 1.3)),
    edge('cara', 'Canto de la frente (une el forro)', 'costura', sa)], { qty: 2, mirrorPairs: true });
  side.grain = { a: P(w * .45, hh * .3), b: P(w * .45, hh * .9) };
  side.marks.push({ id: 'barbiquejo', kind: 'cruz', at: P((e0 + e1) / 2, hh + fl * .9), label: 'Lengüeta de barbilla (punta de la orejera)' });
  const pieces: Piece[] = [side, copyPiece(side, 'forro-lateral', 'Lateral de forro (par en espejo)', { fabric: 'forro' })];
  if (ears !== 'ninguna') {
    const ew = H * (ears === 'gato' ? .12 : .1), eh = ew * (ears === 'gato' ? 1 : .8);
    const ear = ears === 'gato'
      ? outline('oreja', 'Oreja de gato (4: dos exteriores y dos interiores)', [P(0, 0), P(ew, 0), P(ew * .5, -eh)], [edge('base', 'Base (doblar y coser a mano)', 'costura', sa), edge('lado-der', 'Lado', 'costura', sa), edge('lado-izq', 'Lado', 'costura', sa)], { qty: 4 })
      : outline('oreja', 'Oreja de oso (4: dos exteriores y dos interiores)', [P(0, 0), P(ew, 0), P(ew / 2, -eh)], [edge('base', 'Base (doblar y coser a mano)', 'costura', sa), edge('contorno-der', 'Contorno', 'costura', sa, P(ew, -eh * .55), P(ew * .78, -eh)), edge('contorno-izq', 'Contorno', 'costura', sa, P(ew * .22, -eh), P(0, -eh * .55))], { qty: 4 });
    ear.grain = { a: P(ew / 2, -eh * .2), b: P(ew / 2, -eh * .7) };
    side.marks.push({ id: 'oreja', kind: 'cruz', at: P(w * .3, hh * .22), label: 'Centro de la oreja' });
    pieces.push(ear);
  }
  pieces.push(chinTab(H, sa));
  const seams: SeamRelation[] = [equal('centro', 'Costura central', [{ pieceId: 'lateral', edgeIds: ['centro-delantero', 'centro-trasero'] }], [{ pieceId: 'lateral', edgeIds: ['centro-delantero', 'centro-trasero'] }])];
  const band = 2 * (w);
  return {
    pieces, seams,
    notices: [experimentalNotice('gorro-orejeras-experimental', 'Gorro con orejeras'), { level: 'ok', code: 'sin-cintas', message: 'Cierre con lengüeta y broche entre las orejeras; sin cintas largas. Quita el gorro para dormir.' }],
    checks: [{ key: 'contorno', label: 'Línea de borde (frente a nuca, las dos mitades)', body: H, target: H * (1 - red), measured: band, tolerance: .5 }],
    materials: [{ id: 'tela', label: 'Polar o punto grueso (exterior)', qty: 'Dos laterales' }, { id: 'forro', label: 'Polar fino, punto de algodón o franela (forro)', qty: 'Dos laterales' }, { id: 'broche', label: 'Broche de presión infantil', qty: '1 juego' }],
    assumptions: [`Línea de borde de ${cm(band)} (${Math.round((1 - red) * 100)} % de la cabeza): el polar ajusta sin apretar.`, `Orejeras de ${cm(fl)} bajo el borde, entre el 30 % y el 64 % de la distancia frente–nuca.`, 'La referencia mostraba una pieza única con cintas para atar; se reconstruyó en dos laterales con costura central y lengüeta con broche.'],
    steps: [
      { id: 'cortar', title: 'Corta', detail: 'Dos laterales en exterior y dos en forro' + (ears !== 'ninguna' ? ', cuatro orejas' : '') + ' y dos lengüetas.', pieces: pieces.map(x => x.id) },
      { id: 'centro', title: 'Costura central', detail: 'Une los dos laterales exteriores por la costura central; repite con el forro.', pieces: ['lateral', 'forro-lateral'], seams: ['centro'] },
      { id: 'lenguetas', title: 'Lengüetas', detail: 'Cose cada lengüeta en tubo y hilvánala en la punta de cada orejera.', pieces: ['barbiquejo', 'lateral'] },
      { id: 'forrar', title: 'Forra', detail: 'Mete el forro en el exterior derecho con derecho y cose todo el borde (frente, orejeras y nuca) dejando 6 cm abiertos en la nuca. Voltea, cierra y pespuntea.', pieces: ['lateral', 'forro-lateral'] },
      ...(ears !== 'ninguna' ? [{ id: 'orejas', title: 'Orejas', detail: 'Cose cada oreja exterior con una interior, voltea, dobla la base hacia dentro y cósela a mano sobre su marca, con puntadas firmes.', pieces: ['oreja', 'lateral'] }] : [])
    ]
  };
}

export const earflapHatGenerator: PatternGenerator = {
  id: 'gorro-orejeras', name: 'Gorro con orejeras y orejitas', status: 'experimental',
  summary: 'Gorro forrado de dos laterales con orejeras, orejas de gato u oso y lengüeta con broche.',
  requiredMeasures: ['cabeza'], optionalMeasures: [], defaults: earflapDefaults, generate: generateEarflap,
  params: [
    { key: 'orejas', label: 'Orejitas', group: 'diseno', type: 'choice', choices: [{ value: 'gato', label: 'Gato' }, { value: 'oso', label: 'Oso' }, { value: 'ninguna', label: 'Sin orejas' }] },
    { key: 'orejera', label: 'Largo de la orejera', group: 'diseno', type: 'length', min: 25, max: 170 },
    { key: 'reduccion', label: 'Reducción sobre la cabeza', group: 'holgura', type: 'ratio', min: 0, max: .12 },
    { key: 'margen', label: 'Margen de costura', group: 'margenes', type: 'length', min: 4, max: 10 }
  ]
};

export const KIDS_HATS_GENERATORS = [pixieHatGenerator, earflapHatGenerator];
