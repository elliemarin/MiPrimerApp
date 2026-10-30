import { describe, expect, it } from 'vitest';
import { newDesign, newElement } from '../src/features/studio/model';
import type { DesignView } from '../src/features/studio/model';
import { embroideryForView, embroideryViews, HD9120_HOOP } from '../src/features/projects/tabs/embroideryExport';
import { cmdsToPolylines } from '../src/lib/draw/flatten';
import { planStitches, readDst, writeDst } from '../src/lib/dst';

const view = (id: string): DesignView => ({ id, label: id, kind: 'detalle', source: { type: 'vacia' }, minX: 0, minY: 0, width: 200, height: 200, zones: [], refY: 0, refLabel: 'Origen' });

describe('exportación de bordado por vista', () => {
  it('mantiene la separación física de motivos y excluye otras vistas y elementos ocultos', () => {
    const doc = newDesign([view('frente'), view('espalda')]);
    doc.elements = [
      newElement('frente', { id: 'uno', technique: 'bordado', shape: { type: 'rect' }, x: 20, y: 30, w: 10, h: 20 }),
      newElement('frente', { id: 'dos', technique: 'bordado', shape: { type: 'rect' }, x: 100, y: 30, w: 10, h: 20 }),
      newElement('espalda', { id: 'atras', technique: 'bordado', shape: { type: 'rect' }, x: 900, y: 30, w: 50, h: 20 }),
      newElement('frente', { id: 'oculto', technique: 'bordado', shape: { type: 'rect' }, x: -500, y: 30, hidden: true })
    ];
    const drawables = embroideryForView(doc, 'frente');
    expect(drawables.map((d) => d.id)).toEqual(['bord-uno', 'bord-dos']);
    const runs = drawables.flatMap((d) => d.paths.flatMap((path) => cmdsToPolylines(path.cmds, 0.2).map((pl) => ({ color: '#000', pts: pl.closed ? [...pl.pts, pl.pts[0]] : pl.pts }))));
    const plan = planStitches(runs);
    expect((plan.extents.maxX - plan.extents.minX) / 10).toBeCloseTo(90);
    expect((plan.extents.maxY - plan.extents.minY) / 10).toBeCloseTo(20);
    expect(plan.stitches.filter((s) => s.kind === 'salto')).toHaveLength(2);
    const decoded = readDst(writeDst('frente', plan));
    const xs = decoded.pts.map((pt) => pt.x);
    expect(Math.max(...xs) - Math.min(...xs)).toBe(900);
    expect(embroideryForView(doc, 'inexistente')).toEqual([]);
    expect(embroideryViews(doc).map((v) => v.id)).toEqual(['frente', 'espalda']);
  });

  it('ofrece el área de referencia de 170 × 100 mm para HD9120', () => {
    expect([HD9120_HOOP.w, HD9120_HOOP.h]).toEqual([170, 100]);
  });
});
