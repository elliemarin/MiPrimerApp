"""Subir un logo, mover letras diminutas y exportar la imagen real.

Con Vite activo: HILVANA_TEST_URL=http://127.0.0.1:5182 python tests/browser/logo_move_smoke.py
Requiere Playwright, Chromium y PyMuPDF. Los contextos son temporales.
Las interacciones usan la interfaz; /src solo inspecciona geometría/IndexedDB/ZIP.
"""
import base64
import io
import json
import os
import struct
import zlib
import zipfile
from urllib.parse import unquote

import pymupdf
from playwright.sync_api import sync_playwright
from simple_journey_smoke import drag, no_overflow, project_state, start_from_model

BASE = os.environ.get('HILVANA_TEST_URL', 'http://localhost:5173').rstrip('/')


def png_fixture():
    """Asymmetric red/blue mark with real alpha, created without external files."""
    def chunk(kind, data):
        return struct.pack('>I', len(data)) + kind + data + struct.pack('>I', zlib.crc32(kind + data) & 0xffffffff)
    rows = []
    for y in range(80):
        row = bytearray([0])
        for x in range(120):
            if 10 <= x < 30 and 10 <= y < 70 or 10 <= x < 75 and 50 <= y < 70:
                row.extend((228, 38, 54, 255))
            elif 80 <= x < 110 and 10 <= y < 35:
                row.extend((30, 92, 224, 255))
            else:
                row.extend((0, 0, 0, 0))
        rows.append(bytes(row))
    return b'\x89PNG\r\n\x1a\n' + chunk(b'IHDR', struct.pack('>IIBBBBB', 120, 80, 8, 6, 0, 0, 0)) + chunk(b'IDAT', zlib.compress(b''.join(rows))) + chunk(b'IEND', b'')


def embroidery(page, project_id, kind):
    return next(e for e in project_state(page, project_id)['project']['design']['elements'] if e.get('embroidery', {}).get('kind') == kind)


def center(locator):
    box = locator.bounding_box()
    assert box
    return {'x': box['x'] + box['width'] / 2, 'y': box['y'] + box['height'] / 2}


def scene_position(page, project_id, element, physical_dx=0, physical_dy=0):
    return page.evaluate('''async args=>{
      const {useApp}=await import('/src/store/app.ts');
      const {buildAssembly,assemblySurfaceForElement,assemblyPoint}=await import('/src/features/simple/assembled.ts');
      const p=useApp.getState().projects[args.id], svg=document.querySelector('.finish-art > svg');
      const scene=buildAssembly(p).find(s=>s.id===svg.querySelector('[data-assembly-view]')?.dataset.assemblyView);
      const surface=scene&&assemblySurfaceForElement(scene,p,args.element);
      const physical={x:args.element.x+args.dx,y:args.element.y+args.dy};
      const v=surface?assemblyPoint(surface,physical):physical;
      const q=new DOMPoint(v.x,v.y).matrixTransform(svg.getScreenCTM());
      return {x:q.x,y:q.y};
    }''', {'id': project_id, 'element': element, 'dx': physical_dx, 'dy': physical_dy})


def drag_handle(page, context, project_id, element, dx=20, dy=15, touch=False):
    page.locator('.finish-art > svg').scroll_into_view_if_needed()
    handle = page.get_by_role('button', name='Mover bordado seleccionado', exact=True)
    handle.wait_for()
    box = handle.bounding_box()
    assert abs(box['width'] - 48) < .01 and abs(box['height'] - 48) < .01, box
    canvas = page.locator('.finish-art > svg').bounding_box()
    assert box['x'] >= canvas['x'] - .1 and box['y'] >= canvas['y'] - .1, (box, canvas)
    assert box['x'] + 48 <= canvas['x'] + canvas['width'] + .1 and box['y'] + 48 <= canvas['y'] + canvas['height'] + .1
    p = scene_position(page, project_id, element)
    q = scene_position(page, project_id, element, dx, dy)
    start = center(handle)
    end = {'x': start['x'] + q['x'] - p['x'], 'y': start['y'] + q['y'] - p['y']}
    drag(page, context, start, end, touch=touch)
    moved = next(e for e in project_state(page, project_id)['project']['design']['elements'] if e['id'] == element['id'])
    assert abs(moved['x'] - element['x'] - dx) < .1 and abs(moved['y'] - element['y'] - dy) < .1, (element, moved)
    assert moved['w'] == element['w'] and moved['h'] == element['h'] and moved['viewId'] == element['viewId']
    assert moved['assemblySurfaceId'] == element['assemblySurfaceId']
    return moved


def cancel_touch(page, context, project_id):
    before = project_state(page, project_id)['project']['design']
    handle = page.get_by_role('button', name='Mover bordado seleccionado', exact=True)
    at = center(handle)
    cdp = context.new_cdp_session(page)
    def send(kind, point):
        cdp.send('Input.dispatchTouchEvent', {'type': kind, 'touchPoints': [] if point is None else [{'x': point['x'], 'y': point['y'], 'id': 0, 'radiusX': 1, 'radiusY': 1, 'force': 1}]})
    send('touchStart', at)
    send('touchMove', {'x': at['x'] + 14, 'y': at['y'] + 8})
    send('touchCancel', None)
    cdp.detach()
    assert project_state(page, project_id)['project']['design'] == before, 'Cancelar el gesto no debe guardar movimiento'


def inspect_image(page, project_id):
    return page.evaluate('''async id=>{
      const {useApp}=await import('/src/store/app.ts');
      const {getFile}=await import('/src/lib/db.ts');
      const p=useApp.getState().projects[id];
      const group=p.design.elements.find(e=>e.embroidery?.kind==='image');
      const child=p.design.elements.find(e=>e.parentId===group.id&&e.kind==='imagen');
      const stored=await getFile(child.image.fileId), url=URL.createObjectURL(stored.blob);
      try {
        const image=new Image();image.src=url;await image.decode();
        const canvas=document.createElement('canvas');canvas.width=image.naturalWidth;canvas.height=image.naturalHeight;
        const c=canvas.getContext('2d');c.drawImage(image,0,0);
        const bytes=new Uint8Array(await stored.blob.arrayBuffer());
        return {fileId:stored.id,type:stored.blob.type,width:image.naturalWidth,height:image.naturalHeight,
          transparent:Array.from(c.getImageData(0,0,1,1).data),red:Array.from(c.getImageData(15,20,1,1).data),
          blue:Array.from(c.getImageData(90,20,1,1).data),base64:btoa(String.fromCharCode(...bytes))};
      }finally{URL.revokeObjectURL(url);}
    }''', project_id)


def check_zip(page, project_id, image):
    exported = page.evaluate('''async id=>{
      const {useApp}=await import('/src/store/app.ts');const {exportProjectZip}=await import('/src/lib/zip.ts');
      const blob=await exportProjectZip(useApp.getState().projects[id]);
      return await new Promise(resolve=>{const r=new FileReader();r.onload=()=>resolve(r.result.split(',')[1]);r.readAsDataURL(blob);});
    }''', project_id)
    data = base64.b64decode(exported)
    with open('/tmp/hilvana-logo-project.zip', 'wb') as output:
        output.write(data)
    archive = zipfile.ZipFile(io.BytesIO(data))
    root = next(name[:-len('archivos.json')] for name in archive.namelist() if name.endswith('/archivos.json'))
    files = json.loads(archive.read(root + 'archivos.json'))
    assert archive.read(root + files[image['fileId']]) == base64.b64decode(image['base64'])
    assert any('../../' + files[image['fileId']] in unquote(archive.read(name).decode()) for name in archive.namelist() if '/diseno/vistas/' in name and name.endswith('.svg')), files[image['fileId']]
    imported = page.evaluate('''async data=>{
      const {importProjectZip}=await import('/src/lib/zip.ts');
      const bytes=Uint8Array.from(atob(data),c=>c.charCodeAt(0));
      return await importProjectZip(new File([bytes],'logo-qa.zip',{type:'application/zip'}));
    }''', exported)
    restored = inspect_image(page, imported)
    assert restored['base64'] == image['base64'] and restored['transparent'] == [0, 0, 0, 0]
    return len(data)


def check_pdf(path, expected_width_mm):
    pdf = pymupdf.open(path)
    manifest = json.loads(pdf.embfile_get('confeccion.json'))
    pattern = next(s for s in manifest['sections'] if s['id'] == 'patron')
    bars = [round(d['rect'].width * 25.4 / 72, 3) for d in pdf[pattern['startPage'] - 1].get_drawings() if d.get('fill') is not None]
    assert bars[:2] == [50.0, 100.0], bars
    logo_pages = []
    for section in manifest['sections']:
        if not section['id'].startswith('bordado-'):
            continue
        for n in range(section['startPage'] - 1, section['endPage']):
            for image in pdf[n].get_images(full=True):
                if image[2:4] != (120, 80):
                    continue
                assert image[1] > 0, 'El logo debe conservar un canal alfa en PDF'
                rects = pdf[n].get_image_rects(image[0])
                assert any(abs(rect.width * 25.4 / 72 - expected_width_mm) < .02 for rect in rects), rects
                logo_pages.append(n + 1)
    assert logo_pages, 'La guía independiente no contiene la imagen real'
    assert any('/PrintScaling /None' in pdf.xref_object(i) for i in range(1, pdf.xref_length()))
    print('PDF: logo real con alpha a', expected_width_mm, 'mm, páginas', logo_pages, 'y controles', bars[:2])
    pdf.close()


def run(browser, width):
    context = browser.new_context(viewport={'width': width, 'height': 844 if width < 500 else 1000}, is_mobile=width < 500, has_touch=width < 500, accept_downloads=True)
    page = context.new_page()
    errors = []
    page.on('pageerror', lambda error: errors.append(str(error)))
    project_id = start_from_model(page, 'coleccion-sudadera-660-540-260-capucha')
    page.get_by_role('button', name='Elegir telas', exact=True).click()
    page.get_by_role('button', name='Elegir tela o color', exact=True).click()
    page.get_by_role('button', name='Color #24584A', exact=True).click()
    page.get_by_role('button', name='Continuar a bordados', exact=True).click()
    page.get_by_role('button', name='Subir logo o imagen', exact=True).click()
    sheet = page.get_by_role('dialog', name='Tu logo o imagen', exact=True)
    sheet.wait_for()
    chooser = sheet.get_by_label('Archivo de logo o imagen', exact=True)
    chooser.set_input_files({'name': 'corrupto.png', 'mimeType': 'image/png', 'buffer': b'not-a-png'})
    sheet.get_by_role('alert').wait_for()
    assert not any(e.get('embroidery', {}).get('kind') == 'image' for e in project_state(page, project_id)['project']['design']['elements'])
    with page.expect_file_chooser() as choosing:
        sheet.get_by_role('button', name='Elegir imagen', exact=True).click()
    choosing.value.set_files({'name': 'Marca transparente.png', 'mimeType': 'image/png', 'buffer': png_fixture()})
    sheet.get_by_role('button', name='Colocar imagen', exact=True).wait_for()
    assert sheet.get_by_role('img', name='Vista previa de Marca transparente', exact=True).count() == 1
    sheet.get_by_role('button', name='Colocar imagen', exact=True).click()
    sheet.wait_for(state='hidden')
    logo = embroidery(page, project_id, 'image')
    assert logo['w'] == 70 and abs(logo['h'] - 70 * 80 / 120) < .0001
    image = inspect_image(page, project_id)
    assert image['transparent'] == [0, 0, 0, 0] and image['red'] == [228, 38, 54, 255] and image['blue'] == [30, 92, 224, 255], image
    assert image['type'] == 'image/png' and (image['width'], image['height']) == (120, 80)
    page.locator('[data-assembly-element="' + logo['id'] + '"] image').wait_for()
    # A stationary press on the detached handle must not make the logo jump.
    page.locator('.finish-art > svg').scroll_into_view_if_needed()
    page.get_by_role('button', name='Mover bordado seleccionado', exact=True).click()
    assert embroidery(page, project_id, 'image') == logo
    logo = drag_handle(page, context, project_id, logo, 35, 35, touch=width < 500)
    field = page.locator('#embroidery-width')
    field.fill('8'); field.press('Enter')
    logo = embroidery(page, project_id, 'image')
    assert logo['w'] == 80 and abs(logo['h'] - 80 * 80 / 120) < .0001
    page.get_by_role('button', name='Añadir bordado o letras', exact=True).click()
    page.get_by_role('button', name='Letras y números', exact=True).click()
    page.get_by_role('textbox', name='Texto para bordar', exact=True).fill('O')
    page.locator('#embroidery-letter-height').fill('0.3')
    page.locator('#embroidery-letter-height').press('Enter')
    page.get_by_role('button', name='Agregar texto', exact=True).click()
    letters = embroidery(page, project_id, 'lettering')
    assert abs(letters['h'] - 3) < .001, letters
    # Deselect and touch the empty centre of O: its bounding box must be hittable.
    page.get_by_role('group', name='Vista del diseño', exact=True).get_by_role('button', name='Frente', exact=True).click()
    page.locator('.finish-art > svg').scroll_into_view_if_needed()
    point = scene_position(page, project_id, letters)
    if width < 500:
        page.touchscreen.tap(point['x'], point['y'])
    else:
        page.mouse.click(point['x'], point['y'])
    page.get_by_role('button', name='Mover bordado seleccionado', exact=True).wait_for()
    letters = drag_handle(page, context, project_id, letters, -30, 20, touch=width < 500)
    if width < 500:
        cancel_touch(page, context, project_id)
    # Keyboard adjustments use display pixels; changing to physical pieces
    # must preserve the assembled side instead of jumping to another instance.
    handle = page.get_by_role('button', name='Mover bordado seleccionado', exact=True)
    before_point = scene_position(page, project_id, letters)
    handle.focus(); handle.press('ArrowRight')
    letters = embroidery(page, project_id, 'lettering')
    after_point = scene_position(page, project_id, letters)
    assert abs(after_point['x'] - before_point['x'] - 1) < .02 and abs(after_point['y'] - before_point['y']) < .02
    page.get_by_role('button', name='Ver piezas', exact=True).click()
    page.get_by_role('button', name='O · Clara', exact=True).click()
    letters = drag_handle(page, context, project_id, letters, 10, 10, touch=width < 500)
    before_cancelled = project_state(page, project_id)['project']['design']
    start = center(handle)
    drag(page, context, start, {'x': 5, 'y': 5}, touch=width < 500)
    assert project_state(page, project_id)['project']['design'] == before_cancelled, 'Soltar fuera de la pieza no debe conservar una posición intermedia'
    page.get_by_role('button', name='Ver diseño completo', exact=True).click()
    page.get_by_role('group', name='Vista del diseño', exact=True).get_by_role('button', name='Espalda', exact=True).click()
    assert handle.count() == 0, 'El asa no corresponde a otra cara'
    page.get_by_role('group', name='Vista del diseño', exact=True).get_by_role('button', name='Frente', exact=True).click()
    page.get_by_role('button', name='O · Clara', exact=True).click()
    handle.wait_for()
    no_overflow(page)
    page.screenshot(path=f'/tmp/hilvana-logo-handle-{width}.png', full_page=True)
    before = project_state(page, project_id)['project']['design']
    page.evaluate('async()=>await window.__hilvanaQaApp.getState().saveNow()')
    page.reload(wait_until='networkidle')
    page.get_by_role('button', name='Continuar a bordados', exact=True).click()
    assert project_state(page, project_id)['project']['design'] == before
    assert inspect_image(page, project_id)['base64'] == image['base64']
    page.locator('[data-assembly-element="' + logo['id'] + '"] image').wait_for()
    if width == 390:
        zip_size = check_zip(page, project_id, image)
        page.get_by_role('button', name='Generar patrones', exact=True).click()
        download = page.get_by_role('button', name='Descargar PDF completo', exact=True)
        download.wait_for()
        with page.expect_download(timeout=90000) as pending:
            download.click()
        path = '/tmp/hilvana-logo-image.pdf'
        pending.value.save_as(path)
        check_pdf(path, 80)
        print('ZIP con imagen y SVG relativo: ida/vuelta', zip_size, 'bytes PASS')
    assert not errors, errors
    print(f'Logo y asa {width}px: PNG, alpha, proporciones, arrastre, letra de 3mm, cancelación, fuera de zona, piezas, teclado y persistencia PASS')
    context.close()


if __name__ == '__main__':
    with sync_playwright() as p:
        browser = p.chromium.launch(executable_path='/usr/bin/chromium', args=['--no-sandbox'])
        try:
            for width in (390, 1440):
                run(browser, width)
        finally:
            browser.close()
