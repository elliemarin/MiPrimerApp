import type { CatalogModel, Recipient } from './catalog';
import type { FlatSpec, TopOpts } from './flats';

/* Diseños infantiles y de bebé digitalizados a partir de fotos de referencia
 * que envió la usuaria (2026-11-01). No se copiaron imágenes, marcas ni
 * medidas: cada diseño se reconstruyó como patrón paramétrico desde las
 * medidas de la talla, conservando su construcción. Todo es experimental. */

const KIDS = 'Infantil', BABY = 'Bebé', GIRLS = 'Niña';
const kids: Recipient[] = ['bebe', 'toddler', 'infantil'];
const babies: Recipient[] = ['bebe', 'toddler'];
const top = (o: TopOpts): FlatSpec => ({ family: 'top', top: o });
const model = (m: Omit<CatalogModel, 'status' | 'variants'> & { variants?: CatalogModel['variants'] }): CatalogModel => ({ status: 'experimental', variants: [], ...m });
const appliques = 'Los apliques (nubes, flores, cerezas) se añaden en Bordados sobre las piezas abiertas.';

export const DIGITIZED_KIDS_CATALOG: CatalogModel[] = [
  // ---------------------------------------------------------- Abrigos
  model({ id: 'chaleco-borrego', name: 'Chaleco de borreguito con lazo', type: 'abrigo', sub: 'Chalecos infantiles', recipients: kids, difficulty: 2, fabrics: ['punto', 'plano'], stretch: 'ninguna', fits: ['regular'], techniques: ['costura-recta', 'forro', 'botones'],
    generatorId: 'chaleco-infantil', params: { escote: 'pico', acabado: 'forro', cierre: 'broches', lazo: 'si' }, flat: top({ type: 'chaleco', sleeve: 'sin', neck: 'v', closure: 'botones', length: 560, fit: 1.05, plainHem: true }),
    description: `Chaleco forrado de escote en pico con broches y lazo decorativo cosido fijo. ${appliques}`, recommendedFabrics: ['Borreguito (sherpa)', 'Polar', 'Pana'], materials: ['Forro de algodón', 'Broches de presión', 'Retazo para el lazo'],
    collection: KIDS, searchTerms: ['chaleco', 'borrego', 'borreguito', 'sherpa', 'peluche', 'lazo', 'cerezas', 'infantil'], designGroup: { id: 'tipo-chaleco-infantil', name: 'Chaleco infantil de borreguito', preferred: true } }),
  model({ id: 'chaleco-ribeteado', name: 'Chaleco ribeteado de cuello redondo', type: 'abrigo', sub: 'Chalecos infantiles', recipients: kids, difficulty: 1, fabrics: ['punto', 'plano'], stretch: 'ninguna', fits: ['regular'], techniques: ['costura-recta'],
    generatorId: 'chaleco-infantil', params: { escote: 'redondo', acabado: 'ribete', cierre: 'abierto', lazo: 'no' }, flat: top({ type: 'chaleco', sleeve: 'sin', neck: 'redondo', closure: 'ninguno', length: 560, fit: 1.05, plainHem: true }),
    description: 'Chaleco abierto sin forro, con todos los cantos ribeteados al bies.', recommendedFabrics: ['Polar', 'Borreguito', 'Fieltro de lana'], materials: ['Bies'],
    collection: KIDS, searchTerms: ['chaleco', 'ribete', 'abierto', 'infantil'], designGroup: { id: 'tipo-chaleco-infantil', name: 'Chaleco infantil de borreguito' } }),
  model({ id: 'chaqueta-polar-cierre', name: 'Chaqueta polar con cuello alto y cierre', type: 'abrigo', sub: 'Chaquetas infantiles', recipients: kids, difficulty: 2, fabrics: ['punto'], stretch: 'baja', fits: ['holgado'], techniques: ['costura-recta', 'cierre', 'puno'],
    generatorId: 'chaqueta-cierre-infantil', params: {}, flat: top({ type: 'chaqueta', sleeve: 'larga', neck: 'alto', closure: 'cierre', length: 600, cuffs: true, hemBand: true, fit: 1.15 }),
    description: `Chaqueta holgada de borreguito o polar con cuello alto, cierre separable, banda en el bajo y puños fruncidos. ${appliques}`, recommendedFabrics: ['Borreguito', 'Polar', 'Felpa gruesa'], materials: ['Cierre separable', 'Retazo de algodón para la tapa del cierre'],
    collection: KIDS, searchTerms: ['chaqueta', 'chamarra', 'polar', 'borrego', 'sherpa', 'cierre', 'cremallera', 'nubes', 'flores', 'cuello alto'], designGroup: { id: 'chaqueta-polar-infantil', name: 'Chaqueta polar con cuello alto', preferred: true } }),
  model({ id: 'chaqueta-acolchada-reversible', name: 'Chaqueta acolchada reversible', type: 'abrigo', sub: 'Chaquetas infantiles', recipients: kids, difficulty: 2, fabrics: ['plano'], stretch: 'ninguna', fits: ['regular'], techniques: ['costura-recta', 'bolsillos', 'botones'],
    generatorId: 'chaqueta-acolchada-infantil', params: { bolsillos: 'si' }, flat: top({ style: 'acolchada', type: 'chaqueta', sleeve: 'larga', neck: 'redondo', closure: 'botones', length: 620, pocket: 'parche', plainHem: true, fit: 1.08 }),
    description: 'Chaqueta de cuello redondo en tela acolchada con ribete en contraste, bolsillos de parche, broches y puño vuelto que muestra el reverso.', recommendedFabrics: ['Algodón acolchado', 'Terciopelo acolchado', 'Popelina con guata'], materials: ['Bies en contraste', 'Broches de presión'],
    collection: KIDS, searchTerms: ['acolchada', 'acolchado', 'quilted', 'reversible', 'ribete', 'chaqueta', 'chamarra'], designGroup: { id: 'chaqueta-acolchada-infantil', name: 'Chaqueta acolchada reversible', preferred: true } }),
  model({ id: 'chaqueta-capucha-botones', name: 'Chaqueta con capucha forrada y botones', type: 'abrigo', sub: 'Chaquetas infantiles', recipients: kids, difficulty: 3, fabrics: ['plano'], stretch: 'ninguna', fits: ['regular'], techniques: ['costura-recta', 'forro', 'botones', 'bolsillos'],
    generatorId: 'chaqueta-capucha-infantil', params: { bolsillos: 'si' }, flat: top({ type: 'chaqueta', sleeve: 'larga', neck: 'capucha', closure: 'botones', length: 640, pocket: 'parche', plainHem: true, fit: 1.1 }),
    description: 'Chaqueta abotonada con capucha forrada, bolsillos de parche y vistas en contraste que asoman en puños y bajo. Combina colores por pieza en Telas y colores.', recommendedFabrics: ['Paño ligero', 'Pana', 'Lona suave'], materials: ['Vichy para forro y vistas', 'Botones', 'Entretela'],
    collection: KIDS, searchTerms: ['chaqueta', 'capucha', 'botones', 'forrada', 'vichy', 'combinada', 'abrigo'], designGroup: { id: 'chaqueta-capucha-infantil', name: 'Chaqueta con capucha forrada', preferred: true } }),
  model({ id: 'sudadera-canguro-infantil', name: 'Sudadera con capucha y bolsillo canguro', type: 'superiores', sub: 'Sudaderas infantiles', recipients: kids, difficulty: 2, fabrics: ['punto'], stretch: 'media', fits: ['regular'], techniques: ['tejido-punto', 'puno', 'bolsillos'],
    generatorId: 'sudadera-canguro-infantil', params: { bolsillo: 'si' }, flat: top({ type: 'hoodie', sleeve: 'larga', neck: 'capucha', closure: 'ninguno', length: 640, pocket: 'canguro', cuffs: true, hemBand: true, fit: 1.08 }),
    description: 'Sudadera de manga montada con capucha sin cordón, bolsillo canguro y banda y puños de rib. El escote se calcula para pasar la cabeza.', recommendedFabrics: ['Felpa', 'Sudadera perchada', 'Borreguito fino'], materials: ['Rib', 'Hilo para punto'],
    collection: KIDS, searchTerms: ['sudadera', 'hoodie', 'capucha', 'canguro', 'bebe', 'infantil'], designGroup: { id: 'sudadera-canguro-infantil', name: 'Sudadera infantil con bolsillo canguro', preferred: true } }),

  // ---------------------------------------------------------- Blusas, vestido y pantalones
  model({ id: 'blusa-campesina', name: 'Blusa campesina de manga abullonada', type: 'superiores', sub: 'Blusas infantiles', recipients: kids, difficulty: 2, fabrics: ['plano'], stretch: 'ninguna', fits: ['holgado'], techniques: ['costura-recta', 'jareta', 'frunces'],
    generatorId: 'blusa-campesina-infantil', params: { manga: 'corta', volante: 'si' }, flat: { family: 'top', kids: 'blusa-campesina' },
    description: 'Blusa ranglan con escote elástico, mangas abullonadas y volante en el bajo.', recommendedFabrics: ['Vichy', 'Popelina', 'Batista'], materials: ['Elástico de 6 mm'],
    collection: GIRLS, searchTerms: ['blusa', 'campesina', 'abullonada', 'vichy', 'volante', 'elastico'], designGroup: { id: 'tipo-blusa-campesina', name: 'Blusa campesina infantil', preferred: true } }),
  model({ id: 'blusa-campesina-larga', name: 'Blusa campesina de manga larga', type: 'superiores', sub: 'Blusas infantiles', recipients: kids, difficulty: 2, fabrics: ['plano'], stretch: 'ninguna', fits: ['holgado'], techniques: ['costura-recta', 'jareta', 'frunces'],
    generatorId: 'blusa-campesina-infantil', params: { manga: 'larga', volante: 'si' }, flat: { family: 'top', kids: 'blusa-campesina-larga' },
    description: 'La misma blusa ranglan con manga larga y puño elástico.', recommendedFabrics: ['Batista', 'Lino ligero'], materials: ['Elástico de 6 mm'],
    collection: GIRLS, searchTerms: ['blusa', 'campesina', 'manga larga'], designGroup: { id: 'tipo-blusa-campesina', name: 'Blusa campesina infantil' } }),
  model({ id: 'blusa-botones-infantil', name: 'Blusa sin mangas con botones', type: 'superiores', sub: 'Blusas infantiles', recipients: kids, difficulty: 2, fabrics: ['plano'], stretch: 'ninguna', fits: ['regular'], techniques: ['costura-recta', 'botones', 'dobladillo'],
    generatorId: 'blusa-botones-infantil', params: {}, flat: { family: 'top', kids: 'blusa-botones' },
    description: 'Blusa recta sin mangas abotonada delante, con escote y sisas ribeteados. Un aplique (por ejemplo, un panda) se añade en Bordados.', recommendedFabrics: ['Seersucker de rayas', 'Popelina', 'Lino'], materials: ['Botones', 'Bies', 'Entretela'],
    collection: KIDS, searchTerms: ['blusa', 'botones', 'sin mangas', 'rayas', 'seersucker', 'panda'], designGroup: { id: 'blusa-botones-infantil', name: 'Blusa infantil con botones', preferred: true } }),
  model({ id: 'pantalon-bombacho-infantil', name: 'Pantalón bombacho con elástico en el bajo', type: 'inferiores', sub: 'Pantalones infantiles', recipients: kids, difficulty: 1, fabrics: ['plano', 'punto'], stretch: 'ninguna', fits: ['holgado'], techniques: ['costura-recta', 'jareta'],
    generatorId: 'pantalon-cintura-elastica', params: { estilo: 'bombacho' }, flat: { family: 'pantalon', pants: { leg: 'jogger', length: 'largo', waist: 'elastica', pockets: 'ninguno' } },
    description: 'Pantalón holgado con cintura elástica y jareta con elástico en el bajo; admite un volantito bajo el elástico.', recommendedFabrics: ['Seersucker', 'Lino', 'Muselina', 'Punto ligero'], materials: ['Elástico de cintura', 'Elástico de 6 mm para los bajos'],
    collection: KIDS, searchTerms: ['bombacho', 'pantalon', 'elastico', 'rayas', 'globo', 'harem'], designGroup: { id: 'pantalon-bombacho-infantil', name: 'Pantalón bombacho infantil', preferred: true } }),
  model({ id: 'barrel-infantil', name: 'Pantalón barrel infantil con bolsillos delanteros', type: 'inferiores', sub: 'Pantalones infantiles', recipients: ['toddler', 'infantil'], difficulty: 2, fabrics: ['plano'], stretch: 'ninguna', fits: ['holgado'], techniques: ['costura-recta', 'jareta', 'bolsillos'],
    generatorId: 'pantalon-mezclilla', params: { silueta: 'barrel', cintura: 'elastica', bolsillos: 'frontales', tiro: 'alto' }, flat: { family: 'pantalon', pants: { leg: 'barrel', length: 'largo', waist: 'elastica', pockets: 'parche' } },
    description: 'Barrel de 2 a 10 años con cintura elástica, bolsillos delanteros de parche con boca inclinada y bolsillos traseros.', recommendedFabrics: ['Lino', 'Sarga', 'Pana fina', 'Mezclilla suave'], materials: ['Elástico'],
    collection: KIDS, searchTerms: ['barrel', 'barril', 'pantalon infantil', 'bolsillos'], designGroup: { id: 'pantalon-barrel', name: 'Pantalón barrel' } }),
  model({ id: 'vestido-jareta', name: 'Vestido con jaretas y tirantes de ribete', type: 'faldas-vestidos', sub: 'Vestidos infantiles', recipients: kids, difficulty: 1, fabrics: ['plano'], stretch: 'ninguna', fits: ['holgado'], techniques: ['costura-recta', 'jareta', 'dobladillo'],
    generatorId: 'vestido-jareta-infantil', params: { lazo: 'si' }, flat: { family: 'vestido', kids: 'vestido-jareta' },
    description: 'Vestido trapecio con canto superior elástico, tirantes que continúan el ribete de la sisa (sin cintas para atar) y lazo decorativo.', recommendedFabrics: ['Algodón estampado', 'Batista', 'Lino ligero'], materials: ['Elástico', 'Bies', 'Retazo para el lazo'],
    collection: GIRLS, searchTerms: ['vestido', 'jareta', 'tirantes', 'funda de almohada', 'lazo', 'verano'], designGroup: { id: 'vestido-jareta-infantil', name: 'Vestido con jaretas', preferred: true } }),

  // ---------------------------------------------------------- Bebé
  model({ id: 'pelele-volantes', name: 'Pelele de volantes con broches', type: 'monos', sub: 'Peleles de bebé', recipients: babies, difficulty: 3, fabrics: ['plano'], stretch: 'ninguna', fits: ['holgado'], techniques: ['costura-recta', 'frunces', 'jareta', 'botones'],
    generatorId: 'pelele-volantes', params: { tirantes: 'si' }, flat: { family: 'bebe', kids: 'pelele-volantes' },
    description: 'Pelele con mangas de volante, short abullonado con elástico, broches en la entrepierna y en la espalda, y tirantes decorativos con lazos cosidos.', recommendedFabrics: ['Pana fina', 'Lino', 'Algodón'], materials: ['Elástico de 6 mm', 'Cinta de broches', 'Bies'],
    collection: BABY, searchTerms: ['pelele', 'romper', 'volantes', 'ranita', 'lazos', 'broches'], designGroup: { id: 'pelele-volantes', name: 'Pelele de volantes', preferred: true } }),
  model({ id: 'diadema-lazo', name: 'Diadema elástica con lazo', type: 'accesorios', sub: 'Accesorios de bebé', recipients: kids, difficulty: 1, fabrics: ['punto'], stretch: 'alta', fits: ['ajustado'], techniques: ['costura-recta', 'tejido-punto'],
    generatorId: 'diadema-lazo', params: {}, flat: { family: 'accesorio', kids: 'diadema' },
    description: 'Banda de punto al contorno de cabeza con un lazo grande cosido sobre la unión. Úsala con supervisión.', recommendedFabrics: ['Punto de algodón con elastano', 'Rib'], materials: ['Retazo de tela para el lazo'],
    collection: BABY, searchTerms: ['diadema', 'banda', 'lazo', 'cabello', 'bebe'], designGroup: { id: 'diadema-lazo', name: 'Diadema con lazo', preferred: true } }),
  model({ id: 'gorro-duende', name: 'Gorro duende forrado', type: 'accesorios', sub: 'Gorros', recipients: kids, difficulty: 1, fabrics: ['plano', 'punto'], stretch: 'ninguna', fits: ['regular'], techniques: ['costura-recta', 'forro'],
    generatorId: 'gorro-duende', params: { forro: 'si' }, flat: { family: 'accesorio', kids: 'gorro-duende' },
    description: 'Gorro pixie de dos piezas con punta trasera, forrado, y lengüeta con broche bajo la barbilla (sin cintas).', recommendedFabrics: ['Polar', 'Punto grueso', 'Algodón'], materials: ['Broche', 'Pompón opcional'],
    collection: BABY, searchTerms: ['gorro', 'duende', 'pixie', 'elfo', 'punta', 'bebe'], designGroup: { id: 'tipo-gorro-duende', name: 'Gorro duende (pixie)', preferred: true } }),
  model({ id: 'gorro-duende-fieltro', name: 'Gorro duende de fieltro', type: 'accesorios', sub: 'Gorros', recipients: kids, difficulty: 1, fabrics: ['plano'], stretch: 'ninguna', fits: ['regular'], techniques: ['costura-recta', 'bordado'],
    generatorId: 'gorro-duende', params: { forro: 'no' }, flat: { family: 'accesorio', kids: 'gorro-duende-fieltro' },
    description: 'El mismo gorro en fieltro, sin forro, con los cantos rematados a punto de festón.', recommendedFabrics: ['Fieltro de lana', 'Polar'], materials: ['Hilo de bordar', 'Broche'],
    collection: BABY, searchTerms: ['gorro', 'duende', 'fieltro', 'pixie'], designGroup: { id: 'tipo-gorro-duende', name: 'Gorro duende (pixie)' } }),
  ...(['gato', 'oso'] as const).map((ears, i) => model({
    id: `gorro-orejeras-${ears}`, name: `Gorro con orejeras y orejas de ${ears}`, type: 'accesorios', sub: 'Gorros', recipients: kids, difficulty: 2, fabrics: ['punto'], stretch: 'baja', fits: ['regular'], techniques: ['costura-recta', 'forro'],
    generatorId: 'gorro-orejeras', params: { orejas: ears }, flat: { family: 'accesorio', kids: `gorro-orejeras-${ears}` },
    description: `Gorro forrado de dos laterales con orejeras, orejas de ${ears} y lengüeta con broche entre las orejeras (sin cintas).`, recommendedFabrics: ['Polar', 'Punto grueso'], materials: ['Polar fino o algodón para el forro', 'Broche'],
    collection: BABY, searchTerms: ['gorro', 'orejeras', 'aviador', 'orejas', ears, 'polar'], designGroup: { id: 'tipo-gorro-orejeras', name: 'Gorro con orejeras', preferred: i === 0 }
  })),
  model({ id: 'cubrepanal-tirantes', name: 'Cubrepañal con tirantes cruzados', type: 'bebe', sub: 'Cubrepañales', recipients: babies, difficulty: 2, fabrics: ['plano'], stretch: 'ninguna', fits: ['holgado'], techniques: ['costura-recta', 'jareta', 'botones'],
    generatorId: 'cubrepanal-bebe', params: { tirantes: 'cruzados', olanes: 'no', lazo: 'no' }, flat: { family: 'bebe', kids: 'cubrepanal-tirantes' },
    description: 'Bombacho de estilo antiguo con tirantes que se cruzan en la espalda y se abrochan con botones a la cintura; se pueden quitar.', recommendedFabrics: ['Popelina', 'Lino ligero', 'Gasa doble'], materials: ['Botones', 'Elásticos'],
    collection: BABY, searchTerms: ['cubrepanal', 'bombacho', 'bloomer', 'tirantes', 'vintage'], designGroup: { id: 'tipo-cubrepanal', name: 'Cubrepañal / bombacho' } }),
  model({ id: 'sombrero-pescador-lazo', name: 'Sombrero pescador con lazo', type: 'accesorios', sub: 'Gorros', recipients: kids, difficulty: 2, fabrics: ['plano'], stretch: 'ninguna', fits: ['regular'], techniques: ['costura-recta', 'forro'],
    generatorId: 'sombrero-pescador', params: { lazo: 'si', barbiquejo: 'no' }, flat: { family: 'accesorio', kids: 'sombrero-lazo' },
    description: 'Sombrero de copa redonda y ala con caída, con un lazo decorativo cosido a un lado.', recommendedFabrics: ['Algodón estampado', 'Lino'], materials: ['Entretela para el ala'],
    collection: BABY, searchTerms: ['sombrero', 'lazo', 'bucket', 'sol', 'niña'], designGroup: { id: 'sombrero-pescador', name: 'Sombrero tipo pescador · bucket' } }),
  ...([['vestido', 'Conjunto de vestido con jaretas y cubrepañal con olanes'], ['pelele-diadema', 'Conjunto de pelele de volantes y diadema'], ['campesino', 'Conjunto de blusa campesina y short abullonado'], ['rayas', 'Conjunto de blusa con botones y pantalón bombacho']] as const).map(([set, name]) => model({
    id: `conjunto-${set}`, name, type: 'bebe', sub: 'Conjuntos', recipients: babies, difficulty: 2, fabrics: ['plano'], stretch: 'ninguna', fits: ['regular'], techniques: ['costura-recta', 'jareta'],
    generatorId: 'conjunto-bebe', params: { conjunto: set }, flat: { family: 'accesorio', kids: `conjunto-${set}` },
    description: `${name}. Cada prenda conserva su patrón real, sus comprobaciones y sus pasos; todo sale en un solo PDF.`, recommendedFabrics: ['Algodón', 'Vichy', 'Seersucker'], materials: ['Elásticos', 'Broches o botones'],
    collection: BABY, searchTerms: ['conjunto', 'set', 'dos piezas', set], designGroup: { id: 'tipo-conjunto-bebe', name: 'Conjuntos de bebé' }
  })),

  // ---------------------------------------------------------- Segundo lote (2026-11-01)
  ...([['tela', 'bonete-volante', 'Bonete de tres piezas con volante', 'Bonete forrado de dos laterales y pieza central con volante de tela doblado.'], ['doble', 'bonete-volante-doble', 'Bonete con volante doble', 'El mismo bonete con dos volantes superpuestos, como en la versión de dos telas.'], ['encaje', 'bonete-encaje', 'Bonete con puntilla', 'El bonete con puntilla comprada fruncida en el canto de la cara.']] as const).map(([kind, id, name, description], i) => model({
    id, name, type: 'accesorios', sub: 'Gorros', recipients: babies, difficulty: 2, fabrics: ['plano'], stretch: 'ninguna', fits: ['regular'], techniques: ['costura-recta', 'forro', 'frunces'],
    generatorId: 'bonete-volante', params: { volante: kind }, flat: { family: 'accesorio', kids: id === 'bonete-encaje' ? 'bonete-encaje' : id },
    description: `${description} Cierre con lengüeta y broche (sin cintas). Un aplique o adorno (pájaro, bellotas) se añade en Bordados.`, recommendedFabrics: ['Lino', 'Algodón estampado', 'Pana fina'], materials: ['Forro de algodón', 'Broche', ...(kind === 'encaje' ? ['Puntilla'] : [])],
    collection: BABY, searchTerms: ['bonete', 'capota', 'gorro de bebe', 'volante', 'vintage', ...(kind === 'encaje' ? ['puntilla', 'encaje'] : ['tela', ...(kind === 'doble' ? ['doble'] : [])])], designGroup: { id: 'tipo-bonete-volante', name: 'Bonete con volante', preferred: i === 0 }
  })),
  model({ id: 'delantal-pichi', name: 'Delantal pichi con volantes', type: 'accesorios', sub: 'Delantales infantiles', recipients: ['toddler', 'infantil'], difficulty: 2, fabrics: ['plano'], stretch: 'ninguna', fits: ['holgado'], techniques: ['costura-recta', 'frunces', 'bolsillos'],
    generatorId: 'delantal-pichi-infantil', params: { volantes: 'si', bolsillo: 'si' }, flat: { family: 'accesorio', kids: 'delantal-pichi' },
    description: 'Delantal de una sola pieza que pasa por encima de los hombros: escote cuadrado, volantes en hombros y bajo, bolsillo y cintas cortas en la cintura.', recommendedFabrics: ['Lino', 'Algodón grueso', 'Lona ligera'], materials: ['Bies', 'Tela de contraste'],
    collection: KIDS, searchTerms: ['delantal', 'mandil', 'pichi', 'ayudante', 'cocina', 'pintura'], designGroup: { id: 'tipo-delantal-pichi', name: 'Delantal pichi infantil', preferred: true } }),
  model({ id: 'delantal-pichi-liso', name: 'Delantal pichi liso', type: 'accesorios', sub: 'Delantales infantiles', recipients: ['toddler', 'infantil'], difficulty: 1, fabrics: ['plano'], stretch: 'ninguna', fits: ['holgado'], techniques: ['costura-recta'],
    generatorId: 'delantal-pichi-infantil', params: { volantes: 'no', bolsillo: 'no' }, flat: { family: 'accesorio', kids: 'delantal-pichi-liso' },
    description: 'El mismo delantal sin volantes ni bolsillo: una pieza ribeteada y cuatro cintas.', recommendedFabrics: ['Lona', 'Hule de algodón', 'Lino'], materials: ['Bies'],
    collection: KIDS, searchTerms: ['delantal', 'mandil', 'pichi', 'liso'], designGroup: { id: 'tipo-delantal-pichi', name: 'Delantal pichi infantil' } }),
  model({ id: 'mono-pichi-bolsillos', name: 'Mono corto con tirantes y bolsillos', type: 'monos', sub: 'Monos infantiles', recipients: kids, difficulty: 2, fabrics: ['plano'], stretch: 'ninguna', fits: ['holgado'], techniques: ['costura-recta', 'botones', 'bolsillos'],
    generatorId: 'mono-tirantes-infantil', params: { forma: 'pichi', largo: 'corto', bajo: 'dobladillo', bolsillos: 'si' }, flat: { family: 'bebe', kids: 'mono-pichi' },
    description: 'Mono de pierna corta con canto recto, tirantes abotonados (dos posiciones) y bolsillos de parche. En bebé, entrepierna con broches.', recommendedFabrics: ['Lino', 'Algodón-lino', 'Chambray', 'Mezclilla ligera'], materials: ['Botones', 'Bies'],
    collection: KIDS, searchTerms: ['mono', 'romper', 'overol corto', 'jardinera', 'tirantes', 'bolsillos'], designGroup: { id: 'tipo-mono-tirantes', name: 'Mono infantil con tirantes', preferred: true } }),
  model({ id: 'mono-pico-volantes', name: 'Mono de escote en pico con volantes', type: 'monos', sub: 'Monos infantiles', recipients: kids, difficulty: 2, fabrics: ['plano'], stretch: 'ninguna', fits: ['holgado'], techniques: ['costura-recta', 'botones', 'frunces'],
    generatorId: 'mono-tirantes-infantil', params: { forma: 'pico', largo: 'corto', bajo: 'volante', bolsillos: 'no', lazos: 'si' }, flat: { family: 'bebe', kids: 'mono-pico' },
    description: 'Mono de escote en pico con hombros abotonados (en vez de cintas), lazos decorativos cosidos y volante en las piernas.', recommendedFabrics: ['Vichy', 'Seersucker', 'Algodón'], materials: ['Botones', 'Bies'],
    collection: KIDS, searchTerms: ['mono', 'romper', 'pico', 'volantes', 'vichy', 'hombros'], designGroup: { id: 'tipo-mono-tirantes', name: 'Mono infantil con tirantes' } }),
  model({ id: 'peto-infantil-largo', name: 'Peto infantil de pierna larga', type: 'monos', sub: 'Petos infantiles', recipients: kids, difficulty: 2, fabrics: ['plano'], stretch: 'ninguna', fits: ['holgado'], techniques: ['costura-recta', 'botones', 'bolsillos'],
    generatorId: 'mono-tirantes-infantil', params: { forma: 'peto', largo: 'largo', bajo: 'vuelta', bolsillos: 'si' }, flat: { family: 'bebe', kids: 'peto-infantil' },
    description: 'Peto con bolsillo central, tirantes cruzados con botones, aberturas laterales con botón y pierna larga con vuelta.', recommendedFabrics: ['Sarga', 'Pana', 'Mezclilla ligera', 'Gabardina'], materials: ['Botones', 'Bies'],
    collection: KIDS, searchTerms: ['peto', 'overol', 'jardinera', 'dungaree', 'tirantes', 'bolsillo'], designGroup: { id: 'peto-infantil', name: 'Peto infantil con tirantes', preferred: true } }),
  model({ id: 'blusa-trapecio', name: 'Blusa trapecio sin mangas', type: 'superiores', sub: 'Blusas infantiles', recipients: kids, difficulty: 2, fabrics: ['plano'], stretch: 'ninguna', fits: ['holgado'], techniques: ['costura-recta', 'botones', 'dobladillo'],
    generatorId: 'blusa-trapecio-infantil', params: { volanteBajo: 'no' }, flat: { family: 'top', kids: 'blusa-trapecio' },
    description: 'Blusa en trapecio sin mangas con abertura y botón en la espalda; escote y sisas ribeteados.', recommendedFabrics: ['Algodón de rayas', 'Popelina', 'Lino'], materials: ['Botón', 'Bies'],
    collection: KIDS, searchTerms: ['blusa', 'trapecio', 'sin mangas', 'rayas', 'top'], designGroup: { id: 'tipo-blusa-trapecio', name: 'Blusa trapecio infantil', preferred: true } }),
  model({ id: 'blusa-trapecio-volante', name: 'Blusa trapecio con volante', type: 'superiores', sub: 'Blusas infantiles', recipients: kids, difficulty: 2, fabrics: ['plano'], stretch: 'ninguna', fits: ['holgado'], techniques: ['costura-recta', 'botones', 'frunces'],
    generatorId: 'blusa-trapecio-infantil', params: { volanteBajo: 'si' }, flat: { family: 'top', kids: 'blusa-trapecio-volante' },
    description: 'La blusa trapecio con volante fruncido en el bajo.', recommendedFabrics: ['Vichy', 'Algodón', 'Lino'], materials: ['Botón', 'Bies'],
    collection: KIDS, searchTerms: ['blusa', 'trapecio', 'volante', 'peplum', 'vichy'], designGroup: { id: 'tipo-blusa-trapecio', name: 'Blusa trapecio infantil' } }),
  model({ id: 'pantalon-capri-infantil', name: 'Pantalón ancho capri', type: 'inferiores', sub: 'Pantalones infantiles', recipients: kids, difficulty: 1, fabrics: ['plano'], stretch: 'ninguna', fits: ['holgado'], techniques: ['costura-recta', 'jareta', 'dobladillo'],
    generatorId: 'pantalon-cintura-elastica', params: { estilo: 'ancho', corte: 'capri' }, flat: { family: 'pantalon', pants: { leg: 'ancho', length: 'capri', waist: 'elastica', pockets: 'ninguno' } },
    description: 'Pantalón ancho de cintura elástica cortado a media pierna; el largo se calcula con la entrepierna de la talla.', recommendedFabrics: ['Vichy', 'Lino', 'Algodón'], materials: ['Elástico'],
    collection: KIDS, searchTerms: ['culotte', 'capri', 'pantalon ancho', 'pescador', 'vichy'], designGroup: { id: 'pantalon-capri-infantil', name: 'Pantalón ancho capri infantil', preferred: true } }),
  ...([['trapecio', 'Conjunto de blusa trapecio y cubrepañal'], ['vichy', 'Conjunto de blusa con volante y pantalón ancho capri']] as const).map(([set, name]) => model({
    id: `conjunto-${set}`, name, type: 'bebe', sub: 'Conjuntos', recipients: babies, difficulty: 2, fabrics: ['plano'], stretch: 'ninguna', fits: ['regular'], techniques: ['costura-recta', 'jareta', 'botones'],
    generatorId: 'conjunto-bebe', params: { conjunto: set }, flat: { family: 'accesorio', kids: `conjunto-${set}` },
    description: `${name}. Cada prenda conserva su patrón real, sus comprobaciones y sus pasos; todo sale en un solo PDF.`, recommendedFabrics: ['Algodón de rayas', 'Vichy', 'Lino'], materials: ['Elásticos', 'Botón', 'Bies'],
    collection: BABY, searchTerms: ['conjunto', 'set', 'dos piezas', set], designGroup: { id: 'tipo-conjunto-bebe', name: 'Conjuntos de bebé' }
  }))
];
