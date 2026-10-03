#!/usr/bin/env python3
"""Render FM Foundry Slab at title, subtitle, and real editor font sizes."""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

HERE = Path(__file__).resolve().parent
REGULAR = HERE / 'fonts/fm-foundry-slab-regular.ttf'
BOLD = HERE / 'fonts/fm-foundry-slab-bold.ttf'
OUT = HERE / 'fm-foundry-slab-preview.png'

canvas = Image.new('RGB', (2100, 1530), '#f3eee7')
draw = ImageDraw.Draw(canvas)
ink, rust, blue, dim = '#202934', '#b5583e', '#365e72', '#5e6870'

def text(x, y, value, size, bold=False, color=ink):
    font = ImageFont.truetype(str(BOLD if bold else REGULAR), size)
    draw.text((x, y), value, font=font, fill=color, anchor='lt')

text(84, 61, 'FM FOUNDRY SLAB', 72, True, rust)
text(84, 171, 'BROAD INDUSTRIAL SLAB / ORIGINAL FONT', 30, False, dim)
draw.line((84, 238, 2016, 238), fill='#c5b8aa', width=3)
text(84, 273, 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 63)
text(84, 384, 'abcdefghijklmnopqrstuvwxyz', 65)
text(84, 495, '0123456789  !?.,:;@#$%&*', 65, True, blue)
text(84, 641, 'BUILD SOMETHING BOLD.', 80, True)
text(84, 755, 'A title made to last.', 67, False, rust)
draw.line((84, 873, 2016, 873), fill='#c5b8aa', width=3)
text(84, 909, '48 PX  THE QUICK BROWN FOX JUMPS OVER 27 LAZY DOGS.', 48)
text(84, 1007, '48 PX  The quick brown fox jumps over 27 lazy dogs.', 48, True, blue)
text(84, 1104, '32 PX  The quick brown fox jumps over 27 lazy dogs.', 32)
text(84, 1174, '32 PX  CAPTION CARD  /  MATCHDAY  /  03:21', 32, True, rust)
draw.line((84, 1256, 2016, 1256), fill='#c5b8aa', width=3)
text(84, 1291, 'Café  •  Málaga  •  São Paulo  •  Zürich  •  Łódź', 39, True, blue)
text(84, 1392, 'Regular / 400    Bold / 700    Original FreeMotion type design', 28, False, dim)
canvas.save(OUT)
print(OUT)
