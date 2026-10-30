import { stableHash } from '../../lib/ids';
import type { ExportRecord, Profile, Project } from '../../store/types';
import { designHash, patternHash } from '../../store/projects';

export interface Alert {
  id: string;
  level: 'aviso' | 'error';
  text: string;
  action?: 'actualizar-medidas' | 'ver-exportaciones' | 'ver-versiones' | 'abrir-patron';
}

/** ¿Qué documentos de la exportación ya no corresponden al estado actual? */
export function exportOutdated(e: ExportRecord, p: Project): string[] {
  const out: string[] = [];
  if (e.deps.pattern && p.pattern && e.deps.pattern.hash !== patternHash(p.pattern)) out.push('patrón');
  if (e.deps.design && p.design && e.deps.design.hash !== designHash(p.design)) out.push('diseño');
  if (e.deps.measurement && p.profileRef && e.deps.measurement.versionId !== p.profileRef.versionId) out.push('medidas');
  return out;
}

export function projectAlerts(p: Project, profiles: Record<string, Profile>): Alert[] {
  const alerts: Alert[] = [];
  if (p.profileRef) {
    const prof = profiles[p.profileRef.profileId];
    if (!prof) alerts.push({ id: 'perfil-borrado', level: 'error', text: 'El perfil de medidas vinculado ya no existe. El patrón conserva una copia de las medidas.' });
    else {
      const linked = prof.versions.find((v) => v.id === p.profileRef!.versionId);
      const current = prof.versions.find((v) => v.id === prof.currentVersionId);
      if (current && linked && current.id !== linked.id)
        alerts.push({ id: 'medidas-nuevas', level: 'aviso', text: `${prof.name} tiene medidas nuevas (versión ${current.n}). El proyecto usa la versión ${linked.n}.`, action: 'actualizar-medidas' });
      if (p.pattern && linked && stableHash(p.pattern.body) !== stableHash(linked.values))
        alerts.push({ id: 'medidas-distintas', level: 'aviso', text: 'El patrón usa medidas distintas a las de la versión vinculada. Revisa antes de exportar.', action: 'abrir-patron' });
    }
  }
  const outdated = p.exports.filter((e) => exportOutdated(e, p).length);
  if (outdated.length) alerts.push({ id: 'exportaciones', level: 'aviso', text: `${outdated.length} ${outdated.length === 1 ? 'exportación quedó desactualizada' : 'exportaciones quedaron desactualizadas'} tras cambios en el proyecto.`, action: 'ver-exportaciones' });
  const lastP = p.patternVersions[p.patternVersions.length - 1];
  if (lastP?.approved && p.pattern && lastP.hash !== patternHash(p.pattern)) alerts.push({ id: 'patron-aprobado', level: 'aviso', text: `El patrón cambió desde la versión aprobada ${lastP.n}. Guarda una versión nueva cuando lo revises.`, action: 'ver-versiones' });
  const lastD = p.designVersions[p.designVersions.length - 1];
  if (lastD?.approved && p.design && lastD.hash !== designHash(p.design)) alerts.push({ id: 'diseno-aprobado', level: 'aviso', text: `El diseño cambió desde la versión aprobada ${lastD.n}.`, action: 'ver-versiones' });
  return alerts;
}
