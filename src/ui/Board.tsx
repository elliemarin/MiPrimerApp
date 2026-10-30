import { ReactNode, useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { Pt, BBox } from '../lib/geom/vec';
import type { Unit } from '../lib/units';

export interface View {
  /** Píxeles CSS por milímetro. */
  scale: number;
  tx: number;
  ty: number;
}

export interface BoardPointer {
  world: Pt;
  screen: Pt;
  event: PointerEvent | React.PointerEvent;
}

/** Pellizco en coordenadas físicas de la vista; factor y giro relativos al inicio. */
export interface BoardPinch {
  points: [Pt, Pt];
  midpoint: Pt;
  distance: number;
  angle: number;
  factor: number;
  rotation: number;
  event: PointerEvent | React.PointerEvent;
}

export interface BoardHandlers {
  /** Devuelve true si la herramienta toma el gesto; si no, el lienzo se desplaza. */
  onDown?: (p: BoardPointer) => boolean;
  onMove?: (p: BoardPointer) => void;
  onUp?: (p: BoardPointer) => void;
  onHover?: (p: BoardPointer) => void;
  onDoubleTap?: (p: BoardPointer) => void;
  /** true captura el gesto para editar; false conserva el zoom del lienzo. */
  onPinchStart?: (p: BoardPinch) => boolean;
  onPinchMove?: (p: BoardPinch) => void;
  onPinchEnd?: (p: BoardPinch) => void;
}

export function useViewport(initial: View = { scale: 1, tx: 40, ty: 40 }) {
  const [view, setView] = useState<View>(initial);
  const size = useRef({ w: 800, h: 600 });
  const zoomAt = useCallback((factor: number, at: Pt) => {
    setView((v) => {
      const scale = Math.max(0.05, Math.min(80, v.scale * factor));
      const k = scale / v.scale;
      return { scale, tx: at.x - (at.x - v.tx) * k, ty: at.y - (at.y - v.ty) * k };
    });
  }, []);
  const fit = useCallback((b: BBox, pad = 40) => {
    const { w, h } = size.current;
    const bw = Math.max(1, b.maxX - b.minX);
    const bh = Math.max(1, b.maxY - b.minY);
    const scale = Math.max(0.05, Math.min((w - pad * 2) / bw, (h - pad * 2) / bh, 40));
    setView({ scale, tx: (w - bw * scale) / 2 - b.minX * scale, ty: (h - bh * scale) / 2 - b.minY * scale });
  }, []);
  const toWorld = useCallback((s: Pt, v: View): Pt => ({ x: (s.x - v.tx) / v.scale, y: (s.y - v.ty) / v.scale }), []);
  return { view, setView, zoomAt, fit, toWorld, size };
}

type VP = ReturnType<typeof useViewport>;

function niceStep(scale: number, unit: Unit): { minor: number; major: number; label: (mm: number) => string } {
  if (unit === 'in') {
    const steps = [25.4 / 16, 25.4 / 8, 25.4 / 4, 25.4 / 2, 25.4, 25.4 * 2, 25.4 * 6, 25.4 * 12, 25.4 * 36];
    const minor = steps.find((s) => s * scale >= 7) ?? steps[steps.length - 1];
    const major = steps.find((s) => s * scale >= 60 && s >= minor * 2) ?? minor * 4;
    return { minor, major, label: (mm) => `${Math.round((mm / 25.4) * 100) / 100}` };
  }
  const steps = [1, 2, 5, 10, 20, 50, 100, 200, 500, 1000, 2000];
  const minor = steps.find((s) => s * scale >= 7) ?? 2000;
  const major = steps.find((s) => s * scale >= 55 && s >= minor * 2 && s % 10 === 0) ?? minor * 5;
  return { minor, major, label: (mm) => `${Math.round(mm / 10)}` };
}

export function Board({
  vp,
  handlers,
  children,
  overlay,
  unit,
  grid = true,
  rulers = true,
  cursor
}: {
  vp: VP;
  handlers: BoardHandlers;
  children: ReactNode;
  overlay?: ReactNode;
  unit: Unit;
  grid?: boolean;
  rulers?: boolean;
  cursor?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const pointers = useRef(new Map<number, Pt>());
  const gesture = useRef<{ mode: 'tool' | 'pan' | 'pinch' | 'pinch-tool' | 'double-tap' | null; last?: Pt; dist?: number; mid?: Pt; start?: BoardPinch; down?: BoardPointer }>({ mode: null });
  const lastTap = useRef<{ at: number; screen: Pt; pointerType: string }>();
  const tap = useRef<{ pointerId: number; startedAt: number; screen: Pt; moved: boolean; pointerType: string }>();
  const { view, setView, zoomAt, size, toWorld } = vp;
  const [dims, setDims] = useState({ w: 800, h: 600 });

  useLayoutEffect(() => {
    const el = ref.current!;
    const ro = new ResizeObserver(() => {
      const r = el.getBoundingClientRect();
      size.current = { w: r.width, h: r.height };
      setDims({ w: r.width, h: r.height });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [size]);

  // Evita el zoom de página de Safari con gestos sobre el lienzo.
  useEffect(() => {
    const el = ref.current!;
    const prevent = (e: Event) => e.preventDefault();
    el.addEventListener('gesturestart', prevent);
    el.addEventListener('gesturechange', prevent);
    const wheel = (e: WheelEvent) => {
      e.preventDefault();
      const r = el.getBoundingClientRect();
      const at = { x: e.clientX - r.left, y: e.clientY - r.top };
      if (e.ctrlKey || e.metaKey) zoomAt(Math.exp(-e.deltaY * 0.01), at);
      else if (e.deltaMode === 1) zoomAt(Math.exp(-e.deltaY * 0.08), at);
      else setView((v) => ({ ...v, tx: v.tx - e.deltaX, ty: v.ty - e.deltaY }));
    };
    el.addEventListener('wheel', wheel, { passive: false });
    return () => {
      el.removeEventListener('gesturestart', prevent);
      el.removeEventListener('gesturechange', prevent);
      el.removeEventListener('wheel', wheel);
    };
  }, [zoomAt, setView]);

  const local = (e: { clientX: number; clientY: number }): Pt => {
    const r = ref.current!.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };
  const bp = (e: React.PointerEvent): BoardPointer => {
    const s = local(e);
    return { screen: s, world: toWorld(s, view), event: e };
  };

  const pinchSample = (e: React.PointerEvent, start?: BoardPinch): BoardPinch => {
    const [a, b] = [...pointers.current.values()];
    const points: [Pt, Pt] = [toWorld(a, view), toWorld(b, view)];
    const distance = Math.hypot(points[1].x - points[0].x, points[1].y - points[0].y);
    const angle = Math.atan2(points[1].y - points[0].y, points[1].x - points[0].x);
    const delta = angle - (start?.angle ?? angle);
    return {
      points,
      midpoint: { x: (points[0].x + points[1].x) / 2, y: (points[0].y + points[1].y) / 2 },
      distance,
      angle,
      factor: start && start.distance > 0.001 ? distance / start.distance : 1,
      rotation: Math.atan2(Math.sin(delta), Math.cos(delta)),
      event: e
    };
  };

  const onPointerDown = (e: React.PointerEvent) => {
    if (e.button === 2) return;
    // Un tercer dedo no inicia otra herramienta ni cambia la pareja del gesto.
    if (pointers.current.size >= 2) return;
    e.currentTarget.setPointerCapture?.(e.pointerId);
    pointers.current.set(e.pointerId, local(e));
    if (pointers.current.size === 2) {
      tap.current = undefined;
      lastTap.current = undefined;
      if (gesture.current.mode === 'tool') handlers.onUp?.(bp(e));
      const sample = pinchSample(e);
      if (handlers.onPinchStart?.(sample)) {
        gesture.current = { mode: 'pinch-tool', start: sample };
      } else {
        const [a, b] = [...pointers.current.values()];
        gesture.current = { mode: 'pinch', dist: Math.hypot(a.x - b.x, a.y - b.y), mid: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 } };
      }
      return;
    }
    const now = Date.now();
    const p = bp(e);
    const middle = e.button === 1 || e.altKey;
    tap.current = !middle && e.button === 0 ? { pointerId: e.pointerId, startedAt: now, screen: p.screen, moved: false, pointerType: e.pointerType } : undefined;
    const previous = lastTap.current;
    lastTap.current = undefined;
    if (tap.current && previous && now - previous.at < 300 && previous.pointerType === e.pointerType && Math.hypot(p.screen.x - previous.screen.x, p.screen.y - previous.screen.y) <= 20 && handlers.onDoubleTap) {
      // Espera a que termine el segundo toque: si se arrastra, sigue siendo una herramienta.
      gesture.current = { mode: 'double-tap', down: p };
      return;
    }
    if (!middle && handlers.onDown?.(p)) gesture.current = { mode: 'tool' };
    else gesture.current = { mode: 'pan', last: local(e) };
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!pointers.current.has(e.pointerId)) {
      handlers.onHover?.(bp(e));
      return;
    }
    pointers.current.set(e.pointerId, local(e));
    let g = gesture.current;
    const activeTap = tap.current;
    if (activeTap?.pointerId === e.pointerId && Math.hypot(local(e).x - activeTap.screen.x, local(e).y - activeTap.screen.y) > 8) activeTap.moved = true;
    if (g.mode === 'double-tap') {
      if (!activeTap?.moved && activeTap && Date.now() - activeTap.startedAt <= 250) return;
      const down = g.down!;
      gesture.current = handlers.onDown?.(down) ? { mode: 'tool' } : { mode: 'pan', last: down.screen };
      g = gesture.current;
    }
    if (g.mode === 'pinch-tool' && pointers.current.size >= 2) {
      const sample = pinchSample(e, g.start);
      handlers.onPinchMove?.(sample);
    } else if (g.mode === 'pinch' && pointers.current.size >= 2) {
      const [a, b] = [...pointers.current.values()];
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
      const k = d / (g.dist || d);
      setView((v) => {
        const scale = Math.max(0.05, Math.min(80, v.scale * k));
        const kk = scale / v.scale;
        return { scale, tx: mid.x - (g.mid!.x - v.tx) * kk, ty: mid.y - (g.mid!.y - v.ty) * kk };
      });
      gesture.current = { mode: 'pinch', dist: d, mid };
    } else if (g.mode === 'pan' && g.last) {
      const s = local(e);
      const dx = s.x - g.last.x;
      const dy = s.y - g.last.y;
      setView((v) => ({ ...v, tx: v.tx + dx, ty: v.ty + dy }));
      g.last = s;
    } else if (g.mode === 'tool') handlers.onMove?.(bp(e));
  };
  const onPointerUp = (e: React.PointerEvent) => {
    if (!pointers.current.has(e.pointerId)) return;
    const g = gesture.current;
    const activeTap = tap.current;
    const shortTap = e.type === 'pointerup' && activeTap?.pointerId === e.pointerId && !activeTap.moved && Date.now() - activeTap.startedAt <= 250 && Math.hypot(local(e).x - activeTap.screen.x, local(e).y - activeTap.screen.y) <= 8;
    // Termina una sola vez, antes de retirar las coordenadas del dedo.
    if (g.mode === 'pinch-tool' && pointers.current.size >= 2) {
      if (e.type === 'pointerup') pointers.current.set(e.pointerId, local(e));
      handlers.onPinchEnd?.(pinchSample(e, g.start));
      gesture.current = { mode: null };
    } else if (g.mode === 'double-tap') {
      if (shortTap) handlers.onDoubleTap?.(bp(e));
      else if (e.type === 'pointerup' && g.down && handlers.onDown?.(g.down)) handlers.onUp?.(bp(e));
      gesture.current = { mode: null };
    } else {
      if (g.mode === 'tool') handlers.onUp?.(bp(e));
      if (shortTap && activeTap) lastTap.current = { at: Date.now(), screen: local(e), pointerType: activeTap.pointerType };
    }
    tap.current = undefined;
    pointers.current.delete(e.pointerId);
    // El dedo restante queda inerte: no puede dibujar ni mover por accidente.
    if (pointers.current.size === 0 || g.mode === 'pinch') gesture.current = { mode: null };
  };

  const st = niceStep(view.scale, unit);
  const w0 = toWorld({ x: 0, y: 0 }, view);
  const w1 = toWorld({ x: dims.w, y: dims.h }, view);
  const gridMinor = unit === 'in' ? 25.4 / 4 : 10;
  const gridMajor = unit === 'in' ? 25.4 : 50;
  const showMinor = gridMinor * view.scale >= 6;

  const ticks: { pos: number; major: boolean }[] = [];
  const rangeTicks = (a: number, b: number) => {
    const out: { pos: number; major: boolean }[] = [];
    const start = Math.floor(a / st.minor) * st.minor;
    for (let x = start; x <= b && out.length < 600; x += st.minor) out.push({ pos: x, major: Math.abs(x / st.major - Math.round(x / st.major)) < 1e-6 });
    return out;
  };
  ticks.push(...rangeTicks(w0.x, w1.x));
  const vticks = rangeTicks(w0.y, w1.y);

  return (
    <div
      ref={ref}
      className="ed-canvas"
      style={{ cursor }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onLostPointerCapture={onPointerUp}
      onContextMenu={(e) => e.preventDefault()}
    >
      <svg className="board" width={dims.w} height={dims.h}>
        <defs>
          <pattern id="g-minor" width={gridMinor} height={gridMinor} patternUnits="userSpaceOnUse">
            <path d={`M ${gridMinor} 0 L 0 0 0 ${gridMinor}`} fill="none" stroke="var(--grid-minor)" strokeWidth={1 / view.scale} />
          </pattern>
          <pattern id="g-major" width={gridMajor} height={gridMajor} patternUnits="userSpaceOnUse">
            {showMinor && <rect width={gridMajor} height={gridMajor} fill="url(#g-minor)" />}
            <path d={`M ${gridMajor} 0 L 0 0 0 ${gridMajor}`} fill="none" stroke="var(--grid-major)" strokeWidth={1 / view.scale} />
          </pattern>
        </defs>
        <g transform={`translate(${view.tx} ${view.ty}) scale(${view.scale})`}>
          {grid && <rect x={w0.x - gridMajor} y={w0.y - gridMajor} width={w1.x - w0.x + gridMajor * 2} height={w1.y - w0.y + gridMajor * 2} fill="url(#g-major)" />}
          {children}
        </g>
        {overlay}
        {rulers && (
          <g>
            <rect x={0} y={0} width={dims.w} height={20} fill="var(--surface)" opacity={0.92} />
            <rect x={0} y={0} width={20} height={dims.h} fill="var(--surface)" opacity={0.92} />
            {ticks.map((t) => {
              const x = t.pos * view.scale + view.tx;
              return (
                <g key={`x${t.pos}`}>
                  <line x1={x} x2={x} y1={t.major ? 6 : 14} y2={20} stroke="var(--ink-3)" strokeWidth={1} />
                  {t.major && (
                    <text x={x + 3} y={11} className="ruler-text">
                      {st.label(t.pos)}
                    </text>
                  )}
                </g>
              );
            })}
            {vticks.map((t) => {
              const y = t.pos * view.scale + view.ty;
              return (
                <g key={`y${t.pos}`}>
                  <line y1={y} y2={y} x1={t.major ? 6 : 14} x2={20} stroke="var(--ink-3)" strokeWidth={1} />
                  {t.major && (
                    <text x={3} y={y - 3} className="ruler-text" transform={`rotate(-90 3 ${y - 3})`}>
                      {st.label(t.pos)}
                    </text>
                  )}
                </g>
              );
            })}
            <rect x={0} y={0} width={20} height={20} fill="var(--tape)" />
            <text x={10} y={14} textAnchor="middle" className="ruler-text" style={{ fill: 'var(--tape-ink)', fontWeight: 700 }}>
              {unit}
            </text>
          </g>
        )}
      </svg>
    </div>
  );
}

/** Tamaño constante en pantalla para un valor en píxeles. */
export const px = (v: number, view: View) => v / view.scale;
