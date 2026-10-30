import { useRef, useState } from 'react';
import type { Pt } from '../../lib/geom/vec';
import { useApp } from '../../store/app';
import { Fabric } from '../../store/types';
import { FABRIC_LIBRARY, recommendFabrics, searchLibraryFabric, swatchUrl } from '../../data/materialLibrary';
import { findModel } from '../../data/catalog';
import { addLibraryFabric } from '../../lib/fabricLibrary';
import { importFabricPhoto } from '../../lib/fabricPhoto';
import { newestFabrics, matchesOwnFabric } from '../../lib/fabricOrder';
import { saveFabricSamples } from '../../lib/fabricSave';
import { navigate } from '../../ui/router';
import { Button, FilePick, IconButton, TextInput, Thumb } from '../../ui/components';

export type FabricChoice = { source: 'propia' | 'catalogo'; id: string };
const pending = new Map<string, Promise<Fabric>>();
export async function resolveFabricChoice(choice: FabricChoice): Promise<Fabric> {
  if (choice.source === 'propia') {
    const fabric = useApp.getState().fabrics[choice.id];
    if (!fabric) throw new Error('Esta tela ya no está en tu biblioteca.');
    return fabric;
  }
  if (choice.source !== 'catalogo' || !FABRIC_LIBRARY.some(f=>f.id===choice.id)) throw new Error('Muestra desconocida.');
  // Reuse a previously chosen catalog sample; do not duplicate it on every tap.
  const key=`[biblioteca:${choice.id}]`;
  const existing=Object.values(useApp.getState().fabrics).find(f=>f.notes?.includes(key));
  if(existing) return existing;
  if(!pending.has(choice.id)) pending.set(choice.id,addLibraryFabric(choice.id).then(f=>{
    useApp.getState().updateFabric(f.id, prev=>({...prev, notes:`${prev.notes??''}\n${key}`}));
    return useApp.getState().fabrics[f.id];
  }).finally(()=>pending.delete(choice.id)));
  return pending.get(choice.id)!;
}

export function FabricTray({modelId,activeId,onChoose,onDrop,onClose,immediate=false}:{modelId?:string;activeId:string|null;onChoose:(id:string)=>void;onDrop:(choice:FabricChoice,point:Pt)=>void;onClose:()=>void;immediate?:boolean}) {
  const fabrics=useApp(s=>s.fabrics);
  const [q,setQ]=useState('');
  const [own,setOwn]=useState(()=>Object.keys(useApp.getState().fabrics).length>0);
  const [all,setAll]=useState(false);
  const suppressClick=useRef(false);
  const [busy,setBusy]=useState(false);
  const [ghost,setGhost]=useState<Pt|null>(null);
  const gesture=useRef<{choice:FabricChoice;start:Pt;moved:boolean}|null>(null);
  const recommendations=recommendFabrics(modelId?findModel(modelId):undefined);
  const list=q?FABRIC_LIBRARY.filter(f=>searchLibraryFabric(f,q)):!all&&recommendations.length?recommendations.map(r=>r.fabric):FABRIC_LIBRARY;
  const choose=async(choice:FabricChoice)=>{
    setBusy(true);
    try{const fabric=await resolveFabricChoice(choice);onChoose(fabric.id);await saveFabricSamples();}
    catch(e){useApp.getState().toast(e instanceof Error?e.message:'No se pudo cargar la tela.','error');}
    finally{setBusy(false);}
  };
  const addPhotos = async (files: File[]) => {
    if (busy) return;
    setBusy(true);
    let latest: Fabric | undefined;
    try {
      for (const file of files) latest = await importFabricPhoto(file);
    } catch (e) { useApp.getState().toast(e instanceof Error ? e.message : 'No se pudo importar la foto.', 'error'); }
    finally {
      if (latest) {
        setOwn(true); setQ(''); onChoose(latest.id);
        if(await saveFabricSamples())useApp.getState().toast(immediate?'Tela guardada al principio de Mis telas y aplicada a esta parte.':'Tela guardada al principio de Mis telas. Toca una parte para aplicarla.', 'ok');
      }
      setBusy(false);
    }
  };
  const active = activeId ? fabrics[activeId] : undefined;
  const attrs=(choice:FabricChoice)=>({
    draggable:true,
    onDragStart:(e:React.DragEvent)=>{e.dataTransfer.setData('application/x-hilvana-fabric',JSON.stringify(choice));e.dataTransfer.effectAllowed='copy';},
    onPointerDown:(e:React.PointerEvent)=>{
      if(e.pointerType==='mouse')return;
      e.stopPropagation();e.currentTarget.setPointerCapture(e.pointerId);
      gesture.current={choice,start:{x:e.clientX,y:e.clientY},moved:false};
    },
    onPointerMove:(e:React.PointerEvent)=>{
      const g=gesture.current;if(!g)return;
      if(Math.hypot(e.clientX-g.start.x,e.clientY-g.start.y)>9)g.moved=true;
      if(g.moved)setGhost({x:e.clientX,y:e.clientY});
    },
    onPointerUp:(e:React.PointerEvent)=>{
      const g=gesture.current;gesture.current=null;setGhost(null);
      if(g?.moved){suppressClick.current=true;setTimeout(()=>{suppressClick.current=false;},400);e.preventDefault();e.stopPropagation();onDrop(g.choice,{x:e.clientX,y:e.clientY});}
    },
    onPointerCancel:()=>{gesture.current=null;setGhost(null);},
    onClick:()=>{if(!busy&&!suppressClick.current)void choose(choice);}
  });
  return <section className="fabric-tray" aria-label="Telas para el estudio">
    <div className="row" style={{gap:8}}>
      <Button size="sm" variant={own?'primary':'ghost'} onClick={()=>setOwn(true)}>Mis telas</Button>
      <Button size="sm" variant={own?'ghost':'primary'} onClick={()=>setOwn(false)}>Catálogo</Button>
      <div className="grow"><TextInput value={q} onChange={setQ} placeholder="Buscar tela…" aria-label="Buscar tela para el estudio" /></div>
      <IconButton icon="close" label="Cerrar telas" onClick={onClose}/>
    </div>
    <div className="row-wrap" style={{gap:6,marginTop:6}}>
      <FilePick accept="image/*" capture onFiles={files=>void addPhotos(files)}>{open=><Button size="sm" icon="camera" disabled={busy} onClick={open}>Tomar foto</Button>}</FilePick>
      <FilePick accept="image/*" multiple onFiles={files=>void addPhotos(files)}>{open=><Button size="sm" icon="image" disabled={busy} onClick={open}>Elegir del carrete</Button>}</FilePick>
      {active?.photo && <Button size="sm" variant="ghost" onClick={()=>navigate(`/telas/${active.id}`)}>Recortar y calibrar</Button>}
    </div>
    <div className="fabric-swatches">
      {own?newestFabrics(fabrics).filter(f=>matchesOwnFabric(f,q)).map(f=><button key={f.id} className="fabric-swatch" aria-pressed={activeId===f.id} {...attrs({source:'propia',id:f.id})}>
        <div style={{background:f.color}}>{f.photo&&<Thumb fileId={f.photo.processedFileId??f.photo.originalFileId} alt="" />}</div><span>{f.name}</span>
      </button>):list.map(f=><button key={f.id} className="fabric-swatch" {...attrs({source:'catalogo',id:f.id})} title={recommendations.find(r=>r.fabric.id===f.id)?.reason}>
        <img src={swatchUrl(f)} alt="" draggable={false}/><span>{f.name}</span>
      </button>)}
      {own&&!Object.keys(fabrics).length&&<p className="small muted">Elige una muestra del catálogo o agrega una foto de tu tela.</p>}
      {own&&!!Object.keys(fabrics).length&&!newestFabrics(fabrics).some(f=>matchesOwnFabric(f,q))&&<p className="small muted">No hay telas con ese nombre. Prueba otra palabra.</p>}
      {!own&&!list.length&&<p className="small muted">No hay telas con ese nombre.</p>}
    </div>
    {!own&&recommendations.length>0&&<button className="tiny" onClick={()=>setAll(!all)} style={{background:'none',border:0,padding:'2px 0',color:'var(--mat)',textDecoration:'underline'}}>{all?'Ver sugeridas para el proyecto':`Ver las ${FABRIC_LIBRARY.length} telas`}</button>}
    <p className="tiny muted" role="status" style={{margin:0}}>{busy?'Preparando tela…':immediate?'Toca una tela para aplicarla. Tus fotos se guardan aquí, las nuevas primero.':own?'Tus telas, de la más nueva a la más antigua. Elige una y toca la parte que quieres vestir.':'Elige una tela sugerida o guarda una foto de la tuya. Las fotos sin calibrar son referencias visuales.'}</p>
    {ghost&&<div aria-hidden="true" style={{position:'fixed',left:ghost.x-22,top:ghost.y-22,width:44,height:44,borderRadius:6,background:'var(--mat)',border:'3px solid var(--tape)',pointerEvents:'none',zIndex:999}}/>}
  </section>;
}
