import { describe, expect, it } from 'vitest';
import { PDFDocument } from 'pdf-lib';
import { CUSHION_CARDS, CUSHION_CATEGORIES } from '../src/data/cushions';
import { toyMatches } from '../src/data/toys';
import { getGenerator } from '../src/lib/pattern/generators';
import { CUSHION_GENERATORS } from '../src/lib/pattern/generators/cushions';
import { runLength } from '../src/lib/pattern/generators/toyKit';
import { sewnLength } from '../src/lib/pattern/generators/cushionKit';
import { validatePattern } from '../src/lib/pattern/validate';
import { cutOutline } from '../src/lib/pattern/offset';
import { seamPolygon } from '../src/lib/pattern/outline';
import { bboxOf } from '../src/lib/geom/vec';
import type { Params } from '../src/lib/pattern/generator';
import { TOY_CONTEXT, prepareToy } from '../src/features/toys/prepare';
import { cushionScene } from '../src/features/cushions/CushionArt';
import { buildToyPdf } from '../src/features/toys/export';
import { projectFor } from '../src/features/toys/PlushCatalog';
import { projectorSource } from '../src/lib/projector/source';
import { TOY_CARDS } from '../src/data/toys';

/* Cojines: medidas de las referencias, costuras que coinciden, opciones de
 * vivo, fuelle y cremallera, y patrón listo para imprimir y proyectar. */

const gen = (id: string, p: Params = {}) => { const g = getGenerator(id)!; return g.generate(TOY_CONTEXT, { ...g.defaults(TOY_CONTEXT), ...p }); };
const piece = (r: ReturnType<typeof gen>, id: string) => r.pieces.find(p => p.id === id)!;
const problems = (r: ReturnType<typeof gen>) => [
  ...r.notices.filter(n => n.level === 'error').map(n => n.code),
  ...validatePattern(r, new Map(r.pieces.map(p => [p.id, cutOutline(p)]))).filter(i => i.level === 'error' || i.code === 'costura-no-coincide').map(i => `${i.code}:${i.pieceId ?? ''}`)
];
const box = (p: ReturnType<typeof piece>) => bboxOf(seamPolygon(p));

describe('catálogo de cojines', () => {
  it('tiene 18 cojines de 17 patrones en cinco grupos', () => {
    expect(CUSHION_CARDS).toHaveLength(18);
    expect(new Set(CUSHION_CARDS.map(c => c.id)).size).toBe(18);
    expect(CUSHION_GENERATORS).toHaveLength(17);
    for (const c of CUSHION_CARDS) expect(getGenerator(c.generatorId), c.id).toBeDefined();
    expect(CUSHION_CATEGORIES.every(c => c.count > 0)).toBe(true);
    expect(CUSHION_CARDS.filter(c => toyMatches(c, 'todas', 'mariposa')).map(c => c.id)).toEqual(['mariposa-encaje', 'mariposa-alas']);
  });

  it('cada tarjeta genera sus piezas sin errores y con dibujo', () => {
    for (const c of CUSHION_CARDS) {
      const { built, params } = prepareToy(c);
      expect(built.issues.filter(i => i.level === 'error').map(i => i.message), c.id).toEqual([]);
      expect(built.seamResults.every(s => s.ok), c.id).toBe(true);
      expect(cushionScene(c, built.result, params).length, c.id).toBeGreaterThan(0);
    }
  });
});

describe('patrones de cojines', () => {
  it('validan en todo su rango, con y sin vivo, fuelle y cremallera', () => {
    const sizes: Record<string, [string, number[]]> = {
      'cojin-pino': ['alto', [250, 490, 900]], 'cojin-hipocampo': ['alto', [450, 800, 1100]], 'cojin-lactancia': ['ancho', [600, 700, 900]], 'puf-conejo': ['largo', [400, 600, 1000]],
      'puf-pera-conejo': ['alto', [340, 700, 1000]], 'cojin-sillon': ['lado', [250, 300, 700]], 'cojin-pato': ['alto', [250, 400, 700]], 'cojin-arbol': ['alto', [250, 350, 600]],
      'cojin-estrella': ['alto', [300, 500, 700]], 'cojin-conejo-redondo': ['diametro', [250, 350, 550]], 'cojin-mariposa-volante': ['ancho', [400, 600, 900]], 'cojin-abeja': ['alto', [320, 450, 700]],
      'cojin-manzana': ['ancho', [250, 400, 700]], 'cojin-nube': ['ancho', [250, 550, 800]], 'cojin-hongo': ['alto', [300, 450, 700]], 'cojin-bellota': ['alto', [280, 406, 650]], 'cojin-mariposa-alas': ['ancho', [380, 520, 800]]
    };
    for (const [id, [key, values]] of Object.entries(sizes)) for (const v of values) for (const o of [{}, { vivo: 'si', fuelle: 60, cierre: 'cremallera', margen: 15 }, { margen: 6 }] as Params[])
      expect(problems(gen(id, { [key]: v, ...o })), `${id}/${v}/${JSON.stringify(o)}`).toEqual([]);
    for (const forma of ['grande', 'mediana', 'pequena']) expect(problems(gen('cojin-nube', { forma, ancho: 300 })), forma).toEqual([]);
    for (const franjas of [2, 3, 6]) expect(problems(gen('cojin-abeja', { franjas })), `abeja ${franjas}`).toEqual([]);
    expect(problems(gen('cojin-conejo-redondo', { forma: 'bola' }))).toEqual([]);
    expect(problems(gen('cojin-estrella', { extremidades: 'no', alto: 180 }))).toEqual([]);
    expect(gen('cojin-lactancia', { brazo: 400 }).notices[0].code).toBe('lactancia-medidas');
  });

  it('respeta las medidas de las referencias', () => {
    // Pino: 49 cm al doblez, pisos de 26, 34 y 42 cm, tronco de 7 cm.
    const pine = piece(gen('cojin-pino'), 'arbol'), pb = box(pine);
    expect(pb.maxY - pb.minY).toBeCloseTo(490, 0);
    expect(2 * pb.maxX).toBeCloseTo(420, 0);
    expect(pine.cut.onFold).toBe(true);
    expect(2 * runLength(pine, 'base')).toBeCloseTo(70, 1);
    // Lactancia: 70 × 52 cm, brazo de 22 cm.
    const u = box(piece(gen('cojin-lactancia'), 'cojin'));
    expect(u.maxX - u.minX).toBeCloseTo(700, 0);
    expect(u.maxY - u.minY).toBeCloseTo(520, 0);
    expect(runLength(piece(gen('cojin-lactancia'), 'cojin'), 'extremo')).toBeCloseTo(2 * 220, 1);
    expect(gen('cojin-lactancia', { ancho: 500, brazo: 150 }).notices.some(n => n.level === 'error')).toBe(false);
    // Puf conejo: envolvente = arco del testero (≈ 83 cm para 40 × 30).
    const pouf = gen('puf-conejo');
    expect(runLength(piece(pouf, 'testero'), 'arco')).toBeCloseTo(200 + Math.PI * 200, -1);
    expect(runLength(piece(pouf, 'envolvente'), 'arco')).toBeCloseTo(runLength(piece(pouf, 'testero'), 'arco'), 3);
    // Sillón: triángulo de 30 × 15 con diagonal de 33,5 cm.
    const arm = piece(gen('cojin-sillon'), 'brazo');
    expect(runLength(arm, 'diagonal')).toBeCloseTo(335.4, 0);
    expect(piece(gen('cojin-sillon'), 'cuadrado').cut.qty).toBe(4);
    // Estrella: 50 cm de alto.
    const st = box(piece(gen('cojin-estrella'), 'estrella'));
    expect(st.maxY - st.minY).toBeCloseTo(500, 0);
  });

  it('las costuras que se unen miden lo mismo', () => {
    const bean = gen('puf-pera-conejo');
    expect(runLength(piece(bean, 'gota'), 'lado')).toBeCloseTo(runLength(piece(bean, 'banda'), 'lado'), 1);
    const tree = gen('cojin-arbol');
    expect(runLength(piece(tree, 'estrella'), 'union')).toBeCloseTo(runLength(piece(tree, 'arbol'), 'estrella'), 3);
    expect(runLength(piece(tree, 'pata'), 'suela')).toBeCloseTo(runLength(piece(tree, 'suela'), 'contorno'), 3);
    const mush = gen('cojin-hongo');
    expect(runLength(piece(mush, 'sombrero'), 'union')).toBeCloseTo(runLength(piece(mush, 'pie'), 'union'), 3);
    const acorn = gen('cojin-bellota');
    expect(runLength(piece(acorn, 'capucha'), 'union')).toBeCloseTo(runLength(piece(acorn, 'fruto'), 'union'), 3);
    const bee = gen('cojin-abeja', { franjas: 4 });
    for (let i = 1; i < 4; i++) expect(runLength(piece(bee, `franja-${i}`), 'abajo'), `franja ${i}`).toBeCloseTo(runLength(piece(bee, `franja-${i + 1}`), 'arriba'), 3);
    expect(runLength(piece(bee, 'cabeza'), 'abajo')).toBeCloseTo(runLength(piece(bee, 'franja-1'), 'arriba'), 3);
    const star = gen('cojin-estrella');
    expect(runLength(piece(star, 'pierna'), 'tobillo')).toBeCloseTo(runLength(piece(star, 'zapato'), 'tobillo'), 3);
  });

  it('vivo, fuelle, volante y cremallera se calculan con el contorno', () => {
    const r = gen('cojin-manzana', { vivo: 'si', fuelle: 80, cierre: 'cremallera' }), face = piece(r, 'manzana'), L = sewnLength(face);
    const vivo = piece(r, 'vivo'), fuelle = piece(r, 'fuelle');
    expect(runLength(vivo, 'canto') * vivo.cut.qty).toBeCloseTo(L, 1);
    expect(runLength(fuelle, 'canto') * fuelle.cut.qty).toBeCloseTo(L, 1);
    expect(face.notches.some(n => n.id === 'abertura-a' && /Cremallera/.test(n.label ?? ''))).toBe(true);
    expect(r.materials.some(m => m.id === 'cremallera')).toBe(true);
    const pine = gen('cojin-pino', { vivo: 'si' }), pv = piece(pine, 'vivo');
    expect(runLength(pv, 'canto') * pv.cut.qty).toBeCloseTo(sewnLength(piece(pine, 'arbol')), 1);
    const bf = gen('cojin-mariposa-volante', { volante: 'tela' }), vol = piece(bf, 'volante');
    expect(runLength(vol, 'canto') * vol.cut.qty / sewnLength(piece(bf, 'mariposa'))).toBeCloseTo(2, 2);
    expect(JSON.stringify(gen('cojin-mariposa-volante').materials)).toMatch(/Puntilla/);
  });

  it('seguridad: aviso de cuna en todos y de bolitas en los pufs', () => {
    for (const g of CUSHION_GENERATORS) expect(g.generate(TOY_CONTEXT, g.defaults(TOY_CONTEXT)).notices.some(n => n.code === 'cojin-seguridad'), g.id).toBe(true);
    for (const id of ['puf-conejo', 'puf-pera-conejo']) expect(gen(id).notices.some(n => n.code === 'cojin-bolitas'), id).toBe(true);
    expect(gen('cojin-abeja', { antenas: 'bordadas' }).pieces.some(p => p.id === 'antena')).toBe(false);
  });

  it('todo se puede proyectar: juguetes y cojines crean un proyecto con piezas 1:1', () => {
    for (const card of [CUSHION_CARDS.find(c => c.id === 'pino')!, CUSHION_CARDS.find(c => c.id === 'puf-conejo')!, TOY_CARDS.find(c => c.id === 'oso-cuadros')!]) {
      const { params, built } = prepareToy(card);
      const project = projectFor(card, params);
      const source = projectorSource(project, { profiles: {}, fabrics: {}, materials: {}, unit: 'cm', mode: 'complete' });
      expect(source.blockers, card.id).toEqual([]);
      expect(source.groups[0].drawables.length, card.id).toBe(built.pieces.length);
    }
  });

  it('genera el PDF a tamaño real con las costuras comprobadas', async () => {
    const out = await buildToyPdf(CUSHION_CARDS.find(c => c.id === 'lactancia')!, {});
    expect(new TextDecoder().decode(out.bytes.slice(0, 4))).toBe('%PDF');
    expect((await PDFDocument.load(out.bytes)).getPageCount()).toBe(out.pageCount);
    expect(out.manifest.seams.every(s => s.ok)).toBe(true);
  });
});
