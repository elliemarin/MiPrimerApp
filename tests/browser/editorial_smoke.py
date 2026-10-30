"""Lámina editorial: capturas locales y entrega explícita a ChatGPT.

Requiere Vite, Python Playwright, Chromium y Pillow. Usa proyectos sintéticos
en contextos temporales; nunca inicia sesión ni envía mensajes a ChatGPT.
HILVANA_TEST_URL permite usar otro servidor de desarrollo.
"""
import io
import hashlib
import json
import os
import zipfile

from PIL import Image
from playwright.sync_api import sync_playwright

BASE = os.environ.get('HILVANA_TEST_URL', 'http://localhost:5173').rstrip('/')


def no_overflow(page):
    size = page.evaluate('({width:innerWidth,scroll:document.documentElement.scrollWidth})')
    assert size['scroll'] <= page.viewport_size['width'] + 1, size


def seed_projects(page):
    return page.evaluate('''async () => {
      const {useApp}=await import('/src/store/app.ts');
      const {findModel}=await import('/src/data/catalog.ts');
      const {projectFromModel}=await import('/src/store/projects.ts');
      const {profileFromSize}=await import('/src/store/profiles.ts');
      const {quickSize}=await import('/src/lib/sizes/quickSizes.ts');
      const {prepareSimpleProject,simpleViews,materialTargets,applyMaterial}=await import('/src/features/simple/workflow.ts');
      const {COMPONENT_OPTIONS,createComponent}=await import('/src/data/components.ts');
      const {syncComponentDesign}=await import('/src/features/customize/componentDesign.ts');
      const {firstFittingPosition}=await import('/src/features/customize/placementDrag.ts');
      const {buildPattern}=await import('/src/lib/pattern/engine.ts');
      const {createEmbroideryMotif}=await import('/src/lib/draw/embroideryMotifs.ts');
      const {createLettering}=await import('/src/lib/draw/lettering.ts');
      const {importFabricPhoto}=await import('/src/lib/fabricPhoto.ts');
      const app=useApp.getState();window.__editorialQaApp=useApp;
      const canvas=document.createElement('canvas');canvas.width=240;canvas.height=180;
      const ctx=canvas.getContext('2d');
      for(let x=0;x<240;x+=20){ctx.fillStyle=x%40===0?'#3366AA':'#DFAE29';ctx.fillRect(x,0,20,180);}
      const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/png'));
      const fabric=await importFabricPhoto(new File([blob],'Lino rayado QA.png',{type:'image/png'}));
      const size=quickSize('mujer','mediana');
      const profile=profileFromSize(size.table,size.row,'PERFIL_PRIVADO_NO_EXPORTAR');
      profile.notes='NOTA_PERSONAL_NO_EXPORTAR';app.put('profile',profile);
      let hoodie=prepareSimpleProject(projectFromModel(findModel('coleccion-sudadera-660-540-260-capucha'),profile));
      const view=simpleViews(hoodie.design).find(view=>view.source.type==='pieza'&&/delanter/.test(view.source.pieceId));
      if(!view)throw new Error('Falta el delantero real para la prueba.');
      const base=buildPattern({...hoodie.pattern,components:undefined});
      const option=COMPONENT_OPTIONS.find(option=>option.id==='cargo-compacto');
      const cargo=firstFittingPosition(createComponent(option,'qa-cargo',view),view,base.pieces,{x:view.minX+view.width*.6,y:view.minY+view.height*.62});
      if(!cargo)throw new Error('El cargo de prueba no cabe.');
      hoodie=syncComponentDesign({...hoodie,pattern:{...hoodie.pattern,components:[cargo]}});
      hoodie=applyMaterial(hoodie,materialTargets(hoodie).map(target=>target.id),{type:'tela',fabricId:fabric.id,rotation:15,offsetX:7,offsetY:11,scale:.8},{[fabric.id]:fabric});
      const extraTargets=materialTargets(hoodie).filter(target=>target.kind==='elemento');
      hoodie=applyMaterial(hoodie,extraTargets.map(target=>target.id),{type:'color',color:'#B4273A'},{[fabric.id]:fabric});
      const bee=createEmbroideryMotif('abeja',view.id,view.minX+view.width*.42,view.minY+view.height*.43,70);
      const letters=createLettering('Año 2026','manuscrita',view.id,view.minX+view.width*.58,view.minY+view.height*.28,24,'#B4273A');
      hoodie={...hoodie,notes:[{id:'private-note',createdAt:'2026-10-30T00:00:00.000Z',text:'NOTA_PERSONAL_NO_EXPORTAR',photoFileIds:[]}],design:{...hoodie.design,elements:[...hoodie.design.elements,...bee.elements,...letters.elements]}};
      let pants=prepareSimpleProject(projectFromModel(findModel('pantalon-recto-elastico'),profile));
      pants=applyMaterial(pants,materialTargets(pants).map(target=>target.id),{type:'color',color:'#B4273A'});
      app.put('project',hoodie);app.put('project',pants);await app.saveNow();
      window.__editorialQaIds={hoodie:hoodie.id,pants:pants.id,fabric:fabric.id};
      location.hash='/acabados/'+hoodie.id;
      return {hoodie:hoodie.id,pants:pants.id,fabric:fabric.id,pattern:JSON.stringify(hoodie.pattern),design:JSON.stringify(hoodie.design)};
    }''')


def inspect_png(data, name):
    image = Image.open(io.BytesIO(data)).convert('RGB')
    assert image.width >= 800 and image.height >= 800, (name, image.size)
    colors = image.resize((200, 200)).getcolors(40000)
    assert colors and len(colors) > 30, (name, 'Captura vacía o sin detalles')
    return image


def inspect_package(path, expected_projects):
    with zipfile.ZipFile(path) as archive:
        names = archive.namelist()
        assert {'prompt.txt', 'manifest.json', 'LEEME.txt'}.issubset(names), names
        prompt = archive.read('prompt.txt').decode('utf-8')
        manifest = json.loads(archive.read('manifest.json'))
        assert manifest['format'] == 'hilvana-editorial-v1'
        assert manifest['styleId'] == 'HILVANA_EDITORIAL_V1'
        assert len(manifest['projects']) == expected_projects
        assert hashlib.sha256(archive.read('prompt.txt')).hexdigest() == manifest['prompt']['sha256']
        assert 'ESTILO FIJO HILVANA_EDITORIAL_V1' in prompt
        for marker in ('PERFIL_PRIVADO_NO_EXPORTAR', 'NOTA_PERSONAL_NO_EXPORTAR'):
            assert marker not in prompt and marker not in archive.read('manifest.json').decode('utf-8')
        assert 'Abeja' in prompt and 'Año 2026' in prompt and 'Pacifico' in prompt
        assert '140' in prompt and '170' in prompt and '#B4273A' in prompt
        images = []
        for asset in manifest['assets']:
            assert asset['name'] in names
            data = archive.read(asset['name'])
            assert hashlib.sha256(data).hexdigest() == asset['sha256']
            assert len(data) == asset['bytes']
            image = inspect_png(data, asset['name'])
            assert image.size == (asset['width'], asset['height'])
            assert asset['kind'] in ('vistas', 'detalles')
            assert all(code in ('P1', 'P2') for code in asset['projectCodes'])
            images.append(image)
        assert len(images) >= 2, 'Deben incluirse vistas y detalles/patrones'
        # Photo colours and the red cargo are pixels in the actual captures.
        samples = [color for image in images for color in image.resize((200, 267)).get_flattened_data()]
        for expected in ((51, 102, 170), (223, 174, 41), (180, 39, 58)):
            assert sum(sum(abs(a-b) for a,b in zip(color, expected)) < 30 for color in samples) > 15, expected
        return {'prompt': prompt, 'manifest': manifest, 'files': names}


def install_handoff_stubs(page):
    page.add_init_script('''(() => {
      window.__editorialShares=[];window.__editorialCopies=[];window.__editorialWindows=[];
      window.__editorialShareMode='cancel';window.__editorialClipboardMode='copy';
      Object.defineProperty(navigator,'canShare',{configurable:true,value:({files})=>Array.isArray(files)&&files.length>0});
      Object.defineProperty(navigator,'share',{configurable:true,value:async data=>{
        window.__editorialShares.push({title:data.title,text:data.text,files:await Promise.all(data.files.map(async file=>({name:file.name,type:file.type,size:file.size,header:[...new Uint8Array(await file.slice(0,8).arrayBuffer())]})))});
        if(window.__editorialShareMode==='cancel')throw new DOMException('Cancelado por QA','AbortError');
      }});
      Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async text=>{
        if(window.__editorialClipboardMode==='denied')throw new DOMException('Sin permiso','NotAllowedError');
        window.__editorialCopies.push(text);
      }}});
      window.open=(...args)=>{window.__editorialWindows.push(args);return null;};
    })();''')


def prepare(page, label='Preparar referencias'):
    page.get_by_role('button', name=label, exact=True).click()
    page.get_by_role('button', name='Descargar paquete', exact=True).wait_for(state='visible', timeout=120000)
    assert page.locator('.editorial-assets img').count() >= 2
    assert page.locator('.editorial-assets img').evaluate_all('(images)=>images.every(image=>image.complete&&image.naturalWidth>=800)')


def run(browser, width):
    context = browser.new_context(viewport={'width': width, 'height': 844 if width < 500 else 1000},
                                  is_mobile=width < 500, has_touch=width < 500, accept_downloads=True)
    page = context.new_page();errors=[];downloads=[];external=[]
    page.on('pageerror',lambda error:errors.append(str(error)))
    page.on('download',lambda download:downloads.append(download))
    page.on('request',lambda request:external.append(request.url) if request.url.startswith('https://') else None)
    install_handoff_stubs(page)
    page.goto(BASE);page.wait_for_load_state('networkidle')
    ids = seed_projects(page)
    page.get_by_role('button',name='Preparar lámina',exact=True).click()
    dialog=page.get_by_role('dialog',name='Lámina con ChatGPT',exact=True)
    dialog.wait_for(state='visible')
    page.get_by_label('Nombre de la lámina',exact=True).fill('Look «Año 2026»')
    page.get_by_label('Ambiente o idea (opcional)',exact=True).fill('Texturas contrastantes y silueta relajada')
    prepare(page)
    assert not downloads and not external
    assert page.evaluate('window.__editorialShares.length+window.__editorialWindows.length+window.__editorialCopies.length') == 0
    no_overflow(page)
    page.wait_for_timeout(150)
    page.screenshot(path=f'/tmp/hilvana-editorial-ready-{width}.png')

    # Share runs only on this explicit click, and cancel cannot open/download/send.
    page.get_by_role('button',name='Compartir…',exact=True).click()
    page.get_by_text('Compartir cancelado. Tus referencias siguen listas.',exact=True).wait_for()
    assert len(downloads)==0 and not external
    calls=page.evaluate('window.__editorialShares')
    assert len(calls)==1 and calls[0]['files']
    assert 'HILVANA_EDITORIAL_V1' in calls[0]['text']
    assert all(file['type']=='image/png' and file['header']==[137,80,78,71,13,10,26,10] for file in calls[0]['files'])
    assert page.evaluate('window.__editorialWindows.length+window.__editorialCopies.length')==0
    page.evaluate("window.__editorialShareMode='shared'")
    page.get_by_role('button',name='Compartir…',exact=True).click()
    page.get_by_text('Referencias entregadas a la app elegida. Revisa que estén las imágenes y el prompt antes de enviar.',exact=True).wait_for()
    assert page.evaluate('window.__editorialShares.length')==2
    assert len(downloads)==0 and not external

    # Clipboard denied must expose selectable text, with no false success.
    page.evaluate("window.__editorialClipboardMode='denied'")
    page.get_by_role('button',name='Copiar prompt',exact=True).click()
    prompt_field=page.get_by_role('textbox',name='Prompt de la lámina',exact=True)
    prompt_field.wait_for(state='visible')
    assert page.get_by_text('No se pudo copiar automáticamente. Selecciona el texto y usa Copiar.',exact=True).is_visible()
    assert prompt_field.evaluate('(element)=>element.selectionStart===0&&element.selectionEnd===element.value.length')
    page.evaluate("window.__editorialClipboardMode='copy'")
    page.get_by_role('button',name='Copiar prompt',exact=True).click()
    page.get_by_text('Prompt copiado. Pégalo en ChatGPT junto con las imágenes.',exact=True).wait_for()
    assert page.evaluate('window.__editorialCopies.length')==1
    chat=page.get_by_role('link',name='Abrir ChatGPT',exact=True)
    assert chat.get_attribute('href')=='https://chatgpt.com/'
    assert 'noopener' in chat.get_attribute('rel') and chat.get_attribute('target')=='_blank'

    with page.expect_download() as event:
        page.get_by_role('button',name='Descargar paquete',exact=True).click()
    path=f'/tmp/hilvana-editorial-one-{width}.zip';event.value.save_as(path)
    one=inspect_package(path,1)
    assert one['manifest']['title']=='Look «Año 2026»'

    # Adding another project invalidates stale references until regenerated.
    page.locator('.editorial-settings > summary').click()
    page.get_by_text('Añadir otras prendas al look',exact=True).click()
    page.locator('.editorial-projects input[type=checkbox]').check()
    page.get_by_text('Tu diseño o la selección cambió. Actualiza las referencias antes de compartirlas.',exact=True).wait_for()
    assert page.get_by_role('button',name='Descargar paquete',exact=True).count()==0
    assert page.get_by_role('button',name='Copiar prompt',exact=True).is_disabled()
    assert page.locator('a.editorial-disabled').filter(has_text='Abrir ChatGPT').get_attribute('href') is None
    prepare(page,'Actualizar referencias')
    with page.expect_download() as event:
        page.get_by_role('button',name='Descargar paquete',exact=True).click()
    path=f'/tmp/hilvana-editorial-look-{width}.zip';event.value.save_as(path)
    look=inspect_package(path,2)
    fixed_one=one['prompt'].split('ESTILO FIJO HILVANA_EDITORIAL_V1',1)[1].split('DATOS DEL LOOK',1)[0]
    fixed_look=look['prompt'].split('ESTILO FIJO HILVANA_EDITORIAL_V1',1)[1].split('DATOS DEL LOOK',1)[0]
    assert fixed_one==fixed_look,'El estilo base debe ser idéntico al añadir prendas'
    no_overflow(page)

    # Source changes, even behind an already open sheet, disable stale export.
    page.evaluate('''id=>window.__editorialQaApp.getState().updateProject(id,project=>({...project,design:{...project.design,elements:project.design.elements.map(element=>element.embroidery?{...element,x:element.x+1}:element)}}))''',ids['hoodie'])
    page.get_by_text('Tu diseño o la selección cambió. Actualiza las referencias antes de compartirlas.',exact=True).wait_for()
    assert page.get_by_role('button',name='Copiar prompt',exact=True).is_disabled()
    # Preparing/handoff never modifies the actual pattern geometry.
    state=page.evaluate('''id=>{const project=window.__editorialQaApp.getState().projects[id];return {pattern:JSON.stringify(project.pattern),editorial:project.editorial};}''',ids['hoodie'])
    assert state['pattern']==ids['pattern']
    assert len(state['editorial']['projectIds'])==2
    assert not external,external
    assert not errors,errors
    page.evaluate('async()=>window.__editorialQaApp.getState().saveNow()')
    page.reload();page.wait_for_load_state('networkidle')
    page.get_by_role('button',name='Preparar lámina',exact=True).click()
    assert page.get_by_label('Nombre de la lámina',exact=True).input_value()=='Look «Año 2026»'
    page.get_by_text('Añadir otras prendas al look',exact=True).click()
    assert page.locator('.editorial-projects input:checked').count()==1
    assert page.get_by_role('button',name='Preparar referencias',exact=True).is_visible()
    page.get_by_role('dialog',name='Lámina con ChatGPT',exact=True).get_by_role('button',name='Cerrar',exact=True).click()
    page.get_by_role('button',name='Ver en modelo',exact=True).click()
    page.get_by_role('dialog',name='Tu diseño en un figurín',exact=True).get_by_role('button',name='Preparar lámina',exact=True).click()
    page.get_by_role('dialog',name='Lámina con ChatGPT',exact=True).wait_for()
    assert page.get_by_role('dialog').count()==1
    page.get_by_role('dialog').get_by_role('button',name='Cerrar',exact=True).click()
    page.evaluate("id=>location.hash='/confeccion/'+id",ids['hoodie'])
    sewing=page.get_by_role('dialog',name='Todo listo para coser',exact=True)
    sewing.wait_for()
    assert sewing.get_by_role('button',name='Descargar PDF completo',exact=True).is_enabled()
    sewing.get_by_role('button',name='Preparar lámina',exact=True).click()
    page.get_by_role('dialog',name='Lámina con ChatGPT',exact=True).wait_for()
    assert page.get_by_role('dialog').count()==1
    no_overflow(page)
    print(f'Editorial {width}px: capturas PNG, ZIP/hash, prompt fijo, privacidad, dos prendas, cancelación y copia manual PASS')
    context.close()


def run_without_share(browser):
    context=browser.new_context(viewport={'width':390,'height':844},has_touch=True,is_mobile=True)
    page=context.new_page();errors=[];downloads=[]
    page.on('pageerror',lambda error:errors.append(str(error)))
    page.on('download',lambda download:downloads.append(download))
    page.add_init_script("Object.defineProperty(navigator,'canShare',{configurable:true,value:undefined});Object.defineProperty(navigator,'share',{configurable:true,value:undefined});")
    page.goto(BASE);page.wait_for_load_state('networkidle');seed_projects(page)
    page.get_by_role('button',name='Preparar lámina',exact=True).click()
    prepare(page)
    assert page.get_by_role('button',name='Compartir…',exact=True).count()==0
    assert page.get_by_text('Descarga las imágenes, adjúntalas en ChatGPT y pega el prompt. Después envía para generar la lámina.',exact=True).is_visible()
    assert not downloads
    # Inspect the real external link while intercepting it locally: no login or send.
    observed=[]
    context.route('https://chatgpt.com/**',lambda route:(observed.append(route.request.url),route.fulfill(status=200,content_type='text/html',body='<title>ChatGPT destino interceptado por QA</title>'))[-1])
    with page.expect_popup() as event:
        page.get_by_role('link',name='Abrir ChatGPT',exact=True).click()
    popup=event.value;popup.wait_for_load_state('domcontentloaded')
    assert observed==['https://chatgpt.com/'],observed
    assert popup.evaluate('window.opener===null')
    popup.close()
    no_overflow(page)
    assert not errors,errors
    print('Editorial sin Web Share: descarga/copia manual y ChatGPT solo por clic explícito, URL limpia y sin opener PASS')
    context.close()


if __name__ == '__main__':
    with sync_playwright() as playwright:
        browser=playwright.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox'])
        try:
            for width in (320,390,1440):
                run(browser,width)
            run_without_share(browser)
        finally:
            browser.close()
