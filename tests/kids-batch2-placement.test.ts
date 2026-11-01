import { describe, expect, it } from 'vitest';
import { mkdirSync, writeFileSync } from 'node:fs';
import { findModel } from '../src/data/catalog';
import { projectFromModel } from '../src/store/projects';
import { profileFromSize } from '../src/store/profiles';
import { SIZE_TABLES } from '../src/lib/sizes/tables';
import { prepareSimpleProject } from '../src/features/simple/workflow';
import { basePanelPattern } from '../src/features/studio/panelWorkflow';
import { assemblyArtworkMatrix, assemblyArtworkReflection, assemblyComponentFits, assemblyHit, assemblyPoint, buildAssembly, inverseAssemblyPoint } from '../src/features/simple/assembled';
import { embroideryFitsView } from '../src/features/simple/finishEmbroidery';
import { elementWorldCmds, newElement } from '../src/features/studio/model';
import { matApply } from '../src/lib/geom/vec';
import { transformCmds } from '../src/lib/draw/paths';
import { preparePlacementGuide } from '../src/lib/pdf/placement';
import { exportTiledPdf } from '../src/lib/pdf/export';
import { DEFAULT_TILE } from '../src/lib/pdf/tile';
import { PDFDocument } from 'pdf-lib';

const table = SIZE_TABLES.find(t => t.id === 'ref-infantil-estatura')!;
function projectFor(model: string, code = 'E92') {
  return prepareSimpleProject(projectFromModel(findModel(model)!, profileFromSize(table, table.rows.find(row => row.code === code)!)));
}
function apron(model = 'delantal-pichi-liso', code = 'E92') {
  const project = projectFor(model, code), piece = basePanelPattern(project)!.pieces.find(p => p.id === 'delantal')!;
  return { project, piece, shoulder: piece.lines.find(line => line.id === 'hombro')!.a.y, scenes: buildAssembly(project) };
}

describe('colocación del segundo lote infantil sobre sus piezas reales', () => {
  it.each(['delantal-pichi-liso', 'delantal-pichi'])('%s separa frente y espalda en la línea de hombro de la pieza continua', model => {
    for (const code of ['E86', 'E92', 'E116', 'E140']) {
      const { piece, shoulder, scenes } = apron(model, code);
      const before = JSON.stringify(piece);
      for (const scene of scenes) {
        const back = scene.label === 'Espalda', surfaces = scene.surfaces.filter(s => s.pieceId === 'delantal');
        expect(surfaces).toHaveLength(2);
        for (const surface of surfaces) {
          if (back) { expect(surface.physicalBounds.maxY).toBeCloseTo(shoulder, 5); expect(surface.matrix[3]).toBeLessThan(0); }
          else { expect(surface.physicalBounds.minY).toBeCloseTo(shoulder, 5); expect(surface.matrix[3]).toBeGreaterThan(0); }
          const center = { x: (surface.physicalBounds.minX + surface.physicalBounds.maxX) / 2, y: shoulder + (back ? -100 : 100) };
          const shown = assemblyPoint(surface, center), restored = inverseAssemblyPoint(surface, shown);
          expect(restored.x).toBeCloseTo(center.x, 6); expect(restored.y).toBeCloseTo(center.y, 6);
          const hit = assemblyHit(scene, shown, surface.id);
          expect(hit?.surface.id).toBe(surface.id);
          expect(hit?.point.y).toBeCloseTo(center.y, 6);
          const element = newElement(surface.viewId, { ...center, w: 20, h: 20 });
          expect(embroideryFitsView(element, surface.view, surface.physicalBounds)).toBe(true);
          const otherFace = { ...element, y: shoulder + (back ? 100 : -100) };
          expect(embroideryFitsView(otherFace, surface.view, surface.physicalBounds)).toBe(false);
        }
      }
      expect(JSON.stringify(piece)).toBe(before);
    }
  });

  it('el pecho del dibujo del delantal corresponde al delantero, no a la espalda abierta del patrón', () => {
    const { shoulder, scenes } = apron();
    for (const scene of scenes) {
      const back = scene.label === 'Espalda';
      for (const surface of scene.surfaces.filter(s => s.pieceId === 'delantal')) {
        const sign = surface.matrix[0] < 0 ? -1 : 1;
        const hit = assemblyHit(scene, { x: sign * 100, y: 100 }, surface.id)!;
        expect(hit.surface.id).toBe(surface.id);
        expect(hit.point.y).toBeCloseTo(shoulder + (back ? -100 : 100), 5);
        const moved = inverseAssemblyPoint(surface, { x: sign * 100, y: 120 });
        expect(moved.y - hit.point.y).toBeCloseTo(back ? -20 : 20, 5);
        const component = { id: 'prueba', kind: 'bolsillo-parche' as const, width: 20, height: 20, quantity: 1, allowance: 7,
          placement: { ...hit.point, viewId: surface.viewId, pieceId: surface.pieceId, assemblySurfaceId: surface.id } };
        expect(assemblyComponentFits(surface, component)).toBe(true);
      }
    }
  });

  it.each(['mono-pichi-bolsillos', 'mono-pico-volantes', 'peto-infantil-largo'])('%s coloca costados, botones y centros en la copia dibujada correcta', id => {
    const project = projectFor(id), pieces = basePanelPattern(project)!.pieces;
    for (const scene of buildAssembly(project)) {
      const pieceId = scene.label === 'Frente' ? 'delantero' : 'espalda';
      const physical = pieces.find(p => p.id === pieceId)!;
      const source = physical.marks.find(mark => ['boton-tirante', 'ojal-hombro', 'tirante', 'boton-hombro'].includes(mark.id))!.at;
      for (const surface of scene.surfaces.filter(s => s.pieceId === pieceId)) {
        const sign = surface.zoneId.endsWith('--1') ? -1 : 1;
        const shown = assemblyPoint(surface, source);
        expect(shown.x).toBeCloseTo(sign * source.x, 4);
        expect(shown.y).toBeCloseTo(source.y, 4);
        expect(Math.sign(surface.matrix[0])).toBe(sign);
      }
    }
    const pockets = buildAssembly(project)[0].surfaces.filter(s => s.pieceId === 'bolsillo' && s.zoneId.includes('--'));
    for (const pocket of pockets) expect(pocket.matrix[0] < 0).toBe(pocket.zoneId.endsWith('--1'));
  });

  it('mantiene nombres y logos derechos en ambas mitades y caras del delantal', () => {
    for (const scene of apron().scenes) for (const surface of scene.surfaces.filter(s => s.pieceId === 'delantal')) {
      const center = { x: 110, y: (surface.physicalBounds.minY + surface.physicalBounds.maxY) / 2 };
      const element = newElement(surface.viewId, { ...center, w: 40, h: 20 });
      const matrix = assemblyArtworkMatrix(surface, element);
      const shown = matApply(matrix, center), target = assemblyPoint(surface, center);
      expect(shown.x).toBeCloseTo(target.x, 7); expect(shown.y).toBeCloseTo(target.y, 7);
      // A rightward/upward point on an upright F or logo stays rightward/upward.
      expect(matApply(matrix, { x: center.x + 10, y: center.y }).x).toBeGreaterThan(shown.x);
      expect(matApply(matrix, { x: center.x, y: center.y - 10 }).y).toBeLessThan(shown.y);
      expect(element.w).toBe(40); expect(element.h).toBe(20);
    }
  });

  it('imprime la ubicación física de la espalda con giro o espejo y sin alterar su dibujo independiente', async () => {
    const { project, shoulder, scenes } = apron();
    const surfaces = scenes.find(scene => scene.label === 'Espalda')!.surfaces.filter(s => s.pieceId === 'delantal');
    for (const [i, surface] of surfaces.entries()) {
      const element = newElement(surface.viewId, { id: `inicial-f-${i}`, name: `Inicial F ${i}`, technique: 'bordado', kind: 'trazo', shape: undefined,
        x: 110, y: shoulder - 100, w: 40, h: 50,
        path: { pts: [[-.5, .5], [-.5, -.5], [.5, -.5], [.5, -.25], [-.2, -.25], [-.2, 0], [.25, 0], [.25, .25], [-.2, .25], [-.2, .5]], closed: true, smooth: false },
        assemblySurfaceId: surface.id, assemblySurfaceLabel: surface.label });
      project.design!.elements.push(element);
    }
    const before = JSON.stringify(project), result = preparePlacementGuide(project);
    expect(result.drawings).toHaveLength(2);
    for (const element of project.design!.elements.filter(e => e.id.startsWith('inicial-f-'))) {
      const surface = surfaces.find(s => s.id === element.assemblySurfaceId)!;
      const drawing = result.drawings.find(d => d.id.endsWith(surface.id))!;
      const reflection = assemblyArtworkReflection(surface, element);
      const placement = result.placements.find(p => p.id === element.id)!;
      expect(placement).toMatchObject({ x: 110, y: shoulder - 100, width: 40, height: 50, precise: true });
      const printed = drawing.drawables[0].paths.find(path => path.style === 'bordado')!.cmds;
      expect(printed).toEqual(transformCmds(elementWorldCmds(element), reflection));
      if (reflection[0] < 0) { expect(placement.rotatedOnGuide).toBe(true); expect(placement.mirroredOnGuide).toBe(false); expect(drawing.note).toContain('gira 180°'); }
      else { expect(placement.mirroredOnGuide).toBe(true); expect(drawing.note).toContain('por el reverso'); }
    }
    expect(JSON.stringify(project)).toBe(before);
    const pdf = await exportTiledPdf(result.drawings[0].drawables, { settings: DEFAULT_TILE }, { title: 'Ubicación en delantal', lines: result.drawings.map(d => d.note), footer: 'Prueba física en mm', json: result.placements });
    expect((await PDFDocument.load(pdf.bytes)).getPageCount()).toBeGreaterThan(1);
    if (process.env.PDF_OUT) { mkdirSync(process.env.PDF_OUT, { recursive: true }); writeFileSync(`${process.env.PDF_OUT}/delantal-ubicacion.pdf`, pdf.bytes); }
  });
});
