import { useId } from 'react';
import { useApp } from '../../store/app';
import { Field, Select } from '../../ui/components';
import { SIZE_TABLES, KIND_LABEL, rowsForKinds } from '../../lib/sizes/tables';
import { profileFromSize } from '../../store/profiles';
import type { Profile } from '../../store/types';

export type ProfileChoice = { type: 'perfil'; id: string } | { type: 'tabla'; tableId: string; code: string } | { type: 'ninguno' };

export function defaultProfileChoice(kinds: string[], profiles: Record<string, Profile>, needs: boolean, babyCode?: string): ProfileChoice {
  if (!needs && !babyCode) return { type: 'ninguno' };
  // An explicitly chosen month interval takes precedence over a saved adult profile.
  if (babyCode && kinds.includes('bebe')) {
    const table = SIZE_TABLES.find(t => t.id === 'ref-bebe-meses')!;
    if (table.rows.some(r => r.code === babyCode)) return { type: 'tabla', tableId: table.id, code: babyCode };
  }
  const profile = Object.values(profiles).find(p => kinds.includes(p.kind));
  if (profile) return { type: 'perfil', id: profile.id };
  const preferred = kinds.includes('mujer') ? 'ref-mujer-busto' : kinds.includes('hombre') ? 'ref-hombre-pecho' : kinds.includes('bebe') ? 'ref-bebe-meses' : 'ref-infantil-estatura';
  const table = SIZE_TABLES.find(t => t.id === preferred)!;
  const rows = rowsForKinds(table, kinds);
  const row = rows.find(r => r.code === 'B0-3' || r.code === 'M92' || r.code === 'H100') ?? rows[0];
  return row ? { type: 'tabla', tableId: table.id, code: row.code } : { type: 'ninguno' };
}

export function ProfilePicker({ value, onChange, allowNone, kinds }: { value: ProfileChoice; onChange: (v: ProfileChoice) => void; allowNone?: boolean; kinds?: string[] }) {
  const inputId = useId();
  const profiles = useApp((s) => Object.values(s.profiles)).filter(p => !kinds || kinds.includes(p.kind)).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  const tables = SIZE_TABLES.filter(t => rowsForKinds(t, kinds).length > 0);
  const table = tables.find(t => value.type === 'tabla' && t.id === value.tableId) ?? tables[0];
  const rows = rowsForKinds(table, kinds);
  const selectTable = (tableId: string) => {
    const t = tables.find(x => x.id === tableId)!;
    const filtered = rowsForKinds(t, kinds);
    onChange({ type: 'tabla', tableId, code: filtered.find(r => r.code === 'B0-3')?.code ?? filtered[0].code });
  };
  return (
    <div className="stack">
      <Field label="Medidas" htmlFor={`${inputId}-mode`}>
        <Select id={`${inputId}-mode`} value={value.type} onChange={mode => {
          if (mode === 'perfil') onChange({ type: 'perfil', id: profiles[0]?.id ?? '' });
          else if (mode === 'tabla') selectTable(table.id);
          else onChange({ type: 'ninguno' });
        }} options={[
          ...(profiles.length ? [{ value: 'perfil' as const, label: 'Un perfil de medidas guardado' }] : []),
          { value: 'tabla' as const, label: 'Una talla de las tablas de referencia' },
          ...(allowNone ? [{ value: 'ninguno' as const, label: 'Sin medidas por ahora' }] : [])
        ]} />
      </Field>
      {value.type === 'perfil' && <Field label="Perfil" htmlFor={`${inputId}-profile`}><Select id={`${inputId}-profile`} value={value.id} onChange={id => onChange({ type: 'perfil', id })} options={profiles.map(p => ({ value: p.id, label: `${p.name} · ${KIND_LABEL[p.kind]}` }))} /></Field>}
      {value.type === 'tabla' && <>
        <div className="grid-2">
          <Field label="Tabla" htmlFor={`${inputId}-table`}><Select id={`${inputId}-table`} value={table.id} onChange={selectTable} options={tables.map(t => ({ value: t.id, label: t.name }))} /></Field>
          <Field htmlFor={`${inputId}-size`} label={table.id === 'ref-bebe-meses' ? 'Talla por meses' : 'Talla'}><Select id={`${inputId}-size`} value={value.code} onChange={code => onChange({ type: 'tabla', tableId: table.id, code })} options={rows.map(r => ({ value: r.code, label: table.id === 'ref-bebe-meses' ? `${r.label} · hasta ${r.values.estatura! / 10} cm` : `${r.code}${r.ageHint ? ` (${r.ageHint})` : ''}` }))} /></Field>
        </div>
        <p className="tiny muted">{table.basis}</p>
      </>}
    </div>
  );
}

/** Converts the explicit selection into a persisted, reproducible measurement profile. */
export function resolveProfile(choice: ProfileChoice, put: (kind: 'profile', p: ReturnType<typeof profileFromSize>) => void, profiles: Record<string, ReturnType<typeof profileFromSize>>) {
  if (choice.type === 'perfil') return profiles[choice.id];
  if (choice.type === 'tabla') {
    const t = SIZE_TABLES.find(x => x.id === choice.tableId);
    const r = t?.rows.find(x => x.code === choice.code);
    if (!t || !r) throw new Error('Elige una talla válida antes de crear el proyecto.');
    const p = profileFromSize(t, r);
    put('profile', p);
    return p;
  }
  return undefined;
}
