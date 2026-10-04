#!/usr/bin/env python3
"""Draw FM Blackthorn, an original broad-pen blackletter for FreeMotion.

Every skeleton, counter and spacing value below was placed for this family.
The generator reads no font file, image, outline or external metrics.
"""
from __future__ import annotations

import os
import tempfile
import unicodedata
from pathlib import Path

from fontTools.feaLib.builder import addOpenTypeFeaturesFromString
from fontTools.fontBuilder import FontBuilder
from fontTools.pens.ttGlyphPen import TTGlyphPen
from shapely.geometry import GeometryCollection, LineString, MultiPolygon, Polygon
from shapely.geometry.polygon import orient
from shapely.ops import unary_union

HERE = Path(__file__).resolve().parent
DEST = HERE.parent
TTF_DEST = HERE / 'fonts'
CREATED = 3873903662


def design(bold=False):
    stem_width = 125 if bold else 101
    arm_width = 96 if bold else 76
    accent_width = 74 if bold else 62
    glyphs = {}

    def line(points, width=arm_width):
        return LineString(points).buffer(width/2, cap_style=2, join_style=2)

    def stem(x, bottom=0, top=520, width=stem_width):
        # A broad nib with visible diamond heads and feet. The terminals
        # make the repeated minuscule strokes read as a broken-arch rhythm.
        half = width/2
        body=Polygon([(x-half,bottom+43),(x-half+42,bottom),
                      (x+half,bottom),(x+half,bottom+43),
                      (x+half,top-43),(x+half-42,top),
                      (x-half,top),(x-half,top-43)])
        tip=min(72,width*.63)
        return unary_union([body,diamond(x,bottom+17,tip,59),
                            diamond(x,top-17,tip,59)])

    def diamond(x,y,rx=56,ry=57):
        return Polygon([(x,y+ry),(x+rx,y),(x,y-ry),(x-rx,y)])

    def ring(left,right,bottom=0,top=520,width=None):
        # Broad angular bowl; the inner opening stays generous at 32 px.
        w=width or stem_width
        corner=min(68,(right-left)*.23,(top-bottom)*.23)
        inner_corner=min(45,(right-left-2*w)*.23,(top-bottom-2*w)*.23)
        outer=Polygon([(left,bottom+corner),(left+corner,bottom),
                       (right-corner,bottom),(right,bottom+corner),
                       (right,top-corner),(right-corner,top),
                       (left+corner,top),(left,top-corner)])
        inner=Polygon([(left+w,bottom+w+inner_corner),(left+w+inner_corner,bottom+w),
                       (right-w-inner_corner,bottom+w),(right-w,bottom+w+inner_corner),
                       (right-w,top-w-inner_corner),(right-w-inner_corner,top-w),
                       (left+w+inner_corner,top-w),(left+w,top-w-inner_corner)])
        return outer.difference(inner)

    def open_bowl(left,right,bottom=0,top=520,opening='right'):
        if opening=='right':
            points=[(right-25,top-28),(left+68,top),(left,top-91),
                    (left,bottom+91),(left+68,bottom),(right-25,bottom+28)]
        else:
            points=[(left+25,top-28),(right-68,top),(right,top-91),
                    (right,bottom+91),(right-68,bottom),(left+25,bottom+28)]
        return line(points,stem_width)

    def arch(x1,x2,top=520):
        return line([(x1,top-79),(x1+97,top+5),(x2-85,top+5),
                     (x2,top-82)],arm_width)

    def put(ch,advance,*forms):
        glyphs[ch]=(advance,unary_union([f for f in forms if not f.is_empty]) if forms else GeometryCollection())

    # Lowercase is a separate minuscule alphabet with ascenders, descenders,
    # diamond dots and joined broken arches; it is not scaled small caps.
    put('a',535,ring(70,445),stem(429))
    put('b',550,stem(119,0,768),ring(100,477))
    put('c',508,open_bowl(74,446))
    put('d',550,ring(73,450),stem(434,0,768))
    put('e',515,open_bowl(74,447),line([(96,260),(427,260)]))
    put('f',400,stem(202,-166,684),line([(201,626),(277,759),(370,759)],arm_width),
        line([(78,479),(343,479)],accent_width))
    put('g',550,ring(72,447),stem(431,-166,520),
        line([(430,-121),(355,-208),(209,-208)],arm_width))
    put('h',559,stem(111,0,768),stem(464),arch(111,464))
    put('i',276,stem(137),diamond(138,703,56,60))
    put('j',294,stem(145,-147,520),diamond(145,703,56,60),
        line([(144,-132),(91,-206),(47,-206)],accent_width))
    put('k',530,stem(111,0,768),line([(453,510),(185,255),(457,0)],stem_width))
    put('l',275,stem(137,0,768))
    put('m',750,stem(105),stem(374),stem(643),arch(105,374),arch(374,643))
    put('n',554,stem(108),stem(457),arch(108,457))
    put('o',540,ring(74,466))
    put('p',550,stem(113,-175,520),ring(92,475))
    put('q',550,ring(74,456),stem(440,-175,520))
    put('r',425,stem(107),line([(107,425),(197,514),(326,514),(381,459)],arm_width),
        diamond(379,455,40,43))
    put('s',505,line([(424,437),(357,508),(177,508),(91,415),
                      (413,98),(335,6),(151,6),(75,78)],stem_width))
    put('t',408,stem(208,-3,697),line([(76,476),(348,476)],accent_width))
    put('u',555,stem(109),stem(455),line([(109,68),(194,-5),(368,-5),(455,79)],arm_width))
    put('v',527,line([(89,510),(258,0),(438,510)],stem_width))
    put('w',728,line([(83,510),(219,0),(364,382),(509,0),(647,510)],stem_width))
    put('x',523,line([(90,510),(433,0)],stem_width),line([(433,510),(90,0)],stem_width))
    put('y',536,line([(88,510),(258,0),(439,510),(423,-126),(344,-206),(223,-206)],stem_width))
    put('z',499,line([(82,510),(421,510),(80,0),(421,0)],stem_width))

    # Capitals have the same broken nib angle but taller, more ceremonial
    # constructions. Some are closed polygonal bowls, some open with hooks.
    put('A',633,line([(91,0),(289,759),(538,0)],stem_width),
        line([(185,246),(461,246)],arm_width),diamond(284,776,52,48))
    put('B',625,stem(121,0,760),
        line([(123,748),(406,748),(508,649),(508,501),
              (418,392),(123,392)],arm_width),
        line([(123,392),(426,392),(521,287),(521,126),
              (425,12),(123,12)],arm_width))
    put('C',607,open_bowl(89,533,0,760))
    put('D',647,stem(119,0,760),ring(96,561,0,760))
    put('E',578,stem(119,0,760),line([(119,748),(502,748)],arm_width),
        line([(120,390),(455,390)],arm_width),line([(120,13),(504,13)],arm_width))
    put('F',557,stem(117,0,760),line([(117,748),(499,748)],arm_width),
        line([(117,390),(449,390)],arm_width))
    put('G',649,open_bowl(91,550,0,760),line([(355,344),(551,344),(551,78)],arm_width))
    put('H',677,stem(117,0,760),stem(559,0,760),line([(117,381),(559,381)],arm_width))
    put('I',345,stem(172,0,760),diamond(172,773,100,39),diamond(172,-15,100,39))
    put('J',555,stem(447,92,760),line([(445,98),(353,-13),(178,-13),(92,102)],stem_width),
        line([(88,746),(464,746)],arm_width))
    put('K',629,stem(117,0,760),line([(532,754),(183,369),(539,0)],stem_width))
    put('L',573,stem(119,0,760),line([(119,15),(501,15)],arm_width))
    put('M',801,stem(112,0,760),stem(684,0,760),
        line([(112,748),(398,305),(684,748)],stem_width))
    put('N',690,stem(121,0,760),stem(571,0,760),line([(121,748),(571,13)],stem_width))
    put('O',659,ring(90,570,0,760))
    put('P',610,stem(119,0,760),ring(99,532,345,760))
    put('Q',665,ring(90,570,0,760),line([(409,161),(583,-114)],arm_width))
    put('R',641,stem(117,0,760),ring(98,536,346,760),line([(354,371),(551,0)],stem_width))
    put('S',622,line([(520,657),(431,754),(190,754),(98,616),
                      (518,143),(423,4),(180,4),(89,111)],stem_width))
    put('T',631,line([(83,742),(548,742)],stem_width),stem(316,0,760))
    put('U',677,stem(118,105,760),stem(558,105,760),
        line([(118,110),(203,0),(472,0),(558,110)],stem_width))
    put('V',654,line([(91,760),(329,0),(564,760)],stem_width))
    put('W',877,line([(84,760),(224,0),(438,504),(651,0),(792,760)],stem_width))
    put('X',630,line([(102,760),(527,0)],stem_width),line([(527,760),(102,0)],stem_width))
    put('Y',642,line([(94,760),(321,384),(548,760)],stem_width),stem(321,0,387))
    put('Z',609,line([(91,748),(519,748),(91,13),(519,13)],stem_width))

    # Numerals carry the same angular bowl and cut terminals.
    put('0',631,ring(88,544,0,760),line([(439,620),(189,124)],accent_width))
    put('1',400,stem(211,0,760),line([(88,10),(339,10)],arm_width),
        line([(91,585),(210,746)],arm_width))
    put('2',595,line([(92,629),(188,751),(415,751),(507,627),
                      (491,517),(91,12),(509,12)],stem_width))
    put('3',588,line([(91,647),(191,751),(411,751),(500,615),
                      (414,386),(500,145),(413,8),(189,8),(91,114)],stem_width),
        line([(292,385),(421,385)],accent_width))
    put('4',614,line([(434,0),(434,758)],stem_width),
        line([(83,232),(529,232)],arm_width),line([(95,241),(423,757)],stem_width))
    put('5',588,line([(498,749),(109,749),(109,401),(418,401),(500,291),
                      (487,122),(399,9),(192,9),(94,102)],stem_width))
    put('6',603,
        # An exposed top hook, rather than a second closed bowl, separates
        # six from the lowercase a and from the double-loop eight.
        line([(485,649),(384,756),(222,701),(108,527),(108,292)],stem_width),
        ring(99,521,0,435))
    put('7',591,line([(82,749),(514,749),(230,0)],stem_width))
    put('8',612,ring(111,501,369,760),ring(91,522,0,408))
    put('9',603,ring(88,510,324,760),
        line([(508,425),(503,164),(404,8),(173,8)],stem_width))

    # Punctuation is simpler so the nib cuts remain legible at caption sizes.
    put(' ',280)
    put('.',244,diamond(122,50,47,50))
    put(',',249,diamond(124,54,46,49),line([(123,51),(88,-103)],accent_width))
    put(':',246,diamond(123,50,45,48),diamond(123,466,45,48))
    put(';',249,diamond(124,466,45,48),diamond(124,54,46,49),line([(123,51),(88,-103)],accent_width))
    put('!',285,stem(143,219,760,accent_width),diamond(143,51,46,50))
    put('?',521,line([(86,606),(183,750),(388,750),(461,608),
                      (431,474),(270,358),(270,220)],arm_width),diamond(270,51,46,50))
    put("'",238,line([(120,759),(92,552)],accent_width))
    put('"',381,line([(106,759),(80,552)],accent_width),line([(270,759),(245,552)],accent_width))
    put('-',356,line([(80,265),(275,265)],arm_width))
    put('_',521,line([(72,-94),(450,-94)],arm_width))
    put('+',533,line([(266,91),(266,579)],arm_width),line([(66,335),(467,335)],arm_width))
    put('=',533,line([(66,438),(467,438)],arm_width),line([(66,231),(467,231)],arm_width))
    put('/',490,line([(73,-117),(417,797)],arm_width))
    put('\\',490,line([(73,797),(417,-117)],arm_width))
    put('(',338,line([(274,805),(155,650),(92,351),(155,49),(274,-108)],arm_width))
    put(')',338,line([(64,805),(183,650),(246,351),(183,49),(64,-108)],arm_width))
    put('[',343,line([(260,783),(99,783),(99,-92),(260,-92)],arm_width))
    put(']',343,line([(83,783),(244,783),(244,-92),(83,-92)],arm_width))
    put('{',394,line([(310,783),(197,783),(142,690),(142,436),(74,342),
                      (142,248),(142,3),(197,-93),(310,-93)],arm_width))
    put('}',394,line([(84,783),(197,783),(252,690),(252,436),(320,342),
                      (252,248),(252,3),(197,-93),(84,-93)],arm_width))
    put('|',241,stem(120,-119,798,accent_width))
    put('*',405,line([(203,440),(203,760)],accent_width),
        line([(80,516),(325,683)],accent_width),line([(80,683),(325,516)],accent_width))
    put('^',519,line([(80,389),(259,758),(439,389)],arm_width))
    put('~',560,line([(75,315),(148,414),(245,303),(332,410),(484,307)],arm_width))
    put('<',517,line([(424,553),(91,330),(424,107)],arm_width))
    put('>',517,line([(93,553),(426,330),(93,107)],arm_width))
    put('#',607,line([(212,757),(136,0)],arm_width),line([(474,757),(399,0)],arm_width),
        line([(66,490),(541,490)],arm_width),line([(45,249),(520,249)],arm_width))
    put('$',629,line([(525,650),(430,760),(186,760),(94,623),
                      (518,146),(420,6),(174,6),(85,111)],stem_width),
        line([(311,823),(311,-89)],accent_width))
    put('%',747,line([(123,0),(633,760)],arm_width),ring(100,329,470,760,accent_width),
        ring(420,649,0,290,accent_width))
    put('&',727,line([(636,82),(531,0),(197,0),(95,117),(115,250),(422,528),
                      (430,659),(338,759),(202,759),(112,652),(610,0)],arm_width))
    put('@',804,open_bowl(82,715,5,752),ring(297,589,171,521,accent_width),
        stem(598,181,514,accent_width))
    put('`',239,line([(98,763),(157,616)],accent_width))
    put('…',686,diamond(115,48,45,48),diamond(343,48,45,48),diamond(571,48,45,48))
    put('–',510,line([(74,266),(436,266)],arm_width))
    put('—',739,line([(75,266),(663,266)],arm_width))
    put('‘',235,line([(122,757),(95,550)],accent_width))
    put('’',235,line([(140,757),(108,550)],accent_width))
    put('“',381,line([(108,757),(82,550)],accent_width),line([(273,757),(247,550)],accent_width))
    put('”',381,line([(120,757),(94,550)],accent_width),line([(285,757),(259,550)],accent_width))
    put('•',319,diamond(159,271,61,63))
    put('·',244,diamond(122,352,45,47))
    put('°',360,ring(104,256,513,740,accent_width))
    put('€',625,open_bowl(103,550,0,760),line([(87,476),(420,476)],accent_width),
        line([(87,270),(420,270)],accent_width))
    put('£',625,line([(506,623),(408,753),(232,753),(150,614),
                      (165,395),(98,14),(530,14)],stem_width),
        line([(83,365),(415,365)],accent_width))
    put('¥',647,line([(94,760),(320,385),(546,760)],stem_width),stem(320,0,386,arm_width),
        line([(145,286),(493,286)],accent_width))
    put('©',714,ring(62,652,0,760,accent_width),open_bowl(224,487,186,573))
    put('®',714,ring(62,652,0,760,accent_width),stem(270,200,558,accent_width),
        ring(269,472,359,558,accent_width),line([(369,361),(481,201)],accent_width))

    marks={'\u0300':'grave','\u0301':'acute','\u0302':'circumflex','\u0303':'tilde',
           '\u0308':'diaeresis','\u030a':'ring','\u030c':'caron','\u0327':'cedilla'}
    def mark(kind,x,y):
        if kind=='acute': return line([(x-50,y+18),(x+65,y+151)],accent_width)
        if kind=='grave': return line([(x-65,y+151),(x+50,y+18)],accent_width)
        if kind=='circumflex': return line([(x-79,y+24),(x,y+126),(x+79,y+24)],accent_width)
        if kind=='caron': return line([(x-79,y+126),(x,y+24),(x+79,y+126)],accent_width)
        if kind=='tilde': return line([(x-87,y+40),(x-34,y+113),(x+23,y+44),(x+89,y+118)],accent_width)
        if kind=='diaeresis': return unary_union([diamond(x-63,y+87,29,31),diamond(x+63,y+87,29,31)])
        if kind=='ring': return ring(x-51,x+51,y+26,y+130,accent_width/2)
        return line([(x+13,-24),(x-29,-107),(x+22,-169),(x+83,-119)],accent_width)
    for cp in range(0x00c0,0x0180):
        ch=chr(cp); decomp=unicodedata.normalize('NFD',ch)
        if len(decomp)!=2 or decomp[0] not in glyphs or decomp[1] not in marks: continue
        base=decomp[0]
        if not base.isalpha() or not base.isascii(): continue
        advance,shape=glyphs[base]
        top=790 if base.isupper() or base in 'bdfhijklt' else 542
        glyphs[ch]=(advance,unary_union([shape,mark(marks[decomp[1]],advance/2,top+20)]))
    # A few widespread letters are not a single supported NFD base+mark.
    put('ß',570,stem(118,0,759),ring(112,487,361,759),
        open_bowl(126,490,0,397))
    put('Æ',897,line([(90,0),(292,760),(474,0)],stem_width),
        line([(181,244),(465,244)],arm_width),stem(490,0,760),
        line([(489,745),(820,745)],arm_width),line([(489,385),(780,385)],arm_width),
        line([(489,14),(823,14)],arm_width))
    put('æ',772,ring(69,421),stem(410),open_bowl(411,708),
        line([(423,258),(689,258)],accent_width))
    put('Ø',670,ring(91,579,0,760),line([(84,-30),(588,793)],arm_width))
    put('ø',551,ring(75,475),line([(67,-36),(485,553)],arm_width))
    put('Ł',596,stem(137,0,760),line([(135,15),(524,15)],arm_width),
        line([(39,267),(365,490)],arm_width))
    put('ł',318,stem(156,0,760),line([(57,265),(253,453)],accent_width))
    glyphs['\ufffd']=(620,unary_union([line([(90,0),(90,760),(530,760),(530,0),(90,0)],accent_width),
                                       line([(90,0),(530,760)],accent_width)]))
    assert all(chr(cp) in glyphs for cp in range(32,127))
    return glyphs


def glyph_name(ch):
    if ch=='\ufffd': return '.notdef'
    if ch==' ': return 'space'
    if ch.isascii() and ch.isalnum(): return ch
    return 'uni%04X'%ord(ch)


def contour(shape):
    pen=TTGlyphPen(None)
    pieces=[shape] if isinstance(shape,Polygon) else list(shape.geoms) if isinstance(shape,MultiPolygon) else []
    for piece in pieces:
        polygon=orient(piece,sign=-1.0)
        for ring in [polygon.exterior,*polygon.interiors]:
            points=list(ring.coords)[:-1]
            if len(points)<3: continue
            pen.moveTo(tuple(map(round,points[0])))
            for point in points[1:]: pen.lineTo(tuple(map(round,point)))
            pen.closePath()
    return pen.glyph()


def build(style,stage):
    shapes=design(style=='Bold')
    order=['.notdef']+[glyph_name(ch) for ch in shapes if ch!='\ufffd']
    glyphs={glyph_name(ch):contour(shape) for ch,(_,shape) in shapes.items()}
    metrics={glyph_name(ch):(advance,round(shape.bounds[0]) if not shape.is_empty else 0)
             for ch,(advance,shape) in shapes.items()}
    cmap={ord(ch):glyph_name(ch) for ch in shapes if ch!='\ufffd'}
    fb=FontBuilder(1000,isTTF=True)
    fb.setupGlyphOrder(order); fb.setupCharacterMap(cmap); fb.setupGlyf(glyphs)
    fb.setupHorizontalMetrics(metrics)
    fb.setupHorizontalHeader(ascent=1060,descent=-350,lineGap=0)
    fb.setupNameTable({'familyName':'FM Blackthorn','styleName':style,
        'uniqueFontIdentifier':'FreeMotion original FM Blackthorn '+style+' 1.0',
        'fullName':'FM Blackthorn '+style,'psName':'FMBlackthorn-'+style,
        'version':'Version 1.000','designer':'FreeMotion original type design',
        'description':'Original modern blackletter with broad-pen cuts and angular bowls.'})
    fb.setupOS2(version=4,fsType=0,sTypoAscender=1060,sTypoDescender=-350,
        sTypoLineGap=0,usWinAscent=1060,usWinDescent=350,sxHeight=520,
        sCapHeight=760,usWeightClass=700 if style=='Bold' else 400,
        usWidthClass=5,fsSelection=0x20 if style=='Bold' else 0x40)
    fb.setupPost(italicAngle=0,underlinePosition=-155,underlineThickness=79)
    fb.setupMaxp()
    font=fb.font; font['head'].macStyle=1 if style=='Bold' else 0
    font['head'].created=font['head'].modified=CREATED
    font.recalcTimestamp=False
    pairs={'A':'VWYT','L':'TVWY','T':'Aaeo','V':'Aaeo','W':'Aao','Y':'Aaeo',
           'F':'Ao','P':'ao','r':'aeo','f':'aeo','y':'aeo'}
    rules=['pos %s %s -%d;'%(left,right,29 if left.isupper() else 18)
           for left,rights in pairs.items() for right in rights]
    addOpenTypeFeaturesFromString(font,'feature kern {\n'+'\n'.join(rules)+'\n} kern;')
    stem_name='fm-blackthorn-'+style.lower()
    ttf=stage/(stem_name+'.ttf'); woff=stage/(stem_name+'.woff2')
    font.save(ttf); font.flavor='woff2'; font.save(woff)
    return ttf,woff,len(cmap)


def main():
    with tempfile.TemporaryDirectory(prefix='.blackthorn-build-',dir=DEST) as temp:
        built=[build('Regular',Path(temp)),build('Bold',Path(temp))]
        TTF_DEST.mkdir(exist_ok=True)
        for ttf,woff,count in built:
            if woff.stat().st_size<1000: raise RuntimeError('Incomplete font '+woff.name)
            os.replace(ttf,TTF_DEST/ttf.name)
            os.replace(woff,DEST/woff.name)
            print(f'{woff.name}: {(DEST/woff.name).stat().st_size} bytes, {count} mapped characters')


if __name__=='__main__': main()
