import { describe, expect, it } from 'vitest';
import { newDesign, newElement, type DesignView } from '../src/features/studio/model';
import { createEmbroideryMotif } from '../src/lib/draw/embroideryMotifs';
import { EMBROIDERY_MOTIFS } from '../src/data/embroideryMotifs';
import { embroideryFitsView, firstEmbroideryPosition, moveEmbroidery } from '../src/features/simple/finishEmbroidery';

const view = (id: string, outline = 'M0 0H300V400H0Z'): DesignView => ({ id, label: id, kind: 'frente', source: { type: 'pieza', pieceId: id }, minX: 0, minY: 0, width: 300, height: 400, zones: [], outline, refY: 0, refLabel: 'Origen' });

describe('Bordados en el diseño completo conservan su patrón físico', () => {
  it('mueve todos los colores a otra pieza sin escalar ni cambiar el dibujo', () => {
    const front = view('frente'), back = view('espalda');
    const motif = createEmbroideryMotif(EMBROIDERY_MOTIFS[0].id, front.id, 100, 150, 60);
    const unrelated = newElement(front.id, { name: 'Otro detalle', x: 20, y: 20, w: 10, h: 10 });
    const doc = { ...newDesign([front, back]), elements: [...motif.elements, unrelated] };
    const moved = moveEmbroidery(doc, motif.groupId, { x: 190, y: 220 }, back.id, { id: 'espalda-derecha', label: 'Espalda derecha' });
    for (const original of motif.elements) {
      const result = moved.elements.find(element => element.id === original.id)!;
      expect(result).toMatchObject({ viewId: back.id, x: original.x + 90, y: original.y + 70, fill: original.fill });
      expect(result.w).toBeCloseTo(original.w, 10);
      expect(result.h).toBeCloseTo(original.h, 10);
      expect(result.vectorPath).toBe(original.vectorPath);
      expect(result).toHaveProperty('assemblySurfaceId', 'espalda-derecha');
    }
    expect(moved.elements.find(element => element.id === unrelated.id)).toEqual(unrelated);
    expect(doc.elements[0].viewId).toBe(front.id);
  });

  it('rechaza un bordado cuya caja cruza una abertura aunque sus esquinas estén dentro', () => {
    const opening = view('cuello', 'M0 0H120V160H180V0H300V400H0Z');
    const crossing = newElement(opening.id, { x: 150, y: 100, w: 200, h: 100 });
    expect(embroideryFitsView(crossing, opening)).toBe(false);
    expect(embroideryFitsView({ ...crossing, y: 240 }, opening)).toBe(true);
  });

  it('elige una posición que cabe en la pieza y rechaza tamaños imposibles', () => {
    const base = view('delantero');
    const element = newElement(base.id, { x: 0, y: 0, w: 70, h: 50 });
    const point = firstEmbroideryPosition(element, base, { x: -200, y: 30 });
    expect(point).toBeDefined();
    expect(embroideryFitsView({ ...element, ...point! }, base)).toBe(true);
    expect(firstEmbroideryPosition({ ...element, w: 1000 }, base)).toBeUndefined();
  });

  it('coloca el bordado en la cara visible de una manga y evita cruzar al reverso', () => {
    const sleeve = view('manga');
    const frontHalf = { minX: 0, minY: 0, maxX: 150, maxY: 400 };
    const motif = newElement(sleeve.id, { x: 0, y: 0, w: 70, h: 50 });
    const point = firstEmbroideryPosition(motif, sleeve, { x: 200, y: 200 }, frontHalf)!;
    expect(point.x).toBeLessThanOrEqual(115);
    expect(embroideryFitsView({ ...motif, ...point }, sleeve, frontHalf)).toBe(true);
    expect(embroideryFitsView({ ...motif, x: 140, y: 200 }, sleeve, frontHalf)).toBe(false);
  });
});
