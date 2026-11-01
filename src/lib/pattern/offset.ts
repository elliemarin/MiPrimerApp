import { Pt, add, sub, mul, dot, norm, dist, lineIntersect, reflectPoint, segIntersect, len } from '../geom/vec';
import { edgeEndTangent, edgePolyline, edgeStartTangent, orientation, outwardNormal, edgeEnds } from './outline';
import type { PEdge, Piece } from './types';

const MIRROR_FINISHES = new Set(['dobladillo', 'jareta']);

/** Desplaza una polilínea hacia el exterior una distancia d. */
export function offsetPolyline(pts: Pt[], d: number, orient: 1 | -1): Pt[] {
  if (d === 0) return pts.map((p) => ({ ...p }));
  const n = pts.length;
  const out: Pt[] = [];
  for (let i = 0; i < n; i++) {
    const tPrev = i > 0 ? norm(sub(pts[i], pts[i - 1])) : null;
    const tNext = i < n - 1 ? norm(sub(pts[i + 1], pts[i])) : null;
    let normal: Pt;
    if (tPrev && tNext) {
      const n1 = outwardNormal(tPrev, orient);
      const n2 = outwardNormal(tNext, orient);
      const bis = norm(add(n1, n2));
      const c = dot(bis, n1);
      // Inglete limitado: en curvas bien muestreadas c ≈ 1.
      normal = mul(bis, 1 / Math.max(c, 0.5));
    } else {
      normal = outwardNormal((tPrev ?? tNext)!, orient);
    }
    out.push(add(pts[i], mul(normal, d)));
  }
  return out;
}

/** Recorta o extiende el final de una polilínea hasta el punto X situado sobre su prolongación. */
function setEnd(poly: Pt[], X: Pt): Pt[] {
  const res = poly.slice();
  const last = res[res.length - 1];
  const prev = res[res.length - 2];
  const t = norm(sub(last, prev));
  if (dot(sub(X, last), t) >= 0) {
    // X está sobre la prolongación: se añade conservando el extremo original.
    // En un borde sin margen ese extremo es la esquina de costura; moverlo
    // sobre la tangente exacta lo dejaría fuera de la cuerda aplanada.
    if (dist(X, last) > 1e-9) res.push(X);
    return res;
  }
  // X está antes: retroceder segmentos hasta encontrarlo.
  for (let i = res.length - 1; i > 0; i--) {
    const a = res[i - 1];
    const b = res[i];
    const ab = sub(b, a);
    const l2 = dot(ab, ab);
    const u = l2 < 1e-12 ? 0 : dot(sub(X, a), ab) / l2;
    if (u >= 0) {
      return [...res.slice(0, i), X];
    }
  }
  return [res[0], X];
}

function setStart(poly: Pt[], X: Pt): Pt[] {
  return setEnd(poly.slice().reverse(), X).reverse();
}

/** Busca la intersección entre el tramo final de A y el inicial de B (esquinas cóncavas). */
function trimIntersection(A: Pt[], B: Pt[]): { ai: number; bi: number; pt: Pt } | null {
  const KA = Math.min(A.length - 1, 400);
  const KB = Math.min(B.length - 1, 400);
  for (let i = A.length - 1; i >= A.length - KA; i--) {
    for (let j = 1; j <= KB; j++) {
      const hit = segIntersect(A[i - 1], A[i], B[j - 1], B[j]);
      if (hit) {
        // Ignorar el contacto trivial de extremos coincidentes.
        if (i === A.length - 1 && j === 1 && hit.t > 1 - 1e-6 && hit.u < 1e-6) return null;
        return { ai: i, bi: j, pt: hit.pt };
      }
    }
  }
  return null;
}

export interface CutOutline {
  /** Polígono de corte cerrado. */
  points: Pt[];
  /** Tramos de corte por borde (para dibujo y comprobaciones). */
  edgeOffsets: { edgeId: string; points: Pt[] }[];
}

export function isStraight(piece: Piece, e: PEdge): boolean {
  if (e.kind === 'line') return true;
  if (!e.c1 || !e.c2) return true;
  const [a, b] = edgeEnds(piece, e);
  const ab = norm(sub(b, a));
  const dev = (p: Pt) => Math.abs((p.x - a.x) * ab.y - (p.y - a.y) * ab.x);
  return dev(e.c1) < 0.01 && dev(e.c2) < 0.01;
}

/**
 * Calcula el contorno de corte aplicando el margen de cada borde una sola vez.
 * Esquinas: inglete con límite; bordes de dobladillo/jareta rectos con esquinas en espejo.
 */
export function cutOutline(piece: Piece): CutOutline {
  const orient = orientation(piece);
  const E = piece.edges;
  const n = E.length;
  let offs: Pt[][] = E.map((e) => offsetPolyline(edgePolyline(piece, e, 0.05), e.allowance, orient));
  const joins: Pt[][] = new Array(n).fill(null).map(() => []);

  for (let k = 0; k < n; k++) {
    const i = k;
    const j = (k + 1) % n;
    const ei = E[i];
    const ej = E[j];
    const node = edgeEnds(piece, ei)[1];
    const ti = edgeEndTangent(piece, ei);
    const tj = edgeStartTangent(piece, ej);
    const endI = offs[i][offs[i].length - 1];
    const startJ = offs[j][0];

    const mirrorJ = MIRROR_FINISHES.has(ej.finish) && isStraight(piece, ej) && ej.allowance > 0;
    const mirrorI = MIRROR_FINISHES.has(ei.finish) && isStraight(piece, ei) && ei.allowance > 0;

    if (mirrorJ && !mirrorI) {
      // Borde j se dobla: el margen de i se refleja sobre la línea de doblez de j.
      const [ja] = edgeEnds(piece, ej);
      const F = lineIntersect(endI, ti, ja, tj);
      if (F) {
        const p2 = add(endI, ti);
        const r1 = reflectPoint(endI, ja, tj);
        const r2 = reflectPoint(p2, ja, tj);
        const G = lineIntersect(r1, sub(r2, r1), startJ, tj);
        if (G) {
          offs[i] = setEnd(offs[i], F.pt);
          offs[j] = setStart(offs[j], G.pt);
          joins[k] = [];
          continue;
        }
      }
    } else if (mirrorI && !mirrorJ) {
      const [ia] = edgeEnds(piece, ei);
      const F = lineIntersect(startJ, tj, ia, ti);
      if (F) {
        const p2 = add(startJ, tj);
        const r1 = reflectPoint(startJ, ia, ti);
        const r2 = reflectPoint(p2, ia, ti);
        const G = lineIntersect(r1, sub(r2, r1), endI, ti);
        if (G) {
          offs[i] = setEnd(offs[i], G.pt);
          offs[j] = setStart(offs[j], F.pt);
          continue;
        }
      }
    }

    if (dist(endI, startJ) < 1e-6) continue;

    // Esquina cóncava: las paralelas se cruzan antes de sus extremos.
    const cross = trimIntersection(offs[i], offs[j]);
    if (cross) {
      offs[i] = [...offs[i].slice(0, cross.ai), cross.pt];
      offs[j] = [cross.pt, ...offs[j].slice(cross.bi)];
      continue;
    }

    const hit = lineIntersect(endI, ti, startJ, tj);
    const maxA = Math.max(ei.allowance, ej.allowance);
    if (hit && hit.t >= -1e-6 && hit.u <= 1e-6) {
      const miter = dist(hit.pt, node);
      if (miter <= Math.max(4 * maxA, 6)) {
        offs[i] = setEnd(offs[i], hit.pt);
        offs[j] = setStart(offs[j], hit.pt);
        continue;
      }
      // Inglete demasiado largo: se corta en chaflán perpendicular a la bisectriz.
      const bis = norm(sub(hit.pt, node));
      const cap = add(node, mul(bis, Math.max(2 * maxA, 6)));
      const capDir = { x: -bis.y, y: bis.x };
      const a1 = lineIntersect(endI, ti, cap, capDir);
      const a2 = lineIntersect(startJ, tj, cap, capDir);
      if (a1 && a2) {
        offs[i] = setEnd(offs[i], a1.pt);
        offs[j] = setStart(offs[j], a2.pt);
        continue;
      }
    }
    // Tangentes paralelas o caso degenerado: unir directamente.
    if (len(sub(endI, startJ)) > 1e-6) joins[k] = [];
  }

  const points: Pt[] = [];
  const edgeOffsets: CutOutline['edgeOffsets'] = [];
  for (let k = 0; k < n; k++) {
    edgeOffsets.push({ edgeId: E[k].id, points: offs[k] });
    for (const p of offs[k]) {
      const last = points[points.length - 1];
      if (!last || dist(last, p) > 1e-6) points.push(p);
    }
    points.push(...joins[k]);
  }
  if (points.length > 1 && dist(points[0], points[points.length - 1]) < 1e-6) points.pop();
  return { points, edgeOffsets };
}
