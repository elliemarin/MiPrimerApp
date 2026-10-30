import type { Drawable } from './drawable';
import { cmdsToSvg } from './paths';
import { unionBBox } from '../pdf/export';

const DASH: Record<string, string> = {
  corte: '',
  costura: '1.4 0.9',
  doblez: '3.2 0.7 0.5 0.7',
  final: '0.8 0.6',
  pespunte: '0.05 0.6',
  referencia: '',
  colocacion: '2 1',
  hilo: '',
  piquete: '',
  bordado: '1 0.4 0.2 0.4'
};
const WIDTH: Record<string, number> = { corte: 0.32, costura: 0.18, doblez: 0.26, final: 0.18, pespunte: 0.22, referencia: 0.1, colocacion: 0.16, hilo: 0.2, piquete: 0.32, bordado: 0.25 };

function esc(s: string) {
  return s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);
}

/** SVG en milímetros reales (width/height en mm) a partir de dibujos vectoriales. */
export function piecesSvg(ds: Drawable[], title: string): string {
  const b = unionBBox(ds);
  const pad = 10;
  const x = b.minX - pad;
  const y = b.minY - pad;
  const w = b.maxX - b.minX + 2 * pad;
  const h = b.maxY - b.minY + 2 * pad;
  const parts: string[] = [];
  for (const d of ds) {
    parts.push(`<g id="${esc(d.id)}"><title>${esc(d.name)}</title>`);
    for (const p of d.paths) parts.push(`<path d="${cmdsToSvg(p.cmds)}" fill="${p.fillColor&&/^#[a-f0-9]{6}$/i.test(p.fillColor)?p.fillColor:'none'}" stroke="${p.color&&/^#[a-f0-9]{6}$/i.test(p.color)?p.color:'#000'}" stroke-width="${WIDTH[p.style]}"${DASH[p.style] ? ` stroke-dasharray="${DASH[p.style]}"` : ''} data-linea="${p.style}"/>`);
    for (const g of d.grains) parts.push(`<line x1="${g.a.x}" y1="${g.a.y}" x2="${g.b.x}" y2="${g.b.y}" stroke="#000" stroke-width="0.2" data-linea="hilo"/>`);
    for (const l of d.labels) parts.push(`<text x="${l.at.x}" y="${l.at.y}" font-size="${l.size * 1.38}" font-family="Helvetica, Arial, sans-serif" text-anchor="middle"${l.bold ? ' font-weight="bold"' : ''}${l.angle ? ` transform="rotate(${l.angle} ${l.at.x} ${l.at.y})"` : ''}>${esc(l.text)}</text>`);
    parts.push('</g>');
  }
  return `<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns="http://www.w3.org/2000/svg" width="${w}mm" height="${h}mm" viewBox="${x} ${y} ${w} ${h}">\n<title>${esc(title)}</title>\n<desc>Escala 1:1. Unidades en milímetros. Generado por Hilvana.</desc>\n${parts.join('\n')}\n</svg>\n`;
}
