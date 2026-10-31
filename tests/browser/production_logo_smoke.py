"""Logo y asa táctil en el build final, sin importar módulos de desarrollo.

Local: BASE_PATH=/MiPrimerApp/ npm run build
       BASE_PATH=/MiPrimerApp/ npm run preview -- --host 127.0.0.1 --port 4174
       python tests/browser/production_logo_smoke.py
Público: HILVANA_PRODUCTION_URL=https://elliemarin.github.io/MiPrimerApp/ python tests/browser/production_logo_smoke.py
Requiere Playwright, Chromium y PyMuPDF. Solo lee IndexedDB del contexto temporal.
"""
import os
import time

from playwright.sync_api import sync_playwright
from logo_move_smoke import png_fixture, check_pdf

BASE = os.environ.get('HILVANA_PRODUCTION_URL', 'http://127.0.0.1:4174/MiPrimerApp/').rstrip('/')


def record(page, store, key):
    return page.evaluate('args=>window.__productionRecord(args.store,args.key)', {'store': store, 'key': key})


def saved_embroidery(page, project_id, kind, old=None):
    # Saving is debounced; wait for a completed IndexedDB write before reload.
    deadline = time.monotonic() + 15
    while time.monotonic() < deadline:
        project = record(page, 'projects', project_id)
        element = next((e for e in (project or {}).get('design', {}).get('elements', []) if e.get('embroidery', {}).get('kind') == kind), None)
        if element and (old is None or abs(element['x'] - old['x']) + abs(element['y'] - old['y']) > .01):
            return element
        page.wait_for_timeout(100)
    raise AssertionError(('El bordado no llegó al guardado local', project_id, kind, project))


def center(locator):
    b = locator.bounding_box()
    assert b
    return {'x': b['x'] + b['width'] / 2, 'y': b['y'] + b['height'] / 2}


def move_touch(page, context, project_id, kind, dx=8, dy=8):
    before = saved_embroidery(page, project_id, kind)
    page.locator('.finish-art > svg').scroll_into_view_if_needed()
    handle = page.get_by_role('button', name='Mover bordado seleccionado', exact=True)
    handle.wait_for()
    b = handle.bounding_box()
    assert b['width'] == 48 and b['height'] == 48, b
    start = center(handle)
    cdp = context.new_cdp_session(page)
    def send(event, x=None, y=None):
        cdp.send('Input.dispatchTouchEvent', {'type': event, 'touchPoints': [] if x is None else [{'x': x, 'y': y, 'id': 0, 'radiusX': 1, 'radiusY': 1, 'force': 1}]})
    send('touchStart', start['x'], start['y'])
    for i in range(1, 9):
        send('touchMove', start['x'] + dx * i / 8, start['y'] + dy * i / 8)
    send('touchEnd')
    cdp.detach()
    after = saved_embroidery(page, project_id, kind, before)
    assert after['w'] == before['w'] and after['h'] == before['h']
    assert after['viewId'] == before['viewId'] and after['assemblySurfaceId'] == before['assemblySurfaceId']
    return after


def run():
    with sync_playwright() as p:
        launch = {'executable_path': '/usr/bin/chromium', 'args': ['--no-sandbox']}
        if BASE.startswith('https:') and os.environ.get('HTTPS_PROXY'):
            launch['proxy'] = {'server': os.environ['HTTPS_PROXY']}
        browser = p.chromium.launch(**launch)
        context = browser.new_context(viewport={'width': 390, 'height': 844}, is_mobile=True, has_touch=True, accept_downloads=True, ignore_https_errors=True)
        # Inspect persistence through the browser API, without app internals.
        context.add_init_script('''window.__productionRecord=(store,key)=>new Promise((resolve,reject)=>{
          const opening=indexedDB.open('hilvana');
          opening.onerror=()=>reject(opening.error);
          opening.onsuccess=()=>{
            const db=opening.result;
            if(!db.objectStoreNames.contains(store)){db.close();resolve(undefined);return;}
            const tx=db.transaction(store,'readonly'),request=tx.objectStore(store).get(key);
            request.onsuccess=()=>resolve(request.result);
            request.onerror=()=>reject(request.error);
            tx.oncomplete=()=>db.close();
          };
        });''')
        page = context.new_page()
        errors, source_requests = [], []
        page.on('pageerror', lambda error: errors.append(str(error)))
        page.on('request', lambda request: source_requests.append(request.url) if '/src/' in request.url else None)
        try:
            page.goto(BASE + '/#/biblioteca/body-bebe', wait_until='networkidle')
            page.get_by_role('button', name='Intervenir', exact=True).click()
            page.get_by_role('button', name='Colocar extras', exact=True).click()
            page.wait_for_url('**/#/personalizar/**')
            project_id = page.url.rsplit('/', 1)[-1]
            page.locator('[data-assembly-view="armado-frente"]').wait_for()
            page.get_by_role('button', name='Elegir telas', exact=True).click()
            page.get_by_role('button', name='Elegir tela o color', exact=True).click()
            page.get_by_role('button', name='Color #24584A', exact=True).click()
            page.get_by_role('button', name='Continuar a bordados', exact=True).click()
            page.get_by_role('button', name='Subir logo o imagen', exact=True).click()
            sheet = page.get_by_role('dialog', name='Tu logo o imagen', exact=True)
            with page.expect_file_chooser() as choosing:
                sheet.get_by_role('button', name='Elegir imagen', exact=True).click()
            choosing.value.set_files({'name': 'Marca transparente.png', 'mimeType': 'image/png', 'buffer': png_fixture()})
            sheet.get_by_role('button', name='Colocar imagen', exact=True).click()
            sheet.wait_for(state='hidden')
            logo = saved_embroidery(page, project_id, 'image')
            assert logo['w'] == 70 and abs(logo['h'] - 70 * 80 / 120) < .0001
            picture = page.locator('[data-assembly-element="' + logo['id'] + '"] image')
            picture.wait_for()
            page.locator('.finish-art > svg').scroll_into_view_if_needed()
            start = center(picture)
            logo = move_touch(page, context, project_id, 'image')
            end = center(picture)
            assert abs(end['x'] - start['x'] - 8) < .1 and abs(end['y'] - start['y'] - 8) < .1, (start, end)
            alpha = page.evaluate('''async id=>{
              const p=await window.__productionRecord('projects',id);
              const child=p.design.elements.find(e=>e.kind==='imagen');
              const stored=await window.__productionRecord('files',child.image.fileId);
              const url=URL.createObjectURL(stored.blob);
              try{
                const image=new Image();image.src=url;await image.decode();
                const canvas=document.createElement('canvas');canvas.width=image.naturalWidth;canvas.height=image.naturalHeight;
                const ctx=canvas.getContext('2d');ctx.drawImage(image,0,0);
                return Array.from(ctx.getImageData(0,0,1,1).data);
              }finally{URL.revokeObjectURL(url);}
            }''', project_id)
            assert alpha == [0, 0, 0, 0], alpha
            page.get_by_role('button', name='Añadir bordado o letras', exact=True).click()
            page.get_by_role('button', name='Letras y números', exact=True).click()
            page.get_by_role('textbox', name='Texto para bordar', exact=True).fill('O')
            page.locator('#embroidery-letter-height').fill('0.3')
            page.locator('#embroidery-letter-height').press('Enter')
            page.get_by_role('button', name='Agregar texto', exact=True).click()
            letters = saved_embroidery(page, project_id, 'lettering')
            assert abs(letters['h'] - 3) < .001
            letters = move_touch(page, context, project_id, 'lettering', -8, 8)
            saved = record(page, 'projects', project_id)['design']
            page.reload(wait_until='networkidle')
            page.get_by_role('button', name='Continuar a bordados', exact=True).click()
            assert record(page, 'projects', project_id)['design'] == saved
            picture.wait_for()
            page.get_by_role('button', name='O · Clara', exact=True).click()
            page.get_by_role('button', name='Mover bordado seleccionado', exact=True).wait_for()
            assert page.evaluate('document.documentElement.scrollWidth<=innerWidth+1')
            page.screenshot(path='/tmp/hilvana-production-logo.png', full_page=True)
            page.get_by_role('button', name='Generar patrones', exact=True).click()
            button = page.get_by_role('button', name='Descargar PDF completo', exact=True)
            button.wait_for()
            with page.expect_download(timeout=90000) as pending:
                button.click()
            path = '/tmp/hilvana-published-logo.pdf' if BASE.startswith('https:') else '/tmp/hilvana-production-logo.pdf'
            pending.value.save_as(path)
            check_pdf(path, 70)
            assert not errors, errors
            assert not source_requests, source_requests
            print('PASS production logo:', BASE, 'PNG transparente, asa táctil48px, letra3mm, persistencia y PDF1:1; sin módulos de desarrollo')
        finally:
            browser.close()


if __name__ == '__main__':
    run()
