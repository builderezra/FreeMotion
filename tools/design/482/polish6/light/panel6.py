"""#482 polish batch 6 light (6.1 Vignette, 6.2 Light / Soft / Dark Glow) — the effect panel with the new rows, at a phone's 390
CSS px (2x) and a 1280 px PC window.
Usage: python3 tools/design/482/polish6/light/panel6.py [PORT]   -> tools/design/482/polish6/panel-<name>-<width>.jpg
Opens the real app, puts one layer on the canvas carrying the effect (expanded), opens the Effects tab and scrolls the named
row into view. Nothing is mocked. 'vignette-lower' is Mode Darken (Colour greyed out); 'vignette-colour-lower' Mode Colour;
'lightglow-source-lower' is Colour from Source colour (the Glow colour greyed out). Name shots to draw only those."""
import os, sys, time, base64, tempfile, shutil
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, '..', '..', '..', '..', '..', 'tests'))
import _cdp  # noqa: E402

PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 9051
SHOTS = [('lightglow', 'lightglow', 'Threshold', "p.knee = 40; p.passes = 2; p.outside = 1;"),
         ('vignette-lower', 'vignette', 'Centre Y', ""),
         ('vignette-colour-lower', 'vignette', 'Centre Y', "p.mode = 2; p.color = '#2a5bd7'; p.round = 0; p.hilite = 40;"),
         ('lightglow-source-lower', 'lightglow', 'Glow past the edges', "p.from = 1; p.blend = 2;"),
         ('lightglow-source-glow', 'lightglow', 'Colour from', "p.from = 1; p.blend = 2;"),
         ('darkglow-lower', 'darkglow', 'Smoothness', "p.blend = 1; p.outside = 1;")]
WANT = sys.argv[2:]
if WANT:
    SHOTS = [s for s in SHOTS if s[0] in WANT]
JS = r"""(async () => {
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  if (FM.home && FM.home.isOpen && FM.home.isOpen()) FM.home.close();
  FM.scene.layers.length = 0;
  const L = FM.makeLayer('shape', { name: 'Clip', shape: 'rect', x: 540, y: 960, shapeW: 900, shapeH: 1400, fill: '#c0704a' });
  L.start = 0; L.duration = 5;
  const inst = FM.fxRegistry.makeInstance('%(type)s'); inst._expanded = true; const p = inst.params; %(set)s
  L.effects = [inst]; FM.scene.layers.push(L);
  FM.selectLayer(L.id); FM.refreshAll(); FM.inspector.openCategory('effects'); FM.inspector.refresh();
  await sleep(500);
  const lab = [].slice.call(document.querySelectorAll('#inspector-panel .fx-row.fx-open .fx-scrub-label')).filter(e => (e.textContent || '').trim() === '%(row)s')[0];
  if (!lab) return 'no row';
  lab.scrollIntoView({ block: 'start' }); await sleep(3200);   // past the 2.6 s 'Tap an effect…' toast
  return 'ok';
})()"""

for width, height in [(390, 844), (1280, 800)]:
    for name, typ, row, setp in SHOTS:
        profile = tempfile.mkdtemp(prefix='fm-482p6lp-')
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
            r = cdp.eval(JS % {'type': typ, 'set': setp, 'row': row}, await_promise=True)
            time.sleep(0.4)
            d = cdp.send('Page.captureScreenshot', format='jpeg', quality=85)['data']
            out = os.path.abspath(os.path.join(HERE, '..', 'panel-%s-%d.jpg' % (name, width)))
            with open(out, 'wb') as f:
                f.write(base64.b64decode(d))
            print(out, r)
        finally:
            if cdp:
                cdp.close()
            proc.terminate()
            try:
                proc.wait(timeout=5)
            except Exception:
                proc.kill()
            shutil.rmtree(profile, ignore_errors=True)
