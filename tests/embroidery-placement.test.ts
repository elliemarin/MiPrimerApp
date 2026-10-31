import { describe, expect, it } from 'vitest';
import { matInvert, type Mat } from '../src/lib/geom/vec';
import { newDesign, newElement, type DesignView } from '../src/features/studio/model';
import type { AssemblyScene, AssemblySurface } from '../src/features/simple/assembled';
import { embroideryAtPointer, embroideryPointerOffset, embroiderySceneCorners } from '../src/features/simple/embroideryPlacement';
import { embroideryFitsView } from '../src/features/simple/finishEmbroidery';

const view: DesignView = { id: 'frente', label: 'Frente', kind: 'frente', source: { type: 'pieza', pieceId: 'frente' }, minX: 0, minY: 0, width: 200, height: 200, zones: [], outline: 'M0 0H200V200H0Z', refY: 0, refLabel: 'Origen' };
function surface(id: string, matrix: Mat, path: string): AssemblySurface {
  return { id, label: id, viewId: view.id, zoneId: id, primary: true, view, matrix, inverse: matInvert(matrix), path, physicalBounds: { minX: 0, minY: 0, maxX: 200, maxY: 200 } };
}
const left = surface('izquierda', [.5, 0, 0, .5, 0, 0], 'M0 0H100V100H0Z');
const right = surface('derecha', [-.5, 0, 0, .5, 220, 0], 'M120 0H220V100H120Z');
const scene: AssemblyScene = { id: 'look', label: 'Diseño', view, surfaces: [left, right] };
const root = newElement(view.id, { id: 'logo', kind: 'grupo', x: 100, y: 80, w: 20, h: 10, embroidery: { kind: 'image' }, assemblySurfaceId: left.id });
const child = newElement(view.id, { id: 'imagen', parentId: root.id, kind: 'imagen', x: root.x, y: root.y, w: root.w, h: root.h, image: { fileId: 'png', naturalW: 40, naturalH: 20 } });
const doc = { ...newDesign([view]), elements: [child, root] };

describe('Asa flotante y posiciones físicas de bordados', () => {
  it('agarrar el asa encima del dibujo no mueve el centro ni cambia de superficie', () => {
    const pointer = { x: 50, y: -15 };
    const offset = embroideryPointerOffset(root, pointer, left);
    const next = embroideryAtPointer(doc, root.id, pointer, offset, view, scene, left);
    expect(next.surface?.id).toBe(left.id);
    expect(next.doc).toBe(doc);
    expect(next.doc.elements.find(e => e.id === root.id)).toMatchObject({ x: 100, y: 80, w: 20, h: 10 });
  });

  it('cruza a una pierna espejada siguiendo el centro y sin cambiar la escala física', () => {
    const offset = embroideryPointerOffset(root, { x: 50, y: 5 }, left);
    const next = embroideryAtPointer(doc, root.id, { x: 170, y: 15 }, offset, view, scene, left);
    expect(next.surface?.id).toBe(right.id);
    expect(next.doc.elements.find(e => e.id === root.id)).toMatchObject({ x: 100, y: 100, w: 20, h: 10 });
    expect(next.doc.elements.find(e => e.id === child.id)).toMatchObject({ x: 100, y: 100, image: child.image, assemblySurfaceId: right.id });
    const second = embroideryAtPointer(doc, root.id, { x: 180, y: 15 }, offset, view, scene, right);
    expect(second.doc.elements.find(e => e.id === root.id)?.x).toBeCloseTo(80);
  });

  it('desplaza los hijos juntos en piezas y conserva el lado elegido de la prenda', () => {
    const offset = embroideryPointerOffset(root, { x: 103, y: 35 });
    const next = embroideryAtPointer(doc, root.id, { x: 115, y: 47 }, offset, view);
    expect(next.doc.elements.find(e => e.id === root.id)).toMatchObject({ x: 112, y: 92, assemblySurfaceId: left.id });
    expect(next.doc.elements.find(e => e.id === child.id)).toMatchObject({ x: 112, y: 92, w: 20, h: 10 });
  });

  it('calcula el asa en el dibujo visible manteniendo la imagen legible en espejo', () => {
    const corners = embroiderySceneCorners(root, right);
    expect(Math.min(...corners.map(p => p.x))).toBeCloseTo(165);
    expect(Math.max(...corners.map(p => p.x))).toBeCloseTo(175);
    expect(corners[1].x).toBeGreaterThan(corners[0].x);
  });

  it('soltar fuera conserva coordenadas inválidas para rechazarlas, sin fijar la última posición válida', () => {
    const offset = embroideryPointerOffset(root, { x: 50, y: 5 }, left);
    const next = embroideryAtPointer(doc, root.id, { x: -100, y: -150 }, offset, view, scene, left);
    expect(embroideryFitsView(next.doc.elements.find(e => e.id === root.id)!, view, next.surface?.physicalBounds)).toBe(false);
    expect(doc.elements.find(e => e.id === root.id)).toEqual(root);
  });
});
