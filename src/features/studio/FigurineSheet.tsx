import { useId, useRef, useState } from 'react';
import { CATALOG } from '../../data/catalog';
import type { FlatView } from '../../data/flats';
import { saveBlob } from '../../lib/download';
import { defaultFigurine, FIGURE_BODY_LABEL, figureGeometry, type FigurineOptions, SKIN_TONES } from '../../lib/draw/figurine';
import { garmentComposition, garmentIllustrationView, supportsModelIllustration } from '../../lib/draw/garmentComposition';
import { useApp } from '../../store/app';
import { Button, Field, Notice, Select, Sheet } from '../../ui/components';
import { FigureArt } from '../../ui/FigureArt';
import { FlatArtwork } from '../../ui/FlatArt';
import { elementCorners, type DesignDoc, type DesignView } from './model';
import { StudioDefs, ViewBase, ElementSvg, fillAttr } from './render';
import { surfaceAt } from './surfaces';
import './designTools.css';

export function FigurineSheet({ onClose, doc, view, value, onChange }: { onClose: () => void; doc: DesignDoc; view: DesignView; value?: FigurineOptions; onChange?: (options: FigurineOptions) => void }) {
  const garmentViews = doc.views.filter(candidate => candidate.source.type === 'plantilla' && (candidate.kind === 'frente' || candidate.kind === 'espalda'));
  const views = garmentViews.length ? garmentViews : doc.views;
  const initial = views.find(candidate => candidate.id === view.id) ?? views.find(candidate => candidate.kind === 'frente') ?? views[0] ?? view;
  const initialModel = initial.source.type === 'plantilla' ? CATALOG.find(model => model.id === (initial.source as {flatId: string}).flatId) : undefined;
  const [options, setOptions] = useState<FigurineOptions>(value ?? {...defaultFigurine(initialModel?.flat.family), age: initialModel?.recipients.every(recipient => ['bebe', 'toddler', 'infantil'].includes(recipient)) ? 'infantil' : 'adulto'});
  const [viewId, setViewId] = useState(initial.id);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const svgRef = useRef<SVGSVGElement>(null);
  const instance = useId().replace(/:/g, '');
  const prefix = `fig-${instance}-`;
  const fabrics = useApp(state => state.fabrics);
  const active = views.find(candidate => candidate.id === viewId) ?? initial;
  const model = active.source.type === 'plantilla' ? CATALOG.find(candidate => candidate.id === (active.source as {flatId: string}).flatId) : undefined;
  const geometry = figureGeometry(options.body, options.age);
  const flatView: FlatView = {...active, key: active.kind === 'espalda' ? 'espalda' : 'frente', seams: active.seams ?? {}, dots: active.dots ?? [], details: active.details ?? []};
  const projected = model ? garmentIllustrationView(flatView, model.flat) : flatView;
  const changedZones = new Set(projected.zones.filter(zone => zone.d !== flatView.zones.find(original => original.id === zone.id)?.d).map(zone => zone.id));
  // A sleeve/hood projection is presentation-only. Keep artwork in its original
  // drawing instead of letting a photograph, patch or embroidery float off it.
  const projectedArtwork = changedZones.size > 0 && doc.elements.some(element => element.viewId === active.id && !element.hidden && (
    changedZones.has(element.zoneId ?? '') || changedZones.has(element.maskZoneId ?? '') || [element, ...elementCorners(element)].some(point => {
      const surface = surfaceAt({...doc, elements: []}, active, point);
      return surface?.kind === 'zona' && changedZones.has(surface.id);
    })
  ));
  const showFigure = active.source.type !== 'pieza' && model?.flat.family !== 'accesorio' && model?.flat.family !== 'bolso' && (!model || supportsModelIllustration(model.flat)) && !projectedArtwork;
  const illustration = showFigure ? projected : flatView;
  const displayView: DesignView = {...active, zones: illustration.zones, details: illustration.details, dots: illustration.dots};
  const automatic = model ? garmentComposition(model.flat, illustration, options.body, options.age) : undefined;
  const manual = options.placement === 'manual' || !!value && !options.placement;
  const scale = options.garmentWidth / Math.max(1, active.width);
  const objectScale = Math.min(300 / active.width, 450 / active.height);
  const segments = !showFigure ? [{transform: `translate(${200 - (active.minX + active.width / 2) * objectScale} ${335 - (active.minY + active.height / 2) * objectScale}) scale(${objectScale})`, clip: 'all' as const, splitY: 0}]
    : !manual && automatic ? automatic.segments : [{transform: `translate(${200 + options.garmentX - options.garmentWidth / 2} ${options.garmentY}) scale(${scale}) translate(${-active.minX} ${-active.minY})`, clip: 'all' as const, splitY: 0}];
  const update = (partial: Partial<FigurineOptions>) => {
    const next = {...options, ...partial};
    setOptions(next); onChange?.(next);
  };
  const exportPreview = async () => {
    if (!svgRef.current) return;
    setBusy(true); setError('');
    try {
      const svg = svgRef.current.cloneNode(true) as SVGSVGElement;
      svg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
      svg.setAttribute('width', '800'); svg.setAttribute('height', '1360');
      svg.style.cssText = '--ink:#1d2420;--mat:#24584a;--surface:#fff;--sans:sans-serif;--display:serif;';
      await Promise.all(Array.from(svg.querySelectorAll('image')).map(async image => {
        const href = image.getAttribute('href');
        if (!href?.startsWith('blob:')) return;
        const blob = await (await fetch(href)).blob();
        const data = await new Promise<string>((resolve, reject) => {const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.onerror = reject; reader.readAsDataURL(blob);});
        image.setAttribute('href', data);
      }));
      await saveBlob(new Blob([new XMLSerializer().serializeToString(svg)], {type: 'image/svg+xml'}), 'hilvana-figurin.svg');
    } catch {setError('No se pudo descargar la ilustración. Vuelve a intentarlo.');}
    finally {setBusy(false);}
  };
  return <Sheet title="Ver en figurín" onClose={onClose} wide footer={<Button variant="primary" block onClick={() => void exportPreview()} disabled={busy}>{busy ? 'Preparando ilustración…' : 'Descargar ilustración'}</Button>}>
    <div className="figurine-layout">
      <div className="stack figurine-preview">
        <div className="figurine-paper">
          <svg ref={svgRef} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 680" role="img" aria-label={showFigure ? `Figurín ${FIGURE_BODY_LABEL[options.body].toLowerCase()} con el diseño de ${active.label}` : `Ilustración de ${active.label}`}>
            <title>Hilvana · {active.label}</title>
            <desc>Ilustración para explorar color y composición. No representa ajuste, talla ni caída de la tela.</desc>
            <rect width="400" height="680" fill="#fbfcf9"/>
            <ellipse cx="200" cy={showFigure ? geometry.ankle + 20 : 600} rx={showFigure ? 62 : 100} ry="3.5" fill="#dfe5dc" opacity=".65"/>
            {showFigure && <FigureArt body={options.body} age={options.age} skin={options.skin} hair={options.hair} hairColor={options.hairColor} back={active.kind === 'espalda'} base={automatic?.lower || automatic?.fullBody ? 'shorts' : 'leggings'} idPrefix={prefix}/>}
            {segments.map((segment, index) => <g key={index} transform={segment.transform}>
              {segment.clip !== 'all' && <defs><clipPath id={`${prefix}segment-${index}`}><rect x="-10000" y={segment.clip === 'upper' ? segment.splitY - 10000 : segment.splitY} width="20000" height="10000"/></clipPath></defs>}
              <g clipPath={segment.clip === 'all' ? undefined : `url(#${prefix}segment-${index})`}>
                <StudioDefs doc={doc} view={displayView} fabrics={fabrics} prefix={`${prefix}${index}-`}/>
                {model ? <FlatArtwork view={illustration} prefix={`${prefix}${index}-art`} spec={model.flat} fills={Object.fromEntries(Object.entries(active.zoneFills ?? {}).map(([zone, fill]) => [zone, fillAttr(fill, `${prefix}${index}-zf-${zone}`).fill]))}/> : <ViewBase view={displayView} mode="apariencia" prefix={`${prefix}${index}-`} fabrics={fabrics}/>}
                {doc.elements.filter(element => element.viewId === active.id).map(element => <ElementSvg key={element.id} el={element} mode="apariencia" prefix={`${prefix}${index}-`} doc={doc} fabrics={fabrics}/>)}
              </g>
            </g>)}
          </svg>
        </div>
        <p className="tiny faint">{active.source.type === 'pieza' ? 'Pieza de patrón sin armar. Sus medidas y posiciones se conservan.' : projectedArtwork ? 'Tu diseño se muestra en plano para conservar la posición de los detalles.' : showFigure ? 'Vista ilustrativa para combinar telas y colores. El ajuste se comprueba con las medidas del patrón.' : 'Vista plana para combinar telas y colores. El ajuste se comprueba con las medidas del patrón.'}</p>
      </div>
      <div className="stack-lg figurine-controls">
        {views.length > 1 && <Field label="Vista" htmlFor={`${prefix}view`}><Select id={`${prefix}view`} value={active.id} onChange={setViewId} options={views.map(candidate => ({value: candidate.id, label: candidate.label}))}/></Field>}
        {showFigure && <>
          <Field label="Silueta" htmlFor={`${prefix}body`}><Select id={`${prefix}body`} value={options.body} onChange={body => update({body})} options={Object.entries(FIGURE_BODY_LABEL).map(([body, label]) => ({value: body as FigurineOptions['body'], label}))}/></Field>
          <Field label="Tono de piel"><div className="figurine-skin-tones">{SKIN_TONES.map((color, index) => <button key={color} type="button" aria-label={`Tono de piel ${index + 1}`} aria-pressed={options.skin === color} onClick={() => update({skin: color})} style={{'--skin-tone': color} as React.CSSProperties}/>)}</div></Field>
          <details className="figurine-details"><summary>Cabello y proporciones</summary><div className="stack">
            <Field label="Proporciones" htmlFor={`${prefix}age`}><Select id={`${prefix}age`} value={options.age} onChange={age => update({age})} options={[{value: 'adulto', label: 'Adultas'}, {value: 'infantil', label: 'Infantiles'}]}/></Field>
            <div className="row"><Field label="Cabello" htmlFor={`${prefix}hair`}><Select id={`${prefix}hair`} value={options.hair} onChange={hair => update({hair})} options={[{value: 'corto', label: 'Corto'}, {value: 'largo', label: 'Largo'}, {value: 'rizado', label: 'Rizado'}, {value: 'sin', label: 'Sin cabello'}]}/></Field><Field label="Color"><input type="color" aria-label="Color del cabello" value={options.hairColor} onChange={event => update({hairColor: event.target.value})}/></Field></div>
            <Field label="Otro tono de piel"><input type="color" aria-label="Color personalizado del figurín" value={options.skin} onChange={event => update({skin: event.target.value})}/></Field>
          </div></details>
          <details className="figurine-details"><summary>Ajustar la ilustración</summary><div className="stack">
            <p className="tiny muted">Solo cambia la composición visual.</p>
            <Button size="sm" onClick={() => update({placement: 'auto'})}>Acomodar automáticamente</Button>
            <Field label="Tamaño de la prenda" htmlFor={`${prefix}width`}><input id={`${prefix}width`} type="range" min="40" max="380" value={options.garmentWidth} onChange={event => update({placement: 'manual', garmentWidth: Number(event.target.value)})}/></Field>
            <Field label="Subir o bajar" htmlFor={`${prefix}y`}><input id={`${prefix}y`} type="range" min="80" max="500" value={options.garmentY} onChange={event => update({placement: 'manual', garmentY: Number(event.target.value)})}/></Field>
            <Field label="Mover a los lados" htmlFor={`${prefix}x`}><input id={`${prefix}x`} type="range" min="-140" max="140" value={options.garmentX} onChange={event => update({placement: 'manual', garmentX: Number(event.target.value)})}/></Field>
          </div></details>
        </>}
        {error && <Notice tone="err">{error}</Notice>}
      </div>
    </div>
  </Sheet>;
}
