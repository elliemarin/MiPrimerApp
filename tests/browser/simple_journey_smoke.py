"""Recorrido simplificado de Hilvana, con interacción real de ratón y tacto.

Requiere Vite de desarrollo, Python Playwright, Chromium y PyMuPDF.
HILVANA_TEST_URL permite cambiar http://localhost:5173. Los contextos son
temporales; /src se importa sólo para inspeccionar geometría y persistencia.
"""
import json
import math
import os
import re

import pymupdf
from playwright.sync_api import sync_playwright


BASE = os.environ.get('HILVANA_TEST_URL', 'http://localhost:5173').rstrip('/')


def no_overflow(page):
    size = page.evaluate('({w:innerWidth,scroll:document.documentElement.scrollWidth})')
    viewport_width = page.viewport_size['width']
    assert size['scroll'] <= viewport_width + 1 and size['w'] <= viewport_width + 1, (size, page.viewport_size)


def project_state(page, project_id):
    return page.evaluate('''async id => {
      const {useApp}=await import('/src/store/app.ts');
      const {buildPattern}=await import('/src/lib/pattern/engine.ts');
      window.__hilvanaQaApp=useApp;
      const project=useApp.getState().projects[id];
      const built=project.pattern?buildPattern(project.pattern):null;
      return {project,pieces:built?.pieces,issues:built?.issues,
        missing:built?.missing,seams:built?.seamResults.map(s=>({ok:s.ok,label:s.relation.label}))};
    }''', project_id)


def assert_pattern(state):
    assert state['pieces'], 'Faltan piezas reales de confección'
    assert not state['missing'], state['missing']
    assert not [issue for issue in state['issues'] if issue['level'] == 'error'], state['issues']
    assert all(seam['ok'] for seam in state['seams']), state['seams']
    for piece in state['pieces']:
        assert all(math.isfinite(node['x']) and math.isfinite(node['y']) for node in piece['nodes'])


def svg_point(page, selector, fx, fy):
    return page.locator(selector).evaluate('''(svg,fractions)=>{
      const box=svg.viewBox.baseVal;
      const p=new DOMPoint(box.x+box.width*fractions[0],box.y+box.height*fractions[1]).matrixTransform(svg.getScreenCTM());
      return {x:p.x,y:p.y};
    }''', [fx, fy])


def component_point(page, project_id, component_id):
    return page.evaluate('''async args=>{
      const {useApp}=await import('/src/store/app.ts');
      const c=useApp.getState().projects[args.project].pattern.components.find(c=>c.id===args.component);
      const svg=document.querySelector('.customize-art svg');
      const p=new DOMPoint(c.placement.x,c.placement.y+c.height*.2).matrixTransform(svg.getScreenCTM());
      return {x:p.x,y:p.y};
    }''', {'project': project_id, 'component': component_id})


def drag(page, context, start, end, touch=False):
    viewport = page.viewport_size
    for point in (start, end):
        assert 0 < point['x'] < viewport['width'] and 0 < point['y'] < viewport['height'], (start, end, viewport)
    if touch:
        cdp = context.new_cdp_session(page)
        def dispatch(kind, point=None):
            cdp.send('Input.dispatchTouchEvent', {'type': kind, 'touchPoints': [] if point is None else [
                {'x': point['x'], 'y': point['y'], 'id': 0, 'radiusX': 1, 'radiusY': 1, 'force': 1}
            ]})
        dispatch('touchStart', start)
        for step in range(1, 13):
            amount = step / 12
            dispatch('touchMove', {'x': start['x'] + (end['x']-start['x'])*amount,
                                   'y': start['y'] + (end['y']-start['y'])*amount})
        dispatch('touchEnd')
        cdp.detach()
    else:
        page.mouse.move(start['x'], start['y'])
        page.mouse.down()
        page.mouse.move(end['x'], end['y'], steps=12)
        page.mouse.up()


def verify_pdf(path, expected_pieces=None, expect_placement=False, expect_embroidery=False):
    pdf = pymupdf.open(path)
    assert pdf.embfile_count(), 'Falta manifiesto adjunto'
    manifest = json.loads(pdf.embfile_get('confeccion.json'))
    assert manifest['mode'] == 'complete', manifest
    assert manifest['pieces']
    if expected_pieces is not None:
        assert {p['id'] for p in manifest['pieces']} == {p['id'] for p in expected_pieces}
    assert all(piece['wMm'] > 0 and piece['hMm'] > 0 for piece in manifest['pieces'])
    sections = manifest['sections']
    assert sections[-1]['endPage'] == len(pdf), sections
    for previous, following in zip(sections, sections[1:]):
        assert following['startPage'] == previous['endPage'] + 1, sections
    calibrations = []
    for section in sections:
        if section['id'] == 'guia':
            continue
        cover = pdf[section['startPage']-1]
        widths = [round(d['rect'].width*25.4/72, 3) for d in cover.get_drawings() if d.get('fill') is not None]
        if widths[:2] == [50.0, 100.0]:
            calibrations.append(section['id'])
    assert 'patron' in calibrations, calibrations
    if expect_embroidery:
        assert any(section['id'].startswith('bordado-') for section in sections), sections
        assert any(section.startswith('bordado-') for section in calibrations), calibrations
    text = '\n'.join(page.get_text() for page in pdf)
    for word in ('medidas', 'materiales', 'montaje'):
        assert word in text.lower(), word
    if expect_placement:
        assert 'colocaci' in text.lower() or 'ubicaci' in text.lower(), text[:1200]
        placement_section = next(section for section in sections if section['id'].startswith(('colocacion','ubicacion')))
        tile = pdf[placement_section['startPage']]
        grid_x = []
        for drawing in tile.get_drawings():
            for item in drawing['items']:
                if item[0] == 'l' and abs(item[1].x-item[2].x) < .001 and abs(item[1].y-item[2].y) > 200:
                    grid_x.append(item[1].x)
        values = sorted(set(round(value, 4) for value in grid_x))
        gaps = [(following-previous)*25.4/72 for previous,following in zip(values,values[1:])]
        assert sum(abs(gap-10)<.001 for gap in gaps) >= 5, ('La cuadrícula debe medir10mm',gaps)
    if expect_embroidery:
        assert all(color in text.upper() for color in ('#F5C842','#202824','#D9EFF2','#B4273A')), 'Falta la leyenda de colores de los bordados'
        colors = set()
        for section in sections:
            if not section['id'].startswith('bordado-'):
                continue
            for index in range(section['startPage'],section['endPage']):
                for drawing in pdf[index].get_drawings():
                    fill = drawing.get('fill')
                    if fill and len(set(round(channel,3) for channel in fill)) > 1:
                        colors.add(tuple(fill))
        assert len(colors) >= 4, ('Faltan colores vectoriales en la guía', colors)
    assert any('/PrintScaling /None' in pdf.xref_object(index) for index in range(1, pdf.xref_length()))
    print('PDF', path, len(pdf), 'páginas;', len(manifest['pieces']), 'plantillas; controles50/100mm', calibrations)
    pdf.close()
    return manifest


def save_and_reload(page, project_id):
    before = project_state(page, project_id)['project']
    page.evaluate('''async()=>{const {useApp}=await import('/src/store/app.ts');await useApp.getState().saveNow();}''')
    page.reload()
    page.wait_for_load_state('networkidle')
    page.evaluate('''async()=>{window.__hilvanaQaApp=(await import('/src/store/app.ts')).useApp;}''')
    page.wait_for_function('id=>!!window.__hilvanaQaApp.getState().projects[id]', arg=project_id)
    after = project_state(page, project_id)['project']
    assert before['pattern'] == after['pattern']
    assert before['design'] == after['design']
    assert before['exports'] == after['exports']


def start_from_model(page, model_id, intent='customize', size='Mediana'):
    page.goto(BASE + '/#/biblioteca/' + model_id)
    page.wait_for_load_state('networkidle')
    no_overflow(page)
    page.get_by_role('button', name='Obtener patrón' if intent == 'pattern' else 'Intervenir', exact=True).click()
    size_button = page.get_by_role('button', name=size, exact=True)
    if size_button.count():
        size_button.click()
    if size == 'A medida':
        return None
    page.get_by_role('button', name='Preparar PDF' if intent == 'pattern' else 'Colocar extras', exact=True).click()
    page.wait_for_url('**/#/confeccion/**' if intent == 'pattern' else '**/#/personalizar/**')
    return page.url.rsplit('/', 1)[-1]


def run_sizes_and_direct_pattern(browser):
    context = browser.new_context(viewport={'width': 390, 'height': 844}, has_touch=True, is_mobile=True, accept_downloads=True)
    page = context.new_page()
    errors = []
    page.on('pageerror', lambda error: errors.append(str(error)))
    measurements = {}
    for label, chest in (('Chica', 880), ('Mediana', 960), ('Grande', 1040)):
        project_id = start_from_model(page, 'pantalon-recto-elastico', intent='pattern', size=label)
        button = page.get_by_role('button', name='Descargar PDF completo', exact=True)
        button.wait_for(state='visible')
        assert button.is_enabled(), page.get_by_role('dialog').inner_text()
        state = project_state(page, project_id)
        assert_pattern(state)
        assert state['project']['pattern']['body']['pecho'] == chest, state['project']['pattern']['body']
        measurements[label] = state['project']['pattern']['body']['cadera']
        no_overflow(page)
    assert measurements['Chica'] < measurements['Mediana'] < measurements['Grande'], measurements

    start_from_model(page, 'pantalon-recto-elastico', intent='pattern', size='A medida')
    prepare = page.get_by_role('button', name='Preparar PDF', exact=True)
    assert prepare.is_disabled(), 'Las medidas personalizadas vacías no deben generar patrones'
    custom_cm = {'cintura': 78, 'cadera': 100, 'tiro': 28, 'entrepierna': 74}
    for key, value in custom_cm.items():
        control = page.locator('#custom-' + key)
        control.fill(str(value))
        control.press('Enter')
    assert prepare.is_enabled()
    prepare.click()
    page.wait_for_url('**/#/confeccion/**')
    page.get_by_role('button', name='Descargar PDF completo', exact=True).wait_for(state='visible')
    project_id = page.url.rsplit('/', 1)[-1]
    state = project_state(page, project_id)
    assert_pattern(state)
    for key, value in custom_cm.items():
        assert state['project']['pattern']['body'][key] == value * 10
    with page.expect_download(timeout=60000) as download:
        page.get_by_role('button', name='Descargar PDF completo', exact=True).click()
    path = '/tmp/hilvana-simple-medidas-personalizadas.pdf'
    download.value.save_as(path)
    verify_pdf(path, state['pieces'])
    assert not errors, errors
    print('Tallas Chica/Mediana/Grande con medidas distintas y A medida→PDF directo PASS', measurements)
    context.close()


def card_models(page):
    return page.evaluate('''async()=>{
      const {findModel}=await import('/src/data/catalog.ts');
      return [...document.querySelectorAll('.simple-pattern-card')].map(a=>{
        const id=decodeURIComponent(a.getAttribute('href').split('/').pop().split('?')[0]);
        const m=findModel(id);return{id,name:m.name,type:m.type,recipients:m.recipients,generatorId:m.generatorId,params:m.params,status:m.status};
      });
    }''')


def run_search_and_baby_size(browser, width=390):
    context = browser.new_context(viewport={'width': width, 'height': 844}, has_touch=True, is_mobile=True)
    page = context.new_page()
    errors = []
    page.on('pageerror', lambda error: errors.append(str(error)))
    page.goto(BASE)
    page.wait_for_load_state('networkidle')
    search = page.get_by_role('searchbox', name='Buscar prendas y accesorios', exact=True)
    search.wait_for(state='visible')
    no_overflow(page)
    counts = page.evaluate('''async()=>{
      const {CATALOG}=await import('/src/data/catalog.ts');
      const {groupCatalog}=await import('/src/features/library/groups.ts');
      const {COMPONENT_OPTIONS}=await import('/src/data/components.ts');
      const {EMBROIDERY_MOTIFS}=await import('/src/data/embroideryMotifs.ts');
      const available=CATALOG.filter(m=>m.generatorId&&!m.studioOnly&&m.status!=='pendiente');
      return{patterns:available.length,designs:groupCatalog(available).length,extras:COMPONENT_OPTIONS.length,motifs:EMBROIDERY_MOTIFS.length};
    }''')
    assert counts['patterns'] >= 1600 and counts['extras'] >= 200 and counts['motifs'] >= 300, counts
    assert 0 < page.locator('.simple-pattern-card').count() <= 24
    search.fill('hoddie')
    page.wait_for_function("document.querySelector('.simple-pattern-card')?.textContent.toLowerCase().includes('hoodie')")
    hoodies = card_models(page)
    assert all(model['generatorId'] == 'sudadera-capucha-holgada' and model['params']['capucha'] == 'si' for model in hoodies), hoodies
    assert len(hoodies) == 1, 'Las medidas de hoodie deben reunirse en un diseño'
    assert page.get_by_role('button', name='Ver más diseños', exact=True).count() == 0

    search.fill('')
    if counts['designs'] > 24:
        page.get_by_role('button', name='Ver más diseños', exact=True).click()
        assert page.locator('.simple-pattern-card').count() == min(48, counts['designs'])
    page.get_by_role('button', name='Pantalones', exact=True).click()
    page.get_by_role('button', name=re.compile('^Filtros')).click()
    page.locator('#search-recipient').select_option('bebe')
    page.get_by_role('dialog').get_by_role('button', name=re.compile(r'^Ver .+ resultados$')).click()
    baby = card_models(page)
    assert baby and all(model['type'] == 'inferiores' and 'bebe' in model['recipients'] for model in baby), baby
    page.locator('#baby-simple').select_option('B0-6')
    first = page.locator('.simple-pattern-card').first
    first.click()
    page.get_by_role('button', name='Obtener patrón', exact=True).click()
    assert page.locator('#simple-child-size').input_value() == 'B0-6'
    page.get_by_role('button', name='Preparar PDF', exact=True).click()
    page.wait_for_url('**/#/confeccion/**')
    page.get_by_role('button', name='Descargar PDF completo', exact=True).wait_for()
    state = project_state(page, page.url.rsplit('/', 1)[-1])
    assert_pattern(state)
    assert state['project']['pattern']['body']['estatura'] == 680, state['project']['pattern']['body']
    no_overflow(page)
    assert not errors, errors
    print('Inicio buscador, catálogo amplio, paginación, filtros reales y bebé0–6 PASS', width, counts)
    context.close()


def world_point(page, selector, x, y):
    return page.locator(selector).evaluate('''(svg,p)=>{
      const point=new DOMPoint(p.x,p.y).matrixTransform(svg.getScreenCTM());
      return{x:point.x,y:point.y};
    }''', {'x': x, 'y': y})


def add_extra_by_drag(page, context, project_id, name, fx, fy, touch):
    handle = page.get_by_role('button', name='Arrastrar ' + name, exact=True)
    # Fixed navigation and the sticky preview reduce the usable viewport.
    # Centre the actual handle rather than dragging behind the bottom toolbar.
    handle.evaluate("element=>element.scrollIntoView({block:'center',inline:'nearest'})")
    handle.click(trial=True)
    source = handle.bounding_box()
    start = {'x': source['x']+source['width']/2, 'y': source['y']+source['height']/2}
    end = svg_point(page, '.customize-art svg', fx, fy)
    before = len(project_state(page, project_id)['project']['pattern'].get('components', []))
    drag(page, context, start, end, touch)
    page.wait_for_function('args=>window.__hilvanaQaApp.getState().projects[args.id].pattern.components?.length===args.count', arg={'id': project_id, 'count': before+1})
    return project_state(page, project_id)['project']['pattern']['components'][-1]


def run_simple_customization(browser, mobile=True):
    label = 'movil' if mobile else 'escritorio'
    context = browser.new_context(viewport={'width':390,'height':844} if mobile else {'width':1440,'height':1000},
                                  has_touch=mobile,is_mobile=mobile,accept_downloads=True)
    page = context.new_page()
    errors = []
    page.on('pageerror', lambda error: errors.append(str(error)))
    project_id = start_from_model(page, 'coleccion-sudadera-660-540-260-capucha')
    page.get_by_role('heading', name='Coloca tus extras', exact=True).wait_for()
    initial = project_state(page, project_id)
    assert_pattern(initial)
    assert initial['project']['pattern']['generatorId'] == 'sudadera-capucha-holgada'
    assert len(initial['pieces']) == 4
    no_overflow(page)
    page.get_by_role('textbox', name='Buscar extras', exact=True).fill('bolsillo cargo')
    cargo = add_extra_by_drag(page, context, project_id, 'bolsillo cargo', .38, .62, mobile)
    assert cargo['placement']['pieceId'] == 'delantero', cargo
    assert (cargo['width'],cargo['height'],cargo['depth']) == (180,220,35), cargo
    before = cargo['placement'].copy()
    # Zoom once and drag in that coordinate system. Physical coordinates must
    # change by the requested millimetres, without resizing the sewing piece.
    page.get_by_role('button', name='Acercar zona', exact=True).click()
    start = world_point(page,'.customize-art svg',before['x'],before['y']+cargo['height']*.2)
    end = world_point(page,'.customize-art svg',before['x']+40,before['y']+cargo['height']*.2-20)
    drag(page,context,start,end,mobile)
    moved = project_state(page,project_id)['project']['pattern']['components'][0]
    assert abs(moved['placement']['x']-before['x']-40)<.05 and abs(moved['placement']['y']-before['y']+20)<.05, (before,moved)
    assert moved['width']==cargo['width'] and moved['height']==cargo['height']
    page.get_by_role('button',name='Ver pieza completa',exact=True).click()
    page.get_by_role('textbox',name='Buscar extras',exact=True).fill('cámara compacta arriba')
    camera = add_extra_by_drag(page,context,project_id,'portacelular · cámara compacta arriba a la izquierda',.76,.64,mobile)
    assert camera['kind']=='porta-telefono-camara' and camera['camera']['width']==45, camera
    configured=project_state(page,project_id)
    assert_pattern(configured)
    assert len(configured['pieces'])==12, configured['pieces']
    page.evaluate('window.scrollTo(0,0)')
    page.screenshot(path=f'/tmp/hilvana-simple-{label}-extras.png',full_page=True)
    page.get_by_role('button',name='Elegir telas y bordados',exact=True).click()
    page.wait_for_url('**/#/acabados/**')
    page.get_by_role('heading',name='Telas y bordados',exact=True).wait_for()
    generate=page.get_by_role('button',name='Generar patrones',exact=True)
    assert generate.is_disabled(), 'Faltan materiales: todavía no debe permitirse el PDF'
    assert page.get_by_role('button',name='Bordados',exact=True).is_disabled()
    # The final exporter must enforce the same requirement even if someone
    # opens the PDF step directly instead of using the disabled main button.
    page.locator(f'.project-journey a[href="#/confeccion/{project_id}"]').click()
    blocked=page.get_by_role('button',name='Descargar PDF completo',exact=True)
    blocked.wait_for(state='visible')
    assert blocked.is_disabled(), 'El enlace al PDF no debe saltarse los materiales pendientes'
    page.get_by_role('dialog').get_by_role('button',name='Cerrar',exact=True).click()
    page.locator(f'.project-journey a[href="#/acabados/{project_id}"]').click()
    page.get_by_role('heading',name='Telas y bordados',exact=True).wait_for()
    targets=page.get_by_role('button',name=re.compile('^Elegir color o tela:'))
    assert targets.count()==11, targets.all_text_contents()
    targets.first.click()
    page.get_by_role('button',name='Color #3366AA',exact=True).click()
    assert generate.is_disabled(), 'Elegir una parte no debe completar las demás'
    targets.first.click()
    page.get_by_text('Usar el mismo material en todo',exact=True).click()
    page.get_by_role('button',name='Usar en todas las partes',exact=True).click()
    assert generate.is_enabled()
    page.get_by_role('button',name='Continuar a bordados',exact=True).click()
    page.get_by_role('button',name='Añadir bordado o letras',exact=True).click()
    page.get_by_role('textbox',name='Buscar bordados',exact=True).fill('abejita')
    page.get_by_role('button',name='Agregar abeja',exact=True).click()
    bee_state=project_state(page,project_id)
    bee=next(e for e in bee_state['project']['design']['elements'] if e.get('embroidery',{}).get('motifId')=='abeja')
    colors={e['fill']['color'].upper() for e in bee_state['project']['design']['elements'] if e.get('parentId')==bee['id'] and e['fill']['type']=='color'}
    assert {'#F5C842','#202824','#D9EFF2'}<=colors, colors
    assert all(e.get('vectorPath') for e in bee_state['project']['design']['elements'] if e.get('parentId')==bee['id'])
    # Move the multicolour group as a single motif, then resize it physically.
    page.locator('.finish-art svg').scroll_into_view_if_needed()
    start=world_point(page,'.finish-art svg',bee['x'],bee['y'])
    end=world_point(page,'.finish-art svg',bee['x']-100,bee['y']-65)
    drag(page,context,start,end,mobile)
    control=page.locator('#embroidery-width')
    control.fill('8');control.press('Enter')
    bee_state=project_state(page,project_id)
    resized=next(e for e in bee_state['project']['design']['elements'] if e['id']==bee['id'])
    assert abs(resized['w']-80)<.01 and abs(resized['x']-bee['x']+100)<.1, resized
    page.get_by_role('button',name='Añadir bordado o letras',exact=True).click()
    page.get_by_role('button',name='Letras y números',exact=True).click()
    text=page.get_by_role('textbox',name='Texto para bordar',exact=True)
    text.fill('😊')
    assert page.get_by_role('button',name='Agregar texto',exact=True).is_disabled()
    text.fill('B8 Año 2026')
    fonts=page.get_by_role('group',name='Tipografía del bordado').get_by_role('button')
    assert fonts.count()==5
    before_path=page.locator('.embroidery-text-preview path').get_attribute('d')
    page.get_by_role('button',name='Manuscrita',exact=True).click()
    assert page.locator('.embroidery-text-preview path').get_attribute('d')!=before_path
    page.get_by_label('Color del texto bordado',exact=True).fill('#B4273A')
    page.get_by_role('button',name='Agregar texto',exact=True).click()
    final=project_state(page,project_id)
    letters=next(e for e in final['project']['design']['elements'] if e.get('embroidery',{}).get('kind')=='lettering')
    assert letters['embroidery']['fontId']=='manuscrita' and letters['embroidery']['text']=='B8 Año 2026', letters
    outline=next(e for e in final['project']['design']['elements'] if e.get('parentId')==letters['id'])
    assert outline['kind']=='trazo' and outline['vectorPath'].count('M')>10 and outline['fill']['color'].lower()=='#b4273a'
    assert_pattern(final)
    no_overflow(page)
    page.evaluate('window.scrollTo(0,0)')
    page.screenshot(path=f'/tmp/hilvana-simple-{label}-acabados.png',full_page=True)
    generate.click()
    page.wait_for_url('**/#/confeccion/**')
    download_button=page.get_by_role('button',name='Descargar PDF completo',exact=True)
    download_button.wait_for(state='visible')
    assert download_button.is_enabled(),page.get_by_role('dialog').inner_text()
    with page.expect_download(timeout=90000) as download:
        download_button.click()
    path=f'/tmp/hilvana-simple-{label}.pdf'
    download.value.save_as(path)
    manifest=verify_pdf(path,final['pieces'],expect_placement=True,expect_embroidery=True)
    placements=manifest.get('placements',[])
    assert placements, 'Faltan coordenadas de colocación en el manifiesto'
    assert len(placements)==4 and all(item['precise'] for item in placements), placements
    for component in final['project']['pattern']['components']:
        placement=next((p for p in placements if p['id']==component['id']),None)
        assert placement is not None, (component,placements)
        assert placement.get('pieceId')==component['placement']['pieceId']
        assert abs(placement['x']-component['placement']['x'])<.01 and abs(placement['y']-component['placement']['y'])<.01
    assert any(section['id'].startswith(('colocacion','ubicacion')) for section in manifest['sections'])
    exported=project_state(page,project_id)['project']
    assert exported['exports'][-1]['deps']['pattern'] and exported['exports'][-1]['deps']['design']
    save_and_reload(page,project_id)
    assert not errors,errors
    print(label,'hoodie→cargo/cámara arrastrados→colores explícitos→abeja multicolor+letras→PDF con coordenadas→persistir PASS')
    context.close()


if __name__ == '__main__':
    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(headless=True, executable_path='/usr/bin/chromium', args=['--no-sandbox'])
        try:
            run_search_and_baby_size(browser, width=320)
            run_search_and_baby_size(browser, width=390)
            run_sizes_and_direct_pattern(browser)
            run_simple_customization(browser, mobile=True)
            run_simple_customization(browser, mobile=False)
        finally:
            browser.close()

