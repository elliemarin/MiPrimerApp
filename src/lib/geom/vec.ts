export interface Pt {
  x: number;
  y: number;
}

export const pt = (x: number, y: number): Pt => ({ x, y });
export const add = (a: Pt, b: Pt): Pt => ({ x: a.x + b.x, y: a.y + b.y });
export const sub = (a: Pt, b: Pt): Pt => ({ x: a.x - b.x, y: a.y - b.y });
export const mul = (a: Pt, k: number): Pt => ({ x: a.x * k, y: a.y * k });
export const dot = (a: Pt, b: Pt): number => a.x * b.x + a.y * b.y;
export const cross = (a: Pt, b: Pt): number => a.x * b.y - a.y * b.x;
export const len = (a: Pt): number => Math.hypot(a.x, a.y);
export const dist = (a: Pt, b: Pt): number => Math.hypot(a.x - b.x, a.y - b.y);
export const lerp = (a: Pt, b: Pt, t: number): Pt => ({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
export const mid = (a: Pt, b: Pt): Pt => lerp(a, b, 0.5);

export function norm(a: Pt): Pt {
  const l = len(a);
  return l < 1e-12 ? { x: 0, y: 0 } : { x: a.x / l, y: a.y / l };
}

/** Normal a la izquierda en sentido matemático: rota +90°. */
export const perpLeft = (a: Pt): Pt => ({ x: -a.y, y: a.x });
/** Normal a la derecha: rota -90°. */
export const perpRight = (a: Pt): Pt => ({ x: a.y, y: -a.x });

export function rotate(p: Pt, angleRad: number, c: Pt = { x: 0, y: 0 }): Pt {
  const s = Math.sin(angleRad);
  const co = Math.cos(angleRad);
  const dx = p.x - c.x;
  const dy = p.y - c.y;
  return { x: c.x + dx * co - dy * s, y: c.y + dx * s + dy * co };
}

export const deg = (rad: number) => (rad * 180) / Math.PI;
export const rad = (d: number) => (d * Math.PI) / 180;

/** Intersección de dos rectas infinitas p+t·r y q+u·s. */
export function lineIntersect(p: Pt, r: Pt, q: Pt, s: Pt): { pt: Pt; t: number; u: number } | null {
  const den = cross(r, s);
  if (Math.abs(den) < 1e-12) return null;
  const qp = sub(q, p);
  const t = cross(qp, s) / den;
  const u = cross(qp, r) / den;
  return { pt: add(p, mul(r, t)), t, u };
}

/** Intersección propia de segmentos [a,b] y [c,d]. */
export function segIntersect(a: Pt, b: Pt, c: Pt, d: Pt, eps = 1e-9): { pt: Pt; t: number; u: number } | null {
  const r = sub(b, a);
  const s = sub(d, c);
  const hit = lineIntersect(a, r, c, s);
  if (!hit) return null;
  if (hit.t < -eps || hit.t > 1 + eps || hit.u < -eps || hit.u > 1 + eps) return null;
  return hit;
}

/** Refleja el punto p respecto a la recta que pasa por a con dirección d. */
export function reflectPoint(p: Pt, a: Pt, d: Pt): Pt {
  const n = norm(d);
  const ap = sub(p, a);
  const proj = add(a, mul(n, dot(ap, n)));
  return sub(mul(proj, 2), p);
}

export function distToSegment(p: Pt, a: Pt, b: Pt): number {
  const ab = sub(b, a);
  const l2 = dot(ab, ab);
  if (l2 < 1e-18) return dist(p, a);
  const t = Math.max(0, Math.min(1, dot(sub(p, a), ab) / l2));
  return dist(p, add(a, mul(ab, t)));
}

export function polylineLength(pts: Pt[]): number {
  let l = 0;
  for (let i = 1; i < pts.length; i++) l += dist(pts[i - 1], pts[i]);
  return l;
}

/** Área con signo (fórmula del cordón). */
export function signedArea(pts: Pt[]): number {
  let a = 0;
  for (let i = 0; i < pts.length; i++) {
    const p = pts[i];
    const q = pts[(i + 1) % pts.length];
    a += p.x * q.y - q.x * p.y;
  }
  return a / 2;
}

export function pointInPolygon(p: Pt, poly: Pt[]): boolean {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[i];
    const b = poly[j];
    if (a.y > p.y !== b.y > p.y && p.x < ((b.x - a.x) * (p.y - a.y)) / (b.y - a.y) + a.x) inside = !inside;
  }
  return inside;
}

export interface BBox {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

export function bboxOf(pts: Pt[]): BBox {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const p of pts) {
    if (p.x < minX) minX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.x > maxX) maxX = p.x;
    if (p.y > maxY) maxY = p.y;
  }
  return { minX, minY, maxX, maxY };
}

export const bboxW = (b: BBox) => b.maxX - b.minX;
export const bboxH = (b: BBox) => b.maxY - b.minY;

/** Punto a distancia s a lo largo de una polilínea, con su tangente. */
export function pointAtLength(pts: Pt[], s: number): { p: Pt; tangent: Pt } {
  let acc = 0;
  for (let i = 1; i < pts.length; i++) {
    const seg = dist(pts[i - 1], pts[i]);
    if (acc + seg >= s || i === pts.length - 1) {
      const t = seg < 1e-12 ? 0 : Math.max(0, Math.min(1, (s - acc) / seg));
      return { p: lerp(pts[i - 1], pts[i], t), tangent: norm(sub(pts[i], pts[i - 1])) };
    }
    acc += seg;
  }
  return { p: pts[0], tangent: { x: 1, y: 0 } };
}

/** Transformación afín 2D [a b c d e f] como en SVG: x' = a x + c y + e. */
export type Mat = [number, number, number, number, number, number];
export const IDENTITY: Mat = [1, 0, 0, 1, 0, 0];

export function matMul(m: Mat, n: Mat): Mat {
  return [
    m[0] * n[0] + m[2] * n[1],
    m[1] * n[0] + m[3] * n[1],
    m[0] * n[2] + m[2] * n[3],
    m[1] * n[2] + m[3] * n[3],
    m[0] * n[4] + m[2] * n[5] + m[4],
    m[1] * n[4] + m[3] * n[5] + m[5]
  ];
}

export function matApply(m: Mat, p: Pt): Pt {
  return { x: m[0] * p.x + m[2] * p.y + m[4], y: m[1] * p.x + m[3] * p.y + m[5] };
}

export function matInvert(m: Mat): Mat {
  const det = m[0] * m[3] - m[1] * m[2];
  const id = 1 / det;
  return [
    m[3] * id,
    -m[1] * id,
    -m[2] * id,
    m[0] * id,
    (m[2] * m[5] - m[3] * m[4]) * id,
    (m[1] * m[4] - m[0] * m[5]) * id
  ];
}

export const matTranslate = (x: number, y: number): Mat => [1, 0, 0, 1, x, y];
export const matScale = (sx: number, sy = sx): Mat => [sx, 0, 0, sy, 0, 0];
export function matRotate(angleDeg: number): Mat {
  const r = rad(angleDeg);
  const c = Math.cos(r);
  const s = Math.sin(r);
  return [c, s, -s, c, 0, 0];
}
