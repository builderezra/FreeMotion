#!/usr/bin/env python3
"""Capture the candidate collection after its embedded FreeMotion renderer reports ready."""
import base64
import os
import shutil
import sys
import tempfile
import time

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '../../../..'))
sys.path.insert(0, os.path.join(ROOT, 'tests'))
import _cdp  # noqa: E402

PORT = int(os.environ.get('FM_SHAPE_PORT', '8798'))
HERE = os.path.dirname(__file__)
PATH = '/outside/chatgpt/shape-review/2026-10-04-six-integrated/full-fifteen-native.html'


def main():
    profile = tempfile.mkdtemp(prefix='fm-shape-collection-')
    debug_port = _cdp.free_port()
    browser = _cdp.launch(debug_port, 1700, 1200, profile)
    cdp = None
    try:
        cdp = _cdp.CDP(_cdp.ws_url(debug_port))
        cdp.send('Page.enable')
        for view in ('picker', 'canvas'):
            height = 1000 if view == 'picker' else 1200
            cdp.send('Emulation.setDeviceMetricsOverride', width=1700, height=height,
                     deviceScaleFactor=1, mobile=False)
            cdp.send('Page.navigate', url=f'http://127.0.0.1:{PORT}{PATH}?v={view}#{view}')
            deadline = time.time() + 35
            repaired = False
            while time.time() < deadline:
                title = cdp.eval('document.title')
                if (title == 'Full production shape collection READY'
                        and cdp.eval('document.location.search') == f'?v={view}'):
                    break
                if not repaired and time.time() < deadline - 31:
                    repaired = True
                    cdp.eval('''(async () => {
                      const win=document.getElementById('app').contentWindow;
                      if (!win.FM || win.FM.SHAPE_POLYS) return;
                      for(const path of ['js/scene.js','js/media.js','js/compositor.js']) {
                        const src=await (await fetch('/'+path,{cache:'no-store'})).text();
                        const script=win.document.createElement('script');
                        script.textContent=src;win.document.body.appendChild(script);
                      }
                    })()''', await_promise=True)
                if title == 'Full production shape collection ERROR':
                    state = cdp.eval('''JSON.stringify({app:!!document.getElementById('app').contentWindow.FM,
                      polys:!!document.getElementById('app').contentWindow.FM?.SHAPE_POLYS,
                      trace:!!document.getElementById('app').contentWindow.FM?.traceShapePath,
                      ctrl:!!document.getElementById('app').contentWindow.FM?.pointCtrl})''')
                    raise RuntimeError(f'{view} render failed: {state}')
                time.sleep(.1)
            else:
                raise RuntimeError(f'{view} render did not become ready')
            height = cdp.eval('document.documentElement.scrollHeight')
            cdp.send('Emulation.setDeviceMetricsOverride', width=1700, height=height,
                     deviceScaleFactor=1, mobile=False)
            time.sleep(.15)
            shot = cdp.send('Page.captureScreenshot', format='png', captureBeyondViewport=True)
            out = os.path.join(HERE, f'full-fifteen-{view}.png')
            with open(out, 'wb') as f:
                f.write(base64.b64decode(shot['data']))
            print(out)
    finally:
        if cdp:
            cdp.close()
        browser.terminate()
        try:
            browser.wait(timeout=5)
        except Exception:
            browser.kill()
        shutil.rmtree(profile, ignore_errors=True)


if __name__ == '__main__':
    main()
