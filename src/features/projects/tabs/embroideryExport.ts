import { HOOPS } from '../../../lib/dst';
import { drawableBBox, translateDrawable, type Drawable } from '../../../lib/draw/drawable';
import type { DesignDoc } from '../../studio/model';
import { embroideryDrawables } from '../../studio/despiece';
import { visibleDesignElement } from '../../../lib/draw/designImage';

/** Área indicada en el manual de la HD9120; no certifica un formato de archivo. */
export const HD9120_HOOP = { id: 'hd9120-170x100', label: 'Singer HD9120 · 17 × 10 cm', w: 170, h: 100 };
export const EMBROIDERY_HOOPS = [HD9120_HOOP, ...HOOPS];

export function embroideryViews(doc: DesignDoc) {
  return doc.views.filter((view) => doc.elements.some((el) => el.viewId === view.id && el.technique === 'bordado' && visibleDesignElement(el,doc) && el.kind !== 'grupo'));
}

/** Una vista conserva su composición; frente y espalda nunca comparten bastidor. */
export function embroideryForView(doc: DesignDoc, viewId: string) {
  if (!doc.views.some((view) => view.id === viewId)) return [];
  const elements = doc.elements.filter((el) => el.viewId === viewId && el.kind !== 'grupo' && visibleDesignElement(el,doc));
  const byId = new Map(elements.map((el) => [`bord-${el.id}`, el]));
  const drawings = embroideryDrawables({ ...doc, elements }).map((drawable) => {
    const el = byId.get(drawable.id)!;
    // embroideryDrawables produce plantillas individuales centradas en el origen.
    // Para un bastidor hay que restituir la posición física de cada motivo.
    return translateDrawable(drawable, el.x, el.y);
  }).filter((drawable) => drawable.paths.some((path) => path.cmds.length > 1)||!!drawable.images?.length);
  const out: Drawable[] = [];
  const grouped = new Map<string, Drawable[]>();
  for (const drawing of drawings) {
    const element = byId.get(drawing.id)!;
    const group = doc.elements.find(candidate => candidate.id === element.parentId && candidate.embroidery);
    if (!group) out.push(drawing);
    else grouped.set(group.id,[...(grouped.get(group.id)??[]),drawing]);
  }
  for (const [id,parts] of grouped) {
    const group=doc.elements.find(element=>element.id===id)!;
    const paths=parts.flatMap(part=>part.paths);
    const images=parts.flatMap(part=>part.images??[]);
    const labels=[{text:group.name,at:{x:group.x,y:group.y+group.h/2+8},size:2.8}];
    out.push({id:`bord-${id}`,name:group.name,paths,labels,grains:[],...(images.length?{images}:{}),bbox:drawableBBox(paths,labels,images)});
  }
  return out;
}
