import type { Params } from '../lib/pattern/generator';

/* Juguetes y peluches: tarjetas de la sección. Cada una es una receta de un
 * generador de src/lib/pattern/generators/toys.ts con sus colores de muestra.
 * Reconstruidos como diseños propios a partir de las fotos de referencia de la
 * usuaria (2026-11-08): no se copian imágenes, marcas ni medidas. */

export const TOY_CATEGORY_LABEL = { munecos: 'Muñecas', animalitos: 'Animalitos', insectos: 'Bichitos e insectos', fieltro: 'Fieltro', volumen: 'Peluches con volumen' } as const;
export type ToyCategory = keyof typeof TOY_CATEGORY_LABEL;

export interface ToyColors { piel: string; ropa: string; contraste: string; detalle: string; ropa2?: string }
export interface ToyCard {
  id: string; name: string; category: ToyCategory; description: string; tags: string[];
  generatorId: string; params: Params; colors: ToyColors;
  /** Qué foto de referencia inspiró la construcción. */
  reference: string;
}

const card = (c: ToyCard) => c;
export const TOY_CARDS: ToyCard[] = [
  card({ id: 'abeja-rayas', name: 'Abeja de rayas', category: 'insectos', generatorId: 'muneco-trapo', params: { personaje: 'abeja', antenas: 'tela', accesorio: 'ninguno' },
    description: 'Cabeza y cuerpo acampanado en punto de rayas, brazos y piernas largas, alas de fieltro y antenas con bolita. Cara bordada con ojos dormidos.',
    tags: ['abeja', 'rayas', 'calcetín', 'bebé'], colors: { piel: '#f3e3cf', ropa: '#1f2c4f', contraste: '#f2f0ea', detalle: '#1f2c4f', ropa2: '#e6c98f' }, reference: 'Abejas de punto a rayas azul y crema o verde' }),
  card({ id: 'abeja-bebe', name: 'Abeja para bebé', category: 'insectos', generatorId: 'muneco-trapo', params: { personaje: 'abeja', antenas: 'bordadas', accesorio: 'ninguno' },
    description: 'La misma abeja con antenas bordadas: sin piezas sueltas, pensada para bebés.', tags: ['abeja', 'bebé', 'apego'], colors: { piel: '#f3e3cf', ropa: '#2b2b2b', contraste: '#f2f0ea', detalle: '#2b2b2b', ropa2: '#f2c94c' }, reference: 'Abejas amarillas y negras con corona de flores' }),
  card({ id: 'bichito-lazo', name: 'Mariquita redonda con lazo', category: 'insectos', generatorId: 'peluche-bichito', params: { lazo: 'si', antenas: 'tela' },
    description: 'Cabeza redonda con cara aplicada, cuerpo de pera, bracitos, patitas, alas forradas con lunares, antenas y lazo grande.', tags: ['mariquita', 'insecto', 'lazo', 'terciopelo'],
    colors: { piel: '#f6dcc8', ropa: '#7a1f2b', contraste: '#1f1f1f', detalle: '#f7f1e8' }, reference: 'Bichitos redondos de terciopelo con alas y lazo' }),
  card({ id: 'hada-fieltro', name: 'Hada de fieltro', category: 'fieltro', generatorId: 'fieltro-hada', params: {},
    description: 'Figura plana de fieltro: cabeza con cabello aplicado, cuerpo, brazos y dos pares de alas bordadas. Se cose a mano con festón.', tags: ['hada', 'fieltro', 'libélula', 'alas'],
    colors: { piel: '#f6d2bf', ropa: '#b9566b', contraste: '#f7f2ea', detalle: '#e4a99a' }, reference: 'Hadas libélula de fieltro con alas bordadas' }),
  card({ id: 'libelula-tela', name: 'Libélula de lino', category: 'insectos', generatorId: 'peluche-libelula', params: {},
    description: 'Cuerpo largo relleno y fruncido por segmentos, cabeza de dos medias esferas y dos pares de alas forradas.', tags: ['libélula', 'lino', 'decoración', 'cuna'],
    colors: { piel: '#efe7da', ropa: '#efe7da', contraste: '#e3b5b3', detalle: '#2b2b2b' }, reference: 'Libélula de lino con banda fruncida cada 4 cm' }),
  card({ id: 'muneca-flor', name: 'Muñeca flor', category: 'munecos', generatorId: 'muneco-trapo', params: { personaje: 'flor', petalos: 8, petalo: 'redondo', brazos: 'brazo', ropa: 'ninguna' },
    description: 'Cabeza redonda rodeada de pétalos rellenos que cubren justo su contorno, cuerpo verde con brazos y piernas largas.', tags: ['flor', 'muñeca', 'pétalos', 'margarita'],
    colors: { piel: '#f3e3cf', ropa: '#9bb59a', contraste: '#e7a7a9', detalle: '#3b2a1a' }, reference: 'Muñeca flor de lino con pétalos rosas' }),
  card({ id: 'muneca-flor-hojas', name: 'Muñeca flor con brazos de hoja', category: 'munecos', generatorId: 'muneco-trapo', params: { personaje: 'flor', petalos: 9, petalo: 'puntiagudo', brazos: 'hoja', ropa: 'vestido' },
    description: 'Pétalos en punta, brazos en forma de hoja y vestido trapecio.', tags: ['flor', 'muñeca', 'hojas', 'vestido'], colors: { piel: '#f3e3cf', ropa: '#f2b8c6', contraste: '#f2c94c', detalle: '#3b2a1a', ropa2: '#8ab17d' }, reference: 'Muñecas flor con vestido y brazos de hoja' }),
  card({ id: 'muneca-vaquera', name: 'Muñeca con chaqueta y pantalón', category: 'munecos', generatorId: 'muneco-trapo', params: { personaje: 'muneca', ropa: 'pantalon-chaqueta', accesorio: 'zapatos' },
    description: 'Muñeca de trapo de 30 cm con pantalón de jareta, chaqueta de hombro caído y zapatos con suela. Base para el cabello de lana.', tags: ['muñeca', 'ropa', 'chaqueta', 'pantalón', 'zapatos'],
    colors: { piel: '#f1d3b8', ropa: '#4e6fa3', contraste: '#e8a6b3', detalle: '#c9a26b' }, reference: 'Muñecas de 30 cm con chaqueta vaquera, pantalón y zapatillas' }),
  card({ id: 'muneca-vestido', name: 'Muñeca con vestido y chaqueta', category: 'munecos', generatorId: 'muneco-trapo', params: { personaje: 'muneca', ropa: 'vestido-chaqueta', accesorio: 'moño' },
    description: 'Muñeca con vestido de raya fina, chaqueta tipo cárdigan y moño grande.', tags: ['muñeca', 'vestido', 'cárdigan', 'moño'], colors: { piel: '#f1d3b8', ropa: '#a9c3d6', contraste: '#e9cfa3', detalle: '#d9b45a', ropa2: '#7aa0bf' }, reference: 'Muñeca con moños, vestido de rayas y cárdigan' }),
  card({ id: 'conejita-peto', name: 'Conejita con peto y bolso', category: 'animalitos', generatorId: 'muneco-trapo', params: { personaje: 'conejita', ropa: 'peto-largo', accesorio: 'bolso' },
    description: 'Conejita de lino con orejas forradas, peto largo con bolsillo y bolso cruzado con solapa.', tags: ['conejo', 'peto', 'bolso', 'lino'], colors: { piel: '#ece2d3', ropa: '#6e1f2b', contraste: '#e8c4b8', detalle: '#b07a45' }, reference: 'Conejita con peto burdeos y bolso de cuero' }),
  card({ id: 'conejo-patchwork', name: 'Conejo con panza de patchwork', category: 'animalitos', generatorId: 'muneco-trapo', params: { personaje: 'conejita', parche: 'patchwork', ropa: 'ninguna' },
    description: 'Conejo sencillo con orejas de tela estampada y un parche de cuatro retales en la panza.', tags: ['conejo', 'patchwork', 'retales'], colors: { piel: '#5b84ad', ropa: '#5b84ad', contraste: '#f1e6d3', detalle: '#b5463a' }, reference: 'Conejo azul con parche de cuatro retales' }),
  card({ id: 'gatito-peto', name: 'Gatito con peto', category: 'animalitos', generatorId: 'muneco-trapo', params: { personaje: 'gatito', ropa: 'peto', accesorio: 'ninguno' },
    description: 'Gatito de lino con orejas en el contorno de la cabeza, bigotes bordados y peto corto.', tags: ['gato', 'peto', 'lino'], colors: { piel: '#e6ddcf', ropa: '#c9973a', contraste: '#b2453a', detalle: '#6b4a33' }, reference: 'Gatos de lino con peto de pana y vestido de flores' }),
  card({ id: 'gatita-vestido', name: 'Gatita con vestido', category: 'animalitos', generatorId: 'muneco-trapo', params: { personaje: 'gatito', ropa: 'vestido', accesorio: 'moño' },
    description: 'La misma gatita con vestido trapecio de flores y moño.', tags: ['gata', 'vestido', 'moño'], colors: { piel: '#f2ece2', ropa: '#9fb8cf', contraste: '#e8a87c', detalle: '#6b4a33' }, reference: 'Gatita con vestido de flores y volante' }),
  card({ id: 'perrito-peto', name: 'Perrito con peto y hueso', category: 'animalitos', generatorId: 'muneco-trapo', params: { personaje: 'perrito', ropa: 'peto', accesorio: 'hueso' },
    description: 'Perrito de orejas caídas con peto corto de lana o pana y un hueso de juguete.', tags: ['perro', 'peto', 'hueso'], colors: { piel: '#e3cdb0', ropa: '#5a5f66', contraste: '#5c3a2a', detalle: '#3b2a1a' }, reference: 'Perrito con peto gris y hueso' }),
  card({ id: 'patito-peto', name: 'Patito con peto y bufanda', category: 'animalitos', generatorId: 'muneco-trapo', params: { personaje: 'patito', ropa: 'peto-largo', accesorio: 'bufanda' },
    description: 'Patito de cuerpo redondo, alas, pico y patas largas en mostaza, peto largo y bufanda.', tags: ['pato', 'peto', 'bufanda'], colors: { piel: '#f3ead2', ropa: '#4a5059', contraste: '#d9a23b', detalle: '#b4532a' }, reference: 'Patitos con peto de espiga, gorro y bufanda' }),
  card({ id: 'conejo-3d', name: 'Conejo 3D de vichy', category: 'volumen', generatorId: 'peluche-conejo-3d', params: {},
    description: 'Conejo con volumen: cabeza con fuelle central, orejas forradas, panza, brazos y piernas con suela. El fuelle, la panza y las suelas se calculan para coincidir exactamente.', tags: ['conejo', 'vichy', '3D', 'peluche'],
    colors: { piel: '#c8373f', ropa: '#c8373f', contraste: '#f6ece6', detalle: '#2b2b2b' }, reference: 'Conejo de vichy rojo con orejas y suelas de corazones' })
];

export const TOY_CATEGORIES = (Object.keys(TOY_CATEGORY_LABEL) as ToyCategory[]).map(id => ({ id, label: TOY_CATEGORY_LABEL[id], count: TOY_CARDS.filter(c => c.category === id).length }));
const fold = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
export function toyMatches(c: ToyCard, category: ToyCategory | 'todas', q: string) {
  if (category !== 'todas' && c.category !== category) return false;
  const text = fold([c.name, c.description, ...c.tags].join(' '));
  return fold(q).split(/\s+/).filter(Boolean).every(w => text.includes(w));
}
