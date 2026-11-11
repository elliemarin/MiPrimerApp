import type { PlushCard } from './toys';

/* Adornos navideños: tarjetas de src/lib/pattern/generators/ornaments.ts
 * (2026-11-11). Siete construcciones propias: casita nevada, reno, galleta de
 * jengibre, árbol por capas, árbol escalonado de retales, figuritas del
 * calendario de adviento y bota navideña. Desde la ficha se cambian el tamaño,
 * los accesorios, la figura, el número del día y la puntada. */

export const ORNAMENT_CATEGORY_LABEL = { colgar: 'Adornos para colgar', adviento: 'Calendario de adviento', botas: 'Botas y medias' } as const;
export type OrnamentCategory = keyof typeof ORNAMENT_CATEGORY_LABEL;
export type OrnamentCard = PlushCard<OrnamentCategory>;

const NAMES = ['navidad', 'navideño', 'adorno', 'christmas', 'ornament', 'Weihnachten', 'Noël'];
const card = (c: OrnamentCard): OrnamentCard => ({ ...c, tags: [...c.tags, ...NAMES, ...(c.category === 'botas' ? ['bota', 'media', 'calcetín', 'stocking'] : ['fieltro', 'colgar', 'árbol de navidad'])] });
const RED = '#b8322f', GREEN = '#2f6b45', CREAM = '#f7f3ea', BROWN = '#6b4a33';

export const ORNAMENT_CARDS: OrnamentCard[] = [
  card({ id: 'casita-nevada', name: 'Casita nevada', category: 'colgar', generatorId: 'adorno-casita', params: { adorno: 'estrella' },
    colors: { piel: CREAM, ropa: RED, contraste: GREEN, detalle: BROWN }, tags: ['casita', 'casa', 'nieve', 'estrella', 'chimenea'],
    description: 'Casita roja de fieltro con tejado nevado de ondas, chimenea, dos ventanas con cruz, puerta en arco con tablas y una estrella.', reference: 'Casita de fieltro con tejado nevado y estrella' }),
  card({ id: 'casita-corazon', name: 'Casita del corazón', category: 'colgar', generatorId: 'adorno-casita', params: { adorno: 'corazon' },
    colors: { piel: '#f2b8c0', ropa: '#6f8a5b', contraste: '#c8423b', detalle: '#ef9fb0' }, tags: ['casita', 'casa', 'corazón', 'rosa', 'verde'],
    description: 'Casita verde con tejado rosa, una ventana, puerta rosa a un lado y un corazón bajo el tejado.', reference: 'Casita verde de fieltro con corazón' }),
  card({ id: 'reno-pajarita', name: 'Reno con pajarita', category: 'colgar', generatorId: 'adorno-reno', params: { accesorio: 'pajarita' },
    colors: { piel: CREAM, ropa: '#9a6438', contraste: GREEN, detalle: '#4a2e1c' }, tags: ['reno', 'rudolph', 'cuernos', 'pajarita'],
    description: 'Cabeza de reno con cuernos y orejas entre las capas, hocico crema, nariz roja y pajarita verde.', reference: 'Renos de fieltro con pajarita, gorro y lazo' }),
  card({ id: 'reno-gorro', name: 'Reno con gorro', category: 'colgar', generatorId: 'adorno-reno', params: { accesorio: 'gorro' },
    colors: { piel: CREAM, ropa: '#7a4a2b', contraste: RED, detalle: '#3b2416' }, tags: ['reno', 'gorro', 'papá noel', 'cuernos'],
    description: 'El reno con gorro rojo de borde blanco y pompón, ladeado entre los cuernos.', reference: 'Renos de fieltro con pajarita, gorro y lazo' }),
  card({ id: 'reno-lazo', name: 'Reno con lazo', category: 'colgar', generatorId: 'adorno-reno', params: { accesorio: 'lazo' },
    colors: { piel: CREAM, ropa: '#a8703f', contraste: '#c8423b', detalle: '#4a2e1c' }, tags: ['reno', 'lazo', 'niña', 'cuernos'],
    description: 'El reno con un lazo rojo junto al cuerno.', reference: 'Renos de fieltro con pajarita, gorro y lazo' }),
  card({ id: 'jengibre-botones', name: 'Galleta con botones', category: 'colgar', generatorId: 'adorno-jengibre', params: { ropa: 'botones' },
    colors: { piel: CREAM, ropa: '#b5773f', contraste: GREEN, detalle: '#3b2416' }, tags: ['galleta', 'jengibre', 'gingerbread', 'botones'],
    description: 'Galleta de jengibre con glaseado ondulado bordado en manos y pies, sonrisa y tres botones rojos y verde.', reference: 'Galletas de jengibre de fieltro con falda, bufanda y botones' }),
  card({ id: 'jengibre-falda', name: 'Galleta con falda', category: 'colgar', generatorId: 'adorno-jengibre', params: { ropa: 'falda' },
    colors: { piel: CREAM, ropa: '#b5773f', contraste: GREEN, detalle: '#3b2416' }, tags: ['galleta', 'jengibre', 'falda', 'lazo', 'copos'],
    description: 'Galleta con falda verde de copos bordados y lazo rojo en la cabeza.', reference: 'Galletas de jengibre de fieltro con falda, bufanda y botones' }),
  card({ id: 'jengibre-bufanda', name: 'Galleta con bufanda', category: 'colgar', generatorId: 'adorno-jengibre', params: { ropa: 'bufanda' },
    colors: { piel: CREAM, ropa: '#a96c38', contraste: GREEN, detalle: '#3b2416' }, tags: ['galleta', 'jengibre', 'bufanda', 'gorro'],
    description: 'Galleta con bufanda de flecos y gorro rojo con pompón.', reference: 'Galletas de jengibre de fieltro con falda, bufanda y botones' }),
  card({ id: 'arbol-capas', name: 'Árbol por capas', category: 'colgar', generatorId: 'adorno-arbol', params: {},
    colors: { piel: CREAM, ropa: GREEN, contraste: '#c8423b', detalle: BROWN }, tags: ['árbol', 'pino', 'capas', 'guirnalda', 'bolas'],
    description: 'Árbol de tres capas con borde de ondas, estrella y tronco entre las capas, bolas rojas y blancas, guirnalda de cuentas y copos.', reference: 'Árbol de fieltro de tres capas con estrella' }),
  card({ id: 'arbol-retales-lunares', name: 'Árbol de retales', category: 'colgar', generatorId: 'adorno-arbol-retales', params: { pisos: '3' },
    colors: { piel: CREAM, ropa: '#8fae7f', contraste: '#c9a26b', detalle: '#7b5b3a', ropa2: '#f4f0e4', print: 'lunares' }, tags: ['árbol', 'patchwork', 'retales', 'zigzag', 'lunares'],
    description: 'Árbol escalonado de tela de lunares con guata, pespunte a la vista, borde recortado en zigzag y botón de estrella.', reference: 'Árboles de retales con borde en zigzag' }),
  card({ id: 'arbol-retales-rayas', name: 'Árbol de retales de 4 pisos', category: 'colgar', generatorId: 'adorno-arbol-retales', params: { pisos: '4' },
    colors: { piel: CREAM, ropa: '#b9cfaa', contraste: '#c9a26b', detalle: '#7b5b3a', ropa2: '#5e8a5a', print: 'rayas' }, tags: ['árbol', 'patchwork', 'retales', 'rayas'],
    description: 'El mismo árbol con cuatro pisos, en tela de rayas.', reference: 'Árboles de retales con borde en zigzag' }),
  ...([
    ['manopla', 'Manopla', '1', RED, CREAM, 'Manopla con puño blanco de borde ondulado.', ['manopla', 'guante']],
    ['botita', 'Botita', '6', GREEN, CREAM, 'Botita con puño ondulado, talón y puntera de contraste.', ['bota', 'calcetín']],
    ['gorrito', 'Gorrito', '3', RED, CREAM, 'Gorro de lana con vuelta ondulada, pompón y pespuntes de punto.', ['gorro', 'pompón']],
    ['esfera', 'Esfera', '24', '#2f4f7a', CREAM, 'Bola con casquillo dorado y franja ondulada.', ['bola', 'esfera']],
    ['estrella', 'Estrella', '12', '#d9a93c', CREAM, 'Estrella con pespunte decorativo.', ['estrella']],
    ['arbol', 'Arbolito', '9', GREEN, CREAM, 'Árbol de tres pisos con estrella y tronco.', ['árbol', 'pino']],
    ['regalo', 'Regalo', '18', RED, CREAM, 'Caja con tapa, cinta y lazo.', ['regalo', 'caja', 'lazo']],
    ['corazon', 'Corazón', '14', '#c8423b', CREAM, 'Corazón con pespunte decorativo.', ['corazón']],
    ['baston', 'Bastón de caramelo', 'ninguno', CREAM, '#c8423b', 'Bastón blanco con rayas rojas bordadas.', ['bastón', 'caramelo']]
  ] as const).map(([forma, name, numero, body, light, description, tags]) => card({
    id: `adviento-${forma}`, name, category: 'adviento', generatorId: 'adorno-adviento', params: { forma, numero },
    colors: { piel: light, ropa: body, contraste: forma === 'botita' ? '#c8423b' : forma === 'regalo' ? GREEN : '#c8423b', detalle: BROWN, ropa2: CREAM },
    tags: [...tags, 'adviento', 'calendario', 'número', 'figurita'], description: `${description}${numero !== 'ninguno' ? ` Con el día ${numero} bordado; se elige cualquier número del 1 al 24.` : ''}`, reference: 'Lámina de figuritas para calendario de adviento'
  })),
  card({ id: 'bota-clasica', name: 'Bota clásica', category: 'botas', generatorId: 'bota-navidena', params: { puno: 'recto', talon: 'no', aplique: 'ninguno' },
    colors: { piel: CREAM, ropa: RED, contraste: CREAM, detalle: '#c8423b' }, tags: ['clásica', 'puño', 'roja'],
    description: 'Bota forrada de 45 cm con puño doble blanco y presilla.', reference: 'Molde de bota navideña de 45 cm con puño de 12 cm' }),
  card({ id: 'bota-cuadros', name: 'Bota de talón y puntera', category: 'botas', generatorId: 'bota-navidena', params: { puno: 'recto', talon: 'si', aplique: 'ninguno' },
    colors: { piel: CREAM, ropa: GREEN, contraste: '#b8322f', detalle: '#b8322f', ropa2: '#1f3a2a', print: 'cuadros' }, tags: ['cuadros', 'talón', 'puntera', 'verde'],
    description: 'Bota verde con talón y puntera de cuadros y puño doble crudo.', reference: 'Molde de bota navideña con talón y puntera marcados' }),
  card({ id: 'media-reno', name: 'Media con reno', category: 'botas', generatorId: 'bota-navidena', params: { alto: 300, puno: 'ondas', talon: 'si', aplique: 'reno' },
    colors: { piel: '#7a1f2b', ropa: '#f1e6d3', contraste: '#9b2b33', detalle: '#7a1f2b', ropa2: '#2b3a2a', print: 'cuadros' }, tags: ['reno', 'acebo', 'ondas', 'fieltro', 'cuadros'],
    description: 'Media de 30 cm con puño de ondas de fieltro y copos, reno con lazo, acebo y puntera de cuadros.', reference: 'Media de fieltro de 30 × 18 cm con reno aplicado' }),
  card({ id: 'bota-arbol', name: 'Bota con árbol', category: 'botas', generatorId: 'bota-navidena', params: { puno: 'ondas', talon: 'si', aplique: 'arbol' },
    colors: { piel: CREAM, ropa: RED, contraste: CREAM, detalle: '#c8423b' }, tags: ['árbol', 'ondas', 'bolas'],
    description: 'Bota roja con puño de ondas, árbol con estrella y bolas aplicado, talón y puntera crudos.', reference: 'Molde de bota navideña de 45 cm' })
];

export const ORNAMENT_CATEGORIES = (Object.keys(ORNAMENT_CATEGORY_LABEL) as OrnamentCategory[]).map(id => ({ id, label: ORNAMENT_CATEGORY_LABEL[id], count: ORNAMENT_CARDS.filter(c => c.category === id).length }));
