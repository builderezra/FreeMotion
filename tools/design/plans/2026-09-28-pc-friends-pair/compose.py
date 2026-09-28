#!/usr/bin/env python3
"""Compose the labelled pictures for plan.md from the frames render.sh wrote (all real app renders at 1280x800 / 900x760 /
1920x1080 with proto.js injected). Usage: python3 compose.py FRAMEDIR OUTDIR"""
import os, sys
from PIL import Image, ImageDraw, ImageFont

SRC, OUT = sys.argv[1], sys.argv[2]
BG = (14, 18, 24)
INK = (235, 240, 245)
DIM = (150, 162, 175)
ACC = (92, 200, 240)
REC = (255, 190, 80)
F = lambda n, bold=False: ImageFont.truetype('/System/Library/Fonts/HelveticaNeue.ttc', n, index=1 if bold else 0)


def im(name):
    return Image.open(os.path.join(SRC, name)).convert('RGB')


def crop1280(name):   # the pair and the cog row, same window in every 1280 frame
    return im(name).crop((520, 0, 1180, 620))


def panel(canvas, img, x, y, w, label, sub=None, colour=INK):
    h = round(img.height * w / img.width)
    canvas.paste(img.resize((w, h), Image.LANCZOS), (x, y + 34))
    d = ImageDraw.Draw(canvas)
    d.text((x, y + 4), label, font=F(21, True), fill=colour)
    if sub:
        d.text((x + d.textlength(label, font=F(21, True)) + 10, y + 7), sub, font=F(17), fill=DIM)
    d.rectangle((x - 1, y + 33, x + w, y + 34 + h), outline=(60, 70, 82))
    return y + 34 + h


W = 1200
# ── comparison.jpg: today, A and B at 1280x800 ─────────────────────────────────────────────────────────────────
pw, gap = 580, 13
xs = [gap, gap * 2 + pw]
ph = round(620 * pw / 660)
H = 96 + 3 * (34 + ph + 26) + 10
c = Image.new('RGB', (W, H), BG)
d = ImageDraw.Draw(c)
d.text((gap, 14), 'PC: the cog opens Canvas settings AND Friends', font=F(30, True), fill=INK)
d.text((gap, 54), 'Real app, 1280×800, the real Friends block (Work with friends on, not sharing). Pick A or B.', font=F(18), fill=DIM)
y = 96
panel(c, crop1280('A-strip-1280-300.png'), xs[0], y, pw, 'Today · closed', 'the cog, and Share beside it')
panel(c, im('today-1280.png').crop((520, 0, 1180, 620)), xs[1], y, pw, 'Today · the cog', 'Canvas only — no Friends')
# the cog and the Share button, ringed on the closed frame (cog 1064..1098, share 1106..1140, y 564..598 at 1280 with the feature on)
s = pw / 660
for cx, lab, col in ((1081, 'cog', ACC), (1123, 'Share', REC)):
    X, Y = xs[0] + (cx - 520) * s, y + 34 + 581 * s
    d.ellipse((X - 17, Y - 17, X + 17, Y + 17), outline=col, width=3)
    d.text((X - 16, Y - 44), lab, font=F(16, True), fill=col)
y += 34 + ph + 26
panel(c, crop1280('A-strip-1280-1300.png'), xs[0], y, pw, 'A · stacked, like the phone', 'on Canvas')
panel(c, crop1280('A-strip-1280-4300.png'), xs[1], y, pw, 'A', 'after the expand button — on Friends')
y += 34 + ph + 26
panel(c, crop1280('B-strip-1280-1300.png'), xs[0], y, pw, 'B · side by side (recommended)', 'on Canvas', colour=REC)
panel(c, crop1280('B-strip-1280-4300.png'), xs[1], y, pw, 'B', 'after the expand button — on Friends', colour=REC)
c.save(os.path.join(OUT, 'comparison.jpg'), quality=86)

# ── A-swap.jpg / B-swap.jpg: closed → Canvas → the flight frozen at 20 / 45 / 70 % → Friends ───────────────────
labels = [('1 · closed', 300), ('2 · the cog opens Canvas', 1300), ('3 · expand pressed: 20%', 2000), ('4 · at 45%', 2600), ('5 · at 70%', 3200), ('6 · landed on Friends', 4300)]
for opt, title, sub in (('A', 'A · stacked — the swap', 'the phone’s flight: the blocks cross, and for a moment the pair lifts off the cog'),
                        ('B', 'B · side by side — the swap', 'the line between them slides; both stay standing on the cog’s row')):
    pw3, g3 = 384, 12
    ph3 = round(620 * pw3 / 660)
    H = 90 + 2 * (34 + ph3 + 18) + 6
    c = Image.new('RGB', (W, H), BG)
    d = ImageDraw.Draw(c)
    d.text((g3, 12), title, font=F(28, True), fill=REC if opt == 'B' else INK)
    d.text((g3, 52), sub + ' · 1280×800, frozen at exact points', font=F(17), fill=DIM)
    for i, (lab, t) in enumerate(labels):
        x = g3 + (i % 3) * (pw3 + g3)
        yy = 90 + (i // 3) * (34 + ph3 + 18)
        # the closed state is the same app for both (the dialog is hidden, so no option's CSS applies); B's own 300 ms frame
        # caught Home's close still fading, so both strips use A's
        panel(c, crop1280('%s-strip-1280-%d.png' % ('A' if t == 300 else opt, t)), x, yy, pw3, lab)
    c.save(os.path.join(OUT, '%s-swap.jpg' % opt), quality=86)

# ── fit.jpg: both options at 900×760 (the suite's frame) and 1920×1080 ───────────────────────────────────────────
pw4, g4 = 285, 10
c = Image.new('RGB', (W, 96 + 2 * (34 + 300 + 20)), BG)
d = ImageDraw.Draw(c)
d.text((g4, 12), 'Do they fit? 900×760 and 1920×1080', font=F(28, True), fill=INK)
d.text((g4, 52), 'Each: on Canvas, then on Friends. 900 is the narrow PC layout (the suite’s frame).', font=F(17), fill=DIM)
y = 96
for size, box in (('900', (130, 0, 900, 700)), ('1920', (1180, 0, 1920, 900))):
    for i, (opt, t, lab) in enumerate((('A', 900, 'A · Canvas'), ('A', 2600, 'A · Friends'), ('B', 900, 'B · Canvas'), ('B', 2600, 'B · Friends'))):
        img = im('%s-sizes-%s-%d.png' % (opt, size, t)).crop(box)
        img = img.resize((pw4, round(img.height * pw4 / img.width)), Image.LANCZOS)
        if img.height > 300:
            img = img.crop((0, 0, pw4, 300))
        x = g4 + i * (pw4 + g4 + 3)
        panel(c, img, x, y, pw4, lab, size, colour=REC if opt == 'B' else INK)
    y += 34 + 300 + 20
c.save(os.path.join(OUT, 'fit.jpg'), quality=86)
print('ok')
