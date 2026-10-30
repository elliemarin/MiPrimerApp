import { describe, expect, it, vi } from 'vitest';
import { PDFDocument } from 'pdf-lib';
import { mkdirSync, writeFileSync } from 'fs';
import { applyMaterial, materialTargets, missingMaterials, prepareSimpleProject, simpleViews } from '../src/features/simple/workflow';
import { quickSize } from '../src/lib/sizes/quickSizes';
import { COMPONENT_OPTIONS, createComponent } from '../src/data/components';
import { componentElementId, componentPaintRoles, syncComponentDesign } from '../src/features/customize/componentDesign';
import { findModel } from '../src/data/catalog';
import { projectFromModel } from '../src/store/projects';
import { blankProfile, profileFromSize } from '../src/store/profiles';
import type { Fabric, Project } from '../src/store/types';
import { createEmbroideryMotif } from '../src/lib/draw/embroideryMotifs';
import { createLettering } from '../src/lib/draw/lettering';
import { embroideryForView } from '../src/features/projects/tabs/embroideryExport';
import { buildSummaryPdf } from '../src/lib/pdf/summary';
import { PdfCanvas } from '../src/lib/pdf/canvas';

function cameraProject():Project {
  let project=prepareSimpleProject(projectFromModel(findModel('bolsa-tote')!));
  const view=simpleViews(project.design!)[0];
  const camera=COMPONENT_OPTIONS.find(option=>option.kind==='porta-telefono-camara')!;
  project={...project,pattern:{...project.pattern!,components:[{...createComponent(camera,'telefono',view),placement:{viewId:view.id,x:180,y:210,label:'Teléfono de trabajo'}}]}};
  return syncComponentDesign(project);
}

const fabric:Fabric={id:'foto-tela',name:'Mezclilla fotografiada',kind:'plano',composition:'Algodón',color:'#183E65',visualRepeatMm:100,grainAngle:0,nap:'sin-pelo',createdAt:'2026-10-30T00:00:00.000Z',updatedAt:'2026-10-30T00:00:00.000Z',photo:{originalFileId:'foto-original',processedFileId:'foto-ligera',pxW:1200,pxH:900,adjust:{brightness:0,contrast:0,saturation:0,warmth:0}}};

describe('recorrido sencillo con materiales explícitos',()=>{
  it('ofrece cientos de extras reales y exige las cinco superficies del portacelular con cámara',()=>{
    expect(COMPONENT_OPTIONS.length).toBeGreaterThanOrEqual(400);
    const project=cameraProject(),targets=materialTargets(project);
    const component=project.pattern!.components![0];
    expect(componentPaintRoles(component)).toEqual(['cuerpo','marco-superior','marco-izq','marco-der','frente-inferior']);
    const extras=targets.filter(target=>target.kind==='elemento');
    expect(extras).toHaveLength(5);
    expect(new Set(extras.map(target=>target.targetId))).toEqual(new Set(componentPaintRoles(component).map(role=>componentElementId(component.id,role))));
    expect(targets.filter(target=>target.kind==='zona').length).toBeGreaterThan(0);
    // Default preview colors have not been chosen by the person.
    expect(missingMaterials(project)).toHaveLength(targets.length);
    expect(simpleViews(project.design!).every(view=>view.source.type==='pieza')).toBe(true);
  });

  it('permite confirmar un mismo material para todo y vuelve a pedir cambios que no se hayan confirmado',()=>{
    const original=cameraProject(),targets=materialTargets(original);
    const painted=applyMaterial(original,targets.map(target=>target.id),{type:'color',color:'#3366AA'});
    expect(missingMaterials(painted)).toEqual([]);
    expect(missingMaterials(original)).toHaveLength(targets.length);
    const body=componentElementId('telefono','cuerpo');
    const changed={...painted,design:{...painted.design!,elements:painted.design!.elements.map(element=>element.id===body?{...element,fill:{type:'color' as const,color:'#D94F54'}}:element)}};
    expect(missingMaterials(changed).map(target=>target.targetId)).toEqual([body]);
    const reapproved=applyMaterial(changed,[`elemento:${body}`],{type:'color',color:'#D94F54'});
    expect(missingMaterials(reapproved)).toEqual([]);
    const cleared=applyMaterial(reapproved,[`elemento:${body}`],{type:'ninguno'});
    expect(missingMaterials(cleared).map(target=>target.targetId)).toEqual([body]);
  });

  it('una foto elegida se asocia a las partes correctas y un extra añadido requiere su elección nueva',()=>{
    const project=cameraProject(),targets=materialTargets(project);
    let complete=applyMaterial(project,targets.map(target=>target.id),{type:'tela',fabricId:fabric.id,scale:1,rotation:0,offsetX:0,offsetY:0},{[fabric.id]:fabric});
    expect(missingMaterials(complete)).toEqual([]);
    expect(complete.fabricIds).toContain(fabric.id);
    expect(complete.pattern!.components![0].materials?.['marco-superior']?.name).toBe(fabric.name);
    expect(complete.pattern!.components![0].materials?.cuerpo?.fabricId).toBe(fabric.id);
    const extra=createComponent(COMPONENT_OPTIONS.find(option=>option.kind==='bolsillo-parche')!,'nuevo',simpleViews(complete.design!)[0]);
    complete=syncComponentDesign({...complete,pattern:{...complete.pattern!,components:[...complete.pattern!.components!,extra]}});
    expect(missingMaterials(complete).map(target=>target.targetId)).toEqual([componentElementId('nuevo','cuerpo')]);
    expect(complete.design!.elements.find(element=>element.id===componentElementId('telefono','marco-superior'))?.fill.type).toBe('tela');
  });
});

describe('tallas sencillas y medidas personales',()=>{
  it('chica, mediana y grande señalan cuerpos explícitos de cada tabla propia',()=>{
    for(const [size,woman,man] of [['chica','M88','H92'],['mediana','M96','H100'],['grande','M104','H108']] as const) {
      const female=quickSize('mujer',size),male=quickSize('hombre',size);
      expect(female.row.code).toBe(woman);expect(male.row.code).toBe(man);
      expect(female.table.id).toBe('ref-mujer-busto');expect(male.table.id).toBe('ref-hombre-pecho');
      expect(female.row.values.pecho).toBe(Number(woman.slice(1))*10);
      expect(male.row.values.pecho).toBe(Number(man.slice(1))*10);
      expect(female.row.values.estatura).toBe(1640);expect(male.row.values.estatura).toBe(1760);
    }
  });
  it('personalizar conserva milímetros propios y la referencia exacta sin escalar una talla',()=>{
    const reference=quickSize('mujer','mediana');
    const profile=blankProfile('Mis medidas','mujer');
    const body={...reference.row.values,pecho:1013.5,cintura:823.7,cadera:1114.2};
    profile.versions[0].values=body;
    const project=projectFromModel(findModel('pantalon-recto-elastico')!,profile);
    expect(project.pattern!.body).toEqual(body);
    expect(project.pattern!.measurementRef?.versionId).toBe(profile.currentVersionId);
    expect(project.profileRef?.profileId).toBe(profile.id);
    expect(project.pattern!.body).not.toBe(profile.versions[0].values);
    const presetProfile=profileFromSize(reference.table,reference.row);
    expect(presetProfile.versions[0].source).toEqual({type:'tabla',tableId:reference.table.id,code:'M96'});
    expect(reference.row.values.cadera).toBe(1040);
  });
});

describe('guía sencilla de bordados y colores en PDF',()=>{
  it('condensa cada motivo y texto en un dibujo de colores con contornos, sin la caja de grupo',()=>{
    const project=cameraProject(),view=simpleViews(project.design!)[0];
    const bee=createEmbroideryMotif('abeja',view.id,165,240,60),letters=createLettering('B8O','clara',view.id,120,140,25,'#D94F54');
    const doc={...project.design!,elements:[...project.design!.elements,...bee.elements,...letters.elements]};
    const drawings=embroideryForView(doc,view.id);
    expect(drawings).toHaveLength(2);
    const beeDrawing=drawings.find(drawing=>drawing.name==='Abeja')!;
    expect(beeDrawing.paths).toHaveLength(bee.elements.length-1);
    expect(new Set(beeDrawing.paths.map(path=>path.fillColor))).toEqual(new Set(['#F5C842','#202824','#D9EFF2']));
    expect(drawings.some(drawing=>drawing.paths.some(path=>path.cmds.some(command=>command.op==='C')))).toBe(true);
    expect(drawings.find(drawing=>drawing.name.startsWith('B8O'))!.paths).toHaveLength(1);
  });
  it('imprime códigos, muestras y centros de pieza originales sin sumar el margen de la vista',async()=>{
    let project=cameraProject();
    const view=simpleViews(project.design!)[0];
    expect(view.minX).toBeLessThan(0);
    const bee=createEmbroideryMotif('abeja',view.id,165,240,60),letters=createLettering('B8O Año 2026','clara',view.id,125,140,25,'#D94F54');
    project={...project,design:{...project.design!,views:[...project.design!.views,{...view,id:'referencia-plana',source:{type:'vacia'},label:'Solo referencia plana'}],elements:[...project.design!.elements,...bee.elements,...letters.elements]}};
    project=applyMaterial(project,materialTargets(project).map(target=>target.id),{type:'color',color:'#4C8864'});
    project.notes=[{id:'nota',createdAt:'2026-10-30T00:00:00.000Z',text:'Hilvanar antes de coser los bolsillos.',photoFileIds:[]}];
    project.changeLog=[{at:'2026-10-30T00:00:00.000Z',text:'SOLO HISTORIAL TÉCNICO'}];
    const text=vi.spyOn(PdfCanvas.prototype,'text'),fills=vi.spyOn(PdfCanvas.prototype,'fillPathRgb');
    try {
      const bytes=await buildSummaryPdf(project,{profiles:{},fabrics:{},materials:{},unit:'cm',includePhotos:false});
      const pdf=await PDFDocument.load(bytes);
      expect(pdf.getPageCount()).toBeGreaterThan(0);
      const output=text.mock.calls.map(call=>String(call[0])).join('\n');
      expect(output).toContain('Bordados y colores');expect(output).toContain('B1 · Abeja');expect(output).toContain('B2 · B8O Año 2026');
      expect(output).toContain('Centro X 165 mm · Y 240 mm');
      expect(output).toContain('Amarillo · #F5C842');expect(output).toContain('Negro · #202824');
      expect(output).toContain('Tipografía: Clara (Figtree)');
      expect(output).toContain('Hilvanar antes de coser los bolsillos.');
      expect(output).not.toContain('Solo referencia plana');expect(output).not.toContain('SOLO HISTORIAL TÉCNICO');
      expect(fills.mock.calls.some(call=>call[1][0]===245/255&&call[1][1]===200/255&&call[1][2]===66/255)).toBe(true);
      if(process.env.PDF_OUT){mkdirSync(process.env.PDF_OUT,{recursive:true});writeFileSync(`${process.env.PDF_OUT}/resumen-sencillo.pdf`,bytes);}
    } finally {text.mockRestore();fills.mockRestore();}
  });
});
