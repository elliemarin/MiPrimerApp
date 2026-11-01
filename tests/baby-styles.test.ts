import { describe, expect, it } from 'vitest';
import { BABY_STYLE_GENERATORS, generateBabyStyle } from '../src/lib/pattern/generators/babyStyles';
import { SIZE_TABLES } from '../src/lib/sizes/tables';
import { validatePattern } from '../src/lib/pattern/validate';
import { cutOutline } from '../src/lib/pattern/offset';
import type { GeneratorContext } from '../src/lib/pattern/generator';
import { BABY_STYLE_SURFACE_PIECES, buildBabyStyleFlat } from '../src/data/babyStyleFlats';
import { cmdsBBox } from '../src/lib/draw/paths';
import { parseSvgPath } from '../src/lib/draw/svgpath';

const rows = SIZE_TABLES.flatMap(t => t.rows).filter(r => ['bebe', 'toddler'].includes(r.kind));
describe('nuevos estilos de bebé: construcción real', () => {
  it.each(BABY_STYLE_GENERATORS)('$id: medidas, costuras y márgenes en todas las tallas de bebé', gen => {
    for (const row of rows) {
      const knit = gen.id.startsWith('bebe-body-') || gen.id === 'bebe-cardigan-pico' || gen.id === 'bebe-pantalon-punos-extensibles';
      const ctx: GeneratorContext = { kind: row.kind, body: row.values, fabric: knit ? 'punto' : 'plano', stretch: knit ? 30 : 0, fit: 'regular' };
      const result = gen.generate(ctx, gen.defaults(ctx));
      const issues = [...result.notices, ...validatePattern(result, new Map(result.pieces.map(p => [p.id, cutOutline(p)])))];
      expect(result.pieces.length, `${gen.id} ${row.code}`).toBeGreaterThan(0);
      expect(issues.filter(i => i.level === 'error' || i.code === 'costura-no-coincide'), `${gen.id} ${row.code}`).toEqual([]);
      for (const step of result.steps) {
        expect(step.pieces?.filter(id => !result.pieces.some(p => p.id === id)) ?? [], `${gen.id} ${step.id} piezas`).toEqual([]);
        expect(step.seams?.filter(id => !result.seams.some(s => s.id === id)) ?? [], `${gen.id} ${step.id} costuras`).toEqual([]);
      }
    }
  });
  it('rechaza cuerpos adultos y tejido plano en los pañaleros', () => {
    const adult = SIZE_TABLES.find(t => t.id === 'ref-mujer-busto')!.rows[1];
    for (const gen of BABY_STYLE_GENERATORS) expect(gen.generate({ kind: adult.kind, body: adult.values, fabric: 'punto', stretch: 30, fit: 'regular' }, {}).pieces).toEqual([]);
    expect(generateBabyStyle('bebe-body-sin-mangas', { kind: 'bebe', body: rows[0].values, fabric: 'plano', stretch: 0, fit: 'regular' }, {}).pieces).toEqual([]);
  });
  it('cada estilo cambia piezas o contornos, no solamente metadatos', () => {
    const seen = new Set<string>();
    for (const gen of BABY_STYLE_GENERATORS) {
      const ctx: GeneratorContext = { kind: 'bebe', body: rows[0].values, fabric: 'punto', stretch: 30, fit: 'regular' };
      const r = gen.generate(ctx, gen.defaults(ctx));
      const geometry = JSON.stringify(r.pieces.map(p => ({ id: p.id, nodes: p.nodes, edges: p.edges, cut: p.cut })));
      expect(seen.has(geometry), gen.id).toBe(false); seen.add(geometry);
    }
  });
  it('cada zona visible corresponde a una pieza que realmente se corta', () => {
    const ctx: GeneratorContext = { kind: 'bebe', body: rows[0].values, fabric: 'punto', stretch: 30, fit: 'regular' };
    for (const gen of BABY_STYLE_GENERATORS) {
      const r = gen.generate(ctx, gen.defaults(ctx)), flat = buildBabyStyleFlat(gen.id);
      expect(flat.views.length, gen.id).toBeGreaterThan(0);
      for (const view of flat.views) for (const zone of view.zones) {
        const binding = BABY_STYLE_SURFACE_PIECES[gen.id][view.key]!.find(b => b.zoneId === zone.id);
        expect(binding, `${gen.id} ${view.key} ${zone.id}`).toBeDefined();
        expect(r.pieces.some(p => p.id === binding!.pieceId), `${gen.id} ${zone.id}`).toBe(true);
        const bounds = cmdsBBox(parseSvgPath(zone.d));
        expect(bounds.maxX - bounds.minX, gen.id).toBeGreaterThan(1);
        expect(bounds.maxY - bounds.minY, gen.id).toBeGreaterThan(1);
      }
    }
  });
  it('el largo pedido del pantalón incluye el puño doblado y permite crecer sin duplicarlo', () => {
    const ctx: GeneratorContext = { kind: 'bebe', body: rows[0].values, fabric: 'punto', stretch: 30, fit: 'regular' };
    const r = generateBabyStyle('bebe-pantalon-punos-extensibles', ctx, { largo: 300, altoPuno: 60 });
    const front = r.pieces.find(p => p.id === 'delantero')!, cuff = r.pieces.find(p => p.id === 'puno')!;
    const legLength = front.nodes.find(n => n.id === 'bajo-ext')!.y - front.nodes.find(n => n.id === 'cintura-lateral')!.y;
    const cutHeight = Math.max(...cuff.nodes.map(n => n.y)) - Math.min(...cuff.nodes.map(n => n.y));
    expect(legLength + cutHeight / 4).toBeCloseTo(300, 8);
    expect(legLength + cutHeight / 2).toBeCloseTo(330, 8);
    expect(r.checks.find(c => c.key === 'largo')!.target).toBe(300);
    expect(r.checks.find(c => c.key === 'largo-desplegado')!.target).toBe(330);
  });
  it('la falda del body mantiene libre la apertura y las mariposas se montan después del hombro', () => {
    const ctx: GeneratorContext = { kind: 'bebe', body: rows[0].values, fabric: 'punto', stretch: 30, fit: 'regular' };
    const skirt = generateBabyStyle('bebe-body-falda', ctx, {}).pieces.find(p => p.id === 'falda-delantera')!;
    expect(skirt.cut).toMatchObject({ qty: 2, onFold: false });
    expect(skirt.edges.find(e => e.id === 'centro')!.finish).toBe('dobladillo');
    const steps = generateBabyStyle('bebe-body-mariposa', ctx, {}).steps.map(s => s.id);
    expect(steps.indexOf('hombros-sin-manga')).toBeLessThan(steps.indexOf('volantes-sisa'));
    expect(steps.indexOf('volantes-sisa')).toBeLessThan(steps.indexOf('ribetear-sisas'));
  });
});
