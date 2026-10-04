#!/usr/bin/env python3
"""Render FM Blackthorn with native 32 px and 48 px samples."""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

HERE=Path(__file__).resolve().parent
REG=HERE/'fonts/fm-blackthorn-regular.ttf'
BOLD=HERE/'fonts/fm-blackthorn-bold.ttf'
OUT=HERE/'fm-blackthorn-preview.png'

im=Image.new('RGB',(2200,1630),'#f4ecd7')
d=ImageDraw.Draw(im)
ink,red,muted='#211b1b','#8b342c','#71665d'

def line(x,y,s,size,bold=False,colour=ink):
    font=ImageFont.truetype(str(BOLD if bold else REG),size)
    d.text((x,y),s,font=font,fill=colour,anchor='lt')

line(76,47,'FM BLACKTHORN',80,True,red)
line(80,154,'BROAD PEN  /  BROKEN ARCHES  /  ORIGINAL DRAWING',29,False,muted)
d.line((76,223,2121,223),fill='#bdafa0',width=3)
line(76,260,'A NEW CHAPTER',132,False)
line(76,432,'The midnight gathering',101,True,red)
line(77,587,'ABCDEFGHIJKLMNOPQRSTUVWXYZ',65)
line(77,701,'abcdefghijklmnopqrstuvwxyz',65,True)
line(77,817,'0123456789  !?.,:;@#$%&*',68,True)
d.line((76,942,2121,942),fill='#bdafa0',width=3)
line(76,984,'48 PX  The quick brown fox jumps over 27 lazy dogs.',48)
line(76,1077,'48 PX  Café at 08:42 • the picture begins.',48,True,red)
line(76,1175,'32 PX  The quick brown fox jumps over 27 lazy dogs.',32)
line(76,1252,'32 PX  Zürich / 20:45 / opening night',32,True,red)
line(76,1323,'32 PX  B / 8     6 / a     BLACKTHORN 06:48',32,True)
d.line((76,1412,2121,1412),fill='#bdafa0',width=3)
line(76,1450,'Regular 400 / Bold 700 / 234 mapped characters',31,False,muted)
line(76,1522,'A display face for titles, chapter cards and high-contrast captions',29,False,muted)
im.save(OUT)
print(OUT)
