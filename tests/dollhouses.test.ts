import { describe, expect, it } from 'vitest';
import { PDFDocument } from 'pdf-lib';
import { TOY_CARDS, toyMatches } from '../src/data/toys';
import { getGenerator } from '../src/lib/pattern/generators';
import { DOLLHOUSE_GENERATORS, dollhouseLayout, placeSlot } from '../src/lib/pattern/generators/dollhouses';
import { FURNITURE_TYPES, furniture } from '../src/lib/pattern/generators/dollFurniture';
import { runLength } from '../src/lib/pattern/generators/toyKit';
import { validatePattern } from '../src/lib/pattern/validate';
import { cutOutline } from '../src/lib/pattern/offset';
import type { Params } from '../src/lib/pattern/generator';
import { TOY_CONTEXT, prepareToy } from '../src/features/toys/prepare';
import { dollhouseScene } from '../src/features/toys/DollhouseArt';
import { buildToyPdf } from '../src/features/toys/export';
import { projectFor } from '../src/features/toys/PlushCatalog';
import { projectorSource } from '../src/lib/projector/source';

/* Casitas de muñecas portátiles: paneles, muebles interactivos en su sitio,
 * costuras del cubo, ribete y proyección. */

const gen = (id: string, p: Params = {}) => { const g = getGenerator(id)!; return g.generate(TOY_CONTEXT, { ...g.defaults(TOY_CONTEXT), ...p }); };
const piece = (r: ReturnType<typeof gen>, id: string) => r.pieces.find(p => p.id === id)!;
const problems = (r: ReturnType<typeof gen>) => [
  ...r.notices.filter(n => n.level === 'error').map(n => n.code),
  ...validatePattern(r, new Map(r.pieces.map(p => [p.id, cutOutline(p)]))).filter(i => i.level === 'error' || i.code === 'costura-no-coincide').map(i => `${i.code}:${i.pieceId ?? ''}`)
];
const cards = TOY_CARDS.filter(c => c.category === 'portatiles');

describe('casitas de muñecas', () => {
  it('ocho casitas de seis patrones, con dibujo', () => {
    expect(cards).toHaveLength(8);
    expect(DOLLHOUSE_GENERATORS).toHaveLength(6);
    expect(new Set(cards.map(c => c.generatorId)).size).toBe(6);
    for (const c of cards) {
      const { built, params } = prepareToy(c);
      expect(built.issues.filter(i => i.level === 'error').map(i => i.message), c.id).toEqual([]);
      expect(built.seamResults.every(s => s.ok), c.id).toBe(true);
      expect(dollhouseScene(c, params).length, c.id).toBeGreaterThan(10);
    }
    expect(TOY_CARDS.filter(c => toyMatches(c, 'todas', 'casita')).length).toBeGreaterThanOrEqual(9);
  });

  it('validan con muñecas de 9 a 20 cm en todas sus formas', () => {
    for (const muneca of [90, 120, 200]) {
      for (const forma of ['casa', 'calabaza']) expect(problems(gen('casita-libro', { forma, muneca })), `libro ${forma} ${muneca}`).toEqual([]);
      for (const forma of ['redonda', 'tejado', 'rectangular']) for (const habitaciones of ['bano-dormitorio', 'cocina-dormitorio', 'salon-dormitorio'])
        expect(problems(gen('casita-bolsa', { forma, habitaciones, muneca, cierre: 'cremallera' })), `bolsa ${forma} ${habitaciones} ${muneca}`).toEqual([]);
      for (const id of ['casita-plegable', 'casita-cubo', 'casita-tapete', 'casita-paginas']) expect(problems(gen(id, { muneca, margen: 10 })), `${id} ${muneca}`).toEqual([]);
    }
    expect(gen('casita-tapete', { muneca: 60 }).notices[0].code).toBe('casita-medidas');
  });

  it('cada mueble es interactivo y se marca en la pared donde va', () => {
    for (const type of FURNITURE_TYPES) { const f = furniture(type); expect(f.parts.length, type).toBeGreaterThan(0); expect(f.how.length, type).toBeGreaterThan(10); }
    const mat = gen('casita-tapete'), wall = piece(mat, 'interior');
    const L = dollhouseLayout('casita-tapete', { muneca: 120, margen: 6 }), placed = L.panels[0].slots.flatMap(s => placeSlot(s, L.s0).parts);
    expect(wall.lines.filter(l => l.kind === 'colocacion').length).toBeGreaterThan(placed.length * 4);
    // Doors are lined pairs that open; the bed blanket and the bathtub are pockets.
    expect(piece(mat, 'fregadero-puerta-fregadero').cut).toMatchObject({ qty: 4, mirrorPairs: true });
    expect(piece(mat, 'nevera-puerta').notes?.[0]).toMatch(/Se abre/);
    expect(piece(mat, 'cama-manta').notes?.[0]).toMatch(/Bolsillo/);
    expect(piece(mat, 'banera-banera').notes?.[0]).toMatch(/Bolsillo/);
    expect(mat.pieces.some(p => p.id === 'muneca-cuerpo')).toBe(true);
    expect(mat.notices.some(n => n.code === 'casita-piezas-sueltas')).toBe(true);
    // Every furniture outline sits inside its room.
    for (const s of L.panels[0].slots) for (const pp of placeSlot(s, L.s0).parts) for (const q of pp.pts) {
      expect(q.x, `${s.type} ${pp.part.key}`).toBeGreaterThanOrEqual(s.box[0] - 0.5); expect(q.x).toBeLessThanOrEqual(s.box[2] + 0.5);
      expect(q.y, `${s.type} ${pp.part.key}`).toBeLessThanOrEqual(s.box[3] + 0.5);
    }
  });

  it('el cubo cierra: hastiales, tejado a 45° y frente que se abre', () => {
    const cube = gen('casita-cubo'), strip = piece(cube, 'franja-interior'), gl = piece(cube, 'hastial-izquierdo'), gr = piece(cube, 'hastial-derecho');
    expect(runLength(gl, 'cosido')).toBeCloseTo(runLength(strip, 'cosido-i'), 3);
    expect(runLength(gr, 'cosido')).toBeCloseTo(runLength(strip, 'cosido-d'), 3);
    expect(runLength(strip, 'frente-d')).toBeCloseTo(runLength(gl, 'frente'), 3);
    const roof = piece(cube, 'franja-tejado'), walls = piece(cube, 'franja-paredes');
    expect(runLength(roof, 'union')).toBeCloseTo(runLength(walls, 'union'), 3);
    // Roof of 6 × 4 × 4 in scaled: each slope is the depth over √2.
    const k = 1.2, F = 102 * k, A = 152 * k;
    expect(runLength(roof, 'lado')).toBeCloseTo(2 * F / Math.SQRT2, 1);
    expect(runLength(roof, 'union')).toBeCloseTo(A, 3);
    expect(cube.pieces.filter(p => p.id.startsWith('refuerzo')).every(p => p.edges.every(e => e.allowance === 0))).toBe(true);
  });

  it('los tapetes llevan ribete del largo de su borde y todo se proyecta', () => {
    for (const id of ['casita-tapete', 'casita-plegable']) {
      const r = gen(id), rib = piece(r, 'ribete'), inner = piece(r, 'interior');
      const per = inner.edges.reduce((s, e) => s + runLength({ ...inner, edges: [e] }, e.id), 0);
      expect(runLength(rib, 'canto') * rib.cut.qty, id).toBeCloseTo(per, 0);
    }
    for (const card of cards.filter(c => ['casita-tapete', 'casita-cubo', 'casita-bolsa'].includes(c.id))) {
      const { params, built } = prepareToy(card);
      const source = projectorSource(projectFor(card, params), { profiles: {}, fabrics: {}, materials: {}, unit: 'cm', mode: 'complete' });
      expect(source.blockers, card.id).toEqual([]);
      expect(source.groups[0].drawables.length, card.id).toBe(built.pieces.length);
    }
  });

  it('genera el PDF a tamaño real', async () => {
    const out = await buildToyPdf(cards.find(c => c.id === 'casita-cubo')!, {});
    expect((await PDFDocument.load(out.bytes)).getPageCount()).toBe(out.pageCount);
    expect(out.manifest.seams.every(s => s.ok)).toBe(true);
  });
});
