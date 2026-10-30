import type { CatalogModel, Recipient } from './catalog';
import type { FlatSpec, TopOpts, JacketStyle } from './flats';
import type { Params } from '../lib/pattern/generator';

const adult: Recipient[]=['mujer','hombre','unisex'];
function model(id:string,name:string,type:CatalogModel['type'],sub:string,flat:FlatSpec,extra:Partial<CatalogModel>={}):CatalogModel {
  return {id,name,type,sub,flat,recipients:adult,difficulty:2,fabrics:['plano'],stretch:'ninguna',fits:['holgado'],techniques:['costura-recta','dobladillo'],status:'pendiente',description:'Diseño de referencia con zonas editables para explorar telas y bordados. Su patrón de confección todavía no se genera.',variants:[],recommendedFabrics:['Lino','Algodón','Gabardina ligera'],materials:['Hilo'],...extra};
}
function top(style:JacketStyle,length:number,opts:Partial<TopOpts>={}):FlatSpec {
  return {family:'top',top:{style,type:'chaqueta',sleeve:'larga',neck:'redondo',closure:'ninguno',length,fit:1.12,...opts}};
}
const jacketRows: [string,string,JacketStyle,number,Partial<TopOpts>,string[]][]=[
  ['bomber-clasica','Chaqueta bomber','bomber',620,{neck:'alto',closure:'cierre',cuffs:true,hemBand:true},['Satén','Nailon','Gabardina']],
  ['bomber-corta','Bomber corta a la cintura','bomber',480,{neck:'alto',closure:'cierre',cuffs:true,hemBand:true,fit:1.18},['Satén','Denim ligero']],
  ['cazadora-mezclilla','Cazadora de mezclilla con canesú','denim',630,{neck:'camisa',closure:'botones',pocket:'pecho',fit:1.08},['Mezclilla rígida','Sarga']],
  ['cazadora-denim-corta','Cazadora denim corta','denim',460,{neck:'camisa',closure:'botones',fit:1.2},['Mezclilla','Pana fina']],
  ['sobrecamisa-leñadora','Sobrecamisa de cuadros','shacket',800,{neck:'camisa',closure:'botones',pocket:'pecho',fit:1.25},['Franela','Lana ligera']],
  ['sobrecamisa-corta','Sobrecamisa corta de trabajo','shacket',610,{neck:'camisa',closure:'botones',pocket:'parche',fit:1.18},['Lona ligera','Gabardina']],
  ['gabardina-cruzada','Gabardina trench cruzada','trench',1120,{neck:'solapa',closure:'botones',pocket:'parche',fit:1.1},['Gabardina','Popelina compacta']],
  ['trench-corto','Trench corto con cinturón','trench',780,{neck:'solapa',closure:'botones',fit:1.12},['Gabardina','Sarga']],
  ['chaqueta-acolchada','Chaqueta acolchada de líneas horizontales','acolchada',700,{neck:'alto',closure:'cierre',pocket:'parche',fit:1.22},['Nailon','Tela acolchada']],
  ['chaleco-acolchado','Chaleco acolchado','acolchada',660,{type:'chaleco',sleeve:'sin',neck:'alto',closure:'cierre',fit:1.2},['Tela acolchada','Nailon']],
  ['abrigo-acolchado-largo','Abrigo acolchado largo','acolchada',1120,{neck:'capucha',closure:'cierre',pocket:'parche',fit:1.3},['Tela acolchada','Nailon']],
  ['chaqueta-biker','Chaqueta biker asimétrica','biker',570,{neck:'solapa',closure:'cierre',fit:1.04},['Piel sintética','Denim']],
  ['chaqueta-safari','Chaqueta safari de bolsillos','safari',780,{neck:'camisa',closure:'botones',pocket:'parche',fit:1.14},['Gabardina','Lino grueso']],
  ['chaqueta-varsity','Chaqueta universitaria varsity','varsity',650,{neck:'alto',closure:'botones',cuffs:true,hemBand:true,fit:1.15},['Paño','Punto compacto']],
  ['anorak-canguro','Anorak de medio cierre','anoraq',750,{neck:'capucha',closure:'ninguno',fit:1.3},['Nailon','Taslán']],
  ['parka-capucha','Parka larga con jareta','parka',980,{neck:'capucha',closure:'cierre',pocket:'parche',fit:1.25},['Gabardina','Taslán']],
  ['bolero-corto','Bolero corto de manga tres cuartos','bolero',340,{neck:'redondo',sleeve:'tres-cuartos',fit:1.02},['Crepé','Satén']],
  ['capa-circular','Capa circular con abertura','capa',850,{sleeve:'sin',closure:'botones',fit:1},['Paño','Lana']],
  ['capa-capucha','Capa con capucha','capa',1050,{sleeve:'sin',neck:'capucha',closure:'botones',fit:1.1},['Lana','Paño']],
  ['poncho-capucha-inspiracion','Poncho con capucha y bolsillos','poncho',850,{sleeve:'sin',neck:'capucha',pocket:'parche',fit:1.1},['Polar','Lana ligera']]
];
const jacketInspiration=jacketRows.map(([id,name,style,length,opts,fabrics])=>model(id,name,'abrigo','Chaquetas por estilo',top(style,length,opts),{recommendedFabrics:fabrics,techniques:['forro','bolsillos','dobladillo',...(opts.closure==='cierre'?['cierre' as const]:opts.closure==='botones'?['botones' as const]:[])],difficulty:3,description:`${name}: silueta, cierres y zonas de referencia para probar materiales. Falta desarrollar y comprobar su patrón específico; no usa el motor de haori como sustituto.`}));

const relaxedRows:[string,string,number,number,TopOpts['sleeve'],number][]=[
 ['haori-corto','Haori corto de hombro caído',600,1.1,'larga',350],
 ['haori-largo','Haori largo abierto',950,1.16,'larga',380],
 ['haori-manga-corta','Haori de manga corta amplia',650,1.18,'corta',220],
 ['kimono-ligero','Chaqueta tipo kimono ligera',780,1.22,'tres-cuartos',300],
 ['cardigan-recto','Cárdigan recto sin cierre',740,1.1,'larga',430],
 ['cardigan-maxi','Cárdigan largo y holgado',1150,1.18,'larga',450],
 ['chaleco-haori','Chaleco abierto de hombro caído',780,1.12,'sin',0],
 ['chaqueta-caja-amplia','Chaqueta caja amplia',550,1.34,'tres-cuartos',280]
];
const relaxed=relaxedRows.map(([id,name,length,fit,sleeve,sleeveLen])=>model(id,name,'abrigo','Hombro caído · patrón editable',top(id.startsWith('cardigan')?'cardigan':'haori',length,{sleeve,fit}),{
 status:'experimental',generatorId:'chaqueta-hombro-caido',params:{largo:length,holgura:fit>1.2?320:240,largoManga:sleeveLen,manga:sleeve==='sin'?'no':'si'},fits:fit>1.2?['holgado','oversize']:['holgado'],difficulty:2,
 description:'Chaqueta abierta de construcción recta y hombro caído. Genera cuerpo, mangas si se eligen y remates para coser; no lleva cuello sastre, botones ni cierre. Verifica una muestra de prueba.',materials:['Bies para rematar','Hilo'],recommendedFabrics:['Lino','Algodón','Lana ligera']
}));
const ponchos=[
 model('poncho-recto','Poncho rectangular cerrado','abrigo','Ponchos y capas',top('poncho',750,{sleeve:'sin'}),{status:'experimental',generatorId:'poncho-rectangular',params:{largo:750,ancho:1100,aperturaFrente:'no'},description:'Paneles rectangulares y abertura de cabeza calculada, sin mangas ni capucha. Ancho y largo editables; patrón experimental.',fits:['holgado','oversize']}),
 model('poncho-abierto','Poncho rectangular abierto al frente','abrigo','Ponchos y capas',top('poncho',820,{sleeve:'sin',closure:'botones'}),{status:'experimental',generatorId:'poncho-rectangular',params:{largo:820,ancho:1200,aperturaFrente:'si'},description:'Poncho recto abierto, sin cierre ni botones añadidos por el generador. Modifica el ancho y la abertura; remata los cantos.',fits:['oversize']}),
 model('poncho-corto','Poncho corto para superponer','abrigo','Ponchos y capas',top('poncho',500,{sleeve:'sin',fit:.85}),{status:'experimental',generatorId:'poncho-rectangular',params:{largo:500,ancho:950,aperturaFrente:'no'},description:'Versión corta rectangular, con medidas propias de ancho y largo. No se obtiene reduciendo una imagen.',fits:['holgado']})
];
const pinafores=[['jumper-peto-mini','Jumper con peto y falda corta',450,220,230,1.6],['jumper-peto-midi','Jumper con peto y falda midi',700,250,270,1.8],['jumper-peto-maxi','Jumper con peto y falda larga',930,260,280,2],['peto-falda-amplio','Peto con falda muy amplia',650,260,260,2.5]] as const;
const jumpers=pinafores.map(([id,name,skirtLength,bibWidth,bibHeight,fullness])=>model(id,name,'monos','Petos con falda · jumper',{family:'vestido',dress:{sleeve:'sin',neck:'redondo',skirt:'fruncida',length:skirtLength+400},pinafore:{skirtLength,bibWidth,bibHeight,fullness}}, {
 status:'experimental',generatorId:'jumper-peto-falda',params:{largoFalda:skirtLength,amplitud:fullness,anchoPeto:bibWidth,altoPeto:bibHeight},recipients:['mujer','unisex'],fits:['holgado'],techniques:['costura-recta','jareta','frunces','dobladillo'],description:'Jumper o vestido de peto: falda con cintura elástica, petos y tirantes independientes. Genera las piezas con tus medidas; requiere comprobar el largo de los tirantes. No es un mono con pantalón.',materials:['Elástico de cintura','Hilo']
}));
const monoRows:[string,string,NonNullable<FlatSpec['pants']>][]=[
 ['mono-camisero','Mono enterizo camisero',{leg:'recto',length:'largo',waist:'pretina',torso:'camisa',torsoSleeve:'corta',pockets:'laterales'}],
 ['mono-mecanico','Mono de trabajo de manga larga',{leg:'cargo',length:'largo',waist:'pretina',torso:'camisa',torsoSleeve:'larga',pockets:'cargo'}],
 ['mono-palazzo','Mono enterizo palazzo sin mangas',{leg:'palazzo',length:'largo',waist:'pretina',torso:'smock',torsoSleeve:'sin'}],
 ['mono-cruzado','Mono cruzado de pierna ancha',{leg:'ancho',length:'largo',waist:'pretina',torso:'envolvente',torsoSleeve:'corta'}],
 ['playsuit-camisero','Mono corto camisero · playsuit',{leg:'recto',length:'short',waist:'pretina',torso:'camisa',torsoSleeve:'corta'}],
 ['mono-baggy','Mono enterizo baggy',{leg:'baggy',length:'tobillo',waist:'elastica',torso:'smock',torsoSleeve:'sin'}],
 ['peto-bermuda','Peto con bermuda',{leg:'recto',length:'bermuda',waist:'pretina',bib:true,pockets:'parche'}],
 ['peto-palazzo','Peto de pantalón palazzo',{leg:'palazzo',length:'largo',waist:'pretina',bib:true,pockets:'laterales'}]
];
const monos=monoRows.map(([id,name,pants])=>model(id,name,'monos','Monos y petos con pantalón',{family:'pantalon',pants},{description:`${name}. Dibujo técnico editable de cuerpo y piernas para explorar color y materiales; falta el patrón conjunto con tiro, torso y apertura verificados.`,fits:['holgado'],techniques:['bolsillos','cierre','dobladillo']}));

function accessory(id:string,name:string,sub:string,kind:NonNullable<FlatSpec['accessory']>,w:number,h:number,generatorId?:string,params:Params={},extra:Partial<CatalogModel>={}):CatalogModel {
 return model(id,name,'accesorios',sub,{family:'accesorio',accessory:kind,object:{width:w,height:h,label:name}}, {difficulty:1,recipients:['unisex'],fits:['regular'],status:generatorId?'experimental':'pendiente',generatorId,params:generatorId?params:undefined,description:generatorId?'Patrón con medidas editables del objeto, piezas de corte, márgenes y pasos de confección. Comprueba las medidas de tu objeto y cose una muestra antes de usarlo como definitivo.':'Plantilla de diseño con zonas editables para probar telas y motivos. Su patrón de confección todavía está pendiente.',techniques:['costura-recta','aplicacion','bordado'],recommendedFabrics:['Algodón','Lona ligera','Lino'],...extra});
}
const sleeves=[
 ['funda-laptop-13','Funda con solapa para laptop de 13 pulgadas',330,230,20],
 ['funda-laptop-15','Funda con solapa para laptop de 15 pulgadas',370,260,25],
 ['funda-tablet','Funda con solapa para tablet',260,180,10],
 ['funda-telefono','Funda horizontal para teléfono',170,85,12],
 ['funda-libro','Funda para libro o agenda',230,160,30],
 ['funda-lentes','Estuche con solapa para lentes',170,80,25],
 ['funda-lector','Funda para lector electrónico',190,140,12],
 ['funda-consola','Funda para consola portátil',270,120,35]
] as const;
const bags=[['saquito-joyas','Saquito de joyería',100,140],['bolsa-regalo','Bolsa de regalo reutilizable',180,240],['bolsa-zapatos','Bolsa para zapatos',300,420],['bolsa-lavanderia','Bolsa para ropa de viaje',450,600],['bolsa-pan','Bolsa de tela para pan',300,400],['bolsa-bastidor','Bolsa para bastidor de bordado',300,360],['bolsa-legos','Bolsa para piezas y juguetes',350,450]] as const;
const pouches=[['estuche-lapices','Estuche plano para lápices',230,90],['neceser-plano','Neceser plano con cierre',240,160],['estuche-herramientas','Estuche de herramientas de costura',300,180],['sobre-viaje','Organizador plano de viaje',320,220],['monedero-cierre','Monedero con cierre',120,90],['bolsa-maquillaje','Bolsa plana de maquillaje',260,180]] as const;
const bands=[['banda-cabello','Banda anudada para cabello',900,70],['lazo-cabello','Lazo de tela para cabello',450,60],['cinturon-tela','Cinturón de tela para anudar',1800,80],['pulsera-tela','Pulsera anudada de tela',350,25],['lazo-regalo','Lazo reutilizable para regalo',1200,60]] as const;
const accessoryPatterns:CatalogModel[]=[
 ...sleeves.map(([id,name,w,h,t])=>accessory(id,name,'Fundas y tecnología','funda-solapa',w,h,'funda-solapa',{ancho:w,alto:h,grosor:t,holgura:12,solapa:Math.min(120,h*.5)},{materials:['Hilo','Broche o velcro opcional'],description:'Funda rectangular con solapa y medidas del objeto editables. Las pulgadas son una orientación: mide ancho, alto y grosor reales. No incluye acolchado protector ni certifica protección contra golpes.'})),
 ...bags.map(([id,name,w,h])=>accessory(id,name,'Bolsas con jareta','bolsa-jareta',w,h,'bolsa-jareta',{ancho:w,alto:h,jareta:30},{materials:['Cordón','Hilo'],techniques:['costura-recta','dobladillo']})),
 ...pouches.map(([id,name,w,h])=>accessory(id,name,'Estuches con cierre','estuche-plano',w,h,'estuche-plano',{ancho:w,alto:h},{difficulty:2,materials:['Cierre del ancho indicado','Hilo'],techniques:['costura-recta','cierre']})),
 ...bands.map(([id,name,w,h])=>accessory(id,name,'Cabello y complementos','banda-lazo',w,h,'banda-lazo',{largo:w,ancho:h},{recommendedFabrics:['Popelina','Satén','Viscosa']})),
 accessory('delantal-adulto','Delantal de peto con bolsillo','Cocina y taller','delantal',650,850,'delantal-peto',{ancho:650,alto:850,anchoPeto:260,altoSisa:260,largoCuello:600,largoLazo:750,anchoTira:30,anchoBolsillo:300,altoBolsillo:200}),
 accessory('delantal-junior','Delantal infantil para taller','Cocina y taller','delantal',430,580,'delantal-peto',{ancho:430,alto:580,anchoPeto:180,altoSisa:180,largoCuello:450,largoLazo:500,anchoTira:25,anchoBolsillo:220,altoBolsillo:140},{recipients:['infantil'],description:'Delantal con dimensiones de referencia infantil editables. Comprueba altura y ancho reales; los lazos requieren supervisión y no es una prenda de bebé.'}),
 accessory('delantal-barista','Delantal corto de peto para barista','Cocina y taller','delantal',650,700,'delantal-peto',{ancho:650,alto:700,anchoPeto:260,altoSisa:240,largoCuello:600,largoLazo:750,anchoTira:30,anchoBolsillo:320,altoBolsillo:180}),
 accessory('delantal-artista','Delantal amplio para pintura','Cocina y taller','delantal',750,950,'delantal-peto',{ancho:750,alto:950,anchoPeto:300,altoSisa:280,largoCuello:650,largoLazo:850,anchoTira:35,anchoBolsillo:350,altoBolsillo:240}),
 accessory('banderin-triangular','Banderín triangular con jareta','Fiestas y regalos','banderin',200,260,'banderin-jareta',{ancho:200,alto:260,jareta:25}),
 accessory('banderin-mini','Banderín pequeño de guirnalda','Fiestas y regalos','banderin',150,180,'banderin-jareta',{ancho:150,alto:180,jareta:20}),
 accessory('antifaz-viaje','Antifaz forrado para viaje','Viaje y descanso','antifaz',210,90,'antifaz-forrado',{ancho:210,alto:90,puente:20,elastico:340},{materials:['Elástico','Hilo'],recommendedFabrics:['Algodón','Satén']}),
 accessory('antifaz-ancho','Antifaz ancho de descanso','Viaje y descanso','antifaz',230,100,'antifaz-forrado',{ancho:230,alto:100,puente:22,elastico:360},{materials:['Elástico','Hilo'],recommendedFabrics:['Algodón','Satén']})
];
const extraIdeas=[
 accessory('organizador-pared','Organizador de pared con nueve bolsillos','Organización y hogar','organizador',450,650),
 accessory('sombrero-pescador','Sombrero tipo pescador · bucket','Cabeza y cuello','sombrero',300,250),
 accessory('corbata-clasica','Corbata clásica','Cabeza y cuello','corbata',100,1400),
 accessory('pajarita','Moño o pajarita','Cabeza y cuello','pajarita',160,90),
 accessory('mitones-polar','Mitones de polar','Manos y pies','mitones',260,250),
 accessory('pantuflas','Pantuflas de tela','Manos y pies','zapatillas',300,350),
 accessory('portacubiertos-enrollable','Portacubiertos enrollable','Mesa y cocina','portacubiertos',320,260),
 accessory('organizador-agujas','Organizador de agujas enrollable','Costura y taller','portacubiertos',500,350),
 accessory('funda-silla','Funda de silla para personalizar','Organización y hogar','fundasilla',450,850),
 accessory('cesto-ropa','Cesto textil alto','Organización y hogar','cesto',450,600),
 accessory('cesto-pan','Cesto de pan con borde doblado','Mesa y cocina','cesto',300,180)
];

const looseTops:CatalogModel[]=[
 model('sueter-oversize','Suéter holgado de cuello redondo','superiores','Suéteres y tops holgados',{family:'top',top:{type:'sudadera',sleeve:'larga',neck:'redondo',closure:'ninguno',length:740,fit:1.4,cuffs:true}},{fabrics:['punto'],stretch:'media',fits:['oversize'],techniques:['tejido-punto','puno'],recommendedFabrics:['Punto de suéter','Rib','Felpa'],description:'Suéter o jumper de punto amplio. Ilustración editable; falta un motor de torso y manga para producir su patrón de costura.'}),
 model('sueter-tortuga','Suéter de cuello alto','superiores','Suéteres y tops holgados',{family:'top',top:{type:'sudadera',sleeve:'larga',neck:'alto',closure:'ninguno',length:660,fit:1.1,cuffs:true}},{fabrics:['punto'],stretch:'alta',fits:['regular','holgado'],techniques:['tejido-punto','puno'],recommendedFabrics:['Punto de suéter','Rib']}),
 model('sueter-corto','Suéter corto y ancho','superiores','Suéteres y tops holgados',{family:'top',top:{type:'sudadera',sleeve:'larga',neck:'redondo',closure:'ninguno',length:450,fit:1.3,cuffs:true}},{fabrics:['punto'],stretch:'media',fits:['oversize'],techniques:['tejido-punto','puno'],recommendedFabrics:['Punto de suéter','Felpa']}),
 model('chaleco-punto-v','Chaleco de punto con escote V','superiores','Suéteres y tops holgados',{family:'top',top:{type:'chaleco',sleeve:'sin',neck:'v',closure:'ninguno',length:610,fit:1.18,hemBand:true}},{fabrics:['punto'],stretch:'media',fits:['holgado'],techniques:['tejido-punto'],recommendedFabrics:['Punto de suéter','Rib']}),
 model('tunica-suelta','Túnica suelta de escote V','superiores','Suéteres y tops holgados',{family:'top',top:{type:'blusa',sleeve:'corta',neck:'v',closure:'ninguno',length:920,fit:1.3}},{fits:['holgado','oversize'],recommendedFabrics:['Lino','Viscosa','Crepé']}),
 model('camisa-boxy','Camisa boxy corta y amplia','superiores','Suéteres y tops holgados',{family:'top',top:{type:'camisa',sleeve:'corta',neck:'camisa',closure:'botones',length:570,fit:1.35,pocket:'pecho'}},{fits:['holgado','oversize'],techniques:['botones','bolsillos','dobladillo'],recommendedFabrics:['Popelina','Lino','Oxford']})
];

const squareTops:CatalogModel[]=[
 ['bluson-cuadrado-lino','Blusón de lino con escote cuadrado',750,1.18,'tres-cuartos',300],
 ['tunica-cuadrada','Túnica larga de escote cuadrado',1000,1.28,'corta',220],
 ['pulover-caja-cuadrado','Pulóver caja de escote cuadrado',650,1.25,'larga',420],
 ['top-cuadrado-sin-mangas','Top cuadrado amplio sin mangas',550,1.1,'sin',0]
].map(([id,name,len,fit,sleeve,sl])=>model(String(id),String(name),'superiores','Hombro caído · patrón editable',top('bluson',Number(len),{sleeve:sleeve as TopOpts['sleeve'],fit:Number(fit),neck:'cuadrado'}),{
 status:'experimental',generatorId:'top-hombro-caido',params:{largo:Number(len),holgura:Number(fit)>1.2?300:220,largoManga:Number(sl),manga:sleeve==='sin'?'no':'si'},fits:['holgado','oversize'],description:'Top cerrado de construcción recta, hombro caído y escote cuadrado amplio. Genera las piezas con medidas corporales y holgura; no incorpora rib ni cuello de suéter. Prueba el paso de la cabeza y una muestra antes de cortar.',materials:['Bies para escote','Hilo'],recommendedFabrics:['Lino','Algodón','Punto estable'],fabrics:['plano','punto']
}));
export const EXPANDED_CATALOG:CatalogModel[]=[...jacketInspiration,...relaxed,...ponchos,...jumpers,...monos,...looseTops,...squareTops,...accessoryPatterns,...extraIdeas];
