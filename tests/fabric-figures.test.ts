import { describe, expect, it } from 'vitest';
import { PDFDocument } from 'pdf-lib';
import { FABRIC_FIGURES, FIGURE_CATEGORIES, figureMatches, findFigure } from '../src/data/fabricFigures';
import { FIGURE_CATEGORY_LABEL, TURN_ALLOWANCE, buildFigure, defaultFigureOptions, type FigureDef } from '../src/lib/applique/figure';
import { differencePolygons, intersectPolygons, offsetPolygons, polygonsArea } from '../src/lib/geom/polyoffset';
import { bboxOf } from '../src/lib/geom/vec';
import { buildFigurePdf, colorName, guideDrawable, pieceDrawables } from '../src/features/figures/export';

/* Figuras de tela por capas: biblioteca, motor de profundidad y PDF. */

const fig = (id: string) => findFigure(id)!;
const build = (id: string, patch: Partial<ReturnType<typeof defaultFigureOptions>> = {}) => buildFigure(fig(id), { ...defaultFigureOptions(fig(id)), ...patch });
const area = polygonsArea;

describe('biblioteca de figuras de tela', () => {
  it('tiene más de 150 diseños originales repartidos en todas las categorías', () => {
    expect(FABRIC_FIGURES.length).toBeGreaterThanOrEqual(150);
    expect(new Set(FABRIC_FIGURES.map(f => f.id)).size).toBe(FABRIC_FIGURES.length);
    expect(new Set(FABRIC_FIGURES.map(f => f.name)).size).toBe(FABRIC_FIGURES.length);
    for (const f of FABRIC_FIGURES) {
      expect(f.id, f.id).toMatch(/^[a-z0-9-]+$/);
      expect(f.layers.length, f.id).toBeGreaterThanOrEqual(2);
      expect(f.width, f.id).toBeGreaterThanOrEqual(80);
      for (const l of f.layers) expect(l.color, `${f.id}/${l.name}`).toMatch(/^#[0-9a-f]{6}$/i);
    }
    expect(FIGURE_CATEGORIES.map(c => c.id).sort()).toEqual(Object.keys(FIGURE_CATEGORY_LABEL).sort());
    for (const c of FIGURE_CATEGORIES) expect(c.count, c.id).toBeGreaterThanOrEqual(c.id === 'cuerpo' ? 6 : 8);
  });

  it('incluye las figuras de las referencias: mariposas en capas, hongo de tres piezas y manzanas de vichy y rayas', () => {
    expect(fig('hongo-tres-piezas').layers.slice(0, 3).map(l => l.name)).toEqual(['Pie', 'Láminas', 'Sombrero']);
    expect(fig('mariposa-capas').layers.map(l => l.name)).toContain('Alas de arriba');
    expect(fig('manzana-vichy').layers.find(l => l.name === 'Manzana')!.pattern).toBe('vichy');
    expect(fig('manzana-rayas').layers.find(l => l.name === 'Manzana')!.pattern).toBe('rayas');
  });

  it('busca sin acentos y filtra por categoría', () => {
    const found = (q: string, c: Parameters<typeof figureMatches>[1] = 'todas') => FABRIC_FIGURES.filter(f => figureMatches(f, c, q)).map(f => f.id);
    expect(found('HONGÓ')).toEqual(expect.arrayContaining(['hongo-tres-piezas', 'hongos-trio', 'casa-hongo', 'hongo-psicodelico']));
    expect(found('hongo')).not.toContain('arbol-redondo');
    expect(found('', 'psicodelico').length).toBe(FIGURE_CATEGORIES.find(c => c.id === 'psicodelico')!.count);
    expect(found('mariposa', 'animales')).toEqual(expect.arrayContaining(['mariposa-clasica', 'mariposa-capas']));
  });
});

describe('motor de capas', () => {
  it('construye todas las figuras sin piezas ocultas, sin perder nada visible y sin salirse de la forma', () => {
    for (const def of FABRIC_FIGURES) {
      const f = buildFigure(def, defaultFigureOptions(def));
      expect(f.warnings, def.id).toEqual([]);
      expect(f.width).toBeCloseTo(def.width, 6);
      for (const p of f.pieces) {
        expect(area(p.visible), `${def.id}/${p.name}`).toBeGreaterThan(1);
        expect(area(differencePolygons(p.visible, p.final)), `${def.id}/${p.name} visible`).toBeLessThan(1);
        expect(area(differencePolygons(p.final, p.shape)), `${def.id}/${p.name} fuera`).toBeLessThan(1);
      }
    }
  });

  it('deja una solapa bajo la pieza de encima y recorta lo que queda oculto más allá', () => {
    const f = build('diana', { underlap: 5 }), outer = f.pieces[0], next = f.pieces[1];
    // Ring 1 (radius 90 → 81 mm at 140 mm wide) keeps 5 mm under ring 2 and loses its centre.
    expect(area(intersectPolygons(outer.final, next.shape))).toBeGreaterThan(0);
    const band = intersectPolygons(offsetPolygons(outer.visible, 4.5), outer.shape);
    expect(area(differencePolygons(band, outer.final))).toBeLessThan(2);
    expect(area(outer.final)).toBeLessThan(area(outer.shape) * 0.6);
    const whole = build('diana', { saveFabric: false });
    expect(area(whole.pieces[0].final)).toBeCloseTo(area(whole.pieces[0].shape), 0);
  });

  it('no abre agujeros pequeños bajo los detalles: el blanco del ojo sigue entero bajo la pupila', () => {
    const eye = build('ojo', { width: 170 }), iris = eye.pieces.find(p => p.name === 'Iris claro')!;
    // The pupil core is small: the light iris is cut whole under it (no fiddly hole).
    expect(iris.final.filter(ring => { let s = 0; for (let i = 0; i < ring.length; i++) { const a = ring[i], b = ring[(i + 1) % ring.length]; s += a.x * b.y - b.x * a.y; } return s < 0; })).toHaveLength(0);
  });

  it('calcula la profundidad real: capa 1 sobre la tela base y cada pieza una capa por encima de la que pisa', () => {
    expect(build('diana').levels).toBe(5);
    expect(build('margarita').pieces.map(p => p.level)).toEqual([1, 2, 3]);
    const mushroom = build('hongo-tres-piezas');
    expect(mushroom.pieces.map(p => [p.name, p.level])).toEqual([['Pie', 1], ['Láminas', 2], ['Sombrero', 3], ['Lunares', 4]]);
    expect(mushroom.pieces[0].coveredBy).toEqual([2, 3]);
    expect(mushroom.pieces[3].sitsOn).toEqual([3]);
  });

  it('cambia de tamaño en milímetros reales y suma el margen de doblado solo en esa técnica', () => {
    const small = build('tulipan', { width: 80 }), big = build('tulipan', { width: 320 });
    expect(big.width).toBe(320);
    expect(big.height / small.height).toBeCloseTo(4, 5);
    expect(area(big.pieces[0].shape) / area(small.pieces[0].shape)).toBeCloseTo(16, 1);
    const turned = build('tulipan', { technique: 'doblado' }), raw = build('tulipan');
    for (const [a, b] of turned.pieces.map((p, i) => [p, raw.pieces[i]] as const)) {
      expect(a.allowance).toBe(TURN_ALLOWANCE);
      expect(area(a.cut)).toBeGreaterThan(area(b.cut));
      const bb = bboxOf(a.cut.flat()), fb = bboxOf(a.final.flat());
      expect(fb.minX - bb.minX).toBeCloseTo(TURN_ALLOWANCE, 0);
    }
  });

  it('avisa cuando una pieza queda demasiado fina para cortarla', () => {
    expect(build('girasol', { width: 40 }).warnings.join(' ')).toMatch(/muy finas/);
  });
});

describe('PDF de figuras', () => {
  it('dibuja la guía con todos los números y las piezas en espejo para la termoadhesiva', () => {
    const f = build('mariposa-capas');
    const guide = guideDrawable(f);
    for (const p of f.pieces) expect(guide.labels.map(l => l.text)).toContain(String(p.number));
    const mirrored = pieceDrawables(f), straight = pieceDrawables({ ...f, options: { ...f.options, mirror: false } });
    expect(mirrored.length).toBeGreaterThanOrEqual(f.pieces.length);
    expect(JSON.stringify(mirrored[0].paths[0])).not.toBe(JSON.stringify(straight[0].paths[0]));
    // Two wings of one layer are cut part by part.
    expect(mirrored.some(d => /parte 1 de 2/.test(d.name))).toBe(true);
  });

  it('genera un PDF con portada, guía a tamaño real y piezas', async () => {
    for (const [id, width] of [['hongo-tres-piezas', 140], ['vitral', 300]] as const) {
      const f = build(id, { width });
      const out = await buildFigurePdf(f);
      expect(new TextDecoder().decode(out.bytes.slice(0, 4))).toBe('%PDF');
      expect(out.guidePages).toBeGreaterThanOrEqual(1);
      expect(out.piecePages).toBeGreaterThanOrEqual(1);
      const pdf = await PDFDocument.load(out.bytes);
      expect(pdf.getPageCount()).toBe(out.pageCount);
      expect(out.manifest.pieces.map(p => p.number)).toEqual(f.pieces.map(p => p.number));
    }
  });

  it('nombra los colores de muestra para la lista de telas', () => {
    expect(colorName('#d62828')).toBe('rojo');
    expect(colorName('#f6d55c')).toBe('amarillo');
    expect(colorName('#3d8bd9')).toBe('azul');
    expect(colorName('#ffffff')).toBe('blanco');
    expect(colorName('#5b9a48')).toBe('verde');
  });
});

export type { FigureDef };
