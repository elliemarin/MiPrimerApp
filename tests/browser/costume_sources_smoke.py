"""Disfraces con patrones reales y fuentes con muestras del autor.

Requiere Vite, Python Playwright, Chromium y PyMuPDF. Previsualizar fichas no
guarda proyectos. Solo los botones de creación inician el recorrido de costura.
"""
import os
import re
from urllib.parse import urlparse

from playwright.sync_api import sync_playwright
from simple_journey_smoke import assert_pattern, no_overflow, project_state, verify_pdf


BASE = os.environ.get('HILVANA_TEST_URL', 'http://localhost:5173').rstrip('/')
GENERATORS = {'capa-semicircular', 'corona-textil', 'sombrero-mago', 'orejas-diadema'}


def storage_snapshot(page):
    return page.evaluate('''async()=>{
      const {useApp}=await import('/src/store/app.ts');
      const state=useApp.getState();
      return JSON.stringify({projects:state.projects,profiles:state.profiles});
    }''')


def costumes(page):
    page.get_by_role('searchbox', name='Buscar prendas y accesorios', exact=True).fill('')
    page.get_by_role('group', name='Tipo de proyecto', exact=True).get_by_role('button', name='Disfraces', exact=True).click()
    page.wait_for_function("document.querySelectorAll('.simple-pattern-card').length===4")
    return page.evaluate('''async()=>{
      const {findModel}=await import('/src/data/catalog.ts');
      return [...document.querySelectorAll('.simple-pattern-card')].map(a=>{
        const id=a.getAttribute('href').split('/').pop().split('?')[0];
        const model=findModel(id);return {id,generatorId:model.generatorId,group:a.dataset.designGroup,params:model.params};
      });
    }''')


def native_details(page, model_id):
    page.goto(BASE + '/#/biblioteca/' + model_id)
    page.get_by_role('button', name='Intervenir', exact=True).wait_for()
    before = storage_snapshot(page)
    page.get_by_text('Qué incluye el patrón', exact=True).click()
    details = page.locator('.native-pattern-details')
    details.get_by_role('heading', name='Piezas de corte', exact=True).wait_for()
    assert details.get_by_role('heading', name='Telas y materiales', exact=True).count() == 1
    assert details.get_by_role('heading', name='Cómo se confecciona', exact=True).count() == 1
    assert details.locator('.native-pattern-steps li').count() >= 3
    assert 'Prueba de confección pendiente' in details.inner_text()
    assert 'Geometría comprobada para esta referencia' in details.inner_text()
    assert storage_snapshot(page) == before, 'Previsualizar no debe guardar perfiles o proyectos'
    page.get_by_text('Medidas y márgenes de esta referencia', exact=True).click()
    assert details.locator('.native-pattern-measures dd').count() > 0
    no_overflow(page)
    return details


def check_sources(page, width):
    page.goto(BASE + '/#/biblioteca')
    page.get_by_role('button', name='Patrones editables', exact=True).click()
    before = storage_snapshot(page)
    page.get_by_role('button', name='Ver patrones de internet', exact=True).click()
    page.wait_for_function("document.activeElement?.id==='free-patterns-title'")
    page.wait_for_function("(()=>{const r=document.getElementById('free-patterns-title')?.getBoundingClientRect();return r&&r.top>=0&&r.top<innerHeight;})()")
    panel = page.locator('.free-pattern-library')
    assert page.locator('.simple-pattern-card').count() == 0, 'Las fuentes no se mezclan con resultados editables'
    sample_filter = panel.get_by_role('checkbox', name='Solo con ficha de muestra confeccionada', exact=True)
    if not sample_filter.is_visible():
        panel.get_by_text(re.compile('^Más filtros')).click()
    sample_filter.check()
    group = panel.get_by_role('group', name='Categorías gratuitas', exact=True)
    group.get_by_role('button', name='Disfraces', exact=True).click()
    cards = panel.locator('[data-free-pattern]')
    assert cards.count() >= 2
    assert all('Disfraces' in text for text in cards.locator('.free-pattern-meta').all_text_contents())
    assert cards.get_by_text('Muestra del autor', exact=True).count() == cards.count()
    first = cards.first
    first.get_by_text('Ficha y fuente original', exact=True).click()
    for heading in ('Medidas y tallas', 'Materiales', 'Piezas', 'Proceso'):
        assert first.get_by_role('heading', name=heading, exact=True).is_visible(), heading
    assert 'Hilvana no ha cosido esta muestra' in first.inner_text()
    assert not re.search(r'100\s*%', panel.inner_text())
    assert first.locator('ol li').count() > 0
    assert first.locator('.free-pattern-links a').count() == 2, 'Patrón y guía tienen accesos separados'
    links = panel.locator('a').evaluate_all('(links)=>links.map(a=>({href:a.href,target:a.target,rel:a.rel}))')
    assert links
    for link in links:
        parsed = urlparse(link['href'])
        local = link['href'].startswith(BASE + '/')
        assert (parsed.scheme == 'https' or local) and parsed.hostname, link
        assert link['target'] == '_blank' and 'noopener' in link['rel'] and 'noreferrer' in link['rel'], link
    assert len(page.context.pages) == 1, 'Consultar fichas no abre destinos automáticamente'
    assert storage_snapshot(page) == before
    no_overflow(page)
    page.screenshot(path=f'/tmp/hilvana-costume-sources-{width}.png')

    # Search combines with category without creating or importing source files.
    query = panel.get_by_role('searchbox', name='Buscar patrones gratuitos', exact=True)
    query.fill('zzzxsinresultados')
    assert panel.get_by_text('No hay patrones con esos filtros', exact=True).is_visible()
    panel.get_by_role('button', name='Ver todos los gratuitos', exact=True).click()
    assert panel.locator('[data-free-pattern]').count() > 0
    assert query.input_value() == ''
    assert storage_snapshot(page) == before


def run_layout(browser, width):
    context = browser.new_context(viewport={'width': width, 'height': 844 if width < 500 else 1000},
                                  has_touch=width < 500, is_mobile=width < 500)
    page = context.new_page()
    errors = []
    page.on('pageerror', lambda error: errors.append(str(error)))
    page.goto(BASE)
    page.wait_for_load_state('networkidle')
    cards = costumes(page)
    assert {card['generatorId'] for card in cards} == GENERATORS, cards
    assert len({card['group'] for card in cards}) == 4
    search = page.get_by_role('searchbox', name='Buscar prendas y accesorios', exact=True)
    search.fill('corona')
    page.wait_for_function("document.querySelectorAll('.simple-pattern-card').length===1")
    assert 'Corona' in page.locator('.simple-pattern-caption strong').inner_text()
    search.fill('')
    page.wait_for_function("document.querySelectorAll('.simple-pattern-card').length===4")
    page.get_by_role('button', name=re.compile('^Filtros')).click()
    page.locator('#search-recipient').select_option('mujer')
    assert page.locator('#search-collection').input_value() == 'Disfraces'
    page.get_by_role('dialog').get_by_role('button', name=re.compile(r'^Ver .+ resultados$')).click()
    assert page.locator('.simple-pattern-card').count() == 4
    no_overflow(page)
    page.screenshot(path=f'/tmp/hilvana-costume-catalog-{width}.png', full_page=True)
    for card in cards:
        native_details(page, card['id'])
    check_sources(page, width)
    assert not errors, errors
    print(f'Disfraces/fuentes {width}px: cuatro diseños, fichas con piezas/materiales/pasos sin guardar, acceso directo, filtros y enlaces seguros PASS')
    context.close()


def run_pdf(browser, generator_id):
    context = browser.new_context(viewport={'width': 390, 'height': 844}, has_touch=True, is_mobile=True, accept_downloads=True)
    page = context.new_page()
    errors = []
    page.on('pageerror', lambda error: errors.append(str(error)))
    page.goto(BASE)
    page.wait_for_load_state('networkidle')
    source = next(card for card in costumes(page) if card['generatorId'] == generator_id)
    page.goto(BASE + '/#/biblioteca/' + source['id'])
    page.get_by_role('button', name='Intervenir', exact=True).click()
    # Select an actual shorter/smaller recipe before entering the studio.
    select = page.locator('#variant-largo' if generator_id == 'capa-semicircular' else '#variant-contornoCabeza')
    if not select.is_visible():
        page.get_by_text('Más medidas y acabados', exact=True).click()
    options = select.locator('option').evaluate_all('(items)=>items.map(o=>({value:o.value,label:o.textContent}))')
    option = next(option for option in options if re.match(r'^\d+', option['value']))
    select.select_option(option['value'])
    chosen_key = 'largo' if generator_id == 'capa-semicircular' else 'contornoCabeza'
    chosen = float(option['value'])
    page.get_by_role('button', name='Colocar extras', exact=True).click()
    page.wait_for_url('**/#/personalizar/**')
    project_id = page.url.rsplit('/', 1)[-1]
    state = project_state(page, project_id)
    assert_pattern(state)
    assert state['project']['pattern']['generatorId'] == generator_id
    assert state['project']['pattern']['params'][chosen_key] == chosen
    page.get_by_role('button', name='Elegir telas y bordados', exact=True).click()
    page.wait_for_url('**/#/acabados/**')
    page.locator('.finish-material-list>button').first.click()
    page.get_by_text('Usar el mismo material en todo', exact=True).click()
    page.get_by_role('button', name='Todas las partes #24584A', exact=True).click()
    page.get_by_role('button', name='Continuar a bordados', exact=True).click()
    assert page.get_by_role('button', name='Añadir bordado o letras', exact=True).is_visible()
    page.get_by_role('button', name='Generar patrones', exact=True).click()
    page.wait_for_url('**/#/confeccion/**')
    download = page.get_by_role('button', name='Descargar PDF completo', exact=True)
    download.wait_for(state='visible')
    assert download.is_enabled(), page.get_by_role('dialog').inner_text()
    with page.expect_download(timeout=90000) as pending:
        download.click()
    path = '/tmp/hilvana-costume-' + generator_id + '.pdf'
    pending.value.save_as(path)
    manifest = verify_pdf(path, state['pieces'])
    assert len(manifest['pieces']) == (2 if generator_id == 'capa-semicircular' else 6), manifest['pieces']
    assert not errors, errors
    no_overflow(page)
    print(f'{generator_id}: medida elegida→extras→materiales/bordados→PDF real y controles50/100mm PASS')
    context.close()


if __name__ == '__main__':
    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(executable_path='/usr/bin/chromium', args=['--no-sandbox'])
        try:
            for width in (320, 390, 1440):
                run_layout(browser, width)
            for generator_id in ('capa-semicircular', 'sombrero-mago'):
                run_pdf(browser, generator_id)
        finally:
            browser.close()
