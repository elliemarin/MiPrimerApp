// Figuras orgánicas en una caja de 100 × 100. Se normalizan al tamaño del elemento.
/** Motivos originales de Hilvana: vectores editables, no archivos de puntadas. */
export const SHAPE_CATEGORY_LABEL = {
  naturaleza: 'Paisajes', botanica: 'Flores y plantas', hongos: 'Hongos',
  insectos: 'Insectos', animales: 'Animales', mar: 'Mar', cielo: 'Cielo',
  comida: 'Comida', costura: 'Costura', geometria: 'Geometría', celebracion: 'Celebración'
} as const;
export type ShapeCategory = keyof typeof SHAPE_CATEGORY_LABEL;

export interface OrganicShape {
  id: string;
  label: string;
  d: string;
  /** Proporción ancho/alto sugerida al insertar. */
  aspect: number;
  category?: ShapeCategory;
  tags?: string[];
}

// Los contornos se autoran dentro de 100 × 100; el estudio conserva su tamaño en mm.
function poly(points: [number, number][]) {
  return `${points.map(([x, y], i) => `${i ? 'L' : 'M'}${+x.toFixed(3)} ${+y.toFixed(3)}`).join(' ')} Z`;
}
function ellipse(cx: number, cy: number, rx: number, ry: number) {
  return `M${cx - rx} ${cy} a${rx} ${ry} 0 1 0 ${rx * 2} 0 a${rx} ${ry} 0 1 0 ${-rx * 2} 0 Z`;
}
function star(points: number, inner: number, outer = 47) {
  return poly(Array.from({ length: points * 2 }, (_, i) => {
    const a = -Math.PI / 2 + i * Math.PI / points;
    const r = i % 2 ? inner : outer;
    return [50 + r * Math.cos(a), 50 + r * Math.sin(a)];
  }));
}
function petals(n: number, inner: number) {
  return poly(Array.from({ length: 144 }, (_, i) => {
    const a = i / 144 * Math.PI * 2;
    const r = inner + (46 - inner) * (0.5 + 0.5 * Math.cos(n * a));
    return [50 + r * Math.cos(a), 50 + r * Math.sin(a)];
  }));
}
const EXTRA_SHAPES: OrganicShape[] = [
  // Paisaje y jardín
  { id: 'volcan', label: 'Volcán', category: 'naturaleza', tags: ['montaña', 'lava'], aspect: 1.3, d: 'M3 96 L35 30 L42 38 L50 32 L58 38 L65 30 L97 96 Z M42 22 L38 4 L48 14 L53 2 L58 23 L51 18 Z' },
  { id: 'rio', label: 'Río sinuoso', category: 'naturaleza', tags: ['agua', 'paisaje'], aspect: 0.7, d: 'M42 3 C80 18 78 31 48 40 C15 50 18 60 58 66 C91 71 92 88 65 97 L20 97 C58 85 61 80 29 73 C1 65 2 45 30 36 C64 25 64 18 25 3 Z' },
  { id: 'fogata', label: 'Fogata', category: 'naturaleza', tags: ['fuego', 'campamento'], aspect: 0.85, d: 'M46 3 C68 30 45 33 68 50 L76 31 C97 58 86 79 52 81 C13 81 8 58 29 38 C28 53 41 48 41 39 C40 25 50 20 46 3 Z M9 86 L14 78 L91 91 L86 99 Z M9 91 L86 78 L91 86 L14 99 Z' },
  { id: 'carpa', label: 'Tienda de campaña', category: 'naturaleza', tags: ['campamento', 'aventura'], aspect: 1.3, d: 'M3 90 L43 12 L57 12 L97 90 Z M43 12 L43 90 L63 90 Z M38 5 L45 3 L54 20 L49 24 Z M55 3 L62 5 L51 24 L46 20 Z' },
  { id: 'colinas', label: 'Colinas', category: 'naturaleza', tags: ['campo', 'paisaje'], aspect: 1.8, d: 'M2 98 L2 61 Q24 18 48 59 Q71 3 98 56 L98 98 Z' },
  { id: 'cristales', label: 'Cristales de cuarzo', category: 'naturaleza', tags: ['piedra', 'mineral'], aspect: 0.8, d: 'M31 27 L49 2 L67 27 L67 91 L49 98 L31 91 Z M8 60 L17 35 L28 52 L28 91 L17 96 L8 85 Z M72 46 L84 23 L96 46 L96 83 L84 95 L72 89 Z' },
  // Botánica
  { id: 'margarita', label: 'Margarita', category: 'botanica', tags: ['flor', 'primavera'], aspect: 1, d: petals(12, 19) },
  { id: 'flor-cinco', label: 'Flor de cinco pétalos', category: 'botanica', tags: ['flor', 'jardín'], aspect: 1, d: petals(5, 25) },
  { id: 'girasol', label: 'Girasol', category: 'botanica', tags: ['flor', 'verano'], aspect: 1, d: star(18, 34) },
  { id: 'tulipan', label: 'Tulipán', category: 'botanica', tags: ['flor', 'tallo'], aspect: 0.65, d: 'M20 5 L39 23 L50 3 L61 23 L80 5 L80 32 Q80 57 54 60 L54 77 Q72 58 94 62 Q88 84 54 89 L54 98 L46 98 L46 82 Q14 86 5 62 Q28 60 46 75 L46 60 Q20 57 20 32 Z' },
  { id: 'rosa', label: 'Rosa con hojas', category: 'botanica', tags: ['flor', 'amor'], aspect: 0.8, d: 'M32 12 Q46 0 61 11 Q82 8 85 30 Q99 46 79 59 Q67 78 51 64 Q29 76 22 57 Q3 46 17 29 Q14 13 32 12 Z M47 66 L54 66 L54 86 Q72 70 90 75 Q77 94 54 94 L54 99 L47 99 L47 89 Q23 88 15 72 Q34 68 47 82 Z' },
  { id: 'cactus', label: 'Cactus saguaro', category: 'botanica', tags: ['desierto', 'México'], aspect: 0.7, d: 'M41 98 L41 65 L28 65 Q13 65 13 49 L13 29 Q13 20 21 20 Q29 20 29 29 L29 46 Q29 49 33 49 L41 49 L41 12 Q41 2 50 2 Q59 2 59 12 L59 35 L67 35 Q71 35 71 31 L71 23 Q71 14 79 14 Q87 14 87 23 L87 37 Q87 52 72 52 L59 52 L59 98 Z' },
  { id: 'nopal', label: 'Nopal', category: 'botanica', tags: ['México', 'cactus'], aspect: 0.85, d: 'M42 98 L42 84 C21 77 26 40 47 42 C51 25 71 29 77 45 C99 29 99 69 80 74 C79 91 68 96 57 95 L57 98 Z M32 52 C8 50 3 21 16 16 C33 11 45 38 32 52 Z M48 42 C30 27 38 3 51 4 C69 5 65 30 48 42 Z' },
  { id: 'monstera', label: 'Hoja de monstera', category: 'botanica', tags: ['tropical', 'planta'], aspect: 0.8, d: 'M48 98 L46 86 C15 89 2 66 5 43 L26 54 L8 34 Q11 22 20 17 L37 39 L25 12 Q35 5 45 11 L50 25 L55 11 Q68 3 77 12 L62 40 L85 18 Q94 27 94 37 L70 55 L96 45 Q101 70 76 83 Q63 89 54 86 L56 98 Z' },
  { id: 'helecho', label: 'Helecho', category: 'botanica', tags: ['hoja', 'bosque'], aspect: 0.6, d: 'M46 98 L46 81 Q15 87 6 68 Q24 62 46 76 L46 62 Q13 65 7 47 Q27 42 46 57 L46 43 Q17 43 14 27 Q33 25 46 39 L46 27 Q32 13 48 2 Q66 13 54 27 L54 39 Q67 25 86 27 Q83 43 54 43 L54 57 Q73 42 93 47 Q87 65 54 62 L54 76 Q76 62 94 68 Q85 87 54 81 L54 98 Z' },
  { id: 'bellota', label: 'Bellota', category: 'botanica', tags: ['otoño', 'roble'], aspect: 0.85, d: 'M45 24 L45 6 L58 2 L61 9 L54 12 L54 24 Q80 24 89 48 L11 48 Q20 24 45 24 Z M21 53 L79 53 Q80 82 50 98 Q20 82 21 53 Z' },
  { id: 'trebol', label: 'Trébol de cuatro hojas', category: 'botanica', tags: ['suerte', 'hoja'], aspect: 1, d: 'M50 50 C19 61 3 38 13 23 C22 8 43 14 50 41 C57 14 78 8 87 23 C97 38 81 61 54 54 C81 67 79 91 62 95 C45 99 37 83 49 59 C32 85 8 79 7 63 C6 47 29 43 50 50 Z M51 52 L60 53 L76 96 L69 99 Z' },
  { id: 'arbol', label: 'Árbol redondo', category: 'botanica', tags: ['bosque', 'jardín'], aspect: 0.85, d: 'M42 98 L42 71 C17 77 5 60 12 42 C1 24 21 9 36 15 C46 0 69 1 76 17 C98 14 103 39 89 48 C98 68 78 81 58 71 L58 98 Z' },
  // Hongos distintos por silueta, para combinar con puntos y plantas.
  { id: 'setas-gemelas', label: 'Setas gemelas', category: 'hongos', tags: ['bosque', 'hongo'], aspect: 1.2, d: 'M3 42 Q15 4 35 5 Q55 6 65 42 Z M26 46 L43 46 L47 89 L22 89 Z M53 64 Q62 29 79 29 Q94 29 98 64 Z M73 68 L86 68 L89 97 L70 97 Z' },
  { id: 'hongo-alto', label: 'Hongo de copa alta', category: 'hongos', tags: ['seta', 'bosque'], aspect: 0.6, d: 'M12 61 C13 31 31 2 50 2 C69 2 87 31 88 61 Q72 70 57 64 L62 98 L38 98 L43 64 Q28 70 12 61 Z' },
  { id: 'hongo-ostra', label: 'Hongo ostra', category: 'hongos', tags: ['seta', 'abanico'], aspect: 1.1, d: 'M50 96 C49 74 9 75 5 44 C1 25 18 11 36 18 C36 1 63 1 68 16 C90 6 99 27 94 42 C91 64 68 73 58 81 L60 98 Z' },
  { id: 'morilla', label: 'Morilla', category: 'hongos', tags: ['seta', 'colmenilla'], aspect: 0.6, d: 'M36 69 C16 63 21 45 26 38 C21 25 35 17 36 10 Q50 0 60 11 C75 15 70 29 77 38 C84 50 78 65 63 69 L67 98 L33 98 Z' },
  // Insectos y pequeños visitantes del jardín
  { id: 'mariposa', label: 'Mariposa', category: 'insectos', tags: ['alas', 'jardín'], aspect: 1.2, d: 'M46 44 C31 1 2 0 3 29 C3 43 15 52 29 53 C3 60 10 91 27 90 C39 90 46 74 47 60 L47 91 L53 91 L53 60 C54 74 61 90 73 90 C90 91 97 60 71 53 C85 52 97 43 97 29 C98 0 69 1 54 44 L54 28 L61 12 L57 10 L50 25 L43 10 L39 12 L46 28 Z' },
  { id: 'polilla', label: 'Polilla nocturna', category: 'insectos', tags: ['alas', 'noche'], aspect: 1.5, d: 'M45 40 L7 4 Q1 44 29 61 L11 91 L43 77 L47 98 L53 98 L57 77 L89 91 L71 61 Q99 44 93 4 L55 40 L54 26 L62 17 L59 13 L50 23 L41 13 L38 17 L46 26 Z' },
  { id: 'abeja', label: 'Abeja', category: 'insectos', tags: ['miel', 'polinizador'], aspect: 1.1, d: 'M36 38 C6 24 17 3 34 9 C46 13 49 26 50 37 C51 26 54 13 66 9 C83 3 94 24 64 38 Q82 47 80 63 Q78 80 54 91 L50 99 L46 91 Q22 80 20 63 Q18 47 36 38 Z M38 38 L32 25 L36 23 L43 37 Z M57 37 L64 23 L68 25 L62 38 Z' },
  { id: 'mariquita', label: 'Mariquita', category: 'insectos', tags: ['catarina', 'escarabajo'], aspect: 0.85, d: 'M36 24 Q32 6 49 4 Q67 5 64 24 Q85 32 85 63 Q84 94 50 97 Q16 94 15 63 Q15 32 36 24 Z M13 42 L2 37 L4 32 L16 37 Z M14 64 L2 66 L2 71 L15 69 Z M22 86 L10 96 L6 91 L18 81 Z M87 42 L98 37 L96 32 L84 37 Z M86 64 L98 66 L98 71 L85 69 Z M78 86 L90 96 L94 91 L82 81 Z' },
  { id: 'libelula', label: 'Libélula', category: 'insectos', tags: ['alas', 'río'], aspect: 1.2, d: 'M46 39 C17 1 0 17 7 30 Q18 45 44 48 Q5 49 5 68 C9 83 33 68 46 55 L47 98 L53 98 L54 55 C67 68 91 83 95 68 Q95 49 56 48 Q82 45 93 30 C100 17 83 1 54 39 L55 17 Q55 7 50 7 Q45 7 45 17 Z' },
  { id: 'escarabajo', label: 'Escarabajo', category: 'insectos', tags: ['insecto', 'bosque'], aspect: 0.8, d: 'M37 29 L29 11 L34 7 L44 25 L47 23 L47 2 L53 2 L53 23 L56 25 L66 7 L71 11 L63 29 Q75 35 78 48 L94 35 L98 40 L80 56 L80 64 L98 69 L96 75 L79 70 L75 79 L88 94 L83 98 L69 84 Q50 100 31 84 L17 98 L12 94 L25 79 L21 70 L4 75 L2 69 L20 64 L20 56 L2 40 L6 35 L22 48 Q25 35 37 29 Z' },
  { id: 'hormiga', label: 'Hormiga', category: 'insectos', tags: ['insecto', 'jardín'], aspect: 0.7, d: `${ellipse(50, 20, 16, 16)} ${ellipse(50, 49, 11, 13)} ${ellipse(50, 81, 20, 17)} M37 13 L25 5 L22 9 L36 20 Z M63 13 L75 5 L78 9 L64 20 Z M41 43 L22 31 L5 35 L6 40 L21 37 L39 48 Z M59 43 L78 31 L95 35 L94 40 L79 37 L61 48 Z M41 51 L17 56 L8 75 L13 77 L21 61 L41 57 Z M59 51 L83 56 L92 75 L87 77 L79 61 L59 57 Z M43 61 L32 78 L28 96 L34 97 L38 80 L48 65 Z M57 61 L68 78 L72 96 L66 97 L62 80 L52 65 Z` },
  { id: 'caracol', label: 'Caracol', category: 'insectos', tags: ['molusco', 'jardín'], aspect: 1.4, d: `${ellipse(37, 45, 31, 32)} M6 82 Q15 75 30 75 L63 75 L69 56 L64 39 L69 37 L76 53 L82 53 L89 37 L94 39 L88 60 Q99 84 83 91 L13 91 Z` },
  { id: 'arana', label: 'Araña', category: 'insectos', tags: ['halloween', 'ocho patas'], aspect: 1, d: `${ellipse(50, 64, 19, 24)} ${ellipse(50, 34, 13, 13)} M39 31 L24 10 L8 3 L5 8 L20 15 L35 37 Z M61 31 L76 10 L92 3 L95 8 L80 15 L65 37 Z M34 47 L18 32 L2 31 L2 37 L15 38 L32 53 Z M66 47 L82 32 L98 31 L98 37 L85 38 L68 53 Z M32 61 L13 62 L3 79 L8 82 L17 68 L33 67 Z M68 61 L87 62 L97 79 L92 82 L83 68 L67 67 Z M35 76 L21 84 L17 98 L23 98 L27 88 L39 82 Z M65 76 L79 84 L83 98 L77 98 L73 88 L61 82 Z` },
  { id: 'oruga', label: 'Oruga', category: 'insectos', tags: ['gusano', 'jardín'], aspect: 1.8, d: 'M5 61 C0 40 14 31 27 40 C36 27 50 28 57 40 C67 28 82 32 84 42 C103 40 102 65 88 72 L86 86 L80 86 L78 75 L65 75 L62 86 L56 86 L54 75 L40 75 L38 86 L32 86 L30 75 L17 75 L14 86 L8 86 L8 70 Z M78 41 L73 19 L78 18 L84 40 Z M88 41 L92 19 L97 20 L94 45 Z' },
  // Animales
  { id: 'gato', label: 'Gato sentado', category: 'animales', tags: ['mascota', 'felino'], aspect: 0.7, d: 'M29 39 L25 5 L45 19 L59 19 L78 5 L75 41 Q73 55 63 59 C83 87 68 97 46 97 Q18 97 24 77 C3 80 0 58 9 48 L14 51 C6 69 18 75 28 67 L36 57 Q26 51 29 39 Z' },
  { id: 'perro', label: 'Perrito', category: 'animales', tags: ['mascota', 'cachorro'], aspect: 1.2, d: 'M15 40 L22 9 Q31 1 45 11 L59 14 L69 28 L85 28 Q95 28 93 39 L76 45 L74 79 L71 97 L59 97 L57 78 L38 78 L35 97 L23 97 L21 69 L12 63 Q0 50 7 40 L12 43 Q8 53 17 54 L22 39 Z' },
  { id: 'huella', label: 'Huella de patita', category: 'animales', tags: ['perro', 'gato', 'mascota'], aspect: 1, d: `${ellipse(18, 38, 12, 17)} ${ellipse(39, 19, 12, 16)} ${ellipse(65, 19, 12, 16)} ${ellipse(84, 40, 12, 17)} M21 77 C22 64 37 44 50 44 C63 44 80 66 80 79 C80 98 60 94 50 90 C39 94 21 98 21 77 Z` },
  { id: 'conejo', label: 'Conejo', category: 'animales', tags: ['pascua', 'animal'], aspect: 0.7, d: 'M33 41 C16 5 28 0 35 6 L49 38 C45 2 57 0 62 7 Q69 24 59 43 Q78 48 79 64 C97 61 99 80 86 85 L81 87 Q85 97 73 97 L27 97 Q13 97 23 85 Q8 67 21 52 Z' },
  { id: 'zorro', label: 'Cara de zorro', category: 'animales', tags: ['bosque', 'animal'], aspect: 1, d: 'M8 4 L37 24 L63 24 L92 4 L90 55 Q77 85 50 98 Q23 85 10 55 Z M18 43 L49 86 L32 57 Z M82 43 L51 86 L68 57 Z' },
  { id: 'oso', label: 'Osito', category: 'animales', tags: ['bebé', 'animal'], aspect: 0.9, d: 'M22 22 C2 16 5 1 19 3 Q32 4 32 18 Q50 11 68 18 Q68 4 81 3 C95 1 98 16 78 22 Q88 35 83 49 Q77 64 64 66 L70 74 Q94 69 94 84 Q94 98 72 96 L28 96 Q6 98 6 84 Q6 69 30 74 L36 66 Q23 64 17 49 Q12 35 22 22 Z' },
  { id: 'buho', label: 'Búho', category: 'animales', tags: ['ave', 'noche', 'bosque'], aspect: 0.8, d: 'M17 3 L36 19 Q50 13 64 19 L83 3 L81 34 Q92 59 75 83 L63 93 L64 98 L55 98 L51 94 L45 98 L36 98 L37 93 Q10 78 10 55 Q10 43 19 34 Z M46 49 L54 49 L50 59 Z' },
  { id: 'golondrina', label: 'Golondrina', category: 'animales', tags: ['ave', 'vuelo'], aspect: 1.4, d: 'M3 5 Q39 8 52 40 Q64 31 72 34 L83 27 L82 38 L98 43 L79 47 Q72 65 58 70 L70 96 L44 78 L22 97 L37 68 Q8 53 3 5 Z' },
  { id: 'colibri', label: 'Colibrí', category: 'animales', tags: ['ave', 'flor', 'México'], aspect: 1.3, d: 'M4 8 Q43 12 49 42 Q60 34 69 43 L98 39 L76 48 Q76 66 60 70 L39 96 L42 73 L18 85 L35 61 Q13 43 4 8 Z M34 34 Q35 3 50 2 Q69 16 55 42 Z' },
  { id: 'elefante', label: 'Elefantito', category: 'animales', tags: ['bebé', 'animal'], aspect: 1.3, d: 'M13 41 Q14 13 40 16 Q66 5 82 21 Q97 30 95 54 L95 75 Q93 88 82 86 L78 80 Q88 82 86 72 L85 56 L78 56 L74 95 L61 95 L59 74 L39 74 L37 95 L23 95 L19 68 L11 60 L6 74 L2 73 L6 52 Z' },
  { id: 'dinosaurio', label: 'Dinosaurio', category: 'animales', tags: ['infantil', 'prehistoria'], aspect: 1.4, d: 'M3 77 Q26 76 30 53 L31 26 L38 19 L41 8 L50 14 Q76 9 84 27 L98 29 L98 42 L75 46 L69 62 L77 96 L62 96 L56 77 L46 78 L42 96 L27 96 L32 76 Q14 90 3 84 Z' },
  { id: 'caballito', label: 'Caballito', category: 'animales', tags: ['caballo', 'rancho'], aspect: 1.1, d: 'M17 28 L39 28 L48 12 L63 12 L66 2 L72 15 L86 30 L98 38 L94 50 L75 45 L67 61 L72 96 L59 96 L54 73 L37 73 L32 96 L19 96 L22 65 L15 57 L11 77 L4 77 L6 45 Q8 31 17 28 Z' },
  // Mar
  { id: 'pez', label: 'Pez', category: 'mar', tags: ['océano', 'animal'], aspect: 1.5, d: 'M5 30 L27 43 Q47 12 70 32 Q84 37 96 52 Q82 72 61 74 Q39 75 27 60 L5 80 L8 55 Z M44 30 L55 12 L67 29 Z M45 74 L59 90 L69 74 Z' },
  { id: 'ballena', label: 'Ballena', category: 'mar', tags: ['océano', 'animal'], aspect: 1.6, d: 'M3 57 Q0 28 32 29 Q61 25 76 57 L78 66 L82 48 L98 43 L96 61 L86 74 Q73 98 43 87 L29 98 L24 80 Q3 76 3 57 Z M31 20 Q15 6 22 2 Q30 1 34 16 Q38 1 47 3 Q53 10 38 20 Z' },
  { id: 'pulpo', label: 'Pulpo', category: 'mar', tags: ['océano', 'tentáculos'], aspect: 1, d: 'M22 55 C7 16 36 2 50 2 C64 2 93 16 78 55 Q93 74 94 60 L99 63 Q98 95 77 74 Q90 96 73 98 Q62 99 59 77 Q64 98 50 98 Q36 98 41 77 Q38 99 27 98 Q10 96 23 74 Q2 95 1 63 L6 60 Q7 74 22 55 Z' },
  { id: 'medusa', label: 'Medusa', category: 'mar', tags: ['océano', 'animal'], aspect: 0.8, d: 'M6 52 C6 18 27 2 50 2 C73 2 94 18 94 52 Q83 44 72 52 Q61 44 50 52 Q39 44 28 52 Q17 44 6 52 Z M21 56 L28 56 C15 73 43 76 25 98 L19 94 C33 78 7 75 21 56 Z M46 56 L53 56 C37 75 66 79 47 98 L41 94 C55 79 26 74 46 56 Z M71 56 L78 56 C62 75 92 79 73 98 L67 94 C81 79 51 74 71 56 Z' },
  { id: 'concha', label: 'Concha marina', category: 'mar', tags: ['playa', 'abanico'], aspect: 1, d: 'M35 96 L29 87 C11 78 1 59 5 40 C8 29 17 30 21 35 C19 13 37 6 43 23 C48 0 63 0 68 24 C80 7 94 22 86 37 C105 30 100 58 90 71 L70 89 L65 96 Z' },
  { id: 'estrella-mar', label: 'Estrella de mar', category: 'mar', tags: ['playa', 'animal'], aspect: 1, d: 'M49 3 Q53 0 56 7 L63 31 Q65 38 73 38 L95 38 Q102 39 96 47 L77 62 Q73 65 76 73 L82 93 Q84 101 76 96 L56 82 Q50 79 44 83 L24 97 Q16 100 19 92 L26 71 Q28 64 23 61 L5 46 Q-1 39 8 38 L30 37 Q37 36 39 29 Z' },
  { id: 'ancla', label: 'Ancla', category: 'mar', tags: ['barco', 'náutico'], aspect: 0.9, d: 'M44 28 C28 21 32 2 49 2 C66 2 71 21 56 28 L56 40 L75 40 L75 48 L56 48 L56 79 Q77 76 84 61 L75 62 L92 43 L98 69 L90 65 Q79 92 50 98 Q21 92 10 65 L2 69 L8 43 L25 62 L16 61 Q23 76 44 79 L44 48 L25 48 L25 40 L44 40 Z M43 15 a7 7 0 1 1 14 0 a7 7 0 1 1 -14 0 Z' },
  { id: 'velero', label: 'Velero', category: 'mar', tags: ['barco', 'náutico'], aspect: 1, d: 'M46 3 L46 68 L4 68 Z M53 13 L94 68 L53 68 Z M46 72 L46 3 L51 3 L51 72 Z M3 77 L97 77 L80 97 L21 97 Z' },
  // Cielo
  { id: 'estrella-cuatro', label: 'Destello', category: 'cielo', tags: ['estrella', 'brillo'], aspect: 1, d: star(4, 11) },
  { id: 'estrella-ocho', label: 'Estrella de ocho puntas', category: 'cielo', tags: ['estrella', 'ornamento'], aspect: 1, d: star(8, 24) },
  { id: 'saturno', label: 'Planeta con anillos', category: 'cielo', tags: ['espacio', 'saturno'], aspect: 1.4, d: `${ellipse(50, 49, 29, 31)} M6 63 Q39 22 93 24 Q99 24 97 31 Q70 67 9 77 Q0 77 6 63 Z M15 67 Q59 56 85 31 Q48 40 15 67 Z` },
  { id: 'cohete', label: 'Cohete', category: 'cielo', tags: ['espacio', 'infantil'], aspect: 0.6, d: 'M32 68 C23 40 34 13 50 2 C66 13 77 40 68 68 L70 83 L60 77 L40 77 L30 83 Z M30 48 Q10 55 9 84 L28 73 Z M70 48 Q90 55 91 84 L72 73 Z M42 81 L58 81 L50 99 Z' },
  { id: 'cometa', label: 'Cometa fugaz', category: 'cielo', tags: ['estrella', 'espacio'], aspect: 1.5, d: 'M4 6 L70 35 L81 24 L84 43 L98 51 L82 60 L78 79 L65 66 L47 72 L54 55 Z M3 35 L47 62 L41 70 Z M14 57 L36 74 L31 81 Z' },
  // Cocina y motivos de México
  { id: 'aguacate', label: 'Aguacate', category: 'comida', tags: ['fruta', 'México'], aspect: 0.7, d: 'M49 3 C68 3 63 25 80 47 C104 79 83 98 50 98 C17 98 -4 79 20 47 C37 25 30 3 49 3 Z' },
  { id: 'chile', label: 'Chile', category: 'comida', tags: ['México', 'picante'], aspect: 0.75, d: 'M52 22 Q47 5 66 2 L68 8 Q55 10 60 22 Q82 15 91 32 C100 59 61 95 8 98 C42 78 61 62 54 42 Q28 33 45 23 Z' },
  { id: 'taco', label: 'Taco', category: 'comida', tags: ['México', 'cocina'], aspect: 1.4, d: 'M4 89 Q2 41 19 31 L23 18 L34 23 L43 11 L53 21 L65 12 L75 26 L89 23 L92 40 Q98 58 97 89 Z M10 83 Q12 34 51 32 Q91 36 91 83 Z' },
  { id: 'sandia', label: 'Rebanada de sandía', category: 'comida', tags: ['fruta', 'verano'], aspect: 1.3, d: 'M3 19 L97 19 Q97 83 50 98 Q3 83 3 19 Z' },
  { id: 'fresa', label: 'Fresa', category: 'comida', tags: ['fruta', 'jardín'], aspect: 0.8, d: 'M28 28 L14 12 L38 17 L50 2 L59 17 L84 11 L72 28 Q100 32 87 61 Q68 96 50 98 Q32 96 13 61 Q0 32 28 28 Z' },
  { id: 'cerezas', label: 'Cerezas', category: 'comida', tags: ['fruta', 'verano'], aspect: 1, d: `${ellipse(26, 75, 23, 23)} ${ellipse(76, 75, 21, 23)} M23 55 Q39 26 51 7 L56 8 Q70 28 77 54 L71 56 Q65 33 54 16 Q41 37 29 58 Z M54 9 Q75 0 95 8 Q82 30 57 15 Z` },
  { id: 'limon', label: 'Limón', category: 'comida', tags: ['fruta', 'cítrico'], aspect: 1.3, d: 'M3 46 L10 41 Q16 13 45 15 Q78 9 91 43 L98 48 L92 55 Q84 88 52 86 Q16 90 10 55 Z' },
  { id: 'pina', label: 'Piña', category: 'comida', tags: ['fruta', 'tropical'], aspect: 0.7, d: 'M31 42 L18 12 L39 28 L38 2 L51 22 L66 2 L63 28 L84 12 L70 42 Q88 54 85 72 Q81 99 50 98 Q19 99 15 72 Q12 54 31 42 Z' },
  { id: 'cafe', label: 'Taza de café', category: 'comida', tags: ['bebida', 'cocina'], aspect: 1.1, d: 'M9 33 L71 33 L71 43 Q96 35 98 56 Q97 77 70 74 Q60 92 29 87 Q9 84 9 65 Z M71 50 L71 66 Q91 70 91 57 Q91 46 71 50 Z M4 92 L84 92 L78 98 L11 98 Z M22 27 Q10 18 22 4 L28 6 Q18 18 29 25 Z M43 27 Q31 18 43 4 L49 6 Q39 18 50 25 Z' },
  { id: 'paleta', label: 'Paleta de hielo', category: 'comida', tags: ['verano', 'postre'], aspect: 0.65, d: 'M20 72 L20 31 Q20 3 50 3 Q80 3 80 31 L80 72 Z M44 77 L56 77 L56 94 Q50 102 44 94 Z' },
  { id: 'pan-dulce', label: 'Concha de pan dulce', category: 'comida', tags: ['México', 'panadería'], aspect: 1.2, d: 'M4 78 Q0 25 49 15 Q99 20 96 78 Q93 94 50 97 Q7 94 4 78 Z' },
  { id: 'botella', label: 'Botella', category: 'comida', tags: ['bebida', 'cheve', 'cerveza'], aspect: 0.5, d: 'M36 3 L64 3 L64 12 L61 12 L61 31 Q61 39 75 48 Q83 53 83 63 L83 91 Q83 98 75 98 L25 98 Q17 98 17 91 L17 63 Q17 53 25 48 Q39 39 39 31 L39 12 L36 12 Z' },
  // Costura, para etiquetas y accesorios del taller.
  { id: 'carrete', label: 'Carrete de hilo', category: 'costura', tags: ['taller', 'coser'], aspect: 0.8, d: 'M20 4 L80 4 L80 16 L71 16 L71 82 L80 82 L80 96 L20 96 L20 82 L29 82 L29 16 L20 16 Z' },
  { id: 'aguja', label: 'Aguja con hilo', category: 'costura', tags: ['bordado', 'coser'], aspect: 0.65, d: 'M48 4 Q60 0 60 13 L53 93 L48 99 L44 92 L42 15 Q41 8 48 4 Z M48 12 L47 29 L53 29 L54 12 Z M43 18 C4 2 5 55 24 56 C47 59 37 85 4 88 L5 94 C48 89 52 53 25 50 C11 50 12 13 43 24 Z' },
  { id: 'tijeras', label: 'Tijeras', category: 'costura', tags: ['corte', 'taller'], aspect: 0.9, d: 'M44 56 L20 3 Q13 9 20 25 L38 63 C9 41 -7 74 13 87 Q33 97 45 73 L50 65 L55 73 Q67 97 87 87 C107 74 91 41 62 63 L80 25 Q87 9 80 3 L56 56 L50 59 Z M12 70 Q18 59 30 69 Q37 78 26 83 Q12 86 12 70 Z M88 70 Q82 59 70 69 Q63 78 74 83 Q88 86 88 70 Z' },
  { id: 'dedal', label: 'Dedal', category: 'costura', tags: ['bordado', 'coser'], aspect: 0.8, d: 'M12 97 L21 30 Q23 3 50 3 Q77 3 79 30 L88 97 Z' },
  { id: 'maquina', label: 'Máquina de coser', category: 'costura', tags: ['taller', 'Singer'], aspect: 1.3, d: 'M4 84 L4 96 L97 96 L97 84 L88 84 L88 39 Q88 23 74 23 L50 23 L50 13 L38 13 L38 23 L21 23 Q8 23 8 36 L8 51 L25 51 L25 40 L63 40 L63 70 L36 70 L36 58 L32 58 L32 83 L69 83 L69 84 Z M91 28 L98 28 L98 54 L91 54 Z M57 7 L75 7 L75 18 L57 18 Z' },
  { id: 'imperdible', label: 'Imperdible', category: 'costura', tags: ['seguro', 'coser'], aspect: 0.55, d: 'M30 89 C6 77 17 56 30 64 L58 8 Q63 0 73 4 Q83 9 78 20 L51 78 L53 88 L44 98 L34 94 L37 86 L46 87 L45 78 L72 17 Q75 10 69 10 Q65 9 63 14 L37 69 Q54 91 30 89 Z M31 72 Q20 68 22 78 Q26 87 35 82 Z' },
  { id: 'boton-flor', label: 'Botón de flor', category: 'costura', tags: ['botón', 'mercería'], aspect: 1, d: petals(6, 35) },
  { id: 'cremallera', label: 'Cremallera', category: 'costura', tags: ['cierre', 'mercería'], aspect: 0.5, d: 'M23 3 L38 3 L38 56 L62 56 L62 3 L77 3 L77 97 L62 97 L62 68 L38 68 L38 97 L23 97 Z M42 29 L58 29 L58 51 L42 51 Z' },
  // Geometrías y remates
  { id: 'hexagono', label: 'Hexágono', category: 'geometria', tags: ['patchwork', 'panal'], aspect: 1.15, d: poly([[50,2],[94,26],[94,74],[50,98],[6,74],[6,26]]) },
  { id: 'rombo', label: 'Rombo', category: 'geometria', tags: ['patchwork', 'diamante'], aspect: 0.65, d: poly([[50,2],[97,50],[50,98],[3,50]]) },
  { id: 'triangulo', label: 'Triángulo', category: 'geometria', tags: ['patchwork', 'banderín'], aspect: 1.1, d: poly([[50,3],[98,97],[2,97]]) },
  { id: 'chevron', label: 'Chevron', category: 'geometria', tags: ['cenefa', 'zigzag'], aspect: 1.5, d: poly([[2,24],[50,56],[98,24],[98,56],[50,88],[2,56]]) },
  { id: 'escama', label: 'Escama', category: 'geometria', tags: ['patchwork', 'abanico'], aspect: 1.15, d: 'M3 3 L97 3 C97 49 72 77 50 98 C28 77 3 49 3 3 Z' },
  { id: 'escudo', label: 'Escudo', category: 'geometria', tags: ['parche', 'insignia'], aspect: 0.8, d: 'M8 3 L92 3 L92 57 Q91 81 50 98 Q9 81 8 57 Z' },
  { id: 'etiqueta', label: 'Etiqueta', category: 'geometria', tags: ['parche', 'marca'], aspect: 1.5, d: 'M3 28 L3 72 L24 94 L97 94 L97 6 L24 6 Z' },
  { id: 'espiral', label: 'Espiral', category: 'geometria', tags: ['curva', 'adorno'], aspect: 1, d: 'M98 48 C97 17 68 0 43 4 C14 6 0 29 4 57 C8 86 32 99 57 94 C81 89 92 69 86 49 C82 31 64 19 47 25 C30 28 22 44 28 59 C33 72 46 77 58 71 C68 66 71 55 64 47 L57 52 C61 58 56 65 49 65 C39 65 33 55 36 45 C40 31 58 28 69 40 C86 58 73 80 56 84 C34 91 12 75 12 51 C10 25 32 11 51 12 C76 12 89 31 90 48 Z' },
  // Fiestas, infancia y detalles
  { id: 'corona', label: 'Corona', category: 'celebracion', tags: ['princesa', 'fiesta'], aspect: 1.3, d: 'M6 16 L29 43 L50 3 L71 43 L94 16 L83 78 L17 78 Z M17 84 L83 84 L83 97 L17 97 Z' },
  { id: 'globo', label: 'Globo', category: 'celebracion', tags: ['cumpleaños', 'fiesta'], aspect: 0.65, d: 'M50 3 C91 3 92 51 54 69 L59 78 L48 78 C33 88 63 88 49 98 L43 95 C55 89 24 87 44 75 L42 69 C8 51 9 3 50 3 Z' },
  { id: 'regalo', label: 'Regalo', category: 'celebracion', tags: ['cumpleaños', 'navidad'], aspect: 1, d: 'M9 52 L44 52 L44 98 L9 98 Z M56 52 L91 52 L91 98 L56 98 Z M3 32 L44 32 L44 46 L3 46 Z M56 32 L97 32 L97 46 L56 46 Z M48 30 C8 33 11 0 27 3 Q42 2 50 23 Q58 2 73 3 C89 0 92 33 52 30 Z M43 23 Q31 7 24 13 Q16 23 43 23 Z M57 23 Q84 23 76 13 Q69 7 57 23 Z' },
  { id: 'lazo', label: 'Moño', category: 'celebracion', tags: ['lazo', 'regalo', 'bebé'], aspect: 1.5, d: 'M42 40 C18 2 1 14 3 45 C2 75 20 86 42 60 L34 96 L49 84 L64 96 L58 60 C80 86 98 75 97 45 C99 14 82 2 58 40 Z M44 38 L56 38 L56 65 L44 65 Z' },
  { id: 'calabaza', label: 'Calabaza', category: 'celebracion', tags: ['otoño', 'halloween'], aspect: 1.2, d: 'M43 24 L46 4 L62 2 L64 9 L53 12 L53 24 C68 9 88 25 89 39 C106 53 99 82 83 88 Q63 102 50 93 Q37 102 17 88 C1 82 -6 53 11 39 C12 25 32 9 43 24 Z' },
  { id: 'fantasma', label: 'Fantasma', category: 'celebracion', tags: ['halloween', 'infantil'], aspect: 0.85, d: 'M14 45 C14 -9 86 -9 86 45 L86 75 L98 93 L75 87 L63 98 L50 88 L37 98 L25 87 L2 93 L14 75 Z' },
  { id: 'paz', label: 'Símbolo de paz', category: 'celebracion', tags: ['amor', 'símbolo'], aspect: 1, d: `${ellipse(50,50,47,47)} M11 50 a39 39 0 1 1 78 0 a39 39 0 1 1 -78 0 Z M46 6 L54 6 L54 47 L82 78 L77 84 L54 59 L54 95 L46 95 L46 59 L23 84 L18 78 L46 47 Z` }
];

export const ORGANIC_SHAPES: OrganicShape[] = [
  { id: 'montana', category: 'naturaleza', label: 'Montaña', aspect: 1.4, d: 'M0 100 L38 18 Q42 10 47 17 L58 34 L66 26 Q70 22 74 27 L100 100 Z' },
  { id: 'cordillera', category: 'naturaleza', label: 'Cordillera', aspect: 2, d: 'M0 100 L18 48 Q20 43 23 47 L33 62 L50 14 Q53 8 56 14 L72 52 L80 40 Q83 36 86 41 L100 70 L100 100 Z' },
  { id: 'nieve', category: 'naturaleza', label: 'Cumbre nevada', aspect: 1.3, d: 'M14 100 L50 6 L86 100 L72 88 L62 98 L50 84 L38 98 L28 88 Z' },
  { id: 'hongo', category: 'hongos', label: 'Hongo', aspect: 1, d: 'M6 52 C6 22 28 4 50 4 C72 4 94 22 94 52 C94 58 88 60 80 60 L62 60 C62 72 64 86 68 96 L32 96 C36 86 38 72 38 60 L20 60 C12 60 6 58 6 52 Z' },
  { id: 'hongo-plano', category: 'hongos', label: 'Hongo de sombrero plano', aspect: 1.2, d: 'M2 44 C4 30 26 22 50 22 C74 22 96 30 98 44 C99 50 92 52 84 52 L60 52 C60 66 62 82 66 96 L34 96 C38 82 40 66 40 52 L16 52 C8 52 1 50 2 44 Z' },
  { id: 'puntos', category: 'hongos', label: 'Puntos de hongo', aspect: 1.4, d: 'M20 50 m-10 0 a10 10 0 1 0 20 0 a10 10 0 1 0 -20 0 Z M55 32 m-8 0 a8 8 0 1 0 16 0 a8 8 0 1 0 -16 0 Z M82 58 m-9 0 a9 9 0 1 0 18 0 a9 9 0 1 0 -18 0 Z' },
  { id: 'hoja', category: 'botanica', label: 'Hoja', aspect: 0.6, d: 'M50 2 C82 22 90 62 52 98 L50 100 L48 98 C10 62 18 22 50 2 Z' },
  { id: 'pino', category: 'botanica', label: 'Pino', aspect: 0.7, d: 'M50 0 L74 34 L62 34 L84 64 L68 64 L92 90 L56 90 L56 100 L44 100 L44 90 L8 90 L32 64 L16 64 L38 34 L26 34 Z' },
  { id: 'nube', category: 'cielo', label: 'Nube', aspect: 1.7, d: 'M20 80 C6 80 0 68 4 58 C8 48 18 46 24 48 C24 30 40 20 54 26 C62 12 84 14 88 32 C98 34 102 50 96 60 C100 72 92 80 82 80 Z' },
  { id: 'sol', category: 'cielo', label: 'Sol', aspect: 1, d: 'M50 0 L56 20 L72 6 L70 26 L90 20 L80 38 L100 44 L82 54 L96 70 L76 70 L80 90 L62 80 L56 100 L50 82 L44 100 L38 80 L20 90 L24 70 L4 70 L18 54 L0 44 L20 38 L10 20 L30 26 L28 6 L44 20 Z' },
  { id: 'luna', category: 'cielo', label: 'Luna', aspect: 0.8, d: 'M64 2 C32 6 10 28 10 54 C10 80 32 98 62 98 C74 98 84 94 92 88 C62 88 40 72 40 48 C40 26 54 10 74 4 C70 2 67 2 64 2 Z' },
  { id: 'estrella', category: 'cielo', label: 'Estrella', aspect: 1, d: 'M50 2 L62 36 L98 37 L69 58 L80 94 L50 73 L20 94 L31 58 L2 37 L38 36 Z' },
  { id: 'corazon', category: 'celebracion', label: 'Corazón', aspect: 1.1, d: 'M50 92 C30 76 2 58 2 32 C2 14 16 4 30 4 C40 4 47 10 50 18 C53 10 60 4 70 4 C84 4 98 14 98 32 C98 58 70 76 50 92 Z' },
  { id: 'gota', category: 'naturaleza', label: 'Gota', aspect: 0.7, d: 'M50 0 C64 24 86 46 86 66 C86 86 70 100 50 100 C30 100 14 86 14 66 C14 46 36 24 50 0 Z' },
  { id: 'ola', category: 'mar', label: 'Ola', aspect: 2.2, d: 'M0 60 C12 40 26 40 36 56 C44 68 56 66 62 52 C70 32 92 30 100 48 L100 100 L0 100 Z' },
  { id: 'flor', category: 'botanica', label: 'Flor', aspect: 1, d: 'M50 30 C50 10 70 4 76 18 C82 6 100 14 94 30 C100 34 100 56 88 56 C98 70 86 88 72 78 C70 96 46 98 46 80 C34 96 12 86 22 70 C4 70 0 48 16 44 C4 30 22 12 36 22 C38 14 44 12 50 30 Z' },
  { id: 'mancha', category: 'geometria', label: 'Forma libre', aspect: 1.2, d: 'M48 4 C70 2 92 14 96 36 C100 58 88 70 90 84 C92 98 70 100 54 94 C38 88 26 98 12 88 C-2 78 4 58 8 44 C12 30 26 6 48 4 Z' },
  { id: 'arcoiris', category: 'cielo', label: 'Arco', aspect: 2, d: 'M0 100 C0 44 22 4 50 4 C78 4 100 44 100 100 L78 100 C78 58 66 30 50 30 C34 30 22 58 22 100 Z' },
  { id: 'rayo', category: 'cielo', label: 'Rayo', aspect: 0.6, d: 'M60 0 L18 56 L46 56 L34 100 L82 38 L54 38 Z' },
  ...EXTRA_SHAPES
];

export function findShape(id: string) {
  return ORGANIC_SHAPES.find((s) => s.id === id);
}

/** Busca motivos por nombre, sinónimos y categoría, sin depender de mayúsculas o acentos. */
export function filterShapes(query = '', category: ShapeCategory | 'todas' = 'todas'): OrganicShape[] {
  const normalize = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const terms = normalize(query).trim().split(/\s+/).filter(Boolean);
  return ORGANIC_SHAPES.filter((shape) =>
    (category === 'todas' || shape.category === category) &&
    terms.every((term) => normalize(`${shape.label} ${(shape.tags ?? []).join(' ')} ${shape.category ? SHAPE_CATEGORY_LABEL[shape.category] : ''}`).includes(term))
  );
}
