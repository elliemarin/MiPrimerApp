import type { Pt } from '../../geom/vec';
import type { GeneratorContext } from '../generator';
import type { EdgeFinish, FabricRole, Issue, Piece, SeamRelation } from '../types';
import { P, clamp, cubicPoint, edge, equal, len, lens, outline, ratio, rectangle, solve, type EdgeDef } from './kidsShared';

/* Bloques infantiles compartidos para los diseños digitalizados desde fotos:
 * cuerpo (delantero y espalda), manga montada con copa resuelta a la sisa,
 * capucha, bandas, lazo decorativo y vista que sigue el escote. Todo se dibuja
 * sobre la línea de costura; el motor añade los márgenes una sola vez. */

export const KID_KINDS = ['bebe', 'toddler', 'infantil'];
export const isKid = (ctx: GeneratorContext) => KID_KINDS.includes(ctx.kind);
export const isSmall = (ctx: GeneratorContext) => ctx.kind === 'bebe' || ctx.kind === 'toddler';
/** Scale relative to a four-year-old (56 cm chest). Keeps details proportional. */
export const sizeFactor = (ctx: GeneratorContext) => clamp((ctx.body.pecho ?? 560) / 560, .7, 1.45);
export const experimentalNotice = (code: string, what: string): Issue => ({ level: 'aviso', code, message: `${what} experimental: imprime al 100 %, comprueba la escala y cose una muestra antes de cortar la tela definitiva.` });

/** Body values with estimates for measures the children's tables do not carry. */
export function kidBody(ctx: GeneratorContext) {
  const b = ctx.body, chest = b.pecho ?? 560;
  return {
    chest, waist: b.cintura ?? chest * .93, hips: b.cadera ?? chest, neck: b.cuello ?? chest * .48, shoulders: b.hombros ?? chest * .47,
    talle: b.talleEspalda ?? chest * .43, sleeve: b.largoManga ?? chest * .66, arm: b.brazo ?? chest * .33, wrist: b.muneca ?? chest * .24,
    head: b.cabeza ?? 500, height: b.estatura ?? chest * 2, rise: b.tiro ?? chest * .3, thigh: b.muslo ?? chest * .55
  };
}

// ------------------------------------------------------------------ Cuerpo
export interface BodiceOpts {
  ease: number;
  /** Centre-back length measured from the neck point level. */
  length: number;
  neckWiden?: number;
  frontDepthExtra?: number;
  /** V neckline depth from the neck point level (replaces the round depth). */
  vDepth?: number;
  dropShoulder?: number;
  armExtra?: number;
  /** Extra half width at the hem. */
  flare?: number;
  /** Front extension beyond centre front (buttons or overlap). */
  ext?: number;
}

export interface BodiceGeo { s: number; q: number; nw: number; fd: number; bd: number; sh: number; sy: number; ad: number; L: number; flare: number; ext: number; v: boolean; /** Back extension for a buttoned back. */ bext?: number }

export function bodiceGeometry(ctx: GeneratorContext, o: BodiceOpts): BodiceGeo {
  const k = kidBody(ctx), s = sizeFactor(ctx), q = (k.chest + o.ease) / 4;
  const nw = k.neck / 6 + 6 * s + (o.neckWiden ?? 0);
  const fd = o.vDepth ?? k.neck / 6 + 12 * s + (o.frontDepthExtra ?? 0);
  const sh = Math.min(k.shoulders / 2 + (o.dropShoulder ?? 0), q - 12 * s), sy = Math.max(0, (sh - nw) * (o.dropShoulder ? .16 : .22));
  const ad = sy + k.talle * .45 + 15 * s + (o.armExtra ?? 0);
  return { s, q, nw, fd, bd: 14 * s, sh, sy, ad, L: o.length, flare: o.flare ?? 0, ext: o.ext ?? 0, v: o.vDepth !== undefined };
}

export interface BodiceFinish {
  sa: number; hem: number;
  neck: EdgeFinish; arm: EdgeFinish; hemFinish: EdgeFinish;
  /** Centre edge: 'doblez' for a fold, otherwise the finish of an open edge. */
  centre: EdgeFinish;
  centreAllowance?: number;
  neckAllowance?: number; armAllowance?: number;
  labels?: Partial<Record<'cuello' | 'sisa' | 'bajo' | 'centro', string>>;
}

/** Half front or back bodice: centre neck → neck point → shoulder → armhole → side → hem → centre. */
export function bodicePiece(id: string, name: string, g: BodiceGeo, back: boolean, f: BodiceFinish, cut: { qty?: number; mirrorPairs?: boolean; fabric?: FabricRole } = {}): Piece {
  const x0 = back ? -(g.bext ?? 0) : -g.ext, depth = back ? g.bd : g.fd;
  const CN = P(x0, depth), NP = P(g.nw, 0), SP = P(g.sh, g.sy);
  const M = P(Math.min(g.sh - (back ? 3 : 7) * g.s, g.q - 8 * g.s), g.sy + .55 * (g.ad - g.sy)), UA = P(g.q, g.ad);
  // A flared hem rises at the side so it meets the side seam square (as in the trapeze dress).
  const flared = g.flare > 8 * g.s, ySide = flared ? g.L - (g.q + g.flare) * (g.flare / Math.max(1, g.L - g.ad)) * .5 : g.L;
  const HS = P(g.q + g.flare, ySide), HC = P(x0, g.L);
  const ul = Math.hypot(g.sh - g.nw, g.sy) || 1, perp = P(-g.sy / ul, (g.sh - g.nw) / ul), hU = M.y - SP.y, tl = (UA.x - M.x) * .7;
  const sa = f.sa, na = f.neck === 'costura' ? f.neckAllowance ?? sa : 0, aa = f.arm === 'costura' ? f.armAllowance ?? sa : 0;
  const lab = f.labels ?? {};
  const neckEdge = !back && g.v
    ? edge('cuello', lab.cuello ?? 'Escote en pico', f.neck, na, P(x0 + (g.nw - x0) * .3, depth * .62), P(x0 + (g.nw - x0) * .72, depth * .2))
    : back
      // A shallow back neck meets the shoulder obliquely; a quarter ellipse would turn too sharply for its allowance.
      ? edge('cuello', lab.cuello ?? 'Escote de espalda', f.neck, na, P(g.nw * .44, depth), P(g.nw * .8, depth * .72))
      : edge('cuello', lab.cuello ?? 'Escote', f.neck, na, P(x0 + (g.nw - x0) * .55, depth), P(g.nw, depth * .45));
  const hemEdge = flared
    ? (() => { const sl = Math.hypot(HS.x - UA.x, HS.y - UA.y), dx = (HS.x - UA.x) / sl, dy = (HS.y - UA.y) / sl; return edge('bajo', lab.bajo ?? 'Bajo', f.hemFinish, f.hemFinish === 'sin-margen' ? 0 : f.hem, P(HS.x - dy * HS.x * .38, HS.y + dx * HS.x * .38), P(x0 + (HS.x - x0) * .38, g.L)); })()
    : edge('bajo', lab.bajo ?? 'Bajo', f.hemFinish, f.hemFinish === 'sin-margen' ? 0 : f.hem);
  const piece = outline(id, name, [CN, NP, SP, M, UA, HS, HC], [
    neckEdge, edge('hombro', 'Hombro', 'costura', sa),
    edge('sisa-superior', lab.sisa ? `${lab.sisa} (tramo superior)` : 'Sisa superior', f.arm, aa, P(SP.x + perp.x * hU * .35, SP.y + perp.y * hU * .35), P(M.x, M.y - hU * .3)),
    edge('sisa-inferior', lab.sisa ? `${lab.sisa} (tramo inferior)` : 'Sisa inferior', f.arm, aa, P(M.x, M.y + (UA.y - M.y) * .4), P(UA.x - tl, UA.y)),
    edge('costado', 'Costado', 'costura', sa), hemEdge,
    f.centre === 'doblez' ? edge('centro', back ? 'Centro de espalda (al doblez)' : 'Centro delantero (al doblez)', 'doblez', 0) : edge('centro', lab.centro ?? (back ? 'Centro de espalda' : 'Canto delantero'), f.centre, f.centre === 'sin-margen' ? 0 : f.centreAllowance ?? sa)
  ], { qty: cut.qty ?? 1, mirrorPairs: cut.mirrorPairs ?? false, onFold: f.centre === 'doblez', fabric: cut.fabric ?? 'principal' });
  piece.grain = { a: P(Math.max(x0 + 15, g.q * .45), g.ad + 10), b: P(Math.max(x0 + 15, g.q * .45), g.L - Math.min(40, (g.L - g.ad) * .3)) };
  if (!back && g.ext > 0) piece.lines.push({ id: 'centro-delantero', kind: 'referencia', a: P(0, g.fd), b: P(0, g.L), label: 'Centro delantero: los botones van sobre esta línea' });
  return piece;
}

export const armhole = (piece: Piece) => lens(piece, ['sisa-superior', 'sisa-inferior']);
export const neckLen = (piece: Piece) => len(piece, 'cuello');

// ------------------------------------------------------------------ Manga montada
export interface SleeveOpts { capH: number; length: number; cuff: number; capEase: number; sa: number; hemFinish: EdgeFinish; hem: number; armMin: number; hemLabel?: string; fabric?: FabricRole }

/** Set-in sleeve whose cap is solved to the armhole (plus `capEase`). Lowers the cap until the bicep fits. */
export function setInSleeve(id: string, name: string, armholeTotal: number, o: SleeveOpts): { piece: Piece; bw: number; capH: number } {
  const make = (bw: number, capH: number) => {
    const cw = Math.min(o.cuff / 2, bw), T = P(0, 0), UB = P(bw, capH), UF = P(-bw, capH);
    const piece = outline(id, name, [T, UB, P(cw, o.length), P(-cw, o.length), UF], [
      edge('copa-trasera', 'Copa trasera', 'costura', o.sa, P(bw * .45, 0), P(bw * .8, capH * .85)),
      edge('costura-trasera', 'Costura de manga', 'costura', o.sa),
      edge('puno', o.hemLabel ?? 'Bajo de manga', o.hemFinish, o.hemFinish === 'sin-margen' ? 0 : o.hem),
      edge('costura-delantera', 'Costura de manga', 'costura', o.sa),
      edge('copa-delantera', 'Copa delantera', 'costura', o.sa, P(-bw * .8, capH * .85), P(-bw * .45, 0))
    ], { qty: 2, mirrorPairs: true, fabric: o.fabric ?? 'principal' });
    piece.grain = { a: P(0, capH * .6), b: P(0, o.length - Math.min(40, o.length * .2)) };
    return piece;
  };
  const target = armholeTotal * (1 + o.capEase);
  let capH = o.capH, bw = 0;
  for (let i = 0; i < 12; i++) {
    const h = capH;
    bw = solve(x => lens(make(x, h), ['copa-delantera', 'copa-trasera']), target, h * .25, target);
    if (2 * bw >= o.armMin || capH < o.capH * .35) break;
    capH *= .88;
  }
  const piece = make(bw, capH);
  piece.notches.push({ id: 'hombro', edgeId: 'copa-trasera', s: 0, count: 1, label: 'Hombro' },
    { id: 'delantera', edgeId: 'copa-delantera', s: len(piece, 'copa-delantera') * .45, count: 1, label: 'Delantero' },
    { id: 'trasera', edgeId: 'copa-trasera', s: len(piece, 'copa-trasera') * .55, count: 2, label: 'Espalda' });
  return { piece, bw, capH };
}

export function sleeveSeams(sleeveId: string, frontId: string, backId: string, capEase: number): SeamRelation[] {
  const a = [{ pieceId: sleeveId, edgeIds: ['copa-delantera', 'copa-trasera'] }], b = [{ pieceId: frontId, edgeIds: ['sisa-superior', 'sisa-inferior'] }, { pieceId: backId, edgeIds: ['sisa-superior', 'sisa-inferior'] }];
  return [
    capEase > .001 ? ratio('manga-sisa', 'Copa de manga con la sisa (embebida)', 'embebido', a, b, 1 + capEase, .012, 'Reparte el embebido entre los piquetes; no frunzas.') : equal('manga-sisa', 'Copa de manga con la sisa', a, b, 1),
    equal('manga-costura', 'Costura de manga', [{ pieceId: sleeveId, edgeIds: ['costura-delantera'] }], [{ pieceId: sleeveId, edgeIds: ['costura-trasera'] }])
  ];
}

export function bodySeams(frontId: string, backId: string): SeamRelation[] {
  return [
    equal('hombros', 'Hombros: delantero con espalda', [{ pieceId: frontId, edgeIds: ['hombro'] }], [{ pieceId: backId, edgeIds: ['hombro'] }]),
    equal('costados', 'Costados: delantero con espalda', [{ pieceId: frontId, edgeIds: ['costado'] }], [{ pieceId: backId, edgeIds: ['costado'] }])
  ];
}

// ------------------------------------------------------------------ Bandas, lazo y capucha
/** Folded band: cut 2 × finished height; edges union-1, extremo-1, union-2, extremo-2. */
export function foldedBand(id: string, name: string, length: number, finishedH: number, sa: number, qty: number, fabric: FabricRole, endFinish: EdgeFinish = 'costura'): Piece {
  const band = rectangle(id, name, length, 2 * finishedH, [
    edge('union-1', 'Unión (capa exterior)', 'costura', sa), edge('extremo-1', 'Extremo', endFinish, endFinish === 'sin-margen' ? 0 : sa),
    edge('union-2', 'Unión (capa interior)', 'costura', sa), edge('extremo-2', 'Extremo', endFinish, endFinish === 'sin-margen' ? 0 : sa)
  ], { qty, fabric }, true);
  band.lines.push({ id: 'doblez', kind: 'doblez', a: P(0, finishedH), b: P(length, finishedH), label: 'Doblar a lo largo' });
  band.notches.push({ id: 'mitad', edgeId: 'union-1', s: length / 2, count: 1, label: 'Mitad' });
  return band;
}

/** Decorative bow sewn fixed: loop, short tails and centre knot. Never used as a tie. */
export function bowPieces(prefix: string, width: number, height: number, sa: number, fabric: FabricRole = 'contraste', qty = 1): Piece[] {
  const p = (id: string) => `${prefix}${id}`;
  const loop = rectangle(p('lazo'), 'Lazo decorativo (lazada)', 2 * width + 10, 2 * height, [
    edge('canto-a', 'Canto largo', 'costura', sa), edge('extremo-a', 'Extremo', 'costura', sa), edge('canto-b', 'Canto largo', 'costura', sa), edge('extremo-b', 'Extremo', 'costura', sa)], { fabric, qty }, true);
  loop.lines.push({ id: 'doblez', kind: 'doblez', a: P(0, height), b: P(2 * width + 10, height), label: 'Doblar a lo largo' });
  const tails = rectangle(p('lazo-colas'), 'Colas del lazo (cortas, cosidas)', width * 1.15, height * 1.4, [
    edge('canto-a', 'Canto largo', 'costura', sa), edge('extremo-a', 'Extremo en V', 'costura', sa), edge('canto-b', 'Canto largo', 'costura', sa), edge('extremo-b', 'Extremo en V', 'costura', sa)], { fabric, qty }, true);
  tails.lines.push({ id: 'doblez', kind: 'doblez', a: P(0, height * .7), b: P(width * 1.15, height * .7), label: 'Doblar a lo largo' });
  const knot = rectangle(p('lazo-nudo'), 'Nudo del lazo', height * 2.6, Math.max(24, height * .9), [
    edge('canto-a', 'Canto', 'sin-margen', 0), edge('extremo-a', 'Extremo', 'costura', sa), edge('canto-b', 'Canto', 'sin-margen', 0), edge('extremo-b', 'Extremo', 'costura', sa)], { fabric, qty }, true);
  knot.notes = ['Doblar los cantos al centro y planchar: envuelve el centro del lazo y se cose por detrás.'];
  return [loop, tails, knot];
}

/** Two-piece hood whose base matches half the neckline exactly. */
export function hoodPiece(id: string, name: string, baseLength: number, head: number, sa: number, mouth: { finish: EdgeFinish; allowance: number; label: string }, cut: { fabric?: FabricRole } = {}): Piece {
  const hoodH = head * .62, rise = Math.min(30, head * .05), hw = Math.sqrt(Math.max(1, baseLength * baseLength - rise * rise)), radius = hoodH * .3;
  const hood = outline(id, name, [P(0, hoodH), P(hw, hoodH - rise), P(hw, radius), P(0, 0)], [
    edge('base-cuello', 'Base de capucha al escote', 'costura', sa), edge('centro-espalda', 'Centro trasero de capucha', 'costura', sa),
    edge('coronilla', 'Coronilla', 'costura', sa, P(hw, 0), P(hw * .4, 0)), edge('boca', mouth.label, mouth.finish, mouth.allowance)
  ], { qty: 2, mirrorPairs: true, fabric: cut.fabric ?? 'principal' });
  hood.grain = { a: P(hw * .48, hoodH * .25), b: P(hw * .48, hoodH * .78) };
  return hood;
}

// ------------------------------------------------------------------ Vista que sigue el escote
export function splitCubic(p0: Pt, c1: Pt, c2: Pt, p3: Pt, t: number) {
  const L = (a: Pt, b: Pt) => P(a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t);
  const a = L(p0, c1), b = L(c1, c2), c = L(c2, p3), d = L(a, b), e = L(b, c), m = L(d, e);
  return { left: { p0, c1: a, c2: d, p3: m }, right: { p0: m, c1: e, c2: c, p3 } };
}

/** Front facing from the extension edge to `width` past it, following the neckline. */
export function frontFacing(front: Piece, id: string, name: string, width: number, sa: number, hemFinish: EdgeFinish, hem: number, fabric: FabricRole = 'principal'): Piece {
  const e = front.edges.find(x => x.id === 'cuello')!, n = (nid: string) => front.nodes.find(x => x.id === nid)!;
  const p0 = P(n(e.from).x, n(e.from).y), p3 = P(n(e.to).x, n(e.to).y), c1 = e.c1 ?? p0, c2 = e.c2 ?? p3;
  const xTarget = Math.min(p0.x + width, p3.x - 4);
  const t = solve(tt => cubicPoint(p0, c1, c2, p3, tt).x, xTarget, 0, 1), part = splitCubic(p0, c1, c2, p3, t).left;
  const hemY = front.nodes.find(x => x.id === front.edges.find(y => y.id === 'bajo')!.to)!.y;
  const Q = part.p3;
  const facing = outline(id, name, [p0, Q, P(Q.x, hemY), P(p0.x, hemY)], [
    edge('cuello', 'Escote', e.finish, e.allowance, part.c1, part.c2), edge('interior', 'Canto interior (sobrehilar)', 'sin-margen', 0),
    edge('bajo', 'Bajo', hemFinish, hemFinish === 'sin-margen' ? 0 : hem), edge('canto', 'Canto delantero (une al delantero)', 'costura', sa)
  ], { qty: 2, mirrorPairs: true, fabric });
  facing.grain = { a: P(p0.x + (Q.x - p0.x) * .5, Q.y + 20), b: P(p0.x + (Q.x - p0.x) * .5, hemY - 20) };
  return facing;
}

/** Places marks evenly on a vertical line. */
export function buttonMarks(piece: Piece, x: number, yTop: number, yBottom: number, count: number, kind: 'boton' | 'ojal', label: string) {
  for (let i = 0; i < count; i++) piece.marks.push({ id: `${kind}-${i + 1}`, kind, at: P(x, yTop + (yBottom - yTop) * (count === 1 ? 0 : i / (count - 1))), label });
}
export type { EdgeDef };
