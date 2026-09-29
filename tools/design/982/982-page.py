"""queue 982 — THROWAWAY. Screenshot a plain page (the options sheet) full-length in a headless Chrome.
Usage: python3 tools/design/982/982-page.py URL OUT.png [WIDTH]    (needs tools/serve.sh on the URL's port)"""
import os, sys, time, base64, tempfile, shutil
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', '..', 'tests'))
import _cdp
URL, OUT = sys.argv[1], sys.argv[2]
W = int(sys.argv[3]) if len(sys.argv) > 3 else 900
profile = tempfile.mkdtemp(prefix='fm-982-'); port = _cdp.free_port(); proc = _cdp.launch(port, W, 800, profile); cdp = None
try:
    cdp = _cdp.CDP(_cdp.ws_url(port))
    cdp.send('Emulation.setDeviceMetricsOverride', width=W, height=800, deviceScaleFactor=2, mobile=False)
    cdp.send('Page.enable')
    cdp.send('Page.navigate', url=URL)
    for _ in range(80):
        try:
            if cdp.eval("document.readyState === 'complete' && [...document.images].every(i => i.complete)"): break
        except Exception: pass
        time.sleep(0.25)
    time.sleep(0.6)
    h = int(cdp.eval("Math.ceil(document.documentElement.scrollHeight)"))
    cdp.send('Emulation.setDeviceMetricsOverride', width=W, height=h, deviceScaleFactor=2, mobile=False)
    time.sleep(0.5)
    d = cdp.send('Page.captureScreenshot', format='png', captureBeyondViewport=True)['data']
    open(OUT, 'wb').write(base64.b64decode(d))
    print(OUT, W, h)
finally:
    if cdp: cdp.close()
    proc.terminate()
    try: proc.wait(timeout=5)
    except Exception: proc.kill()
    shutil.rmtree(profile, ignore_errors=True)
