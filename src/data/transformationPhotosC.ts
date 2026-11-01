import type { TransformationPhotoSource } from './transformationPhotos';

/** Original AI before/after product photographs. Sources and reviewed crops:
 * docs/IMAGENES_TRANSFORMACIONES_C.md. Never supplies pattern geometry. */
export const TRANSFORMATION_C_SHEETS: Readonly<Record<string, readonly string[]>> = {
  'realistas-transformar-c-01': ['chaqueta-cargo', 'chaqueta-espalda', 'chaqueta-bolsillo-tapa'],
  'realistas-transformar-c-02': ['vestido-volante', 'vestido-bolsillos', 'vestido-banda'],
  'realistas-transformar-c-03': ['falda-godets', 'falda-volante', 'falda-bolsillo-tapa'],
};

/** Each row uses identical crop dimensions on both sides to preserve scale.
 * Row boundaries follow the actual photographs, including hems and collars. */
export const TRANSFORMATION_C_PHOTOS: Readonly<Record<string, TransformationPhotoSource>> = {
  'chaqueta-cargo': { sheet: 'realistas-transformar-c-01', before: [0, 0, 627, 401], after: [627, 0, 627, 401] },
  'chaqueta-espalda': { sheet: 'realistas-transformar-c-01', before: [0, 401, 627, 402], after: [627, 401, 627, 402] },
  'chaqueta-bolsillo-tapa': { sheet: 'realistas-transformar-c-01', before: [0, 803, 627, 451], after: [627, 803, 627, 451] },
  'vestido-volante': { sheet: 'realistas-transformar-c-02', before: [120, 0, 520, 411], after: [620, 0, 520, 411] },
  'vestido-bolsillos': { sheet: 'realistas-transformar-c-02', before: [120, 411, 520, 403], after: [620, 411, 520, 403] },
  'vestido-banda': { sheet: 'realistas-transformar-c-02', before: [120, 814, 520, 440], after: [620, 814, 520, 440] },
  'falda-godets': { sheet: 'realistas-transformar-c-03', before: [0, 0, 627, 400], after: [627, 0, 627, 400] },
  'falda-volante': { sheet: 'realistas-transformar-c-03', before: [0, 400, 627, 409], after: [627, 400, 627, 409] },
  'falda-bolsillo-tapa': { sheet: 'realistas-transformar-c-03', before: [0, 809, 627, 445], after: [627, 809, 627, 445] },
};
