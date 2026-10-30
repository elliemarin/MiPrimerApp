import type { PatternComponent } from '../../lib/pattern/components';
import { isDecoration } from '../../lib/pattern/decorations';

const n=(value:number)=>Number(value.toFixed(4));
/** Counterclockwise holes keep lace transparent with the standard nonzero SVG fill rule. */
const hole=(x:number,y:number,rx:number,ry:number)=>`M${n(x+rx)} ${y}C${n(x+rx)} ${n(y-ry)} ${n(x-rx)} ${n(y-ry)} ${n(x-rx)} ${y}C${n(x-rx)} ${n(y+ry)} ${n(x+rx)} ${n(y+ry)} ${n(x+rx)} ${y}Z`;

/** Original illustrative trim motifs, normalized to the actual component rectangle. */
export function decorationPath(component: Pick<PatternComponent,'kind'|'width'|'height'|'decoration'>): string | undefined {
  if(!isDecoration(component.kind))return;
  const style=component.decoration?.style??(component.kind==='olan-fruncido'?'frunce':component.kind==='olan-plisado'?'pliegues':'cinta');
  const count=Math.max(3,Math.min(32,Math.round(component.width/Math.max(14,component.height*.72)))), cell=100/count;
  if(style==='flecos') {
    let path='M0 0H100V100';
    for(let i=count-1;i>=0;i--)path+=`H${n((i+.6)*cell)}V25H${n((i+.4)*cell)}V100H${n(i*cell)}`;
    return path+'Z';
  }
  if(style==='pompones') {
    let path='M0 0H100V18H0Z';
    for(let i=0;i<count;i++) {const x=(i+.5)*cell;path+=`M${n(x-cell*.08)} 12H${n(x+cell*.08)}V46H${n(x-cell*.08)}Z`;
      path+=`M${n(x)} 42C${n(x+cell*.48)} 42 ${n(x+cell*.48)} 100 ${n(x)} 100C${n(x-cell*.48)} 100 ${n(x-cell*.48)} 42 ${n(x)} 42Z`;}
    return path;
  }
  if(style==='serpentina') {
    let top='M0 22',bottom='';
    for(let i=0;i<count;i++){top+=`L${n((i+.5)*cell)} 62L${n((i+1)*cell)} 22`;bottom=`L${n((i+.5)*cell)} 100L${n(i*cell)} 60`+bottom;}
    return top+'L100 60'+bottom+'Z';
  }
  let path='M0 0H100V80';
  const scalloped=['encaje-floral','blonda','ojales','frunce'].includes(style);
  if(scalloped) for(let i=count-1;i>=0;i--)path+=`Q${n((i+.5)*cell)} 120 ${n(i*cell)} 80`;
  else path+='V100H0';
  path+='Z';
  if(['encaje-floral','blonda'].includes(style)) for(let i=0;i<count;i++) {
    const x=(i+.5)*cell;
    path+=hole(x,44,cell*.11,8);
    path+=hole(x,20,cell*.12,10)+hole(x,68,cell*.12,10);
    path+=hole(x-cell*.24,44,cell*.12,11)+hole(x+cell*.24,44,cell*.12,11);
    if(style==='blonda')path+=hole(x,88,cell*.09,5);
  }
  if(style==='ojales') for(let i=0;i<count;i++)path+=hole((i+.5)*cell,48,cell*.22,27);
  if(style==='geometrico') for(let i=0;i<count;i++){const x=(i+.5)*cell;path+=`M${n(x)} 16L${n(x-cell*.32)} 50L${n(x)} 84L${n(x+cell*.32)} 50Z`;}
  return path;
}

/** Fold strokes are decorative references, never extra cutting contours. */
export function decorationFoldPath(component: Pick<PatternComponent,'kind'|'decoration'>): string | undefined {
  if(component.kind==='olan-plisado') {
    const count=component.decoration?.pleats??6;
    return Array.from({length:count-1},(_,i)=>{const x=100*(i+1)/count;return `M${n(x)} 2V96M${n(x-1.2)} 2V96`;}).join('');
  }
  if(component.kind==='olan-fruncido') return Array.from({length:13},(_,i)=>{const x=100*(i+.5)/13;return `M${n(x)} 3Q${n(x-1.8)} 36 ${n(x+1.2)} 76`;}).join('');
  return;
}
