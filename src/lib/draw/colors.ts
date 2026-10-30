export type Harmony = 'complementaria' | 'analoga' | 'triada' | 'monocromatica';
export interface Hsl { h: number; s: number; l: number }
export const wrapHue = (h: number) => ((h % 360) + 360) % 360;
const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));

export function hslToHex({ h, s, l }: Hsl): string {
  const sat = clamp(s, 0, 100) / 100;
  const light = clamp(l, 0, 100) / 100;
  const a = sat * Math.min(light, 1 - light);
  const f = (n: number) => {
    const k = (n + wrapHue(h) / 30) % 12;
    return Math.round(255 * (light - a * Math.max(-1, Math.min(k - 3, 9 - k, 1)))).toString(16).padStart(2, '0');
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

export function hexToHsl(hex: string): Hsl | null {
  if (!/^#[\da-f]{6}$/i.test(hex)) return null;
  const rgb = [hex.slice(1, 3), hex.slice(3, 5), hex.slice(5, 7)].map((x) => parseInt(x, 16) / 255);
  const [r, g, b] = rgb;
  const max = Math.max(...rgb), min = Math.min(...rgb), d = max - min;
  const l = (max + min) / 2;
  const s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1));
  const h = d === 0 ? 0 : max === r ? 60 * (((g - b) / d) % 6) : max === g ? 60 * ((b - r) / d + 2) : 60 * ((r - g) / d + 4);
  return { h: wrapHue(h), s: s * 100, l: l * 100 };
}

export function harmonyColors(base: Hsl, harmony: Harmony): string[] {
  if (harmony === 'monocromatica') return [20, 35, 50, 65, 80].map((l) => hslToHex({ ...base, l }));
  const offsets = harmony === 'complementaria' ? [0, 180] : harmony === 'analoga' ? [-30, 0, 30] : [0, 120, 240];
  return offsets.map((offset) => hslToHex({ ...base, h: wrapHue(base.h + offset) }));
}

/** Clockwise from the top of a color wheel, in degrees. */
export function wheelHue(x: number, y: number): number {
  return wrapHue(Math.atan2(x, -y) * 180 / Math.PI);
}
