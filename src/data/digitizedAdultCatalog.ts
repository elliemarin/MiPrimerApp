import type { CatalogModel, Recipient } from './catalog';
import type { FlatSpec, LegStyle, PantsOpts } from './flats';

/* Tercer y cuarto lote digitalizados desde fotos (2026-11-01 y 2026-11-02):
 * pantalones (barrel, palazzo, volante, pinzas, jogger y baggy de felpa,
 * cargo recto), chaquetas (ranglan, mezclilla, campo y safari), sudaderas
 * (media cremallera, murciélago) y un culotte de encaje. No se copiaron
 * imágenes, marcas ni medidas: todo sale de las medidas de la talla y es
 * experimental hasta coser una muestra. */

const TREND = 'Tendencias', LINGERIE = 'Lencería';
const everyone: Recipient[] = ['infantil', 'mujer', 'hombre', 'unisex'];
const adults: Recipient[] = ['mujer', 'hombre', 'unisex'];
const fromToddler: Recipient[] = ['toddler', 'infantil', 'mujer', 'hombre', 'unisex'];
const pants = (leg: LegStyle, extra: Partial<PantsOpts> = {}): FlatSpec => ({ family: 'pantalon', pants: { leg, length: 'largo', waist: 'elastica', pockets: 'laterales', ...extra } });
const model = (m: Omit<CatalogModel, 'status' | 'variants'> & { variants?: CatalogModel['variants'] }): CatalogModel => ({ status: 'experimental', variants: [], ...m });
const jeansTerms = ['mezclilla', 'denim', 'jeans', 'vaquero'];

export const DIGITIZED_ADULT_CATALOG: CatalogModel[] = [
  // ---------------------------------------------------------- Pantalones (tercer lote)
  model({ id: 'barrel-elastico', name: 'Pantalón barrel con cintura elástica', type: 'inferiores', sub: 'Pantalones de tendencia', recipients: everyone, difficulty: 2, fabrics: ['plano'], stretch: 'ninguna', fits: ['holgado'], techniques: ['costura-recta', 'jareta', 'bolsillos'],
    generatorId: 'pantalon-mezclilla', params: { silueta: 'barrel', cintura: 'elastica', bolsillos: 'frontales' }, flat: pants('barrel'),
    description: 'Barrel con la pierna abombada en la rodilla y cerrada en el bajo, cintura elástica sin bragueta y bolsillos delanteros inclinados. Queda muy bien en rayas diplomáticas.', recommendedFabrics: ['Lana fría de rayas', 'Gabardina', 'Lino grueso', 'Mezclilla suave'], materials: ['Elástico de 3–4 cm', 'Forro para bolsas'],
    collection: TREND, searchTerms: ['barrel', 'barril', 'elastico', 'rayas', 'diplomatica', 'pinstripe'], designGroup: { id: 'pantalon-barrel', name: 'Pantalón barrel' } }),
  model({ id: 'palazzo-botones-laterales', name: 'Palazzo con pretina y botones laterales', type: 'inferiores', sub: 'Pantalones de tendencia', recipients: ['infantil', 'mujer', 'unisex'], difficulty: 3, fabrics: ['plano'], stretch: 'ninguna', fits: ['holgado'], techniques: ['costura-recta', 'pinzas', 'botones', 'bolsillos'],
    generatorId: 'pantalon-cintura-elastica', params: { estilo: 'ancho', cintura: 'pretina', amplitudBajo: 1.5, bolsillos: 'costado' }, flat: pants('palazzo', { waist: 'pretina', fly: false }),
    description: 'Palazzo de tiro alto sin bragueta: cadera ajustada con pinzas, pretina recta y abertura en el costado con vista, tapeta y botones; bolsillos en la costura y pierna muy amplia.', recommendedFabrics: ['Crepé', 'Lino', 'Viscosa pesada', 'Gabardina fluida'], materials: ['Botones de 15 mm', 'Entretela para la pretina', 'Forro para bolsas'],
    collection: TREND, searchTerms: ['palazzo', 'botones laterales', 'pretina', 'pierna ancha', 'tiro alto'], designGroup: { id: 'palazzo-botones-laterales', name: 'Palazzo con botones laterales', preferred: true } }),
  model({ id: 'palazzo-elastico', name: 'Palazzo de cintura elástica con cordón', type: 'inferiores', sub: 'Pantalones de tendencia', recipients: everyone, difficulty: 1, fabrics: ['plano'], stretch: 'ninguna', fits: ['holgado', 'oversize'], techniques: ['costura-recta', 'jareta', 'bolsillos'],
    generatorId: 'pantalon-cintura-elastica', params: { estilo: 'ancho', amplitudBajo: 1.4, cordon: 'si', bolsillos: 'costado' }, flat: pants('palazzo'),
    description: 'Pantalón muy ancho con jareta elástica, cordón (solo en tallas de adulto) y bolsillos en la costura. Pensado para rayas y telas con caída.', recommendedFabrics: ['Lino de rayas', 'Viscosa', 'Popelina'], materials: ['Elástico de 3 cm', 'Cordón plano (adulto)', 'Forro para bolsas'],
    collection: TREND, searchTerms: ['palazzo', 'cordon', 'jareta', 'elastico', 'cintura elastica', 'rayas', 'ancho', 'amplio'], designGroup: { id: 'tipo-pantalon-amplio', name: 'Pantalón amplio de cintura elástica' } }),
  model({ id: 'pantalon-volante', name: 'Pantalón con volante en el bajo y alforzas', type: 'inferiores', sub: 'Pantalones de tendencia', recipients: ['toddler', 'infantil', 'mujer', 'unisex'], difficulty: 2, fabrics: ['plano'], stretch: 'ninguna', fits: ['holgado'], techniques: ['costura-recta', 'jareta', 'frunces'],
    generatorId: 'pantalon-cintura-elastica', params: { estilo: 'ancho', volante: 'si', alforzas: 3 }, flat: pants('ancho', { pockets: 'ninguno', ruffle: true }),
    description: 'Pantalón ancho de cintura elástica con tres alforzas sobre el bajo y un volante fruncido cosido a la pierna. El largo ya descuenta el volante y suma la tela de las alforzas.', recommendedFabrics: ['Lino', 'Batista', 'Popelina', 'Gasa de algodón'], materials: ['Elástico de 2–3 cm'],
    collection: TREND, searchTerms: ['volante', 'alforzas', 'pantalon con volante', 'ruffle', 'romantico'], designGroup: { id: 'pantalon-volante', name: 'Pantalón con volante y alforzas', preferred: true } }),

  // ---------------------------------------------------------- Pantalones (cuarto lote, hombre)
  model({ id: 'jogger-oversize-felpa', name: 'Jogger oversize de felpa con puños', type: 'inferiores', sub: 'Joggers', recipients: adults, difficulty: 2, fabrics: ['punto'], stretch: 'baja', fits: ['oversize'], techniques: ['tejido-punto', 'jareta', 'puno', 'bolsillos'],
    generatorId: 'pantalon-cintura-elastica', params: { estilo: 'jogger', holguraCadera: 250, bolsillos: 'costado', cordon: 'si' }, flat: pants('jogger'),
    description: 'Jogger muy holgado en cadera y muslo que se recoge en puños de rib; jareta con elástico ancho y cordón, bolsillos en la costura.', recommendedFabrics: ['Felpa perchada', 'French terry grueso', 'Sudadera de 400–470 g/m²'], materials: ['Elástico de 4–5 cm', 'Cordón', 'Rib para puños'],
    collection: TREND, searchTerms: ['jogger', 'oversize', 'felpa', 'chandal', 'buzo', 'pants', 'sudadera', 'hombre', 'cintura elastica', 'puños'], designGroup: { id: 'tipo-jogger', name: 'Jogger con puños' } }),
  model({ id: 'baggy-felpa', name: 'Pantalón baggy de felpa con cordón', type: 'inferiores', sub: 'Pantalones amplios', recipients: adults, difficulty: 1, fabrics: ['punto'], stretch: 'baja', fits: ['oversize'], techniques: ['tejido-punto', 'jareta', 'bolsillos'],
    generatorId: 'pantalon-cintura-elastica', params: { estilo: 'ancho', holguraCadera: 200, bolsillos: 'costado', cordon: 'si' }, flat: pants('ancho'),
    description: 'Pantalón de buzo ancho y recto hasta el suelo: jareta con elástico y cordón, bolsillos en la costura y bajo dobladillado.', recommendedFabrics: ['Felpa', 'Franela de algodón', 'Algodón perchado'], materials: ['Elástico de 4 cm', 'Cordón'],
    collection: TREND, searchTerms: ['baggy', 'felpa', 'buzo', 'cordon', 'pantalon de chandal', 'hombre', 'ancho', 'amplio', 'cintura elastica'], designGroup: { id: 'tipo-pantalon-amplio', name: 'Pantalón amplio de cintura elástica' } }),
  model({ id: 'cargo-recto', name: 'Pantalón cargo recto con bragueta', type: 'inferiores', sub: 'Mezclilla', recipients: everyone, difficulty: 3, fabrics: ['plano'], stretch: 'ninguna', fits: ['regular'], techniques: ['costura-recta', 'cierre', 'bolsillos', 'botones'],
    generatorId: 'pantalon-mezclilla', params: { silueta: 'recto', cintura: 'pretina', bolsillos: 'cargo' }, flat: pants('cargo', { waist: 'pretina', pockets: 'cargo' }),
    description: 'Cargo de pierna recta: pretina con presillas, bragueta con cierre, bolsillos delanteros, bolsillos de fuelle con cartera en el muslo y bolsillos traseros.', recommendedFabrics: ['Lona de algodón', 'Gabardina', 'Ripstop', 'Pana'], materials: ['Cierre de bragueta', 'Botón de jeans', 'Broches o botones para carteras', 'Forro para bolsas'],
    collection: TREND, searchTerms: ['cargo', 'recto', 'fuelle', 'utilitario', 'hombre', ...jeansTerms], designGroup: { id: 'pantalon-cargo', name: 'Pantalón cargo' } }),

  // ---------------------------------------------------------- Chaquetas y sudaderas
  model({ id: 'chaqueta-ranglan', name: 'Chaqueta ranglan con cuello alto', type: 'abrigo', sub: 'Chaquetas de tendencia', recipients: fromToddler, difficulty: 3, fabrics: ['plano'], stretch: 'ninguna', fits: ['regular'], techniques: ['costura-recta', 'cierre', 'puno', 'bolsillos'],
    generatorId: 'chaqueta-ranglan', params: { bolsillos: 'si' }, flat: { family: 'top', kids: 'chaqueta-ranglan' },
    description: 'Chaqueta con manga ranglan de dos piezas (delantera y trasera) resuelta para que todas las costuras midan igual, cuello alto, cierre, banda y puños, y bolsillos de vivo.', recommendedFabrics: ['Gabardina', 'Lona ligera', 'Nailon', 'Pana fina'], materials: ['Cierre separable', 'Rib o tela para banda y puños', 'Forro para bolsas'],
    collection: TREND, searchTerms: ['ranglan', 'raglan', 'chaqueta', 'chamarra', 'cuello alto', 'cierre'], designGroup: { id: 'chaqueta-ranglan', name: 'Chaqueta ranglan', preferred: true } }),
  model({ id: 'sobrecamisa-cuello-tira', name: 'Sobrecamisa oversize con cuello de tira y bolsillos grandes', type: 'abrigo', sub: 'Chaquetas de tendencia', recipients: everyone, difficulty: 3, fabrics: ['plano'], stretch: 'ninguna', fits: ['oversize'], techniques: ['costura-recta', 'botones', 'bolsillos'],
    generatorId: 'oversize-hombro-caido', params: { prenda: 'sobrecamisa', cuelloTipo: 'tira', bolsillos: 'grandes' }, flat: { family: 'top', top: { style: 'shacket', type: 'chaqueta', sleeve: 'larga', neck: 'alto', closure: 'botones', length: 760, pocket: 'parche', fit: 1.25 } },
    description: 'Shacket de hombro caído con cuello de tira (solo pie, sin pala), tapeta abotonada y dos bolsillos de parche grandes con cartera.', recommendedFabrics: ['Paño ligero', 'Franela', 'Gabardina', 'Pana'], materials: ['Botones de 18–20 mm', 'Entretela'],
    collection: TREND, searchTerms: ['shacket', 'sobrecamisa', 'cuello mao', 'cuello de tira', 'oversize', 'bolsillos grandes'], designGroup: { id: 'tipo-sobrecamisa', name: 'Sobrecamisa oversize' } }),
  model({ id: 'sudadera-bloques', name: 'Sudadera de media cremallera en bloques de color', type: 'superiores', sub: 'Sudaderas de tendencia', recipients: fromToddler, difficulty: 2, fabrics: ['punto'], stretch: 'baja', fits: ['holgado'], techniques: ['tejido-punto', 'cierre', 'jareta'],
    generatorId: 'sudadera-media-cremallera', params: { bloques: 'si' }, flat: { family: 'top', kids: 'sudadera-bloques' },
    description: 'Sudadera de hombro caído con cuello alto y media cremallera; cuerpo y mangas se cortan en dos bloques de color a la misma altura. Puños con elástico.', recommendedFabrics: ['Borreguito', 'Polar', 'Felpa'], materials: ['Cremallera cerrada', 'Elástico de 10 mm'],
    collection: TREND, searchTerms: ['media cremallera', 'half zip', 'bloques', 'colorblock', 'polar', 'sudadera', 'cuello alto'], designGroup: { id: 'sudadera-media-cremallera', name: 'Sudadera de media cremallera', preferred: true } }),
  model({ id: 'sudadera-media-cremallera-lisa', name: 'Sudadera de media cremallera lisa', type: 'superiores', sub: 'Sudaderas de tendencia', recipients: fromToddler, difficulty: 2, fabrics: ['punto'], stretch: 'baja', fits: ['holgado'], techniques: ['tejido-punto', 'cierre', 'jareta'],
    generatorId: 'sudadera-media-cremallera', params: { bloques: 'no' }, flat: { family: 'top', kids: 'sudadera-media-cremallera' },
    description: 'La misma sudadera de media cremallera en un solo color, con cuerpo y mangas enteros.', recommendedFabrics: ['Polar', 'Felpa', 'Borreguito'], materials: ['Cremallera cerrada', 'Elástico de 10 mm'],
    collection: TREND, searchTerms: ['media cremallera', 'half zip', 'sudadera', 'polar'], designGroup: { id: 'sudadera-media-cremallera', name: 'Sudadera de media cremallera' } }),
  model({ id: 'buzo-murcielago', name: 'Buzo corto con capucha y manga murciélago', type: 'superiores', sub: 'Sudaderas de tendencia', recipients: fromToddler, difficulty: 2, fabrics: ['punto'], stretch: 'media', fits: ['oversize'], techniques: ['tejido-punto', 'puno', 'bolsillos', 'jareta'],
    generatorId: 'buzo-murcielago', params: {}, flat: { family: 'top', kids: 'buzo-murcielago' },
    description: 'Hoodie corto con manga murciélago: panel central y laterales que incluyen la manga (bloques de color), capucha forrada, bolsillos en la costura del panel, puños de rib y banda con cordón en tallas de adulto.', recommendedFabrics: ['Felpa', 'French terry', 'Jersey grueso'], materials: ['Rib para puños', 'Cordón (adulto)', 'Jersey para el forro de la capucha'],
    collection: TREND, searchTerms: ['murcielago', 'batwing', 'hoodie', 'buzo', 'capucha', 'corto', 'cropped', 'bloques'], designGroup: { id: 'buzo-murcielago', name: 'Buzo corto murciélago', preferred: true } }),
  model({ id: 'chaqueta-campo', name: 'Chaqueta de campo con cuello alto y cremallera', type: 'abrigo', sub: 'Chaquetas por estilo', recipients: everyone, difficulty: 3, fabrics: ['plano'], stretch: 'ninguna', fits: ['regular'], techniques: ['costura-recta', 'cierre', 'bolsillos', 'dobladillo'],
    generatorId: 'chaqueta-campo', params: { cierre: 'cremallera', cuelloTipo: 'alto', bolsillos: 'cuatro' }, flat: { family: 'top', top: { style: 'safari', canesu: false, type: 'chaqueta', sleeve: 'larga', neck: 'alto', closure: 'cierre', length: 720, pocket: 'parche', fit: 1.12 } },
    description: 'Chaqueta recta con cuello alto, cremallera separable bajo una tapeta de broches, cuatro bolsillos de parche con cartera y pestañas de broche en los puños.', recommendedFabrics: ['Sarga de algodón', 'Gabardina', 'Lona ligera'], materials: ['Cremallera separable', 'Broches de presión', 'Entretela'],
    collection: TREND, searchTerms: ['chaqueta de campo', 'field jacket', 'safari', 'utilitaria', 'militar', 'cuatro bolsillos', 'cuello alto', 'hombre'], designGroup: { id: 'chaqueta-safari', name: 'Chaqueta safari de bolsillos' } }),

  // ---------------------------------------------------------- Lencería
  model({ id: 'culotte-encaje', name: 'Culotte de encaje sin costura de costado', type: 'inferiores', sub: 'Lencería', recipients: ['mujer'], difficulty: 2, fabrics: ['punto'], stretch: 'alta', fits: ['ajustado'], techniques: ['tejido-punto'],
    generatorId: 'culotte-encaje', params: { acabado: 'puntilla', refuerzo: 'si' }, flat: { family: 'pantalon', kids: 'culotte-encaje' },
    description: 'Culotte bajo (boyshort) de una pieza por lado: delantero y trasero continuos sin costura de costado, costuras centrales, entrepierna corta y refuerzo de algodón. Bordes con puntilla elástica.', recommendedFabrics: ['Encaje elástico', 'Tul elástico bordado', 'Microfibra'], materials: ['Puntilla elástica de 1–2 cm', 'Punto de algodón para el refuerzo'],
    collection: LINGERIE, searchTerms: ['culotte', 'lenceria', 'encaje', 'braga', 'boyshort', 'panty', 'calzon', 'ropa interior', 'hipster'], designGroup: { id: 'culotte-encaje', name: 'Culotte de lencería', preferred: true } }),
  model({ id: 'culotte-punto-picot', name: 'Culotte de punto con elástico picot', type: 'inferiores', sub: 'Lencería', recipients: ['mujer'], difficulty: 2, fabrics: ['punto'], stretch: 'alta', fits: ['ajustado'], techniques: ['tejido-punto', 'dobladillo'],
    generatorId: 'culotte-encaje', params: { acabado: 'elastico', refuerzo: 'si' }, flat: { family: 'pantalon', kids: 'culotte-encaje' },
    description: 'El mismo culotte en punto liso (algodón con elastano o microfibra), terminado con elástico picot doblado hacia dentro.', recommendedFabrics: ['Jersey de algodón con elastano', 'Microfibra', 'Modal'], materials: ['Elástico picot de 8–10 mm', 'Punto de algodón para el refuerzo'],
    collection: LINGERIE, searchTerms: ['culotte', 'lenceria', 'picot', 'braga', 'ropa interior', 'algodon'], designGroup: { id: 'culotte-encaje', name: 'Culotte de lencería' } })
];

type Upgrade = Partial<CatalogModel> & Pick<CatalogModel, 'generatorId' | 'params' | 'description'>;
const pleated = (silueta: string, description: string, searchTerms: string[]): Upgrade => ({
  status: 'experimental', generatorId: 'pantalon-mezclilla', params: { silueta, cintura: 'pretina', bolsillos: 'frontales', pinzas: 'dos', tiro: 'alto' },
  recipients: adults, fabrics: ['plano'], stretch: 'ninguna', fits: ['holgado', 'oversize'], techniques: ['costura-recta', 'pinzas', 'cierre', 'bolsillos', 'botones'], difficulty: 3, collection: TREND,
  recommendedFabrics: ['Lana fría', 'Gabardina', 'Sarga', 'Lino grueso'], materials: ['Cierre de bragueta', 'Botón', 'Entretela para la pretina', 'Forro para bolsas'],
  variants: [{ name: 'Pinzas', text: 'Una o dos pinzas delanteras; la pretina se embebe y la cadera lo compensa.' }], description, searchTerms
});

/** Existing inspiration IDs that now generate a real pattern (their photo is kept). */
const UPGRADES: Record<string, Upgrade> = {
  'pantalon-palazzo': pleated('ancho', 'Palazzo de tiro alto con dos pinzas delanteras, pretina, bragueta con cierre y bolsillos delanteros inclinados; pierna ancha y recta desde la cadera.', ['palazzo', 'pinzas', 'pierna ancha', 'oversize', 'sastre', 'wide leg']),
  'pantalon-pinzas': pleated('recto', 'Pantalón de vestir de tiro alto con dos pinzas delanteras, pretina, bragueta con cierre y bolsillos delanteros inclinados.', ['pinzas', 'pliegues', 'sastre', 'vestir', 'chino']),
  'cazadora-mezclilla': {
    status: 'experimental', generatorId: 'cazadora-mezclilla', params: { bolsillos: 'pecho-vivo' }, recipients: everyone, fabrics: ['plano'], stretch: 'ninguna', fits: ['regular'], difficulty: 3, collection: TREND,
    techniques: ['costura-recta', 'botones', 'bolsillos'], recommendedFabrics: ['Mezclilla de 10–14 oz', 'Pana', 'Sarga'], materials: ['Botones de golpe', 'Entretela', 'Hilo de pespunte'],
    description: 'Cazadora de mezclilla clásica: canesú delantero y de espalda, paneles centrales y laterales, bolsillos de pecho con cartera y punta, vivos laterales, cuello camisero, pretina y puños abotonados con pliegues.',
    variants: [{ name: 'Corta', text: 'La cazadora corta es la misma construcción con menos largo y solo bolsillos de pecho.' }],
    searchTerms: ['cazadora', 'chaqueta de mezclilla', 'trucker', 'canesu', 'chamarra', ...jeansTerms]
  },
  'cazadora-denim-corta': {
    status: 'experimental', generatorId: 'cazadora-mezclilla', params: { bolsillos: 'pecho', largoExtra: -110 }, recipients: adults, fabrics: ['plano'], stretch: 'ninguna', fits: ['regular', 'holgado'], difficulty: 3, collection: TREND,
    techniques: ['costura-recta', 'botones', 'bolsillos'], recommendedFabrics: ['Mezclilla', 'Pana fina'], materials: ['Botones de golpe', 'Entretela', 'Hilo de pespunte'],
    description: 'Cazadora de mezclilla corta (cropped) con canesú, paneles, bolsillos de pecho con cartera, pretina y puños abotonados.', variants: [],
    searchTerms: ['cazadora', 'corta', 'cropped', 'trucker', ...jeansTerms]
  },
  'chaqueta-safari': {
    status: 'experimental', generatorId: 'chaqueta-campo', params: { cierre: 'botones', cuelloTipo: 'camisero', bolsillos: 'cuatro' }, recipients: everyone, fabrics: ['plano'], stretch: 'ninguna', fits: ['regular'], difficulty: 3, collection: TREND,
    techniques: ['costura-recta', 'botones', 'bolsillos', 'dobladillo'], recommendedFabrics: ['Gabardina', 'Sarga de algodón', 'Lino grueso'], materials: ['Botones de 18–20 mm', 'Broches de presión', 'Entretela'],
    description: 'Chaqueta safari recta con cuello camisero, cierre de botones, cuatro bolsillos de parche con cartera y pestañas en los puños.',
    variants: [{ name: 'Chaqueta de campo', text: 'Con cuello alto y cremallera bajo tapeta de broches.' }],
    flat: { family: 'top', top: { style: 'safari', canesu: false, type: 'chaqueta', sleeve: 'larga', neck: 'camisa', closure: 'botones', length: 780, pocket: 'parche', fit: 1.14 } },
    searchTerms: ['safari', 'chaqueta de bolsillos', 'utilitaria', 'cuatro bolsillos'], designGroup: { id: 'chaqueta-safari', name: 'Chaqueta safari de bolsillos', preferred: true }
  }
};

export function withAdultPatterns(m: CatalogModel): CatalogModel {
  const up = UPGRADES[m.id];
  return up ? { ...m, ...up } : m;
}
