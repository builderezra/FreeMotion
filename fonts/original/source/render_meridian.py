#!/usr/bin/env python3
"""Render a specimen for the original Meridian Serif family."""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

HERE = Path(__file__).resolve().parent
OUT = HERE / 'fm-meridian-serif-preview.png'
im = Image.new('RGB', (1800, 1550), '#f3f0e8')
d = ImageDraw.Draw(im)
regular = lambda size: ImageFont.truetype(str(HERE / 'fonts/fm-meridian-serif-regular.ttf'), size)
bold = lambda size: ImageFont.truetype(str(HERE / 'fonts/fm-meridian-serif-bold.ttf'), size)
system = ImageFont.truetype('/System/Library/Fonts/Helvetica.ttc', 25)

d.text((95, 55), 'FREEMOTION / ORIGINAL TYPE', font=system, fill='#697071')
d.text((95, 112), 'Meridian', font=regular(226), fill='#192533')
d.text((95, 337), 'SERIF', font=bold(180), fill='#192533')
d.line((95, 575, 1705, 575), fill='#b5b3aa', width=2)
d.text((95, 615), 'The quiet art of motion.', font=regular(80), fill='#263842')
d.text((95, 748), 'Make every frame count.', font=bold(79), fill='#263842')
d.text((95, 905), 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', font=regular(52), fill='#263842')
d.text((95, 990), 'abcdefghijklmnopqrstuvwxyz', font=regular(59), fill='#263842')
d.text((95, 1100), '0123456789  !?.,:;@#$%&', font=regular(62), fill='#263842')
d.line((95, 1220, 1705, 1220), fill='#b5b3aa', width=2)
d.text((95, 1260), 'Regular 400   /   Bold 700', font=system, fill='#697071')
d.text((95, 1317), 'Video titles  •  Editorial cards  •  End frames', font=regular(50), fill='#7c3c42')
im.save(OUT)
print(OUT)
