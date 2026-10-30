import { describe, expect, it } from 'vitest';
import { CATALOG, findModel } from '../src/data/catalog';
import { useApp } from '../src/store/app';
import { modelPatternDetails } from '../src/features/library/patternDetailPreview';

describe('ficha de confección calculada sin crear proyectos guardados', () => {
  it('enumera las piezas, materiales y pasos de la receta exacta con una talla de referencia explícita', () => {
    const model = findModel('coleccion-sudadera-660-540-260-capucha')!;
    const before = JSON.stringify({ model, projects: useApp.getState().projects, profiles: useApp.getState().profiles, dirty: useApp.getState().dirty });
    const details = modelPatternDetails(model)!;
    expect(details.reference).toContain('Mediana');
    expect(details.geometryChecked).toBe(true);
    expect(details.params).toMatchObject({ largo: 660, largoManga: 540, holgura: 260, capucha: 'si' });
    expect(details.pattern.pieces.find(piece => piece.id === 'capucha')?.cut.qty).toBe(2);
    expect(details.pattern.pieces.find(piece => piece.id === 'manga')?.cut.qty).toBe(2);
    expect(details.pattern.result!.steps.length).toBeGreaterThan(3);
    expect(details.pattern.result!.materials.length).toBeGreaterThan(0);
    expect(JSON.stringify({ model, projects: useApp.getState().projects, profiles: useApp.getState().profiles, dirty: useApp.getState().dirty })).toBe(before);
  });

  it('utiliza la referencia de bebé solicitada y calcula los paneles de un diseño collage', () => {
    const baby = modelPatternDetails(findModel('pantalon-recto-elastico')!, 'bebe', 'B0-6')!;
    expect(baby.reference).toContain('0–6');
    expect(baby.geometryChecked).toBe(true);
    expect(baby.params.largo).toBeLessThan(720);
    const collage = modelPatternDetails(CATALOG.find(model => !!model.panelPreset && !!model.generatorId)!)!;
    expect(collage.geometryChecked).toBe(true);
    expect(collage.pattern.pieces.some(piece => piece.panelSource)).toBe(true);
    expect(collage.pattern.result!.steps.some(step => step.id.startsWith('panel-'))).toBe(true);
  });

  it('no anuncia como comprobada una receta inválida ni inventa un patrón de una base de inspiración', () => {
    const model = findModel('coleccion-sudadera-660-540-260-capucha')!;
    const invalid = modelPatternDetails({ ...model, params: { ...model.params, largo: -100 } })!;
    expect(invalid.geometryChecked).toBe(false);
    expect(invalid.pattern.issues.some(issue => issue.level === 'error')).toBe(true);
    expect(modelPatternDetails({ ...model, studioOnly: true })).toBeUndefined();
  });
});
