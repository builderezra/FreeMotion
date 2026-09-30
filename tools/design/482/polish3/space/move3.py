"""#482 batch 3 review fix: draw what nudging Low cut while it plays does, before the fix and now, at phone size (390 CSS px,
2x), through the real app. Usage: python3 tools/design/482/polish3/space/move3.py PORT [BEFORE_COMMIT]
PORT = a running tools/serve.sh on this tree. BEFORE_COMMIT (default 83012563, the batch-3 build before the fix) supplies
js/audio-fx.js for the before half, loaded beside the current one as its own module. Lands as
tools/design/482/polish3/echo-reverb-lowcut-move.jpg."""
import os, sys, time, base64, json, tempfile, shutil, io, subprocess
HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.normpath(os.path.join(HERE, '..', '..', '..', '..', '..'))
sys.path.insert(0, os.path.join(ROOT, 'tests'))
import _cdp  # noqa: E402
from PIL import Image  # noqa: E402

PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 9091
BEFORE = sys.argv[2] if len(sys.argv) > 2 else '83012563'
W, H = 390, 1160   # under 3x as tall as wide: a taller picture does not reach his phone whole
SHEET = open(os.path.join(HERE, 'move3.js')).read()
OLD = subprocess.check_output(['git', '-C', ROOT, 'show', BEFORE + ':js/audio-fx.js']).decode('utf-8')

profile = tempfile.mkdtemp(prefix='fm-482c-move-')
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
            if cdp.eval("!!(window.FM && FM.scene && FM.buildAudioFxChain && document.readyState === 'complete')"):
                break
        except Exception:
            pass
        time.sleep(0.25)
    for _ in range(80):   # the splash must be gone, or it sits over the sheet
        if not cdp.eval("document.documentElement.classList.contains('splash-on')"):
            break
        time.sleep(0.25)
    time.sleep(1.0)
    # The build before the fix, as its own module: the same file, registering into a copy of FM instead of FM itself.
    cdp.eval("(function (src) { var M = Object.assign({}, FM); new Function('M', src.replace(/\\}\\)\\(window\\.FM\\);\\s*$/, '})(M);'))(M); window.__482cOld = M; return !!M.buildAudioFxChain && M.buildAudioFxChain !== FM.buildAudioFxChain; })(%s)" % json.dumps(OLD))
    if not cdp.eval("!!(window.__482cOld && window.__482cOld.buildAudioFxChain !== FM.buildAudioFxChain)"):
        raise SystemExit('the before-build module did not load')
    cdp.eval('(async () => { %s\n })()' % SHEET, await_promise=True)
    val = cdp.eval('window.__482cMove()', await_promise=True)
    time.sleep(0.4)
    hh = min(H, int((val or {}).get('contentBottom') or H))
    d = cdp.send('Page.captureScreenshot', format='png', clip={'x': 0, 'y': 0, 'width': W, 'height': hh, 'scale': 1})['data']
    im = Image.open(io.BytesIO(base64.b64decode(d))).convert('RGB')
    out = os.path.normpath(os.path.join(HERE, '..', 'echo-reverb-lowcut-move.jpg'))
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
