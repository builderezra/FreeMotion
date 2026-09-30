"""#482 polish batch 3 (sound) — screenshot the audio-effect panel with Echo / Delay and Reverb open, so he sees where the
new rows sit. Usage: python3 tools/design/482/polish3/space/panel3.py PORT [WIDTH]
Writes tools/design/482/polish3/panel-echo-<W>.jpg and panel-reverb-<W>.jpg (W = 390 by default, his phone, 2x).
The real app and the real inspector, on a real audio clip (a generated wav, loaded the way a song is) — nothing mocked."""
import os, sys, time, base64, json, tempfile, shutil, io
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, '..', '..', '..', '..', '..', 'tests'))
import _cdp  # noqa: E402
from PIL import Image  # noqa: E402

PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 9051
W = int(sys.argv[2]) if len(sys.argv) > 2 else 390
H = 1500 if W < 700 else 900   # a tall phone, so the sheet shows the whole open effect in one picture
OPEN = r"""
(async (type) => {
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  if (FM.home && FM.home.isOpen && FM.home.isOpen()) FM.home.close();
  if (!window.__482cSong) {
    const sr = 48000, n = sr * 4, oac = new OfflineAudioContext(2, n, sr), b = oac.createBuffer(2, n, sr);
    for (let c = 0; c < 2; c++) { const d = b.getChannelData(c); for (let i = 0; i < n; i++) d[i] = 0.3 * Math.sin(2 * Math.PI * 220 * i / sr); }
    window.__482cSong = await FM.loadVideoFile(new File([FM.audioBufferToWav(b)], 'My song.wav', { type: 'audio/wav' }));
  }
  FM.scene.layers.length = 0;
  const L = FM.makeLayer('video', { name: 'My song', x: 540, y: 960, start: 0, duration: 4 });
  FM.media.set(L.id, window.__482cSong);
  const inst = FM.audioFxRegistry.makeInstance(type); inst._expanded = true;
  L.audioFx = [inst]; FM.scene.layers.push(L);
  FM.selectLayer(L.id); FM.refreshAll(); FM.inspector.openCategory('audiofx'); FM.inspector.refresh();
  await sleep(500);
  const open = document.querySelector('#inspector-panel .fx-row.fx-open');
  if (open) open.scrollIntoView({ block: 'start' });
  await sleep(2900);   // the 'Tap an effect…' toast is up for 2.6 s
  const r = document.getElementById('inspector-panel').getBoundingClientRect();
  const rows = [].slice.call(document.querySelectorAll('#inspector-panel .fx-row.fx-open .fx-scrub-label')).map(l => l.textContent.trim());
  return { top: Math.max(0, Math.floor(r.top)), bottom: Math.ceil(Math.min(innerHeight, r.bottom)), left: Math.floor(r.left), right: Math.ceil(r.right), rows: rows };
})
"""
profile = tempfile.mkdtemp(prefix='fm-482cp-')
dport = _cdp.free_port()
proc = _cdp.launch(dport, W, H, profile)
cdp = None
try:
    cdp = _cdp.CDP(_cdp.ws_url(dport))
    cdp.send('Emulation.setDeviceMetricsOverride', width=W, height=H, deviceScaleFactor=2, mobile=W < 700)
    cdp.send('Page.enable')
    cdp.send('Page.navigate', url='http://localhost:%d/index.html' % PORT)
    for _ in range(160):
        try:
            if cdp.eval("!!(window.FM && FM.scene && FM.inspector && FM.audioFxRegistry && document.readyState === 'complete')"):
                break
        except Exception:
            pass
        time.sleep(0.25)
    for _ in range(80):
        if not cdp.eval("document.documentElement.classList.contains('splash-on')"):
            break
        time.sleep(0.25)
    time.sleep(1.2)
    for fx, name in (('delay', 'echo'), ('reverb', 'reverb')):
        box = cdp.eval('(%s)(%s)' % (OPEN, json.dumps(fx)), await_promise=True) or {}
        print(fx, box.get('rows'))
        top, bot = int(box.get('top', 0)), int(box.get('bottom', H))
        bot = min(bot, top + int(2.95 * (W if W < 700 else 390)))   # under 3x as tall as wide, or it does not reach his phone whole
        x0, x1 = (0, W) if W < 700 else (max(0, int(box.get('left', 0))), min(W, int(box.get('right', W))))
        d = cdp.send('Page.captureScreenshot', format='png', clip={'x': x0, 'y': top, 'width': x1 - x0, 'height': max(40, bot - top), 'scale': 1})['data']
        im = Image.open(io.BytesIO(base64.b64decode(d))).convert('RGB')
        out = os.path.normpath(os.path.join(HERE, '..', 'panel-%s-%d.jpg' % (name, W)))
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
