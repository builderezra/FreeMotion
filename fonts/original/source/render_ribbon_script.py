#!/usr/bin/env python3
"""Render FM Ribbon Script at display, 48 px and 32 px sizes."""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

HERE=Path(__file__).resolve().parent
REG=HERE/'fonts/fm-ribbon-script-regular.ttf'
BOLD=HERE/'fonts/fm-ribbon-script-bold.ttf'
OUT=HERE/'fm-ribbon-script-preview.png'

im=Image.new('RGB',(2200,1540),'#f6f0e7')
d=ImageDraw.Draw(im)
ink,berry,blue,muted='#241e2b','#8d3551','#294f5b','#746f73'

def line(x,y,s,size,bold=False,colour=ink):
    font=ImageFont.truetype(str(BOLD if bold else REG),size)
    d.text((x,y),s,font=font,fill=colour,anchor='lt')

line(80,47,'FM RIBBON SCRIPT',74,True,berry)
line(80,147,'A fluid, high-contrast original for introductions and end cards',37,False,muted)
d.line((80,220,2120,220),fill='#cdb8b7',width=3)
line(80,263,'Let the story unfold',132,False,ink)
line(80,434,'A little movement changes everything.',85,True,blue)
line(80,580,'ABCDEFGHIJKLMNOPQRSTUVWXYZ',64,False,ink)
line(80,694,'abcdefghijklmnopqrstuvwxyz',64,False,ink)
line(80,805,'0123456789  !?.,:;@#$%&*',67,True,berry)
d.line((80,921,2120,921),fill='#cdb8b7',width=3)
line(80,960,'48 px  The quick brown fox jumps over 27 lazy dogs.',48,False,ink)
line(80,1057,'48 px  Café at 08:42 • make a little magic.',48,True,blue)
line(80,1156,'32 px  The quick brown fox jumps over 27 lazy dogs.',32,False,ink)
line(80,1227,'32 px  Zürich / 20:45 / new beginnings',32,True,berry)
d.line((80,1324,2120,1324),fill='#cdb8b7',width=3)
line(80,1362,'Regular 400 / Bold 700 / 227 mapped characters',31,False,muted)
im.save(OUT)
print(OUT)
