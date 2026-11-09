import { describe, expect, it } from 'vitest';
import { PDFDocument } from 'pdf-lib';
import { PLAYMAT_CARDS, PLAYMAT_CATEGORIES } from '../src/data/playmats';
import { toyMatches } from '../src/data/toys';
import { getGenerator } from '../src/lib/pattern/generators';
import { PLAYMAT_GENERATORS, PLAYMAT_IDS, SENSORY_LAYOUTS, playmatLayout, puzzleShape, puzzleSides } from '../src/lib/pattern/generators/playmats';
import { SENSORY, SENSORY_IDS } from '../src/lib/pattern/generators/sensoryKit';
import { insidePoly } from '../src/lib/pattern/generators/shapeKit';
import { validatePattern } from '../src/lib/pattern/validate';
import { cutOutline } from '../src/lib/pattern/offset';
import { seamPolygon } from '../src/lib/pattern/outline';
import { bboxOf } from '../src/lib/geom/vec';
import type { Params } from '../src/lib/pattern/generator';
import { TOY_CONTEXT, prepareToy } from '../src/features/toys/prepare';
import { playmatScene } from '../src/features/playmats/PlaymatArt';
import { buildToyPdf } from '../src/features/toys/export';
import { projectFor } from '../src/features/toys/PlushCatalog';
import { projectorSource } from '../src/lib/projector/source';

/* Tapetes: siluetas, acolchado, apliques y elementos sensoriales dentro de
 * sus piezas, costuras que casan, corte entero o al doblez, y patrón listo
 * para imprimir y proyectar. */

const gen = (id: string, p: Params = {}) => { const g = getGenerator(id)!; return g.generate(TOY_CONTEXT, { ...g.defaults(TOY_CONTEXT), ...p }); };
const piece = (r: ReturnType<typeof gen>, id: string) => r.pieces.find(p => p.id === id)!;
const problems = (r: ReturnType<typeof gen>) => [
  ...r.notices.filter(n => n.level === 'error').map(n => n.code),
  ...validatePattern(r, new Map(r.pieces.map(p => [p.id, cutOutline(p)]))).filter(i => i.level === 'error' || i.code === 'costura-no-coincide').map(i => `${i.code}:${i.pieceId ?? ''}`)
];
const size = (r: ReturnType<typeof gen>, id: string) => { const b = bboxOf(seamPolygon(piece(r, id))); return { w: b.maxX - b.minX, h: b.maxY - b.minY }; };
const EXTRA: Record<string, Params[]> = {
  'tapete-sol': [{ acolchado: 'circulos' }, { juguetes: 'no', rayos: 12 }],
  'tapete-arcoiris': [{ bandas: 3 }, { bandas: 6, corazon: 'no' }],
  'tapete-flor': [{ petalos: 5 }, { petalos: 8 }],
  'tapete-hoja': ['acorazonada', 'ovalada', 'ginkgo', 'festoneada', 'monstera'].map(forma => ({ forma })),
  'tapete-petalos': [{ forma: 'rectangular' }, { forma: 'rectangular', cabecero: 'no', petalo: 100 }],
  'tapete-puzle': [{ filas: 2, columnas: 4 }],
  'tapete-sensorial': [{ cuadros: 4 }]
};

describe('catálogo de tapetes', () => {
  it('tiene 17 tapetes de 11 patrones en cuatro grupos', () => {
    expect(PLAYMAT_CARDS).toHaveLength(17);
    expect(new Set(PLAYMAT_CARDS.map(c => c.id)).size).toBe(17);
    expect(PLAYMAT_GENERATORS).toHaveLength(11);
    expect(new Set(PLAYMAT_CARDS.map(c => c.generatorId))).toEqual(new Set(PLAYMAT_IDS));
    expect(PLAYMAT_CATEGORIES.every(c => c.count > 0)).toBe(true);
    for (const q of ['krabbeldecke', 'play mat', "tapis d'éveil"]) expect(PLAYMAT_CARDS.filter(c => toyMatches(c, 'todas', q))).toHaveLength(17);
    expect(PLAYMAT_CARDS.filter(c => toyMatches(c, 'todas', 'sensorial')).map(c => c.id)).toEqual(['sensorial-3', 'sensorial-4', 'sensorial-hexagonal']);
  });

  it('cada tarjeta genera sus piezas sin errores y con dibujo', () => {
    for (const c of PLAYMAT_CARDS) {
      const { built, params } = prepareToy(c);
      expect(built.issues.filter(i => i.level === 'error').map(i => i.message), c.id).toEqual([]);
      expect(built.seamResults.every(s => s.ok), c.id).toBe(true);
      expect(playmatScene(c, built.result, params).length, c.id).toBeGreaterThan(3);
    }
  });
});

describe('patrones de tapetes', () => {
  it('validan en todo su rango, enteros o al doblez, volteados o con ribete', () => {
    for (const g of PLAYMAT_GENERATORS) {
      const sp = g.params[0];
      for (const v of [sp.min!, sp.max!]) for (const e of [{}, ...(EXTRA[g.id] ?? [])]) for (const [margen, acabado, corte] of [[6, 'volteado', 'entera'], [15, 'ribete', 'doblez']] as const) {
        const r = gen(g.id, { [sp.key]: v, margen, acabado, corte, ...e });
        expect(problems(r), `${g.id}/${v}/${margen}/${acabado}/${corte}/${JSON.stringify(e)}`).toEqual([]);
        expect(Math.abs(r.checks[0].measured - r.checks[0].target), `${g.id}/${v}`).toBeLessThanOrEqual(r.checks[0].tolerance ?? 0);
      }
      expect(gen(g.id, { [sp.key]: sp.max! + 10 }).notices[0].code, g.id).toBe('tapete-medidas');
    }
  });

  it('el acolchado y los apliques quedan dentro del tapete', () => {
    for (const id of PLAYMAT_IDS.filter(x => x !== 'tapete-puzle')) for (const e of [{}, ...(EXTRA[id] ?? [])]) {
      const L = playmatLayout(id, e);
      for (const l of L.quilt) for (const q of l) expect(insidePoly(q, L.body) || L.pieced, `${id} ${JSON.stringify(e)}`).toBe(true);
      for (const a of L.apps) for (const q of a.poly) expect(insidePoly(q, L.body), `${id}/${a.id}`).toBe(true);
    }
  });

  it('al doblez: media pieza con su doblez y sus líneas en la mitad', () => {
    for (const id of ['tapete-oso', 'tapete-conejo', 'tapete-flor', 'tapete-hoja', 'tapete-fresa', 'tapete-petalos']) {
      const whole = gen(id), half = gen(id, { corte: 'doblez' }), body = piece(half, 'tapete');
      expect(body.cut.onFold, id).toBe(true);
      expect(body.edges.some(e => e.finish === 'doblez'), id).toBe(true);
      expect(size(half, 'tapete').w, id).toBeCloseTo(size(whole, 'tapete').w / 2, -1);
      expect(body.lines.every(l => l.a.x >= -0.01 && l.b.x >= -0.01), id).toBe(true);
    }
    // La espiral del sol no es simétrica: siempre entera.
    expect(piece(gen('tapete-sol', { corte: 'doblez' }), 'tapete').cut.onFold).toBe(false);
    expect(piece(gen('tapete-sol', { acolchado: 'circulos', corte: 'doblez' }), 'tapete').cut.onFold).toBe(true);
  });

  it('respeta las medidas y construcciones de las referencias', () => {
    // Conejo: 150 de alto, cabeza de 100.
    const bunny = size(gen('tapete-conejo'), 'tapete');
    expect(bunny.h).toBeCloseTo(1500, -1);
    expect(Math.abs(bunny.w - 1000)).toBeLessThan(40);
    // Hojas: las proporciones de las fotos.
    const ginkgo = size(gen('tapete-hoja', { forma: 'ginkgo', alto: 1270 }), 'tapete');
    expect(ginkgo.w / ginkgo.h).toBeGreaterThan(0.8);
    expect(ginkgo.w / ginkgo.h).toBeLessThan(0.95);
    // Arcoíris: cada banda casa con la anterior.
    const rb = gen('tapete-arcoiris', { bandas: 5 });
    expect(rb.seams.filter(s => s.id.startsWith('arco-'))).toHaveLength(5);
    expect(rb.pieces.filter(p => p.id.startsWith('banda-'))).toHaveLength(5);
    // Pétalos: número par que cubre todo el borde, con sus piquetes.
    const pet = gen('tapete-petalos'), petal = piece(pet, 'petalo'), N = petal.cut.qty / 2;
    expect(N % 2).toBe(0);
    expect(piece(pet, 'tapete').notches.filter(n => n.id.startsWith('petalo-'))).toHaveLength(N - 1);
    expect(piece(gen('tapete-petalos', { forma: 'rectangular' }), 'cabecero')).toBeDefined();
    // Fresa: pepitas pespunteadas; sol: juguetes con anilla.
    expect(piece(gen('tapete-fresa'), 'tapete').lines.filter(l => l.kind === 'pespunte').length).toBeGreaterThan(200);
    const sun = gen('tapete-sol');
    expect(sun.pieces.map(p => p.id)).toEqual(expect.arrayContaining(['anclaje', 'nube-colgante', 'arcoiris-colgante', 'lengueta-juguete']));
    expect(sun.materials.find(m => m.id === 'anillas')!.label).toMatch(/5 a 6,5 cm/);
  });

  it('las piezas del puzle encajan: pestaña frente a hueco, con holgura', () => {
    for (const [rows, cols] of [[3, 3], [2, 4], [4, 4]]) for (let i = 0; i < rows; i++) for (let j = 0; j < cols; j++) {
      const s = puzzleSides(rows, cols, i, j);
      if (j < cols - 1) expect([s[1], puzzleSides(rows, cols, i, j + 1)[3]].sort(), `${i},${j} derecha`).toEqual(['hole', 'knob']);
      if (i < rows - 1) expect([s[2], puzzleSides(rows, cols, i + 1, j)[0]].sort(), `${i},${j} abajo`).toEqual(['hole', 'knob']);
      if (i === 0) expect(s[0]).toBe('flat');
      if (j === 0) expect(s[3]).toBe('flat');
    }
    // A knob overlaps less than its neighbour's hole: the stuffed knob fits.
    const s = 350, knob = puzzleShape(s, ['flat', 'knob', 'flat', 'flat'], 10), hole = puzzleShape(s, ['flat', 'flat', 'flat', 'hole'], 10);
    const reach = Math.max(...knob.map(q => q.x)) - s, depth = Math.min(...hole.filter(q => q.y > s / 2 - 5 && q.y < s / 2 + 5).map(q => q.x));
    expect(depth - reach).toBeGreaterThan(5);
  });

  it('los elementos sensoriales caben en su cuadro o triángulo', () => {
    expect(SENSORY_IDS.length).toBeGreaterThanOrEqual(13);
    for (const id of [...SENSORY_LAYOUTS[3], ...SENSORY_LAYOUTS[4]]) for (const pt of SENSORY[id].parts) for (const poly of pt.at) for (const q of poly) {
      expect(q.x, `${id}/${pt.key}`).toBeGreaterThanOrEqual(15); expect(q.x).toBeLessThanOrEqual(285);
      expect(q.y, `${id}/${pt.key}`).toBeGreaterThanOrEqual(15); expect(q.y).toBeLessThanOrEqual(285);
    }
    const hex = gen('tapete-sensorial-hexagonal');
    for (const tri of hex.pieces.filter(p => p.id.startsWith('triangulo-'))) {
      const outline = seamPolygon(tri);
      expect(tri.lines.filter(l => l.kind === 'colocacion').length, tri.id).toBeGreaterThan(5);
      for (const l of tri.lines) expect(insidePoly(l.a, outline) && insidePoly(l.b, outline), tri.id).toBe(true);
    }
    const grid = gen('tapete-sensorial', { cuadros: 4 });
    expect(grid.pieces.filter(p => p.id.startsWith('cuadro-')).reduce((n, p) => n + p.cut.qty, 0)).toBe(16);
    expect(grid.notices.map(n => n.code)).toContain('sensorial-seguridad');
  });

  it('avisos de seguridad en todos', () => {
    for (const id of PLAYMAT_IDS) expect(gen(id).notices.map(n => n.code), id).toContain('tapete-seguridad');
    expect(gen('tapete-petalos').notices.map(n => n.code)).toContain('petalos-seguridad');
  });

  it('todos se proyectan y salen en PDF a tamaño real', async () => {
    for (const card of PLAYMAT_CARDS) {
      const { params, built } = prepareToy(card);
      const source = projectorSource(projectFor(card, params), { profiles: {}, fabrics: {}, materials: {}, unit: 'cm', mode: 'complete' });
      expect(source.blockers, card.id).toEqual([]);
      expect(source.groups[0].drawables.length, card.id).toBe(built.pieces.length);
    }
    const out = await buildToyPdf(PLAYMAT_CARDS.find(c => c.id === 'oso')!, { corte: 'doblez' });
    expect(new TextDecoder().decode(out.bytes.slice(0, 4))).toBe('%PDF');
    expect((await PDFDocument.load(out.bytes)).getPageCount()).toBe(out.pageCount);
    expect(out.manifest.seams.every(s => s.ok)).toBe(true);
  }, 60000);
});
