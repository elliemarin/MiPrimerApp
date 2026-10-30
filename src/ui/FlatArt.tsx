import { useMemo } from 'react';
import { buildFlat, FlatSpec, FlatView } from '../data/flats';

const cache = new Map<string, ReturnType<typeof buildFlat>>();

export function getFlat(id: string, spec: FlatSpec) {
  let f = cache.get(id);
  if (!f) {
    f = buildFlat(id, spec);
    cache.set(id, f);
  }
  return f;
}

export function FlatViewSvg({ view, className, title, highlight }: { view: FlatView; className?: string; title?: string; highlight?: string }) {
  return (
    <svg className={`flat-art ${className ?? ''}`} viewBox={`${view.minX} ${view.minY} ${view.width} ${view.height}`} role="img" aria-label={title}>
      {view.zones.map((z) => (
        <path key={z.id} d={z.d} className="zone" style={highlight === z.id ? { fill: 'var(--tape-soft)' } : undefined} />
      ))}
      {view.details.map((d, i) => (
        <path key={i} d={d.d} className={`detail ${d.style}`} />
      ))}
      {view.dots.map((d, i) => (
        <circle key={i} cx={d.x} cy={d.y} r={d.r} className="zone" />
      ))}
    </svg>
  );
}

export function FlatArt({ id, spec, view = 'frente', title }: { id: string; spec: FlatSpec; view?: string; title?: string }) {
  const flat = useMemo(() => getFlat(id, spec), [id, spec]);
  const v = flat.views.find((x) => x.key === view) ?? flat.views[0];
  return <FlatViewSvg view={v} title={title} />;
}
