import type { Pt } from '../../lib/geom/vec';
import type { Params } from '../../lib/pattern/generator';
import { seamPolygon } from '../../lib/pattern/outline';
import { plush } from '../../lib/pattern/generators/toyKit';
import { dollhouseLayout, placeSlot } from '../../lib/pattern/generators/dollhouses';
import { furniture, type Role } from '../../lib/pattern/generators/dollFurniture';
import { polysPath } from '../../lib/applique/figure';
import type { PlushCard } from '../../data/toys';
import { P, line, printOver, type Item } from './art';

/* Dibujo de las casitas de muñecas abiertas: el mismo trazado que el patrón
 * (paredes, muebles en su sitio, asas, dobleces y separaciones). */

export function dollhouseScene(card: PlushCard, params: Params): Item[] {
  const c = card.colors;
  const color: Record<Role, string> = {
    pared: c.piel, suelo: c.ropa, tela1: c.contraste, tela2: c.ropa2 ?? c.contraste, madera: c.detalle, blanco: '#fbf8f1', metal: '#b9bfc4', espejo: '#dfe8ee',
    verde: '#8fb07c', agua: '#bcdbe6', noche: '#2f3b62', amarillo: '#f2c94c', rosa: '#f0b3b8'
  };
  let L;
  try { L = dollhouseLayout(card.generatorId, params); } catch { return []; }
  if (card.generatorId === 'casita-cubo') return cubeScene(L, c, color);
  const items: Item[] = [], front: Item[] = [];
  for (const panel of L.panels.filter(x => x.show)) {
    const [ox, oy] = panel.show!, move = (q: Pt) => P(q.x + ox, q.y + oy);
    const poly = seamPolygon(plush('vista', 'vista', panel.anchors, { k: 1, sa: 0, felt: true }), 0.5).map(move);
    const outside = panel.fabric === 'contraste';
    items.push({ d: polysPath([poly]), fill: outside ? c.ropa : c.piel, stroke: '#00000030' }, ...(outside ? [] : printOver(poly, c, 26 * L.s0)));
    if (outside && card.generatorId === 'casita-libro' && params.forma === 'calabaza') {
      // Stem and leaf on the front pumpkin (the left one, seen from outside).
      const W = L.size[0], top = Math.min(...poly.map(q => q.y)), x = ox + (W - 22 * L.s0) / 4;
      items.unshift({ d: polysPath([[P(x - 12 * L.s0, top + 14 * L.s0), P(x + 12 * L.s0, top + 14 * L.s0), P(x + 14 * L.s0, top - 30 * L.s0), P(x - 8 * L.s0, top - 34 * L.s0)]]), fill: '#8aa36a', stroke: '#00000030' });
      front.push({ d: polysPath([Array.from({ length: 24 }, (_, i) => { const t = (i / 24) * 2 * Math.PI; return P(x - 34 * L.s0 + Math.cos(t) * 30 * L.s0, top + 6 * L.s0 + Math.sin(t) * 18 * L.s0); })]), fill: c.ropa2 ?? '#a9c5a0', stroke: '#00000040' });
    }
    for (const l of panel.lines ?? []) {
      if (l.id.startsWith('separacion')) items.push(line([move(l.a), move(l.b)], '#fbf6ec', 9 * L.s0));
      else if (l.kind === 'pespunte' || l.kind === 'doblez') items.push({ ...line([move(l.a), move(l.b)], '#00000030', 1.4), dash: '5 4' });
    }
    for (const m of panel.marks ?? []) if (m.id.startsWith('asa') && !m.id.startsWith('asa-b')) {
      const twin = (panel.marks ?? []).filter(x => x.id.startsWith('asa-') && !x.id.startsWith('asa-b') && x !== m);
      const other = twin.find(x => Math.abs(x.at.y - m.at.y) < 1 && x.at.x > m.at.x);
      if (other) { const a = move(m.at), b = move(other.at), up = a.y < (L.size[1] / 2) ? -1 : 1, h = Math.abs(b.x - a.x) * 0.7; items.unshift({ d: `M${a.x} ${a.y} C${a.x} ${a.y + up * h} ${b.x} ${b.y + up * h} ${b.x} ${b.y}`, stroke: c.detalle, sw: 14 * L.s0 }); }
    }
    for (const m of panel.marks ?? []) if (m.id.startsWith('asa-b')) {
      const other = (panel.marks ?? []).find(x => x.id.startsWith('asa-b') && x !== m && x.at.x > m.at.x && Math.abs(x.at.y - m.at.y) < 1);
      if (other) { const a = move(m.at), b = move(other.at), h = Math.abs(b.x - a.x) * 0.7; items.unshift({ d: `M${a.x} ${a.y} C${a.x} ${a.y + h} ${b.x} ${b.y + h} ${b.x} ${b.y}`, stroke: c.detalle, sw: 14 * L.s0 }); }
    }
    for (const slot of panel.slots) {
      const pl = placeSlot(slot, L.s0);
      for (const pp of pl.parts) {
        const pts = pp.pts.map(move);
        front.push({ d: polysPath([pts]), fill: color[pp.part.role], stroke: '#00000038' });
        for (const [a, b] of pp.lines) front.push(line([move(a), move(b)], '#00000055', 1.2));
        for (const [a, b] of pp.wall) front.push(line([move(a), move(b)], '#3b2a1a', 1.4));
      }
    }
  }
  // The little felt doll waits beside the house.
  if (L.loose.includes('muneca')) {
    const f = furniture('muneca'), s = L.s0, x0 = L.size[0] + 50 * s, y0 = L.size[1];
    for (const part of f.parts) front.push({ d: polysPath([part.poly.map(q => P(x0 + q.x * s, y0 + q.y * s))]), fill: color[part.role], stroke: '#00000038' });
  }
  return [...items, ...front];
}

/** The cube house seen from the front with its front flap down as a garden. */
function cubeScene(L: ReturnType<typeof dollhouseLayout>, c: PlushCard['colors'], color: Record<Role, string>): Item[] {
  const strip = L.panels.find(p => p.id === 'franja-interior')!, xs = strip.anchors.map(a => a[0]), A = Math.max(...xs);
  const lines = strip.lines ?? [], fold = (i: number) => lines.find(l => l.id === `pliegue-${i}`)!.a.y;
  const r = fold(0), wallTop = fold(1), yWall = fold(2), yFloor = fold(3), Lt = Math.max(...strip.anchors.map(a => a[1])), Hw = yWall - wallTop, F = yFloor - yWall, s = L.s0;
  const depth = 0.35 * F, side = 0.16 * A, items: Item[] = [];
  // Back wall at the origin, roof above it, floor and the open front below.
  const roofTop = -0.75 * r;
  items.push({ d: polysPath([[P(-side, depth * 0.2), P(0, 0), P(0, Hw), P(-side, Hw + depth)]]), fill: c.piel, stroke: '#00000030' }, { d: polysPath([[P(A + side, depth * 0.2), P(A, 0), P(A, Hw), P(A + side, Hw + depth)]]), fill: c.piel, stroke: '#00000030' });
  items.push({ d: `M${0.25 * A} ${roofTop} C${0.25 * A} ${roofTop - 0.9 * A} ${0.75 * A} ${roofTop - 0.9 * A} ${0.75 * A} ${roofTop}`, stroke: c.detalle, sw: 14 * s });
  items.push({ d: polysPath([[P(-side - 8 * s, depth * 0.2), P(0.1 * A, roofTop), P(0.9 * A, roofTop), P(A + side + 8 * s, depth * 0.2)]]), fill: c.ropa, stroke: '#00000030' });
  items.push({ d: polysPath([[P(0, 0), P(A, 0), P(A, Hw), P(0, Hw)]]), fill: c.piel, stroke: '#00000030' }, ...printOver([P(0, 0), P(A, 0), P(A, Hw), P(0, Hw)], c, 26 * s));
  items.push({ d: polysPath([[P(0, Hw), P(A, Hw), P(A + side, Hw + depth), P(-side, Hw + depth)]]), fill: '#e7dccb', stroke: '#00000030' });
  const flapH = 0.6 * Hw;
  items.push({ d: polysPath([[P(-side, Hw + depth), P(A + side, Hw + depth), P(A + side * 1.4, Hw + depth + flapH), P(-side * 1.4, Hw + depth + flapH)]]), fill: c.piel, stroke: '#00000030' });
  for (const slot of strip.slots) {
    const pl = placeSlot(slot, L.s0), mapY = (y: number) => (y < yWall ? y - wallTop : y < yFloor ? Hw + ((y - yWall) / F) * depth : Hw + depth + ((y - yFloor) / (Lt - yFloor)) * flapH);
    for (const pp of pl.parts) items.push({ d: polysPath([pp.pts.map(q => P(q.x, mapY(q.y)))]), fill: color[pp.part.role], stroke: '#00000038' });
  }
  // Loose bed on the floor and the doll beside it.
  items.push({ d: polysPath([[P(0.56 * A, Hw + 0.2 * depth), P(0.92 * A, Hw + 0.2 * depth), P(0.95 * A, Hw + 0.9 * depth), P(0.53 * A, Hw + 0.9 * depth)]]), fill: color.tela2, stroke: '#00000038' }, { d: polysPath([[P(0.6 * A, Hw + 0.25 * depth), P(0.72 * A, Hw + 0.25 * depth), P(0.72 * A, Hw + 0.5 * depth), P(0.6 * A, Hw + 0.5 * depth)]]), fill: '#fbf8f1', stroke: '#00000038' });
  const f = furniture('muneca');
  for (const part of f.parts) items.push({ d: polysPath([part.poly.map(q => P(0.25 * A + q.x * s * 0.8, Hw + 0.85 * depth + q.y * s * 0.8))]), fill: color[part.role], stroke: '#00000038' });
  return items;
}
