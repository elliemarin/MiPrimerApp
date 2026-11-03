import { useId } from 'react';
import type { Pt } from '../../lib/geom/vec';
import { designBox, polysPath, type BuiltFigure, type FabricPattern, type FigureDef } from '../../lib/applique/figure';

interface Layer { shape: Pt[][]; color: string; pattern: FabricPattern }

/** Estampados de muestra: solo para la vista; el PDF usa el color. */
function PatternDef({ id, color, pattern, unit }: { id: string; color: string; pattern: FabricPattern; unit: number }) {
  const s = unit * 8, light = 'rgba(255,255,255,.55)', dark = 'rgba(0,0,0,.18)';
  return <pattern id={id} patternUnits="userSpaceOnUse" width={s} height={s}>
    <rect width={s} height={s} fill={color}/>
    {pattern === 'vichy' && <><rect width={s / 2} height={s} fill={light} opacity={0.6}/><rect width={s} height={s / 2} fill={light} opacity={0.6}/></>}
    {pattern === 'rayas' && <rect width={s / 2} height={s} fill="#fbf7f0"/>}
    {pattern === 'lunares' && <circle cx={s / 2} cy={s / 2} r={s / 6} fill={light}/>}
    {pattern === 'cuadros' && <><rect x={s * 0.45} width={s * 0.1} height={s} fill={light}/><rect y={s * 0.45} width={s} height={s * 0.1} fill={dark}/></>}
  </pattern>;
}

/**
 * Figura dibujada desde sus piezas reales. Con `upTo`, las piezas aún no
 * colocadas se ven como contorno punteado y la última colocada se resalta.
 */
export function FigureArt({ def, built, colors, upTo, label, className }: { def: FigureDef; built?: BuiltFigure; colors?: Record<number, string>; upTo?: number; label?: string; className?: string }) {
  const uid = useId().replace(/:/g, '');
  const layers: Layer[] = built
    ? built.pieces.map(p => ({ shape: p.shape, color: p.color, pattern: p.pattern }))
    : def.layers.map((l, i) => ({ shape: l.shape, color: colors?.[i] ?? l.color, pattern: l.pattern ?? 'liso' }));
  const box = built ? { minX: 0, minY: 0, maxX: built.width, maxY: built.height } : designBox(def);
  const w = box.maxX - box.minX, h = box.maxY - box.minY, pad = Math.max(w, h) * 0.06, unit = Math.max(w, h) / 100;
  const vb = `${box.minX - pad - Math.max(0, h - w) / 2} ${box.minY - pad - Math.max(0, w - h) / 2} ${Math.max(w, h) + 2 * pad} ${Math.max(w, h) + 2 * pad}`;
  const stepping = upTo !== undefined;
  return <svg className={className} viewBox={vb} role="img" aria-label={label ?? def.name} preserveAspectRatio="xMidYMid meet">
    <defs>{layers.map((l, i) => l.pattern !== 'liso' && <PatternDef key={i} id={`${uid}-p${i}`} color={l.color} pattern={l.pattern} unit={unit}/>)}</defs>
    {layers.map((l, i) => {
      const d = polysPath(l.shape, 2), fill = l.pattern !== 'liso' ? `url(#${uid}-p${i})` : l.color;
      if (stepping && i >= upTo!) return <path key={i} d={d} fill="none" stroke="currentColor" strokeOpacity={0.35} strokeWidth={unit * 0.5} strokeDasharray={`${unit * 1.6} ${unit * 1.2}`} vectorEffect="non-scaling-stroke"/>;
      const current = stepping && i === upTo! - 1;
      return <path key={i} d={d} fill={fill} fillRule="nonzero" stroke={current ? 'var(--ink, #1f2a24)' : 'rgba(0,0,0,.22)'} strokeWidth={current ? 2.4 : 0.8} vectorEffect="non-scaling-stroke" className={current ? 'figure-current' : undefined}/>;
    })}
  </svg>;
}

/** Una pieza tal como se corta: contorno de corte, tamaño final y número. */
export function PieceArt({ shape, cut, color, number }: { shape: Pt[][]; cut: Pt[][]; color: string; number: number }) {
  const pts = cut.flat().length ? cut.flat() : shape.flat(), xs = pts.map(p => p.x), ys = pts.map(p => p.y);
  const minX = Math.min(...xs), minY = Math.min(...ys), w = Math.max(...xs) - minX, h = Math.max(...ys) - minY, s = Math.max(w, h) * 1.12;
  return <svg viewBox={`${minX + w / 2 - s / 2} ${minY + h / 2 - s / 2} ${s} ${s}`} role="img" aria-label={`Pieza ${number}`}>
    <path d={polysPath(cut, 2)} fill={color} stroke="rgba(0,0,0,.45)" strokeWidth={1.2} vectorEffect="non-scaling-stroke"/>
    <path d={polysPath(shape, 2)} fill="none" stroke="rgba(255,255,255,.75)" strokeDasharray="3 3" strokeWidth={1} vectorEffect="non-scaling-stroke"/>
  </svg>;
}
