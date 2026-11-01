import { describe, expect, it } from 'vitest';
import { CATALOG } from '../src/data/catalog';
import { buildFlat } from '../src/data/flats';
import { familyOf } from '../src/data/catalogTaxonomy';
import { catalogImageCaption, catalogImageFor } from '../src/data/catalogImages';
import { INITIAL_FILTERS, matches, modelHasPattern } from '../src/features/library/filters';
import { groupCatalog } from '../src/features/library/groups';
import { prepareSimpleProject, materialTargets, applyMaterial } from '../src/features/simple/workflow';
import { assemblyPoint, inverseAssemblyPoint, buildAssembly } from '../src/features/simple/assembled';
import { modelMaterials } from '../src/features/simple/modelMaterials';
import { prepareSewingPack } from '../src/lib/pdf/projectPack';
import { buildPattern } from '../src/lib/pattern/engine';
import { projectFromModel } from '../src/store/projects';
import { profileFromSize } from '../src/store/profiles';
import { quickSize } from '../src/lib/sizes/quickSizes';
import { SIZE_TABLES } from '../src/lib/sizes/tables';

const models = CATALOG.filter(model => !!(model.flat.street || model.flat.dressStyle || model.flat.babyStyle));
const adult = quickSize('mujer', 'mediana');
const babyTable = SIZE_TABLES.find(table => table.id === 'ref-bebe-meses')!;
const ctx = { profiles: {}, fabrics: {}, materials: {}, unit: 'cm' as const, includePhotos: false };

describe('estilos nuevos: catálogo, colocación física y paquete completo', () => {
  it('ofrece construcciones distintas sin contar las tallas como diseños', () => {
    expect(models).toHaveLength(69);
    expect(groupCatalog(models)).toHaveLength(models.length);
    const count = (recipient: 'mujer' | 'bebe', family?: string) => groupCatalog(CATALOG.filter(model => modelHasPattern(model) && matches(model, { ...INITIAL_FILTERS, recipient }) && (!family || familyOf(model) === family))).length;
    expect(count('mujer', 'hoodie')).toBeGreaterThanOrEqual(13);
    expect(count('mujer', 'vestido')).toBeGreaterThanOrEqual(27);
    expect(count('mujer', 'pantalon')).toBeGreaterThanOrEqual(20);
    expect(count('bebe')).toBeGreaterThanOrEqual(70);
  });

  it('encuentra los nuevos hoodies sin contaminar la búsqueda con otras familias', () => {
    const hoodies = CATALOG.filter(model => modelHasPattern(model) && matches(model, { ...INITIAL_FILTERS, q: 'hoddies con capucha', recipient: 'mujer' }));
    expect(groupCatalog(hoodies).length).toBeGreaterThanOrEqual(13);
    expect(hoodies.every(model => familyOf(model) === 'hoodie')).toBe(true);
    expect(CATALOG.filter(model => matches(model, { ...INITIAL_FILTERS, q: 'vestidos mujer' })).every(model => familyOf(model) === 'vestido')).toBe(true);
  });

  it('excluye las tapetas ocultas de pañaleros y distingue las caras de manga del babero abierto atrás', () => {
    const profile = profileFromSize(babyTable, babyTable.rows.find(row => row.code === 'B6-9')!);
    for (const model of models.filter(model => model.id.startsWith('bebe-body-'))) {
      const scenes = buildAssembly(prepareSimpleProject(projectFromModel(model, profile)));
      for (const surface of scenes[0].surfaces.filter(surface => /^delantero(?:-|$)/.test(surface.pieceId ?? ''))) {
        expect(surface.physicalBounds.minX, `${model.id}/${surface.id}`).toBeGreaterThanOrEqual(0);
      }
    }
    const smock = models.find(model => model.id === 'bebe-babero-mangas')!;
    const [front, back] = buildAssembly(prepareSimpleProject(projectFromModel(smock, profile)));
    const frontSleeve = front.surfaces.find(surface => surface.pieceId === 'manga')!;
    const backSleeve = back.surfaces.find(surface => surface.pieceId === 'manga')!;
    expect(frontSleeve.physicalBounds.minX).toBeCloseTo(backSleeve.physicalBounds.maxX, 6);
    expect(frontSleeve.physicalBounds.maxX).toBeGreaterThan(backSleeve.physicalBounds.maxX);
  });

  for (const model of models) it(`${model.id}: conserva piezas y materiales desde el estilo hasta el PDF`, () => {
    const baby = model.recipients.includes('bebe');
    const profile = baby ? profileFromSize(babyTable, babyTable.rows.find(row => row.code === 'B6-9')!) : profileFromSize(adult.table, adult.row);
    let project = prepareSimpleProject(projectFromModel(model, profile));
    const built = buildPattern(project.pattern!);
    expect(built.issues.filter(issue => issue.level === 'error')).toEqual([]);
    expect(built.missing).toEqual([]);
    const scenes = buildAssembly(project);
    expect(scenes.length).toBeGreaterThan(0);
    expect(scenes[0].label).not.toBe('Diseño');
    expect(scenes.some(scene => scene.surfaces.some(surface => surface.primary))).toBe(true);
    const allPieces = new Set(built.pieces.map(piece => piece.id));
    for (const scene of scenes) for (const surface of scene.surfaces) {
      expect(allPieces.has(surface.pieceId!), surface.id).toBe(true);
      expect([...surface.matrix, ...surface.inverse].every(Number.isFinite), surface.id).toBe(true);
      const center = { x: (surface.physicalBounds.minX + surface.physicalBounds.maxX) / 2, y: (surface.physicalBounds.minY + surface.physicalBounds.maxY) / 2 };
      const restored = inverseAssemblyPoint(surface, assemblyPoint(surface, center));
      expect(restored.x).toBeCloseTo(center.x, 6);
      expect(restored.y).toBeCloseTo(center.y, 6);
    }
    const targets = materialTargets(project);
    expect(targets.length).toBeGreaterThan(0);
    project = applyMaterial(project, targets.map(target => target.id), { type: 'color', color: '#3D6358' });
    // Materials must also reach the whole garment/croquis, not only the cutting pieces.
    for (const flat of buildFlat(model.id, model.flat).views) {
      expect(Object.keys(modelMaterials(project, flat).fills).length, `${model.id}/${flat.key}`).toBeGreaterThan(0);
    }
    const ready = prepareSewingPack(JSON.parse(JSON.stringify(project)), ctx);
    expect(ready.blockers).toEqual([]);
    expect(new Set(ready.pieces.map(piece => piece.id))).toEqual(allPieces);
    const image = catalogImageFor(model);
    expect(image).toBeDefined();
    expect(catalogImageCaption(image!)).toBe('Ilustración generada con IA.');
  });
});
