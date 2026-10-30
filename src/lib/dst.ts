// Exportación experimental a Tajima DST: solo puntada recta sobre líneas.
// Unidad DST: 0.1 mm. +Y hacia arriba.
import type { Pt } from './geom/vec';

export interface StitchRun {
  color: string;
  pts: Pt[]; // mm, y hacia abajo
}

export interface Stitch {
  x: number; // 0.1 mm
  y: number;
  kind: 'puntada' | 'salto' | 'color' | 'fin';
}

export const HOOPS: { id: string; label: string; w: number; h: number }[] = [
  { id: '100x100', label: '10 × 10 cm', w: 100, h: 100 },
  { id: '130x180', label: '13 × 18 cm', w: 130, h: 180 },
  { id: '160x260', label: '16 × 26 cm', w: 160, h: 260 },
  { id: '200x200', label: '20 × 20 cm', w: 200, h: 200 },
  { id: '200x300', label: '20 × 30 cm', w: 200, h: 300 }
];

/** Remuestrea una polilínea a puntadas de longitud fija. */
export function resample(pts: Pt[], stitch: number): Pt[] {
  if (pts.length < 2) return pts;
  const out: Pt[] = [pts[0]];
  let carry = 0;
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1];
    const b = pts[i];
    const seg = Math.hypot(b.x - a.x, b.y - a.y);
    let pos = stitch - carry;
    while (pos <= seg) {
      const t = pos / seg;
      out.push({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
      pos += stitch;
    }
    carry = seg - (pos - stitch);
  }
  const last = pts[pts.length - 1];
  const prev = out[out.length - 1];
  if (Math.hypot(last.x - prev.x, last.y - prev.y) > 0.3) out.push(last);
  return out;
}

/** Secuencia de puntadas absolutas (0.1 mm) centradas en el origen. */
export function planStitches(runs: StitchRun[], stitchMm = 2.5): { stitches: Stitch[]; extents: { minX: number; maxX: number; minY: number; maxY: number }; colors: number } {
  const all = runs.flatMap((r) => r.pts);
  const cx = all.length ? (Math.min(...all.map((p) => p.x)) + Math.max(...all.map((p) => p.x))) / 2 : 0;
  const cy = all.length ? (Math.min(...all.map((p) => p.y)) + Math.max(...all.map((p) => p.y))) / 2 : 0;
  const st: Stitch[] = [];
  let color = runs[0]?.color;
  let colors = runs.length ? 1 : 0;
  for (const r of runs) {
    if (r.color !== color) {
      st.push({ x: st[st.length - 1]?.x ?? 0, y: st[st.length - 1]?.y ?? 0, kind: 'color' });
      color = r.color;
      colors++;
    }
    const pts = resample(r.pts, stitchMm).map((p) => ({ x: Math.round((p.x - cx) * 10), y: Math.round(-(p.y - cy) * 10) }));
    if (!pts.length) continue;
    st.push({ ...pts[0], kind: 'salto' });
    for (let i = 1; i < pts.length; i++) st.push({ ...pts[i], kind: 'puntada' });
  }
  st.push({ x: st[st.length - 1]?.x ?? 0, y: st[st.length - 1]?.y ?? 0, kind: 'fin' });
  const xs = st.map((s) => s.x);
  const ys = st.map((s) => s.y);
  return { stitches: st, extents: { minX: Math.min(0, ...xs), maxX: Math.max(0, ...xs), minY: Math.min(0, ...ys), maxY: Math.max(0, ...ys) }, colors };
}

function encode(dx: number, dy: number, flags: number): [number, number, number] {
  let b0 = 0;
  let b1 = 0;
  let b2 = 0;
  if (dx >= 41) { b2 |= 0x04; dx -= 81; }
  if (dx <= -41) { b2 |= 0x08; dx += 81; }
  if (dx >= 14) { b1 |= 0x04; dx -= 27; }
  if (dx <= -14) { b1 |= 0x08; dx += 27; }
  if (dx >= 5) { b0 |= 0x04; dx -= 9; }
  if (dx <= -5) { b0 |= 0x08; dx += 9; }
  if (dx >= 2) { b1 |= 0x01; dx -= 3; }
  if (dx <= -2) { b1 |= 0x02; dx += 3; }
  if (dx >= 1) { b0 |= 0x01; dx -= 1; }
  if (dx <= -1) { b0 |= 0x02; dx += 1; }
  if (dy >= 41) { b2 |= 0x20; dy -= 81; }
  if (dy <= -41) { b2 |= 0x10; dy += 81; }
  if (dy >= 14) { b1 |= 0x20; dy -= 27; }
  if (dy <= -14) { b1 |= 0x10; dy += 27; }
  if (dy >= 5) { b0 |= 0x20; dy -= 9; }
  if (dy <= -5) { b0 |= 0x10; dy += 9; }
  if (dy >= 2) { b1 |= 0x80; dy -= 3; }
  if (dy <= -2) { b1 |= 0x40; dy += 3; }
  if (dy >= 1) { b0 |= 0x80; dy -= 1; }
  if (dy <= -1) { b0 |= 0x40; dy += 1; }
  b2 |= 0x03 | flags;
  return [b0, b1, b2];
}

export function decodeRecord(b0: number, b1: number, b2: number): { dx: number; dy: number; jump: boolean; color: boolean; end: boolean } {
  const bit = (b: number, m: number) => ((b & m) !== 0 ? 1 : 0);
  const dx = bit(b0, 0x01) - bit(b0, 0x02) + 9 * (bit(b0, 0x04) - bit(b0, 0x08)) + 3 * (bit(b1, 0x01) - bit(b1, 0x02)) + 27 * (bit(b1, 0x04) - bit(b1, 0x08)) + 81 * (bit(b2, 0x04) - bit(b2, 0x08));
  const dy = bit(b0, 0x80) - bit(b0, 0x40) + 9 * (bit(b0, 0x20) - bit(b0, 0x10)) + 3 * (bit(b1, 0x80) - bit(b1, 0x40)) + 27 * (bit(b1, 0x20) - bit(b1, 0x10)) + 81 * (bit(b2, 0x20) - bit(b2, 0x10));
  return { dx, dy, jump: (b2 & 0x80) !== 0 && (b2 & 0x40) === 0, color: (b2 & 0xc0) === 0xc0 && !(b0 === 0 && b1 === 0 && b2 === 0xf3), end: b0 === 0 && b1 === 0 && b2 === 0xf3 };
}

/** Escribe el archivo DST (cabecera de 512 bytes y registros de 3 bytes). */
export function writeDst(name: string, plan: ReturnType<typeof planStitches>): Uint8Array {
  const recs: number[] = [];
  let x = 0;
  let y = 0;
  let count = 0;
  const move = (tx: number, ty: number, jump: boolean) => {
    // Los movimientos de más de 12.1 mm se dividen en saltos de ±121.
    const dx = tx - x;
    const dy = ty - y;
    const steps = Math.max(1, Math.ceil(Math.max(Math.abs(dx), Math.abs(dy)) / 121));
    for (let i = 0; i < steps; i++) {
      const sx = Math.round((dx * (i + 1)) / steps) - Math.round((dx * i) / steps);
      const sy = Math.round((dy * (i + 1)) / steps) - Math.round((dy * i) / steps);
      recs.push(...encode(sx, sy, jump || steps > 1 ? 0x80 : 0));
      count++;
    }
    x = tx;
    y = ty;
  };
  for (const s of plan.stitches) {
    if (s.kind === 'puntada') move(s.x, s.y, false);
    else if (s.kind === 'salto') move(s.x, s.y, true);
    else if (s.kind === 'color') {
      recs.push(0, 0, 0xc3);
      count++;
    } else {
      recs.push(0, 0, 0xf3);
    }
  }
  const e = plan.extents;
  const pad = (v: number, n: number) => String(Math.abs(Math.round(v))).padStart(n, ' ');
  const header =
    `LA:${name.slice(0, 16).padEnd(16, ' ')}\r` +
    `ST:${String(count).padStart(7, ' ')}\r` +
    `CO:${String(Math.max(0, plan.colors - 1)).padStart(3, ' ')}\r` +
    `+X:${pad(e.maxX, 5)}\r-X:${pad(e.minX, 5)}\r+Y:${pad(e.maxY, 5)}\r-Y:${pad(e.minY, 5)}\r` +
    `AX:+${pad(x, 5)}\rAY:+${pad(y, 5)}\rMX:+    0\rMY:+    0\rPD:******\r\x1a`;
  const out = new Uint8Array(512 + recs.length);
  out.fill(0x20, 0, 512);
  for (let i = 0; i < header.length && i < 512; i++) out[i] = header.charCodeAt(i) & 0xff;
  out.set(recs, 512);
  return out;
}

/** Lee los desplazamientos de un DST (para verificar la exportación). */
export function readDst(bytes: Uint8Array): { pts: { x: number; y: number; jump: boolean }[]; colors: number } {
  const pts: { x: number; y: number; jump: boolean }[] = [];
  let x = 0;
  let y = 0;
  let colors = 1;
  for (let i = 512; i + 2 < bytes.length; i += 3) {
    const r = decodeRecord(bytes[i], bytes[i + 1], bytes[i + 2]);
    if (r.end) break;
    if (r.color) {
      colors++;
      continue;
    }
    x += r.dx;
    y += r.dy;
    pts.push({ x, y, jump: r.jump });
  }
  return { pts, colors };
}
