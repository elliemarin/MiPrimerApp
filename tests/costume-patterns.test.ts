import { describe, expect, it } from 'vitest';
import { COSTUME_GENERATORS, capeGenerator, crownGenerator, wizardHatGenerator, earsGenerator } from '../src/lib/pattern/generators/costumes';
import { COSTUME_CATALOG } from '../src/data/costumeCatalog';
import { buildPattern, newPatternState } from '../src/lib/pattern/engine';
import { edgeLength, edgesLength, seamPolygon } from '../src/lib/pattern/outline';
import { cutOutline } from '../src/lib/pattern/offset';
import { evaluateSeams, validatePattern } from '../src/lib/pattern/validate';
import { bboxOf } from '../src/lib/geom/vec';

const ctx = { body: {}, kind: 'mujer' as const, fabric: 'plano' as const, stretch: 0, fit: 'regular' as const };
const errors = (result: ReturnType<typeof capeGenerator.generate>) => [...result.notices, ...validatePattern(result)].filter(issue => issue.level === 'error');

describe('Disfraces originales con piezas reales y estado experimental', () => {
  for (const model of COSTUME_CATALOG) it(`${model.id}: contornos cerrados, piezas y costuras reales`, () => {
    const generator = COSTUME_GENERATORS.find(generator => generator.id === model.generatorId)!;
    const result = generator.generate(ctx, { ...generator.defaults(ctx), ...model.params });
    expect(errors(result)).toEqual([]);
    expect(evaluateSeams(result.pieces, result.seams).every(seam => seam.ok)).toBe(true);
    for (const piece of result.pieces) {
      const cut = cutOutline(piece);
      expect(cut.points.every(point => Number.isFinite(point.x) && Number.isFinite(point.y))).toBe(true);
      expect(bboxOf(cut.points).maxX).toBeGreaterThan(bboxOf(cut.points).minX);
    }
    for (const step of result.steps) {
      expect(step.detail.length).toBeGreaterThan(65);
      for (const id of step.pieces) expect(result.pieces.some(piece => piece.id === id)).toBe(true);
      for (const id of step.seams ?? []) expect(result.seams.some(seam => seam.id === id)).toBe(true);
    }
    expect(model.status).toBe('experimental');
    expect(generator.status).toBe('experimental');
  });

  it('capa: el escote suma la holgura una sola vez y cada pareja espejo forma una capa completa', () => {
    const result = capeGenerator.generate(ctx, { contornoCuello: 380, holguraCuello: 40, largo: 810, margen: 7 });
    const [outer, lining] = result.pieces;
    const neck = edgesLength(outer, outer.edges.filter(edge => edge.id.startsWith('cuello-')).map(edge => edge.id)) * 2;
    expect(neck).toBeCloseTo(420, 2);
    expect(edgeLength(outer, outer.edges.find(edge => edge.id === 'centro-espalda')!)).toBeCloseTo(810, 6);
    expect(outer.cut).toMatchObject({ qty: 2, mirrorPairs: true, onFold: false, fabric: 'principal' });
    expect(lining.cut).toMatchObject({ qty: 2, mirrorPairs: true, fabric: 'forro' });
    expect(result.materials.some(item => /cordón/.test(item.label))).toBe(false);
  });

  it('sombrero: sector y hueco montado del ala coinciden sin embebido ni círculo tapado', () => {
    for (const head of [420, 540, 680]) for (const height of [150, 330, 600]) {
      const result = wizardHatGenerator.generate(ctx, { contornoCabeza: head, holgura: 10, alto: height, anchoAla: 100, margen: 7 });
      expect(errors(result)).toEqual([]);
      const cone = result.pieces.find(piece => piece.id === 'cono')!, wing = result.pieces.find(piece => piece.id === 'ala')!;
      const coneLength = edgesLength(cone, cone.edges.filter(edge => edge.id.startsWith('base-')).map(edge => edge.id));
      const wingLength = edgesLength(wing, wing.edges.filter(edge => edge.id.startsWith('interior-')).map(edge => edge.id)) * 2;
      expect(coneLength).toBeCloseTo(head + 10, 2);
      expect(Math.abs(wingLength - coneLength)).toBeLessThan(.02);
      expect(wing.cut.qty).toBe(2);
      expect(wing.nodes.find(node => node.id === 'interior-der')!.x).toBeCloseTo((head + 10) / (2 * Math.PI), 6);
      expect(wing.edges.some(edge => edge.id.startsWith('interior-'))).toBe(true);
      expect(result.pieces.filter(piece => piece.cut.fabric === 'entretela').every(piece => piece.edges.every(edge => edge.allowance === 0))).toBe(true);
    }
  });

  it('corona: el traslape no aumenta el contorno cerrado y las puntas están en el contorno de corte', () => {
    for (const count of ['5', '7']) {
      const result = crownGenerator.generate(ctx, { contornoCabeza: 560, holgura: 10, traslape: 40, puntas: count, altoBanda: 45, altoPuntas: 65, margen: 5 });
      expect(errors(result)).toEqual([]);
      const outer = result.pieces[0], box = bboxOf(seamPolygon(outer));
      expect(box.maxX - box.minX).toBe(610);
      expect(outer.nodes.filter(node => node.id.startsWith('punta-'))).toHaveLength(Number(count));
      expect(result.checks.find(check => check.key === 'contorno')?.measured).toBe(570);
      expect(result.pieces[2].edges.every(edge => edge.allowance === 0)).toBe(true);
    }
  });

  it('orejas: incluye cuatro caras y dos refuerzos y declara la diadema comprada', () => {
    const result = earsGenerator.generate(ctx, earsGenerator.defaults(ctx));
    expect(result.pieces.map(piece => [piece.id, piece.cut.qty])).toEqual([['frente', 2], ['reverso', 2], ['refuerzo', 2]]);
    expect(result.materials.find(item => item.id === 'diadema')?.note).toContain('no una pieza incluida');
    expect(result.pieces[0].edges.filter(edge => edge.kind === 'cubic')).toHaveLength(2);
  });

  it('los márgenes no cambian dimensiones terminadas ni duplican holgura', () => {
    for (const generator of COSTUME_GENERATORS) {
      const a = generator.generate(ctx, { ...generator.defaults(ctx), margen: 3 });
      const b = generator.generate(ctx, { ...generator.defaults(ctx), margen: 10 });
      expect(a.checks).toEqual(b.checks);
      expect(a.pieces.map(piece => piece.nodes)).toEqual(b.pieces.map(piece => piece.nodes));
      expect(errors(a)).toEqual([]); expect(errors(b)).toEqual([]);
    }
  });

  it('se integra en el motor sin medidas corporales ficticias y con todos los cortes disponibles', () => {
    for (const model of COSTUME_CATALOG) {
      const state = newPatternState(model.generatorId!, {}, ctx);
      state.params = { ...state.params, ...model.params };
      const built = buildPattern(state);
      expect(built.missing).toEqual([]);
      expect(built.issues.filter(issue => issue.level === 'error')).toEqual([]);
      expect(built.cuts.size).toBe(built.pieces.length);
      expect(built.seamResults.every(seam => seam.ok)).toBe(true);
    }
  });

  it('conserva IDs al cambiar las medidas y bloquea dimensiones inválidas', () => {
    for (const generator of COSTUME_GENERATORS) {
      const a = generator.generate(ctx, generator.defaults(ctx));
      const b = generator.generate(ctx, { ...generator.defaults(ctx), margen: 3 });
      expect(a.pieces.map(piece => [piece.id, piece.nodes.map(node => node.id), piece.edges.map(edge => edge.id)])).toEqual(b.pieces.map(piece => [piece.id, piece.nodes.map(node => node.id), piece.edges.map(edge => edge.id)]));
      const bad = generator.generate(ctx, { ...generator.defaults(ctx), margen: -1 });
      expect(bad.notices.some(issue => issue.level === 'error')).toBe(true);
      expect(bad.pieces).toEqual([]);
    }
    expect(wizardHatGenerator.generate(ctx, { contornoCabeza: 0 }).notices.some(issue => issue.level === 'error')).toBe(true);
    expect(crownGenerator.generate(ctx, { puntas: '6' }).notices.some(issue => issue.level === 'error')).toBe(true);
  });

  it('admite los extremos publicados de cada medida y sus combinaciones pequeñas y grandes', () => {
    for (const generator of COSTUME_GENERATORS) {
      const defaults = generator.defaults(ctx);
      for (const boundary of ['min', 'max'] as const) {
        const lengths = generator.params.filter(param => param.type === 'length' && param[boundary] !== undefined);
        const all = { ...defaults };
        for (const param of lengths) {
          const value = param[boundary]!;
          expect(errors(generator.generate(ctx, { ...defaults, [param.key]: value })), `${generator.id}:${param.key}:${boundary}`).toEqual([]);
          all[param.key] = value;
        }
        expect(errors(generator.generate(ctx, all)), `${generator.id}:todas:${boundary}`).toEqual([]);
      }
    }
  });
});
