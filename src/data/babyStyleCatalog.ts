import type { CatalogModel, Technique } from './catalog';
import type { CatalogFamily } from './catalogTaxonomy';
import { BABY_STYLES } from '../lib/pattern/generators/babyStyles';

const DETAILS: Record<string, { family: CatalogFamily; description: string; terms: string[]; techniques?: Technique[] }> = {
  'bebe-body-sin-mangas': { family: 'body', description: 'Pañalero fresco de punto con sisas ribeteadas, apertura completa de broches delante y entrepierna. El patrón incluye ribetes calculados para cada abertura.', terms: ['body', 'pañalero', 'sin mangas', 'verano', 'sisas'] },
  'bebe-body-mariposa': { family: 'body', description: 'Pañalero sin mangas con volantes fruncidos sobre los hombros, ribetes y broches. Los volantes se cortan aparte y dejan libre la parte inferior de la sisa.', terms: ['body', 'pañalero', 'mariposa', 'volantes', 'olanes'], techniques: ['frunces'] },
  'bebe-body-falda': { family: 'body', description: 'Pañalero con faldita fruncida superpuesta. La entrepierna sigue abriendo para cambiar el pañal; la falda tiene piezas y guía de colocación propias.', terms: ['body', 'pañalero', 'faldita', 'sobrefalda', 'vestido body'], techniques: ['frunces'] },
  'bebe-body-canesu': { family: 'body', description: 'Pañalero dividido por una costura horizontal en pecho y espalda. Canesú y cuerpo inferior son piezas independientes para combinar telas, con uniones y piquetes.', terms: ['body', 'pañalero', 'canesú', 'paneles', 'color block'] },
  'bebe-cardigan-cruzado': { family: 'cardigan', description: 'Chaquetita de frente cruzado diagonal con mangas montadas y broches laterales. Apertura completa, sin cintas ni lazos para atar.', terms: ['cardigan', 'chaquetita', 'cruzado', 'kimono', 'broches'] },
  'bebe-cardigan-pico': { family: 'cardigan', description: 'Cárdigan de punto con cuello en V, manga larga y broches al centro. Incluye ribete continuo calculado y refuerzos para los cierres.', terms: ['cardigan', 'cuello v', 'pico', 'punto', 'manga larga'] },
  'bebe-blusa-peplum': { family: 'top', description: 'Blusita sin mangas con cuerpo corto y peplum fruncido unido por una costura. Abre por delante con broches; el largo elegido incluye el peplum.', terms: ['blusa', 'peplum', 'volante', 'fruncido', 'sin mangas'], techniques: ['frunces'] },
  'bebe-camisa-globo': { family: 'camisa', description: 'Camisita con abertura frontal y manga corta abullonada: la copa se frunce a la sisa y el puño se recoge con elástico suave.', terms: ['camisa', 'camisita', 'manga globo', 'abullonada', 'broches'], techniques: ['frunces', 'jareta'] },
  'bebe-peto-canesu': { family: 'peto', description: 'Pelele de tirantes dividido en canesú y pantaloncito. Piezas superiores e inferiores independientes para combinar tejidos; broches en tirantes y entrepierna.', terms: ['peto', 'pelele', 'canesú', 'paneles', 'overol corto'] },
  'bebe-peto-falda': { family: 'peto', description: 'Pelele corto con una sobrefalda fruncida: conserva pantaloncito interior y abertura para pañal. La falda y los tirantes se cortan por separado.', terms: ['peto', 'pelele', 'sobrefalda', 'faldita', 'falda pantalón'], techniques: ['frunces'] },
  'bebe-peto-cargo': { family: 'peto', description: 'Pelele de tirantes con bolsillos de fuelle y solapas en el frente. Los bolsillos tienen patrón propio, líneas de doblez y guía de colocación.', terms: ['peto', 'pelele', 'cargo', 'fuelle', 'solapas', 'utilitario'], techniques: ['bolsillos'] },
  'bebe-pantalon-rodilleras': { family: 'pantalon', description: 'Pantaloncito recto con rodilleras ovaladas de contraste. Incluye plantillas independientes y cruces de ubicación que puedes verificar sobre la rodilla.', terms: ['pantalón', 'rodilleras', 'gatear', 'refuerzo'], techniques: ['jareta'] },
  'bebe-pantalon-panel-lateral': { family: 'pantalon', description: 'Pantaloncito recto dividido en paneles longitudinales laterales. Cada panel se cose por sus piquetes, con márgenes calculados una sola vez.', terms: ['pantalón', 'panel lateral', 'franjas', 'costados', 'color block'], techniques: ['jareta'] },
  'bebe-pantalon-punos-extensibles': { family: 'jogger', description: 'Pantaloncito con puños de rib largos que se doblan hacia fuera. Al extenderlos gana largo para acompañar el crecimiento; cintura elástica sin cordones.', terms: ['pantalón', 'jogger', 'puños', 'extensible', 'crecimiento'], techniques: ['jareta'] },
  'bebe-babero-mangas': { family: 'babero', description: 'Babero con pecho completo, mangas largas de puño elástico y apertura de broches en espalda. Para comer y pintar bajo supervisión, con tejido laminado flexible.', terms: ['babero', 'mangas', 'comer', 'smock', 'impermeable'], techniques: ['jareta'] },
  'bebe-poncho-bano': { family: 'poncho', description: 'Poncho de rizo con lados abiertos y tapetas delanteras de broches. Se coloca abierto, sin pasar la cabeza por un escote ajustado; sin capucha ni cintas.', terms: ['poncho', 'baño', 'rizo', 'toalla', 'broches'] },
  'bebe-bolero-redondo': { family: 'chaqueta', description: 'Chaquetita corta de mangas cortas y delanteros redondeados. Ribete continuo en escote, apertura y curvas; un broche mantiene el frente cerrado arriba.', terms: ['bolero', 'chaqueta', 'redondeado', 'corto', 'manga corta'] },
  'bebe-bonete-visera': { family: 'gorro', description: 'Bonete forrado con una visera de doble tela suave entre banda y forro. Incluye piquetes que centran la visera y lengüeta con broche, sin cintas.', terms: ['bonete', 'visera', 'capota', 'gorro', 'sol'], techniques: ['forro'] },
};

export const BABY_STYLE_FAMILIES: Record<string, CatalogFamily> = Object.fromEntries(BABY_STYLES.map(([id]) => [id, DETAILS[id].family]));
export const BABY_STYLE_CATALOG: CatalogModel[] = BABY_STYLES.map(([id, name, kind]) => {
  const detail = DETAILS[id], knit = kind === 'body' || id === 'bebe-cardigan-pico' || id === 'bebe-pantalon-punos-extensibles';
  return {
    id, name, generatorId: id, designGroup: { id, name, preferred: true }, status: 'experimental', collection: 'Bebé', recipients: ['bebe', 'toddler'],
    type: detail.family === 'pantalon' || detail.family === 'jogger' ? 'inferiores' : detail.family === 'babero' || detail.family === 'gorro' ? 'accesorios' : detail.family === 'peto' ? 'monos' : ['cardigan', 'chaqueta', 'poncho'].includes(detail.family) ? 'abrigo' : kind === 'body' ? 'bebe' : 'superiores',
    sub: detail.family === 'body' ? 'Pañaleros' : detail.family === 'peto' ? 'Petos y peleles' : detail.family === 'pantalon' || detail.family === 'jogger' ? 'Pantalones de bebé' : name,
    difficulty: ['bebe-peto-cargo', 'bebe-body-canesu', 'bebe-pantalon-panel-lateral'].includes(id) ? 3 : 2,
    fabrics: [knit ? 'punto' : 'plano'], stretch: knit ? 'media' : 'ninguna', fits: ['regular', 'holgado'],
    techniques: ['costura-recta', 'dobladillo', ...(detail.techniques ?? []), ...(!['pantalon', 'bonete'].includes(kind) ? ['botones' as const] : [])],
    flat: { family: kind === 'pantalon' ? 'pantalon' : kind === 'bonete' || detail.family === 'babero' ? 'accesorio' : 'bebe', babyStyle: id },
    description: detail.description, variants: [], searchTerms: [...detail.terms, 'bebé', 'infantil'],
    recommendedFabrics: knit ? ['Interlock de algodón', 'Jersey con buena recuperación', 'Rib suave para ribetes y puños'] : id === 'bebe-babero-mangas' ? ['Algodón laminado flexible apto para baberos'] : id === 'bebe-poncho-bano' ? ['Rizo de algodón suave'] : ['Popelina suave', 'Gasa doble de algodón', 'Lino ligero'],
    materials: ['Hilo suave', ...(knit ? ['Aguja para punto'] : []), ...(!['pantalon'].includes(kind) ? ['Broches infantiles y refuerzo suave'] : ['Elástico suave']), ...(id === 'bebe-pantalon-punos-extensibles' ? ['Rib con 30 % de elasticidad'] : [])],
  };
});
