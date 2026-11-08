import type { Pt } from '../../geom/vec';
import { circle, ellipse, minus, poly, rect, rrect, uni } from '../../applique/shapes';
import { strokePolyline } from '../../geom/polyoffset';

/* Muebles interactivos para casitas de muñecas de tela (2026-11-08). Cada
 * mueble es una lista de partes dibujadas a la escala de una muñeca de 12 cm
 * (1 unidad = 1 mm), con el origen en el centro de su base y la y hacia arriba
 * negativa. Cada parte dice cómo se hace (fieltro, aplicación, forrada o
 * rellena) y cómo se juega con ella (puerta, solapa, bolsillo o suelta). */

export type Role = 'pared' | 'suelo' | 'tela1' | 'tela2' | 'madera' | 'blanco' | 'metal' | 'espejo' | 'verde' | 'agua' | 'noche' | 'amarillo' | 'rosa';
export type Make = 'fieltro' | 'aplique' | 'forrado' | 'relleno';
export interface Part {
  key: string; name: string; poly: Pt[]; make: Make; role: Role;
  /** Parts with the same `cut` are one pattern piece; their quantities add up. */
  cut?: string;
  /** Pieces for one copy: lined and stuffed parts are two layers. */
  qty?: number;
  mirror?: boolean;
  /** Not sewn to the house: pillows, plates, the doll. */
  loose?: boolean;
  /** How it opens: a hinge side, or a pocket. */
  opens?: 'izquierda' | 'derecha' | 'arriba' | 'abajo' | 'bolsillo';
  lines?: [Pt, Pt][];
  /** Lines embroidered on the wall around the part (cord, stems, clothesline). */
  wall?: [Pt, Pt][];
}
export interface Furniture { type: string; name: string; how: string; parts: Part[] }

const P = (x: number, y: number): Pt => ({ x, y });
const box = (x0: number, y0: number, x1: number, y1: number) => rect(Math.min(x0, x1), Math.min(y0, y1), Math.abs(x1 - x0), Math.abs(y1 - y0));
const rbox = (x0: number, y0: number, x1: number, y1: number, r: number) => rrect(Math.min(x0, x1), Math.min(y0, y1), Math.abs(x1 - x0), Math.abs(y1 - y0), r);
const thick = (pts: [number, number][], w: number) => strokePolyline(pts.map(([x, y]) => P(x, y)), w).sort((a, b) => b.length - a.length)[0];
const union = (...ps: Pt[][]) => uni(...ps).sort((a, b) => b.length - a.length)[0];
const seg = (x0: number, y0: number, x1: number, y1: number): [Pt, Pt] => [P(x0, y0), P(x1, y1)];
/** Clawfoot tub outline: flat rim, round belly. */
function tub(w: number, h: number): Pt[] {
  const pts: Pt[] = [P(-w / 2, -h), P(w / 2, -h)];
  for (let i = 0; i <= 12; i++) { const t = i / 12, a = Math.PI * t; pts.push(P((w / 2) * Math.cos(a) * (1 - 0.06 * Math.sin(a)), -h * 0.55 + (h * 0.45) * Math.sin(a))); }
  return pts.map(p => P(p.x, p.y - 8));
}

const F: Record<string, () => Furniture> = {
  cama: () => ({ type: 'cama', name: 'Cama', how: 'La manta es un bolsillo: la muñeca se mete en la cama. La almohada se cose solo por arriba.', parts: [
    { key: 'colchon', name: 'Colchón (aplicación)', poly: rbox(-48, -150, 48, 0, 10), make: 'aplique', role: 'tela2' },
    { key: 'almohada', name: 'Almohada (rellena)', poly: rbox(-36, -146, 36, -108, 9), make: 'relleno', role: 'blanco' },
    { key: 'manta', name: 'Manta-bolsillo (forrada, acolchada en rombos)', poly: rbox(-50, -100, 50, 0, 6), make: 'forrado', role: 'tela1', opens: 'bolsillo', lines: [seg(-50, -50, 0, -100), seg(0, -100, 50, -50), seg(50, -50, 0, 0), seg(0, 0, -50, -50)] }
  ] }),
  banera: () => ({ type: 'banera', name: 'Bañera', how: 'La bañera es un bolsillo abierto por arriba: la muñeca se baña dentro.', parts: [
    { key: 'ducha', name: 'Ducha (fieltro)', poly: union(thick([[-62, -70], [-62, -168], [-22, -168], [-22, -156]], 7), box(-36, -158, -8, -150)), make: 'fieltro', role: 'blanco' },
    { key: 'pata-i', cut: 'pata', name: 'Pata de la bañera (fieltro)', poly: ellipse(-46, -6, 9, 8, 0, 20), make: 'fieltro', role: 'madera' },
    { key: 'pata-d', cut: 'pata', name: 'Pata de la bañera (fieltro)', poly: ellipse(46, -6, 9, 8, 0, 20), make: 'fieltro', role: 'madera' },
    { key: 'banera', name: 'Bañera-bolsillo (forrada)', poly: tub(150, 70), make: 'forrado', role: 'tela1', opens: 'bolsillo' }
  ] }),
  armario: () => ({ type: 'armario', name: 'Armario', how: 'Dos puertas que se abren (bisagra en el lado de fuera, cierre de velcro) y un bolsillo dentro para la ropa.', parts: [
    { key: 'fondo', name: 'Fondo del armario (aplicación)', poly: box(-48, -156, 48, 0), make: 'aplique', role: 'madera' },
    { key: 'ropero', name: 'Bolsillo de la ropa (forrado)', poly: box(-40, -100, 40, -20), make: 'forrado', role: 'tela2', opens: 'bolsillo' },
    { key: 'puerta-i', cut: 'puerta-armario', name: 'Puerta del armario (forrada)', poly: box(-46, -152, -1, -4), make: 'forrado', role: 'tela1', opens: 'izquierda', mirror: true },
    { key: 'puerta-d', cut: 'puerta-armario', name: 'Puerta del armario (forrada)', poly: box(1, -152, 46, -4), make: 'forrado', role: 'tela1', opens: 'derecha', mirror: true }
  ] }),
  nevera: () => ({ type: 'nevera', name: 'Nevera', how: 'La puerta se abre (bisagra a la izquierda) y dentro hay un bolsillo-estante.', parts: [
    { key: 'cuerpo', name: 'Cuerpo de la nevera (aplicación)', poly: rbox(-38, -146, 38, 0, 8), make: 'aplique', role: 'blanco' },
    { key: 'estante', name: 'Estante-bolsillo (forrado)', poly: box(-30, -110, 30, -72), make: 'forrado', role: 'tela2', opens: 'bolsillo' },
    { key: 'puerta', name: 'Puerta de la nevera (forrada)', poly: rbox(-38, -146, 38, -52, 8), make: 'forrado', role: 'agua', opens: 'izquierda', lines: [seg(26, -122, 26, -96)] }
  ] }),
  horno: () => ({ type: 'horno', name: 'Cocina con horno', how: 'La puerta del horno baja (bisagra abajo) y dentro hay un fuego de fieltro.', parts: [
    { key: 'cuerpo', name: 'Cocina (aplicación)', poly: box(-44, -92, 44, 0), make: 'aplique', role: 'tela2' },
    { key: 'fogon-i', cut: 'fogon', name: 'Fogón (fieltro)', poly: ellipse(-20, -96, 14, 4, 0, 16), make: 'fieltro', role: 'metal' },
    { key: 'fogon-d', cut: 'fogon', name: 'Fogón (fieltro)', poly: ellipse(20, -96, 14, 4, 0, 16), make: 'fieltro', role: 'metal' },
    { key: 'fuego', name: 'Fuego (fieltro)', poly: poly([[0, -60], [12, -36], [8, -20], [-8, -20], [-12, -36]]), make: 'fieltro', role: 'amarillo' },
    { key: 'puerta', name: 'Puerta del horno (forrada)', poly: rbox(-36, -70, 36, -12, 6), make: 'forrado', role: 'blanco', opens: 'abajo', lines: [seg(-24, -60, 24, -60), seg(24, -60, 24, -30), seg(24, -30, -24, -30), seg(-24, -30, -24, -60)] }
  ] }),
  fregadero: () => ({ type: 'fregadero', name: 'Fregadero con armarios', how: 'Dos puertas que se abren a los lados; el grifo es de fieltro.', parts: [
    { key: 'grifo', name: 'Grifo (fieltro)', poly: thick([[18, -78], [18, -100], [6, -104], [-2, -96]], 6), make: 'fieltro', role: 'metal' },
    { key: 'encimera', name: 'Encimera (fieltro)', poly: box(-62, -80, 62, -68), make: 'fieltro', role: 'madera' },
    { key: 'mueble', name: 'Mueble (aplicación)', poly: box(-58, -68, 58, 0), make: 'aplique', role: 'blanco' },
    { key: 'pila', name: 'Pila (fieltro)', poly: ellipse(0, -74, 24, 5, 0, 20), make: 'fieltro', role: 'metal' },
    { key: 'puerta-i', cut: 'puerta-fregadero', name: 'Puerta del fregadero (forrada)', poly: box(-56, -64, -2, -4), make: 'forrado', role: 'tela1', opens: 'izquierda', mirror: true },
    { key: 'puerta-d', cut: 'puerta-fregadero', name: 'Puerta del fregadero (forrada)', poly: box(2, -64, 56, -4), make: 'forrado', role: 'tela1', opens: 'derecha', mirror: true }
  ] }),
  ventana: () => ({ type: 'ventana', name: 'Ventana con cortinas', how: 'Las cortinas se abren y se recogen con alzapaños de velcro (sin cintas largas).', parts: [
    { key: 'cristal', name: 'Cristal (aplicación)', poly: box(-40, -150, 40, -78), make: 'aplique', role: 'agua', lines: [seg(0, -150, 0, -78), seg(-40, -114, 40, -114)] },
    { key: 'cortina-i', cut: 'cortina', name: 'Cortina (forrada, fruncida arriba)', poly: box(-48, -156, -14, -74), make: 'forrado', role: 'tela1', opens: 'izquierda', mirror: true },
    { key: 'cortina-d', cut: 'cortina', name: 'Cortina (forrada, fruncida arriba)', poly: box(14, -156, 48, -74), make: 'forrado', role: 'tela1', opens: 'derecha', mirror: true },
    { key: 'galeria', name: 'Galería (fieltro)', poly: box(-52, -164, 52, -146), make: 'fieltro', role: 'tela1' },
    { key: 'alzapano-i', cut: 'alzapano', name: 'Alzapaño con velcro (fieltro)', poly: box(-54, -110, -40, -104), make: 'fieltro', role: 'tela2' },
    { key: 'alzapano-d', cut: 'alzapano', name: 'Alzapaño con velcro (fieltro)', poly: box(40, -110, 54, -104), make: 'fieltro', role: 'tela2' }
  ] }),
  mesa: () => ({ type: 'mesa', name: 'Mesa con mantel y sillas', how: 'El mantel es una solapa con puntilla que se levanta; las sillas son de fieltro.', parts: [
    { key: 'silla-i', cut: 'silla', name: 'Silla (fieltro)', poly: union(box(-98, -110, -90, 0), box(-98, -56, -64, -48), box(-70, -50, -64, 0)), make: 'fieltro', role: 'madera', mirror: true },
    { key: 'silla-d', cut: 'silla', name: 'Silla (fieltro)', poly: union(box(90, -110, 98, 0), box(64, -56, 98, -48), box(64, -50, 70, 0)), make: 'fieltro', role: 'madera', mirror: true },
    { key: 'mesa', name: 'Mesa (fieltro)', poly: union(ellipse(0, -66, 58, 12, 0, 32), thick([[-30, -60], [-40, 0]], 7), thick([[30, -60], [40, 0]], 7)), make: 'fieltro', role: 'madera' },
    { key: 'mantel', name: 'Mantel (forrado, puntilla en el bajo)', poly: union(ellipse(0, -68, 62, 12, 0, 32), box(-62, -68, 62, -40)), make: 'forrado', role: 'tela2', opens: 'arriba' }
  ] }),
  espejo: () => ({ type: 'espejo', name: 'Espejo', how: 'Lámina flexible de espejo de seguridad (sin vidrio) cosida con festón sobre un marco de fieltro.', parts: [
    { key: 'marco', name: 'Marco del espejo (fieltro)', poly: ellipse(0, -128, 28, 34, 0, 36), make: 'fieltro', role: 'madera' },
    { key: 'espejo', name: 'Espejo (lámina de espejo de seguridad)', poly: ellipse(0, -128, 21, 27, 0, 36), make: 'fieltro', role: 'espejo' }
  ] }),
  toalla: () => ({ type: 'toalla', name: 'Toallero con toalla', how: 'La toalla se quita: pasa por la barra y se cierra con velcro.', parts: [
    { key: 'barra', name: 'Barra del toallero (fieltro, cosida solo en los extremos)', poly: box(-38, -136, 38, -128), make: 'fieltro', role: 'metal' },
    { key: 'toalla', name: 'Toalla (rizo, doblada sobre la barra)', poly: box(-28, -132, 28, -64), make: 'fieltro', role: 'tela2', loose: true }
  ] }),
  lavadora: () => ({ type: 'lavadora', name: 'Lavadora y tendedero', how: 'La puerta redonda se abre y hay ropa de fieltro para tender con pinzas de fieltro.', parts: [
    { key: 'cuerpo', name: 'Lavadora (aplicación)', poly: rbox(-42, -86, 42, 0, 6), make: 'aplique', role: 'blanco', wall: [seg(-70, -160, 70, -160), seg(-70, -160, -70, -150), seg(70, -160, 70, -150)] },
    { key: 'puerta', name: 'Puerta de la lavadora (fieltro, cosida solo a la izquierda)', poly: circle(0, -40, 25, 32), make: 'fieltro', role: 'metal', opens: 'izquierda' },
    { key: 'cristal', name: 'Cristal de la puerta (tul o fieltro claro)', poly: circle(0, -40, 17, 28), make: 'fieltro', role: 'agua' },
    { key: 'vestido', name: 'Vestido para tender (fieltro)', poly: poly([[-10, -150], [10, -150], [12, -140], [20, -116], [-20, -116], [-12, -140]]), make: 'fieltro', role: 'tela1', loose: true },
    { key: 'camiseta', name: 'Camiseta para tender (fieltro)', poly: poly([[22, -150], [42, -150], [50, -142], [44, -136], [42, -124], [22, -124], [20, -136], [14, -142]]), make: 'fieltro', role: 'tela2', loose: true },
    { key: 'pinza', name: 'Pinza (fieltro doblado, ×4)', poly: box(-3, -156, 3, -144), make: 'fieltro', role: 'madera', qty: 4, loose: true }
  ] }),
  lampara: () => ({ type: 'lampara', name: 'Lámpara de techo', how: 'Pantalla de fieltro; el cable se borda.', parts: [
    { key: 'pantalla', name: 'Pantalla de la lámpara (fieltro)', poly: [...Array.from({ length: 13 }, (_, i) => P(-22 * Math.cos((i / 12) * Math.PI), -150 - 16 * Math.sin((i / 12) * Math.PI)))], make: 'fieltro', role: 'amarillo', wall: [seg(0, -190, 0, -166)] }
  ] }),
  alfombra: () => ({ type: 'alfombra', name: 'Alfombra', how: 'Alfombra de fieltro con flecos cortados.', parts: [
    { key: 'alfombra', name: 'Alfombra (fieltro, flecos cortados)', poly: poly([[-70, -14], [70, -14], [70, -12], [76, -10], [70, -8], [76, -6], [70, -4], [70, -2], [-70, -2], [-70, -4], [-76, -6], [-70, -8], [-76, -10], [-70, -12]]), make: 'fieltro', role: 'tela2' }
  ] }),
  inodoro: () => ({ type: 'inodoro', name: 'Inodoro', how: 'La tapa se levanta (bisagra arriba).', parts: [
    { key: 'base', name: 'Inodoro (fieltro)', poly: union(rbox(-20, -96, 20, -70, 4), ellipse(0, -46, 26, 18, 0, 28), box(-12, -46, 12, 0)), make: 'fieltro', role: 'blanco' },
    { key: 'tapa', name: 'Tapa del inodoro (forrada)', poly: ellipse(0, -48, 25, 17, 0, 28), make: 'forrado', role: 'tela2', opens: 'arriba' }
  ] }),
  sillon: () => ({ type: 'sillon', name: 'Sillón con libro', how: 'El sillón tiene un bolsillo con un libro de fieltro para leer.', parts: [
    { key: 'sillon', name: 'Sillón (fieltro)', poly: union(rbox(-50, -110, 50, -40, 18), rbox(-62, -70, -40, 0, 8), rbox(40, -70, 62, 0, 8), box(-40, -44, 40, -10)), make: 'fieltro', role: 'tela1' },
    { key: 'bolsillo', name: 'Bolsillo del libro (fieltro)', poly: box(-26, -44, 26, -14), make: 'fieltro', role: 'tela2', opens: 'bolsillo' },
    { key: 'libro', name: 'Libro (fieltro doblado)', poly: box(-14, -62, 14, -30), make: 'fieltro', role: 'rosa', loose: true }
  ] }),
  cuadro: () => ({ type: 'cuadro', name: 'Cuadro de noche', how: 'Marco de fieltro con luna y estrellas bordadas.', parts: [
    { key: 'marco', name: 'Marco (fieltro)', poly: box(-32, -150, 32, -98), make: 'fieltro', role: 'madera' },
    { key: 'cielo', name: 'Cielo (fieltro)', poly: box(-26, -144, 26, -104), make: 'fieltro', role: 'noche' },
    { key: 'luna', name: 'Luna (fieltro)', poly: minus(circle(-10, -126, 9, 24), circle(-5, -129, 8, 24)).sort((a, b) => b.length - a.length)[0], make: 'fieltro', role: 'amarillo' }
  ] }),
  platero: () => ({ type: 'platero', name: 'Platero con platos', how: 'Ranuras-bolsillo para guardar platos de fieltro.', parts: [
    { key: 'mueble', name: 'Platero (aplicación)', poly: box(-34, -160, 34, 0), make: 'aplique', role: 'madera' },
    { key: 'ranura-1', cut: 'ranura', name: 'Ranura-bolsillo (fieltro)', poly: box(-30, -126, 30, -110), make: 'fieltro', role: 'blanco', opens: 'bolsillo' },
    { key: 'ranura-2', cut: 'ranura', name: 'Ranura-bolsillo (fieltro)', poly: box(-30, -96, 30, -80), make: 'fieltro', role: 'blanco', opens: 'bolsillo' },
    { key: 'ranura-3', cut: 'ranura', name: 'Ranura-bolsillo (fieltro)', poly: box(-30, -66, 30, -50), make: 'fieltro', role: 'blanco', opens: 'bolsillo' },
    { key: 'plato', name: 'Plato (fieltro, ×3)', poly: circle(0, -140, 14, 24), make: 'fieltro', role: 'blanco', qty: 3, loose: true }
  ] }),
  lavabo: () => ({ type: 'lavabo', name: 'Lavabo', how: 'Grifos bordados (o botones si el niño tiene más de 3 años).', parts: [
    { key: 'lavabo', name: 'Lavabo (fieltro)', poly: union(rbox(-30, -86, 30, -66, 8), poly([[-10, -68], [10, -68], [14, 0], [-14, 0]])), make: 'fieltro', role: 'tela1' },
    { key: 'pila', name: 'Pila del lavabo (fieltro)', poly: ellipse(0, -84, 20, 4, 0, 18), make: 'fieltro', role: 'blanco' }
  ] }),
  maceta: () => ({ type: 'maceta', name: 'Maceta con flores', how: 'Maceta de fieltro; los tallos y flores se bordan.', parts: [
    { key: 'maceta', name: 'Maceta (fieltro)', poly: poly([[-20, -26], [20, -26], [14, 0], [-14, 0]]), make: 'fieltro', role: 'rosa', wall: [seg(-8, -26, -12, -50), seg(0, -26, 0, -56), seg(8, -26, 12, -48)] }
  ] }),
  campana: () => ({ type: 'campana', name: 'Campana extractora', how: 'Campana de fieltro o tela espejo.', parts: [
    { key: 'campana', name: 'Campana (fieltro)', poly: poly([[-8, -170], [8, -170], [8, -142], [34, -122], [-34, -122], [-8, -142]]), make: 'fieltro', role: 'metal' }
  ] }),
  banderines: () => ({ type: 'banderines', name: 'Banderines', how: 'Banderines de fieltro con el hilo bordado.', parts: Array.from({ length: 5 }, (_, i) => {
    const x = -80 + i * 40, y = -150 + Math.sin((i / 4) * Math.PI) * 10;
    return { key: `banderin-${i}`, cut: 'banderin', name: 'Banderín (fieltro, varios colores)', poly: poly([[x - 13, y], [x + 13, y], [x, y + 24]]), make: 'fieltro' as Make, role: (i % 2 ? 'tela2' : 'tela1') as Role, wall: i < 4 ? [seg(x + 13, y, x + 27, -150 + Math.sin(((i + 1) / 4) * Math.PI) * 10)] : [] };
  }) }),
  puerta: () => ({ type: 'puerta', name: 'Puerta que se abre', how: 'La puerta se abre (bisagra a la izquierda) y se cierra con un punto de velcro.', parts: [
    { key: 'hueco', name: 'Interior de la puerta (fieltro oscuro)', poly: union(box(-28, -80, 28, 0), ellipse(0, -80, 28, 26, 0, 24)), make: 'fieltro', role: 'noche' },
    { key: 'puerta', name: 'Puerta (forrada)', poly: union(box(-28, -80, 28, 0), ellipse(0, -80, 28, 26, 0, 24)), make: 'forrado', role: 'tela1', opens: 'izquierda' }
  ] }),
  fachada: () => ({ type: 'fachada', name: 'Ventanas de la fachada', how: 'Ventanas de fieltro con cruz bordada.', parts: [
    { key: 'ventana-i', cut: 'ventana-fachada', name: 'Ventana de la fachada (fieltro)', poly: box(-80, -150, -40, -110), make: 'fieltro', role: 'blanco', lines: [seg(-60, -150, -60, -110), seg(-80, -130, -40, -130)] },
    { key: 'ventana-d', cut: 'ventana-fachada', name: 'Ventana de la fachada (fieltro)', poly: box(40, -150, 80, -110), make: 'fieltro', role: 'blanco', lines: [seg(60, -150, 60, -110), seg(40, -130, 80, -130)] }
  ] }),
  ropero: () => ({ type: 'ropero', name: 'Ropero-bolsillo', how: 'Un bolsillo grande para guardar la ropa de la muñeca; la barra de la percha se borda.', parts: [
    { key: 'bolsillo', name: 'Ropero-bolsillo (forrado)', poly: box(-66, -96, 66, 0), make: 'forrado', role: 'tela2', opens: 'bolsillo', wall: [seg(-56, -124, 56, -124), seg(0, -124, 0, -134)] }
  ] }),
  'cama-suelta': () => ({ type: 'cama-suelta', name: 'Cama suelta', how: 'Colchón y almohada rellenos y una manta forrada que se sacan de la casita.', parts: [
    { key: 'colchon', name: 'Colchón suelto (relleno)', poly: rbox(-46, -140, 46, 0, 10), make: 'relleno', role: 'tela2', loose: true },
    { key: 'almohada', name: 'Almohada suelta (rellena)', poly: rbox(-30, -134, 30, -104, 8), make: 'relleno', role: 'blanco', loose: true },
    { key: 'manta', name: 'Manta suelta (forrada)', poly: rbox(-48, -90, 48, 0, 6), make: 'forrado', role: 'tela1', loose: true }
  ] }),
  jardin: () => ({ type: 'jardin', name: 'Jardín', how: 'Césped de fieltro con flores bordadas.', parts: [
    { key: 'cesped', name: 'Césped (fieltro, borde en picos)', poly: poly([[-90, 0], [-90, -30], [-78, -44], [-66, -30], [-54, -46], [-42, -30], [-30, -44], [-18, -30], [-6, -46], [6, -30], [18, -44], [30, -30], [42, -46], [54, -30], [66, -44], [78, -30], [90, -44], [90, 0]]), make: 'fieltro', role: 'verde' }
  ] }),
  muneca: () => ({ type: 'muneca', name: 'Muñequita y gato de fieltro', how: 'Muñequita plana de fieltro con vestido y un gatito: se cosen a festón y se rellenan poco.', parts: [
    { key: 'cuerpo', name: 'Muñequita (fieltro, delante y detrás)', poly: union(circle(0, -98, 18, 28), box(-14, -84, 14, -36), thick([[-7, -40], [-8, 0]], 9), thick([[7, -40], [8, 0]], 9), thick([[-13, -78], [-24, -50]], 8), thick([[13, -78], [24, -50]], 8)), make: 'fieltro', role: 'rosa', qty: 2, loose: true },
    { key: 'pelo', name: 'Pelo (fieltro, delante y detrás)', poly: union(ellipse(0, -104, 21, 16, 0, 28), ellipse(-17, -92, 6, 14, 0, 16), ellipse(17, -92, 6, 14, 0, 16)), make: 'fieltro', role: 'madera', qty: 2, loose: true },
    { key: 'vestido', name: 'Vestido (fieltro, delante y detrás)', poly: poly([[-12, -82], [12, -82], [24, -30], [-24, -30]]), make: 'fieltro', role: 'tela1', qty: 2, loose: true },
    { key: 'gato', name: 'Gatito (fieltro, delante y detrás)', poly: union(circle(60, -26, 13, 24), poly([[49, -34], [52, -46], [58, -38]]), poly([[71, -34], [68, -46], [62, -38]]), ellipse(60, -8, 12, 9, 0, 20)), make: 'fieltro', role: 'metal', qty: 2, loose: true }
  ] })
};
export const FURNITURE_TYPES = Object.keys(F);
export const furniture = (type: string): Furniture => {
  const f = F[type];
  if (!f) throw new Error(`Mueble desconocido: ${type}`);
  return f();
};
/** Width and height of a piece of furniture (mm at the 12 cm doll scale). */
export function furnitureBox(f: Furniture) {
  const pts = f.parts.filter(p => !p.loose).flatMap(p => [...p.poly, ...(p.wall ?? []).flat()]);
  const xs = pts.map(p => p.x), ys = pts.map(p => p.y);
  return { minX: Math.min(...xs), maxX: Math.max(...xs), minY: Math.min(...ys), maxY: Math.max(...ys) };
}
