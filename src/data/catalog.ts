import { EXPANDED_CATALOG } from './catalogExpansion';
import { COLLECTION_CATALOG } from './catalogCollections';
import { COSTUME_CATALOG } from './costumeCatalog';
import type { FlatSpec } from './flats';
import type { Params } from '../lib/pattern/generator';
import { withDesignGroup, type CatalogDesignGroup } from './catalogGrouping';
import { withCatalogTaxonomy, type CatalogFamily } from './catalogTaxonomy';

export type Recipient = 'bebe' | 'toddler' | 'infantil' | 'mujer' | 'hombre' | 'unisex';

export const RECIPIENT_LABEL: Record<Recipient, string> = {
  bebe: 'Bebé',
  toddler: '1–4 años',
  infantil: 'Niñas y niños',
  mujer: 'Mujer',
  hombre: 'Hombre',
  unisex: 'Unisex'
};

export type GarmentType = 'superiores' | 'inferiores' | 'faldas-vestidos' | 'abrigo' | 'pijamas' | 'bebe' | 'bolsos' | 'reparacion' | 'aplicaciones' | 'monos' | 'accesorios';

export const TYPE_LABEL: Record<GarmentType, string> = {
  superiores: 'Camisas, blusas y camisetas',
  inferiores: 'Pantalones y shorts',
  'faldas-vestidos': 'Faldas y vestidos',
  abrigo: 'Sudaderas, chalecos, chaquetas y abrigos',
  pijamas: 'Pijamas',
  bebe: 'Prendas y accesorios de bebé',
  bolsos: 'Bolsos y bolsas',
  accesorios: 'Accesorios y hogar textil',
  monos: 'Monos, petos y jumpers',
  reparacion: 'Reparación y transformación',
  aplicaciones: 'Aplicaciones, parches y collage'
};

export type ModelStatus = 'implementado' | 'experimental' | 'pendiente';

export const STATUS_INFO: Record<ModelStatus, { label: string; tone: 'ok' | 'warn' | 'off'; text: string }> = {
  implementado: { label: 'Patrón disponible', tone: 'ok', text: 'Genera el patrón a medida, lo valida y lo exporta en carta.' },
  experimental: { label: 'Experimental', tone: 'warn', text: 'Funciona, pero sus reglas de construcción aún se están verificando.' },
  pendiente: { label: 'Solo inspiración', tone: 'off', text: 'El patrón todavía no se genera. Puedes usar el dibujo técnico como plantilla de diseño.' }
};

export type Technique = 'costura-recta' | 'jareta' | 'puno' | 'dobladillo' | 'forro' | 'cierre' | 'botones' | 'pinzas' | 'bolsillos' | 'frunces' | 'aplicacion' | 'bordado' | 'collage' | 'remiendo' | 'tejido-punto';

export const TECHNIQUE_LABEL: Record<Technique, string> = {
  'costura-recta': 'Costura recta',
  jareta: 'Jareta con elástico',
  puno: 'Puños de punto',
  dobladillo: 'Dobladillo',
  forro: 'Forro',
  cierre: 'Cierre',
  botones: 'Botones y ojales',
  pinzas: 'Pinzas',
  bolsillos: 'Bolsillos',
  frunces: 'Frunces',
  aplicacion: 'Aplicación',
  bordado: 'Bordado',
  collage: 'Collage textil',
  remiendo: 'Remiendo visible',
  'tejido-punto': 'Costura de punto'
};

export interface CatalogModel {
  id: string;
  name: string;
  type: GarmentType;
  sub: string;
  recipients: Recipient[];
  difficulty: 1 | 2 | 3;
  fabrics: ('plano' | 'punto')[];
  stretch: 'ninguna' | 'baja' | 'media' | 'alta';
  fits: ('ajustado' | 'regular' | 'holgado' | 'oversize')[];
  techniques: Technique[];
  status: ModelStatus;
  generatorId?: string;
  params?: Params;
  /** Flujo del estudio en lugar de un generador de patrón. */
  studioOnly?: boolean;
  /** Distribución de cortes sobre las piezas reales, aplicada al crear el proyecto. */
  panelPreset?: string;
  flat: FlatSpec;
  description: string;
  variants: { name: string; text: string }[];
  recommendedFabrics: string[];
  materials: string[];
  /** Physical pattern families and explicit construction/dimension variants. */
  collection?: string;
  variantLabel?: string;
  searchTerms?: string[];
  /** One browsing card; member recipes retain their dimensions and stable IDs. */
  designGroup?: CatalogDesignGroup;
  /** Item identity, independent of collections and optional decorations. */
  family?: CatalogFamily;
}

const kidsToAdult: Recipient[] = ['bebe', 'toddler', 'infantil', 'mujer', 'hombre'];

const BASE_CATALOG: CatalogModel[] = [
  // ---------- Inferiores (implementados)
  {
    id: 'pantalon-recto-elastico',
    name: 'Pantalón recto con cintura elástica',
    type: 'inferiores',
    sub: 'Cintura elástica',
    recipients: [...kidsToAdult, 'unisex'],
    difficulty: 1,
    fabrics: ['plano', 'punto'],
    stretch: 'ninguna',
    fits: ['regular', 'holgado'],
    techniques: ['costura-recta', 'jareta', 'dobladillo'],
    status: 'implementado',
    generatorId: 'pantalon-cintura-elastica',
    params: { estilo: 'recto' },
    flat: { family: 'pantalon', pants: { leg: 'recto', length: 'largo', waist: 'elastica' } },
    description: 'Pantalón sin cierre, de dos piezas por pierna, con jareta para elástico. Funciona desde bebé (con espacio para pañal) hasta adulto.',
    variants: [
      { name: 'Pierna recta', text: 'Se estrecha hasta la rodilla y cae recta al bajo.' },
      { name: 'Largo tobillo o capri', text: 'Ajusta el largo terminado; el patrón recalcula la rodilla.' },
      { name: 'Short', text: 'Con un largo menor a 20 cm bajo el tiro se construye sin línea de rodilla.' }
    ],
    recommendedFabrics: ['Popelina', 'Lino', 'Gabardina ligera', 'Franela', 'Punto interlock'],
    materials: ['Elástico de 15–30 mm', 'Hilo']
  },
  {
    id: 'jogger',
    name: 'Jogger con puños',
    type: 'inferiores',
    sub: 'Jogger',
    recipients: [...kidsToAdult, 'unisex'],
    difficulty: 2,
    fabrics: ['punto', 'plano'],
    stretch: 'media',
    fits: ['regular', 'holgado'],
    techniques: ['jareta', 'puno', 'tejido-punto'],
    status: 'implementado',
    generatorId: 'pantalon-cintura-elastica',
    params: { estilo: 'jogger' },
    flat: { family: 'pantalon', pants: { leg: 'jogger', length: 'largo', waist: 'elastica', pockets: 'laterales' } },
    description: 'Pantalón deportivo que se estrecha hacia el tobillo y termina en puño de rib. El puño se calcula con el tobillo y se comprueba que pase por el talón.',
    variants: [
      { name: 'Puño de rib', text: 'Se cose estirado al bajo; la app valida la relación de estiramiento.' },
      { name: 'Bolsillos laterales', text: 'Pendiente: el dibujo los muestra, el patrón aún no los genera.' }
    ],
    recommendedFabrics: ['French terry', 'Felpa', 'Punto interlock', 'Rib para puños'],
    materials: ['Elástico', 'Rib 1×1 o 2×2', 'Hilo']
  },
  {
    id: 'pantalon-ancho-elastico',
    name: 'Pantalón ancho de cintura elástica',
    type: 'inferiores',
    sub: 'Pantalón ancho',
    recipients: ['mujer', 'hombre', 'infantil', 'unisex'],
    difficulty: 1,
    fabrics: ['plano'],
    stretch: 'ninguna',
    fits: ['holgado', 'oversize'],
    techniques: ['jareta', 'dobladillo'],
    status: 'implementado',
    generatorId: 'pantalon-cintura-elastica',
    params: { estilo: 'ancho' },
    flat: { family: 'pantalon', pants: { leg: 'ancho', length: 'largo', waist: 'elastica' } },
    description: 'Pierna amplia sin estrechamiento en la rodilla. El contorno de bajo es un parámetro editable.',
    variants: [{ name: 'Más amplitud', text: 'Aumenta el contorno de bajo para acercarlo a un palazzo.' }],
    recommendedFabrics: ['Lino', 'Viscosa', 'Tencel', 'Crepé'],
    materials: ['Elástico de 25–40 mm', 'Hilo']
  },
  {
    id: 'pantalon-bebe-panal',
    name: 'Pantalón de bebé con espacio para pañal',
    type: 'bebe',
    sub: 'Pantalones de bebé',
    recipients: ['bebe', 'toddler'],
    difficulty: 1,
    fabrics: ['punto', 'plano'],
    stretch: 'media',
    fits: ['regular', 'holgado'],
    techniques: ['jareta', 'puno', 'tejido-punto'],
    status: 'implementado',
    generatorId: 'pantalon-cintura-elastica',
    params: { estilo: 'jogger' },
    flat: { family: 'pantalon', pants: { leg: 'jogger', length: 'largo', waist: 'elastica' } },
    description: 'Mismo motor que el pantalón elástico con holgura de pañal en tiro, cadera y tiro trasero. La edad solo orienta: se usan las medidas.',
    variants: [
      { name: 'Con puños', text: 'Evita que el bajo suba al gatear.' },
      { name: 'Bajo recto', text: 'Cambia la pierna a recta en los parámetros.' }
    ],
    recommendedFabrics: ['Punto interlock de algodón', 'Felpa ligera', 'Muselina'],
    materials: ['Elástico suave de 15 mm', 'Rib para puños', 'Hilo']
  },
  {
    id: 'short-elastico',
    name: 'Short con cintura elástica',
    type: 'inferiores',
    sub: 'Shorts',
    recipients: [...kidsToAdult, 'unisex'],
    difficulty: 1,
    fabrics: ['plano', 'punto'],
    stretch: 'ninguna',
    fits: ['regular', 'holgado'],
    techniques: ['jareta', 'dobladillo'],
    status: 'implementado',
    generatorId: 'pantalon-cintura-elastica',
    params: { estilo: 'recto', largoRelativo: 'short' },
    flat: { family: 'pantalon', pants: { leg: 'recto', length: 'short', waist: 'elastica' } },
    description: 'El pantalón elástico con un largo corto. Ajusta el largo terminado tras crear el proyecto.',
    variants: [{ name: 'Bermuda', text: 'Un largo hasta la rodilla.' }],
    recommendedFabrics: ['Popelina', 'Chambray', 'Lino'],
    materials: ['Elástico', 'Hilo']
  },
  {
    id: 'pantalon-pijama',
    name: 'Pantalón de pijama',
    type: 'pijamas',
    sub: 'Pijama',
    recipients: [...kidsToAdult, 'unisex'],
    difficulty: 1,
    fabrics: ['plano', 'punto'],
    stretch: 'ninguna',
    fits: ['holgado'],
    techniques: ['jareta', 'dobladillo'],
    status: 'implementado',
    generatorId: 'pantalon-cintura-elastica',
    params: { estilo: 'recto' },
    flat: { family: 'pantalon', pants: { leg: 'recto', length: 'largo', waist: 'elastica' } },
    description: 'Pantalón holgado de jareta para dormir. Elige el ajuste «Holgado» para más soltura en tiro y cadera.',
    variants: [{ name: 'Con puños', text: 'Usa la versión jogger.' }],
    recommendedFabrics: ['Franela', 'Popelina', 'Punto de algodón'],
    materials: ['Elástico', 'Cordón opcional', 'Hilo']
  },
  // ---------- Inferiores (pendientes)
  ...(
    [
      ['pantalon-baggy', 'Pantalón baggy', 'Baggy', 'baggy', 'Pierna muy amplia con tiro bajo. Requiere reglas de tiro y caída propias.'],
      ['pantalon-barrel', 'Pantalón barrel', 'Barrel', 'barrel', 'Pierna curva que se abomba en la rodilla y cierra en el bajo. Requiere costura lateral curva.'],
      ['pantalon-cargo', 'Pantalón cargo', 'Cargo', 'cargo', 'Bolsillos de fuelle en el muslo con cartera. Requiere módulo de bolsillos.'],
      ['pantalon-palazzo', 'Pantalón palazzo', 'Palazzo', 'palazzo', 'Pierna muy amplia desde la cadera. Requiere pretina y cierre.'],
      ['pantalon-pinzas', 'Pantalón con pinzas', 'Con pinzas', 'pinzas', 'Pinzas o pliegues en la cintura con pretina y bragueta.'],
      ['pantalon-pitillo', 'Pantalón pitillo', 'Pitillo', 'pitillo', 'Muy ajustado, necesita tejido elástico y reglas de reducción negativa.'],
      ['pantalon-acampanado', 'Pantalón acampanado', 'Acampanado', 'acampanado', 'Ajustado hasta la rodilla y abierto en el bajo.']
    ] as const
  ).map(
    ([id, name, sub, leg, description]): CatalogModel => ({
      id,
      name,
      type: 'inferiores',
      sub,
      recipients: ['mujer', 'hombre', 'unisex'],
      difficulty: 2,
      fabrics: ['plano'],
      stretch: leg === 'pitillo' ? 'alta' : 'ninguna',
      fits: leg === 'pitillo' ? ['ajustado'] : ['holgado', 'oversize'],
      techniques: ['cierre', 'bolsillos', 'costura-recta'],
      status: 'pendiente',
      flat: { family: 'pantalon', pants: { leg, length: 'largo', waist: 'pretina', pockets: leg === 'cargo' ? 'cargo' : 'laterales' } },
      description,
      variants: [],
      recommendedFabrics: ['Gabardina', 'Denim', 'Sarga'],
      materials: ['Cierre de 18 cm', 'Botón', 'Entretela', 'Hilo']
    })
  ),
  {
    id: 'overol',
    name: 'Overol',
    type: 'inferiores',
    sub: 'Overoles',
    recipients: ['toddler', 'infantil', 'mujer', 'unisex'],
    difficulty: 3,
    fabrics: ['plano'],
    stretch: 'ninguna',
    fits: ['holgado'],
    techniques: ['botones', 'bolsillos', 'forro'],
    status: 'pendiente',
    flat: { family: 'pantalon', pants: { leg: 'recto', length: 'largo', waist: 'pretina', bib: true } },
    description: 'Pantalón con peto y tirantes. Pendiente: requiere el módulo de peto y tirantes.',
    variants: [],
    recommendedFabrics: ['Denim', 'Pana', 'Gabardina'],
    materials: ['Hebillas para overol', 'Botones', 'Hilo']
  },
  // ---------- Faldas y vestidos
  {
    id: 'falda-fruncida',
    name: 'Falda fruncida con elástico',
    type: 'faldas-vestidos',
    sub: 'Faldas',
    recipients: ['toddler', 'infantil', 'mujer'],
    difficulty: 1,
    fabrics: ['plano', 'punto'],
    stretch: 'ninguna',
    fits: ['regular', 'holgado'],
    techniques: ['jareta', 'frunces', 'dobladillo'],
    status: 'implementado',
    generatorId: 'falda-fruncida-elastica',
    flat: { family: 'falda', skirt: { shape: 'fruncida', length: 560, waist: 'elastica' } },
    description: 'Dos paneles al doblez con jareta. La amplitud se define como proporción de la cadera y se avisa si el frunce o el ancho de la tela no alcanzan.',
    variants: [
      { name: 'Midi o larga', text: 'Cambia el largo terminado.' },
      { name: 'Más vuelo', text: 'Aumenta la amplitud (contorno / cadera).' }
    ],
    recommendedFabrics: ['Algodón estampado', 'Viscosa', 'Gasa con forro', 'Lino'],
    materials: ['Elástico', 'Hilo']
  },
  ...(
    [
      ['falda-recta', 'Falda recta', 'recta', 'Falda lápiz con pinzas, cierre invisible y abertura.'],
      ['falda-a', 'Falda en A', 'a', 'Falda evasé con pretina y cierre.'],
      ['falda-circular', 'Falda circular', 'circular', 'Falda de círculo completo o medio círculo.'],
      ['falda-tableada', 'Falda tableada', 'tableada', 'Tablas encontradas o en un solo sentido.']
    ] as const
  ).map(
    ([id, name, shape, description]): CatalogModel => ({
      id,
      name,
      type: 'faldas-vestidos',
      sub: 'Faldas',
      recipients: ['infantil', 'mujer'],
      difficulty: shape === 'recta' ? 3 : 2,
      fabrics: ['plano'],
      stretch: 'ninguna',
      fits: ['regular'],
      techniques: ['cierre', 'pinzas', 'dobladillo'],
      status: 'pendiente',
      flat: { family: 'falda', skirt: { shape, length: shape === 'recta' ? 580 : 600, waist: 'pretina' } },
      description,
      variants: [],
      recommendedFabrics: ['Gabardina', 'Lana ligera', 'Crepé'],
      materials: ['Cierre invisible', 'Entretela', 'Hilo']
    })
  ),
  {
    id: 'vestido-camisero',
    name: 'Vestido de corte en cintura',
    type: 'faldas-vestidos',
    sub: 'Vestidos',
    recipients: ['infantil', 'mujer'],
    difficulty: 3,
    fabrics: ['plano'],
    stretch: 'ninguna',
    fits: ['regular'],
    techniques: ['pinzas', 'cierre', 'frunces'],
    status: 'pendiente',
    flat: { family: 'vestido', dress: { sleeve: 'corta', neck: 'redondo', skirt: 'fruncida', length: 1050 } },
    description: 'Cuerpo con pinzas unido a una falda fruncida. Requiere el bloque de torso.',
    variants: [],
    recommendedFabrics: ['Popelina', 'Viscosa', 'Lino'],
    materials: ['Cierre invisible', 'Hilo']
  },
  // ---------- Superiores
  ...(
    [
      ['camiseta-basica', 'Camiseta básica', 'Camisetas', { type: 'camiseta', sleeve: 'corta', neck: 'redondo', closure: 'ninguno', length: 700 }, ['punto'], 'Camiseta de punto con cuello redondo y manga corta.'],
      ['camiseta-larga', 'Camiseta de manga larga', 'Camisetas', { type: 'camiseta', sleeve: 'larga', neck: 'redondo', closure: 'ninguno', length: 700, cuffs: true }, ['punto'], 'Con puños de rib opcionales.'],
      ['camisa-clasica', 'Camisa clásica', 'Camisas', { type: 'camisa', sleeve: 'larga', neck: 'camisa', closure: 'botones', length: 760, pocket: 'pecho' }, ['plano'], 'Cuello con pie, canesú, puños y botones.'],
      ['blusa-v', 'Blusa con escote en V', 'Blusas', { type: 'blusa', sleeve: 'tres-cuartos', neck: 'v', closure: 'ninguno', length: 640 }, ['plano'], 'Blusa holgada con escote en V y vistas.']
    ] as const
  ).map(
    ([id, name, sub, top, fabrics, description]): CatalogModel => ({
      id,
      name,
      type: 'superiores',
      sub,
      recipients: id === 'blusa-v' ? ['infantil', 'mujer'] : ['infantil', 'mujer', 'hombre', 'unisex'],
      difficulty: id === 'camisa-clasica' ? 3 : 2,
      fabrics: [...fabrics],
      stretch: fabrics[0] === 'punto' ? 'media' : 'ninguna',
      fits: ['regular', 'holgado'],
      techniques: id === 'camisa-clasica' ? ['botones', 'bolsillos'] : ['tejido-punto', 'dobladillo'],
      status: 'pendiente',
      flat: { family: 'top', top: { ...top } },
      description: `${description} Pendiente: requiere el bloque de torso y manga.`,
      variants: [],
      recommendedFabrics: fabrics[0] === 'punto' ? ['Jersey de algodón', 'Punto con elastano'] : ['Popelina', 'Oxford', 'Batista'],
      materials: id === 'camisa-clasica' ? ['Botones', 'Entretela', 'Hilo'] : ['Rib para cuello', 'Hilo']
    })
  ),
  // ---------- Abrigo
  ...(
    [
      ['sudadera', 'Sudadera', { type: 'sudadera', sleeve: 'larga', neck: 'redondo', closure: 'ninguno', length: 680, cuffs: true }, 'Con puños y pretina de rib.'],
      ['hoodie', 'Sudadera con capucha', { type: 'hoodie', sleeve: 'larga', neck: 'capucha', closure: 'ninguno', length: 700, cuffs: true, pocket: 'canguro' }, 'Capucha de tres piezas y bolsillo canguro.'],
      ['chaleco', 'Chaleco', { type: 'chaleco', sleeve: 'sin', neck: 'v', closure: 'botones', length: 600 }, 'Chaleco forrado con botones.'],
      ['chaqueta-cierre', 'Chaqueta con cierre', { type: 'chaqueta', sleeve: 'larga', neck: 'alto', closure: 'cierre', length: 680, cuffs: true, pocket: 'parche' }, 'Chaqueta con cuello alto y cierre separable.'],
      ['abrigo', 'Abrigo con solapas', { type: 'abrigo', sleeve: 'larga', neck: 'solapa', closure: 'botones', length: 980, pocket: 'parche' }, 'Abrigo forrado con solapas y botones.']
    ] as const
  ).map(
    ([id, name, top, description]): CatalogModel => ({
      id,
      name,
      type: 'abrigo',
      sub: name,
      recipients: ['toddler', 'infantil', 'mujer', 'hombre', 'unisex'],
      difficulty: id === 'abrigo' ? 3 : 2,
      fabrics: id === 'sudadera' || id === 'hoodie' ? ['punto'] : ['plano'],
      stretch: id === 'sudadera' || id === 'hoodie' ? 'baja' : 'ninguna',
      fits: ['regular', 'holgado', 'oversize'],
      techniques: id === 'abrigo' || id === 'chaleco' ? ['forro', 'botones'] : ['puno', 'cierre'],
      status: 'pendiente',
      flat: { family: 'top', top: { ...top } },
      description: `${description} Pendiente: requiere el bloque de torso y manga.`,
      variants: [],
      recommendedFabrics: id === 'sudadera' || id === 'hoodie' ? ['Felpa', 'French terry'] : ['Paño', 'Gabardina', 'Lona ligera'],
      materials: ['Hilo', ...(id === 'chaqueta-cierre' ? ['Cierre separable'] : []), ...(id === 'abrigo' || id === 'chaleco' ? ['Botones', 'Forro', 'Entretela'] : ['Rib'])]
    })
  ),
  {
    id: 'pijama-camisa',
    name: 'Camisa de pijama',
    type: 'pijamas',
    sub: 'Pijama',
    recipients: ['infantil', 'mujer', 'hombre', 'unisex'],
    difficulty: 2,
    fabrics: ['plano'],
    stretch: 'ninguna',
    fits: ['holgado'],
    techniques: ['botones', 'bolsillos'],
    status: 'pendiente',
    flat: { family: 'top', top: { type: 'pijama', sleeve: 'larga', neck: 'camisa', closure: 'botones', length: 720, pocket: 'pecho' } },
    description: 'Camisa holgada con cuello solapa y bolsillo. Pendiente: requiere el bloque de torso.',
    variants: [],
    recommendedFabrics: ['Franela', 'Popelina'],
    materials: ['Botones', 'Hilo']
  },
  // ---------- Bebé
  {
    id: 'body-bebe',
    name: 'Body de bebé',
    type: 'bebe',
    sub: 'Bodies',
    recipients: ['bebe'],
    difficulty: 2,
    fabrics: ['punto'],
    stretch: 'media',
    fits: ['regular'],
    techniques: ['tejido-punto'],
    status: 'pendiente',
    flat: { family: 'bebe', baby: { legs: 'body', sleeve: 'corta' } },
    description: 'Body con broches en la entrepierna y hombros envolventes para pasar la cabeza. Pendiente.',
    variants: [],
    recommendedFabrics: ['Punto interlock', 'Jersey de algodón'],
    materials: ['Broches de presión', 'Rib']
  },
  {
    id: 'mameluco',
    name: 'Mameluco',
    type: 'bebe',
    sub: 'Mamelucos',
    recipients: ['bebe', 'toddler'],
    difficulty: 3,
    fabrics: ['punto'],
    stretch: 'media',
    fits: ['regular'],
    techniques: ['tejido-punto', 'botones'],
    status: 'pendiente',
    flat: { family: 'bebe', baby: { legs: 'mameluco', sleeve: 'larga' } },
    description: 'Prenda entera con apertura frontal y en las piernas para cambiar el pañal. Pendiente.',
    variants: [],
    recommendedFabrics: ['Punto interlock', 'Felpa ligera'],
    materials: ['Broches de presión']
  },
  {
    id: 'babero',
    name: 'Babero',
    type: 'bebe',
    sub: 'Accesorios de bebé',
    recipients: ['bebe', 'toddler'],
    difficulty: 1,
    fabrics: ['plano', 'punto'],
    stretch: 'ninguna',
    fits: ['regular'],
    techniques: ['costura-recta', 'aplicacion'],
    status: 'experimental',
    generatorId: 'babero',
    flat: { family: 'accesorio', accessory: 'babero' },
    description: 'Babero con tiras que se abrochan detrás del cuello. El escote se calcula con el contorno de cuello y el traslape del broche.',
    variants: [],
    recommendedFabrics: ['Toalla de rizo', 'Algodón'],
    materials: ['Broche', 'Bies']
  },
  {
    id: 'gorro',
    name: 'Gorro de punto',
    type: 'bebe',
    sub: 'Accesorios de bebé',
    recipients: ['bebe', 'toddler', 'infantil'],
    difficulty: 1,
    fabrics: ['punto'],
    stretch: 'alta',
    fits: ['ajustado'],
    techniques: ['tejido-punto'],
    status: 'experimental',
    generatorId: 'gorro',
    flat: { family: 'accesorio', accessory: 'gorro' },
    description: 'Gorro de dos piezas con doblez, calculado con el contorno de cabeza y holgura negativa para punto elástico.',
    variants: [],
    recommendedFabrics: ['Rib', 'Punto con elastano'],
    materials: ['Hilo para punto']
  },
  // ---------- Bolsos
  {
    id: 'bolsa-tote',
    name: 'Bolsa tote con base en caja',
    type: 'bolsos',
    sub: 'Bolsas',
    recipients: ['unisex'],
    difficulty: 1,
    fabrics: ['plano'],
    stretch: 'ninguna',
    fits: ['regular'],
    techniques: ['costura-recta', 'forro'],
    status: 'implementado',
    generatorId: 'bolsa-tote',
    flat: { family: 'bolso', bag: 'tote' },
    description: 'Ancho, alto, fondo y asas paramétricos. Valida la base en caja y la unión con el forro.',
    variants: [
      { name: 'Sin forro', text: 'Dobladillo en la boca con esquinas en espejo.' },
      { name: 'Con bolsillo', text: 'Pendiente.' }
    ],
    recommendedFabrics: ['Lona', 'Denim', 'Loneta estampada'],
    materials: ['Entretela opcional', 'Hilo resistente']
  },
  {
    id: 'neceser',
    name: 'Neceser con cierre',
    type: 'bolsos',
    sub: 'Estuches',
    recipients: ['unisex'],
    difficulty: 2,
    fabrics: ['plano'],
    stretch: 'ninguna',
    fits: ['regular'],
    techniques: ['cierre', 'forro'],
    status: 'pendiente',
    flat: { family: 'bolso', bag: 'neceser' },
    description: 'Estuche forrado con cierre y base en caja. Pendiente.',
    variants: [],
    recommendedFabrics: ['Lona', 'Tela laminada'],
    materials: ['Cierre de 20 cm', 'Hilo']
  },
  {
    id: 'bandolera',
    name: 'Bolsa bandolera',
    type: 'bolsos',
    sub: 'Bolsas',
    recipients: ['unisex'],
    difficulty: 2,
    fabrics: ['plano'],
    stretch: 'ninguna',
    fits: ['regular'],
    techniques: ['forro', 'botones'],
    status: 'pendiente',
    flat: { family: 'bolso', bag: 'bandolera' },
    description: 'Bolsa con solapa y correa larga. Pendiente.',
    variants: [],
    recommendedFabrics: ['Lona', 'Pana', 'Piel sintética'],
    materials: ['Broche magnético', 'Herrajes']
  },
  {
    id: 'cojin',
    name: 'Funda de cojín con cierre de sobre',
    type: 'bolsos',
    sub: 'Hogar textil',
    recipients: ['unisex'],
    difficulty: 1,
    fabrics: ['plano'],
    stretch: 'ninguna',
    fits: ['regular'],
    techniques: ['costura-recta', 'aplicacion', 'collage'],
    status: 'experimental',
    generatorId: 'cojin-sobre',
    flat: { family: 'accesorio', accessory: 'cojin' },
    description: 'Funda rectangular o cuadrada con frente y dos espaldas superpuestas. Cambia sus medidas, interviene el frente y exporta las tres piezas a escala real.',
    variants: [],
    recommendedFabrics: ['Lona', 'Lino'],
    materials: ['Relleno', 'Hilo']
  },

  // Accesorios con geometría paramétrica real. Falta muestra física antes de promoverlos.
  {
    id: 'funda-cheve', name: 'Funda para cheve, lata o botella', type: 'bolsos', sub: 'Fundas para bebidas', recipients: ['unisex'], difficulty: 1,
    fabrics: ['plano'], stretch: 'ninguna', fits: ['regular'], techniques: ['costura-recta', 'forro', 'aplicacion', 'bordado'], status: 'experimental', generatorId: 'funda-bebida',
    flat: { family: 'accesorio', accessory: 'funda-bebida' }, description: 'Envuelve tu lata con una funda de tela, forro y velcro. Introduce su contorno real y añade iniciales, hongos o un parche. Abierta por debajo.',
    variants: [{ name: 'Cualquier recipiente cilíndrico', text: 'Ajusta contorno, alto y traslape. No se calcula a partir de mililitros.' }], recommendedFabrics: ['Lona', 'Denim', 'Algodón', 'Fieltro'], materials: ['Velcro', 'Hilo']
  },
  {
    id: 'funda-vaso', name: 'Manga para vaso reutilizable', type: 'bolsos', sub: 'Fundas para bebidas', recipients: ['unisex'], difficulty: 1,
    fabrics: ['plano'], stretch: 'ninguna', fits: ['regular'], techniques: ['costura-recta', 'forro', 'aplicacion'], status: 'experimental', generatorId: 'funda-bebida', params: { contorno: 280, alto: 80, traslape: 30 },
    flat: { family: 'accesorio', accessory: 'funda-bebida' }, description: 'Manga corta para personalizar un vaso de paredes casi rectas. Ajuste con velcro; mide el contorno en la zona donde irá. No es protección térmica.',
    variants: [], recommendedFabrics: ['Lona', 'Algodón', 'Fieltro'], materials: ['Velcro', 'Hilo']
  },
  {
    id: 'dona-cabello', name: 'Dona de tela para cabello', type: 'bolsos', sub: 'Cabello y complementos', recipients: ['mujer', 'hombre', 'unisex'], difficulty: 1,
    fabrics: ['plano'], stretch: 'ninguna', fits: ['regular'], techniques: ['costura-recta', 'frunces'], status: 'experimental', generatorId: 'dona-cabello',
    flat: { family: 'accesorio', accessory: 'dona' }, description: 'Aprovecha retazos para una dona o scrunchie. Cambia el ancho del tubo, el frunce y el aro de elástico; el patrón calcula la tela sin duplicar márgenes.',
    variants: [{ name: 'Delgada o voluminosa', text: 'Cambia el ancho del tubo y la proporción de frunce.' }], recommendedFabrics: ['Satén', 'Algodón', 'Viscosa', 'Terciopelo'], materials: ['Elástico de 5–8 mm', 'Hilo']
  },
  {
    id: 'bandana-reversible', name: 'Bandana triangular reversible', type: 'bolsos', sub: 'Pañuelos y complementos', recipients: ['mujer', 'hombre', 'unisex'], difficulty: 1,
    fabrics: ['plano'], stretch: 'ninguna', fits: ['regular'], techniques: ['costura-recta', 'aplicacion', 'bordado'], status: 'experimental', generatorId: 'bandana-reversible',
    flat: { family: 'accesorio', accessory: 'bandana' }, description: 'Dos caras triangulares para combinar telas o bordar. Introduce ancho y profundidad; ajusta el largo para anudar con comodidad.',
    variants: [], recommendedFabrics: ['Popelina', 'Batista', 'Lino', 'Algodón'], materials: ['Hilo']
  },
  {
    id: 'cesta-textil', name: 'Cesta textil para el escritorio', type: 'bolsos', sub: 'Organización y hogar', recipients: ['unisex'], difficulty: 1,
    fabrics: ['plano'], stretch: 'ninguna', fits: ['regular'], techniques: ['costura-recta', 'forro'], status: 'implementado', generatorId: 'bolsa-tote', params: { ancho: 220, alto: 220, fondo: 120, largoAsa: 150, anchoAsa: 20 },
    flat: { family: 'bolso', bag: 'tote' }, description: 'Versión compacta de la tote con base en caja y asas cortas para ordenar hilos, retazos o herramientas. Usa el mismo generador comprobado de la tote.',
    variants: [], recommendedFabrics: ['Lona', 'Loneta estampada', 'Denim'], materials: ['Entretela', 'Hilo resistente']
  },

  ...([
    ['individual-reversible', 'Mantel individual reversible', 450, 320, 'Mesa y cocina'],
    ['posavasos-textil', 'Posavasos textil reversible', 110, 110, 'Mesa y cocina'],
    ['servilleta-reversible', 'Servilleta de dos caras', 350, 350, 'Mesa y cocina'],
    ['marcapaginas-textil', 'Marcapáginas de tela', 50, 200, 'Regalos y lectura'],
    ['tapete-maquina', 'Tapete para la máquina de coser', 600, 400, 'Organización y hogar']
  ] as const).map(([id, name, width, height, sub]): CatalogModel => ({
    id, name, sub, type: 'bolsos', recipients: ['unisex'], difficulty: 1, fabrics: ['plano'], stretch: 'ninguna', fits: ['regular'], techniques: ['costura-recta', 'aplicacion', 'bordado'],
    status: 'experimental', generatorId: 'textil-doble-cara', params: { ancho: width, alto: height, margen: 7 }, flat: { family: 'accesorio', accessory: 'rectangulo', object: { width, height, label: name } },
    description: 'Base rectangular reversible, con dos caras cosidas y medidas editables. Personaliza cada cara con telas, recortes o bordados y exporta su patrón. Sin relleno ni aislamiento térmico.',
    variants: [], recommendedFabrics: ['Algodón', 'Lino', 'Popelina', 'Loneta'], materials: ['Hilo']
  })),
  ...([
    ['delantal-estudio', 'Delantal creativo', 'delantal', 'Cocina y taller', 'Cuerpo, bolsillo, cuello y lazos como zonas independientes. Plantilla para diseñar: todavía no genera las piezas de confección.'],
    ['antifaz-estudio', 'Antifaz para descansar', 'antifaz', 'Viaje y descanso', 'Diseña la cara de un antifaz con colores, bordado o apliques. Plantilla visual: falta el patrón de costura y el elástico.'],
    ['banderin-estudio', 'Banderín para guirnalda', 'banderin', 'Fiestas y regalos', 'Combina letras, figuras y retazos para planear una guirnalda. Plantilla visual: falta la jareta y el patrón de confección.']
  ] as const).map(([id, name, accessory, sub, description]): CatalogModel => ({
    id, name, sub, description, type: 'bolsos', recipients: ['unisex'], difficulty: 1, fabrics: ['plano'], stretch: 'ninguna', fits: ['regular'], techniques: ['aplicacion', 'bordado', 'collage'], status: 'implementado', studioOnly: true,
    flat: { family: 'accesorio', accessory }, variants: [], recommendedFabrics: ['Algodón', 'Lino', 'Denim', 'Fieltro'], materials: ['Hilo', 'Materiales según el acabado']
  })),
  // ---------- Reparación y transformación (flujos del estudio)
  {
    id: 'intervenir-camisa',
    name: 'Intervenir una camisa',
    type: 'reparacion',
    sub: 'Transformación',
    recipients: ['unisex'],
    difficulty: 2,
    fabrics: ['plano'],
    stretch: 'ninguna',
    fits: ['regular'],
    techniques: ['aplicacion', 'collage', 'bordado'],
    status: 'implementado',
    studioOnly: true,
    flat: { family: 'top', top: { type: 'camisa', sleeve: 'larga', neck: 'camisa', closure: 'botones', length: 760, pocket: 'pecho' } },
    description: 'Sube fotos de tu camisa o usa el dibujo técnico, diseña por zonas y obtén recortes, plantillas a escala y guía.',
    variants: [{ name: 'Desde fotos', text: 'Calibra la foto con una medida conocida para trabajar a escala.' }],
    recommendedFabrics: ['Retazos de algodón', 'Lino', 'Denim'],
    materials: ['Entretela termoadhesiva', 'Hilo de bordar', 'Estabilizador']
  },
  {
    id: 'intervenir-pantalon',
    name: 'Intervenir un pantalón',
    type: 'reparacion',
    sub: 'Transformación',
    recipients: ['unisex'],
    difficulty: 2,
    fabrics: ['plano'],
    stretch: 'ninguna',
    fits: ['regular'],
    techniques: ['aplicacion', 'collage', 'remiendo'],
    status: 'implementado',
    studioOnly: true,
    flat: { family: 'pantalon', pants: { leg: 'recto', length: 'largo', waist: 'pretina', pockets: 'laterales' } },
    description: 'Diseña sobre piernas, bolsillos y costados con continuidad entre vistas.',
    variants: [],
    recommendedFabrics: ['Denim', 'Retazos'],
    materials: ['Entretela termoadhesiva', 'Hilo']
  },
  {
    id: 'remiendo-rodilla',
    name: 'Remiendo visible de rodilla',
    type: 'reparacion',
    sub: 'Reparación',
    recipients: ['unisex', 'infantil'],
    difficulty: 1,
    fabrics: ['plano'],
    stretch: 'ninguna',
    fits: ['regular'],
    techniques: ['remiendo', 'aplicacion', 'bordado'],
    status: 'implementado',
    studioOnly: true,
    flat: { family: 'pantalon', pants: { leg: 'recto', length: 'largo', waist: 'pretina' } },
    description: 'Diseña un parche para la rodilla con margen separado del tamaño final y exporta su plantilla.',
    variants: [],
    recommendedFabrics: ['Denim', 'Lona'],
    materials: ['Entretela termoadhesiva', 'Hilo de sashiko']
  },
  {
    id: 'acortar-bajo',
    name: 'Acortar el bajo',
    type: 'reparacion',
    sub: 'Arreglos',
    recipients: ['unisex'],
    difficulty: 1,
    fabrics: ['plano', 'punto'],
    stretch: 'ninguna',
    fits: ['regular'],
    techniques: ['dobladillo'],
    status: 'pendiente',
    flat: { family: 'pantalon', pants: { leg: 'recto', length: 'tobillo', waist: 'pretina' } },
    description: 'Guía para medir y rehacer el dobladillo. Pendiente.',
    variants: [],
    recommendedFabrics: [],
    materials: ['Hilo']
  },
  // ---------- Aplicaciones
  {
    id: 'parche-personalizado',
    name: 'Parche personalizado',
    type: 'aplicaciones',
    sub: 'Parches',
    recipients: ['unisex'],
    difficulty: 1,
    fabrics: ['plano'],
    stretch: 'ninguna',
    fits: ['regular'],
    techniques: ['aplicacion', 'bordado', 'collage'],
    status: 'implementado',
    studioOnly: true,
    flat: { family: 'accesorio', accessory: 'parche' },
    description: 'Diseña un parche por separado, distribuye retazos sobre la base y añade el dibujo de bordado. Exporta plantillas acomodadas en carta.',
    variants: [{ name: 'Redondo, ovalado, escudo o rectangular', text: 'Elige la base al crear la vista de parche.' }],
    recommendedFabrics: ['Retazos de algodón', 'Fieltro', 'Lona'],
    materials: ['Estabilizador', 'Entretela termoadhesiva', 'Hilo de bordar']
  },
  {
    id: 'collage-montanas',
    name: 'Collage de montañas y hongos',
    type: 'aplicaciones',
    sub: 'Collage textil',
    recipients: ['unisex', 'infantil'],
    difficulty: 2,
    fabrics: ['plano'],
    stretch: 'ninguna',
    fits: ['regular'],
    techniques: ['collage', 'aplicacion', 'bordado'],
    status: 'implementado',
    studioOnly: true,
    flat: { family: 'top', top: { type: 'camisa', sleeve: 'larga', neck: 'camisa', closure: 'botones', length: 760 } },
    description: 'Figuras orgánicas listas para rellenar con tus telas, con orden de superposición y recortes con margen.',
    variants: [],
    recommendedFabrics: ['Retazos de algodón', 'Lino', 'Pana fina'],
    materials: ['Entretela termoadhesiva', 'Hilo']
  },
  ...EXPANDED_CATALOG,
  ...COLLECTION_CATALOG,
  ...COSTUME_CATALOG
];
const ACCESSORY_IDS=new Set(['cojin','funda-cheve','funda-vaso','dona-cabello','bandana-reversible','individual-reversible','posavasos-textil','servilleta-reversible','marcapaginas-textil','tapete-maquina','delantal-estudio','antifaz-estudio','banderin-estudio']);
const UPGRADED_ACCESSORY:Record<string,string>={'delantal-estudio':'delantal-peto','antifaz-estudio':'antifaz-forrado','banderin-estudio':'banderin-jareta'};
export const CATALOG:CatalogModel[]=BASE_CATALOG.map(m=>{
  const gen=UPGRADED_ACCESSORY[m.id];
  return withCatalogTaxonomy(withDesignGroup({...m,type:ACCESSORY_IDS.has(m.id)?'accesorios':m.type,...(gen?{generatorId:gen,status:'experimental' as const,studioOnly:false,description:'Plantilla de diseño y patrón paramétrico con medidas editables del objeto, márgenes y pasos de confección. Nueva construcción experimental: prueba una muestra.'}:{})}));
});

export function findModel(id: string) {
  return CATALOG.find((m) => m.id === id);
}
