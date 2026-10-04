#!/usr/bin/env python3
"""FM Stormbrush: original dry-brush display study; no source font/outline input."""
from pathlib import Path
import math
import tempfile
from fontTools.fontBuilder import FontBuilder
from fontTools.pens.ttGlyphPen import TTGlyphPen
from fontTools.ttLib import TTFont
from PIL import Image, ImageDraw, ImageFont
from shapely.geometry import Point, Polygon
from shapely.geometry.polygon import orient
from shapely.ops import unary_union

HERE=Path(__file__).resolve().parent
ROOT=HERE.parents[3]

def cubic(a,b,c,d,steps=25):
    return [((1-t)**3*a[0]+3*(1-t)**2*t*b[0]+3*(1-t)*t*t*c[0]+t**3*d[0],
             (1-t)**3*a[1]+3*(1-t)**2*t*b[1]+3*(1-t)*t*t*c[1]+t**3*d[1])
            for t in (i/steps for i in range(steps+1))]

def brush(a,b,c,d,w0,w1,seed,bold=False):
    pts=cubic(a,b,c,d); left=[]; right=[]; n=len(pts)-1
    weight=1.22 if bold else 1
    for i,(x,y) in enumerate(pts):
        t=i/n; before=pts[max(0,i-1)]; after=pts[min(n,i+1)]
        dx=after[0]-before[0];dy=after[1]-before[1];ln=math.hypot(dx,dy) or 1
        base=(w0*(1-t)+w1*t+30*math.sin(math.pi*t))*weight
        grain=12*math.sin(41*t+seed*2.3)+7*math.sin(83*t+seed*.71)
        width=max(8,base+grain)
        nx=-dy/ln;ny=dx/ln
        left.append((x+nx*(width/2+5*math.sin(57*t+seed)),y+ny*(width/2+5*math.sin(57*t+seed))))
        right.append((x-nx*(width/2+5*math.sin(53*t+seed+2)),y-ny*(width/2+5*math.sin(53*t+seed+2))))
    return Polygon(left+right[::-1]).buffer(0)

def design(bold=False):
    glyphs={}
    def p(ch,advance,*strokes):glyphs[ch]=(advance,unary_union(strokes) if strokes else Polygon())
    def b(a,c,d,e,w0=116,w1=22,seed=1):return brush(a,c,d,e,w0,w1,seed,bold)
    def dot(x,y,r):return Point(x,y).buffer(r*(1.12 if bold else 1),resolution=8)
    # Diagonal drive and rough raking tips recur; strokes are specific to each glyph.
    p('S',635,
      b((515,666),(404,817),(122,735),(153,509),46,126,1),
      b((153,509),(195,384),(516,380),(497,190),126,135,2),
      b((497,190),(476,-42),(193,-85),(79,80),135,14,3))
    p('T',660,
      b((82,679),(205,738),(420,764),(596,715),88,19,4),
      b((354,736),(335,525),(269,196),(269,-17),21,132,5))
    p('O',700,
      b((482,670),(261,809),(74,643),(104,384),20,141,6),
      b((104,384),(120,91),(367,-89),(534,147),141,111,7),
      b((534,147),(623,337),(581,580),(482,670),111,12,8))
    p('R',690,
      b((129,5),(152,227),(184,518),(159,753),136,24,9),
      b((150,703),(295,799),(530,698),(519,557),88,92,10),
      b((519,557),(523,427),(336,355),(164,392),92,68,11),
      b((351,360),(457,298),(524,99),(612,-22),35,131,12))
    p('M',880,
      b((91,0),(114,212),(191,532),(158,750),140,20,13),
      b((160,733),(274,597),(333,352),(429,289),23,116,14),
      b((430,293),(511,429),(633,715),(718,737),115,18,15),
      b((719,739),(746,511),(712,181),(783,-21),20,136,16))
    p('F',625,
      b((111,3),(134,252),(173,533),(147,752),138,22,17),
      b((153,705),(270,771),(440,763),(551,709),88,14,18),
      b((165,402),(270,444),(411,405),(502,424),68,14,19))
    p('I',350,
      b((168,2),(184,229),(184,538),(171,749),136,18,20),
      b((83,702),(146,749),(222,730),(291,692),48,12,21),
      b((92,16),(169,-25),(232,-9),(285,45),68,12,22))
    p('E',635,
      b((111,5),(132,271),(184,543),(145,747),137,21,23),
      b((153,704),(277,769),(451,757),(548,701),87,13,24),
      b((166,398),(264,434),(407,394),(503,418),69,14,25),
      b((117,22),(232,-36),(454,-29),(569,59),85,16,26))
    p('W',910,
      b((76,742),(121,512),(137,153),(228,-24),17,123,27),
      b((228,-24),(315,192),(348,441),(452,471),123,26,28),
      b((452,471),(511,365),(561,123),(651,-23),26,121,29),
      b((651,-23),(750,195),(790,521),(839,741),121,16,30))
    p('L',598,
      b((132,3),(151,245),(180,529),(153,745),139,19,31),
      b((128,20),(259,-43),(462,-30),(552,67),85,14,32))
    p('D',700,
      b((119,5),(139,227),(181,527),(151,747),139,20,33),
      b((160,706),(331,802),(574,676),(590,398),88,125,34),
      b((590,398),(619,141),(415,-71),(129,16),125,115,35))
    p('N',715,
      b((111,0),(132,225),(155,526),(133,743),140,18,36),
      b((150,713),(289,536),(423,140),(587,11),22,135,37),
      b((587,11),(591,237),(617,511),(586,742),135,15,38))
    p('A',700,
      b((77,-20),(182,220),(280,553),(360,748),146,16,49),
      b((359,746),(407,552),(512,187),(629,-21),17,142,50),
      b((210,271),(319,320),(436,332),(550,257),88,16,51))
    p('B',680,
      b((120,-17),(152,232),(169,530),(140,748),143,19,52),
      b((156,705),(300,777),(522,715),(533,573),83,93,53),
      b((533,573),(535,434),(340,378),(163,395),93,56,54),
      b((170,387),(349,454),(568,377),(560,203),79,124,55),
      b((560,203),(553,-4),(294,-78),(125,33),124,18,56))
    p('C',655,
      b((547,643),(394,815),(124,743),(92,454),23,129,57),
      b((92,454),(57,186),(301,-98),(565,83),129,12,58))
    p('G',690,
      b((554,646),(411,821),(137,741),(97,452),21,130,59),
      b((97,452),(53,154),(282,-92),(548,101),130,106,60),
      b((547,100),(582,187),(575,297),(555,362),106,23,61),
      b((385,348),(455,376),(529,366),(620,330),77,12,62))
    p('H',727,
      b((118,-11),(143,230),(175,534),(145,747),143,19,63),
      b((588,-13),(603,223),(598,530),(578,750),141,18,64),
      b((159,376),(299,439),(447,436),(593,382),75,16,65))
    p('J',535,
      b((425,745),(464,479),(448,125),(342,-17),19,137,66),
      b((342,-17),(229,-112),(94,-11),(72,132),137,11,67))
    p('K',730,
      b((121,-13),(143,225),(174,534),(148,749),143,19,68),
      b((576,741),(476,640),(334,447),(162,351),19,120,69),
      b((325,433),(406,308),(536,116),(635,-23),38,141,70))
    p('P',648,
      b((128,-15),(149,220),(175,519),(141,750),143,18,71),
      b((152,706),(329,793),(543,704),(551,531),83,119,72),
      b((551,531),(539,324),(327,303),(161,384),119,14,73))
    p('Q',728,
      b((489,672),(288,807),(82,611),(111,345),24,139,74),
      b((111,345),(137,60),(401,-81),(549,176),139,105,75),
      b((549,176),(639,375),(579,619),(489,672),105,11,76),
      b((413,132),(496,64),(579,-46),(648,-83),19,123,77))
    p('U',704,
      b((108,744),(111,529),(111,229),(227,43),18,133,78),
      b((227,43),(385,-99),(578,8),(589,203),133,113,79),
      b((589,203),(608,434),(595,605),(582,746),113,16,80))
    p('V',681,
      b((87,741),(150,558),(231,235),(328,-30),18,143,81),
      b((328,-30),(453,181),(571,527),(615,748),143,15,82))
    p('X',687,
      b((92,735),(221,576),(437,183),(602,-29),18,144,83),
      b((599,744),(515,563),(260,173),(94,-20),18,141,84))
    p('Y',663,
      b((80,739),(158,583),(257,407),(334,362),17,113,85),
      b((587,744),(500,554),(411,397),(334,362),18,110,86),
      b((334,370),(330,216),(298,80),(287,-27),29,134,87))
    p('Z',653,
      b((84,703),(222,765),(444,758),(579,703),85,17,88),
      b((561,718),(426,533),(205,165),(94,27),19,139,89),
      b((95,27),(242,-43),(448,-28),(584,43),83,14,90))
    p(' ',290)
    p('!',305,b((158,220),(190,407),(188,605),(164,744),133,13,39),dot(165,36,45))
    p('?',607,b((82,576),(147,823),(505,804),(510,590),45,94,41),
      b((510,590),(489,415),(286,403),(297,225),94,23,42),
      dot(307,32,46))
    p('.' ,306,dot(154,37,45))
    # Draw a visible fallback rather than silently leaving an unsupported letter blank.
    p('\ufffd',620,
      b((68,0),(67,240),(67,515),(68,745),35,35,45),
      b((68,745),(212,746),(395,746),(553,745),35,35,46),
      b((553,745),(554,515),(554,235),(553,0),35,35,47),
      b((553,0),(394,0),(216,0),(68,0),35,35,48))
    return glyphs

def contour(shape):
    pen=TTGlyphPen(None)
    parts=[shape] if isinstance(shape,Polygon) else list(shape.geoms) if hasattr(shape,'geoms') else []
    for piece in parts:
        if not isinstance(piece,Polygon) or piece.is_empty:continue
        piece=orient(piece,sign=-1)
        for ring in [piece.exterior,*piece.interiors]:
            pts=list(ring.coords)[:-1]
            if len(pts)<3:continue
            pen.moveTo(tuple(map(round,pts[0])))
            for q in pts[1:]:pen.lineTo(tuple(map(round,q)))
            pen.closePath()
    return pen.glyph()

def build(style):
    g=design(style=='Bold')
    name=lambda ch: '.notdef' if ch=='\ufffd' else 'space' if ch==' ' else ch if ch.isalnum() else 'uni%04X'%ord(ch)
    fb=FontBuilder(1000,isTTF=True)
    fb.setupGlyphOrder(['.notdef']+[name(ch) for ch in g if ch!='\ufffd'])
    fb.setupCharacterMap({ord(ch):name(ch) for ch in g if ch!='\ufffd'})
    fb.setupGlyf({name(ch):contour(shape) for ch,(_,shape) in g.items()})
    fb.setupHorizontalMetrics({name(ch):(a,round(shape.bounds[0]) if not shape.is_empty else 0) for ch,(a,shape) in g.items()})
    fb.setupHorizontalHeader(ascent=1030,descent=-260,lineGap=0)
    fb.setupNameTable({'familyName':'FM Stormbrush','styleName':style,'uniqueFontIdentifier':'FM Stormbrush proof '+style,
        'fullName':'FM Stormbrush '+style,'psName':'FMStormbrush-'+style,'version':'Version 0.100'})
    fb.setupOS2(version=4,fsType=0,sTypoAscender=1030,sTypoDescender=-260,sTypoLineGap=0,
        usWinAscent=1030,usWinDescent=260,sCapHeight=750,usWeightClass=700 if style=='Bold' else 400,
        fsSelection=0x20 if style=='Bold' else 0x40)
    fb.setupPost(italicAngle=0,underlinePosition=-140,underlineThickness=70);fb.setupMaxp()
    f=fb.font;f.recalcTimestamp=False;f['head'].macStyle=1 if style=='Bold' else 0
    f['head'].created=f['head'].modified=3873903662
    path=HERE/('fm-stormbrush-'+style.lower()+'.ttf');f.save(path);return path

def specimen(regular,bold):
    img=Image.new('RGB',(1450,1290),'#11120f');d=ImageDraw.Draw(img)
    label=ImageFont.truetype('/System/Library/Fonts/Supplemental/Arial.ttf',22)
    d.text((48,24),'FM STORMBRUSH / original dry-brush proof',font=label,fill='#a4a498')
    for top,size,path,phrase in [(107,96,bold,'STORM FIRE'),(300,64,regular,'WILD MOTION'),
                                  (450,48,bold,'FIRE STORM'),(560,32,regular,'STORM FIRE'),
                                  (635,24,regular,'WILD MOTION')]:
        d.text((48,top-29),f'{size} px / '+('Bold' if path==bold else 'Regular'),font=label,fill='#a4a498')
        d.text((48,top+10),phrase,font=ImageFont.truetype(path,size),fill='#f0e7cf')
    d.text((48,780),'DRAWN CAPITALS / 34 px regular',font=label,fill='#a4a498')
    d.text((48,829),'S T O R M F I E W L D N ! ? .',font=ImageFont.truetype(regular,34),fill='#f6b879')
    d.text((48,912),'DRAWN CAPITALS / 34 px bold',font=label,fill='#a4a498')
    d.text((48,959),'S T O R M F I E W L D N ! ? .',font=ImageFont.truetype(bold,34),fill='#f6b879')
    d.text((48,1053),'COMPLETE CAPITAL ROWS / 34 px regular',font=label,fill='#a4a498')
    d.text((48,1100),'A B C D E F G H I J K L M',font=ImageFont.truetype(regular,34),fill='#c7dbee')
    d.text((48,1164),'N O P Q R S T U V W X Y Z',font=ImageFont.truetype(regular,34),fill='#c7dbee')
    img.save(HERE/'specimen.png')
    comparison=Image.new('RGB',(1450,510),'#f2ede1');c=ImageDraw.Draw(comparison)
    c.text((48,20),'ACTUAL-SIZE COMPARISON / STORM FIRE',font=label,fill='#56636b')
    with tempfile.TemporaryDirectory(prefix='stormbrush-comparison-') as tmp:
        rivals=[('FM Lilt Marker','fm-lilt-marker-bold.woff2'),('FM Blackthorn','fm-blackthorn-bold.woff2'),('FM Reed','fm-reed-bold.woff2')]
        rows=[('FM Stormbrush',bold)]
        for title,file in rivals:
            out=Path(tmp)/(file+'.ttf');f=TTFont(ROOT/'fonts'/'original'/file);f.flavor=None;f.save(out);rows.append((title,out))
        for i,(title,path) in enumerate(rows):
            y=75+i*100;c.text((48,y),title+' / 48 px',font=label,fill='#56636b')
            c.text((390,y-12),'STORM FIRE',font=ImageFont.truetype(path,48),fill='#152128')
    comparison.save(HERE/'comparison.png')

if __name__=='__main__':
    regular,bold=build('Regular'),build('Bold');specimen(regular,bold)
    print('Built FM Stormbrush proof Regular/Bold and specimen')
