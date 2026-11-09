import type { FlatDef, FlatView, FlatViewKey } from './flats';
import type { Zone, ZoneType } from '../features/studio/model';
import { cmdsBBox, cmdsToSvg, pieceSeamCmds, transformCmds, type PathCmd } from '../lib/draw/paths';
import { parseSvgPath } from '../lib/draw/svgpath';
import type { Mat, Pt } from '../lib/geom/vec';
import type { GeneratorResult, Params } from '../lib/pattern/generator';
import type { Piece } from '../lib/pattern/types';
import { nodeById } from '../lib/pattern/outline';
import { BAG_GENERATORS } from '../lib/pattern/generators/bags';

/* Dibujos técnicos de los bolsos y mochilas (2026-11-09). Las siluetas salen
 * de las piezas reales con sus medidas por defecto, y los bolsillos de sus
 * líneas de colocación; cada zona editable remite a su pieza física mediante
 * BAG_SURFACE_PIECES. */

export interface BagSurface { zoneId: string; pieceId: string; mirror: boolean; fold?: boolean }
const S = (zoneId: string, pieceId = zoneId, mirror = false): BagSurface => ({ zoneId, pieceId, mirror });
const pair = (id: string): BagSurface[] => [S(`${id}--1`, id, true), S(`${id}--2`, id)];

/** Explicit zone → physical piece bindings, by generator. */
export const BAG_SURFACE_PIECES: Record<string, Partial<Record<FlatViewKey, BagSurface[]>>> = {
  'funda-portatil-cremallera': { frente: [S('cuerpo'), S('bolsillo-exterior'), S('lengueta')], espalda: [S('cuerpo')] },
  'bolsa-u-bolsillo': { frente: [S('cuerpo'), S('bolsillo'), S('asa')], espalda: [S('cuerpo'), S('asa')] },
  'bolsa-asas-laterales': { frente: [S('cuerpo')], espalda: [S('cuerpo')] },
  'bolsa-estrella': { frente: [S('cuerpo'), S('bolsillo')], espalda: [S('cuerpo')] },
  'tote-bolsillos': { frente: [S('cuerpo'), S('bolsillo-frente')], espalda: [S('cuerpo'), S('bolsillo-frente')] },
  'mochila-solapa': { frente: [S('cuerpo'), S('solapa'), S('bolsillo'), S('solapa-bolsillo')], espalda: [S('cuerpo'), ...pair('tirante'), S('asa')] },
  'mochila-osito': { frente: [S('delantero'), S('bolsillo'), ...pair('oreja')], espalda: [S('espalda'), ...pair('tirante'), S('asa')] },
  'rinonera-organizador': { frente: [S('cuerpo'), S('bolsillo-grande'), S('bolsillo-tijeras'), ...pair('cinturon')], espalda: [S('cuerpo'), ...pair('cinturon')] }
};

type Details = FlatView['details'];
const P = (x: number, y: number): Pt => ({ x, y });
const zone = (id: string, label: string, type: ZoneType, d: string): Zone => ({ id, label, type, d });
const T = (dx = 0, dy = 0, sx = 1): Mat => [sx, 0, 0, 1, dx, dy];
const svg = (cmds: PathCmd[]) => cmdsToSvg(cmds);
const outlineOf = (p: Piece, m: Mat = T()) => svg(transformCmds(pieceSeamCmds(p), m));
const poly = (pts: Pt[], closed = true) => svg([{ op: 'M', p: pts[0] }, ...pts.slice(1).map(p => ({ op: 'L' as const, p })), ...(closed ? [{ op: 'Z' as const }] : [])]);
const rectD = (x: number, y: number, w: number, h: number) => poly([P(x, y), P(x + w, y), P(x + w, y + h), P(x, y + h)]);
const gen = (id: string, p: Params = {}): GeneratorResult => { const g = BAG_GENERATORS.find(x => x.id === id)!; return g.generate({ body: {}, kind: 'mujer', fabric: 'plano', stretch: 0, fit: 'regular' } as never, { ...g.defaults({} as never), ...p }); };
const piece = (r: GeneratorResult, id: string) => r.pieces.find(p => p.id === id)!;
/** Outline drawn by a group of placement or stitch lines (`prefix-0`, `prefix-1`…). */
function linesPath(p: Piece, prefix: string, m: Mat = T(), closed = true): string {
  const ls = p.lines.filter(l => l.id.startsWith(`${prefix}-`) && /-\d+$/.test(l.id) && l.id.slice(prefix.length + 1).match(/^\d+$/));
  if (!ls.length) return '';
  const pts = [ls[0].a, ...ls.map(l => l.b)];
  return svg(transformCmds([{ op: 'M', p: pts[0] }, ...pts.slice(1, closed ? -1 : undefined).map(q => ({ op: 'L' as const, p: q })), ...(closed ? [{ op: 'Z' as const }] : [])], m));
}
/** Every line of a kind (quilting, stitching) as detail strokes. */
const lineDetails = (p: Piece, test: (id: string) => boolean, m: Mat = T(), style: Details[number]['style'] = 'pespunte'): Details =>
  p.lines.filter(l => test(l.id)).map(l => ({ d: svg(transformCmds([{ op: 'M', p: l.a }, { op: 'L', p: l.b }], m)), style }));
/** Open stroke along some edges of a piece. */
function edgesPath(p: Piece, ids: string[], m: Mat = T()): string {
  const cmds: PathCmd[] = [];
  ids.forEach((id, i) => { const e = p.edges.find(x => x.id === id)!, a = nodeById(p, e.from), b = nodeById(p, e.to); if (!i) cmds.push({ op: 'M', p: P(a.x, a.y) }); cmds.push(e.kind === 'cubic' ? { op: 'C', c1: e.c1!, c2: e.c2!, p: P(b.x, b.y) } : { op: 'L', p: P(b.x, b.y) }); });
  return svg(transformCmds(cmds, m));
}
const runEdges = (p: Piece, run: string) => p.edges.filter(e => e.id === run || new RegExp(`^${run}-\\d+$`).test(e.id)).map(e => e.id);
function view(key: FlatViewKey, zones: Zone[], details: Details, refLabel: string): FlatView {
  const boxes = [...zones, ...details].filter(i => i.d).map(item => cmdsBBox(parseSvgPath(item.d)));
  const minX = Math.min(...boxes.map(b => b.minX)), minY = Math.min(...boxes.map(b => b.minY)), maxX = Math.max(...boxes.map(b => b.maxX)), maxY = Math.max(...boxes.map(b => b.maxY));
  const pad = Math.max(maxX - minX, maxY - minY) * 0.05;
  return { key, zones: zones.filter(z => z.d), details: details.filter(d => d.d), dots: [], refY: 0, refLabel, seams: { center: (minX + maxX) / 2 }, minX: minX - pad, minY: minY - pad, width: maxX - minX + 2 * pad, height: maxY - minY + 2 * pad };
}
const handleArc = (x0: number, x1: number, y: number, h: number, w: number) => {
  const xm = (x0 + x1) / 2;
  return `M${x0 - w / 2} ${y} C${x0 - w / 2} ${y - h} ${x1 + w / 2} ${y - h} ${x1 + w / 2} ${y} L${x1 - w / 2} ${y} C${x1 - w / 2} ${y - h + w} ${x0 + w / 2} ${y - h + w} ${x0 + w / 2} ${y} Z`.replace(/NaN/g, String(xm));
};

// ------------------------------------------------------------------ Views
function laptop(): FlatView[] {
  const r = gen('funda-portatil-cremallera'), body = piece(r, 'cuerpo'), quilt = lineDetails(body, id => id.startsWith('acolchado'));
  const zip = edgesPath(body, runEdges(body, 'cremallera')), xs = body.nodes.map(n => n.x), ys = body.nodes.map(n => n.y), W = Math.max(...xs), H = Math.max(...ys);
  const tab = zone('lengueta', 'Lengüeta de la cremallera', 'otra', rectD(W - 4, H * 0.66, 24, 40));
  const front = view('frente', [zone('cuerpo', 'Delantero acolchado', 'delantero', outlineOf(body)), zone('bolsillo-exterior', 'Bolsillo exterior', 'bolsillo', linesPath(body, 'bolsillo-exterior')), tab], [...quilt, { d: zip, style: 'costura' }], 'Cremallera');
  const back = view('espalda', [zone('cuerpo', 'Trasero acolchado', 'espalda', outlineOf(body))], [...quilt, { d: zip, style: 'costura' }], 'Cremallera');
  return [front, back];
}
function uTote(): FlatView[] {
  const p = { ancho: 380, alto: 400 }, r = gen('bolsa-u-bolsillo', p), body = piece(r, 'cuerpo'), pocket = piece(r, 'bolsillo');
  const W = p.ancho, H = p.alto, pw = 0.44 * W, x0 = (W - pw) / 2, y0 = 0.3 * H, hx = [W / 2 - 0.2 * W, W / 2 + 0.2 * W];
  const asa = zone('asa', 'Asas', 'otra', handleArc(hx[0], hx[1], 0, 0.55 * H, 30));
  const emb = lineDetails(pocket, id => id.startsWith('tallo') || id.startsWith('flor'), T(x0, y0));
  const top: Details = [{ d: `M0 14 L${W} 14`, style: 'pespunte' }];
  return [
    view('frente', [asa, zone('cuerpo', 'Delantero', 'delantero', outlineOf(body)), zone('bolsillo', 'Bolsillo bordado', 'bolsillo', outlineOf(pocket, T(x0, y0)))], [...top, ...emb], 'Boca'),
    view('espalda', [asa, zone('cuerpo', 'Espalda', 'espalda', outlineOf(body))], top, 'Boca')
  ];
}
function earBag(): FlatView[] {
  const r = gen('bolsa-asas-laterales'), body = piece(r, 'cuerpo'), mouth = edgesPath(body, runEdges(body, 'boca'), T(0, 8));
  return [view('frente', [zone('cuerpo', 'Delantero con asas', 'delantero', outlineOf(body))], [{ d: mouth, style: 'pespunte' }], 'Asas'), view('espalda', [zone('cuerpo', 'Espalda con asas', 'espalda', outlineOf(body))], [{ d: mouth, style: 'pespunte' }], 'Asas')];
}
function star(): FlatView[] {
  const r = gen('bolsa-estrella', { corte: 'entera' }), body = piece(r, 'cuerpo'), hole = lineDetails(body, id => id.startsWith('asa-costura'), T(), 'costura');
  const pocket = zone('bolsillo', 'Bolsillo exterior', 'bolsillo', linesPath(body, 'bolsillo'));
  return [view('frente', [zone('cuerpo', 'Delantero estrella', 'delantero', outlineOf(body)), pocket], hole, 'Asa calada'), view('espalda', [zone('cuerpo', 'Espalda estrella', 'espalda', outlineOf(body))], hole, 'Asa calada')];
}
function pocketTote(): FlatView[] {
  const p = { ancho: 400, alto: 250, altoBolsillo: 170, largoAsa: 300 }, r = gen('tote-bolsillos', p), body = piece(r, 'cuerpo'), W = p.ancho, H = p.alto, hp = p.altoBolsillo;
  const xs = [W / 2 - 0.25 * W, W / 2 + 0.25 * W], web = 30;
  const loops = zone('cinta', 'Cintas de las asas', 'otra', `${handleArc(xs[0], xs[1], 20, 260, web)} ${rectD(xs[0] - web / 2, 20, web, H - 20)} ${rectD(xs[1] - web / 2, 20, web, H - 20)}`);
  const details: Details = [{ d: `M0 ${H - hp + 6} L${W} ${H - hp + 6}`, style: 'pespunte' }, ...xs.map(x => ({ d: `M${x - 12} 26 L${x + 12} 50 M${x + 12} 26 L${x - 12} 50`, style: 'pespunte' as const }))];
  const mk = (key: FlatViewKey, type: ZoneType) => view(key, [zone('cuerpo', key === 'frente' ? 'Delantero' : 'Espalda', type, outlineOf(body)), zone('bolsillo-frente', 'Bolsillo de tres compartimentos', 'bolsillo', rectD(0, H - hp, W, hp)), loops], details, 'Boca');
  return [mk('frente', 'delantero'), mk('espalda', 'espalda')];
}
function flapPack(): FlatView[] {
  const p = { ancho: 320, alto: 450 }, r = gen('mochila-solapa', p), body = piece(r, 'cuerpo'), flap = piece(r, 'solapa'), W = p.ancho, H = p.alto;
  const pw = 0.72 * W, ph = 0.36 * H, px = (W - pw) / 2, py = H - ph - 40;
  const pflap = piece(r, 'solapa-bolsillo');
  const buckles = [rectD(W / 2 - 14, 0.6 * W - 110, 28, 110), rectD(px + 0.25 * pw - 12, py - 10, 24, 0.42 * ph + 40), rectD(px + 0.75 * pw - 12, py - 10, 24, 0.42 * ph + 40)].join(' ');
  const front = view('frente', [zone('cuerpo', 'Delantero', 'delantero', outlineOf(body)), zone('bolsillo', 'Bolsillo con fuelle', 'bolsillo', rectD(px, py, pw, ph)), zone('solapa-bolsillo', 'Solapa del bolsillo', 'otra', outlineOf(pflap, T(px - 5, py - 6))), zone('solapa', 'Solapa', 'otra', outlineOf(flap, T(0, -6))), zone('correa-hebilla', 'Correas con hebilla', 'otra', buckles)], [{ d: `M0 30 L${W} 30`, style: 'pespunte' }], 'Solapa');
  const straps = [P(0.28 * W, 0), P(0.72 * W, 0)].map((q, i) => zone(`tirante--${i + 1}`, 'Tirante', 'otra', `M${q.x - 35} ${q.y + 20} C${q.x - 40} ${H * 0.5} ${q.x + (i ? 40 : -40) - 30} ${H * 0.8} ${i ? W - 30 : 30} ${H - 30} L${i ? W - 2 : 2} ${H - 30} C${q.x + (i ? 40 : -40) + 30} ${H * 0.8} ${q.x + 40} ${H * 0.5} ${q.x + 35} ${q.y + 20} Z`));
  const back = view('espalda', [zone('cuerpo', 'Espalda', 'espalda', outlineOf(body)), ...straps, zone('asa', 'Asa de arriba', 'otra', handleArc(W / 2 - 40, W / 2 + 40, 0, 90, 22))], [], 'Tirantes');
  return [front, back];
}
function bearPack(): FlatView[] {
  const r = gen('mochila-osito'), front = piece(r, 'delantero'), back = piece(r, 'espalda'), ear = piece(r, 'oreja');
  const W = 240, rr = W / 2, ears = [-1, 1].map((sg, i) => { const cx = rr + sg * rr * Math.cos(Math.PI * 0.3), cy = rr - rr * Math.sin(Math.PI * 0.3) + 6; return zone(`oreja--${i + 1}`, 'Oreja', 'otra', outlineOf(ear, T(cx, cy))); });
  const zip = edgesPath(front, runEdges(front, 'cremallera'));
  const straps = [0.3, 0.7].map((f, i) => zone(`tirante--${i + 1}`, 'Tirante', 'otra', `M${f * W - 18} 30 C${f * W - 22} 140 ${i ? W - 10 : 10} 200 ${i ? W - 6 : 6} 236 L${i ? W - 30 : 30} 236 C${i ? W - 30 : 30} 200 ${f * W + 18} 140 ${f * W + 18} 30 Z`));
  return [
    view('frente', [...ears, zone('delantero', 'Delantero', 'delantero', outlineOf(front)), zone('bolsillo', 'Bolsillo', 'bolsillo', linesPath(front, 'bolsillo'))], [{ d: zip, style: 'costura' }], 'Cremallera'),
    view('espalda', [...ears, zone('espalda', 'Espalda', 'espalda', outlineOf(back)), ...straps, zone('asa', 'Asa', 'otra', handleArc(W / 2 - 25, W / 2 + 25, 4, 60, 16))], [{ d: zip, style: 'costura' }], 'Tirantes')
  ];
}
function hipBag(): FlatView[] {
  const r = gen('rinonera-organizador', { corte: 'entera' }), body = piece(r, 'cuerpo'), xs = body.nodes.map(n => n.x), x1 = Math.max(...xs), x0 = Math.min(...xs);
  const belts = [zone('cinturon--1', 'Cinturón', 'otra', rectD(x0 - 180, 8, 182, 28)), zone('cinturon--2', 'Cinturón', 'otra', rectD(x1 - 2, 8, 182, 28))];
  const zip = lineDetails(body, id => id.startsWith('cremallera-'), T(), 'costura');
  const front = view('frente', [...belts, zone('cuerpo', 'Cuerpo', 'delantero', outlineOf(body)), zone('bolsillo-grande', 'Bolsillo grande', 'bolsillo', linesPath(body, 'bolsillo-grande')), zone('bolsillo-tijeras', 'Bolsillo de tijeras', 'bolsillo', linesPath(body, 'bolsillo-tijeras'))], zip, 'Cinturón');
  const back = view('espalda', [...belts, zone('cuerpo', 'Espalda del cuerpo', 'espalda', outlineOf(body))], [], 'Cinturón');
  return [front, back];
}

const BUILDERS: Record<string, () => FlatView[]> = {
  'funda-portatil-cremallera': laptop, 'bolsa-u-bolsillo': uTote, 'bolsa-asas-laterales': earBag, 'bolsa-estrella': star,
  'tote-bolsillos': pocketTote, 'mochila-solapa': flapPack, 'mochila-osito': bearPack, 'rinonera-organizador': hipBag
};
export const BAG_FLAT_KEYS = Object.keys(BUILDERS);
const cache = new Map<string, FlatView[]>();
export function buildBagFlat(id: string, key: string): FlatDef {
  const builder = BUILDERS[key];
  if (!builder) return { id, views: [] };
  if (!cache.has(key)) cache.set(key, builder());
  return { id, views: cache.get(key)!.map(v => ({ ...v, zones: v.zones.map(z => ({ ...z })), details: v.details.map(d => ({ ...d })), dots: [] })) };
}
