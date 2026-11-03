import type { FabricPattern, FigureCategory, FigureDef } from '../../lib/applique/figure';
import { asShape, type ShapeLike } from '../../lib/applique/shapes';

/** Una pieza: nombre, color de muestra, forma y estampado opcional (solo para la vista). */
export type LayerSpec = [name: string, color: string, shape: ShapeLike, pattern?: FabricPattern];

/** Figura original de Hilvana: las capas van de atrás hacia delante. */
export function fig(id: string, name: string, category: FigureCategory, tags: string[], widthMm: number, description: string, layers: LayerSpec[]): FigureDef {
  return { id, name, category, tags, description, width: widthMm, layers: layers.map(([n, color, shape, pattern]) => ({ name: n, color, shape: asShape(shape), pattern })) };
}
export const range = (n: number) => Array.from({ length: n }, (_, i) => i);
