"""Dos publicaciones PWA: descubrimiento natural, actualización segura y fotos.

Ejecutar después de `npm run build` con Python Playwright y Chromium instalados.
Acepta BASE_PATH=/ o /MiPrimerApp/ y HILVANA_BUILD_DIR para un build aislado.
La segunda publicación modifica únicamente una copia temporal: renombra todos
los chunks, cambia el identificador de versión y sustituye un atlas fotográfico
por otro recurso existente. No cambia los recursos ni el build del repositorio.
No fuerza registration.update(): solo vuelve al primer documento y emite los
eventos de retorno/foco/conexión que recibe una PWA al regresar desde otra app.
"""
import argparse
import functools
import hashlib
import http.server
import json
import os
from pathlib import Path
import re
import shutil
import tempfile
import threading
import time

from playwright.sync_api import sync_playwright

from upgrade_navigation_smoke import QuietServer, next_release, persisted_project


PHOTO = 'catalog-images/realistas-infantil-02.webp'
REPLACEMENT_PHOTO = 'catalog-images/realistas-tendencias-01.webp'
DRAFT_KEY = 'hilvana-transform-vaquero-costados'
SAVE_ERROR = 'No se pudo guardar tu diseño. Reintenta antes de actualizar.'


def sha256(data):
    return hashlib.sha256(data).hexdigest()


def publish_fixture(site, previous_build):
    """Preserve the application logic while making a complete distinct release."""
    next_release(site)
    current_build = previous_build + '-delivery-fixture'
    replacements = 0
    for path in (site / 'assets').glob('*.js'):
        source = path.read_text()
        old = json.dumps(previous_build)
        replacements += source.count(old)
        path.write_text(source.replace(old, json.dumps(current_build)))
    assert replacements, 'El build no contiene su identificador de versión.'
    target = site / PHOTO
    target.write_bytes((site / REPLACEMENT_PHOTO).read_bytes())
    worker = site / 'sw.js'
    source, changed = re.subn(
        r'(url:"' + re.escape(PHOTO) + r'",revision:")[^"]+',
        lambda match: match[1] + hashlib.md5(target.read_bytes()).hexdigest(),
        worker.read_text(),
    )
    assert changed == 1, 'La foto debe estar incluida una vez en el precache.'
    worker.write_text(source)
    return current_build


def photo_from_worker(page, url):
    return page.evaluate('''async url => {
      const response = await fetch(url, { cache: 'reload' });
      if (!response.ok) throw new Error(`Foto: ${response.status}`);
      const data = await response.arrayBuffer();
      const digest = await crypto.subtle.digest('SHA-256', data);
      const objectUrl = URL.createObjectURL(new Blob([data], {type: 'image/webp'}));
      try {
        const image = new Image(); image.src = objectUrl; await image.decode();
        return {
          hash: Array.from(new Uint8Array(digest), n => n.toString(16).padStart(2, '0')).join(''),
          width: image.naturalWidth, height: image.naturalHeight,
          controlled: !!navigator.serviceWorker.controller,
        };
      } finally { URL.revokeObjectURL(objectUrl); }
    }''', url)


def accessible_center(locator):
    """Check actual hit testing, not just DOM visibility under an overlay."""
    locator.wait_for(state='visible')
    locator.evaluate('''async element => {
      for (let ancestor = element; ancestor; ancestor = ancestor.parentElement) {
        await Promise.all(ancestor.getAnimations().map(animation => animation.finished.catch(() => {})));
      }
    }''')
    result = locator.evaluate('''element => {
      const box = element.getBoundingClientRect();
      const x = box.x + box.width / 2, y = box.y + box.height / 2;
      const hit = document.elementFromPoint(x, y);
      return {
        x: box.x, y: box.y, width: box.width, height: box.height,
        inViewport: box.top >= 0 && box.bottom <= innerHeight && box.left >= 0 && box.right <= innerWidth,
        reachable: !!hit && (hit === element || element.contains(hit)),
        hit: hit?.outerHTML.slice(0, 180),
      };
    }''')
    assert result['inViewport'] and result['reachable'], result
    return result


def run():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--build', default=os.environ.get('HILVANA_BUILD_DIR', 'dist'))
    parser.add_argument('--out', default='/tmp/hilvana-update-delivery')
    args = parser.parse_args()
    build = Path(args.build).resolve()
    out = Path(args.out).resolve()
    out.mkdir(parents=True, exist_ok=True)
    assert (build / 'sw.js').is_file(), 'Genera primero el build de producción.'
    match = re.search(r'src="(/[^\"]*?)assets/index-[^\"]+\.js"', (build / 'index.html').read_text())
    assert match, 'No se encontró la ruta base del build de Vite.'
    prefix = match[1]
    report = {'base_path': prefix, 'checks': [], 'page_errors': []}

    def passed(check):
        report['checks'].append(check)
        print('PASS:', check, flush=True)

    with tempfile.TemporaryDirectory(prefix='hilvana-delivery-') as folder:
        webroot = Path(folder)
        site = webroot / prefix.strip('/') if prefix.strip('/') else webroot
        shutil.copytree(build, site, dirs_exist_ok=True, ignore=shutil.ignore_patterns('pattern-library'))
        old_photo_hash = sha256((site / PHOTO).read_bytes())
        new_photo_hash = sha256((site / REPLACEMENT_PHOTO).read_bytes())
        assert old_photo_hash != new_photo_hash
        server = http.server.ThreadingHTTPServer(
            ('127.0.0.1', 0), functools.partial(QuietServer, directory=str(webroot)))
        threading.Thread(target=server.serve_forever, daemon=True).start()
        base = f'http://localhost:{server.server_port}{prefix}'
        try:
            with sync_playwright() as playwright:
                browser = playwright.chromium.launch(
                    executable_path='/usr/bin/chromium', args=['--no-sandbox'])
                context = browser.new_context(
                    viewport={'width': 390, 'height': 844}, has_touch=True,
                    is_mobile=True, color_scheme='dark')
                page = context.new_page()
                page.on('pageerror', lambda error: report['page_errors'].append(str(error)))
                try:
                    page.goto(base + '#/ajustes')
                    page.wait_for_load_state('networkidle')
                    version = page.locator('[data-app-build]')
                    version.wait_for()
                    old_build = version.get_attribute('data-app-build')
                    assert old_build
                    report['old_build'] = old_build
                    page.wait_for_function('!!navigator.serviceWorker.controller')
                    page.get_by_role('button', name='Buscar actualizaciones', exact=True).click()
                    page.wait_for_function('''() => {
                      const button = [...document.querySelectorAll('button')].find(b => b.textContent === 'Buscar actualizaciones');
                      return !!button && !button.disabled && !!document.querySelector('.app-update-status')?.textContent.trim();
                    }''')
                    report['manual_check_initial'] = page.locator('.app-update-status').inner_text()
                    assert report['manual_check_initial'] == 'Tienes la versión más reciente disponible.', report['manual_check_initial']
                    assert not page.locator('.app-update-notice').count(), 'La primera instalación no debe anunciar una actualización.'
                    passed('Ajustes identifica la versión y permite buscar actualizaciones.')

                    page.evaluate('location.hash = "/biblioteca"')
                    page.get_by_role('button', name='Transformar mi ropa', exact=True).click()
                    page.get_by_role('button', name='Hacer los paneles vaqueros', exact=True).click()
                    sheet = page.get_by_role('dialog')
                    sheet.locator('#transform-vaquero-costados-ancho').fill('12.5')
                    sheet.get_by_text('Márgenes y referencias de colocación', exact=True).click()
                    sheet.get_by_label('Tus referencias sobre la prenda', exact=True).fill(
                        'Prueba de actualización: panel a 7 cm del costado.')
                    page.wait_for_function('''key => {
                      const value = JSON.parse(localStorage.getItem(key) || 'null');
                      return value?.params?.ancho === 125 && value?.placementNote.includes('7 cm');
                    }''', arg=DRAFT_KEY)
                    draft = page.evaluate('key => localStorage.getItem(key)', DRAFT_KEY)
                    sheet.get_by_role('button', name='Cerrar', exact=True).click()
                    first_photo = photo_from_worker(page, base + PHOTO)
                    assert first_photo['hash'] == old_photo_hash and first_photo['controlled']
                    report['photo_before'] = first_photo
                    page.evaluate('window.hilvanaDeliveryDocument = "release-one"')

                    new_build = publish_fixture(site, old_build)
                    report['new_build'] = new_build
                    # Real tab focus first, then the same foreground/connection
                    # events emitted on return from another app on a phone.
                    away = context.new_page()
                    away.goto('about:blank')
                    away.bring_to_front()
                    page.bring_to_front()
                    start = time.monotonic()
                    page.evaluate('''() => {
                      window.dispatchEvent(new Event('focus'));
                      document.dispatchEvent(new Event('visibilitychange'));
                      window.dispatchEvent(new Event('online'));
                    }''')
                    update = page.get_by_role('button', name='Guardar y actualizar', exact=True)
                    update.wait_for(timeout=45000)
                    report['discovery_seconds'] = round(time.monotonic() - start, 2)
                    assert page.evaluate('window.hilvanaDeliveryDocument') == 'release-one'
                    assert page.evaluate('''async () => !!(await navigator.serviceWorker.getRegistration()).waiting''')
                    assert photo_from_worker(page, base + PHOTO)['hash'] == old_photo_hash
                    passed('El retorno a la app descubre V2 sin forzar update(); V1 y su foto siguen activas.')

                    page.evaluate('window.scrollTo(0, 1400)')
                    assert page.evaluate('window.scrollY') > 500
                    report['notice_scrolled'] = accessible_center(update)
                    page.screenshot(path=str(out / '01-aviso-con-scroll.png'))
                    # Select a card near the current scroll position: unlike the
                    # hero, this keeps the underlying page scrolled in the Sheet.
                    cards = page.locator('.transform-card')
                    visible_card = cards.evaluate_all('''cards => cards.findIndex(card => {
                      const r = card.getBoundingClientRect();
                      return r.top > 140 && r.bottom < innerHeight - 80;
                    })''')
                    if visible_card < 0:
                        visible_card = 2
                    cards.nth(visible_card).click()
                    sheet.wait_for()
                    report['notice_sheet'] = accessible_center(update)
                    report['sheet_close'] = accessible_center(sheet.get_by_role('button', name='Cerrar', exact=True))
                    # The footer is intentionally disabled until measurements
                    # are confirmed; enable it through the same user control.
                    sheet.locator('.transform-confirm input').check()
                    sheet.locator('.sheet-body').evaluate('element => element.scrollTo(0, 0)')
                    report['sheet_footer'] = accessible_center(sheet.get_by_role('button', name='Generar mi transformación', exact=True))
                    page.screenshot(path=str(out / '02-aviso-sobre-sheet-oscuro.png'))
                    sheet.get_by_role('button', name='Cerrar', exact=True).click()
                    passed('Aviso y botón accesibles con scroll móvil oscuro; Sheet conserva cierre y pie visibles.')

                    # These lazy pages have not been loaded before the release.
                    # Their old filenames no longer exist on the HTTP server.
                    project_ids = []
                    for model in (
                        'coleccion-sudadera-660-540-260-capucha',
                        'pantalon-recto-elastico', 'bolsa-tote',
                    ):
                        page.evaluate('model => { location.hash = "/biblioteca/" + model; }', model)
                        page.get_by_role('button', name='Intervenir', exact=True).click()
                        page.get_by_role('button', name='Colocar extras', exact=True).click()
                        page.wait_for_url('**/#/personalizar/**')
                        page.locator('.customize-art svg').wait_for()
                        assert page.locator('.customize-art svg path').count() > 0
                        assert page.evaluate('window.hilvanaDeliveryDocument') == 'release-one'
                        project_ids.append(page.url.rsplit('/', 1)[-1])
                    report['project_ids'] = project_ids
                    passed('Tres intervenciones abren sus chunks de V1 después de retirarlos del servidor.')

                    page.evaluate('''() => {
                      window.hilvanaTransaction = IDBDatabase.prototype.transaction;
                      IDBDatabase.prototype.transaction = function(stores, mode, ...rest) {
                        if (mode === 'readwrite') throw new DOMException('Prueba de guardado fallido', 'QuotaExceededError');
                        return window.hilvanaTransaction.call(this, stores, mode, ...rest);
                      };
                    }''')
                    page.locator('.customize-option-add').first.click()
                    update.click()
                    page.get_by_text(SAVE_ERROR, exact=True).wait_for()
                    assert page.evaluate('window.hilvanaDeliveryDocument') == 'release-one'
                    assert not page.evaluate('document.getElementById("root").inert'), 'El fallo debe devolver el control del diseño.'
                    assert page.evaluate('''async () => !!(await navigator.serviceWorker.getRegistration()).waiting''')
                    page.screenshot(path=str(out / '03-guardado-fallido-bloquea-actualizacion.png'))
                    passed('Un fallo de guardado bloquea la activación y conserva el documento abierto.')
                    page.evaluate('() => { IDBDatabase.prototype.transaction = window.hilvanaTransaction; }')
                    update.click()
                    page.wait_for_function('window.hilvanaDeliveryDocument === undefined')
                    page.locator('.customize-art svg').wait_for()
                    assert page.url.endswith('/personalizar/' + project_ids[-1])
                    assert not page.get_by_role('button', name='Guardar y actualizar', exact=True).count()
                    for project_id in project_ids:
                        project = persisted_project(page, project_id)
                        assert project and project['design']['views'], project_id
                    assert persisted_project(page, project_ids[-1])['pattern'].get('components')
                    assert page.evaluate('key => localStorage.getItem(key)', DRAFT_KEY) == draft
                    passed('El clic voluntario guarda el extra, activa V2 y conserva los tres proyectos y el borrador.')

                    page.evaluate('location.hash = "/ajustes"')
                    version.wait_for()
                    assert version.get_attribute('data-app-build') == new_build
                    new_photo = photo_from_worker(page, base + PHOTO)
                    assert new_photo['hash'] == new_photo_hash
                    assert new_photo['width'] > 100 and new_photo['height'] > 100
                    report['photo_after'] = new_photo
                    page.get_by_role('button', name='Buscar actualizaciones', exact=True).click()
                    page.wait_for_function('''() => {
                      const button = [...document.querySelectorAll('button')].find(b => b.textContent === 'Buscar actualizaciones');
                      return !!button && !button.disabled && !!document.querySelector('.app-update-status')?.textContent.trim();
                    }''')
                    report['manual_check_after'] = page.locator('.app-update-status').inner_text()
                    assert report['manual_check_after'] == 'Tienes la versión más reciente disponible.', report['manual_check_after']
                    page.screenshot(path=str(out / '04-ajustes-version-nueva.png'))
                    passed('La recarga usa el identificador y los bytes fotográficos de V2.')

                    context.set_offline(True)
                    page.get_by_role('button', name='Buscar actualizaciones', exact=True).click()
                    page.wait_for_function('''() => /conexi[oó]n|internet|red/i.test(document.querySelector('.app-update-status')?.textContent || '')''')
                    report['manual_check_offline'] = page.locator('.app-update-status').inner_text()
                    assert report['manual_check_offline'].startswith('Sin conexión.'), report['manual_check_offline']
                    page.screenshot(path=str(out / '05-ajustes-sin-conexion.png'))
                    offline = context.new_page()
                    offline.on('pageerror', lambda error: report['page_errors'].append(str(error)))
                    offline.goto(base + '#/biblioteca')
                    offline.get_by_role('button', name='Transformar mi ropa', exact=True).wait_for()
                    offline_photo = photo_from_worker(offline, base + PHOTO)
                    assert offline_photo['hash'] == new_photo_hash and offline_photo['controlled']
                    assert persisted_project(offline, project_ids[-1])['pattern'].get('components')
                    assert offline.evaluate('key => localStorage.getItem(key)', DRAFT_KEY) == draft
                    report['photo_offline'] = offline_photo
                    passed('Sin red, Ajustes informa el estado y una página nueva conserva foto, proyecto y borrador.')
                    assert not report['page_errors'], report['page_errors']
                    report['status'] = 'passed'
                except Exception as error:
                    report['status'] = 'failed'
                    report['error'] = repr(error)
                    page.screenshot(path=str(out / 'failure.png'))
                    raise
                finally:
                    (out / 'results.json').write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n')
                    browser.close()
        finally:
            server.shutdown()
            server.server_close()
    print(f'Evidencia: {out}', flush=True)


if __name__ == '__main__':
    run()
