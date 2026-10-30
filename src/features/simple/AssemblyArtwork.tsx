import { useId, type PointerEvent } from 'react';
import type { Fabric, Project } from '../../store/types';
import type { DesignElement } from '../studio/model';
import { elementCorners } from '../studio/model';
import { StudioDefs, ElementSvg, fillAttr } from '../studio/render';
import { componentIdForElement } from '../customize/componentDesign';
import { assemblyArtworkMatrix, assemblySurfaceForElement, type AssemblyScene, type AssemblySurface } from './assembled';
import { modelMaterials } from './modelMaterials';

export interface AssemblyArtworkProps {
  scene: AssemblyScene;
  project: Project;
  fabrics: Record<string,Fabric>;
  selectedId?: string|null;
  onElementPointerDown?: (event:PointerEvent<SVGGElement>,elementId:string,surface:AssemblySurface)=>void;
  onSurfacePointerDown?: (event:PointerEvent<SVGGElement>,surface:AssemblySurface)=>void;
}

function rootOf(elements:DesignElement[],element:DesignElement):DesignElement {
  const seen=new Set<string>();let root=element;
  while(root.parentId&&!seen.has(root.id)){seen.add(root.id);const parent=elements.find(e=>e.id===root.parentId);if(!parent)break;root=parent;}
  return root;
}

/** Shared garment rendering for intervention and finishing; all artwork is
 * drawn from the actual document, including photographed fabrics and panels. */
export function AssemblyArtwork({scene,project,fabrics,selectedId,onElementPointerDown,onSurfacePointerDown}:AssemblyArtworkProps) {
  const unique=useId().replace(/:/g,''),doc=project.design;
  if(!doc) return null;
  const inherited=modelMaterials(project,{...scene.view,key:scene.id==='armado-espalda'?'espalda':'frente',details:scene.view.details??[],dots:scene.view.dots??[],seams:scene.view.seams??{}}).fills;
  return <g data-assembly-view={scene.id}>
    <StudioDefs doc={doc} view={{...scene.view,zoneFills:inherited}} fabrics={fabrics} prefix={`${unique}-trim-`}/>
    <defs><linearGradient id={`${unique}-light`} x1="0" y1="0" x2="1" y2=".25"><stop offset="0" stopColor="#fff" stopOpacity=".14"/><stop offset=".5" stopColor="#fff" stopOpacity="0"/><stop offset="1" stopColor="#122d26" stopOpacity=".08"/></linearGradient>
      {scene.surfaces.map(surface=><clipPath id={`${unique}-${surface.id.replace(/[^\w-]/g,'-')}-clip`} key={surface.id}><path d={surface.path}/></clipPath>)}
    </defs>
    {scene.view.zones.map(zone=><path key={zone.id} d={zone.d} {...(inherited[zone.id]?fillAttr(inherited[zone.id],`${unique}-trim-zf-${zone.id}`):{fill:'#d5dfd4'})} stroke="#475951" strokeWidth="1.15" vectorEffect="non-scaling-stroke" pointerEvents="none"/>)}
    {scene.surfaces.map(surface=>{
      const prefix=`${unique}-${surface.id.replace(/[^\w-]/g,'-')}-`,view=surface.view;
      const base=view.zones.find(z=>view.zoneFills?.[z.id]&&view.zoneFills[z.id].type!=='ninguno');
      const elements=doc.elements.filter(el=>!el.hidden&&!rootOf(doc.elements,el).hidden&&el.viewId===view.id&&assemblySurfaceForElement(scene,project,el)?.id===surface.id);
      const roots=elements.filter(el=>!el.parentId||!elements.some(parent=>parent.id===el.parentId));
      return <g key={surface.id} data-assembly-surface={surface.id} onPointerDown={event=>onSurfacePointerDown?.(event,surface)} style={onSurfacePointerDown?{cursor:'pointer'}:undefined}>
        <StudioDefs doc={doc} view={view} fabrics={fabrics} prefix={prefix}/>
        <g clipPath={`url(#${prefix}clip)`}>
          <g transform={`matrix(${surface.matrix.join(' ')})`}>
            {/* Fill the whole projection first; actual panel contours overlay it. */}
            <rect x={surface.physicalBounds.minX} y={surface.physicalBounds.minY} width={surface.physicalBounds.maxX-surface.physicalBounds.minX} height={surface.physicalBounds.maxY-surface.physicalBounds.minY} {...(base?fillAttr(view.zoneFills![base.id],`${prefix}zf-${base.id}`):{fill:'#e5e9e3'})}/>
            {view.zones.map(zone=><path key={zone.id} d={zone.d} {...(view.zoneFills?.[zone.id]?fillAttr(view.zoneFills[zone.id],`${prefix}zf-${zone.id}`):{fill:'#e5e9e3'})} stroke={view.zones.length>1?'#617267':'none'} strokeWidth=".65" vectorEffect="non-scaling-stroke"/>)}
          </g>
          <path d={surface.path} fill={`url(#${unique}-light)`} pointerEvents="none"/>
        </g>
        <path d={surface.path} fill="transparent" stroke="#475951" strokeWidth="1.15" vectorEffect="non-scaling-stroke"/>
        <g>
          {roots.map(root=>{
            const children=elements.filter(el=>rootOf(elements,el).id===root.id);
            const selected=selectedId===root.id||selectedId===componentIdForElement(root.id)||children.some(child=>child.id===selectedId);
            return <g key={root.id} transform={`matrix(${assemblyArtworkMatrix(surface,root).join(' ')})`} data-assembly-element={root.id} onPointerDown={event=>{event.stopPropagation();onElementPointerDown?.(event,root.id,surface);}} style={{cursor:onElementPointerDown?'grab':undefined}}>
              {children.map(el=><g key={el.id} data-assembly-part={el.id}><ElementSvg el={el} doc={doc} fabrics={fabrics} mode="apariencia" prefix={prefix}/></g>)}
              {selected&&<polygon points={elementCorners(root).map(p=>`${p.x},${p.y}`).join(' ')} fill="none" stroke="#18785c" strokeWidth="2" strokeDasharray="5 3" vectorEffect="non-scaling-stroke" pointerEvents="none"/>}
            </g>;
          })}
        </g>
      </g>;
    })}
    <g pointerEvents="none">{scene.view.details?.map((detail,i)=><path key={i} d={detail.d} fill="none" stroke="#40574b" strokeOpacity=".5" strokeWidth={detail.style==='pliegue'?.65:.8} strokeDasharray={detail.style==='pespunte'?'3 3':undefined} vectorEffect="non-scaling-stroke"/>)}{scene.view.dots?.map((dot,i)=><circle key={i} cx={dot.x} cy={dot.y} r={dot.r} fill="#e9d5aa" stroke="#657366" strokeWidth=".7" vectorEffect="non-scaling-stroke"/>)}</g>
  </g>;
}
