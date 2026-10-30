import { useState } from 'react';
import { useApp } from '../../../store/app';
import type { Project, VersionRecord } from '../../../store/types';
import { Button, Chip, Confirm, Empty, TextInput } from '../../../ui/components';
import { makeVersion, patternHash, designHash } from '../../../store/projects';
import { navigate } from '../../../ui/router';
import { uid } from '../../../lib/ids';

type Kind = 'pattern' | 'design';

export function VersionsTab({ project }: { project: Project }) {
  return (
    <div className="stack-lg" style={{ maxWidth: 820 }}>
      <VersionList project={project} kind="pattern" />
      <VersionList project={project} kind="design" />
      <p className="small muted">Las versiones de medidas viven en cada perfil (Medidas). Cada exportación registra la versión exacta de medidas, patrón y diseño que la generó.</p>
    </div>
  );
}

function VersionList({ project, kind }: { project: Project; kind: Kind }) {
  const updateProject = useApp((s) => s.updateProject);
  const [label, setLabel] = useState('');
  const [confirm, setConfirm] = useState<{ title: string; body: string; label: string; run: () => void; danger?: boolean } | null>(null);
  const list = (kind === 'pattern' ? project.patternVersions : project.designVersions) as VersionRecord<unknown>[];
  const current = kind === 'pattern' ? project.pattern : project.design;
  const curHash = kind === 'pattern' ? patternHash(project.pattern) : designHash(project.design);
  const key = kind === 'pattern' ? 'patternVersions' : 'designVersions';
  const title = kind === 'pattern' ? 'Versiones del patrón' : 'Versiones del diseño';
  if (!current) return null;
  const setList = (fn: (l: VersionRecord<unknown>[]) => VersionRecord<unknown>[], log: string) => updateProject(project.id, (p) => ({ ...p, [key]: fn(p[key] as VersionRecord<unknown>[]) }), log);
  const save = () => setList((l) => [...l, makeVersion(l, current, label.trim() || `Versión ${(l[l.length - 1]?.n ?? 0) + 1}`)], `${kind === 'pattern' ? 'Patrón' : 'Diseño'}: versión guardada.`);
  const restore = (v: VersionRecord<unknown>) => {
    const unsaved = !list.some((x) => x.hash === curHash);
    setConfirm({
      title: `¿Restaurar la versión ${v.n}?`,
      body: unsaved ? 'El estado actual no está guardado como versión: se guardará automáticamente antes de restaurar para que no se pierda.' : 'El estado actual ya está guardado en una versión.',
      label: 'Restaurar',
      run: () =>
        updateProject(
          project.id,
          (p) => {
            let versions = p[key] as VersionRecord<unknown>[];
            if (unsaved) versions = [...versions, makeVersion(versions, current, 'Antes de restaurar')];
            const data = JSON.parse(JSON.stringify(v.data));
            if (kind === 'design') data.id = data.id ?? uid('dis');
            return { ...p, [key]: versions, [kind === 'pattern' ? 'pattern' : 'design']: data };
          },
          `${kind === 'pattern' ? 'Patrón' : 'Diseño'}: restaurada la versión ${v.n}.`
        )
    });
  };
  const replace = (v: VersionRecord<unknown>) => {
    const apply = () => setList((l) => l.map((x) => (x.id === v.id ? { ...x, data: JSON.parse(JSON.stringify(current)), hash: curHash, createdAt: new Date().toISOString() } : x)), `${kind === 'pattern' ? 'Patrón' : 'Diseño'}: versión ${v.n} reemplazada.`);
    setConfirm({
      title: v.approved ? `La versión ${v.n} está aprobada` : `¿Reemplazar la versión ${v.n}?`,
      body: v.approved ? 'Reemplazarla cambia lo que se aprobó y deja desactualizadas las exportaciones que la usan. Te recomendamos guardar una versión nueva. ¿Reemplazar de todos modos?' : 'Se sobrescribe con el estado actual.',
      label: v.approved ? 'Reemplazar la aprobada' : 'Reemplazar',
      danger: v.approved,
      run: apply
    });
  };
  return (
    <section className="stack">
      <h2 className="section-title" style={{ margin: 0 }}>{title}</h2>
      {list.length === 0 ? (
        <Empty icon="history" title="Sin versiones guardadas" body="Guarda una versión para poder comparar, aprobar o volver a ella. Las exportaciones crean una automáticamente." />
      ) : (
        <div className="group">
          {[...list].reverse().map((v) => (
            <div key={v.id} className="list-row" style={{ alignItems: 'flex-start', flexWrap: 'wrap' }}>
              <span className="lead"><strong>{v.n}</strong></span>
              <span className="grow" style={{ minWidth: 160 }}>
                <span className="t small" style={{ display: 'block' }}>{v.label}</span>
                <span className="s tiny">{new Date(v.createdAt).toLocaleString('es-MX')} · huella {v.hash}</span>
                <span className="row-wrap" style={{ marginTop: 4 }}>
                  {v.hash === curHash && <Chip tone="ok">Igual al actual</Chip>}
                  {v.approved && <Chip tone="ok" icon="check">Aprobada</Chip>}
                </span>
              </span>
              <span className="row-wrap">
                <Button size="sm" variant="ghost" onClick={() => setList((l) => l.map((x) => (x.id === v.id ? { ...x, approved: !x.approved } : x)), `Versión ${v.n} ${v.approved ? 'desaprobada' : 'aprobada'}.`)}>{v.approved ? 'Quitar aprobación' : 'Aprobar'}</Button>
                {v.hash !== curHash && <Button size="sm" variant="ghost" onClick={() => restore(v)}>Restaurar</Button>}
                {v.hash !== curHash && <Button size="sm" variant="ghost" onClick={() => replace(v)}>Reemplazar</Button>}
                {kind === 'pattern' && <Button size="sm" variant="ghost" onClick={() => { updateProject(project.id, (p) => ({ ...p, pattern: p.pattern ? { ...p.pattern, overlays: [...(p.pattern.overlays ?? []), { id: uid('sup'), type: 'version', versionId: v.id, label: `Versión ${v.n}` }] } : p.pattern })); navigate(`/patronaje/${project.id}`); }}>Comparar</Button>}
              </span>
            </div>
          ))}
        </div>
      )}
      <div className="row">
        <div className="grow">
          <TextInput value={label} onChange={setLabel} placeholder="Nombre de la versión" />
        </div>
        <Button variant="primary" onClick={save} disabled={list.some((x) => x.hash === curHash)}>Guardar versión</Button>
      </div>
      {confirm && <Confirm title={confirm.title} body={confirm.body} confirmLabel={confirm.label} danger={confirm.danger} onConfirm={confirm.run} onClose={() => setConfirm(null)} />}
    </section>
  );
}
