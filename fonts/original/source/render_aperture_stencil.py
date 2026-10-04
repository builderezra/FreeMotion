#!/usr/bin/env python3
"""Display-size and small-size specimen for the original stencil family."""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

HERE=Path(__file__).resolve().parent
REG=HERE/'fonts/fm-aperture-stencil-regular.ttf'
BOLD=HERE/'fonts/fm-aperture-stencil-bold.ttf'
OUT=HERE/'fm-aperture-stencil-preview.png'

im=Image.new('RGB',(2200,1510),'#10171b')
d=ImageDraw.Draw(im)
white,teal,gold,dim='#f2f4ec','#6fe4ce','#e7b978','#81969b'

def line(x,y,s,size,bold=False,colour=white):
    font=ImageFont.truetype(str(BOLD if bold else REG),size)
    d.text((x,y),s,font=font,fill=colour,anchor='lt')

line(80,54,'FM APERTURE STENCIL',68,True,teal)
line(80,161,'OPEN-COUNTER INDUSTRIAL DISPLAY / ORIGINAL SMALL-CAP LOWERCASE',28,False,dim)
d.line((80,223,2110,223),fill='#355459',width=3)
line(80,258,'ABCDEFGHIJKLMNOPQRSTUVWXYZ',66)
line(80,370,'abcdefghijklmnopqrstuvwxyz',66)
line(80,480,'0123456789  !?.,:;@#$%&*',66,True,gold)
line(80,625,'CUT TO THE CHASE',110,True,teal)
line(80,775,'Tonight • 20:45 • Zürich',67)
d.line((80,894,2110,894),fill='#355459',width=3)
line(80,938,'48 PX  THE QUICK BROWN FOX JUMPS OVER 27 LAZY DOGS.',48)
line(80,1036,'48 PX  The quick brown fox jumps over 27 lazy dogs.',48,True,gold)
line(80,1134,'32 PX  The quick brown fox jumps over 27 lazy dogs.',32)
line(80,1208,'32 PX  CAFÉ / 08:42 / NORTH PLATFORM',32,True,teal)
d.line((80,1286,2110,1286),fill='#355459',width=3)
line(80,1325,'Regular 400 / Bold 700 / 223 mapped characters',30,False,dim)
im.save(OUT)
print(OUT)
