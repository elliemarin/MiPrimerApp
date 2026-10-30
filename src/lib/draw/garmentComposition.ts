import type { FlatSpec, FlatView } from '../../data/flats';
import { figureGeometry, type FigureAge, type FigureBody } from './figurine';
import { parseSvgPath } from './svgpath';
import { cmdsToSvg, type PathCmd } from './paths';

/** Some legacy reference drawings have no assembled sleeve/torso contract. */
export function supportsModelIllustration(spec: FlatSpec): boolean {
  return !spec.pants?.torso;
}

export interface GarmentSegment {
  transform: string;
  clip: 'all' | 'upper' | 'lower';
  splitY: number;
}

/** Illustration-only placement. These transforms never enter the pattern or PDF. */
export function garmentComposition(spec: FlatSpec, view: FlatView & { templateScale?: { sx: number; sy: number } }, body: FigureBody = 'recto', age: FigureAge = 'adulto') {
  const g = figureGeometry(body, age);
  const object = spec.family === 'bolso' || spec.family === 'accesorio';
  const lower = spec.family === 'pantalon' || spec.family === 'falda' || !!spec.pinafore;
  const fullBody = !!spec.pants?.torso || !!spec.pants?.bib || !!spec.pinafore || spec.family === 'vestido';
  const center = view.seams.center ?? (view.minX + view.width / 2);
  const widthFactor = body === 'amplio' ? 1.28 : body === 'curvas' ? 1.09 : body === 'petite' ? .92 : 1;
  const ageFactor = age === 'infantil' ? .82 : 1;
  // Retain the proportions of each cut: oversize silhouettes stay wider.
  const originalX = view.templateScale?.sx || 1, originalY = view.templateScale?.sy || 1;
  const sx = Math.min(.267 * widthFactor * ageFactor / (originalX * (spec.family==='bebe'?.42:1)), 350 / view.width);
  const upperScale = (g.waistY - g.top) / ((spec.pinafore ? 440 : spec.family === 'vestido' ? 400 : spec.pants?.torso ? 570 : 420) * originalY);
  const legHeight = g.ankle - g.waistY;
  const sy = spec.family === 'bebe' ? (g.crotch + 12 - g.top) / (330 * originalY) : lower ? legHeight / (1020 * originalY) : upperScale;
  const transform = (scaleX: number, scaleY: number, anchorY: number, sourceY: number, sourceCenter = center) =>
    `translate(${200 - sourceCenter * scaleX} ${anchorY - sourceY * scaleY}) scale(${scaleX} ${scaleY})`;
  let segments: GarmentSegment[];
  if (object) {
    const scale = Math.min(300 / view.width, 430 / view.height);
    segments = [{ transform: transform(scale, scale, 335, view.minY + view.height / 2, view.minX + view.width / 2), clip: 'all', splitY: 0 }];
  } else if (fullBody) {
    const splitY = spec.pinafore ? view.refY : spec.family === 'vestido' ? 400 * originalY : view.refY;
    // Join the two illustration segments exactly at the natural waist.
    segments = [
      { transform: transform(sx, upperScale, g.waistY, splitY), clip: 'upper', splitY },
      { transform: transform(sx, legHeight / (1020 * originalY), g.waistY, splitY), clip: 'lower', splitY }
    ];
  } else {
    const anchorY = lower ? g.waistY : g.top - 10;
    segments = [{ transform: transform(sx, sy, anchorY, view.refY), clip: 'all', splitY: 0 }];
  }
  return { object, lower, fullBody, segments };
}

/** A raised flat hood belongs to an unworn technical drawing. Show it folded
 * down on the croquis so it does not cover a face or create a floating ring. */
export function garmentIllustrationView<T extends FlatView & { templateScale?: { sx: number; sy: number } }>(view: T, spec: FlatSpec): T {
  const sx = view.templateScale?.sx || 1, sy = view.templateScale?.sy || 1;
  let projected = view;
  if (['haori','cardigan','bluson'].includes(spec.top?.style??'') && spec.top?.sleeve!=='sin') {
    const width = 300*(spec.top?.fit??1), arm=240;
    const ext = spec.top?.sleeve==='corta'?190:spec.top?.sleeve==='tres-cuartos'?330:450;
    const length = spec.top?.sleeve==='corta'?210:spec.top?.sleeve==='tres-cuartos'?450:620;
    const project = (value: {x:number;y:number}) => {
      const x=value.x/sx,y=value.y/sy,sign=x<0?-1:1,t=Math.max(0,Math.min(1,(Math.abs(x)-width)/ext));
      return {x:sign*(width+t*(145-y/arm*120))*sx,y:((1-t)*y+t*(length+(y-arm/2)*.15))*sy};
    };
    const warp = (d:string, map=project) => cmdsToSvg(parseSvgPath(d).map((cmd):PathCmd=>cmd.op==='Z'?cmd:cmd.op==='C'?{...cmd,p:map(cmd.p),c1:map(cmd.c1),c2:map(cmd.c2)}:{...cmd,p:map(cmd.p)}));
    projected = {...view,zones:view.zones.map(zone=>zone.type==='manga'?{...zone,d:warp(zone.d)}:zone),details:view.details.map(detail=>{
      const commands=parseSvgPath(detail.d),points=commands.flatMap(cmd=>cmd.op==='Z'?[]:[cmd.p]);
      return points.length&&points.every(point=>Math.abs(point.x)>=width*sx-.1)?{...detail,d:warp(detail.d)}:detail;
    })};
    const dropShoulder = (point:{x:number;y:number}) => {
      const x=point.x/sx,y=point.y/sy;
      const amount=y>=0&&y<arm?Math.max(0,Math.min(1,(Math.abs(x)-85)/(width-85)))*38*(1-y/arm):0;
      return {x:point.x,y:point.y+amount*sy};
    };
    projected={...projected,zones:projected.zones.map(zone=>({...zone,d:warp(zone.d,dropShoulder)})),details:projected.details.map(detail=>({...detail,d:warp(detail.d,dropShoulder)}))};
  }
  if (spec.top?.neck !== 'capucha' || !view.zones.some(zone=>zone.type==='capucha')) return projected;
  const path = view.key === 'espalda'
    ? 'M-120 20 Q-156 130 -95 230 Q0 300 95 230 Q156 130 120 20 Q0 73 -120 20 Z'
    : 'M-82 0 Q-133 18 -111 59 Q-55 138 0 97 Q55 138 111 59 Q133 18 82 0 Q64 0 0 85 Q-64 0 -82 0 Z';
  const scalePath = (value: string) => value.replace(/(-?\d+(?:\.\d+)?) (-?\d+(?:\.\d+)?)/g,(_,x,y)=>`${Number(x)*sx} ${Number(y)*sy}`);
  return { ...projected,
    zones: projected.zones.map(zone=>zone.type==='capucha'?{...zone,d:scalePath(path)}:zone),
    details: projected.details.filter(detail=> !detail.d.includes('C-70') && !detail.d.match(/M0 -\d/) && !detail.d.match(/^M-14 /)),
    dots: projected.dots.filter(dot=>!(Math.abs(dot.x)<=18*sx && dot.y<110*sy))
  };
}
