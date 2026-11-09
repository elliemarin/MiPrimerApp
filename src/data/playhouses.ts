import type { PlushCard } from './toys';

/* Casitas de juego de tela: tarjetas de src/lib/pattern/generators/playhouses.ts
 * (2026-11-09). Dos construcciones (rincón y mesa) con temas propios que se
 * pueden mezclar desde la ficha: tema, faldón, medidas y esquinas. */

export const PLAYHOUSE_CATEGORY_LABEL = { rincon: 'Casitas de rincón', mesa: 'Casitas de mesa' } as const;
export type PlayhouseCategory = keyof typeof PLAYHOUSE_CATEGORY_LABEL;
export type PlayhouseCard = PlushCard<PlayhouseCategory>;

const NAMES = ['casita', 'casita de juego', 'tienda', 'tipi', 'cabaña', 'play tent', 'playhouse', 'tente', 'Spielhaus', 'niños'];
const card = (c: PlayhouseCard): PlayhouseCard => ({ ...c, tags: [...c.tags, ...NAMES, ...(c.category === 'rincon' ? ['rincón', 'esquina', 'pared', 'barra'] : ['mesa', 'funda de mesa', 'table tent'])] });
const corner = (id: string, name: string, tema: string, colors: PlayhouseCard['colors'], description: string, tags: string[], reference: string) =>
  card({ id, name, category: 'rincon', generatorId: 'casita-rincon', params: { tema }, colors, description, tags, reference });
const table = (id: string, name: string, params: PlayhouseCard['params'], colors: PlayhouseCard['colors'], description: string, tags: string[], reference: string) =>
  card({ id, name, category: 'mesa', generatorId: 'casita-mesa', params, colors, description, tags, reference });

export const PLAYHOUSE_CARDS: PlayhouseCard[] = [
  corner('rincon-honguito', 'Honguito', 'honguito', { piel: '#f1e6cf', ropa: '#c8423b', contraste: '#e2a35b', detalle: '#6b4a33', ropa2: '#fbf8f1' },
    'Tejado rojo con lunares blancos aplicados, faldón de ondas, ventana redonda, puerta con cortinas, hierba y una seta junto a la puerta.', ['hongo', 'seta', 'lunares', 'bosque'], 'Casita de rincón con tejado triangular y faldón de ondas'),
  corner('rincon-princesa', 'Princesa', 'princesa', { piel: '#fbf3f4', ropa: '#e9a5b5', contraste: '#e9a5b5', detalle: '#c58a97', ropa2: '#f6d4dc' },
    'Tejado rosa, faldón de ondas, ventana de corazón, corona sobre la puerta, banderines y cortinas con alzapaños de velcro.', ['princesa', 'corona', 'rosa', 'corazón'], 'Casita de rincón con faldón de ondas'),
  corner('rincon-payasos', 'Circo de payasos', 'payasos', { piel: '#f6e7b8', ropa: '#d9473f', contraste: '#3c6fb4', detalle: '#2b2b2b', ropa2: '#fbf8f1' },
    'Tejado de rayas de circo, faldón de picos, ventana en rombo, un payaso aplicado con nariz roja, confeti y estrella.', ['payaso', 'circo', 'rayas', 'picos'], 'Casita de rincón con tejado de carpa'),
  corner('rincon-hada', 'Hada del bosque', 'hada', { piel: '#ece3cd', ropa: '#4f7f52', contraste: '#8fb07c', detalle: '#3b4a2b', ropa2: '#8fb07c' },
    'Tejado verde con faldón de hojas, ventana en arco, enredadera, seta, flores y una mariposa.', ['hada', 'bosque', 'hojas', 'mariposa', 'flores'], 'Casita de rincón verde con faldón'),
  corner('rincon-chocolate', 'Chocolate con glaseado', 'chocolate', { piel: '#7a4a33', ropa: '#6b3b26', contraste: '#f4ead8', detalle: '#3b2a1a', ropa2: '#f4ead8' },
    'Casita marrón con faldón de goteo de glaseado, grajeas de colores en el tejado, ventana de cruz y cortinas crudas.', ['chocolate', 'glaseado', 'galleta', 'goteo'], 'Casita de rincón marrón con faldón de goteo'),
  corner('rincon-estrellas', 'Noche estrellada', 'estrellas', { piel: '#2f3b62', ropa: '#26304f', contraste: '#fbf8f1', detalle: '#fbf8f1', ropa2: '#fbf8f1' },
    'Azul noche con faldón blanco de ondas, buhardilla en el tejado, luna y estrellas, ventana con persiana y cortinas.', ['estrellas', 'noche', 'luna', 'mezclilla', 'azul'], 'Casita de rincón de mezclilla con buhardilla'),
  corner('rincon-castillo', 'Castillo', 'castillo', { piel: '#c9c6c1', ropa: '#7d7a86', contraste: '#a8a4b3', detalle: '#4a4650', ropa2: '#a8a4b3' },
    'Faldón de almenas, puerta y ventana en arco, piedras aplicadas y un banderín en el torreón.', ['castillo', 'almenas', 'caballeros', 'gris'], 'Casita de rincón con tejado triangular'),
  corner('rincon-sencilla', 'Sencilla de paneles', 'sencilla', { piel: '#f3efe6', ropa: '#f2b632', contraste: '#3f8f8c', detalle: '#6b6b6b', ropa2: '#f2b632' },
    'Tejado amarillo con faldón de ondas y pared de tres paneles: la puerta se enrolla con velcro y la ventana lleva ribete.', ['sencilla', 'paneles', 'amarillo', 'básica'], 'Casita de rincón de 130 cm con paneles de 20, 50 y 60 cm'),
  table('mesa-jardin', 'Jardín de mesa', { tema: 'jardin' }, { piel: '#f3ecdc', ropa: '#f3ecdc', contraste: '#d9c7a7', detalle: '#2b2b2b' },
    'Funda de mesa con valla blanca, flores, farol y placa del número aplicados, ventanas de cruz y puerta enrollable.', ['jardín', 'valla', 'flores', 'farol'], 'Casita de mesa pintada con valla y flores'),
  table('mesa-lunares', 'Lunares rosa', { tema: 'lunares' }, { piel: '#fbf8f1', ropa: '#fbf8f1', contraste: '#e9a5b5', detalle: '#c58a97', ropa2: '#f2c4cf' },
    'Funda de mesa cruda con faldón de ondas de lunares, ventanas ribeteadas en rosa, lazos y cortinas de lunares.', ['lunares', 'rosa', 'ondas', 'lazos'], 'Casita de mesa con faldón de ondas rosa'),
  table('mesa-rayas', 'Rayas', { tema: 'rayas' }, { piel: '#f3e7d3', ropa: '#f3e7d3', contraste: '#3c6fb4', detalle: '#2b2b2b', ropa2: '#e3b04b' },
    'Funda de mesa de rayas con faldón de ondas, ventanas de cruz y cortinas.', ['rayas', 'mesa'], 'Casita de mesa de rayas'),
  table('mesa-menta', 'Menta de esquinas abiertas', { tema: 'menta', esquinas: 'abiertas' }, { piel: '#a9d3c8', ropa: '#a9d3c8', contraste: '#e6efeb', detalle: '#6b6b6b' },
    'Funda de mesa con esquinas que se abren y se cierran con velcro, persianas enrollables en las ventanas y puerta enrollable.', ['menta', 'persianas', 'esquinas'], 'Funda de mesa con ventanas de persiana')
];

export const PLAYHOUSE_CATEGORIES = (Object.keys(PLAYHOUSE_CATEGORY_LABEL) as PlayhouseCategory[]).map(id => ({ id, label: PLAYHOUSE_CATEGORY_LABEL[id], count: PLAYHOUSE_CARDS.filter(c => c.category === id).length }));
