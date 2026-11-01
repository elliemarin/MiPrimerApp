import { useApp } from '../../store/app';
import { depsLines, exportRecord, freezeDeps } from '../../store/exports';
import { slugify } from '../../lib/ids';
import { saveBlob } from '../../lib/download';
import type { SewingPackCtx } from '../../lib/pdf/projectPack';
import { buildProjectorPdf, DEFAULT_PROJECTOR_PDF, type ProjectorPdfOptions } from '../../lib/pdf/projector';
import { projectorSource } from '../../lib/projector/source';

/** Freezes versions like every other export, then saves and records the file. */
export async function downloadProjectorPdf(projectId: string, ctx: SewingPackCtx, opts: ProjectorPdfOptions = DEFAULT_PROJECTOR_PDF): Promise<{ pages: number; tooWide: string[] }> {
  const app = useApp.getState(), current = app.projects[projectId];
  if (!current) throw new Error('El proyecto ya no está disponible.');
  const { project, deps } = freezeDeps(current, app.profiles, { pattern: true, design: true });
  app.updateProject(projectId, () => project);
  const source = projectorSource(project, { ...ctx, deps });
  if (source.blockers.length) throw new Error(source.blockers.join('\n'));
  // Templates of different groups can share an element id; keep them distinct.
  const drawables = source.groups.flatMap(group => group.drawables.map(d => ({ ...d, id: `${group.id}/${d.id}` })));
  const result = await buildProjectorPdf(drawables, opts, {
    title: project.name, lines: depsLines(project, deps), footer: project.name,
    json: { format: 'hilvana-proyector-v1', projectId: project.id, scale: '1:1 mm', dependencies: deps, grupos: source.groups.map(g => ({ id: g.id, titulo: g.title, piezas: g.drawables.map(d => d.name) })) }
  });
  const filename = `${slugify(project.name)}-proyector-p${deps.pattern?.n ?? 0}-d${deps.design?.n ?? 0}.pdf`;
  const blob = new Blob([result.bytes], { type: 'application/pdf' });
  const fileId = await app.addFile(blob, filename);
  const record = exportRecord('pdf-proyector', fileId, filename, { ...opts, pages: result.pages.map(p => ({ w: p.w, h: p.h })) }, deps);
  app.updateProject(projectId, p => ({ ...p, exports: [...p.exports, record] }), `PDF para proyector exportado (${result.pages.length} ${result.pages.length === 1 ? 'hoja' : 'hojas'}).`);
  await saveBlob(blob, filename);
  return { pages: result.pages.length, tooWide: result.tooWide };
}
