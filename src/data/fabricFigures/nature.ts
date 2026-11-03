import { arcBand, around, blob, circle, curve, drop, ellipse, heart, inter, leaf, minus, petals, poly, rect, rrect, spiral, star, stroke, svg, turn, uni, wavy } from '../../lib/applique/shapes';
import { fig, range } from './common';

const G = { hoja: '#5b9a48', hojaOsc: '#3f7a36', hojaClara: '#8cc26b', tallo: '#4f8a3c' };
const cap = (cx: number, cy: number, rx: number, ry: number) => inter(ellipse(cx, cy, rx, ry), rect(cx - rx - 1, cy - ry - 1, 2 * rx + 2, ry + 3));
const cloud = (x: number, y: number, s: number) => uni(circle(x, y, 22 * s), circle(x + 26 * s, y - 8 * s, 26 * s), circle(x + 52 * s, y + 2 * s, 19 * s), rrect(x - 14 * s, y, 82 * s, 24 * s, 12 * s));

export const NATURE_FIGURES = [
  // ---------------------------------------------------------------- Flores
  fig('margarita', 'Margarita', 'flores', ['flor', 'primavera', 'blanca'], 150, 'Doce pétalos de una pieza, centro y corazón en dos capas.', [
    ['Pétalos', '#f7f3ea', petals(100, 100, 12, 30, 92)], ['Centro', '#f2c230', circle(100, 100, 32)], ['Corazón', '#e58a2b', circle(100, 100, 14)]]),
  fig('girasol', 'Girasol de doble corona', 'flores', ['flor', 'verano', 'amarillo'], 180, 'Dos coronas de pétalos desfasadas para dar volumen, centro y semillas en capas.', [
    ['Pétalos de atrás', '#d99418', petals(100, 100, 16, 46, 96, 11.25, 0.55)], ['Pétalos de delante', '#f5c518', petals(100, 100, 16, 44, 84, 0, 0.55)],
    ['Centro', '#6b3e1f', circle(100, 100, 44)], ['Semillas', '#3d2412', wavy(100, 100, 30, 3, 12)], ['Brillo', '#8a5a2b', circle(90, 90, 9)]]),
  fig('tulipan', 'Tulipán', 'flores', ['flor', 'tallo', 'primavera'], 120, 'Tallo, dos hojas y cuatro pétalos superpuestos.', [
    ['Tallo', G.tallo, curve([[100, 110], [102, 160], [98, 198]], 9)], ['Hoja izquierda', G.hoja, leaf(98, 196, 52, 120, 30, -0.12)], ['Hoja derecha', G.hojaOsc, leaf(102, 196, 150, 135, 26, 0.1)],
    ['Pétalo de atrás', '#a52a3c', ellipse(100, 64, 48, 42)], ['Pétalo izquierdo', '#c43a4b', leaf(100, 122, 58, 36, 48, 0.08)], ['Pétalo derecho', '#c43a4b', leaf(100, 122, 142, 36, 48, -0.08)],
    ['Pétalo central', '#e0566a', drop(100, 92, 28, 66, -90)]]),
  fig('rosa-espiral', 'Rosa en espiral', 'flores', ['flor', 'amor', 'roja'], 150, 'Tres coronas de pétalos ondulados y una espiral central.', [
    ['Hojas', G.hojaOsc, uni(leaf(100, 120, 24, 170, 40, 0.1), leaf(100, 120, 176, 170, 40, -0.1))], ['Pétalos de fuera', '#b8323f', blob(100, 95, 62, 3, 0.22)],
    ['Pétalos del medio', '#d2475a', blob(100, 92, 44, 7, 0.24)], ['Pétalos de dentro', '#e8667a', blob(102, 90, 28, 11, 0.26)], ['Espiral', '#8f1f2f', spiral(102, 90, 3, 20, 2.2, 6)]]),
  fig('flor-cinco', 'Flor de cinco pétalos en capas', 'flores', ['flor', 'sencilla', 'infantil'], 140, 'Dos coronas de cinco pétalos giradas, centro y punto.', [
    ['Pétalos grandes', '#7fb3d5', petals(100, 100, 5, 30, 95)], ['Pétalos pequeños', '#f2d7e8', petals(100, 100, 5, 22, 62, 36)], ['Centro', '#f4c542', circle(100, 100, 22)], ['Punto', '#e07a5f', circle(100, 100, 9)]]),
  fig('amapola', 'Amapola', 'flores', ['flor', 'roja', 'campo'], 140, 'Cuatro pétalos en dos capas con centro negro.', [
    ['Tallo', G.tallo, curve([[100, 120], [96, 160], [104, 198]], 7)], ['Pétalos de atrás', '#c62828', uni(blob(70, 80, 40, 1), blob(130, 80, 40, 2))],
    ['Pétalos de delante', '#e53935', uni(blob(75, 108, 40, 3, 0.15), blob(125, 108, 40, 4, 0.15))], ['Centro', '#212121', circle(100, 95, 18)], ['Botón', '#6b8e23', circle(100, 95, 8)]]),
  fig('cala', 'Cala (alcatraz)', 'flores', ['flor', 'blanca', 'elegante'], 130, 'Espata blanca, espádice, tallo y hoja.', [
    ['Tallo', G.tallo, curve([[104, 120], [100, 200]], 10)], ['Hoja', G.hoja, leaf(100, 198, 155, 110, 34, -0.1)],
    ['Espata', '#f5f1e6', svg('M100 130 C60 110 40 60 70 20 C90 40 130 40 150 30 C150 80 130 115 100 130 Z')], ['Espádice', '#f2c230', leaf(100, 118, 106, 52, 12)]]),
  fig('hibisco', 'Hibisco', 'flores', ['flor', 'tropical', 'rosa'], 150, 'Cinco pétalos, mancha central y estambre.', [
    ['Pétalos', '#e4577b', petals(100, 100, 5, 35, 92, 18, 0.7)], ['Centro', '#9e1b42', petals(100, 100, 5, 10, 34, 18, 1)],
    ['Estambre', '#f6d55c', stroke([[100, 100], [128, 62]], 7)], ['Polen', '#e9883a', circle(130, 58, 9)]]),
  fig('flor-power', 'Flor hippie', 'flores', ['flor', 'setentas', 'colores'], 150, 'Dos coronas de ocho pétalos, anillo ondulado y centro.', [
    ['Pétalos de fuera', '#ff6f61', petals(100, 100, 8, 40, 95)], ['Pétalos de dentro', '#ffb347', petals(100, 100, 8, 30, 72, 22.5)],
    ['Anillo', '#ffe066', wavy(100, 100, 34, 4, 10)], ['Centro', '#6a4c93', circle(100, 100, 20)], ['Punto', '#1982c4', circle(100, 100, 8)]]),
  fig('lavanda', 'Ramillete de lavanda', 'flores', ['lavanda', 'ramo', 'morado'], 120, 'Tres espigas, tallos y un lazo.', [
    ['Tallos', G.tallo, uni(curve([[72, 190], [78, 110], [70, 45]], 5), curve([[100, 195], [100, 100], [100, 32]], 5), curve([[128, 190], [122, 110], [132, 48]], 5))],
    ['Espiga izquierda', '#8e7cc3', uni(...range(6).map(i => ellipse(70 + i * 1.4, 44 + i * 12, 9, 7)))], ['Espiga central', '#a08fd0', uni(...range(7).map(i => ellipse(100, 30 + i * 12, 9, 7)))],
    ['Espiga derecha', '#7a68b0', uni(...range(6).map(i => ellipse(132 - i * 1.6, 47 + i * 12, 9, 7)))], ['Lazo', '#f2d7e8', uni(ellipse(84, 160, 17, 9, 20), ellipse(116, 160, 17, 9, -20), circle(100, 160, 7))]]),
  fig('maceta-flores', 'Maceta con tres flores', 'flores', ['maceta', 'flores', 'jardín'], 140, 'Maceta con borde, tallos, hojas y tres flores con centro.', [
    ['Tallos', G.tallo, uni(curve([[100, 140], [80, 70]], 5), curve([[100, 140], [100, 55]], 5), curve([[100, 140], [122, 75]], 5))], ['Hojas', G.hoja, uni(leaf(97, 122, 60, 104, 18), leaf(103, 120, 142, 100, 18))],
    ['Maceta', '#c9693a', poly([[60, 140], [140, 140], [128, 198], [72, 198]])], ['Borde de la maceta', '#a9522b', rrect(54, 132, 92, 18, 4)],
    ['Flor rosa', '#ef8fb0', petals(80, 68, 6, 9, 20)], ['Flor amarilla', '#f4c542', petals(100, 52, 5, 10, 22)], ['Flor azul', '#7fb3d5', petals(122, 74, 8, 8, 18)],
    ['Centros', '#ffffff', uni(circle(80, 68, 6), circle(100, 52, 7), circle(122, 74, 5))]]),
  fig('loto', 'Flor de loto', 'flores', ['loto', 'agua', 'calma'], 170, 'Pétalos en tres profundidades sobre el agua.', [
    ['Agua', '#5aa9c9', ellipse(100, 168, 92, 20)], ['Pétalos de atrás', '#e88aa3', uni(leaf(100, 152, 26, 82, 40, 0.05), leaf(100, 152, 174, 82, 40, -0.05))],
    ['Pétalos del medio', '#f4a7b9', uni(leaf(100, 152, 56, 56, 42), leaf(100, 152, 144, 56, 42))], ['Pétalo central', '#fbe3e8', leaf(100, 152, 100, 40, 48)], ['Cáliz', G.hoja, ellipse(100, 154, 44, 10)]]),
  fig('flor-cerezo', 'Flor de cerezo', 'flores', ['sakura', 'rosa', 'primavera'], 130, 'Cinco pétalos con muesca, centro y estambres.', [
    ['Pétalos', '#f6c1cf', around(5, 100, 100, () => heart(100, 60, 58))], ['Centro', '#e97a9b', circle(100, 100, 17)], ['Estambres', '#f9e076', around(5, 100, 100, () => circle(100, 80, 5), 36)]]),
  fig('ramo-silvestre', 'Ramo silvestre', 'flores', ['ramo', 'campo', 'regalo'], 160, 'Tres flores distintas, follaje y papel de envolver en dos capas.', [
    ['Follaje', G.hojaOsc, uni(leaf(100, 120, 40, 40, 30, -0.1), leaf(100, 120, 160, 40, 30, 0.1), leaf(100, 120, 100, 18, 26))], ['Papel de atrás', '#d8c3a5', poly([[45, 105], [155, 105], [112, 198], [88, 198]])],
    ['Flor 1', '#e4577b', petals(70, 70, 6, 12, 28)], ['Flor 2', '#f2c230', petals(130, 66, 9, 12, 26)], ['Flor 3', '#9b7fd1', petals(100, 50, 5, 12, 30)],
    ['Centros', '#6b3e1f', uni(circle(70, 70, 8), circle(130, 66, 8), circle(100, 50, 9))], ['Papel de delante', '#efe2c8', poly([[62, 120], [138, 120], [108, 198], [92, 198]])], ['Lazo', '#c43a4b', uni(ellipse(86, 150, 15, 8, 25), ellipse(114, 150, 15, 8, -25), circle(100, 151, 6))]]),

  // ---------------------------------------------------------------- Árboles, plantas y hongos
  fig('arbol-redondo', 'Árbol de manzanas', 'plantas', ['árbol', 'manzanas', 'jardín'], 160, 'Tronco con ramas, copa, luz de la copa y manzanas.', [
    ['Tronco', '#7a5230', poly([[88, 200], [112, 200], [108, 120], [126, 96], [118, 92], [104, 110], [100, 90], [96, 110], [82, 92], [74, 96], [92, 120]])],
    ['Copa', G.hoja, blob(100, 75, 62, 5, 0.15)], ['Luz de la copa', G.hojaClara, blob(84, 62, 30, 9, 0.2)], ['Manzanas', '#d6403a', uni(circle(70, 92, 8), circle(122, 58, 8), circle(132, 98, 8), circle(98, 42, 7))]]),
  fig('pino', 'Pino de tres pisos', 'plantas', ['pino', 'bosque', 'navidad'], 140, 'Tres pisos que se montan de abajo arriba, tronco y estrella.', [
    ['Tronco', '#6b4423', rect(90, 168, 20, 32)], ['Piso de abajo', '#2f6b3a', poly([[30, 175], [170, 175], [100, 92]])], ['Piso del medio', '#3d8247', poly([[45, 135], [155, 135], [100, 58]])],
    ['Piso de arriba', '#4f9a55', poly([[62, 95], [138, 95], [100, 25]])], ['Estrella', '#f2c230', star(100, 24, 5, 8, 18)]]),
  fig('palmera', 'Palmera', 'plantas', ['playa', 'tropical', 'verano'], 160, 'Arena, tronco curvo, cinco hojas y cocos.', [
    ['Arena', '#e8d3a2', ellipse(100, 190, 72, 11)], ['Tronco', '#a0703f', curve([[100, 190], [96, 140], [106, 90], [112, 62]], 16)],
    ['Hojas', '#3f8f4a', uni(leaf(112, 60, 36, 52, 26, -0.15), leaf(112, 60, 58, 98, 24, 0.1), leaf(112, 60, 184, 48, 26, 0.15), leaf(112, 60, 166, 102, 24, -0.1), leaf(112, 60, 110, 4, 22, 0.05))],
    ['Cocos', '#5b3a1e', uni(circle(104, 70, 8), circle(119, 72, 8), circle(111, 81, 7))]]),
  fig('arbol-otono', 'Árbol de otoño', 'plantas', ['otoño', 'hojas', 'naranja'], 170, 'Tronco con ramas, copa en tres manchas de color y hojas caídas.', [
    ['Tronco y ramas', '#6b4423', uni(stroke([[100, 200], [100, 110]], 18), curve([[100, 140], [70, 100], [55, 80]], 8), curve([[100, 130], [135, 95], [150, 78]], 8))],
    ['Copa naranja', '#e07a2e', blob(68, 80, 42, 21)], ['Copa roja', '#b7412e', blob(136, 74, 40, 22)], ['Copa amarilla', '#e8b22e', blob(102, 54, 44, 23)],
    ['Hojas caídas', '#c95f2a', uni(leaf(36, 190, 56, 182, 14), leaf(140, 196, 162, 186, 14), leaf(118, 186, 128, 172, 11))]]),
  fig('hongo-tres-piezas', 'Hongo de tres piezas', 'plantas', ['hongo', 'seta', 'bosque'], 140, 'Pie, láminas y sombrero como en el patrón clásico de tres piezas, con lunares encima.', [
    ['Pie', '#f3e6cc', svg('M78 112 C76 150 64 180 80 192 C95 202 120 200 128 186 C138 165 116 130 110 106 Z')], ['Láminas', '#d9c3a0', svg('M100 106 C118 92 150 84 174 96 C162 114 138 122 108 116 Z')],
    ['Sombrero', '#c8372d', svg('M10 105 C8 60 60 10 110 18 C150 26 188 60 182 96 C150 80 122 88 104 104 C80 118 40 122 22 118 C14 116 10 112 10 105 Z')], ['Lunares', '#ffffff', uni(circle(60, 55, 10), circle(102, 40, 8), circle(142, 60, 9), circle(40, 90, 7))]]),
  fig('hongos-trio', 'Trío de hongos', 'plantas', ['hongos', 'setas', 'bosque'], 180, 'Tres hongos de alturas distintas sobre el pasto.', [
    ['Pies', '#f3e6cc', uni(rrect(40, 120, 22, 70, 10), rrect(92, 90, 26, 100, 12), rrect(146, 135, 18, 55, 9))],
    ['Sombrero grande', '#8c4a2f', cap(105, 95, 52, 50)], ['Sombrero izquierdo', '#d9822b', cap(51, 124, 34, 32)], ['Sombrero derecho', '#c8372d', cap(155, 138, 28, 26)],
    ['Lunares', '#fff6e0', uni(circle(90, 70, 7), circle(120, 62, 6), circle(42, 110, 5), circle(150, 124, 5))], ['Pasto', G.hoja, poly([[10, 200], [10, 182], [26, 170], [36, 186], [52, 172], [66, 188], [84, 174], [100, 188], [118, 172], [134, 188], [152, 174], [170, 188], [190, 172], [190, 200]])]]),
  fig('cactus', 'Cactus en maceta', 'plantas', ['cactus', 'desierto', 'México'], 120, 'Cactus de brazos, flor, maceta y borde.', [
    ['Cactus', '#4f9a6a', uni(rrect(80, 40, 40, 120, 20), rrect(48, 72, 22, 52, 11), rrect(50, 108, 40, 16, 8), rrect(130, 58, 22, 52, 11), rrect(110, 94, 40, 16, 8))],
    ['Flor', '#ef6f9b', petals(100, 40, 6, 6, 17)], ['Maceta', '#c9693a', poly([[62, 150], [138, 150], [128, 198], [72, 198]])], ['Borde de la maceta', '#a9522b', rrect(56, 142, 88, 16, 4)]]),
  fig('monstera', 'Hoja de monstera', 'plantas', ['tropical', 'hoja', 'planta'], 160, 'Hoja calada con cortes y agujeros, tallo y nervio.', [
    ['Tallo', G.tallo, curve([[100, 198], [98, 150], [95, 122]], 9)],
    ['Hoja', '#2f7d4f', minus(blob(100, 85, 72, 31, 0.08, 1, 0.85), ellipse(70, 70, 7, 13, -30), ellipse(130, 70, 7, 13, 30), ellipse(84, 108, 6, 11, -20), ellipse(118, 110, 6, 11, 20),
      poly([[100, 82], [26, 38], [22, 50]]), poly([[100, 82], [176, 46], [178, 58]]), poly([[100, 90], [26, 110], [28, 122]]), poly([[100, 90], [172, 118], [168, 130]]))],
    ['Nervio', '#8cc26b', curve([[96, 125], [100, 85], [102, 30]], 5)]]),
  fig('suculenta', 'Suculenta en roseta', 'plantas', ['suculenta', 'roseta', 'planta'], 130, 'Tres coronas de hojas en profundidades distintas.', [
    ['Hojas de fuera', '#5f9e86', around(8, 100, 100, () => leaf(100, 100, 100, 8, 34))], ['Hojas del medio', '#8cc5a8', around(8, 100, 100, () => leaf(100, 100, 100, 32, 28), 22.5)],
    ['Hojas de dentro', '#b8e0c8', around(5, 100, 100, () => leaf(100, 100, 100, 60, 24))], ['Punta rosada', '#e9a3b5', circle(100, 100, 9)]]),
  fig('helecho', 'Rama de helecho', 'plantas', ['helecho', 'hoja', 'bosque'], 110, 'Tallo curvo con hojuelas alternas a la izquierda y a la derecha.', [
    ['Tallo', G.tallo, curve([[100, 198], [104, 120], [96, 20]], 6)],
    ['Hojuelas izquierdas', G.hoja, uni(...range(6).map(i => leaf(101, 170 - i * 25, 52 + i * 6, 150 - i * 25, 18 - i)))], ['Hojuelas derechas', G.hojaOsc, uni(...range(6).map(i => leaf(101, 160 - i * 25, 150 - i * 6, 140 - i * 25, 18 - i)))]]),

  // ---------------------------------------------------------------- Cielo y mar
  fig('sol-nube', 'Sol con nube', 'cielo', ['sol', 'nube', 'buen tiempo'], 160, 'Rayos, sol con mejillas y una nube por delante.', [
    ['Rayos', '#f29b2e', star(85, 85, 14, 48, 80)], ['Sol', '#f6c945', circle(85, 85, 48)], ['Mejillas', '#f28b82', uni(circle(64, 96, 8), circle(106, 96, 8))], ['Nube', '#ffffff', cloud(118, 132, 1.15)]]),
  fig('luna-estrellas', 'Luna y estrellas', 'cielo', ['luna', 'noche', 'estrellas'], 150, 'Luna creciente y tres estrellas.', [
    ['Luna', '#f4d35e', minus(circle(90, 100, 70), circle(126, 80, 62))], ['Estrella grande', '#fff1b8', star(152, 140, 5, 9, 22)], ['Estrellas pequeñas', '#fff1b8', uni(star(160, 40, 5, 5, 12), star(118, 178, 5, 4, 10))]]),
  fig('arcoiris', 'Arcoíris con nubes', 'cielo', ['arcoíris', 'nubes', 'colores'], 180, 'Seis bandas que se solapan de fuera hacia dentro y dos nubes delante.', [
    ...(['#e63946', '#f4a261', '#f6d55c', '#57b26a', '#3d8bd9', '#7b5ea7'] as const).map((color, i) => [`Banda ${i + 1}`, color, arcBand(100, 150, 40 + (5 - i) * 11 - (i ? 0 : 0), 40 + (6 - i) * 11 + (i ? 4 : 0), 180, 360)] as [string, string, ReturnType<typeof arcBand>]),
    ['Nube izquierda', '#ffffff', cloud(20, 150, 0.8)], ['Nube derecha', '#ffffff', cloud(140, 150, 0.8)]]),
  fig('planeta-anillos', 'Planeta con anillos', 'cielo', ['planeta', 'espacio', 'saturno'], 170, 'El anillo pasa por detrás del planeta y vuelve por delante: dos piezas a distinta profundidad.', [
    ['Anillo de atrás', '#e9c46a', minus(ellipse(100, 100, 96, 26, -15), ellipse(100, 100, 70, 14, -15))], ['Planeta', '#e76f51', circle(100, 100, 50)],
    ['Franja', '#f4a261', inter(circle(100, 100, 50), turn(rect(40, 82, 120, 16), -15, 100, 100))], ['Anillo de delante', '#f2d58a', inter(minus(ellipse(100, 100, 96, 26, -15), ellipse(100, 100, 70, 14, -15)), turn(rect(0, 100, 200, 100), -15, 100, 100))],
    ['Estrellitas', '#ffffff', uni(star(30, 40, 4, 3, 9), star(170, 160, 4, 3, 9), star(160, 30, 4, 2.5, 7))]]),
  fig('montanas-atardecer', 'Montañas al atardecer', 'cielo', ['paisaje', 'montañas', 'sol'], 200, 'Sol, cordillera lejana, cordillera cercana y nieve.', [
    ['Sol', '#f28c38', circle(100, 98, 42)], ['Montañas lejanas', '#8b6fb0', poly([[0, 172], [48, 92], [88, 140], [140, 68], [200, 158], [200, 182], [0, 182]])],
    ['Montañas cercanas', '#4a3f6b', poly([[0, 200], [0, 176], [40, 128], [80, 168], [120, 118], [170, 168], [200, 148], [200, 200]])], ['Nieve', '#f7f3ea', uni(poly([[140, 68], [126, 90], [134, 86], [140, 94], [148, 86], [156, 90]]), poly([[48, 92], [36, 112], [44, 108], [50, 114], [56, 108], [62, 112]]))]]),
  fig('olas', 'Olas con espuma', 'cielo', ['mar', 'olas', 'playa'], 200, 'Tres franjas de olas superpuestas y rizos de espuma.', [
    ...([['Ola del fondo', '#1d5c8a', 70], ['Ola del medio', '#2f86b5', 108], ['Ola de delante', '#5fb2d9', 146]] as const).map(([n, c, y], i) => [n, c, svg(`M0 ${y} ${range(5).map(k => `Q${k * 40 + 20} ${y - 26 + i * 4} ${k * 40 + 40} ${y}`).join(' ')} L200 200 L0 200 Z`)] as [string, string, ReturnType<typeof svg>]),
    ['Espuma', '#ffffff', uni(spiral(30, 140, 2, 12, 1.2, 5), spiral(110, 102, 2, 12, 1.2, 5), spiral(170, 64, 2, 10, 1.2, 5))]]),
  fig('nubes-lluvia', 'Nube con lluvia', 'cielo', ['nube', 'lluvia', 'gotas'], 140, 'Nube en dos tonos y gotas.', [
    ['Nube de atrás', '#b8c4d6', cloud(40, 70, 1.4)], ['Nube de delante', '#e8eef6', cloud(60, 90, 1.1)], ['Gotas', '#4e8fd1', uni(drop(70, 150, 8, 20), drop(100, 170, 8, 20), drop(130, 150, 8, 20), drop(115, 195, 6, 15))]]),
  fig('sol-maya', 'Sol radiante', 'cielo', ['sol', 'rayos', 'mexicano'], 160, 'Dos coronas de rayos, disco, anillo y cara sencilla.', [
    ['Rayos largos', '#e76f51', star(100, 100, 12, 50, 96)], ['Rayos cortos', '#f4a261', star(100, 100, 12, 46, 74, -75)], ['Disco', '#f6c945', circle(100, 100, 48)],
    ['Anillo', '#e9a23b', minus(circle(100, 100, 40), circle(100, 100, 33))], ['Ojos y boca', '#6b3e1f', uni(ellipse(86, 94, 5, 7), ellipse(114, 94, 5, 7), arcBand(100, 104, 12, 18, 20, 160))]])
];

