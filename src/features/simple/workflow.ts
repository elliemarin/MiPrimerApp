import type { Fabric, Project } from '../../store/types';
import { elementCorners, newDesign, type DesignDoc, type DesignView, type Fill } from '../studio/model';
import { pointInPolygon, distToSegment } from '../../lib/geom/vec';
import { cmdsToPolylines } from '../../lib/draw/flatten';
import { parseSvgPath } from '../../lib/draw/svgpath';
import { basePanelPattern, preparePanelViews } from '../studio/panelWorkflow';
import { pieceSeamPath } from '../../lib/pattern/outline';
import { componentElementId, componentPaintRoles, reconcileComponentDesign } from '../customize/componentDesign';
import { getGenerator } from '../../lib/pattern/generators';

export function simpleViews(doc: DesignDoc): DesignView[] {
  const physical = doc.views.filter(view => view.source.type === 'pieza' && !view.source.pieceId.startsWith('componente-'));
  return physical.length ? physical : doc.views.filter(view => view.source.type !== 'pieza');
}

/** Real source-piece coordinates are the common space for placement and printing. */
export function prepareSimpleProject(project: Project): Project {
  let design = project.design ?? newDesign();
  if (project.pattern && getGenerator(project.pattern.generatorId)) {
    const base = { ...project, pattern: { ...project.pattern, components: undefined } };
    design = preparePanelViews(base, design).doc;
    design = { ...design, views: design.views.map(view => view.source.type === 'pieza' ? { ...view, label: view.label.replace(/^Patrón real · /, '') } : view) };
  }
  return { ...project, design: { ...design, simpleWorkflow: true, materialChoices: design.materialChoices ?? {} } };
}

/** A changed size must not leave an old contour behind a physical placement grid. */
export function physicalViewsNeedRefresh(project: Project): boolean {
  if (!project.design?.simpleWorkflow || !project.pattern || !getGenerator(project.pattern.generatorId)) return false;
  const base = basePanelPattern({ ...project, pattern: { ...project.pattern, components: undefined } });
  if (!base?.pieces.length) return true;
  return base.pieces.some(piece => !project.design!.views.some(view => view.source.type === 'pieza' && view.source.pieceId === piece.id && view.outline === pieceSeamPath(piece)));
}

export function artworkPlacementIssues(project: Project): string[] {
  const doc=project.design;
  if(!doc?.simpleWorkflow)return [];
  return doc.elements.filter(element=>element.kind==='grupo'&&element.embroidery&&!element.hidden).flatMap(element=>{
    const view=doc.views.find(view=>view.id===element.viewId);
    if(view?.source.type!=='pieza'||!view.outline)return [];
    const polygons=cmdsToPolylines(parseSvgPath(view.outline),.2).map(contour=>contour.pts);
    const fits=elementCorners(element).every(point=>polygons.some(poly=>pointInPolygon(point,poly)||poly.some((a,index)=>distToSegment(point,a,poly[(index+1)%poly.length])<.1)));
    return fits?[]:[`El bordado «${element.name}» se sale de la pieza actual. Revisa su tamaño o posición en Acabados.`];
  });
}

export interface MaterialTarget {
  id: string;
  viewId: string;
  label: string;
  kind: 'zona' | 'elemento';
  targetId: string;
  fill?: Fill;
}

export function materialTargets(project: Project): MaterialTarget[] {
  const doc = project.design;
  if (!doc) return [];
  const targets: MaterialTarget[] = [];
  for (const view of simpleViews(doc)) for (const zone of view.zones) targets.push({
    id: `zona:${view.id}:${zone.id}`, viewId: view.id,
    label: view.zones.length === 1 ? view.label : `${view.label} · ${zone.label}`,
    kind: 'zona', targetId: zone.id, fill: view.zoneFills?.[zone.id]
  });
  for (const component of project.pattern?.components ?? []) for (const role of componentPaintRoles(component)) {
    const element = doc.elements.find(element => element.id === componentElementId(component.id, role));
    if (element) targets.push({ id: `elemento:${element.id}`, viewId: element.viewId, label: element.name, kind: 'elemento', targetId: element.id, fill: element.fill });
  }
  return targets;
}

export function missingMaterials(project: Project): MaterialTarget[] {
  if (!project.design?.simpleWorkflow) return [];
  return materialTargets(project).filter(target => {
    const choice = project.design?.materialChoices?.[target.id];
    return !choice || choice.type === 'ninguno' || !target.fill || target.fill.type === 'ninguno' || JSON.stringify(choice) !== JSON.stringify(target.fill);
  });
}

export function applyMaterial(project: Project, targetIds: string[], fill: Fill, fabrics: Record<string, Fabric> = {}): Project {
  const doc = project.design;
  if (!doc) return project;
  const targets = materialTargets(project).filter(target => targetIds.includes(target.id));
  const choices = { ...doc.materialChoices };
  for (const target of targets) choices[target.id] = fill;
  const design: DesignDoc = { ...doc, materialChoices: choices,
    views: doc.views.map(view => ({ ...view, zoneFills: { ...view.zoneFills, ...Object.fromEntries(targets.filter(target => target.kind === 'zona' && target.viewId === view.id).map(target => [target.targetId, fill])) } })),
    elements: doc.elements.map(element => targets.some(target => target.kind === 'elemento' && target.targetId === element.id) ? { ...element, fill } : element)
  };
  return reconcileComponentDesign({ ...project, design, fabricIds: fill.type === 'tela' ? [...new Set([...project.fabricIds, fill.fabricId])] : project.fabricIds }, fabrics);
}
