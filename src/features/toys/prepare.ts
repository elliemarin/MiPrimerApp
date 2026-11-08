import type { GeneratorContext, Params } from '../../lib/pattern/generator';
import { getGenerator } from '../../lib/pattern/generators';
import { buildPattern, newPatternState } from '../../lib/pattern/engine';
import type { PlushCard } from '../../data/toys';

/** Toys use no body measurements: a neutral context, only the toy's own parameters. */
export const TOY_CONTEXT: GeneratorContext = { body: {}, kind: 'mujer', fabric: 'plano', stretch: 0, fit: 'regular' };

export function prepareToy(card: PlushCard, input: Params = {}) {
  const generator = getGenerator(card.generatorId)!;
  const params = { ...generator.defaults(TOY_CONTEXT), ...card.params, ...input };
  const state = newPatternState(generator.id, {}, TOY_CONTEXT);
  state.params = params;
  return { generator, params, built: buildPattern(state) };
}
