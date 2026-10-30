import { useEffect, useMemo, useState } from 'react';
import { FREE_PATTERNS, FREE_PATTERN_CATEGORY_LABEL, type FreePattern, type FreePatternCategory } from '../../data/freePatternLibrary';
import { Button, Empty, Field, Select } from '../../ui/components';
import { Icon } from '../../ui/Icon';
import { EMPTY_FREE_FILTERS, filterFreePatterns, localPatternUrl, patternLinks, sampleForPattern, type FreePatternFilters } from './freePatternFilters';
import './freePatterns.css';

const LANGUAGE = { es: 'Español', en: 'Inglés' };
const CATEGORY_ICON: Record<FreePatternCategory, string> = { prendas: 'hanger', accesorios: 'scissors', disfraces: 'wand', bebe: 'person', hogar: 'telas', peluches: 'star' };
function initialFilters(category: string, sample: boolean): FreePatternFilters {
  const validCategory = category in FREE_PATTERN_CATEGORY_LABEL ? category as FreePatternCategory : 'todos';
  try {
    const stored = JSON.parse(sessionStorage.getItem('hilvana-free-pattern-search') ?? 'null');
    if (stored && typeof stored.query === 'string' && (stored.category === 'todos' || stored.category in FREE_PATTERN_CATEGORY_LABEL)) {
      return { ...EMPTY_FREE_FILTERS, query: stored.query, category: stored.category,
        language: ['es', 'en'].includes(stored.language) ? stored.language : 'todos',
        access: ['directo', 'local'].includes(stored.access) ? stored.access : 'todos',
        author: FREE_PATTERNS.some(pattern => pattern.author === stored.author) ? stored.author : 'todos',
        sample: sample || stored.sample === true };
    }
  } catch { /* Browsing memory is optional. */ }
  return { ...EMPTY_FREE_FILTERS, category: validCategory, sample };
}

function FreePatternCard({ pattern }: { pattern: FreePattern }) {
  const links = patternLinks(pattern);
  const sample = sampleForPattern(pattern);
  const primary = pattern.categories[0];
  return <article className="free-pattern-card" data-free-pattern={pattern.id}>
    <div className="free-pattern-meta"><span><Icon name={CATEGORY_ICON[primary]} size={18}/>{pattern.categories.map(category => FREE_PATTERN_CATEGORY_LABEL[category]).join(' · ')}</span><span>{LANGUAGE[pattern.language]}</span></div>
    <div><h3>{pattern.name}</h3><p className="free-pattern-author">{pattern.author}</p></div>
    <p className="small muted">{pattern.description}</p>
    <div className="free-pattern-badges"><span>{pattern.access === 'directo' ? 'Acceso directo' : pattern.access === 'email' ? 'Gratis con correo' : 'Pedido gratuito'}</span>{pattern.format === 'tutorial' && <span>Corte por medidas</span>}{pattern.assets?.pattern && <span>Copia disponible en Hilvana</span>}{sample && <span>Muestra del autor</span>}</div>
    <div className="free-pattern-links">
      <a className="btn btn-primary" href={links.pattern} target="_blank" rel="noopener noreferrer"><Icon name={pattern.patternKind === 'pdf' ? 'pdf' : 'link'} size={19}/>{pattern.format === 'tutorial' ? (pattern.patternKind === 'pdf' ? 'Abrir guía de corte PDF' : 'Ver medidas de corte') : pattern.patternKind === 'pdf' ? 'Abrir patrón PDF' : 'Obtener patrón gratis'}</a>
      <a className="btn" href={links.instructions} target="_blank" rel="noopener noreferrer"><Icon name="note" size={19}/>{pattern.instructionsKind === 'pdf' ? 'Instrucciones PDF' : 'Ver instrucciones'}</a>
    </div>
    {pattern.combinedPdf && <p className="tiny muted">{pattern.format === 'tutorial' ? 'El PDF reúne medidas de corte e instrucciones.' : 'El mismo PDF reúne patrón e instrucciones.'}</p>}
    <details className="free-pattern-details"><summary>Ficha y fuente original</summary><div className="stack">
      {sample && <><section><h4>Medidas y tallas</h4><p>{sample.sizing}</p></section><section><h4>Materiales</h4><ul>{sample.materials.map((item, index) => <li key={index}>{item}</li>)}</ul></section><section><h4>Piezas</h4><ul>{sample.pieces.map((item, index) => <li key={index}>{item}</li>)}</ul></section><section><h4>Proceso</h4><ol>{sample.instructions.map((item, index) => <li key={index}>{item}</li>)}</ol></section><p><a href={sample.evidence.url} target="_blank" rel="noopener noreferrer">Ver muestra confeccionada por el autor</a>. Hilvana no ha cosido esta muestra.</p></>}
      <section><h4>Descarga y uso</h4><p>{pattern.access === 'email' ? 'El autor pide un correo para enviar la descarga gratuita.' : pattern.access === 'pedido-gratis' ? 'Completa el pedido gratuito en la web del autor para recibir los archivos.' : 'Los enlaces abren los archivos o la guía del autor sin hacer un pedido.'}</p><p>{pattern.licenseNote}</p>{pattern.licenseUrl && <a href={pattern.licenseUrl} target="_blank" rel="noopener noreferrer">Condiciones del autor</a>}</section>
      <p className="tiny muted">Fuente revisada: {pattern.verifiedAt}{pattern.verification.pdfPages ? ` · PDF de ${pattern.verification.pdfPages} páginas` : ''}. Elige talla, margen e impresión según el original. Este archivo se consulta y se imprime; todavía no se edita en el estudio.</p>
      <a href={pattern.sourceUrl} target="_blank" rel="noopener noreferrer">Abrir publicación original</a>
    </div></details>
  </article>;
}

export function FreePatternsPanel({ initialCategory = 'todos', initialEvidence = false }: { initialCategory?: string; initialEvidence?: boolean }) {
  const [filters, setFilters] = useState(() => initialFilters(initialCategory, initialEvidence));
  const [limit, setLimit] = useState(18);
  const patterns = useMemo(() => filterFreePatterns(FREE_PATTERNS, filters), [filters]);
  const authors = useMemo(() => [...new Set(FREE_PATTERNS.map(pattern => pattern.author))].sort((a, b) => a.localeCompare(b, 'es')), []);
  const set = (patch: Partial<FreePatternFilters>) => setFilters(current => ({ ...current, ...patch }));
  const active = Object.entries(EMPTY_FREE_FILTERS).some(([key, value]) => filters[key as keyof FreePatternFilters] !== value);
  const extraCount = Number(filters.access !== 'todos') + Number(filters.author !== 'todos') + Number(filters.sample);
  useEffect(() => { setLimit(18); try { sessionStorage.setItem('hilvana-free-pattern-search', JSON.stringify(filters)); } catch { /* optional */ } }, [filters]);
  return <section className="free-pattern-library" aria-labelledby="free-patterns-title">
    <header className="free-pattern-heading"><h1 id="free-patterns-title" tabIndex={-1}>Patrones gratis</h1><p>Moldes y guías de otros talleres, con sus autores y condiciones.</p></header>
    <div className="free-pattern-search"><Icon name="search"/><input type="search" aria-label="Buscar patrones gratuitos" placeholder="Alas, vestido, bolso, peluche…" value={filters.query} onChange={event => set({ query: event.target.value })}/></div>
    <div className="free-pattern-categories" role="group" aria-label="Categorías gratuitas">{(['todos', ...Object.keys(FREE_PATTERN_CATEGORY_LABEL)] as (FreePatternCategory | 'todos')[]).map(category => <button className="filter-chip" key={category} aria-pressed={filters.category === category} onClick={() => set({ category })}>{category === 'todos' ? 'Todos' : FREE_PATTERN_CATEGORY_LABEL[category]}</button>)}</div>
    <div className="free-pattern-language">
      <Field label="Idioma" htmlFor="free-pattern-language"><Select id="free-pattern-language" value={filters.language} onChange={language => set({ language })} options={[{ value: 'todos', label: 'Todos los idiomas' }, { value: 'es', label: 'Español' }, { value: 'en', label: 'Inglés' }]}/></Field>
    </div>
    <details className="free-pattern-more"><summary>Más filtros{extraCount > 0 ? ` (${extraCount})` : ''}</summary><div className="free-pattern-filters">
      <Field label="Acceso" htmlFor="free-pattern-access"><Select id="free-pattern-access" value={filters.access} onChange={access => set({ access })} options={[{ value: 'todos', label: 'Todos los gratuitos' }, { value: 'directo', label: 'PDF sin registro' }, { value: 'local', label: 'Copias en Hilvana' }]}/></Field>
      <Field label="Autor" htmlFor="free-pattern-author"><Select id="free-pattern-author" value={filters.author} onChange={author => set({ author })} options={[{ value: 'todos', label: 'Todos los autores' }, ...authors.map(author => ({ value: author, label: author }))]}/></Field>
    </div><label className="free-pattern-evidence"><input type="checkbox" checked={filters.sample} onChange={event => set({ sample: event.target.checked })}/>Solo con ficha de muestra confeccionada</label></details>
    <div className="free-pattern-results"><span role="status">{patterns.length} {patterns.length === 1 ? 'patrón gratuito' : 'patrones gratuitos'}</span>{active && <Button size="sm" variant="ghost" onClick={() => setFilters({ ...EMPTY_FREE_FILTERS })}>Quitar filtros</Button>}</div>
    {!patterns.length ? <Empty icon="search" title="No hay patrones con esos filtros" body="Prueba otra categoría, idioma o término de búsqueda." action={<Button onClick={() => setFilters({ ...EMPTY_FREE_FILTERS })}>Ver todos los gratuitos</Button>}/> : <div className="free-pattern-grid">{patterns.slice(0, limit).map(pattern => <FreePatternCard key={pattern.id} pattern={pattern}/>)}</div>}
    {limit < patterns.length && <div className="simple-more"><Button onClick={() => setLimit(value => value + 18)}>Ver más patrones gratis</Button><p className="tiny muted">Mostrando {Math.min(limit, patterns.length)} de {patterns.length}</p></div>}
    <details className="free-pattern-about"><summary>Cómo guardamos esta biblioteca</summary><p>El índice está guardado con Hilvana. Los archivos con permiso de redistribución también tienen una copia aquí; los demás se descargan desde sus autores. Gratis no siempre significa que se puedan publicar copias.</p><p>Los patrones externos conservan sus tallas y márgenes originales. No se convierten automáticamente en patrones editables.</p><a href={localPatternUrl('pattern-library/free-patterns.json')} target="_blank" rel="noopener noreferrer">Consultar índice de fuentes</a></details>
  </section>;
}
