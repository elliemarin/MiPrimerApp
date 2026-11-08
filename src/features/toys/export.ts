import { PDFDocument, PrintScaling } from 'pdf-lib';
import { FlowDoc } from '../../lib/pdf/doc';
import { pieceDrawable } from '../../lib/draw/drawable';
import { IDENTITY, bboxOf, bboxW, bboxH } from '../../lib/geom/vec';
import { formatLength } from '../../lib/units';
import type { Params } from '../../lib/pattern/generator';
import type { PlushCard } from '../../data/toys';
import { exportDrawables } from '../figures/export';
import { prepareToy } from './prepare';

const FABRIC: Record<string, string> = { principal: 'Tela principal', contraste: 'Tela de contraste', forro: 'Forro', entretela: 'Entretela', 'punto-elastico': 'Punto elástico' };

/** Uses the regular pattern pieces (seam line, cut line, notches) at 1:1, never a scaled drawing. */
export async function buildToyPdf(card: PlushCard, input: Params) {
  const { built, generator, params } = prepareToy(card, input);
  const errors = built.issues.filter(i => i.level === 'error');
  if (errors.length || !built.result || !built.pieces.length) throw new Error(errors.map(i => i.message).join('\n') || 'No se pudieron generar las piezas.');
  const r = built.result, cm = (mm: number) => formatLength(mm, 'cm');
  const manifest = { format: 'hilvana-juguete-v1', toyId: card.id, generatorId: generator.id, params, scale: '1:1 mm', pieces: built.pieces.map(p => ({ id: p.id, name: p.name, qty: p.cut.qty, fabric: p.cut.fabric })), seams: built.seamResults.map(s => ({ id: s.relation.id, ok: s.ok, a: Math.round(s.lengthA * 10) / 10, b: Math.round(s.lengthB * 10) / 10 })), experimental: true };
  const doc = await FlowDoc.create(`${card.name} · Juguetes y peluches · Hilvana`);
  doc.title(card.name);
  doc.para(card.description, 3.4);
  const size = r.checks?.[0];
  if (size) doc.para(`${size.label}: ${cm(size.measured)}. Margen de costura incluido en las piezas (${cm(Number(params.margen ?? 0))}).`, 3, { bold: true });
  doc.heading('Antes de empezar');
  for (const n of r.notices) if (n.level !== 'error') doc.para(n.message, 2.9);
  doc.para('Imprime las hojas al 100 %, sin ajustar. Comprueba el cuadrado de 5 × 5 cm. Línea continua: corte; discontinua: costura. Los piquetes marcan dónde van brazos, piernas, orejas y la abertura para voltear.', 2.9);
  doc.heading('Materiales');
  for (const m of r.materials) doc.para(`${m.label}: ${m.qty}${m.note ? `. ${m.note}` : ''}`, 2.9);
  doc.heading('Qué cortar');
  doc.table(['Pieza', 'Cantidad', 'Tela', 'Tamaño con margen'], built.pieces.map(p => { const b = bboxOf(built.cuts.get(p.id)!.points); return [p.name, String(p.cut.qty), FABRIC[p.cut.fabric] ?? p.cut.fabric, `${cm(bboxW(b))} × ${cm(bboxH(b))}`]; }), [3, 0.8, 1.4, 1.6]);
  if (built.seamResults.length) {
    doc.heading('Costuras comprobadas');
    doc.table(['Costura', 'Largo', 'Estado'], built.seamResults.map(s => [s.relation.label, `${cm(s.lengthA)} / ${cm(s.lengthB)}`, s.ok ? 'Coinciden' : 'Revisar']), [3.4, 1.4, 1]);
  }
  doc.heading('Paso a paso');
  r.steps.forEach((s, i) => { doc.para(`${i + 1}. ${s.title}`, 3.1, { bold: true }); doc.para(s.detail, 2.9); });
  for (const a of r.assumptions) doc.para(a, 2.6);
  const drawables = built.pieces.map(p => pieceDrawable(p, built.cuts.get(p.id)!, IDENTITY, { subtitle: `${card.name} · experimental`, version: 'Juguetes v1' }));
  const parts = await exportDrawables(drawables, { title: `${card.name} · piezas`, footer: 'Hilvana · Juguetes y peluches · 1:1', lines: [card.name, 'Márgenes incluidos. Imprime al 100 %, sin ajustar.'], json: manifest });
  const out = await PDFDocument.load(await doc.save());
  const firstPattern = out.getPageCount() + 1;
  for (const bytes of parts.files) { const src = await PDFDocument.load(bytes); for (const page of await out.copyPages(src, src.getPageIndices())) out.addPage(page); }
  out.setTitle(`${card.name} · Hilvana`);
  out.catalog.getOrCreateViewerPreferences().setPrintScaling(PrintScaling.None);
  await out.attach(new TextEncoder().encode(JSON.stringify(manifest, null, 2)), 'juguete.json', { mimeType: 'application/json', description: 'Parámetros, piezas y costuras comprobadas del juguete.' });
  return { bytes: await out.save(), pageCount: out.getPageCount(), patternStartPage: firstPattern, piecePages: parts.pages, manifest };
}
