"""44 disfraces: filtros exactos y construcciones completas hasta el PDF.

Requiere Vite, Python Playwright, Chromium y PyMuPDF. Las acciones se realizan
en la interfaz; /src solo se importa para verificar las piezas resultantes.
"""
import os
import re

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
    page.evaluate('window.costumeNoReload = "same-document"')
    page.get_by_role('group', name='Tipo de proyecto', exact=True).get_by_role('button', name='Disfraces', exact=True).click()
    assert page.locator('.simple-results').get_by_role('status').inner_text() == '44 diseños'
    while page.get_by_role('button', name='Ver más diseños', exact=True).count():
        page.get_by_role('button', name='Ver más diseños', exact=True).click()
    cards = page.locator('.simple-pattern-card')
    assert cards.count() == 44
    ids = cards.evaluate_all('(items)=>items.map(item=>item.dataset.designGroup)')
    assert len(set(ids)) == 44
    page.get_by_role('button', name=re.compile('^Filtros')).click()
    page.locator('#search-family').select_option('alas')
    page.locator('#search-recipient').select_option('mujer')
    page.get_by_role('dialog').get_by_role('button', name='Ver 6 resultados', exact=True).click()
    assert cards.count() == 6
    assert set(cards.evaluate_all('(items)=>items.map(item=>item.dataset.family)')) == {'alas'}
    no_overflow(page)
    page.screenshot(path=f'/tmp/hilvana-costume-wings-{width}.png', full_page=True)

    for model, expected in (('disfraz-tabardo-medieval', 6), ('disfraz-kit-dragon', 15), ('disfraz-alas-hada', 6)):
        page.evaluate('model=>{ location.hash="/biblioteca/"+model; }', model)
        page.get_by_role('button', name='Intervenir', exact=True).click()
        assert page.get_by_text('Ajustar medidas', exact=True).count() == 1
        # A directly specified costume piece does not pretend to have a body size.
        assert not page.locator('#simple-child-size').count()
        page.get_by_role('button', name='Colocar extras', exact=True).click()
        page.wait_for_url('**/#/personalizar/**')
        page.locator('.customize-art [data-assembly-view="armado-frente"]').wait_for()
        assert page.evaluate('window.costumeNoReload') == 'same-document'
        project_id = page.url.rsplit('/', 1)[-1]
        state = project_state(page, project_id)
        assert_pattern(state)
        assert len(state['pieces']) == expected, (model, len(state['pieces']))
        assert state['project']['pattern']['generatorId'] == model.replace('disfraz-', 'cosplay-', 1)
        assert all(piece['cut']['qty'] > 0 for piece in state['pieces'])
        sides = page.get_by_role('group', name='Lado de la prenda', exact=True)
        sides.get_by_role('button', name='Espalda', exact=True).click()
        page.locator('.customize-art [data-assembly-view="armado-espalda"]').wait_for()
        assert page.locator('[data-assembly-surface]').count() > 0
        sides.get_by_role('button', name='Frente', exact=True).click()
        no_overflow(page)
        page.locator('.customize-art').scroll_into_view_if_needed()
        page.screenshot(path=f'/tmp/hilvana-{model}-{width}.png')
        page.get_by_role('button', name='Elegir telas', exact=True).click()
        page.get_by_role('heading', name='Telas y colores', exact=True).wait_for()
        page.get_by_role('button', name='Elegir tela o color', exact=True).click()
        page.get_by_role('button', name='Color #24584A', exact=True).click()
        page.get_by_role('button', name='Continuar a bordados', exact=True).click()
        page.get_by_role('button', name='Generar patrones', exact=True).click()
        button = page.get_by_role('button', name='Descargar PDF completo', exact=True)
        button.wait_for()
        assert button.is_enabled()
        with page.expect_download(timeout=90000) as pending:
            button.click()
        path = f'/tmp/hilvana-{model}-{width}.pdf'
        pending.value.save_as(path)
        verify_pdf(path, state['pieces'])
        assert page.evaluate('window.costumeNoReload') == 'same-document'
        no_overflow(page)
    assert not errors, errors
    print(f'Disfraces {width}px: 44 diseños; filtro exacto 6 alas; tabardo/kit dragón/alas hada sin recarga; telas y 3 PDF PASS')
    context.close()


if __name__ == '__main__':
    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(executable_path='/usr/bin/chromium', args=['--no-sandbox'])
        for width in (390, 1440):
            run(browser, width)
        browser.close()
