/** Directorio de fuentes primarias. Son enlaces externos, no patrones importados. */
export type PatternSourceCategory = 'chaquetas' | 'monos' | 'holgados' | 'accesorios' | 'bolsos' | 'hogar' | 'infantil' | 'patronaje';
export const PATTERN_SOURCE_CATEGORY_LABEL: Record<PatternSourceCategory, string> = {
  chaquetas: 'Chaquetas y abrigos', monos: 'Monos y jumpers', holgados: 'Prendas holgadas',
  accesorios: 'Accesorios', bolsos: 'Bolsos y estuches', hogar: 'Hogar', infantil: 'Infantil', patronaje: 'Patronaje paramétrico'
};
export type PatternSourceFormat = 'parametrico' | 'pdf' | 'proyectos';
export const PATTERN_SOURCE_FORMAT_LABEL: Record<PatternSourceFormat, string> = {
  parametrico: 'Patronaje paramétrico externo', pdf: 'PDF para imprimir', proyectos: 'Proyectos y plantillas'
};
export interface PatternSource {
  id: string;
  name: string;
  url: string;
  description: string;
  categories: PatternSourceCategory[];
  format: PatternSourceFormat;
  access: string;
  licenseNote: string;
  importNote: string;
  verifiedAt: string;
  /** Página oficial que respalda acceso/formato/condiciones cuando difiere del catálogo. */
  infoUrl?: string;
}
const DATE = '2026-10-30';
const PDF_IMPORT = 'PDF externo: se calibra y traza en Hilvana; no se importa como patrón paramétrico.';
const CHECK_LICENSE = 'Consulta las condiciones de cada diseño. Descarga gratuita no significa permiso para redistribuirlo.';
export const PATTERN_SOURCES: PatternSource[] = [
  {
    id: 'freesewing', name: 'FreeSewing', url: 'https://freesewing.eu/',
    description: 'Diseños generados con medidas: prendas, capas, pantalones y accesorios. Código paramétrico documentado para desarrolladores.',
    categories: ['chaquetas', 'holgados', 'accesorios', 'patronaje'], format: 'parametrico',
    access: 'Generación en su web; documentación y paquetes JavaScript.',
    licenseNote: 'El software moderno declara MIT; revisar paquete, versión y autor antes de integrarlo. No incluye permiso sobre fotos de terceros.',
    importNote: 'Adaptador de piezas para Hilvana pendiente. El enlace abre el generador externo.',
    verifiedAt: DATE, infoUrl: 'https://freesewing.dev/'
  },
  {
    id: 'seamly-community', name: 'Seamly · patrones de la comunidad', url: 'https://forum.seamly.io/c/patterns/24',
    description: 'Foro de patronaje con archivos compartidos, bloques, discusión de medidas y construcción de prendas.',
    categories: ['patronaje'], format: 'parametrico', access: 'Foro público; los archivos y requisitos varían por publicación.',
    licenseNote: 'La licencia del programa Seamly no autoriza automáticamente cada patrón compartido: confirmar permiso con su autor.',
    importNote: 'Los archivos .sm2d requieren Seamly; Hilvana todavía no los interpreta.',
    verifiedAt: DATE, infoUrl: 'https://seamly.io/'
  },
  {
    id: 'mood-sewciety', name: 'Mood Sewciety', url: 'https://blog.moodfabrics.com/Free%20Sewing%20Patterns/',
    description: 'Catálogo por tipo de prenda, con chaquetas, blazers, monos enterizos, prendas amplias y accesorios.',
    categories: ['chaquetas', 'monos', 'holgados', 'accesorios', 'bolsos'], format: 'pdf',
    access: 'Patrones gratuitos; algunos enlaces de descarga se envían por correo.',
    licenseNote: CHECK_LICENSE, importNote: PDF_IMPORT, verifiedAt: DATE
  },
  {
    id: 'peppermint', name: 'Peppermint Sewing School', url: 'https://peppermintmag.com/sewing-school/',
    description: 'Colecciones de prendas con instrucciones: monos holgados, chaquetas y conjuntos de diseñadores invitados.',
    categories: ['chaquetas', 'monos', 'holgados'], format: 'pdf',
    access: 'Mezcla de gratuitos, pago a elección y otros productos; comprobar cada ficha.',
    licenseNote: 'Sus condiciones limitan los patrones a uso doméstico personal y prohíben redistribuir archivos y uso comercial.',
    importNote: PDF_IMPORT, verifiedAt: DATE, infoUrl: 'https://peppermintmag.com/termsandconditions/'
  },
  {
    id: 'fabrics-store', name: 'Fabrics-Store', url: 'https://fabrics-store.com/sewing-patterns',
    description: 'Patrones de lino y otras telas: chaquetas de trabajo, superiores, vestidos y proyectos para casa.',
    categories: ['chaquetas', 'holgados', 'hogar'], format: 'pdf',
    access: 'Catálogo con productos gratuitos y prémium; algunos accesos requieren cuenta o verificación del sitio.',
    licenseNote: 'Su ayuda permite coser con los PDF gratuitos para uso personal o negocio; esto no concede redistribución de archivos.',
    importNote: PDF_IMPORT, verifiedAt: DATE, infoUrl: 'https://support.fabrics-store.com/hc/en-us/articles/360000217243-About-These-PDF-Patterns'
  },
  {
    id: 'closet-core', name: 'Closet Core · recursos gratuitos', url: 'https://blog.closetcorepatterns.com/category/sewing-help-how-tos/free-patterns-resources/',
    description: 'Patrones y proyectos de sombreros, fundas, riñoneras, antifaces, pufs y camisetas.',
    categories: ['accesorios', 'bolsos', 'hogar'], format: 'pdf',
    access: 'La biblioteca ofrece descargas y puede solicitar correo o registro según el recurso.',
    licenseNote: CHECK_LICENSE, importNote: PDF_IMPORT, verifiedAt: DATE
  },
  {
    id: 'merchant-mills', name: 'Merchant & Mills · patrones gratuitos', url: 'https://merchantandmills.com/collections/free-sewing-patterns',
    description: 'Proyectos de iniciación: bolsas, sombreros y fundas con instrucciones para confección.',
    categories: ['accesorios', 'bolsos', 'hogar'], format: 'pdf',
    access: 'Colección de descargas PDF gratuitas; el sitio puede usar un proceso de pedido.',
    licenseNote: CHECK_LICENSE, importNote: PDF_IMPORT, verifiedAt: DATE
  },
  {
    id: 'sew-sweetness', name: 'Sew Sweetness · patrones gratuitos', url: 'https://sewsweetness.com/product-category/patterns-2/free-patterns',
    description: 'Bolsas, monederos, organizadores y estuches; algunos proyectos incluyen tutorial en vídeo.',
    categories: ['accesorios', 'bolsos', 'hogar'], format: 'pdf',
    access: 'Selección gratuita; descarga mediante su tienda. El sitio puede bloquear accesos automatizados.',
    licenseNote: CHECK_LICENSE, importNote: PDF_IMPORT, verifiedAt: DATE, infoUrl: 'https://sewsweetness.com/tutorials'
  },
  {
    id: 'weallsew', name: 'BERNINA · WeAllSew', url: 'https://weallsew.com/tag/free-sewing-tutorial/',
    description: 'Proyectos de costura y aplicaciones: totes, bolsas de viaje, cojines y accesorios; parte del contenido está en español.',
    categories: ['accesorios', 'bolsos', 'hogar', 'infantil'], format: 'proyectos',
    access: 'Tutoriales públicos; las plantillas descargables dependen de cada proyecto.',
    licenseNote: 'Revisar autor y condiciones de cada tutorial. No se han copiado sus fotos, instrucciones ni plantillas.',
    importNote: 'Sigue el tutorial externo; si incluye un PDF autorizado, calibra y traza sus piezas.', verifiedAt: DATE
  },
  {
    id: 'sew-desu-ne', name: 'Sew Desu Ne? · Choly Knight', url: 'https://cholyknight.com/free-projects/',
    description: 'Peluches, complementos y accesorios originales de estilo kawaii, con categorías y búsqueda.',
    categories: ['accesorios', 'infantil'], format: 'pdf',
    access: 'Patrones gratuitos y una tienda separada de patrones de pago.',
    licenseNote: 'La autora permite vender artículos cosidos de sus patrones, con las condiciones de su FAQ; no vender el patrón.',
    importNote: PDF_IMPORT, verifiedAt: DATE, infoUrl: 'https://cholyknight.com/faq-patterns/'
  },
  {
    id: 'learnmyog', name: 'LearnMYOG', url: 'https://learnmyog.com/',
    description: 'Equipamiento de exterior: anoraks holgados, bolsas, mochilas y generadores de sacos o estuches a medida.',
    categories: ['chaquetas', 'holgados', 'accesorios', 'bolsos'], format: 'proyectos',
    access: 'Patrones gratuitos y de pago; algunos generadores de medidas se ejecutan en su web.',
    licenseNote: 'Sus condiciones indican uso personal; no se incorpora su código ni sus patrones en Hilvana.',
    importNote: 'Generadores externos sin integración. Los PDF descargados necesitan calibración y trazado.',
    verifiedAt: DATE, infoUrl: 'https://learnmyog.com/about.html'
  },
  {
    id: 'selfmade', name: 'Selfmade · accesorios gratuitos', url: 'https://www.selfmade.com/en-gb/free-diy/free-sewing-patterns/accessories',
    description: 'Proyectos imprimibles de accesorios; el catálogo enlaza también bolsas, hogar, bebés y prendas.',
    categories: ['accesorios', 'bolsos', 'hogar', 'infantil'], format: 'proyectos',
    access: 'Apartado Free DIY; comprobar precio, idioma y formato de cada ficha.',
    licenseNote: CHECK_LICENSE, importNote: 'Las plantillas imprimibles no se convierten automáticamente en piezas editables.', verifiedAt: DATE
  }
];

function normalize(text: string): string { return text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase(); }
export function filterPatternSources(query = '', category: PatternSourceCategory | 'todas' = 'todas'): PatternSource[] {
  const tokens = normalize(query).trim().split(/\s+/).filter(Boolean);
  return PATTERN_SOURCES.filter(source => {
    if (category !== 'todas' && !source.categories.includes(category)) return false;
    const text = normalize([source.name, source.description, source.access, source.format, ...source.categories.map(c => PATTERN_SOURCE_CATEGORY_LABEL[c])].join(' '));
    return tokens.every(token => text.includes(token));
  });
}
