import { describe, expect, it } from 'vitest';
import { PDFDocument } from 'pdf-lib';
import { TOY_CARDS, TOY_CATEGORIES, toyMatches } from '../src/data/toys';
import { getGenerator } from '../src/lib/pattern/generators';
import { TOY_GENERATORS } from '../src/lib/pattern/generators/toys';
import { runLength } from '../src/lib/pattern/generators/toyKit';
import { validatePattern } from '../src/lib/pattern/validate';
import { cutOutline } from '../src/lib/pattern/offset';
import { seamPolygon } from '../src/lib/pattern/outline';
import { bboxOf } from '../src/lib/geom/vec';
import type { Params } from '../src/lib/pattern/generator';
import { TOY_CONTEXT, prepareToy } from '../src/features/toys/prepare';
import { toyScene } from '../src/features/toys/ToyArt';
import { buildToyPdf } from '../src/features/toys/export';

/* Juguetes y peluches: piezas válidas a cualquier alto, costuras que coinciden
 * y seguridad para bebés. */

const gen = (id: string, p: Params = {}) => { const g = getGenerator(id)!; return g.generate(TOY_CONTEXT, { ...g.defaults(TOY_CONTEXT), ...p }); };
const piece = (r: ReturnType<typeof gen>, id: string) => r.pieces.find(p => p.id === id)!;
const problems = (r: ReturnType<typeof gen>) => [
  ...r.notices.filter(n => n.level === 'error').map(n => n.code),
  ...validatePattern(r, new Map(r.pieces.map(p => [p.id, cutOutline(p)]))).filter(i => i.level === 'error' || i.code === 'costura-no-coincide').map(i => `${i.code}:${i.pieceId ?? ''}`)
];

describe('catálogo de juguetes', () => {
  it('tiene 16 juguetes con generador existente, en cinco grupos', () => {
    expect(TOY_CARDS).toHaveLength(16);
    expect(new Set(TOY_CARDS.map(c => c.id)).size).toBe(TOY_CARDS.length);
    for (const c of TOY_CARDS) expect(getGenerator(c.generatorId), c.id).toBeDefined();
    expect(TOY_CATEGORIES.every(c => c.count > 0)).toBe(true);
    expect(TOY_CARDS.filter(c => toyMatches(c, 'todas', 'conejo')).map(c => c.id)).toEqual(expect.arrayContaining(['conejita-peto', 'conejo-patchwork', 'conejo-3d']));
  });

  it('cada tarjeta genera sus piezas sin errores, con ilustración', () => {
    for (const c of TOY_CARDS) {
      const { built, params } = prepareToy(c);
      expect(built.issues.filter(i => i.level === 'error').map(i => i.message), c.id).toEqual([]);
      expect(built.seamResults.every(s => s.ok), c.id).toBe(true);
      expect(toyScene(c, built.result, params).length, c.id).toBeGreaterThan(4);
    }
  });
});

describe('generadores de juguetes', () => {
  it('muñecos de trapo: todos los personajes y ropas validan a 22, 30, 45 y 70 cm', () => {
    for (const personaje of ['muneca', 'conejita', 'gatito', 'perrito', 'patito', 'abeja', 'flor'])
      for (const ropa of ['ninguna', 'peto', 'peto-largo', 'vestido', 'vestido-chaqueta', 'pantalon-chaqueta'])
        for (const alto of [220, 300, 450, 700]) expect(problems(gen('muneco-trapo', { personaje, ropa, alto, accesorio: 'zapatos', parche: 'patchwork' })), `${personaje}/${ropa}/${alto}`).toEqual([]);
    for (const [id, key, values] of [['peluche-bichito', 'alto', [140, 220, 500]], ['fieltro-hada', 'alto', [120, 200, 400]], ['peluche-libelula', 'largo', [300, 420, 900]], ['peluche-conejo-3d', 'alto', [220, 320, 700]]] as const)
      for (const v of values) expect(problems(gen(id, { [key]: v })), `${id}/${v}`).toEqual([]);
    expect(gen('muneco-trapo', { alto: 150 }).notices[0].code).toBe('trapo-medidas');
  });

  it('escala la figura pero no el margen de costura', () => {
    for (const alto of [250, 500]) {
      const head = piece(gen('muneco-trapo', { alto, margen: 6 }), 'cabeza');
      const seam = bboxOf(seamPolygon(head)), cut = bboxOf(cutOutline(head).points);
      expect(seam.maxX - seam.minX).toBeCloseTo(105 * alto / 300, -0.3);
      expect(cut.maxX - seam.maxX).toBeCloseTo(6, 0);
    }
  });

  it('las costuras que se unen miden lo mismo', () => {
    const doll = gen('muneco-trapo', { personaje: 'muneca', ropa: 'vestido-chaqueta', accesorio: 'zapatos' });
    expect(runLength(piece(doll, 'cabeza'), 'cuello')).toBeCloseTo(runLength(piece(doll, 'cuerpo'), 'cuello'), 3);
    expect(runLength(piece(doll, 'zapato'), 'suela')).toBeCloseTo(runLength(piece(doll, 'suela'), 'contorno'), 1);
    expect(runLength(piece(doll, 'manga'), 'copa')).toBeCloseTo(runLength(piece(doll, 'chaqueta-delantero'), 'sisa') + runLength(piece(doll, 'chaqueta-espalda'), 'sisa'), 1);
    const flower = gen('muneco-trapo', { personaje: 'flor', petalos: 9 });
    expect(flower.notices.find(n => n.code === 'petalos')!.level).toBe('ok');
    expect(9 * runLength(piece(flower, 'petalo'), 'union') + 34).toBeCloseTo(runLength(piece(flower, 'cabeza'), 'contorno'), 0);
    const bunny = gen('peluche-conejo-3d');
    expect(runLength(piece(bunny, 'fuelle'), 'lado')).toBeCloseTo(runLength(piece(bunny, 'cabeza-lateral'), 'fuelle'), 1);
    expect(runLength(piece(bunny, 'panza'), 'lado')).toBeCloseTo(runLength(piece(bunny, 'cuerpo-lateral'), 'frente'), 1);
    expect(runLength(piece(bunny, 'suela'), 'contorno')).toBeCloseTo(2 * runLength(piece(bunny, 'pierna'), 'planta'), 1);
    const neck = 2 * runLength(piece(bunny, 'cabeza-lateral'), 'cuello'), bodyNeck = 2 * runLength(piece(bunny, 'cuerpo-lateral'), 'cuello') + 2 * runLength(piece(bunny, 'panza'), 'cuello');
    expect(bodyNeck).toBeCloseTo(neck, 0);
  });

  it('marca dónde van brazos, piernas y la abertura para voltear', () => {
    const body = piece(gen('muneco-trapo'), 'cuerpo');
    for (const id of ['brazo-a', 'brazo-b', 'pierna-1-a', 'pierna-2-b', 'abertura-a', 'abertura-b']) expect(body.notches.map(n => n.id), id).toContain(id);
  });

  it('el fieltro se corta sin margen y la libélula se frunce a su largo', () => {
    const fairy = gen('fieltro-hada');
    expect(fairy.pieces.every(p => p.edges.every(e => e.allowance === 0))).toBe(true);
    const fly = gen('peluche-libelula', { largo: 600 });
    expect(fly.checks[0].measured).toBeCloseTo(600, 0);
    expect(piece(fly, 'cuerpo').lines.filter(l => l.id.startsWith('frunce')).length).toBeGreaterThan(8);
  });

  it('seguridad: aviso para menores de 3 años, antenas bordadas sin piezas sueltas', () => {
    for (const g of TOY_GENERATORS) expect(g.generate(TOY_CONTEXT, g.defaults(TOY_CONTEXT)).notices.some(n => n.code === 'juguete-seguridad'), g.id).toBe(true);
    const bee = gen('muneco-trapo', { personaje: 'abeja', antenas: 'bordadas' });
    expect(bee.pieces.some(p => p.id === 'antena' || p.id === 'bola-antena')).toBe(false);
    for (const g of TOY_GENERATORS) expect(JSON.stringify(g.generate(TOY_CONTEXT, g.defaults(TOY_CONTEXT)).materials)).not.toMatch(/alambre|cordón/i);
  });

  it('genera el PDF con las piezas a tamaño real y las costuras comprobadas', async () => {
    const card = TOY_CARDS.find(c => c.id === 'conejo-3d')!;
    const out = await buildToyPdf(card, { alto: 400 });
    expect(new TextDecoder().decode(out.bytes.slice(0, 4))).toBe('%PDF');
    expect((await PDFDocument.load(out.bytes)).getPageCount()).toBe(out.pageCount);
    expect(out.patternStartPage).toBeGreaterThan(1);
    expect(out.manifest.seams.every(s => s.ok)).toBe(true);
  });
});
