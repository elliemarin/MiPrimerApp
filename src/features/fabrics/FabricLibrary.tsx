import { useMemo, useState } from 'react';
import { FABRIC_LIBRARY, FABRIC_FAMILY_LABEL, MATERIAL_LIBRARY, SWATCH_MOTIF_LABEL, recommendFabrics, searchLibraryFabric, swatchUrl, type FabricFamily, type LibraryFabric, type SwatchMotif } from '../../data/materialLibrary';
import { findModel } from '../../data/catalog';
import { addLibraryFabric, addLibraryMaterial } from '../../lib/fabricLibrary';
import { Button, Chip, Empty, Field, Notice, Segmented, Select, Sheet } from '../../ui/components';
import { useApp } from '../../store/app';
import type { Fabric } from '../../store/types';
import './fabricLibrary.css';

/** También se puede incrustar en el selector de telas del estudio. */
export function FabricLibrary({ onUse }: { onUse?: (fabric: Fabric) => void }) {
  const projects = useApp((s) => Object.values(s.projects).filter((p) => !p.archived));
  const toast = useApp((s) => s.toast);
  const [query, setQuery] = useState('');
  const [family, setFamily] = useState<FabricFamily | 'todas'>('todas');
  const [kind, setKind] = useState<'todos' | 'plano' | 'punto'>('todos');
  const [projectId, setProjectId] = useState('');
  const [selected, setSelected] = useState<LibraryFabric | null>(null);
  const project = projects.find((p) => p.id === projectId);
  const recommendations = useMemo(() => project ? recommendFabrics(project.modelId ? findModel(project.modelId) : undefined, project.fabricType, project.stretch) : [], [project]);
  const reasons = new Map(recommendations.map((r) => [r.fabric.id, r.reason]));
  const list = useMemo(() => {
    const source = project ? recommendations.map((r) => r.fabric) : FABRIC_LIBRARY;
    return source.filter((f) => (family === 'todas' || f.family === family) && (kind === 'todos' || f.kind === kind) && searchLibraryFabric(f, query));
  }, [project, recommendations, family, kind, query]);
  return <div className="stack-lg">
    <div className="fabric-library-intro">
      <span className="fabric-swatch-fan" aria-hidden="true">{FABRIC_LIBRARY.slice(0, 5).map((f, i) => <span key={f.id} style={{ backgroundImage: `url("${swatchUrl(f)}")`, transform: `rotate(${i * 12 - 24}deg)` }} />)}</span>
      <div><h2 className="section-title" style={{ margin: '0 0 6px' }}>Elige la tela antes de cortar</h2><p className="small muted" style={{ margin: 0 }}>{FABRIC_LIBRARY.length} tipos de tela con usos, caída y cuidados. Crea muestras para probarlas en tu diseño.</p></div>
    </div>
    <div className="stack">
      <input aria-label="Buscar en el catálogo de telas" className="input" type="search" placeholder="Mezclilla, bebé, bordado, funda…" value={query} onChange={(e) => setQuery(e.target.value)} />
      <Field label="Sugerir telas para un proyecto" htmlFor="fabric-library-project">
        <Select id="fabric-library-project" value={projectId} onChange={setProjectId} options={[{ value: '', label: 'Explorar todas las telas' }, ...projects.map((p) => ({ value: p.id, label: p.name }))]} />
      </Field>
      <div className="scroll-x" role="group" aria-label="Familia de tela">
        <button className="filter-chip" aria-pressed={family === 'todas'} onClick={() => setFamily('todas')}>Todas</button>
        {Object.entries(FABRIC_FAMILY_LABEL).map(([id, label]) => <button key={id} className="filter-chip" aria-pressed={family === id} onClick={() => setFamily(id as FabricFamily)}>{label}</button>)}
      </div>
      <Segmented label="Tipo de tejido" value={kind} onChange={setKind} options={[{ value: 'todos', label: 'Todos' }, { value: 'plano', label: 'Plano' }, { value: 'punto', label: 'Punto' }]} />
    </div>
    {project && <Notice>Selección para <strong>{project.name}</strong>, por tejido y elasticidad del proyecto. Confirma las propiedades de la tela real antes de cortar.</Notice>}
    <p className="tiny faint" style={{ margin: 0 }}>{list.length} telas · Las tramas son ilustrativas. Gramajes y elasticidades orientativos, según fabricante.</p>
    {list.length ? <div className="fabric-library-grid">{list.map((f) => <button className="fabric-library-card" key={f.id} onClick={() => setSelected(f)}>
      <span className="fabric-library-swatch" style={{ backgroundImage: `url("${swatchUrl(f)}")` }} />
      <span className="fabric-library-card-body"><strong>{f.name}</strong><span className="tiny muted">{f.kind === 'punto' ? 'Punto' : 'Plano'} · {f.weight.join('–')} g/m²</span><span className="tiny muted">{f.uses.slice(0, 3).join(', ')}</span>{project && <span className="tiny" style={{ color: 'var(--mat)' }}>{reasons.get(f.id)}</span>}</span>
    </button>)}</div> : <Empty icon="search" title="No hay telas con estos filtros" body="Prueba otra palabra o explora todas las familias." action={<Button onClick={() => { setQuery(''); setFamily('todas'); setKind('todos'); setProjectId(''); }}>Quitar filtros</Button>} />}
    {selected && <FabricLibraryDetail key={selected.id} entry={selected} reason={reasons.get(selected.id)} onClose={() => setSelected(null)} onUse={(f) => { setSelected(null); if (onUse) onUse(f); else toast('Muestra agregada a Mis telas. Ya puedes usarla en el estudio.', 'ok'); }} />}
  </div>;
}

export function FabricLibraryDetail({ entry, reason, onClose, onUse }: { entry: LibraryFabric; reason?: string; onClose: () => void; onUse: (fabric: Fabric) => void }) {
  const [color, setColor] = useState(entry.color);
  const [motif, setMotif] = useState(entry.motif);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  return <Sheet title={entry.name} onClose={onClose} footer={<Button variant="primary" block disabled={busy} onClick={() => {
    setBusy(true); setError('');
    void addLibraryFabric(entry.id, color, motif).then(onUse).catch((e: unknown) => setError(e instanceof Error ? e.message : 'No se pudo crear la muestra.')).finally(() => setBusy(false));
  }}>{busy ? 'Creando muestra…' : 'Agregar muestra a Mis telas'}</Button>}>
    <div className="stack-lg">
      <div className="fabric-library-preview" style={{ backgroundImage: `url("${swatchUrl(entry, color, motif)}")` }}><Chip>Muestra ilustrativa</Chip></div>
      <div className="grid-2"><Field label="Color de la muestra"><input type="color" aria-label="Color de la muestra" value={color} onChange={(e) => setColor(e.target.value)} style={{ width: '100%', height: 42 }} /></Field><Field label="Estampado" htmlFor="fabric-library-motif"><Select id="fabric-library-motif" value={motif} onChange={setMotif} options={Object.entries(SWATCH_MOTIF_LABEL).map(([value, label]) => ({ value: value as SwatchMotif, label }))} /></Field></div>
      {reason && <Notice tone="ok">{reason}</Notice>}
      <dl className="fabric-library-properties">
        <dt>Composición habitual</dt><dd>{entry.composition}</dd>
        <dt>Gramaje orientativo</dt><dd>{entry.weight.join('–')} g/m²</dd>
        <dt>Elasticidad orientativa</dt><dd>{entry.stretch.join('–')} %</dd>
        <dt>Caída</dt><dd>{entry.drape}</dd>
        <dt>Aguja orientativa</dt><dd>{entry.needle}</dd>
      </dl>
      <section><h3 className="section-title">Se usa para</h3><div className="row-wrap">{entry.uses.map((u) => <Chip key={u}>{u}</Chip>)}</div></section>
      <Notice>{entry.avoid}</Notice><p className="small muted">{entry.care}</p>
      <p className="tiny faint">El color de pantalla y la trama no representan una muestra física. No se registra stock, calibración o elasticidad medida; añade esos datos cuando tengas la tela.</p>
      {error && <Notice tone="err">{error}</Notice>}
    </div>
  </Sheet>;
}

export function NotionsLibrary() {
  const [query, setQuery] = useState('');
  const toast = useApp((s) => s.toast);
  const list = MATERIAL_LIBRARY.filter((m) => `${m.name} ${m.use}`.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().includes(query.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()));
  return <div className="stack"><h2 className="section-title">Materiales para completar tu proyecto</h2><input className="input" type="search" aria-label="Buscar materiales de referencia" placeholder="Hilo, estabilizador, broche…" value={query} onChange={(e) => setQuery(e.target.value)} /><p className="tiny faint">Referencias para tu lista de materiales. Se agregan con cantidad cero para que registres tus existencias.</p><div className="group">{list.map((m) => <div key={m.id} className="list-row"><span className="grow"><strong className="small">{m.name}</strong><span className="s tiny" style={{ display: 'block' }}>{m.use}</span></span><Button size="sm" onClick={() => { addLibraryMaterial(m.id); toast('Material agregado al inventario; registra tu cantidad.', 'ok'); }}>Agregar</Button></div>)}</div>{!list.length && <Empty icon="search" title="Sin materiales con ese nombre" />}</div>;
}
