import { describe, expect, it } from 'vitest';
import { CATALOG, findModel } from '../src/data/catalog';
import { buildFlat } from '../src/data/flats';
import { catalogArtwork, catalogSubject } from '../src/data/catalogArtwork';
import { groupCatalog } from '../src/features/library/groups';
import { modelHasPattern } from '../src/features/library/filters';
import { parseSvgPath } from '../src/lib/draw/svgpath';
import { cmdsToPolylines } from '../src/lib/draw/flatten';

describe('ilustraciones del catálogo separadas de las piezas editables', () => {
  it('compone todos los diseños sin mutar sus zonas, coordenadas ni especificaciones', () => {
    for (const group of groupCatalog(CATALOG.filter(modelHasPattern))) {
      const model = group.representative, original = buildFlat(model.id, model.flat).views[0];
      const before = JSON.stringify({ original, spec: model.flat });
      Object.freeze(original.zones); original.zones.forEach(Object.freeze);
      Object.freeze(original.details); original.details.forEach(Object.freeze);
      const art = catalogArtwork(model.id, model.flat, original);
      expect(JSON.stringify({ original, spec: model.flat }), group.name).toBe(before);
      expect(Number.isFinite(art.view.minX + art.view.minY + art.view.width + art.view.height), group.name).toBe(true);
      expect(art.view.width, group.name).toBeGreaterThan(0);
      expect(art.view.height, group.name).toBeGreaterThan(0);
      for (const zone of art.view.zones) {
        const points = cmdsToPolylines(parseSvgPath(zone.d), 1).flatMap(line => line.pts);
        expect(points.length, `${group.name}/${zone.id}`).toBeGreaterThan(2);
        expect(points.every(point => Number.isFinite(point.x + point.y)), group.name).toBe(true);
      }
      if (art.reference) {
        expect(art.reference.x + art.reference.width, group.name).toBeLessThanOrEqual(art.view.minX + art.view.width + .1);
        expect(art.reference.y + art.reference.height, group.name).toBeLessThanOrEqual(art.view.minY + art.view.height + .1);
        expect(art.view.zones.some(zone => zone.id === art.reference!.subject), group.name).toBe(false);
      }
    }
  });

  it('identifica las fundas por su objeto real y no por palabras de una descripción compartida', () => {
    const cases = { 'funda-laptop-13': 'portatil', 'funda-telefono': 'telefono', 'funda-lentes': 'lentes', 'funda-libro': 'libro', 'funda-consola': 'consola', 'coleccion-funda-bastidor-6-28': 'bastidor', 'tapete-maquina': 'maquina', 'marcapaginas-textil': 'libro' };
    for (const [id, subject] of Object.entries(cases)) expect(catalogSubject(id, findModel(id)!.flat)).toBe(subject);
    const unknown = { ...findModel('funda-laptop-13')!.flat, object: { width: 200, height: 100, label: 'Teléfono con laptop y lentes' } };
    expect(catalogSubject('funda-desconocida', unknown)).toBeUndefined();
  });

  it('la tarjeta tote no promete el bolsillo opcional que su patrón base no incluye', () => {
    const model = findModel('bolsa-tote')!, original = buildFlat(model.id, model.flat).views[0];
    expect(catalogArtwork(model.id, model.flat, original).view.zones.some(zone => zone.type === 'bolsillo')).toBe(false);
    // The legacy drawing remains unchanged for existing saved studio projects.
    expect(original.zones.some(zone => zone.type === 'bolsillo')).toBe(true);
  });
});
