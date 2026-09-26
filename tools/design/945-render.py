"""queue 945 — render the options pictures: the REAL app at 390x844 (iPhone notch emulated), with the throwaway
prototype in 945-proto.js injected. One browser session per option; each animation frame is the swap FROZEN at a
progress p (Web Animations currentTime), so frames are exact rather than whatever a timer happened to catch.
Usage: python3 tools/design/945-render.py OUTDIR"""
import os, sys, time, base64, tempfile, shutil
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..', 'tests'))
import _cdp

OUT = sys.argv[1]
PROTO = open(os.path.join(os.path.dirname(__file__), '945-proto.js')).read()
W, H = 390, 844


def session(fn):
    profile = tempfile.mkdtemp(prefix='fm-945-')
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
        for _ in range(80):   # the splash must be gone, or it is in every picture
            if not cdp.eval("document.documentElement.classList.contains('splash-on')"):
                break
            time.sleep(0.25)
        time.sleep(1.0)
        cdp.eval("(function(){ try { if (FM.home && FM.home.isOpen && FM.home.isOpen()) FM.home.close(); } catch (e) {} })()")
        time.sleep(0.6)
        cdp.eval(PROTO)
        cdp.eval("document.getElementById('m-settings').click(); 1")
        time.sleep(0.9)
        fn(cdp)
    finally:
        if cdp:
            cdp.close()
        proc.terminate()
        try:
            proc.wait(timeout=5)
        except Exception:
            proc.kill()
        shutil.rmtree(profile, ignore_errors=True)


def snap(cdp, name):
    time.sleep(0.12)
    d = cdp.send('Page.captureScreenshot', format='png')['data']
    with open(os.path.join(OUT, name + '.png'), 'wb') as f:
        f.write(base64.b64decode(d))


def option(opt):
    def run(cdp):
        cdp.eval("P945.build('%s','canvas',false); 1" % opt); time.sleep(0.4); snap(cdp, opt + '-canvas')
        cdp.eval("P945.go('friends'); P945.freeze(0); 1")
        for i in range(0, 13):
            cdp.eval("P945.freeze(%f); 1" % (i / 12)); snap(cdp, '%s-f%02d' % (opt, i))
        cdp.eval("P945.freeze(1); 1"); time.sleep(0.2)
        cdp.eval("P945.settle(); 1")
        time.sleep(0.5); snap(cdp, opt + '-friends')
        cdp.eval("P945.go('canvas'); P945.freeze(0); 1")
        for i in range(0, 13):
            cdp.eval("P945.freeze(%f); 1" % (i / 12)); snap(cdp, '%s-b%02d' % (opt, i))
    return run


which = sys.argv[2] if len(sys.argv) > 2 else 'all'
if which in ('all', 'A'):
    session(option('A'))
if which in ('all', 'B'):
    session(option('B'))
if which in ('all', 'live'):
    def live(cdp):
        cdp.eval("P945.build('A','canvas',true); 1"); time.sleep(0.4); snap(cdp, 'live-canvas')
        cdp.eval("P945.build('A','friends',true); 1"); time.sleep(0.4); snap(cdp, 'live-friends')
    session(live)
