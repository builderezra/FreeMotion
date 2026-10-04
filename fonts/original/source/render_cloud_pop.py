#!/usr/bin/env python3
"""Render FM Cloud Pop as social titles and at real 32/48px editor sizes."""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

HERE=Path(__file__).resolve().parent
REGULAR=HERE/'fonts/fm-cloud-pop-regular.ttf'
BOLD=HERE/'fonts/fm-cloud-pop-bold.ttf'
OUT=HERE/'fm-cloud-pop-preview.png'

canvas=Image.new('RGB',(2100,1530),'#172231')
draw=ImageDraw.Draw(canvas)
cream,peach,mint,dim='#f8f1e4','#ffac9f','#91ead5','#9eabb8'

def text(x,y,value,size,bold=False,colour=cream):
    face=ImageFont.truetype(str(BOLD if bold else REGULAR),size)
    draw.text((x,y),value,font=face,fill=colour,anchor='lt')

text(84,54,'FM CLOUD POP',80,True,peach)
text(84,173,'SOFT GEOMETRIC DISPLAY / ORIGINAL FONT',30,False,dim)
draw.line((84,238,2016,238),fill='#426073',width=3)
text(84,274,'ABCDEFGHIJKLMNOPQRSTUVWXYZ',62)
text(84,382,'abcdefghijklmnopqrstuvwxyz',64)
text(84,494,'0123456789   !?.,:;@#$%&*',64,True,mint)
text(84,643,'MAKE SOMETHING FUN!',78,True,peach)
text(84,762,'Your next big idea starts here.',60,False)
draw.line((84,870,2016,870),fill='#426073',width=3)
text(84,905,'48 PX  THE QUICK BROWN FOX JUMPS OVER 27 LAZY DOGS.',48)
text(84,1002,'48 PX  The quick brown fox jumps over 27 lazy dogs.',48,True,mint)
text(84,1098,'32 PX  The quick brown fox jumps over 27 lazy dogs.',32)
text(84,1168,'32 PX  HAPPY BIRTHDAY  /  03:21  /  LET’S GO!',32,True,peach)
draw.line((84,1252,2016,1252),fill='#426073',width=3)
text(84,1286,'Café  •  Málaga  •  São Paulo  •  Zürich  •  Łódź',38,True,mint)
text(84,1391,'Regular / 400    Bold / 700    Original FreeMotion type design',28,False,dim)
canvas.save(OUT)
print(OUT)
