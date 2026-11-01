import type { Pt } from '../geom/vec';

/** Projective transform as a row-major 3 × 3 matrix [a b c; d e f; g h i]. */
export type Homography = [number, number, number, number, number, number, number, number, number];

export const IDENTITY_H: Homography = [1, 0, 0, 0, 1, 0, 0, 0, 1];

export function applyH(H: Homography, p: Pt): Pt {
  const w = H[6] * p.x + H[7] * p.y + H[8];
  return { x: (H[0] * p.x + H[1] * p.y + H[2]) / w, y: (H[3] * p.x + H[4] * p.y + H[5]) / w };
}

export function multiplyH(A: Homography, B: Homography): Homography {
  const out = new Array(9).fill(0) as Homography;
  for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) for (let k = 0; k < 3; k++) out[r * 3 + c] += A[r * 3 + k] * B[k * 3 + c];
  return normalizeH(out);
}

export function invertH(H: Homography): Homography | undefined {
  const [a, b, c, d, e, f, g, h, i] = H;
  const A = e * i - f * h, B = -(d * i - f * g), C = d * h - e * g;
  const det = a * A + b * B + c * C;
  if (!Number.isFinite(det) || Math.abs(det) < 1e-12) return undefined;
  return normalizeH([A / det, -(b * i - c * h) / det, (b * f - c * e) / det, B / det, (a * i - c * g) / det, -(a * f - c * d) / det, C / det, -(a * h - b * g) / det, (a * e - b * d) / det]);
}

function normalizeH(H: Homography): Homography {
  const s = Math.abs(H[8]) > 1e-12 ? H[8] : 1;
  return H.map(v => v / s) as Homography;
}

/** Affine scale/translation as a homography (table mm → screen px). */
export const scaleH = (sx: number, sy: number, tx: number, ty: number): Homography => [sx, 0, tx, 0, sy, ty, 0, 0, 1];

/** Exact homography for four point pairs (Gaussian elimination with pivoting). */
export function solveHomography(src: Pt[], dst: Pt[]): Homography | undefined {
  if (src.length !== 4 || dst.length !== 4) return undefined;
  const A: number[][] = [];
  for (let k = 0; k < 4; k++) {
    const { x, y } = src[k], { x: u, y: v } = dst[k];
    A.push([x, y, 1, 0, 0, 0, -u * x, -u * y, u]);
    A.push([0, 0, 0, x, y, 1, -v * x, -v * y, v]);
  }
  for (let col = 0; col < 8; col++) {
    let pivot = col;
    for (let row = col + 1; row < 8; row++) if (Math.abs(A[row][col]) > Math.abs(A[pivot][col])) pivot = row;
    if (Math.abs(A[pivot][col]) < 1e-10) return undefined;
    [A[col], A[pivot]] = [A[pivot], A[col]];
    for (let row = 0; row < 8; row++) {
      if (row === col) continue;
      const factor = A[row][col] / A[col][col];
      for (let k = col; k < 9; k++) A[row][k] -= factor * A[col][k];
    }
  }
  const h = A.map((row, i) => row[8] / row[i]);
  const H = [...h, 1] as Homography;
  return H.every(Number.isFinite) ? H : undefined;
}

/** Physical size of one table millimetre in screen pixels near a point. */
export function localScale(H: Homography, p: Pt): number {
  const a = applyH(H, p), b = applyH(H, { x: p.x + 1, y: p.y }), c = applyH(H, { x: p.x, y: p.y + 1 });
  return (Math.hypot(b.x - a.x, b.y - a.y) + Math.hypot(c.x - a.x, c.y - a.y)) / 2;
}

/** A calibrated quadrilateral must stay convex and keep its orientation. */
export function convexQuad(points: Pt[]): boolean {
  if (points.length !== 4) return false;
  let sign = 0;
  for (let i = 0; i < 4; i++) {
    const a = points[i], b = points[(i + 1) % 4], c = points[(i + 2) % 4];
    const cross = (b.x - a.x) * (c.y - b.y) - (b.y - a.y) * (c.x - b.x);
    if (Math.abs(cross) < 1e-6) return false;
    const s = Math.sign(cross);
    if (sign && s !== sign) return false;
    sign = s;
  }
  return true;
}
