"""#482 — render the Gradient Overlay default-amount sheet at phone size (390x844 CSS px, 2x), through the real app.
Usage: python3 tools/design/482/render.py [PORT] [OUT.png]      (PORT = a running tools/serve.sh; default 9111)
The tiles are drawn by tools/design/482/sheet.js inside the app with FM.renderScene — nothing is mocked."""
import os, sys, time, base64, json, tempfile, shutil
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, '..', '..', '..', 'tests'))
import _cdp  # noqa: E402

PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 9111
OUT = sys.argv[2] if len(sys.argv) > 2 else os.path.join(HERE, 'gradient-overlay-amount.png')
W, H = 390, 844
SHEET = open(os.path.join(HERE, 'sheet.js')).read()

profile = tempfile.mkdtemp(prefix='fm-482-')
dport = _cdp.free_port()
proc = _cdp.launch(dport, W, H, profile)
cdp = None
try:
    cdp = _cdp.CDP(_cdp.ws_url(dport))
    cdp.send('Emulation.setDeviceMetricsOverride', width=W, height=H, deviceScaleFactor=2, mobile=True)
    cdp.send('Page.enable')
    cdp.send('Page.navigate', url='http://localhost:%d/index.html' % PORT)
    for _ in range(160):
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
    val = cdp.eval('(async () => { %s\n })()' % SHEET, await_promise=True)
    print(json.dumps(val))
    time.sleep(0.6)
    hh = min(H, int((val or {}).get('contentBottom') or H))   # crop the empty bottom: a short picture reaches his phone
    d = cdp.send('Page.captureScreenshot', format='png', clip={'x': 0, 'y': 0, 'width': W, 'height': hh, 'scale': 1})['data']
    with open(OUT, 'wb') as f:
        f.write(base64.b64decode(d))
    print(OUT)
finally:
    if cdp:
        cdp.close()
    proc.terminate()
    try:
        proc.wait(timeout=5)
    except Exception:
        proc.kill()
    shutil.rmtree(profile, ignore_errors=True)
