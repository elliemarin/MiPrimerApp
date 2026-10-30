"""Acabados: elegir tela/foto abre un selector visible, sin buscarlo en la página.

Requiere Vite, Playwright para Python y Chromium. Importa una foto sintética;
no accede a la cámara física. HILVANA_TEST_URL permite otro servidor de desarrollo.
"""
import os

from playwright.sync_api import sync_playwright
from visual_materials_smoke import png

BASE = os.environ.get('HILVANA_TEST_URL', 'http://localhost:5173').rstrip('/')


def in_view(locator, height):
    box = locator.bounding_box()
    assert box and box['y'] >= 0 and box['y'] + box['height'] <= height, box


def run(browser, width):
    height = 740 if width == 320 else 844 if width < 500 else 1000
    context = browser.new_context(viewport={'width': width, 'height': height},
                                  has_touch=width < 500, is_mobile=width < 500)
    page = context.new_page()
    errors = []
    page.on('pageerror', lambda error: errors.append(str(error)))
    page.goto(BASE)
    page.wait_for_load_state('networkidle')
    page.get_by_role('searchbox', name='Buscar prendas y accesorios').wait_for(state='visible')
    info = page.evaluate('''async()=>{
      const {useApp}=await import('/src/store/app.ts');
      const {findModel}=await import('/src/data/catalog.ts');
      const {projectFromModel}=await import('/src/store/projects.ts');
      const {profileFromSize}=await import('/src/store/profiles.ts');
      const {quickSize}=await import('/src/lib/sizes/quickSizes.ts');
      const {prepareSimpleProject}=await import('/src/features/simple/workflow.ts');
      const size=quickSize('mujer','mediana');
      const project=prepareSimpleProject(projectFromModel(findModel('coleccion-sudadera-660-540-260-capucha'),profileFromSize(size.table,size.row)));
      useApp.getState().put('project',project);window.__materialQaApp=useApp;
      location.hash='/acabados/'+project.id;
      return {id:project.id,pattern:project.pattern};
    }''')
    first = page.locator('.finish-material-list>button').first

    def open_fabrics(target=first):
        if not page.locator('.finish-part-details').evaluate('e=>e.open'):
            page.get_by_text('Cambiar una parte o bolsillo', exact=True).click()
        target.click()
        page.get_by_role('button', name='Elegir una tela o subir foto', exact=True).click()
        dialog = page.get_by_role('dialog', name='Tela para ', exact=False)
        dialog.wait_for(state='visible')
        page.wait_for_timeout(300)
        assert page.get_by_role('dialog').count() == 1
        assert page.evaluate("document.activeElement.classList.contains('fabric-tray')")
        in_view(dialog.get_by_role('button', name='Tomar foto', exact=True), height)
        in_view(dialog.get_by_role('button', name='Elegir del carrete', exact=True), height)
        in_view(dialog.get_by_role('textbox', name='Buscar tela para el estudio'), height)
        assert page.evaluate('document.documentElement.scrollWidth <= innerWidth + 1')
        return dialog

    # No scroll is needed to discover the picker, even on the smallest viewport.
    dialog = open_fabrics()
    page.screenshot(path=f'/tmp/hilvana-material-picker-{width}.png')
    page.keyboard.press('Escape')
    dialog.wait_for(state='detached')
    page.wait_for_function("document.activeElement.matches('.finish-material-list>button')")
    assert page.evaluate('document.body.style.overflow') != 'hidden'

    # The header close button and Escape both restore the originating part.
    dialog = open_fabrics(page.locator('.finish-material-list>button').last)
    dialog.get_by_role('button', name='Cerrar', exact=True).click()
    page.wait_for_function("document.activeElement === document.querySelector('.finish-material-list>button:last-child')")
    assert page.get_by_role('dialog').count() == 0

    # Catalog selection applies to exactly one part and returns focus there.
    dialog = open_fabrics()
    dialog.locator('.fabric-swatch').first.click()
    page.wait_for_function("document.activeElement === document.querySelector('.finish-material-list>button')")
    assert page.get_by_role('dialog').count() == 0
    choices = page.evaluate('(id)=>window.__materialQaApp.getState().projects[id].design.materialChoices', info['id'])
    assert len(choices) == 1 and next(iter(choices.values()))['type'] == 'tela'

    # Upload stays visible, persists at the beginning and applies to the same part.
    dialog = open_fabrics()
    with page.expect_file_chooser() as chooser:
        dialog.get_by_role('button', name='Elegir del carrete', exact=True).click()
    chooser.value.set_files({'name': 'Tela visible.png', 'mimeType': 'image/png', 'buffer': png(color=(190, 70, 115, 255))})
    page.wait_for_function("(id)=>{const p=window.__materialQaApp.getState().projects[id];const f=Object.values(window.__materialQaApp.getState().fabrics).find(f=>f.name==='Tela visible');return f&&Object.values(p.design.materialChoices).some(c=>c.fabricId===f.id);}", arg=info['id'])
    assert page.get_by_role('dialog').count() == 0
    page.wait_for_function("document.activeElement === document.querySelector('.finish-material-list>button')")
    pattern = page.evaluate('(id)=>window.__materialQaApp.getState().projects[id].pattern', info['id'])
    info['pattern'].setdefault('components', [])
    assert pattern == info['pattern'], 'Elegir una tela cambió las piezas o medidas del patrón'
    page.evaluate('async()=>await window.__materialQaApp.getState().saveNow()')
    page.reload(); page.wait_for_load_state('networkidle')
    dialog = open_fabrics()
    assert dialog.locator('.fabric-swatch').first.inner_text() == 'Tela visible'
    assert dialog.locator('input[capture=environment]').count() == 1
    # Immediate selection is a tap; the modal permits vertical browsing instead
    # of initiating a drag whose drop target is hidden behind the dialog.
    assert dialog.locator('.fabric-swatch[draggable=true]').count() == 0
    assert dialog.locator('.fabric-swatch').first.evaluate("e=>getComputedStyle(e).touchAction") == 'pan-y'
    assert not errors, errors
    print(f'Materiales {width}px: selector inmediato, foco/cierre/Escape, catálogo/foto aplicada, persistencia y sin overflow PASS')
    context.close()


if __name__ == '__main__':
    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(executable_path='/usr/bin/chromium', args=['--no-sandbox'])
        try:
            for width in (320, 390, 1440):
                run(browser, width)
        finally:
            browser.close()
