import type { Pt } from '../../lib/geom/vec';
import { elementImage } from '../../lib/draw/designImage';
import { bboxOf, matApply, matInvert, matMul, matRotate, matScale, Mat } from '../../lib/geom/vec';
import { cmdsToPolylines } from '../../lib/draw/flatten';
import { transformCmds, polylineCmds, PathCmd } from '../../lib/draw/paths';
import { offsetPolygons, polygonsArea, intersectPolygons } from '../../lib/geom/polyoffset';
import { parseSvgPath } from '../../lib/draw/svgpath';
import type { Drawable, DrawPath, DrawLabel } from '../../lib/draw/drawable';
import { drawableBBox } from '../../lib/draw/drawable';
import { formatLength, Unit } from '../../lib/units';
import { pointInPolygon } from '../../lib/geom/vec';
import type { Fabric } from '../../store/types';
import { BACKING_LABEL, CUT_TECHNIQUES, DesignDoc, DesignElement, DesignView, EDGE_LABEL, TECHNIQUE_LABEL, elementLocalCmds, elementMatrix, isClosedShape, Backing } from './model';

export interface Cutout {
  id: string;
  elementId: string;
  name: string;
  view: DesignView;
  zoneLabel?: string;
  technique: string;
  edge: string;
  qty: number;
  /** Contorno final (tamaño terminado), en mm, con el hilo vertical. */
  finalPolys: Pt[][];
  /** Contorno de corte = final + margen. */
  cutPolys: Pt[][];
  allowance: number;
  fabricName: string;
  fabricId?: string;
  color?: string;
  grain: boolean;
  backing: Backing;
  backingPolys?: Pt[][];
  areaMm2: number;
  widthMm: number;
  heightMm: number;
  placement: string;
  order: number;
}

/** Contorno del elemento en coordenadas locales, girado para que el hilo de la tela quede vertical. */
function templateMatrix(el: DesignElement): Mat {
  // Se conserva el espejado del elemento; la rotación en la prenda no importa al cortar.
  let m: Mat = matScale(el.flipX ? -1 : 1, el.flipY ? -1 : 1);
  if (el.fill.type === 'tela') m = matMul(matRotate(-el.fill.rotation), m);
  return m;
}

export function elementPolys(el: DesignElement, m: Mat): Pt[][] {
  return cmdsToPolylines(transformCmds(elementLocalCmds(el), m), 0.15)
    .filter((p) => p.closed || p.pts.length > 2)
    .map((p) => p.pts);
}

export function zoneOf(view: DesignView, el: DesignElement) {
  if (el.zoneId) return view.zones.find((z) => z.id === el.zoneId);
  const c = { x: el.x, y: el.y };
  for (let i = view.zones.length - 1; i >= 0; i--) {
    const z = view.zones[i];
    const polys = cmdsToPolylines(parseSvgPath(z.d), 0.5);
    if (polys.some((p) => pointInPolygon(c, p.pts))) return z;
  }
  return undefined;
}

export function placementText(view: DesignView, el: DesignElement, unit: Unit): string {
  const calibrated = view.source.type !== 'foto' || !!view.photo?.mmPerPx;
  const cx = view.seams?.center ?? 0;
  const dx = el.x - cx;
  const dy = el.y - view.refY;
  const side = Math.abs(dx) < 1 ? 'en el centro' : `${formatLength(Math.abs(dx), unit)} a la ${dx < 0 ? 'izquierda' : 'derecha'} del centro de la vista`;
  const vert = `${formatLength(Math.abs(dy), unit)} ${dy >= 0 ? 'bajo' : 'sobre'} la línea de ${view.refLabel.toLowerCase()}`;
  return `Centro del elemento ${side} y ${vert}${calibrated ? '' : ' (vista sin calibrar: posición aproximada)'}.`;
}

export function computeCutouts(doc: DesignDoc, fabrics: Record<string, Fabric>, unit: Unit): Cutout[] {
  const out: Cutout[] = [];
  for (const view of doc.views) {
    const els = doc.elements.filter((e) => e.viewId === view.id && !e.hidden);
    els.forEach((el, idx) => {
      if (!CUT_TECHNIQUES.includes(el.technique) || !isClosedShape(el) || el.kind === 'grupo') return;
      const m = templateMatrix(el);
      let finalPolys = elementPolys(el, m);
      if (el.clip && el.clip.length >= 3) {
        const clip = el.clip.map(([x, y]) => matApply(m, { x: x * el.w, y: y * el.h }));
        finalPolys = intersectPolygons(finalPolys, [clip]);
      }
      if (el.maskZoneId) {
        const mask = view.zones.find((z) => z.id === el.maskZoneId);
        // Una máscara inexistente tampoco muestra contenido en SVG.
        if (!mask) return;
        // Zona: vista → caja local del elemento → plantilla con hilo vertical.
        // Así el recorte exportado coincide con la máscara incluso al girar,
        // reflejar o rotar el estampado de la tela.
        const worldToTemplate = matMul(m, matInvert(elementMatrix(el)));
        const maskPolys = cmdsToPolylines(transformCmds(parseSvgPath(mask.d), worldToTemplate), 0.15)
          .filter((p) => p.pts.length >= 3)
          .map((p) => p.pts);
        finalPolys = intersectPolygons(finalPolys, maskPolys);
      }
      if (!finalPolys.length) return;
      const cutPolys = el.allowance > 0 ? offsetPolygons(finalPolys, el.allowance) : offsetPolygons(finalPolys, 0);
      const bb = bboxOf(cutPolys.flat());
      const fab = el.fill.type === 'tela' ? fabrics[el.fill.fabricId] : undefined;
      let backingPolys: Pt[][] | undefined;
      if (el.backing === 'termoadhesiva') backingPolys = finalPolys.map((p) => p.map((q) => ({ x: -q.x, y: q.y })));
      else if (el.backing === 'desprendible' || el.backing === 'recortable') {
        const fb = bboxOf(finalPolys.flat());
        const pad = 20;
        backingPolys = [[{ x: fb.minX - pad, y: fb.minY - pad }, { x: fb.maxX + pad, y: fb.minY - pad }, { x: fb.maxX + pad, y: fb.maxY + pad }, { x: fb.minX - pad, y: fb.maxY + pad }]];
      } else if (el.backing === 'entretela') backingPolys = finalPolys;
      const zone = zoneOf(view, el);
      out.push({
        id: `cut-${el.id}`,
        elementId: el.id,
        name: el.name,
        view,
        zoneLabel: zone?.label,
        technique: TECHNIQUE_LABEL[el.technique],
        edge: EDGE_LABEL[el.edge],
        qty: 1,
        finalPolys,
        cutPolys,
        allowance: el.allowance,
        fabricName: fab ? fab.name : el.fill.type === 'color' ? 'Tela por elegir (color de muestra)' : 'Tela por definir',
        fabricId: fab?.id,
        color: el.fill.type === 'color' ? el.fill.color : fab?.color,
        grain: el.fill.type === 'tela',
        backing: el.backing,
        backingPolys,
        areaMm2: polygonsArea(cutPolys),
        widthMm: bb.maxX - bb.minX,
        heightMm: bb.maxY - bb.minY,
        placement: placementText(view, el, unit),
        order: idx + 1
      });
    });
  }
  return out;
}

const polyCmds = (polys: Pt[][]): PathCmd[] => polys.flatMap((p) => polylineCmds(p, true));

/** Plantillas para PDF: tamaño final y margen separados. */
export function cutoutDrawables(cs: Cutout[], unit: Unit, version: string): Drawable[] {
  const ds: Drawable[] = [];
  for (const c of cs) {
    const paths: DrawPath[] = [];
    if (c.allowance > 0) {
      paths.push({ cmds: polyCmds(c.cutPolys), style: 'corte' });
      paths.push({ cmds: polyCmds(c.finalPolys), style: 'final' });
    } else paths.push({ cmds: polyCmds(c.finalPolys), style: 'corte' });
    const fb = bboxOf(c.cutPolys.flat());
    const cx = (fb.minX + fb.maxX) / 2;
    const labels: DrawLabel[] = [
      { text: `${c.order}. ${c.name}`, at: { x: cx, y: fb.maxY + 5 }, size: 3.2, bold: true },
      { text: `${c.fabricName} · ${c.technique}`, at: { x: cx, y: fb.maxY + 10 }, size: 2.6 },
      { text: c.allowance > 0 ? `Final (discontinua) + margen ${formatLength(c.allowance, unit)} (continua)` : 'Corte = tamaño final (sin margen)', at: { x: cx, y: fb.maxY + 14.5 }, size: 2.4 },
      { text: version, at: { x: cx, y: fb.maxY + 18.5 }, size: 2.2 }
    ];
    const h = fb.maxY - fb.minY;
    const grains = c.grain && h > 18 ? [{ a: { x: cx, y: fb.minY + h * 0.25 }, b: { x: cx, y: fb.maxY - h * 0.25 } }] : [];
    ds.push({ id: c.id, name: c.name, paths, labels, grains, bbox: drawableBBox(paths, labels) });
    if (c.backingPolys) {
      const bpaths: DrawPath[] = [{ cmds: polyCmds(c.backingPolys), style: 'corte' }];
      const bb = bboxOf(c.backingPolys.flat());
      const bl: DrawLabel[] = [
        { text: `${c.order}. ${c.name}: base`, at: { x: (bb.minX + bb.maxX) / 2, y: bb.maxY + 5 }, size: 3, bold: true },
        { text: BACKING_LABEL[c.backing], at: { x: (bb.minX + bb.maxX) / 2, y: bb.maxY + 9.5 }, size: 2.4 }
      ];
      ds.push({ id: `${c.id}-base`, name: `${c.name} (base)`, paths: bpaths, labels: bl, grains: [], bbox: drawableBBox(bpaths, bl) });
    }
  }
  return ds;
}

/** Dibujo de bordado (no es un archivo de puntadas). */
export function embroideryDrawables(doc: DesignDoc): Drawable[] {
  const out: Drawable[] = [];
  for (const el of doc.elements) {
    if (el.technique !== 'bordado' || el.hidden || el.kind === 'grupo') continue;
    if(el.kind==='imagen') {
      const image=elementImage({...el,x:0,y:0});
      if(image) {
        const images=[image];
        const labels:DrawLabel[]=[{text:`${el.name} · imagen de referencia`,at:{x:0,y:el.h/2+8},size:2.6}];
        out.push({id:`bord-${el.id}`,name:el.name,paths:[],images,labels,grains:[],bbox:drawableBBox([],labels,images)});
      }
      continue;
    }
    const cmds = transformCmds(elementLocalCmds(el), elementMatrix({ ...el, x: 0, y: 0 }));
    const paths: DrawPath[] = [{ cmds, style: 'bordado', fillColor: el.fill.type === 'color' ? el.fill.color : undefined }];
    const labels: DrawLabel[] = [{ text: `${el.name} · ${el.stroke ? el.stroke.style : 'relleno'}`, at: { x: 0, y: el.h / 2 + 8 }, size: 2.6 }];
    out.push({ id: `bord-${el.id}`, name: el.name, paths, labels, grains: [], bbox: drawableBBox(paths, labels) });
  }
  return out;
}

export function materialSummary(cs: Cutout[], unit: Unit): { label: string; detail: string }[] {
  const by = new Map<string, Cutout[]>();
  for (const c of cs) by.set(c.fabricName, [...(by.get(c.fabricName) ?? []), c]);
  const rows: { label: string; detail: string }[] = [];
  for (const [name, list] of by) {
    const area = list.reduce((s, c) => s + c.areaMm2 * c.qty, 0);
    const maxW = Math.max(...list.map((c) => c.widthMm));
    const maxH = Math.max(...list.map((c) => c.heightMm));
    rows.push({ label: name, detail: `${list.length} recortes · área ${Math.round(area / 100)} cm² (+25 % de aprovechamiento: ${Math.round((area * 1.25) / 100)} cm²) · retazo mínimo ${formatLength(maxW, unit)} × ${formatLength(maxH, unit)}` });
  }
  const fusible = cs.filter((c) => c.backing === 'termoadhesiva');
  if (fusible.length) rows.push({ label: 'Entretela termoadhesiva', detail: `${fusible.length} piezas en espejo · ${Math.round(fusible.reduce((s, c) => s + polygonsArea(c.backingPolys ?? []), 0) / 100)} cm²` });
  const stab = cs.filter((c) => c.backing === 'desprendible' || c.backing === 'recortable');
  if (stab.length) rows.push({ label: 'Estabilizador', detail: `${stab.length} rectángulos con 2 cm de margen` });
  return rows;
}

export function appliqueSteps(cs: Cutout[]): { id: string; title: string; detail: string }[] {
  if (!cs.length) return [];
  const steps = [
    { id: 'apl-preparar', title: 'Prepara las telas de las aplicaciones', detail: 'Lava y plancha las telas. Si usas entretela termoadhesiva, traza las piezas en espejo sobre el papel y plánchalas al revés de cada tela.' },
    { id: 'apl-cortar', title: 'Corta los recortes', detail: `Corta ${cs.length} piezas siguiendo la línea continua. La discontinua marca el tamaño final; el margen se dobla o queda bajo la pieza siguiente.` }
  ];
  const byView = new Map<string, Cutout[]>();
  for (const c of cs) byView.set(c.view.label, [...(byView.get(c.view.label) ?? []), c]);
  for (const [label, list] of byView) {
    steps.push({ id: `apl-colocar-${label}`, title: `Coloca las piezas en ${label.toLowerCase()}`, detail: `Orden de abajo hacia arriba: ${list.sort((a, b) => a.order - b.order).map((c) => `${c.order}. ${c.name}`).join(', ')}. Usa la ficha de ubicación de cada pieza.` });
  }
  steps.push({ id: 'apl-coser', title: 'Fija los bordes', detail: `Cose cada pieza según su acabado (${[...new Set(cs.map((c) => c.edge.toLowerCase()))].join(', ')}), empezando por la de abajo.` });
  return steps;
}
