import type { CatalogImageSource } from './catalogImages';

/** Original AI photographs for the exact constructions in digitizedAdultCatalog.
 * They illustrate appearance; they do not supply pattern geometry or dimensions.
 * Reviewed together with the generators; see docs/IMAGENES_ADULTOS_NUEVOS_B.md. */
const sheet = 'realistas-adultos-nuevos-b';

export const DIGITIZED_PHOTOS_B: Readonly<Record<string, CatalogImageSource>> = {
  'barrel-elastico': { sheet, cell: 0 },
  'palazzo-elastico': { sheet, cell: 1 },
  'jogger-oversize-felpa': { sheet, cell: 2 },
  'baggy-felpa': { sheet, cell: 3 },
  'cargo-recto': { sheet, cell: 4 },
  'sobrecamisa-cuello-tira': { sheet, cell: 5 },
  'chaqueta-campo': { sheet, cell: 6 },
};

/** The generator omits drawstrings for children. The photograph must do so too. */
export const DIGITIZED_CHILD_PHOTOS_B: Readonly<Record<string, CatalogImageSource>> = {
  'palazzo-elastico': { sheet, cell: 7 },
};

export const DIGITIZED_PHOTO_SHEETS_B: Readonly<Record<string, readonly string[]>> = {
  [sheet]: [
    'barrel-elastico', 'palazzo-elastico', 'jogger-oversize-felpa',
    'baggy-felpa', 'cargo-recto', 'sobrecamisa-cuello-tira',
    'chaqueta-campo', 'palazzo-elastico-infantil',
  ],
};

/** Reviewed display rectangles in the 1254 × 1254 original; no garment is cut. */
export const DIGITIZED_PHOTO_BOUNDS_B: Readonly<Record<string, readonly [number, number, number, number]>> = {
  [`${sheet}/0`]: [0, 0, 418, 418],
  [`${sheet}/1`]: [418, 0, 418, 418],
  [`${sheet}/2`]: [836, 0, 418, 418],
  [`${sheet}/3`]: [0, 418, 418, 418],
  [`${sheet}/4`]: [418, 418, 418, 418],
  [`${sheet}/5`]: [836, 418, 418, 418],
  [`${sheet}/6`]: [0, 836, 418, 418],
  [`${sheet}/7`]: [418, 836, 418, 418],
};
