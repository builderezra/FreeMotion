"""#482 polish batch 3 (tone) — screenshot the new rows in the REAL Audio Effects panel at a phone (390 CSS px, 2x).
Usage: python3 tools/design/482/polish3/tone/panel.py [PORT] [TAG ...]      (PORT = a running tools/serve.sh; default 9061)
Writes tools/design/482/polish3/panel-<tag>-390.jpg (SUFFIX from the environment before .jpg, e.g. SUFFIX=-before against a
server of the older tree, for a before/after pair). The clip is a real 4 s song loaded through FM.loadVideoFile."""
import os, sys, time, base64, json, tempfile, shutil
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, '..', '..', '..', '..', '..', 'tests'))
import _cdp  # noqa: E402

PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 9061
ONLY = sys.argv[2:]
SUFFIX = os.environ.get('SUFFIX', '')
# (file tag, audio effect, params to set, the row to bring into view)
SHOTS = [('pitch', 'pitch', {'semitones': 5, 'cents': 30}, 'Mix'),
         ('basstreble', 'bassTreble', {'bass': 6, 'bassFreq': 80}, 'Treble at'),
         ('eq3', 'eq3', {'mid': 4, 'midWidth': 2.5}, 'High at')]
JS = r"""
(async () => {
  const [type, set, label] = %s;
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const sr = 48000, n = sr * 4, oac = new OfflineAudioContext(2, n, sr), b = oac.createBuffer(2, n, sr);
  for (let c = 0; c < 2; c++) { const d = b.getChannelData(c); for (let i = 0; i < n; i++) d[i] = 0.4 * Math.sin(2 * Math.PI * 220 * i / sr); }
  const rec = await FM.loadVideoFile(new File([FM.audioBufferToWav(b)], 'Song.wav', { type: 'audio/wav' }));
  FM.scene.layers.length = 0;
  const L = FM.makeLayer('video', { name: 'Song', x: 540, y: 960, start: 0, duration: 4 });
  FM.media.set(L.id, rec);
  const inst = FM.audioFxRegistry.makeInstance(type); inst._expanded = true; Object.assign(inst.params, set);
  L.audioFx = [inst];
  FM.scene.layers.push(L);
  FM.selectLayer(L.id); FM.refreshAll(); FM.inspector.openCategory('audiofx'); FM.inspector.refresh();
  await sleep(600);
  const lab = [].slice.call(document.querySelectorAll('#inspector-panel .fx-row.fx-open .fx-scrub-label')).filter(x => x.textContent.trim() === label)[0];
  if (!lab) return { error: 'no ' + label + ' row' };
  const hint = document.querySelector('#inspector-panel .fx-row.fx-open .afx-hint');
  (hint || lab.closest('.fx-scrub-row')).scrollIntoView({ block: 'end' });
  await sleep(300);
  const p = document.getElementById('inspector-panel').getBoundingClientRect();
  return { panel: [p.left, p.top, p.width, p.height], labels: [].slice.call(document.querySelectorAll('#inspector-panel .fx-row.fx-open .fx-scrub-label')).map(x => x.textContent.trim()) };
})()
"""
W, H = 390, 844
profile = tempfile.mkdtemp(prefix='fm-482tp-')
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
            if cdp.eval("!!(window.FM && FM.scene && FM.inspector && FM.loadVideoFile && document.readyState === 'complete')"):
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
        if ONLY and tag not in ONLY:
            continue
        val = cdp.eval(JS % json.dumps([typ, sets, label]), await_promise=True)
        print(W, tag, json.dumps(val))
        if not val or val.get('error'):
            continue
        x, y, w, h = val['panel']
        clip = {'x': max(0, x), 'y': max(0, y), 'width': min(w, W - max(0, x)), 'height': min(h, H - max(0, y)), 'scale': 1}
        d = cdp.send('Page.captureScreenshot', format='jpeg', quality=88, clip=clip)['data']
        out = os.path.join(HERE, '..', 'panel-%s-%d%s.jpg' % (tag, W, SUFFIX))
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
