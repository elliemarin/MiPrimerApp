"""Relevo del segundo lote infantil: catálogo, tallas, intervención y PDF.

HILVANA_TEST_URL=http://127.0.0.1:5185 python tests/browser/digitized_kids_handoff_smoke.py
Requiere Vite, Playwright, Chromium y PyMuPDF. Solo usa contextos temporales;
los módulos /src se importan únicamente para inspeccionar el proyecto real.
"""
import json
import os

import pymupdf
from playwright.sync_api import sync_playwright
from simple_journey_smoke import assert_pattern, drag, no_overflow, project_state

BASE = os.environ.get('HILVANA_TEST_URL', 'http://127.0.0.1:5185').rstrip('/')


def start(page, model_id, variant=None, from_catalog=False):
    if from_catalog:
        page.goto(BASE + '/#/biblioteca', wait_until='networkidle')
        page.get_by_role('searchbox', name='Buscar prendas y accesorios', exact=True).fill('bonete volante')
        card = page.locator('.simple-pattern-card').filter(has_text='Bonete con volante')
        card.wait_for()
        assert card.count() == 1, 'Las variantes deben permanecer en una tarjeta'
        card.click()
    else:
        page.goto(BASE + '/#/biblioteca/' + model_id, wait_until='networkidle')
    page.get_by_role('button', name='Intervenir', exact=True).click()
    dialog = page.get_by_role('dialog')
    if variant:
        dialog.locator('#variant-' + variant[0]).select_option(value=json.dumps(variant[1]))
    size = dialog.locator('#simple-child-size')
    if size.count():
        options = size.locator('option').evaluate_all('(els)=>els.map(o=>o.value)')
        if 'B6-9' in options:
            size.select_option('B6-9')
        elif len(options) > 1:
            size.select_option(options[1])
    page.get_by_role('button', name='Colocar extras', exact=True).click()
    page.wait_for_url('**/#/personalizar/**')
    project_id = page.url.rsplit('/', 1)[-1]
    page.locator('.customize-art > svg').wait_for()
    state = project_state(page, project_id)
    assert_pattern(state)
    if variant == ('volante', 'doble'):
        assert state['project']['modelId'] == 'bonete-volante-doble', state['project']['modelId']
    else:
        assert state['project']['modelId'] == model_id, state['project']['modelId']
    no_overflow(page)
    return project_id


def inspect_assembly(page, project_id):
    return page.evaluate('''async id=>{
      const {useApp}=await import('/src/store/app.ts');
      const {buildAssembly}=await import('/src/features/simple/assembled.ts');
      const project=useApp.getState().projects[id];
      return buildAssembly(project).map(scene=>({id:scene.id,label:scene.label,
        surfaces:scene.surfaces.map(s=>({id:s.id,viewId:s.viewId,pieceId:s.pieceId,label:s.label,matrix:s.matrix}))}));
    }''', project_id)


def select_apron_body(page, project_id):
    page.locator('.finish-art > svg').scroll_into_view_if_needed()
    point = page.evaluate('''async id=>{
      const {useApp}=await import('/src/store/app.ts');
      const {buildAssembly,assemblyPoint}=await import('/src/features/simple/assembled.ts');
      const project=useApp.getState().projects[id],svg=document.querySelector('.finish-art > svg');
      const scene=buildAssembly(project).find(s=>s.id===svg.querySelector('[data-assembly-view]').dataset.assemblyView);
      for(const surface of scene.surfaces.filter(s=>s.pieceId==='delantal')) {
        const b=surface.physicalBounds;
        for(const fy of [.55,.7,.4,.8])for(const fx of [.5,.3,.7]) {
          const physical={x:b.minX+(b.maxX-b.minX)*fx,y:b.minY+(b.maxY-b.minY)*fy};
          const at=assemblyPoint(surface,physical),p=new DOMPoint(at.x,at.y).matrixTransform(svg.getScreenCTM());
          if(document.elementFromPoint(p.x,p.y)?.closest('[data-assembly-surface]')?.getAttribute('data-assembly-surface')===surface.id)return {x:p.x,y:p.y};
        }
      }
      return null;
    }''', project_id)
    assert point, 'No hay un área visible del cuerpo del delantal para tocar'
    page.touchscreen.tap(point['x'], point['y'])


def finish(page, project_id, motifs=False):
    scenes = inspect_assembly(page, project_id)
    assert scenes and all(scene['surfaces'] for scene in scenes), scenes
    assert all(all(isinstance(n, (int, float)) for n in s['matrix']) for sc in scenes for s in sc['surfaces'])
    side_buttons = page.get_by_role('group', name='Lado de la prenda', exact=True).get_by_role('button')
    for i in range(side_buttons.count()):
        side_buttons.nth(i).click()
        assert page.locator('[data-assembly-surface]').count() > 0
    if side_buttons.count():
        side_buttons.first.click()
    page.get_by_role('button', name='Elegir telas', exact=True).click()
    page.get_by_role('button', name='Elegir tela o color', exact=True).click()
    page.get_by_role('button', name='Color #24584A', exact=True).click()
    page.get_by_role('button', name='Continuar a bordados', exact=True).click()
    if motifs:
        for query, name, motif_id, side in [('cerezas', 'Agregar cerezas', 'cerezas', 'Frente'), ('panda', 'Agregar panda', 'panda-amigo', 'Espalda')]:
            page.get_by_role('group', name='Vista del diseño', exact=True).get_by_role('button', name=side, exact=True).click()
            select_apron_body(page, project_id)
            page.get_by_role('button', name='Añadir bordado o letras', exact=True).click()
            dialog = page.get_by_role('dialog', name='Bordados y letras', exact=True)
            dialog.get_by_role('textbox', name='Buscar bordados', exact=True).fill(query)
            assert dialog.get_by_role('button', name=name, exact=True).count() == 1
            dialog.locator('#embroidery-width').fill('3')
            dialog.locator('#embroidery-width').press('Enter')
            dialog.get_by_role('button', name=name, exact=True).click()
            page.get_by_role('dialog', name='Bordados y letras', exact=True).wait_for(state='hidden')
            state = project_state(page, project_id)
            root = next(e for e in state['project']['design']['elements'] if e.get('embroidery', {}).get('motifId') == motif_id)
            assert abs(root['w'] - 30) < 1e-6, root
            assert page.locator('[data-assembly-element="' + root['id'] + '"]').count() == 1
            handle = page.get_by_role('button', name='Mover bordado seleccionado', exact=True)
            assert handle.is_visible()
            # The apron is a single physical piece folded over the shoulders:
            # front is below its shoulder line; back is above, with inverted Y.
            apron = next(piece for piece in state['pieces'] if piece['id'] == 'delantal')
            shoulder = next(line for line in apron['lines'] if line['id'] == 'hombro')['a']['y']
            physical_view = next(v for v in state['project']['design']['views'] if v['id'] == root['viewId'])
            assert physical_view['source']['pieceId'] == 'delantal', root
            axes = page.locator('[data-assembly-element="' + root['id'] + '"]').evaluate('(e)=>{const m=e.transform.baseVal.consolidate().matrix;return {a:m.a,d:m.d};}')
            assert axes['a'] > 0 and axes['d'] > 0, 'El motivo debe mantenerse derecho en ambos lados'
            if side == 'Frente':
                assert root['y'] - root['h'] / 2 >= shoulder, (side, root, shoulder)
            else:
                assert root['y'] + root['h'] / 2 <= shoulder, (side, root, shoulder)
            page.locator('.finish-art > svg').scroll_into_view_if_needed()
            box = handle.bounding_box()
            start = {'x': box['x'] + box['width'] / 2, 'y': box['y'] + box['height'] / 2}
            drag(page, page.context, start, {'x': start['x'], 'y': start['y'] + 8}, touch=True)
            moved = next(e for e in project_state(page, project_id)['project']['design']['elements'] if e['id'] == root['id'])
            assert moved['y'] > root['y'] if side == 'Frente' else moved['y'] < root['y'], (side, root, moved)
            assert abs(moved['w'] - root['w']) < 1e-6 and abs(moved['h'] - root['h']) < 1e-6, (root, moved)
            assert moved['assemblySurfaceId'] == root['assemblySurfaceId']
    state = project_state(page, project_id)
    assert_pattern(state)
    no_overflow(page)
    return state, scenes


def inspect_pdf(path, expected_pieces, motifs=False):
    pdf = pymupdf.open(path)
    manifest = json.loads(pdf.embfile_get('confeccion.json'))
    assert {p['id'] for p in manifest['pieces']} == {p['id'] for p in expected_pieces}
    assert all(p['wMm'] > 0 and p['hMm'] > 0 for p in manifest['pieces'])
    section = next(s for s in manifest['sections'] if s['id'] == 'patron')
    bars = [round(d['rect'].width * 25.4 / 72, 3) for d in pdf[section['startPage'] - 1].get_drawings() if d.get('fill') is not None]
    assert bars[:2] == [50.0, 100.0], bars
    text = '\n'.join(p.get_text() for p in pdf)
    if motifs:
        assert 'Cerezas' in text and 'Panda' in text
        embroidery = [s for s in manifest['sections'] if s['id'].startswith('bordado-')]
        assert embroidery, manifest['sections']
        colors = {tuple(d['fill']) for s in embroidery for p in pdf[s['startPage']:s['endPage']] for d in p.get_drawings() if d.get('fill') is not None}
        assert len(colors) >= 4, colors
    assert any('/PrintScaling /None' in pdf.xref_object(i) for i in range(1, pdf.xref_length()))
    return {'pages': len(pdf), 'pieces': len(manifest['pieces']), 'controls': bars[:2]}


def run(browser, model_id, *, variant=None, from_catalog=False, motifs=False):
    context = browser.new_context(viewport={'width': 390, 'height': 844}, is_mobile=True, has_touch=True, accept_downloads=True)
    page = context.new_page()
    errors = []
    page.on('pageerror', lambda error: errors.append(str(error)))
    project_id = start(page, model_id, variant, from_catalog)
    state, scenes = finish(page, project_id, motifs)
    page.evaluate('window.scrollTo(0,0)')
    page.screenshot(path=f'/tmp/hilvana-handoff-{model_id}.png', full_page=True)
    page.evaluate('async()=>await window.__hilvanaQaApp.getState().saveNow()')
    page.reload(wait_until='networkidle')
    page.get_by_role('button', name='Continuar a bordados', exact=True).click()
    restored = project_state(page, project_id)
    assert restored['project']['design'] == state['project']['design']
    assert restored['project']['pattern'] == state['project']['pattern']
    page.get_by_role('button', name='Generar patrones', exact=True).click()
    button = page.get_by_role('button', name='Descargar PDF completo', exact=True)
    button.wait_for()
    assert button.is_enabled(), page.get_by_role('dialog').inner_text()
    with page.expect_download(timeout=60000) as dl:
        button.click()
    path = f'/tmp/hilvana-handoff-{model_id}.pdf'
    dl.value.save_as(path)
    result = inspect_pdf(path, state['pieces'], motifs)
    assert not errors, errors
    print('PASS', model_id, result, 'scenes', [(s['label'], len(s['surfaces'])) for s in scenes], flush=True)
    context.close()


if __name__ == '__main__':
    with sync_playwright() as p:
        browser = p.chromium.launch(executable_path='/usr/bin/chromium', args=['--no-sandbox'])
        try:
            run(browser, 'bonete-volante', variant=('volante', 'doble'), from_catalog=True)
            run(browser, 'delantal-pichi', motifs=True)
            run(browser, 'mono-pico-volantes')
            run(browser, 'peto-infantil-largo')
            run(browser, 'blusa-trapecio-volante')
            run(browser, 'conjunto-vichy')
        finally:
            browser.close()
