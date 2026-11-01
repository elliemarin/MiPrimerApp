import { describe, expect, it } from 'vitest';
import { GIRLS_GENERATORS, generateCircle, generateTrapeze, generateTulle } from '../src/lib/pattern/generators/girls';
import { BABY_PLUS_GENERATORS, generateBloomers, generateBonnet, generateBooties, generateSleepSack } from '../src/lib/pattern/generators/babyPlus';
import type { GeneratorContext } from '../src/lib/pattern/generator';
import type { PersonKind } from '../src/lib/sizes/tables';
import { SIZE_TABLES, findSize } from '../src/lib/sizes/tables';
import { validatePattern } from '../src/lib/pattern/validate';
import { cutOutline } from '../src/lib/pattern/offset';
import { edgesLength } from '../src/lib/pattern/outline';
import { CATALOG } from '../src/data/catalog';
import { buildFlat } from '../src/data/flats';
import { KIDS_SURFACE_PIECES } from '../src/data/kidsFlats';
import { modelHasPattern } from '../src/features/library/filters';
import { groupCatalog } from '../src/features/library/groups';
import { getGenerator } from '../src/lib/pattern/generators';

const SUPPORTED: Record<string, PersonKind[]> = {
  'vestido-trapecio-infantil': ['bebe', 'toddler', 'infantil'], 'vestido-tirantes-fruncido': ['toddler', 'infantil'],
  'falda-tul-elastica': ['bebe', 'toddler', 'infantil', 'mujer'], 'falda-olanes-escalonada': ['toddler', 'infantil', 'mujer'],
  'falda-circular-elastica': ['toddler', 'infantil', 'mujer'], 'cubrepanal-bebe': ['bebe', 'toddler'], 'bonete-bebe': ['bebe', 'toddler'],
  'patucos-bebe': ['bebe', 'toddler'], 'saco-dormir-bebe': ['bebe', 'toddler'], 'toalla-capucha': ['bebe', 'toddler', 'infantil'], 'babero-bandana': ['bebe', 'toddler']
};
const VARIANTS: Record<string, object[]> = {
  'vestido-trapecio-infantil': [{ manga: 'sin' }, { manga: 'volante' }], 'cubrepanal-bebe': [{ olanes: 'no' }, { olanes: 'si' }],
  'falda-circular-elastica': [{ vuelo: 'completo' }, { vuelo: 'medio' }], 'falda-tul-elastica': [{ capas: '2' }, { capas: '5' }]
};
const ctxFor = (values: GeneratorContext['body'], kind: PersonKind): GeneratorContext => ({ body: values, kind, fabric: 'plano', stretch: 0, fit: 'regular' });
const at = (table: string, code: string, kind: PersonKind) => ctxFor(findSize(table, code)!.values, kind);

describe('colección Niña y ampliación de Bebé', () => {
  it('registra once generadores experimentales con piezas válidas en todas sus tallas y variantes', () => {
    const all = [...GIRLS_GENERATORS, ...BABY_PLUS_GENERATORS];
    expect(all.map(g => g.id).sort()).toEqual(Object.keys(SUPPORTED).sort());
    for (const gen of all) {
      expect(gen.status, gen.id).toBe('experimental');
      expect(getGenerator(gen.id), gen.id).toBe(gen);
      for (const table of SIZE_TABLES) for (const row of table.rows) {
        if (!SUPPORTED[gen.id].includes(row.kind)) continue;
        for (const variant of VARIANTS[gen.id] ?? [{}]) {
          const ctx = ctxFor(row.values, row.kind), result = gen.generate(ctx, { ...gen.defaults(ctx), ...variant });
          const label = `${gen.id} ${row.code} ${JSON.stringify(variant)}`;
          expect(result.pieces.length, label).toBeGreaterThan(0);
          expect(result.notices.filter(n => n.level === 'error'), label).toEqual([]);
          const cuts = new Map(result.pieces.map(p => [p.id, cutOutline(p)]));
          expect(validatePattern(result, cuts).filter(i => i.level === 'error'), label).toEqual([]);
          for (const step of result.steps) for (const id of step.pieces) expect(result.pieces.some(p => p.id === id), `${label}: ${step.id}/${id}`).toBe(true);
        }
      }
    }
  });

  it('rechaza tallas adultas en patrones infantiles en vez de escalar un bloque de niña', () => {
    const adult = at('ref-mujer-busto', 'M92', 'mujer');
    for (const gen of [...GIRLS_GENERATORS, ...BABY_PLUS_GENERATORS].filter(g => !SUPPORTED[g.id].includes('mujer'))) {
      const result = gen.generate(adult, gen.defaults(adult));
      expect(result.pieces, gen.id).toEqual([]);
      expect(result.notices[0].level, gen.id).toBe('error');
    }
  });

  it('comprueba que la cabeza pase por el vestido y calcula el volante sobre la sisa', () => {
    const ctx = at('ref-infantil-estatura', 'E104', 'toddler');
    const short = generateTrapeze(ctx, { abertura: 40 });
    expect(short.notices.some(n => n.code === 'paso-cabeza' && n.level === 'error')).toBe(true);
    const flutter = generateTrapeze(ctx, { manga: 'volante' });
    const piece = (id: string) => flutter.pieces.find(p => p.id === id)!;
    const attach = edgesLength(piece('volante'), ['union-a', 'union-b']);
    expect(attach).toBeCloseTo(edgesLength(piece('delantero'), ['sisa-superior']) + edgesLength(piece('espalda'), ['sisa-superior']), 1);
  });

  it('mantiene escote y sisas del saco de dormir por debajo del contorno de cabeza', () => {
    for (const row of SIZE_TABLES.find(t => t.id === 'ref-bebe-meses')!.rows) {
      const result = generateSleepSack(ctxFor(row.values, 'bebe'), {});
      const front = result.pieces.find(p => p.id === 'delantero')!, back = result.pieces.find(p => p.id === 'espalda')!;
      const neck = 2 * edgesLength(front, ['cuello']) + 2 * edgesLength(back, ['cuello']), arm = edgesLength(front, ['sisa']) + edgesLength(back, ['sisa']);
      expect(neck, row.code).toBeLessThanOrEqual(row.values.cabeza! - 40);
      expect(neck, row.code).toBeGreaterThanOrEqual(row.values.cuello! + 30);
      expect(arm, row.code).toBeLessThanOrEqual(row.values.cabeza! - 60);
    }
  });

  it('hace pasar pretinas y cinturas por la cadera', () => {
    const ctx = at('ref-infantil-estatura', 'E128', 'infantil');
    const tulle = generateTulle(ctx, {});
    expect(edgesLength(tulle.pieces.find(p => p.id === 'pretina')!, ['largo-inferior'])).toBeCloseTo(ctx.body.cadera! + 40, 3);
    const full = generateCircle(ctx, { vuelo: 'completo' }), half = generateCircle(ctx, { vuelo: 'medio' });
    for (const result of [full, half]) {
      const waist = 2 * edgesLength(result.pieces[0], ['cintura']) + 2 * edgesLength(result.pieces[1], ['cintura']);
      expect(waist).toBeCloseTo(ctx.body.cadera! + 40, 0);
    }
    // Medio círculo: el mismo contorno con el doble de radio de cintura.
    expect(half.pieces[0].nodes[0].y / full.pieces[0].nodes[0].y).toBeCloseTo(2, 3);
  });

  it('ajusta olanes, bonete y patucos a los contornos que cosen', () => {
    const baby = at('ref-bebe-meses', 'B6-9', 'bebe');
    const bloomers = generateBloomers(baby, { olanes: 'si' });
    const back = bloomers.pieces.find(p => p.id === 'espalda')!;
    for (const line of back.lines.filter(l => l.kind === 'colocacion')) {
      const ruffle = bloomers.pieces.find(p => p.id === line.id)!;
      expect(edgesLength(ruffle, ['superior'])).toBeCloseTo(2 * line.b.x * 1.8, 3);
      expect(line.a.y).toBeGreaterThan(back.nodes[2].y);
      expect(line.a.y).toBeLessThan(back.nodes[3].y);
    }
    const bonnet = generateBonnet(baby, {});
    expect(edgesLength(bonnet.pieces.find(p => p.id === 'trasera')!, ['nuca-a', 'nuca-b'])).toBeCloseTo(edgesLength(bonnet.pieces.find(p => p.id === 'banda')!, ['nuca']), 2);
    expect(JSON.stringify(bonnet)).not.toMatch(/cinta para atar|cordón/i);
    const booties = generateBooties(baby, {});
    const sole = booties.pieces.find(p => p.id === 'suela')!;
    expect(edgesLength(booties.pieces.find(p => p.id === 'empeine')!, ['suela-a', 'suela-b']) + edgesLength(booties.pieces.find(p => p.id === 'talonera')!, ['suela']))
      .toBeCloseTo(edgesLength(sole, sole.edges.map(e => e.id)), 2);
  });

  it('enlaza cada zona de los dibujos con una pieza física del patrón', () => {
    const models = CATALOG.filter(m => m.flat.kids);
    expect(models.length).toBe(50);
    for (const model of models) {
      const gen = getGenerator(model.generatorId!)!, kinds = SUPPORTED[gen.id] ?? (model.recipients.filter(r => ['bebe', 'toddler', 'infantil'].includes(r)) as PersonKind[]);
      const kind = kinds[0] === 'bebe' ? 'bebe' : kinds.includes('infantil') ? 'infantil' : 'toddler';
      const ctx = kind === 'bebe' ? at('ref-bebe-meses', 'B0-3', 'bebe') : at('ref-infantil-estatura', kind === 'infantil' ? 'E116' : 'E92', kind);
      const pieces = gen.generate(ctx, { ...gen.defaults(ctx), ...model.params }).pieces.map(p => p.id);
      for (const view of buildFlat(model.id, model.flat).views) {
        expect(view.zones.length, model.id).toBeGreaterThan(0);
        expect([view.minX, view.minY, view.width, view.height].every(Number.isFinite), model.id).toBe(true);
        const bindings = KIDS_SURFACE_PIECES[gen.id][view.key] ?? [];
        for (const zone of view.zones) {
          const binding = bindings.find(b => b.zoneId === zone.id);
          expect(binding, `${model.id}/${view.key}/${zone.id}`).toBeDefined();
          expect(pieces, `${model.id}/${zone.id}`).toContain(binding!.pieceId);
        }
      }
    }
  });

  it('presenta siete diseños de niña con patrón y tarjetas propias', () => {
    const girls = groupCatalog(CATALOG.filter(m => modelHasPattern(m) && m.collection === 'Niña'));
    expect(girls.map(g => g.id).sort()).toEqual(['tipo-blusa-campesina', 'tipo-falda-circular', 'tipo-falda-olanes', 'tipo-falda-tul', 'tipo-vestido-tirantes', 'tipo-vestido-trapecio', 'vestido-jareta-infantil']);
    expect(CATALOG.find(m => m.id === 'falda-circular')?.status).toBe('experimental');
  });
});

describe('contorno de corte en esquinas sin margen', () => {
  it('conserva la esquina de costura cuando el margen vecino se prolonga sobre la tangente', () => {
    const ctx = at('ref-infantil-estatura', 'E56', 'bebe');
    const front = generateTrapeze(ctx, { manga: 'volante' }).pieces.find(p => p.id === 'delantero')!;
    const shoulder = front.nodes[2], cut = cutOutline(front).points;
    expect(cut.some(p => Math.hypot(p.x - shoulder.x, p.y - shoulder.y) < 1e-6)).toBe(true);
  });
});
