import { strToU8, zipSync } from 'fflate';
import { slugify, stableHash } from '../../lib/ids';
import type { Fabric, Project } from '../../store/types';
import type { EditorialAsset } from './evidence';
import type { EditorialBrief } from './prompt';

/** Local invalidation only. Progress notes, profiles and exports are not sources. */
export function editorialSourceKey(projects: readonly Project[], fabrics: Record<string, Fabric>, settings: { title: string; mood: string; lookNumber: number }): string {
  const ids = new Set<string>();
  for (const project of projects) {
    const fills = [...(project.design?.views.flatMap(view => Object.values(view.zoneFills ?? {})) ?? []), ...(project.design?.elements.map(element => element.fill) ?? [])];
    for (const fill of fills) if (fill.type === 'tela') ids.add(fill.fabricId);
    for (const id of project.fabricIds) ids.add(id);
  }
  return stableHash({ settings, projects: projects.map(project => ({ id: project.id, modelId: project.modelId, fit: project.fit,
    fabricType: project.fabricType, pattern: project.pattern, design: project.design })),
    fabrics: [...ids].sort().map(id => { const fabric = fabrics[id]; return fabric ? { id, color: fabric.color, name: fabric.name,
      composition: fabric.composition, kind: fabric.kind, photo: fabric.photo, calibration: fabric.calibration, visualRepeatMm: fabric.visualRepeatMm } : { id }; }) });
}

async function sha256(bytes: Uint8Array): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
}

export async function buildEditorialPackage(brief: EditorialBrief, assets: readonly EditorialAsset[]) {
  if (!assets.length) throw new Error('No se pudieron preparar imágenes de referencia.');
  const files = new Map<string, Uint8Array>();
  const manifestAssets = [];
  for (const asset of assets) {
    if (!/^[a-zA-Z0-9_-]+\.png$/.test(asset.name) || files.has(asset.name)) throw new Error('Las referencias necesitan nombres únicos de imagen PNG.');
    if (asset.blob.type !== 'image/png' || !asset.blob.size || asset.blob.size > 20 * 1024 * 1024) throw new Error('Cada referencia debe ser una imagen PNG de hasta 20 MB.');
    const bytes = new Uint8Array(await asset.blob.arrayBuffer());
    if (![137,80,78,71,13,10,26,10].every((byte, index) => bytes[index] === byte)) throw new Error('Una imagen de referencia no se pudo generar correctamente.');
    files.set(asset.name, bytes);
    manifestAssets.push({ name: asset.name, label: asset.label, kind: asset.kind, width: asset.width, height: asset.height,
      projectCodes: asset.projectCodes, bytes: bytes.length, sha256: await sha256(bytes) });
  }
  const promptBytes = strToU8(brief.prompt);
  const manifest = { format: 'hilvana-editorial-v1', styleId: brief.styleId, title: brief.title, lookNumber: brief.lookNumber,
    prompt: { name: 'prompt.txt', sha256: await sha256(promptBytes) },
    projects: brief.projects.map(project => ({ code: project.code, name: project.name, modelId: project.modelId })),
    assets: manifestAssets,
    note: 'Referencias visuales para una imagen editorial. Las miniaturas de patrones no son plantillas a escala.' };
  files.set('prompt.txt', promptBytes);
  files.set('manifest.json', strToU8(JSON.stringify(manifest, null, 2)));
  files.set('LEEME.txt', strToU8(`LÁMINA DE DISEÑO · HILVANA\n\n1. Abre ChatGPT con tu cuenta.\n2. Adjunta todas las imágenes PNG de este paquete.\n3. Copia y pega el contenido de prompt.txt.\n4. Revisa las referencias y envía para generar la imagen.\n\nEl estilo fijo está identificado como ${brief.styleId}. La composición puede variar entre generaciones.\nLas referencias y miniaturas son visuales; usa el PDF de confección de Hilvana para cortar a escala.\n`));
  const bytes = zipSync(Object.fromEntries(files), { level: 0 });
  return { blob: new Blob([bytes], { type: 'application/zip' }), filename: `${slugify(brief.lookLabel)}-${slugify(brief.title)}-chatgpt.zip`, manifest,
    imageFiles: assets.map(asset => new File([asset.blob], asset.name, { type: 'image/png' })) };
}
