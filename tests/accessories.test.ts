import { describe, expect, it } from 'vitest';
import { CATALOG } from '../src/data/catalog';
import { buildPattern, newPatternState } from '../src/lib/pattern/engine';
import { edgeLength } from '../src/lib/pattern/outline';
import { getGenerator } from '../src/lib/pattern/generators';
import { SIZE_TABLES, findSize, rowsForKinds } from '../src/lib/sizes/tables';
import { defaultProfileChoice, resolveProfile } from '../src/features/projects/ProfilePicker';
import { profileFromSize } from '../src/store/profiles';
import { projectFromModel, currentValues } from '../src/store/projects';
import { matches } from '../src/features/library/LibraryPage';
import { tablesFor } from '../src/features/library/ModelDetail';
import { buildFlat } from '../src/data/flats';

const context = { kind: 'mujer' as const, fabric: 'plano' as const, stretch: 0, fit: 'regular' as const };
const ids = ['funda-bebida', 'cojin-sobre', 'dona-cabello', 'bandana-reversible', 'textil-doble-cara'];
function build(id: string, params: Record<string, number> = {}) {
  const state = newPatternState(id, {}, context);
  state.params = params;
  return buildPattern(state);
}

describe('accesorios paramétricos', () => {
  for (const id of ids) {
    for (const scale of [0.7, 1, 1.8]) {
      it(`${id} a escala ${scale}: contornos, costuras y medidas válidos`, () => {
        const gen = getGenerator(id)!;
        const defaults = gen.defaults({ ...context, body: {} });
        const params = Object.fromEntries(Object.entries(defaults).map(([k, v]) => [k, typeof v === 'number' && !['frunce', 'margen'].includes(k) ? v * scale : v])) as Record<string, number>;
        const result = build(id, params);
        expect(result.issues.filter(i => i.level === 'error'), JSON.stringify(result.issues)).toEqual([]);
        expect(result.pieces.length).toBeGreaterThan(0);
        expect(result.cuts.size).toBe(result.pieces.length);
        for (const seam of result.seamResults) expect(seam.ok, seam.relation.label).toBe(true);
        for (const check of result.result!.checks) expect(Math.abs(check.measured - check.target), check.label).toBeLessThanOrEqual(check.tolerance);
        for (const step of result.result!.steps) for (const id of step.pieces) expect(result.pieces.some(p => p.id === id)).toBe(true);
        expect(gen.status).toBe('experimental');
      });
    }
  }
  it('traslape y holgura de funda se aplican una vez, sin márgenes en la medida útil', () => {
    const a = build('funda-bebida', { contorno: 220, traslape: 30, holgura: 6, margen: 5 });
    const b = build('funda-bebida', { contorno: 220, traslape: 30, holgura: 6, margen: 15 });
    expect(edgeLength(a.pieces[0], a.pieces[0].edges[0])).toBe(256);
    expect(a.result!.checks[0].measured).toBe(226);
    expect(b.result!.checks[0].measured).toBe(226);
  });
  it('cojín descuenta el traslape de las dos espaldas y separa sus dobladillos', () => {
    const p = build('cojin-sobre', { ancho: 500, alto: 400, traslape: 100, dobladillo: 25 });
    expect(p.pieces[1].nodes[2].y).toBe(250);
    expect(p.pieces[2].nodes[2].y).toBe(250);
    expect(p.result!.checks.find(c => c.key === 'alto')!.measured).toBe(400);
    expect(p.pieces[1].edges[2].allowance).toBe(25);
    expect(p.pieces[2].edges[0].finish).toBe('dobladillo');
  });
  it('avisa si el traslape cubre toda la abertura del cojín', () => {
    expect(build('cojin-sobre', { alto: 150, traslape: 150 }).issues.some(i => i.code === 'traslape-cojin' && i.level === 'error')).toBe(true);
  });
  it('todos los modelos nuevos usan generadores existentes y dibujos con zonas', () => {
    const unique = new Set(CATALOG.map(m => m.id));
    expect(unique.size).toBe(CATALOG.length);
    for (const model of CATALOG) {
      if (model.generatorId) expect(getGenerator(model.generatorId), model.id).toBeDefined();
      const flat = buildFlat(model.id, model.flat);
      expect(flat.views[0].zones.length, model.id).toBeGreaterThan(0);
      expect(flat.views[0].width, model.id).toBeGreaterThan(0);
    }
  });
});

describe('tallas por meses y destinatario', () => {
  it('ofrece 0–3 y 0–6 con medidas explícitas e independientes', () => {
    const a = findSize('ref-bebe-meses', 'B0-3')!, b = findSize('ref-bebe-meses', 'B0-6')!;
    expect(a.values.estatura).toBe(620);
    expect(b.values.estatura).toBe(680);
    expect(a.kind).toBe('bebe');
    expect(a.values).not.toBe(findSize('ref-infantil-estatura', 'E62')!.values);
  });
  it('filtra las filas infantiles además de la tabla', () => {
    const table = SIZE_TABLES.find(t => t.id === 'ref-infantil-estatura')!;
    expect(rowsForKinds(table, ['bebe']).every(r => r.kind === 'bebe')).toBe(true);
    expect(rowsForKinds(table, ['infantil']).some(r => r.kind === 'bebe')).toBe(false);
  });
  it('una selección de bebé no toma por defecto un perfil adulto y llega al patrón', () => {
    const adult = profileFromSize(SIZE_TABLES.find(t => t.id === 'ref-mujer-busto')!, findSize('ref-mujer-busto', 'M92')!);
    const choice = defaultProfileChoice(['bebe'], { [adult.id]: adult }, true, 'B0-6');
    expect(choice).toEqual({ type: 'tabla', tableId: 'ref-bebe-meses', code: 'B0-6' });
    let saved = false;
    const baby = resolveProfile(choice, () => { saved = true; }, { [adult.id]: adult })!;
    expect(saved).toBe(true);
    const project = projectFromModel(CATALOG.find(m => m.id === 'pantalon-recto-elastico')!, baby);
    expect(project.pattern!.context.kind).toBe('bebe');
    expect(project.pattern!.body).toEqual(currentValues(baby));
    expect(project.pattern!.body.estatura).toBe(680);
    expect(buildPattern(project.pattern!).issues.filter(i => i.level === 'error')).toEqual([]);
  });
  it('mujer excluye prendas exclusivas de bebé y hombre excluye la blusa', () => {
    const base = { q: '', recipient: 'mujer' as const, type: 'todos' as const, onlyAvailable: false, difficulty: 0, fabric: 'todos' as const, stretch: 'todos' as const, fit: 'todos' as const, technique: 'todas' as const, size: 'todas' as const };
    expect(matches(CATALOG.find(m => m.id === 'body-bebe')!, base)).toBe(false);
    expect(matches(CATALOG.find(m => m.id === 'blusa-v')!, base)).toBe(true);
    expect(matches(CATALOG.find(m => m.id === 'blusa-v')!, { ...base, recipient: 'hombre' })).toBe(false);
    const tables = tablesFor(CATALOG.find(m => m.id === 'pantalon-recto-elastico')!, 'bebe');
    expect(tables.flatMap(t => t.rows).every(r => r.kind === 'bebe')).toBe(true);
  });
});
