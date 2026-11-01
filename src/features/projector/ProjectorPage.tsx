import { useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { useApp } from '../../store/app';
import { navigate } from '../../ui/router';
import type { Pt } from '../../lib/geom/vec';
import type { SewingPackCtx } from '../../lib/pdf/projectPack';
import { hasSewingBase } from '../../lib/pdf/projectPack';
import { projectorSource } from '../../lib/projector/source';
import { layoutPieces, placementMatrix, sceneBounds, sceneFromDrawable, translatePiece, type Placement } from '../../lib/projector/scene';
import { applyH, invertH, localScale } from '../../lib/projector/homography';
import {
  calibrationNotes, cornerCalibration, estimatedCalibration, loadCalibration, rectCorners, rescaleToScreen, rulerCalibration,
  saveCalibration, screenChanged, visibleTable, type ProjectorCalibration, type ScreenSize
} from '../../lib/projector/calibration';
import { PROJECTOR_COLORS, type ProjectorTheme } from '../../lib/pdf/projector';
import { drawControlSquare, drawGrid, renderProjection } from './render';
import { downloadProjectorPdf } from './projectorPdf';
import './projector.css';

type Mode = 'proyectar' | 'inicio' | 'regla' | 'esquinas' | 'comprobar';
const PREFS_KEY = 'hilvana-proyector-preferencias';
interface Prefs { theme: ProjectorTheme; lineScale: number; showSeam: boolean; showLabels: boolean; showGrid: boolean; showCheck: boolean }
const DEFAULT_PREFS: Prefs = { theme: 'oscuro', lineScale: 1, showSeam: true, showLabels: true, showGrid: false, showCheck: true };
function loadPrefs(): Prefs { try { return { ...DEFAULT_PREFS, ...JSON.parse(localStorage.getItem(PREFS_KEY) ?? '{}') }; } catch { return DEFAULT_PREFS; } }
const screenNow = (): ScreenSize => ({ w: window.innerWidth, h: window.innerHeight });
const round5 = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, Math.floor(v / 50) * 50));
const fmt = (n: number) => n.toLocaleString('es-MX', { maximumFractionDigits: 1 });

/** Full-screen projection of the real pieces at 1:1 on the cutting table. */
export function ProjectorPage({ projectId }: { projectId: string }) {
  const project = useApp(s => s.projects[projectId]);
  const profiles = useApp(s => s.profiles), fabrics = useApp(s => s.fabrics), materials = useApp(s => s.materials), settings = useApp(s => s.settings);
  const ctx: SewingPackCtx = useMemo(() => ({ profiles, fabrics, materials, unit: settings.unit, mode: project && hasSewingBase(project) ? 'complete' : 'intervention' }), [profiles, fabrics, materials, settings.unit, project]);
  const source = useMemo(() => project ? projectorSource(project, ctx) : undefined, [project, ctx]);

  const [size, setSize] = useState<ScreenSize>(screenNow);
  const [calib, setCalib] = useState<ProjectorCalibration>(() => {
    const stored = loadCalibration(), screen = screenNow();
    if (!stored) return estimatedCalibration(screen);
    return screenChanged(stored, screen) ? rescaleToScreen(stored, screen) : stored;
  });
  const [stale, setStale] = useState(() => { const stored = loadCalibration(); return !!stored && screenChanged(stored, screenNow()); });
  const [mode, setMode] = useState<Mode>(() => loadCalibration() ? 'proyectar' : 'inicio');
  const [prefs, setPrefs] = useState<Prefs>(loadPrefs);
  const [groupId, setGroupId] = useState('patron');
  const [pieceId, setPieceId] = useState('todas');
  const [placement, setPlacement] = useState<Placement | null>(null);
  const [locked, setLocked] = useState(false);
  const [controls, setControls] = useState(true);
  const [options, setOptions] = useState(false);
  const [message, setMessage] = useState('');
  const [ruler, setRuler] = useState({ w: '100', h: '100' });
  const [rect, setRect] = useState({ w: 400, h: 300 });
  const [corners, setCorners] = useState<Pt[]>([]);
  const [selected, setSelected] = useState(0);
  const [nudge, setNudge] = useState(1);
  const [panelUp, setPanelUp] = useState(false);
  const canvas = useRef<HTMLCanvasElement>(null);
  const drag = useRef<{ start: Pt; from: Placement; moved: boolean } | null>(null);
  const handleDrag = useRef<{ index: number; dx: number; dy: number } | null>(null);

  useEffect(() => { try { localStorage.setItem(PREFS_KEY, JSON.stringify(prefs)); } catch { /* Preferencia opcional. */ } }, [prefs]);
  useEffect(() => {
    const resize = () => setSize(screenNow());
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, []);
  // A different window keeps an approximate scale but must be recalibrated.
  useEffect(() => {
    setCalib(c => c.screen.w === size.w && c.screen.h === size.h ? c : rescaleToScreen(c, size));
    const stored = loadCalibration();
    setStale(!!stored && screenChanged(stored, size));
  }, [size]);
  // Keep the screen awake while projecting (not available in every browser).
  useEffect(() => {
    let lock: { release?: () => Promise<void> } | undefined;
    const request = async () => { try { lock = await (navigator as Navigator & { wakeLock?: { request: (t: 'screen') => Promise<{ release: () => Promise<void> }> } }).wakeLock?.request('screen'); } catch { /* Sin bloqueo de pantalla. */ } };
    void request();
    const visible = () => { if (document.visibilityState === 'visible') void request(); };
    document.addEventListener('visibilitychange', visible);
    return () => { document.removeEventListener('visibilitychange', visible); void lock?.release?.(); };
  }, []);

  const group = source?.groups.find(g => g.id === groupId) ?? source?.groups[0];
  const scene = useMemo(() => group?.drawables.map(d => sceneFromDrawable(d)) ?? [], [group]);
  const inv = useMemo(() => invertH(calib.H), [calib.H]);
  const tableCenter = useMemo(() => inv ? applyH(inv, { x: size.w / 2, y: size.h / 2 }) : { x: 0, y: 0 }, [inv, size]);
  const visible = useMemo(() => visibleTable(calib.H, size), [calib.H, size]);
  const visibleW = visible ? Math.max(300, Math.min(3000, visible.maxX - visible.minX)) : 1000;
  const shown = useMemo(() => {
    if (pieceId === 'todas') return layoutPieces(scene, visibleW * .9);
    const piece = scene.find(p => p.id === pieceId);
    return piece ? [translatePiece(piece, -piece.bbox.minX, -piece.bbox.minY)] : [];
  }, [scene, pieceId, visibleW]);
  const bounds = useMemo(() => shown.length ? sceneBounds(shown) : { minX: 0, minY: 0, maxX: 0, maxY: 0 }, [shown]);
  const layoutCenter = { x: (bounds.minX + bounds.maxX) / 2, y: (bounds.minY + bounds.maxY) / 2 };
  const place: Placement = placement ?? { x: tableCenter.x, y: tableCenter.y, rotation: 0, mirror: false };
  const M = placementMatrix(place, layoutCenter);
  const notes = calibrationNotes(calib);

  // Corner calibration starts close to the current mapping, centred on screen.
  const startCorners = () => {
    const vb = visible, w = vb ? round5((vb.maxX - vb.minX) * .6, 150, 1500) : 400, h = vb ? round5((vb.maxY - vb.minY) * .6, 100, 1000) : 300;
    setRect({ w, h });
    setCorners(rectCorners(w, h).map(p => applyH(calib.H, { x: tableCenter.x - w / 2 + p.x, y: tableCenter.y - h / 2 + p.y })));
    setSelected(0); setMode('esquinas'); setMessage('');
  };

  useEffect(() => {
    const el = canvas.current, c2d = el?.getContext('2d');
    if (!el || !c2d) return;
    const dpr = window.devicePixelRatio || 1;
    el.width = Math.round(size.w * dpr); el.height = Math.round(size.h * dpr);
    const colors = PROJECTOR_COLORS[prefs.theme];
    const projecting = mode === 'proyectar';
    const checkPx = 25 * notes.pxPerMm + 24;
    renderProjection(c2d, {
      size, dpr, H: calib.H, theme: prefs.theme, lineScale: prefs.lineScale, pieces: projecting ? shown : [], M,
      showSeam: prefs.showSeam, showLabels: prefs.showLabels, showGrid: projecting ? prefs.showGrid : mode === 'comprobar',
      // The 5 cm control square sits in the free bottom-right corner of the screen.
      check: projecting && prefs.showCheck && inv ? applyH(inv, { x: size.w - checkPx, y: size.h - checkPx }) : undefined
    });
    if (mode === 'regla') {
      drawControlSquare(c2d, calib.H, tableCenter, 100, colors.corte, '10 cm');
    }
    if (mode === 'comprobar') {
      drawControlSquare(c2d, calib.H, tableCenter, 100, colors.corte, '10 cm');
      drawControlSquare(c2d, calib.H, { x: tableCenter.x + 120, y: tableCenter.y }, 50, colors.costura, '5 cm', false);
      if (visible) drawControlSquare(c2d, calib.H, { x: visible.minX + 60, y: visible.minY + 60 }, 50, colors.costura, '5 cm', false);
    }
    if (mode === 'esquinas' && corners.length === 4) {
      drawGrid(c2d, calib.H, size, colors.cuadricula);
      c2d.strokeStyle = colors.corte; c2d.lineWidth = 2; c2d.setLineDash([]);
      c2d.beginPath(); corners.forEach((p, i) => i ? c2d.lineTo(p.x, p.y) : c2d.moveTo(p.x, p.y)); c2d.closePath(); c2d.stroke();
      corners.forEach((p, i) => {
        c2d.strokeStyle = i === selected ? colors.corte : colors.costura; c2d.lineWidth = i === selected ? 2 : 1.4;
        c2d.beginPath(); c2d.moveTo(p.x - 26, p.y); c2d.lineTo(p.x + 26, p.y); c2d.moveTo(p.x, p.y - 26); c2d.lineTo(p.x, p.y + 26); c2d.stroke();
      });
    }
  });

  if (!project || !source) return <div className="projector"><div className="pj-center"><p>Proyecto no encontrado.</p><button className="pj-btn" onClick={() => navigate('/proyectos')}>Volver a proyectos</button></div></div>;

  const exit = () => { if (document.fullscreenElement) void document.exitFullscreen?.(); navigate(`/proyectos/${projectId}`); };
  const toTable = (e: { clientX: number; clientY: number }) => inv ? applyH(inv, { x: e.clientX, y: e.clientY }) : { x: 0, y: 0 };
  const down = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    if (mode !== 'proyectar') return;
    (e.target as Element).setPointerCapture?.(e.pointerId);
    drag.current = { start: toTable(e), from: place, moved: false };
  };
  const move = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    const d = drag.current;
    if (!d || locked) return;
    const now = toTable(e), dx = now.x - d.start.x, dy = now.y - d.start.y;
    if (Math.hypot(dx, dy) * localScale(calib.H, now) > 4) d.moved = true;
    if (d.moved) setPlacement({ ...d.from, x: d.from.x + dx, y: d.from.y + dy });
  };
  const up = () => { const d = drag.current; drag.current = null; if (d && !d.moved && !controls) setControls(true); };
  const turn = () => setPlacement({ ...place, rotation: ((place.rotation + 90) % 360) as Placement['rotation'] });
  const flip = () => setPlacement({ ...place, mirror: !place.mirror });
  const center = () => setPlacement({ x: tableCenter.x, y: tableCenter.y, rotation: place.rotation, mirror: place.mirror });
  const fullscreen = () => document.fullscreenElement ? void document.exitFullscreen?.() : void document.documentElement.requestFullscreen?.().catch(() => setMessage('Este navegador no permite pantalla completa aquí. En iPhone, añade Hilvana a la pantalla de inicio.'));

  const applyRuler = () => {
    const w = Number(ruler.w.replace(',', '.')), h = Number(ruler.h.replace(',', '.'));
    const next = rulerCalibration(calib, tableCenter, { w, h });
    if (!next) { setMessage('Escribe lo que mide el cuadro en milímetros (por ejemplo 96 o 104,5).'); return; }
    setCalib(next); saveCalibration(next); setStale(false); setRuler({ w: '100', h: '100' });
    setMessage(Math.abs(w - 100) <= 1 && Math.abs(h - 100) <= 1 ? 'Calibración guardada. Pulsa «Comprobar».' : 'Escala corregida. Mide otra vez; repite hasta que mida 100 mm.');
  };
  const saveCorners = () => {
    const next = cornerCalibration(rect, corners, size);
    if (!next) { setMessage('Las cuatro esquinas no forman un rectángulo válido. Respeta el orden 1 → 2 → 3 → 4 en el sentido del reloj.'); return; }
    setCalib(next); saveCalibration(next); setStale(false); setPlacement(null); setMessage(''); setMode('comprobar');
  };
  const moveHandle = (index: number, e: ReactPointerEvent<HTMLButtonElement>) => {
    const h = handleDrag.current;
    if (!h || h.index !== index) return;
    setCorners(cs => cs.map((p, i) => i === index ? { x: e.clientX - h.dx, y: e.clientY - h.dy } : p));
  };
  const nudgeBy = (dx: number, dy: number) => setCorners(cs => cs.map((p, i) => i === selected ? { x: p.x + dx * nudge, y: p.y + dy * nudge } : p));
  const exportPdf = async () => {
    setMessage('Preparando el PDF para proyector…');
    try {
      const r = await downloadProjectorPdf(projectId, ctx, { theme: prefs.theme, width: 1400, grid: true });
      setMessage(`PDF listo: ${r.pages} ${r.pages === 1 ? 'hoja' : 'hojas'} a escala 1:1 con cuadrícula de 10 cm.${r.tooWide.length ? ` No caben: ${r.tooWide.join(', ')}.` : ''}`);
    } catch (cause) { setMessage(cause instanceof Error ? cause.message : 'No se pudo generar el PDF.'); }
  };
  const setPref = (patch: Partial<Prefs>) => setPrefs(p => ({ ...p, ...patch }));

  return <div className={`projector theme-${prefs.theme}`} onKeyDown={e => {
    if (mode !== 'proyectar') return;
    const step = e.shiftKey ? 10 : 1;
    if (e.key === 'ArrowLeft') setPlacement({ ...place, x: place.x - step });
    else if (e.key === 'ArrowRight') setPlacement({ ...place, x: place.x + step });
    else if (e.key === 'ArrowUp') setPlacement({ ...place, y: place.y - step });
    else if (e.key === 'ArrowDown') setPlacement({ ...place, y: place.y + step });
    else if (e.key.toLowerCase() === 'r') turn();
    else if (e.key.toLowerCase() === 'v') flip();
    else if (e.key.toLowerCase() === 'h') setControls(c => !c);
    else return;
    e.preventDefault();
  }} tabIndex={-1}>
    <canvas ref={canvas} className="pj-canvas" style={{ width: size.w, height: size.h }} onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={() => { drag.current = null; }} aria-label="Patrón proyectado a escala real" role="img"/>

    {mode === 'proyectar' && controls && <div className="pj-bar" role="toolbar" aria-label="Controles del proyector">
      <button className="pj-btn" onClick={exit}>‹ Salir</button>
      {source.groups.length > 1 && <select className="pj-select" aria-label="Qué proyectar" value={group?.id} onChange={e => { setGroupId(e.target.value); setPieceId('todas'); setPlacement(null); }}>
        {source.groups.map(g => <option key={g.id} value={g.id}>{g.title}</option>)}
      </select>}
      <select className="pj-select" aria-label="Pieza" value={pieceId} onChange={e => { setPieceId(e.target.value); setPlacement(null); }}>
        <option value="todas">Todas las piezas ({scene.length})</option>
        {scene.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
      </select>
      <button className="pj-btn" onClick={turn}>Girar 90°</button>
      <button className="pj-btn" aria-pressed={place.mirror} onClick={flip}>Voltear</button>
      <button className="pj-btn" onClick={center}>Centrar</button>
      <button className="pj-btn" aria-pressed={locked} onClick={() => setLocked(l => !l)}>{locked ? 'Bloqueado' : 'Bloquear'}</button>
      <button className="pj-btn" onClick={() => setMode('inicio')}>Calibrar</button>
      <button className="pj-btn" aria-expanded={options} onClick={() => setOptions(o => !o)}>Opciones</button>
      <button className="pj-btn" onClick={() => { setControls(false); setOptions(false); }}>Ocultar controles</button>
    </div>}
    {mode === 'proyectar' && !controls && <button className="pj-show" onClick={() => setControls(true)} aria-label="Mostrar controles">•••</button>}

    {mode === 'proyectar' && controls && options && <div className="pj-panel pj-options">
      <div className="pj-row"><span>Fondo</span>
        <button className="pj-btn" aria-pressed={prefs.theme === 'oscuro'} onClick={() => setPref({ theme: 'oscuro' })}>Negro</button>
        <button className="pj-btn" aria-pressed={prefs.theme === 'claro'} onClick={() => setPref({ theme: 'claro' })}>Blanco</button></div>
      <div className="pj-row"><span>Grosor de línea</span>
        <button className="pj-btn" onClick={() => setPref({ lineScale: Math.max(.5, prefs.lineScale - .25) })} aria-label="Líneas más finas">−</button>
        <span className="pj-value">{fmt(prefs.lineScale)}×</span>
        <button className="pj-btn" onClick={() => setPref({ lineScale: Math.min(4, prefs.lineScale + .25) })} aria-label="Líneas más gruesas">+</button></div>
      <label className="pj-check"><input type="checkbox" checked={prefs.showSeam} onChange={e => setPref({ showSeam: e.target.checked })}/> Línea de costura y marcas</label>
      <label className="pj-check"><input type="checkbox" checked={prefs.showLabels} onChange={e => setPref({ showLabels: e.target.checked })}/> Nombres y textos</label>
      <label className="pj-check"><input type="checkbox" checked={prefs.showGrid} onChange={e => setPref({ showGrid: e.target.checked })}/> Cuadrícula de 10 cm</label>
      <label className="pj-check"><input type="checkbox" checked={prefs.showCheck} onChange={e => setPref({ showCheck: e.target.checked })}/> Cuadro de control de 5 cm</label>
      <div className="pj-row"><button className="pj-btn" onClick={fullscreen}>Pantalla completa</button><button className="pj-btn" onClick={() => void exportPdf()}>Descargar PDF para proyector</button></div>
      <a className="pj-link" href="#/ayuda/proyector">Instrucciones completas</a>
    </div>}

    {mode === 'proyectar' && controls && <div className={`pj-status${calib.method === 'estimada' || stale ? ' warn' : ''}`}>
      {calib.method === 'estimada' ? 'Sin calibrar: la escala no es real. Calibra antes de cortar.' : stale ? 'La ventana cambió de tamaño: vuelve a calibrar.' : `Calibrado ${calib.method === 'esquinas' ? 'con 4 esquinas' : 'con regla'} · ${fmt(notes.pxPerMm)} px/mm`}
      {source.experimental && <span> · Patrón experimental: cose una muestra.</span>}
      {source.blockers.length > 0 && <span> · {source.blockers[0]}</span>}
      {message && <span> · {message}</span>}
    </div>}

    {mode === 'inicio' && <div className="pj-panel pj-wide">
      <h2>Calibrar el proyector</h2>
      <ol>
        <li>Monta el proyector encima de la mesa, mirando hacia abajo y lo más recto posible. Enfoca hasta que las líneas se vean nítidas.</li>
        <li>Muestra esta ventana en el proyector a pantalla completa. No cambies el zoom, la resolución ni el tamaño de la ventana después de calibrar.</li>
        <li>Ten a mano una regla, escuadra o tapete de corte con cuadrícula.</li>
      </ol>
      <div className="pj-choices">
        <button className="pj-choice" onClick={() => { setMode('regla'); setMessage(''); }}><strong>Rápida con regla</strong><span>Para proyector recto. Mides un cuadro y escribes lo que mide.</span></button>
        <button className="pj-choice" onClick={startCorners}><strong>Precisa con 4 esquinas</strong><span>Corrige inclinación y giro. Llevas cuatro puntos a marcas de tu tapete.</span></button>
      </div>
      <div className="pj-row">{calib.method !== 'estimada' && <button className="pj-btn" onClick={() => setMode('comprobar')}>Comprobar la calibración actual</button>}
        <button className="pj-btn" onClick={() => setMode('proyectar')}>{calib.method === 'estimada' ? 'Seguir sin calibrar' : 'Volver'}</button>
        <a className="pj-link" href="#/ayuda/proyector">Instrucciones completas</a></div>
    </div>}

    {mode === 'regla' && <div className={`pj-panel${panelUp ? ' pj-up' : ''}`}>
      <h2>Mide el cuadro proyectado</h2>
      <p>Con la regla sobre la mesa, mide el ancho y el alto del cuadro blanco, de borde a borde de la línea. Debe medir 100 mm.</p>
      <div className="pj-row">
        <label className="pj-field">Ancho (mm)<input inputMode="decimal" value={ruler.w} onChange={e => setRuler({ ...ruler, w: e.target.value })}/></label>
        <label className="pj-field">Alto (mm)<input inputMode="decimal" value={ruler.h} onChange={e => setRuler({ ...ruler, h: e.target.value })}/></label>
        <button className="pj-btn primary" onClick={applyRuler}>Aplicar</button>
      </div>
      {message && <p className="pj-msg">{message}</p>}
      <div className="pj-row"><button className="pj-btn" onClick={() => { setMessage(''); setMode('comprobar'); }}>Comprobar</button><button className="pj-btn" onClick={() => { setMessage(''); setMode('inicio'); }}>Atrás</button><button className="pj-btn" onClick={() => setPanelUp(u => !u)}>{panelUp ? 'Bajar este panel' : 'Subir este panel'}</button></div>
    </div>}

    {mode === 'esquinas' && <>
      {corners.map((p, i) => <button key={i} className={`pj-handle${i === selected ? ' selected' : ''}`} style={{ left: p.x, top: p.y }} aria-label={`Esquina ${i + 1}`}
        onPointerDown={e => { e.currentTarget.setPointerCapture(e.pointerId); setSelected(i); handleDrag.current = { index: i, dx: e.clientX - p.x, dy: e.clientY - p.y }; }}
        onPointerMove={e => moveHandle(i, e)} onPointerUp={() => { handleDrag.current = null; }} onPointerCancel={() => { handleDrag.current = null; }}>
        <span>{i + 1}</span></button>)}
      <div className={`pj-panel${panelUp ? ' pj-up' : ''}`}>
        <h2>Lleva cada esquina a su marca</h2>
        <p>Elige en tu tapete un rectángulo con medidas conocidas. Arrastra el centro de cada cruz 1 → 2 → 3 → 4 (superior izquierda, superior derecha, inferior derecha, inferior izquierda) hasta su marca. Afina con las flechas.</p>
        <div className="pj-row">
          <label className="pj-field">Ancho real (mm)<input inputMode="decimal" value={rect.w} onChange={e => setRect({ ...rect, w: Number(e.target.value) || 0 })}/></label>
          <label className="pj-field">Alto real (mm)<input inputMode="decimal" value={rect.h} onChange={e => setRect({ ...rect, h: Number(e.target.value) || 0 })}/></label>
        </div>
        <div className="pj-row pj-nudge" aria-label={`Afinar la esquina ${selected + 1}`}>
          <span>Esquina {selected + 1}</span>
          <button className="pj-btn" onClick={() => nudgeBy(-1, 0)} aria-label="Izquierda">←</button>
          <button className="pj-btn" onClick={() => nudgeBy(0, -1)} aria-label="Arriba">↑</button>
          <button className="pj-btn" onClick={() => nudgeBy(0, 1)} aria-label="Abajo">↓</button>
          <button className="pj-btn" onClick={() => nudgeBy(1, 0)} aria-label="Derecha">→</button>
          <button className="pj-btn" aria-pressed={nudge === 10} onClick={() => setNudge(n => n === 1 ? 10 : 1)}>{nudge === 1 ? 'Paso 1 px' : 'Paso 10 px'}</button>
        </div>
        {message && <p className="pj-msg">{message}</p>}
        <div className="pj-row"><button className="pj-btn primary" onClick={saveCorners}>Guardar calibración</button><button className="pj-btn" onClick={() => { setMessage(''); setMode('inicio'); }}>Cancelar</button><button className="pj-btn" onClick={() => setPanelUp(u => !u)}>{panelUp ? 'Bajar este panel' : 'Subir este panel'}</button></div>
      </div>
    </>}

    {mode === 'comprobar' && <div className={`pj-panel${panelUp ? ' pj-up' : ''}`}>
      <h2>Comprueba con la regla</h2>
      <p>El cuadro grande debe medir <strong>10 cm</strong> por lado y los pequeños <strong>5 cm</strong>. La cuadrícula cae cada 10 cm: compárala con tu tapete en el centro y en las orillas.</p>
      {notes.notes.map(note => <p key={note} className="pj-msg">{note}</p>)}
      <p className="pj-muted">Si alguna medida difiere más de 1–2 mm, repite la calibración. Recalibra siempre que muevas el proyector o cambies la ventana.</p>
      <div className="pj-row"><button className="pj-btn primary" onClick={() => { setPlacement(null); setMessage(''); setMode('proyectar'); }}>Está bien, proyectar</button><button className="pj-btn" onClick={() => setMode('inicio')}>Repetir calibración</button><button className="pj-btn" onClick={() => setPanelUp(u => !u)}>{panelUp ? 'Bajar este panel' : 'Subir este panel'}</button></div>
    </div>}
  </div>;
}
