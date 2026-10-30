import { describe, expect, it } from 'vitest';
import { CATALOG, findModel } from '../src/data/catalog';
import { INITIAL_FILTERS, matches, modelHasPattern } from '../src/features/library/filters';
import { findCatalogGroup, groupCatalog, selectVariant, variantAxes, variantValue } from '../src/features/library/groups';

const patternFilters = { ...INITIAL_FILTERS, availability: 'patron' as const };
const patterns = CATALOG.filter(modelHasPattern);
const model = (id: string) => findModel(id)!;
const group = (id: string) => findCatalogGroup(id)!;

describe('Una base por diseño, con medidas elegidas después', () => {
  it('reduce las tarjetas sin eliminar recetas, alterar IDs ni modificar parámetros', () => {
    const before = JSON.stringify(CATALOG);
    const grouped = groupCatalog(patterns);
    const ids = grouped.flatMap(entry => entry.models.map(item => item.id));
    // Forty new costume constructions and the restored baby body add designs,
    // while dimensional presets still share their original cards.
    expect(grouped).toHaveLength(110);
    expect(patterns.length).toBeGreaterThanOrEqual(1789);
    expect(ids).toHaveLength(patterns.length);
    expect(new Set(ids).size).toBe(ids.length);
    expect(new Set(ids)).toEqual(new Set(patterns.map(item => item.id)));
    expect(new Set(grouped.map(entry => entry.id)).size).toBe(grouped.length);
    expect(JSON.stringify(CATALOG)).toBe(before);
    for (const entry of grouped) {
      expect(entry.models).toContain(entry.representative);
      expect(new Set(entry.models.map(item => item.generatorId)).size, entry.name).toBe(1);
    }
  });

  it('junta largos y capacidades, pero conserva las distintas construcciones de prendas y paneles', () => {
    expect(group('coleccion-sudadera-500-150-180-capucha').id).toBe(group('coleccion-sudadera-900-540-340-capucha').id);
    expect(group('coleccion-sudadera-660-540-260-capucha').name).toBe('Hoodie holgada');
    expect(group('coleccion-sudadera-660-540-260-capucha').id).not.toBe(group('coleccion-sudadera-660-540-260-cuello').id);
    expect(group('pantalon-recto-elastico').id).not.toBe(group('pantalon-ancho-elastico').id);
    expect(group('jogger').id).not.toBe(group('pantalon-recto-elastico').id);
    expect(group('poncho-recto').id).toBe(group('poncho-corto').id);
    expect(group('poncho-recto').id).not.toBe(group('poncho-abierto').id);
    expect(group('haori-corto').id).toBe(group('haori-largo').id);
    expect(group('haori-corto').id).not.toBe(group('chaleco-haori').id);
    expect(group('chaqueta-collage-bandas').models).toHaveLength(1);
    expect(group('chaqueta-patchwork-cuadros').id).not.toBe(group('chaqueta-collage-bandas').id);
  });

  it('reúne los mismos accesorios por construcción y mantiene sus usos localizables', () => {
    expect(group('coleccion-tote-libros-220-simple-90').id).toBe(group('coleccion-tote-mercado-680-forro-170').id);
    expect(group('bolsa-tote').models.length).toBeGreaterThan(200);
    expect(group('bolsa-zapatos').id).toBe(group('bolsa-pan').id);
    expect(group('estuche-lapices').id).toBe(group('neceser-plano').id);
    expect(group('funda-laptop-13').id).toBe(group('funda-laptop-15').id);
    expect(group('funda-laptop-13').id).toBe(group('coleccion-funda-portatil-grande-14-48').id);
    expect(group('funda-laptop-13').id).not.toBe(group('funda-telefono').id);
    expect(group('cojin').id).toBe(group('coleccion-cojin-700-900-160').id);
    expect(group('individual-reversible').id).toBe(group('coleccion-reversible-mesa-amplio').id);
    expect(group('individual-reversible').id).not.toBe(group('servilleta-reversible').id);
  });

  it('agrupa después de buscar y filtrar, con un representante que cumple todos los filtros', () => {
    for (const q of ['hoodie', 'hoddie', 'scrunchie', 'cheve', 'tote', 'laptop 13']) {
      const found = CATALOG.filter(item => matches(item, { ...patternFilters, q }));
      expect(groupCatalog(found), q).toHaveLength(1);
    }
    const filtered = { ...patternFilters, q: 'hoodie 66', recipient: 'mujer' as const, fit: 'oversize' as const, fabric: 'punto' as const };
    const found = CATALOG.filter(item => matches(item, filtered));
    const [hoodie] = groupCatalog(found);
    expect(hoodie.representative.params).toMatchObject({ largo: 660, largoManga: 540, holgura: 260 });
    expect(hoodie.models.every(item => matches(item, filtered))).toBe(true);
    const baby = groupCatalog(CATALOG.filter(item => matches(item, { ...patternFilters, recipient: 'bebe' })));
    expect(baby.every(entry => entry.models.every(item => item.recipients.includes('bebe')))).toBe(true);
    expect(baby.every(entry => matches(entry.representative, { ...patternFilters, recipient: 'bebe' }))).toBe(true);
  });

  it('expone solo medidas que varían, con etiquetas del motor y sin confundirlas con talla corporal', () => {
    const hoodie = group('coleccion-sudadera-660-540-260-capucha');
    const axes = variantAxes(hoodie);
    expect(new Set(axes.map(axis => axis.key))).toEqual(new Set(['largo', 'largoManga', 'holgura']));
    expect(axes.find(axis => axis.key === 'largo')?.options).toContainEqual({ value: '660', label: '66 cm' });
    expect(axes.find(axis => axis.key === 'holgura')?.advanced).toBe(true);
    expect(axes.flatMap(axis => axis.options.map(option => option.value))).not.toContain('__base__');
    const pants = variantAxes(group('pantalon-recto-elastico'));
    expect(pants.find(axis => axis.key === 'largo')?.options).toContainEqual({ value: '__base__', label: 'Según talla' });
    expect(variantValue(model('pantalon-recto-elastico'), 'largo')).toBe('__base__');
    expect(variantAxes(group('chaqueta-collage-bandas'))).toEqual([]);
  });

  it('encuentra cada base escribiendo el nombre que muestra su tarjeta', () => {
    for (const entry of groupCatalog(patterns)) {
      const filtered = { ...patternFilters, q: entry.name };
      expect(entry.models.every(item => matches(item, filtered)), entry.name).toBe(true);
      expect(groupCatalog(CATALOG.filter(item => matches(item, filtered))).some(result => result.id === entry.id), entry.name).toBe(true);
    }
  });

  it('elige una receta real manteniendo otras medidas y no cambia el ID en empates', () => {
    const current = model('coleccion-sudadera-660-540-260-capucha');
    const hoodie = group(current.id);
    expect(selectVariant(hoodie, current, 'largo', '740').id).toBe('coleccion-sudadera-740-540-260-capucha');
    expect(selectVariant(hoodie, current, 'largo', '660')).toBe(current);
    expect(selectVariant(hoodie, current, 'largo', '999999')).toBe(current);
    const tote = group('bolsa-tote');
    const before = JSON.stringify(tote.models);
    const target = selectVariant(tote, model('coleccion-tote-libros-220-simple-90'), 'ancho', '500');
    expect(target.params?.ancho).toBe(500);
    expect(tote.models).toContain(target);
    expect(JSON.stringify(tote.models)).toBe(before);
  });

  it('resuelve todos los enlaces originales al miembro exacto, incluidas recetas antiguas', () => {
    for (const id of ['funda-laptop-13', 'coleccion-sudadera-500-150-180-capucha', 'coleccion-cojin-350-550-100', 'jogger', 'bolsa-tote']) {
      expect(findCatalogGroup(id)?.models).toContain(findModel(id));
      expect(findModel(id)?.id).toBe(id);
    }
    expect(findCatalogGroup('ya-no-existe')).toBeUndefined();
  });
});
