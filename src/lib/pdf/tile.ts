import type { BBox } from '../geom/vec';

export const LETTER_MM = { w: 215.9, h: 279.4 };

export interface TileSettings {
  /** Margen no imprimible en cada lado (mm). */
  margin: number;
  /** Solapamiento entre hojas contiguas (mm). */
  overlap: number;
  orientation: 'vertical' | 'horizontal';
  /** Franja de información al pie, dentro del área imprimible (mm). */
  footer: number;
}

export const DEFAULT_TILE: TileSettings = { margin: 8, overlap: 12, orientation: 'vertical', footer: 13 };

export interface Tile {
  row: number;
  col: number;
  code: string;
  /** Coordenadas del diseño (mm) en la esquina superior izquierda del área de contenido. */
  x: number;
  y: number;
}

export interface TileGrid {
  pageW: number;
  pageH: number;
  /** Área de contenido en la hoja, medida desde la esquina superior izquierda. */
  content: { x: number; y: number; w: number; h: number };
  stepX: number;
  stepY: number;
  cols: number;
  rows: number;
  tiles: Tile[];
}

export function rowLetter(r: number): string {
  let s = '';
  let n = r;
  do {
    s = String.fromCharCode(65 + (n % 26)) + s;
    n = Math.floor(n / 26) - 1;
  } while (n >= 0);
  return s;
}

export function tileCode(row: number, col: number) {
  return `${rowLetter(row)}${col + 1}`;
}

export function pageSize(s: TileSettings) {
  return s.orientation === 'vertical' ? { w: LETTER_MM.w, h: LETTER_MM.h } : { w: LETTER_MM.h, h: LETTER_MM.w };
}

export function contentBox(s: TileSettings) {
  const { w, h } = pageSize(s);
  return { x: s.margin, y: s.margin, w: w - 2 * s.margin, h: h - 2 * s.margin - s.footer };
}

export function validateTileSettings(s: TileSettings): string[] {
  const errs: string[] = [];
  const c = contentBox(s);
  if (s.margin < 0 || s.margin > 40) errs.push('El margen no imprimible debe estar entre 0 y 40 mm.');
  if (s.overlap < 0 || s.overlap > Math.min(c.w, c.h) / 3) errs.push('El solapamiento es demasiado grande para el área útil.');
  if (c.w < 50 || c.h < 50) errs.push('El área útil es demasiado pequeña.');
  return errs;
}

/** Divide el área ocupada por el diseño en hojas según el área útil y el solapamiento. */
export function computeGrid(bbox: BBox, s: TileSettings): TileGrid {
  const { w: pageW, h: pageH } = pageSize(s);
  const content = contentBox(s);
  const stepX = content.w - s.overlap;
  const stepY = content.h - s.overlap;
  const W = bbox.maxX - bbox.minX;
  const H = bbox.maxY - bbox.minY;
  const cols = Math.max(1, Math.ceil((W - s.overlap) / stepX - 1e-9));
  const rows = Math.max(1, Math.ceil((H - s.overlap) / stepY - 1e-9));
  // Centrar el diseño dentro de la cuadrícula.
  const gridW = cols * stepX + s.overlap;
  const gridH = rows * stepY + s.overlap;
  const ox = bbox.minX - (gridW - W) / 2;
  const oy = bbox.minY - (gridH - H) / 2;
  const tiles: Tile[] = [];
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) tiles.push({ row: r, col: c, code: tileCode(r, c), x: ox + c * stepX, y: oy + r * stepY });
  return { pageW, pageH, content, stepX, stepY, cols, rows, tiles };
}

export function tileRect(grid: TileGrid, t: Tile): BBox {
  return { minX: t.x, minY: t.y, maxX: t.x + grid.content.w, maxY: t.y + grid.content.h };
}

export function bboxIntersects(a: BBox, b: BBox): boolean {
  return a.minX <= b.maxX && a.maxX >= b.minX && a.minY <= b.maxY && a.maxY >= b.minY;
}
