import { describe, expect, it } from 'vitest';
import { componentAtPoint, componentFits, firstFittingPosition } from '../src/features/customize/placementDrag';
import { generateComponents, type PatternComponent } from '../src/lib/pattern/components';
import type { DesignView } from '../src/features/studio/model';
import type { Piece } from '../src/lib/pattern/types';

function concavePiece(): Piece {
  const piece = generateComponents([{ id: 'base', kind: 'bolsillo-parche', width: 300, height: 300, quantity: 1 }]).pieces[0];
  piece.id = 'delantero';
  const points = [[0, 0], [300, 0], [300, 100], [100, 100], [100, 300], [0, 300]];
  piece.nodes = points.map(([x, y], index) => ({ id: `n${index}`, x, y }));
  piece.edges = points.map((_, index) => ({ id: `e${index}`, from: `n${index}`, to: `n${(index + 1) % points.length}`, kind: 'line', allowance: 10, finish: 'costura', label: 'Contorno' }));
  return piece;
}
const view: DesignView = { id: 'real-front', kind: 'pieza', label: 'Delantero', source: { type: 'pieza', pieceId: 'delantero' }, minX: -20, minY: -20, width: 340, height: 340, zones: [], refY: 0, refLabel: 'Origen' };
const pocket: PatternComponent = { id: 'pequeno', kind: 'bolsillo-parche', width: 50, height: 70, quantity: 2 };

describe('colocación sencilla sobre piezas físicas', () => {
  it('guarda el centro real en milímetros y la pieza concreta, sin convertir a porcentajes', () => {
    const placed = componentAtPoint(pocket, view, { x: 47.125, y: 139.75 });
    expect(placed.placement).toEqual({ pieceId: 'delantero', viewId: 'real-front', x: 47.125, y: 139.75, label: 'Delantero' });
    expect(placed.width).toBe(50);
    expect(pocket.placement).toBeUndefined();
  });

  it('rechaza el hueco de una pieza cóncava aunque esté dentro de su caja rectangular', () => {
    const base = concavePiece();
    expect(componentFits(componentAtPoint(pocket, view, { x: 50, y: 180 }), view, [base])).toBe(true);
    expect(componentFits(componentAtPoint(pocket, view, { x: 180, y: 180 }), view, [base])).toBe(false);
    expect(componentFits(componentAtPoint(pocket, view, { x: 100, y: 100 }), view, [base])).toBe(false);
  });

  it('busca una posición inicial válida conservando dimensiones y cantidad elegidas', () => {
    const base = concavePiece();
    const placed = firstFittingPosition(pocket, view, [base], { x: 180, y: 180 });
    expect(placed).toBeDefined();
    expect(componentFits(placed!, view, [base])).toBe(true);
    expect([placed!.width, placed!.height, placed!.quantity]).toEqual([50, 70, 2]);
    expect(base.nodes[0]).toEqual({ id: 'n0', x: 0, y: 0 });
  });

  it('no reduce un extra grande para fingir que cabe y conserva avisos en vistas ilustrativas', () => {
    const tooLarge = { ...pocket, width: 180, height: 180 };
    expect(firstFittingPosition(tooLarge, view, [concavePiece()])).toBeUndefined();
    const flat = { ...view, id: 'illustration', source: { type: 'vacia' as const } };
    const placed = componentAtPoint(pocket, flat, { x: -12.5, y: 95 });
    expect(placed.placement?.pieceId).toBeUndefined();
    expect(componentFits(placed, flat, [])).toBe(true);
  });
});
