import type { PathCmd } from './paths';
import type { Pt } from '../geom/vec';

const NUM = /-?(?:\d+\.?\d*|\.\d+)(?:e[-+]?\d+)?/gi;

function tokenize(d: string): (string | number)[] {
  const out: (string | number)[] = [];
  const re = /([MmLlHhVvCcSsQqTtAaZz])|(-?(?:\d+\.?\d*|\.\d+)(?:e[-+]?\d+)?)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(d))) out.push(m[1] ? m[1] : parseFloat(m[2]));
  return out;
}

/** Convierte un arco SVG en cúbicas. */
function arcToCubics(p0: Pt, rx: number, ry: number, phiDeg: number, large: number, sweep: number, p: Pt): PathCmd[] {
  if (rx === 0 || ry === 0) return [{ op: 'L', p }];
  const phi = (phiDeg * Math.PI) / 180;
  const cos = Math.cos(phi);
  const sin = Math.sin(phi);
  const dx = (p0.x - p.x) / 2;
  const dy = (p0.y - p.y) / 2;
  const x1 = cos * dx + sin * dy;
  const y1 = -sin * dx + cos * dy;
  rx = Math.abs(rx);
  ry = Math.abs(ry);
  const lam = (x1 * x1) / (rx * rx) + (y1 * y1) / (ry * ry);
  if (lam > 1) {
    rx *= Math.sqrt(lam);
    ry *= Math.sqrt(lam);
  }
  const sign = large === sweep ? -1 : 1;
  const num = rx * rx * ry * ry - rx * rx * y1 * y1 - ry * ry * x1 * x1;
  const den = rx * rx * y1 * y1 + ry * ry * x1 * x1;
  const co = sign * Math.sqrt(Math.max(0, num / den));
  const cx1 = (co * rx * y1) / ry;
  const cy1 = (-co * ry * x1) / rx;
  const cx = cos * cx1 - sin * cy1 + (p0.x + p.x) / 2;
  const cy = sin * cx1 + cos * cy1 + (p0.y + p.y) / 2;
  const ang = (ux: number, uy: number, vx: number, vy: number) => {
    const a = Math.atan2(ux * vy - uy * vx, ux * vx + uy * vy);
    return a;
  };
  const t1 = ang(1, 0, (x1 - cx1) / rx, (y1 - cy1) / ry);
  let dt = ang((x1 - cx1) / rx, (y1 - cy1) / ry, (-x1 - cx1) / rx, (-y1 - cy1) / ry);
  if (!sweep && dt > 0) dt -= 2 * Math.PI;
  if (sweep && dt < 0) dt += 2 * Math.PI;
  const segs = Math.ceil(Math.abs(dt) / (Math.PI / 2));
  const out: PathCmd[] = [];
  const delta = dt / segs;
  const k = (4 / 3) * Math.tan(delta / 4);
  let a = t1;
  const pointAt = (t: number) => ({ x: cx + rx * Math.cos(t) * cos - ry * Math.sin(t) * sin, y: cy + rx * Math.cos(t) * sin + ry * Math.sin(t) * cos });
  const derivAt = (t: number) => ({ x: -rx * Math.sin(t) * cos - ry * Math.cos(t) * sin, y: -rx * Math.sin(t) * sin + ry * Math.cos(t) * cos });
  for (let i = 0; i < segs; i++) {
    const b = a + delta;
    const pa = pointAt(a);
    const pb = pointAt(b);
    const da = derivAt(a);
    const db = derivAt(b);
    out.push({ op: 'C', c1: { x: pa.x + k * da.x, y: pa.y + k * da.y }, c2: { x: pb.x - k * db.x, y: pb.y - k * db.y }, p: i === segs - 1 ? p : pb });
    a = b;
  }
  return out;
}

/** Interpreta un atributo d de SVG y lo convierte en comandos absolutos M/L/C/Z. */
export function parseSvgPath(d: string): PathCmd[] {
  const t = tokenize(d);
  const out: PathCmd[] = [];
  let i = 0;
  let cmd = '';
  let cur: Pt = { x: 0, y: 0 };
  let start: Pt = { x: 0, y: 0 };
  let lastCtrl: Pt | null = null;
  let lastQ: Pt | null = null;
  const n = () => t[i++] as number;
  while (i < t.length) {
    if (typeof t[i] === 'string') cmd = t[i++] as string;
    const rel = cmd === cmd.toLowerCase();
    const C = cmd.toUpperCase();
    const ox = rel ? cur.x : 0;
    const oy = rel ? cur.y : 0;
    switch (C) {
      case 'M': {
        cur = { x: ox + n(), y: oy + n() };
        start = cur;
        out.push({ op: 'M', p: cur });
        cmd = rel ? 'l' : 'L';
        lastCtrl = lastQ = null;
        break;
      }
      case 'L':
        cur = { x: ox + n(), y: oy + n() };
        out.push({ op: 'L', p: cur });
        lastCtrl = lastQ = null;
        break;
      case 'H':
        cur = { x: (rel ? cur.x : 0) + n(), y: cur.y };
        out.push({ op: 'L', p: cur });
        lastCtrl = lastQ = null;
        break;
      case 'V':
        cur = { x: cur.x, y: (rel ? cur.y : 0) + n() };
        out.push({ op: 'L', p: cur });
        lastCtrl = lastQ = null;
        break;
      case 'C': {
        const c1 = { x: ox + n(), y: oy + n() };
        const c2 = { x: ox + n(), y: oy + n() };
        cur = { x: ox + n(), y: oy + n() };
        out.push({ op: 'C', c1, c2, p: cur });
        lastCtrl = c2;
        lastQ = null;
        break;
      }
      case 'S': {
        const c1 = lastCtrl ? { x: 2 * cur.x - lastCtrl.x, y: 2 * cur.y - lastCtrl.y } : cur;
        const c2 = { x: ox + n(), y: oy + n() };
        cur = { x: ox + n(), y: oy + n() };
        out.push({ op: 'C', c1, c2, p: cur });
        lastCtrl = c2;
        lastQ = null;
        break;
      }
      case 'Q': {
        const q = { x: ox + n(), y: oy + n() };
        const p = { x: ox + n(), y: oy + n() };
        out.push({ op: 'C', c1: { x: cur.x + (2 / 3) * (q.x - cur.x), y: cur.y + (2 / 3) * (q.y - cur.y) }, c2: { x: p.x + (2 / 3) * (q.x - p.x), y: p.y + (2 / 3) * (q.y - p.y) }, p });
        cur = p;
        lastQ = q;
        lastCtrl = null;
        break;
      }
      case 'T': {
        const q: Pt = lastQ ? { x: 2 * cur.x - lastQ.x, y: 2 * cur.y - lastQ.y } : cur;
        const p = { x: ox + n(), y: oy + n() };
        out.push({ op: 'C', c1: { x: cur.x + (2 / 3) * (q.x - cur.x), y: cur.y + (2 / 3) * (q.y - cur.y) }, c2: { x: p.x + (2 / 3) * (q.x - p.x), y: p.y + (2 / 3) * (q.y - p.y) }, p });
        cur = p;
        lastQ = q;
        lastCtrl = null;
        break;
      }
      case 'A': {
        const rx = n();
        const ry = n();
        const rot = n();
        const large = n();
        const sweep = n();
        const p = { x: ox + n(), y: oy + n() };
        out.push(...arcToCubics(cur, rx, ry, rot, large, sweep, p));
        cur = p;
        lastCtrl = lastQ = null;
        break;
      }
      case 'Z':
        out.push({ op: 'Z' });
        cur = start;
        lastCtrl = lastQ = null;
        break;
      default:
        i++;
    }
  }
  return out;
}

export { NUM };
