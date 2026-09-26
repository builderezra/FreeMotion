"""queue 948 — render the + menu options over the REAL Home (390x844, notch emulated), Elements/Templates tab behind.
Usage: python3 tools/design/948-render.py OUTDIR light|dark"""
import os, sys, time, base64, tempfile, shutil
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..', 'tests'))
import _cdp
OUT, LOOK = sys.argv[1], sys.argv[2]
PROTO = open(os.path.join(os.path.dirname(__file__), '948-proto.js')).read()
W, H = 390, 844
profile = tempfile.mkdtemp(prefix='fm-948-'); port = _cdp.free_port(); proc = _cdp.launch(port, W, H, profile); cdp = None
try:
    cdp = _cdp.CDP(_cdp.ws_url(port))
    cdp.send('Emulation.setDeviceMetricsOverride', width=W, height=H, deviceScaleFactor=2, mobile=True)
    cdp.send('Emulation.setSafeAreaInsetsOverride', insets={'top': 47, 'bottom': 20, 'left': 0, 'right': 0})
    cdp.send('Page.enable')
    cdp.send('Page.addScriptToEvaluateOnNewDocument', source="try { localStorage.setItem('fm.test.seedProject', '1'); } catch (e) {}")
    cdp.send('Page.navigate', url='http://localhost:8777/index.html')
    for _ in range(160):
        try:
            if cdp.eval("!!(window.FM && FM.scene && document.readyState === 'complete')"): break
        except Exception: pass
        time.sleep(0.25)
    for _ in range(80):
        if not cdp.eval("document.documentElement.classList.contains('splash-on')"): break
        time.sleep(0.25)
    time.sleep(2.0)
    cdp.eval("FM.settings.set('homeLight', %s); document.documentElement.setAttribute('data-home','%s'); if (!FM.home.isOpen()) FM.home.open(); 1" % ('true' if LOOK == 'light' else 'false', LOOK))
    time.sleep(1.5)
    cdp.eval(PROTO)
    def snap(name):
        time.sleep(0.35)
        d = cdp.send('Page.captureScreenshot', format='png')['data']
        open(os.path.join(OUT, name + '.png'), 'wb').write(base64.b64decode(d))
    for kind, tab in (('element', 'elements'), ('template', 'templates')):
        cdp.eval("(function(){ const t=[...document.querySelectorAll('.hm-tab')].find(b=>b.dataset.tab==='%s'); if (t) t.click(); })(); 1" % tab)
        time.sleep(1.2)
        for opt, step in (('A', 1), ('B', 1), ('B', 2), ('C', 1)):
            cdp.eval("P948.show('%s','%s',%d); 1" % (opt, kind, step))
            snap('%s%s-%s-%s' % (opt, '' if step == 1 else '2', kind, LOOK))
finally:
    if cdp: cdp.close()
    proc.terminate()
    try: proc.wait(timeout=5)
    except Exception: proc.kill()
    shutil.rmtree(profile, ignore_errors=True)
