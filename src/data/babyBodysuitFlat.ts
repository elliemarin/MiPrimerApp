import type { FlatView, FlatViewKey } from './flats';
import type { Zone } from '../features/studio/model';
import { findSize } from '../lib/sizes/tables';
import { generateBabyBodysuit } from '../lib/pattern/generators/babyBodysuit';
import { cmdsBBox, cmdsToSvg, pieceSeamCmds, transformCmds, type PathCmd } from '../lib/draw/paths';

/** A closed, assembled illustration of the actual 0–3 month construction.
 * Pattern pieces keep their original geometry; this only presents a garment. */
export function babyBodysuitFlat(key:FlatViewKey,sleeve:'corta'|'larga'='corta'):FlatView {
  const back=key==='espalda';
  const result=generateBabyBodysuit({body:findSize('ref-bebe-meses','B0-3')!.values,kind:'bebe',fabric:'punto',stretch:30,fit:'regular'},{tipoManga:sleeve});
  const front=result.pieces.find(piece=>piece.id==='delantero')!,rear=result.pieces.find(piece=>piece.id==='espalda')!,armPiece=result.pieces.find(piece=>piece.id==='manga')!;
  const half=front.nodes[2].x,height=front.nodes[5].y,arm=front.nodes[3].y,hip=front.nodes[4].y,crotch=front.nodes[5].x;
  const neck=front.edges[0],leg=front.edges[4];
  const torso:PathCmd[]=back?transformCmds(pieceSeamCmds(rear),[1,0,0,1,-half,0]).map(cmd=>{
    // The rear tab laps under the front; its extra 22 mm are hidden when shut.
    const closed=(point:{x:number;y:number})=>({x:point.x,y:point.y<=hip?point.y:hip+(point.y-hip)*(height-hip)/(rear.nodes[7].y-hip)});
    return cmd.op==='Z'?cmd:cmd.op==='C'?{...cmd,p:closed(cmd.p),c1:closed(cmd.c1),c2:closed(cmd.c2)}:{...cmd,p:closed(cmd.p)};
  }):[
    {op:'M',p:front.nodes[0]},
    {op:'C',c1:neck.c1!,c2:neck.c2!,p:front.nodes[1]},
    {op:'L',p:front.nodes[2]},{op:'L',p:front.nodes[4]},
    {op:'C',c1:leg.c1!,c2:leg.c2!,p:front.nodes[5]},
    {op:'L',p:{x:-crotch,y:height}},
    {op:'C',c1:{x:-leg.c2!.x,y:leg.c2!.y},c2:{x:-leg.c1!.x,y:leg.c1!.y},p:{x:-half,y:hip}},
    {op:'L',p:{x:-half,y:0}},{op:'L',p:{x:-front.nodes[1].x,y:0}},
    {op:'C',c1:{x:-neck.c2!.x,y:neck.c2!.y},c2:{x:-neck.c1!.x,y:neck.c1!.y},p:front.nodes[0]}, {op:'Z'}
  ];
  const sleeveLength=armPiece.nodes[1].x,cuff=armPiece.nodes[2].y-armPiece.nodes[1].y;
  const cuffCenterY=arm/2+sleeveLength*.57,extension=sleeveLength*.82;
  const zones:Zone[]=[{id:back?'espalda':'delantero',label:back?'Espalda':'Delantero con broches',type:back?'espalda':'delantero',d:cmdsToSvg(torso)}];
  const details:FlatView['details']=[];
  for(const sign of [-1,1]) {
    const outerX=sign*(half+extension),upper=cuffCenterY-cuff/4,lower=cuffCenterY+cuff/4;
    const commands:PathCmd[]=[{op:'M',p:{x:sign*half,y:0}},{op:'L',p:{x:outerX,y:upper}},{op:'L',p:{x:outerX,y:lower}},{op:'L',p:{x:sign*half,y:arm}},{op:'Z'}];
    zones.unshift({id:sign<0?'manga-a':'manga-b',label:sign<0?'Manga izquierda de la vista':'Manga derecha de la vista',type:'manga',d:cmdsToSvg(commands)});
    details.push({d:`M${outerX-sign*6} ${upper+2} L${outerX-sign*6} ${lower-2}`,style:'pespunte'});
  }
  const dots:FlatView['dots']=[];
  if(!back) {
    const y=front.nodes[0].y;
    details.push({d:`M-12 ${y} L-12 ${height}`,style:'costura'},{d:`M10 ${y+8} L10 ${height-8}`,style:'pespunte'});
    for(const mark of front.marks.filter(item=>item.id.startsWith('broche-frente')))dots.push({...mark.at,r:3.2});
    for(const x of [-crotch/2,crotch/2])dots.push({x,y:height-11,r:3.2});
  } else details.push({d:`M${-crotch} ${height-22} L${crotch} ${height-22}`,style:'pespunte'});
  const points=zones.flatMap(zone=>{
    const numbers=zone.d.match(/-?\d+(?:\.\d+)?/g)?.map(Number)??[];
    return numbers.reduce<{x:number;y:number}[]>((out,n,i)=>{if(i%2===0)out.push({x:n,y:numbers[i+1]});return out;},[]);
  });
  const bounds=cmdsBBox(points.map((p,index)=>({op:index?'L':'M',p})));
  return {key,zones,details,dots,minX:bounds.minX-20,minY:bounds.minY-20,width:bounds.maxX-bounds.minX+40,height:bounds.maxY-bounds.minY+40,refY:0,refLabel:'Hombro',seams:{left:-half,right:half,center:0}};
}
