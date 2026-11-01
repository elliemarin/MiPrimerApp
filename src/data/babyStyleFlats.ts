import type { FlatDef, FlatView, FlatViewKey } from './flats';
import type { Zone, ZoneType } from '../features/studio/model';
import type { KidsSurface } from './kidsFlats';
import { buildKidsFlat } from './kidsFlats';
import { BABY_STYLES, generateBabyStyle, type BabyStyle } from '../lib/pattern/generators/babyStyles';
import { generateBabyBodysuit } from '../lib/pattern/generators/babyBodysuit';
import { findSize } from '../lib/sizes/tables';
import type { Piece } from '../lib/pattern/types';
import { cmdsBBox, cmdsToSvg, pieceSeamCmds, polylineCmds, transformCmds } from '../lib/draw/paths';
import { cmdsToPolylines } from '../lib/draw/flatten';
import { intersectPolygons } from '../lib/geom/polyoffset';
import { parseSvgPath } from '../lib/draw/svgpath';
import { matApply, type Mat } from '../lib/geom/vec';

/** Each visible zone binds to a real cutting piece, never a stock silhouette. */
export const BABY_STYLE_SURFACE_PIECES: Record<string, Partial<Record<FlatViewKey, KidsSurface[]>>> = {};
const cache = new Map<string, FlatDef>();
const I: Mat = [1, 0, 0, 1, 0, 0];
const rect = (x: number, y: number, w: number, h: number) => `M${x} ${y} L${x + w} ${y} L${x + w} ${y + h} L${x} ${y + h} Z`;
const box = (p: Piece) => cmdsBBox(pieceSeamCmds(p));

export function buildBabyStyleFlat(style: string): FlatDef {
  if (cache.has(style)) return structuredClone(cache.get(style)!);
  const item = BABY_STYLES.find(s => s[0] === style);
  if (!item) return { id: style, views: [] };
  const knit = style.startsWith('bebe-body-') || style === 'bebe-cardigan-pico' || style === 'bebe-pantalon-punos-extensibles';
  const ctx = { body: findSize('ref-bebe-meses', 'B0-3')!.values, kind: 'bebe' as const, fabric: knit ? 'punto' as const : 'plano' as const, stretch: knit ? 30 : 0, fit: 'regular' as const };
  const r = generateBabyStyle(style as BabyStyle, ctx, {}), kind = item[2];
  const get = (id: string) => r.pieces.find(p => p.id === id);
  const views: FlatView[] = [];
  BABY_STYLE_SURFACE_PIECES[style] = {};
  for (const key of ['frente', 'espalda'] as const) {
    const back = key === 'espalda', zones: Zone[] = [], details: FlatView['details'] = [], dots: FlatView['dots'] = [], bindings: KidsSurface[] = [];
    const bind = (zoneId: string, pieceId: string, mirror = false, fold = false) => bindings.push({ zoneId, pieceId, mirror, fold });
    const add = (p: Piece, id = p.id, type: ZoneType = back ? 'espalda' : 'delantero', m: Mat = I, fold = p.cut.onFold, mirror = m[0] < 0) => {
      let commands = pieceSeamCmds(p);
      if (kind === 'body' && /^delantero(?:-|$)/.test(p.id)) {
        const b = cmdsBBox(commands), polygons = cmdsToPolylines(commands, .1).filter(poly => poly.closed).map(poly => poly.pts);
        commands = intersectPolygons(polygons, [[{ x: 0, y: b.minY - 1 }, { x: b.maxX + 1, y: b.minY - 1 }, { x: b.maxX + 1, y: b.maxY + 1 }, { x: 0, y: b.maxY + 1 }]]).flatMap(poly => polylineCmds(poly, true));
      }
      let d = cmdsToSvg(transformCmds(commands, m));
      if (fold) d += ' ' + cmdsToSvg(transformCmds(commands, [-m[0], m[1], -m[2], m[3], m[4], m[5]]));
      zones.push({ id, label: p.name, type, d }); bind(id, p.id, mirror, fold);
      for (const mark of p.marks.filter(mark => mark.kind === 'boton')) { const at = matApply(m, mark.at); dots.push({ ...at, r: 2.7 }); if (fold) dots.push({ x: -at.x, y: at.y, r: 2.7 }); }
      return d;
    };
    const custom = (p: Piece | undefined, id: string, type: ZoneType, d: string, mirror = false, fold = false) => { if (p) { zones.push({ id, label: p.name, type, d }); bind(id, p.id, mirror, fold); } };
    const sleeve = get('manga');
    if (kind === 'body' || kind === 'top') {
      const smock = style === 'bebe-babero-mangas', physicalBack = smock ? !back : back;
      const coreId = physicalBack ? 'espalda' : 'delantero', core = get(coreId) ?? get(`${coreId}-canesu`)!;
      const corePieces = r.pieces.filter(p => p.id === coreId || p.id === `${coreId}-canesu` || p.id === `${coreId}-base`);
      const bodyFront = kind === 'body', front = get('delantero') ?? (bodyFront ? generateBabyBodysuit(ctx, {}).pieces.find(p => p.id === 'delantero')! : get('delantero-canesu')!);
      const torsoWidth = Math.max(...corePieces.flatMap(p => p.nodes.map(n => n.x)));
      const half = bodyFront && physicalBack ? torsoWidth / 2 : torsoWidth;
      for (const pc of corePieces) {
        if (bodyFront && physicalBack) add(pc, pc.id, 'espalda', [1, 0, 0, 1, -half, 0], false);
        else if (pc.cut.onFold) add(pc);
        else for (const sign of [-1, 1]) add(pc, `${pc.id}--${sign === -1 ? 1 : 2}`, physicalBack ? 'espalda' : 'delantero', [sign, 0, 0, 1, 0, 0], false, sign < 0);
      }
      const shoulderNode = kind === 'body' ? front.nodes.find(n => n.id === 'n2') : front.nodes.find(n => n.id === 'n2');
      const shoulder = shoulderNode?.x ?? half * .8, shoulderY = shoulderNode?.y ?? 0;
      const arm = kind === 'body' ? (front.nodes.find(n => n.id === 'n3')?.y ?? 80) : front.nodes.find(n => n.id === 'n4')?.y ?? 110;
      if (sleeve) {
        const sb = box(sleeve), L = kind === 'body' ? sb.maxX - sb.minX : sb.maxY - sb.minY, width = kind === 'body' ? (sb.maxY - sb.minY) * .3 : (sb.maxX - sb.minX) * .35;
        for (const sign of [-1, 1]) {
          const x = sign * (half + L * .58), y = shoulderY + L * .82;
          let d: string;
          if (kind === 'body') {
            const cuff = Math.abs(sleeve.nodes[2].y - sleeve.nodes[1].y), ox = sign * (half + L * .82), cy = arm / 2 + L * .57;
            d = `M${sign * half} 0 L${ox} ${cy - cuff / 4} L${ox} ${cy + cuff / 4} L${sign * half} ${arm} Z`;
          } else {
            const armSource = core, upper = armSource.edges.find(e => e.id === 'sisa-superior')!, lower = armSource.edges.find(e => e.id === 'sisa-inferior')!;
            const at = (id: string) => armSource.nodes.find(n => n.id === id)!;
            const reverse = [lower, upper].map(e => { const to = at(e.from); return e.kind === 'cubic' ? `C${sign * e.c2!.x} ${e.c2!.y} ${sign * e.c1!.x} ${e.c1!.y} ${sign * to.x} ${to.y}` : `L${sign * to.x} ${to.y}`; }).join(' ');
            const axilla = at(lower.to), shoulderAt = at(upper.from);
            d = `M${sign * shoulderAt.x} ${shoulderAt.y} L${x + sign * width * .35} ${y - width * .25} L${x - sign * width * .65} ${y + width * .25} L${sign * axilla.x} ${axilla.y} ${reverse} Z`;
          }
          custom(sleeve, `manga--${sign < 0 ? 1 : 2}`, 'manga', d, sign < 0);
        }
      }
      const flutter = get('volante-sisa');
      if (flutter) for (const sign of [-1, 1]) custom(flutter, `volante-sisa--${sign < 0 ? 1 : 2}`, 'otra', `M${sign * shoulder} ${shoulderY} Q${sign * (half + 60)} ${arm * .25} ${sign * (half + 36)} ${arm * .72} Q${sign * (half + 12)} ${arm * .85} ${sign * half} ${arm * .7} L${sign * shoulder} ${shoulderY} Z`, sign < 0);
      const skirt = get(back ? 'falda-trasera' : 'falda-delantera');
      if (skirt) {
        const y = (get(coreId) ?? core).lines.find(l => l.id === 'colocacion-falda')?.a.y ?? 150, h = box(skirt).maxY;
        if (skirt.cut.onFold) custom(skirt, skirt.id, back ? 'espalda' : 'delantero', `M${-half} ${y} L${half} ${y} L${half * 1.35} ${y + h} Q0 ${y + h + 12} ${-half * 1.35} ${y + h} Z`, false, true);
        else for (const sign of [-1, 1]) custom(skirt, `${skirt.id}--${sign < 0 ? 1 : 2}`, 'delantero', `M${sign * 8} ${y} L${sign * half} ${y} L${sign * half * 1.35} ${y + h} L${sign * 8} ${y + h} Z`, sign < 0);
        for (let x = -half + 20; x < half; x += 30) details.push({ d: `M${x} ${y + 3} L${x * 1.25} ${y + h - 12}`, style: 'pliegue' });
      }
      const peplum = get(`peplum-${coreId}`);
      if (peplum) {
        const y = Math.max(...core.nodes.map(n => n.y)), h = box(peplum).maxY;
        if (physicalBack) custom(peplum, peplum.id, 'espalda', `M${-half} ${y} L${half} ${y} L${half * 1.4} ${y + h} L${-half * 1.4} ${y + h} Z`, false, true);
        else for (const sign of [-1, 1]) custom(peplum, `${peplum.id}--${sign < 0 ? 1 : 2}`, 'delantero', `M0 ${y} L${sign * half} ${y} L${sign * half * 1.4} ${y + h} L0 ${y + h} Z`, sign < 0);
      }
    } else if (kind === 'peto') {
      const coreId = back ? 'espalda' : 'delantero', core = get(coreId) ?? get(`${coreId}-canesu`)!;
      for (const pc of r.pieces.filter(p => [coreId, `${coreId}-canesu`, `${coreId}-base`].includes(p.id))) add(pc);
      const strap = get('tirante')!, half = Math.max(...core.nodes.map(n => n.x)), start = Math.min(...core.nodes.map(n => n.y)), sw = box(strap).maxY / 2;
      const strapAnchor = ctx.body.pecho! * .16 - sw * .5;
      for (const sign of [-1, 1]) custom(strap, `tirante--${sign < 0 ? 1 : 2}`, 'otra', rect(sign * strapAnchor - sw / 2, start - 55, sw, 65), sign < 0);
      const skirt = get(back ? 'falda-trasera' : 'falda-delantera');
      if (skirt) { const y = core.lines.find(l => l.id === 'colocacion-falda')?.a.y ?? 90, h = box(skirt).maxY; custom(skirt, skirt.id, back ? 'espalda' : 'delantero', `M${-half} ${y} L${half} ${y} L${half * 1.15} ${y + h} L${-half * 1.15} ${y + h} Z`, false, true); }
      if (!back && get('bolsillo-cargo')) {
        const pocket = get('bolsillo-cargo')!, flap = get('solapa-cargo')!, pb = box(pocket), pos = core.lines.find(l => l.id === 'bolsillo-cargo')!.a;
        for (const sign of [-1, 1]) { const w = pb.maxX - 24, h = pb.maxY - 12, x = sign * (pos.x + w / 2) - w / 2; custom(pocket, `bolsillo-cargo--${sign < 0 ? 1 : 2}`, 'bolsillo', rect(x, pos.y, w, h), sign < 0); custom(flap, `solapa-cargo--${sign < 0 ? 1 : 2}`, 'otra', rect(x - 3, pos.y - 5, w + 6, 25), sign < 0); }
      }
    } else if (kind === 'pantalon') {
      const sourceId = back ? 'trasero' : 'delantero', parts = r.pieces.filter(p => [sourceId, `${sourceId}-base`, `${sourceId}-lateral`].includes(p.id));
      const first = parts[0], center = first.nodes.find(n => n.id === 'cintura-centro')?.x ?? Math.max(...parts.flatMap(p => p.nodes.map(n => n.x)));
      const crotch = parts.flatMap(p => p.nodes).find(n => n.id === 'tiro-punta')!;
      // A sewn crotch turns into depth. Project that extension onto the centre
      // seam instead of overlapping the two physical flat leg pieces.
      const innerPart = parts.find(p => p.edges.some(e => e.id === 'tiro'))!, neck = innerPart.nodes.find(n => n.id === 'cintura-centro')!, start = innerPart.nodes.find(n => n.id === 'tiro-inicio')!, curve = innerPart.edges.find(e => e.id === 'tiro')!;
      const cubic = (a: number, b: number, c: number, d: number, t: number) => (1 - t) ** 3 * a + 3 * (1 - t) ** 2 * t * b + 3 * (1 - t) * t * t * c + t ** 3 * d;
      const centerAt = (y: number) => {
        if (y <= start.y) return neck.x + (start.x - neck.x) * Math.max(0, Math.min(1, (y - neck.y) / (start.y - neck.y)));
        if (y >= crotch.y) return crotch.x;
        let lo = 0, hi = 1;
        for (let i = 0; i < 24; i++) { const t = (lo + hi) / 2; if (cubic(start.y, curve.c1!.y, curve.c2!.y, crotch.y, t) < y) lo = t; else hi = t; }
        return cubic(start.x, curve.c1!.x, curve.c2!.x, crotch.x, (lo + hi) / 2);
      };
      const project = (x: number, y: number, sign: number) => ({ x: sign * (centerAt(y) - x), y });
      for (const p of parts) for (const sign of [-1, 1]) {
        const commands = pieceSeamCmds(p).map((cmd, index) => {
          if (cmd.op === 'Z') return cmd;
          const e = p.edges[index - 1];
          if (e && ['centro', 'tiro'].includes(e.id)) return { op: 'L' as const, p: { x: 0, y: cmd.p.y } };
          return cmd.op === 'C' ? { ...cmd, p: project(cmd.p.x, cmd.p.y, sign), c1: project(cmd.c1.x, cmd.c1.y, sign), c2: project(cmd.c2.x, cmd.c2.y, sign) } : { ...cmd, p: project(cmd.p.x, cmd.p.y, sign) };
        });
        custom(p, `${p.id}--${sign < 0 ? 1 : 2}`, 'pierna', cmdsToSvg(commands), sign > 0);
      }
      const lower = Math.max(...parts.flatMap(p => p.nodes.map(n => n.y))), cuff = get('puno');
      if (cuff) for (const sign of [-1, 1]) { const cb = box(cuff), w = cb.maxX / 2, hemNodes = parts.flatMap(p => p.nodes).filter(n => n.id === 'bajo-ext' || n.id === 'bajo-int'), hx = hemNodes.reduce((sum, n) => sum + n.x, 0) / hemNodes.length, x = project(hx, lower, sign).x - w / 2; custom(cuff, `puno--${sign < 0 ? 1 : 2}`, 'puno', rect(x, lower, w, cb.maxY / 4), sign < 0); details.push({ d: `M${x} ${lower + cb.maxY / 4 - 4} L${x + w} ${lower + cb.maxY / 4 - 4}`, style: 'doblez' }); }
      const pad = get('rodillera');
      if (pad && !back) { const mark = first.marks.find(m => m.id === 'centro-rodillera')!, pb = box(pad); for (const sign of [-1, 1]) add(pad, `rodillera--${sign < 0 ? 1 : 2}`, 'otra', [1, 0, 0, 1, project(mark.at.x, mark.at.y, sign).x - pb.maxX / 2, mark.at.y - pb.maxY / 2], false, sign < 0); }
      const top = Math.min(...parts.flatMap(p => p.nodes.map(n => n.y)));
      details.push({ d: `M${-center} ${top + 8} L${center} ${top + 8}`, style: 'pespunte' });
    } else if (kind === 'poncho') {
      const pc = get(back ? 'espalda' : 'delantero')!;
      if (back) { const b = box(pc); add(pc, pc.id, 'espalda', [1, 0, 0, 1, -(b.maxX + b.minX) / 2, 0], false); }
      else for (const sign of [-1, 1]) { add(pc, `delantero--${sign < 0 ? 1 : 2}`, 'delantero', [sign, 0, 0, 1, 0, 0], false, sign < 0); const placket = get('tapeta')!, y = pc.nodes[0].y; custom(placket, `tapeta--${sign < 0 ? 1 : 2}`, 'otra', rect(sign < 0 ? -20 : 0, y, 20, box(placket).maxY), sign < 0); }
    } else {
      if (back) continue;
      const original = buildKidsFlat('bonete', 'bonete').views[0];
      zones.push(...original.zones); details.push(...original.details); dots.push(...original.dots);
      for (const zone of original.zones) if (get(zone.id)) bind(zone.id, zone.id);
      const vb = cmdsBBox(original.zones.flatMap(z => parseSvgPath(z.d))), visor = get('visera')!;
      const w = vb.maxX - vb.minX, y = vb.minY + (vb.maxY - vb.minY) * .22;
      custom(visor, 'visera', 'otra', `M${vb.minX} ${y} Q${vb.minX - w * .2} ${y - 48} ${vb.maxX} ${y - 35} Q${vb.maxX + w * .1} ${y} ${vb.maxX - w * .1} ${y + 18} Q${vb.minX + w * .4} ${y - 5} ${vb.minX} ${y} Z`);
    }
    if (!zones.length) continue;
    const b = cmdsBBox(zones.flatMap(z => parseSvgPath(z.d)));
    views.push({ key, zones, details, dots, minX: b.minX - 20, minY: b.minY - 20, width: b.maxX - b.minX + 40, height: b.maxY - b.minY + 40, refY: 0, refLabel: kind === 'pantalon' ? 'Cintura' : 'Hombro', seams: { center: 0 } });
    BABY_STYLE_SURFACE_PIECES[style][key] = bindings;
  }
  const result = { id: style, views }; cache.set(style, result); return structuredClone(result);
}

// Bindings are available to material targets before a card is rendered.
for (const [id] of BABY_STYLES) buildBabyStyleFlat(id);
