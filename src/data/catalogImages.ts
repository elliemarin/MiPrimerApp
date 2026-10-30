import type { CatalogModel, Recipient } from './catalog';

/** Original AI product illustrations. A 3 × 3 atlas keeps the entire library
 * lightweight; these images never supply geometry or scale to the patterns. */
export interface CatalogImageSource { sheet: string; cell: number }

export const CATALOG_IMAGE_SHEETS: Record<string, readonly string[]> = {
  'prendas-01': ['tipo-pantalon-recto','tipo-jogger','tipo-pantalon-amplio','short-elastico','pantalon-pijama','tipo-falda-fruncida','tipo-sudadera','tipo-hoodie','tipo-chaqueta-hombro-caido'],
  'prendas-02': ['tipo-cardigan-abierto','tipo-chaleco-abierto','tipo-poncho','tipo-ruana','tipo-jumper-falda','tipo-top-cuadrado','tipo-top-cuadrado-sin-mangas','babero','gorro'],
  'accesorios-01': ['tipo-bolsa-tote','tipo-cojin','tipo-funda-bebida','tipo-dona-cabello','tipo-bandana','tipo-delantal','tipo-antifaz','tipo-banderin','tipo-estuche-cierre'],
  'prendas-03': ['chaqueta-collage-bandas','chaqueta-patchwork-franjas','chaqueta-patchwork-cuadros','chaqueta-canesu-diagonal','chaqueta-collage-irregular','tipo-banda-cabello','cinturon-tela','pulsera-tela','lazo-regalo'],
  'fundas-01': ['tipo-funda-portatil','tipo-funda-tableta','tipo-funda-telefono','tipo-funda-libro','tipo-funda-lentes','tipo-funda-lector','tipo-funda-consola','tipo-funda-cuaderno','tipo-funda-tarjetas'],
  'fundas-02': ['tipo-funda-pasaporte','tipo-funda-patrones','tipo-funda-bastidor','tipo-funda-cables','tipo-funda-muestrario','tipo-textil-individual','tipo-textil-posavasos','tipo-textil-servilleta','tipo-textil-marcapaginas'],
  'hogar-01': ['tipo-textil-maquina','tipo-textil-bandeja','tipo-textil-taza','tipo-textil-plato','tipo-textil-centro','tipo-textil-camino','tipo-textil-raton','tipo-textil-escritorio','tipo-textil-muestrario'],
  'especiales-01': ['tipo-textil-cuadro','tipo-bolsa-jareta','body-bebe','tipo-disfraz-capa','tipo-disfraz-corona','tipo-disfraz-sombrero','tipo-disfraz-orejas'],
  'disfraces-01': ['disfraz-tabardo-medieval','disfraz-tabardo-heraldico','disfraz-tabardo-almenado','disfraz-tabardo-robot','disfraz-chaleco-pirata','disfraz-chaleco-duende','disfraz-chaleco-bolero','disfraz-falda-petalos','disfraz-falda-hojas'],
  'disfraces-02': ['disfraz-falda-medusa','disfraz-alas-mariposa','disfraz-alas-hada','disfraz-alas-dragon','disfraz-alas-murcielago','disfraz-alas-angel','disfraz-alas-escarabajo','disfraz-cola-dinosaurio','disfraz-cola-zorro'],
  'disfraces-03': ['disfraz-cola-ballena','disfraz-cola-gato','disfraz-cola-dragon','disfraz-orejas-conejo','disfraz-orejas-oso','disfraz-astas-ciervo','disfraz-cuerno-unicornio','disfraz-antenas-insecto','disfraz-cuello-arlequin'],
  'disfraces-04': ['disfraz-cuello-petalos','disfraz-gorguera','disfraz-cuello-vampiro','disfraz-punos-arlequin','disfraz-punos-dragon','disfraz-polainas-explorador','disfraz-peto-caballero','disfraz-peto-astronauta','disfraz-cinturon-pirata'],
  'disfraces-05': ['disfraz-kit-hada','disfraz-kit-dragon','disfraz-kit-conejo','disfraz-kit-insecto'],
};

export const CATALOG_IMAGES: Readonly<Record<string, CatalogImageSource>> = Object.fromEntries(
  Object.entries(CATALOG_IMAGE_SHEETS).flatMap(([sheet, ids]) => ids.map((id, cell) => [id, { sheet, cell }]))
);

// Reviewed bounds in each 1254 px original. Some illustrated props/wing tips
// extend beyond an exact grid cell; crop the complete object, never its neighbour.
// This is display metadata, not an edited or resampled source image.
type ImageBounds = readonly [x: number, y: number, width: number, height: number];
const IMAGE_BOUNDS: Record<string, ImageBounds> = {
  'prendas-02/5': [810, 430, 444, 400],
  'hogar-01/0': [0, 0, 455, 400],
  'hogar-01/1': [455, 0, 475, 400],
  'hogar-01/2': [930, 0, 324, 400],
  'hogar-01/3': [0, 400, 445, 435],
  'hogar-01/4': [445, 400, 465, 450],
  'hogar-01/5': [910, 380, 344, 470],
  'hogar-01/6': [0, 850, 418, 404],
  'hogar-01/7': [470, 850, 480, 404],
  'hogar-01/8': [950, 850, 304, 404],
  'especiales-01/4': [418, 418, 418, 390],
  'disfraces-02/3': [0, 418, 418, 385],
  'disfraces-02/4': [418, 418, 418, 385],
  'disfraces-02/5': [836, 418, 418, 385],
  'disfraces-02/6': [0, 803, 418, 451],
  'disfraces-02/7': [418, 815, 450, 439],
  'disfraces-02/8': [868, 803, 386, 451],
  'disfraces-03/0': [0, 0, 418, 380],
  'disfraces-03/1': [418, 0, 418, 390],
  'disfraces-03/2': [836, 0, 418, 380],
  'disfraces-03/3': [0, 380, 418, 400],
  'disfraces-03/4': [418, 390, 418, 390],
  'disfraces-03/5': [836, 380, 418, 400],
  'disfraces-03/6': [0, 780, 418, 474],
  'disfraces-03/7': [418, 780, 418, 474],
  'disfraces-04/3': [0, 418, 418, 390],
  'disfraces-04/4': [418, 418, 418, 390],
  'disfraces-04/5': [836, 418, 418, 390],
  'disfraces-04/6': [0, 808, 418, 446],
  'disfraces-04/7': [418, 808, 418, 446],
  'disfraces-04/8': [836, 808, 418, 446],
};

export function catalogImageBounds(source: CatalogImageSource): ImageBounds {
  return IMAGE_BOUNDS[`${source.sheet}/${source.cell}`] ?? [(source.cell % 3) * 418, Math.floor(source.cell / 3) * 418, 418, 418];
}

const BABY_IMAGES: Record<string, CatalogImageSource> = {
  'tipo-pantalon-recto': { sheet: 'disfraces-05', cell: 4 },
  'short-elastico': { sheet: 'disfraces-05', cell: 5 },
  'tipo-jogger': { sheet: 'disfraces-05', cell: 6 },
  'pantalon-pijama': { sheet: 'especiales-01', cell: 8 },
};

export function catalogImageFor(model: CatalogModel, recipient?: Recipient): CatalogImageSource | undefined {
  const id = model.designGroup?.id ?? model.id;
  if (id === 'body-bebe' && model.params?.tipoManga === 'larga') return { sheet: 'especiales-01', cell: 7 };
  if ((recipient === 'bebe' || model.recipients.every(value => value === 'bebe' || value === 'toddler')) && BABY_IMAGES[id]) return BABY_IMAGES[id];
  return CATALOG_IMAGES[id];
}

export function catalogImageUrl(source: CatalogImageSource): string {
  return `${import.meta.env.BASE_URL}catalog-images/${source.sheet}.webp`;
}
