"""Decoraciones: mercería, pliegues, movimiento, materiales y PDF físico.

Requiere Vite, Chromium, Playwright y PyMuPDF. /src solo inspecciona el estado.
"""
import os
import re
import pymupdf
from playwright.sync_api import sync_playwright
from simple_journey_smoke import project_state, assert_pattern, no_overflow, verify_pdf, drag, physical_point

BASE=os.environ.get('HILVANA_TEST_URL','http://localhost:5173').rstrip('/')

def run(browser,width):
    context=browser.new_context(viewport={'width':width,'height':844 if width<500 else 1000},has_touch=width<500,is_mobile=width<500,accept_downloads=True)
    page=context.new_page()
    errors=[]
    page.on('pageerror',lambda error:errors.append(str(error)))
    page.goto(BASE+'/#/biblioteca/individual-reversible')
    page.get_by_role('button',name='Intervenir',exact=True).click()
    page.get_by_role('button',name='Colocar extras',exact=True).click()
    page.wait_for_url('**/#/personalizar/**')
    project_id=page.url.rsplit('/',1)[-1]
    page.get_by_role('button',name='Decorar',exact=True).click()
    assert page.locator('.customize-option').count()==22
    assert 'metraje de mercería' in page.locator('.customize-result-count').inner_text()
    page.get_by_role('button',name='Agregar blonda festoneada',exact=True).click()
    state=project_state(page,project_id)
    assert_pattern(state)
    bought=state['project']['pattern']['components'][0]
    assert bought['kind']=='cinta-comprada'
    assert not any(piece['id'].startswith('componente-') for piece in state['pieces'])
    # Drag on the opaque top band rather than one of the lace holes.
    point=physical_point(page,'.customize-art svg',bought['placement'].get('assemblySurfaceId'),bought['placement']['x'],bought['placement']['y']-bought['height']*.46)
    drag(page,context,point,{'x':point['x']+8,'y':point['y']+7},touch=width<500)
    moved=project_state(page,project_id)['project']['pattern']['components'][0]
    assert abs(moved['placement']['x']-bought['placement']['x'])>1
    page.get_by_role('button',name='Agregar olán plisado clásico',exact=True).click()
    state=project_state(page,project_id)
    assert_pattern(state)
    assert len(state['project']['pattern']['components'])==2
    pleated=state['project']['pattern']['components'][1]
    piece=next(piece for piece in state['pieces'] if piece['id']=='componente-'+pleated['id']+'-cuerpo')
    assert max(node['x'] for node in piece['nodes'])==pleated['width']*3
    assert len(piece['lines'])==18
    no_overflow(page)
    page.screenshot(path=f'/tmp/hilvana-decorations-{width}.png',full_page=True)
    page.get_by_role('button',name='Elegir telas',exact=True).click()
    page.wait_for_url('**/#/acabados/**')
    page.get_by_role('heading',name='Telas y colores',exact=True).wait_for()
    page.get_by_text('Cambiar una parte o bolsillo',exact=True).click()
    page.locator('.finish-material-list>button').first.wait_for()
    assert page.locator('.finish-material-list>button').count()>=3
    page.locator('.finish-material-list>button').first.click()
    page.get_by_text('Usar el mismo material en todo',exact=True).click()
    page.get_by_role('button',name='Todas las partes #24584A',exact=True).click()
    page.get_by_role('button',name='Continuar a bordados',exact=True).click()
    page.get_by_role('heading',name='Tu diseño y sus bordados',exact=True).wait_for()
    page.evaluate('async()=>await window.__hilvanaQaApp.getState().saveNow()')
    page.reload()
    page.get_by_role('button',name='Continuar a bordados',exact=True).click()
    page.get_by_role('button',name='Generar patrones',exact=True).wait_for()
    state=project_state(page,project_id)
    assert_pattern(state)
    assert state['project']['pattern']['components'][0]['materials']['cuerpo']['color']=='#24584A'
    page.get_by_role('button',name='Generar patrones',exact=True).click()
    page.wait_for_url('**/#/confeccion/**')
    download=page.get_by_role('button',name='Descargar PDF completo',exact=True)
    download.wait_for()
    assert download.is_enabled()
    if width==390:
        with page.expect_download(timeout=90000) as pending:
            download.click()
        path='/tmp/hilvana-decorations.pdf'
        pending.value.save_as(path)
        manifest=verify_pdf(path,state['pieces'],expect_placement=True)
        assert len([piece for piece in manifest['pieces'] if piece['id'].startswith('componente-')])==1
        pdf=pymupdf.open(path)
        text=' '.join(' '.join(sheet.get_text() for sheet in pdf).split())
        for phrase in ('Blonda festoneada','Olán plisado clásico','26 cm','no se incluye un patrón','llevar a marca'):
            assert phrase.lower() in text.lower(),phrase
        print(f'PDF decoraciones: {len(pdf)} páginas, mercería sin plantilla falsa, tira3×, marcas10mm y controles50/100mm PASS')
    assert not errors,errors
    no_overflow(page)
    context.close()
    print(f'Decoraciones {width}px: 22 opciones, arrastre, colores, persistencia y exportación PASS')

if __name__=='__main__':
    with sync_playwright() as playwright:
        browser=playwright.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
        try:
            for width in (320,390,1440):run(browser,width)
        finally:browser.close()
