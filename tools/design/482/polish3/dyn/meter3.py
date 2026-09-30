"""#482 batch 3 review fix — the Compressor's "Turning down" bar now shows what is HEARD, so it follows Mix.
Screenshots through the real app at his phone size (390 CSS px wide, 2x): the open Compressor, heard through its own Hear
button on a song, with Mix typed into its own box at 1, 0.5 and 0 — each crop is the bar and the Mix row as the app drew
them. Writes tools/design/482/polish3/compressor-meter-mix.jpg.
Usage: python3 tools/design/482/polish3/dyn/meter3.py PORT   (PORT = a running tools/serve.sh serving this tree)"""
import os, sys, time, base64, json, tempfile, shutil, io
HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.abspath(os.path.join(HERE, '..'))
sys.path.insert(0, os.path.join(HERE, '..', '..', '..', '..', '..', 'tests'))
import _cdp  # noqa: E402
from PIL import Image  # noqa: E402

PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 9091
W, H = 390, 1500

OPEN = r"""
(async () => {
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  if (FM.home && FM.home.isOpen && FM.home.isOpen()) FM.home.close();
  FM.scene.layers.length = 0;
  const SR = 44100, secs = 8, oac = new OfflineAudioContext(2, SR * secs, SR), ab = oac.createBuffer(2, SR * secs, SR);
  for (let c = 0; c < 2; c++) { const d = ab.getChannelData(c); for (let i = 0; i < d.length; i++) { const t = i / SR; d[i] = 0.8 * Math.sin(2 * Math.PI * 220 * t); } }
  const rec = await FM.loadVideoFile(new File([FM.sfx.encodeWav(ab)], 'Song.wav', { type: 'audio/wav' }));
  const song = FM.makeLayer('video', { name: 'Song', x: 540, y: 960, start: 0, duration: secs });
  FM.media.set(song.id, rec); FM.scene.layers.push(song);
  const f = FM.audioFxRegistry.makeInstance('compressor'); f.params.threshold = -30; f._expanded = true;
  song.audioFx = [f];
  window.__mtr = { song: song, f: f };
  FM.selectLayer(song.id); FM.refreshAll(); await sleep(300);
  FM.inspector.openCategory('audiofx'); await sleep(500);
  const open = document.querySelector('#inspector-panel .fx-row.fx-open');
  if (open) open.scrollIntoView({ block: 'start' });
  await sleep(2900);   // the 'Tap an effect…' hint toast is up for 2.6 s
  const b = document.querySelector('#inspector-panel .fx-row.fx-open .fx-hear'); if (b) b.click();
  await sleep(1200);
  return !!(FM.audioFxLive && FM.audioFxLive.auditioning());
})
"""
SET_MIX = r"""
(async (v) => {
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const rows = [].slice.call(document.querySelectorAll('#inspector-panel .fx-row.fx-open .fx-scrub-row'));
  const mix = rows.filter(r => (r.querySelector('.fx-scrub-label') || {}).textContent === 'Mix')[0];
  const box = mix.querySelector('.fx-scrub-val');
  box.value = String(v); box.dispatchEvent(new Event('change', { bubbles: true }));
  await sleep(1500);
  const m = document.querySelector('#inspector-panel .fx-row.fx-open .afx-gr-row');
  const mix2 = [].slice.call(document.querySelectorAll('#inspector-panel .fx-row.fx-open .fx-scrub-row')).filter(r => (r.querySelector('.fx-scrub-label') || {}).textContent === 'Mix')[0];
  const a = m.getBoundingClientRect(), z = mix2.getBoundingClientRect(), p = document.getElementById('inspector-panel').getBoundingClientRect();
  const mt = FM.media.get(window.__mtr.song.id)._afxChain.meterOf(window.__mtr.f);
  return { bar: [Math.floor(a.top - 6), Math.ceil(a.bottom + 6)], mix: [Math.floor(z.top - 6), Math.ceil(z.bottom + 6)], left: Math.floor(p.left), right: Math.ceil(p.right),
    shown: m.dataset.db, text: m.querySelector('.afx-gr-val').textContent, node: mt.node.reduction, mixBox: mix2.querySelector('.fx-scrub-val').value,
    playing: FM.audioFxLive.auditioning() };
})
"""
SHEET = r"""
((items) => {
  document.querySelectorAll('#fm482m').forEach(n => n.remove());
  const ov = document.createElement('div'); ov.id = 'fm482m';
  ov.style.cssText = 'position:fixed;left:0;top:0;width:390px;z-index:2147483647;background:#0f1117;color:#e9ecf3;font:14px -apple-system,system-ui,sans-serif;padding:18px 16px 16px;box-sizing:border-box';
  let h = '<div style="font-weight:700;font-size:21px;letter-spacing:-.2px">Compressor · the Turning down bar</div>' +
    '<div style="color:#a8afbf;font-size:13px;line-height:1.4;margin:6px 0 12px">While you Hear the Compressor, the bar shows how much quieter it is making the sound. Mix blends the untouched sound back in — so the bar now shows what you actually hear, not only the squeezed half. The same song, the same settings (Threshold −30 dB), only Mix changes:</div>';
  items.forEach(it => {
    h += '<div style="font-weight:700;font-size:14.5px;margin:12px 0 4px;color:' + (it.isNew ? '#29d9bb' : '#e9ecf3') + '">' + it.head + '</div>' +
      '<div style="color:#8b96a8;font-size:12px;line-height:1.35;margin:0 0 6px">' + it.note + '</div>' +
      '<div style="border-radius:12px;overflow:hidden;' + (it.isNew ? 'box-shadow:0 0 0 2px #29d9bb;' : '') + '"><img src="' + it.src + '" style="display:block;width:358px;height:' + (358 * it.h / it.w).toFixed(1) + 'px"></div>';
  });
  h += '<div style="color:#8b96a8;font-size:12px;line-height:1.4;margin-top:14px">Screenshots of the real panel while the song plays through Hear: the bar at the top of the open Compressor, and its Mix slider at the bottom (the sliders between are cut out). The sound itself is unchanged — only what the bar says.</div>';
  ov.innerHTML = h;
  document.body.appendChild(ov);
  return new Promise(res => setTimeout(() => res(Math.floor(ov.getBoundingClientRect().bottom) - 1), 300));
})
"""

profile = tempfile.mkdtemp(prefix='fm-482m-')
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
    if not cdp.eval('(%s)()' % OPEN, await_promise=True):
        raise SystemExit('Hear did not start')
    items = []
    for v in (1, 0.5, 0):
        b = cdp.eval('(%s)(%s)' % (SET_MIX, json.dumps(v)), await_promise=True)
        print('mix', v, json.dumps(b))
        # The bar sits at the top of the open row and Mix at the bottom: crop each, and stack them with a thin rule between.
        parts = []
        for key in ('bar', 'mix'):
            y0, y1 = b[key]
            d = cdp.send('Page.captureScreenshot', format='png', clip={'x': b['left'], 'y': y0, 'width': b['right'] - b['left'], 'height': y1 - y0, 'scale': 1})['data']
            parts.append(Image.open(io.BytesIO(base64.b64decode(d))).convert('RGB'))
        gap = 6
        im = Image.new('RGB', (parts[0].size[0], parts[0].size[1] + gap + parts[1].size[1]), (40, 46, 58))
        im.paste(parts[0], (0, 0)); im.paste(parts[1], (0, parts[0].size[1] + gap))
        bio = io.BytesIO(); im.save(bio, format='PNG')
        shown = b['text'].replace('-', '−')
        node = '%.1f' % b['node']
        head = {1: 'Mix 1 — all squeezed', 0.5: 'Mix 0.5 — half squeezed, half untouched', 0: 'Mix 0 — all untouched'}[v]
        note = {1: 'The bar reads %s: all of what you hear is the squeezed sound.' % shown,
                0.5: 'The bar reads %s: half of what you hear is the untouched sound, so it is turned down less. (The squeezed half alone is at %s dB.)' % (shown, node.replace('-', '−')),
                0: 'The bar reads %s: you hear the sound untouched, so nothing is turned down. The first build still showed the squeezed half here (%s dB).' % (shown, node.replace('-', '−'))}[v]
        items.append({'head': head, 'note': note, 'src': 'data:image/png;base64,' + base64.b64encode(bio.getvalue()).decode(), 'w': im.size[0], 'h': im.size[1], 'isNew': v != 1})
    cdp.eval('(() => { try { FM.audioFxLive.stopAudition(); } catch (e) {} })()')
    bottom = cdp.eval('(%s)(%s)' % (SHEET, json.dumps(items)), await_promise=True)
    d = cdp.send('Page.captureScreenshot', format='png', clip={'x': 0, 'y': 0, 'width': W, 'height': int(bottom), 'scale': 1})['data']
    im = Image.open(io.BytesIO(base64.b64decode(d))).convert('RGB')
    out = os.path.join(OUT, 'compressor-meter-mix.jpg')
    im.save(out, quality=88)
    print(out, im.size, 'ratio %.2f' % (im.size[1] / im.size[0]))
finally:
    if cdp:
        cdp.close()
    proc.terminate()
    try:
        proc.wait(timeout=5)
    except Exception:
        proc.kill()
    shutil.rmtree(profile, ignore_errors=True)
