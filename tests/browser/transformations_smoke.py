"""Mobile transformations: strict filters, actual measurements, persistence and 1:1 PDF.

HILVANA_TRANSFORM_URL=http://127.0.0.1:5173 python tests/browser/transformations_smoke.py
Also works against a compiled Pages preview without importing source modules.
"""
import json
import os
from pathlib import Path

import pymupdf
from playwright.sync_api import sync_playwright

BASE = os.environ.get('HILVANA_TRANSFORM_URL', 'http://127.0.0.1:5173').rstrip('/')
OUT = Path('/tmp/hilvana-transformations-mobile')


def run():
    OUT.mkdir(exist_ok=True)
    with sync_playwright() as p:
        launch = {'executable_path': '/usr/bin/chromium', 'args': ['--no-sandbox']}
        if BASE.startswith('https:') and os.environ.get('HTTPS_PROXY'):
            launch['proxy'] = {'server': os.environ['HTTPS_PROXY']}
        browser = p.chromium.launch(**launch)
        context = browser.new_context(viewport={'width': 390, 'height': 844}, is_mobile=True, has_touch=True, accept_downloads=True, ignore_https_errors=True)
        page = context.new_page()
        errors = []
        page.on('pageerror', lambda error: errors.append(str(error)))
        try:
            page.goto(BASE + '/#/biblioteca', wait_until='networkidle')
            page.get_by_role('button', name='Transformar mi ropa', exact=True).click()
            page.get_by_role('heading', name='Dale otra vida a tu ropa').wait_for()
            assert page.locator('.transform-card').count() == 27
            assert page.evaluate('document.documentElement.scrollWidth <= innerWidth + 1')
            page.screenshot(path=str(OUT / 'listado.png'), full_page=True)
            filters = page.get_by_role('group', name='Prenda que quieres transformar')
            filters.get_by_role('button', name='Pantalones', exact=True).click()
            assert page.locator('.transform-card').count() == 8
            search = page.get_by_role('searchbox', name='Buscar transformaciones')
            search.fill('CAMPANA')
            assert page.locator('.transform-card').count() == 1
            assert page.locator('.transform-card').get_attribute('data-transformation') == 'pantalon-campana-70'
            filters.get_by_role('button', name='Vestidos', exact=True).click()
            assert page.locator('.transform-card').count() == 0
            filters.get_by_role('button', name='Todas', exact=True).click()
            page.locator('.transform-card').click()
            dialog = page.get_by_role('dialog')
            button = dialog.get_by_role('button', name='Generar mi transformación')
            assert button.is_disabled()
            opening = dialog.get_by_label('Largo de cada lado de la abertura', exact=True)
            opening.fill('36,5')
            dialog.get_by_label('Amplitud que añade cada cuña en el bajo', exact=True).fill('22')
            checkbox = dialog.get_by_role('checkbox')
            checkbox.check()
            assert button.is_enabled()
            dialog.locator('summary').filter(has_text='Márgenes y referencias de colocación').click()
            dialog.get_by_label('Tus referencias sobre la prenda', exact=True).fill('Abertura exterior; punta a 36,5 cm del bajo.')
            page.screenshot(path=str(OUT / 'medidas.png'), full_page=True)
            with page.expect_download(timeout=60000) as download:
                button.click()
            pdf_path = OUT / 'campana.pdf'
            download.value.save_as(str(pdf_path))
            document = pymupdf.open(pdf_path)
            manifest = json.loads(document.embfile_get('transformacion.json'))
            assert manifest['params']['abertura'] == 365
            assert manifest['params']['aumento'] == 220
            assert not manifest['includesBaseGarment']
            assert '36,5 cm' in manifest['placement']['note']
            assert all(abs(check['measured'] - check['target']) <= check['tolerance'] for check in manifest['checks'])
            squares, bars = [], []
            for number, pdf_page in enumerate(document):
                for drawing in pdf_page.get_drawings():
                    for item in drawing['items']:
                        if item[0] != 're':
                            continue
                        rect = item[1]
                        width, height = rect.width * 25.4 / 72, rect.height * 25.4 / 72
                        if abs(width - 50) < .01 and abs(height - 50) < .01:
                            squares.append(number + 1)
                        if abs(width - 100) < .01 and abs(height - 1.6) < .01:
                            bars.append(number + 1)
            assert squares and len(bars) > 1
            assert any('/PrintScaling /None' in document.xref_object(i) for i in range(1, document.xref_length()))
            print(f'PASS PDF campana: {len(document)} páginas, medidas365/220mm, controles50/100mm, manifiesto sin base.', flush=True)
            document.close()
            opening.fill('0')
            assert button.is_disabled()
            assert dialog.get_by_role('alert').is_visible()
            opening.fill('')
            checkbox.check()
            assert button.is_disabled()
            opening.fill('36,5')
            assert not checkbox.is_checked()
            dialog.get_by_role('button', name='Cerrar', exact=True).click()
            page.reload(wait_until='networkidle')
            page.get_by_role('heading', name='Dale otra vida a tu ropa').wait_for()
            page.locator('[data-transformation="pantalon-campana-70"]').click()
            dialog = page.get_by_role('dialog')
            assert dialog.get_by_label('Largo de cada lado de la abertura', exact=True).input_value() == '36.5'
            assert not dialog.get_by_role('checkbox').is_checked()
            assert dialog.get_by_role('button', name='Generar mi transformación').is_disabled()
            assert not errors, errors
            print('PASS móvil390px: 27ideas, filtros estrictos, valores decimales, bloqueo inválidos y borrador tras recarga.', flush=True)
        finally:
            browser.close()


if __name__ == '__main__':
    run()
