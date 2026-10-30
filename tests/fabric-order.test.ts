import { describe, expect, it } from 'vitest';
import { newestFabrics, matchesOwnFabric } from '../src/lib/fabricOrder';
import type { Fabric } from '../src/store/types';

const sample = (id: string, createdAt: string, updatedAt = createdAt): Fabric => ({
  id, name: 'Lino de algodón', composition: 'Algodón', kind: 'plano', color: '#ffffff',
  visualRepeatMm: 100, grainAngle: 0, nap: 'sin-pelo', createdAt, updatedAt
});

describe('Mis telas: nuevas primero en página, estudio y acabados', () => {
  it('mantiene la foto recién añadida delante aunque se edite una muestra antigua', () => {
    const old = sample('vieja', '2026-10-29T10:00:00.000Z', '2026-10-31T10:00:00.000Z');
    const photo = sample('foto', '2026-10-30T10:00:00.000Z');
    const input = { vieja: old, foto: photo };
    expect(newestFabrics(input).map(f => f.id)).toEqual(['foto', 'vieja']);
    // Loading IndexedDB may change insertion order. Sorting must not depend on it.
    const restored = Object.fromEntries(JSON.parse(JSON.stringify(Object.entries(input))).reverse());
    expect(newestFabrics(restored).map(f => f.id)).toEqual(['foto', 'vieja']);
    expect(Object.keys(input)).toEqual(['vieja', 'foto']);
  });

  it('desempata de forma estable sin depender del orden de IndexedDB', () => {
    const a = sample('a', '2026-10-30T10:00:00.000Z');
    const b = sample('b', a.createdAt);
    expect(newestFabrics([a, b])).toEqual(newestFabrics([b, a]));
  });

  it('busca nombres y composición sin acentos y conserva filtros al ordenar', () => {
    const fabric = sample('algodon', '2026-10-30T10:00:00.000Z');
    expect(matchesOwnFabric(fabric, 'ALGODON lino')).toBe(true);
    expect(matchesOwnFabric(fabric, 'poliester')).toBe(false);
    expect(matchesOwnFabric(fabric, '  ')).toBe(true);
  });
});
