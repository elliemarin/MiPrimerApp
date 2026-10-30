import { describe, expect, it } from 'vitest';
import { CATALOG } from '../src/data/catalog';
import { projectFromModel } from '../src/store/projects';
import { profileFromSize } from '../src/store/profiles';
import { buildPattern } from '../src/lib/pattern/engine';
import { getGenerator } from '../src/lib/pattern/generators';
import { SIZE_TABLES } from '../src/lib/sizes/tables';

/** Integration check: selecting a catalog preset must produce its own valid pieces,
 * not merely validate the default parameters of the underlying generator. */
describe('Patrones del catálogo con sus presets y tallas reales',()=>{
 const models=CATALOG.filter(model=>model.generatorId);
 for(const model of models) it(`${model.id}: crea y valida el patrón con sus parámetros del catálogo`,()=>{
  const gen=getGenerator(model.generatorId!)!;
  expect(gen,model.generatorId).toBeDefined();
  const recipient=model.recipients[0];
  const preferred={bebe:'B0-3',toddler:'E92',infantil:'E116',mujer:'M92',hombre:'H100',unisex:'M92'}[recipient];
  const table=SIZE_TABLES.find(t=>t.rows.some(r=>r.code===preferred))!;
  const row=table.rows.find(r=>r.code===preferred)!;
  const profile=gen.requiredMeasures.length?profileFromSize(table,row):undefined;
  const project=projectFromModel(model,profile);
  expect(project.pattern).toBeDefined();
  const built=buildPattern(project.pattern!);
  expect(built.missing,`${model.name}: faltan medidas`).toEqual([]);
  expect(built.issues.filter(i=>i.level==='error'),`${model.name}: ${JSON.stringify(built.issues)}`).toEqual([]);
  expect(built.pieces.length).toBeGreaterThan(0);
  for(const seam of built.seamResults)expect(seam.ok,`${model.name}: ${seam.relation.label}`).toBe(true);
  expect(built.cuts.size).toBe(built.pieces.length);
  if(model.params) for(const [key,value] of Object.entries(model.params)) if(key!=='largoRelativo') expect(project.pattern!.params[key],`${model.name}: ${key}`).toEqual(value);
 });
});
