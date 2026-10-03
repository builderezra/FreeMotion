#!/usr/bin/env python3
"""Build FM Vector Mono from original, hand-positioned geometric strokes.

This source does not read, trace, transform, or derive metrics from another font.
The two weights share drawings and a fixed advance, so numbers and title cards
stay aligned when their weight changes. Install requirements.txt, then run it.
"""
from __future__ import annotations

import math
import os
import tempfile
from pathlib import Path

from fontTools.fontBuilder import FontBuilder
from fontTools.pens.ttGlyphPen import TTGlyphPen
from shapely.geometry import GeometryCollection, LineString, MultiPolygon, Point, Polygon
from shapely.geometry.polygon import orient
from shapely.ops import unary_union

HERE = Path(__file__).resolve().parent
DEST = HERE.parent
TTF_DEST = HERE / 'fonts'
CREATED = 3873903662
ADVANCE = 700


def bezier(a, b, c, d, steps=28):
    return [((1-t)**3*a[0] + 3*(1-t)**2*t*b[0] + 3*(1-t)*t*t*c[0] + t**3*d[0],
             (1-t)**3*a[1] + 3*(1-t)**2*t*b[1] + 3*(1-t)*t*t*c[1] + t**3*d[1])
            for t in (i / steps for i in range(steps + 1))]


def joined(*parts):
    points = []
    for part in parts:
        points.extend(part if not points else part[1:])
    return points


def ellipse(cx, cy, rx, ry, start=0, stop=360, steps=64):
    return [(cx + rx*math.cos(math.radians(start+(stop-start)*i/steps)),
             cy + ry*math.sin(math.radians(start+(stop-start)*i/steps)))
            for i in range(steps+1)]


def draw(weight):
    """A square-ended, open-counter monospaced alphabet; every ASCII glyph drawn."""
    w = weight
    fine = w * .78
    glyphs = {}

    def stroke(points, width=w, closed=False):
        # A small bevel at a right-angle joint is the family signature. Flat
        # terminals let a glyph hold its crisp geometry in a video title.
        if closed and points[0] != points[-1]:
            points = [*points, points[0]]
        return LineString(points).buffer(width/2, cap_style=2, join_style=3, quad_segs=10)

    def oval(cx, cy, rx, ry, width=w):
        return stroke(ellipse(cx, cy, rx, ry), width, closed=True)

    def arc(cx, cy, rx, ry, start, stop, width=w):
        return stroke(ellipse(cx, cy, rx, ry, start, stop), width)

    def dot(x, y, radius=38):
        return Point(x, y).buffer(radius, quad_segs=12)

    def put(ch, *parts):
        glyphs[ch] = unary_union([p for p in parts if not p.is_empty]) if parts else GeometryCollection()

    # Capitals have a high cap line, broad curves, and slightly open joints.
    put('A', stroke([(115, 0), (350, 720), (585, 0)]), stroke([(209, 245), (491, 245)], fine))
    put('B', stroke([(135, 0), (135, 720)]),
        stroke(joined([(135, 720), (420, 720)], bezier((420, 720), (616, 720), (607, 408), (425, 380)),
                      bezier((425, 380), (618, 368), (620, 0), (420, 0))), w*.92),
        stroke([(135, 380), (425, 380)], fine), stroke([(420, 0), (135, 0)], fine))
    put('C', arc(350, 360, 229, 359, 47, 313))
    put('D', stroke([(135, 0), (135, 720), (364, 720)]),
        stroke(joined(bezier((364, 720), (623, 720), (621, 552), (621, 360)),
                      bezier((621, 360), (621, 163), (620, 0), (364, 0))), w*.92),
        stroke([(364, 0), (135, 0)], fine))
    put('E', stroke([(579, 720), (135, 720), (135, 0), (579, 0)]), stroke([(135, 355), (497, 355)], fine))
    put('F', stroke([(135, 0), (135, 720), (579, 720)]), stroke([(135, 355), (497, 355)], fine))
    put('G', arc(349, 360, 230, 360, 50, 313), stroke([(360, 336), (580, 336), (580, 76)], fine))
    put('H', stroke([(135, 720), (135, 0)]), stroke([(565, 720), (565, 0)]), stroke([(135, 356), (565, 356)], fine))
    put('I', stroke([(170, 720), (530, 720)], fine), stroke([(350, 720), (350, 0)]), stroke([(170, 0), (530, 0)], fine))
    put('J', stroke([(545, 720), (545, 173)]),
        stroke(bezier((545, 173), (545, -65), (148, -63), (143, 168))))
    put('K', stroke([(135, 720), (135, 0)]), stroke([(573, 720), (143, 310), (592, 0)]))
    put('L', stroke([(135, 720), (135, 0), (577, 0)]))
    put('M', stroke([(105, 0), (105, 720), (350, 355), (595, 720), (595, 0)]))
    put('N', stroke([(135, 0), (135, 720), (565, 0), (565, 720)]))
    put('O', oval(350, 360, 230, 360))
    put('P', stroke([(135, 0), (135, 720), (423, 720)]),
        stroke(joined(bezier((423, 720), (625, 720), (625, 360), (423, 360)),
                      [(423, 360), (135, 360)]), w*.92))
    put('Q', oval(350, 360, 230, 360), stroke([(419, 128), (611, -93)], fine))
    put('R', stroke([(135, 0), (135, 720), (423, 720)]),
        stroke(joined(bezier((423, 720), (625, 720), (625, 360), (423, 360)),
                      [(423, 360), (135, 360)]), w*.92),
        stroke([(381, 360), (591, 0)]))
    put('S', stroke(joined(bezier((572, 607), (503, 738), (119, 775), (121, 543)),
                           bezier((121, 543), (121, 360), (577, 422), (579, 175)),
                           bezier((579, 175), (580, -46), (211, -47), (117, 102))), w*.91))
    put('T', stroke([(83, 720), (617, 720)], fine), stroke([(350, 720), (350, 0)]))
    put('U', stroke(joined([(135, 720), (135, 231)],
                           bezier((135, 231), (135, -76), (565, -76), (565, 231)),
                           [(565, 231), (565, 720)])))
    put('V', stroke([(105, 720), (350, 0), (595, 720)]))
    put('W', stroke([(75, 720), (189, 0), (350, 386), (511, 0), (625, 720)]))
    put('X', stroke([(116, 720), (584, 0)]), stroke([(584, 720), (116, 0)]))
    put('Y', stroke([(101, 720), (350, 354), (599, 720)]), stroke([(350, 354), (350, 0)]))
    put('Z', stroke([(120, 720), (580, 720), (120, 0), (580, 0)]))

    # One-storey a and g give the lowercase its own voice, rather than a
    # miniature of the capitals. All letters keep the same 700-unit advance.
    put('a', oval(315, 245, 195, 244), stroke([(509, 484), (509, 0)]))
    put('b', stroke([(137, 720), (137, 0)]), oval(330, 245, 197, 244))
    put('c', arc(350, 245, 207, 244, 45, 315))
    put('d', oval(370, 245, 195, 244), stroke([(564, 720), (564, 0)]))
    put('e', arc(348, 245, 201, 242, 28, 319), stroke([(148, 258), (537, 258)], fine))
    put('f', stroke([(226, 0), (226, 566)]),
        stroke(bezier((226, 566), (226, 723), (352, 753), (505, 720))),
        stroke([(106, 477), (477, 477)], fine))
    put('g', oval(304, 245, 185, 244), stroke([(489, 486), (489, -128)]),
        stroke(bezier((489, -128), (489, -277), (261, -283), (135, -198)), fine))
    put('h', stroke([(135, 720), (135, 0)]),
        stroke(joined(bezier((138, 293), (191, 539), (551, 552), (551, 276)),
                      [(551, 276), (551, 0)])))
    put('i', stroke([(350, 483), (350, 0)]), dot(350, 659, 42))
    put('j', stroke([(399, 482), (399, -122)]),
        stroke(bezier((399, -122), (398, -236), (288, -262), (170, -224)), fine), dot(399, 659, 42))
    put('k', stroke([(137, 720), (137, 0)]), stroke([(551, 487), (149, 174), (560, 0)]))
    put('l', stroke([(320, 720), (320, 88), (415, 0)]))
    put('m', stroke([(95, 0), (95, 487)]),
        stroke(bezier((95, 315), (106, 530), (350, 544), (350, 294))),
        stroke([(350, 294), (350, 0)]),
        stroke(bezier((350, 315), (362, 530), (605, 544), (605, 294))),
        stroke([(605, 294), (605, 0)]))
    put('n', stroke([(138, 0), (138, 487)]),
        stroke(joined(bezier((138, 307), (191, 537), (549, 550), (549, 276)),
                      [(549, 276), (549, 0)])))
    put('o', oval(350, 245, 210, 244))
    put('p', stroke([(137, 485), (137, -240)]), oval(330, 245, 197, 244))
    put('q', oval(370, 245, 195, 244), stroke([(564, 485), (564, -240)]))
    put('r', stroke([(162, 0), (162, 485)]),
        stroke(bezier((162, 276), (204, 448), (355, 545), (532, 485))))
    put('s', stroke(joined(bezier((540, 411), (456, 512), (149, 547), (148, 369)),
                           bezier((148, 369), (148, 259), (545, 282), (548, 120)),
                           bezier((548, 120), (546, -42), (227, -43), (140, 76))), w*.90))
    put('t', stroke([(240, 630), (240, 115)]),
        stroke(bezier((240, 115), (240, -5), (364, -30), (507, 26))),
        stroke([(117, 474), (495, 474)], fine))
    put('u', stroke(joined([(141, 486), (141, 191)],
                           bezier((141, 191), (141, -57), (548, -55), (548, 191)),
                           [(548, 191), (548, 486)])))
    put('v', stroke([(126, 486), (350, 0), (574, 486)]))
    put('w', stroke([(78, 487), (195, 0), (350, 333), (505, 0), (622, 487)]))
    put('x', stroke([(136, 485), (563, 0)]), stroke([(563, 485), (136, 0)]))
    put('y', stroke([(126, 486), (350, 0), (574, 486)]),
        stroke([(350, 0), (234, -238)]))
    put('z', stroke([(145, 485), (555, 485), (145, 0), (555, 0)]))

    # Numerals are aligned and deliberately wider than the lower-case bowls.
    put('0', oval(350, 360, 219, 359), stroke([(489, 575), (211, 145)], fine*.58))
    put('1', stroke([(189, 570), (350, 720), (350, 0)]), stroke([(180, 0), (550, 0)], fine))
    put('2', stroke(joined(bezier((137, 535), (137, 755), (553, 779), (563, 541)),
                           bezier((563, 541), (563, 366), (318, 163), (134, 0)),
                           [(134, 0), (568, 0)])))
    put('3', stroke(joined(bezier((150, 613), (241, 765), (561, 775), (560, 536)),
                           bezier((560, 536), (560, 411), (433, 363), (318, 360)),
                           bezier((318, 360), (481, 360), (565, 277), (565, 157)),
                           bezier((565, 157), (565, -55), (235, -57), (134, 94))), w*.93))
    put('4', stroke([(471, 0), (471, 720), (105, 209), (591, 209)]))
    put('5', stroke(joined([(555, 720), (165, 720), (140, 376)],
                           bezier((140, 376), (350, 459), (561, 370), (560, 179)),
                           bezier((560, 179), (557, -61), (236, -62), (137, 95))), w*.94))
    put('6', stroke(joined(bezier((547, 635), (360, 830), (131, 576), (133, 251)),
                           bezier((133, 251), (134, -67), (558, -68), (557, 208)),
                           bezier((557, 208), (556, 444), (298, 465), (133, 251))), w*.94))
    put('7', stroke([(112, 720), (588, 720), (294, 0)]))
    put('8', oval(350, 538, 172, 181, w*.91), oval(350, 176, 199, 180, w*.91))
    put('9', stroke(joined(bezier((150, 84), (340, -105), (567, 146), (564, 473)),
                           bezier((564, 473), (561, 780), (138, 775), (137, 505)),
                           bezier((137, 505), (137, 270), (396, 254), (564, 473))), w*.94))

    # Punctuation and signs: fixed width is useful on scorecards, countdowns,
    # overlays, and subtitles. Keep the entire printable ASCII map intentional.
    put(' ')
    put('.', dot(350, 45, 40))
    put(',', dot(350, 52, 39), stroke([(348, 41), (305, -106)], fine*.58))
    put(':', dot(350, 50, 39), dot(350, 395, 39))
    put(';', dot(350, 395, 39), dot(350, 52, 39), stroke([(348, 41), (305, -106)], fine*.58))
    put('!', stroke([(350, 720), (350, 189)]), dot(350, 45, 40))
    put('?', stroke(joined(bezier((147, 537), (146, 778), (552, 780), (552, 552)),
                           bezier((552, 552), (552, 415), (350, 421), (350, 238))), w*.88), dot(350, 45, 40))
    put("'", stroke([(376, 720), (324, 500)], fine))
    put('"', stroke([(276, 720), (240, 510)], fine), stroke([(465, 720), (429, 510)], fine))
    put('-', stroke([(190, 260), (510, 260)], fine))
    put('_', stroke([(125, -92), (575, -92)], fine))
    put('+', stroke([(350, 76), (350, 550)], fine), stroke([(115, 313), (585, 313)], fine))
    put('=', stroke([(135, 409), (565, 409)], fine), stroke([(135, 207), (565, 207)], fine))
    put('/', stroke([(169, -100), (531, 760)], fine))
    put('\\', stroke([(169, 760), (531, -100)], fine))
    put('(', stroke(bezier((494, 804), (213, 675), (213, 17), (494, -109)), fine))
    put(')', stroke(bezier((206, 804), (487, 675), (487, 17), (206, -109)), fine))
    put('[', stroke([(492, 762), (235, 762), (235, -93), (492, -93)], fine))
    put(']', stroke([(208, 762), (465, 762), (465, -93), (208, -93)], fine))
    put('{', stroke(joined(bezier((513, 762), (306, 762), (297, 623), (297, 465)),
                           bezier((297, 465), (297, 366), (257, 343), (159, 343)),
                           bezier((159, 343), (257, 343), (297, 320), (297, 221)),
                           bezier((297, 221), (297, 63), (306, -93), (513, -93))), fine))
    put('}', stroke(joined(bezier((187, 762), (394, 762), (403, 623), (403, 465)),
                           bezier((403, 465), (403, 366), (443, 343), (541, 343)),
                           bezier((541, 343), (443, 343), (403, 320), (403, 221)),
                           bezier((403, 221), (403, 63), (394, -93), (187, -93))), fine))
    put('|', stroke([(350, -132), (350, 798)], fine))
    put('*', stroke([(350, 399), (350, 720)], fine), stroke([(192, 474), (509, 646)], fine),
        stroke([(191, 645), (509, 475)], fine))
    put('^', stroke([(158, 352), (350, 720), (542, 352)], fine))
    put('~', stroke(joined(bezier((134, 260), (188, 410), (277, 414), (350, 308)),
                           bezier((350, 308), (423, 202), (510, 208), (566, 369))), fine))
    put('<', stroke([(541, 541), (159, 322), (541, 99)], fine))
    put('>', stroke([(159, 541), (541, 322), (159, 99)], fine))
    put('#', stroke([(271, 720), (183, 0)], fine), stroke([(517, 720), (429, 0)], fine),
        stroke([(130, 479), (573, 479)], fine), stroke([(106, 233), (549, 233)], fine))
    put('$', glyphs['S'], stroke([(350, 797), (350, -99)], fine*.7))
    put('%', stroke([(139, 0), (561, 720)], fine), oval(237, 568, 100, 121, fine),
        oval(463, 151, 100, 121, fine))
    put('&', stroke(joined(bezier((556, 47), (447, -60), (137, -50), (139, 166)),
                           bezier((139, 166), (139, 301), (474, 390), (475, 570)),
                           bezier((475, 570), (475, 769), (192, 774), (192, 597)),
                           bezier((192, 597), (192, 488), (457, 144), (589, 0))), w*.9))
    put('@', arc(350, 345, 255, 338, 52, 348, fine), oval(370, 315, 130, 158, fine),
        stroke([(501, 462), (501, 189)], fine))
    put('`', stroke([(315, 720), (381, 585)], fine))
    # Typographic punctuation and signs commonly pasted into captions.
    put('…', dot(183, 45, 39), dot(350, 45, 39), dot(517, 45, 39))
    put('–', stroke([(123, 260), (577, 260)], fine))
    put('—', stroke([(69, 260), (631, 260)], fine))
    put('‘', stroke([(372, 727), (327, 511)], fine))
    put('’', stroke([(372, 727), (327, 511)], fine))
    put('“', stroke([(276, 727), (240, 511)], fine), stroke([(465, 727), (429, 511)], fine))
    put('”', stroke([(276, 727), (240, 511)], fine), stroke([(465, 727), (429, 511)], fine))
    put('•', dot(350, 278, 46))
    put('€', arc(345, 360, 223, 358, 46, 313), stroke([(99, 463), (468, 463)], fine),
        stroke([(99, 275), (468, 275)], fine))
    put('£', stroke(joined(bezier((568, 588), (522, 786), (220, 777), (205, 555)),
                           bezier((205, 555), (215, 351), (200, 171), (128, 0))), w*.9),
        stroke([(125, 351), (445, 351)], fine), stroke([(125, 0), (568, 0)], fine))
    put('¥', stroke([(114, 720), (350, 358), (586, 720)]), stroke([(350, 358), (350, 0)]),
        stroke([(181, 300), (519, 300)], fine), stroke([(181, 190), (519, 190)], fine))
    put('°', oval(350, 567, 99, 116, fine))
    put('©', oval(350, 352, 290, 327, fine), arc(350, 352, 152, 184, 47, 314, fine))
    put('®', oval(350, 352, 290, 327, fine), stroke([(278, 221), (278, 492)], fine),
        arc(360, 423, 82, 74, -90, 90, fine), stroke([(360, 349), (447, 213)], fine))

    # Common names and captions should not lose their accents. These marks are
    # constructed from this family's own strokes, at cap or x-height as needed.
    def mark(kind, top):
        if kind == 'acute': return stroke([(307, top+40), (411, top+151)], fine*.63)
        if kind == 'grave': return stroke([(291, top+151), (393, top+40)], fine*.63)
        if kind == 'circ': return stroke([(242, top+40), (350, top+150), (458, top+40)], fine*.61)
        if kind == 'tilde':
            return stroke(joined(bezier((234, top+66), (273, top+164), (329, top+144), (350, top+94)),
                                 bezier((350, top+94), (382, top+37), (436, top+48), (466, top+132))), fine*.60)
        if kind == 'dots': return unary_union([dot(269, top+113, 29), dot(431, top+113, 29)])
        if kind == 'ring': return oval(350, top+119, 66, 63, fine*.62)
        if kind == 'caron': return stroke([(242, top+150), (350, top+40), (458, top+150)], fine*.61)
        raise ValueError(kind)

    accents = {
        'a': {'à': 'grave', 'á': 'acute', 'â': 'circ', 'ã': 'tilde', 'ä': 'dots', 'å': 'ring'},
        'A': {'À': 'grave', 'Á': 'acute', 'Â': 'circ', 'Ã': 'tilde', 'Ä': 'dots', 'Å': 'ring'},
        'e': {'è': 'grave', 'é': 'acute', 'ê': 'circ', 'ë': 'dots'},
        'E': {'È': 'grave', 'É': 'acute', 'Ê': 'circ', 'Ë': 'dots'},
        'i': {'ì': 'grave', 'í': 'acute', 'î': 'circ', 'ï': 'dots'},
        'I': {'Ì': 'grave', 'Í': 'acute', 'Î': 'circ', 'Ï': 'dots'},
        'o': {'ò': 'grave', 'ó': 'acute', 'ô': 'circ', 'õ': 'tilde', 'ö': 'dots'},
        'O': {'Ò': 'grave', 'Ó': 'acute', 'Ô': 'circ', 'Õ': 'tilde', 'Ö': 'dots'},
        'u': {'ù': 'grave', 'ú': 'acute', 'û': 'circ', 'ü': 'dots'},
        'U': {'Ù': 'grave', 'Ú': 'acute', 'Û': 'circ', 'Ü': 'dots'},
        'y': {'ý': 'acute', 'ÿ': 'dots'}, 'Y': {'Ý': 'acute'},
        'n': {'ñ': 'tilde'}, 'N': {'Ñ': 'tilde'},
        'c': {'ć': 'acute', 'č': 'caron'}, 'C': {'Ć': 'acute', 'Č': 'caron'},
        's': {'ś': 'acute', 'š': 'caron'}, 'S': {'Ś': 'acute', 'Š': 'caron'},
        'z': {'ź': 'acute', 'ž': 'caron'}, 'Z': {'Ź': 'acute', 'Ž': 'caron'},
    }
    for base, letters in accents.items():
        top = 720 if base.isupper() else 490
        # The i dot is replaced by the accent, never overprinted beneath it.
        base_shape = stroke([(350, 483), (350, 0)]) if base == 'i' else glyphs[base]
        for letter, kind in letters.items():
            put(letter, base_shape, mark(kind, top))
    cedilla = stroke(joined(bezier((352, -8), (378, -62), (408, -86), (350, -116)),
                            bezier((350, -116), (314, -143), (273, -128), (262, -170))), fine*.65)
    put('ç', glyphs['c'], cedilla)
    put('Ç', glyphs['C'], cedilla)
    put('ø', glyphs['o'], stroke([(150, -27), (550, 518)], fine*.75))
    put('Ø', glyphs['O'], stroke([(150, -34), (550, 757)], fine*.75))
    put('ł', glyphs['l'], stroke([(207, 272), (470, 412)], fine*.72))
    put('Ł', glyphs['L'], stroke([(72, 258), (390, 436)], fine*.72))

    put('�', stroke([(105, 0), (105, 720), (595, 720), (595, 0), (105, 0)], fine),
        stroke([(119, 19), (578, 698)], fine*.7))
    assert all(chr(n) in glyphs for n in range(32, 127)), 'ASCII coverage incomplete'
    return glyphs


def outline(shape):
    pen = TTGlyphPen(None)
    def polygons(geom):
        if isinstance(geom, Polygon):
            yield geom
        elif isinstance(geom, (MultiPolygon, GeometryCollection)):
            for part in geom.geoms:
                yield from polygons(part)
    for poly in polygons(shape):
        poly = orient(poly, sign=-1.0)
        for ring in [poly.exterior, *poly.interiors]:
            points = list(ring.coords)[:-1]
            if len(points) < 3:
                continue
            pen.moveTo(tuple(map(round, points[0])))
            for point in points[1:]:
                pen.lineTo(tuple(map(round, point)))
            pen.closePath()
    return pen.glyph()


def glyph_name(ch):
    if ch == '�': return '.notdef'
    if ch == ' ': return 'space'
    if ch.isascii() and ch.isalnum(): return ch
    return 'uni%04X' % ord(ch)


def build(style, weight, stage):
    drawings = draw(weight)
    bold = style == 'Bold'
    order = ['.notdef'] + [glyph_name(ch) for ch in drawings if ch != '�']
    glyphs, metrics, cmap = {}, {}, {}
    for ch, shape in drawings.items():
        name = glyph_name(ch)
        glyphs[name] = outline(shape)
        metrics[name] = (ADVANCE, round(shape.bounds[0]) if not shape.is_empty else 0)
        if ch != '�': cmap[ord(ch)] = name
    fb = FontBuilder(1000, isTTF=True)
    fb.setupGlyphOrder(order)
    fb.setupCharacterMap(cmap)
    fb.setupGlyf(glyphs)
    fb.setupHorizontalMetrics(metrics)
    fb.setupHorizontalHeader(ascent=1060, descent=-350, lineGap=0)
    fb.setupNameTable({
        'familyName': 'FM Vector Mono', 'styleName': style,
        'uniqueFontIdentifier': 'FreeMotion original FM Vector Mono ' + style + ' 1.0',
        'fullName': 'FM Vector Mono ' + style,
        'psName': 'FMVectorMono-' + style,
        'version': 'Version 1.000',
        'designer': 'FreeMotion original type design',
        'description': 'Original geometric monospaced display face for FreeMotion.',
    })
    fb.setupOS2(version=4, fsType=0, sTypoAscender=1060, sTypoDescender=-350,
                sTypoLineGap=0, usWinAscent=1060, usWinDescent=350,
                sxHeight=490, sCapHeight=720, usWeightClass=700 if bold else 400,
                usWidthClass=5, fsSelection=0x20 if bold else 0x40)
    fb.setupPost(italicAngle=0, underlinePosition=-130, underlineThickness=55, isFixedPitch=1)
    fb.setupMaxp()
    font = fb.font
    font['head'].macStyle = 1 if bold else 0
    font['head'].created = font['head'].modified = CREATED
    font.recalcTimestamp = False
    slug = 'fm-vector-mono-' + style.lower()
    ttf, woff = stage / (slug + '.ttf'), stage / (slug + '.woff2')
    font.save(ttf)
    font.flavor = 'woff2'
    font.save(woff)
    return ttf, woff, len(cmap)


def main():
    with tempfile.TemporaryDirectory(prefix='.vector-mono-build-', dir=DEST) as temp:
        stage = Path(temp)
        files = [build('Regular', 76, stage), build('Bold', 103, stage)]
        TTF_DEST.mkdir(exist_ok=True)
        for ttf, woff, count in files:
            if woff.stat().st_size < 1000:
                raise RuntimeError('Incomplete face: ' + woff.name)
            os.replace(ttf, TTF_DEST / ttf.name)
            os.replace(woff, DEST / woff.name)
            print(f'{woff.name}: {(DEST / woff.name).stat().st_size} bytes, {count} mapped characters')


if __name__ == '__main__':
    main()
