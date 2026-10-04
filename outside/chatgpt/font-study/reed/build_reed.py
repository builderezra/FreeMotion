#!/usr/bin/env python3
"""FM Reed: original curved, tapering title-letter proof. No source font is read."""
from pathlib import Path
import math
import tempfile

from fontTools.fontBuilder import FontBuilder
from fontTools.pens.ttGlyphPen import TTGlyphPen
from fontTools.ttLib import TTFont
from PIL import Image, ImageDraw, ImageFont
from shapely.geometry import Polygon, GeometryCollection
from shapely.geometry.polygon import orient
from shapely.ops import unary_union

HERE = Path(__file__).resolve().parent


def cubic(a, b, c, d, steps=24):
    return [((1-t)**3*a[0] + 3*(1-t)**2*t*b[0] + 3*(1-t)*t*t*c[0] + t**3*d[0],
             (1-t)**3*a[1] + 3*(1-t)**2*t*b[1] + 3*(1-t)*t*t*c[1] + t**3*d[1])
            for t in (i/steps for i in range(steps+1))]


def ribbon(points, width_start, width_end, bulge=0):
    left, right = [], []
    last = len(points) - 1
    for i, (x, y) in enumerate(points):
        before = points[max(0, i-1)]
        after = points[min(last, i+1)]
        dx, dy = after[0]-before[0], after[1]-before[1]
        length = math.hypot(dx, dy) or 1
        t = i/last
        width = width_start*(1-t) + width_end*t + bulge*math.sin(math.pi*t)
        nx, ny = -dy/length * width/2, dx/length * width/2
        left.append((x+nx, y+ny)); right.append((x-nx, y-ny))
    return Polygon(left + right[::-1]).buffer(0)


def stroke(a, b, c, d, w0, w1, bulge=0):
    return ribbon(cubic(a, b, c, d), w0, w1, bulge)


def oval(cx, cy, rx, ry, inner_rx, inner_ry, inner_dx=0, inner_dy=0):
    def points(x, y, r_x, r_y):
        return [(x + r_x*math.cos(i*2*math.pi/96) + r_x*.05*math.sin(i*4*math.pi/96),
                 y + r_y*math.sin(i*2*math.pi/96) + r_y*.025*math.cos(i*6*math.pi/96))
                for i in range(96)]
    return Polygon(points(cx, cy, rx, ry)).difference(
        Polygon(points(cx+inner_dx, cy+inner_dy, inner_rx, inner_ry)))


def design(bold=False):
    scale = 1.28 if bold else 1
    def q(w): return w*scale
    def reed(x, height=740):
        # Broad root, swaying midsection and pointed crown: the family rhythm.
        return stroke((x+34, 0), (x+75, 215), (x-53, 590), (x+12, height),
                      q(132), q(8), q(36))
    def bridge(a, b, c, d, w0=47, w1=37, belly=20):
        return stroke(a, b, c, d, q(w0), q(w1), q(belly))
    glyphs = {}
    def put(ch, advance, *forms):
        glyphs[ch] = (advance, unary_union(forms) if forms else GeometryCollection())

    put('N', 710, reed(123), reed(592),
        bridge((134,698),(226,587),(504,104),(581,8),105,80,26))
    put('I', 350, reed(173),
        bridge((111,15),(165,-21),(230,-20),(270,34),44,22,10))
    o = oval(350, 367, 265, 393, 160, 275, -17, 18)
    put('O', 700, o)
    put('G', 704, o.difference(Polygon([(460,390),(780,390),(780,830),(460,830)])),
        bridge((339,343),(433,342),(548,354),(619,341),42,54,6),
        bridge((470,377),(540,383),(609,347),(620,280),75,45,8),
        bridge((620,280),(618,185),(547,95),(473,69),61,99,12))
    put('H', 740, reed(122), reed(616),
        bridge((164,336),(303,298),(426,418),(597,373),51,42,13))
    put('T', 672, reed(336),
        bridge((82,697),(218,787),(439,778),(596,712),50,68,32),
        bridge((83,692),(104,664),(127,641),(150,642),50,8,0))
    put('A', 680,
        stroke((86,0),(176,197),(197,608),(331,759),q(136),q(6),q(34)),
        stroke((331,759),(441,574),(474,197),(589,0),q(10),q(139),q(29)),
        bridge((190,271),(302,306),(385,274),(493,265),49,56,5))
    put('R', 680, reed(120),
        bridge((143,704),(304,759),(532,717),(533,552),74,79,4),
        bridge((533,552),(521,424),(354,390),(150,395),73,72,15),
        stroke((344,389),(486,306),(470,121),(609,-24),q(49),q(125),q(29)))
    put('D', 707, reed(117),
        bridge((144,723),(332,802),(575,669),(595,394),65,93,20),
        bridge((595,394),(607,134),(443,-49),(145,16),93,102,15))
    put('E', 640, reed(122),
        bridge((135,701),(260,759),(453,755),(559,706),55,33,12),
        bridge((151,367),(250,412),(386,386),(493,414),51,27,8),
        bridge((133,24),(280,-32),(486,4),(570,80),61,31,18))
    put('B', 675, reed(117),
        bridge((143,709),(294,785),(520,717),(527,553),70,73,13),
        bridge((527,553),(526,423),(363,391),(145,390),73,72,8),
        bridge((145,390),(357,430),(581,347),(565,174),74,99,16),
        bridge((565,174),(545,-8),(336,-36),(129,20),99,102,18))
    put('C', 687, o.difference(Polygon([(483,252),(780,252),(780,527),(483,527)])),
        bridge((516,566),(562,585),(591,625),(611,663),76,8),
        bridge((514,198),(571,168),(593,119),(610,92),85,12))
    put('F', 613, reed(120),
        bridge((136,706),(269,767),(461,757),(546,700),53,29,15),
        bridge((151,366),(272,409),(405,376),(491,422),53,23,8))
    put('J', 627, reed(499),
        stroke((519,98),(473,-105),(156,-85),(97,119),q(116),q(15),q(31)),
        bridge((248,731),(336,771),(487,749),(554,712),35,42,14))
    put('K', 669, reed(118),
        stroke((155,341),(257,377),(431,692),(533,754),q(55),q(13),q(17)),
        stroke((154,331),(313,315),(502,47),(583,-20),q(47),q(130),q(31)))
    put('L', 600, reed(122),
        bridge((143,24),(283,-40),(476,-3),(557,83),63,23,16))
    put('M', 855, reed(112), reed(742),
        stroke((145,704),(260,560),(328,255),(428,202),q(65),q(96),q(12)),
        stroke((428,202),(515,286),(613,615),(735,707),q(92),q(12),q(20)))
    put('P', 641, reed(115),
        bridge((144,711),(296,786),(532,700),(540,533),70,72,13),
        bridge((540,533),(524,399),(363,365),(145,399),72,76,11))
    put('Q', 722, o,
        stroke((437,169),(499,65),(543,-16),(624,-117),q(47),q(113),q(16)))
    put('S', 652,
        stroke((544,628),(438,849),(74,716),(263,401),q(13),q(98),q(34)),
        stroke((263,401),(580,184),(509,-93),(79,117),q(95),q(13),q(35)))
    put('U', 716,
        stroke((104,746),(77,465),(115,-29),(352,-29),q(14),q(138),q(30)),
        stroke((352,-29),(609,-22),(639,463),(617,746),q(138),q(12),q(28)))
    put('V', 673,
        stroke((86,749),(163,497),(247,131),(337,-27),q(13),q(148),q(24)),
        stroke((337,-27),(427,141),(506,528),(593,746),q(146),q(13),q(27)))
    put('W', 917,
        stroke((66,743),(116,466),(138,124),(235,-26),q(16),q(130),q(20)),
        stroke((235,-26),(300,106),(373,453),(457,485),q(127),q(41),q(10)),
        stroke((457,485),(528,364),(581,118),(673,-22),q(40),q(129),q(18)),
        stroke((673,-22),(762,157),(803,520),(857,746),q(125),q(12),q(18)))
    put('X', 660,
        stroke((85,741),(239,567),(445,154),(575,-24),q(13),q(139),q(22)),
        stroke((566,741),(416,558),(202,188),(88,-23),q(14),q(134),q(16)))
    put('Y', 658,
        stroke((84,743),(163,561),(268,386),(329,351),q(14),q(93),q(15)),
        stroke((575,743),(481,563),(389,394),(329,351),q(13),q(89),q(15)),
        stroke((329,351),(375,212),(343,69),(300,-29),q(93),q(142),q(9)))
    put('Z', 655,
        bridge((88,704),(236,770),(477,755),(570,700),47,36,16),
        stroke((554,704),(408,533),(216,190),(85,21),q(18),q(116),q(22)),
        bridge((85,22),(221,-39),(464,-27),(576,55),62,25,15))

    # The lowercase has its own x-height, rounder bowls, rising shoulders and
    # long descender curls; it is neither reduced capitals nor a monoline clone.
    def sprout(x, height=520, bottom=0):
        return stroke((x+24,bottom),(x+55,bottom+177),(x-39,height-124),(x+9,height),
                      q(102),q(11),q(27))
    def bowl(cx=270, cy=253, rx=201, ry=263):
        extra = 27 if bold else 0
        return oval(cx,cy,rx,ry,rx-79-extra,ry-91-extra,-10,16)
    def dot(x): return oval(x,688,39,42,8,9)
    def shoulder(x1,x2,top=520):
        return bridge((x1,399),(x1+77,542),(x2-95,556),(x2,389),40,44,13)
    little_o = bowl()
    put('a', 562,little_o,sprout(468))
    put('b', 579,sprout(111,765),bowl(321))
    put('c', 545,little_o.difference(Polygon([(404,187),(600,187),(600,383),(404,383)])))
    put('d', 584,little_o,sprout(484,765))
    put('e', 552,little_o.difference(Polygon([(412,285),(620,285),(620,510),(412,510)])),
        bridge((103,259),(233,288),(370,284),(471,263),31,38,8))
    put('f', 396,sprout(211,766),
        bridge((201,700),(248,778),(338,787),(367,744),31,8,8),
        bridge((67,456),(178,482),(299,473),(368,465),37,25,6))
    put('g', 572,little_o,
        stroke((475,497),(475,270),(486,-102),(349,-192),q(12),q(111),q(25)),
        bridge((349,-192),(249,-225),(124,-178),(109,-113),100,9,5))
    put('h', 594,sprout(111,765),sprout(493),shoulder(129,492))
    put('i', 285,sprout(132),dot(148))
    put('j', 312,sprout(161,520,-175),dot(175),
        bridge((166,-161),(131,-216),(68,-217),(54,-184),65,10,5))
    put('k', 558,sprout(112,765),
        stroke((140,229),(236,269),(371,464),(458,520),q(36),q(12),q(10)),
        stroke((173,246),(296,225),(411,37),(500,-23),q(31),q(105),q(13)))
    put('l', 287,sprout(140,765))
    put('m', 814,sprout(105),sprout(392),sprout(706),shoulder(117,390),shoulder(405,704))
    put('n', 588,sprout(106),sprout(495),shoulder(118,493))
    put('o', 558,little_o)
    put('p', 583,sprout(109,520,-184),bowl(321))
    put('q', 581,little_o,sprout(485,520,-184))
    put('r', 447,sprout(111),
        bridge((128,393),(185,527),(342,564),(401,462),39,13,7))
    put('s', 535,
        stroke((448,432),(369,569),(83,525),(217,261),q(10),q(79),q(22)),
        stroke((217,261),(530,98),(385,-74),(75,101),q(78),q(12),q(23)))
    put('t', 427,sprout(214,682),
        bridge((70,462),(187,494),(312,476),(384,463),37,22,7))
    put('u', 591,
        stroke((95,513),(74,300),(98,-33),(302,-19),q(11),q(107),q(25)),
        stroke((302,-19),(486,-10),(517,301),(502,515),q(105),q(11),q(24)))
    put('v', 545,
        stroke((82,518),(131,327),(179,89),(272,-25),q(11),q(112),q(16)),
        stroke((272,-25),(365,87),(407,327),(476,517),q(108),q(11),q(17)))
    put('w', 741,
        stroke((65,516),(110,290),(126,80),(206,-25),q(12),q(100),q(15)),
        stroke((206,-25),(257,87),(305,318),(374,348),q(96),q(31),q(9)),
        stroke((374,348),(429,264),(475,74),(544,-24),q(32),q(103),q(13)),
        stroke((544,-24),(632,117),(645,351),(691,517),q(100),q(11),q(16)))
    put('x', 539,
        stroke((76,516),(192,383),(361,128),(473,-21),q(11),q(108),q(16)),
        stroke((465,516),(354,377),(170,133),(77,-22),q(11),q(104),q(12)))
    put('y', 557,
        stroke((77,518),(134,305),(211,113),(283,5),q(11),q(103),q(16)),
        stroke((482,518),(430,331),(364,117),(283,5),q(11),q(103),q(13)),
        stroke((283,5),(248,-153),(164,-218),(65,-162),q(104),q(10),q(12)))
    put('z', 533,
        bridge((77,481),(212,539),(371,537),(463,488),38,21,11),
        stroke((446,484),(343,370),(187,129),(76,13),q(13),q(98),q(16)),
        bridge((74,16),(200,-33),(365,-22),(471,55),53,18,11))
    # Figures share the capitals' cap height, but the open terminals and
    # unequal shoulders give them a separate, readable rhythm in timecodes.
    zero = oval(314,365,229,389,135-(23 if bold else 0),273-(21 if bold else 0),-12,16)
    put('0', 625,zero)
    put('1', 419,reed(228),
        bridge((78,560),(124,597),(182,681),(240,738),34,13,10),
        bridge((104,18),(208,-28),(321,-17),(370,36),47,21,12))
    put('2', 628,
        bridge((86,551),(84,780),(514,835),(532,564),61,82,12),
        stroke((528,565),(436,430),(187,150),(91,20),q(77),q(92),q(16)),
        bridge((94,20),(236,-37),(477,-24),(550,54),65,27,12))
    put('3', 625,
        bridge((98,676),(221,788),(478,775),(523,604),47,68,8),
        bridge((523,604),(537,481),(403,376),(248,376),72,54,8),
        bridge((246,376),(435,386),(552,266),(530,131),53,85,11),
        bridge((530,131),(476,-49),(225,-49),(91,81),85,37,13))
    put('4', 654,
        stroke((420,748),(308,610),(182,380),(84,251),q(11),q(104),q(17)),
        bridge((87,257),(223,227),(406,242),(557,270),45,35,9),
        reed(451))
    put('5', 622,
        bridge((93,714),(229,765),(447,744),(538,716),51,30,11),
        stroke((128,702),(112,563),(102,461),(94,394),q(61),q(89),q(8)),
        bridge((100,400),(252,480),(523,412),(543,240),76,72,12),
        bridge((543,240),(557,63),(261,-84),(87,86),76,36,14))
    put('6', 638,bowl(315,246,221,253),
        stroke((156,318),(93,519),(305,804),(542,739),q(73),q(12),q(19)))
    put('7', 619,
        bridge((85,702),(235,777),(475,757),(543,703),53,31,12),
        stroke((539,704),(430,499),(301,182),(230,-19),q(17),q(129),q(21)))
    put('8', 636,
        oval(317,570,202,210,111-(18 if bold else 0),120-(16 if bold else 0),-6,6),
        oval(317,183,227,229,132-(22 if bold else 0),137-(19 if bold else 0),-10,8))
    put('9', 638,bowl(307,505,217,251),
        stroke((463,430),(548,242),(459,-68),(159,16),q(61),q(12),q(19)))
    put(' ', 280)
    put('!', 300, reed(150, 738),
        oval(160, 38, 44, 44, 11, 11))
    put('?', 610, bridge((79,593),(127,829),(516,844),(516,585),74,73,15),
        bridge((516,585),(495,435),(328,421),(303,266),74,29,10),
        oval(305, 40, 43, 43, 10, 10))
    # Punctuation is drawn with the same blunt-root / fine-tip pen grammar.
    period = oval(154,36,45,48,10,11)
    put('.', 304,period)
    put(',', 322,period,
        stroke((164,32),(175,-37),(129,-94),(80,-118),q(52),q(8),q(8)))
    put(':', 304,period,oval(154,437,43,45,9,9))
    put(';', 322,oval(154,437,43,45,9,9),period,
        stroke((164,32),(175,-37),(129,-94),(80,-118),q(52),q(8),q(8)))
    put("'", 286,stroke((165,758),(160,642),(116,603),(94,578),q(58),q(7),q(8)))
    quote = stroke((126,758),(121,650),(79,602),(58,580),q(50),q(7),q(8))
    put('"', 432,quote,
        stroke((324,758),(318,650),(277,602),(255,580),q(50),q(7),q(8)))
    put('`', 306,stroke((80,744),(108,671),(160,640),(212,618),q(9),q(57),q(8)))
    put('-', 432,bridge((67,299),(155,322),(274,313),(355,303),48,19,7))
    put('_', 514,bridge((60,-112),(178,-142),(358,-141),(452,-113),50,26,8))
    put('/', 552,stroke((80,-83),(213,176),(339,530),(476,765),q(92),q(9),q(18)))
    put('\\', 552,stroke((76,765),(207,564),(356,172),(479,-83),q(9),q(92),q(18)))
    put('|', 301,reed(150,759))
    put('(', 359,stroke((281,795),(68,632),(69,149),(281,-123),q(10),q(86),q(16)))
    put(')', 359,stroke((74,795),(292,632),(292,149),(74,-123),q(10),q(86),q(16)))
    put('[', 355,reed(76,757),
        bridge((78,733),(146,775),(224,756),(290,746),44,15),
        bridge((82,-4),(157,-29),(233,-15),(290,15),47,16))
    put(']', 355,reed(264,757),
        bridge((74,748),(148,774),(221,765),(268,733),18,43),
        bridge((74,14),(157,-29),(234,-21),(269,-3),17,45))
    put('{', 418,
        bridge((343,768),(143,799),(162,588),(171,455),13,65),
        bridge((171,455),(163,389),(128,378),(76,369),65,12),
        bridge((76,369),(153,352),(161,296),(170,237),12,65),
        bridge((170,237),(141,-40),(239,-55),(343,-25),65,13))
    put('}', 418,
        bridge((76,768),(276,799),(257,588),(248,455),13,65),
        bridge((248,455),(256,389),(291,378),(343,369),65,12),
        bridge((343,369),(266,352),(258,296),(249,237),12,65),
        bridge((249,237),(278,-40),(180,-55),(76,-25),65,13))
    put('+', 573,reed(286,548),
        bridge((83,284),(207,314),(364,299),(482,278),51,29,8))
    put('=', 572,
        bridge((78,380),(194,404),(375,390),(492,379),46,25,7),
        bridge((78,196),(205,219),(369,205),(492,190),48,27,7))
    put('<', 543,
        stroke((457,562),(319,477),(178,348),(82,284),q(12),q(69),q(12)),
        stroke((82,284),(198,214),(356,91),(457,28),q(69),q(12),q(12)))
    put('>', 543,
        stroke((86,562),(224,477),(365,348),(461,284),q(12),q(69),q(12)),
        stroke((461,284),(345,214),(187,91),(86,28),q(69),q(12),q(12)))
    put('^', 506,
        stroke((75,452),(170,576),(213,692),(253,743),q(68),q(9),q(10)),
        stroke((253,743),(336,608),(393,507),(431,452),q(9),q(68),q(10)))
    put('~', 566,
        stroke((68,335),(172,474),(242,280),(305,343),q(15),q(62),q(12)),
        stroke((305,343),(360,411),(424,359),(502,427),q(62),q(11),q(10)))
    put('*', 508,
        stroke((251,739),(236,623),(254,513),(267,426),q(8),q(70),q(10)),
        stroke((86,651),(175,579),(324,526),(431,489),q(10),q(60),q(7)),
        stroke((427,664),(338,588),(183,521),(83,471),q(10),q(60),q(7)))
    put('#', 678,
        stroke((267,758),(254,516),(185,169),(153,-23),q(11),q(95),q(12)),
        stroke((509,758),(478,505),(421,156),(391,-23),q(11),q(95),q(12)),
        bridge((72,482),(207,514),(480,504),(604,470),53,32,8),
        bridge((72,227),(216,254),(472,245),(604,218),56,32,8))
    put('$', 665,glyphs['S'][1],reed(327,832))
    put('%', 759,
        oval(189,581,104,141,55-(11 if bold else 0),80-(11 if bold else 0)),
        oval(569,142,104,141,55-(11 if bold else 0),80-(11 if bold else 0)),
        stroke((110,-46),(295,177),(457,519),(642,774),q(86),q(9),q(14)))
    put('&', 743,
        oval(291,566,169,186,79-(11 if bold else 0),92-(11 if bold else 0)),
        stroke((385,507),(69,299),(81,-54),(351,-29),q(58),q(109),q(16)),
        stroke((351,-29),(504,22),(550,215),(629,405),q(109),q(11),q(15)))
    put('@', 899,oval(450,364,373,392,280,297),
        bowl(448,356,166,183),
        stroke((596,531),(593,302),(612,172),(771,255),q(50),q(11),q(8)))
    # A visible missing-glyph box is better than silent blanks while this is a proof.
    put('\ufffd', 620, bridge((87,5),(75,350),(75,735),(87,750),28,28),
        bridge((87,750),(300,750),(518,750),(532,750),28,28),
        bridge((532,750),(532,500),(532,140),(532,5),28,28),
        bridge((532,5),(350,5),(160,5),(87,5),28,28))
    return glyphs


def contour(shape):
    pen = TTGlyphPen(None)
    pieces = [shape] if isinstance(shape, Polygon) else list(shape.geoms) if hasattr(shape, 'geoms') else []
    for piece in pieces:
        if not isinstance(piece, Polygon): continue
        polygon = orient(piece, sign=-1.0)
        for ring in [polygon.exterior, *polygon.interiors]:
            points = list(ring.coords)[:-1]
            if len(points) < 3: continue
            pen.moveTo(tuple(map(round, points[0])))
            for point in points[1:]: pen.lineTo(tuple(map(round, point)))
            pen.closePath()
    return pen.glyph()


def build(style):
    glyphs = design(style == 'Bold')
    def name(ch):
        return '.notdef' if ch == '\ufffd' else 'space' if ch == ' ' else ch if ch.isalnum() else 'uni%04X' % ord(ch)
    order = ['.notdef'] + [name(ch) for ch in glyphs if ch != '\ufffd']
    fb = FontBuilder(1000, isTTF=True)
    fb.setupGlyphOrder(order)
    fb.setupCharacterMap({ord(ch): name(ch) for ch in glyphs if ch != '\ufffd'})
    fb.setupGlyf({name(ch): contour(shape) for ch, (_, shape) in glyphs.items()})
    fb.setupHorizontalMetrics({name(ch): (advance, round(shape.bounds[0]) if not shape.is_empty else 0)
                               for ch, (advance, shape) in glyphs.items()})
    fb.setupHorizontalHeader(ascent=1020, descent=-280, lineGap=0)
    fb.setupNameTable({'familyName':'FM Reed', 'styleName':style,
        'uniqueFontIdentifier':'FreeMotion original FM Reed '+style+' proof 0.1',
        'fullName':'FM Reed '+style, 'psName':'FMReed-'+style,
        'version':'Version 0.100', 'designer':'FreeMotion original type design',
        'description':'Original tapering, curving title-letter proof.'})
    fb.setupOS2(version=4, fsType=0, sTypoAscender=1020, sTypoDescender=-280,
        sTypoLineGap=0, usWinAscent=1020, usWinDescent=280, sxHeight=520,
        sCapHeight=760, usWeightClass=700 if style == 'Bold' else 400,
        usWidthClass=5, fsSelection=0x20 if style == 'Bold' else 0x40)
    fb.setupPost(italicAngle=0, underlinePosition=-140, underlineThickness=70)
    fb.setupMaxp()
    font = fb.font
    font.recalcTimestamp = False
    font['head'].macStyle = 1 if style == 'Bold' else 0
    font['head'].created = font['head'].modified = 3873903662
    path = HERE / ('fm-reed-' + style.lower() + '.ttf')
    font.save(path)
    return path


def specimen(regular, bold):
    image = Image.new('RGB', (1500, 1710), '#0b171c')
    draw = ImageDraw.Draw(image)
    label = ImageFont.truetype('/System/Library/Fonts/Supplemental/Arial.ttf', 23)
    draw.text((48, 30), 'FM REED / original type proof', font=label, fill='#91a7ac')
    for y, size, style, phrase in [
        (100, 96, bold, 'BRIGHT WAVES'),
        (280, 64, regular, 'Night garden'),
        (410, 48, bold, 'Good night'),
        (525, 32, regular, 'wild garden'),
        (610, 24, regular, 'bright waves'),
    ]:
        draw.text((48, y-30), f'{size} px / '+('Bold' if style==bold else 'Regular'), font=label, fill='#91a7ac')
        draw.text((48, y+12), phrase, font=ImageFont.truetype(style, size), fill='#f1e6d0')
    draw.text((48, 733), 'UPPERCASE / 34 px regular', font=label, fill='#91a7ac')
    draw.text((48, 777), 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', font=ImageFont.truetype(regular, 34), fill='#e4b975')
    draw.text((48, 876), 'UPPERCASE / 34 px bold', font=label, fill='#91a7ac')
    draw.text((48, 918), 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', font=ImageFont.truetype(bold, 34), fill='#e4b975')
    draw.text((48, 1006), 'LOWERCASE / 34 px regular', font=label, fill='#91a7ac')
    draw.text((48, 1050), 'abcdefghijklmnopqrstuvwxyz', font=ImageFont.truetype(regular, 34), fill='#d0efc9')
    draw.text((48, 1147), 'LOWERCASE / 34 px bold', font=label, fill='#91a7ac')
    draw.text((48, 1190), 'abcdefghijklmnopqrstuvwxyz', font=ImageFont.truetype(bold, 34), fill='#d0efc9')
    draw.text((48, 1280), 'FIGURES / 34 px regular and bold', font=label, fill='#91a7ac')
    draw.text((48, 1320), '0123456789', font=ImageFont.truetype(regular, 34), fill='#eccf99')
    draw.text((48, 1390), '0123456789', font=ImageFont.truetype(bold, 34), fill='#eccf99')
    draw.text((48, 1472), 'PUNCTUATION / 34 px regular', font=label, fill='#91a7ac')
    draw.text((48, 1512), '!?.,:; -_ /\\ +={}[]() @#&%$', font=ImageFont.truetype(regular, 34), fill='#f1e6d0')
    draw.text((48, 1590), 'PUNCTUATION / 34 px bold', font=label, fill='#91a7ac')
    draw.text((48, 1630), '!?.,:; -_ /\\ +={}[]() @#&%$', font=ImageFont.truetype(bold, 34), fill='#f1e6d0')
    image.save(HERE/'specimen.png')

    comparison = Image.new('RGB', (1500, 760), '#f2ede1')
    comp = ImageDraw.Draw(comparison)
    comp.text((48, 24), 'ACTUAL-SIZE TYPE COMPARISON / Good night', font=label, fill='#52636a')
    with tempfile.TemporaryDirectory(prefix='reed-comparison-') as tmp:
        rivals = [('FM Blackthorn', 'fm-blackthorn-regular.woff2'),
                  ('FM Ribbon Script', 'fm-ribbon-script-regular.woff2'),
                  ('FM Palais Deco', 'fm-palais-deco-regular.woff2')]
        font_rows = [('FM Reed', regular)]
        for title, filename in rivals:
            converted = Path(tmp)/(filename+'.ttf')
            font = TTFont(HERE.parents[3]/'fonts'/'original'/filename)
            font.flavor = None; font.save(converted)
            font_rows.append((title, converted))
        for size, top in [(48, 78), (32, 426)]:
            for i, (title, font_path) in enumerate(font_rows):
                y = top+i*(82 if size==48 else 64)
                comp.text((48,y), f'{title} / {size} px', font=label, fill='#52636a')
                comp.text((365,y-5), 'Good night', font=ImageFont.truetype(font_path,size), fill='#14232a')
    comparison.save(HERE/'comparison.png')


if __name__ == '__main__':
    regular, bold = build('Regular'), build('Bold')
    specimen(regular, bold)
    print('Built', regular.name, bold.name, 'and specimen.png')
