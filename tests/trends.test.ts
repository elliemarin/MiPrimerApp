import { describe, expect, it } from 'vitest';
import { generateJeans, jeansDefaults, SILHOUETTES, jeansGenerator } from '../src/lib/pattern/generators/jeans';
import { generateOversize, oversizeDefaults } from '../src/lib/pattern/generators/oversize';
import { generateOverall, generateBucket, generateEarHat, generateSet, SETS } from '../src/lib/pattern/generators/babyMore';
import type { GeneratorContext, GeneratorResult } from '../src/lib/pattern/generator';
import type { PersonKind } from '../src/lib/sizes/tables';
import { findSize } from '../src/lib/sizes/tables';
import { validatePattern } from '../src/lib/pattern/validate';
import { cutOutline } from '../src/lib/pattern/offset';
import { edgesLength } from '../src/lib/pattern/outline';
import { CATALOG, findModel } from '../src/data/catalog';
import { buildFlat } from '../src/data/flats';
import { KIDS_SURFACE_PIECES } from '../src/data/kidsFlats';
import { getGenerator } from '../src/lib/pattern/generators';

const at = (table: string, code: string, kind: PersonKind, fabric: 'plano' | 'punto' = 'plano', stretch = 0): GeneratorContext => ({ body: findSize(table, code)!.values, kind, fabric, stretch, fit: 'regular' });
const valid = (r: GeneratorResult, label: string) => {
  expect(r.pieces.length, label).toBeGreaterThan(0);
  expect(r.notices.filter(n => n.level === 'error'), label).toEqual([]);
  const cuts = new Map(r.pieces.map(p => [p.id, cutOutline(p)]));
  expect(validatePattern(r, cuts).filter(i => i.level === 'error'), label).toEqual([]);
  for (const step of r.steps) for (const id of step.pieces) expect(r.pieces.some(p => p.id === id), `${label}: ${step.id}/${id}`).toBe(true);
};
const piece = (r: GeneratorResult, id: string) => r.pieces.find(p => p.id === id)!;
const SIZES: [string, string, PersonKind][] = [['ref-infantil-estatura', 'E116', 'infantil'], ['ref-infantil-estatura', 'E146', 'infantil'], ['ref-mujer-busto', 'M88', 'mujer'], ['ref-mujer-busto', 'M116', 'mujer'], ['ref-hombre-pecho', 'H100', 'hombre']];

describe('pantalones de mezclilla con siluetas', () => {
  it('genera las siete siluetas con pretina y bragueta en tallas infantiles y adultas', () => {
    for (const [table, code, kind] of SIZES) for (const silueta of Object.keys(SILHOUETTES)) for (const bolsillos of ['cinco', 'cargo']) for (const tiro of ['alto', 'medio']) {
      const ctx = at(table, code, kind, 'plano', silueta === 'pitillo' ? 20 : 0);
      valid(generateJeans(ctx, { ...jeansDefaults(ctx), silueta, bolsillos, tiro }), `${code} ${silueta} ${bolsillos} ${tiro}`);
    }
  });

  it('cierra la pretina a la cintura pedida y reparte la cadera en el canesú', () => {
    const ctx = at('ref-mujer-busto', 'M96', 'mujer'), r = generateJeans(ctx, { ...jeansDefaults(ctx), silueta: 'recto', tiro: 'alto' });
    const waist = r.checks.find(c => c.key === 'cintura')!;
    expect(waist.target).toBeCloseTo(ctx.body.cintura! + 12, 0);
    expect(Math.abs(waist.measured - waist.target)).toBeLessThan(1);
    expect(r.pieces.map(p => p.id)).toEqual(expect.arrayContaining(['delantero', 'trasero', 'canesu', 'vista-bolsillo', 'forro-bolsillo', 'relojera', 'pretina', 'tapeta', 'presillas', 'bolsillo-trasero']));
    const band = piece(r, 'pretina');
    expect(band.marks.map(m => m.kind).sort()).toEqual(['boton', 'ojal']);
  });

  it('da a cada silueta su forma: barrel ancho en la rodilla, acampanado abierto en el bajo, pitillo pide elasticidad', () => {
    const ctx = at('ref-hombre-pecho', 'H100', 'hombre');
    const knee = (silueta: string) => { const r = generateJeans(ctx, { ...jeansDefaults(ctx), silueta }); return { k: r.checks.find(c => c.key === 'rodilla')!.measured, h: r.checks.find(c => c.key === 'bajo')!.measured, r }; };
    const barrel = knee('barrel'), flare = knee('acampanado'), straight = knee('recto');
    expect(barrel.k).toBeGreaterThan(barrel.h * 1.5);
    expect(flare.h).toBeGreaterThan(flare.k * 1.3);
    expect(straight.k).toBeGreaterThan(straight.h);
    expect(knee('pitillo').r.notices.some(n => n.code === 'pitillo-elasticidad')).toBe(true);
    expect(piece(barrel.r, 'delantero').edges.find(e => e.id === 'costado-inf')!.kind).toBe('cubic');
  });

  it('usa cintura elástica sin bragueta para bebé y rechaza la pretina', () => {
    const ctx = at('ref-bebe-meses', 'B6-9', 'bebe'), r = generateJeans(ctx, { ...jeansDefaults(ctx), silueta: 'barrel' });
    valid(r, 'bebé barrel');
    expect(r.pieces.map(p => p.id)).not.toContain('tapeta');
    expect(generateJeans(ctx, { ...jeansDefaults(ctx), cintura: 'pretina' }).notices[0].code).toBe('jeans-bebe-pretina');
    expect(jeansGenerator.status).toBe('experimental');
  });
});

describe('prendas oversize de hombro caído', () => {
  it('calcula la copa de la manga igual a la sisa en todas las prendas', () => {
    for (const [table, code, kind] of SIZES) for (const prenda of ['camiseta', 'sobrecamisa', 'bomber']) {
      const ctx = at(table, code, kind, prenda === 'camiseta' ? 'punto' : 'plano', prenda === 'camiseta' ? 30 : 0);
      const r = generateOversize(ctx, { ...oversizeDefaults(ctx), prenda, bolsillos: 'tres', manga: 'larga' });
      valid(r, `${code} ${prenda}`);
      expect(edgesLength(piece(r, 'manga'), ['copa-delantera', 'copa-espalda'])).toBeCloseTo(2 * edgesLength(piece(r, 'delantero'), ['sisa']), 1);
    }
  });
  it('arma cuello con pie en la sobrecamisa y rib, cierre y forro en la bomber', () => {
    const ctx = at('ref-mujer-busto', 'M96', 'mujer');
    const shirt = generateOversize(ctx, { ...oversizeDefaults(ctx), prenda: 'sobrecamisa' });
    expect(shirt.pieces.map(p => p.id)).toEqual(expect.arrayContaining(['pie-cuello', 'cuello', 'bolsillo-pecho']));
    expect(piece(shirt, 'delantero').marks.filter(m => m.kind === 'boton').length).toBeGreaterThanOrEqual(4);
    const bomber = generateOversize(ctx, { ...oversizeDefaults(ctx), prenda: 'bomber' });
    expect(bomber.pieces.map(p => p.id)).toEqual(expect.arrayContaining(['cuello-rib', 'banda', 'puno', 'vivo', 'bolsa', 'delantero-forro']));
    expect(bomber.materials.some(m => /Cierre separable/.test(m.label))).toBe(true);
  });
});

describe('más bebé: peto, gorros, sombrero y conjuntos', () => {
  it('abre piernas y entrepierna con cinta de broches iguales en delantero y espalda', () => {
    for (const largo of ['corto', 'largo']) {
      const r = generateOverall(at('ref-bebe-meses', 'B9-12', 'bebe'), { largo });
      valid(r, largo);
      expect(edgesLength(piece(r, 'delantero'), ['abertura-pierna', 'abertura-entrepierna'])).toBeCloseTo(edgesLength(piece(r, 'espalda'), ['abertura-pierna', 'abertura-entrepierna']), 6);
    }
    expect(generateOverall(at('ref-mujer-busto', 'M92', 'mujer'), {}).notices[0].code).toBe('peto-talla');
  });
  it('ajusta la copa oval y el ala del sombrero a la banda', () => {
    const r = generateBucket(at('ref-bebe-meses', 'B6-9', 'bebe'), {});
    valid(r, 'sombrero');
    expect(edgesLength(piece(r, 'copa'), ['contorno-1', 'contorno-2', 'contorno-3', 'contorno-4'])).toBeCloseTo(2 * edgesLength(piece(r, 'banda'), ['superior', 'superior-b']), 0);
    expect(r.pieces.some(p => p.id === 'barbiquejo')).toBe(true);
    valid(generateEarHat(at('ref-infantil-estatura', 'E92', 'toddler', 'punto', 30), { orejas: 'conejo' }), 'gorro conejo');
  });
  it('reúne conjuntos con ids únicos y pasos que nombran sus piezas', () => {
    for (const set of Object.keys(SETS)) {
      const r = generateSet(at('ref-bebe-meses', 'B3-6', 'bebe'), { conjunto: set });
      valid(r, set);
      expect(new Set(r.pieces.map(p => p.id)).size).toBe(r.pieces.length);
    }
  });
});

describe('catálogo de tendencias', () => {
  it('convierte inspiraciones en patrones sin cambiar sus ids y enlaza las zonas nuevas', () => {
    for (const id of ['pantalon-baggy', 'pantalon-barrel', 'pantalon-cargo', 'pantalon-pitillo', 'pantalon-acampanado', 'sobrecamisa-leñadora', 'bomber-clasica', 'sombrero-pescador'])
      expect(findModel(id)?.status, id).toBe('experimental');
    expect(CATALOG.filter(m => m.collection === 'Tendencias').length).toBeGreaterThanOrEqual(14);
    for (const model of CATALOG.filter(m => m.flat.kids && ['peto-bebe', 'gorro-orejas', 'conjunto-bebe'].includes(m.generatorId!))) {
      const gen = getGenerator(model.generatorId!)!, ctx = at('ref-bebe-meses', 'B0-3', 'bebe', model.generatorId === 'gorro-orejas' ? 'punto' : 'plano', 30);
      const ids = gen.generate(ctx, { ...gen.defaults(ctx), ...model.params }).pieces.map(p => p.id);
      for (const view of buildFlat(model.id, model.flat).views) for (const zone of view.zones) {
        const binding = KIDS_SURFACE_PIECES[gen.id][view.key]!.find(b => b.zoneId === zone.id);
        expect(binding, `${model.id}/${zone.id}`).toBeDefined();
        expect(ids, `${model.id}/${zone.id}`).toContain(binding!.pieceId);
      }
    }
  });
});
