import { describe, expect, it } from 'vitest';
import { harmonyColors, hexToHsl, hslToHex, wheelHue } from '../src/lib/draw/colors';
import { defaultFigurine, figureGeometry, FIGURE_BODY_LABEL } from '../src/lib/draw/figurine';
import { parseSvgPath } from '../src/lib/draw/svgpath';
import { cmdsToPolylines } from '../src/lib/draw/flatten';

describe('Círculo de color', () => {
  it('conserva colores RGB al convertir a HSL y de vuelta', () => {
    for (const color of ['#000000', '#ffffff', '#ff0000', '#00ff00', '#0000ff', '#d99c73', '#24584a', '#b885de']) expect(hslToHex(hexToHsl(color)!)).toBe(color);
    expect(hexToHsl('red')).toBeNull();
    expect(hexToHsl('#xyzxyz')).toBeNull();
  });
  it('selecciona el tono correcto por posición en el círculo', () => {
    expect(wheelHue(0, -1)).toBe(0);
    expect(wheelHue(1, 0)).toBe(90);
    expect(wheelHue(0, 1)).toBe(180);
    expect(wheelHue(-1, 0)).toBe(270);
  });
  it('genera complementarios, análogos y tríadas con separación definida', () => {
    const red = { h: 0, s: 100, l: 50 };
    expect(harmonyColors(red, 'complementaria')).toEqual(['#ff0000', '#00ffff']);
    expect(harmonyColors(red, 'triada')).toEqual(['#ff0000', '#00ff00', '#0000ff']);
    expect(harmonyColors(red, 'analoga')).toEqual(['#ff0080', '#ff0000', '#ff8000']);
    expect(harmonyColors(red, 'monocromatica').map((hex) => Math.round(hexToHsl(hex)!.l))).toEqual([20, 35, 50, 65, 80]);
  });
});

describe('Figurines', () => {
  it('produce siluetas distintas con trayectos válidos dentro del lienzo', () => {
    const torsos = new Set<string>();
    for (const body of Object.keys(FIGURE_BODY_LABEL) as (keyof typeof FIGURE_BODY_LABEL)[]) for (const age of ['adulto', 'infantil'] as const) {
      const geometry = figureGeometry(body, age);
      torsos.add(geometry.torso);
      for (const d of [geometry.torso, geometry.neck, ...geometry.arms, ...geometry.legs]) {
        const polylines = cmdsToPolylines(parseSvgPath(d), 0.5);
        expect(polylines.length).toBeGreaterThan(0);
        for (const line of polylines) for (const p of line.pts) {
          expect(p.x).toBeGreaterThanOrEqual(0); expect(p.x).toBeLessThanOrEqual(400);
          expect(p.y).toBeGreaterThanOrEqual(0); expect(p.y).toBeLessThanOrEqual(680);
        }
      }
    }
    expect(torsos.size).toBe(8);
  });
  it('coloca pantalones y faldas en cintura y superiores en hombros', () => {
    expect(defaultFigurine('pantalon').garmentY).toBeGreaterThan(defaultFigurine('top').garmentY);
    expect(defaultFigurine('falda').garmentY).toBe(defaultFigurine('pantalon').garmentY);
  });
});
