import type { PDFDocument, PDFImage } from 'pdf-lib';
import { getFile } from '../db';
import type { StoredFile } from '../../store/types';
import type { DrawImage } from '../draw/drawable';

export type ImageFileLoader = (id: string) => Promise<StoredFile | undefined>;

/** Embed originals once per PDF. Missing/corrupt artwork must never become a blank guide. */
export async function embedRasterImages(doc:PDFDocument, images:DrawImage[], load:ImageFileLoader=getFile):Promise<Map<string,PDFImage>> {
  const embedded=new Map<string,PDFImage>();
  for(const image of images) {
    if(embedded.has(image.fileId))continue;
    const file=await load(image.fileId);
    if(!file)throw new Error(`No se encuentra la imagen de «${image.name}». Vuelve a cargar el logotipo antes de generar el PDF.`);
    if(!/^image\/(png|jpe?g)$/i.test(file.type))throw new Error(`La imagen de «${image.name}» debe ser PNG o JPG. Vuelve a cargarla desde Bordados.`);
    try {
      const bytes=new Uint8Array(await file.blob.arrayBuffer());
      const raster=/png/i.test(file.type)?await doc.embedPng(bytes):await doc.embedJpg(bytes);
      // Force image parsing and alpha-mask creation before any output is returned.
      await raster.embed();
      embedded.set(image.fileId,raster);
    } catch {
      throw new Error(`La imagen de «${image.name}» está dañada o no se puede leer. Vuelve a cargar el logotipo antes de generar el PDF.`);
    }
  }
  return embedded;
}
