import type { PlushCard } from './toys';

/* Bolsilleros: organizadores colgantes de tela (en francés «porte-objets» o
 * «vide-poches mural», en alemán «Utensilo», en inglés «wall pocket organizer»).
 * Cada tarjeta es una receta de src/lib/pattern/generators/organizers.ts, hecha
 * a partir de 9 fotos de la usuaria (2026-11-08) como diseño propio: se toma la
 * forma de construir, no las telas, los dibujos ni las marcas. */

export const ORGANIZER_CATEGORY_LABEL = { animales: 'Animales', naturaleza: 'Flores y plantas', bebe: 'Cuna y juego', escritorio: 'Escritorio' } as const;
export type OrganizerCategory = keyof typeof ORGANIZER_CATEGORY_LABEL;
export type OrganizerCard = PlushCard<OrganizerCategory>;

const NAMES = ['bolsillero', 'organizador de pared', 'organizador colgante', 'utensilo', 'porte-objets', 'vide-poches', 'wall pocket'];
const card = (c: OrganizerCard): OrganizerCard => ({ ...c, tags: [...c.tags, ...NAMES] });
export const ORGANIZER_CARDS: OrganizerCard[] = [
  card({ id: 'gato', name: 'Gato con dos bolsillos', category: 'animales', generatorId: 'bolsillero-gato', params: {},
    description: 'Gato de pared de 70 cm con orejas, dos bolsillos forrados, cara bordada y cola rellena que asoma por abajo. Se cuelga de dos presillas en las orejas.', tags: ['gato', 'pared', 'lino', 'cola'],
    colors: { piel: '#d9c6a8', ropa: '#d9c6a8', contraste: '#efe4d0', detalle: '#3b2a1a', ropa2: '#c9b18e' }, reference: 'Organizador gato de lino con dos bolsillos y remaches' }),
  card({ id: 'koala', name: 'Koala', category: 'animales', generatorId: 'bolsillero-koala', params: {},
    description: 'Koala de cabeza redonda con orejas de borreguito, nariz grande y dos bolsillos: el de abajo sigue la curva del cuerpo y queda atrapado en la costura.', tags: ['koala', 'pared', 'borreguito'],
    colors: { piel: '#a3a8ad', ropa: '#a3a8ad', contraste: '#d7dadd', detalle: '#4a3b33', ropa2: '#c4c8cc' }, reference: 'Koala de pared gris con dos bolsillos' }),
  card({ id: 'zorro', name: 'Zorro con panel', category: 'animales', generatorId: 'bolsillero-zorro', params: {},
    description: 'Cabeza de zorro con cara blanca, ojos dormidos bordados y orejas de fieltro rosa sobre un panel con tres bolsillos.', tags: ['zorro', 'pared', 'ojos dormidos'],
    colors: { piel: '#d9813a', ropa: '#d9813a', contraste: '#efe6d4', detalle: '#3b2a1a', ropa2: '#8fae9a' }, reference: 'Cabeza de zorro sobre un panel con tres bolsillos' }),
  card({ id: 'ballena', name: 'Ballena de tres bolsillos', category: 'animales', generatorId: 'bolsillero-ballena', params: {},
    description: 'Ballena cortada al doblez por la barriga, con una franja de tres bolsillos de pliegue encontrado, aleta, ojo y sonrisa.', tags: ['ballena', 'pliegues', 'pared', 'mar'],
    colors: { piel: '#6f9bb3', ropa: '#6f9bb3', contraste: '#e9e2d2', detalle: '#24384a', ropa2: '#9cc0cf' }, reference: 'Ballena de pared con tres bolsillos plisados' }),
  card({ id: 'flor', name: 'Flor de ocho pétalos', category: 'naturaleza', generatorId: 'bolsillero-flor', params: {},
    description: 'Centro redondo con seis bolsillos acolchados, ocho pétalos de retales, tallo y dos hojas. Todo lleva guata.', tags: ['flor', 'pétalos', 'retales', 'acolchado'],
    colors: { piel: '#efe4cf', ropa: '#efe4cf', contraste: '#d98c8c', detalle: '#3b2a1a', ropa2: '#e9b949', print: 'vichy' }, reference: 'Flor de pared acolchada con pétalos de varias telas y seis bolsillos' }),
  card({ id: 'trebol', name: 'Trébol', category: 'naturaleza', generatorId: 'bolsillero-trebol', params: {},
    description: 'Trébol de 3, 4 o 5 hojas en corazón, con un bolsillo de una capa en cada hoja, tallo y presilla. Margen de 12 mm como la referencia.', tags: ['trébol', 'corazones', 'suerte', 'hojas'],
    colors: { piel: '#7fa66a', ropa: '#7fa66a', contraste: '#e6efd9', detalle: '#2e4a24', ropa2: '#b9d39e' }, reference: 'Trébol de pared con bolsillos y margen de 1/2 pulgada' }),
  card({ id: 'cuna', name: 'Gota para la cuna', category: 'bebe', generatorId: 'organizador-cuna', params: {},
    description: 'Bolsillo en gota acolchado que se cuelga por fuera de los barrotes con una tira corta de broche. Lleva una hoja arriba.', tags: ['cuna', 'bebé', 'pera', 'gota', 'chupetes'],
    colors: { piel: '#e7d6c4', ropa: '#e7d6c4', contraste: '#c7a98b', detalle: '#3b2a1a', ropa2: '#9db08c' }, reference: 'Organizador de cuna en forma de pera con bolsillo delantero' }),
  card({ id: 'zanahoria', name: 'Zanahoria con conejito', category: 'bebe', generatorId: 'zanahoria-conejito', params: {},
    description: 'Saco-zanahoria con hojas, rayas pespunteadas y un bolsillo donde duerme un conejito relleno con bufanda.', tags: ['zanahoria', 'conejo', 'pascua', 'juguete'],
    colors: { piel: '#e8833a', ropa: '#e8833a', contraste: '#f3ead9', detalle: '#3b2a1a', ropa2: '#9cbf7a' }, reference: 'Saco zanahoria con un conejito de tela dentro' }),
  card({ id: 'portalapices', name: 'Zorro portalápices con barra', category: 'escritorio', generatorId: 'portalapices-zorro', params: {},
    description: 'Zorro con una franja de cuatro bolsillos en cuatro telas para lápices y pinceles. Se cuelga de un bastón de madera por una jareta trasera.', tags: ['zorro', 'lápices', 'escritorio', 'bastón'],
    colors: { piel: '#d97a35', ropa: '#d97a35', contraste: '#f0e6d6', detalle: '#7a5536', ropa2: '#7aa6a1' }, reference: 'Zorro portalápices de cuatro bolsillos colgado de una barra' })
];

export const ORGANIZER_CATEGORIES = (Object.keys(ORGANIZER_CATEGORY_LABEL) as OrganizerCategory[]).map(id => ({ id, label: ORGANIZER_CATEGORY_LABEL[id], count: ORGANIZER_CARDS.filter(c => c.category === id).length }));
