import { uid, nowIso, stableHash } from '../lib/ids';
import type { CatalogModel } from '../data/catalog';
import { getFlat } from '../ui/FlatArt';
import type { DesignDoc, DesignView } from '../features/studio/model';
import { newDesign } from '../features/studio/model';
import { parseSvgPath } from '../lib/draw/svgpath';
import { cmdsToSvg, transformCmds } from '../lib/draw/paths';
import type { MeasureValues } from '../lib/sizes/measurements';
import type { PersonKind } from '../lib/sizes/tables';
import { newPatternState, PatternState } from '../lib/pattern/engine';
import { getGenerator } from '../lib/pattern/generators';
import type { Params } from '../lib/pattern/generator';
import type { Profile, Project, ProjectOrigin, VersionRecord } from './types';

export function blankProject(name: string, origin: ProjectOrigin): Project {
  const t = nowIso();
  return {
    id: uid('proy'),
    name,
    status: 'idea',
    archived: false,
    createdAt: t,
    updatedAt: t,
    origin,
    references: [],
    fabricType: 'plano',
    stretch: 0,
    fit: 'regular',
    patternVersions: [],
    designVersions: [],
    fabricIds: [],
    materialUses: [],
    guide: { checks: {}, notes: {} },
    notes: [],
    exports: [],
    changeLog: [{ at: t, text: 'Proyecto creado.' }]
  };
}

export function currentValues(profile: Profile): MeasureValues {
  return profile.versions.find((v) => v.id === profile.currentVersionId)?.values ?? {};
}

/** Escala aproximada de la plantilla según las medidas de la persona. */
export function templateScaleFor(model: CatalogModel, kind: PersonKind | undefined, body: MeasureValues | undefined): { sx: number; sy: number; basis: string } {
  if (model.flat.family === 'bolso' || model.flat.family === 'accesorio') return { sx: 1, sy: 1, basis: 'Tamaño de referencia del modelo' };
  const bottoms = model.flat.family === 'pantalon' || model.flat.family === 'falda';
  if (body) {
    const circ = bottoms ? body.cadera : body.pecho;
    const ref = bottoms ? 1000 : 920;
    const h = body.estatura;
    if (circ) {
      const sx = circ / ref;
      // La estatura se guarda en mm; la plantilla de referencia corresponde a 1680 mm.
      const sy = h ? h / 1680 : sx;
      return { sx, sy, basis: `Escalada por ${bottoms ? 'cadera' : 'pecho'}${h ? ' y estatura' : ''} del perfil (aproximada)` };
    }
  }
  const k = kind ?? 'mujer';
  const d = { bebe: [0.48, 0.38], toddler: [0.58, 0.5], infantil: [0.72, 0.72], mujer: [1, 1], hombre: [1.04, 1.05], otro: [1, 1] }[k];
  return { sx: d[0], sy: d[1], basis: 'Escala orientativa por tipo de persona' };
}

function scalePath(d: string, sx: number, sy: number): string {
  return cmdsToSvg(transformCmds(parseSvgPath(d), [sx, 0, 0, sy, 0, 0]));
}

export function viewsFromModel(model: CatalogModel, scale = { sx: 1, sy: 1, basis: 'Talla de referencia' }): DesignView[] {
  const flat = getFlat(model.id, model.flat);
  const { sx, sy } = scale;
  return flat.views.map((v) => ({
    id: uid('vista'),
    kind: v.key,
    label: { frente: 'Frente', espalda: 'Espalda', 'costado-der': 'Costado der.', 'costado-izq': 'Costado izq.' }[v.key],
    source: { type: 'plantilla', flatId: model.id, view: v.key },
    minX: v.minX * sx,
    minY: v.minY * sy,
    width: v.width * sx,
    height: v.height * sy,
    zones: v.zones.map((z) => ({ ...z, d: scalePath(z.d, sx, sy) })),
    details: v.details.map((x) => ({ ...x, d: scalePath(x.d, sx, sy) })),
    dots: v.dots.map((p) => ({ x: p.x * sx, y: p.y * sy, r: p.r * Math.min(sx, sy) })),
    refY: v.refY * sy,
    refLabel: v.refLabel,
    seams: { left: v.seams.left !== undefined ? v.seams.left * sx : undefined, right: v.seams.right !== undefined ? v.seams.right * sx : undefined, center: v.seams.center !== undefined ? v.seams.center * sx : undefined },
    templateScale: scale
  }));
}

export function patternFor(model: CatalogModel, profile: Profile | undefined, fabric: Project['fabricType'], stretch: number, fit: Project['fit']): PatternState | undefined {
  if (!model.generatorId) return undefined;
  const gen = getGenerator(model.generatorId);
  if (!gen) return undefined;
  const body = profile ? currentValues(profile) : {};
  const ctx = { kind: profile?.kind ?? 'mujer', fabric, stretch, fit };
  const state = newPatternState(model.generatorId, body, ctx);
  const params: Params = { ...(model.params ?? {}) };
  if (params.largoRelativo === 'short') {
    delete params.largoRelativo;
    if (body.tiro && body.entrepierna) params.largo = Math.round(body.tiro + body.entrepierna * 0.22);
  }
  state.params = params;
  if (profile) state.measurementRef = { profileId: profile.id, versionId: profile.currentVersionId };
  return state;
}

export function projectFromModel(model: CatalogModel, profile?: Profile): Project {
  const p = blankProject(model.name, model.studioOnly ? 'intervencion' : 'catalogo');
  p.modelId = model.id;
  p.fabricType = model.fabrics[0];
  p.stretch = model.fabrics[0] === 'punto' ? 30 : 0;
  p.fit = model.fits.includes('regular') ? 'regular' : model.fits[0];
  if (profile) {
    p.profileRef = { profileId: profile.id, versionId: profile.currentVersionId };
    if (profile.fabric) p.fabricType = profile.fabric;
  }
  p.pattern = patternFor(model, profile, p.fabricType, p.stretch, p.fit);
  const scale = templateScaleFor(model, profile?.kind, profile ? currentValues(profile) : undefined);
  p.design = newDesign(viewsFromModel(model, scale));
  p.status = p.pattern ? 'patronaje' : 'diseno';
  return p;
}

export function makeVersion<T>(prev: VersionRecord<T>[], data: T, label: string): VersionRecord<T> {
  const n = (prev[prev.length - 1]?.n ?? 0) + 1;
  // La huella de un diseño excluye su fecha de modificación (igual que designHash).
  const isDesign = !!data && typeof data === 'object' && 'views' in (data as object) && 'elements' in (data as object);
  const hash = isDesign ? designHash(data as unknown as DesignDoc) : stableHash(data);
  return { id: uid('ver'), n, createdAt: nowIso(), label, approved: false, hash, data: JSON.parse(JSON.stringify(data)) };
}

export function designHash(d: DesignDoc | undefined) {
  if (!d) return '';
  const { updatedAt: _u, ...rest } = d;
  void _u;
  return stableHash(rest);
}

export function patternHash(p: PatternState | undefined) {
  return p ? stableHash(p) : '';
}
