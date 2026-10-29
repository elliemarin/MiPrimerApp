import { Pt, Mat, matApply, BBox } from '../geom/vec';
import { cubicAt } from '../geom/bezier';
import { nodeById } from '../pattern/outline';
import type { Piece, PEdge } from '../pattern/types';

export type PathCmd =
  | { op: 'M'; p: Pt }
  | { op: 'L'; p: Pt }
  | { op: 'C'; c1: Pt; c2: Pt; p: Pt }
  | { op: 'Z' };

export function polylineCmds(pts: Pt[], closed: boolean): PathCmd[] {
  if (!pts.length) return [];
  const cmds: PathCmd[] = [{ op: 'M', p: pts[0] }];
  for (let i = 1; i < pts.length; i++) cmds.push({ op: 'L', p: pts[i] });
  if (closed) cmds.push({ op: 'Z' });
  return cmds;
}

export function edgeCmds(piece: Piece, e: PEdge, withMove = true): PathCmd[] {
  const a = nodeById(piece, e.from);
  const b = nodeById(piece, e.to);
  const out: PathCmd[] = withMove ? [{ op: 'M', p: { x: a.x, y: a.y } }] : [];
  if (e.kind === 'cubic' && e.c1 && e.c2) out.push({ op: 'C', c1: e.c1, c2: e.c2, p: { x: b.x, y: b.y } });
  else out.push({ op: 'L', p: { x: b.x, y: b.y } });
  return out;
}

export function pieceSeamCmds(piece: Piece): PathCmd[] {
  if (!piece.edges.length) return [];
  const out: PathCmd[] = [];
  piece.edges.forEach((e, i) => out.push(...edgeCmds(piece, e, i === 0)));
  out.push({ op: 'Z' });
  return out;
}

export function transformCmds(cmds: PathCmd[], m: Mat): PathCmd[] {
  return cmds.map((c) => {
    switch (c.op) {
      case 'M':
      case 'L':
        return { op: c.op, p: matApply(m, c.p) };
      case 'C':
        return { op: 'C', c1: matApply(m, c.c1), c2: matApply(m, c.c2), p: matApply(m, c.p) };
      default:
        return c;
    }
  });
}

export function cmdsBBox(cmds: PathCmd[]): BBox {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  const acc = (p: Pt) => {
    if (p.x < minX) minX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.x > maxX) maxX = p.x;
    if (p.y > maxY) maxY = p.y;
  };
  let cur: Pt = { x: 0, y: 0 };
  for (const c of cmds) {
    if (c.op === 'M' || c.op === 'L') {
      acc(c.p);
      cur = c.p;
    } else if (c.op === 'C') {
      for (let i = 1; i <= 16; i++) acc(cubicAt({ p0: cur, c1: c.c1, c2: c.c2, p3: c.p }, i / 16));
      cur = c.p;
    }
  }
  return { minX, minY, maxX, maxY };
}

const f = (v: number) => (Math.round(v * 1000) / 1000).toString();

export function cmdsToSvg(cmds: PathCmd[]): string {
  return cmds
    .map((c) => {
      switch (c.op) {
        case 'M':
          return `M${f(c.p.x)} ${f(c.p.y)}`;
        case 'L':
          return `L${f(c.p.x)} ${f(c.p.y)}`;
        case 'C':
          return `C${f(c.c1.x)} ${f(c.c1.y)} ${f(c.c2.x)} ${f(c.c2.y)} ${f(c.p.x)} ${f(c.p.y)}`;
        default:
          return 'Z';
      }
    })
    .join(' ');
}
