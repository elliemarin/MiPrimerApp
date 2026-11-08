import { PDFDocument, PrintScaling } from 'pdf-lib';
import type { Pt } from '../../lib/geom/vec';
import { bboxOf } from '../../lib/geom/vec';
import { intersectPolygons, offsetPolygons, polygonsArea } from '../../lib/geom/polyoffset';
import { polylineCmds, type PathCmd } from '../../lib/draw/paths';
import { drawableBBox, type DrawLabel, type DrawPath, type Drawable } from '../../lib/draw/drawable';
import { FlowDoc } from '../../lib/pdf/doc';
import { arrangeForTiles, exportPackedPdf, exportTiledPdf, type ExportInfo } from '../../lib/pdf/export';
import { DEFAULT_TILE, contentBox } from '../../lib/pdf/tile';
import { FIGURE_CATEGORY_LABEL, TURN_ALLOWANCE, areaByColor, components, type BuiltFigure, type FigurePiece } from '../../lib/applique/figure';

const cmds = (polys: Pt[][]): PathCmd[] => polys.flatMap(p => polylineCmds(p, true));
const cm = (mm: number) => `${(mm / 10).toLocaleString('es', { maximumFractionDigits: 1 })} cm`;
/** Nombre aproximado de un color de muestra, para la lista de telas. */
export function colorName(hex: string): string {
  const n = parseInt(hex.slice(1), 16), r = ((n >> 16) & 255) / 255, g = ((n >> 8) & 255) / 255, b = (n & 255) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b), l = (max + min) / 2, d = max - min, sat = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1));
  if (l > 0.9) return 'blanco';
  if (l < 0.16) return 'negro';
  if (sat < 0.14) return l > 0.62 ? 'gris claro' : l > 0.4 ? 'gris' : 'gris oscuro';
  let h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  h = (h * 60 + 360) % 360;
  const tone = l > 0.72 ? ' claro' : l < 0.32 ? ' oscuro' : '';
  if (h < 18 || h >= 345) return l > 0.72 ? 'rosa' : `rojo${tone}`;
  if (h < 40) return sat < 0.45 || l < 0.4 ? `marrón${tone}` : l > 0.75 ? 'melocotón' : 'naranja';
  if (h < 52) return l > 0.8 ? 'crema' : sat < 0.45 ? 'beige' : l > 0.6 ? 'amarillo' : 'mostaza';
  if (h < 68) return `amarillo${tone}`;
  if (h < 160) return `verde${tone}`;
  if (h < 200) return `turquesa${tone}`;
  if (h < 250) return `azul${tone}`;
  if (h < 290) return `morado${tone}`;
  return `rosa${l < 0.4 ? ' fucsia' : tone}`;
}
const flip = (polys: Pt[][], axis: number) => polys.map(p => p.map(q => ({ x: 2 * axis - q.x, y: q.y })).reverse());

/** A point well inside the visible part of a piece, for its number. */
export function labelPoint(polys: Pt[][]): Pt {
  for (const r of [10, 6, 3.5, 2, 1]) {
    const core = offsetPolygons(polys, -r).filter(p => p.length >= 3);
    if (core.length) {
      const big = core.reduce((a, b) => (polygonsArea([b]) > polygonsArea([a]) ? b : a));
      const bb = bboxOf(big), c = { x: (bb.minX + bb.maxX) / 2, y: (bb.minY + bb.maxY) / 2 };
      // The bbox centre of a curved core can fall outside; then use its first vertex.
      let inside = false;
      for (let i = 0, j = big.length - 1; i < big.length; j = i++) { const a = big[i], b = big[j]; if ((a.y > c.y) !== (b.y > c.y) && c.x < ((b.x - a.x) * (c.y - a.y)) / (b.y - a.y) + a.x) inside = !inside; }
      return inside ? c : big[0];
    }
  }
  const bb = bboxOf(polys.flat());
  return { x: (bb.minX + bb.maxX) / 2, y: (bb.minY + bb.maxY) / 2 };
}

export const techniqueText = (fig: BuiltFigure) => fig.options.technique === 'termoadhesiva'
  ? 'Entretela termoadhesiva y borde crudo: las piezas se cortan al tamaño final y se fijan con zigzag, festón o puntada recta a 2 mm del borde.'
  : `Bordes doblados: cada pieza lleva ${TURN_ALLOWANCE} mm de margen que se dobla hacia dentro y se cose con puntada invisible.`;

/** Guía de colocación a tamaño real: siluetas visibles y número de orden. */
export function guideDrawable(fig: BuiltFigure): Drawable {
  const paths: DrawPath[] = [], labels: DrawLabel[] = [];
  for (const p of fig.pieces.filter(x => !x.hidden)) {
    paths.push({ cmds: cmds(p.visible), style: 'colocacion' });
    const at = labelPoint(p.visible), size = Math.max(2.4, Math.min(5, Math.sqrt(polygonsArea(p.visible)) / 6));
    labels.push({ text: String(p.number), at: { x: at.x, y: at.y + size / 2 }, size, bold: true });
  }
  paths.push({ cmds: cmds(offsetPolygons(fig.pieces.flatMap(p => p.shape), 0)), style: 'final' });
  labels.push({ text: `${fig.def.name} · guía de colocación a tamaño real (${cm(fig.width)} × ${cm(fig.height)})`, at: { x: fig.width / 2, y: fig.height + 7 }, size: 3.2, bold: true });
  labels.push({ text: 'Calca o marca esta guía sobre la tela base. Los números dicen el orden: 1 va primero.', at: { x: fig.width / 2, y: fig.height + 12 }, size: 2.6 });
  return { id: 'guia', name: 'Guía de colocación', paths, labels, grains: [], bbox: drawableBBox(paths, labels) };
}

/** Piezas a 1:1. En espejo, para trazar sobre el papel de la entretela termoadhesiva. */
export function pieceDrawables(fig: BuiltFigure): Drawable[] {
  const mirror = fig.options.mirror && fig.options.technique === 'termoadhesiva';
  // A piece made of separate parts (two eyes, the glass of a stained-glass window) is cut part by part.
  return fig.pieces.filter(p => !p.hidden).flatMap((p: FigurePiece) => {
    const parts = components(p.cut);
    return parts.map((cut, k) => partDrawable(p, parts.length > 1 ? { cut, final: intersectPolygons(p.final, cut), visible: intersectPolygons(p.visible, cut), label: ` · parte ${k + 1} de ${parts.length}`, id: `-${k + 1}` } : { cut: p.cut, final: p.final, visible: p.visible, label: '', id: '' }, mirror));
  });
}

function partDrawable(p: FigurePiece, part: { cut: Pt[][]; final: Pt[][]; visible: Pt[][]; label: string; id: string }, mirror: boolean): Drawable {
  {
    const bb = bboxOf(part.cut.flat()), axis = (bb.minX + bb.maxX) / 2, m = (s: Pt[][]) => (mirror ? flip(s, axis) : s);
    const paths: DrawPath[] = [{ cmds: cmds(m(part.cut)), style: 'corte' }];
    if (p.allowance) paths.push({ cmds: cmds(m(part.final)), style: 'final' });
    // Where the pieces above will sit: the edge of the visible part inside the piece.
    if (p.coveredBy.length) paths.push({ cmds: cmds(m(part.visible)), style: 'colocacion' });
    const cx = axis, y = bb.maxY + 5;
    const swatch = [{ x: cx - 30, y: y - 3.2 }, { x: cx - 26, y: y - 3.2 }, { x: cx - 26, y: y + 0.8 }, { x: cx - 30, y: y + 0.8 }];
    paths.push({ cmds: polylineCmds(swatch, true), style: 'referencia', fillColor: p.color });
    const labels: DrawLabel[] = [
      { text: `${p.number}. ${p.name}${part.label}`, at: { x: cx, y }, size: 3.2, bold: true },
      { text: `Capa ${p.level}${p.sitsOn.length ? ` · va sobre ${p.sitsOn.join(', ')}` : ' · va sobre la tela base'}${p.coveredBy.length ? ` · debajo de ${p.coveredBy.join(', ')}` : ''}`, at: { x: cx, y: y + 4.5 }, size: 2.4 },
      { text: mirror ? 'En espejo: trázala sobre el papel de la termoadhesiva' : p.allowance ? `Corte con ${TURN_ALLOWANCE} mm para doblar (discontinua = tamaño final)` : 'Corte = tamaño final', at: { x: cx, y: y + 8.5 }, size: 2.2 }
    ];
    if (p.coveredBy.length) labels.push({ text: 'Línea fina: borde de la pieza de encima', at: { x: cx, y: y + 12 }, size: 2.2 });
    return { id: `pieza-${p.number}${part.id}`, name: `${p.number}. ${p.name}${part.label}`, paths, labels, grains: [], bbox: drawableBBox(paths, labels) };
  }
}

/** Pieces that fit a Letter sheet are packed several per page; larger ones are tiled with overlap. */
export async function exportDrawables(ds: Drawable[], info: ExportInfo): Promise<{ files: Uint8Array[]; pages: number }> {
  const box = contentBox(DEFAULT_TILE), fits = (d: Drawable) => d.bbox.maxX - d.bbox.minX <= box.w && d.bbox.maxY - d.bbox.minY <= box.h;
  const small = ds.filter(fits), big = ds.filter(d => !fits(d)), files: Uint8Array[] = [];
  let pages = 0;
  if (small.length) { const r = await exportPackedPdf(small, DEFAULT_TILE, info); files.push(r.bytes); pages += r.sheets; }
  if (big.length) { const r = await exportTiledPdf(arrangeForTiles(big, DEFAULT_TILE), { settings: DEFAULT_TILE }, info); files.push(r.bytes); pages += r.pages.length; }
  return { files, pages };
}

export async function buildFigurePdf(fig: BuiltFigure) {
  const { def, options } = fig, pieces = fig.pieces.filter(p => !p.hidden);
  const manifest = {
    format: 'hilvana-figura-tela-v1', figureId: def.id, title: def.name, scale: '1:1 mm', widthMm: Math.round(fig.width * 10) / 10, heightMm: Math.round(fig.height * 10) / 10,
    options: { ...options }, levels: fig.levels,
    pieces: pieces.map(p => ({ number: p.number, name: p.name, level: p.level, color: p.color, sitsOn: p.sitsOn, coveredBy: p.coveredBy, cutAreaCm2: Math.round(p.areaMm2) / 100 }))
  };
  const doc = await FlowDoc.create(`${def.name} · Figuras de tela · Hilvana`);
  doc.title(def.name);
  doc.para(`${FIGURE_CATEGORY_LABEL[def.category]} · ${pieces.length} piezas en ${fig.levels} ${fig.levels === 1 ? 'capa' : 'capas'} · ${cm(fig.width)} × ${cm(fig.height)}`, 3.4, { bold: true });
  doc.para(def.description);
  // Colour preview of the finished figure, drawn from the real pieces.
  const boxW = doc.width, boxH = 95, k = Math.min(boxW / fig.width, boxH / fig.height), ox = doc.m + (boxW - fig.width * k) / 2, oy = doc.y + 2;
  const tx = (p: Pt): Pt => ({ x: ox + p.x * k, y: oy + p.y * k });
  doc.ensure(boxH + 6);
  for (const p of pieces) { doc.cv.fillPathRgb(cmds(p.shape), doc.fillColor(p.color), tx); doc.cv.strokePath(cmds(p.shape), { width: 0.3, dash: [], gray: 0.25 }, tx); }
  for (const p of pieces) { const at = tx(labelPoint(p.visible)); doc.cv.text(String(p.number), at.x, at.y + 1.2, 3, { bold: true, anchor: 'middle' }); }
  doc.y = oy + fig.height * k + 6;
  doc.heading('Cómo se hace');
  doc.para(techniqueText(fig));
  doc.para(`Cada pieza entra ${options.underlap} mm bajo la que va encima, así no quedan huecos al coser los bordes.${options.saveFabric ? ' Lo que queda oculto más allá de esa solapa se recorta para ahorrar tela y bulto.' : ' Las piezas se cortan enteras, aunque una parte quede oculta.'}`);
  doc.para('Imprime al 100 %, sin ajustar. Comprueba el cuadrado de 5 × 5 cm de la portada de patrones.', 2.8);
  doc.heading('Orden de colocación');
  doc.table(['N.º', 'Pieza', 'Capa', 'Va sobre', 'Debajo de'], pieces.map(p => [String(p.number), p.name, String(p.level), p.sitsOn.join(', ') || 'tela base', p.coveredBy.join(', ') || '—']), [0.6, 2.6, 0.7, 1.3, 1.3]);
  doc.heading('Telas');
  doc.table(['Color de muestra', 'Piezas', 'Tela que ocupan'], areaByColor(fig).map(r => [`${colorName(r.color)} (${r.color})`, r.names.join(', '), `${Math.ceil(r.area / 100)} cm² (+30 %: ${Math.ceil((r.area * 1.3) / 100)} cm²)`]), [1, 3, 1.6]);
  if (options.technique === 'termoadhesiva') doc.para(`Entretela termoadhesiva de doble cara: unos ${Math.ceil(pieces.reduce((t, p) => t + p.areaMm2, 0) * 1.3 / 100)} cm².`, 2.8);
  doc.heading('Paso a paso');
  const steps = options.technique === 'termoadhesiva' ? [
    'Lava y plancha las telas. Traza cada pieza (están en espejo) sobre el papel de la entretela, plánchala al revés de su tela y recorta por la línea continua.',
    'Calca la guía de colocación sobre la tela base o colócala debajo si la tela transparenta.',
    `Retira el papel y coloca las piezas en orden, de la 1 a la ${pieces.length}. Cada una monta sobre la solapa de las anteriores.`,
    'Plancha sin arrastrar, con un paño encima, capa por capa.',
    'Cose los bordes empezando por la capa 1: zigzag corto, festón o puntada recta a 2 mm. No hace falta coser el borde que queda tapado.'
  ] : [
    'Lava y plancha las telas. Corta cada pieza por la línea continua y marca la discontinua (tamaño final).',
    'Dobla el margen hacia dentro sobre la discontinua y plánchalo. En las curvas haz piquetes; en la solapa que queda tapada no hace falta doblar.',
    'Marca la guía de colocación sobre la tela base.',
    `Hilvana las piezas en orden, de la 1 a la ${pieces.length}, y cóselas con puntada invisible empezando por la capa 1.`
  ];
  steps.forEach((s, i) => doc.para(`${i + 1}. ${s}`));
  if (fig.warnings.length) { doc.heading('Atención'); for (const w of fig.warnings) doc.para(w, 2.9, { bold: true }); }
  doc.para('Diseño original de Hilvana. Experimental: haz una prueba con retazos antes de la pieza definitiva.', 2.6);

  const info = { title: def.name, footer: 'Hilvana · Figuras de tela · 1:1', lines: [`${cm(fig.width)} × ${cm(fig.height)} · ${pieces.length} piezas`, 'Imprime al 100 %, sin ajustar.'], json: manifest };
  const guide = await exportDrawables([guideDrawable(fig)], { ...info, title: `${def.name} · guía de colocación` });
  const parts = await exportDrawables(pieceDrawables(fig), { ...info, title: `${def.name} · piezas` });
  const out = await PDFDocument.load(await doc.save());
  for (const bytes of [...guide.files, ...parts.files]) { const src = await PDFDocument.load(bytes); for (const page of await out.copyPages(src, src.getPageIndices())) out.addPage(page); }
  out.setTitle(`${def.name} · Hilvana`);
  out.catalog.getOrCreateViewerPreferences().setPrintScaling(PrintScaling.None);
  await out.attach(new TextEncoder().encode(JSON.stringify(manifest, null, 2)), 'figura.json', { mimeType: 'application/json', description: 'Tamaño, opciones y piezas de la figura de tela.' });
  return { bytes: await out.save(), pageCount: out.getPageCount(), guidePages: guide.pages, piecePages: parts.pages, manifest };
}
