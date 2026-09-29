"""queue 985 — THROWAWAY. Shoot today's Export card and concepts A/B/C (985-proto.js) in the REAL app.
Usage: python3 tools/design/985/985-render.py phone|pc [PORT] [only-state-substring]
Phone = 390x844 touch (hover:none, notch 47), PC = 1280x800. Both at 2x so the sheet stays crisp.
Writes tools/design/985/shots/<vp>-<state>.png and prints each state's measurements (card box, scroll, clipped text)."""
import os, sys, time, base64, tempfile, shutil, json
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, '..', '..', '..', 'tests'))
import _cdp

VP = sys.argv[1]
PORT = int(sys.argv[2]) if len(sys.argv) > 2 else 8911
ONLY = sys.argv[3] if len(sys.argv) > 3 else ''
W, H = (390, 844) if VP == 'phone' else (1280, 800)
PHONE = VP == 'phone'
PROTO = open(os.path.join(HERE, '985-proto.js')).read()
OUT = os.path.join(HERE, 'shots')
os.makedirs(OUT, exist_ok=True)

STATES = [
    ('now', "P985.now()"),
    ('now-custom', "P985.now('custom')"),
    ('A', "P985.A()"),
    ('A-size', "P985.A('size')"),
    ('A-more', "P985.A('more')"),
    ('A-gif', "P985.A('gif')"),
    ('A-sound', "P985.A('sound')"),
    ('B', "P985.B()"),
    ('B-fine', "P985.B('fine')"),
    ('C', "P985.C()"),
    ('C-exact', "P985.C('exact')"),
    ('C-more', "P985.C('more')"),
]

MJ = os.path.join(OUT, 'measure-%s.json' % VP)
MEAS = json.load(open(MJ)) if os.path.exists(MJ) else {}   # the card box per state — the sheet crops PC shots to it

profile = tempfile.mkdtemp(prefix='fm-985-')
dport = _cdp.free_port()
proc = _cdp.launch(dport, W, H, profile)
cdp = None
try:
    cdp = _cdp.CDP(_cdp.ws_url(dport))
    cdp.send('Emulation.setDeviceMetricsOverride', width=W, height=H, deviceScaleFactor=2, mobile=PHONE)
    if PHONE:
        cdp.send('Emulation.setSafeAreaInsetsOverride', insets={'top': 47, 'bottom': 0, 'left': 0, 'right': 0})
    cdp.send('Page.enable')
    cdp.send('Page.addScriptToEvaluateOnNewDocument', source="try { localStorage.setItem('fm.test.seedProject', '1'); } catch (e) {}")
    cdp.send('Page.navigate', url='http://localhost:%d/index.html' % PORT)
    for _ in range(160):
        try:
            if cdp.eval("!!(window.FM && FM.scene && document.readyState === 'complete')"):
                break
        except Exception:
            pass
        time.sleep(0.25)
    if PHONE:
        cdp.send('Emulation.setTouchEmulationEnabled', enabled=True, maxTouchPoints=5)
        cdp.send('Emulation.setEmulatedMedia', features=[{'name': 'hover', 'value': 'none'}, {'name': 'any-hover', 'value': 'none'},
                                                         {'name': 'pointer', 'value': 'coarse'}, {'name': 'any-pointer', 'value': 'coarse'}])
        assert cdp.eval("matchMedia('(hover: none)').matches"), 'not a phone'
    for _ in range(80):
        if not cdp.eval("document.documentElement.classList.contains('splash-on')"):
            break
        time.sleep(0.25)
    time.sleep(1.6)
    cdp.eval("(function(){ try { if (FM.home && FM.home.isOpen && FM.home.isOpen()) FM.home.close(); } catch (e) {} })(); 1")
    time.sleep(1.2)
    cdp.eval(PROTO)
    print(json.dumps({'setup': cdp.eval("JSON.stringify(P985.setup())")}))
    time.sleep(1.0)
    cdp.eval("P985.open()", await_promise=True)
    time.sleep(1.2)
    for name, js in STATES:
        if ONLY and ONLY not in name:
            continue
        # a fresh open for every state, so each starts from the card's own first-open layout
        cdp.eval("(function(){ P985.clear(); var c=document.getElementById('exp-cancel'); if (c) c.click(); })(); 1")
        time.sleep(0.5)
        cdp.eval("P985.open()", await_promise=True)
        time.sleep(0.9)
        r = cdp.eval(js)
        time.sleep(0.9)   # the popFrom re-place (ResizeObserver) and any fonts
        cdp.eval("P985.settle()")
        time.sleep(0.3)
        m = cdp.eval("JSON.stringify(P985.measure())")
        path = os.path.join(OUT, '%s-%s.png' % (VP, name))
        d = cdp.send('Page.captureScreenshot', format='png')['data']
        with open(path, 'wb') as f:
            f.write(base64.b64decode(d))
        print(name, r, m)
        MEAS[name] = json.loads(m)
        json.dump(MEAS, open(MJ, 'w'), indent=1)
finally:
    if cdp:
        cdp.close()
    proc.terminate()
    try:
        proc.wait(timeout=5)
    except Exception:
        proc.kill()
    shutil.rmtree(profile, ignore_errors=True)
