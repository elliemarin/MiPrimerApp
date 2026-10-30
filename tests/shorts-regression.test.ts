import { describe, expect, it } from 'vitest';
import { CATALOG } from '../src/data/catalog';
import { SIZE_TABLES } from '../src/lib/sizes/tables';
import { profileFromSize } from '../src/store/profiles';
import { patternFor } from '../src/store/projects';
import { buildPattern } from '../src/lib/pattern/engine';
import { getGenerator } from '../src/lib/pattern/generators';
import { edgeLength } from '../src/lib/pattern/outline';
const model=CATALOG.find(m=>m.id==='short-elastico')!;
const tables=SIZE_TABLES.filter(t=>['ref-bebe-meses','ref-mujer-busto','ref-hombre-pecho'].includes(t.id));

describe('Short de catálogo: tiro terminado, pañal y bajo de muslo',()=>{
 for(const table of tables) for(const row of table.rows) for(const fabric of ['plano','punto'] as const) it(`${row.code} ${fabric}: conserva costuras y corte sin invadir el tiro`,()=>{
  const profile=profileFromSize(table,row);
  const state=patternFor(model,profile,fabric,fabric==='punto'?30:0,'regular')!;
  const gen=getGenerator(state.generatorId)!;
  const defaults=gen.defaults({body:state.body,...state.context});
  const built=buildPattern(state);
  expect(built.issues.filter(i=>i.level==='error'),JSON.stringify(built.issues)).toEqual([]);
  for(const seam of built.seamResults) expect(seam.ok,seam.relation.label).toBe(true);
  const front=built.pieces.find(p=>p.id==='delantero')!,back=built.pieces.find(p=>p.id==='trasero')!;
  const frontTip=front.nodes.find(n=>n.id==='tiro-punta')!;
  const backTip=back.nodes.find(n=>n.id==='tiro-punta')!;
  const hem=front.nodes.find(n=>n.id==='bajo-ext')!;
  const diaper=Number(defaults.panal);
  expect(frontTip.y).toBe(row.values.tiro!+Number(defaults.holguraTiro)+diaper);
  expect(hem.y-backTip.y).toBeGreaterThanOrEqual(Number(defaults.dobladillo)+Number(defaults.margen)-.51);
  expect(hem.y).toBe(Number(state.params.largo));
  expect(built.cuts.size).toBe(built.pieces.length);
  // Both leg hem panels together equal the actual upper-thigh contour;
  // neither an ankle-width default nor a second seam allowance is added.
  const frontWidth=front.nodes.find(n=>n.id==='tiro-punta')!.x;
  const backWidth=back.nodes.find(n=>n.id==='tiro-punta')!.x;
  const totalHem=edgeLength(front,front.edges.find(e=>e.id==='bajo')!)+edgeLength(back,back.edges.find(e=>e.id==='bajo')!);
  expect(totalHem).toBeCloseTo(frontWidth+backWidth,5);
 });
 it('respeta un contorno de bajo explícito en el modelo',()=>{
  const table=tables.find(t=>t.id==='ref-mujer-busto')!,row=table.rows[3];
  const profile=profileFromSize(table,row);
  const state=patternFor({...model,params:{...model.params,bajo:500}},profile,'plano',0,'regular')!;
  expect(state.params.bajo).toBe(500);
 });
});
