import { describe, expect, it } from 'vitest';
import { editorialFabricIds, editorialPageGroups, editorialPatternSvg, editorialTextureSources } from '../src/features/editorial/evidence';
import { findModel } from '../src/data/catalog';
import { projectFromModel } from '../src/store/projects';
import { prepareSimpleProject } from '../src/features/simple/workflow';
import { newElement } from '../src/features/studio/model';
import { buildPattern } from '../src/lib/pattern/engine';
import { pieceDrawable } from '../src/lib/draw/drawable';
import { cmdsToSvg } from '../src/lib/draw/paths';

describe('referencias editoriales completas y fieles', () => {
  it('pagina todas las referencias sin perder ni duplicar imágenes al superar una hoja', () => {
    const ids = Array.from({ length: 49 }, (_, index) => `pieza-${index}`);
    const before = [...ids];
    const pages = editorialPageGroups(ids);
    expect(pages.map(page => page.length)).toEqual([12, 12, 12, 12, 1]);
    expect(pages.flat()).toEqual(ids);
    expect(ids).toEqual(before);
    expect(editorialPageGroups([])).toEqual([]);
    expect(() => editorialPageGroups(ids, 0)).toThrow();
  });

  it('incluye las telas visibles del recorrido actual y excluye plantillas antiguas y elementos ocultos', () => {
    const source = prepareSimpleProject(projectFromModel(findModel('bolsa-tote')!));
    const physical = source.design!.views.find(view => view.source.type === 'pieza')!;
    const legacy = source.design!.views.find(view => view.source.type === 'plantilla')!;
    const fill = (fabricId: string) => ({ type: 'tela' as const, fabricId, rotation: 0, scale: 1, offsetX: 0, offsetY: 0 });
    const project = { ...source, design: { ...source.design!, views: source.design!.views.map(view =>
      view.id === physical.id ? { ...view, zoneFills: { [view.zones[0].id]: fill('foto-visible') } }
      : view.id === legacy.id ? { ...view, zoneFills: { [view.zones[0].id]: fill('foto-antigua') } } : view),
      elements: [
        newElement(physical.id, { fill: fill('detalle-visible') }),
        newElement(physical.id, { fill: fill('detalle-oculto'), hidden: true }),
        newElement(physical.id, { id: 'grupo-oculto', kind: 'grupo', hidden: true }),
        newElement(physical.id, { fill: fill('hijo-del-grupo-oculto'), parentId: 'grupo-oculto' }),
        newElement(physical.id, { id: 'ciclo-a', kind: 'grupo', parentId: 'ciclo-b' }),
        newElement(physical.id, { id: 'ciclo-b', kind: 'grupo', parentId: 'ciclo-a' }),
        newElement(physical.id, { fill: fill('hijo-con-ciclo'), parentId: 'ciclo-a' })
      ]
    } };
    const before = JSON.stringify(project);
    expect(editorialFabricIds([project])).toEqual(['foto-visible', 'detalle-visible']);
    expect(JSON.stringify(project)).toBe(before);
  });

  it('hace legible una miniatura sin cambiar los contornos ni fingir un patrón a escala', () => {
    const source = projectFromModel(findModel('bolsa-tote')!);
    const built = buildPattern(source.pattern!);
    const piece = built.pieces[0], drawable = pieceDrawable(piece, built.cuts.get(piece.id)!);
    const before = JSON.stringify(drawable);
    const svg = editorialPatternSvg(drawable, 'P1 · Exterior');
    for (const path of drawable.paths) expect(svg).toContain(`d="${cmdsToSvg(path.cmds)}"`);
    expect(svg).toContain('stroke-width="2.2" vector-effect="non-scaling-stroke"');
    expect(svg).toContain('Sin escala de impresión');
    expect(svg).not.toContain('Escala 1:1');
    expect(JSON.stringify(drawable)).toBe(before);
  });

  it('respeta telas distintas de zonas con el mismo nombre en frente, espalda y un parche anidado', () => {
    const project = projectFromModel(findModel('bolsa-tote')!);
    const [front, back] = project.design!.views;
    const fill = (fabricId: string) => ({ type: 'tela' as const, fabricId, rotation: 0, scale: 1, offsetX: 0, offsetY: 0 });
    const a = { ...front, zones: [{ ...front.zones[0], id: 'repetida' }], zoneFills: { repetida: fill('frente-rayado') } };
    const b = { ...back, zones: [{ ...back.zones[0], id: 'repetida' }], zoneFills: { repetida: fill('espalda-cuadros') } };
    const patch = { ...a, id: 'parche', zoneFills: { repetida: fill('parche-liso') } };
    const doc = { ...project.design!, views: [a, b, patch], elements: [newElement(b.id, { id: 'aplique', kind: 'parche', patchViewId: patch.id })] };
    expect(editorialTextureSources(doc, a, 'frente-').get('frente-zf-repetida')).toEqual(fill('frente-rayado'));
    const sources = editorialTextureSources(doc, b, 'espalda-');
    expect(sources.get('espalda-zf-repetida')).toEqual(fill('espalda-cuadros'));
    expect(sources.get('espalda-patch-aplique-zf-repetida')).toEqual(fill('parche-liso'));
    expect(sources.has('frente-zf-repetida')).toBe(false);
  });
});
