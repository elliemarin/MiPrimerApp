import type { TransformationPhotoSource } from './transformationPhotos';

/** Original AI before/after photography for nine hoodie and shirt alterations.
 * Each row shows the same base garment, with only its specified addition.
 * See docs/IMAGENES_TRANSFORMACIONES_B.md for prompts and visual review. */
export const TRANSFORMATION_B_SHEETS: Readonly<Record<string, readonly string[]>> = {
  'realistas-transformar-b-01': ['hoodie-portacelular', 'hoodie-punos', 'hoodie-bajo-doble'],
  'realistas-transformar-b-02': ['hoodie-parche-espalda', 'camisa-bolsillo-contraste', 'camisa-manga-volante'],
  'realistas-transformar-b-03': ['camisa-bajo-volante', 'camisa-coderas', 'camisa-aberturas-laterales'],
};

/** Reviewed bounds keep the whole garment and exclude the neighbouring row. */
export const TRANSFORMATION_B_PHOTOS: Readonly<Record<string, TransformationPhotoSource>> = {
  'hoodie-portacelular': { sheet: 'realistas-transformar-b-01', before: [0, 0, 627, 412], after: [627, 0, 627, 412] },
  'hoodie-punos': { sheet: 'realistas-transformar-b-01', before: [0, 412, 627, 418], after: [627, 412, 627, 418] },
  'hoodie-bajo-doble': { sheet: 'realistas-transformar-b-01', before: [0, 830, 627, 424], after: [627, 830, 627, 424] },
  'hoodie-parche-espalda': { sheet: 'realistas-transformar-b-02', before: [0, 0, 627, 410], after: [627, 0, 627, 410] },
  'camisa-bolsillo-contraste': { sheet: 'realistas-transformar-b-02', before: [0, 410, 627, 418], after: [627, 410, 627, 418] },
  'camisa-manga-volante': { sheet: 'realistas-transformar-b-02', before: [0, 828, 627, 426], after: [627, 828, 627, 426] },
  'camisa-bajo-volante': { sheet: 'realistas-transformar-b-03', before: [0, 0, 627, 410], after: [627, 0, 627, 410] },
  'camisa-coderas': { sheet: 'realistas-transformar-b-03', before: [0, 410, 627, 402], after: [627, 410, 627, 402] },
  'camisa-aberturas-laterales': { sheet: 'realistas-transformar-b-03', before: [0, 812, 627, 442], after: [627, 812, 627, 442] },
};
