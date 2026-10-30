import { useRef, useState } from 'react';
import { CATALOG } from '../../data/catalog';
import { saveBlob } from '../../lib/download';
import { defaultFigurine, FIGURE_BODY_LABEL, figureGeometry, FigurineOptions, SKIN_TONES } from '../../lib/draw/figurine';
import { useApp } from '../../store/app';
import { Button, Field, Notice, Select, Sheet } from '../../ui/components';
import { DesignDoc, DesignView } from './model';
import { StudioDefs, ViewBase, ElementSvg } from './render';
import './designTools.css';

export function FigurineSheet({ onClose, doc, view, value, onChange }: { onClose: () => void; doc: DesignDoc; view: DesignView; value?: FigurineOptions; onChange?: (options: FigurineOptions) => void }) {
  const model = view.source.type === 'plantilla' ? CATALOG.find((m) => m.id === (view.source as { flatId: string }).flatId) : undefined;
  const [options, setOptions] = useState<FigurineOptions>(value ?? defaultFigurine(model?.flat.family));
  const [viewId, setViewId] = useState(view.id);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const svgRef = useRef<SVGSVGElement>(null);
  const fabrics = useApp((s) => s.fabrics);
  const active = doc.views.find((v) => v.id === viewId) ?? view;
  const g = figureGeometry(options.body, options.age);
  const head = g.head;
  const scale = options.garmentWidth / Math.max(1, active.width);
  const prefix = 'fig-';
  const update = (partial: Partial<FigurineOptions>) => {
    const next = { ...options, ...partial };
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
      await Promise.all(Array.from(svg.querySelectorAll('image')).map(async (img) => {
        const href = img.getAttribute('href');
        if (!href || !href.startsWith('blob:')) return;
        const blob = await (await fetch(href)).blob();
        const data = await new Promise<string>((resolve, reject) => { const r = new FileReader(); r.onload = () => resolve(String(r.result)); r.onerror = reject; r.readAsDataURL(blob); });
        img.setAttribute('href', data);
      }));
      await saveBlob(new Blob([new XMLSerializer().serializeToString(svg)], { type: 'image/svg+xml' }), 'hilvana-figurin.svg');
    } catch { setError('No se pudo descargar la ilustración. Vuelve a intentarlo.'); }
    finally { setBusy(false); }
  };
  return <Sheet title="Diseño en un figurín" onClose={onClose} wide footer={<Button variant="primary" block onClick={() => void exportPreview()} disabled={busy}>{busy ? 'Preparando ilustración…' : 'Descargar figurín SVG'}</Button>}>
    <div className="figurine-layout">
      <div className="stack figurine-preview">
        <div style={{ background: '#fff', border: '1px solid var(--line)', borderRadius: 12, overflow: 'hidden' }}>
          <svg ref={svgRef} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 680" role="img" aria-label={`Figurín ${FIGURE_BODY_LABEL[options.body].toLowerCase()} con el diseño de ${active.label}`}>
            <title>Hilvana · {active.label} sobre figurín</title>
            <desc>Ilustración plana para explorar color y composición. No representa ajuste, talla ni caída de la tela.</desc>
            <rect width={400} height={680} fill="#fff" />
            <ellipse cx={200} cy={g.ankle + 16} rx={70} ry={5} fill="#edf0eb" />
            <g fill={options.skin} stroke="#5b463c" strokeWidth={0.65} strokeLinejoin="round">
              {g.legs.map((d, i) => <path key={`leg-${i}`} d={d} />)}
              {g.arms.map((d, i) => <path key={`arm-${i}`} d={d} />)}
              <path d={g.torso} /><path d={g.neck} />
            </g>
            {options.hair !== 'sin' && <path d={`M${head.cx - head.rx - 3} ${head.cy + 4} C${head.cx - head.rx - 20} ${head.cy - head.ry - 32} ${head.cx + head.rx + 20} ${head.cy - head.ry - 32} ${head.cx + head.rx + 3} ${head.cy + 4} L${head.cx + head.rx + (options.hair === 'largo' ? 15 : 3)} ${head.cy + head.ry + (options.hair === 'largo' ? 90 : 0)} L${head.cx - head.rx - (options.hair === 'largo' ? 15 : 3)} ${head.cy + head.ry + (options.hair === 'largo' ? 90 : 0)} Z`} fill={options.hairColor} />}
            <ellipse cx={head.cx} cy={head.cy} rx={head.rx} ry={head.ry} fill={options.skin} stroke="#5b463c" strokeWidth={0.65} />
            {options.hair === 'corto' && <path d={`M${head.cx - head.rx} ${head.cy} Q${head.cx - head.rx - 8} ${head.cy - head.ry - 18} ${head.cx + 8} ${head.cy - head.ry - 9} Q${head.cx + head.rx + 15} ${head.cy - head.ry - 5} ${head.cx + head.rx} ${head.cy + 3} Q${head.cx + head.rx - 8} ${head.cy - 21} ${head.cx + 6} ${head.cy - 17} Q${head.cx - 12} ${head.cy - 9} ${head.cx - head.rx} ${head.cy} Z`} fill={options.hairColor} />}
            {options.hair === 'largo' && <path d={`M${head.cx - head.rx} ${head.cy + 4} Q${head.cx - head.rx - 8} ${head.cy - head.ry - 12} ${head.cx} ${head.cy - head.ry - 10} Q${head.cx + head.rx + 12} ${head.cy - head.ry - 10} ${head.cx + head.rx} ${head.cy + 8} Q${head.cx + 13} ${head.cy - 8} ${head.cx + 6} ${head.cy - 23} Q${head.cx - 8} ${head.cy - 3} ${head.cx - head.rx} ${head.cy + 4} Z`} fill={options.hairColor} />}
            {options.hair === 'rizado' && <g fill={options.hairColor}>{Array.from({ length: 9 }, (_, i) => { const a = Math.PI + i * Math.PI / 8; return <circle key={i} cx={head.cx + Math.cos(a) * head.rx} cy={head.cy + Math.sin(a) * head.ry - 9} r={head.rx * 0.42} />; })}</g>}
            {active.kind !== 'espalda' && <g stroke="#5b463c" strokeWidth={0.8} fill="none" strokeLinecap="round"><path d={`M${head.cx - 13} ${head.cy + 2}h5 M${head.cx + 8} ${head.cy + 2}h5 M${head.cx} ${head.cy + 9}l-2 7h4 M${head.cx - 5} ${head.cy + 24}q5 3 10 0`} /></g>}
            <g transform={`translate(${200 + options.garmentX - options.garmentWidth / 2} ${options.garmentY}) scale(${scale}) translate(${-active.minX} ${-active.minY})`}>
              <StudioDefs doc={doc} view={active} fabrics={fabrics} prefix={prefix} />
              <ViewBase view={active} mode="apariencia" prefix={prefix} fabrics={fabrics} />
              {doc.elements.filter((e) => e.viewId === active.id).map((el) => <ElementSvg key={el.id} el={el} mode="apariencia" prefix={prefix} doc={doc} fabrics={fabrics} />)}
            </g>
            <text x={200} y={669} textAnchor="middle" fontFamily="sans-serif" fontSize={9} fill="#6b706b">Hilvana · Ilustración de composición</text>
          </svg>
        </div>
        <p className="tiny faint">Vista plana para probar composición y tonos. El figurín no calcula ajuste ni caída; las medidas del patrón se conservan.</p>
      </div>
      <div className="stack-lg">
        <Field label="Vista del diseño" htmlFor="figure-view"><Select id="figure-view" value={active.id} onChange={setViewId} options={doc.views.map((v) => ({ value: v.id, label: v.label }))} /></Field>
        <Field label="Silueta" htmlFor="figure-body"><Select id="figure-body" value={options.body} onChange={(body) => update({ body })} options={Object.entries(FIGURE_BODY_LABEL).map(([value, label]) => ({ value: value as FigurineOptions['body'], label }))} /></Field>
        <Field label="Proporciones" htmlFor="figure-age"><Select id="figure-age" value={options.age} onChange={(age) => update({ age })} options={[{ value: 'adulto', label: 'Adultas' }, { value: 'infantil', label: 'Infantiles' }]} /></Field>
        <Field label="Tono del figurín"><div className="row-wrap">{SKIN_TONES.map((color, i) => <button key={color} type="button" aria-label={`Tono de piel ${i + 1}`} aria-pressed={options.skin === color} onClick={() => update({ skin: color })} style={{ width: 34, height: 44, borderRadius: 6, background: color, border: `2px solid ${options.skin === color ? 'var(--mat)' : 'var(--line)'}` }} />)}<input type="color" aria-label="Color personalizado del figurín" value={options.skin} onChange={(e) => update({ skin: e.target.value })} style={{ width: 44, height: 44 }} /></div></Field>
        <div className="row"><Field label="Cabello" htmlFor="figure-hair"><Select id="figure-hair" value={options.hair} onChange={(hair) => update({ hair })} options={[{ value: 'corto', label: 'Corto' }, { value: 'largo', label: 'Largo' }, { value: 'rizado', label: 'Rizado' }, { value: 'sin', label: 'Sin cabello' }]} /></Field><Field label="Color del cabello"><input type="color" aria-label="Color del cabello" value={options.hairColor} onChange={(e) => update({ hairColor: e.target.value })} style={{ width: 48, height: 44 }} /></Field></div>
        <Field label="Tamaño de la prenda" htmlFor="figure-width"><input id="figure-width" type="range" min={40} max={380} value={options.garmentWidth} onChange={(e) => update({ garmentWidth: Number(e.target.value) })} style={{ width: '100%', accentColor: 'var(--mat)' }} /></Field>
        <Field label="Subir o bajar diseño" htmlFor="figure-y"><input id="figure-y" type="range" min={80} max={500} value={options.garmentY} onChange={(e) => update({ garmentY: Number(e.target.value) })} style={{ width: '100%', accentColor: 'var(--mat)' }} /></Field>
        <Field label="Mover a izquierda o derecha" htmlFor="figure-x"><input id="figure-x" type="range" min={-140} max={140} value={options.garmentX} onChange={(e) => update({ garmentX: Number(e.target.value) })} style={{ width: '100%', accentColor: 'var(--mat)' }} /></Field>
        <Button onClick={() => update(defaultFigurine(model?.flat.family))}>Restablecer figurín</Button>
        {error && <Notice tone="err">{error}</Notice>}
      </div>
    </div>
  </Sheet>;
}
