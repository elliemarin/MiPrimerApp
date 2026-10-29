import type { PatternGenerator } from '../generator';
import { pantsGenerator } from './pants';
import { skirtGenerator } from './skirt';
import { toteGenerator } from './tote';

export const GENERATORS: PatternGenerator[] = [pantsGenerator, skirtGenerator, toteGenerator];

export function getGenerator(id: string): PatternGenerator | undefined {
  return GENERATORS.find((g) => g.id === id);
}
