import { describe, expect, it } from 'vitest';
import { PDFDocument } from 'pdf-lib';
import { CATALOG } from '../src/data/catalog';
import { BAG_CATALOG } from '../src/data/bagCatalog';
import { BAG_FLAT_KEYS, BAG_SURFACE_PIECES } from '../src/data/bagFlats';
import { buildFlat } from '../src/data/flats';
import { familyOf } from '../src/data/catalogTaxonomy';
import { getGenerator } from '../src/lib/pattern/generators';
import { BAG_GENERATORS, BAG_IDS, runIds } from '../src/lib/pattern/generators/bags';
import { runLength } from '../src/lib/pattern/generators/toyKit';
import { validatePattern } from '../src/lib/pattern/validate';
import { cutOutline } from '../src/lib/pattern/offset';
import { seamPolygon } from '../src/lib/pattern/outline';
import { insidePoly } from '../src/lib/pattern/generators/shapeKit';
import type { Params } from '../src/lib/pattern/generator';
import type { PlushCard } from '../src/data/toys';
import { TOY_CONTEXT } from '../src/features/toys/prepare';
import { buildToyPdf } from '../src/features/toys/export';
import { projectFor } from '../src/features/toys/PlushCatalog';
import { projectorSource } from '../src/lib/projector/source';

/* Bolsos y mochilas: patrones que validan en todo su rango, costuras de
 * fuelles y cremalleras que casan, dibujos técnicos ligados a piezas reales y
 * patrón listo para imprimir y proyectar. */

const gen = (id: string, p: Params = {}) => { const g = getGenerator(id)!; return g.generate(TOY_CONTEXT, { ...g.defaults(TOY_CONTEXT), ...p }); };
const piece = (r: ReturnType<typeof gen>, id: string) => r.pieces.find(p => p.id === id)!;
const problems = (r: ReturnType<typeof gen>) => [
  ...r.notices.filter(n => n.level === 'error').map(n => n.code),
  ...validatePattern(r, new Map(r.pieces.map(p => [p.id, cutOutline(p)]))).filter(i => i.level === 'error' || i.code === 'costura-no-coincide').map(i => `${i.code}:${i.pieceId ?? ''}`)
];
const RANGES: Record<string, Params[]> = {
  'funda-portatil-cremallera': [{ tamano: '13' }, { tamano: '16', acolchado: 'rombos' }, { tamano: 'medida', anchoPortatil: 200, altoPortatil: 140, grosor: 8 }, { tamano: 'medida', anchoPortatil: 420, altoPortatil: 300, grosor: 35, bolsilloExterior: 'no', bolsilloInterior: 'no', acolchado: 'no' }],
  'bolsa-u-bolsillo': [{ fondo: 0 }, { ancho: 260, alto: 280, fondo: 160 }, { ancho: 500, alto: 560 }],
  'bolsa-asas-laterales': [{ ancho: 160, fondo: 100, altoCostado: 180, altoTotal: 420, anchoAsa: 35 }, { ancho: 320, fondo: 200, altoCostado: 340, altoTotal: 680, anchoAsa: 70 }],
  'bolsa-estrella': [{ ancho: 320 }, { ancho: 560, corte: 'entera' }],
  'tote-bolsillos': [{ ancho: 280, alto: 200, fondo: 80, altoBolsillo: 100 }, { ancho: 500, alto: 400, fondo: 200, altoBolsillo: 220 }],
  'mochila-solapa': [{ ancho: 260, alto: 350, fondo: 100 }, { ancho: 380, alto: 520, fondo: 180 }],
  'mochila-osito': [{ ancho: 180, alto: 200, fondo: 60 }, { ancho: 300, alto: 340, fondo: 120 }],
  'rinonera-organizador': [{ corte: 'entera' }, { ancho: 240, alto: 240, cintura: 600 }, { ancho: 380, alto: 400, cintura: 1400, corte: 'entera' }]
};

describe('bolsos y mochilas en la sección de bolsos', () => {
  it('añade 8 diseños y 10 recetas al catálogo de bolsos, con familia y dibujo propios', () => {
    expect(BAG_GENERATORS).toHaveLength(8);
    expect(BAG_CATALOG).toHaveLength(10);
    expect(new Set(BAG_CATALOG.map(m => m.designGroup!.id)).size).toBe(8);
    for (const m of BAG_CATALOG) {
      const model = CATALOG.find(x => x.id === m.id)!;
      expect(model.type, m.id).toBe('bolsos');
      expect(model.status, m.id).toBe('experimental');
      expect(['tote', 'funda-tecnologia', 'mochila', 'rinonera']).toContain(familyOf(model));
      expect(getGenerator(model.generatorId!), m.id).toBeDefined();
      expect(BAG_FLAT_KEYS).toContain(model.flat.bagStyle);
    }
    expect(familyOf(CATALOG.find(m => m.id === 'mochila-osito')!)).toBe('mochila');
    expect(CATALOG.find(m => m.id === 'mochila-osito')!.recipients).toEqual(['toddler', 'infantil']);
  });

  it('cada zona del dibujo técnico apunta a una pieza real del patrón', () => {
    for (const id of BAG_IDS) {
      const model = BAG_CATALOG.find(m => m.generatorId === id)!, flat = buildFlat(model.id, model.flat), r = gen(id, model.params);
      for (const view of flat.views) for (const binding of BAG_SURFACE_PIECES[id][view.key] ?? []) {
        expect(view.zones.some(z => z.id === binding.zoneId), `${id}/${view.key}/${binding.zoneId}`).toBe(true);
        expect(r.pieces.some(p => p.id === binding.pieceId), `${id}/${binding.pieceId}`).toBe(true);
      }
    }
  });

  it('validan en todo su rango y con márgenes de 6 a 15 mm', () => {
    for (const id of BAG_IDS) for (const p of [{}, ...RANGES[id]]) for (const margen of [6, 15]) {
      const r = gen(id, { ...p, margen });
      expect(problems(r), `${id} ${JSON.stringify(p)} ${margen}`).toEqual([]);
      for (const c of r.checks) expect(Math.abs(c.measured - c.target), `${id} ${c.key}`).toBeLessThanOrEqual(c.tolerance ?? 0);
    }
    expect(gen('bolsa-u-bolsillo', { ancho: 900 }).notices[0].code).toBe('bolso-medidas');
  });

  it('respeta las construcciones de las referencias', () => {
    // Funda: hueco interior con holgura y cremallera en tres lados que casa con el contorno.
    const sleeve = gen('funda-portatil-cremallera', { tamano: '14' }), body = piece(sleeve, 'cuerpo');
    expect(runLength(body, 'cremallera') + runLength(body, 'base')).toBeCloseTo(runLength(piece(sleeve, 'cremallera-panel'), 'canto-cuerpo') + runLength(piece(sleeve, 'fuelle-base'), 'canto-delantero'), 0);
    expect(sleeve.checks[0].measured).toBeGreaterThanOrEqual(322 + 16);
    expect(sleeve.materials.find(m => m.id === 'cremallera')).toBeDefined();
    // Bolsa en U: el fuelle sigue el contorno; sin fuelle no hay fuelle.
    expect(piece(gen('bolsa-u-bolsillo'), 'fuelle')).toBeDefined();
    expect(gen('bolsa-u-bolsillo', { fondo: 0 }).pieces.some(p => p.id === 'fuelle')).toBe(false);
    expect(piece(gen('bolsa-u-bolsillo'), 'bolsillo').lines.some(l => l.id.startsWith('tallo'))).toBe(true);
    // Estrella: el asa calada queda al menos 15 mm dentro de la silueta.
    const star = gen('bolsa-estrella', { corte: 'entera' }), outline = seamPolygon(piece(star, 'cuerpo'));
    for (const l of piece(star, 'cuerpo').lines.filter(x => x.id.startsWith('asa-costura'))) expect(insidePoly(l.a, outline)).toBe(true);
    expect(piece(star, 'refuerzo-asa').cut.qty).toBe(4);
    // Tote: bolsillos en las cuatro caras y base que casa.
    const tote = gen('tote-bolsillos');
    expect(piece(tote, 'bolsillo-frente').cut.qty + piece(tote, 'bolsillo-costado').cut.qty).toBe(4);
    // Mochilas: jareta alrededor de la boca; la infantil sin cordones.
    const pack = gen('mochila-solapa');
    expect(piece(pack, 'jareta').marks.filter(m => m.kind === 'ojal')).toHaveLength(8);
    const bear = gen('mochila-osito');
    expect(bear.notices.map(n => n.code)).toContain('mochila-infantil');
    expect(bear.materials.some(m => /cord[oó]n/i.test(m.label))).toBe(false);
    expect(piece(bear, 'oreja').cut.qty).toBe(4);
    // Riñonera: el cinturón cierra el contorno pedido y los bolsillos caben en el cuerpo.
    const hip = gen('rinonera-organizador', { cintura: 1000, corte: 'entera' }), hb = piece(hip, 'cuerpo'), ho = seamPolygon(hb);
    expect(hip.checks[0].measured).toBeCloseTo(1200, 0);
    for (const l of hb.lines.filter(x => x.kind === 'colocacion')) expect(insidePoly(l.a, ho), l.id).toBe(true);
    expect(runIds(piece(gen('rinonera-organizador'), 'cuerpo'), 'doblez')).toHaveLength(1);
  });

  it('se proyectan y salen en PDF a tamaño real', async () => {
    for (const id of BAG_IDS) {
      const card = { name: id, generatorId: id } as PlushCard, r = gen(id);
      const source = projectorSource(projectFor(card, getGenerator(id)!.defaults(TOY_CONTEXT)), { profiles: {}, fabrics: {}, materials: {}, unit: 'cm', mode: 'complete' });
      expect(source.blockers, id).toEqual([]);
      expect(source.groups[0].drawables.length, id).toBe(r.pieces.length);
    }
    const card = { id: 'mochila-osito', name: 'Mochila osito', generatorId: 'mochila-osito', params: {}, description: 'Mochila', category: 'bolsos', tags: [], colors: { piel: '#000', ropa: '#000', contraste: '#000', detalle: '#000' }, reference: 'Prueba' } as PlushCard;
    const out = await buildToyPdf(card, {});
    expect(new TextDecoder().decode(out.bytes.slice(0, 4))).toBe('%PDF');
    expect((await PDFDocument.load(out.bytes)).getPageCount()).toBe(out.pageCount);
    expect(out.manifest.seams.every(s => s.ok)).toBe(true);
  }, 60000);
});
