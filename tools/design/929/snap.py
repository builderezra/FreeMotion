#!/usr/bin/env python3
"""snap.py URL OUT [--width W] [--dpr D] [--wait MS] [--full] — screenshot any page (full height with --full)."""
import argparse, base64, os, shutil, sys, tempfile, time, json
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', '..', 'tests'))
import _cdp
ap = argparse.ArgumentParser()
ap.add_argument('url'); ap.add_argument('out')
ap.add_argument('--width', type=int, default=800); ap.add_argument('--height', type=int, default=800)
ap.add_argument('--dpr', type=float, default=1); ap.add_argument('--wait', type=int, default=800)
ap.add_argument('--full', action='store_true'); ap.add_argument('--ready', default=None)
a = ap.parse_args()
prof = tempfile.mkdtemp(prefix='fm-snap-'); port = _cdp.free_port()
proc = _cdp.launch(port, a.width, a.height, prof)
try:
    c = _cdp.CDP(_cdp.ws_url(port))
    c.send('Emulation.setDeviceMetricsOverride', width=a.width, height=a.height, deviceScaleFactor=a.dpr, mobile=False)
    c.send('Page.enable'); c.send('Page.navigate', url=a.url)
    t0 = time.time()
    while time.time() - t0 < 60:
        try:
            if c.eval("document.readyState==='complete'" + (" && !!(" + a.ready + ")" if a.ready else "")): break
        except Exception: pass
        time.sleep(0.25)
    time.sleep(a.wait / 1000)
    kw = {}
    if a.full:
        h = c.eval("Math.ceil(document.documentElement.scrollHeight)")
        c.send('Emulation.setDeviceMetricsOverride', width=a.width, height=int(h), deviceScaleFactor=a.dpr, mobile=False)
        time.sleep(0.4)
        kw = dict(captureBeyondViewport=True, clip={'x': 0, 'y': 0, 'width': a.width, 'height': int(h), 'scale': 1})
    fmt = 'jpeg' if a.out.endswith('.jpg') else 'png'
    extra = {'quality': 88} if fmt == 'jpeg' else {}
    s = c.send('Page.captureScreenshot', format=fmt, **kw, **extra)
    open(a.out, 'wb').write(base64.b64decode(s['data'])); print(a.out)
finally:
    proc.terminate(); shutil.rmtree(prof, ignore_errors=True)
