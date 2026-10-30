import type { GeneratorContext, GeneratorResult, Params, PatternGenerator } from '../generator';
import { isChild, num, round1, str } from '../generator';
import type { Issue, Piece, SeamRelation } from '../types';
import { edgeLength } from '../outline';
import { cubicLength } from '../../geom/bezier';
import { formatLength } from '../../units';

const K = .5522847498307936;

/** Quarter-ellipse neck: the same cubic is used to solve defaults and cut pieces. */
function halfNeckLength(width: number, depth: number, back = false): number {
  return cubicLength({ p0: { x: -width / 2, y: 0 }, c1: { x: back ? -width*.4 : -width/2, y: depth * (back ? .72 : K) }, c2: { x: back ? -width*.22 : -width*K/2, y: depth }, p3: { x: 0, y: depth } });
}

function defaultFrontDepth(head: number, width: number, back: number): number {
  const target = head + 30;
  let lo = 20, hi = head * .48;
  for (let i = 0; i < 48; i++) {
    const mid = (lo + hi) / 2;
    if (2 * (halfNeckLength(width, mid) + halfNeckLength(width, back, true)) < target) lo = mid;
    else hi = mid;
  }
  // Round up to preserve the guaranteed head opening after UI-sized defaults.
  return Math.ceil(hi * 10) / 10;
}

export function hoodieDefaults(ctx: GeneratorContext): Params {
  const child = isChild(ctx.kind), body = ctx.body;
  const base = Math.max(body.pecho ?? 920, body.cadera ?? 1000);
  const head = body.cabeza ?? (child ? 520 : 580);
  const ease = Math.max(child ? 100 : 160, base * (ctx.fit === 'oversize' ? .35 : ctx.fit === 'holgado' ? .25 : .18));
  const width = (base + ease) / 2;
  const shoulder = body.hombros ?? (child ? 280 : 400);
  const neckWidth = round1(head * .39);
  const backDepth = round1(head * .045);
  return {
    capucha: 'si', largo: round1((body.estatura ?? (child ? 1160 : 1640)) * .42), holgura: round1(ease),
    profundidadSisa: round1(Math.max(child ? 110 : 170, (body.brazo ?? (child ? 220 : 310)) / 2 + (child ? 40 : 55))),
    largoManga: round1(Math.max(child ? 100 : 180, (body.largoManga ?? (child ? 420 : 600)) - Math.max(0, (width - shoulder) / 2))),
    anchoPuno: round1((body.muneca ?? (child ? 150 : 170)) + (child ? 65 : 85)),
    escoteAncho: neckWidth, escoteDelante: defaultFrontDepth(head, neckWidth, backDepth),
    altoCapucha: round1(head * .62), margen: 10, dobladillo: 20
  };
}

function polygon(id: string, name: string, points: [number, number][], edgeIds: string[], sa: number, qty = 1, mirrorPairs = false): Piece {
  return {
    id, name, source: 'generada', nodes: points.map(([x, y], i) => ({ id: `n${i}`, x, y })),
    edges: edgeIds.map((edgeId, i) => ({ id: edgeId, label: edgeId, kind: 'line', from: `n${i}`, to: `n${(i + 1) % points.length}`, allowance: sa, finish: 'costura' })),
    grain: { a: { x: 20, y: 40 }, b: { x: 20, y: 120 } },
    cut: { qty, mirrorPairs, onFold: false, fabric: 'principal' }, notches: [], marks: [], lines: []
  };
}

function bodyPanel(id: string, name: string, width: number, height: number, neckWidth: number, depth: number, arm: number, sa: number, hem: number, hood: boolean): Piece {
  const nl = (width - neckWidth) / 2, nr = (width + neckWidth) / 2;
  const piece = polygon(id, name, [[0,0],[nl,0],[width/2,depth],[nr,0],[width,0],[width,arm],[width,height],[0,height],[0,arm]],
    ['hombro-izq','cuello-izq','cuello-der','hombro-der','sisa-der','costado-der','bajo','costado-izq','sisa-izq'],sa);
  piece.edges[1] = { ...piece.edges[1], kind: 'cubic', c1: { x: nl, y: depth*K }, c2: { x: width/2-neckWidth*K/2, y: depth } };
  piece.edges[2] = { ...piece.edges[2], kind: 'cubic', c1: { x: width/2+neckWidth*K/2, y: depth }, c2: { x: nr, y: depth*K } };
  // A shallow quarter ellipse would turn too sharply at the shoulder for its
  // seam allowance. The back neck meets the shoulder obliquely and stays broad.
  if(id==='espalda') {
    piece.edges[1]={...piece.edges[1],c1:{x:nl+neckWidth*.1,y:depth*.72},c2:{x:width/2-neckWidth*.22,y:depth}};
    piece.edges[2]={...piece.edges[2],c1:{x:width/2+neckWidth*.22,y:depth},c2:{x:nr-neckWidth*.1,y:depth*.72}};
  }
  const names: Record<string,string> = { 'hombro-izq':'Hombro izquierdo', 'hombro-der':'Hombro derecho', 'cuello-izq':'Escote izquierdo', 'cuello-der':'Escote derecho', 'sisa-der':'Sisa derecha', 'sisa-izq':'Sisa izquierda', 'costado-der':'Costado derecho', 'costado-izq':'Costado izquierdo', bajo:'Dobladillo inferior' };
  for (const edge of piece.edges) {
    edge.label = names[edge.id];
    if (edge.id === 'bajo') { edge.finish = 'dobladillo'; edge.allowance = hem; }
    if (!hood && edge.id.startsWith('cuello')) { edge.finish = 'sin-margen'; edge.allowance = 0; edge.label += ' (bies)'; }
  }
  piece.grain = { a: { x: width*.73, y: height*.34 }, b: { x: width*.73, y: height*.8 } };
  piece.marks.push({ id: 'centro-escote', kind: 'cruz', at: { x: width/2, y: depth }, label: id === 'delantero' ? 'Centro delantero' : 'Centro espalda' });
  return piece;
}

const length = (piece: Piece, edgeId: string) => edgeLength(piece,piece.edges.find(edge=>edge.id===edgeId)!);
const equal = (id: string, label: string, a: SeamRelation['a'], b: SeamRelation['b']): SeamRelation => ({ id,label,kind:'igual',a,b,ratioMin:.9999,ratioMax:1.0001,tolerance:.2 });

export function generateHoodie(ctx: GeneratorContext, params: Params): GeneratorResult {
  const defaults = hoodieDefaults(ctx), p = { ...defaults, ...params };
  const base = Math.max(ctx.body.pecho ?? 920,ctx.body.cadera ?? 1000), head=ctx.body.cabeza ?? (isChild(ctx.kind)?520:580);
  const ease=num(p,'holgura'), width=(base+ease)/2, height=num(p,'largo'), arm=num(p,'profundidadSisa');
  const neck=num(p,'escoteAncho'), frontDepth=num(p,'escoteDelante'), backDepth=round1(head*.045);
  const sa=num(p,'margen'), hem=num(p,'dobladillo'), withHood=str(p,'capucha','si')==='si';
  const front=bodyPanel('delantero','Delantero completo de sudadera',width,height,neck,frontDepth,arm,sa,hem,withHood);
  const back=bodyPanel('espalda','Espalda completa de sudadera',width,height,neck,backDepth,arm,sa,hem,withHood);
  const sleeveLength=num(p,'largoManga'), cuff=num(p,'anchoPuno'), taper=(2*arm-cuff)/2;
  const sleeve=polygon('manga','Mangas de hombro caído en par',[[0,0],[sleeveLength,taper],[sleeveLength,2*arm-taper],[0,2*arm],[0,arm]],
    ['inferior-a','puno','inferior-b','sisa-espalda','sisa-frente'],sa,2,true);
  sleeve.edges[1] = { ...sleeve.edges[1], label:'Puño con dobladillo', finish:'dobladillo', allowance:hem };
  sleeve.edges[0].label='Costura inferior A'; sleeve.edges[2].label='Costura inferior B';
  sleeve.edges[3].label='Sisa de espalda'; sleeve.edges[4].label='Sisa delantera';
  sleeve.grain={a:{x:sleeveLength*.15,y:arm},b:{x:sleeveLength*.85,y:arm}};
  sleeve.notches=[{id:'hombro',edgeId:'sisa-espalda',s:arm,count:1,label:'Hombro'},{id:'espalda',edgeId:'sisa-espalda',s:arm*.5,count:2,label:'Espalda'}];
  back.notches=[{id:'manga-espalda',edgeId:'sisa-der',s:arm*.5,count:2,label:'Espalda'},{id:'manga-espalda-izq',edgeId:'sisa-izq',s:arm*.5,count:2,label:'Espalda'}];
  const pieces:Piece[]=[front,back,sleeve];
  const seams:SeamRelation[]=[
    equal('hombros','Hombros del delantero con espalda',[{pieceId:'delantero',edgeIds:['hombro-izq','hombro-der']}],[{pieceId:'espalda',edgeIds:['hombro-izq','hombro-der']}]),
    equal('costados','Cada costado del cuerpo',[{pieceId:'delantero',edgeIds:['costado-der']}],[{pieceId:'espalda',edgeIds:['costado-der']}]),
    equal('manga-frente','Cada manga con la sisa delantera',[{pieceId:'manga',edgeIds:['sisa-frente']}],[{pieceId:'delantero',edgeIds:['sisa-der']}]),
    equal('manga-espalda','Cada manga con la sisa trasera',[{pieceId:'manga',edgeIds:['sisa-espalda']}],[{pieceId:'espalda',edgeIds:['sisa-der']}]),
    equal('inferior-manga','Cada costura inferior de manga',[{pieceId:'manga',edgeIds:['inferior-a']}],[{pieceId:'manga',edgeIds:['inferior-b']}])
  ];
  const frontHalf=length(front,'cuello-der'),backHalf=length(back,'cuello-der'),opening=2*(frontHalf+backHalf);
  if(withHood) {
    const baseLength=opening/2, hoodHeight=num(p,'altoCapucha'), rise=Math.min(30,head*.05), hoodWidth=Math.sqrt(Math.max(1,baseLength*baseLength-rise*rise)), radius=hoodHeight*.3;
    const hood=polygon('capucha','Laterales de capucha en par simétrico',[[0,hoodHeight],[hoodWidth,hoodHeight-rise],[hoodWidth,radius],[0,0]],
      ['base-cuello','centro-espalda','coronilla','boca'],sa,2,true);
    hood.edges[0].label='Base de capucha al cuello'; hood.edges[1].label='Centro trasero de capucha'; hood.edges[2].label='Coronilla';
    hood.edges[2]={...hood.edges[2],kind:'cubic',c1:{x:hoodWidth,y:0},c2:{x:hoodWidth*.4,y:0}};
    hood.edges[3]={...hood.edges[3],label:'Boca de capucha: doble dobladillo',finish:'dobladillo',allowance:hem};
    hood.grain={a:{x:hoodWidth*.48,y:hoodHeight*.25},b:{x:hoodWidth*.48,y:hoodHeight*.78}};
    hood.notches=[{id:'hombro',edgeId:'base-cuello',s:frontHalf,count:1,label:'Hombro: separar cuello delantero y espalda'}];
    hood.marks=[{id:'centro-delante',kind:'cruz',at:{x:0,y:hoodHeight},label:'Centro delantero'},{id:'centro-espalda',kind:'cruz',at:{x:hoodWidth,y:hoodHeight-rise},label:'Centro espalda'}];
    pieces.push(hood);
    seams.push(equal('capucha-centro','Dos caras de la capucha por centro y coronilla',[{pieceId:'capucha',edgeIds:['centro-espalda','coronilla']}],[{pieceId:'capucha',edgeIds:['centro-espalda','coronilla']}]),
      equal('capucha-cuello','Base completa de capucha con escote completo',[{pieceId:'capucha',edgeIds:['base-cuello'],factor:2}],[{pieceId:'delantero',edgeIds:['cuello-izq','cuello-der']},{pieceId:'espalda',edgeIds:['cuello-izq','cuello-der']}]))
  }
  const notices:Issue[]=[{level:'aviso',code:'hoodie-experimental',message:'Sudadera experimental de hombro caído: imprime y cose una muestra antes de cortar la tela definitiva.'}];
  if(ease<Math.max(80,base*.1)||height<=arm+60||neck<=60||neck>=width-80||frontDepth<=20||frontDepth>=height-60||arm<=60||sleeveLength<80||cuff<80||cuff>2*arm+150||sa<3||sa>20||hem<10||hem>40) notices.push({level:'error',code:'hoodie-proporciones',message:'Revisa escote, holgura, largo, sisa, manga y márgenes: deben dejar hombros y costados útiles.'});
  if(opening<head+20 || Math.min(neck,frontDepth+backDepth)<head/Math.PI*.65) notices.push({level:'error',code:'hoodie-paso-cabeza',message:'El escote no deja paso suficiente para la cabeza. Amplía ancho o profundidad y prueba la abertura antes de coser la capucha.'});
  if(withHood && (num(p,'altoCapucha')<head*.48||num(p,'altoCapucha')>head*.9)) notices.push({level:'error',code:'hoodie-capucha-alto',message:'El alto de capucha debe quedar entre 48 % y 90 % del contorno de cabeza; comprueba su volumen en una muestra.'});
  if(ctx.fabric==='plano') notices.push({level:'aviso',code:'hoodie-tejido',message:'La base se recomienda en punto estable o felpa; en tejido plano necesita prueba de movilidad y remate con bies sin fruncir el cuello.'});
  if(ctx.body.muneca && cuff<ctx.body.muneca+50) notices.push({level:'aviso',code:'hoodie-paso-mano',message:'Comprueba que pase la mano por el puño. Su contorno es terminado y no se reduce por elasticidad.'});
  return {pieces,seams,checks:[
    {key:'contorno',label:'Contorno de cuerpo terminado',body:base,ease,target:base+ease,measured:length(front,'bajo')+length(back,'bajo'),tolerance:.1},
    {key:'largo',label:'Largo desde hombro',target:height,measured:front.nodes.find(node=>node.id==='n6')!.y,tolerance:.1},
    {key:'puno',label:'Contorno terminado de puño',target:cuff,measured:length(sleeve,'puno'),tolerance:.1},
    {key:'cuello',label:'Perímetro de escote terminado',target:opening,measured:frontHalf*2+backHalf*2,tolerance:.1},
    ...(withHood?[{key:'capucha-base',label:'Base de capucha sobre escote',target:opening,measured:length(pieces[3],'base-cuello')*2,tolerance:.1}]:[])
  ],materials:[{id:'hilo',label:'Hilo de coser adecuado al tejido',qty:'1 carrete'},
    {id:'cinta-hombro',label:'Cinta ligera de estabilización de hombros',qty:formatLength(length(front,'hombro-izq')*2+50,'cm'),note:'No estirar al colocar.'},
    ...(!withHood?[{id:'bies-cuello',label:'Bies flexible de 18–25 mm para escote',qty:formatLength(opening+150,'cm'),note:'Cuello sin banda de rib; se remata el borde sin margen de costura.'}]:[])
  ],assumptions:[
    'Sudadera cerrada de hombro caído y holgura positiva. No incluye cremallera, rib elástico, pinzas ni manga de copa montada.',
    `El contorno terminado es el mayor de pecho y cadera más ${formatLength(ease,'cm')} una sola vez; los márgenes se añaden fuera.`,
    `Escote deliberadamente amplio: su abertura terminada mide ${formatLength(opening,'cm')} para una cabeza de ${formatLength(head,'cm')}. No se supone que la tela se estire para permitir el paso.`,
    withHood?'Capucha de dos laterales, sin forro ni cordón. Su base inclinada coincide exactamente con el escote; el piquete divide la porción delantera y trasera.':'Versión sin capucha con escote curvo ribeteado; no equivale a un cuello de rib ajustado.',
    'La forma y movilidad deben comprobarse cosiendo una muestra. El ajuste del puño necesita prueba de paso de mano; el contorno de muñeca no mide la mano.'
  ],steps:[
    {id:'cortar',title:'Corta y marca las piezas',detail:`Corta un delantero completo, una espalda completa y dos mangas en espejo.${withHood?' Corta dos laterales de capucha en espejo.':''} Conserva el hilo y transfiere centros y piquetes. Borda y monta bolsillos sobre el cuerpo abierto.`,pieces:pieces.map(piece=>piece.id)},
    {id:'hombros',title:'Une y estabiliza los hombros',detail:'Junta delantero y espalda derecho con derecho. Cose ambos hombros por la línea marcada colocando cinta de estabilización sin estirar.',pieces:['delantero','espalda'],seams:['hombros']},
    {id:'mangas',title:'Monta las mangas con el cuerpo abierto',detail:'Centra cada manga sobre el hombro, relaciona el piquete doble con la espalda y cose de la axila delantera a la trasera sin estirar.',pieces:['delantero','espalda','manga'],seams:['manga-frente','manga-espalda']},
    {id:'costados',title:'Cierra mangas y costados',detail:'Dobla la prenda derecho con derecho, relaciona las uniones de axila y cose desde cada puño hasta el bajo, siguiendo el margen de cada borde. Remata los márgenes.',pieces:['delantero','espalda','manga'],seams:['costados','inferior-manga']},
    ...(withHood?[
      {id:'capucha-formar',title:'Arma la capucha y remata la boca',detail:'Junta los laterales derecho con derecho. Cose centro trasero y coronilla; remata y plancha el margen hacia un lado. Dobla la boca en dos mitades del margen indicado, hilvana y pespuntea antes de unirla al cuello.',pieces:['capucha'],seams:['capucha-centro']},
      {id:'capucha-montar',title:'Relaciona centros y une la capucha al cuello',detail:'Con la capucha del derecho dentro del cuerpo del revés, junta sus derechos: los dos extremos de boca se encuentran en el centro delantero, la costura trasera coincide con centro espalda y cada piquete con un hombro. Cose por la línea de escote sin fruncir ni añadir margen extra. Comprueba el paso de cabeza y la movilidad antes del pespunte final.',pieces:['delantero','espalda','capucha'],seams:['capucha-cuello']}
    ]:[{id:'cuello-bies',title:'Ribetea el escote sin capucha',detail:'Coloca bies flexible alrededor del escote curvo, sin estirar el cuerpo ni cerrar su abertura. Une los extremos y pespuntea; el escote no lleva margen añadido.',pieces:['delantero','espalda']}]),
    {id:'dobladillos',title:'Comprueba el largo y termina los bajos',detail:'Prueba el largo de cuerpo y mangas. Dobla cada margen en dos mitades hacia el revés, hilvana y pespuntea con puntada adecuada al tejido, sin cambiar la línea terminada.',pieces:['delantero','espalda','manga']}
  ],notices};
}

export const hoodieGenerator:PatternGenerator={
  id:'sudadera-capucha-holgada',name:'Sudadera holgada con capucha de dos piezas',summary:'Pulóver de hombro caído, escote curvo amplio y capucha con base verificada.',status:'experimental',
  requiredMeasures:['pecho','cadera','cabeza'],optionalMeasures:['estatura','hombros','brazo','largoManga','muneca'],defaults:hoodieDefaults,generate:generateHoodie,
  params:[
    {key:'capucha',label:'Cuello',group:'diseno',type:'choice',choices:[{value:'si',label:'Con capucha de dos piezas'},{value:'no',label:'Sin capucha, escote con bies'}]},
    {key:'largo',label:'Largo desde hombro',group:'diseno',type:'length',min:250,max:1100},
    {key:'holgura',label:'Holgura total de pecho o cadera',group:'holgura',type:'length',min:80,max:600},
    {key:'profundidadSisa',label:'Profundidad de sisa recta',group:'diseno',type:'length',min:80,max:400},
    {key:'largoManga',label:'Largo desde hombro caído',group:'diseno',type:'length',min:80,max:700},
    {key:'anchoPuno',label:'Contorno de puño terminado',group:'diseno',type:'length',min:100,max:650},
    {key:'escoteAncho',label:'Ancho terminado de escote',group:'diseno',type:'length',min:100,max:350},
    {key:'escoteDelante',label:'Profundidad de escote delantero',group:'diseno',type:'length',min:40,max:300},
    {key:'altoCapucha',label:'Alto frontal de capucha',group:'diseno',type:'length',min:180,max:550,when:p=>p.capucha!=='no'},
    {key:'margen',label:'Margen de costura',group:'margenes',type:'length',min:3,max:20},
    {key:'dobladillo',label:'Margen de dobladillos',group:'margenes',type:'length',min:10,max:40}
  ]
};
