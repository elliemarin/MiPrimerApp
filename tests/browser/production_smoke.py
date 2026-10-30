"""Prueba del build publicado: imágenes, Intervenir sin recarga, PDF y PWA offline.

Local: BASE_PATH=/MiPrimerApp/ npm run build
       BASE_PATH=/MiPrimerApp/ npm run preview -- --host 127.0.0.1 --port 4174
       python tests/browser/production_smoke.py
Público: HILVANA_PRODUCTION_URL=https://elliemarin.github.io/MiPrimerApp/ python tests/browser/production_smoke.py
Requiere Playwright, Chromium y PyMuPDF; usa un contexto temporal sin datos reales.
"""
import os, json, sys
from playwright.sync_api import sync_playwright
import pymupdf
BASE=os.environ.get('HILVANA_PRODUCTION_URL','http://127.0.0.1:4174/MiPrimerApp/').rstrip('/')
with sync_playwright() as p:
 launch={'executable_path':'/usr/bin/chromium','args':['--no-sandbox']}
 if BASE.startswith('https:') and os.environ.get('HTTPS_PROXY'):
  launch['proxy']={'server':os.environ['HTTPS_PROXY']}
 browser=p.chromium.launch(**launch)
 context=browser.new_context(viewport={'width':390,'height':844},is_mobile=True,has_touch=True,accept_downloads=True,ignore_https_errors=True)
 page=context.new_page()
 errors=[]
 page.on('pageerror',lambda error:errors.append(str(error)))
 page.goto(BASE+'/#/biblioteca',wait_until='networkidle')
 page.locator('.catalog-photo img').first.wait_for()
 page.wait_for_function("()=>Array.from(document.querySelectorAll('.catalog-photo img')).slice(0,4).every(i=>i.complete&&i.naturalWidth>0)")
 assert '110 diseños' in page.inner_text('body'), page.inner_text('body')[:1200]
 assert page.evaluate('document.documentElement.scrollWidth<=innerWidth+1')
 page.goto(BASE+'/#/biblioteca/body-bebe',wait_until='networkidle')
 assert 'Ilustración generada con IA' in page.inner_text('body')
 page.get_by_role('button',name='Intervenir',exact=True).click()
 page.get_by_role('button',name='Colocar extras',exact=True).click()
 page.wait_for_url('**/#/personalizar/**')
 project=page.url.rsplit('/',1)[-1]
 page.locator('[data-assembly-view="armado-frente"]').wait_for()
 page.get_by_role('button',name='Espalda',exact=True).click()
 page.locator('[data-assembly-view="armado-espalda"]').wait_for()
 page.get_by_role('button',name='Elegir telas',exact=True).click()
 page.get_by_role('button',name='Elegir tela o color',exact=True).click()
 page.get_by_role('button',name='Color #24584A',exact=True).click()
 page.get_by_role('button',name='Continuar a bordados',exact=True).click()
 page.get_by_role('button',name='Generar patrones',exact=True).click()
 page.get_by_role('button',name='Descargar PDF completo',exact=True).wait_for()
 with page.expect_download(timeout=60000) as dl:
  page.get_by_role('button',name='Descargar PDF completo',exact=True).click()
 path='/tmp/hilvana-published-body.pdf' if BASE.startswith('https:') else '/tmp/hilvana-production-body.pdf'
 dl.value.save_as(path)
 pdf=pymupdf.open(path)
 manifest=json.loads(pdf.embfile_get('confeccion.json'))
 assert len(manifest['pieces'])==9,manifest['pieces']
 section=next(s for s in manifest['sections'] if s['id']=='patron')
 widths=[round(d['rect'].width*25.4/72,3) for d in pdf[section['startPage']-1].get_drawings() if d.get('fill') is not None]
 assert widths[:2]==[50.0,100.0],widths
 print('PASS production',BASE,'new project without reload, 9 templates, PDF',len(pdf),'pages, controls',widths[:2])
 if not BASE.startswith('https:'):
  page.goto(BASE+'/#/biblioteca',wait_until='networkidle')
  page.evaluate('async()=>{await navigator.serviceWorker.ready;}')
  page.reload(wait_until='networkidle')
  page.wait_for_function('!!navigator.serviceWorker.controller')
  page.wait_for_function("()=>Array.from(document.querySelectorAll('.catalog-photo img')).slice(0,4).every(i=>i.complete&&i.naturalWidth>0)")
  context.set_offline(True)
  page.reload(wait_until='networkidle')
  page.wait_for_function("()=>document.querySelectorAll('.catalog-photo img').length>0&&Array.from(document.querySelectorAll('.catalog-photo img')).slice(0,4).every(i=>i.complete&&i.naturalWidth>0)")
  print('PASS offline PWA: app and generated catalogue images')
 assert not errors,errors
 page.screenshot(path='/tmp/hilvana-published-final.png' if BASE.startswith('https:') else '/tmp/hilvana-production-offline.png',full_page=True)
 browser.close()
