import { num, str, isChild, type GeneratorContext, type GeneratorResult, type Params, type PatternGenerator } from '../generator';
import type { Issue, Piece, SeamRelation } from '../types';
import { P, clamp, cm, copyPiece, edge, equal, finite, invalid, len, lens, outline, ratio, rectangle, solve } from './kidsShared';

/** Rib folded once lengthwise: both long edges are sewn together to the garment. */
function ribStrip(id: string, name: string, length: number, finished: number, qty: number, sa: number): Piece {
  const strip = rectangle(id, name, length, 2 * finished, [edge('largo-superior', 'Cantos que se unen a la prenda', 'costura', sa), edge('extremo-der', 'Extremo', 'costura', sa), edge('largo-inferior', 'Cantos que se unen a la prenda', 'costura', sa), edge('extremo-izq', 'Extremo', 'costura', sa)], { qty, fabric: 'punto-elastico' }, true);
  strip.lines.push({ id: 'doblez', kind: 'doblez', a: P(0, finished), b: P(length, finished), label: 'Doblar a lo largo' });
  strip.notes = [`Rib doblado: queda de ${cm(finished)} de alto. Estíralo al coserlo, repartiendo por cuartos.`];
  return strip;
}

/* Prendas oversize de hombro caído: camiseta de punto, sobrecamisa o chaqueta
 * de trabajo con pie de cuello y tapeta, y bomber con rib y cierre separable.
 * Un mismo bloque: el hombro se prolonga sobre el brazo, la sisa es casi recta y
 * la copa de la manga se calcula para medir exactamente lo mismo que la sisa. */

export type OversizeKind = 'camiseta' | 'sobrecamisa' | 'bomber';
const BASE: Record<OversizeKind, { ease: number; drop: number; length: number; fabric: 'punto' | 'plano'; sleeveEase: number }> = {
  camiseta: { ease: .26, drop: 70, length: .42, fabric: 'punto', sleeveEase: 110 },
  sobrecamisa: { ease: .30, drop: 70, length: .45, fabric: 'plano', sleeveEase: 130 },
  bomber: { ease: .28, drop: 60, length: .33, fabric: 'plano', sleeveEase: 140 }
};

export function oversizeDefaults(ctx: GeneratorContext): Params {
  return { prenda: 'camiseta', manga: 'corta', bolsillos: 'pecho', largoExtra: 0, largoMangaExtra: 0, holguraExtra: 0, caidaExtra: 0, margen: 10, dobladillo: isChild(ctx.kind) ? 20 : 25 };
}

export function generateOversize(ctx: GeneratorContext, params: Params): GeneratorResult {
  const p = { ...oversizeDefaults(ctx), ...params }, b = ctx.body;
  const kind = str(p, 'prenda', 'camiseta') as OversizeKind, base = BASE[kind];
  if (!base) return invalid('oversize-prenda', 'Elige camiseta, sobrecamisa o bomber.');
  const chest = b.pecho ?? 0, s = clamp(chest / 960, .45, 1.35), est = b.estatura ?? chest * 1.75;
  const neck = b.cuello ?? chest * .4, shoulders = b.hombros ?? chest * .44, talle = b.talleEspalda ?? chest * .43;
  const arm = b.largoManga ?? est * .35, bicep = b.brazo ?? chest * .32, wrist = b.muneca ?? chest * .17;
  const ease = chest * base.ease + num(p, 'holguraExtra'), Q = (chest + ease) / 4;
  const drop = base.drop * s + num(p, 'caidaExtra');
  const L = est * base.length + num(p, 'largoExtra'), sa = num(p, 'margen'), hem = num(p, 'dobladillo');
  const longSleeve = kind !== 'camiseta' || str(p, 'manga', 'corta') === 'larga', pockets = str(p, 'bolsillos', 'pecho');
  if (!finite(chest, ease, L, sa, hem, drop) || chest < 380 || chest > 1600 || L < 150 || L > 1200 || ease < 40 || drop < 0 || drop > 160 * s || sa < 6 || sa > 15 || hem < 10 || hem > 45 || !['pecho', 'tres', 'ninguno'].includes(pockets))
    return invalid('oversize-medidas', 'Revisa pecho, largo, holgura y caída de hombro.');
  if (kind !== 'camiseta' && (ctx.kind === 'bebe')) return invalid('oversize-bebe', 'Esta prenda no está pensada para bebé. Elige la camiseta.');

  const neckHalf = neck * .17 + 10 * s, fD = neck * (kind === 'camiseta' ? .21 : .19), bD = 18 * s;
  // Keep a little horizontal run under the arm so the armhole curve is never tighter than its allowance.
  const shoulderHalf = Math.min(shoulders / 2 + drop, Q - 40 * s), dy = .12 * (shoulderHalf - neckHalf);
  const armDepth = talle * .55 + ease * .08;
  if (shoulderHalf < neckHalf + 40 * s || armDepth > L - 80) return invalid('oversize-proporcion', 'El largo es demasiado corto para la sisa o el hombro no supera el escote. Revisa largo y caída.');
  const Sp = P(shoulderHalf, dy), U = P(Q, armDepth);
  // Dropped-shoulder armholes are shallow: reach the underarm on a diagonal instead of turning flat.
  const sisa = () => edge('sisa', 'Sisa', 'costura', sa, P(Sp.x, Sp.y + (U.y - Sp.y) * .45), P(U.x - (U.x - Sp.x) * .45, U.y - (U.y - Sp.y) * .22));
  const bodyHem = kind === 'bomber' ? edge('bajo', 'Bajo (une la banda de rib)', 'costura', sa) : edge('bajo', 'Bajo', 'dobladillo', hem);
  // Shallow back necklines get flatter handles: a tight turn at the shoulder would distort the allowance.
  const necklineEdge = (depth: number) => depth < neckHalf * .6
    ? edge('cuello', 'Escote', 'costura', sa, P(neckHalf * .5, depth), P(neckHalf * .85, depth * .15))
    : edge('cuello', 'Escote', 'costura', sa, P(neckHalf * .55, depth), P(neckHalf, depth * .45));

  const back = outline('espalda', 'Espalda al doblez', [P(0, bD), P(neckHalf, 0), Sp, U, P(Q, L), P(0, L)], [
    necklineEdge(bD), edge('hombro', 'Hombro', 'costura', sa), sisa(), edge('costado', 'Costado', 'costura', sa), bodyHem, edge('centro', 'Centro de espalda (al doblez)', 'doblez', 0)], { onFold: true });
  let front: Piece;
  const ext = 18 * s, fw = 60 * s;
  if (kind === 'camiseta') front = outline('delantero', 'Delantero al doblez', [P(0, fD), P(neckHalf, 0), Sp, U, P(Q, L), P(0, L)], [
    necklineEdge(fD), edge('hombro', 'Hombro', 'costura', sa), sisa(), edge('costado', 'Costado', 'costura', sa), bodyHem, edge('centro', 'Centro delantero (al doblez)', 'doblez', 0)], { onFold: true });
  else if (kind === 'sobrecamisa') {
    front = outline('delantero', 'Delantero con tapeta (par en espejo)', [P(0, fD), P(neckHalf, 0), Sp, U, P(Q, L), P(-ext, L), P(-ext - fw, L), P(-ext - fw, fD), P(-ext, fD)], [
      necklineEdge(fD), edge('hombro', 'Hombro', 'costura', sa), sisa(), edge('costado', 'Costado', 'costura', sa), bodyHem,
      edge('bajo-vista', 'Bajo de la vista', 'dobladillo', hem), edge('vista-canto', 'Canto de la vista (sobrehilar)', 'sin-margen', 0),
      edge('vista-superior', 'Borde superior de la vista', 'costura', sa), edge('cuello-ext', 'Escote de la tapeta', 'costura', sa)], { qty: 2, mirrorPairs: true });
    front.lines.push({ id: 'doblez-vista', kind: 'doblez', a: P(-ext, fD), b: P(-ext, L), label: 'Doblar la vista hacia dentro' }, { id: 'centro-delantero', kind: 'referencia', a: P(0, fD), b: P(0, L), label: 'Centro delantero: botones y ojales' });
    const count = Math.max(4, Math.round((L - fD - 60 * s) / (95 * s)) + 1);
    for (let i = 0; i < count; i++) front.marks.push({ id: `boton-${i}`, kind: 'boton', at: P(0, fD + 25 * s + (L - fD - 85 * s) * i / (count - 1)), label: 'Botón (delantero izquierdo) / ojal vertical (derecho)' });
  } else {
    front = outline('delantero', 'Delantero (par en espejo)', [P(0, fD), P(neckHalf, 0), Sp, U, P(Q, L), P(0, L)], [
      necklineEdge(fD), edge('hombro', 'Hombro', 'costura', sa), sisa(), edge('costado', 'Costado', 'costura', sa), bodyHem, edge('cierre', 'Centro delantero (cierre)', 'costura', sa)], { qty: 2, mirrorPairs: true });
  }
  front.grain = { a: P(Q * .5, armDepth), b: P(Q * .5, L - 40 * s) };
  back.grain = { a: P(Q * .5, armDepth), b: P(Q * .5, L - 40 * s) };

  // Sleeve: flat drop-shoulder cap solved to the armhole length, no ease.
  const armLen = len(front, 'sisa');
  let sw = Math.min(bicep + base.sleeveEase * s, 2 * armLen * .96);
  const capFor = (h: number, width = sw) => { const t = outline('t', 't', [P(0, 0), P(width / 2, h), P(0, h + 10)], [edge('copa', 'c', 'costura', 0, P(width / 2 * .4, 0), P(width / 2 * .7, h)), edge('x', 'x', 'costura', 0), edge('y', 'y', 'costura', 0)]); return len(t, 'copa'); };
  if (capFor(8) > armLen) sw = solve(w => capFor(8, w), armLen, 50, sw);
  const capH = solve(h => capFor(h), armLen, 8, armDepth);
  const cuffH = kind === 'bomber' ? 60 * s : 0;
  const sleeveLen = (longSleeve ? arm - (shoulderHalf - shoulders / 2) - cuffH : clamp(arm * .38, 100 * s, 300)) + num(p, 'largoMangaExtra');
  const cw = kind === 'bomber' ? Math.max(wrist * 1.6, sw * .6) : longSleeve ? Math.max(wrist + (kind === 'camiseta' ? 70 : 140) * s, sw * (kind === 'camiseta' ? .55 : .7)) : sw * .9;
  if (sleeveLen < capH + 40 * s || cw > sw) return invalid('oversize-manga', 'La manga es demasiado corta o el puño más ancho que la manga. Ajusta el largo de manga.');
  const sleeve = outline('manga', 'Manga (par en espejo)', [P(0, 0), P(sw / 2, capH), P(cw / 2, sleeveLen), P(-cw / 2, sleeveLen), P(-sw / 2, capH)], [
    edge('copa-espalda', 'Copa (espalda)', 'costura', sa, P(sw / 2 * .4, 0), P(sw / 2 * .7, capH)), edge('costura-espalda', 'Costura bajo manga', 'costura', sa),
    kind === 'bomber' ? edge('puno', 'Bajo de manga (une el puño de rib)', 'costura', sa) : edge('puno', 'Bajo de manga', 'dobladillo', hem),
    edge('costura-delantera', 'Costura bajo manga', 'costura', sa), edge('copa-delantera', 'Copa (delantero)', 'costura', sa, P(-sw / 2 * .7, capH), P(-sw / 2 * .4, 0))], { qty: 2, mirrorPairs: true });
  sleeve.notches.push({ id: 'hombro', edgeId: 'copa-espalda', s: 0, count: 1, label: 'Costura de hombro' }, { id: 'espalda', edgeId: 'copa-espalda', s: armLen / 2, count: 2, label: 'Espalda' });
  sleeve.grain = { a: P(0, capH + 20 * s), b: P(0, sleeveLen - 30 * s) };

  const pieces: Piece[] = [front, back, sleeve];
  const seams: SeamRelation[] = [
    equal('hombros', 'Hombros', [{ pieceId: 'delantero', edgeIds: ['hombro'] }], [{ pieceId: 'espalda', edgeIds: ['hombro'] }]),
    equal('costados', 'Costados', [{ pieceId: 'delantero', edgeIds: ['costado'] }], [{ pieceId: 'espalda', edgeIds: ['costado'] }]),
    equal('manga-delantero', 'Copa con sisa delantera', [{ pieceId: 'manga', edgeIds: ['copa-delantera'] }], [{ pieceId: 'delantero', edgeIds: ['sisa'] }]),
    equal('manga-espalda', 'Copa con sisa de espalda', [{ pieceId: 'manga', edgeIds: ['copa-espalda'] }], [{ pieceId: 'espalda', edgeIds: ['sisa'] }]),
    equal('bajo-manga', 'Costura bajo manga', [{ pieceId: 'manga', edgeIds: ['costura-espalda'] }], [{ pieceId: 'manga', edgeIds: ['costura-delantera'] }])
  ];
  const materials: GeneratorResult['materials'] = [];
  const steps: GeneratorResult['steps'] = [{ id: 'cortar', title: 'Corta y marca', detail: 'Corta todas las piezas con el hilo indicado; los pares van en espejo. Transfiere piquetes de hombro y espalda en la manga.', pieces: [] }];
  const halfNeck = len(back, 'cuello') + len(front, 'cuello');
  const notices: Issue[] = [{ level: 'aviso', code: 'oversize-experimental', message: 'Patrón experimental: corta una muestra en tela económica y revisa caída de hombro, largo de manga y holgura.' }];

  if (kind === 'camiseta') {
    const neckline = 2 * halfNeck, k = .85, band = ribStrip('cuello-rib', 'Tira de rib del cuello', neckline * k, 18 * s, 1, sa);
    pieces.push(band);
    seams.push(ratio('cuello', 'Rib estirado al escote', 'estirado', [{ pieceId: 'delantero', edgeIds: ['cuello'], factor: 2 }, { pieceId: 'espalda', edgeIds: ['cuello'], factor: 2 }], [{ pieceId: 'cuello-rib', edgeIds: ['largo-superior'] }], 1 / k, .01));
    if (ctx.fabric !== 'punto') notices.push({ level: 'aviso', code: 'camiseta-punto', message: 'La camiseta está pensada para punto (jersey). En tela plana revisa que la cabeza pase por el escote.' });
    materials.push({ id: 'tela', label: 'Jersey de algodón de 180–240 g/m²', qty: 'Según acomodo' }, { id: 'rib', label: 'Rib 1×1 para el cuello', qty: `${cm(neckline * k + 2 * sa)} × ${cm(36 * s + 2 * sa)}` }, { id: 'hilo', label: 'Hilo para punto y aguja de punta redonda', qty: '1 carrete' });
    steps.push({ id: 'hombros', title: 'Une hombros', detail: 'Cose los hombros con puntada elástica o remalladora; añade cinta de refuerzo.', pieces: ['delantero', 'espalda'], seams: ['hombros'] },
      { id: 'cuello', title: 'Cuello de rib', detail: 'Cierra la tira en anillo, dóblala y repártela por cuartos en el escote. Cóse estirando solo el rib y pespuntea el margen hacia el cuerpo.', pieces: ['cuello-rib', 'delantero', 'espalda'], seams: ['cuello'] });
  } else if (kind === 'sobrecamisa') {
    const hs = 30 * s, hc = 62 * s, Ls = halfNeck + ext;
    const stand = outline('pie-cuello', 'Pie de cuello (al doblez; exterior e interior)', [P(0, 0), P(Ls, 0), P(Ls, hs), P(0, hs)], [
      edge('base', 'Une el escote', 'costura', sa), edge('frente', 'Extremo (botón)', 'costura', sa), edge('superior', 'Une el cuello', 'costura', sa), edge('centro', 'Centro de espalda (al doblez)', 'doblez', 0)], { qty: 2, onFold: true });
    stand.marks.push({ id: 'boton', kind: 'boton', at: P(Ls - ext, hs / 2), label: 'Botón del pie de cuello' });
    const collar = outline('cuello', 'Cuello (al doblez; superior y bajo cuello)', [P(0, 0), P(halfNeck, 0), P(halfNeck + 18 * s, hc + 8 * s), P(0, hc)], [
      edge('base', 'Une el pie de cuello', 'costura', sa), edge('punta', 'Punta', 'costura', sa), edge('canto', 'Canto del cuello', 'costura', sa), edge('centro', 'Centro de espalda (al doblez)', 'doblez', 0)], { qty: 2, onFold: true });
    pieces.push(stand, collar);
    seams.push(equal('pie-escote', 'Pie de cuello con el escote', [{ pieceId: 'pie-cuello', edgeIds: ['base'] }], [{ pieceId: 'espalda', edgeIds: ['cuello'] }, { pieceId: 'delantero', edgeIds: ['cuello', 'cuello-ext'] }], 1),
      equal('cuello-pie', 'Cuello con el pie (hasta el centro delantero)', [{ pieceId: 'cuello', edgeIds: ['base'] }], [{ pieceId: 'espalda', edgeIds: ['cuello'] }, { pieceId: 'delantero', edgeIds: ['cuello'] }], 1));
    const pocket = (id: string, name: string, w: number, h: number, qty: number) => outline(id, name, [P(0, 0), P(w, 0), P(w, h - 14 * s), P(w / 2, h), P(0, h - 14 * s)], [
      edge('boca', 'Boca (doble doblez)', 'dobladillo', 25), edge('lado-der', 'Lado', 'costura', 8), edge('punta-der', 'Punta', 'costura', 8), edge('punta-izq', 'Punta', 'costura', 8), edge('lado-izq', 'Lado', 'costura', 8)], { qty });
    const chestW = clamp(Q * .4, 80, 140), lowW = clamp(Q * .58, 110, 200);
    if (pockets !== 'ninguno') {
      pieces.push(pocket('bolsillo-pecho', 'Bolsillo de pecho', chestW, chestW * 1.15, pockets === 'tres' ? 1 : 2));
      front.lines.push({ id: 'bolsillo-pecho', kind: 'colocacion', a: P(Q * .32, armDepth * .62), b: P(Q * .32 + chestW, armDepth * .62), label: 'Bolsillo de pecho: borde superior' });
    }
    if (pockets === 'tres') {
      pieces.push(pocket('bolsillo-bajo', 'Bolsillo bajo', lowW, lowW * 1.05, 2));
      front.lines.push({ id: 'bolsillo-bajo', kind: 'colocacion', a: P(Q * .22, L - lowW * 1.05 - 70 * s), b: P(Q * .22 + lowW, L - lowW * 1.05 - 70 * s), label: 'Bolsillo bajo: borde superior' });
      if (L - lowW * 1.05 - 70 * s < armDepth + 30) return invalid('oversize-bolsillo', 'El bolsillo bajo no cabe con este largo. Alarga la prenda o elige bolsillos de pecho.');
    }
    materials.push({ id: 'tela', label: 'Franela, sarga, lona ligera, pana o mezclilla', qty: 'Según acomodo' }, { id: 'entretela', label: 'Entretela para cuello, pie de cuello y tapetas', qty: 'Cuello, pie y dos tiras de tapeta' },
      { id: 'botones', label: 'Botones de 15–18 mm', qty: `${front.marks.length + 1}` }, { id: 'hilo', label: 'Hilo de coser', qty: '1 carrete' });
    steps.push({ id: 'tapetas', title: 'Tapetas y bolsillos', detail: 'Pega entretela en la vista, sobrehila su canto y dóblala por la línea. Prepara los bolsillos (doble doblez en la boca, márgenes planchados) y cóselos sobre sus líneas.', pieces: ['delantero', ...(pockets !== 'ninguno' ? ['bolsillo-pecho'] : []), ...(pockets === 'tres' ? ['bolsillo-bajo'] : [])] },
      { id: 'hombros', title: 'Une hombros', detail: 'Cose los hombros con costura francesa o cargada.', pieces: ['delantero', 'espalda'], seams: ['hombros'] },
      { id: 'cuello', title: 'Cuello y pie de cuello', detail: 'Arma el cuello (superior y bajo cuello), voltea y pespuntea. Insértalo entre las dos capas del pie, cose el pie al escote y ciérralo por dentro con pespunte. El pie llega al borde de la tapeta.', pieces: ['cuello', 'pie-cuello', 'delantero', 'espalda'], seams: ['pie-escote', 'cuello-pie'] });
  } else {
    const neckline = 2 * halfNeck, kn = .85, kb = .85, bandH = 60 * s, collarH = 45 * s;
    const collar = ribStrip('cuello-rib', 'Cuello de rib', neckline * kn, collarH, 1, sa);
    const band = ribStrip('banda', 'Banda de rib del bajo', 2 * len(front, 'bajo') * kb + 2 * len(back, 'bajo') * kb, bandH, 1, sa);
    const cuff = ribStrip('puno', 'Puño de rib', wrist + 30 * s, cuffH, 2, sa);
    const welt = rectangle('vivo', 'Vivo del bolsillo', 160 * s, 2 * 30 * s, [edge('a', 'Canto', 'costura', sa), edge('b', 'Extremo', 'costura', sa), edge('c', 'Canto', 'costura', sa), edge('d', 'Extremo', 'costura', sa)], { qty: 2 });
    const bag = rectangle('bolsa', 'Bolsa del bolsillo de vivo', 180 * s, 190 * s, [edge('a', 'Canto', 'costura', sa), edge('b', 'Lado', 'costura', sa), edge('c', 'Fondo', 'costura', sa), edge('d', 'Lado', 'costura', sa)], { qty: 4, fabric: 'forro' });
    front.lines.push({ id: 'bolsillo-vivo', kind: 'colocacion', a: P(Q * .38, L - 200 * s), b: P(Q * .56, L - 50 * s), label: 'Boca del bolsillo de vivo (cortar)' });
    pieces.push(collar, band, cuff, welt, bag,
      copyPiece(front, 'delantero-forro', 'Forro del delantero (par en espejo)', { fabric: 'forro' }), copyPiece(back, 'espalda-forro', 'Forro de la espalda al doblez', { fabric: 'forro' }), copyPiece(sleeve, 'manga-forro', 'Forro de la manga (par en espejo)', { fabric: 'forro' }));
    seams.push(ratio('cuello', 'Rib estirado al escote', 'estirado', [{ pieceId: 'delantero', edgeIds: ['cuello'], factor: 2 }, { pieceId: 'espalda', edgeIds: ['cuello'], factor: 2 }], [{ pieceId: 'cuello-rib', edgeIds: ['largo-superior'] }], 1 / kn, .01),
      ratio('banda', 'Rib estirado al bajo', 'estirado', [{ pieceId: 'delantero', edgeIds: ['bajo'], factor: 2 }, { pieceId: 'espalda', edgeIds: ['bajo'], factor: 2 }], [{ pieceId: 'banda', edgeIds: ['largo-superior'] }], 1 / kb, .01),
      ratio('puno', 'Manga fruncida al puño de rib', 'fruncido', [{ pieceId: 'manga', edgeIds: ['puno'] }], [{ pieceId: 'puno', edgeIds: ['largo-superior'] }], cw / (wrist + 30 * s), .02));
    const zip = [400, 450, 500, 550, 600, 650, 700, 750].reverse().find(z => z <= L - fD + bandH - 10) ?? 400;
    materials.push({ id: 'tela', label: 'Satén, nailon, gabardina, mezclilla o pana', qty: 'Según acomodo' }, { id: 'forro', label: 'Forro de acetato o algodón', qty: 'Cuerpo y mangas' },
      { id: 'rib', label: 'Rib 2×2 para cuello, puños y bajo', qty: `${cm(len(band, 'largo-superior') + len(collar, 'largo-superior') + 2 * len(cuff, 'largo-superior'))} en total` },
      { id: 'cierre', label: `Cierre separable de ${cm(zip)}`, qty: '1' }, { id: 'hilo', label: 'Hilo de coser', qty: '1 carrete' });
    steps.push({ id: 'bolsillos', title: 'Bolsillos de vivo', detail: 'Marca la boca en cada delantero, cose el vivo y la primera bolsa, corta la boca en Y, voltea, asienta el vivo y cose la segunda bolsa. Remata los triángulos.', pieces: ['delantero', 'vivo', 'bolsa'] },
      { id: 'hombros', title: 'Une hombros y costados', detail: 'Arma el exterior y, por separado, el forro.', pieces: ['delantero', 'espalda', 'delantero-forro', 'espalda-forro'], seams: ['hombros'] },
      { id: 'rib', title: 'Rib y cierre', detail: 'Cose la banda, el cuello y los puños de rib estirándolos por cuartos. Coloca el cierre separable en los centros delanteros, del cuello a la banda. Une el forro por los centros, el cuello y la banda, voltea y pespuntea.', pieces: ['cuello-rib', 'banda', 'puno', 'delantero', 'espalda'], seams: ['cuello', 'banda', 'puno'] });
  }
  steps.push({ id: 'mangas', title: 'Monta las mangas en plano', detail: 'Con los costados abiertos, centra el piquete de la copa en el hombro (piquete doble hacia la espalda) y cose la copa a la sisa: miden lo mismo, sin embebido.', pieces: ['manga', 'delantero', 'espalda'], seams: ['manga-delantero', 'manga-espalda'] },
    { id: 'costados', title: 'Cierra costados y mangas', detail: 'Cose de un solo tramo desde el puño, por la axila, hasta el bajo.', pieces: ['manga', 'delantero', 'espalda'], seams: ['costados', 'bajo-manga'] },
    { id: 'terminar', title: kind === 'bomber' ? 'Revisa y plancha' : 'Bajos', detail: kind === 'bomber' ? 'Plancha a baja temperatura con un paño, sin aplastar el rib.' : `Dobla ${cm(hem)} en el bajo y en las mangas y pespuntea${kind === 'sobrecamisa' ? '. Haz los ojales verticales y cose los botones' : ''}.`, pieces: ['delantero', 'espalda', 'manga'] });
  steps[0].pieces = pieces.map(piece => piece.id);
  return {
    pieces, seams, materials, steps, notices,
    checks: [
      { key: 'pecho', label: 'Contorno de pecho terminado', body: chest, ease, target: chest + ease, measured: 4 * U.x, tolerance: .5 },
      { key: 'largo', label: 'Largo desde el hombro', target: L, measured: back.nodes[4].y, tolerance: .5 },
      { key: 'copa', label: 'Copa de manga igual a la sisa', target: 2 * armLen, measured: lens(sleeve, ['copa-delantera', 'copa-espalda']), tolerance: .5 }
    ],
    assumptions: [
      `Pecho terminado ${cm(chest + ease)} (pecho + ${cm(ease)}): silueta oversize, cuerpo recto.`,
      `El hombro cae ${cm(shoulderHalf - shoulders / 2)} sobre el brazo; la copa de la manga mide ${cm(capH)} de alto y su contorno iguala la sisa.`,
      kind === 'bomber' ? 'La banda de rib del bajo y el cuello miden 85 % de su borde; el puño se calcula con la muñeca.' : 'Largo y manga se ajustan con «Ajuste de largo» y «Ajuste de manga» sin cambiar el resto del bloque.'
    ]
  };
}

export const oversizeGenerator: PatternGenerator = {
  id: 'oversize-hombro-caido', name: 'Prendas oversize de hombro caído', status: 'experimental',
  summary: 'Camiseta de punto, sobrecamisa o chaqueta de trabajo con pie de cuello, y bomber con rib y cierre; manga de copa baja calculada a la sisa.',
  requiredMeasures: ['pecho', 'hombros', 'cuello', 'talleEspalda', 'largoManga'], optionalMeasures: ['estatura', 'brazo', 'muneca'],
  defaults: oversizeDefaults, generate: generateOversize,
  params: [
    { key: 'prenda', label: 'Prenda', group: 'diseno', type: 'choice', choices: [{ value: 'camiseta', label: 'Camiseta de punto' }, { value: 'sobrecamisa', label: 'Sobrecamisa / chaqueta de trabajo' }, { value: 'bomber', label: 'Bomber con rib' }] },
    { key: 'manga', label: 'Manga de la camiseta', group: 'diseno', type: 'choice', choices: [{ value: 'corta', label: 'Corta' }, { value: 'larga', label: 'Larga' }], when: p => p.prenda === 'camiseta' },
    { key: 'bolsillos', label: 'Bolsillos', group: 'diseno', type: 'choice', choices: [{ value: 'pecho', label: 'Dos de pecho' }, { value: 'tres', label: 'Pecho y dos bajos (trabajo)' }, { value: 'ninguno', label: 'Sin bolsillos' }], when: p => p.prenda === 'sobrecamisa' },
    { key: 'largoExtra', label: 'Ajuste de largo', group: 'diseno', type: 'length', min: -250, max: 400 },
    { key: 'largoMangaExtra', label: 'Ajuste de largo de manga', group: 'diseno', type: 'length', min: -200, max: 200 },
    { key: 'caidaExtra', label: 'Ajuste de caída de hombro', group: 'diseno', type: 'length', min: -50, max: 80 },
    { key: 'holguraExtra', label: 'Holgura extra de pecho', group: 'holgura', type: 'length', min: -150, max: 300 },
    { key: 'margen', label: 'Margen de costura', group: 'margenes', type: 'length', min: 6, max: 15 },
    { key: 'dobladillo', label: 'Dobladillo', group: 'margenes', type: 'length', min: 10, max: 45 }
  ]
};
