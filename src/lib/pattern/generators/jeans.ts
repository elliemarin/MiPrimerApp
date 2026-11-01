import { num, round1, str, isChild, type GeneratorContext, type GeneratorResult, type Params, type PatternGenerator } from '../generator';
import type { Issue, Piece, SeamRelation } from '../types';
import { norm, sub, type Pt } from '../../geom/vec';
import { K, P, clamp, cm, edge, equal, finite, invalid, len, lens, outline, rectangle, type EdgeDef } from './kidsShared';

/* Pantalón de tejido plano con pretina y bragueta (mezclilla de cinco bolsillos
 * o cargo) o con cintura elástica para niños y bebés. Siete siluetas de pierna
 * comparten un mismo bloque: la holgura se aplica una sola vez, los costados de
 * delantero y trasero son la misma línea y las entrepiernas se igualan
 * resolviendo la caída del tiro trasero. */

export type Silhouette = 'recto' | 'pitillo' | 'mom' | 'acampanado' | 'ancho' | 'baggy' | 'barrel';
type LegShape = 'recta' | 'barril' | 'campana';
/** Holgura de cadera, holgura de tiro, contornos de rodilla y bajo (fracción de la cadera terminada). */
export const SILHOUETTES: Record<Silhouette, { label: string; ease: number; rise: number; knee: number; hem: number; fe: number; be: number; leg: LegShape }> = {
  recto: { label: 'Recto', ease: .045, rise: 10, knee: .44, hem: .42, fe: 1 / 16, be: 1 / 10, leg: 'recta' },
  pitillo: { label: 'Pitillo (skinny)', ease: .015, rise: 5, knee: .35, hem: .30, fe: 1 / 16, be: 1 / 10.5, leg: 'recta' },
  mom: { label: 'Mom (tiro alto, pierna cónica)', ease: .06, rise: 15, knee: .43, hem: .34, fe: 1 / 16, be: 1 / 10, leg: 'recta' },
  acampanado: { label: 'Acampanado', ease: .03, rise: 10, knee: .37, hem: .56, fe: 1 / 16, be: 1 / 10, leg: 'campana' },
  ancho: { label: 'Pierna ancha (wide leg)', ease: .07, rise: 15, knee: .56, hem: .60, fe: 1 / 15, be: 1 / 9.5, leg: 'recta' },
  baggy: { label: 'Baggy', ease: .14, rise: 35, knee: .60, hem: .54, fe: 1 / 14, be: 1 / 8.5, leg: 'recta' },
  barrel: { label: 'Barrel (pierna curva)', ease: .09, rise: 25, knee: .66, hem: .38, fe: 1 / 15, be: 1 / 9.5, leg: 'barril' }
};

export function jeansDefaults(ctx: GeneratorContext): Params {
  const b = ctx.body, small = ctx.kind === 'bebe' || ctx.kind === 'toddler', child = isChild(ctx.kind);
  return {
    silueta: 'recto', cintura: small ? 'elastica' : 'pretina', bolsillos: small ? 'parche' : 'cinco', tiro: child ? 'alto' : 'medio',
    largo: round1(b.largoExterior ?? (b.tiro ?? 260) + (b.entrepierna ?? 780)),
    holguraExtra: 0, holguraTiro: 0, anchoRodillaExtra: 0, anchoBajoExtra: 0,
    anchoPretina: child ? 30 : 38, anchoElastico: ctx.kind === 'bebe' ? 15 : child ? 20 : 30,
    margen: 10, dobladillo: child ? 25 : 30
  };
}

interface LegPts { tip: Pt; kneeIn: Pt; hemIn: Pt; kneeOut: Pt; hemOut: Pt; side: Pt }
/** Inseam, hem and outseam edges for one leg panel. The outer part is shared by front and back. */
function legEdges(l: LegPts, shape: LegShape, sa: number, hem: number): { nodes: Pt[]; edges: EdgeDef[] } {
  const run1 = l.kneeIn.y - l.tip.y, run2 = l.hemIn.y - l.kneeIn.y, runO = l.kneeOut.y - l.side.y;
  const dirIn = norm(sub(l.hemIn, l.kneeIn)), dirOut = norm(sub(l.kneeOut, l.hemOut));
  const vertical = shape !== 'recta';
  const inUp = edge('entrepierna-sup', 'Entrepierna (tiro a rodilla)', 'costura', sa,
    P(l.tip.x - (l.tip.x - l.kneeIn.x) * .15, l.tip.y + run1 * .35), vertical ? P(l.kneeIn.x, l.kneeIn.y - run1 * .35) : P(l.kneeIn.x - dirIn.x * run1 * .35, l.kneeIn.y - dirIn.y * run1 * .35));
  const inLow = shape === 'recta' ? edge('entrepierna-inf', 'Entrepierna (rodilla a bajo)', 'costura', sa)
    : edge('entrepierna-inf', 'Entrepierna (rodilla a bajo)', 'costura', sa, P(l.kneeIn.x, l.kneeIn.y + run2 * .4),
      shape === 'barril' ? P(l.hemIn.x + (l.kneeIn.x - l.hemIn.x) * .15, l.hemIn.y - run2 * .35) : P(l.hemIn.x - (l.hemIn.x - l.kneeIn.x) * .25, l.hemIn.y - run2 * .3));
  const outLow = shape === 'recta' ? edge('costado-inf', 'Costado (bajo a rodilla)', 'costura', sa)
    : edge('costado-inf', 'Costado (bajo a rodilla)', 'costura', sa,
      shape === 'barril' ? P(l.hemOut.x + (l.kneeOut.x - l.hemOut.x) * .15, l.hemOut.y - run2 * .35) : P(l.hemOut.x + (l.kneeOut.x - l.hemOut.x) * .25, l.hemOut.y - run2 * .3),
      P(l.kneeOut.x, l.kneeOut.y + run2 * .4));
  const outUp = edge('costado-med', 'Costado (rodilla a tiro)', 'costura', sa,
    vertical ? P(l.kneeOut.x, l.kneeOut.y - runO * .35) : P(l.kneeOut.x + dirOut.x * runO * .35, l.kneeOut.y + dirOut.y * runO * .35), P(l.side.x, l.side.y + runO * .35));
  return { nodes: [l.tip, l.kneeIn, l.hemIn, l.hemOut, l.kneeOut], edges: [inUp, inLow, edge('bajo', 'Bajo', 'dobladillo', hem), outLow, outUp] };
}

const SIDE_IDS = ['costado-inf', 'costado-med', 'costado-cadera', 'costado-sup'];
const INSEAM_IDS = ['entrepierna-sup', 'entrepierna-inf'];

export function generateJeans(ctx: GeneratorContext, params: Params): GeneratorResult {
  const p = { ...jeansDefaults(ctx), ...params }, b = ctx.body;
  const sil = str(p, 'silueta', 'recto') as Silhouette, S = SILHOUETTES[sil];
  const elastic = str(p, 'cintura', 'pretina') === 'elastica', pockets = str(p, 'bolsillos', 'cinco'), riseType = str(p, 'tiro', 'medio');
  const small = ctx.kind === 'bebe' || ctx.kind === 'toddler', child = isChild(ctx.kind);
  if (!S) return invalid('jeans-silueta', 'Elige una silueta de la lista.');
  if (small && !elastic) return invalid('jeans-bebe-pretina', 'Para bebé y 1–4 años usa cintura elástica: sin bragueta, botón ni remaches.');
  const H = b.cadera ?? 0, W = b.cintura ?? 0, CD = b.tiro ?? 0, sa = num(p, 'margen'), hem = num(p, 'dobladillo');
  const D = ctx.kind === 'bebe' ? 25 : ctx.kind === 'toddler' ? 15 : 0, s = clamp(H / 1000, .45, 1.3);
  // A pull-on elastic waist must pass the hips: it needs a minimum of hip ease.
  const He = H + H * (elastic ? Math.max(S.ease, .09) : S.ease) + num(p, 'holguraExtra') + D * 1.2;
  const hipDepth = CD * .68, dropR = riseType === 'medio' ? Math.min(40 * s, hipDepth * .3) : 0, hipY = hipDepth - dropR;
  const Wr = W + (H - W) * dropR / hipDepth, Wf = elastic ? He : Wr + 12 * s;
  const R = CD - dropR + S.rise * (child ? .6 : 1) + D + num(p, 'holguraTiro');
  const L = num(p, 'largo') - dropR;
  const Kc = He * S.knee + num(p, 'anchoRodillaExtra'), Hm = He * S.hem + num(p, 'anchoBajoExtra');
  const bw = num(p, 'anchoPretina'), ew = num(p, 'anchoElastico');
  if (!finite(H, W, CD, He, R, L, Kc, Hm, sa, hem, bw, ew) || H < 300 || H > 1700 || W < 280 || W > H * 1.15 || CD < 90 || L < R + (small ? 80 : 120) || L > 1400
    || Hm < He * .2 || Kc < Hm * .55 || Kc > He * .9 || Hm > He * .9 || sa < 6 || sa > 15 || hem < 15 || hem > 50 || bw < 20 || bw > 60 || ew < 10 || ew > 50 || !['pretina', 'elastica'].includes(str(p, 'cintura')) || !['cinco', 'cargo', 'parche', 'ninguno'].includes(pockets))
    return invalid('jeans-medidas', 'Revisa cintura, cadera, tiro, largo y los ajustes de rodilla y bajo: el largo debe pasar al menos 12 cm del tiro.');

  // Babies keep the basic crotch extensions: their short legs cannot absorb a baggy seat.
  const Fw = He / 4 - He * .01, Bw = He / 4 + He * .01, Fe = He * (small ? 1 / 16 : S.fe), Be = He * (small ? 1 / 10 : S.be) + D * .3;
  const backRise = elastic ? He * .025 + D * .8 : He * .02;
  // Waist suppression (half garment): sides, centre front, centre back and the yoke.
  const supp = elastic ? 0 : Math.max(0, (He - Wf) / 2);
  const sF = Math.min(supp * .3, 25 * s), cf = Math.min(supp * .08, 10 * s), rest = Math.max(0, supp - 2 * sF - cf);
  const cb = elastic ? He * .02 : Math.min(rest * .4, 22 * s);
  let yokeDart = Math.max(0, rest - cb);
  const xSide = (y: number) => y >= hipY ? 0 : sF * (1 - y / hipY);
  const xCF = (y: number) => Fw - cf + cf * y / hipY;
  const xCB = (y: number) => Bw - cb + cb * (y + backRise) / (hipY + backRise);
  const hF = Math.min(Fe * 1.3, R * .4), hB = Math.min(Be * .95, R * .5);
  const CS = P(xCF(R - hF), R - hF), tipF = P(Fw + Fe, R), SR = P(0, R), HS = P(0, hipY);
  const S0 = P(xCB(R - hB), R - hB), T = P(xCB(-backRise), -backRise);

  // Legs: front crease centred; the back keeps the same outseam and adds width toward the inseam.
  const kneeY = R + (L - R) * (small ? .58 : .45), off = 10 * s, xc = (Fw + Fe) / 2;
  const kneeOut = P(xc - (Kc / 2 - off) / 2, kneeY), hemOut = P(xc - (Hm / 2 - off) / 2, L);
  const frontLeg = legEdges({ tip: tipF, kneeIn: P(xc + (Kc / 2 - off) / 2, kneeY), hemIn: P(xc + (Hm / 2 - off) / 2, L), kneeOut, hemOut, side: SR }, S.leg, sa, hem);
  const backLeg = (drop: number) => legEdges({ tip: P(Bw + Be, R + drop), kneeIn: P(kneeOut.x + Kc / 2 + off, kneeY), hemIn: P(hemOut.x + Hm / 2 + off, L), kneeOut, hemOut, side: SR }, S.leg, sa, hem);
  const crotchF = edge('tiro', 'Curva de tiro delantero', 'costura', sa, P(CS.x, CS.y + hF * .55), P(tipF.x - Fe * .55, R));
  const crotchB = (tip: Pt) => { const d = norm(sub(S0, T)), run = tip.y - S0.y; return edge('tiro', 'Curva de tiro trasero', 'costura', sa, P(S0.x + d.x * run * .6, S0.y + d.y * run * .6), P(tip.x - Be * .55, tip.y)); };
  const inseam = (piece: Piece) => lens(piece, INSEAM_IDS);
  const probe = (head: Pt[], headEdges: EdgeDef[], leg: { nodes: Pt[]; edges: EdgeDef[] }, crotch: EdgeDef, tail: Pt[], tailEdges: EdgeDef[]) =>
    outline('probe', 'probe', [...head, ...leg.nodes, ...tail], [...headEdges, crotch, ...leg.edges, ...tailEdges]);

  const frontPockets = !elastic && (pockets === 'cinco' || pockets === 'cargo');
  const pw = clamp(Fw * .38, 55 * s, 115), pd = clamp(Math.min(hipY * .42, hipY - 45 * s), 35, 90);
  const PW = P(sF + pw, 0), PS = P(xSide(pd), pd), SW = P(sF, 0);
  // The fly facing is cut `ext` wide; its seam line sits one allowance inside so
  // the cut edge stays parallel to the centre-front seam allowance.
  const ext = clamp(38 * s, 25, 40) - sa, hyp = Math.hypot(1, cf / hipY), fz = Math.min(clamp(R * .6, 90 * s, 210), R - hF - 35);

  // ---------------------------------------------------------------- Delantero
  let front: Piece;
  if (elastic) {
    const head = [P(0, 0), P(Fw, 0), P(Fw, R - hF)];
    const headEdges = [edge('cintura', 'Cintura (jareta)', 'jareta', ew + 15), edge('centro', 'Centro delantero', 'costura', sa)];
    front = outline('delantero', 'Delantero (par en espejo)', [...head, ...frontLeg.nodes, SR], [...headEdges, edge('tiro', 'Curva de tiro delantero', 'costura', sa, P(Fw, R - hF + hF * .55), P(tipF.x - Fe * .55, R)), ...frontLeg.edges, edge('costado-sup', 'Costado (tiro a cintura)', 'costura', sa)], { qty: 2, mirrorPairs: true });
    front.lines.push({ id: 'pespunte-jareta', kind: 'pespunte', a: P(0, ew + 5), b: P(Fw, ew + 5), label: 'Pespunte de jareta' });
  } else {
    const E0 = P(xCF(0) + ext * hyp, 0), E1 = P(xCF(fz - 22) + ext * hyp, fz - 22), FZ = P(xCF(fz), fz);
    const head = frontPockets ? [PW, E0, E1, FZ, CS] : [SW, E0, E1, FZ, CS];
    const headEdges = [
      edge('cintura', 'Cintura (une la pretina)', 'costura', sa), edge('bragueta', 'Vista de bragueta integrada (sobrehilar el canto)', 'costura', sa),
      edge('bragueta-curva', 'Fin de la vista de bragueta', 'costura', sa, P(E1.x, E1.y + 15), P(FZ.x + ext * .5, FZ.y)), edge('centro', 'Centro delantero bajo la bragueta', 'costura', sa)
    ];
    const tail = frontPockets ? [SR, HS, PS] : [SR, HS];
    const tailEdges = [edge('costado-cadera', 'Costado (tiro a cadera)', 'costura', sa), edge('costado-sup', frontPockets ? 'Costado (cadera a bolsillo)' : 'Costado (cadera a cintura)', 'costura', sa),
      ...(frontPockets ? [edge('boca', 'Boca del bolsillo', 'costura', sa, P(PS.x + pw * K, PS.y), P(PW.x, PW.y + pd * K))] : [])];
    front = outline('delantero', 'Delantero (par en espejo)', [...head, ...frontLeg.nodes, ...tail], [...headEdges, crotchF, ...frontLeg.edges, ...tailEdges], { qty: 2, mirrorPairs: true });
    front.lines.push({ id: 'fin-cierre', kind: 'referencia', a: P(xCF(fz - 12), fz - 12), b: P(xCF(fz - 12) + ext * hyp, fz - 12), label: 'Tope del cierre' },
      { id: 'pespunte-bragueta', kind: 'pespunte', a: P(xCF(4) - 30 * s, 4), b: P(xCF(fz - 30) - 30 * s, fz - 30), label: 'Pespunte decorativo en J' });
  }
  front.grain = { a: P(xc, R * .3), b: P(xc, L - Math.min(80, (L - R) * .3)) };
  const frontInseam = inseam(front);

  // ---------------------------------------------------------------- Trasero
  const yb = clamp(He * .075, 35, 85), ys = yb * .45;
  const YS = P(xSide(ys), ys), YC = P(xCB(-backRise + yb), -backRise + yb);
  const backFor = (drop: number): Piece => {
    const leg = backLeg(drop), tip = leg.nodes[0];
    if (elastic) return outline('trasero', 'Trasero (par en espejo)', [P(0, 0), T, S0, ...leg.nodes, SR], [edge('cintura', 'Cintura (jareta)', 'jareta', ew + 15), edge('centro', 'Centro trasero', 'costura', sa), crotchB(tip), ...leg.edges, edge('costado-sup', 'Costado (tiro a cintura)', 'costura', sa)], { qty: 2, mirrorPairs: true });
    return probe([YS, YC, S0], [edge('canesu', 'Unión al canesú', 'costura', sa), edge('centro', 'Centro trasero', 'costura', sa)], leg, crotchB(tip), [SR, HS], [edge('costado-cadera', 'Costado (tiro a cadera)', 'costura', sa), edge('costado-sup', 'Costado (cadera a canesú)', 'costura', sa)]);
  };
  let lo = -Be * .3, hi = Be * .9;
  const f = (drop: number) => inseam(backFor(drop)) - frontInseam;
  const notices: Issue[] = [];
  if (f(lo) * f(hi) > 0) return invalid('jeans-entrepierna', 'No se pudieron igualar las entrepiernas con estas medidas. Revisa el tiro y los anchos de rodilla y bajo.');
  for (let i = 0; i < 60; i++) { const mid = (lo + hi) / 2; if (f(mid) > 0) lo = mid; else hi = mid; }
  const back = backFor((lo + hi) / 2);
  back.id = 'trasero'; back.name = 'Trasero (par en espejo)'; back.cut = { qty: 2, mirrorPairs: true, onFold: false, fabric: 'principal' };
  back.grain = { a: P(hemOut.x + (Hm / 2 + off) / 2, R * .35), b: P(hemOut.x + (Hm / 2 + off) / 2, L - Math.min(80, (L - R) * .3)) };
  if (elastic) {
    const d = norm(sub(T, P(0, 0))), inward = P(-d.y, d.x).y > 0 ? P(-d.y, d.x) : P(d.y, -d.x), depth = ew + 5;
    const a0 = P(inward.x * depth, inward.y * depth), a1 = P(T.x + inward.x * depth, T.y + inward.y * depth), t = -a0.x / (a1.x - a0.x || 1);
    back.lines.push({ id: 'pespunte-jareta', kind: 'pespunte', a: P(a0.x + (a1.x - a0.x) * t, a0.y + (a1.y - a0.y) * t), b: a1, label: 'Pespunte de jareta' });
  }

  const pieces: Piece[] = [front, back];
  const seams: SeamRelation[] = [equal('entrepierna', 'Entrepierna: delantero con trasero', [{ pieceId: 'delantero', edgeIds: INSEAM_IDS }], [{ pieceId: 'trasero', edgeIds: INSEAM_IDS }], 1)];
  const steps: GeneratorResult['steps'] = [];
  const materials: GeneratorResult['materials'] = [];

  // ---------------------------------------------------------------- Canesú y pretina
  let yoke: Piece | undefined, facing: Piece | undefined, waistLen = 0;
  if (!elastic) {
    const yokeFor = (dart: number) => outline('canesu', 'Canesú trasero (par en espejo)', [SW, P(T.x - dart, T.y), YC, YS], [
      edge('cintura', 'Cintura (une la pretina)', 'costura', sa), edge('centro', 'Centro del canesú', 'costura', sa),
      edge('canesu', 'Unión al trasero', 'costura', sa), edge('costado', 'Costado del canesú', 'costura', sa)], { qty: 2, mirrorPairs: true });
    // The yoke absorbs the remaining back suppression: solve its waist so the closed band is exact.
    const frontWaist = Fw - cf - sF;
    for (let i = 0; i < 4; i++) yokeDart += len(yokeFor(yokeDart), 'cintura') - (Wf / 2 - frontWaist);
    yoke = yokeFor(yokeDart);
    if (yoke.nodes[1].x < SW.x + 30) return invalid('jeans-canesu', 'La cintura es demasiado pequeña respecto a la cadera para este canesú. Revisa las medidas o aumenta la holgura.');
    yoke.grain = { a: P(SW.x + (YC.x - SW.x) * .5, -backRise * .3 + yb * .15), b: P(SW.x + (YC.x - SW.x) * .5 + 40, -backRise * .3 + yb * .15) };
    pieces.push(yoke);
    seams.push(equal('canesu', 'Canesú con trasero', [{ pieceId: 'canesu', edgeIds: ['canesu'] }], [{ pieceId: 'trasero', edgeIds: ['canesu'] }]));
    if (frontPockets) {
      const FA = P(PW.x + 30 * s, 0), FB = P(FA.x, pd + 40 * s), FC = P(xSide(pd + 40 * s), pd + 40 * s);
      facing = outline('vista-bolsillo', 'Vista del bolsillo delantero (par en espejo)', [SW, PW, FA, FB, FC, PS], [
        edge('cintura', 'Cintura (une la pretina)', 'costura', sa), edge('cintura-interior', 'Cintura bajo el delantero', 'costura', sa),
        edge('interior', 'Canto interior (sobrehilar)', 'sin-margen', 0), edge('fondo', 'Canto inferior (sobrehilar)', 'sin-margen', 0),
        edge('costado-bajo', 'Costado bajo el delantero', 'costura', sa), edge('costado', 'Costado visible', 'costura', sa)], { qty: 2, mirrorPairs: true });
      facing.grain = { a: P(SW.x + 15, 15), b: P(SW.x + 15, pd + 20 * s) };
      const bagD = clamp(R * .72, hipY + 15, R - 10), BA = P(PW.x + 45 * s, 0), BB = P(BA.x, bagD - 35 * s), BC = P(BA.x - 50 * s, bagD), BD = P(xSide(bagD), bagD);
      const bagNodes = bagD > hipY ? [SW, BA, BB, BC, BD, HS] : [SW, BA, BB, BC, BD];
      const bag = outline('forro-bolsillo', 'Bolsa del bolsillo delantero (2 pares en espejo)', bagNodes, [
        edge('cintura', 'Cintura', 'costura', sa), edge('interior', 'Canto interior', 'costura', sa), edge('curva', 'Fondo curvo', 'costura', sa, P(BB.x, BB.y + 35 * s * K), P(BC.x + 50 * s * K, BC.y)),
        edge('fondo', 'Fondo', 'costura', sa), ...(bagD > hipY ? [edge('costado-bajo', 'Costado', 'costura', sa)] : []), edge('costado', 'Costado', 'costura', sa)], { qty: 4, mirrorPairs: true, fabric: 'forro' });
      bag.notes = ['Corta 4 (dos pares). En la capa que va contra el delantero, recorta la boca del bolsillo siguiendo el delantero.'];
      pieces.push(facing, bag);
      seams.push(equal('costado', 'Costado: delantero y vista con trasero y canesú', [{ pieceId: 'delantero', edgeIds: SIDE_IDS }, { pieceId: 'vista-bolsillo', edgeIds: ['costado'] }], [{ pieceId: 'trasero', edgeIds: SIDE_IDS }, { pieceId: 'canesu', edgeIds: ['costado'] }], 1));
      if (pockets === 'cinco') {
        const cw = 70 * s, ch = 82 * s, coin = rectangle('relojera', 'Bolsillo relojero', cw, ch, [edge('boca', 'Boca (doble doblez)', 'dobladillo', 15), edge('lado-der', 'Lado (doblar hacia dentro)', 'costura', 7), edge('fondo', 'Fondo (doblar hacia dentro)', 'costura', 7), edge('lado-izq', 'Lado (doblar hacia dentro)', 'costura', 7)]);
        const x0 = Math.max(SW.x + 8, FA.x - cw - 6);
        facing.lines.push({ id: 'relojera', kind: 'colocacion', a: P(x0, 14), b: P(x0 + cw, 14), label: 'Relojera: borde superior (solo vista derecha)' });
        pieces.push(coin);
      }
      waistLen = 2 * (len(facing, 'cintura') + len(front, 'cintura') + len(yoke, 'cintura'));
    } else {
      seams.push(equal('costado', 'Costado: delantero con trasero y canesú', [{ pieceId: 'delantero', edgeIds: SIDE_IDS }], [{ pieceId: 'trasero', edgeIds: SIDE_IDS }, { pieceId: 'canesu', edgeIds: ['costado'] }], 1));
      waistLen = 2 * (len(front, 'cintura') + len(yoke, 'cintura'));
    }
    const band = rectangle('pretina', 'Pretina doblada', waistLen, 2 * bw, [edge('largo-superior', 'Canto exterior', 'costura', sa), edge('extremo-der', 'Extremo', 'costura', sa), edge('largo-inferior', 'Canto que se une a la cintura', 'costura', sa), edge('extremo-izq', 'Extremo', 'costura', sa)], { fabric: 'principal' }, true);
    band.lines.push({ id: 'doblez', kind: 'doblez', a: P(0, bw), b: P(waistLen, bw), label: 'Doblar a lo largo (entretela en una mitad)' });
    band.marks.push({ id: 'ojal', kind: 'ojal', at: P(ext * .5, bw * 1.5), label: 'Ojal (extremo que monta)' }, { id: 'boton', kind: 'boton', at: P(waistLen - ext * 1.5, bw * 1.5), label: 'Botón de jeans' });
    band.notches.push({ id: 'centro-espalda', edgeId: 'largo-inferior', s: waistLen / 2, count: 2, label: 'Centro trasero' });
    pieces.push(band);
    seams.push(equal('pretina', 'Pretina con toda la cintura', [{ pieceId: 'pretina', edgeIds: ['largo-inferior'] }], frontPockets
      ? [{ pieceId: 'delantero', edgeIds: ['cintura'], factor: 2 }, { pieceId: 'vista-bolsillo', edgeIds: ['cintura'], factor: 2 }, { pieceId: 'canesu', edgeIds: ['cintura'], factor: 2 }]
      : [{ pieceId: 'delantero', edgeIds: ['cintura'], factor: 2 }, { pieceId: 'canesu', edgeIds: ['cintura'], factor: 2 }], 1));
    const shield = rectangle('tapeta', 'Tapeta de bragueta (doblada)', 2 * (ext + 5), fz + 10, [edge('a', 'Canto', 'costura', sa), edge('b', 'Extremo', 'costura', sa), edge('c', 'Canto', 'costura', sa), edge('d', 'Extremo', 'costura', sa)]);
    shield.lines.push({ id: 'doblez', kind: 'doblez', a: P(ext + 5, 0), b: P(ext + 5, fz + 10), label: 'Doblar a lo largo' });
    const loops = child ? 5 : 7, loopLen = 85 * s;
    const strip = rectangle('presillas', `Tira para ${loops} presillas`, loops * loopLen, 3 * 12 * s, [edge('a', 'Canto', 'sin-margen', 0), edge('b', 'Extremo', 'sin-margen', 0), edge('c', 'Canto', 'sin-margen', 0), edge('d', 'Extremo', 'sin-margen', 0)], {}, true);
    for (let i = 1; i < loops; i++) strip.lines.push({ id: `corte-${i}`, kind: 'referencia', a: P(i * loopLen, 0), b: P(i * loopLen, 36 * s), label: 'Cortar' });
    pieces.push(shield, strip);
    const zip = [100, 120, 150, 180, 200].find(z => z >= fz - 15) ?? 200;
    materials.push({ id: 'cierre', label: `Cierre metálico para jeans de ${cm(zip)}`, qty: '1' }, { id: 'boton', label: 'Botón de jeans de 17 mm (con su herramienta)', qty: '1' },
      { id: 'remaches', label: 'Remaches para jeans (opcional)', qty: frontPockets ? '6' : '0' }, { id: 'entretela', label: 'Entretela termoadhesiva para la pretina', qty: `${cm(waistLen)} × ${cm(bw)}` });
  } else {
    seams.push(equal('costado', 'Costado: delantero con trasero', [{ pieceId: 'delantero', edgeIds: [...SIDE_IDS.slice(0, 2), 'costado-sup'] }], [{ pieceId: 'trasero', edgeIds: [...SIDE_IDS.slice(0, 2), 'costado-sup'] }], 1));
    materials.push({ id: 'elastico', label: `Elástico de ${cm(ew)}`, qty: cm(W * (small ? .95 : .9) + 20), note: 'Cintura × proporción + 2 cm de traslape. Prueba que pase por la cadera estirado.' });
  }

  // ---------------------------------------------------------------- Bolsillos traseros y cargo
  const patch = pockets !== 'ninguno';
  if (patch) {
    const pcx = Bw * .47, topY = elastic ? ew + 35 * s : YS.y + (YC.y - YS.y) * (pcx - YS.x) / (YC.x - YS.x) + 22 * s;
    // The pocket may reach the seat curve, never past it; small sizes get a smaller pocket.
    let bpw = clamp(Bw * .52, 40, 155), bph = bpw * 1.12;
    if (topY + bph > R + 25 * s) { bph = R + 25 * s - topY; bpw = bph / 1.12; }
    const v = Math.min(15 * s, bph * .12);
    if (bpw >= 40) {
    const pocket = outline('bolsillo-trasero', 'Bolsillo trasero de parche', [P(0, 0), P(bpw, 0), P(bpw, bph - v), P(bpw / 2, bph), P(0, bph - v)], [
      edge('boca', 'Boca (doble doblez)', 'dobladillo', 20), edge('lado-der', 'Lado (doblar hacia dentro)', 'costura', 8), edge('punta-der', 'Punta', 'costura', 8),
      edge('punta-izq', 'Punta', 'costura', 8), edge('lado-izq', 'Lado (doblar hacia dentro)', 'costura', 8)], { qty: 2 });
    back.lines.push({ id: 'bolsillo-trasero', kind: 'colocacion', a: P(pcx - bpw / 2, topY), b: P(pcx + bpw / 2, topY), label: 'Bolsillo trasero: borde superior' });
    back.marks.push({ id: 'bolsillo-punta', kind: 'cruz', at: P(pcx, topY + bph), label: 'Punta del bolsillo' });
    pieces.push(pocket);
    } else notices.push({ level: 'aviso', code: 'sin-bolsillo-trasero', message: 'En esta talla no cabe un bolsillo trasero de parche: se omite.' });
  }
  if (pockets === 'cargo') {
    const cw = clamp(Fw * .62, 90 * s, 200), ch = cw * 1.18, g = 25 * s;
    const cargo = rectangle('bolsillo-cargo', 'Bolsillo cargo con fuelle', cw + 2 * g, ch + g, [edge('boca', 'Boca (doble doblez)', 'dobladillo', 25), edge('lado-der', 'Lado', 'costura', 8), edge('fondo', 'Fondo', 'costura', 8), edge('lado-izq', 'Lado', 'costura', 8)], { qty: 2 });
    cargo.lines.push({ id: 'fuelle-izq', kind: 'doblez', a: P(g, 0), b: P(g, ch + g), label: 'Fuelle' }, { id: 'fuelle-der', kind: 'doblez', a: P(cw + g, 0), b: P(cw + g, ch + g), label: 'Fuelle' });
    const flap = rectangle('cartera', 'Cartera del bolsillo cargo (exterior y vista)', cw + 10, 60 * s, [edge('union', 'Unión a la pierna', 'costura', 8), edge('lado-der', 'Lado', 'costura', 8), edge('canto', 'Canto libre', 'costura', 8), edge('lado-izq', 'Lado', 'costura', 8)], { qty: 4 }, true);
    flap.marks.push({ id: 'broche', kind: 'boton', at: P((cw + 10) / 2, 40 * s), label: 'Broche o botón' });
    const x0 = Math.max(kneeOut.x, hemOut.x, 0) + 20 * s, y0 = R + 60 * s;
    front.lines.push({ id: 'cargo', kind: 'colocacion', a: P(x0, y0), b: P(x0 + cw, y0), label: 'Bolsillo cargo: borde superior' }, { id: 'cartera', kind: 'colocacion', a: P(x0 - 5, y0 - 15 * s), b: P(x0 + cw + 5, y0 - 15 * s), label: 'Cartera: línea de unión' });
    pieces.push(cargo, flap);
  }

  // ---------------------------------------------------------------- Comprobaciones
  const legCirc = (id: 'bajo') => len(front, id) + len(back, id);
  // One leg = front panel + back panel, measured between their seam lines at the knee.
  const kneeInB = back.nodes.find(n => Math.abs(n.y - kneeY) < 1e-6 && n.x > kneeOut.x + 1)!;
  const kneeCirc = (frontLeg.nodes[1].x - kneeOut.x) + (kneeInB.x - kneeOut.x);
  const closed = elastic ? 0 : waistLen - 2 * ext * hyp;
  const checks = [
    { key: 'cadera', label: 'Contorno de cadera terminado', body: H, ease: He - H, target: He, measured: 2 * (xCF(hipY) + xCB(hipY)), tolerance: .5 },
    ...(elastic ? [] : [{ key: 'cintura', label: 'Contorno de cintura cerrada', body: Wr, ease: Wf - Wr, target: Wf, measured: closed, tolerance: 1 }]),
    { key: 'largo', label: 'Largo exterior desde la cintura del patrón', target: L, measured: hemOut.y, tolerance: .5 },
    { key: 'bajo', label: 'Contorno del bajo', target: Hm, measured: legCirc('bajo'), tolerance: .5 },
    { key: 'rodilla', label: 'Contorno a la rodilla', target: Kc, measured: kneeCirc, tolerance: .5 }
  ];
  if (elastic && 2 * (len(front, 'cintura') + len(back, 'cintura')) < H + 20) notices.push({ level: 'error', code: 'jeans-no-pasa', message: 'La cintura elástica no pasa por la cadera. Aumenta la holgura.' });
  if (sil === 'pitillo' && (ctx.fabric !== 'punto' && ctx.stretch < 15)) notices.push({ level: 'aviso', code: 'pitillo-elasticidad', message: 'El pitillo necesita mezclilla con elastano (al menos 15 % de elasticidad horizontal). En tela rígida sube la holgura o elige otra silueta.' });
  if (b.talon && Hm < b.talon + 10 && ctx.stretch < 15) notices.push({ level: 'aviso', code: 'bajo-talon', message: `El bajo mide ${cm(Hm)} y el contorno talón–empeine ${cm(b.talon)}: el pie podría no pasar. Agranda el bajo o usa tela elástica.` });
  notices.push({ level: 'aviso', code: 'jeans-experimental', message: 'Patrón experimental: corta primero una muestra en tela económica (o mezclilla barata), prueba tiro, cintura y largo, y después corta la definitiva.' });

  // ---------------------------------------------------------------- Materiales y pasos
  materials.unshift({ id: 'tela', label: elastic ? 'Mezclilla ligera, gabardina, sarga o pana fina' : 'Mezclilla de 10–14 oz, gabardina o sarga', qty: 'Según acomodo y ancho de tu tela', note: sil === 'pitillo' ? 'Con 2 % de elastano o más.' : 'Prelava: la mezclilla encoge.' });
  if (frontPockets) materials.push({ id: 'forro', label: 'Popelina o manta para bolsas', qty: '4 bolsas' });
  materials.push({ id: 'hilo', label: 'Hilo normal y de pespunte grueso', qty: '1 + 1 carretes', note: 'Aguja para mezclilla 100/16; puntada de 3,5–4 mm para el pespunte visible.' });
  steps.push({ id: 'cortar', title: 'Corta y marca', detail: 'Corta todas las piezas con el hilo paralelo al orillo, por pares en espejo donde se indica. Marca piquetes, tope del cierre, líneas de bolsillos y presillas.', pieces: pieces.map(piece => piece.id) });
  if (patch) steps.push({ id: 'bolsillos-traseros', title: 'Bolsillos traseros', detail: 'Haz el doble doblez de la boca y pespuntea. Dobla los demás márgenes, añade si quieres un pespunte decorativo y cose cada bolsillo sobre su línea con doble pespunte, rematando las esquinas.', pieces: ['bolsillo-trasero', 'trasero'] });
  if (yoke) steps.push({ id: 'canesu', title: 'Canesú y centro trasero', detail: 'Une cada canesú a su trasero, carga el margen hacia arriba y haz doble pespunte. Después une los dos traseros por el centro (canesú incluido) con costura cargada.', pieces: ['canesu', 'trasero'], seams: ['canesu'] });
  if (frontPockets) steps.push({ id: 'bolsillos-delanteros', title: 'Bolsillos delanteros', detail: `${pockets === 'cinco' ? 'Cose la relojera sobre la vista derecha. ' : ''}Cose la vista sobre la capa trasera de la bolsa. Une la capa delantera a la boca del delantero, voltea, plancha y pespuntea. Cierra el fondo de la bolsa con costura francesa e hilvana bolsa y vista al costado y a la cintura.`, pieces: ['delantero', 'vista-bolsillo', 'forro-bolsillo', ...(pockets === 'cinco' ? ['relojera'] : [])] });
  if (!elastic) steps.push({ id: 'bragueta', title: 'Bragueta con cierre', detail: 'Sobrehila las vistas de bragueta. Une el centro delantero desde el tope del cierre hasta la entrepierna. Cose el cierre a la vista derecha y la tapeta debajo; luego cose la otra cinta a la vista izquierda y pespuntea la J desde el derecho, sin atrapar la tapeta.', pieces: ['delantero', 'tapeta'] });
  if (pockets === 'cargo') steps.push({ id: 'cargo', title: 'Bolsillos cargo', detail: 'Dobladilla la boca, plancha los fuelles y cose cada bolsillo sobre su línea. Arma las carteras (exterior y vista), voltea, pespuntea y cósalas boca abajo sobre su línea; dóblalas y pespuntea para que queden planas.', pieces: ['bolsillo-cargo', 'cartera', 'delantero'] });
  steps.push({ id: 'entrepierna', title: 'Entrepierna', detail: 'Une delanteros y traseros por la entrepierna de un bajo al otro, haciendo coincidir el cruce del tiro. Carga el margen y haz doble pespunte.', pieces: ['delantero', 'trasero'], seams: ['entrepierna'] });
  steps.push({ id: 'costados', title: 'Costados', detail: 'Cose los costados de cintura a bajo, sobrehila y plancha hacia atrás. Prueba el ajuste antes de la pretina.', pieces: ['delantero', 'trasero', ...(yoke ? ['canesu'] : []), ...(facing ? ['vista-bolsillo'] : [])], seams: ['costado'] });
  if (elastic) steps.push({ id: 'jareta', title: 'Jareta y elástico', detail: 'Dobla 1 cm y luego por la línea de cintura; pespuntea la jareta dejando 3 cm abiertos, pasa el elástico, únelo con 2 cm de traslape y cierra.', pieces: ['delantero', 'trasero'] });
  else steps.push({ id: 'pretina', title: 'Pretina, presillas y botón', detail: 'Aplica la entretela, cose la pretina por el canto inferior, dobla sus extremos sobre la bragueta y ciérrala por dentro con un pespunte desde el derecho. Dobla la tira de presillas en tres, pespuntea, corta y fíjalas a la pretina. Haz el ojal y coloca el botón y los remaches.', pieces: ['pretina', 'presillas', 'delantero', 'canesu'], seams: ['pretina'] });
  steps.push({ id: 'bajo', title: 'Bajos', detail: `Prueba el largo con el calzado. Dobla ${cm(hem / 2)} dos veces y pespuntea.`, pieces: ['delantero', 'trasero'] });

  const assumptions = [
    `${S.label}: cadera terminada ${cm(He)} (cadera + ${cm(He - H)}), rodilla ${cm(Kc)} y bajo ${cm(Hm)}. La holgura se aplica una sola vez.`,
    elastic ? 'Cintura elástica: la cintura del patrón mide lo mismo que la cadera para poder ponerse; el elástico la ajusta.' : `Tiro ${riseType === 'alto' ? 'alto (cintura natural)' : `medio (${cm(dropR)} bajo la cintura natural)`}: cintura cerrada ${cm(Wf)}. El canesú y los costados reparten la diferencia con la cadera.`,
    'Delantero y trasero comparten la misma línea de costado; la caída del tiro trasero se calcula para que ambas entrepiernas midan igual.',
    D ? 'Medidas tomadas sobre el pañal: la cadera y el tiro incluyen espacio para él.' : 'Comprueba el tiro sentado: si tira por detrás, aumenta la holgura de tiro.'
  ];
  return { pieces, seams, checks, materials, steps, assumptions, notices };
}

export const jeansGenerator: PatternGenerator = {
  id: 'pantalon-mezclilla', name: 'Pantalón de mezclilla con siluetas', status: 'experimental',
  summary: 'Pantalón de cinco bolsillos o cargo con pretina, bragueta y canesú, o con cintura elástica; siete siluetas de pierna.',
  requiredMeasures: ['cintura', 'cadera', 'tiro', 'entrepierna'], optionalMeasures: ['largoExterior', 'talon', 'estatura'],
  defaults: jeansDefaults, generate: generateJeans,
  params: [
    { key: 'silueta', label: 'Silueta', group: 'diseno', type: 'choice', choices: (Object.keys(SILHOUETTES) as Silhouette[]).map(value => ({ value, label: SILHOUETTES[value].label })) },
    { key: 'cintura', label: 'Cintura', group: 'diseno', type: 'choice', choices: [{ value: 'pretina', label: 'Pretina con bragueta y botón' }, { value: 'elastica', label: 'Elástica (sin bragueta)' }] },
    { key: 'bolsillos', label: 'Bolsillos', group: 'diseno', type: 'choice', choices: [{ value: 'cinco', label: 'Cinco bolsillos' }, { value: 'cargo', label: 'Cargo con fuelle' }, { value: 'parche', label: 'Solo traseros de parche' }, { value: 'ninguno', label: 'Sin bolsillos' }] },
    { key: 'tiro', label: 'Altura de cintura', group: 'diseno', type: 'choice', choices: [{ value: 'alto', label: 'Tiro alto (cintura natural)' }, { value: 'medio', label: 'Tiro medio' }] },
    { key: 'largo', label: 'Largo exterior desde la cintura natural', group: 'diseno', type: 'length', min: 250, max: 1400 },
    { key: 'anchoRodillaExtra', label: 'Ajuste del ancho en la rodilla', group: 'diseno', type: 'length', min: -150, max: 300 },
    { key: 'anchoBajoExtra', label: 'Ajuste del ancho del bajo', group: 'diseno', type: 'length', min: -150, max: 300 },
    { key: 'anchoPretina', label: 'Alto de la pretina', group: 'diseno', type: 'length', min: 20, max: 60, when: p => p.cintura !== 'elastica' },
    { key: 'anchoElastico', label: 'Ancho del elástico', group: 'diseno', type: 'length', min: 10, max: 50, when: p => p.cintura === 'elastica' },
    { key: 'holguraExtra', label: 'Holgura extra de cadera', group: 'holgura', type: 'length', min: -40, max: 250 },
    { key: 'holguraTiro', label: 'Holgura extra de tiro', group: 'holgura', type: 'length', min: 0, max: 80 },
    { key: 'margen', label: 'Margen de costura', group: 'margenes', type: 'length', min: 6, max: 15 },
    { key: 'dobladillo', label: 'Dobladillo', group: 'margenes', type: 'length', min: 15, max: 50 }
  ]
};
