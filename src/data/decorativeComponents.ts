import type { ComponentOption } from './components';
import type { DecorationStyle } from '../lib/pattern/decorations';

type Definition=Omit<ComponentOption,'label'>;
const families:ComponentOption['families']=['pantalon','top','falda','vestido','bebe','bolso','accesorio'];
const plurals:Record<string,string>={encaje:'encajes',puntilla:'puntillas',blonda:'blondas',cinta:'cintas',listón:'listones',galón:'galones',ojal:'ojales',entredós:'entredoses',flor:'flores'};
const bought=(id:string,name:string,style:DecorationStyle,height:number,description:string,tags:string[]):Definition=>({
  id:`decor-${id}`,name,kind:'cinta-comprada',group:'decoracion',collection:'Mercería decorativa',
  defaultWidth:240,defaultHeight:height,defaultDecoration:{style},families,
  description:`${description} Se compra terminado; incluye metraje y colocación, no un patrón para fabricar el encaje.`,tags:[...tags,...tags.flatMap(tag=>plurals[tag]?[plurals[tag]]:[])]
});
const ruffle=(id:string,name:string,height:number,fullness:number,description:string):Definition=>({
  id:`decor-${id}`,name,kind:'olan-fruncido',group:'decoracion',collection:'Olanes y volantes',
  defaultWidth:240,defaultHeight:height,defaultDecoration:{style:'frunce',fullness},families,
  description:`${description} Tira recta con frunce ${fullness}× y piquetes por cuartos; genera su patrón desarrollado.`,tags:['olán','olan','olanes','volante','volantes','ruffle','fruncido','fruncidos','decoración']
});
const pleated=(id:string,name:string,height:number,pleats:number,description:string):Definition=>({
  id:`decor-${id}`,name,kind:'olan-plisado',group:'decoracion',collection:'Olanes y volantes',
  defaultWidth:240,defaultHeight:height,defaultDecoration:{style:'pliegues',pleats},families,
  description:`${description} Pliegues en una dirección: cada tramo usa tres veces su largo montado, con marcas de doblez.`,tags:['olán','olan','olanes','volante','volantes','plisado','plisados','pliegues','decoración']
});

/** Original measurements and construction notes; lace motifs are illustrative bought notions. */
export const DECORATIVE_COMPONENT_DEFINITIONS:Definition[]=[
  bought('encaje-floral','Encaje floral','encaje-floral',40,'Puntilla de flores para una banda en manga, bolsillo o falda.',['encaje','puntilla','flor','lace']),
  bought('blonda-festoneada','Blonda festoneada','blonda',70,'Borde de ondas amplias con dibujo floral para destacar un bajo.',['blonda','encaje','ondas','festón']),
  bought('encaje-geometrico','Encaje geométrico','geometrico',35,'Banda calada de rombos para una línea decorativa recta.',['encaje','calado','rombos','guipur']),
  bought('encaje-ojales','Puntilla de ojales','ojales',35,'Bordado inglés con ojales: úsalo como tira aplicada sin recortar la base.',['encaje','bordado inglés','broderie','ojales']),
  bought('pasacintas','Pasacintas de encaje','ojales',22,'Banda de ojales para pasar una cinta fina; compra la cinta adicional a la medida del recorrido.',['encaje','pasacintas','cinta','entredós']),
  bought('entredos','Entredós aplicado','geometrico',25,'Entredós sobre la superficie: no abre una franja de la prenda ni cambia el patrón base.',['encaje','entredós','calado']),
  bought('flecos','Flecos textiles','flecos',65,'Galón con flecos para bolsos, chalecos y detalles de disfraz.',['flecos','fringe','galón','disfraz']),
  bought('flecos-cortos','Galón de flecos cortos','flecos',30,'Acabado de flecos compactos para una tira de contraste.',['flecos','galón','fringe']),
  bought('pompones','Cinta de pompones','pompones',28,'Banda con pompones sujetos: deja el borde colgante libre.',['pompones','pasamanería','borlas']),
  bought('ondulina','Ondulina','serpentina',15,'Cinta zigzag para dibujar una línea ondulada sobre la prenda.',['ondulina','zigzag','ric rac','serpentina']),
  bought('cinta-satin','Cinta de satén','cinta',25,'Banda brillante para acentos rectos y contraste de materiales.',['satén','satin','listón','ribbon']),
  bought('cinta-terciopelo','Cinta de terciopelo','cinta',20,'Listón de pelo corto: mantén la dirección del pelo en todos los tramos.',['terciopelo','listón','cinta']),
  bought('galon-bordado','Galón bordado','geometrico',40,'Cinta tejida con dibujo repetido; centra los motivos antes de cortar.',['galón','bordado','jacquard','pasamanería']),
  bought('cinta-grosgrain','Cinta grosgrain','cinta',30,'Banda firme acanalada para un acento recto o para cubrir una unión.',['grosgrain','cinta','listón']),
  ruffle('volante-suave','Olán de frunce suave',45,1.5,'Volumen discreto para un detalle pequeño.'),
  ruffle('volante-clasico','Olán fruncido clásico',75,2,'Frunce medio para mangas, pechos o bordes interiores.'),
  ruffle('volante-amplio','Olán de frunce abundante',100,2.5,'Para tela fina con más volumen: prueba la caída en una muestra.'),
  ruffle('volante-tul','Olán ligero de tul',90,3,'Mucho volumen en tul fino; el patrón usa el mismo remate doble y exige comprobarlo en la tela elegida.'),
  pleated('pliegues-anchos','Olán de pliegues anchos',80,4,'Cuatro pliegues de 6 cm en el largo inicial.'),
  pleated('pliegues-clasicos','Olán plisado clásico',60,6,'Seis pliegues de 4 cm en el largo inicial.'),
  pleated('pliegues-finos','Olán de pliegues finos',40,12,'Doce pliegues de 2 cm en el largo inicial.'),
  {id:'decor-banda-tela',name:'Banda de tela de contraste',kind:'cinta-aplicada',group:'decoracion',collection:'Bandas aplicadas',defaultWidth:240,defaultHeight:40,defaultDecoration:{style:'cinta'},families,description:'Tira plana de tu propia tela con cuatro márgenes doblados y pespuntes. Puedes aplicarle una foto de material en Acabados.',tags:['banda','cinta','contraste','tela','galón']}
];
