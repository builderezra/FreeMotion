#!/usr/bin/env python3
"""Draw FM Ribbon Script from original, hand-placed calligraphic skeletons.

The broad descending strokes, light return strokes and rising joins are made
here, without loading or tracing another font. All coordinates are ours.
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
from shapely.ops import unary_union

HERE = Path(__file__).resolve().parent
DEST = HERE.parent
TTF_DEST = HERE / 'fonts'
CREATED = 3873903662


def cubic(a, b, c, d, n=28):
    return [((1-t)**3*a[0] + 3*(1-t)**2*t*b[0] + 3*(1-t)*t*t*c[0] + t**3*d[0],
             (1-t)**3*a[1] + 3*(1-t)**2*t*b[1] + 3*(1-t)*t*t*c[1] + t**3*d[1])
            for t in (i/n for i in range(n+1))]


def path(*parts):
    points = []
    for part in parts:
        points.extend(part if not points else part[1:])
    return points


def ellipse(cx, cy, rx, ry, start=0, end=360, n=60):
    return [(cx+rx*math.cos(math.radians(start+(end-start)*i/n)),
             cy+ry*math.sin(math.radians(start+(end-start)*i/n))) for i in range(n+1)]


def design(bold=False):
    broad = 116 if bold else 84
    fine = 39 if bold else 29
    middle = 84 if bold else 59
    glyphs = {}

    def ink(points, width=broad):
        return LineString(points).buffer(width/2, cap_style=1, join_style=1, quad_segs=12)

    def arc(cx, cy, rx, ry, start, end, width=broad):
        return ink(ellipse(cx, cy, rx, ry, start, end), width)

    def oval(cx, cy, rx, ry):
        # The left/down side is the broad stroke; the rising right is a hairline.
        return [arc(cx, cy, rx, ry, 90, 270), arc(cx, cy, rx, ry, 270, 450, fine)]

    def dot(x, y, radius=None):
        return Point(x, y).buffer(radius or (38 if bold else 29), quad_segs=12)

    def put(ch, advance, *forms):
        parts = [form for form in forms if not form.is_empty]
        shape = unary_union(parts) if parts else GeometryCollection()
        # The baseline remains fixed. A 12-degree shear gives the ribbon's
        # written angle while keeping the stated side bearings intentional.
        glyphs[ch] = (advance, affinity.skew(shape, xs=12, origin=(0, 0)))

    # Capitals have independent flowing constructions rather than scaled
    # lowercase or geometric sans masters.
    put('A', 770, ink(cubic((93, 3),(185, 3),(257, 481),(357, 731))),
        ink(cubic((357,731),(432,519),(492,144),(630,7)),middle),
        ink([(224,242),(507,242)],fine),
        ink(cubic((80,4),(169,-38),(235,3),(279,59)),fine))
    put('B', 718, ink([(172,0),(172,723)]),
        ink(path(cubic((168,721),(567,805),(641,510),(427,389)),
                 cubic((427,389),(649,355),(630,-27),(174,4))),middle),
        ink(cubic((75,6),(135,-35),(188,0),(226,39)),fine))
    put('C', 716, arc(375,356,250,351,46,313))
    put('D', 750, ink([(166,2),(166,723)]),
        ink(path(cubic((168,722),(463,782),(651,625),(641,357)),
                 cubic((641,357),(635,85),(473,-63),(164,3))),middle))
    put('E', 665, ink([(150,0),(150,722)]),
        ink(cubic((151,721),(325,742),(449,757),(545,707)),fine),
        ink(cubic((150,362),(319,383),(420,391),(514,352)),fine),
        ink(cubic((151,3),(302,-14),(460,-39),(559,25)),fine))
    put('F', 640, ink([(153,0),(153,722)]),
        ink(cubic((153,721),(323,743),(448,757),(550,710)),fine),
        ink(cubic((153,359),(310,381),(414,388),(503,349)),fine))
    put('G', 760, arc(376,355,247,352,48,312),
        ink([(408,330),(619,330),(619,116)],middle))
    put('H', 785, ink([(153,0),(153,723)]), ink([(622,0),(622,723)]),
        ink(cubic((151,366),(310,334),(469,390),(622,365)),fine))
    put('I', 330, ink([(159,0),(159,724)]),
        ink(cubic((56,715),(153,737),(247,748),(284,702)),fine),
        ink(cubic((48,0),(135,-22),(232,-27),(292,31)),fine))
    put('J', 650, ink([(505,724),(505,147)]),
        ink(cubic((506,146),(470,-53),(220,-88),(111,106)),middle),
        ink(cubic((270,716),(377,750),(503,748),(562,704)),fine))
    put('K', 708, ink([(158,0),(158,722)]),
        ink(cubic((577,719),(493,607),(336,436),(172,317)),fine),
        ink(cubic((312,435),(439,282),(535,101),(620,0)),middle))
    put('L', 622, ink([(157,721),(157,3)]),
        ink(cubic((155,5),(310,-31),(453,-28),(566,31)),fine))
    put('M', 945, ink([(126,0),(126,723)]),
        ink(cubic((126,723),(277,505),(369,331),(443,262)),fine),
        ink(cubic((443,262),(543,395),(631,551),(757,723)),middle),
        ink([(757,723),(757,0)]))
    put('N', 790, ink([(155,0),(155,723)]),
        ink(cubic((155,723),(351,411),(512,183),(628,0)),fine),
        ink([(628,0),(628,723)]))
    put('O', 765, *oval(376,355,245,351))
    put('P', 694, ink([(157,0),(157,721)]),
        ink(path(cubic((158,722),(532,789),(636,589),(579,448)),
                 cubic((579,448),(544,340),(373,333),(156,370))),middle))
    put('Q', 766, *oval(376,355,245,351),
        ink(cubic((455,143),(552,58),(600,-24),(687,-75)),middle))
    put('R', 735, ink([(157,0),(157,721)]),
        ink(path(cubic((158,722),(532,789),(636,589),(579,448)),
                 cubic((579,448),(544,340),(373,333),(156,370))),middle),
        ink(cubic((344,368),(446,269),(534,87),(633,-5)),middle))
    put('S', 671, ink(path(cubic((553,617),(432,794),(120,778),(142,536)),
                      cubic((142,536),(161,369),(552,407),(545,177)),
                      cubic((545,177),(539,-63),(229,-63),(98,88))),middle),
        ink(cubic((81,100),(57,55),(63,9),(115,-7)),fine))
    put('T', 707, ink([(357,724),(357,0)]),
        ink(cubic((78,700),(282,749),(454,774),(632,700)),fine))
    put('U', 785, ink(path([(151,723),(151,190)],cubic((151,190),(151,-65),(626,-79),(626,195)),[(626,195),(626,723)])),
        ink(cubic((621,723),(657,652),(661,603),(638,569)),fine))
    put('V', 710, ink(cubic((100,724),(170,432),(253,117),(356,0))),
        ink(cubic((356,0),(461,191),(549,486),(613,724)),fine))
    put('W', 970, ink(cubic((90,724),(128,440),(172,150),(260,0))),
        ink(cubic((260,0),(345,157),(403,377),(493,532)),fine),
        ink(cubic((493,532),(542,341),(628,105),(711,0)),middle),
        ink(cubic((711,0),(794,166),(835,455),(876,724)),fine))
    put('X', 704, ink(cubic((122,725),(266,474),(427,221),(588,0))),
        ink(cubic((581,722),(435,484),(277,235),(119,0)),fine))
    put('Y', 700, ink(cubic((108,723),(211,515),(288,418),(346,351)),middle),
        ink(cubic((608,722),(515,550),(424,424),(346,351)),fine),
        ink([(346,351),(346,0)]))
    put('Z', 664, ink(cubic((123,710),(297,751),(436,757),(549,707)),fine),
        ink(cubic((549,707),(414,489),(276,216),(121,0)),middle),
        ink(cubic((121,0),(271,-24),(435,-33),(567,25)),fine))

    # Asymmetric ovals and calligraphic contrast distinguish this from the
    # previously bundled uniform marker lettering.
    put('a', 628, *oval(316,245,175,239), ink([(490,489),(490,3)],middle))
    put('b', 647, ink([(146,0),(146,745)]), *oval(347,245,175,239))
    put('c', 584, arc(320,244,180,239,45,313))
    put('d', 647, *oval(307,245,175,239), ink([(482,2),(482,745)],middle))
    put('e', 580, arc(319,245,178,238,18,313),
        ink(cubic((148,269),(265,278),(398,300),(489,273)),fine))
    put('f', 442, ink(path(cubic((117,-5),(181,134),(192,425),(206,643)),
                      cubic((206,643),(219,802),(357,805),(397,704)))),
        ink(cubic((74,468),(168,476),(286,499),(406,467)),fine))
    put('g', 628, *oval(314,245,174,239), ink([(488,486),(488,-139)]),
        ink(cubic((488,-139),(442,-279),(244,-290),(138,-180)),fine))
    put('h', 655, ink([(147,0),(147,744)]),
        ink(path(cubic((147,310),(249,517),(512,534),(520,309)),[(520,309),(520,0)]),middle))
    put('i', 302, ink([(147,0),(147,485)]), dot(179,660))
    put('j', 328, ink([(153,486),(153,-129)]),
        ink(cubic((153,-129),(150,-255),(80,-290),(23,-230)),fine),dot(184,660))
    put('k', 621, ink([(146,0),(146,744)]),
        ink(cubic((518,490),(446,367),(291,210),(157,141)),fine),
        ink(cubic((309,231),(402,154),(469,57),(538,0)),middle))
    put('l', 306, ink([(149,0),(149,744)]))
    put('m', 908, ink([(134,0),(134,485)]),
        ink(path(cubic((134,307),(219,520),(426,522),(426,311)),[(426,311),(426,0)]),middle),
        ink(path(cubic((426,307),(532,528),(761,522),(761,308)),[(761,308),(761,0)]),middle))
    put('n', 653, ink([(141,0),(141,485)]),
        ink(path(cubic((141,307),(250,521),(512,525),(512,309)),[(512,309),(512,0)]),middle))
    put('o', 615, *oval(309,245,179,239))
    put('p', 647, ink([(149,485),(149,-211)]), *oval(347,245,174,239))
    put('q', 647, *oval(307,245,174,239),ink([(480,485),(480,-211)]))
    put('r', 470, ink([(143,0),(143,485)]),
        ink(cubic((143,327),(234,485),(357,550),(433,482)),fine))
    put('s', 545, ink(path(cubic((453,426),(342,535),(116,536),(132,352)),
                      cubic((132,352),(150,227),(450,272),(452,120)),
                      cubic((452,120),(454,-44),(233,-54),(100,68))),middle))
    put('t', 432, ink([(188,632),(188,129)]),
        ink(cubic((188,129),(189,-18),(289,-30),(389,43)),fine),
        ink(cubic((77,465),(178,478),(280,487),(395,460)),fine))
    put('u', 650, ink(path([(141,485),(141,171)],cubic((141,171),(149,-53),(509,-57),(509,171)),[(509,171),(509,485)])))
    put('v', 589, ink(cubic((120,485),(166,297),(213,85),(294,0))),
        ink(cubic((294,0),(387,132),(449,325),(500,485)),fine))
    put('w', 814, ink(cubic((111,485),(135,293),(171,99),(244,0))),
        ink(cubic((244,0),(335,151),(367,298),(414,386)),fine),
        ink(cubic((414,386),(468,223),(519,81),(581,0)),middle),
        ink(cubic((581,0),(657,134),(705,340),(742,485)),fine))
    put('x', 591, ink(cubic((114,484),(227,305),(348,128),(480,0))),
        ink(cubic((478,485),(364,300),(232,119),(114,0)),fine))
    put('y', 591, ink(cubic((113,485),(175,280),(223,112),(298,0))),
        ink(cubic((506,485),(406,203),(292,-30),(193,-219)),fine))
    put('z', 547, ink(cubic((123,482),(241,506),(365,523),(467,481)),fine),
        ink(cubic((467,481),(347,292),(235,119),(125,0)),middle),
        ink(cubic((125,0),(249,-15),(365,-20),(481,29)),fine))

    # Tabular-height numerals remain readable in countdowns and dates.
    put('0', 662, *oval(323,355,203,353),ink(cubic((392,561),(315,414),(269,269),(235,145)),fine))
    put('1', 461, ink([(251,1),(251,712)]),ink(cubic((107,526),(174,568),(217,635),(251,712)),fine),
        ink([(120,0),(381,0)],fine))
    put('2', 631, ink(path(cubic((123,555),(153,754),(514,805),(523,559)),
                      cubic((523,559),(525,392),(296,185),(117,0))),middle),
        ink(cubic((117,0),(260,-16),(413,-19),(541,19)),fine))
    put('3', 626, ink(path(cubic((123,609),(232,771),(526,762),(523,552)),
                      cubic((523,552),(520,432),(412,361),(291,355)),
                      cubic((291,355),(436,357),(528,272),(528,151)),
                      cubic((528,151),(528,-53),(221,-67),(108,80))),middle))
    put('4', 643, ink([(449,1),(449,711)]),ink([(91,222),(554,222)],fine),
        ink(cubic((91,222),(191,388),(328,590),(449,711)),middle))
    put('5', 631, ink(cubic((530,710),(395,730),(255,734),(130,703)),fine),
        ink([(130,703),(130,378)],middle),
        ink(path(cubic((130,378),(294,443),(532,390),(531,184)),
                 cubic((531,184),(531,-51),(226,-67),(105,76))),middle))
    put('6', 635, ink(path(cubic((507,631),(375,804),(138,680),(133,393)),
                      cubic((133,393),(131,107),(182,-44),(329,-44)),
                      cubic((329,-44),(521,-45),(549,179),(500,323)),
                      cubic((500,323),(447,462),(241,473),(133,333))),middle))
    put('7', 620, ink(cubic((91,706),(241,732),(416,749),(551,702)),fine),
        ink(cubic((551,702),(420,496),(303,250),(218,0))))
    put('8', 639, *oval(319,536,162,175), *oval(319,180,181,177))
    put('9', 635, ink(path(cubic((506,359),(458,209),(251,220),(148,346)),
                      cubic((148,346),(55,460),(111,749),(322,754)),
                      cubic((322,754),(491,755),(520,546),(507,318)),
                      cubic((507,318),(494,54),(358,-69),(138,78))),middle))

    # Complete printable ASCII, drawn in the same broad/fine pen system.
    put(' ',310)
    put('.',238,dot(119,49))
    put(',',245,dot(129,56),ink(cubic((130,54),(130,2),(114,-38),(88,-83)),fine))
    put(':',250,dot(125,55),dot(125,421))
    put(';',250,dot(125,421),dot(130,55),ink([(129,50),(90,-82)],fine))
    put('!',285,ink([(143,711),(143,208)],middle),dot(143,54))
    put('?',525,ink(path(cubic((102,561),(99,757),(436,791),(445,556)),
                      cubic((445,556),(451,405),(272,395),(272,234))),middle),dot(272,50))
    put("'",230,ink(cubic((128,714),(135,628),(116,556),(91,505)),fine))
    put('"',390,ink([(107,711),(85,509)],fine),ink([(287,711),(265,509)],fine))
    put('-',350,ink([(77,263),(276,263)],fine))
    put('_',540,ink([(66,-86),(470,-86)],fine))
    put('+',565,ink([(282,106),(282,548)],fine),ink([(80,328),(486,328)],fine))
    put('=',565,ink([(80,425),(485,425)],fine),ink([(80,228),(485,228)],fine))
    put('/',500,ink([(82,-106),(419,745)],fine))
    put('\\',500,ink([(82,745),(419,-106)],fine))
    put('(',342,ink(cubic((274,793),(49,608),(50,85),(274,-101)),fine))
    put(')',342,ink(cubic((67,793),(293,608),(292,85),(67,-101)),fine))
    put('[',323,ink([(240,766),(101,766),(101,-82),(240,-82)],fine))
    put(']',323,ink([(83,766),(222,766),(222,-82),(83,-82)],fine))
    put('{',370,ink(path(cubic((302,765),(160,763),(139,642),(139,472)),
                          cubic((139,472),(137,375),(89,351),(58,344)),
                          cubic((58,344),(89,337),(137,313),(139,216)),
                          cubic((139,216),(160,47),(160,-80),(302,-82))),fine))
    put('}',370,ink(path(cubic((68,765),(210,763),(231,642),(231,472)),
                          cubic((231,472),(233,375),(281,351),(312,344)),
                          cubic((312,344),(281,337),(233,313),(231,216)),
                          cubic((231,216),(210,47),(210,-80),(68,-82))),fine))
    put('|',225,ink([(112,-125),(112,782)],fine))
    put('*',390,ink([(195,422),(195,711)],fine),ink([(74,490),(318,636)],fine),ink([(74,635),(318,489)],fine))
    put('^',515,ink([(79,370),(255,703),(432,370)],fine))
    put('~',555,ink(path(cubic((68,315),(131,436),(205,425),(280,315)),
                          cubic((280,315),(354,207),(421,207),(489,385))),fine))
    put('<',500,ink([(419,550),(86,325),(419,104)],fine))
    put('>',500,ink([(86,550),(419,325),(86,104)],fine))
    put('#',629,ink([(217,707),(132,4)],fine),ink([(497,707),(414,4)],fine),
        ink([(72,471),(555,471)],fine),ink([(49,238),(532,238)],fine))
    put('$',651,ink(path(cubic((542,605),(428,773),(125,770),(138,550)),
                      cubic((138,550),(158,383),(548,418),(550,183)),
                      cubic((550,183),(549,-49),(218,-57),(111,86))),middle),
        ink([(328,788),(328,-83)],fine))
    put('%',738,ink([(114,5),(625,709)],fine),*oval(194,562,82,101),*oval(543,158,82,101))
    put('&',744,ink(path(cubic((619,64),(505,-47),(151,-90),(139,150)),
                      cubic((139,150),(127,284),(290,392),(379,502)),
                      cubic((379,502),(470,629),(368,768),(248,688)),
                      cubic((248,688),(100,587),(194,390),(616,1))),middle))
    put('@',801,arc(399,348,286,330,44,337,fine),*oval(421,320,134,154),
        ink([(555,461),(555,178)],fine))
    put('`',230,ink([(105,714),(151,581)],fine))
    put('…',675,dot(113,50),dot(337,50),dot(561,50))
    put('–',522,ink([(68,263),(453,263)],fine))
    put('—',751,ink([(69,263),(682,263)],fine))
    put('‘',230,ink(cubic((128,715),(104,633),(95,557),(89,508)),fine))
    put('’',230,ink(cubic((128,715),(111,635),(93,557),(88,508)),fine))
    put('“',390,ink([(108,714),(86,509)],fine),ink([(286,714),(264,509)],fine))
    put('”',390,ink([(108,714),(86,509)],fine),ink([(286,714),(264,509)],fine))
    put('•',320,dot(160,266,51))
    put('°',358,*oval(177,568,90,103))
    put('€',690,arc(358,357,240,350,44,313),
        ink([(92,449),(433,449)],fine),ink([(90,270),(433,270)],fine))
    put('£',670,ink(path(cubic((541,600),(469,772),(172,760),(172,536)),
                      cubic((172,536),(172,335),(170,155),(92,0))),middle),
        ink([(71,350),(424,350)],fine),ink([(92,0),(557,0)],fine))
    put('¥',700,ink(cubic((103,715),(206,503),(285,411),(351,344)),middle),
        ink(cubic((614,715),(521,544),(434,415),(351,344)),fine),
        ink([(351,344),(351,0)],middle),ink([(180,282),(524,282)],fine))
    put('©',706,*oval(348,350,275,316),arc(348,350,140,179,48,310,middle))
    put('®',706,*oval(348,350,275,316),ink([(263,210),(263,490)],middle),
        arc(348,414,82,79,-90,90,middle),ink([(350,339),(449,211)],fine))

    # Compose common Latin accents from this family’s own base glyphs.
    marks = {'\u0300':'grave','\u0301':'acute','\u0302':'circumflex','\u0303':'tilde',
             '\u0308':'diaeresis','\u030a':'ring','\u030c':'caron','\u0327':'cedilla'}
    def accent(kind, x, y):
        if kind == 'acute': return ink([(x-42,y+26),(x+58,y+139)],fine)
        if kind == 'grave': return ink([(x-54,y+139),(x+42,y+26)],fine)
        if kind == 'circumflex': return ink([(x-67,y+28),(x,y+112),(x+67,y+28)],fine)
        if kind == 'caron': return ink([(x-67,y+112),(x,y+28),(x+67,y+112)],fine)
        if kind == 'tilde': return ink(cubic((x-77,y+46),(x-22,y+124),(x+11,y+12),(x+74,y+96)),fine)
        if kind == 'diaeresis': return unary_union([dot(x-52,y+76,23),dot(x+57,y+76,23)])
        if kind == 'ring': return arc(x,y+81,49,48,0,360,fine)
        return ink(cubic((x+18,-32),(x-16,-87),(x+2,-156),(x+61,-128)),fine)
    for cp in range(0x00c0,0x0180):
        ch = chr(cp)
        decomp = unicodedata.normalize('NFD',ch)
        if len(decomp) != 2 or decomp[0] not in glyphs or decomp[1] not in marks:
            continue
        base = decomp[0]
        if not base.isalpha() or not base.isascii():
            continue
        adv, shape = glyphs[base]
        top = 745 if base.isupper() or base in 'bdfhijklt' else 490
        mark = accent(marks[decomp[1]],adv*.42,top+32)
        glyphs[ch] = (adv,unary_union([shape,affinity.skew(mark,xs=12,origin=(0,0))]))
    glyphs['\ufffd'] = (650,unary_union([ink([(90,5),(90,735),(562,735),(562,5),(90,5)],fine),
                                        ink([(91,5),(562,735)],fine)]))
    assert all(chr(cp) in glyphs for cp in range(32,127))
    return glyphs


def glyph_name(ch):
    if ch == '\ufffd': return '.notdef'
    if ch == ' ': return 'space'
    if ch.isascii() and ch.isalnum(): return ch
    return 'uni%04X' % ord(ch)


def contour(shape):
    pen = TTGlyphPen(None)
    shapes = [shape] if isinstance(shape,Polygon) else list(shape.geoms) if isinstance(shape,MultiPolygon) else []
    for piece in shapes:
        polygon = orient(piece,sign=-1.0)
        for ring in [polygon.exterior,*polygon.interiors]:
            points = list(ring.coords)[:-1]
            if len(points) < 3: continue
            pen.moveTo(tuple(map(round,points[0])))
            for point in points[1:]: pen.lineTo(tuple(map(round,point)))
            pen.closePath()
    return pen.glyph()


def build(style, stage):
    shapes = design(style == 'Bold')
    order = ['.notdef'] + [glyph_name(ch) for ch in shapes if ch != '\ufffd']
    glyphs = {glyph_name(ch):contour(shape) for ch,(_,shape) in shapes.items()}
    metrics = {glyph_name(ch):(adv,round(shape.bounds[0]) if not shape.is_empty else 0)
               for ch,(adv,shape) in shapes.items()}
    cmap = {ord(ch):glyph_name(ch) for ch in shapes if ch != '\ufffd'}
    fb = FontBuilder(1000,isTTF=True)
    fb.setupGlyphOrder(order); fb.setupCharacterMap(cmap); fb.setupGlyf(glyphs)
    fb.setupHorizontalMetrics(metrics)
    fb.setupHorizontalHeader(ascent=1050,descent=-300,lineGap=0)
    fb.setupNameTable({'familyName':'FM Ribbon Script','styleName':style,
        'uniqueFontIdentifier':'FreeMotion original FM Ribbon Script '+style+' 1.0',
        'fullName':'FM Ribbon Script '+style,'psName':'FMRibbonScript-'+style,
        'version':'Version 1.000','designer':'FreeMotion original type design',
        'description':'Original slanted high-contrast ribbon lettering for titles.'})
    fb.setupOS2(version=4,fsType=0,sTypoAscender=1050,sTypoDescender=-300,
        sTypoLineGap=0,usWinAscent=1050,usWinDescent=300,sxHeight=490,
        sCapHeight=745,usWeightClass=700 if style=='Bold' else 400,
        usWidthClass=5,fsSelection=0x20 if style=='Bold' else 0x40)
    fb.setupPost(italicAngle=-12,underlinePosition=-143,underlineThickness=69)
    fb.setupMaxp()
    font=fb.font; font['head'].macStyle=1 if style=='Bold' else 0
    font['head'].created=font['head'].modified=CREATED
    font.recalcTimestamp=False
    pairs={'A':'VWYT','L':'TVWY','T':'Aaeo','V':'Aaeo','W':'Aao','Y':'Aaeo',
           'F':'Ao','P':'ao','r':'av','f':'ao','T':'o'}
    rules=['pos %s %s -%d;'%(left,right,46 if left.isupper() else 28)
           for left,rights in pairs.items() for right in rights]
    addOpenTypeFeaturesFromString(font,'feature kern {\n'+'\n'.join(rules)+'\n} kern;')
    stem='fm-ribbon-script-'+style.lower()
    ttf=stage/(stem+'.ttf'); woff=stage/(stem+'.woff2')
    font.save(ttf); font.flavor='woff2'; font.save(woff)
    return ttf,woff,len(cmap)


def main():
    with tempfile.TemporaryDirectory(prefix='.ribbon-script-build-',dir=DEST) as temp:
        built=[build('Regular',Path(temp)),build('Bold',Path(temp))]
        TTF_DEST.mkdir(exist_ok=True)
        for ttf,woff,count in built:
            if woff.stat().st_size < 1000: raise RuntimeError('Incomplete font '+woff.name)
            os.replace(ttf,TTF_DEST/ttf.name)
            os.replace(woff,DEST/woff.name)
            print(f'{woff.name}: {(DEST/woff.name).stat().st_size} bytes, {count} mapped characters')


if __name__ == '__main__': main()
