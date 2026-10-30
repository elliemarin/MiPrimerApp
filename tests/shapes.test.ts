import { describe, expect, it } from 'vitest';
import { filterShapes, findShape, ORGANIC_SHAPES, SHAPE_CATEGORY_LABEL } from '../src/data/shapes';
import { parseSvgPath } from '../src/lib/draw/svgpath';
import { cmdsToPolylines } from '../src/lib/draw/flatten';

describe('Biblioteca original de motivos', () => {
  it('ofrece un catálogo amplio con ids estables y todas sus familias', () => {
    expect(ORGANIC_SHAPES.length).toBeGreaterThanOrEqual(100);
    expect(new Set(ORGANIC_SHAPES.map((s) => s.id)).size).toBe(ORGANIC_SHAPES.length);
    expect(new Set(ORGANIC_SHAPES.map((s) => s.d)).size).toBe(ORGANIC_SHAPES.length);
    for (const category of Object.keys(SHAPE_CATEGORY_LABEL)) {
      expect(ORGANIC_SHAPES.some((s) => s.category === category)).toBe(true);
    }
    expect(findShape('hongo')?.label).toBe('Hongo');
    expect(findShape('estrella')?.label).toBe('Estrella');
  });

  it('convierte cada motivo a contornos finitos dentro de la caja de inserción y exportación', () => {
    for (const shape of ORGANIC_SHAPES) {
      const contours = cmdsToPolylines(parseSvgPath(shape.d), 0.05);
      expect(contours.length, shape.id).toBeGreaterThan(0);
      expect(shape.aspect, shape.id).toBeGreaterThan(0);
      for (const contour of contours) {
        expect(contour.closed, shape.id).toBe(true);
        expect(contour.pts.length, shape.id).toBeGreaterThan(2);
        for (const point of contour.pts) {
          expect(Number.isFinite(point.x) && Number.isFinite(point.y), shape.id).toBe(true);
          expect(point.x, `${shape.id}: x`).toBeGreaterThanOrEqual(-0.01);
          expect(point.y, `${shape.id}: y`).toBeGreaterThanOrEqual(-0.01);
          expect(point.x, `${shape.id}: x`).toBeLessThanOrEqual(100.01);
          expect(point.y, `${shape.id}: y`).toBeLessThanOrEqual(100.01);
        }
      }
    }
  });

  it('encuentra sinónimos sin acentos y combina búsqueda y categoría', () => {
    expect(filterShapes('catarina', 'insectos').map((s) => s.id)).toEqual(['mariquita']);
    expect(filterShapes('mexico').map((s) => s.id)).toContain('taco');
    expect(filterShapes('estrella', 'mar').map((s) => s.id)).toEqual(['estrella-mar']);
    expect(filterShapes('xyz-inexistente')).toEqual([]);
  });
});
