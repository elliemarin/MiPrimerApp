import { uid, nowIso } from '../../lib/ids';
import { bboxOf, Pt } from '../../lib/geom/vec';
import { CUT_TECHNIQUES, DesignDoc, DesignElement, DesignView, EDGE_ALLOWANCE, EdgeFinish, Technique, elementCorners } from './model';
import { componentElementId, componentGroupId, componentIdForElement, normalizeComponentDesign } from '../customize/componentDesign';

export const touch = (d: DesignDoc): DesignDoc => ({ ...d, updatedAt: nowIso() });

export function viewElements(doc: DesignDoc, viewId: string) {
  return doc.elements.filter((e) => e.viewId === viewId);
}

export function addElement(doc: DesignDoc, el: DesignElement): DesignDoc {
  return touch({ ...doc, elements: [...doc.elements, el] });
}

export function updateElements(doc: DesignDoc, ids: string[], fn: (e: DesignElement) => DesignElement): DesignDoc {
  const set = new Set(ids);
  return touch({ ...doc, elements: doc.elements.map((e) => (set.has(e.id) ? fn(e) : e)) });
}

export function removeElements(doc: DesignDoc, ids: string[]): DesignDoc {
  const set = new Set(expandSelection(doc, componentRoots(doc, ids)));
  return touch({ ...doc, elements: doc.elements.filter((e) => !set.has(e.id)).map((e) => (e.continuityId && !doc.elements.some((x) => x.id !== e.id && !set.has(x.id) && x.continuityId === e.continuityId) ? { ...e, continuityId: undefined } : e)) });
}

export function duplicateElements(doc: DesignDoc, ids: string[], offset = 10): { doc: DesignDoc; ids: string[] } {
  const roots = componentRoots(doc, ids);
  const selected = new Set(expandSelection(doc, roots));
  const copies = (doc.componentSelections ?? []).filter(c => selected.has(componentGroupId(c.id))).map(c => ({
    originalId: c.id,
    copy: { ...structuredClone(c), id: uid('comp'), placement: c.placement ? { ...c.placement, x: c.placement.x + offset, y: c.placement.y + offset } : undefined }
  }));
  const idMap = new Map<string, string>();
  for (const e of doc.elements) if (selected.has(e.id)) {
    const component = copies.find(c => componentIdForElement(e.id) === c.originalId);
    idMap.set(e.id, component ? componentElementId(component.copy.id, e.id.slice(e.id.lastIndexOf('--') + 2)) : uid(e.kind === 'grupo' ? 'grp' : 'el'));
  }
  const created = doc.elements.filter(e => selected.has(e.id)).map(e => ({
    ...structuredClone(e), id: idMap.get(e.id)!, name: `${e.name} (copia)`,
    parentId: e.parentId ? idMap.get(e.parentId) : undefined,
    x: e.x + offset, y: e.y + offset, continuityId: undefined
  }));
  return { doc: touch({ ...doc, elements: [...doc.elements, ...created],
    ...(copies.length ? { componentSelections: [...(doc.componentSelections ?? []), ...copies.map(c => c.copy)] } : {})
  }), ids: roots.filter(id => idMap.has(id)).map(id => idMap.get(id)!) };
}

/** Las partes de un complemento forman una sola receta de confección. */
function componentRoots(doc: DesignDoc, ids: string[]): string[] {
  const roots = [...new Set(ids.map(id => {
    const component = doc.componentSelections?.find(c => componentIdForElement(id) === c.id);
    const root = component ? componentGroupId(component.id) : undefined;
    return root && doc.elements.some(e => e.id === root) ? root : id;
  }))];
  const selected = new Set(roots);
  return roots.filter(id => {
    const visited = new Set<string>([id]);
    let parentId = doc.elements.find(e => e.id === id)?.parentId;
    while (parentId && !visited.has(parentId)) {
      if (selected.has(parentId)) return false;
      visited.add(parentId);
      parentId = doc.elements.find(e => e.id === parentId)?.parentId;
    }
    return true;
  });
}

/** Cambia la caja de un grupo trasladando y transformando sus partes con él. */
export function editElement(doc: DesignDoc, id: string, patch: Partial<DesignElement>): DesignDoc {
  const element = doc.elements.find(e => e.id === id);
  if (!element || element.kind !== 'grupo') return updateElements(doc, [id], e => ({ ...e, ...patch }));
  const next = { ...element, ...patch };
  const affected = expandSelection(doc, [id]);
  const oldAngle = element.rotation * Math.PI / 180;
  const newAngle = next.rotation * Math.PI / 180;
  const sx = next.w / Math.max(0.001, element.w) * (next.flipX === element.flipX ? 1 : -1);
  const sy = next.h / Math.max(0.001, element.h) * (next.flipY === element.flipY ? 1 : -1);
  const transformVector = (x: number, y: number) => {
    const localX = (x * Math.cos(oldAngle) + y * Math.sin(oldAngle)) * sx;
    const localY = (-x * Math.sin(oldAngle) + y * Math.cos(oldAngle)) * sy;
    return { x: localX * Math.cos(newAngle) - localY * Math.sin(newAngle), y: localX * Math.sin(newAngle) + localY * Math.cos(newAngle) };
  };
  return normalizeComponentDesign(refreshGroups(updateElements(doc, affected, e => {
    if (e.id === id) return next;
    const p = transformVector(e.x - element.x, e.y - element.y);
    const angle = e.rotation * Math.PI / 180;
    const xAxis = transformVector(Math.cos(angle) * (e.flipX ? -1 : 1), Math.sin(angle) * (e.flipX ? -1 : 1));
    const yAxis = transformVector(-Math.sin(angle) * (e.flipY ? -1 : 1), Math.cos(angle) * (e.flipY ? -1 : 1));
    return { ...e, x: next.x + p.x, y: next.y + p.y,
      w: e.w * Math.hypot(xAxis.x, xAxis.y), h: e.h * Math.hypot(yAxis.x, yAxis.y),
      rotation: (Math.atan2(xAxis.y, xAxis.x) * 180 / Math.PI + 360) % 360,
      flipX: false, flipY: xAxis.x * yAxis.y - xAxis.y * yAxis.x < 0,
      ...(patch.locked !== undefined ? { locked: patch.locked } : {}),
      ...(patch.hidden !== undefined ? { hidden: patch.hidden } : {})
    };
  })));
}

/** Reordena dentro de la vista: el orden del arreglo es el orden de superposición. */
export function reorder(doc: DesignDoc, id: string, dir: 'arriba' | 'abajo' | 'frente' | 'fondo'): DesignDoc {
  const el = doc.elements.find((e) => e.id === id);
  if (!el) return doc;
  const same = doc.elements.filter((e) => e.viewId === el.viewId);
  const others = doc.elements.filter((e) => e.viewId !== el.viewId);
  const i = same.findIndex((e) => e.id === id);
  const arr = same.slice();
  arr.splice(i, 1);
  const j = dir === 'frente' ? arr.length : dir === 'fondo' ? 0 : dir === 'arriba' ? Math.min(arr.length, i + 1) : Math.max(0, i - 1);
  arr.splice(j, 0, el);
  return touch({ ...doc, elements: [...others, ...arr] });
}

export function moveToIndex(doc: DesignDoc, id: string, index: number): DesignDoc {
  const el = doc.elements.find((e) => e.id === id);
  if (!el) return doc;
  const same = doc.elements.filter((e) => e.viewId === el.viewId && e.id !== id);
  const others = doc.elements.filter((e) => e.viewId !== el.viewId);
  same.splice(Math.max(0, Math.min(same.length, index)), 0, el);
  return touch({ ...doc, elements: [...others, ...same] });
}

export function selectionBBox(els: DesignElement[]) {
  return bboxOf(els.flatMap((e) => elementCorners(e)));
}

export function alignElements(doc: DesignDoc, ids: string[], how: 'izq' | 'centro-h' | 'der' | 'arriba' | 'centro-v' | 'abajo'): DesignDoc {
  const roots = componentRoots(doc, ids);
  const els = doc.elements.filter((e) => roots.includes(e.id));
  if (els.length < 2) return doc;
  const bb = selectionBBox(els);
  return els.reduce((next, e) => {
    const b = bboxOf(elementCorners(e));
    const hw = (b.maxX - b.minX) / 2;
    const hh = (b.maxY - b.minY) / 2;
    switch (how) {
      case 'izq':
        return editElement(next, e.id, { x: bb.minX + hw + (e.x - (b.minX + hw)) });
      case 'der':
        return editElement(next, e.id, { x: bb.maxX - hw + (e.x - (b.maxX - hw)) });
      case 'centro-h':
        return editElement(next, e.id, { x: (bb.minX + bb.maxX) / 2 + (e.x - (b.minX + b.maxX) / 2) });
      case 'arriba':
        return editElement(next, e.id, { y: bb.minY + hh + (e.y - (b.minY + hh)) });
      case 'abajo':
        return editElement(next, e.id, { y: bb.maxY - hh + (e.y - (b.maxY - hh)) });
      case 'centro-v':
        return editElement(next, e.id, { y: (bb.minY + bb.maxY) / 2 + (e.y - (b.minY + b.maxY) / 2) });
    }
  }, doc);
}

export function distribute(doc: DesignDoc, ids: string[], axis: 'h' | 'v'): DesignDoc {
  const roots = componentRoots(doc, ids);
  const els = doc.elements.filter((e) => roots.includes(e.id)).sort((a, b) => (axis === 'h' ? a.x - b.x : a.y - b.y));
  if (els.length < 3) return doc;
  const first = axis === 'h' ? els[0].x : els[0].y;
  const last = axis === 'h' ? els[els.length - 1].x : els[els.length - 1].y;
  const step = (last - first) / (els.length - 1);
  const pos = new Map(els.map((e, i) => [e.id, first + step * i]));
  return els.reduce((next, e) => editElement(next, e.id, axis === 'h' ? { x: pos.get(e.id)! } : { y: pos.get(e.id)! }), doc);
}

export function groupElements(doc: DesignDoc, ids: string[], viewId: string): { doc: DesignDoc; id: string } {
  const els = doc.elements.filter((e) => ids.includes(e.id) && !e.parentId);
  const bb = selectionBBox(els);
  const g: DesignElement = {
    id: uid('grp'),
    viewId,
    kind: 'grupo',
    name: `Grupo de ${els.length}`,
    locked: false,
    hidden: false,
    x: (bb.minX + bb.maxX) / 2,
    y: (bb.minY + bb.maxY) / 2,
    w: bb.maxX - bb.minX,
    h: bb.maxY - bb.minY,
    rotation: 0,
    flipX: false,
    flipY: false,
    fill: { type: 'ninguno' },
    stroke: null,
    technique: 'ninguna',
    edge: 'na',
    allowance: 0,
    backing: 'ninguna'
  };
  const set = new Set(els.map((e) => e.id));
  return { doc: touch({ ...doc, elements: [...doc.elements.map((e) => (set.has(e.id) ? { ...e, parentId: g.id } : e)), g] }), id: g.id };
}

export function ungroup(doc: DesignDoc, groupId: string): DesignDoc {
  return touch({ ...doc, elements: doc.elements.filter((e) => e.id !== groupId).map((e) => (e.parentId === groupId ? { ...e, parentId: undefined } : e)) });
}

/** Recalcula la caja de los grupos a partir de sus hijos. */
export function refreshGroups(doc: DesignDoc): DesignDoc {
  const groups = doc.elements.filter((e) => e.kind === 'grupo');
  if (!groups.length) return doc;
  return {
    ...doc,
    elements: doc.elements.map((g) => {
      if (g.kind !== 'grupo') return g;
      const kids = doc.elements.filter((e) => e.parentId === g.id);
      if (!kids.length) return g;
      const angle = g.rotation * Math.PI / 180;
      const corners = kids.flatMap(e => elementCorners(e)).map(p => ({ x: p.x * Math.cos(angle) + p.y * Math.sin(angle), y: -p.x * Math.sin(angle) + p.y * Math.cos(angle) }));
      const bb = bboxOf(corners);
      const cx = (bb.minX + bb.maxX) / 2, cy = (bb.minY + bb.maxY) / 2;
      return { ...g, x: cx * Math.cos(angle) - cy * Math.sin(angle), y: cx * Math.sin(angle) + cy * Math.cos(angle), w: bb.maxX - bb.minX, h: bb.maxY - bb.minY };
    })
  };
}

/** Elementos afectados al mover o transformar una selección (incluye hijos de grupos). */
export function expandSelection(doc: DesignDoc, ids: string[]): string[] {
  const out = new Set(ids);
  let added = true;
  while (added) {
    added = false;
    for (const e of doc.elements) if (e.parentId && out.has(e.parentId) && !out.has(e.id)) {
      out.add(e.id);
      added = true;
    }
  }
  return [...out];
}

export function techniqueDefaults(t: Technique): Partial<DesignElement> {
  const edge: EdgeFinish = t === 'aplicacion' ? 'doblado' : t === 'collage' ? 'crudo' : t === 'patchwork' ? 'pespunte' : t === 'parche' ? 'satin' : t === 'vinil' ? 'na' : 'na';
  return {
    technique: t,
    edge,
    allowance: t === 'patchwork' ? 6 : CUT_TECHNIQUES.includes(t) ? EDGE_ALLOWANCE[edge] : 0,
    backing: t === 'aplicacion' || t === 'collage' ? 'termoadhesiva' : t === 'parche' || t === 'bordado' ? 'desprendible' : 'ninguna'
  };
}

/** Vista vecina y posición equivalente al continuar un elemento por un costado. */
export function continuationTarget(doc: DesignDoc, view: DesignView, el: DesignElement): { side: 'left' | 'right'; target: DesignView; x: number } | null {
  if (!view.seams || (view.kind !== 'frente' && view.kind !== 'espalda')) return null;
  const b = bboxOf(elementCorners(el));
  const { left, right } = view.seams;
  const find = (kind: string) => doc.views.find((v) => v.kind === kind);
  if (left !== undefined && b.minX < left) {
    const target = find(view.kind === 'frente' ? 'costado-der' : 'costado-izq');
    if (target) return { side: 'left', target, x: view.kind === 'frente' ? el.x - left : el.x - left };
  }
  if (right !== undefined && b.maxX > right) {
    const target = find(view.kind === 'frente' ? 'costado-izq' : 'costado-der');
    if (target) return { side: 'right', target, x: view.kind === 'frente' ? -(right - el.x) : -(right - el.x) };
  }
  return null;
}

export function createContinuation(doc: DesignDoc, el: DesignElement, target: DesignView, x: number): { doc: DesignDoc; id: string } {
  const cid = el.continuityId ?? uid('cont');
  const copy: DesignElement = { ...JSON.parse(JSON.stringify(el)), id: uid('el'), viewId: target.id, x, name: `${el.name} (continuación)`, continuityId: cid, zoneId: undefined, maskZoneId: undefined };
  const next = touch({ ...doc, elements: [...doc.elements.map((e) => (e.id === el.id ? { ...e, continuityId: cid } : e)), copy] });
  return { doc: next, id: copy.id };
}

export interface ContinuityCheck {
  other: DesignElement;
  view: DesignView;
  dy: number;
  dh: number;
}

/** Compara la altura respecto a la línea de referencia compartida de cada vista. */
export function continuityChecks(doc: DesignDoc, el: DesignElement): ContinuityCheck[] {
  if (!el.continuityId) return [];
  const myView = doc.views.find((v) => v.id === el.viewId)!;
  return doc.elements
    .filter((e) => e.id !== el.id && e.continuityId === el.continuityId)
    .map((o) => {
      const v = doc.views.find((x) => x.id === o.viewId)!;
      return { other: o, view: v, dy: o.y - v.refY - (el.y - myView.refY), dh: o.h - el.h };
    });
}

export function alignContinuity(doc: DesignDoc, el: DesignElement): DesignDoc {
  const myView = doc.views.find((v) => v.id === el.viewId)!;
  const rel = el.y - myView.refY;
  return touch({
    ...doc,
    elements: doc.elements.map((o) => {
      if (o.id === el.id || o.continuityId !== el.continuityId || !o.continuityId) return o;
      const v = doc.views.find((x) => x.id === o.viewId)!;
      return { ...o, y: v.refY + rel, h: el.h, rotation: el.rotation };
    })
  });
}

export function toLocal(el: DesignElement, w: Pt): Pt {
  const r = (-el.rotation * Math.PI) / 180;
  const dx = w.x - el.x;
  const dy = w.y - el.y;
  let x = dx * Math.cos(r) - dy * Math.sin(r);
  let y = dx * Math.sin(r) + dy * Math.cos(r);
  if (el.flipX) x = -x;
  if (el.flipY) y = -y;
  return { x, y };
}
