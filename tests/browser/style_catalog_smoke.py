"""Catálogo por estilos y tres recorridos completos en build local o Pages.

HILVANA_PRODUCTION_URL=http://127.0.0.1:4176/MiPrimerApp/ python tests/browser/style_catalog_smoke.py
No importa módulos /src ni modifica proyectos del usuario.
"""
import json
import os
import re
import time
import pymupdf
from playwright.sync_api import sync_playwright
from production_kids_handoff_smoke import READ_DB, saved

BASE = os.environ.get('HILVANA_PRODUCTION_URL', 'http://127.0.0.1:4176/MiPrimerApp/').rstrip('/')


def no_overflow(page):
    assert page.evaluate('document.documentElement.scrollWidth <= innerWidth + 1')


def result_count(page):
    return int(re.search(r'\d+', page.locator('.simple-results [role="status"]').inner_text())[0])


def download_pattern(page, model_id):
    with page.expect_download(timeout=90000) as download:
        page.get_by_role('button', name='Descargar PDF completo', exact=True).click()
    path = f'/tmp/hilvana-style-{model_id}.pdf'
    download.value.save_as(path)
    pdf = pymupdf.open(path)
    manifest = json.loads(pdf.embfile_get('confeccion.json'))
    assert manifest['pieces']
    pattern = next(section for section in manifest['sections'] if section['id'] == 'patron')
    widths = [round(d['rect'].width * 25.4 / 72, 3) for d in pdf[pattern['startPage'] - 1].get_drawings() if d.get('fill') is not None]
    assert widths[:2] == [50.0, 100.0], widths
    assert any('/PrintScaling /None' in pdf.xref_object(i) for i in range(1, pdf.xref_length()))
    return {'id': model_id, 'pages': len(pdf), 'pieces': len(manifest['pieces'])}


def run():
    with sync_playwright() as p:
        launch = {'executable_path': '/usr/bin/chromium', 'args': ['--no-sandbox']}
        if BASE.startswith('https:') and os.environ.get('HTTPS_PROXY'):
            launch['proxy'] = {'server': os.environ['HTTPS_PROXY']}
        browser = p.chromium.launch(**launch)
        context = browser.new_context(viewport={'width': 390, 'height': 844}, is_mobile=True, has_touch=True, accept_downloads=True, ignore_https_errors=True)
        context.add_init_script(READ_DB)
        page = context.new_page()
        errors, missing = [], []
        page.on('pageerror', lambda error: errors.append(str(error)))
        page.on('response', lambda response: missing.append(response.url) if response.status >= 400 and '/catalog-images/' in response.url else None)
        try:
            page.goto(BASE + '/#/biblioteca', wait_until='networkidle')
            page.locator('#library-recipient').select_option('mujer')
            page.get_by_role('button', name='Hoodies', exact=True).click()
            assert result_count(page) >= 13
            assert all(value == 'hoodie' for value in page.locator('.simple-pattern-card').evaluate_all('(cards)=>cards.map(c=>c.dataset.family)'))
            page.wait_for_function('document.querySelector(".catalog-photo-atlas")?.naturalWidth > 0')
            no_overflow(page)
            page.screenshot(path='/tmp/hilvana-styles-hoodies-mobile.png', full_page=True)
            page.get_by_role('button', name='Vestidos', exact=True).click()
            assert result_count(page) >= 27
            page.get_by_role('button', name='Ver más diseños', exact=True).click()
            assert page.locator('.simple-pattern-card').count() >= 27
            assert all(value == 'vestido' for value in page.locator('.simple-pattern-card').evaluate_all('(cards)=>cards.map(c=>c.dataset.family)'))
            page.get_by_role('button', name='Bebé', exact=True).click()
            assert result_count(page) >= 70
            assert page.locator('.simple-pattern-card[href*="bebe-body-"]').count() >= 4
            no_overflow(page)
            page.screenshot(path='/tmp/hilvana-styles-baby-mobile.png', full_page=True)

            results = []
            for model_id in ['street-hoodie-cierre', 'vestido-adulto-trapecio-redondo', 'bebe-body-canesu']:
                page.goto(BASE + '/#/biblioteca/' + model_id, wait_until='networkidle')
                page.get_by_role('button', name='Intervenir', exact=True).click()
                if model_id.startswith('bebe-'):
                    page.locator('#simple-child-size').select_option('B6-9')
                else:
                    page.get_by_role('button', name='Grande', exact=True).click()
                page.get_by_role('button', name='Colocar extras', exact=True).click()
                page.wait_for_url('**/#/personalizar/**')
                project_id = page.url.rsplit('/', 1)[-1]
                page.locator('[data-assembly-view="armado-frente"]').wait_for()
                assert page.locator('[data-assembly-surface]').count() > 0
                page.get_by_role('button', name='Elegir telas', exact=True).click()
                page.get_by_role('button', name='Elegir tela o color', exact=True).click()
                page.get_by_role('button', name='Color #24584A', exact=True).click()
                page.get_by_role('button', name='Continuar a bordados', exact=True).click()
                page.get_by_role('group', name='Vista del diseño', exact=True).get_by_role('button', name='Espalda', exact=True).click()
                assert page.locator('[data-assembly-surface]').count() > 0
                no_overflow(page)
                deadline = time.monotonic() + 15
                project = saved(page, project_id)
                while not project.get('design', {}).get('materialChoices') and time.monotonic() < deadline:
                    page.wait_for_timeout(100)
                    project = saved(page, project_id)
                assert project['modelId'] == model_id
                assert project['design']['materialChoices']
                page.screenshot(path=f'/tmp/hilvana-style-{model_id}-mobile.png', full_page=True)
                page.get_by_role('button', name='Generar patrones', exact=True).click()
                results.append(download_pattern(page, model_id))
            assert not errors, errors
            assert not missing, missing
            print(json.dumps({'catalog': 'ok', 'journeys': results, 'errors': errors}, ensure_ascii=False))
        finally:
            browser.close()


if __name__ == '__main__':
    run()
