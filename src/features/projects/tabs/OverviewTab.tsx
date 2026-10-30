import { useMemo, useState } from 'react';
import { useApp } from '../../../store/app';
import type { Project } from '../../../store/types';
import { Button, Chip } from '../../../ui/components';
import { Icon } from '../../../ui/Icon';
import { buildPattern } from '../../../lib/pattern/engine';
import { findModel } from '../../../data/catalog';
import { FlatArt } from '../../../ui/FlatArt';
import { buildSummaryPdf } from '../../../lib/pdf/summary';
import { saveBlob } from '../../../lib/download';
import { slugify } from '../../../lib/ids';
import { exportRecord, freezeDeps } from '../../../store/exports';

export function OverviewTab({ project, onZip, zipBusy }: { project: Project; onZip: () => void; zipBusy: boolean }) {
  const s = useApp();
  const [busy, setBusy] = useState(false);
  const built = useMemo(() => (project.pattern ? buildPattern(project.pattern) : null), [project.pattern]);
  const model = project.modelId ? findModel(project.modelId) : undefined;
  const errors = built?.issues.filter((i) => i.level === 'error').length ?? 0;
  const els = project.design?.elements.filter((e) => e.kind !== 'grupo').length ?? 0;
  const sheet = async () => {
    setBusy(true);
    try {
      const { project: frozen, deps } = freezeDeps(project, s.profiles, { pattern: !!project.pattern, design: !!project.design });
      const bytes = await buildSummaryPdf(frozen, { profiles: s.profiles, fabrics: s.fabrics, materials: s.materials, unit: s.settings.unit });
      const blob = new Blob([bytes], { type: 'application/pdf' });
      const fileName = `${slugify(project.name)}-ficha.pdf`;
      const fileId = await s.addFile(blob, fileName);
      s.updateProject(project.id, () => ({ ...frozen, exports: [...frozen.exports, exportRecord('pdf-resumen', fileId, fileName, {}, deps)] }), 'Ficha del proyecto exportada.');
      await saveBlob(blob, fileName);
    } catch (e) {
      s.toast(e instanceof Error ? e.message : 'No se pudo generar la ficha.', 'error');
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="stack-lg">
      <div style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))' }}>
        <a className="start-card" href={`#/personalizar/${project.id}`}>
          <span className="ic"><Icon name="plus" /></span>
          <span className="grow"><span className="t" style={{ display: 'block' }}>Personalizar la base</span><span className="s">Bolsillos, cierres, solapas y complementos para herramientas</span></span>
        </a>
        <a className="start-card" href={`#/patronaje/${project.id}`}>
          <span className="ic"><Icon name="patronaje" /></span>
          <span className="grow">
            <span className="t" style={{ display: 'block' }}>Patrón</span>
            <span className="s">{project.pattern ? `${built?.generator?.name ?? 'Patrón manual'} · ${built?.pieces.length ?? 0} piezas` : 'Sin patrón todavía'}</span>
            <span style={{ display: 'block', marginTop: 6 }}>{project.pattern && (errors ? <Chip tone="err">{errors} errores</Chip> : built?.missing.length ? <Chip tone="warn">Faltan medidas</Chip> : <Chip tone="ok">Verificado</Chip>)}</span>
          </span>
        </a>
        <a className="start-card" href={`#/estudio/${project.id}`}>
          <span className="ic"><Icon name="estudio" /></span>
          <span className="grow">
            <span className="t" style={{ display: 'block' }}>Estudio de diseño</span>
            <span className="s">{project.design ? `${project.design.views.length} vistas · ${els} elementos` : 'Elige una base para diseñar'}</span>
          </span>
        </a>
        <a className="start-card" href={`#/proyectos/${project.id}/despiece`}>
          <span className="ic"><Icon name="scissors" /></span>
          <span className="grow">
            <span className="t" style={{ display: 'block' }}>Despiece y plantillas</span>
            <span className="s">Recortes con tamaño final y margen, bases y bordado</span>
          </span>
        </a>
        <a className="start-card" href={`#/proyectos/${project.id}/guia`}>
          <span className="ic"><Icon name="check" /></span>
          <span className="grow">
            <span className="t" style={{ display: 'block' }}>Guía de confección</span>
            <span className="s">{Object.values(project.guide.checks).filter(Boolean).length} pasos completados</span>
          </span>
        </a>
      </div>
      {model && (
        <div className="panel panel-pad row" style={{ alignItems: 'center' }}>
          <div className="art-box" style={{ width: 84, height: 90, flex: 'none' }}>
            <FlatArt id={model.id} spec={model.flat} />
          </div>
          <div className="grow">
            <div className="small muted">Modelo</div>
            <a href={`#/biblioteca/${model.id}`} style={{ fontWeight: 600 }}>{model.name}</a>
          </div>
        </div>
      )}
      <div className="row-wrap">
        <a className="btn btn-primary" href={`#/confeccion/${project.id}`}><Icon name="pdf" />PDF de confección</a>
        <Button icon="pdf" onClick={() => void sheet()} disabled={busy}>{busy ? 'Generando…' : 'Ficha del proyecto (PDF)'}</Button>
        <Button icon="zip" onClick={onZip} disabled={zipBusy}>{zipBusy ? 'Preparando ZIP…' : 'Proyecto completo (ZIP)'}</Button>
      </div>
      <section>
        <h2 className="section-title">Registro de cambios</h2>
        <div className="group">
          {project.changeLog.slice(-10).reverse().map((c, i) => (
            <div key={i} className="list-row" style={{ minHeight: 44 }}>
              <span className="small grow">{c.text}</span>
              <span className="tiny faint" style={{ whiteSpace: 'nowrap' }}>{new Date(c.at).toLocaleString('es-MX', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
