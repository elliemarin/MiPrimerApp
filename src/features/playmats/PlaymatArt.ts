import type { GeneratorResult, Params } from '../../lib/pattern/generator';
import { playmatArt } from '../../lib/pattern/generators/playmats';
import { polysPath } from '../../lib/applique/figure';
import type { PlushCard } from '../../data/toys';
import { line, printOver, type Item } from '../toys/art';

/* Dibujo de los tapetes con el mismo trazado que el patrón: silueta, líneas
 * de acolchado, apliques, bandas o cuadros y elementos sensoriales. */

export function playmatScene(card: PlushCard, result: GeneratorResult | null, params: Params): Item[] {
  if (!result?.pieces.length) return [];
  let art;
  try { art = playmatArt(card.generatorId, params); } catch { return []; }
  const c = card.colors, xs = art.flatMap(a => a.pts.map(q => q.x)), W = Math.max(...xs) - Math.min(...xs);
  const color: Record<string, string> = {
    base: c.piel, tela1: c.contraste, tela2: c.ropa2 ?? c.contraste, detalle: c.detalle, blanco: '#fbf8f1', noche: '#2f3340', verde: '#8fb07c', agua: '#bcdbe6',
    rosa: '#f0b3b8', amarillo: '#f2c94c', naranja: '#e8833a', madera: '#9a6b45', lila: '#c9b6e4', textura: c.ropa2 ?? '#ece4d8'
  };
  const items: Item[] = [];
  for (const a of art) {
    const col = color[a.role] ?? a.role;
    if (a.line) { items.push({ ...line(a.pts, a.role === 'detalle' ? `${c.detalle}99` : col, Math.max(a.line, a.dash ? 0.0035 * W : a.line)), ...(a.dash ? { dash: `${(0.012 * W).toFixed(1)} ${(0.008 * W).toFixed(1)}` } : {}) }); continue; }
    items.push({ d: polysPath([a.pts]), fill: col, stroke: '#00000030' });
    if (a.role === 'base') items.push(...printOver(a.pts, c, 0.05 * W));
    if (a.role === 'textura') items.push(...printOver(a.pts, { ...c, print: 'lunares', ropa2: '#ffffff' }, 0.025 * W));
  }
  return items;
}
