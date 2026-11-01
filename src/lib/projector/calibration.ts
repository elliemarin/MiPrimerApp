import type { Pt } from '../geom/vec';
import { applyH, convexQuad, invertH, localScale, multiplyH, scaleH, solveHomography, type Homography } from './homography';

/* Calibración del proyector: convierte milímetros de la mesa en píxeles de
 * pantalla. Se guarda por dispositivo; si cambian la ventana, la resolución o
 * la posición del proyector hay que repetirla. */

export type CalibrationMethod = 'estimada' | 'regla' | 'esquinas';
export interface ScreenSize { w: number; h: number }
export interface ProjectorCalibration {
  version: 1;
  method: CalibrationMethod;
  /** Mesa (mm) → pantalla (px CSS). */
  H: Homography;
  screen: ScreenSize;
  /** Rectángulo real usado en la calibración de cuatro esquinas. */
  rect?: { w: number; h: number };
  corners?: Pt[];
  date: string;
}

export const CALIBRATION_KEY = 'hilvana-proyector-calibracion';
/** Supuesto inicial sin calibrar: la imagen cubre 1 m de ancho. */
export const ESTIMATED_WIDTH_MM = 1000;

export function estimatedCalibration(screen: ScreenSize): ProjectorCalibration {
  const s = screen.w / ESTIMATED_WIDTH_MM;
  return { version: 1, method: 'estimada', H: scaleH(s, s, screen.w / 2, screen.h / 2), screen, date: new Date().toISOString() };
}

const validH = (H: unknown): H is Homography => Array.isArray(H) && H.length === 9 && H.every(v => typeof v === 'number' && Number.isFinite(v)) && !!invertH(H as Homography);

export function parseCalibration(raw: unknown): ProjectorCalibration | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const c = raw as Partial<ProjectorCalibration>;
  if (c.version !== 1 || !validH(c.H) || !c.screen || !(c.screen.w > 0) || !(c.screen.h > 0) || !['estimada', 'regla', 'esquinas'].includes(c.method ?? '')) return undefined;
  return { version: 1, method: c.method!, H: c.H, screen: { w: c.screen.w, h: c.screen.h }, rect: c.rect, corners: c.corners, date: typeof c.date === 'string' ? c.date : '' };
}

export function loadCalibration(): ProjectorCalibration | undefined {
  try { return parseCalibration(JSON.parse(localStorage.getItem(CALIBRATION_KEY) ?? 'null')); } catch { return undefined; }
}
export function saveCalibration(c: ProjectorCalibration): void {
  try { localStorage.setItem(CALIBRATION_KEY, JSON.stringify(c)); } catch { /* Navegación privada: la calibración dura esta sesión. */ }
}
export function clearCalibration(): void {
  try { localStorage.removeItem(CALIBRATION_KEY); } catch { /* Sin almacenamiento. */ }
}

/** A different window size invalidates the pixel mapping. */
export function screenChanged(c: ProjectorCalibration, screen: ScreenSize): boolean {
  return Math.abs(c.screen.w - screen.w) > 2 || Math.abs(c.screen.h - screen.h) > 2;
}

/** Scales a stored mapping to a new window size (only as a temporary estimate). */
export function rescaleToScreen(c: ProjectorCalibration, screen: ScreenSize): ProjectorCalibration {
  const k = scaleH(screen.w / c.screen.w, screen.h / c.screen.h, 0, 0);
  return { ...c, H: multiplyH(k, c.H), screen };
}

/** Quick calibration: the projected square of `nominal` mm measured on the table. */
export function rulerCalibration(prev: ProjectorCalibration, center: Pt, measured: { w: number; h: number }, nominal = 100): ProjectorCalibration | undefined {
  if (!(measured.w >= nominal * .2 && measured.w <= nominal * 5 && measured.h >= nominal * .2 && measured.h <= nominal * 5)) return undefined;
  const kx = nominal / measured.w, ky = nominal / measured.h;
  const S = scaleH(kx, ky, center.x * (1 - kx), center.y * (1 - ky));
  return { ...prev, method: prev.method === 'esquinas' ? 'esquinas' : 'regla', H: multiplyH(prev.H, S), date: new Date().toISOString() };
}

/** Rectangle corners in table mm: top-left, top-right, bottom-right, bottom-left. */
export const rectCorners = (w: number, h: number): Pt[] => [{ x: 0, y: 0 }, { x: w, y: 0 }, { x: w, y: h }, { x: 0, y: h }];

/** Precise calibration: four screen handles placed on known table marks. */
export function cornerCalibration(rect: { w: number; h: number }, corners: Pt[], screen: ScreenSize): ProjectorCalibration | undefined {
  if (!(rect.w >= 50 && rect.h >= 50) || !convexQuad(corners)) return undefined;
  const H = solveHomography(rectCorners(rect.w, rect.h), corners);
  if (!H || !invertH(H)) return undefined;
  return { version: 1, method: 'esquinas', H, screen, rect, corners: corners.map(p => ({ ...p })), date: new Date().toISOString() };
}

/** Table rectangle (mm) visible on the screen, using its four corners. */
export function visibleTable(H: Homography, screen: ScreenSize): { minX: number; minY: number; maxX: number; maxY: number } | undefined {
  const inv = invertH(H);
  if (!inv) return undefined;
  const pts = [{ x: 0, y: 0 }, { x: screen.w, y: 0 }, { x: screen.w, y: screen.h }, { x: 0, y: screen.h }].map(p => applyH(inv, p));
  if (!pts.every(p => Number.isFinite(p.x) && Number.isFinite(p.y))) return undefined;
  return { minX: Math.min(...pts.map(p => p.x)), minY: Math.min(...pts.map(p => p.y)), maxX: Math.max(...pts.map(p => p.x)), maxY: Math.max(...pts.map(p => p.y)) };
}

/** Plain-language checks shown after calibrating. */
export function calibrationNotes(c: ProjectorCalibration): { pxPerMm: number; notes: string[] } {
  const inv = invertH(c.H);
  const center = inv ? applyH(inv, { x: c.screen.w / 2, y: c.screen.h / 2 }) : { x: 0, y: 0 };
  const pxPerMm = localScale(c.H, center), notes: string[] = [];
  if (c.method === 'estimada') notes.push('Sin calibrar: la escala es una suposición. No cortes tela hasta calibrar.');
  if (pxPerMm < .6) notes.push(`Cada píxel cubre ${(1 / pxPerMm).toFixed(1)} mm: acerca el proyector o usa mayor resolución para trazos más finos.`);
  if (inv) {
    const scales = [{ x: 0, y: 0 }, { x: c.screen.w, y: 0 }, { x: c.screen.w, y: c.screen.h }, { x: 0, y: c.screen.h }].map(p => localScale(c.H, applyH(inv, p)));
    const spread = (Math.max(...scales) - Math.min(...scales)) / pxPerMm;
    if (spread > .25) notes.push('La imagen está muy inclinada: endereza el proyector para que la nitidez sea pareja en toda la mesa.');
  }
  return { pxPerMm, notes };
}
