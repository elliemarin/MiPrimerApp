import { useId } from 'react';
import type { CatalogModel } from '../../data/catalog';
import type { Fabric } from '../../store/types';
import { FlatArtwork, getFlat } from '../../ui/FlatArt';
import { FigureArt } from '../../ui/FigureArt';
import { figureGeometry, type FigureBody, type FigurineOptions, SKIN_TONES } from '../../lib/draw/figurine';
import { garmentComposition, garmentIllustrationView } from '../../lib/draw/garmentComposition';
import type { DesignDoc, DesignView, Fill } from '../studio/model';
import { StudioDefs, fillAttr } from '../studio/render';
import './modelIllustration.css';

/** An illustration of colours and silhouette; never a sewn-fit or drape calculation. */
export function ModelIllustration({ model, view='frente', body='recto', skin=SKIN_TONES[3], title, hair='corto', hairColor='#292724', materials={}, fabrics={} }: {
  model: CatalogModel; view?: string; body?: FigureBody; skin?: string; title?: string;
  hair?: FigurineOptions['hair']; hairColor?: string; materials?: Record<string, Fill>; fabrics?: Record<string, Fabric>;
}) {
  const unique = useId().replace(/:/g,'');
  const id = `model-${unique}`;
  const flat = getFlat(model.id, model.flat);
  // A frontal figurine cannot represent a side view by flattening it onto the torso.
  const sourceView = flat.views.find(candidate => candidate.key === (view === 'espalda' ? 'espalda' : 'frente')) ?? flat.views[0];
  const v = garmentIllustrationView(sourceView,model.flat);
  const age = model.recipients.every(recipient => ['bebe','toddler','infantil'].includes(recipient)) ? 'infantil' : 'adulto';
  const g = figureGeometry(body,age);
  const composition = garmentComposition(model.flat,v,body,age);
  const back = v.key === 'espalda';
  const materialView: DesignView = { ...v, id:`${id}-materials`, kind:v.key, label:model.name, source:{type:'plantilla',flatId:model.id,view:v.key}, zoneFills:materials };
  const materialDoc: DesignDoc = { id, views:[materialView], elements:[], guides:[], updatedAt:'' };
  const fills = Object.fromEntries(Object.entries(materials).map(([zone,fill]) => [zone,fillAttr(fill,`${id}-zf-${zone}`).fill]));
  return <svg className="model-illustration" viewBox="0 0 400 680" role="img" aria-label={title ?? `${model.name}${composition.object?'':' en figurín'}`}>
    <title>{title ?? model.name}</title>
    <desc>Ilustración de composición y color. Las medidas, extras y bordados se trabajan sobre las piezas del patrón.</desc>
    <defs>
      {composition.segments.filter(segment=>segment.clip!=='all').map(segment=><clipPath key={segment.clip} id={`${id}-${segment.clip}`}><rect x="-5000" y={segment.clip==='upper'?segment.splitY-10000:segment.splitY} width="10000" height="10000"/></clipPath>)}
    </defs>
    <StudioDefs doc={materialDoc} view={materialView} fabrics={fabrics} prefix={`${id}-`}/>
    <rect width="400" height="680" fill="#faf9f5"/>
    <ellipse cx="200" cy={composition.object?592:g.ankle+16} rx={composition.object?112:68} ry="4.5" fill="#dedfd7"/>
    {!composition.object&&<>
      <FigureArt body={body} age={age} skin={skin} hair={hair} hairColor={hairColor} back={back} idPrefix={`${id}-figure`} base={!composition.lower&&!composition.fullBody?'leggings':'shorts'}/>
    </>}
    {composition.segments.map((segment,index)=><g key={index} transform={segment.transform} data-illustration-segment={segment.clip}>
      <g clipPath={segment.clip==='all'?undefined:`url(#${id}-${segment.clip})`}><FlatArtwork view={v} prefix={`${id}-garment-${index}`} spec={model.flat} fills={fills}/></g>
    </g>)}
  </svg>;
}
