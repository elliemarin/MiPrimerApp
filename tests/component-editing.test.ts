import { describe, expect, it } from 'vitest';
import { newDesign, newElement, type DesignView } from '../src/features/studio/model';
import { alignElements, distribute, duplicateElements, editElement, expandSelection, refreshGroups, removeElements } from '../src/features/studio/ops';
import { componentDesignIssues, componentElementId, componentGroupId, readComponentsFromDesign, syncComponentDesign } from '../src/features/customize/componentDesign';
import { blankProject } from '../src/store/projects';
import { newPatternState } from '../src/lib/pattern/engine';
import type { PatternComponent } from '../src/lib/pattern/components';

const view: DesignView = { id: 'frente', kind: 'frente', label: 'Frente', source: { type: 'vacia' }, minX: -250, minY: 0, width: 500, height: 700, zones: [], refY: 100, refLabel: 'Cintura' };

function componentProject() {
  const project = blankProject('Chaleco con bolsillos', 'intervencion');
  project.design = newDesign([view]);
  project.pattern = newPatternState('manual', {}, { kind: 'mujer', fabric: 'plano', stretch: 0, fit: 'regular' });
  const component: PatternComponent = { id: 'bolsillo', kind: 'bolsillo-solapa-boton', width: 160, height: 180, quantity: 1, placement: { viewId: view.id, x: 90, y: 280, label: 'Pecho derecho' } };
  project.pattern.components = [component];
  return syncComponentDesign(project);
}

describe('edición de grupos y complementos de confección', () => {
  it('duplica grupos anidados junto con sus hijos y conserva las relaciones, aunque el arreglo no esté ordenado', () => {
    const doc = newDesign([view]);
    const outer = newElement(view.id, { id: 'outer', kind: 'grupo', x: 50, y: 50 });
    const inner = newElement(view.id, { id: 'inner', kind: 'grupo', parentId: 'outer', x: 60, y: 60 });
    const leaf = newElement(view.id, { id: 'leaf', parentId: 'inner', x: 70, y: 80, fill: { type: 'color', color: '#b4273a' } });
    doc.elements = [leaf, inner, outer];
    const { doc: copy, ids } = duplicateElements(doc, ['outer'], 25);
    expect(ids).toHaveLength(1);
    const created = copy.elements.filter(e => !doc.elements.some(old => old.id === e.id));
    expect(created).toHaveLength(3);
    const newOuter = created.find(e => e.id === ids[0])!;
    const newInner = created.find(e => e.parentId === newOuter.id)!;
    const newLeaf = created.find(e => e.parentId === newInner.id)!;
    expect(newLeaf.x).toBe(95);
    expect(newLeaf.y).toBe(105);
    expect(newLeaf.fill).toEqual(leaf.fill);
    expect(expandSelection(copy, [newOuter.id])).toContain(newLeaf.id);
    expect(doc.elements.map(e => e.id)).toEqual(['leaf', 'inner', 'outer']);
  });

  it('duplica un bolsillo como complemento nuevo con sus piezas y definición recuperable', () => {
    const project = componentProject();
    const original = project.design!;
    const body = original.elements.find(e => e.id === componentElementId('bolsillo', 'cuerpo'))!;
    body.fill = { type: 'color', color: '#90213a' };
    // Duplicar una parte también conserva la receta completa.
    const copied = duplicateElements(original, [body.id], 30);
    expect(copied.ids).toHaveLength(1);
    expect(copied.doc.componentSelections).toHaveLength(2);
    const selections = readComponentsFromDesign(project, copied.doc);
    expect(selections).toHaveLength(2);
    const duplicate = selections.find(c => c.id !== 'bolsillo')!;
    expect(duplicate.kind).toBe('bolsillo-solapa-boton');
    expect(duplicate.width).toBe(160);
    expect(duplicate.height).toBe(180);
    expect(duplicate.placement?.x).toBe(120);
    const duplicateBody = copied.doc.elements.find(e => e.id === componentElementId(duplicate.id, 'cuerpo'))!;
    expect(duplicateBody.fill).toEqual(body.fill);
    expect(duplicateBody.parentId).toBe(componentGroupId(duplicate.id));
    expect(copied.doc.elements.filter(e => e.parentId === componentGroupId(duplicate.id))).toHaveLength(original.elements.filter(e => e.parentId === componentGroupId('bolsillo')).length);
  });

  it('elimina todas las partes del complemento sin borrar su snapshot del historial', () => {
    const project = componentProject();
    const original = project.design!;
    const deleted = removeElements(original, [componentElementId('bolsillo', 'solapa')]);
    expect(deleted.elements).toHaveLength(0);
    expect(deleted.componentSelections).toHaveLength(1);
    expect(readComponentsFromDesign(project, deleted)).toHaveLength(0);
    // El documento anterior permite Deshacer incluso si el patrón actual ya no lo contiene.
    project.pattern!.components = [];
    expect(readComponentsFromDesign(project, original)).toHaveLength(1);
  });

  it('cambia dimensiones físicas del grupo y conserva el cuerpo vinculado al patrón', () => {
    const project = componentProject();
    const doc = refreshGroups(project.design!);
    const group = doc.elements.find(e => e.id === componentGroupId('bolsillo'))!;
    const resized = editElement(doc, group.id, { w: group.w * 1.5, h: group.h * 2 });
    const [component] = readComponentsFromDesign(project, resized);
    expect(component.width).toBeCloseTo(240, 6);
    expect(component.height).toBeCloseTo(360, 6);
    expect(component.quantity).toBe(1);
    expect(componentDesignIssues({ ...project, design: resized })).toEqual([]);
    expect(project.pattern!.components![0].width).toBe(160);
  });

  it('mueve, gira y refleja los hijos junto al grupo sin inflar repetidamente la caja', () => {
    const doc = newDesign([view]);
    doc.elements = [newElement(view.id, { id: 'body', parentId: 'group', x: 60, y: 90, w: 80, h: 120 }), newElement(view.id, { id: 'group', kind: 'grupo', x: 60, y: 90, w: 80, h: 120 })];
    const transformed = editElement(doc, 'group', { x: 100, y: 150, rotation: 30, flipX: true });
    const child = transformed.elements.find(e => e.id === 'body')!;
    expect(child.x).toBeCloseTo(100, 6);
    expect(child.y).toBeCloseTo(150, 6);
    expect(child.w).toBeCloseTo(80, 6);
    expect(child.h).toBeCloseTo(120, 6);
    const first = transformed.elements.find(e => e.id === 'group')!;
    const again = refreshGroups(refreshGroups(transformed)).elements.find(e => e.id === 'group')!;
    expect(again.w).toBeCloseTo(first.w, 6);
    expect(again.h).toBeCloseTo(first.h, 6);
    expect(again.w).toBeCloseTo(80, 6);
    expect(again.h).toBeCloseTo(120, 6);
  });

  it('propaga el bloqueo de un grupo a sus hijos y conserva el resto del diseño', () => {
    const project = componentProject();
    const doc = project.design!;
    const unrelated = newElement(view.id, { id: 'estrella', x: -90, y: 100 });
    doc.elements.push(unrelated);
    const locked = editElement(doc, componentGroupId('bolsillo'), { locked: true });
    expect(locked.elements.filter(e => e.id !== unrelated.id).every(e => e.locked)).toBe(true);
    expect(locked.elements.find(e => e.id === unrelated.id)).toEqual(unrelated);
  });

  it('mantiene la receta de un bolsillo al girar y reflejar el grupo completo', () => {
    const project = componentProject();
    const doc = refreshGroups(project.design!);
    const group = doc.elements.find(e => e.id === componentGroupId('bolsillo'))!;
    const moved = editElement(doc, group.id, { rotation: 45, flipX: true, x: group.x + 30, y: group.y + 40 });
    expect(componentDesignIssues({ ...project, design: moved })).toEqual([]);
    const [component] = readComponentsFromDesign(project, moved);
    expect(component.width).toBeCloseTo(160);
    expect(component.height).toBeCloseTo(180);
  });

  it('alinea grupos con todos sus hijos sin volver a mover un hijo seleccionado por separado', () => {
    const doc = newDesign([view]);
    doc.elements = [
      newElement(view.id, { id: 'a', kind: 'grupo', x: 80, y: 100, w: 60, h: 80 }),
      newElement(view.id, { id: 'a-child', parentId: 'a', x: 80, y: 100, w: 60, h: 80 }),
      newElement(view.id, { id: 'b', kind: 'grupo', x: 240, y: 180, w: 100, h: 120 }),
      newElement(view.id, { id: 'b-child', parentId: 'b', x: 240, y: 180, w: 100, h: 120 })
    ];
    const aligned = alignElements(doc, ['a', 'a-child', 'b'], 'izq');
    const a = aligned.elements.find(e => e.id === 'a')!, b = aligned.elements.find(e => e.id === 'b')!;
    expect(a.x - a.w / 2).toBeCloseTo(b.x - b.w / 2, 6);
    expect(aligned.elements.find(e => e.id === 'a-child')!.x).toBe(a.x);
    expect(aligned.elements.find(e => e.id === 'b-child')!.x).toBe(b.x);
    expect(aligned.elements.find(e => e.id === 'b-child')!.w).toBe(100);
    expect(aligned.elements.find(e => e.id === 'b-child')!.y).toBe(180);
  });

  it('reparte grupos conservando el desplazamiento relativo de sus partes', () => {
    const doc = newDesign([view]);
    doc.elements = [0, 1, 2].flatMap((index) => [
      newElement(view.id, { id: `g${index}`, kind: 'grupo', x: [50, 100, 350][index], y: 100, w: 40, h: 60 }),
      newElement(view.id, { id: `c${index}`, parentId: `g${index}`, x: [50, 100, 350][index], y: 100, w: 40, h: 60 })
    ]);
    const spread = distribute(doc, ['g0', 'g1', 'g2', 'c1'], 'h');
    expect(spread.elements.find(e => e.id === 'g1')!.x).toBe(200);
    expect(spread.elements.find(e => e.id === 'c1')!.x).toBe(200);
    expect(spread.elements.find(e => e.id === 'c1')!.w).toBe(40);
    expect(spread.elements.find(e => e.id === 'c0')!.x).toBe(50);
    expect(spread.elements.find(e => e.id === 'c2')!.x).toBe(350);
  });
});
