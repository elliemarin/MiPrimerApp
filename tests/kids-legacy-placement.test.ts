import { describe, expect, it } from 'vitest';
import { findModel } from '../src/data/catalog';
import { projectFromModel } from '../src/store/projects';
import { profileFromSize } from '../src/store/profiles';
import { SIZE_TABLES } from '../src/lib/sizes/tables';
import { applyMaterial, artworkPlacementIssues, materialTargets, prepareSimpleProject } from '../src/features/simple/workflow';
import { buildAssembly } from '../src/features/simple/assembled';
import { basePanelPattern } from '../src/features/studio/panelWorkflow';
import { createEmbroideryMotif } from '../src/lib/draw/embroideryMotifs';
import { prepareSewingPack } from '../src/lib/pdf/projectPack';
import { syncComponentDesign } from '../src/features/customize/componentDesign';
import { embroideryFitsView } from '../src/features/simple/finishEmbroidery';

function fixture() {
  const table=SIZE_TABLES.find(table=>table.id==='ref-infantil-estatura')!;
  const profile=profileFromSize(table,table.rows.find(row=>row.code==='E92')!);
  const project=prepareSimpleProject(projectFromModel(findModel('delantal-pichi-liso')!,profile));
  const shoulder=basePanelPattern(project)!.pieces.find(piece=>piece.id==='delantal')!.lines.find(line=>line.id==='hombro')!.a.y;
  const scenes=buildAssembly(project), fronts=scenes.find(scene=>scene.label==='Frente')!.surfaces.filter(surface=>surface.pieceId==='delantal'), backs=scenes.find(scene=>scene.label==='Espalda')!.surfaces.filter(surface=>surface.pieceId==='delantal');
  const ctx={profiles:{[profile.id]:profile},fabrics:{},materials:{},unit:'cm' as const,mode:'complete' as const};
  return {project,shoulder,fronts,backs,ctx};
}
function colored(project:ReturnType<typeof fixture>['project']) {
  return applyMaterial(project,materialTargets(project).map(target=>target.id),{type:'color',color:'#5A8068'});
}

describe('proyectos guardados antes de corregir la ubicación del delantal',()=>{
  it('bloquea un bordado etiquetado Frente pero situado en la espalda física, sin moverlo',()=>{
    const {project,shoulder,fronts,ctx}=fixture(), front=fronts[0];
    const created=createEmbroideryMotif('panda-amigo',front.viewId,100,shoulder-80,30);
    project.design!.elements.push(...created.elements.map(element=>({...element,assemblySurfaceId:front.id,assemblySurfaceLabel:front.label})));
    const ready=colored(project), before=JSON.stringify(ready);
    const group=ready.design!.elements.find(element=>element.id===created.groupId)!;
    expect(embroideryFitsView(group,front.view)).toBe(true); // The whole cut piece alone accepts the old bad position.
    expect(artworkPlacementIssues(ready)).toEqual([expect.stringContaining('Revisa su ubicación en Acabados')]);
    expect(prepareSewingPack(ready,ctx).blockers).toEqual([expect.stringContaining('Frente')]);
    expect(JSON.stringify(ready)).toBe(before);
  });

  it('bloquea un bolsillo antiguo en la cara equivocada aunque quepa en la pieza completa',()=>{
    const {project,shoulder,fronts,ctx}=fixture(), front=fronts[0];
    const withPocket=syncComponentDesign({...project,pattern:{...project.pattern!,components:[{
      id:'bolsillo-antiguo',name:'Bolsillo antiguo',kind:'bolsillo-parche',width:50,height:50,quantity:1,
      placement:{viewId:front.viewId,pieceId:'delantal',x:100,y:shoulder-80,assemblySurfaceId:front.id,assemblySurfaceLabel:front.label}
    }]}});
    const ready=colored(withPocket),before=JSON.stringify(ready);
    expect(artworkPlacementIssues(ready)).toEqual([expect.stringContaining('Revisa su ubicación en Extras')]);
    expect(prepareSewingPack(ready,ctx).blockers).toEqual([expect.stringContaining('Bolsillo antiguo')]);
    expect(JSON.stringify(ready)).toBe(before);
  });

  it('acepta las dos mitades de frente y espalda, incluidos los reflejos X/Y',()=>{
    const {project,shoulder,fronts,backs,ctx}=fixture();
    for(const surface of [...fronts,...backs]) {
      const y=shoulder+(backs.includes(surface)?-100:100);
      const created=createEmbroideryMotif('panda-amigo',surface.viewId,100,y,30);
      project.design!.elements.push(...created.elements.map(element=>({...element,assemblySurfaceId:surface.id,assemblySurfaceLabel:surface.label})));
    }
    const ready=colored(project);
    expect(artworkPlacementIssues(ready)).toEqual([]);
    expect(prepareSewingPack(ready,ctx).blockers).toEqual([]);
  });

  it('conserva proyectos sin metadatos de cara y rechaza una referencia de cara inexistente',()=>{
    const {project,shoulder,fronts,ctx}=fixture(),front=fronts[0];
    const created=createEmbroideryMotif('panda-amigo',front.viewId,100,shoulder-80,30);
    project.design!.elements.push(...created.elements);
    const ready=colored(project), before=JSON.stringify(ready);
    expect(prepareSewingPack(ready,ctx).blockers).toEqual([]);
    expect(JSON.stringify(ready)).toBe(before);
    const missing={...ready,design:{...ready.design!,elements:ready.design!.elements.map(element=>element.id===created.groupId?{...element,assemblySurfaceId:'cara-eliminada'}:element)}};
    expect(prepareSewingPack(missing,ctx).blockers).toEqual([expect.stringContaining('ya no corresponde a la cara guardada')]);
  });

  it('no acepta una cara existente de otra pieza ni valida bordados ocultos',()=>{
    const {project,shoulder,fronts,ctx}=fixture(),front=fronts[0];
    const other=project.design!.views.find(view=>view.source.type==='pieza'&&view.source.pieceId==='cinta')!;
    const created=createEmbroideryMotif('panda-amigo',other.id,100,shoulder-80,30);
    project.design!.elements.push(...created.elements.map(element=>({...element,assemblySurfaceId:front.id})));
    const ready=colored(project);
    expect(prepareSewingPack(ready,ctx).blockers).toEqual([expect.stringContaining('ya no corresponde a la cara guardada')]);
    const hidden={...ready,design:{...ready.design!,elements:ready.design!.elements.map(element=>element.id===created.groupId?{...element,hidden:true}:element)}};
    expect(artworkPlacementIssues(hidden)).toEqual([]);
  });
});
