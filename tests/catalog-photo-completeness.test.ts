import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { CATALOG, findModel, type CatalogModel, type Recipient } from '../src/data/catalog';
import { PENDING_PHOTO_SHEETS, catalogImageBounds, catalogImageCaption, catalogImageFor, type CatalogImageSource } from '../src/data/catalogImages';
import { modelHasPattern } from '../src/features/library/filters';
import { groupCatalog } from '../src/features/library/groups';
import { CatalogImage } from '../src/ui/CatalogImage';

// These files were technical SVG renders before the photographic completion.
// A caption change alone must not make the old artwork pass this regression.
const TECHNICAL_SHEETS = new Set([
  'ninas-01', 'bebe-02', 'tendencia-01', 'tendencia-02', 'tendencia-03',
  'infantil-01', 'infantil-02', 'infantil-03', 'infantil-04', 'infantil-05',
]);

function sourceFor(model: CatalogModel, recipient?: Recipient): CatalogImageSource {
  const source = catalogImageFor(model, recipient);
  expect(source, `${model.id} / ${recipient ?? 'sin filtro'}`).toBeDefined();
  return source!;
}

function imageForId(id: string): CatalogImageSource {
  const model = findModel(id);
  expect(model, id).toBeDefined();
  return sourceFor(model!);
}

describe('fotografías completas del catálogo y sus variantes', () => {
  it('mantiene todas las recetas y distingue patrones disponibles de inspiraciones', () => {
    expect(CATALOG).toHaveLength(2074);
    expect(groupCatalog(CATALOG)).toHaveLength(318);
    const available = CATALOG.filter(modelHasPattern);
    const inspiration = CATALOG.filter(model => !modelHasPattern(model));
    expect(available).toHaveLength(2013);
    expect(groupCatalog(available)).toHaveLength(257);
    expect(inspiration).toHaveLength(61);
    expect(groupCatalog(inspiration)).toHaveLength(61);
  });

  it('resuelve cada receta y destinatario a una imagen IA, también al cambiar de variante', () => {
    for (const model of CATALOG) {
      const recipients: (Recipient | undefined)[] = [undefined, ...model.recipients];
      for (const recipient of recipients) {
        const source = sourceFor(model, recipient);
        const context = `${model.id} / ${recipient ?? 'sin filtro'} / ${source.sheet}/${source.cell}`;
        expect(TECHNICAL_SHEETS.has(source.sheet), context).toBe(false);
        // Only the digitized constructions without an AI photo yet may use the drawn sheet, and they say so.
        expect(catalogImageCaption(source), context).toBe(PENDING_PHOTO_SHEETS.has(source.sheet) ? 'Ilustración dibujada a partir del patrón real.' : 'Ilustración generada con IA.');
      }
    }
  });

  it('publica el WebP y un recorte válido de cada imagen resuelta, incluidas celdas solo de variantes', () => {
    const sources = new Map<string, CatalogImageSource>();
    for (const model of CATALOG) {
      for (const recipient of [undefined, ...model.recipients]) {
        const source = sourceFor(model, recipient);
        sources.set(`${source.sheet}/${source.cell}`, source);
      }
    }
    const checkedSheets = new Set<string>();
    for (const [key, source] of sources) {
      expect(Number.isInteger(source.cell), key).toBe(true);
      expect(source.cell, key).toBeGreaterThanOrEqual(0);
      expect(source.cell, key).toBeLessThan(9);
      const [x, y, width, height] = catalogImageBounds(source);
      expect([x, y, width, height].every(Number.isFinite), key).toBe(true);
      expect(x, key).toBeGreaterThanOrEqual(0);
      expect(y, key).toBeGreaterThanOrEqual(0);
      expect(width, key).toBeGreaterThan(0);
      expect(height, key).toBeGreaterThan(0);
      expect(x + width, key).toBeLessThanOrEqual(1254);
      expect(y + height, key).toBeLessThanOrEqual(1254);
      if (checkedSheets.has(source.sheet)) continue;
      const file = readFileSync(resolve('public/catalog-images', `${source.sheet}.webp`));
      expect(file.subarray(0, 4).toString(), source.sheet).toBe('RIFF');
      expect(file.subarray(8, 12).toString(), source.sheet).toBe('WEBP');
      checkedSheets.add(source.sheet);
    }
  });

  it('presenta los 318 diseños con imagen sin caer al dibujo técnico en la tarjeta', () => {
    for (const group of groupCatalog(CATALOG)) {
      const markup = renderToStaticMarkup(createElement(CatalogImage, { model: group.representative }));
      expect(markup, group.id).toContain('class="catalog-photo-atlas"');
      expect(markup, group.id).not.toContain('<svg');
    }
  });

  it.each([
    ['bomber-corta', 'bomber-clasica'],
    ['sobrecamisa-corta', 'sobrecamisa-leñadora'],
    ['camiseta-oversize-larga', 'camiseta-oversize'],
    ['overol-bebe', 'pelele-tirantes'],
    ['blusa-campesina-larga', 'blusa-campesina'],
    ['gorro-duende-fieltro', 'gorro-duende'],
    ['sombrero-pescador-lazo', 'sombrero-pescador'],
    ['barrel-bebe', 'pantalon-barrel'],
    ['barrel-infantil', 'pantalon-barrel'],
    ['barrel-bebe', 'barrel-infantil'],
    ['baggy-bebe', 'pantalon-baggy'],
    ['body-bebe-manga-larga', 'body-bebe'],
  ])('conserva una fotografía distinta para %s y %s dentro del mismo diseño', (variantId, baseId) => {
    const variant = findModel(variantId)!, base = findModel(baseId)!;
    expect(variant.designGroup?.id ?? variant.id).toBe(base.designGroup?.id ?? base.id);
    expect(imageForId(variantId)).not.toEqual(imageForId(baseId));
  });

  it('muestra el sombrero de bebé con barbiquejo separado del adulto y del modelo con lazo', () => {
    const adult = imageForId('sombrero-pescador');
    const baby = imageForId('sombrero-pescador-bebe');
    const bow = imageForId('sombrero-pescador-lazo');
    expect(baby).not.toEqual(adult);
    expect(baby).not.toEqual(bow);
    expect(catalogImageFor(findModel('sombrero-pescador-bebe')!, 'bebe')).toEqual(baby);
  });
});
