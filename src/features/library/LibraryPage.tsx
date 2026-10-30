import { useEffect, useMemo, useState } from 'react';
import { CATALOG, RECIPIENT_LABEL, TYPE_LABEL, type GarmentType, type Recipient } from '../../data/catalog';
import { Button, Empty, Field, Select, Sheet } from '../../ui/components';
import { Icon } from '../../ui/Icon';
import { FlatArt } from '../../ui/FlatArt';
import { SIZE_TABLES } from '../../lib/sizes/tables';
import { INITIAL_FILTERS, matches, modelHasPattern, type Filters } from './filters';
import './library.css';
import './simpleLibrary.css';
export { matches } from './filters';

const start: Filters = { ...INITIAL_FILTERS, availability: 'patron' };
function initial(): Filters { try { return { ...start, ...JSON.parse(sessionStorage.getItem('hilvana-simple-search') ?? '{}') }; } catch { return start; } }
function saved(key:string,fallback:string) { try{return sessionStorage.getItem(key)??fallback;}catch{return fallback;} }

export function LibraryPage() {
  const [filters,setFilters] = useState<Filters>(initial);
  const [collection,setCollection] = useState(()=>saved('hilvana-simple-collection','todas'));
  const [open,setOpen] = useState(false);
  const [limit,setLimit] = useState(24);
  const [babySize,setBabySize] = useState(()=>saved('hilvana-simple-baby','B0-3'));
  const all = useMemo(()=>CATALOG.filter(modelHasPattern),[]);
  const collections = useMemo(()=>[...new Set(all.filter(model=>matches(model,{...filters,q:''})).map(model=>model.collection??model.sub))].sort((a,b)=>a.localeCompare(b,'es')),[all,filters]);
  const list = useMemo(()=>{
    const found=CATALOG.filter(model=>matches(model,filters)&&(collection==='todas'||(model.collection??model.sub)===collection));
    if(filters.q||filters.type!=='todos'||collection!=='todas')return found;
    const seen=new Set<string>();
    const featured=found.filter(model=>{const key=model.collection??model.sub;if(seen.has(key))return false;seen.add(key);return true;});
    const hoodie=found.find(model=>model.generatorId==='sudadera-capucha-holgada'&&model.params?.capucha==='si');
    const ordered=hoodie?[hoodie,...featured.filter(model=>model.id!==hoodie.id)]:featured;
    const ids=new Set(ordered.map(model=>model.id));
    return [...ordered,...found.filter(model=>!ids.has(model.id))];
  },[filters,collection]);
  useEffect(()=>{setLimit(24);try{sessionStorage.setItem('hilvana-simple-search',JSON.stringify(filters));}catch{/* optional browsing memory */}},[filters,collection]);
  useEffect(()=>{try{sessionStorage.setItem('hilvana-simple-collection',collection);sessionStorage.setItem('hilvana-simple-baby',babySize);}catch{/* optional browsing memory */}},[collection,babySize]);
  const set = (patch:Partial<Filters>)=>{setFilters(current=>({...current,...patch}));setCollection('todas');};
  const filtered = filters.recipient!=='todos'||filters.type!=='todos'||collection!=='todas'||filters.fabric!=='todos'||filters.fit!=='todos';
  const reset=()=>{setFilters(start);setCollection('todas');};
  return <div className="page page-wide simple-library">
    <header className="simple-library-head"><span className="simple-wordmark">Hilvana</span><h1>¿Qué vas a crear?</h1><p>Elige una base. Obtén su patrón o hazla tuya.</p></header>
    <div className="simple-search-row"><div className="simple-search"><Icon name="search"/><input type="search" aria-label="Buscar prendas y accesorios" placeholder="Hoodie, pantalón, funda, bolso…" value={filters.q} onChange={event=>set({q:event.target.value})}/></div><Button icon="filter" onClick={()=>setOpen(true)}>Filtros{filtered?' •':''}</Button></div>
    <div className="simple-collections" role="group" aria-label="Tipo de proyecto">{([['todos','Todo'],['superiores','Tops'],['abrigo','Chaquetas y hoodies'],['inferiores','Pantalones'],['faldas-vestidos','Faldas y vestidos'],['monos','Petos'],['bolsos','Bolsos'],['accesorios','Accesorios']] as [GarmentType|'todos',string][]).map(([type,label])=><button key={type} className="filter-chip" aria-pressed={filters.type===type} onClick={()=>set({type})}>{label}</button>)}</div>
    <div className="simple-results"><span role="status">{list.length.toLocaleString('es-MX')} patrones y variantes{filters.recipient!=='todos'?` para ${RECIPIENT_LABEL[filters.recipient].toLowerCase()}`:''}</span>{filtered?<Button variant="ghost" size="sm" onClick={reset}>Quitar filtros</Button>:<span className="tiny muted">Prendas y objetos con piezas de corte</span>}</div>
    {filters.recipient==='bebe'&&<Field label="Talla por meses" htmlFor="baby-simple"><Select id="baby-simple" value={babySize} onChange={setBabySize} options={SIZE_TABLES.find(table=>table.id==='ref-bebe-meses')!.rows.map(row=>({value:row.code,label:row.label}))}/></Field>}
    {!list.length?<Empty icon="search" title="Probemos con otra idea" body="Busca una prenda o un objeto, o quita algún filtro." action={<Button onClick={reset}>Mostrar todos</Button>}/>:<div className="simple-pattern-grid">{list.slice(0,limit).map(model=><a key={model.id} className="simple-pattern-card" href={`#/biblioteca/${model.id}?para=${filters.recipient}${filters.recipient==='bebe'?`&talla=${babySize}`:''}`}>
      <div className="simple-pattern-art"><FlatArt id={model.id} spec={model.flat} title={model.name}/></div><div className="simple-pattern-caption"><strong>{model.name}</strong><span>{model.variantLabel??model.sub}</span></div>
    </a>)}</div>}
    {limit<list.length&&<div className="simple-more"><Button onClick={()=>setLimit(value=>value+24)}>Ver más patrones</Button><p className="tiny muted">Mostrando {Math.min(limit,list.length)} de {list.length.toLocaleString('es-MX')}</p></div>}
    <p className="simple-catalog-note">Las variantes cambian cortes, largos, capacidades o acabados; la talla se elige después. Los patrones experimentales requieren una muestra antes de cortar tu tela definitiva.</p>
    {open&&<Sheet title="Encuentra tu base" onClose={()=>setOpen(false)} footer={<Button block variant="primary" onClick={()=>setOpen(false)}>Ver {list.length.toLocaleString('es-MX')} resultados</Button>}><div className="stack-lg">
      <Field label="Para quién" htmlFor="search-recipient"><Select id="search-recipient" value={filters.recipient} onChange={recipient=>set({recipient})} options={[{value:'todos' as const,label:'Todas las personas'},...Object.entries(RECIPIENT_LABEL).map(([value,label])=>({value:value as Recipient,label}))]}/></Field>
      <Field label="Prenda o accesorio" htmlFor="search-type"><Select id="search-type" value={filters.type} onChange={type=>set({type})} options={[{value:'todos' as const,label:'Todos'},...Object.entries(TYPE_LABEL).map(([value,label])=>({value:value as GarmentType,label}))]}/></Field>
      <Field label="Colección" htmlFor="search-collection"><Select id="search-collection" value={collection} onChange={setCollection} options={[{value:'todas',label:'Todas'},...collections.map(value=>({value,label:value}))]}/></Field>
      <Field label="Tela" htmlFor="search-fabric"><Select id="search-fabric" value={filters.fabric} onChange={fabric=>set({fabric})} options={[{value:'todos',label:'Cualquier tela'},{value:'plano',label:'Tejido plano'},{value:'punto',label:'Tejido de punto'}]}/></Field>
      <Field label="Ajuste" htmlFor="search-fit"><Select id="search-fit" value={filters.fit} onChange={fit=>set({fit})} options={[{value:'todos',label:'Cualquiera'},{value:'regular',label:'Regular'},{value:'holgado',label:'Holgado'},{value:'oversize',label:'Oversize'},{value:'ajustado',label:'Ajustado'}]}/></Field>
      <Button variant="ghost" onClick={reset}>Restablecer filtros</Button>
    </div></Sheet>}
  </div>;
}
