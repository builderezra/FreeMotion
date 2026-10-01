"""#482 polish batch 5 — the Highlights & Shadows panel with its new rows, at a phone's 390 CSS px (2x) and a 1280 px PC
window. Usage: python3 tools/design/482/polish5/adjust/panel5.py [PORT]
  → tools/design/482/polish5/panel-highlightsshadows-<width>.jpg
Opens the real app, puts one layer on the canvas carrying the effect (expanded, Local radius 40 so its note reads against
a value), opens the Effects tab and scrolls Tonal width (phone) / Local radius (PC) to the top, so the rows below it and
Local radius's note are on screen. Nothing is mocked."""
import os, sys, time, base64, tempfile, shutil
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, '..', '..', '..', '..', '..', 'tests'))
import _cdp  # noqa: E402

PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 9111
JS = r"""(async () => {
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  if (FM.home && FM.home.isOpen && FM.home.isOpen()) FM.home.close();
  FM.scene.layers.length = 0;
  const L = FM.makeLayer('shape', { name: 'Car', shape: 'rect', x: 540, y: 960, shapeW: 900, shapeH: 1400, fill: '#3a7bd5' });
  L.start = 0; L.duration = 5;
  const inst = FM.fxRegistry.makeInstance('highlightsshadows'); inst._expanded = true; inst.params.radius = 40;
  L.effects = [inst]; FM.scene.layers.push(L);
  FM.selectLayer(L.id); FM.refreshAll(); FM.inspector.openCategory('effects'); FM.inspector.refresh();
  await sleep(500);
  const lab = [].slice.call(document.querySelectorAll('#inspector-panel .fx-row.fx-open .fx-scrub-label')).filter(e => (e.textContent || '').trim() === '%(row)s')[0];
  if (!lab) return 'no row';
  lab.scrollIntoView({ block: 'start' }); await sleep(3200);   // past the 2.6 s 'Tap an effect…' toast
  return 'ok';
})()"""

for width, height in [(390, 844), (1280, 800)]:
    profile = tempfile.mkdtemp(prefix='fm-482p5p-')
    dport = _cdp.free_port()
    proc = _cdp.launch(dport, width, height, profile)
    cdp = None
    try:
        cdp = _cdp.CDP(_cdp.ws_url(dport))
        cdp.send('Emulation.setDeviceMetricsOverride', width=width, height=height, deviceScaleFactor=2 if width < 700 else 1, mobile=width < 700)
        cdp.send('Page.enable')
        cdp.send('Page.navigate', url='http://localhost:%d/index.html' % PORT)
        for _ in range(200):
            try:
                if cdp.eval("!!(window.FM && FM.scene && FM.inspector && document.readyState === 'complete')"):
                    break
            except Exception:
                pass
            time.sleep(0.25)
        for _ in range(80):
            if not cdp.eval("document.documentElement.classList.contains('splash-on')"):
                break
            time.sleep(0.25)
        time.sleep(1.0)
        r = cdp.eval(JS % {'row': 'Tonal width' if width < 700 else 'Local radius'}, await_promise=True)
        time.sleep(0.4)
        d = cdp.send('Page.captureScreenshot', format='jpeg', quality=85)['data']
        out = os.path.normpath(os.path.join(HERE, '..', 'panel-highlightsshadows-%d.jpg' % width))
        with open(out, 'wb') as f:
            f.write(base64.b64decode(d))
        print(out, r)
        errs = cdp.eval("(window.__fmErrors || []).length") if cdp else None
        print('page errors:', errs)
    finally:
        if cdp:
            cdp.close()
        proc.terminate()
        try:
            proc.wait(timeout=5)
        except Exception:
            proc.kill()
        shutil.rmtree(profile, ignore_errors=True)
