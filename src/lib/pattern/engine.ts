import { Pt, add, sub, dist, bboxOf, bboxW, bboxH, matApply, matMul, matRotate, matScale, matTranslate, Mat, norm } from '../geom/vec';
import { shelfPack } from '../geom/pack';
import type { MeasureKey, MeasureValues } from '../sizes/measurements';
import type { PersonKind } from '../sizes/tables';
import { cutOutline, CutOutline } from './offset';
import { evaluateSeams, SeamResult, validatePattern, validatePiece } from './validate';
import { getGenerator } from './generators';
import { FabricType, Fit, GeneratorResult, Params, PatternGenerator, missingMeasures } from './generator';
import type { Issue, NodeOverride, Piece, PieceLayout, PieceOverrides } from './types';
import { formatLength } from '../units';
import { panelizePattern, type PanelCut } from './panels';

export interface PatternContextState {
  kind: PersonKind;
  fabric: FabricType;
  stretch: number;
  fit: Fit;
}

export interface PatternState {
  /** Cuts from the studio in the original piece coordinate system (mm). */
  panelCuts?: PanelCut[];
  panelMaterials?: Record<string, { fabricId?: string; name: string; color?: string }>;
  generatorId: string;
  params: Params;
  context: PatternContextState;
  /** Copia de las medidas corporales usadas (milímetros). */
  body: MeasureValues;
  measurementRef?: { profileId: string; versionId: string };
  overrides: Record<string, PieceOverrides>;
  allowances: Record<string, Record<string, number>>;
  layout: Record<string, PieceLayout>;
  customPieces: Piece[];
  hidden: string[];
  /** Imágenes de referencia colocadas bajo las piezas (no afectan la geometría). */
  refLayers?: RefLayer[];
  /** Contornos superpuestos para comparar versiones o tallas. */
  overlays?: Overlay[];
  /** Piezas excluidas de la exportación. */
  noExport?: string[];
}

export interface RefLayer {
  id: string;
  refId: string;
  fileId: string;
  name: string;
  x: number;
  y: number;
  rotation: number;
  mmPerPx: number;
  pxW: number;
  pxH: number;
  opacity: number;
  visible: boolean;
  locked: boolean;
  calibrated: boolean;
  scaleNote?: string;
}

export type Overlay = { id: string; type: 'version'; versionId: string; label: string } | { id: string; type: 'talla'; tableId: string; code: string; label: string };

export interface ReviewItem {
  pieceId: string;
  key: string;
  label: string;
  moved: number;
}

export interface BuiltPattern {
  panelMapping?: Record<string, string[]>;
  generator?: PatternGenerator;
  result: GeneratorResult | null;
  generated: Piece[];
  pieces: Piece[];
  cuts: Map<string, CutOutline>;
  issues: Issue[];
  seamResults: SeamResult[];
  review: ReviewItem[];
  missing: MeasureKey[];
}

export function clonePiece(p: Piece): Piece {
  return JSON.parse(JSON.stringify(p));
}

export function applyOverrides(piece: Piece, ov: PieceOverrides | undefined, allowances?: Record<string, number>): { piece: Piece; review: ReviewItem[] } {
  const out = clonePiece(piece);
  const review: ReviewItem[] = [];
  if (allowances) {
    for (const e of out.edges) if (allowances[e.id] !== undefined && e.finish !== 'doblez') e.allowance = allowances[e.id];
  }
  if (!ov) return { piece: out, review };
  for (const [key, o] of Object.entries(ov)) {
    const [kind, id] = key.split(':');
    if (kind === 'n') {
      const node = out.nodes.find((n) => n.id === id);
      const orig = piece.nodes.find((n) => n.id === id);
      if (!node || !orig) continue;
      node.x += o.dx;
      node.y += o.dy;
      for (const e of out.edges) {
        if (e.kind !== 'cubic') continue;
        if (e.from === id && e.c1) e.c1 = add(e.c1, { x: o.dx, y: o.dy });
        if (e.to === id && e.c2) e.c2 = add(e.c2, { x: o.dx, y: o.dy });
      }
      const moved = dist(o.base, orig);
      if (moved > 0.05) review.push({ pieceId: piece.id, key, label: `Punto «${id}»`, moved });
    } else if (kind === 'c1' || kind === 'c2') {
      const e = out.edges.find((x) => x.id === id);
      const origE = piece.edges.find((x) => x.id === id);
      if (!e || !origE || e.kind !== 'cubic') continue;
      const cp = (kind === 'c1' ? e.c1 : e.c2)!;
      const next = add(cp, { x: o.dx, y: o.dy });
      if (kind === 'c1') e.c1 = next;
      else e.c2 = next;
      const origCp = (kind === 'c1' ? origE.c1 : origE.c2)!;
      const moved = dist(o.base, origCp);
      if (moved > 0.05) review.push({ pieceId: piece.id, key, label: `Curva «${origE.label}»`, moved });
    }
  }
  return { piece: out, review };
}

export function buildPattern(state: PatternState): BuiltPattern {
  const generator = getGenerator(state.generatorId);
  const empty: BuiltPattern = { generator, result: null, generated: [], pieces: [], cuts: new Map(), issues: [], seamResults: [], review: [], missing: [] };
  const custom = state.customPieces.map(clonePiece);
  if (!generator) {
    empty.pieces = custom;
  } else {
    const missing = missingMeasures(generator, state.body);
    if (missing.length) {
      empty.missing = missing;
      empty.pieces = custom;
    } else {
      const ctx = { body: state.body, ...state.context };
      const params = { ...generator.defaults(ctx), ...state.params };
      const result = generator.generate(ctx, params);
      const review: ReviewItem[] = [];
      const pieces = result.pieces.map((p) => {
        const r = applyOverrides(p, state.overrides[p.id], state.allowances[p.id]);
        review.push(...r.review);
        return r.piece;
      });
      empty.result = result;
      empty.generated = result.pieces;
      empty.review = review;
      empty.pieces = [...pieces, ...custom];
    }
  }
  let panelIssues: Issue[] = [];
  let panelSeams: import('./types').SeamRelation[] = [];
  if (state.panelCuts?.length && !empty.missing.length) {
    const divided = panelizePattern(empty.pieces, empty.result?.seams ?? [], state.panelCuts);
    panelIssues = divided.issues;
    panelSeams = divided.seams;
    empty.panelMapping = divided.mapping;
    empty.generated = [...empty.generated, ...divided.pieces.filter(piece => piece.panelSource)];
    empty.pieces = divided.pieces.map(piece => {
      if (!piece.panelSource) return piece;
      const applied = applyOverrides(piece, state.overrides[piece.id], state.allowances[piece.id]);
      empty.review.push(...applied.review);
      return applied.piece;
    });
    if (empty.result && !panelIssues.some(issue => issue.level === 'error')) {
      const replaceIds = (ids: string[]) => [...new Set(ids.flatMap(id => divided.mapping[id] ?? [id]))];
      const joins = divided.seams.filter(seam => seam.id.startsWith('panel-union-')).reverse();
      empty.result = { ...empty.result, pieces: empty.pieces, seams: divided.seams,
        assumptions: [...empty.result.assumptions, 'Los paneles del estudio se unen antes de montar la prenda. No cambian la holgura ni la talla de la pieza base.'],
        steps: [
          ...joins.map(seam => ({ id: seam.id, title: seam.label, detail: 'Relaciona los piquetes y cose derecho con derecho por la línea de unión. Plancha los márgenes antes de continuar el montaje.', pieces: [...new Set([...seam.a,...seam.b].map(side => side.pieceId))], seams: [seam.id] })),
          ...empty.result.steps.map(step => ({ ...step, pieces: replaceIds(step.pieces) }))
        ] };
    }
    empty.pieces = empty.pieces.map(piece => {
      const material = state.panelMaterials?.[piece.id];
      return piece.panelSource && material?.name ? { ...piece, name: `${piece.name} · ${material.name.slice(0,50)}` } : piece;
    });
  }
  const visible = empty.pieces.filter((p) => !state.hidden.includes(p.id) && !state.hidden.includes(p.panelSource?.pieceId ?? p.id));
  for (const p of empty.pieces) {
    try {
      empty.cuts.set(p.id, cutOutline(p));
    } catch {
      /* se informa en la validación */
    }
  }
  if (empty.result) {
    const issues = validatePattern({ ...empty.result, pieces: visible }, empty.cuts);
    empty.issues = [...empty.result.notices, ...panelIssues, ...issues];
    empty.seamResults = evaluateSeams(empty.pieces, empty.result.seams);
  } else {
    empty.issues.push(...panelIssues);
    for (const p of empty.pieces) empty.issues.push(...validatePiece(p, empty.cuts.get(p.id)));
    if (state.panelCuts?.length) empty.seamResults = evaluateSeams(empty.pieces, panelSeams);
  }
  for (const r of empty.review) {
    empty.issues.push({ level: 'aviso', code: 'revisar-ajuste', message: `${r.label} en ${r.pieceId}: el patrón se regeneró y el ajuste manual necesita revisión.`, pieceId: r.pieceId });
  }
  return empty;
}

/** Matriz de colocación de una pieza en el lienzo o en la hoja. */
export function layoutMatrix(l: PieceLayout | undefined, pivot: Pt = { x: 0, y: 0 }): Mat {
  const lay = l ?? { x: 0, y: 0, rot: 0, mirror: false };
  let m: Mat = matTranslate(-pivot.x, -pivot.y);
  if (lay.mirror) m = matMul(matScale(-1, 1), m);
  m = matMul(matRotate(lay.rot), m);
  m = matMul(matTranslate(lay.x + pivot.x, lay.y + pivot.y), m);
  return m;
}

export function transformPoints(pts: Pt[], m: Mat): Pt[] {
  return pts.map((p) => matApply(m, p));
}

/** Coloca piezas sin superponerse, en filas, para el lienzo. */
export function autoLayout(pieces: Piece[], cuts: Map<string, CutOutline>, maxWidth = 1500, gap = 30): Record<string, PieceLayout> {
  const out: Record<string, PieceLayout> = {};
  let x = 0;
  let y = 0;
  let rowH = 0;
  for (const p of pieces) {
    const c = cuts.get(p.id);
    if (!c) continue;
    const bb = bboxOf(c.points);
    const w = bboxW(bb);
    const h = bboxH(bb);
    if (x > 0 && x + w > maxWidth) {
      x = 0;
      y += rowH + gap;
      rowH = 0;
    }
    out[p.id] = { x: x - bb.minX, y: y - bb.minY, rot: 0, mirror: false };
    x += w + gap;
    rowH = Math.max(rowH, h);
  }
  return out;
}

export interface FabricEstimate {
  fabric: string;
  lengthMm: number;
  widthMm: number;
  pieces: string[];
  assumptions: string[];
  tooWide: string[];
}

/** Estimación de consumo por rectángulos envolventes con la tela doblada a lo ancho. */
export function estimateFabric(pieces: Piece[], cuts: Map<string, CutOutline>, fabricWidth: number): FabricEstimate[] {
  const byFabric = new Map<string, Piece[]>();
  for (const p of pieces) {
    const list = byFabric.get(p.cut.fabric) ?? [];
    list.push(p);
    byFabric.set(p.cut.fabric, list);
  }
  const res: FabricEstimate[] = [];
  for (const [fabric, list] of byFabric) {
    const rects: { id: string; w: number; h: number }[] = [];
    const tooWide: string[] = [];
    for (const p of list) {
      const c = cuts.get(p.id);
      if (!c) continue;
      // Alinear el hilo con el largo de la tela.
      const g = norm(sub(p.grain.b, p.grain.a));
      const ang = (Math.atan2(g.x, g.y) * 180) / Math.PI;
      const pts = transformPoints(c.points, matRotate(ang));
      const bb = bboxOf(pts);
      const w = bboxW(bb);
      const h = bboxH(bb);
      // Tela doblada: cada colocación produce un par; las piezas al doblez se apoyan en él.
      const places = p.cut.onFold ? p.cut.qty : Math.ceil(p.cut.qty / 2);
      for (let i = 0; i < places; i++) rects.push({ id: `${p.id}#${i}`, w, h });
      if (w > fabricWidth / 2) tooWide.push(p.name);
    }
    const packed = shelfPack(rects, fabricWidth / 2, 1e9, 15);
    const lengthMm = (packed.usedHeight[0] ?? 0) * 1.05 + 50;
    res.push({
      fabric,
      lengthMm,
      widthMm: fabricWidth,
      pieces: list.map((p) => p.name),
      tooWide,
      assumptions: [
        `Tela de ${formatLength(fabricWidth, 'cm')} doblada a lo ancho, piezas acomodadas por su rectángulo envolvente con el hilo paralelo al orillo.`,
        'Se suma 5 % y 5 cm de margen para encogimiento y enderezado. Encajando piezas a mano suele necesitarse menos.',
        ...(tooWide.length ? [`Piezas más anchas que la tela doblada: ${tooWide.join(', ')}. Necesitan tela abierta.`] : [])
      ]
    });
  }
  return res;
}

export function newPatternState(generatorId: string, body: MeasureValues, context: PatternContextState): PatternState {
  return { generatorId, params: {}, context, body, overrides: {}, allowances: {}, layout: {}, customPieces: [], hidden: [] };
}

export function setOverride(state: PatternState, pieceId: string, key: string, delta: Pt, base: Pt): PatternState {
  const prev = state.overrides[pieceId] ?? {};
  const cur: NodeOverride | undefined = prev[key];
  const next: NodeOverride = { dx: (cur?.dx ?? 0) + delta.x, dy: (cur?.dy ?? 0) + delta.y, base };
  return { ...state, overrides: { ...state.overrides, [pieceId]: { ...prev, [key]: next } } };
}

/** Acepta los ajustes manuales tras una regeneración (actualiza su referencia). */
export function acceptReview(state: PatternState, generated: Piece[]): PatternState {
  const overrides: PatternState['overrides'] = {};
  for (const [pid, ov] of Object.entries(state.overrides)) {
    const gp = generated.find((p) => p.id === pid);
    overrides[pid] = {};
    for (const [key, o] of Object.entries(ov)) {
      const [kind, id] = key.split(':');
      let base = o.base;
      if (gp && kind === 'n') {
        const n = gp.nodes.find((x) => x.id === id);
        if (n) base = { x: n.x, y: n.y };
      } else if (gp) {
        const e = gp.edges.find((x) => x.id === id);
        const cp = kind === 'c1' ? e?.c1 : e?.c2;
        if (cp) base = { ...cp };
      }
      overrides[pid][key] = { ...o, base };
    }
  }
  return { ...state, overrides };
}

export function resetOverrides(state: PatternState, pieceId?: string): PatternState {
  if (!pieceId) return { ...state, overrides: {} };
  const o = { ...state.overrides };
  delete o[pieceId];
  return { ...state, overrides: o };
}
