"""Con npm run dev activo: prueba descarga DST por vista y bloqueo por bastidor.
Requiere Python Playwright + Chromium. Usa un contexto limpio.
"""
from playwright.sync_api import sync_playwright
with sync_playwright() as p:
 b=p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 page=b.new_page(viewport={'width':390,'height':844}); errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 page.goto('http://localhost:5173');page.wait_for_load_state('networkidle')
 page.evaluate('''async()=>{const {useApp}=await import('/src/store/app.ts');const {projectFromModel}=await import('/src/store/projects.ts');const {findModel}=await import('/src/data/catalog.ts');const {newElement}=await import('/src/features/studio/model.ts');const p=projectFromModel(findModel('camiseta-basica'));p.design.elements=[newElement(p.design.views[0].id,{kind:'organica',organicId:'estrella',technique:'bordado',x:0,y:0,w:20,h:20}),newElement(p.design.views[1].id,{kind:'organica',organicId:'corazon',technique:'bordado',x:900,y:900,w:200,h:200})];useApp.getState().put('project',p);await useApp.getState().saveNow();location.hash='/proyectos/'+p.id+'/despiece';}''')
 page.get_by_text('Vista que vas a bordar',exact=True).wait_for()
 page.get_by_text('Vista que vas a bordar',exact=True).scroll_into_view_if_needed()
 dst=page.get_by_role('button',name='Descargar DST experimental',exact=True)
 assert dst.is_enabled()
 with page.expect_download() as info:dst.click()
 dl=info.value;dl.save_as('/tmp/test-hilvana-bordado.dst');assert dl.suggested_filename.endswith('-frente-bordado.dst')
 assert open('/tmp/test-hilvana-bordado.dst','rb').read(3)==b'LA:'
 page.get_by_label('Vista que vas a bordar',exact=True).select_option(label='Espalda')
 assert dst.is_disabled()
 page.get_by_label('Vista que vas a bordar',exact=True).select_option(label='Frente')
 page.evaluate('''async()=>{const {useApp}=await import('/src/store/app.ts');const {newElement}=await import('/src/features/studio/model.ts');const p=Object.values(useApp.getState().projects)[0];useApp.getState().updateProject(p.id,p=>({...p,design:{...p.design,elements:[...p.design.elements,newElement(p.design.views[0].id,{kind:'texto',technique:'bordado',text:{content:'Hola',font:'sans',weight:600}})]}}));}''')
 assert dst.is_disabled()
 assert page.get_by_role('button',name='Dibujo de bordado (SVG 1:1)',exact=True).is_disabled()
 print('DST por vista, bastidor y elementos no compatibles comprobados; errores:',errors)
 assert not errors
 b.close()
