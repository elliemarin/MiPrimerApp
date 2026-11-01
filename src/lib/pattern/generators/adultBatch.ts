import { isChild, num, round1, str, type GeneratorContext, type GeneratorResult, type Params, type PatternGenerator } from '../generator';
import type { Issue, Piece, SeamRelation } from '../types';
import type { Pt } from '../../geom/vec';
import { P, clamp, cm, copyPiece, cubicPoint, edge, equal, finite, invalid, len, outline, ratio, rectangle, solve } from './kidsShared';
import { armhole, bodiceGeometry, bodicePiece, bodySeams, experimentalNotice, foldedBand, hoodPiece, kidBody, neckLen, setInSleeve, sizeFactor, sleeveSeams, splitCubic } from './kidsBlocks';

/* Tercer lote digitalizado (2026-11-01), para adulto e infantil: chaqueta con
 * manga ranglan de dos piezas, sudadera de media cremallera por bloques de
 * color y buzo corto con capucha y manga murciélago. Todo se traza desde
 * medidas corporales; los bloques de color son piezas reales. */

const notBaby = (code: string) => invalid(code, 'Este patrón empieza en 1 año. Elige una talla de 1–4 años, infantil o adulta.');
const margin = { key: 'margen', label: 'Margen de costura', group: 'margenes' as const, type: 'length' as const, min: 5, max: 15 };
const dist = (a: Pt, b: Pt) => Math.hypot(a.x - b.x, a.y - b.y);

// ------------------------------------------------------------------ Sudadera de media cremallera por bloques
export function halfZipDefaults(ctx: GeneratorContext): Params {
  const k = kidBody(ctx);
  return { bloques: 'si', largo: round1(k.talle * 1.55), holgura: round1(clamp(k.chest * .22 + 40, 100, 300)), largoManga: round1(k.sleeve), altoCuello: round1(clamp(k.neck * .22, 45, 90)), cremallera: round1(clamp(k.talle * .45, 100, 220)), margen: 10, dobladillo: 25 };
}

export function generateHalfZip(ctx: GeneratorContext, params: Params): GeneratorResult {
  if (ctx.kind === 'bebe') return notBaby('media-cremallera-talla');
  const p = { ...halfZipDefaults(ctx), ...params }, k = kidBody(ctx), s = sizeFactor(ctx);
  const blocks = str(p, 'bloques') === 'si', L = num(p, 'largo'), ease = num(p, 'holgura'), SL = num(p, 'largoManga'), ch = num(p, 'altoCuello'), zipL = num(p, 'cremallera'), sa = num(p, 'margen'), hem = num(p, 'dobladillo');
  if (!finite(L, ease, SL, ch, zipL, sa, hem) || ease < 60 || ease > 400 || ch < 30 || ch > 120 || zipL < 80 || zipL > 300 || sa < 5 || sa > 15 || hem < 10 || hem > 40) return invalid('media-cremallera-medidas', 'Revisa largo, holgura, cuello, cremallera y márgenes.');
  const drop = 35 * s, g = bodiceGeometry(ctx, { ease, length: L, neckWiden: 8 * s, frontDepthExtra: 5 * s, dropShoulder: drop, armExtra: 20 * s });
  if (L < g.ad + 80 * s || zipL > L * .6 || SL < 150 * s) return invalid('media-cremallera-largo', 'El cuerpo, la manga o la cremallera no caben con estas medidas.');
  const ys = blocks ? g.ad + (g.L - g.ad) * .22 : g.L;
  const top = { ...g, L: ys }, fin = { sa, hem, neck: 'costura' as const, arm: 'costura' as const, hemFinish: blocks ? 'costura' as const : 'dobladillo' as const, centre: 'doblez' as const, labels: blocks ? { bajo: 'Unión al bloque inferior' } : {} };
  const front = bodicePiece(blocks ? 'delantero-superior' : 'delantero', blocks ? 'Delantero superior al doblez' : 'Delantero al doblez', top, false, fin);
  const back = bodicePiece(blocks ? 'espalda-superior' : 'espalda', blocks ? 'Espalda superior al doblez' : 'Espalda al doblez', top, true, fin);
  front.lines.push({ id: 'abertura', kind: 'referencia', a: P(0, g.fd), b: P(0, g.fd + zipL), label: 'Abrir aquí la abertura de la cremallera (sobre el doblez)' });
  const fId = front.id, bId = back.id, pieces: Piece[] = [front, back];
  const seams: SeamRelation[] = [...bodySeams(fId, bId)];
  if (blocks) {
    const lower = (id: string, name: string) => outline(id, name, [P(0, ys), P(g.q, ys), P(g.q, g.L), P(0, g.L)], [
      edge('union', 'Unión al bloque superior', 'costura', sa), edge('costado', 'Costado', 'costura', sa), edge('bajo', 'Bajo', 'dobladillo', hem), edge('centro', 'Centro (al doblez)', 'doblez', 0)], { onFold: true });
    pieces.push(lower('delantero-inferior', 'Delantero inferior al doblez'), lower('espalda-inferior', 'Espalda inferior al doblez'));
    seams.push(equal('bloque-delantero', 'Bloques del delantero', [{ pieceId: 'delantero-superior', edgeIds: ['bajo'] }], [{ pieceId: 'delantero-inferior', edgeIds: ['union'] }]),
      equal('bloque-espalda', 'Bloques de la espalda', [{ pieceId: 'espalda-superior', edgeIds: ['bajo'] }], [{ pieceId: 'espalda-inferior', edgeIds: ['union'] }]),
      equal('costados-inferior', 'Costados del bloque inferior', [{ pieceId: 'delantero-inferior', edgeIds: ['costado'] }], [{ pieceId: 'espalda-inferior', edgeIds: ['costado'] }]));
  }
  const handPass = k.wrist * 1.45, cuffHem = handPass * 1.25;
  const { piece: sl } = setInSleeve('manga', blocks ? 'Manga superior (par en espejo)' : 'Manga (par en espejo)', armhole(front) + armhole(back), { capH: (g.ad - g.sy) * .42, length: SL - drop + 15 * s, cuff: cuffHem, capEase: 0, sa, hemFinish: 'jareta', hem: 22, armMin: k.arm + 70 * s, hemLabel: 'Bajo de manga (jareta con elástico)' });
  if (blocks) {
    // Split the sleeve just below the underarm so the colour line continues the body's.
    const n = (i: number) => sl.nodes[i], T = n(0), UB = n(1), BC = n(2), FC = n(3), UF = n(4), ysl = UB.y + (BC.y - UB.y) * .14;
    const at = (a: Pt, b: Pt) => { const t = (ysl - a.y) / (b.y - a.y); return P(a.x + (b.x - a.x) * t, ysl); };
    const PB = at(UB, BC), PF = at(UF, FC), cb = sl.edges[0], cf = sl.edges[4];
    const upper = outline('manga', 'Manga superior (par en espejo)', [P(T.x, T.y), P(UB.x, UB.y), PB, PF, P(UF.x, UF.y)], [
      edge('copa-trasera', 'Copa trasera', 'costura', sa, cb.c1, cb.c2), edge('costura-trasera', 'Costura de manga', 'costura', sa), edge('union', 'Unión al bloque inferior', 'costura', sa),
      edge('costura-delantera', 'Costura de manga', 'costura', sa), edge('copa-delantera', 'Copa delantera', 'costura', sa, cf.c1, cf.c2)], { qty: 2, mirrorPairs: true });
    upper.notches.push(...sl.notches);
    const lowerS = outline('manga-inferior', 'Manga inferior (par en espejo)', [PB, P(BC.x, BC.y), P(FC.x, FC.y), PF], [
      edge('costura-trasera', 'Costura de manga', 'costura', sa), edge('puno', 'Bajo de manga (jareta con elástico)', 'jareta', 22), edge('costura-delantera', 'Costura de manga', 'costura', sa), edge('union', 'Unión al bloque superior', 'costura', sa)], { qty: 2, mirrorPairs: true });
    upper.grain = { a: P(0, ysl * .3), b: P(0, ysl * .85) }; lowerS.grain = { a: P(0, ysl + 20), b: P(0, BC.y - 30) };
    pieces.push(upper, lowerS);
    seams.push(...sleeveSeams('manga', fId, bId, 0), equal('manga-inferior-costura', 'Costura de manga inferior', [{ pieceId: 'manga-inferior', edgeIds: ['costura-delantera'] }], [{ pieceId: 'manga-inferior', edgeIds: ['costura-trasera'] }]),
      equal('bloque-manga', 'Bloques de la manga', [{ pieceId: 'manga', edgeIds: ['union'] }], [{ pieceId: 'manga-inferior', edgeIds: ['union'] }]));
  } else {
    pieces.push(sl);
    seams.push(...sleeveSeams('manga', fId, bId, 0));
  }
  const neckline = 2 * (neckLen(front) + neckLen(back));
  const collar = rectangle('cuello', 'Cuello alto (exterior e interior)', neckline, ch, [edge('union', 'Unión al escote', 'costura', sa), edge('extremo-der', 'Extremo (cremallera)', 'costura', sa), edge('canto', 'Canto superior (une las dos capas)', 'costura', sa), edge('extremo-izq', 'Extremo (cremallera)', 'costura', sa)], { qty: 2 }, true);
  collar.notches.push({ id: 'hombro-1', edgeId: 'union', s: neckLen(front), count: 1, label: 'Hombro' }, { id: 'hombro-2', edgeId: 'union', s: neckline - neckLen(front), count: 1, label: 'Hombro' });
  const facing = rectangle('vista-cierre', 'Vista de la abertura', 35 * s, zipL + 20, [edge('superior', 'Superior', 'costura', sa), edge('interior', 'Canto interior (sobrehilar)', 'sin-margen', 0), edge('inferior', 'Inferior (sobrehilar)', 'sin-margen', 0), edge('abertura', 'Une la abertura', 'costura', sa)], { qty: 2 });
  pieces.push(collar, facing);
  seams.push(equal('cuello-escote', 'Cuello con el escote', [{ pieceId: 'cuello', edgeIds: ['union'] }], [{ pieceId: fId, edgeIds: ['cuello'], factor: 2 }, { pieceId: bId, edgeIds: ['cuello'], factor: 2 }], 1));
  const opening = neckline + 2 * zipL, notices: Issue[] = [experimentalNotice('media-cremallera-experimental', 'Sudadera de media cremallera'),
    opening < k.head + 20 ? { level: 'error', code: 'paso-cabeza', message: 'Con la cremallera abierta no pasa la cabeza. Alarga la cremallera.' } : { level: 'ok', code: 'paso-cabeza', message: `Con la cremallera abierta el escote mide ${cm(opening)}: pasa una cabeza de ${cm(k.head)}.` }];
  return {
    pieces, seams, notices,
    checks: [{ key: 'pecho', label: 'Contorno de pecho terminado', body: k.chest, ease, target: k.chest + ease, measured: 2 * front.nodes[4].x + 2 * back.nodes[4].x, tolerance: .5 }, { key: 'cuello', label: 'Cuello sobre el escote', target: neckline, measured: len(collar, 'union'), tolerance: .5 }],
    materials: [
      { id: 'tela', label: blocks ? 'Borreguito o polar en dos colores (bloque superior y bloque inferior)' : 'Borreguito, polar o felpa', qty: 'Según acomodo', note: 'Corta todas las piezas con el pelo en la misma dirección.' },
      { id: 'cremallera', label: 'Cremallera cerrada', qty: cm(zipL + ch) }, { id: 'elastico', label: 'Elástico de 10 mm para los puños', qty: `2 × ${cm(k.wrist + 30)}` }, { id: 'hilo', label: 'Hilo de poliéster', qty: '1 carrete' }
    ],
    assumptions: [`Pecho + ${cm(ease)}, hombro caído ${cm(drop)}; copa de manga resuelta a la sisa.`, blocks ? 'Bloques de color reales: cuerpo y manga se cortan en dos piezas a la misma altura, justo bajo la sisa.' : 'Sin bloques: cuerpo y manga enteros.', `Media cremallera de ${cm(zipL)} abierta sobre el doblez del delantero; cuello alto de ${cm(ch)}.`, 'Las medidas de la referencia (piezas de 43 y 64 cm de alto) no eran coherentes entre sí; el trazo sale de las medidas de la talla.'],
    steps: [
      { id: 'cortar', title: 'Corta', detail: 'Corta cada bloque en su color, dos cuellos y las vistas. Marca la abertura del delantero sin cortarla todavía.', pieces: pieces.map(x => x.id) },
      ...(blocks ? [{ id: 'bloques', title: 'Une los bloques', detail: 'Cose cada bloque superior con su inferior (delantero, espalda y mangas) y pespuntea el margen hacia abajo.', pieces: pieces.map(x => x.id), seams: ['bloque-delantero', 'bloque-espalda', 'bloque-manga'] }] : []),
      { id: 'cremallera', title: 'Media cremallera', detail: 'Coloca las vistas derecho con derecho sobre la marca, cose en U alrededor de la línea, corta la abertura hasta 1 cm del final y en Y, voltea y cose la cremallera entre delantero y vista.', pieces: [fId, 'vista-cierre'] },
      { id: 'cuerpo', title: 'Hombros, mangas y costados', detail: 'Une hombros, monta mangas en plano y cierra costados y mangas.', pieces: [fId, bId, 'manga'], seams: ['hombros', 'manga-sisa', 'costados'] },
      { id: 'cuello', title: 'Cuello', detail: 'Cose el cuello exterior al escote, une la capa interior por el canto y los extremos encerrando la cinta de la cremallera, voltea y cierra por dentro.', pieces: ['cuello', fId, bId], seams: ['cuello-escote'] },
      { id: 'bajos', title: 'Puños y bajo', detail: 'Haz la jareta de los puños y pasa el elástico; dobladilla el bajo.', pieces: [blocks ? 'manga-inferior' : 'manga', fId] }
    ]
  };
}

export const halfZipGenerator: PatternGenerator = {
  id: 'sudadera-media-cremallera', name: 'Sudadera de media cremallera por bloques', status: 'experimental',
  summary: 'Sudadera de hombro caído con cuello alto, media cremallera, puños elásticos y bloques de color en cuerpo y manga.',
  requiredMeasures: ['pecho', 'cuello', 'hombros', 'talleEspalda', 'largoManga', 'cabeza'], optionalMeasures: ['estatura', 'muneca', 'brazo'],
  defaults: halfZipDefaults, generate: generateHalfZip,
  params: [
    { key: 'bloques', label: 'Bloques de color', group: 'diseno', type: 'choice', choices: [{ value: 'si', label: 'Sí: cuerpo y manga en dos colores' }, { value: 'no', label: 'No: un solo color' }] },
    { key: 'largo', label: 'Largo de espalda', group: 'diseno', type: 'length', min: 250, max: 900 },
    { key: 'largoManga', label: 'Largo de manga (hombro a muñeca)', group: 'diseno', type: 'length', min: 200, max: 800 },
    { key: 'altoCuello', label: 'Alto del cuello', group: 'diseno', type: 'length', min: 30, max: 120 },
    { key: 'cremallera', label: 'Largo de la abertura', group: 'diseno', type: 'length', min: 80, max: 300 },
    { key: 'holgura', label: 'Holgura de pecho', group: 'holgura', type: 'length', min: 60, max: 400 },
    margin, { key: 'dobladillo', label: 'Dobladillo', group: 'margenes', type: 'length', min: 10, max: 40 }
  ]
};

// ------------------------------------------------------------------ Chaqueta con manga ranglan de dos piezas
export function raglanJacketDefaults(ctx: GeneratorContext): Params {
  const k = kidBody(ctx), s = sizeFactor(ctx);
  return { largo: round1(k.talle * 1.25), holgura: round1(clamp(k.chest * .2 + 60, 110, 280)), largoManga: round1(k.sleeve), altoCuello: round1(clamp(k.neck * .17, 35, 65)), altoBanda: round1(clamp(40 * s, 30, 65)), altoPuno: round1(clamp(40 * s, 30, 70)), bolsillos: 'si', margen: 10 };
}

export function generateRaglanJacket(ctx: GeneratorContext, params: Params): GeneratorResult {
  if (ctx.kind === 'bebe') return notBaby('chaqueta-ranglan-talla');
  const p = { ...raglanJacketDefaults(ctx), ...params }, k = kidBody(ctx), s = sizeFactor(ctx);
  const L = num(p, 'largo'), ease = num(p, 'holgura'), SL = num(p, 'largoManga'), ch = num(p, 'altoCuello'), bh = num(p, 'altoBanda'), cuffH = num(p, 'altoPuno'), pockets = str(p, 'bolsillos') === 'si', sa = num(p, 'margen');
  if (!finite(L, ease, SL, ch, bh, cuffH, sa) || ease < 60 || ease > 400 || ch < 25 || ch > 90 || bh < 20 || bh > 90 || cuffH < 20 || cuffH > 90 || sa < 5 || sa > 15) return invalid('chaqueta-ranglan-medidas', 'Revisa largo, holgura, cuello, banda, puños y márgenes.');
  const g = bodiceGeometry(ctx, { ease, length: L - bh, neckWiden: 8 * s, frontDepthExtra: 6 * s, armExtra: 25 * s });
  if (g.L < g.ad + 60 * s || SL < cuffH + 150 * s) return invalid('chaqueta-ranglan-largo', 'El cuerpo o la manga quedan demasiado cortos.');
  const UA = P(g.q, g.ad), fin = { sa, hem: sa, neck: 'costura' as const, arm: 'costura' as const, hemFinish: 'costura' as const, centre: 'costura' as const };
  // Raglan line: from a point on the neckline straight to the underarm. The back point is solved so both raglans match.
  const base = (back: boolean) => bodicePiece('x', 'x', g, back, back ? { ...fin, centre: 'doblez' } : fin).edges.find(e => e.id === 'cuello')!;
  const neckCurve = (back: boolean) => { const e = base(back), CN = P(0, back ? g.bd : g.fd), NP = P(g.nw, 0); return { CN, NP, c1: e.c1!, c2: e.c2! }; };
  const nf = neckCurve(false), nb = neckCurve(true);
  const tF = .62, Rf = cubicPoint(nf.CN, nf.c1, nf.c2, nf.NP, tF), rl = dist(Rf, UA);
  // Distance to the underarm shrinks toward the neck point; if even that is too long, take the closest point.
  const tB = dist(nb.NP, UA) >= rl ? .98 : solve(t => -dist(cubicPoint(nb.CN, nb.c1, nb.c2, nb.NP, t), UA), -rl, 0, .98);
  const sF = splitCubic(nf.CN, nf.c1, nf.c2, nf.NP, tF), sB = splitCubic(nb.CN, nb.c1, nb.c2, nb.NP, tB);
  const body = (back: boolean) => {
    const sp = back ? sB : sF, CN = sp.left.p0, R = sp.left.p3, HS = P(g.q, g.L), HC = P(0, g.L);
    const piece = outline(back ? 'espalda' : 'delantero', back ? 'Espalda al doblez' : 'Delantero (par en espejo)', [CN, R, UA, HS, HC], [
      edge('cuello', 'Escote', 'costura', sa, sp.left.c1, sp.left.c2), edge('ranglan', 'Ranglan', 'costura', sa), edge('costado', 'Costado', 'costura', sa), edge('bajo', 'Bajo (une la banda)', 'costura', sa),
      back ? edge('centro', 'Centro de espalda (al doblez)', 'doblez', 0) : edge('centro', 'Canto delantero (cremallera)', 'costura', sa)], back ? { onFold: true } : { qty: 2, mirrorPairs: true });
    piece.grain = { a: P(g.q * .45, g.ad + 10), b: P(g.q * .45, g.L - 30) };
    return { piece, neckPart: { p0: sp.right.p0, c1: sp.right.c1, c2: sp.right.c2, p3: sp.right.p3 } };
  };
  const F = body(false), B = body(true), front = F.piece, back = B.piece;
  const cubicLen = (c: { p0: Pt; c1: Pt; c2: Pt; p3: Pt }) => len(outline('t', 't', [c.p0, c.p3], [edge('a', 'a', 'costura', 1, c.c1, c.c2), edge('b', 'b', 'costura', 1)]), 'a');
  const nrF = cubicLen(F.neckPart), nrB = cubicLen(B.neckPart), rlF = len(front, 'ranglan'), rlB = len(back, 'ranglan');
  // Two-piece raglan sleeve: over-arm seam on top, underarm seam below.
  const slope = Math.atan2(g.sy, g.sh - g.nw), alpha = slope + .4, u = P(Math.cos(alpha), Math.sin(alpha)), v = P(-Math.sin(alpha), Math.cos(alpha));
  const w = (() => { const c = Math.cos(.35), sn = Math.sin(.35); const x = v.x * c - u.x * sn, y = v.y * c - u.y * sn, m = Math.hypot(x, y); return P(x / m, y / m); })();
  const shoulderLen = Math.hypot(g.sh - g.nw, g.sy), Lsl = shoulderLen + SL - cuffH, bw = (k.arm + 70 * s) / 2;
  const handPass = k.wrist * 1.45, cuffLen = Math.max(handPass, k.wrist + 60 * s), sleeveHem = cuffLen * 1.2;
  // Each half: the underarm point slides along the arm until its raglan fits. The back half's share of the
  // bicep is then solved so both underarm seams match (the underarm grows steadily with that width).
  const half = (id: string, name: string, nr: number, rlen: number, cwHalf: number, bwh: number) => {
    const N0 = P(0, 0), Rs = P(w.x * nr, w.y * nr);
    const d = solve(t => dist(P(u.x * t + v.x * bwh, u.y * t + v.y * bwh), Rs), rlen, 0, rlen * 2.5);
    const Us = P(u.x * d + v.x * bwh, u.y * d + v.y * bwh), WO = P(u.x * Lsl, u.y * Lsl), WU = P(WO.x + v.x * cwHalf, WO.y + v.y * cwHalf);
    const piece = outline(id, name, [N0, WO, WU, Us, Rs], [
      edge('sobrebrazo', 'Costura de sobrebrazo (une la otra mitad)', 'costura', sa), edge('puno', 'Bajo de manga (une el puño, fruncido)', 'costura', sa), edge('bajo-manga', 'Costura bajo el brazo', 'costura', sa),
      edge('ranglan', 'Ranglan', 'costura', sa), edge('cuello', 'Escote', 'costura', sa)], { qty: 2, mirrorPairs: true });
    piece.grain = { a: P(u.x * Lsl * .25 + v.x * bwh * .5, u.y * Lsl * .25 + v.y * bwh * .5), b: P(u.x * Lsl * .8 + v.x * bwh * .45, u.y * Lsl * .8 + v.y * bwh * .45) };
    return piece;
  };
  const cwF = sleeveHem / 4, cwB = cwF;
  const sleeveF = half('manga-delantera', 'Manga delantera (par en espejo)', nrF, rlF, cwF, bw), underF = len(sleeveF, 'bajo-manga');
  const bwB = solve(x => len(half('t', 't', nrB, rlB, cwB, x), 'bajo-manga'), underF, bw * .6, bw * 1.4);
  const sleeveB = half('manga-trasera', 'Manga trasera (par en espejo)', nrB, rlB, cwB, bwB);
  const neckline = 2 * (len(front, 'cuello') + len(sleeveF, 'cuello') + len(sleeveB, 'cuello') + len(back, 'cuello'));
  const collar = rectangle('cuello', 'Cuello alto (exterior e interior)', neckline, ch, [edge('union', 'Unión al escote', 'costura', sa), edge('extremo-der', 'Extremo (cremallera)', 'costura', sa), edge('canto', 'Canto superior (une las dos capas)', 'costura', sa), edge('extremo-izq', 'Extremo (cremallera)', 'costura', sa)], { qty: 2 }, true);
  const hemLen = 2 * (len(front, 'bajo') + len(back, 'bajo')), band = foldedBand('banda', 'Banda del bajo (rib o elástica)', hemLen * .88, bh, sa, 1, 'punto-elastico');
  const cuff = foldedBand('puno', 'Puño', cuffLen + 30 * s, cuffH, sa, 2, 'principal');
  const tab = rectangle('pestana', 'Pestaña del puño (dos caras)', 70 * s, 2 * 18 * s, [edge('a', 'Canto', 'costura', sa), edge('b', 'Extremo redondeado', 'costura', sa), edge('c', 'Canto', 'costura', sa), edge('d', 'Extremo que se cose', 'costura', sa)], { qty: 2 }, true);
  tab.marks.push({ id: 'broche', kind: 'boton', at: P(70 * s - 14 * s, 18 * s), label: 'Broche o botón' });
  const pieces: Piece[] = [front, back, sleeveF, sleeveB, collar, band, cuff, tab];
  const seams: SeamRelation[] = [
    equal('costados', 'Costados', [{ pieceId: 'delantero', edgeIds: ['costado'] }], [{ pieceId: 'espalda', edgeIds: ['costado'] }]),
    equal('ranglan-delantero', 'Ranglan delantero', [{ pieceId: 'manga-delantera', edgeIds: ['ranglan'] }], [{ pieceId: 'delantero', edgeIds: ['ranglan'] }]),
    equal('ranglan-trasero', 'Ranglan trasero', [{ pieceId: 'manga-trasera', edgeIds: ['ranglan'] }], [{ pieceId: 'espalda', edgeIds: ['ranglan'] }]),
    equal('sobrebrazo', 'Sobrebrazo: manga delantera con trasera', [{ pieceId: 'manga-delantera', edgeIds: ['sobrebrazo'] }], [{ pieceId: 'manga-trasera', edgeIds: ['sobrebrazo'] }]),
    equal('bajo-brazo', 'Bajo el brazo', [{ pieceId: 'manga-delantera', edgeIds: ['bajo-manga'] }], [{ pieceId: 'manga-trasera', edgeIds: ['bajo-manga'] }]),
    equal('cuello-escote', 'Cuello con todo el escote', [{ pieceId: 'cuello', edgeIds: ['union'] }], [{ pieceId: 'delantero', edgeIds: ['cuello'], factor: 2 }, { pieceId: 'manga-delantera', edgeIds: ['cuello'], factor: 2 }, { pieceId: 'manga-trasera', edgeIds: ['cuello'], factor: 2 }, { pieceId: 'espalda', edgeIds: ['cuello'], factor: 2 }], 1),
    ratio('banda-bajo', 'Bajo con la banda (estirarla)', 'estirado', [{ pieceId: 'delantero', edgeIds: ['bajo'], factor: 2 }, { pieceId: 'espalda', edgeIds: ['bajo'], factor: 2 }], [{ pieceId: 'banda', edgeIds: ['union-1'] }], 1 / .88, .02),
    ratio('puno-manga', 'Bajo de manga fruncido al puño', 'fruncido', [{ pieceId: 'manga-delantera', edgeIds: ['puno'] }, { pieceId: 'manga-trasera', edgeIds: ['puno'] }], [{ pieceId: 'puno', edgeIds: ['union-1'] }], (cwF + cwB) / (cuffLen + 30 * s), .03)
  ];
  if (pockets) {
    const pw = clamp(g.q * .45, 90, 170), x0 = g.q * .35, y1 = g.L - 25 * s, y0 = y1 - pw;
    front.lines.push({ id: 'bolsillo', kind: 'colocacion', a: P(x0, y0), b: P(x0 + pw * .32, y1), label: 'Boca del bolsillo de vivo (inclinada)' });
    pieces.push(rectangle('vivo', 'Vivo del bolsillo (doblado)', pw * 1.06 + 30, 2 * 22 * s, [edge('a', 'Canto', 'costura', sa), edge('b', 'Extremo', 'costura', sa), edge('c', 'Canto', 'costura', sa), edge('d', 'Extremo', 'costura', sa)], { qty: 2 }, true),
      rectangle('bolsa', 'Bolsa del bolsillo', pw * 1.06 + 40, pw * 1.2, [edge('a', 'Boca', 'costura', sa), edge('b', 'Lado', 'costura', sa), edge('c', 'Fondo', 'costura', sa), edge('d', 'Lado', 'costura', sa)], { qty: 4, fabric: 'forro' }));
  }
  return {
    pieces, seams,
    notices: [experimentalNotice('chaqueta-ranglan-experimental', 'Chaqueta ranglan')],
    checks: [
      { key: 'pecho', label: 'Contorno de pecho terminado', body: k.chest, ease, target: k.chest + ease, measured: 4 * g.q, tolerance: .5 },
      { key: 'cuello', label: 'Cuello sobre el escote', target: neckline, measured: len(collar, 'union'), tolerance: .5 }
    ],
    materials: [
      { id: 'tela', label: 'Gamuza sintética, sarga, lona ligera o paño', qty: 'Según acomodo' }, { id: 'rib', label: 'Rib o punto elástico para la banda', qty: `${cm(hemLen * .88 + 2 * sa)} × ${cm(2 * bh + 2 * sa)}` },
      { id: 'cremallera', label: 'Cremallera separable', qty: cm(g.L + bh + ch) }, { id: 'broches', label: 'Broches o botones para las pestañas', qty: '2' }, ...(pockets ? [{ id: 'forro', label: 'Forro para bolsas', qty: '4 bolsas' }] : [])
    ],
    assumptions: [`Pecho + ${cm(ease)}. Manga ranglan de dos piezas: el ranglan trasero se resuelve para medir lo mismo que el delantero (${cm(rlF)}).`, 'Costura de sobrebrazo recta del cuello a la muñeca; bajo el brazo, las dos mitades miden lo mismo.', 'Cuello alto con cremallera hasta arriba, banda en el bajo y puño con pestaña.', 'La referencia era un esquema de trazado sin talla; el patrón sale de las medidas.'],
    steps: [
      { id: 'cortar', title: 'Corta', detail: 'Delanteros, espalda, mangas delanteras y traseras, cuellos, banda, puños y pestañas' + (pockets ? ', vivos y bolsas.' : '.'), pieces: pieces.map(x => x.id) },
      ...(pockets ? [{ id: 'bolsillos', title: 'Bolsillos de vivo', detail: 'Marca la boca inclinada, cose el vivo y la primera bolsa, corta en Y, voltea, asienta el vivo y cose la segunda bolsa.', pieces: ['delantero', 'vivo', 'bolsa'] }] : []),
      { id: 'mangas', title: 'Mangas', detail: 'Une cada manga delantera con su trasera por el sobrebrazo.', pieces: ['manga-delantera', 'manga-trasera'], seams: ['sobrebrazo'] },
      { id: 'ranglan', title: 'Ranglan', detail: 'Cose las mangas al cuerpo por los ranglan, delantero y espalda.', pieces: ['manga-delantera', 'manga-trasera', 'delantero', 'espalda'], seams: ['ranglan-delantero', 'ranglan-trasero'] },
      { id: 'costados', title: 'Costados', detail: 'Cose de puño a bajo en una pasada por cada lado.', pieces: ['manga-delantera', 'manga-trasera', 'delantero', 'espalda'], seams: ['bajo-brazo', 'costados'] },
      { id: 'puños', title: 'Puños y banda', detail: 'Cose la pestaña en el puño, cierra el puño y cóselo frunciendo la manga. Cose la banda estirándola.', pieces: ['puno', 'pestana', 'banda'], seams: ['puno-manga', 'banda-bajo'] },
      { id: 'cuello', title: 'Cuello y cremallera', detail: 'Cose el cuello exterior al escote, la cremallera de la banda al canto del cuello, y cierra con el cuello interior.', pieces: ['cuello', 'delantero'], seams: ['cuello-escote'] }
    ]
  };
}

export const raglanJacketGenerator: PatternGenerator = {
  id: 'chaqueta-ranglan', name: 'Chaqueta con manga ranglan y cuello alto', status: 'experimental',
  summary: 'Chaqueta con cremallera, cuello alto, manga ranglan de dos piezas, banda en el bajo, puños con pestaña y bolsillos de vivo.',
  requiredMeasures: ['pecho', 'cuello', 'hombros', 'talleEspalda', 'largoManga'], optionalMeasures: ['estatura', 'muneca', 'brazo'],
  defaults: raglanJacketDefaults, generate: generateRaglanJacket,
  params: [
    { key: 'bolsillos', label: 'Bolsillos de vivo', group: 'diseno', type: 'choice', choices: [{ value: 'si', label: 'Sí' }, { value: 'no', label: 'No' }] },
    { key: 'largo', label: 'Largo total (con banda)', group: 'diseno', type: 'length', min: 250, max: 900 },
    { key: 'largoManga', label: 'Largo de manga (hombro a muñeca)', group: 'diseno', type: 'length', min: 200, max: 800 },
    { key: 'altoCuello', label: 'Alto del cuello', group: 'diseno', type: 'length', min: 25, max: 90 },
    { key: 'altoBanda', label: 'Alto de la banda', group: 'diseno', type: 'length', min: 20, max: 90 },
    { key: 'altoPuno', label: 'Alto del puño', group: 'diseno', type: 'length', min: 20, max: 90 },
    { key: 'holgura', label: 'Holgura de pecho', group: 'holgura', type: 'length', min: 60, max: 400 },
    margin
  ]
};

// ------------------------------------------------------------------ Buzo corto con capucha y manga murciélago
export function batwingDefaults(ctx: GeneratorContext): Params {
  const k = kidBody(ctx), s = sizeFactor(ctx);
  return { largo: round1(k.talle * 1.12), holgura: round1(clamp(k.chest * .3 + 90, 150, 420)), largoManga: round1(k.sleeve), altoBanda: round1(clamp(45 * s, 30, 70)), altoPuno: round1(clamp(60 * s, 35, 90)), cordon: isChild(ctx.kind) ? 'no' : 'si', bolsillos: 'si', forroCapucha: 'si', margen: 8 };
}

export function generateBatwing(ctx: GeneratorContext, params: Params): GeneratorResult {
  if (ctx.kind === 'bebe') return notBaby('buzo-murcielago-talla');
  const p = { ...batwingDefaults(ctx), ...params }, k = kidBody(ctx), s = sizeFactor(ctx), child = isChild(ctx.kind);
  const total = num(p, 'largo'), ease = num(p, 'holgura'), SL = num(p, 'largoManga'), bh = num(p, 'altoBanda'), cuffH = num(p, 'altoPuno'), sa = num(p, 'margen');
  const cord = str(p, 'cordon') === 'si' && !child, pockets = str(p, 'bolsillos') === 'si', lined = str(p, 'forroCapucha') === 'si';
  if (!finite(total, ease, SL, bh, cuffH, sa) || ease < 100 || ease > 500 || bh < 20 || bh > 90 || cuffH < 20 || cuffH > 120 || sa < 5 || sa > 12) return invalid('buzo-murcielago-medidas', 'Revisa largo, holgura, banda, puños y márgenes.');
  const q = (k.chest + ease) / 4, L = total - bh, stretch = ctx.fabric === 'punto' ? Math.min(ctx.stretch, 40) : 0, factor = 1 + stretch * .0075;
  // Neckline solved for the head (knit gives ~¾ of its stretch at the hood seam).
  const neckFor = (t: number) => {
    const nw = k.neck / 6 + 10 * s + Math.min(t * .6, 25 * s), fd = k.neck / 6 + 12 * s + t, bd = 16 * s;
    const pc = outline('n', 'n', [P(0, fd), P(nw, 0), P(nw, bd + 1)], [edge('f', 'f', 'costura', 1, P(nw * .55, fd), P(nw, fd * .45)), edge('x', 'x', 'costura', 1), edge('y', 'y', 'costura', 1)]);
    const pb = outline('n', 'n', [P(0, bd), P(nw, 0), P(nw, bd + 1)], [edge('b', 'b', 'costura', 1, P(nw * .44, bd), P(nw * .8, bd * .72)), edge('x', 'x', 'costura', 1), edge('y', 'y', 'costura', 1)]);
    return { nw, fd, bd, length: 2 * (len(pc, 'f') + len(pb, 'b')) };
  };
  const need = (k.head + 20) / factor, t = neckFor(0).length >= need ? 0 : solve(x => neckFor(x).length, need, 0, k.head * .3), N = neckFor(Math.ceil(t * 10) / 10);
  const NP = P(N.nw, 0), cpH = Math.max(N.nw + 30 * s, q * .55);
  const alpha = .32, u = P(Math.cos(alpha), Math.sin(alpha)), v = P(-Math.sin(alpha), Math.cos(alpha));
  const cuffLen = Math.max(k.wrist * 1.1, k.wrist + 15 * s), hemC = cuffLen * 1.4, Lov = (k.shoulders / 2 - N.nw) + SL - cuffH + 20 * s;
  const WO = P(NP.x + u.x * Lov, NP.y + u.y * Lov), WU = P(WO.x + v.x * hemC / 2, WO.y + v.y * hemC / 2);
  const yD = Math.min(L - 45 * s, k.talle * .62 + 30 * s), SD = P(q, yD);
  if (yD < N.fd + 60 * s || cpH > q - 25 * s || L < N.fd + 120 * s || WU.x < q + 60 * s) return invalid('buzo-murcielago-proporcion', 'El cuerpo es demasiado corto o la manga no cabe. Revisa largo y holgura.');
  const dWS = dist(WU, SD);
  const side = outline('lateral', 'Lateral con manga murciélago (2 pares: delantero y espalda)', [NP, WO, WU, SD, P(q, L), P(cpH, L)], [
    edge('sobrebrazo', 'Sobrebrazo (une delantero con espalda)', 'costura', sa), edge('puno', 'Bajo de manga (une el puño de rib)', 'costura', sa),
    edge('bajo-manga', 'Bajo de la manga (une delantero con espalda)', 'costura', sa, P(WU.x - u.x * dWS * .45, WU.y - u.y * dWS * .45), P(SD.x + dWS * .3, SD.y)),
    edge('costado', 'Costado', 'costura', sa), edge('bajo', 'Bajo (une la banda)', 'costura', sa), edge('panel', 'Unión al panel central', 'costura', sa)], { qty: 4, mirrorPairs: true });
  side.grain = { a: P((cpH + q) / 2, yD * .4), b: P((cpH + q) / 2, L - 30) };
  const centre = (id: string, name: string, depth: number, back: boolean) => {
    const pc = outline(id, name, [P(0, depth), NP, P(cpH, L), P(0, L)], [
      edge('cuello', back ? 'Escote de espalda' : 'Escote delantero', 'costura', sa, back ? P(N.nw * .44, depth) : P(N.nw * .55, depth), back ? P(N.nw * .8, depth * .72) : P(N.nw, depth * .45)),
      edge('panel', 'Unión al lateral', 'costura', sa), edge('bajo', 'Bajo (une la banda)', 'costura', sa), edge('centro', back ? 'Centro de espalda (al doblez)' : 'Centro delantero (al doblez)', 'doblez', 0)], { onFold: true });
    pc.grain = { a: P(cpH * .4, depth + 20), b: P(cpH * .4, L - 30) };
    return pc;
  };
  const front = centre('centro-delantero', 'Panel central delantero al doblez', N.fd, false), back = centre('centro-espalda', 'Panel central de espalda al doblez', N.bd, true);
  const baseLen = len(front, 'cuello') + len(back, 'cuello');
  const hood = hoodPiece('capucha', 'Capucha (par en espejo)', baseLen, k.head, sa, lined ? { finish: 'costura', allowance: sa, label: 'Boca (une el forro)' } : { finish: 'dobladillo', allowance: 15, label: 'Boca (doble doblez)' });
  const hemTotal = 2 * (len(front, 'bajo') + len(back, 'bajo') + 2 * len(side, 'bajo'));
  const band = cord ? foldedBand('banda', 'Banda del bajo con jareta para el cordón', hemTotal, bh, sa, 1, 'principal') : foldedBand('banda', 'Banda de rib del bajo', hemTotal * .85, bh, sa, 1, 'punto-elastico');
  if (cord) band.marks.push({ id: 'ojal-1', kind: 'ojal', at: P(hemTotal / 4 - 18 * s, bh * .5), label: 'Ojal del cordón (capa exterior, centro delantero)' }, { id: 'ojal-2', kind: 'ojal', at: P(hemTotal / 4 + 18 * s, bh * .5), label: 'Ojal del cordón' });
  const cuff = foldedBand('puno', 'Puño de rib', cuffLen, cuffH, sa, 2, 'punto-elastico');
  const pieces: Piece[] = [front, back, side, hood, ...(lined ? [copyPiece(hood, 'forro-capucha', 'Forro de capucha (punto, par en espejo)', { fabric: 'forro' })] : []), band, cuff];
  const seams: SeamRelation[] = [
    equal('panel-delantero', 'Panel central delantero con laterales', [{ pieceId: 'centro-delantero', edgeIds: ['panel'] }], [{ pieceId: 'lateral', edgeIds: ['panel'] }]),
    equal('panel-espalda', 'Panel central de espalda con laterales', [{ pieceId: 'centro-espalda', edgeIds: ['panel'] }], [{ pieceId: 'lateral', edgeIds: ['panel'] }]),
    equal('capucha-escote', 'Base de capucha con el escote (por lado)', [{ pieceId: 'capucha', edgeIds: ['base-cuello'] }], [{ pieceId: 'centro-delantero', edgeIds: ['cuello'] }, { pieceId: 'centro-espalda', edgeIds: ['cuello'] }]),
    equal('capucha-centro', 'Centro y coronilla de la capucha', [{ pieceId: 'capucha', edgeIds: ['centro-espalda', 'coronilla'] }], [{ pieceId: 'capucha', edgeIds: ['centro-espalda', 'coronilla'] }]),
    ratio('puno-manga', 'Bajo de manga con el puño de rib (estirar el rib)', 'estirado', [{ pieceId: 'lateral', edgeIds: ['puno'], factor: 2 }], [{ pieceId: 'puno', edgeIds: ['union-1'] }], hemC / cuffLen, .04),
    cord ? equal('banda-bajo', 'Bajo con la banda', [{ pieceId: 'centro-delantero', edgeIds: ['bajo'], factor: 2 }, { pieceId: 'centro-espalda', edgeIds: ['bajo'], factor: 2 }, { pieceId: 'lateral', edgeIds: ['bajo'], factor: 4 }], [{ pieceId: 'banda', edgeIds: ['union-1'] }], 1)
      : ratio('banda-bajo', 'Bajo con la banda de rib (estirarla)', 'estirado', [{ pieceId: 'centro-delantero', edgeIds: ['bajo'], factor: 2 }, { pieceId: 'centro-espalda', edgeIds: ['bajo'], factor: 2 }, { pieceId: 'lateral', edgeIds: ['bajo'], factor: 4 }], [{ pieceId: 'banda', edgeIds: ['union-1'] }], 1 / .85, .02)
  ];
  if (pockets) {
    const lp = len(front, 'panel'), y1 = L - 25 * s, y0 = Math.max(yD * .6, y1 - 150 * s), sAt = (y: number) => lp * y / L;
    front.notches.push({ id: 'bolsillo-arriba', edgeId: 'panel', s: sAt(y0), count: 1, label: 'Boca del bolsillo' }, { id: 'bolsillo-abajo', edgeId: 'panel', s: sAt(y1), count: 1, label: 'Fin de la boca' });
    side.notches.push({ id: 'bolsillo-arriba', edgeId: 'panel', s: lp - sAt(y0), count: 1, label: 'Boca del bolsillo (solo laterales delanteros)' }, { id: 'bolsillo-abajo', edgeId: 'panel', s: lp - sAt(y1), count: 1, label: 'Fin de la boca' });
    const bw = 120 * s, bd = (y1 - y0) + 60 * s;
    pieces.push(outline('fondo-bolsillo', 'Fondo de bolsillo (punto, 2 pares)', [P(0, 0), P(bw, 20 * s), P(bw, bd - 30 * s), P(bw * .4, bd), P(0, bd)], [
      edge('superior', 'Canto superior', 'costura', sa), edge('interior', 'Canto interior', 'costura', sa), edge('curva', 'Fondo', 'costura', sa, P(bw, bd - 10 * s), P(bw * .7, bd)), edge('fondo', 'Fondo', 'costura', sa), edge('boca', 'Une la boca', 'costura', sa)], { qty: 4, mirrorPairs: true, fabric: 'forro' }));
  }
  const neckline = 2 * baseLen;
  return {
    pieces, seams,
    notices: [experimentalNotice('buzo-murcielago-experimental', 'Buzo murciélago'),
      neckline * factor < k.head + 20 - .5 ? { level: 'error', code: 'paso-cabeza', message: 'El escote no deja pasar la cabeza.' } : { level: 'ok', code: 'paso-cabeza', message: `Escote de ${cm(neckline)}: pasa una cabeza de ${cm(k.head)}.` },
      child ? { level: 'ok', code: 'sin-cordon', message: 'En tallas infantiles la banda es de rib, sin cordón, y la capucha no lleva cordón.' } : { level: 'ok', code: 'cordon', message: 'Cordón solo en el bajo; la capucha va sin cordón.' }],
    checks: [{ key: 'bajo', label: 'Contorno del bajo terminado', body: k.chest, ease, target: k.chest + ease, measured: hemTotal, tolerance: 1 }, { key: 'capucha', label: 'Base de capucha (por lado)', target: baseLen, measured: len(hood, 'base-cuello'), tolerance: .5 }],
    materials: [
      { id: 'tela', label: 'Felpa o sudadera en tres colores (panel central, laterales, capucha)', qty: 'Según acomodo', note: 'Asigna los colores por pieza en Telas y colores.' },
      { id: 'rib', label: 'Rib para puños' + (cord ? '' : ' y banda'), qty: 'Según piezas' }, ...(lined ? [{ id: 'forro', label: 'Punto ligero para el forro de capucha y los bolsillos', qty: 'Según acomodo' }] : []),
      ...(cord ? [{ id: 'cordon', label: 'Cordón con terminales', qty: cm(hemTotal + 400) }] : [])
    ],
    assumptions: [`Holgura amplia (${cm(ease)}) y manga murciélago cortada con los laterales: la sisa baja hasta ${cm(yD)} del hombro.`, 'Laterales iguales en delantero y espalda (se cortan cuatro); los paneles centrales llevan el escote.', 'Escote resuelto para pasar la cabeza; capucha de dos piezas sin cordón.', 'La referencia era un molde de talla 40/M; el trazo sale de las medidas y cambia de talla.'],
    steps: [
      { id: 'cortar', title: 'Corta', detail: 'Paneles centrales al doblez, cuatro laterales, capucha' + (lined ? ' y su forro' : '') + ', banda, puños' + (pockets ? ' y fondos de bolsillo' : '') + '.', pieces: pieces.map(x => x.id) },
      { id: 'paneles', title: 'Paneles', detail: 'Une cada panel central a sus laterales' + (pockets ? ', dejando la boca del bolsillo abierta entre piquetes y cosiendo allí los fondos' : '') + '.', pieces: ['centro-delantero', 'centro-espalda', 'lateral', ...(pockets ? ['fondo-bolsillo'] : [])], seams: ['panel-delantero', 'panel-espalda'] },
      { id: 'mangas', title: 'Sobrebrazo y costados', detail: 'Une delantero y espalda por el sobrebrazo; luego, de puño a bajo, por la manga y el costado.', pieces: ['lateral'] },
      { id: 'capucha', title: 'Capucha', detail: lined ? 'Arma la capucha y su forro, únelos por la boca, voltea y cose la base al escote.' : 'Dobladilla la boca, arma la capucha y cose la base al escote.', pieces: ['capucha', 'centro-delantero', 'centro-espalda'], seams: ['capucha-centro', 'capucha-escote'] },
      { id: 'rib', title: 'Puños y banda', detail: cord ? 'Cose los puños de rib estirándolos. Haz los ojales en la banda, cósela al bajo y pasa el cordón.' : 'Cose los puños y la banda de rib estirándolos.', pieces: ['puno', 'banda', 'lateral'], seams: ['puno-manga', 'banda-bajo'] }
    ]
  };
}

export const batwingHoodieGenerator: PatternGenerator = {
  id: 'buzo-murcielago', name: 'Buzo corto con capucha y manga murciélago', status: 'experimental',
  summary: 'Buzo corto de paneles con manga murciélago, capucha forrada, bolsillos en las costuras, puños de rib y banda con cordón (sin cordón en niños).',
  requiredMeasures: ['pecho', 'cuello', 'hombros', 'talleEspalda', 'largoManga', 'cabeza'], optionalMeasures: ['estatura', 'muneca'],
  defaults: batwingDefaults, generate: generateBatwing,
  params: [
    { key: 'bolsillos', label: 'Bolsillos en las costuras', group: 'diseno', type: 'choice', choices: [{ value: 'si', label: 'Sí' }, { value: 'no', label: 'No' }] },
    { key: 'cordon', label: 'Cordón en el bajo (solo adulto)', group: 'diseno', type: 'choice', choices: [{ value: 'si', label: 'Sí' }, { value: 'no', label: 'No, banda de rib' }] },
    { key: 'forroCapucha', label: 'Forro de capucha', group: 'diseno', type: 'choice', choices: [{ value: 'si', label: 'Sí' }, { value: 'no', label: 'No' }] },
    { key: 'largo', label: 'Largo total (con banda)', group: 'diseno', type: 'length', min: 200, max: 800 },
    { key: 'largoManga', label: 'Largo de manga (hombro a muñeca)', group: 'diseno', type: 'length', min: 200, max: 800 },
    { key: 'altoBanda', label: 'Alto de la banda', group: 'diseno', type: 'length', min: 20, max: 90 },
    { key: 'altoPuno', label: 'Alto del puño', group: 'diseno', type: 'length', min: 20, max: 120 },
    { key: 'holgura', label: 'Holgura de pecho', group: 'holgura', type: 'length', min: 100, max: 500 },
    { key: 'margen', label: 'Margen de costura', group: 'margenes', type: 'length', min: 5, max: 12 }
  ]
};

export const ADULT_BATCH_GENERATORS = [halfZipGenerator, raglanJacketGenerator, batwingHoodieGenerator];
