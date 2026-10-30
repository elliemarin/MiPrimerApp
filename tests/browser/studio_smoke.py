"""Smoke de desarrollo: npm run dev; python tests/browser/studio_smoke.py (requiere Python Playwright y Chromium).
Usa un contexto nuevo y no modifica los datos de tu navegador habitual.
"""
from playwright.sync_api import sync_playwright
import json, os
with sync_playwright() as p:
 b=p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 page=b.new_page(viewport={'width':1440,'height':1000})
 errors=[]
 page.on('pageerror',lambda e:errors.append(str(e)))
 page.goto('http://localhost:5173');page.wait_for_load_state('networkidle')
 pid=page.evaluate('''async()=>{const {useApp}=await import('/src/store/app.ts');const {projectFromModel}=await import('/src/store/projects.ts');const {findModel}=await import('/src/data/catalog.ts'); const p=projectFromModel(findModel('intervenir-pantalon'));useApp.getState().put('project',p);await useApp.getState().saveNow();location.hash='/estudio/'+p.id;return p.id;}''')
 page.get_by_role('button',name='Telas',exact=True).first.click();page.wait_for_timeout(200)
 page.screenshot(path='/tmp/hilvana-studio-desktop.png')
 print('initial samples',page.locator('.fabric-swatch').count())
 # Desktop native HTML drag on actual filled zone center in SVG world.
 target=page.evaluate('''async()=>{const {useApp}=await import('/src/store/app.ts');const p=Object.values(useApp.getState().projects)[0];return p.design.views[0].zones[0];}''')
 # SVG path's rendered bounding box is a reliable center for this simple pants zone.
 zone=page.locator('.ed-canvas .board > g path').filter(has_not=page.locator('nonexistent'))
 point=page.evaluate('''()=>{const paths=[...document.querySelectorAll('.ed-canvas .board > g path')];const path=paths.find(p=>p.getAttribute('fill')==='#ffffff');const b=path.getBoundingClientRect();return {x:b.x+b.width*.45,y:b.y+b.height*.65};}''')
 page.locator('.fabric-swatch').first.drag_to(page.locator('.ed-canvas'),target_position={'x':point['x']-page.locator('.ed-canvas').bounding_box()['x'],'y':point['y']-page.locator('.ed-canvas').bounding_box()['y']})
 page.wait_for_timeout(500)
 state=page.evaluate('''async()=>{const {useApp}=await import('/src/store/app.ts');const p=Object.values(useApp.getState().projects)[0];return {fills:p.design.views[0].zoneFills,fabricIds:p.fabricIds};}''')
 print('drag result',state)
 assert state.get('fills'), 'Fabric drag did not fill zone'
 page.get_by_role('button',name='Deshacer',exact=True).click();page.wait_for_timeout(100)
 assert not page.evaluate('''async()=>{const {useApp}=await import('/src/store/app.ts');return Object.values(useApp.getState().projects)[0].design.views[0].zoneFills;}''')
 page.get_by_role('button',name='Rehacer',exact=True).click()
 # Insert figure and resize through properties; assign fabric by target, then persist.
 page.get_by_role('button',name='Figuras',exact=True).first.click()
 page.get_by_role('textbox',name='Buscar figuras').fill('mariposa')
 page.get_by_role('button',name='Mariposa',exact=True).click()
 page.mouse.click(point['x'],point['y']);page.wait_for_timeout(200)
 print('figure inserted',page.evaluate('''async()=>{const {useApp}=await import('/src/store/app.ts');return Object.values(useApp.getState().projects)[0].design.elements.map(e=>({name:e.name,w:e.w}));}'''))
 awaitsave='''async()=>{const {useApp}=await import('/src/store/app.ts');await useApp.getState().saveNow();}'''
 page.evaluate(awaitsave);page.reload();page.wait_for_load_state('networkidle')
 assert page.evaluate('''async()=>{const {useApp}=await import('/src/store/app.ts');return !!Object.values(useApp.getState().projects)[0].design.views[0].zoneFills;}''')
 page.screenshot(path='/tmp/hilvana-studio-saved.png')
 # Mobile layout, touch drag from sample to zone via synthetic pointer touch CDP.
 page.set_viewport_size({'width':390,'height':844})
 page.get_by_role('button',name='Telas',exact=True).last.click();page.wait_for_timeout(200)
 page.screenshot(path='/tmp/hilvana-studio-mobile.png')
 print('overflow',page.evaluate('document.documentElement.scrollWidth>innerWidth'))
 assert not page.evaluate('document.documentElement.scrollWidth>innerWidth')
 print('console errors',errors)
 assert not errors
 b.close()
