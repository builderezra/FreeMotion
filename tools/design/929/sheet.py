"""Builds the two #929 option sheets as self-contained HTML (images inlined), then screenshots each at phone
width (390 CSS px, DPR 3) into one tall JPG he can read on his phone:
    tools/design/929-people.html + 929-people.jpg
    tools/design/929-heart.html  + 929-heart.jpg
Run render.py first (it makes img/)."""
import base64, json, os, subprocess, sys, html as H

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.dirname(HERE)
IMG = os.path.join(HERE, 'img')


def uri(name):
    with open(os.path.join(IMG, name), 'rb') as f:
        return 'data:image/png;base64,' + base64.b64encode(f.read()).decode()


def img(name, w=None, alt='', cls=''):
    st = (' style="width:%spx"' % w) if w else ''
    return '<img class="%s" src="%s" alt="%s"%s>' % (cls, uri(name), H.escape(alt), st)


CSS = """
:root { --bg:#f4f6f9; --card:#ffffff; --ink:#131b24; --dim:#4f5d6b; --line:#dbe2ea; --rec:#0f7a45; --recbg:#e3f5ea; --bad:#b4232c; --chip:#eef2f6; }
@media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) { --bg:#0d1319; --card:#151e27; --ink:#e3e9ef; --dim:#9aa9b7; --line:#26323e; --rec:#6fdc9c; --recbg:#143324; --bad:#ff8a8f; --chip:#1c2733; } }
:root[data-theme="dark"] { --bg:#0d1319; --card:#151e27; --ink:#e3e9ef; --dim:#9aa9b7; --line:#26323e; --rec:#6fdc9c; --recbg:#143324; --bad:#ff8a8f; --chip:#1c2733; }
* { box-sizing: border-box; }
html, body { margin: 0; background: var(--bg); color: var(--ink); }
body { font: 16px/1.45 -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif; padding: 18px 16px 28px; max-width: 760px; margin: 0 auto; overflow-x: hidden; }
h1 { font-size: 23px; line-height: 1.2; margin: 0 0 6px; }
h2 { font-size: 19px; margin: 22px 0 8px; }
p { margin: 6px 0; }
.lead { color: var(--dim); font-size: 15px; }
q { font-style: italic; }
.card { background: var(--card); border: 1px solid var(--line); border-radius: 14px; padding: 12px; margin: 12px 0; }
.card.rec { border: 2px solid var(--rec); }
.name { font-size: 19px; font-weight: 750; margin: 0 0 2px; }
.tag { display: inline-block; font-size: 13px; font-weight: 700; color: var(--rec); background: var(--recbg); border-radius: 999px; padding: 1px 9px; margin-left: 4px; vertical-align: 2px; }
.ref { font-size: 14px; color: var(--dim); margin: 0 0 8px; }
.big { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; }
.big img, .full img { width: 100%; display: block; border-radius: 8px; }
.cap { font-size: 13px; color: var(--dim); margin: 3px 0 0; }
.tiles { display: flex; flex-wrap: wrap; align-items: flex-end; gap: 14px; margin-top: 10px; }
.tiles figure { margin: 0; text-align: center; }
.tiles figcaption { font-size: 12.5px; color: var(--dim); margin-top: 3px; }
.tiles .pair { display: flex; gap: 4px; justify-content: center; }
.tiles img { display: block; }
.tiles img.c { margin: 0 auto; }
.note { font-size: 14.5px; margin-top: 8px; }
.note b { font-weight: 700; }
.rules { font-size: 14px; }
.rules li { margin: 3px 0; }
.bad { color: var(--bad); font-weight: 700; }
.two { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
.two img { width: 100%; display: block; border-radius: 8px; }
.reply { background: var(--chip); border-radius: 12px; padding: 10px 12px; font-size: 15px; margin-top: 16px; }
code { font-size: 13px; background: var(--chip); padding: 0 4px; border-radius: 4px; }
"""


def crops():
    """Square close-ups cut from the rendered pictures (so the sheet's two-up grids line up)."""
    from PIL import Image, ImageDraw
    box, o = 820, 40                                   # renderBig(900, …, box 820) centres the heart
    kx, ky = o + 0.155 * box, o + 0.66 * box           # the shipped lower-flank anchor
    X0, Y0, S = 20, 420, 450
    for oid in ('current', 'fixed', 'material', 'classic'):
        im = Image.open(os.path.join(IMG, 'hrt-%s-big-stroke.png' % oid)).convert('RGB').crop((X0, Y0, X0 + S, Y0 + S))
        if oid == 'current':
            d = ImageDraw.Draw(im); cx, cy = kx - X0, ky - Y0
            d.ellipse((cx - 40, cy - 40, cx + 40, cy + 40), outline=(255, 196, 0), width=6)
        im.save(os.path.join(IMG, 'hrt-%s-elbow.png' % oid))
        p = Image.open(os.path.join(IMG, 'hrt-%s-points-pc.png' % oid)).convert('RGB')
        w, h = p.size; top = (h - w) // 2
        p.crop((0, top, w, top + w)).save(os.path.join(IMG, 'hrt-%s-points-sq.png' % oid))
    # the icon over the real heart: the whole thing, and its lower-left side close up with the dip circled
    ov = Image.open(os.path.join(IMG, 'hrt-current-icon-overlay.png')).convert('RGB')
    B, oo = 720, 90                                    # overlayIcon(900): box 0.8 W
    ix, iy = oo + 0.155 * B, oo + 0.66 * B
    z = ov.crop((int(ix - 150), int(iy - 190), int(ix + 150), int(iy + 110)))
    d = ImageDraw.Draw(z); d.ellipse((150 - 38, 190 - 38, 150 + 38, 190 + 38), outline=(255, 196, 0), width=5)
    z.resize((450, 450), Image.LANCZOS).save(os.path.join(IMG, 'hrt-current-icon-zoom.png'))


def page(title, body):
    return ('<!doctype html>\n<html lang="en" data-theme="light"><head><meta charset="utf-8">'
            '<meta name="viewport" content="width=device-width, initial-scale=1">'
            '<title>%s</title><style>%s</style></head><body>%s</body></html>\n') % (H.escape(title), CSS, body)


# ------------------------------------------------------------------------------------------------ people
PEOPLE = [
    ('current', 'Now (what ships)', None,
     'Home-made, round two of #760 — not traced from anything.',
     'The shoulders are a flat slab with the arms hung off its corners, so the top reads as a coat hanger; her skirt is a separate triangle pinned under the arms. This is the pair you are calling bad.'),
    ('aiga', 'A · The airport sign', 'recommended',
     'AIGA / US DOT symbol signs, 1974 — public domain. Traced from Wikimedia Commons <code>Toilets_unisex.svg</code> (PD-AIGA).',
     'The sign on every US airport toilet door. Round shoulders, arms hanging beside the body with a thin slit, her arms angled out over an A-line dress. <b>Changed from the sign, only so it survives the small tile:</b> the neck gap, the arm slits and the leg gap are each a few units wider (17 / 13 / 12 of 572 instead of 13 / 10 / 9).'),
    ('maki', 'B · The map icon', None,
     'Mapbox Maki <code>toilet</code> icon — CC0 (public domain).',
     'Drawn for 15-pixel map pins, so it is chunkier: a bigger head, his arms are just the rounded ends beside his legs, hers angle out. Friendlier, less formal.'),
    ('material', 'C · Google’s app icon', None,
     'Google Material Symbols <code>man</code> / <code>woman</code> (Rounded) — Apache 2.0.',
     'The Android / Google look: no arms and one leg column, on purpose. Cleanest at small sizes — <b>but you asked for arms in #160</b>, and this takes them away.'),
]

RULE_WORDS = {
    'aiga': ['his head touches his shoulders at 24px (it is clear at the real tile size: 29px on PC, 75px on your phone)',
             'the arm slits are 1px at 51px — the old rule wants 2px',
             'her arms angle out, so "same figure below the neck" and the arm-span band fail',
             'it is 2 parts, not the 6 the #760 test counts'],
    'maki': ['head is 1 : 4.7 of the height (rule says 1 : 6 – 1 : 7)',
             'his arms are part of his body, so there is no armpit gap to measure',
             'at 48px her arm-to-dress wedge closes into small holes',
             'not 6 parts; not the same figure below the neck'],
    'material': ['no arms (the #160 rule)', 'one leg column, so "two legs at 24px" fails',
                 'head is 1 : 5', 'not 6 parts; not the same figure below the neck'],
}


def people_html():
    b = ['<h1>People shapes, from real signs</h1>',
         '<p class="lead">#929, your words: <q>the human shapes are still bad. Make sure you reference other shapes that you can find online and try and make them look like it.</q></p>',
         '<p class="lead">Every round before this (v3.49, v6.03, #160, #435, #760) reshaped the same home-made figure. These three are traced from real, published pictograms, each one free to use. All of it is drawn by the app itself: big on light and dark, then the real <b>Add → Shape</b> tiles, at the size they appear on your phone (380 wide) and on PC (1280 wide).</p>']
    for oid, name, tag, ref, note in PEOPLE:
        b.append('<div class="card%s">' % (' rec' if tag else ''))
        b.append('<p class="name">%s%s</p>' % (H.escape(name), ('<span class="tag">(%s)</span>' % tag) if tag else ''))
        b.append('<p class="ref">%s</p>' % ref)
        b.append('<div class="big">%s%s</div>' % (img('ppl-%s-big-light.png' % oid, alt=name + ' on light'), img('ppl-%s-big-dark.png' % oid, alt=name + ' on dark')))
        b.append('<div class="tiles">'
                 '<figure><div class="pair">%s%s</div><figcaption>Phone tiles, actual size</figcaption></figure>'
                 '<figure><div class="pair">%s%s</div><figcaption>PC tiles, actual size</figcaption></figure>'
                 '</div>' % (img('ppl-%s-person-tile-phone.png' % oid, 70), img('ppl-%s-woman-tile-phone.png' % oid, 70),
                             img('ppl-%s-person-tile-pc.png' % oid, 55), img('ppl-%s-woman-tile-pc.png' % oid, 55)))
        b.append('<p class="note">%s</p>' % note)
        if oid in RULE_WORDS:
            b.append('<p class="note"><span class="bad">Breaks 6 of the 8 people tests:</span></p><ul class="rules">%s</ul>'
                     % ''.join('<li>%s</li>' % H.escape(x) for x in RULE_WORDS[oid]))
        else:
            b.append('<p class="note">Passes all 8 people tests — they were written around this figure, which is why they cannot tell it is bad.</p>')
        b.append('</div>')
    b.append('<h2>About those tests</h2>'
             '<p class="rules">The 8 people tests lock in the home-made proportions: 6 separate parts, wide gaps sized for 24px, a 1 : 6 – 1 : 7 head. Any real sign breaks 6 of them. If you pick one, I rewrite those 6 around the sign you picked (the outline has to match it; head, arms and legs have to read at the real tile size) instead of the old numbers. The two that stay as they are: mirror-symmetric, and a round head.</p>')
    b.append('<div class="reply">Reply <b>people A</b>, <b>people B</b>, <b>people C</b> or <b>keep</b>. Nothing ships until you pick.</div>')
    return page('People Shapes 929', ''.join(b))


# ------------------------------------------------------------------------------------------------ heart
HEARTS = [
    ('current', 'Now (what ships)', None, 'The v4.85 heart, drawn from your reference in v4.21.',
     'The bend near the bottom, and the icon above it that does not match.'),
    ('fixed', 'A · Yours, fixed', 'recommended', 'The same heart, with 2 of its 8 points changed.',
     'Same size, notch, lobes and point as the heart you approved. Only the two lower points change: their handle now lies along the straight side and is about 2½× longer, so the side curves into the lobe gradually. Edit Points shows the same 8 points.'),
    ('material', 'B · Google’s heart', None, 'Material Symbols <code>favorite</code> — Apache 2.0. Fitted to Google’s outline to within 0.3% of the heart’s size.',
     'The heart on most apps’ like buttons: rounder lobes, a shallower notch, a little wider than tall (1.09 : 1), so it arrives a bit wider than today.'),
    ('classic', 'C · The textbook heart', None, 'A square turned on its corner with a half-circle on each top side — plain geometry, no licence. Fitted to within 0.3%.',
     'Perfectly round lobes and straight sides. Where each lobe meets its straight side there is still a faint shoulder: that is the construction, not a fault.'),
]


def heart_html():
    kinks = json.load(open(os.path.join(HERE, 'hearts.json')))
    b = ['<h1>The heart: the bulge, the icon, and 3 options</h1>',
         '<p class="lead">#929, your words: <q>in its little icon picture … it doesn’t look the same as when you actually add it … the line bulges out near the bottom of the heart.</q></p>',
         '<h2>What is wrong now</h2>',
         '<div class="card"><p class="name">1 · The bulge near the bottom</p>',
         '<div class="two">%s%s</div>' % (img('hrt-current-elbow.png', alt='lower-left side of the real heart, outlined'), img('hrt-current-points-sq.png', alt='Edit Points on the real heart')),
         '<p class="cap">Left: the real heart’s lower-left side, drawn as an outline, the knee circled. Right: Edit Points on it (PC).</p>',
         '<p class="note">Each lower side has one point (the second dot up from the tip) whose handle is tiny and aimed 10° off the straight run coming up from the tip. So the side goes dead straight, then turns all at once at that point: a knee. It bends <b>about 12× more sharply there than anywhere on the lobes</b> (measured: 45 against 3.7).</p></div>',
         '<div class="card"><p class="name">2 · The icon is a different drawing</p>',
         '<div class="two">%s%s</div>' % (img('hrt-current-icon-overlay.png', alt='icon outline over the real heart'), img('hrt-current-icon-zoom.png', alt='close-up of the dip')),
         '<p class="cap">The Add-menu icon’s outline (white) laid over the heart you actually get (pink), same size; right, its lower-left side close up.</p>',
         '<div class="tiles"><figure>%s<figcaption>The tile today, on your phone</figcaption></figure><figure>%s<figcaption>The same tile, 2× bigger</figcaption></figure></div>' % (img('hrt-current-baked-tile-phone.png', 70), img('hrt-current-baked-tile-phone.png', 140)),
         '<p class="note">The tile is not drawn from the heart. It is a hand-typed picture in <code>js/addmenu.js</code>, copied from a draft of the v4.85 heart whose lower handles pointed straight up. So the icon dips in and juts out at that same spot (the funny little lines), and it never followed the heart when the heart changed.</p></div>',
         '<h2>The icon fix, so no shape can drift again</h2>',
         '<div class="card"><p class="note">Draw the tile <b>from the shape itself</b>, with the same code that already draws the Squircle tile and every shape on pages 2–4. Then the tile is whatever the heart is, forever. Triangle, Plus, Arrow, Chevron, Trapezoid and Parallelogram are hand-typed copies too, so they get the same treatment, plus a test that fails if any tile with a shape behind it is hand-drawn again.</p>',
         '<div class="full">%s</div><p class="cap">Now: your phone’s first Shape page, actual size.</p>' % img('hrt-current-baked-page-phone.png', alt='Add Shape page now'),
         '<div class="full" style="margin-top:8px">%s</div><p class="cap">After: every tile drawn from its shape, with heart A.</p>' % img('hrt-fixed-alloutline-page-phone.png', alt='Add Shape page with tiles from the shapes'),
         '<div class="tiles"><figure style="width:150px">%s<figcaption>Outline tile <b>(recommended)</b></figcaption></figure>'
         '<figure style="width:150px">%s<figcaption>Filled tile</figcaption></figure></div>' % (img('hrt-fixed-outline-tile-phone.png', 70, cls='c'), img('hrt-fixed-fill-tile-phone.png', 70, cls='c')),
         '<p class="note">Every other tile in that first block is an outline, so an outline heart keeps the row even; the shape inside it is now exactly the heart you get. Say <b>tile filled</b> if you would rather it be solid.</p></div>',
         '<h2>The heart itself: 3 options</h2>']
    for oid, name, tag, ref, note in HEARTS:
        tv = 'baked' if oid == 'current' else 'outline'
        k = kinks['shipped_kink'] if oid == 'current' else kinks['options'][oid]['kink']
        b.append('<div class="card%s">' % (' rec' if tag else ''))
        b.append('<p class="name">%s%s</p>' % (H.escape(name), ('<span class="tag">(%s)</span>' % tag) if tag else ''))
        b.append('<p class="ref">%s</p>' % ref)
        b.append('<div class="big">%s%s</div>' % (img('hrt-%s-big-light.png' % oid, alt=name + ' on light'), img('hrt-%s-big-dark.png' % oid, alt=name + ' on dark')))
        b.append('<div class="two" style="margin-top:6px">%s%s</div>' % (img('hrt-%s-elbow.png' % oid, alt='lower side as an outline'), img('hrt-%s-points-sq.png' % oid, alt='Edit Points')))
        kv = k['max_curv_flank']
        b.append('<p class="cap">Lower-left side as an outline · Edit Points (PC). Sharpest bend on the lower side: <b>%s</b>%s (the round lobes are about 3.7; lower is smoother)</p>'
                 % (('%.0f' % kv) if kv >= 10 else ('%.1f' % kv), ' — the knee' if oid == 'current' else ''))
        b.append('<div class="tiles">'
                 '<figure><div class="pair">%s%s</div><figcaption>Phone tiles: %s · filled</figcaption></figure>'
                 '<figure><div class="pair">%s</div><figcaption>PC tile</figcaption></figure></div>'
                 % (img('hrt-%s-%s-tile-phone.png' % (oid, tv), 70), img('hrt-%s-fill-tile-phone.png' % oid, 70),
                    'today’s icon' if oid == 'current' else 'outline', img('hrt-%s-%s-tile-pc.png' % (oid, tv), 55)))
        b.append('<p class="note">%s</p></div>' % note)
    b.append('<div class="reply">Reply <b>heart A</b>, <b>heart B</b> or <b>heart C</b> (and <b>tile filled</b> if you want the tile solid). The icon fix goes in with whichever you pick.</div>')
    return page('Heart Shape 929', ''.join(b))


def snap(html_path, out):
    subprocess.check_call([sys.executable, os.path.join(HERE, 'snap.py'), 'file://' + html_path, out,
                           '--width', '390', '--height', '844', '--dpr', '3', '--full', '--wait', '400'])


if __name__ == '__main__':
    crops()
    for name, fn in (('929-people', people_html), ('929-heart', heart_html)):
        p = os.path.join(OUT, name + '.html')
        with open(p, 'w') as f:
            f.write(fn())
        snap(p, os.path.join(OUT, name + '.jpg'))
