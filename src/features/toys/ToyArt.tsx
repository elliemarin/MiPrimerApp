import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { Pt } from '../../lib/geom/vec';
import type { GeneratorResult, Params } from '../../lib/pattern/generator';
import { pieceSeamPath, seamPolygon } from '../../lib/pattern/outline';
import { circle, ellipse, inter, leaf, poly, rect, rrect, uni } from '../../lib/applique/shapes';
import { polysPath } from '../../lib/applique/figure';
import type { PlushCard } from '../../data/toys';
import { P, embroidery, line, mid, moved, pointAlong, printOver, runPoints, shape, type Item, type Scene } from './art';
type ToyCard = PlushCard;

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
  if (ear && (who === 'conejita' || who === 'conejo')) {
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
  const cheek = who === 'conejo' ? 32 : 24;
  if (who !== 'patito' && who !== 'abeja') front.push(shape(circle(cx - cheek * k, (flower ? 8 : 64) * k, 6 * k), '#f2a7a7'), shape(circle(cx + cheek * k, (flower ? 8 : 64) * k, 6 * k), '#f2a7a7'));
  const muzzle = get('hocico'), mAt = head.marks.find(m => m.id === 'hocico')?.at;
  if (muzzle && mAt) front.push({ d: pieceSeamPath(muzzle), fill: c.contraste, transform: `translate(${mAt.x} ${mAt.y})` }, ...embroidery(muzzle, '#3b2a1a', `translate(${mAt.x} ${mAt.y})`));
  const brim = get('sombrero-ala'), crown = get('sombrero-copa');
  if (brim && crown) {
    const xs = crown.nodes.map(n => n.x), ys = crown.nodes.map(n => n.y), W = Math.max(...xs) - Math.min(...xs), H = Math.max(...ys) - Math.min(...ys);
    const hat = `translate(${cx + 10 * k} ${2 * k}) rotate(-10)`;
    front.push({ d: pieceSeamPath(crown), fill: c.ropa2 ?? c.contraste, transform: `${hat} translate(${-W / 2 - Math.min(...xs)} ${-H - Math.min(...ys)}) scale(1 0.9)` }, { d: pieceSeamPath(brim), fill: c.ropa2 ?? c.contraste, transform: `${hat} scale(1 0.32)` }, shape(rect(-W / 2, -7 * k, W, 6 * k), c.ropa, { transform: hat }));
  }
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
  const blouse = get('blusa-delantero');
  if (blouse) {
    cloth('blusa-delantero', c.ropa2 ?? c.contraste, P(cx, garmentY + 2 * k));
    const hemY = garmentY + 2 * k + Math.max(...blouse.nodes.map(n => n.y)), hw = Math.max(...blouse.nodes.map(n => n.x)) * 1.12, r = 6 * k, nScal = Math.max(4, Math.round(hw / r));
    items.push(shape(uni(rect(cx - hw, hemY - 2 * k, 2 * hw, 16 * k), ...Array.from({ length: nScal + 1 }, (_, i) => circle(cx - hw + (2 * hw * i) / nScal, hemY + 14 * k, r))), c.ropa2 ?? c.contraste, { stroke: '#00000022' }));
  }
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

/** Flat bear or bunny, drawn from its real pieces: body, head on the neck, arms from the side seams. */
function flatScene(card: ToyCard, r: GeneratorResult, p: Params): Item[] {
  const get = (id: string) => r.pieces.find(x => x.id === id);
  const head = get('cabeza')!, body = get('cuerpo')!, arm = get('brazo')!, c = card.colors, bear = p.personaje !== 'conejita';
  const ys = body.nodes.map(n => n.y), k = (Math.max(...ys) - Math.min(...ys)) / 216;
  const [hn0, hn1] = runPoints(head, 'cuello'), hc = mid(hn0, hn1), [bn0, bn1] = runPoints(body, 'cuello'), bc = mid(bn0, bn1);
  const dx = hc.x - bc.x, dy = hc.y - bc.y, cx = hc.x, items: Item[] = [];
  const sh = pointAlong(body, 'costado', 30 * k), [a0, a1] = runPoints(arm, 'union'), au = mid(a0, a1);
  const armT = `translate(${sh.x + dx - au.x - 8 * k} ${sh.y + dy - au.y}) rotate(-24 ${au.x} ${au.y})`;
  for (const m of ['', `translate(${2 * cx} 0) scale(-1 1) `]) items.push({ d: pieceSeamPath(arm), fill: c.piel, transform: `${m}${armT}` });
  const ear = get('oreja');
  if (ear) {
    const [e0, e1] = runPoints(ear, 'union'), eu = mid(e0, e1), at = pointAlong(head, 'contorno', 42 * k);
    for (const m of ['', `translate(${2 * cx} 0) scale(-1 1) `]) items.push({ d: pieceSeamPath(ear), fill: c.piel, transform: `${m}translate(${at.x - eu.x} ${at.y - eu.y + 8 * k}) rotate(14 ${eu.x} ${eu.y})` }, { d: pieceSeamPath(ear), fill: c.contraste, transform: `${m}translate(${at.x - eu.x} ${at.y - eu.y + 8 * k}) rotate(14 ${eu.x} ${eu.y}) translate(${eu.x * 0.22} ${eu.y * 0.18}) scale(.78 .82)` });
  }
  const bodyPoly = moved(seamPolygon(body), dx, dy), headPoly = seamPolygon(head);
  items.push({ d: polysPath([bodyPoly]), fill: c.piel }, ...printOver(bodyPoly, c, 22 * k), { d: polysPath([headPoly]), fill: c.piel }, ...printOver(headPoly, c, 22 * k));
  if (bear) for (const s of [-1, 1]) items.push(shape(circle(cx + s * 56 * k, 24 * k, 12 * k), c.contraste));
  items.push(...embroidery(head, c.detalle, ''));
  const muzzle = get('hocico'), mAt = head.marks.find(m => m.id === 'hocico')?.at;
  if (muzzle && mAt) items.push({ d: pieceSeamPath(muzzle), fill: c.contraste, transform: `translate(${mAt.x} ${mAt.y})` }, ...embroidery(muzzle, c.detalle, `translate(${mAt.x} ${mAt.y})`));
  items.push(shape(uni(circle(cx - 46 * k, 104 * k, 9 * k), circle(cx + 46 * k, 104 * k, 9 * k)), '#f2a7a788', { stroke: 'none' }));
  if (get('lazo')) { const y = hc.y + 4 * k, bx = bear ? cx : cx + 44 * k, by = bear ? y : 22 * k; items.push(shape(uni(ellipse(bx - 20 * k, by, 20 * k, 11 * k, -16), ellipse(bx + 20 * k, by, 20 * k, 11 * k, 16)), c.ropa), shape(circle(bx, by, 6 * k), c.ropa, { stroke: '#00000033' })); }
  return items;
}
function bear3dScene(c: ToyCard['colors'], p: Params): Item[] {
  const head = ellipse(100, 96, 54, 46), body = ellipse(100, 182, 48, 58), arms = uni(ellipse(54, 168, 15, 38, 24), ellipse(146, 168, 15, 38, -24)), legs = uni(ellipse(70, 232, 23, 30), ellipse(130, 232, 23, 30));
  const items: Item[] = [
    shape(uni(circle(56, 56, 20), circle(144, 56, 20)), c.piel), shape(uni(circle(56, 56, 11), circle(144, 56, 11)), c.contraste),
    shape(legs, c.piel), ...printOver(legs, c, 12), shape(uni(ellipse(70, 256, 19, 9), ellipse(130, 256, 19, 9)), c.contraste),
    shape(body, c.piel), ...printOver(body, c, 12), shape(arms, c.piel), ...printOver(arms, c, 12),
    shape(head, c.piel), ...printOver(head, c, 12), shape(ellipse(100, 114, 24, 17), '#ffffff40', { stroke: 'none' }),
    shape(uni(circle(80, 92, 4), circle(120, 92, 4)), c.detalle), { d: 'M93 106 L107 106 L100 114 Z', fill: c.detalle }, line([P(100, 114), P(100, 120), P(94, 124)], c.detalle, 1.6), line([P(100, 120), P(106, 124)], c.detalle, 1.6)
  ];
  if (p.lazo !== 'no') items.push(shape(uni(ellipse(84, 140, 18, 10, -14), ellipse(116, 140, 18, 10, 14)), c.ropa), shape(circle(100, 140, 6), c.ropa, { stroke: '#00000033' }));
  return items;
}
function sitBunnyScene(c: ToyCard['colors'], p: Params): Item[] {
  const long = p.orejas !== 'medianas', head = ellipse(100, 104, 46, 40), body = uni(ellipse(100, 190, 54, 60), ellipse(100, 150, 38, 30));
  const earL = long ? 74 : 44, ears = uni(ellipse(56, 92 + earL * 0.7, 15, earL, 10), ellipse(144, 92 + earL * 0.7, 15, earL, -10)), inner = uni(ellipse(56, 92 + earL * 0.7, 8, earL - 12, 10), ellipse(144, 92 + earL * 0.7, 8, earL - 12, -10));
  const feet = uni(ellipse(66, 246, 30, 13), ellipse(134, 246, 30, 13)), paws = uni(ellipse(82, 200, 12, 30), ellipse(118, 200, 12, 30));
  return [
    shape(body, c.piel), ...printOver(body, c, 12), shape(feet, c.piel), ...printOver(feet, c, 12), shape(uni(ellipse(66, 250, 18, 6), ellipse(134, 250, 18, 6)), c.contraste),
    shape(paws, c.piel), ...printOver(paws, c, 12), shape(head, c.piel), ...printOver(head, c, 12),
    shape(ears, c.piel), ...printOver(ears, c, 12), shape(inner, c.contraste),
    line([P(76, 100), P(80, 104), P(86, 104), P(90, 100)], c.detalle, 1.8), line([P(110, 100), P(114, 104), P(120, 104), P(124, 100)], c.detalle, 1.8),
    { d: 'M95 114 L105 114 L100 119 Z', fill: '#d98c8c' }, line([P(100, 119), P(100, 124)], c.detalle, 1.4), shape(uni(circle(74, 116, 6), circle(126, 116, 6)), '#f2a7a788', { stroke: 'none' })
  ];
}
function mushroomHouseScene(c: ToyCard['colors'], p: Params): Item[] {
  const n = Math.round(Number(p.gajos ?? 6)), wall: [number, number][] = [];
  for (let i = 0; i <= 20; i++) { const t = i / 20, w = 50 + (66 - 50) * t + Math.sin(Math.PI * t) * 6; wall.push([100 + w, 116 + t * 140]); }
  for (let i = 20; i >= 0; i--) { const t = i / 20, w = 50 + (66 - 50) * t + Math.sin(Math.PI * t) * 6; wall.push([100 - w, 116 + t * 140]); }
  const lobes = Array.from({ length: n + 1 }, (_, i) => circle(100 - 116 + (232 * i) / n, 122, 232 / n / 2 + 1));
  const cap = uni(inter(ellipse(100, 122, 118, 106), rect(-100, 0, 400, 122)), ...lobes);
  const spots = [[60, 72, 12], [104, 46, 14], [146, 80, 11], [86, 104, 8], [128, 112, 9], [40, 112, 7], [164, 116, 7]].map(([x, y, r]) => circle(x, y, r));
  return [
    shape(uni(ellipse(60, 258, 22, 8), ellipse(146, 260, 18, 7)), '#9bb57a', { stroke: 'none' }),
    { d: polysPath([poly(wall)]), fill: c.piel }, ...Array.from({ length: 2 }, (_, i) => line([P(100 + (i ? 1 : -1) * 28, 120), P(100 + (i ? 1 : -1) * 36, 254)], '#00000022', 1)),
    shape(rrect(84, 196, 32, 60, 15), c.detalle), line([P(100, 200), P(100, 256)], '#00000040', 1.2), shape(circle(110, 228, 2.2), c.ropa2 ?? '#f2c94c'),
    ...[[56, 170], [144, 170]].flatMap(([x, y]) => [shape(circle(x, y, 13), c.ropa2 ?? '#f2c94c'), line([P(x, y - 13), P(x, y + 13)], c.detalle, 1.6), line([P(x - 13, y), P(x + 13, y)], c.detalle, 1.6)]),
    shape(cap, c.ropa), shape(uni(...spots), c.contraste, { stroke: 'none' })
  ];
}
/** Felt gnome house, drawn from its real pieces in their sewn positions. */
function gnomeHouseScene(card: ToyCard, r: GeneratorResult, p: Params): Item[] {
  const get = (id: string) => r.pieces.find(x => x.id === id)!, c = card.colors, k = Number(p.alto ?? 200) / 200;
  const at = (id: string, x: number, y: number, extra = '') => ({ d: pieceSeamPath(get(id)), transform: `translate(${x * k} ${y * k}) ${extra}` });
  const items: Item[] = [
    { ...at('hoja', -96, 104, 'rotate(-150)'), fill: c.ropa2 }, { ...at('hoja', 88, 112, 'rotate(-30)'), fill: c.ropa2 }, { ...at('hoja', -44, 116, 'rotate(-170) scale(.8)'), fill: c.ropa2 },
    { ...at('casa', 0, 0), fill: c.piel }, { ...at('puerta', 0, 0), fill: c.contraste }, ...embroidery(get('puerta'), '#00000055', ''),
    { ...at('ventana', 32, 44), fill: c.detalle }, ...embroidery(get('ventana'), c.contraste, `translate(${32 * k} ${44 * k})`),
    { ...at('tejado', 0, 0), fill: c.ropa }, { ...at('ventana-tejado', 0, -42), fill: c.detalle }, ...embroidery(get('ventana-tejado'), c.contraste, `translate(0 ${-42 * k})`),
    { ...at('pie-grande', -70, 84), fill: '#f6efe2' }, { ...at('seta-grande', -70, 86), fill: c.ropa },
    { ...at('pie-pequeno', 74, 96), fill: '#f6efe2' }, { ...at('seta-pequena', 74, 98), fill: c.ropa },
    ...[[-80, 74], [-62, 70], [-70, 80], [70, 90], [80, 92]].map(([x, y]) => ({ ...at('lunar', x, y), fill: '#fbf6ec' }))
  ];
  if (p.colgante !== 'no') items.unshift(line([P(-30 * k, -150 * k), P(0, -86 * k), P(30 * k, -150 * k)], c.contraste, 1.4));
  return items;
}

export function toyScene(card: ToyCard, result: GeneratorResult | null, params: Params): Item[] {
  if (card.generatorId === 'muneco-trapo' && result?.pieces.length) return ragScene(card, result, params);
  if (card.generatorId === 'peluche-bichito') return bugScene(card.colors, params);
  if (card.generatorId === 'fieltro-hada') return fairyScene(card.colors);
  if (card.generatorId === 'peluche-libelula') return dragonflyScene(card.colors);
  if (card.generatorId === 'peluche-conejo-3d') return bunny3dScene(card.colors);
  if (card.generatorId === 'peluche-plano' && result?.pieces.length) return flatScene(card, result, params);
  if (card.generatorId === 'peluche-oso-3d') return bear3dScene(card.colors, params);
  if (card.generatorId === 'peluche-conejo-sentado') return sitBunnyScene(card.colors, params);
  if (card.generatorId === 'peluche-casa-hongo') return mushroomHouseScene(card.colors, params);
  if (card.generatorId === 'fieltro-casa-gnomos' && result?.pieces.length) return gnomeHouseScene(card, result, params);
  return [];
}

export function ToyArt({ card, result, params, label, scene = toyScene }: { card: PlushCard; result: GeneratorResult | null; params: Params; label?: string; scene?: Scene }) {
  const items = useMemo(() => scene(card, result, params), [scene, card, result, params]);
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
