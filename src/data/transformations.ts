import type { Params } from '../lib/pattern/generator';

export type TransformationGarment = 'pantalon' | 'hoodie' | 'camisa' | 'chaqueta' | 'vestido' | 'falda';
export type TransformationConstruction = 'panel' | 'cuna' | 'volante' | 'puno' | 'bolsillo' | 'bolsillo-tapa' | 'bolsillo-fuelle' | 'parche' | 'trabilla' | 'banda';
export interface TransformationIdea {
  id: string;
  name: string;
  garment: TransformationGarment;
  construction: TransformationConstruction;
  effect: string;
  placement: string;
  fabric: string;
  level: 1 | 2 | 3;
  params: Params;
}
export const TRANSFORMATION_GARMENTS: Record<TransformationGarment, string> = {
  pantalon: 'Pantalones', hoodie: 'Hoodies y sudaderas', camisa: 'Camisas y tops', chaqueta: 'Chaquetas', vestido: 'Vestidos', falda: 'Faldas'
};
export const TRANSFORMATION_CONSTRUCTIONS: Record<TransformationConstruction, string> = {
  panel: 'Panel de sustitución', cuna: 'Cuña de amplitud', volante: 'Volante fruncido', puno: 'Puño de punto', bolsillo: 'Bolsillo de parche',
  'bolsillo-tapa': 'Bolsillo con tapa', 'bolsillo-fuelle': 'Bolsillo con fuelle', parche: 'Parche de doble cara', trabilla: 'Trabilla tubular', banda: 'Banda de prolongación'
};
type IdeaInput = [id: string, name: string, garment: TransformationGarment, construction: TransformationConstruction, effect: string, placement: string, fabric: string, level: 1 | 2 | 3, params: Params];
const ideas: IdeaInput[] = [
  ['vaquero-costados', 'Paneles vaqueros en los costados', 'pantalon', 'panel', 'Mezclilla y tela de contraste a lo largo de las piernas.', 'Dos ventanas rectangulares en la zona recta de las piernas, sin tocar tiro, bolsillos ni cintura.', 'Mezclilla ligera prelavada y tejido western de peso parecido.', 3, { ancho: 100, largo: 650, cantidad: 2 }],
  ['pantalon-banda-deportiva', 'Franjas laterales deportivas', 'pantalon', 'panel', 'Una franja limpia de contraste sin cambiar la talla.', 'Franjas rectas a ambos lados, con inicio y final marcados sobre la prenda.', 'Sarga o tejido deportivo con elasticidad similar a la base.', 3, { ancho: 45, largo: 600, cantidad: 2 }],
  ['pantalon-campana-70', 'Campana setentera', 'pantalon', 'cuna', 'Abre el bajo con cuñas de tela estampada.', 'Una abertura desde el bajo por el costado de cada pierna; el largo se mide sobre la futura costura.', 'Mezclilla ligera o pana fina prelavada.', 3, { abertura: 400, aumento: 240, cantidad: 2 }],
  ['pantalon-bootcut', 'Bajo con espacio para botas', 'pantalon', 'cuna', 'Añade amplitud discreta alrededor del calzado.', 'Una abertura desde cada bajo, por la costura exterior de la pierna.', 'Sarga de peso y elasticidad similares a la prenda.', 3, { abertura: 260, aumento: 100, cantidad: 2 }],
  ['pantalon-cargo', 'Bolsillos cargo laterales', 'pantalon', 'bolsillo-fuelle', 'Dos bolsillos con volumen para lo que llevas contigo.', 'Muslo exterior; comprueba que la abertura quede accesible al sentarte.', 'Sarga o ripstop de peso medio.', 2, { ancho: 170, largo: 210, profundidad: 35, cantidad: 2 }],
  ['pantalon-herramienta', 'Trabilla para herramienta ligera', 'pantalon', 'trabilla', 'Una presilla lateral para sujetar una herramienta pequeña.', 'Junto a un bolsillo resistente, con ambos extremos apoyados sobre tela sana.', 'Lona flexible o mezclilla, con refuerzo interior.', 2, { ancho: 25, largo: 160, cantidad: 1 }],
  ['pantalon-rodilleras', 'Rodilleras de contraste', 'pantalon', 'parche', 'Refuerza las rodillas con dos parches de doble cara.', 'Centra cada parche con el pantalón puesto y las rodillas flexionadas.', 'Mezclilla blanda y algodón fino para el reverso.', 1, { ancho: 130, largo: 160, cantidad: 2 }],
  ['pantalon-bajo-contraste', 'Bajos más largos a contraste', 'pantalon', 'banda', 'Alarga ambas piernas con una banda doble.', 'Cada boca del pantalón, después de descoser y planchar el dobladillo anterior.', 'Tela prelavada de peso similar.', 2, { recorrido: 420, alto: 70, cantidad: 2 }],
  ['hoodie-bolsillo-xl', 'Bolsillo frontal XL', 'hoodie', 'bolsillo', 'Un bolsillo grande de entrada superior.', 'Frente de la sudadera; deja libre el bajo y comprueba la posición sentado.', 'Felpa estable o sarga ligera.', 1, { ancho: 300, largo: 210, cantidad: 1 }],
  ['hoodie-portacelular', 'Bolsillo para celular con tapa', 'hoodie', 'bolsillo-tapa', 'Un bolsillo exterior que se cierra con broche.', 'Pecho o manga amplia; mide el celular con su funda y deja holgura para sacarlo.', 'Lona ligera y entretela de refuerzo.', 2, { ancho: 110, largo: 190, tapa: 55, cantidad: 1 }],
  ['hoodie-punos', 'Puños nuevos de canalé', 'hoodie', 'puno', 'Renueva las mangas con puños cómodos.', 'Boca de ambas mangas sin el puño anterior; mide todo el contorno de costura.', 'Canalé con al menos 30 % de elasticidad y buena recuperación.', 2, { recorrido: 260, alto: 65, reduccion: 0.85, cantidad: 2 }],
  ['hoodie-bajo-doble', 'Banda para alargar la sudadera', 'hoodie', 'banda', 'Una banda lisa de contraste conserva el contorno del bajo.', 'Todo el bajo de la sudadera, sin cierre delantero y sin tensar la tela.', 'Punto estable con elasticidad compatible.', 2, { recorrido: 1040, alto: 90, cantidad: 1 }],
  ['hoodie-parche-espalda', 'Panel aplicado en la espalda', 'hoodie', 'parche', 'Un espacio de tela estampada para personalizar la espalda.', 'Zona plana de la espalda, lejos de la costura de la capucha.', 'Algodón ligero; estabiliza el tejido de punto antes de coser.', 1, { ancho: 260, largo: 300, cantidad: 1 }],
  ['camisa-bolsillo-contraste', 'Bolsillo de pecho a contraste', 'camisa', 'bolsillo', 'Cambia la personalidad de una camisa lisa.', 'Pecho, comprobando el lugar con la camisa abotonada y puesta.', 'Popelina o chambray prelavado.', 1, { ancho: 120, largo: 140, cantidad: 1 }],
  ['camisa-manga-volante', 'Volantes en las mangas', 'camisa', 'volante', 'Dos volantes fruncidos para terminar las mangas.', 'Boca de cada manga; mide por la línea donde coserás el volante.', 'Popelina ligera o batista.', 2, { recorrido: 320, alto: 90, frunce: 1.7, cantidad: 2 }],
  ['camisa-bajo-volante', 'Camisa con bajo de volante', 'camisa', 'volante', 'Un bajo fruncido que añade movimiento y longitud.', 'Bajo recto de una camisa; deja abierta la tira junto a la botonadura.', 'Algodón ligero con buena caída.', 2, { recorrido: 1000, alto: 160, frunce: 1.6, cantidad: 1 }],
  ['camisa-coderas', 'Coderas de doble cara', 'camisa', 'parche', 'Repara o decora las mangas con parches rectangulares suaves.', 'Marca ambos codos con la prenda puesta y el brazo doblado.', 'Franela ligera con reverso fino.', 1, { ancho: 100, largo: 140, cantidad: 2 }],
  ['camisa-aberturas-laterales', 'Cuñas en los costados de una camisa', 'camisa', 'cuna', 'Más amplitud en el bajo sin modificar el pecho.', 'Dos costuras laterales abiertas desde el bajo; termina debajo de la sisa.', 'Popelina ligera prelavada.', 3, { abertura: 230, aumento: 130, cantidad: 2 }],
  ['chaqueta-cargo', 'Chaqueta con bolsillos de trabajo', 'chaqueta', 'bolsillo-fuelle', 'Bolsillos exteriores de volumen real.', 'Delanteros, comprobando que no interfieran con cierre ni bolsillos interiores.', 'Lona o sarga resistente con refuerzo interior.', 2, { ancho: 200, largo: 230, profundidad: 40, cantidad: 2 }],
  ['chaqueta-espalda', 'Parche grande de espalda', 'chaqueta', 'parche', 'Combina denim con una tela especial o un bordado propio.', 'Centro de la espalda, dentro de una zona que puedas aplanar.', 'Mezclilla ligera y algodón de forro.', 1, { ancho: 300, largo: 330, cantidad: 1 }],
  ['chaqueta-bolsillo-tapa', 'Bolsillos utilitarios con tapa', 'chaqueta', 'bolsillo-tapa', 'Dos bolsillos planos que se cierran con broches.', 'Pecho o delanteros bajos; alinea las tapas con la prenda cerrada.', 'Sarga y entretela ligera.', 2, { ancho: 160, largo: 170, tapa: 60, cantidad: 2 }],
  ['vestido-volante', 'Vestido con volante en el bajo', 'vestido', 'volante', 'Añade una terminación romántica con tela ligera.', 'Contorno completo de la línea de unión del bajo; cierra el volante como aro.', 'Batista, voile o algodón ligero.', 2, { recorrido: 1400, alto: 180, frunce: 1.7, cantidad: 1, cerrado: 'si' }],
  ['vestido-bolsillos', 'Bolsillos visibles para vestido', 'vestido', 'bolsillo', 'Dos bolsillos útiles y fáciles de alcanzar.', 'Delantero, probando la altura con las manos; no sobre pinzas ni pliegues.', 'La misma tela del vestido o algodón compatible.', 1, { ancho: 170, largo: 200, cantidad: 2 }],
  ['vestido-banda', 'Vestido con banda de contraste', 'vestido', 'banda', 'Alarga un bajo recto con una banda limpia de doble tela.', 'Contorno del bajo. No sirve para colas ni bajos muy curvos.', 'Lino ligero o popelina de peso compatible.', 2, { recorrido: 1300, alto: 120, cantidad: 1 }],
  ['falda-godets', 'Falda con cuñas de vuelo', 'falda', 'cuna', 'Cuatro cuñas aportan movimiento al caminar.', 'Cuatro aberturas iguales desde el bajo, alejadas del cierre y del forro.', 'Tejido de caída parecida a la falda.', 3, { abertura: 300, aumento: 180, cantidad: 4 }],
  ['falda-volante', 'Falda con volante final', 'falda', 'volante', 'Una capa fruncida para renovar el bajo.', 'Línea horizontal del bajo; el volante se cierra en aro.', 'Algodón fino o viscosa estable.', 2, { recorrido: 1200, alto: 220, frunce: 1.8, cantidad: 1, cerrado: 'si' }],
  ['falda-bolsillo-tapa', 'Bolsillos de falda con tapa', 'falda', 'bolsillo-tapa', 'Un detalle utilitario con cierre de broche.', 'Delanteros por debajo de la cintura; comprueba la caída con peso dentro.', 'Sarga ligera y entretela en las tapas.', 2, { ancho: 150, largo: 180, tapa: 55, cantidad: 2 }]
];
export const TRANSFORMATIONS: readonly TransformationIdea[] = ideas.map(([id, name, garment, construction, effect, placement, fabric, level, params]) => ({ id, name, garment, construction, effect, placement, fabric, level, params }));

export function transformationMatches(idea: TransformationIdea, garment: TransformationGarment | 'todos', query: string): boolean {
  if (garment !== 'todos' && idea.garment !== garment) return false;
  const normalize = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('es');
  const text = normalize(`${idea.name} ${TRANSFORMATION_GARMENTS[idea.garment]} ${TRANSFORMATION_CONSTRUCTIONS[idea.construction]} ${idea.effect}`);
  return normalize(query).trim().split(/\s+/).filter(Boolean).every(word => text.includes(word));
}
