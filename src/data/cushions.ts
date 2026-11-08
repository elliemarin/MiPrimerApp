import type { PlushCard } from './toys';

/* Cojines: tarjetas de la sección. Cada una es una receta de un generador de
 * src/lib/pattern/generators/cushions.ts. Hechas a partir de 16 fotos de patrones
 * de la usuaria (2026-11-08), revisados como patronista: no se copian imágenes,
 * marcas ni dibujos; se corrigen las medidas que no cierran. */

export const CUSHION_CATEGORY_LABEL = { bebe: 'Bebé y lactancia', animales: 'Animales', naturaleza: 'Naturaleza y cielo', navidad: 'Navidad', pufs: 'Pufs y sillones' } as const;
export type CushionCategory = keyof typeof CUSHION_CATEGORY_LABEL;
export type CushionCard = PlushCard<CushionCategory>;

const card = (c: CushionCard) => c;
export const CUSHION_CARDS: CushionCard[] = [
  card({ id: 'hipocampo', name: 'Hipocampo para abrazar', category: 'bebe', generatorId: 'cojin-hipocampo', params: {},
    description: 'Cojín largo de 80 cm con cresta de puntas redondas, hocico, cola en gancho, aleta y pespuntes de compartimento para que el relleno no baje.', tags: ['hipocampo', 'caballito de mar', 'cojín largo', 'bebé'],
    colors: { piel: '#1f6f78', ropa: '#1f6f78', contraste: '#2b8a93', detalle: '#0f3d42', ropa2: '#d9eef0' }, reference: 'Patrón de hipocampo de peluche (hecho con IA): cuerpo, aleta y versión pequeña' }),
  card({ id: 'lactancia', name: 'Cojín de lactancia', category: 'bebe', generatorId: 'cojin-lactancia', params: {},
    description: 'U de 70 × 52 cm con brazos de 22 cm, funda con cremallera invisible y cojín interior. Fuelle opcional para más volumen.', tags: ['lactancia', 'U', 'bebé', 'funda'],
    colors: { piel: '#d9a0a6', ropa: '#d9a0a6', contraste: '#f4e4e1', detalle: '#ffffff', ropa2: '#fff7f2', print: 'lunares' }, reference: 'Cojín de lactancia en U de 70 × 52 cm con brazo de 22 cm' }),
  card({ id: 'puf-conejo', name: 'Puf conejo de rayas', category: 'pufs', generatorId: 'puf-conejo', params: {},
    description: 'Puf de 60 × 40 × 30 cm: testeros en arco, envolvente de una pieza, base con cremallera, orejas entreteladas y cola de bola.', tags: ['puf', 'conejo', 'rayas', 'orejas'],
    colors: { piel: '#253247', ropa: '#253247', contraste: '#f3efe6', detalle: '#ffffff', ropa2: '#f3efe6', print: 'rayas' }, reference: 'Puf conejo de 60 × 40 × 30 cm con orejas de 15 × 20 cm' }),
  card({ id: 'puf-pera', name: 'Puf pera con orejas', category: 'pufs', generatorId: 'puf-pera-conejo', params: {},
    description: 'Puf pera de frente y espalda en gota, banda de lados y techo al doblez, base redonda con cremallera y orejas de conejo.', tags: ['puf', 'pera', 'conejo', 'orejas', 'bolitas'],
    colors: { piel: '#77797c', ropa: '#77797c', contraste: '#e9e6e0', detalle: '#ffffff' }, reference: 'Puf pera con orejas de conejo: gota, banda al doblez y base (patrón ruso a 34 cm)' }),
  card({ id: 'sillon-plegable', name: 'Sillón cojín plegable', category: 'pufs', generatorId: 'cojin-sillon', params: {},
    description: 'Cuatro cuadrados, un cabecero y dos brazos en triángulo unidos con bisagras: se pliega en sillón o se abre en colchoneta.', tags: ['sillón', 'colchoneta', 'vichy', 'plegable'],
    colors: { piel: '#f2a9bf', ropa: '#f2a9bf', contraste: '#fde7ee', detalle: '#ffffff', ropa2: '#ffffff', print: 'vichy' }, reference: 'Sillón de cojines de vichy: 4 cuadrados de 30, 2 rectángulos de 30 × 15 y 4 triángulos' }),
  card({ id: 'pato', name: 'Pato redondo', category: 'animales', generatorId: 'cojin-pato', params: {},
    description: 'Cuerpo en huevo con fuelle para el volumen de la foto, alas, patas largas con pie palmeado y pico relleno.', tags: ['pato', 'patito', 'huevo', 'peluche'],
    colors: { piel: '#f7e7c4', ropa: '#f7e7c4', contraste: '#f0a04b', detalle: '#2b2b2b' }, reference: 'Pato redondo de minky: cuerpo, alas, patas y pico' }),
  card({ id: 'conejo-redondo', name: 'Conejo redondo con lazo', category: 'animales', generatorId: 'cojin-conejo-redondo', params: {},
    description: 'Cabeza redonda con orejas largas forradas y lazo. En disco como la referencia o en bola de seis gajos.', tags: ['conejo', 'redondo', 'orejas', 'lazo'],
    colors: { piel: '#b98d96', ropa: '#efe5d6', contraste: '#efe5d6', detalle: '#ffffff' }, reference: 'Cojín conejo redondo: cabeza, oreja exterior, oreja interior y lazo' }),
  card({ id: 'mariposa-encaje', name: 'Mariposa con volante de encaje', category: 'animales', generatorId: 'cojin-mariposa-volante', params: {},
    description: 'Mariposa de dos alas de 35 cm con el encaje fruncido en la costura, cuerpo relleno y antenas.', tags: ['mariposa', 'encaje', 'volante', 'romántico'],
    colors: { piel: '#efc6c9', ropa: '#efc6c9', contraste: '#fbf6ee', detalle: '#d9a3a8' }, reference: 'Cojín mariposa con alas de 35 × 30 cm, cuerpo de 20 cm y encaje' }),
  card({ id: 'abeja', name: 'Abeja de franjas', category: 'animales', generatorId: 'cojin-abeja', params: { franjas: 5 },
    description: 'Cabeza mostaza y cuerpo de franjas cortadas de una sola silueta, alas rellenas encima y antenas con bolita. La referencia marca 3 franjas; aquí 5 como en la foto.', tags: ['abeja', 'franjas', 'terciopelo', 'alas'],
    colors: { piel: '#e7a9b2', ropa: '#f5ecdc', contraste: '#c99a3c', detalle: '#2b2b2b', ropa2: '#e7a9b2' }, reference: 'Cojín abeja (patrón alemán): Kopf, Körper, Flügel y Fühler' }),
  card({ id: 'mariposa-alas', name: 'Mariposa de alas rellenas', category: 'animales', generatorId: 'cojin-mariposa-alas', params: {},
    description: 'Cuatro alas rellenas con vivo, unidas por el centro y ceñidas con una banda crema.', tags: ['mariposa', 'terciopelo', 'vivo', 'banda'],
    colors: { piel: '#5e1f2d', ropa: '#5e1f2d', contraste: '#e8dccb', detalle: '#7a3443' }, reference: 'Butterfly pillow: 4 alas con el centro recto y banda' }),
  card({ id: 'estrella-patas', name: 'Estrella con brazos y piernas', category: 'naturaleza', generatorId: 'cojin-estrella', params: {},
    description: 'Estrella de 50 cm con cara feliz bordada, brazos y piernas largas con zapatos de contraste y lazo.', tags: ['estrella', 'piernas', 'muñeco', 'lazo'],
    colors: { piel: '#d9927f', ropa: '#d9927f', contraste: '#c27d6a', detalle: '#3b2a1a' }, reference: 'Estrella de peluche con piernas de 25 + 5 cm y estrellitas' }),
  card({ id: 'estrellitas', name: 'Estrellitas', category: 'naturaleza', generatorId: 'cojin-estrella', params: { extremidades: 'no', lazo: 'no', alto: 220 },
    description: 'Estrellas pequeñas de 20 a 22 cm con carita bordada, para acompañar a la grande.', tags: ['estrella', 'pequeña', 'cojín'],
    colors: { piel: '#e6b45c', ropa: '#e6b45c', contraste: '#c98e4f', detalle: '#3b2a1a' }, reference: 'Estrellitas de 20 y 22 cm' }),
  card({ id: 'manzana', name: 'Manzana', category: 'naturaleza', generatorId: 'cojin-manzana', params: {},
    description: 'Manzana con hoyuelos arriba y abajo, tallo enrollado y hoja de tela forrada (o de fieltro).', tags: ['manzana', 'fruta', 'bouclé'],
    colors: { piel: '#f2a07b', ropa: '#f2a07b', contraste: '#8d8a6c', detalle: '#6b4a33' }, reference: 'Apfelkissen: cuerpo, hoja y tallo' }),
  card({ id: 'nube', name: 'Nube', category: 'naturaleza', generatorId: 'cojin-nube', params: { forma: 'grande', ancho: 550 },
    description: 'Nube grande, mediana o pequeña de pelo suave. Elige la forma y el ancho.', tags: ['nube', 'cielo', 'pelo', 'peluche'],
    colors: { piel: '#cdb9a3', ropa: '#cdb9a3', contraste: '#f2ede4', detalle: '#ffffff' }, reference: 'Nubes grande, mediana y pequeña (Grand, Moyen y Petit nuage)' }),
  card({ id: 'hongo', name: 'Hongo con lunares', category: 'naturaleza', generatorId: 'cojin-hongo', params: {},
    description: 'Sombrero de pana verde y pie crema unidos por una línea recta, con lunares de fieltro.', tags: ['hongo', 'seta', 'lunares', 'pana'],
    colors: { piel: '#2f5b45', ropa: '#2f5b45', contraste: '#eee5d3', detalle: '#ffffff' }, reference: 'Cojín hongo de pana con lunares' }),
  card({ id: 'bellota', name: 'Bellota', category: 'naturaleza', generatorId: 'cojin-bellota', params: {},
    description: 'Fruto de terciopelo y capucha de bouclé unidos por la misma curva, con rabito enrollado.', tags: ['bellota', 'otoño', 'bouclé'],
    colors: { piel: '#1f6d6b', ropa: '#1f6d6b', contraste: '#c9b48e', detalle: '#7a5a3a' }, reference: 'Cojín bellota de dos telas' }),
  card({ id: 'pino', name: 'Pino de terciopelo', category: 'navidad', generatorId: 'cojin-pino', params: { vivo: 'si' },
    description: 'Pino de 49 cm cortado al doblez con pisos de 26, 34 y 42 cm, tronco de 7 cm y vivo.', tags: ['pino', 'árbol', 'navidad', 'terciopelo'],
    colors: { piel: '#6b1d2e', ropa: '#6b1d2e', contraste: '#4b1320', detalle: '#ffffff' }, reference: 'Cojín navideño en forma de pino de 49 cm al doblez' }),
  card({ id: 'arbol-patas', name: 'Árbol con patas', category: 'navidad', generatorId: 'cojin-arbol', params: {},
    description: 'Árbol de pisos redondeados con estrella amarilla, cara bordada, puntadas de adorno y patas con suela.', tags: ['árbol', 'navidad', 'estrella', 'patas'],
    colors: { piel: '#8fb07c', ropa: '#8fb07c', contraste: '#f1e3a2', detalle: '#2b2b2b', ropa2: '#a89582' }, reference: 'Árbol de peluche con estrella y patas: cuerpo, pata y suela' })
];

export const CUSHION_CATEGORIES = (Object.keys(CUSHION_CATEGORY_LABEL) as CushionCategory[]).map(id => ({ id, label: CUSHION_CATEGORY_LABEL[id], count: CUSHION_CARDS.filter(c => c.category === id).length }));
