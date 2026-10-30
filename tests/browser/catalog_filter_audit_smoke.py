"""Filtros estrictos, entrada bebé y separación de fuentes en la biblioteca.

Requiere Vite, Python Playwright y Chromium. Recorre por UI cada tipo exacto
con patrón y contrasta sus tarjetas con la taxonomía del catálogo completo.
"""
import os
import re
from playwright.sync_api import sync_playwright
from simple_journey_smoke import no_overflow

BASE = os.environ.get('HILVANA_TEST_URL', 'http://localhost:5173').rstrip('/')


def search(page, query):
    page.get_by_role('searchbox', name='Buscar prendas y accesorios', exact=True).fill(query)
    page.wait_for_timeout(50)
    return page.locator('.simple-pattern-card')


def open_filters(page):
    page.get_by_role('button', name=re.compile('^Filtros')).click()
    return page.get_by_role('dialog', name='Encuentra tu base', exact=True)


def close_filters(dialog):
    dialog.get_by_role('button', name=re.compile(r'^Ver .+ resultados$')).click()


def run_layout(browser, width):
    context = browser.new_context(viewport={'width': width, 'height': 844 if width < 600 else 1000},
                                  has_touch=width < 600, is_mobile=width < 600)
    page = context.new_page()
    errors = []
    page.on('pageerror', lambda error: errors.append(str(error)))
    page.goto(BASE)
    page.wait_for_load_state('networkidle')
    native = page.get_by_role('button', name='Patrones editables', exact=True)
    assert native.get_attribute('aria-pressed') == 'true'
    baby = page.get_by_role('group', name='Tipo de proyecto', exact=True).get_by_role('button', name='Bebé', exact=True)
    box = baby.bounding_box()
    assert box and box['y'] + box['height'] < page.viewport_size['height'], box
    for query in ('hoodie', 'hoddies', 'hoodies'):
        cards = search(page, query)
        assert cards.count() > 0, query
        assert all(value == 'hoodie' for value in cards.evaluate_all('(cards)=>cards.map(card=>card.dataset.family)')), cards.all_text_contents()
        assert page.locator('[data-curated-pattern]').count() == 0
        assert page.locator('#free-patterns-title').count() == 0
        no_overflow(page)
    page.screenshot(path=f'/tmp/hilvana-audited-hoodie-{width}.png')
    for query, expected_group in [('servilleta', 'tipo-textil-servilleta'), ('banda', 'tipo-banda-cabello'), ('monedero', 'tipo-estuche-cierre')]:
        cards = search(page, query)
        assert cards.count() == 1, (query, cards.all_text_contents())
        assert cards.first.get_attribute('data-design-group') == expected_group, query

    # The dedicated baby entry clears adult/search constraints explicitly and
    # exposes all compatible constructions, with months carried in every link.
    baby.click()
    assert search(page, '').count() > 0
    assert page.locator('#baby-simple').is_visible()
    page.locator('#baby-simple').select_option('B0-6')
    page.get_by_role('group', name='Tipo de proyecto', exact=True).get_by_role('button', name='Accesorios', exact=True).click()
    assert set(page.locator('.simple-pattern-card').evaluate_all('(cards)=>cards.map(card=>card.dataset.family)')) == {'babero', 'gorro'}
    baby.click()
    assert page.locator('#baby-simple').input_value() == 'B0-6'
    cards = page.locator('.simple-pattern-card')
    assert cards.count() == 7, cards.all_text_contents()
    assert page.locator('.simple-pattern-card[data-design-group="body-bebe"]').count() == 1
    assert all('para=bebe&talla=B0-6' in href for href in cards.evaluate_all('(cards)=>cards.map(card=>card.getAttribute("href"))'))
    models = page.evaluate('''async()=>{
      const {findModel}=await import('/src/data/catalog.ts');
      return [...document.querySelectorAll('.simple-pattern-card')].map(card=>findModel(card.getAttribute('href').split('/').pop().split('?')[0]));
    }''')
    assert models and all('bebe' in model['recipients'] for model in models)
    page.screenshot(path=f'/tmp/hilvana-audited-baby-{width}.png', full_page=True)
    no_overflow(page)
    page.locator('.simple-pattern-card[data-design-group="body-bebe"]').click()
    page.get_by_role('button', name='Intervenir', exact=True).click()
    # A recipient already chosen in the library is fixed, so its selector is omitted.
    assert page.locator('#simple-child-size').input_value() == 'B0-6'
    page.get_by_role('dialog').get_by_role('button', name='Cerrar', exact=True).click()
    page.goto(BASE + '/#/biblioteca')
    page.get_by_role('button', name='Quitar filtros', exact=True).click()

    # Every active constraint can be seen and removed; a no-result query does
    # not silently reset filters or leak other kinds of garments.
    query = 'zzzzsinmodelo'
    assert search(page, query).count() == 0
    assert page.get_by_text('No hay diseños con estos filtros', exact=True).is_visible()
    page.get_by_role('button', name=f'Quitar filtro “{query}”', exact=True).click()
    assert page.locator('.simple-pattern-card').count() > 0
    search(page, 'hoodie')
    dialog = open_filters(page)
    page.locator('#search-recipient').select_option('mujer')
    page.locator('#search-family').select_option('hoodie')
    page.locator('#search-fabric').select_option('punto')
    page.locator('#search-fit').select_option('oversize')
    dialog.get_by_text('Más filtros', exact=True).click()
    assert page.locator('#search-difficulty').is_visible()
    assert page.locator('#search-stretch').is_visible()
    assert page.locator('#search-technique').is_visible()
    close_filters(dialog)
    cards = page.locator('.simple-pattern-card')
    assert cards.count() > 0
    assert all(value == 'hoodie' for value in cards.evaluate_all('(cards)=>cards.map(card=>card.dataset.family)'))
    before = cards.evaluate_all('(cards)=>cards.map(card=>card.getAttribute("href"))')
    page.reload(); page.wait_for_load_state('networkidle')
    assert page.locator('.simple-pattern-card').evaluate_all('(cards)=>cards.map(card=>card.getAttribute("href"))') == before
    assert page.get_by_role('group', name='Filtros activos', exact=True).get_by_role('button').count() >= 5

    # External patterns use their own search and never remain mounted below
    # native results, even when switching sections or reloading.
    page.get_by_role('button', name='Gratis de internet', exact=True).click()
    page.locator('#free-patterns-title').wait_for()
    assert page.locator('.simple-pattern-card').count() == 0
    assert page.get_by_role('searchbox', name='Buscar prendas y accesorios', exact=True).count() == 0
    first_external = page.locator('.free-pattern-card').first.bounding_box()
    assert first_external and first_external['y'] < page.viewport_size['height'] - 60, first_external
    no_overflow(page)
    page.reload(); page.wait_for_load_state('networkidle')
    assert page.get_by_role('button', name='Gratis de internet', exact=True).get_attribute('aria-pressed') == 'true'
    native.click()
    assert page.locator('.simple-pattern-card').evaluate_all('(cards)=>cards.map(card=>card.getAttribute("href"))') == before
    assert page.locator('#free-patterns-title').count() == 0
    no_overflow(page)
    assert not errors, errors
    print(f'Biblioteca {width}px: hoodie estricto, bebé visible y meses, filtros activos/persistencia, búsquedas sin resultados y fuentes separadas PASS')
    context.close()


def run_every_family(browser):
    context = browser.new_context(viewport={'width': 1440, 'height': 1000})
    page = context.new_page()
    page.goto(BASE); page.wait_for_load_state('networkidle')
    expected = page.evaluate('''async()=>{
      const {CATALOG}=await import('/src/data/catalog.ts');
      const {familyOf}=await import('/src/data/catalogTaxonomy.ts');
      const {modelHasPattern}=await import('/src/features/library/filters.ts');
      const values={};
      for (const model of CATALOG.filter(modelHasPattern)) {
        const key=familyOf(model); values[key]??=new Set(); values[key].add(model.designGroup?.id??model.id);
      }
      return Object.fromEntries(Object.entries(values).map(([key,ids])=>[key,[...ids]]));
    }''')
    dialog = open_filters(page)
    for family, groups in expected.items():
        dialog.get_by_role('button', name='Restablecer filtros', exact=True).click()
        page.locator('#search-family').select_option(family)
        cards = page.locator('.simple-pattern-card')
        assert cards.count() > 0, family
        assert all(value == family for value in cards.evaluate_all('(cards)=>cards.map(card=>card.dataset.family)')), family
        count = len(groups)
        assert dialog.get_by_role('button', name=f'Ver {count} resultados', exact=True).count() == 1, (family, count)
    close_filters(dialog)
    no_overflow(page)
    print(f'Todos los tipos exactos con patrón: {len(expected)} familias recorridas por UI, tarjetas y cuenta agrupada verificadas PASS')
    context.close()


if __name__ == '__main__':
    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(executable_path='/usr/bin/chromium', args=['--no-sandbox'])
        try:
            for width in (320, 390, 1440):
                run_layout(browser, width)
            run_every_family(browser)
        finally:
            browser.close()
