import { describe, it, expect } from 'vitest';
import { STREET_STYLES, STREET_STYLE_GENERATORS, generateStreetStyle, isHoodieStyle } from '../src/lib/pattern/generators/streetStyles';
import { SIZE_TABLES } from '../src/lib/sizes/tables';
import { evaluateSeams, validatePattern } from '../src/lib/pattern/validate';
import type { GeneratorContext } from '../src/lib/pattern/generator';
import { buildStreetStyleFlat, STREET_SURFACE_PIECES } from '../src/data/streetStyleFlats';
import { cmdsBBox } from '../src/lib/draw/paths';
import { parseSvgPath } from '../src/lib/draw/svgpath';
import { STREET_STYLE_CATALOG } from '../src/data/streetStyleCatalog';
import { projectFromModel } from '../src/store/projects';
import { profileFromSize } from '../src/store/profiles';
import { prepareSimpleProject } from '../src/features/simple/workflow';
import { buildAssembly, assemblyPoint, inverseAssemblyPoint } from '../src/features/simple/assembled';
import { buildPattern } from '../src/lib/pattern/engine';

const rows = SIZE_TABLES.filter(t => ['ref-mujer-busto', 'ref-hombre-pecho'].includes(t.id)).flatMap(t => t.rows.filter((_, i) => i % 2 === 0));
describe('estilos adultos independientes', () => {
  for (const [style] of STREET_STYLES) for (const row of rows) it(`${style} en ${row.kind} ${row.code}`, () => {
    const ctx: GeneratorContext = { body: row.values, kind: row.kind, fabric: isHoodieStyle(style) ? 'punto' : 'plano', stretch: 20, fit: 'holgado' };
    const r = generateStreetStyle(style, ctx);
    const errors = [...r.notices, ...validatePattern(r)].filter(i => i.level === 'error');
    expect(errors, JSON.stringify(errors)).toEqual([]);
    for (const seam of evaluateSeams(r.pieces, r.seams)) expect(seam.ok, seam.relation.label).toBe(true);
    for (const step of r.steps) for (const id of step.pieces) expect(r.pieces.some(p => p.id === id), `${step.id}/${id}`).toBe(true);
    expect(new Set(r.pieces.map(p => p.id)).size).toBe(r.pieces.length);
    expect(STREET_STYLE_GENERATORS.find(g => g.id === `street-${style}`)?.status).toBe('experimental');
  });

  for (const [style] of STREET_STYLES) it(`${style}: medidas personales, márgenes independientes y dibujo vinculado`, () => {
    const ctx: GeneratorContext = { body: { ...rows[2].values, pecho: 935, cintura: 755, cadera: 1027, estatura: 1685, tiro: 281, entrepierna: 801 }, kind: 'mujer', fabric: isHoodieStyle(style) ? 'punto' : 'plano', stretch: 20, fit: 'holgado' };
    const a = generateStreetStyle(style, ctx, { margen: 6 }), b = generateStreetStyle(style, ctx, { margen: 15 });
    for (const r of [a, b]) expect([...r.notices, ...validatePattern(r)].filter(i => i.level === 'error')).toEqual([]);
    for (const check of a.checks) {
      const other = b.checks.find(c => c.key === check.key)!;
      expect(check.target).toBeCloseTo(other.target, 6);
      expect(check.measured).toBeCloseTo(other.measured, 6);
    }
    // The jeans block shifts its integrated fly-facing seam with allowance to
    // keep the cut-facing width fixed; compare finished sizes, not that fold.
    if (isHoodieStyle(style)) expect(a.pieces.map(p => p.nodes)).toEqual(b.pieces.map(p => p.nodes));
    expect(a.pieces.map(p => p.id)).toEqual(b.pieces.map(p => p.id));
    const flat = buildStreetStyleFlat(`street-${style}`, style);
    expect(flat.views.map(v => v.key)).toEqual(['frente', 'espalda']);
    for (const view of flat.views) for (const zone of view.zones) {
      const binding = STREET_SURFACE_PIECES[`street-${style}`]?.[view.key]?.find(b => b.zoneId === zone.id);
      expect(binding, zone.id).toBeDefined(); expect(a.pieces.some(p => p.id === binding!.pieceId), zone.id).toBe(true);
      const box = cmdsBBox(parseSvgPath(zone.d)); expect(Object.values(box).every(Number.isFinite)).toBe(true);
    }
  });

  it('los 24 estilos cambian geometría o piezas; ninguna tarjeta es solo un nombre o color', () => {
    const ctx: GeneratorContext = { body: rows[2].values, kind: 'mujer', fabric: 'punto', stretch: 20, fit: 'holgado' };
    const signatures = STREET_STYLES.map(([style]) => JSON.stringify(generateStreetStyle(style, ctx).pieces.map(p => ({ nodes: p.nodes.map(n => [n.x, n.y]), cut: p.cut, margins: p.edges.map(e => [e.allowance, e.finish]) }))));
    expect(new Set(signatures).size).toBe(24);
  });

  for (const model of STREET_STYLE_CATALOG) it(`${model.id}: abrir e intervenir conserva los paneles y sus lados`, () => {
    const table = SIZE_TABLES.find(t => t.id === 'ref-mujer-busto')!, row = table.rows.find(row => row.code === 'M92')!;
    const project = prepareSimpleProject(projectFromModel(model, profileFromSize(table, row)));
    const built = buildPattern(project.pattern!);
    expect(built.issues.filter(i => i.level === 'error')).toEqual([]);
    const scenes = buildAssembly(JSON.parse(JSON.stringify(project)));
    expect(scenes.map(s => s.label)).toEqual(['Frente', 'Espalda']);
    for (const scene of scenes) {
      expect(scene.surfaces.some(s => s.primary)).toBe(true);
      for (const surface of scene.surfaces) {
        expect(built.pieces.some(p => p.id === surface.pieceId)).toBe(true);
        expect([...surface.matrix, ...surface.inverse].every(Number.isFinite)).toBe(true);
        const at = { x: (surface.physicalBounds.minX + surface.physicalBounds.maxX) / 2, y: (surface.physicalBounds.minY + surface.physicalBounds.maxY) / 2 };
        const restored = inverseAssemblyPoint(surface, assemblyPoint(surface, at));
        expect(restored.x).toBeCloseTo(at.x, 6); expect(restored.y).toBeCloseTo(at.y, 6);
      }
    }
    const panelIds = built.pieces.filter(p => p.panelSource && ['delantero', 'espalda'].includes(p.panelSource.pieceId)).map(p => p.id);
    for (const id of panelIds) expect(scenes.some(s => s.surfaces.some(surface => surface.pieceId === id)), id).toBe(true);
    if (model.id.endsWith('doble-rodilla')) expect(scenes[0].surfaces.filter(s => s.pieceId === 'refuerzo-rodilla')).toHaveLength(2);
  });
});
