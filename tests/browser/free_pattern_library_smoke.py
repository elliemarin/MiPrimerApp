"""Biblioteca gratuita: filtros reales, PDF separados y copias autorizadas.

Funciona contra Vite o GitHub Pages: no importa módulos /src en el navegador.
Requiere Python Playwright, Chromium y PyMuPDF.
"""
import os
import json
from urllib.parse import urljoin
from urllib.request import urlopen
import fitz
from playwright.sync_api import sync_playwright

BASE = os.environ.get('HILVANA_TEST_URL', 'http://localhost:5173/').rstrip('/') + '/'


def public_file(context, url):
    # urllib honors the cloud runner's inherited HTTPS_PROXY and CA trust;
    # Playwright's separate API client does not inherit that proxy automatically.
    if os.environ.get('HTTPS_PROXY') and url.startswith('https://'):
        with urlopen(url, timeout=60) as response:
            assert response.status == 200
            return response.read()
    response = context.request.get(url)
    assert response.ok
    return response.body()


def no_overflow(page):
    assert page.evaluate('document.documentElement.scrollWidth <= innerWidth + 1')


def run(browser, width):
    context = browser.new_context(viewport={'width': width, 'height': 844 if width < 600 else 1000}, has_touch=width < 600, is_mobile=width < 600)
    page = context.new_page()
    errors = []
    page.on('pageerror', lambda error: errors.append(str(error)))
    page.goto(BASE)
    page.get_by_role('button', name='Gratis de internet', exact=True).click()
    panel = page.locator('.free-pattern-library')
    panel.locator('#free-patterns-title').wait_for()
    records = json.loads(public_file(context, urljoin(BASE, 'pattern-library/free-patterns.json')))
    assert len(records) >= 200, len(records)
    assert len({entry['id'] for entry in records}) == len(records)
    assert page.locator('.simple-pattern-card').count() == 0
    assert panel.get_by_role('status').inner_text() == f'{len(records)} patrones gratuitos'
    no_overflow(page)
    page.screenshot(path=f'/tmp/hilvana-free-library-{width}.png')

    # Language + category + download requirements combine, not union.
    panel.locator('#free-pattern-language').select_option('es')
    panel.locator('.free-pattern-more > summary').click()
    panel.locator('#free-pattern-access').select_option('directo')
    panel.get_by_role('group', name='Categorías gratuitas').get_by_role('button', name='Accesorios', exact=True).click()
    expected = [entry for entry in records if entry['language'] == 'es' and 'accesorios' in entry['categories'] and entry['access'] == 'directo' and entry['patternKind'] == 'pdf']
    assert expected, 'Need real Spanish accessory sources'
    assert panel.get_by_role('status').inner_text() == f'{len(expected)} patrones gratuitos'
    visible = panel.locator('[data-free-pattern]').evaluate_all('(cards)=>cards.map(c=>c.dataset.freePattern)')
    assert set(visible).issubset({entry['id'] for entry in expected})
    page.reload()
    assert page.locator('#free-pattern-language').input_value() == 'es'
    assert page.locator('#free-pattern-access').input_value() == 'directo'
    panel.get_by_role('button', name='Quitar filtros', exact=True).click()

    # Known uploaded example: identifies both original documents honestly.
    query = panel.get_by_role('searchbox', name='Buscar patrones gratuitos', exact=True)
    query.fill('hada del bosque')
    fairy = panel.locator('[data-free-pattern]')
    assert fairy.count() == 1, fairy.all_text_contents()
    fairy.get_by_text('Ficha y fuente original', exact=True).click()
    assert 'seis hojas de patrón' in fairy.inner_text()
    assert 'cinco páginas de instrucciones' in fairy.inner_text()
    assert fairy.get_by_role('link', name='Obtener patrón gratis', exact=True).get_attribute('href').startswith('https://www.pompomdumonde.com/')
    assert fairy.get_by_role('link', name='Ver instrucciones', exact=True).get_attribute('href').startswith('https://www.pompomdumonde.com/')
    assert 'Pedido gratuito' in fairy.inner_text()
    page.screenshot(path=f'/tmp/hilvana-fairy-source-{width}.png', full_page=True)
    no_overflow(page)
    query.fill('zzzzsinpatron')
    assert panel.locator('[data-free-pattern]').count() == 0
    assert panel.get_by_text('No hay patrones con esos filtros', exact=True).is_visible()
    panel.get_by_role('button', name='Ver todos los gratuitos', exact=True).click()

    # A downloadable PDF copy actually exists at the correct base-path URL.
    if not panel.locator('#free-pattern-access').is_visible():
        panel.locator('.free-pattern-more > summary').click()
    panel.locator('#free-pattern-access').select_option('local')
    local = [entry for entry in records if entry.get('assets', {}).get('pattern')]
    assert len(local) >= 1
    assert panel.locator('[data-free-pattern]').count() == min(18, len(local))
    for entry in local:
        card = panel.locator(f'[data-free-pattern="{entry["id"]}"]')
        assert card.count() == 1
        link = card.get_by_role('link', name='Abrir patrón PDF', exact=True)
        assert link.get_attribute('href').endswith(entry['assets']['pattern'])
    first = min(local, key=lambda entry: entry['verification'].get('pdfPages', 1))
    link = panel.locator(f'[data-free-pattern="{first["id"]}"]').get_by_role('link', name='Abrir patrón PDF', exact=True)
    data = public_file(context, urljoin(BASE, link.get_attribute('href')))
    assert data.startswith(b'%PDF')
    document = fitz.open(stream=data, filetype='pdf')
    assert len(document) == first['verification']['pdfPages']
    no_overflow(page)
    page.screenshot(path=f'/tmp/hilvana-local-patterns-{width}.png')
    assert not errors, errors
    print(f'Gratis {width}px PASS: {len(records)} fuentes, filtros combinados/persistencia, hada dos documentos, {len(local)} copias locales, PDF real {len(document)} páginas')
    context.close()


if __name__ == '__main__':
    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(executable_path='/usr/bin/chromium', args=['--no-sandbox'])
        for width in (320, 390, 1440):
            run(browser, width)
        browser.close()
