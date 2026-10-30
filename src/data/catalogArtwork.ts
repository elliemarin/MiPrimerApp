import { buildFlat, type FlatSpec, type FlatView } from './flats';
import { garmentIllustrationView } from '../lib/draw/garmentComposition';
import { parseSvgPath } from '../lib/draw/svgpath';
import { cmdsToPolylines } from '../lib/draw/flatten';
import { bboxOf } from '../lib/geom/vec';

/** These are reference objects in a catalog photograph/illustration, never
 * additional textile pieces, appliqués, or zones stored in a design. */
export type CatalogSubject = 'portatil' | 'tableta' | 'telefono' | 'libro' | 'cuaderno' | 'lector' | 'lentes' | 'consola' | 'tarjetas' | 'pasaporte' | 'patrones' | 'bastidor' | 'cables' | 'muestrario' | 'plato' | 'taza' | 'bandeja' | 'maquina' | 'raton' | 'teclado' | 'florero' | 'marco';
export interface CatalogReference { subject: CatalogSubject; x: number; y: number; width: number; height: number }
export interface CatalogArtwork { view: FlatView; reference?: CatalogReference }

const sleeveSubjects: Record<string, CatalogSubject> = {
  laptop: 'portatil', portatil: 'portatil', tablet: 'tableta', tableta: 'tableta', telefono: 'telefono',
  libro: 'libro', agenda: 'libro', libreta: 'cuaderno', cuaderno: 'cuaderno', lector: 'lector', lentes: 'lentes',
  consola: 'consola', tarjetas: 'tarjetas', pasaporte: 'pasaporte', patrones: 'patrones', bastidor: 'bastidor', cables: 'cables', muestrario: 'muestrario'
};
const rectangularSubjects: Record<string, CatalogSubject> = {
  mesa: 'plato', desayuno: 'plato', individual: 'plato', plato: 'plato', posavasos: 'taza', taza: 'taza',
  bandeja: 'bandeja', maquina: 'maquina', raton: 'raton', escritorio: 'teclado', centro: 'florero', camino: 'florero',
  muestrario: 'muestrario', cuadro: 'marco', marcapaginas: 'libro'
};

/** Explicit construction/use aliases. Description text is intentionally ignored. */
export function catalogSubject(id: string, spec: FlatSpec): CatalogSubject | undefined {
  if (spec.accessory === 'funda-solapa') {
    const use = id.replace(/^coleccion-/, '').replace(/^funda-/, '').split('-')[0];
    return sleeveSubjects[use];
  }
  if (spec.accessory === 'rectangulo') {
    const use = id.replace(/^coleccion-reversible-/, '').replace(/^tapete-/, '').split('-')[0];
    return rectangularSubjects[use];
  }
}

function reframe(view: FlatView): FlatView {
  const points = [...view.zones, ...view.details].flatMap(item => cmdsToPolylines(parseSvgPath(item.d), 1).flatMap(line => line.pts));
  const bounds = bboxOf(points), pad = Math.max(bounds.maxX - bounds.minX, bounds.maxY - bounds.minY) * .045;
  return { ...view, minX: bounds.minX - pad, minY: bounds.minY - pad, width: bounds.maxX - bounds.minX + pad * 2, height: bounds.maxY - bounds.minY + pad * 2 };
}

const rounded = (w: number, h: number, r = Math.min(w, h) * .055) => `M${-w / 2 + r} 0 H${w / 2 - r} Q${w / 2} 0 ${w / 2} ${r} V${h - r} Q${w / 2} ${h} ${w / 2 - r} ${h} H${-w / 2 + r} Q${-w / 2} ${h} ${-w / 2} ${h - r} V${r} Q${-w / 2} 0 ${-w / 2 + r} 0 Z`;

/** A separate, immutable catalog composition. Physical placement continues to
 * use buildFlat; these draped illustrations never enter the pattern editor. */
export function catalogArtwork(id: string, spec: FlatSpec, original: FlatView): CatalogArtwork {
  let view: FlatView = { ...original, zones: original.zones.map(z => ({ ...z })), details: original.details.map(d => ({ ...d })), dots: original.dots.map(d => ({ ...d })) };
  const kind = spec.accessory, w = spec.object?.width ?? 260, h = spec.object?.height ?? 190;
  // The original legacy drawings include optional pockets that these two base
  // recipes do not cut. Do not advertise those optional extras on a catalog card.
  if (id === 'jogger' && spec.pants) view = buildFlat(id, { ...spec, pants: { ...spec.pants, pockets: 'ninguno' } }).views.find(v => v.key === original.key)!;
  if (spec.bag === 'tote') {
    const W = spec.object?.width ?? 380, H = spec.object?.height ?? 400;
    view.zones = view.zones.filter(zone => zone.type !== 'bolsillo').map(zone => ['delantero', 'espalda'].includes(zone.id) ? { ...zone, d: `M${-W / 2} 0 Q0 ${H * .035} ${W / 2} 0 L${W * .48} ${H * .86} Q${W * .47} ${H * .98} ${W * .36} ${H} H${-W * .36} Q${-W * .47} ${H * .98} ${-W * .48} ${H * .86} Z` } : zone);
    for (const sign of [-1, 1]) {
      view.details.push({ d: `M${sign * W * .47} ${H * .88} L${sign * W * .33} ${H * .92} L${sign * W * .36} ${H}`, style: 'costura' });
      view.details.push({ d: `M${sign * W * .32} ${H * .22} Q${sign * W * .42} ${H * .55} ${sign * W * .39} ${H * .79}`, style: 'pliegue' });
    }
  }
  if (['frente', 'espalda'].includes(original.key) && ['haori', 'cardigan', 'bluson'].includes(spec.top?.style ?? '')) {
    view = garmentIllustrationView(view, spec);
    const half = 300 * (spec.top?.fit ?? 1), length = spec.top!.length;
    for (const sign of [-1, 1]) view.details.push({ d: `M${sign * half * .8} ${length * .35} Q${sign * half * .68} ${length * .55} ${sign * half * .8} ${length * .85}`, style: 'pliegue' });
    view = reframe(view);
  }
  if (kind === 'funda-solapa' || kind === 'estuche-plano') {
    view.zones = view.zones.map(zone => zone.id === 'base' ? { ...zone, d: rounded(w, h) } : zone.id === 'solapa' ? { ...zone, d: `M${-w / 2 + w * .03} 0 H${w / 2 - w * .03} Q${w / 2} 0 ${w / 2} ${h * .05} L${w / 2} ${h * .18} Q${w * .15} ${h * .31} 0 ${h * .42} Q${-w * .15} ${h * .31} ${-w / 2} ${h * .18} V${h * .05} Q${-w / 2} 0 ${-w / 2 + w * .03} 0 Z` } : zone);
    view.details.push({ d: `M${-w * .42} ${h * .87} Q0 ${h * .96} ${w * .42} ${h * .88}`, style: 'pliegue' });
    if (kind === 'estuche-plano') {
      for (let x = -w * .45; x < w * .45; x += Math.max(6, w / 32)) view.details.push({ d: `M${x} 4 L${x + 2} 11`, style: 'costura' });
    }
  }
  if (kind === 'bolsa-jareta') {
    view.zones = view.zones.map(zone => zone.id === 'base' ? { ...zone, d: `M${-w * .42} 0 Q0 ${h * .09} ${w * .42} 0 C${w * .43} ${h * .25} ${w * .55} ${h * .6} ${w * .5} ${h * .88} Q${w * .48} ${h} 0 ${h} Q${-w * .48} ${h} ${-w * .5} ${h * .88} C${-w * .55} ${h * .6} ${-w * .43} ${h * .25} ${-w * .42} 0 Z` } : zone.id === 'jareta' ? { ...zone, d: `M${-w * .43} ${h * .08} Q0 ${h * .13} ${w * .43} ${h * .08} L${w * .45} ${h * .22} Q0 ${h * .28} ${-w * .45} ${h * .22} Z` } : zone);
    view.details = [];
    for (let i = -3; i <= 3; i++) view.details.push({ d: `M${i * w * .105} ${h * .055} Q${i * w * .10} ${h * .2} ${i * w * .12} ${h * .39}`, style: 'pliegue' });
    for (const sign of [-1, 1]) view.details.push({ d: `M${sign * w * .44} ${h * .16} C${sign * w * .79} ${h * .12} ${sign * w * .82} ${h * .4} ${sign * w * .48} ${h * .39} Q${sign * w * .6} ${h * .5} ${sign * w * .68} ${h * .55}`, style: 'costura' });
    view = reframe(view);
  }
  if (kind === 'dona') {
    const loop = (radius: number, ripple: number, reverse = false) => Array.from({ length: 96 }, (_, i) => {
      const angle = (reverse ? -1 : 1) * i * Math.PI / 48, r = radius + Math.sin(angle * 12) * ripple;
      return `${i ? 'L' : 'M'}${Math.cos(angle) * r} ${Math.sin(angle) * r}`;
    }).join(' ') + ' Z';
    view.zones[0].d = loop(79, 7) + ' ' + loop(27, 2, true);
    view.details = Array.from({ length: 24 }, (_, i) => {
      const a = i * Math.PI / 12, inside = 30, outside = i % 2 ? 73 : 79;
      return { d: `M${Math.cos(a) * inside} ${Math.sin(a) * inside} Q${Math.cos(a + .06) * 54} ${Math.sin(a + .06) * 54} ${Math.cos(a + .025) * outside} ${Math.sin(a + .025) * outside}`, style: 'pliegue' as const };
    });
    view = reframe(view);
  }
  if (kind === 'banda-lazo') {
    // Show the finished tie, with the original single band id. No new pattern
    // parts are invented by the knot's overlapping contour.
    const belt = id === 'cinturon-tela', bracelet = id === 'pulsera-tela', gift = id === 'lazo-regalo';
    const ring = bracelet || (!gift && !belt), width = ring ? 180 : 240, band = ring ? 20 : 18;
    const body = ring
      ? `M-90 20 C-95 150 95 150 90 20 L${90 - band} 20 C75 115 -75 115 ${-90 + band} 20 Z`
      : `M-105 22 Q-120 100 -70 155 L-99 164 Q-145 105 -130 20 Z M105 22 Q125 93 78 148 L108 162 Q156 96 130 20 Z`;
    const bow = `M-10 10 C-30 -10 -75 -42 -90 -27 Q-115 -2 -95 36 Q-65 52 -10 27 Z M10 10 C30 -10 75 -42 90 -27 Q115 -2 95 36 Q65 52 10 27 Z M-15 0 Q0 -9 15 0 L17 33 Q0 43 -17 33 Z`;
    view.zones = [{ ...view.zones[0], d: body + ' ' + bow }];
    view.details = [{ d: 'M-83 -11 Q-49 9 -17 18 M83 -11 Q49 9 17 18 M-85 28 Q-49 20 -17 20 M85 28 Q49 20 17 20', style: 'pliegue' }];
    if (belt) view.details.push({ d: 'M-115 34 Q-126 102 -85 151 M119 34 Q136 102 95 151', style: 'pespunte' });
    view = reframe({ ...view, width, height: 210 });
  }
  if (kind === 'rectangulo' && /servilleta/.test(id)) {
    // A folded napkin shows the finished double-sided fabric; unfolding still
    // uses the unchanged rectangular cutting pattern.
    view.zones[0].d = `M${-w * .4} ${h * .14} L${w * .34} 0 L${w * .47} ${h * .84} L${-w * .26} ${h} Z`;
    view.details = [
      { d: `M${-w * .4} ${h * .14} L${w * .23} ${h * .51} L${w * .34} 0 M${w * .23} ${h * .51} L${-w * .26} ${h}`, style: 'doblez' },
      { d: `M${-w * .35} ${h * .18} L${-w * .23} ${h * .95} L${w * .42} ${h * .81}`, style: 'pespunte' }
    ];
  }
  const subject = catalogSubject(id, spec);
  if (!subject) return { view };
  if (kind === 'rectangulo' && /marcapaginas/.test(id)) {
    const reference = { subject, x: w * .7, y: h * .1, width: h * .85, height: h * .85 };
    return { view: { ...view, width: reference.x + reference.width - view.minX + 12 }, reference };
  }
  if (kind === 'funda-solapa') {
    const size = Math.max(w, h) * .55;
    const reference = { subject, x: w * .36, y: h * .48, width: size, height: size };
    // Side-by-side context is visually separated from the fabric. It cannot be
    // mistaken for an embroidered motif that the supplied pattern includes.
    view = { ...view, width: w * .5 - view.minX + size * 1.04, height: Math.max(view.height, reference.y + size - view.minY) };
    return { view, reference };
  }
  const size = Math.min(w, h) * .7;
  const wide = ['maquina', 'teclado', 'bandeja', 'libro'].includes(subject);
  const width = wide ? Math.min(w * .85, h * 1.15) : size;
  return { view, reference: { subject, x: -width / 2, y: (h - size) / 2, width, height: size } };
}
