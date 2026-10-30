import type { Project } from '../../store/types';
import type { DesignDoc, DesignElement, DesignView } from '../../features/studio/model';
import { elementCorners, elementWorldCmds } from '../../features/studio/model';
import { componentElementId, isComponentElementId } from '../../features/customize/componentDesign';
import { bboxOf } from '../geom/vec';
import { cmdsBBox, polylineCmds } from '../draw/paths';
import { parseSvgPath } from '../draw/svgpath';
import { drawableBBox, wrapLabelText, type DrawLabel, type DrawPath, type Drawable } from '../draw/drawable';

export interface Placement {
  id: string;
  code: string;
  kind: 'extra' | 'bordado';
  name: string;
  viewId: string;
  pieceId?: string;
  /** Centre in the original piece/view coordinates, never relative to its viewport. */
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  quantity?: number;
  precise: boolean;
}

export interface PlacementDrawing {
  id: string;
  title: string;
  count: number;
  drawables: Drawable[];
  note: string;
}

type Located = { placement: Placement; element?: DesignElement; art: DesignElement[] };
const mm = (value: number) => Number(value.toFixed(2)).toString().replace('.', ',');

function visible(element: DesignElement, doc: DesignDoc): boolean {
  const visited = new Set<string>();
  let current: DesignElement | undefined = element;
  while (current) {
    if (current.hidden || visited.has(current.id)) return false;
    visited.add(current.id);
    current = current.parentId ? doc.elements.find(item => item.id === current!.parentId) : undefined;
  }
  return true;
}

function descendants(doc: DesignDoc, root: DesignElement): DesignElement[] {
  const ids = new Set([root.id]);
  let changed = true;
  while (changed) {
    changed = false;
    for (const element of doc.elements) if (element.parentId && ids.has(element.parentId) && !ids.has(element.id)) { ids.add(element.id); changed = true; }
  }
  return doc.elements.filter(element => ids.has(element.id) && element.kind !== 'grupo' && visible(element, doc));
}

function finite(placement: Placement): boolean {
  return [placement.x, placement.y, placement.width, placement.height, placement.rotation].every(Number.isFinite) && placement.width > 0 && placement.height > 0;
}

/** A construction guide uses the sewing contour as its frame, not a scaled photo. */
function viewPaths(view: DesignView): DrawPath[] {
  const paths = view.outline ? [view.outline] : view.zones.map(zone => zone.d);
  return paths.filter(Boolean).map(path => ({ style: 'costura', color: '#54675B', cmds: parseSvgPath(path) }));
}

function guideDrawing(view: DesignView, located: Located[]): PlacementDrawing {
  const base = viewPaths(view);
  const bounds = base.length ? drawableBBox(base, []) : { minX: view.minX, minY: view.minY, maxX: view.minX + view.width, maxY: view.minY + view.height };
  // Keep the drafting origin explicit. view.minX/minY include display padding
  // and must never become the measurement origin printed in the guide.
  const left = Math.floor(Math.min(0, bounds.minX) / 10) * 10;
  const top = Math.floor(Math.min(0, bounds.minY) / 10) * 10;
  const right = Math.ceil(Math.max(0, bounds.maxX) / 10) * 10;
  const bottom = Math.ceil(Math.max(0, bounds.maxY) / 10) * 10;
  const paths: DrawPath[] = [];
  const labels: DrawLabel[] = [];
  for (let x = left; x <= right + .001; x += 10) {
    const major = Math.abs(x % 50) < .001;
    paths.push({ style: 'referencia', color: major ? '#B5C4BA' : '#E1E7E2', cmds: polylineCmds([{ x, y: top }, { x, y: bottom }], false) });
    if (major) labels.push({ text: mm(x), at: { x, y: top - 5 }, size: 2.5 });
  }
  for (let y = top; y <= bottom + .001; y += 10) {
    const major = Math.abs(y % 50) < .001;
    paths.push({ style: 'referencia', color: major ? '#B5C4BA' : '#E1E7E2', cmds: polylineCmds([{ x: left, y }, { x: right, y }], false) });
    if (major) labels.push({ text: mm(y), at: { x: left - 9, y }, size: 2.5 });
  }
  paths.push(...base);
  paths.push({ style: 'colocacion', color: '#24584A', cmds: polylineCmds([{ x: -4, y: 0 }, { x: 4, y: 0 }], false) },
    { style: 'colocacion', color: '#24584A', cmds: polylineCmds([{ x: 0, y: -4 }, { x: 0, y: 4 }], false) });
  labels.push({ text: 'Origen 0,0', at: { x: left + 30, y: top - 12 }, size: 2.8, bold: true },
    { text: 'X e Y en mm · cuadrícula de 10 mm', at: { x: (left + right) / 2, y: bottom + 9 }, size: 2.8 });

  for (const item of located) {
    const placement = item.placement;
    if (placement.kind === 'extra') {
      const footprint = item.element ? elementWorldCmds(item.element) : polylineCmds([
        { x: placement.x - placement.width / 2, y: placement.y - placement.height / 2 },
        { x: placement.x + placement.width / 2, y: placement.y - placement.height / 2 },
        { x: placement.x + placement.width / 2, y: placement.y + placement.height / 2 },
        { x: placement.x - placement.width / 2, y: placement.y + placement.height / 2 }
      ], true);
      paths.push({ style: 'colocacion', color: '#9B651B', cmds: footprint });
    } else {
      for (const element of item.art) paths.push({ style: 'bordado', cmds: elementWorldCmds(element),
        color: element.stroke?.color ?? (element.fill.type === 'color' ? element.fill.color : '#18211D'),
        ...(element.fill.type === 'color' ? { fillColor: element.fill.color } : {})
      });
      if (item.element) paths.push({ style: 'colocacion', color: '#78518A', cmds: polylineCmds(elementCorners(item.element), true) });
    }
    const { x, y } = placement;
    paths.push({ style: 'colocacion', cmds: polylineCmds([{ x: x - 3, y }, { x: x + 3, y }], false) },
      { style: 'colocacion', cmds: polylineCmds([{ x, y: y - 3 }, { x, y: y + 3 }], false) });
    labels.push({ text: placement.code, at: { x: x + 7, y: y - 5 }, size: 3, bold: true });
  }

  let legendY = bottom + 18;
  const legendWidth = Math.max(100, right - left);
  const center = (left + right) / 2;
  for (const { placement } of located) {
    const text = `${placement.code} · ${placement.name}${placement.quantity && placement.quantity > 1 ? ` · ${placement.quantity} copias` : ''} · centro X ${mm(placement.x)}, Y ${mm(placement.y)} mm · ${mm(placement.width)} × ${mm(placement.height)} mm · giro ${mm(placement.rotation)}°`;
    for (const line of wrapLabelText(text, 2.8, legendWidth)) {
      labels.push({ text: line, at: { x: center, y: legendY }, size: 2.8 });
      legendY += 4.5;
    }
    legendY += 3;
  }
  const precise = located.every(item => item.placement.precise);
  const note = precise
    ? 'Guía de colocación a escala 1:1 sobre la pieza real. Cuadrícula de 10 mm; referencias cada 50 mm. X e Y indican el centro desde el origen 0,0 de la pieza, antes de sus márgenes. No cortes por estas líneas: usa las plantillas de confección. Transfiere las marcas e hilvana antes de coser.'
    : 'Colocación ilustrativa sobre una vista de referencia, no una pieza de confección. La cuadrícula expresa coordenadas del dibujo y no verifica las medidas de una foto o de la prenda real. Usa una pieza de patrón real para ubicar con precisión.';
  for (const line of wrapLabelText(precise ? 'Ubicación en pieza real · no es un contorno de corte' : 'Ubicación ilustrativa · verificar sobre la prenda real', 2.8, legendWidth)) {
    labels.push({ text: line, at: { x: center, y: legendY }, size: 2.8, bold: true });
    legendY += 5;
  }
  const drawable: Drawable = { id: `ubicacion-${view.id}`, name: `Ubicación en ${view.label}`, paths, labels, grains: [], bbox: drawableBBox(paths, labels) };
  return { id: `ubicacion-${view.id}`, title: `Guía de ubicación · ${view.label}`, count: located.length, drawables: [drawable], note };
}

/** Export the exact editing coordinate frame once for each occupied view. */
export function preparePlacementGuide(project: Project): { placements: Placement[]; drawings: PlacementDrawing[] } {
  const doc = project.design;
  if (!doc) return { placements: [], drawings: [] };
  const located: Located[] = [];
  let extra = 0;
  for (const component of project.pattern?.components ?? []) {
    const body = doc.elements.find(element => element.id === componentElementId(component.id, 'cuerpo'));
    if (body && !visible(body, doc)) continue;
    const view = doc.views.find(view => view.id === (body?.viewId ?? component.placement?.viewId)) ?? doc.views.find(view => view.source.type === 'pieza' && view.source.pieceId === component.placement?.pieceId);
    if (!view) continue;
    const x = body?.x ?? component.placement?.x, y = body?.y ?? component.placement?.y;
    if (x === undefined || y === undefined) continue;
    const pieceId = view.source.type === 'pieza' ? view.source.pieceId : undefined;
    const placement: Placement = { id: component.id, code: `E${++extra}`, kind: 'extra', name: component.name ?? body?.name ?? 'Complemento', viewId: view.id, pieceId,
      x, y, width: body?.w ?? component.width, height: body?.h ?? component.height,
      rotation: body?.rotation ?? 0, quantity: component.quantity,
      precise: !!pieceId && (!component.placement?.pieceId || component.placement.pieceId === pieceId)
    };
    if (finite(placement)) located.push({ placement, element: body, art: [] });
  }

  const grouped = doc.elements.filter(element => element.kind === 'grupo' && !!element.embroidery && visible(element, doc));
  const owned = new Set(grouped.flatMap(group => descendants(doc, group).map(element => element.id)));
  const roots = [...grouped, ...doc.elements.filter(element => element.kind !== 'grupo' && element.technique === 'bordado' && !owned.has(element.id) && !isComponentElementId(element.id) && visible(element, doc))];
  let embroidery = 0;
  for (const root of roots) {
    const view = doc.views.find(view => view.id === root.viewId);
    if (!view) continue;
    const art = root.kind === 'grupo' ? descendants(doc, root) : [root];
    if (!art.length) continue;
    const b = root.kind === 'grupo' ? bboxOf(elementCorners(root)) : cmdsBBox(elementWorldCmds(root));
    const placement: Placement = { id: root.id, code: `B${++embroidery}`, kind: 'bordado', name: root.name,
      viewId: root.viewId, pieceId: view.source.type === 'pieza' ? view.source.pieceId : undefined,
      x: root.x, y: root.y, width: root.w || b.maxX - b.minX, height: root.h || b.maxY - b.minY,
      rotation: root.rotation, precise: view.source.type === 'pieza'
    };
    if (finite(placement)) located.push({ placement, element: root, art });
  }
  // Keep the group metadata independent of the source document. This service is
  // read-only; editing history and component definitions belong to the studio.
  const drawings = doc.views.flatMap(view => {
    const positions = located.filter(item => item.placement.viewId === view.id);
    return positions.length ? [guideDrawing(view, positions)] : [];
  });
  return { placements: located.map(item => item.placement), drawings };
}
