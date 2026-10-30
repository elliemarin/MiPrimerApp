import { useState } from 'react';
import { findModel } from '../../data/catalog';
import { defaultFigurine, FIGURE_BODY_LABEL, SKIN_TONES, type FigureBody } from '../../lib/draw/figurine';
import { useApp } from '../../store/app';
import type { Project } from '../../store/types';
import { Button, Field, Select, Sheet } from '../../ui/components';
import { getFlat } from '../../ui/FlatArt';
import { ModelIllustration } from '../library/ModelIllustration';
import { modelMaterials } from './modelMaterials';

export function ProjectModelPreview({ project, onClose, onPrepareEditorial }: { project: Project; onClose: () => void; onPrepareEditorial?: () => void }) {
  const model = findModel(project.modelId ?? '');
  const fabrics = useApp(state=>state.fabrics);
  const update = useApp(state=>state.updateProject);
  const [side,setSide] = useState<'frente'|'espalda'>('frente');
  const options = project.design?.figurine ?? defaultFigurine(model?.flat.family);
  if (!model) return null;
  const object = model.flat.family === 'accesorio' || model.flat.family === 'bolso';
  const flat = getFlat(model.id,model.flat);
  const current = flat.views.find(view=>view.key===side) ?? flat.views[0];
  const materials = modelMaterials(project,current);
  const change = (values: Partial<typeof options>) => update(project.id,value=>value.design?{...value,design:{...value.design,figurine:{...options,...values}}}:value);
  return <Sheet title={object?'Vista del accesorio':'Tu diseño en un figurín'} onClose={onClose} wide footer={<div className="row-wrap">{onPrepareEditorial&&<Button onClick={onPrepareEditorial}>Preparar lámina</Button>}<Button className="grow" variant="primary" onClick={onClose}>Volver a las piezas</Button></div>}>
    <div className="model-preview-layout">
      <div className="model-preview-art"><ModelIllustration model={model} view={side} body={options.body} skin={options.skin} hair={options.hair} hairColor={options.hairColor} materials={materials.fills} fabrics={fabrics}/></div>
      <div className="stack-lg">
        <div><h2 className="section-title">{model.name}</h2><p className="small muted" style={{marginTop:8}}>Así se combinan los colores y telas de las piezas.</p></div>
        {flat.views.some(view=>view.key==='espalda')&&<div className="row-wrap" role="group" aria-label="Vista del figurín"><button className="filter-chip" aria-pressed={side==='frente'} onClick={()=>setSide('frente')}>Frente</button><button className="filter-chip" aria-pressed={side==='espalda'} onClick={()=>setSide('espalda')}>Espalda</button></div>}
        {!object&&<>
          <Field label="Silueta" htmlFor="simple-model-body"><Select id="simple-model-body" value={options.body} onChange={body=>change({body:body as FigureBody})} options={Object.entries(FIGURE_BODY_LABEL).map(([value,label])=>({value,label}))}/></Field>
          <Field label="Tono de piel"><div className="model-skin-tones">{SKIN_TONES.map((skin,index)=><button key={skin} type="button" aria-label={`Tono de piel ${index+1}`} aria-pressed={skin===options.skin} style={{background:skin}} onClick={()=>change({skin})}/>)}</div></Field>
        </>}
        <p className="tiny muted">Composición 2D orientativa. La ubicación de extras y bordados se edita y se imprime desde las piezas; el figurín no calcula caída ni ajuste.</p>
        {materials.omittedPanels&&<p className="tiny muted">Los paneles de distintos materiales se muestran completos en la vista de piezas.</p>}
      </div>
    </div>
  </Sheet>;
}
