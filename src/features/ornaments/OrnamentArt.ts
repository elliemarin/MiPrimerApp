import type { GeneratorResult, Params } from '../../lib/pattern/generator';
import { ornamentLayout } from '../../lib/pattern/generators/ornaments';
import { polysPath } from '../../lib/applique/figure';
import type { PlushCard } from '../../data/toys';
import { line, printOver, type Item } from '../toys/art';

/* Dibujo de los adornos navideños desde su trazado: las piezas entre capas
 * detrás, el cuerpo, los apliques con su puntada a la vista, los bordados y la
 * presilla de cinta. */

const shade = (hex: string, k: number) => { const n = parseInt(hex.slice(1, 7), 16), f = (v: number) => Math.max(0, Math.min(255, Math.round(v * k))); return `#${[(n >> 16) & 255, (n >> 8) & 255, n & 255].map(v => f(v).toString(16).padStart(2, '0')).join('')}`; };
const light = (hex: string) => { const n = parseInt(hex.slice(1, 7), 16); return 0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255) > 170; };

export function ornamentScene(card: PlushCard, result: GeneratorResult | null, params: Params): Item[] {
  if (!result?.pieces.length) return [];
  let L;
  try { L = ornamentLayout(card.generatorId, params); } catch { return []; }
  const c = card.colors, stocking = card.generatorId === 'bota-navidena', patchwork = card.generatorId === 'adorno-arbol-retales';
  const color: Record<string, string> = {
    cuerpo: c.ropa, nieve: c.piel, chimenea: c.detalle, puerta: c.detalle, acento: c.contraste, cuerno: '#5a3a26', tronco: '#6b4a33', madera: '#c9a26b',
    margen: shade(c.ropa, 0.9), parche: c.contraste, puno: c.piel, reno: '#c08a55', 'reno-claro': '#d9a873', cinta: stocking ? c.detalle : '#c8423b', numero: c.ropa2 ?? '#fbf8f1',
    blanco: '#fbf8f1', rojo: '#c8423b', verde: '#2f6b45', amarillo: '#f2c94c', rosa: '#f0b3b8', crema: '#f4ead8', oscuro: '#2b2b2b', negro: '#1f1f1f', dorado: '#d4a93c', mejilla: '#f0a8a8'
  };
  const fill = (role: string) => color[role] ?? role;
  const items: Item[] = [];
  for (const a of L.art) {
    if (a.line) {
      const col = a.role === 'hilo' ? (a.stitchOn && light(fill(a.stitchOn)) ? '#b9ae9c' : '#fbf8f1') : fill(a.role);
      items.push({ ...line(a.closed ? [...a.pts, a.pts[0]] : a.pts, col, a.line), ...(a.dash ? { dash: `${(a.line * 2.4).toFixed(2)} ${(a.line * 1.7).toFixed(2)}` } : {}) });
      continue;
    }
    items.push({ d: polysPath(a.rings ?? [a.pts]), fill: fill(a.role), stroke: '#00000028' });
    if ((patchwork && a.role === 'cuerpo') || a.role === 'parche') items.push(...printOver(a.pts, c, (patchwork ? 0.06 : 0.04) * Math.max(...L.art.flatMap(x => x.pts.map(q => q.y)))));
  }
  return items;
}
