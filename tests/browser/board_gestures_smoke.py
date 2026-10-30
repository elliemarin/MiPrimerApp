"""Regresión del lienzo: dos toques, arrastres rápidos y pellizco. Requiere Vite en5173."""
import os
from playwright.sync_api import sync_playwright

URL = os.environ.get('HILVANA_TEST_URL', 'http://localhost:5173')

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True, executable_path='/usr/bin/chromium', args=['--no-sandbox'])
    context = browser.new_context(viewport={'width': 900, 'height': 800}, has_touch=True)
    page = context.new_page()
    errors = []
    page.on('pageerror', lambda e: errors.append(str(e)))
    page.goto(URL)
    page.wait_for_load_state('networkidle')
    page.evaluate('''async () => {
      const reactModule = await import('/node_modules/.vite/deps/react.js');
      const React = reactModule.default ?? reactModule;
      const domModule = await import('/node_modules/.vite/deps/react-dom_client.js');
      const {createRoot} = domModule.default ?? domModule;
      const {Board,useViewport} = await import('/src/ui/Board.tsx');
      const host = document.createElement('div');
      host.style.cssText = 'position:fixed;inset:0;z-index:10000;background:white;display:flex';
      document.body.append(host);
      window.boardCalls=[];
      function Harness() {
        const vp=useViewport();
        const log=name=>()=>window.boardCalls.push(name);
        return React.createElement(Board,{vp,unit:'cm',handlers:{
          onDown:()=>{window.boardCalls.push('down');return true},
          onMove:log('move'),onUp:log('up'),onDoubleTap:log('double'),
          onPinchStart:()=>{window.boardCalls.push('pinch-start');return true},
          onPinchMove:log('pinch-move'),onPinchEnd:log('pinch-end')
        }});
      }
      createRoot(host).render(React.createElement(Harness));
    }''')
    page.locator('body > div:last-child .ed-canvas').wait_for()
    page.wait_for_timeout(100)

    def reset():
        page.wait_for_timeout(320)
        page.evaluate('window.boardCalls=[]')

    def calls():
        return page.evaluate('window.boardCalls')

    # Two nearby taps close a shape once and do not insert a duplicate point.
    page.touchscreen.tap(120, 150)
    page.touchscreen.tap(124, 153)
    assert calls() == ['down', 'up', 'double'], calls()

    # A quick next click elsewhere is its own action, not a double tap.
    reset()
    page.touchscreen.tap(120, 150)
    page.touchscreen.tap(340, 350)
    assert calls() == ['down', 'up', 'down', 'up'], calls()

    # A stroke does not make the following click disappear.
    reset()
    page.mouse.move(120, 150)
    page.mouse.down()
    page.mouse.move(180, 190, steps=4)
    page.mouse.up()
    page.mouse.click(185, 192)
    assert calls().count('down') == 2 and 'double' not in calls(), calls()

    # A second gesture starting nearby can be dragged rather than double-tapped.
    reset()
    page.mouse.click(120, 150)
    page.mouse.move(124, 153)
    page.mouse.down()
    page.mouse.move(220, 230, steps=4)
    page.mouse.up()
    assert calls().count('down') == 2 and calls().count('up') == 2 and 'double' not in calls(), calls()

    # A held second touch also remains a normal tool action.
    reset()
    page.mouse.click(120, 150)
    page.mouse.move(124, 153)
    page.mouse.down()
    page.wait_for_timeout(280)
    page.mouse.up()
    assert calls() == ['down', 'up', 'down', 'up'], calls()

    # The second finger cancels tap detection. Lifting both ends the pinch once.
    reset()
    cdp = context.new_cdp_session(page)
    def touch(kind, points):
        cdp.send('Input.dispatchTouchEvent', {'type': kind, 'touchPoints': [{'x': x, 'y': y, 'id': i} for i, (x, y) in enumerate(points)]})
    touch('touchStart', [(250, 300)])
    touch('touchStart', [(250, 300), (350, 300)])
    touch('touchMove', [(230, 300), (370, 300)])
    touch('touchEnd', [])
    assert calls().count('pinch-start') == 1 and calls().count('pinch-end') == 1, calls()
    assert calls().count('down') == 1 and calls().count('up') == 1 and 'double' not in calls(), calls()
    assert not errors, errors
    print('PASS: double tap corto/cercano, clic rápido distante, trazo, segundo arrastre, pulsación larga y pellizco con fin único.')
    browser.close()
