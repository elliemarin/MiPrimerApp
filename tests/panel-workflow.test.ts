import { describe, expect, it } from 'vitest';
import { findModel } from '../src/data/catalog';
import { projectFromModel } from '../src/store/projects';
import { buildPattern } from '../src/lib/pattern/engine';
import { bboxOf } from '../src/lib/geom/vec';
import { pieceGeometryHash } from '../src/lib/pattern/panels';
import { applyPanelPattern, basePanelPattern, panelPatternFromDesign, preparePanelViews, StudioPanelCut, syncPanelZones } from '../src/features/studio/panelWorkflow';
import type { DesignDoc } from '../src/features/studio/model';
import type { Project, Fabric } from '../src/store/types';

function fixture() {
  const project=projectFromModel(findModel('individual-reversible')!);
  const original=project.design!;
  const prepared=preparePanelViews(project,original);
  const piece=basePanelPattern(project)!.pieces[0];
  const box=bboxOf(piece.nodes);
  const cut:StudioPanelCut={id:'corte-horizontal',viewId:prepared.viewId,pieceId:piece.id,allowance:10,baseHash:pieceGeometryHash(piece),points:[{x:box.minX-20,y:(box.minY+box.maxY)/2},{x:box.maxX+20,y:(box.minY+box.maxY)/2}]};
  return {project,original,prepared,piece,box,cut};
}

const withCut=()=>{const f=fixture();return {...f,doc:syncPanelZones(f.project,{...f.prepared.doc,panelCuts:[f.cut]},f.prepared.viewId)};};

describe('Cortes del estudio → patrones físicos',()=>{
  it('prepara piezas reales en mm conservando vistas anteriores y sin duplicarlas al repetir',()=>{
    const {project,original,prepared,piece}=fixture();
    expect(prepared.doc.views.length).toBe(original.views.length+2);
    expect(prepared.doc.views.slice(0,original.views.length)).toEqual(original.views);
    expect(original.views.some(v=>v.source.type==='pieza')).toBe(false);
    expect(prepared.doc.views.find(v=>v.id===prepared.viewId)?.source).toEqual({type:'pieza',pieceId:piece.id});
    const again=preparePanelViews(project,prepared.doc);
    expect(again.doc.views.map(v=>v.id)).toEqual(prepared.doc.views.map(v=>v.id));
    expect(again.viewId).toBe(prepared.viewId);
  });
  it('no convierte fotos o plantillas a patrones de costura por su parecido visual',()=>{
    const {project,prepared,cut,original}=fixture();
    const fake={...prepared.doc,panelCuts:[{...cut,viewId:original.views[0].id}]};
    expect(panelPatternFromDesign(project,fake).errors.join(' ')).toContain('pieza real');
    const withoutBase={...project,pattern:undefined};
    expect(()=>preparePanelViews(withoutBase,original)).toThrow('patrón base');
    expect(panelPatternFromDesign(withoutBase,original).pattern).toBeUndefined();
  });
  it('genera paneles, mantiene piezas no cortadas y crea una versión anterior recuperable',()=>{
    const {project,doc}=withCut();
    const preview=panelPatternFromDesign(project,doc);
    expect(preview.errors).toEqual([]);
    expect(preview.cutCount).toBe(1);
    expect(preview.baseCount).toBe(2);
    expect(preview.panelCount).toBe(3);
    expect(preview.built?.seamResults.every(s=>s.ok)).toBe(true);
    const applied=applyPanelPattern(project,preview.pattern!);
    expect(applied.patternVersions).toHaveLength(1);
    expect(applied.patternVersions[0].data).toEqual(project.pattern);
    expect(applied.pattern).not.toBe(project.pattern);
    expect(project.pattern?.panelCuts).toBeUndefined();
    expect(applied.status).toBe('patronaje');
    expect(buildPattern(applied.pattern!).pieces).toHaveLength(3);
  });
  it('presenta los paneles reales como zonas independientes e imprime su tela elegida',()=>{
    const {project,doc,prepared}=withCut();
    const view=doc.views.find(v=>v.id===prepared.viewId)!;
    expect(view.zones).toHaveLength(2);
    expect(view.zones.every(z=>z.id.startsWith('panel-'))).toBe(true);
    const zone=view.zones[0];
    const painted={...doc,views:doc.views.map(v=>v.id===view.id?{...v,zoneFills:{[zone.id]:{type:'tela' as const,fabricId:'lino',scale:1,rotation:0,offsetX:0,offsetY:0}}}:v)};
    const preview=panelPatternFromDesign(project,painted,{lino:{id:'lino',name:'Lino azul',color:'#286080'} as Fabric});
    expect(preview.errors).toEqual([]);
    expect(preview.pattern?.panelMaterials?.[zone.id.slice(6)]).toMatchObject({fabricId:'lino',name:'Lino azul'});
    expect(preview.built?.pieces.find(p=>p.id===zone.id.slice(6))?.name).toContain('Lino azul');
  });
  it('hereda el relleno de la zona de origen cuando se divide de nuevo',()=>{
    const {project,prepared,cut}=fixture();
    const view=prepared.doc.views.find(v=>v.id===prepared.viewId)!;
    const doc:DesignDoc={...prepared.doc,panelCuts:[cut],views:prepared.doc.views.map(v=>v.id===view.id?{...v,zoneFills:{[v.zones[0].id]:{type:'color',color:'#cc5500'}}}:v)};
    const synced=syncPanelZones(project,doc,view.id).views.find(v=>v.id===view.id)!;
    expect(Object.keys(synced.zoneFills!)).toHaveLength(2);
    expect(Object.values(synced.zoneFills!).every(f=>f.type==='color'&&f.color==='#cc5500')).toBe(true);
  });
  it('rechaza cortes antiguos si cambian medidas o geometría de base',()=>{
    const {project,doc}=withCut();
    const changed:Project={...project,pattern:{...project.pattern!,params:{...project.pattern!.params,ancho:600}}};
    const preview=panelPatternFromDesign(changed,doc);
    expect(preview.pattern).toBeUndefined();
    expect(preview.errors.join(' ')).toContain('Cambió la geometría');
    expect(project.pattern?.panelCuts).toBeUndefined();
  });
  it('permite quitar todos los cortes y restaurar el patrón conservando su versión panelada',()=>{
    const {project,doc}=withCut();
    const applied=applyPanelPattern(project,panelPatternFromDesign(project,doc).pattern!);
    const cleared={...doc,panelCuts:[]};
    const preview=panelPatternFromDesign(applied,cleared);
    expect(preview.errors).toEqual([]);
    expect(preview.cutCount).toBe(0);
    expect(preview.built?.pieces).toHaveLength(2);
    const restored=applyPanelPattern(applied,preview.pattern!);
    expect(restored.patternVersions).toHaveLength(2);
    expect(restored.patternVersions[1].data.panelCuts).toHaveLength(1);
    expect(restored.pattern?.panelCuts).toEqual([]);
  });
  it('restaura cortes de un patrón guardado cuando el diseño todavía no los tenía',()=>{
    const {project,doc,original}=withCut();
    const applied=applyPanelPattern(project,panelPatternFromDesign(project,doc).pattern!);
    const prepared=preparePanelViews(applied,original);
    expect(prepared.doc.panelCuts).toHaveLength(1);
    const cloned=JSON.parse(JSON.stringify(prepared.doc)) as DesignDoc;
    expect(panelPatternFromDesign(applied,cloned).errors).toEqual([]);
    expect(panelPatternFromDesign(applied,cloned).panelCount).toBe(3);
    expect(preparePanelViews(applied,{...prepared.doc,panelCuts:[]}).doc.panelCuts).toEqual([]);
  });
  it('no elimina cortes guardados en una pieza que no está representada en la vista editada',()=>{
    const {project,doc,piece,cut}=withCut();
    const second=basePanelPattern(project)!.pieces[1];
    const old={...cut,id:'corte-segunda',pieceId:second.id,baseHash:pieceGeometryHash(second)};
    const oldProject={...project,pattern:{...project.pattern!,panelCuts:[old]}};
    const narrow={...doc,views:doc.views.filter(v=>v.source.type!=='pieza'||v.source.pieceId===piece.id)};
    const preview=panelPatternFromDesign(oldProject,narrow);
    expect(preview.errors).toEqual([]);
    expect(preview.cutCount).toBe(2);
    expect(preview.panelCount).toBe(4);
  });
  it('propaga piezas excluidas del PDF a todos sus paneles sin reactivar ninguna',()=>{
    const {project,doc,piece}=withCut();
    const other=basePanelPattern(project)!.pieces[1];
    const excluded={...project,pattern:{...project.pattern!,noExport:[piece.id,other.id]}};
    const preview=panelPatternFromDesign(excluded,doc);
    expect(preview.errors).toEqual([]);
    const children=preview.built!.panelMapping![piece.id];
    expect(children).toHaveLength(2);
    expect(preview.pattern!.noExport!.sort()).toEqual([...children,other.id].sort());
    expect(preview.pattern!.noExport).not.toContain(piece.id);
    expect(preview.built!.pieces.every(p=>preview.pattern!.noExport!.includes(p.id))).toBe(true);
  });
  it('conserva una exclusión de panel individual al regenerar y recupera el padre al quitar cortes',()=>{
    const {project,doc,piece}=withCut();
    const initial=panelPatternFromDesign(project,doc);
    const child=initial.built!.panelMapping![piece.id][0];
    const applied={...project,pattern:{...initial.pattern!,noExport:[child]}};
    expect(panelPatternFromDesign(applied,doc).pattern!.noExport).toEqual([child]);
    const restored=panelPatternFromDesign(applied,{...doc,panelCuts:[]});
    expect(restored.errors).toEqual([]);
    expect(restored.pattern!.noExport).toEqual([piece.id]);
  });
  it('rechaza referencias perdidas y duplicadas sin generar un patrón parcial',()=>{
    const {project,doc,cut}=withCut();
    expect(panelPatternFromDesign(project,{...doc,panelCuts:[cut,cut]}).pattern).toBeUndefined();
    expect(panelPatternFromDesign(project,{...doc,views:doc.views.filter(v=>v.id!==cut.viewId)}).pattern).toBeUndefined();
  });
});
