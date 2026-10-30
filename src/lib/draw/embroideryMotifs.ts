import { findEmbroideryMotif, type EmbroideryMotif } from '../../data/embroideryMotifs';
import { uid } from '../ids';
import { newElement, type DesignElement } from '../../features/studio/model';

export interface EmbroideryInsertion { elements:DesignElement[]; groupId:string; width:number; height:number }

/** Each color is an actual contour; the group is only the editing handle. */
export function createEmbroideryMotif(id:string,viewId:string,x:number,y:number,widthMm=70):EmbroideryInsertion {
  const drawing=findEmbroideryMotif(id);
  if(!drawing) throw new Error('No se encontró este bordado. Elige otro de la lista.');
  if(!Number.isFinite(widthMm)||widthMm<5||widthMm>1000||![x,y].every(Number.isFinite)) throw new Error('Revisa el tamaño y la posición del bordado.');
  return insertMotif(drawing,viewId,x,y,widthMm);
}

function insertMotif(drawing:EmbroideryMotif,viewId:string,x:number,y:number,width:number):EmbroideryInsertion {
  const groupId=uid('bordado'),height=width/drawing.aspect;
  const elements=drawing.parts.map((layer,index)=>newElement(viewId,{
    id:`${groupId}-color-${index+1}`,parentId:groupId,kind:'trazo',name:`${drawing.name} · ${layer.name??`color ${index+1}`}`,
    x,y,w:width,h:height,vectorPath:layer.d,
    fill:{type:'color',color:layer.color},stroke:null,technique:'bordado',edge:'na',allowance:0,backing:'desprendible'
  }));
  elements.push(newElement(viewId,{id:groupId,kind:'grupo',name:drawing.name,x,y,w:width,h:height,fill:{type:'ninguno'},stroke:null,technique:'bordado',
    embroidery:{kind:'motif',motifId:drawing.id}
  }));
  return {elements,groupId,width,height};
}
