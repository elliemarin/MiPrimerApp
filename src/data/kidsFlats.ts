import { buildFlat, type FlatDef, type FlatView, type FlatViewKey } from './flats';
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
import { generateButtonTop, generateCasingDress, generatePeasant, generateRufflesRomper } from '../lib/pattern/generators/kidsTops';
import { generateEarflap, generatePixie } from '../lib/pattern/generators/kidsHats';
import { generatePinaforeApron, generateRuffleBonnet, generateStrapRomper, generateTrapezeTop } from '../lib/pattern/generators/kidsBatch2';
import { generateBatwing, generateHalfZip, generateRaglanJacket } from '../lib/pattern/generators/adultBatch';

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
  'cubrepanal-bebe': { frente: [S('delantero', 'delantero', false, true), ...pair('tirante')], espalda: [S('espalda', 'espalda', false, true), S('olan-1'), S('olan-2'), S('olan-3'), ...pair('tirante')] },
  'saco-dormir-bebe': { frente: pair('delantero'), espalda: [S('espalda', 'espalda', false, true)] },
  'bonete-bebe': { frente: [S('banda'), S('trasera'), S('lengueta')] },
  'patucos-bebe': { frente: [...pair('talonera'), ...pair('empeine'), ...pair('suela')] },
  'toalla-capucha': { frente: [S('toalla'), S('capucha')] },
  'babero-bandana': { frente: [S('babero')] },
  'peto-bebe': { frente: [S('delantero', 'delantero', false, true), ...pair('tirante')], espalda: [S('espalda', 'espalda', false, true), ...pair('tirante')] },
  'gorro-orejas': { frente: [S('gorro'), ...pair('oreja')] },
  // Designs digitized from reference photos (2026-11-01).
  'vestido-jareta-infantil': { frente: [S('delantero', 'delantero', false, true), S('lazo')], espalda: [S('espalda', 'espalda', false, true)] },
  'pelele-volantes': {
    frente: [S('cuerpo-delantero', 'cuerpo-delantero', false, true), S('short-delantero', 'short-delantero', false, true), ...pair('volante'), ...pair('tirante'), ...pair('lazo')],
    espalda: [...pair('cuerpo-espalda'), S('short-espalda', 'short-espalda', false, true), ...pair('volante')]
  },
  'blusa-campesina-infantil': {
    frente: [S('delantero', 'delantero', false, true), ...pair('manga'), S('volante', 'volante', false, true)],
    espalda: [S('espalda', 'espalda', false, true), ...pair('manga'), S('volante', 'volante', false, true)]
  },
  'blusa-botones-infantil': { frente: [S('delantero--1', 'delantero'), S('delantero--2', 'delantero', true)], espalda: [S('espalda', 'espalda', false, true)] },
  'gorro-duende': { frente: [S('lateral'), S('barbiquejo')] },
  'gorro-orejeras': { frente: [S('lateral'), S('oreja')] },
  'diadema-lazo': { frente: [S('banda'), S('lazo')] },
  // Second batch (2026-11-01).
  'bonete-volante': { frente: [S('lateral'), S('volante'), S('barbiquejo')] },
  'delantal-pichi-infantil': {
    frente: [S('delantal', 'delantal', false, true), S('volante-bajo', 'volante-bajo', false, true), ...pair('volante-hombro'), S('bolsillo')],
    espalda: [S('delantal', 'delantal', false, true), ...pair('volante-hombro')]
  },
  'mono-tirantes-infantil': {
    frente: [S('delantero--1', 'delantero'), S('delantero--2', 'delantero', true), ...pair('tirante'), S('bolsillo--1', 'bolsillo'), S('bolsillo--2', 'bolsillo', true), S('bolsillo'), ...pair('volante'), ...pair('lazo')],
    espalda: [S('espalda--1', 'espalda'), S('espalda--2', 'espalda', true), ...pair('tirante'), ...pair('volante')]
  },
  // Third batch (2026-11-01), drawn at an adult reference size.
  'sudadera-media-cremallera': {
    frente: [S('delantero-superior', 'delantero-superior', false, true), S('delantero-inferior', 'delantero-inferior', false, true), S('delantero', 'delantero', false, true), ...pair('manga'), ...pair('manga-inferior'), S('cuello')],
    espalda: [S('espalda-superior', 'espalda-superior', false, true), S('espalda-inferior', 'espalda-inferior', false, true), S('espalda', 'espalda', false, true), ...pair('manga'), ...pair('manga-inferior'), S('cuello')]
  },
  'chaqueta-ranglan': {
    frente: [...pair('delantero'), ...pair('manga-delantera'), S('cuello'), S('banda'), ...pair('puno')],
    espalda: [S('espalda', 'espalda', false, true), ...pair('manga-trasera'), S('cuello'), S('banda'), ...pair('puno')]
  },
  'buzo-murcielago': {
    frente: [S('centro-delantero', 'centro-delantero', false, true), ...pair('lateral'), S('capucha'), S('banda'), ...pair('puno')],
    espalda: [S('centro-espalda', 'centro-espalda', false, true), ...pair('lateral'), S('capucha'), S('banda'), ...pair('puno')]
  },
  'blusa-trapecio-infantil': {
    frente: [S('delantero', 'delantero', false, true), S('volante-bajo', 'volante-bajo', false, true)],
    espalda: [...pair('espalda'), S('volante-bajo', 'volante-bajo', false, true)]
  }
};
/** Parts drawn from real pieces whose generator also serves generic drawings elsewhere (only used inside sets). */
const PART_BINDINGS: Record<string, Partial<Record<FlatViewKey, KidsSurface[]>>> = {
  'pantalones-bombacho': {
    frente: [S('pierna-a', 'delantero'), S('pierna-b', 'delantero', true), S('pretina', 'delantero'), S('puno-a', 'delantero'), S('puno-b', 'delantero', true)],
    espalda: [S('pierna-a', 'trasero'), S('pierna-b', 'trasero', true), S('pretina', 'trasero'), S('puno-a', 'trasero'), S('puno-b', 'trasero', true)]
  }
};
/** Sets reuse the bindings of each part, with the part prefix on zones and pieces. */
const SET_PARTS: Record<string, [string, string][]> = {
  verano: [['pelele', 'peto-bebe'], ['sombrero', 'sombrero-pescador']], invierno: [['overol', 'peto-bebe'], ['gorro', 'gorro-orejas']],
  'recien-nacido': [['bonete', 'bonete-bebe'], ['patucos', 'patucos-bebe'], ['babero', 'babero-bandana']],
  vestido: [['vestido', 'vestido-jareta-infantil'], ['cubrepanal', 'cubrepanal-bebe']], 'pelele-diadema': [['pelele', 'pelele-volantes'], ['diadema', 'diadema-lazo']],
  campesino: [['blusa', 'blusa-campesina-infantil'], ['short', 'pantalones-bombacho']], rayas: [['blusa', 'blusa-botones-infantil'], ['pantalon', 'pantalones-bombacho']],
  trapecio: [['blusa', 'blusa-trapecio-infantil'], ['cubrepanal', 'cubrepanal-bebe']], vichy: [['blusa', 'blusa-trapecio-infantil'], ['pantalon', 'pantalones-bombacho']]
};
KIDS_SURFACE_PIECES['sombrero-pescador'] = { frente: [S('copa'), S('banda'), S('ala'), S('lazo')] };
KIDS_SURFACE_PIECES['conjunto-bebe'] = { frente: Object.values(SET_PARTS).flatMap(parts => parts.flatMap(([prefix, gen]) =>
  ((KIDS_SURFACE_PIECES[gen] ?? PART_BINDINGS[gen])?.frente ?? []).map(b => ({ ...b, zoneId: `${prefix}-${b.zoneId}`, pieceId: `${prefix}-${b.pieceId}` })))) };

type Details = FlatView['details'];
const P = (x: number, y: number): Pt => ({ x, y });
const r1 = (n: number) => Math.round(n * 10) / 10;
const zone = (id: string, label: string, type: ZoneType, d: string): Zone => ({ id, label, type, d });
const svg = (cmds: PathCmd[]) => cmdsToSvg(cmds);
const piece = (r: GeneratorResult, id: string) => r.pieces.find(p => p.id === id)!;
const ctx = (table: string, code: string, kind: GeneratorContext['kind']): GeneratorContext => ({ body: findSize(table, code)!.values, kind, fabric: 'plano', stretch: 0, fit: 'regular' });
const GIRL = () => ctx('ref-infantil-estatura', 'E116', 'infantil');
const BABY = () => ctx('ref-bebe-meses', 'B0-3', 'bebe');
const TODDLER = () => ctx('ref-infantil-estatura', 'E92', 'toddler');
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
function bloomerFlat(ruffles: boolean, straps = false): FlatView[] {
  const r = generateBloomers(BABY(), { olanes: ruffles ? 'si' : 'no', tirantes: straps ? 'cruzados' : 'no' }), front = piece(r, 'delantero'), back = piece(r, 'espalda'), m = scale(1, 1);
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
  // Detachable suspenders: straight up from the front buttons, crossed over the back.
  const strapZones = (w: number, cross: boolean): Zone[] => straps ? [-1, 1].map((sign, i) => {
    const x0 = sign * w * (cross ? .3 : .55), x1 = sign * (cross ? -w * .62 : w * .5), top = -150, sw = 15;
    return zone(`tirante--${i + 1}`, sign < 0 ? 'Tirante izquierdo' : 'Tirante derecho', 'otra', `M${r1(x0 - sw / 2)} 8 L${r1(x0 + sw / 2)} 8 L${r1(x1 + sw / 2)} ${top} L${r1(x1 - sw / 2)} ${top} Z`);
  }) : [];
  const buttons = (w: number, k: number) => straps ? [-1, 1].map(sign => ({ x: r1(sign * w * k), y: 10, r: 4 })) : [];
  return [
    view('frente', [zone('delantero', 'Delantero', 'delantero', unfold(front, 'centro', m)), ...strapZones(front.nodes[1].x, false)], [...waist(front), ...legs(front)], buttons(front.nodes[1].x, .55), 'Cintura', { left: -front.nodes[1].x, right: front.nodes[1].x, center: 0 }),
    view('espalda', [...zones, ...strapZones(back.nodes[1].x, true)], [...waist(back), ...legs(back)], buttons(back.nodes[1].x, .3), 'Cintura', { left: -back.nodes[1].x, right: back.nodes[1].x, center: 0 })
  ];
}

/** Bucket hat with the decorative bow on one side. */
function bowBucketFlat(): FlatView[] {
  const k = 1.6, zones = bucketZones('', 0, 0, k);
  return [view('frente', [...zones, zone('lazo', 'Lazo', 'otra', bowShape(150 * k * .3, 60 * k * .5, 70 * k))], bowDetails(150 * k * .3, 60 * k * .5, 70 * k), [], 'Ala')];
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
function setFlat(set: 'verano' | 'invierno' | 'recien-nacido' | 'vestido' | 'pelele-diadema' | 'campesino' | 'rayas' | 'trapecio' | 'vichy'): FlatView[] {
  if (set === 'trapecio') return compose([{ prefix: 'blusa', view: front0(trapezeTopFlat(false)), height: 260 }, { prefix: 'cubrepanal', view: front0(bloomerFlat(false)), height: 150 }]);
  if (set === 'vichy') return compose([{ prefix: 'blusa', view: front0(trapezeTopFlat(true)), height: 280 }, { prefix: 'pantalon', view: front0(culotteFlat()), height: 330 }]);
  if (set === 'verano') return compose([{ prefix: 'pelele', view: front0(overallFlat(false)), height: 420 }, { prefix: 'sombrero', view: view('frente', bucketZones('', 0, 0, 1), [], [], ''), height: 150 }]);
  if (set === 'invierno') return compose([{ prefix: 'overol', view: front0(overallFlat(true)), height: 520 }, { prefix: 'gorro', view: front0(earHatFlat('oso')), height: 200 }]);
  if (set === 'vestido') return compose([{ prefix: 'vestido', view: front0(casingDressFlat()), height: 400 }, { prefix: 'cubrepanal', view: front0(bloomerFlat(true)), height: 150 }]);
  if (set === 'pelele-diadema') return compose([{ prefix: 'pelele', view: front0(romperFlat()), height: 360 }, { prefix: 'diadema', view: front0(headbandFlat()), height: 120 }]);
  if (set === 'campesino') return compose([{ prefix: 'blusa', view: front0(peasantFlat(false)), height: 280 }, { prefix: 'short', view: front0(bombachoFlat(true)), height: 190 }]);
  if (set === 'rayas') return compose([{ prefix: 'blusa', view: front0(buttonTopFlat()), height: 280 }, { prefix: 'pantalon', view: front0(bombachoFlat(false)), height: 400 }]);
  return compose([{ prefix: 'bonete', view: front0(bonnetFlat()), height: 160 }, { prefix: 'babero', view: front0(bandanaBibFlat()), height: 160 }, { prefix: 'patucos', view: front0(bootiesFlat()), height: 80, row: 1 }]);
}

// ----------------------------------------------------------- Diseños digitalizados
/** Decorative bow seen from the front: two loops and a knot. */
function bowShape(cx: number, cy: number, w: number): string {
  const h = w * .42;
  return `M${r1(cx)} ${r1(cy)} C${r1(cx - w * .2)} ${r1(cy - h)} ${r1(cx - w * .55)} ${r1(cy - h)} ${r1(cx - w * .5)} ${r1(cy)} C${r1(cx - w * .55)} ${r1(cy + h)} ${r1(cx - w * .2)} ${r1(cy + h)} ${r1(cx)} ${r1(cy)} C${r1(cx + w * .2)} ${r1(cy + h)} ${r1(cx + w * .55)} ${r1(cy + h)} ${r1(cx + w * .5)} ${r1(cy)} C${r1(cx + w * .55)} ${r1(cy - h)} ${r1(cx + w * .2)} ${r1(cy - h)} ${r1(cx)} ${r1(cy)} Z`;
}
const bowDetails = (cx: number, cy: number, w: number): Details => [{ d: `M${r1(cx - w * .06)} ${r1(cy - w * .14)} L${r1(cx - w * .06)} ${r1(cy + w * .14)} M${r1(cx + w * .06)} ${r1(cy - w * .14)} L${r1(cx + w * .06)} ${r1(cy + w * .14)}`, style: 'costura' }];
/** Flutter sleeve hanging from the shoulder to the armhole notch. */
function flutterWing(sign: number, Sx: number, Sy: number, Mx: number, My: number, k = 1): string {
  return `M${r1(sign * (Sx - 6))} ${r1(Sy)} C${r1(sign * (Sx + 40 * k))} ${r1(Sy - 8 * k)} ${r1(sign * (Sx + 92 * k))} ${r1(Sy + 26 * k)} ${r1(sign * (Sx + 104 * k))} ${r1(Sy + 80 * k)} C${r1(sign * (Sx + 112 * k))} ${r1(My + 50 * k)} ${r1(sign * (Mx + 80 * k))} ${r1(My + 80 * k)} ${r1(sign * (Mx + 34 * k))} ${r1(My + 64 * k)} C${r1(sign * (Mx + 10 * k))} ${r1(My + 34 * k)} ${r1(sign * (Mx + 2))} ${r1(My + 14 * k)} ${r1(sign * Mx)} ${r1(My)} Z`;
}

function casingDressFlat(): FlatView[] {
  const r = generateCasingDress(TODDLER(), { lazo: 'si' }), f = piece(r, 'delantero'), b = piece(r, 'espalda'), m = scale(1, 1);
  const xt = f.nodes[1].x, casing = 18, strapH = f.nodes[2].y * .95;
  const straps = (sign: number): Details => [{ d: `M${r1(sign * (xt - 6))} 0 C${r1(sign * (xt - 4))} ${r1(-strapH * .5)} ${r1(sign * (xt - 14))} ${r1(-strapH * .9)} ${r1(sign * (xt - 18))} ${r1(-strapH)}`, style: 'costura' }, { d: `M${r1(sign * (xt - 14))} 0 C${r1(sign * (xt - 12))} ${r1(-strapH * .5)} ${r1(sign * (xt - 22))} ${r1(-strapH * .9)} ${r1(sign * (xt - 26))} ${r1(-strapH)}`, style: 'costura' }];
  const common = (p: Piece): Details => [{ d: `M${r1(-xt)} ${casing} L${r1(xt)} ${casing}`, style: 'pespunte' }, ...gathers(-xt + 8, xt - 8, casing, 34, 14, 14), ...straps(-1), ...straps(1),
    ...[false, true].map(mirror => ({ d: shift(stroke(p, ['bajo'], m, mirror), 0, -14), style: 'pespunte' as const })), ...[false, true].map(mirror => ({ d: stroke(p, ['sisa'], m, mirror), style: 'costura' as const }))];
  const bw = xt * .55;
  return [
    view('frente', [zone('delantero', 'Delantero', 'delantero', unfold(f, 'centro', m)), zone('lazo', 'Lazo', 'otra', bowShape(0, casing + 8, bw))], [...common(f), ...bowDetails(0, casing + 8, bw)], [], 'Canto superior'),
    view('espalda', [zone('espalda', 'Espalda', 'espalda', unfold(b, 'centro', m))], common(b), [], 'Canto superior')
  ];
}

function romperFlat(): FlatView[] {
  const r = generateRufflesRomper(BABY(), { tirantes: 'si' }), bf = piece(r, 'cuerpo-delantero'), bb = piece(r, 'cuerpo-espalda'), sf = piece(r, 'short-delantero'), sb = piece(r, 'short-espalda'), m = scale(1, 1);
  const L = bf.nodes[6].y, q = bf.nodes[4].x, W = sf.nodes[1].x, kx = q * 1.25 / W, ms = scale(kx, 1, 0, L);
  const Sx = bf.nodes[2].x, Sy = bf.nodes[2].y, Mx = bf.nodes[3].x, My = bf.nodes[3].y, k = q / 160;
  const wings = (): Zone[] => [zone('volante--1', 'Volante izquierdo', 'manga', flutterWing(-1, Sx, Sy, Mx, My, k)), zone('volante--2', 'Volante derecho', 'manga', flutterWing(1, Sx, Sy, Mx, My, k))];
  const legGathers = (p: Piece): Details => [false, true].flatMap(mirror => [{ d: stroke(p, ['pierna'], mirror ? mirrorX(ms) : ms), style: 'costura' as const }]);
  const waist: Details = [{ d: `M${r1(-q)} ${r1(L)} L${r1(q)} ${r1(L)}`, style: 'costura' }, ...gathers(-q + 6, q - 6, L, 26, 10, 14)];
  const nw = bf.nodes[1].x, sh = Sx, strap = (sign: number, i: number) => zone(`tirante--${i}`, sign < 0 ? 'Tirante izquierdo' : 'Tirante derecho', 'otra',
    `M${r1(sign * ((nw + sh) / 2 - 7))} ${r1(Sy * .5)} L${r1(sign * ((nw + sh) / 2 + 7))} ${r1(Sy * .5)} L${r1(sign * (q * .55 + 7))} ${r1(L)} L${r1(sign * (q * .55 - 7))} ${r1(L)} Z`);
  const bowW = q * .32;
  return [
    view('frente', [zone('short-delantero', 'Short delantero', 'pierna', unfold(sf, 'centro', ms)), zone('cuerpo-delantero', 'Cuerpo delantero', 'delantero', unfold(bf, 'centro', m)), ...wings(), strap(-1, 1), strap(1, 2),
      zone('lazo--1', 'Lazo izquierdo', 'otra', bowShape(-q * .55, L, bowW)), zone('lazo--2', 'Lazo derecho', 'otra', bowShape(q * .55, L, bowW))],
    [...waist, ...legGathers(sf), ...[false, true].map(mirror => ({ d: stroke(bf, ['cuello'], m, mirror), style: 'costura' as const })), ...bowDetails(-q * .55, L, bowW), ...bowDetails(q * .55, L, bowW)], [], 'Hombro'),
    view('espalda', [zone('short-espalda', 'Short de espalda', 'pierna', unfold(sb, 'centro', ms)), zone('cuerpo-espalda--1', 'Espalda izquierda', 'espalda', outlineOf(bb, mirrorX(m))), zone('cuerpo-espalda--2', 'Espalda derecha', 'espalda', outlineOf(bb, m)), ...wings()],
      [...waist, ...legGathers(sb)], bb.marks.filter(mk => mk.kind === 'boton').map(mk => ({ x: 0, y: r1(mk.at.y), r: 4 })), 'Hombro')
  ];
}

function peasantFlat(long: boolean): FlatView[] {
  const r = generatePeasant(GIRL(), { manga: long ? 'larga' : 'corta', volante: 'si' }), f = piece(r, 'delantero'), b = piece(r, 'espalda'), sl = piece(r, 'manga'), vol = piece(r, 'volante'), m = scale(1, 1);
  const rx = f.nodes[1].x, q = f.nodes[2].x, ad = f.nodes[2].y, L = f.nodes[3].y, vh = vol.nodes[2].y, h = sl.nodes[2].y, Ls = sl.nodes[3].y;
  const sleeve = (sign: number, i: number) => {
    const o = (x: number) => r1(sign * x);
    const d = long
      ? `M${o(rx)} 0 C${o(rx + 50)} -12 ${o(q + 40)} ${r1(ad * .1)} ${o(q + 48)} ${r1(ad * .45)} L${o(q + 74)} ${r1(ad + (Ls - h) * .85)} C${o(q + 76)} ${r1(ad + (Ls - h) * .95)} ${o(q + 40)} ${r1(ad + (Ls - h))} ${o(q + 30)} ${r1(ad + (Ls - h) * .93)} L${o(q)} ${r1(ad)} Z`
      : `M${o(rx)} 0 C${o(rx + 64)} -16 ${o(q + 58)} ${r1(ad * .18)} ${o(q + 62)} ${r1(ad * .58)} C${o(q + 66)} ${r1(ad * .9)} ${o(q + 22)} ${r1(ad + 14)} ${o(q)} ${r1(ad)} Z`;
    return zone(`manga--${i}`, sign < 0 ? 'Manga izquierda' : 'Manga derecha', 'manga', d);
  };
  const ruffle = zone('volante', 'Volante', 'otra', `M${r1(-q)} ${r1(L)} L${r1(q)} ${r1(L)} L${r1(q * 1.16)} ${r1(L + vh)}${waves(q * 1.16, -q * 1.16, L + vh, 9, 9)} Z`);
  const details = (p: Piece): Details => [...[false, true].map(mirror => ({ d: shift(stroke(p, ['escote'], m, mirror), 0, 10), style: 'pespunte' as const })), ...gathers(-rx + 6, rx - 6, p.nodes[0].y + 10, 18, 10, 10), ...gathers(-q + 6, q - 6, L, 18, 16, 16)];
  return [
    view('frente', [ruffle, zone('delantero', 'Delantero', 'delantero', unfold(f, 'centro', m)), sleeve(-1, 1), sleeve(1, 2)], details(f), [], 'Escote'),
    view('espalda', [{ ...ruffle }, zone('espalda', 'Espalda', 'espalda', unfold(b, 'centro', m)), sleeve(-1, 1), sleeve(1, 2)], details(b), [], 'Escote')
  ];
}

function buttonTopFlat(): FlatView[] {
  const r = generateButtonTop(GIRL(), {}), f = piece(r, 'delantero'), b = piece(r, 'espalda'), m = scale(1, 1);
  const hem = (p: Piece, mirror: boolean) => ({ d: shift(stroke(p, ['bajo'], m, mirror), 0, -12), style: 'pespunte' as const });
  const bias = (p: Piece, ids: string[], mirror: boolean) => ({ d: stroke(p, ids, m, mirror), style: 'costura' as const });
  return [
    view('frente', [zone('delantero--2', 'Delantero izquierdo', 'delantero', outlineOf(f, mirrorX(m))), zone('delantero--1', 'Delantero derecho', 'delantero', outlineOf(f, m))],
      [hem(f, false), hem(f, true), bias(f, ['cuello'], false), bias(f, ['cuello'], true), bias(f, ['sisa-superior', 'sisa-inferior'], false), bias(f, ['sisa-superior', 'sisa-inferior'], true)],
      f.marks.filter(mk => mk.kind === 'boton').map(mk => ({ x: 0, y: r1(mk.at.y), r: 4 })), 'Hombro'),
    view('espalda', [zone('espalda', 'Espalda', 'espalda', unfold(b, 'centro', m))], [hem(b, false), hem(b, true), bias(b, ['cuello'], false), bias(b, ['cuello'], true)], [], 'Hombro')
  ];
}

/** Bombacho inside a set: the library's pants drawing, bound explicitly to the real legs. */
function bombachoFlat(short: boolean): FlatView[] {
  return buildFlat('bombacho', { family: 'pantalon', pants: { leg: short ? 'baggy' : 'jogger', length: short ? 'short' : 'largo', waist: 'elastica', pockets: 'ninguno' } }).views.filter(v => v.key === 'frente' || v.key === 'espalda');
}

function pixieFlat(lined: boolean): FlatView[] {
  const r = generatePixie(BABY(), { forro: lined ? 'si' : 'no' }), side = piece(r, 'lateral'), m = scale(1, 1);
  const tip = side.nodes[1], B = side.nodes[3], tw = 16, tl = 46;
  const tab = zone('barbiquejo', 'Lengüeta', 'otra', `M${r1(B.x - 4)} ${r1(B.y - tw)} L${r1(B.x - tl)} ${r1(B.y - tw + 4)} C${r1(B.x - tl - 10)} ${r1(B.y - tw + 6)} ${r1(B.x - tl - 10)} ${r1(B.y + 2)} ${r1(B.x - tl)} ${r1(B.y + 4)} L${r1(B.x - 4)} ${r1(B.y)} Z`);
  return [view('frente', [zone('lateral', 'Gorro', 'base', outlineOf(side, m)), tab], [{ d: shift(stroke(side, ['cara'], m), 7, 0), style: lined ? 'pespunte' : 'costura' }, { d: shift(stroke(side, ['cuello'], m), 0, -7), style: lined ? 'pespunte' : 'costura' }],
    [{ x: r1(tip.x - 4), y: r1(tip.y + 4), r: 16 }, { x: r1(B.x - tl + 4), y: r1(B.y - tw / 2 + 2), r: 4 }], 'Cara')];
}

function earflapFlat(ears: 'gato' | 'oso'): FlatView[] {
  const r = generateEarflap(BABY(), { orejas: ears }), side = piece(r, 'lateral'), ear = piece(r, 'oreja'), m = scale(1, 1);
  const mark = side.marks.find(mk => mk.id === 'oreja')!.at, box = cmdsBBox(pieceSeamCmds(ear)), ew = box.maxX - box.minX;
  const earZone = zone('oreja', 'Oreja', 'otra', svg(transformCmds(pieceSeamCmds(ear), scale(1, 1, mark.x - ew / 2, mark.y + 4))));
  return [view('frente', [zone('lateral', 'Gorro', 'base', outlineOf(side, m)), earZone], [{ d: shift(stroke(side, ['nuca', 'orejera', 'cara'], m), 0, -6), style: 'pespunte' }], [], 'Borde')];
}

function headbandFlat(): FlatView[] {
  const R = 150, t = 26, K = 1.1;
  const band = `M${-R} 0 C${-R} ${r1(-R * K)} ${R} ${r1(-R * K)} ${R} 0 L${R - t} 0 C${R - t} ${r1(-(R - t) * K)} ${-(R - t)} ${r1(-(R - t) * K)} ${-(R - t)} 0 Z`;
  const by = -R * K * .74;
  return [view('frente', [zone('banda', 'Banda', 'base', band), zone('lazo', 'Lazo', 'otra', bowShape(0, by, 130))], bowDetails(0, by, 130), [], 'Banda')];
}

// ----------------------------------------------------------- Segundo lote digitalizado
function culotteFlat(): FlatView[] {
  return buildFlat('culotte', { family: 'pantalon', pants: { leg: 'ancho', length: 'capri', waist: 'elastica', pockets: 'ninguno' } }).views.filter(v => v.key === 'frente' || v.key === 'espalda');
}

function ruffleBonnetFlat(kind: 'tela' | 'doble' | 'encaje'): FlatView[] {
  const r = generateRuffleBonnet(BABY(), { volante: kind }), side = piece(r, 'lateral'), m = scale(1, 1);
  const h = side.nodes[3].y, vw = kind === 'doble' ? 30 : 22;
  const frill = `M2 -6${Array.from({ length: 7 }, (_, i) => { const y0 = -6 + (h + 12) * i / 7, y1 = -6 + (h + 12) * (i + 1) / 7; return ` C${r1(-vw * 1.15)} ${r1(y0 + (y1 - y0) * .2)} ${r1(-vw * 1.15)} ${r1(y0 + (y1 - y0) * .8)} 2 ${r1(y1)}`; }).join('')} Z`;
  const tip = side.nodes[3], tab = zone('barbiquejo', 'Lengüeta', 'otra', `M${r1(tip.x + 2)} ${r1(tip.y - 14)} L${r1(tip.x - 40)} ${r1(tip.y - 10)} C${r1(tip.x - 50)} ${r1(tip.y - 8)} ${r1(tip.x - 50)} ${r1(tip.y + 2)} ${r1(tip.x - 40)} ${r1(tip.y + 4)} L${r1(tip.x + 2)} ${r1(tip.y)} Z`);
  const zones: Zone[] = [...(kind === 'encaje' ? [] : [zone('volante', 'Volante', 'otra', frill)]), zone('lateral', 'Bonete', 'base', outlineOf(side, m)), tab];
  const details: Details = [{ d: shift(stroke(side, ['central-a', 'central-b'], m), -8, 6), style: 'pespunte' }, { d: shift(stroke(side, ['cuello'], m), 0, -6), style: 'pespunte' },
    ...(kind === 'encaje' ? Array.from({ length: 9 }, (_, i) => ({ d: `M0 ${r1(i * h / 8)} C-14 ${r1(i * h / 8 - 6)} -18 ${r1(i * h / 8 + 6)} -4 ${r1(i * h / 8 + 10)}`, style: 'pliegue' as const })) : []),
    ...(kind === 'doble' ? [{ d: `M-6 -2${Array.from({ length: 7 }, (_, i) => { const y0 = -2 + (h + 4) * i / 7, y1 = -2 + (h + 4) * (i + 1) / 7; return ` C${r1(-vw * .7)} ${r1(y0 + (y1 - y0) * .2)} ${r1(-vw * .7)} ${r1(y0 + (y1 - y0) * .8)} -6 ${r1(y1)}`; }).join('')}`, style: 'costura' as const }] : [])];
  const appl = side.marks.find(mk => mk.id === 'aplique')!.at;
  return [view('frente', zones, details, [{ x: r1(appl.x), y: r1(appl.y), r: 9 }], 'Cara')];
}

function apronFlat(ruffles: boolean): FlatView[] {
  const r = generatePinaforeApron(TODDLER(), { volantes: ruffles ? 'si' : 'no', bolsillo: ruffles ? 'si' : 'no' }), a = piece(r, 'delantal');
  const n = (i: number) => a.nodes[i], yS = n(3).y, sx = n(3).x, nw = n(8).x, Wq = n(2).x, Wb = n(1).x, Wf = n(5).x, yH = n(5).y, nf = n(7).y - yS, nb = yS - n(9).y, armD = n(4).y - yS;
  const half = (pts: [number, number][], sign: number) => pts.map(([x, y]) => `${r1(sign * x)} ${r1(y)}`);
  const frontPts: [number, number][] = [[nw, nf], [nw, 0], [sx, 0], [Wq, armD], [Wf, yH - yS], [0, yH - yS]];
  const backPts: [number, number][] = [[nw, nb], [nw, 0], [sx, 0], [Wq, armD], [Wb, yS], [0, yS]];
  const panel = (pts: [number, number][], top: number) => { const right = half(pts, 1), left = half([...pts].reverse(), -1); return `M0 ${r1(top)} L${right.join(' L')} L${left.join(' L')} L0 ${r1(top)} Z`; };
  const wings = (): Zone[] => ruffles ? [-1, 1].map((sign, i) => zone(`volante-hombro--${i + 1}`, 'Volante del hombro', 'manga', `M${r1(sign * (nw + 4))} -4 C${r1(sign * (sx + 30))} -16 ${r1(sign * (Wq + 34))} ${r1(armD * .3)} ${r1(sign * (Wq + 10))} ${r1(armD * .8)} C${r1(sign * (Wq - 4))} ${r1(armD * .55)} ${r1(sign * (sx + 6))} ${r1(armD * .2)} ${r1(sign * sx)} 0 Z`)) : [];
  const vh = ruffles ? piece(r, 'volante-bajo').nodes[2].y : 0, H = yH - yS;
  const front: Zone[] = [...(ruffles ? [zone('volante-bajo', 'Volante del bajo', 'otra', `M${r1(-Wf)} ${r1(H)} L${r1(Wf)} ${r1(H)} L${r1(Wf * 1.12)} ${r1(H + vh)}${waves(Wf * 1.12, -Wf * 1.12, H + vh, 9, 8)} Z`)] : []), zone('delantal', 'Delantero', 'delantero', panel(frontPts, nf)), ...wings()];
  if (ruffles) { const pk = piece(r, 'bolsillo'), line = a.lines.find(l => l.id === 'bolsillo')!; front.push(zone('bolsillo', 'Bolsillo', 'bolsillo', outlineOf(pk, scale(1, 1, line.a.x, line.a.y - yS)))); }
  const tieY = (a.marks.find(mk => mk.id === 'cinta-delantera')!.at.y) - yS, tieX = a.marks.find(mk => mk.id === 'cinta-delantera')!.at.x;
  const ties: Details = [-1, 1].flatMap(sign => [{ d: `M${r1(sign * tieX)} ${r1(tieY)} C${r1(sign * (tieX + 30))} ${r1(tieY - 10)} ${r1(sign * (tieX + 40))} ${r1(tieY + 20)} ${r1(sign * (tieX + 22))} ${r1(tieY + 50)}`, style: 'costura' as const }]);
  return [
    view('frente', front, [...ties, { d: `M${r1(-nw)} ${r1(nf)} L${r1(nw)} ${r1(nf)}`, style: 'costura' }], [], 'Hombro'),
    view('espalda', [zone('delantal', 'Espalda', 'espalda', panel(backPts, nb)), ...wings()], ties.map(t => ({ ...t, d: t.d })), [], 'Hombro')
  ];
}

function strapRomperFlat(form: 'pichi' | 'pico' | 'peto'): FlatView[] {
  const params: Record<string, string> = form === 'pichi' ? { forma: 'pichi', bolsillos: 'si' } : form === 'pico' ? { forma: 'pico', bajo: 'volante', lazos: 'si', bolsillos: 'no' } : { forma: 'peto', largo: 'largo', bajo: 'vuelta', bolsillos: 'si' };
  const r = generateStrapRomper(TODDLER(), { ...params, entrepierna: 'cerrada' }), f = piece(r, 'delantero'), b = piece(r, 'espalda'), m = scale(1, 1);
  const pair2 = (p: Piece, id: string, label: string, type: ZoneType): Zone[] => [zone(`${id}--1`, `${label} derecho`, type, outlineOf(p, mirrorX(m))), zone(`${id}--2`, `${label} izquierdo`, type, outlineOf(p, m))];
  const top = (p: Piece) => p.nodes[0];
  const strapZones = (p: Piece, cross: boolean): Zone[] => {
    if (form === 'pico') return [];
    const tp = p.nodes[1], sw = 22, rise = 120;
    return [-1, 1].map((sign, i) => { const x0 = sign * (tp.x - 18), x1 = cross ? -sign * (tp.x * .2) : sign * (tp.x - 22); return zone(`tirante--${i + 1}`, 'Tirante', 'otra', `M${r1(x0 - sw / 2)} ${r1(tp.y + 4)} L${r1(x0 + sw / 2)} ${r1(tp.y + 4)} L${r1(x1 + sw / 2)} ${r1(tp.y - rise)} L${r1(x1 - sw / 2)} ${r1(tp.y - rise)} Z`); });
  };
  const legs = (p: Piece) => { const e = p.edges.find(x => x.id === 'bajo')!, a = nodeById(p, e.from), z = nodeById(p, e.to); return { a, z }; };
  const frontZones: Zone[] = [];
  if (form === 'pico') {
    const { a, z } = legs(f), vb = piece(r, 'volante').nodes[2].y;
    for (const [i, sign] of [-1, 1].entries()) frontZones.push(zone(`volante--${i + 1}`, 'Volante', 'otra', `M${r1(sign * a.x)} ${r1(a.y)} L${r1(sign * z.x)} ${r1(z.y)} L${r1(sign * (z.x - 8))} ${r1(z.y + vb)}${waves(sign * (z.x - 8), sign * (a.x + 8), a.y + vb, 4, 6)} Z`));
    const sp = f.nodes[1];
    for (const [i, sign] of [-1, 1].entries()) frontZones.push(zone(`lazo--${i + 1}`, 'Lazo', 'otra', bowShape(sign * (sp.x + 14), sp.y + 4, 46)));
  }
  frontZones.unshift(...pair2(f, 'delantero', 'Delantero', 'delantero'));
  frontZones.push(...strapZones(f, false));
  const lines = f.lines.find(l => l.id === 'bolsillo');
  if (lines && form === 'pichi') { const pk = piece(r, 'bolsillo'); frontZones.push(zone('bolsillo--1', 'Bolsillo', 'bolsillo', outlineOf(pk, mirrorX(scale(1, 1, lines.a.x, lines.a.y)))), zone('bolsillo--2', 'Bolsillo', 'bolsillo', outlineOf(pk, scale(1, 1, lines.a.x, lines.a.y)))); }
  if (lines && form === 'peto') { const pk = piece(r, 'bolsillo'), w = pk.nodes[1].x; frontZones.push(zone('bolsillo', 'Bolsillo del peto', 'bolsillo', outlineOf(pk, scale(1, 1, -w / 2, lines.a.y)))); }
  const backZones: Zone[] = [...pair2(b, 'espalda', 'Espalda', 'espalda'), ...strapZones(b, form === 'peto')];
  if (form === 'pico') { const { a, z } = legs(b), vb = piece(r, 'volante').nodes[2].y; for (const [i, sign] of [-1, 1].entries()) backZones.push(zone(`volante--${i + 1}`, 'Volante', 'otra', `M${r1(sign * a.x)} ${r1(a.y)} L${r1(sign * z.x)} ${r1(z.y)} L${r1(sign * (z.x - 8))} ${r1(z.y + vb)}${waves(sign * (z.x - 8), sign * (a.x + 8), a.y + vb, 4, 6)} Z`)); }
  const dots = (p: Piece) => p.marks.filter(mk => mk.kind === 'boton').flatMap(mk => [-1, 1].map(sign => ({ x: r1(sign * mk.at.x), y: r1(mk.at.y), r: 5 })));
  const turn = (p: Piece): Details => { const l = p.lines.find(x => x.id === 'vuelta'); return l ? [-1, 1].map(sign => ({ d: `M${r1(sign * l.a.x)} ${r1(l.a.y)} L${r1(sign * l.b.x)} ${r1(l.b.y)}`, style: 'doblez' as const })) : []; };
  void top;
  return [view('frente', frontZones, [{ d: `M0 ${r1(f.nodes[0].y)} L0 ${r1(f.nodes[f.nodes.length - 1].y)}`, style: 'pespunte' }, ...turn(f)], dots(f), 'Canto superior'),
    view('espalda', backZones, [{ d: `M0 ${r1(b.nodes[0].y)} L0 ${r1(b.nodes[b.nodes.length - 1].y)}`, style: 'pespunte' }, ...turn(b)], dots(b), 'Canto superior')];
}

function trapezeTopFlat(ruffle: boolean): FlatView[] {
  const r = generateTrapezeTop(GIRL(), { volanteBajo: ruffle ? 'si' : 'no' }), f = piece(r, 'delantero'), b = piece(r, 'espalda'), m = scale(1, 1);
  const q = f.nodes[4].x, H = f.nodes[6].y, hemX = f.nodes[5].x, vh = ruffle ? piece(r, 'volante-bajo').nodes[2].y : 0;
  const ruffleZone = (): Zone[] => ruffle ? [zone('volante-bajo', 'Volante', 'otra', `M${r1(-hemX)} ${r1(f.nodes[5].y)} Q0 ${r1(H + 4)} ${r1(hemX)} ${r1(f.nodes[5].y)} L${r1(hemX * 1.1)} ${r1(H + vh)}${waves(hemX * 1.1, -hemX * 1.1, H + vh, 9, 7)} Z`)] : [];
  const bias = (p: Piece, ids: string[]) => [false, true].map(mirror => ({ d: stroke(p, ids, m, mirror), style: 'costura' as const }));
  const hemD: Details = ruffle ? gathers(-hemX + 6, hemX - 6, H - 2, 14, 12, 16) : [false, true].map(mirror => ({ d: shift(stroke(f, ['bajo'], m, mirror), 0, -12), style: 'pespunte' as const }));
  void q;
  return [
    view('frente', [...ruffleZone(), zone('delantero', 'Delantero', 'delantero', unfold(f, 'centro', m))], [...bias(f, ['cuello']), ...bias(f, ['sisa-superior', 'sisa-inferior']), ...hemD], [], 'Hombro'),
    view('espalda', [...ruffleZone(), zone('espalda--1', 'Espalda izquierda', 'espalda', outlineOf(b, mirrorX(m))), zone('espalda--2', 'Espalda derecha', 'espalda', outlineOf(b, m))], [...bias(b, ['cuello']), ...hemD], [{ x: 0, y: r1(b.nodes[0].y + 9), r: 4 }], 'Hombro')
  ];
}

// ----------------------------------------------------------- Tercer lote (adulto)
const WOMAN = (): GeneratorContext => ({ ...ctx('ref-mujer-busto', 'M92', 'mujer'), fabric: 'punto', stretch: 30 });
const transformed = (p: Pt, m: Mat) => P(m[0] * p.x + m[2] * p.y + m[4], m[1] * p.x + m[3] * p.y + m[5]);

function halfZipFlat(blocks: boolean): FlatView[] {
  const r = generateHalfZip(WOMAN(), { bloques: blocks ? 'si' : 'no' }), m = scale(1, 1);
  const views = (back: boolean) => {
    const id = back ? 'espalda' : 'delantero', up = piece(r, blocks ? `${id}-superior` : id), low = blocks ? piece(r, `${id}-inferior`) : undefined;
    const su = piece(r, 'manga'), sl = blocks ? piece(r, 'manga-inferior') : undefined, SP = up.nodes[2], phi = .32;
    const M: Mat = [Math.cos(phi), -Math.sin(phi), Math.sin(phi), Math.cos(phi), SP.x - 6, SP.y + 4];
    const sleeves: Zone[] = [];
    for (const [i, mm] of [mirrorX(M), M].entries()) {
      sleeves.push(zone(`manga--${i + 1}`, 'Manga', 'manga', outlineOf(su, mm)));
      if (sl) sleeves.push(zone(`manga-inferior--${i + 1}`, 'Manga (bloque inferior)', 'manga', outlineOf(sl, mm)));
    }
    const nw = up.nodes[1].x, ch = piece(r, 'cuello').nodes[2].y, depth = up.nodes[0].y;
    const collar = zone('cuello', 'Cuello alto', 'cuello', `M${r1(-nw)} 0 L${r1(-nw * .9)} ${r1(-ch)} L${r1(nw * .9)} ${r1(-ch)} L${r1(nw)} 0 Q0 ${r1(depth * .7)} ${r1(-nw)} 0 Z`);
    const body = [zone(up.id, back ? 'Espalda (bloque superior)' : 'Delantero (bloque superior)', back ? 'espalda' : 'delantero', unfold(up, 'centro', m)), ...(low ? [zone(low.id, 'Bloque inferior', back ? 'espalda' : 'delantero', unfold(low, 'centro', m))] : [])];
    const zip = back ? [] : [{ d: `M0 ${r1(-ch)} L0 ${r1(up.lines.find(l => l.id === 'abertura')!.b.y)}`, style: 'costura' as const }];
    const cuffs: Details = [su, ...(sl ? [sl] : [])].slice(-1).flatMap(pc => [mirrorX(M), M].map(mm => { const n = pc.nodes, a = transformed(n[n.length === 4 ? 1 : 2], mm), b = transformed(n[n.length === 4 ? 2 : 3], mm); return { d: `M${r1(a.x)} ${r1(a.y - 30)} L${r1(b.x)} ${r1(b.y - 30)}`, style: 'pliegue' as const }; }));
    return view(back ? 'espalda' : 'frente', [...sleeves, ...body, collar], [...zip, ...cuffs], [], 'Hombro');
  };
  return [views(false), views(true)];
}

/** Rigid transform taking the sleeve's raglan (Us→Rs) onto the body's raglan (UA→R), sleeve hanging outward. */
function alignRaglan(sleeve: Piece, body: Piece): Mat {
  const a0 = sleeve.nodes[3], a1 = sleeve.nodes[4], b0 = body.nodes[2], b1 = body.nodes[1];
  let best: Mat = [1, 0, 0, 1, 0, 0];
  for (const flip of [false, true]) {
    const A1 = P(a1.x - a0.x, flip ? -(a1.y - a0.y) : a1.y - a0.y), th = Math.atan2(b1.y - b0.y, b1.x - b0.x) - Math.atan2(A1.y, A1.x), c = Math.cos(th), sn = Math.sin(th);
    const lin: Mat = flip ? [c, sn, sn, -c, 0, 0] : [c, sn, -sn, c, 0, 0], t = transformed(a0, lin), M: Mat = [lin[0], lin[1], lin[2], lin[3], b0.x - t.x, b0.y - t.y];
    if (transformed(sleeve.nodes[1], M).x > b0.x) best = M;
  }
  return best;
}

function raglanFlat(): FlatView[] {
  const r = generateRaglanJacket(ctx('ref-mujer-busto', 'M92', 'mujer'), {}), m = scale(1, 1);
  const col = piece(r, 'cuello'), band = piece(r, 'banda'), cuffH = piece(r, 'puno').nodes[2].y / 2, ch = col.nodes[2].y, bh = band.nodes[2].y / 2;
  const views = (back: boolean) => {
    const body = piece(r, back ? 'espalda' : 'delantero'), sl = piece(r, back ? 'manga-trasera' : 'manga-delantera'), M = alignRaglan(sl, body);
    const q = body.nodes[3].x, L = body.nodes[3].y, top = transformed(sl.nodes[0], M), u = (() => { const w = sl.nodes[1], d = Math.hypot(w.x, w.y); return P(w.x / d, w.y / d); })();
    const cuff = (mm: Mat) => { const a = sl.nodes[1], b = sl.nodes[2], pts = [a, b, P(b.x + u.x * cuffH, b.y + u.y * cuffH), P(a.x + u.x * cuffH, a.y + u.y * cuffH)].map(x => transformed(x, mm)); return `M${pts.map(x => `${r1(x.x)} ${r1(x.y)}`).join(' L')} Z`; };
    const zones: Zone[] = [
      zone(`${sl.id}--1`, 'Manga izquierda', 'manga', outlineOf(sl, mirrorX(M))), zone(`${sl.id}--2`, 'Manga derecha', 'manga', outlineOf(sl, M)),
      zone('puno--1', 'Puño izquierdo', 'puno', cuff(mirrorX(M))), zone('puno--2', 'Puño derecho', 'puno', cuff(M)),
      ...(back ? [zone('espalda', 'Espalda', 'espalda', unfold(body, 'centro', m))] : [zone('delantero--1', 'Delantero izquierdo', 'delantero', outlineOf(body, mirrorX(m))), zone('delantero--2', 'Delantero derecho', 'delantero', outlineOf(body, m))]),
      zone('cuello', 'Cuello alto', 'cuello', `M${r1(-top.x)} ${r1(top.y)} L${r1(-top.x * .92)} ${r1(top.y - ch)} L${r1(top.x * .92)} ${r1(top.y - ch)} L${r1(top.x)} ${r1(top.y)} Q0 ${r1(body.nodes[0].y * .8)} ${r1(-top.x)} ${r1(top.y)} Z`),
      zone('banda', 'Banda del bajo', 'pretina', `M${r1(-q)} ${r1(L)} L${r1(q)} ${r1(L)} L${r1(q * .97)} ${r1(L + bh)} L${r1(-q * .97)} ${r1(L + bh)} Z`)
    ];
    const details: Details = [...(back ? [] : [{ d: `M0 ${r1(top.y - ch)} L0 ${r1(L + bh)}`, style: 'costura' as const }]), ...Array.from({ length: 12 }, (_, i) => ({ d: `M${r1(-q + (i + .5) * 2 * q / 12)} ${r1(L + 4)} L${r1(-q + (i + .5) * 2 * q / 12)} ${r1(L + bh - 4)}`, style: 'pliegue' as const })),
      ...(back ? [] : [-1, 1].map(sign => { const l = body.lines.find(x => x.id === 'bolsillo'); return l ? { d: `M${r1(sign * l.a.x)} ${r1(l.a.y)} L${r1(sign * l.b.x)} ${r1(l.b.y)}`, style: 'costura' as const } : { d: 'M0 0', style: 'pliegue' as const }; }))];
    return view(back ? 'espalda' : 'frente', zones, details, [], 'Hombro');
  };
  return [views(false), views(true)];
}

function batwingFlat(): FlatView[] {
  const r = generateBatwing(WOMAN(), {}), m = scale(1, 1), lat = piece(r, 'lateral'), hood = piece(r, 'capucha'), band = piece(r, 'banda');
  const NP = lat.nodes[0], WO = lat.nodes[1], WU = lat.nodes[2], q = lat.nodes[4].x, L = lat.nodes[4].y, bh = band.nodes[2].y / 2, cuffH = piece(r, 'puno').nodes[2].y / 2;
  const u = (() => { const d = Math.hypot(WO.x - NP.x, WO.y - NP.y); return P((WO.x - NP.x) / d, (WO.y - NP.y) / d); })();
  const cuff = (sign: number) => { const pts = [WO, WU, P(WU.x + u.x * cuffH, WU.y + u.y * cuffH), P(WO.x + u.x * cuffH, WO.y + u.y * cuffH)]; return `M${pts.map(x => `${r1(sign * x.x)} ${r1(x.y)}`).join(' L')} Z`; };
  const Hh = hood.nodes[0].y * .62, nw = NP.x;
  const views = (back: boolean) => {
    const centre = piece(r, back ? 'centro-espalda' : 'centro-delantero');
    const hoodZone = back
      ? zone('capucha', 'Capucha', 'capucha', `M${r1(-nw * 1.15)} 6 C${r1(-nw * 1.5)} ${r1(-Hh * .6)} ${r1(-nw * .8)} ${r1(-Hh)} 0 ${r1(-Hh)} C${r1(nw * .8)} ${r1(-Hh)} ${r1(nw * 1.5)} ${r1(-Hh * .6)} ${r1(nw * 1.15)} 6 Q0 ${r1(Hh * .25)} ${r1(-nw * 1.15)} 6 Z`)
      : zone('capucha', 'Capucha', 'capucha', `M${r1(-nw * 1.1)} 4 C${r1(-nw * 1.45)} ${r1(-Hh * .6)} ${r1(-nw * .8)} ${r1(-Hh)} 0 ${r1(-Hh)} C${r1(nw * .8)} ${r1(-Hh)} ${r1(nw * 1.45)} ${r1(-Hh * .6)} ${r1(nw * 1.1)} 4 L${r1(nw * .55)} 4 C${r1(nw * .75)} ${r1(-Hh * .45)} ${r1(nw * .45)} ${r1(-Hh * .78)} 0 ${r1(-Hh * .78)} C${r1(-nw * .45)} ${r1(-Hh * .78)} ${r1(-nw * .75)} ${r1(-Hh * .45)} ${r1(-nw * .55)} 4 Z`);
    const zones: Zone[] = [hoodZone, zone('lateral--1', 'Lateral izquierdo', back ? 'espalda' : 'delantero', outlineOf(lat, mirrorX(m))), zone('lateral--2', 'Lateral derecho', back ? 'espalda' : 'delantero', outlineOf(lat, m)),
      zone(centre.id, back ? 'Panel central de espalda' : 'Panel central delantero', back ? 'espalda' : 'delantero', unfold(centre, 'centro', m)),
      zone('puno--1', 'Puño izquierdo', 'puno', cuff(-1)), zone('puno--2', 'Puño derecho', 'puno', cuff(1)),
      zone('banda', 'Banda del bajo', 'pretina', `M${r1(-q)} ${r1(L)} L${r1(q)} ${r1(L)} L${r1(q * .95)} ${r1(L + bh)} L${r1(-q * .95)} ${r1(L + bh)} Z`)];
    const details: Details = back ? [] : [{ d: `M-14 ${r1(L + bh * .5)} L-20 ${r1(L + bh + 70)} M14 ${r1(L + bh * .5)} L20 ${r1(L + bh + 70)}`, style: 'costura' }];
    return view(back ? 'espalda' : 'frente', zones, details, [], 'Hombro');
  };
  return [views(false), views(true)];
}

const BUILDERS: Record<string, () => FlatView[]> = {
  'peto-corto': () => overallFlat(false), 'peto-largo': () => overallFlat(true), 'gorro-oso': () => earHatFlat('oso'), 'gorro-gato': () => earHatFlat('gato'), 'gorro-conejo': () => earHatFlat('conejo'),
  'conjunto-verano': () => setFlat('verano'), 'conjunto-invierno': () => setFlat('invierno'), 'conjunto-recien-nacido': () => setFlat('recien-nacido'),
  'conjunto-vestido': () => setFlat('vestido'), 'conjunto-pelele-diadema': () => setFlat('pelele-diadema'), 'conjunto-campesino': () => setFlat('campesino'), 'conjunto-rayas': () => setFlat('rayas'),
  'vestido-jareta': casingDressFlat, 'pelele-volantes': romperFlat, 'blusa-campesina': () => peasantFlat(false), 'blusa-campesina-larga': () => peasantFlat(true), 'blusa-botones': buttonTopFlat,
  'gorro-duende': () => pixieFlat(true), 'gorro-duende-fieltro': () => pixieFlat(false),
  'bonete-volante': () => ruffleBonnetFlat('tela'), 'bonete-volante-doble': () => ruffleBonnetFlat('doble'), 'bonete-encaje': () => ruffleBonnetFlat('encaje'),
  'delantal-pichi': () => apronFlat(true), 'delantal-pichi-liso': () => apronFlat(false), 'mono-pichi': () => strapRomperFlat('pichi'), 'mono-pico': () => strapRomperFlat('pico'), 'peto-infantil': () => strapRomperFlat('peto'),
  'sudadera-bloques': () => halfZipFlat(true), 'sudadera-media-cremallera': () => halfZipFlat(false), 'chaqueta-ranglan': raglanFlat, 'buzo-murcielago': batwingFlat,
  'blusa-trapecio': () => trapezeTopFlat(false), 'blusa-trapecio-volante': () => trapezeTopFlat(true), 'conjunto-trapecio': () => setFlat('trapecio'), 'conjunto-vichy': () => setFlat('vichy'), 'gorro-orejeras-gato': () => earflapFlat('gato'), 'gorro-orejeras-oso': () => earflapFlat('oso'), diadema: headbandFlat,
  'vestido-trapecio': () => trapezeFlat(false), 'vestido-trapecio-volante': () => trapezeFlat(true), 'vestido-tirantes': sundressFlat,
  'falda-tul': tulleFlat, 'falda-olanes': tieredFlat, 'falda-circular': () => circleFlat(true), 'falda-medio-circulo': () => circleFlat(false),
  cubrepanal: () => bloomerFlat(false), 'cubrepanal-olanes': () => bloomerFlat(true), 'cubrepanal-tirantes': () => bloomerFlat(false, true), 'sombrero-lazo': bowBucketFlat, 'saco-dormir': sleepSackFlat,
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
