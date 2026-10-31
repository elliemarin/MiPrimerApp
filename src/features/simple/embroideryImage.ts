import { uid } from '../../lib/ids';
import { canvasToBlob } from '../../lib/image';
import type { EmbroideryInsertion } from '../../lib/draw/embroideryMotifs';
import { useApp } from '../../store/app';
import { newElement } from '../studio/model';

export const EMBROIDERY_IMAGE_ACCEPT = 'image/png,image/jpeg,image/webp,image/heic,image/heif,image/avif';
const MAX_IMAGE_BYTES = 40 * 1024 * 1024;
const IMAGE_TYPE = /^image\/(png|jpeg|webp|heic|heif|avif)$/i;
const IMAGE_NAME = /\.(png|jpe?g|webp|heic|heif|avif)$/i;

/** A persistent, browser-oriented PNG, shared by the studio, PDF and project ZIP. */
export interface ImportedEmbroideryImage {
  fileId: string;
  name: string;
  widthPx: number;
  heightPx: number;
}

export function validateEmbroideryImage(file: Pick<File, 'type' | 'name' | 'size'>): void {
  if (!file.size) throw new Error('La imagen está vacía. Elige otro archivo.');
  if (file.size > MAX_IMAGE_BYTES) throw new Error('La imagen supera los 40 MB. Guarda una copia más pequeña.');
  if (!IMAGE_TYPE.test(file.type) && !(!file.type && IMAGE_NAME.test(file.name))) {
    throw new Error('Usa una imagen PNG, JPG o WebP. También puedes elegir una foto HEIC o AVIF compatible con tu navegador.');
  }
}

/** Limit memory on phones without enlarging smaller originals. */
export function embroideryImageSize(width: number, height: number, maxSide = 2400): { width: number; height: number } {
  if (![width, height, maxSide].every(value => Number.isFinite(value) && value >= 1)) {
    throw new Error('La imagen no tiene un tamaño válido.');
  }
  const scale = Math.min(1, maxSide / Math.max(width, height));
  return { width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale)) };
}

/** Keep alpha and bake camera orientation into one PNG; this does not generate stitches. */
export async function importEmbroideryImage(file: File): Promise<ImportedEmbroideryImage> {
  validateEmbroideryImage(file);
  const url = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.decoding = 'async';
    image.src = url;
    try {
      await image.decode();
    } catch {
      throw new Error('No se pudo abrir esta imagen. Prueba con otra o guárdala como PNG o JPG.');
    }
    const size = embroideryImageSize(image.naturalWidth, image.naturalHeight);
    const canvas = document.createElement('canvas');
    canvas.width = size.width;
    canvas.height = size.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('No se pudo preparar la imagen. Vuelve a intentarlo.');
    // An untouched canvas is transparent: do not paint a background or use JPEG.
    ctx.drawImage(image, 0, 0, size.width, size.height);
    const blob = await canvasToBlob(canvas, 'image/png');
    const name = file.name.replace(/\.[^.]+$/, '').trim().slice(0, 80) || 'Mi imagen';
    let fileId: string;
    try {
      fileId = await useApp.getState().addFile(blob, `${name} (bordado).png`);
    } catch (error) {
      if (error instanceof Error && /quota|space|espacio/i.test(`${error.name} ${error.message}`)) {
        throw new Error('No hay espacio suficiente para guardar la imagen en este dispositivo.');
      }
      throw new Error('No se pudo guardar la imagen. Vuelve a intentarlo.');
    }
    return { fileId, name, widthPx: size.width, heightPx: size.height };
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** An editable image is its own embroidery group, never a fabric or a cut pattern. */
export function createImageEmbroidery(image: ImportedEmbroideryImage, viewId: string, x: number, y: number, widthMm = 70): EmbroideryInsertion {
  if (!image.fileId || !viewId || ![image.widthPx, image.heightPx].every(value => Number.isFinite(value) && value > 0)) {
    throw new Error('La imagen no está lista. Vuelve a subirla.');
  }
  if (![x, y, widthMm].every(Number.isFinite) || widthMm < 5 || widthMm > 1000) {
    throw new Error('Elige un ancho entre 5 y 1000 mm y una posición válida.');
  }
  const groupId = uid('bordado');
  const height = widthMm * image.heightPx / image.widthPx;
  const name = `Logo · ${image.name}`;
  const shared = {
    name, x, y, w: widthMm, h: height,
    fill: { type: 'ninguno' as const }, stroke: null,
    technique: 'bordado' as const, edge: 'na' as const, allowance: 0,
    backing: 'desprendible' as const
  };
  const elements = [
    newElement(viewId, {
      ...shared, id: `${groupId}-imagen`, parentId: groupId, kind: 'imagen',
      image: { fileId: image.fileId, naturalW: image.widthPx, naturalH: image.heightPx }
    }),
    newElement(viewId, { ...shared, id: groupId, kind: 'grupo', embroidery: { kind: 'image' } })
  ];
  return { elements, groupId, width: widthMm, height };
}
