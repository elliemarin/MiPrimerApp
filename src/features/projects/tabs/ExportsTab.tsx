import { useApp } from '../../../store/app';
import { EXPORT_KIND_LABEL, Project } from '../../../store/types';
import { Button, Chip, Empty } from '../../../ui/components';
import { exportOutdated } from '../deps';
import { getFile } from '../../../lib/db';
import { saveBlob, canShareFiles } from '../../../lib/download';

export function ExportsTab({ project }: { project: Project }) {
  const updateProject = useApp((s) => s.updateProject);
  const toast = useApp((s) => s.toast);
  const list = [...project.exports].reverse();
  if (!list.length) return <Empty icon="download" title="Sin exportaciones" body="Los PDF de patrón, plantillas, fichas y ZIP que generes quedan aquí con las versiones que los produjeron." />;
  const open = async (fileId: string, name: string, share: boolean) => {
    const f = await getFile(fileId);
    if (!f) return toast('El archivo ya no está en este dispositivo.', 'error');
    await saveBlob(f.blob, name, share);
  };
  return (
    <div className="group" style={{ maxWidth: 900 }}>
      {list.map((e) => {
        const out = exportOutdated(e, project);
        return (
          <div key={e.id} className="list-row" style={{ alignItems: 'flex-start', flexWrap: 'wrap' }}>
            <span className="grow" style={{ minWidth: 200 }}>
              <span className="t small" style={{ display: 'block' }}>{EXPORT_KIND_LABEL[e.kind]}</span>
              <span className="s tiny">{e.fileName} · {new Date(e.createdAt).toLocaleString('es-MX')}</span>
              <span className="row-wrap" style={{ marginTop: 6 }}>
                {e.deps.measurement && <Chip>Medidas v{e.deps.measurement.n} · {e.deps.measurement.profileName}</Chip>}
                {e.deps.pattern && <Chip>Patrón v{e.deps.pattern.n}</Chip>}
                {e.deps.design && <Chip>Diseño v{e.deps.design.n}</Chip>}
                {out.length ? <Chip tone="warn" icon="warn">Desactualizada: cambió {out.join(', ')}</Chip> : <Chip tone="ok">Al día</Chip>}
              </span>
            </span>
            <span className="row-wrap">
              <Button size="sm" icon="download" onClick={() => void open(e.fileId, e.fileName, false)}>Descargar</Button>
              {canShareFiles() && <Button size="sm" icon="share" onClick={() => void open(e.fileId, e.fileName, true)}>Compartir</Button>}
              <Button size="sm" variant="ghost" onClick={() => updateProject(project.id, (p) => ({ ...p, exports: p.exports.filter((x) => x.id !== e.id) }), `Exportación eliminada: ${e.fileName}.`)}>Quitar</Button>
            </span>
          </div>
        );
      })}
    </div>
  );
}
