"""Diseño completo → material único → detalles → bordados por cara → PDF físico.

Usa el navegador real y solo importa módulos para inspeccionar la geometría.
HILVANA_TEST_URL permite cambiar el Vite local. Requiere Chromium y PyMuPDF.
"""
import os

from playwright.sync_api import sync_playwright
from simple_journey_smoke import assert_pattern, drag, no_overflow, project_state, start_from_model, verify_pdf, world_point

BASE = os.environ.get('HILVANA_TEST_URL', 'http://localhost:5173').rstrip('/')


def projected_point(page, project_id, element, dx=0, dy=0):
    return page.evaluate('''async args=>{
      const {useApp}=await import('/src/store/app.ts');
      const {buildAssembly,assemblySurfaceForElement,assemblyPoint}=await import('/src/features/simple/assembled.ts');
      const project=useApp.getState().projects[args.id];
      const scene=buildAssembly(project).find(s=>s.id===document.querySelector('[data-assembly-view]').dataset.assemblyView);
      const surface=assemblySurfaceForElement(scene,project,args.element);
      const p=assemblyPoint(surface,{x:args.element.x+args.dx,y:args.element.y+args.dy});
      const q=new DOMPoint(p.x,p.y).matrixTransform(document.querySelector('.finish-art svg').getScreenCTM());
      return {x:q.x,y:q.y};
    }''', {'id': project_id, 'element': element, 'dx': dx, 'dy': dy})


def run(browser, width):
    context = browser.new_context(viewport={'width': width, 'height': 844 if width < 500 else 1000},
                                  has_touch=width < 500, is_mobile=width < 500, accept_downloads=True)
    page = context.new_page()
    errors = []
    page.on('pageerror', lambda error: errors.append(str(error)))
    project_id = start_from_model(page, 'coleccion-sudadera-660-540-260-capucha')
    page.get_by_role('textbox', name='Buscar extras', exact=True).fill('bolsillo cargo')
    page.get_by_role('button', name='Agregar bolsillo cargo', exact=True).click()
    page.get_by_role('button', name='Elegir telas', exact=True).click()
    page.wait_for_url('**/#/acabados/**')
    page.get_by_role('heading', name='Telas y colores', exact=True).wait_for()
    assert page.locator('.finish-art').get_attribute('data-preview') == 'diseno'
    assert page.locator('[data-assembly-surface]').count() >= 3
    sides = page.get_by_role('group', name='Vista del diseño', exact=True)
    assert sides.get_by_role('button', name='Frente', exact=True).count() == 1
    assert sides.get_by_role('button', name='Espalda', exact=True).count() == 1
    assert page.get_by_role('button', name='Continuar a bordados', exact=True).is_disabled()
    assert page.get_by_role('button', name='Generar patrones', exact=True).count() == 0
    page.get_by_role('button', name='Elegir tela o color', exact=True).click()
    page.get_by_role('dialog', name='Todo el diseño', exact=True).wait_for()
    page.get_by_role('button', name='Color #24584A', exact=True).click()
    state = project_state(page, project_id)
    fills = list(state['project']['design']['materialChoices'].values())
    assert fills and all(fill.get('color') == '#24584A' for fill in fills), fills
    pocket = state['project']['pattern']['components'][0]
    assert pocket['materials']['cuerpo']['color'] == '#24584A'
    assert page.get_by_role('button', name='Continuar a bordados', exact=True).is_enabled()
    page.get_by_text('Cambiar una parte o bolsillo', exact=True).click()
    part = page.get_by_role('button', name='Elegir color o tela: Bolsillo cargo · cuerpo', exact=True)
    part.click()
    page.get_by_role('button', name='Color #DFAE29', exact=True).click()
    state = project_state(page, project_id)
    assert state['project']['pattern']['components'][0]['materials']['cuerpo']['color'] == '#DFAE29'
    assert any(fill.get('color') == '#24584A' for fill in state['project']['design']['materialChoices'].values())
    page.locator('.finish-art svg').scroll_into_view_if_needed()
    flap = page.locator('[data-assembly-part="componente-' + pocket['id'] + '--solapa"] path').first
    point = flap.evaluate('e=>{const b=e.getBoundingClientRect();return {x:b.x+b.width*.2,y:b.y+b.height*.25};}')
    page.mouse.click(point['x'], point['y'])
    page.get_by_role('dialog', name='Bolsillo cargo · solapa', exact=True).wait_for()
    page.get_by_role('button', name='Color #B4273A', exact=True).click()
    parts = project_state(page, project_id)['project']['pattern']['components'][0]['materials']
    assert parts['solapa']['color'] == '#B4273A' and parts['cuerpo']['color'] == '#DFAE29', parts
    page.get_by_role('button', name='Continuar a bordados', exact=True).click()
    page.get_by_role('heading', name='Tu diseño y sus bordados', exact=True).wait_for()
    page.get_by_role('button', name='Añadir bordado o letras', exact=True).click()
    page.get_by_role('textbox', name='Buscar bordados', exact=True).fill('abejita')
    page.get_by_role('button', name='Agregar abeja', exact=True).click()
    state = project_state(page, project_id)
    bee = next(e for e in state['project']['design']['elements'] if e.get('embroidery', {}).get('motifId') == 'abeja')
    assert bee['assemblySurfaceId'].startswith('armado-frente/'), bee
    assert page.locator('[data-assembly-element="' + bee['id'] + '"]').count() == 1
    page.locator('.finish-art svg').scroll_into_view_if_needed()
    start = projected_point(page, project_id, bee)
    end = projected_point(page, project_id, bee, 30, 35)
    drag(page, context, start, end, touch=width < 500)
    moved = next(e for e in project_state(page, project_id)['project']['design']['elements'] if e['id'] == bee['id'])
    assert abs(moved['x'] - bee['x'] - 30) < .1 and abs(moved['y'] - bee['y'] - 35) < .1, (bee, moved)
    assert abs(moved['w'] - bee['w']) < .001 and abs(moved['h'] - bee['h']) < .001
    page.locator('#embroidery-width').fill('8')
    page.locator('#embroidery-width').press('Enter')
    resized = next(e for e in project_state(page, project_id)['project']['design']['elements'] if e['id'] == bee['id'])
    assert abs(resized['w'] - 80) < .01, resized
    sides.get_by_role('button', name='Espalda', exact=True).click()
    assert page.locator('[data-assembly-element="' + bee['id'] + '"]').count() == 0
    page.get_by_role('button', name='Añadir bordado o letras', exact=True).click()
    page.get_by_role('button', name='Letras y números', exact=True).click()
    page.get_by_role('textbox', name='Texto para bordar', exact=True).fill('B8 Año')
    page.get_by_role('button', name='Manuscrita', exact=True).click()
    page.get_by_label('Color del texto bordado', exact=True).fill('#B4273A')
    page.get_by_role('button', name='Agregar texto', exact=True).click()
    state = project_state(page, project_id)
    letters = next(e for e in state['project']['design']['elements'] if e.get('embroidery', {}).get('kind') == 'lettering')
    assert letters['assemblySurfaceId'].startswith('armado-espalda/'), letters
    assert page.locator('[data-assembly-element="' + letters['id'] + '"]').count() == 1
    page.get_by_role('button', name='Eliminar bordado seleccionado', exact=True).click()
    assert not any(e['id'] == letters['id'] for e in project_state(page, project_id)['project']['design']['elements'])
    page.get_by_role('button', name='Deshacer', exact=True).click()
    state = project_state(page, project_id)
    assert any(e['id'] == letters['id'] for e in state['project']['design']['elements'])
    assert_pattern(state)
    no_overflow(page)
    page.evaluate('window.scrollTo(0,0)')
    page.screenshot(path=f'/tmp/hilvana-whole-finishes-{width}.png', full_page=True)
    page.evaluate('async()=>await window.__hilvanaQaApp.getState().saveNow()')
    page.reload(); page.wait_for_load_state('networkidle')
    page.get_by_role('button', name='Continuar a bordados', exact=True).click()
    restored = project_state(page, project_id)
    assert restored['project']['design'] == state['project']['design']
    page.get_by_role('button', name='Generar patrones', exact=True).click()
    download = page.get_by_role('button', name='Descargar PDF completo', exact=True)
    download.wait_for()
    assert download.is_enabled()
    if width == 390:
        with page.expect_download(timeout=90000) as pending:
            download.click()
        path = '/tmp/hilvana-whole-design.pdf'
        pending.value.save_as(path)
        verify_pdf(path, state['pieces'], expect_placement=True, expect_embroidery=True)
    no_overflow(page)
    assert not errors, errors
    print(f'Diseño completo {width}px: extras, material global/por parte, bordados por cara, arrastre físico, borrar/deshacer, persistencia y PDF PASS')
    context.close()


def same_piece_keeps_side(browser):
    """Cambiar a la vista técnica no convierte una pierna izquierda en derecha."""
    context = browser.new_context(viewport={'width': 1440, 'height': 1000})
    page = context.new_page()
    page.goto(BASE); page.wait_for_load_state('networkidle')
    fixture = page.evaluate('''async()=>{
      const {useApp}=await import('/src/store/app.ts');
      const {findModel}=await import('/src/data/catalog.ts');
      const {projectFromModel}=await import('/src/store/projects.ts');
      const {prepareSimpleProject}=await import('/src/features/simple/workflow.ts');
      const {quickSize}=await import('/src/lib/sizes/quickSizes.ts');
      const {profileFromSize}=await import('/src/store/profiles.ts');
      const {buildAssembly,firstFittingAssemblyPosition}=await import('/src/features/simple/assembled.ts');
      const {basePanelPattern}=await import('/src/features/studio/panelWorkflow.ts');
      const {COMPONENT_OPTIONS,createComponent}=await import('/src/data/components.ts');
      const {syncComponentDesign}=await import('/src/features/customize/componentDesign.ts');
      const size=quickSize('mujer','mediana');
      let project=prepareSimpleProject(projectFromModel(findModel('jogger'),profileFromSize(size.table,size.row)));
      const surface=buildAssembly(project)[0].surfaces.filter(s=>s.pieceId==='delantero')[1];
      const pocket={...createComponent(COMPONENT_OPTIONS.find(o=>o.kind==='bolsillo-parche'),'qa-side',surface.view),width:70,height:80};
      const component=firstFittingAssemblyPosition(pocket,surface,basePanelPattern(project).pieces);
      project=syncComponentDesign({...project,pattern:{...project.pattern,components:[component]}});
      useApp.getState().put('project',project);location.hash='/personalizar/'+project.id;
      return {id:project.id,component};
    }''')
    page.get_by_role('group', name='Extras añadidos').get_by_role('button').first.click()
    page.get_by_role('button', name='Ver piezas del patrón', exact=True).click()
    page.locator('.customize-art svg').scroll_into_view_if_needed()
    before = fixture['component']['placement']
    drag(page, context, world_point(page, '.customize-art svg', before['x'], before['y']),
         world_point(page, '.customize-art svg', before['x'] + 10, before['y'] + 20))
    after = project_state(page, fixture['id'])['project']['pattern']['components'][0]['placement']
    assert abs(after['x'] - before['x'] - 10) < .1 and abs(after['y'] - before['y'] - 20) < .1
    assert after.get('assemblySurfaceId') == before['assemblySurfaceId'], (before, after)
    assert after.get('assemblySurfaceLabel') == before['assemblySurfaceLabel'], (before, after)
    page.get_by_role('button', name='Volver a la prenda completa', exact=True).click()
    assert page.locator('[data-assembly-surface="' + before['assemblySurfaceId'] + '"] [data-assembly-element]').count() == 1
    page.get_by_role('button', name='Elegir telas', exact=True).click()
    page.get_by_role('button', name='Elegir tela o color', exact=True).click()
    page.get_by_role('button', name='Color #F3E9D2', exact=True).click()
    page.get_by_role('button', name='Continuar a bordados', exact=True).click()
    position = page.evaluate('''async args=>{
      const {buildAssembly,assemblyPoint}=await import('/src/features/simple/assembled.ts');
      const scene=buildAssembly(window.__hilvanaQaApp.getState().projects[args.id])[0];
      const s=scene.surfaces.find(s=>s.id===args.surface),b=s.physicalBounds;
      const point=assemblyPoint(s,{x:(b.minX+b.maxX)/2,y:b.minY+(b.maxY-b.minY)*.7});
      const p=new DOMPoint(point.x,point.y).matrixTransform(document.querySelector('.finish-art svg').getScreenCTM());
      return {x:p.x,y:p.y};
    }''', {'id': fixture['id'], 'surface': before['assemblySurfaceId']})
    page.mouse.click(position['x'], position['y'])
    page.get_by_role('button', name='Añadir bordado o letras', exact=True).click()
    page.get_by_role('button', name='Letras y números', exact=True).click()
    page.get_by_role('textbox', name='Texto para bordar', exact=True).fill('Hilvana')
    page.get_by_role('button', name='Agregar texto', exact=True).click()
    state = project_state(page, fixture['id'])
    letters = next(e for e in state['project']['design']['elements'] if e.get('embroidery', {}).get('kind') == 'lettering')
    assert letters['assemblySurfaceId'] == before['assemblySurfaceId']
    determinant = page.locator('[data-assembly-element="' + letters['id'] + '"] path').first.evaluate('e=>{const m=e.getCTM();return m.a*m.d-m.b*m.c;}')
    assert determinant > 0, 'La proyección de la pierna reflejó las letras: ' + str(determinant)
    assert letters['flipX'] is False and letters['rotation'] == 0
    page.screenshot(path='/tmp/hilvana-whole-readable-lettering.png', full_page=True)
    context.close()
    print('Vista de piezas conserva pierna izquierda; letras legibles sobre copia espejo sin invertir la plantilla PASS')


if __name__ == '__main__':
    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(executable_path='/usr/bin/chromium', args=['--no-sandbox'])
        try:
            for width in (320, 390, 1440):
                run(browser, width)
            same_piece_keeps_side(browser)
        finally:
            browser.close()
