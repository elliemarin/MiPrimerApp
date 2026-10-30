import { describe, expect, it } from 'vitest';
import type { Piece, SeamRelation } from '../src/lib/pattern/types';
import { panelizePattern, pieceGeometryHash, type PanelCut } from '../src/lib/pattern/panels';
import { cutOutline } from '../src/lib/pattern/offset';
import { edgeLength, pointOnEdge, seamPolygon } from '../src/lib/pattern/outline';
import { evaluateSeams, validatePiece } from '../src/lib/pattern/validate';
import { bboxOf, pointInPolygon, signedArea, distToSegment } from '../src/lib/geom/vec';

function rectangle(id='body', fold=false): Piece {
  return {id,name:'Cuerpo',source:'manual',nodes:[{id:'a',x:0,y:0},{id:'b',x:120,y:0},{id:'c',x:120,y:80},{id:'d',x:0,y:80}],edges:[
    {id:'top',label:'Superior',from:'a',to:'b',kind:'line',allowance:10,finish:'costura'},
    {id:'right',label:'Derecho',from:'b',to:'c',kind:'line',allowance:10,finish:'costura'},
    {id:'hem',label:'Bajo',from:'c',to:'d',kind:'line',allowance:30,finish:'dobladillo'},
    {id:'left',label:'Izquierdo',from:'d',to:'a',kind:'line',allowance:fold?0:10,finish:fold?'doblez':'costura'}],
    cut:{qty:1,mirrorPairs:false,onFold:fold,fabric:'principal'},grain:{a:{x:60,y:10},b:{x:60,y:70}},
    notches:[{id:'original-notch',edgeId:'hem',s:90,count:2,label:'Piquete original'}],
    marks:[{id:'button',kind:'boton',at:{x:90,y:20}}],
    lines:[{id:'horizontal-reference',kind:'referencia',a:{x:10,y:40},b:{x:110,y:40}}]};
}
const cut=(p:Piece,id='v',points=[{x:50,y:-10},{x:50,y:90}],allowance=10):PanelCut=>({id,pieceId:p.id,points,allowance,baseHash:pieceGeometryHash(p)});
const area=(p:Piece)=>Math.abs(signedArea(seamPolygon(p,.02)));
const errors=(result:ReturnType<typeof panelizePattern>)=>result.issues.filter(i=>i.level==='error');
const nearBoundary=(p:{x:number;y:number},piece:Piece)=>{
 const poly=seamPolygon(piece,.05);return pointInPolygon(p,poly)||poly.some((a,i)=>distToSegment(p,a,poly[(i+1)%poly.length])<.1);
};

describe('Reconstrucción de paneles para confección (revisión independiente)',()=>{
 it('conserva la superficie terminada y agrega un solo margen por lado de la unión',()=>{
  const p=rectangle(), result=panelizePattern([p],[],[cut(p)]);
  expect(errors(result)).toEqual([]);expect(result.pieces).toHaveLength(2);
  expect(result.pieces.reduce((sum,q)=>sum+area(q),0)).toBeCloseTo(9600,4);
  const [left,right]=[...result.pieces].sort((a,b)=>bboxOf(seamPolygon(a)).minX-bboxOf(seamPolygon(b)).minX);
  expect(bboxOf(cutOutline(left).points).maxX).toBeCloseTo(60,2);
  expect(bboxOf(cutOutline(right).points).minX).toBeCloseTo(40,2);
  for(const q of result.pieces){
   expect(validatePiece(q).filter(i=>i.level==='error')).toEqual([]);
   expect(nearBoundary(q.grain.a,q)).toBe(true);expect(nearBoundary(q.grain.b,q)).toBe(true);
   expect(q.grain.b.x-q.grain.a.x).toBeCloseTo(0,6);expect(q.grain.b.y).toBeGreaterThan(q.grain.a.y);
   for(const e of q.edges){
    const a=q.nodes.find(n=>n.id===e.from)!,b=q.nodes.find(n=>n.id===e.to)!;
    if(Math.abs(a.y-80)<.01&&Math.abs(b.y-80)<.01){expect(e.finish).toBe('dobladillo');expect(e.allowance).toBe(30);}
    if(Math.abs(a.x-50)<.01&&Math.abs(b.x-50)<.01){expect(e.finish).toBe('costura');expect(e.allowance).toBe(10);}
   }
  }
  const joinNotches=result.pieces.flatMap(q=>q.notches.filter(n=>n.id.startsWith('union-v-')).map(n=>({q,n})));
  expect(joinNotches).toHaveLength(2);
  const positions=joinNotches.map(({q,n})=>pointOnEdge(q,q.edges.find(e=>e.id===n.edgeId)!,n.s).p);
  expect(positions[0].x).toBeCloseTo(positions[1].x,6);expect(positions[0].y).toBeCloseTo(positions[1].y,6);
  expect(result.seams.length).toBeGreaterThan(0);
  expect(evaluateSeams(result.pieces,result.seams).every(s=>s.ok)).toBe(true);
 });
 it('convierte correctamente el corte al doblez en un panel al doblez y otro par simétrico',()=>{
  const p=rectangle('fold',true),result=panelizePattern([p],[],[cut(p)]);
  expect(errors(result)).toEqual([]);
  const folded=result.pieces.find(q=>q.edges.some(e=>e.finish==='doblez'))!;
  const detached=result.pieces.find(q=>!q.edges.some(e=>e.finish==='doblez'))!;
  expect(folded.cut).toMatchObject({onFold:true,qty:1});
  expect(detached.cut).toMatchObject({onFold:false,qty:2,mirrorPairs:true});
  expect(result.pieces.reduce((sum,q)=>sum+area(q)*q.cut.qty*(q.cut.onFold?2:1),0)).toBeCloseTo(area(p)*2,4);
  const horizontal=panelizePattern([p],[],[cut(p,'horizontal',[{x:-10,y:40},{x:130,y:40}])]);
  expect(horizontal.pieces.every(q=>q.cut.onFold&&q.cut.qty===1)).toBe(true);
  const mirrored={...rectangle('mirrored'),cut:{qty:2,onFold:false,mirrorPairs:true,fabric:'principal' as const}};
  const mirrorParts=panelizePattern([mirrored],[],[cut(mirrored)]);
  expect(mirrorParts.pieces.every(q=>q.cut.mirrorPairs&&q.cut.qty===2&&!q.cut.onFold)).toBe(true);
 });
 it('reparte marcas, piquetes heredados y líneas de referencia sin perder su posición física',()=>{
  const p=rectangle(),result=panelizePattern([p],[],[cut(p)]);
  expect(errors(result)).toEqual([]);
  const inherited=result.pieces.flatMap(q=>q.notches.filter(n=>n.label?.includes('Piquete original')).map(n=>({q,n})));
  expect(inherited).toHaveLength(1);
  const {q,n}=inherited[0],e=q.edges.find(e=>e.id===n.edgeId)!;
  const pos=pointOnEdge(q,e,n.s).p;expect(pos.x).toBeCloseTo(30,2);expect(pos.y).toBeCloseTo(80,2);expect(n.count).toBe(2);
  const markers=result.pieces.flatMap(q=>q.marks.filter(m=>m.kind==='boton').map(m=>({q,m})));
  expect(markers).toHaveLength(1);expect(markers[0].m.at).toEqual({x:90,y:20});
  for(const q of result.pieces)for(const line of q.lines){expect(nearBoundary(line.a,q)).toBe(true);expect(nearBoundary(line.b,q)).toBe(true);}
 });
 it('conserva costuras externas con factores después de cortar la pieza relacionada',()=>{
  const p=rectangle(),other=rectangle('other');
  const relation:SeamRelation={id:'outer',label:'Superior dos veces',kind:'igual',a:[{pieceId:p.id,edgeIds:['top'],factor:2}],b:[{pieceId:other.id,edgeIds:['top'],factor:2}],ratioMin:1,ratioMax:1,tolerance:.1};
  const result=panelizePattern([p,other],[relation],[cut(p)]);
  expect(errors(result)).toEqual([]);
  const sewn=evaluateSeams(result.pieces,result.seams).find(s=>s.relation.id==='outer')!;
  expect(sewn).toBeDefined();expect(sewn.lengthA).toBeCloseTo(240,3);expect(sewn.lengthB).toBeCloseTo(240,3);expect(sewn.ok).toBe(true);
 });
 it('produce cuatro paneles que se reconstruyen cuando dos cortes se cruzan',()=>{
  const p=rectangle(),cuts=[cut(p),cut(p,'h',[{x:-10,y:35},{x:130,y:35}],7)];
  const result=panelizePattern([p],[],cuts);
  expect(errors(result)).toEqual([]);expect(result.pieces).toHaveLength(4);
  expect(result.pieces.reduce((sum,q)=>sum+area(q),0)).toBeCloseTo(9600,4);
  for(const seam of evaluateSeams(result.pieces,result.seams)){expect(seam.ok,seam.relation.label).toBe(true);expect(seam.lengthA).toBeCloseTo(seam.lengthB,4);}
  const first=panelizePattern([p],[],cuts),again=panelizePattern([p],[],cuts);
  expect(first.pieces.map(q=>q.id)).toEqual(again.pieces.map(q=>q.id));
 });
 it('rechaza un segundo corte inválido sin dejar una división parcial del primer corte',()=>{
  const p=rectangle(),seams:SeamRelation[]=[];
  const result=panelizePattern([p],seams,[cut(p),cut(p,'bad',[{x:10,y:10},{x:20,y:20}])]);
  expect(errors(result).length).toBeGreaterThan(0);
  expect(result.pieces).toEqual([p]);expect(result.seams).toEqual(seams);
 });
 it('rechaza la base desactualizada y los cortes que solo rozan o siguen el contorno',()=>{
  const p=rectangle();
  const stale={...cut(p),baseHash:'older-body'};
  const tangent=cut(p,'tangent',[{x:-10,y:0},{x:130,y:0}]);
  for(const c of [stale,tangent]){
   const result=panelizePattern([p],[],[c]);expect(errors(result).length).toBeGreaterThan(0);expect(result.pieces).toEqual([p]);
  }
 });
 it('divide una pieza cóncava en tres paneles con dos tramos interiores del mismo corte',()=>{
  const p=rectangle('concave'),points=[{x:0,y:0},{x:120,y:0},{x:120,y:80},{x:80,y:80},{x:80,y:30},{x:40,y:30},{x:40,y:80},{x:0,y:80}];
  p.nodes=points.map((p,i)=>({...p,id:`n${i}`}));
  p.edges=points.map((_,i)=>({id:`e${i}`,label:'Contorno',from:`n${i}`,to:`n${(i+1)%points.length}`,kind:'line' as const,allowance:10,finish:'costura' as const}));
  p.notches=[];p.marks=[];p.lines=[];
  const result=panelizePattern([p],[],[cut(p,'double-run',[{x:-10,y:50},{x:130,y:50}])]);
  expect(errors(result)).toEqual([]);expect(result.pieces).toHaveLength(3);
  expect(result.pieces.reduce((sum,q)=>sum+area(q),0)).toBeCloseTo(7600,4);
  const seam=evaluateSeams(result.pieces,result.seams)[0];
  expect(seam.ok).toBe(true);expect(seam.lengthA).toBeCloseTo(80,5);expect(seam.lengthB).toBeCloseTo(80,5);
 });
 it('conserva la costura de un corte con cambio de dirección',()=>{
  const p=rectangle(),points=[{x:-10,y:20},{x:50,y:20},{x:50,y:50},{x:130,y:50}];
  const result=panelizePattern([p],[],[cut(p,'turned',points)]);
  expect(errors(result)).toEqual([]);expect(result.pieces).toHaveLength(2);
  expect(result.pieces.reduce((sum,q)=>sum+area(q),0)).toBeCloseTo(9600,4);
  const seam=evaluateSeams(result.pieces,result.seams)[0];expect(seam.ok).toBe(true);expect(seam.lengthA).toBeCloseTo(150,4);expect(seam.lengthB).toBeCloseTo(150,4);
 });
 it('aproxima un borde curvo sin cambiar apreciablemente su superficie o longitud cosida',()=>{
  const p=rectangle('curved');p.nodes[1].y=10;p.nodes[0].y=10;
  p.edges[0]={...p.edges[0],kind:'cubic',c1:{x:30,y:-5},c2:{x:90,y:-5}};
  const result=panelizePattern([p],[],[cut(p)]);
  expect(errors(result)).toEqual([]);
  const original=area(p),sum=result.pieces.reduce((sum,q)=>sum+area(q),0);
  expect(Math.abs(original-sum)).toBeLessThan(2);
  const topLength=result.pieces.reduce((sum,q)=>sum+q.edges.filter(e=>e.label.includes('Superior')).reduce((a,e)=>a+edgeLength(q,e),0),0);
  expect(topLength).toBeCloseTo(edgeLength(p,p.edges[0]),1);
 });
});
