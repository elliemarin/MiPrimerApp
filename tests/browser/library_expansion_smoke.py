"""Con npm run dev activo: filtros, ilustración, navegación y fuentes en móvil.
Requiere Python Playwright y Chromium; usa un contexto nuevo.
HILVANA_TEST_URL permite cambiar el servidor local.
"""
import os
from playwright.sync_api import sync_playwright
base=os.environ.get('HILVANA_TEST_URL','http://localhost:5173')
with sync_playwright() as p:
 b=p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 page=b.new_page(viewport={'width':390,'height':844});errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 page.goto(base+'/#/biblioteca');page.wait_for_load_state('networkidle')
 page.get_by_role('searchbox',name='Buscar modelos').fill('chamarra')
 assert page.locator('.cards .card').count()>0
 page.get_by_role('searchbox',name='Buscar modelos').fill('')
 page.get_by_role('button',name='Chaquetas y abrigos',exact=True).click()
 page.get_by_role('button',name='Ilustración',exact=True).click()
 page.screenshot(path='/tmp/hilvana-library2-jackets.png',full_page=True)
 page.locator('a[href*="/biblioteca/chaqueta-cierre"]').click();page.wait_for_load_state('networkidle')
 page.get_by_label('Figurín',exact=True).select_option('curvas')
 page.get_by_role('button',name='Piel #603d2f',exact=True).click()
 page.screenshot(path='/tmp/hilvana-library2-model.png',full_page=True)
 assert not page.evaluate('document.documentElement.scrollWidth>innerWidth')
 page.get_by_role('button',name='Biblioteca',exact=True).first.click()
 assert page.get_by_role('button',name='Chaquetas y abrigos',exact=True).get_attribute('aria-pressed')=='true'
 assert page.get_by_role('button',name='Ilustración',exact=True).get_attribute('aria-pressed')=='true'
 page.get_by_role('button',name='Quitar todos los filtros',exact=True).click()
 page.get_by_role('button',name='Bebé',exact=True).click()
 page.get_by_label('Talla de bebé',exact=True).select_option('B0-6')
 page.locator('a[href*="/biblioteca/body-bebe"]').click()
 assert 'talla=B0-6' in page.url
 page.get_by_role('button',name='Biblioteca',exact=True).first.click()
 assert page.get_by_label('Talla de bebé',exact=True).input_value()=='B0-6'
 page.get_by_role('button',name='Quitar todos los filtros',exact=True).click()
 page.get_by_label('Qué quieres hacer',exact=True).select_option('patron')
 cards=page.locator('.cards .card').all_inner_texts()
 assert cards and all('Patrón' in s for s in cards)
 page.get_by_role('button',name='Quitar todos los filtros',exact=True).click()
 page.get_by_role('button',name='Accesorios',exact=True).click()
 before=page.locator('.cards .card').count(); assert before>15
 options=page.get_by_label('Tipo de accesorio',exact=True).locator('option').all_text_contents()
 page.get_by_label('Tipo de accesorio',exact=True).select_option(index=1)
 assert 0<page.locator('.cards .card').count()<before
 page.screenshot(path='/tmp/hilvana-library2-accessories.png',full_page=True)
 page.get_by_role('button',name='Quitar todos los filtros',exact=True).click()
 page.get_by_text('Explorar otras bibliotecas de patrones',exact=False).click()
 page.get_by_label('Buscar fuentes',exact=True).fill('accesorios')
 page.screenshot(path='/tmp/hilvana-library2-sources.png',full_page=True)
 assert not page.evaluate('document.documentElement.scrollWidth>innerWidth')
 page.goto(base+'/#/biblioteca/jumper-peto-midi');page.wait_for_load_state('networkidle')
 page.screenshot(path='/tmp/hilvana-library2-jumper.png',full_page=True)
 page.goto(base+'/#/biblioteca/mono-baggy');page.wait_for_load_state('networkidle')
 page.screenshot(path='/tmp/hilvana-library2-mono.png',full_page=True)
 print('filter, preview, baby/back, availability, accessories, sources QA errors:',errors)
 assert not errors
 b.close()
