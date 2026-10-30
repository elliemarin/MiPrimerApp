import { ORGANIC_SHAPES, SHAPE_CATEGORY_LABEL } from './shapes';
import { parseSvgPath } from '../lib/draw/svgpath';
import { cmdsToSvg, transformCmds } from '../lib/draw/paths';

export const EMBROIDERY_CATEGORY_LABEL = {
  ...SHAPE_CATEGORY_LABEL, objetos: 'Objetos y aficiones', escenas: 'Pequeñas escenas', emblemas: 'Emblemas y medallones'
} as const;
export type EmbroideryCategory = keyof typeof EMBROIDERY_CATEGORY_LABEL;
export interface EmbroideryPart { d: string; color: string; name?: string }
export interface EmbroideryMotif {
  id: string;
  name: string;
  category: EmbroideryCategory;
  tags: string[];
  aspect: number;
  /** Original artwork in 0..100; colors are design references, not thread-brand codes. */
  parts: EmbroideryPart[];
  composition?: boolean;
}

const C = { ink: '#202824', yellow: '#F5C842', cream: '#FFF5DA', red: '#D94F54', pink: '#E78FAD', green: '#4C8864', mint: '#9FCDA0', blue: '#5484BA', sky: '#D9EFF2', orange: '#E89042', brown: '#95634B', plum: '#875C94', white: '#FFFFFF' };
const part = (d: string, color: string, name?: string): EmbroideryPart => ({ d, color, ...(name ? { name } : {}) });
const ellipse = (x: number, y: number, rx: number, ry = rx) => `M${x-rx} ${y}a${rx} ${ry} 0 1 0 ${rx*2} 0a${rx} ${ry} 0 1 0 ${-rx*2} 0Z`;
const rect = (x: number, y: number, w: number, h: number) => `M${x} ${y}h${w}v${h}h${-w}Z`;
const poly = (points: number[][]) => points.map(([x,y],i)=>`${i?'L':'M'}${x} ${y}`).join(' ')+'Z';
const round = (x: number,y: number,w: number,h: number,r=8) => `M${x+r} ${y}H${x+w-r}Q${x+w} ${y} ${x+w} ${y+r}V${y+h-r}Q${x+w} ${y+h} ${x+w-r} ${y+h}H${x+r}Q${x} ${y+h} ${x} ${y+h-r}V${y+r}Q${x} ${y} ${x+r} ${y}Z`;
const eyes = (x1=37,x2=63,y=48) => [part(ellipse(x1,y,3),C.ink,'Ojos'),part(ellipse(x2,y,3),C.ink,'Ojos')];
const motif = (id:string,name:string,category:EmbroideryCategory,parts:EmbroideryPart[],tags:string[]=[]):EmbroideryMotif => ({id,name,category,parts,tags,aspect:1});
const face = (color:string,ears:EmbroideryPart[]=[]) => [...ears,part(ellipse(50,53,35,34),color,'Cara'),...eyes(),part(ellipse(50,60,4,3),C.ink,'Nariz')];

// Each drawing is constructed from original geometric paths. The bee deliberately
// retains separate yellow/black/wing contours, rather than a recolored silhouette.
const authored:EmbroideryMotif[] = [
  motif('abeja','Abeja','insectos',[
    part(ellipse(33,28,18,23),C.sky,'Alas'),part(ellipse(67,28,18,23),C.sky,'Alas'),
    part(ellipse(50,61,27,32),C.yellow,'Cuerpo amarillo'),
    part('M25 49Q50 56 75 49L77 57Q50 64 23 57Z',C.ink,'Rayas negras'),
    part('M24 67Q50 74 76 67L72 76Q50 83 28 76Z',C.ink,'Rayas negras'),
    part(poly([[45,90],[55,90],[50,99]]),C.ink,'Aguijón'),
    part(ellipse(50,31,18,15),C.yellow,'Cabeza'),...eyes(44,56,30),
    part(poly([[42,20],[35,9],[38,7],[45,19]]),C.ink,'Antenas'),part(poly([[55,19],[62,7],[65,9],[58,20]]),C.ink,'Antenas')
  ],['abejita','miel','amarillo','negro','insecto']),
  motif('mariposa','Mariposa','insectos',[
    part('M45 45C23 4 3 9 6 34Q6 52 32 55C5 57 7 87 25 88Q43 87 47 58Z',C.pink,'Alas izquierdas'),
    part('M55 45C77 4 97 9 94 34Q94 52 68 55C95 57 93 87 75 88Q57 87 53 58Z',C.plum,'Alas derechas'),
    part(ellipse(25,34,8),C.yellow),part(ellipse(75,34,8),C.yellow),part(ellipse(30,70,5),C.cream),part(ellipse(70,70,5),C.cream),
    part(round(46,24,8,65,4),C.ink,'Cuerpo'),part(poly([[47,28],[39,10],[42,8],[50,24],[58,8],[61,10],[53,28]]),C.ink,'Antenas')
  ],['alas','jardín']),
  motif('mariquita','Mariquita','insectos',[
    part(ellipse(50,55,34,39),C.ink,'Contorno'),part('M47 18C7 22 8 85 47 92Z',C.red,'Ala izquierda'),part('M53 18C93 22 92 85 53 92Z',C.red,'Ala derecha'),
    part(ellipse(50,17,17,13),C.ink,'Cabeza'),part(ellipse(31,37,6),C.ink),part(ellipse(29,64,7),C.ink),part(ellipse(69,37,6),C.ink),part(ellipse(71,64,7),C.ink),...eyes(44,56,14)
  ],['catarina','catarinita','rojo','negro']),
  motif('zorro-bosque','Zorro del bosque','animales',face(C.orange,[part(poly([[18,35],[16,4],[42,25]]),C.orange),part(poly([[58,25],[84,4],[82,35]]),C.orange)]).concat([
    part('M17 48L47 68L50 59L53 68L83 48Q80 83 50 87Q20 83 17 48Z',C.cream,'Hocico'),...eyes(35,65,45),part(ellipse(50,64,5,4),C.ink)
  ]),['zorrito','bosque']),
  motif('panda-amigo','Panda','animales',[
    part(ellipse(25,22,17),C.ink,'Orejas'),part(ellipse(75,22,17),C.ink,'Orejas'),part(ellipse(50,53,36,35),C.cream,'Cara'),
    part(ellipse(34,46,10,14),C.ink,'Manchas'),part(ellipse(66,46,10,14),C.ink,'Manchas'),part(ellipse(34,43,3),C.white),part(ellipse(66,43,3),C.white),part(ellipse(50,63,6,4),C.ink)
  ],['oso','blanco','negro']),
  motif('gato-curioso','Gato curioso','animales',face(C.orange,[part(poly([[17,40],[16,6],[42,24]]),C.orange),part(poly([[58,24],[84,6],[83,40]]),C.orange)]).concat([
    part(poly([[21,28],[22,15],[33,24]]),C.pink),part(poly([[67,24],[78,15],[79,28]]),C.pink),part(rect(11,58,23,2),C.ink),part(rect(66,58,23,2),C.ink),part(poly([[45,59],[55,59],[50,64]]),C.pink)
  ]),['gatito','mascota']),
  motif('perro-companero','Perro compañero','animales',face(C.cream,[part(ellipse(20,44,14,31),C.brown),part(ellipse(80,44,14,31),C.brown)]).concat([
    part(ellipse(50,66,17,13),C.white),part(ellipse(50,59,6,4),C.ink),part('M45 72Q50 83 55 72V65H45Z',C.pink)
  ]),['perrito','cachorro','mascota']),
  motif('conejo-orejitas','Conejo de orejas largas','animales',face(C.cream,[part(ellipse(32,26,12,24),C.cream),part(ellipse(68,26,12,24),C.cream),part(ellipse(32,24,5,17),C.pink),part(ellipse(68,24,5,17),C.pink)]),['conejito','pascua']),
  motif('koala-dulce','Koala','animales',face('#A6AAA5',[part(ellipse(18,37,17), '#A6AAA5'),part(ellipse(82,37,17),'#A6AAA5'),part(ellipse(18,37,10),C.cream),part(ellipse(82,37,10),C.cream)]).concat([part(ellipse(50,56,8,13),C.ink)]),['australia','animal']),
  motif('oveja-nube','Ovejita','animales',[
    ...[[28,27],[48,20],[69,27],[79,47],[70,68],[50,76],[29,68],[19,48]].map(([x,y])=>part(ellipse(x,y,18),C.cream,'Lana')),
    part(ellipse(50,54,22,27),C.brown,'Cara'),...eyes(42,58,50)
  ],['oveja','lana','granja']),
  motif('rana-estanque','Rana del estanque','animales',[
    part(ellipse(50,62,39,29),C.green),part(ellipse(29,31,16),C.green),part(ellipse(71,31,16),C.green),part(ellipse(29,29,10),C.cream),part(ellipse(71,29,10),C.cream),...eyes(29,71,29),
    part('M30 65Q50 80 70 65Q50 89 30 65Z',C.ink),part(ellipse(23,60,7,4),C.pink),part(ellipse(77,60,7,4),C.pink)
  ],['ranita','sapo','verde']),
  motif('pinguino-polar','Pingüino','animales',[
    part(ellipse(50,53,29,43),C.ink),part(ellipse(50,64,22,28),C.cream),part(ellipse(38,34,9,12),C.white),part(ellipse(62,34,9,12),C.white),...eyes(39,61,34),
    part(poly([[42,48],[58,48],[50,57]]),C.orange),part(ellipse(32,94,15,5),C.orange),part(ellipse(68,94,15,5),C.orange)
  ],['hielo','polar']),
  motif('leon-sol','León con melena','animales',[
    part(ellipse(50,51,46),C.orange,'Melena'),...face(C.yellow),part(ellipse(50,66,17,10),C.cream),part(poly([[44,58],[56,58],[50,64]]),C.brown)
  ],['leoncito','sabana']),
  motif('elefante-amable','Elefante','animales',[
    part(ellipse(24,44,22,29),'#8399AD'),part(ellipse(76,44,22,29),'#8399AD'),part(ellipse(24,44,13,19),C.pink),part(ellipse(76,44,13,19),C.pink),
    part(ellipse(50,45,27,33),'#A6BBC8'),part('M42 53H58V83Q58 98 43 98H34V87H41Q44 87 44 82Z','#A6BBC8'),...eyes(37,63,40)
  ],['elefantito','selva']),
  motif('dinosaurio-brote','Dinosaurio de jardín','animales',[
    part(poly([[22,62],[11,48],[25,46],[18,31],[36,35],[39,18],[51,30],[65,21],[66,41]]),C.green,'Espinas'),
    part('M18 64Q17 40 40 37L55 22Q68 5 84 17Q98 29 85 43L70 46L68 75H60V91H45V76H34V91H21V75L6 67Z',C.mint,'Cuerpo'),part(ellipse(78,24,3),C.ink)
  ],['dino','dinosaurio','bebé']),
  motif('buho-nocturno','Búho nocturno','animales',[
    part('M18 12L36 26Q50 20 64 26L82 12L79 43Q92 86 50 96Q8 86 21 43Z',C.brown),part(ellipse(34,46,17,19),C.cream),part(ellipse(66,46,17,19),C.cream),...eyes(34,66,46),
    part(poly([[43,63],[57,63],[50,74]]),C.orange),part('M35 78Q50 65 65 78L60 91H40Z',C.cream)
  ],['búho','lechuza','noche']),
  motif('tortuga-marina-color','Tortuga marina','mar',[
    part(ellipse(50,16,13,15),C.green),part(ellipse(18,44,12,20),C.green),part(ellipse(82,44,12,20),C.green),part(ellipse(25,82,13,16),C.green),part(ellipse(75,82,13,16),C.green),
    part(ellipse(50,57,30,35),C.mint),part(poly([[50,30],[68,43],[68,66],[50,81],[32,66],[32,43]]),C.green),...eyes(45,55,13)
  ],['tortuguita','océano']),
  motif('pez-arrecife','Pez de arrecife','mar',[
    part(poly([[72,50],[97,25],[97,75]]),C.orange),part(ellipse(42,50,36,27),C.yellow),part('M35 24L46 23L49 77L38 76Z',C.orange),part('M56 27L65 32L67 68L58 74Z',C.orange),part(ellipse(22,43,4),C.ink)
  ],['pez','peces','amarillo']),
  motif('ballena-azul','Ballena azul','mar',[
    part('M5 55Q7 25 39 28Q66 28 71 54L80 55L88 30L96 30L94 70Q64 92 26 82Q4 77 5 55Z',C.blue),part('M8 65Q41 88 93 64Q81 87 32 83Q11 79 8 65Z',C.sky),part(ellipse(27,49,3),C.ink),part('M34 22L29 5H37L42 22Z M44 20L48 4H56L50 24Z',C.sky)
  ],['ballenita','océano']),
  motif('medusa-arcoiris','Medusa multicolor','mar',[
    part('M12 48Q13 8 50 8Q87 8 88 48Q70 60 50 48Q30 60 12 48Z',C.pink),part(round(23,48,8,46,4),C.plum),part(round(46,50,8,44,4),C.blue),part(round(69,48,8,46,4),C.pink),...eyes(35,65,34)
  ],['medusa','tentáculos']),
  motif('cohete-explorador','Cohete explorador','cielo',[
    part(poly([[31,59],[12,84],[29,84],[38,72]]),C.red),part(poly([[69,59],[88,84],[71,84],[62,72]]),C.red),part('M30 75V39Q31 16 50 3Q69 16 70 39V75Z',C.cream),part('M32 31Q37 14 50 3Q63 14 68 31Z',C.red),part(ellipse(50,45,13),C.blue),part(ellipse(50,45,8),C.sky),part(poly([[36,78],[44,95],[50,87],[56,97],[64,78]]),C.yellow)
  ],['espacio','astronauta','nave']),
  motif('robot-amigo','Robot amigo','objetos',[
    part(rect(47,4,6,14),C.ink),part(ellipse(50,6,5),C.red),part(round(17,18,66,44,7),C.blue),part(rect(7,29,10,22),C.yellow),part(rect(83,29,10,22),C.yellow),part(round(25,67,50,26,5),C.blue),part(ellipse(35,37,7),C.cream),part(ellipse(65,37,7),C.cream),part(rect(35,51,30,4),C.ink),part(ellipse(50,79,5),C.red)
  ],['robótico','tecnología']),
  motif('camara-viajera','Cámara fotográfica','objetos',[
    part(round(6,27,88,61,7),C.ink),part(rect(20,17,26,16),C.ink),part(rect(68,22,15,7),C.red),part(ellipse(50,57,25),C.blue),part(ellipse(50,57,18),C.sky),part(ellipse(44,50,6),C.white),part(rect(76,37,10,6),C.yellow)
  ],['foto','fotografía','cámara']),
  motif('libros-abiertos','Libro abierto','objetos',[
    part('M5 18Q26 12 48 26V89Q27 73 5 80Z',C.cream),part('M52 26Q74 12 95 18V80Q73 73 52 89Z',C.cream),part(rect(48,25,4,65),C.brown),part(rect(13,33,25,3),C.blue),part(rect(13,43,25,3),C.blue),part(rect(62,33,25,3),C.red),part(rect(62,43,25,3),C.red)
  ],['leer','lectura','libro']),
  motif('taza-cafe','Taza de café humeante','objetos',[
    part('M68 31H80Q99 31 98 50Q97 69 73 66L72 57Q88 59 88 48Q88 39 76 41Z',C.brown),part('M12 30H77L72 79Q44 96 17 79Z',C.cream),part(ellipse(44,30,32,8),C.brown),part('M24 22Q13 11 24 2H30Q20 12 31 22Z M45 22Q34 11 45 2H51Q41 12 52 22Z',C.sky)
  ],['café','cafetera','bebida']),
  motif('tetera-floral','Tetera floral','objetos',[
    part('M18 44L3 27L5 17L30 36Z',C.blue),part('M73 33Q101 24 97 52Q94 68 76 63L77 53Q90 56 89 44Q88 37 77 43Z',C.blue),part(ellipse(50,57,33,32),C.sky),part(rect(30,23,40,10),C.blue),part(ellipse(50,20,7,6),C.blue),part(ellipse(50,56,10),C.pink),part(ellipse(50,56,4),C.yellow)
  ],['té','tetera','cocina']),
  motif('cassette-retro','Casete retro','objetos',[
    part(round(5,20,90,63,7),C.plum),part(rect(13,28,74,28),C.cream),part(ellipse(29,42,10),C.ink),part(ellipse(71,42,10),C.ink),part(ellipse(29,42,5),C.cream),part(ellipse(71,42,5),C.cream),part(poly([[28,64],[72,64],[79,77],[21,77]]),C.ink)
  ],['música','casete','retro']),
  motif('vinilo-musical','Disco de vinilo','objetos',[
    part(ellipse(50,50,46),C.ink),part(ellipse(50,50,20),C.red),part(ellipse(50,50,5),C.cream),part('M14 41Q20 17 44 14L44 19Q25 22 19 42Z',C.sky)
  ],['música','disco','retro']),
  motif('casa-jardin','Casita de jardín','objetos',[
    part(rect(20,42,60,51),C.cream),part(poly([[6,45],[50,5],[94,45]]),C.red),part(rect(41,61,19,32),C.brown),part(rect(25,52,12,15),C.blue),part(rect(65,52,12,15),C.blue),part(rect(70,13,9,24),C.brown)
  ],['hogar','casita']),
  motif('globo-aventura','Globo aerostático','cielo',[
    part('M16 35Q16 4 50 4Q84 4 84 35Q84 55 63 71H37Q16 55 16 35Z',C.red),part('M39 6Q24 33 43 71H57Q76 33 61 6Z',C.yellow),part(rect(35,76,4,10),C.ink),part(rect(61,76,4,10),C.ink),part(poly([[33,84],[67,84],[61,98],[39,98]]),C.brown)
  ],['viaje','globo','aventura']),
  motif('paraguas-lluvia','Paraguas de lluvia','objetos',[
    part('M5 49Q11 8 50 8Q89 8 95 49Q80 39 66 49Q50 39 34 49Q20 39 5 49Z',C.blue),part('M34 48Q35 19 50 8Q65 19 66 48Q50 39 34 48Z',C.yellow),part('M47 46H53V84Q53 99 39 98Q25 98 25 85H32Q32 91 39 91Q47 91 47 84Z',C.brown)
  ],['lluvia','invierno']),
  motif('arcoiris-suave','Arcoíris entre nubes','cielo',[
    part('M7 71V50A43 43 0 0 1 93 50V71H80V50A30 30 0 0 0 20 50V71Z',C.red),
    part('M20 71V50A30 30 0 0 1 80 50V71H68V50A18 18 0 0 0 32 50V71Z',C.yellow),part('M32 71V50A18 18 0 0 1 68 50V71H58V50A8 8 0 0 0 42 50V71Z',C.green),part(ellipse(20,74,19,15),C.sky),part(ellipse(80,74,19,15),C.sky)
  ],['arcoiris','colores','nubes']),
  motif('maceta-sonriente','Maceta sonriente','botanica',[
    part('M46 54V22Q22 25 21 7Q43 1 50 24Q57 1 79 7Q78 25 54 22V54Z',C.green),part(poly([[21,48],[79,48],[69,94],[31,94]]),C.orange),part(rect(17,43,66,12),C.brown),...eyes(40,60,68)
  ],['planta','maceta','jardín']),
  motif('fresa-dulce','Fresa dulce','comida',[
    part('M16 35Q23 14 50 28Q77 14 84 35Q83 70 50 97Q17 70 16 35Z',C.red),part(poly([[21,17],[43,24],[50,4],[58,24],[80,17],[67,36],[50,29],[33,36]]),C.green),
    ...[[33,43],[56,43],[68,58],[45,62],[35,74],[53,81]].map(([x,y])=>part(ellipse(x,y,2,3),C.cream))
  ],['fruta','fresita']),
  motif('sandia-verano','Sandía de verano','comida',[
    part('M5 24H95Q91 89 50 92Q9 89 5 24Z',C.green),part('M13 24H87Q82 79 50 83Q18 79 13 24Z',C.cream),part('M20 24H80Q75 69 50 75Q25 69 20 24Z',C.red),
    ...[[36,39],[64,39],[50,57]].map(([x,y])=>part(ellipse(x,y,2.5,4),C.ink))
  ],['fruta','sandía','verano']),
  motif('aguacate-contento','Aguacate con semilla','comida',[
    part('M24 37Q28 3 50 3Q72 3 76 37Q98 70 78 89Q50 108 22 89Q2 70 24 37Z',C.green),part('M31 38Q34 12 50 12Q66 12 69 38Q88 69 72 82Q50 98 28 82Q12 69 31 38Z',C.mint),part(ellipse(50,66,18,21),C.brown),...eyes(40,60,34)
  ],['palta','fruta']),
  motif('donita-fiesta','Dona con chispas','comida',[
    part(ellipse(50,50,44),C.brown),part(ellipse(50,47,40,35),C.pink),part(ellipse(50,48,14),C.brown),part(ellipse(50,48,10),C.cream),part(rect(23,28,9,3),C.yellow),part(rect(65,28,3,9),C.sky),part(rect(17,51,8,3),C.white),part(rect(69,60,10,3),C.yellow),part(rect(41,70,3,9),C.white)
  ],['dona','donut','dulce']),
  motif('pizza-amiga','Rebanada de pizza','comida',[
    part(poly([[15,14],[88,25],[30,96]]),C.brown),part(poly([[20,25],[75,34],[32,84]]),C.yellow),part('M13 13Q48 7 88 24L82 36Q47 21 17 26Z',C.orange),part(ellipse(39,37,7),C.red),part(ellipse(54,50,7),C.red),part(ellipse(34,66,6),C.red)
  ],['comida','pizza']),
  motif('sobre-corazon','Carta con corazón','celebracion',[
    part(round(5,25,90,63,5),C.cream),part(poly([[8,28],[50,62],[92,28]]),C.pink),part('M50 36C28 19 22 46 50 62C78 46 72 19 50 36Z',C.red)
  ],['amor','carta','correo']),
  motif('regalo-sorpresa','Regalo con moño','celebracion',[
    part(rect(15,35,70,57),C.pink),part(rect(9,28,82,17),C.red),part(rect(43,28,14,64),C.yellow),part('M48 27Q9 34 20 8Q34 1 50 24Q66 1 80 8Q91 34 52 27Z',C.yellow)
  ],['cumpleaños','fiesta']),
  motif('maquina-hilvana','Máquina de coser clásica','costura',[
    part(rect(7,78,87,11),C.brown),part('M14 20H69Q86 20 86 38V74H55V52H33V73H14Z',C.green),part(ellipse(68,40,11),C.yellow),part(ellipse(68,40,5),C.cream),part(rect(27,49,4,28),C.ink),part(rect(34,10,23,10),C.red),part(rect(43,2,5,8),C.ink)
  ],['costura','máquina','Singer']),
  motif('hilo-aguja','Hilo y aguja','costura',[
    part(rect(20,19,44,67),C.blue),part(rect(13,13,58,9),C.brown),part(rect(13,84,58,9),C.brown),part(rect(23,32,38,3),C.sky),part(rect(23,43,38,3),C.sky),part(rect(23,54,38,3),C.sky),part(rect(23,65,38,3),C.sky),part(poly([[77,9],[82,8],[91,94],[86,98]]),C.ink),part(ellipse(80,19,1.5,5),C.cream)
  ],['carrete','aguja','costura']),
  motif('balon-futbol','Balón de fútbol','geometria',[
    part(ellipse(50,50,45),C.cream),part(poly([[50,30],[69,44],[62,66],[38,66],[31,44]]),C.ink),part(poly([[18,20],[34,9],[28,27],[12,39]]),C.ink),part(poly([[66,9],[82,20],[88,39],[72,27]]),C.ink),part(poly([[17,72],[33,75],[39,92],[21,83]]),C.ink),part(poly([[67,75],[83,72],[79,83],[61,92]]),C.ink)
  ],['deporte','fútbol','pelota'])
];

const categoryColor:Record<string,string> = { naturaleza:C.green,botanica:C.green,hongos:C.red,insectos:C.yellow,animales:C.brown,mar:C.blue,cielo:C.yellow,comida:C.orange,costura:C.plum,geometria:C.blue,celebracion:C.red };
const base = new Map<string,EmbroideryMotif>(ORGANIC_SHAPES.map(shape=>[shape.id,{
  id:shape.id,name:shape.label,category:shape.category??'naturaleza',tags:shape.tags??[],aspect:shape.aspect,
  parts:[part(shape.d,categoryColor[shape.category??'naturaleza']??C.green,shape.label)]
}]));
for(const drawing of authored) base.set(drawing.id,drawing);

function placed(drawing:EmbroideryMotif,x:number,y:number,w:number,h:number):EmbroideryPart[] {
  return drawing.parts.map(layer=>({...layer,d:cmdsToSvg(transformCmds(parseSvgPath(layer.d),[w/100,0,0,h/100,x,y]))}));
}
const singles=[...base.values()];
const sceneSubjects=singles.filter(subject=>['botanica','insectos','animales','hongos','mar'].includes(subject.category)).slice(0,32);
const scenes:EmbroideryMotif[]=[];
const flower=base.get('margarita')!, bee=base.get('abeja')!, mushroom=base.get('amanita')??base.get('hongo')??base.get('setas-gemelas')!;
for(const subject of sceneSubjects) {
  scenes.push({id:`escena-jardin-${subject.id}`,name:`${subject.name} en el jardín`,category:'escenas',tags:[subject.name,'jardín','composición','flor'],aspect:1.15,composition:true,parts:[
    part('M3 88Q25 69 47 86Q73 66 97 88V98H3Z',C.mint,'Jardín'),...placed(subject,19,4,62,70),...placed(flower,2,63,28,30),...placed(bee,69,47,27,31)
  ]});
  scenes.push({id:`escena-noche-${subject.id}`,name:`${subject.name} bajo la luna`,category:'escenas',tags:[subject.name,'luna','noche','composición'],aspect:1,composition:true,parts:[
    part(ellipse(50,50,47), '#DFE6F2','Cielo nocturno'),part('M73 8Q47 20 71 38Q47 38 49 19Q53 7 73 8Z',C.yellow,'Luna'),part(poly([[21,13],[23,18],[29,19],[24,23],[25,29],[21,26],[16,29],[17,23],[12,19],[18,18]]),C.yellow,'Estrella'),...placed(subject,19,35,64,61)
  ]});
  scenes.push({id:`escena-bosque-${subject.id}`,name:`${subject.name} entre hojas`,category:'escenas',tags:[subject.name,'bosque','hojas','composición'],aspect:1.1,composition:true,parts:[
    part('M2 96Q20 76 38 94Q61 70 98 95V99H2Z',C.green,'Suelo'),part('M7 84Q2 23 29 4Q42 44 7 84Z',C.mint,'Hoja izquierda'),part('M93 84Q98 23 71 4Q58 44 93 84Z',C.green,'Hoja derecha'),...placed(subject,22,26,57,64),...placed(mushroom,2,64,27,31)
  ]});
}

const badgeSubjects=singles.filter(subject=>subject.parts.length<12).slice(0,30);
const badges:EmbroideryMotif[]=[];
for(const subject of badgeSubjects) {
  const borders:[string,string,EmbroideryPart[]][]=[
    ['medallon','Medallón',[part(ellipse(50,50,48),C.brown,'Marco'),part(ellipse(50,50,43),C.cream,'Fondo')]],
    ['escudo','Escudo',[part('M6 4H94V53Q93 80 50 98Q7 80 6 53Z',C.blue,'Marco'),part('M12 10H88V53Q87 75 50 90Q13 75 12 53Z',C.sky,'Fondo')]],
    ['banderin','Banderín',[part(poly([[5,3],[95,3],[95,75],[50,98],[5,75]]),C.red,'Marco'),part(poly([[11,9],[89,9],[89,71],[50,91],[11,71]]),C.cream,'Fondo')]]
  ];
  for(const [key,label,layers] of borders) badges.push({id:`${key}-${subject.id}`,name:`${label} de ${subject.name.toLowerCase()}`,category:'emblemas',tags:[subject.name,'insignia','emblema','composición'],aspect:1,composition:true,parts:[...layers,...placed(subject,22,19,56,62)]});
}

/** Individual motifs and explicitly named compositions; recolors/sizes are not counted as extra designs. */
export const EMBROIDERY_MOTIFS:readonly EmbroideryMotif[]=[...singles,...scenes,...badges];
export const findEmbroideryMotif=(id:string)=>EMBROIDERY_MOTIFS.find(drawing=>drawing.id===id);
export function filterEmbroideryMotifs(query='',category:EmbroideryCategory|'todas'='todas'):EmbroideryMotif[] {
  const normalize=(text:string)=>text.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
  const terms=normalize(query).trim().split(/\s+/).filter(Boolean);
  return EMBROIDERY_MOTIFS.filter(drawing=>(category==='todas'||drawing.category===category)&&terms.every(term=>normalize(`${drawing.name} ${drawing.tags.join(' ')} ${EMBROIDERY_CATEGORY_LABEL[drawing.category]}`).includes(term)));
}
