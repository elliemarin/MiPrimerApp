import { arcBand, around, blob, circle, curve, drop, ellipse, grow, inter, leaf, minus, pair, petals, poly, rect, regular, rrect, star, stroke, svg, turn, uni } from '../../lib/applique/shapes';
import { fig, range } from './common';

const dome = (cx: number, cy: number, rx: number, ry: number) => inter(ellipse(cx, cy, rx, ry), rect(cx - rx - 1, cy - ry - 1, 2 * rx + 2, ry + 3));
const halfDisk = (cx: number, cy: number, r: number) => inter(circle(cx, cy, r, 120), rect(cx - r - 1, cy, 2 * r + 2, r + 2));
const apple = minus(uni(circle(84, 114, 60), circle(116, 114, 60)), ellipse(100, 52, 14, 12), ellipse(100, 178, 12, 7));
const avocado = uni(circle(100, 132, 60), circle(100, 72, 42));
const balloon = uni(circle(100, 74, 64), poly([[50, 108], [150, 108], [118, 150], [82, 150]]));
const rocket = svg('M100 10 C130 40 136 100 128 160 L72 160 C64 100 70 40 100 10 Z');
const pineapple = ellipse(100, 130, 52, 66);
const banana = svg('M20 120 C40 170 130 180 180 110 C184 104 190 98 186 92 C176 94 172 100 166 106 C122 148 62 146 32 112 C28 108 18 112 20 120 Z');

export const EVERYDAY_FIGURES = [
  // ---------------------------------------------------------------- Casas y lugares
  fig('casita', 'Casita', 'casas', ['casa', 'hogar', 'infantil'], 150, 'Chimenea, pared, tejado, puerta, ventanas y césped.', [
    ['Chimenea', '#8c4a2f', rect(126, 30, 18, 44)], ['Pared', '#f2d5a0', rect(44, 90, 112, 100)], ['Tejado', '#c8372d', poly([[30, 98], [100, 34], [170, 98]])],
    ['Puerta', '#7a5230', rrect(86, 128, 28, 62, 12)], ['Ventanas', '#9fd3ef', uni(rect(56, 110, 22, 22), rect(122, 110, 22, 22))], ['Césped', '#5b9a48', rrect(20, 184, 160, 16, 8)]]),
  fig('casa-dos-pisos', 'Casa de dos pisos', 'casas', ['casa', 'ventanas', 'barrio'], 150, 'Pared, tejado con ventana redonda, cuatro ventanas, contraventanas, puerta y escalón.', [
    ['Pared', '#f3e6cc', rect(40, 70, 120, 124)], ['Tejado', '#3d6f9e', poly([[28, 78], [100, 20], [172, 78]])], ['Ventana del tejado', '#f6d55c', circle(100, 56, 10)],
    ['Contraventanas', '#3d6f9e', uni(rect(46, 88, 10, 28), rect(84, 88, 10, 28), rect(106, 88, 10, 28), rect(144, 88, 10, 28))], ['Ventanas', '#9fd3ef', uni(rect(56, 88, 28, 28), rect(116, 88, 28, 28), rect(56, 134, 28, 28), rect(116, 134, 28, 28))],
    ['Puerta', '#c8372d', rrect(88, 140, 24, 50, 4)], ['Escalón', '#9a9a9a', rect(82, 190, 36, 8)]]),
  fig('castillo', 'Castillo', 'casas', ['castillo', 'princesa', 'cuento'], 170, 'Torres con almenas, muralla, tejados, puerta en arco, ventanas y banderas.', [
    ['Banderas', '#d62828', pair(uni(rect(39, 4, 3, 16), poly([[42, 4], [60, 9], [42, 14]])))], ['Tejados', '#7b5ea7', pair(poly([[14, 66], [40, 16], [66, 66]]))],
    ['Torres', '#c9c3bb', uni(rect(20, 62, 40, 138), rect(140, 62, 40, 138))], ['Muralla', '#d9d4cc', minus(rect(56, 100, 88, 100), rect(66, 100, 12, 10), rect(94, 100, 12, 10), rect(122, 100, 12, 10))],
    ['Puerta', '#7a5230', uni(rect(84, 152, 32, 48), circle(100, 152, 16))], ['Ventanas', '#3d6f9e', uni(rrect(32, 92, 16, 26, 8), rrect(152, 92, 16, 26, 8))]]),
  fig('ciudad', 'Ciudad de noche', 'casas', ['ciudad', 'edificios', 'noche'], 200, 'Luna, cinco edificios que se solapan y ventanas encendidas.', [
    ['Luna', '#f6e7a5', circle(162, 36, 20)], ['Edificio 1', '#3b4a6b', rect(10, 90, 40, 110)], ['Edificio 2', '#4f6185', rect(42, 46, 46, 154)], ['Edificio 3', '#2c3a57', rect(82, 112, 40, 88)],
    ['Edificio 4', '#5b6f96', rect(114, 70, 40, 130)], ['Edificio 5', '#3b4a6b', rect(146, 104, 46, 96)],
    ['Ventanas', '#f6d55c', uni(...range(5).flatMap(r => [rect(52, 60 + r * 26, 10, 12), rect(68, 60 + r * 26, 10, 12)]), ...range(4).flatMap(r => [rect(124, 84 + r * 26, 9, 12), rect(138, 84 + r * 26, 9, 12)]), ...range(3).map(r => rect(20, 104 + r * 28, 10, 12)), ...range(3).map(r => rect(160, 118 + r * 26, 10, 12)))]]),
  fig('faro', 'Faro', 'casas', ['faro', 'mar', 'costa'], 150, 'Haz de luz, rocas, torre, franjas, linterna y techo.', [
    ['Luz', '#fbf0b5', uni(poly([[116, 50], [196, 22], [196, 76]]), poly([[84, 50], [4, 22], [4, 76]]))], ['Rocas', '#8a8f99', uni(blob(68, 186, 32, 3, 0.2, 1.4, 0.55), blob(132, 188, 32, 5, 0.2, 1.4, 0.55))],
    ['Torre', '#f7f3ea', poly([[76, 174], [124, 174], [112, 60], [88, 60]])], ['Franjas', '#d62828', inter(poly([[76, 174], [124, 174], [112, 60], [88, 60]]), uni(rect(0, 80, 200, 18), rect(0, 118, 200, 18), rect(0, 154, 200, 20)))],
    ['Linterna', '#f6d55c', rect(86, 38, 28, 24)], ['Techo', '#d62828', poly([[78, 42], [100, 16], [122, 42]])]]),
  fig('molino', 'Molino de viento', 'casas', ['molino', 'campo', 'viento'], 150, 'Torre, aspas con velas, centro, puerta y ventana.', [
    ['Torre', '#e8d3b0', poly([[70, 196], [130, 196], [116, 70], [84, 70]])], ['Techo', '#8c4a2f', dome(100, 74, 20, 18)],
    ['Velas', '#f7f3ea', around(4, 100, 70, () => rect(104, 8, 20, 54), 45)], ['Aspas', '#7a5230', around(4, 100, 70, () => rrect(97, 6, 7, 64, 3), 45)], ['Centro', '#5c3f2b', circle(100, 70, 9)],
    ['Puerta', '#7a5230', rrect(90, 162, 20, 34, 10)], ['Ventana', '#9fd3ef', circle(100, 118, 9)]]),
  fig('casa-hongo', 'Casa de hongo', 'casas', ['hongo', 'cuento', 'duendes'], 150, 'Pared en forma de pie, tejado de sombrero con lunares, puerta y ventana.', [
    ['Pared', '#f3e6cc', svg('M64 100 C60 140 56 176 60 196 L140 196 C144 176 140 140 136 100 Z')], ['Tejado', '#c8372d', dome(100, 106, 86, 74)],
    ['Lunares', '#ffffff', uni(circle(60, 72, 10), circle(102, 52, 12), circle(142, 76, 9), circle(84, 92, 7))], ['Puerta', '#7a5230', uni(rect(88, 160, 24, 36), circle(100, 160, 12))], ['Ventana', '#9fd3ef', circle(124, 138, 10)]]),
  fig('carpa-circo', 'Carpa de circo', 'casas', ['circo', 'fiesta', 'rayas'], 170, 'Carpa, franjas, techo, banderín y entrada.', [
    ['Banderín', '#f6d55c', uni(rect(98, 4, 4, 24), poly([[102, 4], [124, 10], [102, 16]]))], ['Carpa', '#f7f3ea', poly([[24, 190], [176, 190], [168, 96], [32, 96]])],
    ['Franjas', '#d62828', inter(poly([[24, 190], [176, 190], [168, 96], [32, 96]]), uni(...range(4).map(i => rect(40 + i * 36, 90, 18, 110))))], ['Techo', '#d62828', poly([[18, 100], [100, 24], [182, 100]])],
    ['Entrada', '#2c3a57', svg('M80 190 L80 150 C80 132 120 132 120 150 L120 190 Z')]]),

  // ---------------------------------------------------------------- Frutas y verduras
  fig('manzana-vichy', 'Manzana de vichy', 'frutas', ['manzana', 'vichy', 'escuela'], 120, 'Rabito, manzana de dos lóbulos y hoja. Queda preciosa en vichy o en rayas.', [
    ['Rabito', '#4a3a3a', turn(rrect(95, 14, 11, 34, 3), 12, 100, 40)], ['Manzana', '#d94a5c', apple, 'vichy'], ['Hoja', '#2c4a3e', leaf(104, 44, 152, 28, 24, -0.1), 'cuadros']]),
  fig('manzana-rayas', 'Manzana de rayas', 'frutas', ['manzana', 'rayas', 'escuela'], 120, 'La misma manzana en tela de rayas, con hoja y rabito.', [
    ['Rabito', '#3a3a4a', turn(rrect(95, 14, 11, 34, 3), 12, 100, 40)], ['Manzana', '#c8372d', apple, 'rayas'], ['Hoja', '#b9c7b4', leaf(104, 44, 152, 28, 24, -0.1), 'cuadros']]),
  fig('pera', 'Pera', 'frutas', ['pera', 'fruta', 'otoño'], 110, 'Pera, brillo, rabito y hoja.', [
    ['Rabito', '#6b4423', curve([[100, 56], [102, 36], [110, 20]], 6)], ['Pera', '#b5c95a', uni(circle(100, 140, 48), circle(100, 86, 30), poly([[72, 96], [128, 96], [146, 130], [54, 130]]))],
    ['Brillo', '#d7e39a', ellipse(80, 130, 10, 22, 15)], ['Hoja', '#5b9a48', leaf(106, 32, 150, 20, 22, -0.1)]]),
  fig('sandia', 'Rodaja de sandía', 'frutas', ['sandía', 'verano', 'fruta'], 180, 'Cáscara, franja blanca, pulpa y semillas en cuatro profundidades.', [
    ['Cáscara', '#2f7d4f', halfDisk(100, 40, 96)], ['Franja blanca', '#eef4d8', halfDisk(100, 40, 84)], ['Pulpa', '#ef5b6b', halfDisk(100, 40, 74)],
    ['Semillas', '#2b1d14', uni(...[[70, 70], [100, 80], [130, 70], [86, 100], [114, 100], [100, 120], [56, 52], [144, 52]].map(([x, y]) => drop(x, y, 4, 9, 90)))]]),
  fig('fresa', 'Fresa', 'frutas', ['fresa', 'fruta', 'roja'], 110, 'Fresa, semillas, hojas y rabito.', [
    ['Fresa', '#e63946', svg('M100 192 C60 160 30 110 40 72 C60 52 140 52 160 72 C170 110 140 160 100 192 Z')],
    ['Semillas', '#f6e27a', uni(...[[70, 90], [100, 86], [130, 90], [84, 116], [116, 116], [100, 142], [70, 132], [130, 132], [100, 168]].map(([x, y]) => ellipse(x, y, 3.5, 5)))],
    ['Hojas', '#3f8f4a', uni(star(100, 64, 6, 12, 40), circle(100, 62, 14))], ['Rabito', '#3f8f4a', curve([[100, 56], [102, 34], [110, 24]], 7)]]),
  fig('naranja', 'Rodaja de naranja', 'frutas', ['naranja', 'cítrico', 'rodaja'], 140, 'Cáscara, piel blanca y diez gajos.', [
    ['Cáscara', '#f28c38', circle(100, 100, 90)], ['Piel blanca', '#fbeedc', circle(100, 100, 80)], ['Gajos', '#f6a94b', around(10, 100, 100, () => arcBand(100, 100, 7, 73, -15, 15))]]),
  fig('limon', 'Rodaja de limón', 'frutas', ['limón', 'cítrico', 'rodaja'], 140, 'Cáscara, piel blanca y ocho gajos.', [
    ['Cáscara', '#e9c932', circle(100, 100, 90)], ['Piel blanca', '#fdf7dc', circle(100, 100, 80)], ['Gajos', '#f6e27a', around(8, 100, 100, () => arcBand(100, 100, 7, 73, -19, 19))]]),
  fig('zanahoria', 'Zanahoria', 'frutas', ['zanahoria', 'verdura', 'huerto'], 100, 'Hojas, zanahoria y rayitas.', [
    ['Hojas', '#3f8f4a', uni(leaf(100, 52, 76, 4, 20, -0.05), leaf(100, 52, 100, 0, 20), leaf(100, 52, 124, 6, 20, 0.05))], ['Zanahoria', '#f28c38', svg('M70 50 C80 44 120 44 130 50 C134 90 110 150 100 196 C90 150 66 90 70 50 Z')],
    ['Rayitas', '#d9672b', uni(stroke([[82, 82], [100, 80]], 5), stroke([[104, 112], [118, 110]], 5), stroke([[88, 142], [100, 140]], 5))]]),
  fig('aguacate', 'Medio aguacate', 'frutas', ['aguacate', 'palta', 'verde'], 120, 'Cáscara, pulpa, hueso y brillo.', [
    ['Cáscara', '#2f5d3a', avocado], ['Pulpa', '#c9e29a', grow(avocado, 0.86, 100, 110)], ['Hueso', '#8a5a3c', circle(100, 136, 28)], ['Brillo', '#b07a55', circle(91, 127, 7)]]),
  fig('pina', 'Piña', 'frutas', ['piña', 'tropical', 'fruta'], 120, 'Hojas, piña y escamas en rombo.', [
    ['Hojas', '#3f8f4a', uni(leaf(100, 72, 100, 0, 26), leaf(100, 72, 70, 10, 24, -0.1), leaf(100, 72, 130, 10, 24, 0.1), leaf(100, 72, 50, 32, 20, -0.1), leaf(100, 72, 150, 32, 20, 0.1))],
    ['Piña', '#f2b84b', pineapple], ['Escamas', '#d9922b', inter(grow(pineapple, 0.9, 100, 130), uni(...range(5).flatMap(r => range(5).map(c => regular(60 + c * 20 + (r % 2) * 10, 84 + r * 22, 8, 4, 0)))))]]),
  fig('cerezas', 'Par de cerezas', 'frutas', ['cerezas', 'fruta', 'roja'], 120, 'Rabitos, hoja, dos cerezas y brillos.', [
    ['Rabitos', '#6b4423', uni(curve([[70, 140], [86, 80], [110, 40]], 5), curve([[132, 140], [124, 90], [110, 40]], 5))], ['Hoja', '#3f8f4a', leaf(110, 40, 162, 30, 26, -0.1)],
    ['Cereza izquierda', '#d62828', circle(70, 152, 32)], ['Cereza derecha', '#a4161a', circle(134, 152, 32)], ['Brillos', '#ffffff', uni(ellipse(58, 140, 6, 10, 30), ellipse(122, 140, 6, 10, 30))]]),
  fig('calabaza', 'Calabaza', 'frutas', ['calabaza', 'otoño', 'halloween'], 150, 'Tallo, gajos laterales, gajo central y hoja.', [
    ['Tallo', '#6b4423', rrect(92, 22, 16, 32, 4)], ['Gajos de los lados', '#d9672b', uni(ellipse(58, 118, 46, 62), ellipse(142, 118, 46, 62))], ['Gajo central', '#f28c38', ellipse(100, 118, 40, 66)],
    ['Hoja', '#3f8f4a', leaf(108, 40, 162, 28, 24, -0.1)]]),
  fig('uvas', 'Racimo de uvas', 'frutas', ['uvas', 'racimo', 'morado'], 120, 'Rabito, hoja, uvas de atrás y de delante.', [
    ['Rabito', '#6b4423', curve([[100, 46], [104, 24], [116, 12]], 6)], ['Hoja', '#5b9a48', petals(132, 36, 5, 10, 26, 0, 0.8)],
    ['Uvas de atrás', '#5e3a7e', uni(...[[76, 64], [104, 60], [130, 66], [88, 92], [118, 92], [102, 122], [76, 118], [126, 120], [100, 150]].map(([x, y]) => circle(x, y, 16)))],
    ['Uvas de delante', '#8a5ab0', uni(...[[90, 78], [116, 78], [104, 104], [90, 134], [114, 136], [102, 170]].map(([x, y]) => circle(x, y, 15)))]]),
  fig('brocoli', 'Brócoli', 'frutas', ['brócoli', 'verdura', 'verde'], 120, 'Tallo, ramilletes y luces.', [
    ['Tallo', '#a6c97a', poly([[86, 110], [114, 110], [124, 194], [76, 194]])], ['Ramilletes', '#2f7d4f', uni(circle(64, 84, 32), circle(100, 64, 36), circle(138, 84, 32), circle(100, 104, 30))],
    ['Luces', '#57a35c', uni(circle(56, 74, 12), circle(96, 50, 13), circle(140, 74, 12))]]),
  fig('berenjena', 'Berenjena', 'frutas', ['berenjena', 'verdura', 'morado'], 120, 'Berenjena curva, cáliz y rabito.', [
    ['Berenjena', '#5e3a7e', svg('M70 60 C40 80 30 140 60 180 C90 210 150 196 160 160 C170 120 130 110 112 70 C100 44 80 50 70 60 Z')], ['Brillo', '#8a5ab0', ellipse(70, 140, 9, 26, 20)],
    ['Cáliz', '#3f8f4a', uni(star(88, 62, 6, 10, 30, -60), circle(88, 60, 13))], ['Rabito', '#3f8f4a', curve([[86, 52], [80, 30], [70, 18]], 8)]]),
  fig('tomate', 'Tomate', 'frutas', ['tomate', 'verdura', 'rojo'], 120, 'Tomate, brillo, cáliz y rabito.', [
    ['Tomate', '#e63946', blob(100, 112, 72, 3, 0.06, 1, 0.88)], ['Brillo', '#f28b82', ellipse(70, 92, 10, 18, 30)], ['Cáliz', '#3f8f4a', star(100, 52, 6, 8, 32)], ['Rabito', '#3f8f4a', curve([[100, 50], [102, 30], [112, 22]], 7)]]),
  fig('platano', 'Plátano', 'frutas', ['plátano', 'banana', 'amarillo'], 140, 'Plátano en media luna, raya y puntas.', [
    ['Plátano', '#f6d55c', banana], ['Sombra', '#e9b92b', inter(banana, svg('M20 120 C40 170 130 180 180 110 L180 140 L20 160 Z'))],
    ['Puntas', '#6b4423', uni(circle(22, 116, 7), turn(rrect(178, 78, 11, 20, 3), 25, 183, 88))]]),
  fig('elote', 'Elote (mazorca)', 'frutas', ['maíz', 'elote', 'México'], 100, 'Mazorca, granos y dos hojas que la envuelven.', [
    ['Mazorca', '#f2c94c', ellipse(100, 98, 30, 82)], ['Granos', '#f8e08e', inter(ellipse(100, 98, 27, 78), uni(...range(9).flatMap(r => range(3).map(c => rrect(76 + c * 17, 24 + r * 17, 13, 13, 5)))))],
    ['Hojas', '#5b9a48', pair(leaf(100, 196, 56, 70, 42, 0.12))]]),

  // ---------------------------------------------------------------- Juguetes
  fig('osito', 'Osito de peluche', 'juguetes', ['oso', 'peluche', 'bebé'], 150, 'Orejas, brazos, piernas, cuerpo, barriga, cabeza, hocico, nariz, ojos y plantas.', [
    ['Orejas', '#9b6a45', pair(circle(62, 40, 20))], ['Interior de orejas', '#e8c4a0', pair(circle(62, 40, 10))], ['Brazos', '#9b6a45', pair(ellipse(52, 118, 16, 30, -30))], ['Piernas', '#9b6a45', pair(ellipse(72, 176, 24, 22))],
    ['Cuerpo', '#b07a50', ellipse(100, 130, 46, 54)], ['Barriga', '#e8c4a0', ellipse(100, 138, 28, 32)], ['Cabeza', '#b07a50', circle(100, 70, 42)], ['Hocico', '#e8c4a0', ellipse(100, 86, 18, 14)],
    ['Nariz', '#3d2412', ellipse(100, 80, 8, 6)], ['Ojos', '#3d2412', pair(circle(84, 62, 5))], ['Plantas de los pies', '#e8c4a0', pair(circle(72, 180, 11))]]),
  fig('cohete', 'Cohete', 'juguetes', ['cohete', 'espacio', 'infantil'], 120, 'Llamas en dos capas, aletas, cuerpo, punta y ventana con cristal.', [
    ['Llamas', '#f28c38', drop(100, 168, 18, 44, 90)], ['Llama interior', '#f6d55c', drop(100, 166, 10, 30, 90)], ['Aletas', '#d62828', pair(poly([[72, 118], [38, 172], [78, 160]]))],
    ['Cuerpo', '#f7f3ea', rocket], ['Punta', '#d62828', inter(rocket, rect(0, 0, 200, 48))], ['Ventana', '#4f6185', circle(100, 84, 19)], ['Cristal', '#9fd3ef', circle(100, 84, 12)]]),
  fig('velero', 'Velero', 'juguetes', ['barco', 'velero', 'mar'], 160, 'Olas, casco, mástil, dos velas y bandera.', [
    ['Olas', '#5aa9c9', svg(`M0 170 ${range(5).map(k => `Q${k * 40 + 20} 156 ${k * 40 + 40} 170`).join(' ')} L200 196 L0 196 Z`)], ['Casco', '#8c4a2f', poly([[28, 140], [172, 140], [150, 174], [50, 174]])],
    ['Mástil', '#5c3f2b', rect(97, 28, 7, 114)], ['Vela grande', '#f7f3ea', poly([[106, 34], [106, 132], [172, 132]])], ['Vela pequeña', '#f2c94c', poly([[95, 52], [95, 132], [42, 132]])], ['Bandera', '#d62828', poly([[104, 28], [104, 12], [128, 20]])]]),
  fig('cometa', 'Cometa', 'juguetes', ['cometa', 'papalote', 'viento'], 150, 'Cometa, dos cuartos en contraste, cola y lazos.', [
    ['Cola', '#5c3f2b', curve([[100, 150], [86, 170], [110, 186], [96, 200]], 4)], ['Lazos', '#e63946', uni(...[[90, 168], [106, 186]].map(([x, y]) => uni(ellipse(x - 8, y, 9, 5, 20), ellipse(x + 8, y, 9, 5, -20))))],
    ['Cometa', '#3d8bd9', poly([[100, 6], [160, 70], [100, 150], [40, 70]])], ['Cuartos', '#f6d55c', uni(poly([[100, 6], [160, 70], [100, 70]]), poly([[100, 70], [40, 70], [100, 150]]))]]),
  fig('robot', 'Robot', 'juguetes', ['robot', 'máquina', 'infantil'], 140, 'Antena, brazos, piernas, cuerpo, cabeza, ojos, boca, panel y botones.', [
    ['Antena', '#e63946', uni(stroke([[100, 30], [100, 10]], 5), circle(100, 9, 7))], ['Brazos', '#8a929e', pair(rrect(30, 96, 22, 56, 10))], ['Piernas', '#8a929e', pair(rect(72, 156, 22, 40))],
    ['Cuerpo', '#a3abb7', rrect(52, 86, 96, 76, 10)], ['Cabeza', '#c9cfd8', rrect(60, 28, 80, 54, 12)], ['Ojos', '#3d8bd9', pair(circle(82, 52, 9))], ['Boca', '#2c3a57', rrect(80, 66, 40, 8, 4)],
    ['Panel', '#f6d55c', rrect(70, 100, 60, 36, 6)], ['Botones', '#e63946', uni(circle(84, 148, 6), circle(100, 148, 6), circle(116, 148, 6))]]),
  fig('pelota-playa', 'Pelota de playa', 'juguetes', ['pelota', 'playa', 'verano'], 140, 'Pelota blanca, gajos de tres colores y centro.', [
    ['Pelota', '#f7f3ea', circle(100, 100, 90)], ['Gajos rojos', '#e63946', inter(circle(100, 100, 90), uni(arcBand(100, 100, 0, 100, -90, -30), arcBand(100, 100, 0, 100, 90, 150)))],
    ['Gajos azules', '#3d8bd9', inter(circle(100, 100, 90), uni(arcBand(100, 100, 0, 100, 30, 90), arcBand(100, 100, 0, 100, 210, 270)))], ['Centro', '#f6d55c', circle(100, 100, 16)]]),
  fig('matrioska', 'Matrioska', 'juguetes', ['matrioska', 'muñeca', 'folk'], 130, 'Cuerpo, cara, pelo, mejillas, ojos, delantal y flor.', [
    ['Cuerpo', '#c8372d', uni(circle(100, 70, 54), ellipse(100, 138, 64, 60))], ['Cara', '#fbe3c8', circle(100, 72, 32)], ['Pelo', '#7a3d1e', dome(100, 62, 32, 20)],
    ['Mejillas', '#f28b82', pair(circle(86, 84, 6))], ['Ojos', '#3d2412', pair(circle(88, 72, 3.5))], ['Delantal', '#fbeedc', ellipse(100, 146, 40, 40)], ['Flor', '#e63946', petals(100, 144, 6, 9, 24)], ['Centro de la flor', '#f6d55c', circle(100, 144, 7)]]),
  fig('coche', 'Coche', 'juguetes', ['coche', 'auto', 'carro'], 170, 'Techo, carrocería, ventanas, ruedas y tapacubos.', [
    ['Techo', '#c8372d', svg('M50 90 C60 50 140 50 150 90 Z')], ['Carrocería', '#e63946', rrect(14, 84, 172, 54, 18)], ['Ventanas', '#9fd3ef', uni(svg('M60 86 C64 64 96 62 96 62 L96 86 Z'), svg('M104 62 C104 62 136 64 140 86 L104 86 Z'))],
    ['Ruedas', '#2c2c2c', uni(circle(52, 140, 22), circle(148, 140, 22))], ['Tapacubos', '#c9cfd8', uni(circle(52, 140, 9), circle(148, 140, 9))], ['Faros', '#f6d55c', uni(circle(176, 100, 7), circle(24, 100, 6))]]),
  fig('globo-aerostatico', 'Globo aerostático', 'juguetes', ['globo', 'viaje', 'cielo'], 120, 'Globo, gajos de color, cuerdas y canasta.', [
    ['Cuerdas', '#6b4423', uni(stroke([[86, 148], [90, 170]], 6), stroke([[114, 148], [110, 170]], 6))], ['Globo', '#e63946', balloon],
    ['Gajos', '#f6d55c', inter(balloon, uni(ellipse(100, 84, 22, 80), ellipse(36, 84, 14, 70), ellipse(164, 84, 14, 70)))], ['Canasta', '#8c4a2f', rrect(84, 166, 32, 26, 4)]]),
  fig('trompo', 'Trompo', 'juguetes', ['trompo', 'peonza', 'juego'], 110, 'Cuerpo, franjas, punta y asa.', [
    ['Asa', '#8c4a2f', rrect(92, 10, 16, 32, 6)], ['Cuerpo', '#f2c94c', svg('M30 70 C30 50 170 50 170 70 C170 110 120 150 100 176 C80 150 30 110 30 70 Z')],
    ['Franjas', '#3d8bd9', inter(svg('M30 70 C30 50 170 50 170 70 C170 110 120 150 100 176 C80 150 30 110 30 70 Z'), uni(rect(0, 72, 200, 14), rect(0, 104, 200, 12)))], ['Punta', '#5c3f2b', poly([[90, 166], [110, 166], [100, 196]])]]),
  fig('barco-papel', 'Barco de papel', 'juguetes', ['barco', 'papel', 'origami'], 150, 'Barco plegado en tres tonos: vela, laterales y casco.', [
    ['Vela', '#f7f3ea', poly([[100, 20], [140, 110], [60, 110]])], ['Lateral izquierdo', '#d9d4cc', poly([[20, 110], [60, 110], [80, 160], [40, 160]])], ['Lateral derecho', '#d9d4cc', poly([[140, 110], [180, 110], [160, 160], [120, 160]])],
    ['Casco', '#9fd3ef', poly([[40, 110], [160, 110], [140, 160], [60, 160]])], ['Agua', '#3d8bd9', svg(`M0 170 ${range(5).map(k => `Q${k * 40 + 20} 156 ${k * 40 + 40} 170`).join(' ')} L200 192 L0 192 Z`)]])
];

