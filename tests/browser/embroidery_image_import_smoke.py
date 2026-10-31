"""Importación real de logos: PNG/WebP con alpha, JPEG orientado, ZIP y ficha.

Con npm run dev activo: HILVANA_URL=http://localhost:5173 python tests/browser/embroidery_image_import_smoke.py
Requiere Python Playwright, Pillow y Chromium. Contexto nuevo; no toca datos reales.
"""
import base64
import io
import os
from PIL import Image, ImageDraw
from playwright.sync_api import sync_playwright


def fixture(name, mime, format_name, *, orientation=False, large=False):
    size = (4200, 2100) if large else (40, 20)
    image = Image.new('RGBA', size, (40, 150, 60, 255) if large else (0, 0, 0, 0))
    if not large:
        draw = ImageDraw.Draw(image)
        draw.rectangle((4, 4, 19, 15), fill=(255, 0, 0, 255))
        draw.rectangle((20, 4, 35, 15), fill=(0, 60, 255, 255))
    options = {}
    if orientation:
        image = Image.new('RGB', size, (255, 0, 0))
        ImageDraw.Draw(image).rectangle((20, 0, 39, 19), fill=(0, 60, 255))
        exif = Image.Exif()
        exif[274] = 6  # A phone photo stored sideways, shown rotated clockwise.
        options = {'exif': exif, 'quality': 100, 'subsampling': 0}
    if format_name == 'WEBP':
        options = {'lossless': True}
    output = io.BytesIO()
    image.save(output, format=format_name, **options)
    return {'name': name, 'type': mime, 'base64': base64.b64encode(output.getvalue()).decode()}


fixtures = [
    fixture('Mi marca.png', 'image/png', 'PNG'),
    fixture('Mi insignia.webp', 'image/webp', 'WEBP'),
    fixture('Foto orientada.jpg', 'image/jpeg', 'JPEG', orientation=True),
    fixture('Imagen grande.png', 'image/png', 'PNG', large=True),
]

PIXELS = """async blob => {
  const image = new Image(), url = URL.createObjectURL(blob);
  try {
    image.src = url; await image.decode();
    const canvas = document.createElement('canvas'); canvas.width = image.naturalWidth; canvas.height = image.naturalHeight;
    const ctx = canvas.getContext('2d'); ctx.drawImage(image, 0, 0);
    const pixel = (x,y) => [...ctx.getImageData(Math.floor(x),Math.floor(y),1,1).data];
    return {width:canvas.width,height:canvas.height,corner:pixel(0,0),
      left:pixel(canvas.width/4,canvas.height/2),right:pixel(canvas.width*3/4,canvas.height/2),
      top:pixel(canvas.width/2,canvas.height/4),bottom:pixel(canvas.width/2,canvas.height*3/4)};
  } finally { URL.revokeObjectURL(url); }
}"""

with sync_playwright() as playwright:
    browser = playwright.chromium.launch(executable_path='/usr/bin/chromium', args=['--no-sandbox'])
    context = browser.new_context(viewport={'width': 390, 'height': 844}, is_mobile=True, has_touch=True)
    page = context.new_page()
    errors = []
    page.on('pageerror', lambda error: errors.append(str(error)))
    page.goto(os.environ.get('HILVANA_URL', 'http://localhost:5173'))
    page.wait_for_load_state('networkidle')
    page.evaluate(f'() => {{ window.logoPixels = {PIXELS}; }}')
    imported = page.evaluate("""async inputs => {
      const {importEmbroideryImage,createImageEmbroidery} = await import('/src/features/simple/embroideryImage.ts');
      const {getFile,allFileIds} = await import('/src/lib/db.ts');
      const {useApp} = await import('/src/store/app.ts');
      const {blankProject} = await import('/src/store/projects.ts');
      const {newDesign} = await import('/src/features/studio/model.ts');
      const project = blankProject('Mis logos', 'base');
      project.design = newDesign([{id:'frente',kind:'frente',label:'Frente',source:{type:'vacia'},minX:0,minY:0,width:200,height:200,zones:[],refY:0,refLabel:'Arriba'}]);
      const images = [];
      for (const [index,input] of inputs.entries()) {
        const file = new File([Uint8Array.from(atob(input.base64), character=>character.charCodeAt(0))],input.name,{type:input.type});
        const imported = await importEmbroideryImage(file), stored = await getFile(imported.fileId);
        const inserted = createImageEmbroidery(imported, 'frente', index % 2 ? 150 : 50, index < 2 ? 50 : 130, index === 2 ? 30 : 70);
        project.design.elements.push(...inserted.elements);
        images.push({...imported, type:stored.type, storedName:stored.name, pixels:await window.logoPixels(stored.blob), width:inserted.width, height:inserted.height});
      }
      const before = await allFileIds(); let invalidMessage;
      try { await importEmbroideryImage(new File(['invalid'],'Corrupto.png',{type:'image/png'})); }
      catch (error) { invalidMessage = error.message; }
      const after = await allFileIds();
      useApp.getState().put('project',project); await useApp.getState().saveNow();
      return {images,projectId:project.id,invalidMessage,orphanCount:after.length-before.length,fabrics:Object.keys(useApp.getState().fabrics).length};
    }""", fixtures)
    for image in imported['images']:
        assert image['type'] == 'image/png' and image['storedName'].endswith('(bordado).png'), image
        assert abs(image['width'] / image['height'] - image['widthPx'] / image['heightPx']) < 1e-9, image
    for image in imported['images'][:2]:
        assert image['pixels']['corner'][3] == 0, image
        assert image['pixels']['left'] == [255, 0, 0, 255], image
        assert image['pixels']['right'] == [0, 60, 255, 255], image
    oriented = imported['images'][2]
    assert (oriented['widthPx'], oriented['heightPx']) == (20, 40), oriented
    assert oriented['pixels']['top'][0] > 240 and oriented['pixels']['top'][2] < 15, oriented
    assert oriented['pixels']['bottom'][0] < 15 and oriented['pixels']['bottom'][2] > 240, oriented
    assert (imported['images'][3]['widthPx'], imported['images'][3]['heightPx']) == (2400, 1200)
    assert 'No se pudo abrir' in imported['invalidMessage'] and imported['orphanCount'] == 0, imported
    assert imported['fabrics'] == 0, imported

    page.reload()
    page.wait_for_load_state('networkidle')
    page.evaluate(f'() => {{ window.logoPixels = {PIXELS}; }}')
    restored = page.evaluate("""async projectId => {
      const {useApp} = await import('/src/store/app.ts'); await useApp.getState().init();
      const {getFile} = await import('/src/lib/db.ts');
      const {exportProjectZip,importProjectZip} = await import('/src/lib/zip.ts');
      const project = useApp.getState().projects[projectId];
      const before = JSON.stringify(project.design.elements);
      const zip = await exportProjectZip(project);
      await useApp.getState().wipe();
      const importedId = await importProjectZip(new File([zip], 'Mis logos.zip', {type:'application/zip'}));
      const back = useApp.getState().projects[importedId], images = [];
      for (const element of back.design.elements) if (element.image) {
        const file = await getFile(element.image.fileId);
        images.push({id:file.id,type:file.type,pixels:await window.logoPixels(file.blob)});
      }
      const {buildEditorialAssets} = await import('/src/features/editorial/evidence.tsx');
      const evidence = await buildEditorialAssets({projects:[back],fabrics:{}});
      const asset = evidence.assets.find(asset=>asset.kind==='vistas');
      const url = URL.createObjectURL(asset.blob), image = new Image();
      image.src = url; await image.decode();
      const canvas = document.createElement('canvas'); canvas.width=image.naturalWidth;canvas.height=image.naturalHeight;
      const ctx=canvas.getContext('2d');ctx.drawImage(image,0,0);const rgba=ctx.getImageData(0,0,canvas.width,canvas.height).data;
      let red=0,blue=0;for(let i=0;i<rgba.length;i+=4){if(rgba[i]>240&&rgba[i+1]<20&&rgba[i+2]<20)red++;if(rgba[i]<20&&rgba[i+1]>40&&rgba[i+1]<80&&rgba[i+2]>240)blue++;}
      URL.revokeObjectURL(url);
      return {sameElements:before===JSON.stringify(back.design.elements),images,evidence:{red,blue,warnings:evidence.warnings}};
    }""", imported['projectId'])
    assert restored['sameElements'], restored
    assert [image['id'] for image in restored['images']] == [image['fileId'] for image in imported['images']]
    for before, after in zip(imported['images'], restored['images']):
        assert before['pixels'] == after['pixels'], (before, after)
    assert restored['evidence']['red'] > 500 and restored['evidence']['blue'] > 500, restored['evidence']
    assert not any('imagen guardada' in warning for warning in restored['evidence']['warnings']), restored['evidence']
    assert not errors, errors
    print('PASS: PNG/WebP alpha y colores, JPEG EXIF, tamaño, errores, recarga, ZIP y capturas editoriales con logos reales.')
    browser.close()
