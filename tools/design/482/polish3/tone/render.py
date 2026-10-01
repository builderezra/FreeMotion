"""#482 polish batch 3 (tone) — render the before/after sheets at phone size (390 CSS px wide, 2x), through the real app.
Usage: python3 tools/design/482/polish3/tone/render.py [PORT] [SHEET ...]      (PORT = a running tools/serve.sh; default 9061)
Writes tools/design/482/polish3/<sheet>.jpg. Every number on a sheet is measured through FM.buildAudioFxChain — by sheet.js
itself, or for the review-fix sheets (pitch-finetune-level, pitch-finetune-drag) by data.py on the build before and after
the fix, read from tone/data/<sheet>.json."""
import os, sys, time, base64, json, tempfile, shutil
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, '..', '..', '..', '..', '..', 'tests'))
import _cdp  # noqa: E402

PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 9061
SHEETS = sys.argv[2:] or ['pitch-finetune', 'pitch-semitones', 'pitch-late', 'basstreble-bassat', 'basstreble-trebleat',
                          'eq3-lowat', 'eq3-highat', 'eq3-midwidth', 'pitch-finetune-level', 'pitch-finetune-drag']
W, H = 390, 1160   # each shot is cropped to its content, and stays under 3x its width
SHEET = open(os.path.join(HERE, 'sheet.js')).read()

profile = tempfile.mkdtemp(prefix='fm-482t-')
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
                if cdp.eval("!!(window.FM && FM.buildAudioFxChain && FM.audioFxRegistry && document.readyState === 'complete')"):
                    break
            except Exception:
                pass
            time.sleep(0.25)
        for _ in range(80):   # the splash must be gone, or it sits over the sheet
            if not cdp.eval("document.documentElement.classList.contains('splash-on')"):
                break
            time.sleep(0.25)
        time.sleep(1.0)
        # a before/after sheet draws numbers data.py measured on two builds (the review fixes); the rest measure here
        dp = os.path.join(HERE, 'data', name + '.json')
        data = open(dp).read() if os.path.exists(dp) else 'null'
        val = cdp.eval('window.__sheet482t = %s; window.__sheetData482t = %s; (async () => { %s\n })()' % (json.dumps(name), data, SHEET), await_promise=True)
        print(name, json.dumps(val)[:600])
        time.sleep(0.4)
        hh = min(H, int((val or {}).get('contentBottom') or H))
        d = cdp.send('Page.captureScreenshot', format='jpeg', quality=90, clip={'x': 0, 'y': 0, 'width': W, 'height': hh, 'scale': 1})['data']
        out = os.path.join(HERE, '..', name + '.jpg')
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
