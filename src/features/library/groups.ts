import { CATALOG, type CatalogModel } from '../../data/catalog';
import { getGenerator } from '../../lib/pattern/generators';
import type { ParamDef } from '../../lib/pattern/generator';

export interface CatalogGroup {
  id: string;
  name: string;
  models: CatalogModel[];
  representative: CatalogModel;
}

/** Call after filtering, so the card and starting recipe always match the query. */
export function groupCatalog(models: readonly CatalogModel[]): CatalogGroup[] {
  const groups = new Map<string, CatalogGroup>();
  for (const model of models) {
    const id = model.designGroup?.id ?? model.id;
    const entry = groups.get(id);
    if (entry) {
      entry.models.push(model);
      if (model.designGroup?.preferred) entry.representative = model;
    } else groups.set(id, { id, name: model.designGroup?.name ?? model.name, models: [model], representative: model });
  }
  return [...groups.values()];
}

export function findCatalogGroup(modelId: string, models: readonly CatalogModel[] = CATALOG): CatalogGroup | undefined {
  const model = models.find(candidate => candidate.id === modelId);
  if (!model) return undefined;
  const id = model.designGroup?.id ?? model.id;
  return groupCatalog(models.filter(candidate => (candidate.designGroup?.id ?? candidate.id) === id))[0];
}

export interface CatalogVariantAxis {
  key: string;
  label: string;
  type: ParamDef['type'];
  advanced: boolean;
  options: { value: string; label: string }[];
}

/** Encoded values distinguish strings, ratios and implicit generator defaults. */
export function variantValue(model: CatalogModel, key: string): string {
  const value = model.params?.[key];
  return value === undefined ? '__base__' : JSON.stringify(value);
}

export function variantAxes(group: CatalogGroup): CatalogVariantAxis[] {
  const generator = getGenerator(group.representative.generatorId ?? '');
  if (!generator || group.models.length < 2) return [];
  return generator.params.filter(param => param.group !== 'margenes').flatMap(param => {
    const values = [...new Set(group.models.map(model => variantValue(model, param.key)))];
    if (values.length < 2) return [];
    values.sort((a, b) => a === '__base__' ? -1 : b === '__base__' ? 1 : typeof JSON.parse(a) === 'number' && typeof JSON.parse(b) === 'number' ? JSON.parse(a) - JSON.parse(b) : a.localeCompare(b, 'es'));
    return [{ key: param.key, label: param.label, type: param.type,
      advanced: param.group === 'holgura' || /elastico|traslape|jareta|solapa|frunce|escote|puente|lazo|cuello|sisa|tira|bolsillo|holgura/i.test(param.key),
      options: values.map(value => {
        if (value === '__base__') return { value, label: generator.requiredMeasures.length ? 'Según talla' : 'Valor original' };
        const decoded = JSON.parse(value) as string | number | boolean;
        const label = param.choices?.find(choice => choice.value === decoded)?.label;
        return { value, label: label ?? (param.type === 'length' && typeof decoded === 'number' ? `${Number((decoded / 10).toFixed(2)).toLocaleString('es-MX')} cm` : String(decoded)) };
      }) }];
  });
}

/** Choose a real recipe, keeping as many other current dimensions as possible.
 * Sparse accessory combinations are never interpolated into an untested recipe. */
export function selectVariant(group: CatalogGroup, current: CatalogModel, key: string, value: string): CatalogModel {
  const candidates = group.models.filter(model => variantValue(model, key) === value);
  if (!candidates.length) return current;
  if (candidates.some(model => model.id === current.id)) return current;
  const keys = variantAxes(group).map(axis => axis.key).filter(candidate => candidate !== key);
  const score = (model: CatalogModel) => keys.reduce((sum, candidate) => {
    const a = current.params?.[candidate], b = model.params?.[candidate];
    if (a === b) return sum;
    if (typeof a === 'number' && typeof b === 'number') return sum + 1 + Math.abs(a - b) / Math.max(Math.abs(a), Math.abs(b), 1);
    return sum + 2;
  }, 0);
  return candidates.reduce((best, model) => score(model) < score(best) ? model : best);
}
