#!/usr/bin/env python3
"""Draw FM Palais Deco from original narrow arches and engraved stems.

No existing font, glyph image, outline or metrics enters this generator. Its
letter skeletons, inset channels and supporting lowercase are placed here.
"""
from __future__ import annotations

import math
import os
import tempfile
import unicodedata
from pathlib import Path

from fontTools.feaLib.builder import addOpenTypeFeaturesFromString
from fontTools.fontBuilder import FontBuilder
from fontTools.pens.ttGlyphPen import TTGlyphPen
from shapely import affinity
from shapely.geometry import GeometryCollection, LineString, MultiPolygon, Point, Polygon
from shapely.geometry.polygon import orient
from shapely.ops import substring, unary_union

HERE = Path(__file__).resolve().parent
DEST = HERE.parent
TTF_DEST = HERE / 'fonts'
CREATED = 3873903662


def curve(a,b,c,d,n=26):
    return [((1-t)**3*a[0]+3*(1-t)**2*t*b[0]+3*(1-t)*t*t*c[0]+t**3*d[0],
             (1-t)**3*a[1]+3*(1-t)**2*t*b[1]+3*(1-t)*t*t*c[1]+t**3*d[1])
            for t in (i/n for i in range(n+1))]


def link(*sections):
    out=[]
    for section in sections: out.extend(section if not out else section[1:])
    return out


def ell(cx,cy,rx,ry,start=0,end=360,n=70):
    return [(cx+rx*math.cos(math.radians(start+(end-start)*i/n)),
             cy+ry*math.sin(math.radians(start+(end-start)*i/n))) for i in range(n+1)]


def design(bold=False):
    # The channel is a white engraving inside each display stroke. Long arcs
    # keep it continuous; short bars remain solid so 32 px words stay legible.
    display=195 if bold else 162
    support=154 if bold else 126
    bar=105 if bold else 82
    channel=38 if bold else 35
    glyphs={}

    def stroke(points,width=display,cut=True,round_cap=False):
        line=LineString(points)
        cap=1 if round_cap else 2
        outer=line.buffer(width/2,cap_style=cap,join_style=1,quad_segs=12)
        if not cut or width<95 or line.length<170: return outer
        # Keep solid terminals and crossings. Closed loops are engraved all
        # the way around; open strokes leave a 63-unit uncut terminal.
        closed=points[0]==points[-1]
        inner=line if closed else substring(line,63,line.length-63)
        return outer.difference(inner.buffer(channel/2,cap_style=1,join_style=1,quad_segs=9))

    def arc(cx,cy,rx,ry,start,end,width=display,cut=True):
        return stroke(ell(cx,cy,rx,ry,start,end),width,cut,True)

    def dot(cx,cy,r=None):
        return Point(cx,cy).buffer(r or (41 if bold else 32),quad_segs=14)

    def put(ch,advance,*forms):
        glyphs[ch]=(advance,unary_union([f for f in forms if not f.is_empty]) if forms else GeometryCollection())

    # Tall narrow capitals: open architecture, low bars and white inset
    # channels. Their proportions and joints are independent of the previous
    # stencil's chamfered small caps or the sans families' broad geometry.
    put('A',615,stroke([(105,0),(304,747),(510,0)]),stroke([(176,248),(437,248)],bar,False))
    put('B',620,stroke([(125,0),(125,747)]),
        stroke(link([(126,747),(345,747)],curve((345,747),(571,747),(568,423),(346,390)),[(346,390),(126,390)])),
        stroke(link([(126,390),(352,390)],curve((352,390),(585,382),(590,0),(352,0)),[(352,0),(126,0)])))
    put('C',610,arc(304,374,204,374,45,315))
    put('D',640,stroke([(124,0),(124,747),(342,747)]),
        stroke(link(curve((342,747),(596,748),(589,547),(589,374)),
                    curve((589,374),(589,197),(596,0),(342,0)),[(342,0),(124,0)])))
    put('E',587,stroke([(490,747),(125,747),(125,0),(490,0)]),
        stroke([(125,379),(441,379)],bar,False))
    put('F',579,stroke([(125,0),(125,747),(490,747)]),
        stroke([(125,379),(439,379)],bar,False))
    put('G',642,arc(314,374,211,374,46,313),stroke([(360,350),(539,350),(539,104)],bar,False))
    put('H',668,stroke([(126,0),(126,747)]),stroke([(542,0),(542,747)]),
        stroke([(126,374),(542,374)],bar,False))
    put('I',310,stroke([(155,0),(155,747)]),stroke([(64,747),(247,747)],bar,False),
        stroke([(64,0),(247,0)],bar,False))
    put('J',578,stroke([(73,747),(485,747),(485,159)]),
        stroke(curve((485,159),(485,-32),(139,-53),(99,157))))
    put('K',625,stroke([(124,0),(124,747)]),
        stroke([(519,747),(127,343),(529,0)]))
    put('L',565,stroke([(124,747),(124,0),(481,0)]))
    put('M',760,stroke([(112,0),(112,747),(379,263),(648,747),(648,0)]))
    put('N',660,stroke([(123,0),(123,747),(538,0),(538,747)]))
    put('O',645,stroke(ell(322,374,218,374),round_cap=True))
    put('P',612,stroke([(124,0),(124,747),(349,747)]),
        stroke(link(curve((349,747),(577,747),(577,386),(349,386)),[(349,386),(124,386)])))
    put('Q',645,stroke(ell(322,374,218,374),round_cap=True),
        stroke([(405,162),(554,-82)],bar,False))
    put('R',626,stroke([(124,0),(124,747),(349,747)]),
        stroke(link(curve((349,747),(577,747),(577,386),(349,386)),[(349,386),(124,386)])),
        stroke([(320,386),(539,0)]))
    put('S',600,stroke(link(curve((501,623),(391,803),(106,776),(106,542)),
                        curve((106,542),(106,372),(495,423),(501,207)),
                        curve((501,207),(511,-52),(201,-68),(93,111)))))
    put('T',606,stroke([(64,747),(542,747)],bar,False),stroke([(303,747),(303,0)]))
    put('U',658,stroke(link([(123,747),(123,191)],curve((123,191),(123,-70),(535,-69),(535,191)),[(535,191),(535,747)])))
    put('V',619,stroke([(93,747),(310,0),(526,747)]))
    put('W',830,stroke([(88,747),(203,0),(415,517),(628,0),(743,747)]))
    put('X',616,stroke([(111,747),(505,0)]),stroke([(505,747),(111,0)]))
    put('Y',619,stroke([(93,747),(310,374),(526,747)]),stroke([(310,374),(310,0)]))
    put('Z',601,stroke([(95,747),(505,747),(95,0),(505,0)]))

    # Intentional 80%-height small caps keep mixed-case title text in the
    # same engraved visual language. The source capitals are original paths
    # drawn above; no external glyph is scaled or imported.
    for upper in 'ABCDEFGHIJKLMNOPQRSTUVWXYZ':
        advance, shape = glyphs[upper]
        glyphs[upper.lower()] = (round(advance*.88), affinity.scale(shape,xfact=.88,yfact=.80,origin=(0,0)))

    put('0',629,stroke(ell(314,374,204,374),round_cap=True),stroke([(382,559),(248,191)],bar,False))
    put('1',414,stroke([(214,0),(214,747)]),stroke([(77,0),(351,0)],bar,False),
        stroke([(89,544),(214,747)],bar,False))
    put('2',589,stroke(link(curve((99,558),(100,777),(501,806),(501,547)),
                        curve((501,547),(501,380),(307,187),(98,0)),[(98,0),(505,0)])))
    put('3',589,stroke(link(curve((97,621),(198,774),(493,771),(493,549)),
                        curve((493,549),(493,434),(397,376),(256,370)),
                        curve((256,370),(402,368),(499,276),(499,149)),
                        curve((499,149),(499,-63),(198,-61),(93,88)))))
    put('4',603,stroke([(422,0),(422,747)]),stroke([(76,218),(520,218)],bar,False),
        stroke([(77,218),(422,747)]))
    put('5',587,stroke(link([(486,747),(111,747),(111,400)],
                        curve((111,400),(282,450),(497,379),(497,176)),
                        curve((497,176),(497,-58),(194,-59),(94,93)))))
    put('6',599,stroke(link(curve((492,629),(347,811),(98,620),(98,323)),
                        curve((98,323),(98,121),(180,-46),(309,-46)),
                        curve((309,-46),(492,-46),(512,164),(496,313)),
                        curve((496,313),(469,484),(205,476),(98,313)))))
    put('7',590,stroke([(79,747),(509,747),(217,0)]))
    put('8',603,stroke(ell(302,559,150,188),round_cap=True),
        stroke(ell(302,181,172,187),round_cap=True))
    put('9',599,stroke(link(curve((105,93),(249,-60),(499,122),(499,414)),
                        curve((499,414),(499,632),(425,773),(295,773)),
                        curve((295,773),(98,773),(89,562),(106,408)),
                        curve((106,408),(135,239),(381,253),(499,408)))))

    # Printable ASCII punctuation and useful typography. Fine signs stay
    # solid, avoiding busy engraving in symbols smaller than a letter.
    put(' ',285)
    put('.',228,dot(114,50))
    put(',',230,dot(114,57),stroke([(114,46),(82,-87)],bar,False))
    put(':',230,dot(114,61),dot(114,438))
    put(';',230,dot(114,438),dot(114,57),stroke([(114,46),(82,-87)],bar,False))
    put('!',278,stroke([(139,747),(139,202)],support,False),dot(139,52))
    put('?',516,stroke(link(curve((95,554),(96,789),(432,804),(433,571)),
                        curve((433,571),(433,416),(258,419),(258,243))),support,False),dot(258,54))
    put("'",220,stroke([(108,747),(96,533)],bar,False))
    put('"',371,stroke([(104,747),(92,533)],bar,False),stroke([(272,747),(260,533)],bar,False))
    put('-',352,stroke([(78,268),(274,268)],bar,False))
    put('_',508,stroke([(72,-84),(436,-84)],bar,False))
    put('+',535,stroke([(268,105),(268,563)],bar,False),stroke([(67,334),(469,334)],bar,False))
    put('=',535,stroke([(68,443),(468,443)],bar,False),stroke([(68,229),(468,229)],bar,False))
    put('/',480,stroke([(75,-101),(403,795)],bar,False))
    put('\\',480,stroke([(75,795),(403,-101)],bar,False))
    put('(',324,stroke(curve((251,798),(59,612),(59,84),(251,-100)),bar,False))
    put(')',324,stroke(curve((73,798),(265,612),(265,84),(73,-100)),bar,False))
    put('[',325,stroke([(246,783),(100,783),(100,-91),(246,-91)],bar,False))
    put(']',325,stroke([(79,783),(225,783),(225,-91),(79,-91)],bar,False))
    put('{',365,stroke(link(curve((294,783),(154,783),(142,633),(142,472)),
                            curve((142,472),(142,381),(84,350),(54,344)),
                            curve((54,344),(84,338),(142,307),(142,216)),
                            curve((142,216),(154,56),(154,-91),(294,-91))),bar,False))
    put('}',365,stroke(link(curve((71,783),(211,783),(223,633),(223,472)),
                            curve((223,472),(223,381),(281,350),(311,344)),
                            curve((311,344),(281,338),(223,307),(223,216)),
                            curve((223,216),(211,56),(211,-91),(71,-91))),bar,False))
    put('|',218,stroke([(109,-118),(109,803)],bar,False))
    put('*',390,stroke([(195,439),(195,747)],bar,False),stroke([(78,503),(312,661)],bar,False),
        stroke([(78,661),(312,503)],bar,False))
    put('^',504,stroke([(77,370),(252,747),(428,370)],bar,False))
    put('~',555,stroke(link(curve((70,306),(128,440),(210,429),(278,312)),
                            curve((278,312),(353,192),(426,202),(487,391))),bar,False))
    put('<',496,stroke([(411,553),(84,334),(411,112)],bar,False))
    put('>',496,stroke([(84,553),(411,334),(84,112)],bar,False))
    put('#',595,stroke([(206,747),(131,0)],bar,False),stroke([(462,747),(389,0)],bar,False),
        stroke([(65,481),(530,481)],bar,False),stroke([(45,246),(510,246)],bar,False))
    put('$',617,stroke(link(curve((502,624),(390,806),(108,779),(106,553)),
                        curve((106,553),(106,378),(508,421),(508,187)),
                        curve((508,187),(508,-51),(199,-70),(93,93))),support,False),
        stroke([(309,816),(309,-91)],bar,False))
    put('%',734,stroke([(115,0),(619,747)],bar,False),
        stroke(ell(196,577,78,101),support,False,True),stroke(ell(539,166,78,101),support,False,True))
    put('&',725,stroke(link(curve((609,79),(499,-71),(151,-73),(134,140)),
                        curve((134,140),(108,309),(280,401),(372,503)),
                        curve((372,503),(485,640),(359,801),(235,667)),
                        curve((235,667),(117,538),(212,352),(614,0))),support,False))
    put('@',788,arc(392,359,283,336,41,336,bar,False),
        stroke(ell(412,322,132,156),support,False,True),stroke([(544,476),(544,191)],bar,False))
    put('`',225,stroke([(97,747),(147,607)],bar,False))
    put('…',660,dot(112,51),dot(330,51),dot(548,51))
    put('–',500,stroke([(70,268),(430,268)],bar,False))
    put('—',728,stroke([(70,268),(658,268)],bar,False))
    put('‘',220,stroke([(121,747),(89,533)],bar,False))
    put('’',220,stroke([(121,747),(89,533)],bar,False))
    put('“',371,stroke([(105,747),(77,533)],bar,False),stroke([(273,747),(245,533)],bar,False))
    put('”',371,stroke([(105,747),(77,533)],bar,False),stroke([(273,747),(245,533)],bar,False))
    put('•',320,dot(160,271,51))
    put('·',228,dot(114,350))
    put('°',352,stroke(ell(176,598,88,102),bar,False,True))
    put('€',615,arc(307,374,204,374,45,315),stroke([(80,464),(399,464)],bar,False),
        stroke([(80,281),(399,281)],bar,False))
    put('£',626,stroke(link(curve((493,623),(449,791),(194,789),(164,580)),
                        curve((164,580),(139,403),(180,168),(93,0))),support,False),
        stroke([(73,366),(403,366)],bar,False),stroke([(93,0),(518,0)],bar,False))
    put('¥',619,stroke([(93,747),(310,374),(526,747)],support,False),
        stroke([(310,374),(310,0)],support,False),stroke([(158,286),(462,286)],bar,False))
    put('©',702,stroke(ell(351,363,270,327),bar,False,True),arc(351,363,130,181,45,315,support,False))
    put('®',702,stroke(ell(351,363,270,327),bar,False,True),stroke([(270,219),(270,502)],bar,False),
        arc(352,431,82,72,-90,90,bar,False),stroke([(345,358),(442,220)],bar,False))

    marks={'\u0300':'grave','\u0301':'acute','\u0302':'circumflex','\u0303':'tilde',
           '\u0308':'diaeresis','\u030a':'ring','\u030c':'caron','\u0327':'cedilla'}
    def mark(kind,x,y):
        if kind=='acute': return stroke([(x-43,y+22),(x+56,y+134)],bar,False)
        if kind=='grave': return stroke([(x-52,y+134),(x+42,y+22)],bar,False)
        if kind=='circumflex': return stroke([(x-65,y+25),(x,y+108),(x+65,y+25)],bar,False)
        if kind=='caron': return stroke([(x-65,y+108),(x,y+25),(x+65,y+108)],bar,False)
        if kind=='tilde': return stroke(curve((x-76,y+49),(x-17,y+121),(x+12,y+14),(x+74,y+95)),bar,False)
        if kind=='diaeresis': return unary_union([dot(x-53,y+83,22),dot(x+56,y+83,22)])
        if kind=='ring': return stroke(ell(x,y+83,48,48),bar,False,True)
        return stroke(curve((x+15,-26),(x-20,-97),(x+5,-157),(x+58,-129)),bar,False)
    for cp in range(0x00c0,0x0180):
        ch=chr(cp); decomp=unicodedata.normalize('NFD',ch)
        if len(decomp)!=2 or decomp[0] not in glyphs or decomp[1] not in marks: continue
        base=decomp[0]
        if not base.isalpha() or not base.isascii(): continue
        adv,shape=glyphs[base]
        top=762 if base.isupper() else 600
        glyphs[ch]=(adv,unary_union([shape,mark(marks[decomp[1]],adv/2,top+28)]))
    glyphs['\ufffd']=(620,unary_union([stroke([(88,0),(88,747),(530,747),(530,0),(88,0)],bar,False),
                                       stroke([(88,0),(530,747)],bar,False)]))
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
    fb.setupHorizontalHeader(ascent=1050,descent=-300,lineGap=0)
    fb.setupNameTable({'familyName':'FM Palais Deco','styleName':style,
        'uniqueFontIdentifier':'FreeMotion original FM Palais Deco '+style+' 1.0',
        'fullName':'FM Palais Deco '+style,'psName':'FMPalaisDeco-'+style,
        'version':'Version 1.000','designer':'FreeMotion original type design',
        'description':'Original engraved Art Deco display lettering with narrow arches.'})
    fb.setupOS2(version=4,fsType=0,sTypoAscender=1050,sTypoDescender=-300,
        sTypoLineGap=0,usWinAscent=1050,usWinDescent=300,sxHeight=598,
        sCapHeight=747,usWeightClass=700 if style=='Bold' else 400,
        usWidthClass=3,fsSelection=0x20 if style=='Bold' else 0x40)
    fb.setupPost(italicAngle=0,underlinePosition=-145,underlineThickness=71)
    fb.setupMaxp()
    font=fb.font; font['head'].macStyle=1 if style=='Bold' else 0
    font['head'].created=font['head'].modified=CREATED
    font.recalcTimestamp=False
    pairs={'A':'VWYT','L':'TVWY','T':'Aaeo','V':'Aaeo','W':'Aao','Y':'Aaeo','F':'Ao','P':'ao'}
    rules=['pos %s %s -%d;'%(left,right,31 if left.isupper() else 20)
           for left,rights in pairs.items() for right in rights]
    addOpenTypeFeaturesFromString(font,'feature kern {\n'+'\n'.join(rules)+'\n} kern;')
    stem='fm-palais-deco-'+style.lower()
    ttf=stage/(stem+'.ttf'); woff=stage/(stem+'.woff2')
    font.save(ttf); font.flavor='woff2'; font.save(woff)
    return ttf,woff,len(cmap)


def main():
    with tempfile.TemporaryDirectory(prefix='.palais-deco-build-',dir=DEST) as temp:
        built=[build('Regular',Path(temp)),build('Bold',Path(temp))]
        TTF_DEST.mkdir(exist_ok=True)
        for ttf,woff,count in built:
            if woff.stat().st_size<1000: raise RuntimeError('Incomplete font '+woff.name)
            os.replace(ttf,TTF_DEST/ttf.name)
            os.replace(woff,DEST/woff.name)
            print(f'{woff.name}: {(DEST/woff.name).stat().st_size} bytes, {count} mapped characters')


if __name__=='__main__': main()
