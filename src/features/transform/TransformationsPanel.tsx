import { useEffect, useMemo, useState } from 'react';
import { TRANSFORMATIONS, TRANSFORMATION_CONSTRUCTIONS, TRANSFORMATION_GARMENTS, transformationMatches, type TransformationGarment, type TransformationIdea } from '../../data/transformations';
import type { Params } from '../../lib/pattern/generator';
import { Button, Empty, Field, Notice, Select, Sheet } from '../../ui/components';
import { Icon } from '../../ui/Icon';
import { saveBlob } from '../../lib/download';
import { slugify } from '../../lib/ids';
import { buildTransformationPdf, prepareTransformation } from './export';
import { TransformationPhoto } from './TransformationPhoto';
import { TransformationPreview } from './TransformationPreview';
import './transformations.css';

const levels = ['', 'Sencillo', 'Intermedio', 'Con práctica'];
type Draft = { params: Params; placementNote: string };
function readDraft(idea: TransformationIdea): Draft {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(`hilvana-transform-${idea.id}`) ?? 'null');
    if (value && typeof value === 'object' && 'params' in value && value.params && typeof value.params === 'object') {
      const draft = value as Draft;
      return { params: draft.params, placementNote: typeof draft.placementNote === 'string' ? draft.placementNote : '' };
    }
  } catch { /* The initial measurements remain available when storage is unavailable. */ }
  return { params: {}, placementNote: '' };
}

export function TransformationsPanel() {
  const [garment, setGarment] = useState<TransformationGarment | 'todos'>('todos');
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<TransformationIdea>();
  const found = useMemo(() => TRANSFORMATIONS.filter(idea => transformationMatches(idea, garment, query)), [garment, query]);
  return <section className="transform-panel" aria-labelledby="transform-title">
    <div className="transform-intro">
      <div><h1 id="transform-title">Dale otra vida a tu ropa</h1><p>Empieza con una prenda que ya tienes. Elige un cambio, mide sobre ella y obtén las piezas nuevas con sus instrucciones.</p><Button variant="primary" onClick={() => setSelected(TRANSFORMATIONS[0])}>Hacer los paneles vaqueros</Button></div>
      <TransformationPreview idea={TRANSFORMATIONS[0]} compact/>
    </div>
    <div className="transform-search"><Icon name="search"/><input type="search" aria-label="Buscar transformaciones" placeholder="Campana, cargo, volantes…" value={query} onChange={event => setQuery(event.target.value)}/></div>
    <div className="simple-collections" role="group" aria-label="Prenda que quieres transformar">
      <button className="filter-chip" aria-pressed={garment === 'todos'} onClick={() => setGarment('todos')}>Todas</button>
      {(Object.entries(TRANSFORMATION_GARMENTS) as [TransformationGarment, string][]).map(([value, label]) => <button key={value} className="filter-chip" aria-pressed={garment === value} onClick={() => setGarment(value)}>{label}</button>)}
    </div>
    <p className="transform-count" role="status">{found.length} {found.length === 1 ? 'idea' : 'ideas'} para renovar tu ropa <span>· 10 tipos de piezas a medida</span></p>
    {!found.length ? <Empty icon="search" title="No hay cambios con esta búsqueda" body="Prueba otra palabra o muestra todas las prendas." action={<Button onClick={() => { setQuery(''); setGarment('todos'); }}>Mostrar todas</Button>}/> : <div className="transform-grid">{found.map(idea => <button key={idea.id} className="transform-card" onClick={() => setSelected(idea)} data-transformation={idea.id}>
      <TransformationPhoto idea={idea}/>
      <span className="transform-card-meta">{TRANSFORMATION_GARMENTS[idea.garment]} <span>{levels[idea.level]}</span></span><strong>{idea.name}</strong><span className="transform-card-effect">{idea.effect}</span><span className="transform-card-footer">{TRANSFORMATION_CONSTRUCTIONS[idea.construction]}<span>Ver cambio <Icon name="chev" size={18}/></span></span>
    </button>)}</div>}
    <p className="transform-note">Son propuestas predefinidas para medir sobre tu prenda. Incluyen el patrón de las piezas nuevas, materiales e instrucciones. El ajuste sobre una prenda usada requiere una prueba; no se certifican como patrones ya cosidos.</p>
    {selected && <TransformationSheet key={selected.id} idea={selected} onClose={() => setSelected(undefined)}/>}
  </section>;
}

function TransformationSheet({ idea, onClose }: { idea: TransformationIdea; onClose: () => void }) {
  const [draft, setDraft] = useState(() => readDraft(idea));
  const prepared = useMemo(() => prepareTransformation(idea, draft.params), [idea, draft.params]);
  const [measured, setMeasured] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [rawValues, setRawValues] = useState<Record<string, string>>({});
  const issues = prepared.built.issues.filter(issue => issue.level === 'error');
  const invalidInputs = Object.values(rawValues).some(value => value.trim() === '' || !Number.isFinite(Number(value.replace(',', '.'))));
  useEffect(() => {
    try { localStorage.setItem(`hilvana-transform-${idea.id}`, JSON.stringify(draft)); } catch { /* Optional draft persistence; export remains available. */ }
  }, [draft, idea.id]);
  const setParam = (key: string, value: Params[string]) => {
    setDraft(current => ({ ...current, params: { ...current.params, [key]: value } }));
    setMeasured(false); setMessage(''); setError('');
  };
  const download = async () => {
    if (busy || !measured || issues.length || invalidInputs) return;
    setBusy(true); setError(''); setMessage('');
    try {
      const result = await buildTransformationPdf(idea, prepared.params, draft.placementNote);
      await saveBlob(new Blob([result.bytes], { type: 'application/pdf' }), `${slugify(idea.name)}-transformacion.pdf`);
      setMessage(`PDF listo: ${result.pageCount} páginas. Las plantillas y el control de escala empiezan en la página ${result.patternStartPage}.`);
    } catch (err) { setError(err instanceof Error ? err.message : 'No se pudo preparar el PDF. Revisa las medidas e inténtalo de nuevo.'); }
    finally { setBusy(false); }
  };
  return <Sheet title={idea.name} wide onClose={onClose} footer={<div className="transform-export"><span>Piezas nuevas + instrucciones · PDF a escala 1:1</span><Button block icon="download" variant="primary" disabled={busy || !measured || !!issues.length || invalidInputs} onClick={() => void download()}>{busy ? 'Preparando PDF…' : 'Generar mi transformación'}</Button></div>}>
    <div className="stack-lg transform-detail">
      <TransformationPreview idea={idea}/>
      <p>{idea.effect}</p>
      <section><h3>Dónde va</h3><p>{idea.placement}</p><p className="muted">Tela sugerida: {idea.fabric}</p></section>
      <section className="stack"><h3>Mide tu prenda</h3><p className="muted">Las medidas iniciales son un ejemplo. Sustitúyelas por las de tu prenda extendida sin estirar. Todos los largos se muestran en centímetros.</p>
        <div className="transform-measures">{prepared.generator.params.filter(def => def.group !== 'margenes').map(def => {
          const value = prepared.params[def.key], id = `transform-${idea.id}-${def.key}`;
          return <Field key={def.key} htmlFor={id} label={def.label} hint={def.help}>
            {def.type === 'choice' ? <Select id={id} value={String(value)} options={def.choices!} onChange={next => setParam(def.key, next)}/> : <div className="len-input"><input id={id} className="input num" inputMode="decimal" value={rawValues[def.key] ?? String(Number(value) / (def.type === 'length' ? 10 : 1))} onChange={event => {
              const text = event.target.value; setRawValues(current => ({ ...current, [def.key]: text }));
              const number = text.trim() ? Number(text.replace(',', '.')) : NaN;
              setParam(def.key, Number.isFinite(number) ? number * (def.type === 'length' ? 10 : 1) : 0);
            }} aria-invalid={issues.some(issue => issue.code === `transform-medida-${def.key}`)}/><span className="unit">{def.type === 'length' ? 'cm' : '×'}</span></div>}
          </Field>;
        })}</div>
        <details className="transform-settings"><summary>Márgenes y referencias de colocación</summary><div className="stack">
          <Field label="Margen de costura (cm)" htmlFor={`transform-margin-${idea.id}`} hint="Los dobladillos especiales aparecen por separado en el PDF; no vuelvas a sumar márgenes."><input id={`transform-margin-${idea.id}`} className="input" inputMode="decimal" value={rawValues.margen ?? String(Number(prepared.params.margen) / 10)} onChange={event => { const text = event.target.value; setRawValues(current => ({ ...current, margen: text })); setParam('margen', text.trim() ? Number(text.replace(',', '.')) * 10 : 0); }}/></Field>
          <Field label="Tus referencias sobre la prenda" htmlFor={`transform-note-${idea.id}`} hint="Se incluyen en el PDF. Por ejemplo: boca del bolsillo a 14 cm bajo la cintura y a 7 cm del costado."><textarea id={`transform-note-${idea.id}`} className="input" rows={3} maxLength={1500} value={draft.placementNote} onChange={event => setDraft(current => ({ ...current, placementNote: event.target.value }))}/></Field>
        </div></details>
      </section>
      {issues.length > 0 && <Notice tone="err"><ul>{issues.map(issue => <li key={issue.code}>{issue.message}</li>)}</ul></Notice>}
      {!!prepared.built.result?.pieces.length && <details className="transform-settings"><summary>Ver piezas y pasos antes de descargar</summary><div className="stack"><ul>{prepared.built.pieces.map(piece => <li key={piece.id}>{piece.name} · cortar {piece.cut.qty}</li>)}</ul><ol>{prepared.built.result.steps.map(step => <li key={step.id}><strong>{step.title}</strong><p>{step.detail}</p></li>)}</ol></div></details>}
      <Notice>Experimental. El PDF contiene únicamente las piezas añadidas. Haz una prueba en retazos antes de recortar tu prenda.</Notice>
      <label className="transform-confirm"><input type="checkbox" checked={measured} onChange={event => setMeasured(event.target.checked)}/><span>Ya medí mi prenda y revisé dónde colocar la transformación.</span></label>
      {error && <Notice tone="err">{error}</Notice>}
      {message && <Notice tone="ok">{message}</Notice>}
    </div>
  </Sheet>;
}
