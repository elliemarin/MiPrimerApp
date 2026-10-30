"""Contact sheet for every grouped pattern, plus real mobile catalog cards.

The temporary contact sheet uses the same FlatArt component as LibraryPage. Its
reference objects are presentation only; the underlying flat is compared before
and after rendering. No project or pattern is created or changed.
"""
import json
import os

from playwright.sync_api import sync_playwright

BASE = os.environ.get('HILVANA_TEST_URL', 'http://localhost:5173').rstrip('/')

with sync_playwright() as playwright:
    browser = playwright.chromium.launch(executable_path='/usr/bin/chromium', args=['--no-sandbox'])
    for width in (390, 1500):
        context = browser.new_context(viewport={'width': width, 'height': 900})
        page = context.new_page()
        errors = []
        page.on('pageerror', lambda error: errors.append(str(error)))
        page.goto(BASE)
        page.wait_for_load_state('networkidle')
        if width == 390:
            page.get_by_role('searchbox', name='Buscar prendas y accesorios').fill('funda')
            page.wait_for_timeout(300)
            assert page.locator('.simple-pattern-card .catalog-reference').count() >= 8
            page.screenshot(path='/tmp/hilvana-art-library-390.png', full_page=True)
        data = page.evaluate('''async () => {
          const {CATALOG}=await import('/src/data/catalog.ts');
          const {groupCatalog}=await import('/src/features/library/groups.ts');
          const {modelHasPattern}=await import('/src/features/library/filters.ts');
          const {getFlat,FlatArt}=await import('/src/ui/FlatArt.tsx');
          const React=(await import('/node_modules/.vite/deps/react.js')).default;
          const {createRoot}=(await import('/node_modules/.vite/deps/react-dom_client.js')).default;
          const groups=groupCatalog(CATALOG.filter(modelHasPattern));
          const before=groups.map(g=>JSON.stringify(getFlat(g.representative.id,g.representative.flat)));
          document.body.innerHTML='<div id="contact"></div>';
          createRoot(document.getElementById('contact')).render(React.createElement('div',{
            style:{display:'grid',gridTemplateColumns:innerWidth<500?'repeat(2,1fr)':'repeat(6,1fr)',gap:12,padding:12,background:'#faf8f1'}
          },groups.map(g=>React.createElement('div',{
            key:g.id,'data-contact-id':g.id,
            style:{height:245,padding:10,background:'#f1eee5',font:'13px sans-serif',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center'}
          },React.createElement('div',{style:{height:195,width:'100%',display:'flex',alignItems:'center',justifyContent:'center'}},
             React.createElement(FlatArt,{id:g.representative.id,spec:g.representative.flat,title:g.name,catalog:true})),
             React.createElement('strong',{style:{paddingTop:10}},g.name)))));
          window.__catalogArtAudit={groups,before,getFlat};
          return groups.map(g=>({id:g.id,name:g.name,model:g.representative.id}));
        }''')
        page.add_style_tag(content='#contact svg.flat-art{height:185px!important;width:100%!important;}')
        page.wait_for_timeout(400)
        assert page.locator('[data-contact-id]').count() == len(data)
        assert page.locator('.catalog-reference').count() >= 25
        assert page.evaluate('document.documentElement.scrollWidth<=innerWidth+1')
        assert page.evaluate('''()=>{const {groups,before,getFlat}=window.__catalogArtAudit;
          return groups.every((g,i)=>JSON.stringify(getFlat(g.representative.id,g.representative.flat))===before[i]);}''')
        assert not errors, errors
        page.screenshot(path=f'/tmp/hilvana-art-contact-{width}.png', full_page=True)
        if width == 1500:
            with open('/tmp/hilvana-art-audit.json', 'w') as artifact:
                json.dump(data, artifact, ensure_ascii=False, indent=2)
        print(f'PASS: {len(data)} diseños, {width}px, referencias separadas, geometría sin mutación')
        context.close()
    browser.close()
