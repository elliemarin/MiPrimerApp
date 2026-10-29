import type { MeasureKey, MeasureValues } from '../sizes/measurements';
import type { PersonKind } from '../sizes/tables';
import type { GeneratedPattern, Issue } from './types';

export type FabricType = 'plano' | 'punto';
export type Fit = 'ajustado' | 'regular' | 'holgado' | 'oversize';

export const FIT_LABEL: Record<Fit, string> = {
  ajustado: 'Ajustado',
  regular: 'Regular',
  holgado: 'Holgado',
  oversize: 'Oversize'
};

export interface GeneratorContext {
  body: MeasureValues;
  kind: PersonKind;
  fabric: FabricType;
  /** Elasticidad horizontal del tejido en % (0 para plano). */
  stretch: number;
  fit: Fit;
}

export type ParamValue = number | string | boolean;
export type Params = Record<string, ParamValue>;

export type ParamGroup = 'diseno' | 'holgura' | 'margenes';

export const PARAM_GROUP_LABEL: Record<ParamGroup, string> = {
  diseno: 'Diseño',
  holgura: 'Holgura de diseño y movimiento',
  margenes: 'Márgenes y dobladillos'
};

export interface ParamDef {
  key: string;
  label: string;
  group: ParamGroup;
  type: 'length' | 'choice' | 'ratio';
  choices?: { value: string; label: string }[];
  min?: number;
  max?: number;
  help?: string;
  /** Solo visible cuando se cumple la condición. */
  when?: (p: Params) => boolean;
}

export interface GeneratorResult extends GeneratedPattern {
  /** Comprobaciones específicas del modelo (p. ej. que la cintura pase por la cadera). */
  notices: Issue[];
}

export interface PatternGenerator {
  id: string;
  name: string;
  summary: string;
  status: 'implementado' | 'experimental';
  requiredMeasures: MeasureKey[];
  optionalMeasures: MeasureKey[];
  params: ParamDef[];
  defaults(ctx: GeneratorContext): Params;
  generate(ctx: GeneratorContext, params: Params): GeneratorResult;
}

export function missingMeasures(gen: PatternGenerator, body: MeasureValues): MeasureKey[] {
  return gen.requiredMeasures.filter((k) => !(typeof body[k] === 'number' && (body[k] as number) > 0));
}

export const num = (p: Params, k: string, d = 0): number => {
  const v = p[k];
  return typeof v === 'number' && Number.isFinite(v) ? v : d;
};

export const str = (p: Params, k: string, d = ''): string => {
  const v = p[k];
  return typeof v === 'string' ? v : d;
};

export const round1 = (v: number) => Math.round(v * 10) / 10;

export function isChild(kind: PersonKind) {
  return kind === 'bebe' || kind === 'toddler' || kind === 'infantil';
}
