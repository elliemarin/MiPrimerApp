import type { CatalogModel, GarmentType, Recipient, Technique } from './catalog';
import type { FlatSpec, TopOpts } from './flats';
import type { Params } from '../lib/pattern/generator';
import { withDesignGroup, sleeveDesignGroup, rectangleDesignGroup } from './catalogGrouping';

/** Original construction variants, not colourways or duplicated clothing sizes.
 * Every entry changes physical cutting geometry or a construction finish.
 * Dimensions are finished mm; all remain experimental until sewn. */
const entries: CatalogModel[] = [];
const adult: Recipient[] = ['mujer', 'hombre', 'unisex'];
const fmt = (mm: number) => `${Number((mm / 10).toFixed(1)).toString().replace('.', ',')} cm`;
const size = (w: number, h: number) => `${fmt(w)} × ${fmt(h)}`;
type Base = { id: string; name: string; collection: string; generatorId: string; params: Params; flat: FlatSpec; variantLabel: string; type?: GarmentType; description?: string; searchTerms?: string[]; techniques?: Technique[]; fabrics?: CatalogModel['fabrics']; fits?: CatalogModel['fits']; recipients?: Recipient[]; materials?: string[]; designGroup?: CatalogModel['designGroup'] };
function add(o: Base) {
  entries.push(withDesignGroup({
    id: `coleccion-${o.id}`, name: o.name, collection: o.collection, sub: o.collection,
    variantLabel: o.variantLabel, generatorId: o.generatorId, params: o.params, flat: o.flat,
    type: o.type ?? 'accesorios', recipients: o.recipients ?? adult, difficulty: 1,
    fabrics: o.fabrics ?? ['plano'], stretch: o.fabrics?.[0] === 'punto' ? 'media' : 'ninguna',
    fits: o.fits ?? ['regular'], status: 'experimental',
    description: `${o.description ?? 'Patrón paramétrico original con piezas, márgenes y pasos de confección.'} ${o.variantLabel}. Las medidas son terminadas y editables; imprime y cose una muestra.`,
    variants: [{ name: 'Construcción y medidas', text: o.variantLabel }],
    techniques: o.techniques ?? ['costura-recta', 'aplicacion', 'bordado'],
    recommendedFabrics: o.fabrics?.[0] === 'punto' ? ['French terry estable', 'Punto interlock', 'Sudadera sin mucha elasticidad'] : ['Algodón', 'Lino', 'Popelina', 'Loneta ligera'],
    materials: o.materials ?? ['Hilo de coser'], searchTerms: o.searchTerms, designGroup: o.designGroup
  }));
}
function top(type: TopOpts['type'], length: number, sleeve: number, ease: number, extra: Partial<TopOpts> = {}): FlatSpec {
  return { family: 'top', top: { type, style: 'bluson', sleeve: sleeve === 0 ? 'sin' : sleeve < 220 ? 'corta' : sleeve < 360 ? 'tres-cuartos' : 'larga', neck: 'cuadrado', closure: 'ninguno', length, fit: 1 + ease / 1000, pocket: 'ninguno', ...extra } };
}
const object = (kind: NonNullable<FlatSpec['accessory']>, w: number, h: number, label: string): FlatSpec => ({ family: 'accesorio', accessory: kind, object: { width: w, height: h, label } });

// Clothing variations change length, volume, sleeve/neck construction or waistband.
for (const style of ['recto', 'ancho', 'jogger'] as const) for (const length of [720, 800, 880, 960, 1040, 1120]) for (const ease of [80, 140, 220]) for (const elastic of [20, 30, 40]) {
  const name = style === 'jogger' ? 'Jogger' : style === 'ancho' ? 'Pantalón amplio' : 'Pantalón recto';
  const lengthLabel = length <= 800 ? 'capri' : length <= 960 ? 'al tobillo' : 'largo';
  add({ id: `pantalon-${style}-${length}-${ease}-${elastic}`, name: `${name} ${lengthLabel} · ${fmt(length)}, elástico ${fmt(elastic)}`, collection: 'Pantalones y joggers', type: 'inferiores', generatorId: 'pantalon-cintura-elastica',
    params: { estilo: style, largo: length, holguraCadera: ease, anchoElastico: elastic },
    flat: { family: 'pantalon', pants: { leg: style, length: length <= 800 ? 'capri' : length <= 960 ? 'tobillo' : 'largo', waist: 'elastica', pockets: 'ninguno' } },
    variantLabel: `Largo cintura a bajo ${fmt(length)}, holgura de cadera ${fmt(ease)} y elástico de ${fmt(elastic)}`,
    fabrics: style === 'jogger' ? ['punto', 'plano'] : ['plano', 'punto'], fits: ease > 180 ? ['holgado', 'oversize'] : ['regular', 'holgado'], techniques: style === 'jogger' ? ['costura-recta', 'jareta', 'puno'] : ['costura-recta', 'jareta', 'dobladillo'], materials: ['Elástico para cintura', 'Hilo', ...(style === 'jogger' ? ['Rib para puños'] : [])],
    description: 'Piernas generadas desde cadera, tiro y entrepierna; cintura elástica sin cierre ni bolsillo interno. El puño del jogger es una pieza independiente.', searchTerms: ['pants', 'pantalones', 'pijama', 'casual', 'deportivo'] });
}
for (const length of [350, 450, 550, 650, 750, 850, 950, 1050]) for (const fullness of [1.25, 1.4, 1.6, 1.8, 2, 2.2]) for (const elastic of [20, 30, 40]) {
  add({ id: `falda-${length}-${Math.round(fullness * 100)}-${elastic}`, name: `Falda fruncida ${length < 500 ? 'corta' : length < 800 ? 'midi' : 'larga'} · ${fmt(length)}, amplitud ${fullness}`, collection: 'Faldas fruncidas', type: 'faldas-vestidos', generatorId: 'falda-fruncida-elastica', params: { largo: length, amplitud: fullness, anchoElastico: elastic },
    flat: { family: 'falda', skirt: { shape: 'fruncida', length, waist: 'elastica' } }, variantLabel: `Largo ${fmt(length)}, amplitud de cadera ×${fullness}, elástico de ${fmt(elastic)}`, recipients: ['mujer', 'hombre', 'unisex'], fits: ['holgado'], techniques: ['costura-recta', 'jareta', 'frunces', 'dobladillo'], materials: ['Elástico de cintura', 'Hilo'], description: 'Falda de dos paños al doblez y cintura con jareta; cada nivel de amplitud cambia el contorno real antes de fruncir.' });
}
for (const length of [450, 550, 650, 750, 850, 1000]) for (const sleeve of [0, 160, 260, 380, 500]) for (const ease of [180, 260, 340]) for (const neckline of [150, 230]) {
  const vest = sleeve === 0;
  add({ id: `abierto-${length}-${sleeve}-${ease}-${neckline}`, name: `${vest ? 'Chaleco abierto' : 'Chaqueta de hombro caído'} · ${fmt(length)}, ${vest ? 'sin mangas' : `manga ${fmt(sleeve)}`}`, collection: vest ? 'Chalecos abiertos' : 'Chaquetas geométricas', type: 'abrigo', generatorId: 'chaqueta-hombro-caido',
    params: { largo: length, manga: vest ? 'no' : 'si', largoManga: sleeve, holgura: ease, escoteDelante: neckline }, flat: top(vest ? 'chaleco' : 'chaqueta', length, sleeve, ease, { style: 'haori', neck: 'v' }),
    variantLabel: `Holgura ${fmt(ease)}, abertura de escote ${fmt(neckline)} y largo ${fmt(length)}${vest ? ', sisas ribeteadas' : `, manga de ${fmt(sleeve)}`}`, fits: ['holgado', 'oversize'], materials: ['Bies de escote y frente', 'Hilo'], techniques: ['costura-recta', 'dobladillo'],
    description: 'Prenda abierta y geométrica, sin pinzas, cruce, botones ni cuello sastre. Cambiar manga, sisa abierta o largo produce piezas diferentes.', searchTerms: ['haori', 'kimono geométrico', 'cardigan abierto', 'chamarra', 'jacket', 'vest'] });
}
for (const length of [450, 550, 650, 750, 850]) for (const sleeve of [0, 150, 270, 420]) for (const ease of [180, 260, 340]) for (const neck of [230, 270]) {
  add({ id: `top-cuadrado-${length}-${sleeve}-${ease}-${neck}`, name: `${length > 700 ? 'Túnica' : 'Top'} de escote cuadrado · ${fmt(length)}, ${sleeve ? `manga ${fmt(sleeve)}` : 'sin mangas'}`, collection: 'Tops y túnicas', type: 'superiores', generatorId: 'top-hombro-caido', params: { largo: length, manga: sleeve ? 'si' : 'no', largoManga: sleeve, holgura: ease, escoteAncho: neck },
    flat: top('blusa', length, sleeve, ease), variantLabel: `Holgura ${fmt(ease)}, escote de ${fmt(neck)} y largo ${fmt(length)}`, fabrics: ['plano', 'punto'], fits: ['holgado', 'oversize'], materials: ['Bies flexible de escote', 'Hilo'], description: 'Blusón cerrado de hombro caído y cuello cuadrado, sin rib. Su abertura se comprueba con la medida de cabeza; las sisas sin manga se ribetean.' });
}
for (const width of [850, 1000, 1150, 1300, 1450]) for (const length of [450, 550, 650, 800, 950]) for (const open of [false, true]) for (const neck of [230, 270]) {
  add({ id: `poncho-${width}-${length}-${open ? 'abierto' : 'cerrado'}-${neck}`, name: `${open ? 'Ruana abierta' : 'Poncho rectangular'} · ${size(width, length)}`, collection: 'Ponchos y ruanas', type: 'abrigo', generatorId: 'poncho-rectangular', params: { ancho: width, largo: length, aperturaFrente: open ? 'si' : 'no', escoteAncho: neck, escoteProfundo: 110 },
    flat: top('abrigo', length, 0, 300, { style: 'poncho', closure: 'ninguno' }), variantLabel: `Paño de ${size(width, length)}, escote de ${fmt(neck)}, frente ${open ? 'abierto en dos piezas' : 'cerrado'}`, fits: ['holgado', 'oversize'], materials: ['Bies', 'Hilo'], description: 'Dos paños rectangulares unidos en los hombros. Los lados quedan abiertos; la ruana divide el delantero y el poncho conserva la abertura de cabeza.' });
}
for (const length of [350, 450, 550, 650, 750, 850]) for (const fullness of [1.3, 1.5, 1.8, 2.1]) for (const bib of [220, 280, 340]) {
  add({ id: `jumper-${length}-${Math.round(fullness * 100)}-${bib}`, name: `Jumper de falda ${length < 500 ? 'corta' : length < 700 ? 'midi' : 'larga'} · ${fmt(length)}, peto ${fmt(bib)}`, collection: 'Jumpers con falda', type: 'monos', generatorId: 'jumper-peto-falda', params: { largoFalda: length, amplitud: fullness, altoPeto: bib }, flat: { family: 'vestido', pinafore: { skirtLength: length, bibWidth: 260, bibHeight: bib, fullness } },
    variantLabel: `Falda de ${fmt(length)}, amplitud ×${fullness} y alto de peto ${fmt(bib)}`, recipients: ['mujer', 'hombre', 'unisex'], fits: ['holgado'], techniques: ['costura-recta', 'frunces', 'jareta', 'botones'], materials: ['Elástico', 'Dos botones de tirante', 'Hilo'], description: 'Peto delantero forrado, falda fruncida con elástico y tirantes cruzados regulables. Es un jumper de falda, no un mono con pantalón.', searchTerms: ['peto', 'jumper', 'pinafore', 'overol con falda'] });
}
for (const length of [500, 580, 660, 740, 820, 900]) for (const sleeve of [150, 280, 410, 540]) for (const ease of [180, 260, 340]) for (const hood of [false, true]) {
  add({ id: `sudadera-${length}-${sleeve}-${ease}-${hood ? 'capucha' : 'cuello'}`, name: `${hood ? 'Hoodie' : 'Sudadera'} holgada · ${fmt(length)}, manga ${fmt(sleeve)}`, collection: 'Hoodies y sudaderas', type: 'abrigo', generatorId: 'sudadera-capucha-holgada', params: { largo: length, largoManga: sleeve, holgura: ease, capucha: hood ? 'si' : 'no' },
    flat: top(hood ? 'hoodie' : 'sudadera', length, sleeve, ease, { style: undefined, neck: hood ? 'capucha' : 'redondo', cuffs: false, hemBand: false, plainHem: true, pocket: 'ninguno' }), variantLabel: `Largo ${fmt(length)}, manga ${fmt(sleeve)}, holgura ${fmt(ease)}${hood ? ', capucha en dos mitades' : ', escote ribeteado sin capucha'}`, fabrics: ['punto'], fits: ['holgado', 'oversize'], materials: ['Hilo de coser', ...(hood ? ['Bies o cinta de estabilización de cuello'] : ['Bies flexible de escote'])], description: `Sudadera pulóver de hombro caído con dobladillos, sin cierre ni rib. ${hood ? 'La capucha y su unión al cuello se calculan con geometría real.' : 'El escote se calcula con la medida de cabeza y se termina con bies.'}`, searchTerms: hood ? ['hoodie', 'hoddie', 'sudadera', 'capucha', 'pulover'] : ['sudadera', 'pulover', 'sweatshirt'] });
}

// Object recipes specify the actual capacity before ease, not clothing sizes.
const bags: [string, string, number, number, number][] = [
  ['libros', 'Bolsa para libros', 330, 360, 90], ['biblioteca', 'Bolsa de biblioteca', 380, 420, 100], ['revistas', 'Bolsa para revistas', 340, 450, 80], ['mercado', 'Bolsa de mercado', 420, 440, 130], ['despensa', 'Bolsa para despensa', 470, 480, 150], ['playa', 'Bolsa de playa', 500, 420, 160], ['picnic', 'Bolsa de picnic', 460, 360, 170], ['taller', 'Bolsa de taller', 420, 320, 150], ['tejido', 'Bolsa para tejido', 360, 340, 140], ['crochet', 'Bolsa para crochet', 300, 300, 120], ['retazos', 'Bolsa para retazos', 400, 300, 160], ['bordado', 'Bolsa para bastidores', 350, 350, 80], ['cuadernos', 'Bolsa para cuadernos', 290, 350, 80], ['musica', 'Bolsa para partituras', 360, 430, 90], ['jardin', 'Bolsa para jardín', 410, 310, 150], ['viaje', 'Bolsa auxiliar de viaje', 450, 390, 130], ['panales', 'Bolsa organizadora de pañales', 380, 290, 150], ['juguetes', 'Bolsa para juguetes', 440, 380, 160], ['costura', 'Bolsa para útiles de costura', 320, 280, 120], ['regalos', 'Bolsa de regalo reutilizable', 260, 300, 80]
];
for (const [id, name, w, h, depth] of bags) for (const handle of [220, 450, 680]) for (const lined of [false, true]) for (const deep of [false, true]) {
  const d = depth + (deep ? 40 : 0);
  add({ id: `tote-${id}-${handle}-${lined ? 'forro' : 'simple'}-${d}`, name: `${name} · asas ${handle < 300 ? 'de mano' : handle < 600 ? 'de antebrazo' : 'de hombro'}, ${lined ? 'forrada' : 'sin forro'}`, collection: 'Bolsas con base y asas', type: 'bolsos', generatorId: 'bolsa-tote', params: { ancho: w, alto: h, fondo: d, largoAsa: handle, anchoAsa: 30, forro: lined ? 'si' : 'no' }, flat: { family: 'bolso', bag: 'tote', object: { width: w, height: h, label: name } }, variantLabel: `Ancho ${fmt(w)}, alto de patrón ${fmt(h)}, fondo ${fmt(d)} y asa terminada de ${fmt(handle)}; ${lined ? 'incluye forro' : 'boca con dobladillo'}`, techniques: ['costura-recta', 'dobladillo', ...(lined ? ['forro' as const] : [])], materials: ['Hilo resistente', ...(lined ? ['Tela de forro'] : [])], description: 'Tote de dos caras con base en caja y asas dobladas en cuatro. El alto útil cambia al formar las esquinas de la base; revisa la capacidad terminada en la ficha.', searchTerms: [id, 'tote', 'bolso', 'bolsa', 'organizador'] });
}
const devices: [string, string, number, number, number][] = [
  ['lector', 'Funda para lector electrónico', 125, 175, 10], ['libro-bolsillo', 'Funda para libro de bolsillo', 120, 190, 25], ['libreta', 'Funda para libreta', 145, 210, 18], ['cuaderno-a5', 'Funda para cuaderno A5', 155, 220, 20], ['cuaderno-a4', 'Funda para cuaderno A4', 220, 305, 25], ['agenda', 'Funda para agenda', 180, 240, 30], ['tableta', 'Funda para tableta', 190, 260, 12], ['tableta-mini', 'Funda para tableta pequeña', 145, 210, 10], ['portatil', 'Funda para portátil', 330, 235, 20], ['portatil-grande', 'Funda para portátil grande', 380, 265, 25], ['telefono', 'Funda para teléfono', 85, 165, 12], ['telefono-grande', 'Funda para teléfono grande', 95, 180, 15], ['lentes', 'Funda plana para lentes', 85, 185, 25], ['consola', 'Funda para consola portátil', 270, 125, 35], ['tarjetas', 'Funda para tarjetas y notas', 110, 145, 15], ['pasaporte', 'Funda para pasaporte', 105, 145, 18], ['patrones', 'Funda para patrones doblados', 240, 330, 35], ['bastidor', 'Funda para bastidor', 270, 280, 18], ['cables', 'Funda para cables enrollados', 160, 120, 35], ['muestrario', 'Funda para muestrario textil', 250, 240, 40]
];
for (const [id, name, w, h, thick] of devices) for (const ease of [6, 14, 24]) for (const flap of [0.28, 0.48]) {
  const f = Math.round(h * flap);
  add({ designGroup: sleeveDesignGroup(id), id: `funda-${id}-${ease}-${Math.round(flap * 100)}`, name: `${name} · solapa ${flap < .4 ? 'corta' : 'larga'}, holgura ${fmt(ease)}`, collection: 'Fundas con solapa', generatorId: 'funda-solapa', params: { ancho: w, alto: h, grosor: thick, holgura: ease, solapa: f }, flat: object('funda-solapa', w + thick + ease, h + thick / 2 + ease / 2, name), variantLabel: `Objeto de ${size(w, h)} y grosor ${fmt(thick)}, holgura ${fmt(ease)}, solapa ${fmt(f)}`, techniques: ['costura-recta', 'forro'], materials: ['Broche o velcro', 'Forro', 'Hilo'], description: 'Funda plana forrada. Las medidas del objeto son un punto de partida, no una talla universal: comprueba el objeto con su carcasa antes de cortar. No incluye acolchado.', searchTerms: [id, 'funda', 'sleeve', 'libro', 'lectura'] });
}
const pouches: [string, string, number, number][] = [
 ['monedas','Monedero',120,85],['lapices','Estuche para lápices',220,100],['marcadores','Estuche para marcadores',250,140],['pinceles','Estuche para pinceles',300,130],['costura','Estuche para costura',200,160],['ganchillos','Estuche para ganchillos',230,110],['cables','Estuche para cables',210,150],['cosmeticos','Estuche plano de cosméticos',270,180],['medicamentos','Estuche organizador de viaje',240,170],['documentos','Estuche para documentos',340,240],['recibos','Estuche para recibos',190,140],['cargadores','Estuche para cargadores',260,160],['tarjetas','Estuche para tarjetas',140,100],['bordado','Estuche para hilos de bordado',280,220],['herramientas','Estuche para herramientas ligeras',310,200],['accesorios','Estuche para accesorios',180,130],['juegos','Estuche para piezas de juego',290,240],['fotos','Estuche para fotos y recuerdos',230,190]
];
for (const [id, name, w, h] of pouches) for (const format of ['base', 'ancho', 'alto'] as const) {
  const width = w + (format === 'ancho' ? 50 : 0), height = h + (format === 'alto' ? 60 : 0);
  add({ id: `estuche-${id}-${format}`, name: `${name} con cierre · ${size(width, height)}`, collection: 'Estuches con cierre', generatorId: 'estuche-plano', params: { ancho: width, alto: height }, flat: object('estuche-plano', width, height, name), variantLabel: `Estuche plano terminado de ${size(width, height)}, dos exteriores y dos forros`, techniques: ['costura-recta', 'forro', 'cierre'], materials: ['Cierre flexible', 'Forro', 'Hilo'], description: 'Estuche plano con cierre superior y forro. No incorpora fondo en caja; la abertura útil se reduce junto a los extremos.', searchTerms: [id, 'neceser plano', 'estuche', 'zipper', 'pouch'] });
}
const sacks: [string, string, number, number][] = [
 ['zapatos','Bolsa para zapatos',320,400],['zapatillas','Bolsa para zapatillas bajas',300,350],['botas','Bolsa para botas',400,550],['pan','Bolsa para pan',300,450],['baguette','Bolsa para pan alargado',220,650],['fruta','Bolsa para fruta',300,330],['verduras','Bolsa para verduras',350,420],['ropa','Bolsa para ropa de viaje',450,600],['lavanderia','Bolsa organizadora de lavandería',500,700],['juguetes','Saquito para juguetes',350,400],['pelotas','Saquito para pelotas pequeñas',300,300],['regalo','Saquito de regalo',180,240],['dados','Saquito para dados',120,160],['piezas','Saquito para piezas pequeñas',160,190],['ovillos','Bolsa para ovillos',280,320],['retazos','Bolsa para retazos',380,420],['maquillaje','Saquito de tocador',240,300],['herramientas','Bolsa de útiles de taller',330,430]
];
for (const [id, name, w, h] of sacks) for (const capacity of [0, 40, 80]) for (const casing of [20, 35]) {
  const width = w + capacity, height = h + capacity;
  add({ id: `jareta-${id}-${capacity}-${casing}`, name: `${name} · ${size(width, height)}, jareta ${fmt(casing)}`, collection: 'Bolsas con jareta', generatorId: 'bolsa-jareta', params: { ancho: width, alto: height, jareta: casing }, flat: object('bolsa-jareta', width, height, name), variantLabel: `Dos paños de ${size(width, height)} terminados y canal con margen de ${fmt(casing)}`, materials: ['Cinta textil para cerrar', 'Hilo'], techniques: ['costura-recta', 'jareta'], description: 'Bolsa plana de dos paneles, sin base y con doble cinta. Ajusta la capacidad al contenido real; la jareta ocupa parte del alto indicado.', searchTerms: [id, 'bolsa', 'saquito', 'organización', 'drawstring'] });
}
const rectangles: [string, string, number, number][] = [
 ['mesa','Mantel individual',450,320],['mesa-amplio','Mantel individual amplio',500,380],['desayuno','Individual de desayuno',400,300],['bandeja','Tapete para bandeja',350,250],['posavasos','Posavasos cuadrado',110,110],['taza','Tapete para taza',150,150],['plato','Tapete para plato',300,300],['centro','Centro de mesa',600,400],['camino','Camino de mesa corto',900,300],['camino-largo','Camino de mesa largo',1300,350],['servilleta','Servilleta reversible',350,350],['servilleta-grande','Servilleta de mesa amplia',450,450],['maquina','Tapete de máquina',650,450],['raton','Tapete textil de escritorio',280,230],['escritorio','Protector textil de escritorio',800,400],['marcapaginas','Marcapáginas textil',55,220],['muestrario','Base para muestrario',250,350],['cuadro','Panel decorativo textil',450,600]
];
for (const [id, name, w, h] of rectangles) add({ designGroup: rectangleDesignGroup(id), id: `reversible-${id}`, name: `${name} reversible · ${size(w,h)}`, collection: 'Mesa y escritorio', generatorId: 'textil-doble-cara', params: { ancho: w, alto: h }, flat: object('rectangulo', w, h, name), variantLabel: `Dos caras de ${size(w,h)} terminados`, materials: ['Tela principal', 'Tela de reverso', 'Hilo'], techniques: ['costura-recta', 'aplicacion', 'bordado'], description: 'Textil rectangular reversible, sin relleno. Las dos caras se cosen y voltean por una abertura; no es aislamiento térmico.', searchTerms: [id, 'mesa', 'hogar', 'escritorio'] });
for (const [w, h] of [[300,300],[350,350],[400,400],[450,450],[500,500],[550,550],[600,600],[650,650],[300,500],[350,550],[400,600],[450,650],[500,700],[500,750],[600,800],[700,900]]) for (const overlap of [100, 160]) {
  add({ id: `cojin-${w}-${h}-${overlap}`, name: `Funda de ${w === h ? 'cojín' : 'almohada'} · ${size(w,h)}, cruce ${fmt(overlap)}`, collection: 'Cojines y almohadas', generatorId: 'cojin-sobre', params: { ancho: w, alto: h, traslape: overlap }, flat: object('cojin', w, h, 'Funda de cojín'), variantLabel: `Funda de sobre ${size(w,h)}, cruce trasero ${fmt(overlap)}`, techniques: ['costura-recta', 'dobladillo'], description: 'Funda desmontable con un frente y dos piezas traseras cruzadas. No incluye relleno ni cierre; verifica las medidas del cojín real.', searchTerms: ['cojin', 'almohada', 'funda', 'hogar'] });
}
for (const circumference of [170, 190, 210, 230, 250, 280, 320, 360]) for (const height of [75, 100, 125, 150]) for (const overlap of [25, 40]) {
  add({ id: `bebida-${circumference}-${height}-${overlap}`, name: `Funda para recipiente · contorno ${fmt(circumference)}, alto ${fmt(height)}`, collection: 'Fundas para bebidas', generatorId: 'funda-bebida', params: { contorno: circumference, alto: height, traslape: overlap }, flat: object('funda-bebida', circumference / Math.PI, height, 'Funda para bebida'), variantLabel: `Contorno real ${fmt(circumference)}, alto ${fmt(height)}, cierre con traslape ${fmt(overlap)}`, materials: ['Velcro', 'Forro', 'Hilo'], description: 'Funda envolvente para un recipiente casi cilíndrico, abierta por arriba y abajo. Se calcula con su contorno, no con los mililitros.', searchTerms: ['cheve', 'cerveza', 'lata', 'vaso', 'botella', 'bebida'] });
}
for (const elastic of [130, 160, 190, 220, 250, 280]) for (const width of [20, 35, 50, 70]) for (const gather of [2.5, 3.5]) {
  add({ id: `dona-${elastic}-${width}-${gather * 10}`, name: `Dona de cabello · tubo ${fmt(width)}, frunce ×${gather}`, collection: 'Cabello y pañuelos', generatorId: 'dona-cabello', params: { elastico: elastic, ancho: width, frunce: gather }, flat: object('dona', 120, 120, 'Dona para cabello'), variantLabel: `Aro elástico ${fmt(elastic)}, tubo aplanado ${fmt(width)}, largo de tela ×${gather}`, materials: ['Elástico de 5–8 mm', 'Hilo'], techniques: ['costura-recta', 'frunces'], description: 'Dona de tela o scrunchie con tubo y aro de elástico. El volumen y largo real del tubo cambian con la proporción de frunce.', searchTerms: ['scrunchie', 'dona', 'cabello', 'coletero'] });
}
for (const width of [500, 600, 700, 800, 900]) for (const depth of [150, 220, 290, 360]) {
  add({ id: `bandana-${width}-${depth}`, name: `Bandana reversible · ${size(width,depth)}`, collection: 'Cabello y pañuelos', generatorId: 'bandana-reversible', params: { ancho: width, alto: depth }, flat: object('bandana', width, depth, 'Bandana triangular'), variantLabel: `Ancho de punta a punta ${fmt(width)}, profundidad ${fmt(depth)}`, materials: ['Tela principal', 'Tela de reverso', 'Hilo'], description: 'Pañuelo triangular reversible para anudar. La medida es del triángulo terminado, no una talla universal de cuello.', searchTerms: ['bandana', 'pañuelo', 'panuelo', 'triangulo'] });
}
for (const [w,h] of [[500,650],[550,750],[600,800],[650,850],[700,950],[800,1050]]) for (const pocket of [180, 240, 300]) for (const ties of [650, 900]) {
  add({ id: `delantal-${w}-${h}-${pocket}-${ties}`, name: `Delantal de taller · ${size(w,h)}, bolsillo ${fmt(pocket)}`, collection: 'Delantales de taller', generatorId: 'delantal-peto', params: { ancho: w, alto: h, anchoPeto: Math.round(w*.4), altoSisa: Math.round(h*.3), anchoBolsillo: pocket, altoBolsillo: 180, largoLazo: ties }, flat: object('delantal', w,h,'Delantal de peto'), variantLabel: `Cobertura ${size(w,h)}, bolsillo ${fmt(pocket)} × 18 cm, lazos ${fmt(ties)}`, materials: ['Hilo de coser'], techniques: ['costura-recta','dobladillo','bolsillos'], description: 'Delantal de peto con sisas rectas, bolsillo aplicado y tiras independientes. Ajusta cobertura, cuello y lazos sobre la persona antes de fijar.', searchTerms: ['delantal', 'taller', 'cocina', 'jardin', 'arte', 'costura'] });
}
for (const length of [650, 750, 850, 950, 1050]) for (const width of [35, 50, 70, 95]) {
  add({ id: `banda-${length}-${width}`, name: `Banda para anudar · ${size(length,width)}`, collection: 'Cabello y pañuelos', generatorId: 'banda-lazo', params: { largo: length, ancho: width }, flat: object('banda-lazo', length,width,'Banda de tela'), variantLabel: `Largo de punta a punta ${fmt(length)}, ancho plano ${fmt(width)}`, materials: ['Hilo'], description: 'Banda de dos capas para anudar. El largo incluye los extremos: comprueba el nudo y el contorno real antes de cortar.', searchTerms: ['banda', 'diadema', 'lazo', 'cabello', 'cinturon textil'] });
}
for (const width of [100, 150, 200, 250, 300]) for (const height of [140, 220, 300, 380]) {
  add({ id: `banderin-${width}-${height}`, name: `Banderín con jareta · ${size(width,height)}`, collection: 'Decoración y celebraciones', generatorId: 'banderin-jareta', params: { ancho: width, alto: height, jareta: 25 }, flat: object('banderin',width,height,'Banderín triangular'), variantLabel: `Triángulo terminado ${size(width,height)} y jareta superior de 2,5 cm`, materials: ['Cinta para colgar', 'Hilo'], techniques: ['costura-recta','jareta','aplicacion','bordado'], description: 'Banderín triangular forrado, con canal para cinta. La medida de alto define el triángulo; el margen del canal se calcula por separado.', searchTerms: ['banderin','guirnalda','fiesta','decoracion'] });
}
for (const [w,h,bridge] of [[190,80,16],[200,85,18],[210,90,18],[220,95,20],[230,100,22],[200,100,16],[220,85,18],[240,110,22]]) {
  add({ id: `antifaz-${w}-${h}-${bridge}`, name: `Antifaz forrado · ${size(w,h)}, puente ${fmt(bridge)}`, collection: 'Viaje y descanso', generatorId:'antifaz-forrado', params:{ancho:w,alto:h,puente:bridge}, flat:object('antifaz',w,h,'Antifaz'), variantLabel:`Ancho ${fmt(w)}, alto ${fmt(h)}, puente ${fmt(bridge)}`, materials:['Elástico suave','Forro','Hilo'], techniques:['costura-recta','forro'], description:'Antifaz de contorno curvo y dos capas, sin copas moldeadas. Comprueba su ajuste y el largo del elástico en la persona.',searchTerms:['antifaz','descanso','viaje'] });
}

// A use-case alias never counts twice as a separate pattern recipe.
const recipes = new Set<string>();
export const COLLECTION_CATALOG: CatalogModel[] = entries.filter(entry => {
  let shape = entry.params ?? {};
  if (entry.generatorId === 'funda-solapa') {
    // Different object thickness/ease can resolve to exactly the same sleeve.
    // Keep one useful recipe instead of inflating the inventory with aliases.
    const p = entry.params!;
    shape = { ancho: Number(p.ancho) + Number(p.grosor) + Number(p.holgura), alto: Number(p.alto) + Number(p.grosor) / 2 + Number(p.holgura) / 2, solapa: p.solapa };
  }
  const recipe = `${entry.generatorId}:${JSON.stringify(Object.entries(shape).sort(([a],[b]) => a.localeCompare(b)))}`;
  if (recipes.has(recipe)) return false;
  recipes.add(recipe);
  return true;
});
export const PATTERN_COLLECTIONS = [...new Set(COLLECTION_CATALOG.map(entry => entry.collection!))];
