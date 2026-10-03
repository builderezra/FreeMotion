#!/usr/bin/env python3
"""Render the Lilt Marker specimen at title and everyday UI sizes."""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

HERE = Path(__file__).resolve().parent
OUT = HERE / 'fm-lilt-marker-preview.png'
im = Image.new('RGB', (1800, 1550), '#f6f4ef')
d = ImageDraw.Draw(im)
regular = lambda size: ImageFont.truetype(str(HERE / 'fonts/fm-lilt-marker-regular.ttf'), size)
bold = lambda size: ImageFont.truetype(str(HERE / 'fonts/fm-lilt-marker-bold.ttf'), size)
system = ImageFont.truetype('/System/Library/Fonts/Helvetica.ttc', 25)

d.text((96, 53), 'FREEMOTION / ORIGINAL TYPE', font=system, fill='#6b706c')
d.text((86, 114), 'Lilt Marker', font=bold(198), fill='#232c35')
d.text((96, 378), 'Good things are in motion.', font=regular(93), fill='#1f4145')
d.line((96, 542, 1704, 542), fill='#d3c9bd', width=2)
d.text((96, 595), 'make something wonderful', font=regular(88), fill='#246876')
d.text((96, 749), 'Your story starts here!', font=bold(92), fill='#b54d41')
d.text((96, 948), 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', font=regular(53), fill='#273037')
d.text((96, 1040), 'abcdefghijklmnopqrstuvwxyz', font=regular(62), fill='#273037')
d.text((96, 1150), '0123456789  !?.,:;@#$%&', font=regular(63), fill='#273037')
d.line((96, 1265, 1704, 1265), fill='#d3c9bd', width=2)
d.text((96, 1301), 'Regular 400   /   Bold 700', font=system, fill='#6b706c')
d.text((96, 1350), '32 px: a legible small label', font=regular(32), fill='#4b6062')
d.text((96, 1408), '48 px: a friendly title sample', font=regular(48), fill='#4b6062')
im.save(OUT)
print(OUT)
