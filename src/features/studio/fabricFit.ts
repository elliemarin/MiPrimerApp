import type { Fabric } from '../../store/types';
import type { Fill } from './model';
import type { BBox } from '../../lib/geom/vec';
import { bboxOf } from '../../lib/geom/vec';
import { parseSvgPath } from '../../lib/draw/svgpath';
import { cmdsToPolylines } from '../../lib/draw/flatten';

export function fabricRepeat(f: Fabric): { w: number; h: number } {
  const pxW = f.photo?.pxW ?? 1000;
  const pxH = f.photo?.pxH ?? 1000;
  if (f.calibration) return { w: pxW * f.calibration.mmPerPx, h: pxH * f.calibration.mmPerPx };
  const k = f.visualRepeatMm / Math.max(pxW, pxH);
  return { w: pxW * k, h: pxH * k };
}

export function pathBounds(d: string): BBox {
  return bboxOf(cmdsToPolylines(parseSvgPath(d), 0.3).flatMap(p => p.pts));
}

/** Cover a zone with one photograph without deforming its aspect ratio.
 * This is a visual composition transform, never a change to pattern sizing. */
export function coverFabric(fill: Extract<Fill, {type:'tela'}>, fabric: Fabric, bounds: BBox): Extract<Fill, {type:'tela'}> {
  const repeat = fabricRepeat(fabric);
  const width = bounds.maxX - bounds.minX, height = bounds.maxY - bounds.minY;
  if (![width,height,repeat.w,repeat.h].every(v => Number.isFinite(v) && v > 0)) return fill;
  const scale = Math.max(width / repeat.w, height / repeat.h);
  return { ...fill, rotation: -fabric.grainAngle, scale,
    offsetX: bounds.minX + (width - repeat.w * scale) / 2,
    offsetY: bounds.minY + (height - repeat.h * scale) / 2 };
}
