from PIL import Image,ImageDraw,ImageFont
from pathlib import Path
r=Path(__file__).resolve().parent
im=Image.new('RGB',(1450,640),'white'); d=ImageDraw.Draw(im)
y=15
for stem,name in [('fm-aster-round','FM Aster Round'),('fm-circuit-sans','FM Circuit Sans')]:
 d.text((20,y),name,fill='#a2342a',font=ImageFont.load_default(size=20)); y+=30
 for size in (32,48):
  f=ImageFont.truetype(str(r/'fonts'/f'{stem}-regular.ttf'),size)
  d.text((20,y),f'{size}px   The quick brown fox jumps over 27 lazy dogs.',fill='#17222c',font=f)
  y+=size+16
 y+=16
im.save(r/'preview-32-48.png')
