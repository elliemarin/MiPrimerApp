import type { BBox, Pt } from '../geom/vec';
import { bboxOf } from '../geom/vec';
import { differencePolygons, intersectPolygons, offsetPolygons, polygonsArea, unionPolygons } from '../geom/polyoffset';
import type { Shape } from './shapes';

/* Figuras de tela por capas (aplicación). Cada figura es una pila de piezas
 * de atrás hacia delante. El motor calcula, a la escala pedida:
 *   · la parte visible de cada pieza (lo que no tapan las de encima),
 *   · la pieza que se corta: visible + una solapa que entra bajo las piezas
 *     de encima (para que no queden huecos al coser su borde), y si se pide
 *     ahorrar tela, sin la parte que queda totalmente oculta,
 *   · el margen para doblar en la técnica de bordes doblados,
 *   · la capa (profundidad) real: 1 = directamente sobre la tela base.
 * No hay medidas corporales: el tamaño es el ancho total que elige la persona. */

export type FabricPattern = 'liso' | 'vichy' | 'rayas' | 'lunares' | 'cuadros';
export interface FigureLayerDef { name: string; color: string; shape: Shape; pattern?: FabricPattern }
export interface FigureDef {
  id: string; name: string; category: FigureCategory; tags: string[]; description: string;
  /** Ancho sugerido (mm). */
  width: number;
  layers: FigureLayerDef[];
}

export const FIGURE_CATEGORY_LABEL = {
  flores: 'Flores', plantas: 'Árboles, plantas y hongos', casas: 'Casas y lugares', animales: 'Animales',
  frutas: 'Frutas y verduras', juguetes: 'Juguetes', caras: 'Caras y ojos', cuerpo: 'Cuerpo y figuras humanas',
  cielo: 'Cielo y mar', geometria: 'Geometría', abstracto: 'Abstractos', psicodelico: 'Psicodélicos', arte: 'Arte'
} as const;
export type FigureCategory = keyof typeof FIGURE_CATEGORY_LABEL;

export type FigureTechnique = 'termoadhesiva' | 'doblado';
export interface FigureOptions {
  /** Ancho total de la figura terminada (mm). */
  width: number;
  technique: FigureTechnique;
  /** Cuánto entra cada pieza bajo la de encima (mm). */
  underlap: number;
  /** Quitar la tela que queda oculta bajo otras piezas. */
  saveFabric: boolean;
  /** Piezas en espejo para trazar sobre el papel de la entretela termoadhesiva. */
  mirror: boolean;
  /** Colores elegidos por pieza (por índice). */
  colors?: Record<number, string>;
}
export const TURN_ALLOWANCE = 5;
export const MIN_WIDTH = 40, MAX_WIDTH = 1500;
export const defaultFigureOptions = (def: FigureDef): FigureOptions => ({ width: def.width, technique: 'termoadhesiva', underlap: 5, saveFabric: true, mirror: true });

export interface FigurePiece {
  index: number;
  /** Orden de colocación: 1 va primero (abajo). */
  number: number;
  /** Capa: 1 = sobre la tela base; 2 = sobre una pieza de la capa 1… */
  level: number;
  name: string;
  color: string;
  pattern: FabricPattern;
  /** Forma completa a escala (mm), como se ve si nada la tapara. */
  shape: Pt[][];
  /** Parte visible en la figura terminada. */
  visible: Pt[][];
  /** Pieza terminada que se coloca (visible + solapa bajo las de encima). */
  final: Pt[][];
  /** Línea de corte (final + margen de doblado si la técnica lo pide). */
  cut: Pt[][];
  allowance: number;
  /** Números de las piezas que quedan encima / debajo. */
  coveredBy: number[];
  sitsOn: number[];
  areaMm2: number;
  bbox: BBox;
  hidden: boolean;
  thin: boolean;
}
export interface BuiltFigure {
  def: FigureDef;
  options: FigureOptions;
  width: number;
  height: number;
  scale: number;
  levels: number;
  pieces: FigurePiece[];
  warnings: string[];
}

export function designBox(def: FigureDef): BBox {
  return bboxOf(def.layers.flatMap(l => l.shape.flat()));
}

const area = (s: Pt[][]) => polygonsArea(s);
/** Separa un conjunto de polígonos de Clipper en grupos exterior + huecos. */
export function components(polys: Pt[][]): Pt[][][] {
  const signed = (p: Pt[]) => { let a = 0; for (let i = 0; i < p.length; i++) { const u = p[i], v = p[(i + 1) % p.length]; a += u.x * v.y - v.x * u.y; } return a / 2; };
  const outers = polys.filter(p => signed(p) > 0), holes = polys.filter(p => signed(p) < 0);
  const inside = (pt: Pt, poly: Pt[]) => { let c = false; for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) { const a = poly[i], b = poly[j]; if ((a.y > pt.y) !== (b.y > pt.y) && pt.x < ((b.x - a.x) * (pt.y - a.y)) / (b.y - a.y) + a.x) c = !c; } return c; };
  return outers.map(o => [o, ...holes.filter(h => inside(h[0], o))]);
}

export function buildFigure(def: FigureDef, opts: FigureOptions): BuiltFigure {
  const box = designBox(def), bw = box.maxX - box.minX, bh = box.maxY - box.minY;
  const width = Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, opts.width)), k = width / bw;
  const u = Math.max(0, Math.min(20, opts.underlap)), allowance = opts.technique === 'doblado' ? TURN_ALLOWANCE : 0;
  const shapes = def.layers.map(l => unionPolygons(l.shape.map(p => p.map(q => ({ x: (q.x - box.minX) * k, y: (q.y - box.minY) * k })))));
  const n = shapes.length, overlap: boolean[][] = shapes.map(() => Array(n).fill(false));
  for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) {
    const o = area(intersectPolygons(shapes[i], shapes[j])) > 0.5;
    overlap[i][j] = overlap[j][i] = o;
  }
  const level: number[] = [];
  for (let i = 0; i < n; i++) level[i] = 1 + Math.max(0, ...range(i).filter(j => overlap[i][j]).map(j => level[j]));
  // Small hidden cores are not worth cutting away: a hole under an eye only complicates the piece.
  const minCore = Math.max(400, (width * width) / 400);
  const warnings: string[] = [];
  const pieces: FigurePiece[] = shapes.map((S, i) => {
    const above = unionPolygons(range(n).filter(j => j > i && overlap[i][j]).flatMap(j => shapes[j]));
    const visible = above.length ? differencePolygons(S, above) : S;
    const hidden = area(visible) < 1;
    let final = S;
    if (opts.saveFabric && above.length && !hidden) {
      const reach = offsetPolygons(visible, u);
      // A hidden region on the piece's edge is simply trimmed; one inside the piece would leave a hole,
      // so only large inner ones are removed (a hole under an eye only complicates cutting).
      const onEdge = (c: Pt[][]) => area(differencePolygons(offsetPolygons(c, 0.6), S)) > 0.05;
      const cores = components(differencePolygons(S, reach)).filter(c => onEdge(c) || area(c) >= minCore);
      if (cores.length) {
        // Opening removes hidden slivers thinner than 2 mm; the visible part is always kept whole.
        const trimmed = differencePolygons(S, cores.flat());
        final = intersectPolygons(unionPolygons([...offsetPolygons(offsetPolygons(trimmed, -1), 1), ...visible]), S);
      }
    }
    const cut = allowance ? offsetPolygons(final, allowance) : final;
    // A visible part narrower than 4 mm (8 mm when turned under) cannot be cut and finished cleanly.
    const thin = !hidden && offsetPolygons(visible, -(allowance ? 4 : 2)).length === 0;
    const l = def.layers[i];
    return {
      index: i, number: i + 1, level: level[i], name: l.name, color: opts.colors?.[i] ?? l.color, pattern: l.pattern ?? 'liso',
      shape: S, visible, final, cut, allowance,
      coveredBy: range(n).filter(j => j > i && overlap[i][j]).map(j => j + 1), sitsOn: range(n).filter(j => j < i && overlap[i][j]).map(j => j + 1),
      areaMm2: area(cut), bbox: bboxOf(cut.flat().length ? cut.flat() : S.flat()), hidden, thin
    };
  });
  const hiddenList = pieces.filter(p => p.hidden), thinList = pieces.filter(p => p.thin);
  if (hiddenList.length) warnings.push(`Quedan ocultas por completo y no se cortan: ${hiddenList.map(p => `${p.number}. ${p.name}`).join(', ')}.`);
  if (thinList.length) warnings.push(`A este tamaño son muy finas para cortarlas en tela: ${thinList.map(p => `${p.number}. ${p.name}`).join(', ')}. Agranda la figura o bórdalas.`);
  return { def, options: { ...opts, width }, width, height: bh * k, scale: k, levels: Math.max(...level), pieces, warnings };
}

function range(n: number) { return Array.from({ length: n }, (_, i) => i); }

/** Área por color para la lista de materiales (mm²). */
export function areaByColor(fig: BuiltFigure): { color: string; names: string[]; area: number }[] {
  const by = new Map<string, { color: string; names: string[]; area: number }>();
  for (const p of fig.pieces.filter(x => !x.hidden)) {
    const key = `${p.color}|${p.pattern}`, row = by.get(key) ?? { color: p.color, names: [], area: 0 };
    row.names.push(`${p.number}. ${p.name}`); row.area += p.areaMm2; by.set(key, row);
  }
  return [...by.values()];
}

/** Trazado SVG de un conjunto de polígonos (mm o unidades de diseño). */
export const polysPath = (polys: Pt[][], digits = 1) => polys.map(p => `M${p.map(q => `${q.x.toFixed(digits)} ${q.y.toFixed(digits)}`).join(' L')} Z`).join(' ');
