import { FREE_PATTERN_CATEGORY_LABEL, type FreePattern, type FreePatternCategory } from '../../data/freePatternLibrary';
import { CURATED_PATTERNS } from '../../data/curatedPatterns';

export type FreePatternFilters = {
  query: string;
  category: FreePatternCategory | 'todos';
  language: 'todos' | 'es' | 'en';
  access: 'todos' | 'directo' | 'local';
  author: string;
  sample: boolean;
};
export const EMPTY_FREE_FILTERS: FreePatternFilters = { query: '', category: 'todos', language: 'todos', access: 'todos', author: 'todos', sample: false };
const normalize = (text: string) => text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
const sourceKey = (url: string) => url.replace(/\/$/, '');
export const sampleForPattern = (pattern: FreePattern) => CURATED_PATTERNS.find(sample => sourceKey(sample.url) === sourceKey(pattern.sourceUrl));

/** External sources have their own filters; never leak into native search results. */
export function filterFreePatterns(patterns: readonly FreePattern[], filters: FreePatternFilters): FreePattern[] {
  const terms = normalize(filters.query).split(/\s+/).filter(Boolean);
  return patterns.filter(pattern => {
    if (filters.category !== 'todos' && !pattern.categories.includes(filters.category)) return false;
    if (filters.language !== 'todos' && pattern.language !== filters.language) return false;
    if (filters.access === 'directo' && (pattern.access !== 'directo' || pattern.patternKind !== 'pdf')) return false;
    if (filters.access === 'local' && !pattern.assets?.pattern) return false;
    if (filters.author !== 'todos' && filters.author !== pattern.author) return false;
    if (filters.sample && !sampleForPattern(pattern)) return false;
    const haystack = normalize([pattern.name, pattern.description, pattern.author, ...pattern.categories.map(category => FREE_PATTERN_CATEGORY_LABEL[category])].join(' '));
    return terms.every(term => haystack.includes(term));
  });
}

/** Only metadata paths inside our distributable library may be served locally. */
export function localPatternUrl(path: string, base = import.meta.env.BASE_URL): string {
  const clean = path.replace(/^\//, '');
  const [file, fragment, ...extra] = clean.split('#');
  if (!file.startsWith('pattern-library/') || file.split('/').some(segment => segment === '..') || /[?\\%]/.test(file) || extra.length || fragment !== undefined && !/^page=[1-9]\d*$/.test(fragment)) throw new Error('Ruta de archivo de patrón inválida');
  return `${base.endsWith('/') ? base : `${base}/`}${clean}`;
}

export function patternLinks(pattern: FreePattern) {
  return {
    pattern: pattern.assets?.pattern ? localPatternUrl(pattern.assets.pattern) : pattern.patternUrl,
    instructions: pattern.assets?.instructions ? localPatternUrl(pattern.assets.instructions) : pattern.instructionsUrl
  };
}
