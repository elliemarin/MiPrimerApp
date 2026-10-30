import type { Pt, BBox } from '../lib/geom/vec';
import { bboxOf } from '../lib/geom/vec';
import type { Piece } from '../lib/pattern/types';
import type { PanelCut } from '../lib/pattern/panels';
import { pieceGeometryHash } from '../lib/pattern/panels';

export type PanelPresetId = 'bandas-horizontales' | 'franjas-verticales' | 'cuadros-nueve' | 'canesu-diagonal' | 'collage-asimetrico';
export const PANEL_PRESETS: { id: PanelPresetId; label: string; description: string }[] = [
  { id: 'bandas-horizontales', label: 'Bandas de color', description: 'Tres bandas en cuerpo y dos tramos de manga, para combinar telas de contraste.' },
  { id: 'franjas-verticales', label: 'Franjas verticales', description: 'Tres franjas por pieza del cuerpo y por manga; conserva el hilo de la pieza original.' },
  { id: 'cuadros-nueve', label: 'Cuadrícula de nueve paneles', description: 'Nueve paneles por pieza del cuerpo y cuatro por manga, antes de contar los pares en espejo.' },
  { id: 'canesu-diagonal', label: 'Canesú diagonal', description: 'Unión diagonal en el cuerpo y división de manga. La base sigue siendo una chaqueta geométrica abierta.' },
  { id: 'collage-asimetrico', label: 'Collage geométrico irregular', description: 'Uniones quebradas y tramos desiguales para retazos. Los delanteros y mangas se cortan en pares simétricos.' }
];

/** Shared composition ratios for technical illustration and real pattern cuts.
 * Coordinates beyond the piece boundary ensure an actual boundary-to-boundary cut. */
export function presetLines(presetId: string, role: 'espalda' | 'delantero' | 'manga', b: BBox): Pt[][] {
  if (!PANEL_PRESETS.some(p => p.id === presetId)) throw new Error('La distribución de paneles no está disponible.');
  const w = b.maxX - b.minX, h = b.maxY - b.minY;
  if (!(w > 0 && h > 0 && Number.isFinite(w + h))) return [];
  const pad = Math.max(w, h) + 100;
  const at = (x: number, y: number): Pt => ({ x: b.minX + w * x, y: b.minY + h * y });
  const horizontal = (ratio: number): Pt[] => [{ x: b.minX - pad, y: b.minY + h * ratio }, { x: b.maxX + pad, y: b.minY + h * ratio }];
  const vertical = (ratio: number): Pt[] => [{ x: b.minX + w * ratio, y: b.minY - pad }, { x: b.minX + w * ratio, y: b.maxY + pad }];
  if (presetId === 'bandas-horizontales') return role === 'manga' ? [vertical(.55)] : [horizontal(.42), horizontal(.7)];
  if (presetId === 'franjas-verticales') return role === 'manga' ? [horizontal(1 / 3), horizontal(2 / 3)] : [vertical(1 / 3), vertical(2 / 3)];
  if (presetId === 'cuadros-nueve') return role === 'manga' ? [vertical(.5), horizontal(.5)] : [horizontal(.42), horizontal(.71), vertical(1 / 3), vertical(2 / 3)];
  if (presetId === 'canesu-diagonal') {
    // Extend the diagonal itself, rather than just moving its endpoints sideways.
    if (role === 'manga') return [vertical(.45)];
    const a = at(0, .52), z = at(1, .36), dx = z.x - a.x, dy = z.y - a.y;
    return [[{ x: a.x - dx * 2, y: a.y - dy * 2 }, { x: z.x + dx * 2, y: z.y + dy * 2 }]];
  }
  if (role === 'manga') return [[{ x: b.minX + w * .4, y: b.minY - pad }, at(.4,.3), at(.58,.6), { x: b.minX + w * .58, y: b.maxY + pad }]];
  return [
    [{ x: b.minX - pad, y: b.minY + h * .45 }, at(.3,.45), at(.62,.55), at(.8,.4), { x: b.maxX + pad, y: b.minY + h * .4 }],
    [{ x: b.minX - pad, y: b.minY + h * .76 }, at(.4,.76), at(.7,.69), { x: b.maxX + pad, y: b.minY + h * .69 }]
  ];
}

/** Presets split the actual generated pieces, never a scaled illustration. */
export function presetCuts(presetId: string, pieces: Piece[], allowance = 10): PanelCut[] {
  if (!(Number.isFinite(allowance) && allowance >= 0 && allowance <= 40)) throw new Error('El margen de unión debe estar entre 0 y 4 cm.');
  const cuts: PanelCut[] = [];
  for (const piece of pieces) {
    if (!['espalda','delantero','manga'].includes(piece.id)) continue;
    const lines = presetLines(presetId, piece.id as 'espalda' | 'delantero' | 'manga', bboxOf(piece.nodes));
    lines.forEach((points,index) => cuts.push({ id: `preset-${presetId}-${piece.id}-${index + 1}`, pieceId: piece.id, points, allowance, baseHash: pieceGeometryHash(piece) }));
  }
  if (!cuts.length) throw new Error('Esta distribución necesita las piezas de una chaqueta de hombro caído.');
  return cuts;
}
