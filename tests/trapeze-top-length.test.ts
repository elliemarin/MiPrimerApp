import { describe, expect, it } from 'vitest';
import { generateTrapezeTop, trapezeTopDefaults, trapezeTopGenerator } from '../src/lib/pattern/generators/kidsBatch2';
import { generateSet } from '../src/lib/pattern/generators/babyMore';
import { SIZE_TABLES, findSize, type SizeRow } from '../src/lib/sizes/tables';
import type { GeneratorContext, GeneratorResult, Params } from '../src/lib/pattern/generator';
import { edgesLength } from '../src/lib/pattern/outline';
import { cutOutline } from '../src/lib/pattern/offset';
import { validatePattern } from '../src/lib/pattern/validate';

const children = SIZE_TABLES.flatMap(table => table.rows).filter(row => ['bebe', 'toddler', 'infantil'].includes(row.kind));
const context = (row: SizeRow): GeneratorContext => ({ body: row.values, kind: row.kind, fabric: 'plano', stretch: 0, fit: 'regular' });
const toddler = context(findSize('ref-infantil-estatura', 'E92')!);
function run(ctx: GeneratorContext, params: Params = {}) {
  return generateTrapezeTop(ctx, { ...trapezeTopDefaults(ctx), ...params });
}
function physicalLength(result: GeneratorResult, prefix = '') {
  const body = result.pieces.find(piece => piece.id === `${prefix}delantero`)!;
  const center = body.edges.find(edge => edge.id === 'centro')!;
  const ruffle = result.pieces.find(piece => piece.id === `${prefix}volante-bajo`);
  // The center hem lies below the neckline; shoulder datum is y=0. Ruffle
  // height is measured on its actual seam line, excluding added allowances.
  return body.nodes.find(node => node.id === center.from)!.y + (ruffle ? edgesLength(ruffle, ['costado']) : 0);
}
function assertValid(result: GeneratorResult) {
  expect(result.pieces.length).toBeGreaterThan(0);
  expect(result.notices.filter(issue => issue.level === 'error')).toEqual([]);
  expect(validatePattern(result, new Map(result.pieces.map(piece => [piece.id, cutOutline(piece)])))
    .filter(issue => issue.level === 'error' || issue.code === 'costura-no-coincide')).toEqual([]);
}

describe('largo terminado de blusas trapecio con volante', () => {
  it.each(['no', 'si'])('con volante=%s respeta el largo visible en todas las tallas y ambas sisas', volanteBajo => {
    for (const row of children) for (const manga of ['sin', 'volante']) {
      const ctx = context(row), defaults = trapezeTopDefaults(ctx), result = run(ctx, { volanteBajo, manga });
      assertValid(result);
      const check = result.checks.find(c => c.key === 'largo-centro')!;
      expect(physicalLength(result), `${row.code} / ${manga}`).toBeCloseTo(Number(defaults.largo), 6);
      expect(check.target).toBe(defaults.largo);
      expect(check.measured).toBeCloseTo(physicalLength(result), 6);
      expect(result.notices.some(issue => issue.code.includes('experimental'))).toBe(true);
    }
  });

  it('conserva una medida personalizada exacta y separa cuerpo, volante y márgenes', () => {
    const params = { largo: 398.7, altoVolante: 82.3, volanteBajo: 'si' };
    for (const margen of [5, 10, 15]) for (const dobladillo of [8, 25, 40]) {
      const result = run(toddler, { ...params, margen, dobladillo });
      assertValid(result);
      expect(physicalLength(result)).toBeCloseTo(398.7, 6);
      const front = result.pieces.find(piece => piece.id === 'delantero')!;
      const ruffle = result.pieces.find(piece => piece.id === 'volante-bajo')!;
      expect(front.nodes[6].y).toBeCloseTo(316.4, 6);
      expect(edgesLength(ruffle, ['costado'])).toBeCloseTo(82.3, 6);
      expect(front.edges.find(edge => edge.id === 'bajo')).toMatchObject({ finish: 'costura', allowance: margen });
      expect(ruffle.edges.find(edge => edge.id === 'union')).toMatchObject({ finish: 'costura', allowance: margen });
      expect(ruffle.edges.find(edge => edge.id === 'bajo')).toMatchObject({ finish: 'dobladillo', allowance: dobladillo });
      expect(result.checks.find(check => check.key === 'largo-centro')).toMatchObject({ target: 398.7, measured: 398.7 });
    }
  });

  it.each([{ largo: 310.5, altoVolante: 69 }, { largo: 280, altoVolante: 140 }])('rechaza sin agrandar la combinación imposible %j', params => {
    const result = run(toddler, { ...params, volanteBajo: 'si' });
    expect(result.pieces).toEqual([]);
    expect(result.notices).toEqual([expect.objectContaining({ level: 'error', code: 'blusa-trapecio-largo' })]);
    expect(result.notices[0].message).toContain('El largo total incluye el volante');
    expect(result.notices[0].message).toContain('aumenta el largo o reduce');
  });

  it('mantiene el límite de largo total y explica el volante en parámetros e instrucciones de corte', () => {
    expect(run(toddler, { largo: 960, altoVolante: 50, volanteBajo: 'si' }).pieces).toEqual([]);
    const result = run(toddler, { volanteBajo: 'si' });
    expect(trapezeTopGenerator.status).toBe('experimental');
    expect(trapezeTopGenerator.params.find(param => param.key === 'largo')!.label).toContain('incluye volante');
    expect(result.steps.find(step => step.id === 'cortar')!.pieces).toContain('volante-bajo');
    expect(result.steps.find(step => step.id === 'cortar')!.detail).toContain('Volante del bajo: 2 al doblez');
    expect(result.pieces.find(piece => piece.id === 'volante-bajo')!.cut).toMatchObject({ qty: 2, onFold: true });
  });

  it.each(['trapecio', 'vichy'])('conserva la medida real de la blusa dentro del conjunto %s', conjunto => {
    for (const row of children.filter(row => row.kind !== 'infantil')) {
      const ctx = context(row), result = generateSet(ctx, { conjunto });
      assertValid(result);
      const check = result.checks.find(c => c.key === 'blusa-largo-centro')!;
      expect(check.target).toBe(trapezeTopDefaults(ctx).largo);
      expect(check.measured).toBeCloseTo(physicalLength(result, 'blusa-'), 6);
    }
  });
});
