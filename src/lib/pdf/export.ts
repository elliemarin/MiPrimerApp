import { PrintScaling, PDFDocument, PDFFont } from 'pdf-lib';
import { BBox, Pt, bboxOf, norm, sub } from '../geom/vec';
import { flattenCubic } from '../geom/bezier';
import { shelfPack } from '../geom/pack';
import type { Drawable } from '../draw/drawable';
import { STYLE_LABEL, translateDrawable, labelBounds } from '../draw/drawable';
import type { PathCmd } from '../draw/paths';
import { PDF_STYLES, PdfCanvas, newPdf } from './canvas';
import { TileGrid, TileSettings, computeGrid, contentBox, pageSize, tileRect, Tile } from './tile';
import { LETTER_MM } from './tile';

export interface ExportInfo {
  title: string;
  /** Líneas de trazabilidad: proyecto, versiones de medidas, patrón y diseño, fecha. */
  lines: string[];
  /** Texto corto para el pie de cada hoja. */
  footer: string;
  /** Datos completos que se adjuntan como JSON dentro del PDF. */
  json: unknown;
}

export interface TiledOptions {
  settings: TileSettings;
  /** Códigos de hoja a incluir; vacío o ausente = todas las que tienen contenido. */
  pages?: string[];
}

/** Segmentos aproximados de un dibujo (para saber qué hojas tienen contenido). */
function drawableSegments(d: Drawable): [Pt, Pt][] {
  const segs: [Pt, Pt][] = [];
  for (const p of d.paths) {
    let cur: Pt = { x: 0, y: 0 };
    let start: Pt = cur;
    for (const c of p.cmds) {
      if (c.op === 'M') {
        cur = c.p;
        start = c.p;
      } else if (c.op === 'L') {
        segs.push([cur, c.p]);
        cur = c.p;
      } else if (c.op === 'C') {
        const pts = flattenCubic({ p0: cur, c1: c.c1, c2: c.c2, p3: c.p }, 0.5);
        for (let i = 1; i < pts.length; i++) segs.push([pts[i - 1], pts[i]]);
        cur = c.p;
      } else {
        segs.push([cur, start]);
        cur = start;
      }
    }
  }
  return segs;
}

function segTouchesRect(a: Pt, b: Pt, r: BBox): boolean {
  // Recorte de Liang–Barsky.
  let t0 = 0;
  let t1 = 1;
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const checks: [number, number][] = [
    [-dx, a.x - r.minX],
    [dx, r.maxX - a.x],
    [-dy, a.y - r.minY],
    [dy, r.maxY - a.y]
  ];
  for (const [p, q] of checks) {
    if (Math.abs(p) < 1e-12) {
      if (q < 0) return false;
    } else {
      const t = q / p;
      if (p < 0) t0 = Math.max(t0, t);
      else t1 = Math.min(t1, t);
      if (t0 > t1) return false;
    }
  }
  return true;
}

export function tilesWithContent(grid: TileGrid, drawables: Drawable[]): Set<string> {
  const segs = drawables.flatMap(drawableSegments);
  const labels=drawables.flatMap(drawable=>drawable.labels.map(labelBounds));
  const out = new Set<string>();
  for (const t of grid.tiles) {
    const r = tileRect(grid, t);
    if (segs.some(([a, b]) => segTouchesRect(a, b, r)) || labels.some(box=>box.minX<=r.maxX && box.maxX>=r.minX && box.minY<=r.maxY && box.maxY>=r.minY)) out.add(t.code);
  }
  return out;
}

export function unionBBox(ds: Drawable[]): BBox {
  return bboxOf(ds.flatMap((d) => [{ x: d.bbox.minX, y: d.bbox.minY }, { x: d.bbox.maxX, y: d.bbox.maxY }]));
}

/** Acomoda los dibujos para usar el menor número de hojas posible (sin escalar ni rotar). */
export function arrangeForTiles(ds: Drawable[], s: TileSettings, gap = 15): Drawable[] {
  const c = contentBox(s);
  const stepX = c.w - s.overlap;
  let best: { pages: number; out: Drawable[] } | null = null;
  const maxW = Math.max(...ds.map((d) => d.bbox.maxX - d.bbox.minX));
  for (let cols = 1; cols <= 8; cols++) {
    const W = cols * stepX + s.overlap - 2;
    if (W < maxW) continue;
    const packed = shelfPack(
      ds.map((d) => ({ id: d.id, w: d.bbox.maxX - d.bbox.minX, h: d.bbox.maxY - d.bbox.minY })),
      W,
      1e9,
      gap
    );
    const out = packed.placed.map((p) => {
      const d = ds.find((x) => x.id === p.id)!;
      return translateDrawable(d, p.x - d.bbox.minX, p.y - d.bbox.minY);
    });
    const grid = computeGrid(unionBBox(out), s);
    const pages = tilesWithContent(grid, out).size;
    if (!best || pages < best.pages) best = { pages, out };
  }
  return best ? best.out : ds;
}

function drawDrawable(cv: PdfCanvas, d: Drawable, tx: (p: Pt) => Pt) {
  for (const p of d.paths) cv.strokePath(p.cmds, PDF_STYLES[p.style], tx);
  for (const g of d.grains) {
    const a = tx(g.a);
    const b = tx(g.b);
    cv.line(a, b, PDF_STYLES.hilo);
    const dir = norm(sub(b, a));
    cv.arrowHead(b, dir);
    cv.arrowHead(a, { x: -dir.x, y: -dir.y });
  }
  for (const l of d.labels) {
    const p = tx(l.at);
    cv.text(l.text, p.x, p.y, l.size, { anchor: 'middle', angle: l.angle, bold: l.bold });
  }
}

/** Cuadrado de 5 × 5 cm y barra de 10 cm, en mm de hoja. */
function drawCalibration(cv: PdfCanvas, x: number, y: number) {
  cv.fillRect(x, y, 50, 50, 0.82);
  cv.text('5 × 5 cm', x + 25, y + 22, 4, { anchor: 'middle', bold: true });
  cv.text('Mide este cuadrado', x + 25, y + 29, 2.8, { anchor: 'middle' });
  cv.text('antes de imprimir todo', x + 25, y + 33, 2.8, { anchor: 'middle' });
  drawBar(cv, x + 60, y + 18);
  // Barra de 3 pulgadas para quien mide en pulgadas.
  const by = y + 40;
  cv.fillRect(x + 60, by, 76.2, 2.2, 0);
  for (let i = 0; i <= 3; i++) cv.line({ x: x + 60 + i * 25.4, y: by - 2 }, { x: x + 60 + i * 25.4, y: by }, PDF_STYLES.corte);
  for (let i = 0; i <= 3; i++) cv.text(`${i}`, x + 60 + i * 25.4, by - 3.6, 2.6, { anchor: 'middle' });
  cv.text('3 in', x + 60 + 76.2 + 3, by + 1.2, 2.8);
}

function drawBar(cv: PdfCanvas, x: number, y: number) {
  cv.fillRect(x, y, 100, 1.6, 0);
  for (let i = 0; i <= 10; i++) {
    const h = i % 5 === 0 ? 2.6 : 1.6;
    cv.line({ x: x + i * 10, y: y - h }, { x: x + i * 10, y }, PDF_STYLES.corte);
  }
  cv.text('0', x, y - 4, 2.4, { anchor: 'middle' });
  cv.text('5', x + 50, y - 4, 2.4, { anchor: 'middle' });
  cv.text('10 cm', x + 100, y - 4, 2.4, { anchor: 'middle' });
}

function addFooter(cv: PdfCanvas, s: TileSettings, code: string, sub1: string, info: ExportInfo, pageNo: number, total: number) {
  const { w, h } = pageSize(s);
  const top = h - s.margin - s.footer;
  cv.line({ x: s.margin, y: top + 1 }, { x: w - s.margin, y: top + 1 }, PDF_STYLES.referencia);
  cv.text(code, s.margin + 1, top + 6, 4.4, { bold: true });
  cv.text(sub1, s.margin + 1, top + 11, 2.5);
  drawBar(cv, (w - 100) / 2, top + 8);
  cv.text('Imprimir al 100 %, sin ajustar a la página', w / 2, top + 11.8, 2.4, { anchor: 'middle' });
  // Keep the project name clear of the calibration bar and its “10 cm” label.
  const right = w - s.margin - 1;
  const available = Math.max(8, right - ((w + 100) / 2 + cv.textWidthMm('10 cm', 2.4) / 2 + 3));
  let footer = info.footer;
  if (cv.textWidthMm(footer, 2.5) > available) {
    while (footer && cv.textWidthMm(`${footer}…`, 2.5) > available) footer = footer.slice(0, -1);
    footer = `${footer}…`;
  }
  cv.text(footer, right, top + 5.5, 2.5, { anchor: 'end' });
  cv.text(`Página ${pageNo} de ${total}`, w - s.margin - 1, top + 10, 2.5, { anchor: 'end' });
}

function drawJoinMarks(cv: PdfCanvas, grid: TileGrid, s: TileSettings, tile: Tile, tx: (p: Pt) => Pt) {
  const { stepX, stepY, content } = grid;
  const O = s.overlap;
  const size = Math.max(2.5, Math.min(5, O > 0 ? O / 2 - 0.5 : 5));
  const diamond = (cx: number, cy: number, label: string) => {
    const pts: Pt[] = [
      { x: cx, y: cy - size },
      { x: cx + size, y: cy },
      { x: cx, y: cy + size },
      { x: cx - size, y: cy }
    ];
    const cmds: PathCmd[] = [{ op: 'M', p: pts[0] }, ...pts.slice(1).map((p) => ({ op: 'L' as const, p })), { op: 'Z' }];
    cv.fillPath(cmds, 0.7, tx);
    cv.strokePath(cmds, PDF_STYLES.corte, tx);
    const lp = tx({ x: cx, y: cy + size + 3.2 });
    cv.text(label, lp.x, lp.y, 2.4, { anchor: 'middle' });
  };
  for (const t of grid.tiles) {
    // Unión vertical con la hoja de la derecha.
    if (t.col < grid.cols - 1) {
      const right = grid.tiles.find((x) => x.row === t.row && x.col === t.col + 1)!;
      const cx = t.x + stepX + O / 2;
      for (const f of [1 / 3, 2 / 3]) diamond(cx, t.y + content.h * f, `${t.code} | ${right.code}`);
    }
    if (t.row < grid.rows - 1) {
      const below = grid.tiles.find((x) => x.row === t.row + 1 && x.col === t.col)!;
      const cy = t.y + stepY + O / 2;
      for (const f of [1 / 3, 2 / 3]) diamond(t.x + content.w * f, cy, `${t.code} / ${below.code}`);
    }
  }
  // Líneas de recorte y de colocación en esta hoja.
  const c = content;
  if (tile.col > 0) {
    cv.line({ x: c.x, y: c.y }, { x: c.x, y: c.y + c.h }, PDF_STYLES.colocacion);
    cv.text('Recorta por esta línea', c.x + 1.5, c.y + c.h / 2, 2.6, { angle: -90, anchor: 'middle' });
  }
  if (tile.row > 0) {
    cv.line({ x: c.x, y: c.y }, { x: c.x + c.w, y: c.y }, PDF_STYLES.colocacion);
    cv.text('Recorta por esta línea', c.x + c.w / 2, c.y + 3, 2.6, { anchor: 'middle' });
  }
  if (tile.col < grid.cols - 1) {
    const x = c.x + c.w - O;
    cv.line({ x, y: c.y }, { x, y: c.y + c.h }, PDF_STYLES.referencia);
    cv.text('Borde de la hoja siguiente', x - 1.5, c.y + c.h / 2, 2.4, { angle: -90, anchor: 'middle' });
  }
  if (tile.row < grid.rows - 1) {
    const y = c.y + c.h - O;
    cv.line({ x: c.x, y }, { x: c.x + c.w, y }, PDF_STYLES.referencia);
    cv.text('Borde de la hoja de abajo', c.x + c.w / 2, y - 1.8, 2.4, { anchor: 'middle' });
  }
}

function drawLegend(cv: PdfCanvas, x: number, y: number) {
  const styles = ['corte', 'costura', 'doblez', 'pespunte', 'colocacion', 'referencia', 'piquete', 'hilo'] as const;
  cv.text('Tipos de línea (se distinguen en blanco y negro)', x, y, 3.4, { bold: true });
  styles.forEach((st, i) => {
    const col = i % 4;
    const row = Math.floor(i / 4);
    const xx = x + col * 50;
    const yy = y + 7 + row * 7;
    if (st === 'piquete') cv.line({ x: xx + 8, y: yy - 2 }, { x: xx + 8, y: yy + 2 }, PDF_STYLES.piquete);
    else cv.line({ x: xx, y: yy }, { x: xx + 16, y: yy }, PDF_STYLES[st]);
    if (st === 'hilo') {
      cv.arrowHead({ x: xx + 16, y: yy }, { x: 1, y: 0 }, 2.2);
      cv.arrowHead({ x: xx, y: yy }, { x: -1, y: 0 }, 2.2);
    }
    cv.text(STYLE_LABEL[st], xx + 19, yy, 2.8);
  });
}

function drawMap(cv: PdfCanvas, grid: TileGrid, ds: Drawable[], included: Set<string>, box: { x: number; y: number; w: number; h: number }) {
  const W = grid.cols * grid.stepX + 0;
  const H = grid.rows * grid.stepY + 0;
  const k = Math.min(box.w / (W + 1), box.h / (H + 1));
  const ox = box.x + (box.w - W * k) / 2;
  const oy = box.y + (box.h - H * k) / 2;
  const t0 = grid.tiles[0];
  const tx = (p: Pt): Pt => ({ x: ox + (p.x - t0.x) * k, y: oy + (p.y - t0.y) * k });
  for (const t of grid.tiles) {
    const a = tx({ x: t.x, y: t.y });
    const inc = included.has(t.code);
    if (!inc) cv.fillRect(a.x, a.y, grid.stepX * k, grid.stepY * k, 0.93);
    cv.rect(a.x, a.y, grid.stepX * k, grid.stepY * k, PDF_STYLES.referencia);
    cv.text(inc ? t.code : `${t.code} vacía`, a.x + (grid.stepX * k) / 2, a.y + (grid.stepY * k) / 2, Math.min(6, grid.stepX * k * 0.14), { anchor: 'middle', bold: inc, gray: 0.3 });
  }
  for (const d of ds) for (const p of d.paths) if (p.style === 'corte') cv.strokePath(p.cmds, { width: 0.4, dash: [], gray: 0.15 }, tx);
}

async function finish(doc: PDFDocument, info: ExportInfo) {
  doc.setTitle(info.title);
  doc.setSubject('Patrón a escala real 1:1 en hojas carta (215.9 × 279.4 mm)');
  doc.setProducer('Hilvana');
  doc.setCreator('Hilvana');
  doc.setKeywords(['escala 1:1', 'carta', 'imprimir al 100 %']);
  doc.catalog.getOrCreateViewerPreferences().setPrintScaling(PrintScaling.None);
  const json = new TextEncoder().encode(JSON.stringify(info.json, null, 2));
  await doc.attach(json, 'exportacion.json', { mimeType: 'application/json', description: 'Versiones y configuración de esta exportación' });
  return doc.save();
}

function coverPage(doc: PDFDocument, font: PDFFont, bold: PDFFont, s: TileSettings, info: ExportInfo, heading: string): { cv: PdfCanvas; y: number } {
  const page = doc.addPage([LETTER_MM.w * (72 / 25.4), LETTER_MM.h * (72 / 25.4)]);
  const cv = new PdfCanvas(page, font, bold);
  const m = Math.max(s.margin, 8);
  let y = m + 8;
  cv.text(info.title, m, y, 7, { bold: true });
  y += 8;
  cv.text(heading, m, y, 3.6);
  y += 9;
  cv.rect(m, y - 4, LETTER_MM.w - 2 * m, 17, PDF_STYLES.corte);
  cv.text('Imprime al 100 % (tamaño real), sin «ajustar a la página» ni márgenes automáticos.', m + 3, y + 1.5, 3.3, { bold: true });
  cv.text('Mide el cuadrado de 5 × 5 cm y la barra de 10 cm antes de imprimir todas las hojas.', m + 3, y + 7, 3);
  y += 20;
  drawCalibration(cv, m, y);
  y += 58;
  drawLegend(cv, m, y);
  y += 30;
  return { cv, y };
}

/** PDF de patrón en mosaico de hojas carta, a escala 1:1. */
export async function exportTiledPdf(drawables: Drawable[], opts: TiledOptions, info: ExportInfo): Promise<{ bytes: Uint8Array; grid: TileGrid; pages: string[] }> {
  const { doc, font, bold } = await newPdf();
  const s = opts.settings;
  const grid = computeGrid(unionBBox(drawables), s);
  const withContent = tilesWithContent(grid, drawables);
  const chosen = opts.pages && opts.pages.length ? new Set(opts.pages.filter((c) => withContent.has(c))) : withContent;
  const { cv, y } = coverPage(doc, font, bold, s, info, `Patrón a escala 1:1 · ${chosen.size} hojas carta · cuadrícula de ${grid.rows} × ${grid.cols}`);
  const m = Math.max(s.margin, 8);
  let yy = y;
  cv.text('Mapa de montaje', m, yy, 3.6, { bold: true });
  cv.text('Recorta el borde izquierdo y superior de cada hoja y pégala sobre la anterior haciendo coincidir los rombos.', m, yy + 5, 2.8);
  yy += 9;
  drawMap(cv, grid, drawables, chosen, { x: m, y: yy, w: LETTER_MM.w - 2 * m, h: 80 });
  yy += 86;
  cv.text('Trazabilidad de esta exportación', m, yy, 3.4, { bold: true });
  info.lines.slice(0, 12).forEach((l, i) => cv.text(l, m, yy + 5 + i * 4.3, 2.8));
  const tilesOut = grid.tiles.filter((t) => chosen.has(t.code));
  const total = tilesOut.length + 1;
  tilesOut.forEach((t, i) => {
    const { w, h } = pageSize(s);
    const page = doc.addPage([w * (72 / 25.4), h * (72 / 25.4)]);
    const pc = new PdfCanvas(page, font, bold);
    const c = grid.content;
    const tx = (p: Pt): Pt => ({ x: c.x + (p.x - t.x), y: c.y + (p.y - t.y) });
    pc.push();
    pc.clipRect(c.x, c.y, c.w, c.h);
    for (const d of drawables) drawDrawable(pc, d, tx);
    drawJoinMarks(pc, grid, s, t, tx);
    pc.pop();
    addFooter(pc, s, t.code, `Fila ${t.code.replace(/\d+$/, '')} · columna ${t.col + 1} de ${grid.cols}`, info, i + 2, total);
  });
  const bytes = await finish(doc, info);
  return { bytes, grid, pages: tilesOut.map((t) => t.code) };
}

export interface PackedResult {
  bytes: Uint8Array;
  sheets: number;
  tooBig: string[];
  placements: { id: string; sheet: number; x: number; y: number }[];
}

/** Varias piezas pequeñas por hoja, sin cambiar su escala, con separación y márgenes. */
export async function exportPackedPdf(drawables: Drawable[], s: TileSettings, info: ExportInfo, gap = 8): Promise<PackedResult> {
  const { doc, font, bold } = await newPdf();
  const c = contentBox(s);
  const packed = shelfPack(
    drawables.map((d) => ({ id: d.id, w: d.bbox.maxX - d.bbox.minX, h: d.bbox.maxY - d.bbox.minY })),
    c.w,
    c.h,
    gap
  );
  const { cv, y } = coverPage(doc, font, bold, s, info, `Plantillas a escala 1:1 · ${packed.bins} hojas carta`);
  const m = Math.max(s.margin, 8);
  cv.text('Trazabilidad de esta exportación', m, y, 3.4, { bold: true });
  info.lines.slice(0, 14).forEach((l, i) => cv.text(l, m, y + 5 + i * 4.3, 2.8));
  if (packed.tooBig.length) cv.text(`No caben en una hoja (exporta en mosaico): ${packed.tooBig.map((t) => drawables.find((d) => d.id === t.id)?.name).join(', ')}`, m, y + 70, 3, { bold: true });
  const total = packed.bins + 1;
  for (let bin = 0; bin < packed.bins; bin++) {
    const { w, h } = pageSize(s);
    const page = doc.addPage([w * (72 / 25.4), h * (72 / 25.4)]);
    const pc = new PdfCanvas(page, font, bold);
    for (const p of packed.placed.filter((q) => q.bin === bin)) {
      const d = drawables.find((x) => x.id === p.id)!;
      const tx = (q: Pt): Pt => ({ x: c.x + p.x + (q.x - d.bbox.minX), y: c.y + p.y + (q.y - d.bbox.minY) });
      drawDrawable(pc, d, tx);
    }
    addFooter(pc, s, `Hoja ${bin + 1}`, 'Plantillas acomodadas sin escalar', info, bin + 2, total);
  }
  const bytes = await finish(doc, info);
  return {
    bytes,
    sheets: packed.bins,
    tooBig: packed.tooBig.map((t) => t.id),
    placements: packed.placed.map((p) => ({ id: p.id, sheet: p.bin + 1, x: p.x, y: p.y }))
  };
}
