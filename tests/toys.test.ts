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
  it('tiene 34 juguetes con generador existente, en siete grupos', () => {
    expect(TOY_CARDS).toHaveLength(34);
    expect(TOY_CATEGORIES).toHaveLength(7);
    expect(new Set(TOY_CARDS.map(c => c.id)).size).toBe(TOY_CARDS.length);
    for (const c of TOY_CARDS) expect(getGenerator(c.generatorId), c.id).toBeDefined();
    expect(TOY_CATEGORIES.every(c => c.count > 0)).toBe(true);
    expect(TOY_CARDS.filter(c => toyMatches(c, 'todas', 'conejo')).map(c => c.id)).toEqual(expect.arrayContaining(['conejita-peto', 'conejo-patchwork', 'conejo-3d', 'conejita-vichy', 'conejo-sombrero', 'conejo-blusa', 'conejo-sentado', 'conejo-orejon']));
    expect(TOY_CARDS.filter(c => toyMatches(c, 'todas', 'oso')).map(c => c.id)).toEqual(['osito-lazo', 'oso-cuadros', 'oso-recuerdo']);
    expect(TOY_CARDS.filter(c => toyMatches(c, 'casitas', '')).map(c => c.id)).toEqual(['casa-hongo', 'casita-gnomos']);
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
    for (const personaje of ['muneca', 'conejita', 'conejo', 'gatito', 'perrito', 'patito', 'abeja', 'flor'])
      for (const ropa of ['ninguna', 'peto', 'peto-largo', 'vestido', 'vestido-chaqueta', 'pantalon-chaqueta', 'blusa-pantalon'])
        for (const alto of [220, 300, 450, 700]) expect(problems(gen('muneco-trapo', { personaje, ropa, alto, accesorio: 'zapatos', parche: 'patchwork' })), `${personaje}/${ropa}/${alto}`).toEqual([]);
    for (const [id, key, values] of [['peluche-bichito', 'alto', [140, 220, 500]], ['fieltro-hada', 'alto', [120, 200, 400]], ['peluche-libelula', 'largo', [300, 420, 900]], ['peluche-conejo-3d', 'alto', [220, 320, 700]]] as const)
      for (const v of values) expect(problems(gen(id, { [key]: v })), `${id}/${v}`).toEqual([]);
    expect(gen('muneco-trapo', { alto: 150 }).notices[0].code).toBe('trapo-medidas');
  });

  it('segundo lote: ositos, conejos y casitas validan en todo su rango', () => {
    for (const personaje of ['oso', 'conejita']) for (const alto of [200, 270, 360, 600]) for (const margen of [4, 6, 10])
      expect(problems(gen('peluche-plano', { personaje, alto, margen, hocico: alto > 300 ? 'si' : 'no' })), `plano/${personaje}/${alto}/${margen}`).toEqual([]);
    for (const alto of [250, 400, 700]) for (const margen of [4, 10]) expect(problems(gen('peluche-oso-3d', { alto, margen })), `oso3d/${alto}/${margen}`).toEqual([]);
    for (const alto of [200, 330, 600]) for (const orejas of ['largas', 'medianas']) expect(problems(gen('peluche-conejo-sentado', { alto, orejas, margen: 10 })), `sentado/${alto}/${orejas}`).toEqual([]);
    for (const alto of [160, 260, 500]) for (const gajos of [5, 6, 7, 8]) expect(problems(gen('peluche-casa-hongo', { alto, gajos })), `hongo/${alto}/${gajos}`).toEqual([]);
    for (const alto of [120, 200, 400]) expect(problems(gen('fieltro-casa-gnomos', { alto })), `gnomos/${alto}`).toEqual([]);
    for (const personaje of ['muneca', 'conejo', 'gatito']) expect(problems(gen('muneco-trapo', { personaje, accesorio: 'sombrero', alto: 220 })), personaje).toEqual([]);
    expect(gen('peluche-casa-hongo', { gajos: 9 }).notices[0].code).toBe('casa-hongo-medidas');
  });

  it('segundo lote: las piezas que se unen miden lo mismo', () => {
    const bear = gen('peluche-oso-3d', { alto: 450 });
    expect(runLength(piece(bear, 'cabeza-lateral'), 'nuca')).toBeCloseTo(runLength(piece(bear, 'cabeza-trasera'), 'lado'), 3);
    expect(runLength(piece(bear, 'cuerpo-delantero'), 'costado')).toBeCloseTo(runLength(piece(bear, 'cuerpo-trasero'), 'costado'), 3);
    expect(runLength(piece(bear, 'cabeza-lateral'), 'cuello')).toBeCloseTo(runLength(piece(bear, 'cuerpo-delantero'), 'cuello'), 3);
    expect(runLength(piece(bear, 'cabeza-trasera'), 'cuello')).toBeCloseTo(runLength(piece(bear, 'cuerpo-trasero'), 'cuello'), 3);
    expect(runLength(piece(bear, 'fuelle'), 'lado')).toBeCloseTo(runLength(piece(bear, 'cabeza-lateral'), 'fuelle'), 1);
    expect(runLength(piece(bear, 'base'), 'contorno')).toBeCloseTo(2 * runLength(piece(bear, 'cuerpo-delantero'), 'base') + 2 * runLength(piece(bear, 'cuerpo-trasero'), 'base'), 1);
    expect(piece(bear, 'cuerpo-trasero').lines.filter(l => l.id.startsWith('pinza')).length).toBe(4);
    const bunny = gen('peluche-conejo-sentado');
    expect(runLength(piece(bunny, 'cabeza-delantera'), 'nuca')).toBeCloseTo(runLength(piece(bunny, 'cabeza-trasera'), 'nuca'), 3);
    expect(2 * runLength(piece(bunny, 'cuerpo'), 'cuello')).toBeCloseTo(2 * runLength(piece(bunny, 'cabeza-delantera'), 'cuello') + 2 * runLength(piece(bunny, 'cabeza-trasera'), 'cuello'), 3);
    expect(runLength(piece(bunny, 'suela'), 'contorno')).toBeCloseTo(2 * runLength(piece(bunny, 'pata-trasera'), 'planta'), 1);
    for (const gajos of [5, 8]) {
      const house = gen('peluche-casa-hongo', { gajos });
      expect(piece(house, 'pared').cut.qty).toBe(gajos);
      expect(gajos * runLength(piece(house, 'pared'), 'abajo')).toBeCloseTo(runLength(piece(house, 'base'), 'contorno'), 3);
      expect(gajos * runLength(piece(house, 'pared'), 'arriba')).toBeCloseTo(runLength(piece(house, 'tapa'), 'contorno'), 3);
      expect(gajos * runLength(piece(house, 'techo'), 'borde')).toBeCloseTo(runLength(piece(house, 'bajo-techo'), 'borde'), 3);
    }
    const flat = gen('peluche-plano', { alto: 200, margen: 10 });
    expect(runLength(piece(flat, 'cabeza'), 'cuello')).toBeCloseTo(runLength(piece(flat, 'cuerpo'), 'cuello'), 3);
    expect(piece(flat, 'cuerpo').edges.filter(e => e.id.startsWith('entrepierna')).every(e => e.allowance === 5)).toBe(true);
    const rabbit = gen('muneco-trapo', { personaje: 'conejo', ropa: 'blusa-pantalon', accesorio: 'sombrero' });
    expect(['oreja', 'hocico', 'blusa-delantero', 'blusa-espalda', 'volante', 'pantalon', 'sombrero-ala', 'sombrero-copa'].every(id => rabbit.pieces.some(p => p.id === id))).toBe(true);
    const hem = 2 * runLength(piece(rabbit, 'blusa-delantero'), 'bajo') + 2 * runLength(piece(rabbit, 'blusa-espalda'), 'bajo');
    expect(2 * runLength(piece(rabbit, 'volante'), 'union') / hem).toBeCloseTo(1.7, 3);
    const brimLine = piece(rabbit, 'sombrero-ala').lines.filter(l => l.kind === 'colocacion').reduce((s, l) => s + Math.hypot(l.b.x - l.a.x, l.b.y - l.a.y), 0);
    expect(2 * runLength(piece(rabbit, 'sombrero-copa'), 'base')).toBeCloseTo(brimLine, 1);
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
    for (const felt of [gen('fieltro-hada'), gen('fieltro-casa-gnomos')]) expect(felt.pieces.every(p => p.edges.every(e => e.allowance === 0))).toBe(true);
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
    for (const [id, input] of [['conejo-3d', { alto: 400 }], ['casa-hongo', { alto: 300, gajos: 7 }]] as const) {
      const out = await buildToyPdf(TOY_CARDS.find(c => c.id === id)!, input);
      expect(new TextDecoder().decode(out.bytes.slice(0, 4))).toBe('%PDF');
      expect((await PDFDocument.load(out.bytes)).getPageCount()).toBe(out.pageCount);
      expect(out.patternStartPage).toBeGreaterThan(1);
      expect(out.manifest.seams.every(s => s.ok)).toBe(true);
    }
  });
});
