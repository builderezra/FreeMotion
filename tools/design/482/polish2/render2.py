"""#482 polish batch 2 — render the before/after strips at phone size (390 CSS px wide, 2x), through the real app.
Usage: python3 tools/design/482/polish2/render2.py [PORT] [SHEET ...]   (PORT = a running tools/serve.sh; default 9111)
With no SHEET names every strip is drawn. Each lands at tools/design/482/polish2/<sheet>.jpg. The tiles are drawn by
sheet2.js inside the app with FM.renderScene — nothing is mocked."""
import os, sys, time, base64, json, tempfile, shutil
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, '..', '..', '..', '..', 'tests'))
import _cdp  # noqa: E402

PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 9111
ALL = ['speedlines-boil', 'speedlines-style', 'speedlines-clearzoneshape', 'glitch-unevenslices', 'glitch-blockdamage',
       'glitch-pattern', 'glitch-edges', 'glitch-updown']
WANT = sys.argv[2:] or ALL
W, H = 390, 844
SHEET = open(os.path.join(HERE, 'sheet2.js')).read()

for name in WANT:
    profile = tempfile.mkdtemp(prefix='fm-482p2-')
    dport = _cdp.free_port()
    proc = _cdp.launch(dport, W, H, profile)
    cdp = None
    try:
        cdp = _cdp.CDP(_cdp.ws_url(dport))
        cdp.send('Emulation.setDeviceMetricsOverride', width=W, height=H, deviceScaleFactor=2, mobile=True)
        cdp.send('Page.enable')
        cdp.send('Page.navigate', url='http://localhost:%d/index.html' % PORT)
        for _ in range(200):
            try:
                if cdp.eval("!!(window.FM && FM.scene && FM.renderScene && FM.fxRegistry && document.readyState === 'complete')"):
                    break
            except Exception:
                pass
            time.sleep(0.25)
        for _ in range(80):   # the splash must be gone, or it sits over the sheet
            if not cdp.eval("document.documentElement.classList.contains('splash-on')"):
                break
            time.sleep(0.25)
        time.sleep(1.0)
        val = cdp.eval('(async () => { window.__SHEET = %s; %s\n })()' % (json.dumps(name), SHEET), await_promise=True)
        time.sleep(0.5)
        hh = min(H, int((val or {}).get('contentBottom') or H))   # crop the empty bottom: a short picture reaches his phone
        d = cdp.send('Page.captureScreenshot', format='jpeg', quality=88, clip={'x': 0, 'y': 0, 'width': W, 'height': hh, 'scale': 1})['data']
        out = os.path.join(HERE, name + '.jpg')
        with open(out, 'wb') as f:
            f.write(base64.b64decode(d))
        print(out, hh)
    finally:
        if cdp:
            cdp.close()
        proc.terminate()
        try:
            proc.wait(timeout=5)
        except Exception:
            proc.kill()
        shutil.rmtree(profile, ignore_errors=True)
