import { useMemo, useState } from 'react';
import type { Project } from '../../store/types';
import type { PatternState } from '../../lib/pattern/engine';
import type { DesignDoc } from './model';
import { useApp } from '../../store/app';
import { Button, Chip, Notice, Sheet, Field, LengthInput } from '../../ui/components';
import { panelPatternFromDesign, preparePanelViews, syncPanelZones } from './panelWorkflow';

export function PanelPatternsSheet({ project,doc,onClose,onPrepared,onGenerated }: {project:Project;doc:DesignDoc;onClose:()=>void;onPrepared:(doc:DesignDoc,viewId:string)=>void;onGenerated:(pattern:PatternState)=>void}) {
  const fabrics=useApp(s=>s.fabrics);
  const [error,setError]=useState('');
  const preview=useMemo(()=>panelPatternFromDesign(project,doc,fabrics),[project,doc,fabrics]);
  const prepare=()=>{
    try {const result=preparePanelViews(project,doc);onPrepared(result.doc,result.viewId);onClose();}
    catch(e){setError(e instanceof Error?e.message:'No se pudieron preparar las piezas.');}
  };
  const remove=(id:string)=>{
    const cut=doc.panelCuts?.find(c=>c.id===id);if(!cut)return;
    let next:DesignDoc={...doc,panelCuts:(doc.panelCuts??[]).filter(c=>c.id!==id)};
    next=syncPanelZones(project,next,cut.viewId);
    onPrepared(next,cut.viewId);
  };
  const changeAllowance=(id:string,allowance:number|undefined)=>{
    if(allowance===undefined||allowance<1||allowance>30)return;
    const cut=doc.panelCuts?.find(c=>c.id===id);if(!cut)return;
    const next=syncPanelZones(project,{...doc,panelCuts:(doc.panelCuts??[]).map(c=>c.id===id?{...c,allowance}:c)},cut.viewId);
    onPrepared(next,cut.viewId);
  };
  const generate=()=>{
    if(!preview.pattern||preview.errors.length)return;
    try{onGenerated(preview.pattern);onClose();}
    catch(e){setError(e instanceof Error?e.message:'No se pudo guardar el patrón.');}
  };
  const prepared=doc.views.filter(v=>v.source.type==='pieza');
  return <Sheet title="Generar patrones del diseño" onClose={onClose} wide footer={preview.pattern&&!preview.errors.length?<Button variant="primary" block icon="patronaje" onClick={generate}>{preview.cutCount?'Generar patrones de paneles':'Restaurar patrón sin cortes'}</Button>:undefined}>
    <div className="stack-lg">
      <Notice>Divide piezas reales con cortes de un borde al otro para construir collage o patchwork. Cada panel conserva su contorno y recibe margen de unión, hilo y marcas para ensamblarlo.</Notice>
      <div className="row-wrap"><Chip tone="warn">Experimental · prueba una muestra</Chip><span className="small muted">Las piezas siguen en milímetros; no se escala una ilustración para inventar el patrón.</span></div>
      {error&&<Notice tone="err">{error}</Notice>}
      {!project.pattern?<Notice tone="warn">Este proyecto solo tiene dibujo o fotografía. Elige en Biblioteca un modelo con patrón de costura para dividir sus piezas. Los apliques y recortes decorativos se exportan desde Despiece. <a href={`#/proyectos/${project.id}/despiece`}>Abrir despiece</a> · <a href="#/biblioteca">Buscar un modelo con patrón</a></Notice>:<section className="stack">
        <h3 className="section-title" style={{margin:0}}>1. Preparar las piezas de costura</h3>
        <p className="small muted">Añade al estudio las piezas reales de tu patrón, conservando las vistas y dibujos que ya tienes. Si cambiaron las medidas, elimina o vuelve a trazar los cortes antiguos.</p>
        <Button icon="patronaje" onClick={prepare}>{prepared.length?'Actualizar o abrir piezas reales':'Preparar piezas reales'}</Button>
      </section>}
      <section className="stack">
        <h3 className="section-title" style={{margin:0}}>2. Dibujar cortes y elegir telas</h3>
        <p className="small muted">En una vista «Patrón real», usa Cortar paneles. En Recta, arrastra de un borde al otro. En Por puntos, marca dos o más puntos desde un borde hasta otro y pulsa Guardar corte. Puedes cruzar cortes anteriores para formar cuadros; después aplica una tela a cada panel.</p>
        {!(doc.panelCuts?.length)&&<p className="small muted">Aún no hay cortes trazados en el estudio.</p>}
        {!!doc.panelCuts?.length&&<div className="group">{doc.panelCuts.map((cut,index)=><div key={cut.id} className="list-row"><div className="grow"><span className="t small">Corte {index+1} · {doc.views.find(v=>v.id===cut.viewId)?.label??cut.pieceId}</span><span className="s tiny">Margen de unión: {cut.allowance/10} cm por cada lado</span></div><div style={{width:90,flexShrink:0}}><Field label="Margen"><LengthInput mm={cut.allowance} min={1} max={30} onChange={value=>changeAllowance(cut.id,value)} /></Field></div><Button size="sm" variant="ghost" onClick={()=>remove(cut.id)}>Quitar corte</Button></div>)}</div>}
      </section>
      <section className="stack">
        <h3 className="section-title" style={{margin:0}}>3. Generar y exportar</h3>
        {preview.errors.map((message,index)=><Notice key={`${index}-${message}`} tone="warn">{message}</Notice>)}
        {preview.pattern&&!preview.errors.length&&<>
          <Notice tone="ok">{preview.cutCount} cortes · {preview.baseCount} piezas base → {preview.panelCount} piezas finales. Se conservan las piezas que no has cortado.</Notice>
          <p className="small muted">Al generar se conserva una versión anterior recuperable. En Patronaje podrás revisar costuras, acomodar paneles y descargar PDF o SVG a escala real.</p>
          <div className="group">{preview.built?.pieces.map(piece=><div className="list-row" key={piece.id}><span className="small">{piece.name}</span></div>)}</div>
        </>}
      </section>
    </div>
  </Sheet>;
}
