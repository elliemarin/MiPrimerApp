import { describe, expect, it } from 'vitest';
import { findModel } from '../src/data/catalog';
import { FABRIC_LIBRARY, MATERIAL_LIBRARY, recommendFabrics, searchLibraryFabric, swatchSvg, SWATCH_MOTIF_LABEL } from '../src/data/materialLibrary';

describe('biblioteca de materiales', () => {
  it('mantiene referencias distintas con datos textiles completos y rangos ordenados', () => {
    expect(FABRIC_LIBRARY.length).toBeGreaterThanOrEqual(50);
    expect(new Set(FABRIC_LIBRARY.map((f) => f.id)).size).toBe(FABRIC_LIBRARY.length);
    expect(new Set(MATERIAL_LIBRARY.map((m) => m.id)).size).toBe(MATERIAL_LIBRARY.length);
    for (const f of FABRIC_LIBRARY) {
      expect(f.weight[0]).toBeGreaterThan(0);
      expect(f.weight[1]).toBeGreaterThanOrEqual(f.weight[0]);
      expect(f.stretch[1]).toBeGreaterThanOrEqual(f.stretch[0]);
      expect(f.uses.length).toBeGreaterThan(0);
      expect(f.needle.length).toBeGreaterThan(0);
      expect(f.care.length).toBeGreaterThan(0);
    }
  });
  it('encuentra sin acentos y por alias o uso', () => {
    const denim = FABRIC_LIBRARY.find((f) => f.id === 'denim')!;
    expect(searchLibraryFabric(denim, 'MEZCLILLA')).toBe(true);
    expect(searchLibraryFabric(denim, 'denim pantalon')).toBe(true);
    expect(searchLibraryFabric(denim, 'gasa')).toBe(false);
  });
  it('recomienda mezclilla para pantalón plano y excluye puntos incompatibles', () => {
    const model = findModel('intervenir-pantalon')!;
    const result = recommendFabrics(model, 'plano', 0);
    expect(result[0].fabric.id).toBe('denim');
    expect(result.every((r) => r.fabric.kind === 'plano')).toBe(true);
    expect(result.every((r) => r.reason.length > 10)).toBe(true);
  });
  it('respeta tejido y elasticidad requeridos por un body de bebé', () => {
    const result = recommendFabrics(findModel('body-bebe'));
    expect(result.some((r) => r.fabric.id === 'interlock')).toBe(true);
    expect(result.every((r) => r.fabric.kind === 'punto' && r.fabric.stretch[1] >= 25)).toBe(true);
    expect(result.some((r) => r.fabric.id === 'denim')).toBe(false);
  });
  it('crea todos los estampados como vectores autónomos sin permitir inyectar color', () => {
    for (const motif of Object.keys(SWATCH_MOTIF_LABEL) as (keyof typeof SWATCH_MOTIF_LABEL)[]) {
      const svg = swatchSvg(FABRIC_LIBRARY[0], '#123456', motif);
      expect(svg).toContain('width="256"');
      expect(svg).toContain('#123456');
      expect(svg).not.toContain('href=');
    }
    expect(swatchSvg(FABRIC_LIBRARY[0], '"><script>alert(1)</script>')).not.toContain('<script>');
  });
});
