import {
  PDFDocument,
  PDFFont,
  PDFPage,
  PDFImage,
  StandardFonts,
  appendBezierCurve,
  clip,
  closePath,
  endPath,
  fill,
  lineTo,
  moveTo,
  popGraphicsState,
  pushGraphicsState,
  rectangle,
  setDashPattern,
  setLineCap,
  setLineJoin,
  setLineWidth,
  setStrokingGrayscaleColor,
  setStrokingRgbColor,
  setFillingGrayscaleColor,
  stroke,
  LineCapStyle,
  LineJoinStyle,
  degrees,
  grayscale,
  setFillingRgbColor,
  concatTransformationMatrix,
  drawObject
} from 'pdf-lib';
import { PT_PER_MM } from '../units';
import type { PathCmd } from '../draw/paths';
import type { LineStyle } from '../draw/drawable';
import type { Pt } from '../geom/vec';
import type { DrawImage } from '../draw/drawable';
import { imageCorners } from '../draw/drawable';

export interface StrokeSpec {
  width: number; // pt
  dash: number[]; // pt
  gray: number;
  cap?: 'butt' | 'round';
}

/** Estilos pensados para distinguirse impresos en blanco y negro. */
export const PDF_STYLES: Record<LineStyle, StrokeSpec> = {
  corte: { width: 0.9, dash: [], gray: 0 },
  costura: { width: 0.5, dash: [4, 2.5], gray: 0 },
  doblez: { width: 0.75, dash: [9, 2, 1.5, 2], gray: 0 },
  final: { width: 0.5, dash: [2.2, 1.8], gray: 0 },
  pespunte: { width: 0.6, dash: [0.1, 1.8], gray: 0, cap: 'round' },
  referencia: { width: 0.3, dash: [], gray: 0.45 },
  colocacion: { width: 0.45, dash: [6, 3], gray: 0.2 },
  hilo: { width: 0.6, dash: [], gray: 0 },
  piquete: { width: 0.9, dash: [], gray: 0 },
  bordado: { width: 0.7, dash: [3, 1, 0.6, 1], gray: 0.1 }
};

/** Sustituye caracteres fuera de WinAnsi (fuentes estándar de PDF). */
export function pdfSafe(text: string): string {
  return text
    .replace(/[→⟶]/g, '>')
    .replace(/[←]/g, '<')
    .replace(/[≈]/g, '~')
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/[^\x20-\x7E -ÿ–—•…·×]/g, '?');
}

export class PdfCanvas {
  page: PDFPage;
  hPt: number;
  constructor(page: PDFPage, public font: PDFFont, public bold: PDFFont) {
    this.page = page;
    this.hPt = page.getHeight();
  }
  X(mm: number) {
    return mm * PT_PER_MM;
  }
  Y(mm: number) {
    return this.hPt - mm * PT_PER_MM;
  }
  /** Affine image placement in mm, preserving alpha, rotation and mirrored copies. */
  image(image:PDFImage, placement:DrawImage, tx:(point:Pt)=>Pt=(point)=>point) {
    const [a,b,,d]=imageCorners(placement).map(tx);
    const key=this.page.node.newXObject('Image',image.ref);
    this.page.pushOperators(pushGraphicsState(),concatTransformationMatrix(
      this.X(b.x-a.x),-this.X(b.y-a.y),this.X(a.x-d.x),-this.X(a.y-d.y),this.X(d.x),this.Y(d.y)
    ),drawObject(key),popGraphicsState());
  }
  push() {
    this.page.pushOperators(pushGraphicsState());
  }
  pop() {
    this.page.pushOperators(popGraphicsState());
  }
  clipRect(x: number, y: number, w: number, h: number) {
    this.page.pushOperators(rectangle(this.X(x), this.Y(y + h), w * PT_PER_MM, h * PT_PER_MM), clip(), endPath());
  }
  private pathOps(cmds: PathCmd[], tx: (p: Pt) => Pt) {
    const ops = [];
    for (const c of cmds) {
      if (c.op === 'M') {
        const p = tx(c.p);
        ops.push(moveTo(this.X(p.x), this.Y(p.y)));
      } else if (c.op === 'L') {
        const p = tx(c.p);
        ops.push(lineTo(this.X(p.x), this.Y(p.y)));
      } else if (c.op === 'C') {
        const a = tx(c.c1);
        const b = tx(c.c2);
        const p = tx(c.p);
        ops.push(appendBezierCurve(this.X(a.x), this.Y(a.y), this.X(b.x), this.Y(b.y), this.X(p.x), this.Y(p.y)));
      } else ops.push(closePath());
    }
    return ops;
  }
  strokePath(cmds: PathCmd[], spec: StrokeSpec, tx: (p: Pt) => Pt = (p) => p, color?: string) {
    if (!cmds.length) return;
    this.page.pushOperators(
      pushGraphicsState(),
      setLineWidth(spec.width),
      setDashPattern(spec.dash, 0),
      setLineCap(spec.cap === 'round' ? LineCapStyle.Round : LineCapStyle.Butt),
      setLineJoin(LineJoinStyle.Miter),
      color && /^#[0-9a-f]{6}$/i.test(color) ? setStrokingRgbColor(parseInt(color.slice(1,3),16)/255,parseInt(color.slice(3,5),16)/255,parseInt(color.slice(5,7),16)/255) : setStrokingGrayscaleColor(spec.gray),
      ...this.pathOps(cmds, tx),
      stroke(),
      popGraphicsState()
    );
  }
  fillPath(cmds: PathCmd[], gray: number, tx: (p: Pt) => Pt = (p) => p) {
    this.page.pushOperators(pushGraphicsState(), setFillingGrayscaleColor(gray), ...this.pathOps(cmds, tx), fill(), popGraphicsState());
  }
  fillPathRgb(cmds: PathCmd[], c: [number, number, number], tx: (p: Pt) => Pt = (p) => p) {
    if (!cmds.length) return;
    this.page.pushOperators(pushGraphicsState(), setFillingRgbColor(c[0], c[1], c[2]), ...this.pathOps(cmds, tx), fill(), popGraphicsState());
  }
  /** Rectángulo exacto relleno (sin trazo): sus bordes miden exactamente w × h. */
  fillRect(x: number, y: number, w: number, h: number, gray: number) {
    this.page.pushOperators(pushGraphicsState(), setFillingGrayscaleColor(gray), rectangle(this.X(x), this.Y(y + h), w * PT_PER_MM, h * PT_PER_MM), fill(), popGraphicsState());
  }
  line(a: Pt, b: Pt, spec: StrokeSpec) {
    this.strokePath(
      [
        { op: 'M', p: a },
        { op: 'L', p: b }
      ],
      spec
    );
  }
  rect(x: number, y: number, w: number, h: number, spec: StrokeSpec) {
    this.strokePath(
      [
        { op: 'M', p: { x, y } },
        { op: 'L', p: { x: x + w, y } },
        { op: 'L', p: { x: x + w, y: y + h } },
        { op: 'L', p: { x, y: y + h } },
        { op: 'Z' }
      ],
      spec
    );
  }
  /** Texto con altura en mm. Ancla: 'start' | 'middle' | 'end'; ángulo en grados (sentido de pantalla). */
  text(str: string, x: number, y: number, sizeMm: number, opts: { anchor?: 'start' | 'middle' | 'end'; angle?: number; bold?: boolean; gray?: number } = {}) {
    const t = pdfSafe(str);
    if (!t) return;
    const font = opts.bold ? this.bold : this.font;
    const size = sizeMm * PT_PER_MM * 1.38;
    const w = font.widthOfTextAtSize(t, size);
    const ang = -(opts.angle ?? 0);
    const r = (ang * Math.PI) / 180;
    const dir = { x: Math.cos(r), y: Math.sin(r) };
    const up = { x: -Math.sin(r), y: Math.cos(r) };
    const shift = opts.anchor === 'middle' ? w / 2 : opts.anchor === 'end' ? w : 0;
    const base = size * 0.34;
    const px = this.X(x) - dir.x * shift - up.x * base;
    const py = this.Y(y) - dir.y * shift - up.y * base;
    this.page.drawText(t, { x: px, y: py, size, font, rotate: degrees(ang), opacity: 1, color: opts.gray !== undefined ? grayscale(opts.gray) : undefined });
  }
  textWidthMm(str: string, sizeMm: number, bold = false) {
    const font = bold ? this.bold : this.font;
    return font.widthOfTextAtSize(pdfSafe(str), sizeMm * PT_PER_MM * 1.38) / PT_PER_MM;
  }
  arrowHead(tip: Pt, dir: Pt, size = 2.6, tx: (p: Pt) => Pt = (p) => p) {
    const back = { x: tip.x - dir.x * size, y: tip.y - dir.y * size };
    const perp = { x: -dir.y, y: dir.x };
    const a = { x: back.x + perp.x * size * 0.4, y: back.y + perp.y * size * 0.4 };
    const b = { x: back.x - perp.x * size * 0.4, y: back.y - perp.y * size * 0.4 };
    this.fillPath(
      [
        { op: 'M', p: tip },
        { op: 'L', p: a },
        { op: 'L', p: b },
        { op: 'Z' }
      ],
      0,
      tx
    );
  }
}

export async function newPdf() {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  return { doc, font, bold };
}
