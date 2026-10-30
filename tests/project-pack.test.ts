import { describe, expect, it, vi } from 'vitest';
import { PDFDocument, PDFName, PrintScaling } from 'pdf-lib';
import { mkdirSync, writeFileSync } from 'node:fs';
import { findModel } from '../src/data/catalog';
import { projectFromModel, blankProject } from '../src/store/projects';
import { profileFromSize } from '../src/store/profiles';
import { findSize, SIZE_TABLES } from '../src/lib/sizes/tables';
import { buildPattern, newPatternState } from '../src/lib/pattern/engine';
import { prepareSewingPack, buildSewingPackPdf, hasSewingBase, type SewingPackCtx } from '../src/lib/pdf/projectPack';
import { newDesign, newElement } from '../src/features/studio/model';
import { preparePanelViews } from '../src/features/studio/panelWorkflow';
import { pieceGeometryHash } from '../src/lib/pattern/panels';
import { bboxOf } from '../src/lib/geom/vec';
import { cmdsBBox } from '../src/lib/draw/paths';
import { syncComponentDesign } from '../src/features/customize/componentDesign';
import { FlowDoc } from '../src/lib/pdf/doc';
import { PdfCanvas } from '../src/lib/pdf/canvas';
import type { Project } from '../src/store/types';

const ctx: SewingPackCtx={profiles:{},fabrics:{},materials:{},unit:'cm',includePhotos:false};
function pants():Project {
  const table=SIZE_TABLES.find(table=>table.id==='ref-mujer-busto')!;
  const profile=profileFromSize(table,findSize(table.id,'M92')!);
  return projectFromModel(findModel('pantalon-recto-elastico')!,profile);
}
function extras(project:Project):Project {
  const view=project.design!.views[0];
  return syncComponentDesign({...project,pattern:{...project.pattern!,components:[
    {id:'cargo-1',kind:'bolsillo-cargo',width:150,height:180,quantity:2,depth:30,placement:{viewId:view.id,x:80,y:500,label:'Muslo'}},
    {id:'cierre-1',kind:'bolsillo-cierre',width:140,height:150,quantity:1},
    {id:'util-1',kind:'porta-herramientas',width:120,height:180,quantity:1}
  ]}});
}

describe('PDF completo de confección',()=>{
  it('incluye piezas reales de base y complementos sin duplicarlas como aplicaciones',()=>{
    const project=extras(pants());
    const built=buildPattern(project.pattern!);
    const preview=prepareSewingPack(project,ctx);
    expect(preview.blockers).toEqual([]);
    expect(preview.pieces.map(piece=>piece.id)).toEqual(built.pieces.map(piece=>piece.id));
    expect(preview.cutouts).toEqual([]);
    expect(preview.pieces.some(piece=>piece.id==='componente-cargo-1-fuelle')).toBe(true);
    expect(preview.pieces.some(piece=>piece.id==='componente-cargo-1-solapa')).toBe(true);
    expect(preview.warnings.some(warning=>warning.includes('dibujos sin técnica'))).toBe(false);
    const body=preview.pieces.find(piece=>piece.id==='componente-cargo-1-cuerpo')!;
    expect(body.wMm).toBe(150);
    expect(body.hMm).toBe(180);
    expect(body.cutWMm).toBeCloseTo(170);
    expect(body.cutHMm).toBeCloseTo(210);
  });

  it('bloquea medidas incompletas, geometría inválida y piezas omitidas',()=>{
    const project=pants();
    const incomplete={...project,pattern:{...project.pattern!,body:{}}};
    expect(prepareSewingPack(incomplete,ctx).blockers.some(error=>error.includes('medidas'))).toBe(true);
    const invalid={...project,pattern:{...project.pattern!,components:[{id:'mal',kind:'bolsillo-cargo' as const,width:50,height:80,quantity:1,depth:100}]}};
    expect(prepareSewingPack(invalid,ctx).blockers.length).toBeGreaterThan(0);
    const hidden=buildPattern(project.pattern!).pieces[0].id;
    expect(prepareSewingPack({...project,pattern:{...project.pattern!,hidden:[hidden]}},ctx).blockers.some(error=>error.includes('ocultas o excluidas'))).toBe(true);
    expect(prepareSewingPack({...project,pattern:{...project.pattern!,noExport:[hidden]}},ctx).blockers.some(error=>error.includes('ocultas o excluidas'))).toBe(true);
  });

  it('resuelve cortes del estudio antes de congelar el patrón y rechaza los obsoletos',()=>{
    const project=projectFromModel(findModel('cojin')!);
    const prepared=preparePanelViews(project,project.design!);
    const piece=buildPattern(project.pattern!).pieces[0];
    const box=bboxOf(piece.nodes);
    const y=(box.minY+box.maxY)/2;
    const cut={id:'corte-pdf',pieceId:piece.id,viewId:prepared.viewId,baseHash:pieceGeometryHash(piece),allowance:10,points:[{x:box.minX-50,y},{x:box.maxX+50,y}]};
    const pending={...project,design:{...prepared.doc,panelCuts:[cut]}};
    const preview=prepareSewingPack(pending,ctx);
    expect(preview.blockers).toEqual([]);
    expect(preview.project.pattern!.panelCuts?.length).toBe(1);
    expect(preview.pieces.length).toBeGreaterThan(buildPattern(project.pattern!).pieces.length);
    expect(project.pattern!.panelCuts).toBeUndefined();
    const stale={...pending,design:{...pending.design,panelCuts:[{...cut,baseHash:'obsoleto'}]}};
    expect(prepareSewingPack(stale,ctx).blockers.some(error=>error.includes('Cambió la geometría'))).toBe(true);
  });

  it('mantiene bordados por vista y rechaza cuadros falsos para texto o imagen bordada',()=>{
    const project=pants();
    const [front,back]=project.design!.views;
    project.design!.elements=[
      newElement(front.id,{id:'bord-uno',name:'Motivo delantero',technique:'bordado',x:80,y:120,w:40,h:50}),
      newElement(front.id,{id:'bord-dos',name:'Motivo separado',technique:'bordado',x:160,y:120,w:40,h:50}),
      newElement(back.id,{id:'bord-tres',name:'Motivo espalda',technique:'bordado',x:50,y:90,w:30,h:30})
    ];
    const preview=prepareSewingPack(project,ctx);
    expect(preview.blockers).toEqual([]);
    expect(preview.embroideryCount).toBe(3);
    const drawings=preview.drawings.filter(drawing=>drawing.id.startsWith('bordado-'));
    expect(drawings.map(drawing=>drawing.count)).toEqual([2,1]);
    expect(cmdsBBox(drawings[0].drawables[1].paths[0].cmds).minX-cmdsBBox(drawings[0].drawables[0].paths[0].cmds).minX).toBeCloseTo(80);
    project.design!.elements.push(newElement(front.id,{name:'Texto bordado',kind:'texto',technique:'bordado',text:{content:'Hola',font:'sans',weight:400}}));
    expect(prepareSewingPack(project,ctx).blockers.some(error=>error.includes('necesitan digitalización'))).toBe(true);
  });

  it('intervención incluye moldes de complementos y apliques sin anunciar el patrón de la base',()=>{
    const project=blankProject('Chaleco existente','intervencion');
    project.pattern=newPatternState('manual',{}, {kind:'otro',fabric:'plano',stretch:0,fit:'regular'});
    project.pattern.components=[{id:'bolsa',kind:'bolsillo-solapa-boton',width:140,height:180,quantity:2}];
    project.design=newDesign([{id:'frente',kind:'frente',label:'Frente',source:{type:'vacia'},width:500,height:700,minX:0,minY:0,zones:[],refY:0,refLabel:'Hombro'}]);
    const synced=syncComponentDesign(project);
    expect(hasSewingBase(synced)).toBe(false);
    expect(prepareSewingPack(synced,ctx).blockers.some(error=>error.includes('Falta un patrón'))).toBe(true);
    const preview=prepareSewingPack(synced,{...ctx,mode:'intervention'});
    expect(preview.blockers).toEqual([]);
    expect(preview.pieces.length).toBe(2);
    expect(preview.drawings[0].title).toBe('Patrones de los complementos');
    expect(preview.warnings.some(warning=>warning.includes('No incluye el patrón para confeccionar la prenda base'))).toBe(true);
  });

  it('conserva los paneles y telas de un complemento en una intervención sin base',()=>{
    const project=blankProject('Prenda existente','intervencion');
    project.pattern=newPatternState('manual',{}, {kind:'otro',fabric:'plano',stretch:0,fit:'regular'});
    project.pattern.components=[{id:'bolsa-paneles',kind:'bolsillo-parche',width:140,height:180,quantity:1}];
    const synced=syncComponentDesign(project);
    const prepared=preparePanelViews(synced,synced.design!);
    const piece=buildPattern(synced.pattern!).pieces[0];
    const cut={id:'panel-bolsillo',pieceId:piece.id,viewId:prepared.viewId,baseHash:pieceGeometryHash(piece),allowance:10,points:[{x:-20,y:90},{x:160,y:90}]};
    const source={...synced,design:{...prepared.doc,panelCuts:[cut]}};
    const preview=prepareSewingPack(source,{...ctx,mode:'intervention'});
    expect(preview.blockers).toEqual([]);
    expect(preview.pieces).toHaveLength(2);
    expect(preview.pieces.every(piece=>piece.id.includes('--panel-'))).toBe(true);
    expect(preview.project.pattern!.panelCuts).toHaveLength(1);
    const saved={...source,pattern:preview.project.pattern};
    expect(prepareSewingPack(saved,{...ctx,mode:'intervention'}).pieces.map(piece=>piece.id)).toEqual(preview.pieces.map(piece=>piece.id));
    const stale={...source,design:{...source.design,panelCuts:[{...cut,baseHash:'viejo'}]}};
    expect(prepareSewingPack(stale,{...ctx,mode:'intervention'}).blockers.some(message=>message.includes('Cambió la geometría'))).toBe(true);
  });

  it('fusiona ficha, patrones, apliques y bordado como páginas vectoriales con trazabilidad',async()=>{
    const project=extras(pants());
    project.name='Pantalón con complementos';
    const view=project.design!.views[0];
    project.design!.elements.push(newElement(view.id,{id:'estrella',name:'Estrella aplicada',shape:{type:'star',sides:5},technique:'aplicacion',allowance:6,w:80,h:80,backing:'termoadhesiva'}));
    project.design!.elements.push(newElement(view.id,{id:'bordado',name:'Bordado de prueba',technique:'bordado',w:45,h:45}));
    const result=await buildSewingPackPdf(project,ctx);
    const pdf=await PDFDocument.load(result.bytes);
    expect(pdf.getPageCount()).toBe(result.pageCount);
    expect(pdf.catalog.getOrCreateViewerPreferences().getPrintScaling()).toBe(PrintScaling.None);
    expect(pdf.catalog.has(PDFName.of('Names'))).toBe(true);
    expect(result.manifest.sections.map(section=>section.id)).toEqual(['guia','patron','aplicaciones',`bordado-${view.id}`,`ubicacion-${view.id}`]);
    expect(result.manifest.placements.some(placement=>placement.id==='bordado'&&placement.kind==='bordado'&&placement.code==='B1')).toBe(true);
    expect(result.manifest.pieces.map(piece=>piece.id)).toEqual(buildPattern(project.pattern!).pieces.map(piece=>piece.id));
    expect(result.manifest.cutouts).toHaveLength(1);
    for(const [index,section] of result.manifest.sections.entries()) {
      expect(section.endPage).toBeGreaterThanOrEqual(section.startPage);
      if(index) expect(section.startPage).toBe(result.manifest.sections[index-1].endPage+1);
    }
    for(const page of pdf.getPages()) {
      expect(page.getWidth()).toBeCloseTo(612,3);
      expect(page.getHeight()).toBeCloseTo(792,3);
    }
    if(process.env.PDF_OUT) {
      mkdirSync(process.env.PDF_OUT,{recursive:true});
      writeFileSync(`${process.env.PDF_OUT}/confeccion.pdf`,result.bytes);
      writeFileSync(`${process.env.PDF_OUT}/confeccion.json`,JSON.stringify(result.manifest,null,2));
    }
  });

  it('no genera un paquete completo cuando faltan piezas o la base es una ilustración',async()=>{
    const project=blankProject('Boceto','boceto');
    await expect(buildSewingPackPdf(project,ctx)).rejects.toThrow('Falta un patrón');
    await expect(buildSewingPackPdf(project,{...ctx,mode:'intervention'})).rejects.toThrow('Todavía no hay recortes');
  });

  it('identifica una base manual real y explica que no inventa su montaje',()=>{
    const source=projectFromModel(findModel('cojin')!);
    const piece=buildPattern(source.pattern!).pieces[0];
    const project=blankProject('Base trazada','boceto');
    project.pattern=newPatternState('manual',{}, {kind:'otro',fabric:'plano',stretch:0,fit:'regular'});
    project.pattern.customPieces=[piece];
    const preview=prepareSewingPack(project,ctx);
    expect(hasSewingBase(project)).toBe(true);
    expect(preview.blockers).toEqual([]);
    expect(preview.warnings.some(warning=>warning.startsWith('La base trazada manualmente'))).toBe(true);
  });
});

describe('tablas del PDF sin texto recortado',()=>{
  it('envuelve todas las líneas y repite encabezados al cambiar de hoja',async()=>{
    const calls=vi.spyOn(PdfCanvas.prototype,'text');
    try {
      const document=await FlowDoc.create('Tabla de prueba');
      const detail='Conserva todas las instrucciones del bolsillo con cierre, sus vistas y su respaldo hasta la palabra ULTIMA.';
      document.table(['Nombre','Instrucciones'],Array.from({length:38},(_,index)=>[`Pieza ${index}`,detail]),[1,2]);
      const output=await PDFDocument.load(await document.save());
      expect(output.getPageCount()).toBeGreaterThan(1);
      expect(calls.mock.calls.filter(call=>String(call[0]).includes('ULTIMA.'))).toHaveLength(38);
      expect(calls.mock.calls.filter(call=>call[0]==='Instrucciones').length).toBeGreaterThan(1);
    } finally {calls.mockRestore();}
  });
});
