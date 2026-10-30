import { describe, expect, it } from 'vitest';
import { CATALOG } from '../src/data/catalog';
import { COLLECTION_CATALOG, PATTERN_COLLECTIONS } from '../src/data/catalogCollections';
import { getGenerator } from '../src/lib/pattern/generators';
import { buildPattern } from '../src/lib/pattern/engine';
import { projectFromModel } from '../src/store/projects';
import { profileFromSize } from '../src/store/profiles';
import { SIZE_TABLES } from '../src/lib/sizes/tables';
import { INITIAL_FILTERS, matches, modelHasPattern } from '../src/features/library/filters';

function profile(code: string) {
  const table = SIZE_TABLES.find(table => table.rows.some(row => row.code === code))!;
  return profileFromSize(table, table.rows.find(row => row.code === code)!);
}

describe('Catálogo de patrones y variantes físicas', () => {
  it('ofrece más de diez veces las 160 entradas anteriores con patrones reales e IDs estables', () => {
    expect(CATALOG.filter(modelHasPattern).length).toBeGreaterThanOrEqual(1600);
    expect(COLLECTION_CATALOG.length).toBeGreaterThanOrEqual(1600);
    expect(new Set(CATALOG.map(model => model.id)).size).toBe(CATALOG.length);
    expect(PATTERN_COLLECTIONS.length).toBeGreaterThanOrEqual(16);
    expect(COLLECTION_CATALOG.every(model => model.status === 'experimental' && !!model.generatorId && !model.studioOnly)).toBe(true);
  });

  it('no cuenta colores, tallas corporales o alias como recetas constructivas nuevas', () => {
    const recipes = COLLECTION_CATALOG.map(model => `${model.generatorId}:${JSON.stringify(Object.entries(model.params ?? {}).sort(([a],[b]) => a.localeCompare(b)))}`);
    expect(new Set(recipes).size).toBe(recipes.length);
    for (const model of COLLECTION_CATALOG) {
      expect(model.collection).toBeTruthy();
      expect(model.variantLabel).toBeTruthy();
      expect(Object.keys(model.params ?? {}).some(key => /color|talla|size/i.test(key))).toBe(false);
      expect(getGenerator(model.generatorId!), model.id).toBeDefined();
    }
  });

  it('clasifica prendas, accesorios y búsqueda por uso sin mezclar destinatarios', () => {
    for (const type of ['inferiores', 'superiores', 'abrigo', 'faldas-vestidos', 'monos', 'bolsos', 'accesorios'] as const) {
      const found = COLLECTION_CATALOG.filter(model => matches(model, { ...INITIAL_FILTERS, type, availability: 'patron', recipient: 'mujer' }));
      expect(found.length, type).toBeGreaterThan(0);
      expect(found.every(model => model.type === type && modelHasPattern(model))).toBe(true);
    }
    const hoodies = COLLECTION_CATALOG.filter(model => matches(model, { ...INITIAL_FILTERS, q: 'hoddie', availability: 'patron' }));
    expect(hoodies.length).toBeGreaterThan(50);
    expect(hoodies.every(model => model.generatorId === 'sudadera-capucha-holgada')).toBe(true);
    expect(hoodies.every(model => model.params?.capucha === 'si')).toBe(true);
    const noHood = COLLECTION_CATALOG.filter(model => matches(model, { ...INITIAL_FILTERS, q: 'sudadera sin capucha' }));
    expect(noHood.length).toBeGreaterThan(0);
    expect(noHood.every(model => model.params?.capucha === 'no')).toBe(true);
    expect(COLLECTION_CATALOG.some(model => matches(model, { ...INITIAL_FILTERS, q: 'funda lector electrónico' }))).toBe(true);
    expect(COLLECTION_CATALOG.some(model => matches(model, { ...INITIAL_FILTERS, q: 'cheve' }))).toBe(true);
    expect(COLLECTION_CATALOG.some(model => matches(model, { ...INITIAL_FILTERS, recipient: 'bebe' }))).toBe(false);
  });

  it('todas las recetas del catálogo construyen y validan sus piezas, medidas y costuras reales', () => {
    const adult = profile('M92');
    const failures: string[] = [];
    const geometries = new Map<string, string>();
    for (const model of COLLECTION_CATALOG) {
      const generator = getGenerator(model.generatorId!);
      if (!generator) { failures.push(`${model.id}: motor inexistente ${model.generatorId}`); continue; }
      const project = projectFromModel(model, generator.requiredMeasures.length ? adult : undefined);
      if (!project.pattern) { failures.push(`${model.id}: sin patrón`); continue; }
      const built = buildPattern(project.pattern);
      const geometry = JSON.stringify([model.generatorId, built.pieces.map(piece => ({
        nodes: piece.nodes, edges: piece.edges.map(({label: _label, ...edge}) => edge),
        grain: piece.grain, cut: piece.cut,
        lines: piece.lines.map(({label: _label, ...line}) => line),
        notches: piece.notches.map(({label: _label, ...notch}) => notch),
        marks: piece.marks.map(({label: _label, ...mark}) => mark)
      }))]);
      if (geometries.has(geometry)) failures.push(`${model.id}: geometría duplicada de ${geometries.get(geometry)}`);
      geometries.set(geometry, model.id);
      for (const issue of built.issues.filter(issue => issue.level === 'error')) failures.push(`${model.id}: ${issue.code} ${issue.message}`);
      if (built.missing.length || !built.pieces.length || built.cuts.size !== built.pieces.length) failures.push(`${model.id}: piezas o medidas incompletas`);
      for (const seam of built.seamResults.filter(seam => !seam.ok)) failures.push(`${model.id}: ${seam.relation.label}`);
    }
    expect(failures, failures.slice(0, 30).join('\n')).toEqual([]);
  }, 60000);

  it('variantes extremas de cada prenda conservan geometría válida en cuerpos pequeños y grandes', () => {
    const garmentGenerators = ['pantalon-cintura-elastica', 'falda-fruncida-elastica', 'chaqueta-hombro-caido', 'top-hombro-caido', 'poncho-rectangular', 'jumper-peto-falda', 'sudadera-capucha-holgada'];
    const failures: string[] = [];
    for (const id of garmentGenerators) {
      const models = COLLECTION_CATALOG.filter(model => model.generatorId === id);
      // Cartesian grids are ordered, so each selected endpoint exercises both
      // ends of its parameter domain, not a colour or size-only duplicate.
      const picks = [...new Set([models[0], models[Math.floor(models.length / 2)], models[models.length - 1]])];
      for (const code of ['M80', 'M104', 'H92', 'H112']) for (const model of picks) {
        const project = projectFromModel(model, profile(code));
        const built = buildPattern(project.pattern!);
        for (const issue of built.issues.filter(issue => issue.level === 'error')) failures.push(`${model.id}/${code}: ${issue.code}`);
        for (const seam of built.seamResults.filter(seam => !seam.ok)) failures.push(`${model.id}/${code}: ${seam.relation.label}`);
      }
    }
    expect(failures).toEqual([]);
  }, 60000);
});
