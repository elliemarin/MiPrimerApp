import { describe, expect, it } from 'vitest';
import { PATTERN_SOURCES, PATTERN_SOURCE_CATEGORY_LABEL, filterPatternSources } from '../src/data/patternSources';

describe('Directorio externo de patrones', () => {
  it('conserva procedencia y límites de importación sin inventar patrones disponibles', () => {
    expect(PATTERN_SOURCES.length).toBe(12);
    expect(new Set(PATTERN_SOURCES.map(source => source.id)).size).toBe(PATTERN_SOURCES.length);
    for (const source of PATTERN_SOURCES) {
      expect(new URL(source.url).protocol).toBe('https:');
      expect(source.importNote.length).toBeGreaterThan(30);
      expect(source.licenseNote.length).toBeGreaterThan(30);
      expect(source.verifiedAt).toBe('2026-10-30');
      expect(source.categories.length).toBeGreaterThan(0);
      for (const category of source.categories) expect(PATTERN_SOURCE_CATEGORY_LABEL[category]).toBeTruthy();
    }
  });
  it('combina búsquedas sin acentos con categorías realmente disponibles', () => {
    expect(filterPatternSources('patronaje parametrico', 'patronaje').map(s => s.id)).toContain('freesewing');
    expect(filterPatternSources('monos', 'chaquetas').map(s => s.id)).toContain('mood-sewciety');
    expect(filterPatternSources('monos', 'chaquetas').map(s => s.id)).not.toContain('sew-sweetness');
    expect(filterPatternSources('inexistente')).toEqual([]);
    expect(filterPatternSources('', 'hogar').every(s => s.categories.includes('hogar'))).toBe(true);
  });
  it('distingue software paramétrico de archivos PDF y tutoriales', () => {
    expect(PATTERN_SOURCES.find(s => s.id === 'freesewing')?.format).toBe('parametrico');
    expect(PATTERN_SOURCES.find(s => s.id === 'peppermint')?.format).toBe('pdf');
    expect(PATTERN_SOURCES.find(s => s.id === 'learnmyog')?.licenseNote).toContain('personal');
  });
});
