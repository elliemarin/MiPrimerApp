import { describe, expect, it } from 'vitest';
import { mkdirSync, writeFileSync } from 'node:fs';
import { PDFDocument, PrintScaling } from 'pdf-lib';
import { TRANSFORMATIONS, transformationMatches } from '../src/data/transformations';
import { TRANSFORMATION_CONTEXT, TRANSFORMATION_GENERATORS } from '../src/lib/pattern/generators/transformations';
import { buildTransformationPdf, prepareTransformation } from '../src/features/transform/export';
import { edgeLength } from '../src/lib/pattern/outline';
import type { Params } from '../src/lib/pattern/generator';

describe('transformaciones medidas sobre prendas existentes', () => {
  for (const idea of TRANSFORMATIONS) for (const scale of [.8, 1, 1.2]) {
    it(`${idea.id}: medidas ${scale} sin errores ni costuras incompatibles`, () => {
      const initial = prepareTransformation(idea);
      const params = Object.fromEntries(Object.entries(initial.params).map(([key, value]) => [key, initial.generator.params.find(def => def.key === key)?.type === 'length' && key !== 'margen' ? Number(value) * scale : value]));
      const { built } = prepareTransformation(idea, params);
      expect(built.issues.filter(issue => issue.level === 'error'), JSON.stringify(built.issues)).toEqual([]);
      expect(built.pieces.length).toBeGreaterThan(0);
      expect(built.cuts.size).toBe(built.pieces.length);
      for (const relation of built.seamResults) expect(relation.ok, relation.relation.label).toBe(true);
      for (const check of built.result!.checks) expect(Math.abs(check.measured - check.target), check.label).toBeLessThanOrEqual(check.tolerance);
      for (const step of built.result!.steps) {
        for (const id of step.pieces) expect(built.pieces.some(piece => piece.id === id), id).toBe(true);
        for (const id of step.seams ?? []) expect(built.result!.seams.some(seam => seam.id === id), id).toBe(true);
      }
      expect(built.result!.assumptions.join(' ')).toContain('prenda existente no está incluida');
      expect(initial.generator.requiredMeasures).toEqual([]);
      expect(initial.generator.status).toBe('experimental');
    });
  }
  it('hay 27 sugerencias con 10 construcciones, no se cuentan como 27 patrones de prendas', () => {
    expect(TRANSFORMATIONS).toHaveLength(27);
    expect(new Set(TRANSFORMATIONS.map(idea => idea.id)).size).toBe(27);
    expect(new Set(TRANSFORMATIONS.map(idea => idea.construction)).size).toBe(10);
    expect(TRANSFORMATION_GENERATORS).toHaveLength(10);
  });
  it('cada filtro de prenda es estricto y la búsqueda combina todas las palabras', () => {
    for (const garment of ['pantalon', 'hoodie', 'camisa', 'chaqueta', 'vestido', 'falda'] as const) {
      const found = TRANSFORMATIONS.filter(idea => transformationMatches(idea, garment, ''));
      expect(found.length).toBeGreaterThan(0);
      expect(found.every(idea => idea.garment === garment)).toBe(true);
    }
    expect(TRANSFORMATIONS.filter(idea => transformationMatches(idea, 'todos', 'CAMPANA SETENTERA')).map(idea => idea.id)).toEqual(['pantalon-campana-70']);
    expect(TRANSFORMATIONS.filter(idea => transformationMatches(idea, 'hoodie', 'vaqueros'))).toEqual([]);
  });
  it('las costuras de la cuña igualan la abertura; su altura no se confunde con el costado inclinado', () => {
    const idea = TRANSFORMATIONS.find(idea => idea.id === 'pantalon-campana-70')!;
    const { built } = prepareTransformation(idea, { abertura: 400, aumento: 240 });
    const piece = built.pieces[0];
    expect(edgeLength(piece, piece.edges[0])).toBeCloseTo(400, 8);
    expect(edgeLength(piece, piece.edges[2])).toBeCloseTo(400, 8);
    expect(piece.nodes[1].y).toBeCloseTo(Math.sqrt(400 ** 2 - 120 ** 2), 8);
    expect(piece.nodes[1].y).toBeLessThan(400);
  });
  it('márgenes mayores no cambian las medidas terminadas', () => {
    for (const idea of TRANSFORMATIONS) {
      const small = prepareTransformation(idea, { margen: 5 }).built;
      const large = prepareTransformation(idea, { margen: 15 }).built;
      expect(large.result!.checks.map(check => check.measured)).toEqual(small.result!.checks.map(check => check.measured));
    }
  });
  it('cuenta las dos caras de cada tapa y cada parche, y una tira por fuelle', () => {
    const flap = prepareTransformation(TRANSFORMATIONS.find(idea => idea.id === 'chaqueta-bolsillo-tapa')!).built;
    expect(flap.pieces.find(piece => piece.id === 'bolsillo')!.cut.qty).toBe(2);
    expect(flap.pieces.find(piece => piece.id === 'tapa')!.cut.qty).toBe(4);
    const patch = prepareTransformation(TRANSFORMATIONS.find(idea => idea.id === 'pantalon-rodilleras')!).built;
    expect(patch.pieces.map(piece => piece.cut.qty)).toEqual([2, 2]);
    const cargo = prepareTransformation(TRANSFORMATIONS.find(idea => idea.id === 'pantalon-cargo')!).built;
    const front = cargo.pieces.find(piece => piece.id === 'bolsillo')!;
    const strip = cargo.pieces.find(piece => piece.id === 'fuelle')!;
    expect(edgeLength(strip, strip.edges[0])).toBeCloseTo(front.edges.slice(1).reduce((sum, edge) => sum + edgeLength(front, edge), 0), 8);
  });
  it('rechaza dimensiones inválidas, no finitas, cantidades arbitrarias y cuñas imposibles', async () => {
    const panel = TRANSFORMATIONS[0];
    const invalid: Params[] = [{ ancho: 0 }, { largo: NaN }, { margen: 50 }, { cantidad: 3 }, { ancho: 35, margen: 20 }];
    for (const params of invalid) {
      expect(prepareTransformation(panel, params).built.issues.some(issue => issue.level === 'error')).toBe(true);
      await expect(buildTransformationPdf(panel, params)).rejects.toThrow();
    }
    const wedge = TRANSFORMATIONS.find(idea => idea.construction === 'cuna')!;
    expect(prepareTransformation(wedge, { abertura: 100, aumento: 250 }).built.issues.some(issue => issue.code === 'transform-cuna-ancha')).toBe(true);
  });
  it('todos los motores tienen valores iniciales válidos, sin medidas corporales inventadas', () => {
    for (const generator of TRANSFORMATION_GENERATORS) expect(generator.generate(TRANSFORMATION_CONTEXT, generator.defaults(TRANSFORMATION_CONTEXT)).notices.filter(issue => issue.level === 'error')).toEqual([]);
  });
  for (const id of ['vaquero-costados', 'pantalon-campana-70', 'pantalon-cargo']) it(`PDF ${id}: guía y patrones vectoriales carta sin escalado`, async () => {
    const result = await buildTransformationPdf(TRANSFORMATIONS.find(idea => idea.id === id)!, {}, 'Marca superior a 15 cm bajo la cintura.');
    const pdf = await PDFDocument.load(result.bytes);
    expect(pdf.getPageCount()).toBe(result.pageCount);
    expect(result.patternStartPage).toBeGreaterThan(1);
    expect(pdf.getPageCount()).toBeGreaterThan(result.patternStartPage);
    expect(pdf.catalog.getOrCreateViewerPreferences().getPrintScaling()).toBe(PrintScaling.None);
    for (const page of pdf.getPages()) {
      expect(page.getWidth()).toBeCloseTo(612, 3);
      expect(page.getHeight()).toBeCloseTo(792, 3);
    }
    expect(result.manifest.includesBaseGarment).toBe(false);
    expect(result.manifest.placement.note).toContain('15 cm');
    if (process.env.PDF_OUT) { mkdirSync(process.env.PDF_OUT, { recursive: true }); writeFileSync(`${process.env.PDF_OUT}/transform-${id}.pdf`, result.bytes); }
  });
});
