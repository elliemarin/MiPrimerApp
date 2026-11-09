import type { GeneratorResult, Params } from '../../lib/pattern/generator';
import { playhouseLayout } from '../../lib/pattern/generators/playhouses';
import { polysPath } from '../../lib/applique/figure';
import type { PlushCard } from '../../data/toys';
import { line, printOver, type Item } from '../toys/art';

/* Dibujo de las casitas de juego desde su trazado: tejado y pared de rincón de
 * frente, o funda de mesa con su lateral en perspectiva. */

const shade = (hex: string, k: number) => { const n = parseInt(hex.slice(1, 7), 16), f = (v: number) => Math.max(0, Math.min(255, Math.round(v * k))); return `#${[(n >> 16) & 255, (n >> 8) & 255, n & 255].map(v => f(v).toString(16).padStart(2, '0')).join('')}`; };

export function playhouseScene(card: PlushCard, result: GeneratorResult | null, params: Params): Item[] {
  if (!result?.pieces.length) return [];
  let L;
  try { L = playhouseLayout(card.generatorId, params); } catch { return []; }
  const c = card.colors, valance = c.ropa2 ?? c.contraste, xs = L.art.flatMap(a => a.pts.map(q => q.x)), W = Math.max(...xs) - Math.min(...xs);
  const color: Record<string, string> = {
    tejado: c.ropa, 'tejado-rayas': c.ropa, pared: c.piel, 'pared-rayas': c.piel, 'pared-sombra': shade(c.piel, 0.86), 'pared-rayas-sombra': shade(c.piel, 0.86), techo: shade(c.ropa, 1.04),
    faldon: valance, 'faldon-lunares': valance, 'faldon-sombra': shade(valance, 0.86), cortina: c.contraste, 'cortina-lunares': c.contraste, hueco: '#4a4038', contraste: c.contraste,
    barra: '#b58b5a', 'pared-borde': c.detalle, blanco: '#fbf8f1', rojo: '#d9473f', rosa: '#f0b3b8', amarillo: '#f2c94c', azul: '#3c6fb4', verde: '#7fa66a', naranja: '#e8833a', lila: '#c9b6e4', gris: '#9a97a1', negro: '#2b2b2b'
  };
  const stripes = { ...c, print: 'rayas' as const, ropa2: c.ropa2 ?? '#fbf8f1' }, dots = { ...c, print: 'lunares' as const, ropa2: '#ffffff' };
  const items: Item[] = [];
  for (const a of L.art) {
    const col = color[a.role] ?? a.role;
    if (a.line) { items.push(line(a.closed ? [...a.pts, a.pts[0]] : a.pts, col, Math.max(a.line, 0.004 * W))); continue; }
    items.push({ d: polysPath([a.pts]), fill: col, stroke: '#00000030' });
    if (a.role.includes('rayas')) items.push(...printOver(a.pts, stripes, 0.06 * W));
    if (a.role.includes('lunares')) items.push(...printOver(a.pts, dots, 0.03 * W));
    if (a.role === 'tejado' || a.role.startsWith('pared') || a.role === 'techo') items.push(...printOver(a.pts, c, 0.05 * W));
  }
  return items;
}
