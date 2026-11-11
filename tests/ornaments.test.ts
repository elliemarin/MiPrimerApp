import { describe, expect, it } from 'vitest';
import { PDFDocument } from 'pdf-lib';
import { ORNAMENT_CARDS, ORNAMENT_CATEGORIES } from '../src/data/ornaments';
import { toyMatches } from '../src/data/toys';
import { getGenerator } from '../src/lib/pattern/generators';
import { ADVENT_FORMS, ORNAMENT_GENERATORS, ORNAMENT_IDS, fitNumber, ornamentLayout, patchworkOutline } from '../src/lib/pattern/generators/ornaments';
import { insidePoly } from '../src/lib/pattern/generators/shapeKit';
import { validatePattern } from '../src/lib/pattern/validate';
import { cutOutline } from '../src/lib/pattern/offset';
import { intersectPolygons, offsetPolygons, polygonsArea } from '../src/lib/geom/polyoffset';
import type { Params } from '../src/lib/pattern/generator';
import { TOY_CONTEXT, prepareToy } from '../src/features/toys/prepare';
import { ornamentScene } from '../src/features/ornaments/OrnamentArt';
import { buildToyPdf } from '../src/features/toys/export';
import { projectFor } from '../src/features/toys/PlushCatalog';
import { projectorSource } from '../src/lib/projector/source';

/* Adornos navideños: cada adorno valida en todo su rango de tamaños, opciones
 * y puntadas; los apliques quedan en su sitio; el número del día cabe en la
 * figura; la bota casa forro, puño y presilla; todo se imprime y se proyecta. */

const gen = (id: string, p: Params = {}) => { const g = getGenerator(id)!; return g.generate(TOY_CONTEXT, { ...g.defaults(TOY_CONTEXT), ...p }); };
const piece = (r: ReturnType<typeof gen>, id: string) => r.pieces.find(p => p.id === id)!;
const problems = (r: ReturnType<typeof gen>) => [
  ...r.notices.filter(n => n.level === 'error').map(n => n.code),
  ...validatePattern(r, new Map(r.pieces.map(p => [p.id, cutOutline(p)]))).filter(i => i.level === 'error' || i.code === 'costura-no-coincide').map(i => `${i.code}:${i.pieceId ?? ''}`)
];
const OPTIONS: Record<string, Params[]> = {
  'adorno-casita': [{ adorno: 'estrella' }, { adorno: 'corazon' }],
  'adorno-reno': [{ accesorio: 'pajarita' }, { accesorio: 'gorro' }, { accesorio: 'lazo' }],
  'adorno-jengibre': [{ ropa: 'botones' }, { ropa: 'falda' }, { ropa: 'bufanda' }],
  'adorno-arbol': [{}],
  'adorno-arbol-retales': [{ pisos: '3' }, { pisos: '4' }],
  'adorno-adviento': ADVENT_FORMS.flatMap(forma => [{ forma, numero: 'ninguno' }, { forma, numero: '8' }, { forma, numero: '24' }]),
  'bota-navidena': ['recto', 'ondas'].flatMap(puno => ['no', 'si'].flatMap(talon => ['ninguno', 'reno', 'arbol'].map(aplique => ({ puno, talon, aplique }))))
};
const range = (id: string) => { const d = getGenerator(id)!.params.find(p => p.key === 'alto')!, m = getGenerator(id)!.params.find(p => p.key === 'margen')!; return { sizes: [d.min!, (d.min! + d.max!) / 2, d.max!], margins: [m.min!, m.max!] }; };

describe('catálogo de adornos navideños', () => {
  it('tiene 24 adornos en tres grupos y se encuentran por nombre', () => {
    expect(ORNAMENT_GENERATORS).toHaveLength(7);
    expect(ORNAMENT_CARDS).toHaveLength(24);
    expect(ORNAMENT_CATEGORIES.map(c => c.count)).toEqual([11, 9, 4]);
    expect(new Set(ORNAMENT_CARDS.map(c => c.id)).size).toBe(24);
    for (const q of ['reno', 'jengibre', 'adviento', 'bota', 'casita', 'árbol', 'christmas']) expect(ORNAMENT_CARDS.filter(c => toyMatches(c, 'todas', q)).length, q).toBeGreaterThan(0);
    expect(new Set(ORNAMENT_CARDS.map(c => c.generatorId))).toEqual(new Set(ORNAMENT_IDS));
  });

  it('cada tarjeta genera sus piezas sin errores y con dibujo', () => {
    for (const c of ORNAMENT_CARDS) {
      const { built, params } = prepareToy(c);
      expect(built.issues.filter(i => i.level === 'error').map(i => i.message), c.id).toEqual([]);
      expect(built.seamResults.every(s => s.ok), c.id).toBe(true);
      expect(ornamentScene(c, built.result, params).length, c.id).toBeGreaterThan(2);
    }
  });
});

describe('patrones de adornos', () => {
  it('validan en todo el rango de tamaños, opciones y márgenes', () => {
    let n = 0;
    for (const id of ORNAMENT_IDS) {
      const { sizes, margins } = range(id);
      for (const alto of sizes) for (const margen of margins) for (const o of OPTIONS[id]) {
        const r = gen(id, { ...o, alto, margen });
        expect(problems(r), `${id} ${JSON.stringify(o)} ${alto} ${margen}`).toEqual([]);
        expect(r.checks[0].measured, `${id} alto`).toBeCloseTo(alto, -1);
        n++;
      }
    }
    expect(n).toBe(300);
    expect(gen('adorno-reno', { alto: 20 }).notices[0].code).toBe('adorno-medidas');
  });

  it('los adornos de fieltro llevan la puntada marcada y los apliques en su sitio', () => {
    for (const id of ORNAMENT_IDS.filter(x => x.startsWith('adorno-') && x !== 'adorno-arbol-retales')) for (const o of OPTIONS[id]) {
      const L = ornamentLayout(id, o).felt!, body = L.pieces[0];
      expect(body.edges.every(e => e.finish === 'sin-margen'), `${id} sin margen`).toBe(true);
      expect(body.lines.some(l => l.kind === 'pespunte' && l.id.startsWith('puntada-')), `${id} puntada`).toBe(true);
      expect(body.marks.map(m => m.id), id).toContain('presilla');
      for (const part of L.design.parts) {
        const pc = L.pieces.find(p => p.id === part.id)!;
        expect(pc.cut.qty, `${id} ${part.id}`).toBe(part.at.length * (part.layers ?? 1));
        // Inserted parts really go between the layers: they overlap the body.
        if (part.kind === 'entre') for (const poly of part.at) expect(polygonsArea(intersectPolygons([poly], [L.design.body])), `${id} ${part.id} entre`).toBeGreaterThan(1);
        // Every appliqué has its placement line on the piece it is sewn to.
        if (part.kind === 'aplique') expect(L.pieces.find(p => p.id === (part.on ?? 'cuerpo'))!.lines.some(l => l.id.startsWith(`aplique-${part.id}-`)), `${id} ${part.id} colocación`).toBe(true);
      }
    }
  });

  it('el número del día cabe dentro de la figura y no pisa los apliques', () => {
    for (const forma of ADVENT_FORMS) for (const numero of ['1', '8', '18', '24']) {
      const L = ornamentLayout('adorno-adviento', { forma, numero }).felt!, paint = L.design.paint.filter(x => x.color === 'numero');
      if (forma === 'baston') { expect(paint, forma).toHaveLength(0); expect(L.design.notes.join(' '), forma).toContain('no cabe'); continue; }
      expect(paint, `${forma} ${numero}`).toHaveLength(1);
      const inside = offsetPolygons([L.design.body], -2);
      for (const q of paint[0].shape.flat()) expect(inside.some(r => insidePoly(q, r)), `${forma} ${numero}`).toBe(true);
      for (const part of L.design.parts.filter(x => x.kind === 'aplique')) for (const poly of part.at) expect(polygonsArea(intersectPolygons(paint[0].shape, [poly])), `${forma} ${numero} ${part.id}`).toBeLessThan(0.5);
      // Two digits are smaller than one, but still readable.
      const ys = paint[0].shape.flat().map(q => q.y);
      expect(Math.max(...ys) - Math.min(...ys), `${forma} ${numero}`).toBeGreaterThan(7);
    }
    expect(fitNumber('5', 'baston', [], [])).toBeUndefined();
  });

  it('la bota casa forro y puño, y el aplique queda en la pierna', () => {
    const plain = gen('bota-navidena');
    expect(plain.pieces.map(p => p.id)).toEqual(['exterior', 'forro', 'puno', 'presilla']);
    expect(piece(plain, 'exterior').cut.mirrorPairs).toBe(true);
    expect(plain.seams.map(s => s.id)).toEqual(['forro', 'puno']);
    const fancy = gen('bota-navidena', { puno: 'ondas', talon: 'si', aplique: 'reno', alto: 300 });
    expect(piece(fancy, 'puno').edges.filter(e => e.id.startsWith('ondas')).every(e => e.finish === 'sin-margen')).toBe(true);
    expect(piece(fancy, 'talon').edges.some(e => e.id.startsWith('borde') && e.finish === 'sin-margen')).toBe(true);
    for (const [aplique, talon] of [['reno', 'si'], ['arbol', 'si'], ['reno', 'no']]) for (const alto of [250, 450, 600]) {
      const S = ornamentLayout('bota-navidena', { aplique, talon, alto, puno: 'ondas' }).stocking!, zone = offsetPolygons([S.zone], 1);
      for (const a of S.applique) for (const poly of a.polys) for (const q of poly) expect(zone.some(r => insidePoly(q, r)), `${aplique} ${talon} ${alto} ${a.id}`).toBe(true);
    }
  });

  it('el árbol de retales se cose revés con revés y se recorta en zigzag', () => {
    const r = gen('adorno-arbol-retales', { pisos: '4', alto: 140 });
    expect(r.pieces.map(p => p.id)).toEqual(['delantero', 'trasero', 'guata']);
    expect(piece(r, 'guata').edges.every(e => e.finish === 'sin-margen')).toBe(true);
    expect(piece(r, 'delantero').edges[0].label).toContain('zigzag');
    expect(r.seams[0].id).toBe('contorno');
    const o = patchworkOutline(140, 4), ys = o.map(q => q.y);
    expect(Math.max(...ys) - Math.min(...ys)).toBeCloseTo(140, 5);
    // Four steps on each side: the outline gets wider tier after tier.
    expect(o.filter(q => q.x > 0).length).toBe(2 * 4 - 1 + 2);
  });

  it('avisos de seguridad en todos', () => {
    for (const id of ORNAMENT_IDS) expect(gen(id).notices.map(n => n.code), id).toContain(id === 'bota-navidena' ? 'bota-seguridad' : 'adorno-seguridad');
  });

  it('todos se proyectan y salen en PDF a tamaño real', async () => {
    for (const card of ORNAMENT_CARDS) {
      const { params, built } = prepareToy(card);
      const source = projectorSource(projectFor(card, params), { profiles: {}, fabrics: {}, materials: {}, unit: 'cm', mode: 'complete' });
      expect(source.blockers, card.id).toEqual([]);
      expect(source.groups[0].drawables.length, card.id).toBe(built.pieces.length);
    }
    for (const id of ['reno-gorro', 'adviento-esfera', 'media-reno']) {
      const out = await buildToyPdf(ORNAMENT_CARDS.find(c => c.id === id)!, {});
      expect(new TextDecoder().decode(out.bytes.slice(0, 4))).toBe('%PDF');
      expect((await PDFDocument.load(out.bytes)).getPageCount()).toBe(out.pageCount);
      expect(out.manifest.seams.every(s => s.ok)).toBe(true);
    }
  }, 90000);
});
