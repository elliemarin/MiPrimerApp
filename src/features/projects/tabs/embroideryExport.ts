import { HOOPS } from '../../../lib/dst';
import { translateDrawable } from '../../../lib/draw/drawable';
import type { DesignDoc } from '../../studio/model';
import { embroideryDrawables } from '../../studio/despiece';

/** Área indicada en el manual de la HD9120; no certifica un formato de archivo. */
export const HD9120_HOOP = { id: 'hd9120-170x100', label: 'Singer HD9120 · 17 × 10 cm', w: 170, h: 100 };
export const EMBROIDERY_HOOPS = [HD9120_HOOP, ...HOOPS];

export function embroideryViews(doc: DesignDoc) {
  return doc.views.filter((view) => doc.elements.some((el) => el.viewId === view.id && el.technique === 'bordado' && !el.hidden && el.kind !== 'grupo'));
}

/** Una vista conserva su composición; frente y espalda nunca comparten bastidor. */
export function embroideryForView(doc: DesignDoc, viewId: string) {
  if (!doc.views.some((view) => view.id === viewId)) return [];
  const elements = doc.elements.filter((el) => el.viewId === viewId && el.kind !== 'grupo');
  const byId = new Map(elements.map((el) => [`bord-${el.id}`, el]));
  return embroideryDrawables({ ...doc, elements }).map((drawable) => {
    const el = byId.get(drawable.id)!;
    // embroideryDrawables produce plantillas individuales centradas en el origen.
    // Para un bastidor hay que restituir la posición física de cada motivo.
    return translateDrawable(drawable, el.x, el.y);
  }).filter((drawable) => drawable.paths.some((path) => path.cmds.length > 1));
}
