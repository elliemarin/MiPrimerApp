import { PDFDocument, PDFFont, PDFPage, rgb } from 'pdf-lib';
import { PdfCanvas, pdfSafe, PDF_STYLES, newPdf } from './canvas';
import { LETTER_MM } from './tile';

/** Documento de varias páginas con flujo de texto y paginación automática (mm). */
export class FlowDoc {
  doc!: PDFDocument;
  font!: PDFFont;
  bold!: PDFFont;
  cv!: PdfCanvas;
  page!: PDFPage;
  y = 0;
  readonly m = 16;
  readonly w = LETTER_MM.w;
  readonly h = LETTER_MM.h;
  pageNo = 0;
  footer = '';
  static async create(footer: string) {
    const f = new FlowDoc();
    const { doc, font, bold } = await newPdf();
    f.doc = doc;
    f.font = font;
    f.bold = bold;
    f.footer = footer;
    f.newPage();
    return f;
  }
  get width() {
    return this.w - 2 * this.m;
  }
  newPage() {
    this.page = this.doc.addPage([this.w * (72 / 25.4), this.h * (72 / 25.4)]);
    this.cv = new PdfCanvas(this.page, this.font, this.bold);
    this.pageNo++;
    this.y = this.m;
    this.cv.text(pdfSafe(this.footer), this.m, this.h - 9, 2.6, { gray: 0.4 });
    this.cv.text(`${this.pageNo}`, this.w - this.m, this.h - 9, 2.6, { anchor: 'end' });
  }
  ensure(space: number) {
    if (this.y + space > this.h - this.m - 6) this.newPage();
  }
  wrap(text: string, size: number, width: number, bold = false): string[] {
    const words = pdfSafe(text).split(/\s+/);
    const lines: string[] = [];
    let cur = '';
    for (const w of words) {
      const t = cur ? `${cur} ${w}` : w;
      if (this.cv.textWidthMm(t, size, bold) > width && cur) {
        lines.push(cur);
        cur = w;
      } else cur = t;
    }
    if (cur) lines.push(cur);
    return lines;
  }
  title(text: string) {
    this.ensure(14);
    this.cv.text(text, this.m, this.y + 6, 6.4, { bold: true });
    this.y += 12;
  }
  heading(text: string) {
    this.ensure(12);
    this.y += 3;
    this.cv.text(text, this.m, this.y + 4, 4, { bold: true });
    this.cv.line({ x: this.m, y: this.y + 7 }, { x: this.w - this.m, y: this.y + 7 }, PDF_STYLES.referencia);
    this.y += 11;
  }
  para(text: string, size = 3, opts: { bold?: boolean; indent?: number; gap?: number } = {}) {
    const lines = this.wrap(text, size, this.width - (opts.indent ?? 0), opts.bold);
    const lh = size * 1.55;
    for (const l of lines) {
      this.ensure(lh);
      this.cv.text(l, this.m + (opts.indent ?? 0), this.y + size, size, { bold: opts.bold });
      this.y += lh;
    }
    this.y += opts.gap ?? 1.5;
  }
  checkbox(text: string, checked: boolean, size = 3.1) {
    const lines = this.wrap(text, size, this.width - 8);
    this.ensure(lines.length * size * 1.55 + 2);
    this.cv.rect(this.m, this.y + 0.3, 3.6, 3.6, PDF_STYLES.corte);
    if (checked) this.cv.text('×', this.m + 1.8, this.y + 2.3, 3.4, { anchor: 'middle', bold: true });
    for (const l of lines) {
      this.cv.text(l, this.m + 7, this.y + size, size);
      this.y += size * 1.55;
    }
    this.y += 1.5;
  }
  table(head: string[], rows: string[][], widths: number[], size = 2.8) {
    const total = widths.reduce((a, b) => a + b, 0);
    const ws = widths.map((w) => (w / total) * this.width);
    const lh = size * 1.5;
    const bottom = this.h - this.m - 6;
    const linesFor = (cells: string[], bold: boolean) => cells.map((cell, index) => this.wrap(cell, size, ws[index]-2, bold));
    const header = linesFor(head, true);
    const headerLines = Math.max(1, ...header.map(lines => lines.length));
    const paint = (cells: string[][], offset: number, count: number, bold: boolean) => {
      cells.forEach((lines, index) => {
        const x = this.m + ws.slice(0,index).reduce((sum,width) => sum+width, 0);
        lines.slice(offset,offset+count).forEach((line,lineIndex) => this.cv.text(line, x+1, this.y+size*1.3+lineIndex*lh, size, { bold }));
      });
      this.y += count*lh+size*.6;
      this.cv.line({ x: this.m, y: this.y - 0.6 }, { x: this.w - this.m, y: this.y - 0.6 }, { width: 0.25, dash: [], gray: 0.75 });
    };
    this.ensure((headerLines+1)*lh+size*1.2);
    paint(header,0,headerLines,true);
    for (const row of rows) {
      const cells = linesFor(row, false);
      const count = Math.max(1,...cells.map(lines=>lines.length));
      const rowH = count*lh+size*.6;
      // Keep ordinary rows together. Very long notes may continue across pages.
      if (this.y+rowH>bottom && rowH<(bottom-this.m-headerLines*lh-size*1.2)) {
        this.newPage();
        paint(header,0,headerLines,true);
      }
      let offset=0;
      while(offset<count) {
        let available=Math.floor((bottom-this.y-size*.6)/lh);
        if(available<1) {
          this.newPage();
          paint(header,0,headerLines,true);
          available=Math.max(1,Math.floor((bottom-this.y-size*.6)/lh));
        }
        const chunk=Math.min(count-offset,available);
        paint(cells,offset,chunk,false);
        offset+=chunk;
      }
    }
    this.y += 3;
  }
  async image(bytes: Uint8Array, type: string, maxW: number, maxH: number) {
    try {
      const img = type.includes('png') ? await this.doc.embedPng(bytes) : await this.doc.embedJpg(bytes);
      const k = Math.min(maxW / img.width, maxH / img.height);
      const w = img.width * k;
      const h = img.height * k;
      this.ensure(h + 3);
      this.page.drawImage(img, { x: this.cv.X(this.m), y: this.cv.Y(this.y + h), width: w * (72 / 25.4), height: h * (72 / 25.4) });
      this.y += h + 3;
    } catch {
      this.para('(No se pudo incluir la imagen.)', 2.6);
    }
  }
  fillColor(hex: string): [number, number, number] {
    const m = /^#?([0-9a-f]{6})$/i.exec(hex);
    if (!m) return [0.85, 0.85, 0.85];
    const n = parseInt(m[1], 16);
    return [(n >> 16) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
  }
  rgb = rgb;
  async save() {
    this.doc.setTitle(this.footer);
    this.doc.setProducer('Hilvana');
    this.doc.setCreator('Hilvana');
    return this.doc.save();
  }
}
