import type { ComponentOption } from './components';
import type { ComponentKind } from '../lib/pattern/components';

type Definition = Omit<ComponentOption, 'label'>;
type Family = ComponentOption['families'][number];
const clothing:Family[]=['pantalon','top','falda','vestido'];
const everyday:Family[]=[...clothing,'bolso','accesorio'];
const work:Family[]=['pantalon','top','bolso','accesorio'];

interface ObjectPocket {
  id:string; name:string; width:number; height:number; collection:string;
  tags:string[]; note:string; tool?:boolean;
}

/** Dimensions are useful starting finished dimensions, not compatibility claims. */
const objects:ObjectPocket[]=[
  {id:'movil-compacto',name:'Teléfono compacto',width:90,height:165,collection:'Tecnología',tags:['celular','smartphone','móvil'],note:'Mide el teléfono con funda y deja espacio para sacarlo.'},
  {id:'movil-grande',name:'Teléfono grande con funda',width:110,height:195,collection:'Tecnología',tags:['celular','smartphone','móvil'],note:'Comprueba ancho, alto y grosor de tu teléfono; no es una talla universal.'},
  {id:'bateria',name:'Batería portátil',width:105,height:165,collection:'Tecnología',tags:['powerbank','carga','usb'],note:'Saca la batería para cargar; esta pieza no incorpora aislamiento térmico.'},
  {id:'audifonos',name:'Estuche de audífonos',width:85,height:90,collection:'Tecnología',tags:['auriculares','audio','airpods'],note:'Mide el estuche cerrado y deja holgura para extraerlo.'},
  {id:'cables',name:'Cables enrollados',width:130,height:110,collection:'Tecnología',tags:['usb','cargador','organización'],note:'Prueba el cable enrollado sin forzar sus conectores.'},
  {id:'tarjetas-memoria',name:'Tarjetas de memoria en estuche',width:75,height:90,collection:'Tecnología',tags:['sd','cámara','foto'],note:'Utiliza su caja protectora; el bolsillo no protege contactos eléctricos.'},
  {id:'mini-tripode',name:'Mini trípode plegado',width:90,height:245,collection:'Tecnología',tags:['foto','cámara','soporte'],note:'Mide el trípode totalmente plegado y refuerza la boca.'},
  {id:'radio',name:'Radio portátil',width:100,height:180,collection:'Tecnología',tags:['walkie','comunicación'],note:'Deja libres antena, altavoz y controles al ajustar el alto.'},
  {id:'pasaporte',name:'Pasaporte con cubierta',width:115,height:155,collection:'Viaje',tags:['documentos','viajar'],note:'Comprueba la cubierta real y prueba el acceso antes de cerrar las costuras.'},
  {id:'boleto',name:'Boletos y pases',width:120,height:220,collection:'Viaje',tags:['documentos','viajar','avión'],note:'Pensado para papeles doblados o pases; ajusta al formato de tus documentos.'},
  {id:'mapa',name:'Mapa plegado',width:150,height:210,collection:'Viaje',tags:['senderismo','papel','excursión'],note:'Mide el mapa con su doblez habitual y permite sacarlo con una mano.'},
  {id:'lentes',name:'Lentes con estuche',width:100,height:200,collection:'Viaje',tags:['gafas','sol','lectura'],note:'Usa el estuche de los lentes; no se incluye protección rígida.'},
  {id:'llaves',name:'Llavero',width:85,height:115,collection:'Viaje',tags:['llaves','argolla'],note:'Prueba el llavero completo y añade un refuerzo si pesa.'},
  {id:'monedero',name:'Monedas y billetes doblados',width:110,height:105,collection:'Viaje',tags:['dinero','cartera'],note:'Elige botón, velcro o cierre si necesitas retener objetos pequeños.'},
  {id:'credencial',name:'Credencial con porta tarjeta',width:85,height:120,collection:'Viaje',tags:['identificación','tarjeta','trabajo'],note:'La tela es opaca; para mostrar la credencial utiliza un porta tarjeta aparte.'},
  {id:'libreta-a7',name:'Libreta A7',width:95,height:130,collection:'Escritura',tags:['papel','notas','cuaderno'],note:'Incluye holgura orientativa sobre A7; mide tapas y espiral.'},
  {id:'libreta-a6',name:'Libreta A6',width:125,height:170,collection:'Escritura',tags:['papel','notas','cuaderno'],note:'Incluye holgura orientativa sobre A6; confirma el tamaño con tapas.'},
  {id:'libreta-a5',name:'Libreta A5',width:175,height:235,collection:'Escritura',tags:['papel','notas','cuaderno'],note:'Incluye holgura orientativa sobre A5; prueba el grosor del cuaderno.'},
  {id:'libreta-bolsillo',name:'Cuaderno de campo',width:115,height:195,collection:'Escritura',tags:['bitácora','dibujo','notas'],note:'Mide el cuaderno cerrado; una tapa gruesa necesita mayor ancho.'},
  {id:'regla-corta',name:'Regla de 15 cm',width:70,height:180,collection:'Escritura',tags:['medir','dibujo','marcadores'],note:'El alto permite alojar una regla corta; deja una zona de agarre.',tool:true},
  {id:'regla-larga',name:'Regla de 30 cm',width:85,height:330,collection:'Escritura',tags:['medir','dibujo','marcadores'],note:'Ubica esta pieza lejos de las articulaciones y comprueba el largo sentado.',tool:true},
  {id:'lapicera',name:'Plumas y lápices juntos',width:85,height:185,collection:'Escritura',tags:['bolígrafos','escribir','marcadores'],note:'Elige un organizador de canales si quieres separar cada lápiz.',tool:true},
  {id:'tijeras-costura',name:'Tijeras de costura con protector',width:120,height:245,collection:'Costura',tags:['cortar','modista','sastre'],note:'Guarda las puntas dentro de su protector rígido; prueba las tijeras reales.',tool:true},
  {id:'tijeras-bordado',name:'Tijeras de bordado con protector',width:75,height:140,collection:'Costura',tags:['cortar','hilo','aguja'],note:'Añade el protector de puntas antes de medir y colocar las tijeras.',tool:true},
  {id:'cinta-sastre',name:'Cinta métrica enrollada',width:90,height:100,collection:'Costura',tags:['medir','modista','sastre'],note:'Mide el rollo sin apretar; no se trata de una caja de flexómetro.',tool:true},
  {id:'carretes',name:'Carretes pequeños',width:125,height:115,collection:'Costura',tags:['hilo','bordado','bobinas'],note:'Prueba la cantidad de carretes y el espacio para sacarlos.',tool:true},
  {id:'pinzas-costura',name:'Pinzas y clips de costura',width:130,height:125,collection:'Costura',tags:['sujetar','clips','hilvanar'],note:'El cierre superior ayuda a que no se salgan los clips al moverte.',tool:true},
  {id:'agujas-estuche',name:'Estuche de agujas',width:75,height:150,collection:'Costura',tags:['tejer','bordar','costura'],note:'Las agujas deben permanecer dentro de un estuche protector.',tool:true},
  {id:'ganchillos',name:'Ganchillos con funda',width:100,height:190,collection:'Costura',tags:['crochet','tejer','lana'],note:'Usa una funda para evitar que los ganchos se enganchen en el bolsillo.',tool:true},
  {id:'ovillo',name:'Ovillo pequeño',width:180,height:180,collection:'Costura',tags:['lana','tejer','crochet'],note:'Comprueba el volumen del ovillo; el cargo ofrece fondo adicional.'},
  {id:'pinceles-cortos',name:'Pinceles de mango corto',width:120,height:220,collection:'Arte',tags:['pintar','acuarela','brocha'],note:'Guarda los pinceles limpios y secos con sus puntas protegidas.',tool:true},
  {id:'pinceles-largos',name:'Pinceles de mango largo',width:140,height:350,collection:'Arte',tags:['pintar','óleo','brocha'],note:'Comprueba la movilidad con esta pieza larga; no apoyes el peso en las cerdas.',tool:true},
  {id:'acuarelas',name:'Caja de acuarelas',width:150,height:200,collection:'Arte',tags:['pintar','dibujo','estuche'],note:'Mide la caja cerrada y deja espacio para el grosor.'},
  {id:'borradores',name:'Borradores y sacapuntas',width:95,height:100,collection:'Arte',tags:['dibujo','lápiz','goma'],note:'Mantén las virutas en el depósito del sacapuntas.',tool:true},
  {id:'carboncillos',name:'Carboncillos en estuche',width:115,height:185,collection:'Arte',tags:['dibujo','pastel','tizas'],note:'Usa un estuche cerrado para no manchar la tela.',tool:true},
  {id:'guantes',name:'Guantes doblados',width:165,height:190,collection:'Taller y jardín',tags:['jardinería','trabajo','huerto'],note:'Mide ambos guantes juntos y revisa que el bolsillo no limite el movimiento.'},
  {id:'semillas',name:'Sobres de semillas',width:130,height:180,collection:'Taller y jardín',tags:['jardinería','huerto','plantar'],note:'Guarda las semillas dentro de su sobre; el textil no es una barrera contra humedad.'},
  {id:'etiquetas-huerto',name:'Etiquetas para plantas',width:100,height:220,collection:'Taller y jardín',tags:['jardinería','huerto','marcar'],note:'Comprueba el largo y evita puntas expuestas al cuerpo.',tool:true},
  {id:'cordel',name:'Cordel enrollado',width:130,height:140,collection:'Taller y jardín',tags:['jardinería','atar','cuerda'],note:'Forma un rollo flojo que puedas sacar sin tirar del bolsillo.',tool:true},
  {id:'destornillador',name:'Destornillador con punta protegida',width:90,height:250,collection:'Taller y jardín',tags:['herramienta','tornillo','bricolaje'],note:'Usa el protector de punta y comprueba su altura con la herramienta real.',tool:true},
  {id:'alicate',name:'Pinzas pequeñas con funda',width:110,height:210,collection:'Taller y jardín',tags:['herramienta','alicate','taller'],note:'Comprueba el ancho de los mangos y protege las mordazas.',tool:true},
  {id:'flexometro',name:'Flexómetro compacto',width:115,height:120,collection:'Taller y jardín',tags:['medir','cinta','metro'],note:'Mide la caja real, incluido el clip; no es una sujeción de carga.',tool:true},
  {id:'nivel',name:'Nivel de bolsillo',width:90,height:185,collection:'Taller y jardín',tags:['medir','burbuja','taller'],note:'Comprueba el tamaño de la herramienta y deja libre su zona de agarre.',tool:true},
  {id:'linterna',name:'Linterna corta',width:85,height:190,collection:'Exterior',tags:['luz','campamento','excursión'],note:'Mide el diámetro máximo y la holgura para sacarla.',tool:true},
  {id:'brujula',name:'Brújula en caja',width:90,height:105,collection:'Exterior',tags:['orientación','senderismo','excursión'],note:'Prueba la caja cerrada y usa el cierre que retenga mejor la pieza.'},
  {id:'snack',name:'Barra o snack empaquetado',width:105,height:180,collection:'Exterior',tags:['excursión','comida','campamento'],note:'Mantén el alimento en su envase; el bolsillo no es un recipiente alimentario.'},
  {id:'bolsas-mascota',name:'Rollos de bolsas para mascota',width:90,height:100,collection:'Mascotas',tags:['perro','paseo','gato'],note:'Retira el rollo para sacar las bolsas; esta pieza no incorpora dispensador.'},
  {id:'premios-mascota',name:'Premios en bolsa cerrada',width:135,height:145,collection:'Mascotas',tags:['perro','paseo','entrenar'],note:'Utiliza una bolsa lavable interior; no pongas alimento húmedo directamente en la tela.'},
  {id:'panuelo',name:'Pañuelo doblado',width:100,height:115,collection:'Diario',tags:['nariz','tela','bolsillo'],note:'Prueba el pañuelo con el doblez que usarás habitualmente.'},
  {id:'gel',name:'Frasco pequeño con tapa',width:90,height:145,collection:'Diario',tags:['gel','higiene','cosméticos'],note:'Usa una tapa segura y retira el frasco si hay derrames.'},
  {id:'balsamo',name:'Bálsamo labial en estuche',width:60,height:100,collection:'Diario',tags:['cosméticos','labial','cuidado'],note:'El formato estrecho admite un envase pequeño; mide el tuyo.'},
  {id:'estuche-costura',name:'Kit de reparación en estuche',width:145,height:170,collection:'Diario',tags:['costura','viaje','reparar'],note:'Conserva agujas y tijeras dentro de sus protectores.',tool:true}
];

const styles:{id:string;name:string;kind:ComponentKind;group:ComponentOption['group'];detail:string}[]=[
  {id:'abierto',name:'abierto',kind:'bolsillo-parche',group:'bolsillos',detail:'Boca superior doblada; costados y fondo aplicados.'},
  {id:'curvo',name:'redondeado',kind:'bolsillo-redondeado',group:'bolsillos',detail:'Esquinas inferiores curvas y boca superior abierta.'},
  {id:'boton',name:'con botón',kind:'bolsillo-solapa-boton',group:'cierres',detail:'Solapa de dos caras, ojal y botón real por medir.'},
  {id:'velcro',name:'con velcro',kind:'bolsillo-solapa-velcro',group:'cierres',detail:'Solapa de dos caras con velcro comprado aparte.'},
  {id:'cierre',name:'con cierre',kind:'bolsillo-cierre',group:'cierres',detail:'Cremallera superior, respaldo y vistas independientes.'},
  {id:'cargo',name:'cargo',kind:'bolsillo-cargo',group:'bolsillos',detail:'Fuelle lateral e inferior con solapa y botón.'}
];

const pockets:Definition[]=objects.flatMap(object=>styles.map(style=>({
  id:`uso-${object.id}-${style.id}`,name:`${object.name} · ${style.name}`,kind:style.kind,
  group:object.tool?'herramientas':style.group,collection:object.collection,
  defaultWidth:object.width,defaultHeight:object.height,
  ...(style.kind==='bolsillo-cargo'?{defaultDepth:Math.max(15,Math.min(40,Math.round(Math.min(object.width,object.height)*.18)))}:{}),
  families:object.tool?work:everyday,tags:[...object.tags,'bolsillo',style.name],
  ...(/tijeras|destornillador|alicate|agujas/.test(object.id)?{hardware:[{id:'protector',label:`Funda o protector para ${object.name.toLowerCase()}`,qty:'1 por cada copia del bolsillo',note:'El objeto se guarda dentro de su protector real; el bolsillo textil no sustituye la protección de puntas.'}]}:{}),
  description:`${style.detail} Medidas iniciales ${object.width/10} × ${object.height/10} cm terminados. ${object.note}`
})));

const channelUses=[
  {id:'lapices',name:'Lápices',channel:23,height:155,tags:['escritura','colores','dibujar']},
  {id:'boligrafos',name:'Bolígrafos',channel:25,height:165,tags:['plumas','escritura','notas']},
  {id:'marcadores',name:'Marcadores',channel:32,height:175,tags:['rotuladores','arte','dibujo']},
  {id:'pinceles',name:'Pinceles cortos',channel:28,height:205,tags:['pintura','arte','acuarela']},
  {id:'ganchillos',name:'Ganchillos',channel:24,height:165,tags:['crochet','tejer','lana']},
  {id:'herramientas',name:'Herramientas protegidas',channel:55,height:225,tags:['taller','destornilladores','alicates']},
  {id:'cubiertos-estuche',name:'Cubiertos con funda',channel:38,height:210,tags:['campamento','viaje','utensilios']},
  {id:'reglas',name:'Reglas y escuadras estrechas',channel:42,height:235,tags:['medir','dibujo','marcar']}
];
const organizers:Definition[]=channelUses.flatMap(use=>[2,3,4,5,6,8].map(channels=>({
  id:`canales-${use.id}-${channels}`,name:`${use.name} · ${channels} canales`,kind:'porta-herramientas',group:'herramientas',
  collection:'Organizadores',defaultChannels:channels,defaultWidth:use.channel*channels,defaultHeight:use.height,
  tags:[...use.tags,'organizador','separadores',String(channels)],families:work,
  description:`${channels} espacios iguales de ${use.channel/10} cm terminados, con sus líneas de pespunte. Alto ${use.height/10} cm. Prueba cada objeto con su funda y ajusta el ancho antes de cortar.`
})));

const cameras:Definition[]=[
  {id:'compacto-izq',name:'Cámara compacta arriba a la izquierda',w:95,h:175,l:12,t:12,cw:45,ch:45},
  {id:'compacto-centro',name:'Cámara compacta centrada',w:95,h:175,l:25,t:12,cw:45,ch:40},
  {id:'compacto-ancho',name:'Cámara compacta en franja ancha',w:100,h:180,l:12,t:12,cw:76,ch:42},
  {id:'estandar-izq',name:'Cámara estándar arriba a la izquierda',w:105,h:185,l:12,t:14,cw:55,ch:55},
  {id:'estandar-centro',name:'Cámara estándar centrada',w:105,h:185,l:25,t:14,cw:55,ch:45},
  {id:'estandar-ancho',name:'Cámara estándar en franja ancha',w:110,h:190,l:12,t:14,cw:86,ch:50},
  {id:'grande-izq',name:'Cámara grande arriba a la izquierda',w:115,h:200,l:12,t:15,cw:65,ch:65},
  {id:'grande-centro',name:'Cámara grande centrada',w:115,h:200,l:25,t:15,cw:65,ch:50},
  {id:'grande-ancho',name:'Cámara grande en franja ancha',w:120,h:205,l:12,t:15,cw:96,ch:60},
  {id:'robusto-izq',name:'Cámara con funda robusta a la izquierda',w:125,h:215,l:12,t:18,cw:70,ch:65},
  {id:'robusto-centro',name:'Cámara con funda robusta centrada',w:125,h:215,l:27,t:18,cw:70,ch:55},
  {id:'robusto-ancho',name:'Cámara con funda robusta en franja ancha',w:130,h:220,l:12,t:18,cw:106,ch:65}
].map(option=>({
  id:`camara-${option.id}`,name:`Portacelular · ${option.name.toLowerCase()}`,kind:'porta-telefono-camara',group:'herramientas',collection:'Cámara y teléfono',
  defaultWidth:option.w,defaultHeight:option.h,defaultCamera:{left:option.l,top:option.t,width:option.cw,height:option.ch},
  families:work,tags:['celular','móvil','teléfono','cámara','video','ventana','grabar'],
  description:`Marco de cuatro piezas y respaldo: abertura real de ${option.cw/10} × ${option.ch/10} cm. Cámaras hacia el exterior. Mide tu teléfono con funda y ajusta la abertura, el flash y el micrófono; estos tamaños no garantizan compatibilidad con una marca.`
}));

const loops:Definition[]=[
  {id:'cinturon-delgado',name:'Trabillas para cinturón delgado',w:15,h:65,qty:5,tag:'cinturón'},
  {id:'cinturon-ancho',name:'Trabillas para cinturón ancho',w:25,h:100,qty:5,tag:'cinturón'},
  {id:'cinturon-doble',name:'Trabillas anchas de trabajo',w:35,h:110,qty:5,tag:'cinturón'},
  {id:'cinta-guantes',name:'Aro para guantes ligeros',w:30,h:150,qty:1,tag:'guantes'},
  {id:'cinta-llavero',name:'Presilla para llavero',w:20,h:85,qty:1,tag:'llaves'},
  {id:'cinta-colgar-corta',name:'Presilla corta para colgar',w:15,h:100,qty:1,tag:'colgar'},
  {id:'cinta-colgar-larga',name:'Presilla larga para colgar',w:25,h:180,qty:1,tag:'colgar'},
  {id:'cinta-pano',name:'Aro para paño de taller',w:30,h:220,qty:1,tag:'paño'},
  {id:'cinta-mosqueton',name:'Presilla para mosquetón pequeño',w:20,h:100,qty:1,tag:'mosquetón'},
  {id:'cinta-argolla-ancha',name:'Presilla para argolla ancha',w:40,h:120,qty:1,tag:'argolla'},
  {id:'martillo-fino',name:'Lazo para mango delgado',w:25,h:160,qty:1,tag:'martillo'},
  {id:'martillo-ancho',name:'Lazo para mango ancho',w:40,h:240,qty:1,tag:'martillo'}
].map(option=>({
  id:`tira-${option.id}`,name:option.name,kind:option.tag==='martillo'?'porta-martillo':'trabilla',group:option.tag==='cinturón'?'trabillas':'herramientas',
  collection:'Tiras y anclajes',defaultWidth:option.w,defaultHeight:option.h,defaultQuantity:option.qty,families:option.tag==='cinturón'?clothing:work,
  ...(['mosquetón','argolla'].includes(option.tag)?{hardware:[{id:'herraje',label:`${option.tag==='mosquetón'?'Mosquetón':'Argolla'} para presilla`,qty:'1 por cada copia de la tira',note:'Mide el ancho interior del herraje real antes de cortar; no es un anclaje de carga.'}]}:{}),
  tags:[option.tag,'tira','presilla','anclaje'],description:`Tira terminada de ${option.w/10} × ${option.h/10} cm. El patrón forma un tubo e incluye las reservas de fijación. Prueba el arco con el objeto real; no es una sujeción de carga.`
}));

export const EXTRA_COMPONENT_DEFINITIONS:readonly Definition[]=[...pockets,...organizers,...cameras,...loops];
