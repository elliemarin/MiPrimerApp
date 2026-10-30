import { useId } from 'react';
import { figureGeometry, type FigureBody, type FigureAge, type FigurineOptions } from '../lib/draw/figurine';

interface FigureArtProps {
  body: FigureBody;
  age: FigureAge;
  skin: string;
  hair?: FigurineOptions['hair'];
  hairColor?: string;
  back?: boolean;
  /** Neutral base clothing keeps separates readable on a dressed croquis. */
  base?: 'shorts' | 'leggings';
  idPrefix?: string;
}

function blend(color: string, target: string, ratio: number) {
  const valid = /^#[0-9a-f]{6}$/i.test(color) ? color : '#bc8055';
  return '#' + [1, 3, 5].map(i => Math.round(parseInt(valid.slice(i, i + 2), 16) * (1 - ratio) + parseInt(target.slice(i, i + 2), 16) * ratio).toString(16).padStart(2, '0')).join('');
}

/** Configurable original vector croquis. Use inside a 400 × 680 SVG.
 * The restrained light follows the form; it is not a cloth/fit simulation. */
export function FigureArt({body, age, skin, hair = 'corto', hairColor = '#292724', back = false, base = 'shorts', idPrefix}: FigureArtProps) {
  const instance = useId().replace(/:/g, '');
  const id = `${idPrefix ?? 'figure'}-${instance}`;
  const g = figureGeometry(body, age);
  const {head: h, top, waistY, hipY, crotch, ankle, shoulder, waist, hip} = g;
  const ink = blend(skin, '#392c26', .47);
  const quietInk = blend(skin, '#392c26', .25);
  const hairLight = blend(hairColor, '#c8baa0', .19);
  const r = h.rx;
  const child = age === 'infantil';
  const hairBack = hair === 'largo'
    ? `M${200 - r - 4} ${h.cy + 9} C${200 - r - 16} ${h.cy - h.ry - 30} ${200 + r + 20} ${h.cy - h.ry - 29} ${200 + r + 4} ${h.cy + 11} C${200 + r + 10} ${h.cy + 55} ${200 + r + 23} ${top + 43} ${200 + r + 7} ${top + 65} Q200 ${top + 53} ${200 - r - 15} ${top + 61} C${200 - r - 18} ${top + 31} ${200 - r - 2} ${h.cy + 43} ${200 - r - 4} ${h.cy + 9} Z`
    : hair === 'rizado' ? `M${200 - r - 8} ${h.cy + 13} C${200 - r - 22} ${h.cy + 5} ${200 - r - 17} ${h.cy - 16} ${200 - r - 12} ${h.cy - 20} C${200 - r - 17} ${h.cy - 39} ${200 - r + 4} ${h.cy - h.ry - 17} ${200 - 8} ${h.cy - h.ry - 14} C203 ${h.cy - h.ry - 27} ${200 + r + 10} ${h.cy - h.ry - 13} ${200 + r + 8} ${h.cy - 22} C${200 + r + 24} ${h.cy - 17} ${200 + r + 17} ${h.cy + 12} ${200 + r + 8} ${h.cy + 18} Q200 ${h.cy + h.ry - 4} ${200 - r - 8} ${h.cy + 13} Z` : '';
  const hairFront = hair === 'largo'
    ? `M${200 - r - 2} ${h.cy + 11} C${200 - r - 10} ${h.cy - h.ry - 18} ${200 + r + 11} ${h.cy - h.ry - 25} ${200 + r + 4} ${h.cy + 12} C${200 + r - 4} ${h.cy - 10} ${200 + 9} ${h.cy - 8} ${200 + 4} ${h.cy - 28} C197 ${h.cy - 13} ${200 - r + 6} ${h.cy - 13} ${200 - r - 2} ${h.cy + 11} Z`
    : hair === 'rizado' ? `M${200 - r - 3} ${h.cy - 1} C${200 - r - 13} ${h.cy - 22} ${200 - r - 1} ${h.cy - h.ry - 17} ${200 - 7} ${h.cy - h.ry - 8} C202 ${h.cy - h.ry - 23} ${200 + r + 15} ${h.cy - h.ry - 14} ${200 + r + 5} ${h.cy - 3} C${200 + r - 6} ${h.cy - 18} ${200 + 12} ${h.cy - 8} 203 ${h.cy - 23} C194 ${h.cy - 9} ${200 - r + 7} ${h.cy - 19} ${200 - r - 3} ${h.cy - 1} Z`
    : `M${200 - r - 1} ${h.cy + 1} C${200 - r - 9} ${h.cy - h.ry - 15} ${200 + r + 9} ${h.cy - h.ry - 22} ${200 + r + 3} ${h.cy + 1} L${200 + r - 3} ${h.cy - 7} C${200 + r - 5} ${h.cy - 16} ${200 + 11} ${h.cy - 17} ${200 + 8} ${h.cy - 27} C${200 - 3} ${h.cy - 14} ${200 - r + 5} ${h.cy - 22} ${200 - r + 3} ${h.cy + 1} Z`;
  const tank = `M${200 - shoulder + 17} ${top + 6} L${200 - shoulder + 28} ${top + 8} Q200 ${back ? top + 14 : top + 59} ${200 + shoulder - 28} ${top + 8} L${200 + shoulder - 17} ${top + 6} C${200 + shoulder - 15} ${top + 35} ${200 + waist + 8} ${waistY - 18} ${200 + waist + 3} ${waistY + 13} Q200 ${waistY + 25} ${200 - waist - 3} ${waistY + 13} C${200 - waist - 8} ${waistY - 18} ${200 - shoulder + 15} ${top + 35} ${200 - shoulder + 17} ${top + 6} Z`;
  const shorts = `M${200 - waist - 5} ${waistY + 15} Q200 ${waistY + 26} ${200 + waist + 5} ${waistY + 15} C${200 + hip - 3} ${hipY - 18} ${200 + hip + 1} ${hipY + 7} ${200 + hip - 8} ${crotch + 32} L207 ${crotch + 32} Q200 ${crotch + 15} 193 ${crotch + 32} L${200 - hip + 8} ${crotch + 32} C${200 - hip - 1} ${hipY + 7} ${200 - hip + 3} ${hipY - 18} ${200 - waist - 5} ${waistY + 15} Z`;
  const kneeY = crotch + (ankle - crotch) * .49;
  const knee = child ? 31 : body === 'amplio' ? 38 : body === 'curvas' ? 34 : 30;
  const leggings = `M${200 - waist - 5} ${waistY + 15} Q200 ${waistY + 26} ${200 + waist + 5} ${waistY + 15} C${200 + hip - 1} ${hipY - 18} ${200 + hip + 1} ${hipY + 7} ${200 + hip - 2} ${hipY + 28} C${200 + hip + 2} ${crotch + 41} ${200 + knee + 8} ${kneeY - 18} ${200 + knee + 7} ${kneeY + 5} C${200 + knee + 10} ${kneeY + 32} 232 ${ankle - 35} 231 ${ankle - 11} L216 ${ankle - 11} C218 ${ankle - 47} ${200 + knee - 12} ${kneeY + 36} ${200 + knee - 13} ${kneeY + 5} C${200 + knee - 14} ${kneeY - 14} 207 ${crotch + 39} 206 ${crotch + 13} Q200 ${crotch + 3} 194 ${crotch + 13} C193 ${crotch + 39} ${200 - knee + 14} ${kneeY - 14} ${200 - knee + 13} ${kneeY + 5} C${200 - knee + 12} ${kneeY + 36} 182 ${ankle - 47} 184 ${ankle - 11} L169 ${ankle - 11} C168 ${ankle - 35} ${200 - knee - 10} ${kneeY + 32} ${200 - knee - 7} ${kneeY + 5} C${200 - knee - 8} ${kneeY - 18} ${200 - hip - 2} ${crotch + 41} ${200 - hip + 2} ${hipY + 28} C${200 - hip - 1} ${hipY + 7} ${200 - hip + 1} ${hipY - 18} ${200 - waist - 5} ${waistY + 15} Z`;
  return <g className="figure-art" strokeLinejoin="round" strokeLinecap="round">
    <defs>
      <linearGradient id={`${id}-skin`} x1="0" x2="1" y1=".1" y2=".25"><stop offset="0" stopColor={blend(skin, '#402e28', .13)}/><stop offset=".28" stopColor={blend(skin, '#fff5e8', .15)}/><stop offset=".64" stopColor={skin}/><stop offset="1" stopColor={blend(skin, '#402e28', .19)}/></linearGradient>
      <linearGradient id={`${id}-face`} x1="0" x2="1"><stop offset="0" stopColor={blend(skin, '#402e28', .10)}/><stop offset=".40" stopColor={blend(skin, '#fff5e8', .18)}/><stop offset=".76" stopColor={skin}/><stop offset="1" stopColor={blend(skin, '#402e28', .14)}/></linearGradient>
      <linearGradient id={`${id}-hair`} x1="0" x2="1"><stop stopColor={hairColor}/><stop offset=".45" stopColor={hairLight}/><stop offset=".8" stopColor={hairColor}/></linearGradient>
    </defs>
    {hairBack && <path d={hairBack} fill={`url(#${id}-hair)`}/>}
    <g fill={`url(#${id}-skin)`} stroke={ink} strokeWidth=".65">
      {g.legs.map((d, i) => <path key={`leg${i}`} d={d}/>)}
      {g.arms.map((d, i) => <path key={`arm${i}`} d={d}/>)}
      <path d={g.torso}/><path d={g.neck}/>
    </g>
    <g fill="none" stroke={quietInk} strokeWidth=".65" opacity=".7">
      <path d={`M${200 - shoulder - 12} ${top + 72} Q${200 - shoulder - 6} ${top + 94} ${200 - shoulder - 17} ${top + 109} M${200 + shoulder + 12} ${top + 72} Q${200 + shoulder + 6} ${top + 94} ${200 + shoulder + 17} ${top + 109}`}/>
      <path d={`M${200 - 24} ${crotch + 109} q-8 5 -7 13 M${200 + 24} ${crotch + 109} q8 5 7 13 M${200 - 24} ${ankle - 6}l-2 8 M${200 + 24} ${ankle - 6}l2 8`}/>
      {[-1, 1].map(s => <path key={s} d={`M${200 + s * (shoulder + 28)} ${top + (child ? 180 : 203) - 13}l${s * 3} 10 M${200 + s * (shoulder + 25)} ${top + (child ? 180 : 203) - 9}l${s * 3} 11`}/>)}
    </g>
    <g fill="#e5e8e2" stroke="#c3cbc0" strokeWidth=".55">
      <path d={tank}/><path d={base === 'leggings' ? leggings : shorts}/>
    </g>
    <path d={`M${200 - 10} ${top - 12} Q200 ${top - 2} ${200 + 10} ${top - 12}`} fill="none" stroke={quietInk} strokeWidth=".7" opacity=".65"/>
    {!back && <g fill={`url(#${id}-skin)`} stroke={ink} strokeWidth=".5"><ellipse cx={200 - r} cy={h.cy + 3} rx="3.4" ry="6.4"/><ellipse cx={200 + r} cy={h.cy + 3} rx="3.4" ry="6.4"/></g>}
    <path d={g.face} fill={`url(#${id}-face)`} stroke={ink} strokeWidth=".65"/>
    {back ? <>
      {hair !== 'sin' && <path d={`M${200-r} ${h.cy+8} C${200-r-7} ${h.cy-h.ry-19} ${200+r+7} ${h.cy-h.ry-19} ${200+r} ${h.cy+8} Q${200+r-4} ${h.cy+h.ry-6} 200 ${h.cy+h.ry-7} Q${200-r+4} ${h.cy+h.ry-6} ${200-r} ${h.cy+8} Z`} fill={`url(#${id}-hair)`}/>}
      <path d={`M200 ${top - 2}v22`} fill="none" stroke={quietInk} strokeWidth=".65"/>
    </> : <>
      <g stroke={blend(skin, '#281f1c', .69)} fill="none" strokeWidth=".9">
        <path d={`M${200-r*.62} ${h.cy-1} Q${200-r*.39} ${h.cy-3.6} ${200-r*.17} ${h.cy-1} M${200+r*.17} ${h.cy-1} Q${200+r*.39} ${h.cy-3.6} ${200+r*.62} ${h.cy-1}`}/>
        <path d={`M${200-r*.63} ${h.cy-7} Q${200-r*.4} ${h.cy-9} ${200-r*.18} ${h.cy-7} M${200+r*.18} ${h.cy-7} Q${200+r*.4} ${h.cy-9} ${200+r*.63} ${h.cy-7}`} strokeWidth="1.35"/>
      </g>
      <g fill={blend(skin, '#281f1c', .8)}><ellipse cx={200-r*.37} cy={h.cy-1} rx="1.05" ry="1.3"/><ellipse cx={200+r*.37} cy={h.cy-1} rx="1.05" ry="1.3"/></g>
      <path d={`M200 ${h.cy+1} Q198 ${h.cy+8} 198 ${h.cy+10} Q200 ${h.cy+12} 203 ${h.cy+10}`} fill="none" stroke={ink} strokeWidth=".65"/>
      <path d={`M${200-r*.23} ${h.cy+18} Q198 ${h.cy+16} 200 ${h.cy+17} Q202 ${h.cy+16} ${200+r*.23} ${h.cy+18} Q200 ${h.cy+23} ${200-r*.23} ${h.cy+18} Z`} fill={blend(skin, '#9c5456', .38)} stroke={blend(skin, '#724042', .3)} strokeWidth=".4"/>
      {hair !== 'sin' && <path d={hairFront} fill={`url(#${id}-hair)`}/>}
    </>}
    {hair !== 'sin' && <g fill="none" stroke={hairLight} strokeWidth=".65" opacity=".6">
      {hair === 'largo' ? <path d={`M${200-r-1} ${h.cy-16} C${200-r-14} ${h.cy+29} ${200-r+1} ${top+17} ${200-r-9} ${top+44} M${200+r+1} ${h.cy-17} C${200+r+13} ${h.cy+26} ${200+r-1} ${top+10} ${200+r+8} ${top+43}`}/> : <path d={`M${200-r+4} ${h.cy-19} Q190 ${h.cy-h.ry-7} 208 ${h.cy-h.ry+1} M${200-r+10} ${h.cy-24} Q193 ${h.cy-h.ry-7} 215 ${h.cy-h.ry+6}`}/>}
    </g>}
  </g>;
}
