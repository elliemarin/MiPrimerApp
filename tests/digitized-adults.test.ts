import { describe, expect, it } from 'vitest';
import { CATALOG, findModel } from '../src/data/catalog';
import { DIGITIZED_ADULT_CATALOG } from '../src/data/digitizedAdultCatalog';
import { catalogImageCaption, catalogImageFor } from '../src/data/catalogImages';
import { getGenerator } from '../src/lib/pattern/generators';
import type { GeneratorContext } from '../src/lib/pattern/generator';
import { cutOutline } from '../src/lib/pattern/offset';
import { validatePattern } from '../src/lib/pattern/validate';
import { edgesLength } from '../src/lib/pattern/outline';
import { SIZE_TABLES, findSize, type PersonKind } from '../src/lib/sizes/tables';

/* Tercer y cuarto lote digitalizados: cada tarjeta genera un patrón válido en
 * todas las tallas de sus destinatarios, con las comprobaciones propias de
 * cada construcción. */

const KIDS: PersonKind[] = ['bebe', 'toddler', 'infantil'];
const knit = (m: { fabrics: string[] }) => !m.fabrics.includes('plano');
const ctx = (values: GeneratorContext['body'], kind: PersonKind, punto = false): GeneratorContext => ({ body: values, kind, fabric: punto ? 'punto' : 'plano', stretch: punto ? 30 : 0, fit: 'regular' });
const run = (generatorId: string, c: GeneratorContext, params: Record<string, unknown> = {}) => {
  const gen = getGenerator(generatorId)!;
  return gen.generate(c, { ...gen.defaults(c), ...params } as never);
};
const errors = (r: ReturnType<typeof run>) => [
  ...r.notices.filter(n => n.level === 'error').map(n => n.code),
  ...(r.pieces.length ? validatePattern(r, new Map(r.pieces.map(p => [p.id, cutOutline(p)]))).filter(i => i.level === 'error' || i.code === 'costura-no-coincide').map(i => `${i.code}:${i.pieceId ?? ''}`) : ['sin-piezas'])
];
const woman = () => ctx(findSize('ref-mujer-busto', 'M88')!.values, 'mujer');
const man = () => ctx(findSize('ref-hombre-pecho', 'H96')!.values, 'hombre');
const UPGRADED = ['pantalon-palazzo', 'pantalon-pinzas', 'cazadora-mezclilla', 'cazadora-denim-corta', 'chaqueta-safari'];

describe('diseños de adulto digitalizados (tercer y cuarto lote)', () => {
  const models = [...DIGITIZED_ADULT_CATALOG.map(m => findModel(m.id)!), ...UPGRADED.map(id => findModel(id)!)];

  it('añade 15 tarjetas y convierte 5 inspiraciones en patrones experimentales', () => {
    expect(DIGITIZED_ADULT_CATALOG).toHaveLength(15);
    for (const m of models) {
      expect(m.status, m.id).toBe('experimental');
      expect(m.generatorId, m.id).toBeTruthy();
      expect(getGenerator(m.generatorId!), m.id).toBeDefined();
    }
  });

  it('genera cada tarjeta sin errores en todas las tallas de sus destinatarios', () => {
    for (const m of models) {
      const kinds = new Set(m.recipients.flatMap(r => r === 'unisex' ? ['mujer', 'hombre'] : [r]));
      for (const table of SIZE_TABLES) for (const row of table.rows) {
        if (!kinds.has(row.kind)) continue;
        const r = run(m.generatorId!, ctx(row.values, row.kind, knit(m)), m.params ?? {});
        expect(errors(r), `${m.id} ${row.code}`).toEqual([]);
      }
    }
  });

  it('muestra cada diseño nuevo con su propia imagen y dice si es dibujo o IA', () => {
    for (const m of models) {
      const image = catalogImageFor(m)!;
      expect(image, m.id).toBeDefined();
      if (image.sheet === 'lote-adultos-01') expect(catalogImageCaption(image)).toBe('Ilustración dibujada a partir del patrón real.');
    }
    const cells = ['pantalon-volante', 'chaqueta-ranglan', 'sudadera-bloques', 'buzo-murcielago', 'culotte-encaje', 'palazzo-botones-laterales', 'sudadera-media-cremallera-lisa', 'chaqueta-campo']
      .map(id => { const s = catalogImageFor(findModel(id)!)!; return `${s.sheet}/${s.cell}`; });
    expect(new Set(cells).size).toBe(cells.length);
  });

  it('pantalón elástico: pretina con abertura lateral, volante, alforzas y cordón solo en adulto', () => {
    const fitted = run('pantalon-cintura-elastica', woman(), { estilo: 'ancho', cintura: 'pretina', amplitudBajo: 1.5, bolsillos: 'costado' });
    expect(fitted.pieces.map(p => p.id)).toEqual(expect.arrayContaining(['pretina', 'vista-abertura', 'tapeta-abertura', 'bolsillo']));
    expect(fitted.pieces.find(p => p.id === 'pretina')!.marks.some(mk => mk.kind === 'ojal')).toBe(true);
    const ruffle = run('pantalon-cintura-elastica', woman(), { estilo: 'ancho', volante: 'si', alforzas: 3 });
    expect(ruffle.pieces.some(p => p.id === 'volante')).toBe(true);
    expect(ruffle.seams.find(s => s.id === 'volante')!.kind).toBe('fruncido');
    expect(ruffle.pieces.find(p => p.id === 'delantero')!.lines.filter(l => l.kind === 'doblez').length).toBeGreaterThanOrEqual(3);
    const child = run('pantalon-cintura-elastica', ctx(findSize('ref-infantil-estatura', 'E116')!.values, 'infantil'), { estilo: 'ancho', cordon: 'si' });
    expect(child.notices.some(n => n.code === 'sin-cordon-infantil')).toBe(true);
  });

  it('pantalón de mezclilla: pinzas delanteras con la pretina embebida', () => {
    const r = run('pantalon-mezclilla', man(), { silueta: 'ancho', cintura: 'pretina', bolsillos: 'frontales', pinzas: 'dos', tiro: 'alto' });
    const front = r.pieces.find(p => p.id === 'delantero')!;
    expect(front.lines.filter(l => /^pinza-\d$/.test(l.id))).toHaveLength(2);
    expect(r.seams.find(s => s.id === 'pretina')!.kind).toBe('embebido');
    expect(errors(r)).toEqual([]);
  });

  it('sobrecamisa con cuello de tira y bolsillos grandes con cartera', () => {
    const r = run('oversize-hombro-caido', man(), { prenda: 'sobrecamisa', cuelloTipo: 'tira', bolsillos: 'grandes' });
    const ids = r.pieces.map(p => p.id);
    expect(ids).toEqual(expect.arrayContaining(['bolsillo-grande', 'cartera']));
    expect(ids).not.toContain('cuello');
  });

  it('chaqueta ranglan: las mangas delantera y trasera igualan bajo brazo y ranglan', () => {
    for (const c of [woman(), man(), ctx(findSize('ref-infantil-estatura', 'E92')!.values, 'toddler')]) {
      const r = run('chaqueta-ranglan', c);
      expect(errors(r)).toEqual([]);
      const f = r.pieces.find(p => p.id === 'manga-delantera')!, b = r.pieces.find(p => p.id === 'manga-trasera')!;
      expect(Math.abs(edgesLength(f, ['bajo-manga']) - edgesLength(b, ['bajo-manga']))).toBeLessThan(1.5);
    }
  });

  it('sudadera de media cremallera y buzo murciélago pasan la cabeza; el buzo pide punto', () => {
    expect(run('sudadera-media-cremallera', ctx(findSize('ref-infantil-estatura', 'E92')!.values, 'toddler', true), { bloques: 'si' }).notices.find(n => n.code === 'paso-cabeza')!.level).toBe('ok');
    expect(run('buzo-murcielago', { ...woman(), fabric: 'punto', stretch: 30 }).notices.find(n => n.code === 'paso-cabeza')!.level).toBe('ok');
    expect(run('buzo-murcielago', woman()).notices[0].code).toBe('buzo-murcielago-tela');
    const kid = run('buzo-murcielago', ctx(findSize('ref-infantil-estatura', 'E116')!.values, 'infantil', true));
    expect(JSON.stringify(kid.pieces)).not.toMatch(/ojal/);
  });

  it('cazadora de mezclilla: canesús, paneles y pretina que cierran sobre el bajo', () => {
    const r = run('cazadora-mezclilla', man(), { bolsillos: 'pecho-vivo' });
    expect(errors(r)).toEqual([]);
    expect(r.pieces.map(p => p.id)).toEqual(expect.arrayContaining(['canesu-delantero', 'delantero-central', 'delantero-lateral', 'canesu-espalda', 'espalda-central', 'espalda-lateral', 'pretina', 'puno', 'cuello', 'vista', 'bolsillo-pecho', 'cartera-pecho', 'vivo', 'bolsa']));
    const band = r.pieces.find(p => p.id === 'pretina')!, hems = ['delantero-central', 'delantero-lateral', 'espalda-central', 'espalda-lateral'].reduce((t, id) => t + 2 * edgesLength(r.pieces.find(p => p.id === id)!, ['bajo']), 0);
    expect(edgesLength(band, ['union-1'])).toBeCloseTo(hems, 1);
    expect(run('cazadora-mezclilla', ctx(findSize('ref-bebe-meses', 'B6-9')!.values, 'bebe')).notices[0].code).toBe('cazadora-mezclilla-talla');
  });

  it('chaqueta de campo: cremallera con tapeta o botones; safari con cuello camisero', () => {
    const zip = run('chaqueta-campo', man(), { cierre: 'cremallera', cuelloTipo: 'alto', bolsillos: 'cuatro' });
    const buttons = run('chaqueta-campo', man(), { cierre: 'botones', cuelloTipo: 'camisero', bolsillos: 'cuatro' });
    expect(errors(zip)).toEqual([]); expect(errors(buttons)).toEqual([]);
    expect(zip.pieces.some(p => p.id === 'tapeta')).toBe(true);
    expect(buttons.pieces.some(p => p.id === 'tapeta')).toBe(false);
    expect(buttons.pieces.find(p => p.id === 'delantero')!.marks.filter(mk => mk.kind === 'boton')).toHaveLength(5);
    expect(buttons.pieces.map(p => p.id)).toEqual(expect.arrayContaining(['bolsillo-pecho', 'cartera-pecho', 'bolsillo-bajo', 'cartera-bajo', 'pestana-manga']));
  });

  it('culotte de encaje: una pieza por lado, entrepierna igual y solo en punto elástico de mujer', () => {
    const lace = { ...woman(), fabric: 'punto' as const, stretch: 30 };
    const r = run('culotte-encaje', lace);
    expect(errors(r)).toEqual([]);
    const pc = r.pieces.find(p => p.id === 'culotte')!;
    expect(pc.cut.qty).toBe(2);
    expect(edgesLength(pc, ['entrepierna-delantera'])).toBeCloseTo(edgesLength(pc, ['entrepierna-trasera']), 3);
    expect(r.notices.find(n => n.code === 'culotte-pierna')!.level).toBe('ok');
    expect(run('culotte-encaje', woman()).notices[0].code).toBe('culotte-elasticidad');
    expect(run('culotte-encaje', { ...man(), fabric: 'punto', stretch: 30 }).notices[0].code).toBe('culotte-talla');
    expect(run('culotte-encaje', lace, { reduccion: 28 }).notices[0].code).toBe('culotte-reduccion');
  });

  it('los niños no reciben cordones ni lencería', () => {
    for (const m of CATALOG.filter(x => x.generatorId === 'culotte-encaje')) expect(m.recipients).toEqual(['mujer']);
    for (const m of models.filter(x => x.recipients.some(r => KIDS.includes(r as PersonKind)))) {
      const r = run(m.generatorId!, ctx(findSize('ref-infantil-estatura', 'E116')!.values, 'infantil', knit(m)), m.params ?? {});
      expect(r.materials.some(x => /cord[oó]n/i.test(x.label) && !/adulto/i.test(x.label)), m.id).toBe(false);
    }
  });
});
