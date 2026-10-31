import type { Fabric } from '../../store/types';
import type { DesignDoc, DesignView } from '../../features/studio/model';
import { elementWorldCmds } from '../../features/studio/model';
import { cmdsToSvg } from './paths';
import { elementImage, visibleDesignElement } from './designImage';

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);

/** Vista del diseño como SVG en milímetros (colores planos, sin texturas). */
export function viewToSvg(doc: DesignDoc, view: DesignView, fabrics: Record<string, Fabric>, imageUrls:Record<string,string>={}): string {
  const parts: string[] = [];
  for (const z of view.zones) {
    const f = view.zoneFills?.[z.id];
    const fill = f?.type === 'color' ? f.color : f?.type === 'tela' ? fabrics[f.fabricId]?.color ?? '#fff' : view.source.type === 'foto' ? 'none' : '#fff';
    parts.push(`<path d="${z.d}" fill="${fill}" stroke="#1d2420" stroke-width="0.6" data-zona="${esc(z.label)}"/>`);
  }
  for (const d of view.details ?? []) parts.push(`<path d="${d.d}" fill="none" stroke="#1d2420" stroke-width="0.35"${d.style === 'pespunte' ? ' stroke-dasharray="1.5 1.2"' : ''}/>`);
  for (const e of doc.elements.filter((x) => x.viewId === view.id && visibleDesignElement(x,doc) && x.kind !== 'grupo')) {
    const image=elementImage(e);
    if(image&&imageUrls[image.fileId]) {
      parts.push(`<image href="${esc(imageUrls[image.fileId])}" x="0" y="0" width="1" height="1" preserveAspectRatio="none" transform="matrix(${image.matrix.join(' ')})" data-elemento="${esc(e.name)}"/>`);
      continue;
    }
    const fill = e.fill.type === 'color' ? e.fill.color : e.fill.type === 'tela' ? fabrics[e.fill.fabricId]?.color ?? '#ccc' : 'none';
    const stroke = e.stroke ? `stroke="${e.stroke.color}" stroke-width="${e.stroke.width}"` : 'stroke="#1d2420" stroke-width="0.3"';
    parts.push(`<path d="${cmdsToSvg(elementWorldCmds(e))}" fill="${e.kind === 'trazo' && !e.path?.closed ? 'none' : fill}" ${stroke} data-elemento="${esc(e.name)}" data-tecnica="${e.technique}"/>`);
  }
  return `<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns="http://www.w3.org/2000/svg" width="${view.width}mm" height="${view.height}mm" viewBox="${view.minX} ${view.minY} ${view.width} ${view.height}">\n<title>${esc(view.label)}</title>\n${parts.join('\n')}\n</svg>\n`;
}
