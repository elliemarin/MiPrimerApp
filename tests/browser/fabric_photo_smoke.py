"""Prueba móvil de foto como material: npm run dev; python tests/browser/fabric_photo_smoke.py.
Requiere Python Playwright y Chromium; HILVANA_URL permite otro puerto. Contexto limpio.
"""
from playwright.sync_api import sync_playwright
import os, zlib, struct

def png(w,h):
 def chunk(name,data):return struct.pack('!I',len(data))+name+data+struct.pack('!I',zlib.crc32(name+data)&0xffffffff)
 raw=b''.join(b'\x00'+b''.join(bytes((180,40,80,255)) if x<w//2 else bytes((20,100,150,255)) for x in range(w)) for _ in range(h))
 return b'\x89PNG\r\n\x1a\n'+chunk(b'IHDR',struct.pack('!IIBBBBB',w,h,8,6,0,0,0))+chunk(b'IDAT',zlib.compress(raw))+chunk(b'IEND',b'')
with sync_playwright() as p:
 browser=p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 context=browser.new_context(viewport={'width':390,'height':844},has_touch=True,is_mobile=True)
 page=context.new_page(); errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 page.goto(os.environ.get('HILVANA_URL', 'http://localhost:5173'));page.wait_for_load_state('networkidle')
 pid=page.evaluate('''async()=>{const {useApp}=await import('/src/store/app.ts');const {projectFromModel}=await import('/src/store/projects.ts');const {findModel}=await import('/src/data/catalog.ts');const p=projectFromModel(findModel('camiseta-basica'));useApp.getState().put('project',p);await useApp.getState().saveNow();location.hash='/estudio/'+p.id;return p.id;}''')
 page.get_by_role('button',name='Telas',exact=True).last.click()
 with page.expect_file_chooser() as fc:
  page.get_by_role('button',name='Elegir del carrete',exact=True).click()
 fc.value.set_files({'name':'Mi tela rayada.png','mimeType':'image/png','buffer':png(400,300)})
 page.get_by_role('button',name='Mi tela rayada',exact=True).wait_for()
 assert page.get_by_role('button',name='Mi tela rayada',exact=True).get_attribute('aria-pressed')=='true'
 assert page.get_by_role('button',name='Tomar foto',exact=True).is_visible()
 assert page.locator('input[capture=environment]').count()==1
 fabric=page.evaluate('''async()=>{const {useApp}=await import('/src/store/app.ts');return Object.values(useApp.getState().fabrics).find(f=>f.name==='Mi tela rayada');}''')
 assert fabric['photo']['originalFileId']!=fabric['photo']['processedFileId']
 assert 'calibration' not in fabric and fabric['color']=='#644673'
 page.get_by_role('button',name='Cerrar telas').click()
 # Apply photo at true path center, avoid empty sleeves / top borders.
 point=page.evaluate('''()=>{const path=[...document.querySelectorAll('.ed-canvas .board > g path')].find(p=>p.getAttribute('fill')==='#ffffff'); const b=path.getBoundingClientRect();return {x:b.x+b.width*.5,y:b.y+b.height*.5};}''')
 page.touchscreen.tap(point['x'],point['y']);page.wait_for_timeout(200)
 page.get_by_role('button',name='Ajustar tela de',exact=False).click()
 page.get_by_role('button',name='Ajustar imagen a esta parte',exact=True).click()
 fitted=page.evaluate("""async()=>{const {useApp}=await import('/src/store/app.ts');return Object.values(useApp.getState().projects)[0].design.views[0].zoneFills;}""")
 assert any(f.get('scale')!=1 for f in fitted.values()), fitted
 page.screenshot(path='/tmp/fabric-photo-fit-mobile.png')
 page.get_by_role('button',name='Cerrar',exact=True).last.click()
 state=page.evaluate('''async()=>{const {useApp}=await import('/src/store/app.ts');await useApp.getState().saveNow();const p=Object.values(useApp.getState().projects)[0];return p.design.views[0].zoneFills;}''')
 assert state and any(f.get('fabricId')==fabric['id'] for f in state.values())
 page.reload();page.wait_for_load_state('networkidle')
 page.locator('[role=toolbar][aria-label=Herramientas]:visible').get_by_role('button',name='Más',exact=True).click()
 page.get_by_role('button',name='Ver en figurín',exact=True).click()
 assert page.locator('svg image[href^="blob:"]').count()>0
 page.screenshot(path='/tmp/photos-fabric-mobile-figurin.png')
 with page.expect_download() as download:
  page.get_by_role('button',name='Descargar ilustración',exact=True).click()
 download.value.save_as('/tmp/hilvana-foto-figurin.svg')
 from pathlib import Path
 svg=Path('/tmp/hilvana-foto-figurin.svg').read_text()
 assert 'href="blob:' not in svg and 'data:image/png;base64,' in svg, 'El SVG debe incluir la foto sin depender del navegador'
 assert 'viewBox="0 0 400 680"' in svg
 page.get_by_role('button',name='Cerrar',exact=True).last.click()
 page.get_by_role('button',name='Telas',exact=True).last.click()
 page.get_by_role('button',name='Mis telas',exact=True).click()
 page.get_by_role('button',name='Mi tela rayada',exact=True).click()
 page.get_by_role('button',name='Recortar y calibrar',exact=True).click()
 page.get_by_role('heading',name='1. Recorta la muestra',exact=True).wait_for()
 assert page.locator('svg image[href^="blob:"]').count()>0
 assert not page.evaluate('document.documentElement.scrollWidth>innerWidth')
 assert not errors,errors
 print('Photo import camera/upload, separate original+PNG, color, zone fill, persistence, figurine and crop/calibration route PASS; browser errors:',errors)
 browser.close()
