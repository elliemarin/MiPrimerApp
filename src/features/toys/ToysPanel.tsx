import { useEffect, useMemo, useState } from 'react';
import { TOY_CARDS, TOY_CATEGORIES, TOY_CATEGORY_LABEL, toyMatches, type ToyCard, type ToyCategory } from '../../data/toys';
import type { ParamDef, Params } from '../../lib/pattern/generator';
import { pieceSeamPath } from '../../lib/pattern/outline';
import { Button, Empty, Field, Notice, Select, Sheet } from '../../ui/components';
import { Icon } from '../../ui/Icon';
import { saveBlob } from '../../lib/download';
import { slugify } from '../../lib/ids';
import { ToyArt } from './ToyArt';
import { prepareToy } from './prepare';
import '../figures/figures.css';
import './toys.css';

const SIZES: Record<string, number[]> = { 'muneco-trapo': [25, 30, 40, 50], 'peluche-bichito': [16, 22, 30], 'fieltro-hada': [15, 20, 28], 'peluche-libelula': [35, 42, 60], 'peluche-conejo-3d': [26, 32, 45] };
const sizeKey = (card: ToyCard) => (card.generatorId === 'peluche-libelula' ? 'largo' : 'alto');
const FABRIC: Record<string, string> = { principal: 'tela principal', contraste: 'contraste', forro: 'forro', entretela: 'entretela', 'punto-elastico': 'punto' };

function readDraft(card: ToyCard): Params {
  try {
    const v: unknown = JSON.parse(localStorage.getItem(`hilvana-juguete-${card.id}`) ?? 'null');
    if (v && typeof v === 'object' && !Array.isArray(v)) return Object.fromEntries(Object.entries(v as Record<string, unknown>).filter(([, x]) => typeof x === 'string' || (typeof x === 'number' && Number.isFinite(x)))) as Params;
  } catch { /* Saved choices are a convenience. */ }
  return {};
}

export function ToysPanel() {
  const [category, setCategory] = useState<ToyCategory | 'todas'>('todas');
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<ToyCard>();
  const found = useMemo(() => TOY_CARDS.filter(c => toyMatches(c, category, query)), [category, query]);
  const previews = useMemo(() => new Map(TOY_CARDS.map(c => { const p = prepareToy(c); return [c.id, p] as const; })), []);
  return <section className="toys-panel" aria-labelledby="toys-title">
    <div className="figures-intro">
      <h1 id="toys-title">Juguetes y peluches</h1>
      <p>Muñecas de trapo, animalitos con ropa, bichitos y peluches con volumen. Elige el alto y descarga las piezas a tamaño real con margen, piquetes y costuras comprobadas.</p>
    </div>
    <div className="transform-search"><Icon name="search"/><input type="search" aria-label="Buscar juguetes" placeholder="Conejo, abeja, muñeca, peto…" value={query} onChange={e => setQuery(e.target.value)}/></div>
    <div className="figures-chips" role="group" aria-label="Tipo de juguete">
      <button className="filter-chip" aria-pressed={category === 'todas'} onClick={() => setCategory('todas')}>Todos</button>
      {TOY_CATEGORIES.map(c => <button key={c.id} className="filter-chip" aria-pressed={category === c.id} onClick={() => setCategory(c.id)}>{c.label}</button>)}
    </div>
    <p className="transform-count" role="status">{found.length} {found.length === 1 ? 'juguete' : 'juguetes'}</p>
    {!found.length ? <Empty icon="search" title="No hay juguetes con esta búsqueda" body="Prueba otra palabra o muestra todos." action={<Button onClick={() => { setQuery(''); setCategory('todas'); }}>Mostrar todos</Button>}/> :
      <div className="figures-grid">{found.map(card => { const pr = previews.get(card.id)!; return <button key={card.id} className="figure-card" onClick={() => setSelected(card)}>
        <span className="toy-swatch"><ToyArt card={card} result={pr.built.result} params={pr.params}/></span>
        <strong>{card.name}</strong>
        <span>{pr.built.pieces.length} piezas · {TOY_CATEGORY_LABEL[card.category]}</span>
      </button>; })}</div>}
    <p className="transform-note">Diseños propios de Hilvana inspirados en la construcción de juguetes clásicos. Todo es experimental: cose una prueba antes de la pieza definitiva. Para bebés, borda ojos y detalles.</p>
    {selected && <ToySheet key={selected.id} card={selected} onClose={() => setSelected(undefined)}/>}
  </section>;
}

function ToySheet({ card, onClose }: { card: ToyCard; onClose: () => void }) {
  const [draft, setDraft] = useState<Params>(() => readDraft(card));
  const prepared = useMemo(() => prepareToy(card, draft), [card, draft]);
  const { built, generator, params } = prepared;
  const key = sizeKey(card), def = generator.params.find(p => p.key === key)!;
  const [rawSize, setRawSize] = useState(() => String(Number(params[key]) / 10));
  const [view, setView] = useState<'terminado' | 'piezas'>('terminado');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  useEffect(() => { try { localStorage.setItem(`hilvana-juguete-${card.id}`, JSON.stringify(draft)); } catch { /* Optional. */ } }, [card.id, draft]);
  const set = (k: string, v: Params[string]) => { setDraft(d => ({ ...d, [k]: v })); setMessage(''); setError(''); };
  const sizeNum = Number(rawSize.replace(',', '.')), sizeOk = Number.isFinite(sizeNum) && sizeNum * 10 >= (def.min ?? 0) && sizeNum * 10 <= (def.max ?? 1e9);
  const setSize = (text: string) => { setRawSize(text); const n = Number(text.replace(',', '.')); if (Number.isFinite(n) && n * 10 >= (def.min ?? 0) && n * 10 <= (def.max ?? 1e9)) set(key, n * 10); };
  const errors = built.issues.filter(i => i.level === 'error'), avisos = built.result?.notices.filter(n => n.level !== 'error') ?? [];
  const seamsOk = built.seamResults.filter(s => s.ok).length;
  const options = generator.params.filter((p: ParamDef) => p.key !== key && p.key !== 'margen' && p.key !== 'personaje' && (!p.when || p.when(params)));
  const download = async () => {
    if (busy || errors.length || !sizeOk) return;
    setBusy(true); setError(''); setMessage('');
    try {
      const { buildToyPdf } = await import('./export');
      const r = await buildToyPdf(card, draft);
      await saveBlob(new Blob([r.bytes], { type: 'application/pdf' }), `${slugify(card.name)}-${Math.round(Number(params[key]) / 10)}cm.pdf`);
      setMessage(`PDF listo: ${r.pageCount} páginas. Las piezas a tamaño real empiezan en la página ${r.patternStartPage}.`);
    } catch (e) { setError(e instanceof Error ? e.message : 'No se pudo preparar el PDF.'); }
    finally { setBusy(false); }
  };
  return <Sheet title={card.name} wide onClose={onClose} footer={<div className="transform-export"><span>{built.pieces.length} piezas · {built.seamResults.length ? `${seamsOk} de ${built.seamResults.length} costuras comprobadas` : 'piezas 1:1'}</span><Button block icon="download" variant="primary" disabled={busy || !!errors.length || !sizeOk} onClick={() => void download()}>{busy ? 'Preparando PDF…' : 'Descargar PDF a tamaño real'}</Button></div>}>
    <div className="stack-lg figure-detail">
      <div className="figure-stage">
        <div className="toy-swatch toy-swatch-lg">
          {view === 'terminado' ? <ToyArt card={card} result={built.result} params={params}/> :
            <div className="figure-pieces">{built.pieces.map(p => { const cut = built.cuts.get(p.id)!, xs = cut.points.map(q => q.x), ys = cut.points.map(q => q.y), w = Math.max(...xs) - Math.min(...xs), h = Math.max(...ys) - Math.min(...ys), s = Math.max(w, h) * 1.1;
              return <figure key={p.id}><svg viewBox={`${Math.min(...xs) + w / 2 - s / 2} ${Math.min(...ys) + h / 2 - s / 2} ${s} ${s}`} role="img" aria-label={p.name}><path d={`M${cut.points.map(q => `${q.x.toFixed(1)} ${q.y.toFixed(1)}`).join(' L')} Z`} fill="#fbf7ef" stroke="#3b2a1a" strokeWidth={1.2} vectorEffect="non-scaling-stroke"/><path d={pieceSeamPath(p)} fill="none" stroke="#c0392b" strokeDasharray="3 2" strokeWidth={1} vectorEffect="non-scaling-stroke"/></svg><figcaption>{p.name.replace(/\s*\(.*\)$/, '')} ×{p.cut.qty}</figcaption></figure>; })}</div>}
        </div>
        <div className="transform-photo-switch" role="group" aria-label="Vista del juguete">
          <button aria-pressed={view === 'terminado'} onClick={() => setView('terminado')}>Terminado</button>
          <button aria-pressed={view === 'piezas'} onClick={() => setView('piezas')}>Piezas</button>
        </div>
      </div>
      <p>{card.description} <span className="muted">Inspirado en: {card.reference}.</span></p>
      <section className="stack">
        <h3>Tamaño</h3>
        <Field label={def.label} htmlFor={`toy-size-${card.id}`} hint={`Entre ${(def.min ?? 0) / 10} y ${(def.max ?? 0) / 10} cm. El margen de costura se suma aparte.`}>
          <div className="len-input"><input id={`toy-size-${card.id}`} className="input num" inputMode="decimal" value={rawSize} aria-invalid={!sizeOk} onChange={e => setSize(e.target.value)}/><span className="unit">cm</span></div>
        </Field>
        <div className="figures-sizes" role="group" aria-label="Tamaños habituales">{(SIZES[card.generatorId] ?? []).map(cmv => <button key={cmv} className="filter-chip" aria-pressed={Math.round(Number(params[key])) === cmv * 10} onClick={() => setSize(String(cmv))}>{cmv} cm</button>)}</div>
      </section>
      {options.length > 0 && <section className="stack"><h3>Opciones</h3><div className="transform-measures">{options.map(o => <Field key={o.key} label={o.label} htmlFor={`toy-${card.id}-${o.key}`}>
        {o.type === 'choice' ? <Select id={`toy-${card.id}-${o.key}`} value={String(params[o.key])} options={o.choices!} onChange={v => set(o.key, v)}/> :
          <input id={`toy-${card.id}-${o.key}`} className="input num" type="number" min={o.min} max={o.max} value={Number(params[o.key])} onChange={e => set(o.key, Number(e.target.value))}/>}
      </Field>)}</div></section>}
      <details className="transform-settings"><summary>Margen de costura y lista de piezas</summary><div className="stack">
        <Field label="Margen de costura" htmlFor={`toy-margin-${card.id}`}><Select id={`toy-margin-${card.id}`} value={String(params.margen ?? 6)} options={['5', '6', '8'].map(v => ({ value: v, label: `${v} mm` }))} onChange={v => set('margen', Number(v))}/></Field>
        <ul className="toy-piece-list">{built.pieces.map(p => <li key={p.id}><strong>{p.name}</strong> · cortar {p.cut.qty} en {FABRIC[p.cut.fabric] ?? p.cut.fabric}</li>)}</ul>
      </div></details>
      {errors.map(e => <Notice key={e.code + e.message} tone="err">{e.message}</Notice>)}
      {avisos.filter(n => n.level === 'ok').map(n => <Notice key={n.code} tone="ok">{n.message}</Notice>)}
      {avisos.filter(n => n.code === 'juguete-seguridad').map(n => <Notice key={n.code} tone="warn">{n.message}</Notice>)}
      {error && <Notice tone="err">{error}</Notice>}
      {message && <Notice tone="ok">{message}</Notice>}
    </div>
  </Sheet>;
}
