import { describe, expect, it } from 'vitest';
import { COMPONENT_KINDS, generateComponents, type PatternComponent } from '../src/lib/pattern/components';
import { buildPattern, newPatternState } from '../src/lib/pattern/engine';
import { cutOutline } from '../src/lib/pattern/offset';
import { edgeLength } from '../src/lib/pattern/outline';
import { evaluateSeams, validatePattern } from '../src/lib/pattern/validate';
import { bboxOf } from '../src/lib/geom/vec';
import { findModel } from '../src/data/catalog';
import { projectFromModel } from '../src/store/projects';
import { pieceGeometryHash } from '../src/lib/pattern/panels';
import { SIZE_TABLES } from '../src/lib/sizes/tables';
import { profileFromSize } from '../src/store/profiles';

const selection = (kind: PatternComponent['kind']='bolsillo-parche', patch: Partial<PatternComponent>={}): PatternComponent => ({id:'ejemplo',kind,width:160,height:190,quantity:1,...patch});
const context = {kind:'mujer' as const,fabric:'plano' as const,stretch:0,fit:'regular' as const};
const state = () => newPatternState('',{},context);
const pantsProject = () => {
  const table=SIZE_TABLES.find(table=>table.rows.some(row=>row.code==='M92'))!;
  return projectFromModel(findModel('pantalon-recto-elastico')!,profileFromSize(table,table.rows.find(row=>row.code==='M92')!));
};

describe('Complementos de confección independientes',()=>{
  for(const kind of COMPONENT_KINDS) for(const scale of [.65,1,1.5]) it(`${kind}: piezas reales, medidas y costuras a proporción ${scale}`,()=>{
    const result=generateComponents([selection(kind,{width:160*scale,height:190*scale,quantity:2,depth:30*scale})]);
    const issues=[...result.notices,...validatePattern(result)];
    expect(issues.filter(issue=>issue.level==='error'),JSON.stringify(issues)).toEqual([]);
    if(kind==='cinta-comprada') { expect(result.pieces).toEqual([]);expect(result.materials.some(material=>material.id.endsWith('-merceria'))).toBe(true); }
    else expect(result.pieces.length).toBeGreaterThan(0);
    for(const check of result.checks) expect(check.measured).toBeCloseTo(check.target,6);
    for(const seam of evaluateSeams(result.pieces,result.seams)) expect(seam.ok,seam.relation.label).toBe(true);
    for(const step of result.steps) for(const id of step.pieces) expect(result.pieces.some(piece=>piece.id===id),id).toBe(true);
    for(const piece of result.pieces) {
      expect(piece.id.startsWith('componente-ejemplo-')).toBe(true);
      expect(piece.cut.qty).toBeGreaterThanOrEqual(2);
      expect(new Set(piece.nodes.map(node=>node.id)).size).toBe(piece.nodes.length);
      expect(cutOutline(piece).points.every(point=>Number.isFinite(point.x)&&Number.isFinite(point.y))).toBe(true);
    }
  });

  it('mantiene ancho y alto terminados al cambiar el margen; el dobladillo se añade una sola vez',()=>{
    const small=generateComponents([selection('bolsillo-parche',{allowance:5})]).pieces[0];
    const large=generateComponents([selection('bolsillo-parche',{allowance:15})]).pieces[0];
    expect(small.nodes).toEqual(large.nodes);
    expect(small.edges.map(edge=>edge.allowance)).toEqual([20,5,5,5]);
    const smallBox=bboxOf(cutOutline(small).points),largeBox=bboxOf(cutOutline(large).points);
    expect(largeBox.maxX-smallBox.maxX).toBeCloseTo(10,4);
    expect(largeBox.minY).toEqual(smallBox.minY);
    expect(largeBox.maxY-smallBox.maxY).toBeCloseTo(10,4);
  });
  it('el cargo usa un fuelle con recorrido U coincidente y una solapa de dos caras',()=>{
    const result=generateComponents([selection('bolsillo-cargo',{width:180,height:220,depth:35,quantity:2})]);
    const body=result.pieces.find(piece=>piece.id.endsWith('-cuerpo'))!,gusset=result.pieces.find(piece=>piece.id.endsWith('-fuelle'))!,flap=result.pieces.find(piece=>piece.id.endsWith('-solapa'))!;
    expect(edgeLength(gusset,gusset.edges[0])).toBe(620);
    expect(gusset.notches.map(notch=>notch.s)).toEqual([220,400]);
    expect(gusset.edges.map(edge=>edge.allowance)).toEqual([10,20,10,20]);
    expect(flap.cut.qty).toBe(4);
    expect(body.marks.some(mark=>mark.kind==='boton')).toBe(true);
    expect(result.materials.find(material=>material.id.endsWith('-cierre'))?.qty).toContain('2');
  });
  it('el cierre incluye respaldo, dos vistas por bolsillo y material de largo físico',()=>{
    const result=generateComponents([selection('bolsillo-cierre',{quantity:3,width:150})]);
    expect(result.pieces.map(piece=>[piece.id.split('-').pop(),piece.cut.qty,piece.cut.fabric])).toEqual([['cuerpo',3,'principal'],['respaldo',3,'forro'],['vista',6,'forro']]);
    expect(result.materials.find(material=>material.id.endsWith('-cierre'))!.qty).toContain('15 cm');
    expect(result.steps.some(step=>step.detail.includes('No atravieses ambas caras'))).toBe(true);
  });
  it('las trabillas duplican solo el ancho de tubo, mantienen el largo y marcan reservas de fijación',()=>{
    const result=generateComponents([selection('trabilla',{width:20,height:90,quantity:4})]);
    const body=result.pieces[0];
    expect(body.nodes[1].x).toBe(40);expect(body.nodes[2].y).toBe(90);
    expect(body.lines.filter(line=>line.kind==='colocacion').map(line=>line.a.y)).toEqual([20,70]);
    expect(result.checks.map(check=>check.measured)).toEqual([20,90]);
  });
  it('los portaherramientas tienen tres canales con marcas de pespunte',()=>{
    const body=generateComponents([selection('porta-herramientas',{width:210})]).pieces[0];
    expect(body.lines.filter(line=>line.kind==='pespunte').map(line=>line.a.x)).toEqual([70,140]);
  });
  it('los IDs y ajustes sobreviven al cambio de medidas y de cantidad',()=>{
    const a=generateComponents([selection('bolsillo-cargo')]),b=generateComponents([selection('bolsillo-cargo',{width:220,height:260,quantity:3})]);
    expect(a.pieces.map(piece=>piece.id)).toEqual(b.pieces.map(piece=>piece.id));
    const first=buildPattern({...state(),components:[selection()]});
    const piece=first.pieces[0];
    const rebuilt=buildPattern({...state(),components:[selection('bolsillo-parche',{width:200})],overrides:{[piece.id]:{'n:n1':{dx:2,dy:0,base:{x:160,y:0}}}}});
    expect(rebuilt.pieces[0].nodes[1].x).toBe(202);
    expect(rebuilt.review.length).toBe(1);
  });
  it('los ajustes manuales se miden antes de exportar para no entregar instrucciones con medidas anteriores',()=>{
    const base={...state(),components:[selection()]};
    const built=buildPattern({...base,overrides:{'componente-ejemplo-cuerpo':{'n:n1':{dx:50,dy:0,base:{x:160,y:0}}}}});
    expect(built.result!.checks.find(check=>check.key.endsWith('-ancho'))!.measured).toBe(210);
    expect(built.issues.filter(issue=>issue.code==='component-dimensions')).toHaveLength(1);
    expect(built.issues.filter(issue=>issue.code==='medida-no-coincide')).toHaveLength(0);
    const marginOnly=buildPattern({...base,allowances:{'componente-ejemplo-cuerpo':{e1:15}}});
    expect(marginOnly.issues.filter(issue=>issue.level==='error')).toEqual([]);
    const cargo=buildPattern({...state(),components:[selection('bolsillo-cargo')],overrides:{'componente-ejemplo-fuelle':{'n:n2':{dx:0,dy:10,base:{x:540,y:30}},'n:n3':{dx:0,dy:10,base:{x:0,y:30}}}}});
    expect(cargo.issues.some(issue=>issue.code==='component-dimensions')).toBe(true);
    expect(cargo.result!.checks.find(check=>check.key==='componente-ejemplo-fuelle-alto')!.measured).toBe(40);
  });
  it('rechaza dimensiones no finitas, cantidades fraccionarias, márgenes inválidos e IDs duplicados',()=>{
    for(const patch of [{width:NaN},{height:Infinity},{width:1},{height:-3},{quantity:1.5},{quantity:9},{allowance:50},{depth:100,kind:'bolsillo-cargo' as const}]) {
      const result=generateComponents([selection('bolsillo-parche',patch)]);
      expect(result.pieces).toHaveLength(0);
      expect(result.notices.some(issue=>issue.level==='error'&&issue.code.startsWith('component-'))).toBe(true);
    }
    const duplicate=generateComponents([selection(),selection()]);
    expect(duplicate.notices.some(issue=>issue.code==='component-id')).toBe(true);
    expect(generateComponents([selection('inventado' as PatternComponent['kind'])]).notices.some(issue=>issue.code==='component-kind')).toBe(true);
  });
  it('añade marcas exactas centradas en pieza sin mutar el patrón original',()=>{
    const base=generateComponents([selection('bolsillo-parche',{id:'base',width:400,height:500})]).pieces[0];
    const component=selection('bolsillo-parche',{width:120,height:140,placement:{pieceId:base.id,x:200,y:250}});
    const added=generateComponents([component],[base]);
    expect(base.lines).toEqual([]);
    expect(added.basePieces[0].lines.map(line=>[line.a,line.b])).toEqual([[{x:140,y:180},{x:260,y:180}],[{x:260,y:180},{x:260,y:320}],[{x:260,y:320},{x:140,y:320}],[{x:140,y:320},{x:140,y:180}]]);
    expect(added.notices.filter(issue=>issue.level==='error')).toEqual([]);
    expect(generateComponents([{...component,placement:{pieceId:base.id,x:20,y:20}}],[base]).notices.some(issue=>issue.code==='component-placement-outside')).toBe(true);
    expect(generateComponents([{...component,placement:{pieceId:'borrada',x:200,y:250}}],[base]).notices.some(issue=>issue.code==='component-placement-piece')).toBe(true);
  });
  it('una ubicación ilustrativa no se imprime como marca de colocación exacta',()=>{
    const result=generateComponents([selection('bolsillo-parche',{placement:{viewId:'frente',x:100,y:100,label:'Muslo derecho'}})]);
    expect(result.pieces[0].lines).toEqual([]);
    expect(result.assumptions.join(' ')).toContain('orientativa');
    expect(result.pieces[0].name).toContain('Muslo derecho');
  });
  it('conserva nombre elegido y materiales por parte en las etiquetas imprimibles',()=>{
    const result=generateComponents([selection('bolsillo-cargo',{name:'Bolsillo de jardinero',materials:{cuerpo:{name:'Mezclilla azul',fabricId:'tela-azul',color:'#28456a'},solapa:{name:'Verde oliva',color:'#567243'}}})]);
    expect(result.pieces.find(piece=>piece.id.endsWith('-cuerpo'))!.name).toContain('Mezclilla azul');
    expect(result.pieces.find(piece=>piece.id.endsWith('-solapa'))!.name).toContain('Verde oliva');
    expect(result.pieces.find(piece=>piece.id.endsWith('-fuelle'))!.name).not.toContain('Mezclilla azul');
    expect(result.steps[0].title).toContain('Bolsillo de jardinero');
    expect(result.pieces.some(piece=>piece.name.includes('tela-azul'))).toBe(false);
  });
  it('detecta una concavidad estrecha que cruza la marca aunque sus cuatro esquinas quepan',()=>{
    const base=generateComponents([selection('bolsillo-parche',{id:'base',width:400,height:500})]).pieces[0];
    const points=[{x:0,y:0},{x:190.2,y:0},{x:190.2,y:100},{x:190.8,y:100},{x:190.8,y:0},{x:400,y:0},{x:400,y:500},{x:0,y:500}];
    base.nodes=points.map((point,i)=>({...point,id:`n${i}`}));
    base.edges=base.nodes.map((node,i)=>({id:`e${i}`,label:`Borde ${i}`,from:node.id,to:base.nodes[(i+1)%base.nodes.length].id,kind:'line',allowance:0,finish:'sin-margen'}));
    const result=generateComponents([selection('bolsillo-parche',{width:120,height:100,placement:{pieceId:base.id,x:200,y:100}})],[base]);
    expect(result.notices.some(issue=>issue.code==='component-placement-outside')).toBe(true);
  });
});

describe('Integración de complementos con la base y los paneles',()=>{
  it('conserva las medidas, costuras y piezas de pantalón; añade piezas y guía antes del montaje',()=>{
    const project=pantsProject();
    const before=buildPattern(project.pattern!);
    const after=buildPattern({...project.pattern!,components:[selection('bolsillo-cargo'),selection('porta-martillo',{id:'martillo',width:30,height:220})]});
    expect(after.pieces.filter(piece=>!piece.id.startsWith('componente-'))).toEqual(before.pieces);
    expect(after.result?.checks.slice(0,before.result!.checks.length)).toEqual(before.result?.checks);
    expect(after.issues.filter(issue=>issue.level==='error')).toEqual([]);
    expect(after.seamResults.every(seam=>seam.ok)).toBe(true);
    expect(after.result!.steps[0]).toEqual(before.result!.steps[0]);
    expect(after.result!.steps[1].id).toContain('componente-');
    expect(after.result!.materials.length).toBeGreaterThan(before.result!.materials.length);
    expect(after.result!.materials.filter(material=>material.id==='hilo')).toHaveLength(1);
  });
  it('si falta la base, explica que genera solo complementos; con medidas faltantes no emite geometría incompleta',()=>{
    const only=buildPattern({...state(),components:[selection('bolsillo-cierre')]});
    expect(only.result?.assumptions[0]).toContain('La base de la prenda no está incluida');
    expect(only.result?.steps.length).toBeGreaterThan(0);
    expect(only.issues.filter(issue=>issue.level==='error')).toEqual([]);
    const project=pantsProject();
    const missing=buildPattern({...project.pattern!,body:{},components:[selection()]});
    expect(missing.pieces).toHaveLength(0);
    expect(missing.missing.length).toBeGreaterThan(0);
    expect(missing.issues.some(issue=>issue.code==='component-base-missing')).toBe(true);
  });
  it('compone cortes de panel y complementos, remapea instrucciones y conserva la cantidad física',()=>{
    const original={...state(),components:[selection('bolsillo-parche',{quantity:2})]};
    const base=buildPattern(original).pieces[0];
    const built=buildPattern({...original,panelCuts:[{id:'horizontal',pieceId:base.id,baseHash:pieceGeometryHash(base),allowance:7,points:[{x:-10,y:100},{x:200,y:100}]}]});
    expect(built.pieces).toHaveLength(2);
    expect(built.pieces.every(piece=>piece.cut.qty===2)).toBe(true);
    expect(built.issues.filter(issue=>issue.level==='error')).toEqual([]);
    expect(built.seamResults.every(seam=>seam.ok)).toBe(true);
    for(const step of built.result!.steps) for(const pieceId of step.pieces) expect(built.pieces.some(piece=>piece.id===pieceId)).toBe(true);
  });
  it('detecta cambios exteriores de paneles que alteran el tamaño sin cambiar la costura de unión',()=>{
    const original={...state(),components:[selection()]};
    const source=buildPattern(original).pieces[0];
    const pattern={...original,panelCuts:[{id:'horizontal',pieceId:source.id,baseHash:pieceGeometryHash(source),allowance:7,points:[{x:-10,y:100},{x:200,y:100}]}]};
    const divided=buildPattern(pattern);
    const child=divided.pieces.find(piece=>piece.nodes.some(node=>node.x===160&&node.y===0))!;
    const corner=child.nodes.find(node=>node.x===160&&node.y===0)!;
    const altered=buildPattern({...pattern,overrides:{[child.id]:{[`n:${corner.id}`]:{dx:50,dy:0,base:{x:corner.x,y:corner.y}}}}});
    expect(altered.seamResults.every(seam=>seam.ok)).toBe(true);
    expect(altered.issues.some(issue=>issue.code==='component-panel-dimensions')).toBe(true);
  });
});
