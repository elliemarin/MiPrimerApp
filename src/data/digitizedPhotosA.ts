import type { CatalogImageSource } from './catalogImages';

/** Fotografías IA ilustrativas de las recetas digitalizadas. No aportan medidas
 * ni certifican el ajuste físico de los patrones. Origen y revisión:
 * docs/IMAGENES_ADULTOS_NUEVOS_A.md. */
const sheet = 'realistas-adultos-nuevos-a';

export const DIGITIZED_PHOTO_SHEETS_A: Readonly<Record<string, readonly string[]>> = {
  [sheet]: [
    'palazzo-botones-laterales',
    'pantalon-volante',
    'chaqueta-ranglan',
    'sudadera-bloques',
    'buzo-murcielago',
    'culotte-encaje',
    'sudadera-media-cremallera-lisa',
    'culotte-punto-picot',
    'buzo-murcielago-infantil',
  ],
};

export const DIGITIZED_PHOTOS_A: Readonly<Record<string, CatalogImageSource>> = {
  'palazzo-botones-laterales': { sheet, cell: 0 },
  'pantalon-volante': { sheet, cell: 1 },
  'chaqueta-ranglan': { sheet, cell: 2 },
  'sudadera-bloques': { sheet, cell: 3 },
  'buzo-murcielago': { sheet, cell: 4 },
  'culotte-encaje': { sheet, cell: 5 },
  'sudadera-media-cremallera-lisa': { sheet, cell: 6 },
  'culotte-punto-picot': { sheet, cell: 7 },
};

/** En tallas infantiles el mismo buzo tiene banda de rib y ningún cordón. */
export const DIGITIZED_CHILD_PHOTOS_A: Readonly<Record<string, CatalogImageSource>> = {
  'buzo-murcielago': { sheet, cell: 8 },
};

/** Recortes revisados sobre el atlas de 1254 × 1254: prendas y puños completos,
 * sin fragmentos de vecinos. Solo metadatos de presentación. */
export const DIGITIZED_PHOTO_BOUNDS_A: Readonly<Record<string, readonly [number, number, number, number]>> = {
  [`${sheet}/0`]: [0, 0, 400, 434],
  [`${sheet}/1`]: [400, 0, 436, 434],
  [`${sheet}/2`]: [836, 0, 418, 434],
  [`${sheet}/3`]: [0, 434, 397, 399],
  [`${sheet}/4`]: [397, 434, 439, 399],
  [`${sheet}/5`]: [836, 434, 418, 399],
  [`${sheet}/6`]: [0, 833, 408, 421],
  [`${sheet}/7`]: [408, 833, 428, 421],
  [`${sheet}/8`]: [836, 833, 418, 421],
};
