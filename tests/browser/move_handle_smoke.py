"""Asa de extras: objetivo táctil fijo, movimiento físico y cambio de vista.

Requiere Vite, Python Playwright y Chromium. Importaciones de módulos solo para
crear una base reproducible y comprobar que el gesto no escala sus patrones.
"""
import os

from playwright.sync_api import sync_playwright
from simple_journey_smoke import drag, no_overflow

BASE = os.environ.get('HILVANA_TEST_URL', 'http://localhost:5173').rstrip('/')


def component(page, project_id):
    return page.evaluate('id=>window.__hilvanaQaApp.getState().projects[id].pattern.components[0]', project_id)


def vector(page, project_id, dx, dy):
    return page.evaluate('''async args=>{
      const {buildAssembly,assemblyPoint}=await import('/src/features/simple/assembled.ts');
      const project=window.__hilvanaQaApp.getState().projects[args.id],c=project.pattern.components[0];
      const svg=document.querySelector('.customize-art > svg'),m=svg.getScreenCTM();
      const sceneId=svg.querySelector('[data-assembly-view]')?.dataset.assemblyView;
      const surface=sceneId&&buildAssembly(project).find(s=>s.id===sceneId).surfaces.find(s=>s.id===c.placement.assemblySurfaceId);
      const first=surface?assemblyPoint(surface,c.placement):c.placement;
      const last=surface?assemblyPoint(surface,{x:c.placement.x+args.dx,y:c.placement.y+args.dy}):{x:first.x+args.dx,y:first.y+args.dy};
      return {x:m.a*(last.x-first.x)+m.c*(last.y-first.y),y:m.b*(last.x-first.x)+m.d*(last.y-first.y)};
    }''', {'id': project_id, 'dx': dx, 'dy': dy})


def move_selected(page, context, project_id, dx, dy, touch=False):
    handle = page.get_by_role('button', name='Mover extra seleccionado', exact=True)
    box = handle.bounding_box()
    assert abs(box['width']-48) < .01 and abs(box['height']-48) < .01, box
    start = {'x': box['x']+box['width']/2, 'y': box['y']+box['height']/2}
    delta = vector(page, project_id, dx, dy)
    before = component(page, project_id)
    drag(page, context, start, {'x': start['x']+delta['x'], 'y': start['y']+delta['y']}, touch=touch)
    after = component(page, project_id)
    assert abs(after['placement']['x']-before['placement']['x']-dx) < .2, (before, after)
    assert abs(after['placement']['y']-before['placement']['y']-dy) < .2, (before, after)
    assert after['width'] == before['width'] and after['height'] == before['height']
    assert after['placement']['assemblySurfaceId'] == before['placement']['assemblySurfaceId']


def run(browser, width):
    context = browser.new_context(viewport={'width': width, 'height': 844 if width < 500 else 1000}, has_touch=width < 500, is_mobile=width < 500)
    page = context.new_page()
    errors = []
    page.on('pageerror', lambda error: errors.append(str(error)))
    page.goto(BASE); page.wait_for_load_state('networkidle')
    fixture = page.evaluate('''async()=>{
      const {useApp}=await import('/src/store/app.ts');window.__hilvanaQaApp=useApp;
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
      const extra={...createComponent(COMPONENT_OPTIONS.find(o=>o.kind==='trabilla'),'qa-small-extra',surface.view),width:20,height:60};
      const component=firstFittingAssemblyPosition(extra,surface,basePanelPattern(project).pieces);
      if(!component) throw new Error('La trabilla de prueba debe caber en la pierna');
      project=syncComponentDesign({...project,pattern:{...project.pattern,components:[component]}});
      useApp.getState().put('project',project);location.hash='/personalizar/'+project.id;
      return {id:project.id,component};
    }''')
    page.get_by_role('group', name='Extras añadidos').get_by_role('button').first.click()
    page.locator('.customize-art > svg').scroll_into_view_if_needed()
    handle = page.get_by_role('button', name='Mover extra seleccionado', exact=True)
    handle.wait_for(state='visible')
    before = component(page, fixture['id'])
    handle.click()
    assert component(page, fixture['id']) == before, 'Seleccionar el asa no debe saltar ni guardar movimiento'
    move_selected(page, context, fixture['id'], 10, 20, touch=width < 500)
    page.get_by_role('button', name='Acercar zona', exact=True).click()
    move_selected(page, context, fixture['id'], -5, 5, touch=width < 500)
    page.get_by_role('button', name='Ver diseño completo', exact=True).click()
    page.get_by_role('button', name='Ver piezas del patrón', exact=True).click()
    page.locator('.customize-art > svg').scroll_into_view_if_needed()
    move_selected(page, context, fixture['id'], 10, 10, touch=width < 500)
    # Flechas usan píxeles de pantalla y preservan dimensiones y lado físico.
    before = component(page, fixture['id'])
    handle.focus(); handle.press('ArrowDown')
    after = component(page, fixture['id'])
    assert after['placement']['y'] > before['placement']['y']
    assert after['width'] == before['width'] and after['height'] == before['height']
    page.get_by_role('button', name='Volver a la prenda completa', exact=True).click()
    page.get_by_role('group', name='Lado de la prenda', exact=True).get_by_role('button', name='Espalda', exact=True).click()
    assert handle.count() == 0, 'No debe aparecer asa sobre otro lado'
    page.get_by_role('group', name='Extras añadidos').get_by_role('button').first.click()
    handle.wait_for(state='visible')
    # Redimensionar reproduce rotación de dispositivo / cambio de paneles.
    page.set_viewport_size({'width': width+40, 'height': 900})
    box = handle.bounding_box()
    canvas = page.locator('.customize-art > svg').bounding_box()
    assert box['x'] >= canvas['x'] and box['x']+box['width'] <= canvas['x']+canvas['width']+1
    assert box['y'] >= canvas['y'] and box['y']+box['height'] <= canvas['y']+canvas['height']+1
    assert box['width'] == 48 and box['height'] == 48
    no_overflow(page)
    page.screenshot(path=f'/tmp/hilvana-extra-move-handle-{width}.png', full_page=True)
    assert not errors, errors
    print(f'Asa de extras {width}px: tacto/ratón, espejo, zoom, piezas, flechas y resize PASS')
    context.close()


if __name__ == '__main__':
    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(executable_path='/usr/bin/chromium', args=['--no-sandbox'])
        try:
            for width in (390, 1440):
                run(browser, width)
        finally:
            browser.close()
