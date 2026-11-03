import { useEffect, useMemo, useState } from 'react';
import { FABRIC_FIGURES, FIGURE_CATEGORIES, figureMatches } from '../../data/fabricFigures';
import { FIGURE_CATEGORY_LABEL, MAX_WIDTH, MIN_WIDTH, buildFigure, defaultFigureOptions, type FigureCategory, type FigureDef, type FigureOptions, type FigureTechnique } from '../../lib/applique/figure';
import { Button, Empty, Field, Notice, Select, Sheet } from '../../ui/components';
import { Icon } from '../../ui/Icon';
import { saveBlob } from '../../lib/download';
import { slugify } from '../../lib/ids';
import { FigureArt, PieceArt } from './FigureArt';
import './figures.css';

const PAGE = 24;
const SIZES = [{ cm: 8, label: 'Parche' }, { cm: 15, label: 'Bolsillo o bolsa' }, { cm: 25, label: 'Camiseta' }, { cm: 40, label: 'Cojín' }, { cm: 70, label: 'Manta o tapiz' }];
const capas = (n: number) => `${n} ${n === 1 ? 'capa' : 'capas'}`;
const piezas = (n: number) => `${n} ${n === 1 ? 'pieza' : 'piezas'}`;

function readOptions(def: FigureDef): FigureOptions {
  const base = defaultFigureOptions(def);
  try {
    const v: unknown = JSON.parse(localStorage.getItem(`hilvana-figura-${def.id}`) ?? 'null');
    if (v && typeof v === 'object') {
      const o = v as Partial<FigureOptions>;
      return {
        width: typeof o.width === 'number' && Number.isFinite(o.width) ? Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, o.width)) : base.width,
        technique: o.technique === 'doblado' ? 'doblado' : 'termoadhesiva', underlap: [3, 5, 8].includes(Number(o.underlap)) ? Number(o.underlap) : base.underlap,
        saveFabric: o.saveFabric !== false, mirror: o.mirror !== false,
        colors: o.colors && typeof o.colors === 'object' ? Object.fromEntries(Object.entries(o.colors).filter(([, c]) => typeof c === 'string' && /^#[0-9a-f]{6}$/i.test(c))) : undefined
      };
    }
  } catch { /* Saved choices are a convenience; the defaults always work. */ }
  return base;
}

export function FiguresPanel() {
  const [category, setCategory] = useState<FigureCategory | 'todas'>('todas');
  const [query, setQuery] = useState('');
  const [limit, setLimit] = useState(PAGE);
  const [selected, setSelected] = useState<FigureDef>();
  const found = useMemo(() => FABRIC_FIGURES.filter(f => figureMatches(f, category, query)), [category, query]);
  useEffect(() => setLimit(PAGE), [category, query]);
  return <section className="figures-panel" aria-labelledby="figures-title">
    <div className="figures-intro">
      <h1 id="figures-title">Figuras de tela por capas</h1>
      <p>Elige una figura, dale el tamaño que necesites y descarga el PDF con cada pieza a tamaño real, la solapa bajo la pieza de encima y el orden en que se colocan.</p>
    </div>
    <div className="transform-search"><Icon name="search"/><input type="search" aria-label="Buscar figuras" placeholder="Hongo, mariposa, ojo, psicodélico…" value={query} onChange={event => setQuery(event.target.value)}/></div>
    <div className="figures-chips" role="group" aria-label="Tipo de figura">
      <button className="filter-chip" aria-pressed={category === 'todas'} onClick={() => setCategory('todas')}>Todas</button>
      {FIGURE_CATEGORIES.map(c => <button key={c.id} className="filter-chip" aria-pressed={category === c.id} onClick={() => setCategory(c.id)}>{c.label}</button>)}
    </div>
    <p className="transform-count" role="status">{found.length} {found.length === 1 ? 'figura' : 'figuras'}</p>
    {!found.length ? <Empty icon="search" title="No hay figuras con esta búsqueda" body="Prueba otra palabra o muestra todas las categorías." action={<Button onClick={() => { setQuery(''); setCategory('todas'); }}>Mostrar todas</Button>}/> : <>
      <div className="figures-grid">{found.slice(0, limit).map(def => <button key={def.id} className="figure-card" onClick={() => setSelected(def)}>
        <span className="figure-swatch"><FigureArt def={def}/></span>
        <strong>{def.name}</strong>
        <span>{piezas(def.layers.length)} · {FIGURE_CATEGORY_LABEL[def.category]}</span>
      </button>)}</div>
      {found.length > limit && <div className="figures-more"><Button onClick={() => setLimit(limit + PAGE)}>Mostrar más figuras ({found.length - limit})</Button></div>}
    </>}
    <p className="transform-note">Diseños originales de Hilvana. El tamaño cambia sin perder la escala: las solapas y los márgenes se recalculan en milímetros, no se estira un dibujo.</p>
    {selected && <FigureSheet key={selected.id} def={selected} onClose={() => setSelected(undefined)}/>}
  </section>;
}

type View = 'terminada' | 'pasos' | 'piezas';

function FigureSheet({ def, onClose }: { def: FigureDef; onClose: () => void }) {
  const [opts, setOpts] = useState(() => readOptions(def));
  const [rawWidth, setRawWidth] = useState(() => String(Math.round(opts.width) / 10));
  const [view, setView] = useState<View>('terminada');
  const [step, setStep] = useState(1);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const built = useMemo(() => buildFigure(def, opts), [def, opts]);
  const pieces = built.pieces.filter(p => !p.hidden), current = built.pieces[step - 1];
  useEffect(() => { try { localStorage.setItem(`hilvana-figura-${def.id}`, JSON.stringify(opts)); } catch { /* Optional. */ } }, [def.id, opts]);
  const set = (patch: Partial<FigureOptions>) => { setOpts(o => ({ ...o, ...patch })); setMessage(''); setError(''); };
  const widthNumber = Number(rawWidth.replace(',', '.'));
  const widthOk = Number.isFinite(widthNumber) && widthNumber * 10 >= MIN_WIDTH && widthNumber * 10 <= MAX_WIDTH;
  const setWidth = (text: string) => { setRawWidth(text); const n = Number(text.replace(',', '.')); if (Number.isFinite(n) && n * 10 >= MIN_WIDTH && n * 10 <= MAX_WIDTH) set({ width: n * 10 }); };
  const download = async () => {
    if (busy || !widthOk) return;
    setBusy(true); setError(''); setMessage('');
    try {
      const { buildFigurePdf } = await import('./export');
      const result = await buildFigurePdf(built);
      await saveBlob(new Blob([result.bytes], { type: 'application/pdf' }), `${slugify(def.name)}-${Math.round(built.width / 10)}cm.pdf`);
      setMessage(`PDF listo: ${result.pageCount} páginas. Portada con el orden de colocación, ${result.guidePages} ${result.guidePages === 1 ? 'hoja' : 'hojas'} de guía a tamaño real y ${result.piecePages} de piezas.`);
    } catch (err) { setError(err instanceof Error ? err.message : 'No se pudo preparar el PDF. Inténtalo de nuevo.'); }
    finally { setBusy(false); }
  };
  return <Sheet title={def.name} wide onClose={onClose} footer={<div className="transform-export"><span>{piezas(pieces.length)} en {capas(built.levels)} · {(built.width / 10).toLocaleString('es', { maximumFractionDigits: 1 })} × {(built.height / 10).toLocaleString('es', { maximumFractionDigits: 1 })} cm</span><Button block icon="download" variant="primary" disabled={busy || !widthOk} onClick={() => void download()}>{busy ? 'Preparando PDF…' : 'Descargar PDF a tamaño real'}</Button></div>}>
    <div className="stack-lg figure-detail">
      <div className="figure-stage">
        <div className="figure-swatch figure-swatch-lg">
          {view === 'piezas'
            ? <div className="figure-pieces">{pieces.map(p => <figure key={p.number}><PieceArt shape={p.final} cut={p.cut} color={p.color} number={p.number}/><figcaption>{p.number}</figcaption></figure>)}</div>
            : <FigureArt def={def} built={built} upTo={view === 'pasos' ? step : undefined} label={view === 'pasos' ? `${def.name}: paso ${step} de ${built.pieces.length}` : undefined}/>}
        </div>
        <div className="transform-photo-switch" role="group" aria-label="Vista de la figura">
          <button aria-pressed={view === 'terminada'} onClick={() => setView('terminada')}>Terminada</button>
          <button aria-pressed={view === 'pasos'} onClick={() => setView('pasos')}>Paso a paso</button>
          <button aria-pressed={view === 'piezas'} onClick={() => setView('piezas')}>Piezas</button>
        </div>
        {view === 'pasos' && current && <div className="figure-step">
          <input type="range" min={1} max={built.pieces.length} value={step} onChange={e => setStep(Number(e.target.value))} aria-label="Pieza que se coloca"/>
          <p><strong>{current.number}. {current.name}</strong> · capa {current.level}. {current.sitsOn.length ? `Va sobre ${current.sitsOn.join(', ')}` : 'Va directamente sobre la tela base'}{current.coveredBy.length ? `; luego la tapan en parte ${current.coveredBy.join(', ')}.` : '.'}</p>
        </div>}
        {view === 'piezas' && <p className="muted figure-hint">Cada pieza tal como se corta. La línea blanca discontinua es el tamaño que queda {opts.technique === 'doblado' ? 'tras doblar el margen' : 'a la vista'}; lo que sobra entra bajo la pieza de encima.</p>}
      </div>
      <p>{def.description} <span className="muted">{FIGURE_CATEGORY_LABEL[def.category]}.</span></p>
      <section className="stack">
        <h3>Tamaño</h3>
        <Field label="Ancho de la figura terminada" htmlFor={`fig-w-${def.id}`} hint={`El alto se ajusta solo: ${(built.height / 10).toLocaleString('es', { maximumFractionDigits: 1 })} cm. Entre ${MIN_WIDTH / 10} y ${MAX_WIDTH / 10} cm.`}>
          <div className="len-input"><input id={`fig-w-${def.id}`} className="input num" inputMode="decimal" value={rawWidth} aria-invalid={!widthOk} onChange={e => setWidth(e.target.value)}/><span className="unit">cm</span></div>
        </Field>
        <div className="figures-sizes" role="group" aria-label="Tamaños habituales">{SIZES.map(s => <button key={s.cm} className="filter-chip" aria-pressed={Math.round(opts.width) === s.cm * 10} onClick={() => setWidth(String(s.cm))}>{s.cm} cm · {s.label}</button>)}</div>
      </section>
      <section className="stack">
        <h3>Cómo la vas a coser</h3>
        <div className="transform-measures">
          <Field label="Técnica" htmlFor={`fig-t-${def.id}`}><Select<FigureTechnique> id={`fig-t-${def.id}`} value={opts.technique} onChange={technique => set({ technique })} options={[{ value: 'termoadhesiva', label: 'Termoadhesiva, borde crudo' }, { value: 'doblado', label: 'Bordes doblados (+5 mm)' }]}/></Field>
          <Field label="Solapa bajo la pieza de encima" htmlFor={`fig-u-${def.id}`}><Select id={`fig-u-${def.id}`} value={String(opts.underlap) as '3' | '5' | '8'} onChange={v => set({ underlap: Number(v) })} options={[{ value: '3', label: '3 mm (figuras pequeñas)' }, { value: '5', label: '5 mm (recomendada)' }, { value: '8', label: '8 mm (telas que se deshilachan)' }]}/></Field>
        </div>
        <label className="transform-confirm"><input type="checkbox" checked={opts.saveFabric} onChange={e => set({ saveFabric: e.target.checked })}/><span>Recortar la tela que queda oculta bajo otras piezas (menos bulto)</span></label>
        {opts.technique === 'termoadhesiva' && <label className="transform-confirm"><input type="checkbox" checked={opts.mirror} onChange={e => set({ mirror: e.target.checked })}/><span>Piezas en espejo para trazarlas sobre el papel de la termoadhesiva</span></label>}
      </section>
      <section className="stack">
        <h3>Colores de las piezas</h3>
        <p className="muted">Se usan en la vista y en la portada del PDF. En orden de colocación: la 1 va primero.</p>
        <ol className="figure-colors">{built.pieces.map((p, i) => <li key={i}>
          <input type="color" value={p.color} aria-label={`Color de ${p.name}`} onChange={e => set({ colors: { ...opts.colors, [i]: e.target.value } })}/>
          <span><strong>{p.number}. {p.name}</strong><small>Capa {p.level}{p.hidden ? ' · oculta' : ''}</small></span>
        </li>)}</ol>
        {opts.colors && Object.keys(opts.colors).length > 0 && <Button size="sm" variant="ghost" onClick={() => set({ colors: undefined })}>Volver a los colores originales</Button>}
      </section>
      {built.warnings.map(w => <Notice key={w} tone="warn">{w}</Notice>)}
      {error && <Notice tone="err">{error}</Notice>}
      {message && <Notice tone="ok">{message}</Notice>}
    </div>
  </Sheet>;
}
