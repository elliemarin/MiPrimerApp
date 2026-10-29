import type { MeasureKey, MeasureValues } from './measurements';

export type PersonKind = 'bebe' | 'toddler' | 'infantil' | 'mujer' | 'hombre' | 'otro';

export const KIND_LABEL: Record<PersonKind, string> = {
  bebe: 'Bebé',
  toddler: 'Toddler',
  infantil: 'Niña o niño',
  mujer: 'Mujer',
  hombre: 'Hombre',
  otro: 'Otra persona'
};

export interface SizeRow {
  code: string;
  label: string;
  /** Edad orientativa: solo referencia, nunca se usa para calcular. */
  ageHint?: string;
  kind: PersonKind;
  values: MeasureValues;
}

export interface SizeTable {
  id: string;
  name: string;
  basis: string;
  kinds: PersonKind[];
  rows: SizeRow[];
}

type Col = { key: MeasureKey; cm: number[] };

function build(codes: string[], labels: string[], kinds: PersonKind[], ages: (string | undefined)[], cols: Col[]): SizeRow[] {
  return codes.map((code, i) => {
    const values: MeasureValues = {};
    for (const c of cols) values[c.key] = Math.round(c.cm[i] * 10 * 10) / 10;
    return { code, label: labels[i], kind: kinds[i], ageHint: ages[i], values };
  });
}

// Tabla infantil por estatura. Valores de referencia propios de la app,
// aproximados: no equivalen a ningún sistema comercial de tallas.
const kidHeights = [50, 56, 62, 68, 74, 80, 86, 92, 98, 104, 110, 116, 122, 128, 134, 140, 146, 152];
const kidAges = ['0–1 m', '1–2 m', '2–4 m', '4–6 m', '6–9 m', '9–12 m', '12–18 m', '18–24 m', '2–3 años', '3–4 años', '4–5 años', '5–6 años', '6–7 años', '7–8 años', '8–9 años', '9–10 años', '10–11 años', '11–12 años'];
const kidKinds: PersonKind[] = kidHeights.map((h) => (h <= 80 ? 'bebe' : h <= 104 ? 'toddler' : 'infantil'));

const infantil: SizeTable = {
  id: 'ref-infantil-estatura',
  name: 'Infantil por estatura',
  basis: 'Tabla de referencia de la app, organizada por estatura en cm. Medidas corporales aproximadas sobre pañal hasta 92 cm. La edad es solo orientativa. Verifica siempre con medidas reales.',
  kinds: ['bebe', 'toddler', 'infantil'],
  rows: build(
    kidHeights.map((h) => `E${h}`),
    kidHeights.map((h) => `Estatura ${h}`),
    kidKinds,
    kidAges,
    [
      { key: 'estatura', cm: kidHeights },
      { key: 'pecho', cm: [41, 43, 45, 47, 49, 51, 53, 54, 55, 56, 58, 60, 62, 64, 67, 70, 73, 76] },
      { key: 'cintura', cm: [41, 43, 45, 46, 47, 48, 49, 50, 51, 52, 53, 54, 55, 56, 58, 60, 62, 64] },
      { key: 'cadera', cm: [41, 43, 45, 47, 49, 51, 53, 55, 57, 59, 61, 63, 65, 67, 70, 73, 77, 80] },
      { key: 'tiro', cm: [11, 11.8, 12.5, 13.2, 14, 14.8, 15.5, 16, 16.8, 17.5, 18.2, 19, 19.8, 20.5, 21.2, 22, 23, 24] },
      { key: 'entrepierna', cm: [16, 18, 20.5, 23, 25.5, 28, 31, 34, 36, 39, 42, 45, 48, 51, 54, 57, 60, 63] },
      { key: 'muslo', cm: [21, 23, 25, 26.5, 28, 29, 30, 31, 32, 33, 34, 35.5, 37, 38.5, 40.5, 42.5, 45, 47] },
      { key: 'tobillo', cm: [11, 11.5, 12, 12.5, 13, 13.5, 14, 14.5, 15, 15.5, 16, 16.5, 17, 17.5, 18.5, 19.5, 20.5, 21.5] },
      { key: 'cuello', cm: [22, 23, 24, 24.5, 25, 25.5, 26, 26.5, 27, 27.5, 28, 28.5, 29, 29.5, 30.5, 31.5, 32.5, 33.5] },
      { key: 'hombros', cm: [15, 16.5, 18, 19.5, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30.5, 32, 33.5, 35, 36.5] },
      { key: 'talleEspalda', cm: [13, 14.5, 16, 17.5, 19, 20.5, 22, 23, 24, 25, 26.5, 27.5, 29, 30, 31.5, 33, 34.5, 36] },
      { key: 'largoManga', cm: [17, 19, 21, 23, 25, 27, 29.5, 32, 34.5, 37, 39.5, 42, 44.5, 47, 49.5, 52, 54.5, 57] },
      { key: 'cabeza', cm: [35, 38, 41, 43, 45, 46.5, 47.5, 48.5, 49.5, 50, 50.5, 51, 51.5, 52, 52.5, 53, 53.5, 54] }
    ]
  )
};

const busts = [80, 84, 88, 92, 96, 100, 104, 110, 116, 122, 128];
const mujer: SizeTable = {
  id: 'ref-mujer-busto',
  name: 'Mujer por contorno de busto',
  basis: 'Tabla de referencia de la app para estatura aproximada de 164 cm, organizada por busto en cm. No equivale a tallas comerciales (CH/M/G, EU, US). Verifica con medidas reales.',
  kinds: ['mujer'],
  rows: build(
    busts.map((b) => `M${b}`),
    busts.map((b) => `Busto ${b}`),
    busts.map(() => 'mujer'),
    busts.map(() => undefined),
    [
      { key: 'estatura', cm: busts.map(() => 164) },
      { key: 'pecho', cm: busts },
      { key: 'bajoBusto', cm: [68, 72, 75, 79, 83, 87, 91, 96, 102, 108, 114] },
      { key: 'cintura', cm: [62, 66, 70, 74, 78, 82, 86, 92, 98, 104, 110] },
      { key: 'cadera', cm: [88, 92, 96, 100, 104, 108, 112, 117, 122, 128, 134] },
      { key: 'tiro', cm: [25, 25.5, 26, 26.5, 27, 27.5, 28, 28.5, 29, 29.5, 30] },
      { key: 'entrepierna', cm: busts.map(() => 76) },
      { key: 'muslo', cm: [50, 52, 54.5, 57, 59.5, 62, 64.5, 67.5, 70.5, 74, 77.5] },
      { key: 'rodilla', cm: [34, 35, 36, 37, 38, 39, 40, 41.5, 43, 44.5, 46] },
      { key: 'tobillo', cm: [21, 21.5, 22, 22.5, 23, 23.5, 24, 24.5, 25, 25.5, 26] },
      { key: 'cuello', cm: [33, 34, 35, 36, 37, 38, 39, 40.5, 42, 43.5, 45] },
      { key: 'hombros', cm: [37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47] },
      { key: 'espalda', cm: [32, 33, 34, 35, 36, 37, 38, 39.5, 41, 42.5, 44] },
      { key: 'talleDelantero', cm: [42, 43, 44, 45, 46, 47, 48, 49.5, 51, 52.5, 54] },
      { key: 'talleEspalda', cm: [40, 40.5, 41, 41.5, 42, 42.5, 43, 43.5, 44, 44.5, 45] },
      { key: 'largoManga', cm: [59, 59.5, 60, 60, 60.5, 60.5, 61, 61, 61.5, 61.5, 62] },
      { key: 'brazo', cm: [25, 26.5, 28, 29.5, 31, 32.5, 34, 36, 38, 40, 42] },
      { key: 'muneca', cm: [15, 15.5, 16, 16, 16.5, 17, 17.5, 18, 18.5, 19, 19.5] },
      { key: 'cabeza', cm: busts.map(() => 56) }
    ]
  )
};

const chests = [88, 92, 96, 100, 104, 108, 112, 118, 124, 130];
const hombre: SizeTable = {
  id: 'ref-hombre-pecho',
  name: 'Hombre por contorno de pecho',
  basis: 'Tabla de referencia de la app para estatura aproximada de 176 cm, organizada por pecho en cm. No equivale a tallas comerciales. Verifica con medidas reales.',
  kinds: ['hombre'],
  rows: build(
    chests.map((c) => `H${c}`),
    chests.map((c) => `Pecho ${c}`),
    chests.map(() => 'hombre'),
    chests.map(() => undefined),
    [
      { key: 'estatura', cm: chests.map(() => 176) },
      { key: 'pecho', cm: chests },
      { key: 'cintura', cm: [76, 80, 84, 88, 92, 96, 100, 106, 112, 118] },
      { key: 'cadera', cm: [90, 94, 98, 102, 106, 110, 114, 119, 124, 129] },
      { key: 'tiro', cm: [26, 26.5, 27, 27.5, 28, 28.5, 29, 29.5, 30, 30.5] },
      { key: 'entrepierna', cm: chests.map(() => 81) },
      { key: 'muslo', cm: [52, 54, 56, 58, 60, 62, 64, 67, 70, 73] },
      { key: 'rodilla', cm: [37, 38, 39, 40, 41, 42, 43, 44.5, 46, 47.5] },
      { key: 'tobillo', cm: [23, 23.5, 24, 24.5, 25, 25.5, 26, 26.5, 27, 27.5] },
      { key: 'cuello', cm: [37, 38, 39, 40, 41, 42, 43, 44.5, 46, 47.5] },
      { key: 'hombros', cm: [43, 44, 45, 46, 47, 48, 49, 50, 51, 52] },
      { key: 'espalda', cm: [38, 39, 40, 41, 42, 43, 44, 45.5, 47, 48.5] },
      { key: 'talleEspalda', cm: [44, 44.5, 45, 45.5, 46, 46.5, 47, 47.5, 48, 48.5] },
      { key: 'largoManga', cm: [63, 63.5, 64, 64.5, 65, 65.5, 66, 66.5, 67, 67.5] },
      { key: 'brazo', cm: [28, 29.5, 31, 32.5, 34, 35.5, 37, 39, 41, 43] },
      { key: 'muneca', cm: [16.5, 17, 17, 17.5, 17.5, 18, 18.5, 19, 19.5, 20] },
      { key: 'cabeza', cm: chests.map(() => 58) }
    ]
  )
};

export const SIZE_TABLES: SizeTable[] = [infantil, mujer, hombre];

export function findTable(id: string): SizeTable | undefined {
  return SIZE_TABLES.find((t) => t.id === id);
}

export function findSize(tableId: string, code: string): SizeRow | undefined {
  return findTable(tableId)?.rows.find((r) => r.code === code);
}
