import { useMemo, useState } from 'react';
import { useApp } from '../../store/app';
import { Button, Chip, Empty, Notice, Sheet } from '../../ui/components';
import { navigate } from '../../ui/router';
import { buildSewingPackPdf, hasSewingBase, prepareSewingPack, type SewingPackCtx } from '../../lib/pdf/projectPack';
import { formatLength } from '../../lib/units';
import { slugify, stableHash } from '../../lib/ids';
import { makeVersion } from '../../store/projects';
import { exportRecord, freezeDeps } from '../../store/exports';
import { saveBlob } from '../../lib/download';

/** One explicit final step: review everything the physical project will need. */
export function SewingPackSheet({ projectId, onClose, onPrepareEditorial }: { projectId: string; onClose: () => void; onPrepareEditorial?: () => void }) {
  const project = useApp(state=>state.projects[projectId]);
  const profiles = useApp(state=>state.profiles);
  const fabrics = useApp(state=>state.fabrics);
  const materials = useApp(state=>state.materials);
  const settings = useApp(state=>state.settings);
  const [busy,setBusy] = useState(false);
  const [error,setError] = useState('');
  const hasBase=project?hasSewingBase(project):false;
  const ctx: SewingPackCtx = useMemo(()=>({profiles,fabrics,materials,unit:settings.unit,tile:{...settings.tile,footer:13},mode:hasBase?'complete':'intervention'}),[profiles,fabrics,materials,settings,hasBase]);
  const preview=useMemo(()=>project?prepareSewingPack(project,ctx):undefined,[project,ctx]);
  if(!project || !preview) return <Sheet title="PDF de confección" onClose={onClose}><Empty icon="proyectos" title="Proyecto no encontrado" /></Sheet>;

  const download=async()=>{
    setBusy(true);
    setError('');
    try {
      const app=useApp.getState();
      const current=app.projects[projectId];
      if(!current) throw new Error('El proyecto ya no está disponible.');
      const ready=prepareSewingPack(current,ctx);
      if(ready.blockers.length) throw new Error(ready.blockers.join('\n'));
      let resolved=ready.project;
      // Resolve pending cuts before freezing dependencies, preserving the previous pattern.
      if(current.pattern && stableHash(current.pattern)!==stableHash(resolved.pattern)) {
        const exists=current.patternVersions.some(version=>version.hash===stableHash(current.pattern));
        if(!exists) resolved={...resolved,patternVersions:[...current.patternVersions,makeVersion(current.patternVersions,current.pattern,'Antes del PDF de confección')]};
      }
      const {project:frozen,deps}=freezeDeps(resolved,app.profiles,{pattern:true,design:true});
      app.updateProject(projectId,()=>frozen);
      const result=await buildSewingPackPdf(frozen,{...ctx,deps});
      const filename=`${slugify(frozen.name)}-${hasBase?'confeccion-completa':'intervencion'}-p${deps.pattern?.n??0}-d${deps.design?.n??0}.pdf`;
      const blob=new Blob([result.bytes],{type:'application/pdf'});
      const fileId=await app.addFile(blob,filename);
      const record=exportRecord('pdf-confeccion',fileId,filename,{mode:ready.mode,pages:result.pageCount,manifest:result.manifest},deps);
      // Keep edits made while generating; this export always points to its frozen versions.
      app.updateProject(projectId,p=>({...p,exports:[...p.exports,record]}),`PDF de ${hasBase?'confección completa':'intervención'} exportado (${result.pageCount} páginas).`);
      await saveBlob(blob,filename);
      app.toast(`PDF listo: ${result.pageCount} páginas. Queda guardado en Exportaciones.`,'ok');
    } catch(cause) {
      setError(cause instanceof Error?cause.message:'No se pudo generar el PDF.');
    } finally {setBusy(false);}
  };
  const go=(path:string)=>{onClose();navigate(path);};
  const excluded=project.pattern && (project.pattern.hidden.length>0 || !!project.pattern.noExport?.length);
  const experimental=preview.warnings.some(warning=>/experimental/i.test(warning));
  return <Sheet title={hasBase?'Todo listo para coser':'PDF de la intervención'} wide onClose={onClose} footer={<div className="stack" style={{gap:8}}>
    <Button variant="primary" icon="pdf" block disabled={busy||preview.blockers.length>0} onClick={()=>void download()}>{busy?'Preparando tu PDF…':hasBase?'Descargar PDF completo':'Descargar PDF de intervención'}</Button>
    <p className="tiny muted" style={{margin:0}}>Un archivo PDF en hojas carta. Imprime las plantillas al 100 %, sin ajustar a la página.</p>
    {onPrepareEditorial&&<Button variant="ghost" disabled={busy} onClick={onPrepareEditorial}>Preparar lámina</Button>}
  </div>}>
    <div className="stack-lg">
      <div className="stack" style={{gap:6}}>
        <strong>{project.name}</strong>
        <p className="small muted" style={{margin:0}}>{hasBase?'Reúne tu diseño, los materiales, las instrucciones y todas las piezas para confeccionarlo.':'Prepara los complementos y dibujos que agregarás a una prenda existente. El patrón de la prenda base no está incluido.'}</p>
        <div className="row-wrap"><Chip>{preview.pieces.length} {preview.pieces.length===1?'plantilla':'plantillas'} de {hasBase?'confección':'complementos'}</Chip><Chip>{preview.cutouts.length} {preview.cutouts.length===1?'recorte':'recortes'}</Chip><Chip>{preview.embroideryCount} {preview.embroideryCount===1?'motivo':'motivos'} de bordado</Chip></div>
        {experimental&&<Notice tone="warn">Patrón experimental. Imprime y cose una muestra antes de cortar tu tela definitiva.</Notice>}
        {preview.warnings.filter(warning=>warning.startsWith('La base trazada manualmente')).map(warning=><Notice key={warning} tone="warn">{warning}</Notice>)}
      </div>
      {error&&<Notice tone="err">{error}</Notice>}
      {preview.blockers.length>0&&<section className="stack">
        <h3 className="section-title" style={{margin:0}}>Revisa antes de descargar</h3>
        {preview.blockers.map(message=><Notice key={message} tone="err">{message}</Notice>)}
        <div className="row-wrap">
          <Button size="sm" onClick={()=>go(`/personalizar/${projectId}`)}>Revisar complementos</Button>
          {hasBase&&<Button size="sm" onClick={()=>go(`/patronaje/${projectId}`)}>Revisar patrón</Button>}
          <Button size="sm" onClick={()=>go(`/${project.design?.simpleWorkflow?'acabados':'estudio'}/${projectId}`)}>{project.design?.simpleWorkflow?'Elegir materiales y bordados':'Revisar estudio'}</Button>
          {!hasBase&&<Button size="sm" onClick={()=>go('/biblioteca')}>Elegir una base con patrón</Button>}
        </div>
        {excluded&&<Button size="sm" onClick={()=>useApp.getState().updateProject(projectId,p=>p.pattern?{...p,pattern:{...p.pattern,hidden:[],noExport:[]}}:p,'Todas las piezas incluidas en el PDF completo.')}>Incluir todas las piezas del patrón</Button>}
      </section>}
      <section className="stack">
        <h3 className="section-title" style={{margin:0}}>Qué contiene tu PDF</h3>
        <div className="group">
          <div className="list-row"><div><strong className="small">Diseño, medidas y lista de materiales</strong><div className="tiny muted">Vistas, muestras de tela, cantidades orientativas y medidas de cada pieza.</div></div></div>
          <div className="list-row"><div><strong className="small">Instrucciones para armarlo</strong><div className="tiny muted">Piezas identificadas, orden de montaje y casillas para seguir el proceso.</div></div></div>
          {preview.drawings.map(drawing=><div className="list-row" key={drawing.id}><div><strong className="small">{drawing.title} · {drawing.count}</strong><div className="tiny muted">{drawing.note}</div></div></div>)}
        </div>
      </section>
      {preview.pieces.length>0&&<details className="panel panel-pad small">
        <summary>Ver todas las piezas y sus medidas</summary>
        <div className="group" style={{marginTop:10}}>{preview.pieces.map(piece=><div className="list-row" key={piece.id}><div><span className="t small">{piece.name}</span><span className="s tiny">{piece.qty} {piece.onFold?'al doblez':'por cortar'} · sin margen {formatLength(piece.wMm,settings.unit)} × {formatLength(piece.hMm,settings.unit)} · corte {formatLength(piece.cutWMm,settings.unit)} × {formatLength(piece.cutHMm,settings.unit)}</span></div></div>)}</div>
      </details>}
      {preview.warnings.length>0&&<details className="panel panel-pad small" open={preview.mode==='intervention'}><summary>Notas para confeccionar · {preview.warnings.length}</summary><div className="stack" style={{marginTop:10}}>{preview.warnings.map(warning=><p key={warning} style={{margin:0}}>{warning}</p>)}</div></details>}
      <Notice>Las plantillas son vectoriales y conservan sus medidas. El bordado se incluye como dibujo para transferir o digitalizar; no es un archivo de puntadas.</Notice>
    </div>
  </Sheet>;
}
