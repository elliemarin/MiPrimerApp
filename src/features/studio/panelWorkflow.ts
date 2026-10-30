import type { Fabric, Project } from '../../store/types';
import type { Piece } from '../../lib/pattern/types';
import type { PatternState, BuiltPattern } from '../../lib/pattern/engine';
import { buildPattern } from '../../lib/pattern/engine';
import { PanelCut, panelizePattern, pieceGeometryHash } from '../../lib/pattern/panels';
import { pieceSeamPath } from '../../lib/pattern/outline';
import { bboxOf, pointInPolygon, Pt } from '../../lib/geom/vec';
import { parseSvgPath } from '../../lib/draw/svgpath';
import { cmdsToPolylines } from '../../lib/draw/flatten';
import { uid, nowIso, stableHash } from '../../lib/ids';
import { makeVersion } from '../../store/projects';
import type { DesignDoc, DesignView, Fill } from './model';

export interface StudioPanelCut extends PanelCut { viewId: string; }

/** Always derive cuts from original physical pieces, never from a scaled flat. */
export function basePanelPattern(project: Project): BuiltPattern | undefined {
  if (!project.pattern) return undefined;
  return buildPattern({ ...project.pattern, panelCuts: undefined, panelMaterials: undefined });
}

export function panelPieceForView(project: Project, view: DesignView): Piece | undefined {
  if (view.source.type !== 'pieza') return undefined;
  const id = view.source.pieceId;
  return basePanelPattern(project)?.pieces.find(piece => piece.id === id && !project.pattern?.hidden.includes(id));
}

function physicalView(piece: Piece, built: BuiltPattern, previous?: DesignView): DesignView {
  const cut = built.cuts.get(piece.id);
  const b = bboxOf(cut?.points ?? piece.nodes);
  return {
    ...previous,
    id: previous?.id ?? uid('pieza-vista'), kind: 'pieza', label: `Patrón real · ${piece.name}`,
    source: { type: 'pieza', pieceId: piece.id },
    minX: b.minX - 20, minY: b.minY - 20,
    width: b.maxX - b.minX + 40, height: b.maxY - b.minY + 40,
    outline: pieceSeamPath(piece),
    zones: [{ id: `pieza-${piece.id}`, label: piece.name, type: 'otra', d: pieceSeamPath(piece) }],
    details: piece.lines.map(line => ({ d: `M${line.a.x} ${line.a.y} L${line.b.x} ${line.b.y}`, style: line.kind === 'doblez' ? 'doblez' : 'costura' })),
    seams: { center: (b.minX + b.maxX) / 2 }, refY: 0, refLabel: 'Origen de la pieza',
    photo: undefined, templateScale: undefined
  };
}

/** Idempotent preparation retains art/photos and the IDs of existing real views. */
export function preparePanelViews(project: Project, doc: DesignDoc): { doc: DesignDoc; viewId: string } {
  const built = basePanelPattern(project);
  if (!built || !built.pieces.length || built.missing.length) throw new Error('Este proyecto necesita un patrón base con medidas completas. Elige un modelo que genere patrón.');
  const errors = built.issues.filter(issue => issue.level === 'error');
  if (errors.length) throw new Error(`Revisa el patrón base antes de dividirlo: ${errors[0].message}`);
  const pieces = built.pieces.filter(piece => !project.pattern!.hidden.includes(piece.id));
  if (!pieces.length) throw new Error('El patrón no tiene piezas visibles para preparar.');
  const existing = new Map<string, DesignView>();
  for (const view of doc.views) if (view.source.type === 'pieza' && !existing.has(view.source.pieceId)) existing.set(view.source.pieceId, view);
  const prepared = pieces.map(piece => physicalView(piece, built, existing.get(piece.id)));
  const updates = new Map(prepared.map(view => [view.id, view]));
  const views = doc.views.map(view => updates.get(view.id) ?? view);
  for (const view of prepared) if (!doc.views.some(v => v.id === view.id)) views.push(view);
  // An explicit [] means cuts were removed; only absent data is restored from pattern.
  const panelCuts = doc.panelCuts ?? (project.pattern?.panelCuts ?? []).flatMap(cut => {
    const view = prepared.find(view => view.source.type === 'pieza' && view.source.pieceId === cut.pieceId);
    return view ? [{ ...cut, viewId: view.id }] : [];
  });
  let next: DesignDoc = { ...doc, views, panelCuts, updatedAt: nowIso() };
  // Preserve each old panel fill while rebuilding its exact geometry.
  next.views = next.views.map(view => {
    const old = doc.views.find(v => v.id === view.id);
    return old && updates.has(view.id) ? { ...view, zones: old.zones, zoneFills: old.zoneFills } : view;
  });
  for (const view of prepared) next = syncPanelZones(project, next, view.id);
  return { doc: next, viewId: prepared[0].id };
}

function pointInside(polys: Pt[][]): Pt | undefined {
  const points = polys.flat();
  if (!points.length) return undefined;
  const box = bboxOf(points);
  // Deterministic interior scan also works for concave panels whose centroid is outside.
  for (const fy of [.5,.25,.75,.1,.9]) for (const fx of [.5,.25,.75,.1,.9]) {
    const p = { x: box.minX + (box.maxX-box.minX)*fx, y: box.minY+(box.maxY-box.minY)*fy };
    if (polys.some(poly => pointInPolygon(p,poly))) return p;
  }
  return points[0];
}

function oldFill(view: DesignView, d: string): Fill | undefined {
  const p = pointInside(cmdsToPolylines(parseSvgPath(d), .1).map(poly => poly.pts));
  if (!p) return undefined;
  for (const zone of [...view.zones].reverse()) if (cmdsToPolylines(parseSvgPath(zone.d), .1).some(poly => pointInPolygon(p,poly.pts))) return view.zoneFills?.[zone.id];
  return undefined;
}

/** Painted panels are genuine split pieces, not independent overlapping rectangles. */
export function syncPanelZones(project: Project, doc: DesignDoc, viewId: string): DesignDoc {
  const view = doc.views.find(view => view.id === viewId);
  if (!view) return doc;
  const base = panelPieceForView(project, view);
  if (!base) return doc;
  const cuts = (doc.panelCuts ?? []).filter(cut => cut.pieceId === base.id);
  const result = panelizePattern([base], [], cuts);
  if (result.issues.some(issue => issue.level === 'error')) return doc;
  const zones = result.pieces.map(piece => ({ id: cuts.length ? `panel-${piece.id}` : `pieza-${base.id}`, label: piece.name, type: 'otra' as const, d: pieceSeamPath(piece) }));
  const zoneFills: Record<string,Fill> = {};
  for (const zone of zones) {
    const fill = view.zoneFills?.[zone.id] ?? oldFill(view, zone.d);
    if (fill) zoneFills[zone.id] = fill;
  }
  return { ...doc, views: doc.views.map(v => v.id === viewId ? { ...v, zones, zoneFills, outline: pieceSeamPath(base) } : v) };
}

export interface PanelPatternPreview {
  pattern?: PatternState;
  built?: BuiltPattern;
  errors: string[];
  cutCount: number;
  panelCount: number;
  baseCount: number;
}

/** Translate source exclusions to generated IDs, preserving unaffected pieces.
 * If topology changed, an excluded old panel conservatively excludes its source
 * descendants rather than silently becoming exportable. Exact old IDs survive
 * unchanged layouts; removing every cut maps exclusions back to the source. */
function panelExclusions(ids: string[] | undefined, next: BuiltPattern, previous: BuiltPattern): string[] | undefined {
  if(!ids)return undefined;
  const currentIds=new Set(next.pieces.map(piece=>piece.id));
  return [...new Set(ids.flatMap(id=>{
    if(currentIds.has(id))return [id];
    const source=Object.entries(previous.panelMapping??{}).find(([,children])=>children.includes(id))?.[0]??id;
    return next.panelMapping?.[source]??[source];
  }))];
}

export function panelPatternFromDesign(project: Project, doc: DesignDoc, fabrics: Record<string,Fabric> = {}): PanelPatternPreview {
  const cuts = doc.panelCuts ?? [];
  const fail = (errors: string[]): PanelPatternPreview => ({ errors: [...new Set(errors)], cutCount: cuts.length, panelCount: 0, baseCount: 0 });
  const original = project.pattern;
  const base = basePanelPattern(project);
  if (!original || !base || !base.pieces.length || base.missing.length) return fail(['Hace falta un patrón base con medidas completas. Una foto o un dibujo técnico no define por sí solo el patrón de confección.']);
  const baseErrors = base.issues.filter(issue => issue.level === 'error');
  if (baseErrors.length) return fail(baseErrors.map(issue => `Patrón base: ${issue.message}`));
  const represented = new Set(doc.views.flatMap(v => { if(v.source.type!=='pieza')return []; const id=v.source.pieceId; return base.pieces.some(p=>p.id===id)?[id]:[]; }));
  const errors: string[] = [];
  if (new Set(cuts.map(c=>c.id)).size !== cuts.length) errors.push('Hay cortes con identificadores repetidos. Elimina el duplicado antes de generar.');
  for (const cut of cuts) {
    const view = doc.views.find(view => view.id === cut.viewId);
    const piece = base.pieces.find(piece => piece.id === cut.pieceId);
    if (!view || view.source.type !== 'pieza' || view.source.pieceId !== cut.pieceId) errors.push('Un corte no está asociado a su pieza real. Prepara las piezas del patrón y vuelve a trazarlo.');
    else if (!piece || original.hidden.includes(piece.id)) errors.push('La pieza de un corte ya no está disponible en el patrón base.');
    else if (cut.baseHash !== pieceGeometryHash(piece)) errors.push(`Cambió la geometría de «${piece.name}». Prepara de nuevo las piezas y revisa o elimina sus cortes antiguos.`);
  }
  if (errors.length) return fail(errors);
  const retained = (original.panelCuts ?? []).filter(cut => !represented.has(cut.pieceId));
  const merged: PanelCut[] = [...retained, ...cuts.map(({viewId:_viewId,...cut})=>{ void _viewId;return cut;})];
  if (!merged.length && !(original.panelCuts?.length && represented.size)) return fail(['Prepara las piezas reales y dibuja un corte de un borde al otro antes de generar.']);
  let pattern: PatternState = { ...original, panelCuts: merged, panelMaterials: undefined };
  let built = buildPattern(pattern);
  const issues = built.issues.filter(issue => issue.level === 'error');
  if (issues.length) return fail(issues.map(issue=>issue.message));
  const materials: NonNullable<PatternState['panelMaterials']> = {};
  const ids = new Set(built.pieces.map(p=>p.id));
  for (const [id,material] of Object.entries(original.panelMaterials ?? {})) if(ids.has(id)) materials[id]=material;
  for (const view of doc.views) {
    if(view.source.type!=='pieza')continue;
    const updated=syncPanelZones(project,doc,view.id).views.find(v=>v.id===view.id)!;
    for(const zone of updated.zones) {
      if(!zone.id.startsWith('panel-'))continue;
      const id=zone.id.slice('panel-'.length), fill=updated.zoneFills?.[zone.id];
      if(!ids.has(id)||!fill||fill.type==='ninguno')continue;
      if(fill.type==='color')materials[id]={name:`Color ${fill.color.toUpperCase()}`,color:fill.color};
      if(fill.type==='tela')materials[id]={fabricId:fill.fabricId,name:fabrics[fill.fabricId]?.name??fill.fabricId,color:fabrics[fill.fabricId]?.color};
    }
  }
  const previousBuilt=buildPattern(original);
  pattern={...pattern,panelMaterials:materials,
    hidden:panelExclusions(original.hidden,built,previousBuilt)??[],
    noExport:panelExclusions(original.noExport,built,previousBuilt)};
  built=buildPattern(pattern);
  return { pattern,built,errors:built.issues.filter(i=>i.level==='error').map(i=>i.message),cutCount:merged.length,panelCount:built.pieces.length,baseCount:base.pieces.length };
}

/** Keep a recoverable snapshot before replacing any existing panel arrangement. */
export function applyPanelPattern(project: Project, pattern: PatternState): Project {
  if (!project.pattern) throw new Error('No hay un patrón base que reemplazar.');
  const errors=buildPattern(pattern).issues.filter(issue=>issue.level==='error');
  if(errors.length)throw new Error(`No se puede guardar el patrón: ${errors[0].message}`);
  if(stableHash(project.pattern)===stableHash(pattern))return project;
  const previous=project.pattern;
  const last=project.patternVersions[project.patternVersions.length-1];
  const versions=last?.hash===stableHash(previous)?project.patternVersions:[...project.patternVersions,makeVersion(project.patternVersions,previous,'Antes de generar paneles desde el estudio')];
  return {...project,pattern,patternVersions:versions,status:'patronaje',updatedAt:nowIso(),changeLog:[...project.changeLog,{at:nowIso(),text:`Patrón actualizado desde cortes del estudio (${pattern.panelCuts?.length??0} cortes).`} ]};
}
