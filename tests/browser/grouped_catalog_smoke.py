"""Catálogo por diseños: medidas dentro, recetas reales y filtros conservados.

Requiere Vite, Python Playwright y Chromium. La interacción es por UI; los
imports /src sólo inspeccionan la receta y sus piezas después de crearla.
El selector de tela/foto se verifica en material_picker_smoke.py.
"""
import os
import re

from playwright.sync_api import sync_playwright
from simple_journey_smoke import assert_pattern, card_models, no_overflow, project_state


BASE = os.environ.get('HILVANA_TEST_URL', 'http://localhost:5173').rstrip('/')


def search(page, text):
    control = page.get_by_role('searchbox', name='Buscar prendas y accesorios', exact=True)
    control.fill(text)
    page.wait_for_timeout(100)
    return page.locator('.simple-pattern-card')


def choose_axis(page, key, centimetres):
    select = page.locator('#variant-' + key)
    if not select.is_visible():
        page.get_by_text('Más medidas y acabados', exact=True).click()
    choices = select.locator('option').evaluate_all('(options)=>options.map(o=>({value:o.value,label:o.textContent}))')
    wanted = next((option for option in choices if re.match(r'^' + str(centimetres) + r'(?:[,.]0)?\s*cm\b', option['label'])), None)
    assert wanted, (key, centimetres, choices)
    select.select_option(wanted['value'])


def start_design(page):
    page.get_by_role('button', name='Colocar extras', exact=True).click()
    page.wait_for_url('**/#/personalizar/**')
    project_id = page.url.rsplit('/', 1)[-1]
    state = project_state(page, project_id)
    assert_pattern(state)
    return project_id, state


def run(browser, width):
    context = browser.new_context(viewport={'width': width, 'height': 844 if width < 500 else 1000},
                                  has_touch=width < 500, is_mobile=width < 500)
    page = context.new_page()
    errors = []
    page.on('pageerror', lambda error: errors.append(str(error)))
    page.goto(BASE)
    page.wait_for_load_state('networkidle')
    page.get_by_role('searchbox', name='Buscar prendas y accesorios', exact=True).wait_for()
    grouped_count = page.evaluate('''async()=>{
      const {CATALOG}=await import('/src/data/catalog.ts');
      const {modelHasPattern}=await import('/src/features/library/filters.ts');
      const {groupCatalog}=await import('/src/features/library/groups.ts');
      return groupCatalog(CATALOG.filter(modelHasPattern)).length;
    }''')
    assert grouped_count == 110, grouped_count
    no_overflow(page)
    page.screenshot(path=f'/tmp/hilvana-grouped-library-{width}.png', full_page=True)

    # Sizes and capacities no longer produce duplicate search cards.
    for term in ('hoddie', 'scrunchie', 'cheve', 'tote'):
        cards = search(page, term)
        # A basket can mention the tote construction in its description while
        # remaining a distinct design. Its presence is not a duplicate tote.
        if term == 'tote':
            cards = cards.filter(has=page.locator('.simple-pattern-caption strong', has_text=re.compile('tote', re.I)))
        assert cards.count() == 1, (term, cards.all_text_contents())
        assert cards.first.get_attribute('data-design-group')
        assert not re.search(r'\d+\s*cm', cards.first.inner_text()), cards.first.inner_text()
        no_overflow(page)

    # Search still sees individual dimensions and chooses a matching recipe.
    cards = search(page, 'hoodie 66')
    assert cards.count() == 1
    matching = card_models(page)[0]
    assert matching['params']['largo'] == 660, matching
    cards.first.click()
    page.get_by_role('button', name='Intervenir', exact=True).click()
    assert page.locator('#variant-largo').input_value()
    assert '66' in page.locator('#variant-largo option:checked').inner_text()
    choose_axis(page, 'largo', 74)
    choose_axis(page, 'largoManga', 41)
    page.get_by_role('button', name='Grande', exact=True).click()
    no_overflow(page)
    page.screenshot(path=f'/tmp/hilvana-grouped-measures-{width}.png')
    project_id, state = start_design(page)
    assert state['project']['pattern']['params']['largo'] == 740
    assert state['project']['pattern']['params']['largoManga'] == 410
    assert state['project']['pattern']['body']['pecho'] == 1040
    before = state['project']['pattern']

    # Measures lead to intervention, then colours and embroidery as requested.
    page.get_by_role('button', name='Elegir telas', exact=True).click()
    page.wait_for_url('**/#/acabados/**')
    assert page.get_by_role('button', name='Vista previa y bordados', exact=True).is_disabled()
    page.get_by_text('Cambiar una parte o bolsillo', exact=True).click()
    page.locator('.finish-material-list>button').first.click()
    page.get_by_role('button', name='Elegir una tela o subir foto', exact=True).click()
    dialog = page.get_by_role('dialog', name=re.compile('^Tela para '))
    dialog.wait_for()
    photo_box = dialog.get_by_role('button', name='Tomar foto', exact=True).bounding_box()
    assert photo_box and 0 <= photo_box['y'] < page.viewport_size['height']
    dialog.get_by_role('button', name='Cerrar', exact=True).click()
    page.locator('.finish-material-list>button').first.click()
    page.get_by_text('Usar el mismo material en todo', exact=True).click()
    page.get_by_role('button', name='Todas las partes #24584A', exact=True).click()
    page.get_by_role('button', name='Continuar a bordados', exact=True).click()
    assert page.get_by_role('button', name='Añadir bordado o letras', exact=True).is_visible()
    assert project_state(page, project_id)['project']['pattern']['params'] == before['params']
    no_overflow(page)

    # An accessory changes physical dimensions, never a clothing body profile.
    page.goto(BASE + '/#/biblioteca')
    cards = search(page, 'cheve')
    cards.first.click()
    page.get_by_role('button', name='Intervenir', exact=True).click()
    choose_axis(page, 'contorno', 23)
    choose_axis(page, 'alto', 15)
    _, accessory = start_design(page)
    assert accessory['project']['pattern']['params']['contorno'] == 230
    assert accessory['project']['pattern']['params']['alto'] == 150
    assert not accessory['project'].get('profileRef')

    # Old bookmarks keep their exact preset until the person changes it.
    legacy_id = 'coleccion-sudadera-580-280-180-capucha'
    page.goto(BASE + '/#/biblioteca/' + legacy_id)
    page.get_by_role('button', name='Intervenir', exact=True).click()
    _, legacy = start_design(page)
    assert legacy['project']['modelId'] == legacy_id
    assert legacy['project']['pattern']['params']['largo'] == 580
    assert legacy['project']['pattern']['params']['largoManga'] == 280
    no_overflow(page)
    assert not errors, errors
    print(f'Agrupación {width}px: una tarjeta por diseño, búsqueda de medida, ejes reales, talla, extras→materiales→bordados y enlaces anteriores PASS')
    context.close()


def run_filters(browser):
    context = browser.new_context(viewport={'width': 390, 'height': 844}, has_touch=True, is_mobile=True)
    page = context.new_page()
    page.goto(BASE)
    page.wait_for_load_state('networkidle')
    page.get_by_role('button', name='Abrigo', exact=True).click()
    page.get_by_role('button', name=re.compile('^Filtros')).click()
    page.locator('#search-recipient').select_option('mujer')
    page.locator('#search-fabric').select_option('punto')
    page.locator('#search-fit').select_option('oversize')
    page.get_by_role('dialog').get_by_role('button', name=re.compile(r'^Ver .+ resultados$')).click()
    models = page.evaluate('''async()=>{
      const {findModel}=await import('/src/data/catalog.ts');
      return [...document.querySelectorAll('.simple-pattern-card')].map(a=>findModel(a.getAttribute('href').split('/').pop().split('?')[0]));
    }''')
    assert models and all(model['type'] == 'abrigo' and 'mujer' in model['recipients'] and 'punto' in model['fabrics'] and 'oversize' in model['fits'] for model in models)
    ids = page.locator('.simple-pattern-card').evaluate_all('(cards)=>cards.map(c=>c.dataset.designGroup)')
    assert len(ids) == len(set(ids))
    page.reload(); page.wait_for_load_state('networkidle')
    assert page.locator('.simple-pattern-card').evaluate_all('(cards)=>cards.map(c=>c.dataset.designGroup)') == ids
    no_overflow(page)
    print('Filtros combinados mujer/abrigo/punto/oversize, representantes compatibles y persistencia PASS')
    context.close()


def run_baby_presets(browser):
    context = browser.new_context(viewport={'width': 390, 'height': 844}, has_touch=True, is_mobile=True)
    page = context.new_page()
    errors = []
    page.on('pageerror', lambda error: errors.append(str(error)))
    page.goto(BASE)
    page.wait_for_load_state('networkidle')
    page.get_by_role('button', name='Pantalones', exact=True).click()
    page.get_by_role('button', name=re.compile('^Filtros')).click()
    page.locator('#search-recipient').select_option('bebe')
    page.get_by_role('dialog').get_by_role('button', name=re.compile(r'^Ver .+ resultados$')).click()
    page.locator('#baby-simple').select_option('B0-6')
    page.locator('.simple-pattern-card').first.click()
    page.get_by_role('button', name='Intervenir', exact=True).click()

    def no_adult_presets():
        if page.locator('#variant-largo').count():
            lengths = page.locator('#variant-largo option').evaluate_all('(options)=>options.map(option=>option.value).filter(v=>/^\\d+$/.test(v)).map(Number)')
            assert not any(value >= 720 for value in lengths), lengths

    no_adult_presets()
    assert page.locator('#simple-child-size').input_value() == 'B0-6'
    _, baby = start_design(page)
    assert baby['project']['pattern']['body']['estatura'] == 680
    allowed = page.evaluate('''async id=>{const {findModel}=await import('/src/data/catalog.ts');return findModel(id).recipients;}''', baby['project']['modelId'])
    assert 'bebe' in allowed

    # Changing the recipient after an adult preset also returns to a compatible
    # construction, rather than creating a baby with a 104 cm adult trouser leg.
    page.goto(BASE + '/#/biblioteca/pantalon-recto-elastico')
    page.get_by_role('button', name='Intervenir', exact=True).click()
    choose_axis(page, 'largo', 104)
    page.locator('#simple-kind').select_option('bebe')
    no_adult_presets()
    page.locator('#simple-child-size').select_option('B0-6')
    _, switched = start_design(page)
    assert switched['project']['pattern']['body']['estatura'] == 680
    assert switched['project']['pattern']['params'].get('largo', 0) < 720
    assert all(max(node['y'] for node in piece['nodes']) - min(node['y'] for node in piece['nodes']) < 720 for piece in switched['pieces'])
    allowed = page.evaluate('''async id=>{const {findModel}=await import('/src/data/catalog.ts');return findModel(id).recipients;}''', switched['project']['modelId'])
    assert 'bebe' in allowed
    assert not errors, errors
    no_overflow(page)
    print('Bebé0–6: filtro y cambio posterior de destinatario excluyen presets adultos y crean patrón compatible PASS')
    context.close()


if __name__ == '__main__':
    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(executable_path='/usr/bin/chromium', args=['--no-sandbox'])
        try:
            for width in (320, 390, 1440):
                run(browser, width)
            run_filters(browser)
            run_baby_presets(browser)
        finally:
            browser.close()
