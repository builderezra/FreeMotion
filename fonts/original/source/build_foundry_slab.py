#!/usr/bin/env python3
"""Build FM Foundry Slab, an original industrial slab-serif display family.

The glyphs below are placed from drawing coordinates, not read, traced or
rescaled from any existing font. Install requirements.txt and run this file.
"""
from __future__ import annotations

import math
import os
import tempfile
from pathlib import Path

from fontTools.feaLib.builder import addOpenTypeFeaturesFromString
from fontTools.fontBuilder import FontBuilder
from fontTools.pens.ttGlyphPen import TTGlyphPen
from shapely.geometry import GeometryCollection, LineString, MultiPolygon, Point, Polygon, box
from shapely.geometry.polygon import orient
from shapely.ops import unary_union

HERE = Path(__file__).resolve().parent
DEST = HERE.parent
TTF_DEST = HERE / 'fonts'
CREATED = 3873903662


def curve(a, b, c, d, steps=32):
    return [((1-t)**3*a[0] + 3*(1-t)**2*t*b[0] + 3*(1-t)*t*t*c[0] + t**3*d[0],
             (1-t)**3*a[1] + 3*(1-t)**2*t*b[1] + 3*(1-t)*t*t*c[1] + t**3*d[1])
            for t in (i / steps for i in range(steps+1))]


def path(*parts):
    points = []
    for part in parts:
        points.extend(part if not points else part[1:])
    return points


def oval(cx, cy, rx, ry, steps=84):
    return Polygon([(cx+rx*math.cos(2*math.pi*i/steps),
                     cy+ry*math.sin(2*math.pi*i/steps)) for i in range(steps)])


def arc(cx, cy, rx, ry, start, stop, steps=52):
    return [(cx+rx*math.cos(math.radians(start+(stop-start)*i/steps)),
             cy+ry*math.sin(math.radians(start+(stop-start)*i/steps)))
            for i in range(steps+1)]


def draw(weight):
    v = weight
    h = round(weight*.84)
    fine = round(weight*.61)
    slab = 47 if weight < 110 else 59
    designs = {}

    def rect(x0,y0,x1,y1):
        return box(x0,y0,x1,y1)

    def line(points, width=v):
        return LineString(points).buffer(width/2,cap_style=2,join_style=1,quad_segs=14)

    def ring(cx,cy,rx,ry,vertical=v,horizontal=h):
        return oval(cx,cy,rx,ry).difference(oval(cx,cy,rx-vertical,ry-horizontal))

    def serif(x,y,width=183,thickness=slab):
        return rect(x-width/2,y,x+width/2,y+thickness)

    def stem(x,y0=0,y1=720,head=True,foot=True):
        parts=[rect(x-v/2,y0,x+v/2,y1)]
        if head: parts.append(rect(x-94,y1-slab,x+94,y1))
        if foot: parts.append(serif(x,y0,188))
        return unary_union(parts)

    def dot(x,y,r=36):
        return Point(x,y).buffer(r,quad_segs=16)

    def put(char,advance,*forms):
        designs[char]=(advance,unary_union([s for s in forms if not s.is_empty]) if forms else GeometryCollection())

    def cap_bowl(cx=350): return ring(cx,360,263,363)
    def small_bowl(cx=296): return ring(cx,244,203,247,v-5,h-4)

    # Broad industrial capitals: uniform strokes and oversize flat slabs.
    put('A',760,line([(106,0),(378,720),(650,0)],v),
        rect(200,231,552,231+h),serif(112,0,190),serif(646,0,190))
    put('B',720,stem(143),
        line(path(curve((145,720),(660,770),(657,389),(154,378)),
                  curve((154,378),(681,386),(675,-33),(145,0))),v*.91))
    put('C',745,line(arc(375,360,268,364,43,316)),
        rect(558,581,657,627),rect(558,98,657,144))
    put('D',770,stem(145),
        line(path(curve((146,720),(575,757),(662,599),(662,360)),
                  curve((662,360),(662,119),(579,-36),(146,0))),v*.92))
    put('E',690,stem(144),rect(143,720-h,616,720),
        rect(143,353,546,353+h),rect(143,0,622,h),
        rect(565,654,622,720),rect(567,0,622,76))
    put('F',670,stem(143),rect(143,720-h,604,720),
        rect(143,353,527,353+h),rect(550,653,607,720))
    put('G',785,line(arc(374,360,265,364,43,316)),
        rect(392,328,660,328+h),rect(609,80,668,393),rect(555,581,659,627))
    put('H',795,stem(151),stem(644),rect(151,352,644,352+h))
    put('I',430,stem(213))
    put('J',690,rect(152,720-h,618,720),stem(559,194,720,head=False,foot=False),
        line(curve((559,196),(557,-67),(185,-69),(137,95)),v),
        rect(152,646,205,720))
    put('K',760,stem(143),line([(625,720),(173,303)],v*.88),
        line([(378,499),(648,0)],v*.88),serif(627,0,183),rect(558,664,665,720))
    put('L',675,stem(143),rect(143,0,605,h),rect(550,0,607,101))
    put('M',970,stem(144),stem(823),
        line([(144,700),(483,201),(823,700)],v*.89))
    put('N',845,stem(148),stem(695),
        line([(170,700),(674,16)],v*.87))
    put('O',785,cap_bowl(392))
    put('P',720,stem(142),
        line(path(curve((142,720),(617,765),(648,405),(407,388)),
                  [(407,388),(148,388)]),v*.92))
    put('Q',790,cap_bowl(392),line([(456,146),(690,-93)],v*.79))
    put('R',760,stem(142),
        line(path(curve((142,720),(617,765),(648,405),(407,388)),
                  [(407,388),(148,388)]),v*.92),
        line([(399,384),(658,0)],v*.83),serif(638,0,178))
    put('S',705,line(path(curve((592,607),(510,757),(143,764),(132,556)),
                           curve((132,556),(123,372),(598,440),(598,179)),
                           curve((598,179),(597,-56),(237,-51),(119,97))),v*.93),
        rect(82,57,153,132),rect(557,580,626,650))
    put('T',740,rect(67,720-h,673,720),stem(370,0,720,head=False),
        rect(67,633,122,720),rect(618,633,673,720))
    put('U',805,stem(152,211,720,foot=False),stem(653,211,720,foot=False),
        line(arc(402,205,250,205,180,360),v))
    put('V',750,line([(93,720),(374,0),(657,720)],v*.9),
        rect(61,720-h,186,720),rect(566,720-h,689,720),serif(374,0,136))
    put('W',1050,line([(95,720),(243,0),(523,505),(806,0),(956,720)],v*.86),
        rect(50,720-h,185,720),rect(866,720-h,1002,720),
        serif(243,0,128),serif(806,0,128))
    put('X',750,line([(113,720),(638,0)],v*.87),line([(638,720),(113,0)],v*.87),
        rect(58,720-h,184,720),rect(566,720-h,692,720),serif(113,0,145),serif(638,0,145))
    put('Y',750,line([(93,720),(374,356),(657,720)],v*.88),
        stem(374,0,362,head=False),rect(44,720-h,183,720),rect(566,720-h,707,720))
    put('Z',720,rect(94,720-h,625,720),line([(585,686),(129,34)],v*.85),
        rect(91,0,630,h),rect(94,646,150,720),rect(574,0,630,75))

    # Lowercase includes a compact double-storey a and distinctive open ear
    # on g; cap and x-height proportions were drawn independently.
    put('a',660,small_bowl(287),stem(485,0,477,head=False),
        line(curve((133,397),(196,537),(430,572),(483,408)),v*.83))
    put('b',675,stem(145,0,735),small_bowl(348))
    put('c',620,line(arc(314,245,213,248,48,313),v-5))
    put('d',675,small_bowl(294),stem(497,0,735))
    put('e',635,line(arc(316,245,212,248,26,313),v-5),
        rect(104,246,526,246+h),rect(489,225,535,297))
    put('f',465,stem(213,0,575,head=False),
        line(curve((213,563),(210,746),(340,783),(445,677)),v*.82),
        rect(80,460,434,460+h))
    put('g',665,small_bowl(300),stem(494,-112,477,head=False,foot=False),
        line(curve((494,-108),(489,-283),(260,-285),(130,-188)),v*.82),
        rect(495,400,576,465))
    put('h',680,stem(145,0,735),
        line(path(curve((149,304),(208,542),(533,566),(541,288)),
                  [(541,288),(541,0)]),v*.88),serif(541,0,172))
    put('i',340,stem(171,0,477,head=False),dot(171,668,42))
    put('j',365,stem(184,-161,477,head=False,foot=False),
        line(curve((184,-160),(180,-287),(70,-293),(16,-206)),v*.72),dot(184,668,42))
    put('k',670,stem(146,0,735),line([(552,480),(166,178)],v*.84),
        line([(374,335),(570,0)],v*.84),serif(553,0,165))
    put('l',345,stem(169,0,735))
    put('m',930,stem(123,0,477,head=False),
        line(path(curve((124,294),(167,538),(440,557),(443,283)),
                  [(443,283),(443,0)]),v*.88),
        line(path(curve((443,298),(486,537),(806,556),(808,281)),
                  [(808,281),(808,0)]),v*.88),serif(443,0,150),serif(808,0,150))
    put('n',680,stem(143,0,477,head=False),
        line(path(curve((143,298),(191,538),(542,558),(543,285)),
                  [(543,285),(543,0)]),v*.88),serif(543,0,170))
    put('o',650,small_bowl(326))
    put('p',675,stem(145,-228,477,head=False),small_bowl(348))
    put('q',675,small_bowl(294),stem(497,-228,477,head=False))
    put('r',495,stem(145,0,477,head=False),
        line(curve((147,299),(188,488),(324,550),(448,477)),v*.83))
    put('s',575,line(path(curve((480,408),(404,512),(115,548),(110,366)),
                           curve((110,366),(108,245),(496,301),(495,128)),
                           curve((495,128),(493,-43),(191,-40),(101,73))),v*.88))
    put('t',465,stem(186,105,663,head=False,foot=False),
        line(curve((186,107),(189,-5),(290,-24),(405,20)),v*.85),
        rect(70,460,420,460+h))
    put('u',675,line(path([(140,477),(140,194)],
                      curve((140,194),(140,-66),(540,-64),(540,194)),
                      [(540,194),(540,477)]),v*.90),
        serif(540,0,165))
    put('v',630,line([(106,477),(315,0),(526,477)],v*.88),serif(315,0,125))
    put('w',885,line([(88,477),(206,0),(441,349),(676,0),(797,477)],v*.86),
        serif(206,0,116),serif(676,0,116))
    put('x',620,line([(112,477),(509,0)],v*.87),line([(509,477),(112,0)],v*.87),
        serif(112,0,135),serif(509,0,135))
    put('y',630,line([(106,477),(315,0),(526,477)],v*.88),
        line([(315,0),(196,-232)],v*.88))
    put('z',585,rect(104,477-h,496,477),line([(468,445),(132,33)],v*.83),
        rect(100,0,503,h))

    # Numerals are proportional but share baseline and cap-height. Bulky slabs
    # give count-downs and score graphics a readable silhouette at phone size.
    put('0',680,ring(340,360,242,364),line([(173,104),(502,606)],fine*.85))
    put('1',490,line([(151,561),(280,720),(300,0)],v),serif(298,0,272))
    put('2',650,line(path(curve((115,535),(112,776),(542,778),(555,533)),
                           curve((555,533),(557,365),(303,170),(132,32))),v*.92),
        rect(108,0,585,h),rect(532,0,585,95))
    put('3',645,line(path(curve((130,608),(215,758),(552,767),(553,534)),
                           curve((553,534),(552,410),(435,362),(300,359)),
                           curve((300,359),(470,357),(560,278),(559,152)),
                           curve((559,152),(557,-57),(230,-58),(118,93))),v*.92))
    put('4',670,line([(465,0),(465,720),(92,211),(575,211)],v*.92),serif(465,0,167))
    put('5',645,line(path([(558,720),(161,720),(136,381)],
                           curve((136,381),(333,456),(560,365),(560,177)),
                           curve((560,177),(558,-57),(230,-56),(117,92))),v*.91))
    put('6',650,line(path(curve((533,633),(356,799),(127,576),(134,245)),
                           curve((134,245),(140,-54),(551,-60),(552,205)),
                           curve((552,205),(555,443),(288,460),(134,245))),v*.92))
    put('7',635,rect(86,720-h,590,720),line([(548,678),(261,0)],v*.9),serif(261,0,160))
    put('8',640,ring(320,535,179,186,v*.94,h*.94),ring(320,177,209,181,v*.94,h*.94))
    put('9',650,line(path(curve((123,85),(307,-100),(552,143),(547,470)),
                           curve((547,470),(541,776),(130,774),(127,503)),
                           curve((127,503),(124,273),(389,256),(547,470))),v*.92))

    # Printable ASCII punctuation plus typographic marks for captions.
    put(' ',350)
    put('.',255,dot(127,43,39))
    put(',',255,dot(133,45,38),line([(133,35),(101,-88)],fine*.75))
    put(':',260,dot(130,43,38),dot(130,402,38))
    put(';',260,dot(130,402,38),dot(130,45,38),line([(130,33),(99,-88)],fine*.75))
    put('!',295,rect(126,178,163,720),dot(145,43,39))
    put('?',560,line(path(curve((92,546),(91,771),(469,779),(475,548)),
                           curve((475,548),(474,398),(283,420),(281,234))),v*.77),dot(282,43,38))
    put("'",245,line([(143,720),(99,507)],fine))
    put('"',415,line([(129,720),(97,507)],fine),line([(298,720),(266,507)],fine))
    put('-',385,rect(80,269,305,269+fine))
    put('_',550,rect(55,-95,500,-95+fine))
    put('+',620,rect(301,93,301+fine,550),rect(80,315,538,315+fine))
    put('=',620,rect(80,407,538,407+fine),rect(80,203,538,203+fine))
    put('/',540,line([(92,-130),(452,769)],fine))
    put('\\',540,line([(92,769),(452,-130)],fine))
    put('(',400,line(curve((327,799),(74,645),(74,14),(327,-110)),fine))
    put(')',400,line(curve((73,799),(326,645),(326,14),(73,-110)),fine))
    put('[',365,line([(292,775),(111,775),(111,-93),(292,-93)],fine))
    put(']',365,line([(73,775),(254,775),(254,-93),(73,-93)],fine))
    put('{',420,line(path(curve((340,775),(169,775),(153,625),(153,464)),
                           curve((153,464),(153,364),(108,339),(63,339)),
                           curve((63,339),(108,339),(153,315),(153,215)),
                           curve((153,215),(153,43),(169,-93),(340,-93))),fine))
    put('}',420,line(path(curve((80,775),(251,775),(267,625),(267,464)),
                           curve((267,464),(267,364),(312,339),(357,339)),
                           curve((357,339),(312,339),(267,315),(267,215)),
                           curve((267,215),(267,43),(251,-93),(80,-93))),fine))
    put('|',275,rect(119,-130,119+fine,790))
    put('*',440,line([(220,411),(220,720)],fine),line([(81,484),(359,644)],fine),
        line([(80,642),(358,485)],fine))
    put('^',570,line([(72,352),(285,720),(498,352)],fine))
    put('~',620,line(path(curve((70,280),(142,428),(234,416),(310,306)),
                           curve((310,306),(383,205),(477,199),(550,366))),fine))
    put('<',540,line([(461,550),(79,321),(461,93)],fine))
    put('>',540,line([(79,550),(461,321),(79,93)],fine))
    put('#',680,line([(230,720),(140,0)],fine),line([(532,720),(442,0)],fine),
        rect(70,464,610,464+fine),rect(45,226,585,226+fine))
    put('$',690,line(path(curve((592,607),(510,757),(143,764),(132,556)),
                           curve((132,556),(123,372),(598,440),(598,179)),
                           curve((598,179),(597,-56),(237,-51),(119,97))),v*.88),
        rect(332,-96,332+fine,796))
    put('%',810,line([(100,0),(708,720)],fine),
        ring(210,551,112,130,fine,fine),ring(604,157,112,130,fine,fine))
    put('&',785,line(path(curve((677,52),(505,-80),(176,-55),(135,150)),
                           curve((135,150),(91,308),(359,408),(424,490)),
                           curve((424,490),(552,659),(369,779),(243,667)),
                           curve((243,667),(90,536),(343,247),(673,0))),v*.85))
    put('@',860,ring(427,335,320,346,v*.82,h*.82),
        ring(439,310,165,175,v*.78,h*.78),rect(576,221,576+fine,480))
    put('`',245,line([(89,720),(146,581)],fine))
    put('…',785,dot(130,43,38),dot(393,43,38),dot(656,43,38))
    put('–',560,rect(60,269,500,269+fine))
    put('—',830,rect(60,269,770,269+fine))
    put('‘',245,line([(137,719),(93,500)],fine))
    put('’',245,line([(137,719),(93,500)],fine))
    put('“',415,line([(130,719),(94,500)],fine),line([(299,719),(263,500)],fine))
    put('”',415,line([(130,719),(94,500)],fine),line([(299,719),(263,500)],fine))
    put('•',350,dot(175,275,45))
    put('€',730,line(arc(361,360,258,364,44,315)),rect(64,451,482,451+fine),
        rect(62,270,480,270+fine))
    put('£',700,line(path(curve((585,584),(544,780),(220,776),(201,536)),
                           curve((201,536),(213,357),(194,180),(112,0))),v*.87),
        rect(75,342,452,342+fine),rect(105,0,604,fine))
    put('¥',735,line([(78,720),(368,361),(658,720)],v*.87),stem(368,0,370,head=False),
        rect(160,298,575,298+fine),rect(160,179,575,179+fine))
    put('°',390,ring(195,572,111,125,fine,fine))
    put('©',735,ring(367,354,307,336,fine,fine),line(arc(365,354,160,191,49,313),fine))
    put('®',735,ring(367,354,307,336,fine,fine),rect(275,213,275+fine,504),
        line(arc(370,427,90,79,-90,90),fine),line([(374,350),(472,207)],fine))

    # The accents are drawn from this family's own strokes and placed against
    # each glyph's actual advance; narrow i/I therefore have centered marks.
    def accent(kind,top,cx):
        if kind=='acute': return line([(cx-42,top+40),(cx+60,top+150)],fine*.79)
        if kind=='grave': return line([(cx-60,top+150),(cx+42,top+40)],fine*.79)
        if kind=='circ': return line([(cx-107,top+40),(cx,top+146),(cx+107,top+40)],fine*.70)
        if kind=='tilde':
            return line(path(curve((cx-112,top+62),(cx-70,top+160),(cx-26,top+139),(cx,top+94)),
                             curve((cx,top+94),(cx+35,top+39),(cx+82,top+52),(cx+113,top+130))),fine*.66)
        if kind=='dots': return unary_union([dot(cx-73,top+112,30),dot(cx+73,top+112,30)])
        if kind=='ring': return ring(cx,top+112,69,69,fine*.69,fine*.69)
        if kind=='caron': return line([(cx-107,top+146),(cx,top+40),(cx+107,top+146)],fine*.70)
        raise ValueError(kind)

    accented={
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
    for base,variants in accented.items():
        advance,base_shape=designs[base]
        top=720 if base.isupper() else 490
        center=advance/2
        # Replace the i dot with the accent, rather than overprinting it.
        if base=='i': base_shape=stem(171,0,477,head=False)
        for letter,kind in variants.items():
            put(letter,advance,base_shape,accent(kind,top,center))
    cedilla=line(path(curve((322,-4),(358,-71),(367,-89),(321,-119)),
                      curve((321,-119),(290,-144),(248,-124),(234,-171))),fine*.75)
    put('ç',designs['c'][0],designs['c'][1],cedilla)
    put('Ç',designs['C'][0],designs['C'][1],cedilla)
    put('ø',designs['o'][0],designs['o'][1],line([(141,-35),(514,520)],fine*.81))
    put('Ø',designs['O'][0],designs['O'][1],line([(154,-43),(629,765)],fine*.81))
    put('ł',designs['l'][0],designs['l'][1],line([(72,275),(289,421)],fine*.79))
    put('Ł',designs['L'][0],designs['L'][1],line([(53,274),(397,473)],fine*.79))

    put('�',720,line([(88,0),(88,720),(631,720),(631,0),(88,0)],fine),
        line([(115,23),(601,693)],fine*.7))

    assert all(chr(n) in designs for n in range(32,127)), 'Missing ASCII glyph'
    return designs


def outline(shape):
    pen=TTGlyphPen(None)
    def polys(obj):
        if isinstance(obj,Polygon): yield obj
        elif isinstance(obj,(MultiPolygon,GeometryCollection)):
            for child in obj.geoms: yield from polys(child)
    for poly in polys(shape):
        poly=orient(poly,sign=-1.0)
        for ring in [poly.exterior,*poly.interiors]:
            points=list(ring.coords)[:-1]
            if len(points)<3: continue
            pen.moveTo(tuple(map(round,points[0])))
            for point in points[1:]: pen.lineTo(tuple(map(round,point)))
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
    glyphs,metrics,cmap={},{},{}
    for ch,(advance,shape) in drawings.items():
        name=glyph_name(ch)
        glyphs[name]=outline(shape)
        metrics[name]=(advance,round(shape.bounds[0]) if not shape.is_empty else 0)
        if ch!='�': cmap[ord(ch)]=name
    fb=FontBuilder(1000,isTTF=True)
    fb.setupGlyphOrder(order)
    fb.setupCharacterMap(cmap)
    fb.setupGlyf(glyphs)
    fb.setupHorizontalMetrics(metrics)
    fb.setupHorizontalHeader(ascent=1080,descent=-360,lineGap=0)
    fb.setupNameTable({
        'familyName':'FM Foundry Slab','styleName':style,
        'uniqueFontIdentifier':'FreeMotion original FM Foundry Slab '+style+' 1.0',
        'fullName':'FM Foundry Slab '+style,
        'psName':'FMFoundrySlab-'+style,
        'version':'Version 1.000',
        'designer':'FreeMotion original type design',
        'description':'Original broad industrial slab-serif display face for FreeMotion.',
    })
    fb.setupOS2(version=4,fsType=0,sTypoAscender=1080,sTypoDescender=-360,
                sTypoLineGap=0,usWinAscent=1080,usWinDescent=360,
                sxHeight=490,sCapHeight=720,usWeightClass=700 if bold else 400,
                usWidthClass=5,fsSelection=0x20 if bold else 0x40)
    fb.setupPost(italicAngle=0,underlinePosition=-128,underlineThickness=58)
    fb.setupMaxp()
    font=fb.font
    font['head'].macStyle=1 if bold else 0
    font['head'].created=font['head'].modified=CREATED
    font.recalcTimestamp=False
    pairs=[('A','V',-34),('A','W',-30),('A','Y',-38),('A','T',-30),
           ('L','T',-35),('L','V',-29),('L','Y',-37),('P','A',-24),
           ('T','a',-34),('T','e',-35),('T','o',-34),('V','a',-35),
           ('V','o',-35),('W','a',-28),('Y','a',-41),('Y','o',-41)]
    addOpenTypeFeaturesFromString(font,'feature kern {\n'+
        ''.join(f' pos {a} {b} {amount};\n' for a,b,amount in pairs)+'} kern;\n')
    slug='fm-foundry-slab-'+style.lower()
    ttf,woff=stage/(slug+'.ttf'),stage/(slug+'.woff2')
    font.save(ttf)
    font.flavor='woff2'
    font.save(woff)
    return ttf,woff,len(cmap)


def main():
    with tempfile.TemporaryDirectory(prefix='.foundry-build-',dir=DEST) as temporary:
        stage=Path(temporary)
        files=[build('Regular',85,stage),build('Bold',118,stage)]
        TTF_DEST.mkdir(exist_ok=True)
        for ttf,woff,count in files:
            if woff.stat().st_size<1000:
                raise RuntimeError('Incomplete face: '+woff.name)
            os.replace(ttf,TTF_DEST/ttf.name)
            os.replace(woff,DEST/woff.name)
            print(f'{woff.name}: {(DEST/woff.name).stat().st_size} bytes, {count} mapped characters')


if __name__=='__main__':
    main()
