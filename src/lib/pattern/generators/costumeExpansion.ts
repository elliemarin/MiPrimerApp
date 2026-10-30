import { parseSvgPath } from '../../draw/svgpath';
import { cmdsBBox, cmdsToSvg, pieceSeamCmds, transformCmds } from '../../draw/paths';
import { cubicAt } from '../../geom/bezier';
import { bboxOf } from '../../geom/vec';
import { num, type GeneratorContext, type GeneratorResult, type Params, type PatternGenerator } from '../generator';
import { edgeLength, seamPolygon } from '../outline';
import type { Piece, SeamRelation } from '../types';

export type CostumeKind = 'tabardo' | 'chaleco' | 'falda' | 'alas' | 'cola' | 'diadema' | 'cuello' | 'puno' | 'polaina' | 'peto' | 'cinturon' | 'kit';
export interface CostumeRecipe {
  id: string; name: string; kind: CostumeKind; style: string; width: number; height: number;
  circumference?: number; family: string; description: string; parts?: string[];
}
const r = (id: string, name: string, kind: CostumeKind, style: string, width: number, height: number, family: string, description: string, circumference?: number, parts?: string[]): CostumeRecipe => ({id,name,kind,style,width,height,family,description,circumference,parts});

/** Each entry changes the contour, construction, or actual inventory of a set.
 * Measurements, colours and fabric selections do not produce extra entries. */
export const COSTUME_RECIPES: CostumeRecipe[] = [
  r('tabardo-medieval','Tabardo medieval abierto','tabardo','recto',520,760,'tabardo','Dos paneles sin mangas, con hombro izquierdo desmontable y ajustes laterales de velcro.'),
  r('tabardo-heraldico','Tabardo heráldico en punta','tabardo','punta',520,820,'tabardo','Tabardo de bajo apuntado, con emblema de escudo de tela incluido.'),
  r('tabardo-almenado','Tabardo almenado de guardia','tabardo','almenas',520,740,'tabardo','Tabardo con cuatro almenas integradas en cada bajo; no son una estampa decorativa.'),
  r('tabardo-robot','Tabardo de robot con paneles','tabardo','robot',560,720,'tabardo','Tabardo rectangular con tres paneles de consola de tamaños distintos para aplicar sobre el pecho.'),
  r('chaleco-pirata','Chaleco abierto de pirata','chaleco','recto',560,560,'chaleco','Chaleco sin mangas con dos delanteros separados y espalda completa, todo forrado.'),
  r('chaleco-duende','Chaleco de duende con picos','chaleco','picos',540,600,'chaleco','Delanteros abiertos acabados en picos y espalda recta; las puntas forman parte del corte.'),
  r('chaleco-bolero','Bolero corto de personaje','chaleco','curvo',560,330,'chaleco','Chaleco corto con delanteros redondeados y espalda completa, sin cierre frontal.'),
  r('falda-petalos','Falda de seis pétalos','falda','petalo',230,430,'falda','Seis pétalos de dos caras, superpuestos sobre una cinturilla abierta de velcro.',760),
  r('falda-hojas','Faldón de ocho hojas','falda','hoja',200,480,'falda','Ocho hojas textiles apuntadas con nervadura de pespunte y cinturilla abierta.',760),
  r('falda-medusa','Faldón de ocho tentáculos','falda','tentaculo',105,650,'falda','Ocho tentáculos planos de doble cara, largos y ondulados, sujetos a una cinturilla.',760),
  r('alas-mariposa','Alas textiles de mariposa','alas','mariposa',370,550,'alas','Cada ala tiene un lóbulo superior y otro inferior; incluye reversos, refuerzos y puente dorsal.'),
  r('alas-hada','Alas alargadas de hada','alas','hada',330,650,'alas','Alas en forma de hoja alargada y curva, con refuerzo flexible y tirantes elásticos comprados.'),
  r('alas-dragon','Alas de dragón con tres puntas','alas','dragon',430,480,'alas','Membranas de tres puntas con líneas de pespunte radiales, reverso y puente dorsal.'),
  r('alas-murcielago','Alas festoneadas de murciélago','alas','murcielago',430,430,'alas','Contorno de membrana con cuatro ondas cóncavas y puntas, reforzado y de dos caras.'),
  r('alas-angel','Alas de ángel con plumas','alas','angel',330,600,'alas','Tres grandes lóbulos en forma de pluma por ala; las curvas forman parte del patrón.'),
  r('alas-escarabajo','Alas élitro de escarabajo','alas','escarabajo',300,490,'alas','Dos élitros ovalados de tela con refuerzo, unidos mediante un puente dorsal.'),
  r('cola-dinosaurio','Cola de dinosaurio con cresta','cola','dinosaurio',230,650,'cola','Cola acolchada de dos caras con seis crestas triangulares aplicadas y cinturón desmontable.',760),
  r('cola-zorro','Cola curvada de zorro','cola','zorro',260,620,'cola','Cola ancha y curvada con dos aplicaciones contrastantes para la punta y cinturón.',760),
  r('cola-ballena','Cola de ballena de cinturón','cola','ballena',490,330,'cola','Cola corta de dos lóbulos en abanico, relleno suave y soporte a cintura.',760),
  r('cola-gato','Cola curva de gato','cola','gato',180,600,'cola','Cola blanda en curva de S, construida con dos caras y relleno, sin alambre.',760),
  r('cola-dragon','Cola de dragón con punta de lanza','cola','dragon',240,700,'cola','Cola larga con punta de lanza y cinco crestas dorsales separadas, con cinturón.',760),
  r('orejas-conejo','Orejas largas de conejo','diadema','conejo',100,290,'diadema-disfraz','Dos orejas largas, reversos, refuerzos e interiores de contraste; diadema comprada.'),
  r('orejas-oso','Orejas redondas de oso','diadema','oso',130,120,'diadema-disfraz','Dos orejas redondeadas de dos caras con aplicaciones interiores y refuerzo.'),
  r('astas-ciervo','Astas blandas de ciervo','diadema','ciervo',170,280,'diadema-disfraz','Dos astas ramificadas de tela con refuerzo flexible, fijadas a una diadema forrada.'),
  r('cuerno-unicornio','Cuerno textil de unicornio','diadema','unicornio',95,250,'diadema-disfraz','Cono desarrollado matemáticamente, base circular de cierre y refuerzo; no usa alambre.'),
  r('antenas-insecto','Antenas textiles de insecto','diadema','insecto',75,230,'diadema-disfraz','Dos tallos blandos y dos terminales circulares rellenos, montados sobre diadema.'),
  r('cuello-arlequin','Cuello de puntas de arlequín','cuello','puntas',440,130,'cuello-disfraz','Banda de ocho puntas, reverso y cierre frontal de velcro; apertura completa.',360),
  r('cuello-petalos','Cuello de pétalos redondeados','cuello','petalos',440,130,'cuello-disfraz','Banda abierta con ocho pétalos redondeados y reverso, sin cordones.',360),
  r('gorguera','Gorguera de frunce','cuello','frunce',440,110,'cuello-disfraz','Volante de triple largo que se frunce a una banda de cuello con velcro.',360),
  r('cuello-vampiro','Cuello alto de vampiro','cuello','vampiro',440,190,'cuello-disfraz','Cuello elevado en la nuca y bajo en los extremos delanteros, reforzado y abierto.',360),
  r('punos-arlequin','Puños de puntas de arlequín','puno','puntas',250,100,'puno-disfraz','Dos puños abiertos de cinco puntas, reversos y velcro ajustable.',180),
  r('punos-dragon','Puños de escamas de dragón','puno','escamas',250,130,'puno-disfraz','Dos puños de tres escamas curvas con entretela ligera y velcro.',180),
  r('polainas-explorador','Polainas textiles de explorador','polaina','polaina',420,330,'polaina','Dos cubrepantorrillas abiertos por detrás con velcro; no cubren la suela.',350),
  r('peto-caballero','Peto escudo de caballero','peto','escudo',350,420,'peto-disfraz','Pechera en forma de escudo con reverso, refuerzo y tirantes de cinta ajustables.'),
  r('peto-astronauta','Pechera espacial con consola','peto','espacial',380,400,'peto-disfraz','Pechera redondeada con dos paneles de consola y bolsillo de parche incluidos.'),
  r('cinturon-pirata','Faja de pirata con bolsón','cinturon','pirata',230,250,'cinturon','Faja forrada con un bolsón de dos caras, solapa y presillas de montaje.',760),
  r('kit-hada','Conjunto de hada: alas y pétalos','kit','hada',330,650,'conjunto-disfraz','Incluye todas las plantillas de alas alargadas y falda de seis pétalos.',760,['alas-hada','falda-petalos']),
  r('kit-dragon','Conjunto de dragón: alas, cola y puños','kit','dragon',430,480,'conjunto-disfraz','Incluye membranas de alas, cola con cresta y dos puños de escamas.',760,['alas-dragon','cola-dragon','punos-dragon']),
  r('kit-conejo','Conjunto de conejo: orejas y cola','kit','conejo',100,290,'conjunto-disfraz','Orejas largas con interiores de contraste y cola redonda de tela para cinturón.',760,['orejas-conejo']),
  r('kit-insecto','Conjunto de insecto: élitros y antenas','kit','insecto',300,490,'conjunto-disfraz','Dos alas ovaladas de escarabajo, puente dorsal y antenas textiles completas.',undefined,['alas-escarabajo','antenas-insecto'])
];

export const costumeMaxMargin=(recipe:CostumeRecipe)=>recipe.style==='ciervo'?5:10;

export interface CostumeDisplayPart { pieceId: string; x: number; y: number; mirror?: boolean; scale?: number; displayD?: string; }
export interface CostumeBuild { result: GeneratorResult; front: CostumeDisplayPart[]; back: CostumeDisplayPart[]; }
const RECT = 'M0 0 H100 V100 H0 Z';
const OVAL = 'M50 0 C77.614 0 100 22.386 100 50 C100 77.614 77.614 100 50 100 C22.386 100 0 77.614 0 50 C0 22.386 22.386 0 50 0 Z';
const SHIELD = 'M0 0 H100 V57 C100 78 72 94 50 100 C28 94 0 78 0 57 Z';
const PETAL = 'M20 0 H80 C98 18 100 45 93 63 C84 87 65 98 50 100 C35 98 16 87 7 63 C0 45 2 18 20 0 Z';
const LEAF = 'M30 0 H70 C100 23 94 65 50 100 C6 65 0 23 30 0 Z';
const TENTACLE = 'M20 0 H80 C83 22 50 39 72 57 C99 80 76 100 50 100 C20 100 8 76 34 58 C54 43 12 24 20 0 Z';
const WINGS: Record<string,string> = {
  mariposa: 'M0 27 C24 7 72 0 100 7 C100 28 82 43 61 48 C84 49 98 68 81 87 C58 100 20 84 0 70 Z',
  hada: 'M0 43 C22 12 69 0 100 0 C90 37 65 58 43 68 C60 82 46 100 25 100 C7 91 2 69 0 43 Z',
  dragon: 'M0 37 L100 0 C87 24 73 35 68 42 L89 72 C66 63 51 68 45 77 L54 100 C30 90 13 81 0 73 Z',
  murcielago: 'M0 25 C20 3 61 0 100 0 C84 11 70 25 72 42 C60 35 45 41 43 59 C31 50 17 60 20 79 C11 75 3 85 0 100 Z',
  angel: 'M0 25 C19 6 57 0 100 0 C95 24 80 42 61 56 C91 40 88 59 66 75 C91 63 71 94 42 100 C16 97 4 73 0 56 Z',
  escarabajo: 'M0 8 C33 0 100 3 100 43 C100 78 57 100 20 100 C8 76 0 40 0 8 Z'
};
const TAILS: Record<string,string> = {
  dinosaurio: 'M0 0 H100 C96 34 76 83 50 100 C24 83 4 34 0 0 Z',
  zorro: 'M13 0 H50 C83 17 100 42 91 62 C83 86 58 97 32 100 C52 73 48 57 30 44 C9 28 0 12 13 0 Z',
  ballena: 'M40 0 H60 L65 35 C84 28 99 36 100 52 C91 81 67 96 50 100 C33 96 9 81 0 52 C1 36 16 28 35 35 Z',
  gato: 'M12 0 H44 C47 25 90 37 90 61 C100 83 71 100 44 100 C25 100 21 91 36 85 C55 78 67 73 58 61 C44 44 0 31 12 0 Z',
  dragon: 'M28 0 H72 C72 35 55 56 57 74 L100 83 L50 100 L0 83 L41 74 C43 56 28 35 28 0 Z'
};
const EARS: Record<string,string> = {
  conejo: 'M25 100 C4 76 0 25 23 5 C40 0 60 0 77 5 C100 25 96 76 75 100 Z',
  oso: 'M15 100 C0 79 0 49 7 30 C20 0 80 0 93 30 C100 49 100 79 85 100 Z',
  ciervo: 'M36 100 L32 68 L5 51 L0 28 L17 41 L30 45 L27 17 L42 0 L42 43 L60 34 L73 12 L88 2 L84 30 L70 49 L100 44 L96 60 L64 64 L61 100 Z'
};

/** Fit a drawn construction contour to its declared finished width/length.
 * Cubic extrema, not control handles or a raster image, define the envelope. */
const normalized=new Map<string,string>();
function fitContour(d:string):string {
  const cached=normalized.get(d);if(cached)return cached;
  const commands=parseSvgPath(d),points:{x:number;y:number}[]=[];let current={x:0,y:0};
  for(const cmd of commands) {
    if(cmd.op==='Z')continue;
    if(cmd.op==='C')for(const axis of ['x','y'] as const) {
      const a=-current[axis]+3*cmd.c1[axis]-3*cmd.c2[axis]+cmd.p[axis],b=2*(current[axis]-2*cmd.c1[axis]+cmd.c2[axis]),c=cmd.c1[axis]-current[axis];
      const discriminant=b*b-4*a*c;
      const roots=Math.abs(a)<1e-10?(Math.abs(b)>1e-10?[-c/b]:[]):discriminant>=0?[(-b+Math.sqrt(discriminant))/(2*a),(-b-Math.sqrt(discriminant))/(2*a)]:[];
      for(const t of roots)if(t>0&&t<1)points.push(cubicAt({p0:current,c1:cmd.c1,c2:cmd.c2,p3:cmd.p},t));
    }
    points.push(cmd.p);current=cmd.p;
  }
  const b=bboxOf(points),sx=100/(b.maxX-b.minX),sy=100/(b.maxY-b.minY);
  const value=cmdsToSvg(transformCmds(commands,[sx,0,0,sy,-b.minX*sx,-b.minY*sy]));normalized.set(d,value);return value;
}

function piece(id: string,name: string,d: string,w: number,h: number,sa: number,qty=1,fabric: Piece['cut']['fabric']='principal'): Piece {
  const commands = parseSvgPath(d), nodes: Piece['nodes'] = [], edges: Piece['edges'] = [];
  const scale = (p:{x:number;y:number}) => ({x:p.x*w/100,y:p.y*h/100});
  let last='',start='';
  for (const command of commands) {
    if(command.op==='M') { start=`n${nodes.length}`;nodes.push({id:start,...scale(command.p)});last=start;continue; }
    if(command.op==='Z') {
      if(last!==start) edges.push({id:`e${edges.length}`,label:'Contorno',from:last,to:start,kind:'line',allowance:sa,finish:sa?'costura':'sin-margen'});
      continue;
    }
    const p=scale(command.p), first=nodes.find(n=>n.id===start)!;
    const closes=Math.hypot(p.x-first.x,p.y-first.y)<1e-6;
    const next=closes?start:`n${nodes.length}`;
    if(!closes)nodes.push({id:next,...p});
    edges.push({id:`e${edges.length}`,label:'Contorno',from:last,to:next,kind:command.op==='C'?'cubic':'line',...(command.op==='C'?{c1:scale(command.c1),c2:scale(command.c2)}:{}),allowance:sa,finish:sa?'costura':'sin-margen'});last=next;
  }
  const made:Piece={id,name,nodes,edges,grain:{a:{x:w*.5,y:h*.3},b:{x:w*.5,y:h*.65}},cut:{qty,mirrorPairs:false,onFold:false,fabric},notches:[],lines:[],marks:[],source:'generada'};
  const poly=seamPolygon(made,.15),box=bboxOf(poly);let best={x:(box.minX+box.maxX)/2,a:box.minY,b:box.minY};
  for(const ratio of [.2,.35,.5,.65,.8]){const x=box.minX+(box.maxX-box.minX)*ratio,ys:number[]=[];for(let i=0;i<poly.length;i++){const a=poly[i],b=poly[(i+1)%poly.length];if((a.x<=x&&b.x>x)||(b.x<=x&&a.x>x))ys.push(a.y+(x-a.x)*(b.y-a.y)/(b.x-a.x));}ys.sort((a,b)=>a-b);for(let i=0;i+1<ys.length;i+=2)if(ys[i+1]-ys[i]>best.b-best.a)best={x,a:ys[i],b:ys[i+1]};}
  made.grain={a:{x:best.x,y:best.a+(best.b-best.a)*.25},b:{x:best.x,y:best.a+(best.b-best.a)*.7}};
  return made;
}
function matched(a:Piece,b:Piece,id:string,ae=a.edges.map(e=>e.id),be=b.edges.map(e=>e.id)):SeamRelation {
  return {id,label:`${a.name} con ${b.name}`,kind:'igual',a:[{pieceId:a.id,edgeIds:ae}],b:[{pieceId:b.id,edgeIds:be}],ratioMin:.999,ratioMax:1.001,tolerance:.1};
}
const cm=(mm:number)=>`${Math.round(mm*10)/100} cm`;

export function buildCostumeRecipe(recipe:CostumeRecipe,params:Params={}):CostumeBuild {
  const w=num(params,'ancho',recipe.width),h=num(params,'largo',recipe.height),c=num(params,'contorno',recipe.circumference??760),sa=num(params,'margen',5);
  const result:GeneratorResult={pieces:[],seams:[],checks:[],materials:[{id:'hilo',label:'Hilo de coser',qty:'1 carrete'}],steps:[],assumptions:['Dimensiones directas de la pieza terminada, en milímetros; no corresponden automáticamente a una talla corporal. Comprueba movimiento y cobertura sobre la persona.', 'Márgenes añadidos por fuera una sola vez. El dibujo de conjunto es una referencia 2D; cada plantilla de corte conserva sus propias medidas.'],notices:[{level:'aviso',code:'muestra-pendiente',message:'Experimental: imprime al 100 %, comprueba la escala y cose una muestra antes de usar la tela definitiva.'}]};
  const built:CostumeBuild={result,front:[],back:[]};
  if(w<recipe.width*.65||w>recipe.width*1.5||h<recipe.height*.65||h>recipe.height*1.5||sa<3||sa>costumeMaxMargin(recipe)||!Number.isFinite(w+h+sa)||recipe.circumference&&(c<recipe.circumference*.65||c>recipe.circumference*1.5)) {
    result.notices.push({level:'error',code:'medida-disfraz',message:`Revisa las medidas: usa el intervalo publicado de cada diseño y un margen entre 3 y ${costumeMaxMargin(recipe)} mm.`});return built;
  }
  const add=(id:string,name:string,d:string,width:number,height:number,qty=1,fabric:Piece['cut']['fabric']='principal',allowance=sa)=>{const p=piece(id,name,d,width,height,allowance,qty,fabric);result.pieces.push(p);return p;};
  const lined=(id:string,name:string,d:string,width:number,height:number,qty=1,reinforce=false)=>{
    const a=add(id,name,d,width,height,qty),b=add(`${id}-forro`,`${name}: reverso`,d,width,height,qty,'forro');
    result.seams.push(matched(a,b,`${id}-caras`));
    if(reinforce)add(`${id}-refuerzo`,`${name}: refuerzo sin margen`,d,width,height,qty,'entretela',0);
    result.steps.push({id:`${id}-caras`,title:`Prepara ${name.toLowerCase()}`,detail:`Corta ${qty} exterior(es) y ${qty} reverso(s)${reinforce?`, más ${qty} refuerzo(s) sin margen`:''}. ${reinforce?'Aplica el refuerzo por el revés, dentro de la línea de costura. ':''}Decora primero. En piezas asimétricas corta el reverso con la plantilla volteada para que ambos contornos coincidan al enfrentar los derechos. Enfrenta derechos, cose el contorno dejando una abertura suficiente en un tramo recto o poco curvo, rebaja esquinas y curvas, voltea y conserva la abertura hasta completar el relleno o la fijación indicados en los pasos siguientes; ciérrala a mano al terminar. No agregues otro margen.`,pieces:[a.id,b.id,...reinforce?[`${id}-refuerzo`]:[]],seams:[`${id}-caras`]});
    return a;
  };
  const material=(id:string,label:string,qty:string,note?:string)=>result.materials.push({id,label,qty,...note?{note}:{} });
  const step=(id:string,title:string,detail:string,pieces:string[],seams?:string[])=>result.steps.push({id,title,detail,pieces,...seams?{seams}:{} });
  const belt=(prefix='cinturilla',height=45)=>{
    const length=c+40;const p=lined(prefix,'Banda de ajuste',RECT,length,height);
    p.marks.push({id:'velcro-inicio',kind:'cruz',at:{x:20,y:height/2},label:'Velcro: comienzo de traslape de 4 cm'},{id:'velcro-final',kind:'cruz',at:{x:length-20,y:height/2},label:'Velcro: extremo opuesto'});
    result.checks.push({key:`${prefix}-contorno`,label:'Contorno de la banda cerrada sin traslape',target:c,measured:edgeLength(p,p.edges[0])-40,tolerance:.01});
    material(`${prefix}-velcro`,'Velcro suave de 20 mm','1 juego de 4 cm','Cose las dos caras en extremos opuestos y prueba el contorno sobre la ropa.');
    return p;
  };
  const display=(id:string,x=0,y=0,mirror=false,side:'front'|'back'|'both'='both')=>{
    if(side!=='back')built.front.push({pieceId:id,x,y,mirror});
    if(side!=='front')built.back.push({pieceId:id,x,y,mirror});
  };
  const strapMaterial=()=>material('tirantes','Cinta de mochila de 25 mm y velcro suave','2 tramos de 70 cm y 4 pares de velcro de 5 cm','Medida inicial para probar sobre la persona; acorta, remata y ajusta sin comprimir. No rodees el cuello con una cinta.');

  if(recipe.kind==='tabardo') {
    const hem=recipe.style==='punta'?'L50 100 L0 82':recipe.style==='almenas'?'V100 H85.714 V87 H71.429 V100 H57.143 V87 H42.857 V100 H28.571 V87 H14.286 V100 H0':'V100 H0';
    const outline=(depth:number)=>`M0 0 H30 C36 ${depth} 64 ${depth} 70 0 H100 ${hem} Z`;
    const front=lined('delantero','Panel delantero',outline(19),w,h),back=lined('espalda','Panel de espalda',outline(8),w,h);
    result.seams.push(matched(front,back,'hombro-derecho',['e2'],['e2']));
    const tabs=lined('puente-hombro','Puente de hombro desmontable',RECT,w*.3,60);
    display(front.id,0,0,false,'front');display(back.id,0,0,false,'back');
    if(recipe.style==='punta'){lined('emblema','Emblema de escudo',SHIELD,w*.35,h*.28);display('emblema',w*.325,h*.3,false,'front');step('aplicar-emblema','Aplica el escudo antes de forrar',`Prepara el emblema de dos caras. Centra su borde superior a ${cm(h*.3)} bajo el hombro del delantero exterior, dejando ${cm(w*.325)} desde cada costado. Pespuntea su contorno sin atrapar el forro, que se añade después.`,['delantero','emblema']);}
    if(recipe.style==='robot')for(let i=0;i<3;i++){lined(`panel-${i}`,'Panel de consola '+(i+1),RECT,w*(i===0?.55:.22),h*(i===0?.18:.12));display(`panel-${i}`,w*(i===0?.225:i===1?.22:.57),h*(i===0?.3:.55),false,'front');}
    if(recipe.style==='robot')step('aplicar-paneles','Aplica los tres paneles antes de forrar',`Sobre el delantero exterior, coloca el panel grande centrado a ${cm(h*.3)} del hombro. Sitúa los pequeños a ${cm(h*.55)} del hombro, uno a cada lado del centro. Comprueba que los paneles no cruzan escote ni costados y pespuntea sus contornos; el reverso del delantero se une después.`,['delantero','panel-0','panel-1','panel-2']);
    material('cierres','Cinta de 25 mm y velcro suave','4 tramos laterales de 25 cm; 2 juegos de velcro de 8 cm para hombro','Las cintas laterales se prueban sobre la ropa; este tabardo permanece abierto a los costados.');
    step('unir-tabardo','Une los hombros y ajusta los costados',`Superpone borde a borde los hombros derechos del delantero y espalda, y únelos con una costura de unión reforzada a través de sus acabados. En el hombro izquierdo fija la mitad del puente de ${cm(w*.3)} × 6 cm al reverso del delantero; la otra mitad se cierra sobre la espalda con velcro. Añade las cuatro cintas laterales a la altura de cintura y prueba su ajuste antes de coser el velcro. El hombro izquierdo debe abrirse para vestir.`,[front.id,back.id,tabs.id],['hombro-derecho']);
    result.assumptions.push('Tabardo abierto por ambos costados: ancho de cada panel, no medio contorno de pecho. Se lleva sobre otra prenda y se ajusta mediante las cintas laterales.');
  } else if(recipe.kind==='chaleco') {
    const backPath='M0 0 H32 C36 10 64 10 68 0 H100 L88 30 V100 H12 V30 Z';
    const frontPath=recipe.style==='picos'?'M0 0 H32 L48 25 V76 L32 100 L24 82 L12 100 V30 Z':recipe.style==='curvo'?'M0 0 H32 C45 13 50 42 48 65 C45 86 28 96 12 100 V30 Z':'M0 0 H32 L48 28 V100 H12 V30 Z';
    const front=add('delantero','Medio delantero: cortar en espejo',frontPath,w,h,2),back=add('espalda','Espalda completa',backPath,w,h);
    const frontL=add('delantero-forro','Medio delantero de forro: cortar en espejo',frontPath,w,h,2,'forro'),backL=add('espalda-forro','Espalda de forro',backPath,w,h,1,'forro');
    front.cut.mirrorPairs=true;frontL.cut.mirrorPairs=true;
    result.seams.push(matched(front,frontL,'delantero-forrado'),matched(back,backL,'espalda-forrada'),matched(front,back,'hombros',['e0'],['e0']));
    // Last straight vertical side is identical on front/back regardless of decorative front hem.
    const fs=front.edges.find(e=>e.kind==='line'&&Math.abs(front.nodes.find(n=>n.id===e.from)!.x-w*.12)<.01&&Math.abs(front.nodes.find(n=>n.id===e.to)!.x-w*.12)<.01)!;
    const bs=back.edges.find(e=>e.kind==='line'&&Math.abs(back.nodes.find(n=>n.id===e.from)!.x-w*.12)<.01&&Math.abs(back.nodes.find(n=>n.id===e.to)!.x-w*.12)<.01)!;
    result.seams.push(matched(front,back,'costados',[fs.id],[bs.id]));
    display('delantero',0,0,false,'front');display('delantero',w*.52,0,true,'front');display('espalda',0,0,false,'back');
    step('chaleco-cortar','Corta exteriores y forros en espejo','Corta dos medios delanteros exteriores en espejo, una espalda exterior, dos medios delanteros de forro en espejo y una espalda de forro. Transfiere los extremos de sisa y los hombros; el centro delantero queda abierto, sin añadir botones no incluidos.',['delantero','espalda','delantero-forro','espalda-forro']);
    step('chaleco-montar','Cose hombros y costados','Monta por separado el exterior y el forro: enfrenta derechos y une hombros, después los costados desde el final de sisa hasta el bajo. Conserva abiertos cuello, sisas y centro delantero. Abre los márgenes; los dos hombros y ambos costados son simétricos.',['delantero','espalda','delantero-forro','espalda-forro'],['hombros','costados']);
    step('chaleco-forrar','Forra los bordes abiertos','Enfrenta exterior y forro por los derechos. Cose los centros delanteros, cuello y bajo dejando una abertura de 10 cm en el bajo del forro. Voltea. Mete los márgenes de ambas sisas por sus líneas de costura y únelos con puntada invisible, sin retorcer el hombro. Cierra la abertura, asienta y prueba movimiento.',['delantero','espalda','delantero-forro','espalda-forro'],['delantero-forrado','espalda-forrada']);
    result.assumptions.push('Chaleco sin mangas abierto por delante. El ancho indicado corresponde al ancho total de espalda antes de las pequeñas entradas de sisa; mide sobre la ropa y prueba el ancho de hombros.');
  } else if(recipe.kind==='falda') {
    const count=recipe.style==='petalo'?6:8,path=recipe.style==='petalo'?PETAL:recipe.style==='hoja'?LEAF:TENTACLE;
    const panel=lined('panel',recipe.style==='tentaculo'?'Tentáculo plano':'Panel de '+(recipe.style==='hoja'?'hoja':'pétalo'),fitContour(path),w,h,count);
    const band=belt();
    for(let i=0;i<count;i++) {const x=40+(c/count)*(i+.5);band.marks.push({id:`centro-panel-${i}`,kind:'cruz',at:{x:Math.min(c+20,x),y:35},label:`Centro de panel ${i+1}`});}
    if(recipe.style==='hoja')panel.lines.push({id:'nervadura',kind:'pespunte',a:{x:w*.5,y:h*.12},b:{x:w*.5,y:h*.88},label:'Nervadura opcional'});
    for(let i=0;i<Math.ceil(count/2);i++)display('panel',i*w*.58,35,false,'both');display('cinturilla',0,0,false,'both');
    step('montar-falda','Reparte los paneles en la banda',`Marca el contorno útil de la banda en ${count} partes iguales, sin contar los 4 cm de traslape. Sitúa un centro de panel en cada marca y superpone sus bordes según la cobertura que desees. Cose su extremo superior a la mitad inferior de la banda ya forrada con dos pespuntes. Deja libre el cierre de velcro y comprueba que el largo no arrastre.`,[panel.id,band.id]);
    result.assumptions.push('Faldón abierto por paneles que se lleva sobre otra prenda; no es una falda opaca ni un patrón ceñido a la cadera. El ancho indicado pertenece a cada pétalo/hoja/tentáculo.');
  } else if(recipe.kind==='alas') {
    const wing=lined('ala','Media ala: cortar dos en espejo',fitContour(WINGS[recipe.style]),w,h,2,true);wing.cut.mirrorPairs=true;
    result.pieces.filter(p=>p.id.startsWith('ala-')).forEach(p=>p.cut.mirrorPairs=true);
    const bridge=lined('puente','Puente dorsal',RECT,110,Math.min(210,h*.45),1,true);
    for(let i=0;i<3;i++)wing.lines.push({id:`nervio-${i}`,kind:'pespunte',a:{x:w*.07,y:h*.45},b:{x:w*(.7-i*.1),y:h*(.2+i*.25)},label:'Pespunte decorativo y de estabilización'});
    display('ala',55,0);display('ala',55-w,0,true);display('puente',0,h*.25);
    material('elastico','Elástico suave de 25 mm','2 tramos iniciales de 60 cm','Ajustar cada tirante alrededor del hombro y debajo de la axila, sin pasar por el cuello ni comprimir.');
    material('refuerzo','Entretela firme cosible o espuma textil fina','2 medias alas y 1 puente según plantillas','Refuerzo flexible, sin varillas rígidas; el resultado no pretende quedar horizontal por sí solo.');
    step('montar-alas','Une las alas al puente y ajusta tirantes','Coloca las alas simétricas sobre el reverso del puente, con sus raíces hacia el centro, y superpone 2 cm de cada raíz sobre él. Cose dos pespuntes verticales por ala a través de las capas, evitando sus bordes exteriores. Forma un lazo de elástico por hombro: prueba el recorrido por axila, remata sus extremos y cóselos arriba y abajo del puente con un cuadro reforzado.',[wing.id,bridge.id]);
    result.assumptions.push('Alas escénicas blandas y flexibles; cada medida corresponde a una media ala. La entretela sostiene el tejido, no permite vuelo ni reemplaza una estructura rígida.');
  } else if(recipe.kind==='cola') {
    lined('cola','Cara de cola',fitContour(TAILS[recipe.style]),w,h,1);
    belt();
    if(['dinosaurio','dragon'].includes(recipe.style)) {const count=recipe.style==='dragon'?5:6;lined('cresta','Cresta triangular', 'M0 100 L50 0 L100 100 Z',w*.33,h*.13,count);step('fijar-crestas','Fija las crestas en el dorso',`Prepara las ${count} crestas de dos caras. Sitúalas sobre la línea dorsal de una cara de la cola, antes de rellenarla, distribuidas en su largo útil. Dobla ligeramente sus bases y fíjalas con dos pespuntes a la cara exterior; así no interfieren con la costura del contorno.`,['cola','cresta']);for(let i=0;i<count;i++)display('cresta',Math.max(0,(c-w)/2)+w*.48,35+h*(.12+i*.105),false,'front');}
    if(recipe.style==='zorro'){const tip=lined('punta','Aplicación de punta clara','M10 0 C40 12 78 0 100 13 C85 50 52 88 0 100 C30 60 31 28 10 0 Z',w*.48,h*.28,2);tip.cut.fabric='contraste';display(tip.id,Math.max(0,(c-w)/2)+w*.415,35+h*.68);step('aplicar-punta','Aplica las puntas de contraste','Prepara las dos aplicaciones con sus reversos y colócalas sobre el extremo de cada cara de cola. Adapta la posición dentro del contorno real sin cruzar la línea de costura y pespuntea alrededor; estas piezas se aplican encima, no reemplazan un segmento de cola.',['cola','punta']);}
    display('cola',Math.max(0,(c-w)/2),35);display('cinturilla',0,0);
    material('relleno','Relleno sintético ligero','Cantidad a prueba: rellenar de forma blanda','No añadir pesos, alambres ni varillas. La cola se retira para sentarse si interfiere.');
    step('rellenar-cola','Rellena y fija la cola a la cintura','Al coser las caras deja abierta la base superior para voltear y rellenar. Introduce pequeñas porciones de relleno sin endurecer la pieza; cierra la base hacia dentro. Sitúa la base sobre el centro posterior de la cinturilla ya forrada y fíjala con un rectángulo de pespunte. Prueba el peso y el movimiento antes de terminar el velcro.',['cola','cinturilla']);
  } else if(recipe.kind==='diadema') {
    material('diadema','Diadema ancha forrada en tela','1 unidad comprada','Soporte independiente del patrón; fijar a mano sobre su cubierta, no perforar plástico con la máquina.');
    if(['conejo','oso','ciervo'].includes(recipe.style)) {
      const ear=lined('oreja',recipe.style==='ciervo'?'Asta blanda':'Oreja de personaje',fitContour(EARS[recipe.style]),w,h,2,true);ear.cut.mirrorPairs=true;result.pieces.filter(p=>p.id.startsWith('oreja-')).forEach(p=>p.cut.mirrorPairs=true);
      if(recipe.style!=='ciervo'){lined('interior','Interior de oreja',EARS[recipe.style],w*.55,h*.7,2).cut.fabric='contraste';display('interior',w*.225,h*.14);display('interior',w*1.625,h*.14);step('aplicar-interior','Aplica los interiores de contraste','Antes de cerrar las orejas, prepara y aplica un interior de contraste sobre cada exterior, centrado y dejando libre su contorno de costura. Pespuntea alrededor; el contraste no se corta como un hueco de la oreja.',['oreja','interior']);}
      display('oreja',0,0);display('oreja',w*1.4,0);
      step('montar-diadema','Fija las dos piezas a la diadema','Cierra las aberturas de volteo a mano y comprueba que el refuerzo flexible sostenga las piezas sin puntas rígidas. Coloca las bases sobre la cubierta de la diadema, prueba separación e inclinación y cóselas a mano con varias pasadas pequeñas a lo ancho de cada base.',['oreja']);
    } else if(recipe.style==='unicornio') {
      const radius=w/2,slant=Math.sqrt(radius*radius+h*h),angle=2*Math.PI*radius/slant,start=-angle/2,end=angle/2;
      const x1=slant*Math.sin(start),y1=slant*Math.cos(start),x2=slant*Math.sin(end),y2=slant*Math.cos(end);
      const d=`M0 0 L${x1} ${y1} A${slant} ${slant} 0 0 0 ${x2} ${y2} Z`;
      const cone=add('cono','Sector del cuerno',d,100,100),base=add('base','Base circular del cuerno',OVAL,w,w);
      add('cono-refuerzo','Refuerzo del cuerno sin margen',d,100,100,1,'entretela',0);
      result.seams.push(matched(cone,cone,'cerrar-cono',[cone.edges[0].id],[cone.edges[cone.edges.length-1].id]),matched(cone,base,'cerrar-base',cone.edges.slice(1,-1).map(e=>e.id)));
      result.checks.push({key:'diametro-base',label:'Diámetro de base',target:w,measured:Math.max(...base.nodes.map(n=>n.x))-Math.min(...base.nodes.map(n=>n.x)),tolerance:.1});
      built.front.push({pieceId:'cono',x:0,y:0,displayD:`M${w/2} 0 L${w} ${h} H0 Z`}); built.back.push({...built.front[0]});
      material('relleno','Relleno suave','Cantidad suficiente para mantener el cono sin endurecerlo');
      step('cuerno-construir','Cierra el cono y su base','Aplica el refuerzo al sector sin ocupar el margen. Enfrenta los radios rectos y cóselos hasta la punta. Con el cono todavía del revés, une el círculo de base al arco inferior derecho con derecho, dejando una abertura de 3 cm; no frunzas el arco. Rebaja los márgenes, voltea por la abertura, rellena suavemente y ciérrala a mano. Fija la base del cono a la diadema forrada con puntadas manuales repetidas.',['cono','base','cono-refuerzo'],['cerrar-cono','cerrar-base']);
    } else {
      const stem=lined('tallo','Tallo de antena',RECT,w*.35,h*.72,2,true),end=lined('terminal','Terminal redondo',OVAL,w,w,2);
      material('relleno','Relleno suave','Dos pequeñas porciones para los terminales');
      display(stem.id,0,w*.5);display(stem.id,w*1.5,w*.5);display(end.id,-w*.3,0);display(end.id,w*1.2,0);
      step('montar-antenas','Monta los tallos y terminales','Rellena los terminales antes de cerrar sus aberturas. Superpone 2 cm del extremo de cada tallo sobre el reverso de un terminal y cose a mano varias pasadas. Fija los extremos inferiores a la cubierta textil de la diadema. Los tallos son blandos y flexibles: no introduzcas alambre para endurecerlos.',['tallo','terminal']);
    }
  } else if(recipe.kind==='cuello'||recipe.kind==='puno') {
    const bandLength=c+40,count=recipe.kind==='puno'?2:1;
    if(recipe.style==='frunce') {
      const band=belt('banda-cuello',30),ruffle=add('volante','Volante para fruncir',RECT,c*3,h,1);
      result.steps.find(s=>s.id==='banda-cuello-caras')!.detail='Corta exterior y reverso de la banda, con el margen indicado. Enfrenta derechos y cose ambos extremos y el borde superior. Deja abierto el borde inferior para insertar el volante fruncido en el paso de montaje; no lo cierres todavía. Voltea y plancha sin estirar.';
      ruffle.edges[2].allowance=10;ruffle.edges[2].finish='dobladillo';
      for(let i=1;i<4;i++)ruffle.notches.push({id:`cuarto-${i}`,edgeId:'e0',s:c*3*i/4,count:1,label:`Fruncir hasta ${cm(c*i/4)}`});
      result.seams.push({id:'fruncir',label:'Volante fruncido sobre tramo útil de banda',kind:'fruncido',a:[{pieceId:ruffle.id,edgeIds:['e0']}],b:[{pieceId:band.id,edgeIds:['e0'],factor:c/(c+40)}],ratioMin:3,ratioMax:3,tolerance:.1});
      display('volante',0,20);display('banda-cuello',0,0);
      step('fruncir-cuello','Frunce el volante y únelo a la banda',`Remata los dos extremos del volante por su margen. Haz un dobladillo doble de 5 mm en el bajo. Pasa dos hilvanes arriba y frunce de ${cm(c*3)} a ${cm(c)}, relacionando los piquetes por cuartos. Fija el borde fruncido entre los márgenes inferiores de la banda abierta, dejando libres sus 4 cm de traslape; pespuntea y prueba el velcro sin apretar.`,['volante','banda-cuello'],['fruncir']);
    } else {
      const n=recipe.kind==='puno'?recipe.style==='escamas'?3:5:8;
      let path='M0 0 H100 V35';
      if(recipe.style==='vampiro')path='M0 65 C15 25 30 0 50 0 C70 0 85 25 100 65 V100 H0 Z';
      else {for(let i=n;i>0;i--){const x0=100*i/n,x1=100*(i-1)/n;path+=recipe.style==='petalos'||recipe.style==='escamas'?` C${x0} 88 ${x1} 100 ${x1} 35`:` L${(x0+x1)/2} 100 L${x1} 35`;}path+=' Z';}
      const band=lined('banda',recipe.kind==='puno'?'Puño de disfraz':'Banda de cuello',path,bandLength,h,count,recipe.style==='vampiro'||recipe.style==='escamas');
      band.marks.push({id:'cierre-a',kind:'cruz',at:{x:20,y:recipe.style==='vampiro'?h*.82:Math.min(15,h*.18)},label:'Velcro: extremo A'},{id:'cierre-b',kind:'cruz',at:{x:bandLength-20,y:recipe.style==='vampiro'?h*.82:Math.min(15,h*.18)},label:'Velcro: extremo B'});
      display('banda',0,0);if(count===2)display('banda',0,h+35);
      material('velcro','Velcro suave de 20 mm',`${count} juego(s) de 4 cm`);
      step('cerrar-banda','Coloca el cierre y prueba el contorno',`Cose un juego de velcro en extremos opuestos de cada banda, sobre las marcas y dentro de la zona firme. El traslape es de 4 cm; al cerrarla, el contorno útil es ${cm(c)}. Prueba sobre la persona y ajusta las marcas antes de coser definitivamente; deja holgura cómoda, especialmente en el cuello.`,[band.id]);
      result.assumptions.push(`El contorno indicado (${cm(c)}) ya es el contorno cómodo terminado que debes medir; no se añade holgura automática. Se agregan 4 cm solo para el traslape.`);
    }
  } else if(recipe.kind==='polaina') {
    const top=c+40,bottom=c*.78+40;
    const d=`M0 0 H100 L${100*(top+bottom)/(2*top)} 100 H${100*(top-bottom)/(2*top)} Z`;
    const gaiter=lined('polaina','Polaina abierta por detrás',d,top,h,2);
    display(gaiter.id,0,0);display(gaiter.id,top+30,0);
    material('velcro','Velcro suave de 20 mm',`4 tramos de ${cm(h*.8)}`);
    step('cerrar-polaina','Ajusta los cierres posteriores',`Mide la pantorrilla sobre el pantalón y comprueba que corresponda al contorno indicado. La parte inferior mide ${cm(c*.78)} de contorno útil; mídela también sobre la ropa y ajusta antes de cortar. Cose el velcro a los dos bordes posteriores de cada polaina, cerrando con 4 cm de traslape. Deja la planta del pie y la suela completamente libres.`,[gaiter.id]);
    result.assumptions.push('Polaina decorativa, sin suela ni pieza bajo el calzado. No protege de agua, calor, cortes o maquinaria. La medida de abajo se comprueba por separado.');
  } else if(recipe.kind==='peto') {
    const path=recipe.style==='escudo'?SHIELD:'M12 0 H88 Q100 0 100 14 V88 Q100 100 88 100 H12 Q0 100 0 88 V14 Q0 0 12 0 Z';
    const chest=lined('pechera','Pechera decorativa',path,w,h,1,true);display(chest.id);
    strapMaterial();
    if(recipe.style==='espacial') {
      lined('panel-grande','Panel superior de consola',RECT,w*.65,h*.22);lined('panel-pequeno','Panel inferior de consola',RECT,w*.28,h*.16);
      const pocket=add('bolsillo','Bolsillo de parche',RECT,w*.28,h*.24);pocket.edges[0].allowance=20;pocket.edges[0].finish='dobladillo';
      display('panel-grande',w*.175,h*.16);display('panel-pequeno',w*.16,h*.53);display('bolsillo',w*.56,h*.5);
      step('aplicar-consola','Aplica la consola y el bolsillo','Pespuntea los paneles ya volteados sobre la pechera, centrando el superior. En el bolsillo dobla su margen superior dos veces 1 cm y pespuntea. Dobla los otros márgenes una vez, aplica junto al panel inferior y cose solo ambos costados y el bajo, dejando abierta la boca.',['pechera','panel-grande','panel-pequeno','bolsillo']);
    }
    step('fijar-peto','Fija los tirantes sin rodear el cuello','Marca dos puntos superiores separados y dos inferiores sobre la pechera. Cose una cinta por hombro, pasando cada una por encima del hombro y debajo de la axila hasta su punto inferior del mismo lado. Prueba la longitud sobre la ropa, deja la apertura con velcro en los extremos inferiores y refuerza cada fijación con un cuadro de pespunte.',['pechera']);
    result.assumptions.push('Pechera de vestuario escénico; no es una armadura ni protección certificada. La medida pertenece al panel delantero, no al contorno de pecho.');
  } else if(recipe.kind==='cinturon') {
    const band=belt('faja',90),body=lined('bolson','Cara del bolsón',RECT,w,h,2),flap=lined('solapa','Solapa del bolsón',SHIELD,w,h*.42);lined('presilla','Presilla para pasar la faja',RECT,45,130,2);
    display(band.id);display(body.id,(c-w)/2,60);display(flap.id,(c-w)/2,60);
    result.seams.push(matched(body,body,'bolson-costados',['e1','e2','e3'],['e1','e2','e3']));
    material('cierre-bolson','Velcro suave para la solapa','1 juego de 4 cm');
    result.steps=result.steps.filter(s=>s.id!=='bolson-caras');
    step('montar-bolson','Monta el bolsón y sus presillas','Une primero las dos caras exteriores derecho con derecho por costados y bajo, sobre la línea de costura. Repite con los dos forros dejando 7 cm de abertura en el bajo. Enfrenta exterior y forro por sus bocas, cose el contorno superior, voltea por la abertura del forro y cierra a mano. Fija la solapa al borde superior de la cara posterior. Cose las presillas en la parte posterior sujetando solo sus extremos; pasa la faja por ambas y prueba la posición antes de colocar el velcro de la solapa.',['bolson','bolson-forro','solapa','presilla','faja'],['bolson-costados']);
  } else {
    // Complete sets combine original inventories with namespaced stable IDs.
    let cursor=0;
    for(const [index,key] of (recipe.parts??[]).entries()) {
      const sub=COSTUME_RECIPES.find(item=>item.id===key)!;
      const scale=w/recipe.width;
      const component=buildCostumeRecipe(sub,{ancho:sub.width*scale,largo:sub.height*(h/recipe.height),contorno:sub.circumference?sub.kind==='puno'?sub.circumference:c:760,margen:sa});
      const prefix=`parte-${index}-`,rename=(id:string)=>prefix+id;
      result.pieces.push(...component.result.pieces.map(p=>({...p,id:rename(p.id),name:`${sub.name} · ${p.name}`})));
      result.seams.push(...component.result.seams.map(s=>({...s,id:rename(s.id),a:s.a.map(x=>({...x,pieceId:rename(x.pieceId)})),b:s.b.map(x=>({...x,pieceId:rename(x.pieceId)}))})));
      result.checks.push(...component.result.checks.map(check=>({...check,key:rename(check.key)})));
      result.steps.push(...component.result.steps.map(s=>({...s,id:rename(s.id),title:`${sub.name}: ${s.title}`,pieces:s.pieces.map(rename),seams:s.seams?.map(rename)})));
      result.materials.push(...component.result.materials.filter(m=>m.id!=='hilo'&&!m.id.startsWith('tela-')).map(m=>({...m,id:rename(m.id),label:`${sub.name} · ${m.label}`})));
      result.assumptions.push(...component.result.assumptions.slice(2).map(s=>`${sub.name}: ${s}`));
      result.notices.push(...component.result.notices.filter(n=>n.level==='error'));
      const boxes=[...component.front,...component.back].map(part=>cmdsBBox(parseSvgPath(costumeDisplayPath(component.result.pieces.find(p=>p.id===part.pieceId)!,part)))),left=Math.min(...boxes.map(b=>b.minX)),right=Math.max(...boxes.map(b=>b.maxX));
      for(const side of ['front','back'] as const) built[side].push(...component[side].map(part=>({...part,pieceId:rename(part.pieceId),x:part.x+cursor-left})));
      cursor+=right-left+100;
    }
    if(recipe.style==='conejo') {
      const tail=lined('cola-redonda','Cola redonda de conejo',OVAL,w*1.3,w*1.3);
      const band=belt();display(tail.id,w*2.8,h*.5);display(band.id,w*2.5,h*.5);
      material('relleno-cola','Relleno ligero para cola','Una pequeña porción');
      step('cola-redonda','Rellena la cola y fija a su cinturilla','Deja una abertura al coser las caras redondas, voltea y rellena suavemente para obtener una almohadilla redonda. Cierra a mano. Cose el centro del reverso a la cinturilla con un cuadro de puntadas pequeñas; prueba el peso y el velcro antes de usar. No se necesita alambre ni otro soporte rígido.',['cola-redonda','cinturilla']);
    }
  }
  const outerToDelay=recipe.kind==='tabardo'&&['punta','robot'].includes(recipe.style)?'delantero':recipe.kind==='cola'&&['dinosaurio','dragon','zorro'].includes(recipe.style)?'cola':recipe.kind==='diadema'&&['conejo','oso'].includes(recipe.style)?'oreja':recipe.kind==='peto'&&recipe.style==='espacial'?'pechera':null;
  if(outerToDelay){const index=result.steps.findIndex(s=>s.id===`${outerToDelay}-caras`);if(index>=0){const [closing]=result.steps.splice(index,1);const lastApplication=result.steps.reduce((last,s,i)=>/^(aplicar-|fijar-crestas)/.test(s.id)?i:last,-1);result.steps.splice(lastApplication+1,0,closing);}}
  // List all cut fabric roles using actual template counts; bought supplies are
  // separate. No universal yardage is invented without a fabric width/layout.
  const roles=['principal','forro','contraste','entretela'] as const;
  for(const role of roles) {
    const selected=result.pieces.filter(p=>p.cut.fabric===role);if(!selected.length)continue;
    const names={principal:'Tela exterior estable',forro:'Tela de reverso o forro',contraste:'Tela de contraste',entretela:'Entretela o refuerzo textil compatible'};
    const count=selected.reduce((n,p)=>n+p.cut.qty,0);
    result.materials.unshift({id:`tela-${role}`,label:names[role],qty:`${count} piezas según plantillas`,note:'Comprueba el acomodo a escala sobre el ancho útil de tu tela antes de comprar; respeta dirección del hilo y del estampado.'});
  }
  if(!['tabardo','chaleco','falda','kit','cinturon','peto'].includes(recipe.kind))built.back=built.back.map(part=>result.pieces.some(p=>p.id===`${part.pieceId}-forro`)?{...part,pieceId:`${part.pieceId}-forro`}:part);
  for(const side of ['front','back'] as const)built[side].sort((a,b)=>Number(/interior|punta|panel-\d|panel-grande|panel-pequeno|bolsillo|emblema/.test(a.pieceId))-Number(/interior|punta|panel-\d|panel-grande|panel-pequeno|bolsillo|emblema/.test(b.pieceId)));
  return built;
}

export const COSTUME_EXPANSION_GENERATORS:PatternGenerator[]=COSTUME_RECIPES.map(recipe=>({
  id:`cosplay-${recipe.id}`,name:recipe.name,summary:recipe.description,status:'experimental',requiredMeasures:[],optionalMeasures:[],
  params:[...(!['cuello','puno','polaina'].includes(recipe.kind)?[{key:'ancho',label:recipe.kind==='falda'?'Ancho de cada panel':recipe.kind==='alas'?'Ancho de cada media ala':'Ancho de la pieza principal',type:'length' as const,group:'diseno' as const,min:recipe.width*.65,max:recipe.width*1.5}]:[]),
    {key:'largo',label:recipe.kind==='kit'?'Largo de referencia del conjunto':'Largo de la pieza principal',type:'length',group:'diseno',min:recipe.height*.65,max:recipe.height*1.5},
    ...recipe.circumference?[{key:'contorno',label:recipe.kind==='cuello'?'Contorno cómodo de cuello':recipe.kind==='puno'?'Contorno cómodo de muñeca':recipe.kind==='polaina'?'Contorno de pantorrilla sobre ropa':'Contorno cómodo de cintura',type:'length' as const,group:'diseno' as const,min:recipe.circumference*.65,max:recipe.circumference*1.5}]:[],
    {key:'margen',label:'Margen de costura',type:'length',group:'margenes',min:3,max:costumeMaxMargin(recipe)}],
  defaults:()=>({ancho:recipe.width,largo:recipe.height,...recipe.circumference?{contorno:recipe.circumference}:{},margen:5}),
  generate:(_ctx:GeneratorContext,params:Params)=>buildCostumeRecipe(recipe,params).result
}));

/** Presentation uses exactly the sewing contours from the corresponding
 * pieces, never creates new cutting geometry or changes saved coordinates. */
export function costumeDisplayPath(p:Piece,part:CostumeDisplayPart):string {
  if(part.displayD)return part.displayD;
  const scale=part.scale??1,box=cmdsBBox(pieceSeamCmds(p));
  const tx=part.x-(part.mirror?-box.maxX:box.minX)*scale,ty=part.y-box.minY*scale;
  return cmdsToSvg(transformCmds(pieceSeamCmds(p),[(part.mirror?-1:1)*scale,0,0,scale,tx,ty]));
}
