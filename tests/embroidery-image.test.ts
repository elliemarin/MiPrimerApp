import 'fake-indexeddb/auto';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { createImageEmbroidery, embroideryImageSize, importEmbroideryImage, validateEmbroideryImage } from '../src/features/simple/embroideryImage';
import { buildEditorialBrief } from '../src/features/editorial/prompt';
import { newDesign } from '../src/features/studio/model';
import { allFileIds, getFile, loadAll } from '../src/lib/db';
import { exportProjectZip, importProjectZip } from '../src/lib/zip';
import { referencedFileIds, useApp } from '../src/store/app';
import { blankProject } from '../src/store/projects';

const imported = { fileId: 'logo-file', name: 'Mi marca', widthPx: 800, heightPx: 400 };
// Two RGBA pixels: opaque red, then transparent. Real PNG, safe for PDF/ZIP readers.
const png = Uint8Array.from(Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAIAAAABCAYAAAD0In+KAAAAD0lEQVR4nGP4z8AARAwMAAz8Af9c/RSVAAAAAElFTkSuQmCC', 'base64'));

describe('logotipos e imágenes en bordados', () => {
  it.each(['image/png', 'image/jpeg', 'image/webp', 'image/heic', 'image/heif', 'image/avif'])('acepta %s', type => {
    expect(() => validateEmbroideryImage({ type, name: 'mi-imagen', size: 1000 })).not.toThrow();
  });

  it('admite archivos sin MIME con extensión reconocible y rechaza archivos ajenos', () => {
    expect(() => validateEmbroideryImage({ type: '', name: 'Mi marca.PNG', size: 1000 })).not.toThrow();
    expect(() => validateEmbroideryImage({ type: 'application/pdf', name: 'logo.pdf', size: 1000 })).toThrow('PNG, JPG o WebP');
    expect(() => validateEmbroideryImage({ type: 'image/svg+xml', name: 'logo.svg', size: 1000 })).toThrow('PNG, JPG o WebP');
    expect(() => validateEmbroideryImage({ type: '', name: 'archivo', size: 1000 })).toThrow('PNG, JPG o WebP');
  });

  it('da una explicación para imágenes vacías o demasiado grandes antes de abrirlas', async () => {
    await expect(importEmbroideryImage(new File([], 'logo.png', { type: 'image/png' }))).rejects.toThrow('vacía');
    expect(() => validateEmbroideryImage({ type: 'image/png', name: 'logo.png', size: 41 * 1024 * 1024 })).toThrow('40 MB');
  });

  it('reduce fotos grandes proporcionalmente y conserva las pequeñas', () => {
    expect(embroideryImageSize(6000, 4000)).toEqual({ width: 2400, height: 1600 });
    expect(embroideryImageSize(4000, 6000)).toEqual({ width: 1600, height: 2400 });
    expect(embroideryImageSize(800, 400)).toEqual({ width: 800, height: 400 });
    expect(() => embroideryImageSize(0, 400)).toThrow('tamaño válido');
    expect(() => embroideryImageSize(400, Infinity)).toThrow('tamaño válido');
  });

  it('crea un objeto movible con imagen propia, proporción física y transparencia sin relleno', () => {
    const result = createImageEmbroidery(imported, 'frente', 12.4, -8.7, 92.5);
    const group = result.elements.find(element => element.id === result.groupId)!;
    const image = result.elements.find(element => element.parentId === group.id)!;
    expect(result.width).toBe(92.5);
    expect(result.height).toBe(46.25);
    expect(group).toMatchObject({ kind: 'grupo', embroidery: { kind: 'image' }, name: 'Logo · Mi marca' });
    expect(image).toMatchObject({ kind: 'imagen', image: { fileId: 'logo-file', naturalW: 800, naturalH: 400 } });
    for (const element of result.elements) {
      expect(element).toMatchObject({ viewId: 'frente', x: 12.4, y: -8.7, w: 92.5, h: 46.25, technique: 'bordado', allowance: 0, fill: { type: 'ninguno' } });
      expect(element.vectorPath).toBeUndefined();
    }
    expect(createImageEmbroidery(imported, 'frente', 0, 0).groupId).not.toBe(group.id);
    expect(createImageEmbroidery({ ...imported, widthPx: 400, heightPx: 800 }, 'frente', 0, 0, 30).height).toBe(60);
  });

  it('rechaza tamaños o posiciones inválidos antes de modificar un diseño', () => {
    expect(() => createImageEmbroidery(imported, 'frente', NaN, 0)).toThrow('posición válida');
    expect(() => createImageEmbroidery(imported, 'frente', 0, 0, 0)).toThrow('ancho');
    expect(() => createImageEmbroidery(imported, 'frente', 0, 0, 1001)).toThrow('ancho');
    expect(() => createImageEmbroidery({ ...imported, heightPx: 0 }, 'frente', 0, 0)).toThrow('no está lista');
    expect(() => createImageEmbroidery({ ...imported, fileId: '' }, 'frente', 0, 0)).toThrow('no está lista');
  });

  it('incluye el logo una sola vez en la ficha editorial y conserva sus colores en las capturas', () => {
    const project = blankProject('Chaleco con mi marca', 'base');
    project.design = newDesign();
    project.design.elements = createImageEmbroidery(imported, 'frente', 20, 30, 80).elements;
    const brief = buildEditorialBrief({ projects: [project], fabrics: {} });
    expect(brief.projects[0].embroideries).toHaveLength(1);
    expect(brief.projects[0].embroideries[0]).toMatchObject({ kind: 'image', widthMm: 80, heightMm: 40, colors: [] });
    expect(brief.prompt).toContain('Conserva los logotipos que la persona haya colocado');
    expect(brief.prompt).toContain('conserva sus colores, letras y transparencia');
  });
});

describe('archivos de bordados guardados y exportados', () => {
  beforeAll(() => vi.stubGlobal('window', new EventTarget()));
  afterAll(() => vi.unstubAllGlobals());
  beforeEach(async () => {
    await useApp.getState().init();
    await useApp.getState().wipe();
  });

  it('no deja un archivo huérfano cuando el navegador rechaza una imagen corrupta', async () => {
    const originalImage = globalThis.Image;
    vi.stubGlobal('Image', class { async decode() { throw new Error('decode failed'); } });
    const revoke = vi.spyOn(URL, 'revokeObjectURL');
    try {
      await expect(importEmbroideryImage(new File(['corrupta'], 'logo.png', { type: 'image/png' }))).rejects.toThrow('No se pudo abrir esta imagen');
      expect(await allFileIds()).toEqual([]);
      expect(revoke).toHaveBeenCalledTimes(1);
    } finally {
      vi.stubGlobal('Image', originalImage);
      revoke.mockRestore();
    }
  });

  it('recupera archivo, proporción, grupo y copia PNG tras guardar y restaurar el ZIP', async () => {
    const fileId = await useApp.getState().addFile(new Blob([png], { type: 'image/png' }), 'Mi marca (bordado).png');
    const project = blankProject('Prueba de logo', 'base');
    project.design = newDesign([{ id: 'frente', kind: 'frente', label: 'Frente', source: { type: 'vacia' }, minX: 0, minY: 0, width: 200, height: 200, zones: [], refY: 0, refLabel: 'Arriba' }]);
    const insertion = createImageEmbroidery({ fileId, name: 'Mi marca', widthPx: 2, heightPx: 1 }, 'frente', 100, 100, 70);
    project.design.elements = insertion.elements;
    useApp.getState().put('project', project);
    expect(await useApp.getState().saveNow()).toBe(true);
    expect(referencedFileIds(useApp.getState())).toContain(fileId);
    expect(await useApp.getState().collectGarbage()).toBe(0);
    const persisted = (await loadAll()).projects.find(saved => saved.id === project.id)!;
    expect(persisted.design?.elements).toEqual(insertion.elements);

    const exported = await exportProjectZip(persisted);
    await useApp.getState().wipe();
    expect(await getFile(fileId)).toBeUndefined();
    const restoredId = await importProjectZip(new File([exported], 'mi-logo.zip', { type: 'application/zip' }));
    const restored = useApp.getState().projects[restoredId];
    expect(restored.design?.elements).toEqual(insertion.elements);
    const stored = await getFile(fileId);
    expect(stored).toMatchObject({ id: fileId, name: 'Mi marca (bordado).png', type: 'image/png', size: png.length });
    expect(new Uint8Array(await stored!.blob.arrayBuffer())).toEqual(png);
    expect(useApp.getState().fabrics).toEqual({});
  });
});
