import { describe, expect, it } from 'vitest';
import { getGenerator } from '../src/lib/pattern/generators';
import { SIZE_TABLES, findSize } from '../src/lib/sizes/tables';
import { validatePattern } from '../src/lib/pattern/validate';
import { cutOutline } from '../src/lib/pattern/offset';
import { edgesLength } from '../src/lib/pattern/outline';
import type { GeneratorContext } from '../src/lib/pattern/generator';
import type { PersonKind } from '../src/lib/sizes/tables';
import { SETS } from '../src/lib/pattern/generators/babyMore';
import { CATALOG } from '../src/data/catalog';
import { DIGITIZED_KIDS_CATALOG } from '../src/data/digitizedKidsCatalog';
import { catalogImageFor } from '../src/data/catalogImages';
import { modelHasPattern } from '../src/features/library/filters';

const KIDS: PersonKind[] = ['bebe', 'toddler', 'infantil'];
const ctxFor = (values: GeneratorContext['body'], kind: PersonKind, fabric: 'plano' | 'punto' = 'plano', stretch = 0): GeneratorContext => ({ body: values, kind, fabric, stretch, fit: 'regular' });
const at = (table: string, code: string, kind: PersonKind, fabric: 'plano' | 'punto' = 'plano', stretch = 0) => ctxFor(findSize(table, code)!.values, kind, fabric, stretch);
const run = (id: string, ctx: GeneratorContext, params: Record<string, string | number> = {}) => { const gen = getGenerator(id)!; return gen.generate(ctx, { ...gen.defaults(ctx), ...params }); };
const errors = (r: ReturnType<typeof run>) => [
  ...r.notices.filter(n => n.level === 'error').map(n => n.code),
  ...validatePattern(r, new Map(r.pieces.map(p => [p.id, cutOutline(p)]))).filter(i => i.level === 'error' || i.code === 'costura-no-coincide').map(i => `${i.code}:${i.pieceId ?? ''}`)
];

const CASES: [string, Record<string, string>[], PersonKind[], 'plano' | 'punto'][] = [
  ['chaleco-infantil', [{ escote: 'pico', acabado: 'forro', cierre: 'broches', lazo: 'si' }, { escote: 'redondo', acabado: 'ribete', cierre: 'abierto', lazo: 'no' }], KIDS, 'plano'],
  ['chaqueta-cierre-infantil', [{}], KIDS, 'punto'],
  ['chaqueta-acolchada-infantil', [{ bolsillos: 'si' }, { bolsillos: 'no' }], KIDS, 'plano'],
  ['chaqueta-capucha-infantil', [{ bolsillos: 'si' }], KIDS, 'plano'],
  ['sudadera-canguro-infantil', [{ bolsillo: 'si' }, { bolsillo: 'no' }], KIDS, 'punto'],
  ['blusa-campesina-infantil', [{ manga: 'corta' }, { manga: 'larga', volante: 'no' }], KIDS, 'plano'],
  ['blusa-botones-infantil', [{}], KIDS, 'plano'],
  ['vestido-jareta-infantil', [{ lazo: 'si' }, { lazo: 'no' }], KIDS, 'plano'],
  ['pelele-volantes', [{ tirantes: 'si' }, { tirantes: 'no' }], ['bebe', 'toddler'], 'plano'],
  ['diadema-lazo', [{}], KIDS, 'punto'],
  ['gorro-duende', [{ forro: 'si' }, { forro: 'no' }], KIDS, 'plano'],
  ['gorro-orejeras', [{ orejas: 'gato' }, { orejas: 'oso' }, { orejas: 'ninguna' }], KIDS, 'punto'],
  // Second batch.
  ['bonete-volante', [{ volante: 'tela' }, { volante: 'doble' }, { volante: 'encaje' }, { volante: 'ninguno' }], KIDS, 'plano'],
  ['delantal-pichi-infantil', [{ volantes: 'si', bolsillo: 'si' }, { volantes: 'no', bolsillo: 'no' }], ['toddler', 'infantil'], 'plano'],
  ['mono-tirantes-infantil', [{ forma: 'pichi' }, { forma: 'pico', bajo: 'volante', lazos: 'si' }, { forma: 'peto', largo: 'largo', bajo: 'vuelta' }, { forma: 'pichi', largo: 'largo', entrepierna: 'cerrada' }], KIDS, 'plano'],
  ['blusa-trapecio-infantil', [{}, { volanteBajo: 'si' }], KIDS, 'plano']
];

describe('diseños infantiles digitalizados desde fotos', () => {
  it.each(CASES)('%s genera piezas válidas en todas las tallas infantiles y variantes', (id, variants, kinds, fabric) => {
    expect(getGenerator(id)?.status).toBe('experimental');
    for (const table of SIZE_TABLES) for (const row of table.rows) {
      if (!kinds.includes(row.kind)) continue;
      for (const v of variants) {
        const r = run(id, ctxFor(row.values, row.kind, fabric, fabric === 'punto' ? 30 : 0), v);
        expect(r.pieces.length, `${id} ${row.code}`).toBeGreaterThan(0);
        expect(errors(r), `${id} ${row.code} ${JSON.stringify(v)}`).toEqual([]);
      }
    }
  });

  it('rechaza tallas adultas en los patrones infantiles', () => {
    const adult = SIZE_TABLES.find(t => t.id === 'ref-mujer-busto')!;
    for (const [id] of CASES) expect(run(id, ctxFor(adult.rows[2].values, 'mujer')).pieces, id).toEqual([]);
  });

  it('pasa la cabeza en las prendas que se ponen por arriba y no usa cordones ni cintas largas', () => {
    const kid = at('ref-infantil-estatura', 'E92', 'toddler', 'punto', 30), head = kid.body.cabeza!;
    const hoodie = run('sudadera-canguro-infantil', kid);
    const neck = 2 * (edgesLength(hoodie.pieces.find(p => p.id === 'delantero')!, ['cuello']) + edgesLength(hoodie.pieces.find(p => p.id === 'espalda')!, ['cuello']));
    expect(neck * (1 + 30 * .0075)).toBeGreaterThanOrEqual(head + 20 - .5);
    expect(hoodie.pieces.some(p => /cord/.test(p.id))).toBe(false);
    const peasant = run('blusa-campesina-infantil', at('ref-infantil-estatura', 'E92', 'toddler'));
    expect(peasant.notices.find(n => n.code === 'paso-cabeza')?.level).toBe('ok');
    const dress = run('vestido-jareta-infantil', at('ref-bebe-meses', 'B12-18', 'bebe'));
    expect(dress.notices.find(n => n.code === 'paso-cabeza')?.level).toBe('ok');
    for (const id of ['gorro-duende', 'gorro-orejeras']) {
      const hat = run(id, at('ref-bebe-meses', 'B6-9', 'bebe')), tab = hat.pieces.find(p => p.id === 'barbiquejo')!;
      expect(tab.nodes[1].x, id).toBeLessThanOrEqual(at('ref-bebe-meses', 'B6-9', 'bebe').body.cabeza! * .2);
      expect(JSON.stringify(hat.pieces.map(p => p.name))).not.toMatch(/cinta|cordón/i);
    }
    const vest = run('chaleco-infantil', kid, { lazo: 'si' });
    expect(vest.notices.find(n => n.code === 'chaleco-sin-cintas')).toBeDefined();
  });

  it('resuelve la copa de manga a la sisa y el contorno de pecho exacto', () => {
    for (const id of ['chaqueta-cierre-infantil', 'chaqueta-acolchada-infantil', 'chaqueta-capucha-infantil', 'sudadera-canguro-infantil']) {
      const ctx = at('ref-infantil-estatura', 'E116', 'infantil', 'punto', 30), r = run(id, ctx);
      const sleeve = r.pieces.find(p => p.id === 'manga')!, front = r.pieces.find(p => p.id === 'delantero')!, back = r.pieces.find(p => p.id === 'espalda')!;
      const cap = edgesLength(sleeve, ['copa-delantera', 'copa-trasera']), hole = edgesLength(front, ['sisa-superior', 'sisa-inferior']) + edgesLength(back, ['sisa-superior', 'sisa-inferior']);
      expect(cap / hole, id).toBeGreaterThanOrEqual(.999);
      expect(cap / hole, id).toBeLessThanOrEqual(1.032);
      for (const check of r.checks) expect(Math.abs(check.measured - check.target), `${id}/${check.key}`).toBeLessThanOrEqual(check.tolerance);
    }
  });

  it('añade bombacho, tirantes, lazos y bolsillos delanteros a patrones existentes sin romperlos', () => {
    const kid = at('ref-infantil-estatura', 'E104', 'toddler');
    const pants = run('pantalon-cintura-elastica', kid, { estilo: 'bombacho', volantito: 15 });
    expect(pants.pieces.find(p => p.id === 'delantero')!.edges.find(e => e.id === 'bajo')).toMatchObject({ finish: 'jareta', allowance: 35 });
    expect(pants.materials.some(m => m.id === 'elastico-bajo')).toBe(true);
    const baby = at('ref-bebe-meses', 'B6-9', 'bebe');
    const bloomers = run('cubrepanal-bebe', baby, { tirantes: 'cruzados', lazo: 'si' });
    expect(bloomers.pieces.find(p => p.id === 'tirante')!.marks.filter(m => m.kind === 'ojal')).toHaveLength(4);
    expect(bloomers.pieces.map(p => p.id)).toEqual(expect.arrayContaining(['lazo', 'lazo-colas', 'lazo-nudo']));
    expect(run('sombrero-pescador', baby, { lazo: 'si' }).pieces.map(p => p.id)).toContain('lazo');
    expect(run('sombrero-pescador', baby, {}).pieces.map(p => p.id)).not.toContain('lazo');
    const barrel = run('pantalon-mezclilla', kid, { silueta: 'barrel', cintura: 'elastica', bolsillos: 'frontales' });
    expect(barrel.pieces.map(p => p.id)).toEqual(expect.arrayContaining(['bolsillo-delantero', 'bolsillo-trasero']));
    expect(errors(barrel)).toEqual([]);
  });

  it('corta pantalones a capri, bermuda o short desde la entrepierna de la talla', () => {
    const kid = at('ref-infantil-estatura', 'E110', 'infantil'), full = run('pantalon-cintura-elastica', kid, { estilo: 'ancho' });
    const lengths = ['capri', 'bermuda', 'short'].map(corte => run('pantalon-cintura-elastica', kid, { estilo: 'ancho', corte }).checks.find(c => c.key === 'largo')!.target);
    expect(lengths[0]).toBeLessThan(full.checks.find(c => c.key === 'largo')!.target);
    expect(lengths[0]).toBeGreaterThan(lengths[1]); expect(lengths[1]).toBeGreaterThan(lengths[2]);
  });

  it('mantiene botones y broches en lugar de cintas y pasa la cabeza por el escote del delantal', () => {
    const kid = at('ref-infantil-estatura', 'E104', 'toddler');
    expect(run('delantal-pichi-infantil', kid).notices.find(n => n.code === 'paso-cabeza')?.level).toBe('ok');
    expect(run('delantal-pichi-infantil', kid).pieces.find(p => p.id === 'cinta')!.nodes[1].x).toBeLessThanOrEqual(300);
    const pico = run('mono-tirantes-infantil', kid, { forma: 'pico' });
    expect(pico.pieces.find(p => p.id === 'delantero')!.marks.some(m => m.kind === 'ojal')).toBe(true);
    const peto = run('mono-tirantes-infantil', at('ref-bebe-meses', 'B12-18', 'bebe'), { forma: 'peto' });
    expect(peto.pieces.find(p => p.id === 'tirante')!.marks.filter(m => m.kind === 'ojal')).toHaveLength(2);
    expect(peto.materials.some(m => m.id === 'cinta-broches')).toBe(true);
    const bonnet = run('bonete-volante', at('ref-bebe-meses', 'B3-6', 'bebe'));
    expect(bonnet.pieces.map(p => p.id)).toEqual(expect.arrayContaining(['lateral', 'central', 'forro-lateral', 'forro-central', 'volante', 'barbiquejo']));
    expect(errors(run('blusa-trapecio-infantil', at('ref-bebe-meses', 'B-RN', 'bebe'), { volanteBajo: 'si' }))).toEqual([]);
  });

  it('reúne los conjuntos nuevos con ids únicos y patrones válidos', () => {
    for (const set of ['vestido', 'pelele-diadema', 'campesino', 'rayas', 'trapecio', 'vichy']) {
      expect(SETS[set], set).toBeDefined();
      for (const code of ['B0-3', 'B12-18']) {
        const r = run('conjunto-bebe', at('ref-bebe-meses', code, 'bebe'), { conjunto: set });
        const ids = r.pieces.map(p => p.id);
        expect(new Set(ids).size, set).toBe(ids.length);
        expect(errors(r), `${set} ${code}`).toEqual([]);
      }
    }
  });

  it('conserva las 37 recetas digitalizadas y muestra 17 construcciones en la colección Infantil', () => {
    expect(DIGITIZED_KIDS_CATALOG).toHaveLength(37);
    for (const model of DIGITIZED_KIDS_CATALOG) {
      const live = CATALOG.find(m => m.id === model.id)!;
      expect(live.status, model.id).toBe('experimental');
      expect(modelHasPattern(live), model.id).toBe(true);
      expect(getGenerator(live.generatorId!), model.id).toBeDefined();
      expect(catalogImageFor(live), model.id).toBeDefined();
      expect(JSON.stringify(live).toLowerCase(), model.id).not.toMatch(/tinystitch|stitch & style/);
    }
    expect(new Set(CATALOG.filter(m => m.collection === 'Infantil').map(m => m.designGroup?.id)).size).toBe(17);
  });
});
