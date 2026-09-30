"""#482 polish batch 2 (rhythm) — render the before/after sheets at phone size (390 CSS px wide, 2x), through the real app.
Usage: python3 tools/design/482/polish2/render.py [PORT] [SHEET ...]      (PORT = a running tools/serve.sh; default 9111)
Writes tools/design/482/polish2/<sheet>.jpg. The tiles are drawn by sheet.js inside the app with FM.renderScene.
objectblur-edges-before / objectblur-edges-after are one strip drawn twice — against a server of the older tree and of the
fixed one — and stacked into objectblur-shutterphase-edges.jpg (the panel-flashdark-default pair the same way, side by side)."""
import os, sys, time, base64, json, tempfile, shutil
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, '..', '..', '..', '..', 'tests'))
import _cdp  # noqa: E402

PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 9111
SHEETS = sys.argv[2:] or ['flashdark-rhythm', 'flashdark-holddark', 'framestutter-trailstrength', 'framestutter-phase',
                          'framestutter-irregularholds', 'objectblur-shutterphase']
W, H = 390, 1160   # tall enough for the longest sheet; each shot is cropped to its content, and stays under 3x its width
SHEET = open(os.path.join(HERE, 'sheet.js')).read()

profile = tempfile.mkdtemp(prefix='fm-482b-')
dport = _cdp.free_port()
proc = _cdp.launch(dport, W, H, profile)
cdp = None
try:
    cdp = _cdp.CDP(_cdp.ws_url(dport))
    cdp.send('Emulation.setDeviceMetricsOverride', width=W, height=H, deviceScaleFactor=2, mobile=True)
    cdp.send('Page.enable')
    for name in SHEETS:
        cdp.send('Page.navigate', url='http://localhost:%d/index.html' % PORT)
        time.sleep(0.5)
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
        val = cdp.eval('window.__sheet482b = %s; (async () => { %s\n })()' % (json.dumps(name), SHEET), await_promise=True)
        print(json.dumps(val))
        time.sleep(0.5)
        hh = min(H, int((val or {}).get('contentBottom') or H))
        d = cdp.send('Page.captureScreenshot', format='jpeg', quality=88, clip={'x': 0, 'y': 0, 'width': W, 'height': hh, 'scale': 1})['data']
        out = os.path.join(HERE, name + '.jpg')
        with open(out, 'wb') as f:
            f.write(base64.b64decode(d))
        print(out, '%dx%d CSS px' % (W, hh))
finally:
    if cdp:
        cdp.close()
    proc.terminate()
    try:
        proc.wait(timeout=5)
    except Exception:
        proc.kill()
    shutil.rmtree(profile, ignore_errors=True)
