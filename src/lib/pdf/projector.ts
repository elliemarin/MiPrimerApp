import { PrintScaling } from 'pdf-lib';
import type { Pt } from '../geom/vec';
import { norm, sub } from '../geom/vec';
import { shelfPack } from '../geom/pack';
import type { Drawable, LineStyle } from '../draw/drawable';
import { translateDrawable } from '../draw/drawable';
import type { PathCmd } from '../draw/paths';
import { PdfCanvas, newPdf, type StrokeSpec } from './canvas';
import { embedRasterImages } from './raster';
import type { ExportInfo } from './export';

/* PDF para proyectar: hojas grandes a escala 1:1 con cuadrícula de 10 cm y un
 * cuadro de calibración. Se abre en una app o visor que proyecte sobre la mesa
 * y se calibra con su propia cuadrícula. No está pensado para imprimirse. */

export type ProjectorTheme = 'oscuro' | 'claro';
export interface ProjectorPdfOptions {
  theme: ProjectorTheme;
  /** Ancho útil de acomodo (mm), normalmente el ancho de la tela o de la mesa. */
  width: number;
  grid: boolean;
}
export const DEFAULT_PROJECTOR_PDF: ProjectorPdfOptions = { theme: 'oscuro', width: 1400, grid: true };
/** PDF pages cannot exceed 200 in (5080 mm); keep a safety margin. */
export const MAX_PAGE_MM = 4800;
const MARGIN = 30, HEADER = 150, GAP = 30;

const PROJECTOR_STROKES: Record<LineStyle, StrokeSpec> = {
  corte: { width: 2.6, dash: [], gray: 0 },
  costura: { width: 1.4, dash: [9, 6], gray: 0 },
  doblez: { width: 2, dash: [16, 5, 3, 5], gray: 0 },
  final: { width: 1.4, dash: [6, 5], gray: 0 },
  pespunte: { width: 1.2, dash: [1, 5], gray: 0, cap: 'round' },
  referencia: { width: 1, dash: [], gray: 0 },
  colocacion: { width: 1.4, dash: [10, 6], gray: 0 },
  hilo: { width: 1.8, dash: [], gray: 0 },
  piquete: { width: 2.6, dash: [], gray: 0 },
  bordado: { width: 1.6, dash: [6, 2, 1.5, 2], gray: 0 }
};
/** High-contrast colours: on a black page the fabric stays dark except the lines. */
export const PROJECTOR_COLORS: Record<ProjectorTheme, Record<LineStyle | 'texto' | 'cuadricula' | 'fondo', string>> = {
  oscuro: { corte: '#ffffff', costura: '#ffd84d', doblez: '#ff8ad8', final: '#ffd84d', pespunte: '#9be7ff', referencia: '#b8b8b8', colocacion: '#7fe3ff', hilo: '#a6ff8f', piquete: '#ffffff', bordado: '#ffb86b', texto: '#ffffff', cuadricula: '#3a3a3a', fondo: '#000000' },
  claro: { corte: '#000000', costura: '#7a5a00', doblez: '#a0006e', final: '#7a5a00', pespunte: '#005f7a', referencia: '#666666', colocacion: '#005f7a', hilo: '#1f6e00', piquete: '#000000', bordado: '#8a3d00', texto: '#000000', cuadricula: '#d0d0d0', fondo: '#ffffff' }
};

export interface ProjectorPage { w: number; h: number; pieces: string[] }
/** Splits a fabric-width layout into pages no taller than MAX_PAGE_MM. */
export function layoutProjectorPages(ds: Drawable[], width: number): { pages: ProjectorPage[]; placed: Map<string, { page: number; x: number; y: number }>; tooWide: string[] } {
  const W = Math.max(width, 600), usable = MAX_PAGE_MM - HEADER - 2 * MARGIN;
  const fits = ds.filter(d => d.bbox.maxX - d.bbox.minX <= Math.max(W, MAX_PAGE_MM - 2 * MARGIN) && d.bbox.maxY - d.bbox.minY <= usable);
  const tooWide = ds.filter(d => !fits.includes(d)).map(d => d.name);
  const binW = Math.max(W, ...fits.map(d => d.bbox.maxX - d.bbox.minX));
  const packed = shelfPack(fits.map(d => ({ id: d.id, w: d.bbox.maxX - d.bbox.minX, h: d.bbox.maxY - d.bbox.minY })), binW, usable, GAP);
  const placed = new Map<string, { page: number; x: number; y: number }>();
  const pages: ProjectorPage[] = [];
  for (const slot of packed.placed) {
    placed.set(slot.id, { page: slot.bin, x: MARGIN + slot.x, y: MARGIN + HEADER + slot.y });
    const page = pages[slot.bin] ??= { w: binW + 2 * MARGIN, h: 0, pieces: [] };
    page.h = Math.max(page.h, MARGIN + HEADER + slot.y + slot.h + MARGIN);
    page.pieces.push(slot.id);
  }
  // Whole centimetres keep the 10 cm grid aligned with the page edges.
  for (const page of pages) { page.w = Math.ceil(page.w / 10) * 10; page.h = Math.ceil(page.h / 10) * 10; }
  return { pages, placed, tooWide };
}

const rgb = (hex: string): [number, number, number] => [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255) as [number, number, number];
const square = (x: number, y: number, s: number): PathCmd[] => [{ op: 'M', p: { x, y } }, { op: 'L', p: { x: x + s, y } }, { op: 'L', p: { x: x + s, y: y + s } }, { op: 'L', p: { x, y: y + s } }, { op: 'Z' }];

function arrow(cv: PdfCanvas, tip: Pt, dir: Pt, color: string, size = 6) {
  const back = { x: tip.x - dir.x * size, y: tip.y - dir.y * size }, perp = { x: -dir.y, y: dir.x };
  cv.fillPathRgb([{ op: 'M', p: tip }, { op: 'L', p: { x: back.x + perp.x * size * .4, y: back.y + perp.y * size * .4 } }, { op: 'L', p: { x: back.x - perp.x * size * .4, y: back.y - perp.y * size * .4 } }, { op: 'Z' }], rgb(color));
}

/** One or more large 1:1 pages, ready to project and calibrate. */
export async function buildProjectorPdf(drawables: Drawable[], opts: ProjectorPdfOptions, info: ExportInfo): Promise<{ bytes: Uint8Array; pages: ProjectorPage[]; tooWide: string[] }> {
  if (!drawables.length) throw new Error('No hay piezas para proyectar.');
  const { pages, placed, tooWide } = layoutProjectorPages(drawables, opts.width);
  if (!pages.length) throw new Error('Las piezas son más grandes que una página de proyector (4,8 m). Divide la pieza en Patronaje.');
  const colors = PROJECTOR_COLORS[opts.theme], white = opts.theme === 'oscuro';
  const { doc, font, bold } = await newPdf();
  const images = await embedRasterImages(doc, drawables.flatMap(d => d.images ?? []), info.loadImageFile);
  const textGray = white ? 1 : 0;
  pages.forEach((page, index) => {
    const pdfPage = doc.addPage([page.w * 72 / 25.4, page.h * 72 / 25.4]);
    const cv = new PdfCanvas(pdfPage, font, bold);
    cv.fillPathRgb([{ op: 'M', p: { x: 0, y: 0 } }, { op: 'L', p: { x: page.w, y: 0 } }, { op: 'L', p: { x: page.w, y: page.h } }, { op: 'L', p: { x: 0, y: page.h } }, { op: 'Z' }], rgb(colors.fondo));
    if (opts.grid) {
      const grid = { width: .5, dash: [], gray: 0 };
      for (let x = 0; x <= page.w + .01; x += 100) cv.strokePath([{ op: 'M', p: { x, y: 0 } }, { op: 'L', p: { x, y: page.h } }], grid, undefined, colors.cuadricula);
      for (let y = 0; y <= page.h + .01; y += 100) cv.strokePath([{ op: 'M', p: { x: 0, y } }, { op: 'L', p: { x: page.w, y } }], grid, undefined, colors.cuadricula);
      for (let x = 100; x < page.w; x += 100) cv.text(`${x / 10}`, x + 2, 6, 4, { gray: white ? .55 : .45 });
      for (let y = 100; y < page.h; y += 100) cv.text(`${y / 10}`, 2, y - 3, 4, { gray: white ? .55 : .45 });
    }
    // Calibration: an exact 10 cm square with 1 cm ticks and a 5 cm inner square.
    const cx = MARGIN, cy = MARGIN;
    cv.strokePath(square(cx, cy, 100), { width: 2.2, dash: [], gray: 0 }, undefined, colors.corte);
    cv.strokePath(square(cx + 25, cy + 25, 50), { width: 1.2, dash: [], gray: 0 }, undefined, colors.costura);
    for (let i = 1; i < 10; i++) {
      const t = i % 5 === 0 ? 8 : 4;
      cv.strokePath([{ op: 'M', p: { x: cx + i * 10, y: cy } }, { op: 'L', p: { x: cx + i * 10, y: cy + t } }], { width: 1, dash: [], gray: 0 }, undefined, colors.corte);
      cv.strokePath([{ op: 'M', p: { x: cx, y: cy + i * 10 } }, { op: 'L', p: { x: cx + t, y: cy + i * 10 } }], { width: 1, dash: [], gray: 0 }, undefined, colors.corte);
    }
    cv.text('10 × 10 cm', cx + 50, cy + 52, 6, { anchor: 'middle', bold: true, gray: textGray });
    cv.text('5 cm', cx + 50, cy + 62, 4, { anchor: 'middle', gray: textGray });
    const tx = cx + 120;
    cv.text(info.title, tx, cy + 8, 9, { bold: true, gray: textGray });
    cv.text(`Patrón para proyector a escala 1:1 · hoja ${index + 1} de ${pages.length} · ${(page.w / 10).toFixed(0)} × ${(page.h / 10).toFixed(0)} cm`, tx, cy + 20, 5, { gray: textGray });
    [
      '1. Abre este PDF en tu app de proyección y calibra con la cuadrícula: cada cuadro mide 10 cm.',
      '2. Comprueba con una regla que el cuadro de la esquina mida 10 × 10 cm (y el interior 5 cm) antes de cortar.',
      '3. Línea continua: corte. Discontinua: costura. Punto y raya: doblez. Flecha: hilo de la tela, paralela al orillo.',
      '4. Los márgenes ya están incluidos. No lo imprimas en hojas carta: para imprimir usa el PDF de confección.'
    ].forEach((line, i) => cv.text(line, tx, cy + 34 + i * 9, 4.4, { gray: textGray }));
    info.lines.slice(0, 3).forEach((line, i) => cv.text(line, tx, cy + 76 + i * 7, 3.6, { gray: white ? .7 : .35 }));
    for (const id of page.pieces) {
      const source = drawables.find(d => d.id === id)!, at = placed.get(id)!;
      const d = translateDrawable(source, at.x - source.bbox.minX, at.y - source.bbox.minY);
      for (const path of d.paths) cv.strokePath(path.cmds, PROJECTOR_STROKES[path.style], undefined, colors[path.style]);
      for (const image of d.images ?? []) { const embedded = images.get(image.fileId); if (embedded) cv.image(embedded, image); }
      for (const g of d.grains) {
        cv.strokePath([{ op: 'M', p: g.a }, { op: 'L', p: g.b }], PROJECTOR_STROKES.hilo, undefined, colors.hilo);
        const dir = norm(sub(g.b, g.a));
        arrow(cv, g.b, dir, colors.hilo); arrow(cv, g.a, { x: -dir.x, y: -dir.y }, colors.hilo);
      }
      for (const l of d.labels) cv.text(l.text, l.at.x, l.at.y, l.size * 1.15, { anchor: 'middle', angle: l.angle, bold: l.bold, gray: textGray });
    }
  });
  doc.setTitle(`${info.title} · proyector`);
  doc.setSubject('Patrón para proyector a escala 1:1 con cuadrícula de 10 cm');
  doc.setProducer('Hilvana'); doc.setCreator('Hilvana');
  doc.setKeywords(['proyector', 'escala 1:1', 'cuadrícula 10 cm', 'calibración']);
  doc.catalog.getOrCreateViewerPreferences().setPrintScaling(PrintScaling.None);
  await doc.attach(new TextEncoder().encode(JSON.stringify({ ...(info.json as object), proyector: { ...opts, paginas: pages.map(p => ({ anchoMm: p.w, altoMm: p.h, piezas: p.pieces })), demasiadoGrandes: tooWide } }, null, 2)), 'exportacion.json', { mimeType: 'application/json', description: 'Versiones y configuración de esta exportación para proyector' });
  return { bytes: await doc.save(), pages, tooWide };
}
