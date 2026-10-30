import type { ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import { flushSync } from 'react-dom';
import { findModel } from '../../data/catalog';
import { buildFlat } from '../../data/flats';
import { getFile } from '../../lib/db';
import { canvasToBlob } from '../../lib/image';
import { drawableBBox, pieceDrawable, type Drawable } from '../../lib/draw/drawable';
import { piecesSvg } from '../../lib/draw/svgExport';
import { defaultFigurine } from '../../lib/draw/figurine';
import { supportsModelIllustration } from '../../lib/draw/garmentComposition';
import type { Fabric, Project } from '../../store/types';
import type { DesignDoc, DesignElement, DesignView, Fill } from '../studio/model';
import { StudioDefs, ViewBase, ElementSvg } from '../studio/render';
import { ModelIllustration } from '../library/ModelIllustration';
import { modelMaterials } from '../simple/modelMaterials';
import { simpleViews } from '../simple/workflow';
import { resolveEditorialPattern, visibleEditorialElement } from './prompt';

export interface EditorialAsset {
  id: string;
  name: string;
  label: string;
  blob: Blob;
  width: number;
  height: number;
  kind: 'vistas' | 'detalles';
  projectCodes: string[];
}

export interface EditorialEvidenceInput {
  projects: readonly Project[];
  fabrics: Readonly<Record<string, Fabric>>;
  title?: string;
}

export interface EditorialEvidenceProgress { completed: number; total: number; label: string }
export interface EditorialEvidenceOptions {
  signal?: AbortSignal;
  onProgress?: (progress: EditorialEvidenceProgress) => void;
}

interface Card {
  id: string;
  projectCode: string;
  title: string;
  label: string;
  note: string;
  render: () => Promise<Blob | undefined>;
}

const NS = 'http://www.w3.org/2000/svg';
const PAGE_WIDTH = 2400;
const PAGE_HEIGHT = 3200;
const CARDS_PER_PAGE = 12;
const MAX_IMAGE_BYTES = 19 * 1024 * 1024;
const ink = '#1d2420';

function checkAbort(signal?: AbortSignal) {
  if (signal?.aborted) throw new DOMException('Preparación cancelada.', 'AbortError');
}

function dataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('No se pudo leer una imagen del diseño.'));
    reader.readAsDataURL(blob);
  });
}

function resourceIds(projects: readonly Project[], fabrics: Readonly<Record<string, Fabric>>): string[] {
  const ids = new Set<string>();
  for (const fabric of Object.values(fabrics)) {
    const fileId = fabric.photo?.processedFileId ?? fabric.photo?.originalFileId;
    if (fileId) ids.add(fileId);
  }
  for (const project of projects) {
    const views = activeViews(project.design);
    const viewIds = new Set(views.map(view => view.id));
    for (const view of views) if (view.source.type === 'foto' && view.photo) ids.add(view.source.fileId);
    for (const element of project.design?.elements ?? []) if (viewIds.has(element.viewId) && element.kind !== 'grupo' && visibleEditorialElement(project.design!, element) && element.image?.fileId) ids.add(element.image.fileId);
  }
  return [...ids];
}

function activeViews(doc?: DesignDoc): DesignView[] {
  if (!doc) return [];
  const result = [...(doc.simpleWorkflow ? simpleViews(doc) : doc.views)];
  const ids = new Set(result.map(view => view.id));
  for (const element of doc.elements) if (visibleEditorialElement(doc, element) && ids.has(element.viewId) && element.patchViewId && !ids.has(element.patchViewId)) {
    const patch = doc.views.find(view => view.id === element.patchViewId);
    if (patch) { result.push(patch); ids.add(patch.id); }
  }
  return result;
}

export function editorialFabricIds(projects: readonly Project[]): string[] {
  const ids = new Set<string>();
  const fill = (value?: Fill) => { if (value?.type === 'tela') ids.add(value.fabricId); };
  for (const project of projects) {
    const views = activeViews(project.design), viewIds = new Set(views.map(view => view.id));
    for (const view of views) for (const value of Object.values(view.zoneFills ?? {})) fill(value);
    for (const element of project.design?.elements ?? []) if (viewIds.has(element.viewId) && element.kind !== 'grupo' && visibleEditorialElement(project.design!, element)) fill(element.fill);
    for (const material of Object.values(project.pattern?.panelMaterials ?? {})) if (material.fabricId) ids.add(material.fabricId);
    for (const component of project.pattern?.components ?? []) for (const material of Object.values(component.materials ?? {})) if (material.fabricId) ids.add(material.fabricId);
  }
  return [...ids];
}

function collectPalette(projects: readonly Project[], fabrics: Readonly<Record<string, Fabric>>): string[] {
  const colors = new Set<string>();
  const add = (color?: string) => { if (color && /^#[0-9a-f]{6}$/i.test(color)) colors.add(color.toUpperCase()); };
  const fill = (value?: Fill) => { if (value?.type === 'color') add(value.color); else if (value?.type === 'tela') add(fabrics[value.fabricId]?.color); };
  for (const project of projects) {
    const views = activeViews(project.design), viewIds = new Set(views.map(view => view.id));
    for (const view of views) for (const value of Object.values(view.zoneFills ?? {})) fill(value);
    for (const element of project.design?.elements ?? []) if (viewIds.has(element.viewId) && element.kind !== 'grupo' && visibleEditorialElement(project.design!, element)) { fill(element.fill); add(element.stroke?.color); }
  }
  return [...colors];
}

function StaticElement({ element, doc, view, fabrics, resources, prefix, depth = 0 }: {
  element: DesignElement; doc: DesignDoc; view: DesignView; fabrics: Record<string, Fabric>; resources: Map<string, string>; prefix: string; depth?: number;
}) {
  if (element.kind === 'grupo' || !visibleEditorialElement(doc, element)) return null;
  if (element.kind !== 'imagen' && element.kind !== 'parche') return <ElementSvg el={element} doc={doc} mode="apariencia" prefix={prefix} fabrics={fabrics}/>;
  const transform = `translate(${element.x} ${element.y}) rotate(${element.rotation}) scale(${element.flipX ? -1 : 1} ${element.flipY ? -1 : 1})`;
  let body: ReactNode;
  if (element.kind === 'imagen' && element.image) {
    const href = resources.get(element.image.fileId);
    body = href ? <image href={href} x={-element.w / 2} y={-element.h / 2} width={element.w} height={element.h} preserveAspectRatio="none"/> : <rect x={-element.w / 2} y={-element.h / 2} width={element.w} height={element.h} fill="#f5ded9" stroke="#b4273a"/>;
  } else if (element.kind === 'parche' && element.patchViewId && depth < 1) {
    const patch = doc.views.find(candidate => candidate.id === element.patchViewId);
    if (patch) body = <g transform={`translate(${-element.w / 2} ${-element.h / 2}) scale(${element.w / patch.width} ${element.h / patch.height}) translate(${-patch.minX} ${-patch.minY})`}>
      <StaticView doc={doc} view={patch} fabrics={fabrics} resources={resources} prefix={`${prefix}patch-${element.id}-`} depth={depth + 1}/>
    </g>;
  }
  const content = <g transform={transform}><g clipPath={element.clip ? `url(#${prefix}clip-${element.id})` : undefined}>{body}</g></g>;
  void view;
  return element.maskZoneId ? <g clipPath={`url(#${prefix}zone-${element.maskZoneId})`}>{content}</g> : content;
}

function StaticView({ doc, view, fabrics, resources, prefix, depth = 0 }: {
  doc: DesignDoc; view: DesignView; fabrics: Record<string, Fabric>; resources: Map<string, string>; prefix: string; depth?: number;
}) {
  const photo = view.source.type === 'foto' && view.photo ? resources.get(view.source.fileId) : undefined;
  return <>
    <StudioDefs doc={doc} view={view} fabrics={fabrics} prefix={prefix}/>
    {photo && <image href={photo} x={view.minX} y={view.minY} width={view.width} height={view.height} preserveAspectRatio="none"/>}
    <ViewBase view={view} mode="apariencia" prefix={prefix} fabrics={fabrics}/>
    {doc.elements.filter(element => element.viewId === view.id).map(element => <StaticElement key={element.id} element={element} doc={doc} view={view} fabrics={fabrics} resources={resources} prefix={prefix} depth={depth}/>)}
  </>;
}

function addPatternPhoto(pattern: SVGPatternElement, fill: Extract<Fill, { type: 'tela' }>, fabrics: Readonly<Record<string, Fabric>>, resources: Map<string, string>) {
  const fabric = fabrics[fill.fabricId];
  const id = fabric?.photo?.processedFileId ?? fabric?.photo?.originalFileId;
  const href = id ? resources.get(id) : undefined;
  if (!href) return;
  for (const image of pattern.querySelectorAll('image')) image.remove();
  const image = document.createElementNS(NS, 'image');
  image.setAttribute('href', href);
  image.setAttribute('width', pattern.getAttribute('width') ?? '100');
  image.setAttribute('height', pattern.getAttribute('height') ?? '100');
  image.setAttribute('preserveAspectRatio', 'none');
  pattern.append(image);
}

/** Pattern IDs belong to one view and its explicitly nested patch prefixes.
 * Zone names may repeat between front/back; a document-wide suffix lookup would
 * silently replace a rear texture with the first front texture of that name. */
export function editorialTextureSources(doc: DesignDoc, view: DesignView, prefix: string): Map<string, Fill> {
  const result = new Map<string, Fill>();
  const visit = (current: DesignView, currentPrefix: string, depth = 0) => {
    for (const [id, fill] of Object.entries(current.zoneFills ?? {})) result.set(`${currentPrefix}zf-${id}`, fill);
    for (const element of doc.elements) {
      if (element.viewId !== current.id || !visibleEditorialElement(doc, element)) continue;
      result.set(`${currentPrefix}fab-${element.id}`, element.fill);
      if (element.kind === 'parche' && element.patchViewId && depth < 1) {
        const patch = doc.views.find(candidate => candidate.id === element.patchViewId);
        if (patch) visit(patch, `${currentPrefix}patch-${element.id}-`, depth + 1);
      }
    }
  };
  visit(view, prefix);
  return result;
}

function fillTextures(svg: SVGSVGElement, doc: DesignDoc | undefined, modelFills: Record<string, Fill> | undefined, fabrics: Readonly<Record<string, Fabric>>, resources: Map<string, string>, currentView?: DesignView, prefix?: string) {
  const exact = doc && currentView && prefix ? editorialTextureSources(doc, currentView, prefix) : new Map<string, Fill>();
  // ModelIllustration has only one material view with its own React-generated
  // prefix. Unlike a multi-view document, those zone IDs are unambiguous.
  const modelZones = Object.entries(modelFills ?? {}).sort(([a], [b]) => b.length - a.length);
  for (const pattern of svg.querySelectorAll('pattern')) {
    const fill = exact.get(pattern.id) ?? modelZones.find(([id]) => pattern.id.endsWith(`-zf-${id}`))?.[1];
    if (fill?.type === 'tela') addPatternPhoto(pattern, fill, fabrics, resources);
  }
}

async function svgToPng(svg: SVGSVGElement | string, width = 1000, height = 1200): Promise<Blob> {
  let source: string;
  if (typeof svg === 'string') {
    const parsed = new DOMParser().parseFromString(svg, 'image/svg+xml');
    const root = parsed.documentElement;
    root.setAttribute('width', String(width)); root.setAttribute('height', String(height));
    source = new XMLSerializer().serializeToString(root);
  } else {
    svg.setAttribute('xmlns', NS); svg.setAttribute('width', String(width)); svg.setAttribute('height', String(height));
    svg.style.cssText = '--ink:#1d2420;--mat:#24584a;--surface:#fff;--sans:Arial,sans-serif;--display:Georgia,serif;';
    source = new XMLSerializer().serializeToString(svg);
  }
  const blob = new Blob([source], { type: 'image/svg+xml' });
  const url = URL.createObjectURL(blob);
  try {
    const image = new Image(); image.decoding = 'async'; image.src = url; await image.decode();
    const canvas = document.createElement('canvas'); canvas.width = width; canvas.height = height;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('No se pudo preparar la captura de diseño.');
    context.fillStyle = '#fff'; context.fillRect(0, 0, width, height); context.drawImage(image, 0, 0, width, height);
    return await canvasToBlob(canvas, 'image/png');
  } finally { URL.revokeObjectURL(url); }
}

async function capture(element: ReactNode, patch?: (svg: SVGSVGElement) => void): Promise<Blob> {
  const host = document.createElement('div');
  host.style.cssText = 'position:fixed;left:-20000px;top:0;width:1000px;height:1200px;pointer-events:none;contain:layout style paint;';
  host.setAttribute('aria-hidden', 'true');
  document.body.append(host);
  const root = createRoot(host);
  try {
    flushSync(() => root.render(element));
    const source = host.querySelector('svg');
    if (!source) throw new Error('No se pudo capturar una vista del diseño.');
    const svg = source.cloneNode(true) as SVGSVGElement;
    patch?.(svg);
    // Every transferred image is self-contained. Hooks may have reused a cached
    // object URL, so embed those too before the temporary renderer is removed.
    for (const image of svg.querySelectorAll('image')) {
      const href = image.getAttribute('href');
      if (href?.startsWith('blob:')) image.setAttribute('href', await dataUrl(await (await fetch(href)).blob()));
    }
    return await svgToPng(svg);
  } finally { root.unmount(); host.remove(); }
}

function wrap(context: CanvasRenderingContext2D, value: string, x: number, y: number, maxWidth: number, lineHeight: number, maxLines = 3) {
  const words = value.trim().split(/\s+/);
  const lines: string[] = [];
  let current = '';
  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (context.measureText(next).width <= maxWidth) { current = next; continue; }
    if (current) lines.push(current);
    current = '';
    for (const character of word) {
      if (current && context.measureText(current + character).width > maxWidth) { lines.push(current); current = ''; }
      current += character;
    }
  }
  if (current) lines.push(current);
  for (let index = 0; index < Math.min(lines.length, maxLines); index++) {
    let line = lines[index];
    if (index === maxLines - 1 && lines.length > maxLines) {
      while (context.measureText(`${line}…`).width > maxWidth && line.length) line = line.slice(0, -1);
      line += '…';
    }
    context.fillText(line, x, y + index * lineHeight);
  }
}

function swatchImage(colors: string[], fabric?: Fabric, photo?: string): Promise<Blob> {
  const canvas = document.createElement('canvas'); canvas.width = 1000; canvas.height = 1000;
  const context = canvas.getContext('2d')!;
  context.fillStyle = '#fff'; context.fillRect(0, 0, 1000, 1000);
  return (async () => {
    if (fabric) {
      context.fillStyle = fabric.color; context.fillRect(50, 50, 900, 710);
      if (photo) { const image = new Image(); image.src = photo; await image.decode();
        const factor = Math.min(900 / image.naturalWidth, 710 / image.naturalHeight);
        const w = image.naturalWidth * factor, h = image.naturalHeight * factor;
        context.drawImage(image, 50 + (900 - w) / 2, 50 + (710 - h) / 2, w, h);
      }
      context.fillStyle = ink; context.font = '30px Arial';
      wrap(context, fabric.composition || 'Composición sin indicar', 50, 820, 900, 38, 2);
      context.fillText(fabric.color.toUpperCase(), 50, 925);
    } else {
      const width = 290, height = 185;
      colors.forEach((color, index) => {
        const x = 35 + (index % 3) * 325, y = 30 + Math.floor(index / 3) * 240;
        context.fillStyle = color; context.fillRect(x, y, width, height);
        context.strokeStyle = '#b4bcb5'; context.strokeRect(x, y, width, height);
        context.fillStyle = ink; context.font = '28px Arial'; context.fillText(color, x, y + height + 40);
      });
    }
    return canvasToBlob(canvas, 'image/png');
  })();
}

/** Stable pagination: every source view/piece occurs on exactly one page. */
export function editorialPageGroups<T>(items: readonly T[], pageSize = CARDS_PER_PAGE): T[][] {
  if (!Number.isInteger(pageSize) || pageSize < 1) throw new Error('Tamaño de página inválido.');
  const pages: T[][] = [];
  for (let index = 0; index < items.length; index += pageSize) pages.push(items.slice(index, index + pageSize));
  return pages;
}

/** Readable thumbnail strokes; source paths, measurements and PDF stay intact. */
export function editorialPatternSvg(drawable: Drawable, title: string): string {
  const reference = { ...drawable, labels: [], bbox: drawableBBox(drawable.paths, []) };
  return piecesSvg([reference], title)
    .replace(/stroke-width="[^"]*"/g, 'stroke-width="2.2" vector-effect="non-scaling-stroke"')
    .replace(/<desc>[\s\S]*?<\/desc>/, '<desc>Miniatura de referencia editorial. Sin escala de impresión.</desc>');
}

/** Client-only reference images. Never changes a project, a pattern or the store. */
export async function buildEditorialAssets(input: EditorialEvidenceInput, options: EditorialEvidenceOptions = {}): Promise<{ assets: EditorialAsset[]; warnings: string[] }> {
  if (input.projects.length < 1 || input.projects.length > 6) throw new Error('Elige entre una y seis prendas para la lámina.');
  checkAbort(options.signal);
  const warnings: string[] = [];
  const usedIds = editorialFabricIds(input.projects);
  const fabrics: Record<string, Fabric> = Object.fromEntries(usedIds.filter(id => input.fabrics[id]).map(id => [id, input.fabrics[id]]));
  const resources = new Map<string, string>();
  for (const id of resourceIds(input.projects, fabrics)) {
    checkAbort(options.signal);
    const file = await getFile(id);
    if (file) resources.set(id, await dataUrl(file.blob));
    else warnings.push(`No se encontró una imagen guardada (${id}). Revisa las referencias antes de compartir.`);
  }
  const groups: { kind: EditorialAsset['kind']; title: string; cards: Card[] }[] = [
    { kind: 'vistas', title: 'Vistas', cards: [] },
    { kind: 'detalles', title: 'Detalles y patrones', cards: [] }
  ];
  const views = groups[0].cards, details = groups[1].cards;
  for (const [index, project] of input.projects.entries()) {
    const code = `P${index + 1}`;
    const model = findModel(project.modelId ?? '');
    const name = model?.name ?? `Prenda ${code}`;
    const doc = project.design;
    if (doc) for (const view of doc.simpleWorkflow ? simpleViews(doc) : doc.views) {
      const prefix = `evidence-${index}-${view.id}-`;
      views.push({ id: `${code}-vista-${view.id}`, projectCode: code, title: `${code} · ${name}`, label: view.label,
        note: view.source.type === 'pieza' ? `Pieza ${view.source.pieceId} · posición real de los detalles` : 'Vista del diseño · proporciones ilustrativas',
        render: () => capture(<svg viewBox={`${view.minX} ${view.minY} ${view.width} ${view.height}`}><StaticView doc={doc} view={view} fabrics={fabrics} resources={resources} prefix={prefix}/></svg>, svg => fillTextures(svg, doc, undefined, fabrics, resources, view, prefix)) });
    }
    if (model && supportsModelIllustration(model.flat)) {
      const flat = buildFlat(model.id, model.flat);
      const figure = doc?.figurine ?? defaultFigurine(model.flat.family);
      for (const side of ['frente', 'espalda']) {
        const flatView = flat.views.find(view => view.key === side);
        if (!flatView) continue;
        const fills = modelMaterials(project, flatView);
        if (fills.omittedPanels) warnings.push(`${code}: la composición del figurín no muestra paneles de distintos materiales; consulta las vistas de piezas incluidas.`);
        views.push({ id: `${code}-figurin-${side}`, projectCode: code, title: `${code} · ${name}`, label: `Composición · ${side}`,
          note: 'Color y silueta orientativos. Extras y bordados: ver piezas.',
          render: () => capture(<ModelIllustration model={model} view={side} body={figure.body} skin={figure.skin} hair={figure.hair} hairColor={figure.hairColor} materials={fills.fills} fabrics={fabrics}/>, svg => fillTextures(svg, undefined, fills.fills, fabrics, resources)) });
      }
    }
    if (!doc?.views.length) warnings.push(`${code}: no tiene vistas de diseño guardadas; se incluye la referencia de catálogo disponible.`);
    if (project.pattern) {
      const { built, errors } = resolveEditorialPattern(project, fabrics);
      if (!built || errors.length) warnings.push(`${code}: no se incluyen miniaturas de un patrón incompleto o con errores. Revísalo en Patronaje.`);
      else for (const piece of built.pieces) {
        const cut = built.cuts.get(piece.id);
        if (!cut) { warnings.push(`${code}: falta el contorno de corte de ${piece.id}.`); continue; }
        const drawable = pieceDrawable(piece, cut);
        const source = editorialPatternSvg(drawable, `${code} · ${piece.id}`);
        details.push({ id: `${code}-patron-${piece.id}`, projectCode: code, title: `${code} · Patrón`, label: piece.name, note: `${piece.id} · cortar ${piece.cut.qty}${piece.cut.onFold ? ' al doblez' : ''} · miniatura sin escala`, render: () => svgToPng(source) });
      }
    } else warnings.push(`${code}: no tiene un patrón de confección; la referencia no inventa sus piezas.`);
  }
  const codes = input.projects.map((_, index) => `P${index + 1}`);
  const palette = collectPalette(input.projects, fabrics);
  editorialPageGroups(palette, 12).forEach((colors, index) => details.unshift({ id: `paleta-${index}`, projectCode: codes.join(', '), title: 'Paleta del look', label: `Colores usados ${index + 1}`, note: 'Colores del diseño y del bordado · referencias HEX', render: () => swatchImage(colors) }));
  for (const id of usedIds) {
    const fabric = fabrics[id];
    if (!fabric) { warnings.push(`No se encontró la tela ${id}; su muestra no se pudo incluir.`); continue; }
    const fileId = fabric.photo?.processedFileId ?? fabric.photo?.originalFileId;
    const photo = fileId ? resources.get(fileId) : undefined;
    details.unshift({ id: `tela-${id}`, projectCode: codes.filter((_, index) => editorialFabricIds([input.projects[index]]).includes(id)).join(', '), title: 'Tela del diseño', label: fabric.name,
      note: fabric.calibration ? 'Foto calibrada; conserva el tamaño del estampado indicado.' : 'Textura visual sin calibrar; no deducir medidas del estampado.', render: () => swatchImage([], fabric, photo) });
  }
  const allPages = groups.flatMap(group => editorialPageGroups(group.cards).map((cards, index, pages) => ({ ...group, cards, index, count: pages.length })));
  const total = allPages.reduce((sum, page) => sum + page.cards.length, 0);
  let completed = 0;
  const assets: EditorialAsset[] = [];
  for (const [pageIndex, page] of allPages.entries()) {
    checkAbort(options.signal);
    const canvas = document.createElement('canvas'); canvas.width = PAGE_WIDTH; canvas.height = PAGE_HEIGHT;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('No se pudo preparar la hoja de referencias.');
    context.fillStyle = '#f3f4ef'; context.fillRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = '#24584a'; context.font = 'bold 42px Arial'; context.fillText(`Hilvana · ${page.title}`, 70, 85);
    context.fillStyle = ink; context.font = '28px Arial';
    wrap(context, input.title || 'Referencias del diseño', 70, 135, 2100, 34, 1);
    context.fillStyle = '#59645d'; context.font = '24px Arial'; context.fillText(`Hoja ${pageIndex + 1} de ${allPages.length} · ${page.index + 1}/${page.count} de ${page.title.toLowerCase()} · imágenes de referencia`, 70, 180);
    const gap = 24, startY = 215, margin = 70;
    const cardW = (PAGE_WIDTH - margin * 2 - gap * 2) / 3;
    const cardH = (PAGE_HEIGHT - startY - 80 - gap * 3) / 4;
    for (const [cardIndex, card] of page.cards.entries()) {
      checkAbort(options.signal);
      options.onProgress?.({ completed, total, label: `${card.projectCode} · ${card.label}` });
      const x = margin + (cardIndex % 3) * (cardW + gap), y = startY + Math.floor(cardIndex / 3) * (cardH + gap);
      context.save(); context.beginPath(); context.rect(x, y, cardW, cardH); context.clip();
      context.fillStyle = '#fff'; context.fillRect(x, y, cardW, cardH);
      context.strokeStyle = '#d6ddd5'; context.lineWidth = 1.5; context.strokeRect(x, y, cardW, cardH);
      const heading = /^P\d+ · /.test(card.title) ? card.title : `${card.projectCode} · ${card.title}`;
      context.fillStyle = '#24584a'; context.font = 'bold 23px Arial'; wrap(context, heading, x + 22, y + 34, cardW - 44, 28, 2);
      context.fillStyle = ink; context.font = '25px Arial'; wrap(context, card.label, x + 22, y + 100, cardW - 44, 30, 2);
      try {
        const blob = await card.render();
        if (blob) {
          const url = URL.createObjectURL(blob);
          try {
            const image = new Image(); image.src = url; await image.decode();
            const maxW = cardW - 44, maxH = cardH - 220;
            const factor = Math.min(maxW / image.naturalWidth, maxH / image.naturalHeight);
            const width = image.naturalWidth * factor, height = image.naturalHeight * factor;
            context.drawImage(image, x + (cardW - width) / 2, y + 145 + (maxH - height) / 2, width, height);
          } finally { URL.revokeObjectURL(url); }
        }
      } catch (cause) {
        const message = cause instanceof Error ? cause.message : 'No se pudo capturar esta referencia.';
        warnings.push(`${card.projectCode} · ${card.label}: ${message}`);
        context.fillStyle = '#9c3b35'; context.font = '25px Arial'; wrap(context, 'No se pudo preparar esta captura. Revisa el diseño.', x + 30, y + 270, cardW - 60, 36, 4);
      }
      context.fillStyle = '#59645d'; context.font = '21px Arial'; wrap(context, card.note, x + 22, y + cardH - 57, cardW - 44, 25, 2);
      context.restore();
      completed++;
      options.onProgress?.({ completed, total, label: `${card.projectCode} · ${card.label}` });
    }
    context.fillStyle = '#59645d'; context.font = '23px Arial'; context.fillText('Referencia para presentación editorial · miniaturas sin escala · los patrones imprimibles se obtienen en Hilvana', 70, PAGE_HEIGHT - 30);
    let blob = await canvasToBlob(canvas, 'image/png');
    let width = PAGE_WIDTH, height = PAGE_HEIGHT;
    while (blob.size > MAX_IMAGE_BYTES && width > 1200) {
      width = Math.round(width * .75); height = Math.round(height * .75);
      const smaller = document.createElement('canvas'); smaller.width = width; smaller.height = height;
      const ctx = smaller.getContext('2d'); if (!ctx) throw new Error('No se pudo ajustar el tamaño de la referencia.');
      ctx.drawImage(canvas, 0, 0, width, height); blob = await canvasToBlob(smaller, 'image/png');
    }
    if (blob.size > MAX_IMAGE_BYTES) throw new Error('Una referencia supera el tamaño permitido. Reduce la cantidad de prendas del look.');
    const number = String(pageIndex + 1).padStart(2, '0');
    assets.push({ id: `referencia-${number}`, name: `hilvana-${number}-${page.kind}.png`, label: `${page.title} · hoja ${page.index + 1}`, blob, width, height, kind: page.kind, projectCodes: [...new Set(page.cards.flatMap(card => card.projectCode.split(', ')))] });
  }
  return { assets, warnings: [...new Set(warnings)] };
}
