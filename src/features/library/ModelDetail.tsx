import { useEffect, useState } from 'react';
import { findModel, RECIPIENT_LABEL, type CatalogModel, type Recipient } from '../../data/catalog';
import { Button, Empty, Notice } from '../../ui/components';
import { FlatArt, getFlat } from '../../ui/FlatArt';
import { CatalogImage } from '../../ui/CatalogImage';
import { catalogImageFor } from '../../data/catalogImages';
import { goBack, queryParam } from '../../ui/router';
import { SIZE_TABLES, rowsForKinds, type SizeTable } from '../../lib/sizes/tables';
import { getGenerator } from '../../lib/pattern/generators';
import { ModelStartSheet } from './ModelStartSheet';
import { modelHasPattern } from './filters';
import { ModelIllustration } from './ModelIllustration';
import { supportsModelIllustration } from '../../lib/draw/garmentComposition';
import { findCatalogGroup } from './groups';
import { ModelPatternDetails } from './ModelPatternDetails';
import { catalogSubject } from '../../data/catalogArtwork';
import './simpleLibrary.css';

export function tablesFor(model: CatalogModel, recipient?: Recipient): SizeTable[] {
  const gen = model.generatorId ? getGenerator(model.generatorId) : undefined;
  if ((model.flat.family === 'bolso' || model.flat.family === 'accesorio') && !gen?.requiredMeasures.length) return [];
  const recipients = recipient && model.recipients.includes(recipient) ? [recipient] : model.recipients;
  const kinds = recipients.flatMap(value=>value==='unisex'?['mujer','hombre']:[value]);
  return SIZE_TABLES.map(table=>({...table,rows:rowsForKinds(table,kinds)})).filter(table=>table.rows.length>0);
}

export function ModelDetail({ id }: { id: string }) {
  const model = findModel(id);
  const [intent,setIntent] = useState<'pattern'|'customize'>();
  const [view,setView] = useState('frente');
  const [presentation,setPresentation] = useState<'prenda'|'figurin'>('prenda');
  useEffect(() => { setIntent(undefined); setView('frente'); setPresentation('prenda'); }, [id]);
  if (!model) return <div className="page"><Empty icon="biblioteca" title="No encontramos esta base" action={<Button onClick={()=>goBack('/biblioteca')}>Ver prendas y accesorios</Button>}/></div>;
  const available = modelHasPattern(model);
  const group = findCatalogGroup(model.id);
  const grouped = !!group && group.models.length > 1;
  const experimental = model.status === 'experimental' || (model.generatorId && getGenerator(model.generatorId)?.status === 'experimental');
  const flat = getFlat(model.id,model.flat);
  const recipient = model.recipients.find(value=>value===queryParam('para'));
  const wearable = model.flat.family !== 'bolso' && model.flat.family !== 'accesorio' && supportsModelIllustration(model.flat);
  const visibleViews = presentation === 'figurin' ? flat.views.filter(item=>item.key==='frente'||item.key==='espalda') : flat.views;
  return <div className="page page-wide">
    <button className="back-link" onClick={()=>goBack('/biblioteca')}>‹ Elegir otra base</button>
    <div className="simple-model-layout" style={{marginTop:12}}>
      <div>{wearable&&<div className="model-presentation-switch" role="group" aria-label="Presentación de la prenda"><button className="filter-chip" aria-pressed={presentation==='prenda'} onClick={()=>setPresentation('prenda')}>Prenda</button><button className="filter-chip" aria-pressed={presentation==='figurin'} onClick={()=>{setPresentation('figurin');if(view!=='frente'&&view!=='espalda')setView('frente');}}>En figurín</button></div>}
        <div className={`simple-model-art${presentation==='figurin'?' is-figurine':''}`}>{presentation==='figurin'?<ModelIllustration model={model} view={view}/>:view==='frente'?<CatalogImage model={model} title={group?.name ?? model.name} recipient={recipient} eager/>:<FlatArt id={model.id} spec={model.flat} view={view} title={model.name} catalog/>}</div>
        {visibleViews.length>1&&<div className="scroll-x" style={{marginTop:12}} role="group" aria-label="Vista de la base">{visibleViews.map(item=><button className="filter-chip" key={item.key} aria-pressed={view===item.key} onClick={()=>setView(item.key)}>{({frente:'Frente',espalda:'Espalda','costado-izq':'Costado izquierdo','costado-der':'Costado derecho'} as Record<string,string>)[item.key]??item.key}</button>)}</div>}
        {presentation==='figurin'&&<p className="tiny muted model-illustration-note">Ilustración de la silueta. El ajuste se comprueba con las medidas del patrón.</p>}
        {presentation==='prenda'&&view==='frente'&&catalogImageFor(model,recipient)&&<p className="tiny muted model-illustration-note">Ilustración generada con IA. Tú eliges las telas, colores y acabados.</p>}
        {presentation==='prenda'&&catalogSubject(model.id,model.flat)&&<p className="tiny muted model-illustration-note">Ejemplo de uso. El patrón incluye el textil; los objetos son de referencia.</p>}
      </div>
      <div className="simple-model-copy stack-lg">
        <div><h1>{grouped ? group.name : model.name}</h1><p className="muted" style={{marginTop:12}}>{grouped ? model.description.split('. ')[0] + '.' : model.description}</p>{grouped && <p className="small muted" style={{marginTop:10}}>Elige las medidas del diseño al continuar. Después podrás añadir extras, colores y bordados.</p>}</div>
        <div className="simple-model-actions">
          <Button variant="primary" icon="pdf" disabled={!available} onClick={()=>setIntent('pattern')}>Obtener patrón</Button>
          <Button icon="plus" onClick={()=>setIntent('customize')}>Intervenir</Button>
        </div>
        <p className="small muted">{available?'Descarga las piezas a escala real o añade bolsillos y extras antes de elegir telas, colores y bordados.':'Esta base sirve para intervenir una prenda que ya tienes. Su patrón de confección no está disponible.'}</p>
        {available ? <ModelPatternDetails key={`${model.id}-${recipient ?? ''}`} model={model} recipient={recipient} babySize={queryParam('talla') ?? undefined}/> : <details className="panel panel-pad small"><summary>Medidas, tela y confección</summary><div className="stack" style={{marginTop:14}}>
          <p><strong>Para:</strong> {model.recipients.map(value=>RECIPIENT_LABEL[value]).join(', ')}.</p>
          <p><strong>Telas:</strong> {model.recommendedFabrics.join(', ')}.</p>
          <p><strong>Necesitarás:</strong> {model.materials.join(', ')}.</p>
          {model.variantLabel&&<p><strong>Variante:</strong> {model.variantLabel}.</p>}
          {model.variants.map(variant=><p key={variant.name}><strong>{variant.name}:</strong> {variant.text}</p>)}
          <p>La talla se elige antes de crear. Las medidas de los accesorios corresponden al objeto indicado; comprueba el objeto real.</p>
        </div></details>}
        {available&&experimental&&<Notice>Patrón experimental. Prueba de confección pendiente: imprime y cose una muestra antes de usar la tela definitiva.</Notice>}
      </div>
    </div>
    {intent&&<ModelStartSheet key={`${id}-${intent}`} model={model} intent={intent} recipient={recipient} babySize={queryParam('talla')??undefined} onClose={()=>setIntent(undefined)}/>}
  </div>;
}
