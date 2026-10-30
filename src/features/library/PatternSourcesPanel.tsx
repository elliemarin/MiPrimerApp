import { useState } from 'react';
import { filterPatternSources, PATTERN_SOURCES, PATTERN_SOURCE_CATEGORY_LABEL, PATTERN_SOURCE_FORMAT_LABEL, PatternSourceCategory } from '../../data/patternSources';
import { Chip, Empty, Field, Select, TextInput } from '../../ui/components';

/** El directorio no aumenta el contador de patrones disponibles de Hilvana. */
export function PatternSourcesPanel() {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<PatternSourceCategory | 'todas'>('todas');
  const list = filterPatternSources(query, category);
  return <details className="panel panel-pad small" style={{ marginTop: 24 }}>
    <summary>Explorar otras bibliotecas de patrones · {PATTERN_SOURCES.length} fuentes</summary>
    <div className="stack" style={{ marginTop: 14 }}>
      <p>Abre el catálogo de cada autor para encontrar más proyectos. Estos enlaces externos no son patrones ya integrados en Hilvana.</p>
      <Field label="Buscar fuentes" htmlFor="pattern-source-search"><TextInput id="pattern-source-search" value={query} onChange={setQuery} placeholder="Chaquetas, monos, bolsas…" type="search" /></Field>
      <Field label="Tipo de proyecto externo" htmlFor="pattern-source-category"><Select id="pattern-source-category" value={category} onChange={setCategory} options={[{ value: 'todas', label: 'Todos los proyectos' }, ...Object.entries(PATTERN_SOURCE_CATEGORY_LABEL).map(([value, label]) => ({ value: value as PatternSourceCategory, label }))]} /></Field>
      <p className="tiny muted">{list.length} fuentes · revisadas el 30 de octubre de 2026. Precios y condiciones pueden cambiar.</p>
      {!list.length && <Empty icon="search" title="Sin fuentes" body="Prueba con otra palabra o proyecto." />}
      <div className="stack" style={{ gap: 16 }}>
        {list.map(source => <article key={source.id} style={{ borderTop: '1px solid var(--line)', paddingTop: 12 }}>
          <a href={source.url} target="_blank" rel="noreferrer" style={{ fontWeight: 700 }}>{source.name} · abrir catálogo</a>
          <div style={{ margin: '6px 0' }}><Chip>{PATTERN_SOURCE_FORMAT_LABEL[source.format]}</Chip></div>
          <p>{source.description}</p>
          <p className="muted tiny" style={{ marginTop: 5 }}>{source.access}</p>
          <p className="tiny" style={{ marginTop: 5 }}>{source.importNote}</p>
          <details style={{ marginTop: 6 }}><summary className="tiny muted">Uso y condiciones</summary><p className="tiny muted" style={{ marginTop: 6 }}>{source.licenseNote}{source.infoUrl && <> <a href={source.infoUrl} target="_blank" rel="noreferrer">Consultar fuente oficial</a></>}</p></details>
        </article>)}
      </div>
    </div>
  </details>;
}
