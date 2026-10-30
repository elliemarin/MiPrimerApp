import { useEffect, useMemo, useState } from 'react';
import { CATALOG, CatalogModel, GarmentType, RECIPIENT_LABEL, STATUS_INFO, TYPE_LABEL, TECHNIQUE_LABEL } from '../../data/catalog';
import { Chip, Empty, PageHead, Segmented, Sheet, Button, Field, Select } from '../../ui/components';
import { Icon } from '../../ui/Icon';
import { FlatArt } from '../../ui/FlatArt';
import { SIZE_TABLES } from '../../lib/sizes/tables';
import { navigate } from '../../ui/router';

import { Filters, INITIAL_FILTERS, matches, modelHasPattern, modelAvailability } from './filters';
import { PatternSourcesPanel } from './PatternSourcesPanel';
import { ModelIllustration } from './ModelIllustration';
import './library.css';
export { matches } from './filters';

const INITIAL = INITIAL_FILTERS;
function restoreChoice<T extends string>(key:string,allowed:readonly T[],fallback:T):T {
  try {const saved=sessionStorage.getItem(key);return allowed.includes(saved as T)?saved as T:fallback;} catch{return fallback;}
}
function restoreFilters(): Filters {
  try { const saved=JSON.parse(sessionStorage.getItem('hilvana-library-filters')??'null'); return saved&&typeof saved==='object'?{...INITIAL,...saved,type:saved.type==='todos'||saved.type in TYPE_LABEL?saved.type:'todos'}:INITIAL; } catch {return INITIAL;}
}

export function LibraryPage() {
  const [f, setF] = useState<Filters>(restoreFilters);
  const [babySize, setBabySize] = useState(()=>restoreChoice('hilvana-library-baby-size',SIZE_TABLES.find(t=>t.id==='ref-bebe-meses')!.rows.map(r=>r.code),'B0-3'));
  const [art, setArt] = useState<'dibujo'|'ilustracion'>(()=>restoreChoice('hilvana-library-art',['dibujo','ilustracion'],'dibujo'));
  useEffect(()=>{try{sessionStorage.setItem('hilvana-library-filters',JSON.stringify(f));sessionStorage.setItem('hilvana-library-baby-size',babySize);sessionStorage.setItem('hilvana-library-art',art);}catch{/* browsing can continue without session storage */}},[f,babySize,art]);
  const [showFilters, setShowFilters] = useState(false);
  const list = useMemo(() => CATALOG.filter((m) => matches(m, f)), [f]);
  const extra = [f.difficulty, f.fabric !== 'todos', f.stretch !== 'todos', f.fit !== 'todos', f.technique !== 'todas', f.size !== 'todas', f.type !== 'todos',f.availability!=='todos',f.subcategory&&f.subcategory!=='todas'].filter(Boolean).length;
  const groups = useMemo(() => {
    const m = new Map<GarmentType, CatalogModel[]>();
    for (const x of list) m.set(x.type, [...(m.get(x.type) ?? []), x]);
    return [...m.entries()];
  }, [list]);
  const patterns = CATALOG.filter(modelHasPattern).length;
  const designs = CATALOG.filter(m=>m.studioOnly).length;
  const active = f.q || f.recipient!=='todos' || extra>0 || f.onlyAvailable;
  const reset = ()=>setF(INITIAL);

  return (
    <div className="page page-wide">
      <PageHead title="Biblioteca" sub={`${CATALOG.length} modelos: ${patterns} con patrón de costura y ${designs} para diseñar en el estudio. Explora prendas, accesorios y nuevas ideas.`} />
      <div className="stack">
        <div className="row">
          <div className="grow" style={{ position: 'relative' }}>
            <span className="faint" style={{ position: 'absolute', left: 12, top: 12, pointerEvents: 'none' }}>
              <Icon name="search" size={20} />
            </span>
            <input
              className="input"
              type="search"
              placeholder="Buscar: chamarra, jumper, bolso…"
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
        <div className="scroll-x library-quick" role="group" aria-label="Colección">
          {(['todos','abrigo','monos','accesorios','bolsos','superiores','inferiores','faldas-vestidos','bebe'] as const).map(type=><button key={type} className="filter-chip" aria-pressed={f.type===type} onClick={()=>setF({...f,type,subcategory:'todas'})}>{({todos:'Todo',abrigo:'Chaquetas y abrigos',monos:'Jumpers y monos',accesorios:'Accesorios',bolsos:'Bolsos',superiores:'Superiores',inferiores:'Pantalones','faldas-vestidos':'Faldas y vestidos',bebe:'Prendas bebé'})[type]}</button>)}
          <button className="filter-chip" aria-pressed={f.fit==='holgado'} onClick={()=>setF({...f,fit:f.fit==='holgado'?'todos':'holgado'})}>Holgados</button>
          <button className="filter-chip" aria-pressed={f.fit==='oversize'} onClick={()=>setF({...f,fit:f.fit==='oversize'?'todos':'oversize'})}>Oversize</button>
        </div>
        {(f.type==='accesorios'||f.type==='bolsos')&&<Field label={f.type==='accesorios'?'Tipo de accesorio':'Tipo de bolso o funda'} htmlFor="library-subcategory">
          <Select id="library-subcategory" value={f.subcategory??'todas'} onChange={subcategory=>setF({...f,subcategory})} options={[{value:'todas',label:'Todos los tipos'},...[...new Set(CATALOG.filter(m=>m.type===f.type).map(m=>m.sub))].sort((a,b)=>a.localeCompare(b,'es')).map(sub=>({value:sub,label:sub}))]} />
        </Field>}
        <Field label="Qué quieres hacer" htmlFor="library-availability">
          <Select id="library-availability" value={f.availability??'todos'} onChange={availability=>setF({...f,availability,onlyAvailable:false})} options={[{value:'todos',label:'Explorar todo'}, {value:'patron',label:'Coser: modelos con patrón generado'}, {value:'estudio',label:'Diseñar: plantillas del estudio'}, {value:'inspiracion',label:'Inspiración: patrón aún pendiente'}]} />
        </Field>
        <div className="spread" style={{gap:12,flexWrap:'wrap'}}>
          <span className="library-result-count" role="status">{list.length} {list.length===1?'modelo':'modelos'}{active?' con tus filtros':''}</span>
          <div className="library-art-toggle"><Segmented label="Mostrar modelos" value={art} onChange={setArt} options={[{value:'dibujo',label:'Dibujo'},{value:'ilustracion',label:'Ilustración'}]}/></div>
        </div>
        {active&&<div className="library-active-filters">
          {f.recipient!=='todos'&&<Chip>{RECIPIENT_LABEL[f.recipient]}</Chip>}
          {f.type!=='todos'&&<Chip>{TYPE_LABEL[f.type]}</Chip>}
          {f.subcategory&&f.subcategory!=='todas'&&<Chip>{f.subcategory}</Chip>}
          {f.fit!=='todos'&&<Chip>{f.fit==='oversize'?'Oversize':f.fit==='holgado'?'Holgado':f.fit==='ajustado'?'Ajustado':'Regular'}</Chip>}
          <Button size="sm" variant="ghost" onClick={reset}>Quitar todos los filtros</Button>
        </div>}

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
                    {art==='dibujo'?<FlatArt id={m.id} spec={m.flat} title={`Dibujo técnico de ${m.name}`} />:<ModelIllustration model={m} skin={['#bc8055','#80503b','#edc1a1','#603d2f'][models.indexOf(m)%4]} title={`Ilustración de ${m.name}`} />}
                  </div>
                  <div className="meta">
                    <span className="name">{m.name}</span>
                    <span className="sub">{m.recipients.map((r) => RECIPIENT_LABEL[r]).slice(0, 3).join(', ')}{m.recipients.length > 3 ? '…' : ''}</span>
                    <span>
                      <Chip tone={STATUS_INFO[m.status].tone}>{modelAvailability(m)==='estudio'?'Diseño en estudio':modelAvailability(m)==='inspiracion'?'Solo inspiración':m.status==='experimental'?'Patrón experimental':'Patrón de costura'}</Chip>
                    </span>
                  </div>
                </a>
              ))}
            </div>
          </section>
        ))
      )}

      <PatternSourcesPanel />

      {showFilters && (
        <Sheet title="Filtros" onClose={() => setShowFilters(false)} footer={<div className="spread"><Button variant="ghost" onClick={() => setF({ ...INITIAL, q: f.q, recipient: f.recipient })}>Restablecer</Button><Button variant="primary" onClick={() => setShowFilters(false)}>Ver {list.length} modelos</Button></div>}>
          <div className="stack-lg">
            <FilterGroup label="Tipo de prenda" value={f.type} onChange={(v) => setF({ ...f, type: v as Filters['type'], subcategory:'todas' })} options={[['todos', 'Todos'], ...Object.entries(TYPE_LABEL)]} />
            <FilterGroup label="Disponibilidad" value={f.availability??'todos'} onChange={availability=>setF({...f,availability:availability as Filters['availability'],onlyAvailable:false})} options={[["todos","Todo"],["patron","Patrón de costura"],["estudio","Diseño en estudio"],["inspiracion","Solo inspiración"]]} />
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
