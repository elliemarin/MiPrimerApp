import type { DesignDoc, DesignElement, DesignView } from '../studio/model';
import { elementCorners } from '../studio/model';
import { editElement } from '../studio/ops';
import { parseSvgPath } from '../../lib/draw/svgpath';
import { cmdsToPolylines } from '../../lib/draw/flatten';
import { distToSegment, pointInPolygon, segIntersect, type BBox, type Pt } from '../../lib/geom/vec';

/** The assembled illustration never replaces these millimetre coordinates. */
export function embroideryFitsView(element: DesignElement, view: DesignView, visibleBounds?: BBox): boolean {
  const corners = elementCorners(element);
  if (visibleBounds && corners.some(point => point.x < visibleBounds.minX || point.x > visibleBounds.maxX || point.y < visibleBounds.minY || point.y > visibleBounds.maxY)) return false;
  const contour = view.outline ?? view.zones[0]?.d;
  if (!contour) return true;
  const polygons = cmdsToPolylines(parseSvgPath(contour), .2).map(poly => poly.pts);
  const inside = (point: Pt) => polygons.some(poly => poly.some((a, index) => distToSegment(point, a, poly[(index + 1) % poly.length]) < .1)) ||
    polygons.filter(poly => pointInPolygon(point, poly)).length % 2 === 1;
  return corners.every((point, index) => {
    if (!inside(point)) return false;
    const next = corners[(index + 1) % corners.length];
    const fractions = [0, 1, ...polygons.flatMap(poly => poly.flatMap((a, edge) => {
      const hit = segIntersect(point, next, a, poly[(edge + 1) % poly.length]);
      return hit ? [Math.max(0, Math.min(1, hit.t))] : [];
    }))].sort((a, b) => a - b);
    return fractions.slice(1).every((value, interval) => {
      const fraction = (value + fractions[interval]) / 2;
      return inside({ x: point.x + (next.x - point.x) * fraction, y: point.y + (next.y - point.y) * fraction });
    });
  });
}

export function embroideryTreeIds(doc: DesignDoc, rootId: string): Set<string> {
  const ids = new Set([rootId]);
  let changed = true;
  while (changed) {
    changed = false;
    for (const element of doc.elements) if (element.parentId && ids.has(element.parentId) && !ids.has(element.id)) {
      ids.add(element.id); changed = true;
    }
  }
  return ids;
}

/** Move all colours/letter contours together, including between mirrored sides.
 * Width and height remain physical: a visual transform never scales the pattern.
 */
export function moveEmbroidery(doc: DesignDoc, id: string, point: Pt, viewId: string,
  surface?: { id: string; label: string }): DesignDoc {
  const ids = embroideryTreeIds(doc, id);
  const moved = editElement(doc, id, { x: point.x, y: point.y });
  return { ...moved, elements: moved.elements.map(element => ids.has(element.id) ? {
    ...element, viewId, assemblySurfaceId: surface?.id, assemblySurfaceLabel: surface?.label
  } : element) };
}

export function firstEmbroideryPosition(element: DesignElement, view: DesignView, preferred?: Pt, visibleBounds?: BBox): Pt | undefined {
  const candidates = [...(preferred ? [preferred] : [])];
  const area = visibleBounds ?? { minX: view.minX, minY: view.minY, maxX: view.minX + view.width, maxY: view.minY + view.height };
  for (const fy of [.5, .35, .65, .2, .8]) for (const fx of [.5, .35, .65, .2, .8])
    candidates.push({ x: area.minX + (area.maxX - area.minX) * fx, y: area.minY + (area.maxY - area.minY) * fy });
  return candidates.find(point => embroideryFitsView({ ...element, ...point }, view, visibleBounds));
}
