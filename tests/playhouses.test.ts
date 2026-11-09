import { describe, expect, it } from 'vitest';
import { PDFDocument } from 'pdf-lib';
import { PLAYHOUSE_CARDS, PLAYHOUSE_CATEGORIES } from '../src/data/playhouses';
import { toyMatches } from '../src/data/toys';
import { getGenerator } from '../src/lib/pattern/generators';
import { PLAYHOUSE_GENERATORS, PLAYHOUSE_IDS, THEMES, THEME_IDS, valanceShape, windowShape, playhouseLayout } from '../src/lib/pattern/generators/playhouses';
import { insidePoly } from '../src/lib/pattern/generators/shapeKit';
import { validatePattern } from '../src/lib/pattern/validate';
import { cutOutline } from '../src/lib/pattern/offset';
import { seamPolygon } from '../src/lib/pattern/outline';
import { intersectPolygons, offsetPolygons, polygonsArea } from '../src/lib/geom/polyoffset';
import type { Params } from '../src/lib/pattern/generator';
import type { Pt } from '../src/lib/geom/vec';
import { TOY_CONTEXT, prepareToy } from '../src/features/toys/prepare';
import { playhouseScene } from '../src/features/playhouses/PlayhouseArt';
import { buildToyPdf } from '../src/features/toys/export';
import { projectFor } from '../src/features/toys/PlushCatalog';
import { projectorSource } from '../src/lib/projector/source';

/* Casitas de juego: todos los temas en las dos construcciones validan, los
 * apliques no tapan puertas ni ventanas, los faldones casan con su borde y el
 * patrón se imprime y se proyecta. */

const gen = (id: string, p: Params = {}) => { const g = getGenerator(id)!; return g.generate(TOY_CONTEXT, { ...g.defaults(TOY_CONTEXT), ...p }); };
const piece = (r: ReturnType<typeof gen>, id: string) => r.pieces.find(p => p.id === id)!;
const problems = (r: ReturnType<typeof gen>) => [
  ...r.notices.filter(n => n.level === 'error').map(n => n.code),
  ...validatePattern(r, new Map(r.pieces.map(p => [p.id, cutOutline(p)]))).filter(i => i.level === 'error' || i.code === 'costura-no-coincide').map(i => `${i.code}:${i.pieceId ?? ''}`)
];
/** Closed outline drawn by a group of lines (`prefix-0`, `prefix-1`…). */
const loopOf = (pc: ReturnType<typeof piece>, prefix: string): Pt[] => pc.lines.filter(l => new RegExp(`^${prefix}-\\d+$`).test(l.id)).map(l => l.a);
const overlap = (a: Pt[], b: Pt[]) => a.length > 2 && b.length > 2 ? polygonsArea(intersectPolygons([a], [b])) : 0;
const SIZES: Record<string, Params[]> = { 'casita-rincon': [{}, { ancho: 900, alto: 700, altoTejado: 500 }, { ancho: 1600, alto: 1300, altoTejado: 1000 }], 'casita-mesa': [{}, { largo: 700, fondo: 500, alto: 450 }, { largo: 1800, fondo: 1000, alto: 800, esquinas: 'abiertas' }] };

describe('catálogo de casitas de juego', () => {
  it('tiene 12 casitas de rincón y de mesa con 12 temas propios', () => {
    expect(PLAYHOUSE_CARDS).toHaveLength(12);
    expect(PLAYHOUSE_GENERATORS).toHaveLength(2);
    expect(THEME_IDS).toHaveLength(12);
    expect(PLAYHOUSE_CATEGORIES.map(c => c.count)).toEqual([8, 4]);
    for (const q of ['honguito', 'princesa', 'payaso', 'hada', 'rayas']) expect(PLAYHOUSE_CARDS.filter(c => toyMatches(c, 'todas', q)).length, q).toBeGreaterThan(0);
  });

  it('cada tarjeta genera sus piezas sin errores y con dibujo', () => {
    for (const c of PLAYHOUSE_CARDS) {
      const { built, params } = prepareToy(c);
      expect(built.issues.filter(i => i.level === 'error').map(i => i.message), c.id).toEqual([]);
      expect(built.seamResults.every(s => s.ok), c.id).toBe(true);
      expect(playhouseScene(c, built.result, params).length, c.id).toBeGreaterThan(8);
    }
  });
});

describe('patrones de casitas', () => {
  it('validan con todos los temas, faldones, medidas y márgenes', () => {
    for (const id of PLAYHOUSE_IDS) for (const size of SIZES[id]) for (const tema of THEME_IDS) for (const [margen, faldon] of [[6, 'tema'], [15, 'goteo'], [10, 'almenas']] as const)
      expect(problems(gen(id, { ...size, tema, margen, faldon })), `${id} ${JSON.stringify(size)} ${tema} ${margen} ${faldon}`).toEqual([]);
    expect(gen('casita-rincon', { ancho: 2000 }).notices[0].code).toBe('casita-medidas');
  });

  it('los apliques caben en su pieza y no tapan la puerta ni las ventanas', () => {
    for (const id of PLAYHOUSE_IDS) for (const size of SIZES[id]) for (const tema of THEME_IDS) {
      const r = gen(id, { ...size, tema });
      for (const target of r.pieces.filter(p => ['pared', 'pared-frente', 'tejado'].includes(p.id))) {
        const outline = seamPolygon(target), inner = offsetPolygons([outline], -15);
        const holes = [...new Set(target.lines.filter(l => l.kind === 'referencia').map(l => l.id.replace(/-\d+$/, '')))].map(prefix => loopOf(target, prefix));
        const decos = [...new Set(target.lines.filter(l => l.id.startsWith('aplique-')).map(l => l.id.replace(/-\d+$/, '')))];
        for (const prefix of decos) {
          const poly = loopOf(target, prefix);
          for (const q of poly) expect(inner.some(s => insidePoly(q, s)), `${id} ${tema} ${prefix} fuera de ${target.id}`).toBe(true);
          for (const hole of holes) expect(overlap(poly, hole), `${id} ${tema} ${prefix} tapa una ventana`).toBeLessThan(1);
        }
      }
    }
  });

  it('los faldones miden lo mismo que su borde y salen enteros', () => {
    for (const style of ['ondas', 'goteo', 'picos', 'hojas', 'almenas'] as const) {
      const v = valanceShape(style, 1300, 7, 10), top = v.filter(q => Math.abs(q.y) < 0.05).map(q => q.x);
      expect(Math.max(...top) - Math.min(...top), style).toBeCloseTo(1300, 0);
      expect(Math.min(...v.map(q => q.y)), style).toBeGreaterThanOrEqual(-0.05);
    }
    const r = gen('casita-mesa', { tema: 'lunares' });
    expect(r.seams.filter(s => s.id.startsWith('faldon'))).toHaveLength(2);
    expect(piece(r, 'faldon-largo').cut.qty).toBe(4);
    for (const w of ['cruz', 'redonda', 'corazon', 'arco', 'rombo'] as const) expect(windowShape(w, 0, 0, 300, 280).poly.length, w).toBeGreaterThan(3);
  });

  it('respeta las construcciones de las referencias', () => {
    // Rincón: tejado de 130 × 85 cm, pared de 98 cm en tres paneles de 20, 50 y 60 cm.
    const basic = gen('casita-rincon', { tema: 'sencilla' });
    expect(['panel-izquierdo', 'panel-puerta', 'panel-ventana'].every(id => piece(basic, id))).toBe(true);
    expect(piece(basic, 'tejado').marks.map(m => m.id)).toContain('gancho');
    expect(basic.materials.find(m => m.id === 'barra')).toBeDefined();
    // Temas: cortinas con alzapaños de velcro, buhardilla en la noche estrellada, persianas.
    expect(piece(gen('casita-rincon', { tema: 'princesa' }), 'alzapano')).toBeDefined();
    expect(piece(gen('casita-rincon', { tema: 'estrellas' }), 'tejado').lines.some(l => l.id.startsWith('buhardilla'))).toBe(true);
    expect(piece(gen('casita-mesa', { tema: 'menta', esquinas: 'abiertas' }), 'tira-esquina').cut.qty).toBe(12);
    // Mesa: techo y paredes casan; la puerta es un hueco en la pared de delante.
    const table = gen('casita-mesa', { tema: 'jardin' });
    expect(table.seams.map(s => s.id)).toEqual(expect.arrayContaining(['frente-techo', 'trasera-techo', 'lateral-techo', 'esquina']));
    expect(piece(table, 'pared-frente').edges.some(e => e.id.startsWith('puerta'))).toBe(true);
    expect(piece(gen('casita-mesa', { tema: 'jardin', esquinas: 'abiertas' }), 'tira-esquina')).toBeDefined();
    // Every theme has its own valance, window and door choice.
    expect(new Set(Object.values(THEMES).map(t => t.valance)).size).toBeGreaterThanOrEqual(5);
    expect(new Set(Object.values(THEMES).map(t => t.window)).size).toBe(5);
    expect(playhouseLayout('casita-rincon', { tema: 'honguito' }).art.length).toBeGreaterThan(10);
  });

  it('avisos de seguridad en todas', () => {
    for (const id of PLAYHOUSE_IDS) expect(gen(id).notices.map(n => n.code), id).toContain('casita-seguridad');
  });

  it('todas se proyectan y salen en PDF a tamaño real', async () => {
    for (const card of PLAYHOUSE_CARDS) {
      const { params, built } = prepareToy(card);
      const source = projectorSource(projectFor(card, params), { profiles: {}, fabrics: {}, materials: {}, unit: 'cm', mode: 'complete' });
      expect(source.blockers, card.id).toEqual([]);
      expect(source.groups[0].drawables.length, card.id).toBe(built.pieces.length);
    }
    const out = await buildToyPdf(PLAYHOUSE_CARDS.find(c => c.id === 'rincon-honguito')!, {});
    expect(new TextDecoder().decode(out.bytes.slice(0, 4))).toBe('%PDF');
    expect((await PDFDocument.load(out.bytes)).getPageCount()).toBe(out.pageCount);
    expect(out.manifest.seams.every(s => s.ok)).toBe(true);
  }, 60000);
});
