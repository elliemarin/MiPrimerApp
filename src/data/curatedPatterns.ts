/**
 * Patrones externos con una muestra confeccionada documentada por su autor.
 * La revisión de fuentes no equivale a una prueba física de Hilvana.
 * No incluye archivos, imágenes ni geometría de terceros para el estudio.
 */
export type CuratedPatternCategory = 'disfraces' | 'prendas' | 'accesorios';

export const CURATED_CATEGORY_LABEL: Record<CuratedPatternCategory, string> = {
  disfraces: 'Disfraces', prendas: 'Prendas', accesorios: 'Accesorios'
};

export interface CuratedPattern {
  id: string;
  name: string;
  author: string;
  url: string;
  categories: CuratedPatternCategory[];
  description: string;
  sizing: string;
  materials: string[];
  /** Elementos confirmados por la fuente; vacío si el inventario requiere descargar el original. */
  pieces: string[];
  /** Resumen breve de lo que cubre la guía, no instrucciones sustitutivas del original. */
  instructions: string[];
  access: string;
  language: string;
  format: 'pdf' | 'tutorial' | 'parametrico';
  difficulty?: string;
  licenseNote: string;
  licenseUrl?: string;
  evidence: { kind: 'muestra-del-autor'; url: string; description: string };
  verifiedAt: string;
  editableInHilvana: false;
}

const DATE = '2026-10-30';
const LINK_ONLY = 'Consulta las condiciones del original antes de reutilizarlo. Hilvana enlaza la fuente sin redistribuir sus archivos ni fotografías.';
const CHOLY_LICENSE = 'La autora permite vender artículos cosidos con sus patrones; no redistribuir los PDF, plantillas ni fotografías. Consulta sus condiciones.';
const PEPPERMINT_LICENSE = 'Uso doméstico personal; sus condiciones prohíben redistribuir los archivos y el uso comercial.';
const evidence = (url: string, description: string): CuratedPattern['evidence'] => ({ kind: 'muestra-del-autor', url, description });

export const CURATED_PATTERNS: CuratedPattern[] = [
  {
    id: 'fleece-fun-witch-hat', name: 'Sombrero de bruja · dos siluetas', author: 'Angel Hickman Peterson · Fleece Fun',
    url: 'https://www.fleecefun.com/how-to-make-a-witch-hat-free-pattern-child-and-adult-sizes/',
    categories: ['disfraces', 'accesorios'], format: 'pdf', language: 'Inglés',
    description: 'Ala asimétrica y copa corta o alta, con punta torcida para un disfraz de bruja o hechicero.',
    sizing: 'Plantillas infantil y adulta. Comprueba el ajuste del original; no se publica un intervalo de contornos en la ficha.',
    materials: ['Tela exterior: terciopelo con ligera elasticidad, polar o fieltro', 'Entretela rígida termoadhesiva', 'Bies ancho y alambre de bisutería calibre 10'],
    pieces: ['1 copa exterior', '2 alas exteriores', '1 copa y 1 ala de entretela'],
    instructions: ['Elegir la copa y preparar el refuerzo según el PDF.', 'La guía fotografiada explica el ala, el alambre y la unión de la copa.'],
    access: 'PDF gratuito mediante el enlace de descarga de la autora; ofrece una membresía opcional.',
    licenseNote: LINK_ONLY,
    evidence: evidence('https://www.fleecefun.com/how-to-make-a-witch-hat-free-pattern-child-and-adult-sizes/', 'La autora muestra dos sombreros terminados y fotografías del montaje.'),
    verifiedAt: DATE, editableInHilvana: false
  },
  {
    id: 'pompom-fairy-set', name: 'Hada del bosque · alas, corona y varita', author: 'Pompom du Monde',
    url: 'https://www.pompomdumonde.com/sewing-patterns/p/fairy-set',
    categories: ['disfraces', 'accesorios'], format: 'pdf', language: 'Inglés',
    description: 'Conjunto de fantasía con alas acolchadas y aplicaciones de tela. Combina colores para una mariposa o un hada.',
    sizing: 'Alas de unos 40 × 60 cm. La muestra infantil lleva tirantes elásticos; corona y varita se proponen para niños y adultos.',
    materials: ['Alas: 75 cm de tela principal, tres contrastes de 25 cm y 50 cm de espuma de 5 mm', 'Alas: 80 cm de elástico de 2 cm, 1 m de ballena metálica y cuatro terminales', 'Corona: dos retales de 15 × 50 cm, guata de 15 × 50 cm y 75 cm de cinta de 2 cm', 'Varita: retal de 30 × 30 cm, relleno, varilla de 30 cm y cintas'],
    pieces: ['Alas: cuatro piezas de tela y dos de espuma, más aplicaciones y canales', 'Corona: dos piezas de tela y una de guata', 'Varita: dos estrellas de tela', 'Patrón A4/Carta: seis hojas, en dos filas de tres columnas'],
    instructions: ['El patrón y la guía son dos PDF distintos: seis hojas de patrón y cinco páginas de instrucciones, según los archivos aportados.', 'Montar las hojas siguiendo las marcas de fila y columna. Cortar tela por línea continua y refuerzo por línea discontinua, según cada pieza.', 'Preparar aplicaciones y canales antes de cerrar las alas; añadir espuma, ballenas con terminales y tirantes siguiendo la guía.', 'La guía también explica el montaje de la corona con cintas y de la estrella de la varita.'],
    access: 'Gratuito mediante pedido; el autor entrega por correo el PDF de patrón y el de instrucciones. Los archivos aportados por la persona usuaria se revisaron sin republicarlos.',
    licenseNote: LINK_ONLY,
    evidence: evidence('https://www.pompomdumonde.com/blog/crown-tutorial-ppk8c', 'La autora fotografía el conjunto confeccionado y documenta la construcción de las alas.'),
    verifiedAt: DATE, editableInHilvana: false
  },
  {
    id: 'motley-dinosaur-tail', name: 'Cola de dinosaurio con cinturón', author: 'Elina · Motley Costumier',
    url: 'https://www.motleycostumier.com/blog/params/post/5227427/how-to-sew-a-fleece-dinosaur-tail-free-pdf-pattern--video-tutorial',
    categories: ['disfraces', 'accesorios'], format: 'pdf', language: 'Inglés', difficulty: 'Iniciación, según la autora',
    description: 'Cola de polar rellena, con cresta contrastante y cinturón de velcro para juegos y disfraces.',
    sizing: 'Tamaño de la plantilla; adaptar las cintas a la cintura. La ficha no publica una tabla de tallas corporales.',
    materials: ['Polar en dos colores', 'Velcro', 'Relleno para peluche'],
    pieces: ['2 laterales de la cola', 'Cresta', 'Cintas de cintura', 'Círculo de cierre de la base'],
    instructions: ['Imprimir el PDF al 100%; incluye 1 cm de margen.', 'El tutorial y el vídeo muestran cresta, montaje de la cola, relleno y cinturón.'],
    access: 'PDF escaneado gratuito y vídeo en la página de la autora.',
    licenseNote: LINK_ONLY,
    evidence: evidence('https://www.motleycostumier.com/blog/params/post/5227427/how-to-sew-a-fleece-dinosaur-tail-free-pdf-pattern--video-tutorial', 'La autora muestra sus colas confeccionadas y el proceso en fotografías y vídeo.'),
    verifiedAt: DATE, editableInHilvana: false
  },
  {
    id: 'motley-neck-ruffle', name: 'Gorguera fruncida · Pierrot y carnaval', author: 'Elina · Motley Costumier',
    url: 'https://www.motleycostumier.com/blog/params/post/5277912/how-to-make-a-simple-neck-ruffle--easy-diy-sewing-tutorial',
    categories: ['disfraces', 'accesorios'], format: 'tutorial', language: 'Inglés', difficulty: 'Básico, según la autora',
    description: 'Cuello teatral de algodón, ajustable con cinta; un complemento para payaso, Pierrot o vestuario escénico.',
    sizing: 'Se frunce al contorno necesario. El ejemplo parte de tres tiras de 21.5 × 76.5 cm; no hay tabla de tallas.',
    materials: ['Algodón', 'Bies de algodón de 2 cm', 'Cinta o cordón'],
    pieces: ['3 rectángulos de tela de 21.5 × 76.5 cm', 'Bies y cinta ajustados al montaje'],
    instructions: ['La guía explica cómo unir y rematar las tiras.', 'Muestra el canal del bies, el paso de la cinta y el fruncido final.'],
    access: 'Tutorial gratuito con medidas de corte y vídeo; no necesita plantilla PDF.',
    licenseNote: LINK_ONLY,
    evidence: evidence('https://www.motleycostumier.com/blog/params/post/5277912/how-to-make-a-simple-neck-ruffle--easy-diy-sewing-tutorial', 'Fotografías de la gorguera terminada y vídeo de su confección en el taller de la autora.'),
    verifiedAt: DATE, editableInHilvana: false
  },
  {
    id: 'choly-winged-hair-clips', name: 'Clips alados · ángel o murciélago', author: 'Choly Knight · Sew Desu Ne?',
    url: 'https://cholyknight.com/2016/10/21/winged-hair-clips/',
    categories: ['disfraces', 'accesorios'], format: 'pdf', language: 'Inglés', difficulty: 'Iniciación; costuras curvas',
    description: 'Mini alas de tela para el cabello: dos versiones que aprovechan retales y permiten combinar disfraces.',
    sizing: 'Cada clip mide aproximadamente 6.4 × 5.1 cm (2½ × 2 pulgadas).',
    materials: ['Polar, minky, fieltro o franela gruesa', '2 clips para cabello', 'Pegamento compatible con metal'],
    pieces: ['4 alas para la versión fina, o 6 para mayor volumen', 'Plantillas de ángel y murciélago'],
    instructions: ['El PDF de cinco páginas incluye plantilla y margen de ¼ de pulgada.', 'Explica costuras curvas, pespuntes y fijación de los clips.'],
    access: 'PDF gratuito descargable desde la publicación.',
    licenseNote: CHOLY_LICENSE, licenseUrl: 'https://cholyknight.com/faq-patterns/',
    evidence: evidence('https://cholyknight.com/2016/10/21/winged-hair-clips/', 'La publicación muestra clips terminados de ambas versiones; el PDF documenta la confección.'),
    verifiedAt: DATE, editableInHilvana: false
  },
  {
    id: 'choly-hooded-cowl', name: 'Capucha de dragón o unicornio', author: 'Choly Knight · Sew Desu Ne?',
    url: 'https://cholyknight.com/2018/10/05/hooded-cowl/',
    categories: ['disfraces', 'prendas', 'accesorios'], format: 'pdf', language: 'Inglés', difficulty: '3/10, según la autora',
    description: 'Capucha con cuello abotonado, orejas y cuernos; cambia crestas por crin y flores para crear un unicornio.',
    sizing: 'Cinco tallas del original: bebé/niño pequeño, infantil, preadolescente, adolescente/adulto pequeño y adulto grande.',
    materials: ['Polar, tela de sudadera o tejido suave recomendado en el PDF', 'Tela para forro y retales para detalles', '2–3 botones y relleno para los cuernos'],
    pieces: ['Capucha y cuello exterior con forro', 'Orejas y cuernos', 'Crestas de dragón o crin y flores de unicornio'],
    instructions: ['Elegir la talla y las decoraciones en el PDF de 33 páginas.', 'La guía muestra detalles rellenos, montaje de la capucha, forro y cierre.'],
    access: 'PDF gratuito desde la publicación de la autora.',
    licenseNote: CHOLY_LICENSE, licenseUrl: 'https://cholyknight.com/faq-patterns/',
    evidence: evidence('https://cholyknight.com/2018/10/05/hooded-cowl/', 'La autora muestra capuchas confeccionadas y describe sus pruebas con distintos grosores de tela.'),
    verifiedAt: DATE, editableInHilvana: false
  },
  {
    id: 'choly-plush-backpack', name: 'Mochila peluche · dragón o unicornio', author: 'Choly Knight · Sew Desu Ne?',
    url: 'https://cholyknight.com/2021/06/25/dragon-unicorn-backpack/',
    categories: ['accesorios', 'disfraces'], format: 'pdf', language: 'Inglés', difficulty: '5/10; más compleja con tirantes ajustables',
    description: 'Personaje de peluche con bolsillo interior y tirantes: un accesorio de fantasía que también guarda objetos.',
    sizing: 'Cuerpo de unos 30.5 × 20.3 cm, sin orejas ni patas. Bolsillo aproximado de 16.5 × 27.9 cm según el PDF.',
    materials: ['Tela de peluche y contrastes para los detalles', 'Algodón para forro, entretela y relleno', 'Cierre de al menos 18 cm y cinta para tirantes', 'Reguladores y anillas si se eligen tirantes ajustables'],
    pieces: ['Cuerpo, cabeza y bolsillo con cierre', 'Orejas, hocico, cuernos y detalles según versión', 'Tirantes'],
    instructions: ['El PDF de 43 páginas explica aplicaciones, bolsillo, cuerpo y tirantes.', 'Revisar también la aclaración de la autora sobre las marcas de los tirantes.'],
    access: 'PDF gratuito desde la publicación; incluye comentarios con aclaraciones de la autora.',
    licenseNote: CHOLY_LICENSE, licenseUrl: 'https://cholyknight.com/faq-patterns/',
    evidence: evidence('https://cholyknight.com/2021/06/25/dragon-unicorn-backpack/', 'La autora documenta prototipos y muestra mochilas terminadas; la publicación contiene una aclaración de montaje.'),
    verifiedAt: DATE, editableInHilvana: false
  },
  {
    id: 'peppermint-valley-jumpsuit', name: 'Valley Jumpsuit · mono con botones', author: 'Ready to Sew · Peppermint',
    url: 'https://peppermintmag.com/product/valley-jumpsuit/',
    categories: ['prendas'], format: 'pdf', language: 'Español, inglés y francés', difficulty: 'Intermedio',
    description: 'Mono holgado con botones delanteros, cintura elástica y bolsillos; la muestra está confeccionada en popelina.',
    sizing: 'Tallas 32–58 de la tabla de la diseñadora. Elegir mediante sus medidas, no por equivalencia automática con chica, mediana o grande.',
    materials: ['Popelina de algodón', 'Botones y elástico; cantidades en el original'],
    pieces: [],
    instructions: ['La descarga incluye cuaderno de instrucciones en español, inglés y francés.', 'Elegir el intervalo de tallas y el formato A0 o A4/Carta; consultar allí el inventario de piezas.'],
    access: 'Pago a elección por encima del mínimo indicado en la tienda; requiere completar el pedido.',
    licenseNote: PEPPERMINT_LICENSE, licenseUrl: 'https://peppermintmag.com/termsandconditions/',
    evidence: evidence('https://peppermintmag.com/product/valley-jumpsuit/', 'Ficha editorial con fotografías del mono confeccionado sobre modelo y autoría identificada.'),
    verifiedAt: DATE, editableInHilvana: false
  },
  {
    id: 'peppermint-west-end-jacket', name: 'West End Jacket · chaqueta de trabajo', author: 'Camimade · Peppermint',
    url: 'https://peppermintmag.com/product/west-end-jacket/',
    categories: ['prendas'], format: 'pdf', language: 'Inglés', difficulty: 'Intermedio',
    description: 'Chaqueta unisex de bolsillos de parche, pespuntes y costuras rematadas; cambia de carácter con el tejido.',
    sizing: 'Tallas A–M de la tabla propia del patrón. Las letras no equivalen a las tallas predeterminadas de Hilvana.',
    materials: ['Denim, algodón ligero o lana más gruesa, según el resultado buscado', 'Mercería y cantidades en el cuaderno original'],
    pieces: [],
    instructions: ['Descarga con cuaderno de instrucciones y plantillas A0 o A4/Carta.', 'Consultar en el original las piezas, márgenes y construcción de bolsillos y costuras.'],
    access: 'Pago a elección por encima del mínimo indicado en la tienda; descarga tras completar el pedido.',
    licenseNote: PEPPERMINT_LICENSE, licenseUrl: 'https://peppermintmag.com/termsandconditions/',
    evidence: evidence('https://peppermintmag.com/product/west-end-jacket/', 'La ficha presenta chaquetas confeccionadas sobre modelos y acredita el diseño a Camimade.'),
    verifiedAt: DATE, editableInHilvana: false
  },
  {
    id: 'peppermint-jumpsuit', name: 'Jumpsuit · mono de escote en V', author: 'In the Folds · Peppermint',
    url: 'https://peppermintmag.com/product/jumpsuit/',
    categories: ['prendas'], format: 'pdf', language: 'Inglés', difficulty: 'Principiante con experiencia',
    description: 'Enterizo amplio con escote delantero y trasero en V, pinzas de busto, cierre invisible y cinturón opcional.',
    sizing: 'Tallas A–K del original. Consultar su tabla corporal y holgura para elegir talla.',
    materials: ['Chambray, algodón o lino', 'Cierre invisible y mercería indicados por la diseñadora'],
    pieces: [],
    instructions: ['Incluye cuaderno de confección y plantillas A0 o A4/Carta.', 'El original desarrolla pinzas, cierre, vista completa y cinturón opcional; consultar allí las piezas y cantidades.'],
    access: 'Pago a elección por encima del mínimo indicado en la tienda; requiere completar el pedido.',
    licenseNote: PEPPERMINT_LICENSE, licenseUrl: 'https://peppermintmag.com/termsandconditions/',
    evidence: evidence('https://peppermintmag.com/product/jumpsuit/', 'La ficha muestra el mono confeccionado sobre modelo y acredita el patrón a In the Folds.'),
    verifiedAt: DATE, editableInHilvana: false
  }
];

function normalize(text: string): string {
  return text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase();
}

export function filterCuratedPatterns(query = '', category: CuratedPatternCategory | 'todos' = 'todos'): CuratedPattern[] {
  const tokens = normalize(query).trim().split(/\s+/).filter(Boolean);
  return CURATED_PATTERNS.filter(pattern => {
    if (category !== 'todos' && !pattern.categories.includes(category)) return false;
    const searchable = normalize([
      pattern.name, pattern.author, pattern.description, pattern.sizing, pattern.language, pattern.format,
      pattern.access, pattern.difficulty ?? '', ...pattern.materials, ...pattern.pieces,
      ...pattern.categories.map(value => CURATED_CATEGORY_LABEL[value])
    ].join(' '));
    return tokens.every(token => searchable.includes(token));
  });
}
