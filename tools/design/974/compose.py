"""queue 974 — compose render.py's frames into phone-safe strips (≤1200 wide, ≤3x as tall as wide) and short GIFs.
Usage: python3 tools/design/974/compose.py <outdir>   (reads <outdir>/frames, writes into <outdir>)"""
import glob, os, sys
from PIL import Image, ImageDraw, ImageFont

OUT = sys.argv[1]
FR = os.path.join(OUT, 'frames')


def font(size):
    for p in ['/System/Library/Fonts/SFNS.ttf', '/System/Library/Fonts/Helvetica.ttc', '/Library/Fonts/Arial.ttf']:
        try:
            return ImageFont.truetype(p, size)
        except Exception:
            pass
    return ImageFont.load_default()


def load(name, width=None):
    p = os.path.join(FR, name + '.png')
    if not os.path.exists(p):
        return None
    im = Image.open(p).convert('RGB')
    if width:
        im = im.resize((width, round(im.height * width / im.width)), Image.LANCZOS)
    return im


def strip(rows, cell_w, title, path, captions=None):
    """rows: [(label, [frame names])]; every row the same length."""
    ims = [[load(n, cell_w) for n in names] for _, names in rows]
    cell_h = max(im.height for r in ims for im in r if im)
    lab_h, gap, pad, top = 34, 6, 12, 56
    cols = max(len(r) for r in ims)
    Wd = pad * 2 + cols * cell_w + (cols - 1) * gap
    Hd = top + len(rows) * (lab_h + cell_h + gap) + pad + (26 if captions else 0)
    sheet = Image.new('RGB', (Wd, Hd), (13, 19, 26))
    d = ImageDraw.Draw(sheet)
    d.text((pad, 14), title, fill=(238, 243, 248), font=font(24))
    y = top
    for (label, _), r in zip(rows, ims):
        d.text((pad, y + 6), label, fill=(180, 193, 206), font=font(20))
        y += lab_h
        for i, im in enumerate(r):
            if im:
                sheet.paste(im, (pad + i * (cell_w + gap), y))
        y += cell_h + gap
    if captions:
        for i, c in enumerate(captions):
            d.text((pad + i * (cell_w + gap) + 4, y + 2), c, fill=(180, 193, 206), font=font(16))
    sheet.save(path, quality=88)
    return sheet.size


def gif(names, path, width, ms=40, hold=600):
    ims = [load(n, width) for n in names]
    ims = [im for im in ims if im]
    if not ims:
        return
    pal = [im.convert('P', palette=Image.ADAPTIVE, colors=96) for im in ims]
    durs = [ms] * len(pal)
    durs[-1] = hold
    pal[0].save(path, save_all=True, append_images=pal[1:], duration=durs, loop=0, optimize=True)


made = []
# ---- #947: the + entrances, dark and light Home ----
if glob.glob(os.path.join(FR, '947-A-dark-*.png')):
    pick = [0, 3, 5, 7, 9, 12, 16]
    caps = ['%d ms' % round(640 * i / 16) for i in pick]
    for look in ['dark', 'light']:
        rows = [('A · the orb becomes the card', ['947-A-%s-%02d' % (look, i) for i in pick]),
                ('B · a new canvas is drawn', ['947-B-%s-%02d' % (look, i) for i in pick]),
                ('C · a ripple opens it', ['947-C-%s-%02d' % (look, i) for i in pick])]
        p = os.path.join(OUT, '947-entrances-%s.jpg' % look)
        made.append((p, strip(rows, 160, '#947 · the New project + — all three now in the app, one at random per tap (%s Home)' % look, p, caps)))
    for v in ['A', 'B', 'C']:
        p = os.path.join(OUT, '947-%s.gif' % v)
        gif(['947-%s-dark-%02d' % (v, i) for i in range(17)], p, 220)
        made.append((p, None))
    rows = [('A · Cancel runs it backwards (dark Home)', ['947-Aback-dark-%02d' % i for i in [0, 2, 4, 6, 8]]),
            ('A · Cancel runs it backwards (light Home)', ['947-Aback-light-%02d' % i for i in [0, 2, 4, 6, 8]])]
    p = os.path.join(OUT, '947-A-cancel.jpg')
    made.append((p, strip(rows, 180, '#947 A · Cancel: the card shrinks back into the +', p, ['%d ms' % round(460 * i / 8) for i in [0, 2, 4, 6, 8]])))

# ---- #964: the tap colours ----
if glob.glob(os.path.join(FR, '964-A-*.png')):
    times = [0, 60, 120, 180, 240, 300, 360, 450, 560, 700, 850, 1000]
    pick = [1, 2, 3, 5, 7, 9]
    rows = [('A · Aurora', ['964-A-%02d' % i for i in pick]),
            ('B · Rings and sparks', ['964-B-%02d' % i for i in pick]),
            ('C · Key ripple', ['964-C-%02d' % i for i in pick])]
    p = os.path.join(OUT, '964-colours.jpg')
    made.append((p, strip(rows, 190, '#964 · the empty project\'s tap colour — all three in, one at random per press (380-class phone, tap on the +)', p, ['%d ms' % times[i] for i in pick])))
    for v in ['A', 'B', 'C']:
        p = os.path.join(OUT, '964-%s.gif' % v)
        gif(['964-%s-%02d' % (v, i) for i in range(12)], p, 260, ms=70)
        made.append((p, None))
if glob.glob(os.path.join(FR, '964start-*.png')):
    times = [0, 60, 120, 180, 240, 300, 360, 480, 700]
    pick = [0, 2, 3, 4, 6, 7]
    rows = [('from the bottom-middle, meeting at the top', ['964start-bottom-%02d' % i for i in pick]),
            ('from the edge nearest the finger (tap near the left edge)', ['964start-nearest-%02d' % i for i in pick])]
    p = os.path.join(OUT, '964-outline-starts.jpg')
    made.append((p, strip(rows, 190, '#964 · where the outline\'s two lights start — both in, one at random per press (colour hidden here)', p, ['%d ms' % times[i] for i in pick])))

# ---- #957: the clapper ----
if glob.glob(os.path.join(FR, 'clap-A-cyan-*.png')):
    # every 0.5 s for the first 8 s, plus the slam (0.4 s delay + 470 ms = 870 ms)
    idx = [0, 5, 8, 9, 10, 15, 20, 21, 22, 30, 37, 38, 45, 53, 54, 60, 68, 69, 70, 80]
    for col in ['cyan', 'grey']:
        rows = [('A · open, then every 6 s', ['clap-A-%s-%03d' % (col, i) for i in idx]),
                ('B · once', ['clap-B-%s-%03d' % (col, i) for i in idx]),
                ('C · non-stop (every 1.6 s)', ['clap-C-%s-%03d' % (col, i) for i in idx])]
        p = os.path.join(OUT, '957-clapper-timings-%s.jpg' % col)
        made.append((p, strip(rows, 52, '#957 · the clapper — three timings, %s lines, one at random per open (the colour per clap)' % col, p,
                               ['%.1f' % (i / 10) for i in idx])))
    for v in ['A', 'B', 'C']:
        p = os.path.join(OUT, '957-clapper-%s.gif' % v)
        names = ['clap-%s-cyan-%03d' % (v, i) for i in range(81)]
        gif(names, p, 114, ms=100, hold=100)
        made.append((p, None))
for p, s in made:
    print(p, s or '')
