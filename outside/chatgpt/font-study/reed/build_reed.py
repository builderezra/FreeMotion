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
    put(' ', 280)
    put('!', 300, reed(150, 738),
        oval(160, 38, 44, 44, 11, 11))
    put('?', 610, bridge((79,593),(127,829),(516,844),(516,585),74,73,15),
        bridge((516,585),(495,435),(328,421),(303,266),74,29,10),
        oval(305, 40, 43, 43, 10, 10))
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
    image = Image.new('RGB', (1500, 920), '#0b171c')
    draw = ImageDraw.Draw(image)
    label = ImageFont.truetype('/System/Library/Fonts/Supplemental/Arial.ttf', 23)
    draw.text((48, 30), 'FM REED / original type proof', font=label, fill='#91a7ac')
    for y, size, style, phrase in [
        (100, 96, bold, 'NIGHT GARDEN'),
        (280, 64, regular, 'GOOD NIGHT'),
        (410, 48, bold, 'GARDEN NIGHT'),
        (525, 32, regular, 'NIGHT GARDEN'),
        (610, 24, regular, 'GOOD NIGHT'),
    ]:
        draw.text((48, y-30), f'{size} px / '+('Bold' if style==bold else 'Regular'), font=label, fill='#91a7ac')
        draw.text((48, y+12), phrase, font=ImageFont.truetype(style, size), fill='#f1e6d0')
    draw.text((48, 750), 'Mapped proof glyphs: A D E G H I N O R T ! ?', font=label, fill='#e4b975')
    draw.text((48, 835), 'Lowercase, remaining capitals, numerals and accents are not drawn yet.', font=label, fill='#91a7ac')
    image.save(HERE/'specimen.png')

    comparison = Image.new('RGB', (1500, 760), '#f2ede1')
    comp = ImageDraw.Draw(comparison)
    comp.text((48, 24), 'ACTUAL-SIZE TYPE COMPARISON / GOOD NIGHT', font=label, fill='#52636a')
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
                comp.text((365,y-5), 'GOOD NIGHT', font=ImageFont.truetype(font_path,size), fill='#14232a')
    comparison.save(HERE/'comparison.png')


if __name__ == '__main__':
    regular, bold = build('Regular'), build('Bold')
    specimen(regular, bold)
    print('Built', regular.name, bold.name, 'and specimen.png')
