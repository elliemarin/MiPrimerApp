// Unidad interna: milímetros (float). Las vistas convierten a cm o pulgadas
// sin redondear el valor almacenado.
export type Unit = 'cm' | 'in';

export const MM_PER_IN = 25.4;
export const MM_PER_PT = 25.4 / 72;
export const PT_PER_MM = 72 / 25.4;

export function mmToUnit(mm: number, unit: Unit): number {
  return unit === 'cm' ? mm / 10 : mm / MM_PER_IN;
}

export function unitToMm(value: number, unit: Unit): number {
  return unit === 'cm' ? value * 10 : value * MM_PER_IN;
}

const nf = (decimals: number) =>
  new Intl.NumberFormat('es-MX', { minimumFractionDigits: 0, maximumFractionDigits: decimals });

export function unitDecimals(unit: Unit): number {
  return unit === 'cm' ? 1 : 2;
}

export function formatLength(mm: number, unit: Unit, opts: { decimals?: number; suffix?: boolean } = {}): string {
  const decimals = opts.decimals ?? unitDecimals(unit);
  const s = nf(decimals).format(mmToUnit(mm, unit));
  return opts.suffix === false ? s : `${s} ${unit}`;
}

/** Valor editable (sin separadores de miles) para inputs. */
export function editableValue(mm: number | undefined, unit: Unit): string {
  if (mm === undefined || Number.isNaN(mm)) return '';
  const v = mmToUnit(mm, unit);
  const d = unit === 'cm' ? 2 : 3;
  return String(Math.round(v * 10 ** d) / 10 ** d);
}

/**
 * Interpreta un texto como longitud en la unidad indicada.
 * Acepta "52.4", "52,4", "20 5/8", "20-5/8", "5/8".
 */
export function parseLength(text: string, unit: Unit): number | null {
  const t = text.trim().replace(',', '.');
  if (!t) return null;
  const frac = /^(?:(\d+(?:\.\d+)?)[\s-]+)?(\d+)\/(\d+)$/.exec(t);
  let v: number;
  if (frac) {
    const whole = frac[1] ? parseFloat(frac[1]) : 0;
    const den = parseInt(frac[3], 10);
    if (den === 0) return null;
    v = whole + parseInt(frac[2], 10) / den;
  } else if (/^-?\d*\.?\d+$/.test(t)) {
    v = parseFloat(t);
  } else {
    return null;
  }
  return Number.isFinite(v) ? unitToMm(v, unit) : null;
}

export function formatArea(mm2: number, unit: Unit): string {
  if (unit === 'cm') return `${nf(0).format(mm2 / 100)} cm²`;
  return `${nf(1).format(mm2 / (MM_PER_IN * MM_PER_IN))} in²`;
}

export function formatNumber(v: number, decimals = 1): string {
  return nf(decimals).format(v);
}
