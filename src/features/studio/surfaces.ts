import { Pt, pointInPolygon } from '../../lib/geom/vec';
import { cmdsToPolylines } from '../../lib/draw/flatten';
import { parseSvgPath } from '../../lib/draw/svgpath';
import { DesignDoc, DesignView, Fill, elementLocalCmds, isClosedShape } from './model';
import { toLocal, updateElements } from './ops';

export type Surface = { kind: 'elemento' | 'zona'; id: string; label: string };

/** SVG uses the nonzero fill rule: preserve holes and compound contours. */
function contains(polys: Pt[][], p: Pt): boolean {
  let winding = 0;
  for (const poly of polys) for (let i = 0; i < poly.length; i++) {
    const a = poly[i], b = poly[(i + 1) % poly.length];
    const cross = (b.x - a.x) * (p.y - a.y) - (p.x - a.x) * (b.y - a.y);
    if (a.y <= p.y && b.y > p.y && cross > 0) winding++;
    if (a.y > p.y && b.y <= p.y && cross < 0) winding--;
  }
  return winding !== 0;
}

export function surfaceAt(doc: DesignDoc, view: DesignView, p: Pt): Surface | undefined {
  const inZone = (id: string) => {
    const zone = view.zones.find(z => z.id === id);
    return !!zone && contains(cmdsToPolylines(parseSvgPath(zone.d), 0.3).map(c => c.pts), p);
  };
  // Last element is on top; hit the real contour rather than its bounding box.
  for (const el of [...doc.elements].reverse()) {
    if (el.viewId !== view.id || el.hidden || el.locked || !isClosedShape(el) || el.kind === 'imagen' || el.kind === 'parche') continue;
    if (el.parentId && doc.elements.some(g => g.id === el.parentId && (g.hidden || g.locked))) continue;
    if (el.maskZoneId && !inZone(el.maskZoneId)) continue;
    const local = toLocal(el, p);
    if (el.clip && !pointInPolygon({ x: local.x / el.w, y: local.y / el.h }, el.clip.map(([x,y]) => ({x,y})))) continue;
    if (contains(cmdsToPolylines(elementLocalCmds(el), 0.3).map(c => c.pts), local)) return { kind: 'elemento', id: el.id, label: el.name };
  }
  for (const zone of [...view.zones].reverse()) if (inZone(zone.id)) return { kind: 'zona', id: zone.id, label: zone.label };
  return undefined;
}

export function fillSurface(doc: DesignDoc, viewId: string, target: Surface, fill: Fill): DesignDoc {
  if (target.kind === 'elemento') return updateElements(doc, [target.id], el => el.locked ? el : ({ ...el, fill }));
  return { ...doc, views: doc.views.map(view => view.id === viewId ? { ...view, zoneFills: { ...view.zoneFills, [target.id]: fill } } : view) };
}
