import { useApp } from '../store/app';
import type { Fabric } from '../store/types';
import { nowIso, uid } from './ids';
import { averageColor, canvasToBlob } from './image';

const MAX_PHOTO_BYTES = 40 * 1024 * 1024;
const RASTER_NAME = /\.(jpe?g|png|webp|heic|heif|avif|gif)$/i;

export function validateFabricPhoto(file: Pick<File, 'type' | 'name' | 'size'>): void {
  if (!file.size) throw new Error('La imagen está vacía. Elige otra foto.');
  if (file.size > MAX_PHOTO_BYTES) throw new Error('La foto supera los 40 MB. Guarda una copia más pequeña.');
  if ((!/^image\/(jpeg|png|webp|heic|heif|avif|gif)$/i.test(file.type) && !(!file.type && RASTER_NAME.test(file.name)))) {
    throw new Error('Usa una foto JPG, PNG, WebP, HEIC o AVIF.');
  }
}

/** Limita el tamaño de trabajo sin cambiar la proporción ni inventar escala física. */
export function fabricPhotoSize(width: number, height: number, maxSide = 1600) {
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) throw new Error('La imagen no tiene un tamaño válido.');
  const scale = Math.min(1, maxSide / Math.max(width, height));
  return { width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale)) };
}

/** Foto privada como material reutilizable. Original intacto + PNG ligero para el lienzo. */
export async function importFabricPhoto(file: File): Promise<Fabric> {
  validateFabricPhoto(file);
  const url = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.decoding = 'async';
    image.src = url;
    try { await image.decode(); }
    catch { throw new Error('El navegador no pudo abrir esta foto. Si es HEIC, expórtala como JPG y vuelve a subirla.'); }
    const size = fabricPhotoSize(image.naturalWidth, image.naturalHeight);
    const canvas = document.createElement('canvas');
    canvas.width = size.width; canvas.height = size.height;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) throw new Error('No se pudo preparar la muestra de tela.');
    ctx.drawImage(image, 0, 0, size.width, size.height);
    const color = averageColor(ctx.getImageData(0, 0, size.width, size.height));
    const sample = await canvasToBlob(canvas, 'image/png');
    const store = useApp.getState();
    const originalFileId = await store.addFile(file, file.name);
    const processedFileId = await store.addFile(sample, `${file.name.replace(/\.[^.]+$/, '')} (muestra).png`);
    const at = nowIso();
    const fabric: Fabric = {
      id: uid('tela'), name: file.name.replace(/\.[^.]+$/, '').trim().slice(0, 60) || 'Mi tela fotografiada',
      kind: 'plano', composition: '', color,
      photo: { originalFileId, processedFileId, adjust: { brightness: 0, contrast: 0, saturation: 0, warmth: 0 }, pxW: size.width, pxH: size.height },
      visualRepeatMm: 150, grainAngle: 0, nap: 'sin-pelo',
      notes: 'Foto propia usada como textura. Sin calibrar: tamaño del estampado aproximado. Recorta una zona de tela plana y calibra con una medida conocida para trabajar a escala. El tipo de tejido y la composición están por confirmar.',
      createdAt: at, updatedAt: at
    };
    store.put('fabric', fabric);
    return fabric;
  } finally { URL.revokeObjectURL(url); }
}
