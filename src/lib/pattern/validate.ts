import { Pt, segIntersect, distToSegment, pointInPolygon, dist } from '../geom/vec';
import { cutOutline, CutOutline } from './offset';
import { edgeById, edgeLength, edgePolyline, seamPolygon } from './outline';
import { formatLength } from '../units';
import type { GeneratedPattern, Issue, Piece, SeamRelation } from './types';

function selfIntersections(poly: Pt[]): number {
  const n = poly.length;
  let count = 0;
  for (let i = 0; i < n; i++) {
    const a = poly[i];
    const b = poly[(i + 1) % n];
    for (let j = i + 2; j < n; j++) {
      if (i === 0 && j === n - 1) continue; // segmentos adyacentes por el cierre
      const c = poly[j];
      const d = poly[(j + 1) % n];
      const hit = segIntersect(a, b, c, d, -1e-9);
      if (hit) count++;
    }
  }
  return count;
}

function minDistToPolyline(p: Pt, poly: Pt[]): number {
  let m = Infinity;
  for (let i = 1; i < poly.length; i++) m = Math.min(m, distToSegment(p, poly[i - 1], poly[i]));
  return m;
}

export function validatePiece(piece: Piece, cut?: CutOutline): Issue[] {
  const issues: Issue[] = [];
  const E = piece.edges;
  if (E.length < 2) {
    issues.push({ level: 'error', code: 'pocos-bordes', message: 'La pieza necesita al menos dos bordes.', pieceId: piece.id });
    return issues;
  }
  // Contorno cerrado y encadenado.
  for (let i = 0; i < E.length; i++) {
    const next = E[(i + 1) % E.length];
    if (E[i].to !== next.from) {
      issues.push({
        level: 'error',
        code: 'contorno-abierto',
        message: `El borde «${E[i].label}» no conecta con «${next.label}».`,
        pieceId: piece.id,
        edgeIds: [E[i].id, next.id]
      });
    }
    if (edgeLength(piece, E[i]) < 0.5) {
      issues.push({ level: 'error', code: 'borde-nulo', message: `El borde «${E[i].label}» mide casi cero.`, pieceId: piece.id, edgeIds: [E[i].id] });
    }
    const a = E[i].allowance;
    if (!(a >= 0) || a > 120) {
      issues.push({ level: 'error', code: 'margen-invalido', message: `Margen fuera de rango en «${E[i].label}».`, pieceId: piece.id, edgeIds: [E[i].id] });
    }
    if (E[i].finish === 'doblez' && a !== 0) {
      issues.push({ level: 'error', code: 'margen-doblez', message: `«${E[i].label}» va al doblez: no lleva margen.`, pieceId: piece.id, edgeIds: [E[i].id] });
    }
  }
  if (issues.some((i) => i.code === 'contorno-abierto')) return issues;

  const seam = seamPolygon(piece, 0.2);
  const si = selfIntersections(seam);
  if (si > 0) {
    issues.push({ level: 'error', code: 'intersecciones', message: 'La línea de costura se cruza consigo misma.', pieceId: piece.id });
  }
  const c = cut ?? cutOutline(piece);
  if (selfIntersections(c.points) > 0) {
    issues.push({ level: 'error', code: 'corte-cruzado', message: 'La línea de corte se cruza consigo misma; revisa márgenes y esquinas.', pieceId: piece.id });
  }
  // Todo el contorno de costura debe quedar dentro del contorno de corte.
  const outside = seam.filter((p) => !pointInPolygon(p, c.points) && minDistToPolyline(p, [...c.points, c.points[0]]) > 0.05);
  if (outside.length) {
    issues.push({ level: 'error', code: 'costura-fuera', message: 'Parte de la línea de costura queda fuera del corte.', pieceId: piece.id });
  }
  // El margen de cada borde se aplica exactamente una vez.
  for (const off of c.edgeOffsets) {
    const e = edgeById(piece, off.edgeId);
    if (e.allowance <= 0 || off.points.length < 3) continue;
    const seamE = edgePolyline(piece, e, 0.05);
    const inner = off.points.slice(1, -1);
    const sample = inner.filter((_, k) => k % Math.max(1, Math.floor(inner.length / 12)) === 0);
    const bad = sample.find((p) => Math.abs(minDistToPolyline(p, seamE) - e.allowance) > 0.3);
    if (bad) {
      issues.push({
        level: 'error',
        code: 'margen-inconsistente',
        message: `El margen de «${e.label}» no es uniforme (${formatLength(minDistToPolyline(bad, seamE), 'cm')} en vez de ${formatLength(e.allowance, 'cm')}).`,
        pieceId: piece.id,
        edgeIds: [e.id]
      });
    }
  }
  // Piquetes dentro de su borde.
  for (const nt of piece.notches) {
    const e = piece.edges.find((x) => x.id === nt.edgeId);
    if (!e) {
      issues.push({ level: 'error', code: 'piquete-huerfano', message: `Piquete sin borde (${nt.id}).`, pieceId: piece.id });
      continue;
    }
    const L = edgeLength(piece, e);
    if (nt.s < 0 || nt.s > L + 0.01) {
      issues.push({ level: 'aviso', code: 'piquete-fuera', message: `Un piquete de «${e.label}» quedó fuera del borde.`, pieceId: piece.id, edgeIds: [e.id] });
    }
  }
  return issues;
}

export interface SeamResult {
  relation: SeamRelation;
  lengthA: number;
  lengthB: number;
  ratio: number;
  ok: boolean;
}

export function seamLengthSide(pieces: Piece[], side: SeamRelation['a']): number {
  let s = 0;
  for (const part of side) {
    const p = pieces.find((x) => x.id === part.pieceId);
    if (!p) return NaN;
    for (const id of part.edgeIds) {
      const e = p.edges.find((x) => x.id === id);
      if (!e) return NaN;
      s += edgeLength(p, e) * (part.factor ?? 1);
    }
  }
  return s;
}

export function evaluateSeams(pieces: Piece[], seams: SeamRelation[]): SeamResult[] {
  return seams.map((relation) => {
    const lengthA = seamLengthSide(pieces, relation.a);
    const lengthB = seamLengthSide(pieces, relation.b);
    const ratio = lengthA / lengthB;
    let ok = Number.isFinite(ratio) && ratio >= relation.ratioMin - 1e-9 && ratio <= relation.ratioMax + 1e-9;
    if (relation.kind === 'igual' && relation.tolerance !== undefined) ok = Math.abs(lengthA - lengthB) <= relation.tolerance;
    return { relation, lengthA, lengthB, ratio, ok };
  });
}

export function validatePattern(gen: GeneratedPattern, cuts?: Map<string, CutOutline>): Issue[] {
  const issues: Issue[] = [];
  for (const p of gen.pieces) issues.push(...validatePiece(p, cuts?.get(p.id)));
  for (const r of evaluateSeams(gen.pieces, gen.seams)) {
    if (!Number.isFinite(r.ratio)) {
      issues.push({ level: 'error', code: 'costura-rota', message: `La costura «${r.relation.label}» hace referencia a bordes inexistentes.` });
      continue;
    }
    if (!r.ok) {
      const diff = r.lengthA - r.lengthB;
      issues.push({
        level: r.relation.kind === 'igual' ? 'error' : 'aviso',
        code: 'costura-no-coincide',
        message:
          r.relation.kind === 'igual'
            ? `«${r.relation.label}»: los lados difieren ${formatLength(Math.abs(diff), 'cm')}.`
            : `«${r.relation.label}»: relación ${r.ratio.toFixed(2)} fuera del rango ${r.relation.ratioMin}–${r.relation.ratioMax}.`
      });
    }
  }
  for (const c of gen.checks) {
    if (Math.abs(c.measured - c.target) > c.tolerance) {
      issues.push({
        level: 'error',
        code: 'medida-no-coincide',
        message: `${c.label}: el patrón mide ${formatLength(c.measured, 'cm')} y debería medir ${formatLength(c.target, 'cm')}.`
      });
    }
  }
  return issues;
}

export function distanceBetween(a: Pt, b: Pt) {
  return dist(a, b);
}
