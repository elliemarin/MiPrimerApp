import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { readFileSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { TRANSFORMATIONS } from '../src/data/transformations';
import { TRANSFORMATION_PHOTOS, TRANSFORMATION_PHOTO_SHEETS, transformationPhotoFor, transformationPhotoUrl } from '../src/data/transformationPhotos';
import { TransformationPhoto } from '../src/features/transform/TransformationPhoto';
import { TransformationPreview } from '../src/features/transform/TransformationPreview';

describe('fotos realistas de transformar mi ropa', () => {
  it('cubre las 27 ideas con pares propios, sin reutilizar una transformación para otra', () => {
    const ids = TRANSFORMATIONS.map(idea => idea.id).sort();
    expect(ids).toHaveLength(27);
    expect(Object.keys(TRANSFORMATION_PHOTOS).sort()).toEqual(ids);
    expect(Object.keys(TRANSFORMATION_PHOTO_SHEETS)).toHaveLength(9);
    expect(Object.values(TRANSFORMATION_PHOTO_SHEETS).flat().sort()).toEqual(ids);
    for (const [sheet, members] of Object.entries(TRANSFORMATION_PHOTO_SHEETS)) {
      expect(members).toHaveLength(3);
      for (const id of members) expect(transformationPhotoFor(id)?.sheet, id).toBe(sheet);
    }
    expect(transformationPhotoFor('no-existe')).toBeUndefined();
  });

  it('usa 54 recortes distintos y válidos para el antes y el resultado', () => {
    const crops = new Set<string>();
    for (const idea of TRANSFORMATIONS) {
      const source = transformationPhotoFor(idea.id)!;
      expect(source.before, idea.id).not.toEqual(source.after);
      expect(transformationPhotoUrl(source), idea.id).toMatch(/\/transformation-images\/realistas-transformar-[abc]-0[123]\.webp$/);
      for (const view of ['before', 'after'] as const) {
        const bounds = source[view], [x, y, width, height] = bounds;
        const context = `${idea.id}/${view}`;
        expect(bounds.every(Number.isFinite), context).toBe(true);
        expect(x, context).toBeGreaterThanOrEqual(0);
        expect(y, context).toBeGreaterThanOrEqual(0);
        expect(width, context).toBeGreaterThan(0);
        expect(height, context).toBeGreaterThan(0);
        expect(x + width, context).toBeLessThanOrEqual(1254);
        expect(y + height, context).toBeLessThanOrEqual(1254);
        crops.add(`${source.sheet}/${bounds.join(',')}`);
      }
    }
    expect(crops.size).toBe(54);
  });

  it('incluye todos los WebP dentro del presupuesto móvil y sin depender de una API', () => {
    let bytes = 0;
    for (const sheet of Object.keys(TRANSFORMATION_PHOTO_SHEETS)) {
      const path = resolve('public/transformation-images', `${sheet}.webp`), file = readFileSync(path);
      expect(file.subarray(0, 4).toString(), sheet).toBe('RIFF');
      expect(file.subarray(8, 12).toString(), sheet).toBe('WEBP');
      expect(statSync(path).size, sheet).toBeLessThan(250_000);
      bytes += file.length;
    }
    expect(bytes).toBeLessThan(2_250_000);
  });

  it('muestra fotografías para todas las ideas y ambas vistas, sin volver a diagramas SVG', () => {
    for (const idea of TRANSFORMATIONS) {
      for (const view of ['before', 'after'] as const) {
        const markup = renderToStaticMarkup(createElement(TransformationPhoto, { idea, view }));
        expect(markup, `${idea.id}/${view}`).toContain('<img');
        expect(markup).toContain(`data-view="${view}"`);
        expect(markup).toContain('/transformation-images/');
        expect(markup).not.toContain('<svg');
      }
    }
  });

  it('abre la comparación en el resultado y declara que las fotografías son ilustrativas', () => {
    const markup = renderToStaticMarkup(createElement(TransformationPreview, { idea: TRANSFORMATIONS[0] }));
    expect(markup).toContain('data-view="after"');
    expect(markup).toContain('Antes');
    expect(markup).toContain('Con el cambio');
    expect(markup).toContain('aria-pressed="true"');
    expect(markup).toContain('IA');
    expect(markup).not.toContain('<svg');
  });
});
