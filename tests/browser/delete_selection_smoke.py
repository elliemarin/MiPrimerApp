"""Dev: insertar figura y borrarla desde la basurita visible en móvil.
Requiere Python Playwright y Chromium. HILVANA_TEST_URL permite otro servidor.
Usa un contexto limpio: no toca los datos del navegador habitual.
"""
import os
from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True, executable_path='/usr/bin/chromium', args=['--no-sandbox'])
    context = browser.new_context(viewport={'width': 390, 'height': 844}, has_touch=True, is_mobile=True)
    page = context.new_page()
    errors = []
    page.on('pageerror', lambda error: errors.append(str(error)))
    page.goto(os.environ.get('HILVANA_TEST_URL', 'http://localhost:5173'))
    page.wait_for_load_state('networkidle')
    page.evaluate('''async () => {
        const {useApp} = await import('/src/store/app.ts');
        const {projectFromModel} = await import('/src/store/projects.ts');
        const {findModel} = await import('/src/data/catalog.ts');
        const {newElement} = await import('/src/features/studio/model.ts');
        const project = projectFromModel(findModel('cojin'));
        project.design.elements = [newElement(project.design.views[0].id, {
            id:'qa-conservar', name:'Figura que se conserva', x:-120, y:-120, w:50, h:50,
            shape:{type:'rect'}, fill:{type:'color',color:'#c0582d'}
        })];
        useApp.getState().put('project',project);
        await useApp.getState().saveNow();
        window.__deleteQA = {store:useApp, projectId:project.id};
        location.hash = '/estudio/' + project.id;
    }''')
    page.locator('.ed-bottom').get_by_role('button', name='Más', exact=True).tap()
    page.get_by_text('Dibujo y ajustes', exact=True).tap()
    page.get_by_role('button', name='Figuras', exact=True).tap()
    page.get_by_role('textbox', name='Buscar figuras').fill('estrella')
    page.get_by_role('button', name='Estrella', exact=True).tap()
    board = page.locator('.ed-canvas')
    bounds = board.bounding_box()
    page.touchscreen.tap(bounds['x'] + bounds['width'] * .6, bounds['y'] + bounds['height'] * .5)
    trash = page.get_by_role('button', name='Eliminar figura seleccionada', exact=True)
    trash.wait_for(state='visible')
    assert trash.is_enabled()
    button_bounds = trash.bounding_box()
    assert button_bounds['x'] >= 0 and button_bounds['x'] + button_bounds['width'] <= 390
    assert button_bounds['y'] >= 0 and button_bounds['y'] + button_bounds['height'] <= 844
    before = page.evaluate('''() => {
        const q=window.__deleteQA, project=q.store.getState().projects[q.projectId];
        return {ids:project.design.elements.map(e=>e.id), transform:document.querySelector('.ed-canvas .board>g[transform]').getAttribute('transform')};
    }''')
    assert len(before['ids']) == 2 and 'qa-conservar' in before['ids']
    inserted_id = next(id for id in before['ids'] if id != 'qa-conservar')
    page.screenshot(path='/tmp/hilvana-delete-selected.png')
    trash.tap()
    page.wait_for_function('''id => {
        const q=window.__deleteQA;
        return !q.store.getState().projects[q.projectId].design.elements.some(e=>e.id===id);
    }''', arg=inserted_id)
    after = page.evaluate('''() => {
        const q=window.__deleteQA, project=q.store.getState().projects[q.projectId];
        return {ids:project.design.elements.map(e=>e.id), transform:document.querySelector('.ed-canvas .board>g[transform]').getAttribute('transform')};
    }''')
    assert after['ids'] == ['qa-conservar'], after
    assert after['transform'] == before['transform'], 'La basurita no debe desplazar el lienzo.'
    assert trash.count() == 0, 'No debe quedar una acción de selección obsoleta tras eliminar.'
    page.get_by_role('button', name='Deshacer', exact=True).tap()
    page.wait_for_function('''id => {
        const q=window.__deleteQA;
        return q.store.getState().projects[q.projectId].design.elements.some(e=>e.id===id);
    }''', arg=inserted_id)
    page.get_by_role('button', name='Rehacer', exact=True).tap()
    page.wait_for_function('''id => {
        const q=window.__deleteQA;
        return !q.store.getState().projects[q.projectId].design.elements.some(e=>e.id===id);
    }''', arg=inserted_id)
    page.evaluate('''async()=>{await window.__deleteQA.store.getState().saveNow();}''')
    page.reload()
    page.wait_for_load_state('networkidle')
    page.locator('.ed-bottom').get_by_role('button', name='Mover', exact=True).wait_for(state='visible')
    persisted = page.evaluate('''async()=>{
        const {useApp}=await import('/src/store/app.ts');
        return Object.values(useApp.getState().projects)[0].design.elements.map(e=>e.id);
    }''')
    assert persisted == ['qa-conservar'], persisted
    assert not page.evaluate('document.documentElement.scrollWidth>innerWidth')
    assert not errors, errors
    print('Móvil390×844: insertar→basurita táctil→eliminar solo seleccionada→deshacer/rehacer→persistir PASS; errores:', errors)
    browser.close()
