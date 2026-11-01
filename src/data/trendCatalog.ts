import type { CatalogModel, Recipient } from './catalog';
import type { FlatSpec, LegStyle, PantsOpts, TopOpts } from './flats';

/* Tendencias: mezclilla con siluetas actuales, prendas oversize de hombro caído
 * y más bebé (peto, gorritos, sombrero, conjuntos). Las inspiraciones que ya
 * existían conservan su id y pasan a generar patrón; todo es experimental. */

const TREND = 'Tendencias', BABY = 'Bebé';
const everyone: Recipient[] = ['infantil', 'mujer', 'hombre', 'unisex'];
const pantsFlat = (leg: LegStyle, extra: Partial<PantsOpts> = {}): FlatSpec => ({ family: 'pantalon', pants: { leg, length: 'largo', waist: 'pretina', pockets: 'laterales', ...extra } });
const topFlat = (top: TopOpts): FlatSpec => ({ family: 'top', top });
const jeansTerms = ['jeans', 'mezclilla', 'denim', 'vaquero', 'vaqueros', 'cinco bolsillos', 'pantalon de mezclilla'];
const jeansMaterials = ['Cierre metálico para jeans', 'Botón de jeans', 'Remaches (opcional)', 'Forro para bolsas', 'Hilo de pespunte'];

type Upgrade = Partial<CatalogModel> & Pick<CatalogModel, 'generatorId' | 'params' | 'description'>;
const jeans = (silueta: string, extra: Partial<CatalogModel> & { description: string }, params: Record<string, string> = {}): Upgrade => ({
  status: 'experimental', generatorId: 'pantalon-mezclilla', params: { silueta, cintura: 'pretina', bolsillos: 'cinco', ...params },
  recipients: everyone, fabrics: ['plano'], stretch: silueta === 'pitillo' ? 'alta' : 'baja', fits: silueta === 'pitillo' ? ['ajustado'] : ['regular', 'holgado'],
  techniques: ['costura-recta', 'cierre', 'bolsillos', 'botones', 'dobladillo'], difficulty: 3, collection: TREND,
  recommendedFabrics: silueta === 'pitillo' ? ['Mezclilla con elastano', 'Gabardina elástica'] : ['Mezclilla de 10–14 oz', 'Gabardina', 'Sarga', 'Pana'],
  materials: jeansMaterials,
  variants: [{ name: 'Tiro alto o medio', text: 'La altura de cintura cambia la cintura del patrón; el canesú reparte la diferencia con la cadera.' }, { name: 'Bolsillos', text: 'Cinco bolsillos, cargo con fuelle, solo traseros o sin bolsillos.' }, { name: 'Rodilla y bajo', text: 'Ajusta el ancho en la rodilla y en el bajo sin perder la silueta.' }],
  ...extra
});

/** Existing inspiration IDs that now generate a real pattern. */
const UPGRADES: Record<string, Upgrade> = {
  'pantalon-baggy': jeans('baggy', { description: 'Pantalón baggy de mezclilla: cadera muy holgada, tiro más bajo y pierna amplia, con pretina, bragueta con cierre, canesú y cinco bolsillos.', searchTerms: ['baggy', ...jeansTerms] }),
  'pantalon-barrel': jeans('barrel', { description: 'Pantalón barrel: la pierna se abomba en la rodilla y se cierra en el bajo con costados e entrepiernas curvas. Pretina, bragueta, canesú y cinco bolsillos.', searchTerms: ['barrel', 'barril', 'curvo', ...jeansTerms] }, { tiro: 'alto' }),
  'pantalon-cargo': jeans('baggy', { description: 'Pantalón cargo holgado con bolsillos de fuelle y cartera en el muslo, bolsillos delanteros, canesú y bragueta con cierre.', searchTerms: ['cargo', 'fuelle', 'utilitario', ...jeansTerms], recommendedFabrics: ['Gabardina', 'Sarga', 'Lona ligera', 'Mezclilla'] }, { bolsillos: 'cargo' }),
  'pantalon-pitillo': jeans('pitillo', { description: 'Pitillo (skinny) de mezclilla elástica: rodilla y bajo ajustados, cinco bolsillos y bragueta con cierre. Avisa si la tela no tiene elasticidad o si el bajo no pasa por el talón.', searchTerms: ['pitillo', 'skinny', 'entubado', ...jeansTerms] }),
  'pantalon-acampanado': jeans('acampanado', { description: 'Acampanado: ajustado hasta la rodilla y abierto en el bajo con curvas suaves. Cinco bolsillos, canesú y bragueta.', searchTerms: ['acampanado', 'campana', 'flare', 'bootcut', ...jeansTerms] }, { tiro: 'alto' }),
  'sobrecamisa-leñadora': {
    status: 'experimental', generatorId: 'oversize-hombro-caido', params: { prenda: 'sobrecamisa', bolsillos: 'pecho' }, recipients: everyone, fabrics: ['plano'], stretch: 'ninguna', fits: ['holgado', 'oversize'], collection: TREND,
    description: 'Sobrecamisa oversize de hombro caído: pie de cuello y cuello, tapeta integrada con botones, dos bolsillos de pecho y manga de copa baja que mide exactamente la sisa.',
    variants: [{ name: 'Largo', text: 'Cambia el largo con «Ajuste de largo»; la versión corta es la misma construcción.' }], materials: ['Botones de 15–18 mm', 'Entretela', 'Hilo'],
    searchTerms: ['sobrecamisa', 'overshirt', 'shacket', 'camisa oversize', 'hombro caido', 'franela'], designGroup: { id: 'tipo-sobrecamisa', name: 'Sobrecamisa oversize', preferred: true }
  },
  'sobrecamisa-corta': {
    status: 'experimental', generatorId: 'oversize-hombro-caido', params: { prenda: 'sobrecamisa', bolsillos: 'pecho', largoExtra: -180 }, recipients: everyone, fabrics: ['plano'], stretch: 'ninguna', fits: ['holgado', 'oversize'], collection: TREND,
    description: 'Sobrecamisa corta (cropped) de hombro caído con pie de cuello, tapeta y bolsillos de pecho.', variants: [], materials: ['Botones', 'Entretela', 'Hilo'],
    searchTerms: ['sobrecamisa', 'cropped', 'corta', 'overshirt', 'hombro caido'], designGroup: { id: 'tipo-sobrecamisa', name: 'Sobrecamisa oversize' }
  },
  'bomber-clasica': {
    status: 'experimental', generatorId: 'oversize-hombro-caido', params: { prenda: 'bomber' }, recipients: everyone, fabrics: ['plano'], stretch: 'ninguna', fits: ['holgado', 'oversize'], collection: TREND,
    description: 'Bomber oversize de hombro caído con cuello, puños y banda de rib, cierre separable, bolsillos de vivo y forro completo.',
    variants: [{ name: 'Corta o clásica', text: 'La bomber corta usa la misma construcción con menos largo.' }], materials: ['Rib 2×2', 'Cierre separable', 'Forro', 'Hilo'],
    searchTerms: ['bomber', 'chaqueta bomber', 'rib', 'oversize', 'hombro caido'], designGroup: { id: 'tipo-bomber', name: 'Bomber oversize', preferred: true }
  },
  'bomber-corta': {
    status: 'experimental', generatorId: 'oversize-hombro-caido', params: { prenda: 'bomber', largoExtra: -120 }, recipients: everyone, fabrics: ['plano'], stretch: 'ninguna', fits: ['holgado', 'oversize'], collection: TREND,
    description: 'Bomber corta a la cintura, hombro caído, rib, cierre separable y forro.', variants: [], materials: ['Rib 2×2', 'Cierre separable', 'Forro', 'Hilo'],
    searchTerms: ['bomber', 'corta', 'cropped', 'hombro caido'], designGroup: { id: 'tipo-bomber', name: 'Bomber oversize' }
  },
  'sombrero-pescador': {
    status: 'experimental', generatorId: 'sombrero-pescador', params: { barbiquejo: 'no' }, recipients: ['bebe', 'toddler', 'infantil', 'mujer', 'hombre', 'unisex'], studioOnly: false,
    fabrics: ['plano'], stretch: 'ninguna', fits: ['regular'], techniques: ['costura-recta', 'forro'],
    description: 'Sombrero pescador (bucket) reversible: copa oval, banda cónica y ala con caída, todo calculado desde el contorno de cabeza. Barbiquejo con broche opcional para bebé.',
    variants: [{ name: 'Ala y caída', text: 'Ajusta el ancho del ala y cuánto cae.' }], recommendedFabrics: ['Algodón', 'Lino', 'Mezclilla ligera', 'Lona'], materials: ['Entretela para el ala', 'Hilo'],
    searchTerms: ['sombrero', 'pescador', 'bucket', 'gorro de sol', 'sol', 'reversible']
  }
};

export function withTrendPatterns(m: CatalogModel): CatalogModel {
  const up = UPGRADES[m.id];
  return up ? { ...m, ...up } : m;
}

const model = (m: Omit<CatalogModel, 'status' | 'variants'> & { variants?: CatalogModel['variants'] }): CatalogModel => ({ status: 'experimental', variants: [], ...m });

export const TREND_CATALOG: CatalogModel[] = [
  model({ id: 'jeans-recto', name: 'Jeans rectos de cinco bolsillos', type: 'inferiores', sub: 'Mezclilla', flat: pantsFlat('recto'), ...jeans('recto', { description: 'Jeans clásicos de pierna recta: pretina con botón, bragueta con cierre, bolsillos delanteros con vista y bolsa, relojera, canesú, bolsillos traseros y presillas.', searchTerms: ['recto', 'clasico', ...jeansTerms] }) } as CatalogModel),
  model({ id: 'jeans-mom', name: 'Mom jeans de tiro alto', type: 'inferiores', sub: 'Mezclilla', flat: pantsFlat('recto', { length: 'tobillo' }), ...jeans('mom', { description: 'Mom jeans: tiro alto, cadera cómoda y pierna que se estrecha hacia el tobillo. Cinco bolsillos, canesú y bragueta con cierre.', searchTerms: ['mom', 'mom jeans', 'tiro alto', 'conico', ...jeansTerms] }, { tiro: 'alto' }) } as CatalogModel),
  model({ id: 'jeans-ancho', name: 'Jeans de pierna ancha (wide leg)', type: 'inferiores', sub: 'Mezclilla', flat: pantsFlat('ancho'), ...jeans('ancho', { description: 'Wide leg de tiro alto: pierna ancha y recta desde la cadera, cinco bolsillos, canesú y bragueta.', searchTerms: ['wide leg', 'ancho', 'pierna ancha', 'palazzo de mezclilla', ...jeansTerms] }, { tiro: 'alto' }) } as CatalogModel),
  model({ id: 'barrel-bebe', name: 'Pantalón barrel de bebé', type: 'inferiores', sub: 'Pantalones de bebé', recipients: ['bebe', 'toddler'], difficulty: 1, fabrics: ['plano', 'punto'], stretch: 'ninguna', fits: ['holgado'], techniques: ['costura-recta', 'jareta', 'dobladillo'],
    generatorId: 'pantalon-mezclilla', params: { silueta: 'barrel', cintura: 'elastica', bolsillos: 'parche', tiro: 'alto' }, flat: { family: 'pantalon', pants: { leg: 'barrel', length: 'largo', waist: 'elastica', pockets: 'parche' } },
    description: 'Barrel para bebé con cintura elástica y espacio para el pañal: pierna redondeada en la rodilla que se cierra en el tobillo, bolsillos traseros de parche.', recommendedFabrics: ['Pana fina', 'Mezclilla suave', 'Lino', 'Punto grueso'], materials: ['Elástico', 'Hilo'],
    collection: BABY, searchTerms: ['barrel', 'barril', 'pantalon de bebe', 'bombacho'], designGroup: { id: 'pantalon-barrel', name: 'Pantalón barrel' } }),
  model({ id: 'baggy-bebe', name: 'Pantalón baggy de bebé', type: 'inferiores', sub: 'Pantalones de bebé', recipients: ['bebe', 'toddler'], difficulty: 1, fabrics: ['plano', 'punto'], stretch: 'ninguna', fits: ['holgado'], techniques: ['costura-recta', 'jareta', 'dobladillo'],
    generatorId: 'pantalon-mezclilla', params: { silueta: 'baggy', cintura: 'elastica', bolsillos: 'parche', tiro: 'alto' }, flat: { family: 'pantalon', pants: { leg: 'baggy', length: 'largo', waist: 'elastica', pockets: 'parche' } },
    description: 'Baggy de bebé con cintura elástica, pierna amplia y espacio para el pañal; bolsillos traseros de parche.', recommendedFabrics: ['Mezclilla suave', 'Pana fina', 'Gabardina ligera'], materials: ['Elástico', 'Hilo'],
    collection: BABY, searchTerms: ['baggy', 'pantalon de bebe', 'holgado'], designGroup: { id: 'pantalon-baggy', name: 'Pantalón baggy' } }),
  model({ id: 'camiseta-oversize', name: 'Camiseta oversize · manga corta', type: 'superiores', sub: 'Camisetas', recipients: ['bebe', 'toddler', ...everyone], difficulty: 1, fabrics: ['punto'], stretch: 'media', fits: ['oversize'], techniques: ['tejido-punto', 'dobladillo'],
    generatorId: 'oversize-hombro-caido', params: { prenda: 'camiseta', manga: 'corta' }, flat: topFlat({ type: 'camiseta', sleeve: 'corta', neck: 'redondo', closure: 'ninguno', length: 720, fit: 1.32 }),
    description: 'Camiseta boxy de hombro caído con cuello de rib. La copa de la manga se calcula para medir exactamente la sisa.', recommendedFabrics: ['Jersey de algodón 180–240 g/m²', 'Jersey de bambú', 'Interlock'], materials: ['Rib 1×1', 'Hilo para punto'],
    collection: TREND, searchTerms: ['camiseta', 'playera', 'oversize', 'boxy', 'hombro caido', 'tshirt'], designGroup: { id: 'tipo-camiseta-oversize', name: 'Camiseta oversize', preferred: true } }),
  model({ id: 'camiseta-oversize-larga', name: 'Camiseta oversize · manga larga', type: 'superiores', sub: 'Camisetas', recipients: ['bebe', 'toddler', ...everyone], difficulty: 1, fabrics: ['punto'], stretch: 'media', fits: ['oversize'], techniques: ['tejido-punto', 'dobladillo'],
    generatorId: 'oversize-hombro-caido', params: { prenda: 'camiseta', manga: 'larga' }, flat: topFlat({ type: 'camiseta', sleeve: 'larga', neck: 'redondo', closure: 'ninguno', length: 720, fit: 1.32 }),
    description: 'Camiseta boxy de manga larga y hombro caído con cuello de rib.', recommendedFabrics: ['Jersey de algodón', 'Interlock'], materials: ['Rib 1×1', 'Hilo para punto'],
    collection: TREND, searchTerms: ['camiseta', 'playera', 'oversize', 'manga larga', 'hombro caido'], designGroup: { id: 'tipo-camiseta-oversize', name: 'Camiseta oversize' } }),
  model({ id: 'chaqueta-trabajo', name: 'Chaqueta de trabajo oversize', type: 'abrigo', sub: 'Chaquetas por estilo', recipients: everyone, difficulty: 3, fabrics: ['plano'], stretch: 'ninguna', fits: ['holgado', 'oversize'], techniques: ['costura-recta', 'botones', 'bolsillos', 'dobladillo'],
    generatorId: 'oversize-hombro-caido', params: { prenda: 'sobrecamisa', bolsillos: 'tres', largoExtra: 40 }, flat: topFlat({ style: 'shacket', type: 'chaqueta', sleeve: 'larga', neck: 'camisa', closure: 'botones', length: 740, fit: 1.25, pocket: 'parche' }),
    description: 'Chore jacket de hombro caído: pie de cuello y cuello, tapeta con botones, bolsillo de pecho y dos bolsillos bajos grandes.', recommendedFabrics: ['Lona', 'Sarga', 'Pana', 'Mezclilla'], materials: ['Botones', 'Entretela', 'Hilo'],
    collection: TREND, searchTerms: ['chaqueta de trabajo', 'chore', 'workwear', 'oversize', 'hombro caido', 'chamarra'] }),
  model({ id: 'pelele-tirantes', name: 'Pelele de tirantes (pierna corta)', type: 'monos', sub: 'Petos de bebé', recipients: ['bebe', 'toddler'], difficulty: 2, fabrics: ['plano'], stretch: 'ninguna', fits: ['holgado'], techniques: ['costura-recta', 'botones', 'dobladillo'],
    generatorId: 'peto-bebe', params: { largo: 'corto' }, flat: { family: 'bebe', kids: 'peto-corto' },
    description: 'Jumper de bebé con peto y tirantes cruzados que se abrochan delante; piernas y entrepierna con cinta de broches para cambiar el pañal.', recommendedFabrics: ['Pana fina', 'Lino', 'Gabardina ligera', 'Mezclilla suave'], materials: ['Cinta de broches', 'Broches', 'Bies', 'Hilo'],
    collection: BABY, searchTerms: ['jumper', 'pelele', 'romper', 'peto', 'tirantes', 'overol corto'], designGroup: { id: 'tipo-peto-bebe', name: 'Peto de bebé (jumper)', preferred: true } }),
  model({ id: 'overol-bebe', name: 'Overol de bebé (pierna larga)', type: 'monos', sub: 'Petos de bebé', recipients: ['bebe', 'toddler'], difficulty: 2, fabrics: ['plano'], stretch: 'ninguna', fits: ['holgado'], techniques: ['costura-recta', 'botones', 'dobladillo'],
    generatorId: 'peto-bebe', params: { largo: 'largo' }, flat: { family: 'bebe', kids: 'peto-largo' },
    description: 'Overol de bebé de pierna larga con peto, tirantes cruzados y abertura de broches de tobillo a tobillo.', recommendedFabrics: ['Pana', 'Mezclilla suave', 'Gabardina'], materials: ['Cinta de broches', 'Broches', 'Bies', 'Hilo'],
    collection: BABY, searchTerms: ['jumper', 'overol', 'peto', 'tirantes', 'dungaree'], designGroup: { id: 'tipo-peto-bebe', name: 'Peto de bebé (jumper)' } }),
  ...(['oso', 'gato', 'conejo'] as const).map((ears, i) => model({
    id: `gorro-orejas-${ears}`, name: `Gorro con orejas de ${ears}`, type: 'bebe', sub: 'Gorros', recipients: ['bebe', 'toddler', 'infantil'], difficulty: 1, fabrics: ['punto'], stretch: 'media', fits: ['ajustado'], techniques: ['tejido-punto'],
    generatorId: 'gorro-orejas', params: { orejas: ears }, flat: { family: 'accesorio', kids: `gorro-${ears}` },
    description: `Gorro de punto de dos piezas con doblez y orejas de ${ears} de dos caras cosidas en la copa.`, recommendedFabrics: ['Rib de algodón', 'Interlock', 'Polar fino'], materials: ['Retazo de contraste', 'Hilo para punto'],
    collection: BABY, searchTerms: ['gorro', 'gorrito', 'orejas', 'orejitas', ears], designGroup: { id: 'tipo-gorro-orejas', name: 'Gorro con orejitas', preferred: i === 0 }
  })),
  ...([['verano', 'Conjunto de verano: pelele y sombrero'], ['invierno', 'Conjunto de invierno: overol y gorro con orejitas'], ['recien-nacido', 'Conjunto de recién nacido: bonete, patucos y babero']] as const).map(([set, name], i) => model({
    id: `conjunto-${set}`, name, type: 'bebe', sub: 'Conjuntos', recipients: ['bebe', 'toddler'], difficulty: 2, fabrics: ['plano'], stretch: 'ninguna', fits: ['regular'], techniques: ['costura-recta', 'botones'],
    generatorId: 'conjunto-bebe', params: { conjunto: set }, flat: { family: 'accesorio', kids: `conjunto-${set}` },
    description: `${name}. Cada prenda conserva su patrón real, sus comprobaciones y sus pasos; todo sale en un solo PDF.`, recommendedFabrics: ['Algodón', 'Pana fina', 'Punto para el gorro'], materials: ['Broches infantiles', 'Hilo'],
    collection: BABY, searchTerms: ['conjunto', 'set', 'ajuar', 'regalo de bebe', set], designGroup: { id: 'tipo-conjunto-bebe', name: 'Conjuntos de bebé', preferred: i === 0 }
  })),
  model({ id: 'sombrero-pescador-bebe', name: 'Sombrero pescador de bebé con barbiquejo', type: 'bebe', sub: 'Gorros', recipients: ['bebe', 'toddler'], difficulty: 2, fabrics: ['plano'], stretch: 'ninguna', fits: ['regular'], techniques: ['costura-recta', 'forro'],
    generatorId: 'sombrero-pescador', params: { barbiquejo: 'si' }, flat: { family: 'accesorio', accessory: 'sombrero' },
    description: 'Sombrero de sol reversible para bebé con barbiquejo de broche.', recommendedFabrics: ['Algodón', 'Lino', 'Muselina doble'], materials: ['Broche infantil', 'Entretela suave', 'Hilo'],
    collection: BABY, searchTerms: ['sombrero', 'pescador', 'bucket', 'gorro de sol', 'bebe'], designGroup: { id: 'sombrero-pescador', name: 'Sombrero tipo pescador · bucket' } })
];
