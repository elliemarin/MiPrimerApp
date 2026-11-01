import type { PatternGenerator } from '../generator';
import { relaxedJacketGenerator, relaxedTopGenerator, ponchoGenerator, pinaforeGenerator } from './relaxed';
import { ACCESSORY_PLUS_GENERATORS } from './accessoriesPlus';
import { pantsGenerator } from './pants';
import { skirtGenerator } from './skirt';
import { toteGenerator } from './tote';
import { bibGenerator } from './bib';
import { beanieGenerator } from './beanie';
import { sleeveGenerator, cushionGenerator, scrunchieGenerator, bandanaGenerator, reversibleRectangleGenerator } from './accessories';
import { hoodieGenerator } from './hoodie';
import { COSTUME_GENERATORS } from './costumes';
import { babyBodysuitGenerator } from './babyBodysuit';
import { COSTUME_EXPANSION_GENERATORS } from './costumeExpansion';
import { GIRLS_GENERATORS } from './girls';
import { BABY_PLUS_GENERATORS } from './babyPlus';

export const GENERATORS: PatternGenerator[] = [pantsGenerator, skirtGenerator, toteGenerator, bibGenerator, beanieGenerator, sleeveGenerator, cushionGenerator, scrunchieGenerator, bandanaGenerator, reversibleRectangleGenerator, relaxedJacketGenerator, relaxedTopGenerator, ponchoGenerator, pinaforeGenerator, hoodieGenerator, babyBodysuitGenerator, ...ACCESSORY_PLUS_GENERATORS, ...COSTUME_GENERATORS, ...COSTUME_EXPANSION_GENERATORS, ...GIRLS_GENERATORS, ...BABY_PLUS_GENERATORS];

export function getGenerator(id: string): PatternGenerator | undefined {
  return GENERATORS.find((g) => g.id === id);
}
