import { describe, expect, it } from 'vitest';
import { relaxedJacketGenerator, relaxedTopGenerator, ponchoGenerator, pinaforeGenerator } from '../src/lib/pattern/generators/relaxed';
import type { GeneratorContext, Params, PatternGenerator } from '../src/lib/pattern/generator';
import { validatePattern, validatePiece, evaluateSeams } from '../src/lib/pattern/validate';
import { edgeLength } from '../src/lib/pattern/outline';
import { SIZE_TABLES } from '../src/lib/sizes/tables';

const generators = [relaxedJacketGenerator, relaxedTopGenerator, ponchoGenerator, pinaforeGenerator];
const examples: GeneratorContext[] = ['ref-mujer-busto', 'ref-hombre-pecho', 'ref-infantil-estatura'].flatMap(id => {
  const table = SIZE_TABLES.find(t => t.id === id)!;
  const rows = id === 'ref-infantil-estatura' ? table.rows.filter(r => r.kind === 'infantil').filter((_, i) => i % 3 === 0) : [table.rows[0], table.rows[5], table.rows[table.rows.length-1]];
  return rows.map(r => ({ body: r.values, kind: r.kind, fabric: 'plano', stretch: 0, fit: 'holgado' }));
});
function generate(generator: PatternGenerator, context: GeneratorContext, params: Params = {}) { return generator.generate(context, { ...generator.defaults(context), ...params }); }

describe('prendas holgadas originales', () => {
  for (const generator of generators) for (const [i, context] of examples.entries()) it(`${generator.id} cuerpo ${i}: contornos, márgenes, costuras y medidas`, () => {
    const result = generate(generator, context);
    const issues = [...result.pieces.flatMap(p => validatePiece(p)), ...validatePattern(result), ...result.notices];
    expect(issues.filter(i => i.level === 'error'), JSON.stringify(issues)).toEqual([]);
    expect(generator.status).toBe('experimental');
    for (const seam of evaluateSeams(result.pieces,result.seams)) expect(seam.ok, `${seam.relation.label} ${seam.lengthA}/${seam.lengthB}`).toBe(true);
    for (const c of result.checks) expect(Math.abs(c.measured - c.target), c.label).toBeLessThanOrEqual(c.tolerance);
    for (const step of result.steps) for (const id of step.pieces) expect(result.pieces.some(p => p.id === id), id).toBe(true);
    expect(new Set(result.pieces.map(p => p.id)).size).toBe(result.pieces.length);
  });
  it('chaqueta ajusta sisa/manga sin doble holgura y conserva medidas al cambiar márgenes', () => {
    const context = examples[0];
    const a = generate(relaxedJacketGenerator, context, { holgura: 200, margen: 5 });
    const b = generate(relaxedJacketGenerator, context, { holgura: 200, margen: 15 });
    expect(a.checks[0].measured).toBe(Math.max(context.body.pecho!, context.body.cadera!) + 200);
    expect(a.checks).toEqual(b.checks);
    expect(evaluateSeams(a.pieces,a.seams).every(s => s.ok)).toBe(true);
  });
  it('chaqueta sin mangas elimina piezas y costuras y ribetea las sisas sin margen', () => {
    const result = generate(relaxedJacketGenerator, examples[0], { manga: 'no' });
    expect(result.pieces.map(p => p.id)).toEqual(['espalda', 'delantero']);
    expect(result.seams).toHaveLength(2);
    for (const p of result.pieces) for (const e of p.edges.filter(e => e.id.startsWith('sisa'))) expect([e.finish, e.allowance]).toEqual(['sin-margen', 0]);
    expect(validatePattern(result).filter(i => i.level === 'error')).toEqual([]);
  });
  it('ruana usa dos delanteros simétricos y conserva hombros', () => {
    const result = generate(ponchoGenerator, examples[0], { aperturaFrente: 'si' });
    const front = result.pieces.find(p => p.id === 'delantero')!;
    expect(front.cut).toMatchObject({ qty: 2, mirrorPairs: true });
    expect(evaluateSeams(result.pieces,result.seams)[0].ok).toBe(true);
    expect(validatePattern(result).filter(i => i.level === 'error')).toEqual([]);
  });
  it('poncho advierte si la cabeza no puede pasar por un escote pequeño', () => {
    const result = generate(ponchoGenerator, { ...examples[0], body: { ...examples[0].body, cabeza: 700 } }, { escoteAncho: 100, escoteProfundo: 40 });
    expect(result.notices.some(i => i.code === 'poncho-no-pasa-cabeza' && i.level === 'error')).toBe(true);
  });
  it('pulóver tiene delantero completo y abertura de cabeza comprobada', () => {
    const result = generate(relaxedTopGenerator, examples[0]);
    expect(result.pieces.find(p=>p.id==='delantero')!.cut).toMatchObject({qty:1,mirrorPairs:false});
    expect(result.checks.find(c=>c.key==='escote')!.measured).toBeGreaterThan(examples[0].body.cabeza!);
    const bad=generate(relaxedTopGenerator,examples[0],{escoteAncho:80,escoteDelante:40});
    expect(bad.notices.some(i=>i.code==='top-no-pasa-cabeza')).toBe(true);
  });
  it('jumper mide falda completa, peto y tirantes sobre líneas terminadas', () => {
    const context = examples[0];
    const result = generate(pinaforeGenerator, context, { amplitud: 1.6, anchoPeto: 220, anchoTirante: 30 });
    const total = context.body.cadera! * 1.6;
    expect(result.checks[0].target).toBe(total);
    const fronts = result.pieces.filter(p => p.id.startsWith('falda-'));
    expect(fronts.reduce((sum,p)=>sum+edgeLength(p,p.edges[0]),0)).toBe(total);
    expect(result.pieces.find(p=>p.id==='tirante')!.nodes[1].x).toBe(60);
  });
});
