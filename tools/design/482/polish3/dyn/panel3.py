"""#482 polish batch 3 (dynamics) — screenshots through the real app at his phone size (390 CSS px wide, 2x):
  panel-compressor-390.jpg / panel-compressor-before-390.jpg   the open Compressor, heard (Hear on), new build / base build
  panel-limiter-390.jpg    / panel-limiter-before-390.jpg      the open Limiter
  sfx-stop.jpg                                                  a playing sound-effect row, base (Today) above new (New)
Usage: python3 tools/design/482/polish3/dyn/panel3.py PORT BASE_PORT
PORT serves this tree, BASE_PORT the release before (v17.19). Nothing is mocked: the song is a WAV made in the page and
added like any clip, the Compressor is heard through its own Hear button, the sound row is played with its own button."""
import os, sys, time, base64, json, tempfile, shutil, io
HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.abspath(os.path.join(HERE, '..'))
sys.path.insert(0, os.path.join(HERE, '..', '..', '..', '..', '..', 'tests'))
import _cdp  # noqa: E402
from PIL import Image  # noqa: E402

PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 9071
BASE = int(sys.argv[2]) if len(sys.argv) > 2 else 9171
W, H = 390, 1500

OPEN_AFX = r"""
(async (type, params, hear) => {
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  if (FM.home && FM.home.isOpen && FM.home.isOpen()) FM.home.close();
  FM.scene.layers.length = 0;
  const SR = 44100, secs = 8, oac = new OfflineAudioContext(2, SR * secs, SR), ab = oac.createBuffer(2, SR * secs, SR);
  for (let c = 0; c < 2; c++) { const d = ab.getChannelData(c); for (let i = 0; i < d.length; i++) { const t = i / SR; d[i] = (0.55 + 0.35 * Math.sin(2 * Math.PI * 1.3 * t)) * Math.sin(2 * Math.PI * 220 * t); } }
  const rec = await FM.loadVideoFile(new File([FM.sfx.encodeWav(ab)], 'Song.wav', { type: 'audio/wav' }));
  const song = FM.makeLayer('video', { name: 'Song', x: 540, y: 960, start: 0, duration: secs });
  FM.media.set(song.id, rec); FM.scene.layers.push(song);
  const f = FM.audioFxRegistry.makeInstance(type); Object.assign(f.params, params || {}); f._expanded = true;
  song.audioFx = [f];
  FM.selectLayer(song.id); FM.refreshAll(); await sleep(300);
  FM.inspector.openCategory('audiofx'); await sleep(500);
  const open = document.querySelector('#inspector-panel .fx-row.fx-open');
  if (open) open.scrollIntoView({ block: 'start' });
  await sleep(2900);   // the 'Tap an effect…' hint toast is up for 2.6 s
  if (hear) { const b = document.querySelector('#inspector-panel .fx-row.fx-open .fx-hear'); if (b) b.click(); await sleep(1200); }
  const open2 = document.querySelector('#inspector-panel .fx-row.fx-open');   // Hear re-renders the panel: measure the row on screen now
  const r = document.getElementById('inspector-panel').getBoundingClientRect(), o = open2 ? open2.getBoundingClientRect() : r;
  const m = document.querySelector('#inspector-panel .afx-gr-row');
  return { top: Math.max(0, Math.floor(Math.max(r.top, o.top - 70))), bottom: Math.ceil(Math.min(innerHeight, r.bottom, o.bottom + 90)), meter: m ? (m.dataset.db || 'idle') : null };
})
"""
PLAY_SFX = r"""
(async () => {
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  if (FM.home && FM.home.isOpen && FM.home.isOpen()) FM.home.close();
  try { localStorage.removeItem('fm.sfx.fav'); } catch (e) {}
  FM.sfx.open(); await sleep(500);
  const rows = [].slice.call(document.querySelectorAll('.sfx-row')).filter(r => parseFloat(r.querySelector('.sfx-dur').textContent) >= 1.5);
  const pick = rows[1];
  pick.scrollIntoView({ block: 'center' }); await sleep(200);
  pick.querySelector('.sfx-play').click(); await sleep(250);
  const a = pick.previousElementSibling || pick, b = pick.nextElementSibling || pick;
  const top = a.getBoundingClientRect().top - 6, bottom = b.getBoundingClientRect().bottom + 6;
  const card = document.querySelector('.sfx-card').getBoundingClientRect();
  return { top: Math.floor(top), bottom: Math.ceil(bottom), left: Math.floor(card.left), right: Math.ceil(card.right), playing: pick.classList.contains('playing') };
})
"""
SHEET = r"""
((today, fresh, w1, h1, w2, h2) => {
  document.querySelectorAll('#fm482s').forEach(n => n.remove());
  const ov = document.createElement('div'); ov.id = 'fm482s';
  ov.style.cssText = 'position:fixed;left:0;top:0;width:390px;z-index:2147483647;background:#0f1117;color:#e9ecf3;font:14px -apple-system,system-ui,sans-serif;padding:18px 16px 16px;box-sizing:border-box';
  const img = (src, w, h, isNew) => '<div style="border-radius:12px;overflow:hidden;' + (isNew ? 'box-shadow:0 0 0 2px #29d9bb;' : '') + '"><img src="' + src + '" style="display:block;width:358px;height:' + (358 * h / w).toFixed(1) + 'px"></div>';
  ov.innerHTML = '<div style="font-weight:700;font-size:21px;letter-spacing:-.2px">Sound effects · Stop</div>' +
    '<div style="color:#a8afbf;font-size:13px;line-height:1.4;margin:6px 0 12px">Add ▸ Audio ▸ Sound effects, with a sound playing. A tap on the playing row already stops it — now its button shows that.</div>' +
    '<div style="font-weight:700;font-size:14.5px;margin:12px 0 6px">Today — the playing row still shows ▶</div>' + img(today, w1, h1, false) +
    '<div style="font-weight:700;font-size:14.5px;margin:14px 0 6px;color:#29d9bb">New — it shows ■ while it plays</div>' + img(fresh, w2, h2, true) +
    '<div style="color:#8b96a8;font-size:12px;line-height:1.4;margin-top:14px">Back to ▶ the moment it ends, is stopped, or another sound starts — on every copy of a starred sound too. Screenshots of the real sheet.</div>';
  document.body.appendChild(ov);
  return new Promise(res => setTimeout(() => res(Math.floor(ov.getBoundingClientRect().bottom) - 1), 300));
})
"""


def session(port):
    profile = tempfile.mkdtemp(prefix='fm-482c-p-')
    dport = _cdp.free_port()
    proc = _cdp.launch(dport, W, H, profile)
    cdp = _cdp.CDP(_cdp.ws_url(dport))
    cdp.send('Emulation.setDeviceMetricsOverride', width=W, height=H, deviceScaleFactor=2, mobile=True)
    cdp.send('Page.enable')
    cdp.send('Page.navigate', url='http://localhost:%d/index.html' % port)
    for _ in range(160):
        try:
            if cdp.eval("!!(window.FM && FM.scene && FM.inspector && FM.audioFxRegistry && FM.sfx && document.readyState === 'complete')"):
                break
        except Exception:
            pass
        time.sleep(0.25)
    for _ in range(80):
        if not cdp.eval("document.documentElement.classList.contains('splash-on')"):
            break
        time.sleep(0.25)
    time.sleep(1.2)
    return proc, cdp, profile


def close(s):
    proc, cdp, profile = s
    try:
        cdp.close()
    except Exception:
        pass
    proc.terminate()
    try:
        proc.wait(timeout=5)
    except Exception:
        proc.kill()
    shutil.rmtree(profile, ignore_errors=True)


def shot(cdp, x, y, w, h):
    d = cdp.send('Page.captureScreenshot', format='png', clip={'x': x, 'y': y, 'width': w, 'height': h, 'scale': 1})['data']
    return Image.open(io.BytesIO(base64.b64decode(d))).convert('RGB')


crops = {}
for tag, port in (('before', BASE), ('new', PORT)):
    s = session(port)
    try:
        cdp = s[1]
        for fx, params in (('compressor', {'threshold': -30}), ('limiter', {})):
            box2 = cdp.eval('(%s)(%s, %s, %s)' % (OPEN_AFX, json.dumps(fx), json.dumps(params), 'true' if fx == 'compressor' else 'false'), await_promise=True) or {}
            top, bot = int(box2.get('top', 0)), int(box2.get('bottom', H))
            im = shot(cdp, 0, top, W, max(40, bot - top))
            name = 'panel-%s%s-390.jpg' % (fx, '' if tag == 'new' else '-before')
            im.save(os.path.join(OUT, name), quality=88)
            print(os.path.join(OUT, name), im.size, 'meter', box2.get('meter'), 'ratio %.2f' % (im.size[1] / im.size[0]))
            cdp.eval('(() => { try { FM.audioFxLive.stopAudition(); } catch (e) {} })()')
        cdp.eval('(() => { try { FM.inspector.refresh(); } catch (e) {} })()')
        sb = cdp.eval('(%s)()' % PLAY_SFX, await_promise=True) or {}
        crops[tag] = shot(cdp, sb['left'], sb['top'], sb['right'] - sb['left'], sb['bottom'] - sb['top'])
        print(tag, 'sfx row playing:', sb.get('playing'), crops[tag].size)
        cdp.eval('(() => { try { FM.sfx.stopPreview(); FM.sfx.close(); } catch (e) {} })()')
        if tag == 'new':
            def durl(im):
                b = io.BytesIO(); im.save(b, format='PNG'); return 'data:image/png;base64,' + base64.b64encode(b.getvalue()).decode()
            a, n = crops['before'], crops['new']
            bottom = cdp.eval('(%s)(%s, %s, %d, %d, %d, %d)' % (SHEET, json.dumps(durl(a)), json.dumps(durl(n)), a.size[0], a.size[1], n.size[0], n.size[1]), await_promise=True)
            im = shot(cdp, 0, 0, W, int(bottom))
            im.save(os.path.join(OUT, 'sfx-stop.jpg'), quality=88)
            print(os.path.join(OUT, 'sfx-stop.jpg'), im.size, 'ratio %.2f' % (im.size[1] / im.size[0]))
    finally:
        close(s)
