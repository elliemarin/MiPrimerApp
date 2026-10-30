import { useMemo, useState } from 'react';
import { useApp } from '../../store/app';
import { Button, Chip, Confirm, Empty, Field, LengthInput, Notice, PageHead, Select, Sheet, TextInput } from '../../ui/components';
import { Icon } from '../../ui/Icon';
import { goBack, navigate } from '../../ui/router';
import { GROUP_LABEL, MEASURES, MEASURE_BY_KEY, MeasureGroup, MeasureKey, MeasureValues } from '../../lib/sizes/measurements';
import { KIND_LABEL, PersonKind, findTable } from '../../lib/sizes/tables';
import { GENERATORS } from '../../lib/pattern/generators';
import { formatLength } from '../../lib/units';
import { BodyGuide } from './BodyGuide';
import { addMeasurementVersion } from '../../store/profiles';
import type { Profile } from '../../store/types';

export function ProfileDetail({ id }: { id: string }) {
  const profile = useApp((s) => s.profiles[id]);
  const projects = useApp((s) => s.projects);
  const put = useApp((s) => s.put);
  const remove = useApp((s) => s.remove);
  const toast = useApp((s) => s.toast);
  const unit = useApp((s) => s.settings.unit);
  const [guide, setGuide] = useState<MeasureKey | null>(null);
  const [filter, setFilter] = useState<string>('todas');
  const [compareId, setCompareId] = useState<string>('');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [newVersion, setNewVersion] = useState(false);

  const usedVersions = useMemo(() => {
    const s = new Set<string>();
    for (const p of Object.values(projects)) for (const e of p.exports) if (e.deps.measurement?.profileId === id) s.add(e.deps.measurement.versionId);
    return s;
  }, [projects, id]);

  if (!profile) return <div className="page"><Empty icon="medidas" title="Perfil no encontrado" action={<Button onClick={() => navigate('/medidas')}>Volver</Button>} /></div>;
  const current = profile.versions.find((v) => v.id === profile.currentVersionId)!;
  const locked = current.approved || usedVersions.has(current.id);
  const usedBy = Object.values(projects).filter((p) => p.profileRef?.profileId === id);

  const setValue = (k: MeasureKey, mm: number | undefined) => {
    const values: MeasureValues = { ...current.values };
    if (mm === undefined) delete values[k];
    else values[k] = mm;
    if (locked) {
      const next = addMeasurementVersion(profile, values, `Cambios sobre la versión ${current.n}`);
      put('profile', next);
      toast(`La versión ${current.n} está ${current.approved ? 'aprobada' : 'usada en una exportación'}: tus cambios crean la versión ${current.n + 1}.`);
      return;
    }
    put('profile', { ...profile, versions: profile.versions.map((v) => (v.id === current.id ? { ...v, values, source: v.source.type === 'tabla' ? { type: 'personalizada' } : v.source, label: v.source.type === 'tabla' ? `${v.label} (ajustada)` : v.label } : v)) });
  };

  const gen = GENERATORS.find((g) => g.id === filter);
  const wanted = gen ? new Set<MeasureKey>([...gen.requiredMeasures, ...gen.optionalMeasures]) : null;
  const groups = (Object.keys(GROUP_LABEL) as MeasureGroup[]).map((g) => ({ g, items: MEASURES.filter((m) => m.group === g && (!wanted || wanted.has(m.key))) })).filter((x) => x.items.length);
  const compare = profile.versions.find((v) => v.id === compareId);
  const src = current.source.type === 'tabla' ? findTable(current.source.tableId) : undefined;

  return (
    <div className="page">
      <PageHead title={profile.name} back={{ label: 'Medidas', onClick: () => goBack('/medidas') }} sub={`${KIND_LABEL[profile.kind]} · versión ${current.n}${current.approved ? ' (aprobada)' : ''}`} />
      <div style={{ display: 'grid', gap: 24, gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', alignItems: 'start' }}>
        <div className="stack-lg">
          <div className="panel panel-pad stack">
            <div className="grid-2">
              <Field label="Nombre">
                <TextInput value={profile.name} onChange={(v) => put('profile', { ...profile, name: v })} />
              </Field>
              <Field label="Persona">
                <Select value={profile.kind} onChange={(k: PersonKind) => put('profile', { ...profile, kind: k })} options={Object.entries(KIND_LABEL).map(([value, label]) => ({ value: value as PersonKind, label }))} />
              </Field>
            </div>
            <Field label="Fecha de nacimiento (opcional)" hint="Solo como referencia: los patrones usan las medidas, nunca la edad.">
              <input className="input" type="date" value={profile.birthDate ?? ''} onChange={(e) => put('profile', { ...profile, birthDate: e.target.value || undefined })} />
            </Field>
            <Field label="Notas">
              <textarea className="textarea" value={profile.notes ?? ''} onChange={(e) => put('profile', { ...profile, notes: e.target.value })} placeholder="Postura, preferencias de ajuste, usa pañal…" />
            </Field>
          </div>

          <section className="stack">
            <div className="spread">
              <h2 className="section-title" style={{ margin: 0 }}>Medidas corporales</h2>
              <div style={{ width: 210 }}>
                <Select value={filter} onChange={setFilter} options={[{ value: 'todas', label: 'Todas las medidas' }, ...GENERATORS.filter((g) => g.requiredMeasures.length).map((g) => ({ value: g.id, label: `Para: ${g.name}` }))]} />
              </div>
            </div>
            {locked && <Notice tone="warn">Esta versión está {current.approved ? 'aprobada' : 'usada en una exportación'}. Si cambias una medida se creará una versión nueva y la actual se conserva.</Notice>}
            {src && current.source.type === 'tabla' && <p className="small muted">Valores tomados de «{src.name}», talla {current.source.code}. Ajusta los que midas a la persona.</p>}
            {groups.map(({ g, items }) => (
              <div key={g} className="stack" style={{ gap: 6 }}>
                <div className="field-label" style={{ marginTop: 6 }}>{GROUP_LABEL[g]}</div>
                <div className="group">
                  {items.map((m) => {
                    const req = gen?.requiredMeasures.includes(m.key);
                    return (
                      <div key={m.key} className="list-row" style={{ minHeight: 60 }}>
                        <button className="icon-btn" aria-label={`Cómo medir ${m.label}`} onClick={() => setGuide(m.key)} style={{ color: 'var(--mat)' }}>
                          <Icon name="ayuda" />
                        </button>
                        <span className="grow">
                          <span className="t small" style={{ display: 'block' }}>{m.label}</span>
                          {req && current.values[m.key] === undefined && <span className="tiny" style={{ color: 'var(--thread)' }}>Necesaria para el patrón</span>}
                          {compare && compare.values[m.key] !== current.values[m.key] && (
                            <span className="tiny" style={{ color: 'var(--tape-ink)' }}>
                              v{compare.n}: {compare.values[m.key] !== undefined ? formatLength(compare.values[m.key]!, unit) : '—'}
                            </span>
                          )}
                        </span>
                        <div style={{ width: 132 }}>
                          <LengthInput mm={current.values[m.key]} onChange={(v) => setValue(m.key, v)} min={1} max={3000} allowEmpty placeholder="—" />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </section>
        </div>

        <div className="stack-lg">
          <section className="stack">
            <h2 className="section-title" style={{ margin: 0 }}>Versiones</h2>
            <div className="group">
              {[...profile.versions].reverse().map((v) => (
                <div key={v.id} className="list-row" style={{ alignItems: 'flex-start' }}>
                  <span className="lead" style={v.id === current.id ? { background: 'var(--mat)', color: 'var(--mat-ink)' } : undefined}>
                    <strong>{v.n}</strong>
                  </span>
                  <span className="grow">
                    <span className="t small" style={{ display: 'block' }}>{v.label || `Versión ${v.n}`}</span>
                    <span className="s">{new Date(v.createdAt).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                    <span className="row-wrap" style={{ marginTop: 4 }}>
                      {v.id === current.id && <Chip tone="ok">Actual</Chip>}
                      {v.approved && <Chip tone="ok" icon="check">Aprobada</Chip>}
                      {usedVersions.has(v.id) && <Chip>Usada en exportación</Chip>}
                    </span>
                  </span>
                  <div className="stack" style={{ gap: 4, alignItems: 'flex-end' }}>
                    {v.id !== current.id && <Button size="sm" variant="ghost" onClick={() => put('profile', { ...profile, currentVersionId: v.id })}>Restaurar</Button>}
                    <Button size="sm" variant="ghost" onClick={() => put('profile', { ...profile, versions: profile.versions.map((x) => (x.id === v.id ? { ...x, approved: !x.approved } : x)) })}>{v.approved ? 'Quitar aprobación' : 'Aprobar'}</Button>
                  </div>
                </div>
              ))}
            </div>
            <div className="row-wrap">
              <Button icon="plus" onClick={() => setNewVersion(true)}>Nueva versión</Button>
              {profile.versions.length > 1 && (
                <div style={{ width: 220 }}>
                  <Select value={compareId} onChange={setCompareId} options={[{ value: '', label: 'Comparar con…' }, ...profile.versions.filter((v) => v.id !== current.id).map((v) => ({ value: v.id, label: `Versión ${v.n}` }))]} />
                </div>
              )}
            </div>
          </section>

          {usedBy.length > 0 && (
            <section className="stack">
              <h2 className="section-title" style={{ margin: 0 }}>Proyectos que usan este perfil</h2>
              <div className="group">
                {usedBy.map((p) => (
                  <a key={p.id} className="list-row" href={`#/proyectos/${p.id}`}>
                    <span className="grow t small">{p.name}</span>
                    <span className="small muted">usa v{profile.versions.find((v) => v.id === p.profileRef?.versionId)?.n ?? '?'}</span>
                    <Icon name="chev" className="chev" />
                  </a>
                ))}
              </div>
            </section>
          )}
          <section className="stack">
            <h2 className="section-title" style={{ margin: 0 }}>Distinciones que usa la app</h2>
            <ul className="small muted" style={{ margin: 0, paddingLeft: 18, display: 'grid', gap: 6 }}>
              <li><strong>Medidas corporales</strong>: las de esta página, tomadas sobre el cuerpo.</li>
              <li><strong>Holgura</strong>: diseño y movimiento; se define en cada patrón y se suma una vez.</li>
              <li><strong>Prenda terminada</strong>: cuerpo + holgura, medida sobre la línea de costura.</li>
              <li><strong>Márgenes y dobladillos</strong>: se agregan por borde, fuera de la prenda terminada.</li>
            </ul>
          </section>
          <Button variant="danger" icon="trash" onClick={() => setConfirmDelete(true)}>Eliminar perfil</Button>
        </div>
      </div>

      {guide && <GuideSheet k={guide} onClose={() => setGuide(null)} />}
      {newVersion && <NewVersionSheet profile={profile} onClose={() => setNewVersion(false)} />}
      {confirmDelete && (
        <Confirm
          title="¿Eliminar este perfil?"
          body={`Se borrarán ${profile.versions.length} versiones de medidas. Los proyectos conservan la copia de medidas que usan sus patrones.`}
          confirmLabel="Eliminar"
          danger
          onClose={() => setConfirmDelete(false)}
          onConfirm={() => {
            remove('profile', profile.id);
            navigate('/medidas');
          }}
        />
      )}
    </div>
  );
}

function GuideSheet({ k, onClose }: { k: MeasureKey; onClose: () => void }) {
  const m = MEASURE_BY_KEY[k];
  return (
    <Sheet title={m.label} onClose={onClose}>
      <div className="stack" style={{ alignItems: 'center' }}>
        <BodyGuide measure={m.guide} size={190} />
        <p style={{ maxWidth: '46ch' }}>{m.how}</p>
        <p className="small muted">Usa una cinta métrica flexible, sin apretar, sobre ropa ligera. Pide ayuda para las medidas de espalda.</p>
      </div>
    </Sheet>
  );
}

function NewVersionSheet({ profile, onClose }: { profile: Profile; onClose: () => void }) {
  const put = useApp((s) => s.put);
  const [label, setLabel] = useState('');
  const current = profile.versions.find((v) => v.id === profile.currentVersionId)!;
  return (
    <Sheet title="Nueva versión de medidas" onClose={onClose}>
      <div className="stack">
        <p className="muted">Se copia la versión {current.n} para que registres medidas nuevas (por ejemplo, tras unos meses). La versión anterior queda en el historial.</p>
        <Field label="Nombre de la versión">
          <TextInput value={label} onChange={setLabel} placeholder={`Medidas de ${new Date().toLocaleDateString('es-MX', { month: 'long', year: 'numeric' })}`} />
        </Field>
        <Button
          variant="primary"
          block
          onClick={() => {
            put('profile', addMeasurementVersion(profile, current.values, label.trim() || `Medidas de ${new Date().toLocaleDateString('es-MX', { month: 'long', year: 'numeric' })}`));
            onClose();
          }}
        >
          Crear versión {Math.max(...profile.versions.map((v) => v.n)) + 1}
        </Button>
      </div>
    </Sheet>
  );
}
