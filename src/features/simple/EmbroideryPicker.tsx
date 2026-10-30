import { useMemo, useState } from 'react';
import { EMBROIDERY_MOTIFS, EMBROIDERY_CATEGORY_LABEL, filterEmbroideryMotifs, type EmbroideryCategory } from '../../data/embroideryMotifs';
import { LETTERING_FONTS, letteringOutline } from '../../lib/draw/lettering';
import { Button, Empty, Field, LengthInput, Notice, Segmented, Select, Sheet, TextInput } from '../../ui/components';
import './embroideryPicker.css';

export type EmbroideryChoice =
  | { kind:'motif';id:string;widthMm:number }
  | { kind:'text';text:string;fontId:string;color:string;heightMm:number };

export function EmbroideryPicker({onPick,onClose}:{onPick:(choice:EmbroideryChoice)=>void;onClose:()=>void}) {
  const [tab,setTab]=useState<'figuras'|'texto'>('figuras');
  const [query,setQuery]=useState('');
  const [category,setCategory]=useState<EmbroideryCategory|'todas'>('todas');
  const [limit,setLimit]=useState(48);
  const [width,setWidth]=useState<number|undefined>(70);
  const [text,setText]=useState('Abc 123');
  const [fontId,setFontId]=useState('clara');
  const [color,setColor]=useState('#202824');
  const [height,setHeight]=useState<number|undefined>(35);
  const list=useMemo(()=>filterEmbroideryMotifs(query,category),[query,category]);
  const outline=useMemo(()=>letteringOutline(text,fontId),[text,fontId]);
  const valid=!!outline.d&&!outline.unsupported.length&&!!text.trim()&&height!==undefined&&height>=3&&height<=500;
  return <Sheet title="Bordados y letras" onClose={onClose} wide>
    <div className="embroidery-picker stack">
      <Segmented label="Tipo de bordado" value={tab} onChange={setTab} options={[{value:'figuras',label:'Figuras'},{value:'texto',label:'Letras y números'}]} />
      {tab==='figuras'?<>
        <TextInput value={query} onChange={value=>{setQuery(value);setLimit(48);}} placeholder="Busca: abeja, hongos, flores, gato…" aria-label="Buscar bordados" />
        <div className="embroidery-picker-fields">
          <Field label="Colección" htmlFor="embroidery-category"><Select id="embroidery-category" value={category} onChange={value=>{setCategory(value);setLimit(48);}} options={[{value:'todas',label:'Todas'},...Object.entries(EMBROIDERY_CATEGORY_LABEL).map(([value,label])=>({value:value as EmbroideryCategory,label}))]} /></Field>
          <Field label="Ancho inicial" htmlFor="embroidery-width"><LengthInput id="embroidery-width" mm={width} min={5} max={1000} onChange={setWidth} /></Field>
        </div>
        <p className="tiny muted">{list.length} de {EMBROIDERY_MOTIFS.length} diseños y composiciones. Elige uno y arrástralo sobre tu prenda; conserva sus colores y puedes cambiar el tamaño.</p>
        {!list.length&&<Empty icon="search" title="Sin bordados" body="Prueba otra palabra o elige Todas las colecciones." />}
        <div className="embroidery-motif-grid">
          {list.slice(0,limit).map(drawing=><button key={drawing.id} className="embroidery-motif" onClick={()=>onPick({kind:'motif',id:drawing.id,widthMm:width??70})} disabled={width===undefined||width<5||width>1000} aria-label={`Agregar ${drawing.name.toLowerCase()}`}>
            <svg viewBox="-3 -3 106 106" aria-hidden="true">{drawing.parts.map((layer,index)=><path key={index} d={layer.d} fill={layer.color} />)}</svg>
            <span>{drawing.name}</span>
            {drawing.composition&&<small>Composición</small>}
          </button>)}
        </div>
        {limit<list.length&&<Button block onClick={()=>setLimit(limit+48)}>Ver más bordados ({list.length-limit})</Button>}
      </>:<>
        <Field label="Letras o números" htmlFor="embroidery-text"><TextInput id="embroidery-text" aria-label="Texto para bordar" value={text} onChange={setText} maxLength={80} placeholder="Tu nombre, iniciales o número" /></Field>
        <Field label="Tipografía">
          <div className="embroidery-font-grid" role="group" aria-label="Tipografía del bordado">
            {LETTERING_FONTS.map(font=>{
              const sample=letteringOutline('Aa 28',font.id);
              return <button key={font.id} aria-pressed={fontId===font.id} onClick={()=>setFontId(font.id)}>
                <svg viewBox={`-4 -6 ${100*sample.aspect+8} 112`} aria-hidden="true"><path d={sample.d} transform={`scale(${sample.aspect} 1)`} fill="currentColor" /></svg>
                <span>{font.name}</span>
              </button>;
            })}
          </div>
        </Field>
        <div className="embroidery-picker-fields">
          <Field label="Alto de las letras" htmlFor="embroidery-letter-height"><LengthInput id="embroidery-letter-height" mm={height} min={3} max={500} onChange={setHeight} /></Field>
          <Field label="Color" htmlFor="embroidery-letter-color"><input className="embroidery-color" id="embroidery-letter-color" aria-label="Color del texto bordado" type="color" value={color} onChange={event=>setColor(event.target.value)} /></Field>
        </div>
        <div className="embroidery-text-preview" aria-label="Vista previa del texto bordado">
          {outline.d&&<svg viewBox={`-4 -6 ${100*outline.aspect+8} 112`} role="img" aria-label={text}><path d={outline.d} transform={`scale(${outline.aspect} 1)`} fill={color} /></svg>}
        </div>
        {outline.unsupported.length>0&&<Notice tone="warn">Esta tipografía no incluye: {outline.unsupported.join(' ')}. Usa letras latinas, números y signos de la vista previa.</Notice>}
        <Button variant="primary" block disabled={!valid} onClick={()=>onPick({kind:'text',text:text.trim(),fontId,color,heightMm:height??35})}>Agregar texto</Button>
        <p className="tiny muted">Las letras conservan sus contornos reales, incluidos los huecos de B, O y 8. El alto indicado corresponde al dibujo completo, con acentos y partes inferiores.</p>
      </>}
      <p className="tiny muted">Son dibujos para transferir o digitalizar. Para bordar a máquina necesitas un archivo de puntadas y una prueba sobre retazo.</p>
    </div>
  </Sheet>;
}
