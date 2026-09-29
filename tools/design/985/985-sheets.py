"""queue 985 — THROWAWAY. Compose the options sheets from shots/ (985-render.py) into JPEGs.
Usage: python3 tools/design/985/985-sheets.py [PORT]   (needs tools/serve.sh on PORT serving the repo root)
Writes 985-compare.jpg, 985-A.jpg, 985-B.jpg, 985-C.jpg (+ their .html) next to this file."""
import os, sys, time, base64, tempfile, shutil, html
from PIL import Image
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, '..', '..', '..', 'tests'))
import _cdp

PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8911
SH = os.path.join(HERE, 'shots')

# PC shots are 2560x1600 (1280x800 at 2x). Crop each to its own card (from measure-pc.json, written by 985-render.py):
# 40 px of app to the left, and down to just under the Export button the card pops out of. The crops keep the app's
# scale, so text is the same size in every PC picture.
import json
MEAS = json.load(open(os.path.join(SH, 'measure-pc.json')))
PCW = {}
for name, m in MEAS.items():
    x, y, w, h = m['card']
    box = (max(0, x - 40), max(0, y - 30), 1280, min(800, y + h + 78))
    im = Image.open(os.path.join(SH, 'pc-%s.png' % name))
    im.crop(tuple(v * 2 for v in box)).save(os.path.join(SH, 'pc-%s-crop.png' % name))
    PCW[name] = box[2] - box[0]          # CSS width of the crop

E = html.escape
CSS = """
:root { --bg:#0b0f18; --panel:#131a26; --line:#263043; --text:#eef2f8; --dim:#9aa6b8; --faint:#66728a; --accent:#29d9bb; --warn:#f2a93b; }
* { box-sizing: border-box; margin: 0; }
body { background: var(--bg); color: var(--text); font: 15px/1.45 -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif; padding: 34px 36px 40px; width: max-content; }
h1 { max-width: 1400px; font-size: 30px; font-weight: 800; letter-spacing: -.4px; }
.sub { color: var(--dim); font-size: 16px; margin-top: 6px; max-width: 1180px; }
.quote { color: var(--text); font-style: italic; }
.row { display: flex; gap: 26px; margin-top: 28px; align-items: flex-start; }
.fig { flex: none; }
.fig .lab { font-size: 13px; font-weight: 700; letter-spacing: .5px; text-transform: uppercase; color: var(--faint); margin: 0 2px 8px; }
.fig img { display: block; border-radius: 26px; border: 1px solid var(--line); }
.fig.pc img { border-radius: 12px; }
.fig .cap { font-size: 14px; color: var(--dim); margin: 10px 2px 0; line-height: 1.4; }
.fig .cap b { color: var(--text); font-weight: 650; }
.colhead { display: flex; align-items: center; gap: 10px; margin: 0 2px 10px; min-height: 30px; }
.colhead .t { font-size: 19px; font-weight: 800; }
.rec { display: inline-flex; align-items: center; height: 26px; padding: 0 11px; border-radius: 13px; background: var(--accent); color: #062a23; font-size: 13px; font-weight: 800; letter-spacing: .2px; }
.now { display: inline-flex; align-items: center; height: 26px; padding: 0 11px; border-radius: 13px; background: #2a3344; color: var(--dim); font-size: 13px; font-weight: 800; }
.notes { flex: 1 1 0; min-width: 360px; max-width: 460px; background: var(--panel); border: 1px solid var(--line); border-radius: 16px; padding: 20px 22px; }
.notes h3 { font-size: 13px; letter-spacing: .6px; text-transform: uppercase; color: var(--faint); margin: 14px 0 6px; }
.notes h3:first-child { margin-top: 0; }
.notes p, .notes li { font-size: 15px; color: var(--dim); }
.notes ul { padding-left: 18px; }
.notes b { color: var(--text); }
.foot { max-width: 1200px; margin-top: 26px; color: var(--faint); font-size: 13px; }
"""

def page(title, body):
    return '<!doctype html><html><head><meta charset="utf-8"><title>%s</title><style>%s</style></head><body>%s</body></html>' % (E(title), CSS, body)

def fig(src, lab, cap, w, pc=False, head=None):
    hd = ''
    if head:
        hd = '<div class="colhead"><span class="t">%s</span>%s</div>' % (head[0], head[1] or '')
    return ('<div class="fig%s" style="width:%dpx">%s<div class="lab">%s</div><img src="shots/%s" style="width:%dpx"><div class="cap"><b>What you see first:</b> %s</div></div>'
            % (' pc' if pc else '', w, hd, E(lab), src, w, cap))

REC = '<span class="rec">★ Recommended</span>'
NOWB = '<span class="now">Today</span>'
QUOTE = ('<span class="quote">“the export menus settings are honestly a bit daunting for someone who doesnt know how it works. '
         'I dont want to lose any function but i want it to actually make sense at first glance. Capcut does a really good job of this but dont fully copy”</span> — Ezra, 29 Sep (#985)')

sheets = {}

def pw(name, k=0.8):
    return int(round(PCW[name] * k))

FOOT = ('<div class="foot">tools/design/985 · throwaway prototypes (985-proto.js) drawn inside the real app’s export card with its own colours and controls; '
        'no app code changed. Where every one of today’s settings lives in A, B and C: mapping.md.</div>')

# ---- 1. comparison: NOW | A | B | C at phone size, first glance
W = 360
sheets['compare'] = page('985 — export card, compared', (
    '<h1>Export card — today vs three redesigns (phone, first glance)</h1>'
    '<div class="sub">' + QUOTE + '</div>'
    '<div class="sub">All four are drawn inside the real app on a 390×844 phone, same project: “Beach trip”, 24 s, 1080×1920, 30 fps. '
    'Every file size is worked out the way the exporter does it. Nothing is removed in A, B or C.</div>'
    '<div class="row">'
    + fig('phone-now.png', 'Phone 390×844', 'six equal dropdowns. No length, size or picture until it has rendered.', W, head=('Now', NOWB))
    + fig('phone-A.png', 'Phone 390×844', 'a picture, “Video · 0:24 · about 34 MB”, 5 buttons, 4 plain rows, one Export.', W, head=('A · What you’ll get', REC))
    + fig('phone-B.png', 'Phone 390×844', 'six goal tiles, each saying what you’ll get; then Part and Fine-tune.', W, head=('B · Pick a goal', ''))
    + fig('phone-C.png', 'Phone 390×844', 'the file size in big type, and three sliders with ★ on the recommended stop.', W, head=('C · Sliders + size', ''))
    + '</div>' + FOOT))

# ---- 2. today, as the reference
sheets['now'] = page('985 — today', (
    '<h1>Now · today’s Export card (the reference)</h1>'
    '<div class="sub">The same project, phone and PC. Every control is a dropdown of equal weight, and two more rows appear when “Custom” is picked.</div>'
    '<div class="row">'
    + fig('phone-now.png', 'Phone · as it opens', 'six dropdowns of equal weight, then Cancel / Export MP4.', 340, head=('Now', NOWB))
    + fig('phone-now-custom.png', 'Phone · Custom size + Custom fps picked', 'two more rows (W×H and fps boxes) slot in between.', 340, head=('&nbsp;', ''))
    + '<div class="notes"><h3>What makes it daunting</h3><ul>'
      '<li><b>Six questions first</b>, all the same size, before anything says what you will get.</li>'
      '<li><b>Jargon:</b> fps, ZIP, WAV / M4A, “Resolution”, and “Loop region (if set)”, which the buttons that set it call <i>export marks</i>.</li>'
      '<li><b>No length, no file size, no picture</b> until the render has finished.</li>'
      '<li>“Export just this layer” sits among the everyday rows, so a one-layer export is easy to miss.</li></ul></div>'
    + '</div><div class="row">'
    + fig('pc-now-crop.png', 'PC 1280×800 · as it opens', 'the same six dropdowns, popping out of Export.', pw('now', 1.0), pc=True)
    + fig('pc-now-custom-crop.png', 'PC · Custom size + Custom fps picked', 'eight rows.', pw('now-custom', 1.0), pc=True)
    + '</div>' + FOOT))

# ---- 3. A
PW = 300
sheets['A'] = page('985 — A', (
    '<h1>A · “What you’ll get” card + Adjust rows &nbsp;' + REC + '</h1>'
    '<div class="sub">It opens on the answer: a picture, a plain one-line summary and the file size. Five buttons pick what to make. Four rows read like sentences '
    '(Size, Smoothness, Quality, Part) and open in place, with Recommended on the default. Everything expert sits in <b>More options</b>, which says <b>“1 on”</b> when anything in it is changed. '
    'Opening it and pressing Export still takes no decisions.</div>'
    '<div class="row">'
    + fig('phone-A.png', 'Phone · first glance', 'the summary, 5 buttons, 4 rows, More options, one Export.', PW)
    + fig('phone-A-size.png', 'Phone · Size opened', 'every size with its own MB; Recommended on the default; “Exact size…” last.', PW)
    + fig('phone-A-more.png', 'Phone · More options opened', 'one layer picked, so it turns amber and More options says “1 on”.', PW)
    + fig('phone-A-gif.png', 'Phone · GIF picked', 'the GIF limit said up front; See-through appears, Quality goes.', PW)
    + fig('phone-A-sound.png', 'Phone · Sound picked', 'no picture rows: just Sound file (WAV / M4A) and Part.', PW)
    + '</div><div class="row">'
    + fig('pc-A-crop.png', 'PC 1280×800 · first glance', 'the picture on the left, the choices on the right, all above Export.', pw('A'), pc=True)
    + fig('pc-A-size-crop.png', 'PC · Size opened', 'the same list, opened in place; the picture and summary stay put.', pw('A-size'), pc=True)
    + fig('pc-A-more-crop.png', 'PC · More options opened', 'amber “Only the ‘Title’ layer” under the summary: never silent.', pw('A-more'), pc=True)
    + '</div>' + FOOT))

# ---- 4. B
sheets['B'] = page('985 — B', (
    '<h1>B · Pick a goal (tiles) + Fine-tune</h1>'
    '<div class="sub">It opens on “What are you making?” with six tiles, each showing its result underneath. Part is always visible. '
    'Fine-tune holds every exact control, and changing one turns the picked tile into “Custom”. While Fine-tune is open the tiles fold into one line.</div>'
    '<div class="row">'
    + fig('phone-B.png', 'Phone · first glance', 'six tiles; “Fits Reels &amp; TikTok” only because this project is 9:16.', 340)
    + fig('phone-B-fine.png', 'Phone · Fine-tune opened', '60 fps picked, so the goal says Custom and Fine-tune “1 changed”.', 340)
    + '<div class="notes"><h3>Good</h3><ul><li>CapCut’s idea of choosing a goal, without its look.</li><li>Every tile says what you will get before you pick it.</li></ul>'
    '<h3>Weaker than A</h3><ul><li>A tile hides what it changes (“Smaller to send” is one size down plus Medium quality).</li><li>Six tiles plus Fine-tune means more combinations to explain and to test.</li>'
    '<li>Tiles named after apps would be a trap: FreeMotion never crops, so a “TikTok” tile on a wide project would add black bars.</li><li>On a phone it is the tallest first screen of the three.</li></ul></div>'
    + '</div><div class="row">'
    + fig('pc-B-crop.png', 'PC 1280×800 · first glance', 'tiles three across; Part and Fine-tune side by side.', pw('B'), pc=True)
    + fig('pc-B-fine-crop.png', 'PC · Fine-tune opened', 'every exact control, in today’s order, in plain words.', pw('B-fine'), pc=True)
    + '</div>' + FOOT))

# ---- 5. C
sheets['C'] = page('985 — C', (
    '<h1>C · Plain-language sliders + a live file size</h1>'
    '<div class="sub">A Video / GIF / Picture / Sound / Frames switch, the file size in big type, and three stepped sliders (Sharpness, Smoothness, Quality ↔ file size), '
    'each with a ★ on its recommended stop. The switch and the size stay pinned at the top as the card scrolls. Exact numbers and More are one tap away.</div>'
    '<div class="row">'
    + fig('phone-C.png', 'Phone · first glance', '“about 34 MB” and three sliders; the size moves as you drag.', 320)
    + fig('phone-C-exact.png', 'Phone · Exact numbers opened', 'W×H and fps boxes under the sliders.', 320)
    + fig('phone-C-more.png', 'Phone · More opened', 'Part, Only one layer (“1 on”, amber under the size), See-through.', 320)
    + '<div class="notes"><h3>Good</h3><ul><li>The size-against-quality trade-off is the easiest to feel.</li><li>The shortest first screen of the three.</li></ul>'
    '<h3>Weaker than A</h3><ul><li>The closest to CapCut’s own look, which he said not to fully copy.</li>'
    '<li>The Sharpness stops change with every project (a 720p project has three), and rates like 24 or 29.97 fall between notches.</li>'
    '<li>Small targets for a thumb at 380 px, and a slider is easy to nudge by accident.</li><li>Part is hidden under More, but it is a real first-timer question.</li></ul></div>'
    + '</div><div class="row">'
    + fig('pc-C-crop.png', 'PC 1280×800 · first glance', 'the same card, popping out of Export.', pw('C'), pc=True)
    + fig('pc-C-exact-crop.png', 'PC · Exact numbers opened', 'the boxes open under the sliders; the size stays pinned.', pw('C-exact'), pc=True)
    + fig('pc-C-more-crop.png', 'PC · More opened', 'Part as three buttons, one layer picked, See-through.', pw('C-more'), pc=True)
    + '</div>' + FOOT))

profile = tempfile.mkdtemp(prefix='fm-985s-')
dport = _cdp.free_port()
proc = _cdp.launch(dport, 1600, 1000, profile)
cdp = None
try:
    cdp = _cdp.CDP(_cdp.ws_url(dport))
    cdp.send('Page.enable')
    for name, doc in sheets.items():
        hp = os.path.join(HERE, '985-%s.html' % name)
        open(hp, 'w').write(doc)
        cdp.send('Emulation.setDeviceMetricsOverride', width=1600, height=1000, deviceScaleFactor=2, mobile=False)
        cdp.send('Page.navigate', url='http://localhost:%d/tools/design/985/985-%s.html' % (PORT, name))
        for _ in range(80):
            try:
                if cdp.eval("document.readyState === 'complete' && [...document.images].every(i => i.complete && i.naturalWidth > 0)"):
                    break
            except Exception:
                pass
            time.sleep(0.25)
        time.sleep(0.4)
        w = int(cdp.eval("Math.ceil(document.body.scrollWidth)"))
        h = int(cdp.eval("Math.ceil(document.documentElement.scrollHeight)"))
        cdp.send('Emulation.setDeviceMetricsOverride', width=w, height=h, deviceScaleFactor=2, mobile=False)
        time.sleep(0.5)
        d = cdp.send('Page.captureScreenshot', format='jpeg', quality=88, captureBeyondViewport=True)['data']
        out = os.path.join(HERE, '985-%s.jpg' % name)
        open(out, 'wb').write(base64.b64decode(d))
        broken = cdp.eval("[...document.images].filter(i => !i.naturalWidth).map(i => i.src)")
        print(out, w, h, 'ratio %.2f' % (h / w), 'broken:', broken)
finally:
    if cdp:
        cdp.close()
    proc.terminate()
    try:
        proc.wait(timeout=5)
    except Exception:
        proc.kill()
    shutil.rmtree(profile, ignore_errors=True)
