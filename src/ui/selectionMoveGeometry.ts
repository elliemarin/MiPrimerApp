import { bboxOf, type BBox, type Pt } from '../lib/geom/vec';

export const MOVE_HANDLE_SIZE = 48;
const GAP = 8;
const INSET = 6;

export interface MoveHandlePosition extends Pt {
  side: 'above' | 'below' | 'left' | 'right';
}

/** All arguments are screen/CSS pixels, never garment measurements. */
export function selectionMovePosition(corners: readonly Pt[], viewport: BBox): MoveHandlePosition | undefined {
  if (!corners.length || corners.some(p => !Number.isFinite(p.x) || !Number.isFinite(p.y))
    || Object.values(viewport).some(value => !Number.isFinite(value))) return;
  const half = MOVE_HANDLE_SIZE / 2;
  const minX = viewport.minX + INSET + half, maxX = viewport.maxX - INSET - half;
  const minY = viewport.minY + INSET + half, maxY = viewport.maxY - INSET - half;
  // Hidden/undersized previews cannot offer a complete touch target.
  if (minX > maxX || minY > maxY) return;
  const bounds = bboxOf([...corners]);
  const x = Math.max(minX, Math.min(maxX, (bounds.minX + bounds.maxX) / 2));
  const y = Math.max(minY, Math.min(maxY, (bounds.minY + bounds.maxY) / 2));
  const above = bounds.minY - GAP - half, below = bounds.maxY + GAP + half;
  const left = bounds.minX - GAP - half, right = bounds.maxX + GAP + half;
  const clampX = (value: number) => Math.max(minX, Math.min(maxX, value));
  const clampY = (value: number) => Math.max(minY, Math.min(maxY, value));
  // Prefer Word-style placement above, then below. Side placement preserves
  // small objects near the edges instead of covering their artwork.
  if (above >= minY) return { x, y: clampY(above), side: 'above' };
  if (below <= maxY) return { x, y: clampY(below), side: 'below' };
  if (right <= maxX) return { x: clampX(right), y, side: 'right' };
  if (left >= minX) return { x: clampX(left), y, side: 'left' };
  // A selection covering the entire preview necessarily overlaps the handle.
  // Keep the control reachable; never change the selected object's geometry.
  return { x, y: minY, side: 'above' };
}
