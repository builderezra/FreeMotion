"""#482 polish batch 2 — screenshot the effect panel with each mover open, at his phone size (390x844 CSS px, 2x), so he
sees where the new rows sit. Usage: python3 tools/design/482/polish2/panel2.py PORT
Writes tools/design/482/polish2/panel-<effect>-390.jpg. The real app, the real inspector — nothing mocked."""
import os, sys, time, base64, json, tempfile, shutil, io
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, '..', '..', '..', '..', 'tests'))
import _cdp  # noqa: E402
from PIL import Image  # noqa: E402

PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 9051
W, H = 390, 1500   # a tall phone, so the bottom sheet shows the whole open effect in one picture
OPEN = r"""
(async (type) => {
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  FM.scene.layers.length = 0;
  const L = FM.makeLayer('shape', { name: 'Card', shape: 'rect', x: 540, y: 960, shapeW: 300, shapeH: 300, fill: '#3a7bd5' });
  L.start = 0; L.duration = 5;
  const inst = FM.fxRegistry.makeInstance(type); inst._expanded = true;
  L.effects = [inst]; FM.scene.layers.push(L);
  FM.selectLayer(L.id); FM.refreshAll(); FM.inspector.openCategory('effects'); FM.inspector.refresh();
  await sleep(400);
  const open = document.querySelector('#inspector-panel .fx-row.fx-open');
  if (open) open.scrollIntoView({ block: 'start' });
  await sleep(2900);   // the 'Tap an effect…' toast is up for 2.6 s
  const r = document.getElementById('inspector-panel').getBoundingClientRect();
  return { top: Math.max(0, Math.floor(r.top)), bottom: Math.ceil(Math.min(innerHeight, r.bottom)) };
})
"""
profile = tempfile.mkdtemp(prefix='fm-482p-')
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
            if cdp.eval("!!(window.FM && FM.scene && FM.inspector && FM.fxRegistry && document.readyState === 'complete')"):
                break
        except Exception:
            pass
        time.sleep(0.25)
    for _ in range(80):
        if not cdp.eval("document.documentElement.classList.contains('splash-on')"):
            break
        time.sleep(0.25)
    time.sleep(1.2)
    try:   # the Home screen sits over the editor on a fresh profile
        cdp.eval("(() => { if (FM.home && FM.home.isOpen && FM.home.isOpen() && FM.home.close) FM.home.close(); })()")
    except Exception:
        pass
    time.sleep(0.5)
    for fx in ['wiggle', 'shake', 'swing', 'pulse', 'orbit', 'drift']:
        box = cdp.eval('(%s)(%s)' % (OPEN, json.dumps(fx)), await_promise=True) or {}
        top, bot = int(box.get('top', 0)), int(box.get('bottom', H))
        d = cdp.send('Page.captureScreenshot', format='png', clip={'x': 0, 'y': top, 'width': W, 'height': max(40, bot - top), 'scale': 1})['data']
        im = Image.open(io.BytesIO(base64.b64decode(d))).convert('RGB')
        out = os.path.join(HERE, 'panel-%s-390.jpg' % fx)
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
