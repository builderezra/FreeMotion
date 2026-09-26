"""compose.py OUT TITLE Y0 Y1 FW file:label file:label ...   (Y0/Y1 in CSS px, frames are DPR-2 PNGs)"""
import sys
from PIL import Image, ImageDraw, ImageFont
out, title, y0, y1, fw, cols = sys.argv[1], sys.argv[2], float(sys.argv[3]), float(sys.argv[4]), int(sys.argv[5]), int(sys.argv[6])
items = [a.split(':', 1) for a in sys.argv[7:]]
def font(sz):
    for p in ['/System/Library/Fonts/Supplemental/Arial Bold.ttf', '/System/Library/Fonts/Helvetica.ttc', '/Library/Fonts/Arial.ttf']:
        try: return ImageFont.truetype(p, sz)
        except Exception: pass
    return ImageFont.load_default()
F, FT = font(20), font(24)
tiles = []
for f, lab in items:
    im = Image.open(f).convert('RGB')
    dpr = im.width / 380 if im.width < 900 else im.width / 440
    dpr = 2
    c = im.crop((0, int(y0 * dpr), im.width, int(y1 * dpr)))
    h = round(c.height * fw / c.width)
    tiles.append((c.resize((fw, h), Image.LANCZOS), lab))
gap, head, lab_h = 12, 46, 30
rows = (len(tiles) + cols - 1) // cols
th = max(t.height for t, _ in tiles)
W = cols * fw + (cols + 1) * gap
H = head + rows * (lab_h + th + gap)
S = Image.new('RGB', (W, H), (245, 246, 248))
d = ImageDraw.Draw(S)
d.text((gap, 10), title, fill=(20, 24, 32), font=FT)
for i, (t, lab) in enumerate(tiles):
    r, c = divmod(i, cols)
    x = gap + c * (fw + gap); y = head + r * (lab_h + th + gap)
    d.text((x + 2, y + 2), lab, fill=(40, 44, 52), font=F)
    S.paste(t, (x, y + lab_h))
S.save(out)
print(out, S.size)
