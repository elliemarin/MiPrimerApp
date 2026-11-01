import { describe, expect, it } from 'vitest';
import { PDFDocument } from 'pdf-lib';
import { applyH, convexQuad, invertH, localScale, multiplyH, solveHomography, type Homography } from '../src/lib/projector/homography';
import { cornerCalibration, estimatedCalibration, parseCalibration, rectCorners, rescaleToScreen, rulerCalibration, screenChanged, visibleTable, calibrationNotes } from '../src/lib/projector/calibration';
import { layoutPieces, placementMatrix, sceneBounds, sceneFromDrawable } from '../src/lib/projector/scene';
import { buildProjectorPdf, layoutProjectorPages, MAX_PAGE_MM } from '../src/lib/pdf/projector';
import { projectorSource } from '../src/lib/projector/source';
import type { Drawable } from '../src/lib/draw/drawable';
import { matApply } from '../src/lib/geom/vec';
import { findModel } from '../src/data/catalog';
import { projectFromModel } from '../src/store/projects';
import { profileFromSize } from '../src/store/profiles';
import { SIZE_TABLES } from '../src/lib/sizes/tables';

const close = (a: { x: number; y: number }, b: { x: number; y: number }, digits = 6) => { expect(a.x).toBeCloseTo(b.x, digits); expect(a.y).toBeCloseTo(b.y, digits); };
const rect = (id: string, w: number, h: number): Drawable => ({
  id, name: id, labels: [{ text: id, at: { x: w / 2, y: h / 2 }, size: 5 }], grains: [{ a: { x: w / 2, y: 10 }, b: { x: w / 2, y: h - 10 } }],
  paths: [{ style: 'corte', cmds: [{ op: 'M', p: { x: 0, y: 0 } }, { op: 'L', p: { x: w, y: 0 } }, { op: 'C', c1: { x: w + 20, y: h / 3 }, c2: { x: w + 20, y: 2 * h / 3 }, p: { x: w, y: h } }, { op: 'L', p: { x: 0, y: h } }, { op: 'Z' }] }],
  bbox: { minX: 0, minY: 0, maxX: w + 15, maxY: h }
});
const kidProject = (id: string) => {
  const table = SIZE_TABLES.find(t => t.id === 'ref-infantil-estatura')!;
  return projectFromModel(findModel(id)!, profileFromSize(table, table.rows.find(r => r.code === 'E116')!));
};
const ctx = { profiles: {}, fabrics: {}, materials: {}, unit: 'cm' as const };

describe('homografía del proyector', () => {
  const tilted: Homography = [1.3, .08, 200, -.05, 1.25, 120, .00011, -.00007, 1];
  const table = [{ x: 0, y: 0 }, { x: 400, y: 0 }, { x: 400, y: 300 }, { x: 0, y: 300 }];

  it('resuelve exactamente cuatro esquinas, incluida la inclinación, y su inversa', () => {
    const screen = table.map(p => applyH(tilted, p));
    const H = solveHomography(table, screen)!;
    for (const p of [{ x: 123, y: 45 }, { x: 390, y: 290 }, { x: -50, y: 500 }]) close(applyH(H, p), applyH(tilted, p), 4);
    const inv = invertH(H)!;
    close(applyH(inv, applyH(H, { x: 210, y: 77 })), { x: 210, y: 77 }, 6);
    close(applyH(multiplyH(H, inv), { x: 33, y: 44 }), { x: 33, y: 44 }, 6);
  });

  it('rechaza esquinas en orden cruzado o alineadas', () => {
    expect(convexQuad([{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 10 }, { x: 0, y: 10 }])).toBe(true);
    expect(convexQuad([{ x: 0, y: 0 }, { x: 10, y: 10 }, { x: 10, y: 0 }, { x: 0, y: 10 }])).toBe(false);
    expect(solveHomography(table, [{ x: 0, y: 0 }, { x: 1, y: 1 }, { x: 2, y: 2 }, { x: 3, y: 3 }])).toBeUndefined();
  });
});

describe('calibración', () => {
  const screen = { w: 1920, h: 1080 };

  it('la calibración rápida con regla corrige ancho y alto de forma independiente', () => {
    const start = estimatedCalibration(screen);
    expect(start.method).toBe('estimada');
    expect(calibrationNotes(start).notes[0]).toMatch(/Sin calibrar/);
    const center = applyH(invertH(start.H)!, { x: screen.w / 2, y: screen.h / 2 });
    const next = rulerCalibration(start, center, { w: 92, h: 96 })!;
    const a = applyH(next.H, { x: center.x - 50, y: center.y - 50 }), b = applyH(next.H, { x: center.x + 50, y: center.y + 50 });
    const before = localScale(start.H, center);
    expect(b.x - a.x).toBeCloseTo(100 * before * 100 / 92, 6);
    expect(b.y - a.y).toBeCloseTo(100 * before * 100 / 96, 6);
    close(applyH(next.H, center), applyH(start.H, center));
    expect(next.method).toBe('regla');
    expect(rulerCalibration(start, center, { w: 0, h: 100 })).toBeUndefined();
  });

  it('la calibración de cuatro esquinas lleva el rectángulo real a las cruces de la pantalla', () => {
    const corners = [{ x: 300, y: 200 }, { x: 1610, y: 230 }, { x: 1580, y: 900 }, { x: 320, y: 870 }];
    const c = cornerCalibration({ w: 600, h: 300 }, corners, screen)!;
    rectCorners(600, 300).forEach((p, i) => close(applyH(c.H, p), corners[i], 6));
    expect(c.method).toBe('esquinas');
    expect(cornerCalibration({ w: 600, h: 300 }, [corners[0], corners[2], corners[1], corners[3]], screen)).toBeUndefined();
    expect(cornerCalibration({ w: 10, h: 300 }, corners, screen)).toBeUndefined();
    const visible = visibleTable(c.H, screen)!;
    expect(visible.maxX - visible.minX).toBeGreaterThan(600);
  });

  it('guarda solo datos válidos y detecta otra ventana', () => {
    const c = estimatedCalibration(screen);
    expect(parseCalibration(JSON.parse(JSON.stringify(c)))).toEqual(c);
    expect(parseCalibration({ ...c, H: [1, 2, 3] })).toBeUndefined();
    expect(parseCalibration({ ...c, H: [0, 0, 0, 0, 0, 0, 0, 0, 0] })).toBeUndefined();
    expect(parseCalibration('basura')).toBeUndefined();
    expect(screenChanged(c, { w: 1920, h: 1080 })).toBe(false);
    expect(screenChanged(c, { w: 1280, h: 720 })).toBe(true);
    const scaled = rescaleToScreen(c, { w: 960, h: 540 });
    close(applyH(scaled.H, { x: 0, y: 0 }), { x: 480, y: 270 });
  });
});

describe('escena de proyección', () => {
  it('conserva el tamaño al acomodar, girar y voltear', () => {
    const pieces = [rect('a', 300, 200), rect('b', 500, 120), rect('c', 250, 400)].map(d => sceneFromDrawable(d));
    expect(pieces[0].lines[0].closed).toBe(true);
    expect(pieces[0].lines[0].pts.length).toBeGreaterThan(5);
    const laid = layoutPieces(pieces, 700, 30);
    for (const p of laid) expect(p.bbox.maxX - p.bbox.minX).toBeCloseTo(pieces.find(q => q.id === p.id)!.bbox.maxX - pieces.find(q => q.id === p.id)!.bbox.minX, 6);
    for (let i = 0; i < laid.length; i++) for (let j = i + 1; j < laid.length; j++) {
      const a = laid[i].bbox, b = laid[j].bbox;
      expect(a.maxX <= b.minX || b.maxX <= a.minX || a.maxY <= b.minY || b.maxY <= a.minY).toBe(true);
    }
    const bounds = sceneBounds(laid), center = { x: (bounds.minX + bounds.maxX) / 2, y: (bounds.minY + bounds.maxY) / 2 };
    for (const rotation of [0, 90, 180, 270] as const) for (const mirror of [false, true]) {
      const M = placementMatrix({ x: 500, y: 400, rotation, mirror }, center);
      const p = matApply(M, { x: 10, y: 20 }), q = matApply(M, { x: 110, y: 20 });
      expect(Math.hypot(q.x - p.x, q.y - p.y)).toBeCloseTo(100, 9);
      close(matApply(M, center), { x: 500, y: 400 }, 9);
      expect(Math.sign(M[0] * M[3] - M[1] * M[2])).toBe(mirror ? -1 : 1);
    }
  });
});

describe('PDF para proyector', () => {
  it('reparte piezas sin traslapes en hojas de hasta 4,8 m y calcula su tamaño en centímetros enteros', () => {
    const many = Array.from({ length: 30 }, (_, i) => rect(`p${i}`, 600, 700));
    const { pages, placed, tooWide } = layoutProjectorPages(many, 1400);
    expect(tooWide).toEqual([]);
    expect(pages.length).toBeGreaterThan(1);
    for (const page of pages) { expect(page.h).toBeLessThanOrEqual(MAX_PAGE_MM); expect(page.w % 10).toBe(0); expect(page.h % 10).toBe(0); }
    expect([...placed.keys()].sort()).toEqual(many.map(d => d.id).sort());
    expect(layoutProjectorPages([rect('enorme', 200, 6000)], 1400).tooWide).toEqual(['enorme']);
  });

  it('genera hojas 1:1 del patrón real con fondo negro y JSON de trazabilidad', async () => {
    const project = kidProject('vestido-trapecio-volantes');
    const source = projectorSource(project, ctx);
    expect(source.blockers).toEqual([]);
    const pattern = source.groups.find(g => g.id === 'patron')!;
    expect(pattern.drawables.map(d => d.id)).toEqual(expect.arrayContaining(['delantero', 'espalda', 'volante']));
    const result = await buildProjectorPdf(pattern.drawables, { theme: 'oscuro', width: 1400, grid: true }, { title: project.name, lines: ['prueba'], footer: '', json: { prueba: true } });
    const doc = await PDFDocument.load(result.bytes);
    expect(doc.getPageCount()).toBe(result.pages.length);
    doc.getPages().forEach((page, i) => {
      expect(page.getWidth() * 25.4 / 72).toBeCloseTo(result.pages[i].w, 3);
      expect(page.getHeight() * 25.4 / 72).toBeCloseTo(result.pages[i].h, 3);
    });
    expect(doc.getTitle()).toMatch(/proyector/);
  });

  it('omite piezas ocultas y no exige colores para proyectar', () => {
    const project = kidProject('falda-tul');
    const hidden = { ...project, pattern: { ...project.pattern!, hidden: ['falda-base'] } };
    const ids = projectorSource(hidden, ctx).groups.find(g => g.id === 'patron')!.drawables.map(d => d.id);
    expect(ids).not.toContain('falda-base');
    expect(ids).toContain('capa-tul');
    expect(projectorSource(project, ctx).blockers).toEqual([]);
  });
});
