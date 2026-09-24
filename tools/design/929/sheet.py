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
.two { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
.two img { width: 100%; display: block; border-radius: 8px; }
.one img { width: 100%; display: block; border-radius: 8px; margin-top: 6px; }
/* page captures are ACTUAL SIZE only at 358 CSS px (the phone's page width): reach past the card padding for
   it on a phone, and never stretch past it on a wide screen */
.card .full { margin-left: -13px; margin-right: -13px; }
.full img { max-width: 358px; margin: 0 auto; }
.col h3 { font-size: 15px; margin: 0 0 4px; }
.col .t2 { display: block; margin: 6px auto 0; }
.strip { display: grid; grid-template-columns: repeat(7, 46px); gap: 4px; justify-content: center; margin: 4px 0 2px; }
.strip.pc { grid-template-columns: repeat(7, 48px); gap: 3px; }
.strip img { display: block; width: 100%; border-radius: 4px; }
.strip span { font-size: 9.5px; line-height: 1.1; color: var(--dim); text-align: center; align-self: end; hyphens: manual; overflow-wrap: anywhere; }
.rowlab { font-size: 13px; font-weight: 700; margin: 8px 0 0; }
.see { background: var(--chip); border-radius: 10px; padding: 8px 10px; font-size: 14.5px; margin-top: 8px; }
.tests { font-size: 13.5px; color: var(--dim); margin-top: 8px; }
details { font-size: 13.5px; color: var(--dim); margin-top: 4px; }
details summary { cursor: pointer; font-weight: 600; }
details ul { margin: 4px 0 0; padding-left: 20px; }
.legend { font-size: 13px; color: var(--dim); margin: 3px 0 0; }
.legend b { color: #e2245a; }
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
    # the Shape page, top two rows only (the heart is in row 2): the tile-style comparison needs no more
    for v in ('current-baked', 'fixed-alloutline', 'fixed-allfill'):
        pg = Image.open(os.path.join(IMG, 'hrt-%s-page-phone.png' % v)).convert('RGB')
        pg.crop((0, 0, pg.width, int(round(pg.height * 0.668)))).save(os.path.join(IMG, 'hrt-%s-page2-phone.png' % v))
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
     'Home-made, round two of #760, not traced from anything.',
     'The shoulders are a flat slab with the arms hung off its corners, so the top reads as a coat hanger. Her skirt is a separate triangle pinned under the arms. This is the pair you are calling bad.'),
    ('aiga', 'A · The airport sign', 'recommended',
     'AIGA / US DOT symbol signs, 1974. Public domain. Traced from Wikimedia Commons <code>Toilets_unisex.svg</code>.',
     'The sign on airport toilet doors. Round shoulders, arms hanging beside the body with a thin gap, her arms angled out over an A-line dress. <b>Changed from the sign, only so it survives the small tile:</b> the neck gap, the arm gaps and the leg gap are each a few units wider (17, 13 and 12 out of 572, instead of 13, 10 and 9). You can see this in the overlay: he is a little wider across the arms.'),
    ('maki', 'B · The map icon', None,
     'Mapbox Maki <code>toilet</code> icon. CC0 (public domain).',
     'Drawn for tiny map pins, so it is chunkier: a bigger head, his arms are just the rounded ends beside his legs, hers angle out. Friendlier, less formal. <b>Two small changes from the icon:</b> the top of the thin sliver between her arm and her dress is filled in (in the original it breaks into pinholes when small), and the inside corner of each of his hands is square instead of a point.'),
    ('material', 'C · Google’s icon set', None,
     'Google Material Symbols <code>man</code> / <code>woman</code>, Rounded. Apache 2.0.',
     'The Android / Google look: no arms and one leg column, on purpose. Cleanest at small sizes, <b>but you asked for arms in #160</b>, and this takes them away.'),
]

# what he would SEE, from img/ppl-legib.json (render.py): measured at every size from 16 to 240px tall
SEE = {
    'current': 'Clean at every tile size on your phone and PC.',
    'aiga': 'On your phone (about 25 px tall on screen): all clean, head, arms and legs separate. '
            'On PC (29 px) and smaller, the thin gaps become hairlines: the neck and arm gaps show as faint lines, and hers break up in places. The real sign does the same when printed small.',
    'maki': 'Clean at every size from 16 to 240 px, except one faint dot at 21 and 30 px where her small arm notch is one pixel wide. '
            '(The original’s sliver broke into three pinholes at 48 px; filling its top fixed that.)',
    'material': 'Clean at every tile size (only below 23 px can his head touch his shoulders). No arms and one leg column, by design.',
}

PASSES = {'current': 8, 'aiga': 2, 'maki': 3, 'material': 2}

DETAILS = {
    'aiga': ['“same figure below the neck”: her arms angle out and his hang down, so their widths differ',
             'the arm-span band: her arms measure 2.18 head-widths across (the old rule wants 2.5 to 3.3)',
             'at 24 px (smaller than any tile) his head touches his shoulders: fails two tests',
             'the #160 armpit rule wants 2 px of gap at 51 px; the sign has 1',
             'the #760 rule counts 6 separate parts (head, body, 2 arms, 2 legs); the sign is drawn as 2'],
    'maki': ['“same figure below the neck”: her arms angle out, his hang straight',
             'head is 1 : 4.7 of the height (the old rule wants 1 : 6 to 1 : 7)',
             'his arms are part of his body, so there is no armpit gap to measure: fails two tests',
             'the #760 rule counts 6 separate parts per figure; she is drawn as 2'],
    'material': ['no arms (the #160 rule), and no armpit gap at 24 px',
                 'one leg column, so “two legs at 24 and 48 px” fails',
                 'head is 1 : 5 (the old rule wants 1 : 6 to 1 : 7)',
                 '“same figure below the neck” and the #760 6-parts count'],
}


def people_html():
    b = ['<h1>People shapes, from real signs</h1>',
         '<p class="lead">#929, your words: <q>the human shapes are still bad. Make sure you reference other shapes that you can find online and try and make them look like it.</q></p>',
         '<p class="lead">Every round before this (v3.49, v6.03, #160, #435, #760) reshaped the same home-made figure. These three are traced from real, published pictograms, each one free to use. '
         'For each one you see the original, ours drawn over it, then the real <b>Add → Shape</b> tiles at the size they appear on your phone and on PC, and the Shape page as you will see it.</p>']
    for oid, name, tag, ref, note in PEOPLE:
        b.append('<div class="card%s">' % (' rec' if tag else ''))
        b.append('<p class="name">%s%s</p>' % (H.escape(name), ('<span class="tag">(%s)</span>' % tag) if tag else ''))
        b.append('<p class="ref">%s</p>' % ref)
        if oid != 'current':
            b.append('<div class="big">%s%s</div>' % (img('ppl-%s-ref.png' % oid, alt='the original'), img('ppl-%s-big-light.png' % oid, alt='ours')))
            b.append('<p class="cap">Left: the original, as published. Right: ours, drawn by the app.</p>')
            b.append('<div class="one">%s</div>' % img('ppl-%s-overlay.png' % oid, alt='ours over the original'))
            b.append('<p class="legend">The original in grey, with <b>ours</b> traced over it by the app. Where the line hugs the grey edge, they match.</p>')
        else:
            b.append('<div class="big">%s%s</div>' % (img('ppl-%s-big-light.png' % oid, alt=name + ' on light'), img('ppl-%s-big-dark.png' % oid, alt=name + ' on dark')))
            b.append('<p class="cap">Drawn by the app, on light and on dark.</p>')
        b.append('<div class="tiles">'
                 '<figure><div class="pair">%s%s</div><figcaption>Phone tiles, actual size</figcaption></figure>'
                 '<figure><div class="pair">%s%s</div><figcaption>PC tiles, actual size</figcaption></figure>'
                 '</div>' % (img('ppl-%s-person-tile-phone.png' % oid, 70), img('ppl-%s-woman-tile-phone.png' % oid, 70),
                             img('ppl-%s-person-tile-pc.png' % oid, 55), img('ppl-%s-woman-tile-pc.png' % oid, 55)))
        b.append('<div class="full" style="margin-top:8px">%s</div><p class="cap">Your phone’s Shape page with these figures, next to the key, umbrella and car. Actual size.</p>'
                 % img('ppl-%s-page-phone.png' % oid, alt='Shape page on the phone'))
        b.append('<p class="note">%s</p>' % note)
        b.append('<p class="see"><b>What you would see:</b> %s</p>' % SEE[oid])
        if oid == 'current':
            b.append('<p class="tests">Tests: passes all 8 people tests. They were written around this figure, which is why they cannot tell it looks bad.</p>')
        else:
            b.append('<p class="tests">Tests: %d of the 8 old people tests pass. They measure the home-made figure’s own proportions, so every real sign fails most of them. If you pick this one, I rewrite them around it.</p>' % PASSES[oid])
            b.append('<details><summary>Test details</summary><ul>%s</ul></details>' % ''.join('<li>%s</li>' % H.escape(x) for x in DETAILS[oid]))
        b.append('</div>')
    b.append('<h2>Figures already in your projects</h2>'
             '<p class="note">They change to your pick too, because the app draws every person and woman from the one shape each time. Their size and place stay the same. The only exception is a figure you have opened in <b>Edit Points</b>: that one keeps its own points.</p>')
    b.append('<h2>About the tests</h2>'
             '<p class="note">The 8 people tests lock in the home-made figure: 6 separate parts, gaps sized for 24 px, a 1 : 6 to 1 : 7 head. A real sign fails most of them without anything being wrong with it. Whichever you pick, I replace those rules with: the outline matches the sign, and the head, arms and legs read at the real tile sizes. Two stay as they are: mirror-symmetric, and a round head.</p>')
    b.append('<div class="reply">Reply <b>people A</b>, <b>people B</b>, <b>people C</b> or <b>keep</b>. Nothing ships until you pick.</div>')
    return page('People Shapes 929', ''.join(b))


# ------------------------------------------------------------------------------------------------ heart
HEARTS = [
    ('current', 'Now (what ships)', None, 'The v4.85 heart, drawn from your reference in v4.21.',
     'The bend near the bottom, and an icon that does not match it.', None),
    ('fixed', 'A · Yours, fixed', 'recommended', 'The same heart, with 2 of its 8 points changed.',
     'Same size, notch, lobes and point as the heart you approved. Only the two lower points change: their handle now lies along the straight side and is about 2½× longer, so the side curves into the lobe gradually. Edit Points shows the same 8 points.',
     'Hearts already in your projects get the fix too: the app draws every heart from this one shape each time. (A heart you have opened in Edit Points keeps its own points.)'),
    ('material', 'B · Google’s heart', None, 'Material Symbols <code>favorite</code>. Apache 2.0. Fitted to Google’s outline to within 0.3% of the heart’s size.',
     'The heart on most like buttons: rounder lobes, a shallower notch, a little wider than tall (1.09 : 1), so it arrives a bit wider than today.',
     'oldbox'),
    ('classic', 'C · The textbook heart', None, 'A square turned on its corner with a half-circle on each top side. Plain geometry, no licence. Fitted to within 0.3%.',
     'Round lobes and straight sides, 1.09 : 1. Its sharpest bend on the lower side measures 3.5, lower than the round lobes’ own 3.7, so there is no knee.',
     'oldbox'),
]
STRIP = [('Triangle', 'triangle'), ('Heart', 'heart'), ('Plus', 'plus'), ('Arrow', 'arrow'), ('Chevron', 'chevron'),
         ('Trapezoid', 'trapezoid'), ('Parallel&shy;ogram', 'parallelogram')]


def strip(tag):
    w = 46 if tag == 'phone' else 48
    labs = ''.join('<span>%s</span>' % t for t, _ in STRIP)
    rows = []
    for state, lab in (('now', 'Now'), ('after', 'After (every tile drawn from its shape)')):
        rows.append('<p class="rowlab">%s</p><div class="strip%s">%s</div>' % (lab, ' pc' if tag == 'pc' else '', ''.join(
            img('strip-%s-%s-%s.png' % (state, k, tag), w, alt=k) for _, k in STRIP)))
    return '<div class="strip%s">%s</div>%s' % (' pc' if tag == 'pc' else '', labs, ''.join(rows))


def heart_html():
    kinks = json.load(open(os.path.join(HERE, 'hearts.json')))
    b = ['<h1>The heart: the bulge, the icon, and 3 options</h1>',
         '<p class="lead">#929, your words: <q>in its little icon picture … it doesn’t look the same as when you actually add it … the line bulges out near the bottom of the heart.</q></p>',
         '<h2>Today and heart A <span class="tag">(recommended)</span></h2>',
         '<div class="card rec"><div class="two">',
         '<div class="col"><h3>Today</h3>%s%s</div>' % (img('hrt-current-elbow.png', alt='today: lower-left side'), img('hrt-current-baked-tile-phone.png', 140, cls='t2', alt='today: the tile')),
         '<div class="col"><h3>Heart A</h3>%s%s</div>' % (img('hrt-fixed-elbow.png', alt='A: lower-left side'), img('hrt-fixed-outline-tile-phone.png', 140, cls='t2', alt='A: the tile')),
         '</div>',
         '<p class="cap">Top: the lower-left side of the heart, drawn as a white outline so the line is easy to follow. Today it runs dead straight and then turns all at once (circled): that is the bulge. A curves into the lobe gradually. '
         'Bottom: the Heart tile on your phone, 2× bigger. Today’s dips in and juts out on each lower side (the little lines). A’s is drawn from the heart itself.</p>',
         '<div class="tiles"><figure>%s<figcaption>Today, actual size</figcaption></figure><figure>%s<figcaption>A, actual size</figcaption></figure></div></div>'
         % (img('hrt-current-baked-tile-phone.png', 70), img('hrt-fixed-outline-tile-phone.png', 70)),
         '<h2>What is wrong now</h2>',
         '<div class="card"><p class="name">1 · The bulge near the bottom</p>',
         '<div class="two">%s%s</div>' % (img('hrt-current-points-sq.png', alt='Edit Points today'), img('hrt-fixed-points-sq.png', alt='Edit Points with A')),
         '<p class="cap">Edit Points on PC: today (left) and A (right). The same 8 points; only the second point up from the tip on each side changes.</p>',
         '<p class="note">That point’s handle is tiny and aimed 10° off the straight run coming up from the tip. So the side goes straight, then turns all at once there: a knee. Measured, it bends <b>about 12× more sharply there than anywhere on the lobes</b> (45 against 3.7). In A the handle lies along the side and is longer, and the sharpest bend drops to 2.1.</p></div>',
         '<div class="card"><p class="name">2 · The icon is a different drawing</p>',
         '<div class="two">%s%s</div>' % (img('hrt-current-icon-overlay.png', alt='icon outline over the real heart'), img('hrt-current-icon-zoom.png', alt='close-up of the dip')),
         '<p class="cap">The Add-menu icon’s outline (white) laid over the heart you actually get (pink), same size. Right: its lower-left side, close up.</p>',
         '<p class="note">The tile is not drawn from the heart. It is a hand-typed picture in <code>js/addmenu.js</code>, copied from an early draft of the v4.85 heart whose lower handles pointed straight up. So the icon dips in and juts out at that same spot, and it never followed the heart when the heart changed.</p></div>',
         '<h2>The icon fix, so no tile can drift again</h2>',
         '<div class="card"><p class="note">Draw each tile <b>from the shape itself</b>, with the same code that already draws the Squircle tile and every shape on pages 2 to 4. Then the tile is whatever the shape is, for good, and a test fails if a tile with a shape behind it is ever hand-drawn again. '
         'Six more tiles are hand-typed copies like the heart, so <b>they change too</b>. All seven, on your phone, actual size:</p>',
         strip('phone'),
         '<p class="note"><b>What changes:</b> the <b>Triangle</b> and the <b>Chevron</b> get bigger, filling the tile like their neighbours. The <b>Arrow</b>, <b>Trapezoid</b> and <b>Parallelogram</b> get flatter (the arrow goes from 1.4 : 1 to 2 : 1). That flatter shape is what you already get when you tap them: the old icons were drawn taller than the real shapes. The <b>Plus</b> stays the same. The <b>Heart</b> loses its dip.</p>',
         '<p class="rowlab" style="margin-top:10px">The same seven on PC, actual size</p>', strip('pc'),
         '</div>',
         '<h2>The Heart tile: outline or filled</h2>',
         '<div class="card">',
         '<div class="full">%s</div><p class="cap">Now: the top of your phone’s first Shape page, actual size.</p>' % img('hrt-current-baked-page2-phone.png', alt='Shape page now'),
         '<div class="full" style="margin-top:10px">%s</div><p class="cap"><b>Outline (recommended)</b>: every tile drawn from its shape, heart A as a line drawing.</p>' % img('hrt-fixed-alloutline-page2-phone.png', alt='Shape page, outline heart'),
         '<div class="full" style="margin-top:10px">%s</div><p class="cap"><b>Filled</b>: the same, with the heart tile solid.</p>' % img('hrt-fixed-allfill-page2-phone.png', alt='Shape page, filled heart'),
         '<p class="note">Outline keeps the block even, since every tile in it is a line drawing. <b>It keeps one difference:</b> the tile is a line drawing and the heart you add is solid, the same as the square, circle and star tiles next to it. Filled looks exactly like the heart you get, but it is the only solid tile in the block. Either way the shape is now exactly your heart.</p></div>',
         '<h2>The heart itself: 3 options</h2>']
    for oid, name, tag, ref, note, saved in HEARTS:
        tv = 'baked' if oid == 'current' else 'outline'
        k = kinks['shipped_kink'] if oid == 'current' else kinks['options'][oid]['kink']
        b.append('<div class="card%s">' % (' rec' if tag else ''))
        b.append('<p class="name">%s%s</p>' % (H.escape(name), ('<span class="tag">(%s)</span>' % tag) if tag else ''))
        b.append('<p class="ref">%s</p>' % ref)
        if oid == 'current':
            b.append('<div class="big">%s%s</div>' % (img('hrt-current-big-light.png', alt=name + ' on light'), img('hrt-current-big-dark.png', alt=name + ' on dark')))
        else:
            b.append('<div class="big">%s%s</div>' % (img('hrt-%s-big-light.png' % oid, alt=name), img('hrt-%s-overlay.png' % oid, alt='ours over the reference')))
            what = {'fixed': 'today’s heart in grey, with <b>heart A</b> traced over it by the app. They differ only along the lower sides, where the knee was.',
                    'material': 'Google’s heart in grey, with <b>this option</b> traced over it by the app.',
                    'classic': 'the textbook heart in grey, with <b>this option</b> traced over it by the app.'}[oid]
            b.append('<p class="legend">Right: %s</p>' % what)
        kv = k['max_curv_flank']
        if oid not in ('current', 'fixed'):
            b.append('<div class="two" style="margin-top:6px">%s%s</div>' % (img('hrt-%s-elbow.png' % oid, alt='lower side as an outline'), img('hrt-%s-points-sq.png' % oid, alt='Edit Points')))
            b.append('<p class="cap">Lower-left side as an outline · Edit Points (PC). Sharpest bend on the lower side: <b>%s</b> (today 45; the round lobes are about 3.7; lower is smoother).</p>'
                     % (('%.0f' % kv) if kv >= 10 else ('%.1f' % kv)))
        elif oid == 'fixed':
            b.append('<p class="cap">Its lower side and Edit Points are at the top of this page. Sharpest bend on the lower side: <b>2.1</b> (today 45; the round lobes are about 3.7; lower is smoother).</p>')
        else:
            b.append('<p class="cap">Its lower side and Edit Points are at the top of this page. Sharpest bend on the lower side: <b>45</b>, the knee.</p>')
        b.append('<div class="tiles">'
                 '<figure><div class="pair">%s%s</div><figcaption>Phone tiles: %s · filled</figcaption></figure>'
                 '<figure><div class="pair">%s</div><figcaption>PC tile</figcaption></figure></div>'
                 % (img('hrt-%s-%s-tile-phone.png' % (oid, tv), 70), img('hrt-%s-fill-tile-phone.png' % oid, 70),
                    'today’s icon' if oid == 'current' else 'outline', img('hrt-%s-%s-tile-pc.png' % (oid, tv), 55)))
        b.append('<p class="note">%s</p>' % note)
        if saved == 'oldbox':
            pct = round((1 - 1 / kinks['options'][oid]['aspect'][0]) * 100)
            b.append('<div class="full" style="margin-top:8px">%s</div>' % img('hrt-%s-oldbox.png' % oid, alt='new heart and an old one'))
            b.append('<p class="cap">Left: this heart as it arrives. Right: a heart you added before, same height.</p>')
            b.append('<p class="see"><b>Your saved projects:</b> hearts you have already added keep the square box they were added in, so they would show this shape about %d%% narrower than it should be (right). I can widen old hearts when a project opens, but that nudges every video that has one. Your call, if you pick this.</p>' % pct)
        elif saved:
            b.append('<p class="see"><b>Your saved projects:</b> %s</p>' % saved)
        b.append('</div>')
    b.append('<div class="reply">Reply <b>heart A</b>, <b>heart B</b> or <b>heart C</b>, and <b>tile outline</b> or <b>tile filled</b>. The icon fix for all seven tiles goes in with whichever you pick.</div>')
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
