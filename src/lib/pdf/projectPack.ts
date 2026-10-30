import { PDFDocument, PrintScaling } from 'pdf-lib';
import type { ExportDeps, Project } from '../../store/types';
import { depsLines } from '../../store/exports';
import { findModel } from '../../data/catalog';
import { buildPattern, type BuiltPattern, type PatternState } from '../pattern/engine';
import { pieceDrawable, type Drawable } from '../draw/drawable';
import { pieceSeamCmds, cmdsBBox } from '../draw/paths';
import { bboxOf } from '../geom/vec';
import { stableHash } from '../ids';
import { MEASURE_BY_KEY } from '../sizes/measurements';
import { computeCutouts, cutoutDrawables, type Cutout } from '../../features/studio/despiece';
import { CUT_TECHNIQUES } from '../../features/studio/model';
import { panelPatternFromDesign } from '../../features/studio/panelWorkflow';
import { embroideryForView, embroideryViews } from '../../features/projects/tabs/embroideryExport';
import { reconcileComponentDesign, componentDesignIssues, isComponentElementId } from '../../features/customize/componentDesign';
import { buildSummaryPdf, type SummaryCtx } from './summary';
import { FlowDoc } from './doc';
import { arrangeForTiles, exportTiledPdf } from './export';
import { DEFAULT_TILE, validateTileSettings, type TileSettings } from './tile';

export type SewingPackMode = 'complete' | 'intervention';
export interface SewingPackCtx extends SummaryCtx {
  tile?: TileSettings;
  deps?: ExportDeps;
  mode?: SewingPackMode;
}
export interface SewingPackDrawing {
  id: string;
  title: string;
  count: number;
  drawables: Drawable[];
  note: string;
}
export interface SewingPackPreview {
  /** Resolved current panel cuts, without mutating the stored project. */
  project: Project;
  built?: BuiltPattern;
  mode: SewingPackMode;
  blockers: string[];
  warnings: string[];
  pieces: { id: string; name: string; qty: number; onFold: boolean; wMm: number; hMm: number; cutWMm: number; cutHMm: number }[];
  cutouts: Cutout[];
  embroideryCount: number;
  drawings: SewingPackDrawing[];
}

export function hasSewingBase(project: Project): boolean {
  if(!project.pattern) return false;
  const built=buildPattern(project.pattern);
  return !!built.generator || project.pattern.customPieces.some(piece=>!piece.id.startsWith('componente-'));
}

function interventionPattern(pattern?: PatternState): PatternState | undefined {
  if(!pattern?.components?.length) return undefined;
  return {...pattern, generatorId:'manual',customPieces:[],panelCuts:pattern.panelCuts?.filter(cut=>cut.pieceId.startsWith('componente-')),body:{},
    components:pattern.components.map(component=>({...component,placement:component.placement?{...component.placement,pieceId:undefined}:undefined}))};
}

/** A complete sewing pack must never silently substitute a flat drawing for a pattern. */
export function prepareSewingPack(source: Project, ctx: SewingPackCtx): SewingPackPreview {
  const mode = ctx.mode ?? 'complete';
  let project = reconcileComponentDesign(source,ctx.fabrics);
  const blockers: string[] = [];
  const warnings: string[] = [];
  blockers.push(...componentDesignIssues(project));
  const doc = project.design;
  // Complement previews belong to the construction engine, not to applique templates.
  const decorativeDoc=doc?{...doc,elements:doc.elements.filter(element=>!isComponentElementId(element.id))}:undefined;
  if (doc?.panelCuts !== undefined && (doc.panelCuts.length || project.pattern?.panelCuts?.length)) {
    const resolved = panelPatternFromDesign(project, doc, ctx.fabrics);
    blockers.push(...resolved.errors);
    if (resolved.pattern && !resolved.errors.length) project = { ...project, pattern: resolved.pattern };
  }
  const pattern=mode==='intervention'?interventionPattern(project.pattern):project.pattern;
  const built = pattern ? buildPattern(pattern) : undefined;
  const pieces: SewingPackPreview['pieces'] = [];
  const drawings: SewingPackDrawing[] = [];
  if (mode === 'complete' && !hasSewingBase(project)) blockers.push('Falta un patrón de confección real. Elige una base con patrón en Biblioteca; una foto o un boceto no define sus piezas.');
  if (built) {
    if (built?.missing.length) blockers.push(`Completa las medidas en Patronaje: ${built.missing.map(key => MEASURE_BY_KEY[key]?.label ?? key).join(', ')}.`);
    blockers.push(...(built?.issues.filter(issue => issue.level === 'error').map(issue => issue.message) ?? []));
    const excluded = built.pieces.filter(piece => pattern!.hidden.includes(piece.id) || pattern!.hidden.includes(piece.panelSource?.pieceId ?? piece.id) || pattern!.noExport?.includes(piece.id) || pattern!.noExport?.includes(piece.panelSource?.pieceId ?? piece.id));
    if (excluded.length) blockers.push(`Hay ${excluded.length} piezas ocultas o excluidas. En Patronaje vuelve a mostrarlas e inclúyelas en Exportar para obtener el paquete completo: ${excluded.map(piece => piece.name).join(', ')}.`);
    {
      const ds: Drawable[] = [];
      for (const piece of built.pieces) {
        const cut = built.cuts.get(piece.id);
        if (!cut) { blockers.push(`No se pudo calcular el contorno de corte de «${piece.name}». Revisa la pieza en Patronaje.`); continue; }
        const seamBox = cmdsBBox(pieceSeamCmds(piece));
        const cutBox = bboxOf(cut.points);
        pieces.push({ id: piece.id, name: piece.name, qty: piece.cut.qty, onFold: !!piece.cut.onFold,
          wMm: seamBox.maxX-seamBox.minX, hMm: seamBox.maxY-seamBox.minY,
          cutWMm: cutBox.maxX-cutBox.minX, cutHMm: cutBox.maxY-cutBox.minY });
        // Layout translations are deliberately discarded; templates retain their physical geometry.
        ds.push(pieceDrawable(piece, cut, undefined, { subtitle: project.name, version: ctx.deps?.pattern ? `Patrón v${ctx.deps.pattern.n}` : '' }));
      }
      if (ds.length) drawings.push({ id: 'patron', title: mode==='complete'?'Patrones de confección':'Patrones de los complementos', count: ds.length, drawables: ds, note: mode==='complete'?'Incluye la base, sus paneles y todos los complementos. Los márgenes están fuera de la línea de costura y ya están incluidos.':'Incluye solo los complementos de la intervención. La prenda base no está incluida. Sus márgenes ya están añadidos.' });
      if (built.generator?.status === 'experimental' || (project.modelId && findModel(project.modelId)?.status === 'experimental')) warnings.push('Patrón experimental: imprime al 100 %, comprueba las medidas y cose una muestra antes de cortar la tela definitiva.');
      if(mode==='complete' && !built.generator) warnings.push('La base trazada manualmente no tiene instrucciones automáticas de montaje. Confirma el orden de costura de sus piezas antes de confeccionarla.');
      warnings.push(...built.issues.filter(issue => issue.level !== 'error').map(issue => issue.message));
    }
  }
  if(mode==='intervention') warnings.push('Este PDF incluye únicamente la intervención: complementos, recortes y guías del estudio. No incluye el patrón para confeccionar la prenda base.');

  const cutouts = decorativeDoc ? computeCutouts(decorativeDoc, ctx.fabrics, ctx.unit) : [];
  if (decorativeDoc) {
    const cutIds = new Set(cutouts.map(cutout => cutout.elementId));
    for (const element of decorativeDoc.elements) {
      if (element.hidden || element.kind === 'grupo') continue;
      if (CUT_TECHNIQUES.includes(element.technique)) {
        if (element.kind === 'texto' || element.kind === 'parche') blockers.push(`«${element.name}» necesita un contorno de recorte propio. Conviértelo en una figura o trazo cerrado en Estudio antes de generar sus plantillas.`);
        else if (!cutIds.has(element.id)) blockers.push(`«${element.name}» no produce un recorte cerrado visible. Revisa su contorno y su máscara en Estudio.`);
      }
    }
    const cutDs = cutoutDrawables(cutouts, ctx.unit, ctx.deps?.design ? `Diseño v${ctx.deps.design.n}` : '');
    if (cutDs.length) drawings.push({ id: 'aplicaciones', title: 'Aplicaciones y bases de refuerzo', count: cutDs.length, drawables: cutDs, note: 'La línea continua es el corte y la discontinua el tamaño terminado. Incluye las bases de refuerzo elegidas; la termoadhesiva se entrega en espejo.' });
  }

  let embroideryCount = 0;
  if (decorativeDoc) for (const view of embroideryViews(decorativeDoc)) {
    const elements = decorativeDoc.elements.filter(element => element.viewId === view.id && element.technique === 'bordado' && !element.hidden && element.kind !== 'grupo');
    const unsupported = elements.filter(element => element.kind === 'texto' || element.kind === 'imagen' || element.kind === 'parche' || !!element.clip || !!element.maskZoneId);
    if (unsupported.length) blockers.push(`El bordado de «${view.label}» contiene elementos que necesitan digitalización: ${unsupported.map(element => element.name).join(', ')}. Usa figuras/trazos sin máscaras para obtener su guía vectorial.`);
    const ids = new Set(unsupported.map(element => element.id));
    const isolated = { ...decorativeDoc, elements: elements.filter(element => !ids.has(element.id)) };
    const ds = embroideryForView(isolated, view.id);
    embroideryCount += ds.length;
    if (ds.length) drawings.push({ id: `bordado-${view.id}`, title: `Guía de bordado · ${view.label}`, count: ds.length, drawables: ds, note: 'Dibujo de transferencia a tamaño real. Conserva la posición relativa de los motivos de esta vista. No es un molde de tela ni un archivo de puntadas.' });
  }
  if (embroideryCount) warnings.push('Los bordados se incluyen como guías vectoriales 1:1. Para bordado a máquina requieren digitalización y una prueba en retazo.');
  const references = decorativeDoc?.elements.filter(element => !element.hidden && element.kind !== 'grupo' && element.technique === 'ninguna') ?? [];
  if (references.length) warnings.push(`${references.length} dibujos sin técnica quedan como referencias visuales. Si necesitas cortarlos o bordarlos, asígnales Aplicación o Bordado en Estudio.`);
  if (doc?.views.some(view => view.source.type === 'foto' && !view.photo?.mmPerPx)) warnings.push('Hay fotografías sin calibrar: sus ubicaciones son orientativas. Las piezas del patrón conservan sus medidas físicas.');
  if (mode === 'intervention' && !drawings.length) blockers.push('Todavía no hay recortes o guías exportables. En Estudio asigna Aplicación a una figura cerrada o Bordado a una figura o trazo.');
  const tile = { ...(ctx.tile ?? DEFAULT_TILE), footer: 13 };
  blockers.push(...validateTileSettings(tile));
  return { project, built, mode, blockers: [...new Set(blockers)], warnings: [...new Set(warnings)], pieces, cutouts, embroideryCount, drawings };
}

export interface SewingPackManifest {
  format: 'hilvana-confeccion-v1';
  projectId: string;
  mode: SewingPackMode;
  scale: '1:1 mm';
  dependencies: ExportDeps;
  patternHash?: string;
  pieces: SewingPackPreview['pieces'];
  cutouts: { id: string; elementId: string; name: string; allowanceMm: number; fabricName: string }[];
  sections: { id: string; title: string; startPage: number; endPage: number; count: number }[];
  warnings: string[];
}

/** Merge actual PDF pages: copyPages does not rasterize or resize their geometry. */
export async function buildSewingPackPdf(project: Project, ctx: SewingPackCtx): Promise<{ bytes: Uint8Array; pageCount: number; manifest: SewingPackManifest; project: Project }> {
  const preview = prepareSewingPack(project, ctx);
  if (preview.blockers.length) throw new Error(preview.blockers.join('\n'));
  const resolved = preview.project;
  const tile = { ...(ctx.tile ?? DEFAULT_TILE), footer: 13 };
  const deps = ctx.deps ?? {};
  const sections: { id: string; title: string; count: number; bytes: Uint8Array; pages: number }[] = [];
  const summaryBytes = await buildSummaryPdf(preview.mode === 'intervention' ? { ...resolved, pattern: interventionPattern(resolved.pattern) } : resolved, ctx);
  sections.push({ id: 'guia', title: 'Diseño, medidas, materiales e instrucciones', count: 1, bytes: summaryBytes, pages: (await PDFDocument.load(summaryBytes)).getPageCount() });
  for (const drawing of preview.drawings) {
    const result = await exportTiledPdf(arrangeForTiles(drawing.drawables, tile), { settings: tile }, {
      title: drawing.id.startsWith('bordado-')?'Guía de bordado':drawing.title,
      lines: [...depsLines(resolved, deps), drawing.title, drawing.note],
      footer: `${resolved.name.slice(0, 24)} · ${drawing.id === 'patron' ? 'patrón' : drawing.id === 'aplicaciones' ? 'aplicaciones' : 'bordado'}`,
      json: { proyectoId: resolved.id, seccion: drawing.id, dependencias: deps, nota: drawing.note }
    });
    sections.push({ id: drawing.id, title: drawing.title, count: drawing.count, bytes: result.bytes, pages: result.pages.length+1 });
  }
  const manifest: SewingPackManifest = {
    format: 'hilvana-confeccion-v1', projectId: resolved.id, mode: preview.mode, scale: '1:1 mm', dependencies: deps,
    patternHash: preview.mode === 'complete' && resolved.pattern ? stableHash(resolved.pattern) : undefined,
    pieces: preview.pieces,
    cutouts: preview.cutouts.map(cutout => ({ id: cutout.id, elementId: cutout.elementId, name: cutout.name, allowanceMm: cutout.allowance, fabricName: cutout.fabricName })),
    sections: [], warnings: preview.warnings
  };
  // A wrapping cover can span several pages. Rebuild its index using the real
  // cover length so its printed page ranges match the merged document exactly.
  let frontBytes:Uint8Array=new Uint8Array();
  let coverPages=1;
  for(let pass=0;pass<4;pass++) {
    const front = await FlowDoc.create(`${resolved.name} · PDF de ${preview.mode === 'complete' ? 'confección' : 'intervención'} · Hilvana`);
    front.title(preview.mode === 'complete' ? 'Tu proyecto para coser' : 'Tu intervención para coser');
    front.para(resolved.name, 4, { bold: true });
    front.para(`${preview.pieces.length} plantillas de ${preview.mode==='complete'?'confección':'complementos'}, ${preview.cutouts.length} recortes y ${preview.embroideryCount} motivos de bordado.${preview.mode==='intervention'?' La prenda base no se incluye.':''}`, 3.1);
    front.heading('Antes de cortar');
    front.checkbox('Lava y plancha la tela; verifica las medidas y la holgura de la prenda.', false);
    front.checkbox('Imprime primero la portada de patrones al 100 %, sin ajustar a la página. Mide su cuadrado de 5 × 5 cm y su barra de 10 cm.', false);
    front.checkbox('Recorta y pega el mosaico siguiendo sus códigos y rombos. Los márgenes ya están incluidos; no los vuelvas a añadir.', false);
    front.para('La ficha muestra la composición plana. Las páginas de patrón y plantillas son los documentos para medir y cortar a escala real.', 2.8);
    for (const warning of preview.warnings) front.para(warning, 2.7);
    front.heading('Contenido');
    let nextPage=coverPages+1;
    for (const section of sections) {
      const end=nextPage+section.pages-1;
      front.para(`Páginas ${nextPage}–${end} · ${section.title} · ${section.count} ${section.id==='guia'?'guía':'plantillas o motivos'}.`,2.9);
      nextPage=end+1;
    }
    for (const line of depsLines(resolved, deps)) front.para(line, 2.5, { gap: .3 });
    frontBytes=await front.save();
    if(front.doc.getPageCount()===coverPages) break;
    coverPages=front.doc.getPageCount();
  }
  const doc = await PDFDocument.load(frontBytes);
  for (const section of sections) {
    const startPage = doc.getPageCount()+1;
    const part = await PDFDocument.load(section.bytes);
    const pages = await doc.copyPages(part, part.getPageIndices());
    for (const page of pages) doc.addPage(page);
    manifest.sections.push({ id: section.id, title: section.title, startPage, endPage: doc.getPageCount(), count: section.count });
  }
  doc.setTitle(`${resolved.name} · PDF ${preview.mode === 'complete' ? 'completo de confección' : 'de intervención'}`);
  doc.setSubject('Guía de confección y plantillas vectoriales a escala 1:1 en hojas carta');
  doc.setProducer('Hilvana');
  doc.setCreator('Hilvana');
  doc.catalog.getOrCreateViewerPreferences().setPrintScaling(PrintScaling.None);
  await doc.attach(new TextEncoder().encode(JSON.stringify(manifest, null, 2)), 'confeccion.json', { mimeType: 'application/json', description: 'Piezas, secciones y versiones del proyecto de confección' });
  return { bytes: await doc.save(), pageCount: doc.getPageCount(), manifest, project: resolved };
}
