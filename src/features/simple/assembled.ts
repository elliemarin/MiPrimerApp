import { buildFlat, type FlatView } from '../../data/flats';
import { findModel } from '../../data/catalog';
import type { Project } from '../../store/types';
import type { DesignElement, DesignView, Zone } from '../studio/model';
import { componentIdForElement } from '../customize/componentDesign';
import { cmdsBBox, cmdsToSvg, polylineCmds } from '../../lib/draw/paths';
import { parseSvgPath } from '../../lib/draw/svgpath';
import { cmdsToPolylines } from '../../lib/draw/flatten';
import { distToSegment, matApply, matInvert, matMul, pointInPolygon, segIntersect, type BBox, type Mat, type Pt } from '../../lib/geom/vec';
import { garmentIllustrationView } from '../../lib/draw/garmentComposition';
import { intersectPolygons } from '../../lib/geom/polyoffset';
import type { PatternComponent } from '../../lib/pattern/components';
import type { Piece } from '../../lib/pattern/types';
import { componentAtPoint, componentFits } from '../customize/placementDrag';
import { COSTUME_SURFACE_PIECES } from '../../data/costumeFlats';
import { KIDS_SURFACE_PIECES } from '../../data/kidsFlats';
import { STREET_SURFACE_PIECES } from '../../data/streetStyleFlats';
import { DRESS_STYLE_SURFACE_PIECES } from '../../data/dressStyleFlats';
import { BABY_STYLE_SURFACE_PIECES } from '../../data/babyStyleFlats';
import { basePanelPattern } from '../studio/panelWorkflow';

/** A reversible illustration projection. The original millimetre geometry is
 * always retained in `view`; this projection never alters cutting patterns. */
export interface AssemblySurface {
  id: string;
  label: string;
  viewId: string;
  pieceId?: string;
  zoneId: string;
  view: DesignView;
  primary: boolean;
  matrix: Mat;
  inverse: Mat;
  /** Clip contour in assembled scene coordinates. */
  path: string;
  /** Visible part of the physical piece, e.g. one face of a sleeve. */
  physicalBounds: BBox;
  /** The back of a continuous apron lies upside down in its cutting piece. */
  artworkFlipY?: boolean;
}

export interface AssemblyScene {
  id: string;
  label: string;
  view: DesignView;
  surfaces: AssemblySurface[];
}

const normalized = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
const pieceId = (v: DesignView) => v.source.type === 'pieza' ? v.source.pieceId : '';
const bounds = (path: string) => cmdsBBox(parseSvgPath(path));
const validBounds = (b: BBox) => [b.minX,b.minY,b.maxX,b.maxY].every(Number.isFinite) && b.maxX-b.minX > .01 && b.maxY-b.minY > .01;
export function assemblyPoint(surface: AssemblySurface, point: Pt): Pt { return matApply(surface.matrix, point); }
export function inverseAssemblyPoint(surface: AssemblySurface, point: Pt): Pt { return matApply(surface.inverse, point); }

/** A paired garment instance mirrors its base contour, not lettering, a camera
 * opening, or the inside arrangement of a coloured motif. Reflect the entire
 * artwork group once around its physical centre before the scene projection.
 * The same local reflection belongs in a guide printed on the canonical piece;
 * the independent embroidery/pocket pattern keeps its original orientation. */
export function assemblyArtworkReflection(surface:AssemblySurface,root:Pick<DesignElement,'x'> & Partial<Pick<DesignElement,'y'>>):Mat {
  if(surface.artworkFlipY) {
    const flipX=surface.matrix[0]<0;
    return [flipX?-1:1,0,0,-1,flipX?2*root.x:0,2*(root.y??0)];
  }
  return surface.matrix[0]*surface.matrix[3]-surface.matrix[1]*surface.matrix[2]<0?[-1,0,0,1,2*root.x,0]:[1,0,0,1,0,0];
}
export function assemblyArtworkMatrix(surface:AssemblySurface,root:Pick<DesignElement,'x'> & Partial<Pick<DesignElement,'y'>>):Mat {
  return matMul(surface.matrix,assemblyArtworkReflection(surface,root));
}

const KNOWN_OBJECTS: Record<string, Record<string,string>> = {
  'capa-semicircular': { delantero:'exterior', espalda:'exterior' },
  'corona-textil': { base:'exterior', reverso:'reverso' },
  'sombrero-mago': { copa:'cono', ala:'ala' },
  'orejas-diadema': { 'oreja-izquierda':'frente', 'oreja-derecha':'frente' }
};

function score(view: DesignView, zone: Zone, back: boolean): number {
  const id=normalized(pieceId(view)), text=`${id} ${normalized(view.label)}`;
  if (id === zone.id || zone.id.startsWith(`${id}--`)) return 200;
  if (/forro|refuerzo|entretela|vista-|ribete/.test(id)) return -1;
  const front=/delant|frente/.test(text), rear=/espalda|traser/.test(text);
  if (front && back || rear && !back) return -1;
  if (zone.type==='bolsillo') return -1;
  if (zone.type==='manga') return /manga/.test(text) ? 100 : -1;
  if (zone.type==='capucha') return /capucha/.test(text) ? 100 : -1;
  if (zone.type==='puno') return /puno/.test(text) ? 100 : -1;
  if (zone.type==='pretina') return /pretina|cintur|jareta/.test(text) ? 100 : -1;
  if (zone.type==='cuello') return /cuello|bies/.test(text) ? 100 : -1;
  if (zone.id.startsWith('tirante')) return /tirante/.test(text) ? 100 : -1;
  if (/asa|correa/.test(zone.id)) return /asa|correa/.test(text) ? 100 : -1;
  if (zone.id==='peto') return /peto/.test(text) ? 100 : -1;
  if (/falda/.test(zone.id)) return /falda/.test(text) ? 100 : -1;
  if (zone.type==='pierna') return /pierna|delanter|traser/.test(text) ? 80 : -1;
  if (zone.type==='delantero' || zone.type==='espalda') return (back?rear:front) && !/falda|peto/.test(text) ? 80 : /exterior|principal|cuerpo/.test(text) ? 60 : -1;
  if (zone.type==='base') return /exterior|cuerpo|delant|traser|espalda|principal|panel/.test(text) ? 60 : -1;
  return -1;
}

function projection(source: BBox, target: BBox, mirror: boolean, sideways: boolean, reverseY = false): Mat {
  const sw=source.maxX-source.minX, sh=source.maxY-source.minY;
  const tw=target.maxX-target.minX, th=target.maxY-target.minY;
  if (sideways) {
    const a=(mirror?-1:1)*tw/sh, b=th/sw;
    return [0,b,a,0,(mirror?target.maxX:target.minX)-a*source.minY,target.minY-b*source.minX];
  }
  const a=(mirror?-1:1)*tw/sw, d=(reverseY?-1:1)*th/sh;
  return [a,0,0,d,(mirror?target.maxX:target.minX)-a*source.minX,(reverseY?target.maxY:target.minY)-d*source.minY];
}

function physicalPath(view: DesignView): string { return view.outline ?? view.zones.map(z=>z.d).join(' '); }

function makeScene(project: Project, flat: FlatView, physical: DesignView[], apronShoulderY?: number): AssemblyScene {
  const back=flat.key==='espalda', label=back?'Espalda':'Frente', id=`armado-${flat.key}`;
  // Catalog pockets are reference details, never automatically sewn extras.
  const isStockPocket=(zone:Zone)=>zone.type==='bolsillo'&&!physical.some(view=>pieceId(view)===zone.id||zone.id.startsWith(`${pieceId(view)}--`));
  const zones=flat.zones.filter(zone=>!isStockPocket(zone)&&!(back&&project.pattern?.generatorId==='jumper-peto-falda'&&zone.id==='peto'));
  const stockPockets=flat.zones.filter(isStockPocket);
  const details=flat.details.filter(detail=>{
    const points=parseSvgPath(detail.d).flatMap(cmd=>cmd.op==='Z'?[]:[cmd.p]);
    return !points.length||!stockPockets.some(pocket=>points.every(point=>inside(pocket.d,point)));
  });
  const dots=flat.dots.filter(dot=>!stockPockets.some(pocket=>inside(pocket.d,dot)));
  const surfaces: AssemblySurface[]=[];
  const forced=KNOWN_OBJECTS[project.pattern?.generatorId??''];
  const costumeKey=project.pattern?.generatorId.replace(/^cosplay-/,'');
  const generatorId=project.pattern?.generatorId??'';
  const explicitBindings:{zoneId:string;pieceId:string;mirror:boolean;fold?:boolean}[]|undefined=
    STREET_SURFACE_PIECES[generatorId]?.[flat.key] ?? DRESS_STYLE_SURFACE_PIECES[generatorId]?.[flat.key] ?? BABY_STYLE_SURFACE_PIECES[generatorId]?.[flat.key] ??
    (costumeKey?COSTUME_SURFACE_PIECES[costumeKey]?.[flat.key]:undefined) ?? KIDS_SURFACE_PIECES[generatorId]?.[flat.key];
  const ranked=(zone:Zone)=>physical.map(view=>({view,score:score(view,zone,back)})).filter(x=>x.score>0).sort((a,b)=>b.score-a.score)[0]?.view;
  for(const zone of zones) {
    const physicalId=forced?.[zone.id];
    const explicit=explicitBindings?.find(binding=>binding.zoneId===zone.id);
    const view=explicit?physical.find(v=>pieceId(v)===explicit.pieceId):forced ? physical.find(v=>pieceId(v)===physicalId) : ranked(zone);
    // Integrated hems/casings inherit the physical body. They are not separate
    // editable placement surfaces, but remain visible construction details.
    if(!view && ['puno','cuello','pretina','canesu'].includes(zone.type)) continue;
    if(!view) continue;
    let source={...bounds(physicalPath(view))};
    const target=bounds(zone.d);
    const continuousApron=project.pattern?.generatorId==='delantal-pichi-infantil'&&pieceId(view)==='delantal'&&apronShoulderY!==undefined;
    if(continuousApron) {
      // A one-piece apron crosses the shoulders. Its front and back occupy
      // different Y ranges of the same cut piece; never map the entire piece
      // onto each side of the garment. Recompute X bounds after clipping too.
      if(back) source.maxY=apronShoulderY; else source.minY=apronShoulderY;
      const rect=[{x:source.minX,y:source.minY},{x:source.maxX,y:source.minY},{x:source.maxX,y:source.maxY},{x:source.minX,y:source.maxY}];
      const polygons=cmdsToPolylines(parseSvgPath(physicalPath(view)),.2).filter(poly=>poly.closed).map(poly=>poly.pts);
      const clipped=intersectPolygons(polygons,[rect]);
      if(!clipped.length) continue;
      source=bounds(clipped.map(poly=>cmdsToSvg(polylineCmds(poly,true))).join(' '));
    }
    const babyFront=generatorId==='body-bebe-broches'&&pieceId(view)==='delantero'
      || generatorId.startsWith('bebe-body-') && /^delantero(?:-|$)/.test(pieceId(view));
    const openPonchoFront=project.pattern?.generatorId==='poncho-rectangular'&&project.pattern.params.aperturaFrente==='si'&&pieceId(view)==='delantero';
    // The integrated placket folds inside and overlaps at physical CF x=0.
    // Decorative placements belong to the exposed body, not that hidden facing.
    if(babyFront) source.minX=Math.max(0,source.minX);
    if(!validBounds(source)||!validBounds(target)) continue;
    // All current sewn sleeve generators use X from shoulder to cuff. A short
    // sleeve can be wider than it is long, so aspect ratio alone is incorrect.
    const horizontalSleeve=generatorId.startsWith('bebe-') ? generatorId.startsWith('bebe-body-') : /sudadera|camisa|haori|bluson|body-bebe|chaleco|chaqueta|tunic|kimono|vestido-estilos-adulto|street-hoodie/.test(generatorId);
    const sideways=zone.type==='manga' && (horizontalSleeve || source.maxX-source.minX > (source.maxY-source.minY)*1.15);
    if(zone.type==='manga') {
      // A flat sleeve contains its front and back faces. Keep those physical
      // halves separate so a motif on the front cannot appear on the back.
      const physicalBack=generatorId==='bebe-babero-mangas' ? !back : back;
      if(sideways) { const mid=(source.minY+source.maxY)/2; if(physicalBack) source.minY=mid; else source.maxY=mid; }
      else { const mid=(source.minX+source.maxX)/2; if(physicalBack) source.minX=mid; else source.maxX=mid; }
    }
    const center=(target.minX+target.maxX)/2;
    const repeated=zones.filter(z=>z.type===zone.type).length>1;
    const mirror=explicit?.mirror??(repeated && center>0 && ['pierna','manga','delantero'].includes(zone.type));
    const matrix=projection(source,target,mirror,sideways,continuousApron&&back);
    const side=repeated && /manga|pierna/.test(zone.type) ? `${back ? center<0?'izquierda':'derecha' : center<0?'derecha':'izquierda'}` : '';
    const partLabel=side ? `${zone.type==='pierna'?'Pierna':'Manga'} ${side}` : zone.label;
    const surface={ id:`${id}/${zone.id}`,label:`${label} · ${partLabel}`,viewId:view.id,pieceId:pieceId(view),zoneId:zone.id,view,primary:!['manga','puno','cuello','capucha','pretina'].includes(zone.type),matrix,inverse:matInvert(matrix),path:zone.d,physicalBounds:source,...(continuousApron&&back?{artworkFlipY:true}:{}) };
    if(project.pattern?.generatorId==='falda-fruncida-elastica'&&/delantera|trasera/.test(pieceId(view))||(babyFront||openPonchoFront)&&!repeated||explicit?.fold) {
      // Each skirt pattern is HALF a panel cut on the centre fold. Unfold the
      // illustration into two distinct physical instances; do not double-scale
      // a pocket or silently duplicate it on the opposite half of the skirt.
      const mid=(target.minX+target.maxX)/2;
      for(const sign of [-1,1]) {
        const half={...target,minX:sign<0?target.minX:mid,maxX:sign<0?mid:target.maxX};
        const rect=[{x:half.minX,y:half.minY},{x:half.maxX,y:half.minY},{x:half.maxX,y:half.maxY},{x:half.minX,y:half.maxY}];
        const polys=cmdsToPolylines(parseSvgPath(zone.d),.3).filter(p=>p.closed).map(p=>p.pts);
        const path=intersectPolygons(polys,[rect]).map(poly=>cmdsToSvg(polylineCmds(poly,true))).join(' ');
        const m=projection(source,half,sign<0,false,continuousApron&&back), side=back?(sign<0?'izquierda':'derecha'):(sign<0?'derecha':'izquierda');
        surfaces.push({...surface,id:`${surface.id}/${side}`,label:`${label} · Mitad ${side}`,path,matrix:m,inverse:matInvert(m)});
      }
    } else surfaces.push(surface);
  }
  const b=bounds(zones.map(z=>z.d).join(' '));
  return {id,label,surfaces,view:{...flat,id,label,kind:back?'espalda':'frente',source:{type:'vacia'},zones,details,dots,outline:zones.map(z=>z.d).join(' '),minX:b.minX-30,minY:b.minY-30,width:b.maxX-b.minX+60,height:b.maxY-b.minY+60}};
}

/** Whole-garment previews, with reversible mappings to the actual piece views.
 * Front/back only: legacy side illustrations do not have reliable seam maps. */
export function buildAssembly(project: Project): AssemblyScene[] {
  const doc=project.design;
  if(!doc) return [];
  const physical=doc.views.filter(v=>v.source.type==='pieza'&&!v.source.pieceId.startsWith('componente-')&&!project.pattern?.hidden.includes(v.source.pieceId));
  if(!physical.length) return [];
  const model=findModel(project.modelId??'');
  let flats:FlatView[];
  if(model) {
    // Lateral pocket openings are strokes rather than zones in the old pants
    // illustration. Suppress them at source when no pocket construction exists.
    const spec=model.flat.pants?{...model.flat,pants:{...model.flat.pants,pockets:'ninguno' as const}}:model.flat;
    flats=buildFlat(model.id,spec).views.filter(v=>v.key==='frente'||v.key==='espalda').map(v=>garmentIllustrationView(v,spec));
  }
  else flats=doc.views.filter(v=>v.source.type==='plantilla'&&(v.kind==='frente'||v.kind==='espalda')).map(v=>({...v,key:v.kind as 'frente'|'espalda',details:v.details??[],dots:v.dots??[],seams:v.seams??{}}));
  // Read the actual shoulder construction line, including current measurements
  // and overrides, rather than deriving a split from a reference illustration.
  const apronShoulderY=project.pattern?.generatorId==='delantal-pichi-infantil'
    ? basePanelPattern(project)?.pieces.find(piece=>piece.id==='delantal')?.lines.find(line=>line.id==='hombro')?.a.y : undefined;
  const scenes=flats.map(flat=>makeScene(project,flat,physical,apronShoulderY)).filter(scene=>scene.surfaces.length);
  if(scenes.length) return scenes;
  // Unknown/custom objects still have an honest complete physical face rather
  // than fabricated clothing geometry. Keep this useful for imported projects.
  const view=physical.find(v=>!/forro|refuerzo|entretela/.test(pieceId(v)))??physical[0];
  const path=physicalPath(view), matrix:Mat=[1,0,0,1,0,0], id='armado-frente';
  return [{id,label:'Diseño',view:{...view,id,label:'Diseño'},surfaces:[{id:`${id}/${pieceId(view)}`,label:view.label,viewId:view.id,pieceId:pieceId(view),zoneId:view.zones[0]?.id??'',view,primary:true,path,matrix,inverse:matrix,physicalBounds:bounds(path)}]}];
}

function inside(path: string, point: Pt): boolean { return cmdsToPolylines(parseSvgPath(path),.6).some(poly=>poly.closed&&pointInPolygon(point,poly.pts)); }

/** Additional assembly constraint, independent of the engine's base-piece fit.
 * A pocket must fit its chosen face, not merely the entire unfolded sleeve. */
export function assemblyComponentFits(surface:AssemblySurface,component:PatternComponent):boolean {
  const placement=component.placement;
  if(!placement || placement.viewId!==surface.viewId || placement.pieceId&&placement.pieceId!==surface.pieceId) return false;
  const {x,y}=placement,w=component.width/2,h=component.height/2,b=surface.physicalBounds;
  const corners=[{x:x-w,y:y-h},{x:x+w,y:y-h},{x:x+w,y:y+h},{x:x-w,y:y+h}];
  if(corners.some(p=>p.x<b.minX-.01||p.x>b.maxX+.01||p.y<b.minY-.01||p.y>b.maxY+.01)) return false;
  const polygons=cmdsToPolylines(parseSvgPath(physicalPath(surface.view)),.2).filter(p=>p.closed).map(p=>p.pts);
  const contains=(p:Pt)=>polygons.some(poly=>poly.some((a,i)=>distToSegment(p,a,poly[(i+1)%poly.length])<.05))||polygons.filter(poly=>pointInPolygon(p,poly)).length%2===1;
  const fits=corners.every((a,i)=>{
    if(!contains(a)) return false;
    const next=corners[(i+1)%corners.length];
    const fractions=[0,1,...polygons.flatMap(poly=>poly.flatMap((p,j)=>{
      const hit=segIntersect(a,next,p,poly[(j+1)%poly.length]);return hit?[Math.max(0,Math.min(1,hit.t))]:[];
    }))].sort((u,v)=>u-v);
    return fractions.slice(1).every((t,j)=>{const mid=(t+fractions[j])/2;return contains({x:a.x+(next.x-a.x)*mid,y:a.y+(next.y-a.y)*mid});});
  });
  // The illustrative outline is not a cutting contour. Only ensure the centre
  // stays visibly on the garment; corner/seam validation uses physical geometry.
  return fits&&inside(surface.path,assemblyPoint(surface,{x,y}));
}

/** Search within the visible physical face without shrinking the chosen extra. */
export function firstFittingAssemblyPosition(component:PatternComponent,surface:AssemblySurface,pieces:Piece[],preferred?:Pt):PatternComponent|undefined {
  const b=surface.physicalBounds,center=preferred??{x:(b.minX+b.maxX)/2,y:(b.minY+b.maxY)/2};
  const fractions=[.5,.35,.65,.2,.8,.1,.9];
  const points=fractions.flatMap(fy=>fractions.map(fx=>({x:b.minX+(b.maxX-b.minX)*fx,y:b.minY+(b.maxY-b.minY)*fy})));
  points.sort((a,b)=>Math.hypot(a.x-center.x,a.y-center.y)-Math.hypot(b.x-center.x,b.y-center.y));
  for(const point of [center,...points]) {
    const placed=componentAtPoint(component,surface.view,point);
    placed.placement={...placed.placement!,assemblySurfaceId:surface.id,assemblySurfaceLabel:surface.label};
    if(assemblyComponentFits(surface,placed)&&componentFits(placed,surface.view,pieces)) return placed;
  }
}

/** Returns physical millimetres and rejects clicks outside the actual piece. */
export function assemblyHit(scene: AssemblyScene, point: Pt, preferredSurfaceId?: string): {surface:AssemblySurface;view:DesignView;point:Pt}|undefined {
  const surfaces=[...scene.surfaces].reverse();
  if(preferredSurfaceId) surfaces.sort((a,b)=>Number(b.id===preferredSurfaceId)-Number(a.id===preferredSurfaceId));
  for(const surface of surfaces) {
    if(!inside(surface.path,point)) continue;
    const local=inverseAssemblyPoint(surface,point), b=surface.physicalBounds;
    if(local.x<b.minX-.01||local.x>b.maxX+.01||local.y<b.minY-.01||local.y>b.maxY+.01||!inside(physicalPath(surface.view),local)) continue;
    return {surface,view:surface.view,point:local};
  }
}

/** Root metadata wins; old projects use one deterministic instance, never all
 * repeated sleeves/legs. Component metadata survives design reconciliation. */
export function assemblySurfaceForElement(scene:AssemblyScene,project:Project,element:DesignElement):AssemblySurface|undefined {
  const elements=project.design?.elements??[];
  let root=element; const visited=new Set<string>();
  while(root.parentId&&!visited.has(root.id)) {visited.add(root.id);const parent=elements.find(e=>e.id===root.parentId);if(!parent)break;root=parent;}
  const componentId=componentIdForElement(root.id)??componentIdForElement(element.id);
  const placement=componentId?project.pattern?.components?.find(c=>c.id===componentId)?.placement:undefined;
  const surfaceId=root.assemblySurfaceId??element.assemblySurfaceId??placement?.assemblySurfaceId;
  if(surfaceId) return scene.surfaces.find(s=>s.id===surfaceId&&s.viewId===element.viewId);
  const candidates=scene.surfaces.filter(s=>s.viewId===element.viewId);
  // Legacy objects on a sleeve face belong only to the face containing their
  // centre. Shared accessory faces without metadata are shown only at front.
  if(scene.id==='armado-espalda'&&candidates.some(s=>!/espalda|traser|manga/.test(s.pieceId??''))) return undefined;
  const containing=candidates.find(s=>root.x>=s.physicalBounds.minX&&root.x<=s.physicalBounds.maxX&&root.y>=s.physicalBounds.minY&&root.y<=s.physicalBounds.maxY);
  return containing??(candidates.some(s=>/manga/.test(s.pieceId??''))?undefined:candidates[0]);
}
