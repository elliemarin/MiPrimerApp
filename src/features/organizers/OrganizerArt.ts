import type { Pt } from '../../lib/geom/vec';
import type { GeneratorResult, Params } from '../../lib/pattern/generator';
import { decorPolys, organizerLayout } from '../../lib/pattern/generators/organizers';
import { polysPath } from '../../lib/applique/figure';
import type { PlushCard } from '../../data/toys';
import { P, line, printOver, type Item } from '../toys/art';

/* Dibujo de los bolsilleros con el mismo trazado que el patrón: la silueta,
 * los bolsillos en sus líneas de colocación, apliques, bordados y colgador. */

export function organizerScene(card: PlushCard, result: GeneratorResult | null, params: Params): Item[] {
  if (!result?.pieces.length) return [];
  let got;
  try { got = organizerLayout(card.generatorId, params); } catch { return []; }
  const { layout: L, k } = got, c = card.colors;
  const color: Record<string, string> = {
    pared: c.piel, tela1: c.contraste, tela2: c.ropa2 ?? c.contraste, madera: c.detalle, blanco: '#fbf8f1', noche: '#2f3340',
    verde: '#8fb07c', agua: '#bcdbe6', rosa: '#f0b3b8'
  };
  const fill = (role: string) => color[role] ?? role;
  const path = (pts: Pt[]) => polysPath([pts]);
  const items: Item[] = [];
  const xs = L.body.map(q => q.x), W = Math.max(...xs) - Math.min(...xs);
  // Hanger first, so the body covers its ends.
  const sw = Math.max(4, 0.018 * W);
  if (L.hang.kind === 'presilla') for (const a of L.hang.at) {
    const h = 0.09 * W, w = 0.03 * W;
    items.push({ d: `M${a.x - w} ${a.y + 4} C${a.x - w} ${a.y - h} ${a.x + w} ${a.y - h} ${a.x + w} ${a.y + 4}`, stroke: c.detalle, sw });
  }
  if (L.hang.kind === 'tira') for (const a of L.hang.at) {
    const w = 36 * Math.max(0.8, k), h = 120 * k;
    items.push({ d: path([P(a.x - w / 2, a.y + 6), P(a.x + w / 2, a.y + 6), P(a.x + w / 2, a.y - h), P(a.x - w / 2, a.y - h)]), fill: c.contraste, stroke: '#00000030' });
  }
  for (const d of L.draw.filter(x => x.behind)) items.push({ d: path(d.poly), fill: fill(d.color), stroke: '#00000030' });
  // Body: on a fold, the drawing is the folded (front) half.
  const bound = params.acabado === 'ribete';
  items.push({ d: path(L.body), fill: c.piel, stroke: bound ? c.detalle : '#00000033', sw: bound ? Math.max(5, 0.012 * W) : undefined }, ...printOver(L.body, c, 0.07 * W));
  for (const d of L.draw.filter(x => x.under)) items.push({ d: path(d.poly), fill: fill(d.color), stroke: '#00000030' });
  for (const pk of L.pockets) {
    items.push({ d: path(pk.place), fill: fill(pk.color), stroke: '#00000040' });
    // The mouth of the pocket: a topstitched edge (the fold on the pleated strip).
    const n = pk.place.length, mouth = pk.place.map((a, i) => [a, pk.place[(i + 1) % n]] as [Pt, Pt]).filter(([a, b]) => pk.boca(a, b) || (!!pk.folds && Math.abs(a.y - b.y) < 0.5 && a.y <= Math.min(...pk.place.map(q => q.y)) + 0.5));
    for (const [a, b] of mouth) items.push({ ...line([a, b], '#00000045', 1.3), dash: '5 4' });
    for (const [a, b] of pk.dividers ?? []) items.push(line([a, b], '#00000055', 1.4));
    for (const st of pk.stitches ?? []) items.push(line(st, c.detalle, Math.max(1.4, 0.006 * W)));
    if (pk.folds) {
      // Pleated strip: show each box pleat as two soft lines on the finished pocket.
      const [x0, x1] = [Math.min(...pk.place.map(q => q.x)), Math.max(...pk.place.map(q => q.x))], [y0, y1] = [Math.min(...pk.place.map(q => q.y)), Math.max(...pk.place.map(q => q.y))];
      const n = (pk.dividers?.length ?? 0) + 1, wc = (x1 - x0) / n;
      for (let i = 0; i < n; i++) { const m = x0 + wc * (i + 0.5); items.push(line([P(m - 0.12 * wc, y0), P(m - 0.12 * wc, y1)], '#00000030', 1.2), line([P(m + 0.12 * wc, y0), P(m + 0.12 * wc, y1)], '#00000030', 1.2)); }
    }
  }
  for (const dc of L.decor) for (const poly of decorPolys(dc)) items.push({ d: path(poly), fill: fill(dc.color), stroke: '#00000030' });
  for (const e of L.emb) items.push(line(e.pts.map(([x, y]) => P(x * k, y * k)), c.detalle, Math.max(1.6, 0.006 * W)));
  for (const d of L.draw.filter(x => !x.behind && !x.under)) items.push({ d: path(d.poly), fill: fill(d.color), stroke: '#00000030' });
  for (const l of L.drawLines ?? []) items.push(line(l, c.detalle, Math.max(1.4, 0.006 * W)));
  return items;
}
