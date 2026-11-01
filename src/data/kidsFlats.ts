import type { FlatDef, FlatView, FlatViewKey } from './flats';
import type { Zone, ZoneType } from '../features/studio/model';
import { findSize } from '../lib/sizes/tables';
import { cmdsBBox, cmdsToSvg, pieceSeamCmds, transformCmds, type PathCmd } from '../lib/draw/paths';
import { parseSvgPath } from '../lib/draw/svgpath';
import type { Mat, Pt } from '../lib/geom/vec';
import type { GeneratorContext, GeneratorResult } from '../lib/pattern/generator';
import type { Piece } from '../lib/pattern/types';
import { nodeById } from '../lib/pattern/outline';
import { cubicPoint, solve } from '../lib/pattern/generators/kidsShared';
import { generateCircle, generateSundress, generateTiered, generateTrapeze, generateTulle } from '../lib/pattern/generators/girls';
import { generateBandanaBib, generateBloomers, generateBonnet, generateBooties, generateSleepSack, generateTowel } from '../lib/pattern/generators/babyPlus';
import { generateEarHat, generateOverall } from '../lib/pattern/generators/babyMore';

/* Dibujos técnicos de la colección Niña y de la ampliación de Bebé.
 * Las siluetas salen de las piezas reales de una talla de referencia; cada
 * zona editable remite a su pieza física mediante KIDS_SURFACE_PIECES. */

export interface KidsSurface { zoneId: string; pieceId: string; mirror: boolean; /** Pieza cortada al doblez y dibujada desplegada. */ fold?: boolean }
const S = (zoneId: string, pieceId = zoneId, mirror = false, fold = false): KidsSurface => ({ zoneId, pieceId, mirror, fold });
const pair = (id: string): KidsSurface[] => [S(`${id}--1`, id, true), S(`${id}--2`, id)];

/** Explicit zone → physical piece bindings, by generator. */
export const KIDS_SURFACE_PIECES: Record<string, Partial<Record<FlatViewKey, KidsSurface[]>>> = {
  'vestido-trapecio-infantil': { frente: [S('delantero', 'delantero', false, true), ...pair('volante')], espalda: [...pair('espalda'), ...pair('volante')] },
  'vestido-tirantes-fruncido': {
    frente: [S('cuerpo-delantero', 'cuerpo-delantero', false, true), S('falda-delantera', 'falda-delantera', false, true), ...pair('tirante')],
    espalda: [S('cuerpo-espalda', 'cuerpo-espalda', false, true), S('falda-trasera', 'falda-trasera', false, true), ...pair('tirante')]
  },
  'falda-tul-elastica': { frente: [S('capa-tul'), S('pretina')], espalda: [S('capa-tul'), S('pretina')] },
  'falda-olanes-escalonada': { frente: [S('olan-1'), S('olan-2'), S('olan-3')], espalda: [S('olan-1'), S('olan-2'), S('olan-3')] },
  'falda-circular-elastica': { frente: [S('falda-delantera', 'falda-delantera', false, true), S('pretina')], espalda: [S('falda-trasera', 'falda-trasera', false, true), S('pretina')] },
  'cubrepanal-bebe': { frente: [S('delantero', 'delantero', false, true)], espalda: [S('espalda', 'espalda', false, true), S('olan-1'), S('olan-2'), S('olan-3')] },
  'saco-dormir-bebe': { frente: pair('delantero'), espalda: [S('espalda', 'espalda', false, true)] },
  'bonete-bebe': { frente: [S('banda'), S('trasera'), S('lengueta')] },
  'patucos-bebe': { frente: [...pair('talonera'), ...pair('empeine'), ...pair('suela')] },
  'toalla-capucha': { frente: [S('toalla'), S('capucha')] },
  'babero-bandana': { frente: [S('babero')] },
  'peto-bebe': { frente: [S('delantero', 'delantero', false, true), ...pair('tirante')], espalda: [S('espalda', 'espalda', false, true), ...pair('tirante')] },
  'gorro-orejas': { frente: [S('gorro'), ...pair('oreja')] }
};
/** Sets reuse the bindings of each part, with the part prefix on zones and pieces. */
const SET_PARTS: Record<string, [string, string][]> = {
  verano: [['pelele', 'peto-bebe'], ['sombrero', 'sombrero-pescador']], invierno: [['overol', 'peto-bebe'], ['gorro', 'gorro-orejas']],
  'recien-nacido': [['bonete', 'bonete-bebe'], ['patucos', 'patucos-bebe'], ['babero', 'babero-bandana']]
};
KIDS_SURFACE_PIECES['sombrero-pescador'] = { frente: [S('copa'), S('banda'), S('ala')] };
KIDS_SURFACE_PIECES['conjunto-bebe'] = { frente: Object.values(SET_PARTS).flatMap(parts => parts.flatMap(([prefix, gen]) =>
  (KIDS_SURFACE_PIECES[gen]?.frente ?? []).map(b => ({ ...b, zoneId: `${prefix}-${b.zoneId}`, pieceId: `${prefix}-${b.pieceId}` })))) };

type Details = FlatView['details'];
const P = (x: number, y: number): Pt => ({ x, y });
const r1 = (n: number) => Math.round(n * 10) / 10;
const zone = (id: string, label: string, type: ZoneType, d: string): Zone => ({ id, label, type, d });
const svg = (cmds: PathCmd[]) => cmdsToSvg(cmds);
const piece = (r: GeneratorResult, id: string) => r.pieces.find(p => p.id === id)!;
const ctx = (table: string, code: string, kind: GeneratorContext['kind']): GeneratorContext => ({ body: findSize(table, code)!.values, kind, fabric: 'plano', stretch: 0, fit: 'regular' });
const GIRL = () => ctx('ref-infantil-estatura', 'E116', 'infantil');
const BABY = () => ctx('ref-bebe-meses', 'B0-3', 'bebe');
const scale = (sx: number, sy: number, dx = 0, dy = 0): Mat => [sx, 0, 0, sy, dx, dy];
const mirrorX = (m: Mat): Mat => [-m[0], m[1], -m[2], m[3], -m[4], m[5]];

/** Complete outline of a piece cut on the fold: its half plus the mirrored half. */
function unfold(p: Piece, foldId: string, m: Mat): string {
  const E = p.edges, f = E.findIndex(e => e.id === foldId), order = [...E.slice(f + 1), ...E.slice(0, f)];
  const at = (id: string) => { const n = nodeById(p, id); return P(n.x, n.y); };
  const flip = (q: Pt) => P(-q.x, q.y);
  const cmds: PathCmd[] = [{ op: 'M', p: at(E[f].to) }];
  for (const e of order) cmds.push(e.kind === 'cubic' ? { op: 'C', c1: e.c1!, c2: e.c2!, p: at(e.to) } : { op: 'L', p: at(e.to) });
  for (const e of [...order].reverse()) cmds.push(e.kind === 'cubic' ? { op: 'C', c1: flip(e.c2!), c2: flip(e.c1!), p: flip(at(e.from)) } : { op: 'L', p: flip(at(e.from)) });
  cmds.push({ op: 'Z' });
  return svg(transformCmds(cmds, m));
}
/** One or more edges as an open stroke (for hems, bindings and stitch lines). */
function stroke(p: Piece, ids: string[], m: Mat, mirrored = false): string {
  const mm = mirrored ? mirrorX(m) : m, cmds: PathCmd[] = [];
  ids.forEach((id, i) => {
    const e = p.edges.find(edge => edge.id === id)!, a = nodeById(p, e.from), b = nodeById(p, e.to);
    if (i === 0) cmds.push({ op: 'M', p: P(a.x, a.y) });
    cmds.push(e.kind === 'cubic' ? { op: 'C', c1: e.c1!, c2: e.c2!, p: P(b.x, b.y) } : { op: 'L', p: P(b.x, b.y) });
  });
  return svg(transformCmds(cmds, mm));
}
const outlineOf = (p: Piece, m: Mat) => svg(transformCmds(pieceSeamCmds(p), m));
const shift = (d: string, dx: number, dy: number) => svg(transformCmds(parseSvgPath(d), scale(1, 1, dx, dy)));

function view(key: FlatViewKey, zones: Zone[], details: Details, dots: FlatView['dots'], refLabel: string, seams: FlatView['seams'] = { center: 0 }): FlatView {
  const boxes = [...zones, ...details].map(item => cmdsBBox(parseSvgPath(item.d)));
  const minX = Math.min(...boxes.map(b => b.minX)), minY = Math.min(...boxes.map(b => b.minY)), maxX = Math.max(...boxes.map(b => b.maxX)), maxY = Math.max(...boxes.map(b => b.maxY));
  const pad = Math.max(maxX - minX, maxY - minY) * .05;
  return { key, zones, details, dots, refY: 0, refLabel, seams, minX: minX - pad, minY: minY - pad, width: maxX - minX + 2 * pad, height: maxY - minY + 2 * pad };
}
/** Soft gathers: short strokes fanning out under a seam. */
function gathers(x0: number, x1: number, y: number, depth: number, spread: number, count: number): Details {
  return Array.from({ length: count }, (_, i) => {
    const t = (i + .5) / count, x = x0 + (x1 - x0) * t, out = (t - .5) * spread;
    return { d: `M${r1(x)} ${r1(y + 2)} L${r1(x + out)} ${r1(y + depth * (.6 + .4 * ((i * 37) % 5) / 4))}`, style: 'pliegue' as const };
  });
}
/** Wavy hem from right to left, as cubic flutes. */
function waves(xr: number, xl: number, y: number, count: number, amp: number): string {
  let d = '';
  const step = (xl - xr) / count;
  for (let i = 0; i < count; i++) {
    const a = xr + step * i, b = a + step;
    d += ` C${r1(a + step * .25)} ${r1(y + amp)} ${r1(b - step * .25)} ${r1(y + amp)} ${r1(b)} ${r1(y)}`;
  }
  return d;
}

// ------------------------------------------------------------- Vestido trapecio
function trapezeFlat(volante: boolean): FlatView[] {
  const c = GIRL(), r = generateTrapeze(c, { manga: volante ? 'volante' : 'sin' }), front = piece(r, 'delantero'), back = piece(r, 'espalda');
  const sx = 255 / front.nodes[4].x, sy = 400 / c.body.talleEspalda!, m = scale(sx, sy);
  const flutters = (): Zone[] => {
    if (!volante) return [];
    const Sx = front.nodes[2].x * sx, Sy = front.nodes[2].y * sy, My = front.nodes[3].y * sy, Mx = front.nodes[3].x * sx;
    // The flutter hangs from shoulder to the armhole notch and fans outward.
    const wing = (sign: number) => `M${r1(sign * (Sx - 8))} ${r1(Sy)} C${r1(sign * (Sx + 46))} ${r1(Sy - 10)} ${r1(sign * (Sx + 108))} ${r1(Sy + 30)} ${r1(sign * (Sx + 122))} ${r1(Sy + 92)} C${r1(sign * (Sx + 132))} ${r1(My + 58)} ${r1(sign * (Mx + 92))} ${r1(My + 92)} ${r1(sign * (Mx + 40))} ${r1(My + 74)} C${r1(sign * (Mx + 12))} ${r1(My + 40)} ${r1(sign * (Mx + 2))} ${r1(My + 18)} ${r1(sign * Mx)} ${r1(My)} Z`;
    return [zone('volante--1', 'Volante izquierdo', 'manga', wing(-1)), zone('volante--2', 'Volante derecho', 'manga', wing(1))];
  };
  const wingFolds = (): Details => {
    if (!volante) return [];
    const Sx = front.nodes[2].x * sx, Sy = front.nodes[2].y * sy, My = front.nodes[3].y * sy;
    return [-1, 1].flatMap(sign => [0, 1, 2].map(i => ({ d: `M${r1(sign * (Sx + 4 + i * 4))} ${r1(Sy + 14 + i * (My - Sy) * .28)} Q${r1(sign * (Sx + 52 + i * 12))} ${r1(Sy + 50 + i * 30)} ${r1(sign * (Sx + 84 + i * 6))} ${r1(Sy + 100 + i * 34)}`, style: 'pliegue' as const })));
  };
  const hem = (p: Piece) => [false, true].map(mirror => ({ d: shift(stroke(p, ['bajo'], m, mirror), 0, -14), style: 'pespunte' as const }));
  const bias = (p: Piece, ids: string[]) => [false, true].map(mirror => ({ d: stroke(p, ids, m, mirror), style: 'costura' as const }));
  const frontView = view('frente', [zone('delantero', 'Delantero', 'delantero', unfold(front, 'centro', m)), ...flutters()],
    [...hem(front), ...bias(front, ['cuello']), ...bias(front, ['sisa-superior', 'sisa-inferior']), ...wingFolds()], [], 'Hombro', { left: -255, right: 255, center: 0 });
  const slitEnd = back.nodes[7].y * sy, neck = back.nodes[0].y * sy, L = back.nodes[6].y * sy;
  const backView = view('espalda', [zone('espalda--1', 'Espalda izquierda', 'espalda', outlineOf(back, mirrorX(m))), zone('espalda--2', 'Espalda derecha', 'espalda', outlineOf(back, m)), ...flutters()],
    [...hem(back), ...bias(back, ['cuello']), { d: `M0 ${r1(slitEnd)} L0 ${r1(L)}`, style: 'costura' }, { d: `M-1.5 ${r1(neck)} L-1.5 ${r1(slitEnd)}`, style: 'doblez' }, ...wingFolds()],
    [{ x: -9, y: r1(neck + 14), r: 6 }], 'Hombro', { left: -255, right: 255, center: 0 });
  return [frontView, backView];
}

// ------------------------------------------------------- Vestido de tirantes
function sundressFlat(): FlatView[] {
  const c = GIRL(), r = generateSundress(c, {}), front = piece(r, 'cuerpo-delantero'), back = piece(r, 'cuerpo-espalda'), skirt = piece(r, 'falda-delantera');
  const w = front.nodes[1].x, h = front.nodes[2].y, sx = 255 / w, sy = 400 / c.body.talleEspalda!, top = 400 - h * sy, W = w * sx;
  const skirtL = skirt.nodes[2].y * sy, hemW = W * 1.32, strapW = 15 * sx;
  const skirtPath = `M${r1(-W)} 400 L${r1(W)} 400 C${r1(W * 1.08)} ${r1(400 + skirtL * .3)} ${r1(hemW)} ${r1(400 + skirtL * .7)} ${r1(hemW)} ${r1(400 + skirtL)} Q0 ${r1(400 + skirtL + 16)} ${r1(-hemW)} ${r1(400 + skirtL)} C${r1(-hemW)} ${r1(400 + skirtL * .7)} ${r1(-W * 1.08)} ${r1(400 + skirtL * .3)} ${r1(-W)} 400 Z`;
  const straps = (topY: number): Zone[] => [-1, 1].map((sign, i) => {
    const x = sign * W * .55, xt = sign * W * .5;
    return zone(`tirante--${i + 1}`, sign < 0 ? 'Tirante izquierdo' : 'Tirante derecho', 'otra', `M${r1(x - strapW / 2)} ${r1(topY + 6)} L${r1(x + strapW / 2)} ${r1(topY + 6)} L${r1(xt + strapW / 2)} 4 L${r1(xt - strapW / 2)} 4 Z`);
  });
  const skirtDetails: Details = [...gathers(-W, W, 400, skirtL * .32, 40, 16), { d: `M${r1(-hemW + 8)} ${r1(400 + skirtL - 22)} Q0 ${r1(400 + skirtL - 6)} ${r1(hemW - 8)} ${r1(400 + skirtL - 22)}`, style: 'pespunte' }, { d: `M${r1(-W)} 400 L${r1(W)} 400`, style: 'costura' }];
  const bodice = (p: Piece) => unfold(p, 'centro', scale(sx, sy, 0, top));
  const backTop = top + 20 * sy;
  return [
    view('frente', [...straps(top + 8), zone('cuerpo-delantero', 'Cuerpo delantero', 'delantero', bodice(front)), zone('falda-delantera', 'Falda delantera', 'otra', skirtPath)],
      [...skirtDetails, { d: stroke(front, ['superior'], scale(sx, sy, 0, top + 8)) + ' ' + stroke(front, ['superior'], mirrorX(scale(sx, sy, 0, top + 8))), style: 'pespunte' }], [], 'Hombro', { left: -W, right: W, center: 0 }),
    view('espalda', [...straps(backTop), zone('cuerpo-espalda', 'Cuerpo de espalda', 'espalda', bodice(back)), zone('falda-trasera', 'Falda trasera', 'otra', skirtPath)],
      [...skirtDetails, { d: `M${r1(-W)} ${r1(backTop + 9)} L${r1(W)} ${r1(backTop + 9)}`, style: 'pespunte' }], [-1, 1].map(sign => ({ x: r1(sign * W * .55), y: r1(backTop + 22), r: 7 })), 'Hombro', { left: -W, right: W, center: 0 })
  ];
}

// ------------------------------------------------------------------ Faldas
const WB = 190, LEG = 1020 / (1160 * .56);
function band(height: number): { zone: Zone; details: Details } {
  const details: Details = [];
  for (let x = -WB + 14; x < WB - 8; x += 22) details.push({ d: `M${x} 8 L${x + 2} ${r1(height - 8)}`, style: 'pliegue' });
  return { zone: zone('pretina', 'Pretina elástica', 'pretina', `M${-WB} 0 L${WB} 0 L${WB} ${r1(height)} L${-WB} ${r1(height)} Z`), details };
}

function tulleFlat(): FlatView[] {
  const r = generateTulle(GIRL(), {}), tulle = piece(r, 'capa-tul'), bandH = (r.checks[1].target - tulle.nodes[2].y) * LEG, L = r.checks[1].target * LEG;
  const b = band(bandH), x = WB * 2.15;
  const body = `M${-WB} ${r1(bandH)} L${WB} ${r1(bandH)} C${WB + 120} ${r1(bandH + 30)} ${r1(x + 10)} ${r1(L * .45)} ${r1(x)} ${r1(L - 8)}${waves(x, -x, L - 8, 9, 22)} C${r1(-x - 10)} ${r1(L * .45)} ${-WB - 120} ${r1(bandH + 30)} ${-WB} ${r1(bandH)} Z`;
  const layers: Details = [.62, .8].map(f => ({ d: `M${r1(x * f)} ${r1(L * f + 20)}${waves(x * f, -x * f, L * f + 20, 7, 16)}`, style: 'pliegue' }));
  const v = (key: FlatViewKey) => view(key, [zone('capa-tul', 'Capas de tul', key === 'frente' ? 'delantero' : 'espalda', body), b.zone], [...b.details, ...gathers(-WB, WB, bandH, L * .35, 160, 18), ...layers], [], 'Cintura', { left: -245, right: 245, center: 0 });
  return [v('frente'), v('espalda')];
}

function tieredFlat(): FlatView[] {
  const r = generateTiered(GIRL(), {}), hs = ['olan-1', 'olan-2', 'olan-3'].map(id => piece(r, id).nodes[2].y * LEG);
  const xs = [WB, WB * 1.13, WB * 1.45, WB * 1.9], ys = [0, hs[0], hs[0] + hs[1], hs[0] + hs[1] + hs[2]];
  const tier = (i: number) => {
    const hem = i === 2 ? ` Q0 ${r1(ys[3] + 14)} ${r1(-xs[3])} ${r1(ys[3])}` : ` L${r1(-xs[i + 1])} ${r1(ys[i + 1])}`;
    return zone(`olan-${i + 1}`, `Olán ${i + 1}`, 'otra', `M${r1(-xs[i])} ${r1(ys[i])} L${r1(xs[i])} ${r1(ys[i])} L${r1(xs[i + 1])} ${r1(ys[i + 1])}${hem} Z`);
  };
  const details: Details = [];
  for (let x = -WB + 14; x < WB - 8; x += 22) details.push({ d: `M${x} 6 L${x + 2} 34`, style: 'pliegue' });
  details.push({ d: `M${-WB} 40 L${WB} 40`, style: 'pespunte' });
  for (let i = 1; i < 3; i++) details.push(...gathers(-xs[i], xs[i], ys[i], hs[i] * .45, 50, 12 + i * 5));
  details.push({ d: `M${r1(-xs[3] + 8)} ${r1(ys[3] - 18)} Q0 ${r1(ys[3] - 4)} ${r1(xs[3] - 8)} ${r1(ys[3] - 18)}`, style: 'pespunte' });
  const v = (key: FlatViewKey) => view(key, [0, 1, 2].map(tier), details, [], 'Cintura', { left: -245, right: 245, center: 0 });
  return [v('frente'), v('espalda')];
}

function circleFlat(full: boolean): FlatView[] {
  const r = generateCircle(GIRL(), { vuelo: full ? 'completo' : 'medio' }), L = r.checks[1].target * LEG, b = band(42);
  const x = WB * (full ? 2.55 : 1.85), flutes = full ? 6 : 4;
  const body = `M${-WB} 42 L${WB} 42 C${WB + 60} ${r1(42 + L * .25)} ${r1(x)} ${r1(L * .7)} ${r1(x)} ${r1(L)}${waves(x, -x, L, flutes, full ? 46 : 30)} C${r1(-x)} ${r1(L * .7)} ${-WB - 60} ${r1(42 + L * .25)} ${-WB} 42 Z`;
  const folds: Details = Array.from({ length: flutes - 1 }, (_, i) => {
    const hx = x - (2 * x / flutes) * (i + 1), wx = WB * (1 - 2 * (i + 1) / flutes);
    return { d: `M${r1(wx)} 46 Q${r1((wx + hx) / 2)} ${r1(L * .55)} ${r1(hx)} ${r1(L + 2)}`, style: 'pliegue' as const };
  });
  const hem: Details = [{ d: `M${r1(x - 6)} ${r1(L - 10)}${waves(x - 6, -x + 6, L - 10, flutes, full ? 46 : 30)}`, style: 'pespunte' }];
  const v = (key: FlatViewKey) => view(key, [zone(key === 'frente' ? 'falda-delantera' : 'falda-trasera', key === 'frente' ? 'Falda delantera' : 'Falda trasera', key === 'frente' ? 'delantero' : 'espalda', body), b.zone], [...b.details, ...folds, ...hem], [], 'Cintura', { left: -245, right: 245, center: 0 });
  return [v('frente'), v('espalda')];
}

// ----------------------------------------------------------------- Bebé
function bloomerFlat(ruffles: boolean): FlatView[] {
  const r = generateBloomers(BABY(), { olanes: ruffles ? 'si' : 'no' }), front = piece(r, 'delantero'), back = piece(r, 'espalda'), m = scale(1, 1);
  const casing = 20, waist = (p: Piece): Details => [{ d: `M${-p.nodes[1].x} ${casing} L${p.nodes[1].x} ${casing}`, style: 'pespunte' as const },
    ...Array.from({ length: 14 }, (_, i) => { const x = -p.nodes[1].x + (i + .5) * 2 * p.nodes[1].x / 14; return { d: `M${r1(x)} 4 L${r1(x + 1)} ${casing - 4}`, style: 'pliegue' as const }; })];
  const legs = (p: Piece): Details => [false, true].map(mirror => ({ d: shift(stroke(p, ['pierna'], m, mirror), mirror ? 3 : -3, -4), style: 'pespunte' as const }));
  const zones: Zone[] = [zone('espalda', 'Espalda', 'espalda', unfold(back, 'centro', m))];
  if (ruffles) {
    const leg = back.edges[2], a = nodeById(back, leg.from), z = nodeById(back, leg.to);
    const xAt = (y: number) => cubicPoint(a, leg.c1!, leg.c2!, z, solve(t => cubicPoint(a, leg.c1!, leg.c2!, z, t).y, y, 0, 1)).x;
    for (const line of back.lines.filter(l => l.kind === 'colocacion')) {
      const y = line.a.y, x = line.b.x, xb = xAt(Math.min(y + 30, z.y - 1));
      zones.push(zone(line.id, `Olán ${line.id.slice(-1)}`, 'otra', `M${r1(-x)} ${r1(y)} L${r1(x)} ${r1(y)} L${r1(xb)} ${r1(y + 30)}${waves(xb, -xb, y + 30, 6, 6)} Z`));
    }
  }
  return [
    view('frente', [zone('delantero', 'Delantero', 'delantero', unfold(front, 'centro', m))], [...waist(front), ...legs(front)], [], 'Cintura', { left: -front.nodes[1].x, right: front.nodes[1].x, center: 0 }),
    view('espalda', zones, [...waist(back), ...legs(back)], [], 'Cintura', { left: -back.nodes[1].x, right: back.nodes[1].x, center: 0 })
  ];
}

function sleepSackFlat(): FlatView[] {
  const r = generateSleepSack(BABY(), {}), front = piece(r, 'delantero'), back = piece(r, 'espalda'), m = scale(1, 1);
  const neck = front.nodes[0].y, zipEnd = front.nodes[6].y, half = front.nodes[3].x;
  const bias = (p: Piece): Details => [false, true].flatMap(mirror => [{ d: stroke(p, ['cuello'], m, mirror), style: 'costura' as const }, { d: stroke(p, ['sisa'], m, mirror), style: 'costura' as const }]);
  return [
    view('frente', [zone('delantero--1', 'Medio delantero izquierdo', 'delantero', outlineOf(front, mirrorX(m))), zone('delantero--2', 'Medio delantero derecho', 'delantero', outlineOf(front, m))],
      [...bias(front), { d: `M0 ${r1(neck)} L0 ${r1(zipEnd)}`, style: 'costura' }, { d: `M-5 ${r1(neck + 4)} L-5 ${r1(zipEnd)} M5 ${r1(neck + 4)} L5 ${r1(zipEnd)}`, style: 'pespunte' }, { d: `M-6 ${r1(neck + 6)} L6 ${r1(neck + 6)} L6 ${r1(neck + 26)} L-6 ${r1(neck + 26)} Z`, style: 'costura' }],
      [{ x: 0, y: r1(neck + 32), r: 3.5 }], 'Hombro', { left: -half, right: half, center: 0 }),
    view('espalda', [zone('espalda', 'Espalda', 'espalda', unfold(back, 'centro', m))], bias(back), [], 'Hombro', { left: -half, right: half, center: 0 })
  ];
}

function bonnetFlat(): FlatView[] {
  // Seen from behind: the curved rear piece framed by the band, chin tab to one side.
  const r = generateBonnet(BABY(), {}), rear = piece(r, 'trasera'), tab = piece(r, 'lengueta');
  const wB = rear.nodes[2].x, h = -rear.nodes[1].y, t = 36;
  type Cubic = Extract<PathCmd, { op: 'C' }>;
  const curves = (sx: number, sy: number) => transformCmds(pieceSeamCmds(rear), scale(sx, sy, -wB * sx / 2, 0)).filter((c): c is Cubic => c.op === 'C');
  const [oa, ob] = curves((wB + 2 * t) / wB, (h + t) / h), [ia, ib] = curves(1, 1), [ma, mb] = curves((wB + t) / wB, (h + t / 2) / h);
  const arch = svg([{ op: 'M', p: P(-(wB / 2 + t), 0) }, oa, ob, { op: 'L', p: P(wB / 2, 0) }, { op: 'C', c1: ib.c2, c2: ib.c1, p: ia.p }, { op: 'C', c1: ia.c2, c2: ia.c1, p: P(-wB / 2, 0) }, { op: 'Z' }]);
  const Lt = tab.nodes[2].x * .85, x0 = wB / 2 + t * .45;
  const tabPath = `M${r1(x0)} -4 L${r1(x0 + Lt - 12)} -4 C${r1(x0 + Lt - 4)} -4 ${r1(x0 + Lt)} 2 ${r1(x0 + Lt)} 10 C${r1(x0 + Lt)} 18 ${r1(x0 + Lt - 4)} 24 ${r1(x0 + Lt - 12)} 24 L${r1(x0)} 24 Z`;
  return [view('frente', [zone('banda', 'Banda', 'base', arch), zone('trasera', 'Pieza trasera', 'base', outlineOf(rear, scale(1, 1, -wB / 2, 0))), zone('lengueta', 'Lengüeta', 'otra', tabPath)],
    [{ d: svg([{ op: 'M', p: P(-(wB + t) / 2, 0) }, ma, mb]), style: 'pespunte' }], [{ x: r1(x0 + Lt - 12), y: 10, r: 4 }], 'Base del bonete')];
}

function bootiesFlat(): FlatView[] {
  const r = generateBooties(BABY(), {}), sole = piece(r, 'suela'), heel = piece(r, 'talonera');
  const Ls = sole.nodes[2].y - sole.nodes[0].y, hT = heel.nodes[2].y, gap = 14;
  const bootie = (sign: number, i: number): Zone[] => {
    const X = (x: number) => r1(sign * (gap + x)), side = Ls * .46;
    return [
      zone(`talonera--${i}`, 'Talonera', 'base', `M${X(0)} -7 L${X(0)} ${r1(-hT - 2)} C${X(0)} ${r1(-hT - 8)} ${X(Ls * .1)} ${r1(-hT - 6)} ${X(Ls * .2)} ${r1(-hT - 2)} L${X(side - 4)} ${r1(-hT + 6)} L${X(side)} -7 Z`),
      zone(`empeine--${i}`, 'Empeine', 'base', `M${X(side)} -7 L${X(side - 4)} ${r1(-hT + 6)} C${X(Ls * .62)} ${r1(-hT * 1.18)} ${X(Ls * .97)} ${r1(-hT * .78)} ${X(Ls - 1)} -14 Q${X(Ls + 2)} -7 ${X(Ls - 6)} -7 Z`),
      zone(`suela--${i}`, 'Suela', 'base', `M${X(3)} -8 L${X(Ls - 8)} -8 C${X(Ls)} -8 ${X(Ls + 2)} -2 ${X(Ls - 6)} 0 L${X(5)} 0 C${X(-1)} 0 ${X(-1)} -8 ${X(3)} -8 Z`)
    ];
  };
  const details: Details = [-1, 1].flatMap(sign => [
    ...Array.from({ length: 5 }, (_, i) => ({ d: `M${r1(sign * (gap + 3 + i * Ls * .07))} ${r1(-hT + 1 + i * 1.2)} L${r1(sign * (gap + 5 + i * Ls * .07))} ${r1(-hT + 9 + i * 1.2)}`, style: 'pliegue' as const })),
    { d: `M${r1(sign * (gap + Ls * .5))} ${r1(-hT * 1.02)} C${r1(sign * (gap + Ls * .7))} ${r1(-hT * 1.02)} ${r1(sign * (gap + Ls * .9))} ${r1(-hT * .7)} ${r1(sign * (gap + Ls * .95))} -16`, style: 'pespunte' as const }
  ]);
  return [view('frente', [...bootie(-1, 1), ...bootie(1, 2)], details, [], 'Suelo')];
}

function towelFlat(): FlatView[] {
  const r = generateTowel(BABY(), {}), towel = piece(r, 'toalla'), hood = piece(r, 'capucha'), side = towel.nodes[2].x, inset = (side - 30) / side;
  const c = side / 2, inner = svg(transformCmds(pieceSeamCmds(towel), scale(inset, inset, c * (1 - inset), c * (1 - inset))));
  const face = hood.nodes[1].x;
  return [view('frente', [zone('toalla', 'Toalla', 'base', outlineOf(towel, scale(1, 1))), zone('capucha', 'Capucha', 'capucha', outlineOf(hood, scale(1, 1)))],
    [{ d: inner, style: 'pespunte' }, { d: `M${r1(face - 16)} 0 L0 ${r1(face - 16)}`, style: 'pespunte' }], [], 'Borde superior', { center: side / 2 })];
}

function bandanaBibFlat(): FlatView[] {
  const r = generateBandanaBib(BABY(), {}), bib = piece(r, 'babero'), cx = 0, cy = bib.nodes[3].y * .38, k = .9;
  const inner = svg(transformCmds(pieceSeamCmds(bib), scale(k, k, cx * (1 - k), cy * (1 - k))));
  return [view('frente', [zone('babero', 'Babero', 'base', outlineOf(bib, scale(1, 1)))], [{ d: inner, style: 'pespunte' }], bib.marks.map(mark => ({ x: r1(mark.at.x), y: r1(mark.at.y), r: 4 })), 'Borde del cuello')];
}

// ----------------------------------------------------------- Más bebé
function overallFlat(longLeg: boolean): FlatView[] {
  const r = generateOverall(BABY(), { largo: longLeg ? 'largo' : 'corto' }), front = piece(r, 'delantero'), back = piece(r, 'espalda'), m = scale(1, 1);
  const bw = front.nodes[1].x, Wq = front.nodes[2].x, backTop = back.nodes[0].y, sw = 22;
  const straps = (y0: number, cross: boolean): Zone[] => [-1, 1].map((sign, i) => {
    const x0 = sign * (cross ? Wq * .45 : bw - 14), x1 = sign * (cross ? -bw * .9 : bw - 18), top = y0 - 95;
    return zone(`tirante--${i + 1}`, sign < 0 ? 'Tirante izquierdo' : 'Tirante derecho', 'otra', `M${r1(x0 - sw / 2)} ${r1(y0 + 4)} L${r1(x0 + sw / 2)} ${r1(y0 + 4)} L${r1(x1 + sw / 2)} ${r1(top)} L${r1(x1 - sw / 2)} ${r1(top)} Z`);
  });
  const hemLines = (p: Piece): Details => [false, true].map(mirror => ({ d: shift(stroke(p, ['bajo'], m, mirror), 0, -10), style: 'pespunte' as const }));
  const opening = (p: Piece): Details => [false, true].map(mirror => ({ d: stroke(p, ['abertura-pierna', 'abertura-entrepierna'], m, mirror), style: 'pespunte' as const }));
  return [
    view('frente', [zone('delantero', 'Delantero con peto', 'delantero', unfold(front, 'centro', m)), ...straps(0, false)], [...hemLines(front), ...opening(front)], [-1, 1].map(sign => ({ x: r1(sign * (bw - 14)), y: 14, r: 4 })), 'Peto'),
    view('espalda', [...straps(backTop, true), zone('espalda', 'Espalda', 'espalda', unfold(back, 'centro', m))], [...hemLines(back), ...opening(back)], [], 'Peto')
  ];
}

function earHatFlat(ears: 'oso' | 'gato' | 'conejo'): FlatView[] {
  const r = generateEarHat({ ...BABY(), fabric: 'punto', stretch: 30 }, { orejas: ears }), hat = piece(r, 'gorro'), ear = piece(r, 'oreja');
  const w = hat.nodes[4].x, dome = hat.nodes[1].y, total = hat.nodes[0].y, brim = total - hat.lines[0].a.y;
  const earBox = cmdsBBox(pieceSeamCmds(ear)), ew = earBox.maxX - earBox.minX;
  const earZone = (sign: number, i: number) => {
    const angle = sign * .55, cx = w / 2 + sign * w * .3, cy = dome * .35, c = Math.cos(angle), sn = Math.sin(angle);
    const M: Mat = [c, sn, -sn, c, cx - (c * ew / 2 - sn * 0), cy - (sn * ew / 2)];
    return zone(`oreja--${i + 1}`, 'Oreja', 'otra', svg(transformCmds(pieceSeamCmds(ear), M)));
  };
  // Worn state: the brim is folded up once, so the hat ends at the fold line.
  const fold = total - brim, K4 = .5523;
  const worn = `M0 ${r1(fold)} L0 ${r1(dome)} C0 ${r1(dome * (1 - K4))} ${r1(w / 2 * (1 - K4))} 0 ${r1(w / 2)} 0 C${r1(w / 2 + w / 2 * K4)} 0 ${r1(w)} ${r1(dome * (1 - K4))} ${r1(w)} ${r1(dome)} L${r1(w)} ${r1(fold)} Z`;
  return [view('frente', [earZone(-1, 0), earZone(1, 1), zone('gorro', 'Gorro', 'base', worn)],
    [{ d: `M0 ${r1(fold - brim)} L${r1(w)} ${r1(fold - brim)}`, style: 'doblez' }, ...Array.from({ length: 9 }, (_, i) => ({ d: `M${r1(w * (i + 1) / 10)} ${r1(fold - brim + 6)} L${r1(w * (i + 1) / 10)} ${r1(fold - 6)}`, style: 'pliegue' as const }))], [], 'Borde del gorro')];
}

/** Schematic side view of the bucket hat: crown top, band and brim. */
function bucketZones(prefix: string, dx: number, dy: number, k: number): Zone[] {
  const W = 150 * k, hb = 60 * k, top = 120 * k, brimW = 55 * k;
  const id = (z: string) => prefix ? `${prefix}-${z}` : z;
  return [
    zone(id('ala'), 'Ala', 'base', `M${r1(dx - W / 2 - brimW)} ${r1(dy + hb + 14 * k)} Q${r1(dx)} ${r1(dy + hb - 18 * k)} ${r1(dx + W / 2 + brimW)} ${r1(dy + hb + 14 * k)} Q${r1(dx)} ${r1(dy + hb + 44 * k)} ${r1(dx - W / 2 - brimW)} ${r1(dy + hb + 14 * k)} Z`),
    zone(id('banda'), 'Banda', 'base', `M${r1(dx - top / 2)} ${r1(dy)} L${r1(dx + top / 2)} ${r1(dy)} L${r1(dx + W / 2)} ${r1(dy + hb)} Q${r1(dx)} ${r1(dy + hb + 10 * k)} ${r1(dx - W / 2)} ${r1(dy + hb)} Z`),
    zone(id('copa'), 'Copa', 'base', `M${r1(dx - top / 2)} ${r1(dy)} Q${r1(dx)} ${r1(dy - 22 * k)} ${r1(dx + top / 2)} ${r1(dy)} Q${r1(dx)} ${r1(dy + 10 * k)} ${r1(dx - top / 2)} ${r1(dy)} Z`)
  ];
}

/** Places finished part views side by side, prefixing zone ids with the part. */
/** Lays the drawings of a set side by side on a common baseline; `row` stacks small accessories below. */
function compose(parts: { prefix: string; view: FlatView; height: number; row?: number }[]): FlatView[] {
  const zones: Zone[] = [], details: Details = [], dots: FlatView['dots'] = [], gap = 60;
  const sized = parts.map(part => {
    const box = cmdsBBox(part.view.zones.flatMap(z => parseSvgPath(z.d))), k = part.height / (box.maxY - box.minY);
    return { ...part, box, k, width: (box.maxX - box.minX) * k };
  });
  const rows: (typeof sized)[] = [];
  for (const part of sized) (rows[part.row ?? 0] ??= []).push(part);
  const widths = rows.map(row => row.reduce((w, part) => w + part.width + gap, -gap)), widest = Math.max(...widths);
  let baseline = 0;
  rows.forEach((row, r) => {
    let x = (widest - widths[r]) / 2;
    baseline += Math.max(...row.map(part => part.height));
    for (const part of row) {
      const { box, k } = part, m: Mat = [k, 0, 0, k, x - box.minX * k, baseline - box.maxY * k];
      zones.push(...part.view.zones.map(z => ({ ...z, id: `${part.prefix}-${z.id}`, label: `${part.prefix[0].toUpperCase()}${part.prefix.slice(1)} · ${z.label}`, d: svg(transformCmds(parseSvgPath(z.d), m)) })));
      details.push(...part.view.details.map(d => ({ ...d, d: svg(transformCmds(parseSvgPath(d.d), m)) })));
      dots.push(...part.view.dots.map(d => ({ x: r1(m[0] * d.x + m[4]), y: r1(m[3] * d.y + m[5]), r: d.r * k })));
      x += part.width + gap;
    }
    baseline += gap;
  });
  return [view('frente', zones, details, dots, 'Conjunto')];
}
const front0 = (views: FlatView[]) => views.find(v => v.key === 'frente')!;
function setFlat(set: 'verano' | 'invierno' | 'recien-nacido'): FlatView[] {
  if (set === 'verano') return compose([{ prefix: 'pelele', view: front0(overallFlat(false)), height: 420 }, { prefix: 'sombrero', view: view('frente', bucketZones('', 0, 0, 1), [], [], ''), height: 150 }]);
  if (set === 'invierno') return compose([{ prefix: 'overol', view: front0(overallFlat(true)), height: 520 }, { prefix: 'gorro', view: front0(earHatFlat('oso')), height: 200 }]);
  return compose([{ prefix: 'bonete', view: front0(bonnetFlat()), height: 160 }, { prefix: 'babero', view: front0(bandanaBibFlat()), height: 160 }, { prefix: 'patucos', view: front0(bootiesFlat()), height: 80, row: 1 }]);
}

const BUILDERS: Record<string, () => FlatView[]> = {
  'peto-corto': () => overallFlat(false), 'peto-largo': () => overallFlat(true), 'gorro-oso': () => earHatFlat('oso'), 'gorro-gato': () => earHatFlat('gato'), 'gorro-conejo': () => earHatFlat('conejo'),
  'conjunto-verano': () => setFlat('verano'), 'conjunto-invierno': () => setFlat('invierno'), 'conjunto-recien-nacido': () => setFlat('recien-nacido'),
  'vestido-trapecio': () => trapezeFlat(false), 'vestido-trapecio-volante': () => trapezeFlat(true), 'vestido-tirantes': sundressFlat,
  'falda-tul': tulleFlat, 'falda-olanes': tieredFlat, 'falda-circular': () => circleFlat(true), 'falda-medio-circulo': () => circleFlat(false),
  cubrepanal: () => bloomerFlat(false), 'cubrepanal-olanes': () => bloomerFlat(true), 'saco-dormir': sleepSackFlat,
  bonete: bonnetFlat, patucos: bootiesFlat, toalla: towelFlat, 'babero-bandana': bandanaBibFlat
};
const cache = new Map<string, FlatView[]>();
export const KIDS_FLAT_KEYS = Object.keys(BUILDERS);

export function buildKidsFlat(id: string, key: string): FlatDef {
  const builder = BUILDERS[key];
  if (!builder) return { id, views: [] };
  if (!cache.has(key)) cache.set(key, builder());
  return { id, views: cache.get(key)!.map(v => ({ ...v, zones: v.zones.map(z => ({ ...z })), details: v.details.map(d => ({ ...d })), dots: v.dots.map(d => ({ ...d })) })) };
}
