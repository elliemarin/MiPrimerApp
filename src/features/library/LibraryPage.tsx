import { useEffect, useMemo, useRef, useState } from 'react';
import { CATALOG, RECIPIENT_LABEL, TECHNIQUE_LABEL, TYPE_LABEL, type CatalogModel, type GarmentType, type Recipient, type Technique } from '../../data/catalog';
import { catalogFamilyOptions, FAMILY_LABEL, familyOf, type CatalogFamily } from '../../data/catalogTaxonomy';
import { Button, Empty, Field, Select, Sheet } from '../../ui/components';
import { Icon } from '../../ui/Icon';
import { CatalogImage } from '../../ui/CatalogImage';
import { SIZE_TABLES } from '../../lib/sizes/tables';
import { INITIAL_FILTERS, matches, modelHasPattern, sanitizeFilters, type Filters } from './filters';
import { groupCatalog } from './groups';
import { FreePatternsPanel } from './FreePatternsPanel';
import { GIRL_FAMILIES } from '../../data/kidsCatalog';
import './library.css';
import './simpleLibrary.css';
export { matches } from './filters';

const start: Filters = { ...INITIAL_FILTERS, availability: 'patron' };
const babyRows = SIZE_TABLES.find(table => table.id === 'ref-bebe-meses')!.rows;
type CatalogMode = 'editables' | 'internet';
const FIT_LABEL = { ajustado: 'Ajustado', regular: 'Regular', holgado: 'Holgado', oversize: 'Oversize' };
const STRETCH_LABEL = { ninguna: 'Sin elasticidad', baja: 'Elasticidad baja', media: 'Elasticidad media', alta: 'Elasticidad alta' };
const DIFFICULTY_LABEL = ['Cualquier nivel', 'Inicial', 'Intermedio', 'Avanzado'];
const quickTypes: [GarmentType, string][] = [
  ['superiores', 'Tops'], ['abrigo', 'Abrigo'], ['inferiores', 'Pantalones'],
  ['faldas-vestidos', 'Faldas y vestidos'], ['monos', 'Petos'], ['bolsos', 'Bolsos'], ['accesorios', 'Accesorios'],
];
const GIRLS = 'Niña', TRENDS = 'Tendencias';
/** The girls' shortcut joins the new collection with kid-sized dresses, skirts
 * and pinafores already in the catalogue; costumes keep their own shortcut. */
function inCollection(model: CatalogModel, collection: string): boolean {
  if (collection === 'todas') return true;
  if (collection === GIRLS) return model.collection === GIRLS || (GIRL_FAMILIES as readonly string[]).includes(familyOf(model)) && model.collection !== 'Disfraces';
  return (model.collection ?? model.sub) === collection;
}
function saved(key: string, fallback: string) { try { return sessionStorage.getItem(key) ?? fallback; } catch { return fallback; } }
function initial(): Filters {
  try { return { ...sanitizeFilters(JSON.parse(saved('hilvana-simple-search', '{}'))), availability: 'patron' }; }
  catch { return start; }
}

export function LibraryPage() {
  const [filters, setFilters] = useState<Filters>(initial);
  const [collection, setCollection] = useState(() => {
    const value = saved('hilvana-simple-collection', 'todas');
    return CATALOG.some(model => (model.collection ?? model.sub) === value) ? value : 'todas';
  });
  const [mode, setMode] = useState<CatalogMode>(() => saved('hilvana-library-mode', 'editables') === 'internet' ? 'internet' : 'editables');
  const [open, setOpen] = useState(false);
  const [limit, setLimit] = useState(24);
  const [babySize, setBabySize] = useState(() => {
    const value = saved('hilvana-simple-baby', 'B0-3');
    return babyRows.some(row => row.code === value) ? value : 'B0-3';
  });
  const focusInternet = useRef(false);
  const all = useMemo(() => CATALOG.filter(modelHasPattern), []);
  const familyOptions = useMemo(() => {
    const options = catalogFamilyOptions(all.filter(model => matches(model, { ...filters, q: '', family: 'todas' })));
    const selected = filters.family;
    if (selected && selected !== 'todas' && !options.some(option => option.value === selected)) {
      options.unshift({ value: selected, label: `${FAMILY_LABEL[selected]} · sin resultados` });
    }
    return options;
  }, [all, filters]);
  const collections = useMemo(() => {
    const values = [...new Set(all.filter(model => matches(model, { ...filters, q: '' })).map(model => model.collection ?? model.sub))].sort((a, b) => a.localeCompare(b, 'es'));
    if (collection !== 'todas' && !values.includes(collection)) values.unshift(collection);
    return values;
  }, [all, filters, collection]);
  const list = useMemo(() => {
    const found = groupCatalog(all.filter(model => matches(model, filters) && inCollection(model, collection)));
    if (filters.q || filters.type !== 'todos' || filters.family !== 'todas' || collection !== 'todas') return found;
    const seen = new Set<string>();
    const featured = found.filter(group => {
      const model = group.representative;
      const key = model.collection ?? model.sub;
      if (seen.has(key)) return false;
      seen.add(key); return true;
    });
    const hoodie = found.find(group => familyOf(group.representative) === 'hoodie');
    const ordered = hoodie ? [hoodie, ...featured.filter(group => group.id !== hoodie.id)] : featured;
    const ids = new Set(ordered.map(group => group.id));
    return [...ordered, ...found.filter(group => !ids.has(group.id))];
  }, [all, filters, collection]);
  useEffect(() => {
    setLimit(24);
    try { sessionStorage.setItem('hilvana-simple-search', JSON.stringify(filters)); } catch { /* Optional browsing memory. */ }
  }, [filters, collection]);
  useEffect(() => {
    try {
      sessionStorage.setItem('hilvana-simple-collection', collection);
      sessionStorage.setItem('hilvana-simple-baby', babySize);
      sessionStorage.setItem('hilvana-library-mode', mode);
    } catch { /* Optional browsing memory. */ }
  }, [collection, babySize, mode]);
  useEffect(() => {
    if (mode !== 'internet' || !focusInternet.current) return;
    focusInternet.current = false;
    const heading = document.getElementById('free-patterns-title');
    heading?.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
    heading?.focus({ preventScroll: true });
  }, [mode]);

  const set = (patch: Partial<Filters>) => {
    setFilters(current => ({ ...current, ...(patch.type !== undefined ? { family: 'todas' as const } : {}), ...patch }));
    if (patch.type !== undefined || patch.family !== undefined) setCollection('todas');
  };
  const reset = () => { setFilters(start); setCollection('todas'); };
  const chooseBaby = () => { setFilters({ ...start, recipient: 'bebe' }); setCollection('todas'); };
  const chooseGirls = () => { setFilters({ ...start, recipient: 'infantil' }); setCollection(GIRLS); };
  const chooseInternet = () => { focusInternet.current = true; setMode('internet'); };
  const active: { key: string; label: string; remove: () => void }[] = [];
  if (filters.q.trim()) active.push({ key: 'q', label: `“${filters.q.trim()}”`, remove: () => set({ q: '' }) });
  if (filters.recipient !== 'todos') active.push({ key: 'recipient', label: RECIPIENT_LABEL[filters.recipient], remove: () => set({ recipient: 'todos' }) });
  if (filters.type !== 'todos') active.push({ key: 'type', label: TYPE_LABEL[filters.type], remove: () => set({ type: 'todos' }) });
  if (filters.family && filters.family !== 'todas') active.push({ key: 'family', label: FAMILY_LABEL[filters.family], remove: () => set({ family: 'todas' }) });
  if (collection !== 'todas') active.push({ key: 'collection', label: collection, remove: () => setCollection('todas') });
  if (filters.fabric !== 'todos') active.push({ key: 'fabric', label: filters.fabric === 'punto' ? 'Tejido de punto' : 'Tejido plano', remove: () => set({ fabric: 'todos' }) });
  if (filters.fit !== 'todos') active.push({ key: 'fit', label: FIT_LABEL[filters.fit], remove: () => set({ fit: 'todos' }) });
  if (filters.difficulty) active.push({ key: 'difficulty', label: `Nivel ${DIFFICULTY_LABEL[filters.difficulty].toLowerCase()}`, remove: () => set({ difficulty: 0 }) });
  if (filters.stretch !== 'todos') active.push({ key: 'stretch', label: STRETCH_LABEL[filters.stretch], remove: () => set({ stretch: 'todos' }) });
  if (filters.technique !== 'todas') active.push({ key: 'technique', label: TECHNIQUE_LABEL[filters.technique], remove: () => set({ technique: 'todas' }) });
  if (filters.size !== 'todas') active.push({ key: 'size', label: filters.size === 'infantil' ? 'Tallas infantiles' : 'Tallas adultas', remove: () => set({ size: 'todas' }) });
  if (filters.subcategory && filters.subcategory !== 'todas') active.push({ key: 'subcategory', label: filters.subcategory, remove: () => set({ subcategory: 'todas' }) });
  const filterCount = active.filter(filter => filter.key !== 'q').length;
  const familySelected = filters.family && filters.family !== 'todas';

  return <div className="page page-wide simple-library">
    <header className={`simple-library-head${mode === 'internet' ? ' compact' : ''}`}><span className="simple-wordmark">Hilvana</span>{mode === 'editables' && <><h1>¿Qué vas a crear?</h1><p>Elige un diseño, ajusta sus medidas y hazlo tuyo.</p></>}</header>
    <div className="simple-library-modes" role="group" aria-label="Biblioteca de patrones">
      <button aria-pressed={mode === 'editables'} onClick={() => setMode('editables')}><Icon name="scissors" size={19}/><span>Patrones editables</span></button>
      <button aria-pressed={mode === 'internet'} onClick={() => setMode('internet')}><Icon name="download" size={19}/><span>Gratis de internet</span></button>
    </div>
    {mode === 'internet' ? <FreePatternsPanel initialCategory={collection === 'Disfraces' ? 'disfraces' : 'todos'}/> : <>
      <div className="simple-search-row"><div className="simple-search"><Icon name="search"/><input type="search" aria-label="Buscar prendas y accesorios" placeholder="Hoodie, pantalón, funda, bolso…" value={filters.q} onChange={event => set({ q: event.target.value })}/></div><Button icon="filter" aria-label={`Filtros${filterCount > 0 ? ` (${filterCount})` : ''}`} onClick={() => setOpen(true)}><span className="simple-filters-label">Filtros</span>{filterCount > 0 && <span className="simple-filter-count">{filterCount}</span>}</Button></div>
      <div className="simple-collections" role="group" aria-label="Tipo de proyecto">
        <button className="filter-chip" aria-pressed={!active.length} onClick={reset}>Todo</button>
        <button className="filter-chip simple-baby-shortcut" aria-pressed={filters.recipient === 'bebe'} onClick={chooseBaby}>Bebé</button>
        <button className="filter-chip simple-baby-shortcut" aria-pressed={collection === GIRLS} onClick={chooseGirls}>Niña</button>
        <button className="filter-chip" aria-pressed={collection === TRENDS} onClick={() => { setFilters(start); setCollection(TRENDS); }}>Tendencias</button>
        <button className="filter-chip" aria-pressed={filters.family === 'hoodie'} onClick={() => set({ type: 'todos', family: 'hoodie' })}>Hoodies</button>
        <button className="filter-chip" aria-pressed={collection === 'Disfraces'} onClick={() => { setFilters(current => ({ ...current, type: 'todos', family: 'todas' })); setCollection('Disfraces'); }}>Disfraces</button>
        {quickTypes.map(([type, label]) => <button key={type} className="filter-chip" aria-pressed={collection !== 'Disfraces' && !familySelected && filters.type === type} onClick={() => set({ type })}>{label}</button>)}
      </div>
      {active.length > 0 && <div className="simple-active-filters" role="group" aria-label="Filtros activos">{active.map(filter => <button key={filter.key} className="simple-active-filter" aria-label={`Quitar filtro ${filter.label}`} onClick={filter.remove}><span>{filter.label}</span><Icon name="close" size={14}/></button>)}</div>}
      {filters.recipient === 'bebe' && <div className="simple-baby-section"><div><strong>Para bebé</strong><p>Elige los meses; después podrás ajustar las medidas.</p></div><Field label="Talla por meses" htmlFor="baby-simple"><Select id="baby-simple" value={babySize} onChange={setBabySize} options={babyRows.map(row => ({ value: row.code, label: row.label }))}/></Field></div>}
      <div className="simple-results"><span role="status">{list.length.toLocaleString('es-MX')} {list.length === 1 ? 'diseño' : 'diseños'}{filters.recipient !== 'todos' ? ` para ${RECIPIENT_LABEL[filters.recipient].toLowerCase()}` : ''}</span>{active.length ? <Button variant="ghost" size="sm" onClick={reset}>Quitar filtros</Button> : <span className="tiny muted">Las medidas se eligen dentro</span>}</div>
      {!list.length ? <Empty icon="search" title="No hay diseños con estos filtros" body="Quita uno de los filtros de arriba o prueba otra prenda." action={<Button onClick={reset}>Mostrar todos</Button>}/> : <div className="simple-pattern-grid">{list.slice(0, limit).map(group => {
        const model = group.representative;
        return <a key={group.id} className="simple-pattern-card" data-design-group={group.id} data-family={familyOf(model)} href={`#/biblioteca/${model.id}?para=${filters.recipient}${filters.recipient === 'bebe' ? `&talla=${babySize}` : ''}`}>
          <div className="simple-pattern-art"><CatalogImage model={model} title={group.name} recipient={filters.recipient === 'todos' ? undefined : filters.recipient}/></div><div className="simple-pattern-caption"><strong>{group.name}</strong><span>{FAMILY_LABEL[familyOf(model)]} · Elegir medidas</span></div>
        </a>;
      })}</div>}
      {limit < list.length && <div className="simple-more"><Button onClick={() => setLimit(value => value + 24)}>Ver más diseños</Button><p className="tiny muted">Mostrando {Math.min(limit, list.length)} de {list.length.toLocaleString('es-MX')}</p></div>}
      <p className="simple-catalog-note">Cada diseño reúne sus medidas y versiones. Al continuar puedes obtener el patrón o añadir extras, colores y bordados. Los patrones experimentales requieren una muestra antes de cortar tu tela definitiva.</p>
      <div className="simple-external-invite"><div><strong>¿Buscas más ideas?</strong><p>Explora patrones gratuitos de otros autores con sus instrucciones.</p></div><Button icon="link" onClick={chooseInternet}>Ver patrones de internet</Button></div>
      {open && <Sheet title="Encuentra tu base" onClose={() => setOpen(false)} footer={<Button block variant="primary" onClick={() => setOpen(false)}>Ver {list.length.toLocaleString('es-MX')} resultados</Button>}><div className="stack-lg">
        <Field label="Para quién" htmlFor="search-recipient"><Select id="search-recipient" value={filters.recipient} onChange={recipient => set({ recipient })} options={[{ value: 'todos' as const, label: 'Todas las personas' }, ...Object.entries(RECIPIENT_LABEL).map(([value, label]) => ({ value: value as Recipient, label }))]}/></Field>
        <Field label="Categoría" htmlFor="search-type"><Select id="search-type" value={filters.type} onChange={type => set({ type })} options={[{ value: 'todos' as const, label: 'Todas las categorías' }, ...Object.entries(TYPE_LABEL).filter(([value]) => all.some(model => model.type === value)).map(([value, label]) => ({ value: value as GarmentType, label }))]}/></Field>
        <Field label="Tipo exacto" htmlFor="search-family" hint="Hoodies, chaquetas, capas y sudaderas son tipos distintos."><Select id="search-family" value={filters.family ?? 'todas'} onChange={family => set({ family })} options={[{ value: 'todas' as CatalogFamily | 'todas', label: 'Todos los tipos' }, ...familyOptions]}/></Field>
        <Field label="Tela" htmlFor="search-fabric"><Select id="search-fabric" value={filters.fabric} onChange={fabric => set({ fabric })} options={[{ value: 'todos', label: 'Cualquier tela' }, { value: 'plano', label: 'Tejido plano' }, { value: 'punto', label: 'Tejido de punto' }]}/></Field>
        <Field label="Ajuste" htmlFor="search-fit"><Select id="search-fit" value={filters.fit} onChange={fit => set({ fit })} options={[{ value: 'todos' as const, label: 'Cualquiera' }, ...Object.entries(FIT_LABEL).map(([value, label]) => ({ value: value as Exclude<Filters['fit'], 'todos'>, label }))]}/></Field>
        <details className="simple-filter-more"><summary>Más filtros</summary><div className="stack-lg">
          <Field label="Dificultad" htmlFor="search-difficulty"><Select id="search-difficulty" value={String(filters.difficulty)} onChange={value => set({ difficulty: Number(value) })} options={DIFFICULTY_LABEL.map((label, value) => ({ value: String(value), label }))}/></Field>
          <Field label="Elasticidad de la tela" htmlFor="search-stretch"><Select id="search-stretch" value={filters.stretch} onChange={stretch => set({ stretch })} options={[{ value: 'todos' as const, label: 'Cualquiera' }, ...Object.entries(STRETCH_LABEL).map(([value, label]) => ({ value: value as Exclude<Filters['stretch'], 'todos'>, label }))]}/></Field>
          <Field label="Técnica" htmlFor="search-technique"><Select id="search-technique" value={filters.technique} onChange={technique => set({ technique })} options={[{ value: 'todas' as const, label: 'Cualquier técnica' }, ...Object.entries(TECHNIQUE_LABEL).map(([value, label]) => ({ value: value as Technique, label }))]}/></Field>
          <Field label="Colección" htmlFor="search-collection"><Select id="search-collection" value={collection} onChange={setCollection} options={[{ value: 'todas', label: 'Todas' }, ...collections.map(value => ({ value, label: value }))]}/></Field>
        </div></details>
        <Button variant="ghost" onClick={reset}>Restablecer filtros</Button>
      </div></Sheet>}
    </>}
  </div>;
}
