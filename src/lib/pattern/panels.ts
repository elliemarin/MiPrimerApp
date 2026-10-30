import type { Pt } from '../geom/vec';
import { bboxOf, cross, dist, distToSegment, dot, lerp, norm, pointInPolygon, segIntersect, signedArea, sub } from '../geom/vec';
import { stableHash } from '../ids';
import { edgeLength, edgePolyline } from './outline';
import type { Issue, PEdge, Piece, SeamRelation, SeamSide } from './types';

/** A seam drawn in physical coordinates of an ORIGINAL, unpanelled piece. */
export interface PanelCut {
  id: string;
  pieceId: string;
  points: Pt[];
  allowance: number;
  baseHash: string;
}
export interface PanelizationResult {
  pieces: Piece[];
  seams: SeamRelation[];
  issues: Issue[];
  mapping: Record<string, string[]>;
}

/** Names/material labels are presentation, not sewing geometry. */
export function pieceGeometryHash(piece: Piece): string {
  return stableHash({ nodes: piece.nodes, edges: piece.edges, grain: piece.grain, cut: piece.cut, notches: piece.notches, lines: piece.lines, marks: piece.marks });
}

const EPS = 1e-6;
const BOUNDARY_TOL = 0.0001;
const FLAT_TOL = 0.03; // millimetres; shared boundary approximation for both sides
interface OuterMeta { kind: 'outer'; edge: PEdge; start: number; end: number }
interface JoinMeta { kind: 'join'; cutId: string; allowance: number; start: number; end: number }
type Meta = OuterMeta | JoinMeta;
interface Segment { a: Pt; b: Pt; meta: Meta }
interface Ring { segments: Segment[]; lineage: string }
const coords = (ring: Ring) => ring.segments.map(s => s.a);
const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value));
const error = (code: string, message: string, pieceId?: string): Issue => ({ level: 'error', code: `panel-${code}`, message, pieceId });

function nearBoundary(p: Pt, ring: Ring): boolean {
  return ring.segments.some(s => distToSegment(p, s.a, s.b) < BOUNDARY_TOL);
}
function inside(p: Pt, ring: Ring): boolean { return !nearBoundary(p, ring) && pointInPolygon(p, coords(ring)); }
function fraction(p: Pt, a: Pt, b: Pt): number {
  const d = sub(b,a), l2 = dot(d,d);
  return l2 ? Math.max(0, Math.min(1, dot(sub(p,a), d) / l2)) : 0;
}
function fragment(segment: Segment, t0: number, t1: number): Segment {
  const m = segment.meta;
  return { a: lerp(segment.a,segment.b,t0), b: lerp(segment.a,segment.b,t1), meta: { ...m, start: m.start+(m.end-m.start)*t0, end:m.start+(m.end-m.start)*t1 } };
}
function reverse(segments: Segment[]): Segment[] {
  return segments.slice().reverse().map(s=>({a:s.b,b:s.a,meta:{...s.meta,start:s.meta.end,end:s.meta.start}}));
}
function originalRing(piece: Piece): Ring {
  const segments: Segment[]=[];
  for (const edge of piece.edges) {
    const points=edgePolyline(piece,edge,FLAT_TOL);
    const length=edgeLength(piece,edge);
    const chordLength=points.slice(1).reduce((total,p,i)=>total+dist(points[i],p),0);
    let acc=0;
    for(let i=1;i<points.length;i++) {
      const l=dist(points[i-1],points[i]);
      if(l>EPS)segments.push({a:points[i-1],b:points[i],meta:{kind:'outer',edge,start:acc/chordLength*length,end:(acc+l)/chordLength*length}});
      acc+=l;
    }
  }
  return {segments,lineage:'base'};
}

/** Split boundary edges at two known points, retaining physical source intervals. */
function insertBoundary(ring: Ring, points: Pt[]): Ring {
  const segments: Segment[]=[];
  for(const segment of ring.segments) {
    const params=[0,1,...points.filter(p=>distToSegment(p,segment.a,segment.b)<BOUNDARY_TOL).map(p=>fraction(p,segment.a,segment.b))].sort((a,b)=>a-b);
    for(let i=1;i<params.length;i++) if((params[i]-params[i-1])*dist(segment.a,segment.b)>EPS)segments.push(fragment(segment,params[i-1],params[i]));
  }
  return {...ring,segments};
}

/** Inside portions of a simple open polyline, in drawing order. Endpoints may be outside. */
function interiorRuns(ring: Ring, points: Pt[], cut: PanelCut): Segment[][] {
  const runs: Segment[][]=[];
  let current: Segment[]=[];
  let acc=0;
  const flush=()=>{if(current.length)runs.push(current);current=[];};
  for(let i=1;i<points.length;i++) {
    const a=points[i-1],b=points[i],length=dist(a,b);
    const params=[0,1];
    for(const edge of ring.segments) {
      const hit=segIntersect(a,b,edge.a,edge.b);
      if(hit)params.push(Math.max(0,Math.min(1,hit.t)));
      // A path running along an existing edge is ambiguous; never add phantom panels.
      if(Math.abs(cross(sub(b,a),sub(edge.b,edge.a)))<EPS*length && distToSegment(edge.a,a,b)<BOUNDARY_TOL && distToSegment(edge.b,a,b)<BOUNDARY_TOL) {
        if(dist(edge.a,edge.b)>EPS)throw new Error('El corte coincide con un borde existente. Sepáralo del borde.');
      }
    }
    params.sort((x,y)=>x-y);
    const unique=params.filter((t,k)=>!k||Math.abs(t-params[k-1])*length>EPS);
    for(let j=1;j<unique.length;j++) {
      const t0=unique[j-1],t1=unique[j];
      const start=lerp(a,b,t0),end=lerp(a,b,t1);
      if(inside(lerp(start,end,.5),ring)) {
        if(current.length&&dist(current[current.length-1].b,start)>BOUNDARY_TOL)flush();
        current.push({a:start,b:end,meta:{kind:'join',cutId:cut.id,allowance:cut.allowance,start:acc+t0*length,end:acc+t1*length}});
      } else flush();
    }
    acc+=length;
  }
  flush();
  return runs;
}
function simplePath(points: Pt[]): boolean {
  for(let i=1;i<points.length;i++)for(let j=i+2;j<points.length;j++) {
    if(segIntersect(points[i-1],points[i],points[j-1],points[j]))return false;
  }
  return true;
}
function splitRing(ring: Ring, path: Segment[], lineage: string): Ring[] | null {
  const a=path[0].a,b=path[path.length-1].b;
  if(dist(a,b)<.5||!nearBoundary(a,ring)||!nearBoundary(b,ring))return null;
  const inserted=insertBoundary(ring,[a,b]);
  const ia=inserted.segments.findIndex(s=>dist(s.a,a)<BOUNDARY_TOL);
  const ib=inserted.segments.findIndex(s=>dist(s.a,b)<BOUNDARY_TOL);
  if(ia<0||ib<0||ia===ib)return null;
  const boundary=(start:number,end:number)=>{
    const out:Segment[]=[];
    for(let i=start;i!==end;i=(i+1)%inserted.segments.length)out.push(inserted.segments[i]);
    return out;
  };
  const rings=[{segments:[...boundary(ia,ib),...reverse(path)],lineage:lineage+'a'},{segments:[...boundary(ib,ia),...path],lineage:lineage+'b'}];
  const originalArea=Math.abs(signedArea(coords(ring)));
  const areas=rings.map(r=>Math.abs(signedArea(coords(r))));
  if(areas.some(area=>area<1)||Math.abs(areas[0]+areas[1]-originalArea)>.02)return null;
  return rings;
}

/** Coalesce straight fragments and sub-millimetre samples without moving a seam. */
function cleanRing(ring: Ring): Ring {
  const same=(a:Meta,b:Meta)=>a.kind===b.kind && (a.kind==='outer'&&b.kind==='outer'?a.edge.id===b.edge.id:a.kind==='join'&&b.kind==='join'&&a.cutId===b.cutId);
  const segs=ring.segments.slice();
  let changed=true;
  while(changed&&segs.length>3) {
    changed=false;
    for(let i=0;i<segs.length;i++) {
      const j=(i+1)%segs.length,a=segs[i],b=segs[j];
      const tiny=Math.min(dist(a.a,a.b),dist(b.a,b.b))<.5;
      const deviation=distToSegment(a.b,a.a,b.b);
      if(same(a.meta,b.meta)&&Math.abs(a.meta.end-b.meta.start)<.001&&deviation<(tiny?FLAT_TOL:EPS)) {
        const merged={a:a.a,b:b.b,meta:{...a.meta,end:b.meta.end}};
        if(j===0){segs[i]=merged;segs.splice(0,1);}else segs.splice(i,2,merged);
        changed=true;break;
      }
    }
  }
  return {...ring,segments:segs};
}
function clipLine(a: Pt,b: Pt,ring: Ring): {a:Pt;b:Pt}[] {
  const params=[0,1];
  for(const edge of ring.segments){const hit=segIntersect(a,b,edge.a,edge.b);if(hit)params.push(hit.t);}
  params.sort((x,y)=>x-y);
  const result:{a:Pt;b:Pt}[]=[];
  for(let i=1;i<params.length;i++)if((params[i]-params[i-1])*dist(a,b)>EPS) {
    const start=lerp(a,b,params[i-1]),end=lerp(a,b,params[i]);
    if(pointInPolygon(lerp(start,end,.5),coords(ring))||nearBoundary(lerp(start,end,.5),ring))result.push({a:start,b:end});
  }
  return result;
}
function grainFor(source:Piece,ring:Ring):Piece['grain'] {
  const polygon=coords(ring),bounds=bboxOf(polygon);
  let center={x:(bounds.minX+bounds.maxX)/2,y:(bounds.minY+bounds.maxY)/2};
  if(!inside(center,ring)) {
    let candidate:Pt|undefined;
    for(let i=0;i<polygon.length;i++) {
      const a=polygon[i],b=polygon[(i+1)%polygon.length],c=polygon[(i+2)%polygon.length];
      const p={x:(a.x+b.x+c.x)/3,y:(a.y+b.y+c.y)/3};
      if(inside(p,ring)){candidate=p;break;}
    }
    if(candidate)center=candidate;
  }
  const dir=norm(sub(source.grain.b,source.grain.a));
  const reach=Math.hypot(bounds.maxX-bounds.minX,bounds.maxY-bounds.minY)+10;
  const intervals=clipLine({x:center.x-dir.x*reach,y:center.y-dir.y*reach},{x:center.x+dir.x*reach,y:center.y+dir.y*reach},ring).sort((a,b)=>dist(b.a,b.b)-dist(a.a,a.b));
  if(!intervals.length)return clone(source.grain);
  const interval=intervals[0];
  return {a:lerp(interval.a,interval.b,.15),b:lerp(interval.a,interval.b,.85)};
}

interface Panel { piece:Piece; ring:Ring; source:Piece }
function panelPiece(source:Piece,ring:Ring,index:number,cutLabels:Map<string,string>):Panel {
  const id=`${source.id}--panel-${stableHash(ring.lineage)}`;
  const piece:Piece={...clone(source),id,name:`${source.name} · panel ${index+1}`,source:'generada',
    nodes:ring.segments.map((s,i)=>({id:`n${i}`,x:s.a.x,y:s.a.y})),
    edges:ring.segments.map((s,i)=>({id:`e${i}`,label:s.meta.kind==='outer'?s.meta.edge.label:`Unión ${cutLabels.get(s.meta.cutId) ?? 'C'}`,from:`n${i}`,to:`n${(i+1)%ring.segments.length}`,kind:'line',allowance:s.meta.kind==='outer'?s.meta.edge.allowance:s.meta.allowance,finish:s.meta.kind==='outer'?s.meta.edge.finish:'costura'})),
    grain:grainFor(source,ring),notches:[],lines:[],marks:[],notes:[...(source.notes??[]),'Panel experimental desde el estudio. Curvas exteriores aproximadas a 0.03 mm; conserva orientación del hilo y orden de armado.'],panelSource:{pieceId:source.id,cutIds:[...new Set(ring.segments.flatMap(s=>s.meta.kind==='join'?[s.meta.cutId]:[]))]}};
  if(source.cut.onFold&&!ring.segments.some(s=>s.meta.kind==='outer'&&s.meta.edge.finish==='doblez'))piece.cut={...source.cut,qty:source.cut.qty*2,onFold:false,mirrorPairs:true};
  for(const original of source.notches)for(let i=0;i<ring.segments.length;i++) {
    const m=ring.segments[i].meta;
    if(m.kind!=='outer'||m.edge.id!==original.edgeId)continue;
    const lo=Math.min(m.start,m.end),hi=Math.max(m.start,m.end);
    if(original.s<lo-EPS||original.s>hi+EPS)continue;
    const f=(original.s-m.start)/(m.end-m.start);
    piece.notches.push({...clone(original),id:`${original.id}-${i}`,edgeId:piece.edges[i].id,s:Math.max(0,Math.min(1,f))*dist(ring.segments[i].a,ring.segments[i].b)});
  }
  for(const line of source.lines)clipLine(line.a,line.b,ring).forEach((segment,i)=>piece.lines.push({...clone(line),id:`${line.id}-${i}`,a:segment.a,b:segment.b}));
  piece.marks=source.marks.filter(mark=>pointInPolygon(mark.at,coords(ring))||nearBoundary(mark.at,ring)).map(clone);
  return {piece,ring,source};
}

function mappedSides(sides:SeamSide[],panels:Panel[],mapping:Record<string,string[]>):SeamSide[] {
  return sides.flatMap(side=>{
    if(!mapping[side.pieceId]||mapping[side.pieceId][0]===side.pieceId)return [clone(side)];
    return panels.filter(p=>p.source.id===side.pieceId).flatMap(p=>{
      const edgeIds=p.ring.segments.flatMap((segment,i)=>segment.meta.kind==='outer'&&side.edgeIds.includes(segment.meta.edge.id)?[p.piece.edges[i].id]:[]);
      return edgeIds.length?[{...side,pieceId:p.piece.id,edgeIds}]:[];
    });
  });
}

/** All-or-nothing subdivision. Geometry, margins and original pieces are never mutated. */
export function panelizePattern(pieces:Piece[],seams:SeamRelation[],cuts:PanelCut[]):PanelizationResult {
  const baseMapping=Object.fromEntries(pieces.map(p=>[p.id,[p.id]]));
  const fail=(issue:Issue):PanelizationResult=>({pieces:pieces.map(clone),seams:seams.map(clone),issues:[issue],mapping:baseMapping});
  if(!cuts.length)return {pieces:pieces.map(clone),seams:seams.map(clone),issues:[],mapping:baseMapping};
  const ids=new Set<string>();
  for(const cut of cuts) {
    const source=pieces.find(p=>p.id===cut.pieceId);
    if(!source)return fail(error('pieza-inexistente','El corte se refiere a una pieza que ya no existe. Revisa sus cortes.',cut.pieceId));
    if(!cut.id||ids.has(cut.id))return fail(error('id-duplicado','Cada corte necesita un identificador único.',cut.pieceId));
    ids.add(cut.id);
    if(cut.baseHash!==pieceGeometryHash(source))return fail(error('base-desactualizada','La pieza cambió de medidas o márgenes. Revisa y vuelve a trazar sus cortes antes de generar paneles.',cut.pieceId));
    if(!Number.isFinite(cut.allowance)||cut.allowance<0||cut.allowance>40)return fail(error('margen','El margen de unión debe estar entre 0 y 40 mm.',cut.pieceId));
    if(cut.points.length<2||cut.points.some(p=>!Number.isFinite(p.x+p.y))||!simplePath(cut.points))return fail(error('trayecto','El corte necesita un trayecto abierto sin cruces ni coordenadas inválidas.',cut.pieceId));
    if(cut.points.some((p,i)=>i>0&&dist(p,cut.points[i-1])<.5))return fail(error('tramo-corto','Separa los puntos del corte al menos 0.5 mm.',cut.pieceId));
  }
  const panels:Panel[]=[];
  const mapping:Record<string,string[]>={};
  let activeCut: PanelCut | undefined;
  try {
    for(const source of pieces) {
      const own=cuts.filter(c=>c.pieceId===source.id);
      if(!own.length){mapping[source.id]=[source.id];continue;}
      let rings=[originalRing(source)];
      for(const cut of own) {
        activeCut = cut;
        let splits=0;
        const next:Ring[]=[];
        for(const ring of rings) {
          const runs=interiorRuns(ring,cut.points,cut);
          let pending=[ring];
          for(let r=0;r<runs.length;r++) {
            const run=runs[r];
            if (run.slice(0,-1).some(segment => nearBoundary(segment.b,ring))) throw new Error('El corte toca el borde entre sus extremos. Evita tangencias o contacto con esquinas intermedias.');
            const target=pending.findIndex(candidate=>inside(lerp(run[0].a,run[0].b,.5),candidate));
            if(target<0)throw new Error('No se pudo ubicar el corte en sus paneles. Revisa cruces y contactos con bordes.');
            const split=splitRing(pending[target],run,`${pending[target].lineage}/${cut.id}/${r}`);
            if(!split)throw new Error('El corte debe entrar y salir del contorno sin dejar puntas interiores ni paneles diminutos.');
            pending.splice(target,1,...split);splits++;
          }
          next.push(...pending);
        }
        if(!splits)throw new Error('Este corte no divide ninguna pieza. Extiéndelo de borde a borde.');
        rings=next;
      }
      const cutLabels = new Map(own.map((cut,index)=>[cut.id,`C${index+1}`]));
      const sourcePanels=rings.map(cleanRing).map((ring,i)=>panelPiece(source,ring,i,cutLabels));
      if(sourcePanels.some(p=>p.ring.segments.some(s=>dist(s.a,s.b)<.5)))throw new Error('El corte deja un borde menor de 0.5 mm. Muévelo lejos de esa esquina.');
      const area=Math.abs(signedArea(coords(originalRing(source))));
      const resultArea=sourcePanels.reduce((sum,p)=>sum+Math.abs(signedArea(coords(p.ring))),0);
      if(Math.abs(area-resultArea)>.1)throw new Error('No se conserva la superficie de la pieza. Revisa el trayecto del corte.');
      mapping[source.id]=sourcePanels.map(p=>p.piece.id);
      panels.push(...sourcePanels);
    }
  } catch(e) {
    const label = activeCut ? `C${cuts.filter(c=>c.pieceId===activeCut!.pieceId).findIndex(c=>c.id===activeCut!.id)+1} · ${pieces.find(p=>p.id===activeCut!.pieceId)?.name ?? 'Pieza'}: ` : '';
    return fail(error('corte-invalido',label+(e instanceof Error?e.message:'No se pudieron generar paneles.'),activeCut?.pieceId));
  }
  const newSeams=seams.map(s=>({...clone(s),a:mappedSides(s.a,panels,mapping),b:mappedSides(s.b,panels,mapping)}));
  for(const cut of cuts) {
    const sides:{panel:Panel;edgeIndex:number;meta:JoinMeta}[]=[];
    for(const panel of panels.filter(p=>p.source.id===cut.pieceId))panel.ring.segments.forEach((segment,edgeIndex)=>{if(segment.meta.kind==='join'&&segment.meta.cutId===cut.id)sides.push({panel,edgeIndex,meta:segment.meta});});
    const positive=sides.filter(s=>s.meta.end>s.meta.start),negative=sides.filter(s=>s.meta.end<s.meta.start);
    const asSides=(items:typeof sides):SeamSide[]=>items.map(item=>({pieceId:item.panel.piece.id,edgeIds:[item.panel.piece.edges[item.edgeIndex].id]}));
    newSeams.push({id:`panel-union-${cut.pieceId}-${cut.id}`,label:`Unir paneles · ${pieces.find(p=>p.id===cut.pieceId)!.name} · C${cuts.filter(c=>c.pieceId===cut.pieceId).findIndex(c=>c.id===cut.id)+1}`,kind:'igual',a:asSides(positive),b:asSides(negative),ratioMin:1,ratioMax:1,tolerance:.1,note:'Une los piquetes correspondientes. Los márgenes se agregan una vez a cada lado de esta línea.'});
    const points=[...new Set(sides.flatMap(s=>[s.meta.start,s.meta.end]).map(s=>Math.round(s*1e6)/1e6))].sort((a,b)=>a-b);
    for(let i=1;i<points.length;i++) {
      if(points[i]-points[i-1]<1)continue;
      const pos=(points[i]+points[i-1])/2;
      const at=sides.filter(s=>pos>Math.min(s.meta.start,s.meta.end)+EPS&&pos<Math.max(s.meta.start,s.meta.end)-EPS);
      if(at.length!==2)continue;
      for(const side of at) {
        const edge=side.panel.piece.edges[side.edgeIndex],segment=side.panel.ring.segments[side.edgeIndex];
        side.panel.piece.notches.push({id:`union-${cut.id}-${i}`,edgeId:edge.id,s:(pos-side.meta.start)/(side.meta.end-side.meta.start)*dist(segment.a,segment.b),count:i%2?1:2,label:`C${cuts.filter(c=>c.pieceId===cut.pieceId).findIndex(c=>c.id===cut.id)+1}.${i}`});
      }
    }
  }
  const output=pieces.flatMap(p=>mapping[p.id][0]===p.id?[clone(p)]:panels.filter(panel=>panel.source.id===p.id).map(panel=>panel.piece));
  return {pieces:output,seams:newSeams,issues:[{level:'aviso',code:'panel-experimental',message:'Paneles experimentales: curvas aproximadas a 0.03 mm; imprime y prueba las uniones antes de cortar la tela definitiva.'}],mapping};
}
