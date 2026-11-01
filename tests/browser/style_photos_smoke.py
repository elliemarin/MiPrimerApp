"""Decode all 90 new style photos and capture their actual mobile card crops.

Run with the Vite dev server available on HILVANA_URL (default port 5173).
Screenshots and JSON evidence are written to /tmp/hilvana-style-photos.
"""
import json
import os
from pathlib import Path

from playwright.sync_api import sync_playwright


def main():
    out = Path('/tmp/hilvana-style-photos')
    out.mkdir(exist_ok=True)
    with sync_playwright() as p:
        browser = p.chromium.launch(executable_path='/usr/bin/chromium', headless=True, args=['--no-sandbox'])
        page = browser.new_page(viewport={'width': 390, 'height': 844}, is_mobile=True, has_touch=True)
        errors = []
        page.on('pageerror', lambda error: errors.append(str(error)))
        page.goto(os.environ.get('HILVANA_URL', 'http://127.0.0.1:5173') + '/#/biblioteca', wait_until='networkidle')
        page.get_by_role('button', name='Todo', exact=True).click()
        while page.get_by_role('button', name='Ver más diseños', exact=True).count():
            page.get_by_role('button', name='Ver más diseños', exact=True).click()
        sheets = page.evaluate("async () => (await import('/src/data/styleCatalogImages.ts')).STYLE_CATALOG_IMAGE_SHEETS")
        checked = []
        for sheet, ids in sheets.items():
            # Keep real rendered cards and their existing CSS; hide unrelated cards
            # only for this screenshot so every crop can be reviewed at 390 px.
            page.evaluate("""ids => {
                document.querySelectorAll('.simple-pattern-card').forEach(card => {
                    const index = ids.indexOf(card.dataset.designGroup);
                    card.style.display = index < 0 ? 'none' : '';
                    card.style.order = index < 0 ? '' : String(index);
                });
            }""", ids)
            for group in ids:
                card = page.locator(f'.simple-pattern-card[data-design-group="{group}"]')
                assert card.count() == 1, f'Missing or duplicate style card: {group}'
                card.scroll_into_view_if_needed()
                img = card.locator('img.catalog-photo-atlas')
                assert img.count() == 1, f'Vector fallback for {group}'
                img.evaluate('(image) => image.decode()')
                data = img.evaluate('(image) => ({url: image.currentSrc, width: image.naturalWidth, height: image.naturalHeight})')
                assert data['width'] == 1254 and data['height'] == 1254, data
                assert data['url'].endswith(sheet + '.webp'), (group, data)
                checked.append({'group': group, **data})
            page.locator('.simple-pattern-grid').screenshot(path=str(out / (sheet + '.png')))
        assert len(checked) == 90 and len({row['group'] for row in checked}) == 90
        assert not errors, errors
        (out / 'results.json').write_text(json.dumps(checked, indent=2, ensure_ascii=False))
        print(f'{len(checked)} distinct style photos decoded; {len(sheets)} mobile crop screenshots; no browser errors.')
        browser.close()


if __name__ == '__main__':
    main()
