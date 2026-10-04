#!/usr/bin/env python3
"""Render FM Palais Deco with actual 32 px and 48 px samples."""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

HERE=Path(__file__).resolve().parent
REG=HERE/'fonts/fm-palais-deco-regular.ttf'
BOLD=HERE/'fonts/fm-palais-deco-bold.ttf'
OUT=HERE/'fm-palais-deco-preview.png'

im=Image.new('RGB',(2200,1540),'#101c25')
d=ImageDraw.Draw(im)
gold,white,teal,dim='#efd093','#f0ede3','#75c6bb','#8ca0a3'

def line(x,y,s,size,bold=False,colour=white):
    font=ImageFont.truetype(str(BOLD if bold else REG),size)
    d.text((x,y),s,font=font,fill=colour,anchor='lt')

line(78,51,'FM PALAIS DECO',73,True,gold)
line(80,145,'ENGRAVED ARCHES  /  A NEW ORIGINAL DISPLAY FACE',31,False,dim)
d.line((78,220,2120,220),fill='#42626b',width=3)
line(78,260,'MIDNIGHT',145,False,white)
line(78,440,'CITY LIGHTS',126,True,gold)
line(78,619,'ABCDEFGHIJKLMNOPQRSTUVWXYZ',64,False,white)
line(78,737,'abcdefghijklmnopqrstuvwxyz',64,False,teal)
line(78,854,'0123456789  !?.,:;@#$%&*',65,True,gold)
d.line((78,972,2120,972),fill='#42626b',width=3)
line(78,1014,'48 PX  THE QUICK BROWN FOX JUMPS OVER 27 LAZY DOGS.',48)
line(78,1107,'48 PX  Café at 08:42 • the picture begins.',48,True,teal)
line(78,1202,'32 PX  The quick brown fox jumps over 27 lazy dogs.',32)
line(78,1276,'32 PX  Zürich / 20:45 / opening night',32,True,gold)
d.line((78,1364,2120,1364),fill='#42626b',width=3)
line(78,1402,'Regular 400 / Bold 700 / 227 mapped characters',31,False,dim)
im.save(OUT)
print(OUT)
