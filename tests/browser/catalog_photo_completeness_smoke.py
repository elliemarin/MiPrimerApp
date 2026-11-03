"""Comprueba las fotos de todo el catálogo en móvil, en Vite o en Pages.

Dev: genera el manifiesto desde los resolutores reales, sin modificar datos.
  HILVANA_URL=http://127.0.0.1:5177 python tests/browser/catalog_photo_completeness_smoke.py
Build/Pages: usa ese mismo manifiesto; no importa módulos /src.
  python tests/browser/catalog_photo_completeness_smoke.py --production --url URL

La evidencia queda en /tmp/hilvana-catalog-current. Los montajes conservan el
HTML del componente real y su CSS; solo organizan los recortes para revisarlos.
"""
import argparse
import json
import os
from pathlib import Path
from urllib.parse import quote

from playwright.sync_api import sync_playwright


# Baseline del catálogo digitalizado del 2026-11-02. Las cantidades de fotos,
# láminas y fichas revisadas se derivan del resolutor, no de un lote anterior.
CURRENT_CATALOG = {'recipes': 2074, 'groups': 318, 'availableGroups': 257}
DIGITIZED_RECIPES = [
    'barrel-elastico', 'palazzo-botones-laterales', 'palazzo-elastico',
    'pantalon-volante', 'jogger-oversize-felpa', 'baggy-felpa', 'cargo-recto',
    'chaqueta-ranglan', 'sobrecamisa-cuello-tira', 'sudadera-bloques',
    'sudadera-media-cremallera-lisa', 'buzo-murcielago', 'chaqueta-campo',
    'culotte-encaje', 'culotte-punto-picot',
]
CHILD_VARIANTS = ['buzo-murcielago', 'palazzo-elastico']
PICKER_CASES = [
    ('bomber-clasica', 'bomber-corta', 'largoExtra', '-120'),
    ('blusa-campesina', 'blusa-campesina-larga', 'manga', '"larga"'),
    ('sudadera-bloques', 'sudadera-media-cremallera-lisa', 'bloques', '"no"'),
    ('culotte-encaje', 'culotte-punto-picot', 'acabado', '"elastico"'),
    ('pantalon-barrel', 'barrel-elastico', 'cintura', '"elastica"'),
    ('chaqueta-safari', 'chaqueta-campo', 'cierre', '"cremallera"'),
]


RESOLVE_MANIFEST = """async ({base, requiredRecipes, childVariants, pickerTargets}) => {
  const [{ CATALOG }, { groupCatalog }, { modelHasPattern, matches, INITIAL_FILTERS }, images] = await Promise.all([
    import(base + 'src/data/catalog.ts'), import(base + 'src/features/library/groups.ts'),
    import(base + 'src/features/library/filters.ts'), import(base + 'src/data/catalogImages.ts')
  ]);
  const technical = /^(ninas-01|bebe-02|tendencia-0[123]|infantil-0[12345]|lote-adultos-01)$/;
  const unique = new Map();
  let checked = 0;
  function describe(model, recipient) {
    const source = images.catalogImageFor(model, recipient);
    if (!source || technical.test(source.sheet)) throw Error('Falta foto IA: ' + model.id);
    if (images.catalogImageCaption(source) !== 'Ilustración generada con IA.') throw Error('Leyenda incorrecta: ' + model.id);
    return {id: model.id, group: model.designGroup?.id ?? model.id, name: model.name,
      recipient: recipient ?? null, available: modelHasPattern(model), ...source,
      bounds: images.catalogImageBounds(source)};
  }
  for (const model of CATALOG) for (const recipient of [undefined, ...model.recipients]) {
    const row = describe(model, recipient), key = `${row.sheet}/${row.cell}`;
    if (!unique.has(key)) unique.set(key, row);
    checked++;
  }
  const available = CATALOG.filter(modelHasPattern);
  function required(id, recipient) {
    const model = CATALOG.find(candidate => candidate.id === id);
    if (!model) throw Error('Receta requerida ausente: ' + id);
    if (recipient && !model.recipients.includes(recipient)) throw Error('Destinatario no válido: ' + id);
    return describe(model, recipient);
  }
  return {
    recipes: CATALOG.length, groups: groupCatalog(CATALOG).length, checked,
    cards: groupCatalog(available).map(group => describe(group.representative)),
    babyCards: groupCatalog(available.filter(model => matches(model, {...INITIAL_FILTERS, recipient: 'bebe'})))
      .map(group => describe(group.representative, 'bebe')),
    sources: [...unique.values()],
    requiredRecipes: [...requiredRecipes.map(id => required(id)),
      ...childVariants.map(id => required(id, 'infantil'))],
    pickerTargets: pickerTargets.map(id => required(id)),
  };
}"""


def validate_manifest(manifest):
    assert manifest['recipes'] == CURRENT_CATALOG['recipes'], manifest['recipes']
    assert manifest['groups'] == CURRENT_CATALOG['groups'], manifest['groups']
    assert len(manifest['cards']) == CURRENT_CATALOG['availableGroups'], len(manifest['cards'])
    required = manifest['requiredRecipes']
    expected = {(recipe, None) for recipe in DIGITIZED_RECIPES}
    expected.update((recipe, 'infantil') for recipe in CHILD_VARIANTS)
    assert {(row['id'], row['recipient']) for row in required} == expected
    assert len({(row['sheet'], row['cell']) for row in required}) == len(expected), required
    for row in required:
        assert row['available'] and row['sheet'].startswith('realistas-'), row
    # An old production manifest must never silently allow a technical sheet.
    forbidden = {'ninas-01', 'bebe-02', 'lote-adultos-01'}
    forbidden.update(f'tendencia-0{i}' for i in range(1, 4))
    forbidden.update(f'infantil-0{i}' for i in range(1, 6))
    assert not forbidden.intersection(row['sheet'] for row in manifest['sources'])


def expand_cards(page):
    more = page.get_by_role('button', name='Ver más diseños', exact=True)
    while more.count():
        more.click()


def check_cards(page, expected):
    expand_cards(page)
    actual = page.locator('.simple-pattern-card').evaluate_all("""async cards => {
      return await Promise.all(cards.map(async card => {
        const photo = card.querySelector('.catalog-photo'), image = card.querySelector('img.catalog-photo-atlas');
        if (!photo || !image) throw Error('Dibujo en tarjeta: ' + card.dataset.designGroup);
        image.loading = 'eager';
        await image.decode();
        return {group: card.dataset.designGroup, cell: Number(photo.dataset.imageCell),
          file: image.currentSrc.split('/').pop(), width: image.naturalWidth, height: image.naturalHeight};
      }));
    }""")
    lookup = {row['group']: row for row in expected}
    assert len(actual) == len(lookup), (len(actual), len(lookup))
    assert {row['group'] for row in actual} == set(lookup)
    for row in actual:
        wanted = lookup[row['group']]
        assert row['file'] == wanted['sheet'] + '.webp', (row, wanted)
        assert row['cell'] == wanted['cell'], (row, wanted)
        assert row['width'] == 1254 and row['height'] == 1254, row
    assert page.evaluate('document.documentElement.scrollWidth <= innerWidth + 1')
    return actual


def decode_sheets(page, base, sources):
    sheets = sorted({row['sheet'] for row in sources})
    decoded = page.evaluate("""async ({base, sheets}) => {
      const results = [];
      for (let start = 0; start < sheets.length; start += 6) {
        results.push(...await Promise.all(sheets.slice(start, start + 6).map(async sheet => {
          const image = new Image(); image.src = base + 'catalog-images/' + sheet + '.webp';
          await image.decode();
          return {sheet, width: image.naturalWidth, height: image.naturalHeight};
        })));
      }
      return results;
    }""", {'base': base, 'sheets': sheets})
    for row in decoded:
        assert row['width'] == 1254 and row['height'] == 1254, row
    return decoded


def check_variant_picker(page, base, sources, out):
    for initial, target, param, value in PICKER_CASES:
        expected = next(row for row in sources if row['id'] == target)
        page.goto(base + '#/biblioteca/' + initial, wait_until='domcontentloaded')
        page.get_by_role('button', name='Intervenir', exact=True).click()
        if not page.locator('#variant-' + param).is_visible():
            page.locator('.model-variant-more summary').click()
        page.locator('#variant-' + param).select_option(value)
        page.wait_for_function("""wanted => {
          const photo = document.querySelector('.model-variant-preview .catalog-photo');
          const image = photo?.querySelector('img');
          return Number(photo?.dataset.imageCell) === wanted.cell && image?.src.endsWith('/' + wanted.sheet + '.webp');
        }""", arg=expected)
        page.locator('.model-variant-preview img').evaluate('(image) => image.decode()')
        page.get_by_role('dialog').screenshot(path=str(out / ('variant-' + target + '.png')))
        page.get_by_role('button', name='Cerrar', exact=True).click()
    return len(PICKER_CASES)


def check_offline(context, page, base, sources, out):
    page.wait_for_function('!!navigator.serviceWorker?.controller', timeout=60000)
    sheets = sorted({row['sheet'] for row in sources})
    offline = context.new_page()
    errors = []
    offline.on('pageerror', lambda error: errors.append(str(error)))
    context.set_offline(True)
    try:
        offline.goto(base + '#/biblioteca', wait_until='networkidle')
        offline.wait_for_function('!!navigator.serviceWorker?.controller')
        offline.get_by_role('button', name='Todo', exact=True).click()
        assert offline.locator('.simple-pattern-card').count() == 24
        # cache:reload bypasses the HTTP memory/disk cache. An activated worker
        # must serve the bytes while the browser network is actually offline.
        fetched = offline.evaluate("""async ({base, sheets}) => {
          const rows = [];
          for (const sheet of sheets) {
            const response = await fetch(base + 'catalog-images/' + sheet + '.webp', {cache: 'reload'});
            if (!response.ok) throw Error('No disponible offline: ' + sheet);
            const blob = await response.blob(), url = URL.createObjectURL(blob), image = new Image();
            try {
              image.src = url; await image.decode();
              rows.push({sheet, bytes: blob.size, width: image.naturalWidth, height: image.naturalHeight});
            } finally { URL.revokeObjectURL(url); }
          }
          return {controller: navigator.serviceWorker.controller.scriptURL, images: rows};
        }""", {'base': base, 'sheets': sheets})
        assert {row['sheet'] for row in fetched['images']} == set(sheets)
        for row in fetched['images']:
            assert row['width'] == 1254 and row['height'] == 1254 and row['bytes'] > 0, row
        offline.screenshot(path=str(out / 'offline-library-mobile.png'))
        assert not errors, errors
        return fetched
    finally:
        context.set_offline(False)
        offline.close()


def visit_details(page, base, rows, required, out):
    galleries = {}
    checked = []
    required_keys = {(row['id'], row['recipient']) for row in required}
    # Keep explicit recipe checks even if another recipe wins a shared source.
    visits = {(row['id'], row['recipient']): row for row in [*rows, *required]}
    for row in visits.values():
        query = '?para=' + row['recipient'] if row['recipient'] else ''
        page.goto(base + '#/biblioteca/' + quote(row['id']) + query, wait_until='domcontentloaded')
        page.wait_for_function("""wanted => {
          const photo = document.querySelector('.simple-model-art .catalog-photo');
          const image = photo?.querySelector('img');
          return photo?.dataset.catalogImage === wanted.group && Number(photo?.dataset.imageCell) === wanted.cell
            && image?.src.endsWith('/' + wanted.sheet + '.webp');
        }""", arg=row)
        image = page.locator('.simple-model-art img.catalog-photo-atlas')
        image.evaluate('(image) => image.decode()')
        assert page.get_by_text('Ilustración generada con IA.', exact=False).count() == 1, row
        assert page.get_by_role('button', name='Obtener patrón', exact=True).is_enabled() == row['available'], row
        assert page.evaluate('document.documentElement.scrollWidth <= innerWidth + 1'), row
        crop = page.locator('.simple-model-art .catalog-photo').evaluate('(node) => node.outerHTML')
        gallery = galleries.setdefault(row['sheet'], {})
        gallery.setdefault(row['cell'], {**row, 'html': crop})
        if row['id'] in ['sombrero-pescador-bebe', 'bomber-corta', 'vestido-trapecio', 'sombrero-pescador']:
            page.screenshot(path=str(out / ('detail-' + row['id'] + '.png')), full_page=True)
        checked.append({'id': row['id'], 'recipient': row['recipient'], 'sheet': row['sheet'],
                        'cell': row['cell'], 'available': row['available'],
                        'required': (row['id'], row['recipient']) in required_keys})
    baby = next(row for row in checked if row['id'] == 'sombrero-pescador-bebe')
    adult = next(row for row in checked if row['id'] == 'sombrero-pescador')
    assert (baby['sheet'], baby['cell']) != (adult['sheet'], adult['cell'])

    # All objects came from real rendered detail views. Reuse their exact crop
    # markup in the app's mobile card layout for a compact, inspectable gallery.
    page.evaluate("""() => {
      const root = document.getElementById('root');
      if (root) root.style.display = 'none';
      const section = document.createElement('section'); section.id = 'photo-review'; section.className = 'page';
      document.body.append(section);
    }""")
    for sheet, members in sorted(galleries.items()):
        page.evaluate("""({sheet, members}) => {
          const section = document.getElementById('photo-review'); section.replaceChildren();
          const title = document.createElement('h2'); title.textContent = sheet; title.style.fontSize = '18px';
          section.append(title);
          const grid = document.createElement('div'); grid.className = 'simple-pattern-grid'; section.append(grid);
          for (const row of [...members].sort((a, b) => a.cell - b.cell)) {
            const card = document.createElement('article'); card.className = 'simple-pattern-card';
            const art = document.createElement('div'); art.className = 'simple-pattern-art'; art.innerHTML = row.html;
            const caption = document.createElement('div'); caption.className = 'simple-pattern-caption';
            const name = document.createElement('strong'); name.textContent = row.name;
            const cell = document.createElement('span'); cell.textContent = 'Celda ' + row.cell;
            caption.append(name, cell); card.append(art, caption); grid.append(card);
          }
        }""", {'sheet': sheet, 'members': list(members.values())})
        page.locator('#photo-review img').evaluate_all('(images) => Promise.all(images.map(image => image.decode()))')
        page.locator('#photo-review').screenshot(path=str(out / (sheet + '-mobile.png')))
    return checked, len(galleries)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--url', default=os.environ.get('HILVANA_PRODUCTION_URL', os.environ.get('HILVANA_URL', 'http://127.0.0.1:5177/')))
    parser.add_argument('--production', action='store_true', help='Usar manifiesto local sin imports /src')
    parser.add_argument('--offline', action='store_true', help='Comprobar el precache real de todas las láminas resueltas (requiere --production)')
    parser.add_argument('--manifest', default='/tmp/hilvana-catalog-current/manifest.json')
    parser.add_argument('--out', default='/tmp/hilvana-catalog-current')
    args = parser.parse_args()
    if args.offline and not args.production:
        parser.error('--offline requiere --production y un build con service worker')
    base = args.url.rstrip('/') + '/'
    out = Path(args.out)
    out.mkdir(parents=True, exist_ok=True)
    manifest_path = Path(args.manifest)
    with sync_playwright() as p:
        launch = {'executable_path': '/usr/bin/chromium', 'headless': True, 'args': ['--no-sandbox']}
        if base.startswith('https:') and os.environ.get('HTTPS_PROXY'):
            launch['proxy'] = {'server': os.environ['HTTPS_PROXY']}
        browser = p.chromium.launch(**launch)
        context = browser.new_context(viewport={'width': 390, 'height': 844}, is_mobile=True, has_touch=True, ignore_https_errors=True)
        page = context.new_page()
        page.set_default_timeout(20000)
        errors, missing = [], []
        page.on('pageerror', lambda error: errors.append(str(error)))
        page.on('response', lambda response: missing.append(response.url) if response.status >= 400 and '/catalog-images/' in response.url else None)
        try:
            page.goto(base + '#/biblioteca', wait_until='networkidle')
            page.get_by_role('button', name='Todo', exact=True).click()
            if args.production:
                manifest = json.loads(manifest_path.read_text())
            else:
                manifest = page.evaluate(RESOLVE_MANIFEST, {'base': base, 'requiredRecipes': DIGITIZED_RECIPES,
                    'childVariants': CHILD_VARIANTS, 'pickerTargets': [case[1] for case in PICKER_CASES]})
                manifest_path.parent.mkdir(parents=True, exist_ok=True)
                manifest_path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2))
            validate_manifest(manifest)
            all_cards = check_cards(page, manifest['cards'])
            replaced_cards = [row for row in all_cards if row['file'].startswith('realistas-')]
            assert len(replaced_cards) == sum(row['sheet'].startswith('realistas-') for row in manifest['cards'])
            page.screenshot(path=str(out / 'all-library-mobile.png'))
            page.get_by_role('button', name='Bebé', exact=True).click()
            baby_cards = check_cards(page, manifest['babyCards'])
            page.screenshot(path=str(out / 'baby-library-mobile.png'))
            sheets = decode_sheets(page, base, manifest['sources'])
            variants = check_variant_picker(page, base, manifest['pickerTargets'], out)
            offline = check_offline(context, page, base, manifest['sources'], out) if args.offline else None
            review_sources = [row for row in manifest['sources'] if row['sheet'].startswith('realistas-')]
            details, gallery_count = visit_details(page, base, review_sources, manifest['requiredRecipes'], out)
            expected_visits = {(row['id'], row['recipient']) for row in [*review_sources, *manifest['requiredRecipes']]}
            assert {(row['id'], row['recipient']) for row in details} == expected_visits
            assert gallery_count == len({row['sheet'] for row in review_sources})
            assert not errors, errors
            assert not missing, missing
            result = {'url': base, 'production': args.production, 'recipes': manifest['recipes'], 'groups': manifest['groups'],
                'recipientChecks': manifest['checked'], 'libraryCards': len(all_cards), 'babyCards': len(baby_cards),
                'realisticCards': len(replaced_cards), 'sheets': len(sheets), 'realisticDetails': len(details), 'galleries': gallery_count,
                'digitizedRecipePhotos': sum(row['required'] for row in details),
                'variantPickers': variants, 'offline': offline, 'errors': errors, 'missing': missing, 'details': details}
            (out / 'results.json').write_text(json.dumps(result, ensure_ascii=False, indent=2))
            print(json.dumps({key: value for key, value in result.items() if key != 'details'}, ensure_ascii=False))
        finally:
            browser.close()


if __name__ == '__main__':
    main()
