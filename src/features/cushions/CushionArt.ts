import type { Pt } from '../../lib/geom/vec';
import type { GeneratorResult, Params } from '../../lib/pattern/generator';
import type { Piece } from '../../lib/pattern/types';
import { pieceSeamPath, seamPolygon } from '../../lib/pattern/outline';
import { circle, ellipse, rect, rrect, uni } from '../../lib/applique/shapes';
import { offsetPolygons } from '../../lib/geom/polyoffset';
import { polysPath } from '../../lib/applique/figure';
import type { PlushCard } from '../../data/toys';
import { P, embroidery, line, notchPoint, printOver, runPoints, shape, type Item } from '../toys/art';

/* Dibujos de los cojines, hechos con sus piezas reales en milímetros: lo que se
 * ve en la tarjeta es lo que sale en el patrón. */

type Colors = PlushCard['colors'];
const polyOf = (pc: Piece) => seamPolygon(pc, 0.5);
const mirrorX = (pts: Pt[]) => pts.map(q => P(-q.x, q.y)).reverse();
const centroid = (pts: Pt[]) => P(pts.reduce((s, q) => s + q.x, 0) / pts.length, pts.reduce((s, q) => s + q.y, 0) / pts.length);
/**
 * Transform that lays a piece's `run` (its sewn edge) on the segment a→b of a
 * face (a→b follows the outline, which runs clockwise), flipped so the piece
 * falls on the outer side of that edge (or the inner side for parts sewn on top).
 */
function attach(pc: Piece, run: string, a: Pt, b: Pt, want: 'out' | 'in' = 'out') {
  const [u0, u1] = runPoints(pc, run), tu = Math.atan2(u1.y - u0.y, u1.x - u0.x), tab = Math.atan2(b.y - a.y, b.x - a.x);
  const c = centroid(polyOf(pc)), dx = c.x - u0.x, dy = c.y - u0.y, side = dx * Math.sin(-tu) + dy * Math.cos(-tu);
  // In the a→b frame the outer side of a clockwise outline is negative y.
  const flip = want === 'out' ? side > 0 : side < 0;
  return `translate(${a.x} ${a.y}) rotate(${(tab * 180) / Math.PI}) ${flip ? 'scale(1 -1) ' : ''}rotate(${(-tu * 180) / Math.PI}) translate(${-u0.x} ${-u0.y})`;
}
/** A limb hanging from the middle of a→b, turned `deg` degrees (and mirrored for the left side). */
function hang(pc: Piece, run: string, a: Pt, b: Pt, deg = 0, mirror = false) {
  const [u0, u1] = runPoints(pc, run), m = P((u0.x + u1.x) / 2, (u0.y + u1.y) / 2);
  return `translate(${(a.x + b.x) / 2} ${(a.y + b.y) / 2}) rotate(${deg}) ${mirror ? 'scale(-1 1) ' : ''}translate(${-m.x} ${-m.y})`;
}
const notchPair = (pc: Piece, id: string) => [notchPoint(pc, `${id}-a`), notchPoint(pc, `${id}-b`)] as const;
const face = (pts: Pt[], c: Colors, step: number, fill = c.piel, extra: Partial<Item> = {}): Item[] => [{ d: polysPath([pts]), fill, ...extra }, ...printOver(pts, { ...c }, step)];

function pine(r: GeneratorResult, p: Params, c: Colors): Item[] {
  const half = polyOf(r.pieces.find(x => x.id === 'arbol')!), full = uni(half, mirrorX(half))[0];
  return [{ d: polysPath([full]), fill: c.piel, ...(p.vivo === 'si' ? { stroke: c.contraste, sw: 7 } : {}) }, shape(ellipse(-60, 230, 40, 120, 20), '#ffffff14', { stroke: 'none' })];
}
function seahorse(r: GeneratorResult, c: Colors): Item[] {
  const body = r.pieces.find(x => x.id === 'cuerpo')!, poly = polyOf(body), fin = r.pieces.find(x => x.id === 'aleta'), out: Item[] = [];
  const [a, b] = notchPair(body, 'aleta');
  if (fin && a && b) out.push({ d: pieceSeamPath(fin), fill: c.contraste, transform: attach(fin, 'union', a, b) });
  out.push({ d: polysPath([poly]), fill: c.piel }, ...embroidery(body, c.detalle, ''));
  for (const m of body.marks.filter(m => m.id.startsWith('lunar'))) out.push(shape(ellipse(m.at.x, m.at.y, 9, 6, 20), c.ropa2 ?? '#ffffff'));
  for (const l of body.lines.filter(l => l.id.startsWith('compartimento'))) out.push(line([l.a, l.b], '#00000026', 2));
  return out;
}
function pouf(r: GeneratorResult, c: Colors): Item[] {
  const end = r.pieces.find(x => x.id === 'testero')!, ear = r.pieces.find(x => x.id === 'oreja')!, front = polyOf(end), out: Item[] = [];
  const W = Math.max(...front.map(q => q.x)), dx = W * 0.5, dy = -W * 0.22;
  const loaf = uni(...Array.from({ length: 11 }, (_, i) => front.map(q => P(q.x + (dx * i) / 10, q.y + (dy * i) / 10))))[0];
  const ears = [0, 1].map(i => notchPair(end, `oreja-${i}`));
  for (const [a, b] of ears) if (a && b) out.push({ d: pieceSeamPath(ear), fill: c.piel, transform: attach(ear, 'union', a, b) });
  out.push(...face(loaf, c, 60, c.piel, { stroke: '#00000030' }), { d: polysPath([front]), fill: c.piel, stroke: '#00000033' }, ...printOver(front, c, 60), { d: polysPath([front]), fill: '#ffffff1a', stroke: 'none' });
  for (const [a, b] of ears) if (a && b) out.push({ d: pieceSeamPath(ear), fill: c.contraste, transform: `${attach(ear, 'union', a, b)} translate(${runPoints(ear, 'union')[0].x * 0.15} 20) scale(.85 .82)` });
  return out;
}
function beanBag(r: GeneratorResult, c: Colors): Item[] {
  const tear = r.pieces.find(x => x.id === 'gota')!, ear = r.pieces.find(x => x.id === 'oreja')!, poly = polyOf(tear), out: Item[] = [];
  const ys = poly.map(q => q.y), w = Math.max(...poly.map(q => q.x));
  out.push(shape(ellipse(0, Math.max(...ys) - 6, w * 1.15, w * 0.22), '#00000018', { stroke: 'none' }));
  const top = poly.reduce((m, q) => (q.y < m.y ? q : m), poly[0]), ew = Math.max(...ear.nodes.map(n => n.x));
  for (const s of [-1, 1]) { const at = P(top.x + s * ew * 0.55, top.y + ew * 0.6); out.push({ d: pieceSeamPath(ear), fill: c.piel, stroke: '#00000030', transform: hang(ear, 'union', at, at, s * 16, s < 0) }); }
  out.push(...face(poly, c, 50), shape(ellipse(0, Math.max(...ys) * 0.62, w * 0.55, w * 0.32), '#00000012', { stroke: 'none' }));
  return out;
}
function lounger(r: GeneratorResult, c: Colors): Item[] {
  const sq = r.pieces.find(x => x.id === 'cuadrado')!, head = r.pieces.find(x => x.id === 'cabecero')!, arm = r.pieces.find(x => x.id === 'brazo')!;
  const l = Math.max(...sq.nodes.map(n => n.x)), h = Math.max(...head.nodes.map(n => n.y)), g = l * 0.05, out: Item[] = [];
  const place = (pc: Piece, dx: number, dy: number, mirror = false) => { const pts = polyOf(pc).map(q => P((mirror ? l - q.x : q.x) + dx, q.y + dy)); out.push({ d: polysPath([pts]), fill: c.piel, stroke: '#00000030' }, ...printOver(pts, c, l / 7)); };
  place(arm, -l - g, 0, true); place(head, 0, 0); place(arm, l + g, 0); place(sq, 0, h + g); place(sq, 0, h + l + 2 * g);
  return out;
}
function duck(r: GeneratorResult, c: Colors): Item[] {
  const body = r.pieces.find(x => x.id === 'cuerpo')!, wing = r.pieces.find(x => x.id === 'ala')!, leg = r.pieces.find(x => x.id === 'pata')!, poly = polyOf(body), out: Item[] = [];
  for (const [id, deg, mir] of [['pata-d', -10, false], ['pata-i', 10, true]] as const) { const [a, b] = notchPair(body, id); if (a && b) out.push({ d: pieceSeamPath(leg), fill: c.contraste, transform: hang(leg, 'union', a, b, deg, mir) }); }
  for (const id of ['ala-d', 'ala-i']) { const [a, b] = notchPair(body, id); if (a && b) out.push({ d: pieceSeamPath(wing), fill: c.piel, transform: attach(wing, 'union', a, b) }); }
  out.push({ d: polysPath([poly]), fill: c.piel }, ...embroidery(body, c.detalle, ''));
  const m = body.marks.find(x => x.id === 'pico')?.at, up = r.pieces.find(x => x.id === 'pico-arriba'), down = r.pieces.find(x => x.id === 'pico-abajo');
  if (m && up && down) { const wU = Math.max(...up.nodes.map(n => n.x)), wD = Math.max(...down.nodes.map(n => n.x)); out.push({ d: pieceSeamPath(down), fill: c.contraste, transform: `translate(${m.x - wD / 2} ${m.y + 6})` }, { d: pieceSeamPath(up), fill: c.contraste, transform: `translate(${m.x - wU / 2} ${m.y - 16})`, stroke: '#00000033' }); }
  return out;
}
function xmasTree(r: GeneratorResult, c: Colors): Item[] {
  const tree = r.pieces.find(x => x.id === 'arbol')!, star = r.pieces.find(x => x.id === 'estrella')!, poly = polyOf(tree), out: Item[] = [];
  const legW = Math.max(...r.pieces.find(x => x.id === 'pata')!.nodes.map(n => n.x)) / 2, legH = Math.max(...r.pieces.find(x => x.id === 'pata')!.nodes.map(n => n.y));
  for (const i of [0, 1]) { const [a, b] = notchPair(tree, `pata-${i}`); if (a && b) { const mx = (a.x + b.x) / 2; out.push(shape(rrect(mx - legW / 2, a.y - legW, legW, legH + legW, legW / 3), c.ropa2 ?? '#a89582'), shape(ellipse(mx + (i ? 6 : -6), a.y + legH + 4, legW * 0.62, legW * 0.42), c.ropa2 ?? '#a89582')); } }
  const [t0, t1] = runPoints(tree, 'estrella');
  out.push({ d: pieceSeamPath(star), fill: c.contraste, transform: attach(star, 'union', t0, t1) });
  out.push({ d: polysPath([poly]), fill: c.piel }, ...embroidery(tree, c.detalle, ''), shape(uni(circle(-58 * scaleOf(tree, 352), 214 * scaleOf(tree, 352), 9), circle(58 * scaleOf(tree, 352), 214 * scaleOf(tree, 352), 9)), '#f2a7a788', { stroke: 'none' }));
  return out;
}
const scaleOf = (pc: Piece, designH: number) => { const ys = pc.nodes.map(n => n.y); return (Math.max(...ys) - Math.min(...ys)) / designH; };
function star(r: GeneratorResult, p: Params, c: Colors): Item[] {
  const st = r.pieces.find(x => x.id === 'estrella')!, poly = polyOf(st), out: Item[] = [];
  const arm = r.pieces.find(x => x.id === 'brazo'), leg = r.pieces.find(x => x.id === 'pierna'), shoe = r.pieces.find(x => x.id === 'zapato');
  if (arm && leg && shoe) {
    for (const [id, deg, mir] of [['brazo-d', -24, false], ['brazo-i', 24, true]] as const) { const [a, b] = notchPair(st, id); if (a && b) out.push({ d: pieceSeamPath(arm), fill: c.piel, transform: hang(arm, 'union', a, b, deg, mir) }); }
    const ty = runPoints(leg, 'tobillo')[0].y;
    for (const [id, mir] of [['pierna-d', false], ['pierna-i', true]] as const) { const [a, b] = notchPair(st, id); if (a && b) { const T = hang(leg, 'union', a, b, 0, mir); out.push({ d: pieceSeamPath(leg), fill: c.piel, transform: T }, { d: pieceSeamPath(shoe), fill: c.contraste, transform: `${T} translate(0 ${ty})` }); } }
  }
  out.push({ d: polysPath([poly]), fill: c.piel }, ...embroidery(st, c.detalle, ''));
  for (const id of ['mejilla-i', 'mejilla-d']) { const l = st.lines.filter(x => x.id.startsWith(id)); if (l.length) { const cc = centroid(l.map(x => x.a)); out.push(shape(circle(cc.x, cc.y, Math.hypot(l[0].a.x - cc.x, l[0].a.y - cc.y)), '#f0a9a066', { stroke: 'none' })); } }
  if (p.lazo !== 'no') { const tip = st.nodes[0], s = Math.max(...poly.map(q => q.y)) / 500; out.push(shape(uni(ellipse(tip.x + 56 * s, tip.y + 70 * s, 26 * s, 15 * s, -20), ellipse(tip.x + 104 * s, tip.y + 52 * s, 26 * s, 15 * s, -20)), c.contraste), shape(circle(tip.x + 80 * s, tip.y + 61 * s, 8 * s), c.contraste, { stroke: '#00000033' })); }
  return out;
}
function roundBunny(r: GeneratorResult, p: Params, c: Colors): Item[] {
  const ear = r.pieces.find(x => x.id === 'oreja')!, inner = r.pieces.find(x => x.id === 'oreja-interior')!, out: Item[] = [];
  let poly: Pt[], ears: [Pt | undefined, Pt | undefined][];
  const disc = r.pieces.find(x => x.id === 'cabeza');
  if (disc) { poly = polyOf(disc); ears = [notchPair(disc, 'oreja-i') as [Pt | undefined, Pt | undefined], notchPair(disc, 'oreja-d') as [Pt | undefined, Pt | undefined]]; }
  else {
    const gore = r.pieces.find(x => x.id === 'gajo')!, R = Math.max(...gore.nodes.map(n => n.y)) / Math.PI;
    poly = circle(0, R, R, 96);
    ears = [[P(-R * 0.5, R * 0.18), P(-R * 0.12, R * 0.02)], [P(R * 0.12, R * 0.02), P(R * 0.5, R * 0.18)]];
  }
  const ec = centroid(polyOf(ear)), ic = centroid(polyOf(inner));
  for (const [a, b] of ears) if (a && b) { const T = attach(ear, 'union', a, b); out.push({ d: pieceSeamPath(ear), fill: c.piel, transform: T }, { d: pieceSeamPath(inner), fill: c.contraste, transform: `${T} translate(${ec.x - ic.x} ${ec.y - ic.y + 6})` }); }
  out.push({ d: polysPath([poly]), fill: c.piel });
  if (!disc) { const R = Math.max(...poly.map(q => q.y)) / 2; for (const f of [-0.5, 0.5]) out.push({ d: `M0 0 Q${f * R * 1.3} ${R} 0 ${2 * R}`, stroke: '#00000022', sw: 2 }); }
  if (p.lazo !== 'no') { const top = Math.min(...poly.map(q => q.y)), s = (Math.max(...poly.map(q => q.x)) - Math.min(...poly.map(q => q.x))) / 350; out.push(shape(uni(ellipse(-24 * s, top + 18 * s, 26 * s, 15 * s, 15), ellipse(24 * s, top + 18 * s, 26 * s, 15 * s, -15)), c.contraste), shape(circle(0, top + 18 * s, 8 * s), c.contraste, { stroke: '#00000033' })); }
  return out;
}
function laceButterfly(r: GeneratorResult, p: Params, c: Colors): Item[] {
  const bf = r.pieces.find(x => x.id === 'mariposa')!, body = r.pieces.find(x => x.id === 'cuerpo')!, poly = polyOf(bf), out: Item[] = [];
  const s = (Math.max(...poly.map(q => q.x)) - Math.min(...poly.map(q => q.x))) / 600;
  if (p.volante !== 'no') { const lace = offsetPolygons([poly], 55 * s)[0]; out.push({ d: polysPath([lace]), fill: c.contraste, stroke: '#00000022' }, { d: polysPath([offsetPolygons([poly], 30 * s)[0]]), stroke: '#00000018', sw: 2, dash: '6 5' }); }
  out.push({ d: polysPath([poly]), fill: c.piel });
  const bTop = 60 * s;
  out.push(line([P(-4 * s, bTop + 8 * s), P(-36 * s, bTop - 52 * s)], c.detalle, 5 * s), line([P(4 * s, bTop + 8 * s), P(36 * s, bTop - 52 * s)], c.detalle, 5 * s));
  out.push({ d: pieceSeamPath(body), fill: c.piel, stroke: '#00000040', transform: `translate(0 ${bTop})` });
  return out;
}
function bee(r: GeneratorResult, c: Colors): Item[] {
  const parts = r.pieces.filter(x => x.id === 'cabeza' || x.id.startsWith('franja-')), head = parts[0], out: Item[] = [];
  const wing = r.pieces.find(x => x.id === 'ala')!, ant = r.pieces.find(x => x.id === 'antena');
  if (ant) for (const i of [0, 1]) { const [a, b] = notchPair(head, `antena-${i}`); if (a && b) out.push({ d: pieceSeamPath(ant), fill: c.contraste, transform: attach(ant, 'union', a, b) }); }
  parts.forEach((pc, i) => out.push({ d: pieceSeamPath(pc), fill: i === 0 ? c.contraste : i % 2 ? c.piel : c.ropa, stroke: '#00000022' }));
  for (const i of [0, 1]) { const [a, b] = notchPair(head, `ala-${i}`); if (a && b) out.push({ d: pieceSeamPath(wing), fill: `${c.piel}ee`, stroke: c.detalle === '#2b2b2b' ? '#00000040' : c.detalle, transform: attach(wing, 'union', a, b, 'in') }); }
  return out;
}
function apple(r: GeneratorResult, c: Colors): Item[] {
  const ap = r.pieces.find(x => x.id === 'manzana')!, poly = polyOf(ap), leafP = r.pieces.find(x => x.id === 'hoja')!, out: Item[] = [];
  const [a, b] = notchPair(ap, 'tallo'), top = a && b ? P((a.x + b.x) / 2, (a.y + b.y) / 2) : P(0, 0), s = (Math.max(...poly.map(q => q.x)) - Math.min(...poly.map(q => q.x))) / 408;
  out.push(shape(rrect(top.x - 9 * s, top.y - 70 * s, 18 * s, 84 * s, 6 * s), c.detalle), { d: pieceSeamPath(leafP), fill: c.contraste, transform: `translate(${top.x + 8 * s} ${top.y - 30 * s}) rotate(-8)` });
  out.push({ d: polysPath([poly]), fill: c.piel }, shape(ellipse(-80 * s, 120 * s, 40 * s, 70 * s, 20), '#ffffff1c', { stroke: 'none' }));
  return out;
}
function mushroom(r: GeneratorResult, c: Colors): Item[] {
  const cap = r.pieces.find(x => x.id === 'sombrero')!, stem = r.pieces.find(x => x.id === 'pie')!, out: Item[] = [{ d: pieceSeamPath(stem), fill: c.contraste }, { d: pieceSeamPath(cap), fill: c.piel }];
  const s = (Math.max(...cap.nodes.map(n => n.x)) - Math.min(...cap.nodes.map(n => n.x))) / 424;
  if (r.pieces.some(x => x.id === 'lunar-grande')) cap.marks.forEach((m, i) => out.push(shape(circle(m.at.x, m.at.y, (i % 2 ? 14 : 22) * s), c.detalle)));
  return out;
}
function acorn(r: GeneratorResult, c: Colors): Item[] {
  const cap = r.pieces.find(x => x.id === 'capucha')!, nut = r.pieces.find(x => x.id === 'fruto')!, capPoly = polyOf(cap), out: Item[] = [];
  const [a, b] = notchPair(cap, 'rabito'), s = (Math.max(...capPoly.map(q => q.x)) - Math.min(...capPoly.map(q => q.x))) / 364;
  if (a && b) out.push(shape(rrect((a.x + b.x) / 2 - 10 * s, a.y - 60 * s, 20 * s, 70 * s, 8 * s), c.detalle));
  out.push({ d: pieceSeamPath(nut), fill: c.piel }, { d: polysPath([capPoly]), fill: c.contraste }, ...printOver(capPoly, { ...c, print: 'cuadros', ropa2: '#00000040' }, 22 * s));
  return out;
}
function puffButterfly(r: GeneratorResult, p: Params, c: Colors): Item[] {
  const wing = r.pieces.find(x => x.id === 'ala')!, d = pieceSeamPath(wing), ys = wing.nodes.map(n => n.y), s = (Math.max(...ys) - Math.min(...ys)) / 322;
  const piping = p.vivo === 'si' ? { stroke: c.detalle, sw: 6 * s } : { stroke: '#00000030' };
  return [{ d, fill: c.piel, ...piping, transform: `translate(${10 * s} 0)` }, { d, fill: c.piel, ...piping, transform: `translate(${-10 * s} 0) scale(-1 1)` }, shape(rrect(-36 * s, 70 * s, 72 * s, 200 * s, 14 * s), c.contraste), line([P(-36 * s, 170 * s), P(36 * s, 170 * s)], '#00000018', 2)];
}

export function cushionScene(card: PlushCard, r: GeneratorResult | null, p: Params): Item[] {
  if (!r?.pieces.length) return [];
  const c = card.colors;
  switch (card.generatorId) {
    case 'cojin-pino': return pine(r, p, c);
    case 'cojin-hipocampo': return seahorse(r, c);
    case 'cojin-lactancia': return face(polyOf(r.pieces[0]), c, 45);
    case 'puf-conejo': return pouf(r, c);
    case 'puf-pera-conejo': return beanBag(r, c);
    case 'cojin-sillon': return lounger(r, c);
    case 'cojin-pato': return duck(r, c);
    case 'cojin-arbol': return xmasTree(r, c);
    case 'cojin-estrella': return star(r, p, c);
    case 'cojin-conejo-redondo': return roundBunny(r, p, c);
    case 'cojin-mariposa-volante': return laceButterfly(r, p, c);
    case 'cojin-abeja': return bee(r, c);
    case 'cojin-manzana': return apple(r, c);
    case 'cojin-nube': return face(polyOf(r.pieces[0]), c, 40);
    case 'cojin-hongo': return mushroom(r, c);
    case 'cojin-bellota': return acorn(r, c);
    case 'cojin-mariposa-alas': return puffButterfly(r, p, c);
    default: return [];
  }
}
void rect;
