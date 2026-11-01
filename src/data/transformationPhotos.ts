import { TRANSFORMATION_A_PHOTOS, TRANSFORMATION_A_SHEETS } from './transformationPhotosA';
import { TRANSFORMATION_B_PHOTOS, TRANSFORMATION_B_SHEETS } from './transformationPhotosB';
import { TRANSFORMATION_C_PHOTOS, TRANSFORMATION_C_SHEETS } from './transformationPhotosC';

export type TransformationPhotoView = 'before' | 'after';
export type TransformationPhotoBounds = readonly [x: number, y: number, width: number, height: number];
/** Original AI photographs illustrate a change; measurements always come from
 * the person's garment and the independent transformation pattern generator. */
export interface TransformationPhotoSource {
  sheet: string;
  before: TransformationPhotoBounds;
  after: TransformationPhotoBounds;
}

export const TRANSFORMATION_PHOTOS: Readonly<Record<string, TransformationPhotoSource>> = {
  ...TRANSFORMATION_A_PHOTOS, ...TRANSFORMATION_B_PHOTOS, ...TRANSFORMATION_C_PHOTOS
};
export const TRANSFORMATION_PHOTO_SHEETS: Readonly<Record<string, readonly string[]>> = {
  ...TRANSFORMATION_A_SHEETS, ...TRANSFORMATION_B_SHEETS, ...TRANSFORMATION_C_SHEETS
};
export function transformationPhotoFor(id: string): TransformationPhotoSource | undefined {
  return TRANSFORMATION_PHOTOS[id];
}
export function transformationPhotoUrl(source: TransformationPhotoSource): string {
  return `${import.meta.env.BASE_URL}transformation-images/${source.sheet}.webp`;
}
