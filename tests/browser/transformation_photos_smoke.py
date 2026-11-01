"""Fotos antes/después de Transformar mi ropa: móvil, escritorio y offline.

Vite: python tests/browser/transformation_photos_smoke.py --url http://127.0.0.1:5177/
Pages: python tests/browser/transformation_photos_smoke.py --production --offline --url URL
El modo Vite guarda un manifiesto local; Pages lo usa sin importar módulos /src.
"""
import argparse
import json
import os
from pathlib import Path

from playwright.sync_api import expect, sync_playwright


MANIFEST = """async base => {
  const [{TRANSFORMATIONS}, images] = await Promise.all([
    import(base + 'src/data/transformations.ts'), import(base + 'src/data/transformationPhotos.ts')
  ]);
  return {sheets: images.TRANSFORMATION_PHOTO_SHEETS, ideas: TRANSFORMATIONS.map(idea => {
    const source = images.transformationPhotoFor(idea.id);
    if (!source) throw Error('Falta foto: ' + idea.id);
    return {id: idea.id, name: idea.name, garment: idea.garment, ...source};
  })};
}"""


def open_transformations(page, base):
    page.goto(base + '#/biblioteca', wait_until='networkidle')
    page.get_by_role('button', name='Transformar mi ropa', exact=True).click()
    page.get_by_role('heading', name='Dale otra vida a tu ropa', exact=True).wait_for()


def check_photo(photo, row, view):
    assert photo.count() == 1, (row['id'], view)
    assert photo.get_attribute('data-transformation-photo') == row['id']
    assert photo.get_attribute('data-view') == view
    assert photo.locator('svg').count() == 0
    image = photo.locator('img.transformation-photo-atlas')
    image.evaluate('(image) => { image.loading = "eager"; return image.decode(); }')
    actual = image.evaluate("""image => ({file: image.currentSrc.split('/').pop(),
      width: image.naturalWidth, height: image.naturalHeight})""")
    assert actual == {'file': row['sheet'] + '.webp', 'width': 1254, 'height': 1254}, (row, actual)
    crop = photo.locator('.transformation-photo-crop').bounding_box()
    assert crop and crop['width'] > 100 and crop['height'] > 80, (row['id'], crop)
    return photo.evaluate('(node) => node.outerHTML')


def check_cards(page, ideas):
    assert page.locator('.transform-card').count() == len(ideas)
    for row in ideas:
        card = page.locator(f'.transform-card[data-transformation="{row["id"]}"]')
        check_photo(card.locator('.transformation-photo'), row, 'after')
    assert page.evaluate('document.documentElement.scrollWidth <= innerWidth + 1')


def check_filters(page, ideas):
    filters = page.get_by_role('group', name='Prenda que quieres transformar')
    categories = {'Pantalones': 'pantalon', 'Hoodies y sudaderas': 'hoodie', 'Camisas y tops': 'camisa',
                  'Chaquetas': 'chaqueta', 'Vestidos': 'vestido', 'Faldas': 'falda'}
    counts = {}
    for label, garment in categories.items():
        filters.get_by_role('button', name=label, exact=True).click()
        expected = [row for row in ideas if row['garment'] == garment]
        check_cards(page, expected)
        counts[garment] = len(expected)
    filters.get_by_role('button', name='Todas', exact=True).click()
    search = page.get_by_role('searchbox', name='Buscar transformaciones')
    search.fill('campana')
    assert page.locator('.transform-card').count() == 1
    assert page.locator('.transform-card').get_attribute('data-transformation') == 'pantalon-campana-70'
    search.fill('sin resultados inexistentes')
    assert page.locator('.transform-card').count() == 0
    search.fill('')
    return counts


def check_details(page, ideas, out):
    galleries = {}
    for index, row in enumerate(ideas):
        page.locator(f'.transform-card[data-transformation="{row["id"]}"]').click()
        dialog = page.get_by_role('dialog')
        dialog.get_by_role('heading', name=row['name'], exact=True).wait_for()
        preview = dialog.locator('.transform-preview')
        after = preview.get_by_role('button', name='Con el cambio', exact=True)
        before = preview.get_by_role('button', name='Antes', exact=True)
        assert after.get_attribute('aria-pressed') == 'true'
        check_photo(preview.locator('.transformation-photo'), row, 'after')
        assert preview.get_by_text('Ejemplo visual generado con IA.', exact=False).count() == 1
        # The comparison is presentation only: changing it must not reset the
        # measured confirmation or modify a person's draft dimensions.
        if index == 0:
            first_input = dialog.locator('.transform-measures input').first
            first_input.fill(str(float(first_input.input_value().replace(',', '.')) + 1))
            dialog.get_by_role('checkbox').check()
            assert dialog.get_by_role('button', name='Generar mi transformación', exact=True).is_enabled()
        values = dialog.locator('.transform-measures input, .transform-measures select').evaluate_all('(fields) => fields.map(field => field.value)')
        draft = page.evaluate('id => localStorage.getItem("hilvana-transform-" + id)', row['id'])
        row_photos = {}
        for view, button in [('before', before), ('after', after)]:
            button.click()
            assert button.get_attribute('aria-pressed') == 'true'
            row_photos[view] = check_photo(preview.locator('.transformation-photo'), row, view)
            assert dialog.locator('.transform-measures input, .transform-measures select').evaluate_all('(fields) => fields.map(field => field.value)') == values
            assert page.evaluate('id => localStorage.getItem("hilvana-transform-" + id)', row['id']) == draft
            if index == 0:
                assert dialog.get_by_role('checkbox').is_checked()
                assert dialog.get_by_role('button', name='Generar mi transformación', exact=True).is_enabled()
        assert page.evaluate('document.documentElement.scrollWidth <= innerWidth + 1')
        galleries.setdefault(row['sheet'], []).append({**row, 'photos': row_photos})
        if row['id'] in ['vaquero-costados', 'hoodie-parche-espalda', 'falda-godets']:
            preview.screenshot(path=str(out / (row['id'] + '-preview.png')))
            page.screenshot(path=str(out / (row['id'] + '-detail-mobile.png')))
        dialog.get_by_role('button', name='Cerrar', exact=True).click()
    return galleries


def capture_galleries(page, galleries, out):
    # Review the component's actual markup and app CSS. Each photograph has the
    # same available width as a mobile card; no image data is edited or redrawn.
    page.evaluate("""() => {
      document.getElementById('root').style.display = 'none';
      const section = document.createElement('section'); section.id = 'photo-review'; section.className = 'page';
      document.body.append(section);
    }""")
    for sheet, rows in galleries.items():
        page.evaluate("""({sheet, rows}) => {
          const section = document.getElementById('photo-review'); section.replaceChildren();
          const heading = document.createElement('h2'); heading.textContent = sheet; heading.style.fontSize = '16px';
          section.append(heading);
          for (const row of rows) for (const [view, title] of [['before','Antes'], ['after','Con el cambio']]) {
            const article = document.createElement('article'); article.className = 'transform-card';
            const label = document.createElement('strong'); label.textContent = row.name + ' · ' + title;
            article.append(label);
            article.insertAdjacentHTML('beforeend', row.photos[view]);
            section.append(article);
          }
        }""", {'sheet': sheet, 'rows': rows})
        page.locator('#photo-review img').evaluate_all('(images) => Promise.all(images.map(image => image.decode()))')
        page.locator('#photo-review').screenshot(path=str(out / (sheet + '-mobile.png')))


def check_image_failure(browser, base, first, out):
    context = browser.new_context(viewport={'width': 390, 'height': 844}, service_workers='block', ignore_https_errors=True)
    context.route('**/transformation-images/' + first['sheet'] + '.webp', lambda route: route.abort('failed'))
    page = context.new_page()
    try:
        open_transformations(page, base)
        photo = page.locator(f'.transform-card[data-transformation="{first["id"]}"] .transformation-photo')
        expect(photo).to_have_text('Imagen no disponible')
        assert photo.locator('svg, img').count() == 0
        page.locator(f'.transform-card[data-transformation="{first["id"]}"]').click()
        dialog = page.get_by_role('dialog')
        dialog.locator('.transform-preview').get_by_role('button', name='Antes', exact=True).click()
        dialog.locator('.transform-preview').get_by_text('Imagen no disponible', exact=True).wait_for()
        assert dialog.locator('.transform-measures input').count() > 0
        dialog.locator('.transform-preview').screenshot(path=str(out / 'image-unavailable.png'))
        return True
    finally:
        context.close()


def check_offline(context, page, base, sheets, out):
    page.wait_for_function('!!navigator.serviceWorker?.controller', timeout=60000)
    offline = context.new_page()
    context.set_offline(True)
    try:
        open_transformations(offline, base)
        assert offline.locator('.transform-card').count() == 27
        result = offline.evaluate("""async ({base, sheets}) => {
          const rows = [];
          for (const sheet of sheets) {
            const response = await fetch(base + 'transformation-images/' + sheet + '.webp', {cache:'reload'});
            if (!response.ok) throw Error('Foto no disponible sin red: ' + sheet);
            const blob = await response.blob(), url = URL.createObjectURL(blob), image = new Image();
            try {
              image.src = url; await image.decode();
              rows.push({sheet, width:image.naturalWidth, height:image.naturalHeight, bytes:blob.size});
            } finally { URL.revokeObjectURL(url); }
          }
          return {controller:navigator.serviceWorker.controller.scriptURL, images:rows};
        }""", {'base': base, 'sheets': list(sheets)})
        assert len(result['images']) == 9
        assert all(row['width'] == row['height'] == 1254 and row['bytes'] > 0 for row in result['images'])
        offline.screenshot(path=str(out / 'offline-mobile.png'))
        return result
    finally:
        context.set_offline(False)
        offline.close()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--url', default=os.environ.get('HILVANA_TRANSFORM_URL', 'http://127.0.0.1:5177/'))
    parser.add_argument('--production', action='store_true')
    parser.add_argument('--offline', action='store_true')
    parser.add_argument('--manifest', default='/tmp/hilvana-transform-photos-dev/manifest.json')
    parser.add_argument('--out', default='/tmp/hilvana-transform-photos-dev')
    args = parser.parse_args()
    if args.offline and not args.production:
        parser.error('--offline requiere un build de producción')
    base = args.url.rstrip('/') + '/'
    out = Path(args.out); out.mkdir(parents=True, exist_ok=True)
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
        page.on('response', lambda response: missing.append(response.url) if response.status >= 400 and '/transformation-images/' in response.url else None)
        try:
            open_transformations(page, base)
            if args.production:
                manifest = json.loads(manifest_path.read_text())
            else:
                manifest = page.evaluate(MANIFEST, base)
                manifest_path.parent.mkdir(parents=True, exist_ok=True)
                manifest_path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2))
            ideas = manifest['ideas']
            assert len(ideas) == 27 and len(manifest['sheets']) == 9
            check_cards(page, ideas)
            page.screenshot(path=str(out / 'mobile-list.png'))
            page.locator('.transform-card').first.scroll_into_view_if_needed()
            page.screenshot(path=str(out / 'mobile-cards.png'))
            hero = page.locator('.transform-intro .transform-preview')
            hero.get_by_role('button', name='Antes', exact=True).click()
            check_photo(hero.locator('.transformation-photo'), ideas[0], 'before')
            hero.get_by_role('button', name='Con el cambio', exact=True).click()
            filters = check_filters(page, ideas)
            galleries = check_details(page, ideas, out)
            page.set_viewport_size({'width': 1440, 'height': 1000})
            check_cards(page, ideas)
            page.evaluate('scrollTo(0, 0)')
            page.screenshot(path=str(out / 'desktop-list.png'))
            page.locator(f'.transform-card[data-transformation="{ideas[0]["id"]}"]').click()
            page.get_by_role('dialog').locator('.transform-preview').screenshot(path=str(out / 'desktop-preview.png'))
            page.get_by_role('dialog').get_by_role('button', name='Cerrar', exact=True).click()
            page.set_viewport_size({'width': 390, 'height': 844})
            offline = check_offline(context, page, base, manifest['sheets'], out) if args.offline else None
            failure = check_image_failure(browser, base, ideas[0], out)
            capture_galleries(page, galleries, out)
            assert not errors, errors
            assert not missing, missing
            result = {'url':base, 'production':args.production, 'ideas':len(ideas), 'photographs':len(ideas) * 2,
                      'sheets':len(galleries), 'filters':filters, 'imageFailureHandled':failure,
                      'offline':offline, 'errors':errors, 'missing':missing}
            (out / 'results.json').write_text(json.dumps(result, ensure_ascii=False, indent=2))
            print(json.dumps(result, ensure_ascii=False), flush=True)
        finally:
            browser.close()


if __name__ == '__main__':
    main()
