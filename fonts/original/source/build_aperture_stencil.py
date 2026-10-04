#!/usr/bin/env python3
"""Draw the original FM Aperture Stencil from plotted, open geometric strokes.

Every master contour below is a FreeMotion drawing. No font file, source
outline, glyph image or traced artwork is loaded. Lowercase deliberately uses
small caps: it is a display face for titles rather than a body-text sans.
"""
from __future__ import annotations

import os
import tempfile
import unicodedata
from pathlib import Path

from fontTools.feaLib.builder import addOpenTypeFeaturesFromString
from fontTools.fontBuilder import FontBuilder
from fontTools.pens.ttGlyphPen import TTGlyphPen
from shapely import affinity
from shapely.geometry import GeometryCollection, LineString, MultiPolygon, Polygon, box
from shapely.geometry.polygon import orient
from shapely.ops import unary_union

HERE = Path(__file__).resolve().parent
DEST = HERE.parent
TTF_DEST = HERE / 'fonts'
CREATED = 3873903662

# Paths sit on a 720-unit cap height. Chamfered bowls, open counter bridges,
# wide square terminals and a fixed 58-unit stencil gap give the face its own
# construction. The lowercase is intentionally a 76%-height small-cap alphabet.
CAPS = {
 'A': (650, [[(86,40),(320,760),(554,40)],[(171,291),(468,291)]]),
 'B': (660, [[(117,40),(117,760),(430,760),(531,662),(531,489),(430,400),(117,400)],[(117,400),(441,400),(542,301),(542,142),(441,40),(117,40)]]),
 'C': (650, [[(535,649),(430,760),(215,760),(105,650),(105,150),(215,40),(430,40),(535,151)]]),
 'D': (680, [[(117,40),(117,760),(420,760),(552,628),(552,172),(420,40),(117,40)]]),
 'E': (600, [[(521,760),(117,760),(117,40),(521,40)],[(117,401),(474,401)]]),
 'F': (600, [[(117,40),(117,760),(521,760)],[(117,401),(474,401)]]),
 'G': (680, [[(550,642),(442,760),(215,760),(105,650),(105,150),(215,40),(442,40),(550,155),(550,368),(389,368)]]),
 'H': (690, [[(117,40),(117,760)],[(573,40),(573,760)],[(117,400),(573,400)]]),
 'I': (360, [[(83,760),(277,760)],[(180,760),(180,40)],[(83,40),(277,40)]]),
 'J': (610, [[(81,760),(518,760)],[(518,760),(518,158),(410,40),(190,40),(87,147)]]),
 'K': (660, [[(117,40),(117,760)],[(540,760),(117,375),(549,40)]]),
 'L': (590, [[(117,760),(117,40),(518,40)]]),
 'M': (830, [[(112,40),(112,760),(414,315),(716,760),(716,40)]]),
 'N': (700, [[(117,40),(117,760),(583,40),(583,760)]]),
 'O': (680, [[(215,760),(455,760),(560,650),(560,150),(455,40),(215,40),(105,150),(105,650),(215,760)]]),
 'P': (650, [[(117,40),(117,760),(430,760),(537,657),(537,503),(430,400),(117,400)]]),
 'Q': (680, [[(215,760),(455,760),(560,650),(560,150),(455,40),(215,40),(105,150),(105,650),(215,760)],[(388,257),(575,-61)]]),
 'R': (660, [[(117,40),(117,760),(430,760),(537,657),(537,503),(430,400),(117,400)],[(351,400),(550,40)]]),
 'S': (640, [[(530,657),(426,760),(214,760),(105,656),(105,522),(207,405),(438,388),(539,271),(539,145),(437,40),(207,40),(102,148)]]),
 'T': (640, [[(72,760),(568,760)],[(320,760),(320,40)]]),
 'U': (690, [[(114,760),(114,164),(231,40),(460,40),(576,164),(576,760)]]),
 'V': (660, [[(85,760),(329,40),(575,760)]]),
 'W': (900, [[(86,760),(227,40),(449,554),(673,40),(814,760)]]),
 'X': (660, [[(105,760),(555,40)],[(555,760),(105,40)]]),
 'Y': (660, [[(95,760),(329,401),(565,760)],[(329,401),(329,40)]]),
 'Z': (630, [[(94,760),(535,760),(94,40),(535,40)]]),
}

NUMBERS = {
 '0': (680, CAPS['O'][1]+[[(263,173),(402,627)]]),
 '1': (410, [[(94,596),(250,760),(250,40)],[(116,40),(386,40)]]),
 '2': (630, [[(104,631),(219,760),(430,760),(532,645),(532,504),(108,40),(534,40)]]),
 '3': (630, [[(105,651),(214,760),(424,760),(529,659),(529,504),(425,400),(255,400)],[(425,400),(529,296),(529,141),(424,40),(214,40),(105,151)]]),
 '4': (650, [[(475,40),(475,760),(85,273),(555,273)]]),
 '5': (630, [[(529,760),(117,760),(117,407),(420,407),(530,291),(530,149),(424,40),(215,40),(104,150)]]),
 '6': (640, [[(527,650),(427,760),(213,760),(105,646),(105,148),(214,40),(428,40),(532,147),(532,298),(427,405),(105,405)]]),
 '7': (630, [[(90,760),(544,760),(218,40)]]),
 '8': (650, [[(213,760),(436,760),(538,660),(538,521),(436,408),(213,408),(107,521),(107,660),(213,760)],[(213,408),(436,408),(538,294),(538,144),(436,40),(213,40),(107,144),(107,294),(213,408)]]),
 '9': (640, [[(534,394),(213,394),(105,505),(105,652),(213,760),(429,760),(534,652),(534,153),(429,40),(210,40),(107,150)]]),
}

# These rectangles are open bridges through a counter, not decorative ink.
# A simple size-up of a closed sans would retain the loops; this construction
# keeps the industrial stencil logic visible at title and 32 px sizes.
BRIDGES = {
 'A': [(126,335,230,395)], 'B': [(479,540,602,598),(490,228,612,286)],
 'D': [(500,364,620,430)], 'O': [(508,369,620,435)],
 'P': [(489,539,610,602)], 'Q': [(508,369,620,435)],
 'R': [(489,539,610,602)], '0': [(508,369,620,435)],
 '3': [(479,504,610,566)], '6': [(483,212,610,278)],
 '8': [(480,550,610,612),(480,213,610,275)],
 '9': [(483,542,610,608)],
}


def polyline(points, weight):
    return LineString(points).buffer(weight/2, cap_style=2, join_style=2, quad_segs=5)


def strokes(paths, weight):
    return unary_union([polyline(p, weight) for p in paths if len(p) >= 2]) if paths else GeometryCollection()


def plotted(ch, weight):
    advance, paths = (CAPS | NUMBERS)[ch]
    outline = strokes(paths, weight)
    for x0,y0,x1,y1 in BRIDGES.get(ch, []):
        outline = outline.difference(box(x0,y0,x1,y1))
    return advance, outline


def mark(kind, x, y, weight):
    paths = {
        'acute': [[(x-45,y),(x+60,y+100)]],
        'grave': [[(x+45,y),(x-60,y+100)]],
        'circumflex': [[(x-73,y),(x,y+75),(x+73,y)]],
        'tilde': [[(x-75,y+10),(x-30,y+57),(x+22,y+9),(x+78,y+59)]],
        'diaeresis': [[(x-55,y+30),(x-55,y+40)],[(x+55,y+30),(x+55,y+40)]],
        'ring': [[(x-43,y+35),(x,y+81),(x+43,y+35),(x,-2+y),(x-43,y+35)]],
        'caron': [[(x-73,y+71),(x,y),(x+73,y+71)]],
        'cedilla': [[(x+16,y),(x-20,y-92),(x+31,y-149),(x+69,y-112)]],
    }
    return strokes(paths[kind], max(35, weight*.68))


def punctuation(weight):
    w = weight
    P = {}
    def add(ch, adv, paths=(), dots=()):
        parts = [strokes(paths,w)]
        parts += [box(x-34,y-34,x+34,y+34) for x,y in dots]
        P[ch] = (adv,unary_union(parts))
    add(' ',300)
    add('!',320,[[(160,760),(160,257)]],[(160,77)])
    add('"',455,[[(135,760),(135,510)],[(320,760),(320,510)]])
    add('#',650,[[(220,760),(145,40)],[(485,760),(410,40)],[(84,515),(565,515)],[(67,278),(548,278)]])
    add('$',640,[[(528,654),(430,760),(204,760),(101,644),(101,527),(205,408),(433,392),(539,275),(539,147),(436,40),(205,40),(99,145)],[(320,874),(320,-73)]])
    add('%',850,[[(116,40),(730,760)],[(115,710),(115,540),(270,540),(270,710),(115,710)],[(580,260),(580,89),(735,89),(735,260),(580,260)]])
    add('&',720,[[(577,40),(431,188),(202,498),(139,597),(201,760),(339,760),(416,679),(416,565),(148,253),(148,130),(243,40),(436,40),(584,245)]])
    add("'",260,[[(130,760),(130,510)]])
    add('(',330,[[(254,760),(143,643),(100,401),(143,157),(254,40)]])
    add(')',330,[[(75,760),(186,643),(230,401),(186,157),(75,40)]])
    add('*',500,[[(250,700),(250,310)],[(80,603),(420,407)],[(80,407),(420,603)]])
    add('+',570,[[(285,603),(285,109)],[(80,356),(490,356)]])
    add(',',300,[],[(140,76)]); P[',']=(300,unary_union([P[','][1],strokes([[(145,55),(113,-84)]],w*.75)]))
    add('-',440,[[(79,354),(360,354)]])
    add('.',300,[],[(145,76)])
    add('/',560,[[(91,-58),(473,816)]])
    add(':',300,[],[(145,501),(145,76)])
    add(';',300,[],[(145,501),(145,76)]); P[';']=(300,unary_union([P[';'][1],strokes([[(145,55),(113,-84)]],w*.75)]))
    add('<',560,[[(471,656),(89,401),(471,145)]])
    add('=',570,[[(80,487),(490,487)],[(80,229),(490,229)]])
    add('>',560,[[(89,656),(471,401),(89,145)]])
    add('?',590,[[(96,641),(208,760),(405,760),(505,651),(505,531),(297,353),(297,250)]],[(297,75)])
    add('@',860,[[(666,152),(548,40),(249,40),(106,177),(106,631),(249,760),(568,760),(723,607),(723,315),(631,261),(552,308),(552,520),(471,590),(361,590),(266,490),(266,334),(356,247),(471,247),(552,308)]])
    add('[',370,[[(284,760),(111,760),(111,40),(284,40)]])
    add('\\',560,[[(91,816),(473,-58)]])
    add(']',370,[[(86,760),(259,760),(259,40),(86,40)]])
    add('^',570,[[(88,468),(285,760),(482,468)]])
    add('_',580,[[(83,-89),(498,-89)]])
    add('`',260,[[(85,806),(183,700)]])
    add('{',440,[[(340,760),(209,760),(209,524),(107,407),(209,287),(209,40),(340,40)]])
    add('|',270,[[(135,818),(135,-69)]])
    add('}',440,[[(100,760),(231,760),(231,524),(333,407),(231,287),(231,40),(100,40)]])
    add('~',630,[[(90,347),(191,446),(291,446),(390,347),(487,347),(565,430)]])
    return P


def design(weight):
    all_glyphs = {ch: plotted(ch, weight) for ch in CAPS | NUMBERS}
    # Deliberately unicase small caps. Shared masters within this new family,
    # never an imported typeface, give lowercase a consistent display texture.
    for upper in CAPS:
        adv, shape = all_glyphs[upper]
        all_glyphs[upper.lower()] = (round(adv*.78), affinity.scale(shape, xfact=.78, yfact=.70, origin=(0,40)))
    all_glyphs.update(punctuation(weight))
    all_glyphs['\ufffd'] = (650,strokes([[(88,40),(88,760),(558,760),(558,40),(88,40)],[(88,40),(558,760)]],weight*.8))
    assert all(chr(c) in all_glyphs for c in range(32,127))

    combos = {'\u0300':'grave','\u0301':'acute','\u0302':'circumflex','\u0303':'tilde',
              '\u0308':'diaeresis','\u030a':'ring','\u030c':'caron','\u0327':'cedilla'}
    for cp in list(range(0x00c0,0x0180)):
        ch=chr(cp)
        decomp=unicodedata.normalize('NFD',ch)
        if len(decomp)!=2 or decomp[0] not in all_glyphs or decomp[1] not in combos: continue
        base=decomp[0]; kind=combos[decomp[1]]
        if base not in CAPS and base not in [c.lower() for c in CAPS]: continue
        adv,shape=all_glyphs[base]
        height=760 if base.isupper() else 545
        y=0 if kind=='cedilla' else height+67
        all_glyphs[ch]=(adv,unary_union([shape,mark(kind,adv/2,y,weight)]))
    all_glyphs['•']=(360,box(138,329,222,413))
    all_glyphs['–']=(660,strokes([[(74,353),(586,353)]],weight))
    all_glyphs['—']=(940,strokes([[(71,353),(869,353)]],weight))
    all_glyphs['“']=(455,strokes([[(135,520),(135,760)],[(320,520),(320,760)]],weight))
    all_glyphs['”']=all_glyphs['“']
    all_glyphs['‘']=all_glyphs["'"]
    all_glyphs['’']=all_glyphs["'"]
    all_glyphs['€']=(680,unary_union([all_glyphs['C'][1],strokes([[(70,480),(418,480)],[(70,301),(418,301)]],weight*.8)]))
    all_glyphs['£']=(640,strokes([[(523,646),(433,760),(235,760),(136,638),(136,468),(445,468)],[(136,468),(136,40),(530,40)],[(82,279),(440,279)]],weight))
    all_glyphs['¥']=(660,unary_union([all_glyphs['Y'][1],strokes([[(192,287),(466,287)]],weight*.7)]))
    return all_glyphs


def name(ch):
    if ch=='\ufffd': return '.notdef'
    if ch==' ': return 'space'
    if ch.isascii() and ch.isalnum(): return ch
    return 'uni%04X' % ord(ch)


def contour(shape):
    pen=TTGlyphPen(None)
    shapes=[shape] if isinstance(shape,Polygon) else list(shape.geoms) if isinstance(shape,MultiPolygon) else []
    for piece in shapes:
        polygon=orient(piece,sign=-1.0)
        for ring in [polygon.exterior,*polygon.interiors]:
            coords=list(ring.coords)[:-1]
            if len(coords)<3: continue
            pen.moveTo(tuple(map(round,coords[0])))
            for p in coords[1:]: pen.lineTo(tuple(map(round,p)))
            pen.closePath()
    return pen.glyph()


def build(style,stage):
    shapes=design(125 if style=='Bold' else 88)
    order=['.notdef']+[name(ch) for ch in shapes if ch!='\ufffd']
    glyphs={name(ch):contour(shape) for ch,(_,shape) in shapes.items()}
    metrics={name(ch):(adv,round(shape.bounds[0]) if not shape.is_empty else 0) for ch,(adv,shape) in shapes.items()}
    cmap={ord(ch):name(ch) for ch in shapes if ch!='\ufffd'}
    fb=FontBuilder(1000,isTTF=True)
    fb.setupGlyphOrder(order); fb.setupCharacterMap(cmap); fb.setupGlyf(glyphs)
    fb.setupHorizontalMetrics(metrics)
    fb.setupHorizontalHeader(ascent=1050,descent=-220,lineGap=0)
    fb.setupNameTable({'familyName':'FM Aperture Stencil','styleName':style,
        'uniqueFontIdentifier':'FreeMotion original FM Aperture Stencil '+style+' 1.0',
        'fullName':'FM Aperture Stencil '+style,'psName':'FMApertureStencil-'+style,
        'version':'Version 1.000','designer':'FreeMotion original type design',
        'description':'Original open-counter industrial display stencil.'})
    fb.setupOS2(version=4,fsType=0,sTypoAscender=1050,sTypoDescender=-220,
        sTypoLineGap=0,usWinAscent=1050,usWinDescent=220,sxHeight=545,
        sCapHeight=760,usWeightClass=700 if style=='Bold' else 400,
        usWidthClass=5,fsSelection=0x20 if style=='Bold' else 0x40)
    fb.setupPost(italicAngle=0,underlinePosition=-135,underlineThickness=70)
    fb.setupMaxp()
    font=fb.font; font['head'].macStyle=1 if style=='Bold' else 0
    font['head'].created=font['head'].modified=CREATED
    font.recalcTimestamp=False
    pairs={'A':['V','W','Y','T'],'L':['T','V','W','Y'],'T':['A','O','e','o','a'],
           'V':['A','e','o'],'W':['A','a','o'],'Y':['A','e','o'],'F':['A','o']}
    feature='feature kern {\n'+'\n'.join('pos %s %s -30;'%(left,right) for left,rights in pairs.items() for right in rights)+'\n} kern;'
    addOpenTypeFeaturesFromString(font,feature)
    stem='fm-aperture-stencil-'+style.lower()
    ttf=stage/(stem+'.ttf'); woff=stage/(stem+'.woff2')
    font.save(ttf); font.flavor='woff2'; font.save(woff)
    return ttf,woff,len(cmap)


def main():
    with tempfile.TemporaryDirectory(prefix='.aperture-stencil-build-',dir=DEST) as temp:
        stage=Path(temp)
        built=[build('Regular',stage),build('Bold',stage)]
        TTF_DEST.mkdir(exist_ok=True)
        for ttf,woff,count in built:
            if woff.stat().st_size<1000: raise RuntimeError('Incomplete font '+woff.name)
            os.replace(ttf,TTF_DEST/ttf.name)
            os.replace(woff,DEST/woff.name)
            print(f'{woff.name}: {(DEST/woff.name).stat().st_size} bytes, {count} mapped characters')


if __name__=='__main__': main()
