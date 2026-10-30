import ClipperLib from 'clipper-lib';
import type { Pt } from './vec';

const SCALE = 1000; // mm → micras enteras

type IntPt = { X: number; Y: number };
const toInt = (pts: Pt[]): IntPt[] => pts.map((p) => ({ X: Math.round(p.x * SCALE), Y: Math.round(p.y * SCALE) }));
const toPt = (pts: IntPt[]): Pt[] => pts.map((p) => ({ x: p.X / SCALE, y: p.Y / SCALE }));

/** Normaliza polígonos (unión con regla no nula). */
export function unionPolygons(polys: Pt[][]): Pt[][] {
  const paths = polys.filter((p) => p.length >= 3).map(toInt);
  const solved = ClipperLib.Clipper.SimplifyPolygons(paths, ClipperLib.PolyFillType.pftNonZero) as IntPt[][];
  return solved.map(toPt);
}

/**
 * Desplaza polígonos cerrados una distancia (mm). Uniones redondeadas por
 * defecto: es el margen correcto para figuras orgánicas y cóncavas.
 */
export function offsetPolygons(polys: Pt[][], delta: number, join: 'round' | 'miter' = 'round'): Pt[][] {
  const base = unionPolygons(polys);
  if (delta === 0) return base;
  const co = new ClipperLib.ClipperOffset(2, 0.05 * SCALE);
  co.AddPaths(base.map(toInt), join === 'round' ? ClipperLib.JoinType.jtRound : ClipperLib.JoinType.jtMiter, ClipperLib.EndType.etClosedPolygon);
  const sol: IntPt[][] = [];
  co.Execute(sol, delta * SCALE);
  return sol.map(toPt);
}

export function polygonArea(pts: Pt[]): number {
  let a = 0;
  for (let i = 0; i < pts.length; i++) {
    const p = pts[i];
    const q = pts[(i + 1) % pts.length];
    a += p.x * q.y - q.x * p.y;
  }
  return Math.abs(a / 2);
}

/** Área de un conjunto (exteriores menos huecos). */
export function polygonsArea(polys: Pt[][]): number {
  let a = 0;
  for (const p of polys) {
    let s = 0;
    for (let i = 0; i < p.length; i++) {
      const u = p[i];
      const v = p[(i + 1) % p.length];
      s += u.x * v.y - v.x * u.y;
    }
    a += s / 2;
  }
  return Math.abs(a);
}

/** Intersección de dos conjuntos de polígonos. */
export function intersectPolygons(a: Pt[][], b: Pt[][]): Pt[][] {
  const c = new ClipperLib.Clipper();
  c.AddPaths(a.map(toInt), ClipperLib.PolyType.ptSubject, true);
  c.AddPaths(b.map(toInt), ClipperLib.PolyType.ptClip, true);
  const sol: IntPt[][] = [];
  c.Execute(ClipperLib.ClipType.ctIntersection, sol, ClipperLib.PolyFillType.pftNonZero, ClipperLib.PolyFillType.pftNonZero);
  return sol.map(toPt);
}
