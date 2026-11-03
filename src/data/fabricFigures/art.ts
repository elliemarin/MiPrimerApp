import { arcBand, around, blob, circle, curve, drop, ellipse, grow, heart, inter, leaf, minus, pair, petals, poly, rect, regular, rrect, spiral, star, stroke, svg, turn, uni, wavy, type Poly, type Shape } from '../../lib/applique/shapes';
import { fig, range, type LayerSpec } from './common';

const halfDisk = (cx: number, cy: number, r: number) => inter(circle(cx, cy, r, 120), rect(cx - r - 1, cy - r - 1, 2 * r + 2, r + 1));
/** Franja ondulada horizontal entre y0 e y0 + h (sus dos bordes ondulan). */
function waveBand(y0: number, h: number, amp: number, freq: number, phase: number, x0 = 0, x1 = 200): Poly {
  const n = 80, top: [number, number][] = [], bottom: [number, number][] = [];
  for (let i = 0; i <= n; i++) { const x = x0 + ((x1 - x0) * i) / n, t = (i / n) * Math.PI * 2 * freq; top.push([x, y0 + amp * Math.sin(t + phase)]); bottom.push([x, y0 + h + amp * Math.sin(t + phase + 0.6)]); }
  return poly([...top, ...bottom.reverse()]);
}
let seed = 7;
const rnd = (s?: number) => { if (s !== undefined) seed = s; seed = (seed * 9301 + 49297) % 233280; return seed / 233280; };
const nested = (names: string[], colors: string[], make: (i: number) => Shape | Poly): LayerSpec[] => names.map((n, i) => [n, colors[i % colors.length], make(i)]);
const RAINBOW = ['#e63946', '#f4a261', '#f6d55c', '#57b26a', '#3d8bd9', '#7b5ea7'];
const PSY = ['#ff4f9a', '#ff9f1c', '#ffe066', '#2ec4b6', '#5f4bb6', '#e71d36', '#20a4f3'];

/** Vitral: celdas casi cuadradas que se encogen hacia su centro para dejar ver el «plomo». */
function stainedGlass(): LayerSpec[] {
  rnd(11);
  const window = uni(rect(30, 90, 140, 104), circle(100, 90, 70)), cols = 5, rows = 6;
  const P = range(rows + 1).map(r => range(cols + 1).map(c => ({ x: 22 + c * 31.2 + (c && c < cols ? (rnd() - 0.5) * 14 : 0), y: 14 + r * 31 + (r && r < rows ? (rnd() - 0.5) * 14 : 0) })));
  const colors = ['#d62839', '#2a7fbf', '#f2c94c', '#3c9a5f', '#8a4fbf'];
  const byColor: Poly[][] = colors.map(() => []);
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    const q = [P[r][c], P[r][c + 1], P[r + 1][c + 1], P[r + 1][c]];
    const cx = q.reduce((t, p) => t + p.x, 0) / 4, cy = q.reduce((t, p) => t + p.y, 0) / 4;
    const cell = inter(poly(q.map(p => [cx + (p.x - cx) * 0.84, cy + (p.y - cy) * 0.84] as [number, number])), grow(window, 0.94, 100, 110));
    if (cell.length) byColor[(r * 2 + c * 3) % colors.length].push(...cell);
  }
  return [['Plomo (fondo oscuro)', '#2b2b2b', window], ...colors.map((color, i) => [`Vidrios ${i + 1}`, color, byColor[i]] as LayerSpec)];
}
function terrazzo(): Shape[] {
  rnd(23);
  const groups: Shape[] = [[], [], [], []];
  for (let i = 0; i < 34; i++) {
    const cx = 30 + rnd() * 140, cy = 30 + rnd() * 140, r = 6 + rnd() * 9, n = 4 + Math.floor(rnd() * 3), a0 = rnd() * 360;
    if (Math.hypot(cx - 100, cy - 100) > 72) continue;
    groups[i % 4].push(...regular(cx, cy, r, n, a0).length ? [poly(range(n).map(k => { const a = ((a0 + (360 * k) / n) * Math.PI) / 180, rr = r * (0.7 + rnd() * 0.5); return [cx + Math.cos(a) * rr, cy + Math.sin(a) * rr] as [number, number]; }))] : []);
  }
  return groups.map(g => uni(g));
}
const seaweed = (x: number, y0: number, y1: number, w: number, s: number): Shape => {
  rnd(s);
  return uni(...range(9).map(i => { const t = i / 8, y = y0 + (y1 - y0) * t; return blob(x + Math.sin(t * 7 + s) * 10, y, w * (1 - t * 0.55), s + i, 0.5, 1.2, 0.8); }));
};

export const ART_FIGURES = [
  // ---------------------------------------------------------------- Geometría
  fig('estrellas-capas', 'Estrellas en capas', 'geometria', ['estrella', 'capas', 'fiesta'], 150, 'Tres estrellas giradas una sobre otra y un centro.', [
    ['Estrella grande', '#3d6f9e', star(100, 100, 5, 40, 96)], ['Estrella media', '#f6d55c', star(100, 100, 5, 30, 70, -54)], ['Estrella pequeña', '#e63946', star(100, 100, 5, 18, 42)], ['Centro', '#ffffff', circle(100, 100, 10)]]),
  fig('panal', 'Panal de hexágonos', 'geometria', ['hexágono', 'panal', 'abeja'], 160, 'Siete hexágonos que se montan ligeramente y centros de miel.', [
    ['Hexágonos claros', '#f6d55c', uni(regular(100, 100, 28, 6, 0), ...[0, 2, 4].map(k => regular(100 + Math.cos((k * 60 + 30) * Math.PI / 180) * 45, 100 + Math.sin((k * 60 + 30) * Math.PI / 180) * 45, 28, 6, 0)))],
    ['Hexágonos oscuros', '#e0a21b', uni(...[1, 3, 5].map(k => regular(100 + Math.cos((k * 60 + 30) * Math.PI / 180) * 45, 100 + Math.sin((k * 60 + 30) * Math.PI / 180) * 45, 28, 6, 0)))],
    ['Centros', '#a8640f', uni(regular(100, 100, 11, 6, 0), ...range(6).map(k => regular(100 + Math.cos((k * 60 + 30) * Math.PI / 180) * 45, 100 + Math.sin((k * 60 + 30) * Math.PI / 180) * 45, 11, 6, 0)))]]),
  fig('diana', 'Círculos concéntricos', 'geometria', ['círculos', 'diana', 'concéntrico'], 140, 'Cinco círculos, cada uno sobre el anterior.', nested(['Círculo 1', 'Círculo 2', 'Círculo 3', 'Círculo 4', 'Círculo 5'], ['#264653', '#2a9d8f', '#e9c46a', '#f4a261', '#e76f51'], i => circle(100, 100, 90 - i * 18))),
  fig('corazones-capas', 'Corazones en capas', 'geometria', ['corazón', 'amor', 'san valentín'], 140, 'Cuatro corazones de mayor a menor.', nested(['Corazón 1', 'Corazón 2', 'Corazón 3', 'Corazón 4'], ['#b5179e', '#f72585', '#ff8fab', '#ffe5ec'], i => heart(100, 100 + i * 4, 180 - i * 44))),
  fig('mandala', 'Mandala de pétalos', 'geometria', ['mandala', 'pétalos', 'simetría'], 180, 'Tres coronas de pétalos, estrella y centro: cinco profundidades.', [
    ['Corona de 16', '#264653', petals(100, 100, 16, 52, 96)], ['Corona de 12', '#2a9d8f', petals(100, 100, 12, 40, 78, 15)], ['Corona de 8', '#e9c46a', petals(100, 100, 8, 28, 58, 22.5)],
    ['Estrella', '#e76f51', star(100, 100, 8, 14, 32)], ['Centro', '#f4f1de', circle(100, 100, 10)]]),
  fig('zigzag', 'Franjas en zigzag', 'geometria', ['zigzag', 'chevron', 'franjas'], 180, 'Cuatro franjas en zigzag de colores.', nested(['Franja 1', 'Franja 2', 'Franja 3', 'Franja 4'], ['#e63946', '#f4a261', '#2a9d8f', '#264653'], i => stroke(range(9).map(k => [k * 25, 40 + i * 40 + (k % 2 ? -18 : 18)] as [number, number]), 24))),
  fig('estrella-patchwork', 'Estrella de rombos', 'geometria', ['patchwork', 'estrella', 'rombos'], 160, 'Estrella de ocho rombos y cuatro rombos de contraste encima.', [
    ['Estrella', '#3d6f9e', around(8, 100, 100, () => poly([[100, 100], [72, 64], [100, 8], [128, 64]]))], ['Rombos de contraste', '#e9c46a', around(4, 100, 100, () => poly([[100, 100], [76, 66], [100, 16], [124, 66]]))], ['Centro', '#ffffff', regular(100, 100, 12, 8, 22.5)]]),
  fig('venn', 'Tres círculos que se cruzan', 'geometria', ['círculos', 'colores', 'mezcla'], 160, 'Tres círculos de colores primarios; cada cruce es una pieza de su color mezclado.', (() => {
    const A = circle(78, 80, 58), B = circle(122, 80, 58), C = circle(100, 120, 58);
    return [['Círculo rojo', '#e63946', A], ['Círculo azul', '#3d8bd9', B], ['Círculo amarillo', '#f6d55c', C], ['Cruce morado', '#7b5ea7', inter(A, B)], ['Cruce verde', '#57b26a', inter(B, C)], ['Cruce naranja', '#f4a261', inter(A, C)], ['Centro', '#6b4423', inter(inter(A, B), C)]] as LayerSpec[];
  })()),
  fig('cuadrados-girados', 'Cuadrados girados', 'geometria', ['cuadrados', 'rombos', 'geometría'], 150, 'Cinco cuadrados alternando la orientación, cada uno dentro del anterior.', nested(['Cuadrado 1', 'Rombo 2', 'Cuadrado 3', 'Rombo 4', 'Cuadrado 5'], ['#1d3557', '#457b9d', '#a8dadc', '#f1faee', '#e63946'], i => turn(rect(100 - (170 / 1.414 ** i) / 2, 100 - (170 / 1.414 ** i) / 2, 170 / 1.414 ** i, 170 / 1.414 ** i), i % 2 ? 45 : 0, 100, 100))),

  // ---------------------------------------------------------------- Abstractos
  fig('manchas', 'Manchas orgánicas', 'abstracto', ['manchas', 'orgánico', 'moderno'], 170, 'Cinco manchas libres que se superponen.', [
    ['Mancha terracota', '#c8553d', blob(72, 80, 56, 1, 0.32)], ['Mancha mostaza', '#e0a21b', blob(132, 72, 48, 2, 0.32)], ['Mancha turquesa', '#2a9d8f', blob(112, 130, 58, 3, 0.32)],
    ['Mancha rosa', '#f28482', blob(60, 142, 36, 4, 0.32)], ['Mancha azul noche', '#264653', blob(150, 150, 28, 5, 0.32)]]),
  fig('ondas', 'Ondas de color', 'abstracto', ['ondas', 'franjas', 'agua'], 190, 'Cinco franjas onduladas que se montan unas sobre otras.', nested(['Onda 1', 'Onda 2', 'Onda 3', 'Onda 4', 'Onda 5'], ['#03045e', '#0077b6', '#00b4d8', '#90e0ef', '#caf0f8'], i => waveBand(18 + i * 32, 40, 9, 1.5, i * 0.9))),
  fig('espiral-doble', 'Espiral doble', 'abstracto', ['espiral', 'movimiento', 'hipnótico'], 150, 'Círculo de fondo y dos espirales entrelazadas.', [
    ['Fondo', '#f4f1de', circle(100, 100, 92)], ['Espiral 1', '#e07a5f', spiral(100, 100, 4, 80, 2.6, 13)], ['Espiral 2', '#3d405b', spiral(100, 100, 4, 80, 2.6, 13, 180)]]),
  fig('constelacion-formas', 'Constelación de formas', 'abstracto', ['formas', 'juego', 'moderno'], 180, 'Composición libre: círculo, media luna, estrella, línea curva y puntos.', [
    ['Línea curva', '#1d1d1d', curve([[10, 150], [60, 110], [110, 150], [160, 100], [196, 120]], 8)], ['Círculo', '#e63946', circle(60, 60, 36)], ['Media luna', '#3d8bd9', minus(circle(140, 70, 34), circle(156, 58, 30))],
    ['Estrella', '#1d1d1d', star(120, 150, 6, 8, 26)], ['Puntos', '#f6d55c', uni(circle(30, 120, 8), circle(176, 160, 9), circle(96, 30, 7))], ['Ojo', '#f6d55c', leaf(36, 60, 84, 60, 20)]]),
  fig('algas-recortadas', 'Algas recortadas', 'abstracto', ['recortes', 'collage', 'algas'], 170, 'Dos bloques de color y algas recortadas en papel… de tela.', [
    ['Bloque azul', '#264b96', rect(10, 10, 108, 180)], ['Bloque rosa', '#f28482', rect(92, 34, 98, 156)], ['Alga verde', '#2a9d8f', seaweed(60, 175, 30, 24, 3)], ['Alga negra', '#1d1d1d', seaweed(140, 180, 50, 20, 9)],
    ['Estrella de mar', '#f6d55c', petals(150, 70, 5, 6, 20, 0, 0.9)]]),
  fig('bauhaus', 'Geometría Bauhaus', 'abstracto', ['bauhaus', 'geometría', 'primarios'], 160, 'Cuadrado, semicírculo, círculo, triángulo y barra en colores primarios.', [
    ['Cuadrado', '#f2c230', rect(20, 20, 160, 160)], ['Semicírculo', '#d62828', halfDisk(100, 100, 72)], ['Triángulo', '#1d1d1d', poly([[110, 180], [180, 180], [180, 110]])], ['Círculo', '#264b96', circle(70, 132, 32)], ['Barra', '#f4f1de', rect(20, 96, 160, 10)]]),
  fig('terrazo', 'Terrazo', 'abstracto', ['terrazo', 'piedras', 'moteado'], 150, 'Base redonda y fragmentos de cuatro colores.', (() => {
    const t = terrazzo();
    return [['Base', '#efe6d8', circle(100, 100, 86)], ['Fragmentos rosa', '#f28482', t[0]], ['Fragmentos verdes', '#84a98c', t[1]], ['Fragmentos mostaza', '#e0a21b', t[2]], ['Fragmentos azules', '#3d5a80', t[3]]] as LayerSpec[];
  })()),
  fig('gotas', 'Gotas superpuestas', 'abstracto', ['gotas', 'lluvia', 'colores'], 150, 'Seis gotas de colores que se pisan.', nested(['Gota 1', 'Gota 2', 'Gota 3', 'Gota 4', 'Gota 5', 'Gota 6'], RAINBOW, i => drop(54 + (i % 3) * 46, 76 + Math.floor(i / 3) * 64, 30, 62, -90 + (i % 2 ? 15 : -15)))),
  fig('flujo', 'Líneas de flujo', 'abstracto', ['líneas', 'curvas', 'movimiento'], 190, 'Cinco cintas curvas que se cruzan por encima unas de otras.', nested(['Cinta 1', 'Cinta 2', 'Cinta 3', 'Cinta 4', 'Cinta 5'], ['#ef476f', '#ffd166', '#06d6a0', '#118ab2', '#073b4c'], i => curve([[0, 40 + i * 30], [60, 10 + i * 34], [120, 90 + i * 14], [200, 30 + i * 32]], 18))),
  fig('reticula', 'Retícula de color', 'abstracto', ['retícula', 'bloques', 'moderno'], 160, 'Bloques de color y barras negras encima.', [
    ['Bloque rojo', '#d62828', rect(10, 10, 110, 100)], ['Bloque azul', '#264b96', rect(110, 110, 80, 80)], ['Bloque amarillo', '#f2c230', rect(10, 140, 60, 50)], ['Bloque blanco', '#f4f1de', rect(110, 10, 80, 100)],
    ['Barras', '#1d1d1d', uni(rect(108, 10, 10, 180), rect(10, 106, 180, 10), rect(64, 106, 8, 84), rect(10, 136, 98, 8))]]),

  // ---------------------------------------------------------------- Psicodélicos
  fig('sol-psicodelico', 'Sol psicodélico', 'psicodelico', ['sol', 'psicodélico', 'setentas'], 180, 'Rayos, tres anillos ondulados desfasados y espiral central.', [
    ['Rayos', '#ff9f1c', star(100, 100, 24, 60, 98)], ['Onda rosa', '#ff4f9a', wavy(100, 100, 58, 6, 12)], ['Onda amarilla', '#ffe066', wavy(100, 100, 46, 5, 12, 0.5)],
    ['Onda violeta', '#5f4bb6', wavy(100, 100, 34, 4, 12, 1)], ['Espiral', '#e71d36', spiral(100, 100, 2, 24, 2.5, 6)]]),
  fig('remolino', 'Remolino de ondas', 'psicodelico', ['remolino', 'ondas', 'hipnótico'], 180, 'Siete anillos ondulados que giran un poco en cada capa.', nested(range(7).map(i => `Anillo ${i + 1}`), PSY, i => wavy(100, 100, 94 - i * 13, 6 - i * 0.4, 7, i * 0.6))),
  fig('hongo-psicodelico', 'Hongo psicodélico', 'psicodelico', ['hongo', 'psicodélico', 'setentas'], 170, 'Pie con franjas, sombrero en cuatro ondas y lunares.', [
    ['Pie', '#fff1d0', rrect(76, 96, 48, 100, 22)], ['Franjas del pie', '#ff9f1c', inter(rrect(76, 96, 48, 100, 22), uni(rect(70, 124, 60, 10), rect(70, 152, 60, 10)))],
    ...nested(['Sombrero 1', 'Sombrero 2', 'Sombrero 3', 'Sombrero 4'], ['#5f4bb6', '#ff4f9a', '#ffe066', '#2ec4b6'], i => inter(wavy(100, 104, 92 - i * 18, 5, 10, i * 0.7, 1, 0.85), rect(0, 0, 200, 104))),
    ['Lunares', '#ffffff', uni(circle(70, 60, 8), circle(110, 40, 7), circle(140, 70, 7))]]),
  fig('flor-arcoiris', 'Flor arcoíris', 'psicodelico', ['flor', 'arcoíris', 'hippie'], 170, 'Seis coronas de pétalos, cada una girada sobre la anterior.', nested(range(6).map(i => `Corona ${i + 1}`), RAINBOW, i => petals(100, 100, 8, 20 + (5 - i) * 6, 96 - i * 14, i % 2 ? 22.5 : 0))),
  fig('ondas-concentricas', 'Ondas concéntricas', 'psicodelico', ['ondas', 'vibración', 'colores'], 170, 'Siete círculos ondulados con cada vez más ondas.', nested(range(7).map(i => `Onda ${i + 1}`), PSY.slice().reverse(), i => wavy(100, 100, 92 - i * 12, 4, 5 + i, i))),
  fig('mariposa-psicodelica', 'Mariposa psicodélica', 'psicodelico', ['mariposa', 'psicodélico', 'colores'], 180, 'Alas con tres anillos de color, ojos en las alas y cuerpo.', [
    ...nested(['Alas 1', 'Alas 2', 'Alas 3'], ['#5f4bb6', '#ff4f9a', '#ffe066'], i => uni(pair(grow(ellipse(58, 70, 48, 54, -25), 1 - i * 0.26, 58, 70)), pair(grow(ellipse(70, 144, 34, 40, 25), 1 - i * 0.26, 70, 144)))),
    ['Ojos de las alas', '#2ec4b6', uni(pair(circle(56, 70, 9)), pair(circle(70, 144, 7)))], ['Cuerpo', '#1d1d1d', uni(ellipse(100, 108, 9, 50), circle(100, 52, 11))], ['Antenas', '#1d1d1d', pair(curve([[97, 44], [90, 22], [78, 12]], 5))]]),
  fig('caleidoscopio', 'Caleidoscopio', 'psicodelico', ['caleidoscopio', 'simetría', 'colores'], 170, 'Estrellas y polígonos girados en seis profundidades.', [
    ['Estrella de 12', '#5f4bb6', star(100, 100, 12, 60, 96)], ['Hexágono', '#2ec4b6', regular(100, 100, 66, 6, 0)], ['Estrella de 8', '#ff4f9a', star(100, 100, 8, 30, 62, 0)],
    ['Cuadrado', '#ffe066', regular(100, 100, 34, 4, 45)], ['Estrella de 6', '#ff9f1c', star(100, 100, 6, 10, 26)], ['Centro', '#1d1d1d', circle(100, 100, 7)]]),
  fig('lampara-lava', 'Lámpara de lava', 'psicodelico', ['lámpara', 'setentas', 'burbujas'], 110, 'Base, cristal, burbujas y tapa.', [
    ['Cristal', '#ffb703', svg('M78 30 L122 30 L150 150 L50 150 Z')], ['Burbujas', '#e5383b', inter(svg('M78 30 L122 30 L150 150 L50 150 Z'), uni(blob(96, 60, 14, 2, 0.3), blob(112, 100, 20, 5, 0.3), blob(84, 128, 18, 7, 0.3)))],
    ['Base', '#5f4bb6', svg('M50 150 L150 150 L128 196 L72 196 Z')], ['Tapa', '#5f4bb6', svg('M74 8 L126 8 L122 32 L78 32 Z')]]),
  fig('corazon-psicodelico', 'Corazón psicodélico', 'psicodelico', ['corazón', 'psicodélico', 'arcoíris'], 160, 'Seis corazones de colores, uno dentro de otro.', nested(range(6).map(i => `Corazón ${i + 1}`), RAINBOW, i => heart(100, 100 + i * 3, 190 - i * 28))),
  fig('arcoiris-derretido', 'Arcoíris derretido', 'psicodelico', ['arcoíris', 'derretido', 'surrealista'], 180, 'Seis bandas que gotean, de fuera hacia dentro.', nested(range(6).map(i => `Banda ${i + 1}`), RAINBOW, i => {
    const r1 = 96 - i * 12 + (i ? 4 : 0), r0 = 84 - i * 12, w = r1 - r0, L = [40, 22, 50, 30, 18, 36][i], R = [24, 46, 20, 40, 30, 16][i];
    return uni(arcBand(100, 100, r0, r1, 180, 360), rrect(100 - r1, 96, w, L, w / 2), rrect(100 + r0, 96, w, R, w / 2));
  })),
  fig('planeta-psicodelico', 'Planeta psicodélico', 'psicodelico', ['planeta', 'espacio', 'ondas'], 170, 'Planeta con franjas onduladas y anillo que pasa por detrás y por delante.', (() => {
    const ring = minus(ellipse(100, 100, 96, 24, -12), ellipse(100, 100, 72, 13, -12)), P0 = circle(100, 100, 56);
    return [['Anillo de atrás', '#ffe066', ring], ['Planeta', '#5f4bb6', P0], ...nested(['Franja 1', 'Franja 2', 'Franja 3'], ['#ff4f9a', '#2ec4b6', '#ff9f1c'], i => inter(P0, waveBand(56 + i * 30, 14, 6, 2, i))),
      ['Anillo de delante', '#fff1a8', inter(ring, turn(rect(0, 100, 200, 100), -12, 100, 100))]] as LayerSpec[];
  })()),

  // ---------------------------------------------------------------- Arte
  fig('vitral', 'Vitral', 'arte', ['vitral', 'vidriera', 'mosaico'], 160, 'Ventana oscura de base y vidrios de cinco colores separados por el «plomo».', stainedGlass()),
  fig('guitarra-cubista', 'Guitarra cubista', 'arte', ['cubismo', 'guitarra', 'collage'], 170, 'Planos de fondo, cuerpo partido en dos tonos, boca y mástil.', [
    ['Plano gris', '#9a8c7a', turn(rect(30, 20, 110, 150), -12, 85, 95)], ['Plano ocre', '#c9a227', turn(rect(80, 50, 100, 130), 10, 130, 115)], ['Cuerpo claro', '#d9b382', uni(circle(80, 130, 44), circle(110, 96, 34))],
    ['Cuerpo oscuro', '#7a4e2d', inter(uni(circle(80, 130, 44), circle(110, 96, 34)), poly([[40, 200], [200, 40], [200, 200]]))], ['Boca', '#1d1d1d', circle(94, 112, 14)], ['Mástil', '#3b2a1a', turn(rect(100, 10, 14, 100), 35, 107, 60)]]),
  fig('op-art', 'Op art de rayas', 'arte', ['op art', 'ilusión', 'blanco y negro'], 170, 'Fondo negro y rayas blancas que ondulan para dar volumen.', [
    ['Fondo', '#141414', rect(10, 10, 180, 180)], ['Rayas', '#f4f1de', uni(...range(9).map(i => inter(waveBand(14 + i * 20, 10, 6 * Math.sin((i / 8) * Math.PI), 1, 0), rect(10, 10, 180, 180))))]]),
  fig('bodegon', 'Bodegón', 'arte', ['bodegón', 'jarrón', 'frutas'], 170, 'Mesa, mantel, jarrón con flores, peras y naranja.', [
    ['Mesa', '#8c4a2f', rect(0, 150, 200, 50)], ['Mantel', '#f4f1de', poly([[20, 140], [180, 140], [196, 190], [4, 190]])], ['Tallos', '#3f8f4a', uni(curve([[90, 80], [70, 40]], 5), curve([[92, 80], [96, 30]], 5), curve([[94, 80], [120, 44]], 5))],
    ['Flores', '#e63946', uni(petals(70, 40, 6, 6, 16), petals(96, 28, 6, 6, 16), petals(120, 44, 6, 6, 16))], ['Jarrón', '#3d6f9e', svg('M82 76 L106 76 C104 90 126 104 124 128 C122 148 70 148 66 128 C64 104 84 90 82 76 Z')],
    ['Pera', '#b5c95a', uni(circle(150, 140, 18), circle(150, 120, 11))], ['Naranja', '#f28c38', circle(40, 140, 18)]]),
  fig('paisaje-naif', 'Paisaje naíf', 'arte', ['paisaje', 'naíf', 'campo'], 200, 'Sol, tres colinas, casita y árboles redondos.', [
    ['Sol', '#f6c945', circle(150, 44, 24)], ['Colina lejana', '#a7c957', svg('M0 110 Q60 50 120 100 Q160 70 200 96 L200 200 L0 200 Z')], ['Colina media', '#6a994e', svg('M0 140 Q50 100 110 136 Q160 110 200 130 L200 200 L0 200 Z')],
    ['Colina cercana', '#386641', svg('M0 170 Q70 140 130 168 Q170 156 200 166 L200 200 L0 200 Z')], ['Pared de la casa', '#f4f1de', rect(120, 100, 34, 28)], ['Tejado', '#bc4749', poly([[114, 102], [137, 82], [160, 102]])],
    ['Copas de los árboles', '#2d6a4f', uni(circle(40, 100, 15), circle(76, 116, 12))], ['Troncos', '#6b4423', uni(rect(37, 112, 6, 22), rect(73, 126, 6, 18))]]),
  fig('gran-ola', 'Gran ola', 'arte', ['ola', 'mar', 'estampa'], 200, 'Mar, gran ola curva con espuma en garras, montaña pequeña y barca.', [
    ['Montaña', '#f4f1de', poly([[120, 150], [140, 124], [160, 150]])], ['Mar', '#355c7d', svg('M0 150 Q50 136 100 150 Q150 164 200 148 L200 200 L0 200 Z')],
    ['Gran ola', '#2a4d69', svg('M0 190 C10 120 40 40 110 30 C160 24 180 60 160 80 C150 60 120 56 104 70 C80 92 90 140 120 160 L0 200 Z')], ['Interior de la ola', '#4b86b4', svg('M30 180 C40 120 70 70 110 64 C96 84 90 120 104 150 Z')],
    ['Espuma', '#f4f1de', uni(...range(7).map(i => circle(118 + i * 7 - (i > 3 ? (i - 3) * 12 : 0), 34 + i * 5, 7)), spiral(146, 70, 2, 12, 1.1, 6))], ['Barca', '#c9a227', leaf(130, 168, 190, 164, 10, 0.1)]]),
  fig('cielo-remolinos', 'Cielo en remolinos', 'arte', ['noche', 'remolinos', 'estrellas'], 200, 'Cielo con remolinos, luna, estrellas con halo, ciprés en llama y pueblo.', [
    ['Cielo', '#1d3557', rect(0, 0, 200, 150)], ['Remolinos', '#457b9d', uni(spiral(70, 60, 4, 30, 1.6, 9), spiral(130, 80, 4, 24, 1.4, 8))], ['Halos', '#a8dadc', uni(circle(30, 30, 14), circle(170, 40, 18), circle(110, 24, 11))],
    ['Luna y estrellas', '#f6d55c', uni(minus(circle(170, 40, 12), circle(176, 36, 10)), star(30, 30, 6, 4, 9), star(110, 24, 6, 3, 7))], ['Pueblo', '#264653', uni(rect(80, 140, 120, 40), poly([[90, 140], [100, 128], [110, 140]]), poly([[130, 140], [142, 126], [154, 140]]), rect(170, 118, 8, 30))],
    ['Colinas', '#2a9d8f', svg('M0 160 Q60 130 120 160 Q160 150 200 164 L200 200 L0 200 Z')], ['Ciprés', '#1b4332', svg('M40 200 C20 150 30 90 44 40 C52 90 70 150 60 200 Z')]]),
  fig('corazon-pop', 'Corazón pop', 'arte', ['pop art', 'corazón', 'puntos'], 150, 'Corazón rojo, puntos de trama y destello amarillo.', [
    ['Destello', '#f6d55c', star(100, 100, 12, 64, 98)], ['Corazón', '#e63946', heart(100, 104, 150)], ['Puntos de trama', '#ff8fab', inter(heart(100, 104, 150), uni(...range(7).flatMap(r => range(8).map(c => circle(38 + c * 18 + (r % 2) * 9, 48 + r * 18, 5 - r * 0.35)))))],
    ['Brillo', '#ffffff', ellipse(62, 72, 9, 16, 35)]]),
  fig('azulejo', 'Azulejo de flores', 'arte', ['azulejo', 'talavera', 'mosaico'], 150, 'Cuadrado, círculo, flor de ocho pétalos, centro y esquinas con hojas.', [
    ['Azulejo', '#f4f1de', rect(10, 10, 180, 180)], ['Esquinas', '#1d4e89', uni(...[[10, 10], [190, 10], [190, 190], [10, 190]].map(([x, y]) => inter(circle(x, y, 44), rect(10, 10, 180, 180))))],
    ['Círculo', '#1d4e89', minus(circle(100, 100, 70), circle(100, 100, 60))], ['Flor', '#1d4e89', petals(100, 100, 8, 14, 52)], ['Corazón de la flor', '#f2c230', circle(100, 100, 14)], ['Hojas de las esquinas', '#f2c230', uni(...[[34, 34], [166, 34], [166, 166], [34, 166]].map(([x, y]) => turn(leaf(x - 12, y, x + 12, y, 10), 45 * (x < 100 === y < 100 ? 1 : -1), x, y)))]])
];

