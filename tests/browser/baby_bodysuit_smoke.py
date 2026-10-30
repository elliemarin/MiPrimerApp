"""Pañalero: un diseño, meses/mangas, intervención inmediata y PDF 1:1.

Requiere Vite de desarrollo, Python Playwright, Chromium y PyMuPDF.
Los imports /src solo inspeccionan el proyecto tras los clics de la interfaz.
"""
import os

from playwright.sync_api import sync_playwright
from simple_journey_smoke import assert_pattern, no_overflow, project_state, verify_pdf

BASE = os.environ.get('HILVANA_TEST_URL', 'http://localhost:5173').rstrip('/')


def run(browser, width):
    context = browser.new_context(viewport={'width': width, 'height': 844 if width < 500 else 1000},
                                  has_touch=width < 500, is_mobile=width < 500, accept_downloads=True)
    page = context.new_page()
    errors = []
    page.on('pageerror', lambda error: errors.append(str(error)))
    page.goto(BASE)
    page.get_by_role('searchbox', name='Buscar prendas y accesorios', exact=True).wait_for()
    page.evaluate('window.babyNoReload = "same-document"')
    page.get_by_role('button', name='Bebé', exact=True).click()
    page.get_by_role('searchbox', name='Buscar prendas y accesorios', exact=True).fill('pañalero')
    cards = page.locator('.simple-pattern-card')
    assert cards.count() == 1, cards.all_text_contents()
    assert cards.first.get_attribute('data-design-group') == 'body-bebe'
    page.locator('#baby-simple').select_option('B0-6')
    cards.first.click()
    page.get_by_role('button', name='Intervenir', exact=True).click()
    assert page.locator('#simple-child-size').input_value() == 'B0-6'
    options = page.locator('#variant-tipoManga option').all_text_contents()
    assert set(options) == {'Manga corta', 'Manga larga'}, options

    for index, (size, sleeve) in enumerate((('B0-6', 'Manga corta'), ('B0-3', 'Manga corta'), ('B0-3', 'Manga larga'), ('B0-6', 'Manga larga'))):
        if index:
            page.evaluate('location.hash = "/biblioteca/body-bebe"')
            page.get_by_role('button', name='Intervenir', exact=True).click()
        page.locator('#simple-child-size').select_option(size)
        page.locator('#variant-tipoManga').select_option(label=sleeve)
        page.get_by_role('button', name='Colocar extras', exact=True).click()
        page.wait_for_url('**/#/personalizar/**')
        page.locator('.customize-art [data-assembly-view="armado-frente"]').wait_for()
        assert page.evaluate('window.babyNoReload') == 'same-document'
        project_id = page.url.rsplit('/', 1)[-1]
        state = project_state(page, project_id)
        assert_pattern(state)
        assert len(state['pieces']) == 9
        pattern = state['project']['pattern']
        assert pattern['generatorId'] == 'body-bebe-broches'
        assert pattern['context']['kind'] == 'bebe'
        assert pattern['body']['estatura'] == (620 if size == 'B0-3' else 680)
        assert pattern['params']['tipoManga'] == ('corta' if sleeve == 'Manga corta' else 'larga')
        sides = page.get_by_role('group', name='Lado de la prenda', exact=True)
        sides.get_by_role('button', name='Espalda', exact=True).click()
        page.locator('.customize-art [data-assembly-view="armado-espalda"]').wait_for()
        sides.get_by_role('button', name='Frente', exact=True).click()
        assert page.locator('[data-assembly-surface]').count() >= 4
        assert not page.get_by_text('Elige una base para colocar sus extras.', exact=True).count()
        no_overflow(page)
    page.locator('.customize-art').scroll_into_view_if_needed()
    page.screenshot(path=f'/tmp/hilvana-baby-intervene-{width}.png')

    page.get_by_role('button', name='Elegir telas', exact=True).click()
    page.get_by_role('heading', name='Telas y colores', exact=True).wait_for()
    page.get_by_role('button', name='Elegir tela o color', exact=True).click()
    page.get_by_role('button', name='Color #24584A', exact=True).click()
    page.get_by_role('button', name='Continuar a bordados', exact=True).click()
    page.get_by_role('button', name='Generar patrones', exact=True).click()
    button = page.get_by_role('button', name='Descargar PDF completo', exact=True)
    button.wait_for()
    assert button.is_enabled()
    with page.expect_download(timeout=60000) as download:
        button.click()
    path = f'/tmp/hilvana-baby-{width}.pdf'
    download.value.save_as(path)
    verify_pdf(path, state['pieces'])
    assert not errors, errors
    print(f'Pañalero {width}px: un diseño; 0–3/0–6 y manga corta/larga; intervención sin recarga; frente/espalda; telas y PDF PASS')
    context.close()


if __name__ == '__main__':
    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(executable_path='/usr/bin/chromium', args=['--no-sandbox'])
        for width in (390, 1440):
            run(browser, width)
        browser.close()
