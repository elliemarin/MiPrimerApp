import { memo } from 'react';
import type { Fabric } from '../../store/types';
import { useFileUrl } from '../../ui/components';
import { cmdsToSvg } from '../../lib/draw/paths';
import { DesignDoc, DesignElement, DesignView, Fill, elementLocalCmds, StitchStyle } from './model';

export type RenderMode = 'apariencia' | 'tecnica';

const STITCH: Record<StitchStyle, { dash?: string; cap?: 'round' | 'butt'; k?: number }> = {
  solida: {},
  recta: { dash: '2.6 1.2' },
  pespunte: { dash: '3 1.3' },
  cadeneta: { dash: '0.1 2.2', cap: 'round', k: 1.5 },
  zigzag: { dash: '0.7 0.7', k: 2.2 },
  satin: { k: 2.6 },
  'punto-atras': { dash: '2.4 0.35' }
};

export function fabricRepeat(f: Fabric): { w: number; h: number } {
  const pxW = f.photo?.pxW ?? 1000;
  const pxH = f.photo?.pxH ?? 1000;
  if (f.calibration) return { w: pxW * f.calibration.mmPerPx, h: pxH * f.calibration.mmPerPx };
  const k = f.visualRepeatMm / Math.max(pxW, pxH);
  return { w: pxW * k, h: pxH * k };
}

function FabricPattern({ id, fabric, fill }: { id: string; fabric?: Fabric; fill: Extract<Fill, { type: 'tela' }> }) {
  const url = useFileUrl(fabric?.photo?.processedFileId ?? fabric?.photo?.originalFileId);
  if (!fabric) return null;
  const r = fabricRepeat(fabric);
  return (
    <pattern id={id} patternUnits="userSpaceOnUse" width={r.w} height={r.h} patternTransform={`rotate(${fill.rotation + fabric.grainAngle}) translate(${fill.offsetX} ${fill.offsetY}) scale(${fill.scale})`}>
      <rect width={r.w} height={r.h} fill={fabric.color} />
      {url && <image href={url} width={r.w} height={r.h} preserveAspectRatio="none" />}
    </pattern>
  );
}

export function fillAttr(fill: Fill, patternId: string): { fill: string; fillOpacity?: number } {
  if (fill.type === 'ninguno') return { fill: 'none' };
  if (fill.type === 'color') return { fill: fill.color, fillOpacity: fill.opacity };
  return { fill: `url(#${patternId})` };
}

/** Definiciones compartidas: telas, máscaras de zona y filtros de borde. */
export function StudioDefs({ doc, view, fabrics, prefix }: { doc: DesignDoc; view: DesignView; fabrics: Record<string, Fabric>; prefix: string }) {
  const els = doc.elements.filter((e) => e.viewId === view.id || (view.kind === 'parche' ? false : doc.elements.some((x) => x.viewId === view.id && x.patchViewId === e.viewId)));
  return (
    <defs>
      {els.map((e) => (e.fill.type === 'tela' ? <FabricPattern key={e.id} id={`${prefix}fab-${e.id}`} fabric={fabrics[e.fill.fabricId]} fill={e.fill} /> : null))}
      {Object.entries(view.zoneFills ?? {}).map(([zid, f]) => (f.type === 'tela' ? <FabricPattern key={zid} id={`${prefix}zf-${zid}`} fabric={fabrics[f.fabricId]} fill={f} /> : null))}
      {view.zones.map((z) => (
        <clipPath key={z.id} id={`${prefix}zone-${z.id}`}>
          <path d={z.d} />
        </clipPath>
      ))}
      {els.map((e) =>
        e.clip ? (
          <clipPath key={`c${e.id}`} id={`${prefix}clip-${e.id}`}>
            <polygon points={e.clip.map(([x, y]) => `${x * e.w},${y * e.h}`).join(' ')} />
          </clipPath>
        ) : null
      )}
      <filter id={`${prefix}crudo`} x="-5%" y="-5%" width="110%" height="110%">
        <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="1" seed="3" />
        <feDisplacementMap in="SourceGraphic" scale="0.9" />
      </filter>
      <filter id={`${prefix}deshilachado`} x="-8%" y="-8%" width="116%" height="116%">
        <feTurbulence type="fractalNoise" baseFrequency="1.6" numOctaves="2" seed="7" />
        <feDisplacementMap in="SourceGraphic" scale="2.4" />
      </filter>
    </defs>
  );
}

export const ViewBase = memo(function ViewBase({ view, mode, prefix, fabrics }: { view: DesignView; mode: RenderMode; prefix: string; fabrics: Record<string, Fabric> }) {
  const photoUrl = useFileUrl(view.source.type === 'foto' ? view.source.fileId : undefined);
  void fabrics;
  return (
    <g>
      {view.source.type === 'foto' && view.photo && photoUrl && (
        <image href={photoUrl} x={view.minX} y={view.minY} width={view.width} height={view.height} preserveAspectRatio="none" opacity={mode === 'tecnica' ? 0.35 : 1} />
      )}
      {view.source.type === 'parche' && view.zones[0] && <path d={view.zones[0].d} fill={mode === 'tecnica' ? 'none' : '#fbfaf6'} stroke="var(--ink)" strokeWidth={1.2} vectorEffect="non-scaling-stroke" />}
      {(view.source.type === 'plantilla' || view.source.type === 'pieza' || view.source.type === 'vacia') &&
        view.zones.map((z) => {
          const f = view.zoneFills?.[z.id];
          const fa = mode === 'apariencia' && f ? fillAttr(f, `${prefix}zf-${z.id}`) : { fill: mode === 'tecnica' ? 'none' : '#ffffff' };
          return <path key={z.id} d={z.d} {...fa} stroke="#1d2420" strokeWidth={1.3} strokeLinejoin="round" vectorEffect="non-scaling-stroke" />;
        })}
      {view.source.type === 'foto' &&
        view.zones.map((z) => <path key={z.id} d={z.d} fill={view.zoneFills?.[z.id] && mode === 'apariencia' ? fillAttr(view.zoneFills[z.id], `${prefix}zf-${z.id}`).fill : 'none'} fillOpacity={0.85} stroke="var(--mat)" strokeWidth={1.2} strokeDasharray="5 3" vectorEffect="non-scaling-stroke" />)}
      {view.details?.map((d, i) => (
        <path key={i} d={d.d} fill="none" stroke="#1d2420" strokeWidth={d.style === 'pliegue' ? 0.7 : 1} strokeDasharray={d.style === 'pespunte' ? '3 2.4' : undefined} vectorEffect="non-scaling-stroke" />
      ))}
      {view.dots?.map((d, i) => <circle key={i} cx={d.x} cy={d.y} r={d.r} fill="#fff" stroke="#1d2420" strokeWidth={1} vectorEffect="non-scaling-stroke" />)}
    </g>
  );
});

function darker(hex: string): string {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex);
  if (!m) return '#333';
  const n = parseInt(m[1], 16);
  const f = (v: number) => Math.round(v * 0.62).toString(16).padStart(2, '0');
  return `#${f(n >> 16)}${f((n >> 8) & 255)}${f(n & 255)}`;
}

export function ElementSvg({ el, mode, prefix, doc, fabrics, depth = 0 }: { el: DesignElement; mode: RenderMode; prefix: string; doc: DesignDoc; fabrics: Record<string, Fabric>; depth?: number }) {
  const imgUrl = useFileUrl(el.image?.fileId);
  if (el.hidden || el.kind === 'grupo') return null;
  const d = cmdsToSvg(elementLocalCmds(el));
  const tf = `translate(${el.x} ${el.y}) rotate(${el.rotation}) scale(${el.flipX ? -1 : 1} ${el.flipY ? -1 : 1})`;
  const fill = fillAttr(el.fill, `${prefix}fab-${el.id}`);
  const tech = mode === 'tecnica';
  const st = el.stroke ? STITCH[el.stroke.style] : undefined;
  const fabColor = el.fill.type === 'color' ? el.fill.color : el.fill.type === 'tela' ? fabrics[el.fill.fabricId]?.color ?? '#999' : '#555';
  let body: JSX.Element | null = null;
  if (el.kind === 'texto' && el.text) {
    body = (
      <text x={0} y={0} fontSize={el.h * 0.78} textAnchor="middle" dominantBaseline="central" fontFamily={el.text.font === 'serif' ? 'var(--display)' : el.text.font === 'script' ? "'Snell Roundhand', 'Brush Script MT', cursive" : 'var(--sans)'} fontWeight={el.text.weight} {...(tech ? { fill: 'none', stroke: '#1d2420', strokeWidth: 0.25 } : fill)}>
        {el.text.content}
      </text>
    );
  } else if (el.kind === 'imagen' && el.image) {
    body = tech ? <rect x={-el.w / 2} y={-el.h / 2} width={el.w} height={el.h} fill="none" stroke="#1d2420" strokeDasharray="3 2" vectorEffect="non-scaling-stroke" /> : imgUrl ? <image href={imgUrl} x={-el.w / 2} y={-el.h / 2} width={el.w} height={el.h} preserveAspectRatio="none" /> : null;
  } else if (el.kind === 'parche' && el.patchViewId && depth === 0) {
    const pv = doc.views.find((v) => v.id === el.patchViewId);
    if (pv) {
      const sx = el.w / pv.width;
      const sy = el.h / pv.height;
      body = (
        <g transform={`translate(${-el.w / 2} ${-el.h / 2}) scale(${sx} ${sy}) translate(${-pv.minX} ${-pv.minY})`}>
          <ViewBase view={pv} mode={mode} prefix={prefix} fabrics={fabrics} />
          {doc.elements.filter((x) => x.viewId === pv.id).map((x) => <ElementSvg key={x.id} el={x} mode={mode} prefix={prefix} doc={doc} fabrics={fabrics} depth={1} />)}
        </g>
      );
    }
  } else {
    const strokeW = el.stroke ? el.stroke.width * (st?.k ?? 1) : 0;
    const edgeFilter = !tech && el.edge === 'deshilachado' ? `url(#${prefix}deshilachado)` : !tech && el.edge === 'crudo' ? `url(#${prefix}crudo)` : undefined;
    body = (
      <g filter={edgeFilter}>
        <path
          d={d}
          {...(tech ? { fill: 'none' } : fill)}
          stroke={tech ? '#1d2420' : el.stroke ? el.stroke.color : el.edge === 'satin' || el.edge === 'zigzag' ? darker(fabColor) : 'none'}
          strokeWidth={tech ? 0.6 : el.stroke ? strokeW : el.edge === 'satin' ? 2.6 : el.edge === 'zigzag' ? 1.6 : 0}
          strokeDasharray={tech ? (el.technique === 'bordado' ? '2 0.8 0.4 0.8' : undefined) : el.stroke ? st?.dash : el.edge === 'zigzag' ? '0.7 0.7' : undefined}
          strokeLinecap={st?.cap ?? 'round'}
          strokeLinejoin="round"
        />
        {!tech && (el.edge === 'doblado' || el.edge === 'pespunte') && el.w > 8 && el.h > 8 && (
          <path d={d} transform={`scale(${(el.w - 6) / el.w} ${(el.h - 6) / el.h})`} fill="none" stroke={darker(fabColor)} strokeWidth={0.5} strokeDasharray="1.6 1.1" vectorEffect="non-scaling-stroke" />
        )}
      </g>
    );
  }
  const clipped = el.clip ? <g clipPath={`url(#${prefix}clip-${el.id})`}>{body}</g> : body;
  const inner = <g transform={tf}>{clipped}</g>;
  return el.maskZoneId ? <g clipPath={`url(#${prefix}zone-${el.maskZoneId})`}>{inner}</g> : inner;
}
