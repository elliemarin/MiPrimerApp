import { strToU8, strFromU8, unzipSync, zipSync, Zippable } from 'fflate';
import { getFile, putFile } from './db';
import { useApp, referencedFileIds, APP_VERSION } from '../store/app';
import type { Fabric, Profile, Project, StoredFile } from '../store/types';
import { slugify, uid, nowIso } from './ids';
import { buildSummaryPdf } from './pdf/summary';
import { viewToSvg } from './draw/designSvg';
import { buildPattern } from './pattern/engine';
import { pieceDrawable } from './draw/drawable';
import { piecesSvg } from './draw/svgExport';
import { layoutMatrix } from './pattern/engine';
import { bboxOf } from './geom/vec';

const json = (v: unknown) => strToU8(JSON.stringify(v, null, 2));

function safeName(s: string) {
  return s.replace(/[\\/:*?"<>|]+/g, '-').slice(0, 80);
}

/** Proyecto completo y organizado en un ZIP, con resumen en PDF. */
export async function exportProjectZip(p: Project): Promise<Blob> {
  const s = useApp.getState();
  const root = `${slugify(p.name)}/`;
  const files: Zippable = {};
  const manifest: Record<string, string> = {};
  const addStored = async (id: string, folder: string, required=false) => {
    if (manifest[id]) return;
    const f = await getFile(id);
    if (!f) {
      if(required)throw new Error(`Falta una imagen del diseño (${id}). Vuelve a cargarla antes de exportar el proyecto completo.`);
      return;
    }
    const path = `${folder}/${id}-${safeName(f.name)}`;
    files[root + path] = [new Uint8Array(await f.blob.arrayBuffer()), { level: 0 }];
    manifest[id] = path;
  };
  for (const r of p.references) {
    await addStored(r.fileId, 'referencias');
    if (r.sourceFileId) await addStored(r.sourceFileId, 'referencias/originales');
    if (r.corrected) await addStored(r.corrected.fileId, 'referencias/corregidas');
  }
  for (const n of p.notes) for (const f of n.photoFileIds) await addStored(f, 'avances/fotos');
  for (const e of p.exports) await addStored(e.fileId, 'exportaciones');
  const docs = [p.design, ...p.designVersions.map((v) => v.data)].filter(Boolean);
  for (const d of docs) {
    for (const el of d!.elements) if (el.image) await addStored(el.image.fileId, 'diseno/imagenes',true);
    for (const v of d!.views) if (v.source.type === 'foto') await addStored(v.source.fileId, 'referencias');
  }
  const profileIds = new Set<string>();
  if (p.profileRef) profileIds.add(p.profileRef.profileId);
  if (p.pattern?.measurementRef) profileIds.add(p.pattern.measurementRef.profileId);
  const profiles: Profile[] = [...profileIds].map((id) => s.profiles[id]).filter(Boolean);
  const fabricIds = new Set(p.fabricIds);
  for (const d of docs) for (const el of d!.elements) if (el.fill.type === 'tela') fabricIds.add(el.fill.fabricId);
  for (const d of docs) for (const v of d!.views) for (const f of Object.values(v.zoneFills ?? {})) if (f.type === 'tela') fabricIds.add(f.fabricId);
  const fabrics: Fabric[] = [...fabricIds].map((id) => s.fabrics[id]).filter(Boolean);
  for (const f of fabrics) {
    if (f.photo) {
      await addStored(f.photo.originalFileId, 'telas/originales');
      if (f.photo.processedFileId) await addStored(f.photo.processedFileId, 'telas/muestras');
    }
  }
  files[root + 'proyecto.json'] = json(p);
  files[root + 'medidas/perfiles.json'] = json(profiles);
  files[root + 'telas/telas.json'] = json(fabrics);
  files[root + 'materiales/materiales.json'] = json({ usos: p.materialUses, biblioteca: Object.values(s.materials) });
  files[root + 'archivos.json'] = json(manifest);
  if (p.pattern) {
    files[root + 'patron/patron-actual.json'] = json(p.pattern);
    for (const v of p.patternVersions) files[root + `patron/versiones/v${v.n}${v.approved ? '-aprobada' : ''}.json`] = json(v);
    try {
      const built = buildPattern(p.pattern);
      if (built.pieces.length) {
        const ds = built.pieces.map((pc) => {
          const c = built.cuts.get(pc.id)!;
          const b = bboxOf(c.points);
          return pieceDrawable(pc, c, layoutMatrix(p.pattern!.layout[pc.id], { x: (b.minX + b.maxX) / 2, y: (b.minY + b.maxY) / 2 }));
        });
        files[root + 'patron/patron-actual-1a1.svg'] = strToU8(piecesSvg(ds, `${p.name} · patrón actual`));
      }
    } catch {
      /* el patrón se conserva en JSON */
    }
  }
  if (p.design) {
    files[root + 'diseno/diseno-actual.json'] = json(p.design);
    for (const v of p.designVersions) files[root + `diseno/versiones/v${v.n}${v.approved ? '-aprobada' : ''}.json`] = json(v);
    const imageUrls=Object.fromEntries(Object.entries(manifest).map(([id,path])=>[id,`../../${path.split('/').map(encodeURIComponent).join('/')}`]));
    for (const v of p.design.views) files[root + `diseno/vistas/${safeName(v.label)}.svg`] = strToU8(viewToSvg(p.design, v, s.fabrics,imageUrls));
  }
  files[root + 'avances/notas.json'] = json(p.notes);
  try {
    const pdf = await buildSummaryPdf(p, { profiles: s.profiles, fabrics: s.fabrics, materials: s.materials, unit: s.settings.unit });
    files[root + 'resumen.pdf'] = [pdf, { level: 0 }];
  } catch (e) {
    files[root + 'resumen-error.txt'] = strToU8(`No se pudo generar el resumen: ${e instanceof Error ? e.message : e}`);
  }
  files[root + 'LEEME.txt'] = strToU8(
    [
      `Proyecto: ${p.name}`,
      `Exportado: ${new Date().toLocaleString('es-MX')} con Hilvana ${APP_VERSION}`,
      '',
      'Contenido:',
      '- resumen.pdf: ficha del proyecto con vistas, medidas, materiales, plano de corte y guía.',
      '- proyecto.json: todos los datos editables (para volver a abrirlo en Hilvana: Proyectos → Importar ZIP).',
      '- referencias/: fotos, PDF originales y versiones corregidas.',
      '- medidas/: perfiles y todas sus versiones.',
      '- patron/: patrón actual, versiones y un SVG a escala 1:1 en milímetros.',
      '- diseno/: diseño actual, versiones y vistas en SVG.',
      '- telas/: fichas de telas con fotos originales y muestras procesadas.',
      '- exportaciones/: PDFs y archivos generados, con sus versiones en proyecto.json.',
      '- avances/: notas y fotos del proceso.'
    ].join('\n')
  );
  const out = zipSync(files, { level: 6 });
  return new Blob([out], { type: 'application/zip' });
}

/** Importa un ZIP exportado por Hilvana. Devuelve el id del proyecto creado. */
export async function importProjectZip(file: File): Promise<string> {
  const data = unzipSync(new Uint8Array(await file.arrayBuffer()));
  const names = Object.keys(data);
  const projPath = names.find((n) => /(^|\/)proyecto\.json$/.test(n));
  if (!projPath) throw new Error('El ZIP no contiene proyecto.json: no parece exportado por Hilvana.');
  const root = projPath.slice(0, projPath.length - 'proyecto.json'.length);
  const read = <T,>(p: string, fallback: T): T => (data[root + p] ? (JSON.parse(strFromU8(data[root + p])) as T) : fallback);
  const s = useApp.getState();
  let project = read<Project | null>('proyecto.json', null)!;
  const manifest = read<Record<string, string>>('archivos.json', {});
  const existing = new Set(Object.keys(manifest).length ? (await Promise.all(Object.keys(manifest).map(async (id) => ((await getFile(id)) ? id : null)))).filter(Boolean) as string[] : []);
  // Restaura archivos con su mismo id (si ya existen, se conservan).
  for (const [id, path] of Object.entries(manifest)) {
    if (existing.has(id)) continue;
    const bytes = data[root + path];
    if (!bytes) continue;
    const name = path.split('/').pop()!.replace(`${id}-`, '');
    const type = /\.png$/i.test(name) ? 'image/png' : /\.jpe?g$/i.test(name) ? 'image/jpeg' : /\.pdf$/i.test(name) ? 'application/pdf' : /\.svg$/i.test(name) ? 'image/svg+xml' : /\.zip$/i.test(name) ? 'application/zip' : 'application/octet-stream';
    const f: StoredFile = { id, name, type, size: bytes.length, createdAt: nowIso(), blob: new Blob([bytes], { type }) };
    await putFile(f);
  }
  for (const pr of read<Profile[]>('medidas/perfiles.json', [])) {
    const cur = s.profiles[pr.id];
    if (!cur) s.put('profile', pr);
    else {
      // Fusiona versiones que no existan localmente.
      const ids = new Set(cur.versions.map((v) => v.id));
      const extra = pr.versions.filter((v) => !ids.has(v.id));
      if (extra.length) s.put('profile', { ...cur, versions: [...cur.versions, ...extra].sort((a, b) => a.n - b.n) });
    }
  }
  for (const f of read<Fabric[]>('telas/telas.json', [])) if (!s.fabrics[f.id]) s.put('fabric', f);
  if (s.projects[project.id]) {
    project = { ...project, id: uid('proy'), name: `${project.name} (importado)` };
  }
  project = { ...project, changeLog: [...project.changeLog, { at: nowIso(), text: `Importado desde ${file.name}.` }] };
  s.put('project', project);
  await s.saveNow();
  return project.id;
}

export { referencedFileIds };
