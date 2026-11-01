import type { Project } from '../../store/types';
import type { Drawable } from '../draw/drawable';
import { prepareSewingPack, type SewingPackCtx, type SewingPackPreview } from '../pdf/projectPack';
import { MEASURE_BY_KEY } from '../sizes/measurements';

export interface ProjectorGroup { id: string; title: string; drawables: Drawable[] }
export interface ProjectorSource { groups: ProjectorGroup[]; blockers: string[]; warnings: string[]; experimental: boolean }

/** What can be projected onto fabric: the real pattern pieces, applique
 * templates and embroidery guides, all at 1:1. Colour choices are not needed
 * to cut, so only problems of the pattern itself block projection. */
export function projectorSource(project: Project, ctx: SewingPackCtx, prepared?: SewingPackPreview): ProjectorSource {
  const preview = prepared ?? prepareSewingPack(project, ctx);
  const hidden = new Set([...(project.pattern?.hidden ?? []), ...(project.pattern?.noExport ?? [])]);
  const groups = preview.drawings
    .filter(drawing => drawing.id === 'patron' || drawing.id === 'aplicaciones' || drawing.id.startsWith('bordado-'))
    .map(drawing => ({ id: drawing.id, title: drawing.title, drawables: drawing.id === 'patron' ? drawing.drawables.filter(d => !hidden.has(d.id)) : drawing.drawables }))
    .filter(group => group.drawables.length > 0);
  const built = preview.built, blockers: string[] = [];
  if (built?.missing.length) blockers.push(`Completa las medidas: ${built.missing.map(key => MEASURE_BY_KEY[key]?.label ?? key).join(', ')}.`);
  if (built) blockers.push(...built.issues.filter(issue => issue.level === 'error').map(issue => issue.message));
  if (!groups.length) blockers.push('Este proyecto todavía no tiene piezas para proyectar. Elige una base con patrón en la biblioteca.');
  return { groups, blockers: [...new Set(blockers)], warnings: preview.warnings, experimental: preview.warnings.some(w => /experimental/i.test(w)) };
}
