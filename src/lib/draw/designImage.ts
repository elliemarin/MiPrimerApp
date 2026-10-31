import type { DesignDoc, DesignElement } from '../../features/studio/model';
import { elementMatrix } from '../../features/studio/model';
import { IDENTITY, matMul, type Mat } from '../geom/vec';
import type { DrawImage } from './drawable';

/** Physical placement including rotation, flips and optional sewn-copy reflection. */
export function elementImage(element: DesignElement, outer: Mat = IDENTITY): DrawImage | undefined {
  if(element.kind!=='imagen'||!element.image?.fileId) return;
  return {fileId:element.image.fileId,name:element.name,
    matrix:matMul(outer,matMul(elementMatrix(element),[element.w,0,0,element.h,-element.w/2,-element.h/2]))};
}

/** A hidden parent also hides its logo; guard malformed cyclic imported groups. */
export function visibleDesignElement(element:DesignElement,doc:DesignDoc):boolean {
  const visited=new Set<string>();
  let current:DesignElement|undefined=element;
  while(current) {
    if(current.hidden||visited.has(current.id))return false;
    visited.add(current.id);
    current=current.parentId?doc.elements.find(candidate=>candidate.id===current!.parentId):undefined;
  }
  return true;
}
