import { useState } from 'react';
import { useApp } from '../../store/app';
import { Button, Empty, Field, PageHead, Segmented, Select, Sheet, TextInput } from '../../ui/components';
import { Icon } from '../../ui/Icon';
import { KIND_LABEL, PersonKind, SIZE_TABLES } from '../../lib/sizes/tables';
import { blankProfile, profileFromSize } from '../../store/profiles';
import { navigate } from '../../ui/router';

export function ProfilesPage() {
  const profiles = useApp((s) => Object.values(s.profiles).sort((a, b) => a.name.localeCompare(b.name)));
  const [creating, setCreating] = useState(false);
  return (
    <div className="page">
      <PageHead title="Medidas" sub="Perfiles por persona con historial de versiones. Las tallas de referencia son tablas explícitas: no se convierten entre sistemas." actions={<Button variant="primary" icon="plus" onClick={() => setCreating(true)}>Nuevo</Button>} />
      {profiles.length === 0 ? (
        <Empty icon="medidas" title="Sin perfiles todavía" body="Guarda las medidas de cada persona para la que coses. Puedes empezar desde una talla de referencia y ajustarla." action={<Button variant="primary" onClick={() => setCreating(true)}>Crear perfil</Button>} />
      ) : (
        <div className="group">
          {profiles.map((p) => {
            const v = p.versions.find((x) => x.id === p.currentVersionId);
            const n = v ? Object.values(v.values).filter((x) => typeof x === 'number').length : 0;
            return (
              <a key={p.id} className="list-row" href={`#/medidas/${p.id}`}>
                <span className="lead"><Icon name="person" /></span>
                <span className="grow">
                  <span className="t" style={{ display: 'block' }}>{p.name}</span>
                  <span className="s">{KIND_LABEL[p.kind]} · {n} medidas · versión {v?.n}{v?.approved ? ' aprobada' : ''}</span>
                </span>
                <Icon name="chev" className="chev" />
              </a>
            );
          })}
        </div>
      )}
      {creating && <NewProfile onClose={() => setCreating(false)} />}
    </div>
  );
}

function NewProfile({ onClose }: { onClose: () => void }) {
  const put = useApp((s) => s.put);
  const [name, setName] = useState('');
  const [kind, setKind] = useState<PersonKind>('mujer');
  const [start, setStart] = useState<'tabla' | 'vacio'>('tabla');
  const tables = SIZE_TABLES.filter((t) => t.kinds.includes(kind));
  const [tableId, setTableId] = useState(tables[0]?.id ?? SIZE_TABLES[0].id);
  const table = SIZE_TABLES.find((t) => t.id === tableId) ?? tables[0];
  const rows = table ? table.rows.filter((r) => r.kind === kind || !['bebe', 'toddler', 'infantil'].includes(kind)) : [];
  const [code, setCode] = useState(rows[Math.floor(rows.length / 2)]?.code ?? '');
  const create = () => {
    const nm = name.trim() || (start === 'tabla' ? `Talla ${code}` : 'Nueva persona');
    let p;
    if (start === 'tabla' && table) {
      const row = table.rows.find((r) => r.code === code) ?? rows[0];
      p = profileFromSize(table, row, nm);
      p.kind = kind;
    } else p = blankProfile(nm, kind);
    put('profile', p);
    onClose();
    navigate(`/medidas/${p.id}`);
  };
  return (
    <Sheet title="Nuevo perfil" onClose={onClose}>
      <div className="stack">
        <Field label="Nombre">
          <TextInput value={name} onChange={setName} placeholder="Ana, Leo, cliente 12…" />
        </Field>
        <Field label="Persona" hint={kind === 'bebe' || kind === 'toddler' ? 'Las medidas se toman sobre el pañal. La edad solo sirve de referencia.' : undefined}>
          <Select
            value={kind}
            onChange={(k) => {
              setKind(k);
              const t = SIZE_TABLES.find((x) => x.kinds.includes(k));
              if (t) {
                setTableId(t.id);
                const rr = t.rows.filter((r) => r.kind === k || !['bebe', 'toddler', 'infantil'].includes(k));
                setCode(rr[Math.floor(rr.length / 2)]?.code ?? '');
              }
            }}
            options={Object.entries(KIND_LABEL).map(([value, label]) => ({ value: value as PersonKind, label }))}
          />
        </Field>
        <Field label="Empezar">
          <Segmented value={start} onChange={setStart} options={[{ value: 'tabla', label: 'Desde una talla' }, { value: 'vacio', label: 'Medidas propias' }]} />
        </Field>
        {start === 'tabla' && table && (
          <div className="grid-2">
            <Field label="Tabla">
              <Select value={tableId} onChange={setTableId} options={(tables.length ? tables : SIZE_TABLES).map((t) => ({ value: t.id, label: t.name }))} />
            </Field>
            <Field label="Talla">
              <Select value={code} onChange={setCode} options={rows.map((r) => ({ value: r.code, label: `${r.code}${r.ageHint ? ` · ${r.ageHint}` : ''}` }))} />
            </Field>
          </div>
        )}
        <Button variant="primary" block onClick={create}>Crear perfil</Button>
      </div>
    </Sheet>
  );
}
