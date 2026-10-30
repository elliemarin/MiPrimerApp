import { useState } from 'react';
import { useApp } from '../../../store/app';
import type { Project } from '../../../store/types';
import { Button, Empty, FilePick, Thumb } from '../../../ui/components';
import { uid, nowIso } from '../../../lib/ids';

export function NotesTab({ project }: { project: Project }) {
  const addFile = useApp((s) => s.addFile);
  const updateProject = useApp((s) => s.updateProject);
  const [text, setText] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);
  const save = () => {
    if (!text.trim() && !photos.length) return;
    updateProject(project.id, (p) => ({ ...p, notes: [...p.notes, { id: uid('nota'), createdAt: nowIso(), text: text.trim(), photoFileIds: photos }] }), 'Avance registrado.');
    setText('');
    setPhotos([]);
  };
  return (
    <div className="stack-lg" style={{ maxWidth: 760 }}>
      <div className="panel panel-pad stack">
        <textarea className="textarea" placeholder="¿Qué hiciste hoy? Ajustes de la muestra, cambios de tela, decisiones…" value={text} onChange={(e) => setText(e.target.value)} />
        {photos.length > 0 && (
          <div className="row-wrap">
            {photos.map((f) => <Thumb key={f} fileId={f} alt="Foto de avance" style={{ width: 76, height: 76 }} />)}
          </div>
        )}
        <div className="row-wrap">
          <FilePick accept="image/*" multiple onFiles={async (files) => { const ids: string[] = []; for (const f of files) ids.push(await addFile(f, f.name)); setPhotos([...photos, ...ids]); }}>
            {(open) => <Button icon="camera" onClick={open}>Agregar fotos</Button>}
          </FilePick>
          <Button variant="primary" onClick={save} disabled={!text.trim() && !photos.length}>Guardar avance</Button>
        </div>
      </div>
      {project.notes.length === 0 ? (
        <Empty icon="note" title="Sin avances todavía" body="Registra el proceso con notas y fotos: aparecen en la ficha del proyecto y en el ZIP." />
      ) : (
        <div className="stack">
          {[...project.notes].reverse().map((n) => (
            <article key={n.id} className="panel panel-pad stack" style={{ gap: 8 }}>
              <div className="spread">
                <span className="tiny faint">{new Date(n.createdAt).toLocaleString('es-MX', { dateStyle: 'medium', timeStyle: 'short' })}</span>
                <button className="tiny" style={{ border: 0, background: 'none', color: 'var(--thread)', cursor: 'pointer' }} onClick={() => updateProject(project.id, (p) => ({ ...p, notes: p.notes.filter((x) => x.id !== n.id) }))}>Eliminar</button>
              </div>
              {n.text && <p style={{ whiteSpace: 'pre-wrap' }}>{n.text}</p>}
              {n.photoFileIds.length > 0 && <div className="row-wrap">{n.photoFileIds.map((f) => <Thumb key={f} fileId={f} alt="Foto de avance" style={{ width: 120, height: 120 }} />)}</div>}
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
