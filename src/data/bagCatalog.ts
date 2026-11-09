import type { CatalogModel } from './catalog';

/* Bolsos y mochilas (2026-11-09) en la sección «Bolsos y bolsas»: ocho
 * construcciones nuevas a partir de las fotos de la usuaria. Generadores en
 * src/lib/pattern/generators/bags.ts y dibujos técnicos desde sus piezas en
 * src/data/bagFlats.ts. No se copian marcas, imágenes ni medidas: las de las
 * referencias solo sirven de comprobación. Experimental hasta coser muestras. */

const COLLECTION = 'Bolsos y mochilas';
const model = (m: Omit<CatalogModel, 'status' | 'variants' | 'type' | 'fabrics' | 'stretch' | 'fits'> & Partial<CatalogModel>): CatalogModel =>
  ({ status: 'experimental', variants: [], type: 'bolsos', fabrics: ['plano'], stretch: 'ninguna', fits: ['regular'], collection: COLLECTION, ...m });
const laptopGroup = { id: 'funda-portatil-cremallera', name: 'Funda acolchada para portátil con cremallera', preferred: true };

export const BAG_CATALOG: CatalogModel[] = [
  ...([['13', '13 pulgadas'], ['14', '14 pulgadas'], ['16', '15–16 pulgadas']] as const).map(([size, label]) => model({
    id: `funda-portatil-cremallera-${size}`, name: `Funda acolchada para portátil de ${label}`, sub: 'Fundas para tecnología', recipients: ['unisex'], difficulty: 3,
    techniques: ['costura-recta', 'cierre', 'forro', 'bolsillos'], generatorId: 'funda-portatil-cremallera', params: { tamano: size }, flat: { family: 'bolso', bagStyle: 'funda-portatil-cremallera' },
    variantLabel: `Para portátil de ${label}; también a medida con ancho, alto y grosor`, designGroup: laptopGroup,
    description: 'Funda con guata termoadhesiva y acolchado en canales o rombos, cremallera en tres lados, fuelle en la base, bolsillo exterior y bolsillo interior con divisiones. Calcula la holgura desde las medidas del portátil.',
    recommendedFabrics: ['Lona', 'Mezclilla', 'Algodón de patchwork'], materials: ['Cremallera continua con dos cursores', 'Guata termoadhesiva o espuma de 5 mm', 'Bies de 2,5 cm'],
    searchTerms: ['funda', 'portátil', 'laptop', 'computadora', 'ordenador', 'acolchada', 'cremallera', 'cierre', '13', '14', '15', '16']
  })),
  model({
    id: 'bolsa-u-bordada', name: 'Bolsa en U con bolsillo bordado', sub: 'Bolsas', recipients: ['mujer', 'hombre', 'unisex'], difficulty: 2,
    techniques: ['costura-recta', 'forro', 'bolsillos', 'bordado'], generatorId: 'bolsa-u-bolsillo', params: {}, flat: { family: 'bolso', bagStyle: 'bolsa-u-bolsillo' },
    designGroup: { id: 'bolsa-u-bordada', name: 'Bolsa en U con bolsillo bordado', preferred: true },
    description: 'Cuerpo con el fondo en U, fuelle con refuerzo en la base, forro, asas dobladas en cuatro y bolsillo redondeado con un bordado de ramitas para calcar.',
    recommendedFabrics: ['Lona', 'Loneta', 'Lino grueso'], materials: ['Entretela gruesa para la base', 'Hilo de bordar'],
    searchTerms: ['bolsa', 'tote', 'u', 'redondeada', 'bordado', 'lavanda', 'bolsillo']
  }),
  model({
    id: 'bolsa-asas-laterales', name: 'Bolsa de compra con asas laterales', sub: 'Bolsas', recipients: ['mujer', 'hombre', 'unisex'], difficulty: 2,
    techniques: ['costura-recta', 'forro'], generatorId: 'bolsa-asas-laterales', params: {}, flat: { family: 'bolso', bagStyle: 'bolsa-asas-laterales' },
    designGroup: { id: 'bolsa-asas-laterales', name: 'Bolsa de compra con asas laterales', preferred: true },
    description: 'Delantero y espalda con el asa en la misma pieza, costados que se estrechan hacia arriba y base. Las puntas de las asas se unen sobre cada costado.',
    recommendedFabrics: ['Lona', 'Gamuza sintética', 'Pana'], materials: ['Entretela gruesa para la base'],
    searchTerms: ['bolsa', 'compra', 'shopper', 'hobo', 'asas', 'una pieza', 'cesta']
  }),
  model({
    id: 'bolsa-estrella', name: 'Bolsa estrella con asa calada', sub: 'Bolsas', recipients: ['mujer', 'infantil', 'unisex'], difficulty: 2,
    techniques: ['costura-recta', 'forro', 'bolsillos'], generatorId: 'bolsa-estrella', params: {}, flat: { family: 'bolso', bagStyle: 'bolsa-estrella' },
    designGroup: { id: 'bolsa-estrella', name: 'Bolsa estrella con asa calada', preferred: true },
    description: 'Estrella forrada, cortada al doblez, con un asa calada en cada cara, refuerzo de entretela en la punta y bolsillo exterior.',
    recommendedFabrics: ['Lona', 'Loneta'], materials: ['Entretela termoadhesiva media'],
    searchTerms: ['bolsa', 'estrella', 'star', 'asa calada', 'forrada']
  }),
  model({
    id: 'tote-bolsillos', name: 'Tote de caja con bolsillos alrededor', sub: 'Bolsas', recipients: ['mujer', 'hombre', 'unisex'], difficulty: 2,
    techniques: ['costura-recta', 'forro', 'bolsillos', 'bordado'], generatorId: 'tote-bolsillos', params: {}, flat: { family: 'bolso', bagStyle: 'tote-bolsillos' },
    designGroup: { id: 'tote-bolsillos', name: 'Tote de caja con bolsillos alrededor', preferred: true },
    description: 'Delantero, espalda, costados y base con bolsillos en las cuatro caras. Las asas de cinta bajan por el delantero y dividen el bolsillo en tres. Admite flores bordadas.',
    recommendedFabrics: ['Fieltro grueso', 'Lona', 'Loneta'], materials: ['Cinta de asa de 3 cm', 'Hilos de bordar (opcional)'],
    searchTerms: ['tote', 'bolsa', 'bolsillos', 'caja', 'flores', 'bordado', 'fieltro', 'cinta']
  }),
  model({
    id: 'mochila-solapa', name: 'Mochila de solapa con hebillas', sub: 'Mochilas', recipients: ['mujer', 'hombre', 'unisex'], difficulty: 3,
    techniques: ['costura-recta', 'forro', 'bolsillos', 'jareta'], generatorId: 'mochila-solapa', params: {}, flat: { family: 'bolso', bagStyle: 'mochila-solapa' },
    designGroup: { id: 'mochila-solapa', name: 'Mochila de solapa con hebillas', preferred: true },
    description: 'Mochila de 32 × 45 × 14 cm con laterales y base, jareta con cordón bajo una solapa, bolsillo delantero y laterales con fuelle y solapa, correas con hebilla y tirantes acolchados regulables.',
    recommendedFabrics: ['Lona encerada', 'Loneta gruesa', 'Cordura'], materials: ['Hebillas de 25 mm', 'Pasadores y anillas en D', 'Cordón con tope', 'Espuma de 5 mm'],
    searchTerms: ['mochila', 'backpack', 'solapa', 'hebillas', 'excursión', 'rucksack', 'jareta']
  }),
  model({
    id: 'mochila-osito', name: 'Mochila osito infantil', sub: 'Mochilas', recipients: ['toddler', 'infantil'], difficulty: 3,
    techniques: ['costura-recta', 'cierre', 'forro', 'bolsillos'], generatorId: 'mochila-osito', params: {}, flat: { family: 'bolso', bagStyle: 'mochila-osito' },
    designGroup: { id: 'mochila-osito', name: 'Mochila osito infantil', preferred: true },
    description: 'Mochila pequeña en arco con cremallera arriba, banda de costados y base, orejas cosidas en la costura, bolsillo delantero y tirantes regulables. Sin cordones.',
    recommendedFabrics: ['Pana gruesa', 'Loneta', 'Borreguito'], materials: ['Cremallera continua', 'Pasadores y anillas de 25 mm', 'Entretela gruesa'],
    searchTerms: ['mochila', 'osito', 'oso', 'infantil', 'guardería', 'pana', 'orejas']
  }),
  model({
    id: 'rinonera-organizador', name: 'Riñonera organizadora de cadera', sub: 'Riñoneras', recipients: ['mujer', 'hombre', 'unisex'], difficulty: 2,
    techniques: ['costura-recta', 'cierre', 'forro', 'bolsillos'], generatorId: 'rinonera-organizador', params: {}, flat: { family: 'bolso', bagStyle: 'rinonera-organizador' },
    designGroup: { id: 'rinonera-organizador', name: 'Riñonera organizadora de cadera', preferred: true },
    description: 'Delantal de cadera al doblez con bolsillo de cremallera, bolsillo grande con ranuras para bolígrafos, bolsillo de tijeras y cinturón calculado con tu contorno.',
    recommendedFabrics: ['Lino grueso', 'Lona', 'Sarga'], materials: ['Cremallera metálica', 'Hebilla o anillas en D de 25 mm'],
    searchTerms: ['riñonera', 'delantal', 'cadera', 'organizador', 'costura', 'tijeras', 'herramientas', 'jardín']
  })
];
