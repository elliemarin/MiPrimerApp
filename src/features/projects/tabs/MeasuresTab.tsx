import { useMemo } from 'react';
import { useApp } from '../../../store/app';
import type { Project } from '../../../store/types';
import { Button, Field, Notice, Segmented, Select } from '../../../ui/components';
import { buildPattern } from '../../../lib/pattern/engine';
import { FIT_LABEL, Fit } from '../../../lib/pattern/generator';
import { formatLength } from '../../../lib/units';
import { KIND_LABEL } from '../../../lib/sizes/tables';
import { MEASURE_BY_KEY } from '../../../lib/sizes/measurements';

export function MeasuresTab({ project }: { project: Project }) {
  const profiles = useApp((s) => s.profiles);
  const updateProject = useApp((s) => s.updateProject);
  const unit = useApp((s) => s.settings.unit);
  const ref = project.profileRef;
  const prof = ref ? profiles[ref.profileId] : undefined;
  const built = useMemo(() => (project.pattern ? buildPattern(project.pattern) : null), [project.pattern]);
  const ver = prof?.versions.find((v) => v.id === ref?.versionId);
  const link = (profileId: string, versionId: string) => {
    const p = profiles[profileId];
    const v = p.versions.find((x) => x.id === versionId)!;
    updateProject(
      project.id,
      (pr) => ({
        ...pr,
        profileRef: { profileId, versionId },
        pattern: pr.pattern ? { ...pr.pattern, body: { ...v.values }, measurementRef: { profileId, versionId }, context: { ...pr.pattern.context, kind: p.kind } } : pr.pattern
      }),
      `Medidas vinculadas: ${p.name}, versión ${v.n}.`
    );
  };
  const setCtx = (patch: Partial<Pick<Project, 'fabricType' | 'stretch' | 'fit'>>) =>
    updateProject(project.id, (pr) => {
      const next = { ...pr, ...patch };
      return { ...next, pattern: next.pattern ? { ...next.pattern, context: { ...next.pattern.context, fabric: next.fabricType, stretch: next.stretch, fit: next.fit } } : next.pattern };
    });
  return (
    <div className="stack-lg" style={{ maxWidth: 760 }}>
      <section className="stack">
        <h2 className="section-title" style={{ margin: 0 }}>Persona y versión de medidas</h2>
        <div className="grid-2">
          <Field label="Perfil">
            <Select value={ref?.profileId ?? ''} onChange={(id) => id && link(id, profiles[id].currentVersionId)} options={[{ value: '', label: 'Sin perfil' }, ...Object.values(profiles).map((p) => ({ value: p.id, label: `${p.name} · ${KIND_LABEL[p.kind]}` }))]} />
          </Field>
          {prof && (
            <Field label="Versión">
              <Select value={ref!.versionId} onChange={(v) => link(prof.id, v)} options={prof.versions.map((v) => ({ value: v.id, label: `Versión ${v.n}${v.id === prof.currentVersionId ? ' (actual)' : ''}${v.approved ? ' · aprobada' : ''}` }))} />
            </Field>
          )}
        </div>
        {prof && ver && prof.currentVersionId !== ver.id && (
          <Notice tone="warn">
            Hay una versión más reciente. <Button size="sm" variant="ghost" onClick={() => link(prof.id, prof.currentVersionId)}>Usar la versión actual</Button>
          </Notice>
        )}
        {prof && <a href={`#/medidas/${prof.id}`} className="small">Editar medidas de {prof.name}</a>}
      </section>
      <section className="stack">
        <h2 className="section-title" style={{ margin: 0 }}>Tejido y ajuste deseado</h2>
        <Segmented value={project.fabricType} onChange={(f) => setCtx({ fabricType: f, stretch: f === 'plano' ? 0 : project.stretch || 30 })} options={[{ value: 'plano', label: 'Tejido plano' }, { value: 'punto', label: 'Tejido de punto' }]} />
        {project.fabricType === 'punto' && (
          <Field label={`Elasticidad horizontal: ${project.stretch} %`}>
            <input type="range" min={0} max={100} step={5} value={project.stretch} onChange={(e) => setCtx({ stretch: Number(e.target.value) })} />
          </Field>
        )}
        <Segmented value={project.fit} onChange={(f: Fit) => setCtx({ fit: f })} options={(Object.keys(FIT_LABEL) as Fit[]).map((f) => ({ value: f, label: FIT_LABEL[f] }))} />
      </section>
      {built?.result ? (
        <section className="stack">
          <h2 className="section-title" style={{ margin: 0 }}>Medidas corporales, holgura y prenda terminada</h2>
          <div className="panel table-wrap">
            <table className="table">
              <thead>
                <tr><th>Medida</th><th className="n">Cuerpo</th><th className="n">Holgura</th><th className="n">Prenda terminada</th><th className="n">En el patrón</th></tr>
              </thead>
              <tbody>
                {built.result.checks.map((c) => (
                  <tr key={c.key}>
                    <td>{c.label}</td>
                    <td className="n">{c.body !== undefined ? formatLength(c.body, unit) : '—'}</td>
                    <td className="n">{c.ease !== undefined ? formatLength(c.ease, unit) : '—'}</td>
                    <td className="n"><span className="measure">{formatLength(c.target, unit)}</span></td>
                    <td className="n">{formatLength(c.measured, unit)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="small muted">Márgenes de costura y dobladillos se definen por borde en el editor de patronaje y no forman parte de la prenda terminada.</p>
        </section>
      ) : ver ? (
        <section className="stack">
          <h2 className="section-title" style={{ margin: 0 }}>Medidas corporales de la versión {ver.n}</h2>
          <div className="group">
            {Object.entries(ver.values).map(([k, v]) => (
              <div key={k} className="list-row" style={{ minHeight: 44 }}>
                <span className="grow small">{MEASURE_BY_KEY[k as keyof typeof MEASURE_BY_KEY]?.label}</span>
                <span className="num">{formatLength(v as number, unit)}</span>
              </div>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
