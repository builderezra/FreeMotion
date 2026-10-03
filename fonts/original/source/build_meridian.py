#!/usr/bin/env python3
"""Draw the original FM Meridian Serif display family.

Every contour in this file is constructed from the coordinates below. There
are no font-file inputs or traced outlines. Requires the packages in
requirements.txt; run this file from any directory to rebuild both faces.
"""
from __future__ import annotations

import math
import os
import tempfile
from pathlib import Path

from fontTools.feaLib.builder import addOpenTypeFeaturesFromString
from fontTools.fontBuilder import FontBuilder
from fontTools.pens.ttGlyphPen import TTGlyphPen
from shapely.geometry import GeometryCollection, LineString, MultiPolygon, Polygon, box
from shapely.geometry.polygon import orient
from shapely.ops import unary_union

HERE = Path(__file__).resolve().parent
DEST = HERE.parent
TTF_DEST = HERE / "fonts"
CREATED = 3873903662


def rect(x0, y0, x1, y1):
    return box(x0, y0, x1, y1)


def ellipse(cx, cy, rx, ry, n=100):
    return Polygon([(cx + rx * math.cos(2 * math.pi * i / n),
                     cy + ry * math.sin(2 * math.pi * i / n)) for i in range(n)])


def oval(cx, cy, rx, ry, vertical, horizontal):
    return ellipse(cx, cy, rx, ry).difference(
        ellipse(cx, cy, rx - vertical, ry - horizontal))


def line(points, width, cap=2, join=2):
    return LineString(points).buffer(width / 2, cap_style=cap, join_style=join,
                                    quad_segs=16)


def bezier(a, b, c, d, steps=36):
    return [((1-t)**3*a[0] + 3*(1-t)**2*t*b[0] + 3*(1-t)*t*t*c[0] + t**3*d[0],
             (1-t)**3*a[1] + 3*(1-t)**2*t*b[1] + 3*(1-t)*t*t*c[1] + t**3*d[1])
            for t in (i / steps for i in range(steps + 1))]


def path(*curves):
    points = []
    for curve in curves:
        points += curve if not points else curve[1:]
    return points


def union(*shapes):
    return unary_union([s for s in shapes if not s.is_empty])


def serif(x, y, width=154, thickness=24):
    """Flared wedge beneath a stem, with a delicate horizontal foot."""
    shoulder = 46
    return union(rect(x-width/2, y, x+width/2, y+thickness),
                 Polygon([(x-shoulder, y+thickness), (x+shoulder, y+thickness),
                          (x+shoulder/2, y+thickness+36),
                          (x-shoulder/2, y+thickness+36)]))


def head_serif(x, y, width=154, thickness=24):
    """Mirror the foot flare below the cap edge so tops stay optically flat."""
    shoulder = 46
    return union(rect(x-width/2, y-thickness, x+width/2, y),
                 Polygon([(x-shoulder, y-thickness), (x+shoulder, y-thickness),
                          (x+shoulder/2, y-thickness-36),
                          (x-shoulder/2, y-thickness-36)]))


def stem(x, y0=0, y1=720, weight=90, foot=True, head=True):
    parts = [rect(x-weight/2, y0, x+weight/2, y1)]
    if foot:
        parts.append(serif(x, y0))
    if head:
        parts.append(head_serif(x, y1))
    return union(*parts)


def semicircle_bottom(cx, cy, rx, ry, vertical, horizontal):
    return oval(cx, cy, rx, ry, vertical, horizontal).intersection(
        rect(cx-rx-2, cy-ry-2, cx+rx+2, cy))


def upper_bowl(cx, cy, rx, ry, v, h, left):
    return oval(cx, cy, rx, ry, v, h).intersection(rect(left, cy-ry-2, cx+rx+2, cy+ry+2))


def high_s(weight):
    # Asymmetric upper and lower swashes form a continuous drawn S.
    p = path(bezier((532, 625), (410, 765), (144, 765), (127, 563)),
             bezier((127, 563), (94, 420), (554, 418), (524, 200)),
             bezier((524, 200), (495, -38), (208, -52), (92, 91)))
    return union(line(p, weight, cap=2),
                 line([(101, 91), (88, 164)], 18),
                 line([(530, 625), (540, 565)], 18))


def lower_s(weight):
    p = path(bezier((461, 404), (355, 518), (131, 510), (119, 354)),
             bezier((119, 354), (104, 245), (475, 250), (463, 114)),
             bezier((463, 114), (448, -36), (208, -45), (86, 75)))
    return line(p, weight, cap=2)


def draw(weight):
    """Independent type drawings. The regular/bold share proportions only."""
    v = weight
    hv = 34 if v == 86 else 45
    dg = 55 if v == 86 else 70
    lc = v - 8
    shapes: dict[str, tuple[int, object]] = {}

    def put(char, advance, *forms):
        shapes[char] = (advance, union(*forms) if forms else GeometryCollection())

    def cap_oval(cx=345, cy=360, rx=265, ry=365):
        return oval(cx, cy, rx, ry, v, hv)

    def small_oval(cx=285, cy=247, rx=200, ry=248):
        return oval(cx, cy, rx, ry, lc, hv-7)

    # Capitals: a slightly narrow modern serif with heavy uprights and fine bars.
    put('A', 690, line([(103, 0), (338, 724), (587, 0)], dg, join=2),
        rect(185, 215, 502, 239), serif(116, 0, 177), serif(583, 0, 177))
    put('B', 680, stem(150, weight=v),
        upper_bowl(300, 532, 229, 190, v, hv, 148),
        upper_bowl(303, 187, 240, 188, v, hv, 148))
    put('C', 700, cap_oval().difference(rect(475, 143, 660, 575)),
        line([(483, 570), (529, 604)], 35), line([(483, 148), (529, 115)], 35))
    put('D', 715, stem(147, weight=v),
        upper_bowl(296, 360, 290, 365, v, hv, 146))
    put('E', 630, stem(145, weight=v), rect(146, 696, 554, 722),
        rect(146, 347, 489, 372), rect(146, 0, 558, 25),
        rect(540, 654, 561, 722), rect(540, 0, 561, 72))
    put('F', 620, stem(145, weight=v), rect(146, 696, 548, 722),
        rect(146, 347, 483, 372), rect(533, 654, 555, 722))
    put('G', 730, cap_oval().difference(rect(475, 245, 680, 575)),
        rect(371, 315, 620, 345), rect(573, 135, 620, 345),
        line([(484, 568), (532, 600)], 35))
    put('H', 735, stem(143, weight=v), stem(580, weight=v),
        rect(143, 346, 580, 371))
    put('I', 365, stem(182, weight=v, foot=True, head=True))
    jpath = path(bezier((498, 186), (496, -86), (202, -90), (111, 80)))
    put('J', 635, rect(84, 696, 552, 722), stem(496, 190, 721, weight=v, foot=False, head=False),
        line(jpath, v), rect(84, 656, 108, 722))
    put('K', 700, stem(141, weight=v), line([(562, 720), (166, 340)], dg),
        line([(335, 507), (578, 0)], dg), serif(571, 0, 145),
        rect(519, 698, 603, 721))
    put('L', 630, stem(145, weight=v), rect(146, 0, 554, 25),
        rect(536, 0, 558, 83))
    put('M', 885, stem(143, weight=v), stem(734, weight=v),
        line([(143, 705), (437, 209), (734, 705)], dg))
    put('N', 760, stem(143, weight=v), stem(617, weight=v),
        line([(157, 717), (603, 0)], dg))
    put('O', 720, cap_oval(360, 360, 265, 365))
    put('P', 670, stem(149, weight=v), upper_bowl(304, 534, 232, 190, v, hv, 148))
    put('Q', 725, cap_oval(360, 360, 265, 365), line([(421, 158), (629, -86)], 46),
        line([(578, -74), (644, -74)], 20))
    put('R', 690, stem(150, weight=v), upper_bowl(304, 534, 232, 190, v, hv, 149),
        line([(329, 362), (587, 0)], dg), serif(578, 0, 156))
    put('S', 650, high_s(v-5))
    put('T', 690, rect(71, 696, 619, 722), stem(345, weight=v, head=False),
        rect(71, 648, 92, 722), rect(598, 648, 619, 722))
    put('U', 740, stem(146, 205, 720, weight=v, foot=False),
        stem(592, 205, 720, weight=v, foot=False),
        semicircle_bottom(369, 204, 266, 215, v, hv))
    put('V', 710, line([(94, 720), (354, 0), (616, 720)], dg),
        rect(44, 696, 166, 721), rect(546, 696, 668, 721))
    put('W', 940, line([(90, 720), (229, 0), (469, 513), (711, 0), (850, 720)], dg),
        rect(40, 696, 160, 721), rect(780, 696, 900, 721))
    put('X', 690, line([(103, 720), (588, 0)], dg),
        line([(588, 720), (103, 0)], dg),
        rect(50, 696, 162, 720), rect(530, 696, 643, 720),
        serif(103, 0), serif(588, 0))
    put('Y', 690, line([(78, 720), (345, 346), (612, 720)], dg),
        stem(345, 0, 358, weight=v, head=False),
        rect(45, 696, 162, 720), rect(530, 696, 646, 720))
    put('Z', 670, rect(95, 696, 568, 722),
        line([(531, 709), (131, 12)], dg), rect(91, 0, 578, 25),
        rect(95, 656, 117, 720), rect(556, 0, 578, 69))

    # Lowercase: open bowls, full x-height, compact but legible counters.
    put('a', 600, small_oval(274, 245, 186, 244),
        stem(461, 0, 488, weight=lc, foot=False, head=False), serif(461, 0, 132))
    put('b', 630, stem(146, 0, 738, weight=lc), small_oval(335, 244, 190, 246))
    put('c', 590, small_oval(293, 244, 204, 246).difference(rect(425, 124, 575, 367)),
        line([(439, 371), (481, 394)], 30), line([(439, 120), (481, 96)], 30))
    put('d', 630, small_oval(293, 244, 190, 246), stem(481, 0, 738, weight=lc))
    put('e', 610, small_oval(291, 245, 202, 247).difference(rect(384, 135, 558, 418)),
        rect(101, 253, 461, 276))
    put('f', 430, stem(168, 0, 575, weight=lc, head=False),
        line(bezier((168, 560), (142, 749), (273, 797), (368, 690)), 52),
        rect(66, 461, 364, 486))
    put('g', 620, small_oval(285, 245, 182, 243),
        stem(467, -91, 487, weight=lc, foot=False, head=False),
        line(bezier((467, -91), (464, -278), (232, -286), (126, -186)), 57))
    put('h', 635, stem(144, 0, 738, weight=lc),
        line(path(bezier((150, 291), (181, 518), (479, 560), (490, 307)),
                  bezier((490, 307), (490, 230), (490, 133), (490, 0))), lc),
        serif(490, 0, 137))
    put('i', 305, stem(149, 0, 482, weight=lc, head=False), ellipse(149, 672, 46, 45))
    put('j', 325, stem(167, -144, 482, weight=lc, foot=False, head=False),
        line(bezier((167, -144), (165, -253), (45, -276), (12, -204)), 48),
        ellipse(167, 672, 46, 45))
    put('k', 605, stem(145, 0, 738, weight=lc),
        line([(506, 487), (177, 189)], dg),
        line([(347, 338), (519, 0)], dg), serif(518, 0, 131))
    put('l', 300, stem(146, 0, 738, weight=lc))
    put('m', 870, stem(137, 0, 483, weight=lc),
        line(path(bezier((145, 287), (171, 527), (417, 535), (430, 281)),
                  bezier((430, 281), (430, 185), (430, 84), (430, 0))), lc),
        line(path(bezier((429, 286), (458, 530), (704, 535), (716, 280)),
                  bezier((716, 280), (716, 185), (716, 84), (716, 0))), lc),
        serif(430, 0, 129), serif(716, 0, 129))
    put('n', 635, stem(143, 0, 483, weight=lc),
        line(path(bezier((143, 286), (173, 523), (480, 533), (488, 281)),
                  bezier((488, 281), (488, 185), (488, 84), (488, 0))), lc),
        serif(488, 0, 136))
    put('o', 610, small_oval(303, 245, 207, 247))
    put('p', 630, stem(146, -233, 487, weight=lc), small_oval(334, 245, 190, 245))
    put('q', 630, small_oval(294, 245, 190, 245), stem(483, -233, 487, weight=lc))
    put('r', 455, stem(145, 0, 484, weight=lc),
        line(bezier((145, 286), (166, 442), (277, 550), (397, 472)), 53))
    put('s', 570, lower_s(lc-4))
    put('t', 445, stem(171, 129, 652, weight=lc, foot=False, head=False),
        rect(75, 461, 367, 486),
        line(bezier((171, 129), (171, -38), (294, -40), (385, 26)), 50))
    put('u', 640, line(path([(146, 484), (146, 178)],
                          bezier((146, 178), (146, -71), (481, -68), (481, 233))), lc),
        stem(481, 0, 484, weight=lc, head=False),
        serif(146, 460, 128))
    put('v', 590, line([(91, 484), (293, 0), (497, 484)], dg),
        rect(46, 463, 133, 488), rect(455, 463, 542, 488))
    put('w', 825, line([(74, 484), (199, 0), (411, 349), (625, 0), (751, 484)], dg),
        rect(33, 463, 117, 488), rect(707, 463, 791, 488))
    put('x', 585, line([(90, 484), (500, 0)], dg), line([(498, 484), (90, 0)], dg),
        rect(46, 463, 134, 488), rect(454, 463, 542, 488),
        serif(90, 0, 130), serif(500, 0, 130))
    put('y', 590, line([(91, 484), (293, 0), (497, 484)], dg),
        line([(293, 0), (202, -238)], dg),
        rect(46, 463, 133, 488), rect(455, 463, 542, 488))
    put('z', 580, rect(90, 462, 493, 488), line([(479, 478), (111, 11)], dg),
        rect(86, 0, 498, 25))

    # Figures share the cap-height rhythm and serif finish of the capitals.
    put('0', 650, oval(325, 360, 229, 362, v, hv))
    put('1', 480, stem(251, 0, 720, weight=v, head=False),
        line([(92, 564), (251, 720)], dg), rect(150, 696, 299, 721))
    put('2', 640,
        line(path(bezier((108, 542), (103, 760), (514, 787), (536, 552)),
                  bezier((536, 552), (538, 386), (335, 204), (110, 16))), v-5),
        rect(100, 0, 558, 25), rect(536, 0, 560, 80))
    put('3', 640,
        line(path(bezier((105, 596), (205, 747), (528, 759), (520, 541)),
                  bezier((520, 541), (511, 421), (414, 379), (299, 352)),
                  bezier((299, 352), (444, 351), (550, 260), (526, 142)),
                  bezier((526, 142), (486, -69), (210, -50), (96, 92))), v-10))
    put('4', 660, line([(431, 0), (431, 720), (82, 226), (574, 226)], dg),
        serif(431, 0, 144))
    put('5', 640, line(path([(523, 710), (163, 710), (125, 390)],
                            bezier((125, 390), (325, 488), (541, 392), (529, 190)),
                            bezier((529, 190), (515, -55), (228, -56), (89, 92))), v-8),
        rect(153, 697, 536, 721))
    put('6', 640, line(path(bezier((493, 645), (244, 836), (94, 570), (119, 236)),
                            bezier((119, 236), (141, -88), (532, -49), (516, 206)),
                            bezier((516, 206), (492, 433), (242, 457), (119, 236))), v-9))
    put('7', 640, rect(85, 695, 558, 721), line([(548, 709), (227, 0)], dg),
        serif(227, 0, 144))
    put('8', 640, oval(319, 541, 181, 183, v-5, hv),
        oval(319, 180, 210, 185, v-5, hv))
    put('9', 640, line(path(bezier((126, 78), (375, -117), (548, 149), (516, 482)),
                            bezier((516, 482), (494, 803), (101, 761), (118, 508)),
                            bezier((118, 508), (144, 283), (393, 262), (516, 482))), v-9))

    # Everyday punctuation and signs needed in editable titles/captions.
    put(' ', 300)
    put('.', 260, ellipse(131, 41, 37, 42))
    put(',', 260, ellipse(139, 45, 37, 42),
        line(bezier((139, 32), (142, -40), (113, -75), (80, -100)), 28))
    put(':', 265, ellipse(132, 43, 37, 42), ellipse(132, 390, 37, 42))
    put(';', 265, ellipse(132, 391, 37, 42), ellipse(132, 44, 37, 42),
        line(bezier((132, 31), (137, -36), (111, -72), (79, -99)), 28))
    put('!', 275, rect(122, 178, 153, 720), ellipse(138, 45, 38, 42))
    put('?', 550, line(path(bezier((84, 553), (83, 772), (469, 772), (478, 549)),
                             bezier((478, 549), (471, 411), (282, 413), (280, 250))), 62),
        ellipse(281, 44, 37, 42))
    put("'", 245, line([(120, 700), (93, 493)], 30))
    put('"', 390, line([(113, 700), (88, 493)], 30),
        line([(278, 700), (253, 493)], 30))
    put('-', 385, rect(72, 266, 313, 293))
    put('_', 560, rect(55, -85, 505, -60))
    put('+', 590, rect(279, 85, 310, 555), rect(66, 307, 523, 335))
    put('=', 590, rect(66, 394, 523, 422), rect(66, 196, 523, 224))
    put('/', 520, line([(81, -126), (439, 750)], 44))
    put('\\', 520, line([(81, 750), (439, -126)], 44))
    put('(', 370, line(path(bezier((310, 809), (86, 624), (86, 153), (310, -101))), 55))
    put(')', 370, line(path(bezier((60, 809), (284, 624), (284, 153), (60, -101))), 55))
    put('[', 350, line([(278, 776), (110, 776), (110, -86), (278, -86)], 34))
    put(']', 350, line([(72, 776), (240, 776), (240, -86), (72, -86)], 34))
    put('{', 400, line(path(bezier((325, 770), (153, 770), (143, 659), (143, 470)),
                            bezier((143, 470), (143, 360), (99, 343), (55, 343)),
                            bezier((55, 343), (99, 343), (143, 326), (143, 217)),
                            bezier((143, 217), (143, 26), (153, -84), (325, -84))), 40))
    put('}', 400, line(path(bezier((75, 770), (247, 770), (257, 659), (257, 470)),
                            bezier((257, 470), (257, 360), (301, 343), (345, 343)),
                            bezier((345, 343), (301, 343), (257, 326), (257, 217)),
                            bezier((257, 217), (257, 26), (247, -84), (75, -84))), 40))
    put('|', 270, rect(120, -130, 150, 790))
    put('*', 430, line([(215, 410), (215, 705)], 35),
        line([(79, 481), (351, 636)], 35), line([(79, 636), (351, 481)], 35))
    put('^', 550, line([(75, 346), (275, 715), (475, 346)], 39))
    put('~', 590, line(path(bezier((73, 281), (130, 429), (240, 405), (295, 310)),
                            bezier((295, 310), (357, 215), (465, 193), (518, 370))), 35))
    put('<', 540, line([(456, 540), (84, 320), (456, 100)], 41))
    put('>', 540, line([(84, 540), (456, 320), (84, 100)], 41))
    put('#', 665, line([(218, 715), (129, 0)], 42), line([(518, 715), (429, 0)], 42),
        rect(75, 466, 593, 494), rect(46, 226, 565, 254))
    put('$', 655, high_s(v-7), rect(311, -105, 342, 790))
    put('%', 770, line([(108, 0), (665, 721)], 43),
        oval(203, 559, 94, 120, 41, 25), oval(573, 159, 94, 120, 41, 25))
    put('&', 730, line(path(bezier((614, 62), (453, -80), (193, -56), (130, 146)),
                            bezier((130, 146), (60, 300), (275, 390), (376, 477)),
                            bezier((376, 477), (555, 647), (368, 789), (224, 675)),
                            bezier((224, 675), (70, 557), (297, 257), (630, 0))), 62))
    put('@', 830, oval(416, 334, 305, 343, 55, 35),
        oval(423, 316, 150, 165, 52, 35), rect(551, 280, 585, 465))
    put('…', 780, ellipse(130, 41, 37, 42), ellipse(390, 41, 37, 42),
        ellipse(650, 41, 37, 42))
    put('–', 560, rect(61, 266, 499, 293))
    put('—', 820, rect(61, 266, 759, 293))
    put('‘', 245, line([(128, 708), (81, 490)], 32))
    put('’', 245, line([(128, 708), (81, 490)], 32))
    put('“', 390, line([(110, 708), (65, 490)], 32),
        line([(275, 708), (230, 490)], 32))
    put('”', 390, line([(110, 708), (65, 490)], 32),
        line([(275, 708), (230, 490)], 32))
    put('•', 350, ellipse(175, 257, 39, 42))
    put('€', 690, cap_oval().difference(rect(470, 138, 675, 583)),
        rect(66, 449, 440, 472), rect(64, 273, 440, 296))
    put('£', 655, line(path(bezier((547, 589), (513, 766), (223, 778), (201, 550)),
                            bezier((201, 550), (208, 384), (200, 197), (113, 13))), 66),
        rect(70, 345, 432, 370), rect(110, 0, 579, 24))
    put('¥', 690, line([(87, 720), (345, 371), (603, 720)], dg),
        rect(329, 0, 361, 384), rect(162, 305, 529, 330),
        rect(162, 180, 529, 205))

    # The missing glyph is an original open frame, never a copied .notdef.
    put('\ufffd', 670, line([(89, 0), (89, 720), (581, 720), (581, 0), (89, 0)], 38),
        line([(112, 26), (558, 695)], 34))
    return shapes


def contour_geom(geometry):
    pen = TTGlyphPen(None)
    def polygons(obj):
        if isinstance(obj, Polygon):
            yield obj
        elif isinstance(obj, (MultiPolygon, GeometryCollection)):
            for child in obj.geoms:
                yield from polygons(child)
    for poly in polygons(geometry):
        poly = orient(poly, sign=-1.0)
        for ring in [poly.exterior, *poly.interiors]:
            points = list(ring.coords)[:-1]
            if len(points) < 3:
                continue
            pen.moveTo(tuple(map(round, points[0])))
            for pt in points[1:]:
                pen.lineTo(tuple(map(round, pt)))
            pen.closePath()
    return pen.glyph()


def glyph_name(ch):
    if ch == '\ufffd':
        return '.notdef'
    if ch == ' ':
        return 'space'
    if ch.isascii() and ch.isalnum():
        return ch
    return 'uni%04X' % ord(ch)


def build(style, weight, stage):
    designs = draw(weight)
    is_bold = style == 'Bold'
    glyph_order = ['.notdef'] + [glyph_name(c) for c in designs if c != '\ufffd']
    glyphs = {}
    metrics = {}
    cmap = {}
    for char, (advance, geometry) in designs.items():
        name = glyph_name(char)
        glyphs[name] = contour_geom(geometry)
        fitted_advance = advance - (20 if char.isascii() and char.isalnum() else 0)
        metrics[name] = (fitted_advance, round(geometry.bounds[0]) if not geometry.is_empty else 0)
        if char != '\ufffd':
            cmap[ord(char)] = name
    fb = FontBuilder(1000, isTTF=True)
    fb.setupGlyphOrder(glyph_order)
    fb.setupCharacterMap(cmap)
    fb.setupGlyf(glyphs)
    fb.setupHorizontalMetrics(metrics)
    fb.setupHorizontalHeader(ascent=1060, descent=-350, lineGap=0)
    fb.setupNameTable({
        'familyName': 'FM Meridian Serif', 'styleName': style,
        'uniqueFontIdentifier': 'FreeMotion original FM Meridian Serif ' + style + ' 1.0',
        'fullName': 'FM Meridian Serif ' + style,
        'psName': 'FMMeridianSerif-' + style,
        'version': 'Version 1.000',
        'designer': 'FreeMotion original type design',
        'description': 'Original high-contrast editorial serif display face for FreeMotion.',
    })
    fb.setupOS2(version=4, fsType=0, sTypoAscender=1060, sTypoDescender=-350,
                sTypoLineGap=0, usWinAscent=1060, usWinDescent=350,
                sxHeight=490, sCapHeight=720, usWeightClass=700 if is_bold else 400,
                usWidthClass=5, fsSelection=0x20 if is_bold else 0x40)
    fb.setupPost(italicAngle=0, underlinePosition=-125, underlineThickness=55)
    fb.setupMaxp()
    font = fb.font
    font['head'].macStyle = 1 if is_bold else 0
    font['head'].created = font['head'].modified = CREATED
    font.recalcTimestamp = False
    pairs = [('A','V',-55), ('A','W',-45), ('A','Y',-55), ('A','T',-30),
             ('F','A',-55), ('L','T',-55), ('L','V',-55), ('L','Y',-60),
             ('P','A',-50), ('T','A',-55), ('T','a',-45), ('T','e',-40),
             ('T','o',-44), ('V','A',-60), ('V','a',-45), ('V','o',-40),
             ('W','A',-48), ('Y','A',-60), ('Y','a',-55), ('Y','o',-55),
             ('r','a',-22), ('r','o',-22), ('f','a',-18), ('f','o',-20)]
    feature = 'feature kern {\n' + ''.join(f' pos {a} {b} {delta};\n' for a,b,delta in pairs) + '} kern;\n'
    addOpenTypeFeaturesFromString(font, feature)
    stem_name = 'fm-meridian-serif-' + style.lower()
    ttf = stage / (stem_name + '.ttf')
    woff = stage / (stem_name + '.woff2')
    font.save(ttf)
    font.flavor = 'woff2'
    font.save(woff)
    return ttf, woff, len(cmap)


def main():
    with tempfile.TemporaryDirectory(prefix='.meridian-build-', dir=DEST) as temp:
        stage = Path(temp)
        files = [build('Regular', 86, stage), build('Bold', 119, stage)]
        TTF_DEST.mkdir(exist_ok=True)
        for ttf, woff, count in files:
            if woff.stat().st_size < 1000:
                raise RuntimeError('Incomplete font: ' + woff.name)
            os.replace(ttf, TTF_DEST / ttf.name)
            os.replace(woff, DEST / woff.name)
            print(f'{woff.name}: {(DEST / woff.name).stat().st_size} bytes, {count} Unicode characters')


if __name__ == '__main__':
    main()
