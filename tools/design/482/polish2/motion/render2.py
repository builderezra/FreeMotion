"""#482 polish batch 2 — render the before/after picture of every new mover control at phone size (390 CSS px, 2x),
through the real app. Usage: python3 tools/design/482/polish2/render2.py PORT [ID ...]
PORT = a running tools/serve.sh. With no IDs, every picture sheet2.js knows. Each lands as tools/design/482/polish2/<id>.jpg.
The frames are drawn by sheet2.js inside the app with FM.renderScene — nothing is mocked."""
import os, sys, time, base64, json, tempfile, shutil, io
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, '..', '..', '..', '..', '..', 'tests'))
import _cdp  # noqa: E402
from PIL import Image  # noqa: E402

PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 9051
WANT = sys.argv[2:]
W, H = 390, 844
SHEET = open(os.path.join(HERE, 'sheet2.js')).read()

profile = tempfile.mkdtemp(prefix='fm-482b-')
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
    ids = cdp.eval('(async () => { %s\n })()' % SHEET, await_promise=True)
    for pid in (WANT or ids):
        val = cdp.eval('window.__482b(%s)' % json.dumps(pid))
        time.sleep(0.4)
        hh = min(H, int((val or {}).get('contentBottom') or H))
        d = cdp.send('Page.captureScreenshot', format='png', clip={'x': 0, 'y': 0, 'width': W, 'height': hh, 'scale': 1})['data']
        im = Image.open(io.BytesIO(base64.b64decode(d))).convert('RGB')
        out = os.path.join(HERE, '..', pid + '.jpg')
        im.save(out, quality=88)
        print(out, im.size)
finally:
    if cdp:
        cdp.close()
    proc.terminate()
    try:
        proc.wait(timeout=5)
    except Exception:
        proc.kill()
    shutil.rmtree(profile, ignore_errors=True)
