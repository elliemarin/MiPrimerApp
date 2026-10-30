import { useState } from 'react';
import { useApp } from '../../store/app';
import { Field, Select } from '../../ui/components';
import { SIZE_TABLES, KIND_LABEL } from '../../lib/sizes/tables';
import { profileFromSize } from '../../store/profiles';

export type ProfileChoice = { type: 'perfil'; id: string } | { type: 'tabla'; tableId: string; code: string } | { type: 'ninguno' };

export function ProfilePicker({ value, onChange, allowNone, kinds }: { value: ProfileChoice; onChange: (v: ProfileChoice) => void; allowNone?: boolean; kinds?: string[] }) {
  const profiles = useApp((s) => Object.values(s.profiles)).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  const tables = SIZE_TABLES.filter((t) => !kinds || t.kinds.some((k) => kinds.includes(k)));
  const [tableId, setTableId] = useState(value.type === 'tabla' ? value.tableId : tables[0]?.id ?? SIZE_TABLES[0].id);
  const table = SIZE_TABLES.find((t) => t.id === tableId)!;
  const mode = value.type;
  return (
    <div className="stack">
      <Field label="Medidas">
        <Select
          value={mode}
          onChange={(m) => {
            if (m === 'perfil') onChange({ type: 'perfil', id: profiles[0]?.id ?? '' });
            else if (m === 'tabla') onChange({ type: 'tabla', tableId, code: table.rows[Math.floor(table.rows.length / 2)].code });
            else onChange({ type: 'ninguno' });
          }}
          options={[
            ...(profiles.length ? [{ value: 'perfil' as const, label: 'Un perfil de medidas guardado' }] : []),
            { value: 'tabla' as const, label: 'Una talla de las tablas de referencia' },
            ...(allowNone ? [{ value: 'ninguno' as const, label: 'Sin medidas por ahora' }] : [])
          ]}
        />
      </Field>
      {mode === 'perfil' && (
        <Field label="Perfil">
          <Select value={value.type === 'perfil' ? value.id : ''} onChange={(id) => onChange({ type: 'perfil', id })} options={profiles.map((p) => ({ value: p.id, label: `${p.name} · ${KIND_LABEL[p.kind]}` }))} />
        </Field>
      )}
      {mode === 'tabla' && (
        <div className="grid-2">
          <Field label="Tabla">
            <Select
              value={tableId}
              onChange={(id) => {
                setTableId(id);
                const t = SIZE_TABLES.find((x) => x.id === id)!;
                onChange({ type: 'tabla', tableId: id, code: t.rows[Math.floor(t.rows.length / 2)].code });
              }}
              options={tables.map((t) => ({ value: t.id, label: t.name }))}
            />
          </Field>
          <Field label="Talla">
            <Select value={value.type === 'tabla' ? value.code : ''} onChange={(code) => onChange({ type: 'tabla', tableId, code })} options={table.rows.map((r) => ({ value: r.code, label: `${r.code}${r.ageHint ? ` (${r.ageHint})` : ''}` }))} />
          </Field>
        </div>
      )}
    </div>
  );
}

/** Convierte la elección en un perfil (crea uno nuevo si se eligió una talla). */
export function resolveProfile(choice: ProfileChoice, put: (kind: 'profile', p: ReturnType<typeof profileFromSize>) => void, profiles: Record<string, ReturnType<typeof profileFromSize>>) {
  if (choice.type === 'perfil') return profiles[choice.id];
  if (choice.type === 'tabla') {
    const t = SIZE_TABLES.find((x) => x.id === choice.tableId)!;
    const r = t.rows.find((x) => x.code === choice.code)!;
    const p = profileFromSize(t, r);
    put('profile', p);
    return p;
  }
  return undefined;
}
