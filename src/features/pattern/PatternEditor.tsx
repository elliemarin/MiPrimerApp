import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useApp } from '../../store/app';
import { Board, useViewport, BoardPointer } from '../../ui/Board';
import { useHistory } from '../../ui/useHistory';
import { Icon } from '../../ui/Icon';
import { Button, Empty, IconButton, SaveIndicator, Segmented, Sheet } from '../../ui/components';
import { goBack, navigate } from '../../ui/router';
import { buildPattern, layoutMatrix, autoLayout, setOverride, PatternState, RefLayer } from '../../lib/pattern/engine';
import { cutOutline } from '../../lib/pattern/offset';
import { edgePolyline, edgeLength } from '../../lib/pattern/outline';
import { Pt, bboxOf, dist, distToSegment, matApply, matInvert, pointInPolygon, Mat, sub } from '../../lib/geom/vec';
import { formatLength } from '../../lib/units';
import { PieceSvg } from './PieceSvg';
import { ParamsPanel, PiecePanel, ReviewPanel, LayersPanel } from './panels';
import { ExportPanel } from './ExportPanel';
import { RefLayerSvg, useLayerPixels } from './RefLayer';
import { uid } from '../../lib/ids';
import { snapToEdge } from '../../lib/image';
import type { Piece } from '../../lib/pattern/types';
import { OverlaySvg } from './Overlays';
import { useFileUrl } from '../../ui/components';

export type Tool = 'mover' | 'puntos' | 'medir' | 'comparar' | 'trazar' | 'calibrar';
type PanelKey = 'medidas' | 'pieza' | 'revision' | 'capas' | 'exportar';

const TOOLS: { key: Tool; label: string; icon: string; hint: string }[] = [
  { key: 'mover', label: 'Mover', icon: 'move', hint: 'Toca una pieza para seleccionarla y arrástrala. Arrastra el fondo para desplazarte.' },
  { key: 'puntos', label: 'Puntos', icon: 'points', hint: 'Arrastra puntos y tiradores de curva. Los ajustes se guardan por punto y se revisan al regenerar.' },
  { key: 'medir', label: 'Medir', icon: 'ruler', hint: 'Toca un borde para medirlo o arrastra entre dos puntos.' },
  { key: 'comparar', label: 'Comparar', icon: 'compare', hint: 'Toca bordes para el lado A, cambia a B y compara longitudes.' },
  { key: 'trazar', label: 'Trazar', icon: 'pen', hint: 'Toca para agregar puntos sobre una referencia. Cierra la pieza al terminar.' },
  { key: 'calibrar', label: 'Calibrar', icon: 'target', hint: 'Toca dos puntos de la referencia separados por una distancia conocida.' }
];

const PANELS: { key: PanelKey; label: string; icon: string }[] = [
  { key: 'medidas', label: 'Medidas', icon: 'medidas' },
  { key: 'pieza', label: 'Pieza', icon: 'patronaje' },
  { key: 'revision', label: 'Revisión', icon: 'ok' },
  { key: 'capas', label: 'Capas', icon: 'layers' },
  { key: 'exportar', label: 'Exportar', icon: 'pdf' }
];

interface Readout {
  text: string;
  line?: [Pt, Pt];
}

export function PatternEditor({ projectId }: { projectId: string }) {
  const project = useApp((s) => s.projects[projectId]);
  const updateProject = useApp((s) => s.updateProject);
  const unit = useApp((s) => s.settings.unit);
  const screenPxPerMm = useApp((s) => s.settings.screenPxPerMm);
  const onCommit = useCallback((next: PatternState) => updateProject(projectId, (p) => ({ ...p, pattern: next })), [projectId, updateProject]);
  const initial = project?.pattern;
  const hist = useHistory<PatternState | undefined>(initial, onCommit as (v: PatternState | undefined) => void);
  const state = hist.state;
  const vp = useViewport();
  const [tool, setTool] = useState<Tool>('mover');
  const [panel, setPanel] = useState<PanelKey>('revision');
  const [mobilePanel, setMobilePanel] = useState<PanelKey | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [readout, setReadout] = useState<Readout | null>(null);
  const [cmpA, setCmpA] = useState<{ pieceId: string; edgeId: string }[]>([]);
  const [cmpB, setCmpB] = useState<{ pieceId: string; edgeId: string }[]>([]);
  const [cmpSide, setCmpSide] = useState<'A' | 'B'>('A');
  const [trace, setTrace] = useState<Pt[]>([]);
  const [assist, setAssist] = useState(true);
  const [calib, setCalib] = useState<{ layerId: string; a?: Pt; b?: Pt } | null>(null);
  const [calibAsk, setCalibAsk] = useState<{ layerId: string; a: Pt; b: Pt } | null>(null);
  const [showAllowance, setShowAllowance] = useState(true);
  const [cursor, setCursor] = useState<Pt | null>(null);
  const fitted = useRef(false);
  const drag = useRef<{ kind: 'piece' | 'node' | 'measure'; start: Pt; s0: PatternState; pieceId?: string; key?: string; base?: Pt; inv?: Mat; from?: Pt } | null>(null);

  const built = useMemo(() => (state ? buildPattern(state) : null), [state]);

  // Si el patrón se crea desde esta pantalla, se carga en el historial.
  useEffect(() => {
    if (!hist.state && project?.pattern) hist.reset(project.pattern);
  }, [project?.pattern]); // eslint-disable-line react-hooks/exhaustive-deps

  // Colocación inicial de piezas sin posición.
  useEffect(() => {
    if (!state || !built) return;
    const missing = built.pieces.filter((p) => !state.layout[p.id]);
    if (missing.length) {
      const auto = autoLayout(built.pieces, built.cuts, 1500, 40);
      const layout = { ...auto, ...state.layout };
      hist.reset({ ...state, layout });
      onCommit({ ...state, layout });
    }
  }, [built?.pieces.length]); // eslint-disable-line react-hooks/exhaustive-deps

  const pivots = useMemo(() => {
    const m = new Map<string, Pt>();
    if (!built) return m;
    for (const p of built.pieces) {
      const c = built.cuts.get(p.id);
      if (!c) continue;
      const b = bboxOf(c.points);
      m.set(p.id, { x: (b.minX + b.maxX) / 2, y: (b.minY + b.maxY) / 2 });
    }
    return m;
  }, [built]);

  const matOf = useCallback((id: string): Mat => layoutMatrix(state?.layout[id], pivots.get(id)), [state, pivots]);

  const worldBBox = useCallback(() => {
    if (!built) return { minX: 0, minY: 0, maxX: 500, maxY: 500 };
    const pts: Pt[] = [];
    for (const p of built.pieces) {
      const c = built.cuts.get(p.id);
      if (!c) continue;
      const m = matOf(p.id);
      for (const q of c.points) pts.push(matApply(m, q));
    }
    for (const l of state?.refLayers ?? []) if (l.visible) pts.push({ x: l.x, y: l.y }, { x: l.x + l.pxW * l.mmPerPx, y: l.y + l.pxH * l.mmPerPx });
    return pts.length ? bboxOf(pts) : { minX: 0, minY: 0, maxX: 500, maxY: 500 };
  }, [built, matOf, state?.refLayers]);

  useEffect(() => {
    if (!fitted.current && built && (built.pieces.length || state?.refLayers?.length)) {
      fitted.current = true;
      setTimeout(() => vp.fit(worldBBox(), 50), 30);
    }
  }, [built, vp, worldBBox, state?.refLayers?.length]);

  // Atajos de teclado (oyente único con referencia al historial actual).
  const histRef = useRef(hist);
  histRef.current = hist;
  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).closest?.('input,textarea,select')) return;
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) histRef.current.redo();
        else histRef.current.undo();
      } else if (e.key === 'Escape') {
        setTrace((t) => (t.length ? [] : t));
        setReadout((r) => (r ? null : r));
      }
    };
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, []);
  // La pista de la herramienta se muestra unos segundos al cambiarla.
  const [hintVisible, setHintVisible] = useState(true);
  useEffect(() => {
    setHintVisible(true);
    const t = setTimeout(() => setHintVisible(false), 4500);
    return () => clearTimeout(t);
  }, [tool]);

  const layers = state?.refLayers ?? [];
  const topLayer = layers.filter((l) => l.visible).slice(-1)[0];
  const layerPixels = useLayerPixels(tool === 'trazar' && assist ? topLayer : undefined);

  if (!project) return <div className="page"><Empty icon="proyectos" title="Proyecto no encontrado" action={<Button onClick={() => navigate('/patronaje')}>Volver</Button>} /></div>;
  if (!state) return <NoPattern projectId={projectId} />;

  const pieces = built?.pieces ?? [];
  const sel = pieces.find((p) => p.id === selected);
  const screenTol = 14 / vp.view.scale;

  const hitPiece = (w: Pt): Piece | undefined => {
    for (let i = pieces.length - 1; i >= 0; i--) {
      const p = pieces[i];
      const c = built!.cuts.get(p.id);
      if (!c) continue;
      const local = matApply(matInvert(matOf(p.id)), w);
      if (pointInPolygon(local, c.points)) return p;
    }
    return undefined;
  };
  const hitEdge = (w: Pt): { piece: Piece; edgeId: string } | undefined => {
    let best: { piece: Piece; edgeId: string; d: number } | undefined;
    for (const p of pieces) {
      const local = matApply(matInvert(matOf(p.id)), w);
      for (const e of p.edges) {
        const poly = edgePolyline(p, e, 0.3);
        for (let i = 1; i < poly.length; i++) {
          const d = distToSegment(local, poly[i - 1], poly[i]);
          if (d < screenTol && (!best || d < best.d)) best = { piece: p, edgeId: e.id, d };
        }
      }
    }
    return best;
  };
  const allNodes = (): { p: Pt; pieceId: string; key: string }[] =>
    pieces.flatMap((pc) => {
      const m = matOf(pc.id);
      return pc.nodes.map((n) => ({ p: matApply(m, n), pieceId: pc.id, key: `n:${n.id}` }));
    });
  const snapNode = (w: Pt): Pt => {
    let best: Pt = w;
    let bd = screenTol;
    for (const n of allNodes()) {
      const d = dist(n.p, w);
      if (d < bd) {
        bd = d;
        best = n.p;
      }
    }
    return best;
  };

  const handlers = {
    onDown: (bp: BoardPointer): boolean => {
      const w = bp.world;
      if (tool === 'mover') {
        const p = hitPiece(w);
        setSelected(p?.id ?? null);
        if (!p) return false;
        drag.current = { kind: 'piece', start: w, s0: state, pieceId: p.id };
        return true;
      }
      if (tool === 'puntos') {
        const pc = sel ?? hitPiece(w);
        if (!pc) return false;
        if (!sel) setSelected(pc.id);
        const m = matOf(pc.id);
        const inv = matInvert(m);
        const local = matApply(inv, w);
        const tol = screenTol;
        const cands: { key: string; p: Pt }[] = [];
        for (const n of pc.nodes) cands.push({ key: `n:${n.id}`, p: n });
        for (const e of pc.edges) if (e.kind === 'cubic' && e.c1 && e.c2) cands.push({ key: `c1:${e.id}`, p: e.c1 }, { key: `c2:${e.id}`, p: e.c2 });
        let best: { key: string; p: Pt } | undefined;
        let bd = tol;
        for (const c of cands) {
          const d = dist(c.p, local);
          if (d < bd) {
            bd = d;
            best = c;
          }
        }
        if (!best) return !!sel && !!hitPiece(w);
        const gen = built!.generated.find((g) => g.id === pc.id);
        let base: Pt = best.p;
        if (gen) {
          const [kind, id] = best.key.split(':');
          if (kind === 'n') base = gen.nodes.find((n) => n.id === id) ?? best.p;
          else {
            const e = gen.edges.find((x) => x.id === id);
            base = (kind === 'c1' ? e?.c1 : e?.c2) ?? best.p;
          }
        }
        drag.current = { kind: 'node', start: local, s0: state, pieceId: pc.id, key: best.key, base, inv };
        return true;
      }
      if (tool === 'medir') {
        const from = snapNode(w);
        drag.current = { kind: 'measure', start: w, s0: state, from };
        const e = hitEdge(w);
        if (e) {
          const ed = e.piece.edges.find((x) => x.id === e.edgeId)!;
          setReadout({ text: `${e.piece.name} · ${ed.label}: ${formatLength(edgeLength(e.piece, ed), unit, { decimals: unit === 'cm' ? 2 : 3 })}` });
        } else setReadout(null);
        return true;
      }
      if (tool === 'comparar') {
        const e = hitEdge(w);
        if (!e) return false;
        const item = { pieceId: e.piece.id, edgeId: e.edgeId };
        const toggle = (list: typeof cmpA) => (list.some((x) => x.pieceId === item.pieceId && x.edgeId === item.edgeId) ? list.filter((x) => !(x.pieceId === item.pieceId && x.edgeId === item.edgeId)) : [...list, item]);
        if (cmpSide === 'A') setCmpA(toggle(cmpA));
        else setCmpB(toggle(cmpB));
        return true;
      }
      if (tool === 'trazar') {
        let p = w;
        if (assist && topLayer && layerPixels) {
          const lp = worldToLayerPx(topLayer, w);
          const snapped = snapToEdge(layerPixels.data, { x: lp.x * layerPixels.k, y: lp.y * layerPixels.k }, 10);
          p = layerPxToWorld(topLayer, { x: snapped.x / layerPixels.k, y: snapped.y / layerPixels.k });
        }
        if (trace.length >= 3 && dist(p, trace[0]) < screenTol) {
          finishTrace();
          return true;
        }
        setTrace([...trace, p]);
        return true;
      }
      if (tool === 'calibrar') {
        const layer = calib ? layers.find((l) => l.id === calib.layerId) : topLayer;
        if (!layer) return false;
        if (!calib?.a) setCalib({ layerId: layer.id, a: w });
        else {
          setCalibAsk({ layerId: layer.id, a: calib.a, b: w });
          setCalib(null);
        }
        return true;
      }
      return false;
    },
    onMove: (bp: BoardPointer) => {
      const d = drag.current;
      if (!d) return;
      const w = bp.world;
      if (d.kind === 'piece' && d.pieceId) {
        const lay = d.s0.layout[d.pieceId] ?? { x: 0, y: 0, rot: 0, mirror: false };
        hist.preview({ ...d.s0, layout: { ...d.s0.layout, [d.pieceId]: { ...lay, x: lay.x + w.x - d.start.x, y: lay.y + w.y - d.start.y } } });
      } else if (d.kind === 'node' && d.pieceId && d.key && d.inv) {
        const local = matApply(d.inv, w);
        const delta = sub(local, d.start);
        const isCustom = d.s0.customPieces.some((p) => p.id === d.pieceId);
        if (isCustom) hist.preview(moveCustomNode(d.s0, d.pieceId, d.key, delta));
        else hist.preview(setOverride(d.s0, d.pieceId, d.key, delta, d.base!));
        setReadout({ text: `Δ ${formatLength(delta.x, unit)} · ${formatLength(delta.y, unit)}` });
      } else if (d.kind === 'measure' && d.from) {
        const to = snapNode(w);
        if (dist(to, d.from) > screenTol / 2) setReadout({ text: `Distancia: ${formatLength(dist(to, d.from), unit, { decimals: unit === 'cm' ? 2 : 3 })}`, line: [d.from, to] });
      }
    },
    onUp: () => {
      const d = drag.current;
      drag.current = null;
      if (!d) return;
      if ((d.kind === 'piece' || d.kind === 'node') && hist.state && hist.state !== d.s0) hist.commit(hist.state, d.s0);
      if (d.kind === 'node') setTimeout(() => setReadout(null), 1200);
    },
    onDoubleTap: () => {
      if (tool === 'trazar' && trace.length >= 3) finishTrace();
    },
    onHover: (bp: BoardPointer) => setCursor(bp.world)
  };

  function finishTrace() {
    if (!state || trace.length < 3) return;
    const id = uid('pieza');
    const n = (state.customPieces.length ?? 0) + 1;
    const nodes = trace.map((p, i) => ({ id: `p${i + 1}`, x: p.x, y: p.y }));
    const b = bboxOf(trace);
    const piece: Piece = {
      id,
      name: `Pieza trazada ${n}`,
      source: 'manual',
      nodes,
      edges: nodes.map((nd, i) => ({ id: `b${i + 1}`, label: `Borde ${i + 1}`, from: nd.id, to: nodes[(i + 1) % nodes.length].id, kind: 'line' as const, allowance: 10, finish: 'costura' as const })),
      grain: { a: { x: (b.minX + b.maxX) / 2, y: b.minY + (b.maxY - b.minY) * 0.2 }, b: { x: (b.minX + b.maxX) / 2, y: b.maxY - (b.maxY - b.minY) * 0.2 } },
      cut: { qty: 1, mirrorPairs: false, onFold: false, fabric: 'principal' },
      notches: [],
      lines: [],
      marks: []
    };
    try {
      cutOutline(piece);
    } catch {
      /* se valida en revisión */
    }
    hist.commit({ ...state, customPieces: [...state.customPieces, piece], layout: { ...state.layout, [id]: { x: 0, y: 0, rot: 0, mirror: false } } });
    setTrace([]);
    setSelected(id);
    setTool('puntos');
  }

  const cmpLen = (list: typeof cmpA) => list.reduce((s, x) => {
    const p = pieces.find((pp) => pp.id === x.pieceId);
    const e = p?.edges.find((ee) => ee.id === x.edgeId);
    return s + (p && e ? edgeLength(p, e) : 0);
  }, 0);
  const la = cmpLen(cmpA);
  const lb = cmpLen(cmpB);
  const badEdges = new Map<string, Set<string>>();
  for (const r of built?.seamResults ?? []) {
    if (r.ok) continue;
    for (const side of [...r.relation.a, ...r.relation.b]) {
      const s = badEdges.get(side.pieceId) ?? new Set<string>();
      side.edgeIds.forEach((e) => s.add(e));
      badEdges.set(side.pieceId, s);
    }
  }
  const errors = built?.issues.filter((i) => i.level === 'error').length ?? 0;
  const warnings = built?.issues.filter((i) => i.level === 'aviso').length ?? 0;

  const panelBody = (key: PanelKey) => {
    switch (key) {
      case 'medidas':
        return <ParamsPanel project={project} state={state} built={built} commit={(s) => hist.commit(s)} />;
      case 'pieza':
        return <PiecePanel state={state} built={built} piece={sel} commit={(s) => hist.commit(s)} onSelect={setSelected} />;
      case 'revision':
        return <ReviewPanel project={project} state={state} built={built} commit={(s) => hist.commit(s)} onShowSeam={(a, b) => { setTool('comparar'); setCmpA(a); setCmpB(b); }} />;
      case 'capas':
        return <LayersPanel project={project} state={state} commit={(s) => hist.commit(s)} showAllowance={showAllowance} setShowAllowance={setShowAllowance} onCalibrate={(layerId) => { setTool('calibrar'); setCalib({ layerId }); setMobilePanel(null); }} />;
      case 'exportar':
        return <ExportPanel project={project} state={state} built={built} />;
    }
  };

  const toolInfo = TOOLS.find((t) => t.key === tool)!;
  const realScale = screenPxPerMm ?? 96 / 25.4;

  return (
    <div className="editor">
      <div className="ed-top">
        <IconButton icon="back" label="Volver" onClick={() => goBack(`/proyectos/${projectId}`)} />
        <div className="ed-title">
          {project.name}
          <div className="tiny faint" style={{ fontWeight: 400 }}>
            {built?.generator?.name ?? 'Patrón manual'} · {pieces.length} piezas
          </div>
        </div>
        <span className="desktop-only"><SaveIndicator /></span>
        <IconButton icon="undo" label="Deshacer" onClick={hist.undo} disabled={!hist.canUndo} />
        <IconButton icon="redo" label="Rehacer" onClick={hist.redo} disabled={!hist.canRedo} />
        <button className="chip" onClick={() => (setPanel('revision'), setMobilePanel('revision'))} style={{ border: 0, cursor: 'pointer', background: errors ? 'var(--thread-soft)' : warnings ? 'var(--tape-soft)' : 'var(--mat-soft)', color: errors ? 'var(--thread)' : warnings ? 'var(--tape-ink)' : 'var(--mat)' }}>
          <Icon name={errors ? 'warn' : warnings ? 'info' : 'ok'} />
          {errors ? `${errors} ${errors === 1 ? 'error' : 'errores'}` : warnings ? `${warnings} ${warnings === 1 ? 'aviso' : 'avisos'}` : 'Verificado'}
        </button>
      </div>
      <div className="ed-body">
        <div className="ed-rail" role="toolbar" aria-label="Herramientas">
          {TOOLS.map((t) => (
            <button key={t.key} className="tool" aria-pressed={tool === t.key} onClick={() => setTool(t.key)} title={t.hint}>
              <Icon name={t.icon} />
              {t.label}
            </button>
          ))}
        </div>
        <Board vp={vp} handlers={handlers} unit={unit} cursor={tool === 'mover' ? 'default' : 'crosshair'}>
          {layers.filter((l) => l.visible).map((l) => <RefLayerSvg key={l.id} layer={l} />)}
          <OverlaySvg state={state} pieces={pieces} matOf={matOf} />
          {pieces.map((p) => (
            <g key={p.id} transform={`matrix(${matOf(p.id).join(' ')})`}>
              <PieceSvg
                piece={p}
                cut={built?.cuts.get(p.id)}
                style={{
                  selected: p.id === selected,
                  dim: state.noExport?.includes(p.id),
                  badEdges: badEdges.get(p.id),
                  hiEdgesA: new Set(cmpA.filter((x) => x.pieceId === p.id).map((x) => x.edgeId)),
                  hiEdgesB: new Set(cmpB.filter((x) => x.pieceId === p.id).map((x) => x.edgeId)),
                  showAllowance
                }}
              />
              {tool === 'puntos' && p.id === selected && <Handles piece={p} scale={vp.view.scale} review={built?.review.filter((r) => r.pieceId === p.id).map((r) => r.key) ?? []} />}
            </g>
          ))}
          {trace.length > 0 && (
            <g>
              <polyline points={trace.map((p) => `${p.x},${p.y}`).join(' ')} fill="none" stroke="var(--mat)" strokeWidth={2} vectorEffect="non-scaling-stroke" />
              {trace.map((p, i) => <circle key={i} cx={p.x} cy={p.y} r={5 / vp.view.scale} fill={i === 0 ? 'var(--mat)' : 'var(--surface)'} stroke="var(--mat)" strokeWidth={1.5} vectorEffect="non-scaling-stroke" />)}
            </g>
          )}
          {calib?.a && <circle cx={calib.a.x} cy={calib.a.y} r={6 / vp.view.scale} fill="var(--tape)" stroke="var(--ink)" strokeWidth={1} vectorEffect="non-scaling-stroke" />}
          {readout?.line && (
            <g>
              <line x1={readout.line[0].x} y1={readout.line[0].y} x2={readout.line[1].x} y2={readout.line[1].y} stroke="var(--tape)" strokeWidth={3} vectorEffect="non-scaling-stroke" />
              <line x1={readout.line[0].x} y1={readout.line[0].y} x2={readout.line[1].x} y2={readout.line[1].y} stroke="var(--ink)" strokeWidth={1} strokeDasharray="4 3" vectorEffect="non-scaling-stroke" />
            </g>
          )}
          {pieces.length === 0 && !layers.length && (
            <text x={0} y={0} fontSize={14 / vp.view.scale} fill="var(--ink-3)">
              {built?.missing.length ? 'Faltan medidas: abre el panel Medidas.' : 'Agrega una referencia en Capas para trazar.'}
            </text>
          )}
        </Board>
        {readout && <div className="readout">{readout.text}</div>}
        {tool === 'comparar' && (
          <div className="float-bar" style={{ left: '50%', transform: 'translateX(-50%)', top: 10, alignItems: 'center', padding: '4px 6px', gap: 6 }}>
            <Segmented value={cmpSide} onChange={setCmpSide} options={[{ value: 'A', label: `A · ${formatLength(la, unit)}` }, { value: 'B', label: `B · ${formatLength(lb, unit)}` }]} />
            {cmpA.length > 0 && cmpB.length > 0 && <span className="measure">Δ {formatLength(Math.abs(la - lb), unit, { decimals: unit === 'cm' ? 2 : 3 })}</span>}
            <IconButton icon="close" label="Limpiar comparación" onClick={() => { setCmpA([]); setCmpB([]); setCmpSide('A'); }} />
          </div>
        )}
        {tool === 'trazar' && (
          <div className="float-bar" style={{ left: '50%', transform: 'translateX(-50%)', top: 10, alignItems: 'center', gap: 6, padding: '4px 8px' }}>
            <label className="row small" style={{ gap: 6 }}>
              <input type="checkbox" checked={assist} onChange={(e) => setAssist(e.target.checked)} /> Asistido
            </label>
            <Button size="sm" onClick={() => setTrace(trace.slice(0, -1))} disabled={!trace.length}>Quitar punto</Button>
            <Button size="sm" variant="primary" onClick={finishTrace} disabled={trace.length < 3}>Cerrar pieza</Button>
          </div>
        )}
        {(hintVisible || (tool === 'calibrar' && calib?.a)) && <div className="status-pill">{tool === 'calibrar' && calib?.a ? 'Ahora toca el segundo punto.' : toolInfo.hint}</div>}
        {cursor && <div className="desktop-only" style={{ position: 'absolute', right: 10, top: 28, zIndex: 5, padding: '4px 8px', borderRadius: 8, background: 'color-mix(in srgb, var(--surface) 90%, transparent)', border: '1px solid var(--line)', fontSize: 12, fontVariantNumeric: 'tabular-nums', color: 'var(--ink-2)' }}>x {formatLength(cursor.x, unit)} · y {formatLength(cursor.y, unit)}</div>}
        <div className="float-bar zoom-pill">
          <IconButton icon="zoomout" label="Alejar" onClick={() => vp.zoomAt(1 / 1.3, { x: vp.size.current.w / 2, y: vp.size.current.h / 2 })} />
          <button className="icon-btn" style={{ width: 'auto', padding: '0 8px', fontSize: 12.5, fontWeight: 700 }} title="Ver a escala real en pantalla (calibra en Ajustes)" onClick={() => vp.setView((v) => { const c = { x: vp.size.current.w / 2, y: vp.size.current.h / 2 }; const k = realScale / v.scale; return { scale: realScale, tx: c.x - (c.x - v.tx) * k, ty: c.y - (c.y - v.ty) * k }; })}>
            1:1
          </button>
          <IconButton icon="zoomin" label="Acercar" onClick={() => vp.zoomAt(1.3, { x: vp.size.current.w / 2, y: vp.size.current.h / 2 })} />
          <IconButton icon="fit" label="Ajustar a la vista" onClick={() => vp.fit(worldBBox(), 40)} />
        </div>
        <aside className="ed-side" aria-label="Panel de propiedades">
          <div className="side-tabs">
            <Segmented value={panel} onChange={setPanel} options={PANELS.map((p) => ({ value: p.key, label: p.label }))} />
          </div>
          <div className="side-body">{panelBody(panel)}</div>
        </aside>
      </div>
      <div className="ed-bottom" role="toolbar" aria-label="Herramientas y paneles">
        {TOOLS.map((t) => (
          <button key={t.key} className="tool" aria-pressed={tool === t.key} onClick={() => setTool(t.key)}>
            <Icon name={t.icon} />
            {t.label}
          </button>
        ))}
        <span style={{ width: 1, background: 'var(--line)', margin: '8px 4px', flex: 'none' }} />
        {PANELS.map((p) => (
          <button key={p.key} className="tool" onClick={() => setMobilePanel(p.key)}>
            <Icon name={p.icon} />
            {p.label}
          </button>
        ))}
      </div>
      {mobilePanel && (
        <Sheet title={PANELS.find((p) => p.key === mobilePanel)!.label} onClose={() => setMobilePanel(null)}>
          {panelBody(mobilePanel)}
        </Sheet>
      )}
      {calibAsk && <CalibrateSheet ask={calibAsk} state={state} onClose={() => setCalibAsk(null)} commit={(s) => hist.commit(s)} />}
    </div>
  );
}

function moveCustomNode(s: PatternState, pieceId: string, key: string, delta: Pt): PatternState {
  const [kind, id] = key.split(':');
  return {
    ...s,
    customPieces: s.customPieces.map((p) => {
      if (p.id !== pieceId) return p;
      if (kind === 'n') {
        return {
          ...p,
          nodes: p.nodes.map((n) => (n.id === id ? { ...n, x: n.x + delta.x, y: n.y + delta.y } : n)),
          edges: p.edges.map((e) => (e.kind !== 'cubic' ? e : { ...e, c1: e.from === id && e.c1 ? { x: e.c1.x + delta.x, y: e.c1.y + delta.y } : e.c1, c2: e.to === id && e.c2 ? { x: e.c2.x + delta.x, y: e.c2.y + delta.y } : e.c2 }))
        };
      }
      return { ...p, edges: p.edges.map((e) => (e.id !== id ? e : kind === 'c1' && e.c1 ? { ...e, c1: { x: e.c1.x + delta.x, y: e.c1.y + delta.y } } : kind === 'c2' && e.c2 ? { ...e, c2: { x: e.c2.x + delta.x, y: e.c2.y + delta.y } } : e)) };
    })
  };
}

function Handles({ piece, scale, review }: { piece: Piece; scale: number; review: string[] }) {
  const r = 5.5 / scale;
  return (
    <g>
      {piece.edges.map((e) => {
        if (e.kind !== 'cubic' || !e.c1 || !e.c2) return null;
        const a = piece.nodes.find((n) => n.id === e.from)!;
        const b = piece.nodes.find((n) => n.id === e.to)!;
        return (
          <g key={e.id}>
            <line x1={a.x} y1={a.y} x2={e.c1.x} y2={e.c1.y} stroke="#3f6fa0" strokeWidth={1} vectorEffect="non-scaling-stroke" />
            <line x1={b.x} y1={b.y} x2={e.c2.x} y2={e.c2.y} stroke="#3f6fa0" strokeWidth={1} vectorEffect="non-scaling-stroke" />
            <rect x={e.c1.x - r * 0.8} y={e.c1.y - r * 0.8} width={r * 1.6} height={r * 1.6} fill={review.includes(`c1:${e.id}`) ? 'var(--tape)' : '#fff'} stroke="#3f6fa0" strokeWidth={1.4} vectorEffect="non-scaling-stroke" />
            <rect x={e.c2.x - r * 0.8} y={e.c2.y - r * 0.8} width={r * 1.6} height={r * 1.6} fill={review.includes(`c2:${e.id}`) ? 'var(--tape)' : '#fff'} stroke="#3f6fa0" strokeWidth={1.4} vectorEffect="non-scaling-stroke" />
          </g>
        );
      })}
      {piece.nodes.map((n) => (
        <circle key={n.id} cx={n.x} cy={n.y} r={r} fill={review.includes(`n:${n.id}`) ? 'var(--tape)' : 'var(--mat)'} stroke="#fff" strokeWidth={1.5} vectorEffect="non-scaling-stroke" />
      ))}
    </g>
  );
}

export function worldToLayerPx(l: RefLayer, w: Pt): Pt {
  const r = (-l.rotation * Math.PI) / 180;
  const dx = w.x - l.x;
  const dy = w.y - l.y;
  return { x: (dx * Math.cos(r) - dy * Math.sin(r)) / l.mmPerPx, y: (dx * Math.sin(r) + dy * Math.cos(r)) / l.mmPerPx };
}

export function layerPxToWorld(l: RefLayer, p: Pt): Pt {
  const r = (l.rotation * Math.PI) / 180;
  const x = p.x * l.mmPerPx;
  const y = p.y * l.mmPerPx;
  return { x: l.x + x * Math.cos(r) - y * Math.sin(r), y: l.y + x * Math.sin(r) + y * Math.cos(r) };
}

function CalibrateSheet({ ask, state, onClose, commit }: { ask: { layerId: string; a: Pt; b: Pt }; state: PatternState; onClose: () => void; commit: (s: PatternState) => void }) {
  const unit = useApp((s) => s.settings.unit);
  const layer = state.refLayers?.find((l) => l.id === ask.layerId);
  const [mm, setMm] = useState<number | undefined>(100);
  if (!layer) return null;
  const pa = worldToLayerPx(layer, ask.a);
  const pb = worldToLayerPx(layer, ask.b);
  const pxDist = Math.hypot(pa.x - pb.x, pa.y - pb.y);
  const apply = () => {
    if (!mm || pxDist < 2) return;
    const mmPerPx = mm / pxDist;
    // Mantener fijo el primer punto.
    const r = (layer.rotation * Math.PI) / 180;
    const x = pa.x * mmPerPx;
    const y = pa.y * mmPerPx;
    const nx = ask.a.x - (x * Math.cos(r) - y * Math.sin(r));
    const ny = ask.a.y - (x * Math.sin(r) + y * Math.cos(r));
    commit({ ...state, refLayers: state.refLayers!.map((l) => (l.id === layer.id ? { ...l, mmPerPx, x: nx, y: ny, calibrated: true, scaleNote: `Calibrada con ${formatLength(mm, unit)} conocidos` } : l)) });
    onClose();
  };
  return (
    <Sheet title="Distancia conocida" onClose={onClose}>
      <div className="stack">
        <p className="muted">¿Cuánto mide en la realidad la distancia entre los dos puntos que tocaste? Usa una regla, la cuadrícula del papel o una marca conocida.</p>
        <LengthField mm={mm} onChange={setMm} />
        <p className="small faint">Distancia en la imagen: {pxDist.toFixed(1)} píxeles.</p>
        <Button variant="primary" block onClick={apply} disabled={!mm}>Calibrar escala</Button>
      </div>
    </Sheet>
  );
}

import { LengthInput, Field } from '../../ui/components';
function LengthField({ mm, onChange }: { mm: number | undefined; onChange: (v: number | undefined) => void }) {
  return (
    <Field label="Distancia real">
      <LengthInput mm={mm} onChange={onChange} min={1} />
    </Field>
  );
}

function NoPattern({ projectId }: { projectId: string }) {
  const project = useApp((s) => s.projects[projectId]);
  const updateProject = useApp((s) => s.updateProject);
  const url = useFileUrl(project?.references.find((r) => r.kind === 'patron')?.fileId);
  const start = () => {
    updateProject(projectId, (p) => ({
      ...p,
      pattern: { generatorId: 'manual', params: {}, context: { kind: 'mujer', fabric: p.fabricType, stretch: p.stretch, fit: p.fit }, body: {}, overrides: {}, allowances: {}, layout: {}, customPieces: [], hidden: [], refLayers: [] },
      status: 'patronaje'
    }));
  };
  void url;
  return (
    <div className="page">
      <Empty icon="patronaje" title="Este proyecto aún no tiene patrón" body="Crea un patrón manual para trazar sobre tus referencias, o empieza un proyecto desde un patrón base." action={<div className="row-wrap" style={{ justifyContent: 'center' }}><Button variant="primary" onClick={start}>Crear patrón manual</Button><Button onClick={() => navigate(`/proyectos/${projectId}`)}>Ir al proyecto</Button></div>} />
    </div>
  );
}
