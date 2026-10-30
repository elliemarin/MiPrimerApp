import type { Pt, Mat } from '../../lib/geom/vec';
import { matMul, matRotate, matScale, matTranslate, matApply } from '../../lib/geom/vec';
import { uid, nowIso } from '../../lib/ids';
import type { PathCmd } from '../../lib/draw/paths';
import { parseSvgPath } from '../../lib/draw/svgpath';
import { transformCmds, polylineCmds } from '../../lib/draw/paths';
import { findShape } from '../../data/shapes';

export type ZoneType = 'delantero' | 'espalda' | 'manga' | 'cuello' | 'puno' | 'bolsillo' | 'pierna' | 'pretina' | 'capucha' | 'canesu' | 'costado' | 'base' | 'otra';

export const ZONE_TYPE_LABEL: Record<ZoneType, string> = {
  delantero: 'Delantero',
  espalda: 'Espalda',
  manga: 'Manga',
  cuello: 'Cuello',
  puno: 'Puño',
  bolsillo: 'Bolsillo',
  pierna: 'Pierna',
  pretina: 'Pretina',
  capucha: 'Capucha',
  canesu: 'Canesú',
  costado: 'Costado',
  base: 'Base',
  otra: 'Otra zona'
};

export interface Zone {
  id: string;
  label: string;
  type: ZoneType;
  /** Trayecto en coordenadas de la vista (mm). */
  d: string;
}

export type DesignViewKind = 'frente' | 'espalda' | 'costado-izq' | 'costado-der' | 'detalle' | 'parche' | 'pieza';

export const DESIGN_VIEW_LABEL: Record<DesignViewKind, string> = {
  frente: 'Frente',
  espalda: 'Espalda',
  'costado-izq': 'Costado izq.',
  'costado-der': 'Costado der.',
  detalle: 'Detalle',
  parche: 'Parche',
  pieza: 'Pieza de patrón'
};

export type ViewSource =
  | { type: 'plantilla'; flatId: string; view: string; opts?: Record<string, string> }
  | { type: 'foto'; referenceId: string; fileId: string }
  | { type: 'parche'; shape: 'circulo' | 'rectangulo' | 'escudo' | 'ovalo' }
  | { type: 'pieza'; pieceId: string }
  | { type: 'vacia' };

export interface DesignView {
  id: string;
  kind: DesignViewKind;
  label: string;
  source: ViewSource;
  /** Caja de la vista en mm (puede empezar en coordenadas negativas). */
  minX: number;
  minY: number;
  width: number;
  height: number;
  dots?: { x: number; y: number; r: number }[];
  /** Escala aplicada a la plantilla respecto a la talla de referencia. */
  templateScale?: { sx: number; sy: number; basis: string };
  /** Escala de la foto (mm por píxel). Sin calibrar si falta. */
  photo?: { pxW: number; pxH: number; mmPerPx?: number };
  zones: Zone[];
  /** Contorno de la prenda o base, en mm, para la vista técnica. */
  outline?: string;
  details?: { d: string; style: 'costura' | 'pespunte' | 'doblez' | 'pliegue' }[];
  /** Línea de referencia horizontal compartida entre vistas (mm desde arriba). */
  refY: number;
  refLabel: string;
  /** Posiciones x de los costados en esta vista, para continuidad. */
  seams?: { left?: number; right?: number; center?: number };
  /** Relleno por zona para probar telas sobre la prenda. */
  zoneFills?: Record<string, Fill>;
  /** Tamaño de la base de un parche (mm). */
  patchShape?: 'circulo' | 'rectangulo' | 'escudo' | 'ovalo';
}

export type ElementKind = 'forma' | 'organica' | 'trazo' | 'texto' | 'imagen' | 'grupo' | 'parche';

export type Technique = 'ninguna' | 'aplicacion' | 'parche' | 'collage' | 'patchwork' | 'bordado' | 'pintura' | 'vinil' | 'encaje' | 'cinta' | 'pespunte' | 'adorno';

export const TECHNIQUE_LABEL: Record<Technique, string> = {
  ninguna: 'Sin técnica',
  aplicacion: 'Aplicación',
  parche: 'Parche',
  collage: 'Collage textil',
  patchwork: 'Patchwork',
  bordado: 'Bordado',
  pintura: 'Pintura textil',
  vinil: 'Vinil textil',
  encaje: 'Encaje',
  cinta: 'Cinta o listón',
  pespunte: 'Costura visible',
  adorno: 'Adorno'
};

/** Técnicas que producen recortes de tela. */
export const CUT_TECHNIQUES: Technique[] = ['aplicacion', 'parche', 'collage', 'patchwork', 'vinil'];

export type EdgeFinish = 'na' | 'doblado' | 'crudo' | 'deshilachado' | 'zigzag' | 'satin' | 'pespunte';

export const EDGE_LABEL: Record<EdgeFinish, string> = {
  na: 'No aplica',
  doblado: 'Borde doblado',
  crudo: 'Borde crudo',
  deshilachado: 'Borde deshilachado',
  zigzag: 'Zigzag',
  satin: 'Puntada satén',
  pespunte: 'Pespunte al canto'
};

/** Margen sugerido por acabado (mm). */
export const EDGE_ALLOWANCE: Record<EdgeFinish, number> = { na: 0, doblado: 6, crudo: 0, deshilachado: 5, zigzag: 0, satin: 0, pespunte: 3 };

export type StitchStyle = 'solida' | 'recta' | 'pespunte' | 'cadeneta' | 'zigzag' | 'satin' | 'punto-atras';

export const STITCH_LABEL: Record<StitchStyle, string> = {
  solida: 'Línea continua',
  recta: 'Puntada recta',
  pespunte: 'Pespunte',
  cadeneta: 'Cadeneta',
  zigzag: 'Zigzag',
  satin: 'Satén',
  'punto-atras': 'Punto atrás'
};

export type Backing = 'ninguna' | 'termoadhesiva' | 'desprendible' | 'recortable' | 'entretela';

export const BACKING_LABEL: Record<Backing, string> = {
  ninguna: 'Sin base',
  termoadhesiva: 'Entretela termoadhesiva (se traza en espejo)',
  desprendible: 'Estabilizador desprendible',
  recortable: 'Estabilizador recortable',
  entretela: 'Entretela de refuerzo'
};

export type Fill =
  | { type: 'ninguno' }
  | { type: 'color'; color: string; opacity?: number }
  | { type: 'tela'; fabricId: string; rotation: number; offsetX: number; offsetY: number; scale: number };

export interface DesignElement {
  id: string;
  viewId: string;
  kind: ElementKind;
  name: string;
  locked: boolean;
  hidden: boolean;
  parentId?: string;
  /** Centro del elemento (mm en la vista). */
  x: number;
  y: number;
  /** Tamaño físico de la caja (mm). */
  w: number;
  h: number;
  rotation: number;
  flipX: boolean;
  flipY: boolean;
  shape?: { type: 'rect' | 'ellipse' | 'polygon' | 'star'; radius?: number; sides?: number; inner?: number };
  organicId?: string;
  /** Puntos normalizados en la caja (-0.5…0.5). */
  path?: { pts: [number, number][]; closed: boolean; smooth: boolean };
  text?: { content: string; font: 'serif' | 'sans' | 'script'; weight: number };
  image?: { fileId: string; naturalW: number; naturalH: number };
  fill: Fill;
  stroke: { color: string; width: number; style: StitchStyle } | null;
  technique: Technique;
  edge: EdgeFinish;
  allowance: number;
  backing: Backing;
  materialNote?: string;
  zoneId?: string;
  maskZoneId?: string;
  /** Recorte libre en coordenadas normalizadas de la caja. */
  clip?: [number, number][];
  continuityId?: string;
  patchViewId?: string;
}

export interface Guide {
  id: string;
  viewId: string;
  axis: 'x' | 'y';
  pos: number;
}

export interface DesignDoc {
  id: string;
  views: DesignView[];
  elements: DesignElement[];
  guides: Guide[];
  updatedAt: string;
}

export function newDesign(views: DesignView[] = []): DesignDoc {
  return { id: uid('dis'), views, elements: [], guides: [], updatedAt: nowIso() };
}

export function newElement(viewId: string, partial: Partial<DesignElement>): DesignElement {
  return {
    id: uid('el'),
    viewId,
    kind: 'forma',
    name: 'Elemento',
    locked: false,
    hidden: false,
    x: 0,
    y: 0,
    w: 60,
    h: 60,
    rotation: 0,
    flipX: false,
    flipY: false,
    fill: { type: 'color', color: '#C9D6CF' },
    stroke: null,
    technique: 'ninguna',
    edge: 'na',
    allowance: 0,
    backing: 'ninguna',
    ...partial
  };
}

/** Matriz local (caja centrada en 0,0) → vista. */
export function elementMatrix(el: Pick<DesignElement, 'x' | 'y' | 'rotation' | 'flipX' | 'flipY'>): Mat {
  let m: Mat = matScale(el.flipX ? -1 : 1, el.flipY ? -1 : 1);
  m = matMul(matRotate(el.rotation), m);
  return matMul(matTranslate(el.x, el.y), m);
}

const organicCache = new Map<string, PathCmd[]>();

function organicUnit(id: string): PathCmd[] {
  const hit = organicCache.get(id);
  if (hit) return hit;
  const s = findShape(id);
  const cmds = s ? transformCmds(parseSvgPath(s.d), [0.01, 0, 0, 0.01, -0.5, -0.5]) : [];
  organicCache.set(id, cmds);
  return cmds;
}

function starPts(n: number, inner: number): [number, number][] {
  const pts: [number, number][] = [];
  for (let i = 0; i < n * 2; i++) {
    const r = i % 2 === 0 ? 0.5 : 0.5 * inner;
    const a = -Math.PI / 2 + (i * Math.PI) / n;
    pts.push([Math.cos(a) * r, Math.sin(a) * r]);
  }
  return pts;
}

function polygonPts(n: number): [number, number][] {
  const pts: [number, number][] = [];
  for (let i = 0; i < n; i++) {
    const a = -Math.PI / 2 + (i * 2 * Math.PI) / n;
    pts.push([Math.cos(a) * 0.5, Math.sin(a) * 0.5]);
  }
  return pts;
}

/** Curva suave (Catmull-Rom) a través de puntos. */
export function smoothCmds(pts: Pt[], closed: boolean): PathCmd[] {
  if (pts.length < 3) return polylineCmds(pts, closed);
  const out: PathCmd[] = [{ op: 'M', p: pts[0] }];
  const n = pts.length;
  const get = (i: number) => (closed ? pts[(i + n) % n] : pts[Math.max(0, Math.min(n - 1, i))]);
  const segs = closed ? n : n - 1;
  for (let i = 0; i < segs; i++) {
    const p0 = get(i - 1);
    const p1 = get(i);
    const p2 = get(i + 1);
    const p3 = get(i + 2);
    out.push({
      op: 'C',
      c1: { x: p1.x + (p2.x - p0.x) / 6, y: p1.y + (p2.y - p0.y) / 6 },
      c2: { x: p2.x - (p3.x - p1.x) / 6, y: p2.y - (p3.y - p1.y) / 6 },
      p: p2
    });
  }
  if (closed) out.push({ op: 'Z' });
  return out;
}

/** Contorno del elemento en coordenadas locales (mm, centrado). */
export function elementLocalCmds(el: DesignElement): PathCmd[] {
  const S = (pts: [number, number][]) => pts.map(([x, y]) => ({ x: x * el.w, y: y * el.h }));
  const k = 0.5523;
  switch (el.kind) {
    case 'organica':
      return transformCmds(organicUnit(el.organicId ?? 'mancha'), [el.w, 0, 0, el.h, 0, 0]);
    case 'trazo':
      if (!el.path) return [];
      return el.path.smooth ? smoothCmds(S(el.path.pts), el.path.closed) : polylineCmds(S(el.path.pts), el.path.closed);
    case 'forma': {
      const t = el.shape?.type ?? 'rect';
      const w = el.w / 2;
      const h = el.h / 2;
      if (t === 'ellipse')
        return [
          { op: 'M', p: { x: 0, y: -h } },
          { op: 'C', c1: { x: w * k, y: -h }, c2: { x: w, y: -h * k }, p: { x: w, y: 0 } },
          { op: 'C', c1: { x: w, y: h * k }, c2: { x: w * k, y: h }, p: { x: 0, y: h } },
          { op: 'C', c1: { x: -w * k, y: h }, c2: { x: -w, y: h * k }, p: { x: -w, y: 0 } },
          { op: 'C', c1: { x: -w, y: -h * k }, c2: { x: -w * k, y: -h }, p: { x: 0, y: -h } },
          { op: 'Z' }
        ];
      if (t === 'polygon') return polylineCmds(S(polygonPts(el.shape?.sides ?? 6)), true);
      if (t === 'star') return polylineCmds(S(starPts(el.shape?.sides ?? 5, el.shape?.inner ?? 0.45)), true);
      const r = Math.min(el.shape?.radius ?? 0, w, h);
      if (r <= 0)
        return polylineCmds(
          [
            { x: -w, y: -h },
            { x: w, y: -h },
            { x: w, y: h },
            { x: -w, y: h }
          ],
          true
        );
      const c = r * (1 - k);
      return [
        { op: 'M', p: { x: -w + r, y: -h } },
        { op: 'L', p: { x: w - r, y: -h } },
        { op: 'C', c1: { x: w - c, y: -h }, c2: { x: w, y: -h + c }, p: { x: w, y: -h + r } },
        { op: 'L', p: { x: w, y: h - r } },
        { op: 'C', c1: { x: w, y: h - c }, c2: { x: w - c, y: h }, p: { x: w - r, y: h } },
        { op: 'L', p: { x: -w + r, y: h } },
        { op: 'C', c1: { x: -w + c, y: h }, c2: { x: -w, y: h - c }, p: { x: -w, y: h - r } },
        { op: 'L', p: { x: -w, y: -h + r } },
        { op: 'C', c1: { x: -w, y: -h + c }, c2: { x: -w + c, y: -h }, p: { x: -w + r, y: -h } },
        { op: 'Z' }
      ];
    }
    case 'imagen':
    case 'texto':
    case 'parche':
    case 'grupo':
    default:
      return polylineCmds(
        [
          { x: -el.w / 2, y: -el.h / 2 },
          { x: el.w / 2, y: -el.h / 2 },
          { x: el.w / 2, y: el.h / 2 },
          { x: -el.w / 2, y: el.h / 2 }
        ],
        true
      );
  }
}

export function elementWorldCmds(el: DesignElement): PathCmd[] {
  return transformCmds(elementLocalCmds(el), elementMatrix(el));
}

export function elementCorners(el: DesignElement): Pt[] {
  const m = elementMatrix(el);
  return [
    { x: -el.w / 2, y: -el.h / 2 },
    { x: el.w / 2, y: -el.h / 2 },
    { x: el.w / 2, y: el.h / 2 },
    { x: -el.w / 2, y: el.h / 2 }
  ].map((p) => matApply(m, p));
}

export function isClosedShape(el: DesignElement): boolean {
  if (el.kind === 'trazo') return !!el.path?.closed;
  return el.kind === 'forma' || el.kind === 'organica' || el.kind === 'imagen' || el.kind === 'parche';
}
