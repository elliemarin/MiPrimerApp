import { useMemo, useRef, useState } from 'react';
import { useApp } from '../../store/app';
import { findModel } from '../../data/catalog';
import { COMPONENT_OPTIONS, makeComponent, optionsForProject } from '../../data/components';
import { newPatternState } from '../../lib/pattern/engine';
import type { PatternComponent } from '../../lib/pattern/components';
import { Button, Chip, Empty, Field, IconButton, LengthInput, Notice, PageHead, Select, TextInput } from '../../ui/components';
import { ProjectJourney } from '../../ui/ProjectJourney';
import { Icon } from '../../ui/Icon';
import { navigate } from '../../ui/router';
import { formatLength } from '../../lib/units';
import { StudioDefs, ViewBase, ElementSvg } from '../studio/render';
import { newDesign } from '../studio/model';
import { componentIdForElement, syncComponentDesign } from './componentDesign';
import './customize.css';

type Filter = 'recomendados' | 'bolsillos' | 'herramientas' | 'todos';

const normalize = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

export function CustomizePage({ projectId }: { projectId: string }) {
  const project = useApp(s => s.projects[projectId]);
  const fabrics = useApp(s => s.fabrics);
  const updateProject = useApp(s => s.updateProject);
  const unit = useApp(s => s.settings.unit);
  const [selectedId, setSelectedId] = useState<string>();
  const [viewId, setViewId] = useState<string>();
  const [filter, setFilter] = useState<Filter>('recomendados');
  const [query, setQuery] = useState('');
  const [placing, setPlacing] = useState(false);
  const svgRef = useRef<SVGSVGElement>(null);
  const recommended = useMemo(() => project ? optionsForProject(project) : [], [project]);

  if (!project) return <div className="page"><Empty icon="proyectos" title="Proyecto no encontrado" action={<Button onClick={() => navigate('/biblioteca')}>Elegir un diseño</Button>} /></div>;

  const components = project.pattern?.components ?? [];
  const selected = components.find(c => c.id === selectedId);
  const doc = project.design ?? newDesign([]);
  const views = doc.views.filter(v => v.source.type !== 'pieza');
  const view = views.find(v => v.id === viewId) ?? views.find(v => v.kind === 'frente') ?? views[0];
  const model = project.modelId ? findModel(project.modelId) : undefined;
  const options = (filter === 'recomendados' ? recommended : COMPONENT_OPTIONS)
    .filter(o => filter !== 'bolsillos' || o.group === 'bolsillos' || o.group === 'cierres')
    .filter(o => filter !== 'herramientas' || o.group === 'herramientas' || o.group === 'trabillas')
    .filter(o => !query || normalize(`${o.name} ${o.description}`).includes(normalize(query)));

  const saveComponents = (change: (current: PatternComponent[]) => PatternComponent[], message: string) => {
    updateProject(projectId, p => {
      const pattern = p.pattern ?? newPatternState('manual', {}, { kind: 'otro', fabric: p.fabricType, stretch: p.stretch, fit: p.fit });
      return syncComponentDesign({ ...p, status: 'diseno', pattern: { ...pattern, components: change(pattern.components ?? []) } });
    }, message);
  };
  const edit = (patch: Partial<PatternComponent>) => {
    if (!selected) return;
    saveComponents(current => current.map(c => c.id === selected.id ? { ...c, ...patch } : c), 'Complemento actualizado.');
  };
  const add = (presetId: string) => {
    const component = makeComponent(project, presetId, view?.id);
    saveComponents(current => [...current, component], 'Complemento añadido con sus piezas de confección.');
    setSelectedId(component.id);
    setPlacing(false);
    requestAnimationFrame(() => document.querySelector('.customize-editor')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }));
  };
  const place = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!placing || !selected || !view || !svgRef.current || e.button !== 0) return;
    const matrix = svgRef.current.getScreenCTM();
    if (!matrix) return;
    const point = new DOMPoint(e.clientX, e.clientY).matrixTransform(matrix.inverse());
    edit({ placement: { ...selected.placement, viewId: view.id, pieceId: undefined, x: point.x, y: point.y, label: selected.placement?.label ?? view.label } });
    setPlacing(false);
  };
  const componentName = (component: PatternComponent) => component.name ?? COMPONENT_OPTIONS.find(o => o.kind === component.kind)?.name ?? 'Complemento';
  const selectedName = selected ? componentName(selected) : '';
  const cargoDepth = selected?.kind === 'bolsillo-cargo' ? selected.depth ?? 30 : 0;
  const minWidth = selected?.kind === 'trabilla' || selected?.kind === 'porta-martillo' ? 10 : Math.max(40, cargoDepth * 2);
  const minHeight = Math.max(50, cargoDepth * 2);

  return (
    <div className="page page-wide customize-page">
      <PageHead title="Hazlo tuyo" back={{ label: project.name, onClick: () => navigate(`/proyectos/${projectId}`) }} sub={model ? `Parte de ${model.name.toLowerCase()} y elige lo que necesitas agregar.` : 'Elige los complementos que necesitas antes de dar color a tu diseño.'} />
      <ProjectJourney projectId={projectId} step="personalizar" />
      <div className="customize-layout">
        <section className="customize-preview" aria-label="Vista previa de la personalización">
          {view ? <>
            <div className="customize-view-tabs" role="group" aria-label="Vista de la prenda">
              {views.map(v => <button className="filter-chip" key={v.id} aria-pressed={v.id === view.id} onClick={() => { setViewId(v.id); setPlacing(false); }}>{v.label}</button>)}
            </div>
            <div className={`customize-art${placing ? ' is-placing' : ''}`}>
              <svg ref={svgRef} viewBox={`${view.minX - 20} ${view.minY - 20} ${view.width + 40} ${view.height + 40}`} role="img" aria-label={`${project.name}, ${view.label}${placing ? '. Toca para colocar el complemento' : ''}`} onPointerDown={place}>
                <StudioDefs doc={doc} view={view} fabrics={fabrics} prefix="customize-" />
                <ViewBase view={view} mode="apariencia" prefix="customize-" fabrics={fabrics} />
                {doc.elements.filter(el => el.viewId === view.id).map(el => <g key={el.id} onPointerDown={e => {
                  if (placing) return;
                  const id = componentIdForElement(el.id);
                  if (id && components.some(c => c.id === id)) { e.stopPropagation(); setSelectedId(id); }
                }}><ElementSvg el={el} mode="apariencia" prefix="customize-" doc={doc} fabrics={fabrics} /></g>)}
                {selected?.placement?.viewId === view.id && <rect x={selected.placement.x - selected.width / 2 - 6} y={selected.placement.y - selected.height / 2 - 6} width={selected.width + 12} height={selected.height + 12} fill="none" stroke="#a26e00" strokeWidth={2} strokeDasharray="6 4" vectorEffect="non-scaling-stroke" pointerEvents="none" />}
              </svg>
              {placing && <div className="customize-place-hint" role="status">Toca dónde colocar {selectedName.toLowerCase()}<button onClick={() => setPlacing(false)}>Cancelar</button></div>}
            </div>
            <p className="tiny muted">La colocación sobre la prenda es ilustrativa. En el PDF tendrás las medidas reales del complemento y deberás probar su posición antes de coser.</p>
          </> : <div className="customize-no-view"><Icon name="patronaje" size={48} /><p>Los complementos se añadirán a tu patrón con sus medidas reales.</p></div>}
          <Button icon="pencil" onClick={() => navigate(`/estudio/${projectId}?herramienta=lapiz`)}>Dibujar en estudio</Button>
        </section>

        <div className="customize-controls stack-lg">
          <section aria-labelledby="customize-choose">
            <div className="spread"><h2 className="section-title" id="customize-choose">¿Qué quieres agregar?</h2><Chip tone="warn">Experimental</Chip></div>
            <p className="small muted">Cada opción incluye su patrón, materiales y pasos para confeccionarla.</p>
            <div className="customize-filters" role="group" aria-label="Tipos de complemento">
              {([['recomendados', 'Para este diseño'], ['bolsillos', 'Bolsillos'], ['herramientas', 'Herramientas y tiras'], ['todos', 'Todos']] as const).map(([value, label]) => <button key={value} className="filter-chip" aria-pressed={filter === value} onClick={() => setFilter(value)}>{label}</button>)}
            </div>
            <TextInput aria-label="Buscar complementos" placeholder="Busca bolsillos, cierre, herramientas…" value={query} onChange={setQuery} />
            <div className="customize-options">
              {options.map(option => <button key={option.id} className="customize-option" onClick={() => add(option.id)} aria-label={`Agregar ${option.name.toLowerCase()}`}>
                <ComponentIcon kind={option.kind} />
                <span><strong>{option.name}</strong><span className="small muted">{option.description}</span></span>
                <Icon name="plus" size={20} />
              </button>)}
              {!options.length && <p className="small muted">No hay complementos con ese nombre. Prueba con «bolsillo» o elige Todos.</p>}
            </div>
          </section>

          {components.length > 0 && <section className="customize-added" aria-labelledby="customize-added-title">
            <h2 className="section-title" id="customize-added-title">En tu diseño ({components.length})</h2>
            <div className="customize-added-list">
              {components.map((component, index) => {
                const name = componentName(component);
                return <button key={component.id} aria-pressed={selectedId === component.id} onClick={() => { setSelectedId(component.id); setPlacing(false); if (component.placement?.viewId) setViewId(component.placement.viewId); }}>
                  <ComponentIcon kind={component.kind} />
                  <span><strong>{index + 1}. {name}</strong><span className="small muted">{formatLength(component.width, unit)} × {formatLength(component.height, unit)} · {component.quantity} {component.quantity === 1 ? 'unidad' : 'unidades'}</span></span>
                  <Icon name="chev" size={18} />
                </button>;
              })}
            </div>
            {selected && <div className="customize-editor" key={selected.id}>
              <div className="spread"><h3>{selectedName}</h3><IconButton icon="trash" label="Eliminar complemento" onClick={() => { saveComponents(current => current.filter(c => c.id !== selected.id), 'Complemento eliminado con sus piezas.'); setSelectedId(undefined); setPlacing(false); }} /></div>
              <div className="customize-dimensions">
                <Field label="Ancho terminado" htmlFor="component-width"><LengthInput id="component-width" mm={selected.width} min={minWidth} max={600} onChange={v => v !== undefined && edit({ width: v })} /></Field>
                <Field label="Alto terminado" htmlFor="component-height"><LengthInput id="component-height" mm={selected.height} min={minHeight} max={800} onChange={v => v !== undefined && edit({ height: v })} /></Field>
                <Field label="Cantidad" htmlFor="component-quantity"><Select id="component-quantity" value={String(selected.quantity)} options={Array.from({ length: 8 }, (_, i) => ({ value: String(i + 1), label: `${i + 1} ${i ? 'unidades' : 'unidad'}` }))} onChange={v => edit({ quantity: Number(v) })} /></Field>
                {selected.kind === 'bolsillo-cargo' && <Field label="Fondo del fuelle" htmlFor="component-depth"><LengthInput id="component-depth" mm={selected.depth ?? 30} min={15} max={Math.min(100, selected.width / 2, selected.height / 2)} onChange={v => v !== undefined && edit({ depth: v })} /></Field>}
              </div>
              <Field label="Dónde lo vas a coser" htmlFor="component-location"><TextInput id="component-location" value={selected.placement?.label ?? ''} placeholder="Por ejemplo, muslo derecho o pecho izquierdo" onChange={label => edit({ placement: { x: selected.placement?.x ?? 0, y: selected.placement?.y ?? 0, ...selected.placement, label } })} /></Field>
              {view && <Button icon="move" onClick={() => { setPlacing(true); document.querySelector('.customize-preview')?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }}>Colocar en {view.label.toLowerCase()}</Button>}
              {view && <details className="customize-position"><summary>Posición en la vista</summary><div className="customize-dimensions">
                <Field label="Centro horizontal" htmlFor="component-x"><LengthInput id="component-x" mm={selected.placement?.x ?? 0} onChange={x => x !== undefined && edit({ placement: { ...selected.placement, x, y: selected.placement?.y ?? 0, viewId: view.id, pieceId: undefined } })} /></Field>
                <Field label="Centro vertical" htmlFor="component-y"><LengthInput id="component-y" mm={selected.placement?.y ?? 0} onChange={y => y !== undefined && edit({ placement: { ...selected.placement, x: selected.placement?.x ?? 0, y, viewId: view.id, pieceId: undefined } })} /></Field>
              </div></details>}
              <p className="tiny muted">Medidas sin márgenes. El patrón los agrega una sola vez. Prueba primero con retazos y confirma que cabe el objeto que vas a guardar.</p>
            </div>}
          </section>}
          {!project.pattern?.generatorId || project.pattern.generatorId === 'manual' ? <Notice>Tu proyecto no tiene el patrón completo de la prenda. Se generarán los patrones de los complementos añadidos; la base debes aportarla tú.</Notice> : null}
        </div>
      </div>
      <div className="customize-footer">
        <span className="small muted">{components.length ? `${components.length} complementos con patrón` : 'También puedes continuar con la base lisa.'}</span>
        <Button variant="primary" icon="palette" onClick={() => navigate(`/estudio/${projectId}`)}>Continuar al estudio</Button>
      </div>
    </div>
  );
}

function ComponentIcon({ kind }: { kind: string }) {
  const strap = kind === 'trabilla' || kind === 'porta-martillo';
  const flap = kind.includes('solapa') || kind === 'bolsillo-cargo';
  const rounded = kind === 'bolsillo-redondeado';
  const tip = kind === 'bolsillo-punta';
  return <svg className="component-icon" viewBox="0 0 64 64" fill="none" aria-hidden="true">
    {strap ? <><path d="M22 10h20v44H22z" fill="var(--mat-soft)" /><path d="M22 10h20v44H22zM22 18h20M22 46h20" stroke="currentColor" strokeWidth="1.6" /><path d="M27 23v18M37 23v18" stroke="currentColor" strokeDasharray="2 2" /></> : <>
      <path d={tip ? 'M12 12h40v34L32 56 12 46Z' : rounded ? 'M12 12h40v26c0 12-9 18-20 18S12 50 12 38Z' : 'M12 12h40v42H12Z'} fill="var(--mat-soft)" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      {flap ? <><path d="M9 10h46v15l-23 6-23-6Z" fill="var(--tape-soft)" stroke="currentColor" strokeWidth="1.6" />{kind.includes('boton') || kind === 'bolsillo-cargo' ? <circle cx="32" cy="23" r="2.3" fill="currentColor" /> : <path d="M24 22h16" stroke="currentColor" strokeWidth="3" />}</> : <path d="M15 19h34" stroke="currentColor" strokeWidth={kind === 'bolsillo-cierre' ? 3 : 1} strokeDasharray={kind === 'bolsillo-cierre' ? '1 1.5' : '3 2'} />}
      {kind === 'bolsillo-cargo' && <path d="M22 34v15M42 34v15" stroke="currentColor" strokeDasharray="2 2" />}
      {kind === 'porta-herramientas' && <><path d="M23 25v26M38 25v26" stroke="currentColor" /><path d="M18 18V7M30 18V5M44 18V9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" /></>}
    </>}
  </svg>;
}
