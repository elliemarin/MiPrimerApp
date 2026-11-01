import { describe, expect, it } from 'vitest';
import { ADULT_DRESS_STYLES, adultDressDefaults, adultDressGenerator, adultDressGeometry, generateAdultDress } from '../src/lib/pattern/generators/dressStyles';
import { SIZE_TABLES, findSize } from '../src/lib/sizes/tables';
import type { GeneratorContext, GeneratorResult } from '../src/lib/pattern/generator';
import { validatePattern, evaluateSeams } from '../src/lib/pattern/validate';
import { cutOutline } from '../src/lib/pattern/offset';
import { buildDressStyleFlat, DRESS_STYLE_SURFACE_PIECES } from '../src/data/dressStyleFlats';
import { DRESS_STYLE_CATALOG } from '../src/data/dressStyleCatalog';
import { len } from '../src/lib/pattern/generators/kidsShared';

const adultRows = SIZE_TABLES.find(table => table.id === 'ref-mujer-busto')!.rows;
const context = (code = 'M92'): GeneratorContext => ({ body: findSize('ref-mujer-busto', code)!.values, kind: 'mujer', fabric: 'plano', stretch: 0, fit: 'holgado' });
function valid(result: GeneratorResult, label: string) {
  expect(result.pieces.length, label).toBeGreaterThan(0);
  expect(result.notices.filter(issue => issue.level === 'error'), label).toEqual([]);
  const cuts = new Map(result.pieces.map(piece => [piece.id, cutOutline(piece)]));
  expect(validatePattern(result, cuts).filter(issue => issue.level === 'error'), label).toEqual([]);
  expect(evaluateSeams(result.pieces, result.seams).filter(seam => !seam.ok).map(seam => seam.relation.id), label).toEqual([]);
  const ids = new Set(result.pieces.map(piece => piece.id)), seams = new Set(result.seams.map(seam => seam.id));
  for (const step of result.steps) {
    for (const id of step.pieces) expect(ids.has(id), `${label}: ${step.id} / ${id}`).toBe(true);
    for (const id of step.seams ?? []) expect(seams.has(id), `${label}: ${step.id} / ${id}`).toBe(true);
  }
}

describe('vestidos adultos por construcción', () => {
  it.each(ADULT_DRESS_STYLES)('$id genera todas las tallas adultas sin cruces ni costuras incompatibles', style => {
    for (const row of adultRows) {
      const ctx = context(row.code), params = { estilo: style.id, largo: 1640 * style.length, holgura: style.wide ? 360 : 140 };
      valid(generateAdultDress(ctx, params), `${style.id}/${row.code}`);
    }
  });
  it('la holgura y el largo se miden sobre la geometría y no aumentan al cambiar márgenes', () => {
    const ctx = context();
    for (const style of ADULT_DRESS_STYLES) for (const margin of [5, 15]) {
      const params = { estilo: style.id, largo: 1371.7, holgura: 173.4, margen: margin, dobladillo: 18.5 };
      const result = generateAdultDress(ctx, params), g = adultDressGeometry(ctx, params);
      valid(result, `${style.id}/${margin}`);
      const body = result.pieces.find(piece => piece.id === 'delantero')!;
      const side = body.edges.find(edge => edge.id === 'costado')!;
      const axilla = body.nodes.find(node => node.id === side.from)!;
      expect(axilla.x * 4).toBeCloseTo(Math.max(ctx.body.pecho!, ctx.body.cadera!, ctx.body.cintura!) + 173.4, 6);
      const bodyEnd = body.nodes.find(node => node.id === side.to)!.y;
      const skirtHeight = result.pieces.filter(piece => piece.id.startsWith('falda-espalda-')).reduce((sum, piece) => sum + (Math.max(...piece.nodes.map(node => node.y)) - Math.min(...piece.nodes.map(node => node.y))), 0);
      expect(bodyEnd + skirtHeight).toBeCloseTo(1371.7, 6);
      expect(g.length).toBeCloseTo(1371.7, 6);
      expect(body.edges.find(edge => edge.id === 'costado')!.allowance).toBe(margin);
    }
  });
  it('las tapetas conservan el cruce sin fruncirlo y las faldas de paneles no fruncen', () => {
    const open = generateAdultDress(context(), { estilo: 'camisero-fruncido', largo: 1150 });
    const upper = open.pieces.find(piece => piece.id === 'delantero')!, lower = open.pieces.find(piece => piece.id === 'falda-delantera-1')!;
    expect(upper.cut).toMatchObject({ qty: 2, mirrorPairs: true, onFold: false });
    expect(upper.edges.find(edge => edge.id === 'frente')).toMatchObject({ allowance: 60, finish: 'dobladillo' });
    expect(len(upper, 'tapeta-bajo')).toBe(15);
    expect(len(lower, 'tapeta-arriba')).toBe(15);
    expect(open.seams.find(seam => seam.id === 'tapeta-1')?.kind).toBe('igual');
    const panels = generateAdultDress(context(), { estilo: 'paneles-horizontal', largo: 980 });
    expect(panels.seams.filter(seam => seam.id.startsWith('union-')).every(seam => seam.kind === 'igual')).toBe(true);
  });
  it('cada vista tiene vínculos a piezas que existen en esa construcción', () => {
    for (const style of ADULT_DRESS_STYLES) {
      const result = generateAdultDress(context(), { estilo: style.id, largo: 1640 * style.length, holgura: style.wide ? 360 : 140 });
      const ids = new Set(result.pieces.map(piece => piece.id));
      const flat = buildDressStyleFlat(style.id, style.id);
      expect(flat.views.map(view => view.key)).toEqual(['frente', 'espalda']);
      for (const view of flat.views) for (const zone of view.zones) {
        const binding = DRESS_STYLE_SURFACE_PIECES[adultDressGenerator.id][view.key]!.find(binding => binding.zoneId === zone.id);
        expect(binding, `${style.id}/${view.key}/${zone.id}`).toBeDefined();
        expect(ids.has(binding!.pieceId), `${style.id}/${zone.id}/${binding!.pieceId}`).toBe(true);
        if (binding!.fold) expect(result.pieces.find(piece => piece.id === binding!.pieceId)!.cut.onFold).toBe(true);
      }
    }
  });
  it('presenta 27 construcciones con silueta o piezas diferentes, sin clonar por medidas', () => {
    expect(DRESS_STYLE_CATALOG).toHaveLength(27);
    expect(new Set(DRESS_STYLE_CATALOG.map(model => model.designGroup?.id)).size).toBe(27);
    const signatures = ADULT_DRESS_STYLES.map(style => {
      const result = generateAdultDress(context(), { estilo: style.id, largo: 1200, holgura: 140 });
      return JSON.stringify(result.pieces.map(piece => ({ id: piece.id, nodes: piece.nodes, edges: piece.edges, cut: piece.cut })));
    });
    expect(new Set(signatures).size).toBe(27);
  });
  it('rechaza proporciones incompatibles y tallas infantiles', () => {
    const ctx = context();
    expect(generateAdultDress({ ...ctx, kind: 'infantil' }, adultDressDefaults(ctx)).notices.some(issue => issue.code === 'vestido-adulto-talla')).toBe(true);
    expect(generateAdultDress(ctx, { estilo: 'no-existe' }).pieces).toEqual([]);
    expect(generateAdultDress(ctx, { estilo: 'tres-pisos', largo: 650 }).pieces).toEqual([]);
    expect(generateAdultDress(ctx, { estilo: 'talle-bajo', largo: 650 }).pieces).toEqual([]);
    expect(generateAdultDress(ctx, { holgura: 20 }).pieces).toEqual([]);
  });
});
