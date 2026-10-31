import type { DesignView } from '../studio/model';
import type { PatternComponent } from '../../lib/pattern/components';
import { generateComponents } from '../../lib/pattern/components';
import type { Piece } from '../../lib/pattern/types';
import type { Pt } from '../../lib/geom/vec';

/** SVG's screen CTM includes viewBox letterboxing and page scroll. Only an
 * already captured move may continue outside; insert/drop keeps the default. */
export function pointInPreview(svg: SVGSVGElement | null, x: number, y: number, allowOutside = false): Pt | undefined {
  if (!svg) return;
  const box = svg.getBoundingClientRect();
  if (!allowOutside && (x < box.left || x > box.right || y < box.top || y > box.bottom)) return;
  const matrix = svg.getScreenCTM();
  if (!matrix) return;
  const inverse = matrix.inverse();
  const point = { x: inverse.a * x + inverse.c * y + inverse.e, y: inverse.b * x + inverse.d * y + inverse.f };
  return Number.isFinite(point.x) && Number.isFinite(point.y) ? point : undefined;
}

/** Convert a screen-pixel movement to SVG units without introducing an origin. */
export function previewDelta(svg: SVGSVGElement | null, deltaPixels: Pt): Pt | undefined {
  const matrix = svg?.getScreenCTM();
  if (!matrix) return;
  const inverse = matrix.inverse();
  const delta = { x: inverse.a * deltaPixels.x + inverse.c * deltaPixels.y, y: inverse.b * deltaPixels.x + inverse.d * deltaPixels.y };
  return Number.isFinite(delta.x) && Number.isFinite(delta.y) ? delta : undefined;
}

export function componentAtPoint(component: PatternComponent, view: DesignView, point: Pt): PatternComponent {
  return { ...component, placement: { ...component.placement, viewId: view.id,
    pieceId: view.source.type === 'pieza' ? view.source.pieceId : undefined,
    x: point.x, y: point.y, label: component.placement?.label ?? view.label.replace(/^Patrón real · /, '') } };
}

/** Reuse the construction engine's concavity-aware fit test. No visual scaling. */
export function componentFits(component: PatternComponent, view: DesignView, pieces: Piece[]): boolean {
  if (view.source.type !== 'pieza') return true;
  return !generateComponents([component], pieces).notices.some(issue => issue.level === 'error');
}

export function componentPlacementProblem(component: PatternComponent, view: DesignView, pieces: Piece[]): string | undefined {
  return generateComponents([component], view.source.type === 'pieza' ? pieces : []).notices.find(issue => issue.level === 'error')?.message;
}

/** An initial insertion searches physical positions, without changing the selected dimensions. */
export function firstFittingPosition(component: PatternComponent, view: DesignView, pieces: Piece[], near?: Pt): PatternComponent | undefined {
  const centre = near ?? { x: view.minX + view.width / 2, y: view.minY + view.height / 2 };
  const candidate = componentAtPoint(component, view, centre);
  if (componentFits(candidate, view, pieces)) return candidate;
  if (view.source.type !== 'pieza') return candidate;
  const piece = pieces.find(item => view.source.type === 'pieza' && item.id === view.source.pieceId);
  if (!piece) return;
  const xs = piece.nodes.map(node => node.x), ys = piece.nodes.map(node => node.y);
  const minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys), maxY = Math.max(...ys);
  const fractions = [.2, .35, .5, .65, .8, .1, .9];
  const points = fractions.flatMap(fy => fractions.map(fx => ({ x: minX + (maxX - minX) * fx, y: minY + (maxY - minY) * fy })));
  points.sort((a, b) => Math.hypot(a.x - centre.x, a.y - centre.y) - Math.hypot(b.x - centre.x, b.y - centre.y));
  for (const point of points) {
    const placed = componentAtPoint(component, view, point);
    if (componentFits(placed, view, pieces)) return placed;
  }
}
