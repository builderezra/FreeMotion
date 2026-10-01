"""#482 batch 4 (the Filters tab) — the browser driver for the options sheet. Boots the REAL app in headless Chrome at a
given CSS size (2x), then runs page scripts from this folder (setup.js puts a real photo from fx-art/ on an image layer,
opens the inspector's Filters tab and picks a filter; options.js draws one option into that live tab) and screenshots.

Nothing in the app is changed: every option is DOM injected into the live Filters tab and thrown away with the browser.
Usage (PORT = a running tools/serve.sh):
    python3 tools/design/482/batch4/src/drive.py PORT W H SCRIPT.js[,SCRIPT2.js…] OUT.png [ARG] ['{"__b4pick":"coldsteel"}']
ARG is handed to the scripts as window.__b4arg (which option to draw); the JSON sets other window.__b4* knobs.
make_sheet.py drives the same Session to build the finished pictures."""
import os, sys, time, base64, json, tempfile, shutil, io
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, '..', '..', '..', '..', '..', 'tests'))
import _cdp  # noqa: E402
from PIL import Image  # noqa: E402


class Session:
    def __init__(self, port, W, H):
        self.W, self.H = W, H
        self.profile = tempfile.mkdtemp(prefix='fm-482b4-')
        dport = _cdp.free_port()
        self.proc = _cdp.launch(dport, W, H, self.profile)
        self.cdp = None
        try:
            self.cdp = _cdp.CDP(_cdp.ws_url(dport))
            self.cdp.send('Emulation.setDeviceMetricsOverride', width=W, height=H, deviceScaleFactor=2, mobile=W < 768)
            if W < 768:
                self.cdp.send('Emulation.setTouchEmulationEnabled', enabled=True, maxTouchPoints=5)
            self.cdp.send('Page.enable')
            self.cdp.send('Page.navigate', url='http://localhost:%d/index.html' % port)
            for _ in range(160):
                try:
                    if self.cdp.eval("!!(window.FM && FM.scene && FM.inspector && FM.fxRegistry && FM.filters && document.readyState === 'complete')"):
                        break
                except Exception:
                    pass
                time.sleep(0.25)
            for _ in range(80):   # the splash must be gone, or it sits over everything
                if not self.cdp.eval("document.documentElement.classList.contains('splash-on')"):
                    break
                time.sleep(0.25)
            time.sleep(1.0)
            try:   # the Home screen sits over the editor on a fresh profile
                self.cdp.eval("(() => { if (FM.home && FM.home.isOpen && FM.home.isOpen() && FM.home.close) FM.home.close(); })()")
            except Exception:
                pass
            time.sleep(0.4)
        except Exception:
            self.close()
            raise

    def set(self, **vs):
        for k, v in vs.items():
            self.cdp.eval('window.%s = %s;' % (k, json.dumps(v)))

    def run(self, script):
        src = open(os.path.join(HERE, script)).read()
        return self.cdp.eval('(async () => { %s\n })()' % src, await_promise=True)

    def js(self, expr):
        return self.cdp.eval(expr, await_promise=True)

    def shot(self, clip=None):
        time.sleep(0.4)
        c = clip or {'x': 0, 'y': 0, 'width': self.W, 'height': self.H}
        d = self.cdp.send('Page.captureScreenshot', format='png', captureBeyondViewport=False,
                          clip={'x': c['x'], 'y': c['y'], 'width': c['width'], 'height': c['height'], 'scale': 1})['data']
        return Image.open(io.BytesIO(base64.b64decode(d))).convert('RGB')

    def close(self):
        if self.cdp:
            self.cdp.close()
        self.proc.terminate()
        try:
            self.proc.wait(timeout=5)
        except Exception:
            self.proc.kill()
        shutil.rmtree(self.profile, ignore_errors=True)


def shoot(port, W, H, scripts, out, arg=None, clip=None, vars=None):
    s = Session(port, W, H)
    try:
        s.set(__b4arg=arg)
        s.set(**(vars or {}))
        val = None
        for sc in scripts:
            val = s.run(sc)
        im = s.shot(clip or (val or {}).get('clip'))
        im.save(out, quality=90) if out.endswith('.jpg') else im.save(out)
        return val, im.size
    finally:
        s.close()


if __name__ == '__main__':
    port, W, H = int(sys.argv[1]), int(sys.argv[2]), int(sys.argv[3])
    scripts = sys.argv[4].split(',')
    out = sys.argv[5]
    arg = sys.argv[6] if len(sys.argv) > 6 else None
    vs = json.loads(sys.argv[7]) if len(sys.argv) > 7 else None
    val, size = shoot(port, W, H, scripts, out, arg, vars=vs)
    print(json.dumps(val)[:3000])
    print(out, size)
