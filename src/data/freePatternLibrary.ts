/** Inventario de enlaces oficiales. La gratuidad no implica permiso de redistribución. */
import researched from '../../public/pattern-library/free-patterns.json';

export type FreePatternCategory = 'prendas' | 'accesorios' | 'disfraces' | 'bebe' | 'hogar' | 'peluches';
export const FREE_PATTERN_CATEGORY_LABEL: Record<FreePatternCategory, string> = {
  prendas: 'Prendas', accesorios: 'Accesorios', disfraces: 'Disfraces', bebe: 'Bebé', hogar: 'Hogar', peluches: 'Peluches'
};
export interface FreePattern {
  id: string;
  name: string;
  author: string;
  sourceUrl: string;
  patternUrl: string;
  instructionsUrl: string;
  patternKind: 'pdf' | 'pagina';
  instructionsKind: 'pdf' | 'pagina';
  combinedPdf?: boolean;
  categories: FreePatternCategory[];
  language: 'es' | 'en';
  access: 'directo' | 'email' | 'pedido-gratis';
  format: 'pdf' | 'tutorial';
  description: string;
  licenseNote: string;
  licenseUrl?: string;
  verifiedAt: string;
  verification: { sourceStatus?: number; sourceMethod?: 'http' | 'web'; pdfStatus?: number; pdfSha256?: string; pdfPages?: number };
  assets?: { pattern?: string; instructions?: string };
  editableInHilvana: false;
}
export const FREE_PATTERNS: FreePattern[] = researched as FreePattern[];
