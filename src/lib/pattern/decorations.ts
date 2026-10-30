import type { PatternComponent } from './components';
import type { GeneratorResult } from './generator';
import type { MeasureCheck, Piece } from './types';
import { edgeLength, seamPolygon } from './outline';
import { formatLength } from '../units';

export const DECORATION_KINDS = ['cinta-comprada', 'olan-fruncido', 'olan-plisado', 'cinta-aplicada'] as const;
export const DECORATION_STYLES = ['encaje-floral', 'blonda', 'geometrico', 'ojales', 'flecos', 'pompones', 'serpentina', 'cinta', 'frunce', 'pliegues'] as const;
export type DecorationStyle = typeof DECORATION_STYLES[number];
export interface DecorationSettings { style: DecorationStyle; fullness?: number; pleats?: number }
export const isDecoration = (kind: string): boolean => (DECORATION_KINDS as readonly string[]).includes(kind);
export const isBoughtTrim = (kind: string): boolean => kind === 'cinta-comprada';
export function decorationRatio(component: Pick<PatternComponent, 'kind' | 'decoration'>): number {
  return component.kind === 'olan-plisado' ? 3 : component.kind === 'olan-fruncido' ? component.decoration?.fullness ?? 2 : 1;
}

function rectangle(id: string, name: string, width: number, height: number, allowance: number, qty: number): Piece {
  const nodes = [{id:'n0',x:0,y:0},{id:'n1',x:width,y:0},{id:'n2',x:width,y:height},{id:'n3',x:0,y:height}];
  return { id, name, source:'generada', nodes,
    edges:nodes.map((node,i)=>({id:`e${i}`,from:node.id,to:nodes[(i+1)%4].id,kind:'line',allowance,finish:'costura',label:['Borde de fijación','Extremo derecho','Borde inferior','Extremo izquierdo'][i]})),
    grain:{a:{x:width*.25,y:height/2},b:{x:width*.75,y:height/2}},
    cut:{qty,mirrorPairs:false,onFold:false,fabric:'contraste'},notches:[],lines:[],marks:[] };
}

/** Measured on the unfolded sewing line, after overrides; fullness never scales a picture. */
export function decorationMeasureChecks(component: PatternComponent, pieces: Piece[]): MeasureCheck[] {
  const piece = pieces.find(item=>item.id===`componente-${component.id}-cuerpo`);
  if (!piece?.edges.length) return [];
  const ys=seamPolygon(piece,.01).map(point=>point.y), ratio=decorationRatio(component);
  const title=component.name??'Decoración';
  return [
    {key:`componente-${component.id}-ancho`,label:`${title}: largo montado`,target:component.width,measured:edgeLength(piece,piece.edges[0])/ratio,tolerance:.1},
    {key:`componente-${component.id}-alto`,label:`${title}: ancho visible`,target:component.height,measured:Math.max(...ys)-Math.min(...ys),tolerance:.1}
  ];
}

/** Bought notions are a bill of materials and placement guide, never a fake lace cutting pattern. */
export function generateDecoration(component: PatternComponent, title: string, suffix: string, mountNote: string): GeneratorResult {
  const out:GeneratorResult={pieces:[],seams:[],checks:[],materials:[],steps:[],assumptions:[],notices:[]};
  const {width:w,height:h,quantity:qty,kind}=component, sa=component.allowance??10;
  const prefix=`componente-${component.id}`, ratio=decorationRatio(component), pleats=component.decoration?.pleats??6;
  if ((component.decoration && !DECORATION_STYLES.includes(component.decoration.style)) || !Number.isFinite(ratio) || (ratio<1.25 && kind==='olan-fruncido') || ratio>3 || (kind==='olan-plisado' && (!Number.isInteger(pleats)||pleats<2||pleats>24||w/pleats<5))) {
    out.notices.push({level:'error',code:'component-decoration',message:`${title}: usa un frunce entre 1,25 y 3 veces, o de 2 a 24 pliegues de al menos 5 mm terminados.`});
    return out;
  }
  const step=(key:string,heading:string,detail:string)=>out.steps.push({id:`${prefix}-${key}`,title:`${title}: ${heading}`,detail,pieces:out.pieces.map(piece=>piece.id)});
  if (isBoughtTrim(kind)) {
    const material=component.materials?.cuerpo??component.material;
    out.materials.push({id:`${prefix}-merceria`,label:`${title}${suffix}${material?.name?` · ${material.name}`:''}`,qty:`${formatLength((w+20)*qty,'cm')} de ancho ${formatLength(h,'cm')}`,
      note:`${qty} tramo(s) de ${formatLength(w+20,'cm')}: largo montado ${formatLength(w,'cm')} más 1 cm por extremo. Compra la puntilla/cinta ya fabricada; no se incluye un patrón para fabricar su encaje. El dibujo es una referencia del motivo.`});
    step('medir','mide y prepara la decoración',`Compra una tira de ancho total ${formatLength(h,'cm')}, contando flecos o pompones si los tiene. Prelava según sus cuidados. Corta ${qty} tramo(s) de ${formatLength(w+20,'cm')}. Dobla 1 cm en cada extremo y prueba el acabado en un retazo. No se añade margen al ancho comprado.`);
    step('montar','hilvana y cose la cinta',`${mountNote} El rectángulo de colocación mide ${formatLength(w,'cm')} × ${formatLength(h,'cm')}. Alinea el borde de fijación con su línea superior y cose por la banda firme del adorno, sin estirarlo. Si tiene flecos, pompones o borde festoneado, deja libre ese borde. El motivo exacto depende del producto que compres.`);
    return out;
  }
  const unfolded=w*ratio, body=rectangle(`${prefix}-cuerpo`,`${title}: tira desarrollada${suffix}`,unfolded,h,sa,qty);
  out.pieces.push(body);
  if(kind==='cinta-aplicada') {
    body.edges=body.edges.map(edge=>({...edge,finish:'dobladillo',label:`${edge.label}: doblar margen hacia dentro`}));
    step('cortar','corta la tira de tela',`Corta ${qty} tira(s) por el contorno exterior. La línea terminada mide ${formatLength(w,'cm')} × ${formatLength(h,'cm')}; sus márgenes de ${formatLength(sa,'cm')} se añaden por fuera una sola vez.`);
    step('preparar','plancha los cuatro márgenes',`Dobla cada margen hacia el revés siguiendo la línea terminada. En las esquinas, ingleta el exceso sin cortar la línea. La pieza terminada conserva ${formatLength(w,'cm')} × ${formatLength(h,'cm')}.`);
    step('montar','aplica la banda a la base',`${mountNote} Hilvana y pespuntea junto a ambos bordes largos y a los extremos. Es una banda recta aplicada: no sustituye un bies para rematar una curva.`);
  } else {
    body.edges[2]={...body.edges[2],allowance:10,finish:'dobladillo',label:'Bajo: dobladillo doble de 5 mm'};
    body.edges[1]={...body.edges[1],finish:'dobladillo',label:'Extremo derecho: doblar margen hacia dentro'};
    body.edges[3]={...body.edges[3],finish:'dobladillo',label:'Extremo izquierdo: doblar margen hacia dentro'};
    body.notes=[`Largo desplegado ${formatLength(unfolded,'cm')} → largo montado ${formatLength(w,'cm')} (${ratio}×).`,`Ancho visible ${formatLength(h,'cm')}; margen superior ${formatLength(sa,'cm')} y bajo doble de 5 mm añadidos fuera.`];
    step('cortar','corta y termina los bordes',`Corta ${qty} tira(s) de ${formatLength(unfolded,'cm')} × ${formatLength(h,'cm')} sobre la línea terminada. El contorno exterior añade ${formatLength(sa,'cm')} arriba y en cada extremo, y 1 cm abajo. Remata y dobla los extremos una vez por su línea; dobla el bajo dos veces 5 mm y pespuntea.`);
    if(kind==='olan-fruncido') {
      for(let i=1;i<4;i++) body.notches.push({id:`cuarto-${i}`,edgeId:'e0',s:unfolded*i/4,count:i===2?2:1,label:`Cuarto ${i}: situar a ${formatLength(w*i/4,'cm')} del inicio montado`});
      step('fruncir','reparte el frunce por cuartos',`Pasa dos hilvanes paralelos en el margen superior, sin cruzarlos con el pespunte definitivo. Frunce de ${formatLength(unfolded,'cm')} a ${formatLength(w,'cm')}: proporción ${ratio}×. Marca la línea de montaje en cuatro tramos de ${formatLength(w/4,'cm')} y empareja los piquetes. Anuda los hilos y mide otra vez el largo montado antes de coser.`);
    } else {
      const interval=w/pleats;
      for(let i=0;i<pleats;i++) {
        const fold=(3*i+1)*interval, under=(3*i+2)*interval, target=(3*i+3)*interval;
        body.lines.push({id:`pliegue-${i}-cara`,kind:'doblez',a:{x:fold,y:0},b:{x:fold,y:h},label:`${i+1}: llevar a marca ${i+1}`},
          {id:`pliegue-${i}-interior`,kind:'doblez',a:{x:under,y:0},b:{x:under,y:h},label:'Doblez interior'},
          {id:`pliegue-${i}-destino`,kind:'referencia',a:{x:target,y:0},b:{x:target,y:h},label:`Marca ${i+1}`});
      }
      step('plisar','forma los pliegues en una dirección',`Cada repetición tiene ${formatLength(3*interval,'cm')} desplegados y queda de ${formatLength(interval,'cm')}. Mirando el derecho, lleva cada línea «llevar a marca» hasta su marca del mismo número; la línea intermedia queda doblada hacia dentro. Repite ${pleats} veces en la misma dirección. Hilvana arriba, plancha según la tela y comprueba que el total quede en ${formatLength(w,'cm')}.`);
    }
    out.materials.push({id:`${prefix}-cinta-fijacion`,label:`${title}: cinta fina para cubrir la unión`,qty:`${formatLength((w+20)*qty,'cm')} de ancho ${formatLength(sa+5,'cm')}`,note:'Incluye 1 cm por extremo. Se cose encima del margen superior para que este no quede visible.'});
    step('montar','fija el olán y cubre la unión',`${mountNote} Sitúa la línea superior del olán en la línea superior de su rectángulo de colocación. El margen se extiende ${formatLength(sa,'cm')} por encima: reserva ese espacio sobre la base. Cose a lo largo de la línea, retira los hilvanes visibles y cubre el margen con la cinta de fijación. No aumentes el largo tirando del frunce o de los pliegues.`);
  }
  return out;
}
