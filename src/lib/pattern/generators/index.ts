import type { PatternGenerator } from '../generator';
import { pantsGenerator } from './pants';
import { skirtGenerator } from './skirt';
import { toteGenerator } from './tote';
import { bibGenerator } from './bib';
import { beanieGenerator } from './beanie';
import { sleeveGenerator, cushionGenerator, scrunchieGenerator, bandanaGenerator, reversibleRectangleGenerator } from './accessories';

export const GENERATORS: PatternGenerator[] = [pantsGenerator, skirtGenerator, toteGenerator, bibGenerator, beanieGenerator, sleeveGenerator, cushionGenerator, scrunchieGenerator, bandanaGenerator, reversibleRectangleGenerator];

export function getGenerator(id: string): PatternGenerator | undefined {
  return GENERATORS.find((g) => g.id === id);
}
