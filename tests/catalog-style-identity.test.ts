import { describe, expect, it } from 'vitest';
import { CATALOG, findModel } from '../src/data/catalog';
import { CATALOG_STYLE_IDENTITIES, withStyleIdentity } from '../src/data/catalogStyleIdentity';
import { familyOf } from '../src/data/catalogTaxonomy';
import { findCatalogGroup, groupCatalog, variantAxes } from '../src/features/library/groups';
import { getGenerator } from '../src/lib/pattern/generators';
import type { GeneratorContext } from '../src/lib/pattern/generator';
import { SIZE_TABLES } from '../src/lib/sizes/tables';

describe('Estilos visibles sin multiplicar tallas ni recolores', () => {
  it.each([
    ['conjunto-verano', 'conjunto-invierno'],
    ['conjunto-vestido', 'conjunto-pelele-diadema'],
    ['cubrepanal-bebe', 'cubrepanal-olanes'],
    ['cubrepanal-bebe', 'cubrepanal-tirantes'],
    ['vestido-trapecio', 'vestido-trapecio-volantes'],
    ['falda-circular', 'falda-medio-circulo'],
    ['chaleco-borrego', 'chaleco-ribeteado'],
    ['mono-pichi-bolsillos', 'mono-pico-volantes'],
    ['blusa-trapecio', 'blusa-trapecio-volante'],
    ['delantal-pichi', 'delantal-pichi-liso'],
    ['bonete-volante', 'bonete-volante-doble'],
    ['bonete-volante', 'bonete-encaje'],
    ['gorro-orejas-oso', 'gorro-orejas-conejo'],
    ['gorro-orejeras-gato', 'gorro-orejeras-oso']
  ])('permite elegir %s y %s como construcciones diferentes', (first, second) => {
    const a = findCatalogGroup(first)!, b = findCatalogGroup(second)!;
    expect(a.id).not.toBe(b.id);
    expect(a.representative.id).toBe(first);
    expect(b.representative.id).toBe(second);
    expect(a.models.every(model => model.id !== second)).toBe(true);
  });

  it('muestra los nueve conjuntos existentes por sus prendas, sin depender del estampado', () => {
    const sets = CATALOG.filter(model => model.generatorId === 'conjunto-bebe');
    expect(sets).toHaveLength(9);
    expect(groupCatalog(sets)).toHaveLength(9);
    expect(new Set(sets.map(model => model.params?.conjunto)).size).toBe(9);
    expect(findCatalogGroup('conjunto-rayas')?.name).toBe('Conjunto de blusa con botones y bombacho');
    expect(findCatalogGroup('conjunto-vichy')?.name).toBe('Conjunto de blusa con volante y pantalón capri');
  });

  it('conserva dimensiones y mangas como opciones dentro de la construcción original', () => {
    expect(findCatalogGroup('body-bebe')?.id).toBe(findCatalogGroup('body-bebe-manga-larga')?.id);
    expect(findCatalogGroup('coleccion-sudadera-500-150-180-capucha')?.id)
      .toBe(findCatalogGroup('coleccion-sudadera-900-540-340-capucha')?.id);
    expect(findCatalogGroup('funda-laptop-13')?.id).toBe(findCatalogGroup('funda-laptop-15')?.id);
    expect(variantAxes(findCatalogGroup('body-bebe')!).map(axis => axis.key)).toContain('tipoManga');
  });

  it('solo cambia el metadato de navegación y mantiene los enlaces, medidas y dibujos', () => {
    for (const [id, identity] of Object.entries(CATALOG_STYLE_IDENTITIES)) {
      const model = findModel(id)!;
      expect(model, id).toBeDefined();
      const custom = { ...model, params: { ...model.params, largo: 475, margen: 8 } };
      const grouped = withStyleIdentity(custom);
      expect(grouped.id).toBe(id);
      expect(grouped.params).toBe(custom.params);
      expect(grouped.flat).toBe(custom.flat);
      expect(grouped.generatorId).toBe(model.generatorId);
      expect(grouped.status).toBe(model.status);
      expect(grouped.designGroup?.id).toBe(identity.id);
      expect(familyOf(grouped)).toBe(identity.family);
      expect(findCatalogGroup(id)?.models.map(recipe => recipe.id)).toContain(id);
    }
  });

  it('los estilos que antes compartían tarjeta tienen cortes, acabados o piezas distintos', () => {
    const seen = new Map<string, string>();
    for (const id of Object.keys(CATALOG_STYLE_IDENTITIES)) {
      const model = findModel(id)!;
      const code = model.recipients.includes('bebe') ? 'B0-3' : model.recipients.includes('toddler') ? 'E92' : 'M92';
      const table = SIZE_TABLES.find(candidate => candidate.rows.some(row => row.code === code))!;
      const row = table.rows.find(candidate => candidate.code === code)!;
      const ctx: GeneratorContext = { kind: row.kind, body: row.values, fabric: model.fabrics[0], stretch: model.fabrics[0] === 'punto' ? 30 : 0, fit: model.fits[0] };
      const generator = getGenerator(model.generatorId!)!;
      const pattern = generator.generate(ctx, { ...generator.defaults(ctx), ...model.params });
      expect(pattern.pieces.length, id).toBeGreaterThan(0);
      // Deliberately omit names and IDs: renaming identical geometry must fail.
      const shape = pattern.pieces.map(piece => ({
        nodes: piece.nodes.map(({ x, y }) => [x, y]),
        edges: piece.edges.map(edge => ({ kind: edge.kind, c1: edge.c1, c2: edge.c2, finish: edge.finish, allowance: edge.allowance })),
        cut: piece.cut,
        lines: piece.lines.map(({ kind, a, b }) => ({ kind, a, b })),
        marks: piece.marks.map(({ kind, at }) => ({ kind, at }))
      }));
      const signature = JSON.stringify([model.generatorId, shape]);
      expect(seen.get(signature), `${id} repite la construcción de ${seen.get(signature)}`).toBeUndefined();
      seen.set(signature, id);
    }
  });
});
