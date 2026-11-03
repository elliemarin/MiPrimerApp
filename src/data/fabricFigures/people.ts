import { arcBand, blob, circle, curve, drop, ellipse, heart, inter, leaf, minus, pair, poly, rect, rrect, star, stroke, svg, turn, uni, wavy } from '../../lib/applique/shapes';
import { fig, range } from './common';

const SKIN = ['#f3d2b3', '#d9a47c', '#a86f4a', '#7a4a2e'];
const EYE = leaf(20, 100, 180, 100, 92);
const lashes = (cx: number, cy: number, rx: number, ry: number) => uni(...range(7).map(i => {
  const a = Math.PI * (0.18 + (i / 6) * 0.64), x = cx - Math.cos(a) * rx, y = cy - Math.sin(a) * ry;
  return stroke([[x, y + 4], [x - Math.cos(a) * 14, y - Math.sin(a) * 18]], 6);
}));
const mask = svg('M10 90 C20 60 70 62 100 80 C130 62 180 60 190 90 C196 120 160 140 130 128 C116 122 108 112 100 112 C92 112 84 122 70 128 C40 140 4 120 10 90 Z');

export const PEOPLE_FIGURES = [
  // ---------------------------------------------------------------- Caras y ojos
  fig('ojo', 'Ojo con pestañas', 'caras', ['ojo', 'mirada', 'pestañas'], 170, 'Pestañas, blanco del ojo, iris en dos tonos, pupila y brillo.', [
    ['Pestañas', '#2b1d14', lashes(100, 100, 74, 44)], ['Blanco del ojo', '#ffffff', EYE], ['Iris', '#2a7f86', inter(circle(100, 100, 37), EYE)], ['Iris claro', '#5fbfb9', circle(100, 100, 26)],
    ['Pupila', '#141414', circle(100, 100, 13)], ['Brillo', '#ffffff', circle(110, 90, 6)]]),
  fig('ojo-psicodelico', 'Ojo psicodélico', 'caras', ['ojo', 'psicodélico', 'setentas'], 180, 'Rayos, ojo, tres anillos ondulados de iris y pupila en estrella.', [
    ['Rayos', '#d63384', star(100, 100, 16, 58, 98)], ['Ojo', '#fff4d6', leaf(12, 100, 188, 100, 100)], ['Anillo morado', '#6a4c93', inter(wavy(100, 100, 44, 4, 9), leaf(12, 100, 188, 100, 100))],
    ['Anillo naranja', '#f28c38', wavy(100, 100, 34, 3.5, 9, 0.35)], ['Anillo turquesa', '#1fb5a8', wavy(100, 100, 25, 3, 9, 0.7)], ['Pupila', '#141414', star(100, 100, 8, 8, 16)]]),
  fig('ojo-lagrima', 'Ojo que llora', 'caras', ['ojo', 'lágrima', 'emoción'], 150, 'Párpado, ojo, iris, pupila, brillo y dos lágrimas.', [
    ['Párpado', SKIN[0], leaf(14, 92, 186, 92, 110, -0.05)], ['Blanco del ojo', '#ffffff', leaf(24, 100, 176, 100, 76)], ['Iris', '#6b4a33', inter(circle(100, 102, 30), leaf(24, 100, 176, 100, 76))],
    ['Pupila', '#141414', circle(100, 102, 12)], ['Brillo', '#ffffff', circle(108, 94, 5)], ['Lágrimas', '#7fc4ea', uni(drop(72, 158, 10, 24), drop(60, 194, 7, 16))]]),
  fig('cara-sonriente', 'Cara sonriente', 'caras', ['sonrisa', 'feliz', 'emoji'], 140, 'Cara, mejillas, ojos y sonrisa.', [
    ['Cara', '#f6c945', circle(100, 100, 90)], ['Mejillas', '#f28b82', pair(circle(56, 116, 13))], ['Ojos', '#3d2412', pair(ellipse(70, 78, 9, 14))], ['Sonrisa', '#3d2412', arcBand(100, 106, 40, 52, 22, 158)]]),
  fig('cara-nina', 'Cara de niña con lazo', 'caras', ['niña', 'retrato', 'lazo'], 150, 'Pelo largo, cara, flequillo, mejillas, ojos, boca y lazo.', [
    ['Pelo de atrás', '#6b3e1f', uni(circle(100, 96, 76), rect(24, 96, 152, 96))], ['Cara', SKIN[0], ellipse(100, 108, 54, 62)], ['Flequillo', '#7a4a2e', inter(ellipse(100, 98, 60, 66), rect(30, 30, 140, 48))],
    ['Mejillas', '#f28b82', pair(circle(74, 124, 9))], ['Ojos', '#3d2412', pair(ellipse(80, 104, 5, 7))], ['Boca', '#d9536e', leaf(88, 142, 112, 142, 10, 0.1)],
    ['Lazo', '#d62828', uni(ellipse(126, 34, 20, 12, -20), ellipse(160, 26, 20, 12, 20), circle(143, 30, 8))]]),
  fig('luna-cara', 'Luna dormilona', 'caras', ['luna', 'noche', 'dormir'], 140, 'Luna creciente con ojo cerrado, mejilla y gorro con borla.', [
    ['Luna', '#f4d35e', minus(circle(96, 104, 76), circle(132, 86, 64))], ['Gorro', '#3d6f9e', poly([[40, 44], [116, 26], [166, 6], [120, 40], [70, 70]])], ['Borla', '#ffffff', circle(166, 8, 10)],
    ['Ojo cerrado', '#7a5a1e', arcBand(58, 100, 7, 12, 10, 170)], ['Mejilla', '#f28b82', circle(50, 126, 9)]]),
  fig('cara-cubista', 'Cara cubista', 'caras', ['cubismo', 'retrato', 'arte'], 160, 'Cara partida en planos de color, un ojo de frente y otro de perfil, nariz, boca y pelo.', [
    ['Pelo', '#2c3a57', poly([[34, 46], [150, 14], [172, 64], [60, 76]])], ['Cara', '#e3b58c', ellipse(100, 108, 60, 80)], ['Mitad oscura', '#b07a55', inter(ellipse(100, 108, 60, 80), poly([[104, 20], [200, 20], [200, 200], [112, 200]]))],
    ['Ojo de frente', '#ffffff', leaf(54, 92, 94, 92, 20)], ['Pupila', '#2c3a57', circle(74, 92, 6)], ['Ojo de perfil', '#f6d55c', poly([[114, 84], [146, 94], [114, 102]])],
    ['Nariz', '#d9822b', poly([[102, 96], [126, 146], [96, 146]])], ['Boca', '#c8372d', leaf(76, 166, 120, 162, 14, 0.05)]]),
  fig('perfil-cabello', 'Perfil con cabello en capas', 'caras', ['perfil', 'mujer', 'silueta'], 160, 'Cabello de atrás, rostro de perfil, cabello de delante en ondas, ojo y labios.', [
    ['Cabello de atrás', '#6b3e1f', blob(118, 92, 72, 8, 0.2)], ['Rostro', SKIN[1], svg('M90 30 C60 34 50 60 54 80 C46 92 40 100 46 104 C50 106 52 108 50 114 C54 118 56 120 52 126 C58 132 56 140 64 146 C76 152 90 150 96 162 L110 190 L140 190 C130 160 126 120 130 90 C134 50 118 28 90 30 Z')],
    ['Cabello de delante', '#8a5a3c', svg('M88 26 C130 14 170 40 168 90 C166 130 150 170 170 196 C140 190 128 150 132 110 C136 76 120 50 92 46 Z')], ['Ojo', '#2b1d14', leaf(66, 80, 82, 82, 6)], ['Labios', '#c8372d', leaf(48, 116, 60, 118, 7)]]),
  fig('antifaz', 'Antifaz de carnaval', 'caras', ['antifaz', 'carnaval', 'fiesta'], 170, 'Plumas, antifaz con ojos calados, aro dorado de los ojos y brillos.', [
    ['Plumas', '#1fb5a8', uni(leaf(150, 76, 190, 6, 24, 0.1), leaf(150, 76, 160, 0, 22), leaf(150, 76, 130, 4, 20, -0.1))], ['Antifaz', '#6a4c93', minus(mask, pair(ellipse(68, 98, 20, 12, -10)))],
    ['Aros de los ojos', '#e9c46a', pair(minus(ellipse(68, 98, 26, 17, -10), ellipse(68, 98, 20, 12, -10)))], ['Brillos', '#f6d55c', uni(star(100, 92, 4, 3, 10), star(40, 126, 4, 3, 8), star(160, 126, 4, 3, 8))]]),
  fig('labios', 'Labios', 'caras', ['boca', 'labios', 'beso'], 140, 'Labio de arriba, labio de abajo y brillo.', [
    ['Labio de arriba', '#c8102e', svg('M10 100 C40 70 70 50 100 72 C130 50 160 70 190 100 C150 104 120 108 100 104 C80 108 50 104 10 100 Z')],
    ['Labio de abajo', '#e23a5a', svg('M12 102 C50 106 80 112 100 108 C120 112 150 106 188 102 C160 150 40 150 12 102 Z')], ['Brillo', '#ffd6de', ellipse(124, 124, 14, 5, -8)]]),
  fig('gafas-bigote', 'Gafas y bigote', 'caras', ['bigote', 'gafas', 'disfraz'], 170, 'Montura de gafas, cristales, puente y bigote.', [
    ['Cristales', '#bfe3f5', pair(circle(62, 70, 33))], ['Montura', '#1f1f1f', uni(pair(minus(circle(62, 70, 38), circle(62, 70, 30))), rect(96, 64, 8, 10))],
    ['Bigote', '#5c3f2b', uni(pair(svg('M100 130 C90 120 70 116 50 124 C34 130 20 128 14 118 C18 146 52 152 72 146 C88 142 96 138 100 136 Z')))]]),

  // ---------------------------------------------------------------- Cuerpo y figuras humanas
  fig('mano-corazon', 'Mano con corazón', 'cuerpo', ['mano', 'palma', 'amor'], 140, 'Mano abierta de una pieza y corazón en la palma.', [
    ['Mano', SKIN[1], uni(rrect(60, 96, 80, 90, 30), rrect(60, 34, 18, 80, 9), rrect(81, 20, 18, 90, 9), rrect(102, 24, 18, 86, 9), rrect(122, 42, 16, 70, 8), turn(rrect(28, 92, 18, 62, 9), -35, 40, 130))],
    ['Corazón', '#d62828', heart(100, 142, 42)]]),
  fig('huella-pie', 'Huella de pie', 'cuerpo', ['pie', 'huella', 'bebé'], 100, 'Planta del pie y cinco dedos.', [
    ['Planta', '#e9967a', uni(ellipse(100, 132, 40, 60), ellipse(106, 92, 44, 38))], ['Dedos', '#e9967a', uni(circle(74, 40, 14), circle(100, 32, 12), circle(121, 34, 11), circle(139, 43, 10), circle(153, 58, 9))]]),
  fig('corazon-anatomico', 'Corazón anatómico', 'cuerpo', ['corazón', 'anatomía', 'órgano'], 140, 'Venas, arterias, corazón, aurícula y vaso coronario.', [
    ['Arterias', '#c8102e', uni(rrect(86, 14, 18, 60, 9), curve([[110, 60], [116, 20], [150, 14], [160, 40]], 18))], ['Venas', '#3d6f9e', uni(rrect(62, 24, 16, 60, 8), rrect(132, 50, 16, 40, 8))],
    ['Corazón', '#d62839', svg('M100 190 C60 160 30 120 34 84 C38 54 70 46 92 62 C112 46 152 50 164 82 C176 120 140 160 100 190 Z')], ['Aurícula', '#a4161a', blob(132, 82, 26, 4, 0.15)],
    ['Vaso coronario', '#3d6f9e', curve([[118, 70], [106, 110], [116, 150]], 7)]]),
  fig('cerebro', 'Cerebro', 'cuerpo', ['cerebro', 'mente', 'anatomía'], 150, 'Tronco, dos hemisferios y circunvoluciones.', [
    ['Tronco', '#d98a9a', rrect(96, 130, 22, 50, 10)], ['Hemisferio izquierdo', '#f2a7b3', blob(74, 96, 58, 3, 0.12, 1, 0.82)], ['Hemisferio derecho', '#f6bcc5', blob(128, 96, 56, 5, 0.12, 1, 0.82)],
    ['Circunvoluciones', '#c96b7f', uni(curve([[40, 80], [56, 68], [62, 88], [80, 76], [86, 96]], 6), curve([[44, 112], [62, 104], [74, 120], [92, 110]], 6), curve([[114, 70], [130, 84], [142, 70], [160, 86]], 6), curve([[116, 110], [134, 100], [148, 116], [166, 106]], 6))]]),
  fig('pulmones', 'Pulmones', 'cuerpo', ['pulmones', 'respirar', 'anatomía'], 140, 'Tráquea, dos pulmones y bronquios.', [
    ['Tráquea', '#d9d4cc', uni(rrect(92, 10, 16, 70, 8))], ['Pulmón izquierdo', '#e88aa3', svg('M88 60 C60 50 30 80 30 130 C30 170 60 190 86 180 C96 150 96 90 88 60 Z')],
    ['Pulmón derecho', '#f4a7b9', svg('M112 60 C140 50 170 80 170 130 C170 170 140 190 114 180 C104 150 104 90 112 60 Z')], ['Bronquios', '#b85872', uni(curve([[100, 76], [80, 96], [64, 130]], 6), curve([[100, 76], [120, 96], [136, 130]], 6))]]),
  fig('bailarina', 'Figura bailando', 'cuerpo', ['danza', 'baile', 'silueta'], 150, 'Silueta en movimiento con falda de vuelo y pelo.', [
    ['Cuerpo', SKIN[2], uni(ellipse(102, 92, 18, 30), curve([[96, 74], [66, 54], [44, 24]], 13), curve([[108, 74], [138, 82], [170, 62]], 13), curve([[96, 130], [80, 162], [58, 194]], 15), curve([[108, 130], [128, 156], [158, 164]], 15))],
    ['Cabeza', SKIN[2], circle(106, 44, 18)], ['Pelo', '#2b1d14', blob(114, 36, 20, 4, 0.25)], ['Falda', '#e63946', svg('M84 104 L120 104 C150 120 168 140 160 150 C130 144 100 146 70 154 C60 140 70 116 84 104 Z')]]),
  fig('pareja-manos', 'Dos figuras de la mano', 'cuerpo', ['amistad', 'familia', 'figuras'], 170, 'Dos figuras con vestido y camisa, brazos unidos y un corazón.', [
    ['Brazos', SKIN[1], uni(stroke([[66, 80], [100, 104], [134, 80]], 10), stroke([[40, 80], [22, 120]], 10), stroke([[160, 80], [178, 120]], 10))], ['Piernas', SKIN[1], uni(rect(42, 150, 9, 40), rect(62, 150, 9, 40), rect(130, 150, 9, 40), rect(150, 150, 9, 40))],
    ['Vestido', '#e76f9b', poly([[56, 66], [70, 66], [92, 156], [34, 156]])], ['Camisa y pantalón', '#3d8bd9', uni(rrect(124, 64, 40, 54, 8), rect(126, 114, 36, 40))],
    ['Cabezas', SKIN[1], uni(circle(62, 44, 20), circle(144, 42, 20))], ['Pelo', '#6b3e1f', uni(inter(circle(62, 42, 23), rect(36, 16, 52, 18)), inter(circle(144, 38, 22), rect(120, 14, 50, 16)))], ['Corazón', '#d62828', heart(100, 132, 24)]]),
  fig('jengibre', 'Muñeco de jengibre', 'cuerpo', ['galleta', 'navidad', 'jengibre'], 130, 'Galleta, glaseado ondulado, botones, ojos y sonrisa.', [
    ['Galleta', '#b5713a', uni(circle(100, 44, 32), rrect(66, 66, 68, 74, 22), turn(rrect(22, 80, 60, 24, 12), -20, 52, 92), turn(rrect(118, 80, 60, 24, 12), 20, 148, 92), turn(rrect(62, 120, 26, 70, 13), 15, 75, 150), turn(rrect(112, 120, 26, 70, 13), -15, 125, 150))],
    ['Glaseado', '#ffffff', uni(curve([[30, 86], [36, 80], [42, 88], [48, 82]], 5), curve([[152, 82], [158, 88], [164, 80], [170, 86]], 5), curve([[60, 178], [66, 172], [72, 180], [78, 174]], 5), curve([[122, 174], [128, 180], [134, 172], [140, 178]], 5))],
    ['Botones', '#d62828', uni(circle(100, 90, 7), circle(100, 110, 7), circle(100, 130, 7))], ['Ojos', '#3d2412', pair(circle(88, 38, 5))], ['Sonrisa', '#ffffff', arcBand(100, 46, 13, 18, 25, 155)]]),
  fig('meditacion', 'Figura meditando', 'cuerpo', ['yoga', 'meditación', 'calma'], 160, 'Aura ondulada, cuerpo sentado, cabeza y tres puntos de color.', [
    ['Aura', '#f6e2a8', wavy(100, 108, 92, 5, 9)], ['Cuerpo', SKIN[3], uni(ellipse(100, 112, 24, 36), ellipse(100, 164, 72, 18), curve([[80, 92], [62, 128], [74, 150]], 13), curve([[120, 92], [138, 128], [126, 150]], 13))],
    ['Cabeza', SKIN[3], circle(100, 58, 19)], ['Puntos', '#7b5ea7', uni(circle(100, 92, 5), circle(100, 112, 5), circle(100, 132, 5))]]),
  fig('ojos-familia', 'Tres miradas', 'caras', ['ojos', 'collage', 'miradas'], 180, 'Tres ojos de distinto tamaño y color superpuestos en diagonal.', [
    ...[[60, 60, 0.6, '#2a7f86'], [110, 100, 0.75, '#6b4a33'], [150, 150, 0.5, '#3d6f9e']].flatMap(([x, y, s, c], i) => {
      const e = leaf(Number(x) - 80 * Number(s), Number(y), Number(x) + 80 * Number(s), Number(y), 92 * Number(s));
      return [[`Ojo ${i + 1}`, '#ffffff', e], [`Iris ${i + 1}`, String(c), inter(circle(Number(x), Number(y), 36 * Number(s)), e)], [`Pupila ${i + 1}`, '#141414', circle(Number(x), Number(y), 14 * Number(s))]] as [string, string, ReturnType<typeof leaf>][];
    })])
];

