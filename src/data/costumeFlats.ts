import type { FlatDef, FlatView } from './flats';
import type { ZoneType } from '../features/studio/model';
import { cmdsBBox } from '../lib/draw/paths';
import { parseSvgPath } from '../lib/draw/svgpath';
import { buildCostumeRecipe, costumeDisplayPath, COSTUME_RECIPES, type CostumeDisplayPart } from '../lib/pattern/generators/costumeExpansion';

export interface CostumeSurface { zoneId:string; pieceId:string; mirror:boolean; }
export const COSTUME_SURFACE_PIECES:Record<string,Record<string,CostumeSurface[]>>={};
const cache=new Map<string,FlatView[]>();
const typeOf=(id:string):ZoneType=>/bolsillo/.test(id)?'bolsillo':/cinturilla|faja/.test(id)?'pretina':/delantero/.test(id)?'delantero':/espalda/.test(id)?'espalda':'otra';

/** A complete front/reverse outline. Every surface points to a physical piece,
 * including namespaced pieces in sets and visible fabric reverses of soft props. */
export function buildCostumeFlat(id:string,key:string):FlatDef {
  const cached=cache.get(key);if(cached)return {id,views:cached};
  const recipe=COSTUME_RECIPES.find(recipe=>recipe.id===key);
  if(!recipe)return {id,views:[]};
  const built=buildCostumeRecipe(recipe),bindings:Record<string,CostumeSurface[]>={};
  const views:FlatView[]=(['front','back'] as const).map(side=>{
    const key=side==='front'?'frente':'espalda',parts=built[side],seen=new Map<string,number>();
    const zones=parts.map((part:CostumeDisplayPart)=>{
      const piece=built.result.pieces.find(piece=>piece.id===part.pieceId)!;
      const count=parts.filter(p=>p.pieceId===part.pieceId).length,instance=(seen.get(piece.id)??0)+1;seen.set(piece.id,instance);
      const zoneId=count>1?`${piece.id}--${instance}`:piece.id;
      (bindings[key]??=[]).push({zoneId,pieceId:piece.id,mirror:part.mirror??false});
      return {id:zoneId,label:piece.name.replace(': reverso',' · reverso')+(count>1?` · ${instance}`:''),type:typeOf(piece.id),d:costumeDisplayPath(piece,part)};
    });
    const boxes=zones.map(zone=>cmdsBBox(parseSvgPath(zone.d))),minX=Math.min(...boxes.map(b=>b.minX)),minY=Math.min(...boxes.map(b=>b.minY)),maxX=Math.max(...boxes.map(b=>b.maxX)),maxY=Math.max(...boxes.map(b=>b.maxY));
    return {key,zones,details:[],dots:[],minX:minX-20,minY:minY-20,width:maxX-minX+40,height:maxY-minY+40,refY:minY,refLabel:'Referencia de montaje · mm',seams:{center:(minX+maxX)/2}};
  });
  COSTUME_SURFACE_PIECES[key]=bindings;cache.set(key,views);return {id,views};
}
