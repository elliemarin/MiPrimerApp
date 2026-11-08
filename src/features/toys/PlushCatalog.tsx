import { useEffect, useMemo, useState } from 'react';
import { toyMatches, type PlushCard } from '../../data/toys';
import type { ParamDef, Params } from '../../lib/pattern/generator';
import { pieceSeamPath } from '../../lib/pattern/outline';
import { newPatternState } from '../../lib/pattern/engine';
import { Button, Empty, Field, Notice, Select, Sheet } from '../../ui/components';
import { Icon } from '../../ui/Icon';
import { saveBlob } from '../../lib/download';
import { slugify } from '../../lib/ids';
import { blankProject } from '../../store/projects';
import { useApp } from '../../store/app';
import { navigate } from '../../ui/router';
import { ToyArt } from './ToyArt';
import type { Scene } from './art';
import { TOY_CONTEXT, prepareToy } from './prepare';
import '../figures/figures.css';
import './toys.css';

/* Catálogo de patrones con dibujo (juguetes y cojines): tarjetas, ficha con
 * tamaño y opciones, PDF a tamaño real y proyección sobre la tela. */

export interface CatalogConfig<C extends string> {
  cards: PlushCard<C>[];
  categories: { id: C; label: string; count: number }[];
  categoryLabel: Record<C, string>;
  title: string; titleId: string; intro: string; note: string;
  searchLabel: string; placeholder: string; groupLabel: string;
  /** Singular and plural noun for the counter ("juguete", "juguetes"). */
  noun: [string, string];
  storagePrefix: string;
  sizes: Record<string, number[]>;
  scene?: Scene;
  className: string;
}

const FABRIC: Record<string, string> = { principal: 'tela principal', contraste: 'contraste', forro: 'forro', entretela: 'entretela', 'punto-elastico': 'punto' };
const SKIP = new Set(['margen', 'personaje', 'fuelle']);

function readDraft(prefix: string, card: PlushCard): Params {
  try {
    const v: unknown = JSON.parse(localStorage.getItem(`${prefix}${card.id}`) ?? 'null');
    if (v && typeof v === 'object' && !Array.isArray(v)) return Object.fromEntries(Object.entries(v as Record<string, unknown>).filter(([, x]) => typeof x === 'string' || (typeof x === 'number' && Number.isFinite(x)))) as Params;
  } catch { /* Saved choices are a convenience. */ }
  return {};
}
/** The size is the first length parameter that is not a margin or a gusset. */
export const sizeDef = (params: ParamDef[]) => params.find(p => p.type === 'length' && !SKIP.has(p.key))!;

/** A project holding this pattern, so the projector (and the project's PDFs) can use it. */
export function projectFor(card: PlushCard, params: Params) {
  const project = blankProject(card.name, 'catalogo');
  project.fabricType = 'plano';
  project.pattern = { ...newPatternState(card.generatorId, {}, TOY_CONTEXT), params: { ...params } };
  return project;
}

export function PlushCatalog<C extends string>({ config }: { config: CatalogConfig<C> }) {
  const [category, setCategory] = useState<C | 'todas'>('todas');
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<PlushCard<C>>();
  const found = useMemo(() => config.cards.filter(c => toyMatches(c, category, query)), [config.cards, category, query]);
  const previews = useMemo(() => new Map(config.cards.map(c => [c.id, prepareToy(c)] as const)), [config.cards]);
  return <section className={config.className} aria-labelledby={config.titleId}>
    <div className="figures-intro">
      <h1 id={config.titleId}>{config.title}</h1>
      <p>{config.intro}</p>
    </div>
    <div className="transform-search"><Icon name="search"/><input type="search" aria-label={config.searchLabel} placeholder={config.placeholder} value={query} onChange={e => setQuery(e.target.value)}/></div>
    <div className="figures-chips" role="group" aria-label={config.groupLabel}>
      <button className="filter-chip" aria-pressed={category === 'todas'} onClick={() => setCategory('todas')}>Todos</button>
      {config.categories.map(c => <button key={c.id} className="filter-chip" aria-pressed={category === c.id} onClick={() => setCategory(c.id)}>{c.label}</button>)}
    </div>
    <p className="transform-count" role="status">{found.length} {found.length === 1 ? config.noun[0] : config.noun[1]}</p>
    {!found.length ? <Empty icon="search" title={`No hay ${config.noun[1]} con esta búsqueda`} body="Prueba otra palabra o muestra todos." action={<Button onClick={() => { setQuery(''); setCategory('todas'); }}>Mostrar todos</Button>}/> :
      <div className="figures-grid">{found.map(card => { const pr = previews.get(card.id)!; return <button key={card.id} className="figure-card" onClick={() => setSelected(card)}>
        <span className="toy-swatch"><ToyArt card={card} result={pr.built.result} params={pr.params} scene={config.scene}/></span>
        <strong>{card.name}</strong>
        <span>{pr.built.pieces.length} {pr.built.pieces.length === 1 ? 'pieza' : 'piezas'} · {config.categoryLabel[card.category]}</span>
      </button>; })}</div>}
    <p className="transform-note">{config.note}</p>
    {selected && <PlushSheet key={selected.id} card={selected} config={config} onClose={() => setSelected(undefined)}/>}
  </section>;
}

function PlushSheet<C extends string>({ card, config, onClose }: { card: PlushCard<C>; config: CatalogConfig<C>; onClose: () => void }) {
  const [draft, setDraft] = useState<Params>(() => readDraft(config.storagePrefix, card));
  const prepared = useMemo(() => prepareToy(card, draft), [card, draft]);
  const { built, generator, params } = prepared;
  const def = sizeDef(generator.params), key = def.key;
  const [rawSize, setRawSize] = useState(() => String(Number(params[key]) / 10));
  const [view, setView] = useState<'terminado' | 'piezas'>('terminado');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  useEffect(() => { try { localStorage.setItem(`${config.storagePrefix}${card.id}`, JSON.stringify(draft)); } catch { /* Optional. */ } }, [config.storagePrefix, card.id, draft]);
  const set = (k: string, v: Params[string]) => { setDraft(d => ({ ...d, [k]: v })); setMessage(''); setError(''); };
  const sizeNum = Number(rawSize.replace(',', '.')), sizeOk = Number.isFinite(sizeNum) && sizeNum * 10 >= (def.min ?? 0) && sizeNum * 10 <= (def.max ?? 1e9);
  const setSize = (text: string) => { setRawSize(text); const n = Number(text.replace(',', '.')); if (Number.isFinite(n) && n * 10 >= (def.min ?? 0) && n * 10 <= (def.max ?? 1e9)) set(key, n * 10); };
  const errors = built.issues.filter(i => i.level === 'error'), avisos = built.result?.notices.filter(n => n.level !== 'error') ?? [];
  const seamsOk = built.seamResults.filter(s => s.ok).length;
  const options = generator.params.filter((p: ParamDef) => p.key !== key && p.key !== 'margen' && p.key !== 'personaje' && (!p.when || p.when(params)));
  const blocked = busy || !!errors.length || !sizeOk;
  const download = async () => {
    if (blocked) return;
    setBusy(true); setError(''); setMessage('');
    try {
      const { buildToyPdf } = await import('./export');
      const r = await buildToyPdf(card, draft);
      await saveBlob(new Blob([r.bytes], { type: 'application/pdf' }), `${slugify(card.name)}-${Math.round(Number(params[key]) / 10)}cm.pdf`);
      setMessage(`PDF listo: ${r.pageCount} páginas. Las piezas a tamaño real empiezan en la página ${r.patternStartPage}.`);
    } catch (e) { setError(e instanceof Error ? e.message : 'No se pudo preparar el PDF.'); }
    finally { setBusy(false); }
  };
  const project = () => {
    if (blocked) return;
    const p = projectFor(card, params);
    useApp.getState().put('project', p);
    onClose();
    navigate(`/proyectar/${p.id}`);
  };
  const extraNotices = avisos.filter(n => n.level === 'aviso' && n.code !== 'juguete-experimental');
  return <Sheet title={card.name} wide onClose={onClose} footer={<div className="transform-export"><span>{built.pieces.length} {built.pieces.length === 1 ? 'pieza' : 'piezas'} · {built.seamResults.length ? `${seamsOk} de ${built.seamResults.length} costuras comprobadas` : 'tamaño real'}</span>
    <Button block icon="download" variant="primary" disabled={blocked} onClick={() => void download()}>{busy ? 'Preparando PDF…' : 'Descargar PDF a tamaño real'}</Button>
    <Button block icon="eye" disabled={blocked} onClick={project}>Proyectar sobre la tela</Button>
    <p className="tiny muted" style={{ margin: 0 }}>Al proyectar se guarda como proyecto: desde Proyectos también sacas el PDF para proyector. Calibra antes con una regla.</p>
  </div>}>
    <div className="stack-lg figure-detail">
      <div className="figure-stage">
        <div className="toy-swatch toy-swatch-lg">
          {view === 'terminado' ? <ToyArt card={card} result={built.result} params={params} scene={config.scene}/> :
            <div className="figure-pieces">{built.pieces.map(p => { const cut = built.cuts.get(p.id)!, xs = cut.points.map(q => q.x), ys = cut.points.map(q => q.y), w = Math.max(...xs) - Math.min(...xs), h = Math.max(...ys) - Math.min(...ys), s = Math.max(w, h) * 1.1;
              return <figure key={p.id}><svg viewBox={`${Math.min(...xs) + w / 2 - s / 2} ${Math.min(...ys) + h / 2 - s / 2} ${s} ${s}`} role="img" aria-label={p.name}><path d={`M${cut.points.map(q => `${q.x.toFixed(1)} ${q.y.toFixed(1)}`).join(' L')} Z`} fill="#fbf7ef" stroke="#3b2a1a" strokeWidth={1.2} vectorEffect="non-scaling-stroke"/><path d={pieceSeamPath(p)} fill="none" stroke="#c0392b" strokeDasharray="3 2" strokeWidth={1} vectorEffect="non-scaling-stroke"/></svg><figcaption>{p.name.replace(/\s*\(.*\)$/, '')} ×{p.cut.qty}</figcaption></figure>; })}</div>}
        </div>
        <div className="transform-photo-switch" role="group" aria-label="Vista">
          <button aria-pressed={view === 'terminado'} onClick={() => setView('terminado')}>Terminado</button>
          <button aria-pressed={view === 'piezas'} onClick={() => setView('piezas')}>Piezas</button>
        </div>
      </div>
      <p>{card.description} <span className="muted">Referencia: {card.reference}.</span></p>
      <section className="stack">
        <h3>Tamaño</h3>
        <Field label={def.label} htmlFor={`plush-size-${card.id}`} hint={`Entre ${(def.min ?? 0) / 10} y ${(def.max ?? 0) / 10} cm. El margen de costura se suma aparte.`}>
          <div className="len-input"><input id={`plush-size-${card.id}`} className="input num" inputMode="decimal" value={rawSize} aria-invalid={!sizeOk} onChange={e => setSize(e.target.value)}/><span className="unit">cm</span></div>
        </Field>
        <div className="figures-sizes" role="group" aria-label="Tamaños habituales">{(config.sizes[card.generatorId] ?? []).map(cmv => <button key={cmv} className="filter-chip" aria-pressed={Math.round(Number(params[key])) === cmv * 10} onClick={() => setSize(String(cmv))}>{cmv} cm</button>)}</div>
      </section>
      {options.length > 0 && <section className="stack"><h3>Opciones</h3><div className="transform-measures">{options.map(o => <Field key={o.key} label={o.label} htmlFor={`plush-${card.id}-${o.key}`} hint={o.type === 'length' ? 'En milímetros.' : undefined}>
        {o.type === 'choice' ? <Select id={`plush-${card.id}-${o.key}`} value={String(params[o.key])} options={o.choices!} onChange={v => set(o.key, v)}/> :
          <input id={`plush-${card.id}-${o.key}`} className="input num" type="number" min={o.min} max={o.max} value={Number(params[o.key])} onChange={e => set(o.key, Number(e.target.value))}/>}
      </Field>)}</div></section>}
      <details className="transform-settings"><summary>Margen de costura y lista de piezas</summary><div className="stack">
        <Field label="Margen de costura" htmlFor={`plush-margin-${card.id}`}><Select id={`plush-margin-${card.id}`} value={String(params.margen ?? 6)} options={(generator.params.find(p => p.key === 'margen')?.min ?? 4) >= 6 ? ['6', '10', '15'].map(v => ({ value: v, label: `${v} mm` })) : ['5', '6', '8'].map(v => ({ value: v, label: `${v} mm` }))} onChange={v => set('margen', Number(v))}/></Field>
        <ul className="toy-piece-list">{built.pieces.map(p => <li key={p.id}><strong>{p.name}</strong> · cortar {p.cut.qty} en {FABRIC[p.cut.fabric] ?? p.cut.fabric}</li>)}</ul>
      </div></details>
      {errors.map(e => <Notice key={e.code + e.message} tone="err">{e.message}</Notice>)}
      {avisos.filter(n => n.level === 'ok').map(n => <Notice key={n.code} tone="ok">{n.message}</Notice>)}
      {extraNotices.map(n => <Notice key={n.code} tone="warn">{n.message}</Notice>)}
      {error && <Notice tone="err">{error}</Notice>}
      {message && <Notice tone="ok">{message}</Notice>}
    </div>
  </Sheet>;
}
