import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useApp } from '../../store/app';
import { Board, BoardPointer, useViewport } from '../../ui/Board';
import { useHistory } from '../../ui/useHistory';
import { Icon } from '../../ui/Icon';
import { Button, Empty, FilePick, IconButton, SaveIndicator, Segmented, Sheet, Field, LengthInput, TextInput, Select } from '../../ui/components';
import { goBack, navigate } from '../../ui/router';
import { Pt, bboxOf, dist } from '../../lib/geom/vec';
import { formatLength } from '../../lib/units';
import { uid } from '../../lib/ids';
import { loadBitmap } from '../../lib/image';
import { getFile } from '../../lib/db';
import { DesignDoc, DesignElement, DesignView, ZoneType, ZONE_TYPE_LABEL, newElement, elementCorners, newDesign } from './model';
import { ElementSvg, RenderMode, StudioDefs, ViewBase } from './render';
import { addElement, expandSelection, refreshGroups, removeElements, toLocal, touch, updateElements, duplicateElements, groupElements, viewElements, techniqueDefaults } from './ops';
import { Inspector } from './Inspector';
import { LayersPanel } from './LayersPanel';
import { ViewsPanel, AddViewSheet } from './ViewsPanel';
import { ShapesSheet } from './ShapesSheet';
import { findShape } from '../../data/shapes';
import { CATALOG } from '../../data/catalog';
import { viewsFromModel, templateScaleFor, currentValues } from '../../store/projects';

type Tool = 'seleccionar' | 'forma' | 'organica' | 'lapiz' | 'pincel' | 'linea' | 'pluma' | 'texto' | 'recorte' | 'zona' | 'medir' | 'calibrar' | 'referencia';
type Panel = 'elemento' | 'capas' | 'vistas';

const TOOLS: { key: Tool; label: string; icon: string; hint: string }[] = [
  { key: 'seleccionar', label: 'Elegir', icon: 'select', hint: 'Toca un elemento para elegirlo; arrástralo o usa los tiradores para escalar y girar.' },
  { key: 'forma', label: 'Formas', icon: 'shape', hint: 'Arrastra para dibujar la forma o toca para insertarla.' },
  { key: 'organica', label: 'Orgánicas', icon: 'leaf', hint: 'Toca el lienzo para colocar la figura elegida.' },
  { key: 'lapiz', label: 'Lápiz', icon: 'pencil', hint: 'Dibuja a mano alzada: trazos finos para bordado o detalles.' },
  { key: 'pincel', label: 'Pincel', icon: 'brush', hint: 'Trazos anchos de pintura textil.' },
  { key: 'linea', label: 'Línea', icon: 'line', hint: 'Arrastra para trazar una línea recta (cintas, pespuntes).' },
  { key: 'pluma', label: 'Pluma', icon: 'pen', hint: 'Toca para agregar puntos de un polígono o curva; ciérralo al terminar.' },
  { key: 'texto', label: 'Texto', icon: 'text', hint: 'Toca donde quieras el texto.' },
  { key: 'recorte', label: 'Recortar', icon: 'crop', hint: 'Con un elemento elegido, marca los puntos del recorte.' },
  { key: 'zona', label: 'Zona', icon: 'mask', hint: 'Marca el contorno de una zona de la prenda (delantero, manga…).' },
  { key: 'medir', label: 'Medir', icon: 'ruler', hint: 'Arrastra entre dos puntos para medir.' },
  { key: 'calibrar', label: 'Calibrar', icon: 'target', hint: 'Toca dos puntos de la foto con una distancia conocida.' },
  { key: 'referencia', label: 'Línea ref.', icon: 'flag', hint: 'Toca para fijar la línea de referencia (cintura, hombro…) que comparten las vistas.' }
];

type Drag =
  | { kind: 'move'; start: Pt; d0: DesignDoc; ids: string[] }
  | { kind: 'scale'; start: Pt; d0: DesignDoc; ids: string[]; center: Pt; axis: 'xy' | 'x' | 'y'; el: DesignElement }
  | { kind: 'rotate'; start: Pt; d0: DesignDoc; ids: string[]; center: Pt }
  | { kind: 'draw'; pts: Pt[] }
  | { kind: 'shape'; start: Pt; cur: Pt }
  | { kind: 'measure'; start: Pt; cur: Pt };

export function StudioEditor({ projectId }: { projectId: string }) {
  const project = useApp((s) => s.projects[projectId]);
  const fabrics = useApp((s) => s.fabrics);
  const updateProject = useApp((s) => s.updateProject);
  const addFile = useApp((s) => s.addFile);
  const unit = useApp((s) => s.settings.unit);
  const onCommit = useCallback((d: DesignDoc | undefined) => d && updateProject(projectId, (p) => ({ ...p, design: d })), [projectId, updateProject]);
  const hist = useHistory<DesignDoc | undefined>(project?.design, onCommit);
  const doc = hist.state;
  const vp = useViewport();
  const [viewId, setViewId] = useState<string | undefined>(doc?.views[0]?.id);
  const [tool, setTool] = useState<Tool>('seleccionar');
  const [sel, setSel] = useState<string[]>([]);
  const [multi, setMulti] = useState(false);
  const [mode, setMode] = useState<RenderMode>('apariencia');
  const [panel, setPanel] = useState<Panel>('elemento');
  const [mobilePanel, setMobilePanel] = useState<Panel | null>(null);
  const [shapeKind, setShapeKind] = useState<'rect' | 'ellipse' | 'polygon' | 'star'>('ellipse');
  const [organicId, setOrganicId] = useState('montana');
  const [showShapes, setShowShapes] = useState(false);
  const [pen, setPen] = useState<Pt[]>([]);
  const [readout, setReadout] = useState<string | null>(null);
  const [calibPts, setCalibPts] = useState<Pt[]>([]);
  const [calibAsk, setCalibAsk] = useState<[Pt, Pt] | null>(null);
  const [zoneAsk, setZoneAsk] = useState<Pt[] | null>(null);
  const [compare, setCompare] = useState<string | null>(null);
  const [addView, setAddView] = useState(false);
  const [hintVisible, setHintVisible] = useState(true);
  const drag = useRef<Drag | null>(null);
  const [live, setLive] = useState<Drag | null>(null);

  useEffect(() => {
    if (!hist.state && project?.design) hist.reset(project.design);
  }, [project?.design]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (doc && (!viewId || !doc.views.some((v) => v.id === viewId))) setViewId(doc.views[0]?.id);
  }, [doc, viewId]);
  useEffect(() => {
    setHintVisible(true);
    const t = setTimeout(() => setHintVisible(false), 4500);
    return () => clearTimeout(t);
  }, [tool]);

  const view = doc?.views.find((v) => v.id === viewId);
  const fitView = useCallback(() => {
    if (view) vp.fit({ minX: view.minX, minY: view.minY, maxX: view.minX + view.width, maxY: view.minY + view.height }, 36);
  }, [view, vp]);
  const lastFit = useRef<string | null>(null);
  useEffect(() => {
    if (view && lastFit.current !== view.id) {
      lastFit.current = view.id;
      setTimeout(fitView, 30);
    }
  }, [view, fitView]);

  const commit = useCallback((d: DesignDoc, prev?: DesignDoc) => hist.commit(refreshGroups(touch(d)), prev), [hist]);
  const histRef = useRef(hist);
  histRef.current = hist;
  const selRef = useRef(sel);
  selRef.current = sel;
  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).closest?.('input,textarea,select')) return;
      const h = histRef.current;
      const d = h.state;
      if (!d) return;
      const ids = selRef.current;
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) h.redo();
        else h.undo();
      } else if ((e.key === 'Delete' || e.key === 'Backspace') && ids.length) {
        e.preventDefault();
        h.commit(removeElements(d, ids));
        setSel([]);
      } else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'd' && ids.length) {
        e.preventDefault();
        const r = duplicateElements(d, ids);
        h.commit(r.doc);
        setSel(r.ids);
      } else if (e.key.startsWith('Arrow') && ids.length) {
        e.preventDefault();
        const step = e.shiftKey ? 10 : 1;
        const dx = e.key === 'ArrowLeft' ? -step : e.key === 'ArrowRight' ? step : 0;
        const dy = e.key === 'ArrowUp' ? -step : e.key === 'ArrowDown' ? step : 0;
        h.commit(refreshGroups(updateElements(d, expandSelection(d, ids), (el) => ({ ...el, x: el.x + dx, y: el.y + dy }))));
      } else if (e.key === 'Escape') {
        setPen((p) => (p.length ? [] : p));
        setSel((s) => (s.length ? [] : s));
      }
    };
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, []);

  if (!project) return <div className="page"><Empty icon="proyectos" title="Proyecto no encontrado" action={<Button onClick={() => navigate('/estudio')}>Volver</Button>} /></div>;
  if (!doc || !doc.views.length || !view) return <ChooseBase projectId={projectId} />;

  const els = viewElements(doc, view.id);
  const selected = doc.elements.filter((e) => sel.includes(e.id));
  const single = selected.length === 1 ? selected[0] : undefined;
  const hs = 9 / vp.view.scale;
  const prefix = 's-';

  const hitElement = (w: Pt): DesignElement | undefined => {
    for (let i = els.length - 1; i >= 0; i--) {
      const e = els[i];
      if (e.hidden || e.locked || e.kind === 'grupo') continue;
      const l = toLocal(e, w);
      const pad = Math.max(2, 6 / vp.view.scale);
      if (Math.abs(l.x) <= e.w / 2 + pad && Math.abs(l.y) <= e.h / 2 + pad) return e.parentId ? doc.elements.find((g) => g.id === e.parentId) ?? e : e;
    }
    return undefined;
  };

  const handlesFor = (e: DesignElement) => {
    const c = elementCorners(e);
    const top = { x: (c[0].x + c[1].x) / 2, y: (c[0].y + c[1].y) / 2 };
    const r = (e.rotation * Math.PI) / 180;
    const up = { x: Math.sin(r), y: -Math.cos(r) };
    const rot = { x: top.x + up.x * 26 / vp.view.scale, y: top.y + up.y * 26 / vp.view.scale };
    const right = { x: (c[1].x + c[2].x) / 2, y: (c[1].y + c[2].y) / 2 };
    const bottom = { x: (c[2].x + c[3].x) / 2, y: (c[2].y + c[3].y) / 2 };
    return { corners: c, rot, right, bottom };
  };

  const createAt = (el: DesignElement) => {
    commit(addElement(doc, el));
    setSel([el.id]);
    setTool('seleccionar');
  };

  const handlers = {
    onDown: (bp: BoardPointer): boolean => {
      const w = bp.world;
      const shift = (bp.event as PointerEvent).shiftKey || multi;
      if (tool === 'seleccionar') {
        if (single && !single.locked) {
          const h = handlesFor(single);
          const near = (p: Pt) => dist(p, w) < hs * 1.6;
          if (near(h.rot)) {
            drag.current = { kind: 'rotate', start: w, d0: doc, ids: expandSelection(doc, [single.id]), center: { x: single.x, y: single.y } };
            return true;
          }
          if (h.corners.some(near)) {
            drag.current = { kind: 'scale', start: w, d0: doc, ids: expandSelection(doc, [single.id]), center: { x: single.x, y: single.y }, axis: 'xy', el: single };
            return true;
          }
          if (near(h.right)) {
            drag.current = { kind: 'scale', start: w, d0: doc, ids: expandSelection(doc, [single.id]), center: { x: single.x, y: single.y }, axis: 'x', el: single };
            return true;
          }
          if (near(h.bottom)) {
            drag.current = { kind: 'scale', start: w, d0: doc, ids: expandSelection(doc, [single.id]), center: { x: single.x, y: single.y }, axis: 'y', el: single };
            return true;
          }
        }
        const hit = hitElement(w);
        if (!hit) {
          if (!shift) setSel([]);
          return false;
        }
        let next = sel;
        if (shift) next = sel.includes(hit.id) ? sel.filter((x) => x !== hit.id) : [...sel, hit.id];
        else if (!sel.includes(hit.id)) next = [hit.id];
        setSel(next);
        drag.current = { kind: 'move', start: w, d0: doc, ids: expandSelection(doc, next) };
        return true;
      }
      if (tool === 'lapiz' || tool === 'pincel' || tool === 'linea') {
        drag.current = { kind: 'draw', pts: [w] };
        setLive(drag.current);
        return true;
      }
      if (tool === 'forma') {
        drag.current = { kind: 'shape', start: w, cur: w };
        setLive(drag.current);
        return true;
      }
      if (tool === 'medir') {
        drag.current = { kind: 'measure', start: w, cur: w };
        return true;
      }
      if (tool === 'organica') {
        const s = findShape(organicId)!;
        // En parches pequeños la figura empieza proporcional a la base.
        const W = Math.min(80, view.width * 0.35);
        createAt(newElement(view.id, { kind: 'organica', organicId, name: s.label, x: w.x, y: w.y, w: W, h: W / s.aspect, fill: { type: 'color', color: '#b9c9bf' }, ...techniqueDefaults('aplicacion') }));
        return true;
      }
      if (tool === 'texto') {
        const content = 'Texto';
        const h = 18;
        createAt(newElement(view.id, { kind: 'texto', name: 'Texto', text: { content, font: 'sans', weight: 600 }, x: w.x, y: w.y, w: h * 0.62 * content.length, h, fill: { type: 'color', color: '#1d2420' }, technique: 'bordado', backing: 'desprendible' }));
        setPanel('elemento');
        return true;
      }
      if (tool === 'pluma' || tool === 'recorte' || tool === 'zona') {
        if (pen.length >= 3 && dist(w, pen[0]) < hs * 1.6) {
          finishPen(true);
          return true;
        }
        setPen([...pen, w]);
        return true;
      }
      if (tool === 'calibrar') {
        const next = [...calibPts, w];
        if (next.length === 2) {
          setCalibAsk([next[0], next[1]]);
          setCalibPts([]);
        } else setCalibPts(next);
        return true;
      }
      if (tool === 'referencia') {
        commit({ ...doc, views: doc.views.map((v) => (v.id === view.id ? { ...v, refY: w.y } : v)) });
        setTool('seleccionar');
        return true;
      }
      return false;
    },
    onMove: (bp: BoardPointer) => {
      const d = drag.current;
      if (!d) return;
      const w = bp.world;
      if (d.kind === 'move') {
        const dx = w.x - d.start.x;
        const dy = w.y - d.start.y;
        hist.preview(refreshGroups(updateElements(d.d0, d.ids, (e) => ({ ...e, x: d.d0.elements.find((x) => x.id === e.id)!.x + dx, y: d.d0.elements.find((x) => x.id === e.id)!.y + dy }))));
        setReadout(`Δ ${formatLength(dx, unit)} · ${formatLength(dy, unit)}`);
      } else if (d.kind === 'scale') {
        const l0 = toLocal({ ...d.el }, d.start);
        const l1 = toLocal({ ...d.el }, w);
        let kx = Math.abs(l0.x) > 0.01 ? l1.x / l0.x : 1;
        let ky = Math.abs(l0.y) > 0.01 ? l1.y / l0.y : 1;
        if (d.axis === 'xy') {
          const k = Math.max(0.02, dist(w, d.center) / Math.max(0.01, dist(d.start, d.center)));
          kx = ky = k;
        } else if (d.axis === 'x') ky = 1;
        else kx = 1;
        kx = Math.max(0.02, kx);
        ky = Math.max(0.02, ky);
        const r = (d.el.rotation * Math.PI) / 180;
        hist.preview(
          refreshGroups(
            updateElements(d.d0, d.ids, (e) => {
              const e0 = d.d0.elements.find((x) => x.id === e.id)!;
              // Escalar posiciones relativas en los ejes del elemento elegido.
              const rx = e0.x - d.center.x;
              const ry = e0.y - d.center.y;
              const lx = rx * Math.cos(-r) - ry * Math.sin(-r);
              const ly = rx * Math.sin(-r) + ry * Math.cos(-r);
              const nx = lx * kx;
              const ny = ly * ky;
              const sameAxes = Math.abs(((e0.rotation - d.el.rotation) % 180)) < 0.01;
              return {
                ...e,
                x: d.center.x + nx * Math.cos(r) - ny * Math.sin(r),
                y: d.center.y + nx * Math.sin(r) + ny * Math.cos(r),
                w: e0.w * (sameAxes ? kx : Math.sqrt(kx * ky)),
                h: e0.h * (sameAxes ? ky : Math.sqrt(kx * ky))
              };
            })
          )
        );
        const target = d.d0.elements.find((x) => x.id === d.el.id)!;
        setReadout(`${formatLength(target.w * kx, unit)} × ${formatLength(target.h * ky, unit)}`);
      } else if (d.kind === 'rotate') {
        const a0 = Math.atan2(d.start.y - d.center.y, d.start.x - d.center.x);
        const a1 = Math.atan2(w.y - d.center.y, w.x - d.center.x);
        let deg = ((a1 - a0) * 180) / Math.PI;
        if (!(bp.event as PointerEvent).altKey) deg = Math.round(deg / 5) * 5;
        const r = (deg * Math.PI) / 180;
        hist.preview(
          refreshGroups(
            updateElements(d.d0, d.ids, (e) => {
              const e0 = d.d0.elements.find((x) => x.id === e.id)!;
              const rx = e0.x - d.center.x;
              const ry = e0.y - d.center.y;
              return { ...e, x: d.center.x + rx * Math.cos(r) - ry * Math.sin(r), y: d.center.y + rx * Math.sin(r) + ry * Math.cos(r), rotation: (((e0.rotation + deg) % 360) + 360) % 360 };
            })
          )
        );
        setReadout(`${Math.round(deg)}°`);
      } else if (d.kind === 'draw') {
        const last = d.pts[d.pts.length - 1];
        if (tool === 'linea') d.pts = [d.pts[0], w];
        else if (dist(last, w) > 1.2 / vp.view.scale) d.pts.push(w);
        setLive({ ...d });
      } else if (d.kind === 'shape') {
        d.cur = w;
        setLive({ ...d });
        setReadout(`${formatLength(Math.abs(w.x - d.start.x), unit)} × ${formatLength(Math.abs(w.y - d.start.y), unit)}`);
      } else if (d.kind === 'measure') {
        d.cur = w;
        setReadout(`Distancia: ${formatLength(dist(d.start, w), unit, { decimals: unit === 'cm' ? 2 : 3 })}`);
        setLive({ ...d });
      }
    },
    onUp: () => {
      const d = drag.current;
      drag.current = null;
      setLive(null);
      if (!d) return;
      if ((d.kind === 'move' || d.kind === 'scale' || d.kind === 'rotate') && hist.state && hist.state !== d.d0) hist.commit(hist.state, d.d0);
      if (d.kind === 'draw') {
        if (d.pts.length < 2) return;
        const b = bboxOf(d.pts);
        const W = Math.max(1, b.maxX - b.minX);
        const H = Math.max(1, b.maxY - b.minY);
        const cx = (b.minX + b.maxX) / 2;
        const cy = (b.minY + b.maxY) / 2;
        const pts = d.pts.map((p) => [(p.x - cx) / W, (p.y - cy) / H] as [number, number]);
        const brush = tool === 'pincel';
        createAt(
          newElement(view.id, {
            kind: 'trazo',
            name: tool === 'linea' ? 'Línea' : brush ? 'Pincelada' : 'Trazo',
            x: cx,
            y: cy,
            w: W,
            h: H,
            path: { pts, closed: false, smooth: tool !== 'linea' },
            fill: { type: 'ninguno' },
            stroke: { color: brush ? '#c0582d' : '#1d2420', width: brush ? 5 : tool === 'linea' ? 1.2 : 0.8, style: tool === 'linea' ? 'pespunte' : 'solida' },
            technique: brush ? 'pintura' : tool === 'linea' ? 'pespunte' : 'bordado',
            backing: brush ? 'ninguna' : 'desprendible'
          })
        );
      }
      if (d.kind === 'shape') {
        const W = Math.abs(d.cur.x - d.start.x);
        const H = Math.abs(d.cur.y - d.start.y);
        const tap = W < 3 && H < 3;
        createAt(newElement(view.id, { kind: 'forma', shape: { type: shapeKind, sides: shapeKind === 'polygon' ? 6 : 5, inner: 0.45 }, name: { rect: 'Rectángulo', ellipse: 'Elipse', polygon: 'Polígono', star: 'Estrella' }[shapeKind], x: tap ? d.start.x : (d.start.x + d.cur.x) / 2, y: tap ? d.start.y : (d.start.y + d.cur.y) / 2, w: tap ? 60 : W, h: tap ? 60 : H }));
      }
      setTimeout(() => setReadout(null), 1500);
    },
    onDoubleTap: () => {
      if ((tool === 'pluma' || tool === 'recorte' || tool === 'zona') && pen.length >= 3) finishPen(true);
    }
  };

  function finishPen(closed: boolean) {
    if (!doc || !view) return;
    const pts = pen;
    setPen([]);
    if (tool === 'zona') {
      if (pts.length >= 3) setZoneAsk(pts);
      return;
    }
    if (tool === 'recorte') {
      const el = single;
      if (!el || pts.length < 3) return;
      const clip = pts.map((p) => {
        const l = toLocal(el, p);
        return [l.x / el.w, l.y / el.h] as [number, number];
      });
      commit(updateElements(doc, [el.id], (e) => ({ ...e, clip })));
      setTool('seleccionar');
      return;
    }
    if (pts.length < 2) return;
    const b = bboxOf(pts);
    const W = Math.max(1, b.maxX - b.minX);
    const H = Math.max(1, b.maxY - b.minY);
    const cx = (b.minX + b.maxX) / 2;
    const cy = (b.minY + b.maxY) / 2;
    createAt(
      newElement(view.id, {
        kind: 'trazo',
        name: closed ? 'Forma libre' : 'Trazo',
        x: cx,
        y: cy,
        w: W,
        h: H,
        path: { pts: pts.map((p) => [(p.x - cx) / W, (p.y - cy) / H]), closed: closed && pts.length >= 3, smooth: false },
        fill: closed ? { type: 'color', color: '#d9c6a3' } : { type: 'ninguno' },
        stroke: closed ? null : { color: '#1d2420', width: 1, style: 'recta' }
      })
    );
  }

  const insertImage = async (files: File[]) => {
    for (const f of files) {
      const img = await loadBitmap(f);
      const fileId = await addFile(f, f.name);
      const W = 100;
      const H = (W * img.naturalHeight) / img.naturalWidth;
      createAt(newElement(view.id, { kind: 'imagen', name: f.name.replace(/\.[^.]+$/, ''), image: { fileId, naturalW: img.naturalWidth, naturalH: img.naturalHeight }, x: view.minX + view.width / 2, y: view.minY + view.height / 2, w: W, h: H, fill: { type: 'ninguno' }, technique: 'vinil' }));
    }
  };

  const compareDoc = compare ? project.designVersions.find((v) => v.id === compare)?.data : undefined;
  const compareView = compareDoc?.views.find((v) => v.kind === view.kind) ?? compareDoc?.views[0];
  const compareOffset = view.minX + view.width + 80 - (compareView?.minX ?? 0);

  const panelBody = (p: Panel) => {
    if (p === 'elemento') return <Inspector doc={doc} view={view} selected={selected} commit={commit} setSel={setSel} setTool={(t) => setTool(t as Tool)} projectId={projectId} />;
    if (p === 'capas') return <LayersPanel doc={doc} view={view} sel={sel} setSel={setSel} commit={commit} />;
    return <ViewsPanel doc={doc} view={view} commit={commit} setViewId={setViewId} onAdd={() => setAddView(true)} setTool={(t) => setTool(t as Tool)} />;
  };
  const toolInfo = TOOLS.find((t) => t.key === tool)!;
  const visibleTools = TOOLS.filter((t) => (t.key === 'calibrar' ? view.source.type === 'foto' : true));

  return (
    <div className="editor">
      <div className="ed-top">
        <IconButton icon="back" label="Volver" onClick={() => goBack(`/proyectos/${projectId}`)} />
        <div className="ed-title">
          {project.name}
          <div className="tiny faint" style={{ fontWeight: 400 }}>
            Estudio · {els.filter((e) => e.kind !== 'grupo').length} elementos en {view.label.toLowerCase()}
          </div>
        </div>
        <span className="desktop-only"><SaveIndicator /></span>
        <span className="desktop-only">
          <Segmented value={mode} onChange={setMode} options={[{ value: 'apariencia', label: 'Apariencia' }, { value: 'tecnica', label: 'Técnica' }]} />
        </span>
        <IconButton icon="undo" label="Deshacer" onClick={hist.undo} disabled={!hist.canUndo} />
        <IconButton icon="redo" label="Rehacer" onClick={hist.redo} disabled={!hist.canRedo} />
      </div>
      <div className="ed-body">
        <div className="ed-rail" role="toolbar" aria-label="Herramientas">
          {visibleTools.map((t) => (
            <button key={t.key} className="tool" aria-pressed={tool === t.key} onClick={() => (t.key === 'organica' ? (setTool('organica'), setShowShapes(true)) : setTool(t.key))} title={t.hint}>
              <Icon name={t.icon} />
              {t.label}
            </button>
          ))}
          <FilePick accept="image/png,image/jpeg" multiple onFiles={(f) => void insertImage(f)}>
            {(open) => (
              <button className="tool" onClick={open} title="Importar imagen o gráfico">
                <Icon name="image" />
                Imagen
              </button>
            )}
          </FilePick>
        </div>
        <div style={{ flex: 1, position: 'relative', display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          <div className="scroll-x" style={{ margin: 0, padding: '8px 10px', background: 'var(--surface)', borderBottom: '1px solid var(--line)' }}>
            {doc.views.map((v) => (
              <button key={v.id} className="filter-chip" aria-pressed={v.id === view.id} onClick={() => setViewId(v.id)} style={{ height: 32 }}>
                {v.label}
              </button>
            ))}
            <button className="filter-chip" onClick={() => setAddView(true)} style={{ height: 32 }}>
              + Vista
            </button>
            <span className="mobile-only" style={{ marginLeft: 'auto' }}>
              <Segmented value={mode} onChange={setMode} options={[{ value: 'apariencia', label: 'Apariencia' }, { value: 'tecnica', label: 'Técnica' }]} />
            </span>
          </div>
          <div style={{ flex: 1, position: 'relative', display: 'flex' }}>
            <Board vp={vp} handlers={handlers} unit={unit} grid={mode === 'tecnica'} cursor={tool === 'seleccionar' ? 'default' : 'crosshair'}>
              <StudioDefs doc={doc} view={view} fabrics={fabrics} prefix={prefix} />
              <ViewBase view={view} mode={mode} prefix={prefix} fabrics={fabrics} />
              {els.map((e) => (
                <ElementSvg key={e.id} el={e} mode={mode} prefix={prefix} doc={doc} fabrics={fabrics} />
              ))}
              <line x1={view.minX} x2={view.minX + view.width} y1={view.refY} y2={view.refY} stroke="var(--tape)" strokeWidth={1.2} strokeDasharray="6 4" vectorEffect="non-scaling-stroke" opacity={mode === 'tecnica' || tool === 'referencia' ? 1 : 0.45} />
              <text x={view.minX + 4 / vp.view.scale} y={view.refY - 4 / vp.view.scale} fontSize={11 / vp.view.scale} fill="var(--tape-ink)" style={{ fontFamily: 'var(--sans)' }}>
                {view.refLabel}
              </text>
              {mode === 'tecnica' && <TechnicalMarks doc={doc} view={view} els={els} scale={vp.view.scale} unit={unit} />}
              {compareView && compareDoc && (
                <g transform={`translate(${compareOffset} 0)`} opacity={0.95}>
                  <StudioDefs doc={compareDoc} view={compareView} fabrics={fabrics} prefix="c-" />
                  <ViewBase view={compareView} mode={mode} prefix="c-" fabrics={fabrics} />
                  {viewElements(compareDoc, compareView.id).map((e) => <ElementSvg key={e.id} el={e} mode={mode} prefix="c-" doc={compareDoc} fabrics={fabrics} />)}
                  <text x={compareView.minX} y={compareView.minY - 6 / vp.view.scale} fontSize={13 / vp.view.scale} fill="var(--ink-2)" style={{ fontFamily: 'var(--sans)' }}>
                    Versión {project.designVersions.find((v) => v.id === compare)?.n}
                  </text>
                </g>
              )}
              {selected.map((e) => (
                <polygon key={e.id} points={elementCorners(e).map((p) => `${p.x},${p.y}`).join(' ')} fill="none" stroke="var(--mat)" strokeWidth={1.4} strokeDasharray={e.kind === 'grupo' ? '5 3' : undefined} vectorEffect="non-scaling-stroke" />
              ))}
              {single && !single.locked && tool === 'seleccionar' && (
                <g>
                  {(() => {
                    const h = handlesFor(single);
                    const top = { x: (h.corners[0].x + h.corners[1].x) / 2, y: (h.corners[0].y + h.corners[1].y) / 2 };
                    return (
                      <>
                        <line x1={top.x} y1={top.y} x2={h.rot.x} y2={h.rot.y} stroke="var(--mat)" strokeWidth={1.2} vectorEffect="non-scaling-stroke" />
                        <circle cx={h.rot.x} cy={h.rot.y} r={hs * 0.8} fill="var(--surface)" stroke="var(--mat)" strokeWidth={1.6} vectorEffect="non-scaling-stroke" />
                        {h.corners.map((c, i) => <rect key={i} x={c.x - hs * 0.6} y={c.y - hs * 0.6} width={hs * 1.2} height={hs * 1.2} fill="var(--surface)" stroke="var(--mat)" strokeWidth={1.6} vectorEffect="non-scaling-stroke" />)}
                        {[h.right, h.bottom].map((c, i) => <circle key={i} cx={c.x} cy={c.y} r={hs * 0.5} fill="var(--mat)" stroke="#fff" strokeWidth={1.2} vectorEffect="non-scaling-stroke" />)}
                      </>
                    );
                  })()}
                </g>
              )}
              {pen.length > 0 && (
                <g>
                  <polyline points={pen.map((p) => `${p.x},${p.y}`).join(' ')} fill="none" stroke={tool === 'zona' ? 'var(--mat)' : tool === 'recorte' ? 'var(--thread)' : 'var(--ink)'} strokeWidth={1.6} strokeDasharray={tool === 'pluma' ? undefined : '5 3'} vectorEffect="non-scaling-stroke" />
                  {pen.map((p, i) => <circle key={i} cx={p.x} cy={p.y} r={hs * 0.5} fill={i === 0 ? 'var(--mat)' : 'var(--surface)'} stroke="var(--mat)" strokeWidth={1.4} vectorEffect="non-scaling-stroke" />)}
                </g>
              )}
              {live?.kind === 'draw' && <polyline points={live.pts.map((p) => `${p.x},${p.y}`).join(' ')} fill="none" stroke={tool === 'pincel' ? '#c0582d' : '#1d2420'} strokeWidth={tool === 'pincel' ? 5 : 1} strokeLinecap="round" strokeLinejoin="round" opacity={0.8} />}
              {live?.kind === 'shape' && (shapeKind === 'ellipse' ? <ellipse cx={(live.start.x + live.cur.x) / 2} cy={(live.start.y + live.cur.y) / 2} rx={Math.abs(live.cur.x - live.start.x) / 2} ry={Math.abs(live.cur.y - live.start.y) / 2} fill="rgba(36,88,74,0.12)" stroke="var(--mat)" vectorEffect="non-scaling-stroke" /> : <rect x={Math.min(live.start.x, live.cur.x)} y={Math.min(live.start.y, live.cur.y)} width={Math.abs(live.cur.x - live.start.x)} height={Math.abs(live.cur.y - live.start.y)} fill="rgba(36,88,74,0.12)" stroke="var(--mat)" vectorEffect="non-scaling-stroke" />)}
              {live?.kind === 'measure' && <line x1={live.start.x} y1={live.start.y} x2={live.cur.x} y2={live.cur.y} stroke="var(--tape)" strokeWidth={3} vectorEffect="non-scaling-stroke" />}
              {calibPts.map((p, i) => <circle key={i} cx={p.x} cy={p.y} r={hs * 0.7} fill="var(--tape)" stroke="var(--ink)" vectorEffect="non-scaling-stroke" />)}
            </Board>
            {readout && <div className="readout">{readout}</div>}
            {(tool === 'pluma' || tool === 'recorte' || tool === 'zona') && (
              <div className="float-bar" style={{ left: '50%', transform: 'translateX(-50%)', top: 10, gap: 6, padding: '4px 8px', alignItems: 'center' }}>
                <span className="small muted" style={{ padding: '0 4px' }}>{pen.length} puntos</span>
                <Button size="sm" onClick={() => setPen(pen.slice(0, -1))} disabled={!pen.length}>Quitar</Button>
                {tool === 'pluma' && <Button size="sm" onClick={() => finishPen(false)} disabled={pen.length < 2}>Terminar abierta</Button>}
                <Button size="sm" variant="primary" onClick={() => finishPen(true)} disabled={pen.length < 3 || (tool === 'recorte' && !single)}>
                  {tool === 'zona' ? 'Guardar zona' : tool === 'recorte' ? 'Aplicar recorte' : 'Cerrar forma'}
                </Button>
              </div>
            )}
            {tool === 'forma' && (
              <div className="float-bar" style={{ left: '50%', transform: 'translateX(-50%)', top: 10, padding: 4 }}>
                <Segmented value={shapeKind} onChange={setShapeKind} options={[{ value: 'ellipse', label: 'Elipse' }, { value: 'rect', label: 'Rectángulo' }, { value: 'polygon', label: 'Polígono' }, { value: 'star', label: 'Estrella' }]} />
              </div>
            )}
            {tool === 'organica' && (
              <div className="float-bar" style={{ left: '50%', transform: 'translateX(-50%)', top: 10, padding: '4px 8px', alignItems: 'center', gap: 8 }}>
                <span className="small">{findShape(organicId)?.label}</span>
                <Button size="sm" onClick={() => setShowShapes(true)}>Cambiar figura</Button>
              </div>
            )}
            {sel.length > 1 && tool === 'seleccionar' && (
              <div className="float-bar" style={{ left: '50%', transform: 'translateX(-50%)', top: 10 }}>
                <IconButton icon="group" label="Agrupar" onClick={() => { const r = groupElements(doc, sel, view.id); commit(r.doc); setSel([r.id]); }} />
                <IconButton icon="copy" label="Duplicar" onClick={() => { const r = duplicateElements(doc, sel); commit(r.doc); setSel(r.ids); }} />
                <IconButton icon="trash" label="Eliminar" onClick={() => { commit(removeElements(doc, sel)); setSel([]); }} />
              </div>
            )}
            {hintVisible && <div className="status-pill">{toolInfo.hint}</div>}
            <div className="float-bar zoom-pill">
              <IconButton icon="layers" label={multi ? 'Selección múltiple activada' : 'Selección múltiple'} pressed={multi} onClick={() => setMulti(!multi)} />
              <IconButton icon="history" label="Comparar con una versión" pressed={!!compare} onClick={() => setCompare(compare ? null : project.designVersions[project.designVersions.length - 1]?.id ?? null)} disabled={!project.designVersions.length} />
              <IconButton icon="fit" label="Ajustar a la vista" onClick={fitView} />
            </div>
          </div>
        </div>
        <aside className="ed-side" aria-label="Panel">
          <div className="side-tabs">
            <Segmented value={panel} onChange={setPanel} options={[{ value: 'elemento', label: 'Elemento' }, { value: 'capas', label: 'Capas' }, { value: 'vistas', label: 'Vistas' }]} />
          </div>
          <div className="side-body">{panelBody(panel)}</div>
        </aside>
      </div>
      <div className="ed-bottom" role="toolbar" aria-label="Herramientas">
        <button className="tool" onClick={() => setMobilePanel('elemento')} aria-pressed={false}>
          <Icon name="palette" />
          Propiedades
        </button>
        <button className="tool" onClick={() => setMobilePanel('capas')}>
          <Icon name="layers" />
          Capas
        </button>
        <button className="tool" onClick={() => setMobilePanel('vistas')}>
          <Icon name="grid" />
          Vistas
        </button>
        <span style={{ width: 1, background: 'var(--line)', margin: '8px 4px', flex: 'none' }} />
        {visibleTools.map((t) => (
          <button key={t.key} className="tool" aria-pressed={tool === t.key} onClick={() => (t.key === 'organica' ? (setTool('organica'), setShowShapes(true)) : setTool(t.key))}>
            <Icon name={t.icon} />
            {t.label}
          </button>
        ))}
        <FilePick accept="image/png,image/jpeg" multiple onFiles={(f) => void insertImage(f)}>
          {(open) => (
            <button className="tool" onClick={open}>
              <Icon name="image" />
              Imagen
            </button>
          )}
        </FilePick>
      </div>
      {mobilePanel && (
        <Sheet title={{ elemento: single ? single.name : 'Propiedades', capas: 'Capas', vistas: 'Vistas y zonas' }[mobilePanel]} onClose={() => setMobilePanel(null)}>
          {panelBody(mobilePanel)}
        </Sheet>
      )}
      {showShapes && <ShapesSheet value={organicId} onPick={(id) => { setOrganicId(id); setShowShapes(false); setTool('organica'); }} onClose={() => setShowShapes(false)} />}
      {addView && <AddViewSheet project={project} doc={doc} onClose={() => setAddView(false)} commit={(d, id) => { commit(d); setViewId(id); }} />}
      {calibAsk && <CalibrateViewSheet a={calibAsk[0]} b={calibAsk[1]} view={view} doc={doc} commit={commit} onClose={() => { setCalibAsk(null); setTool('seleccionar'); }} />}
      {zoneAsk && <ZoneSheet pts={zoneAsk} view={view} doc={doc} commit={commit} onClose={() => { setZoneAsk(null); setTool('seleccionar'); }} />}
    </div>
  );
}

function TechnicalMarks({ doc, view, els, scale, unit }: { doc: DesignDoc; view: DesignView; els: DesignElement[]; scale: number; unit: 'cm' | 'in' }) {
  const fs = 11 / scale;
  const cx = view.seams?.center ?? 0;
  const items = els.filter((e) => !e.hidden && e.kind !== 'grupo');
  void doc;
  return (
    <g style={{ fontFamily: 'var(--sans)' }}>
      <line x1={cx} x2={cx} y1={view.minY} y2={view.minY + view.height} stroke="var(--tape)" strokeWidth={0.8} strokeDasharray="2 3" vectorEffect="non-scaling-stroke" />
      {items.map((e, i) => {
        const b = bboxOf(elementCorners(e));
        return (
          <g key={e.id}>
            <circle cx={b.maxX + 8 / scale} cy={b.minY} r={8 / scale} fill="var(--ink)" />
            <text x={b.maxX + 8 / scale} y={b.minY} fontSize={fs} textAnchor="middle" dominantBaseline="central" fill="var(--paper)" fontWeight={700}>
              {i + 1}
            </text>
            <line x1={b.minX} x2={b.maxX} y1={b.maxY + 6 / scale} y2={b.maxY + 6 / scale} stroke="var(--tape-ink)" strokeWidth={1} vectorEffect="non-scaling-stroke" />
            <text x={(b.minX + b.maxX) / 2} y={b.maxY + 18 / scale} fontSize={fs} textAnchor="middle" fill="var(--tape-ink)">
              {formatLength(e.w, unit)} × {formatLength(e.h, unit)}
            </text>
            <text x={(b.minX + b.maxX) / 2} y={b.maxY + 31 / scale} fontSize={fs * 0.9} textAnchor="middle" fill="var(--ink-3)">
              {formatLength(Math.abs(e.y - view.refY), unit)} {e.y >= view.refY ? 'bajo' : 'sobre'} {view.refLabel.toLowerCase()}
            </text>
          </g>
        );
      })}
    </g>
  );
}

function CalibrateViewSheet({ a, b, view, doc, commit, onClose }: { a: Pt; b: Pt; view: DesignView; doc: DesignDoc; commit: (d: DesignDoc) => void; onClose: () => void }) {
  const [mm, setMm] = useState<number | undefined>(100);
  const d = dist(a, b);
  const apply = () => {
    if (!mm || d < 0.001) return;
    const k = mm / d;
    // Reescala la vista de foto y todo lo dibujado sobre ella, alrededor del origen de la foto.
    const ox = view.minX;
    const oy = view.minY;
    const sc = (x: number, o: number) => o + (x - o) * k;
    const scalePath = (s: string) => {
      const nums = s.match(/-?\d+(?:\.\d+)?/g) ?? [];
      let i = 0;
      return s.replace(/-?\d+(?:\.\d+)?/g, () => {
        const v = Number(nums[i]);
        const r = i % 2 === 0 ? sc(v, ox) : sc(v, oy);
        i++;
        return String(Math.round(r * 1000) / 1000);
      });
    };
    const mmPerPx = (view.width * k) / (view.photo?.pxW ?? 1);
    const nextView: DesignView = { ...view, width: view.width * k, height: view.height * k, refY: sc(view.refY, oy), photo: view.photo ? { ...view.photo, mmPerPx } : view.photo, zones: view.zones.map((z) => ({ ...z, d: scalePath(z.d) })) };
    commit({
      ...doc,
      views: doc.views.map((v) => (v.id === view.id ? nextView : v)),
      elements: doc.elements.map((e) => (e.viewId === view.id ? { ...e, x: sc(e.x, ox), y: sc(e.y, oy), w: e.w * k, h: e.h * k } : e))
    });
    onClose();
  };
  return (
    <Sheet title="Calibrar la foto" onClose={onClose}>
      <div className="stack">
        <p className="muted">¿Cuánto mide en la prenda real la distancia que marcaste? Por ejemplo, el ancho de pecho de axila a axila o el largo de un bolsillo.</p>
        <Field label="Distancia real">
          <LengthInput mm={mm} onChange={setMm} min={1} />
        </Field>
        <Button variant="primary" block onClick={apply} disabled={!mm}>Calibrar</Button>
        <p className="tiny faint">Todo lo dibujado sobre esta foto se reescala con ella. La calibración vale para el plano de la foto; las zonas inclinadas o curvas quedan aproximadas.</p>
      </div>
    </Sheet>
  );
}

function ZoneSheet({ pts, view, doc, commit, onClose }: { pts: Pt[]; view: DesignView; doc: DesignDoc; commit: (d: DesignDoc) => void; onClose: () => void }) {
  const [label, setLabel] = useState('');
  const [type, setType] = useState<ZoneType>('delantero');
  const save = () => {
    const d = 'M' + pts.map((p) => `${Math.round(p.x * 100) / 100} ${Math.round(p.y * 100) / 100}`).join(' L') + ' Z';
    commit({ ...doc, views: doc.views.map((v) => (v.id === view.id ? { ...v, zones: [...v.zones, { id: uid('zona'), label: label.trim() || ZONE_TYPE_LABEL[type], type, d }] } : v)) });
    onClose();
  };
  return (
    <Sheet title="Nueva zona" onClose={onClose}>
      <div className="stack">
        <Field label="Tipo de zona">
          <Select value={type} onChange={setType} options={Object.entries(ZONE_TYPE_LABEL).map(([value, l]) => ({ value: value as ZoneType, label: l }))} />
        </Field>
        <Field label="Nombre">
          <TextInput value={label} onChange={setLabel} placeholder={ZONE_TYPE_LABEL[type]} />
        </Field>
        <Button variant="primary" block onClick={save}>Guardar zona</Button>
      </div>
    </Sheet>
  );
}

function ChooseBase({ projectId }: { projectId: string }) {
  const project = useApp((s) => s.projects[projectId]);
  const profiles = useApp((s) => s.profiles);
  const updateProject = useApp((s) => s.updateProject);
  const [open, setOpen] = useState(false);
  const [mid, setMid] = useState(project?.modelId ?? 'intervenir-camisa');
  const prof = project?.profileRef ? profiles[project.profileRef.profileId] : undefined;
  const fromModel = () => {
    const m = CATALOG.find((x) => x.id === mid)!;
    updateProject(projectId, (p) => ({ ...p, modelId: p.modelId ?? m.id, design: newDesign(viewsFromModel(m, templateScaleFor(m, prof?.kind, prof ? currentValues(prof) : undefined))) }), 'Diseño creado desde plantilla.');
  };
  const doc = useMemo(() => project?.design ?? newDesign([]), [project?.design]);
  if (!project) return null;
  return (
    <div className="page">
      <Empty
        icon="estudio"
        title="Elige la base del diseño"
        body="Usa el dibujo técnico de un modelo, las fotos de tu prenda o un parche independiente."
        action={
          <div className="stack" style={{ width: 'min(360px, 90vw)' }}>
            <Select value={mid} onChange={setMid} options={CATALOG.map((m) => ({ value: m.id, label: m.name }))} />
            <Button variant="primary" onClick={fromModel}>Usar plantilla</Button>
            <Button onClick={() => setOpen(true)}>Fotos, parche u otra base</Button>
          </div>
        }
      />
      {open && <AddViewSheet project={project} doc={doc} onClose={() => setOpen(false)} commit={(d) => updateProject(projectId, (p) => ({ ...p, design: d }))} />}
    </div>
  );
}

export async function photoViewFromFile(fileId: string, refId: string, label: string, kind: DesignView['kind'], mmPerPx?: number): Promise<DesignView> {
  const f = await getFile(fileId);
  const img = await loadBitmap(f!.blob);
  const k = mmPerPx ?? 600 / Math.max(img.naturalWidth, img.naturalHeight);
  return {
    id: uid('vista'),
    kind,
    label,
    source: { type: 'foto', referenceId: refId, fileId },
    minX: 0,
    minY: 0,
    width: img.naturalWidth * k,
    height: img.naturalHeight * k,
    photo: { pxW: img.naturalWidth, pxH: img.naturalHeight, mmPerPx },
    zones: [],
    refY: img.naturalHeight * k * 0.3,
    refLabel: 'Línea de referencia'
  };
}
