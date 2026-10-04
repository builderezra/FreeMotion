#!/usr/bin/env python3
"""Render FM Signal Pixel at display, 48 px and 32 px sizes."""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

HERE = Path(__file__).resolve().parent
REGULAR = HERE / 'fonts/fm-signal-pixel-regular.ttf'
BOLD = HERE / 'fonts/fm-signal-pixel-bold.ttf'
OUT = HERE / 'fm-signal-pixel-preview.png'

canvas = Image.new('RGB', (2100, 1530), '#141a25')
draw = ImageDraw.Draw(canvas)
ink, cyan, gold, dim = '#e8f3f4', '#73d9e1', '#f5bd73', '#83929f'


def line(x, y, value, size, bold=False, colour=ink):
    face = ImageFont.truetype(str(BOLD if bold else REGULAR), size)
    draw.text((x, y), value, font=face, fill=colour, anchor='lt')


line(84, 57, 'FM SIGNAL PIXEL', 72, True, cyan)
line(84, 176, 'ORIGINAL STEPPED DISPLAY / RETRO TITLES + HUDS', 29, False, dim)
draw.line((84, 235, 2016, 235), fill='#365360', width=3)
line(84, 270, 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 60)
line(84, 374, 'abcdefghijklmnopqrstuvwxyz', 60)
line(84, 475, '0123456789   !?.,:;@#$%&*', 60, True, gold)
line(84, 625, 'READY PLAYER ONE', 84, True, cyan)
line(84, 748, 'Your story starts at 00:42.', 58, False)
draw.line((84, 857, 2016, 857), fill='#365360', width=3)
line(84, 893, '48 PX  THE QUICK BROWN FOX JUMPS OVER 27 LAZY DOGS.', 48)
line(84, 994, '48 PX  The quick brown fox jumps over 27 lazy dogs.', 48, True, gold)
line(84, 1097, '32 PX  The quick brown fox jumps over 27 lazy dogs.', 32)
line(84, 1163, '32 PX  LEVEL 08 / SCORE 12,480 / 03:21', 32, True, cyan)
draw.line((84, 1250, 2016, 1250), fill='#365360', width=3)
line(84, 1291, 'Café • Málaga • São Paulo • Zürich • Łódź', 37, True, gold)
line(84, 1390, 'Regular / 400   Bold / 700   Original FreeMotion type design', 27, False, dim)
canvas.save(OUT)
print(OUT)
