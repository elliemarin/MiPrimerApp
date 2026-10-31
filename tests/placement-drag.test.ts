import { describe, expect, it } from 'vitest';
import { pointInPreview, previewDelta } from '../src/features/customize/placementDrag';
import { matApply, matInvert, type Mat } from '../src/lib/geom/vec';

function preview(matrix: Mat): SVGSVGElement {
  const [a, b, c, d, e, f] = matInvert(matrix);
  return {
    getBoundingClientRect: () => ({ left: 10, top: 20, right: 330, bottom: 250 }),
    getScreenCTM: () => ({ inverse: () => ({ a, b, c, d, e, f }) })
  } as unknown as SVGSVGElement;
}

describe('coordenadas de arrastre en el visor', () => {
  it('mantiene inserciones y drops dentro del SVG por defecto', () => {
    const svg = preview([.5, 0, 0, .5, 10, 20]);
    expect(pointInPreview(svg, 5, 50)).toBeUndefined();
    expect(pointInPreview(svg, 100, 300)).toBeUndefined();
    expect(pointInPreview(svg, 10, 20)).toEqual({ x: 0, y: 0 });
    expect(pointInPreview(svg, 330, 250)).toEqual({ x: 640, y: 460 });
  });

  it('continúa un movimiento capturado fuera del SVG sin perder el offset del asa', () => {
    const svg = preview([.5, 0, 0, .5, 10, 20]);
    const center = { x: 100, y: 90 };
    const down = pointInPreview(svg, 60, 30)!;
    const offset = { x: down.x - center.x, y: down.y - center.y };
    const outside = pointInPreview(svg, 70, 10, true)!;
    expect({ x: outside.x - offset.x, y: outside.y - offset.y }).toEqual({ x: 120, y: 50 });
    expect(pointInPreview(svg, 70, 10)).toBeUndefined();
  });

  it('incluye scroll/letterboxing y transformaciones afines al recuperar el punto', () => {
    const matrix: Mat = [0, .5, -.75, 0, 200, 50];
    const source = { x: 100, y: 120 }, screen = matApply(matrix, source);
    const recovered = pointInPreview(preview(matrix), screen.x, screen.y)!;
    expect(recovered.x).toBeCloseTo(source.x, 9);
    expect(recovered.y).toBeCloseTo(source.y, 9);
  });

  it('convierte flechas a unidades del SVG sin mezclar el origen o invertir el movimiento', () => {
    const svg = preview([0, .5, -.75, 0, 200, 50]);
    expect(previewDelta(svg, { x: 0, y: 10 })).toEqual({ x: 20, y: 0 });
    expect(previewDelta(svg, { x: -3, y: 0 })).toEqual({ x: 0, y: 4 });
    expect(previewDelta(preview([2, 0, 0, 2, 10, 20]), { x: 1, y: 0 })).toEqual({ x: .5, y: 0 });
  });

  it('omite visores desmontados o transformaciones degeneradas', () => {
    expect(pointInPreview(null, 20, 30)).toBeUndefined();
    expect(previewDelta(null, { x: 1, y: 0 })).toBeUndefined();
    expect(pointInPreview(preview([0, 0, 0, 0, 0, 0]), 20, 30)).toBeUndefined();
    expect(previewDelta(preview([0, 0, 0, 0, 0, 0]), { x: 1, y: 0 })).toBeUndefined();
  });
});
