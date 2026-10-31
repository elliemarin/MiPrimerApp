import { uid, nowIso } from '../lib/ids';
import type { ExportDeps, ExportKind, ExportRecord, Profile, Project } from './types';
import { designHash, makeVersion, patternHash } from './projects';
import { APP_VERSION } from './app';

/**
 * Garantiza que exista una versión del patrón y del diseño que corresponda al
 * estado actual y devuelve el proyecto actualizado con sus dependencias.
 */
export function freezeDeps(p: Project, profiles: Record<string, Profile>, what: { pattern?: boolean; design?: boolean }): { project: Project; deps: ExportDeps } {
  let project = p;
  const deps: ExportDeps = {};
  if (what.pattern && p.pattern) {
    const h = patternHash(p.pattern);
    let v = p.patternVersions.find((x) => x.hash === h);
    if (!v) {
      v = makeVersion(p.patternVersions, p.pattern, `Exportación ${new Date().toLocaleDateString('es-MX')}`);
      project = { ...project, patternVersions: [...project.patternVersions, v] };
    }
    deps.pattern = { versionId: v.id, n: v.n, hash: h };
    const ref = p.pattern.measurementRef ?? p.profileRef;
    if (ref) {
      const prof = profiles[ref.profileId];
      const mv = prof?.versions.find((x) => x.id === ref.versionId);
      if (prof && mv) deps.measurement = { profileId: prof.id, versionId: mv.id, n: mv.n, profileName: prof.name };
    }
  }
  if (what.design && p.design) {
    const h = designHash(p.design);
    let v = p.designVersions.find((x) => x.hash === h);
    if (!v) {
      v = makeVersion(p.designVersions, p.design, `Exportación ${new Date().toLocaleDateString('es-MX')}`);
      project = { ...project, designVersions: [...project.designVersions, v] };
    }
    deps.design = { versionId: v.id, n: v.n, hash: h };
    const imageFileIds=[...new Set(p.design.elements.flatMap(element=>element.image?[element.image.fileId]:[]))].sort();
    if(imageFileIds.length)deps.imageFileIds=imageFileIds;
  }
  return { project, deps };
}

export function exportRecord(kind: ExportKind, fileId: string, fileName: string, settings: unknown, deps: ExportDeps): ExportRecord {
  return { id: uid('exp'), kind, createdAt: nowIso(), fileId, fileName, settings, deps, appVersion: APP_VERSION };
}

export function depsLines(p: Project, deps: ExportDeps): string[] {
  const lines = [`Proyecto: ${p.name}`];
  if (deps.measurement) lines.push(`Medidas: ${deps.measurement.profileName}, versión ${deps.measurement.n}`);
  if (deps.pattern) lines.push(`Patrón: versión ${deps.pattern.n} (huella ${deps.pattern.hash})`);
  if (deps.design) lines.push(`Diseño: versión ${deps.design.n} (huella ${deps.design.hash})`);
  lines.push(`Fecha: ${new Date().toLocaleString('es-MX')}`);
  lines.push(`Hilvana ${APP_VERSION}`);
  return lines;
}
