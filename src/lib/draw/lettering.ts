import fontData from '../../data/letteringFonts.json';
import { cmdsBBox, cmdsToSvg, transformCmds } from './paths';
import { parseSvgPath } from './svgpath';
import { newElement } from '../../features/studio/model';
import { uid } from '../ids';
import type { EmbroideryInsertion } from './embroideryMotifs';

export interface LetteringFont {
  id:string;name:string;family:string;sourceUrl:string;license:string;licensePath:string;sha256:string;
  glyphs:Record<string,{d:string;advance:number}>;
}
export const LETTERING_FONTS:readonly LetteringFont[]=fontData;
export const findLetteringFont=(id:string)=>LETTERING_FONTS.find(font=>font.id===id);

export interface LetteringOutline { d:string;aspect:number;unsupported:string[] }
/** Latin contours retain counters (O/B/8) and the source font's advance widths. */
export function letteringOutline(text:string,fontId:string):LetteringOutline {
  const font=findLetteringFont(fontId);
  if(!font) throw new Error('Elige una tipografía disponible.');
  const clean=text.normalize('NFC').slice(0,80);
  const unsupported=[...new Set(Array.from(clean).filter(char=>!font.glyphs[char]))];
  let advance=0;
  const commands=Array.from(clean).flatMap(char=>{
    const glyph=font.glyphs[char];
    if(!glyph) return [];
    const outline=transformCmds(parseSvgPath(glyph.d),[1,0,0,1,advance,0]);
    advance+=glyph.advance;
    return outline;
  });
  if(!commands.length) return {d:'',aspect:1,unsupported};
  const bounds=cmdsBBox(commands),width=bounds.maxX-bounds.minX,height=bounds.maxY-bounds.minY;
  if(!(width>0&&height>0)) return {d:'',aspect:1,unsupported};
  return {d:cmdsToSvg(transformCmds(commands,[100/width,0,0,100/height,-bounds.minX*100/width,-bounds.minY*100/height])),aspect:width/height,unsupported};
}

/** Height is the measured outline, not CSS font-size. Every glyph is exportable vector geometry. */
export function createLettering(text:string,fontId:string,viewId:string,x:number,y:number,heightMm=35,color='#202824'):EmbroideryInsertion {
  if(!text.trim()) throw new Error('Escribe las letras o números que quieres bordar.');
  if(Array.from(text.normalize('NFC')).length>80) throw new Error('Usa un máximo de 80 caracteres por texto.');
  if(!Number.isFinite(heightMm)||heightMm<3||heightMm>500||![x,y].every(Number.isFinite)) throw new Error('Revisa el tamaño y la posición del texto.');
  if(!/^#[0-9a-f]{6}$/i.test(color)) throw new Error('Elige un color válido para el texto.');
  const outline=letteringOutline(text,fontId);
  if(outline.unsupported.length) throw new Error(`Esta tipografía no incluye: ${outline.unsupported.join(' ')}. Usa letras latinas, números o signos de la vista previa.`);
  if(!outline.d) throw new Error('Escribe al menos una letra o número.');
  const font=findLetteringFont(fontId)!,groupId=uid('letras'),width=heightMm*outline.aspect;
  const name=`${text.trim()} · ${font.name}`;
  const body=newElement(viewId,{id:`${groupId}-contorno`,parentId:groupId,kind:'trazo',name,x,y,w:width,h:heightMm,vectorPath:outline.d,
    fill:{type:'color',color},stroke:null,technique:'bordado',edge:'na',allowance:0,backing:'desprendible'});
  const group=newElement(viewId,{id:groupId,kind:'grupo',name,x,y,w:width,h:heightMm,fill:{type:'ninguno'},stroke:null,technique:'bordado',
    embroidery:{kind:'lettering',fontId,text:text.normalize('NFC').trim()}
  });
  return {elements:[body,group],groupId,width,height:heightMm};
}
