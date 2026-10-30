// Figuras orgánicas en una caja de 100 × 100. Se normalizan al tamaño del elemento.
export interface OrganicShape {
  id: string;
  label: string;
  d: string;
  /** Proporción ancho/alto sugerida al insertar. */
  aspect: number;
}

export const ORGANIC_SHAPES: OrganicShape[] = [
  { id: 'montana', label: 'Montaña', aspect: 1.4, d: 'M0 100 L38 18 Q42 10 47 17 L58 34 L66 26 Q70 22 74 27 L100 100 Z' },
  { id: 'cordillera', label: 'Cordillera', aspect: 2, d: 'M0 100 L18 48 Q20 43 23 47 L33 62 L50 14 Q53 8 56 14 L72 52 L80 40 Q83 36 86 41 L100 70 L100 100 Z' },
  { id: 'nieve', label: 'Cumbre nevada', aspect: 1.3, d: 'M14 100 L50 6 L86 100 L72 88 L62 98 L50 84 L38 98 L28 88 Z' },
  { id: 'hongo', label: 'Hongo', aspect: 1, d: 'M6 52 C6 22 28 4 50 4 C72 4 94 22 94 52 C94 58 88 60 80 60 L62 60 C62 72 64 86 68 96 L32 96 C36 86 38 72 38 60 L20 60 C12 60 6 58 6 52 Z' },
  { id: 'hongo-plano', label: 'Hongo de sombrero plano', aspect: 1.2, d: 'M2 44 C4 30 26 22 50 22 C74 22 96 30 98 44 C99 50 92 52 84 52 L60 52 C60 66 62 82 66 96 L34 96 C38 82 40 66 40 52 L16 52 C8 52 1 50 2 44 Z' },
  { id: 'puntos', label: 'Puntos de hongo', aspect: 1.4, d: 'M20 50 m-10 0 a10 10 0 1 0 20 0 a10 10 0 1 0 -20 0 Z M55 32 m-8 0 a8 8 0 1 0 16 0 a8 8 0 1 0 -16 0 Z M82 58 m-9 0 a9 9 0 1 0 18 0 a9 9 0 1 0 -18 0 Z' },
  { id: 'hoja', label: 'Hoja', aspect: 0.6, d: 'M50 2 C82 22 90 62 52 98 L50 100 L48 98 C10 62 18 22 50 2 Z' },
  { id: 'pino', label: 'Pino', aspect: 0.7, d: 'M50 0 L74 34 L62 34 L84 64 L68 64 L92 90 L56 90 L56 100 L44 100 L44 90 L8 90 L32 64 L16 64 L38 34 L26 34 Z' },
  { id: 'nube', label: 'Nube', aspect: 1.7, d: 'M20 80 C6 80 0 68 4 58 C8 48 18 46 24 48 C24 30 40 20 54 26 C62 12 84 14 88 32 C98 34 102 50 96 60 C100 72 92 80 82 80 Z' },
  { id: 'sol', label: 'Sol', aspect: 1, d: 'M50 0 L56 20 L72 6 L70 26 L90 20 L80 38 L100 44 L82 54 L96 70 L76 70 L80 90 L62 80 L56 100 L50 82 L44 100 L38 80 L20 90 L24 70 L4 70 L18 54 L0 44 L20 38 L10 20 L30 26 L28 6 L44 20 Z' },
  { id: 'luna', label: 'Luna', aspect: 0.8, d: 'M64 2 C32 6 10 28 10 54 C10 80 32 98 62 98 C74 98 84 94 92 88 C62 88 40 72 40 48 C40 26 54 10 74 4 C70 2 67 2 64 2 Z' },
  { id: 'estrella', label: 'Estrella', aspect: 1, d: 'M50 2 L62 36 L98 37 L69 58 L80 94 L50 73 L20 94 L31 58 L2 37 L38 36 Z' },
  { id: 'corazon', label: 'Corazón', aspect: 1.1, d: 'M50 92 C30 76 2 58 2 32 C2 14 16 4 30 4 C40 4 47 10 50 18 C53 10 60 4 70 4 C84 4 98 14 98 32 C98 58 70 76 50 92 Z' },
  { id: 'gota', label: 'Gota', aspect: 0.7, d: 'M50 0 C64 24 86 46 86 66 C86 86 70 100 50 100 C30 100 14 86 14 66 C14 46 36 24 50 0 Z' },
  { id: 'ola', label: 'Ola', aspect: 2.2, d: 'M0 60 C12 40 26 40 36 56 C44 68 56 66 62 52 C70 32 92 30 100 48 L100 100 L0 100 Z' },
  { id: 'flor', label: 'Flor', aspect: 1, d: 'M50 30 C50 10 70 4 76 18 C82 6 100 14 94 30 C108 34 104 56 88 56 C98 70 86 88 72 78 C70 96 46 98 46 80 C34 96 12 86 22 70 C4 70 0 48 16 44 C4 30 22 12 36 22 C38 14 44 12 50 30 Z' },
  { id: 'mancha', label: 'Forma libre', aspect: 1.2, d: 'M48 4 C70 2 92 14 96 36 C100 58 88 70 90 84 C92 98 70 100 54 94 C38 88 26 98 12 88 C-2 78 4 58 8 44 C12 30 26 6 48 4 Z' },
  { id: 'arcoiris', label: 'Arco', aspect: 2, d: 'M0 100 C0 44 22 4 50 4 C78 4 100 44 100 100 L78 100 C78 58 66 30 50 30 C34 30 22 58 22 100 Z' },
  { id: 'rayo', label: 'Rayo', aspect: 0.6, d: 'M60 0 L18 56 L46 56 L34 100 L82 38 L54 38 Z' }
];

export function findShape(id: string) {
  return ORGANIC_SHAPES.find((s) => s.id === id);
}
