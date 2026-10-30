"""Regresión de la revisión visual y del recorrido foto → tela → diseño.

Requiere Vite de desarrollo, Python Playwright y Chromium local.
HILVANA_TEST_URL cambia http://localhost:5173. Usa contextos temporales;
las importaciones /src sólo inspeccionan guardado y crean una prenda de prueba.
No accede a cámara/carrete reales: comprueba inputs capture y usa PNG sintéticos.
"""
import os
import struct
import zlib

from playwright.sync_api import sync_playwright

BASE = os.environ.get('HILVANA_TEST_URL', 'http://localhost:5173').rstrip('/')


def png(width=240, height=180, color=(180, 45, 85, 255)):
    def chunk(name, data):
        return struct.pack('!I', len(data)) + name + data + struct.pack('!I', zlib.crc32(name + data) & 0xffffffff)
    raw = b''.join(b'\0' + bytes(color) * width for _ in range(height))
    return b'\x89PNG\r\n\x1a\n' + chunk(b'IHDR', struct.pack('!IIBBBBB', width, height, 8, 6, 0, 0, 0)) + chunk(b'IDAT', zlib.compress(raw)) + chunk(b'IEND', b'')


def no_overflow(page):
    result = page.evaluate('({width:innerWidth,scroll:document.documentElement.scrollWidth})')
    assert result['scroll'] <= page.viewport_size['width'] + 1, result


def state(page):
    return page.evaluate('''async()=>{
      const {useApp}=await import('/src/store/app.ts');
      window.__visualQaApp=useApp;
      return {fabrics:Object.values(useApp.getState().fabrics),projects:Object.values(useApp.getState().projects)};
    }''')


def choose_image(page, label, name, color=(180, 45, 85, 255)):
    prior_toasts = page.evaluate("async()=>{const {useApp}=await import('/src/store/app.ts');return useApp.getState().toasts.map(toast=>toast.id);}")
    with page.expect_file_chooser() as chooser:
        page.get_by_role('button', name=label, exact=True).click()
    chooser.value.set_files({'name': name + '.png', 'mimeType': 'image/png', 'buffer': png(color=color)})
    page.get_by_text(name, exact=True).first.wait_for(state='visible')
    page.wait_for_function("""async ids=>{const {useApp}=await import('/src/store/app.ts');return useApp.getState().toasts.some(toast=>!ids.includes(toast.id)&&toast.text.startsWith('Tela guardada'));}""", arg=prior_toasts)


def save_reload(page):
    page.evaluate('''async()=>{const {useApp}=await import('/src/store/app.ts');await useApp.getState().saveNow();}''')
    page.reload()
    page.wait_for_load_state('networkidle')


def run(browser, width):
    context = browser.new_context(viewport={'width': width, 'height': 900 if width > 500 else 844},
                                  has_touch=width < 500, is_mobile=width < 500, accept_downloads=True)
    page = context.new_page()
    errors = []
    page.on('pageerror', lambda error: errors.append(str(error)))
    page.goto(BASE)
    page.wait_for_load_state('networkidle')
    page.get_by_role('searchbox', name='Buscar prendas y accesorios').wait_for(state='visible')
    no_overflow(page)
    page.screenshot(path=f'/tmp/hilvana-visual-library-{width}.png', full_page=True)

    # Importar desde el carrete y desde el input de cámara conserva todas las muestras.
    page.goto(BASE + '/#/telas')
    page.wait_for_load_state('networkidle')
    assert page.locator('input[capture=environment]').count() == 1
    choose_image(page, 'Elegir del carrete', 'Tela anterior', (60, 100, 155, 255))
    assert page.url.endswith('/#/telas'), 'La foto debe quedar visible en Mis telas'
    choose_image(page, 'Tomar foto', 'Tela cámara', (190, 140, 50, 255))
    choose_image(page, 'Elegir del carrete', 'Tela nueva', (140, 35, 90, 255))
    expected = ['Tela nueva', 'Tela cámara', 'Tela anterior']
    actual = page.locator('a.card .name').all_text_contents()
    assert actual[:3] == expected, actual
    imported = state(page)['fabrics']
    assert len(imported) == 3
    assert all(f['photo']['originalFileId'] != f['photo']['processedFileId'] for f in imported)
    assert all('calibration' not in f for f in imported)
    no_overflow(page)
    page.screenshot(path=f'/tmp/hilvana-visual-fabrics-{width}.png', full_page=True)
    page.reload()
    page.wait_for_load_state('networkidle')
    assert page.locator('a.card .name').all_text_contents()[:3] == expected

    # Imagen deja de ser una herramienta; las fotos viven dentro de Telas.
    project_id = page.evaluate('''async()=>{
      const {useApp}=await import('/src/store/app.ts');
      const {projectFromModel}=await import('/src/store/projects.ts');
      const {findModel}=await import('/src/data/catalog.ts');
      const p=projectFromModel(findModel('camiseta-basica'));
      useApp.getState().put('project',p);await useApp.getState().saveNow();
      location.hash='/estudio/'+p.id;return p.id;
    }''')
    tools = page.locator('[role=toolbar][aria-label=Herramientas]:visible')
    tools.get_by_role('button', name='Telas', exact=True).wait_for(state='visible')
    assert tools.count() == 1, 'Debe mostrarse una única barra de herramientas'
    assert tools.get_by_role('button').count() == 5
    assert page.get_by_role('button', name='Imagen', exact=True).count() == 0
    for label in ('Mover', 'Dibujar', 'Bordados', 'Telas'):
        assert tools.get_by_role('button', name=label, exact=True).is_visible(), label
    page.locator('[role=toolbar][aria-label=Herramientas]:visible').get_by_role('button', name='Telas', exact=True).click()
    swatches = page.locator('.fabric-swatch')
    assert swatches.all_text_contents()[:3] == expected, swatches.all_text_contents()
    choose_image(page, 'Elegir del carrete', 'Tela del estudio', (50, 130, 85, 255))
    assert swatches.first.inner_text() == 'Tela del estudio'
    assert swatches.first.get_attribute('aria-pressed') == 'true'
    page.get_by_role('button', name='Cerrar telas', exact=True).click()
    no_overflow(page)
    page.screenshot(path=f'/tmp/hilvana-visual-tools-{width}.png', full_page=True)
    save_reload(page)
    assert len(state(page)['fabrics']) == 4
    page.locator('[role=toolbar][aria-label=Herramientas]:visible').get_by_role('button', name='Telas', exact=True).click()
    assert page.locator('.fabric-swatch').all_text_contents()[:4] == ['Tela del estudio'] + expected
    page.get_by_role('button', name='Cerrar telas', exact=True).click()
    # Figurín remains reachable with fewer tools, and the preview adapts without losing the design.
    page.locator('[role=toolbar][aria-label=Herramientas]:visible').get_by_role('button', name='Más', exact=True).click()
    page.get_by_role('button', name='Ver en figurín', exact=True).click()
    page.get_by_role('dialog').wait_for(state='visible')
    page.wait_for_timeout(250)
    no_overflow(page)
    page.screenshot(path=f'/tmp/hilvana-visual-figurine-{width}.png')
    # Character changes must remain stored after closing/reloading.
    skin = page.get_by_role('button', name='Tono de piel 8', exact=True)
    if skin.count():
        skin.click()
        assert skin.get_attribute('aria-pressed') == 'true'
    page.get_by_role('button', name='Cerrar', exact=True).last.click()
    save_reload(page)
    project = next(p for p in state(page)['projects'] if p['id'] == project_id)
    assert project['design']['views'], 'Se perdió la base al cambiar figurín'
    assert not errors, errors
    print(f'Visual/materiales {width}px: foto/carrete, orden persistente, toolbar reducida, figurín accesible PASS')
    context.close()


def run_model_finishes(browser, width):
    from simple_journey_smoke import start_from_model
    context = browser.new_context(viewport={'width':width,'height':844 if width<500 else 1000},
                                  has_touch=width<500,is_mobile=width<500)
    page=context.new_page();errors=[]
    page.on('pageerror',lambda error:errors.append(str(error)))
    model_id='coleccion-sudadera-660-540-260-capucha'
    page.goto(BASE+'/#/biblioteca/'+model_id)
    page.wait_for_load_state('networkidle')
    page.get_by_role('button',name='En figurín',exact=True).click()
    page.locator('.model-illustration').wait_for(state='visible')
    no_overflow(page)
    page.wait_for_timeout(150)
    page.screenshot(path=f'/tmp/hilvana-visual-detail-model-{width}.png',full_page=True)
    page.get_by_role('group',name='Vista de la base',exact=True).get_by_role('button',name='Espalda',exact=True).click()
    assert page.locator('.model-illustration [data-illustration-segment]').count()>0
    assert 'NaN' not in page.locator('.model-illustration').inner_html()
    # The actual guided journey still owns the physical pattern coordinates.
    project_id=start_from_model(page,model_id)
    page.get_by_role('button',name='Elegir telas',exact=True).click()
    page.wait_for_url('**/#/acabados/**')
    before=next(project for project in state(page)['projects'] if project['id']==project_id)['pattern']
    page.get_by_text('Cambiar una parte o bolsillo',exact=True).click()
    page.get_by_role('button',name='Elegir color o tela:',exact=False).first.click()
    page.get_by_role('button',name='Elegir una tela o subir foto',exact=True).click()
    choose_image(page,'Elegir del carrete','Tela acabados',(190,70,115,255))
    imported=next(fabric for fabric in state(page)['fabrics'] if fabric['name']=='Tela acabados')
    assert page.locator('.finish-art svg image[href^="blob:"]').count()>0
    project=next(project for project in state(page)['projects'] if project['id']==project_id)
    assert any(fill.get('fabricId')==imported['id'] for view in project['design']['views'] for fill in view.get('zoneFills',{}).values())
    # Complete material choices explicitly before opening the final preview.
    page.get_by_role('button',name='Elegir color o tela:',exact=False).first.click()
    page.get_by_text('Usar el mismo material en todo',exact=True).click()
    page.get_by_role('button',name='Usar en todas las partes',exact=True).click()
    page.get_by_role('button',name='Continuar a bordados',exact=True).click()
    page.get_by_text('Más opciones',exact=True).click()
    page.get_by_role('button',name='Ver en modelo',exact=True).click()
    preview=page.get_by_role('dialog',name='Tu diseño en un figurín',exact=True)
    preview.wait_for(state='visible')
    page.wait_for_timeout(200)
    assert page.locator('.model-preview-art svg image[href^="blob:"]').count()>0
    assert page.locator('.model-preview-art .flat-surface > path[fill^="url(#"]').count()>0
    page.locator('#simple-model-body').select_option('curvas')
    skin=page.get_by_role('button',name='Tono de piel 7',exact=True)
    skin.click();assert skin.get_attribute('aria-pressed')=='true'
    no_overflow(page)
    page.locator('.sheet-body').evaluate('(element)=>element.scrollTop=0')
    page.wait_for_timeout(250)
    page.screenshot(path=f'/tmp/hilvana-visual-finished-model-{width}.png')
    page.get_by_role('group',name='Vista del figurín',exact=True).get_by_role('button',name='Espalda',exact=True).click()
    page.get_by_role('button',name='Volver al diseño',exact=True).click()
    assert page.get_by_role('button',name='Generar patrones',exact=True).is_enabled()
    after=next(project for project in state(page)['projects'] if project['id']==project_id)
    before['components']=before.get('components',[])
    assert after['pattern']==before, 'El figurín o los materiales modificaron el patrón'
    assert after['design']['figurine']['body']=='curvas'
    save_reload(page)
    reloaded=next(project for project in state(page)['projects'] if project['id']==project_id)
    assert reloaded['pattern']==before and reloaded['design']==after['design']
    page.get_by_role('button',name='Continuar a bordados',exact=True).click()
    assert page.get_by_role('button',name='Generar patrones',exact=True).is_enabled()
    page.get_by_text('Más opciones',exact=True).click()
    page.get_by_role('button',name='Ver en modelo',exact=True).click()
    assert page.locator('#simple-model-body').input_value()=='curvas'
    assert page.get_by_role('button',name='Tono de piel 7',exact=True).get_attribute('aria-pressed')=='true'
    assert page.locator('.model-preview-art svg image[href^="blob:"]').count()>0
    page.get_by_role('button',name='Volver al diseño',exact=True).click()
    page.get_by_role('button',name='Telas y colores',exact=True).click()
    page.get_by_text('Cambiar una parte o bolsillo',exact=True).click()
    page.get_by_role('button',name='Elegir color o tela:',exact=False).first.click()
    page.get_by_role('button',name='Elegir una tela o subir foto',exact=True).click()
    assert page.locator('.fabric-swatch').first.inner_text()=='Tela acabados'
    assert not errors,errors
    print(f'Modelo/acabados {width}px: prenda/figurín, foto real aplicada y guardada, silueta/tono persistentes, patrón intacto PASS')
    context.close()


if __name__ == '__main__':
    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(headless=True, executable_path='/usr/bin/chromium', args=['--no-sandbox'])
        try:
            for width in (320, 390, 950, 1440):
                run(browser, width)
            for width in (390,1440):
                run_model_finishes(browser,width)
        finally:
            browser.close()
