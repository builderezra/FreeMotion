"""#482 polish batch 3 (tone review fixes) — stack a before/after pair of panel screenshots into one phone-width picture.
Usage: python3 tools/design/482/polish3/tone/pair.py basstreble-fresh eq3-fresh
Reads tools/design/482/polish3/panel-<tag>-390-before.jpg (panel.py with SUFFIX=-before, on a server of the build as
reviewed) and panel-<tag>-390.jpg (this tree), and writes panel-<tag>-390-pair.jpg: the first build on top, the fix
under it, each with a one-line caption. 780 px wide (390 CSS at 2x) and under 3x as tall as wide."""
import os, sys
from PIL import Image, ImageDraw, ImageFont
HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, '..')
CAP = {'basstreble-fresh': ('First build — Bass at and Treble at look live (they do nothing)',
                            'Fixed — they wait, and say so, until Bass or Treble moves'),
       'eq3-fresh': ('First build — the corners look live (they do nothing)',
                     'Fixed — each names the band it waits for')}
try:
    FONT = ImageFont.truetype('/System/Library/Fonts/SFNS.ttf', 25)
except Exception:
    FONT = ImageFont.load_default()
for tag in sys.argv[1:]:
    a = Image.open(os.path.join(OUT, 'panel-%s-390-before.jpg' % tag)).convert('RGB')
    b = Image.open(os.path.join(OUT, 'panel-%s-390.jpg' % tag)).convert('RGB')
    W, capH, gap = max(a.width, b.width), 64, 18
    im = Image.new('RGB', (W, capH + a.height + gap + capH + b.height), (15, 17, 23))
    d = ImageDraw.Draw(im)
    top, bot = CAP[tag]
    d.text((24, 20), top, fill=(174, 181, 196), font=FONT)
    im.paste(a, (0, capH))
    y = capH + a.height + gap
    d.text((24, y + 20), bot, fill=(79, 209, 165), font=FONT)
    im.paste(b, (0, y + capH))
    assert im.height < 3 * im.width, (tag, im.size)
    p = os.path.join(OUT, 'panel-%s-390-pair.jpg' % tag)
    im.save(p, quality=88)
    print(p, im.size)
