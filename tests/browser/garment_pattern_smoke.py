"""Crear haori desde la ficha y descargar PDF real. Requiere dev, Playwright y pymupdf.
HILVANA_TEST_URL permite otro servidor. Contexto móvil limpio, sin datos del usuario.
"""
from playwright.sync_api import sync_playwright
import os, pymupdf
with sync_playwright() as p:
 b=p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 page=b.new_page(viewport={'width':390,'height':844});errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 page.goto(os.environ.get('HILVANA_TEST_URL','http://localhost:5173')+'/#/biblioteca/haori-corto')
 page.wait_for_load_state('networkidle')
 page.get_by_role('button',name='Crear proyecto con este modelo',exact=True).click()
 page.get_by_label('Talla',exact=True).select_option('M92')
 page.get_by_role('button',name='Crear proyecto',exact=True).click()
 page.wait_for_url('**/#/patronaje/**')
 page.get_by_role('button',name='Exportar',exact=True).last.click()
 with page.expect_download() as info: page.get_by_role('button',name='Descargar PDF a escala real',exact=True).last.click()
 file='/tmp/hilvana-haori-patron.pdf';info.value.save_as(file)
 doc=pymupdf.open(file)
 widths=[round(r['rect'].width*25.4/72,3) for r in doc[0].get_drawings() if r.get('fill') is not None]
 assert widths[:2]==[50.0,100.0],widths
 assert len(doc)>1
 assert not errors,errors
 print('Haori M92 creado desde interfaz; PDF descargado:',len(doc),'páginas, calibración',widths[:2],'; errores:',errors)
 b.close()
