import { useMemo, useState } from 'react';
import { CATALOG, CatalogModel, GarmentType, Recipient, RECIPIENT_LABEL, STATUS_INFO, TYPE_LABEL, TECHNIQUE_LABEL, Technique } from '../../data/catalog';
import { Chip, Empty, PageHead, Segmented, Sheet, Button, Field, Select } from '../../ui/components';
import { Icon } from '../../ui/Icon';
import { FlatArt } from '../../ui/FlatArt';
import { SIZE_TABLES } from '../../lib/sizes/tables';
import { navigate } from '../../ui/router';

type Filters = {
  q: string;
  recipient: Recipient | 'todos';
  type: GarmentType | 'todos';
  onlyAvailable: boolean;
  difficulty: number | 0;
  fabric: 'todos' | 'plano' | 'punto';
  stretch: 'todos' | 'ninguna' | 'baja' | 'media' | 'alta';
  fit: 'todos' | 'ajustado' | 'regular' | 'holgado' | 'oversize';
  technique: Technique | 'todas';
  size: 'todas' | 'infantil' | 'adulto';
};

const INITIAL: Filters = { q: '', recipient: 'todos', type: 'todos', onlyAvailable: false, difficulty: 0, fabric: 'todos', stretch: 'todos', fit: 'todos', technique: 'todas', size: 'todas' };

function norm(s: string) {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

export function matches(m: CatalogModel, f: Filters): boolean {
  if (f.q) {
    const hay = norm(`${m.name} ${m.sub} ${m.description} ${TYPE_LABEL[m.type]} ${m.recommendedFabrics.join(' ')}`);
    if (!norm(f.q).split(/\s+/).every((w) => hay.includes(w))) return false;
  }
  if (f.recipient !== 'todos' && !m.recipients.includes(f.recipient)) return false;
  if (f.type !== 'todos' && m.type !== f.type) return false;
  if (f.onlyAvailable && m.status === 'pendiente') return false;
  if (f.difficulty && m.difficulty !== f.difficulty) return false;
  if (f.fabric !== 'todos' && !m.fabrics.includes(f.fabric)) return false;
  if (f.stretch !== 'todos' && m.stretch !== f.stretch) return false;
  if (f.fit !== 'todos' && !m.fits.includes(f.fit)) return false;
  if (f.technique !== 'todas' && !m.techniques.includes(f.technique)) return false;
  if (f.size === 'infantil' && !m.recipients.some((r) => r === 'bebe' || r === 'toddler' || r === 'infantil')) return false;
  if (f.size === 'adulto' && !m.recipients.some((r) => r === 'mujer' || r === 'hombre' || r === 'unisex')) return false;
  return true;
}

export function LibraryPage() {
  const [f, setF] = useState<Filters>(INITIAL);
  const [babySize, setBabySize] = useState('B0-3');
  const [showFilters, setShowFilters] = useState(false);
  const list = useMemo(() => CATALOG.filter((m) => matches(m, f)), [f]);
  const extra = [f.difficulty, f.fabric !== 'todos', f.stretch !== 'todos', f.fit !== 'todos', f.technique !== 'todas', f.size !== 'todas', f.type !== 'todos'].filter(Boolean).length;
  const groups = useMemo(() => {
    const m = new Map<GarmentType, CatalogModel[]>();
    for (const x of list) m.set(x.type, [...(m.get(x.type) ?? []), x]);
    return [...m.entries()];
  }, [list]);
  const available = CATALOG.filter((m) => m.status !== 'pendiente').length;

  return (
    <div className="page page-wide">
      <PageHead title="Biblioteca" sub={`${CATALOG.length} modelos. ${available} generan patrón o tienen flujo completo; el resto son inspiración con dibujo técnico.`} />
      <div className="stack">
        <div className="row">
          <div className="grow" style={{ position: 'relative' }}>
            <span className="faint" style={{ position: 'absolute', left: 12, top: 12, pointerEvents: 'none' }}>
              <Icon name="search" size={20} />
            </span>
            <input
              className="input"
              type="search"
              placeholder="Buscar: jogger, bebé, collage…"
              value={f.q}
              onChange={(e) => setF({ ...f, q: e.target.value })}
              style={{ paddingLeft: 40 }}
              aria-label="Buscar modelos"
            />
          </div>
          <Button icon="filter" onClick={() => setShowFilters(true)}>
            Filtros{extra ? ` · ${extra}` : ''}
          </Button>
        </div>
        <div className="scroll-x" role="group" aria-label="Destinatario">
          {(['todos', 'bebe', 'toddler', 'infantil', 'mujer', 'hombre', 'unisex'] as const).map((r) => (
            <button key={r} className="filter-chip" aria-pressed={f.recipient === r} onClick={() => setF({ ...f, recipient: r })}>
              {r === 'todos' ? 'Todos' : RECIPIENT_LABEL[r]}
            </button>
          ))}
        </div>
        {f.recipient === 'bebe' && <Field label="Talla de bebé" htmlFor="library-baby-size" hint="Se llevará al proyecto. La edad orienta; verifica las medidas antes de cortar.">
          <Select id="library-baby-size" value={babySize} onChange={setBabySize} options={SIZE_TABLES.find(t => t.id === 'ref-bebe-meses')!.rows.map(r => ({ value: r.code, label: `${r.label} · hasta ${r.values.estatura! / 10} cm` }))} />
        </Field>}
        <Segmented
          label="Disponibilidad"
          value={f.onlyAvailable ? 'si' : 'no'}
          onChange={(v) => setF({ ...f, onlyAvailable: v === 'si' })}
          options={[
            { value: 'no', label: 'Todo el catálogo' },
            { value: 'si', label: 'Listos para trabajar' }
          ]}
        />
      </div>

      {list.length === 0 ? (
        <Empty icon="search" title="Sin resultados" body="Prueba con otra palabra o quita algún filtro." action={<Button onClick={() => setF(INITIAL)}>Quitar filtros</Button>} />
      ) : (
        groups.map(([type, models]) => (
          <section key={type} style={{ marginTop: 26 }}>
            <h2 className="section-title" style={{ fontSize: 15 }}>
              {TYPE_LABEL[type]}
            </h2>
            <div className="cards">
              {models.map((m) => (
                <a key={m.id} className="card" href={`#/biblioteca/${m.id}?para=${f.recipient}${f.recipient === 'bebe' ? `&talla=${babySize}` : ''}`}>
                  <div className="art">
                    <FlatArt id={m.id} spec={m.flat} title={`Dibujo técnico de ${m.name}`} />
                  </div>
                  <div className="meta">
                    <span className="name">{m.name}</span>
                    <span className="sub">{m.recipients.map((r) => RECIPIENT_LABEL[r]).slice(0, 3).join(', ')}{m.recipients.length > 3 ? '…' : ''}</span>
                    <span>
                      <Chip tone={STATUS_INFO[m.status].tone}>{m.studioOnly ? 'Diseño editable' : STATUS_INFO[m.status].label}</Chip>
                    </span>
                  </div>
                </a>
              ))}
            </div>
          </section>
        ))
      )}

      <details className="panel panel-pad small" style={{marginTop:24}}>
        <summary>Explorar más patrones a medida</summary>
        <div className="stack" style={{marginTop:10}}>
          <p>FreeSewing ofrece diseños paramétricos con tus medidas. Su catálogo se abre en otra web; todavía no se importa como piezas editables de Hilvana.</p>
          <a href="https://freesewing.eu/" target="_blank" rel="noreferrer">Explorar el catálogo de FreeSewing</a>
          <p className="muted">Si traes un PDF propio o con permiso, crea un proyecto desde «Patrón en imagen», calibra y traza sus piezas. Una imagen o un PDF no se vuelve un patrón paramétrico automáticamente.</p>
        </div>
      </details>

      {showFilters && (
        <Sheet title="Filtros" onClose={() => setShowFilters(false)} footer={<div className="spread"><Button variant="ghost" onClick={() => setF({ ...INITIAL, q: f.q, recipient: f.recipient })}>Restablecer</Button><Button variant="primary" onClick={() => setShowFilters(false)}>Ver {list.length} modelos</Button></div>}>
          <div className="stack-lg">
            <FilterGroup label="Tipo de prenda" value={f.type} onChange={(v) => setF({ ...f, type: v as Filters['type'] })} options={[['todos', 'Todos'], ...Object.entries(TYPE_LABEL)]} />
            <FilterGroup label="Dificultad" value={String(f.difficulty)} onChange={(v) => setF({ ...f, difficulty: Number(v) })} options={[['0', 'Cualquiera'], ['1', 'Fácil'], ['2', 'Intermedia'], ['3', 'Avanzada']]} />
            <FilterGroup label="Talla" value={f.size} onChange={(v) => setF({ ...f, size: v as Filters['size'] })} options={[['todas', 'Todas'], ['infantil', 'Bebé e infantil (por estatura)'], ['adulto', 'Adulto (por busto o pecho)']]} />
            <FilterGroup label="Tejido" value={f.fabric} onChange={(v) => setF({ ...f, fabric: v as Filters['fabric'] })} options={[['todos', 'Cualquiera'], ['plano', 'Tejido plano'], ['punto', 'Tejido de punto']]} />
            <FilterGroup label="Elasticidad" value={f.stretch} onChange={(v) => setF({ ...f, stretch: v as Filters['stretch'] })} options={[['todos', 'Cualquiera'], ['ninguna', 'Sin elasticidad'], ['baja', 'Baja'], ['media', 'Media'], ['alta', 'Alta']]} />
            <FilterGroup label="Ajuste" value={f.fit} onChange={(v) => setF({ ...f, fit: v as Filters['fit'] })} options={[['todos', 'Cualquiera'], ['ajustado', 'Ajustado'], ['regular', 'Regular'], ['holgado', 'Holgado'], ['oversize', 'Oversize']]} />
            <FilterGroup label="Técnica" value={f.technique} onChange={(v) => setF({ ...f, technique: v as Filters['technique'] })} options={[['todas', 'Todas'], ...Object.entries(TECHNIQUE_LABEL)]} />
          </div>
        </Sheet>
      )}
    </div>
  );
}

function FilterGroup({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: [string, string][] }) {
  return (
    <div className="stack" style={{ gap: 8 }}>
      <div className="field-label">{label}</div>
      <div className="row-wrap">
        {options.map(([v, l]) => (
          <button key={v} className="filter-chip" aria-pressed={value === v} onClick={() => onChange(v)}>
            {l}
          </button>
        ))}
      </div>
    </div>
  );
}

export function openModel(id: string) {
  navigate(`/biblioteca/${id}`);
}
