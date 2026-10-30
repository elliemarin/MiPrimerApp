"""Intervenir sigue funcionando si se publica otra versión con la app abierta.

Requiere `BASE_PATH=/ npm run build`, Python Playwright y Chromium.
Prueba dos despliegues reales de la PWA, elimina los chunks antiguos del servidor
y verifica intervención sin recargar, actualización voluntaria y guardado local.
HILVANA_BUILD_DIR permite probar un build aislado. No toca el build original.
"""
import functools
import hashlib
import http.server
import os
from pathlib import Path
import re
import shutil
import tempfile
import threading

from playwright.sync_api import sync_playwright


class QuietServer(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *_args):
        pass

    def end_headers(self):
        self.send_header('Cache-Control', 'no-store')
        super().end_headers()


def next_release(site):
    assets = site / 'assets'
    # Rename the complete JS graph, including imports back to the entry chunk.
    # Changing only the entry/customization filenames creates a broken release.
    replacements = {path.name: path.stem + '-upgrade.js' for path in assets.glob('*.js')}
    names = re.compile('|'.join(re.escape(name) for name in replacements))

    def rewrite(source):
        return names.sub(lambda match: replacements[match[0]], source)

    for original, updated in replacements.items():
        source = assets / original
        (assets / updated).write_text(rewrite(source.read_text()))
        source.unlink()
    html = site / 'index.html'
    html.write_text(rewrite(html.read_text()))
    worker = site / 'sw.js'
    source = rewrite(worker.read_text())
    # A real Vite build changes the HTML revision when its script hash changes.
    source, changed = re.subn(r'(url:"index.html",revision:")[^"]+',
                              lambda match: match[1] + hashlib.md5(html.read_bytes()).hexdigest(), source)
    assert changed == 1, 'No se encontró la revisión de index.html en el precache.'
    worker.write_text(source + '\n// upgrade regression fixture\n')


def persisted_project(page, project_id):
    return page.evaluate('''id => new Promise((resolve, reject) => {
      const request = indexedDB.open('hilvana');
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const database = request.result;
        const read = database.transaction('projects').objectStore('projects').get(id);
        read.onsuccess = () => { database.close(); resolve(read.result); };
        read.onerror = () => { database.close(); reject(read.error); };
      };
    })''', project_id)


def run():
    build = Path(os.environ.get('HILVANA_BUILD_DIR', 'dist')).resolve()
    assert (build / 'sw.js').is_file(), 'Genera primero el build de producción.'
    with tempfile.TemporaryDirectory(prefix='hilvana-upgrade-') as folder:
        site = Path(folder)
        shutil.copytree(build, site, dirs_exist_ok=True, ignore=shutil.ignore_patterns('pattern-library'))
        assert 'src="/assets/' in (site / 'index.html').read_text(), 'Este test requiere BASE_PATH=/.'
        server = http.server.ThreadingHTTPServer(('127.0.0.1', 0), functools.partial(QuietServer, directory=str(site)))
        threading.Thread(target=server.serve_forever, daemon=True).start()
        base = f'http://localhost:{server.server_port}'
        try:
            with sync_playwright() as playwright:
                browser = playwright.chromium.launch(executable_path='/usr/bin/chromium', args=['--no-sandbox'])
                context = browser.new_context(viewport={'width': 390, 'height': 844}, has_touch=True, is_mobile=True)
                page = context.new_page()
                errors = []
                page.on('pageerror', lambda error: errors.append(str(error)))
                page.goto(base + '/#/biblioteca/coleccion-sudadera-660-540-260-capucha')
                page.get_by_role('button', name='Intervenir', exact=True).wait_for()
                page.wait_for_function('!!navigator.serviceWorker.controller')
                page.evaluate('window.hilvanaUpgradeDocument = "original"')
                next_release(site)
                page.evaluate('''async () => {
                  const registration = await navigator.serviceWorker.getRegistration();
                  await registration.update();
                }''')
                page.get_by_role('button', name='Guardar y actualizar', exact=True).wait_for()
                assert page.evaluate('window.hilvanaUpgradeDocument') == 'original'
                assert page.evaluate('''async () => !!(await navigator.serviceWorker.getRegistration()).waiting''')

                # First lazy CustomizePage navigation happens AFTER its old file
                # was deleted from the server. The active old precache serves it.
                project_ids = []
                for model in ('coleccion-sudadera-660-540-260-capucha', 'pantalon-recto-elastico', 'bolsa-tote'):
                    page.evaluate('model => { location.hash = "/biblioteca/" + model; }', model)
                    page.get_by_role('button', name='Intervenir', exact=True).click()
                    page.get_by_role('button', name='Colocar extras', exact=True).click()
                    page.wait_for_url('**/#/personalizar/**')
                    page.locator('.customize-art svg').wait_for()
                    assert page.locator('.customize-art svg path').count() > 0
                    assert page.evaluate('window.hilvanaUpgradeDocument') == 'original'
                    project_ids.append(page.url.rsplit('/', 1)[-1])

                # An explicit update saves pending edits before activating V2.
                page.evaluate('''() => {
                  window.hilvanaTransaction = IDBDatabase.prototype.transaction;
                  IDBDatabase.prototype.transaction = function(stores, mode, ...rest) {
                    if (mode === 'readwrite') throw new DOMException('Prueba de guardado fallido', 'QuotaExceededError');
                    return window.hilvanaTransaction.call(this, stores, mode, ...rest);
                  };
                }''')
                added = page.locator('.customize-option-add').first
                added.click()
                page.get_by_role('button', name='Guardar y actualizar', exact=True).click()
                page.get_by_text('No se pudo guardar tu diseño. Reintenta antes de actualizar.', exact=True).wait_for()
                assert page.evaluate('window.hilvanaUpgradeDocument') == 'original'
                assert page.evaluate('''async () => !!(await navigator.serviceWorker.getRegistration()).waiting''')
                page.evaluate('() => { IDBDatabase.prototype.transaction = window.hilvanaTransaction; }')
                page.get_by_role('button', name='Guardar y actualizar', exact=True).click()
                page.wait_for_function('window.hilvanaUpgradeDocument === undefined')
                page.locator('.customize-art svg').wait_for()
                assert page.url.endswith('/personalizar/' + project_ids[-1])
                assert not page.get_by_role('button', name='Guardar y actualizar', exact=True).count()
                for project_id in project_ids:
                    project = persisted_project(page, project_id)
                    assert project and project['design']['views'], project_id
                current = persisted_project(page, project_ids[-1])
                assert current['pattern'].get('components'), 'Se perdió el extra al actualizar.'
                assert not errors, errors
                page.screenshot(path='/tmp/hilvana-upgrade-navigation.png')
                browser.close()
                print('PASS: tres intervenciones sin recarga tras un despliegue; no actualiza si falla guardado; actualización voluntaria conserva proyecto y extra.')
        finally:
            server.shutdown()
            server.server_close()


if __name__ == '__main__':
    run()
