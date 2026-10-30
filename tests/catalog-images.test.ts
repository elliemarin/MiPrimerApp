import { describe, expect, it } from 'vitest';
import { readFileSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import { CATALOG, findModel } from '../src/data/catalog';
import { CATALOG_IMAGES, CATALOG_IMAGE_SHEETS, catalogImageBounds, catalogImageFor } from '../src/data/catalogImages';
import { modelHasPattern } from '../src/features/library/filters';
import { groupCatalog } from '../src/features/library/groups';

describe('imágenes propias para los diseños con patrón', () => {
  it('cubre todos los grupos con una celda propia, incluidas todas sus recetas', () => {
    const models = CATALOG.filter(modelHasPattern), groups = groupCatalog(models);
    expect(Object.keys(CATALOG_IMAGES).sort()).toEqual(groups.map(group => group.id).sort());
    const cells = groups.map(group => {
      const image = catalogImageFor(group.representative);
      expect(image, group.name).toBeDefined();
      const [x, y, width, height] = catalogImageBounds(image!);
      expect(x + y).toBeGreaterThanOrEqual(0);
      expect(width).toBeGreaterThan(0); expect(height).toBeGreaterThan(0);
      expect(x + width).toBeLessThanOrEqual(1254); expect(y + height).toBeLessThanOrEqual(1254);
      return `${image!.sheet}/${image!.cell}`;
    });
    expect(new Set(cells).size).toBe(groups.length);
    for (const model of models) expect(catalogImageFor(model), model.id).toBeDefined();
    const entries = Object.values(CATALOG_IMAGE_SHEETS).flat();
    expect(new Set(entries).size).toBe(entries.length);
  });

  it('publica todas las láminas WebP locales con un presupuesto pequeño para móvil y modo sin conexión', () => {
    let bytes = 0;
    for (const [sheet, ids] of Object.entries(CATALOG_IMAGE_SHEETS)) {
      expect(ids.length).toBeLessThanOrEqual(9);
      const path = resolve('public/catalog-images', `${sheet}.webp`), file = readFileSync(path);
      expect(file.subarray(0, 4).toString()).toBe('RIFF');
      expect(file.subarray(8, 12).toString()).toBe('WEBP');
      expect(statSync(path).size).toBeLessThan(250_000);
      bytes += file.length;
    }
    expect(bytes).toBeLessThan(2_500_000);
  });

  it('muestra las mangas y proporciones de bebé sin cambiar el patrón ni duplicar tarjetas', () => {
    const short = findModel('body-bebe')!, long = findModel('body-bebe-manga-larga')!;
    expect(short.designGroup?.id).toBe(long.designGroup?.id);
    expect(catalogImageFor(short)?.cell).toBe(2);
    expect(catalogImageFor(long)?.cell).toBe(7);
    const adult = findModel('pantalon-recto-elastico')!, before = JSON.stringify(adult);
    expect(catalogImageFor(adult, 'bebe')).not.toEqual(catalogImageFor(adult, 'mujer'));
    expect(JSON.stringify(adult)).toBe(before);
  });
});
