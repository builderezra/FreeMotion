"""#482 batch 4 — build the Filters-tab options sheet for Ezra (#545: he sees it drawn before anything is built).
Usage:  python3 tools/design/482/batch4/src/make_sheet.py PORT [name …]      (PORT = a running tools/serve.sh)
Writes tools/design/482/batch4/<name>.jpg for: today-390, A-390, B-390, C-390, compare-390, A-1280.

Every picture is the REAL app (headless Chrome, 390x844 CSS px at 2x — his phone — or 1280x800 for the computer
layout), a real photo (fx-art/mclaren.jpg) on an image layer, the real Filters tab with Cold Steel picked, and the canvas
drawn by the app's own compositor (40 % = the picked container at params.strength 0.4 through FM._fxPreview). Only the
new buttons are drawn, by options.js, from the app's own CSS classes. No file under js/ or styles.css is touched."""
import os, sys, json
from PIL import Image
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from drive import Session  # noqa: E402

OUT = os.path.normpath(os.path.join(HERE, '..'))
PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 9041
WANT = sys.argv[2:]
BASE = dict(__b4pick='coldsteel', __b4extra=['run', 'pair'])   # three photo clips, so "all clips" has a number

HDR = {
    'today-390': dict(badge='Today', title='v17.20, for comparison', lines=[
        'Tap a filter, then **Clear** or **Add 1 filter**. The preview is always full strength. Strength only exists after Add.',
        'No search, no row for your saved filters, no before/after, and Add only reaches the selected clip.']),
    'A-390': dict(badge='A', title='Two rows, everything showing', rec=True, lines=[
        'Top: **Strength** and **\u25d0 hold to compare**. Below: **Clear \u00b7 Add 1 filter \u00b7 Add to all 3 clips** (only there with 2+ photo or video clips).',
        'Shown: Cold Steel at **40 %**, drawn by the app. In A, B and C alike, search shares the **+ Empty** row and saved filters get a **Your filters** row.'],
        why='Recommended: every action is one tap and labelled, so nothing hides in a menu or a mode. The bar grows inside '
            'the panel (58 \u2192 112 px) and the picture keeps its size.'),
    'B-390': dict(badge='B', title='One row, about today\u2019s height', lines=[
        '**\u25d0** \u00b7 a short **Strength** strip \u00b7 **Add 1 filter \u25be**. **Clear** and **Add to all 3 clips** move into the \u25be menu (shown open).',
        'The bar stays small (62 px, today 58). The catch: the strip is short, and two actions need an extra tap.']),
    'C-390': dict(badge='C', title='Choose where it goes', lines=[
        'Top row as A. Below: **\u2715 \u00b7 This clip | All 3 \u00b7 Add**. Choosing All 3 turns the button into **Add to 3 clips**, so it says where the filter lands before you tap.',
        'It takes one more tap to add to all clips, and the switch goes back to This clip each time. Search is shown in use: \u201cnight\u201d finds 6 filters by name, description and what they are made of.']),
    'compare-390': dict(badge='\u25d0', title='Hold to compare', lines=[
        'The same in A, B and C. Hold **\u25d0**, or press and hold the picture without dragging, and the preview shows **no filters** until you let go. '
        'It is never saved and never goes into undo.']),
    'compare-row': dict(small=True, title='On a filter you have added', lines=[
        '**\u25d0** beside \u22ef does the same. The 40 % you set before Add is its Strength (**0.40**).']),
    'A-1280': dict(badge='A', title='A on a computer (1280 wide, Studio layout)', rec=True, width=640, lines=[
        'The inspector is only **307 px** wide here, narrower than a phone, so **Clear** becomes **\u2715** and the all-clips button reads **All 3 clips**. '
        'Both labels shorten only when they do not fit.',
        'At the default band height the bar covers the rows under the search, and today\u2019s bar does the same. Drag the band up to see more.']),
    'A-1280-zoom': dict(small=True, width=640, title='The inspector, full size', lines=[]),
}


def header(s, key):
    s.set(__b4hdr=HDR[key])
    clip = s.run('header.js')['clip']
    return s.shot(clip)


def stack(parts, w):
    h = sum(p.height for p in parts)
    out = Image.new('RGB', (w, h), (15, 17, 23))
    y = 0
    for p in parts:
        out.paste(p, ((w - p.width) // 2, y))
        y += p.height
    return out


def save(im, name):
    path = os.path.join(OUT, name + '.jpg')
    im.save(path, quality=88, optimize=True)
    print('%s %dx%d ratio %.2f' % (path, im.width, im.height, im.height / im.width))


def phone(name, scripts, arg=None, extra=None):
    s = Session(PORT, 390, 844)
    try:
        s.set(__b4arg=arg, **BASE)
        if extra:
            s.set(**extra)
        val = None
        for sc in scripts:
            val = s.run(sc)
        print(name, json.dumps(val)[:600])
        app = s.shot()
        save(stack([header(s, name), app], app.width), name)
    finally:
        s.close()


def compare():
    s = Session(PORT, 390, 844)
    try:
        s.set(__b4arg='hold', __b4str=0.4, __b4rowcmp=True, **BASE)
        s.run('setup.js')
        print('hold', json.dumps(s.run('options.js'))[:400])
        held = s.shot()
        s.js("document.querySelectorAll('.b4-held-tag,.b4-ring').forEach(e => e.remove()); true")
        row = s.run('openrow.js')
        print('row', json.dumps(row)[:300])
        top = max(0, int(row['row']['top']) - 4)
        rowim = s.shot({'x': 0, 'y': top, 'width': 390, 'height': 132})
        h1 = header(s, 'compare-390')
        h2 = header(s, 'compare-row')
        save(stack([h1, held, h2, rowim], held.width), 'compare-390')
    finally:
        s.close()


def desktop():
    s = Session(PORT, 1280, 800)
    try:
        s.set(__b4arg='A', __b4scroll='search', **BASE)
        s.run('setup.js')
        print('A-1280', json.dumps(s.run('options.js'))[:600])
        full = s.shot()                                              # 2560x1600
        zoom = s.shot({'x': 0, 'y': 548, 'width': 640, 'height': 252})  # the inspector band, at full 2x resolution
        h1 = header(s, 'A-1280')
        h2 = header(s, 'A-1280-zoom')
        W = h1.width                                                 # 640 CSS px at 2x = 1280
        small = full.resize((W, int(full.height * W / full.width)), Image.LANCZOS)
        save(stack([h1, small, h2, zoom], W), 'A-1280')
    finally:
        s.close()


JOBS = {
    'today-390': lambda: phone('today-390', ['setup.js']),
    'A-390': lambda: phone('A-390', ['setup.js', 'options.js'], 'A'),
    'B-390': lambda: phone('B-390', ['setup.js', 'options.js'], 'B'),
    'C-390': lambda: phone('C-390', ['setup.js', 'options.js'], 'C'),
    'compare-390': compare,
    'A-1280': desktop,
}
for k in (WANT or list(JOBS)):
    JOBS[k]()
