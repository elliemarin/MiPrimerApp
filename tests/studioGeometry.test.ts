import { describe, expect, it } from 'vitest';
import { computeCutouts } from '../src/features/studio/despiece';
import { DesignView, elementMatrix, newDesign, newElement } from '../src/features/studio/model';
import { cmdsToSvg, polylineCmds } from '../src/lib/draw/paths';
import { matApply, matInvert, matMul, matRotate, matScale, pointInPolygon } from '../src/lib/geom/vec';
import { polygonsArea } from '../src/lib/geom/polyoffset';

const view: DesignView = {
  id: 'vista', kind: 'frente', label: 'Frente', source: { type: 'vacia' },
  minX: -200, minY: -200, width: 400, height: 400,
  zones: [{ id: 'mitad', label: 'Mitad derecha', type: 'delantero', d: 'M0 -40 L50 -40 L50 40 L0 40 Z' }],
  refY: 0, refLabel: 'Cintura'
};

function base() {
  const doc = newDesign([structuredClone(view)]);
  const el = newElement(view.id, {
    id: 'recorte', w: 100, h: 80, x: 0, y: 0, technique: 'aplicacion', maskZoneId: 'mitad',
    allowance: 0, edge: 'crudo', fill: { type: 'color', color: '#c0582d' }
  });
  doc.elements = [el];
  return { doc, el };
}

describe('despiece: el recorte exportado respeta la máscara visible', () => {
  it('corta por la zona antes de agregar el margen', () => {
    const { doc, el } = base();
    const [cut] = computeCutouts(doc, {}, 'cm');
    expect(polygonsArea(cut.finalPolys)).toBeCloseTo(4000, 3);
    expect(cut.widthMm).toBeCloseTo(50, 3);
    expect(cut.heightMm).toBeCloseTo(80, 3);
    el.allowance = 5;
    const [withMargin] = computeCutouts(doc, {}, 'cm');
    expect(polygonsArea(withMargin.finalPolys)).toBeCloseTo(4000, 3);
    expect(withMargin.widthMm).toBeCloseTo(60, 3);
    expect(withMargin.heightMm).toBeCloseTo(90, 3);
  });

  it('compone recorte libre, giro, espejo y orientación del estampado', () => {
    const { doc, el } = base();
    el.x = 120;
    el.y = -30;
    el.rotation = 90;
    el.flipX = true;
    el.fill = { type: 'tela', fabricId: 'denim', rotation: 30, scale: 1, offsetX: 0, offsetY: 0 };
    // La zona conserva la mitad derecha de la figura en sus coordenadas locales.
    const maskLocal = [{ x: 0, y: -40 }, { x: 50, y: -40 }, { x: 50, y: 40 }, { x: 0, y: 40 }];
    const worldMask = maskLocal.map((p) => matApply(elementMatrix(el), p));
    doc.views[0].zones[0].d = cmdsToSvg(polylineCmds(worldMask, true));
    // El recorte libre limita además la altura a los 40 mm centrales.
    el.clip = [[-0.5, -0.25], [0.5, -0.25], [0.5, 0.25], [-0.5, 0.25]];
    const [cut] = computeCutouts(doc, {}, 'cm');
    expect(polygonsArea(cut.finalPolys)).toBeCloseTo(2000, 1);
    const template = matMul(matRotate(-30), matScale(-1, 1));
    const backToWorld = matMul(elementMatrix(el), matInvert(template));
    // El centro de cada arista de corte queda en la zona visual de la prenda.
    // La tolerancia lleva los puntos de borde un micrómetro hacia su centro.
    const center = matApply(elementMatrix(el), { x: 25, y: 0 });
    for (const p of cut.finalPolys.flat()) {
      const w = matApply(backToWorld, p);
      expect(pointInPolygon({ x: w.x * 0.9999 + center.x * 0.0001, y: w.y * 0.9999 + center.y * 0.0001 }, worldMask)).toBe(true);
    }
  });

  it('no exporta una aplicación totalmente fuera de su zona', () => {
    const { doc, el } = base();
    el.x = 250;
    expect(computeCutouts(doc, {}, 'cm')).toHaveLength(0);
  });

  it('una máscara inexistente no produce un recorte invisible', () => {
    const { doc, el } = base();
    el.maskZoneId = 'zona-eliminada';
    expect(computeCutouts(doc, {}, 'cm')).toHaveLength(0);
  });

  it('sin máscara conserva la geometría completa', () => {
    const { doc, el } = base();
    el.maskZoneId = undefined;
    expect(polygonsArea(computeCutouts(doc, {}, 'cm')[0].finalPolys)).toBeCloseTo(8000, 3);
  });
});
