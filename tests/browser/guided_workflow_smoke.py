"""Recorrido real de confección: base → complementos → estudio → un PDF.

Requiere servidor de desarrollo, Python Playwright, Chromium y PyMuPDF.
HILVANA_TEST_URL permite cambiar http://localhost:5173. Usa contextos limpios;
no toca datos del navegador habitual. Las importaciones de /src son solo para
leer el estado y convertir coordenadas físicas del lienzo en puntos de pantalla.
"""
import json
import os
import re

import pymupdf
from playwright.sync_api import sync_playwright


BASE = os.environ.get('HILVANA_TEST_URL', 'http://localhost:5173').rstrip('/')


def no_overflow(page):
    sizes = page.evaluate('({viewport:innerWidth, content:document.documentElement.scrollWidth})')
    assert sizes['content'] <= sizes['viewport'] + 1, sizes


def state(page, project_id):
    return page.evaluate('''async id => {
        const {useApp}=await import('/src/store/app.ts');
        const {buildPattern}=await import('/src/lib/pattern/engine.ts');
        const p=useApp.getState().projects[id];
        const b=p.pattern?buildPattern(p.pattern):null;
        return {project:p,pieces:b?.pieces,issues:b?.issues};
    }''', project_id)


def commit_length(page, selector, cm):
    control = page.locator(selector)
    control.fill(str(cm))
    control.press('Enter')


def place_component(page, x_fraction, y_fraction):
    page.get_by_role('button', name='Colocar en frente', exact=True).click()
    page.locator('.customize-art svg').scroll_into_view_if_needed()
    point = page.locator('.customize-art svg').evaluate('''(svg, fractions) => {
        const box=svg.viewBox.baseVal;
        const p=new DOMPoint(box.x+box.width*fractions[0],box.y+box.height*fractions[1]).matrixTransform(svg.getScreenCTM());
        return {x:p.x,y:p.y};
    }''', [x_fraction, y_fraction])
    page.mouse.click(point['x'], point['y'])


def verify_pdf(path, expected_pieces, expected_cutouts=1, expected_embroidery=1):
    pdf = pymupdf.open(path)
    text = '\n'.join(page.get_text() for page in pdf)
    assert pdf.embfile_count() >= 1
    manifest = json.loads(pdf.embfile_get('confeccion.json'))
    assert manifest['format'] == 'hilvana-confeccion-v1', manifest
    assert manifest['mode'] == 'complete', manifest
    assert len(manifest['pieces']) == expected_pieces, manifest['pieces']
    assert len(manifest['cutouts']) == expected_cutouts, manifest['cutouts']
    sections = {section['id']: section for section in manifest['sections']}
    assert {'guia', 'patron', 'aplicaciones'}.issubset(sections), sections
    embroidery = [section for section in manifest['sections'] if section['id'].startswith('bordado-')]
    assert sum(section['count'] for section in embroidery) == expected_embroidery, embroidery
    for previous, following in zip(manifest['sections'], manifest['sections'][1:]):
        assert following['startPage'] == previous['endPage'] + 1, manifest['sections']
    assert manifest['sections'][-1]['endPage'] == len(pdf), manifest['sections']
    calibrations = []
    for section_id in ('patron', 'aplicaciones', *(section['id'] for section in embroidery)):
        cover = pdf[sections[section_id]['startPage'] - 1]
        widths = [round(drawing['rect'].width * 25.4 / 72, 3)
                  for drawing in cover.get_drawings() if drawing.get('fill') is not None]
        assert widths[:2] == [50.0, 100.0], (section_id, widths)
        calibrations.append((section_id, widths[:2]))
    for word in ('Medidas', 'materiales', 'Orden de armado', 'fuelle', 'cierre'):
        assert word.lower() in text.lower(), word
    for piece in manifest['pieces']:
        assert piece['id'] in text, f'Falta inventario de {piece["id"]}'
        assert piece['wMm'] > 0 and piece['hMm'] > 0
        assert piece['cutWMm'] >= piece['wMm'] and piece['cutHMm'] >= piece['hMm']
    assert any(piece['qty'] == 2 and 'cuerpo' in piece['id'] for piece in manifest['pieces'])
    assert '/PrintScaling /None' in pdf.xref_object(pdf.pdf_catalog()) or any(
        '/PrintScaling /None' in pdf.xref_object(index) for index in range(1, pdf.xref_length()))
    print('PDF:', len(pdf), 'páginas;', expected_pieces, 'plantillas;',
          len(manifest['cutouts']), 'apliques; calibración', calibrations)
    pdf.close()


def run_flow(browser, mobile):
    label = 'movil' if mobile else 'escritorio'
    context = browser.new_context(
        viewport={'width': 390, 'height': 844} if mobile else {'width': 1440, 'height': 1000},
        has_touch=mobile, is_mobile=mobile, accept_downloads=True)
    page = context.new_page()
    errors = []
    page.on('pageerror', lambda error: errors.append(str(error)))
    page.goto(BASE + '/#/biblioteca/pantalon-recto-elastico')
    page.wait_for_load_state('networkidle')
    page.get_by_role('button', name='Crear proyecto con este modelo', exact=True).click()
    page.get_by_label('Talla', exact=True).select_option('M92')
    page.get_by_role('button', name='Crear proyecto', exact=True).click()
    page.wait_for_url('**/#/personalizar/**')
    page.get_by_role('heading', name='Hazlo tuyo', exact=True).wait_for()
    project_id = page.url.rsplit('/', 1)[-1]
    no_overflow(page)
    assert page.get_by_role('navigation', name='Pasos del diseño').get_by_role('link').count() == 4

    # El catálogo es contextual y sus filtros deben seguir mostrando herramientas
    # con forma de bolsillo (teléfono, tijeras), además de tiras.
    page.get_by_role('button', name='Herramientas y tiras', exact=True).click()
    assert page.get_by_role('button', name='Agregar bolsillo para teléfono', exact=True).count() == 1
    assert page.get_by_role('button', name='Agregar bolsillo para tijeras con funda', exact=True).count() == 1
    page.get_by_role('button', name='Todos', exact=True).click()

    page.get_by_role('button', name='Agregar bolsillo cargo', exact=True).click()
    commit_length(page, '#component-width', 16)
    commit_length(page, '#component-height', 19)
    commit_length(page, '#component-depth', 3)
    page.locator('#component-quantity').select_option('2')
    page.locator('#component-location').fill('Muslo izquierdo y derecho')
    place_component(page, .28, .48)
    cargo = state(page, project_id)['project']['pattern']['components'][0]
    assert (cargo['width'], cargo['height'], cargo['depth'], cargo['quantity']) == (160, 190, 30, 2), cargo
    assert cargo['placement']['label'] == 'Muslo izquierdo y derecho', cargo

    page.get_by_role('button', name='Agregar bolsillo con cierre', exact=True).click()
    commit_length(page, '#component-width', 14)
    commit_length(page, '#component-height', 12)
    page.locator('#component-location').fill('Cadera derecha')
    place_component(page, .72, .30)

    page.get_by_role('button', name='Agregar organizador de herramientas', exact=True).click()
    commit_length(page, '#component-width', 18)
    commit_length(page, '#component-height', 20)
    page.locator('#component-location').fill('Pierna derecha, canales para herramientas')
    place_component(page, .72, .67)
    configured = state(page, project_id)
    assert len(configured['project']['pattern']['components']) == 3
    assert not [issue for issue in configured['issues'] if issue['level'] == 'error'], configured['issues']
    assert len(configured['pieces']) >= 9, configured['pieces']
    page.screenshot(path=f'/tmp/hilvana-recorrido-{label}-personalizar.png', full_page=True)
    no_overflow(page)

    # La alternativa Dibujar abre el lápiz directamente; el trazo conservará
    # su técnica de bordado y también debe aparecer en el paquete final.
    page.get_by_role('button', name='Dibujar en estudio', exact=True).click()
    page.wait_for_url('**/#/estudio/**')
    page.get_by_role('button', name='Figuras', exact=True).last.wait_for(state='visible')
    assert page.get_by_role('button', name='Lápiz', exact=True).last.get_attribute('aria-pressed') == 'true'
    canvas = page.locator('.ed-canvas').bounding_box()
    start = {'x': canvas['x'] + canvas['width'] * .52, 'y': canvas['y'] + canvas['height'] * .36}
    page.mouse.move(start['x'], start['y'])
    page.mouse.down()
    for dx, dy in ((4, -5), (9, -8), (14, -4), (20, 0)):
        page.mouse.move(start['x'] + dx, start['y'] + dy, steps=2)
    page.mouse.up()
    drawn = state(page, project_id)['project']['design']['elements']
    assert any(e['kind'] == 'trazo' and e['technique'] == 'bordado' for e in drawn)
    page.get_by_role('button', name='Elegir', exact=True).last.click()
    no_overflow(page)
    # Selecciona el cuerpo del cargo mediante un toque real en su geometría.
    component_point = page.evaluate('''async id => {
        const {useApp}=await import('/src/store/app.ts');
        const p=useApp.getState().projects[id],c=p.pattern.components[0];
        const body=p.design.elements.find(e=>e.id===`componente-${c.id}--cuerpo`);
        const m=document.querySelector('.ed-canvas svg.board>g[transform]').getScreenCTM();
        const point=new DOMPoint(body.x-body.w*.25,body.y+body.h*.25).matrixTransform(m);
        return {x:point.x,y:point.y};
    }''', project_id)
    page.mouse.click(component_point['x'], component_point['y'])
    page.get_by_role('button', name='Tonos', exact=True).last.click()
    page.get_by_role('textbox', name='Código hexadecimal del color').fill('#3366aa')
    page.get_by_role('button', name=re.compile('^Aplicar a la selección')).click()
    painted = state(page, project_id)['project']['design']['elements']
    assert any(e['id'].startswith(f'componente-{cargo["id"]}--') and e['fill'].get('color') == '#3366aa' for e in painted), [(e['id'], e['name'], e['fill'],e['x'],e['y']) for e in painted]

    # Modificar el tamaño en Estudio actualiza la receta de confección. Duplicar
    # y borrar conservan la unidad completa, y Deshacer/Rehacer también lo hace.
    if mobile:
        page.get_by_role('button', name='Propiedades', exact=True).click()
    choose_whole = page.get_by_role('button', name='Elegir el complemento completo', exact=True)
    if choose_whole.count():
        choose_whole.click()
    for field_name, cm in (('Ancho terminado del cuerpo', 17), ('Alto terminado del cuerpo', 20)):
        control = page.locator('.field').filter(has=page.get_by_text(field_name, exact=True)).locator('input:visible')
        control.fill(str(cm))
        control.press('Enter')
    resized = state(page, project_id)
    resized_cargo = next(c for c in resized['project']['pattern']['components'] if c['id'] == cargo['id'])
    assert abs(resized_cargo['width'] - 170) < .001 and abs(resized_cargo['height'] - 200) < .001, resized_cargo
    page.get_by_role('button', name='Duplicar', exact=True).last.click()
    assert len(state(page, project_id)['project']['pattern']['components']) == 4
    if mobile:
        page.get_by_role('dialog').get_by_role('button', name='Cerrar', exact=True).click()
    page.get_by_role('button', name='Eliminar figura seleccionada', exact=True).click()
    assert len(state(page, project_id)['project']['pattern']['components']) == 3
    page.get_by_role('button', name='Deshacer', exact=True).click()
    assert len(state(page, project_id)['project']['pattern']['components']) == 4
    page.get_by_role('button', name='Rehacer', exact=True).click()
    assert len(state(page, project_id)['project']['pattern']['components']) == 3
    assert not [issue for issue in state(page, project_id)['issues'] if issue['level'] == 'error']
    page.screenshot(path=f'/tmp/hilvana-recorrido-{label}-estudio.png', full_page=True)

    # Una figura de la biblioteca se incorpora como aplique con su plantilla.
    page.get_by_role('button', name='Figuras', exact=True).last.click()
    page.get_by_role('textbox', name='Buscar figuras', exact=True).fill('estrella')
    page.get_by_role('button', name='Estrella', exact=True).click()
    canvas = page.locator('.ed-canvas').bounding_box()
    page.mouse.click(canvas['x'] + canvas['width'] * .52, canvas['y'] + canvas['height'] * .50)
    page.get_by_role('button', name='Eliminar figura seleccionada', exact=True).wait_for(state='visible')
    with_applique = state(page, project_id)
    assert any(e['name'] == 'Estrella' and e['technique'] == 'aplicacion' for e in with_applique['project']['design']['elements'])

    page.get_by_role('navigation', name='Pasos del diseño').get_by_role('link', name=re.compile(r'^4?\s*PDF')).click()
    page.wait_for_url('**/#/confeccion/**')
    download_button = page.get_by_role('button', name='Descargar PDF completo', exact=True)
    download_button.wait_for(state='visible')
    assert download_button.is_enabled(), page.get_by_role('dialog').inner_text()
    no_overflow(page)
    with page.expect_download(timeout=60000) as download:
        download_button.click()
    destination = f'/tmp/hilvana-recorrido-{label}.pdf'
    download.value.save_as(destination)
    verify_pdf(destination, len(with_applique['pieces']))

    exported = state(page, project_id)['project']
    records = [record for record in exported['exports'] if record['kind'] == 'pdf-confeccion']
    assert len(records) == 1 and records[0]['deps']['pattern'] and records[0]['deps']['design'], records
    page.evaluate('''async()=>{const {useApp}=await import('/src/store/app.ts');await useApp.getState().saveNow();}''')
    page.reload()
    page.wait_for_load_state('networkidle')
    page.get_by_role('button', name='Descargar PDF completo', exact=True).wait_for(state='visible')
    persisted = state(page, project_id)['project']
    assert persisted['pattern']['components'] == exported['pattern']['components']
    assert persisted['design']['elements'] == exported['design']['elements']
    assert len(persisted['exports']) == len(exported['exports'])
    # Inyectar la condición que puede producir el editor de patrón: el paquete
    # completo no debe ignorar una pieza excluida. La acción visible la recupera.
    page.evaluate('''async id=>{
        const {useApp}=await import('/src/store/app.ts');
        const {buildPattern}=await import('/src/lib/pattern/engine.ts');
        useApp.getState().updateProject(id,p=>({...p,pattern:{...p.pattern,noExport:[buildPattern(p.pattern).pieces[0].id]}}));
    }''', project_id)
    assert page.get_by_role('button', name='Descargar PDF completo', exact=True).is_disabled()
    page.get_by_role('button', name='Incluir todas las piezas del patrón', exact=True).click()
    assert page.get_by_role('button', name='Descargar PDF completo', exact=True).is_enabled()
    page.screenshot(path=f'/tmp/hilvana-recorrido-{label}-pdf.png', full_page=True)
    no_overflow(page)
    assert not errors, errors
    print(label, ': base M92 → cargo/cierre/organizador editados → dibujo/bordado → color → aplique → PDF único → persistir PASS; errores:', errors)
    context.close()


def run_intervention(browser):
    context = browser.new_context(viewport={'width':390,'height':844},has_touch=True,is_mobile=True,accept_downloads=True)
    page = context.new_page()
    errors=[]
    page.on('pageerror', lambda error: errors.append(str(error)))
    page.goto(BASE+'/#/biblioteca/intervenir-pantalon')
    page.wait_for_load_state('networkidle')
    page.get_by_role('button', name='Crear proyecto con este modelo', exact=True).click()
    page.get_by_role('button', name='Crear proyecto', exact=True).click()
    page.wait_for_url('**/#/personalizar/**')
    page.get_by_role('heading',name='Hazlo tuyo',exact=True).wait_for()
    page.get_by_role('button',name='Agregar bolsillo pequeño',exact=True).click()
    page.get_by_role('button',name='Continuar al estudio',exact=True).click()
    page.wait_for_url('**/#/estudio/**')
    page.get_by_role('navigation',name='Pasos del diseño').get_by_role('link',name=re.compile(r'^4?\s*PDF')).click()
    page.wait_for_url('**/#/confeccion/**')
    download_button=page.get_by_role('button',name='Descargar PDF de intervención',exact=True)
    download_button.wait_for(state='visible')
    assert download_button.is_enabled(),page.get_by_role('dialog').inner_text()
    assert page.get_by_role('button',name='Descargar PDF completo',exact=True).count()==0
    assert 'El patrón de la prenda base no está incluido' in page.get_by_role('dialog').inner_text()
    with page.expect_download(timeout=60000) as info:
        download_button.click()
    filename='/tmp/hilvana-recorrido-intervencion.pdf'
    info.value.save_as(filename)
    pdf=pymupdf.open(filename)
    manifest=json.loads(pdf.embfile_get('confeccion.json'))
    assert manifest['mode']=='intervention'
    assert len(manifest['pieces'])==1 and manifest['pieces'][0]['id'].startswith('componente-'),manifest
    text='\n'.join(page.get_text() for page in pdf)
    assert 'base no se incluye' in text
    assert 'Bolsillo pequeño' in text and 'termina boca y contorno' in text,text[:1500]
    no_overflow(page)
    assert not errors,errors
    print('Intervención sin patrón base → bolsillo con pieza/materiales/pasos en PDF honesto PASS;',len(pdf),'páginas')
    context.close()


with sync_playwright() as playwright:
    browser = playwright.chromium.launch(headless=True, executable_path='/usr/bin/chromium', args=['--no-sandbox'])
    run_flow(browser, mobile=True)
    run_flow(browser, mobile=False)
    run_intervention(browser)
    browser.close()
