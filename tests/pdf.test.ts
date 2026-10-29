import { describe, it, expect } from 'vitest';
import { PDFDocument } from 'pdf-lib';
import { writeFileSync, mkdirSync } from 'fs';
import { findSize } from '../src/lib/sizes/tables';
import { buildPattern, newPatternState, layoutMatrix } from '../src/lib/pattern/engine';
import { pieceDrawable } from '../src/lib/draw/drawable';
import { exportTiledPdf, exportPackedPdf, arrangeForTiles, unionBBox, tilesWithContent } from '../src/lib/pdf/export';
import { computeGrid, contentBox, DEFAULT_TILE } from '../src/lib/pdf/tile';

const OUT = process.env.PDF_OUT;

function pants() {
  const row = findSize('ref-mujer-busto', 'M92')!;
  const b = buildPattern(newPatternState('pantalon-cintura-elastica', row.values, { kind: 'mujer', fabric: 'plano', stretch: 0, fit: 'regular' }));
  return b.pieces.map((p) => pieceDrawable(p, b.cuts.get(p.id)!, layoutMatrix(undefined), { subtitle: 'M92', version: 'patrón v1' }));
}

const info = { title: 'Prueba', lines: ['Proyecto: prueba', 'Medidas: M92 v1', 'Patrón: v1'], footer: 'Prueba · v1', json: { test: true } };

describe('cuadrícula carta', () => {
  it('área útil y paso con márgenes y solapamiento', () => {
    const c = contentBox(DEFAULT_TILE);
    expect(c.w).toBeCloseTo(215.9 - 16, 9);
    expect(c.h).toBeCloseTo(279.4 - 16 - 13, 9);
    const g = computeGrid({ minX: 0, minY: 0, maxX: 500, maxY: 300 }, DEFAULT_TILE);
    expect(g.stepX).toBeCloseTo(c.w - 12, 9);
    // Cobertura completa del diseño.
    const last = g.tiles[g.tiles.length - 1];
    expect(last.x + c.w).toBeGreaterThanOrEqual(500);
    expect(last.y + c.h).toBeGreaterThanOrEqual(300);
    expect(g.tiles[0].x).toBeLessThanOrEqual(0);
    // Hojas contiguas comparten exactamente el solapamiento.
    expect(g.tiles[0].x + c.w - g.tiles[1].x).toBeCloseTo(12, 9);
  });
});

describe('PDF', () => {
  it('genera hojas carta con impresión sin escalar y JSON adjunto', async () => {
    const ds = arrangeForTiles(pants(), DEFAULT_TILE);
    const res = await exportTiledPdf(ds, { settings: DEFAULT_TILE }, info);
    const doc = await PDFDocument.load(res.bytes);
    const pages = doc.getPages();
    expect(pages.length).toBe(res.pages.length + 1);
    for (const p of pages) {
      expect(p.getWidth()).toBeCloseTo(612, 3);
      expect(p.getHeight()).toBeCloseTo(792, 3);
    }
    const grid = computeGrid(unionBBox(ds), DEFAULT_TILE);
    expect(tilesWithContent(grid, ds).size).toBe(res.pages.length);
    if (OUT) {
      mkdirSync(OUT, { recursive: true });
      writeFileSync(`${OUT}/patron.pdf`, res.bytes);
    }
  });

  it('acomoda plantillas pequeñas varias por hoja', async () => {
    const ds = pants().slice(0, 0);
    const sq = (id: string, w: number, h: number) => ({
      id,
      name: id,
      paths: [{ style: 'corte' as const, cmds: [{ op: 'M' as const, p: { x: 0, y: 0 } }, { op: 'L' as const, p: { x: w, y: 0 } }, { op: 'L' as const, p: { x: w, y: h } }, { op: 'L' as const, p: { x: 0, y: h } }, { op: 'Z' as const }] }],
      labels: [],
      grains: [],
      bbox: { minX: 0, minY: 0, maxX: w, maxY: h }
    });
    for (let i = 0; i < 8; i++) ds.push(sq(`a${i}`, 40 + (i % 3) * 15, 50 + (i % 4) * 10));
    const res = await exportPackedPdf(ds, DEFAULT_TILE, info);
    expect(res.sheets).toBe(1);
    const c = contentBox(DEFAULT_TILE);
    for (const p of res.placements) {
      const d = ds.find((x) => x.id === p.id)!;
      expect(p.x + d.bbox.maxX).toBeLessThanOrEqual(c.w + 1e-9);
      expect(p.y + d.bbox.maxY).toBeLessThanOrEqual(c.h + 1e-9);
    }
    if (OUT) writeFileSync(`${OUT}/aplicaciones.pdf`, res.bytes);
  });
});
