import { buildFlat, type FlatDef, type FlatView, type FlatViewKey, type LegStyle } from './flats';
import type { Zone, ZoneType } from '../features/studio/model';
import { findSize } from '../lib/sizes/tables';
import { cmdsBBox, cmdsToSvg, pieceSeamCmds, transformCmds, polylineCmds } from '../lib/draw/paths';
import { parseSvgPath } from '../lib/draw/svgpath';
import type { BBox, Mat } from '../lib/geom/vec';
import type { Piece } from '../lib/pattern/types';
import { generateStreetStyle, isHoodieStyle, streetDefaults, streetPieceSource, STREET_STYLES, type StreetStyle } from '../lib/pattern/generators/streetStyles';
import type { GeneratorContext } from '../lib/pattern/generator';

export interface StreetSurface { zoneId: string; pieceId: string; mirror: boolean }
export const STREET_SURFACE_PIECES: Record<string, Partial<Record<FlatViewKey, StreetSurface[]>>> = {};
const cache = new Map<string, FlatView[]>();
const bounds = (p: Piece) => cmdsBBox(pieceSeamCmds(p));
const path = (p: Piece, m: Mat) => cmdsToSvg(transformCmds(pieceSeamCmds(p), m));
const rect = (x: number, y: number, w: number, h: number) => cmdsToSvg(polylineCmds([{ x, y }, { x: x + w, y }, { x: x + w, y: y + h }, { x, y: y + h }], true));
function projection(a: BBox, b: BBox, mirror = false): Mat {
  const sx = (mirror ? -1 : 1) * (b.maxX - b.minX) / (a.maxX - a.minX), sy = (b.maxY - b.minY) / (a.maxY - a.minY);
  return [sx, 0, 0, sy, (mirror ? b.maxX : b.minX) - a.minX * sx, b.minY - a.minY * sy];
}

/** Real panel outlines share a projection, so their seams meet exactly. The
 * drawing is a two-dimensional placement reference, never a drape simulation. */
export function buildStreetStyleFlat(id: string, key: string): FlatDef {
  if (cache.has(key)) return { id, views: cache.get(key)! };
  if (!STREET_STYLES.some(([s]) => s === key)) return { id, views: [] };
  const style = key as StreetStyle, hoodie = isHoodieStyle(style);
  const ctx: GeneratorContext = { body: findSize('ref-mujer-busto', 'M92')!.values, kind: 'mujer', fabric: hoodie ? 'punto' : 'plano', stretch: 20, fit: 'holgado' };
  const generated = generateStreetStyle(style, ctx), params = streetDefaults(style, ctx);
  const byId = (id: string) => generated.pieces.find(p => p.id === id);
  const sourcePieces = (id: string) => generated.pieces.filter(p => streetPieceSource(p) === id);
  const bindings: Partial<Record<FlatViewKey, StreetSurface[]>> = {};
  const views: FlatView[] = (['frente', 'espalda'] as const).map(side => {
    const back = side === 'espalda', zones: Zone[] = [], details: FlatView['details'] = [];
    bindings[side] = [];
    const add = (p: Piece, zoneId: string, d: string, type: ZoneType, mirror = false) => {
      zones.push({ id: zoneId, label: p.name, type, d }); bindings[side]!.push({ zoneId, pieceId: p.id, mirror });
    };
    if (hoodie) {
      const width = (Math.max(ctx.body.pecho!, ctx.body.cadera!) + Number(params.holgura)) / 2, height = Number(params.largo), arm = Number(params.profundidadSisa);
      const base = back ? 'espalda' : 'delantero';
      for (const p of sourcePieces(base)) add(p, p.id, path(p, [1, 0, 0, 1, -width / 2, 0]), back ? 'espalda' : 'delantero');
      const sleeve = byId('manga');
      if (sleeve) {
        const L = Number(params.largoManga) - (style === 'hoodie-globo' ? 65 : 0), cuff = Number(params.anchoPuno) / 2, endY = L * .9 + arm * .15, reach = style === 'hoodie-poncho' ? L * .9 : L * .35;
        for (const sign of [-1, 1]) {
          const shoulder = sign * width / 2, outer = sign * (width / 2 + reach), inner = outer - sign * cuff;
          const d = cmdsToSvg(polylineCmds([{ x: shoulder, y: 0 }, { x: outer, y: endY }, { x: inner, y: endY + 20 }, { x: shoulder, y: arm }], true));
          add(sleeve, `manga--${sign}`, d, 'manga', sign > 0);
          const band = byId('puno-globo');
          if (band) add(band, `puno-globo--${sign}`, rect(Math.min(outer, inner), endY, Math.abs(outer - inner), 65), 'puno', sign > 0);
        }
      }
      const hood = byId('capucha');
      if (hood) {
        const half = 128, top = -205;
        const d = `M${-half} 12 C-170 -120 -105 ${top} 0 ${top} C105 ${top} 170 -120 ${half} 12 L0 ${back ? 45 : 95} Z`;
        add(hood, 'capucha', d, 'capucha');
        details.push({ d: back ? `M0 ${top} L0 40` : `M0 95 C-68 30 -110 -60 -65 -155 C-30 -185 30 -185 65 -155 C110 -60 68 30 0 95`, style: 'costura' });
      }
      const flounce = byId('peplum');
      if (flounce) {
        const h = Number(params.altoVolante), w = width * 1.14;
        add(flounce, 'peplum', cmdsToSvg(polylineCmds([{ x: -width / 2, y: height }, { x: width / 2, y: height }, { x: w / 2, y: height + h }, { x: -w / 2, y: height + h }], true)), back ? 'espalda' : 'delantero');
        for (let x = -width / 2 + 25; x < width / 2; x += 35) details.push({ d: `M${x} ${height} L${x * 1.1} ${height + h * .7}`, style: 'pliegue' });
      }
      const pocket = byId('canguro');
      if (pocket && !back) { const b = bounds(pocket); add(pocket, 'canguro', path(pocket, [1, 0, 0, 1, -(b.maxX - b.minX) / 2, height - (b.maxY - b.minY) - 65]), 'bolsillo'); }
      if (style.includes('cierre') && !back) details.push({ d: `M0 ${params.escoteDelante} L0 ${height}`, style: 'costura' });
    } else {
      // The complete silhouettes provide the placement envelope. Each panel is
      // projected from the same physical reference frame, including its joins.
      const leg: LegStyle = style === 'pantalon-cargo-slim' ? 'pitillo' : ['pantalon-setentas', 'pantalon-bootcut', 'pantalon-culotte'].includes(style) ? 'acampanado' : ['pantalon-palazzo', 'pantalon-costura-frontal'].includes(style) ? 'palazzo' : ['pantalon-paperbag', 'pantalon-patchwork'].includes(style) ? 'ancho' : 'recto';
      const basic = buildFlat('street-reference', { family: 'pantalon', pants: { leg, length: style === 'pantalon-culotte' ? 'capri' : 'largo', waist: style === 'pantalon-paperbag' ? 'elastica' : 'pretina', pockets: 'ninguno' } }).views.find(v => v.key === side)!;
      const base = back ? 'trasero' : 'delantero', pieces = sourcePieces(base);
      const allBounds = cmdsBBox(pieces.flatMap(pieceSeamCmds));
      for (const [index, target] of basic.zones.filter(z => z.type === 'pierna').entries()) {
        const targetBounds = cmdsBBox(parseSvgPath(target.d)), m = projection(allBounds, targetBounds, index === 1);
        for (const p of pieces) add(p, `${p.id}--${index + 1}`, pieces.length > 1 ? path(p, m) : target.d, 'pierna', index === 1);
      }
      const band = byId('pretina');
      if (band) { const target = basic.zones.find(z => z.id === 'pretina')!; add(band, 'pretina', target.d, 'pretina'); }
      const yoke = byId('canesu');
      if (yoke && back) for (const sign of [-1, 1]) add(yoke, `canesu--${sign}`, `M0 38 L${sign * 225} 38 L${sign * 255} 100 L0 120 Z`, 'canesu', sign === 1);
      if (style === 'pantalon-paperbag') {
        const source = pieces[0]; add(source, 'cintura-paperbag', rect(-247, 0, 494, 45), 'pretina');
        const belt = byId('cinturon-paperbag'); if (belt) add(belt, 'cinturon-paperbag', rect(-247, 25, 494, 30), 'pretina');
        for (let x = -225; x < 247; x += 24) details.push({ d: `M${x} 0 L${x + 3} 25`, style: 'pliegue' });
      }
      const pocket = byId(back ? 'bolsillo-trasero' : 'bolsillo-cargo');
      if (pocket) for (const sign of [-1, 1]) {
        const target: BBox = back ? { minX: sign < 0 ? -195 : 55, maxX: sign < 0 ? -55 : 195, minY: 125, maxY: 275 } : { minX: sign < 0 ? -265 : 125, maxX: sign < 0 ? -125 : 265, minY: 430, maxY: 620 };
        add(pocket, `${pocket.id}--${sign}`, path(pocket, projection(bounds(pocket), target, sign > 0)), 'bolsillo', sign > 0);
        const flap = byId('cartera'); if (flap && !back) add(flap, `cartera--${sign}`, rect(target.minX, target.minY - 15, 140, 45), 'bolsillo', sign > 0);
      }
      if (!back) {
        const pocket = byId('bolsillo-herramientas'); if (pocket) add(pocket, pocket.id, path(pocket, projection(bounds(pocket), { minX: -220, maxX: -145, minY: 330, maxY: 550 })), 'bolsillo');
        const loop = byId('trabilla-martillo'); if (loop) add(loop, loop.id, rect(230, 295, 40, 110), 'otra');
        const reinforcement = byId('refuerzo-rodilla'); if (reinforcement) for (const sign of [-1, 1]) add(reinforcement, `refuerzo--${sign}`, rect(sign < 0 ? -230 : 70, 390, 160, 360), 'otra', sign > 0);
      }
      details.push(...basic.details.filter(d => !d.d.includes('M-14') && !d.d.includes('M14')));
    }
    const b = cmdsBBox(zones.flatMap(z => parseSvgPath(z.d)));
    return { key: side, zones, details, dots: [], minX: b.minX - 25, minY: b.minY - 25, width: b.maxX - b.minX + 50, height: b.maxY - b.minY + 50, refY: 0, refLabel: hoodie ? 'Hombro' : 'Cintura', seams: { center: 0 } };
  });
  STREET_SURFACE_PIECES[`street-${style}`] = bindings; cache.set(style, views);
  return { id, views };
}
