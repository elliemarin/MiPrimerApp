import type { FigureCategory, FigureDef } from '../../lib/applique/figure';
import { FIGURE_CATEGORY_LABEL } from '../../lib/applique/figure';
export { FIGURE_CATEGORY_LABEL };
import { NATURE_FIGURES } from './nature';
import { ANIMAL_FIGURES } from './animals';
import { EVERYDAY_FIGURES } from './everyday';
import { PEOPLE_FIGURES } from './people';
import { ART_FIGURES } from './art';

/* Biblioteca de figuras de tela por capas: diseños originales de Hilvana.
 * Las capas de cada figura van de atrás hacia delante; el motor
 * (src/lib/applique/figure.ts) calcula solapas, profundidad y piezas. */
export const FABRIC_FIGURES: FigureDef[] = [...NATURE_FIGURES, ...ANIMAL_FIGURES, ...EVERYDAY_FIGURES, ...PEOPLE_FIGURES, ...ART_FIGURES];

export const FIGURE_CATEGORIES = (Object.keys(FIGURE_CATEGORY_LABEL) as FigureCategory[]).map(id => ({ id, label: FIGURE_CATEGORY_LABEL[id], count: FABRIC_FIGURES.filter(f => f.category === id).length }));

const fold = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
export function figureMatches(def: FigureDef, category: FigureCategory | 'todas', query: string): boolean {
  if (category !== 'todas' && def.category !== category) return false;
  const words = fold(query).split(/\s+/).filter(Boolean);
  const text = fold([def.name, def.description, ...def.tags, ...def.layers.map(l => l.name)].join(' '));
  return words.every(w => text.includes(w));
}
export const findFigure = (id: string) => FABRIC_FIGURES.find(f => f.id === id);
