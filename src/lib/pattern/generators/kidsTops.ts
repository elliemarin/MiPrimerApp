import { num, round1, str, type GeneratorContext, type GeneratorResult, type Params, type PatternGenerator } from '../generator';
import type { Issue, Piece, SeamRelation } from '../types';
import { P, arc, bindingStrip, clamp, cm, edge, equal, finite, invalid, len, outline, ratio, rectangle } from './kidsShared';
import { armhole, bodiceGeometry, bodicePiece, bodySeams, bowPieces, buttonMarks, experimentalNotice, frontFacing, isKid, isSmall, kidBody, neckLen } from './kidsBlocks';

/* Blusas, vestido y pelele infantiles reconstruidos desde referencias:
 * blusa campesina de manga ranglan abullonada, blusa sin mangas con botones,
 * vestido con jaretas y tirantes de ribete, pelele de volantes con broches en
 * la entrepierna y diadema con lazo. Lazos decorativos cosidos fijos. */

const notKid = (code: string) => invalid(code, 'Este patrón usa proporciones infantiles. Elige una talla de bebé, 1–4 años o niñas y niños.');
const margin = { key: 'margen', label: 'Margen de costura', group: 'margenes' as const, type: 'length' as const, min: 5, max: 15 };
const hemParam = { key: 'dobladillo', label: 'Dobladillo', group: 'margenes' as const, type: 'length' as const, min: 8, max: 40 };

// ------------------------------------------------------------------ Blusa campesina
export function peasantDefaults(ctx: GeneratorContext): Params {
  const k = kidBody(ctx);
  return { manga: 'corta', volante: 'si', largo: round1(k.talle * 1.3), holgura: round1(clamp(k.chest * .25 + 20, 100, 220)), anchoElastico: 6, margen: 10, dobladillo: 12 };
}

export function generatePeasant(ctx: GeneratorContext, params: Params): GeneratorResult {
  if (!isKid(ctx)) return notKid('campesina-talla');
  const p = { ...peasantDefaults(ctx), ...params }, k = kidBody(ctx), s = clamp(k.chest / 560, .7, 1.45);
  const long = str(p, 'manga') === 'larga', ruffle = str(p, 'volante') !== 'no', total = num(p, 'largo'), ease = num(p, 'holgura'), ew = num(p, 'anchoElastico'), sa = num(p, 'margen'), hem = num(p, 'dobladillo');
  if (!finite(total, ease, ew, sa, hem) || ease < 60 || ease > 300 || ew < 4 || ew > 15 || sa < 5 || sa > 15 || hem < 8 || hem > 30 || !['corta', 'larga'].includes(str(p, 'manga')))
    return invalid('campesina-medidas', 'Revisa largo, holgura, elástico y márgenes.');
  const vh = ruffle ? clamp(55 * s, 35, 90) : 0, L = total - vh, q = (k.chest + ease) / 4, rx = k.neck / 6 + 25 * s, ad = k.talle * .45 + 20 * s;
  if (L < ad + 40 * s || total > k.talle * 2.6) return invalid('campesina-largo', `El largo debe pasar al menos ${cm(40 * s + vh)} de la sisa.`);
  const casing = ew + 12;
  const body = (id: string, name: string, depth: number) => {
    const piece = outline(id, name, [P(0, depth), P(rx, 0), P(q, ad), P(q, L), P(0, L)], [
      edge('escote', 'Escote (une el canal del elástico)', 'costura', 6, P(rx * .5, depth), P(rx * .85, depth * .7)), edge('ranglan', 'Ranglan', 'costura', sa),
      edge('costado', 'Costado', 'costura', sa), ruffle ? edge('bajo', 'Bajo (une el volante)', 'costura', sa) : edge('bajo', 'Bajo', 'dobladillo', hem), edge('centro', 'Centro (al doblez)', 'doblez', 0)], { onFold: true });
    piece.grain = { a: P(q * .45, ad + 10), b: P(q * .45, L - 20) };
    return piece;
  };
  const front = body('delantero', 'Delantero al doblez', 45 * s), back = body('espalda', 'Espalda al doblez', 30 * s);
  const l = len(front, 'ranglan'), h = ad * .78, run = Math.sqrt(Math.max(1, l * l - h * h));
  // The gathered neckline must pass the head flat: the sleeve tops make up the difference.
  const needNeck = k.head + 80 * s, wt = Math.max(k.arm * 1.6 - 2 * run, 60 * s, needNeck / 2 - len(front, 'escote') - len(back, 'escote')), Wu = wt + 2 * run;
  const Ls = Math.max(h + 30 * s, (k.shoulders / 2 - rx) + (long ? k.sleeve + 25 * s : k.sleeve * .22 + 20 * s)), Wh = long ? Math.max(k.wrist * 2.2, Wu * .7) : Wu;
  if (Ls < h + 25 * s) return invalid('campesina-manga', 'La manga queda más corta que su ranglan.');
  const sleeve = outline('manga', 'Manga ranglan abullonada (par en espejo)', [P(-wt / 2, 0), P(wt / 2, 0), P(Wu / 2, h), P(Wh / 2, Ls), P(-Wh / 2, Ls), P(-Wu / 2, h)], [
    edge('escote', 'Escote (une el canal del elástico)', 'costura', 6), edge('ranglan-trasero', 'Ranglan trasero', 'costura', sa), edge('costura-trasera', 'Costura de manga', 'costura', sa),
    edge('puno', 'Bajo de manga (jareta con elástico)', 'jareta', casing), edge('costura-delantera', 'Costura de manga', 'costura', sa), edge('ranglan-delantero', 'Ranglan delantero', 'costura', sa)], { qty: 2, mirrorPairs: true });
  sleeve.grain = { a: P(0, 15), b: P(0, Ls - 20) };
  sleeve.notches.push({ id: 'trasera', edgeId: 'ranglan-trasero', s: l * .5, count: 2, label: 'Espalda' }, { id: 'delantera', edgeId: 'ranglan-delantero', s: l * .5, count: 1, label: 'Delantero' });
  const pieces: Piece[] = [front, back, sleeve];
  const seams: SeamRelation[] = [
    equal('ranglan-delantero', 'Ranglan: manga con delantero', [{ pieceId: 'manga', edgeIds: ['ranglan-delantero'] }], [{ pieceId: 'delantero', edgeIds: ['ranglan'] }]),
    equal('ranglan-trasero', 'Ranglan: manga con espalda', [{ pieceId: 'manga', edgeIds: ['ranglan-trasero'] }], [{ pieceId: 'espalda', edgeIds: ['ranglan'] }]),
    equal('costados', 'Costados', [{ pieceId: 'delantero', edgeIds: ['costado'] }], [{ pieceId: 'espalda', edgeIds: ['costado'] }]),
    equal('manga-costura', 'Costura de manga', [{ pieceId: 'manga', edgeIds: ['costura-delantera'] }], [{ pieceId: 'manga', edgeIds: ['costura-trasera'] }])];
  if (ruffle) {
    const vw = len(front, 'bajo') * 1.6;
    const vol = rectangle('volante', 'Volante del bajo al doblez (delantero y espalda)', vw, vh, [edge('union', 'Unión (fruncir)', 'costura', sa), edge('costado', 'Costado', 'costura', sa), edge('bajo', 'Bajo', 'dobladillo', hem), edge('centro', 'Centro (al doblez)', 'doblez', 0)], { qty: 2, onFold: true }, true);
    pieces.push(vol);
    seams.push(ratio('volante-bajo', 'Volante fruncido al bajo', 'fruncido', [{ pieceId: 'volante', edgeIds: ['union'] }], [{ pieceId: 'delantero', edgeIds: ['bajo'] }], 1.6, .05));
  }
  const neckline = 2 * (len(front, 'escote') + len(back, 'escote') + len(sleeve, 'escote'));
  const channel = rectangle('canal-escote', 'Canal del elástico del escote (al bies)', neckline + 20, 2 * (ew + 6) + 12, [
    edge('union', 'Unión al escote', 'costura', 6), edge('extremo-a', 'Extremo (doblar 1 cm)', 'sin-margen', 0), edge('canto', 'Canto (doblar 6 mm)', 'sin-margen', 0), edge('extremo-b', 'Extremo (doblar 1 cm)', 'sin-margen', 0)], { fabric: 'principal' }, true);
  channel.notes = ['Cortar al bies. Se cose al escote derecho con derecho, se vuelve al revés y se pespuntea formando el canal.'];
  pieces.push(channel);
  seams.push(equal('canal-escote', 'Escote completo con el canal', [{ pieceId: 'delantero', edgeIds: ['escote'], factor: 2 }, { pieceId: 'espalda', edgeIds: ['escote'], factor: 2 }, { pieceId: 'manga', edgeIds: ['escote'], factor: 2 }], [{ pieceId: 'canal-escote', edgeIds: ['union'] }], 21));
  const elastic = Math.min(neckline * .7, k.neck * 1.25 + 40 * s), sleeveElastic = long ? k.wrist * 1.35 + 10 * s : k.arm + 25 * s;
  const notices: Issue[] = [experimentalNotice('campesina-experimental', 'Blusa campesina'),
    neckline < k.head + 30 || 2 * elastic < k.head + 20 ? { level: 'error', code: 'paso-cabeza', message: 'El escote fruncido no deja pasar la cabeza. Aumenta la holgura o el elástico.' } : { level: 'ok', code: 'paso-cabeza', message: `Escote de ${cm(neckline)} fruncido con ${cm(elastic)} de elástico: pasa una cabeza de ${cm(k.head)}.` }];
  return {
    pieces, seams, notices,
    checks: [{ key: 'pecho', label: 'Contorno de pecho terminado', body: k.chest, ease, target: k.chest + ease, measured: 2 * front.nodes[2].x + 2 * back.nodes[2].x, tolerance: .5 }],
    materials: [
      { id: 'tela', label: 'Vichy, popelina, batista o lino ligero', qty: 'Según acomodo' },
      { id: 'elastico', label: `Elástico de ${cm(ew)}`, qty: `${cm(elastic + 20)} (escote) y 2 × ${cm(sleeveElastic + 20)} (mangas)` }, { id: 'hilo', label: 'Hilo', qty: '1 carrete' }
    ],
    assumptions: [`Pecho + ${cm(ease)} de holgura: el elástico del escote frunce el cuerpo y las mangas.`, `Manga ranglan ${long ? 'larga' : 'corta abullonada'}: su ranglan mide exactamente el del cuerpo.`, ruffle ? 'Volante del bajo 1,6 veces el contorno.' : 'Sin volante: dobladillo simple.', 'La referencia no traía medidas; el trazo sale de las medidas de la talla.'],
    steps: [
      { id: 'cortar', title: 'Corta', detail: 'Delantero y espalda al doblez, dos mangas' + (ruffle ? ' y dos volantes al doblez.' : '.'), pieces: pieces.map(x => x.id) },
      { id: 'ranglan', title: 'Une los ranglan', detail: 'Cose cada manga al delantero y a la espalda por los ranglan, con los piquetes coincidiendo.', pieces: ['delantero', 'espalda', 'manga'], seams: ['ranglan-delantero', 'ranglan-trasero'] },
      { id: 'costados', title: 'Costados y mangas', detail: 'Cose de puño a bajo por cada lado.', pieces: ['delantero', 'espalda', 'manga'], seams: ['costados', 'manga-costura'] },
      ...(ruffle ? [{ id: 'volante', title: 'Volante', detail: 'Une los volantes por los costados, dobladilla el bajo, frunce y cóselos al bajo del cuerpo.', pieces: ['volante', 'delantero', 'espalda'], seams: ['volante-bajo'] }] : []),
      { id: 'jaretas', title: 'Canal del escote y elásticos', detail: `Cose el canal al bies alrededor del escote, vuélvelo al revés y pespuntea su canto dejando la unión abierta. Pasa ${cm(elastic)} de elástico. Dobla 1 cm y la jareta de las mangas y pasa su elástico. Une los elásticos y cierra.`, pieces: ['delantero', 'espalda', 'manga', 'canal-escote'], seams: ['canal-escote'] }
    ]
  };
}

export const peasantTopGenerator: PatternGenerator = {
  id: 'blusa-campesina-infantil', name: 'Blusa campesina infantil de manga abullonada', status: 'experimental',
  summary: 'Blusa ranglan con escote y mangas elásticos y volante en el bajo.',
  requiredMeasures: ['pecho', 'cuello', 'hombros', 'talleEspalda', 'largoManga', 'cabeza'], optionalMeasures: ['estatura', 'brazo', 'muneca'],
  defaults: peasantDefaults, generate: generatePeasant,
  params: [
    { key: 'manga', label: 'Manga', group: 'diseno', type: 'choice', choices: [{ value: 'corta', label: 'Corta abullonada' }, { value: 'larga', label: 'Larga con puño elástico' }] },
    { key: 'volante', label: 'Volante en el bajo', group: 'diseno', type: 'choice', choices: [{ value: 'si', label: 'Sí' }, { value: 'no', label: 'No' }] },
    { key: 'largo', label: 'Largo total', group: 'diseno', type: 'length', min: 150, max: 700 },
    { key: 'anchoElastico', label: 'Ancho del elástico', group: 'diseno', type: 'length', min: 4, max: 15 },
    { key: 'holgura', label: 'Holgura de pecho', group: 'holgura', type: 'length', min: 60, max: 300 },
    margin, hemParam
  ]
};

// ------------------------------------------------------------------ Blusa sin mangas con botones
export function buttonTopDefaults(ctx: GeneratorContext): Params {
  const k = kidBody(ctx);
  return { largo: round1(k.talle * 1.4), holgura: round1(clamp(k.chest * .18 + 35, 80, 180)), anchoBies: 8, margen: 10, dobladillo: 15 };
}

export function generateButtonTop(ctx: GeneratorContext, params: Params): GeneratorResult {
  if (!isKid(ctx)) return notKid('blusa-botones-talla');
  const p = { ...buttonTopDefaults(ctx), ...params }, k = kidBody(ctx);
  const L = num(p, 'largo'), ease = num(p, 'holgura'), bias = num(p, 'anchoBies'), sa = num(p, 'margen'), hem = num(p, 'dobladillo');
  if (!finite(L, ease, bias, sa, hem) || ease < 50 || ease > 250 || bias < 5 || bias > 12 || sa < 5 || sa > 15 || hem < 8 || hem > 40) return invalid('blusa-botones-medidas', 'Revisa largo, holgura, ribete y márgenes.');
  const s0 = clamp(k.chest / 560, .7, 1.45), ext = 12 * s0, g = bodiceGeometry(ctx, { ease, length: L, neckWiden: 4 * s0, armExtra: 8 * s0, ext });
  if (L < g.ad + 50 * g.s) return invalid('blusa-botones-largo', 'El largo debe pasar al menos 5 cm de la sisa.');
  const fin = { sa, hem, neck: 'sin-margen' as const, arm: 'sin-margen' as const, hemFinish: 'dobladillo' as const, centre: 'costura' as const, labels: { cuello: 'Escote (ribete)', sisa: 'Sisa (ribete)', centro: 'Canto delantero (une la vista)' } };
  const front = bodicePiece('delantero', 'Delantero (par en espejo)', g, false, fin, { qty: 2, mirrorPairs: true });
  const back = bodicePiece('espalda', 'Espalda al doblez', g, true, { ...fin, centre: 'doblez' });
  const facing = frontFacing(front, 'vista', 'Vista delantera (par en espejo)', ext + 30 * g.s, sa, 'dobladillo', hem);
  const neckline = 2 * (neckLen(front) + neckLen(back)), arm = armhole(front) + armhole(back);
  const pieces: Piece[] = [front, back, facing, bindingStrip('bies-escote', 'Ribete del escote', neckline, bias, 1, 10), bindingStrip('bies-sisa', 'Ribete de sisa', arm, bias, 2, 0)];
  const count = g.L > 300 ? 5 : 4;
  buttonMarks(front, 0, g.fd + 10 * g.s, g.L - 40 * g.s, count, 'boton', 'Botón (derecho) · ojal vertical (izquierdo)');
  const seams: SeamRelation[] = [...bodySeams('delantero', 'espalda'),
    equal('vista-canto', 'Vista con el canto delantero', [{ pieceId: 'vista', edgeIds: ['canto'] }], [{ pieceId: 'delantero', edgeIds: ['centro'] }]),
    equal('ribete-escote', 'Escote con su ribete', [{ pieceId: 'delantero', edgeIds: ['cuello'], factor: 2 }, { pieceId: 'espalda', edgeIds: ['cuello'], factor: 2 }], [{ pieceId: 'bies-escote', edgeIds: ['largo-superior'] }]),
    equal('ribete-sisa', 'Cada sisa con su ribete', [{ pieceId: 'delantero', edgeIds: ['sisa-superior', 'sisa-inferior'] }, { pieceId: 'espalda', edgeIds: ['sisa-superior', 'sisa-inferior'] }], [{ pieceId: 'bies-sisa', edgeIds: ['largo-superior'] }])];
  return {
    pieces, seams,
    notices: [experimentalNotice('blusa-botones-experimental', 'Blusa con botones'), ...(ctx.kind === 'bebe' ? [{ level: 'aviso' as const, code: 'botones-bebe', message: 'En bebés usa broches de presión o revisa los botones antes de cada uso.' }] : [])],
    checks: [{ key: 'pecho', label: 'Contorno de pecho terminado', body: k.chest, ease, target: k.chest + ease, measured: 2 * front.nodes[4].x + 2 * back.nodes[4].x, tolerance: .5 }],
    materials: [
      { id: 'tela', label: 'Seersucker, popelina o lino', qty: 'Según acomodo', note: 'Para rayas, alinea el centro delantero con una raya.' },
      { id: 'bies', label: `Bies de ${cm(bias)}`, qty: cm(neckline + 2 * arm + 40) }, { id: 'botones', label: 'Botones de 10–12 mm', qty: `${count}` }, { id: 'entretela', label: 'Entretela ligera para las vistas', qty: 'Lo que midan las vistas' }
    ],
    assumptions: [`Pecho + ${cm(ease)}; cruce de ${cm(ext)} a cada lado del centro.`, 'Escote y sisas ribeteados al bies (sin margen). Los apliques (por ejemplo, un panda) se añaden en Bordados.', 'La referencia no traía medidas; el trazo sale de las medidas de la talla.'],
    steps: [
      { id: 'cortar', title: 'Corta y entretela', detail: 'Delanteros, espalda al doblez, vistas entreteladas y bies.', pieces: pieces.map(x => x.id) },
      { id: 'vistas', title: 'Vistas', detail: 'Sobrehila el canto interior de cada vista, cósela al canto delantero derecho con derecho, voltea y plancha.', pieces: ['vista', 'delantero'], seams: ['vista-canto'] },
      { id: 'cuerpo', title: 'Hombros y costados', detail: 'Une hombros y costados.', pieces: ['delantero', 'espalda'], seams: ['hombros', 'costados'] },
      { id: 'ribetes', title: 'Ribetes', detail: 'Ribetea sisas y escote; en el escote dobla 1 cm de bies hacia dentro en cada extremo, sobre la vista.', pieces: ['bies-escote', 'bies-sisa', 'delantero', 'espalda'], seams: ['ribete-escote', 'ribete-sisa'] },
      { id: 'terminar', title: 'Bajo y botones', detail: 'Dobladilla el bajo con la vista doblada. Haz ojales verticales en el delantero izquierdo y cose los botones.', pieces: ['delantero', 'vista'] }
    ]
  };
}

export const buttonTopGenerator: PatternGenerator = {
  id: 'blusa-botones-infantil', name: 'Blusa infantil sin mangas con botones', status: 'experimental',
  summary: 'Blusa recta sin mangas, abotonada delante, con escote redondo y sisas ribeteadas.',
  requiredMeasures: ['pecho', 'cuello', 'hombros', 'talleEspalda'], optionalMeasures: ['estatura'],
  defaults: buttonTopDefaults, generate: generateButtonTop,
  params: [
    { key: 'largo', label: 'Largo de espalda', group: 'diseno', type: 'length', min: 150, max: 650 },
    { key: 'anchoBies', label: 'Ancho del ribete', group: 'diseno', type: 'length', min: 5, max: 12 },
    { key: 'holgura', label: 'Holgura de pecho', group: 'holgura', type: 'length', min: 50, max: 250 },
    margin, hemParam
  ]
};

// ------------------------------------------------------------------ Vestido con jaretas
export function casingDressDefaults(ctx: GeneratorContext): Params {
  const k = kidBody(ctx);
  return { lazo: 'si', largo: round1(clamp(k.height * .42, 220, 700)), holgura: round1(clamp(k.chest * .17 + 20, 70, 160)), vuelo: 1.6, anchoElastico: 6, anchoBies: 8, margen: 10, dobladillo: 20 };
}

export function generateCasingDress(ctx: GeneratorContext, params: Params): GeneratorResult {
  if (!isKid(ctx)) return notKid('vestido-jareta-talla');
  const p = { ...casingDressDefaults(ctx), ...params }, k = kidBody(ctx), s = clamp(k.chest / 560, .7, 1.45);
  const bow = str(p, 'lazo') === 'si', L = num(p, 'largo'), ease = num(p, 'holgura'), amp = num(p, 'vuelo'), ew = num(p, 'anchoElastico'), bias = num(p, 'anchoBies'), sa = num(p, 'margen'), hem = num(p, 'dobladillo');
  if (!finite(L, ease, amp, ew, bias, sa, hem) || ease < 40 || ease > 220 || amp < 1.1 || amp > 2.4 || ew < 4 || ew > 12 || bias < 5 || bias > 12 || sa < 5 || sa > 15 || hem < 8 || hem > 40)
    return invalid('vestido-jareta-medidas', 'Revisa largo, holgura, vuelo, elástico y ribete.');
  const q = (k.chest + ease) / 4, armFromShoulder = k.talle * .45 + 15 * s, ah = armFromShoulder * .5, xt = q - Math.max(k.arm * .22, 30 * s);
  if (L < ah + 120 * s || xt < 40 * s) return invalid('vestido-jareta-largo', 'El largo debe pasar al menos 12 cm de la sisa.');
  const hemHalf = q * amp, tan = (hemHalf - q) / (L - ah), ySide = L - hemHalf * tan * .5, casing = ew + 12;
  const panel = (id: string, name: string) => {
    const sl = Math.hypot(hemHalf - q, ySide - ah), dx = (hemHalf - q) / sl, dy = (ySide - ah) / sl;
    const piece = outline(id, name, [P(0, 0), P(xt, 0), P(q, ah), P(hemHalf, ySide), P(0, L)], [
      edge('superior', 'Canto superior (jareta con elástico)', 'jareta', casing), edge('sisa', 'Sisa (ribete que sigue como tirante)', 'sin-margen', 0, P(xt, ah * .55), P(q - (q - xt) * .55, ah)),
      edge('costado', 'Costado', 'costura', sa), edge('bajo', 'Bajo', 'dobladillo', hem, P(hemHalf - dy * hemHalf * .38, ySide + dx * hemHalf * .38), P(hemHalf * .38, L)), edge('centro', 'Centro (al doblez)', 'doblez', 0)], { onFold: true });
    piece.grain = { a: P(q * .45, ah + 15), b: P(q * .45, L - 40) };
    return piece;
  };
  const front = panel('delantero', 'Delantero al doblez'), back = panel('espalda', 'Espalda al doblez');
  const strapL = 2 * (armFromShoulder - ah) + 20 * s, strip = len(front, 'sisa') + strapL + len(back, 'sisa');
  const binding = bindingStrip('bies-tirante', 'Ribete de sisa que forma el tirante', strip, bias, 2, 10);
  binding.notes = [...(binding.notes ?? []), `El tramo central de ${cm(strapL)} se cose cerrado y forma el tirante sobre el hombro.`];
  binding.notches.push({ id: 'inicio-tirante', edgeId: 'largo-superior', s: len(front, 'sisa'), count: 1, label: 'Inicio del tirante' }, { id: 'fin-tirante', edgeId: 'largo-superior', s: len(front, 'sisa') + strapL, count: 1, label: 'Fin del tirante' });
  const pieces: Piece[] = [front, back, binding];
  if (bow) { pieces.push(...bowPieces('', 38 * s, 13 * s, 6)); front.marks.push({ id: 'lazo', kind: 'cruz', at: P(0, casing * .4 + 4), label: 'Lazo decorativo cosido fijo' }); }
  const opening = 2 * (2 * xt) + 2 * strapL;
  const seams: SeamRelation[] = [equal('costados', 'Costados', [{ pieceId: 'delantero', edgeIds: ['costado'] }], [{ pieceId: 'espalda', edgeIds: ['costado'] }])];
  const elastic = 2 * xt * .72;
  return {
    pieces, seams,
    notices: [experimentalNotice('vestido-jareta-experimental', 'Vestido con jaretas'),
      opening < k.head + 20 ? { level: 'error', code: 'paso-cabeza', message: 'La abertura no deja pasar la cabeza. Alarga los tirantes o aumenta la holgura.' } : { level: 'ok', code: 'paso-cabeza', message: `Con el elástico estirado la abertura mide ${cm(opening)}: pasa una cabeza de ${cm(k.head)}.` },
      { level: 'ok', code: 'sin-cintas', message: 'Tirantes fijos de ribete, sin cintas para atar en el hombro.' }],
    checks: [{ key: 'pecho', label: 'Contorno bajo la sisa', body: k.chest, ease, target: k.chest + ease, measured: 4 * q, tolerance: .5 }],
    materials: [
      { id: 'tela', label: 'Algodón estampado, batista o lino ligero', qty: 'Según acomodo' },
      { id: 'bies', label: `Bies de ${cm(bias)}`, qty: `2 tiras de ${cm(strip + 20)}` }, { id: 'elastico', label: `Elástico de ${cm(ew)}`, qty: `2 × ${cm(elastic + 20)}` },
      ...(bow ? [{ id: 'lazo', label: 'Retazo para el lazo', qty: '20 × 20 cm' }] : [])
    ],
    assumptions: [`Delantero y espalda iguales al doblez, con vuelo ${amp.toFixed(1)} en el bajo.`, `Canto superior con jareta: cada elástico mide ${cm(elastic)} (72 % del canto).`, `El ribete de cada sisa continúa como tirante de ${cm(strapL)}; no hay cintas para atar.`, 'La referencia daba medidas para 12–18 meses que no cerraban entre sí; el trazo sale de las medidas de la talla.'],
    steps: [
      { id: 'cortar', title: 'Corta', detail: 'Delantero y espalda al doblez, dos tiras de bies' + (bow ? ' y el lazo.' : '.'), pieces: pieces.map(x => x.id) },
      { id: 'costados', title: 'Costados', detail: 'Une los costados y termina los márgenes.', pieces: ['delantero', 'espalda'], seams: ['costados'] },
      { id: 'jaretas', title: 'Jaretas', detail: 'Dobla 1 cm y luego la jareta del canto superior en delantero y espalda; pasa el elástico y fíjalo en los extremos.', pieces: ['delantero', 'espalda'] },
      { id: 'tirantes', title: 'Ribetes y tirantes', detail: 'Ribetea la sisa delantera desde el canto superior, sigue cosiendo el bies cerrado por el tramo del tirante y ribetea la sisa de espalda. Prueba el largo del tirante sobre el hombro antes de rematar.', pieces: ['bies-tirante', 'delantero', 'espalda'] },
      { id: 'bajo', title: 'Bajo' + (bow ? ' y lazo' : ''), detail: `Dobladilla el bajo (${cm(hem)}).` + (bow ? ' Arma el lazo y cóselo fijo en el centro delantero.' : ''), pieces: ['delantero', 'espalda'] }
    ]
  };
}

export const casingDressGenerator: PatternGenerator = {
  id: 'vestido-jareta-infantil', name: 'Vestido infantil con jaretas y tirantes', status: 'experimental',
  summary: 'Vestido trapecio con canto superior elástico, tirantes de ribete continuo y lazo decorativo.',
  requiredMeasures: ['pecho', 'talleEspalda', 'cabeza'], optionalMeasures: ['estatura', 'brazo'],
  defaults: casingDressDefaults, generate: generateCasingDress,
  params: [
    { key: 'lazo', label: 'Lazo decorativo', group: 'diseno', type: 'choice', choices: [{ value: 'si', label: 'Sí, cosido fijo' }, { value: 'no', label: 'No' }] },
    { key: 'largo', label: 'Largo desde el canto superior', group: 'diseno', type: 'length', min: 180, max: 900 },
    { key: 'vuelo', label: 'Vuelo del bajo', group: 'diseno', type: 'ratio', min: 1.1, max: 2.4 },
    { key: 'anchoElastico', label: 'Ancho del elástico', group: 'diseno', type: 'length', min: 4, max: 12 },
    { key: 'anchoBies', label: 'Ancho del ribete', group: 'diseno', type: 'length', min: 5, max: 12 },
    { key: 'holgura', label: 'Holgura de pecho', group: 'holgura', type: 'length', min: 40, max: 220 },
    margin, hemParam
  ]
};

// ------------------------------------------------------------------ Pelele de volantes
export function rufflesRomperDefaults(ctx: GeneratorContext): Params {
  const k = kidBody(ctx);
  return { tirantes: 'si', holgura: round1(clamp(k.chest * .14 + 20, 60, 120)), fruncido: 1.4, anchoVolante: round1(clamp(k.chest * .09, 35, 70)), anchoBies: 8, margen: 8 };
}

export function generateRufflesRomper(ctx: GeneratorContext, params: Params): GeneratorResult {
  if (!isSmall(ctx)) return invalid('pelele-volantes-talla', 'Este pelele se traza sobre pañal: elige una talla por meses o de 1–4 años.');
  const p = { ...rufflesRomperDefaults(ctx), ...params }, k = kidBody(ctx), s = clamp(k.chest / 560, .7, 1.45);
  const straps = str(p, 'tirantes') === 'si', ease = num(p, 'holgura'), gather = num(p, 'fruncido'), fd = num(p, 'anchoVolante'), bias = num(p, 'anchoBies'), sa = num(p, 'margen');
  if (!finite(ease, gather, fd, bias, sa) || ease < 40 || ease > 160 || gather < 1.1 || gather > 2 || fd < 25 || fd > 100 || bias < 5 || bias > 12 || sa < 5 || sa > 12) return invalid('pelele-volantes-medidas', 'Revisa holgura, fruncido, volante y márgenes.');
  const ext = 10 * s, g = bodiceGeometry(ctx, { ease, length: k.talle * .95 + 10 * s, armExtra: 6 * s });
  const fin = { sa, hem: sa, neck: 'sin-margen' as const, arm: 'sin-margen' as const, hemFinish: 'costura' as const, centre: 'doblez' as const, labels: { cuello: 'Escote (ribete)', sisa: 'Sisa (ribete)', bajo: 'Cintura (une el short)' } };
  const front = bodicePiece('cuerpo-delantero', 'Cuerpo delantero al doblez', g, false, fin);
  const back = bodicePiece('cuerpo-espalda', 'Cuerpo de espalda (par en espejo)', { ...g, bext: ext }, true, { ...fin, centre: 'dobladillo', centreAllowance: 2 * ext, labels: { ...fin.labels, centro: 'Canto de espalda (vista doblada)' } }, { qty: 2, mirrorPairs: true });
  back.lines.push({ id: 'centro-espalda', kind: 'referencia', a: P(0, g.bd + 4), b: P(0, g.L), label: 'Centro de espalda: los dos lados se cruzan aquí' });
  buttonMarks(back, 0, g.bd + 12 * s, g.L - 20 * s, 2, 'boton', 'Broche o botón (espalda cruzada)');
  // Bubble shorts: front and back on the fold, gathered into the bodice waist; legs with elastic; crotch opens with snaps.
  const W = g.q * gather, rise = k.rise + 30 * s, cw = 35 * s, sideH = rise * .5;
  const shorts = (id: string, name: string, extraRise: number) => {
    const R = rise + extraRise, piece = outline(id, name, [P(0, 0), P(W, 0), P(W, sideH), P(cw, R), P(0, R)], [
      edge('cintura', 'Cintura (fruncir al cuerpo)', 'costura', sa), edge('costado', 'Costado', 'costura', sa),
      edge('pierna', 'Pierna (ribete con elástico)', 'sin-margen', 0, P(W - (W - cw) * .1, sideH + (R - sideH) * .55), P(cw + (W - cw) * .35, R)),
      edge('entrepierna', 'Entrepierna (cinta de broches)', 'costura', sa), edge('centro', 'Centro (al doblez)', 'doblez', 0)], { onFold: true });
    piece.grain = { a: P(W * .4, 15), b: P(W * .4, sideH) };
    return piece;
  };
  const sf = shorts('short-delantero', 'Short delantero al doblez', 0), sb = shorts('short-espalda', 'Short de espalda al doblez', 20 * s);
  const attach = len(front, 'sisa-superior') + len(back, 'sisa-superior'), r1 = attach / Math.PI, r2 = r1 + fd, O = P(0, 0);
  const a1 = arc(O, r1, Math.PI, 1.5 * Math.PI), a2 = arc(O, r1, 1.5 * Math.PI, 2 * Math.PI), b1 = arc(O, r2, 2 * Math.PI, 1.5 * Math.PI), b2 = arc(O, r2, 1.5 * Math.PI, Math.PI);
  const flutter = outline('volante', 'Volante de manga', [a1.start, a2.start, P(r1, 0), P(r2, 0), b2.start, P(-r2, 0)], [
    edge('union-a', 'Unión a la sisa delantera', 'sin-margen', 0, a1.c1, a1.c2), edge('union-b', 'Unión a la sisa de espalda', 'sin-margen', 0, a2.c1, a2.c2),
    edge('extremo-der', 'Extremo (dobladillo estrecho)', 'dobladillo', 6), edge('volante-b', 'Canto del volante', 'dobladillo', 6, b1.c1, b1.c2),
    edge('volante-a', 'Canto del volante', 'dobladillo', 6, b2.c1, b2.c2), edge('extremo-izq', 'Extremo (dobladillo estrecho)', 'dobladillo', 6)], { qty: 2 });
  flutter.grain = { a: P(0, -r1 - fd * .2), b: P(0, -r2 + fd * .2) };
  const neckline = 2 * neckLen(front) + 2 * neckLen(back), arm = armhole(front) + armhole(back), leg = len(sf, 'pierna') + len(sb, 'pierna');
  const pieces: Piece[] = [front, back, sf, sb, flutter, bindingStrip('bies-escote', 'Ribete del escote', neckline, bias, 1, 10), bindingStrip('bies-sisa', 'Ribete de sisa', arm, bias, 2, 0), bindingStrip('bies-pierna', 'Ribete-jareta de pierna', leg, bias, 2, 0)];
  if (straps) {
    const strapL = g.L - g.sy + 10 * s;
    const strap = rectangle('tirante', 'Tirante decorativo (cosido plano)', strapL, 2 * 12 * s, [edge('a', 'Canto', 'costura', sa), edge('b', 'Extremo (hombro)', 'costura', sa), edge('c', 'Canto', 'costura', sa), edge('d', 'Extremo (cintura)', 'costura', sa)], { qty: 2, fabric: 'contraste' }, true);
    strap.lines.push({ id: 'doblez', kind: 'doblez', a: P(0, 12 * s), b: P(strapL, 12 * s), label: 'Doblar a lo largo' });
    front.lines.push({ id: 'tirante', kind: 'colocacion', a: P((g.nw + g.sh) / 2, g.sy * .5), b: P(g.q * .55, g.L), label: 'Tirante decorativo: coser plano sobre esta línea' });
    pieces.push(strap, ...bowPieces('', 30 * s, 11 * s, 6, 'contraste', 2));
  }
  const seams: SeamRelation[] = [...bodySeams('cuerpo-delantero', 'cuerpo-espalda'),
    equal('short-costados', 'Costados del short', [{ pieceId: 'short-delantero', edgeIds: ['costado'] }], [{ pieceId: 'short-espalda', edgeIds: ['costado'] }]),
    equal('entrepierna', 'Entrepierna con cinta de broches', [{ pieceId: 'short-delantero', edgeIds: ['entrepierna'] }], [{ pieceId: 'short-espalda', edgeIds: ['entrepierna'] }]),
    ratio('cintura', 'Short fruncido al cuerpo', 'fruncido', [{ pieceId: 'short-delantero', edgeIds: ['cintura'] }], [{ pieceId: 'cuerpo-delantero', edgeIds: ['bajo'] }], gather, .03),
    equal('volante-sisa', 'Volante con el tramo superior de la sisa', [{ pieceId: 'volante', edgeIds: ['union-a', 'union-b'] }], [{ pieceId: 'cuerpo-delantero', edgeIds: ['sisa-superior'] }, { pieceId: 'cuerpo-espalda', edgeIds: ['sisa-superior'] }])];
  const legElastic = k.thigh + 25 * s;
  return {
    pieces, seams,
    notices: [experimentalNotice('pelele-volantes-experimental', 'Pelele de volantes'),
      leg < k.thigh + 40 * s ? { level: 'error', code: 'pierna', message: 'La abertura de pierna queda justa. Aumenta el fruncido.' } : { level: 'ok', code: 'pierna', message: `Pierna de ${cm(leg)} recogida a ${cm(legElastic)} con elástico.` },
      { level: 'ok', code: 'sin-cintas', message: 'Lazos y tirantes son decorativos y van cosidos fijos.' },
      { level: 'aviso', code: 'broches-bebe', message: 'Usa broches de presión infantiles en la espalda o revisa los botones antes de cada uso.' }],
    checks: [{ key: 'pecho', label: 'Contorno de pecho del cuerpo', body: k.chest, ease, target: k.chest + ease, measured: 2 * front.nodes[4].x + 2 * back.nodes[4].x, tolerance: .5 }],
    materials: [
      { id: 'tela', label: 'Pana fina, lino o algodón', qty: 'Según acomodo' }, { id: 'bies', label: `Bies de ${cm(bias)}`, qty: cm(neckline + 2 * arm + 2 * leg + 60) },
      { id: 'elastico', label: 'Elástico de 6 mm', qty: `Cintura ${cm(4 * g.q * .95)} y 2 × ${cm(legElastic)} (piernas)` },
      { id: 'cinta-broches', label: 'Cinta de broches o 3 broches de presión', qty: `2 × ${cm(2 * cw + 20)}` }, { id: 'broches-espalda', label: 'Broches o botones para la espalda', qty: '2' }
    ],
    assumptions: [`Cuerpo con pecho + ${cm(ease)} hasta la cintura; short abullonado fruncido ${gather.toFixed(1)} veces, con espacio para el pañal.`, 'Elástico de cintura cosido sobre el margen de la unión; piernas con ribete que hace de jareta.', 'Volantes de manga en semicírculo exacto sobre el tramo superior de la sisa.', 'Las medidas de la referencia no eran coherentes; el trazo sale de las medidas de la talla.'],
    steps: [
      { id: 'cortar', title: 'Corta', detail: 'Cuerpos, shorts, volantes, ribetes' + (straps ? ', tirantes y lazos.' : '.'), pieces: pieces.map(x => x.id) },
      { id: 'cuerpo', title: 'Cuerpo', detail: 'Dobla las vistas de espalda. Une hombros, coloca los volantes sobre la sisa, ribetea sisas y escote, y cierra los costados del cuerpo.', pieces: ['cuerpo-delantero', 'cuerpo-espalda', 'volante', 'bies-sisa', 'bies-escote'], seams: ['hombros', 'volante-sisa', 'costados'] },
      ...(straps ? [{ id: 'tirantes', title: 'Tirantes decorativos', detail: 'Cose los tirantes en tubo y pespuntéalos planos sobre su línea; arma los lazos y cóselos fijos en la cintura.', pieces: ['tirante', 'lazo', 'lazo-colas', 'lazo-nudo', 'cuerpo-delantero'] }] : []),
      { id: 'short', title: 'Short', detail: 'Une los costados del short, ribetea las piernas formando jareta y pasa el elástico.', pieces: ['short-delantero', 'short-espalda', 'bies-pierna'], seams: ['short-costados'] },
      { id: 'cintura', title: 'Une cuerpo y short', detail: 'Frunce el short y cóselo al cuerpo. Cose el elástico de cintura estirado sobre el margen de la unión.', pieces: ['cuerpo-delantero', 'cuerpo-espalda', 'short-delantero', 'short-espalda'], seams: ['cintura'] },
      { id: 'broches', title: 'Broches', detail: 'Cose la cinta de broches en la entrepierna (delantero y espalda se superponen) y los broches de la espalda.', pieces: ['short-delantero', 'short-espalda', 'cuerpo-espalda'], seams: ['entrepierna'] }
    ]
  };
}

export const rufflesRomperGenerator: PatternGenerator = {
  id: 'pelele-volantes', name: 'Pelele de bebé con volantes', status: 'experimental',
  summary: 'Pelele con mangas de volante, short abullonado, broches en la entrepierna y tirantes decorativos con lazos.',
  requiredMeasures: ['pecho', 'cuello', 'hombros', 'talleEspalda', 'tiro'], optionalMeasures: ['muslo', 'estatura'],
  defaults: rufflesRomperDefaults, generate: generateRufflesRomper,
  params: [
    { key: 'tirantes', label: 'Tirantes decorativos y lazos', group: 'diseno', type: 'choice', choices: [{ value: 'si', label: 'Sí' }, { value: 'no', label: 'No' }] },
    { key: 'fruncido', label: 'Fruncido del short', group: 'diseno', type: 'ratio', min: 1.1, max: 2 },
    { key: 'anchoVolante', label: 'Ancho del volante de manga', group: 'diseno', type: 'length', min: 25, max: 100 },
    { key: 'anchoBies', label: 'Ancho del ribete', group: 'diseno', type: 'length', min: 5, max: 12 },
    { key: 'holgura', label: 'Holgura de pecho', group: 'holgura', type: 'length', min: 40, max: 160 },
    margin
  ]
};

// ------------------------------------------------------------------ Diadema con lazo
export function headbandDefaults(ctx: GeneratorContext): Params {
  const k = kidBody(ctx), s = clamp(k.chest / 560, .7, 1.45);
  return { anchoBanda: round1(clamp(28 * s, 20, 45)), proporcion: .85, margen: 6 };
}

export function generateHeadband(ctx: GeneratorContext, params: Params): GeneratorResult {
  if (!isKid(ctx)) return notKid('diadema-talla');
  const p = { ...headbandDefaults(ctx), ...params }, k = kidBody(ctx), s = clamp(k.chest / 560, .7, 1.45);
  const w = num(p, 'anchoBanda'), r = num(p, 'proporcion'), sa = num(p, 'margen');
  if (!finite(w, r, sa) || w < 15 || w > 60 || r < .75 || r > .95 || sa < 4 || sa > 10) return invalid('diadema-medidas', 'Revisa ancho, proporción y margen.');
  const band = rectangle('banda', 'Banda (punto elástico)', k.head * r, 2 * w, [edge('canto-a', 'Canto largo', 'costura', sa), edge('extremo-a', 'Extremo', 'costura', sa), edge('canto-b', 'Canto largo', 'costura', sa), edge('extremo-b', 'Extremo', 'costura', sa)], { fabric: 'punto-elastico' }, true);
  band.lines.push({ id: 'doblez', kind: 'doblez', a: P(0, w), b: P(k.head * r, w), label: 'Doblar a lo largo' });
  const pieces = [band, ...bowPieces('', 45 * s, 18 * s, 6, 'principal')];
  return {
    pieces, seams: [],
    notices: [experimentalNotice('diadema-experimental', 'Diadema'), { level: 'aviso', code: 'diadema-supervision', message: 'Usa la diadema solo con supervisión y quítala para dormir: puede deslizarse al cuello.' }],
    checks: [{ key: 'banda', label: 'Contorno de la banda', body: k.head, target: k.head * r, measured: len(band, 'canto-a'), tolerance: .5 }],
    materials: [{ id: 'punto', label: 'Punto con 40 % de elasticidad o más', qty: `${cm(k.head * r + 2 * sa)} × ${cm(2 * w + 2 * sa)}` }, { id: 'tela', label: 'Retazo para el lazo', qty: '25 × 15 cm' }],
    assumptions: [`Banda al ${Math.round(r * 100)} % del contorno de cabeza; el punto debe estirar para pasar sin apretar.`],
    steps: [
      { id: 'banda', title: 'Banda', detail: 'Dobla a lo largo, cose el canto con puntada elástica, voltea y une los extremos en anillo.', pieces: ['banda'] },
      { id: 'lazo', title: 'Lazo', detail: 'Arma el lazo y envuelve con el nudo la unión de la banda; cóselo fijo.', pieces: ['lazo', 'lazo-colas', 'lazo-nudo'] }
    ]
  };
}

export const headbandGenerator: PatternGenerator = {
  id: 'diadema-lazo', name: 'Diadema elástica con lazo', status: 'experimental',
  summary: 'Banda de punto al contorno de cabeza con lazo grande cosido sobre la unión.',
  requiredMeasures: ['cabeza'], optionalMeasures: ['pecho'],
  defaults: headbandDefaults, generate: generateHeadband,
  params: [
    { key: 'anchoBanda', label: 'Ancho de la banda', group: 'diseno', type: 'length', min: 15, max: 60 },
    { key: 'proporcion', label: 'Banda / contorno de cabeza', group: 'holgura', type: 'ratio', min: .75, max: .95 },
    { key: 'margen', label: 'Margen de costura', group: 'margenes', type: 'length', min: 4, max: 10 }
  ]
};

export const KIDS_TOPS_GENERATORS = [peasantTopGenerator, buttonTopGenerator, casingDressGenerator, rufflesRomperGenerator, headbandGenerator];
