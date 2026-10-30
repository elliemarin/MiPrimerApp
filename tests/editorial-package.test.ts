import { createHash } from 'node:crypto';
import { strFromU8, unzipSync } from 'fflate';
import { describe, expect, it } from 'vitest';
import { findModel } from '../src/data/catalog';
import { projectFromModel } from '../src/store/projects';
import { buildEditorialBrief } from '../src/features/editorial/prompt';
import { buildEditorialPackage, editorialSourceKey } from '../src/features/editorial/package';
import type { EditorialAsset } from '../src/features/editorial/evidence';
import type { Fabric } from '../src/store/types';

const project = projectFromModel(findModel('bolsa-tote')!);
const sample: Fabric = { id: 'muestra', name: 'Tela fotografiada', kind: 'plano', composition: 'Algodón', color: '#24584A',
  visualRepeatMm: 130, grainAngle: 0, nap: 'sin-pelo', createdAt: '2026-10-30T00:00:00Z', updatedAt: '2026-10-30T00:00:00Z',
  photo: { originalFileId: 'original', processedFileId: 'procesada', pxW: 100, pxH: 100, adjust: { brightness: 0, contrast: 0, saturation: 0, warmth: 0 } } };
const imageBytes = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aSksAAAAASUVORK5CYII=', 'base64');
const asset: EditorialAsset = { id: 'referencia-01', name: 'hilvana-01-vistas.png', label: 'Vistas · hoja 1', kind: 'vistas',
  width: 1, height: 1, projectCodes: ['P1'], blob: new Blob([imageBytes], { type: 'image/png' }) };

describe('paquete local de referencias para ChatGPT', () => {
  it('entrega los PNG exactos y el prompt completo con sus huellas y sin un proyecto privado en bruto', async () => {
    const source = { ...project, name: 'CLIENTE_PRIVADO', notes: [{ id: 'nota', createdAt: project.createdAt, text: 'NOTA_PRIVADA', photoFileIds: [] }] };
    const brief = buildEditorialBrief({ projects: [source], fabrics: {}, title: 'Mi look' });
    const result = await buildEditorialPackage(brief, [asset]);
    const zip = unzipSync(new Uint8Array(await result.blob.arrayBuffer()));
    expect(Object.keys(zip).sort()).toEqual(['LEEME.txt', 'hilvana-01-vistas.png', 'manifest.json', 'prompt.txt']);
    expect(zip[asset.name]).toEqual(new Uint8Array(imageBytes));
    expect(strFromU8(zip['prompt.txt'])).toBe(brief.prompt);
    const manifest = JSON.parse(strFromU8(zip['manifest.json']));
    expect(manifest.assets[0].sha256).toBe(createHash('sha256').update(imageBytes).digest('hex'));
    expect(manifest.prompt.sha256).toBe(createHash('sha256').update(brief.prompt).digest('hex'));
    expect(result.imageFiles.map(file => file.name)).toEqual([asset.name]);
    expect(new Uint8Array(await result.imageFiles[0].arrayBuffer())).toEqual(new Uint8Array(imageBytes));
    const text = Object.entries(zip).filter(([name]) => !name.endsWith('.png')).map(([, bytes]) => strFromU8(bytes)).join('\n');
    expect(text).not.toContain('CLIENTE_PRIVADO');
    expect(text).not.toContain('NOTA_PRIVADA');
    expect(text).not.toContain('profileRef');
    expect(text).toContain('HILVANA_EDITORIAL_V1');
    expect(text).toContain('no son plantillas a escala');
  });

  it('invalida capturas al cambiar el diseño o la foto y permite seguir tomando notas sin falsear versiones', () => {
    const source = { ...project, fabricIds: [sample.id] };
    const settings = { title: 'Mi look', mood: '', lookNumber: 1 };
    const original = editorialSourceKey([source], { [sample.id]: sample }, settings);
    expect(editorialSourceKey([{ ...source, name: 'Otro título interno', exports: [], updatedAt: '2030-01-01', notes: [{ id: 'n', createdAt: '2030-01-01', text: 'Avance', photoFileIds: [] }] }], { [sample.id]: sample }, settings)).toBe(original);
    expect(editorialSourceKey([source], { [sample.id]: { ...sample, photo: { ...sample.photo!, processedFileId: 'nueva-foto' } } }, settings)).not.toBe(original);
    expect(editorialSourceKey([source], { [sample.id]: sample }, { ...settings, mood: 'Urbano' })).not.toBe(original);
    expect(editorialSourceKey([{ ...source, design: { ...source.design!, figurine: { body: 'curvas', age: 'adulto', skin: '#603d2f', hair: 'largo', hairColor: '#332720', garmentWidth: 147, garmentX: 0, garmentY: 282 } } }], { [sample.id]: sample }, settings)).not.toBe(original);
  });

  it('rechaza referencias vacías, nombres duplicados y archivos que no son PNG antes de compartir', async () => {
    const brief = buildEditorialBrief({ projects: [project], fabrics: {} });
    await expect(buildEditorialPackage(brief, [])).rejects.toThrow('imágenes');
    await expect(buildEditorialPackage(brief, [asset, asset])).rejects.toThrow('únicos');
    await expect(buildEditorialPackage(brief, [{ ...asset, name: '../privado.png' }])).rejects.toThrow('nombres');
    await expect(buildEditorialPackage(brief, [{ ...asset, blob: new Blob(['texto'], { type: 'image/png' }) }])).rejects.toThrow('correctamente');
    await expect(buildEditorialPackage(brief, [{ ...asset, blob: new Blob([], { type: 'image/png' }) }])).rejects.toThrow('PNG');
  });
});
