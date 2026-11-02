import type { CatalogModel, GarmentType, Recipient, Technique } from './catalog';
import { COSTUME_EXPANSION_FAMILY_LABELS, COSTUME_EXPANSION_FAMILIES } from './costumeExpansion';
import { STYLE_IDENTITY_FAMILIES } from './catalogStyleIdentity';
import { STREET_STYLE_FAMILIES } from './streetStyleCatalog';
import { BABY_STYLE_FAMILIES } from './babyStyleCatalog';
import { DRESS_STYLE_FAMILIES } from './dressStyleCatalog';

/** A family identifies the item itself. Collections, fabric recommendations and
 * optional decorations never assign a family. Every current design is listed. */
export const FAMILY_LABEL = {
  ...COSTUME_EXPANSION_FAMILY_LABELS,
  hoodie: 'Hoodies', sudadera: 'Sudaderas sin capucha', chaqueta: 'Chaquetas',
  chaleco: 'Chalecos', cardigan: 'Cárdigans', abrigo: 'Abrigos y parkas',
  poncho: 'Ponchos', ruana: 'Ruanas', capa: 'Capas',
  camiseta: 'Camisetas', camisa: 'Camisas', top: 'Blusas, tops y túnicas', sueter: 'Suéteres',
  pantalon: 'Pantalones', jogger: 'Joggers', lenceria: 'Lencería', short: 'Shorts', falda: 'Faldas',
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
  hoodie: ['hoodie', 'tipo-hoodie', 'sudadera-canguro-infantil', 'buzo-murcielago'],
  sudadera: ['sudadera', 'tipo-sudadera', 'sudadera-media-cremallera'],
  chaqueta: ['chaqueta-cierre', 'tipo-bomber', 'cazadora-mezclilla', 'cazadora-denim-corta', 'tipo-sobrecamisa', 'chaqueta-trabajo', 'chaqueta-acolchada', 'chaqueta-biker', 'chaqueta-safari', 'chaqueta-varsity', 'anorak-canguro', 'bolero-corto', 'tipo-chaqueta-hombro-caido', 'chaqueta-collage-bandas', 'chaqueta-patchwork-franjas', 'chaqueta-patchwork-cuadros', 'chaqueta-canesu-diagonal', 'chaqueta-collage-irregular', 'chaqueta-polar-infantil', 'chaqueta-acolchada-infantil', 'chaqueta-capucha-infantil', 'chaqueta-ranglan'],
  chaleco: ['chaleco', 'chaleco-acolchado', 'chaleco-punto-v', 'tipo-chaleco-abierto', 'tipo-chaleco-infantil'],
  cardigan: ['tipo-cardigan-abierto'],
  abrigo: ['abrigo', 'gabardina-cruzada', 'trench-corto', 'abrigo-acolchado-largo', 'parka-capucha'],
  poncho: ['poncho-capucha-inspiracion', 'tipo-poncho'], ruana: ['tipo-ruana'],
  capa: ['capa-circular', 'capa-capucha', 'tipo-disfraz-capa'],
  camiseta: ['camiseta-basica', 'camiseta-larga', 'tipo-camiseta-oversize'], camisa: ['camisa-clasica', 'camisa-boxy'],
  top: ['blusa-v', 'tunica-suelta', 'tipo-top-cuadrado', 'tipo-top-cuadrado-sin-mangas', 'tipo-blusa-campesina', 'blusa-botones-infantil', 'tipo-blusa-trapecio'],
  sueter: ['sueter-oversize', 'sueter-tortuga', 'sueter-corto'],
  pantalon: ['tipo-pantalon-recto', 'tipo-pantalon-amplio', 'pantalon-baggy', 'pantalon-barrel', 'pantalon-cargo', 'pantalon-palazzo', 'pantalon-pinzas', 'pantalon-pitillo', 'pantalon-acampanado', 'jeans-recto', 'jeans-mom', 'jeans-ancho', 'pantalon-bombacho-infantil', 'pantalon-capri-infantil', 'pantalon-volante', 'palazzo-botones-laterales'],
  jogger: ['tipo-jogger'], lenceria: ['culotte-encaje'], short: ['short-elastico'], pijama: ['pantalon-pijama', 'pijama-camisa'],
  falda: ['tipo-falda-fruncida', 'falda-recta', 'falda-a', 'tipo-falda-circular', 'falda-tableada', 'tipo-falda-tul', 'tipo-falda-olanes'],
  vestido: ['vestido-camisero', 'tipo-vestido-trapecio', 'tipo-vestido-tirantes', 'vestido-jareta-infantil'], peto: ['overol', 'tipo-jumper-falda', 'peto-bermuda', 'peto-palazzo', 'tipo-peto-bebe', 'peto-infantil'],
  mono: ['mono-camisero', 'mono-mecanico', 'mono-palazzo', 'mono-cruzado', 'playsuit-camisero', 'mono-baggy', 'pelele-volantes', 'tipo-mono-tirantes'],
  body: ['body-bebe'], mameluco: ['mameluco'], babero: ['babero', 'tipo-babero-bandana'], gorro: ['gorro', 'tipo-bonete', 'tipo-gorro-orejas', 'tipo-gorro-duende', 'tipo-gorro-orejeras', 'tipo-bonete-volante'],
  cubrepanal: ['tipo-cubrepanal'], patucos: ['tipo-patucos'], 'saco-dormir': ['tipo-saco-dormir'], toalla: ['tipo-toalla-capucha'], conjunto: ['tipo-conjunto-bebe'],
  tote: ['tipo-bolsa-tote'], 'bolsa-jareta': ['tipo-bolsa-jareta'], estuche: ['neceser', 'tipo-estuche-cierre'], bandolera: ['bandolera'],
  'funda-tecnologia': ['tipo-funda-portatil', 'tipo-funda-tableta', 'tipo-funda-telefono', 'tipo-funda-lector', 'tipo-funda-consola', 'tipo-funda-cables'],
  'funda-lectura': ['tipo-funda-libro', 'tipo-funda-cuaderno', 'tipo-funda-tarjetas', 'tipo-funda-pasaporte'],
  'funda-costura': ['tipo-funda-patrones', 'tipo-funda-bastidor', 'tipo-funda-muestrario'],
  'funda-lentes': ['tipo-funda-lentes'], cojin: ['tipo-cojin'], 'funda-bebida': ['tipo-funda-bebida'], 'funda-silla': ['funda-silla'],
  cabello: ['tipo-dona-cabello', 'tipo-banda-cabello', 'diadema-lazo'], bandana: ['tipo-bandana'],
  delantal: ['tipo-delantal', 'tipo-delantal-pichi'], antifaz: ['tipo-antifaz'], banderin: ['tipo-banderin'],
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
export const FAMILY_BY_DESIGN = {
  ...Object.fromEntries(Object.entries(DESIGNS).flatMap(([family, ids]) => ids.map(id => [id, family]))),
  ...COSTUME_EXPANSION_FAMILIES, ...STYLE_IDENTITY_FAMILIES,
  ...STREET_STYLE_FAMILIES, ...BABY_STYLE_FAMILIES, ...DRESS_STYLE_FAMILIES
} as Record<string, CatalogFamily>;

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
  peto: 'monos', mono: 'monos', jogger: 'inferiores', lenceria: 'inferiores', babero: 'accesorios', gorro: 'accesorios',
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
      difficulty = p.cintura === 'pretina' ? 3 : p.estilo === 'jogger' || p.volante === 'si' ? 2 : 1;
      techniques = p.cintura === 'pretina' ? ['costura-recta', 'pinzas', 'botones', 'dobladillo'] : p.estilo === 'jogger' ? ['costura-recta', 'jareta', 'puno', 'tejido-punto'] : p.estilo === 'bombacho' ? ['costura-recta', 'jareta'] : p.volante === 'si' ? ['costura-recta', 'jareta', 'frunces'] : ['costura-recta', 'jareta', 'dobladillo'];
      if (p.bolsillos === 'costado') techniques.push('bolsillos');
      break;
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
      else { difficulty = 3; techniques = ['costura-recta', 'cierre', 'botones', 'bolsillos', 'dobladillo', ...(p.pinzas === 'una' || p.pinzas === 'dos' ? ['pinzas' as const] : [])]; }
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
    case 'chaleco-infantil': difficulty = p.acabado === 'ribete' ? 1 : 2; techniques = ['costura-recta', p.acabado === 'ribete' ? 'dobladillo' : 'forro', ...(p.cierre === 'broches' ? ['botones' as const] : [])]; break;
    case 'chaqueta-cierre-infantil': difficulty = 2; techniques = ['costura-recta', 'cierre', 'puno']; break;
    case 'chaqueta-acolchada-infantil': difficulty = 2; techniques = ['costura-recta', 'botones', ...(p.bolsillos !== 'no' ? ['bolsillos' as const] : [])]; break;
    case 'chaqueta-capucha-infantil': difficulty = 3; techniques = ['costura-recta', 'forro', 'botones', ...(p.bolsillos !== 'no' ? ['bolsillos' as const] : [])]; break;
    case 'sudadera-canguro-infantil': difficulty = 2; techniques = ['tejido-punto', 'puno', ...(p.bolsillo !== 'no' ? ['bolsillos' as const] : [])]; break;
    case 'blusa-campesina-infantil': difficulty = 2; techniques = ['costura-recta', 'jareta', 'frunces']; break;
    case 'blusa-botones-infantil': difficulty = 2; techniques = ['costura-recta', 'botones', 'dobladillo']; break;
    case 'vestido-jareta-infantil': techniques = ['costura-recta', 'jareta', 'dobladillo']; break;
    case 'pelele-volantes': difficulty = 3; techniques = ['costura-recta', 'frunces', 'jareta', 'botones']; break;
    case 'diadema-lazo': techniques = ['costura-recta', 'tejido-punto']; break;
    case 'gorro-duende': techniques = p.forro === 'no' ? ['costura-recta', 'bordado'] : ['costura-recta', 'forro']; break;
    case 'gorro-orejeras': difficulty = 2; techniques = ['costura-recta', 'forro']; break;
    case 'bonete-volante': difficulty = 2; techniques = ['costura-recta', 'forro', ...(p.volante !== 'ninguno' ? ['frunces' as const] : [])]; break;
    case 'delantal-pichi-infantil': difficulty = p.volantes === 'no' ? 1 : 2; techniques = ['costura-recta', ...(p.volantes !== 'no' ? ['frunces' as const] : []), ...(p.bolsillo !== 'no' ? ['bolsillos' as const] : [])]; break;
    case 'mono-tirantes-infantil': difficulty = 2; techniques = ['costura-recta', 'botones', ...(p.bolsillos !== 'no' ? ['bolsillos' as const] : []), ...(p.bajo === 'volante' ? ['frunces' as const] : [])]; break;
    case 'blusa-trapecio-infantil': difficulty = 2; techniques = ['costura-recta', 'botones', p.volanteBajo === 'si' ? 'frunces' : 'dobladillo']; break;
    case 'sudadera-media-cremallera': difficulty = 2; techniques = ['tejido-punto', 'cierre', 'jareta']; break;
    case 'chaqueta-ranglan': difficulty = 3; techniques = ['costura-recta', 'cierre', 'puno', ...(p.bolsillos !== 'no' ? ['bolsillos' as const] : [])]; break;
    case 'buzo-murcielago': difficulty = 2; techniques = ['tejido-punto', 'puno', ...(p.bolsillos !== 'no' ? ['bolsillos' as const] : [])]; break;
    case 'cazadora-mezclilla': difficulty = 3; techniques = ['costura-recta', 'botones', ...(p.bolsillos !== 'ninguno' ? ['bolsillos' as const] : [])]; break;
    case 'chaqueta-campo': difficulty = 3; techniques = ['costura-recta', p.cierre === 'botones' ? 'botones' : 'cierre', 'dobladillo', ...(p.bolsillos !== 'ninguno' ? ['bolsillos' as const] : [])]; break;
    case 'culotte-encaje': difficulty = 2; techniques = ['tejido-punto', ...(p.acabado === 'elastico' ? ['dobladillo' as const] : [])]; break;
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
