"""Turn the round-5 A/B sheets (shots/r5-<id>-ab.png) into web-size JPEGs at ab/<id>.jpg for the published page."""
import os
from PIL import Image
SITE = os.path.dirname(os.path.abspath(__file__))
IDS = ['blinds', 'dispersion', 'starfield', 'lensblur', 'motionblur', 'counter', 'lensflare', 'crt', 'fliplayer', 'cube', 'fractalridges', 'clouds', 'moshbloom', 'weather']
os.makedirs(os.path.join(SITE, 'ab'), exist_ok=True)
tot = 0
for i in IDS:
    src = os.path.join(SITE, 'shots', f'r5-{i}-ab.png')
    if not os.path.exists(src):
        print('MISSING', src); continue
    im = Image.open(src).convert('RGB')
    w, h = im.size
    if w > 1400:
        im = im.resize((1400, round(h * 1400 / w)), Image.LANCZOS)
    out = os.path.join(SITE, 'ab', f'{i}.jpg')
    im.save(out, 'JPEG', quality=84, optimize=True, progressive=True)
    kb = os.path.getsize(out) // 1024; tot += kb
    print(f'{i:14s} {w}x{h} -> {im.size[0]}x{im.size[1]}  {kb} KB')
print('total', tot, 'KB')
