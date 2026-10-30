import type { CatalogModel, GarmentType, Recipient, Technique } from '../../data/catalog';
import { RECIPIENT_LABEL, TECHNIQUE_LABEL, TYPE_LABEL } from '../../data/catalog';
import { FAMILY_LABEL, familyOf, modelSupportsRecipient, type CatalogFamily } from '../../data/catalogTaxonomy';

export type Availability = 'todos' | 'patron' | 'estudio' | 'inspiracion';
export type Filters = {
  q: string;
  recipient: Recipient | 'todos';
  type: GarmentType | 'todos';
  family?: CatalogFamily | 'todas';
  onlyAvailable: boolean;
  availability?: Availability;
  subcategory?: string;
  difficulty: number;
  fabric: 'todos' | 'plano' | 'punto';
  stretch: 'todos' | 'ninguna' | 'baja' | 'media' | 'alta';
  fit: 'todos' | 'ajustado' | 'regular' | 'holgado' | 'oversize';
  technique: Technique | 'todas';
  size: 'todas' | 'infantil' | 'adulto';
};
export const INITIAL_FILTERS: Filters = { q: '', recipient: 'todos', type: 'todos', family: 'todas', onlyAvailable: false, availability: 'todos', subcategory: 'todas', difficulty: 0, fabric: 'todos', stretch: 'todos', fit: 'todos', technique: 'todas', size: 'todas' };
export const normalizeSearch = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();

/** Search item identities first. Broad category labels and prose mentioning
 * optional/future constructions must not make a different item match. */
const identityAliases: Partial<Record<CatalogFamily, string[]>> = {
  hoodie: ['hoodie', 'hoodies', 'hoddie', 'hoddies', 'hoody', 'hoodys'],
  chaqueta: ['chaqueta', 'chaquetas', 'chamarra', 'chamarras', 'jacket', 'jackets', 'cazadora', 'cazadoras'],
  chaleco: ['chaleco', 'chalecos', 'vest', 'vests'], cardigan: ['cardigan', 'cardigans'],
  abrigo: ['abrigo', 'abrigos', 'parka', 'parkas', 'trench'], poncho: ['poncho', 'ponchos'], ruana: ['ruana', 'ruanas'],
  capa: ['capa', 'capas', 'cape', 'capes'], camiseta: ['camiseta', 'camisetas', 'tshirt', 'tshirts'],
  top: ['blusa', 'blusas', 'bluson', 'blusones', 'top', 'tops', 'tunica', 'tunicas'], sueter: ['sueter', 'sueteres', 'sweater', 'sweaters'],
  jogger: ['jogger', 'joggers'], short: ['short', 'shorts', 'bermuda', 'bermudas'],
  falda: ['falda', 'faldas', 'skirt', 'skirts'], vestido: ['vestido', 'vestidos', 'dress', 'dresses'],
  peto: ['peto', 'petos', 'jumper', 'jumpers', 'jumpper', 'jumppers', 'overol', 'overoles', 'pinafore'],
  mono: ['mono', 'monos', 'enterizo', 'enterizos', 'jumpsuit', 'jumpsuits', 'playsuit'],
  pijama: ['pijama', 'pijamas', 'pajama', 'pajamas'], body: ['body', 'bodies', 'bodys', 'bodysuit', 'bodysuits', 'panalero', 'panaleros', 'onesie', 'onesies'],
  mameluco: ['mameluco', 'mamelucos', 'romper'], babero: ['babero', 'baberos', 'bib', 'bibs'],
  gorro: ['gorro', 'gorros', 'beanie', 'beanies'], tote: ['tote', 'totes'], bandolera: ['bandolera', 'bandoleras'],
  cojin: ['cojin', 'cojines', 'almohada', 'almohadas', 'cushion', 'pillow'],
  bandana: ['bandana', 'bandanas', 'panuelo', 'panuelos'], delantal: ['delantal', 'delantales', 'apron', 'aprons'],
  antifaz: ['antifaz', 'antifaces'], banderin: ['banderin', 'banderines'],
  manteleria: ['mantel', 'manteles', 'manteleria', 'servilleta', 'servilletas'],
  posavasos: ['posavaso', 'posavasos', 'coaster', 'coasters'], tapete: ['tapete', 'tapetes', 'protector', 'protectores'],
  marcapaginas: ['marcapaginas', 'bookmark'], decoracion: ['panel', 'paneles'],
  organizador: ['organizador', 'organizadores', 'portacubiertos'], sombrero: ['sombrero', 'sombreros', 'hat', 'hats'],
  corona: ['corona', 'coronas', 'crown'], orejas: ['oreja', 'orejas'],
  corbata: ['corbata', 'corbatas', 'pajarita', 'pajaritas'], mitones: ['miton', 'mitones'],
  pantuflas: ['pantufla', 'pantuflas'], cinturon: ['cinturon', 'cinturones'],
  pulsera: ['pulsera', 'pulseras'], cesto: ['cesto', 'cestos', 'cesta', 'cestas'],
  aplicacion: ['parche', 'parches'],
  tabardo: ['tabardo', 'tabardos', 'tabard', 'tabards'], alas: ['ala', 'alas', 'wing', 'wings'],
  cola: ['cola', 'colas', 'tail', 'tails'], 'diadema-disfraz': ['diadema', 'diademas', 'astas', 'cuerno', 'antenas'],
  'cuello-disfraz': ['cuello', 'cuellos', 'gorguera'], 'puno-disfraz': ['puno', 'punos'],
  polaina: ['polaina', 'polainas', 'gaiters'], 'peto-disfraz': ['pechera', 'pecheras'],
  'conjunto-disfraz': ['kit', 'kits']
};
const identityFamily = Object.fromEntries(Object.entries(identityAliases).flatMap(([family, aliases]) => aliases.map(alias => [alias, family]))) as Record<string, CatalogFamily>;
const synonyms: Record<string, string[]> = {
  mezclilla: ['mezclilla', 'denim'], denim: ['mezclilla', 'denim'],
  holgado: ['holgado', 'holgada', 'oversize', 'amplio', 'amplia'], holgados: ['holgado', 'holgada', 'oversize', 'amplio', 'amplia'],
  holgada: ['holgado', 'holgada', 'oversize', 'amplio', 'amplia'], holgadas: ['holgado', 'holgada', 'oversize', 'amplio', 'amplia'],
  laptop: ['laptop', 'portatil'], tablet: ['tablet', 'tableta'], telefono: ['telefono', 'celular'], celular: ['telefono', 'celular'],
  cremallera: ['cremallera', 'cierre'], zipper: ['cremallera', 'cierre'],
};
const ignoredWords = new Set(['de', 'del', 'la', 'las', 'el', 'los', 'un', 'una', 'unos', 'unas', 'para', 'con', 'sin', 'y', 'o']);
const hasHood = (m: CatalogModel) => m.generatorId === 'sudadera-capucha-holgada' ? m.params?.capucha === 'si' : m.flat.top?.neck === 'capucha';
const is = (m: CatalogModel, ...families: CatalogFamily[]) => families.includes(familyOf(m));
type ItemIdentity = (model: CatalogModel) => boolean;
/** Some filter families contain several different objects. A specific noun must
 * match its own recipe, not inherit every sibling in that filter family. Names
 * here are the recipe's name, never the combined card title or search prose. */
const named = (model: CatalogModel, expression: RegExp) => expression.test(normalizeSearch(model.name));
const subtypeAliases: [string[], ItemIdentity][] = [
  [['oreja', 'orejas'], m => is(m, 'orejas', 'diadema-disfraz') && named(m, /\borejas?\b/)],
  [['servilleta', 'servilletas', 'napkin', 'napkins'], m => m.designGroup?.id === 'tipo-textil-servilleta'],
  [['mantel', 'manteles', 'individual', 'individuales', 'placemat', 'placemats'], m => m.designGroup?.id === 'tipo-textil-individual'],
  [['banda', 'bandas', 'headband', 'headbands'], m => m.designGroup?.id === 'tipo-banda-cabello'],
  [['monedero', 'monederos'], m => is(m, 'estuche') && named(m, /\bmonedero\b/)],
  [['neceser', 'neceseres'], m => is(m, 'estuche') && named(m, /\b(neceser|maquillaje|cosmeticos)\b/)],
  [['tunica', 'tunicas', 'tunic', 'tunics'], m => is(m, 'top') && named(m, /\btunica\b/)],
  [['parka', 'parkas'], m => is(m, 'abrigo') && named(m, /\bparka\b/)],
  [['trench'], m => is(m, 'abrigo') && named(m, /\btrench\b/)],
  [['cazadora', 'cazadoras'], m => is(m, 'chaqueta') && named(m, /\bcazadora\b/)],
  [['corbata', 'corbatas'], m => is(m, 'corbata') && named(m, /\bcorbata\b/)],
  [['pajarita', 'pajaritas'], m => is(m, 'corbata') && named(m, /\bpajarita\b/)],
  [['playsuit', 'playsuits'], m => is(m, 'mono') && m.flat.pants?.length === 'short'],
  [['overol', 'overoles'], m => is(m, 'peto') && !!m.flat.pants?.bib],
  [['jumper', 'jumpers', 'jumpper', 'jumppers', 'pinafore', 'pinafores'], m => is(m, 'peto') && !!m.flat.pinafore],
  [['bermuda', 'bermudas'], m => (is(m, 'short') || is(m, 'peto')) && m.flat.pants?.length === 'bermuda'],
  [['protector', 'protectores'], m => is(m, 'tapete') && named(m, /\bprotector\b/)],
  [['tapete', 'tapetes'], m => is(m, 'tapete') && named(m, /\btapete\b/)],
  [['portacubiertos'], m => m.id === 'portacubiertos-enrollable'],
  [['almohada', 'almohadas', 'pillow', 'pillows'], m => is(m, 'cojin') && named(m, /\balmohada\b/)]
];
const subtypeIdentity = Object.fromEntries(subtypeAliases.flatMap(([aliases, match]) => aliases.map(alias => [alias, match]))) as Record<string, ItemIdentity>;
function searchMatches(m: CatalogModel, raw: string): boolean {
  const query = normalizeSearch(raw);
  if (query === normalizeSearch(m.name) || m.designGroup && query === normalizeSearch(m.designGroup.name)) return true;
  const tokens: string[] = query.match(/[a-z0-9]+(?:[.,][0-9]+)?/g) ?? [];
  const pinafore = tokens.some(word => ['jumper', 'jumpers', 'jumpper', 'jumppers', 'peto', 'petos'].includes(word)) && tokens.some(word => ['falda', 'faldas'].includes(word));
  const apronBib = tokens.some(word => ['delantal', 'delantales', 'apron'].includes(word)) && tokens.some(word => ['peto', 'petos'].includes(word));
  const shortPants = tokens.some(word => ['pantalon', 'pantalones', 'pants'].includes(word)) && tokens.some(word => ['corto', 'cortos', 'short', 'shorts'].includes(word));
  if (pinafore && !(is(m, 'peto') && m.flat.pinafore) || apronBib && !is(m, 'delantal') || shortPants && !is(m, 'short')) return false;
  const withoutHood = /\bsin\s+capucha\b/.test(query);
  const withHood = /\bcon\s+capucha\b/.test(query);
  if (withoutHood && (hasHood(m) || m.flat.family !== 'top') || withHood && !hasHood(m)) return false;
  // Only identity, actual dimensions, supported recipients and fabrics. Broad
  // collection labels and the explanatory prose are deliberately excluded.
  const hay = normalizeSearch(`${m.name} ${m.designGroup?.name ?? ''} ${m.variantLabel ?? ''} ${(m.searchTerms ?? []).join(' ')} ${m.recommendedFabrics.join(' ')} ${m.recipients.join(' ')} ${m.fits.join(' ')}`);
  const detailStart = tokens.indexOf('con');
  return tokens.every((word, index) => {
    if (ignoredWords.has(word)) return true;
    if (pinafore && ['falda', 'faldas'].includes(word) || apronBib && ['peto', 'petos'].includes(word) || shortPants && ['pantalon', 'pantalones', 'pants', 'corto', 'cortos'].includes(word)) return true;
    if (word === 'capucha') return withoutHood ? !hasHood(m) : hasHood(m);
    // In “delantal con peto” the bib is a detail of the apron, not another
    // garment category. It must still occur in the item's actual identity.
    if (detailStart >= 0 && index > detailStart && identityFamily[word]) return hay.includes(word);
    if (subtypeIdentity[word]) return subtypeIdentity[word](m);
    if (['bebe', 'bebes', 'baby', 'babies'].includes(word)) return modelSupportsRecipient(m, 'bebe');
    if (['mujer', 'mujeres', 'woman', 'women'].includes(word)) return modelSupportsRecipient(m, 'mujer');
    if (['hombre', 'hombres', 'man', 'men'].includes(word)) return modelSupportsRecipient(m, 'hombre');
    if (['infantil', 'nino', 'ninos', 'nina', 'ninas', 'kids'].includes(word)) return modelSupportsRecipient(m, 'infantil');
    if (['sudadera', 'sudaderas', 'sweatshirt', 'sweatshirts'].includes(word)) return is(m, 'sudadera', 'hoodie');
    if (['pantalon', 'pantalones', 'pants', 'trousers'].includes(word)) return is(m, 'pantalon', 'jogger') || is(m, 'pijama') && m.flat.family === 'pantalon';
    if (['camisa', 'camisas', 'shirt', 'shirts'].includes(word)) return is(m, 'camisa') || is(m, 'pijama') && m.flat.family === 'top';
    if (['bolsa', 'bolsas', 'bolso', 'bolsos', 'bag', 'bags'].includes(word)) return is(m, 'tote', 'bolsa-jareta', 'estuche', 'bandolera');
    if (['estuche', 'estuches', 'neceser', 'neceseres', 'monedero'].includes(word)) return is(m, 'estuche', 'funda-lentes');
    if (['funda', 'fundas', 'sleeve', 'sleeves'].includes(word)) return is(m, 'funda-tecnologia', 'funda-lectura', 'funda-costura', 'funda-lentes', 'cojin', 'funda-bebida', 'funda-silla');
    if (['cabello', 'banda', 'bandas'].includes(word)) return is(m, 'cabello');
    if (['dona', 'donas', 'scrunchie', 'scrunchies'].includes(word)) return m.generatorId === 'dona-cabello';
    if (['laptop', 'laptops'].includes(word)) return m.designGroup?.id === 'tipo-funda-portatil';
    if (['lazo', 'lazos'].includes(word)) return m.generatorId === 'banda-lazo' && is(m, 'cabello', 'lazo-regalo');
    if (['disfraz', 'disfraces', 'cosplay'].includes(word)) return m.collection === 'Disfraces';
    if (identityFamily[word]) return familyOf(m) === identityFamily[word];
    return (synonyms[word] ?? [word]).some(term => hay.includes(term));
  });
}

/** Validate persisted search state. Old/unknown hidden facets cannot silently
 * filter out the catalogue after a deployment or a malformed saved session. */
export function sanitizeFilters(raw: unknown): Filters {
  const source = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw as Record<string, unknown> : {};
  const result = { ...INITIAL_FILTERS };
  const options: Partial<Record<keyof Filters, readonly unknown[]>> = {
    recipient: ['todos', ...Object.keys(RECIPIENT_LABEL)], type: ['todos', ...Object.keys(TYPE_LABEL)],
    family: ['todas', ...Object.keys(FAMILY_LABEL).filter(family => family !== 'sin-clasificar')],
    availability: ['todos', 'patron', 'estudio', 'inspiracion'], difficulty: [0, 1, 2, 3],
    fabric: ['todos', 'plano', 'punto'], stretch: ['todos', 'ninguna', 'baja', 'media', 'alta'],
    fit: ['todos', 'ajustado', 'regular', 'holgado', 'oversize'], technique: ['todas', ...Object.keys(TECHNIQUE_LABEL)],
    size: ['todas', 'infantil', 'adulto'], onlyAvailable: [true, false]
  };
  for (const [key, allowed] of Object.entries(options)) {
    if (allowed.includes(source[key])) Object.assign(result, { [key]: source[key] });
  }
  if (typeof source.q === 'string') result.q = source.q;
  if (result.type === 'bebe') { result.type = 'todos'; result.recipient = 'bebe'; }
  // Legacy free-form subcategories are not active UI facets; discard hidden ones.
  result.subcategory = 'todas';
  return result;
}
export function modelHasPattern(m: CatalogModel): boolean { return !!m.generatorId && !m.studioOnly && m.status !== 'pendiente'; }
export function modelAvailability(m: CatalogModel): Availability { return modelHasPattern(m) ? 'patron' : m.studioOnly ? 'estudio' : 'inspiracion'; }
export function matches(m: CatalogModel, f: Filters): boolean {
  if (f.q.trim() && !searchMatches(m, f.q)) return false;
  if (f.recipient !== 'todos' && !modelSupportsRecipient(m, f.recipient)) return false;
  if (f.family && f.family !== 'todas' && familyOf(m) !== f.family) return false;
  if (f.type !== 'todos' && m.type !== f.type) return false;
  if (f.subcategory && f.subcategory !== 'todas' && m.sub !== f.subcategory) return false;
  if (f.onlyAvailable && m.status === 'pendiente') return false;
  if (f.availability && f.availability !== 'todos' && modelAvailability(m) !== f.availability) return false;
  if (f.difficulty && m.difficulty !== f.difficulty) return false;
  if (f.fabric !== 'todos' && !m.fabrics.includes(f.fabric)) return false;
  if (f.stretch !== 'todos' && m.stretch !== f.stretch) return false;
  if (f.fit !== 'todos' && !m.fits.includes(f.fit)) return false;
  if (f.technique !== 'todas' && !m.techniques.includes(f.technique)) return false;
  if (f.size === 'infantil' && !m.recipients.some(r=>['bebe','toddler','infantil'].includes(r))) return false;
  if (f.size === 'adulto' && !m.recipients.some(r=>['mujer','hombre','unisex'].includes(r))) return false;
  return true;
}
