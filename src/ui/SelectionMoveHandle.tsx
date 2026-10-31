import { useCallback, useId, useLayoutEffect, useRef, useState, type KeyboardEvent, type PointerEventHandler, type RefObject } from 'react';
import type { Pt } from '../lib/geom/vec';
import { Icon } from './Icon';
import { selectionMovePosition, type MoveHandlePosition } from './selectionMoveGeometry';
import './selectionMoveHandle.css';

export interface SelectionMoveHandleProps {
  svgRef: RefObject<SVGSVGElement>;
  /** Corners in the visible SVG's coordinate system, after assembly transforms. */
  corners: readonly Pt[];
  /** The caller owns capture and move/up handlers, usually on the SVG itself. */
  onPointerDown: PointerEventHandler<HTMLButtonElement>;
  label?: string;
  disabled?: boolean;
  /** Screen pixels: the caller converts the delta to the selected view's mm. */
  onNudge?: (deltaPixels: Pt) => void;
}

/** Mount as an HTML sibling of the SVG inside a position:relative container. */
export function SelectionMoveHandle({ svgRef, corners, onPointerDown, label = 'Mover bordado seleccionado', disabled = false, onNudge }: SelectionMoveHandleProps) {
  const layerRef = useRef<HTMLDivElement>(null);
  const cornersRef = useRef(corners);
  cornersRef.current = corners;
  const [position, setPosition] = useState<MoveHandlePosition>();
  const instructionsId = useId();

  const measure = useCallback(() => {
    const svg = svgRef.current, layer = layerRef.current;
    const matrix = svg?.getScreenCTM();
    let next: MoveHandlePosition | undefined;
    if (svg && layer && matrix && layer.clientWidth > 0 && layer.clientHeight > 0) {
      const canvas = svg.getBoundingClientRect(), overlay = layer.getBoundingClientRect();
      // Undo host CSS scaling as well as document scroll. SVG's CTM already
      // handles viewBox zoom, preserveAspectRatio and letterboxing.
      const scaleX = overlay.width / layer.clientWidth, scaleY = overlay.height / layer.clientHeight;
      if (scaleX > 0 && scaleY > 0) {
        const toLocal = (x: number, y: number): Pt => ({ x: (x - overlay.left) / scaleX, y: (y - overlay.top) / scaleY });
        const points = cornersRef.current.map(p => toLocal(matrix.a * p.x + matrix.c * p.y + matrix.e, matrix.b * p.x + matrix.d * p.y + matrix.f));
        const min = toLocal(Math.max(canvas.left, overlay.left), Math.max(canvas.top, overlay.top));
        const max = toLocal(Math.min(canvas.right, overlay.right), Math.min(canvas.bottom, overlay.bottom));
        next = selectionMovePosition(points, { minX: min.x, minY: min.y, maxX: max.x, maxY: max.y });
      }
    }
    setPosition(previous => {
      if (!previous || !next) return previous === next ? previous : next;
      return previous.side === next.side && Math.abs(previous.x - next.x) < .1 && Math.abs(previous.y - next.y) < .1 ? previous : next;
    });
  }, [svgRef]);

  // Selection from the list and live dragging update the anchor before paint.
  useLayoutEffect(measure);
  useLayoutEffect(() => {
    const svg = svgRef.current, layer = layerRef.current;
    if (!svg || !layer) return;
    let frame = 0;
    const schedule = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(measure);
    };
    const resize = new ResizeObserver(schedule);
    resize.observe(svg);
    resize.observe(layer);
    const attributes = new MutationObserver(schedule);
    attributes.observe(svg, { attributes: true, attributeFilter: ['viewBox', 'preserveAspectRatio', 'width', 'height'] });
    window.addEventListener('resize', schedule);
    window.addEventListener('scroll', schedule, true);
    window.visualViewport?.addEventListener('resize', schedule);
    return () => {
      cancelAnimationFrame(frame);
      resize.disconnect();
      attributes.disconnect();
      window.removeEventListener('resize', schedule);
      window.removeEventListener('scroll', schedule, true);
      window.visualViewport?.removeEventListener('resize', schedule);
    };
  }, [measure, svgRef]);

  function keyDown(event: KeyboardEvent<HTMLButtonElement>) {
    if (!onNudge || disabled || event.altKey || event.ctrlKey || event.metaKey) return;
    const amount = event.shiftKey ? 10 : 1;
    const delta: Record<string, Pt> = {
      ArrowLeft: { x: -amount, y: 0 }, ArrowRight: { x: amount, y: 0 },
      ArrowUp: { x: 0, y: -amount }, ArrowDown: { x: 0, y: amount }
    };
    if (!delta[event.key]) return;
    event.preventDefault();
    event.stopPropagation();
    onNudge(delta[event.key]);
  }

  return <div ref={layerRef} className="selection-move-layer">
    {position && <button type="button" className="selection-move-handle" data-side={position.side}
      style={{ left: position.x, top: position.y }} aria-label={label} title={label}
      aria-describedby={instructionsId} disabled={disabled} onKeyDown={keyDown}
      onClick={event => { event.preventDefault(); event.stopPropagation(); }}
      onPointerDown={event => {
        if (disabled || event.button !== 0) return;
        event.preventDefault();
        event.stopPropagation();
        event.currentTarget.focus({ preventScroll: true });
        onPointerDown(event);
      }}>
      <Icon name="move" size={23} />
    </button>}
    <span id={instructionsId} className="sr-only">Arrastra este botón para mover la selección.{onNudge ? ' También puedes usar las flechas del teclado; con Mayús avanzas más.' : ''}</span>
  </div>;
}
