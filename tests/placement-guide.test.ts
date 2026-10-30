import { describe, expect, it } from 'vitest';
import { blankProject } from '../src/store/projects';
import { newPatternState } from '../src/lib/pattern/engine';
import { newDesign, newElement, type DesignView } from '../src/features/studio/model';
import { componentElementId, syncComponentDesign } from '../src/features/customize/componentDesign';
import { preparePlacementGuide } from '../src/lib/pdf/placement';
import { createEmbroideryMotif } from '../src/lib/draw/embroideryMotifs';

function physicalView(id = 'pieza-vista', pieceId = 'delantero'): DesignView {
  return { id, kind: 'pieza', label: 'Delantero', source: { type: 'pieza', pieceId }, minX: -37, minY: -29, width: 450, height: 650,
    outline: 'M0 0 L400 0 L400 600 L0 600 Z', zones: [{ id: 'cuerpo', label: 'Cuerpo', type: 'delantero', d: 'M0 0 L400 0 L400 600 L0 600 Z' }], refY: 0, refLabel: 'Origen de la pieza' };
}

function projectWithPocket() {
  const project = blankProject('Chaqueta con bolsillo', 'base');
  project.design = newDesign([physicalView()]);
  project.pattern = newPatternState('manual', {}, { kind: 'mujer', fabric: 'plano', stretch: 0, fit: 'regular' });
  project.pattern.components = [{ id: 'bolsillo-preciso', name: 'Bolsillo cargo', kind: 'bolsillo-cargo', width: 80, height: 100, depth: 20, quantity: 2,
    placement: { viewId: 'pieza-vista', pieceId: 'delantero', x: 73.25, y: 144.5, label: 'Pecho derecho' } }];
  return syncComponentDesign(project);
}

describe('guía de colocación de extras y bordados', () => {
  it('conserva milímetros y origen de pieza, sin convertir el padding de la vista en el cero', () => {
    const project = projectWithPocket();
    const before = JSON.stringify(project);
    const guide = preparePlacementGuide(project);
    expect(JSON.stringify(project)).toBe(before);
    expect(guide.placements).toHaveLength(1);
    expect(guide.placements[0]).toMatchObject({ id: 'bolsillo-preciso', code: 'E1', kind: 'extra', pieceId: 'delantero', x: 73.25, y: 144.5, width: 80, height: 100, rotation: 0, quantity: 2, precise: true });
    expect(guide.drawings).toHaveLength(1);
    const drawing = guide.drawings[0].drawables[0];
    const vertical = drawing.paths.filter(path => path.style === 'referencia').flatMap(path => {
      const [a,b] = path.cmds;
      return a?.op === 'M' && b?.op === 'L' && a.p.x === b.p.x ? [a.p.x] : [];
    });
    expect(vertical).toContain(0);
    for (let i=1;i<vertical.length;i++) expect(vertical[i]-vertical[i-1]).toBe(10);
    expect(vertical).not.toContain(-37);
    const caption = drawing.labels.map(label => label.text).join(' ');
    expect(caption).toContain('X 73,25, Y 144,5 mm');
    expect(caption).toContain('80 × 100 mm');
    expect(guide.drawings[0].note).toContain('1:1');
    expect(guide.drawings[0].note).toContain('No cortes');
  });

  it('imprime una abeja como un motivo, con sus contornos amarillo/negro y posición real', () => {
    const project = projectWithPocket();
    const inserted = createEmbroideryMotif('abeja', 'pieza-vista', 180.5, 275.25, 60);
    project.design!.elements.push(...inserted.elements);
    const guide = preparePlacementGuide(project);
    const embroidery = guide.placements.filter(item => item.kind === 'bordado');
    expect(embroidery).toHaveLength(1);
    expect(embroidery[0]).toMatchObject({ code: 'B1', x: 180.5, y: 275.25, width: 60, height: 60, pieceId: 'delantero', precise: true });
    expect(guide.drawings[0].count).toBe(2);
    const colored = guide.drawings[0].drawables[0].paths.filter(path => path.style === 'bordado');
    expect(colored).toHaveLength(inserted.elements.length-1);
    const actualColors = new Set(inserted.elements.flatMap(element => element.fill.type === 'color' ? [element.fill.color] : []));
    expect(new Set(colored.map(path => path.fillColor))).toEqual(actualColors);
    expect(actualColors.size).toBeGreaterThan(1);
  });

  it('omite vistas vacías y elementos ocultos sin borrar posiciones de otras vistas', () => {
    const project = projectWithPocket();
    project.design!.views.push(physicalView('espalda-vista', 'espalda'));
    expect(preparePlacementGuide(project).drawings).toHaveLength(1);
    project.design!.elements = project.design!.elements.map(element => element.id === componentElementId('bolsillo-preciso','grupo') ? { ...element, hidden: true } : element);
    expect(preparePlacementGuide(project)).toEqual({ placements: [], drawings: [] });
    project.design!.elements.push(newElement('espalda-vista', { id: 'flor', name: 'Flor bordada', technique: 'bordado', x: 120, y: 180, w: 40, h: 40 }));
    const guide = preparePlacementGuide(project);
    expect(guide.drawings).toHaveLength(1);
    expect(guide.placements[0]).toMatchObject({ id: 'flor', kind: 'bordado', pieceId: 'espalda', x: 120, y: 180 });
  });

  it('distingue colocación ilustrativa de una marca física aunque use unidades de dibujo', () => {
    const project = projectWithPocket();
    project.design!.views[0] = { ...project.design!.views[0], kind: 'frente', source: { type: 'plantilla', flatId: 'chaleco', view: 'frente' } };
    project.pattern!.components![0].placement!.pieceId = undefined;
    const guide = preparePlacementGuide(project);
    expect(guide.placements[0].precise).toBe(false);
    expect(guide.placements[0].pieceId).toBeUndefined();
    expect(guide.drawings[0].note).toContain('ilustrativa');
    expect(guide.drawings[0].note).toContain('no verifica');
  });

  it('traza la huella seleccionada y el centro cuando el conjunto está girado', () => {
    const project = projectWithPocket();
    const body = project.design!.elements.find(element => element.id === componentElementId('bolsillo-preciso','cuerpo'))!;
    body.rotation = 30;
    const guide = preparePlacementGuide(project);
    expect(guide.placements[0].rotation).toBe(30);
    const footprint = guide.drawings[0].drawables[0].paths.find(path => path.style === 'colocacion' && path.color === '#9B651B')!;
    const first = footprint.cmds[0];
    expect(first.op).toBe('M');
    if (first.op === 'M') {
      expect(first.p.x).toBeCloseTo(body.x - 40*Math.cos(Math.PI/6) + 50*Math.sin(Math.PI/6), 8);
      expect(first.p.y).toBeCloseTo(body.y - 40*Math.sin(Math.PI/6) - 50*Math.cos(Math.PI/6), 8);
    }
  });
});
