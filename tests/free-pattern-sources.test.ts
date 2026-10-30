import { describe, expect, it } from 'vitest';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { FREE_PATTERNS, FREE_PATTERN_CATEGORY_LABEL } from '../src/data/freePatternLibrary';
import exclusions from '../public/pattern-library/research-exclusions.json';
import permissions from '../public/pattern-library/bikes-and-bloomers/manifest.json';

describe('Procedencia y archivos de la biblioteca gratuita', () => {
  it('distingue artículos reales, descargas directas y acceso por correo sin duplicar PDF', () => {
    expect(FREE_PATTERNS.length).toBeGreaterThanOrEqual(200);
    expect(new Set(FREE_PATTERNS.map(pattern => pattern.id)).size).toBe(FREE_PATTERNS.length);
    expect(new Set(FREE_PATTERNS.map(pattern => pattern.patternUrl)).size).toBe(FREE_PATTERNS.length);
    for (const pattern of FREE_PATTERNS) {
      for (const url of [pattern.sourceUrl, pattern.patternUrl, pattern.instructionsUrl]) expect(new URL(url).protocol).toBe('https:');
      expect(pattern.editableInHilvana).toBe(false);
      expect(pattern.categories.length).toBeGreaterThan(0);
      for (const category of pattern.categories) expect(FREE_PATTERN_CATEGORY_LABEL[category]).toBeTruthy();
      expect(pattern.description.length).toBeGreaterThan(35);
      expect(pattern.licenseNote.length).toBeGreaterThan(35);
      expect(pattern.verifiedAt).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      if (pattern.patternKind === 'pdf') {
        expect(pattern.access).toBe('directo');
        expect(pattern.verification.pdfStatus).toBe(200);
        expect(pattern.verification.pdfSha256).toMatch(/^[a-f\d]{64}$/);
        expect(pattern.verification.pdfPages).toBeGreaterThan(0);
      }
      if (pattern.access !== 'directo') expect(pattern.patternKind).toBe('pagina');
      if (pattern.combinedPdf) {
        expect(pattern.instructionsKind).toBe('pdf');
        expect(pattern.instructionsUrl.split('#')[0]).toBe(pattern.patternUrl.split('#')[0]);
      }
    }
  });

  it('conserva bytes y licencia explícita para cada PDF que se redistribuye', () => {
    const local = FREE_PATTERNS.filter(pattern => pattern.assets?.pattern);
    expect(local.length).toBeGreaterThan(0);
    for (const pattern of local) {
      const permission = permissions.find(entry => entry.id === pattern.id);
      expect(permission, pattern.id).toBeDefined();
      expect(permission!.license).toBe('CC-BY-NC-SA-4.0');
      expect(permission!.permissionSource).toBe('https://bikesandbloomers.com/patterns/');
      const bytes = readFileSync(resolve('public', pattern.assets!.pattern!.split('#')[0]));
      expect(bytes.subarray(0, 5).toString()).toBe('%PDF-');
      expect(createHash('sha256').update(bytes).digest('hex')).toBe(pattern.verification.pdfSha256);
      expect(pattern.verification.pdfSha256).toBe(permission!.sha256);
    }
    expect(FREE_PATTERNS.filter(pattern => pattern.author.startsWith('Choly')).every(pattern => !pattern.assets)).toBe(true);
  });

  it('excluye las modificaciones con base de pago y mantiene accesos honestos de hada/Mood', () => {
    const included = new Set(FREE_PATTERNS.map(pattern => pattern.sourceUrl));
    for (const rejected of exclusions) expect(included.has(rejected.sourceUrl), rejected.reason).toBe(false);
    for (const pattern of FREE_PATTERNS.filter(pattern => pattern.author === 'Mood Sewciety')) {
      expect(pattern.access).toBe('email');
      expect(pattern.patternKind).toBe('pagina');
      expect(pattern.verification.pdfSha256).toBeUndefined();
    }
    const fairy = FREE_PATTERNS.find(pattern => pattern.id === 'pompom-fairy-set')!;
    expect(fairy.access).toBe('pedido-gratis');
    expect(fairy.patternKind).toBe('pagina');
    expect(fairy.instructionsUrl).not.toBe(fairy.patternUrl);
    expect(fairy.assets).toBeUndefined();
    expect(FREE_PATTERNS.some(pattern => pattern.sourceUrl.includes('peppermintmag.com'))).toBe(false);
  });
});
