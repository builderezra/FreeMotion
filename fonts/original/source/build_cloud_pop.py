#!/usr/bin/env python3
"""Draw FM Cloud Pop, a broad soft display face for playful motion titles.

Every contour is generated from the letter paths below. This file reads no
other font, glyph outline or metrics. Install requirements.txt and run it.
"""
from __future__ import annotations

import math
import os
import tempfile
from pathlib import Path

from fontTools.feaLib.builder import addOpenTypeFeaturesFromString
from fontTools.fontBuilder import FontBuilder
from fontTools.pens.ttGlyphPen import TTGlyphPen
from shapely.geometry import GeometryCollection, LineString, MultiPolygon, Point, Polygon
from shapely.geometry.polygon import orient
from shapely.ops import unary_union

HERE=Path(__file__).resolve().parent
DEST=HERE.parent
TTF_DEST=HERE/'fonts'
CREATED=3873903662


def bez(a,b,c,d,n=34):
    return [((1-t)**3*a[0]+3*(1-t)**2*t*b[0]+3*(1-t)*t*t*c[0]+t**3*d[0],
             (1-t)**3*a[1]+3*(1-t)**2*t*b[1]+3*(1-t)*t*t*c[1]+t**3*d[1])
            for t in (i/n for i in range(n+1))]


def join(*paths):
    out=[]
    for path in paths: out.extend(path if not out else path[1:])
    return out


def ellipse(cx,cy,rx,ry,start=0,stop=360,n=80):
    return [(cx+rx*math.cos(math.radians(start+(stop-start)*i/n)),
             cy+ry*math.sin(math.radians(start+(stop-start)*i/n))) for i in range(n+1)]


def draw(weight):
    w=weight
    slim=w*.81
    glyphs={}

    def stroke(points,width=w,closed=False):
        if closed and points[0]!=points[-1]: points=[*points,points[0]]
        return LineString(points).buffer(width/2,cap_style=1,join_style=1,quad_segs=14)

    def loop(cx,cy,rx,ry,width=w):
        return stroke(ellipse(cx,cy,rx,ry),width,closed=True)

    def arc(cx,cy,rx,ry,start,stop,width=w):
        return stroke(ellipse(cx,cy,rx,ry,start,stop),width)

    def dot(x,y,r=35): return Point(x,y).buffer(r,quad_segs=14)

    def put(ch,advance,*forms):
        glyphs[ch]=(advance,unary_union([f for f in forms if not f.is_empty]) if forms else GeometryCollection())

    # Cushion-like caps: upright, consistent round terminals and generous
    # counters. This construction has none of Lilt's handwritten irregularity.
    put('A',770,stroke([(120,5),(380,710),(650,5)]),stroke([(211,236),(549,236)],slim))
    put('B',725,stroke([(148,5),(148,710)]),
        stroke(join(bez((149,707),(575,747),(601,423),(429,373)),
                    bez((429,373),(638,345),(632,-22),(147,5))),w*.89))
    put('C',760,arc(374,355,249,348,45,316))
    put('D',775,stroke([(150,5),(150,710),(374,710)]),
        stroke(join(bez((374,710),(633,725),(655,558),(655,360)),
                    bez((655,360),(655,148),(634,-16),(150,5))),w*.92))
    put('E',685,stroke([(570,710),(150,710),(150,5),(570,5)]),
        stroke([(150,360),(497,360)],slim))
    put('F',660,stroke([(150,5),(150,710),(570,710)]),
        stroke([(150,360),(482,360)],slim))
    put('G',785,arc(376,355,250,348,46,318),
        stroke([(399,328),(621,328),(621,107)],slim))
    put('H',790,stroke([(145,710),(145,5)]),stroke([(645,710),(645,5)]),
        stroke([(145,360),(645,360)],slim))
    put('I',365,stroke([(183,710),(183,5)]))
    put('J',680,stroke([(550,710),(550,172)]),
        stroke(bez((550,172),(548,-61),(211,-66),(135,161))))
    put('K',750,stroke([(148,710),(148,5)]),
        stroke([(615,705),(164,308),(625,5)],w*.91))
    put('L',660,stroke([(150,710),(150,5),(560,5)]))
    put('M',910,stroke([(124,5),(124,710),(455,272),(785,710),(785,5)]))
    put('N',820,stroke([(150,5),(150,710),(670,5),(670,710)]))
    put('O',770,loop(385,355,252,353))
    put('P',720,stroke([(150,5),(150,710),(433,710)]),
        stroke(join(bez((433,710),(656,710),(656,376),(433,376)),
                    [(433,376),(150,376)]),w*.92))
    put('Q',775,loop(385,355,252,353),stroke([(475,130),(657,-82)],slim))
    put('R',740,stroke([(150,5),(150,710),(433,710)]),
        stroke(join(bez((433,710),(656,710),(656,376),(433,376)),
                    [(433,376),(150,376)]),w*.92),
        stroke([(405,372),(614,5)],w*.91))
    put('S',690,stroke(join(bez((559,604),(461,754),(140,760),(134,555)),
                            bez((134,555),(132,378),(566,425),(566,182)),
                            bez((566,182),(566,-37),(230,-44),(121,96))),w*.91))
    put('T',715,stroke([(95,710),(620,710)],slim),stroke([(358,710),(358,5)]))
    put('U',790,stroke(join([(148,710),(148,238)],
                            bez((148,238),(148,-68),(640,-70),(640,238)),
                            [(640,238),(640,710)])))
    put('V',745,stroke([(110,710),(372,5),(635,710)]))
    put('W',975,stroke([(100,710),(228,5),(489,459),(750,5),(880,710)]))
    put('X',740,stroke([(135,710),(605,5)]),stroke([(605,710),(135,5)]))
    put('Y',745,stroke([(116,710),(372,347),(628,710)]),stroke([(372,347),(372,5)]))
    put('Z',695,stroke([(135,710),(562,710),(135,5),(562,5)]))

    # Lowercase is a compact, generous-x-height geometric alphabet with
    # deliberately single-storey a/g and broad interior whites.
    put('a',665,loop(300,257,196,249),stroke([(495,503),(495,5)]))
    put('b',680,stroke([(151,735),(151,5)]),loop(348,257,197,249))
    put('c',625,arc(320,257,209,249,46,315))
    put('d',680,loop(319,257,197,249),stroke([(516,735),(516,5)]))
    put('e',635,arc(319,257,211,249,25,316),stroke([(110,263),(523,263)],slim))
    put('f',455,stroke([(205,5),(205,568)]),
        stroke(bez((205,568),(205,724),(311,779),(419,687)),w*.88),
        stroke([(82,491),(404,491)],slim))
    put('g',680,loop(299,257,188,249),stroke([(487,504),(487,-120)]),
        stroke(bez((487,-120),(480,-283),(271,-285),(139,-192)),w*.88))
    put('h',685,stroke([(150,735),(150,5)]),
        stroke(join(bez((151,305),(190,547),(549,570),(549,290)),
                    [(549,290),(549,5)]),w*.92))
    put('i',300,stroke([(150,504),(150,5)]),dot(150,681,48))
    put('j',345,stroke([(177,504),(177,-131)]),
        stroke(bez((177,-131),(177,-252),(75,-267),(13,-218)),w*.78),dot(177,681,48))
    put('k',660,stroke([(150,735),(150,5)]),
        stroke([(546,506),(168,189),(560,5)],w*.90))
    put('l',300,stroke([(150,735),(150,5)]))
    put('m',945,stroke([(123,5),(123,505)]),
        stroke(join(bez((123,317),(143,548),(448,564),(448,296)),
                    [(448,296),(448,5)]),w*.89),
        stroke(join(bez((448,317),(468,548),(822,564),(822,296)),
                    [(822,296),(822,5)]),w*.89))
    put('n',685,stroke([(150,5),(150,505)]),
        stroke(join(bez((150,312),(194,548),(550,570),(550,294)),
                    [(550,294),(550,5)]),w*.92))
    put('o',655,loop(327,257,210,249))
    put('p',680,stroke([(151,505),(151,-228)]),loop(348,257,197,249))
    put('q',680,loop(319,257,197,249),stroke([(516,505),(516,-228)]))
    put('r',485,stroke([(150,5),(150,505)]),
        stroke(bez((150,306),(192,492),(338,562),(442,498)),w*.91))
    put('s',575,stroke(join(bez((472,430),(392,522),(145,548),(135,380)),
                            bez((135,380),(130,245),(474,295),(472,127)),
                            bez((472,127),(470,-42),(228,-47),(122,72))),w*.89))
    put('t',460,stroke([(205,656),(205,125)]),
        stroke(bez((205,125),(205,-8),(315,-35),(416,32)),w*.88),
        stroke([(77,491),(413,491)],slim))
    put('u',680,stroke(join([(145,505),(145,199)],
                            bez((145,199),(145,-56),(545,-56),(545,199)),
                            [(545,199),(545,505)]),w*.92))
    put('v',615,stroke([(112,505),(307,5),(502,505)]))
    put('w',840,stroke([(96,505),(209,5),(420,375),(632,5),(744,505)]))
    put('x',615,stroke([(127,505),(489,5)]),stroke([(489,505),(127,5)]))
    put('y',615,stroke([(112,505),(307,5),(502,505)]),
        stroke([(307,5),(208,-225)],w*.91))
    put('z',575,stroke([(128,505),(477,505),(128,5),(477,5)]))

    # Optically broad, rounded numerals support countdowns and title cards.
    put('0',670,loop(335,355,216,354),stroke([(445,549),(225,159)],w*.66))
    put('1',450,stroke([(112,535),(222,710),(240,5)]),stroke([(126,5),(354,5)],slim))
    put('2',630,stroke(join(bez((123,539),(119,761),(524,787),(537,541)),
                            bez((537,541),(537,370),(321,191),(127,5)),
                            [(127,5),(537,5)]),w*.90))
    put('3',630,stroke(join(bez((122,619),(210,762),(533,760),(532,537)),
                            bez((532,537),(531,421),(432,367),(302,359)),
                            bez((302,359),(462,352),(539,278),(539,151)),
                            bez((539,151),(539,-54),(212,-49),(113,97))),w*.90))
    put('4',640,stroke([(441,5),(441,710),(110,205),(541,205)],w*.91))
    put('5',630,stroke(join([(532,710),(151,710),(130,381)],
                            bez((130,381),(310,454),(539,371),(539,183)),
                            bez((539,183),(539,-56),(209,-52),(118,93))),w*.91))
    put('6',635,stroke(join(bez((509,631),(327,801),(115,571),(122,237)),
                            bez((122,237),(126,-55),(540,-54),(539,213)),
                            bez((539,213),(539,432),(276,459),(122,237))),w*.91))
    put('7',610,stroke([(102,710),(548,710),(260,5)],w*.93))
    put('8',625,loop(312,532,163,183,w*.89),loop(312,176,188,183,w*.89))
    put('9',635,stroke(join(bez((124,91),(306,-93),(543,143),(538,469)),
                            bez((538,469),(532,760),(122,769),(120,500)),
                            bez((120,500),(120,284),(383,257),(538,469))),w*.91))

    # All printable ASCII punctuation plus marks commonly pasted into titles.
    put(' ',310)
    put('.',245,dot(120,54,43))
    put(',',250,dot(130,61,43),stroke([(131,53),(101,-82)],slim*.67))
    put(':',250,dot(125,52,42),dot(125,423,42))
    put(';',250,dot(125,423,42),dot(129,61,43),stroke([(130,52),(100,-82)],slim*.67))
    put('!',285,stroke([(141,710),(141,207)],w*.91),dot(141,53,43))
    put('?',535,stroke(join(bez((108,536),(101,760),(458,788),(458,548)),
                            bez((458,548),(457,395),(276,408),(276,243))),w*.87),dot(276,53,42))
    put("'",230,stroke([(132,710),(104,508)],slim*.80))
    put('"',370,stroke([(116,710),(91,508)],slim*.80),stroke([(278,710),(252,508)],slim*.80))
    put('-',340,stroke([(78,271),(260,271)],slim*.80))
    put('_',520,stroke([(68,-86),(452,-86)],slim*.80))
    put('+',565,stroke([(283,104),(283,556)],slim*.83),stroke([(81,330),(485,330)],slim*.83))
    put('=',565,stroke([(82,425),(483,425)],slim*.80),stroke([(82,221),(483,221)],slim*.80))
    put('/',490,stroke([(84,-105),(410,752)],slim*.81))
    put('\\',490,stroke([(84,752),(410,-105)],slim*.81))
    put('(',340,stroke(bez((272,795),(52,613),(52,73),(272,-109)),slim*.86))
    put(')',340,stroke(bez((68,795),(288,613),(288,73),(68,-109)),slim*.86))
    put('[',320,stroke([(243,771),(102,771),(102,-87),(243,-87)],slim*.78))
    put(']',320,stroke([(77,771),(218,771),(218,-87),(77,-87)],slim*.78))
    put('{',365,stroke(join(bez((299,771),(153,771),(137,629),(137,458)),
                            bez((137,458),(137,366),(102,342),(59,342)),
                            bez((59,342),(102,342),(137,318),(137,225)),
                            bez((137,225),(137,53),(153,-87),(299,-87))),slim*.77))
    put('}',365,stroke(join(bez((66,771),(212,771),(228,629),(228,458)),
                            bez((228,458),(228,366),(263,342),(306,342)),
                            bez((306,342),(263,342),(228,318),(228,225)),
                            bez((228,225),(228,53),(212,-87),(66,-87))),slim*.77))
    put('|',230,stroke([(115,-127),(115,784)],slim*.75))
    put('*',395,stroke([(198,433),(198,710)],slim*.75),
        stroke([(76,500),(320,638)],slim*.75),stroke([(76,637),(320,500)],slim*.75))
    put('^',500,stroke([(78,368),(250,710),(422,368)],slim*.77))
    put('~',565,stroke(join(bez((70,301),(127,431),(209,423),(284,315)),
                            bez((284,315),(359,208),(438,209),(495,390))),slim*.75))
    put('<',500,stroke([(415,545),(85,324),(415,105)],slim*.77))
    put('>',500,stroke([(85,545),(415,324),(85,105)],slim*.77))
    put('#',625,stroke([(218,710),(132,5)],slim*.75),stroke([(500,710),(414,5)],slim*.75),
        stroke([(71,473),(555,473)],slim*.75),stroke([(47,237),(531,237)],slim*.75))
    put('$',655,stroke(join(bez((550,608),(456,753),(143,758),(131,555)),
                            bez((131,555),(128,377),(560,423),(560,182)),
                            bez((560,182),(560,-34),(228,-41),(121,97))),w*.87),
        stroke([(327,786),(327,-87)],slim*.77))
    put('%',720,stroke([(114,5),(610,710)],slim*.77),
        loop(197,559,83,109,slim*.73),loop(527,157,83,109,slim*.73))
    put('&',730,stroke(join(bez((620,51),(464,-78),(163,-52),(135,148)),
                            bez((135,148),(82,306),(345,410),(406,494)),
                            bez((406,494),(536,658),(367,778),(231,666)),
                            bez((231,666),(91,546),(321,254),(624,5))),w*.86))
    put('@',795,arc(401,338,286,333,49,349,slim*.81),
        loop(424,315,140,164,slim*.81),stroke([(560,463),(560,188)],slim*.76))
    put('`',230,stroke([(102,710),(145,581)],slim*.78))
    put('…',675,dot(115,54,42),dot(338,54,42),dot(561,54,42))
    put('–',515,stroke([(72,271),(443,271)],slim*.78))
    put('—',745,stroke([(72,271),(673,271)],slim*.78))
    put('‘',230,stroke([(128,720),(94,510)],slim*.80))
    put('’',230,stroke([(128,720),(94,510)],slim*.80))
    put('“',370,stroke([(112,720),(83,510)],slim*.80),stroke([(278,720),(248,510)],slim*.80))
    put('”',370,stroke([(112,720),(83,510)],slim*.80),stroke([(278,720),(248,510)],slim*.80))
    put('•',330,dot(165,273,50))
    put('€',680,arc(343,355,232,348,46,315),stroke([(89,453),(433,453)],slim*.80),
        stroke([(88,269),(433,269)],slim*.80))
    put('£',650,stroke(join(bez((525,586),(488,767),(205,773),(183,540)),
                            bez((183,540),(193,350),(176,174),(101,5))),w*.86),
        stroke([(77,350),(397,350)],slim*.77),stroke([(101,5),(548,5)],slim*.77))
    put('¥',670,stroke([(90,710),(335,354),(580,710)],w*.88),stroke([(335,354),(335,5)],w*.88),
        stroke([(164,298),(506,298)],slim*.76),stroke([(164,182),(506,182)],slim*.76))
    put('°',360,loop(180,565,96,111,slim*.73))
    put('©',690,loop(345,350,281,320,slim*.70),arc(345,350,144,181,50,314,slim*.79))
    put('®',690,loop(345,350,281,320,slim*.70),stroke([(264,214),(264,491)],slim*.78),
        arc(350,421,83,79,-90,90,slim*.78),stroke([(349,343),(441,209)],slim*.78))

    # Common accented names remain native glyphs, not fallback font tofu.
    def accent(kind,top,cx):
        if kind=='acute': return stroke([(cx-45,top+36),(cx+56,top+142)],slim*.61)
        if kind=='grave': return stroke([(cx-56,top+142),(cx+45,top+36)],slim*.61)
        if kind=='circ': return stroke([(cx-105,top+34),(cx,top+144),(cx+105,top+34)],slim*.60)
        if kind=='tilde': return stroke(join(bez((cx-105,top+65),(cx-68,top+155),(cx-28,top+136),(cx,top+89)),
                                           bez((cx,top+89),(cx+33,top+40),(cx+76,top+54),(cx+107,top+127))),slim*.61)
        if kind=='dots': return unary_union([dot(cx-72,top+106,29),dot(cx+72,top+106,29)])
        if kind=='ring': return loop(cx,top+112,63,61,slim*.63)
        if kind=='caron': return stroke([(cx-105,top+144),(cx,top+34),(cx+105,top+144)],slim*.60)
        raise ValueError(kind)

    variants={
        'a':{'à':'grave','á':'acute','â':'circ','ã':'tilde','ä':'dots','å':'ring'},
        'A':{'À':'grave','Á':'acute','Â':'circ','Ã':'tilde','Ä':'dots','Å':'ring'},
        'e':{'è':'grave','é':'acute','ê':'circ','ë':'dots'},
        'E':{'È':'grave','É':'acute','Ê':'circ','Ë':'dots'},
        'i':{'ì':'grave','í':'acute','î':'circ','ï':'dots'},
        'I':{'Ì':'grave','Í':'acute','Î':'circ','Ï':'dots'},
        'o':{'ò':'grave','ó':'acute','ô':'circ','õ':'tilde','ö':'dots'},
        'O':{'Ò':'grave','Ó':'acute','Ô':'circ','Õ':'tilde','Ö':'dots'},
        'u':{'ù':'grave','ú':'acute','û':'circ','ü':'dots'},
        'U':{'Ù':'grave','Ú':'acute','Û':'circ','Ü':'dots'},
        'y':{'ý':'acute','ÿ':'dots'},'Y':{'Ý':'acute'},
        'n':{'ñ':'tilde'},'N':{'Ñ':'tilde'},
        'c':{'ć':'acute','č':'caron'},'C':{'Ć':'acute','Č':'caron'},
        's':{'ś':'acute','š':'caron'},'S':{'Ś':'acute','Š':'caron'},
        'z':{'ź':'acute','ž':'caron'},'Z':{'Ź':'acute','Ž':'caron'},
    }
    for base,marks in variants.items():
        advance,body=glyphs[base]
        if base=='i': body=stroke([(150,504),(150,5)])
        height=710 if base.isupper() else 505
        for ch,mark in marks.items(): put(ch,advance,body,accent(mark,height,advance/2))
    cedilla=stroke(join(bez((320,-4),(350,-68),(365,-89),(319,-118)),
                        bez((319,-118),(283,-142),(242,-122),(232,-168))),slim*.61)
    put('ç',glyphs['c'][0],glyphs['c'][1],cedilla)
    put('Ç',glyphs['C'][0],glyphs['C'][1],cedilla)
    put('ø',glyphs['o'][0],glyphs['o'][1],stroke([(145,-29),(511,535)],slim*.69))
    put('Ø',glyphs['O'][0],glyphs['O'][1],stroke([(173,-41),(602,757)],slim*.69))
    put('ł',glyphs['l'][0],glyphs['l'][1],stroke([(47,278),(251,420)],slim*.68))
    put('Ł',glyphs['L'][0],glyphs['L'][1],stroke([(54,274),(392,453)],slim*.68))

    put('�',700,stroke([(100,5),(100,710),(601,710),(601,5),(100,5)],slim*.72),
        stroke([(122,25),(577,688)],slim*.65))
    assert all(chr(i) in glyphs for i in range(32,127)), 'ASCII glyph missing'
    return glyphs


def outline(shape):
    pen=TTGlyphPen(None)
    def polygons(obj):
        if isinstance(obj,Polygon): yield obj
        elif isinstance(obj,(MultiPolygon,GeometryCollection)):
            for part in obj.geoms: yield from polygons(part)
    for poly in polygons(shape):
        poly=orient(poly,sign=-1.0)
        for ring in [poly.exterior,*poly.interiors]:
            points=list(ring.coords)[:-1]
            if len(points)<3: continue
            pen.moveTo(tuple(map(round,points[0])))
            for p in points[1:]: pen.lineTo(tuple(map(round,p)))
            pen.closePath()
    return pen.glyph()


def glyph_name(ch):
    if ch=='�': return '.notdef'
    if ch==' ': return 'space'
    if ch.isascii() and ch.isalnum(): return ch
    return 'uni%04X'%ord(ch)


def build(style,weight,stage):
    drawings=draw(weight)
    bold=style=='Bold'
    order=['.notdef']+[glyph_name(c) for c in drawings if c!='�']
    shapes,metrics,cmap={},{},{}
    for ch,(advance,shape) in drawings.items():
        name=glyph_name(ch)
        shapes[name]=outline(shape)
        metrics[name]=(advance,round(shape.bounds[0]) if not shape.is_empty else 0)
        if ch!='�': cmap[ord(ch)]=name
    fb=FontBuilder(1000,isTTF=True)
    fb.setupGlyphOrder(order)
    fb.setupCharacterMap(cmap)
    fb.setupGlyf(shapes)
    fb.setupHorizontalMetrics(metrics)
    fb.setupHorizontalHeader(ascent=1080,descent=-365,lineGap=0)
    fb.setupNameTable({
        'familyName':'FM Cloud Pop','styleName':style,
        'uniqueFontIdentifier':'FreeMotion original FM Cloud Pop '+style+' 1.0',
        'fullName':'FM Cloud Pop '+style,
        'psName':'FMCloudPop-'+style,
        'version':'Version 1.000',
        'designer':'FreeMotion original type design',
        'description':'Original soft heavy geometric display face for FreeMotion.',
    })
    fb.setupOS2(version=4,fsType=0,sTypoAscender=1080,sTypoDescender=-365,
                sTypoLineGap=0,usWinAscent=1080,usWinDescent=365,
                sxHeight=505,sCapHeight=710,usWeightClass=700 if bold else 400,
                usWidthClass=5,fsSelection=0x20 if bold else 0x40)
    fb.setupPost(italicAngle=0,underlinePosition=-130,underlineThickness=62)
    fb.setupMaxp()
    font=fb.font
    font['head'].macStyle=1 if bold else 0
    font['head'].created=font['head'].modified=CREATED
    font.recalcTimestamp=False
    pairs=[('A','V',-42),('A','W',-35),('A','Y',-44),('A','T',-30),
           ('L','T',-44),('L','V',-39),('L','Y',-45),('P','A',-30),
           ('T','a',-36),('T','e',-37),('T','o',-37),('V','a',-38),
           ('V','o',-39),('W','a',-31),('Y','a',-42),('Y','o',-44)]
    addOpenTypeFeaturesFromString(font,'feature kern {\n'+
        ''.join(f' pos {a} {b} {amount};\n' for a,b,amount in pairs)+'} kern;\n')
    slug='fm-cloud-pop-'+style.lower()
    ttf,woff=stage/(slug+'.ttf'),stage/(slug+'.woff2')
    font.save(ttf)
    font.flavor='woff2'
    font.save(woff)
    return ttf,woff,len(cmap)


def main():
    with tempfile.TemporaryDirectory(prefix='.cloud-pop-build-',dir=DEST) as temporary:
        stage=Path(temporary)
        faces=[build('Regular',132,stage),build('Bold',177,stage)]
        TTF_DEST.mkdir(exist_ok=True)
        for ttf,woff,count in faces:
            if woff.stat().st_size<1000: raise RuntimeError('Incomplete face '+woff.name)
            os.replace(ttf,TTF_DEST/ttf.name)
            os.replace(woff,DEST/woff.name)
            print(f'{woff.name}: {(DEST/woff.name).stat().st_size} bytes, {count} mapped characters')


if __name__=='__main__': main()
