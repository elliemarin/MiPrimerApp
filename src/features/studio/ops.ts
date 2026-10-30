import { uid, nowIso } from '../../lib/ids';
import { bboxOf, Pt } from '../../lib/geom/vec';
import { CUT_TECHNIQUES, DesignDoc, DesignElement, DesignView, EDGE_ALLOWANCE, EdgeFinish, Technique, elementCorners } from './model';

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
  const set = new Set(ids);
  // Al borrar un grupo se borran sus hijos.
  for (const e of doc.elements) if (e.parentId && set.has(e.parentId)) set.add(e.id);
  return touch({ ...doc, elements: doc.elements.filter((e) => !set.has(e.id)).map((e) => (e.continuityId && !doc.elements.some((x) => x.id !== e.id && !set.has(x.id) && x.continuityId === e.continuityId) ? { ...e, continuityId: undefined } : e)) });
}

export function duplicateElements(doc: DesignDoc, ids: string[], offset = 10): { doc: DesignDoc; ids: string[] } {
  const created: DesignElement[] = [];
  for (const e of doc.elements) if (ids.includes(e.id)) created.push({ ...JSON.parse(JSON.stringify(e)), id: uid('el'), name: `${e.name} (copia)`, x: e.x + offset, y: e.y + offset, continuityId: undefined });
  return { doc: touch({ ...doc, elements: [...doc.elements, ...created] }), ids: created.map((c) => c.id) };
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
  const els = doc.elements.filter((e) => ids.includes(e.id));
  if (els.length < 2) return doc;
  const bb = selectionBBox(els);
  return updateElements(doc, ids, (e) => {
    const b = bboxOf(elementCorners(e));
    const hw = (b.maxX - b.minX) / 2;
    const hh = (b.maxY - b.minY) / 2;
    switch (how) {
      case 'izq':
        return { ...e, x: bb.minX + hw + (e.x - (b.minX + hw)) };
      case 'der':
        return { ...e, x: bb.maxX - hw + (e.x - (b.maxX - hw)) };
      case 'centro-h':
        return { ...e, x: (bb.minX + bb.maxX) / 2 + (e.x - (b.minX + b.maxX) / 2) };
      case 'arriba':
        return { ...e, y: bb.minY + hh + (e.y - (b.minY + hh)) };
      case 'abajo':
        return { ...e, y: bb.maxY - hh + (e.y - (b.maxY - hh)) };
      case 'centro-v':
        return { ...e, y: (bb.minY + bb.maxY) / 2 + (e.y - (b.minY + b.maxY) / 2) };
    }
  });
}

export function distribute(doc: DesignDoc, ids: string[], axis: 'h' | 'v'): DesignDoc {
  const els = doc.elements.filter((e) => ids.includes(e.id)).sort((a, b) => (axis === 'h' ? a.x - b.x : a.y - b.y));
  if (els.length < 3) return doc;
  const first = axis === 'h' ? els[0].x : els[0].y;
  const last = axis === 'h' ? els[els.length - 1].x : els[els.length - 1].y;
  const step = (last - first) / (els.length - 1);
  const pos = new Map(els.map((e, i) => [e.id, first + step * i]));
  return updateElements(doc, ids, (e) => (axis === 'h' ? { ...e, x: pos.get(e.id)! } : { ...e, y: pos.get(e.id)! }));
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
      const bb = selectionBBox(kids);
      return { ...g, x: (bb.minX + bb.maxX) / 2, y: (bb.minY + bb.maxY) / 2, w: bb.maxX - bb.minX, h: bb.maxY - bb.minY };
    })
  };
}

/** Elementos afectados al mover o transformar una selección (incluye hijos de grupos). */
export function expandSelection(doc: DesignDoc, ids: string[]): string[] {
  const out = new Set(ids);
  for (const e of doc.elements) if (e.parentId && out.has(e.parentId)) out.add(e.id);
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
