import type { Pt } from '../geom/vec';

/** Acabado del borde: define cómo se dibuja y cómo se construye su margen. */
export type EdgeFinish =
  | 'costura' // se une a otra pieza
  | 'dobladillo' // se dobla hacia dentro (esquinas en espejo)
  | 'jareta' // se dobla para alojar un elástico (esquinas en espejo)
  | 'doblez' // la pieza se corta al doblez de la tela (sin margen)
  | 'orillo' // canto terminado / orillo de la tela
  | 'sin-margen';

export interface PNode {
  id: string;
  x: number;
  y: number;
}

export interface PEdge {
  id: string;
  label: string;
  from: string;
  to: string;
  kind: 'line' | 'cubic';
  c1?: Pt;
  c2?: Pt;
  allowance: number;
  finish: EdgeFinish;
}

export interface Notch {
  id: string;
  edgeId: string;
  /** Distancia en mm sobre la línea de costura desde el inicio del borde. */
  s: number;
  count: 1 | 2;
  label?: string;
}

export interface InternalLine {
  id: string;
  kind: 'doblez' | 'referencia' | 'pespunte' | 'colocacion';
  a: Pt;
  b: Pt;
  label?: string;
}

export interface Mark {
  id: string;
  kind: 'punto' | 'boton' | 'ojal' | 'cruz';
  at: Pt;
  label?: string;
}

export type FabricRole = 'principal' | 'contraste' | 'forro' | 'entretela' | 'punto-elastico';

export interface CutInfo {
  qty: number;
  /** Cortar en pares simétricos (tela doblada derecho con derecho). */
  mirrorPairs: boolean;
  onFold: boolean;
  fabric: FabricRole;
}

export interface Piece {
  /** Panel procedente de una pieza real, conservando trazabilidad. */
  panelSource?: { pieceId: string; cutIds: string[] };
  id: string;
  name: string;
  nodes: PNode[];
  /** Bordes en orden: edges[i].to === edges[i+1].from y cierra en edges[0].from. */
  edges: PEdge[];
  grain: { a: Pt; b: Pt };
  /** Dirección del pelo de la tela si aplica (opcional). */
  cut: CutInfo;
  notches: Notch[];
  lines: InternalLine[];
  marks: Mark[];
  notes?: string[];
  /** Origen: generador paramétrico o pieza manual. */
  source: 'generada' | 'manual';
}

export type SeamKind = 'igual' | 'embebido' | 'fruncido' | 'estirado';

export interface SeamSide {
  pieceId: string;
  edgeIds: string[];
  /** Cuántas veces cuenta este lado (p. ej. delantero + trasero suman el contorno). */
  factor?: number;
}

export interface SeamRelation {
  id: string;
  label: string;
  kind: SeamKind;
  a: SeamSide[];
  b: SeamSide[];
  /** Relación esperada a/b y su rango admisible. */
  ratioMin: number;
  ratioMax: number;
  /** Tolerancia absoluta en mm para costuras 'igual'. */
  tolerance?: number;
  note?: string;
}

export interface MeasureCheck {
  key: string;
  label: string;
  body?: number;
  ease?: number;
  /** Medida de prenda terminada esperada (cuerpo + holgura, sin márgenes). */
  target: number;
  /** Medida obtenida de la geometría de la línea de costura. */
  measured: number;
  tolerance: number;
}

export interface MaterialNeed {
  id: string;
  label: string;
  qty: string;
  note?: string;
}

export interface GeneratedPattern {
  pieces: Piece[];
  seams: SeamRelation[];
  checks: MeasureCheck[];
  materials: MaterialNeed[];
  assumptions: string[];
  /** Pasos de armado que hacen referencia a piezas reales. */
  steps: SewingStep[];
}

export interface SewingStep {
  id: string;
  title: string;
  detail: string;
  pieces: string[];
  seams?: string[];
}

export type IssueLevel = 'error' | 'aviso' | 'ok';

export interface Issue {
  level: IssueLevel;
  code: string;
  message: string;
  pieceId?: string;
  edgeIds?: string[];
}

/** Desplazamientos manuales guardados por id estable. */
export interface NodeOverride {
  dx: number;
  dy: number;
  /** Posición generada cuando se hizo el ajuste (para detectar regeneraciones). */
  base: Pt;
}

export type PieceOverrides = Record<string, NodeOverride>;

export interface PieceLayout {
  x: number;
  y: number;
  rot: number;
  mirror: boolean;
}
