import type { Pt } from '../../geom/vec';
import { seamPolygon } from '../outline';
import { P } from './kidsShared';
import { plush, type A } from './toyKit';
import type { Shape } from '../../applique/shapes';
import { intersectPolygons, offsetPolygons } from '../../geom/polyoffset';

/* Utilidades de siluetas en milímetros para bolsilleros y tapetes: escalar,
 * redondear entrantes según el margen, cortar al doblez y recortar líneas de
 * acolchado dentro de una figura. */

export const S = (k: number) => (pts: Pt[]) => pts.map(q => P(q.x * k, q.y * k));
export const biggest = (s: Shape) => [...s].sort((a, b) => b.length - a.length)[0];
export const smooth = (s: Shape, r: number) => biggest(offsetPolygons(offsetPolygons(s, r), -r));
/** Radius for concave bends with a given seam allowance: a tighter bend makes the cutting line loop over itself. */
export const bendFor = (sa: number) => 1.5 * sa + 4;
export const spline = (a: A[]) => seamPolygon(plush('t', 't', a, { k: 1, sa: 0, felt: true }), 0.4);
export const near = (v: number, w: number) => Math.abs(v - w) < 0.05;
export const box = (x0: number, y0: number, x1: number, y1: number) => [P(x0, y0), P(x1, y0), P(x1, y1), P(x0, y1)];
export const mirrorX = (pts: Pt[]) => pts.map(q => P(-q.x, q.y)).reverse();
/** An appliqué kept at least d (mm) inside the body's seam line. */
export const inset = (poly: Pt[], body: Pt[], d: number) => biggest(intersectPolygons([poly], offsetPolygons([body], -d)));
/** Convex hull (monotone chain). */
export function hull(pts: Pt[]): Pt[] {
  const q = [...pts].sort((a, b) => a.x - b.x || a.y - b.y), cross = (o: Pt, a: Pt, b: Pt) => (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);
  const half = (list: Pt[]) => { const h: Pt[] = []; for (const p of list) { while (h.length >= 2 && cross(h[h.length - 2], h[h.length - 1], p) <= 0) h.pop(); h.push(p); } h.pop(); return h; };
  return [...half(q), ...half([...q].reverse())];
}
/** Right half (x ≥ 0) of a shape symmetric about x = 0, after rounding its concave bends to radius r. */
export function halfOnFold(body: Pt[], r: number): Pt[] {
  const ys = body.map(q => q.y), xs = body.map(q => q.x);
  return biggest(intersectPolygons([smooth([body], r)], [box(0, Math.min(...ys) - 10, Math.max(...xs) + 10, Math.max(...ys) + 10)]));
}

export const insidePoly = (p: Pt, poly: Pt[]) => {
  let c = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) { const a = poly[i], b = poly[j]; if ((a.y > p.y) !== (b.y > p.y) && p.x < ((b.x - a.x) * (p.y - a.y)) / (b.y - a.y) + a.x) c = !c; }
  return c;
};
/** Even-odd inside test over several outlines (an offset can split or hole a shape). */
const insideShape = (p: Pt, s: Shape) => s.reduce((c, poly) => (insidePoly(p, poly) ? !c : c), false);

/** Douglas–Peucker simplification of an open polyline. */
export function simplifyLine(pts: Pt[], tol: number): Pt[] {
  if (pts.length < 3) return pts;
  const first = pts[0], last = pts[pts.length - 1];
  if (pts.length > 3 && Math.hypot(first.x - last.x, first.y - last.y) < 1e-6) {
    // A closed loop: split it at the point farthest from the start.
    let m = 1; pts.forEach((q, i) => { if (Math.hypot(q.x - first.x, q.y - first.y) > Math.hypot(pts[m].x - first.x, pts[m].y - first.y)) m = i; });
    return [...simplifyLine(pts.slice(0, m + 1), tol), ...simplifyLine(pts.slice(m), tol).slice(1)];
  }
  const keep = new Array(pts.length).fill(false); keep[0] = keep[pts.length - 1] = true;
  const rec = (i: number, j: number) => {
    const a = pts[i], b = pts[j], dx = b.x - a.x, dy = b.y - a.y, L = Math.hypot(dx, dy) || 1; let best = -1, bi = -1;
    for (let k = i + 1; k < j; k++) { const d = Math.abs((pts[k].x - a.x) * dy - (pts[k].y - a.y) * dx) / L; if (d > best) { best = d; bi = k; } }
    if (best > tol) { keep[bi] = true; rec(i, bi); rec(bi, j); }
  };
  rec(0, pts.length - 1);
  return pts.filter((_, i) => keep[i]);
}

/**
 * Keeps the parts of polylines that lie at least `d` inside `body` and clear of
 * `holes` (grown by `gap`): quilting lines that stop before the seam and go
 * round the appliqués. Lines are densified, clipped and simplified (0.6 mm).
 */
export function clipLines(lines: Pt[][], body: Pt[], d: number, holes: Pt[][] = [], gap = 15, minLen = 20): Pt[][] {
  const region = offsetPolygons([body], -d), avoid = holes.length ? offsetPolygons(holes, gap) : [];
  const ok = (p: Pt) => insideShape(p, region) && !insideShape(p, avoid), out: Pt[][] = [];
  for (const line of lines) {
    let run: Pt[] = [];
    const flush = () => { if (run.length > 1) { const L = run.slice(1).reduce((s, q, i) => s + Math.hypot(q.x - run[i].x, q.y - run[i].y), 0); if (L >= minLen) out.push(simplifyLine(run, 0.6)); } run = []; };
    for (let i = 0; i < line.length; i++) {
      const a = line[i], b = line[i + 1];
      const steps = b ? Math.max(1, Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) / 3)) : 1;
      for (let s = 0; s < steps; s++) { const t = s / steps, p = b ? P(a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t) : a; if (ok(p)) run.push(p); else flush(); }
    }
    flush();
  }
  return out;
}
/** The parts of polylines on the right of the fold (x ≥ 0), cut exactly at the fold. */
export function rightOfFold(lines: Pt[][]): Pt[][] {
  const out: Pt[][] = [];
  for (const line of lines) {
    let run: Pt[] = [];
    for (let i = 0; i < line.length; i++) {
      const p = line[i];
      if (p.x >= 0) run.push(p);
      const q = line[i + 1];
      if (q && (p.x >= 0) !== (q.x >= 0)) {
        const t = p.x / (p.x - q.x), cut = P(0, p.y + (q.y - p.y) * t);
        if (p.x >= 0) { run.push(cut); if (run.length > 1) out.push(run); run = []; } else run = [cut];
      }
    }
    if (run.length > 1) out.push(run);
  }
  return out.filter(l => l.slice(1).reduce((s, q, i) => s + Math.hypot(q.x - l[i].x, q.y - l[i].y), 0) > 2);
}
