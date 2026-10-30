import { homography, applyH } from './geom/homography';
import type { Pt } from './geom/vec';

export async function loadBitmap(blob: Blob): Promise<HTMLImageElement> {
  const url = URL.createObjectURL(blob);
  try {
    const img = new Image();
    img.decoding = 'async';
    img.src = url;
    await img.decode();
    return img;
  } finally {
    setTimeout(() => URL.revokeObjectURL(url), 30000);
  }
}

export function canvasToBlob(c: HTMLCanvasElement, type = 'image/jpeg', q = 0.9): Promise<Blob> {
  return new Promise((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error('No se pudo generar la imagen.'))), type, q));
}

export interface ImportedImage {
  blob: Blob;
  name: string;
  /** Escala exacta si proviene de un PDF (mm por píxel). */
  mmPerPx?: number;
  source?: File;
  page?: number;
  width: number;
  height: number;
}

/** Convierte cada página de un PDF en imagen, conservando su escala física. */
async function pdfToImages(file: File): Promise<ImportedImage[]> {
  const pdfjs = await import('pdfjs-dist');
  const worker = await import('pdfjs-dist/build/pdf.worker.min.mjs?url');
  pdfjs.GlobalWorkerOptions.workerSrc = worker.default;
  const doc = await pdfjs.getDocument({ data: await file.arrayBuffer() }).promise;
  const out: ImportedImage[] = [];
  const dpi = 150;
  for (let i = 1; i <= Math.min(doc.numPages, 40); i++) {
    const page = await doc.getPage(i);
    const viewport = page.getViewport({ scale: dpi / 72 });
    const c = document.createElement('canvas');
    c.width = Math.ceil(viewport.width);
    c.height = Math.ceil(viewport.height);
    const ctx = c.getContext('2d')!;
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, c.width, c.height);
    await page.render({ canvasContext: ctx, viewport }).promise;
    const blob = await canvasToBlob(c, 'image/png');
    out.push({ blob, name: `${file.name.replace(/\.pdf$/i, '')} · pág. ${i}.png`, mmPerPx: 25.4 / dpi, source: file, page: i, width: c.width, height: c.height });
  }
  return out;
}

export async function importImageFiles(files: File[]): Promise<ImportedImage[]> {
  const out: ImportedImage[] = [];
  for (const f of files) {
    if (f.type === 'application/pdf' || /\.pdf$/i.test(f.name)) out.push(...(await pdfToImages(f)));
    else if (/^image\/(jpeg|png|webp|heic|heif)$/.test(f.type) || /\.(jpe?g|png)$/i.test(f.name)) {
      const img = await loadBitmap(f);
      out.push({ blob: f, name: f.name, width: img.naturalWidth, height: img.naturalHeight });
    } else throw new Error(`Formato no admitido: ${f.name}. Usa JPG, PNG o PDF.`);
  }
  return out;
}

export function imageData(img: HTMLImageElement, maxSide = 2400): ImageData {
  const k = Math.min(1, maxSide / Math.max(img.naturalWidth, img.naturalHeight));
  const w = Math.round(img.naturalWidth * k);
  const h = Math.round(img.naturalHeight * k);
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d', { willReadFrequently: true })!;
  ctx.drawImage(img, 0, 0, w, h);
  return ctx.getImageData(0, 0, w, h);
}

/**
 * Corrige la perspectiva: lleva el cuadrilátero `corners` (en píxeles de src,
 * orden: sup-izq, sup-der, inf-der, inf-izq) a un rectángulo de outW × outH.
 */
export function warpPerspective(src: ImageData, corners: Pt[], outW: number, outH: number): ImageData {
  const dst: Pt[] = [
    { x: 0, y: 0 },
    { x: outW, y: 0 },
    { x: outW, y: outH },
    { x: 0, y: outH }
  ];
  const inv = homography(dst, corners);
  const out = new ImageData(outW, outH);
  const sw = src.width;
  const sh = src.height;
  const s = src.data;
  const o = out.data;
  for (let y = 0; y < outH; y++) {
    for (let x = 0; x < outW; x++) {
      const p = applyH(inv, { x: x + 0.5, y: y + 0.5 });
      const fx = p.x - 0.5;
      const fy = p.y - 0.5;
      const x0 = Math.floor(fx);
      const y0 = Math.floor(fy);
      const ax = fx - x0;
      const ay = fy - y0;
      const idx = (y * outW + x) * 4;
      if (x0 < -1 || y0 < -1 || x0 >= sw || y0 >= sh) {
        o[idx + 3] = 0;
        continue;
      }
      const cx0 = Math.max(0, Math.min(sw - 1, x0));
      const cx1 = Math.max(0, Math.min(sw - 1, x0 + 1));
      const cy0 = Math.max(0, Math.min(sh - 1, y0));
      const cy1 = Math.max(0, Math.min(sh - 1, y0 + 1));
      for (let c = 0; c < 4; c++) {
        const v00 = s[(cy0 * sw + cx0) * 4 + c];
        const v10 = s[(cy0 * sw + cx1) * 4 + c];
        const v01 = s[(cy1 * sw + cx0) * 4 + c];
        const v11 = s[(cy1 * sw + cx1) * 4 + c];
        o[idx + c] = (v00 * (1 - ax) + v10 * ax) * (1 - ay) + (v01 * (1 - ax) + v11 * ax) * ay;
      }
    }
  }
  return out;
}

export interface Adjust {
  brightness: number; // -1…1
  contrast: number; // -1…1
  saturation: number; // -1…1
  warmth: number; // -1…1
}

/** Ajustes de color no destructivos: se aplican a una copia. */
export function adjustImage(src: ImageData, a: Adjust): ImageData {
  const out = new ImageData(new Uint8ClampedArray(src.data), src.width, src.height);
  const d = out.data;
  const b = a.brightness * 80;
  const cf = (1 + a.contrast) / (1 - Math.min(0.95, a.contrast));
  const sat = 1 + a.saturation;
  const wr = a.warmth * 18;
  for (let i = 0; i < d.length; i += 4) {
    let r = d[i];
    let g = d[i + 1];
    let bl = d[i + 2];
    r = (r - 128) * cf + 128 + b + wr;
    g = (g - 128) * cf + 128 + b;
    bl = (bl - 128) * cf + 128 + b - wr;
    const l = 0.2126 * r + 0.7152 * g + 0.0722 * bl;
    d[i] = l + (r - l) * sat;
    d[i + 1] = l + (g - l) * sat;
    d[i + 2] = l + (bl - l) * sat;
  }
  return out;
}

export function averageColor(img: ImageData): string {
  let r = 0;
  let g = 0;
  let b = 0;
  let n = 0;
  const step = Math.max(4, Math.floor(img.data.length / 4 / 20000)) * 4;
  for (let i = 0; i < img.data.length; i += step) {
    if (img.data[i + 3] < 128) continue;
    r += img.data[i];
    g += img.data[i + 1];
    b += img.data[i + 2];
    n++;
  }
  if (!n) return '#cccccc';
  const h = (v: number) => Math.round(v / n).toString(16).padStart(2, '0');
  return `#${h(r)}${h(g)}${h(b)}`;
}

export function imageDataToBlob(img: ImageData, type = 'image/jpeg', q = 0.9): Promise<Blob> {
  const c = document.createElement('canvas');
  c.width = img.width;
  c.height = img.height;
  c.getContext('2d')!.putImageData(img, 0, 0);
  return canvasToBlob(c, type, q);
}

/** Busca el borde más marcado cerca de un punto (trazado asistido). */
export function snapToEdge(img: ImageData, p: Pt, radius: number): Pt {
  const { width: w, height: h, data } = img;
  const lum = (x: number, y: number) => {
    const i = (Math.max(0, Math.min(h - 1, y)) * w + Math.max(0, Math.min(w - 1, x))) * 4;
    return 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
  };
  let best = p;
  let bestG = 0;
  const r = Math.round(radius);
  for (let y = Math.round(p.y) - r; y <= Math.round(p.y) + r; y++) {
    for (let x = Math.round(p.x) - r; x <= Math.round(p.x) + r; x++) {
      if ((x - p.x) ** 2 + (y - p.y) ** 2 > r * r) continue;
      const gx = lum(x + 1, y - 1) + 2 * lum(x + 1, y) + lum(x + 1, y + 1) - lum(x - 1, y - 1) - 2 * lum(x - 1, y) - lum(x - 1, y + 1);
      const gy = lum(x - 1, y + 1) + 2 * lum(x, y + 1) + lum(x + 1, y + 1) - lum(x - 1, y - 1) - 2 * lum(x, y - 1) - lum(x + 1, y - 1);
      const g = Math.hypot(gx, gy) - 0.02 * Math.hypot(x - p.x, y - p.y);
      if (g > bestG) {
        bestG = g;
        best = { x, y };
      }
    }
  }
  return bestG > 40 ? best : p;
}

/**
 * Corrige la perspectiva de toda la imagen: el cuadrilátero `quad` (px) pasa a
 * ser un rectángulo de wMm × hMm. Devuelve la imagen corregida y su escala.
 */
export function rectifyWhole(src: ImageData, quad: Pt[], wMm: number, hMm: number, maxSide = 2400): { img: ImageData; mmPerPx: number } {
  const side = (a: Pt, b: Pt) => Math.hypot(a.x - b.x, a.y - b.y);
  const pxQuad = (side(quad[0], quad[1]) + side(quad[3], quad[2])) / 2;
  let pxPerMm = pxQuad / wMm;
  const dstRect: Pt[] = [
    { x: 0, y: 0 },
    { x: wMm, y: 0 },
    { x: wMm, y: hMm },
    { x: 0, y: hMm }
  ];
  const Hmm = homography(quad, dstRect);
  const corners = [
    { x: 0, y: 0 },
    { x: src.width, y: 0 },
    { x: src.width, y: src.height },
    { x: 0, y: src.height }
  ].map((p) => applyH(Hmm, p));
  // Limitar el área para evitar horizontes infinitos en perspectivas extremas.
  const clampX = (v: number) => Math.max(-wMm * 3, Math.min(wMm * 4, v));
  const clampY = (v: number) => Math.max(-hMm * 3, Math.min(hMm * 4, v));
  const minX = Math.min(...corners.map((c) => clampX(c.x)));
  const maxX = Math.max(...corners.map((c) => clampX(c.x)));
  const minY = Math.min(...corners.map((c) => clampY(c.y)));
  const maxY = Math.max(...corners.map((c) => clampY(c.y)));
  const wOut = maxX - minX;
  const hOut = maxY - minY;
  pxPerMm = Math.min(pxPerMm, maxSide / Math.max(wOut, hOut));
  const outW = Math.max(1, Math.round(wOut * pxPerMm));
  const outH = Math.max(1, Math.round(hOut * pxPerMm));
  // Mapa inverso: píxel de salida → mm → píxel de origen.
  const inv = homography(dstRect, quad);
  const out = new ImageData(outW, outH);
  const s = src.data;
  const o = out.data;
  const sw = src.width;
  const sh = src.height;
  for (let y = 0; y < outH; y++) {
    for (let x = 0; x < outW; x++) {
      const p = applyH(inv, { x: minX + (x + 0.5) / pxPerMm, y: minY + (y + 0.5) / pxPerMm });
      const fx = p.x - 0.5;
      const fy = p.y - 0.5;
      const x0 = Math.floor(fx);
      const y0 = Math.floor(fy);
      const idx = (y * outW + x) * 4;
      if (x0 < 0 || y0 < 0 || x0 >= sw - 1 || y0 >= sh - 1) {
        o[idx] = o[idx + 1] = o[idx + 2] = 255;
        o[idx + 3] = 255;
        continue;
      }
      const ax = fx - x0;
      const ay = fy - y0;
      for (let c = 0; c < 4; c++) {
        const i00 = (y0 * sw + x0) * 4 + c;
        o[idx + c] = (s[i00] * (1 - ax) + s[i00 + 4] * ax) * (1 - ay) + (s[i00 + sw * 4] * (1 - ax) + s[i00 + sw * 4 + 4] * ax) * ay;
      }
    }
  }
  return { img: out, mmPerPx: 1 / pxPerMm };
}
