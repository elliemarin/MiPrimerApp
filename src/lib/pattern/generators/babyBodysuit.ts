import type { GeneratorContext, GeneratorResult, Params, PatternGenerator } from '../generator';
import { num, round1, str } from '../generator';
import type { Piece, SeamRelation } from '../types';
import { edgeLength, edgesLength } from '../outline';
import { formatLength } from '../../units';

const K = .5522847498307936;
const PLACKET_HALF = 12;
const PLACKET_FACING = 24;
const invalid = (message: string): GeneratorResult => ({ pieces: [], seams: [], checks: [], materials: [], steps: [], assumptions: [], notices: [{ level: 'error', code: 'body-bebe-medidas', message }] });

/** Infant proportions come from infant measures, never a scaled adult block. */
export function babyBodysuitDefaults(ctx: GeneratorContext): Params {
  const chest = ctx.body.pecho ?? 450, hips = ctx.body.cadera ?? 450;
  const width = (Math.max(chest, hips) + 30) / 2;
  const shoulderDrop = Math.max(0, (width - (ctx.body.hombros ?? chest * .4)) / 2);
  const arm = round1((ctx.body.brazo ?? chest * .29) / 2 + 20);
  return {
    tipoManga: 'corta', largo: round1((ctx.body.talleEspalda ?? 160) + (ctx.body.tiro ?? 125) + 30),
    holgura: 30, profundidadSisa: arm,
    largoMangaCorta: round1(Math.max(45, (ctx.body.largoManga ?? 210) * .34)),
    largoMangaLarga: round1(Math.max(90, (ctx.body.largoManga ?? 210) - shoulderDrop)),
    contornoPuno: round1((ctx.body.muneca ?? chest * .26) + 25),
    altoAberturaPierna: round1(Math.min(130, Math.max(65, (ctx.body.muslo ?? hips * .55) * .38))),
    anchoEntrepierna: round1(Math.min(100, Math.max(60, hips * .16))),
    traslapeEntrepierna: 22, anchoRibete: 8, proporcionRibete: .95, margen: 7, dobladilloManga: 15
  };
}

function polygon(id: string, name: string, points: [number, number][], ids: string[], allowance: number, qty = 1, mirrorPairs = false): Piece {
  return { id, name, source: 'generada', nodes: points.map(([x, y], index) => ({ id: `n${index}`, x, y })),
    edges: ids.map((edgeId, index) => ({ id: edgeId, label: edgeId, from: `n${index}`, to: `n${(index + 1) % points.length}`, kind: 'line', allowance, finish: 'costura' })),
    cut: { qty, mirrorPairs, onFold: false, fabric: 'principal' },
    grain: { a: { x: 20, y: 40 }, b: { x: 20, y: 100 } }, notches: [], lines: [], marks: [] };
}
function rectangle(id: string, name: string, width: number, height: number, qty = 1, allowance = 0): Piece {
  const piece = polygon(id, name, [[0,0],[width,0],[width,height],[0,height]], ['largo-superior','extremo-der','largo-inferior','extremo-izq'], allowance, qty);
  piece.grain = { a: { x: width * .2, y: height / 2 }, b: { x: width * .8, y: height / 2 } };
  return piece;
}
const noMargin = (piece: Piece, ids: string[]) => { for (const edge of piece.edges) if (ids.includes(edge.id)) { edge.allowance = 0; edge.finish = 'sin-margen'; } };
const equal = (id: string, label: string, a: SeamRelation['a'], b: SeamRelation['b']): SeamRelation => ({ id, label, a, b, kind: 'igual', ratioMin: .9999, ratioMax: 1.0001, tolerance: .1 });
const length = (piece: Piece, edge: string) => edgeLength(piece, piece.edges.find(item => item.id === edge)!);

export function generateBabyBodysuit(ctx: GeneratorContext, params: Params): GeneratorResult {
  const p = { ...babyBodysuitDefaults(ctx), ...params };
  const chest = ctx.body.pecho ?? 450, hips = ctx.body.cadera ?? 450, neck = ctx.body.cuello ?? 240;
  const ease = num(p, 'holgura'), half = (Math.max(chest, hips) + ease) / 4, width = 2 * half;
  const height = num(p, 'largo'), arm = num(p, 'profundidadSisa'), legHeight = num(p, 'altoAberturaPierna'), hipY = height - legHeight;
  const crotch = num(p, 'anchoEntrepierna'), overlap = num(p, 'traslapeEntrepierna');
  const neckHalf = neck * .19, frontDepth = neck * .20, backDepth = neck * .06;
  const sa = num(p, 'margen'), hem = num(p, 'dobladilloManga'), binding = num(p, 'anchoRibete'), ratio = num(p, 'proporcionRibete');
  const sleeveType = str(p, 'tipoManga', 'corta'), sleeveLength = num(p, sleeveType === 'larga' ? 'largoMangaLarga' : 'largoMangaCorta');
  const cuff = sleeveType === 'larga' ? num(p, 'contornoPuno') : 2 * arm * .9;
  if (!['bebe', 'toddler'].includes(ctx.kind)) return invalid('Este bloque corresponde a bebés y primera infancia. Elige sus meses o medidas; no es un body de adulto.');
  if (ctx.fabric !== 'punto' || ctx.stretch < 20) return invalid('El pañalero necesita punto con al menos 20 % de elasticidad horizontal y buena recuperación. No uses tejido plano con este patrón.');
  if (![chest, hips, neck, ease, height, arm, legHeight, crotch, overlap, sa, hem, binding, ratio, sleeveLength, cuff].every(Number.isFinite)
    || chest < 300 || chest > 700 || hips < 300 || hips > 750 || neck < 180 || neck > 350
    || ease < 10 || ease > 80 || height < 220 || height > 600 || arm < 55 || arm > 170
    || legHeight < 50 || legHeight > 160 || hipY < arm + 35 || neckHalf > half - 25 || frontDepth > arm - 10
    || crotch < 50 || crotch > 120 || crotch > width - 50 || overlap < 16 || overlap > 30
    || sa < 3 || sa > 10 || hem < 10 || hem > 25 || binding < 6 || binding > 12 || ratio < .85 || ratio > 1
    || sleeveLength < 35 || sleeveLength > 400 || cuff < 80 || cuff > 2 * arm || !['corta', 'larga'].includes(sleeveType)) return invalid('Revisa largo, sisa, entrepierna y manga. La abertura de pierna debe quedar por debajo de la axila y el puño no puede superar el contorno de la manga.');

  const front = polygon('delantero', 'Delanteros del pañalero con tapeta (par espejo)',
    [[0,frontDepth],[neckHalf,0],[half,0],[half,arm],[half,hipY],[crotch/2,height],[-PLACKET_HALF,height],[-PLACKET_HALF-PLACKET_FACING,height],[-PLACKET_HALF-PLACKET_FACING,frontDepth],[-PLACKET_HALF,frontDepth]],
    ['cuello','hombro','sisa','costado','pierna','entrepierna','tapeta-inferior','tapeta-exterior','tapeta-superior','cuello-tapeta'],sa,2,true);
  front.edges[0] = { ...front.edges[0], kind:'cubic', c1:{x:neckHalf*K,y:frontDepth}, c2:{x:neckHalf,y:frontDepth*K} };
  // Scoop the leg opening into the body. A convex curve here would create a
  // rounded sack instead of freeing the thigh beside a distinct crotch tab.
  front.edges[4] = { ...front.edges[4], kind:'cubic', c1:{x:half-(half-crotch/2)*.65,y:hipY}, c2:{x:crotch/2,y:height-legHeight*.5} };
  noMargin(front,['cuello','cuello-tapeta','pierna','entrepierna','tapeta-inferior','tapeta-exterior','tapeta-superior']);
  front.edges.find(edge=>edge.id==='tapeta-exterior')!.label='Tapeta integrada: no añadir margen';
  front.lines.push({id:'doblez-tapeta',kind:'doblez',a:{x:-PLACKET_HALF,y:frontDepth},b:{x:-PLACKET_HALF,y:height},label:'Doblar 24 mm hacia el revés'},
    {id:'centro-delantero',kind:'referencia',a:{x:0,y:frontDepth},b:{x:0,y:height},label:'Centro delantero: superponer ambas líneas'},
    {id:'pespunte-tapeta',kind:'pespunte',a:{x:10,y:frontDepth+8},b:{x:10,y:height-8},label:'Fijar vista doblada'});
  front.grain={a:{x:half*.55,y:arm+12},b:{x:half*.55,y:hipY-12}};

  const backHeight = height + overlap;
  const back = polygon('espalda','Espalda completa del pañalero',
    [[0,0],[half-neckHalf,0],[half,backDepth],[half+neckHalf,0],[width,0],[width,arm],[width,hipY],[half+crotch/2,backHeight],[half-crotch/2,backHeight],[0,hipY],[0,arm]],
    ['hombro-izq','cuello-izq','cuello-der','hombro-der','sisa-der','costado-der','pierna-der','entrepierna','pierna-izq','costado-izq','sisa-izq'],sa);
  back.edges[1] = { ...back.edges[1],kind:'cubic',c1:{x:half-neckHalf,y:backDepth*K},c2:{x:half-neckHalf*K,y:backDepth} };
  back.edges[2] = { ...back.edges[2],kind:'cubic',c1:{x:half+neckHalf*K,y:backDepth},c2:{x:half+neckHalf,y:backDepth*K} };
  back.edges[6] = { ...back.edges[6],kind:'cubic',c1:{x:width-(half-crotch/2)*.65,y:hipY},c2:{x:half+crotch/2,y:backHeight-(legHeight+overlap)*.5} };
  back.edges[8] = { ...back.edges[8],kind:'cubic',c1:{x:half-crotch/2,y:backHeight-(legHeight+overlap)*.5},c2:{x:(half-crotch/2)*.65,y:hipY} };
  noMargin(back,['cuello-izq','cuello-der','pierna-der','entrepierna','pierna-izq']);
  back.grain={a:{x:half,y:arm+12},b:{x:half,y:hipY-12}};
  back.lines.push({id:'referencia-entrepierna',kind:'referencia',a:{x:half-crotch/2,y:height},b:{x:half+crotch/2,y:height},label:`Solape de entrepierna: ${formatLength(overlap,'cm')}`});

  const taper=(2*arm-cuff)/2;
  const sleeve=polygon('manga',`Mangas ${sleeveType==='larga'?'largas':'cortas'} del pañalero (par espejo)`,
    [[0,0],[sleeveLength,taper],[sleeveLength,2*arm-taper],[0,2*arm],[0,arm]],
    ['costura-a','puno','costura-b','sisa-espalda','sisa-delantero'],sa,2,true);
  sleeve.edges[1]={...sleeve.edges[1],finish:'dobladillo',allowance:hem,label:'Dobladillo de manga'};
  sleeve.notches.push({id:'hombro',edgeId:'sisa-delantero',s:0,count:1,label:'Centro del hombro'},
    {id:'espalda',edgeId:'sisa-espalda',s:arm/2,count:2,label:'Espalda'});
  sleeve.grain={a:{x:sleeveLength*.2,y:arm},b:{x:sleeveLength*.8,y:arm}};
  const frontSnapCount=Math.max(3,Math.ceil((height-frontDepth-45)/55));
  for(let index=0;index<frontSnapCount;index++) {
    const y=frontDepth+20+(height-frontDepth-55)*index/Math.max(1,frontSnapCount-1);
    front.marks.push({id:`broche-frente-${index}`,kind:'boton',at:{x:0,y},label:`Broche frontal ${index+1}: una mitad en cada delantero`});
  }
  front.marks.push({id:'broche-entrepierna',kind:'boton',at:{x:crotch/4,y:height-overlap/2},label:'Broche de entrepierna: emparejar con espalda'});
  for(const side of [-1,1]) back.marks.push({id:`broche-entrepierna-${side===-1?'izq':'der'}`,kind:'boton',at:{x:half+side*crotch/4,y:height+overlap/2},label:'Broche de entrepierna: emparejar con delantero'});

  const pieces:Piece[]=[front,back,sleeve];
  const seams:SeamRelation[]=[
    equal('hombros','Hombros (dos lados)',[{pieceId:'delantero',edgeIds:['hombro'],factor:2}],[{pieceId:'espalda',edgeIds:['hombro-izq','hombro-der']}]),
    equal('costados','Costados del cuerpo (dos lados)',[{pieceId:'delantero',edgeIds:['costado'],factor:2}],[{pieceId:'espalda',edgeIds:['costado-izq','costado-der']}]),
    equal('sisa-frente','Manga con sisa delantera',[{pieceId:'manga',edgeIds:['sisa-delantero']}],[{pieceId:'delantero',edgeIds:['sisa']}]),
    equal('sisa-espalda','Manga con sisa trasera',[{pieceId:'manga',edgeIds:['sisa-espalda']}],[{pieceId:'espalda',edgeIds:['sisa-der']}]),
    equal('manga-inferior','Costura inferior de cada manga',[{pieceId:'manga',edgeIds:['costura-a']}],[{pieceId:'manga',edgeIds:['costura-b']}])
  ];
  function addBinding(id:string,name:string,source:Piece,edgeIds:string[],qty:number) {
    const pathLength=edgesLength(source,edgeIds), strip=rectangle(id,name,pathLength*ratio,4*binding,qty);
    strip.cut.fabric='punto-elastico';
    for(const edge of strip.edges) if(edge.id.startsWith('extremo'))edge.allowance=sa;
    for(const fraction of [.25,.5,.75])strip.lines.push({id:`pliegue-${fraction}`,kind:'doblez',a:{x:0,y:4*binding*fraction},b:{x:pathLength*ratio,y:4*binding*fraction},label:'Doblar en cuatro; envolver el canto'});
    strip.notes=[`Tira de corte: ancho ${formatLength(4*binding,'cm')}; vista terminada aproximada ${formatLength(binding,'cm')}.`,`Largo entre líneas de extremo: ${formatLength(pathLength*ratio,'cm')}; bordear ${formatLength(pathLength,'cm')} con proporción ${ratio}.`];
    pieces.push(strip);
    seams.push({id:`union-${id}`,label:`${name}: longitud para ribetear`,kind:'estirado',a:[{pieceId:source.id,edgeIds}],b:[{pieceId:id,edgeIds:['largo-superior']}],ratioMin:1/ratio-.001,ratioMax:1/ratio+.001,note:'Repartir por cuartos estirando solo el ribete, sin fruncir el cuerpo.'});
  }
  addBinding('ribete-cuello-delantero','Ribetes del escote delantero',front,['cuello-tapeta','cuello'],2);
  addBinding('ribete-cuello-espalda','Ribete del escote de espalda',back,['cuello-izq','cuello-der'],1);
  addBinding('ribete-inferior-delantero','Ribetes inferiores de los delanteros',front,['pierna','entrepierna'],2);
  addBinding('ribete-inferior-espalda','Ribete inferior de la espalda',back,['pierna-der','entrepierna','pierna-izq'],1);
  const reinforcement = rectangle('refuerzo-tapeta','Refuerzos de las tapetas para broches',18,height-frontDepth-14,2);
  reinforcement.cut.fabric='entretela';
  const crotchReinforcement=rectangle('refuerzo-entrepierna','Refuerzos de los broches de entrepierna',18,20,4);
  crotchReinforcement.cut.fabric='entretela';
  pieces.push(reinforcement,crotchReinforcement);
  const neckline=2*length(front,'cuello')+edgesLength(back,['cuello-izq','cuello-der']);
  const bindingLength=pieces.filter(piece=>piece.cut.fabric==='punto-elastico').reduce((sum,piece)=>sum+(length(piece,'largo-superior')+2*sa)*piece.cut.qty,0);
  return {pieces,seams,checks:[
    {key:'contorno-torso',label:'Contorno terminado de torso sobre pañal',body:Math.max(chest,hips),ease,target:Math.max(chest,hips)+ease,measured:2*front.nodes[2].x+(back.nodes[4].x-back.nodes[0].x),tolerance:.1},
    {key:'largo-frente',label:'Largo delantero desde hombro',target:height,measured:front.nodes[5].y,tolerance:.1},
    {key:'largo-espalda-cerrada',label:'Largo de espalda sin duplicar el solape',target:height,measured:back.nodes[7].y-overlap,tolerance:.1},
    {key:'hombro-total',label:'Paso de manga sin embebido',target:2*arm,measured:edgesLength(sleeve,['sisa-delantero','sisa-espalda']),tolerance:.1},
    {key:'tapeta-solape',label:'Traslape delantero al unir centros',target:2*PLACKET_HALF,measured:2*(front.nodes[0].x-front.nodes[9].x),tolerance:.1}
  ],materials:[
    {id:'tejido-body',label:'Interlock o jersey de algodón',qty:'Según consumo de las piezas y ancho de tu tela',note:'Elasticidad horizontal mínima 20 %, buena recuperación y tacto suave; prelavar. Cadera medida sobre el pañal.'},
    {id:'ribete-body',label:'Rib fino o tira de punto elástico',qty:`${formatLength(bindingLength,'cm')} × ${formatLength(binding*4,'cm')}`,note:'Total de las seis tiras, incluidos extremos. Probar la proporción en un retazo antes de coser.'},
    {id:'broches-body',label:'Broches de presión aptos para tejido infantil',qty:`${frontSnapCount+2} juegos completos`,note:`${frontSnapCount} pares para el frente y dos para entrepierna. Colocar sobre refuerzos y comprobar su anclaje; no usar botones sueltos ni cordones.`},
    {id:'refuerzos-body',label:'Entretela suave de punto para broches',qty:'Dos tiras de tapeta y cuatro refuerzos pequeños',note:'Seguir la recomendación del fabricante del broche y probar que no rasgue el punto.'},
    {id:'hilo',label:'Hilo y aguja para punto',qty:'1 carrete',note:'Puntada elástica o zigzag estrecho; remates suaves por el interior.'}
  ],assumptions:[
    'Body de hombro caído, apertura frontal completa y broches en entrepierna. No es un cuello envolvente ni un mameluco con piernas.',
    `Largo de referencia = talle de espalda + tiro sobre pañal + 3 cm. Verifica el parámetro Largo hombro–entrepierna con el bebé antes de cortar; actualmente ${formatLength(height,'cm')}.`,
    'La holgura del contorno se añade una sola vez; el pañal ya se incluye en la medida de cadera. Las tapetas integradas no aumentan el contorno cuando se superponen los centros.',
    `El escote cerrado mide aproximadamente ${formatLength(neckline,'cm')} sobre sus cantos sin ribete. Para vestir se abren los broches del frente; no se exige pasar la cabeza por el escote cerrado.`,
    'El ribete envuelve el canto, que no lleva margen. Sus seis tiras son piezas auxiliares, no partes nuevas de la prenda para decorar.',
    'Construcción experimental: comprobar impresión, ajuste, movilidad, presión de los ribetes y broches en una muestra antes de utilizarla.'
  ],steps:[
    {id:'preparar',title:'Comprueba talla, tejido y largo',detail:'Mide pecho y cadera sobre pañal; contrasta el largo hombro–entrepierna con una prenda que ajuste. Prueba elasticidad y recuperación. Imprime al 100 %, revisa el control de escala y corta dos delanteros y dos mangas en espejo, una espalda completa y los ribetes/refuerzos indicados.',pieces:pieces.map(piece=>piece.id)},
    {id:'tapetas',title:'Prepara las tapetas y sus refuerzos',detail:'Marca el centro delantero y el doblez. Coloca cada tira de refuerzo por el revés, bajo la línea de broches. Remata el canto vertical exterior; dóblalo 24 mm hacia dentro por la línea a 12 mm del centro. La vista doblada llega 12 mm al interior del cuerpo. Hilvana y pespuntea por la línea marcada; los centros se superponen al cerrar.',pieces:['delantero','refuerzo-tapeta']},
    {id:'ribetes',title:'Ribetea cuello y bordes inferiores',detail:'Con las tapetas ya dobladas, mide los cantos terminados. Dobla cada tira en cuatro a lo largo, envolviendo el canto sin añadir margen al cuerpo. Distribuye por cuartos y estira solo el ribete. Reserva el margen de extremo indicado para las uniones; en extremos libres de tapeta dóblalo hacia dentro. Los ribetes inferiores van por cada delantero y por la espalda antes de cerrar los costados.',pieces:['delantero','espalda','ribete-cuello-delantero','ribete-cuello-espalda','ribete-inferior-delantero','ribete-inferior-espalda']},
    {id:'hombros',title:'Une hombros y coloca mangas en plano',detail:'Junta cada delantero con la espalda derecho con derecho. Une los hombros y remata los márgenes sin estirar el escote. Centra cada manga sobre su hombro: piquete doble a espalda. Cose su borde recto desde axila delantera hasta trasera, haciendo coincidir las marcas.',pieces:['delantero','espalda','manga'],seams:['hombros','sisa-frente','sisa-espalda']},
    {id:'costados',title:'Cierra costados y bajos de manga',detail:'Dobla la prenda derecho con derecho. Cose en cada lado desde el puño por la costura inferior de manga y el costado hasta el inicio del ribete inferior. Remata los márgenes y asegura los extremos de ribete dentro de la costura. Dobla el margen del puño hacia el revés y cose con puntada elástica.',pieces:['delantero','espalda','manga'],seams:['costados','manga-inferior']},
    {id:'broches',title:'Refuerza y coloca los broches',detail:`Superpone las líneas de centro de los delanteros y empareja cada marca frontal. En entrepierna, superpone ${formatLength(overlap,'cm')} de la espalda bajo el delantero y empareja las dos marcas. Coloca un refuerzo bajo cada marca de entrepierna y aplica los juegos de broches siguiendo la herramienta del fabricante. Comprueba apertura, cierre y resistencia sin que el tejido se rasgue.`,pieces:['delantero','espalda','refuerzo-tapeta','refuerzo-entrepierna']},
    {id:'comprobar',title:'Revisa el body con el pañal puesto',detail:'Comprueba que los broches cierren sin tirar del cuello, que haya espacio para el pañal y movimiento de piernas y brazos, y que los ribetes no aprieten. Retira hilos sueltos y revisa cada broche. Ajusta el largo o la holgura y cose otra muestra si fuera necesario.',pieces:['delantero','espalda','manga']}
  ],notices:[{level:'aviso',code:'body-bebe-experimental',message:'Pañalero experimental: revisa largo sobre pañal, comodidad de los ribetes y montaje de broches en una muestra.'}]};
}

export const babyBodysuitGenerator:PatternGenerator={
  id:'body-bebe-broches',name:'Pañalero de punto con broches delanteros',summary:'Body infantil con tapetas integradas, ribetes y apertura de entrepierna; manga corta o larga.',status:'experimental',
  requiredMeasures:['pecho','cadera','cuello','talleEspalda','tiro'],optionalMeasures:['estatura','hombros','brazo','largoManga','muneca','muslo'],
  defaults:babyBodysuitDefaults,generate:generateBabyBodysuit,
  params:[
    {key:'tipoManga',label:'Manga',group:'diseno',type:'choice',choices:[{value:'corta',label:'Manga corta'},{value:'larga',label:'Manga larga'}]},
    {key:'largo',label:'Largo hombro–entrepierna',group:'diseno',type:'length',min:220,max:600,help:'Largo de referencia calculado con talle y tiro. Compruébalo sobre pañal o sobre un body que ajuste.'},
    {key:'holgura',label:'Holgura total de torso',group:'holgura',type:'length',min:10,max:80},
    {key:'profundidadSisa',label:'Profundidad de sisa',group:'diseno',type:'length',min:55,max:170},
    {key:'largoMangaCorta',label:'Largo de manga corta',group:'diseno',type:'length',min:35,max:160,when:p=>p.tipoManga!=='larga'},
    {key:'largoMangaLarga',label:'Largo de manga larga',group:'diseno',type:'length',min:90,max:400,when:p=>p.tipoManga==='larga'},
    {key:'contornoPuno',label:'Contorno de puño de manga larga',group:'diseno',type:'length',min:80,max:260,when:p=>p.tipoManga==='larga'},
    {key:'altoAberturaPierna',label:'Alto de abertura de pierna',group:'diseno',type:'length',min:50,max:160},
    {key:'anchoEntrepierna',label:'Ancho de entrepierna',group:'diseno',type:'length',min:50,max:120},
    {key:'traslapeEntrepierna',label:'Traslape de entrepierna',group:'diseno',type:'length',min:16,max:30},
    {key:'anchoRibete',label:'Ancho visible del ribete',group:'diseno',type:'length',min:6,max:12},
    {key:'proporcionRibete',label:'Proporción del ribete',group:'diseno',type:'ratio',min:.85,max:1,help:'0,95 significa una tira de 95 cm por cada metro de canto; prueba la recuperación de tu punto.'},
    {key:'margen',label:'Margen de costuras',group:'margenes',type:'length',min:3,max:10},
    {key:'dobladilloManga',label:'Dobladillo de manga',group:'margenes',type:'length',min:10,max:25}
  ]
};
