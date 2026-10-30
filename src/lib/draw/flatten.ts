import type { PathCmd } from './paths';
import { flattenCubic } from '../geom/bezier';
import type { Pt } from '../geom/vec';

/** Divide comandos en subtrayectos y los convierte en polilíneas. */
export function cmdsToPolylines(cmds: PathCmd[], tol = 0.1): { pts: Pt[]; closed: boolean }[] {
  const out: { pts: Pt[]; closed: boolean }[] = [];
  let cur: Pt[] = [];
  let pos: Pt = { x: 0, y: 0 };
  const flush = (closed: boolean) => {
    if (cur.length > 1) out.push({ pts: cur, closed });
    cur = [];
  };
  for (const c of cmds) {
    if (c.op === 'M') {
      flush(false);
      cur = [c.p];
      pos = c.p;
    } else if (c.op === 'L') {
      cur.push(c.p);
      pos = c.p;
    } else if (c.op === 'C') {
      const pts = flattenCubic({ p0: pos, c1: c.c1, c2: c.c2, p3: c.p }, tol);
      cur.push(...pts.slice(1));
      pos = c.p;
    } else {
      if (cur.length > 1 && Math.hypot(cur[0].x - cur[cur.length - 1].x, cur[0].y - cur[cur.length - 1].y) < 1e-6) cur.pop();
      const first = cur[0];
      flush(true);
      if (first) pos = first;
    }
  }
  flush(false);
  return out;
}
