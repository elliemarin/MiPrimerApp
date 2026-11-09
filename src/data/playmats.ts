import type { PlushCard } from './toys';

/* Tapetes de juego: tarjetas de src/lib/pattern/generators/playmats.ts, hechas
 * a partir de 16 fotos de la usuaria (2026-11-09) como diseños propios. En
 * francés «tapis d'éveil», en alemán «Krabbeldecke», en inglés «play mat». */

export const PLAYMAT_CATEGORY_LABEL = { formas: 'Con forma', naturaleza: 'Hojas y flores', bordes: 'Pétalos y puzle', sensoriales: 'Sensoriales' } as const;
export type PlaymatCategory = keyof typeof PLAYMAT_CATEGORY_LABEL;
export type PlaymatCard = PlushCard<PlaymatCategory>;

const NAMES = ['tapete', 'tapete de juego', 'alfombra de juego', "tapis d'éveil", 'Krabbeldecke', 'play mat', 'bebé'];
const card = (c: PlaymatCard): PlaymatCard => ({ ...c, tags: [...c.tags, ...NAMES, ...(c.category === 'sensoriales' ? ['tapete de actividades', 'activity mat', 'Spieldecke', 'montessori'] : [])] });
const leafCard = (id: string, name: string, forma: string, alto: number, piel: string, description: string, reference: string) =>
  card({ id, name, category: 'naturaleza', generatorId: 'tapete-hoja', params: { forma, alto }, description, tags: ['hoja', forma, 'naturaleza'], colors: { piel, ropa: piel, contraste: '#f3ece0', detalle: '#2f3a2b' }, reference });

export const PLAYMAT_CARDS: PlaymatCard[] = [
  card({ id: 'sol', name: 'Sol con juguetes', category: 'formas', generatorId: 'tapete-sol', params: {},
    description: 'Sol de 16 rayos y 110 cm con acolchado en espiral. Lleva tres lengüetas con broche donde se enganchan una nube y un arcoíris con anilla.', tags: ['sol', 'espiral', 'juguetes', 'anilla'],
    colors: { piel: '#d9a23a', ropa: '#d9a23a', contraste: '#3c5fa8', detalle: '#7a5520', ropa2: '#c9ced3' }, reference: 'Tapete sol de lino mostaza con espiral acolchada y juguetes colgando' }),
  card({ id: 'arcoiris', name: 'Arcoíris de bandas', category: 'formas', generatorId: 'tapete-arcoiris', params: {},
    description: 'Medio círculo de 120 cm hecho con cinco bandas que se cosen arco con arco, con el centro claro y un corazón aplicado.', tags: ['arcoíris', 'bandas', 'corazón', 'patchwork'],
    colors: { piel: '#f3d6d8', ropa: '#f3d6d8', contraste: '#e8907e', detalle: '#3b4a5a', ropa2: '#cfd8de' }, reference: 'Tapete arcoíris de bandas acolchadas con corazón' }),
  card({ id: 'oso', name: 'Cabeza de oso', category: 'formas', generatorId: 'tapete-oso', params: {},
    description: 'Cabeza de 100 cm con orejas, tres anillos acolchados, hocico y orejas de rayas, nariz y ojos de tela aplicada.', tags: ['oso', 'osito', 'anillos', 'cara'],
    colors: { piel: '#cfdae6', ropa: '#cfdae6', contraste: '#f3eef0', detalle: '#4a3b33', ropa2: '#d98ea0', print: 'lunares' }, reference: 'Tapete cabeza de oso con anillos acolchados y hocico de rayas' }),
  card({ id: 'conejo', name: 'Cabeza de conejo', category: 'formas', generatorId: 'tapete-conejo', params: {},
    description: 'Conejo de 150 cm con orejas de 80 cm y cabeza de 100 cm, acolchado en franjas. La cara es propia: nariz, mejillas y boca bordada.', tags: ['conejo', 'orejas', 'blanco'],
    colors: { piel: '#f7f4ef', ropa: '#f7f4ef', contraste: '#f2b8c6', detalle: '#2f3340', ropa2: '#f2b8c6' }, reference: 'Tapete conejo blanco de 150 × 100 cm con orejas de 75 cm' }),
  card({ id: 'fresa', name: 'Fresa', category: 'formas', generatorId: 'tapete-fresa', params: {},
    description: 'Fresa de 100 cm con hojas y rabito aplicados y pepitas pespunteadas por todo el cuerpo.', tags: ['fresa', 'fruta', 'pepitas'],
    colors: { piel: '#ef9a8f', ropa: '#ef9a8f', contraste: '#f3ece0', detalle: '#7a3b33' }, reference: 'Tapete fresa acolchado con cáliz marrón' }),
  card({ id: 'flor', name: 'Flor de seis pétalos', category: 'naturaleza', generatorId: 'tapete-flor', params: {},
    description: 'Flor de 110 cm con pétalos redondos y acolchado radial desde el centro. De 5 a 8 pétalos.', tags: ['flor', 'pétalos', 'rosa'],
    colors: { piel: '#e7a3ad', ropa: '#e7a3ad', contraste: '#f3ece0', detalle: '#9b5562' }, reference: 'Tapetes flor rosa con acolchado radial' }),
  leafCard('hoja-corazon', 'Hoja acorazonada', 'acorazonada', 1200, '#f1b6a0', 'Hoja en corazón de 115 × 120 cm con nervio central y nervios curvos acolchados.', 'Tapete hoja acorazonada color melocotón'),
  leafCard('hoja-ovalada', 'Hoja ovalada', 'ovalada', 1300, '#9cb59a', 'Hoja ovalada de 99 × 130 cm con rabito y nervios que suben hacia la punta.', 'Tapetes hoja verde salvia con nervios'),
  leafCard('ginkgo', 'Hoja de ginkgo', 'ginkgo', 1270, '#e3b341', 'Abanico de ginkgo de 127 cm con muesca arriba, rabito y nervios en abanico.', 'Tapete ginkgo amarillo de 115 × 127 cm'),
  leafCard('hoja-festoneada', 'Hoja festoneada', 'festoneada', 1230, '#776a82', 'Hoja con el borde en ondas y nervios acolchados.', 'Tapete hoja festoneada morada de 123 × 98 cm'),
  leafCard('monstera', 'Hoja de monstera', 'monstera', 1150, '#4f7f52', 'Monstera de 115 cm con seis cortes de 7 cm de ancho, que se pueden voltear o ribetear.', 'Patrón de monstera dibujado en hojas numeradas'),
  card({ id: 'petalos-redondo', name: 'Redondo con pétalos', category: 'bordes', generatorId: 'tapete-petalos', params: { forma: 'redondo' },
    description: 'Centro acolchado de 90 cm rodeado de pétalos rellenos en telas variadas, que caben justos en todo el borde.', tags: ['pétalos', 'redondo', 'flor', 'reborde'],
    colors: { piel: '#f7f4ee', ropa: '#f7f4ee', contraste: '#f2c4cf', detalle: '#b9a9a0', ropa2: '#cfe3f0' }, reference: 'Tapete redondo blanco con pétalos de colores alrededor' }),
  card({ id: 'colchoneta-petalos', name: 'Colchoneta con pétalos', category: 'bordes', generatorId: 'tapete-petalos', params: { forma: 'rectangular', ancho: 700, largo: 1000 },
    description: 'Colchoneta de 70 × 100 cm con marco acolchado, pétalos rellenos alrededor y cabecero de media luna suelto.', tags: ['colchoneta', 'pétalos', 'cabecero', 'media luna'],
    colors: { piel: '#f3ece0', ropa: '#f3ece0', contraste: '#e9a1a1', detalle: '#b9a9a0', ropa2: '#f1d3a5' }, reference: 'Colchoneta con borde de pétalos y cabecero de media luna' }),
  card({ id: 'puzle', name: 'Puzle de cojines', category: 'bordes', generatorId: 'tapete-puzle', params: {},
    description: 'Nueve cojines de 35 cm que encajan como un puzle. Cada hueco lleva holgura para que la pestaña entre ya rellena.', tags: ['puzle', 'cojines', 'encajar', 'rompecabezas'],
    colors: { piel: '#efe6dc', ropa: '#efe6dc', contraste: '#e6b8b8', detalle: '#6b6b6b', ropa2: '#b9bcc0' }, reference: 'Cojines puzle de 3 × 3 con su plantilla' }),
  card({ id: 'sensorial-3', name: 'Sensorial de 3 × 3', category: 'sensoriales', generatorId: 'tapete-sensorial', params: { cuadros: 3 },
    description: 'Nueve cuadros de 30 cm: textura, etiquetas de cinta, anilla mordedora, nube que se levanta, orejas en un bolsillo, banderines, flor de pétalos y estrella crujiente.', tags: ['sensorial', 'cuadros', 'patchwork', 'etiquetas'],
    colors: { piel: '#dfe8f0', ropa: '#dfe8f0', contraste: '#c7d6e4', detalle: '#3b4a5a', ropa2: '#e9dccb' }, reference: 'Tapete sensorial azul de 3 × 3 con ribete' }),
  card({ id: 'sensorial-4', name: 'Sensorial de 4 × 4', category: 'sensoriales', generatorId: 'tapete-sensorial', params: { cuadros: 4 },
    description: 'Dieciséis cuadros con mariposa, zanahorias en un bolsillo, orejas, nube, hojas, banderines, flor, solapas con sorpresa, oruga, anilla y estrella.', tags: ['sensorial', 'cuadros', 'actividades'],
    colors: { piel: '#f7e1e6', ropa: '#f7e1e6', contraste: '#efc0cb', detalle: '#7a4b55', ropa2: '#fbf4f6' }, reference: 'Tapete de actividades rosa de 4 × 4 cuadros' }),
  card({ id: 'sensorial-hexagonal', name: 'Sensorial hexagonal', category: 'sensoriales', generatorId: 'tapete-sensorial-hexagonal', params: {},
    description: 'Hexágono de 120 cm en seis triángulos: rama con hojas, oruga, anilla, mariposa, solapas y flor.', tags: ['sensorial', 'hexágono', 'triángulos'],
    colors: { piel: '#cfe6e8', ropa: '#cfe6e8', contraste: '#a9d3d6', detalle: '#2f4a4c', ropa2: '#e4f1ef' }, reference: 'Tapete hexagonal azul con hojas, oruga y mordedores' })
];

export const PLAYMAT_CATEGORIES = (Object.keys(PLAYMAT_CATEGORY_LABEL) as PlaymatCategory[]).map(id => ({ id, label: PLAYMAT_CATEGORY_LABEL[id], count: PLAYMAT_CARDS.filter(c => c.category === id).length }));
