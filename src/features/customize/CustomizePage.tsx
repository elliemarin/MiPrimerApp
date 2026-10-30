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
import { buildAssembly, assemblyHit, assemblyPoint, inverseAssemblyPoint, assemblyComponentFits, firstFittingAssemblyPosition, type AssemblySurface } from '../simple/assembled';
import { AssemblyArtwork } from '../simple/AssemblyArtwork';
import type { ComponentOption } from '../../data/components';
import './customize.css';

type Filter = 'recomendados' | 'bolsillos' | 'herramientas' | 'decoracion' | 'todos';
type Drag = { pointerId: number; kind: 'add' | 'move'; presetId?: string; componentId?: string; start: Pt; client: Pt; point?: Pt; offset?: Pt };
type Anchor = { view: DesignView; point: Pt; surface?: AssemblySurface };
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
  const [previewMode, setPreviewMode] = useState<'look' | 'pieces'>('look');
  const [sceneId, setSceneId] = useState<string>();
  const [target, setTarget] = useState<{ surfaceId: string; point: Pt }>();
  const [filter, setFilter] = useState<Filter>('recomendados');
  const [query, setQuery] = useState('');
  const [limit, setLimit] = useState(24);
  const [grid, setGrid] = useState(false);
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
  const scenes = useMemo(() => project ? buildAssembly(project) : [], [project]);
  useEffect(()=>{if(project&&physicalViewsNeedRefresh(project)){try{updateProject(projectId,current=>prepareSimpleProject(current));}catch{/* Missing or invalid base measurements are reported by the pattern/PDF validation. */}}},[project?.pattern,projectId,updateProject]);
  const recommended = useMemo(() => project ? optionsForProject(project) : [], [project?.modelId, project?.pattern?.generatorId]);
  useEffect(() => { setLimit(24); }, [filter, query]);
  useEffect(() => { setZoomBox(undefined); }, [viewId, sceneId, previewMode, projectId]);
  useEffect(() => { setSelectedId(undefined); setViewId(undefined); setSceneId(undefined); setTarget(undefined); setPreviewMode('look'); setMessage(''); setPending(undefined); history.current = []; setCanUndo(false); }, [projectId]);

  if (!project) return <div className="page"><Empty icon="proyectos" title="Proyecto no encontrado" action={<Button onClick={() => navigate('/biblioteca')}>Elegir una base</Button>} /></div>;
  const components = project.pattern?.components ?? [];
  const sourceDoc = project.design ?? newDesign([]);
  const physicalViews = sourceDoc.views.filter(view => view.source.type === 'pieza' && !view.source.pieceId.startsWith('componente-'));
  const views = physicalViews.length ? physicalViews : sourceDoc.views.filter(view => view.source.type !== 'pieza');
  const scene = scenes.find(item => item.id === sceneId) ?? scenes[0];
  const assembled = previewMode === 'look' && !!scene;
  const targetSurface = assembled ? scene.surfaces.find(surface => surface.id === target?.surfaceId) ?? scene.surfaces.find(surface => surface.primary) ?? scene.surfaces[0] : undefined;
  const view = assembled ? targetSurface?.view ?? views[0] : views.find(item => item.id === viewId) ?? views[0];
  const canvasView = assembled ? scene.view : view;
  const anchorAt = (point: Pt): Anchor | undefined => assembled ? assemblyHit(scene, point) : view ? { view, point } : undefined;
  const position = (component: PatternComponent, anchor: Anchor): PatternComponent => {
    const placed = componentAtPoint(component, anchor.view, anchor.point);
    const keepSide = !anchor.surface && component.placement?.viewId === anchor.view.id;
    return { ...placed, placement: {
      ...placed.placement!,
      assemblySurfaceId: anchor.surface?.id ?? (keepSide ? component.placement?.assemblySurfaceId : undefined),
      assemblySurfaceLabel: anchor.surface?.label ?? (keepSide ? component.placement?.assemblySurfaceLabel : undefined),
    } };
  };
  const withSurface = (component: PatternComponent, surface?: AssemblySurface): PatternComponent => ({ ...component, placement: component.placement ? { ...component.placement, assemblySurfaceId: surface?.id, assemblySurfaceLabel: surface?.label } : undefined });
  const selected = components.find(component => component.id === selectedId);
  const moving = drag?.kind === 'move' && drag.point && view ? components.find(component => component.id === drag.componentId) : undefined;
  const dragAnchor = drag?.point ? anchorAt(drag.point) : undefined;
  const liveComponents = moving && dragAnchor ? components.map(component => component.id === moving.id ? position(component, dragAnchor) : component) : components;
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
    setSelectedId(component.id); setMessage('Arrastra el extra sobre el diseño para cambiarlo de lugar.'); setPending(undefined);
  };
  const add = (presetId: string, point?: Pt, exact = false) => {
    if (!view) return;
    const hit = point ? anchorAt(point) : undefined;
    if (point && assembled && !hit) { setMessage('Suelta el extra sobre la prenda.'); return; }
    const chosenView = hit?.view ?? view;
    const surface = hit?.surface ?? targetSurface;
    const preferred = hit?.point ?? (surface?.id === target?.surfaceId ? target?.point : surface ? { x: (surface.physicalBounds.minX + surface.physicalBounds.maxX) / 2, y: (surface.physicalBounds.minY + surface.physicalBounds.maxY) / 2 } : undefined);
    const component = makeComponent(project, presetId, chosenView.id);
    const placed = preferred && exact ? componentAtPoint(component, chosenView, preferred) : surface ? firstFittingAssemblyPosition(component, surface, base?.pieces ?? [], preferred) : firstFittingPosition(component, chosenView, base?.pieces ?? [], preferred);
    if (placed && componentFits(placed, chosenView, base?.pieces ?? []) && (!surface || assemblyComponentFits(surface, placed))) accept(withSurface(placed, surface));
    else { setPending(withSurface(componentAtPoint(component, chosenView, preferred ?? { x: chosenView.minX + chosenView.width / 2, y: chosenView.minY + chosenView.height / 2 }), surface)); setMessage('El extra es grande para esta zona. Puedes hacerlo más pequeño.'); }
  };
  const edit = (patch: Partial<PatternComponent>) => {
    if (!selected || !view) return;
    const candidate = { ...selected, ...patch };
    const candidateView = views.find(item => item.id === candidate.placement?.viewId) ?? view;
    const candidateSurface = scenes.flatMap(item => item.surfaces).find(surface => surface.id === candidate.placement?.assemblySurfaceId);
    if (candidateSurface && !assemblyComponentFits(candidateSurface, candidate)) { setMessage('El extra no cabe en ese lado de la prenda. Reduce su tamaño o muévelo.'); return; }
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
    if (!selected?.placement || !canvasView || !svgRef.current) return;
    const surface = assembled ? scene.surfaces.find(item => item.id === selected.placement?.assemblySurfaceId) ?? scene.surfaces.find(item => item.viewId === selected.placement?.viewId) : undefined;
    const center = surface ? assemblyPoint(surface, selected.placement) : selected.placement;
    const opposite = surface ? assemblyPoint(surface, { x: selected.placement.x + selected.width / 2, y: selected.placement.y + selected.height / 2 }) : { x: center.x + selected.width / 2, y: center.y + selected.height / 2 };
    const box = svgRef.current.getBoundingClientRect();
    const ratio = box.width / Math.max(1, box.height);
    let width = Math.max(120, Math.abs(opposite.x - center.x) * 5), height = Math.max(120, Math.abs(opposite.y - center.y) * 5);
    if (width / height > ratio) height = width / ratio; else width = height * ratio;
    // The frame is captured once; dragging never chases the selected object.
    const x = Math.max(canvasView.minX, Math.min(canvasView.minX + canvasView.width - width, center.x - width / 2));
    const y = Math.max(canvasView.minY, Math.min(canvasView.minY + canvasView.height - height, center.y - height / 2));
    setZoomBox({ x, y, width, height });
  };
  const updateDrag = (next?: Drag) => { dragRef.current = next; setDrag(next); };
  const startAdd = (event: React.PointerEvent<HTMLButtonElement>, presetId: string) => {
    if (event.button !== 0) return;
    event.preventDefault(); event.currentTarget.setPointerCapture(event.pointerId);
    updateDrag({ pointerId: event.pointerId, kind: 'add', presetId, start: { x: event.clientX, y: event.clientY }, client: { x: event.clientX, y: event.clientY } });
  };
  const startMove = (event: React.PointerEvent<SVGGElement>, id: string, surface?: AssemblySurface) => {
    if (event.button !== 0 || !view) return;
    const component = components.find(item => item.id === id); if (!component) return;
    const body = sourceDoc.elements.find(element => componentIdForElement(element.id) === id && element.id.endsWith('--cuerpo'));
    setSelectedId(id);
    if (body?.locked) { setMessage('Este extra está bloqueado en el diseño guardado.'); return; }
    const point = pointInPreview(svgRef.current, event.clientX, event.clientY); if (!point) return;
    event.preventDefault(); event.stopPropagation(); svgRef.current?.setPointerCapture(event.pointerId);
    const center = surface && component.placement ? assemblyPoint(surface, component.placement) : { x: component.placement?.x ?? point.x, y: component.placement?.y ?? point.y };
    if (surface && component.placement) setTarget({ surfaceId: surface.id, point: { x: component.placement.x, y: component.placement.y } });
    updateDrag({ pointerId: event.pointerId, kind: 'move', componentId: id, start: { x: event.clientX, y: event.clientY }, client: { x: event.clientX, y: event.clientY }, point: center, offset: { x: point.x - center.x, y: point.y - center.y } });
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
      else setMessage('Suelta el extra sobre la prenda para añadirlo.');
    } else if (current.kind === 'move' && current.componentId && point) {
      const component = components.find(item => item.id === current.componentId); if (!component) return;
      const anchor = anchorAt({ x: point.x - (current.offset?.x ?? 0), y: point.y - (current.offset?.y ?? 0) });
      if (!anchor) { setMessage('Suelta el extra dentro de la prenda.'); return; }
      const moved = position(component, anchor);
      const movedSurface = anchor.surface ?? scenes.flatMap(item => item.surfaces).find(surface => surface.id === moved.placement?.assemblySurfaceId);
      if (componentFits(moved, anchor.view, base?.pieces ?? []) && (!movedSurface || assemblyComponentFits(movedSurface, moved))) { save(items => items.map(item => item.id === moved.id ? moved : item)); setMessage(''); }
      else setMessage('El extra no cabe en esa zona. Conservamos su posición anterior.');
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
  const focusComponent = (component: PatternComponent) => {
    setSelectedId(component.id);
    if (component.placement?.viewId) setViewId(component.placement.viewId);
    const side = scenes.find(item => item.surfaces.some(surface => surface.id === component.placement?.assemblySurfaceId))
      ?? scenes.find(item => item.surfaces.some(surface => surface.viewId === component.placement?.viewId));
    if (side) {
      setSceneId(side.id);
      const surface = side.surfaces.find(item => item.id === component.placement?.assemblySurfaceId) ?? side.surfaces.find(item => item.viewId === component.placement?.viewId);
      if (surface && component.placement) setTarget({ surfaceId: surface.id, point: { x: component.placement.x, y: component.placement.y } });
    }
  };

  return <div className="page page-wide customize-page">
    <header className="customize-head"><button className="back-link" onClick={() => navigate('/biblioteca')}><Icon name="back" size={18} />Cambiar base</button><h1>{title}</h1><p>{project.name}</p></header>
    <ProjectJourney projectId={projectId} step="personalizar" />
    <div className="customize-layout">
      <section className="customize-preview" aria-label="Colocar extras en la prenda">
        <div className="customize-preview-top">
          {assembled ? <div className="customize-view-tabs customize-look-tabs" role="group" aria-label="Lado de la prenda">{scenes.map(item => <button className="filter-chip" key={item.id} aria-pressed={item.id === scene.id} onClick={() => { setSceneId(item.id); setTarget(undefined); setSelectedId(undefined); setMessage(''); }}>{item.label}</button>)}</div> : <div className="customize-view-tabs" role="group" aria-label="Pieza de la prenda">{views.map(item => <button className="filter-chip" key={item.id} aria-pressed={item.id === view?.id} onClick={() => { setViewId(item.id); setMessage(''); }}>{viewName(item)}</button>)}</div>}
          <IconButton icon="undo" label="Deshacer cambio de extras" disabled={!canUndo} onClick={undo} />
          {scenes.length > 0 && <button className="customize-pieces-toggle" aria-label={assembled ? 'Ver piezas del patrón' : 'Volver a la prenda completa'} onClick={() => { setPreviewMode(assembled ? 'pieces' : 'look'); setGrid(!assembled ? false : grid); }}>{assembled ? 'Piezas' : 'Prenda'}</button>}
          {!assembled && <button className="icon-btn" aria-label="Mostrar cuadrícula" aria-pressed={grid} onClick={() => setGrid(!grid)} title="Cuadrícula de 1 cm"><Icon name="grid" /></button>}
        </div>
        {canvasView && view ? <div className={`customize-art${assembled ? ' customize-whole-look' : ''}${nativeDragging || drag?.kind === 'add' ? ' is-drop-target' : ''}`} onDragOver={event => { if (event.dataTransfer.types.includes(DRAG_TYPE)) { event.preventDefault(); event.dataTransfer.dropEffect = 'copy'; } }} onDrop={onDrop}>
          <svg ref={svgRef} viewBox={zoomBox ? `${zoomBox.x} ${zoomBox.y} ${zoomBox.width} ${zoomBox.height}` : `${canvasView.minX - 12} ${canvasView.minY - 12} ${canvasView.width + 24} ${canvasView.height + 24}`} role="img" aria-label={`${project.name}, ${assembled ? scene.label : viewName(view)}`} onPointerMove={movePointer} onPointerUp={event => finishPointer(event)} onPointerCancel={event => finishPointer(event, true)}>
            {assembled ? <AssemblyArtwork scene={scene} project={liveProject} fabrics={fabrics} selectedId={selectedId} onElementPointerDown={(event, elementId, surface) => { const id = componentIdForElement(elementId); if (id) startMove(event, id, surface); }} onSurfacePointerDown={(event, surface) => {
              const point = pointInPreview(svgRef.current, event.clientX, event.clientY);
              if (point) { setTarget({ surfaceId: surface.id, point: inverseAssemblyPoint(surface, point) }); setSelectedId(undefined); setMessage(`${surface.label}: elige el extra que quieres añadir.`); }
            }}/> : <><StudioDefs doc={doc} view={view} fabrics={fabrics} prefix="customize-" />
            <ViewBase view={view} mode="apariencia" prefix="customize-" fabrics={fabrics} />
            {grid && <PlacementGrid view={view} />}
            {displayParts.map(element => { const id = componentIdForElement(element.id); return <g key={element.id} data-component-id={id} onPointerDown={id ? event => startMove(event, id) : undefined}><ElementSvg el={element} mode="apariencia" prefix="customize-" doc={doc} fabrics={fabrics} /></g>; })}
            {displayedSelected?.placement?.viewId === view.id && <rect x={displayedSelected.placement.x - displayedSelected.width / 2 - 4} y={displayedSelected.placement.y - displayedSelected.height / 2 - 4} width={displayedSelected.width + 8} height={displayedSelected.height + 8} fill="none" stroke="#a26e00" strokeWidth={1.8} strokeDasharray="5 3" vectorEffect="non-scaling-stroke" pointerEvents="none" />}</>}
          </svg>
          {grid && !assembled && <span className="customize-grid-note">Cada cuadro: 1 cm</span>}
          {(selected || zoomBox) && <button className="customize-zoom-btn" onClick={toggleZoom}>{zoomBox ? 'Ver diseño completo' : 'Acercar zona'}</button>}
        </div> : <div className="customize-no-view"><Icon name="patronaje" size={40} /><p>Elige una base para colocar sus extras.</p></div>}
        <div className="customize-selection" aria-live="polite">
          {selected ? <><span><strong>{selectedName}</strong><small>Arrastra para mover · {formatLength(selected.width, unit)} × {formatLength(selected.height, unit)}</small></span><IconButton icon="trash" label="Eliminar extra seleccionado" onClick={deleteSelected} /></> : <p>{assembled ? 'Toca una zona de la prenda y elige qué agregar.' : 'Toca un extra para añadirlo o arrástralo desde su asa.'}</p>}
        </div>
        {components.length > 0 && <div className="customize-added-list" role="group" aria-label="Extras añadidos">{components.map(component => <button key={component.id} aria-pressed={selectedId === component.id} onClick={() => focusComponent(component)}>{nameOf(component)}{component.quantity > 1 ? ` ×${component.quantity}` : ''}</button>)}</div>}
        {message && <p className="customize-feedback" role="status">{message}</p>}
        {assembled && <p className="customize-reference-note">Aquí ves el diseño completo. Cada bolsillo o extra tendrá su propio patrón en el PDF.</p>}
        {!physicalViews.length && <p className="customize-reference-note">Vista orientativa: prueba la posición sobre la prenda antes de coser.</p>}
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
    <div className="customize-footer"><span>{components.length ? `${components.length} ${components.length === 1 ? 'extra' : 'extras'}` : 'Puedes conservar la base lisa'}</span><Button variant="primary" icon="palette" onClick={() => navigate(`/acabados/${projectId}`)}>Elegir telas</Button></div>
    {drag?.kind === 'add' && <div className="customize-drag-ghost" style={{ left: drag.client.x, top: drag.client.y }}><ComponentIcon option={COMPONENT_OPTIONS.find(option => option.id === drag.presetId) ?? COMPONENT_OPTIONS[0]} />Suelta sobre la prenda</div>}
    {pending && <Sheet title="Ajustar este extra" onClose={() => setPending(undefined)}><div className="stack"><Notice>Este extra es grande para esa zona. Ajusta su tamaño o elige otra zona de la prenda.</Notice><strong>{nameOf(pending)}</strong><ComponentDimensions prefix="pending-component" component={pending} onChange={patch => setPending({ ...pending, ...patch })} />{message && <p className="small" role="status">{message}</p>}<Button variant="primary" onClick={() => { const pendingView = views.find(item => item.id === pending.placement?.viewId) ?? view; if (!pendingView) return; const surface = scenes.flatMap(item => item.surfaces).find(item => item.id === pending.placement?.assemblySurfaceId); const placed = surface ? firstFittingAssemblyPosition(pending, surface, base?.pieces ?? [], pending.placement) : firstFittingPosition(pending, pendingView, base?.pieces ?? [], pending.placement); if (placed) accept(placed); else setMessage(componentPlacementProblem(pending, pendingView, base?.pieces ?? []) ?? 'Aún no cabe. Prueba un tamaño menor.'); }}>Añadir al diseño</Button><Button variant="ghost" onClick={() => setPending(undefined)}>Elegir otra zona</Button>{pendingDepth > 0 && <p className="tiny muted">El ancho y alto deben admitir el fuelle de {formatLength(pendingDepth, unit)}.</p>}</div></Sheet>}
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
