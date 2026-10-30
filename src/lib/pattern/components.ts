import type { Pt } from '../geom/vec';
import { distToSegment, pointInPolygon, segIntersect } from '../geom/vec';
import { formatLength } from '../units';
import type { GeneratorResult } from './generator';
import { edgeLength, seamPolygon } from './outline';
import type { MaterialNeed, MeasureCheck, PEdge, Piece, SeamRelation } from './types';
import { DECORATION_KINDS, decorationMeasureChecks, generateDecoration, isDecoration, type DecorationSettings } from './decorations';

export const COMPONENT_KINDS = ['bolsillo-parche', 'bolsillo-punta', 'bolsillo-redondeado', 'bolsillo-solapa-boton', 'bolsillo-solapa-velcro', 'bolsillo-cierre', 'bolsillo-cargo', 'porta-herramientas', 'trabilla', 'porta-martillo', 'porta-telefono-camara', ...DECORATION_KINDS] as const;
export type ComponentKind = typeof COMPONENT_KINDS[number];
export interface ComponentMaterial { fabricId?: string; name: string; color?: string }
export interface CameraWindow { left: number; top: number; width: number; height: number }

/** Apertura terminada, medida sobre la cara exterior. No infiere cámaras desde una fotografía. */
export function cameraWindowFor(component: Pick<PatternComponent, 'width' | 'height' | 'camera'>): CameraWindow {
  return component.camera ?? { left: component.width * .175, top: component.height * .1, width: component.width * .65, height: component.height * .27 };
}

/** Finished dimensions in mm. For loops, height is the strip length before mounting. */
export interface PatternComponent {
  id: string;
  presetId?: string;
  /** Optional preset/user name, retained in the printed cutting list and guide. */
  name?: string;
  kind: ComponentKind;
  width: number;
  height: number;
  quantity: number;
  depth?: number;
  allowance?: number;
  /** Organizers have 1–8 equal channels. The width is the full panel width. */
  channels?: number;
  /** Finished clear camera aperture; measured on the real device, in mm. */
  camera?: CameraWindow;
  /** Decoration construction and motif. Width is mounted length; height is visible band/drop. */
  decoration?: DecorationSettings;
  material?: ComponentMaterial;
  /** Material by stable generated piece role: cuerpo, solapa, fuelle, respaldo, vista. */
  materials?: Record<string, ComponentMaterial>;
  /** Additional bought hardware specific to an original preset (e.g. a D-ring). */
  materialNeeds?: MaterialNeed[];
  /** x/y are the centre in local piece/view mm. Only pieceId defines exact placement. */
  placement?: { pieceId?: string; viewId?: string; x: number; y: number; label?: string };
}

const names: Record<ComponentKind, string> = {
  'bolsillo-parche': 'Bolsillo de parche', 'bolsillo-punta': 'Bolsillo con punta', 'bolsillo-redondeado': 'Bolsillo redondeado',
  'bolsillo-solapa-boton': 'Bolsillo con solapa y botón', 'bolsillo-solapa-velcro': 'Bolsillo con solapa y velcro',
  'bolsillo-cierre': 'Bolsillo con cierre', 'bolsillo-cargo': 'Bolsillo cargo de fuelle',
  'porta-herramientas': 'Bolsillo portaherramientas', 'trabilla': 'Trabilla textil', 'porta-martillo': 'Lazo portamartillo',
  'porta-telefono-camara': 'Portacelular con ventana para cámara',
  'cinta-comprada': 'Decoración de mercería', 'olan-fruncido': 'Olán fruncido', 'olan-plisado': 'Olán plisado', 'cinta-aplicada': 'Banda de tela aplicada'
};

export interface ComponentGeneration extends GeneratorResult { basePieces: Piece[] }

function polygon(id: string, name: string, points: Pt[], sa: number, qty: number): Piece {
  const nodes = points.map((point, i) => ({ ...point, id: `n${i}` }));
  const maxX = Math.max(...points.map(p => p.x)), maxY = Math.max(...points.map(p => p.y));
  return { id, name, source: 'generada', nodes,
    edges: nodes.map((node, i): PEdge => ({ id: `e${i}`, label: i === 0 ? 'Boca superior' : `Contorno ${i}`, from: node.id, to: nodes[(i + 1) % nodes.length].id, kind: 'line', allowance: sa, finish: 'costura' })),
    grain: { a: { x: maxX / 2, y: maxY * .25 }, b: { x: maxX / 2, y: maxY * .75 } },
    cut: { qty, mirrorPairs: false, onFold: false, fabric: 'principal' }, notches: [], lines: [], marks: [] };
}
const rect = (id: string, name: string, w: number, h: number, sa: number, qty: number) => polygon(id, name, [{ x: 0, y: 0 }, { x: w, y: 0 }, { x: w, y: h }, { x: 0, y: h }], sa, qty);
function equal(id: string, label: string, a: Piece, ae: string[], b: Piece, be: string[]): SeamRelation {
  return { id, label, kind: 'igual', a: [{ pieceId: a.id, edgeIds: ae }], b: [{ pieceId: b.id, edgeIds: be }], ratioMin: .999, ratioMax: 1.001, tolerance: .1 };
}
function hemMouth(piece: Piece) {
  piece.edges[0] = { ...piece.edges[0], allowance: 20, finish: 'dobladillo', label: 'Boca: dobladillo doble' };
}

/** Re-read the physical sewing line after manual node/control-point overrides. */
export function componentMeasureChecks(components: PatternComponent[], pieces: Piece[]): MeasureCheck[] {
  return components.flatMap(component=>{
    if(isDecoration(component.kind)) return decorationMeasureChecks(component,pieces);
    const prefix=`componente-${component.id}`;
    const body=pieces.find(piece=>piece.id===`${prefix}-cuerpo`);
    if(!body?.edges.length)return [];
    const title=component.name?.trim().slice(0,80)||names[component.kind];
    const loop=component.kind==='trabilla'||component.kind==='porta-martillo';
    const contour=seamPolygon(body,.01),ys=contour.map(point=>point.y);
    const checks:MeasureCheck[]=[{key:`${prefix}-ancho`,label:`${title}: ancho terminado`,target:component.width,measured:edgeLength(body,body.edges[0])/(loop?2:1),tolerance:.1},
      {key:`${prefix}-alto`,label:`${title}: ${loop?'largo de tira':'alto terminado'}`,target:component.height,measured:Math.max(...ys)-Math.min(...ys),tolerance:.1}];
    const parts:{role:string;label:string;width:number;height:number}[]=[
      {role:'solapa',label:'solapa',width:component.width,height:Math.min(75,Math.max(35,component.height*.28))},
      {role:'fuelle',label:'fuelle',width:2*component.height+component.width,height:component.depth??30},
      {role:'respaldo',label:'respaldo',width:component.width,height:component.height},
      {role:'vista',label:'vista del cierre',width:component.width,height:25}
    ];
    if(component.kind==='porta-telefono-camara') {
      const aperture=cameraWindowFor(component);
      parts.push({role:'marco-superior',label:'banda superior de cámara',width:component.width,height:aperture.top},
        {role:'marco-izq',label:'banda izquierda de cámara',width:aperture.left,height:aperture.height},
        {role:'marco-der',label:'banda derecha de cámara',width:component.width-aperture.left-aperture.width,height:aperture.height},
        {role:'frente-inferior',label:'frente inferior de cámara',width:component.width,height:component.height-aperture.top-aperture.height});
    }
    for(const part of parts) {
      const piece=pieces.find(piece=>piece.id===`${prefix}-${part.role}`);
      if(!piece?.edges.length)continue;
      const partContour=seamPolygon(piece,.01),partYs=partContour.map(point=>point.y),partXs=partContour.map(point=>point.x);
      checks.push({key:`${prefix}-${part.role}-ancho`,label:`${title}: ancho de ${part.label}`,target:part.width,measured:Math.max(...partXs)-Math.min(...partXs),tolerance:.1},
        {key:`${prefix}-${part.role}-alto`,label:`${title}: alto de ${part.label}`,target:part.height,measured:Math.max(...partYs)-Math.min(...partYs),tolerance:.1});
    }
    return checks;
  });
}

/** Adds independent sewable modules; never changes body ease or stretches a drawing. */
export function generateComponents(components: PatternComponent[], sourcePieces: Piece[] = []): ComponentGeneration {
  const out: ComponentGeneration = { basePieces: structuredClone(sourcePieces), pieces: [], seams: [], checks: [], materials: [], steps: [], assumptions: [], notices: [] };
  const seen = new Set<string>();
  const error = (message: string, code = 'component-invalid') => out.notices.push({ level: 'error', code, message });
  for (const component of components) {
    const { id, kind, width: w, height: h, quantity: qty } = component;
    if (!id || !/^[a-zA-Z0-9_-]{1,100}$/.test(id) || seen.has(id)) { error('Cada complemento necesita un identificador único válido.', 'component-id'); continue; }
    seen.add(id);
    if (!COMPONENT_KINDS.includes(kind)) { error('El tipo de complemento no está disponible.', 'component-kind'); continue; }
    const sa = component.allowance ?? 10, d = component.depth ?? 30;
    const loop = kind === 'trabilla' || kind === 'porta-martillo';
    const decoration=isDecoration(kind);
    const minWidth = decoration ? 50 : loop ? 10 : 40, minHeight = decoration ? 10 : 50;
    if (![w, h, qty, sa, d].every(Number.isFinite) || w < minWidth || w > (decoration ? 2000 : 600) || h < minHeight || h > (decoration ? 400 : 800) || !Number.isInteger(qty) || qty < 1 || qty > 8 || sa < 3 || sa > 20 || (kind === 'bolsillo-cargo' && (d < 15 || d > 100 || d > Math.min(w,h) / 2))) {
      error(`${names[kind]}: revisa ancho, alto, cantidad y márgenes${kind === 'bolsillo-cargo' ? '; el fuelle debe medir entre 1,5 y 10 cm y no superar la mitad del lado menor' : ''}.`); continue;
    }
    if (component.placement && (![component.placement.x, component.placement.y].every(Number.isFinite))) { error(`${names[kind]}: la posición no es válida.`, 'component-placement'); continue; }
    const channels=component.channels??3;
    if(kind==='porta-herramientas' && (!Number.isInteger(channels)||channels<1||channels>8||w/channels<8)) {
      error('El organizador necesita entre 1 y 8 canales, con al menos 8 mm terminados por canal.', 'component-channels'); continue;
    }
    const aperture=cameraWindowFor(component);
    if(kind==='porta-telefono-camara' && (![aperture.left,aperture.top,aperture.width,aperture.height].every(Number.isFinite)||aperture.left<12||aperture.top<12||aperture.width<10||aperture.height<10||aperture.left+aperture.width>w-12||aperture.top+aperture.height>h-15)) {
      error('La ventana de cámara debe dejar bandas laterales y superior de al menos 12 mm, base de 15 mm y una abertura de al menos 10 × 10 mm. Mide las cámaras del teléfono real.', 'component-camera'); continue;
    }
    const prefix = `componente-${id}`, title = component.name?.trim().slice(0,80) || names[kind];
    for(const need of component.materialNeeds ?? []) out.materials.push({...need,id:`${prefix}-material-${need.id}`});
    const label = component.placement?.label?.trim();
    const suffix = label ? ` · ${label.slice(0,60)}` : '';
    const pieces: Piece[] = [], seams: SeamRelation[] = [];
    const add = (piece: Piece) => { pieces.push(piece); return piece; };
    const step = (key: string, text: string, detail: string, ids = pieces.map(piece => piece.id), seamIds?: string[]) => out.steps.push({ id: `${prefix}-${key}`, title: `${title}: ${text}`, detail, pieces: ids, ...(seamIds?.length ? { seams: seamIds } : {}) });
    let body: Piece;
    const mountNote = component.placement?.pieceId ? `Coloca el complemento sobre las marcas de la pieza «${component.placement.pieceId}».` : `Ubicación orientativa${label ? `: ${label}` : ''}. Hilvana y prueba sobre la prenda; marca su posición antes de cerrar las costuras de la base.`;

    if(decoration) {
      const generated=generateDecoration(component,title,suffix,mountNote);
      if(generated.notices.some(notice=>notice.level==='error')) { out.notices.push(...generated.notices); continue; }
      pieces.push(...generated.pieces); seams.push(...generated.seams);
      out.materials.push(...generated.materials); out.steps.push(...generated.steps); out.assumptions.push(...generated.assumptions); out.notices.push(...generated.notices);
    } else if (loop) {
      body = add(rect(`${prefix}-cuerpo`, `${title}: tira${suffix}`, 2*w, h, sa, qty));
      body.lines.push({ id: 'doblez-largo', kind: 'doblez', a: { x: w, y: 0 }, b: { x: w, y: h }, label: 'Doblar a lo largo' });
      for (const y of [20,h-20]) body.lines.push({ id: `fijacion-${y === 20 ? 'inicio' : 'fin'}`, kind: 'colocacion', a: { x: 0, y }, b: { x: 2*w, y }, label: 'Reserva de fijación de 2 cm' });
      seams.push(equal(`${prefix}-tubo`, `${title}: lados largos del tubo`, body, ['e1'], body, ['e3']));
      step('cortar', 'corta la tira', `Corta ${qty} tira(s). El ancho del patrón es el doble del ancho plano terminado; los márgenes están añadidos fuera.`);
      step('formar', 'cose y voltea', 'Dobla la tira a lo largo, derecho con derecho. Cose por las líneas de costura de los lados largos. Voltea, plancha y mete los márgenes cortos hacia dentro siguiendo sus líneas.', undefined, [seams[0].id]);
      step('montar', 'prueba el aro y fija sus extremos', `${mountNote} El largo de ${formatLength(h,'cm')} incluye dos reservas de 2 cm: la parte libre antes de arquear mide ${formatLength(h-40,'cm')}. Prueba con la herramienta o cinturón, hilvana ambos extremos y fija cada reserva con pespunte en caja y cruz. El espacio interior depende de la herramienta y del arco; no se supone una carga certificada.`);
    } else if(kind==='porta-telefono-camara') {
      body=add(rect(`${prefix}-cuerpo`,`${title}: respaldo${suffix}`,w,h,sa,qty));
      hemMouth(body);
      const {left:l,top:t,width:cw,height:ch}=aperture, r=w-l-cw, bottom=h-t-ch;
      // Four separately cut frame pieces form a true opening; no filled rectangle
      // is exported as if it were a cutting template with an unsupported hole.
      const upper=add(polygon(`${prefix}-marco-superior`,`${title}: banda superior${suffix}`,[{x:0,y:0},{x:w,y:0},{x:w,y:t},{x:l+cw,y:t},{x:l,y:t},{x:0,y:t}],sa,qty));
      hemMouth(upper);
      upper.edges[0]={...upper.edges[0],allowance:12,label:'Entrada del marco: dobladillo doble de 6 mm'};
      const lower=add(polygon(`${prefix}-frente-inferior`,`${title}: frente inferior${suffix}`,[{x:0,y:0},{x:l,y:0},{x:l+cw,y:0},{x:w,y:0},{x:w,y:bottom},{x:0,y:bottom}],sa,qty));
      const left=add(rect(`${prefix}-marco-izq`,`${title}: banda izquierda${suffix}`,l,ch,sa,qty));
      const right=add(rect(`${prefix}-marco-der`,`${title}: banda derecha${suffix}`,r,ch,sa,qty));
      // The four window edges are bound, not folded into the clear opening.
      for(const [piece,index]of [[upper,3],[lower,1],[left,1],[right,3]] as const) piece.edges[index]={...piece.edges[index],allowance:0,finish:'orillo',label:'Ventana: rematar con bies sin reducir la abertura'};
      seams.push(equal(`${prefix}-arriba-izq`,`${title}: banda superior con lateral izquierdo`,upper,['e4'],left,['e0']),
        equal(`${prefix}-arriba-der`,`${title}: banda superior con lateral derecho`,upper,['e2'],right,['e0']),
        equal(`${prefix}-abajo-izq`,`${title}: lateral izquierdo con frente inferior`,left,['e2'],lower,['e0']),
        equal(`${prefix}-abajo-der`,`${title}: lateral derecho con frente inferior`,right,['e2'],lower,['e2']));
      for(const [index,seam]of seams.entries()) for(const side of [...seam.a,...seam.b]) {
        const piece=pieces.find(candidate=>candidate.id===side.pieceId)!;
        const edge=piece.edges.find(candidate=>candidate.id===side.edgeIds[0])!;
        piece.notches.push({id:`marco-${index+1}`,edgeId:edge.id,s:edgeLength(piece,edge)/2,count:index<2?1:2,label:`Unión de marco ${index+1}`});
      }
      const around=2*(cw+ch)+80;
      out.materials.push({id:`${prefix}-bies`,label:`${title}: bies flexible de 20 mm abierto`,qty:`${formatLength(around*qty,'cm')}`,note:'Incluye 8 cm por ventana para esquinas y uniones. El bies abraza el canto; no debe tapar las cámaras.'},
        {id:`${prefix}-refuerzo`,label:`${title}: entretela para las bandas de la cámara`,qty:`${qty} juego(s) de bandas`,note:'Refuerza por el revés sin cubrir el hueco y prueba con el teléfono real antes de fijar.'});
      body.notes=[`${formatLength(w,'cm')} × ${formatLength(h,'cm')} terminados. Cámara orientada hacia el exterior.`,`Abertura: ${formatLength(cw,'cm')} × ${formatLength(ch,'cm')}, a ${formatLength(l,'cm')} del lado izquierdo y ${formatLength(t,'cm')} de arriba.`, 'No cubras ópticas, flash ni micrófono. La ventana no se deduce automáticamente del modelo de teléfono.'];
      step('cortar','mide el teléfono y corta sus cinco piezas',`Corta ${qty} respaldo(s), banda(s) superior(es), lateral(es) izquierdo(s), lateral(es) derecho(s) y frente(s) inferior(es). Las medidas terminadas son ${formatLength(w,'cm')} × ${formatLength(h,'cm')}. La cámara queda hacia fuera. Antes de cortar, confirma con el teléfono y su funda la abertura de ${formatLength(cw,'cm')} × ${formatLength(ch,'cm')} situada a ${formatLength(l,'cm')} de la izquierda y ${formatLength(t,'cm')} del borde superior.`,pieces.map(piece=>piece.id));
      step('reforzar','refuerza y termina las entradas','Aplica entretela al revés de las bandas sin encogerlas. Termina la entrada superior del respaldo y de la banda superior siguiendo sus líneas de dobladillo.',[body.id,upper.id]);
      step('marco','arma el frente alrededor de la cámara','Une la banda superior a ambos laterales por los tramos marcados, derecho con derecho; une abajo los laterales con los extremos del frente inferior. No unas los bordes de la abertura. Plancha los márgenes abiertos y termina sus cantos.',[upper.id,left.id,right.id,lower.id],seams.map(seam=>seam.id));
      step('bies','remata la abertura con bies','Rodea con el bies los cuatro cantos marcados Ventana. Ingleta las esquinas y sujeta el bies abrazando el borde; no lo extiendas hacia dentro de la abertura. Verifica de nuevo las medidas libres con el teléfono y prueba que no tapa cámaras, flash ni micrófono.',[upper.id,left.id,right.id,lower.id]);
      step('montar','fija el respaldo y el frente a la prenda',`${mountNote} Sujeta primero el respaldo a la base por sus márgenes. En bandas estrechas, rebaja únicamente los márgenes exteriores a 4 mm después de transferir sus líneas terminadas; no recortes el cuerpo de la banda. Plancha esos márgenes hacia dentro; hilvana y pespuntea laterales y fondo sobre el respaldo, dejando abierta la entrada superior. No atravieses ambas caras con costuras adicionales que atrapen el teléfono. Refuerza las bocas y prueba el acceso antes de cerrar las costuras de la prenda.`,pieces.map(piece=>piece.id));
    } else {
      if (kind === 'bolsillo-punta') body = add(polygon(`${prefix}-cuerpo`, `${title}: cuerpo${suffix}`, [{x:0,y:0},{x:w,y:0},{x:w,y:h*.75},{x:w/2,y:h},{x:0,y:h*.75}],sa,qty));
      else body = add(rect(`${prefix}-cuerpo`, `${title}: cuerpo${suffix}`, w,h,sa,qty));
      if (kind === 'bolsillo-redondeado') {
        const radius=Math.min(w*.2,h*.2,40);
        body.nodes=[{id:'n0',x:0,y:0},{id:'n1',x:w,y:0},{id:'n2',x:w,y:h-radius},{id:'n3',x:w-radius,y:h},{id:'n4',x:radius,y:h},{id:'n5',x:0,y:h-radius}];
        body.edges=body.nodes.map((node,i):PEdge=>({id:`e${i}`,label:i===0?'Boca superior':`Contorno ${i}`,from:node.id,to:body.nodes[(i+1)%6].id,kind:'line',allowance:sa,finish:'costura'}));
        const k=.5522847498307936;
        body.edges[2]={...body.edges[2],kind:'cubic',c1:{x:w,y:h-radius+k*radius},c2:{x:w-radius+k*radius,y:h}};
        body.edges[4]={...body.edges[4],kind:'cubic',c1:{x:radius-k*radius,y:h},c2:{x:0,y:h-radius+k*radius}};
      }
      if (kind !== 'bolsillo-cierre') hemMouth(body);
      const dimensions=`${formatLength(w,'cm')} de ancho × ${formatLength(h,'cm')} de alto terminado${kind === 'bolsillo-cargo' ? `; fuelle de ${formatLength(d,'cm')}` : ''}.`;
      body.notes=[dimensions,`Cortar ${qty}; márgenes incluidos una sola vez.`,...(label?[`Colocación: ${label}.`]:[])];
      step('cortar','corta y transfiere marcas',`${dimensions} Los contornos punteados indican la línea terminada; corta por el contorno exterior. Conserva el hilo. Borda o aplica decoraciones antes de armar el bolsillo.`,[body.id]);

      if (kind === 'bolsillo-cierre') {
        const back=add(rect(`${prefix}-respaldo`,`${title}: respaldo${suffix}`,w,h,sa,qty)); back.cut.fabric='forro';
        const facing=add(rect(`${prefix}-vista`,`${title}: vistas del cierre${suffix}`,w,25,sa,2*qty)); facing.cut.fabric='forro';
        seams.push(equal(`${prefix}-vistas`,`${title}: cada vista con una boca`,body,['e0'],facing,['e0']),equal(`${prefix}-respaldo`,`${title}: costados y fondo`,body,['e1','e2','e3'],back,['e1','e2','e3']));
        out.materials.push({id:`${prefix}-cierre`,label:`${title}${suffix}: cierre de espiral flexible`,qty:`${qty} de largo útil mínimo ${formatLength(w,'cm')}`,note:'Usa un cierre más largo para mantener los topes fuera de las costuras; asegura los dientes antes de recortar.'});
        step('vistas','corta el respaldo y las vistas',`Por bolsillo corta un respaldo y dos vistas de forro. Remata el borde libre y los extremos de cada vista. Cada vista mide 2,5 cm de ancho terminado; los márgenes se añaden por fuera.`,[back.id,facing.id]);
        step('cierre','coloca el cierre','Coloca una cinta del cierre entre el borde superior del cuerpo y una vista, derecho con derecho; cose por la línea superior marcada en el patrón. Repite con el respaldo y la otra vista. Abre las caras, lleva las vistas hacia dentro y pespuntea lejos de los dientes.',pieces.map(piece=>piece.id),[`${prefix}-vistas`]);
        step('bolsa','cierra el bolsillo independiente','Abre el cierre a la mitad. Junta cuerpo y respaldo derecho con derecho; cose costados y fondo sin atrapar las vistas sueltas ni los topes. Remata los márgenes, voltea por el cierre y plancha.',[body.id,back.id],[`${prefix}-respaldo`]);
        step('montar','fija el bolsillo a la base',`${mountNote} Sujeta únicamente el respaldo a la base con costura a mano por sus márgenes o un pespunte previo antes de cerrar el bolsillo. Mantén libre la boca con cierre. No atravieses ambas caras con la costura de fijación: cerrarías su capacidad.`,[body.id,back.id]);
      } else {
        if (kind === 'bolsillo-cargo') {
          const u=2*h+w;
          const gusset=add(rect(`${prefix}-fuelle`,`${title}: tira de fuelle${suffix}`,u,d,sa,qty));
          gusset.edges[1]={...gusset.edges[1],allowance:20,finish:'dobladillo',label:'Extremo superior: dobladillo doble'};
          gusset.edges[3]={...gusset.edges[3],allowance:20,finish:'dobladillo',label:'Extremo superior: dobladillo doble'};
          for(const [i,x]of [h,h+w].entries()) {
            gusset.lines.push({id:`esquina-${i}`,kind:'referencia',a:{x,y:0},b:{x,y:d},label:`Esquina inferior ${i+1}`});
            gusset.notches.push({id:`esquina-${i}`,edgeId:'e0',s:x,count:1,label:`Esquina ${i+1}`});
          }
          body.notches=[{id:'esquina-1',edgeId:'e1',s:h,count:1,label:'Esquina 1'},{id:'esquina-2',edgeId:'e2',s:w,count:1,label:'Esquina 2'}];
          seams.push(equal(`${prefix}-fuelle`,`${title}: fuelle con costados y fondo`,body,['e1','e2','e3'],gusset,['e0']));
          step('fuelle','corta y prepara el fuelle',`Corta ${qty} tira(s) de ${formatLength(u,'cm')} × ${formatLength(d,'cm')} terminados. Dobla el margen indicado de cada extremo en dos mitades; termina también la boca del cuerpo con su dobladillo doble.`,[body.id,gusset.id]);
          step('unir-fuelle','une el fuelle al cuerpo',`Une derecho con derecho el borde largo marcado del fuelle al costado, fondo y otro costado del cuerpo. Sus piquetes de ${formatLength(h,'cm')} y ${formatLength(h+w,'cm')} coinciden con las esquinas inferiores. Pivota exactamente en la línea de costura; haz piquetes solo en el margen del fuelle y termina los márgenes.`,[body.id,gusset.id],[`${prefix}-fuelle`]);
          step('montar','fija el fuelle a la base',`${mountNote} Plancha hacia dentro el margen del borde largo libre del fuelle. Hilvana ese borde a la base siguiendo una U del mismo ancho y alto del cuerpo, y pespuntea sin atrapar la cara del bolsillo. Refuerza los extremos superiores.`,[body.id,gusset.id]);
        } else {
          step('preparar','termina boca y contorno',`Dobla el margen superior indicado en dos mitades iguales y pespuntea. Plancha los demás márgenes hacia el revés siguiendo la línea terminada de cada borde.${kind==='bolsillo-redondeado'?' Embebe el margen de las curvas con una puntada larga y una plantilla de cartón; recorta el exceso sin alcanzar la línea.':''}`,[body.id]);
          step('montar','cose el bolsillo a la base',`${mountNote} Pespuntea costados y fondo dejando la boca abierta. Refuerza las dos esquinas de la boca.${qty>1?' Repite la colocación en cada copia; si la base es un par simétrico, transfiere las marcas en espejo.':''}`,[body.id]);
        }
        if (kind === 'porta-herramientas') {
          for(let i=1;i<channels;i++) {const x=w*i/channels;body.lines.push({id:`canal-${i-1}`,kind:'pespunte',a:{x,y:0},b:{x,y:h},label:`Canal de ${formatLength(w/channels,'cm')}`});}
          step('canales',`forma ${channels} ${channels===1?'canal':'canales'}`,`Con el bolsillo ya fijado, cose las ${Math.max(0,channels-1)} divisiones marcadas a través del bolsillo y la base. Se forman ${channels} ${channels===1?'canal':'canales'} de ${formatLength(w/channels,'cm')} antes del grosor de la herramienta. Refuerza la entrada de cada división. Prueba primero con la herramienta y ajusta el ancho antes de cortar.`,[body.id]);
        }
        if (['bolsillo-solapa-boton','bolsillo-solapa-velcro','bolsillo-cargo'].includes(kind)) {
          const flapHeight=Math.min(75,Math.max(35,h*.28));
          const flap=add(rect(`${prefix}-solapa`,`${title}: solapa${suffix}`,w,flapHeight,sa,2*qty));
          seams.push(equal(`${prefix}-solapa`,`${title}: caras de la solapa`,flap,['e1','e2','e3'],flap,['e1','e2','e3']));
          const button=kind !== 'bolsillo-solapa-velcro';
          if(button) {flap.marks.push({id:'ojal',kind:'ojal',at:{x:w/2,y:flapHeight-15},label:'Ojal: ajustar al botón real'}); body.marks.push({id:'boton',kind:'boton',at:{x:w/2,y:flapHeight-15},label:'Botón: confirmar con solapa montada'});}
          out.materials.push({id:`${prefix}-cierre`,label:`${title}${suffix}: ${button?'botón de 12–18 mm':'velcro suave de 20 mm'}`,qty:button?`${qty} botón(es)`: `${qty} juego(s) de ${formatLength(Math.min(50,w/2),'cm')}`,note:button?'Haz el ojal según el botón real; confirma la ubicación después de montar.':'Cose las dos mitades después de probar la solapa; el velcro no cambia el margen de la pieza.'});
          step('solapa','prepara la solapa',`Corta ${2*qty} caras de solapa. Junta cada par derecho con derecho, cose costados y borde inferior, rebaja esquinas y voltea por arriba. Termina juntos los márgenes superiores.`,[flap.id],[`${prefix}-solapa`]);
          step('fijar-solapa','monta y cierra la solapa',`Con el bolsillo ya montado, coloca la solapa levantada, derecho contra la base, con su línea superior a la altura de la boca. Cose por la línea superior con los márgenes hacia arriba; bájala para cubrir la boca y pespuntea por arriba para encerrar los márgenes. ${button?'Haz el ojal marcado en la cara exterior y cose el botón después de probar el cierre.':'Cose las dos mitades del velcro en la cara interior de la solapa y la cara exterior del bolsillo, comprobando que coincidan.'}`,[body.id,flap.id]);
        }
      }
    }
    out.checks.push(...componentMeasureChecks([component],pieces));
    for(const piece of pieces) {
      const role=piece.id.slice(prefix.length+1);
      const material=component.materials?.[role]??component.material;
      if(material?.name?.trim()) {
        const name=material.name.trim().slice(0,80);
        piece.name+=` · ${name}`;
        piece.notes=[...(piece.notes??[]),`Material de ${role}: ${name}${material.color?` (${material.color})`:''}.`];
      }
    }
    out.pieces.push(...pieces); out.seams.push(...seams);
    if(component.placement?.pieceId) {
      const placement=component.placement, base=out.basePieces.find(piece=>piece.id===placement.pieceId);
      if(!base) error(`${title}: la pieza de colocación ya no existe. Vuelve a elegir dónde colocarlo.`, 'component-placement-piece');
      else {
        const x=placement.x-w/2,y=placement.y-h/2;
        const points=[{x,y},{x:x+w,y},{x:x+w,y:y+h},{x,y:y+h}];
        const contour=seamPolygon(base);
        const inside=(point:Pt)=>pointInPolygon(point,contour)||contour.some((a,i)=>distToSegment(point,a,contour[(i+1)%contour.length])<.01);
        // Check every interval split by contour intersections, including narrow concavities.
        const footprint=(kind==='olan-fruncido'||kind==='olan-plisado') ? [{x,y:y-sa},{x:x+w,y:y-sa},points[2],points[3]] : points;
        const fits=footprint.every((a,i)=>{
          const b=footprint[(i+1)%4];
          const fractions=[0,1,...contour.flatMap((c,j)=>{const hit=segIntersect(a,b,c,contour[(j+1)%contour.length]);return hit?[Math.max(0,Math.min(1,hit.t))]:[];})].sort((left,right)=>left-right);
          return inside(a)&&fractions.slice(1).every((t,j)=>{const mid=(t+fractions[j])/2;return inside({x:a.x+(b.x-a.x)*mid,y:a.y+(b.y-a.y)*mid});});
        });
        if(!fits) error(`${title}: las marcas se salen de la línea terminada de «${base.name}». Mueve o reduce el complemento.`, 'component-placement-outside');
        else for(let i=0;i<points.length;i++) base.lines.push({id:`${prefix}-colocacion-${i}`,kind:'colocacion',a:points[i],b:points[(i+1)%4],label:`${title}${suffix}${i===0?(decoration?' · fijación':' · boca'):''}`});
      }
    }
    out.assumptions.push(`${title}${suffix}: ${formatLength(w,'cm')} × ${formatLength(h,'cm')}, ${qty} unidad(es). ${component.placement?.pieceId?'Las marcas se expresan sobre la línea terminada de la pieza real.':'La colocación en la ilustración es orientativa; transfiere y prueba la ubicación sobre la prenda real.'}`);
  }
  if(components.length) {
    if(out.pieces.length || out.materials.length) out.materials.unshift({id:'hilo',label:'Hilo de coser adecuado a la tela',qty:'1 carrete',note:'Incluye la confección y fijación de los complementos; prueba el pespunte y la tensión en un retazo.'});
    out.notices.push({level:'aviso',code:'component-experimental',message:'Complementos experimentales: imprime y cose una muestra antes de cortar la tela definitiva.'});
    out.assumptions.push('Los complementos no cambian la talla ni la holgura de la base. Sus dimensiones son terminadas; márgenes y dobladillos se añaden una sola vez por fuera. No incluyen protección certificada para cargas ni herramientas.');
    out.assumptions.push('Estas construcciones están pensadas para tela estable. Si la base es elástica, estabiliza las zonas de fijación y prueba que los pespuntes no deformen la prenda.');
  }
  return out;
}
