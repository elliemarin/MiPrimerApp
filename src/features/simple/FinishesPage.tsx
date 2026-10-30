import { useEffect, useRef, useState } from 'react';
import { useApp } from '../../store/app';
import { designHash } from '../../store/projects';
import { Button, Empty, Field, IconButton, LengthInput, PageHead, Sheet } from '../../ui/components';
import { ProjectJourney } from '../../ui/ProjectJourney';
import { navigate } from '../../ui/router';
import { Icon } from '../../ui/Icon';
import { StudioDefs, ViewBase, ElementSvg } from '../studio/render';
import type { DesignDoc, DesignElement, Fill } from '../studio/model';
import { elementCorners } from '../studio/model';
import { editElement, removeElements, toLocal } from '../studio/ops';
import { reconcileComponentDesign } from '../customize/componentDesign';
import { pointInPreview } from '../customize/placementDrag';
import { applyMaterial, materialTargets, missingMaterials, physicalViewsNeedRefresh, prepareSimpleProject, simpleViews } from './workflow';
import { FabricTray } from '../studio/FabricTray';
import { EmbroideryPicker, type EmbroideryChoice } from './EmbroideryPicker';
import { createEmbroideryMotif } from '../../lib/draw/embroideryMotifs';
import { createLettering } from '../../lib/draw/lettering';
import { parseSvgPath } from '../../lib/draw/svgpath';
import { cmdsToPolylines } from '../../lib/draw/flatten';
import { pointInPolygon, distToSegment, type Pt } from '../../lib/geom/vec';
import './finishes.css';

const COLORS=['#F3E9D2','#18211D','#FFFFFF','#24584A','#B4273A','#DFAE29','#3366AA','#8A5D91','#C97B55','#849B79','#F6CADA','#757975'];
function rootOf(doc:DesignDoc,element:DesignElement):DesignElement { const parent=element.parentId?doc.elements.find(candidate=>candidate.id===element.parentId):undefined;return parent?rootOf(doc,parent):element; }

export function FinishesPage({projectId}:{projectId:string}) {
  const project=useApp(state=>state.projects[projectId]);
  const fabrics=useApp(state=>state.fabrics);
  const update=useApp(state=>state.updateProject);
  const [mode,setMode]=useState<'materiales'|'bordados'>('materiales');
  const [viewId,setViewId]=useState<string>();
  const [targetId,setTargetId]=useState<string>();
  const [palette,setPalette]=useState(false);
  const [fabricTray,setFabricTray]=useState(false);
  const [picker,setPicker]=useState(false);
  const [selected,setSelected]=useState<string>();
  const [live,setLive]=useState<DesignDoc>();
  const [past,setPast]=useState<DesignDoc[]>([]),[future,setFuture]=useState<DesignDoc[]>([]);
  const svg=useRef<SVGSVGElement>(null);
  const drag=useRef<{id:string;point:Pt;start:DesignElement;doc:DesignDoc;latest:DesignDoc}>();
  useEffect(()=>{if(project&&physicalViewsNeedRefresh(project)){try{update(projectId,current=>prepareSimpleProject(current));}catch{/* Pattern validation explains missing/invalid measurements. */}}},[project?.pattern,projectId,update]);
  if(!project?.design) return <div className="page"><Empty icon="estudio" title="Elige una base para empezar" action={<Button onClick={()=>navigate('/biblioteca')}>Elegir base</Button>}/></div>;
  const doc=live??project.design;
  const views=simpleViews(doc);
  const view=views.find(candidate=>candidate.id===viewId)??views[0];
  if(!view) return <div className="page"><Empty title="No hay vistas para trabajar" icon="estudio"/></div>;
  const targets=materialTargets(project),missing=missingMaterials(project);
  const target=targets.find(candidate=>candidate.id===targetId)??targets.find(candidate=>candidate.viewId===view.id);
  const artwork=doc.elements.filter(element=>element.viewId===view.id&&element.kind==='grupo'&&element.embroidery);
  const active=doc.elements.find(element=>element.id===selected&&element.embroidery);
  const commit=(next:DesignDoc)=>{setLive(undefined);if(designHash(next)===designHash(project.design))return;setPast(values=>[...values.slice(-59),project.design!]);setFuture([]);update(projectId,current=>reconcileComponentDesign({...current,design:next},fabrics));};
  const material=(fill:Fill,all=false)=>{const ids=all?targets.map(item=>item.id):target?[target.id]:[];if(!ids.length)return;setPast(values=>[...values.slice(-59),project.design!]);setFuture([]);update(projectId,current=>applyMaterial(current,ids,fill,fabrics));setPalette(false);setFabricTray(false);};
  const undo=()=>{const previous=past[past.length-1];if(!previous)return;setFuture(values=>[project.design!,...values]);setPast(values=>values.slice(0,-1));update(projectId,current=>reconcileComponentDesign({...current,design:previous},fabrics));if(missingMaterials({...project,design:previous}).length)setMode('materiales');setSelected(undefined);};
  const redo=()=>{const next=future[0];if(!next)return;setPast(values=>[...values,project.design!]);setFuture(values=>values.slice(1));update(projectId,current=>reconcileComponentDesign({...current,design:next},fabrics));setSelected(undefined);};
  const fits=(element:DesignElement)=>{
    const contour=view.outline??view.zones[0]?.d;
    if(!contour)return true;
    const polygons=cmdsToPolylines(parseSvgPath(contour),.2).map(poly=>poly.pts);
    return elementCorners(element).every(point=>polygons.some(poly=>pointInPolygon(point,poly)||poly.some((a,index)=>distToSegment(point,a,poly[(index+1)%poly.length])<.1)));
  };
  const insert=(choice:EmbroideryChoice)=>{
    try {
      const x=view.minX+view.width/2,y=view.minY+view.height*.5;
      const result=choice.kind==='motif'?createEmbroideryMotif(choice.id,view.id,x,y,choice.widthMm):createLettering(choice.text,choice.fontId,view.id,x,y,choice.heightMm,choice.color);
      const group=result.elements.find(element=>element.id===result.groupId)!;
      let placed:DesignDoc|undefined;
      for(const fy of [.5,.35,.65,.2,.8])for(const fx of [.5,.35,.65,.2,.8]){
        if(placed)continue;
        const candidate={...group,x:view.minX+view.width*fx,y:view.minY+view.height*fy};
        if(fits(candidate))placed=editElement({...doc,elements:[...doc.elements,...result.elements]},group.id,{x:candidate.x,y:candidate.y});
      }
      if(!placed)throw new Error('Este bordado no cabe en esta parte. Elige un tamaño menor o una vista más grande.');
      commit(placed);setSelected(result.groupId);setPicker(false);
    }catch(cause){useApp.getState().toast(cause instanceof Error?cause.message:'No se pudo agregar el bordado.','error');}
  };
  const hit=(point:Pt)=>{
    for(const element of [...doc.elements].reverse()) {
      if(element.viewId!==view.id||element.hidden||element.kind==='grupo')continue;
      const root=rootOf(doc,element);
      if(!root.embroidery)continue;
      const local=toLocal(element,point);
      if(Math.abs(local.x)<=element.w/2&&Math.abs(local.y)<=element.h/2)return root;
    }
  };
  const pointerDown=(event:React.PointerEvent<SVGSVGElement>)=>{
    if(mode!=='bordados'||event.button!==0)return;
    const point=pointInPreview(svg.current,event.clientX,event.clientY);if(!point)return;
    const element=hit(point);setSelected(element?.id);if(!element)return;
    event.preventDefault();event.currentTarget.setPointerCapture(event.pointerId);
    drag.current={id:element.id,point,start:element,doc,latest:doc};
  };
  const pointerMove=(event:React.PointerEvent<SVGSVGElement>)=>{const gesture=drag.current;if(!gesture)return;const point=pointInPreview(svg.current,event.clientX,event.clientY);if(!point)return;gesture.latest=editElement(gesture.doc,gesture.id,{x:gesture.start.x+point.x-gesture.point.x,y:gesture.start.y+point.y-gesture.point.y});setLive(gesture.latest);};
  const pointerUp=()=>{const gesture=drag.current;drag.current=undefined;setLive(undefined);if(!gesture)return;const element=gesture.latest.elements.find(candidate=>candidate.id===gesture.id)!;if(!fits(element)){useApp.getState().toast('Coloca el bordado dentro de la pieza.','error');return;}commit(gesture.latest);};
  return <div className="page page-wide finishes-page">
    <PageHead title="Telas y bordados" back={{label:'Volver a los extras',onClick:()=>navigate(`/personalizar/${projectId}`)}} sub={project.name}/>
    <ProjectJourney projectId={projectId} step="estudio"/>
    <div className="finishes-layout">
      <section className="finishes-preview">
        <div className="scroll-x" role="group" aria-label="Vista del diseño">{views.map(item=><button key={item.id} className="filter-chip" aria-pressed={view.id===item.id} onClick={()=>{setViewId(item.id);setSelected(undefined);}}>{item.label}</button>)}</div>
        <div className="finish-art"><svg ref={svg} viewBox={`${view.minX} ${view.minY} ${view.width} ${view.height}`} role="img" aria-label={`Diseño de ${view.label}`} onPointerDown={pointerDown} onPointerMove={pointerMove} onPointerUp={pointerUp} onPointerCancel={()=>{drag.current=undefined;setLive(undefined);}} style={{touchAction:mode==='bordados'?'none':'pan-y'}}>
          <StudioDefs doc={doc} view={view} prefix="finish-" fabrics={fabrics}/><ViewBase view={view} mode="apariencia" prefix="finish-" fabrics={fabrics}/>
          {doc.elements.filter(element=>element.viewId===view.id).map(element=><ElementSvg key={element.id} el={element} doc={doc} mode="apariencia" prefix="finish-" fabrics={fabrics}/>)}
          {active&&<polygon points={elementCorners(active).map(point=>`${point.x},${point.y}`).join(' ')} fill="none" stroke="#24584A" strokeWidth="1.5" vectorEffect="non-scaling-stroke" strokeDasharray="5 3" pointerEvents="none"/>}
        </svg></div>
        <p className="tiny muted">Vista 2D a escala de la pieza. Los extras y bordados se imprimen con sus coordenadas para colocarlos al coser.</p>
      </section>
      <div className="finishes-controls stack-lg">
        <div className="row-wrap" role="group" aria-label="Acabado"><button className="filter-chip" aria-pressed={mode==='materiales'} onClick={()=>setMode('materiales')}>Materiales</button><button className="filter-chip" aria-pressed={mode==='bordados'} disabled={missing.length>0} onClick={()=>setMode('bordados')}>Bordados</button></div>
        {mode==='materiales'?<>
          <div><h2 className="section-title">Viste cada parte</h2><p className="small muted">{missing.length?`Falta elegir color o tela en ${missing.length} partes.`:'Ya elegiste los materiales de todas las partes.'}</p></div>
          <div className="finish-material-list">{targets.map(item=><button key={item.id} onClick={()=>{setTargetId(item.id);setViewId(item.viewId);setPalette(true);}} aria-label={`Elegir color o tela: ${item.label}`}><span className="finish-swatch" style={{background:item.fill?.type==='color'?item.fill.color:item.fill?.type==='tela'?fabrics[item.fill.fabricId]?.color:undefined}}/>
            <span><strong>{item.label}</strong><span className="tiny muted">{missing.some(target=>target.id===item.id)?'Por elegir':item.fill?.type==='tela'?fabrics[item.fill.fabricId]?.name:'Color elegido'}</span></span><Icon name={missing.some(target=>target.id===item.id)?'plus':'check'}/></button>)}</div>
          <Button variant="primary" disabled={!!missing.length} onClick={()=>setMode('bordados')}>Continuar a bordados</Button>
        </>:<>
          <div><h2 className="section-title">Un detalle tuyo</h2><p className="small muted">Añade un bordado o letras, y arrástralos sobre la pieza. También puedes terminar sin bordado.</p></div>
          <Button variant="primary" icon="plus" onClick={()=>setPicker(true)}>Añadir bordado o letras</Button>
          <div className="row-wrap"><IconButton icon="undo" label="Deshacer" disabled={!past.length} onClick={undo}/><IconButton icon="redo" label="Rehacer" disabled={!future.length} onClick={redo}/></div>
          {artwork.length>0&&<div className="group">{artwork.map(element=><button key={element.id} className="list-row" aria-pressed={selected===element.id} onClick={()=>setSelected(element.id)}><span className="grow small">{element.name}</span><Icon name="move"/></button>)}</div>}
          {active&&<div className="panel panel-pad stack"><div className="spread"><strong>{active.name}</strong><IconButton icon="trash" label="Eliminar bordado seleccionado" onClick={()=>{commit(removeElements(doc,[active.id]));setSelected(undefined);}}/></div><Field label="Ancho del bordado" htmlFor="embroidery-width"><LengthInput id="embroidery-width" mm={active.w} min={5} max={view.width} onChange={width=>{if(!width)return;const next=editElement(doc,active.id,{w:width,h:active.h*width/active.w});const resized=next.elements.find(element=>element.id===active.id)!;if(fits(resized))commit(next);else useApp.getState().toast('Elige un tamaño que quepa en la pieza.','error');}}/></Field></div>}
        </>}
      </div>
    </div>
    <div className="finish-footer"><span className="tiny muted">{missing.length?`${missing.length} partes por elegir`:'Materiales completos'}</span><Button variant="primary" icon="pdf" disabled={!!missing.length} onClick={()=>navigate(`/confeccion/${projectId}`)}>Generar patrones</Button></div>
    {palette&&target&&<Sheet title={target.label} onClose={()=>setPalette(false)}><div className="stack-lg"><p className="small muted">Elige el color o la tela para esta parte.</p><div className="finish-colors">{COLORS.map(color=><button key={color} aria-label={`Color ${color}`} style={{background:color}} onClick={()=>material({type:'color',color})}/>)}</div><Field label="Otro color"><input type="color" aria-label="Otro color" value={target.fill?.type==='color'?target.fill.color:'#24584A'} onChange={event=>material({type:'color',color:event.target.value})}/></Field><Button icon="telas" onClick={()=>{setPalette(false);setFabricTray(true);}}>Elegir una tela o subir foto</Button><details><summary>Usar el mismo material en todo</summary><div className="stack" style={{marginTop:12}}><p className="small muted">Elige un color para todas las partes o aplica la tela/color actual.</p><div className="finish-colors">{COLORS.slice(0,6).map(color=><button key={color} aria-label={`Todas las partes ${color}`} style={{background:color}} onClick={()=>material({type:'color',color},true)}/>)}</div>{target.fill&&target.fill.type!=='ninguno'&&<Button onClick={()=>material(target.fill!,true)}>Usar en todas las partes</Button>}</div></details></div></Sheet>}
    {fabricTray&&<FabricTray immediate modelId={project.modelId} activeId={target?.fill?.type==='tela'?target.fill.fabricId:null} onChoose={id=>material({type:'tela',fabricId:id,rotation:0,offsetX:0,offsetY:0,scale:1})} onDrop={()=>{}} onClose={()=>setFabricTray(false)}/>}
    {picker&&<EmbroideryPicker onClose={()=>setPicker(false)} onPick={insert}/>}
  </div>;
}
