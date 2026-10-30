import { useMemo, useState } from 'react';
import { RECIPIENT_LABEL, type CatalogModel, type Recipient } from '../../data/catalog';
import { MEASURE_BY_KEY } from '../../lib/sizes/measurements';
import { formatLength } from '../../lib/units';
import { useApp } from '../../store/app';
import { Notice } from '../../ui/components';
import { modelPatternDetails } from './patternDetailPreview';
import './modelPatternDetails.css';

const FABRIC_ROLES = { principal: 'tela principal', contraste: 'tela de contraste', forro: 'forro', entretela: 'entretela', 'punto-elastico': 'punto elástico' };

export function ModelPatternDetails({ model, recipient, babySize }: { model: CatalogModel; recipient?: Recipient; babySize?: string }) {
  const unit = useApp(state => state.settings.unit);
  const [open, setOpen] = useState(false);
  const result = useMemo(() => {
    if (!open) return undefined;
    try { return { details: modelPatternDetails(model, recipient, babySize) }; }
    catch { return { error: 'No se pudo calcular esta referencia. Revisa la base y sus medidas antes de generar el patrón.' }; }
  }, [open, model, recipient, babySize]);
  const details = result?.details;
  const errors = details?.pattern.issues.filter(issue => issue.level === 'error') ?? [];
  const parameters = details?.generator.params.filter(param => (!param.when || param.when(details.params)) && details.params[param.key] !== undefined) ?? [];
  return <details className="panel panel-pad small native-pattern-details" onToggle={event => setOpen(event.currentTarget.open)}>
    <summary>Qué incluye el patrón</summary>
    {open && <div className="stack-lg native-pattern-content">
      <div><strong>Para {model.recipients.map(value => RECIPIENT_LABEL[value].toLowerCase()).join(', ')}</strong><p className="muted">{details?.reference ?? 'Consulta las medidas al preparar el patrón.'}.</p></div>
      {result?.error && <Notice tone="err">{result.error}</Notice>}
      {details && <>
        <div className="native-pattern-verification"><strong>{details.geometryChecked ? 'Geometría comprobada para esta referencia' : 'Comprobación geométrica pendiente de revisión'}</strong><p>Prueba de confección pendiente. Comprueba la impresión y cose una muestra antes de usar la tela definitiva.</p></div>
        {details.pattern.missing.length > 0 && <Notice>Faltan medidas: {details.pattern.missing.map(key => MEASURE_BY_KEY[key].label.toLowerCase()).join(', ')}.</Notice>}
        {errors.length > 0 && <ul className="native-pattern-list">{errors.map((error, index) => <li key={index}>{error.message}</li>)}</ul>}
        {details.pattern.seamResults.some(seam => !seam.ok) && <ul className="native-pattern-list">{details.pattern.seamResults.filter(seam => !seam.ok).map(seam => <li key={seam.relation.id}>Unión que requiere revisión: {seam.relation.label}.</li>)}</ul>}
        {details.pattern.pieces.length > 0 && <section><h3 className="section-title">Piezas de corte</h3><p className="tiny muted">{details.pattern.pieces.length} plantillas · {details.pattern.pieces.reduce((sum, piece) => sum + piece.cut.qty, 0)} piezas de tela en esta versión.</p><ul className="native-pattern-list">{details.pattern.pieces.map(piece => <li key={piece.id}><strong>{piece.name}</strong><span>Cortar {piece.cut.qty}{piece.cut.onFold ? ' al doblez' : ''}{piece.cut.mirrorPairs ? ' en espejo' : ''} · {FABRIC_ROLES[piece.cut.fabric]}</span></li>)}</ul></section>}
        {parameters.length > 0 && <details className="native-pattern-subsection"><summary>Medidas y márgenes de esta referencia</summary><dl className="native-pattern-measures">{parameters.map(param => { const value = details.params[param.key]; return <div key={param.key}><dt>{param.key === 'largoManga' ? 'Largo de manga' : param.label}</dt><dd>{param.type === 'length' && typeof value === 'number' ? formatLength(value, unit) : param.choices?.find(choice => choice.value === value)?.label ?? String(value)}</dd></div>; })}</dl><p className="tiny muted">Al elegir otra talla o medidas, las piezas y cantidades necesarias se recalculan. Las medidas corporales y la holgura se consideran por separado.</p></details>}
      </>}
      <section><h3 className="section-title">Telas y materiales</h3><p className="muted">Telas sugeridas: {model.recommendedFabrics.join(', ')}.</p>{details?.pattern.result?.materials.length ? <ul className="native-pattern-list">{details.pattern.result.materials.map(material => <li key={material.id}><strong>{material.label} · {material.qty}</strong>{material.note && <span>{material.note}</span>}</li>)}</ul> : <ul className="native-pattern-list">{model.materials.map(material => <li key={material}>{material}</li>)}</ul>}<p className="tiny muted">El consumo de tela depende de la talla, el ancho de la tela y la colocación de las piezas; revísalo al preparar el PDF.</p></section>
      {details?.pattern.result?.steps.length ? <section><h3 className="section-title">Cómo se confecciona</h3><ol className="native-pattern-steps">{details.pattern.result.steps.map(step => <li key={step.id}><strong>{step.title}</strong><p>{step.detail}</p></li>)}</ol></section> : null}
      {details?.pattern.result?.assumptions.length ? <details className="native-pattern-subsection"><summary>Alcance de este diseño</summary><ul className="native-pattern-list">{details.pattern.result.assumptions.map((assumption, index) => <li key={index}>{assumption}</li>)}</ul></details> : null}
      {model.variants.length > 0 && <details className="native-pattern-subsection"><summary>Opciones del diseño</summary><ul className="native-pattern-list">{model.variants.map(variant => <li key={variant.name}><strong>{variant.name}</strong><span>{variant.text}</span></li>)}</ul></details>}
    </div>}
  </details>;
}
