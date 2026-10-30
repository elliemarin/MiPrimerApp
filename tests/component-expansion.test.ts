import { describe,expect,it } from 'vitest';
import { COMPONENT_OPTIONS,createComponent,searchComponents } from '../src/data/components';
import { COMPONENT_KINDS,cameraWindowFor,generateComponents,type PatternComponent } from '../src/lib/pattern/components';
import { evaluateSeams,validatePattern } from '../src/lib/pattern/validate';
import { seamPolygon,edgeLength } from '../src/lib/pattern/outline';
import { buildPattern,newPatternState } from '../src/lib/pattern/engine';
import { componentDesignIssues,componentElementId,componentPaintRoles,reconcileComponentDesign,syncComponentDesign } from '../src/features/customize/componentDesign';
import { projectFromModel } from '../src/store/projects';
import { findModel } from '../src/data/catalog';

const state=()=>newPatternState('manual',{}, {kind:'otro',fabric:'plano',stretch:0,fit:'regular'});
const camera=(patch:Partial<PatternComponent>={}):PatternComponent=>({id:'camara',kind:'porta-telefono-camara',width:110,height:190,quantity:1,...patch});
const area=(points:{x:number;y:number}[])=>Math.abs(points.reduce((sum,a,i)=>{const b=points[(i+1)%points.length];return sum+a.x*b.y-b.x*a.y;},0)/2);

describe('Biblioteca extensa de complementos propios',()=>{
  it('ofrece cientos de usos y construcciones, con nombres e identificadores únicos',()=>{
    expect(COMPONENT_OPTIONS.length).toBeGreaterThanOrEqual(350);
    expect(new Set(COMPONENT_OPTIONS.map(option=>option.id)).size).toBe(COMPONENT_OPTIONS.length);
    expect(new Set(COMPONENT_OPTIONS.map(option=>option.name)).size).toBe(COMPONENT_OPTIONS.length);
    expect(new Set(COMPONENT_OPTIONS.map(option=>option.collection).filter(Boolean)).size).toBeGreaterThanOrEqual(10);
    expect(COMPONENT_KINDS).toContain('porta-telefono-camara');
  });

  it('genera todos los presets con costuras, medidas y piezas válidas antes de ofrecerlos',()=>{
    for(const option of COMPONENT_OPTIONS) {
      const component=createComponent(option,option.id);
      const result=generateComponents([component]);
      const issues=[...result.notices,...validatePattern(result)];
      expect(issues.filter(issue=>issue.level==='error'),option.name).toEqual([]);
      expect(result.pieces.length,option.name).toBeGreaterThan(0);
      for(const check of result.checks) expect(Math.abs(check.measured-check.target),`${option.name}: ${check.label}`).toBeLessThan(.01);
      for(const seam of evaluateSeams(result.pieces,result.seams)) expect(seam.ok,`${option.name}: ${seam.relation.label}`).toBe(true);
      for(const step of result.steps) for(const id of step.pieces) expect(result.pieces.some(piece=>piece.id===id),id).toBe(true);
    }
  });

  it('busca palabras, acentos y sinónimos conservando el grupo útil',()=>{
    const cameras=searchComponents('celular camara');
    expect(cameras.length).toBeGreaterThanOrEqual(12);
    expect(cameras.every(option=>option.kind==='porta-telefono-camara')).toBe(true);
    expect(searchComponents('lapices canales').length).toBeGreaterThanOrEqual(6);
    expect(searchComponents('ganchillos 8').some(option=>option.defaultChannels===8)).toBe(true);
    expect(searchComponents('objeto inexistente zzz')).toEqual([]);
  });
});

describe('Organizadores con cantidad real de canales',()=>{
  for(const channels of [1,2,3,4,5,6,8]) it(`${channels} canales se corresponden con los pespuntes del patrón y el estudio`,()=>{
    const component:PatternComponent={id:'organizador',kind:'porta-herramientas',width:channels*28,height:180,quantity:2,channels};
    if(channels===1)component.width=40;
    const result=generateComponents([component]);
    expect(result.notices.filter(issue=>issue.level==='error')).toEqual([]);
    const lines=result.pieces[0].lines.filter(line=>line.kind==='pespunte');
    expect(lines).toHaveLength(channels-1);
    expect(lines.map(line=>line.a.x)).toEqual(Array.from({length:channels-1},(_,i)=>component.width*(i+1)/channels));
    expect(result.steps.some(step=>step.detail.includes(`${channels} ${channels===1?'canal':'canales'}`))).toBe(true);
  });

  it('rechaza divisiones imposibles en lugar de imprimir canales de ancho falso',()=>{
    for(const channels of [0,9,2.5,NaN]) expect(generateComponents([{id:'bad',kind:'porta-herramientas',width:120,height:180,quantity:1,channels}]).notices.some(issue=>issue.code==='component-channels')).toBe(true);
    expect(generateComponents([{id:'bad',kind:'porta-herramientas',width:40,height:180,quantity:1,channels:8}]).notices.some(issue=>issue.code==='component-channels')).toBe(true);
  });
});

describe('Ventana de cámara construida con piezas reales',()=>{
  it('el frente de cuatro piezas deja exactamente la abertura elegida sin exportar una falsa pieza perforada',()=>{
    const component=camera({quantity:2,camera:{left:12,top:18,width:66,height:55}});
    const opening=cameraWindowFor(component),result=generateComponents([component]);
    expect(result.pieces).toHaveLength(5);
    const front=result.pieces.filter(piece=>!piece.id.endsWith('-cuerpo'));
    expect(front.reduce((total,piece)=>total+area(seamPolygon(piece)),0)).toBeCloseTo(component.width*component.height-opening.width*opening.height,8);
    expect(result.pieces.every(piece=>piece.cut.qty===2)).toBe(true);
    expect(result.seams).toHaveLength(4);
    expect(evaluateSeams(result.pieces,result.seams).every(seam=>seam.ok)).toBe(true);
    const windowEdges=front.flatMap(piece=>piece.edges.filter(edge=>edge.label.startsWith('Ventana')));
    expect(windowEdges).toHaveLength(4);
    expect(windowEdges.every(edge=>edge.allowance===0&&edge.finish==='orillo')).toBe(true);
    const perimeter=front.reduce((sum,piece)=>sum+piece.edges.filter(edge=>edge.label.startsWith('Ventana')).reduce((sub,edge)=>sub+edgeLength(piece,edge),0),0);
    expect(perimeter).toBe(2*(opening.width+opening.height));
    expect(result.materials.some(material=>material.label.includes('bies'))).toBe(true);
    expect(result.steps.some(step=>step.detail.includes('cámara queda hacia fuera'))).toBe(true);
    expect(result.pieces.flatMap(piece=>piece.notches)).toHaveLength(8);
  });

  it('rechaza ventanas fuera de la pieza y bandas demasiado estrechas',()=>{
    for(const patch of [{left:0,top:12,width:65,height:45},{left:12,top:4,width:65,height:45},{left:12,top:12,width:100,height:45},{left:12,top:12,width:65,height:190},{left:12,top:12,width:0,height:45}]) {
      const result=generateComponents([camera({camera:patch})]);
      expect(result.pieces).toHaveLength(0);
      expect(result.notices.some(issue=>issue.code==='component-camera')).toBe(true);
    }
  });

  it('comprueba las medidas de bandas también después de ajustes manuales',()=>{
    const component=camera();
    const built=buildPattern({...state(),components:[component]});
    const piece=built.pieces.find(piece=>piece.id.endsWith('-marco-izq'))!;
    const node=piece.nodes[1];
    const changed=buildPattern({...state(),components:[component],overrides:{[piece.id]:{[`n:${node.id}`]:{dx:8,dy:0,base:{x:node.x,y:node.y}}}}});
    expect(changed.issues.some(issue=>issue.code==='component-dimensions')).toBe(true);
  });

  it('conserva materiales por banda y dimensiones del respaldo al guardar y volver',()=>{
    const project=projectFromModel(findModel('individual-reversible')!);
    const ready=syncComponentDesign({...project,pattern:{...project.pattern!,components:[camera()]}});
    const ids=componentPaintRoles(camera());
    expect(ids).toHaveLength(5);
    const first=ids[1],second=ids[2];
    const design={...ready.design!,elements:ready.design!.elements.map(element=>element.id===componentElementId('camara',first)?{...element,fill:{type:'color' as const,color:'#ffbb00'}}:element.id===componentElementId('camara',second)?{...element,fill:{type:'color' as const,color:'#3355aa'}}:element)};
    const saved=reconcileComponentDesign({...ready,design});
    expect(componentDesignIssues(saved)).toEqual([]);
    expect(saved.pattern!.components![0]).toMatchObject({width:110,height:190,materials:{[first]:{color:'#ffbb00'},[second]:{color:'#3355aa'}}});
    const again=syncComponentDesign(saved);
    expect(again.design!.elements.map(element=>element.id)).toEqual(saved.design!.elements.map(element=>element.id));
    const generated=buildPattern(again.pattern!);
    expect(generated.pieces.find(piece=>piece.id.endsWith('-marco-superior'))?.name).toContain('#ffbb00');
  });
});
