import type { CatalogModel, Recipient } from './catalog';
import type { FlatSpec } from './flats';
import type { Params } from '../lib/pattern/generator';

const people: Recipient[] = ['infantil', 'mujer', 'hombre', 'unisex'];
const cm = (mm: number) => `${mm / 10} cm`;
function model(id: string, name: string, group: string, groupName: string, generatorId: string, params: Params, flat: FlatSpec, description: string, variantLabel: string, extras: Partial<CatalogModel> = {}): CatalogModel {
  return { id, name, collection: 'Disfraces', sub: 'Disfraces y personajes', type: 'accesorios', recipients: people,
    difficulty: 2, fabrics: ['plano'], stretch: 'ninguna', fits: ['regular'], techniques: ['costura-recta', 'forro', 'aplicacion', 'bordado'], status: 'experimental',
    generatorId, params, flat, description, variantLabel, designGroup: { id: `tipo-disfraz-${group}`, name: groupName },
    recommendedFabrics: ['Algodón de tejido plano', 'Popelina', 'Sarga ligera'], materials: ['Tela exterior', 'Tela de reverso', 'Hilo'],
    variants: [{ name: 'Personaliza el personaje', text: 'Elige las medidas, aplica telas a cada pieza y añade bordados en Acabados. La ficha de confección incluye las piezas y los pasos reales de esta base.' }],
    searchTerms: ['disfraz', 'disfraces', 'cosplay', 'carnaval', 'halloween', 'teatro', 'fantasia'], ...extras };
}

const capes = ([[300, 450, 'corta'], [360, 700, 'media'], [420, 1000, 'larga']] as const).map(([neck, long, size]) => model(
  `disfraz-capa-${size}`, `Capa semicircular reversible · ${cm(long)}`, 'capa', 'Capa semicircular de aventura', 'capa-semicircular',
  { contornoCuello: neck, holguraCuello: 40, largo: long, margen: 10 },
  { family: 'top', top: { type: 'chaqueta', style: 'capa', sleeve: 'sin', neck: 'redondo', closure: 'botones', length: long + (neck + 40) / Math.PI, fit: 1.2, pocket: 'ninguno' } },
  'Capa abierta y reversible para aventuras, vampiros o personajes de fantasía. Se cose con dos cuartos exteriores y dos de reverso; tiene costura central de espalda y cierre frontal, sin capucha.',
  `Cuello real ${cm(neck)} + 4 cm de holgura; largo desde escote ${cm(long)}`,
  { type: 'abrigo', fits: ['holgado'], designGroup: { id: 'tipo-disfraz-capa', name: 'Capa semicircular de aventura', preferred: size === 'media' }, recommendedFabrics: ['Popelina', 'Sarga ligera', 'Satén estable con reverso de algodón'], materials: ['Tela exterior', 'Tela de reverso', 'Broche o velcro suave', 'Hilo'], searchTerms: ['disfraces', 'capa', 'aventura', 'vampiro', 'mago', 'hechicera', 'superheroe', 'cosplay', 'teatro'] }
));
const crowns = [480, 540, 600].flatMap(head => ['5', '7'].map(peaks => model(
  `disfraz-corona-${head}-${peaks}`, `Corona textil · ${cm(head)}, ${peaks} puntas`, 'corona', 'Corona textil de puntas', 'corona-textil',
  { contornoCabeza: head, holgura: 10, traslape: 35, altoBanda: 45, altoPuntas: 55, puntas: peaks, margen: 5 },
  { family: 'accesorio', accessory: 'corona', object: { width: head / 2, height: 100, label: 'Corona textil', detailCount: Number(peaks) } },
  'Corona de dos caras, con refuerzo y cierre de velcro. Sus cinco o siete puntas se trazan como parte de la misma pieza; sirve para personajes reales, cuentos, cumpleaños o teatro.',
  `Cabeza real ${cm(head)} + 1 cm de holgura; ${peaks} puntas y traslape de 3,5 cm`,
  { designGroup: { id: 'tipo-disfraz-corona', name: 'Corona textil de puntas', preferred: head === 540 && peaks === '5' }, materials: ['Tela exterior', 'Tela de reverso', 'Entretela firme', 'Velcro suave de 20 mm', 'Hilo'], searchTerms: ['disfraces', 'corona', 'reina', 'rey', 'princesa', 'principe', 'cumpleanos', 'cosplay', 'teatro'] }
)));
const hats = ([[480, 240, 65], [540, 330, 85], [600, 420, 110]] as const).map(([head, height, brim]) => model(
  `disfraz-sombrero-${head}`, `Sombrero de mago · cabeza ${cm(head)}, alto ${cm(height)}`, 'sombrero', 'Sombrero cónico de mago', 'sombrero-mago',
  { contornoCabeza: head, holgura: 10, alto: height, anchoAla: brim, margen: 7 },
  { family: 'accesorio', accessory: 'sombrero-mago', object: { width: (head + 10) / Math.PI + 2 * brim, height: height + brim * .18, label: 'Sombrero cónico con ala' } },
  'Sombrero cónico de tela para magos o brujas, con ala plana, forro y entretela. El desarrollo del cono coincide con el contorno del ala; las dos medias alas forman una abertura central real al coserse.',
  `Cabeza real ${cm(head)} + 1 cm de holgura; cono de ${cm(height)} y ala de ${cm(brim)}`,
  { difficulty: 3, designGroup: { id: 'tipo-disfraz-sombrero', name: 'Sombrero cónico de mago', preferred: head === 540 }, recommendedFabrics: ['Sarga ligera', 'Popelina con entretela firme', 'Algodón estable para el forro'], materials: ['Tela exterior', 'Forro', 'Entretela firme', 'Hilo'], searchTerms: ['disfraces', 'sombrero', 'mago', 'bruja', 'hechicero', 'fantasia', 'cosplay', 'halloween'] }
));
const ears = ([[70, 85], [95, 115], [120, 160]] as const).map(([w, h]) => model(
  `disfraz-orejas-${w}`, `Orejas para diadema · ${cm(w)} × ${cm(h)}`, 'orejas', 'Orejas textiles de personaje', 'orejas-diadema',
  { ancho: w, alto: h, margen: 5 },
  { family: 'accesorio', accessory: 'orejas', object: { width: w * 2 + 45, height: h + 30, label: 'Par de orejas textiles' } },
  'Par de orejas triangulares curvas para crear personajes de gato, zorro o criaturas imaginarias. Incluye cuatro caras de tela y dos refuerzos; se cosen sobre una diadema forrada comprada, que no forma parte del patrón.',
  `Cada oreja terminada mide ${cm(w)} de base y ${cm(h)} de alto; diadema comprada aparte`,
  { difficulty: 1, designGroup: { id: 'tipo-disfraz-orejas', name: 'Orejas textiles de personaje', preferred: w === 95 }, recommendedFabrics: ['Algodón', 'Popelina', 'Pana muy fina con entretela'], materials: ['Tela del frente', 'Tela de reverso', 'Entretela o fieltro fino', 'Diadema forrada que admita costura a mano', 'Hilo'], searchTerms: ['disfraces', 'orejas', 'diadema', 'gato', 'zorro', 'personaje', 'cosplay', 'carnaval'] }
));

/** Four constructions; dimensions stay inside their shared design cards. */
export const COSTUME_CATALOG: CatalogModel[] = [...capes, ...crowns, ...hats, ...ears];
