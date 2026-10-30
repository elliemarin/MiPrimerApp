import type { CatalogModel, Recipient } from '../../data/catalog';
import { buildPattern } from '../../lib/pattern/engine';
import { getGenerator } from '../../lib/pattern/generators';
import { quickSize } from '../../lib/sizes/quickSizes';
import { SIZE_TABLES, type PersonKind } from '../../lib/sizes/tables';
import { profileFromSize } from '../../store/profiles';
import { projectFromModel } from '../../store/projects';

/** Read-only example from the same recipe and engine used to create a project.
 * The temporary profile/project are never put into application storage. */
export function modelPatternDetails(model: CatalogModel, recipient?: Recipient, babySize?: string) {
  const generator = model.generatorId ? getGenerator(model.generatorId) : undefined;
  if (!generator || model.studioOnly) return undefined;
  const kinds = (recipient && model.recipients.includes(recipient) ? [recipient] : model.recipients)
    .flatMap(value => value === 'unisex' ? ['mujer', 'hombre'] as PersonKind[] : [value as PersonKind]);
  const kind = kinds.includes('mujer') ? 'mujer' : kinds[0] ?? 'mujer';
  let reference = model.collection === 'Disfraces' ? 'Medidas de esta versión' : 'Medidas del objeto de esta versión';
  let profile;
  if (generator.requiredMeasures.length) {
    if (['bebe', 'toddler', 'infantil'].includes(kind)) {
      const table = SIZE_TABLES.find(table => table.id === (kind === 'bebe' ? 'ref-bebe-meses' : 'ref-infantil-estatura'))!;
      const rows = table.rows.filter(row => row.kind === kind);
      const requested = babySize ?? (kind === 'bebe' ? 'B0-3' : kind === 'toddler' ? 'E92' : 'E128');
      const row = rows.find(row => row.code === requested) ?? rows[0];
      if (!row) return undefined;
      profile = profileFromSize(table, row);
      reference = `Talla de referencia: ${row.label}`;
    } else {
      const { table, row } = quickSize(kind, 'mediana');
      profile = profileFromSize(table, row);
      reference = `Talla Mediana de referencia · ${kind === 'hombre' ? 'Hombre' : 'Mujer'}`;
    }
  }
  const temporary = projectFromModel(model, profile);
  if (!temporary.pattern) return undefined;
  const pattern = buildPattern(temporary.pattern);
  const params = { ...generator.defaults({ ...temporary.pattern.context, body: temporary.pattern.body }), ...temporary.pattern.params };
  return { reference, generator, params, pattern,
    geometryChecked: !pattern.missing.length && !pattern.issues.some(issue => issue.level === 'error') && pattern.seamResults.every(seam => seam.ok) && pattern.pieces.length > 0 };
}
