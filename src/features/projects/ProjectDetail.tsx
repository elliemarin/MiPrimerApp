import { useState } from 'react';
import { useApp } from '../../store/app';
import { Button, Chip, Confirm, Empty, IconButton, Notice, Sheet, TextInput } from '../../ui/components';
import { Icon } from '../../ui/Icon';
import { goBack, navigate } from '../../ui/router';
import { STATUS_LABEL, ProjectStatus, ORIGIN_LABEL } from '../../store/types';
import { projectAlerts } from './deps';
import { uid, nowIso } from '../../lib/ids';
import { OverviewTab } from './tabs/OverviewTab';
import { ReferencesTab } from './tabs/ReferencesTab';
import { MeasuresTab } from './tabs/MeasuresTab';
import { MaterialsTab } from './tabs/MaterialsTab';
import { CutoutsTab } from './tabs/CutoutsTab';
import { GuideTab } from './tabs/GuideTab';
import { VersionsTab } from './tabs/VersionsTab';
import { ExportsTab } from './tabs/ExportsTab';
import { NotesTab } from './tabs/NotesTab';
import { exportProjectZip } from '../../lib/zip';
import { saveBlob } from '../../lib/download';
import { slugify } from '../../lib/ids';
import { exportRecord, freezeDeps } from '../../store/exports';

const TABS = [
  ['resumen', 'Resumen'],
  ['referencias', 'Referencias'],
  ['medidas', 'Medidas'],
  ['telas', 'Telas y materiales'],
  ['despiece', 'Despiece'],
  ['guia', 'Guía'],
  ['versiones', 'Versiones'],
  ['exportaciones', 'Exportaciones'],
  ['notas', 'Avances']
] as const;

export function ProjectDetail({ id, tab }: { id: string; tab?: string }) {
  const project = useApp((s) => s.projects[id]);
  const profiles = useApp((s) => s.profiles);
  const updateProject = useApp((s) => s.updateProject);
  const put = useApp((s) => s.put);
  const remove = useApp((s) => s.remove);
  const toast = useApp((s) => s.toast);
  const collect = useApp((s) => s.collectGarbage);
  const addFile = useApp((s) => s.addFile);
  const [menu, setMenu] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [rename, setRename] = useState<string | null>(null);
  const [zipBusy, setZipBusy] = useState(false);
  if (!project) return <div className="page"><Empty icon="proyectos" title="Proyecto no encontrado" action={<Button onClick={() => navigate('/proyectos')}>Ver proyectos</Button>} /></div>;
  const current = (TABS.find(([k]) => k === tab)?.[0] ?? 'resumen') as (typeof TABS)[number][0];
  const alerts = projectAlerts(project, profiles);
  const setStatus = (s: ProjectStatus) => updateProject(id, (p) => ({ ...p, status: s }), `Estado: ${STATUS_LABEL[s]}.`);

  const doZip = async () => {
    setZipBusy(true);
    try {
      const { project: frozen, deps } = freezeDeps(project, profiles, { pattern: !!project.pattern, design: !!project.design });
      const blob = await exportProjectZip(frozen);
      const fileName = `${slugify(project.name)}-proyecto.zip`;
      const fileId = await addFile(blob, fileName);
      updateProject(id, () => ({ ...frozen, exports: [...frozen.exports, exportRecord('zip', fileId, fileName, { contenido: 'proyecto completo' }, deps)] }), 'Proyecto completo exportado en ZIP.');
      await saveBlob(blob, fileName);
      toast('ZIP listo. Ábrelo en otro dispositivo desde Proyectos → Importar ZIP.', 'ok');
    } catch (e) {
      toast(e instanceof Error ? e.message : 'No se pudo crear el ZIP.', 'error');
    } finally {
      setZipBusy(false);
      setMenu(false);
    }
  };

  const duplicate = () => {
    const copy = JSON.parse(JSON.stringify(project));
    copy.id = uid('proy');
    copy.name = `${project.name} (copia)`;
    copy.createdAt = copy.updatedAt = nowIso();
    copy.exports = [];
    copy.changeLog = [{ at: nowIso(), text: `Duplicado de «${project.name}».` }];
    put('project', copy);
    setMenu(false);
    navigate(`/proyectos/${copy.id}`);
  };

  return (
    <div className="page page-wide">
      <header className="page-head">
        <button className="back-link" onClick={() => goBack('/proyectos')}>
          <Icon name="back" size={20} /> Proyectos
        </button>
        <div className="title-row">
          <h1 className="page-title" style={{ fontSize: 'clamp(28px, 7vw, 42px)' }}>{project.name}</h1>
          <IconButton icon="mas" label="Acciones del proyecto" onClick={() => setMenu(true)} />
        </div>
        <p className="page-sub">
          {ORIGIN_LABEL[project.origin]}
          {project.archived && ' · Archivado'}
        </p>
      </header>

      <div className="scroll-x" role="group" aria-label="Estado del proyecto" style={{ marginBottom: 14 }}>
        {(Object.keys(STATUS_LABEL) as ProjectStatus[]).map((s, i) => (
          <button key={s} className="filter-chip" aria-pressed={project.status === s} onClick={() => setStatus(s)}>
            {i + 1}. {STATUS_LABEL[s]}
          </button>
        ))}
      </div>

      {alerts.length > 0 && (
        <div className="stack" style={{ marginBottom: 16, gap: 8 }}>
          {alerts.map((a) => (
            <Notice key={a.id} tone={a.level === 'error' ? 'err' : 'warn'}>
              {a.text}{' '}
              {a.action === 'actualizar-medidas' && <a href={`#/proyectos/${id}/medidas`}>Revisar medidas</a>}
              {a.action === 'ver-exportaciones' && <a href={`#/proyectos/${id}/exportaciones`}>Ver exportaciones</a>}
              {a.action === 'ver-versiones' && <a href={`#/proyectos/${id}/versiones`}>Ver versiones</a>}
              {a.action === 'abrir-patron' && <a href={`#/patronaje/${id}`}>Abrir patrón</a>}
            </Notice>
          ))}
        </div>
      )}

      <nav className="scroll-x" aria-label="Secciones del proyecto" style={{ marginBottom: 18, borderBottom: '1px solid var(--line)', paddingBottom: 10 }}>
        {TABS.map(([k, label]) => (
          <a key={k} className="filter-chip" aria-pressed={current === k} href={`#/proyectos/${id}/${k}`} style={{ display: 'inline-flex', alignItems: 'center', textDecoration: 'none' }}>
            {label}
          </a>
        ))}
      </nav>

      {current === 'resumen' && <OverviewTab project={project} onZip={() => void doZip()} zipBusy={zipBusy} />}
      {current === 'referencias' && <ReferencesTab project={project} />}
      {current === 'medidas' && <MeasuresTab project={project} />}
      {current === 'telas' && <MaterialsTab project={project} />}
      {current === 'despiece' && <CutoutsTab project={project} />}
      {current === 'guia' && <GuideTab project={project} />}
      {current === 'versiones' && <VersionsTab project={project} />}
      {current === 'exportaciones' && <ExportsTab project={project} />}
      {current === 'notas' && <NotesTab project={project} />}

      {menu && (
        <Sheet title="Proyecto" onClose={() => setMenu(false)}>
          <div className="group">
            <button className="list-row" onClick={() => { setRename(project.name); setMenu(false); }}><span className="lead"><Icon name="pencil" /></span><span className="grow t">Cambiar nombre</span></button>
            <button className="list-row" onClick={() => void useApp.getState().saveNow().then((ok) => toast(ok ? 'Guardado en este dispositivo.' : 'No se pudo guardar. Reintenta.', ok ? 'ok' : 'error'))}><span className="lead"><Icon name="save" /></span><span className="grow t">Guardar ahora</span></button>
            <button className="list-row" onClick={duplicate}><span className="lead"><Icon name="copy" /></span><span className="grow t">Duplicar proyecto</span></button>
            <button className="list-row" onClick={() => void doZip()} disabled={zipBusy}><span className="lead"><Icon name="zip" /></span><span className="grow"><span className="t" style={{ display: 'block' }}>Descargar proyecto completo (ZIP)</span><span className="s">Para respaldar o abrirlo en otro dispositivo</span></span></button>
            <button className="list-row" onClick={() => { updateProject(id, (p) => ({ ...p, archived: !p.archived }), p_archLabel(project.archived)); setMenu(false); }}><span className="lead"><Icon name="archive" /></span><span className="grow t">{project.archived ? 'Sacar del archivo' : 'Archivar'}</span></button>
            <button className="list-row" onClick={() => { setConfirmDelete(true); setMenu(false); }} style={{ color: 'var(--thread)' }}><span className="lead" style={{ color: 'var(--thread)' }}><Icon name="trash" /></span><span className="grow t">Eliminar proyecto</span></button>
          </div>
        </Sheet>
      )}
      {rename !== null && (
        <Sheet title="Nombre del proyecto" onClose={() => setRename(null)}>
          <div className="stack">
            <TextInput value={rename} onChange={setRename} autoFocus />
            <Button variant="primary" onClick={() => { updateProject(id, (p) => ({ ...p, name: rename.trim() || p.name }), 'Nombre cambiado.'); setRename(null); }}>Guardar nombre</Button>
          </div>
        </Sheet>
      )}
      {confirmDelete && (
        <Confirm
          title="¿Eliminar el proyecto?"
          body="Se borran sus referencias, diseños, patrones, versiones, exportaciones y fotos de avance de este dispositivo. Descarga el ZIP antes si quieres conservarlo."
          confirmLabel="Eliminar definitivamente"
          danger
          onClose={() => setConfirmDelete(false)}
          onConfirm={() => {
            remove('project', id);
            navigate('/proyectos');
            setTimeout(() => void useApp.getState().saveNow().then(() => collect()), 300);
            toast('Proyecto eliminado.');
          }}
        />
      )}
      <div style={{ marginTop: 30 }}>
        <Chip tone="off">Privado: guardado solo en este dispositivo{useApp.getState().settings.sync?.token ? ' y en tu repositorio privado' : ''}</Chip>
      </div>
    </div>
  );
}

function p_archLabel(archived: boolean) {
  return archived ? 'Proyecto sacado del archivo.' : 'Proyecto archivado.';
}
