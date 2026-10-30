import {describe,it,expect} from 'vitest';
import {COMPONENT_OPTIONS,createComponent,searchComponents} from '../src/data/components';
import {DECORATIVE_COMPONENT_DEFINITIONS} from '../src/data/decorativeComponents';
import {generateComponents,type PatternComponent} from '../src/lib/pattern/components';
import {decorationRatio} from '../src/lib/pattern/decorations';
import {cutOutline} from '../src/lib/pattern/offset';
import {bboxOf} from '../src/lib/geom/vec';
import {buildPattern,newPatternState} from '../src/lib/pattern/engine';
import {findModel} from '../src/data/catalog';
import {projectFromModel} from '../src/store/projects';
import {syncComponentDesign,reconcileComponentDesign,normalizeComponentDesign,componentElementId,componentDesignIssues} from '../src/features/customize/componentDesign';
import {prepareSimpleProject,applyMaterial,materialTargets} from '../src/features/simple/workflow';
import {buildSewingPackPdf,prepareSewingPack} from '../src/lib/pdf/projectPack';
import {PDFDocument} from 'pdf-lib';
import {decorationPath} from '../src/features/customize/decorationArt';

const component=(kind:PatternComponent['kind'],patch:Partial<PatternComponent>={}):PatternComponent=>({id:'decoracion',name:'Decoración de prueba',kind,width:240,height:60,quantity:2,allowance:10,...patch});
const manual=()=>newPatternState('manual',{}, {kind:'otro',fabric:'plano',stretch:0,fit:'regular'});

describe('Decoraciones con construcción y mercería diferenciadas',()=>{
  it('ofrece familias reconocibles y búsqueda de términos en español',()=>{
    expect(DECORATIVE_COMPONENT_DEFINITIONS).toHaveLength(22);
    for(const term of ['blonda','blondas','encaje','encajes','olan','olanes','plisado','flecos','pompones','pasacintas','contraste']) {
      const found=searchComponents(term).filter(option=>option.group==='decoracion');
      expect(found.length,term).toBeGreaterThan(0);
    }
    for(const option of COMPONENT_OPTIONS.filter(option=>option.group==='decoracion')) {
      const c=createComponent(option,option.id), generated=generateComponents([c]);
      expect(generated.notices.filter(issue=>issue.level==='error'),option.name).toEqual([]);
      expect(decorationPath(c),option.name).toMatch(/[zZ]/);
      expect(generated.steps.length,option.name).toBeGreaterThanOrEqual(2);
    }
  });
  it('la blonda comprada agrega metraje con 1 cm por extremo y ninguna plantilla falsa',()=>{
    const c=component('cinta-comprada',{decoration:{style:'blonda'},materials:{cuerpo:{name:'Blonda negra',color:'#111111'}}});
    const generated=generateComponents([c]);
    expect(generated.pieces).toEqual([]);
    expect(generated.checks).toEqual([]);
    expect(generated.materials.find(need=>need.id.endsWith('-merceria'))).toMatchObject({qty:'52 cm de ancho 6 cm',label:'Decoración de prueba · Blonda negra'});
    expect(generated.steps.every(step=>step.pieces.length===0)).toBe(true);
    expect(generated.steps.map(step=>step.detail).join(' ')).toContain('No se añade margen al ancho comprado');
  });
  for(const fullness of [1.25,1.5,2,2.5,3]) it(`desarrolla el olán ${fullness}× sin cambiar su largo montado`,()=>{
    const c=component('olan-fruncido',{decoration:{style:'frunce',fullness}});
    const result=generateComponents([c]), piece=result.pieces[0],cut=bboxOf(cutOutline(piece).points);
    expect(decorationRatio(c)).toBe(fullness);
    expect(piece.nodes[1].x).toBe(240*fullness);
    expect(piece.nodes[2].y).toBe(60);
    expect(piece.edges.map(edge=>edge.allowance)).toEqual([10,10,10,10]);
    expect(cut.maxX-cut.minX).toBeCloseTo(240*fullness+20,5);
    expect(cut.maxY-cut.minY).toBeCloseTo(80,5);
    expect(piece.notches.map(notch=>notch.s)).toEqual([60*fullness,120*fullness,180*fullness]);
    expect(result.checks.map(check=>check.measured)).toEqual([240,60]);
    expect(result.materials.find(need=>need.id.endsWith('-cinta-fijacion'))?.qty).toBe('52 cm de ancho 1.5 cm');
  });
  it('los pliegues consumen exactamente 3× y sus marcas reducen cada celda a un tercio',()=>{
    const c=component('olan-plisado',{width:250,height:80,decoration:{style:'pliegues',pleats:5}});
    const piece=generateComponents([c]).pieces[0];
    expect(piece.nodes[1].x).toBe(750);
    expect(piece.lines).toHaveLength(15);
    const folds=piece.lines.filter(line=>line.id.endsWith('-cara')),targets=piece.lines.filter(line=>line.id.endsWith('-destino'));
    expect(folds.map(line=>line.a.x)).toEqual([50,200,350,500,650]);
    expect(targets.map(line=>line.a.x)).toEqual([150,300,450,600,750]);
    expect(750-targets.reduce((taken,line,i)=>taken+line.a.x-folds[i].a.x,0)).toBe(250);
  });
  it('la banda aplica margen una sola vez y no se presenta como un bies curvo',()=>{
    const result=generateComponents([component('cinta-aplicada',{width:300,height:30,allowance:7})]);
    const cut=bboxOf(cutOutline(result.pieces[0]).points);
    expect(cut.maxX-cut.minX).toBeCloseTo(314,4);
    expect(cut.maxY-cut.minY).toBeCloseTo(44,4);
    expect(result.steps.map(step=>step.detail).join(' ')).toContain('no sustituye un bies');
  });
  it('rechaza frunces, pliegues y medidas imposibles antes del PDF',()=>{
    for(const patch of [{fullness:NaN},{fullness:0},{fullness:4}]) {
      const result=generateComponents([component('olan-fruncido',{decoration:{style:'frunce',...patch}})]);
      expect(result.pieces).toEqual([]);expect(result.notices.some(issue=>issue.level==='error')).toBe(true);
    }
    for(const pleats of [1,25,2.5,NaN]) expect(generateComponents([component('olan-plisado',{decoration:{style:'pliegues',pleats}})]).notices.some(issue=>issue.level==='error')).toBe(true);
    expect(generateComponents([component('cinta-comprada',{height:0})]).notices.some(issue=>issue.level==='error')).toBe(true);
    const built=buildPattern({...manual(),components:[component('olan-fruncido')],overrides:{'componente-decoracion-cuerpo':{'n:n1':{dx:60,dy:0,base:{x:480,y:0}}}}});
    expect(built.issues.some(issue=>issue.code==='component-dimensions')).toBe(true);
  });
  it('reserva sobre la base el margen superior que queda cubierto por la cinta',()=>{
    const base=generateComponents([component('bolsillo-parche',{id:'base',width:400,height:300})]).pieces[0];
    const placed=component('olan-fruncido',{width:150,height:40,placement:{pieceId:base.id,x:200,y:25}});
    // Its visible rectangle starts at y=5, but the 10 mm attachment margin would protrude.
    expect(generateComponents([placed],[base]).notices.some(issue=>issue.code==='component-placement-outside')).toBe(true);
    expect(generateComponents([{...placed,placement:{...placed.placement!,y:35}}],[base]).notices.filter(issue=>issue.level==='error')).toEqual([]);
  });
  it('conserva contornos calados, dimensiones y color al guardar y redimensionar',()=>{
    const base=projectFromModel(findModel('individual-reversible')!);
    const c=component('cinta-comprada',{decoration:{style:'encaje-floral'}});
    const ready=syncComponentDesign({...base,pattern:{...base.pattern!,components:[c]}});
    const bodyId=componentElementId(c.id,'cuerpo');
    const resized=normalizeComponentDesign({...ready.design!,elements:ready.design!.elements.map(element=>element.id===bodyId?{...element,w:180,h:35,fill:{type:'color' as const,color:'#993344'}}:element)});
    const saved=reconcileComponentDesign({...ready,design:resized});
    expect(saved.pattern!.components![0]).toMatchObject({width:180,height:35,decoration:{style:'encaje-floral'},materials:{cuerpo:{color:'#993344'}}});
    const reloaded=syncComponentDesign(JSON.parse(JSON.stringify(saved)));
    expect(componentDesignIssues(reloaded)).toEqual([]);
    expect(reloaded.design!.elements.find(element=>element.id===bodyId)?.vectorPath).toBe(decorationPath(saved.pattern!.components![0]));
    const changed={...reloaded,design:{...reloaded.design!,elements:reloaded.design!.elements.map(element=>element.id===bodyId?{...element,vectorPath:'M0 0H100V100H0Z'}:element)}};
    expect(componentDesignIssues(changed)).not.toEqual([]);
  });
  it('incluye decoración comprada y olán en la guía física sin crear recortes de encaje',()=>{
    let project=prepareSimpleProject(projectFromModel(findModel('individual-reversible')!));
    const view=project.design!.views.find(view=>view.source.type==='pieza')!;
    const pieceId=view.source.type==='pieza'?view.source.pieceId:'';
    const bought=component('cinta-comprada',{id:'encaje',name:'Blonda comprada',width:160,height:30,quantity:1,decoration:{style:'blonda'},placement:{viewId:view.id,pieceId,x:200,y:100}});
    const ruffle=component('olan-fruncido',{id:'olan',name:'Olán de prueba',width:160,height:40,quantity:1,decoration:{style:'frunce',fullness:2},placement:{viewId:view.id,pieceId,x:200,y:210}});
    project=syncComponentDesign({...project,pattern:{...project.pattern!,components:[bought,ruffle]}});
    project=applyMaterial(project,materialTargets(project).map(target=>target.id),{type:'color',color:'#334455'});
    const preview=prepareSewingPack(project,{fabrics:{},unit:'cm',profiles:{},materials:{}});
    expect(preview.blockers).toEqual([]);
    expect(preview.pieces.filter(piece=>piece.id.startsWith('componente-')).map(piece=>piece.id)).toEqual(['componente-olan-cuerpo']);
    expect(preview.placements.filter(placement=>placement.kind==='extra')).toHaveLength(2);
    expect(preview.built!.result!.materials.some(need=>need.label.includes('Blonda comprada'))).toBe(true);
    expect(preview.built!.pieces.find(piece=>piece.id===pieceId)!.lines.filter(line=>line.id.startsWith('componente-'))).toHaveLength(8);
  });
  it('exporta una intervención de solo mercería con guía e instrucciones y cero plantillas',async()=>{
    let project=prepareSimpleProject(projectFromModel(findModel('individual-reversible')!));
    const view=project.design!.views.find(view=>view.source.type==='pieza')!;
    const bought=component('cinta-comprada',{id:'encaje',name:'Blonda comprada',width:160,height:30,quantity:1,decoration:{style:'blonda'},placement:{viewId:view.id,pieceId:view.source.type==='pieza'?view.source.pieceId:undefined,x:200,y:100}});
    project=syncComponentDesign({...project,pattern:{...project.pattern!,components:[bought]}});
    project=applyMaterial(project,materialTargets(project).map(target=>target.id),{type:'color',color:'#334455'});
    const ctx={fabrics:{},unit:'cm' as const,profiles:{},materials:{},mode:'intervention' as const};
    const preview=prepareSewingPack(project,ctx);
    expect(preview.blockers).toEqual([]);
    expect(preview.pieces).toEqual([]);
    expect(preview.drawings).toHaveLength(1);
    expect(preview.drawings[0].id).toContain('ubicacion-');
    expect(preview.built!.result!.steps).toHaveLength(2);
    const result=await buildSewingPackPdf(project,ctx);
    expect(result.manifest.mode).toBe('intervention');
    expect(result.manifest.pieces).toEqual([]);
    expect(result.manifest.sections.some(section=>section.id==='guia')).toBe(true);
    expect(result.manifest.sections.some(section=>section.id.startsWith('ubicacion-'))).toBe(true);
    expect(result.manifest.sections.some(section=>section.id==='patron')).toBe(false);
    expect((await PDFDocument.load(result.bytes)).getPageCount()).toBe(result.pageCount);
  });
});
