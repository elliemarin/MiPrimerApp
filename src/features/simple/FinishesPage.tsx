import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { useApp } from '../../store/app';
import { designHash } from '../../store/projects';
import { Button, Empty, Field, IconButton, LengthInput, PageHead, Sheet } from '../../ui/components';
import { ProjectJourney } from '../../ui/ProjectJourney';
import { navigate } from '../../ui/router';
import { Icon } from '../../ui/Icon';
import { StudioDefs, ViewBase, ElementSvg } from '../studio/render';
import type { DesignDoc, DesignElement, DesignView, Fill } from '../studio/model';
import { elementCorners } from '../studio/model';
import { editElement, removeElements, toLocal } from '../studio/ops';
import { componentElementId, componentIdForElement, reconcileComponentDesign } from '../customize/componentDesign';
import { pointInPreview } from '../customize/placementDrag';
import { applyMaterial, materialTargets, missingMaterials, physicalViewsNeedRefresh, prepareSimpleProject, simpleViews, type MaterialTarget } from './workflow';
import { FabricTray } from '../studio/FabricTray';
import { EmbroideryPicker, type EmbroideryChoice } from './EmbroideryPicker';
import { createEmbroideryMotif } from '../../lib/draw/embroideryMotifs';
import { createLettering } from '../../lib/draw/lettering';
import type { Pt } from '../../lib/geom/vec';
import { pointInPolygon } from '../../lib/geom/vec';
import { cmdsToPolylines } from '../../lib/draw/flatten';
import { parseSvgPath } from '../../lib/draw/svgpath';
import { findModel } from '../../data/catalog';
import { ProjectModelPreview } from './ProjectModelPreview';
import { supportsModelIllustration } from '../../lib/draw/garmentComposition';
import { assemblyHit, assemblySurfaceForElement, buildAssembly, inverseAssemblyPoint, type AssemblySurface } from './assembled';
import { AssemblyArtwork } from './AssemblyArtwork';
import { embroideryFitsView, firstEmbroideryPosition, moveEmbroidery } from './finishEmbroidery';
import './finishes.css';

const COLORS = ['#F3E9D2', '#18211D', '#FFFFFF', '#24584A', '#B4273A', '#DFAE29', '#3366AA', '#8A5D91', '#C97B55', '#849B79', '#F6CADA', '#757975'];
const EditorialSheet = lazy(() => import('../editorial/EditorialSheet').then(module => ({ default: module.EditorialSheet })));
function rootOf(doc: DesignDoc, element: DesignElement): DesignElement {
  const parent = element.parentId ? doc.elements.find(candidate => candidate.id === element.parentId) : undefined;
  return parent ? rootOf(doc, parent) : element;
}
type EmbroideryDrag = { id: string; point: Pt; start: DesignElement; doc: DesignDoc; latest: DesignDoc; view: DesignView; surface?: AssemblySurface; offset: Pt };

export function FinishesPage({ projectId }: { projectId: string }) {
  const project = useApp(state => state.projects[projectId]);
  const fabrics = useApp(state => state.fabrics);
  const update = useApp(state => state.updateProject);
  const [mode, setMode] = useState<'materiales' | 'bordados'>('materiales');
  const [viewId, setViewId] = useState<string>();
  const [sceneId, setSceneId] = useState<string>();
  const [surfaceId, setSurfaceId] = useState<string>();
  const [pieceMode, setPieceMode] = useState(false);
  const [targetId, setTargetId] = useState<string>();
  const [materialScope, setMaterialScope] = useState<'all' | 'part'>('all');
  const [palette, setPalette] = useState(false);
  const [fabricTray, setFabricTray] = useState(false);
  const materialTrigger = useRef<HTMLButtonElement | null>(null);
  const [picker, setPicker] = useState(false);
  const [modelPreview, setModelPreview] = useState(false);
  const [editorial, setEditorial] = useState(false);
  const [selected, setSelected] = useState<string>();
  const [live, setLive] = useState<DesignDoc>();
  const [past, setPast] = useState<DesignDoc[]>([]), [future, setFuture] = useState<DesignDoc[]>([]);
  const svg = useRef<SVGSVGElement>(null);
  const drag = useRef<EmbroideryDrag>();
  const insertionPoint = useRef<{ surfaceId: string; point: Pt }>();
  const materialTap = useRef<{ item: MaterialTarget; surface: AssemblySurface; x: number; y: number }>();
  const scenes = useMemo(() => project?.design ? buildAssembly({ ...project, design: live ?? project.design }) : [], [project, live]);
  useEffect(() => {
    if (project && physicalViewsNeedRefresh(project)) {
      try { update(projectId, current => prepareSimpleProject(current)); }
      catch { /* Pattern validation explains missing or invalid measurements. */ }
    }
  }, [project?.pattern, projectId, update]);
  useEffect(() => {
    setMode('materiales'); setViewId(undefined); setSceneId(undefined); setSurfaceId(undefined);
    setPieceMode(false); setTargetId(undefined); setPalette(false); setFabricTray(false);
    setSelected(undefined); setLive(undefined); setPast([]); setFuture([]); drag.current = undefined; insertionPoint.current = undefined; materialTap.current = undefined;
  }, [projectId]);
  if (!project?.design) return <div className="page"><Empty icon="estudio" title="Elige una base para empezar" action={<Button onClick={() => navigate('/biblioteca')}>Elegir base</Button>}/></div>;

  const doc = live ?? project.design;
  const views = simpleViews(doc);
  const scene = scenes.find(candidate => candidate.id === sceneId) ?? scenes[0];
  const surface = scene?.surfaces.find(candidate => candidate.id === surfaceId) ?? scene?.surfaces.find(candidate => candidate.primary) ?? scene?.surfaces[0];
  const view = pieceMode ? views.find(candidate => candidate.id === viewId) ?? views[0] : surface?.view ?? views[0];
  const displayView = !pieceMode && scene ? scene.view : view;
  if (!view || !displayView) return <div className="page"><Empty title="Preparando tu diseño" icon="estudio" body="Vuelve a las medidas si todavía falta alguna." action={<Button onClick={() => navigate(`/proyectos/${projectId}/medidas`)}>Revisar medidas</Button>}/></div>;
  const targets = materialTargets(project), missing = missingMaterials(project);
  const target = targets.find(candidate => candidate.id === targetId) ?? targets.find(candidate => candidate.viewId === view.id) ?? targets[0];
  const artwork = doc.elements.filter(element => element.kind === 'grupo' && element.embroidery && (pieceMode ? element.viewId === view.id : scene && assemblySurfaceForElement(scene, { ...project, design: doc }, element)));
  const active = doc.elements.find(element => element.id === selected && element.embroidery);
  const activeView = active ? views.find(candidate => candidate.id === active.viewId) ?? view : view;
  const activeSurface = active ? scenes.flatMap(item => item.surfaces).find(item => item.id === active.assemblySurfaceId)
    ?? (scene && !pieceMode ? assemblySurfaceForElement(scene, { ...project, design: doc }, active) : undefined) : undefined;
  const catalogModel = findModel(project.modelId ?? '');
  const currentFill = materialScope === 'all' ? targets.find(item => item.fill && item.fill.type !== 'ninguno')?.fill : target?.fill;
  const materialLabel = materialScope === 'all' ? 'Todo el diseño' : target?.label ?? 'Esta parte';

  const commit = (next: DesignDoc) => {
    setLive(undefined);
    if (designHash(next) === designHash(project.design)) return;
    setPast(values => [...values.slice(-59), project.design!]); setFuture([]);
    update(projectId, current => reconcileComponentDesign({ ...current, design: next }, fabrics));
  };
  const restoreMaterialFocus = () => requestAnimationFrame(() => materialTrigger.current?.focus({ preventScroll: true }));
  const closePalette = () => { setPalette(false); restoreMaterialFocus(); };
  const closeFabrics = () => { setFabricTray(false); restoreMaterialFocus(); };
  const material = (fill: Fill, all = false) => {
    const ids = all || materialScope === 'all' ? targets.map(item => item.id) : target ? [target.id] : [];
    if (!ids.length) return;
    setPast(values => [...values.slice(-59), project.design!]); setFuture([]);
    update(projectId, current => applyMaterial(current, ids, fill, fabrics));
    setPalette(false); setFabricTray(false); restoreMaterialFocus();
  };
  const showTarget = (item: MaterialTarget, trigger?: HTMLButtonElement, pickedSurface?: AssemblySurface) => {
    if (trigger) materialTrigger.current = trigger;
    setTargetId(item.id); setMaterialScope('part'); setViewId(item.viewId);
    const element = item.kind === 'elemento' ? doc.elements.find(candidate => candidate.id === item.targetId) : undefined;
    const wantedSurface = pickedSurface?.id ?? element?.assemblySurfaceId;
    const matchingScene = scenes.find(candidate => candidate.surfaces.some(candidateSurface => wantedSurface ? candidateSurface.id === wantedSurface : candidateSurface.viewId === item.viewId));
    const matchingSurface = matchingScene?.surfaces.find(candidate => wantedSurface ? candidate.id === wantedSurface : candidate.viewId === item.viewId);
    if (matchingScene && matchingSurface) { setSceneId(matchingScene.id); setSurfaceId(matchingSurface.id); }
    setPalette(true);
  };
  const undo = () => {
    const previous = past[past.length - 1]; if (!previous) return;
    setFuture(values => [project.design!, ...values]); setPast(values => values.slice(0, -1));
    update(projectId, current => reconcileComponentDesign({ ...current, design: previous }, fabrics));
    if (missingMaterials({ ...project, design: previous }).length) setMode('materiales');
    setSelected(undefined);
  };
  const redo = () => {
    const next = future[0]; if (!next) return;
    setPast(values => [...values, project.design!]); setFuture(values => values.slice(1));
    update(projectId, current => reconcileComponentDesign({ ...current, design: next }, fabrics)); setSelected(undefined);
  };
  const insert = (choice: EmbroideryChoice) => {
    try {
      const destination = !pieceMode ? surface : undefined;
      const physicalView = destination?.view ?? view;
      const x = physicalView.minX + physicalView.width / 2, y = physicalView.minY + physicalView.height / 2;
      const result = choice.kind === 'motif' ? createEmbroideryMotif(choice.id, physicalView.id, x, y, choice.widthMm) : createLettering(choice.text, choice.fontId, physicalView.id, x, y, choice.heightMm, choice.color);
      const group = result.elements.find(element => element.id === result.groupId)!;
      const preferred = destination?.id === insertionPoint.current?.surfaceId ? insertionPoint.current?.point : undefined;
      const point = firstEmbroideryPosition(group, physicalView, preferred, destination?.physicalBounds);
      if (!point) throw new Error('Este bordado no cabe aquí. Elige un tamaño menor o toca otra zona del diseño.');
      const placed = moveEmbroidery({ ...doc, elements: [...doc.elements, ...result.elements] }, group.id, point, physicalView.id, destination ? { id: destination.id, label: destination.label } : undefined);
      commit(placed); setSelected(result.groupId); setPicker(false);
    } catch (cause) { useApp.getState().toast(cause instanceof Error ? cause.message : 'No se pudo agregar el bordado.', 'error'); }
  };
  const hit = (point: Pt) => {
    for (const element of [...doc.elements].reverse()) {
      if (element.viewId !== view.id || element.hidden || element.kind === 'grupo') continue;
      const root = rootOf(doc, element);
      if (!root.embroidery) continue;
      const local = toLocal(element, point);
      if (Math.abs(local.x) <= element.w / 2 && Math.abs(local.y) <= element.h / 2) return root;
    }
  };
  const startEmbroidery = (event: React.PointerEvent, element: DesignElement, physicalView: DesignView, destination?: AssemblySurface) => {
    const scenePoint = pointInPreview(svg.current, event.clientX, event.clientY); if (!scenePoint || event.button !== 0) return;
    const point = destination ? inverseAssemblyPoint(destination, scenePoint) : scenePoint;
    event.preventDefault(); event.stopPropagation(); svg.current?.setPointerCapture(event.pointerId);
    setSelected(element.id);
    drag.current = { id: element.id, point, start: element, doc, latest: doc, view: physicalView, surface: destination, offset: { x: element.x - point.x, y: element.y - point.y } };
  };
  const onAssemblyElement = (event: React.PointerEvent, id: string, destination: AssemblySurface) => {
    event.stopPropagation();
    const element = doc.elements.find(candidate => candidate.id === id); if (!element) return;
    setSurfaceId(destination.id); setViewId(destination.viewId);
    if (mode === 'materiales') {
      const componentId = componentIdForElement(id);
      const partId = event.target instanceof Element ? event.target.closest('[data-assembly-part]')?.getAttribute('data-assembly-part') : undefined;
      const item = targets.find(candidate => candidate.targetId === partId) ?? targets.find(candidate => candidate.targetId === id) ?? (componentId ? targets.find(candidate => candidate.targetId === componentElementId(componentId, 'cuerpo')) : undefined);
      if (item) materialTap.current = { item, surface: destination, x: event.clientX, y: event.clientY };
    } else if (element.embroidery) startEmbroidery(event, element, destination.view, destination);
  };
  const onAssemblySurface = (event: React.PointerEvent, destination: AssemblySurface) => {
    if (event.button !== 0) return;
    event.stopPropagation(); setSurfaceId(destination.id); setViewId(destination.viewId); setSelected(undefined);
    const point = pointInPreview(svg.current, event.clientX, event.clientY);
    const local = point ? inverseAssemblyPoint(destination, point) : undefined;
    if (local) insertionPoint.current = { surfaceId: destination.id, point: local };
    if (mode === 'materiales') {
      const touchedZone = local ? [...destination.view.zones].reverse().find(zone => cmdsToPolylines(parseSvgPath(zone.d), .2).some(poly => pointInPolygon(local, poly.pts))) : undefined;
      const item = targets.find(candidate => candidate.kind === 'zona' && candidate.viewId === destination.viewId && candidate.targetId === touchedZone?.id) ?? targets.find(candidate => candidate.kind === 'zona' && candidate.viewId === destination.viewId);
      if (item) materialTap.current = { item, surface: destination, x: event.clientX, y: event.clientY };
    }
  };
  const pointerDown = (event: React.PointerEvent<SVGSVGElement>) => {
    if (!pieceMode || mode !== 'bordados' || event.button !== 0) return;
    const point = pointInPreview(svg.current, event.clientX, event.clientY); if (!point) return;
    const element = hit(point); setSelected(element?.id);
    if (element) startEmbroidery(event, element, view);
  };
  const pointerMove = (event: React.PointerEvent<SVGSVGElement>) => {
    if (materialTap.current && Math.hypot(event.clientX - materialTap.current.x, event.clientY - materialTap.current.y) > 8) materialTap.current = undefined;
    const gesture = drag.current; if (!gesture) return;
    const point = pointInPreview(svg.current, event.clientX, event.clientY); if (!point) return;
    if (gesture.surface && scene) {
      const destination = assemblyHit(scene, point)?.surface ?? gesture.surface;
      const local = inverseAssemblyPoint(destination, point);
      gesture.latest = moveEmbroidery(gesture.doc, gesture.id, { x: local.x + gesture.offset.x, y: local.y + gesture.offset.y }, destination.viewId, { id: destination.id, label: destination.label });
      gesture.view = destination.view;
      gesture.surface = destination;
    } else gesture.latest = editElement(gesture.doc, gesture.id, { x: gesture.start.x + point.x - gesture.point.x, y: gesture.start.y + point.y - gesture.point.y });
    setLive(gesture.latest);
  };
  const pointerUp = () => {
    const tapped = materialTap.current; materialTap.current = undefined;
    if (tapped) showTarget(tapped.item, undefined, tapped.surface);
    const gesture = drag.current; drag.current = undefined; setLive(undefined); if (!gesture) return;
    const element = gesture.latest.elements.find(candidate => candidate.id === gesture.id)!;
    const destination = gesture.surface ?? scenes.flatMap(item => item.surfaces).find(item => item.id === element.assemblySurfaceId);
    if (!embroideryFitsView(element, gesture.view, destination?.physicalBounds)) { useApp.getState().toast('Coloca el bordado dentro de la zona elegida.', 'error'); return; }
    if (element.assemblySurfaceId) setSurfaceId(element.assemblySurfaceId);
    setViewId(element.viewId); commit(gesture.latest);
  };
  const changeScene = (id: string) => { setSceneId(id); setSurfaceId(undefined); setSelected(undefined); };
  const chooseAll = (event: React.MouseEvent<HTMLButtonElement>) => { materialTrigger.current = event.currentTarget; setMaterialScope('all'); setPalette(true); };
  return <div className="page page-wide finishes-page">
    <PageHead title={mode === 'materiales' ? 'Telas y colores' : 'Tu diseño y sus bordados'} back={{ label: 'Volver a los extras', onClick: () => navigate(`/personalizar/${projectId}`) }} sub={project.name}/>
    <ProjectJourney projectId={projectId} step="estudio"/>
    <div className="finish-step-tabs" role="group" aria-label="Acabado">
      <button aria-pressed={mode === 'materiales'} onClick={() => setMode('materiales')}>Telas y colores</button>
      <button aria-pressed={mode === 'bordados'} disabled={missing.length > 0} onClick={() => setMode('bordados')}>Vista previa y bordados</button>
    </div>
    <div className="finishes-layout">
      <section className="finishes-preview">
        <div className="finish-preview-heading">
          <div className="scroll-x" role="group" aria-label="Vista del diseño">{!pieceMode && scenes.length ? scenes.map(item => <button key={item.id} className="filter-chip" aria-pressed={scene?.id === item.id} onClick={() => changeScene(item.id)}>{item.label}</button>) : views.map(item => <button key={item.id} className="filter-chip" aria-pressed={view.id === item.id} onClick={() => { setViewId(item.id); setSelected(undefined); }}>{item.label}</button>)}</div>
          {scenes.length > 0 && <Button variant="ghost" size="sm" onClick={() => { setPieceMode(value => !value); setSelected(undefined); }}>{pieceMode ? 'Ver diseño completo' : 'Ver piezas'}</Button>}
        </div>
        <div className="finish-art" data-preview={pieceMode ? 'piezas' : 'diseno'}><svg ref={svg} viewBox={`${displayView.minX} ${displayView.minY} ${displayView.width} ${displayView.height}`} role="img" aria-label={`Diseño de ${displayView.label}`} onPointerDown={pointerDown} onPointerMove={pointerMove} onPointerUp={pointerUp} onPointerCancel={() => { drag.current = undefined; materialTap.current = undefined; setLive(undefined); }} style={{ touchAction: mode === 'bordados' ? 'none' : 'pan-y' }}>
          {!pieceMode && scene ? <AssemblyArtwork scene={scene} project={{ ...project, design: doc }} fabrics={fabrics} selectedId={selected} onElementPointerDown={onAssemblyElement} onSurfacePointerDown={onAssemblySurface}/> : <>
            <StudioDefs doc={doc} view={view} prefix="finish-" fabrics={fabrics}/><ViewBase view={view} mode="apariencia" prefix="finish-" fabrics={fabrics}/>
            {doc.elements.filter(element => element.viewId === view.id).map(element => <ElementSvg key={element.id} el={element} doc={doc} mode="apariencia" prefix="finish-" fabrics={fabrics}/>)}
            {active && <polygon points={elementCorners(active).map(point => `${point.x},${point.y}`).join(' ')} fill="none" stroke="#24584A" strokeWidth="1.5" vectorEffect="non-scaling-stroke" strokeDasharray="5 3" pointerEvents="none"/>}
          </>}
        </svg></div>
        <p className="tiny muted">{mode === 'materiales' ? 'Toca una zona del diseño para cambiar su material.' : 'Toca una zona, añade un bordado y arrástralo a su lugar.'}</p>
      </section>
      <div className="finishes-controls stack-lg">
        {mode === 'materiales' ? <>
          <div><h2 className="section-title">Una tela para empezar</h2><p className="small muted">Aplícala al diseño completo. Después puedes cambiar un bolsillo o cualquier detalle.</p></div>
          <Button block variant="primary" icon="telas" onClick={chooseAll}>Elegir tela o color</Button>
          <p className="finish-material-status small" role="status"><Icon name={missing.length ? 'palette' : 'check'} size={18}/>{missing.length ? 'Elige una tela o color para continuar.' : 'Listo. Ya puedes ver tu diseño y añadir bordados.'}</p>
          <details className="finish-part-details"><summary>Cambiar una parte o bolsillo</summary><div className="finish-material-list">{targets.map(item => <button key={item.id} onClick={event => showTarget(item, event.currentTarget)} aria-label={`Elegir color o tela: ${item.label}`}><span className="finish-swatch" style={{ background: item.fill?.type === 'color' ? item.fill.color : item.fill?.type === 'tela' ? fabrics[item.fill.fabricId]?.color : undefined }}/><span><strong>{item.label}</strong><span className="tiny muted">{missing.some(candidate => candidate.id === item.id) ? 'Por elegir' : item.fill?.type === 'tela' ? fabrics[item.fill.fabricId]?.name : 'Color elegido'}</span></span><Icon name={missing.some(candidate => candidate.id === item.id) ? 'plus' : 'check'}/></button>)}</div></details>
        </> : <>
          <div><h2 className="section-title">Revisa el diseño completo</h2><p className="small muted">Gíralo con las vistas de arriba. Puedes añadir bordados, letras o pasar directamente al PDF.</p></div>
          <Button variant="primary" icon="plus" onClick={() => setPicker(true)}>Añadir bordado o letras</Button>
          {surface && !pieceMode && <p className="tiny muted">Zona elegida: {surface.label}. Toca otra zona para cambiarla.</p>}
          {artwork.length > 0 && <div className="group">{artwork.map(element => <button key={element.id} className="list-row" aria-pressed={selected === element.id} onClick={() => { setSelected(element.id); setSurfaceId(element.assemblySurfaceId); setViewId(element.viewId); }}><span className="grow small">{element.name}</span><Icon name="move"/></button>)}</div>}
          {active && <div className="panel panel-pad stack"><div className="spread"><strong>{active.name}</strong><IconButton icon="trash" label="Eliminar bordado seleccionado" onClick={() => { commit(removeElements(doc, [active.id])); setSelected(undefined); }}/></div><Field label="Ancho del bordado" htmlFor="embroidery-width"><LengthInput id="embroidery-width" mm={active.w} min={5} max={Math.max(activeView.width, activeView.height)} onChange={width => {
            if (!width) return;
            const next = editElement(doc, active.id, { w: width, h: active.h * width / active.w });
            if (embroideryFitsView(next.elements.find(element => element.id === active.id)!, activeView, activeSurface?.physicalBounds)) commit(next);
            else useApp.getState().toast('Elige un tamaño que quepa en esa zona.', 'error');
          }}/></Field></div>}
        </>}
        <div className="row-wrap finish-history"><IconButton icon="undo" label="Deshacer" disabled={!past.length} onClick={undo}/><IconButton icon="redo" label="Rehacer" disabled={!future.length} onClick={redo}/></div>
        {mode === 'bordados' && <details className="finish-more"><summary>Más opciones</summary><div className="stack"><Button disabled={!!missing.length} onClick={() => setEditorial(true)}>Preparar lámina</Button>{catalogModel && supportsModelIllustration(catalogModel.flat) && <Button onClick={() => setModelPreview(true)}>{['bolso', 'accesorio'].includes(catalogModel.flat.family) ? 'Ver conjunto' : 'Ver en modelo'}</Button>}</div></details>}
      </div>
    </div>
    <div className="finish-footer"><span className="tiny muted">{mode === 'materiales' ? missing.length ? 'Primero elige tela o color' : 'Materiales completos' : 'Bolsillos y extras incluidos en el PDF'}</span><Button variant="primary" icon={mode === 'bordados' ? 'pdf' : undefined} disabled={!!missing.length} onClick={() => mode === 'materiales' ? setMode('bordados') : navigate(`/confeccion/${projectId}`)}>{mode === 'materiales' ? 'Continuar a bordados' : 'Generar patrones'}</Button></div>
    {palette && (target || materialScope === 'all') && <Sheet title={materialLabel} onClose={closePalette}><div className="stack-lg"><p className="small muted">{materialScope === 'all' ? 'Elige una tela, una foto o un color para todo el diseño. Después podrás cambiar cada detalle.' : 'Este cambio se aplica solo a la parte elegida.'}</p><Button block icon="telas" onClick={() => { setPalette(false); setFabricTray(true); }}>Elegir una tela o subir foto</Button><div className="finish-colors">{COLORS.map(color => <button key={color} aria-label={`Color ${color}`} style={{ background: color }} onClick={() => material({ type: 'color', color })}/>)}</div><Field label="Otro color"><input type="color" aria-label="Otro color" value={currentFill?.type === 'color' ? currentFill.color : '#24584A'} onChange={event => material({ type: 'color', color: event.target.value })}/></Field>{materialScope === 'part' && <details><summary>Usar el mismo material en todo</summary><div className="stack" style={{ marginTop: 12 }}><div className="finish-colors">{COLORS.slice(0, 6).map(color => <button key={color} aria-label={`Todas las partes ${color}`} style={{ background: color }} onClick={() => material({ type: 'color', color }, true)}/>)}</div>{target?.fill && target.fill.type !== 'ninguno' && <Button onClick={() => material(target.fill!, true)}>Usar en todas las partes</Button>}</div></details>}</div></Sheet>}
    {fabricTray && <FabricTray immediate dialogTitle={`Tela para ${materialLabel.toLowerCase()}`} modelId={project.modelId} activeId={currentFill?.type === 'tela' ? currentFill.fabricId : null} onChoose={id => material({ type: 'tela', fabricId: id, rotation: 0, offsetX: 0, offsetY: 0, scale: 1 })} onDrop={() => {}} onClose={closeFabrics}/>}
    {picker && <EmbroideryPicker onClose={() => setPicker(false)} onPick={insert}/>}
    {modelPreview && <ProjectModelPreview project={project} onClose={() => setModelPreview(false)} onPrepareEditorial={() => { setModelPreview(false); setEditorial(true); }}/>}
    {editorial && <Suspense fallback={<Sheet title="Lámina con ChatGPT" onClose={() => setEditorial(false)}><p role="status">Abriendo las referencias…</p></Sheet>}><EditorialSheet projectId={projectId} onClose={() => setEditorial(false)}/></Suspense>}
  </div>;
}
