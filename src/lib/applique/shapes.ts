import type { Pt } from '../geom/vec';
import { signedArea } from '../geom/vec';
import { differencePolygons, intersectPolygons, strokePolyline, unionPolygons } from '../geom/polyoffset';
import { parseSvgPath } from '../draw/svgpath';
import { cmdsToPolylines } from '../draw/flatten';

/* Formas para figuras de tela. Se dibujan en una caja de diseño de unos
 * 200 × 200 (y hacia abajo) y luego se escalan al tamaño pedido en mm.
 * Todos los polígonos simples tienen orientación positiva para que las
 * uniones y diferencias (regla no nula) no abran huecos por error. */

export type Poly = Pt[];
export type Shape = Poly[];
export type ShapeLike = Poly | Shape;

const P = (x: number, y: number): Pt => ({ x, y });
const TAU = Math.PI * 2;
const range = (n: number) => Array.from({ length: n }, (_, i) => i);

export const pos = (p: Poly): Poly => (signedArea(p) < 0 ? [...p].reverse() : p);
export const isShape = (s: ShapeLike): s is Shape => Array.isArray(s[0]);
export const asShape = (s: ShapeLike): Shape => (s.length === 0 ? [] : isShape(s) ? s : [s]);

/** Contorno polar r(θ), centrado en (cx, cy). */
export function polar(cx: number, cy: number, r: (t: number) => number, n = 144, sx = 1, sy = 1, rot = 0): Poly {
  return pos(range(n).map(i => { const t = (i / n) * TAU; const rr = r(t); return P(cx + Math.cos(t + rot) * rr * sx, cy + Math.sin(t + rot) * rr * sy); }));
}
export const circle = (cx: number, cy: number, r: number, n = 72): Poly => polar(cx, cy, () => r, n);
export function ellipse(cx: number, cy: number, rx: number, ry: number, rotDeg = 0, n = 72): Poly {
  const a = (rotDeg * Math.PI) / 180, c = Math.cos(a), s = Math.sin(a);
  return pos(range(n).map(i => { const t = (i / n) * TAU, x = Math.cos(t) * rx, y = Math.sin(t) * ry; return P(cx + x * c - y * s, cy + x * s + y * c); }));
}
export const rect = (x: number, y: number, w: number, h: number): Poly => pos([P(x, y), P(x + w, y), P(x + w, y + h), P(x, y + h)]);
export function rrect(x: number, y: number, w: number, h: number, r: number): Poly {
  const rr = Math.min(r, w / 2, h / 2), pts: Pt[] = [];
  const corner = (cx: number, cy: number, a0: number) => { for (let i = 0; i <= 8; i++) { const a = a0 + (i / 8) * (Math.PI / 2); pts.push(P(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr)); } };
  corner(x + w - rr, y + rr, -Math.PI / 2); corner(x + w - rr, y + h - rr, 0); corner(x + rr, y + h - rr, Math.PI / 2); corner(x + rr, y + rr, Math.PI);
  return pos(pts);
}
export const poly = (pts: [number, number][]): Poly => pos(pts.map(([x, y]) => P(x, y)));
export function regular(cx: number, cy: number, r: number, n: number, rotDeg = -90): Poly {
  const a0 = (rotDeg * Math.PI) / 180;
  return pos(range(n).map(i => P(cx + Math.cos(a0 + (i / n) * TAU) * r, cy + Math.sin(a0 + (i / n) * TAU) * r)));
}
export function star(cx: number, cy: number, n: number, rIn: number, rOut: number, rotDeg = -90): Poly {
  const a0 = (rotDeg * Math.PI) / 180;
  return pos(range(2 * n).map(i => { const r = i % 2 ? rIn : rOut, a = a0 + (i / (2 * n)) * TAU; return P(cx + Math.cos(a) * r, cy + Math.sin(a) * r); }));
}
/** n pétalos redondeados: r = rIn + (rOut − rIn)·|cos(nθ/2)|^sharp. */
export function petals(cx: number, cy: number, n: number, rIn: number, rOut: number, rotDeg = 0, sharp = 1): Poly {
  const a0 = (rotDeg * Math.PI) / 180;
  return polar(cx, cy, t => rIn + (rOut - rIn) * Math.pow(Math.abs(Math.cos((n * (t - a0)) / 2)), sharp), 240);
}
/** Borde ondulado: círculo con radio senoidal. */
export const wavy = (cx: number, cy: number, r: number, amp: number, freq: number, phase = 0, sx = 1, sy = 1): Poly => polar(cx, cy, t => r + amp * Math.sin(freq * t + phase), 240, sx, sy);
/** Mancha orgánica determinista (misma semilla, misma forma). */
export function blob(cx: number, cy: number, r: number, seed: number, wobble = 0.18, sx = 1, sy = 1): Poly {
  let s = seed * 9301 + 49297;
  const rnd = () => { s = (s * 9301 + 49297) % 233280; return s / 233280; };
  const terms = [2, 3, 4, 5].map(k => ({ k, a: (rnd() - 0.4) * wobble / (k * 0.6), p: rnd() * TAU }));
  return polar(cx, cy, t => r * (1 + terms.reduce((acc, q) => acc + q.a * Math.sin(q.k * t + q.p), 0)), 160, sx, sy);
}
export function heart(cx: number, cy: number, size: number): Poly {
  const k = size / 34;
  return pos(range(120).map(i => { const t = (i / 120) * TAU, x = 16 * Math.pow(Math.sin(t), 3), y = 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t); return P(cx + x * k, cy - y * k); }));
}
/** Hoja (vesica) entre dos puntos, con ancho máximo w y curvatura opcional. */
export function leaf(x1: number, y1: number, x2: number, y2: number, w: number, curl = 0): Poly {
  const dx = x2 - x1, dy = y2 - y1, L = Math.hypot(dx, dy) || 1, nx = -dy / L, ny = dx / L, n = 40, pts: Pt[] = [];
  const at = (t: number, side: number) => { const bend = curl * Math.sin(Math.PI * t) * L, off = side * (w / 2) * Math.pow(Math.sin(Math.PI * t), 0.85); return P(x1 + dx * t + nx * (bend + off), y1 + dy * t + ny * (bend + off)); };
  for (let i = 0; i <= n; i++) pts.push(at(i / n, 1));
  for (let i = n - 1; i > 0; i--) pts.push(at(i / n, -1));
  return pos(pts);
}
/** Gota: círculo de radio r con la punta a distancia len en la dirección angDeg. */
export function drop(cx: number, cy: number, r: number, len: number, angDeg = -90): Poly {
  const a = (angDeg * Math.PI) / 180;
  return polar(cx, cy, t => { const d = Math.cos(t - a); return r + Math.max(0, d) ** 3 * (len - r); }, 160);
}
export function arcBand(cx: number, cy: number, r0: number, r1: number, a0Deg: number, a1Deg: number, n = 60): Poly {
  const a0 = (a0Deg * Math.PI) / 180, a1 = (a1Deg * Math.PI) / 180, pts: Pt[] = [];
  for (let i = 0; i <= n; i++) { const a = a0 + ((a1 - a0) * i) / n; pts.push(P(cx + Math.cos(a) * r1, cy + Math.sin(a) * r1)); }
  for (let i = n; i >= 0; i--) { const a = a0 + ((a1 - a0) * i) / n; pts.push(P(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0)); }
  return pos(pts);
}
/** Trazo grueso por puntos (con curvas suaves si se pasan muchos puntos). */
export const stroke = (pts: [number, number][], w: number): Shape => strokePolyline(pts.map(([x, y]) => P(x, y)), w).map(pos);
export function curve(points: [number, number][], w: number, n = 40): Shape {
  // Catmull-Rom por los puntos dados.
  const pts: Pt[] = [], Q = points.map(([x, y]) => P(x, y));
  for (let i = 0; i < Q.length - 1; i++) {
    const p0 = Q[Math.max(0, i - 1)], p1 = Q[i], p2 = Q[i + 1], p3 = Q[Math.min(Q.length - 1, i + 2)];
    for (let j = 0; j < n; j++) {
      const t = j / n, t2 = t * t, t3 = t2 * t;
      const f = (a: number, b: number, c: number, d: number) => 0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3);
      pts.push(P(f(p0.x, p1.x, p2.x, p3.x), f(p0.y, p1.y, p2.y, p3.y)));
    }
  }
  pts.push(Q[Q.length - 1]);
  return strokePolyline(pts, w).map(pos);
}
export function spiral(cx: number, cy: number, r0: number, r1: number, turns: number, w: number, a0Deg = 0): Shape {
  const n = Math.ceil(turns * 90), a0 = (a0Deg * Math.PI) / 180;
  const pts = range(n + 1).map(i => { const t = i / n, a = a0 + t * turns * TAU, r = r0 + (r1 - r0) * t; return [cx + Math.cos(a) * r, cy + Math.sin(a) * r] as [number, number]; });
  return stroke(pts, w);
}
/** Forma desde un trazado SVG (caja de diseño). Cada subtrazado se une al resto. */
export function svg(d: string): Shape {
  return unionPolygons(cmdsToPolylines(parseSvgPath(d), 0.3).filter(p => p.pts.length >= 3).map(p => pos(p.pts)));
}

// ------------------------------------------------------------------ Transformaciones y operaciones
/** Applies f to every point. A reflection reverses every ring so holes stay holes (never normalise rings one by one). */
const mapShape = (s: ShapeLike, f: (p: Pt) => Pt, reflects = false): Shape => asShape(s).map(p => { const q = p.map(f); return reflects ? q.reverse() : q; });
export const move = (s: ShapeLike, dx: number, dy: number) => mapShape(s, p => P(p.x + dx, p.y + dy));
export function turn(s: ShapeLike, deg: number, cx: number, cy: number): Shape {
  const a = (deg * Math.PI) / 180, c = Math.cos(a), sn = Math.sin(a);
  return mapShape(s, p => P(cx + (p.x - cx) * c - (p.y - cy) * sn, cy + (p.x - cx) * sn + (p.y - cy) * c));
}
export const grow = (s: ShapeLike, k: number, cx: number, cy: number, ky = k) => mapShape(s, p => P(cx + (p.x - cx) * k, cy + (p.y - cy) * ky), k * ky < 0);
/** Espejo respecto a la vertical x = axis. */
export const flipX = (s: ShapeLike, axis: number) => mapShape(s, p => P(2 * axis - p.x, p.y), true);
export const uni = (...s: ShapeLike[]): Shape => unionPolygons(s.flatMap(asShape));
export const minus = (a: ShapeLike, ...b: ShapeLike[]): Shape => differencePolygons(asShape(a), b.flatMap(asShape));
export const inter = (a: ShapeLike, b: ShapeLike): Shape => intersectPolygons(asShape(a), asShape(b));
/** Repite una forma alrededor de un centro. */
export function around(n: number, cx: number, cy: number, make: (i: number) => ShapeLike, offsetDeg = 0): Shape {
  return range(n).flatMap(i => turn(make(i), offsetDeg + (360 * i) / n, cx, cy));
}
/** La misma forma y su espejo respecto a x = axis (pares izquierda/derecha). */
export const pair = (s: ShapeLike, axis = 100): Shape => [...asShape(s), ...flipX(s, axis)];
