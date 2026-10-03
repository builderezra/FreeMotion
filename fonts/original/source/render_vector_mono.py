#!/usr/bin/env python3
"""Render a specimen at headline, subtitle, and actual 32/48px editor sizes."""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

HERE = Path(__file__).resolve().parent
REGULAR = HERE / 'fonts/fm-vector-mono-regular.ttf'
BOLD = HERE / 'fonts/fm-vector-mono-bold.ttf'
OUT = HERE / 'fm-vector-mono-preview.png'

canvas = Image.new('RGB', (2100, 1540), '#111924')
draw = ImageDraw.Draw(canvas)
ice, cyan, coral, dim = '#edf8fa', '#58d4da', '#f5a078', '#8ba2ad'

def text(x, y, value, size, bold=False, color=ice):
    font = ImageFont.truetype(str(BOLD if bold else REGULAR), size)
    draw.text((x, y), value, font=font, fill=color, anchor='lt')

text(86, 61, 'FM VECTOR MONO', 72, True, cyan)
text(86, 162, 'GEOMETRIC MONOSPACED / ORIGINAL FONT', 32, False, dim)
draw.line((86, 232, 2014, 232), fill='#34505a', width=2)
text(86, 268, 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 66)
text(86, 372, 'abcdefghijklmnopqrstuvwxyz', 66)
text(86, 476, '0123456789  !?.,:;@#$%&*', 66, True, coral)
text(86, 610, 'Create. Edit. Export. Repeat.', 62)
text(86, 710, '01:23:45  +24%  #REELS  / 2026', 62, True)
draw.line((86, 833, 2014, 833), fill='#34505a', width=2)
text(86, 875, '48 PX  THE QUICK BROWN FOX JUMPS OVER 27 LAZY DOGS.', 48, False)
text(86, 966, '48 PX  The quick brown fox jumps over 27 lazy dogs.', 48, True, coral)
text(86, 1061, '32 PX  The quick brown fox jumps over 27 lazy dogs.', 32, False)
text(86, 1127, '32 PX  TITLE CARD  //  CUT 03  //  AUDIO: ON', 32, True, cyan)
draw.line((86, 1211, 2014, 1211), fill='#34505a', width=2)
text(86, 1251, 'Café  •  Málaga  •  São Paulo  •  Zürich  •  Łódź', 42, True, coral)
text(86, 1355, 'Regular / 400    Bold / 700    All glyphs drawn from source geometry', 27, False, dim)
canvas.save(OUT)
print(OUT)
