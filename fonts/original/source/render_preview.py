#!/usr/bin/env python3
from PIL import Image, ImageDraw, ImageFont
from pathlib import Path
ROOT=Path(__file__).resolve().parent
W,H=1800,2000
im=Image.new('RGB',(W,H),'#f4f0e8')
d=ImageDraw.Draw(im)
label=ImageFont.load_default(size=30)
small=ImageFont.load_default(size=23)
y=70
for stem,name in [('fm-aster-round','FM Aster Round'),('fm-circuit-sans','FM Circuit Sans')]:
    d.text((90,y),name,fill='#42535d',font=label); y+=58
    regular=ImageFont.truetype(str(ROOT/'fonts'/f'{stem}-regular.ttf'),80)
    bold=ImageFont.truetype(str(ROOT/'fonts'/f'{stem}-bold.ttf'),86)
    small_font=ImageFont.truetype(str(ROOT/'fonts'/f'{stem}-regular.ttf'),54)
    d.text((90,y),'ABCDEFGHIJKLMNOPQRSTUVWXYZ',font=regular,fill='#1e2430'); y+=105
    d.text((90,y),'abcdefghijklmnopqrstuvwxyz',font=regular,fill='#1e2430'); y+=105
    d.text((90,y),'0123456789  !?.,:;@#$%&',font=regular,fill='#1e2430'); y+=105
    d.text((90,y),'The quick brown fox jumps over 27 lazy dogs.',font=small_font,fill='#1e2430'); y+=88
    d.text((90,y),'Hamburgefontsiv  Áéñøü  2026',font=bold,fill='#8d342f'); y+=130
    d.line((90,y,1710,y),fill='#c7c0b5',width=2); y+=56
im.crop((0,0,W,min(H,y))).save(ROOT/'preview.png')
print(ROOT/'preview.png')
