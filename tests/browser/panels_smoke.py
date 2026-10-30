"""Dev: cut genuine garment piece in Studio, paint panels and export 1:1 patterns.
Requires Python Playwright, Chromium, PyMuPDF. HILVANA_TEST_URL optional.
"""
from playwright.sync_api import sync_playwright
import os, pymupdf
base=os.environ.get('HILVANA_TEST_URL','http://localhost:5173')
with sync_playwright() as p:
 b=p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 page=b.new_page(viewport={'width':390,'height':844});errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 page.goto(base+'/#/biblioteca/haori-corto');page.wait_for_load_state('networkidle')
 page.get_by_role('button',name='Intervenir',exact=True).click()
 page.get_by_role('button',name='Mediana',exact=True).click()
 page.get_by_role('button',name='Colocar extras',exact=True).click();page.wait_for_url('**/#/personalizar/**')
 pid=page.url.rsplit('/',1)[-1]
 page.goto(base+'/#/estudio/'+pid);page.wait_for_load_state('networkidle')
 page.locator('[role=toolbar][aria-label=Herramientas]:visible').get_by_role('button',name='Más',exact=True).click()
 page.get_by_text('Patrones y cortes',exact=True).click()
 page.get_by_role('button',name='Generar patrones de paneles',exact=True).click()
 page.get_by_role('button',name='Actualizar o abrir piezas reales',exact=True).click()
 page.wait_for_timeout(150)
 # Actual physical coordinates from the source piece; the drawing tool is operated with mouse/touch like a user.
 pts=page.evaluate('''async()=>{const {useApp}=await import('/src/store/app.ts');const {buildPattern}=await import('/src/lib/pattern/engine.ts');const p=Object.values(useApp.getState().projects)[0],piece=buildPattern({...p.pattern,panelCuts:undefined}).pieces[0];const xs=piece.nodes.map(n=>n.x),ys=piece.nodes.map(n=>n.y),y=(Math.min(...ys)+Math.max(...ys))*.55,m=document.querySelector('.ed-canvas svg.board>g[transform]').getScreenCTM();return [new DOMPoint(Math.min(...xs)-10,y).matrixTransform(m),new DOMPoint(Math.max(...xs)+10,y).matrixTransform(m)].map(p=>({x:p.x,y:p.y}));}''')
 page.mouse.move(pts[0]['x'],pts[0]['y']);page.mouse.down();page.mouse.move(pts[1]['x'],pts[1]['y'],steps=10);page.mouse.up()
 page.wait_for_timeout(150)
 cut_info=page.evaluate('''async()=>{const {useApp}=await import('/src/store/app.ts');const p=Object.values(useApp.getState().projects)[0];return {cuts:p.design.panelCuts,views:p.design.views.filter(v=>v.source.type==='pieza')};}''')
 assert len(cut_info['cuts'])==1,cut_info
 assert len(cut_info['views'][0]['zones'])==2
 # Apply a catalog fabric to one new panel by selecting and tapping its interior.
 page.locator('[role=toolbar][aria-label=Herramientas]:visible').get_by_role('button',name='Telas',exact=True).click();page.locator('.fabric-swatch').first.click();page.get_by_text('Toca la zona o arrastra otra muestra.',exact=True).wait_for()
 page.get_by_role('button',name='Cerrar telas',exact=True).click()
 point=page.evaluate('''()=>{const paths=[...document.querySelectorAll('.ed-canvas svg.board>g[transform]>g path')].filter(p=>p.getAttribute('fill')==='#ffffff');const r=paths[0].getBoundingClientRect();return {x:r.x+r.width*.5,y:r.y+r.height*.5};}''')
 page.mouse.click(point['x'],point['y']);page.wait_for_timeout(100)
 page.locator('[role=toolbar][aria-label=Herramientas]:visible').get_by_role('button',name='Más',exact=True).click()
 page.get_by_text('Patrones y cortes',exact=True).click()
 page.get_by_role('button',name='Cortar paneles',exact=True).click()
 page.get_by_role('button',name='Por puntos',exact=True).click()
 bent=page.evaluate("""async()=>{const {useApp}=await import('/src/store/app.ts');const {buildPattern}=await import('/src/lib/pattern/engine.ts');const p=Object.values(useApp.getState().projects)[0],piece=buildPattern({...p.pattern,panelCuts:undefined}).pieces[0];const xs=piece.nodes.map(n=>n.x),ys=piece.nodes.map(n=>n.y),lo=Math.min(...xs),hi=Math.max(...xs),h=Math.max(...ys)-Math.min(...ys),m=document.querySelector('.ed-canvas svg.board>g[transform]').getScreenCTM();return [[lo-10,.73*h],[(lo+hi)/2,.67*h],[hi+10,.78*h]].map(([x,y])=>new DOMPoint(x,y).matrixTransform(m)).map(p=>({x:p.x,y:p.y}));}""")
 for point in bent:page.mouse.click(point['x'],point['y'])
 page.get_by_role('button',name='Guardar corte',exact=True).click()
 assert page.evaluate("""async()=>{const {useApp}=await import('/src/store/app.ts');return Object.values(useApp.getState().projects)[0].design.panelCuts.length;}""")==2
 page.get_by_role('button',name='Deshacer',exact=True).click()
 assert page.evaluate("""async()=>{const {useApp}=await import('/src/store/app.ts');return Object.values(useApp.getState().projects)[0].design.panelCuts.length;}""")==1, 'Deshacer debe retirar únicamente el último corte'
 page.locator('[role=toolbar][aria-label=Herramientas]:visible').get_by_role('button',name='Más',exact=True).click()
 page.get_by_text('Patrones y cortes',exact=True).click()
 page.get_by_role('button',name='Generar patrones de paneles',exact=True).click()
 page.get_by_role('dialog',name='Generar patrones del diseño',exact=True).get_by_role('button',name='Generar patrones de paneles',exact=True).click();page.wait_for_url('**/#/patronaje/**')
 result=page.evaluate('''async()=>{const {useApp}=await import('/src/store/app.ts');const {buildPattern}=await import('/src/lib/pattern/engine.ts');const p=Object.values(useApp.getState().projects)[0],built=buildPattern(p.pattern);await useApp.getState().saveNow();return {pieces:built.pieces.map(p=>p.name),errors:built.issues.filter(i=>i.level==='error'),seams:built.seamResults.every(s=>s.ok),versions:p.patternVersions.length,materials:p.pattern.panelMaterials};}''')
 assert len(result['pieces'])==4 and not result['errors'] and result['seams'] and result['versions']>=1,result
 assert result['materials'],result
 page.get_by_role('button',name='Exportar',exact=True).last.click()
 with page.expect_download() as download:page.get_by_role('button',name='Descargar PDF a escala real',exact=True).last.click()
 file='/tmp/hilvana-paneles.pdf';download.value.save_as(file)
 pdf=pymupdf.open(file);widths=[round(d['rect'].width*25.4/72,3) for d in pdf[0].get_drawings() if d.get('fill') is not None]
 assert widths[:2]==[50.0,100.0],widths
 assert 'panel' in ''.join(p.get_text() for p in pdf).lower()
 page.reload();page.wait_for_load_state('networkidle')
 assert not errors,errors
 print('Studio realcut→2paintablepanels→4garmenttemplates, seams/materials/history/persistence, PDF calibration PASS',result)
 # The simplified journey prepares genuine segmented pieces; advanced Studio retains them.
 page.goto(base+'/#/biblioteca/chaqueta-patchwork-cuadros');page.wait_for_load_state('networkidle')
 page.get_by_role('button',name='Intervenir',exact=True).click()
 page.get_by_role('button',name='Colocar extras',exact=True).click();page.wait_for_url('**/#/personalizar/**')
 variant_id=page.url.rsplit('/',1)[-1]
 page.goto(base+'/#/estudio/'+variant_id);page.wait_for_load_state('networkidle')
 variant=page.evaluate('''async()=>{const {useApp}=await import('/src/store/app.ts');const {buildPattern}=await import('/src/lib/pattern/engine.ts');const p=Object.values(useApp.getState().projects).find(p=>p.modelId==='chaqueta-patchwork-cuadros'),built=buildPattern(p.pattern);return {cuts:p.design.panelCuts.length,pieces:built.pieces.length,zones:p.design.views.filter(v=>v.source.type==='pieza').map(v=>v.zones.length),errors:built.issues.filter(i=>i.level==='error')};}''')
 assert variant['pieces']==22 and not variant['errors'] and max(variant['zones'])==9,variant
 page.wait_for_timeout(180)
 page.screenshot(path='/tmp/hilvana-patchwork-studio.png')
 assert not page.evaluate('document.documentElement.scrollWidth>innerWidth')
 assert not errors,errors
 print('Built-in ninepanel jacket:',variant)
 variant_id=page.url.rsplit('/',1)[-1]
 page.evaluate('''async()=>{const {useApp}=await import('/src/store/app.ts');const p=Object.values(useApp.getState().projects).find(p=>p.modelId==='chaqueta-patchwork-cuadros');useApp.getState().updateProject(p.id,p=>({...p,pattern:{...p.pattern,params:{...p.pattern.params,largo:850}}}));}''')
 page.goto(base+'/#/patronaje/'+variant_id);page.wait_for_load_state('networkidle')
 page.get_by_role('button',name='Exportar',exact=True).last.click()
 assert page.get_by_role('button',name='Descargar PDF a escala real',exact=True).last.is_disabled()
 assert page.get_by_role('button',name='Exportar SVG 1:1 (mm)',exact=True).last.is_disabled()
 print('Stale panel bases block PDF/SVG exports PASS')
 b.close()
