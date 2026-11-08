import { describe, expect, it } from 'vitest';
import { PDFDocument } from 'pdf-lib';
import { ORGANIZER_CARDS, ORGANIZER_CATEGORIES } from '../src/data/organizers';
import { toyMatches } from '../src/data/toys';
import { getGenerator } from '../src/lib/pattern/generators';
import { ORGANIZER_GENERATORS, ORGANIZER_IDS, decorPolys, organizerLayout } from '../src/lib/pattern/generators/organizers';
import { runLength } from '../src/lib/pattern/generators/toyKit';
import { validatePattern } from '../src/lib/pattern/validate';
import { cutOutline } from '../src/lib/pattern/offset';
import { seamPolygon } from '../src/lib/pattern/outline';
import { bboxOf, type Pt } from '../src/lib/geom/vec';
import type { Params } from '../src/lib/pattern/generator';
import { TOY_CONTEXT, prepareToy } from '../src/features/toys/prepare';
import { organizerScene } from '../src/features/organizers/OrganizerArt';
import { buildToyPdf } from '../src/features/toys/export';
import { projectFor } from '../src/features/toys/PlushCatalog';
import { projectorSource } from '../src/lib/projector/source';

/* Bolsilleros: siluetas que validan en todo su rango, bolsillos y apliques
 * dentro del cuerpo y marcados en su sitio, y patrón listo para imprimir y
 * proyectar. */

const gen = (id: string, p: Params = {}) => { const g = getGenerator(id)!; return g.generate(TOY_CONTEXT, { ...g.defaults(TOY_CONTEXT), ...p }); };
const piece = (r: ReturnType<typeof gen>, id: string) => r.pieces.find(p => p.id === id)!;
const problems = (r: ReturnType<typeof gen>) => [
  ...r.notices.filter(n => n.level === 'error').map(n => n.code),
  ...validatePattern(r, new Map(r.pieces.map(p => [p.id, cutOutline(p)]))).filter(i => i.level === 'error' || i.code === 'costura-no-coincide').map(i => `${i.code}:${i.pieceId ?? ''}`)
];
const inside = (p: Pt, poly: Pt[]) => { let c = false; for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) { const a = poly[i], b = poly[j]; if ((a.y > p.y) !== (b.y > p.y) && p.x < ((b.x - a.x) * (p.y - a.y)) / (b.y - a.y) + a.x) c = !c; } return c; };
const segDist = (p: Pt, a: Pt, b: Pt) => { const dx = b.x - a.x, dy = b.y - a.y, t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / (dx * dx + dy * dy || 1))); return Math.hypot(p.x - a.x - t * dx, p.y - a.y - t * dy); };
/** Signed distance to a polygon's outline: positive inside. */
const depth = (p: Pt, poly: Pt[]) => (inside(p, poly) ? 1 : -1) * Math.min(...poly.map((a, i) => segDist(p, a, poly[(i + 1) % poly.length])));
const defaults = (id: string) => getGenerator(id)!.defaults(TOY_CONTEXT);
const leaves = (id: string): Params[] => (id === 'bolsillero-trebol' ? [{ hojas: 3 }, { hojas: 4 }, { hojas: 5 }] : [{}]);

describe('catálogo de bolsilleros', () => {
  it('tiene 9 bolsilleros de 9 patrones en cuatro grupos', () => {
    expect(ORGANIZER_CARDS).toHaveLength(9);
    expect(ORGANIZER_GENERATORS).toHaveLength(9);
    expect(new Set(ORGANIZER_CARDS.map(c => c.generatorId))).toEqual(new Set(ORGANIZER_IDS));
    expect(ORGANIZER_CATEGORIES).toHaveLength(4);
    expect(ORGANIZER_CATEGORIES.every(c => c.count > 0)).toBe(true);
    // Se encuentran por sus nombres en otros idiomas.
    for (const q of ['utensilo', 'porte-objets', 'wall pocket', 'organizador de pared']) expect(ORGANIZER_CARDS.filter(c => toyMatches(c, 'todas', q))).toHaveLength(9);
    expect(ORGANIZER_CARDS.filter(c => toyMatches(c, 'todas', 'zorro')).map(c => c.id)).toEqual(['zorro', 'portalapices']);
  });

  it('cada tarjeta genera sus piezas sin errores y con dibujo', () => {
    for (const c of ORGANIZER_CARDS) {
      const { built, params } = prepareToy(c);
      expect(built.issues.filter(i => i.level === 'error').map(i => i.message), c.id).toEqual([]);
      expect(built.seamResults.every(s => s.ok), c.id).toBe(true);
      expect(organizerScene(c, built.result, params).length, c.id).toBeGreaterThan(3);
      expect(organizerScene(c, built.result, { ...params, acabado: 'ribete' }).length, c.id).toBeGreaterThan(3);
    }
  });
});

describe('patrones de bolsilleros', () => {
  it('validan en todo su rango, volteados o con ribete y con margen de 6 a 15 mm', () => {
    for (const g of ORGANIZER_GENERATORS) {
      const size = g.params[0], d = defaults(g.id);
      for (const v of [size.min!, Number(d[size.key]), size.max!]) for (const acabado of ['volteado', 'ribete']) for (const margen of [6, 15])
        for (const extra of leaves(g.id)) {
          const r = gen(g.id, { [size.key]: v, acabado, margen, ...extra });
          expect(problems(r), `${g.id}/${v}/${acabado}/${margen}/${JSON.stringify(extra)}`).toEqual([]);
          const check = r.checks[0];
          expect(Math.abs(check.measured - check.target), `${g.id}/${v}`).toBeLessThanOrEqual(check.tolerance ?? 0);
        }
      expect(gen(g.id, { [size.key]: size.max! + 10 }).notices[0].code).toBe('bolsillero-medidas');
    }
    expect(gen('bolsillero-trebol', { hojas: 6 }).notices[0].code).toBe('bolsillero-medidas');
  });

  it('bolsillos, apliques y bordados caen dentro del cuerpo y se marcan en el delantero', () => {
    for (const id of ORGANIZER_IDS) for (const extra of leaves(id)) {
      const p = { ...defaults(id), ...extra }, { layout: L, k } = organizerLayout(id, p), body = piece(gen(id, extra), 'cuerpo');
      for (const pk of L.pockets) {
        // A pocket either stays clear of the seam or follows the outline and is caught in it.
        const d = Math.min(...pk.place.map(q => depth(q, L.body)));
        expect(d > 5 || Math.abs(d) < 0.5, `${id}/${pk.id} ${d}`).toBe(true);
        expect(body.lines.some(l => l.kind === 'colocacion' && l.id.startsWith(`bolsillo-${pk.id}`)), `${id}/${pk.id}`).toBe(true);
      }
      for (const dc of L.decor) for (const poly of decorPolys(dc)) expect(Math.min(...poly.map(q => depth(q, L.body))), `${id}/${dc.id}`).toBeGreaterThan(4 * k);
      for (const e of L.emb) for (const [x, y] of e.pts) expect(depth({ x: x * k, y: y * k }, L.body), `${id} bordado`).toBeGreaterThan(5 * k);
    }
  });

  it('respeta las construcciones de las referencias', () => {
    // Ballena al doblez de la barriga: la franja de 3 bolsillos lleva 3 pliegues encontrados de 4,4 cm.
    const whale = gen('bolsillero-ballena', { ancho: 646 }), wb = piece(whale, 'cuerpo'), strip = piece(whale, 'bolsillos');
    expect(wb.cut.onFold).toBe(true);
    const sb = bboxOf(seamPolygon(strip)), placed = organizerLayout('bolsillero-ballena', { ...defaults('bolsillero-ballena'), ancho: 646 }).layout.pockets[0].place;
    expect(sb.maxX - sb.minX - (Math.max(...placed.map(q => q.x)) - Math.min(...placed.map(q => q.x)))).toBeCloseTo(6 * 22, 0);
    expect(strip.lines.filter(l => l.kind === 'doblez')).toHaveLength(10);
    // Trébol: un bolsillo por hoja y margen de 12 mm por defecto.
    for (const hojas of [3, 4, 5]) expect(gen('bolsillero-trebol', { hojas }).pieces.filter(p => /^bolsillo-\d$/.test(p.id))).toHaveLength(hojas);
    expect(defaults('bolsillero-trebol').margen).toBe(12);
    // Portalápices: los 4 frentes suman el forro y el ancho es el de la franja.
    const fox = gen('portalapices-zorro');
    expect(fox.seams.find(s => s.id === 'franja')).toBeDefined();
    expect(fox.pieces.filter(p => /^bolsillo-\d$/.test(p.id))).toHaveLength(4);
    expect(fox.checks[0].measured).toBeCloseTo(380, 0);
    expect(piece(fox, 'jareta')).toBeDefined();
    // Flor: 8 pétalos (16 cortes) y 6 bolsillos con guata.
    const flower = gen('bolsillero-flor');
    expect(piece(flower, 'petalo').cut.qty).toBe(16);
    expect(flower.pieces.filter(p => /^bolsillo-\d-guata$/.test(p.id))).toHaveLength(6);
    // Cuna: tira con broche, sin remaches.
    const crib = gen('organizador-cuna');
    expect(piece(crib, 'tira').marks.filter(m => m.kind === 'boton')).toHaveLength(2);
    expect(crib.materials.some(m => m.id === 'remaches')).toBe(false);
    expect(crib.notices.map(n => n.code)).toContain('cuna');
  });

  it('el ribete mide el contorno y el acabado volteado deja abertura', () => {
    for (const id of ORGANIZER_IDS) {
      const bound = gen(id, { acabado: 'ribete' });
      expect(bound.seams.find(s => s.id === 'ribete'), id).toBeDefined();
      const turned = piece(gen(id), 'cuerpo');
      expect(turned.notches.map(n => n.id), id).toEqual(['abertura-a', 'abertura-b']);
      expect(runLength(turned, 'contorno'), id).toBeGreaterThan(0);
    }
  });

  it('avisos de seguridad en todos', () => {
    for (const id of ORGANIZER_IDS) expect(gen(id).notices.map(n => n.code), id).toContain('bolsillero-seguridad');
  });

  it('se proyectan y salen en PDF a tamaño real', async () => {
    for (const card of ORGANIZER_CARDS) {
      const { params, built } = prepareToy(card);
      const source = projectorSource(projectFor(card, params), { profiles: {}, fabrics: {}, materials: {}, unit: 'cm', mode: 'complete' });
      expect(source.blockers, card.id).toEqual([]);
      expect(source.groups[0].drawables.length, card.id).toBe(built.pieces.length);
    }
    const out = await buildToyPdf(ORGANIZER_CARDS.find(c => c.id === 'ballena')!, {});
    expect(new TextDecoder().decode(out.bytes.slice(0, 4))).toBe('%PDF');
    expect((await PDFDocument.load(out.bytes)).getPageCount()).toBe(out.pageCount);
    expect(out.manifest.seams.every(s => s.ok)).toBe(true);
  });
});
