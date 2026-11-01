import type { TransformationPhotoSource } from './transformationPhotos';

/** Original AI before/after pairs. Each row preserves the same base garment,
 * pose and scale; the right image illustrates only the requested alteration.
 * These photographs never supply measurements or pattern geometry.
 * See docs/IMAGENES_TRANSFORMACIONES_A.md for prompts and visual review. */
export const TRANSFORMATION_A_SHEETS: Readonly<Record<string, readonly string[]>> = {
  'realistas-transformar-a-01': ['vaquero-costados', 'pantalon-banda-deportiva', 'pantalon-campana-70'],
  'realistas-transformar-a-02': ['pantalon-bootcut', 'pantalon-cargo', 'pantalon-herramienta'],
  'realistas-transformar-a-03': ['pantalon-rodilleras', 'pantalon-bajo-contraste', 'hoodie-bolsillo-xl'],
};

/** Reviewed pixel bounds on 1254 × 1254 originals. Equal before/after bounds
 * preserve scale; sheet A1's white separators are outside the reviewed crops. */
export const TRANSFORMATION_A_PHOTOS: Readonly<Record<string, TransformationPhotoSource>> = {
  'vaquero-costados': { sheet: 'realistas-transformar-a-01', before: [0, 0, 622, 405], after: [632, 0, 622, 405] },
  'pantalon-banda-deportiva': { sheet: 'realistas-transformar-a-01', before: [0, 415, 622, 409], after: [632, 415, 622, 409] },
  'pantalon-campana-70': { sheet: 'realistas-transformar-a-01', before: [0, 834, 622, 420], after: [632, 834, 622, 420] },
  'pantalon-bootcut': { sheet: 'realistas-transformar-a-02', before: [0, 0, 627, 410], after: [627, 0, 627, 410] },
  'pantalon-cargo': { sheet: 'realistas-transformar-a-02', before: [0, 410, 627, 416], after: [627, 410, 627, 416] },
  'pantalon-herramienta': { sheet: 'realistas-transformar-a-02', before: [0, 826, 627, 428], after: [627, 826, 627, 428] },
  'pantalon-rodilleras': { sheet: 'realistas-transformar-a-03', before: [0, 0, 627, 418], after: [627, 0, 627, 418] },
  'pantalon-bajo-contraste': { sheet: 'realistas-transformar-a-03', before: [0, 418, 627, 416], after: [627, 418, 627, 416] },
  'hoodie-bolsillo-xl': { sheet: 'realistas-transformar-a-03', before: [0, 834, 627, 420], after: [627, 834, 627, 420] },
};
