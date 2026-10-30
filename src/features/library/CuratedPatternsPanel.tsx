import { useMemo, useState } from 'react';
import { CURATED_CATEGORY_LABEL, filterCuratedPatterns, type CuratedPatternCategory } from '../../data/curatedPatterns';
import { Button, Empty } from '../../ui/components';
import { Icon } from '../../ui/Icon';
import './curatedPatterns.css';

type Category = 'todos' | CuratedPatternCategory;
const FORMAT_LABEL = { pdf: 'Patrón PDF', tutorial: 'Tutorial de confección', parametrico: 'Patrón a medida' };

export function CuratedPatternsPanel({ category, onCategoryChange, initialCategory = 'todos' }: { category?: Category; onCategoryChange?: (category: Category) => void; initialCategory?: Category }) {
  const [localCategory, setLocalCategory] = useState<Category>(initialCategory);
  const [query, setQuery] = useState('');
  const selectedCategory = category ?? localCategory;
  const patterns = useMemo(() => filterCuratedPatterns(query, selectedCategory), [query, selectedCategory]);
  const chooseCategory = (value: Category) => { setLocalCategory(value); onCategoryChange?.(value); };
  return <section id="patrones-con-muestra" className="curated-patterns" aria-labelledby="curated-patterns-title">
    <header className="curated-patterns-heading"><span className="curated-kicker"><Icon name="needle" size={18}/> De otros talleres</span><h2 id="curated-patterns-title" tabIndex={-1}>Patrones con muestra confeccionada</h2><p>Muestras documentadas por sus autores. Consulta sus medidas, materiales e instrucciones en la fuente original.</p></header>
    <div className="curated-search"><Icon name="search" size={20}/><input type="search" aria-label="Buscar patrones con muestra confeccionada" placeholder="Sombrero, alas, chaqueta, mochila…" value={query} onChange={event => setQuery(event.target.value)}/></div>
    <div className="curated-categories" role="group" aria-label="Categorías de patrones con muestra">{(['todos', 'disfraces', 'prendas', 'accesorios'] as Category[]).map(value => <button key={value} className="filter-chip" aria-pressed={selectedCategory === value} onClick={() => chooseCategory(value)}>{value === 'todos' ? 'Todas' : CURATED_CATEGORY_LABEL[value]}</button>)}</div>
    <p className="small muted" role="status">{patterns.length} {patterns.length === 1 ? 'patrón con fuente documentada' : 'patrones con fuentes documentadas'}</p>
    {patterns.length ? <div className="curated-pattern-grid">{patterns.map(pattern => {
      const tone = pattern.categories.includes('disfraces') ? 'disfraces' : pattern.categories.includes('prendas') ? 'prendas' : 'accesorios';
      return <article className={`curated-pattern-card curated-${tone}`} key={pattern.id} data-curated-pattern={pattern.id}>
        <div className="curated-card-top"><span className="curated-category"><Icon name={tone === 'disfraces' ? 'wand' : tone === 'prendas' ? 'hanger' : 'scissors'} size={19}/>{pattern.categories.map(value => CURATED_CATEGORY_LABEL[value]).join(' · ')}</span><span className="curated-evidence-badge">Muestra del autor</span></div>
        <div><h3>{pattern.name}</h3><p className="curated-author">Por {pattern.author}</p></div>
        <p className="small curated-description">{pattern.description}</p>
        <p className="curated-sizing"><Icon name="ruler" size={18}/><span>{pattern.sizing}</span></p>
        <p className="tiny muted">{FORMAT_LABEL[pattern.format]} · {pattern.language}{pattern.difficulty ? ` · ${pattern.difficulty}` : ''}</p>
        <details className="curated-card-details"><summary>Ver ficha de confección</summary><div className="stack-lg">
          <section><h4>Medidas y tallas</h4><p>{pattern.sizing}</p></section>
          <section><h4>Telas y materiales</h4><ul>{pattern.materials.map((material, index) => <li key={index}>{material}</li>)}</ul></section>
          <section><h4>Piezas que incluye</h4>{pattern.pieces.length ? <ul>{pattern.pieces.map((piece, index) => <li key={index}>{piece}</li>)}</ul> : <p>Consulta el inventario completo en el patrón original.</p>}</section>
          <section><h4>Proceso de confección</h4><ol>{pattern.instructions.map((instruction, index) => <li key={index}>{instruction}</li>)}</ol><p className="tiny muted">Resumen orientativo. Sigue las instrucciones completas y los márgenes que indica el autor.</p></section>
          <section><h4>Acceso y uso</h4><p>{pattern.access}</p><p className="small muted">{pattern.licenseNote}</p>{pattern.licenseUrl && <a href={pattern.licenseUrl} target="_blank" rel="noopener noreferrer">Consultar condiciones de uso</a>}</section>
          <section><h4>Muestra documentada</h4><p>{pattern.evidence.description}</p><a href={pattern.evidence.url} target="_blank" rel="noopener noreferrer">Ver muestra del autor</a><p className="tiny muted">Fuente revisada: {pattern.verifiedAt}. Hilvana no ha confeccionado ni verificado físicamente este patrón.</p></section>
        </div></details>
        <div className="curated-card-action"><a className="btn" href={pattern.url} target="_blank" rel="noopener noreferrer"><Icon name="link" size={18}/>Abrir patrón original</a><span className="tiny muted">Se consulta en el sitio del autor.</span></div>
      </article>;
    })}</div> : <Empty icon="search" title="No encontramos esa combinación" body="Prueba otra palabra o consulta todas las categorías." action={<Button onClick={() => { setQuery(''); chooseCategory('todos'); }}>Ver todos los patrones</Button>}/>}
    <p className="curated-patterns-note">Estas fuentes muestran prendas u objetos confeccionados; el ajuste depende de tus medidas y de la tela. Sus archivos se obtienen en la página original y aún no se editan dentro del estudio de Hilvana.</p>
  </section>;
}
