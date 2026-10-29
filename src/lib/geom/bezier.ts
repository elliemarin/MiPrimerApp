import { Pt, dist, lerp, sub, norm, add, mul } from './vec';

export interface Cubic {
  p0: Pt;
  c1: Pt;
  c2: Pt;
  p3: Pt;
}

export function cubicAt(c: Cubic, t: number): Pt {
  const mt = 1 - t;
  const a = mt * mt * mt;
  const b = 3 * mt * mt * t;
  const d = 3 * mt * t * t;
  const e = t * t * t;
  return {
    x: a * c.p0.x + b * c.c1.x + d * c.c2.x + e * c.p3.x,
    y: a * c.p0.y + b * c.c1.y + d * c.c2.y + e * c.p3.y
  };
}

export function cubicDeriv(c: Cubic, t: number): Pt {
  const mt = 1 - t;
  const a = 3 * mt * mt;
  const b = 6 * mt * t;
  const d = 3 * t * t;
  return {
    x: a * (c.c1.x - c.p0.x) + b * (c.c2.x - c.c1.x) + d * (c.p3.x - c.c2.x),
    y: a * (c.c1.y - c.p0.y) + b * (c.c2.y - c.c1.y) + d * (c.p3.y - c.c2.y)
  };
}

export function splitCubic(c: Cubic, t: number): [Cubic, Cubic] {
  const p01 = lerp(c.p0, c.c1, t);
  const p12 = lerp(c.c1, c.c2, t);
  const p23 = lerp(c.c2, c.p3, t);
  const p012 = lerp(p01, p12, t);
  const p123 = lerp(p12, p23, t);
  const m = lerp(p012, p123, t);
  return [
    { p0: c.p0, c1: p01, c2: p012, p3: m },
    { p0: m, c1: p123, c2: p23, p3: c.p3 }
  ];
}

function flatEnough(c: Cubic, tol: number): boolean {
  // Distancia máxima de los puntos de control a la cuerda (cota de la desviación).
  const ux = 3 * c.c1.x - 2 * c.p0.x - c.p3.x;
  const uy = 3 * c.c1.y - 2 * c.p0.y - c.p3.y;
  const vx = 3 * c.c2.x - c.p0.x - 2 * c.p3.x;
  const vy = 3 * c.c2.y - c.p0.y - 2 * c.p3.y;
  const m = Math.max(ux * ux, vx * vx) + Math.max(uy * uy, vy * vy);
  return m <= 16 * tol * tol;
}

/** Aproxima la curva con una polilínea cuya desviación máxima es `tol` (mm). */
export function flattenCubic(c: Cubic, tol = 0.02, out: Pt[] = [], depth = 0): Pt[] {
  if (out.length === 0) out.push(c.p0);
  if (depth > 18 || flatEnough(c, tol)) {
    out.push(c.p3);
    return out;
  }
  const [a, b] = splitCubic(c, 0.5);
  flattenCubic(a, tol, out, depth + 1);
  flattenCubic(b, tol, out, depth + 1);
  return out;
}

/** Longitud por cuadratura de Gauss-Legendre (16 puntos) con subdivisión. */
const GL_X = [
  -0.0950125098376374, 0.0950125098376374, -0.2816035507792589, 0.2816035507792589, -0.4580167776572274,
  0.4580167776572274, -0.6178762444026438, 0.6178762444026438, -0.7554044083550030, 0.7554044083550030,
  -0.8656312023878318, 0.8656312023878318, -0.9445750230732326, 0.9445750230732326, -0.9894009349916499,
  0.9894009349916499
];
const GL_W = [
  0.1894506104550685, 0.1894506104550685, 0.1826034150449236, 0.1826034150449236, 0.1691565193950025,
  0.1691565193950025, 0.1495959888165767, 0.1495959888165767, 0.1246289712555339, 0.1246289712555339,
  0.0951585116824928, 0.0951585116824928, 0.0622535239386479, 0.0622535239386479, 0.0271524594117541,
  0.0271524594117541
];

export function cubicLength(c: Cubic, t0 = 0, t1 = 1): number {
  const half = (t1 - t0) / 2;
  const midT = (t1 + t0) / 2;
  let s = 0;
  for (let i = 0; i < GL_X.length; i++) {
    const d = cubicDeriv(c, midT + half * GL_X[i]);
    s += GL_W[i] * Math.hypot(d.x, d.y);
  }
  return s * half;
}

/** Parámetro t para una longitud de arco dada (Newton + bisección). */
export function cubicTAtLength(c: Cubic, s: number): number {
  const total = cubicLength(c);
  if (s <= 0) return 0;
  if (s >= total) return 1;
  let lo = 0;
  let hi = 1;
  let t = s / total;
  for (let i = 0; i < 40; i++) {
    const l = cubicLength(c, 0, t);
    const err = l - s;
    if (Math.abs(err) < 1e-6) break;
    if (err > 0) hi = t;
    else lo = t;
    const d = cubicDeriv(c, t);
    const sp = Math.hypot(d.x, d.y);
    let nt = sp > 1e-9 ? t - err / sp : (lo + hi) / 2;
    if (nt <= lo || nt >= hi) nt = (lo + hi) / 2;
    t = nt;
  }
  return t;
}

export function cubicTangent(c: Cubic, t: number): Pt {
  let d = cubicDeriv(c, t);
  if (Math.hypot(d.x, d.y) < 1e-9) {
    // Punto de control coincidente: usa la cuerda.
    d = t < 0.5 ? sub(c.c2, c.p0) : sub(c.p3, c.c1);
    if (Math.hypot(d.x, d.y) < 1e-9) d = sub(c.p3, c.p0);
  }
  return norm(d);
}

/** Construye una cúbica que aproxima un cuarto de elipse tangente a dos direcciones. */
export function cornerCurve(start: Pt, startDir: Pt, end: Pt, endDir: Pt, kStart: number, kEnd: number): Cubic {
  const d = dist(start, end);
  return {
    p0: start,
    c1: add(start, mul(norm(startDir), d * kStart)),
    c2: sub(end, mul(norm(endDir), d * kEnd)),
    p3: end
  };
}
