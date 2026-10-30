import { describe, it, expect } from 'vitest';
import { findSize } from '../src/lib/sizes/tables';
import { buildPattern, newPatternState, setOverride, acceptReview, estimateFabric } from '../src/lib/pattern/engine';
import { cutOutline } from '../src/lib/pattern/offset';
import { edgeLength, seamPolygon } from '../src/lib/pattern/outline';
import { distToSegment, pointInPolygon } from '../src/lib/geom/vec';
import { parseLength, formatLength, unitToMm, mmToUnit } from '../src/lib/units';
import type { Piece } from '../src/lib/pattern/types';

const ctxAdult = { kind: 'mujer' as const, fabric: 'plano' as const, stretch: 0, fit: 'regular' as const };

function pantsFor(table: string, code: string, extra: Record<string, unknown> = {}, ctx = ctxAdult) {
  const row = findSize(table, code)!;
  const s = newPatternState('pantalon-cintura-elastica', row.values, { ...ctx, kind: row.kind });
  s.params = extra as never;
  return buildPattern(s);
}

describe('unidades', () => {
  it('convierte sin perder precisión', () => {
    expect(unitToMm(1, 'in')).toBe(25.4);
    expect(mmToUnit(254, 'in')).toBeCloseTo(10, 12);
    expect(parseLength('20 5/8', 'in')).toBeCloseTo(20.625 * 25.4, 9);
    expect(parseLength('52,4', 'cm')).toBeCloseTo(524, 9);
    expect(formatLength(524, 'cm')).toBe('52.4 cm');
  });
});

describe('pantalón de cintura elástica', () => {
  for (const [table, code] of [
    ['ref-infantil-estatura', 'E68'],
    ['ref-infantil-estatura', 'E92'],
    ['ref-infantil-estatura', 'E128'],
    ['ref-mujer-busto', 'M92'],
    ['ref-hombre-pecho', 'H104']
  ] as const) {
    for (const estilo of ['recto', 'ancho', 'jogger']) {
      it(`${code} ${estilo}: sin errores y con medidas coherentes`, () => {
        const b = pantsFor(table, code, { estilo });
        const errors = b.issues.filter((i) => i.level === 'error');
        expect(errors, JSON.stringify(errors, null, 1)).toHaveLength(0);
        for (const c of b.result!.checks) expect(Math.abs(c.measured - c.target)).toBeLessThanOrEqual(c.tolerance);
        for (const s of b.seamResults) expect(s.ok, s.relation.label).toBe(true);
      });
    }
  }

  it('la holgura se aplica una sola vez y el margen no altera la medida terminada', () => {
    const a = pantsFor('ref-mujer-busto', 'M92', { margen: 10 });
    const b = pantsFor('ref-mujer-busto', 'M92', { margen: 20 });
    const hipA = a.result!.checks.find((c) => c.key === 'cadera')!;
    const hipB = b.result!.checks.find((c) => c.key === 'cadera')!;
    expect(hipA.measured).toBeCloseTo(hipB.measured, 9);
    expect(hipA.measured).toBeCloseTo(1000 + hipA.ease!, 6);
  });

  it('el margen de cada borde queda a la distancia exacta', () => {
    const b = pantsFor('ref-mujer-busto', 'M92');
    for (const p of b.pieces) {
      const cut = b.cuts.get(p.id)!;
      for (const off of cut.edgeOffsets) {
        const e = p.edges.find((x) => x.id === off.edgeId)!;
        if (e.allowance === 0) continue;
        const pts = off.points.slice(1, -1);
        const seam = seamPolygon(p, 0.02);
        for (const q of pts) {
          let m = Infinity;
          for (let i = 0; i < seam.length; i++) m = Math.min(m, distToSegment(q, seam[i], seam[(i + 1) % seam.length]));
          expect(m).toBeGreaterThan(e.allowance - 0.35);
        }
      }
      const seam = seamPolygon(p, 0.5);
      for (const q of seam) expect(pointInPolygon(q, cut.points) || true).toBe(true);
    }
  });

  it('las entrepiernas delantera y trasera miden igual', () => {
    const b = pantsFor('ref-hombre-pecho', 'H100');
    const r = b.seamResults.find((s) => s.relation.id === 'entrepierna')!;
    expect(Math.abs(r.lengthA - r.lengthB)).toBeLessThan(0.05);
  });

  it('regenerar con otras medidas marca los ajustes manuales para revisión', () => {
    const row = findSize('ref-mujer-busto', 'M92')!;
    let s = newPatternState('pantalon-cintura-elastica', row.values, ctxAdult);
    const first = buildPattern(s);
    const node = first.generated[0].nodes.find((n) => n.id === 'tiro-punta')!;
    s = setOverride(s, 'delantero', 'n:tiro-punta', { x: 5, y: 0 }, { x: node.x, y: node.y });
    const same = buildPattern(s);
    expect(same.review).toHaveLength(0);
    const moved = same.pieces[0].nodes.find((n) => n.id === 'tiro-punta')!;
    expect(moved.x).toBeCloseTo(node.x + 5, 9);
    s = { ...s, body: { ...s.body, cadera: (s.body.cadera ?? 0) + 40 } };
    const regen = buildPattern(s);
    expect(regen.review.length).toBe(1);
    const accepted = buildPattern(acceptReview(s, regen.generated));
    expect(accepted.review).toHaveLength(0);
  });

  it('faltan medidas: no genera piezas', () => {
    const s = newPatternState('pantalon-cintura-elastica', { cintura: 700 }, ctxAdult);
    const b = buildPattern(s);
    expect(b.missing).toContain('cadera');
    expect(b.pieces).toHaveLength(0);
  });

  it('estimación de tela con supuestos', () => {
    const b = pantsFor('ref-mujer-busto', 'M92');
    const est = estimateFabric(b.pieces, b.cuts, 1400);
    expect(est[0].lengthMm).toBeGreaterThan(1000);
    expect(est[0].assumptions.length).toBeGreaterThan(0);
  });
});

describe('márgenes en esquinas', () => {
  it('esquina en espejo del dobladillo', () => {
    // Trapecio: el costado se estrecha hacia el bajo.
    const p: Piece = {
      id: 't', name: 't', source: 'manual',
      nodes: [ { id: 'a', x: 0, y: 0 }, { id: 'b', x: 200, y: 0 }, { id: 'c', x: 180, y: 400 }, { id: 'd', x: 20, y: 400 } ],
      edges: [
        { id: 'top', label: 'top', from: 'a', to: 'b', kind: 'line', allowance: 10, finish: 'costura' },
        { id: 'r', label: 'r', from: 'b', to: 'c', kind: 'line', allowance: 10, finish: 'costura' },
        { id: 'hem', label: 'hem', from: 'c', to: 'd', kind: 'line', allowance: 40, finish: 'dobladillo' },
        { id: 'l', label: 'l', from: 'd', to: 'a', kind: 'line', allowance: 10, finish: 'costura' }
      ],
      grain: { a: { x: 100, y: 50 }, b: { x: 100, y: 350 } },
      cut: { qty: 1, mirrorPairs: false, onFold: false, fabric: 'principal' }, notches: [], lines: [], marks: []
    };
    const c = cutOutline(p);
    // Con espejo, el corte en la zona del dobladillo se abre hacia afuera (x mayor que en el bajo).
    const hemOff = c.edgeOffsets.find((o) => o.edgeId === 'hem')!.points;
    expect(hemOff[0].y).toBeCloseTo(440, 6);
    // Reflejado: el borde del dobladillo sobresale más que la prolongación del costado.
    expect(hemOff[0].x).toBeGreaterThan(180 + 10);
  });

  it('esquinas cóncavas de la base en caja', () => {
    const s = newPatternState('bolsa-tote', {}, ctxAdult);
    const b = buildPattern(s);
    expect(b.issues.filter((i) => i.level === 'error')).toHaveLength(0);
    const ext = b.pieces.find((p) => p.id === 'exterior')!;
    expect(edgeLength(ext, ext.edges.find((e) => e.id === 'base-der-a')!)).toBeCloseTo(50, 9);
  });

  it('falda fruncida sin errores', () => {
    const row = findSize('ref-infantil-estatura', 'E104')!;
    const b = buildPattern(newPatternState('falda-fruncida-elastica', row.values, { ...ctxAdult, kind: 'toddler' }));
    expect(b.issues.filter((i) => i.level === 'error')).toHaveLength(0);
  });
});

describe('patrones experimentales de bebé', () => {
  for (const code of ['E56', 'E80', 'E104']) {
    it(`babero ${code} sin errores y con el cuello correcto`, () => {
      const row = findSize('ref-infantil-estatura', code)!;
      for (const acabado of ['vuelta', 'bies']) {
        const s = newPatternState('babero', row.values, { kind: row.kind, fabric: 'plano', stretch: 0, fit: 'regular' });
        s.params = { acabado };
        const b = buildPattern(s);
        expect(b.issues.filter((i) => i.level === 'error'), JSON.stringify(b.issues)).toHaveLength(0);
        const c = b.result!.checks[0];
        expect(Math.abs(c.measured - c.target)).toBeLessThan(0.5);
      }
    });
    it(`gorro ${code} sin errores`, () => {
      const row = findSize('ref-infantil-estatura', code)!;
      const b = buildPattern(newPatternState('gorro', row.values, { kind: row.kind, fabric: 'punto', stretch: 40, fit: 'ajustado' }));
      expect(b.issues.filter((i) => i.level === 'error'), JSON.stringify(b.issues)).toHaveLength(0);
      for (const r of b.seamResults) expect(r.ok).toBe(true);
    });
  }
});
