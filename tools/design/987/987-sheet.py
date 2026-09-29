#!/usr/bin/env python3
"""queue 987 — THROWAWAY: composes tools/design/987/987-options.png from the shots 987-proto.js produced.
Row 1: the phone (390x844, real app) for Today / A / B / C. Row 2: the PC notes card (1280 wide), cropped at 1:1.
Row 3: the recommended option, the whole PC screen, so the faces chip on the video and the faces on the notes are
seen together."""
import os
from PIL import Image, ImageDraw, ImageFont

D = os.path.dirname(os.path.abspath(__file__))
HN = '/System/Library/Fonts/HelveticaNeue.ttc'
def font(size, bold=False):
    return ImageFont.truetype(HN, size, index=1 if bold else 0)

BG, INK, DIM, REC = (18, 21, 27), (238, 240, 244), (160, 168, 180), (79, 209, 139)
COL, GAP, PAD = 420, 28, 40
W = PAD * 2 + COL * 4 + GAP * 3
OPTS = [
    ('now', 'Today', 'No author', 'Notes already sync to everyone in a live session, but nothing says who wrote which one.'),
    ('A', 'A', 'Dot + name', 'Clearest: the name is written out. Costs an extra line on every note, so the list grows.'),
    ('B', 'B', 'Colour stripe', 'Quietest and costs no space, but it is colour alone: you have to remember who is orange.'),
    ('C', 'C', 'Their face', 'The same face as the people chip on the video and in Comments; the letter still says who when two colours look alike.'),
]
RECOMMENDED = 'C'

def wrap(draw, text, f, width):
    words, lines, cur = text.split(), [], ''
    for w in words:
        t = (cur + ' ' + w).strip()
        if draw.textlength(t, font=f) <= width: cur = t
        else: lines.append(cur); cur = w
    if cur: lines.append(cur)
    return lines

# the PC crops: the card region, the same box for all four so they line up
PC_BOX = (836, 120, 1280, 566)

phones = {k: Image.open(os.path.join(D, 'phone-%s.png' % k)).convert('RGB') for k, *_ in OPTS}
pcs = {k: Image.open(os.path.join(D, 'pc-%s.png' % k)).convert('RGB') for k, *_ in OPTS}
ph_h = round(phones['now'].height * COL / phones['now'].width)
crop_w = PC_BOX[2] - PC_BOX[0]; crop_h = PC_BOX[3] - PC_BOX[1]
pc_h = round(crop_h * COL / crop_w)
full = pcs[RECOMMENDED]
full_w = W - PAD * 2
full_h = round(full.height * full_w / full.width)

f_title, f_sub = font(40, True), font(20)
f_lab, f_name, f_why, f_row = font(30, True), font(22, True), font(18), font(17, True)
HEAD = 172
LAB = 150
H = HEAD + 34 + LAB + ph_h + 30 + 34 + pc_h + 50 + 34 + full_h + PAD
sheet = Image.new('RGB', (W, H), BG)
d = ImageDraw.Draw(sheet)
d.text((PAD, 34), '#987 · who left each note, in their colour', font=f_title, fill=INK)
d.text((PAD, 90), 'A live session with three people: Ezra (purple, the owner), Sam (orange), Mia (lime). The real Notes panel, real app, fake people, no network.', font=f_sub, fill=DIM)
d.text((PAD, 118), 'Comments already show a face + name in the person\'s colour. Notes are the gap: they sync, but carry no author.', font=f_sub, fill=DIM)

y = HEAD
d.text((PAD, y), 'PHONE · 390 × 844', font=f_row, fill=DIM)
y += 34
for i, (k, letter, name, why) in enumerate(OPTS):
    x = PAD + i * (COL + GAP)
    rec = k == RECOMMENDED
    d.text((x, y), letter, font=f_lab, fill=REC if rec else INK)
    lx = x + d.textlength(letter, font=f_lab) + 12
    d.text((lx, y + 7), name, font=f_name, fill=INK)
    if rec:
        tx = lx + d.textlength(name, font=f_name) + 12
        tw = d.textlength('Recommended', font=f_row) + 20
        d.rounded_rectangle((tx, y + 4, tx + tw, y + 34), radius=15, fill=REC)
        d.text((tx + 10, y + 10), 'Recommended', font=f_row, fill=(10, 30, 18))
    for j, line in enumerate(wrap(d, why, f_why, COL)[:4]):
        d.text((x, y + 48 + j * 24), line, font=f_why, fill=DIM)
    img = phones[k].resize((COL, ph_h), Image.LANCZOS)
    sheet.paste(img, (x, y + LAB))
    if rec:
        d.rounded_rectangle((x - 6, y + LAB - 6, x + COL + 6, y + LAB + ph_h + 6), radius=10, outline=REC, width=4)
y += LAB + ph_h + 30

d.text((PAD, y), 'PC · 1280 wide, the Notes card (about actual size)', font=f_row, fill=DIM)
y += 34
for i, (k, *_rest) in enumerate(OPTS):
    x = PAD + i * (COL + GAP)
    img = pcs[k].crop(PC_BOX).resize((COL, pc_h), Image.LANCZOS)
    sheet.paste(img, (x, y))
    if k == RECOMMENDED:
        d.rounded_rectangle((x - 6, y - 6, x + COL + 6, y + pc_h + 6), radius=10, outline=REC, width=4)
y += pc_h + 50

d.text((PAD, y), 'C on the whole PC screen: the faces on the video (top left) are the faces on the notes', font=f_row, fill=DIM)
y += 34
sheet.paste(full.resize((full_w, full_h), Image.LANCZOS), (PAD, y))

out = os.path.join(D, '987-options.png')
sheet.save(out)
print(out, sheet.size, 'ratio %.2f' % (sheet.height / sheet.width))
