import { useMemo, useState } from 'react';
import { useApp } from '../../store/app';
import { Button, Chip, Empty, FilePick, PageHead, Segmented } from '../../ui/components';
import { Icon } from '../../ui/Icon';
import { NewProjectSheet } from './NewProjectSheet';
import { STATUS_LABEL, Project, ProjectStatus } from '../../store/types';
import { findModel } from '../../data/catalog';
import { FlatArt } from '../../ui/FlatArt';
import { navigate } from '../../ui/router';
import { projectAlerts } from './deps';

export function ProjectsPage() {
  const projects = useApp((s) => s.projects);
  const profiles = useApp((s) => s.profiles);
  const [filter, setFilter] = useState<'activos' | 'archivados'>('activos');
  const [creating, setCreating] = useState(false);
  const toast = useApp((s) => s.toast);
  const list = useMemo(
    () =>
      Object.values(projects)
        .filter((p) => (filter === 'activos' ? !p.archived : p.archived))
        .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
    [projects, filter]
  );
  const total = Object.values(projects).filter((p) => !p.archived).length;

  return (
    <div className="page">
      <PageHead
        title="Proyectos"
        sub={total ? 'Todo tu trabajo guardado en este dispositivo: referencias, medidas, patrones, diseños y exportaciones.' : 'Diseña, patrona y confecciona. Empieza un proyecto desde un modelo, un patrón base, fotos o una prenda que quieras intervenir.'}
        actions={
          <Button variant="primary" icon="plus" onClick={() => navigate('/biblioteca')}>
            Nuevo
          </Button>
        }
      />
      {total > 0 && (
        <div className="spread" style={{ marginBottom: 14 }}>
          <Segmented value={filter} onChange={setFilter} options={[{ value: 'activos', label: 'Activos' }, { value: 'archivados', label: 'Archivados' }]} />
          <ImportZip onDone={(id) => (toast('Proyecto importado.', 'ok'), navigate(`/proyectos/${id}`))} />
        </div>
      )}
      {list.length === 0 ? (
        filter === 'archivados' ? (
          <Empty icon="archive" title="Sin proyectos archivados" body="Los proyectos que archives aparecerán aquí y podrás recuperarlos." />
        ) : (
          <FirstRun onNew={() => navigate('/biblioteca')} />
        )
      ) : (
        <div className="group">
          {list.map((p) => (
            <ProjectRow key={p.id} p={p} alerts={projectAlerts(p, profiles).length} />
          ))}
        </div>
      )}
      <details style={{marginTop:24}}><summary className="small muted">Otras formas de empezar</summary><Button variant="ghost" onClick={()=>setCreating(true)}>Importar fotos, bocetos o un patrón propio</Button></details>
      {creating && <NewProjectSheet onClose={() => setCreating(false)} />}
    </div>
  );
}

function ProjectRow({ p, alerts }: { p: Project; alerts: number }) {
  const model = p.modelId ? findModel(p.modelId) : undefined;
  const date = new Date(p.updatedAt).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' });
  return (
    <a className="list-row" href={p.design?.simpleWorkflow?`#/${Object.keys(p.design.materialChoices??{}).length?'acabados':'personalizar'}/${p.id}`:`#/proyectos/${p.id}`}>
      <span className="lead" style={{ background: 'var(--canvas)', width: 52, height: 52 }}>
        {model ? <FlatArt id={model.id} spec={model.flat} /> : <Icon name="proyectos" />}
      </span>
      <span className="grow">
        <span className="t" style={{ display: 'block' }}>{p.name}</span>
        <span className="s">
          {STATUS_LABEL[p.status as ProjectStatus]} · {date}
        </span>
      </span>
      {alerts > 0 && <Chip tone="warn" icon="warn">{alerts}</Chip>}
      <Icon name="chev" className="chev" />
    </a>
  );
}

function ImportZip({ onDone }: { onDone: (id: string) => void }) {
  const toast = useApp((s) => s.toast);
  return (
    <FilePick
      accept=".zip,application/zip"
      onFiles={async ([f]) => {
        try {
          const { importProjectZip } = await import('../../lib/zip');
          const id = await importProjectZip(f);
          onDone(id);
        } catch (e) {
          toast(e instanceof Error ? e.message : 'No se pudo importar el archivo.', 'error');
        }
      }}
    >
      {(open) => (
        <Button variant="ghost" icon="upload" size="sm" onClick={open}>
          Importar ZIP
        </Button>
      )}
    </FilePick>
  );
}

function FirstRun({ onNew }: { onNew: () => void }) {
  return (
    <div className="stack-lg">
      <div className="hero-strip">
        <a className="start-card" href="#/biblioteca">
          <span className="ic"><Icon name="biblioteca" /></span>
          <span>
            <span className="t" style={{ display: 'block' }}>Elige un modelo</span>
            <span className="s">Pantalones, faldas, bolsas y flujos de intervención listos para usar.</span>
          </span>
        </a>
        <a className="start-card" href="#/medidas">
          <span className="ic"><Icon name="medidas" /></span>
          <span>
            <span className="t" style={{ display: 'block' }}>Guarda unas medidas</span>
            <span className="s">Perfiles por persona con guía visual e historial de versiones.</span>
          </span>
        </a>
        <button className="start-card" onClick={onNew}>
          <span className="ic"><Icon name="scissors" /></span>
          <span>
            <span className="t" style={{ display: 'block' }}>Interviene una prenda</span>
            <span className="s">Fotos o plantillas, collage por zonas y recortes a escala real.</span>
          </span>
        </button>
      </div>
      <ImportZip onDone={(id) => navigate(`/proyectos/${id}`)} />
    </div>
  );
}
