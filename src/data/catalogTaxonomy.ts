import type { CatalogModel, GarmentType, Recipient, Technique } from './catalog';
import { COSTUME_EXPANSION_FAMILY_LABELS, COSTUME_EXPANSION_FAMILIES } from './costumeExpansion';

/** A family identifies the item itself. Collections, fabric recommendations and
 * optional decorations never assign a family. Every current design is listed. */
export const FAMILY_LABEL = {
  ...COSTUME_EXPANSION_FAMILY_LABELS,
  hoodie: 'Hoodies', sudadera: 'Sudaderas sin capucha', chaqueta: 'Chaquetas',
  chaleco: 'Chalecos', cardigan: 'Cárdigans', abrigo: 'Abrigos y parkas',
  poncho: 'Ponchos', ruana: 'Ruanas', capa: 'Capas',
  camiseta: 'Camisetas', camisa: 'Camisas', top: 'Blusas, tops y túnicas', sueter: 'Suéteres',
  pantalon: 'Pantalones', jogger: 'Joggers', short: 'Shorts', falda: 'Faldas',
  vestido: 'Vestidos', peto: 'Petos y jumpers', mono: 'Monos y enterizos', pijama: 'Pijamas',
  body: 'Pañaleros / bodies', mameluco: 'Mamelucos', babero: 'Baberos', gorro: 'Gorros y bonetes',
  cubrepanal: 'Cubrepañales y bombachos', patucos: 'Patucos de bebé', 'saco-dormir': 'Sacos de dormir', toalla: 'Toallas con capucha', conjunto: 'Conjuntos de bebé',
  tote: 'Bolsas tote', 'bolsa-jareta': 'Bolsas con jareta', estuche: 'Estuches y neceseres', bandolera: 'Bandoleras',
  'funda-tecnologia': 'Fundas para tecnología', 'funda-lectura': 'Fundas para libros y documentos',
  'funda-costura': 'Fundas para costura', 'funda-lentes': 'Fundas para lentes',
  cojin: 'Fundas de cojín', 'funda-bebida': 'Fundas para bebidas', 'funda-silla': 'Fundas para sillas',
  cabello: 'Bandas y donas de cabello', bandana: 'Bandanas y pañuelos',
  delantal: 'Delantales', antifaz: 'Antifaces', banderin: 'Banderines',
  manteleria: 'Manteles y servilletas', posavasos: 'Posavasos', tapete: 'Tapetes y protectores',
  marcapaginas: 'Marcapáginas', decoracion: 'Paneles decorativos', muestrario: 'Bases de muestrario',
  organizador: 'Organizadores', sombrero: 'Sombreros', corona: 'Coronas', orejas: 'Orejas de disfraz',
  corbata: 'Corbatas y pajaritas', mitones: 'Mitones', pantuflas: 'Pantuflas',
  cinturon: 'Cinturones', pulsera: 'Pulseras', 'lazo-regalo': 'Lazos de regalo', cesto: 'Cestos',
  reparacion: 'Arreglos y reparaciones', aplicacion: 'Parches y collage',
  'sin-clasificar': 'Por clasificar'
} as const;
export type CatalogFamily = keyof typeof FAMILY_LABEL;

/** Reviewed construction IDs, including inspirations with no pattern engine.
 * Adding a design requires classifying it here; the audit test rejects omissions. */
const DESIGNS: Partial<Record<CatalogFamily, readonly string[]>> = {
  hoodie: ['hoodie', 'tipo-hoodie'],
  sudadera: ['sudadera', 'tipo-sudadera'],
  chaqueta: ['chaqueta-cierre', 'tipo-bomber', 'cazadora-mezclilla', 'cazadora-denim-corta', 'tipo-sobrecamisa', 'chaqueta-trabajo', 'chaqueta-acolchada', 'chaqueta-biker', 'chaqueta-safari', 'chaqueta-varsity', 'anorak-canguro', 'bolero-corto', 'tipo-chaqueta-hombro-caido', 'chaqueta-collage-bandas', 'chaqueta-patchwork-franjas', 'chaqueta-patchwork-cuadros', 'chaqueta-canesu-diagonal', 'chaqueta-collage-irregular'],
  chaleco: ['chaleco', 'chaleco-acolchado', 'chaleco-punto-v', 'tipo-chaleco-abierto'],
  cardigan: ['tipo-cardigan-abierto'],
  abrigo: ['abrigo', 'gabardina-cruzada', 'trench-corto', 'abrigo-acolchado-largo', 'parka-capucha'],
  poncho: ['poncho-capucha-inspiracion', 'tipo-poncho'], ruana: ['tipo-ruana'],
  capa: ['capa-circular', 'capa-capucha', 'tipo-disfraz-capa'],
  camiseta: ['camiseta-basica', 'camiseta-larga', 'tipo-camiseta-oversize'], camisa: ['camisa-clasica', 'camisa-boxy'],
  top: ['blusa-v', 'tunica-suelta', 'tipo-top-cuadrado', 'tipo-top-cuadrado-sin-mangas'],
  sueter: ['sueter-oversize', 'sueter-tortuga', 'sueter-corto'],
  pantalon: ['tipo-pantalon-recto', 'tipo-pantalon-amplio', 'pantalon-baggy', 'pantalon-barrel', 'pantalon-cargo', 'pantalon-palazzo', 'pantalon-pinzas', 'pantalon-pitillo', 'pantalon-acampanado', 'jeans-recto', 'jeans-mom', 'jeans-ancho'],
  jogger: ['tipo-jogger'], short: ['short-elastico'], pijama: ['pantalon-pijama', 'pijama-camisa'],
  falda: ['tipo-falda-fruncida', 'falda-recta', 'falda-a', 'tipo-falda-circular', 'falda-tableada', 'tipo-falda-tul', 'tipo-falda-olanes'],
  vestido: ['vestido-camisero', 'tipo-vestido-trapecio', 'tipo-vestido-tirantes'], peto: ['overol', 'tipo-jumper-falda', 'peto-bermuda', 'peto-palazzo', 'tipo-peto-bebe'],
  mono: ['mono-camisero', 'mono-mecanico', 'mono-palazzo', 'mono-cruzado', 'playsuit-camisero', 'mono-baggy'],
  body: ['body-bebe'], mameluco: ['mameluco'], babero: ['babero', 'tipo-babero-bandana'], gorro: ['gorro', 'tipo-bonete', 'tipo-gorro-orejas'],
  cubrepanal: ['tipo-cubrepanal'], patucos: ['tipo-patucos'], 'saco-dormir': ['tipo-saco-dormir'], toalla: ['tipo-toalla-capucha'], conjunto: ['tipo-conjunto-bebe'],
  tote: ['tipo-bolsa-tote'], 'bolsa-jareta': ['tipo-bolsa-jareta'], estuche: ['neceser', 'tipo-estuche-cierre'], bandolera: ['bandolera'],
  'funda-tecnologia': ['tipo-funda-portatil', 'tipo-funda-tableta', 'tipo-funda-telefono', 'tipo-funda-lector', 'tipo-funda-consola', 'tipo-funda-cables'],
  'funda-lectura': ['tipo-funda-libro', 'tipo-funda-cuaderno', 'tipo-funda-tarjetas', 'tipo-funda-pasaporte'],
  'funda-costura': ['tipo-funda-patrones', 'tipo-funda-bastidor', 'tipo-funda-muestrario'],
  'funda-lentes': ['tipo-funda-lentes'], cojin: ['tipo-cojin'], 'funda-bebida': ['tipo-funda-bebida'], 'funda-silla': ['funda-silla'],
  cabello: ['tipo-dona-cabello', 'tipo-banda-cabello'], bandana: ['tipo-bandana'],
  delantal: ['tipo-delantal'], antifaz: ['tipo-antifaz'], banderin: ['tipo-banderin'],
  manteleria: ['tipo-textil-individual', 'tipo-textil-servilleta', 'tipo-textil-centro', 'tipo-textil-camino'],
  posavasos: ['tipo-textil-posavasos'],
  tapete: ['tipo-textil-maquina', 'tipo-textil-bandeja', 'tipo-textil-taza', 'tipo-textil-plato', 'tipo-textil-raton', 'tipo-textil-escritorio'],
  marcapaginas: ['tipo-textil-marcapaginas'], decoracion: ['tipo-textil-cuadro'], muestrario: ['tipo-textil-muestrario'],
  organizador: ['organizador-pared', 'organizador-agujas', 'portacubiertos-enrollable'],
  sombrero: ['sombrero-pescador', 'tipo-disfraz-sombrero'], corona: ['tipo-disfraz-corona'], orejas: ['tipo-disfraz-orejas'],
  corbata: ['corbata-clasica', 'pajarita'], mitones: ['mitones-polar'], pantuflas: ['pantuflas'],
  cinturon: ['cinturon-tela'], pulsera: ['pulsera-tela'], 'lazo-regalo': ['lazo-regalo'], cesto: ['cesto-ropa', 'cesto-pan'],
  reparacion: ['intervenir-camisa', 'intervenir-pantalon', 'remiendo-rodilla', 'acortar-bajo'],
  aplicacion: ['parche-personalizado', 'collage-montanas']
};
export const FAMILY_BY_DESIGN = { ...Object.fromEntries(Object.entries(DESIGNS).flatMap(([family, ids]) => ids.map(id => [id, family]))), ...COSTUME_EXPANSION_FAMILIES } as Record<string, CatalogFamily>;

export function familyOf(model: CatalogModel): CatalogFamily {
  return FAMILY_BY_DESIGN[model.designGroup?.id ?? model.id] ?? 'sin-clasificar';
}
export function catalogFamilyOptions(models: readonly CatalogModel[]): { value: CatalogFamily; label: string }[] {
  return [...new Set(models.map(familyOf))].filter(family => family !== 'sin-clasificar')
    .map(value => ({ value, label: FAMILY_LABEL[value] })).sort((a, b) => a.label.localeCompare(b.label, 'es'));
}
/** Unisex is not an age group. Babies require an explicitly supported recipe. */
export function modelSupportsRecipient(model: CatalogModel, recipient: Recipient): boolean {
  return model.recipients.includes(recipient) || (recipient === 'mujer' || recipient === 'hombre') && model.recipients.includes('unisex');
}

const FAMILY_TYPE: Partial<Record<CatalogFamily, GarmentType>> = {
  tote: 'bolsos', 'bolsa-jareta': 'bolsos', estuche: 'bolsos', bandolera: 'bolsos',
  peto: 'monos', mono: 'monos', jogger: 'inferiores', babero: 'accesorios', gorro: 'accesorios',
  cubrepanal: 'bebe', patucos: 'bebe', 'saco-dormir': 'bebe', toalla: 'bebe', conjunto: 'bebe'
};
/** Individual inconsistencies found while reviewing all legacy records. */
const REVIEW_FIXES: Record<string, Partial<CatalogModel>> = {
  'blusa-v': { techniques: ['costura-recta', 'dobladillo'], materials: ['Tela para vistas de escote', 'Hilo'] },
  sudadera: { techniques: ['tejido-punto', 'puno'] },
  hoodie: { techniques: ['tejido-punto', 'puno', 'bolsillos'] },
  'chaqueta-varsity': { fabrics: ['plano', 'punto'], stretch: 'baja', techniques: ['forro', 'bolsillos', 'puno', 'botones'] },
  'poncho-capucha-inspiracion': { fabrics: ['plano', 'punto'], stretch: 'baja' },
  'mitones-polar': { fabrics: ['punto'], stretch: 'baja', recommendedFabrics: ['Polar con elasticidad transversal moderada'], techniques: ['tejido-punto'] },
  'cesta-textil': { name: 'Bolsa tote compacta para el escritorio' }
};

/** Techniques describe what this base actually constructs. Every base can be
 * decorated later, so optional embroidery is not a construction requirement.
 * These tags were checked against the generator's pieces and sewing steps. */
function constructionFacets(model: CatalogModel): Pick<CatalogModel, 'difficulty' | 'techniques'> {
  const p = model.params ?? {};
  let difficulty: CatalogModel['difficulty'] = 1;
  let techniques: Technique[];
  switch (model.generatorId) {
    case 'pantalon-cintura-elastica':
      difficulty = p.estilo === 'jogger' ? 2 : 1;
      techniques = p.estilo === 'jogger' ? ['costura-recta', 'jareta', 'puno', 'tejido-punto'] : ['costura-recta', 'jareta', 'dobladillo']; break;
    case 'falda-fruncida-elastica': techniques = ['costura-recta', 'jareta', 'frunces', 'dobladillo']; break;
    case 'chaqueta-hombro-caido':
    case 'top-hombro-caido':
      difficulty = 2; techniques = ['costura-recta', 'dobladillo', ...(model.panelPreset ? ['collage' as const] : [])]; break;
    case 'poncho-rectangular': techniques = ['costura-recta', 'dobladillo']; break;
    case 'jumper-peto-falda': difficulty = 2; techniques = ['costura-recta', 'jareta', 'frunces', 'dobladillo']; break;
    case 'sudadera-capucha-holgada': difficulty = 2; techniques = ['costura-recta', 'tejido-punto', 'dobladillo']; break;
    case 'bolsa-tote':
      difficulty = p.forro === 'no' ? 1 : 2;
      techniques = ['costura-recta', p.forro === 'no' ? 'dobladillo' : 'forro']; break;
    case 'bolsa-jareta': techniques = ['costura-recta', 'jareta']; break;
    case 'estuche-plano': difficulty = 2; techniques = ['costura-recta', 'forro', 'cierre']; break;
    case 'funda-solapa':
    case 'funda-bebida':
    case 'antifaz-forrado': techniques = ['costura-recta', 'forro']; break;
    case 'cojin-sobre': techniques = ['costura-recta', 'dobladillo']; break;
    case 'dona-cabello': techniques = ['costura-recta', 'frunces']; break;
    case 'delantal-peto': techniques = ['costura-recta', 'dobladillo', 'bolsillos']; break;
    case 'banderin-jareta': techniques = ['costura-recta', 'jareta']; break;
    case 'banda-lazo':
    case 'bandana-reversible':
    case 'textil-doble-cara':
    case 'babero': techniques = ['costura-recta']; break;
    case 'gorro': techniques = ['tejido-punto']; break;
    case 'capa-semicircular':
    case 'corona-textil': difficulty = 2; techniques = ['costura-recta', 'forro']; break;
    case 'sombrero-mago': difficulty = 3; techniques = ['costura-recta', 'forro']; break;
    case 'orejas-diadema': techniques = ['costura-recta']; break;
    case 'vestido-trapecio-infantil': difficulty = 2; techniques = ['costura-recta', 'dobladillo', 'botones']; break;
    case 'vestido-tirantes-fruncido': difficulty = 2; techniques = ['costura-recta', 'forro', 'frunces', 'botones', 'dobladillo']; break;
    case 'falda-tul-elastica': techniques = ['costura-recta', 'frunces', 'jareta']; break;
    case 'falda-olanes-escalonada': difficulty = 2; techniques = ['costura-recta', 'frunces', 'jareta', 'dobladillo']; break;
    case 'falda-circular-elastica': difficulty = 2; techniques = ['costura-recta', 'jareta', 'dobladillo']; break;
    case 'cubrepanal-bebe': difficulty = 2; techniques = ['costura-recta', 'jareta', ...(p.olanes === 'si' ? ['frunces' as const] : [])]; break;
    case 'bonete-bebe': difficulty = 2; techniques = ['costura-recta', 'forro']; break;
    case 'patucos-bebe': difficulty = 2; techniques = ['costura-recta', 'forro', 'jareta']; break;
    case 'saco-dormir-bebe': difficulty = 3; techniques = ['costura-recta', 'forro', 'cierre']; break;
    case 'toalla-capucha': techniques = ['costura-recta']; break;
    case 'babero-bandana': techniques = ['costura-recta', 'forro']; break;
    case 'pantalon-mezclilla':
      if (p.cintura === 'elastica') techniques = ['costura-recta', 'jareta', 'dobladillo', ...(p.bolsillos !== 'ninguno' ? ['bolsillos' as const] : [])];
      else { difficulty = 3; techniques = ['costura-recta', 'cierre', 'botones', 'bolsillos', 'dobladillo']; }
      break;
    case 'oversize-hombro-caido':
      if (p.prenda === 'bomber') { difficulty = 3; techniques = ['costura-recta', 'cierre', 'forro', 'puno', 'bolsillos']; }
      else if (p.prenda === 'sobrecamisa') { difficulty = 3; techniques = ['costura-recta', 'botones', 'dobladillo', ...(p.bolsillos !== 'ninguno' ? ['bolsillos' as const] : [])]; }
      else techniques = ['tejido-punto', 'dobladillo'];
      break;
    case 'peto-bebe': difficulty = 2; techniques = ['costura-recta', 'botones', 'dobladillo']; break;
    case 'gorro-orejas': techniques = ['tejido-punto']; break;
    case 'sombrero-pescador': difficulty = 2; techniques = ['costura-recta', 'forro']; break;
    case 'conjunto-bebe': difficulty = 2; techniques = ['costura-recta', 'botones']; break;
    default: return { difficulty: model.difficulty, techniques: model.techniques };
  }
  return { difficulty, techniques };
}

/** Correct inconsistent browsing labels without changing geometry, IDs or ages. */
export function withCatalogTaxonomy(model: CatalogModel): CatalogModel {
  const reviewed = { ...model, ...REVIEW_FIXES[model.id] };
  const family = familyOf(reviewed);
  const searchTerms = reviewed.generatorId === 'funda-solapa' && reviewed.designGroup?.id !== 'tipo-funda-libro'
    ? reviewed.searchTerms?.filter(term => term !== 'libro' && term !== 'lectura') : reviewed.searchTerms;
  return { ...reviewed, ...constructionFacets(reviewed), searchTerms, family, type: FAMILY_TYPE[family] ?? reviewed.type };
}
