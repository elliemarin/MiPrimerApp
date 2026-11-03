import { circle, curve, drop, ellipse, heart, inter, leaf, pair, petals, poly, rect, regular, rrect, spiral, star, stroke, svg, uni } from '../../lib/applique/shapes';
import { fig, range } from './common';

const dome = (cx: number, cy: number, rx: number, ry: number) => inter(ellipse(cx, cy, rx, ry), rect(cx - rx - 1, cy - ry - 1, 2 * rx + 2, ry + 3));
const whale = 'M20 120 C20 70 80 60 120 72 C150 80 160 92 166 100 C150 140 80 160 40 150 C26 146 20 134 20 120 Z';

export const ANIMAL_FIGURES = [
  fig('mariposa-clasica', 'Mariposa de alas dobles', 'animales', ['mariposa', 'insecto', 'infantil'], 170, 'Alas grandes de una pieza, alas interiores, lunares y cuerpo en tres bolitas, como el patrón clásico de fieltro.', [
    ['Alas grandes', '#9b7fd1', uni(pair(ellipse(60, 68, 44, 50, -25)), pair(ellipse(70, 140, 32, 38, 25)))], ['Alas interiores', '#d7c6f2', uni(pair(ellipse(64, 72, 30, 34, -25)), pair(ellipse(74, 136, 20, 24, 25)))],
    ['Lunares', '#f2c94c', uni(pair(circle(56, 64, 9)), pair(circle(74, 140, 7)))], ['Antenas', '#3d2b4f', uni(pair(curve([[98, 52], [90, 30], [80, 22]], 5)), pair(circle(80, 22, 5)))],
    ['Cuerpo', '#3d2b4f', uni(circle(100, 58, 11), ellipse(100, 82, 9, 13), ellipse(100, 122, 10, 36))]]),
  fig('mariposa-capas', 'Mariposa en capas', 'animales', ['mariposa', 'fieltro', 'primavera'], 170, 'Alas de arriba y de abajo en espejo, manchas interiores, cuerpo y cabeza.', [
    ['Alas de abajo', '#e8a6a0', pair(drop(80, 122, 24, 62, 125))], ['Alas de arriba', '#f3c3c0', pair(leaf(98, 96, 18, 26, 70, -0.12))],
    ['Manchas de arriba', '#9ed6c0', pair(leaf(92, 88, 40, 46, 38, -0.1))], ['Manchas de abajo', '#f6a97a', pair(drop(80, 126, 12, 30, 125))],
    ['Cuerpo', '#d9e3b0', ellipse(100, 112, 10, 42)], ['Cabeza', '#d9e3b0', circle(100, 62, 14)], ['Antenas', '#7a6a4f', pair(curve([[97, 50], [92, 30], [84, 18]], 4.5))]]),
  fig('buho', 'Búho', 'animales', ['búho', 'pájaro', 'bosque'], 150, 'Orejas, cuerpo, barriga, alas, ojos en tres capas, pico y patas.', [
    ['Orejas', '#6b4a33', pair(poly([[52, 62], [56, 18], [84, 44]]))], ['Cuerpo', '#8b6446', ellipse(100, 110, 62, 78)], ['Barriga', '#efe0c4', ellipse(100, 138, 40, 46)],
    ['Alas', '#5c3f2b', pair(leaf(50, 88, 62, 172, 34, 0.06))], ['Ojos', '#ffffff', pair(circle(78, 82, 22))], ['Iris', '#e9a23b', pair(circle(80, 84, 12))], ['Pupilas', '#1f1a17', pair(circle(81, 85, 6))],
    ['Pico', '#e9883a', poly([[92, 100], [108, 100], [100, 118]])], ['Patas', '#e9883a', pair(rrect(70, 182, 24, 11, 5))]]),
  fig('gato-sentado', 'Gato sentado', 'animales', ['gato', 'mascota', 'infantil'], 140, 'Cola, cuerpo, cabeza, orejas, barriga, ojos y nariz.', [
    ['Cola', '#6f7480', curve([[130, 180], [172, 170], [180, 130], [160, 108]], 14)], ['Cuerpo', '#8a909c', ellipse(100, 145, 48, 52)], ['Orejas', '#8a909c', pair(poly([[62, 64], [66, 18], [94, 46]]))],
    ['Cabeza', '#9aa0ab', circle(100, 74, 40)], ['Interior de orejas', '#f2a7b3', pair(poly([[69, 52], [71, 30], [86, 46]]))], ['Barriga', '#e8e4dc', ellipse(100, 158, 26, 30)],
    ['Ojos', '#7cc47f', pair(ellipse(84, 72, 7, 9))], ['Nariz', '#f2a7b3', poly([[93, 86], [107, 86], [100, 95]])]]),
  fig('zorro', 'Cara de zorro', 'animales', ['zorro', 'bosque', 'otoño'], 150, 'Orejas, cabeza en punta, mejillas blancas, ojos y nariz.', [
    ['Orejas', '#d9672b', pair(poly([[38, 64], [46, 10], [88, 46]]))], ['Interior de orejas', '#4a2c1d', pair(poly([[49, 54], [53, 25], [77, 45]]))],
    ['Cabeza', '#e57a35', svg('M30 60 C40 40 160 40 170 60 C172 100 130 150 100 182 C70 150 28 100 30 60 Z')], ['Mejillas', '#f7efe3', pair(svg('M30 66 C46 104 78 126 100 182 C70 152 30 104 30 66 Z'))],
    ['Ojos', '#2b1d14', pair(ellipse(74, 92, 7, 10, -20))], ['Nariz', '#1f1a17', ellipse(100, 174, 11, 8)]]),
  fig('panda', 'Cara de panda', 'animales', ['panda', 'oso', 'infantil'], 150, 'Orejas, cara, manchas de los ojos, ojos, hocico y nariz.', [
    ['Orejas', '#1f1f1f', pair(circle(50, 50, 22))], ['Cara', '#f7f5f0', ellipse(100, 110, 72, 66)], ['Manchas de los ojos', '#1f1f1f', pair(ellipse(74, 102, 16, 22, -30))],
    ['Ojos', '#ffffff', pair(circle(76, 98, 7))], ['Hocico', '#efe6d8', ellipse(100, 142, 26, 18)], ['Nariz', '#1f1f1f', ellipse(100, 134, 10, 7)]]),
  fig('pez-tropical', 'Pez tropical', 'animales', ['pez', 'mar', 'rayas'], 160, 'Cola, aleta, cuerpo, rayas, aleta lateral y ojo.', [
    ['Cola', '#f28c38', poly([[148, 100], [196, 58], [186, 100], [196, 142]])], ['Aleta de arriba', '#f28c38', svg('M66 66 C86 18 130 26 142 72 Z')], ['Cuerpo', '#f6b93b', ellipse(95, 100, 62, 42)],
    ['Rayas', '#ffffff', inter(ellipse(95, 100, 62, 42), uni(rect(68, 50, 14, 100), rect(104, 50, 14, 100)))], ['Aleta lateral', '#e76f51', leaf(90, 108, 120, 128, 16)],
    ['Ojo', '#ffffff', circle(56, 92, 10)], ['Pupila', '#1f1a17', circle(54, 92, 5)]]),
  fig('ballena', 'Ballena con chorro', 'animales', ['ballena', 'mar', 'infantil'], 170, 'Chorro, cola, cuerpo, barriga, ojo y mejilla.', [
    ['Chorro', '#9fd3ef', uni(curve([[90, 64], [88, 34], [74, 16]], 6), curve([[92, 64], [96, 32], [112, 16]], 6))], ['Cola', '#3a6ea5', uni(leaf(158, 98, 196, 70, 24, 0.1), leaf(158, 98, 192, 124, 24, -0.1))],
    ['Cuerpo', '#4c86c6', svg(whale)], ['Barriga', '#cfe4f6', inter(svg(whale), rect(0, 126, 200, 60))], ['Ojo', '#1f2a3a', circle(56, 106, 5)], ['Mejilla', '#f2a7b3', circle(68, 120, 7)]]),
  fig('pulpo', 'Pulpo', 'animales', ['pulpo', 'mar', 'tentáculos'], 150, 'Seis tentáculos, cabeza, ojos, pupilas y mejillas.', [
    ['Tentáculos', '#c45b9b', uni(...range(6).map(i => curve([[60 + i * 16, 108], [56 + i * 16 + (i % 2 ? 8 : -8), 148], [62 + i * 16, 176], [52 + i * 16 + (i % 2 ? 10 : -10), 196]], 14)))],
    ['Cabeza', '#d872b0', svg('M40 115 C30 40 170 40 160 115 C140 128 60 128 40 115 Z')], ['Ojos', '#ffffff', pair(circle(78, 92, 11))], ['Pupilas', '#1f1a17', pair(circle(80, 94, 5))],
    ['Mejillas', '#f5a8cf', pair(ellipse(64, 112, 9, 5))]]),
  fig('caracol', 'Caracol', 'animales', ['caracol', 'jardín', 'espiral'], 170, 'Cuerpo, antenas, concha y espiral.', [
    ['Cuerpo', '#c9b28d', svg('M10 185 C30 170 100 175 150 170 C170 168 178 150 176 120 C176 104 190 100 194 112 C200 140 190 192 150 196 L20 196 C10 196 6 190 10 185 Z')],
    ['Antenas', '#a68d66', uni(curve([[180, 110], [178, 80], [170, 64]], 5), curve([[187, 112], [192, 84], [198, 70]], 5))], ['Concha', '#d98c4a', circle(92, 118, 62)], ['Espiral', '#8f4f24', spiral(92, 118, 4, 52, 2.6, 12)]]),
  fig('mariquita', 'Mariquita', 'animales', ['mariquita', 'insecto', 'suerte'], 140, 'Patas, cabeza, cuerpo, línea central, lunares, antenas y ojos.', [
    ['Patas', '#1f1f1f', uni(...[-1, 1].flatMap(sg => [0, 1, 2].map(i => stroke([[100 + sg * 30, 92 + i * 30], [100 + sg * 68, 82 + i * 34]], 7))))], ['Antenas', '#1f1f1f', pair(curve([[92, 30], [84, 12], [72, 6]], 5))],
    ['Cabeza', '#1f1f1f', circle(100, 48, 28)], ['Cuerpo', '#d62828', ellipse(100, 115, 60, 66)], ['Línea central', '#1f1f1f', inter(ellipse(100, 115, 60, 66), rect(97, 50, 6, 132))],
    ['Lunares', '#1f1f1f', uni(pair(circle(74, 96, 11)), pair(circle(72, 138, 9)), circle(100, 168, 7))], ['Ojos', '#ffffff', pair(circle(89, 42, 6))]]),
  fig('abeja', 'Abeja', 'animales', ['abeja', 'miel', 'insecto'], 130, 'Aguijón, alas, cuerpo, rayas, antenas, cabeza y ojos.', [
    ['Aguijón', '#1f1f1f', poly([[92, 168], [108, 168], [100, 192]])], ['Alas', '#eef6fb', pair(ellipse(70, 72, 26, 36, -30))], ['Cuerpo', '#f6c945', ellipse(100, 116, 46, 58)],
    ['Rayas', '#1f1f1f', inter(ellipse(100, 116, 46, 58), uni(rect(40, 100, 120, 14), rect(40, 128, 120, 14), rect(40, 154, 120, 12)))], ['Antenas', '#1f1f1f', pair(curve([[92, 40], [84, 20], [74, 12]], 5))],
    ['Cabeza', '#1f1f1f', circle(100, 60, 24)], ['Ojos', '#ffffff', pair(circle(90, 58, 6))]]),
  fig('pajaro', 'Pajarito', 'animales', ['pájaro', 'ave', 'primavera'], 150, 'Cola, patas, cuerpo, barriga, ala, pico y ojo.', [
    ['Cola', '#3d7ea6', poly([[34, 102], [0, 80], [6, 110], [0, 136], [38, 120]])], ['Patas', '#e9883a', uni(stroke([[82, 150], [78, 184]], 5), stroke([[102, 150], [106, 184]], 5))],
    ['Cuerpo', '#5aa9c9', ellipse(90, 110, 60, 48)], ['Barriga', '#f3e3c3', inter(ellipse(90, 110, 60, 48), ellipse(102, 142, 52, 36))], ['Ala', '#3d7ea6', leaf(68, 98, 130, 126, 40, 0.15)],
    ['Pico', '#e9883a', poly([[146, 98], [180, 106], [146, 116]])], ['Ojo', '#1f1a17', circle(124, 96, 6)]]),
  fig('elefante', 'Elefante', 'animales', ['elefante', 'safari', 'infantil'], 170, 'Cola, patas, cuerpo, cabeza, trompa, oreja con interior y ojo.', [
    ['Cola', '#7d8590', curve([[166, 110], [182, 132]], 5)], ['Patas', '#7d8590', uni(rrect(72, 138, 24, 52, 6), rrect(130, 138, 24, 52, 6))], ['Cuerpo', '#959daa', ellipse(112, 118, 60, 46)],
    ['Cabeza', '#a3abb7', circle(62, 90, 36)], ['Trompa', '#a3abb7', curve([[40, 102], [32, 140], [44, 164], [58, 166]], 16)], ['Oreja', '#8a929e', ellipse(80, 92, 26, 34, 10)],
    ['Interior de la oreja', '#f2b8c2', ellipse(82, 94, 15, 22, 10)], ['Ojo', '#1f1a17', circle(50, 82, 5)]]),
  fig('dinosaurio', 'Dinosaurio', 'animales', ['dinosaurio', 'infantil', 'placas'], 180, 'Placas del lomo, patas, cuerpo con cola, barriga y ojo.', [
    ['Placas', '#f28c38', uni(...range(5).map(i => poly([[52 + i * 22, 96 - Math.sin((i + 0.5) / 5 * Math.PI) * 10], [63 + i * 22, 66 - Math.sin((i + 0.5) / 5 * Math.PI) * 14], [74 + i * 22, 96 - Math.sin((i + 0.5) / 5 * Math.PI) * 10]])))],
    ['Patas', '#3f8f5a', uni(rrect(64, 140, 22, 44, 8), rrect(118, 140, 22, 44, 8))], ['Cuerpo', '#57b26a', svg('M8 150 C40 140 50 100 100 92 C150 86 176 110 178 72 C180 54 198 54 198 76 C198 110 180 150 130 158 C90 164 40 170 8 150 Z')],
    ['Barriga', '#c9e7a7', ellipse(102, 146, 40, 14)], ['Ojo', '#1f1a17', circle(188, 68, 4.5)]]),
  fig('conejo', 'Conejo', 'animales', ['conejo', 'pascua', 'infantil'], 130, 'Cola, orejas con interior, cuerpo, cabeza, mejillas y nariz.', [
    ['Cola', '#ffffff', circle(146, 172, 14)], ['Orejas', '#c9c3bb', pair(ellipse(84, 40, 13, 38, -8))], ['Interior de orejas', '#f2a7b3', pair(ellipse(84, 42, 6, 27, -8))],
    ['Cuerpo', '#d9d4cc', ellipse(100, 150, 48, 46)], ['Cabeza', '#e3dfd8', circle(100, 92, 36)], ['Mejillas', '#f2a7b3', pair(circle(80, 104, 7))], ['Nariz', '#e47a8f', heart(100, 98, 14)]]),
  fig('flamenco', 'Flamenco', 'animales', ['flamenco', 'tropical', 'rosa'], 120, 'Patas, cuerpo, ala, cuello, cabeza y pico.', [
    ['Patas', '#d65b7f', uni(stroke([[98, 140], [98, 198]], 5), curve([[108, 140], [118, 168], [100, 170]], 5))], ['Cuerpo', '#f28aa8', ellipse(112, 118, 44, 30, -10)],
    ['Ala', '#e46a90', leaf(96, 112, 152, 124, 30, 0.1)], ['Cuello', '#f28aa8', curve([[82, 112], [66, 80], [70, 50], [86, 36]], 12)], ['Cabeza', '#f28aa8', circle(88, 34, 13)],
    ['Pico', '#1f1f1f', poly([[98, 30], [120, 40], [100, 45]])]]),
  fig('tortuga', 'Tortuga', 'animales', ['tortuga', 'mar', 'lenta'], 170, 'Cabeza y patas, caparazón, placas, borde y ojo.', [
    ['Cabeza y patas', '#7cbf6e', uni(circle(172, 112, 20), ellipse(60, 132, 15, 11), ellipse(142, 132, 15, 11), poly([[28, 118], [8, 126], [30, 128]]))], ['Caparazón', '#8a6a3f', dome(100, 128, 74, 66)],
    ['Placas', '#b38b55', uni(regular(100, 92, 17, 6, 0), regular(70, 110, 14, 6, 0), regular(130, 110, 14, 6, 0))], ['Borde', '#6f532f', rrect(24, 120, 152, 12, 6)], ['Ojo', '#1f1a17', circle(178, 106, 4)]]),
  fig('medusa', 'Medusa', 'animales', ['medusa', 'mar', 'tentáculos'], 140, 'Tentáculos ondulados, volante, campana y manchas.', [
    ['Tentáculos', '#c9a0e8', uni(...range(5).map(i => curve([[64 + i * 18, 100], [56 + i * 18, 130], [70 + i * 18, 160], [60 + i * 18, 194]], 8)))],
    ['Volante', '#e0c6f5', uni(...range(6).map(i => circle(47 + i * 21, 100, 12)))], ['Campana', '#a77fd6', dome(100, 100, 62, 62)], ['Manchas', '#e0c6f5', uni(circle(80, 70, 8), circle(112, 58, 6), circle(126, 84, 7))]]),
  fig('pollito', 'Pollito en su cascarón', 'animales', ['pollito', 'pascua', 'huevo'], 130, 'Patas, cuerpo, ala, cresta, pico, ojos y cascarón con zigzag.', [
    ['Cresta', '#e9883a', uni(circle(92, 34, 8), circle(104, 30, 9), circle(114, 36, 7))], ['Cuerpo', '#f6d55c', circle(100, 92, 54)], ['Ala', '#f2c230', leaf(64, 104, 112, 112, 30, 0.12)],
    ['Pico', '#e9883a', poly([[112, 80], [134, 88], [112, 96]])], ['Ojo', '#1f1a17', circle(108, 70, 5)],
    ['Cascarón', '#f7f3ea', poly([[30, 110], [44, 98], [58, 112], [72, 98], [86, 112], [100, 98], [114, 112], [128, 98], [142, 112], [156, 98], [170, 110], [168, 160], [140, 196], [60, 196], [32, 160]])]]),
  fig('leon', 'Cara de león', 'animales', ['león', 'melena', 'safari'], 160, 'Melena en dos coronas, orejas, cara, hocico y nariz.', [
    ['Melena de atrás', '#c2622d', petals(100, 100, 14, 70, 96, 0, 0.6)], ['Melena de delante', '#e08a3c', petals(100, 100, 14, 64, 84, 12.8, 0.6)], ['Orejas', '#f2b257', pair(circle(62, 56, 15))],
    ['Cara', '#f6c26b', circle(100, 104, 54)], ['Ojos', '#4a2c1d', pair(ellipse(80, 96, 6, 8))], ['Hocico', '#fbe3b8', uni(pair(circle(90, 128, 15)))], ['Nariz', '#7a3d1e', poly([[88, 112], [112, 112], [100, 124]])]]),
  fig('erizo', 'Erizo', 'animales', ['erizo', 'bosque', 'otoño'], 150, 'Púas en dos capas, cuerpo, cara, nariz y ojo.', [
    ['Púas de atrás', '#5c3f2b', inter(star(98, 112, 20, 58, 86), rect(0, 0, 200, 150))], ['Púas de delante', '#7a5638', inter(star(98, 112, 20, 52, 74, -81), rect(0, 0, 200, 150))],
    ['Cuerpo', '#c9a27a', ellipse(98, 128, 66, 40)], ['Cara', '#ecd2b1', svg('M130 108 C150 100 176 112 188 130 C176 146 150 156 130 150 Z')], ['Nariz', '#1f1a17', circle(186, 130, 6)], ['Ojo', '#1f1a17', circle(158, 122, 4.5)]]),
  fig('perro', 'Cara de perrito', 'animales', ['perro', 'mascota', 'infantil'], 140, 'Orejas caídas, cabeza, mancha, hocico, nariz y lengua.', [
    ['Orejas', '#8a5a3c', pair(ellipse(46, 80, 18, 40, 20))], ['Cabeza', '#d9b38c', circle(100, 92, 56)], ['Mancha', '#8a5a3c', ellipse(126, 76, 22, 18, -20)],
    ['Hocico', '#f2e3cf', ellipse(100, 122, 32, 24)], ['Lengua', '#ef7f8f', drop(100, 146, 8, 18, 90)], ['Nariz', '#2b1d14', ellipse(100, 112, 12, 9)], ['Ojos', '#2b1d14', pair(circle(80, 86, 6))]]),
  fig('pez-globo', 'Pez globo', 'animales', ['pez', 'mar', 'púas'], 140, 'Púas, cuerpo redondo, barriga, aletas y ojo.', [
    ['Púas', '#e0b04a', star(96, 100, 18, 56, 74)], ['Cuerpo', '#f2c94c', circle(96, 100, 58)], ['Barriga', '#fbeec4', inter(circle(96, 100, 58), ellipse(96, 150, 60, 40))],
    ['Aleta', '#e9883a', uni(leaf(150, 100, 196, 80, 20), leaf(150, 100, 196, 120, 20))], ['Ojo', '#ffffff', circle(76, 86, 12)], ['Pupila', '#1f1a17', circle(74, 86, 6)], ['Boca', '#e47a8f', circle(42, 110, 6)]]),
  fig('caballito-mar', 'Caballito de mar', 'animales', ['caballito de mar', 'mar', 'espiral'], 110, 'Cola en espiral, cuerpo, aleta, hocico y ojo.', [
    ['Cola', '#d9822b', curve([[98, 168], [104, 190], [124, 186], [126, 166], [110, 164]], 13)], ['Cuerpo', '#f2a541', svg('M90 30 C120 26 132 50 122 72 C114 90 128 104 124 124 C120 144 100 160 96 176 C80 160 76 130 86 112 C94 96 80 82 76 64 C72 46 76 34 90 30 Z')],
    ['Hocico', '#f2a541', rrect(44, 48, 46, 13, 6.5)], ['Aleta', '#f6d55c', leaf(124, 96, 150, 120, 18)], ['Cresta', '#d9822b', uni(...range(4).map(i => circle(100 + i * 6, 34 + i * 12, 6)))], ['Ojo', '#1f1a17', circle(94, 50, 5)]]),
  fig('libelula', 'Libélula', 'animales', ['libélula', 'insecto', 'alas'], 160, 'Dos pares de alas en dos capas, cuerpo largo y cabeza.', [
    ['Alas de abajo', '#a6d8e8', pair(leaf(98, 82, 22, 120, 22, 0.05))], ['Alas de arriba', '#d4eef6', pair(leaf(98, 72, 18, 46, 24, -0.05))],
    ['Cuerpo', '#2f86b5', uni(rrect(94, 70, 12, 120, 6), ellipse(100, 74, 9, 14))], ['Cabeza', '#1d5c8a', circle(100, 54, 11)], ['Ojos', '#7cc47f', pair(circle(94, 50, 5))]]),
  fig('gallo', 'Gallo', 'animales', ['gallo', 'granja', 'colores'], 150, 'Plumas de la cola en tres colores, patas, cuerpo, ala, cresta, barbilla y pico.', [
    ['Cola roja', '#c8372d', leaf(60, 110, 10, 30, 30, -0.1)], ['Cola verde', '#2f7d4f', leaf(62, 112, 6, 64, 28, -0.05)], ['Cola azul', '#1d5c8a', leaf(64, 116, 14, 100, 26)],
    ['Patas', '#e9a23b', uni(stroke([[96, 150], [92, 190]], 6), stroke([[118, 150], [122, 190]], 6))], ['Cuerpo', '#d9822b', svg('M50 120 C50 90 90 80 116 80 C126 60 124 40 140 34 C160 30 168 46 162 64 C156 86 168 120 148 144 C128 166 70 162 50 120 Z')],
    ['Ala', '#a9522b', leaf(76, 108, 136, 128, 34, 0.12)], ['Cresta', '#d62828', uni(circle(140, 26, 9), circle(152, 26, 8), circle(130, 30, 7))], ['Barbilla', '#d62828', drop(160, 70, 7, 16, 90)],
    ['Pico', '#f6c945', poly([[164, 48], [184, 54], [164, 60]])], ['Ojo', '#1f1a17', circle(150, 44, 4.5)]])
];

