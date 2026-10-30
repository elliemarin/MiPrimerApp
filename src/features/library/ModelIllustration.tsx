import { useId } from 'react';
import type { CatalogModel } from '../../data/catalog';
import { getFlat } from '../../ui/FlatArt';
import { figureGeometry, FigureBody, SKIN_TONES } from '../../lib/draw/figurine';

/** A composition illustration; never used for sewing dimensions or fit calculations. */
export function ModelIllustration({model,view='frente',body='recto',skin=SKIN_TONES[3],title}:{model:CatalogModel;view?:string;body?:FigureBody;skin?:string;title?:string}) {
  const id=useId();
  const flat=getFlat(model.id,model.flat);
  const v=flat.views.find(v=>v.key===view)??flat.views[0];
  const object=model.flat.family==='accesorio'||model.flat.family==='bolso';
  const child=model.recipients.every(r=>['bebe','toddler','infantil'].includes(r));
  const g=figureGeometry(body,child?'infantil':'adulto');
  const lower=model.flat.family==='pantalon'||model.flat.family==='falda'||!!model.flat.pinafore;
  const fullBody=!!model.flat.pants?.torso||!!model.flat.pants?.bib||!!model.flat.pinafore;
  const bodyWidth=body==='amplio'?164:body==='curvas'?142:128;
  const flatBodyWidth=(v.seams.right??v.width*.25)-(v.seams.left??-v.width*.25);
  const k=object?Math.min(300/v.width,450/v.height):Math.min(bodyWidth/Math.max(100,flatBodyWidth),360/v.width,(lower?350:470)/v.height);
  // Croquis are stylized; adapt the illustration vertically to its anatomical
  // landmarks. This transform is never applied to pattern geometry.
  const pantsEnd=model.flat.pants?.length;
  const lowerHeight=pantsEnd==='short'?125:pantsEnd==='bermuda'?175:pantsEnd==='capri'?255:pantsEnd==='tobillo'?g.ankle-g.waistY-16:g.ankle-g.waistY;
  const ky=object?k:model.flat.family==='pantalon'?lowerHeight/Math.max(1,v.minY+v.height-20-v.refY):model.flat.family==='falda'?.32:model.flat.family==='vestido'?.34:.29;
  const x=object?200-(v.minX+v.width/2)*k:200-(v.seams.center??0)*k;
  const y=object?340-(v.minY+v.height/2)*k:lower?g.waistY-v.refY*ky:g.top-(v.minY+20)*ky;
  const upperKy=(g.waistY-g.top)/Math.max(100,v.refY-v.minY-20);
  const palette=['#557d70','#789ba2','#b57d68','#bdac7b'];
  const garment = (upper=false) => {
    const scaleY=upper?upperKy:ky;
    const translateY=upper?g.waistY-v.refY*upperKy:y;
    return <g transform={`translate(${x} ${translateY}) scale(${k} ${scaleY})`}>
      <g clipPath={fullBody?`url(#${id}-${upper?'upper':'lower'})`:undefined} stroke="#283c34" strokeLinejoin="round">
      {v.zones.map(z=><g key={z.id}><path d={z.d} fill={palette[z.type==='bolsillo'?2:['cuello','puno','pretina'].includes(z.type)?1:0]} strokeWidth={.9/k}/><path d={z.d} fill={`url(#${id}-weave)`} stroke="none"/></g>)}
      {v.details.map((d,i)=><path key={i} d={d.d} fill="none" strokeWidth={.6/k} strokeDasharray={d.style==='pespunte'?`${2/k} ${2/k}`:undefined}/>)}
      {v.dots.map((d,i)=><circle key={i} cx={d.x} cy={d.y} r={d.r} fill="#d5c296" strokeWidth={.6/k}/>)}
      </g>
    </g>;
  };
  return <svg className="model-illustration" viewBox="0 0 400 680" role="img" aria-label={title??`Ilustración de ${model.name}${object?'':' en figurín'}`}>
    <title>{title??model.name}</title><desc>Ilustración plana orientativa. No representa el ajuste ni la caída de una tela real.</desc>
    <defs>
      <clipPath id={`${id}-upper`}><rect x={-5000} y={v.refY-5000} width={10000} height={5000}/></clipPath>
      <clipPath id={`${id}-lower`}><rect x={-5000} y={v.refY} width={10000} height={5000}/></clipPath>
      <pattern id={`${id}-weave`} width="6" height="6" patternUnits="userSpaceOnUse"><path d="M0 0H6M0 3H6M0 0V6M3 0V6" stroke="#fff" strokeOpacity=".12" strokeWidth=".5"/></pattern></defs>
    <rect width="400" height="680" fill="#f7f6f0"/>
    <ellipse cx="200" cy={object?602:g.ankle+16} rx={object?120:70} ry="5" fill="#e1e5dd"/>
    {!object&&<>
      <g fill={skin} stroke="#725949" strokeWidth=".7" strokeLinejoin="round">
        {g.legs.map((d,i)=><path key={`l${i}`} d={d}/>)}{g.arms.map((d,i)=><path key={`a${i}`} d={d}/>)}<path d={g.torso}/><path d={g.neck}/>
      </g>
      <ellipse cx={g.head.cx} cy={g.head.cy} rx={g.head.rx} ry={g.head.ry} fill={skin} stroke="#725949" strokeWidth=".7"/>
      <path d={`M${200-g.head.rx} ${g.head.cy+4} Q${160-g.head.rx/2} ${g.head.cy-g.head.ry-25} 205 ${g.head.cy-g.head.ry-8} Q${240+g.head.rx/2} ${g.head.cy-g.head.ry-2} ${200+g.head.rx} ${g.head.cy+3} Q220 ${g.head.cy-18} 207 ${g.head.cy-23} Q190 ${g.head.cy-8} ${200-g.head.rx} ${g.head.cy+4}Z`} fill="#3b3028"/>
      {view!=='espalda'&&<path d={`M187 ${g.head.cy+5}h5M208 ${g.head.cy+5}h5M195 ${g.head.cy+25}q5 3 10 0`} fill="none" stroke="#725949" strokeWidth="1" strokeLinecap="round"/>}
      {lower&&<path d={g.torso} fill="#e2e5dd" stroke="#b2b8ae" strokeWidth=".7"/>}
      {!lower&&<path d={`M${200-bodyWidth*.4} ${g.waistY}H${200+bodyWidth*.4}L${200+bodyWidth*.37} ${g.crotch+28}H205L200 ${g.crotch+2}L195 ${g.crotch+28}H${200-bodyWidth*.37}Z`} fill="#d9ddd6" stroke="#b2b8ae" strokeWidth=".7"/>}
    </>}
    {garment()}
    {fullBody&&garment(true)}
  </svg>;
}
