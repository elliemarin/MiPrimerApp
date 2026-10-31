import type { Pt } from '../../lib/geom/vec';
import type { DesignDoc, DesignElement, DesignView } from '../studio/model';
import { elementCorners } from '../studio/model';
import { editElement } from '../studio/ops';
import { assemblyArtworkMatrix, assemblyHit, assemblyPoint, inverseAssemblyPoint, type AssemblyScene, type AssemblySurface } from './assembled';
import { moveEmbroidery } from './finishEmbroidery';

export function embroiderySceneCorners(element: DesignElement, surface?: AssemblySurface): Pt[] {
  if (!surface) return elementCorners(element);
  const [a, b, c, d, e, f] = assemblyArtworkMatrix(surface, element);
  return elementCorners(element).map(p => ({ x: a * p.x + c * p.y + e, y: b * p.x + d * p.y + f }));
}

/** Keep the grabbed point attached to the object even when the handle is above it. */
export function embroideryPointerOffset(element: DesignElement, pointer: Pt, surface?: AssemblySurface): Pt {
  const center = surface ? assemblyPoint(surface, element) : element;
  return { x: pointer.x - center.x, y: pointer.y - center.y };
}

/** Choose the destination with the object's centre, never with its floating handle. */
export function embroideryAtPointer(doc: DesignDoc, id: string, pointer: Pt, offset: Pt, view: DesignView, scene?: AssemblyScene, surface?: AssemblySurface) {
  const center = { x: pointer.x - offset.x, y: pointer.y - offset.y };
  const original = doc.elements.find(element => element.id === id);
  const samePoint = (point: Pt) => original && Math.hypot(original.x - point.x, original.y - point.y) < 1e-9;
  if (scene && surface) {
    const destination = assemblyHit(scene, center, surface.id)?.surface ?? surface;
    const point = inverseAssemblyPoint(destination, center);
    if (samePoint(point) && original?.viewId === destination.viewId && original.assemblySurfaceId === destination.id) return { doc, view: destination.view, surface: destination };
    return { doc: moveEmbroidery(doc, id, point, destination.viewId, { id: destination.id, label: destination.label }), view: destination.view, surface: destination };
  }
  // Editing a physical piece retains its chosen assembled side.
  return { doc: samePoint(center) ? doc : editElement(doc, id, center), view, surface };
}
