import { describe, expect, it } from 'vitest';
import { matApply, type BBox, type Mat, type Pt } from '../src/lib/geom/vec';
import { MOVE_HANDLE_SIZE, selectionMovePosition } from '../src/ui/selectionMoveGeometry';

const viewport: BBox = { minX: 0, minY: 0, maxX: 320, maxY: 230 };
const rect = (x: number, y: number, w: number, h: number): Pt[] => [{ x, y }, { x: x + w, y }, { x: x + w, y: y + h }, { x, y: y + h }];
function expectInside(position: Pt | undefined, box = viewport) {
  expect(position).toBeDefined();
  expect(position!.x - MOVE_HANDLE_SIZE / 2).toBeGreaterThanOrEqual(box.minX + 6);
  expect(position!.x + MOVE_HANDLE_SIZE / 2).toBeLessThanOrEqual(box.maxX - 6);
  expect(position!.y - MOVE_HANDLE_SIZE / 2).toBeGreaterThanOrEqual(box.minY + 6);
  expect(position!.y + MOVE_HANDLE_SIZE / 2).toBeLessThanOrEqual(box.maxY - 6);
}

describe('asa para mover selecciones pequeñas', () => {
  it('ofrece 48 px sobre una letra diminuta sin taparla', () => {
    const position = selectionMovePosition(rect(150, 100, 3, 6), viewport);
    expect(MOVE_HANDLE_SIZE).toBe(48);
    expect(position).toEqual({ x: 151.5, y: 68, side: 'above' });
    expectInside(position);
  });

  it('pasa debajo cuando no cabe arriba y conserva la separación', () => {
    const position = selectionMovePosition(rect(150, 3, 12, 8), viewport);
    expect(position).toEqual({ x: 156, y: 43, side: 'below' });
    expectInside(position);
  });

  it('pasa al costado si una selección alta ocupa ambos extremos', () => {
    const position = selectionMovePosition(rect(15, 2, 15, 225), viewport);
    expect(position).toEqual({ x: 62, y: 114.5, side: 'right' });
    expectInside(position);
    const right = selectionMovePosition(rect(295, 2, 15, 225), viewport);
    expect(right?.side).toBe('left');
    expectInside(right);
  });

  it('mantiene el botón completo dentro del visor en todos los bordes', () => {
    for (const x of [-100, 0, 10, 155, 310, 320, 500]) {
      for (const y of [-100, 0, 10, 110, 220, 230, 500]) {
        expectInside(selectionMovePosition(rect(x, y, 5, 5), viewport));
      }
    }
  });

  it('sigue disponible si la selección ocupa todo el visor, sin alterar sus puntos', () => {
    const corners = rect(-10, -10, 340, 250), original = structuredClone(corners);
    expectInside(selectionMovePosition(corners, viewport));
    expect(corners).toEqual(original);
  });

  it('admite una caja desplazada y las esquinas giradas/reflejadas de una manga', () => {
    const matrix: Mat = [0, -.5, -.5, 0, 245, 155];
    const corners = rect(-20, -30, 40, 60).map(p => matApply(matrix, p));
    const box = { minX: 40, minY: 20, maxX: 360, maxY: 250 };
    const position = selectionMovePosition(corners, box);
    expect(position).toEqual({ x: 245, y: 113, side: 'above' });
    expectInside(position, box);
  });

  it('no muestra un control con coordenadas inválidas o visor todavía sin tamaño', () => {
    expect(selectionMovePosition([], viewport)).toBeUndefined();
    expect(selectionMovePosition([{ x: NaN, y: 1 }], viewport)).toBeUndefined();
    expect(selectionMovePosition(rect(10, 10, 10, 10), { ...viewport, maxX: 0 })).toBeUndefined();
    expect(selectionMovePosition(rect(10, 10, 10, 10), { ...viewport, maxY: Infinity })).toBeUndefined();
  });
});
