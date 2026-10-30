import { FABRIC_LIBRARY, MATERIAL_LIBRARY, SWATCH_MOTIF_LABEL, swatchSvg, type SwatchMotif } from '../data/materialLibrary';
import { useApp } from '../store/app';
import type { Fabric, Material } from '../store/types';
import { nowIso, uid } from './ids';
import { canvasToBlob, loadBitmap } from './image';

/** Crea una muestra propia de la biblioteca; no simula un lote comprado o calibrado. */
export async function addLibraryFabric(entryId: string, color?: string, motif?: SwatchMotif): Promise<Fabric> {
  const entry = FABRIC_LIBRARY.find((f) => f.id === entryId);
  if (!entry) throw new Error('Esta tela no está en la biblioteca.');
  const chosenColor = color && /^#[\da-f]{6}$/i.test(color) ? color : entry.color;
  const chosenMotif = motif ?? entry.motif;
  const image = await loadBitmap(new Blob([swatchSvg(entry, chosenColor, chosenMotif)], { type: 'image/svg+xml' }));
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('No se pudo crear la muestra.');
  ctx.drawImage(image, 0, 0, 256, 256);
  const fileId = await useApp.getState().addFile(await canvasToBlob(canvas, 'image/png'), `${entry.name} (muestra ilustrativa).png`);
  const at = nowIso();
  const fabric: Fabric = {
    id: uid('tela'), name: `${entry.name}${chosenMotif === 'tejido' ? '' : ` · ${SWATCH_MOTIF_LABEL[chosenMotif]}`}`,
    kind: entry.kind, composition: entry.composition, color: chosenColor,
    // Rango orientativo permanece en notas; no inventar una medición de elasticidad ni existencias.
    photo: { originalFileId: fileId, processedFileId: fileId, adjust: { brightness: 0, contrast: 0, saturation: 0, warmth: 0 }, pxW: 256, pxH: 256 },
    visualRepeatMm: 100, grainAngle: 0, nap: entry.nap ? 'con-pelo' : 'sin-pelo',
    napDirection: entry.nap ? 'abajo' : undefined,
    notes: `Muestra ilustrativa de Hilvana (${entry.id}); trama y color de referencia, sin calibración ni existencias reales.\nGramaje orientativo: ${entry.weight.join('–')} g/m². Elasticidad orientativa: ${entry.stretch.join('–')} %. Caída ${entry.drape}.\nAguja: ${entry.needle}. ${entry.care}\n${entry.avoid}`,
    createdAt: at, updatedAt: at
  };
  useApp.getState().put('fabric', fabric);
  return fabric;
}

export function addLibraryMaterial(entryId: string): Material {
  const entry = MATERIAL_LIBRARY.find((m) => m.id === entryId);
  if (!entry) throw new Error('Este material no está en la biblioteca.');
  const at = nowIso();
  const material: Material = { id: uid('mat'), name: entry.name, category: entry.category, quantity: 0, unit: 'unidades', notes: `${entry.use}\nReferencia de biblioteca; registra la cantidad y unidad que tienes.`, createdAt: at, updatedAt: at };
  useApp.getState().put('material', material);
  return material;
}
