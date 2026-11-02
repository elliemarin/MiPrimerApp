import { num, round1, str, type GeneratorContext, type GeneratorResult, type Params, type PatternGenerator } from '../generator';
import type { Issue, Piece, SeamRelation } from '../types';
import type { Pt } from '../../geom/vec';
import { P, clamp, cm, cubicPoint, edge, equal, finite, invalid, len, lens, outline, ratio, rectangle, solve } from './kidsShared';
import { bodiceGeometry, bodicePiece, buttonMarks, experimentalNotice, foldedBand, frontFacing, kidBody, setInSleeve, sizeFactor, splitCubic } from './kidsBlocks';

/* Cuarto lote digitalizado (2026-11-02): cazadora de mezclilla clásica con
 * canesú y paneles, chaqueta de campo con cuello alto, cremallera y cuatro
 * bolsillos, y culotte de encaje de una pieza por lado. Todo se traza desde las
 * medidas de la talla; las medidas de las fotos solo sirvieron de comprobación. */

const margin = { key: 'margen', label: 'Margen de costura', group: 'margenes' as const, type: 'length' as const, min: 5, max: 15 };
type JacketStyle = 'mezclilla' | 'campo';

// ------------------------------------------------------------------ Chaquetas clásicas
export const classicJacketDefaults = (style: JacketStyle) => (ctx: GeneratorContext): Params => {
  const k = kidBody(ctx), s = sizeFactor(ctx);
  return style === 'mezclilla'
    ? { largo: round1(k.talle * 1.35), holgura: round1(clamp(k.chest * .16 + 40, 90, 240)), largoManga: round1(k.sleeve + 15 * s), altoPretina: round1(clamp(40 * s, 30, 60)), altoPuno: round1(clamp(40 * s, 30, 60)), altoCuello: round1(clamp(k.neck * .2, 45, 85)), bolsillos: 'pecho-vivo', largoExtra: 0, margen: 10 }
    : { largo: round1(k.talle * 1.6), holgura: round1(clamp(k.chest * .2 + 60, 110, 280)), largoManga: round1(k.sleeve + 20 * s), altoCuello: round1(clamp(k.neck * .15, 35, 65)), bolsillos: 'cuatro', cierre: 'cremallera', cuelloTipo: 'alto', largoExtra: 0, margen: 10, dobladillo: 30 };
};

/** Patch pocket with a pointed bottom (pentagon) and its flap. */
function patchPocket(id: string, name: string, w: number, h: number, sa: number, pointed: boolean): Piece {
  const pts = pointed ? [P(0, 0), P(w, 0), P(w, h * .82), P(w / 2, h), P(0, h * .82)] : [P(0, 0), P(w, 0), P(w, h), P(0, h)];
  const sides = pointed ? [edge('lado-der', 'Lado', 'costura', sa), edge('punta-der', 'Fondo', 'costura', sa), edge('punta-izq', 'Fondo', 'costura', sa), edge('lado-izq', 'Lado', 'costura', sa)]
    : [edge('lado-der', 'Lado', 'costura', sa), edge('fondo', 'Fondo', 'costura', sa), edge('lado-izq', 'Lado', 'costura', sa)];
  const piece = outline(id, name, pts, [edge('boca', 'Boca (doble doblez)', 'dobladillo', 25), ...sides], { qty: 2 });
  piece.grain = { a: P(w / 2, h * .15), b: P(w / 2, h * .7) };
  return piece;
}
function pocketFlap(id: string, name: string, w: number, h: number, sa: number, pointed: boolean, closure: 'ojal' | 'broche'): Piece {
  const pts = pointed ? [P(0, 0), P(w, 0), P(w, h * .7), P(w / 2, h), P(0, h * .7)] : [P(0, 0), P(w, 0), P(w, h), P(0, h)];
  const free = pointed ? [edge('lado-der', 'Lado', 'costura', sa), edge('punta-der', 'Canto libre', 'costura', sa), edge('punta-izq', 'Canto libre', 'costura', sa), edge('lado-izq', 'Lado', 'costura', sa)]
    : [edge('lado-der', 'Lado', 'costura', sa), edge('canto', 'Canto libre', 'costura', sa), edge('lado-izq', 'Lado', 'costura', sa)];
  const flap = outline(id, name, pts, [edge('union', 'Unión al cuerpo', 'costura', sa), ...free], { qty: 4, mirrorPairs: false });
  flap.marks.push({ id: closure, kind: closure === 'ojal' ? 'ojal' : 'cruz', at: P(w / 2, pointed ? h * .72 : h * .62), label: closure === 'ojal' ? 'Ojal (solo en la cartera exterior)' : 'Broche (parte macho en la cartera)' });
  return flap;
}

export function generateClassicJacket(style: JacketStyle, ctx: GeneratorContext, params: Params): GeneratorResult {
  const code = style === 'mezclilla' ? 'cazadora-mezclilla' : 'chaqueta-campo';
  if (ctx.kind === 'bebe' || ctx.kind === 'toddler') return invalid(`${code}-talla`, 'Este patrón empieza en talla infantil (4 años). Elige una talla infantil o adulta.');
  const p = { ...classicJacketDefaults(style)(ctx), ...params }, k = kidBody(ctx), s = sizeFactor(ctx), denim = style === 'mezclilla';
  const L = num(p, 'largo') + num(p, 'largoExtra', 0), ease = num(p, 'holgura'), SL = num(p, 'largoManga'), ch = num(p, 'altoCuello'), sa = num(p, 'margen');
  const bandH = denim ? num(p, 'altoPretina') : 0, cuffH = denim ? num(p, 'altoPuno') : 0, hem = denim ? sa : num(p, 'dobladillo');
  const pockets = str(p, 'bolsillos'), buttoned = denim || str(p, 'cierre', 'cremallera') === 'botones', shirtCollar = denim || str(p, 'cuelloTipo', 'alto') === 'camisero';
  const okPockets = denim ? ['pecho-vivo', 'pecho', 'ninguno'] : ['cuatro', 'pecho', 'ninguno'];
  if (!finite(L, ease, SL, ch, sa, bandH, cuffH, hem) || ease < 60 || ease > 400 || ch < 25 || ch > 100 || sa < 5 || sa > 15 || hem < 5 || hem > 45
    || (denim && (bandH < 25 || bandH > 70 || cuffH < 25 || cuffH > 70)) || !okPockets.includes(pockets) || !['cremallera', 'botones'].includes(str(p, 'cierre', 'cremallera')) || !['alto', 'camisero'].includes(str(p, 'cuelloTipo', 'alto'))) return invalid(`${code}-medidas`, 'Revisa largo, holgura, cuello, pretina, puños, márgenes y bolsillos.');
  const ext = buttoned ? 18 * s : 0;
  const g = bodiceGeometry(ctx, { ease, length: L - bandH, neckWiden: 5 * s, armExtra: 20 * s, ext });
  if (g.L < g.ad + 70 * s || SL < cuffH + 200 * s) return invalid(`${code}-largo`, 'El cuerpo o la manga quedan demasiado cortos para esta talla.');
  const fin = { sa, hem, neck: 'costura' as const, arm: 'costura' as const, hemFinish: denim ? 'costura' as const : 'dobladillo' as const, centre: 'costura' as const,
    labels: denim ? { bajo: 'Unión a la pretina', centro: 'Canto delantero (une a la vista)' } : { centro: buttoned ? 'Canto delantero (une a la vista)' : 'Canto delantero (cremallera)' } };
  const full = bodicePiece('delantero', 'Delantero (par en espejo)', g, false, fin, { qty: 2, mirrorPairs: true });
  const fullBack = bodicePiece('espalda', 'Espalda al doblez', g, true, { ...fin, centre: 'doblez' });
  const facing = frontFacing(full, 'vista', 'Vista delantera (par en espejo)', (denim ? 55 : 65) * s + ext, sa, denim ? 'costura' : 'dobladillo', hem);
  const pieces: Piece[] = [], seams: SeamRelation[] = [], notices: Issue[] = [experimentalNotice(`${code}-experimental`, denim ? 'Cazadora de mezclilla' : 'Chaqueta de campo')];
  const node = (pc: Piece, i: number) => P(pc.nodes[i].x, pc.nodes[i].y), ed = (pc: Piece, id: string) => pc.edges.find(e => e.id === id)!;
  let frontParts: { id: string; edges: string[]; qty: number }[], armParts: { pieceId: string; edgeIds: string[] }[], neckF: Piece, neckB: Piece;
  let buttonPiece = full;

  if (denim) {
    // Yokes: a horizontal line through the upper armhole; front and back panels below.
    const split = (pc: Piece, y: number) => {
      const e = ed(pc, 'sisa-superior'), SP = node(pc, 2), M = node(pc, 3);
      const t = solve(tt => cubicPoint(SP, e.c1!, e.c2!, M, tt).y, y, 0, 1);
      return splitCubic(SP, e.c1!, e.c2!, M, t);
    };
    const M = node(full, 3), yF = Math.min(g.fd + 30 * s, M.y - 15 * s), yB = Math.min(g.sy + (g.ad - g.sy) * .45, M.y - 15 * s);
    if (yF < g.fd + 10 * s) return invalid('cazadora-mezclilla-canesu', 'El canesú delantero no cabe entre el escote y la sisa en esta talla.');
    const build = (back: boolean) => {
      const base = back ? fullBack : full, y = back ? yB : yF, x0 = back ? 0 : -ext, sp = split(base, y), A = sp.left.p3;
      const CN = node(base, 0), NP = node(base, 1), SP = node(base, 2), Mi = node(base, 3), UA = node(base, 4), HS = node(base, 5), neck = ed(base, 'cuello'), low = ed(base, 'sisa-inferior');
      const xs = back ? g.q * .42 : g.q * .5, pre = back ? 'espalda' : 'delantero', mirror = back ? {} : { qty: 2, mirrorPairs: true };
      const centre = (label: string) => back ? edge('centro', 'Centro de espalda (al doblez)', 'doblez', 0) : edge('centro', label, 'costura', sa);
      const yoke = outline(back ? 'canesu-espalda' : 'canesu-delantero', back ? 'Canesú de espalda al doblez' : 'Canesú delantero (par en espejo)', [CN, NP, SP, A, P(x0, y)], [
        edge('cuello', back ? 'Escote de espalda' : 'Escote', 'costura', sa, neck.c1, neck.c2), edge('hombro', 'Hombro', 'costura', sa), edge('sisa', 'Sisa (tramo del canesú)', 'costura', sa, sp.left.c1, sp.left.c2),
        edge('union', 'Unión al panel', 'costura', sa), centre('Canto delantero (une a la vista)')], back ? { onFold: true } : mirror);
      yoke.grain = { a: P(Math.max(x0 + 20, g.nw * .6), y - 15), b: P(Math.max(x0 + 20, g.nw * .6), Math.max(g.fd, g.bd) + 5) };
      const central = outline(`${pre}-central`, back ? 'Espalda central al doblez' : 'Delantero central (par en espejo)', [P(x0, y), P(xs, y), P(xs, g.L), P(x0, g.L)], [
        edge('union', 'Unión al canesú', 'costura', sa), edge('panel', 'Unión al panel lateral', 'costura', sa), edge('bajo', 'Unión a la pretina', 'costura', sa), centre('Canto delantero (une a la vista)')], back ? { onFold: true } : mirror);
      central.grain = { a: P((x0 + xs) / 2, y + 25), b: P((x0 + xs) / 2, g.L - 30) };
      const side = outline(`${pre}-lateral`, back ? 'Espalda lateral (par en espejo)' : 'Delantero lateral (par en espejo)', [P(xs, y), A, Mi, UA, HS, P(xs, g.L)], [
        edge('union', 'Unión al canesú', 'costura', sa), edge('sisa', 'Sisa (tramo superior)', 'costura', sa, sp.right.c1, sp.right.c2), edge('sisa-inferior', 'Sisa inferior', 'costura', sa, low.c1, low.c2),
        edge('costado', 'Costado', 'costura', sa), edge('bajo', 'Unión a la pretina', 'costura', sa), edge('panel', 'Unión al panel central', 'costura', sa)], { qty: 2, mirrorPairs: true });
      side.grain = { a: P(xs + (g.q - xs) * .45, g.ad + 10), b: P(xs + (g.q - xs) * .45, g.L - 30) };
      side.notches.push({ id: 'pliegue-panel', edgeId: 'panel', s: (g.L - y) * .5, count: 1, label: 'Mitad del panel' });
      central.notches.push({ id: 'pliegue-panel', edgeId: 'panel', s: (g.L - y) * .5, count: 1, label: 'Mitad del panel' });
      return { yoke, central, side, xs, y };
    };
    const F = build(false), B = build(true);
    pieces.push(F.yoke, F.central, F.side, B.yoke, B.central, B.side);
    seams.push(
      equal('canesu-delantero', 'Canesú delantero con los paneles', [{ pieceId: 'canesu-delantero', edgeIds: ['union'] }], [{ pieceId: 'delantero-central', edgeIds: ['union'] }, { pieceId: 'delantero-lateral', edgeIds: ['union'] }]),
      equal('canesu-espalda', 'Canesú de espalda con los paneles', [{ pieceId: 'canesu-espalda', edgeIds: ['union'], factor: 2 }], [{ pieceId: 'espalda-central', edgeIds: ['union'], factor: 2 }, { pieceId: 'espalda-lateral', edgeIds: ['union'], factor: 2 }]),
      equal('panel-delantero', 'Paneles del delantero', [{ pieceId: 'delantero-central', edgeIds: ['panel'] }], [{ pieceId: 'delantero-lateral', edgeIds: ['panel'] }]),
      equal('panel-espalda', 'Paneles de la espalda', [{ pieceId: 'espalda-central', edgeIds: ['panel'] }], [{ pieceId: 'espalda-lateral', edgeIds: ['panel'] }]),
      equal('hombros', 'Hombros: canesú delantero con canesú de espalda', [{ pieceId: 'canesu-delantero', edgeIds: ['hombro'] }], [{ pieceId: 'canesu-espalda', edgeIds: ['hombro'] }]),
      equal('costados', 'Costados', [{ pieceId: 'delantero-lateral', edgeIds: ['costado'] }], [{ pieceId: 'espalda-lateral', edgeIds: ['costado'] }]),
      equal('vista', 'Vista con el canto delantero', [{ pieceId: 'vista', edgeIds: ['canto'] }], [{ pieceId: 'canesu-delantero', edgeIds: ['centro'] }, { pieceId: 'delantero-central', edgeIds: ['centro'] }]));
    armParts = [{ pieceId: 'canesu-delantero', edgeIds: ['sisa'] }, { pieceId: 'delantero-lateral', edgeIds: ['sisa', 'sisa-inferior'] }, { pieceId: 'canesu-espalda', edgeIds: ['sisa'] }, { pieceId: 'espalda-lateral', edgeIds: ['sisa', 'sisa-inferior'] }];
    frontParts = [{ id: 'delantero-central', edges: ['bajo'], qty: 2 }, { id: 'delantero-lateral', edges: ['bajo'], qty: 2 }, { id: 'espalda-central', edges: ['bajo'], qty: 2 }, { id: 'espalda-lateral', edges: ['bajo'], qty: 2 }];
    neckF = F.yoke; neckB = B.yoke; buttonPiece = F.central;
    // Buttons on the centre front line: one on the yoke, the rest on the central panel.
    F.yoke.marks.push({ id: 'boton-1', kind: 'boton', at: P(0, (g.fd + yF) / 2), label: 'Botón (ojal en el otro delantero)' });
    buttonMarks(F.central, 0, yF + 45 * s, g.L - 25 * s, 4, 'boton', 'Botón (ojal en el otro delantero)');
    if (pockets !== 'ninguno') {
      const w = (F.xs + ext) * .72, h = w * 1.12, fh = w * .42, x = -ext + (F.xs + ext - w) / 2, y0 = yF + 22 * s;
      if (y0 + fh + h > g.L - 20 * s) return invalid('cazadora-mezclilla-bolsillo', 'El bolsillo de pecho no cabe en el panel delantero; alarga la cazadora o quita los bolsillos.');
      pieces.push(patchPocket('bolsillo-pecho', 'Bolsillo de pecho con punta', w, h, sa, true), pocketFlap('cartera-pecho', 'Cartera de pecho (exterior y vista)', w + 8, fh, sa, true, 'ojal'));
      F.central.lines.push({ id: 'cartera-pecho', kind: 'colocacion', a: P(x - 4, y0), b: P(x + w + 4, y0), label: 'Cartera: línea de unión' }, { id: 'bolsillo-pecho', kind: 'colocacion', a: P(x, y0 + 12 * s), b: P(x + w, y0 + 12 * s), label: 'Bolsillo: boca' });
      F.central.marks.push({ id: 'boton-cartera', kind: 'boton', at: P(x + w / 2, y0 + fh * .72), label: 'Botón de la cartera' });
      if (pockets === 'pecho-vivo') {
        // Welt length follows the room under the armhole (short in children's sizes).
        const wl = Math.min(clamp(140 * s, 90, 170), g.L - 30 * s - g.ad - 10), xw = F.xs + (g.q - F.xs) * .3, yw = g.L - 30 * s - wl;
        if (wl < 80) return invalid('cazadora-mezclilla-vivo', 'El bolsillo de vivo no cabe bajo la sisa; alarga la cazadora o deja solo los de pecho.');
        F.side.lines.push({ id: 'vivo', kind: 'colocacion', a: P(xw, yw), b: P(xw - 12 * s, yw + wl), label: 'Bolsillo de vivo: abertura' });
        const welt = foldedBand('vivo', 'Vivo del bolsillo (doblado)', wl + 2 * 15, 25 * s, sa, 2, 'principal');
        const bag = rectangle('bolsa', 'Bolsa del bolsillo de vivo', wl + 50, wl * 1.1, [edge('boca', 'Boca', 'costura', sa), edge('lado-der', 'Lado', 'costura', sa), edge('fondo', 'Fondo', 'costura', sa), edge('lado-izq', 'Lado', 'costura', sa)], { qty: 4, fabric: 'forro' });
        pieces.push(welt, bag);
      }
    }
  } else {
    pieces.push(full, fullBack);
    seams.push(equal('hombros', 'Hombros', [{ pieceId: 'delantero', edgeIds: ['hombro'] }], [{ pieceId: 'espalda', edgeIds: ['hombro'] }]),
      equal('costados', 'Costados', [{ pieceId: 'delantero', edgeIds: ['costado'] }], [{ pieceId: 'espalda', edgeIds: ['costado'] }]),
      equal('vista', 'Vista con el canto delantero', [{ pieceId: 'vista', edgeIds: ['canto'] }], [{ pieceId: 'delantero', edgeIds: ['centro'] }]));
    armParts = [{ pieceId: 'delantero', edgeIds: ['sisa-superior', 'sisa-inferior'] }, { pieceId: 'espalda', edgeIds: ['sisa-superior', 'sisa-inferior'] }];
    frontParts = [];
    neckF = full; neckB = fullBack;
    if (buttoned) buttonMarks(full, 0, g.fd + 22 * s, g.L - hem - 45 * s, 5, 'boton', 'Botón (ojal en el otro delantero)');
    else {
      const centreLen = len(full, 'centro');
      const flap = foldedBand('tapeta', 'Tapeta de broches sobre la cremallera (doblada)', centreLen, 40 * s, sa, 1, 'principal');
      for (let i = 0; i < 5; i++) flap.marks.push({ id: `broche-${i + 1}`, kind: 'cruz', at: P(20 * s + (centreLen - 40 * s) * i / 4, 20 * s), label: 'Broche' });
      pieces.push(flap);
      seams.push(equal('tapeta', 'Tapeta con el canto del delantero izquierdo', [{ pieceId: 'tapeta', edgeIds: ['union-1'] }], [{ pieceId: 'delantero', edgeIds: ['centro'] }]));
    }
    if (pockets !== 'ninguno') {
      const wc = g.q * .45, hc = wc * 1.12, xc = g.q * .14, yc = Math.max(g.ad - 50 * s, g.fd + 40 * s);
      pieces.push(patchPocket('bolsillo-pecho', 'Bolsillo de pecho', wc, hc, sa, false), pocketFlap('cartera-pecho', 'Cartera de pecho (exterior y vista)', wc + 8, 50 * s, sa, false, 'broche'));
      full.lines.push({ id: 'cartera-pecho', kind: 'colocacion', a: P(xc - 4, yc - 14 * s), b: P(xc + wc + 4, yc - 14 * s), label: 'Cartera de pecho: línea de unión' }, { id: 'bolsillo-pecho', kind: 'colocacion', a: P(xc, yc), b: P(xc + wc, yc), label: 'Bolsillo de pecho: boca' });
      if (pockets === 'cuatro') {
        // Lower pockets shrink with the room left under the chest pockets (children's sizes).
        const yl = yc + hc + 45 * s, hl = Math.min(g.q * .62 * 1.05, g.L - hem - 25 * s - yl), wl = Math.min(g.q * .62, hl / .8);
        if (hl < 70 * s) return invalid('chaqueta-campo-bolsillos', 'Los bolsillos bajos no caben; alarga la chaqueta o deja solo los de pecho.');
        const xl = (g.q - wl) * .45;
        pieces.push(patchPocket('bolsillo-bajo', 'Bolsillo bajo', wl, hl, sa, false), pocketFlap('cartera-bajo', 'Cartera del bolsillo bajo (exterior y vista)', wl + 8, 60 * s, sa, false, 'broche'));
        full.lines.push({ id: 'cartera-bajo', kind: 'colocacion', a: P(xl - 4, yl - 16 * s), b: P(xl + wl + 4, yl - 16 * s), label: 'Cartera baja: línea de unión' }, { id: 'bolsillo-bajo', kind: 'colocacion', a: P(xl, yl), b: P(xl + wl, yl), label: 'Bolsillo bajo: boca' });
      }
    }
  }

  // Sleeve: cap solved to the whole armhole (yoke and panel parts).
  const arm = armParts.reduce((t, a) => t + lens(pieces.find(x => x.id === a.pieceId)!, a.edgeIds), 0);
  const capEase = denim ? .025 : .035, pleat = 15 * s, cuffC = k.wrist + 75 * s, under = 20 * s;
  const { piece: sleeve } = setInSleeve('manga', 'Manga (par en espejo)', arm, {
    capH: (g.ad - g.sy) * .55, length: SL - cuffH, cuff: denim ? cuffC + 2 * pleat : cuffC * 1.35, capEase, sa, hemFinish: denim ? 'costura' : 'dobladillo', hem: denim ? sa : hem,
    armMin: k.arm + 80 * s, hemLabel: denim ? 'Unión al puño' : 'Bajo de manga'
  });
  pieces.push(sleeve);
  seams.push(ratio('manga-sisa', 'Copa de manga con la sisa (embebida)', 'embebido', [{ pieceId: 'manga', edgeIds: ['copa-delantera', 'copa-trasera'] }], armParts, 1 + capEase, .012, 'Reparte el embebido entre los piquetes; no frunzas.'),
    equal('manga-costura', 'Costura de manga', [{ pieceId: 'manga', edgeIds: ['costura-delantera'] }], [{ pieceId: 'manga', edgeIds: ['costura-trasera'] }]));
  const sleeveHem = len(sleeve, 'puno'), hemY = sleeve.nodes[2].y;
  if (denim) {
    const xr = sleeveHem * .22;
    sleeve.lines.push({ id: 'abertura', kind: 'referencia', a: P(xr, hemY), b: P(xr, hemY - 110 * s), label: 'Abertura del puño (cortar)' },
      { id: 'pliegue-1', kind: 'colocacion', a: P(xr - 30 * s, hemY), b: P(xr - 30 * s, hemY - 30 * s), label: 'Pliegue hacia la abertura' },
      { id: 'pliegue-2', kind: 'colocacion', a: P(xr - 60 * s, hemY), b: P(xr - 60 * s, hemY - 30 * s), label: 'Pliegue hacia la abertura' });
    const cuff = foldedBand('puno', 'Puño (doblado)', cuffC + under, cuffH, sa, 2, 'principal');
    cuff.marks.push({ id: 'ojal', kind: 'ojal', at: P(12 * s, cuffH / 2), label: 'Ojal' }, { id: 'boton', kind: 'boton', at: P(cuffC + under - 12 * s, cuffH / 2), label: 'Botón' });
    const bind = rectangle('vivo-abertura', 'Ribete de la abertura del puño', 2 * 110 * s + 20, 30 * s, [edge('union', 'Unión a la abertura', 'costura', 5), edge('extremo-der', 'Extremo', 'sin-margen', 0), edge('canto', 'Canto (doblar y cerrar)', 'costura', 5), edge('extremo-izq', 'Extremo', 'sin-margen', 0)], { qty: 2 }, true);
    pieces.push(cuff, bind);
    seams.push(ratio('puno-manga', 'Bajo de manga con pliegues sobre el puño', 'embebido', [{ pieceId: 'manga', edgeIds: ['puno'] }], [{ pieceId: 'puno', edgeIds: ['union-1'] }], sleeveHem / (cuffC + under), .01, 'Forma los dos pliegues marcados; el puño cruza 2 cm para el botón.'));
  } else {
    const tab = rectangle('pestana-manga', 'Pestaña del puño (exterior y vista)', 110 * s, 35 * s, [edge('union', 'Unión a la costura de manga', 'costura', sa), edge('lado-der', 'Lado', 'costura', sa), edge('punta', 'Punta', 'costura', sa), edge('lado-izq', 'Lado', 'costura', sa)], { qty: 4 });
    tab.marks.push({ id: 'broche', kind: 'cruz', at: P(85 * s, 17 * s), label: 'Broche' });
    sleeve.marks.push({ id: 'broche-1', kind: 'cruz', at: P(-sleeveHem * .1, hemY - hem - 25 * s), label: 'Broche: puño ajustado' }, { id: 'broche-2', kind: 'cruz', at: P(-sleeveHem * .25, hemY - hem - 25 * s), label: 'Broche: puño abierto' });
    pieces.push(tab);
  }

  // Collar: one-piece shirt collar (denim) or a stand collar (field jacket), over the whole neckline.
  const nl = 2 * (len(neckF, 'cuello') + len(neckB, 'cuello')), tip = shirtCollar ? 18 * s : 0;
  const collar = outline('cuello', shirtCollar ? 'Cuello camisero (superior y bajo cuello)' : 'Cuello alto (exterior e interior)', [P(0, 0), P(nl, 0), P(nl + tip, ch), P(-tip, ch)], [
    edge('union', 'Unión al escote', 'costura', sa), edge('extremo-der', 'Extremo', 'costura', sa), edge('canto', shirtCollar ? 'Canto exterior' : 'Canto superior', 'costura', sa), edge('extremo-izq', 'Extremo', 'costura', sa)], { qty: 2 });
  collar.grain = { a: P(nl * .3, ch / 2), b: P(nl * .7, ch / 2) };
  collar.notches.push({ id: 'hombro-1', edgeId: 'union', s: len(neckF, 'cuello'), count: 1, label: 'Hombro' }, { id: 'hombro-2', edgeId: 'union', s: nl - len(neckF, 'cuello'), count: 1, label: 'Hombro' }, { id: 'centro', edgeId: 'union', s: nl / 2, count: 2, label: 'Centro de espalda' });
  pieces.push(collar, facing);
  seams.push(equal('cuello-escote', 'Cuello con el escote', [{ pieceId: 'cuello', edgeIds: ['union'] }], [{ pieceId: neckF.id, edgeIds: ['cuello'], factor: 2 }, { pieceId: neckB.id, edgeIds: ['cuello'], factor: 2 }], 1));

  let bandLen = 0;
  if (denim) {
    bandLen = frontParts.reduce((t, f) => t + f.qty * lens(pieces.find(x => x.id === f.id)!, f.edges), 0);
    const band = foldedBand('pretina', 'Pretina (doblada)', bandLen, bandH, sa, 1, 'principal');
    band.marks.push({ id: 'ojal', kind: 'ojal', at: P(12 * s, bandH / 2), label: 'Ojal' }, { id: 'boton', kind: 'boton', at: P(bandLen - 12 * s, bandH / 2), label: 'Botón' });
    for (const [i, f] of [.3, .7].entries()) band.marks.push({ id: `ajuste-${i + 1}`, kind: 'boton', at: P(bandLen * f, bandH / 2), label: 'Botón de la presilla de ajuste (opcional)' });
    pieces.push(band);
    seams.push(equal('pretina', 'Pretina con el bajo de los paneles y la vista', [{ pieceId: 'pretina', edgeIds: ['union-1'] }], frontParts.map(f => ({ pieceId: f.id, edgeIds: f.edges, factor: f.qty }))));
  }
  const chest = denim ? 2 * (pieces.find(x => x.id === 'delantero-lateral')!.nodes[3].x + pieces.find(x => x.id === 'espalda-lateral')!.nodes[3].x) : 2 * (full.nodes[4].x + fullBack.nodes[4].x);
  const buttons = denim ? 1 + 4 + 1 + 2 + (pockets !== 'ninguno' ? 2 : 0) : 0;
  void buttonPiece;
  return {
    pieces, seams, notices,
    checks: [{ key: 'pecho', label: 'Contorno de pecho terminado', body: k.chest, ease, target: k.chest + ease, measured: chest, tolerance: .5 },
      { key: 'cuello', label: 'Cuello sobre el escote', target: nl, measured: len(collar, 'union'), tolerance: .5 }],
    materials: denim ? [
      { id: 'tela', label: 'Mezclilla de 10–14 oz (algodón 100 % o con poco elastano)', qty: 'Según acomodo', note: 'Lava la mezclilla antes de cortar: encoge.' },
      { id: 'botones', label: 'Botones de golpe (jean) de 16–17 mm', qty: `${buttons}` },
      { id: 'entretela', label: 'Entretela termoadhesiva media', qty: 'Cuello, pretina, puños, carteras y vistas' },
      { id: 'hilo', label: 'Hilo de pespunte grueso (n.º 30) y aguja de mezclilla 100/16', qty: '2 carretes' }
    ] : [
      { id: 'tela', label: 'Sarga o gabardina de algodón de peso medio', qty: 'Según acomodo' },
      ...(buttoned ? [{ id: 'botones', label: 'Botones de 18–20 mm', qty: '5' }] : [{ id: 'cremallera', label: 'Cremallera separable', qty: cm(len(full, 'centro') - 20) }]),
      { id: 'broches', label: 'Broches de presión metálicos', qty: `${(buttoned ? 0 : 5) + 4 + (pockets === 'cuatro' ? 4 : pockets === 'pecho' ? 2 : 0)}` },
      { id: 'entretela', label: 'Entretela termoadhesiva media', qty: buttoned ? 'Cuello, vistas y carteras' : 'Cuello, tapeta, vistas y carteras' },
      { id: 'hilo', label: 'Hilo de poliéster', qty: '2 carretes' }
    ],
    assumptions: [
      `Pecho + ${cm(ease)}; copa de manga resuelta a la sisa con ${Math.round(capEase * 1000) / 10} % de embebido.`,
      denim ? `Canesú delantero a ${cm(g.fd + 30 * s)} del hombro y de espalda más bajo; paneles centrales y laterales; pretina de ${cm(bandH)} y puños de ${cm(cuffH)} con pliegues.` : `Cuerpo entero sin canesú; ${buttoned ? 'cierre de botones con vista' : 'cremallera separable cubierta por una tapeta de broches'}; cuello ${shirtCollar ? 'camisero' : 'alto'}.`,
      'Manga de una pieza: la referencia usaba manga de dos piezas; esta versión es más fácil de coser y se puede cambiar de talla con seguridad.',
      denim ? 'Las medidas de la referencia (talla 50, pecho 100 cm) se usaron solo como comprobación del largo y del canesú.' : 'Las medidas de la referencia no eran coherentes (manga de 5 cm de ancho en el puño, copa de 12 cm); el trazo sale de las medidas de la talla.'
    ],
    steps: denim ? [
      { id: 'cortar', title: 'Corta', detail: 'Corta canesús, paneles, mangas, cuello, vistas, pretina, puños y bolsillos. Entretela cuello, pretina, puños, carteras y vistas.', pieces: pieces.map(x => x.id) },
      ...(pockets !== 'ninguno' ? [{ id: 'bolsillos', title: 'Bolsillos', detail: 'Dobladilla la boca del bolsillo de pecho, plancha los márgenes y pespúntalo sobre su línea. Arma las carteras, voltea, pespuntea, haz el ojal y cóselas boca abajo sobre su línea; dóblalas y pespuntea. Si llevas vivos, ábrelos en el panel lateral antes de unir paneles.', pieces: ['bolsillo-pecho', 'cartera-pecho', 'delantero-central'] }] : []),
      { id: 'paneles', title: 'Paneles y canesús', detail: 'Une cada panel central con su lateral y cose los canesús. Plancha los márgenes hacia los costados y haz doble pespunte.', pieces: ['delantero-central', 'delantero-lateral', 'canesu-delantero', 'espalda-central', 'espalda-lateral', 'canesu-espalda'], seams: ['panel-delantero', 'panel-espalda', 'canesu-delantero', 'canesu-espalda'] },
      { id: 'hombros', title: 'Hombros, cuello y vistas', detail: 'Une hombros. Arma el cuello, voltea y pespuntea. Encaja el cuello entre el escote y las vistas y cose del canto delantero al otro.', pieces: ['cuello', 'vista', 'canesu-delantero', 'canesu-espalda'], seams: ['hombros', 'cuello-escote', 'vista'] },
      { id: 'mangas', title: 'Mangas', detail: 'Ribetea la abertura del puño, monta la manga en plano, cierra costados y mangas de un tirón, forma los pliegues y cose el puño.', pieces: ['manga', 'vivo-abertura', 'puno'], seams: ['manga-sisa', 'costados', 'manga-costura', 'puno-manga'] },
      { id: 'pretina', title: 'Pretina', detail: 'Cose la pretina al bajo de canto a canto encerrando las vistas, dóblala y pespuntea por el derecho.', pieces: ['pretina'], seams: ['pretina'] },
      { id: 'botones', title: 'Botones', detail: 'Haz los ojales en el delantero derecho, la pretina y los puños; coloca los botones de golpe.', pieces: ['delantero-central', 'pretina', 'puno'] }
    ] : [
      { id: 'cortar', title: 'Corta', detail: 'Corta delanteros, espalda, mangas, cuello, vistas, tapeta, pestañas y bolsillos. Entretela cuello, tapeta, vistas y carteras.', pieces: pieces.map(x => x.id) },
      ...(pockets !== 'ninguno' ? [{ id: 'bolsillos', title: 'Bolsillos', detail: 'Dobladilla la boca de cada bolsillo, plancha los márgenes y pespúntalos sobre sus líneas. Arma las carteras, voltea, pespuntea, pon la parte macho del broche y cóselas boca abajo; dóblalas y pespuntea.', pieces: ['bolsillo-pecho', 'cartera-pecho', 'delantero'] }] : []),
      { id: 'cuerpo', title: 'Hombros, mangas y costados', detail: 'Une hombros, monta las mangas en plano con las pestañas encajadas en la costura de manga y cierra costados y mangas.', pieces: ['delantero', 'espalda', 'manga', 'pestana-manga'], seams: ['hombros', 'manga-sisa', 'costados', 'manga-costura'] },
      buttoned ? { id: 'vistas', title: 'Cuello y vistas', detail: 'Arma el cuello, voltea y pespuntea. Encájalo entre el escote y las vistas y cose de canto a canto; voltea y pespuntea.', pieces: ['delantero', 'vista', 'cuello'], seams: ['vista', 'cuello-escote'] }
        : { id: 'cremallera', title: 'Cremallera y tapeta', detail: 'Hilvana la cremallera a los cantos. Cose la tapeta doblada sobre el canto izquierdo. Encaja el cuello y cose las vistas de canto a canto; voltea y pespuntea.', pieces: ['delantero', 'tapeta', 'vista', 'cuello'], seams: ['tapeta', 'vista', 'cuello-escote'] },
      { id: 'bajos', title: buttoned ? 'Bajos, ojales y broches' : 'Bajos y broches', detail: buttoned ? 'Dobladilla el bajo y las mangas; haz los ojales del delantero derecho y coloca botones y broches de carteras y pestañas.' : 'Dobladilla el bajo y las mangas; coloca los broches de la tapeta, carteras y pestañas.', pieces: ['delantero', 'manga'] }
    ]
  };
}

const jacketParams = (style: JacketStyle): PatternGenerator['params'] => [
  { key: 'bolsillos', label: 'Bolsillos', group: 'diseno', type: 'choice', choices: style === 'mezclilla'
    ? [{ value: 'pecho-vivo', label: 'Pecho con cartera y vivos laterales' }, { value: 'pecho', label: 'Solo de pecho con cartera' }, { value: 'ninguno', label: 'Sin bolsillos' }]
    : [{ value: 'cuatro', label: 'Cuatro con cartera' }, { value: 'pecho', label: 'Dos de pecho con cartera' }, { value: 'ninguno', label: 'Sin bolsillos' }] },
  { key: 'largo', label: 'Largo de espalda', group: 'diseno', type: 'length', min: 300, max: 1000 },
  { key: 'largoManga', label: 'Largo de manga (hombro a muñeca)', group: 'diseno', type: 'length', min: 300, max: 800 },
  { key: 'altoCuello', label: 'Alto del cuello', group: 'diseno', type: 'length', min: 25, max: 100 },
  ...(style === 'campo' ? [
    { key: 'cierre', label: 'Cierre', group: 'diseno' as const, type: 'choice' as const, choices: [{ value: 'cremallera', label: 'Cremallera con tapeta de broches' }, { value: 'botones', label: 'Botones' }] },
    { key: 'cuelloTipo', label: 'Cuello', group: 'diseno' as const, type: 'choice' as const, choices: [{ value: 'alto', label: 'Cuello alto' }, { value: 'camisero', label: 'Cuello camisero' }] }
  ] : []),
  { key: 'largoExtra', label: 'Ajuste de largo', group: 'diseno', type: 'length', min: -250, max: 250 },
  ...(style === 'mezclilla' ? [
    { key: 'altoPretina', label: 'Alto de la pretina', group: 'diseno' as const, type: 'length' as const, min: 25, max: 70 },
    { key: 'altoPuno', label: 'Alto del puño', group: 'diseno' as const, type: 'length' as const, min: 25, max: 70 }
  ] : [{ key: 'dobladillo', label: 'Dobladillo', group: 'margenes' as const, type: 'length' as const, min: 15, max: 45 }]),
  { key: 'holgura', label: 'Holgura de pecho', group: 'holgura', type: 'length', min: 60, max: 400 },
  margin
];

export const denimJacketGenerator: PatternGenerator = {
  id: 'cazadora-mezclilla', name: 'Cazadora de mezclilla clásica con canesú', status: 'experimental',
  summary: 'Cazadora con canesú, paneles delanteros y traseros, bolsillos de pecho con cartera, pretina y puños abotonados.',
  requiredMeasures: ['pecho', 'cuello', 'hombros', 'talleEspalda', 'largoManga'], optionalMeasures: ['estatura', 'brazo', 'muneca'],
  defaults: classicJacketDefaults('mezclilla'), generate: (ctx, p) => generateClassicJacket('mezclilla', ctx, p), params: jacketParams('mezclilla')
};
export const fieldJacketGenerator: PatternGenerator = {
  id: 'chaqueta-campo', name: 'Chaqueta de campo con cuello alto y cuatro bolsillos', status: 'experimental',
  summary: 'Chaqueta recta con cuello alto, cremallera bajo tapeta de broches, bolsillos de parche con cartera y pestañas en los puños.',
  requiredMeasures: ['pecho', 'cuello', 'hombros', 'talleEspalda', 'largoManga'], optionalMeasures: ['estatura', 'brazo', 'muneca'],
  defaults: classicJacketDefaults('campo'), generate: (ctx, p) => generateClassicJacket('campo', ctx, p), params: jacketParams('campo')
};

// ------------------------------------------------------------------ Culotte de encaje
export function boyshortDefaults(ctx: GeneratorContext): Params {
  const stretch = ctx.stretch ?? 30;
  return { reduccion: round1(clamp(stretch * .5, 8, 22)), bajadaCintura: 60, subidaPierna: round1(clamp((ctx.body.cadera ?? 900) * .055, 35, 70)), acabado: 'puntilla', refuerzo: 'si', margen: 6 };
}

export function generateBoyshort(ctx: GeneratorContext, params: Params): GeneratorResult {
  if (ctx.kind !== 'mujer') return invalid('culotte-talla', 'Este culotte de lencería está trazado para tallas de mujer.');
  const p = { ...boyshortDefaults(ctx), ...params }, b = ctx.body;
  const H = b.cadera ?? 900, CD = b.tiro ?? 260, thigh = b.muslo ?? H * .57, W = b.cintura ?? H * .75, stretch = ctx.stretch ?? 0;
  const red = num(p, 'reduccion') / 100, low = num(p, 'bajadaCintura'), legRise = num(p, 'subidaPierna'), sa = num(p, 'margen'), trim = str(p, 'acabado') === 'puntilla', gusset = str(p, 'refuerzo') === 'si';
  if (!finite(red, low, legRise, sa) || red < .03 || red > .3 || low < 0 || low > 120 || legRise < 20 || legRise > 90 || sa < 5 || sa > 10) return invalid('culotte-medidas', 'Revisa la reducción, la bajada de cintura, la subida de pierna y el margen.');
  if (ctx.fabric !== 'punto' || stretch < 20) return invalid('culotte-elasticidad', 'Necesita encaje elástico o punto con al menos 20 % de elasticidad horizontal.');
  if (red * 100 > stretch * .7) return invalid('culotte-reduccion', `Con ${stretch} % de elasticidad la reducción no puede pasar de ${Math.round(stretch * .7)} %.`);
  const s = H / 900, Ht = H * (1 - red), fw = Ht / 2 * .48, bw = Ht / 2 * .52;
  const ef = Ht * .06, eb = Ht * .115, cbs = Ht * .025, ins = 30 * s, dx = 10 * s;
  const Rf = CD - low, Rb = Rf + 35 * s, yc = Rb;
  if (Rf < 120) return invalid('culotte-tiro', 'Con esta bajada de cintura el tiro delantero queda demasiado corto.');
  // One half piece: front on the left, back on the right, no side seam; short inseam closes each leg.
  const F0 = P(ef, Rb - Rf), B0 = P(ef + fw + bw - cbs, 0), BC = P(ef + fw + bw + eb, yc), BI = P(BC.x - dx, yc + ins), FI = P(dx, yc + ins), FC = P(0, yc);
  const span = BI.x - FI.x, top = 'sin-margen' as const;
  const wf = trim ? top : 'dobladillo' as const, wa = trim ? 0 : 8;
  const piece = outline('culotte', 'Culotte: delantero y trasero de una pieza (par en espejo)', [F0, B0, BC, BI, FI, FC], [
    edge('cintura', trim ? 'Cintura (cose la puntilla elástica)' : 'Cintura (elástico doblado)', wf, wa, P(F0.x + (B0.x - F0.x) * .4, F0.y + 3 * s), P(F0.x + (B0.x - F0.x) * .75, B0.y + (F0.y - B0.y) * .35)),
    edge('centro-trasero', 'Centro trasero', 'costura', sa, P(B0.x + cbs * .4, Rb * .5), P(BC.x - eb * .55, yc)),
    edge('entrepierna-trasera', 'Entrepierna trasera', 'costura', sa),
    edge('pierna', trim ? 'Pierna (cose la puntilla elástica)' : 'Pierna (elástico doblado)', wf, wa, P(BI.x - span * .28, BI.y - legRise * 1.33), P(FI.x + span * .28, FI.y - legRise * 1.33)),
    edge('entrepierna-delantera', 'Entrepierna delantera', 'costura', sa),
    edge('centro-delantero', 'Centro delantero', 'costura', sa, P(ef * .6, yc), P(F0.x, F0.y + (yc - F0.y) * .45))
  ], { qty: 2, mirrorPairs: true });
  piece.grain = { a: P(ef + fw * .5, (Rb - Rf) + 30 * s), b: P(ef + fw * .5, yc - 20 * s) };
  piece.lines.push({ id: 'costado', kind: 'referencia', a: P(ef + fw, Rb * .25), b: P(ef + fw, yc + ins - legRise * .9), label: 'Costado (sin costura)' });
  const pieces: Piece[] = [piece];
  const seams: SeamRelation[] = [
    equal('centro-delantero', 'Centro delantero: une las dos piezas', [{ pieceId: 'culotte', edgeIds: ['centro-delantero'] }], [{ pieceId: 'culotte', edgeIds: ['centro-delantero'] }]),
    equal('centro-trasero', 'Centro trasero: une las dos piezas', [{ pieceId: 'culotte', edgeIds: ['centro-trasero'] }], [{ pieceId: 'culotte', edgeIds: ['centro-trasero'] }]),
    equal('entrepierna', 'Entrepierna: delantera con trasera de la misma pieza', [{ pieceId: 'culotte', edgeIds: ['entrepierna-delantera'] }], [{ pieceId: 'culotte', edgeIds: ['entrepierna-trasera'] }])
  ];
  if (gusset) {
    const gw = 65 * s, gb = 95 * s, gl = 130 * s;
    const lining = outline('refuerzo', 'Refuerzo de entrepierna (algodón)', [P(-gw / 2, 0), P(gw / 2, 0), P(gb / 2, gl), P(-gb / 2, gl)], [
      edge('delantero', 'Extremo delantero', 'sin-margen', 0), edge('lado-der', 'Lado (con la pierna)', 'sin-margen', 0), edge('trasero', 'Extremo trasero', 'sin-margen', 0), edge('lado-izq', 'Lado (con la pierna)', 'sin-margen', 0)], { qty: 1, fabric: 'forro' });
    lining.grain = { a: P(0, gl * .2), b: P(0, gl * .8) };
    lining.lines.push({ id: 'cruce', kind: 'referencia', a: P(-gw * .6, gl * .4), b: P(gw * .6, gl * .4), label: 'Cruce de las costuras centrales' });
    pieces.push(lining);
  }
  const legOpen = len(piece, 'pierna'), waistEdge = 2 * len(piece, 'cintura'), legStretch = legOpen * (1 + stretch / 100 * .6);
  const notices: Issue[] = [experimentalNotice('culotte-experimental', 'Culotte de encaje'),
    legStretch < thigh * 1.0 ? { level: 'error', code: 'culotte-pierna', message: `La pierna (${cm(legOpen)}) no estira lo suficiente para un muslo de ${cm(thigh)}. Baja la reducción o la subida de pierna.` }
      : legOpen > thigh * 1.08 ? { level: 'aviso', code: 'culotte-pierna', message: 'La pierna queda más ancha que el muslo: el encaje puede despegarse. Sube la reducción.' }
        : { level: 'ok', code: 'culotte-pierna', message: `Abertura de pierna de ${cm(legOpen)}: ajusta al muslo de ${cm(thigh)} con la elasticidad del encaje.` },
    { level: 'aviso', code: 'culotte-higiene', message: 'Usa algodón en el refuerzo de entrepierna y lava el encaje antes de cortar.' }];
  return {
    pieces, seams, notices,
    checks: [{ key: 'cadera', label: 'Contorno de cadera terminado (reducido)', body: H, ease: Ht - H, target: Ht, measured: 2 * (fw + bw), tolerance: .5 },
      { key: 'tiro', label: 'Tiro delantero', body: CD, ease: -low, target: Rf, measured: yc - F0.y, tolerance: .5 }],
    materials: [
      { id: 'tela', label: 'Encaje elástico o punto de lencería (≥ 20 % de elasticidad)', qty: cm(Math.max(2 * (BC.x + 20), 600)) + ' de largo × ' + cm(yc + ins + 40) },
      ...(gusset ? [{ id: 'forro', label: 'Punto de algodón para el refuerzo', qty: '20 × 20 cm' }] : []),
      trim ? { id: 'puntilla', label: 'Puntilla elástica de 1–2 cm', qty: `${cm(W * .9 + 20)} cintura + 2 × ${cm(legOpen * .92 + 10)} piernas`, note: 'Cósela con zigzag estrecho, estirando un poco.' }
        : { id: 'elastico', label: 'Elástico picot de 8–10 mm', qty: `${cm(W * .9 + 20)} cintura + 2 × ${cm(legOpen * .92 + 10)} piernas` },
      { id: 'hilo', label: 'Hilo de poliéster fino y aguja de punto (stretch) 70/10', qty: '1 carrete' }
    ],
    assumptions: [
      `Cadera reducida un ${Math.round(red * 100)} % (${cm(Ht)}) por la elasticidad del encaje; tiro delantero ${cm(Rf)}, trasero ${cm(Rb)}.`,
      'Una pieza por lado sin costura de costado; se unen los centros delantero y trasero, y una entrepierna corta cierra cada pierna.',
      `Pierna con ${cm(legRise)} de subida en el costado; cintura ${cm(waistEdge)} de borde antes del elástico.`,
      'Las tres referencias eran el mismo culotte (tallas S, M y M–L); sus medidas se usaron solo como comprobación.'
    ],
    steps: [
      { id: 'cortar', title: 'Corta', detail: 'Corta dos piezas en espejo con la mayor elasticidad a lo ancho. Si el encaje tiene festón, puedes colocar la cintura sobre él y saltarte la puntilla de cintura.', pieces: pieces.map(x => x.id) },
      { id: 'centros', title: 'Centros', detail: 'Une el centro delantero y el centro trasero con overlock o zigzag estrecho.', pieces: ['culotte'], seams: ['centro-delantero', 'centro-trasero'] },
      ...(gusset ? [{ id: 'refuerzo', title: 'Refuerzo', detail: 'Coloca el refuerzo por dentro sobre el cruce de las costuras y fíjalo con zigzag por sus extremos.', pieces: ['refuerzo', 'culotte'] }] : []),
      { id: 'entrepierna', title: 'Entrepierna', detail: 'Cierra la entrepierna corta de cada pierna atrapando el refuerzo.', pieces: ['culotte'], seams: ['entrepierna'] },
      { id: 'elasticos', title: 'Cintura y piernas', detail: trim ? 'Cose la puntilla elástica en la cintura y en las piernas, estirándola un poco, con zigzag.' : 'Cose el elástico picot por el derecho, dóblalo hacia dentro y pespuntea con zigzag.', pieces: ['culotte'] }
    ]
  };
}

export const boyshortGenerator: PatternGenerator = {
  id: 'culotte-encaje', name: 'Culotte de encaje de una pieza por lado', status: 'experimental',
  summary: 'Culotte bajo de encaje elástico sin costura de costado, con puntilla o elástico picot y refuerzo de algodón.',
  requiredMeasures: ['cadera', 'tiro', 'muslo'], optionalMeasures: ['cintura'],
  defaults: boyshortDefaults, generate: generateBoyshort,
  params: [
    { key: 'acabado', label: 'Acabado de bordes', group: 'diseno', type: 'choice', choices: [{ value: 'puntilla', label: 'Puntilla elástica cosida' }, { value: 'elastico', label: 'Elástico picot doblado' }] },
    { key: 'refuerzo', label: 'Refuerzo de entrepierna', group: 'diseno', type: 'choice', choices: [{ value: 'si', label: 'Sí (algodón)' }, { value: 'no', label: 'No' }] },
    { key: 'bajadaCintura', label: 'Bajada de cintura (delantero)', group: 'diseno', type: 'length', min: 0, max: 120 },
    { key: 'subidaPierna', label: 'Subida de pierna en el costado', group: 'diseno', type: 'length', min: 20, max: 90 },
    { key: 'reduccion', label: 'Reducción de cadera (%)', group: 'holgura', type: 'ratio', min: 3, max: 30, help: 'Cuánto más pequeño que la cadera se corta, según la elasticidad del encaje.' },
    { key: 'margen', label: 'Margen de costura', group: 'margenes', type: 'length', min: 5, max: 10 }
  ]
};

export const MEN_BATCH_GENERATORS: PatternGenerator[] = [denimJacketGenerator, fieldJacketGenerator, boyshortGenerator];
export type { Pt };
