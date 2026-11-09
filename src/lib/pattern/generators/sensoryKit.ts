import type { Pt } from '../../geom/vec';
import { P } from './kidsShared';
import { circle, ellipse, rect, uni } from '../../applique/shapes';
import { offsetPolygons } from '../../geom/polyoffset';
import { biggest, smooth, spline } from './shapeKit';

/* Elementos sensoriales para tapetes de actividades (2026-11-09). Diseños
 * propios: cada uno se dibuja en un cuadro de 300 × 300 mm (y hacia abajo) y
 * se escala al cuadro real. Dice qué piezas lleva, cómo se cosen (forradas,
 * rellenas, aplicadas), dónde van en el cuadro y qué material extra piden.
 * Seguridad: nada suelto ni pequeño, cintas cortas, anillas grandes, papel
 * crujiente siempre dentro y sin botones, cuentas ni espejos de cristal. */

export type SensMake = 'forrado' | 'relleno' | 'aplique';
export interface SensPart {
  key: string; name: string;
  /** Pattern shape in mm at the 300 mm square. */
  shape: Pt[];
  qty: number; make: SensMake; color: string;
  /** Edge left open and sewn onto the square: the straight bottom or top edge. */
  open?: 'abajo' | 'arriba';
  /** Copies placed on the square (mm at the 300 mm square). */
  at: Pt[][];
  mirror?: boolean; crinkle?: boolean;
}
export interface SensElement {
  id: string; name: string;
  parts: SensPart[];
  /** Topstitching or embroidery on the square. */
  stitch: Pt[][];
  marks: { at: Pt; label: string }[];
  /** Drawing only: ribbons, rings (stroked). */
  draw: { pts: Pt[]; color: string; width: number }[];
  materials: { id: string; label: string; qty: string }[];
  step: string;
  /** A plain square in a texture fabric (or a plain one): no extra pieces. */
  texture?: 'textura' | 'liso';
}

const rot = (pts: Pt[], deg: number) => { const a = (deg * Math.PI) / 180, c = Math.cos(a), s = Math.sin(a); return pts.map(q => P(q.x * c - q.y * s, q.x * s + q.y * c)); };
/** A shape drawn pointing up from its base at (0, 0), turned `deg` and moved to (x, y). */
const put = (shape: Pt[], x: number, y: number, deg = 0) => rot(shape, deg).map(q => P(q.x + x, q.y + y));
const mirrorX = (pts: Pt[]) => pts.map(q => P(-q.x, q.y)).reverse();
/** U-shaped petal or tab: base on y = 0, rounded end up. */
export function uShape(w: number, h: number): Pt[] {
  const r = w / 2, pts: Pt[] = [P(-r, 0), P(-r, -(h - r))];
  for (let i = 1; i < 16; i++) { const t = Math.PI + (i / 16) * Math.PI; pts.push(P(Math.cos(t) * r, -(h - r) + Math.sin(t) * r)); }
  pts.push(P(r, -(h - r)), P(r, 0));
  return pts;
}
/** Leaf with a narrow base on y = 0 and the tip up. */
export const leafShape = (w: number, h: number) => spline([[-w * 0.13, 0, 'contorno', 'cl'], [-w * 0.5, -h * 0.4], [-w * 0.28, -h * 0.76], [0, -h, undefined, 'c'], [w * 0.28, -h * 0.76], [w * 0.5, -h * 0.4], [w * 0.13, 0, undefined, 'c']]);
export const ring = (cx: number, cy: number, r: number) => [...circle(cx, cy, r, 36), circle(cx, cy, r, 36)[0]];
const box = (x0: number, y0: number, x1: number, y1: number) => [P(x0, y0), P(x1, y0), P(x1, y1), P(x0, y1)];
const tab = (w: number, h: number) => box(-w / 2, -h, w / 2, 0);
export function heart(cx: number, cy: number, w: number): Pt[] {
  const r = w * 0.27;
  return smooth(uni(circle(cx - r * 0.95, cy - r * 0.3, r, 40), circle(cx + r * 0.95, cy - r * 0.3, r, 40), [P(cx - w * 0.49, cy - r * 0.05), P(cx + w * 0.49, cy - r * 0.05), P(cx, cy + w * 0.52)]), 1);
}
export const star = (cx: number, cy: number, R: number, r: number) => {
  const pts = Array.from({ length: 10 }, (_, i) => { const a = -Math.PI / 2 + (i * Math.PI) / 5, rr = i % 2 ? r : R; return P(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr); });
  return biggest(offsetPolygons(offsetPolygons([pts], -9), 9));
};
export const cloudShape = (w: number) => { const k = w / 190; return smooth(uni(circle(-50 * k, -45 * k, 42 * k, 40), circle(0, -72 * k, 55 * k, 48), circle(55 * k, -45 * k, 42 * k, 40), rect(-92 * k, -45 * k, 184 * k, 45 * k)), 8 * k); };
export const curve = (pts: Pt[], n = 8): Pt[] => {
  // Catmull-Rom through the points, for stems and antennae.
  const out: Pt[] = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(pts.length - 1, i + 2)];
    for (let j = 0; j < n; j++) { const t = j / n, t2 = t * t, t3 = t2 * t; out.push(P(0.5 * (2 * p1.x + (-p0.x + p2.x) * t + (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 + (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3), 0.5 * (2 * p1.y + (-p0.y + p2.y) * t + (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 + (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3))); }
  }
  out.push(pts[pts.length - 1]);
  return out;
};

const RING = '#7fb7c9';
const el = (e: Partial<SensElement> & Pick<SensElement, 'id' | 'name' | 'step'>): SensElement => ({ parts: [], stitch: [], marks: [], draw: [], materials: [], ...e });

export const SENSORY: Record<string, SensElement> = {
  textura: el({ id: 'textura', name: 'Cuadro de textura', texture: 'textura', step: 'Corta este cuadro en una tela con textura: minky de burbujas, pana, rizo o muselina arrugada.' }),
  liso: el({ id: 'liso', name: 'Cuadro liso', texture: 'liso', step: 'Cuadro liso para descansar la vista.' }),
  etiquetas: el({
    id: 'etiquetas', name: 'Etiquetas de cinta',
    marks: [60, 105, 150, 195, 240].map(x => ({ at: P(x, 0), label: 'Cinta en bucle: entra en la costura de arriba' })),
    draw: [60, 105, 150, 195, 240].map((x, i) => ({ pts: [P(x - 9, 0), ...Array.from({ length: 9 }, (_, j) => { const t = Math.PI - (j / 8) * Math.PI; return P(x + Math.cos(t) * 9, 46 + Math.sin(t) * 9); }), P(x + 9, 0)], color: ['#e8a0a8', '#f2c94c', '#8fb07c', '#7fb7c9', '#c9a0dc'][i], width: 7 })),
    materials: [{ id: 'cintas', label: 'Cinta de grogrén o raso de 1,5 cm en 5 colores', qty: '5 × 12 cm' }],
    step: 'Dobla cada cinta en bucle de 5 cm e hilvánala en el borde de arriba, con el bucle hacia dentro. Queda atrapada (con doble pespunte) en la costura con el cuadro de al lado o en el ribete.'
  }),
  mordedor: el({
    id: 'mordedor', name: 'Anilla mordedora',
    parts: [{ key: 'lengueta', name: 'Lengüeta de la anilla', shape: tab(40, 120), qty: 2, make: 'forrado', color: 'tela2', open: 'arriba', at: [put(box(-20, 0, 20, 120), 150, 40)] }],
    marks: [{ at: P(150, 145), label: 'Broche' }],
    draw: [{ pts: ring(150, 190, 30), color: RING, width: 11 }],
    materials: [{ id: 'anilla', label: 'Anilla mordedora de silicona alimentaria o madera sin barniz, de 5 a 6,5 cm', qty: '1' }, { id: 'broche', label: 'Broche de presión de plástico (bien remachado)', qty: '1' }],
    step: 'Cose la lengüeta, voltéala y pespuntéala. Cóselo por arriba al cuadro con un rectángulo de pespunte, pásala por la anilla y ciérrala con el broche.'
  }),
  nube: el({
    id: 'nube', name: 'Nube que se levanta',
    parts: [
      { key: 'sol', name: 'Sol escondido (aplique)', shape: circle(0, 0, 38, 40), qty: 1, make: 'aplique', color: 'amarillo', at: [circle(150, 182, 38, 40)] },
      { key: 'nube', name: 'Nube con papel crujiente', shape: cloudShape(190), qty: 2, make: 'forrado', color: 'blanco', open: 'abajo', crinkle: true, at: [put(cloudShape(190), 150, 240)] }
    ],
    step: 'Cose el sol con zigzag. Cose la nube con el papel crujiente dentro, voltéala, mete hacia dentro el borde de abajo y pespuntéala solo por abajo: se levanta como una solapa.'
  }),
  orejas: el({
    id: 'orejas', name: 'Orejas de conejo en un bolsillo',
    parts: [
      { key: 'oreja', name: 'Oreja de conejo (rellena)', shape: leafShape(64, 150), qty: 4, make: 'relleno', color: 'blanco', open: 'abajo', at: [put(leafShape(64, 150), 115, 215, -8), put(leafShape(64, 150), 185, 215, 8)] },
      { key: 'bolsillo', name: 'Bolsillo (forrado)', shape: box(0, 0, 210, 110), qty: 2, make: 'forrado', color: 'tela1', at: [box(45, 165, 255, 275)] }
    ],
    step: 'Cose y rellena poco las orejas. Cóselas por la base al cuadro y tapa las bases con el bolsillo forrado, pespunteado por los lados y el fondo.'
  }),
  flor: el({
    id: 'flor', name: 'Flor de pétalos rellenos',
    parts: [
      { key: 'petalo', name: 'Pétalo (relleno)', shape: [...uShape(52, 88)], qty: 16, make: 'relleno', color: 'rosa', open: 'abajo', at: Array.from({ length: 8 }, (_, i) => { const a = i * 45; return put(uShape(52, 88), 150 + 30 * Math.cos((a * Math.PI) / 180), 150 + 30 * Math.sin((a * Math.PI) / 180), a + 90); }) },
      { key: 'centro', name: 'Centro de la flor (relleno ligero)', shape: circle(0, 0, 44, 40), qty: 2, make: 'relleno', color: 'amarillo', at: [circle(150, 150, 44, 40)] }
    ],
    step: 'Cose y rellena poco los 8 pétalos. Cóselos por la base en círculo y tapa las bases con el centro, cosido alrededor.'
  }),
  banderines: el({
    id: 'banderines', name: 'Banderines',
    parts: [{ key: 'banderin', name: 'Banderín (forrado)', shape: [P(-32, 0), P(32, 0), P(0, 76)], qty: 6, make: 'forrado', color: 'tela1', open: 'arriba', at: [0.22, 0.5, 0.78].map(t => put([P(-32, 0), P(32, 0), P(0, 76)], 35 + 230 * t, 70 + 30 * t, 7.4)) }],
    stitch: [[P(35, 70), P(265, 100)]],
    draw: [{ pts: [P(35, 70), P(265, 100)], color: '#d9c7a7', width: 9 }],
    materials: [{ id: 'bies', label: 'Bies doble de 2 cm para el cordel de banderines', qty: '26 cm' }],
    step: 'Cose y voltea los banderines. Mételos en el bies doblado y pespuntéalo por los dos cantos; cose el bies al cuadro por los extremos y por encima, sin que quede suelto.'
  }),
  'bolsillo-zanahorias': el({
    id: 'bolsillo-zanahorias', name: 'Zanahorias en un bolsillo',
    parts: [
      { key: 'zanahoria', name: 'Zanahoria (rellena)', shape: spline([[-22, 0, 'contorno', 'cl'], [22, 0, undefined, 'c'], [18, 50], [6, 110], [0, 125, undefined, 'c'], [-6, 110], [-18, 50]]), qty: 4, make: 'relleno', color: 'naranja', open: 'arriba', at: [put(spline([[-22, 0, 'contorno', 'cl'], [22, 0, undefined, 'c'], [18, 50], [6, 110], [0, 125, undefined, 'c'], [-6, 110], [-18, 50]]), 115, 95, -6), put(spline([[-22, 0, 'contorno', 'cl'], [22, 0, undefined, 'c'], [18, 50], [6, 110], [0, 125, undefined, 'c'], [-6, 110], [-18, 50]]), 180, 85, 6)] },
      { key: 'hojas-zanahoria', name: 'Hojas de la zanahoria (fieltro)', shape: uni(ellipse(-12, -22, 8, 22, -20, 24), ellipse(0, -26, 8, 26, 0, 24), ellipse(12, -22, 8, 22, 20, 24), rect(-14, -6, 28, 6))[0], qty: 2, make: 'aplique', color: 'verde', at: [put(uni(ellipse(-12, -22, 8, 22, -20, 24), ellipse(0, -26, 8, 26, 0, 24), ellipse(12, -22, 8, 22, 20, 24), rect(-14, -6, 28, 6))[0], 115, 99, -6), put(uni(ellipse(-12, -22, 8, 22, -20, 24), ellipse(0, -26, 8, 26, 0, 24), ellipse(12, -22, 8, 22, 20, 24), rect(-14, -6, 28, 6))[0], 180, 89, 6)] },
      { key: 'bolsillo', name: 'Bolsillo (forrado)', shape: box(0, 0, 200, 115), qty: 2, make: 'forrado', color: 'tela1', at: [box(50, 160, 250, 275)] }
    ],
    marks: [{ at: P(110, 262), label: 'Cinta de 12 cm a la zanahoria' }, { at: P(190, 262), label: 'Cinta de 12 cm a la zanahoria' }],
    materials: [{ id: 'cinta-zanahoria', label: 'Cinta para atar cada zanahoria al bolsillo (máximo 15 cm)', qty: '2 × 12 cm' }],
    step: 'Cose las zanahorias con las hojas de fieltro en la costura de arriba y rellénalas. Cose una cinta corta a cada punta y al fondo del cuadro, y pon el bolsillo encima: las zanahorias salen y entran sin perderse.'
  }),
  hojas: el({
    id: 'hojas', name: 'Rama con hojas rellenas',
    parts: [{ key: 'hoja', name: 'Hoja (rellena)', shape: leafShape(62, 90), qty: 6, make: 'relleno', color: 'verde', open: 'abajo', at: [put(leafShape(62, 90), 140, 205, -55), put(leafShape(62, 90), 175, 155, 50), put(leafShape(62, 90), 205, 110, -40)] }],
    stitch: [curve([P(110, 270), P(140, 205), P(175, 155), P(205, 110), P(225, 80)])],
    step: 'Borda la rama con pespunte triple. Cose y rellena poco las hojas, mete hacia dentro el borde de la base y cóselas sobre la rama.'
  }),
  oruga: el({
    id: 'oruga', name: 'Oruga de bolitas',
    parts: [{ key: 'oruga', name: 'Oruga (rellena)', shape: smooth(uni(...[0, 1, 2, 3].map(i => circle(70 + 38 * i, i % 2 ? 172 : 180, 28, 32)), circle(228, 160, 36, 36)), 6), qty: 2, make: 'relleno', color: 'verde', at: [smooth(uni(...[0, 1, 2, 3].map(i => circle(70 + 38 * i, i % 2 ? 172 : 180, 28, 32)), circle(228, 160, 36, 36)), 6)] }],
    stitch: [[P(236, 128), P(244, 98)], [P(220, 127), P(214, 98)], [P(218, 156), P(218, 162)], [P(238, 156), P(238, 162)]],
    marks: [{ at: P(70, 180), label: 'Pespunte a mano en cada bolita' }],
    step: 'Cose la oruga, voltéala y rellénala. Cósela al cuadro con un punto a mano en el centro de cada bolita y borda los ojos y las antenas.'
  }),
  solapas: el({
    id: 'solapas', name: 'Solapas con sorpresa',
    parts: [
      { key: 'sorpresa-circulo', name: 'Sorpresa: círculo (aplique)', shape: circle(0, 0, 18, 32), qty: 1, make: 'aplique', color: 'rosa', at: [circle(62, 152, 18, 32)] },
      { key: 'sorpresa-corazon', name: 'Sorpresa: corazón (aplique)', shape: heart(0, 0, 40), qty: 1, make: 'aplique', color: 'rosa', at: [heart(150, 150, 40)] },
      { key: 'sorpresa-estrella', name: 'Sorpresa: estrella (aplique)', shape: star(0, 0, 24, 11), qty: 1, make: 'aplique', color: 'amarillo', at: [star(238, 152, 24, 11)] },
      { key: 'solapa', name: 'Solapa triangular (forrada)', shape: [P(-35, 0), P(35, 0), P(0, 80)], qty: 6, make: 'forrado', color: 'tela1', open: 'arriba', at: [62, 150, 238].map(x => put([P(-35, 0), P(35, 0), P(0, 80)], x, 118)) }
    ],
    step: 'Cose los apliques sorpresa con zigzag. Cose y voltea las solapas, mete hacia dentro el borde de arriba y pespuntéalas solo por arriba, tapando cada sorpresa.'
  }),
  estrella: el({
    id: 'estrella', name: 'Estrella crujiente',
    parts: [{ key: 'estrella', name: 'Estrella con papel crujiente', shape: star(0, 0, 110, 52), qty: 2, make: 'relleno', color: 'amarillo', crinkle: true, at: [star(150, 155, 110, 52)] }],
    stitch: [ring(150, 155, 26)],
    step: 'Cose la estrella con el papel crujiente y un poco de relleno, voltéala y ciérrala. Cósela al cuadro solo con un círculo en el centro: las puntas quedan sueltas.'
  }),
  mariposa: el({
    id: 'mariposa', name: 'Mariposa de alas crujientes',
    parts: (() => {
      const up = spline([[4, -10, 'contorno', 'c'], [40, -80], [95, -92], [112, -45], [70, -6]]), low = spline([[4, 6, 'contorno', 'c'], [70, 10], [96, 50], [62, 82], [20, 56]]);
      const mv = (pts: Pt[]) => pts.map(q => P(q.x + 150, q.y + 150));
      return [
        { key: 'ala-superior', name: 'Ala de arriba (crujiente, en pares)', shape: up, qty: 4, make: 'forrado' as const, color: 'tela2', crinkle: true, mirror: true, at: [mv(up), mv(mirrorX(up))] },
        { key: 'ala-inferior', name: 'Ala de abajo (crujiente, en pares)', shape: low, qty: 4, make: 'forrado' as const, color: 'rosa', crinkle: true, mirror: true, at: [mv(low), mv(mirrorX(low))] },
        { key: 'cuerpo-mariposa', name: 'Cuerpo de la mariposa', shape: ellipse(0, 0, 14, 62, 0, 32), qty: 2, make: 'relleno' as const, color: 'madera', at: [ellipse(150, 152, 14, 62, 0, 32)] }
      ];
    })(),
    stitch: [[P(145, 93), P(132, 72), P(126, 60)], [P(155, 93), P(168, 72), P(174, 60)]],
    step: 'Cose cada ala con papel crujiente, voltéala y ciérrala. Cose las alas por el lado de dentro y tapa la unión con el cuerpo relleno. Borda las antenas.'
  })
};
export const SENSORY_IDS = Object.keys(SENSORY);
