#!/usr/bin/env python3
"""Draw FM Lilt Marker, an original casual handwritten display face.

Every glyph is built from the hand-placed strokes below. No font files or
third-party outlines are read. Run with the packages in requirements.txt.
"""
from __future__ import annotations

import math
import os
import tempfile
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


def curve(a, b, c, d, steps=30):
    return [((1-t)**3*a[0] + 3*(1-t)**2*t*b[0] + 3*(1-t)*t*t*c[0] + t**3*d[0],
             (1-t)**3*a[1] + 3*(1-t)**2*t*b[1] + 3*(1-t)*t*t*c[1] + t**3*d[1])
            for t in (i / steps for i in range(steps + 1))]


def join(*paths):
    points = []
    for path in paths:
        points += path if not points else path[1:]
    return points


def roundpath(cx, cy, rx, ry, start=0, stop=360, count=52, phase=0):
    """An intentionally imperfect tilted loop, never a traced ellipse."""
    out = []
    for i in range(count + 1):
        angle = math.radians(start + (stop - start) * i / count)
        wobble = 1 + 0.035 * math.sin(3 * angle + phase)
        x = cx + rx * math.cos(angle) * wobble + 0.055 * ry * math.sin(angle)
        y = cy + ry * math.sin(angle) * wobble
        out.append((x, y))
    return out


def draw(weight):
    glyphs: dict[str, tuple[int, object]] = {}
    w = weight
    fine = w * .73

    def stroke(points, width=w, closed=False):
        if closed and points[0] != points[-1]:
            points = [*points, points[0]]
        return LineString(points).buffer(width / 2, cap_style=1, join_style=1, quad_segs=12)

    def dot(x, y, radius=36):
        return affinity.scale(Point(x, y).buffer(radius, quad_segs=16),
                              xfact=1, yfact=.91, origin=(x, y))

    def put(ch, advance, *parts):
        # The slight right lean is intentional; all source strokes are unique
        # to this family rather than transforms of another bundled face.
        geometry = unary_union([p for p in parts if not p.is_empty]) if parts else GeometryCollection()
        glyphs[ch] = (advance, affinity.skew(geometry, xs=7.5, origin=(0, 0)))

    def loop(cx=300, cy=238, rx=174, ry=203, phase=0):
        return stroke(roundpath(cx, cy, rx, ry, phase=phase), w*.88, closed=True)

    def caploop(cx=325, cy=350, rx=230, ry=315, phase=0):
        return stroke(roundpath(cx, cy, rx, ry, phase=phase), w*.92, closed=True)

    def arc(cx, cy, rx, ry, start, stop, width=w):
        return stroke(roundpath(cx, cy, rx, ry, start, stop), width)

    # Hand-lettered capitals: lively top lines, soft corners, open counters.
    put('A', 700, stroke([(83, 4), (325, 717), (604, -3)]),
        stroke(curve((195, 241), (295, 253), (409, 230), (513, 238)), fine))
    put('B', 660, stroke(curve((116, -5), (126, 164), (122, 549), (139, 716))),
        stroke(join(curve((139, 708), (518, 783), (563, 493), (326, 377)),
                    curve((326, 377), (606, 357), (575, 20), (128, 12))), w*.90))
    put('C', 705, arc(339, 352, 245, 318, 48, 310, w*.95))
    put('D', 700, stroke([(126, 5), (141, 708)]),
        stroke(join(curve((144, 708), (479, 746), (591, 579), (573, 359)),
                    curve((573, 359), (554, 117), (396, -31), (127, 5))), w*.91))
    put('E', 640, stroke(curve((163, 710), (144, 522), (141, 178), (157, 0))),
        stroke(curve((154, 696), (277, 718), (420, 700), (552, 716)), fine),
        stroke(curve((152, 354), (275, 362), (395, 338), (491, 348)), fine),
        stroke(curve((155, 7), (285, -18), (450, 10), (565, 19)), fine))
    put('F', 630, stroke([(144, 0), (159, 708)]),
        stroke(curve((155, 699), (292, 714), (444, 695), (560, 709)), fine),
        stroke(curve((153, 350), (266, 355), (385, 346), (487, 362)), fine))
    put('G', 735, arc(338, 355, 242, 319, 49, 318, w*.95),
        stroke(curve((371, 317), (482, 325), (566, 303), (606, 306)), fine),
        stroke(curve((585, 300), (596, 213), (602, 135), (582, 80)), w*.85))
    put('H', 735, stroke(curve((139, 704), (134, 533), (136, 182), (143, 0))),
        stroke(curve((579, 719), (579, 535), (581, 171), (579, -2))),
        stroke(curve((146, 345), (274, 358), (459, 337), (577, 348)), fine))
    put('I', 405, stroke(curve((183, 713), (195, 500), (183, 174), (194, 1))),
        stroke([(103, 716), (291, 716)], fine), stroke([(98, 3), (299, 3)], fine))
    put('J', 635, stroke(curve((495, 704), (502, 521), (493, 185), (475, 114))),
        stroke(curve((477, 114), (410, -82), (179, -37), (104, 72))),
        stroke([(328, 711), (572, 711)], fine))
    put('K', 680, stroke([(139, 709), (131, -1)]),
        stroke(curve((571, 706), (407, 546), (279, 424), (156, 307)), w*.91),
        stroke(curve((315, 414), (411, 302), (480, 137), (602, -2)), w*.93))
    put('L', 615, stroke(curve((153, 714), (144, 542), (135, 218), (144, 5))),
        stroke(curve((145, 6), (287, -9), (434, 16), (543, 27)), fine))
    put('M', 825, stroke([(101, 2), (135, 711), (412, 263), (672, 722), (731, 0)], w*.92))
    put('N', 750, stroke([(115, -2), (121, 714), (624, 3), (620, 713)], w*.94))
    put('O', 720, caploop(354, 355, 242, 320, .8))
    put('P', 660, stroke([(145, 0), (146, 714)]),
        stroke(join(curve((144, 711), (474, 763), (560, 602), (540, 486)),
                    curve((540, 486), (517, 315), (321, 318), (153, 334))), w*.88))
    put('Q', 735, caploop(353, 355, 242, 320, .8),
        stroke(curve((428, 120), (499, 45), (565, -15), (650, -91)), fine))
    put('R', 690, stroke([(145, 0), (146, 714)]),
        stroke(join(curve((144, 711), (474, 763), (560, 602), (540, 486)),
                    curve((540, 486), (517, 315), (321, 318), (153, 334))), w*.88),
        stroke(curve((323, 340), (390, 240), (504, 78), (594, -5)), w*.91))
    put('S', 650, stroke(join(curve((540, 621), (429, 751), (180, 756), (127, 548)),
                           curve((127, 548), (90, 384), (562, 425), (525, 181)),
                           curve((525, 181), (493, -55), (239, -43), (99, 82))), w*.89))
    put('T', 695, stroke(curve((66, 713), (249, 705), (461, 733), (622, 710)), fine),
        stroke(curve((341, 713), (343, 550), (338, 222), (347, -2))))
    put('U', 735, stroke(join([(131, 712), (123, 232)],
                           curve((123, 232), (127, -48), (579, -79), (594, 227)),
                           [(594, 227), (596, 710)]), w*.92))
    put('V', 710, stroke([(93, 715), (341, -5), (614, 716)], w*.95))
    put('W', 945, stroke([(78, 711), (215, -4), (461, 495), (699, -2), (862, 713)], w*.93))
    put('X', 690, stroke([(104, 714), (584, -4)]), stroke([(590, 714), (99, -3)]))
    put('Y', 690, stroke([(73, 710), (339, 345), (611, 716)]),
        stroke([(339, 345), (341, -3)]))
    put('Z', 670, stroke(curve((93, 702), (267, 725), (435, 699), (566, 715)), fine),
        stroke([(548, 703), (130, 6)]),
        stroke(curve((126, 10), (301, -1), (467, 7), (581, 19)), fine))

    # Single-storey lowercase and relaxed joins make the family unlike the
    # geometric sans and high-contrast serif shipped alongside it.
    put('a', 600, loop(267, 241, 176, 207, 1.3),
        stroke(curve((441, 465), (426, 298), (419, 106), (441, 0)), w*.88))
    put('b', 620, stroke(curve((132, 735), (120, 496), (124, 178), (134, 0))),
        loop(312, 237, 174, 201, .6))
    put('c', 570, arc(299, 237, 184, 205, 49, 315, w*.89))
    put('d', 620, loop(270, 237, 174, 201, .6),
        stroke(curve((451, 742), (440, 520), (438, 183), (458, -1))))
    put('e', 580, stroke(join(curve((118, 225), (172, 215), (367, 231), (454, 262)),
                         curve((454, 262), (492, 423), (349, 501), (236, 465)),
                         curve((236, 465), (80, 407), (80, 142), (254, 41)),
                         curve((254, 41), (345, -11), (433, 31), (469, 88))), w*.87))
    put('f', 410, stroke(join(curve((114, -2), (138, 170), (123, 423), (155, 592)),
                         curve((155, 592), (174, 727), (291, 783), (361, 699)))),
        stroke(curve((66, 455), (170, 471), (266, 457), (355, 466)), fine))
    put('g', 620, loop(269, 254, 171, 190, 2.1),
        stroke(curve((441, 433), (424, 261), (435, -88), (398, -175))),
        stroke(curve((398, -175), (346, -292), (189, -258), (119, -196)), w*.86))
    put('h', 620, stroke([(133, 734), (132, 0)]),
        stroke(join(curve((138, 265), (189, 498), (459, 561), (469, 308)),
                    curve((469, 308), (477, 204), (466, 84), (473, 0))), w*.91))
    put('i', 275, stroke(curve((134, 474), (136, 299), (139, 112), (141, 0))), dot(143, 658))
    put('j', 290, stroke(curve((153, 475), (148, 265), (146, -66), (125, -164))),
        stroke(curve((126, -164), (103, -237), (39, -258), (11, -226)), fine), dot(159, 656))
    put('k', 570, stroke([(128, 735), (132, -3)]),
        stroke(curve((466, 475), (336, 337), (247, 254), (151, 165)), w*.92),
        stroke(curve((285, 303), (351, 215), (426, 88), (508, -4)), w*.90))
    put('l', 270, stroke(curve((132, 735), (120, 520), (132, 178), (136, -1))))
    put('m', 825, stroke([(111, 474), (112, 0)]),
        stroke(join(curve((119, 259), (162, 495), (367, 557), (378, 290)),
                    curve((378, 290), (389, 190), (376, 76), (382, 1))), w*.90),
        stroke(join(curve((380, 269), (429, 490), (645, 548), (674, 283)),
                    curve((674, 283), (677, 175), (671, 77), (678, 0))), w*.90))
    put('n', 610, stroke([(123, 475), (124, 0)]),
        stroke(join(curve((128, 258), (181, 506), (452, 546), (468, 289)),
                    curve((468, 289), (473, 182), (465, 80), (471, 1))), w*.90))
    put('o', 590, loop(290, 238, 188, 202, .9))
    put('p', 620, stroke([(131, 476), (130, -240)]), loop(316, 234, 173, 200, 1.1))
    put('q', 620, loop(270, 234, 174, 201, 1.1), stroke([(451, 478), (458, -242)]))
    put('r', 420, stroke([(123, 476), (125, -2)]),
        stroke(curve((129, 277), (183, 430), (252, 525), (360, 449)), w*.86))
    put('s', 540, stroke(join(curve((438, 403), (343, 508), (137, 511), (117, 350)),
                           curve((117, 350), (94, 250), (466, 256), (456, 111)),
                           curve((456, 111), (441, -35), (230, -29), (93, 70))), w*.88))
    put('t', 390, stroke(curve((161, 654), (156, 475), (149, 208), (155, 105))),
        stroke(curve((155, 105), (171, -17), (284, -34), (350, 20)), w*.85),
        stroke(curve((68, 467), (161, 482), (264, 467), (338, 476)), fine))
    put('u', 600, stroke(join([(125, 473), (130, 190)],
                           curve((130, 190), (136, -46), (448, -56), (458, 174))), w*.92),
        stroke(curve((465, 476), (447, 287), (454, 121), (470, 0))))
    put('v', 555, stroke([(83, 477), (273, -1), (482, 478)]))
    put('w', 775, stroke([(71, 474), (184, -1), (392, 354), (574, 0), (706, 474)], w*.92))
    put('x', 555, stroke([(87, 473), (470, -1)], w*.93),
        stroke([(468, 477), (80, -4)], w*.93))
    put('y', 565, stroke([(77, 474), (277, 2), (483, 478)]),
        stroke(curve((278, 3), (251, -106), (221, -210), (154, -235)), w*.85))
    put('z', 540, stroke(curve((90, 463), (210, 472), (361, 464), (465, 476)), fine),
        stroke([(452, 463), (105, 8)]),
        stroke(curve((101, 8), (219, -3), (371, 6), (478, 17)), fine))

    # Original marker numerals, not transformed glyphs from other families.
    put('0', 600, stroke(roundpath(300, 351, 198, 318, phase=.5), w*.95, closed=True))
    put('1', 390, stroke([(113, 527), (224, 708), (236, -2)]),
        stroke([(93, 5), (348, 7)], fine))
    put('2', 585, stroke(join(curve((93, 548), (128, 788), (476, 772), (494, 543)),
                           curve((494, 543), (495, 399), (263, 201), (97, 14))), w*.90),
        stroke([(94, 14), (519, 9)], fine))
    put('3', 580, stroke(join(curve((103, 597), (208, 753), (484, 763), (486, 546)),
                           curve((486, 546), (483, 425), (384, 372), (277, 349)),
                           curve((277, 349), (411, 337), (505, 260), (506, 145)),
                           curve((506, 145), (510, -52), (229, -45), (96, 82))), w*.89))
    put('4', 595, stroke([(397, 3), (407, 711), (86, 208), (527, 213)], w*.89))
    put('5', 585, stroke(join([(510, 712), (148, 706), (118, 387)],
                           curve((118, 387), (277, 442), (493, 400), (500, 210)),
                           curve((500, 210), (514, -56), (232, -56), (91, 75))), w*.88))
    put('6', 590, stroke(join(curve((470, 640), (290, 791), (104, 557), (120, 231)),
                           curve((120, 231), (125, -55), (487, -64), (486, 220)),
                           curve((486, 220), (492, 426), (226, 440), (120, 231))), w*.91))
    put('7', 590, stroke(curve((80, 706), (249, 715), (421, 705), (519, 712)), fine),
        stroke([(504, 698), (224, 3)]))
    put('8', 590, stroke(roundpath(297, 532, 155, 168, phase=.7), w*.86, closed=True),
        stroke(roundpath(297, 173, 182, 178, phase=2), w*.86, closed=True))
    put('9', 590, stroke(join(curve((118, 74), (310, -82), (495, 144), (476, 480)),
                           curve((476, 480), (463, 765), (112, 768), (113, 491)),
                           curve((113, 491), (109, 276), (397, 248), (476, 480))), w*.91))

    # All printable ASCII punctuation, plus the marks used in common captions.
    put(' ', 285)
    put('.', 220, dot(111, 33, 31))
    put(',', 230, dot(114, 49, 29),
        stroke(curve((117, 39), (124, -21), (93, -67), (68, -85)), fine*.55))
    put(':', 230, dot(113, 33, 29), dot(112, 398, 29))
    put(';', 230, dot(113, 398, 29), dot(114, 49, 29),
        stroke(curve((117, 39), (124, -21), (93, -67), (68, -85)), fine*.55))
    put('!', 245, stroke(curve((120, 698), (120, 555), (115, 306), (120, 170)), w*.84),
        dot(122, 36, 28))
    put('?', 525, stroke(join(curve((85, 551), (90, 753), (462, 789), (460, 543)),
                           curve((460, 543), (455, 400), (256, 394), (258, 235))), w*.80),
        dot(256, 32, 29))
    put("'", 200, stroke([(119, 710), (91, 501)], fine*.60))
    put('"', 350, stroke([(105, 710), (80, 501)], fine*.60),
        stroke([(260, 710), (236, 501)], fine*.60))
    put('-', 345, stroke([(76, 261), (271, 269)], fine*.65))
    put('_', 550, stroke([(65, -74), (490, -71)], fine*.65))
    put('+', 550, stroke([(276, 90), (274, 542)], fine*.70),
        stroke([(65, 315), (491, 320)], fine*.70))
    put('=', 550, stroke([(66, 406), (486, 414)], fine*.66),
        stroke([(68, 210), (485, 216)], fine*.66))
    put('/', 470, stroke([(61, -127), (403, 759)], fine*.70))
    put('\\', 470, stroke([(64, 755), (404, -124)], fine*.70))
    put('(', 310, stroke(curve((273, 790), (55, 612), (55, 100), (274, -89)), fine*.85))
    put(')', 310, stroke(curve((36, 790), (255, 612), (255, 100), (37, -89)), fine*.85))
    put('[', 310, stroke([(245, 761), (99, 761), (99, -70), (245, -70)], fine*.75))
    put(']', 310, stroke([(65, 761), (211, 761), (211, -70), (65, -70)], fine*.75))
    put('{', 345, stroke(join(curve((287, 766), (141, 768), (127, 644), (127, 454)),
                             curve((127, 454), (128, 358), (102, 340), (51, 337)),
                             curve((51, 337), (102, 334), (128, 315), (127, 219)),
                             curve((127, 219), (141, 31), (141, -88), (287, -88))), fine*.64))
    put('}', 345, stroke(join(curve((58, 766), (204, 768), (218, 644), (218, 454)),
                             curve((218, 454), (217, 358), (243, 340), (294, 337)),
                             curve((294, 337), (243, 334), (217, 315), (218, 219)),
                             curve((218, 219), (204, 31), (204, -88), (58, -88))), fine*.64))
    put('|', 220, stroke([(110, -130), (110, 790)], fine*.64))
    put('*', 380, stroke([(190, 414), (190, 704)], fine*.63),
        stroke([(56, 479), (324, 626)], fine*.63),
        stroke([(55, 625), (326, 478)], fine*.63))
    put('^', 485, stroke([(64, 351), (246, 709), (421, 344)], fine*.76))
    put('~', 545, stroke(join(curve((66, 282), (136, 445), (213, 392), (279, 305)),
                           curve((279, 305), (355, 205), (461, 218), (486, 383))), fine*.75))
    put('<', 485, stroke([(415, 548), (76, 323), (414, 95)], fine*.78))
    put('>', 485, stroke([(70, 548), (409, 323), (71, 95)], fine*.78))
    put('#', 610, stroke([(229, 720), (122, 2)], fine*.75),
        stroke([(475, 716), (368, 3)], fine*.75),
        stroke([(59, 475), (558, 480)], fine*.72),
        stroke([(42, 224), (538, 229)], fine*.72))
    put('$', 620, stroke(join(curve((508, 602), (406, 746), (170, 751), (133, 553)),
                           curve((133, 553), (93, 389), (530, 415), (510, 188)),
                           curve((510, 188), (489, -55), (225, -45), (99, 83))), w*.84),
        stroke([(309, 794), (299, -94)], fine*.55))
    put('%', 720, stroke([(90, 4), (622, 710)], fine*.70),
        stroke(roundpath(185, 554, 83, 116), fine*.63, closed=True),
        stroke(roundpath(526, 155, 85, 119, phase=1), fine*.63, closed=True))
    put('&', 700, stroke(join(curve((601, 60), (434, -81), (195, -49), (132, 134)),
                           curve((132, 134), (57, 300), (264, 401), (367, 483)),
                           curve((367, 483), (514, 629), (358, 786), (225, 680)),
                           curve((225, 680), (77, 558), (296, 253), (605, 0))), w*.82))
    put('@', 785, arc(391, 317, 285, 318, 52, 345, fine*.82),
        stroke(roundpath(416, 300, 140, 158, phase=1), w*.75, closed=True),
        stroke([(551, 452), (562, 182)], fine*.80))
    put('`', 200, stroke([(91, 727), (133, 582)], fine*.64))
    put('…', 700, dot(112, 33, 29), dot(350, 33, 29), dot(588, 33, 29))
    put('–', 510, stroke([(65, 265), (445, 273)], fine*.64))
    put('—', 750, stroke([(64, 265), (685, 273)], fine*.64))
    put('‘', 200, stroke([(126, 726), (82, 501)], fine*.60))
    put('’', 200, stroke([(126, 726), (82, 501)], fine*.60))
    put('“', 350, stroke([(105, 726), (64, 501)], fine*.60),
        stroke([(260, 726), (218, 501)], fine*.60))
    put('”', 350, stroke([(105, 726), (64, 501)], fine*.60),
        stroke([(260, 726), (218, 501)], fine*.60))
    put('•', 300, dot(150, 262, 41))
    put('€', 640, arc(329, 351, 224, 315, 48, 309, w*.91),
        stroke([(64, 442), (414, 448)], fine*.65),
        stroke([(61, 265), (416, 269)], fine*.65))
    put('£', 625, stroke(join(curve((514, 583), (470, 754), (206, 765), (177, 531)),
                           curve((177, 531), (186, 364), (173, 194), (105, 10))), w*.82),
        stroke([(74, 348), (396, 354)], fine*.68),
        stroke([(101, 9), (536, 13)], fine*.68))
    put('¥', 660, stroke([(73, 715), (332, 355), (576, 716)], w*.82),
        stroke([(332, 355), (338, 1)], w*.82),
        stroke([(158, 302), (505, 307)], fine*.67),
        stroke([(159, 183), (504, 187)], fine*.67))
    put('©', 680, stroke(roundpath(340, 345, 289, 325), fine*.65, closed=True),
        arc(338, 347, 151, 182, 53, 310, fine*.85))
    put('®', 680, stroke(roundpath(340, 345, 289, 325), fine*.65, closed=True),
        stroke([(256, 197), (256, 507)], fine*.72),
        arc(325, 427, 80, 80, -90, 90, fine*.70),
        stroke([(324, 349), (431, 190)], fine*.72))
    put('�', 620, stroke([(86, 0), (86, 708), (528, 708), (528, 0), (86, 0)], fine*.70),
        stroke([(106, 18), (501, 684)], fine*.55))

    assert all(chr(i) in glyphs for i in range(32, 127)), 'Missing printable ASCII glyph'
    return glyphs


def outline(geometry):
    pen = TTGlyphPen(None)
    def polys(obj):
        if isinstance(obj, Polygon):
            yield obj
        elif isinstance(obj, (MultiPolygon, GeometryCollection)):
            for sub in obj.geoms:
                yield from polys(sub)
    for poly in polys(geometry):
        poly = orient(poly, sign=-1.0)
        for ring in [poly.exterior, *poly.interiors]:
            pts = list(ring.coords)[:-1]
            if len(pts) < 3:
                continue
            pen.moveTo(tuple(map(round, pts[0])))
            for pt in pts[1:]:
                pen.lineTo(tuple(map(round, pt)))
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
    order = ['.notdef'] + [glyph_name(c) for c in drawings if c != '�']
    glyphs, metrics, cmap = {}, {}, {}
    for ch, (advance, shape) in drawings.items():
        name = glyph_name(ch)
        glyphs[name] = outline(shape)
        metrics[name] = (advance, round(shape.bounds[0]) if not shape.is_empty else 0)
        if ch != '�': cmap[ord(ch)] = name
    fb = FontBuilder(1000, isTTF=True)
    fb.setupGlyphOrder(order)
    fb.setupCharacterMap(cmap)
    fb.setupGlyf(glyphs)
    fb.setupHorizontalMetrics(metrics)
    fb.setupHorizontalHeader(ascent=1070, descent=-350, lineGap=0)
    fb.setupNameTable({
        'familyName': 'FM Lilt Marker', 'styleName': style,
        'uniqueFontIdentifier': 'FreeMotion original FM Lilt Marker ' + style + ' 1.0',
        'fullName': 'FM Lilt Marker ' + style,
        'psName': 'FMLiltMarker-' + style,
        'version': 'Version 1.000',
        'designer': 'FreeMotion original type design',
        'description': 'Original casual handwritten marker display face for FreeMotion.',
    })
    fb.setupOS2(version=4, fsType=0, sTypoAscender=1070, sTypoDescender=-350,
                sTypoLineGap=0, usWinAscent=1070, usWinDescent=350,
                sxHeight=490, sCapHeight=720, usWeightClass=700 if bold else 400,
                usWidthClass=5, fsSelection=0x20 if bold else 0x40)
    fb.setupPost(italicAngle=-7.5, underlinePosition=-130, underlineThickness=55)
    fb.setupMaxp()
    font = fb.font
    font['head'].macStyle = 1 if bold else 0
    font['head'].created = font['head'].modified = CREATED
    font.recalcTimestamp = False
    pairs = [('A','V',-43), ('A','W',-41), ('A','Y',-46), ('A','T',-27),
             ('L','T',-37), ('L','V',-36), ('L','Y',-40), ('T','a',-35),
             ('T','e',-34), ('T','o',-38), ('V','a',-31), ('V','o',-34),
             ('W','a',-25), ('Y','o',-37), ('r','a',-16), ('r','o',-15)]
    addOpenTypeFeaturesFromString(font, 'feature kern {\n' +
                                  ''.join(f'  pos {a} {b} {v};\n' for a,b,v in pairs) +
                                  '} kern;\n')
    slug = 'fm-lilt-marker-' + style.lower()
    ttf, woff = stage / (slug + '.ttf'), stage / (slug + '.woff2')
    font.save(ttf)
    font.flavor = 'woff2'
    font.save(woff)
    return ttf, woff, len(cmap)


def main():
    with tempfile.TemporaryDirectory(prefix='.lilt-build-', dir=DEST) as temp:
        stage = Path(temp)
        files = [build('Regular', 76, stage), build('Bold', 105, stage)]
        TTF_DEST.mkdir(exist_ok=True)
        for ttf, woff, count in files:
            if woff.stat().st_size < 1000:
                raise RuntimeError('Incomplete face: ' + woff.name)
            os.replace(ttf, TTF_DEST / ttf.name)
            os.replace(woff, DEST / woff.name)
            print(f'{woff.name}: {(DEST / woff.name).stat().st_size} bytes, {count} mapped characters')


if __name__ == '__main__':
    main()
