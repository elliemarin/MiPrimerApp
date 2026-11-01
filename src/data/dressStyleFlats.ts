import type { FlatDef, FlatView, FlatViewKey } from './flats';
import type { Zone } from '../features/studio/model';
import type { Piece } from '../lib/pattern/types';
import { findSize } from '../lib/sizes/tables';
import { cmdsBBox, cmdsToSvg, pieceSeamCmds, transformCmds, type PathCmd } from '../lib/draw/paths';
import { parseSvgPath } from '../lib/draw/svgpath';
import { nodeById } from '../lib/pattern/outline';
import { adultDressGeometry, adultDressStyle, generateAdultDress, type DressStyle } from '../lib/pattern/generators/dressStyles';
import type { GeneratorContext } from '../lib/pattern/generator';
import type { Mat, Pt } from '../lib/geom/vec';

interface Surface { zoneId: string; pieceId: string; mirror: boolean; fold?: boolean }
const S = (zoneId: string, pieceId = zoneId, mirror = false, fold = false): Surface => ({ zoneId, pieceId, mirror, fold });
const paired = (id: string): Surface[] => [S(`${id}--1`, id, true), S(`${id}--2`, id)];
const baseBindings = (back: boolean): Surface[] => {
  const body = back ? 'espalda' : 'delantero', skirt = back ? 'falda-espalda' : 'falda-delantera';
  return [S(body, body, false, true), ...paired(body), ...paired('manga'), ...paired(`volante-${body}`),
    ...[1, 2, 3].flatMap(i => [S(`${skirt}-${i}`, `${skirt}-${i}`, false, true), ...paired(`${skirt}-${i}`)])];
};
/** Fold bindings split the two physical halves, never duplicate decorations. */
export const DRESS_STYLE_SURFACE_PIECES: Record<string, Partial<Record<FlatViewKey, Surface[]>>> = {
  'vestido-estilos-adulto': { frente: baseBindings(false), espalda: baseBindings(true) }
};
const P = (x: number, y: number): Pt => ({ x, y });
const I: Mat = [1, 0, 0, 1, 0, 0];
const mirror: Mat = [-1, 0, 0, 1, 0, 0];
const fixed = (n: number) => Math.round(n * 10) / 10;
const polygon = (pts: Pt[]) => pts.map((p, i) => `${i ? 'L' : 'M'}${fixed(p.x)} ${fixed(p.y)}`).join(' ') + ' Z';
const zone = (id: string, label: string, type: Zone['type'], d: string): Zone => ({ id, label, type, d });

function unfolded(piece: Piece): string {
  const at = (id: string) => { const p = nodeById(piece, id); return P(p.x, p.y); }, flip = (p: Pt) => P(-p.x, p.y);
  const fold = piece.edges.findIndex(edge => edge.finish === 'doblez'), edges = [...piece.edges.slice(fold + 1), ...piece.edges.slice(0, fold)];
  const cmds: PathCmd[] = [{ op: 'M', p: at(piece.edges[fold].to) }];
  for (const e of edges) cmds.push(e.kind === 'cubic' ? { op: 'C', c1: e.c1!, c2: e.c2!, p: at(e.to) } : { op: 'L', p: at(e.to) });
  for (const e of [...edges].reverse()) cmds.push(e.kind === 'cubic' ? { op: 'C', c1: flip(e.c2!), c2: flip(e.c1!), p: flip(at(e.from)) } : { op: 'L', p: flip(at(e.from)) });
  cmds.push({ op: 'Z' });
  return cmdsToSvg(cmds);
}
function bodyZones(piece: Piece, back: boolean): Zone[] {
  const type = back ? 'espalda' : 'delantero', label = back ? 'Espalda' : 'Delantero';
  return piece.cut.onFold ? [zone(piece.id, label, type, unfolded(piece))] :
    [zone(`${piece.id}--1`, `${label}, mitad izquierda de la vista`, type, cmdsToSvg(transformCmds(pieceSeamCmds(piece), mirror))),
      zone(`${piece.id}--2`, `${label}, mitad derecha de la vista`, type, cmdsToSvg(transformCmds(pieceSeamCmds(piece), I)))];
}
function boundsView(key: FlatViewKey, zones: Zone[], details: FlatView['details'], dots: FlatView['dots'], q: number): FlatView {
  const b = cmdsBBox(parseSvgPath(zones.map(zone => zone.d).join(' ')));
  return { key, zones, details, dots, minX: b.minX - 25, minY: b.minY - 25, width: b.maxX - b.minX + 50, height: b.maxY - b.minY + 50, refY: 0, refLabel: 'Hombro', seams: { left: -q, right: q, center: 0 } };
}
const cached = new Map<string, FlatView[]>();

export function buildDressStyleFlat(id: string, styleId: string): FlatDef {
  let views = cached.get(styleId);
  if (!views) {
    const style = adultDressStyle(styleId);
    if (!style) return { id, views: [] };
    views = makeViews(style);
    cached.set(styleId, views);
  }
  return { id, views };
}
function makeViews(style: DressStyle): FlatView[] {
  const ctx: GeneratorContext = { body: findSize('ref-mujer-busto', 'M92')!.values, kind: 'mujer', fabric: 'plano', stretch: 0, fit: 'holgado' };
  const params = { estilo: style.id, largo: 1640 * style.length, holgura: style.wide ? 360 : 140, fruncido: 1.5 };
  const result = generateAdultDress(ctx, params), g = adultDressGeometry(ctx, params);
  const piece = (id: string) => result.pieces.find(piece => piece.id === id)!;
  if (!result.pieces.length) return [];
  return (['frente', 'espalda'] as const).map(key => {
    const back = key === 'espalda', body = back ? 'espalda' : 'delantero';
    const zones = bodyZones(piece(body), back), details: FlatView['details'] = [], dots: FlatView['dots'] = [];
    if (back && !style.buttons) {
      const opening = piece(body).edges.find(edge => edge.id === 'abertura')!;
      const y0 = nodeById(piece(body), opening.to).y, y1 = nodeById(piece(body), opening.from).y;
      details.push({ d: `M0 ${y0} L0 ${g.bodyHeight}`, style: 'costura' });
      details.push({ d: `M-3 ${y0} L-3 ${y1}`, style: 'pespunte' });
      dots.push({ x: -8, y: y0 + 12, r: 5 });
    }
    if (!back && style.buttons) {
      details.push({ d: `M-15 ${piece(body).nodes[0].y} L-15 ${g.length}`, style: 'pespunte' });
      for (let y = piece(body).nodes[0].y + 25; y < g.length - 25; y += 90) dots.push({ x: 0, y, r: 5 });
    }
    let y = g.bodyHeight, visibleWidth = g.hemWidth;
    for (let i = 0; i < style.tiers; i++) {
      const skirtId = `${back ? 'falda-espalda' : 'falda-delantera'}-${i + 1}`;
      const h = g.lowerHeights[i], lowerW = style.cut === 'paneles' ? g.lowerWidths[i] : visibleWidth * 1.16;
      const pts = [P(-visibleWidth, y), P(visibleWidth, y), P(lowerW, y + h), P(-lowerW, y + h)];
      if (!back && style.buttons) {
        zones.push(zone(`${skirtId}--1`, `Falda delantera ${i + 1}, mitad izquierda`, 'otra', polygon([P(15, y), P(-visibleWidth, y), P(-lowerW, y + h), P(15, y + h)])),
          zone(`${skirtId}--2`, `Falda delantera ${i + 1}, mitad derecha`, 'otra', polygon([P(-15, y), P(visibleWidth, y), P(lowerW, y + h), P(-15, y + h)])));
      } else zones.push(zone(skirtId, `Paño ${back ? 'trasero' : 'delantero'} ${i + 1}`, 'otra', polygon(pts)));
      details.push({ d: `M${-visibleWidth} ${y} L${visibleWidth} ${y}`, style: 'costura' });
      if (style.cut !== 'paneles') for (let j = 1; j < 15; j++) {
        const x = -visibleWidth + visibleWidth * 2 * j / 15;
        details.push({ d: `M${fixed(x)} ${fixed(y + 3)} L${fixed(x * 1.04)} ${fixed(y + Math.min(h * .23, 45))}`, style: 'pliegue' });
      }
      visibleWidth = lowerW; y += h;
    }
    if (style.sleeve === 'corta' || style.sleeve === 'campana') {
      const L = style.sleeve === 'campana' ? 360 : 180, bell = style.sleeve === 'campana';
      for (const [i, sign] of [-1, 1].entries()) {
        const sleeve = [P(sign * g.q, 0), P(sign * (g.q + 85), L * .35), P(sign * (g.q + (bell ? 190 : 85)), L + g.arm * .4), P(sign * (g.q + (bell ? 10 : 10)), L + g.arm * .5), P(sign * g.q, g.arm)];
        zones.push(zone(`manga--${i + 1}`, `Manga ${sign < 0 ? 'izquierda' : 'derecha'} de la vista`, 'manga', polygon(sleeve)));
        details.push({ d: `M${fixed(sign * (g.q + (bell ? 180 : 80)))} ${fixed(L + g.arm * .4 - 12)} L${fixed(sign * (g.q + 14))} ${fixed(L + g.arm * .5 - 12)}`, style: 'pespunte' });
      }
    } else if (style.sleeve === 'volante') {
      for (const [i, sign] of [-1, 1].entries()) {
        const X = (x: number) => fixed(sign * x), q = g.q, sh = g.shoulder;
        const d = `M${X(sh)} 22 C${X(sh + 90)} -5 ${X(q + 90)} 115 ${X(q + 95)} 190 Q${X(q + 75)} 245 ${X(q)} ${g.arm} C${X(q - 35)} ${g.arm} ${X(sh)} ${fixed(g.arm * .67)} ${X(sh)} 22 Z`;
        // Front and back ruffles are separate physical pieces. Using 'otra'
        // avoids splitting the short strip a second time as a mounted sleeve.
        zones.push(zone(`volante-${body}--${i + 1}`, `Volante de ${back ? 'espalda' : 'frente'}, lado ${i + 1}`, 'otra', d));
        for (let j = 0; j < 3; j++) details.push({ d: `M${X(sh + j * 14)} ${35 + j * 45} Q${X(q + 45)} ${65 + j * 45} ${X(q + 70)} ${115 + j * 35}`, style: 'pliegue' });
      }
    }
    details.push({ d: `M${fixed(-visibleWidth + 8)} ${fixed(g.length - 16)} L${fixed(visibleWidth - 8)} ${fixed(g.length - 16)}`, style: 'pespunte' });
    return boundsView(key, zones, details, dots, g.q);
  });
}
