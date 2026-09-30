"""#482 polish batch 2 (rhythm) — screenshot the new controls in the REAL effect panel, at a phone (390 CSS px, 2x) and a PC
(1280 px). Usage: python3 tools/design/482/polish2/panel.py [PORT]      (PORT = a running tools/serve.sh; default 9111)
Writes tools/design/482/polish2/panel-<effect>-<control>-<width>.jpg."""
import os, sys, time, base64, json, tempfile, shutil
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, '..', '..', '..', '..', 'tests'))
import _cdp  # noqa: E402

PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 9111
# (file tag, effect, params to set, the row label to bring into view)
SHOTS = [('flashdark-rhythm', 'flashdark', {'rhythm': 1, 'hold': 0.4}, 'Rhythm'),
         ('framestutter-trailstrength', 'framestutter', {'mode': 2, 'trail': 0.8}, 'Trail strength'),
         ('objectblur-shutterphase', 'objectblur', {'phase': -100}, 'Shutter phase')]
JS = r"""
(async () => {
  const [type, set, label] = %s;
  FM.scene.layers.length = 0;
  const L = FM.makeLayer('shape', { name: 'Card', shape: 'rect', x: 540, y: 960, shapeW: 600, shapeH: 400, fill: '#3a7bd5' });
  L.start = 0; L.duration = 5;
  if (type === 'objectblur') L.transform.x = { kf: [{ t: 0, v: 200, ease: 'linear' }, { t: 5, v: 880, ease: 'linear' }] };   // a blur on a still card says it does nothing
  const e = FM.fxRegistry.makeInstance(type); e._expanded = true; Object.assign(e.params, set); L.effects = [e];
  FM.scene.layers.push(L);
  FM.selectLayer(L.id); FM.refreshAll(); FM.inspector.openCategory('effects'); FM.inspector.refresh();
  await new Promise(r => setTimeout(r, 400));
  const lab = [].slice.call(document.querySelectorAll('#inspector-panel .fx-row.fx-open .fx-scrub-label')).filter(x => x.textContent.trim() === label)[0];
  if (!lab) return { error: 'no ' + label + ' row' };
  const row = lab.closest('.fx-scrub-row, .fx-seg-row');
  row.scrollIntoView({ block: 'center' });
  await new Promise(r => setTimeout(r, 300));
  const p = document.getElementById('inspector-panel').getBoundingClientRect();
  return { panel: [p.left, p.top, p.width, p.height], row: row.getBoundingClientRect().top };
})()
"""
for W, H, mobile in [(390, 844, True), (1280, 800, False)]:
    profile = tempfile.mkdtemp(prefix='fm-482p-')
    dport = _cdp.free_port()
    proc = _cdp.launch(dport, W, H, profile)
    cdp = None
    try:
        cdp = _cdp.CDP(_cdp.ws_url(dport))
        cdp.send('Emulation.setDeviceMetricsOverride', width=W, height=H, deviceScaleFactor=2 if mobile else 1, mobile=mobile)
        cdp.send('Page.enable')
        cdp.send('Page.navigate', url='http://localhost:%d/index.html' % PORT)
        for _ in range(160):
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
        time.sleep(1.5)
        cdp.eval("try { localStorage.setItem('fm.fx.tapHint', '1'); } catch (e) {}")   # the one-time toast would sit over the rows
        cdp.eval("FM.home && FM.home.isOpen && FM.home.isOpen() && FM.home.close()")
        time.sleep(0.5)
        for tag, typ, sets, label in SHOTS:
            val = cdp.eval(JS % json.dumps([typ, sets, label]), await_promise=True)
            print(W, tag, json.dumps(val))
            if not val or val.get('error'):
                continue
            x, y, w, h = val['panel']
            clip = {'x': max(0, x), 'y': max(0, y), 'width': min(w, W - max(0, x)), 'height': min(h, H - max(0, y)), 'scale': 1}
            d = cdp.send('Page.captureScreenshot', format='jpeg', quality=88, clip=clip)['data']
            out = os.path.join(HERE, 'panel-%s-%d.jpg' % (tag, W))
            with open(out, 'wb') as f:
                f.write(base64.b64decode(d))
            print(out)
    finally:
        if cdp:
            cdp.close()
        proc.terminate()
        try:
            proc.wait(timeout=5)
        except Exception:
            proc.kill()
        shutil.rmtree(profile, ignore_errors=True)
