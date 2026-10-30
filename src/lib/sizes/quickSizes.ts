import { SIZE_TABLES, type PersonKind } from './tables';

export type QuickSize = 'chica' | 'mediana' | 'grande';
export const QUICK_SIZE_LABEL: Record<QuickSize, string> = { chica: 'Chica', mediana: 'Mediana', grande: 'Grande' };

/** Named app presets with explicit reference measurements, not commercial conversions. */
export function quickSize(kind: PersonKind, size: QuickSize) {
  const adult = kind === 'hombre';
  const table = SIZE_TABLES.find(table => table.id === (adult ? 'ref-hombre-pecho' : 'ref-mujer-busto'))!;
  const code = (adult ? { chica: 'H92', mediana: 'H100', grande: 'H108' } : { chica: 'M88', mediana: 'M96', grande: 'M104' })[size];
  const row = table.rows.find(row => row.code === code)!;
  return { table, row };
}
