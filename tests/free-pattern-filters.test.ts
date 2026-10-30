import { describe, expect, it } from 'vitest';
import type { FreePattern } from '../src/data/freePatternLibrary';
import { EMPTY_FREE_FILTERS, filterFreePatterns, localPatternUrl, sampleForPattern } from '../src/features/library/freePatternFilters';

const entry = (patch: Partial<FreePattern>): FreePattern => ({ id: 'test', name: 'Bolso de lino', author: 'Autora', sourceUrl: 'https://example.org/source', patternUrl: 'https://example.org/pattern.pdf', instructionsUrl: 'https://example.org/guide', patternKind: 'pdf', instructionsKind: 'pagina', categories: ['accesorios'], language: 'es', access: 'directo', format: 'pdf', description: 'Bolso con asas de tela.', licenseNote: 'Solo enlace.', verifiedAt: '2026-10-30', verification: { sourceStatus: 200 }, editableInHilvana: false, ...patch });

describe('Fuentes gratuitas: filtros y copias autorizadas', () => {
  it('combina categoría, idioma, palabras y acceso sin añadir fuentes ajenas', () => {
    const wanted = entry({ id: 'es' });
    const records = [wanted, entry({ id: 'en', language: 'en' }), entry({ id: 'mail', access: 'email', patternKind: 'pagina' }), entry({ id: 'cape', categories: ['disfraces'] })];
    expect(filterFreePatterns(records, { ...EMPTY_FREE_FILTERS, category: 'accesorios', language: 'es', access: 'directo', query: 'BÓLSO lino' })).toEqual([wanted]);
    expect(filterFreePatterns(records, { ...EMPTY_FREE_FILTERS, query: 'hoodie' })).toEqual([]);
  });
  it('solo anuncia una copia local cuando existe archivo de patrón autorizado', () => {
    const copy = entry({ id: 'local', assets: { pattern: 'pattern-library/allowed/pattern.pdf' } });
    expect(filterFreePatterns([copy, entry({ id: 'link' }), entry({ id: 'guide', assets: { instructions: 'pattern-library/allowed/guide.pdf' } })], { ...EMPTY_FREE_FILTERS, access: 'local' })).toEqual([copy]);
  });
  it('no convierte fuente revisada en muestra cosida', () => {
    const fairy = entry({ sourceUrl: 'https://www.pompomdumonde.com/sewing-patterns/p/fairy-set/' });
    expect(sampleForPattern(fairy)?.id).toBe('pompom-fairy-set');
    expect(filterFreePatterns([entry({}), fairy], { ...EMPTY_FREE_FILTERS, sample: true })).toEqual([fairy]);
  });
  it('resuelve copias bajo el prefijo de Pages y rechaza rutas externas o ascendentes', () => {
    expect(localPatternUrl('pattern-library/allowed/pattern.pdf', '/MiPrimerApp/')).toBe('/MiPrimerApp/pattern-library/allowed/pattern.pdf');
    expect(localPatternUrl('/pattern-library/allowed/pattern.pdf', '/')).toBe('/pattern-library/allowed/pattern.pdf');
    expect(localPatternUrl('pattern-library/allowed/pattern.pdf#page=4', '/MiPrimerApp/')).toBe('/MiPrimerApp/pattern-library/allowed/pattern.pdf#page=4');
    for (const path of ['https://external.test/x.pdf', 'pattern-library/../secrets', 'pattern-library/a.pdf?secret', 'pattern-library/..\\file']) expect(() => localPatternUrl(path, '/')).toThrow();
  });
});
