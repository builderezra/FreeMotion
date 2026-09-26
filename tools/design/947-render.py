"""queue 947 — render the options: the REAL Home at 390x844 (notch emulated), the real New project dialog, and
each option's entrance from 947-proto.js frozen at exact progress points (Web Animations currentTime).
Usage: python3 tools/design/947-render.py OUTDIR A|B|C [light|dark]   (a fresh profile's Home is light)"""
import os, sys, time, base64, tempfile, shutil
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..', 'tests'))
import _cdp

OUT, OPT = sys.argv[1], sys.argv[2]
LOOK = sys.argv[3] if len(sys.argv) > 3 else ''
PROTO = open(os.path.join(os.path.dirname(__file__), '947-proto.js')).read()
W, H = 390, 844
profile = tempfile.mkdtemp(prefix='fm-947-')
port = _cdp.free_port()
proc = _cdp.launch(port, W, H, profile)
cdp = None
try:
    cdp = _cdp.CDP(_cdp.ws_url(port))
    cdp.send('Emulation.setDeviceMetricsOverride', width=W, height=H, deviceScaleFactor=2, mobile=True)
    cdp.send('Emulation.setSafeAreaInsetsOverride', insets={'top': 47, 'bottom': 0, 'left': 0, 'right': 0})
    cdp.send('Page.enable')
    cdp.send('Page.addScriptToEvaluateOnNewDocument', source="try { localStorage.setItem('fm.test.seedProject', '1'); } catch (e) {}")
    cdp.send('Page.navigate', url='http://localhost:8777/index.html')
    for _ in range(160):
        try:
            if cdp.eval("!!(window.FM && FM.scene && document.readyState === 'complete')"):
                break
        except Exception:
            pass
        time.sleep(0.25)
    cdp.send('Emulation.setTouchEmulationEnabled', enabled=True, maxTouchPoints=5)
    cdp.send('Emulation.setEmulatedMedia', features=[{'name': 'hover', 'value': 'none'}, {'name': 'pointer', 'value': 'coarse'}])
    for _ in range(80):
        if not cdp.eval("document.documentElement.classList.contains('splash-on')"):
            break
        time.sleep(0.25)
    time.sleep(2.2)
    if LOOK:
        cdp.eval("FM.settings.set('homeLight', %s); document.documentElement.setAttribute('data-home','%s'); 1" % ('true' if LOOK == 'light' else 'false', LOOK))
    cdp.eval("(function(){ if (!FM.home.isOpen()) FM.home.open(); })(); 1")
    time.sleep(2.2)   # the cards' rise has to finish, or it is in every frame
    cdp.eval(PROTO)
    cdp.eval("P947.play('%s'); 1" % OPT)
    tag = OPT + ('D' if LOOK == 'dark' else '')

    def snap(name):
        time.sleep(0.12)
        d = cdp.send('Page.captureScreenshot', format='png')['data']
        with open(os.path.join(OUT, name + '.png'), 'wb') as f:
            f.write(base64.b64decode(d))
    for i in range(0, 17):
        cdp.eval("P947.freeze(%f); 1" % (i / 16))
        snap('%s-%02d' % (tag, i))
finally:
    if cdp:
        cdp.close()
    proc.terminate()
    try:
        proc.wait(timeout=5)
    except Exception:
        proc.kill()
    shutil.rmtree(profile, ignore_errors=True)
