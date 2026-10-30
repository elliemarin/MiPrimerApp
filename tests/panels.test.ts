import { describe,it,expect } from 'vitest';
import { panelizePattern,pieceGeometryHash,type PanelCut } from '../src/lib/pattern/panels';
import type { Piece } from '../src/lib/pattern/types';
import { buildPattern,newPatternState,setOverride } from '../src/lib/pattern/engine';
import { seamPolygon } from '../src/lib/pattern/outline';
import { evaluateSeams,validatePiece } from '../src/lib/pattern/validate';
import { signedArea,pointInPolygon } from '../src/lib/geom/vec';
const polygon=(pts:[number,number][],id='p'):Piece=>({id,name:'Pieza',source:'manual',nodes:pts.map(([x,y],i)=>({id:'n'+i,x,y})),edges:pts.map((_,i)=>({id:'e'+i,label:'Borde '+i,from:'n'+i,to:'n'+(i+1)%pts.length,kind:'line',allowance:7,finish:'costura'})),grain:{a:{x:30,y:5},b:{x:30,y:95}},cut:{qty:2,onFold:false,mirrorPairs:true,fabric:'principal'},notches:[],lines:[],marks:[]});
const square=()=>polygon([[0,0],[100,0],[100,100],[0,100]]);
const cut=(p:Piece,pts:[number,number][],id='c'):PanelCut=>({id,pieceId:p.id,points:pts.map(([x,y])=>({x,y})),allowance:10,baseHash:pieceGeometryHash(p)});
const errors=(r:ReturnType<typeof panelizePattern>)=>r.issues.filter(i=>i.level==='error');
const area=(p:Piece)=>Math.abs(signedArea(seamPolygon(p)));

describe('Motor de paneles desde cortes físicos',()=>{
 it('divide por una línea quebrada y conserva unión, cantidad, hilo y superficie',()=>{
  const p=square(),r=panelizePattern([p],[],[cut(p,[[-20,30],[30,30],[70,70],[120,70]])]);
  expect(errors(r)).toEqual([]);expect(r.pieces).toHaveLength(2);
  expect(r.pieces.reduce((s,q)=>s+area(q),0)).toBeCloseTo(10000,4);
  expect(evaluateSeams(r.pieces,r.seams).every(s=>s.ok)).toBe(true);
  for(const q of r.pieces){expect(q.cut).toEqual(p.cut);expect(q.grain.b.x-q.grain.a.x).toBeCloseTo(0,6);expect(validatePiece(q).filter(i=>i.level==='error')).toEqual([]);}
 });
 it('un corte puede atravesar varias zonas de una pieza cóncava',()=>{
  const p=polygon([[0,0],[100,0],[100,100],[70,100],[70,30],[30,30],[30,100],[0,100]]);
  const r=panelizePattern([p],[],[cut(p,[[-20,60],[120,60]])]);
  expect(errors(r)).toEqual([]);expect(r.pieces).toHaveLength(3);
  expect(r.pieces.reduce((s,q)=>s+area(q),0)).toBeCloseTo(area(p),4);
  expect(evaluateSeams(r.pieces,r.seams).every(s=>s.ok)).toBe(true);
 });
 it('rechaza trazos cerrados, interiores, solapados, sin recorrido y autointersectados',()=>{
  const p=square();
  const paths:[number,number][][]=[[[20,20],[80,80]],[[0,0],[100,0]],[[-10,-10],[-5,-5]],[[10,10],[90,90],[10,90],[90,10]],[[0,0],[100,100],[0,0]],[[0,20],[.1,20],[100,20]]];
  for(const path of paths){const r=panelizePattern([p],[],[cut(p,path)]);expect(errors(r).length,JSON.stringify(path)).toBeGreaterThan(0);expect(r.pieces).toEqual([p]);}
 });
 it('no pierde nada si un corte repetido o una pieza ausente invalida el conjunto',()=>{
  const p=square(),c=cut(p,[[-10,40],[110,40]]);
  for(const cuts of [[c,{...c,id:'repeat'}],[c,{...c,id:'other',pieceId:'missing'}],[c,{...c,id:'stale',baseHash:'stale'}]]){
   const r=panelizePattern([p],[],cuts);expect(errors(r).length).toBeGreaterThan(0);expect(r.pieces).toEqual([p]);
  }
 });
 it('márgenes no cambian el tamaño terminado y los IDs son estables',()=>{
  const p=square(),c=cut(p,[[-10,40],[110,40]]),a=panelizePattern([p],[],[c]),b=panelizePattern([p],[],[{...c,allowance:15}]);
  expect(a.pieces.map(p=>p.id)).toEqual(b.pieces.map(p=>p.id));expect(a.pieces.map(area)).toEqual(b.pieces.map(area));expect(p).toEqual(square());
 });
 it('la regeneración del motor conserva costuras/guía y permite editar nodos de panel',()=>{
  const state=newPatternState('textil-doble-cara',{}, {kind:'mujer',fabric:'plano',stretch:0,fit:'regular'});
  const original=buildPattern(state),p=original.pieces[0];
  state.panelCuts=[cut(p,[[-20,120],[500,120]])];
  const built=buildPattern(state);
  expect(built.issues.filter(i=>i.level==='error')).toEqual([]);expect(built.pieces.length).toBe(3);
  expect(built.seamResults.every(s=>s.ok)).toBe(true);
  expect(built.result?.steps[0].id).toContain('panel-union-');
  for(const step of built.result!.steps)for(const id of step.pieces)expect(built.pieces.some(p=>p.id===id)).toBe(true);
  const panel=built.pieces.find(p=>p.panelSource)!;
  const node=panel.nodes[0];
  const edited=buildPattern(setOverride(state,panel.id,'n:'+node.id,{x:2,y:0},node));
  expect(edited.pieces.find(p=>p.id===panel.id)!.nodes[0].x).toBeCloseTo(node.x+2,5);
  const material=buildPattern({...state,panelMaterials:{[panel.id]:{name:'Mezclilla azul',fabricId:'tela1'}}});
  expect(material.pieces.find(p=>p.id===panel.id)!.name).toContain('Mezclilla azul');
 });
 it('el motor informa base obsoleta sin descartar el patrón original',()=>{
  const state=newPatternState('textil-doble-cara',{}, {kind:'mujer',fabric:'plano',stretch:0,fit:'regular'});
  const p=buildPattern(state).pieces[0];state.panelCuts=[cut(p,[[-20,120],[500,120]])];state.params={ancho:600};
  const r=buildPattern(state);expect(r.issues.some(i=>i.code==='panel-base-desactualizada')).toBe(true);expect(r.pieces.some(q=>q.panelSource)).toBe(false);
 });
 it('las flechas de hilo de una pieza cóncava quedan dentro de cada panel',()=>{
  const p=polygon([[0,0],[100,0],[100,100],[70,100],[70,30],[30,30],[30,100],[0,100]]);
  const r=panelizePattern([p],[],[cut(p,[[-20,60],[120,60]])]);
  for(const q of r.pieces){expect(pointInPolygon(q.grain.a,seamPolygon(q))).toBe(true);expect(pointInPolygon(q.grain.b,seamPolygon(q))).toBe(true);}
 });
});
