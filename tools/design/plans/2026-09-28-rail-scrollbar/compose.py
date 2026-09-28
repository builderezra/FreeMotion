#!/usr/bin/env python3
"""Build the two labelled sheets for plan.md from the frames run.sh writes (scratch dir given as argv[1]).

    FM_DSF=2 ./run.sh scene-frames.js $S/f1280.png --width 1280 --height 900 --frames 300,3000,5500,8000,10500,13000,15500,18000
    FM_DSF=2 ./run.sh scene-frames.js $S/f900.png  --width 900  --height 900 --frames 300,3000,5500,8000
    FM_DSF=2 ./run.sh scene-fxb.js $S/fx.png --width 1280 --height 900 --frames 300,2600,4600
    python3 compose.py $S
"""
import os, sys
from PIL import Image, ImageDraw, ImageFont

S = sys.argv[1]
HERE = os.path.dirname(os.path.abspath(__file__))
FONT = '/System/Library/Fonts/Helvetica.ttc'
f_t = ImageFont.truetype(FONT, 30)
f_l = ImageFont.truetype(FONT, 21)
f_s = ImageFont.truetype(FONT, 17)
BG, INK, DIM, REC = (246, 248, 251), (16, 21, 31), (90, 100, 120), (18, 130, 90)


def crop(name, box):   # box in CSS px; frames are 2x
    x, y, w, h = box
    return Image.open(os.path.join(S, name)).crop((x * 2, y * 2, (x + w) * 2, (y + h) * 2))


def sheet_options():
    b1280 = (0, 654, 306, 174)       # printed by scene-frames.js at 1280x900
    b900 = (0, 614, 299, 174)        # …and at 900x900
    panels = [
        ('f1280-300.png', b1280, 'NOW (v17.11)', 'the white bar, on PC and on a Mac with a mouse', DIM),
        ('f1280-3000.png', b1280, 'A · mouse over the row  (RECOMMENDED)', '› appears, soft edge where there is more', REC),
        ('f1280-5500.png', b1280, 'A · after one click on ›', 'moves one page of 4; ‹ appears; middle dot', REC),
        ('f1280-8000.png', b1280, 'A · at the end', '› is gone, only ‹ is left', REC),
        ('f1280-10500.png', b1280, 'B · keep a bar, dark and thin', 'only while the mouse is over the row', DIM),
        ('f1280-13000.png', b1280, 'C · no bar; mouse wheel slides the row', 'catches the panel’s scroll: 24 wheel clicks', DIM),
        ('f1280-15500.png', b1280, 'A2 · the Add menu’s own ‹ • • ›', 'always on; +18px under every row', DIM),
        ('f900-3000.png', b900, 'A at 900px wide', 'same look, narrower PC window', REC),
    ]
    PW = 579
    ims = []
    for f, box, t, sub, col in panels:
        im = crop(f, box)
        im = im.resize((PW, round(im.height * PW / im.width)), Image.LANCZOS)
        ims.append((im, t, sub, col))
    ph = ims[0][0].height
    LH, GAP, TOP = 62, 14, 74
    W = PW * 2 + GAP * 3
    H = TOP + 4 * (LH + ph + GAP) + 10
    out = Image.new('RGB', (W, H), BG)
    d = ImageDraw.Draw(out)
    d.text((GAP, 18), 'Filter rows on a PC: the white bar, and ways to replace it', font=f_t, fill=INK)
    for i, (im, t, sub, col) in enumerate(ims):
        x = GAP + (i % 2) * (PW + GAP)
        y = TOP + (i // 2) * (LH + ph + GAP)
        d.text((x, y + 4), t, font=f_l, fill=col)
        d.text((x, y + 32), sub, font=f_s, fill=DIM)
        out.paste(im, (x, y + LH))
        if col == REC:
            d.rectangle((x - 3, y + LH - 3, x + PW + 2, y + LH + ph + 2), outline=REC, width=3)
    p = os.path.join(HERE, 'rail-options.png')
    out.save(p)
    return p, out.size


def sheet_other_bars():
    W, GAP, LH = 1200, 14, 40
    a = Image.open(os.path.join(S, 'f1280-300.png')).crop((0, 1240, 2560, 1800))
    b = Image.open(os.path.join(S, 'f1280-18000.png')).crop((0, 1240, 2560, 1800))
    iw = W - 2 * GAP
    a = a.resize((iw, round(a.height * iw / a.width)), Image.LANCZOS)
    b = b.resize((iw, round(b.height * iw / b.width)), Image.LANCZOS)
    H = 70 + 2 * (LH + a.height + GAP) + 6
    out = Image.new('RGB', (W, H), BG)
    d = ImageDraw.Draw(out)
    d.text((GAP, 16), 'D (add-on): the OTHER white bars on a PC, and one line that darkens them', font=f_l, fill=INK)
    d.text((GAP, 44), 'the inspector’s up-down bar and the timeline’s sideways bar are white for a different reason', font=f_s, fill=DIM)
    y = 70
    d.text((GAP, y + 10), 'NOW: inspector bar (right of the filters) and timeline bar (bottom) are white', font=f_s, fill=DIM)
    out.paste(a, (GAP, y + LH)); y += LH + a.height + GAP
    d.text((GAP, y + 10), 'D: body:not(.home-open) { color-scheme: dark }  (filter-row bar shown here too; A removes it)', font=f_s, fill=REC)
    out.paste(b, (GAP, y + LH))
    p = os.path.join(HERE, 'other-bars-D.png')
    out.save(p)
    return p, out.size


def sheet_new_row():
    """The effects menu's New row (his 13:54 request) — frames from scene-fxb.js at 1280, 2x."""
    box = (1, 689, 306, 165)
    W, GAP, LH = 1200, 14, 58
    pw = (W - 4 * GAP) // 3
    items = [('fx-300.png', 'NOW', 'a mouse has no way along it', DIM),
             ('fx-2600.png', 'A · mouse over the row', '› appears, soft edge on the right', REC),
             ('fx-4600.png', 'A · after one click on ›', 'two cards on; auto-scroll held 8 s', REC)]
    ims = []
    for f, t, sub, col in items:
        im = crop(f, box)
        ims.append((im.resize((pw, round(im.height * pw / im.width)), Image.LANCZOS), t, sub, col))
    ph = ims[0][0].height
    H = 64 + LH + ph + GAP
    out = Image.new('RGB', (W, H), BG)
    d = ImageDraw.Draw(out)
    d.text((GAP, 16), 'The same fix on the effects menu’s New row (your 13:54 message)', font=f_l, fill=INK)
    for i, (im, t, sub, col) in enumerate(ims):
        x = GAP + i * (pw + GAP)
        d.text((x, 60), t, font=f_l, fill=col)
        d.text((x, 88), sub, font=f_s, fill=DIM)
        out.paste(im, (x, 64 + LH))
        if col == REC:
            d.rectangle((x - 3, 64 + LH - 3, x + pw + 2, 64 + LH + ph + 2), outline=REC, width=3)
    p = os.path.join(HERE, 'new-row.png')
    out.save(p)
    return p, out.size


if __name__ == '__main__':
    print(sheet_options())
    print(sheet_other_bars())
    print(sheet_new_row())
