import { useEffect, useMemo, useRef, useState } from 'react';
import { useApp } from '../../store/app';
import { physicalViewsNeedRefresh, prepareSimpleProject } from '../simple/workflow';
import type { Project } from '../../store/types';
import { COMPONENT_OPTIONS, makeComponent, optionsForProject, searchComponents } from '../../data/components';
import { newPatternState } from '../../lib/pattern/engine';
import { cameraWindowFor, type PatternComponent } from '../../lib/pattern/components';
import type { Pt } from '../../lib/geom/vec';
import { Button, Empty, Field, IconButton, LengthInput, Notice, Select, Sheet, TextInput } from '../../ui/components';
import { ProjectJourney } from '../../ui/ProjectJourney';
import { Icon } from '../../ui/Icon';
import { navigate } from '../../ui/router';
import { formatLength } from '../../lib/units';
import { StudioDefs, ViewBase, ElementSvg } from '../studio/render';
import { newDesign, type DesignView } from '../studio/model';
import { basePanelPattern } from '../studio/panelWorkflow';
import { componentIdForElement, syncComponentDesign } from './componentDesign';
import { componentAtPoint, componentFits, componentPlacementProblem, firstFittingPosition, pointInPreview } from './placementDrag';
import { isBoughtTrim, isDecoration } from '../../lib/pattern/decorations';
import { decorationFoldPath, decorationPath } from './decorationArt';
import type { ComponentOption } from '../../data/components';
import './customize.css';

type Filter = 'recomendados' | 'bolsillos' | 'herramientas' | 'decoracion' | 'todos';
type Drag = { pointerId: number; kind: 'add' | 'move'; presetId?: string; componentId?: string; start: Pt; client: Pt; point?: Pt; offset?: Pt };
const nameOf = (component: PatternComponent) => component.name ?? COMPONENT_OPTIONS.find(option => option.kind === component.kind)?.name ?? 'Extra';
const viewName = (view: DesignView) => view.label.replace(/^Patrón real · /, '').replace(/en par simétrico/i, '(par)').replace(/completa/i, '').trim();
const DRAG_TYPE = 'application/x-hilvana-extra';

export function CustomizePage({ projectId }: { projectId: string }) {
  const project = useApp(state => state.projects[projectId]);
  const fabrics = useApp(state => state.fabrics);
  const updateProject = useApp(state => state.updateProject);
  const unit = useApp(state => state.settings.unit);
  const [selectedId, setSelectedId] = useState<string>();
  const [viewId, setViewId] = useState<string>();
  const [filter, setFilter] = useState<Filter>('recomendados');
  const [query, setQuery] = useState('');
  const [limit, setLimit] = useState(24);
  const [grid, setGrid] = useState(true);
  const [zoomBox, setZoomBox] = useState<{ x: number; y: number; width: number; height: number }>();
  const [drag, setDrag] = useState<Drag>();
  const dragRef = useRef<Drag>();
  const svgRef = useRef<SVGSVGElement>(null);
  const [nativeDragging, setNativeDragging] = useState(false);
  const [message, setMessage] = useState('');
  const [pending, setPending] = useState<PatternComponent>();
  const history = useRef<Pick<Project, 'pattern' | 'design' | 'status'>[]>([]);
  const [canUndo, setCanUndo] = useState(false);
  const base = useMemo(() => project ? basePanelPattern(project) : undefined, [project?.pattern]);
  useEffect(()=>{if(project&&physicalViewsNeedRefresh(project)){try{updateProject(projectId,current=>prepareSimpleProject(current));}catch{/* Missing or invalid base measurements are reported by the pattern/PDF validation. */}}},[project?.pattern,projectId,updateProject]);
  const recommended = useMemo(() => project ? optionsForProject(project) : [], [project?.modelId, project?.pattern?.generatorId]);
  useEffect(() => { setLimit(24); }, [filter, query]);
  useEffect(() => { setZoomBox(undefined); }, [viewId, projectId]);
  useEffect(() => { setSelectedId(undefined); setViewId(undefined); setMessage(''); setPending(undefined); history.current = []; setCanUndo(false); }, [projectId]);

  if (!project) return <div className="page"><Empty icon="proyectos" title="Proyecto no encontrado" action={<Button onClick={() => navigate('/biblioteca')}>Elegir una base</Button>} /></div>;
  const components = project.pattern?.components ?? [];
  const sourceDoc = project.design ?? newDesign([]);
  const physicalViews = sourceDoc.views.filter(view => view.source.type === 'pieza' && !view.source.pieceId.startsWith('componente-'));
  const views = physicalViews.length ? physicalViews : sourceDoc.views.filter(view => view.source.type !== 'pieza');
  const view = views.find(item => item.id === viewId) ?? views[0];
  const selected = components.find(component => component.id === selectedId);
  const moving = drag?.kind === 'move' && drag.point && view ? components.find(component => component.id === drag.componentId) : undefined;
  const liveComponents = moving && view && drag?.point ? components.map(component => component.id === moving.id ? componentAtPoint(component, view, drag.point!) : component) : components;
  const liveProject = moving && project.pattern ? syncComponentDesign({ ...project, pattern: { ...project.pattern, components: liveComponents } }) : project;
  const doc = liveProject.design ?? sourceDoc;
  const displayedSelected = liveComponents.find(component => component.id === selectedId);
  const options = searchComponents(query, (filter === 'recomendados' ? recommended : COMPONENT_OPTIONS)
    .filter(option => filter !== 'bolsillos' || option.group === 'bolsillos' || option.group === 'cierres')
    .filter(option => filter !== 'herramientas' || option.group === 'herramientas' || option.group === 'trabillas')
    .filter(option => filter !== 'decoracion' || option.group === 'decoracion'));
  const selectedName = selected ? nameOf(selected) : '';

  const save = (change: (current: PatternComponent[]) => PatternComponent[], text?: string) => updateProject(projectId, current => {
    history.current.push({ pattern: current.pattern, design: current.design, status: current.status });
    if (history.current.length > 30) history.current.shift();
    setCanUndo(true);
    const pattern = current.pattern ?? newPatternState('manual', {}, { kind: 'otro', fabric: current.fabricType, stretch: current.stretch, fit: current.fit });
    return syncComponentDesign({ ...current, status: 'diseno', pattern: { ...pattern, components: change(pattern.components ?? []) } });
  }, text);
  const undo = () => {
    const previous = history.current.pop(); if (!previous) return;
    updateProject(projectId, current => ({ ...current, ...previous }), 'Cambio de extras deshecho.');
    setCanUndo(history.current.length > 0); setSelectedId(undefined); setMessage('Cambio deshecho.');
  };
  const accept = (component: PatternComponent) => {
    save(current => [...current, component], isBoughtTrim(component.kind)?'Decoración añadida con metraje y guía de colocación.':'Extra añadido con sus piezas de confección.');
    setSelectedId(component.id); setMessage('Arrastra el extra sobre la pieza para cambiarlo de lugar.'); setPending(undefined);
  };
  const add = (presetId: string, point?: Pt, exact = false) => {
    if (!view) return;
    const component = makeComponent(project, presetId, view.id);
    const placed = point && exact ? componentAtPoint(component, view, point) : firstFittingPosition(component, view, base?.pieces ?? [], point);
    if (placed && componentFits(placed, view, base?.pieces ?? [])) accept(placed);
    else { setPending(componentAtPoint(component, view, point ?? { x: view.minX + view.width / 2, y: view.minY + view.height / 2 })); setMessage('Este tamaño no cabe en la pieza elegida. Puedes ajustarlo o elegir otra pieza.'); }
  };
  const edit = (patch: Partial<PatternComponent>) => {
    if (!selected || !view) return;
    const candidate = { ...selected, ...patch };
    const candidateView = views.find(item => item.id === candidate.placement?.viewId) ?? view;
    const problem = componentPlacementProblem(candidate, candidateView, base?.pieces ?? []);
    if (problem) { setMessage(problem); return; }
    save(current => current.map(component => component.id === selected.id ? candidate : component)); setMessage('');
  };
  const deleteSelected = () => {
    if (!selected) return;
    save(current => current.filter(component => component.id !== selected.id), 'Extra eliminado.'); setSelectedId(undefined); setMessage('');
  };
  const toggleZoom = () => {
    if (zoomBox) { setZoomBox(undefined); return; }
    if (!selected?.placement || !view || !svgRef.current) return;
    const box = svgRef.current.getBoundingClientRect();
    const ratio = box.width / Math.max(1, box.height);
    let width = Math.max(120, selected.width * 2.5), height = Math.max(120, selected.height * 2.5);
    if (width / height > ratio) height = width / ratio; else width = height * ratio;
    // The frame is captured once; dragging never chases the selected object.
    const x = Math.max(view.minX, Math.min(view.minX + view.width - width, selected.placement.x - width / 2));
    const y = Math.max(view.minY, Math.min(view.minY + view.height - height, selected.placement.y - height / 2));
    setZoomBox({ x, y, width, height });
  };
  const updateDrag = (next?: Drag) => { dragRef.current = next; setDrag(next); };
  const startAdd = (event: React.PointerEvent<HTMLButtonElement>, presetId: string) => {
    if (event.button !== 0) return;
    event.preventDefault(); event.currentTarget.setPointerCapture(event.pointerId);
    updateDrag({ pointerId: event.pointerId, kind: 'add', presetId, start: { x: event.clientX, y: event.clientY }, client: { x: event.clientX, y: event.clientY } });
  };
  const startMove = (event: React.PointerEvent<SVGGElement>, id: string) => {
    if (event.button !== 0 || !view) return;
    const component = components.find(item => item.id === id); if (!component) return;
    const body = sourceDoc.elements.find(element => componentIdForElement(element.id) === id && element.id.endsWith('--cuerpo'));
    setSelectedId(id);
    if (body?.locked) { setMessage('Este extra está bloqueado en el diseño guardado.'); return; }
    const point = pointInPreview(svgRef.current, event.clientX, event.clientY); if (!point) return;
    event.preventDefault(); event.stopPropagation(); svgRef.current?.setPointerCapture(event.pointerId);
    updateDrag({ pointerId: event.pointerId, kind: 'move', componentId: id, start: { x: event.clientX, y: event.clientY }, client: { x: event.clientX, y: event.clientY }, point: { x: component.placement?.x ?? point.x, y: component.placement?.y ?? point.y }, offset: { x: point.x - (component.placement?.x ?? point.x), y: point.y - (component.placement?.y ?? point.y) } });
  };
  const movePointer = (event: React.PointerEvent<SVGSVGElement | HTMLButtonElement>) => {
    const current = dragRef.current; if (!current || current.pointerId !== event.pointerId) return;
    const point = pointInPreview(svgRef.current, event.clientX, event.clientY);
    updateDrag({ ...current, client: { x: event.clientX, y: event.clientY }, point: point ? { x: point.x - (current.offset?.x ?? 0), y: point.y - (current.offset?.y ?? 0) } : undefined });
  };
  const finishPointer = (event: React.PointerEvent<SVGSVGElement | HTMLButtonElement>, cancel = false) => {
    const current = dragRef.current; if (!current || current.pointerId !== event.pointerId) return;
    updateDrag(undefined);
    if (cancel || !view) return;
    const point = pointInPreview(svgRef.current, event.clientX, event.clientY);
    if (current.kind === 'add' && current.presetId) {
      if (Math.hypot(event.clientX - current.start.x, event.clientY - current.start.y) < 6) add(current.presetId);
      else if (point) add(current.presetId, point, true);
      else setMessage('Suelta el extra sobre la pieza para añadirlo.');
    } else if (current.kind === 'move' && current.componentId && point) {
      const component = components.find(item => item.id === current.componentId); if (!component) return;
      const moved = componentAtPoint(component, view, { x: point.x - (current.offset?.x ?? 0), y: point.y - (current.offset?.y ?? 0) });
      if (componentFits(moved, view, base?.pieces ?? [])) { save(items => items.map(item => item.id === moved.id ? moved : item)); setMessage(''); }
      else setMessage('El extra debe quedar dentro de la pieza. Conservamos su posición anterior.');
    }
  };
  const onDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault(); setNativeDragging(false);
    const presetId = event.dataTransfer.getData(DRAG_TYPE); if (!presetId) return;
    const point = pointInPreview(svgRef.current, event.clientX, event.clientY); if (point) add(presetId, point, true);
  };
  const title = physicalViews.length ? 'Coloca tus extras' : 'Personaliza tu base';
  const displayParts = doc.elements.filter(element => element.viewId === view?.id && !element.hidden);
  const pendingDepth = pending?.kind === 'bolsillo-cargo' ? pending.depth ?? 30 : 0;

  return <div className="page page-wide customize-page">
    <header className="customize-head"><button className="back-link" onClick={() => navigate('/biblioteca')}><Icon name="back" size={18} />Cambiar base</button><h1>{title}</h1><p>{project.name}</p></header>
    <ProjectJourney projectId={projectId} step="personalizar" />
    <div className="customize-layout">
      <section className="customize-preview" aria-label="Colocar extras en la prenda">
        <div className="customize-preview-top">
          <div className="customize-view-tabs" role="group" aria-label="Pieza de la prenda">{views.map(item => <button className="filter-chip" key={item.id} aria-pressed={item.id === view?.id} onClick={() => { setViewId(item.id); setMessage(''); }}>{viewName(item)}</button>)}</div>
          <IconButton icon="undo" label="Deshacer cambio de extras" disabled={!canUndo} onClick={undo} />
          <button className="icon-btn" aria-label="Mostrar cuadrícula" aria-pressed={grid} onClick={() => setGrid(!grid)} title="Cuadrícula de 1 cm"><Icon name="grid" /></button>
        </div>
        {view ? <div className={`customize-art${nativeDragging || drag?.kind === 'add' ? ' is-drop-target' : ''}`} onDragOver={event => { if (event.dataTransfer.types.includes(DRAG_TYPE)) { event.preventDefault(); event.dataTransfer.dropEffect = 'copy'; } }} onDrop={onDrop}>
          <svg ref={svgRef} viewBox={zoomBox ? `${zoomBox.x} ${zoomBox.y} ${zoomBox.width} ${zoomBox.height}` : `${view.minX - 12} ${view.minY - 12} ${view.width + 24} ${view.height + 24}`} role="img" aria-label={`${project.name}, ${viewName(view)}`} onPointerMove={movePointer} onPointerUp={event => finishPointer(event)} onPointerCancel={event => finishPointer(event, true)}>
            <StudioDefs doc={doc} view={view} fabrics={fabrics} prefix="customize-" />
            <ViewBase view={view} mode="apariencia" prefix="customize-" fabrics={fabrics} />
            {grid && <PlacementGrid view={view} />}
            {displayParts.map(element => { const id = componentIdForElement(element.id); return <g key={element.id} data-component-id={id} onPointerDown={id ? event => startMove(event, id) : undefined}><ElementSvg el={element} mode="apariencia" prefix="customize-" doc={doc} fabrics={fabrics} /></g>; })}
            {displayedSelected?.placement?.viewId === view.id && <rect x={displayedSelected.placement.x - displayedSelected.width / 2 - 4} y={displayedSelected.placement.y - displayedSelected.height / 2 - 4} width={displayedSelected.width + 8} height={displayedSelected.height + 8} fill="none" stroke="#a26e00" strokeWidth={1.8} strokeDasharray="5 3" vectorEffect="non-scaling-stroke" pointerEvents="none" />}
          </svg>
          {grid && <span className="customize-grid-note">Cada cuadro: 1 cm</span>}
          {(selected || zoomBox) && <button className="customize-zoom-btn" onClick={toggleZoom}>{zoomBox ? 'Ver pieza completa' : 'Acercar zona'}</button>}
        </div> : <div className="customize-no-view"><Icon name="patronaje" size={40} /><p>Elige una base para colocar sus extras.</p></div>}
        <div className="customize-selection" aria-live="polite">
          {selected ? <><span><strong>{selectedName}</strong><small>Arrastra para mover · {formatLength(selected.width, unit)} × {formatLength(selected.height, unit)}</small></span><IconButton icon="trash" label="Eliminar extra seleccionado" onClick={deleteSelected} /></> : <p>Toca un extra para añadirlo o arrástralo desde su asa.</p>}
        </div>
        {components.length > 0 && <div className="customize-added-list" role="group" aria-label="Extras añadidos">{components.map(component => <button key={component.id} aria-pressed={selectedId === component.id} onClick={() => { setSelectedId(component.id); if (component.placement?.viewId) setViewId(component.placement.viewId); }}>{nameOf(component)}{component.quantity > 1 ? ` ×${component.quantity}` : ''}</button>)}</div>}
        {message && <p className="customize-feedback" role="status">{message}</p>}
        {!physicalViews.length && <p className="customize-reference-note">Vista ilustrativa: prueba la posición sobre la prenda real antes de coser.</p>}
      </section>

      <section className="customize-gallery" aria-label="Catálogo de extras">
        <h2>¿Qué quieres agregar?</h2>
        <TextInput aria-label="Buscar extras" placeholder="Bolsillo, encaje, olán, celular…" value={query} onChange={setQuery} />
        <div className="customize-filters" role="group" aria-label="Tipos de extra">{([['recomendados', 'Para esta prenda'], ['decoracion', 'Decorar'], ['bolsillos', 'Bolsillos'], ['herramientas', 'Herramientas'], ['todos', 'Todos']] as const).map(([value, label]) => <button key={value} className="filter-chip" aria-pressed={filter === value} onClick={() => setFilter(value)}>{label}</button>)}</div>
        <p className="customize-result-count">{options.length} opciones · Patrones de tela o metraje de mercería</p>
        <div className="customize-options">{options.slice(0, limit).map(option => <div key={option.id} className="customize-option">
          <button className="customize-option-add" aria-label={`Agregar ${option.name.toLowerCase()}`} onClick={() => add(option.id)} draggable onDragStart={event => { event.dataTransfer.setData(DRAG_TYPE, option.id); event.dataTransfer.effectAllowed = 'copy'; setNativeDragging(true); }} onDragEnd={() => setNativeDragging(false)}><ComponentIcon option={option} /><span><strong>{option.name}</strong><small>{formatLength(option.defaultWidth, unit)} × {formatLength(option.defaultHeight, unit)}{isBoughtTrim(option.kind)?' · Comprado':''}</small></span><Icon name="plus" size={17} /></button>
          <button className="customize-drag-handle" aria-label={`Arrastrar ${option.name.toLowerCase()}`} title="Arrastrar sobre la pieza" onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); add(option.id); } }} onPointerDown={event => startAdd(event, option.id)} onPointerMove={movePointer} onPointerUp={event => finishPointer(event)} onPointerCancel={event => finishPointer(event, true)}><Icon name="move" size={17} /><span>Arrastrar</span></button>
        </div>)}</div>
        {!options.length && <p className="small muted">Prueba otro nombre o elige Todos.</p>}
        {options.length > limit && <Button block onClick={() => setLimit(limit + 24)}>Mostrar más extras</Button>}
        {selected && <details className="customize-editor" key={selected.id}><summary>Medidas y posición</summary><div className="customize-editor-body">
          <ComponentDimensions component={selected} onChange={edit} />
          <Field label="Dónde lo vas a coser" htmlFor="component-location"><TextInput id="component-location" value={selected.placement?.label ?? ''} onChange={label => edit({ placement: { x: selected.placement?.x ?? 0, y: selected.placement?.y ?? 0, ...selected.placement, label } })} /></Field>
          <div className="customize-dimensions"><Field label="Centro horizontal" htmlFor="component-x"><LengthInput id="component-x" mm={selected.placement?.x ?? 0} onChange={x => x !== undefined && view && edit({ placement: { ...selected.placement, x, y: selected.placement?.y ?? 0, viewId: view.id, pieceId: view.source.type === 'pieza' ? view.source.pieceId : undefined } })} /></Field><Field label="Centro vertical" htmlFor="component-y"><LengthInput id="component-y" mm={selected.placement?.y ?? 0} onChange={y => y !== undefined && view && edit({ placement: { ...selected.placement, x: selected.placement?.x ?? 0, y, viewId: view.id, pieceId: view.source.type === 'pieza' ? view.source.pieceId : undefined } })} /></Field></div>
          <p className="tiny muted">Medidas terminadas. Los márgenes se agregan una sola vez en el patrón.</p>
        </div></details>}
      </section>
    </div>
    <div className="customize-footer"><span>{components.length ? `${components.length} ${components.length === 1 ? 'extra' : 'extras'}` : 'Puedes conservar la base lisa'}</span><Button variant="primary" icon="palette" onClick={() => navigate(`/acabados/${projectId}`)}>Elegir telas y bordados</Button></div>
    {drag?.kind === 'add' && <div className="customize-drag-ghost" style={{ left: drag.client.x, top: drag.client.y }}><ComponentIcon option={COMPONENT_OPTIONS.find(option => option.id === drag.presetId) ?? COMPONENT_OPTIONS[0]} />Suelta sobre la pieza</div>}
    {pending && <Sheet title="Ajustar este extra" onClose={() => setPending(undefined)}><div className="stack"><Notice>El extra no cabe todavía en esta pieza. Ajusta sus medidas o vuelve para elegir otra pieza; conservaremos el tamaño que elijas.</Notice><strong>{nameOf(pending)}</strong><ComponentDimensions prefix="pending-component" component={pending} onChange={patch => setPending({ ...pending, ...patch })} />{message && <p className="small" role="status">{message}</p>}<Button variant="primary" onClick={() => { if (!view) return; const placed = firstFittingPosition(pending, view, base?.pieces ?? [], pending.placement); if (placed) accept(placed); else setMessage(componentPlacementProblem(pending, view, base?.pieces ?? []) ?? 'Aún no cabe. Prueba un tamaño menor o elige otra pieza.'); }}>Añadir a esta pieza</Button><Button variant="ghost" onClick={() => setPending(undefined)}>Elegir otra pieza</Button>{pendingDepth > 0 && <p className="tiny muted">El ancho y alto deben admitir el fuelle de {formatLength(pendingDepth, unit)}.</p>}</div></Sheet>}
  </div>;
}

function ComponentDimensions({ component, onChange, prefix = 'component' }: { component: PatternComponent; onChange: (patch: Partial<PatternComponent>) => void; prefix?: string }) {
  const depth = component.kind === 'bolsillo-cargo' ? component.depth ?? 30 : 0;
  const loop = component.kind === 'trabilla' || component.kind === 'porta-martillo';
  const camera = component.kind === 'porta-telefono-camara' ? cameraWindowFor(component) : undefined;
  const decoration=isDecoration(component.kind);
  return <><div className="customize-dimensions">
    <Field label={decoration?"Largo al colocarlo":"Ancho terminado"} htmlFor={`${prefix}-width`}><LengthInput id={`${prefix}-width`} mm={component.width} min={decoration ? 50 : loop ? 10 : Math.max(40, depth * 2)} max={decoration?2000:600} onChange={width => width !== undefined && onChange({ width })} /></Field>
    <Field label={decoration?"Ancho visible":"Alto terminado"} htmlFor={`${prefix}-height`}><LengthInput id={`${prefix}-height`} mm={component.height} min={decoration?10:Math.max(50, depth * 2)} max={decoration?400:800} onChange={height => height !== undefined && onChange({ height })} /></Field>
    <Field label="Cantidad" htmlFor={`${prefix}-quantity`}><Select id={`${prefix}-quantity`} value={String(component.quantity)} options={Array.from({ length: 8 }, (_, index) => ({ value: String(index + 1), label: `${index + 1} ${index ? 'unidades' : 'unidad'}` }))} onChange={quantity => onChange({ quantity: Number(quantity) })} /></Field>
    {component.kind === 'olan-fruncido' && <Field label="Cantidad de frunce" htmlFor={`${prefix}-fullness`}><Select id={`${prefix}-fullness`} value={String(component.decoration?.fullness??2)} options={[1.25,1.5,2,2.5,3].map(value=>({value:String(value),label:`${value}× el largo montado`}))} onChange={value=>onChange({decoration:{style:'frunce',...component.decoration,fullness:Number(value)}})}/></Field>}
    {component.kind === 'olan-plisado' && <Field label="Pliegues" htmlFor={`${prefix}-pleats`}><Select id={`${prefix}-pleats`} value={String(component.decoration?.pleats??6)} options={Array.from({length:Math.min(23,Math.floor(component.width/5)-1)},(_,i)=>({value:String(i+2),label:`${i+2} pliegues`}))} onChange={value=>onChange({decoration:{style:'pliegues',...component.decoration,pleats:Number(value)}})}/></Field>}
    {component.kind === 'bolsillo-cargo' && <Field label="Fondo del fuelle" htmlFor={`${prefix}-depth`}><LengthInput id={`${prefix}-depth`} mm={depth} min={15} max={Math.min(100, component.width / 2, component.height / 2)} onChange={value => value !== undefined && onChange({ depth: value })} /></Field>}
    {component.kind === 'porta-herramientas' && <Field label="Canales" htmlFor={`${prefix}-channels`}><Select id={`${prefix}-channels`} value={String(component.channels ?? 3)} options={Array.from({ length: 8 }, (_, index) => ({ value: String(index + 1), label: `${index + 1} ${index ? 'canales' : 'canal'}` }))} onChange={value => onChange({ channels: Number(value) })} /></Field>}
  </div>{decoration&&<p className="tiny muted">{isBoughtTrim(component.kind)?'Elige una puntilla o cinta ya fabricada. El PDF indica cuánto comprar y dónde coserla; su dibujo es ilustrativo.':'El patrón desarrolla la tira de tela con sus márgenes y marcas. El tamaño que ves aquí es el que ocupará ya montada.'}</p>}{camera && <fieldset className="customize-camera"><legend>Ventana de cámara</legend><p className="tiny muted">Mide la cámara con el teléfono dentro de su funda. Las medidas parten de la esquina superior izquierda del portacelular.</p><div className="customize-dimensions">{([['left','Desde la izquierda'],['top','Desde arriba'],['width','Ancho de ventana'],['height','Alto de ventana']] as const).map(([key,label])=><Field key={key} label={label} htmlFor={`${prefix}-camera-${key}`}><LengthInput id={`${prefix}-camera-${key}`} mm={camera[key]} min={key==='left'||key==='top'?12:10} max={key==='left'?component.width-camera.width-12:key==='top'?component.height-camera.height-15:key==='width'?component.width-camera.left-12:component.height-camera.top-15} onChange={value=>value!==undefined&&onChange({camera:{...camera,[key]:value}})} /></Field>)}</div></fieldset>}</>;
}

function PlacementGrid({ view }: { view: DesignView }) {
  const startX = Math.ceil(view.minX / 50) * 50, startY = Math.ceil(view.minY / 50) * 50;
  const xs = Array.from({ length: Math.min(70, Math.ceil(view.width / 50) + 1) }, (_, index) => startX + index * 50);
  const ys = Array.from({ length: Math.min(70, Math.ceil(view.height / 50) + 1) }, (_, index) => startY + index * 50);
  return <g pointerEvents="none"><defs><pattern id="customize-grid-small" width="10" height="10" patternUnits="userSpaceOnUse"><path d="M10 0H0V10" fill="none" stroke="#24584a" strokeOpacity=".16" strokeWidth=".5" /></pattern><pattern id="customize-grid-large" width="50" height="50" patternUnits="userSpaceOnUse"><rect width="50" height="50" fill="url(#customize-grid-small)" /><path d="M50 0H0V50" fill="none" stroke="#24584a" strokeOpacity=".25" strokeWidth=".8" /></pattern></defs><rect x={view.minX} y={view.minY} width={view.width} height={view.height} fill="url(#customize-grid-large)" />{xs.map(x => <text key={`x${x}`} x={x + 2} y={view.minY + 10} fill="#24584a" fontSize="7">{x / 10}</text>)}{ys.map(y => <text key={`y${y}`} x={view.minX + 2} y={y - 2} fill="#24584a" fontSize="7">{y / 10}</text>)}</g>;
}

function ComponentIcon({ option }: { option: ComponentOption }) {
  const kind=option.kind;
  if(isDecoration(kind)) {
    const component={kind,width:option.defaultWidth,height:option.defaultHeight,decoration:option.defaultDecoration};
    return <svg className="component-icon" viewBox="0 0 64 64" fill="none" aria-hidden="true"><g transform="translate(5 17) scale(.54 .3)"><path d={decorationPath(component)} fill="#E6D4AF" stroke="#756047" strokeWidth="1.3"/><path d={decorationFoldPath(component)} stroke="#756047" strokeWidth="1.1"/></g><path d="M7 15H57" stroke="#756047" strokeWidth=".7" strokeDasharray="2 2"/></svg>;
  }
  const strap = kind === 'trabilla' || kind === 'porta-martillo';
  const flap = kind.includes('solapa') || kind === 'bolsillo-cargo';
  const camera = kind === 'porta-telefono-camara';
  return <svg className="component-icon" viewBox="0 0 64 64" fill="none" aria-hidden="true">{strap ? <><path d="M23 8h18v48H23z" fill="var(--mat-soft)" stroke="currentColor" strokeWidth="1.6" /><path d="M23 18h18M23 46h18" stroke="currentColor" strokeDasharray="2 2" /></> : <><path d={kind === 'bolsillo-punta' ? 'M12 12h40v34L32 56 12 46Z' : kind === 'bolsillo-redondeado' ? 'M12 12h40v25q0 18-20 18T12 37Z' : 'M12 12h40v42H12Z'} fill="var(--mat-soft)" stroke="currentColor" strokeWidth="1.6" />{flap && <path d="M9 10h46v15l-23 6-23-6Z" fill="var(--tape-soft)" stroke="currentColor" strokeWidth="1.6" />}{(kind.includes('boton') || kind === 'bolsillo-cargo') && <circle cx="32" cy="23" r="2.3" fill="currentColor" />}{kind === 'bolsillo-cierre' && <path d="M16 21h32" stroke="currentColor" strokeWidth="3" strokeDasharray="1 1.5" />}{kind === 'porta-herramientas' && <path d="M25 19v32M39 19v32M18 20V8M32 20V6M46 20V10" stroke="currentColor" strokeWidth="2" />}{camera && <rect x="20" y="18" width="17" height="14" rx="2" fill="var(--surface)" stroke="currentColor" strokeWidth="1.6" />}</>}</svg>;
}
