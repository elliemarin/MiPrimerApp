import { describe,it,expect } from 'vitest';
import { projectFromModel } from '../src/store/projects';
import { profileFromSize } from '../src/store/profiles';
import { findSize,SIZE_TABLES } from '../src/lib/sizes/tables';
import { findModel } from '../src/data/catalog';
import { prepareSimpleProject,physicalViewsNeedRefresh } from '../src/features/simple/workflow';
import { syncComponentDesign } from '../src/features/customize/componentDesign';
import { prepareSewingPack } from '../src/lib/pdf/projectPack';
import { createEmbroideryMotif } from '../src/lib/draw/embroideryMotifs';

describe('cambiar las medidas después de colocar extras',()=>{
 it('actualiza vistas reales aunque un extra ya no quepa y bloquea el PDF con una vista antigua',()=>{
  const table=SIZE_TABLES.find(t=>t.id==='ref-mujer-busto')!;
  const source=prepareSimpleProject(projectFromModel(findModel('pantalon-recto-elastico')!,profileFromSize(table,findSize(table.id,'M96')!)));
  expect(physicalViewsNeedRefresh(source)).toBe(false);
  const view=source.design!.views.find(v=>v.source.type==='pieza')!;
  const changed={...source,pattern:{...source.pattern!,body:{...source.pattern!.body,cadera:1200},components:[{id:'extra',kind:'bolsillo-parche' as const,width:500,height:700,quantity:1,placement:{pieceId:view.source.type==='pieza'?view.source.pieceId:undefined,viewId:view.id,x:100,y:300}}]}};
  const withExtra=syncComponentDesign(changed);
  expect(physicalViewsNeedRefresh(withExtra)).toBe(true);
  const check=prepareSewingPack(withExtra,{profiles:{},fabrics:{},materials:{},unit:'cm'});
  expect(check.blockers.some(error=>error.includes('Cambió la base'))).toBe(true);
  const refreshed=prepareSimpleProject(withExtra);
  expect(physicalViewsNeedRefresh(refreshed)).toBe(false);
  expect(refreshed.pattern!.components).toEqual(withExtra.pattern!.components);
  expect(refreshed.design!.elements).toEqual(withExtra.design!.elements);
  expect(refreshed.design!.views.find(v=>v.id===view.id)?.outline).not.toBe(view.outline);
  const outside=createEmbroideryMotif('abeja',view.id,9000,9000,50);
  const art={...source,design:{...source.design!,elements:outside.elements}};
  expect(prepareSewingPack(art,{profiles:{},fabrics:{},materials:{},unit:'cm'}).blockers.some(error=>error.includes('se sale de la pieza actual'))).toBe(true);
 });
});
