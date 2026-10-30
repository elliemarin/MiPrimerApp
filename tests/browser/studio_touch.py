"""Smoke de desarrollo: npm run dev; python tests/browser/studio_touch.py (requiere Python Playwright y Chromium).
Usa un contexto nuevo y no modifica los datos de tu navegador habitual.
"""
from playwright.sync_api import sync_playwright
import math
with sync_playwright() as p:
 b=p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 context=b.new_context(viewport={'width':390,'height':844},has_touch=True,is_mobile=True,device_scale_factor=1)
 page=context.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 page.goto('http://localhost:5173');page.wait_for_load_state('networkidle')
 page.evaluate('''async()=>{const {useApp}=await import('/src/store/app.ts');const {projectFromModel}=await import('/src/store/projects.ts');const {findModel}=await import('/src/data/catalog.ts');const p=projectFromModel(findModel('intervenir-pantalon'));useApp.getState().put('project',p);await useApp.getState().saveNow();location.hash='/estudio/'+p.id;}''')
 page.wait_for_timeout(300)
 page.get_by_role('button',name='Telas',exact=True).last.click()
 page.wait_for_timeout(300)
 point=page.evaluate('''()=>{const paths=[...document.querySelectorAll('.ed-canvas .board > g path')];const path=paths.find(p=>p.getAttribute('fill')==='#ffffff');const b=path.getBoundingClientRect();return {x:b.x+b.width*.5,y:b.y+b.height*.6};}''')
 sample=page.locator('.fabric-swatch').first.bounding_box();start={'x':sample['x']+sample['width']/2,'y':sample['y']+25}
 cdp=context.new_cdp_session(page)
 def touch(t,pts):cdp.send('Input.dispatchTouchEvent',{'type':t,'touchPoints':[{'x':x,'y':y,'id':i} for i,(x,y) in enumerate(pts)]})
 touch('touchStart',[(start['x'],start['y'])])
 for i in range(1,7):touch('touchMove',[(start['x']+(point['x']-start['x'])*i/6,start['y']+(point['y']-start['y'])*i/6)])
 touch('touchEnd',[]);page.wait_for_timeout(500)
 page.screenshot(path='/tmp/hilvana-touch-drop.png'); fills=page.evaluate('''async()=>{const {useApp}=await import('/src/store/app.ts');return Object.values(useApp.getState().projects)[0].design.views[0].zoneFills;}''');print('touch dropped',fills);assert fills
 point['y']=500
 # Insert via touch, then choose element and spread two fingers inside its bounds.
 page.get_by_role('button',name='Figuras',exact=True).last.click()
 page.get_by_role('textbox',name='Buscar figuras').fill('estrella')
 page.get_by_role('button',name='Estrella',exact=True).click()
 page.touchscreen.tap(point['x'],point['y']);page.wait_for_timeout(250)
 getel='''async()=>{const {useApp}=await import('/src/store/app.ts');return Object.values(useApp.getState().projects)[0].design.elements[0];}'''
 before=page.evaluate(getel);assert before
 # physical 80mm shape may render small; touch one finger near center then two fingers offset.
 touch('touchStart',[(point['x']-2,point['y'])]);page.wait_for_timeout(50)
 touch('touchStart',[(point['x']-2,point['y']),(point['x']+3,point['y'])])
 touch('touchMove',[(point['x']-10,point['y']),(point['x']+11,point['y'])])
 touch('touchEnd',[]);page.wait_for_timeout(300)
 after=page.evaluate(getel);print('pinch width',before['w'],after['w']);assert after['w']>before['w']*1.5
 page.get_by_role('button',name='Cerrar telas').click()
 page.get_by_role('button',name='Ajustar a la vista').click()
 page.screenshot(path='/tmp/hilvana-touch.png')
 print('errors',errors);assert not errors
 b.close()
