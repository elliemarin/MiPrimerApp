"""Recorrido infantil en build o Pages, sin módulos de desarrollo.

HILVANA_PRODUCTION_URL=http://127.0.0.1:4176/MiPrimerApp/ python tests/browser/production_kids_handoff_smoke.py
Comprueba búsqueda, variante, lados físicos del delantal, persistencia y PDF.
Solo usa proyectos temporales y lee IndexedDB/DOM; no importa /src.
"""
import json
import os
import re
import time

import pymupdf
from playwright.sync_api import sync_playwright

BASE = os.environ.get('HILVANA_PRODUCTION_URL', 'http://127.0.0.1:4176/MiPrimerApp/').rstrip('/')
READ_DB = '''window.__handoffRecord=(key)=>new Promise((resolve,reject)=>{
 const opening=indexedDB.open('hilvana');opening.onerror=()=>reject(opening.error);
 opening.onsuccess=()=>{const db=opening.result;
  if(!db.objectStoreNames.contains('projects')){db.close();resolve(null);return;}
  const tx=db.transaction('projects','readonly'),request=tx.objectStore('projects').get(key);
  request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);tx.oncomplete=()=>db.close();};
});'''


def saved(page, project_id, count=0):
    deadline = time.monotonic() + 15
    while time.monotonic() < deadline:
        project = page.evaluate('id=>window.__handoffRecord(id)', project_id)
        if project and len([e for e in project.get('design', {}).get('elements', []) if e.get('embroidery')]) >= count:
            return project
        page.wait_for_timeout(100)
    raise AssertionError('No terminó el guardado del proyecto en IndexedDB')


def choose_body(page):
    page.locator('.finish-art > svg').scroll_into_view_if_needed()
    point = page.evaluate('''()=>{
      const svg=document.querySelector('.finish-art > svg');
      for(const surface of svg.querySelectorAll('[data-assembly-surface*="/delantal/"]')) {
        const path=surface.querySelector(':scope > path'),b=path.getBBox();
        for(const fy of [.55,.7,.4,.8])for(const fx of [.5,.3,.7]) {
          const local=new DOMPoint(b.x+b.width*fx,b.y+b.height*fy);
          if(!path.isPointInFill(local))continue;
          const p=local.matrixTransform(path.getScreenCTM());
          if(document.elementFromPoint(p.x,p.y)?.closest('[data-assembly-surface]')===surface)return {x:p.x,y:p.y};
        }
      }
      return null;
    }''')
    assert point, 'El cuerpo del delantal no ofrece una superficie visible'
    page.touchscreen.tap(point['x'], point['y'])


def pattern_pdf(page, label):
    button = page.get_by_role('button', name='Descargar PDF completo', exact=True)
    button.wait_for()
    assert button.is_enabled(), page.get_by_role('dialog').inner_text()
    with page.expect_download(timeout=90000) as dl:
        button.click()
    path = f'/tmp/hilvana-production-kids-{label}.pdf'
    dl.value.save_as(path)
    pdf = pymupdf.open(path)
    manifest = json.loads(pdf.embfile_get('confeccion.json'))
    section = next(s for s in manifest['sections'] if s['id'] == 'patron')
    widths = [round(d['rect'].width * 25.4 / 72, 3) for d in pdf[section['startPage'] - 1].get_drawings() if d.get('fill') is not None]
    assert widths[:2] == [50.0, 100.0], widths
    assert any('/PrintScaling /None' in pdf.xref_object(i) for i in range(1, pdf.xref_length()))
    return pdf, manifest


def run():
    with sync_playwright() as p:
        launch = {'executable_path': '/usr/bin/chromium', 'args': ['--no-sandbox']}
        if BASE.startswith('https:') and os.environ.get('HTTPS_PROXY'):
            launch['proxy'] = {'server': os.environ['HTTPS_PROXY']}
        browser = p.chromium.launch(**launch)
        context = browser.new_context(viewport={'width': 390, 'height': 844}, is_mobile=True, has_touch=True, accept_downloads=True, ignore_https_errors=True)
        context.add_init_script(READ_DB)
        page = context.new_page()
        errors, source_requests = [], []
        page.on('pageerror', lambda error: errors.append(str(error)))
        page.on('request', lambda request: source_requests.append(request.url) if '/src/' in request.url else None)
        try:
            page.goto(BASE + '/#/biblioteca', wait_until='networkidle')
            search = page.get_by_role('searchbox', name='Buscar prendas y accesorios', exact=True)
            search.fill('bonete volante')
            card = page.locator('.simple-pattern-card').filter(has_text='Bonete con volante')
            card.wait_for()
            assert card.count() == 1
            search.fill('puntilla')
            card = page.locator('.simple-pattern-card[href*="bonete-encaje"]')
            card.wait_for()
            assert 'bonete-encaje' in card.get_attribute('href'), card.get_attribute('href')
            card.click()
            page.get_by_role('button', name='Obtener patrón', exact=True).click()
            assert page.locator('#variant-volante').input_value() == '"encaje"'
            page.locator('#simple-child-size').select_option('B6-9')
            page.get_by_role('button', name='Preparar PDF', exact=True).click()
            page.wait_for_url('**/#/confeccion/**')
            bonnet_id = page.url.rsplit('/', 1)[-1]
            bonnet_pdf, bonnet_manifest = pattern_pdf(page, 'bonete-encaje')
            bonnet = saved(page, bonnet_id)
            assert bonnet['modelId'] == 'bonete-encaje' and bonnet['pattern']['params']['volante'] == 'encaje'
            assert not any(piece['id'].startswith('volante') for piece in bonnet_manifest['pieces']), bonnet_manifest['pieces']
            print('PASS bonete:', len(bonnet_pdf), 'páginas, puntilla comprada sin patrón falso de volante, control50/100mm', flush=True)
            bonnet_pdf.close()

            page.goto(BASE + '/#/biblioteca/delantal-pichi', wait_until='networkidle')
            page.get_by_role('button', name='Intervenir', exact=True).click()
            page.get_by_role('button', name='Colocar extras', exact=True).click()
            page.wait_for_url('**/#/personalizar/**')
            project_id = page.url.rsplit('/', 1)[-1]
            page.get_by_role('button', name='Elegir telas', exact=True).click()
            page.get_by_role('button', name='Elegir tela o color', exact=True).click()
            page.get_by_role('button', name='Color #24584A', exact=True).click()
            page.get_by_role('button', name='Continuar a bordados', exact=True).click()
            for side, query, name in [('Frente', 'cerezas', 'Agregar cerezas'), ('Espalda', 'panda', 'Agregar panda')]:
                page.get_by_role('group', name='Vista del diseño', exact=True).get_by_role('button', name=side, exact=True).click()
                choose_body(page)
                page.get_by_role('button', name='Añadir bordado o letras', exact=True).click()
                dialog = page.get_by_role('dialog', name='Bordados y letras', exact=True)
                dialog.get_by_role('textbox', name='Buscar bordados', exact=True).fill(query)
                dialog.locator('#embroidery-width').fill('3')
                dialog.locator('#embroidery-width').press('Enter')
                dialog.get_by_role('button', name=name, exact=True).click()
                dialog.wait_for(state='hidden')
            project = saved(page, project_id, 2)
            roots = {e['embroidery']['motifId']: e for e in project['design']['elements'] if e.get('embroidery')}
            front, back = roots['cerezas'], roots['panda-amigo']
            physical = next(v for v in project['design']['views'] if v['id'] == front['viewId'])
            assert physical['source']['pieceId'] == 'delantal' and back['viewId'] == front['viewId']
            # First physical construction mark is the actual shoulder line.
            values = [float(n) for n in re.findall(r'-?\d+(?:\.\d+)?', physical['details'][0]['d'])]
            shoulder = values[1]
            assert values[1] == values[3], values
            assert front['y'] - front['h'] / 2 >= shoulder and back['y'] + back['h'] / 2 <= shoulder, (front, back, shoulder)
            assert front['assemblySurfaceId'].startswith('armado-frente/') and back['assemblySurfaceId'].startswith('armado-espalda/')
            axes = page.locator('[data-assembly-element="' + back['id'] + '"]').evaluate('(e)=>{const m=e.transform.baseVal.consolidate().matrix;return {a:m.a,d:m.d};}')
            assert axes['a'] > 0 and axes['d'] > 0
            page.reload(wait_until='networkidle')
            page.get_by_role('button', name='Continuar a bordados', exact=True).click()
            assert saved(page, project_id, 2)['design'] == project['design']
            page.get_by_role('group', name='Vista del diseño', exact=True).get_by_role('button', name='Espalda', exact=True).click()
            page.locator('[data-assembly-element="' + back['id'] + '"]').wait_for()
            assert page.evaluate('document.documentElement.scrollWidth<=innerWidth+1')
            page.screenshot(path='/tmp/hilvana-production-kids-delantal.png', full_page=True)
            page.get_by_role('button', name='Generar patrones', exact=True).click()
            pdf, manifest = pattern_pdf(page, 'delantal')
            for root in (front, back):
                placement = next(item for item in manifest['placements'] if item['id'] == root['id'])
                assert placement['pieceId'] == 'delantal' and placement['precise']
                assert abs(placement['x'] - root['x']) < .001 and abs(placement['y'] - root['y']) < .001
                assert abs(placement['width'] - 30) < 1e-6 and abs(placement['height'] - 30) < 1e-6
            text = '\n'.join(p.get_text() for p in pdf)
            assert 'Cerezas' in text and 'Panda' in text
            assert any(s['id'].startswith('bordado-') for s in manifest['sections'])
            assert not errors, errors
            assert not source_requests, source_requests
            print('PASS delantal:', len(pdf), 'páginas, cerezas/panda en sus mitades físicas, guardado y PDF1:1', flush=True)
            print('PASS production kids:', BASE, 'sin módulos de desarrollo', flush=True)
            pdf.close()
        finally:
            browser.close()


if __name__ == '__main__':
    run()
