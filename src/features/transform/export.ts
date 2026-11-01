import { PDFDocument, PrintScaling } from 'pdf-lib';
import type { TransformationIdea } from '../../data/transformations';
import { TRANSFORMATION_CONSTRUCTIONS } from '../../data/transformations';
import type { Params } from '../../lib/pattern/generator';
import { buildPattern, newPatternState } from '../../lib/pattern/engine';
import { TRANSFORMATION_CONTEXT, TRANSFORMATION_GENERATORS, transformationGeneratorId } from '../../lib/pattern/generators/transformations';
import { FlowDoc } from '../../lib/pdf/doc';
import { arrangeForTiles, exportTiledPdf } from '../../lib/pdf/export';
import { DEFAULT_TILE } from '../../lib/pdf/tile';
import { pieceDrawable } from '../../lib/draw/drawable';
import { IDENTITY, bboxOf, bboxW, bboxH } from '../../lib/geom/vec';
import { formatLength } from '../../lib/units';

export function prepareTransformation(idea: TransformationIdea, input: Params = {}) {
  const generator = TRANSFORMATION_GENERATORS.find(item => item.id === transformationGeneratorId(idea.construction))!;
  const params = { ...generator.defaults(TRANSFORMATION_CONTEXT), ...idea.params, ...input };
  const state = newPatternState(generator.id, {}, TRANSFORMATION_CONTEXT);
  state.params = params;
  const built = buildPattern(state);
  return { generator, params, state, built };
}

/** Uses the existing vector/mm exporter, never a scaled illustration. */
export async function buildTransformationPdf(idea: TransformationIdea, params: Params, placementNote = '') {
  const prepared = prepareTransformation(idea, params);
  const { built, generator } = prepared;
  const errors = built.issues.filter(issue => issue.level === 'error');
  if (errors.length || !built.pieces.length || !built.result) throw new Error(errors.map(issue => issue.message).join('\n') || 'No se pudieron generar las piezas.');
  const result = built.result;
  const manifest = {
    format: 'hilvana-transformacion-v1', ideaId: idea.id, title: idea.name, generatorId: generator.id,
    scale: '1:1 mm', includesBaseGarment: false, params: prepared.params, placement: { instruction: idea.placement, note: placementNote },
    pieces: result.pieces.map(piece => ({ id: piece.id, name: piece.name, cut: piece.cut, edges: piece.edges.map(edge => ({ id: edge.id, allowanceMm: edge.allowance, finish: edge.finish })) })),
    checks: result.checks, assumptions: result.assumptions, experimental: true
  };
  const guide = await FlowDoc.create(`${idea.name} · Transformaciones · Hilvana`);
  guide.title(idea.name);
  guide.para(idea.effect, 4);
  guide.para(`${TRANSFORMATION_CONSTRUCTIONS[idea.construction]}. Piezas nuevas para modificar una prenda que ya tienes; la prenda base no se incluye.`, 3.2, { bold: true });
  guide.heading('Antes de empezar');
  guide.para('Experimental: prueba el montaje en retazos y después hilvana sobre la prenda. Los valores deben ser medidas reales de tu prenda, no una talla corporal ni medidas deducidas de una fotografía.');
  guide.para('Imprime las hojas de patrón al 100 %, sin ajustar. Comprueba el cuadrado de 5 × 5 cm y la barra de 10 cm de la portada de patrones. Los márgenes ya están incluidos.');
  guide.heading('Dónde va');
  guide.para(idea.placement);
  if (placementNote.trim()) guide.para(`Tus referencias de colocación: ${placementNote.trim()}`);
  guide.para('Marca la posición sobre la prenda puesta. Mide y anota la distancia a dos referencias fijas antes de coser. Las ilustraciones de pantalla son esquemas orientativos y no sirven para medir.');
  guide.heading('Medidas que has indicado');
  guide.table(['Medida', 'Valor'], generator.params.map(def => {
    const value = prepared.params[def.key];
    return [def.label, def.type === 'length' ? formatLength(Number(value), 'cm') : def.type === 'choice' ? def.choices!.find(option => option.value === String(value))?.label ?? String(value) : String(value)];
  }), [2, 1]);
  guide.heading('Tela y materiales');
  guide.para(idea.fabric);
  for (const material of result.materials) guide.para(`${material.label}: ${material.qty}${material.note ? `. ${material.note}` : ''}`);
  guide.heading('Qué cortar');
  guide.table(['Pieza', 'Cantidad', 'Espacio por pieza, con márgenes'], built.pieces.map(piece => {
    const bounds = bboxOf(built.cuts.get(piece.id)!.points);
    return [piece.name, `${piece.cut.qty}${piece.cut.fabric === 'forro' ? ' de reverso' : ''}`, `${formatLength(bboxW(bounds), 'cm')} × ${formatLength(bboxH(bounds), 'cm')}`];
  }), [2, 1, 2]);
  guide.para('Estas dimensiones son el rectángulo que ocupa cada pieza, no el consumo total de tela. Multiplica por las cantidades, respeta el hilo y deja espacio para el estampado y posibles empalmes.');
  guide.heading('Montaje paso a paso');
  result.steps.forEach((step, index) => { guide.para(`${index + 1}. ${step.title}`, 3.2, { bold: true }); guide.para(step.detail); });
  guide.heading('Qué se ha comprobado');
  guide.table(['Medida geométrica', 'Resultado'], result.checks.map(item => [item.label, formatLength(item.measured, 'cm')]), [3, 1]);
  for (const assumption of result.assumptions) guide.para(assumption, 2.8);

  const drawing = built.pieces.map(piece => pieceDrawable(piece, built.cuts.get(piece.id)!, IDENTITY, { subtitle: 'Solo piezas nuevas · Experimental', version: 'Transformaciones v1' }));
  const tiled = await exportTiledPdf(arrangeForTiles(drawing, DEFAULT_TILE), { settings: DEFAULT_TILE }, {
    title: idea.name, footer: 'Hilvana · Transformación · 1:1', lines: ['Piezas nuevas; la prenda base no está incluida.', 'Márgenes incluidos. Imprime al 100 %, sin ajustar.'], json: manifest
  });
  const document = await PDFDocument.load(await guide.save());
  const tiledDocument = await PDFDocument.load(tiled.bytes);
  const patternStartPage = document.getPageCount() + 1;
  for (const page of await document.copyPages(tiledDocument, tiledDocument.getPageIndices())) document.addPage(page);
  document.setTitle(`${idea.name} · Hilvana`);
  document.catalog.getOrCreateViewerPreferences().setPrintScaling(PrintScaling.None);
  await document.attach(new TextEncoder().encode(JSON.stringify(manifest, null, 2)), 'transformacion.json', { mimeType: 'application/json', description: 'Medidas, piezas nuevas y colocación de la transformación.' });
  return { bytes: await document.save(), manifest, pageCount: document.getPageCount(), patternStartPage };
}
