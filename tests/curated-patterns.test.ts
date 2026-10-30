import { describe, expect, it } from 'vitest';
import { CURATED_PATTERNS, CURATED_CATEGORY_LABEL, filterCuratedPatterns } from '../src/data/curatedPatterns';

describe('Patrones externos con muestra del autor', () => {
  it('mantiene procedencia individual y evidencia sin presentarlos como patrones editables o probados por Hilvana', () => {
    expect(CURATED_PATTERNS.length).toBeGreaterThanOrEqual(10);
    expect(new Set(CURATED_PATTERNS.map(pattern => pattern.id)).size).toBe(CURATED_PATTERNS.length);
    expect(new Set(CURATED_PATTERNS.map(pattern => pattern.url)).size).toBe(CURATED_PATTERNS.length);
    for (const pattern of CURATED_PATTERNS) {
      expect(new URL(pattern.url).protocol).toBe('https:');
      expect(new URL(pattern.evidence.url).hostname).toBe(new URL(pattern.url).hostname);
      expect(pattern.evidence.kind).toBe('muestra-del-autor');
      expect(pattern.evidence.description.length).toBeGreaterThan(30);
      expect(pattern.editableInHilvana).toBe(false);
      expect(pattern.verifiedAt).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(pattern.sizing.length).toBeGreaterThan(30);
      expect(pattern.materials.length).toBeGreaterThan(0);
      expect(pattern.instructions.length).toBeGreaterThan(0);
      expect(pattern.access).toBeTruthy();
      expect(pattern.language).toBeTruthy();
      expect(pattern.licenseNote.length).toBeGreaterThan(30);
      expect(pattern.categories.length).toBeGreaterThan(0);
      for (const category of pattern.categories) expect(CURATED_CATEGORY_LABEL[category]).toBeTruthy();
      expect(`${pattern.name} ${pattern.description} ${pattern.evidence.description}`).not.toMatch(/100\s*%|verificado por Hilvana|probado por Hilvana/i);
    }
  });

  it('combina texto sin acentos con la categoría y busca también materiales y tallas', () => {
    expect(filterCuratedPatterns('  DRAGON  ', 'disfraces').map(pattern => pattern.id)).toEqual(['choly-hooded-cowl', 'choly-plush-backpack']);
    expect(filterCuratedPatterns('algodon mono', 'prendas').map(pattern => pattern.id)).toEqual(['peppermint-valley-jumpsuit', 'peppermint-jumpsuit']);
    expect(filterCuratedPatterns('32–58', 'prendas').map(pattern => pattern.id)).toEqual(['peppermint-valley-jumpsuit']);
    expect(filterCuratedPatterns('chaqueta', 'disfraces')).toEqual([]);
    expect(filterCuratedPatterns('objeto-sin-coincidencia')).toEqual([]);
    expect(filterCuratedPatterns()).toHaveLength(CURATED_PATTERNS.length);
  });

  it('conserva variantes dentro de una ficha y distingue tutoriales de PDF', () => {
    expect(filterCuratedPatterns('murcielago')[0]?.id).toBe('choly-winged-hair-clips');
    expect(filterCuratedPatterns('clips angel')[0]?.id).toBe('choly-winged-hair-clips');
    expect(CURATED_PATTERNS.find(pattern => pattern.id === 'motley-neck-ruffle')?.format).toBe('tutorial');
    expect(CURATED_PATTERNS.find(pattern => pattern.id === 'pompom-fairy-set')?.format).toBe('pdf');
    expect(filterCuratedPatterns('', 'disfraces').length).toBeGreaterThanOrEqual(6);
    expect(filterCuratedPatterns('', 'accesorios').every(pattern => pattern.categories.includes('accesorios'))).toBe(true);
  });

  it('no inventa inventarios ni descargas gratuitas de productos de pago', () => {
    const editorial = CURATED_PATTERNS.filter(pattern => pattern.id.startsWith('peppermint-'));
    expect(editorial).toHaveLength(3);
    for (const pattern of editorial) {
      expect(pattern.pieces).toEqual([]);
      expect(pattern.access).toContain('mínimo');
      expect(pattern.licenseUrl).toBe('https://peppermintmag.com/termsandconditions/');
    }
    expect(CURATED_PATTERNS.find(pattern => pattern.id === 'choly-plush-backpack')?.instructions.join(' ')).toContain('aclaración');
  });
});
