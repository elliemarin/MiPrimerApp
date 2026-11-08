import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { Pt } from '../../lib/geom/vec';
import type { GeneratorResult, Params } from '../../lib/pattern/generator';
import type { Piece } from '../../lib/pattern/types';
import { nodeById, pieceSeamPath, pointOnEdge, edgeLength, seamPolygon } from '../../lib/pattern/outline';
import { circle, ellipse, inter, leaf, rect, rrect, uni, type Shape } from '../../lib/applique/shapes';
import { polysPath } from '../../lib/applique/figure';
import type { ToyCard } from '../../data/toys';

/** One drawn layer of the illustration (millimetres of the real pattern, or design units). */
export interface Item { d: string; fill?: string; stroke?: string; sw?: number; transform?: string; dash?: string }
const P = (x: number, y: number): Pt => ({ x, y });
const shape = (s: Shape | Shape[number], fill: string, extra: Partial<Item> = {}): Item => ({ d: polysPath(Array.isArray(s[0]) ? s as Shape : [s as Shape[number]]), fill, ...extra });
const line = (pts: Pt[], color: string, sw: number, transform?: string): Item => ({ d: `M${pts.map(p => `${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' L')}`, stroke: color, sw, transform });

function runPoints(piece: Piece, run: string): Pt[] {
  const es = piece.edges.filter(e => e.id === run || new RegExp(`^${run}-\\d+$`).test(e.id));
  return es.length ? [P(nodeById(piece, es[0].from).x, nodeById(piece, es[0].from).y), P(nodeById(piece, es[es.length - 1].to).x, nodeById(piece, es[es.length - 1].to).y)] : [P(0, 0), P(0, 0)];
}
function pointAlong(piece: Piece, run: string, s: number): Pt {
  let left = s;
  for (const e of piece.edges.filter(x => x.id === run || new RegExp(`^${run}-\\d+$`).test(x.id))) {
    const l = edgeLength(piece, e);
    if (left <= l) return pointOnEdge(piece, e, left).p;
    left -= l;
  }
  const last = piece.edges[piece.edges.length - 1];
  return P(nodeById(piece, last.to).x, nodeById(piece, last.to).y);
}
const mid = (a: Pt, b: Pt) => P((a.x + b.x) / 2, (a.y + b.y) / 2);
const embroidery = (pc: Piece, color: string, transform: string): Item[] => pc.lines.filter(l => l.kind === 'pespunte').map(l => line([l.a, l.b], color, Math.max(0.9, 1.6), transform));

/** Rag dolls and animals, drawn from their real pieces in a front view. */
function ragScene(card: ToyCard, r: GeneratorResult, p: Params): Item[] {
  const get = (id: string) => r.pieces.find(x => x.id === id);
  const head = get('cabeza')!, body = get('cuerpo')!, arm = get('brazo')!, leg = get('pierna')!, c = card.colors;
  const who = String(p.personaje), flower = who === 'flor';
  // Scale of this build: the doll body is 104 design units tall.
  const bodyPts = body.nodes.map(n => n.y), k = (Math.max(...bodyPts) - Math.min(...bodyPts)) / (who === 'abeja' ? 110 : 104);
  const [hn0, hn1] = flower ? [P(-17 * k, 43 * k), P(17 * k, 43 * k)] : runPoints(head, 'cuello'), hc = mid(hn0, hn1);
  const [bn0, bn1] = runPoints(body, 'cuello'), bc = mid(bn0, bn1), tb = P(hc.x - bc.x, hc.y - bc.y);
  const T = (pt: Pt) => P(pt.x + tb.x, pt.y + tb.y), cx = hc.x;
  const items: Item[] = [], back: Item[] = [], front: Item[] = [];
  const skin = who === 'abeja' ? c.piel : c.piel, bodyFill = who === 'abeja' || flower ? c.ropa : c.piel;
  const [b0, b1] = runPoints(body, 'base'), legPos = [0.25, 0.75].map(f => T(P(b0.x + (b1.x - b0.x) * f, b0.y + (b1.y - b0.y) * f)));
  const [u0, u1] = runPoints(leg, 'union'), lu = mid(u0, u1);
  const legFill = who === 'patito' ? c.contraste : who === 'abeja' ? c.ropa : c.piel;
  for (const lp of legPos) back.push({ d: pieceSeamPath(leg), fill: legFill, transform: `translate(${lp.x - lu.x} ${lp.y - lu.y - 2 * k})` });
  // Bee stripes are the real outline of each leg and of the body, cut by horizontal bands.
  const bands = (poly: Pt[], top: number, bottom: number, step: number, h: number) => inter(poly, uni(...Array.from({ length: Math.ceil((bottom - top) / step) }, (_, i) => rect(-1e4, top + i * step, 2e4, h))));
  if (who === 'abeja') for (const lp of legPos) { const lpoly = seamPolygon(leg).map(q => P(q.x + lp.x - lu.x, q.y + lp.y - lu.y - 2 * k)); back.push(shape(bands(lpoly, lp.y + 6 * k, lp.y + 100 * k, 22 * k, 10 * k), c.ropa2 ?? '#f2c94c')); }
  // Arms from the shoulder, the left one mirrored about the centre line.
  const armAt = (who === 'abeja' ? 20 : who === 'patito' ? 22 : 30) + (who === 'abeja' ? 13 : who === 'patito' ? 11 : 12);
  const sh = T(pointAlong(body, 'costado', armAt * k)), [a0, a1] = runPoints(arm, 'union'), au = mid(a0, a1);
  const armFill = flower && p.brazos === 'hoja' ? c.ropa2 ?? '#8ab17d' : who === 'abeja' ? c.ropa : who === 'patito' ? c.piel : c.piel;
  const armT = `translate(${sh.x - au.x - 6 * k} ${sh.y - au.y}) rotate(-14 ${au.x} ${au.y})`;
  for (const m of ['', `translate(${2 * cx} 0) scale(-1 1) `]) back.push({ d: pieceSeamPath(arm), fill: armFill, transform: `${m}${armT}` });
  if (who === 'abeja') {
    const wings = get('alas');
    if (wings) back.unshift({ d: pieceSeamPath(wings), fill: c.contraste, stroke: '#00000022', transform: `translate(${cx - 100 * k} ${hc.y + 2 * k})` });
  }
  items.push(...back);
  items.push({ d: pieceSeamPath(body), fill: bodyFill, transform: `translate(${tb.x} ${tb.y})` });
  if (who === 'abeja') { const bpoly = seamPolygon(body).map(T); items.push(shape(bands(bpoly, hc.y + 10 * k, hc.y + 110 * k, 26 * k, 12 * k), c.ropa2 ?? '#e6c98f')); }
  // Head, petals, ears.
  if (flower) {
    const pet = get('petalo')!, n = Number(p.petalos ?? 8), [pu0, pu1] = runPoints(pet, 'union'), pu = mid(pu0, pu1), gap = 40;
    for (let i = 0; i < n; i++) {
      const th = 90 + gap / 2 + (i + 0.5) * (360 - gap) / n, rad = th * Math.PI / 180, at = P(Math.cos(rad) * 43 * k, Math.sin(rad) * 41 * k);
      items.push({ d: pieceSeamPath(pet), fill: c.contraste, stroke: '#00000018', transform: `translate(${at.x - pu.x} ${at.y - pu.y}) rotate(${th + 90} ${pu.x} ${pu.y})` });
    }
  }
  const ear = get('oreja');
  if (ear && who === 'conejita') {
    const [e0, e1] = runPoints(ear, 'union'), eu = mid(e0, e1), at = pointAlong(head, 'contorno', 22 * k);
    for (const m of ['', `translate(${2 * cx} 0) scale(-1 1) `]) items.push({ d: pieceSeamPath(ear), fill: c.piel, transform: `${m}translate(${at.x - eu.x} ${at.y - eu.y + 4 * k}) rotate(8 ${eu.x} ${eu.y})` }, { d: pieceSeamPath(ear), fill: c.contraste, transform: `${m}translate(${at.x - eu.x} ${at.y - eu.y + 4 * k}) rotate(8 ${eu.x} ${eu.y}) translate(${eu.x * 0.25} ${eu.y * 0.2}) scale(.75 .8)` });
  }
  const hair = get('base-cabello');
  items.push({ d: pieceSeamPath(head), fill: skin });
  if (hair) items.push({ d: pieceSeamPath(hair), fill: c.detalle, transform: `translate(0 ${-1 * k})` });
  if (ear && who === 'perrito') {
    const [e0, e1] = runPoints(ear, 'union'), eu = mid(e0, e1), at = pointAlong(head, 'contorno', 37 * k);
    for (const m of ['', `translate(${2 * cx} 0) scale(-1 1) `]) items.push({ d: pieceSeamPath(ear), fill: c.contraste, transform: `${m}translate(${at.x - eu.x} ${at.y - eu.y}) rotate(-28 ${eu.x} ${eu.y})` });
  }
  front.push(...embroidery(head, '#3b2a1a', ''));
  if (who !== 'patito' && who !== 'abeja') front.push(shape(circle(cx - 24 * k, (flower ? 8 : 64) * k, 6 * k), '#f2a7a7'), shape(circle(cx + 24 * k, (flower ? 8 : 64) * k, 6 * k), '#f2a7a7'));
  const beak = get('pico');
  if (beak) front.push({ d: pieceSeamPath(beak), fill: c.contraste, transform: `translate(${cx + 13 * k} ${hc.y * 0.55}) rotate(90)` });
  if (who === 'abeja' && get('antena')) for (const s of [-1, 1]) front.push(line([P(cx + s * 22 * k, 10 * k), P(cx + s * 36 * k, -40 * k)], c.ropa, 5 * k), shape(circle(cx + s * 36 * k, -44 * k, 9 * k), c.ropa));
  // Clothes over the body.
  const cloth = (id: string, fill: string, at: Pt, extra = '') => { const pc = get(id); if (pc) for (const m of ['', 'scale(-1 1) ']) items.push({ d: pieceSeamPath(pc), fill, stroke: '#00000022', transform: `translate(${at.x} ${at.y}) ${m}${extra}` }); };
  const garmentY = hc.y;
  if (get('peto-delantero')) {
    cloth('peto-delantero', c.ropa, P(cx, garmentY + 26 * k));
    for (const s of [-1, 1]) items.push(line([P(cx + s * 16 * k, garmentY + 28 * k), P(cx + s * 22 * k, garmentY + 6 * k)], c.ropa, 7 * k));
    const pk = get('bolsillo'); if (pk) items.push({ d: pieceSeamPath(pk), fill: c.ropa, stroke: '#00000033', transform: `translate(${cx - 12 * k} ${garmentY + 34 * k})` });
  }
  if (get('vestido-delantero')) cloth('vestido-delantero', c.ropa, P(cx, garmentY + 2 * k));
  if (get('pantalon')) for (const lp of legPos) items.push(shape(rrect(lp.x - 20 * k, garmentY + 66 * k, 40 * k, (lp.y - garmentY - 66 * k) + 88 * k, 4 * k), c.ropa));
  if (get('chaqueta-delantero')) {
    const sl = get('manga')!;
    // The cap runs down the body side (drop shoulder); the sleeve hangs along the arm.
    for (const m of ['', `translate(${2 * cx} 0) scale(-1 1) `]) items.push({ d: pieceSeamPath(sl), fill: c.ropa2 ?? c.ropa, stroke: '#00000022', transform: `${m}translate(${cx + 36 * k} ${garmentY + 8 * k}) rotate(74) matrix(0 1 1 0 0 0)` });
    for (const m of ['', 'scale(-1 1) ']) items.push({ d: pieceSeamPath(get('chaqueta-delantero')!), fill: c.ropa2 ?? c.contraste, stroke: '#00000022', transform: `translate(${cx} ${garmentY}) ${m}` });
  }
  if (get('suela')) for (const lp of legPos) items.push(shape(ellipse(lp.x, lp.y + 92 * k, 21 * k, 12 * k), c.detalle));
  if (get('lazo')) for (const s of [-1, 1]) items.push(shape(ellipse(cx + s * 18 * k + (who === 'muneca' ? 26 * k : 0), (who === 'gatito' ? 10 : 2) * k, 18 * k, 11 * k, s * 18), c.contraste));
  if (get('bolso')) items.push(line([P(cx - 30 * k, garmentY + 10 * k), P(cx + 44 * k, garmentY + 92 * k)], c.detalle, 4 * k), shape(rrect(cx + 30 * k, garmentY + 84 * k, 30 * k, 26 * k, 4 * k), c.detalle));
  if (get('bufanda')) items.push(shape(rrect(cx - 34 * k, garmentY - 6 * k, 68 * k, 16 * k, 6 * k), c.detalle), shape(rrect(cx + 8 * k, garmentY, 14 * k, 50 * k, 4 * k), c.detalle));
  if (get('hueso')) items.push({ d: pieceSeamPath(get('hueso')!), fill: c.contraste, transform: `translate(${cx + 56 * k} ${garmentY + 70 * k}) rotate(40) scale(.7)` });
  if (get('parche')) items.push(shape(ellipse(cx, garmentY + 62 * k, 26 * k, 25 * k), c.contraste), line([P(cx, garmentY + 38 * k), P(cx, garmentY + 86 * k)], c.detalle, 1.2), line([P(cx - 26 * k, garmentY + 62 * k), P(cx + 26 * k, garmentY + 62 * k)], c.detalle, 1.2));
  return [...items, ...front];
}

function bugScene(c: ToyCard['colors'], p: Params): Item[] {
  const items: Item[] = [
    shape(uni(ellipse(56, 150, 34, 46, -20), ellipse(144, 150, 34, 46, 20)), c.contraste),
    shape(uni(ellipse(70, 210, 18, 11), ellipse(130, 210, 18, 11)), c.ropa),
    shape(ellipse(100, 160, 54, 52), c.ropa), shape(uni(ellipse(46, 152, 12, 26, 30), ellipse(154, 152, 12, 26, -30)), c.ropa),
    shape(circle(100, 70, 62), c.ropa), shape(ellipse(100, 82, 40, 38), c.piel),
    ...[[-14, 80], [14, 80]].map(([x, y]) => shape(circle(100 + x, y, 3.5), '#2b2b2b')), line([P(92, 96), P(100, 100), P(108, 96)], '#b5463a', 2),
    shape(uni(circle(78, 92, 5), circle(122, 92, 5)), '#f2a7a7'),
    ...Array.from({ length: 6 }, (_, i) => shape(circle(96 + (i % 2 ? 24 : -24) + (i > 3 ? (i % 2 ? 6 : -6) : 0), 150 + (i % 3) * 24, 5), c.detalle))
  ];
  if (p.antenas !== 'bordadas') for (const s of [-1, 1]) items.splice(4, 0, line([P(100 + s * 18, 14), P(100 + s * 30, -20)], '#1f1f1f', 4), shape(circle(100 + s * 30, -24, 8), '#1f1f1f'));
  if (p.lazo !== 'no') items.push(shape(uni(ellipse(84, 16, 18, 11, -15), ellipse(116, 16, 18, 11, 15)), c.ropa), shape(circle(100, 17, 6), c.ropa));
  return items;
}
function fairyScene(c: ToyCard['colors']): Item[] {
  return [
    shape(uni(leaf(100, 120, 196, 54, 54, 0.04), leaf(100, 120, 4, 54, 54, -0.04)), c.contraste, { stroke: '#00000022' }), shape(uni(leaf(100, 130, 180, 176, 40), leaf(100, 130, 20, 176, 40)), c.contraste, { stroke: '#00000022' }),
    line([P(92, 32), P(84, 0)], '#3b2a1a', 1.4), line([P(108, 32), P(116, 0)], '#3b2a1a', 1.4),
    shape(uni(ellipse(72, 112, 7, 26, 15), ellipse(128, 112, 7, 26, -15)), c.piel), shape(ellipse(100, 140, 26, 56), c.ropa),
    shape(ellipse(100, 64, 26, 28), c.piel), shape(uni(ellipse(100, 50, 28, 18), ellipse(78, 64, 6, 14), ellipse(122, 64, 6, 14)), c.detalle),
    line([P(91, 66), P(95, 68)], '#3b2a1a', 1.4), line([P(105, 68), P(109, 66)], '#3b2a1a', 1.4), shape(ellipse(100, 76, 2.5, 1.5), '#c86b6b'),
    shape(uni(ellipse(90, 96, 10, 6, 20), ellipse(110, 96, 10, 6, -20), circle(100, 96, 4)), '#e8b4b8')
  ];
}
function dragonflyScene(c: ToyCard['colors']): Item[] {
  const body: Pt[] = [];
  for (let i = 0; i <= 40; i++) { const t = i / 40, x = 40 + t * 150, w = 12 - t * 7; body.push(P(x, 100 - w)); }
  for (let i = 40; i >= 0; i--) { const t = i / 40, x = 40 + t * 150, w = 12 - t * 7; body.push(P(x, 100 + w)); }
  return [
    shape(uni(leaf(56, 96, 120, 20, 30, 0.06), leaf(56, 104, 120, 180, 30, -0.06)), c.contraste, { stroke: '#00000022' }), shape(uni(leaf(64, 96, 150, 44, 24, 0.04), leaf(64, 104, 150, 156, 24, -0.04)), c.contraste, { stroke: '#00000022' }),
    { d: polysPath([body]), fill: c.ropa, stroke: '#0000001f' }, ...Array.from({ length: 8 }, (_, i) => line([P(70 + i * 16, 88 + i * 0.8), P(70 + i * 16, 112 - i * 0.8)], '#00000030', 1.2)),
    shape(rrect(52, 90, 14, 20, 4), c.contraste), shape(circle(30, 100, 16), c.piel), shape(uni(circle(24, 94, 2.5), circle(24, 106, 2.5)), c.detalle)
  ];
}
function bunny3dScene(c: ToyCard['colors']): Item[] {
  return [
    shape(uni(ellipse(74, 40, 14, 44, -12), ellipse(126, 40, 14, 44, 12)), c.piel), shape(uni(ellipse(74, 44, 8, 34, -12), ellipse(126, 44, 8, 34, 12)), c.contraste),
    shape(uni(ellipse(62, 196, 20, 30, 10), ellipse(138, 196, 20, 30, -10)), c.piel), shape(uni(ellipse(62, 218, 16, 11), ellipse(138, 218, 16, 11)), c.contraste),
    shape(ellipse(100, 160, 46, 52), c.piel), shape(ellipse(100, 166, 24, 40), c.contraste),
    shape(uni(ellipse(56, 150, 13, 32, 20), ellipse(144, 150, 13, 32, -20)), c.piel),
    shape(ellipse(100, 92, 42, 38), c.piel),
    shape(uni(circle(86, 88, 3.5), circle(114, 88, 3.5)), c.detalle), { d: 'M95 100 L105 100 L100 106 Z', fill: c.detalle }
  ];
}

export function toyScene(card: ToyCard, result: GeneratorResult | null, params: Params): Item[] {
  if (card.generatorId === 'muneco-trapo' && result?.pieces.length) return ragScene(card, result, params);
  if (card.generatorId === 'peluche-bichito') return bugScene(card.colors, params);
  if (card.generatorId === 'fieltro-hada') return fairyScene(card.colors);
  if (card.generatorId === 'peluche-libelula') return dragonflyScene(card.colors);
  if (card.generatorId === 'peluche-conejo-3d') return bunny3dScene(card.colors);
  return [];
}

export function ToyArt({ card, result, params, label }: { card: ToyCard; result: GeneratorResult | null; params: Params; label?: string }) {
  const items = useMemo(() => toyScene(card, result, params), [card, result, params]);
  const ref = useRef<SVGGElement>(null);
  const [vb, setVb] = useState('-60 -80 360 360');
  // Pieces are placed with transforms: measure the drawn group and frame it square with a margin.
  useLayoutEffect(() => {
    const g = ref.current;
    if (!g || typeof g.getBBox !== 'function') return;
    const b = g.getBBox(), side = Math.max(b.width, b.height) * 1.08;
    if (side > 0) setVb(`${b.x + b.width / 2 - side / 2} ${b.y + b.height / 2 - side / 2} ${side} ${side}`);
  }, [items]);
  return <svg viewBox={vb} role="img" aria-label={label ?? card.name} preserveAspectRatio="xMidYMid meet">
    <g ref={ref}>{items.map((it, i) => <path key={i} d={it.d} fill={it.fill ?? 'none'} stroke={it.stroke ?? (it.fill && it.fill !== 'none' ? 'rgba(0,0,0,.2)' : 'none')} strokeWidth={it.sw ?? 0.8} strokeLinecap="round" strokeLinejoin="round" vectorEffect={it.sw ? undefined : 'non-scaling-stroke'} transform={it.transform || undefined}/>)}</g>
  </svg>;
}
