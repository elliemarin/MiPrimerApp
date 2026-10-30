import { uid, nowIso } from '../lib/ids';
import type { SizeRow, SizeTable, PersonKind } from '../lib/sizes/tables';
import type { MeasureValues } from '../lib/sizes/measurements';
import type { Profile } from './types';

export function profileFromSize(table: SizeTable, row: SizeRow, name?: string): Profile {
  const t = nowIso();
  const vid = uid('med');
  return {
    id: uid('perfil'),
    name: name || `Talla ${row.code}`,
    kind: row.kind,
    versions: [{ id: vid, n: 1, createdAt: t, label: `Desde tabla ${table.name} · ${row.code}`, source: { type: 'tabla', tableId: table.id, code: row.code }, values: { ...row.values }, approved: false }],
    currentVersionId: vid,
    createdAt: t,
    updatedAt: t
  };
}

export function blankProfile(name: string, kind: PersonKind): Profile {
  const t = nowIso();
  const vid = uid('med');
  return {
    id: uid('perfil'),
    name,
    kind,
    versions: [{ id: vid, n: 1, createdAt: t, label: 'Medidas personalizadas', source: { type: 'personalizada' }, values: {}, approved: false }],
    currentVersionId: vid,
    createdAt: t,
    updatedAt: t
  };
}

/** Agrega una versión nueva sin tocar las anteriores. */
export function addMeasurementVersion(p: Profile, values: MeasureValues, label: string): Profile {
  const n = Math.max(...p.versions.map((v) => v.n)) + 1;
  const id = uid('med');
  return { ...p, versions: [...p.versions, { id, n, createdAt: nowIso(), label, source: { type: 'personalizada' }, values: { ...values }, approved: false }], currentVersionId: id };
}
