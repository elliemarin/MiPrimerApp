import { useId, useMemo } from 'react';
import { buildFlat, FlatSpec, FlatView } from '../data/flats';
import type { Zone } from '../features/studio/model';
import './flatArt.css';

const cache = new Map<string, ReturnType<typeof buildFlat>>();

export function getFlat(id: string, spec: FlatSpec) {
  let flat = cache.get(id);
  if (!flat) {
    flat = buildFlat(id, spec);
    cache.set(id, flat);
  }
  return flat;
}

export interface FlatPalette { fabric: string; trim: string; pocket: string; metal: string }

/** The colour belongs to the illustration, never to the pattern or fabric stock. */
export function flatPalette(spec?: FlatSpec): FlatPalette {
  if (spec?.top?.style === 'denim') return { fabric: '#7894aa', trim: '#607e96', pocket: '#819bb0', metal: '#bfaa76' };
  if (spec?.top?.style === 'trench') return { fabric: '#c6b48e', trim: '#ae9972', pocket: '#c5b48f', metal: '#78684e' };
  if (spec?.top?.style === 'biker') return { fabric: '#65706e', trim: '#4c5754', pocket: '#6e7976', metal: '#cfccc0' };
  if (spec?.family === 'pantalon') return { fabric: '#8299aa', trim: '#6e8595', pocket: '#90a5b4', metal: '#c8b482' };
  if (spec?.family === 'falda' || spec?.family === 'vestido') return { fabric: '#b89b93', trim: '#9d7f78', pocket: '#c2a69e', metal: '#b9a47b' };
  if (spec?.family === 'bebe') return { fabric: '#bec4a5', trim: '#a2ad89', pocket: '#c8cdb4', metal: '#ede5d2' };
  if (spec?.family === 'bolso') return { fabric: '#bfab85', trim: '#917a55', pocket: '#c8b894', metal: '#a88b51' };
  if (spec?.family === 'accesorio') {
    if (['cojin', 'antifaz', 'dona'].includes(spec.accessory ?? '')) return { fabric: '#bcaaa5', trim: '#9d8984', pocket: '#cab9b3', metal: '#c2ae87' };
    if (['babero', 'gorro'].includes(spec.accessory ?? '')) return { fabric: '#b6c2ac', trim: '#8c9e80', pocket: '#c0ccb6', metal: '#ede7d6' };
    return { fabric: '#adbaa8', trim: '#899d82', pocket: '#bdc8b7', metal: '#bca578' };
  }
  return { fabric: '#8aa397', trim: '#6b897a', pocket: '#9db2a6', metal: '#c4b18a' };
}

function zoneColour(zone: Zone, palette: FlatPalette) {
  if (zone.type === 'bolsillo' || /bolsillo|solapa/i.test(zone.id)) return palette.pocket;
  if (['cuello', 'puno', 'pretina'].includes(zone.type) || /asa|correa|tirante|bies|borde|nudo|cinta|jareta|cierre/.test(zone.id)) return palette.trim;
  return palette.fabric;
}

/** Shared presentation layer for a flat and a croquis. It never alters cut geometry.
 * `fills` accepts colours or SVG paint URLs so the model preview can display the
 * actual selected fabrics while retaining the same restrained line treatment.
 */
export function FlatArtwork({ view, prefix, spec, fills }: { view: FlatView; prefix: string; spec?: FlatSpec; fills?: Record<string, string> }) {
  const palette = flatPalette(spec);
  const hood = spec?.top?.neck === 'capucha' && view.key === 'frente';
  const hoodOpening = hood ? view.details.find(detail => detail.d.startsWith('M0 ') && detail.d.includes('C-70'))?.d : undefined;
  const containedPleats = spec?.family === 'falda' || spec?.family === 'vestido' || !!spec?.pinafore;
  return <>
    <defs>
      <linearGradient id={`${prefix}-volume`} x1="0" y1=".2" x2="1" y2=".7" gradientUnits="objectBoundingBox">
        <stop offset="0" stopColor="#1e302b" stopOpacity=".09" />
        <stop offset=".24" stopColor="#fff" stopOpacity=".16" />
        <stop offset=".56" stopColor="#fff" stopOpacity=".025" />
        <stop offset="1" stopColor="#1e302b" stopOpacity=".15" />
      </linearGradient>
      <linearGradient id={`${prefix}-metal`} x1="0" y1="0" x2="1" y2="1"><stop stopColor="#f0e4c9" /><stop offset=".5" stopColor={palette.metal} /><stop offset="1" stopColor="#907b54" /></linearGradient>
      <pattern id={`${prefix}-weave`} width="8" height="8" patternUnits="userSpaceOnUse"><path d="M0 1H8M1 0V8" stroke="#fff" strokeOpacity=".055" strokeWidth=".5" /></pattern>
      {containedPleats && <clipPath id={`${prefix}-silhouette`}>{view.zones.map(zone => <path key={zone.id} d={zone.d} />)}</clipPath>}
      {hoodOpening && <mask id={`${prefix}-hood-opening`} maskUnits="userSpaceOnUse" x={view.minX} y={view.minY} width={view.width} height={view.height}><rect x={view.minX} y={view.minY} width={view.width} height={view.height} fill="#fff" /><path d={hoodOpening} fill="#000" /></mask>}
    </defs>
    {view.zones.map(zone => <g key={zone.id} className="flat-surface" data-flat-zone={zone.id} mask={hoodOpening && zone.type === 'capucha' ? `url(#${prefix}-hood-opening)` : undefined}>
      <path d={zone.d} fill={fills?.[zone.id] ?? zoneColour(zone, palette)} fillRule="evenodd" />
      <path d={zone.d} fill={`url(#${prefix}-volume)`} fillRule="evenodd" />
      <path d={zone.d} fill={`url(#${prefix}-weave)`} fillRule="evenodd" />
      <path className="flat-outline" d={zone.d} fill="none" stroke="#37473f" strokeWidth={1.05} strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
    </g>)}
    <g clipPath={containedPleats ? `url(#${prefix}-silhouette)` : undefined}>{view.details.map((detail, index) => <path key={index} d={detail.d} fill="none" className={`flat-detail flat-${detail.style}`} stroke="#3f5148" strokeWidth={detail.style === 'pespunte' ? .58 : detail.style === 'costura' ? .8 : .65} strokeOpacity={detail.style === 'pliegue' ? .45 : detail.style === 'doblez' ? .6 : .76} strokeDasharray={detail.style === 'pespunte' ? '2.1 1.9' : undefined} strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />)}</g>
    {view.dots.map((dot, index) => <g key={index} className="flat-hardware"><circle cx={dot.x} cy={dot.y} r={dot.r} fill={`url(#${prefix}-metal)`} stroke="#6e6955" strokeWidth={.6} vectorEffect="non-scaling-stroke" />{dot.r >= 5 && <><circle cx={dot.x - dot.r * .22} cy={dot.y} r={dot.r * .13} fill="#6b624e" /><circle cx={dot.x + dot.r * .22} cy={dot.y} r={dot.r * .13} fill="#6b624e" /></>}</g>)}
  </>;
}

export function FlatViewSvg({ view, className, title, highlight, spec }: { view: FlatView; className?: string; title?: string; highlight?: string; spec?: FlatSpec }) {
  const id = useId().replace(/:/g, '');
  // Keep room around the garment; the card frames the drawing, not its strokes.
  const pad = Math.max(view.width, view.height) * .055;
  return <svg className={`flat-art flat-editorial ${className ?? ''}`} viewBox={`${view.minX - pad} ${view.minY - pad} ${view.width + pad * 2} ${view.height + pad * 2}`} role="img" aria-label={title ?? 'Dibujo de la prenda'}>
    {title && <title>{title}</title>}
    <desc>Ilustración de referencia. Los colores son orientativos; las medidas se eligen al crear el patrón.</desc>
    <FlatArtwork view={view} prefix={`flat-${id}`} spec={spec} fills={highlight ? { [highlight]: '#dec786' } : undefined} />
  </svg>;
}

export function FlatArt({ id, spec, view = 'frente', title }: { id: string; spec: FlatSpec; view?: string; title?: string }) {
  const flat = useMemo(() => getFlat(id, spec), [id, spec]);
  const current = flat.views.find(item => item.key === view) ?? flat.views[0];
  return <FlatViewSvg view={current} spec={spec} title={title} />;
}
