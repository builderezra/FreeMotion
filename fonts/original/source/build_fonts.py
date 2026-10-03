#!/usr/bin/env python3
"""Generate original geometric Latin display fonts for FreeMotion.

All glyph centerlines and their resulting outlines are drawn here. No outlines,
metrics, or tables are copied from another font. Requires fonttools, shapely,
and brotli (for WOFF2). Run: .venv/bin/python build_fonts.py
"""
from __future__ import annotations

import math
import unicodedata
from dataclasses import dataclass
from pathlib import Path

from shapely import affinity
from shapely.geometry import LineString, Polygon, MultiPolygon, GeometryCollection, box
from shapely.ops import unary_union
from shapely.geometry.polygon import orient
from fontTools.fontBuilder import FontBuilder
from fontTools.pens.ttGlyphPen import TTGlyphPen
from fontTools.feaLib.builder import addOpenTypeFeaturesFromString
from fontTools.ttLib import TTFont

ROOT = Path(__file__).resolve().parent
OUT = ROOT / "fonts"
OUT.mkdir(exist_ok=True)


def L(*points):
    return list(points)


def C(p0, p1, p2, p3, steps=16):
    return [(
        (1-t)**3*p0[0] + 3*(1-t)**2*t*p1[0] + 3*(1-t)*t*t*p2[0] + t**3*p3[0],
        (1-t)**3*p0[1] + 3*(1-t)**2*t*p1[1] + 3*(1-t)*t*t*p2[1] + t**3*p3[1]
    ) for t in (i/steps for i in range(steps+1))]


def A(cx, cy, rx, ry, start=0, stop=360, steps=64):
    return [(cx + rx*math.cos(math.radians(start+(stop-start)*i/steps)),
             cy + ry*math.sin(math.radians(start+(stop-start)*i/steps)))
            for i in range(steps+1)]


def J(*parts):
    out=[]
    for p in parts:
        out += p if not out else p[1:]
    return out


@dataclass
class Glyph:
    advance: int
    paths: list[list[tuple[float,float]]]
    serifs: list[tuple[float,float,float]] | None = None


def G(advance, *paths, serifs=None):
    return Glyph(advance, list(paths), serifs)


# The characters are hand-drawn from a geometric stroke system, then given
# distinct terminal, contour and width treatments per family.
GLYPHS = {
    ' ': G(280),
    'A': G(650, L((85,0),(300,700),(515,0)), L((170,240),(430,240))),
    'B': G(640, L((105,0),(105,700)), J(C((105,700),(425,720),(515,620),(485,520)), C((485,520),(455,400),(295,355),(105,355))), J(C((105,355),(470,380),(535,260),(500,155)), C((500,155),(470,35),(300,0),(105,0)))),
    'C': G(660, A(310,350,220,300,48,312,50)),
    'D': G(660, L((105,0),(105,700)), J(C((105,700),(395,715),(535,585),(535,350)), C((535,350),(535,115),(395,-15),(105,0)))),
    'E': G(610, L((510,700),(105,700),(105,0),(510,0)), L((105,350),(440,350))),
    'F': G(600, L((105,0),(105,700),(515,700)), L((105,350),(440,350))),
    'G': G(685, A(315,350,220,300,48,312,50), L((355,320),(550,320),(550,105))),
    'H': G(670, L((105,0),(105,700)), L((555,0),(555,700)), L((105,345),(555,345))),
    'I': G(350, L((80,700),(270,700)), L((175,700),(175,0)), L((80,0),(270,0))),
    'J': G(575, L((75,700),(495,700)), J(L((465,700),(465,165)), C((465,165),(455,-30),(195,-60),(95,130)))),
    'K': G(650, L((105,0),(105,700)), L((535,700),(115,300)), L((310,465),(550,0))),
    'L': G(590, L((105,700),(105,0),(515,0))),
    'M': G(780, L((95,0),(95,700),(390,250),(685,700),(685,0))),
    'N': G(680, L((105,0),(105,700),(565,0),(565,700))),
    'O': G(680, A(340,350,230,300,0,360,64)),
    'P': G(625, L((105,0),(105,700)), J(C((105,700),(480,730),(540,590),(500,465)), C((500,465),(465,350),(285,345),(105,345)))),
    'Q': G(690, A(340,350,230,300,0,360,64), L((400,120),(575,-70))),
    'R': G(650, L((105,0),(105,700)), J(C((105,700),(470,730),(530,595),(495,475)), C((495,475),(460,365),(275,350),(105,350))), L((315,355),(545,0))),
    'S': G(625, J(C((510,605),(405,740),(130,725),(115,520)), C((115,520),(100,350),(515,405),(515,190)), C((515,190),(520,-20),(240,-65),(95,95)))),
    'T': G(620, L((65,700),(555,700)), L((310,700),(310,0))),
    'U': G(680, J(L((105,700),(105,205)), C((105,205),(105,-70),(565,-70),(565,205)), L((565,205),(565,700)))),
    'V': G(650, L((75,700),(325,0),(575,700))),
    'W': G(890, L((80,700),(230,0),(445,500),(660,0),(810,700))),
    'X': G(640, L((80,700),(550,0)), L((550,700),(80,0))),
    'Y': G(640, L((70,700),(320,350),(570,700)), L((320,350),(320,0))),
    'Z': G(625, L((90,700),(530,700),(90,0),(530,0))),
    'a': G(590, A(270,245,165,215,0,360,56), L((435,460),(435,0))),
    'b': G(600, L((115,0),(115,700)), A(290,245,165,215,0,360,56)),
    'c': G(565, A(285,245,175,215,48,312,42)),
    'd': G(600, L((475,0),(475,700)), A(300,245,165,215,0,360,56)),
    'e': G(580, A(285,245,175,215,48,345,44), L((120,245),(455,245))),
    'f': G(385, J(C((120,0),(120,220),(120,495),(135,605)), C((135,605),(155,745),(315,735),(340,680))), L((65,460),(325,460))),
    'g': G(600, A(285,255,165,205,0,360,56), J(L((450,445),(450,-95)), C((450,-95),(450,-265),(195,-280),(125,-165)))),
    'h': G(600, L((115,0),(115,700)), J(L((115,270),(115,225)), C((115,225),(115,555),(465,545),(465,235)), L((465,235),(465,0)))),
    'i': G(260, L((130,0),(130,460)), L((130,650),(130,665))),
    'j': G(280, J(L((150,460),(150,-125)), C((150,-125),(150,-245),(60,-255),(15,-200))), L((150,650),(150,665))),
    'k': G(570, L((115,0),(115,700)), L((465,460),(120,170)), L((265,305),(490,0))),
    'l': G(260, L((130,0),(130,700))),
    'm': G(830, L((110,0),(110,460)), J(L((110,260),(110,210)), C((110,210),(110,545),(390,530),(390,215)), L((390,215),(390,0))), J(L((390,260),(390,210)), C((390,210),(390,545),(710,530),(710,215)), L((710,215),(710,0)))),
    'n': G(600, L((115,0),(115,460)), J(L((115,260),(115,210)), C((115,210),(115,545),(475,530),(475,215)), L((475,215),(475,0)))),
    'o': G(600, A(300,245,175,215,0,360,56)),
    'p': G(600, L((115,-220),(115,460)), A(290,245,165,215,0,360,56)),
    'q': G(600, L((475,-220),(475,460)), A(300,245,165,215,0,360,56)),
    'r': G(425, L((115,0),(115,460)), J(L((115,260),(115,225)), C((115,225),(115,410),(240,495),(365,460)))),
    's': G(545, J(C((445,385),(355,490),(125,490),(115,345)), C((115,345),(110,225),(455,270),(455,125)), C((455,125),(455,-25),(225,-35),(95,65)))),
    't': G(400, J(L((160,625),(160,115)), C((160,115),(160,-20),(270,-30),(345,25))), L((65,460),(340,460))),
    'u': G(600, J(L((115,460),(115,225)), C((115,225),(115,-85),(475,-65),(475,250)), L((475,250),(475,460))), L((475,250),(475,0))),
    'v': G(565, L((80,460),(285,0),(490,460))),
    'w': G(770, L((70,460),(190,0),(385,345),(580,0),(700,460))),
    'x': G(550, L((80,460),(470,0)), L((470,460),(80,0))),
    'y': G(565, L((80,460),(285,0),(490,460)), L((285,0),(210,-220))),
    'z': G(545, L((85,460),(460,460),(85,0),(460,0))),
    '0': G(620, A(310,350,190,300,0,360,64)),
    '1': G(410, L((105,530),(245,700),(245,0)), L((90,0),(390,0))),
    '2': G(600, J(C((95,545),(95,760),(505,765),(505,535)), C((505,535),(505,400),(290,250),(95,0)), L((95,0),(525,0)))),
    '3': G(600, J(C((105,600),(190,740),(500,750),(500,540)), C((500,540),(500,425),(415,365),(295,350)), C((295,350),(440,345),(530,265),(515,150)), C((515,150),(500,-60),(190,-55),(95,95)))),
    '4': G(620, L((425,0),(425,700),(70,215),(540,215))),
    '5': G(600, J(L((515,700),(145,700),(115,370)), C((115,370),(225,445),(520,445),(520,200)), C((520,200),(520,-55),(215,-55),(90,95)))),
    '6': G(610, J(C((495,640),(285,795),(95,565),(115,220)), C((115,220),(130,-100),(535,-65),(515,225)), C((515,225),(495,455),(175,465),(115,220)))),
    '7': G(600, L((80,700),(530,700),(210,0))),
    '8': G(610, A(305,535,165,160,0,360,48), A(305,175,190,185,0,360,50)),
    '9': G(610, J(C((115,60),(325,-95),(515,135),(495,480)), C((495,480),(480,800),(75,765),(95,475)), C((95,475),(115,245),(435,235),(495,480)))),
    '.': G(270, L((135,28),(135,43))),
    ',': G(270, L((145,65),(95,-105))),
    ':': G(280, L((140,35),(140,45)), L((140,420),(140,430))),
    ';': G(280, L((145,420),(145,430)), L((150,60),(100,-100))),
    '!': G(300, L((150,700),(150,175)), L((150,30),(150,40))),
    '?': G(555, J(C((100,565),(100,750),(470,765),(470,550)), C((470,550),(470,410),(280,395),(280,225))), L((280,35),(280,45))),
    "'": G(240, L((120,700),(100,490))),
    '"': G(390, L((125,700),(105,490)), L((275,700),(255,490))),
    '-': G(375, L((80,250),(295,250))),
    '_': G(560, L((55,-80),(505,-80))),
    '+': G(580, L((290,90),(290,530)), L((75,310),(505,310))),
    '=': G(580, L((75,400),(505,400)), L((75,200),(505,200))),
    '/': G(500, L((75,-130),(425,750))),
    '\\': G(500, L((75,750),(425,-130))),
    '(': G(350, J(C((290,780),(85,605),(85,345),(85,345)), C((85,345),(85,85),(290,-90),(290,-90)))),
    ')': G(350, J(C((60,780),(265,605),(265,345),(265,345)), C((265,345),(265,85),(60,-90),(60,-90)))),
    '[': G(350, L((285,750),(110,750),(110,-80),(285,-80))),
    ']': G(350, L((65,750),(240,750),(240,-80),(65,-80))),
    '{': G(410, J(C((325,755),(140,755),(140,585),(140,475)), C((140,475),(140,355),(85,345),(55,345)), C((55,345),(140,345),(140,225),(140,115)), C((140,115),(140,-75),(325,-75),(325,-75)))),
    '}': G(410, J(C((85,755),(270,755),(270,585),(270,475)), C((270,475),(270,355),(325,345),(355,345)), C((355,345),(270,345),(270,225),(270,115)), C((270,115),(270,-75),(85,-75),(85,-75)))),
    '|': G(260, L((130,-150),(130,800))),
    '*': G(400, L((200,410),(200,700)), L((70,485),(330,625)), L((70,625),(330,485))),
    '^': G(520, L((75,345),(260,700),(445,345))),
    '~': G(580, J(C((70,275),(120,450),(240,405),(290,315)), C((290,315),(360,195),(460,215),(510,385)))),
    '<': G(520, L((440,550),(80,315),(440,80))),
    '>': G(520, L((80,550),(440,315),(80,80))),
    '#': G(650, L((230,700),(125,0)), L((495,700),(390,0)), L((75,470),(575,470)), L((45,230),(545,230))),
    '$': G(610, J(C((500,605),(390,745),(125,715),(105,525)), C((105,525),(95,360),(510,410),(510,185)), C((510,185),(505,-20),(215,-65),(95,95))), L((305,800),(305,-95))),
    '%': G(760, L((100,0),(660,700)), A(195,555,90,115,0,360,40), A(565,145,90,115,0,360,40)),
    '&': G(700, J(C((590,60),(460,-55),(205,-50),(120,135)), C((120,135),(45,295),(290,385),(385,470)), C((385,470),(570,670),(355,765),(230,685)), C((230,685),(75,585),(300,250),(610,0)))),
    '@': G(800, J(A(400,300,300,340,52,350,58), C((620,125),(765,130),(750,405),(635,500))), A(425,300,150,165,0,360,46), L((575,460),(575,190))),
}

# Accents are original strokes. Composite characters are real outlines in the
# generated fonts, so UI text does not depend on mark positioning support.
ACCENT = {
    '\u0301': [L((210,600),(350,790))],
    '\u0300': [L((350,600),(210,790))],
    '\u0302': [L((155,615),(280,765),(405,615))],
    '\u0303': [J(C((145,650),(195,750),(245,710),(290,670)), C((290,670),(340,620),(390,600),(435,700)))],
    '\u0308': [L((205,650),(205,660)), L((370,650),(370,660))],
    '\u030a': [A(285,680,70,75,0,360,32)],
    '\u0327': [J(L((290,20),(240,-115)), C((240,-115),(390,-150),(365,-230),(245,-230)))],
    '\u0304': [L((175,685),(395,685))],
    '\u0306': [C((175,730),(180,570),(390,570),(395,730))],
    '\u0307': [L((280,650),(280,660))],
    '\u030c': [L((155,765),(280,615),(405,765))],
    '\u030b': [L((165,610),(285,785)), L((315,610),(435,785))],
    '\u0328': [J(L((345,10),(305,-85)), C((305,-85),(255,-180),(320,-210),(385,-175)))],
}

# Explicit characters with forms that canonical Unicode decomposition cannot
# derive from a base plus accent.
GLYPHS.update({
    '\u00a0': G(280),
    '\u00a1': G(300, L((150,0),(150,525)), L((150,660),(150,670))),
    '\u00bf': G(555, J(C((455,135),(455,-50),(85,-65),(85,150)), C((85,150),(85,290),(275,305),(275,475))), L((275,665),(275,675))),
    '\u00df': G(620, J(L((110,0),(110,475)), C((110,475),(110,770),(505,770),(505,540)), C((505,540),(505,445),(420,390),(355,355)), C((355,355),(535,335),(565,195),(530,100)), C((530,100),(490,-30),(365,-30),(275,50)))),
    '\u00e6': G(850, A(265,245,155,215,0,360,52), L((420,460),(420,0)), A(645,245,145,215,48,345,44), L((505,245),(795,245))),
    '\u00c6': G(850, L((75,0),(310,700),(535,0)), L((160,240),(475,240)), L((330,700),(785,700)), L((490,350),(720,350)), L((535,0),(785,0))),
    '\u0153': G(850, A(250,245,160,215,0,360,56), A(620,245,160,215,48,345,44), L((470,245),(780,245))),
    '\u0152': G(890, A(280,350,200,300,0,360,64), L((470,700),(820,700)), L((470,350),(755,350)), L((470,0),(820,0))),
    '\u00f8': G(600, A(300,245,175,215,0,360,56), L((100,-20),(500,510))),
    '\u00d8': G(680, A(340,350,230,300,0,360,64), L((95,-45),(585,745))),
    '\u0142': G(310, L((155,0),(155,700)), L((60,240),(255,450))),
    '\u0141': G(590, L((105,700),(105,0),(515,0)), L((45,200),(300,475))),
    '\u0111': G(600, L((475,0),(475,700)), A(300,245,165,215,0,360,56), L((350,610),(565,610))),
    '\u0110': G(660, L((105,0),(105,700)), J(C((105,700),(395,715),(535,585),(535,350)), C((535,350),(535,115),(395,-15),(105,0))), L((40,350),(300,350))),
    '\u00f0': G(600, A(300,245,175,215,0,360,56), J(C((300,460),(355,580),(335,690),(210,760)), L((210,760),(440,620))), L((205,685),(435,785))),
    '\u00d0': G(660, L((105,0),(105,700)), J(C((105,700),(395,715),(535,585),(535,350)), C((535,350),(535,115),(395,-15),(105,0))), L((40,350),(300,350))),
    '\u00fe': G(600, L((115,-220),(115,700)), A(290,245,165,215,0,360,56)),
    '\u00de': G(625, L((105,0),(105,700)), J(C((105,565),(480,595),(540,455),(500,330)), C((500,330),(465,215),(285,210),(105,210)))),
    '\u00b7': G(280, L((140,270),(140,280))),
    '\u2022': G(360, A(180,270,40,45,0,360,24)),
    '\u2013': G(560, L((60,250),(500,250))),
    '\u2014': G(820, L((60,250),(760,250))),
    '\u2018': G(240, L((145,710),(95,485))),
    '\u2019': G(240, L((115,710),(65,485))),
    '\u201c': G(390, L((145,710),(95,485)), L((300,710),(250,485))),
    '\u201d': G(390, L((115,710),(65,485)), L((270,710),(220,485))),
    '\u2026': G(780, L((130,28),(130,43)), L((390,28),(390,43)), L((650,28),(650,43))),
    '\u20ac': G(665, A(350,350,220,300,48,312,50), L((65,440),(430,440)), L((60,260),(430,260))),
    '\u00a3': G(620, J(C((515,570),(470,750),(190,765),(175,520)), L((175,520),(175,170)), C((175,170),(170,70),(140,35),(95,0)), L((95,0),(530,0))), L((80,350),(400,350))),
    '\u00a5': G(640, L((70,700),(320,350),(570,700)), L((320,350),(320,0)), L((160,300),(480,300)), L((160,170),(480,170))),
    '\u00a9': G(760, A(380,350,305,345,0,360,70), A(385,350,155,200,50,310,40)),
    '\u00ae': G(760, A(380,350,305,345,0,360,70), L((300,200),(300,510)), A(375,435,85,75,0,180,20), L((365,350),(475,200))),
})


def add_accents():
    # Unicode NFC characters from Latin-1 and Latin Extended-A.
    for code in list(range(0x00c0,0x0180)):
        ch=chr(code)
        if ch in GLYPHS:
            continue
        decomp=unicodedata.normalize('NFD',ch)
        if len(decomp)!=2 or decomp[0] not in GLYPHS or decomp[1] not in ACCENT:
            continue
        base=GLYPHS[decomp[0]]
        is_upper=decomp[0].isupper()
        # Accent coordinates are drawn over lowercase. Capital accents move up.
        accent=[[(x+(base.advance-590)/2, y+(165 if is_upper else 0)) for x,y in path]
                for path in ACCENT[decomp[1]]]
        GLYPHS[ch]=G(base.advance, *(base.paths+accent))

add_accents()

FAMILIES = [
    # name, slug, style, horizontal scale, regular width, bold width
    ('FM Aster Round', 'fm-aster-round', 'round', 1.00, 80, 111),
    ('FM Circuit Sans', 'fm-circuit-sans', 'square', 0.78, 88, 117),
]


def geom_for(glyph: Glyph, style: str, weight: int):
    if not glyph.paths:
        return GeometryCollection()
    cap = 1 if style == 'round' else 3  # round / square
    join = 1 if style == 'round' else 3  # round / clean bevel
    segments=[]
    for path in glyph.paths:
        if len(path)<2:
            continue
        line=LineString(path)
        if style == 'square' and len(path)>20:
            if math.dist(path[0],path[-1])<1:
                minx,miny,maxx,maxy=line.bounds
                cx=(minx+maxx)/2; cy=(miny+maxy)/2
                rx=(maxx-minx)/2; ry=(maxy-miny)/2
                count=12 if ry>250 else 10
                angular=[(cx+rx*math.cos(2*math.pi*i/count),
                          cy+ry*math.sin(2*math.pi*i/count))
                         for i in range(count+1)]
                line=LineString(angular)
            else:
                line=line.simplify(10,preserve_topology=False)
        if line.length<0.01:
            continue
        segments.append(line.buffer(weight/2, cap_style=cap, join_style=join, quad_segs=12))
    result=unary_union(segments)
    if not result.is_valid:
        result=result.buffer(0)
    return result


def iter_polygons(geom):
    if isinstance(geom,Polygon):
        yield geom
    elif isinstance(geom,(MultiPolygon,GeometryCollection)):
        for sub in geom.geoms:
            yield from iter_polygons(sub)


def glyph_outline(geom):
    pen=TTGlyphPen(None)
    for poly in iter_polygons(geom):
        poly=orient(poly,sign=-1.0)
        for ring in [poly.exterior,*poly.interiors]:
            pts=list(ring.coords)[:-1]
            if len(pts)<3:
                continue
            pen.moveTo((round(pts[0][0]),round(pts[0][1])))
            for x,y in pts[1:]:
                pen.lineTo((round(x),round(y)))
            pen.closePath()
    return pen.glyph()


def glyph_name(char):
    if char==' ': return 'space'
    if char=='\u00a0': return 'nbsp'
    if len(char)==1 and (char.isascii() and char.isalnum()): return char
    return 'uni%04X'%ord(char)


def build(family, slug, style, xs, weight, bold):
    style_name='Bold' if bold else 'Regular'
    family_name=family
    full_name=f'{family_name} {style_name}'
    postscript=(family_name.replace(' ','')+'-'+style_name)
    order=['.notdef']+[glyph_name(c) for c in GLYPHS]
    # Missing glyph is an original open box with diagonal.
    notdef=G(620, L((80,0),(80,700),(540,700),(540,0),(80,0)),L((80,0),(540,700)))
    notdef_geom=geom_for(notdef,style,weight)
    if xs!=1.0:
        notdef_geom=affinity.scale(notdef_geom,xfact=xs,yfact=1.0,origin=(0,0))
    glyphs={'.notdef':glyph_outline(notdef_geom)}
    metrics={'.notdef':(round(620*xs),round(notdef_geom.bounds[0]))}
    cmap={}
    for ch, spec in GLYPHS.items():
        name=glyph_name(ch)
        geom=geom_for(spec,style,weight)
        if xs!=1.0:
            geom=affinity.scale(geom,xfact=xs,yfact=1.0,origin=(0,0))
        glyphs[name]=glyph_outline(geom)
        metrics[name]=(round(spec.advance*xs),round(geom.bounds[0]) if not geom.is_empty else 0)
        cmap[ord(ch)]=name
    fb=FontBuilder(1000,isTTF=True)
    fb.setupGlyphOrder(order)
    fb.setupCharacterMap(cmap)
    fb.setupGlyf(glyphs)
    fb.setupHorizontalMetrics(metrics)
    fb.setupHorizontalHeader(ascent=1050,descent=-330,lineGap=0)
    fb.setupNameTable({
        'familyName':family_name,
        'styleName':style_name,
        'uniqueFontIdentifier':f'FreeMotion Original {full_name} 1.0',
        'fullName':full_name,
        'psName':postscript,
        'version':'Version 1.000',
        'designer':'FreeMotion original type design',
        'description':'Original geometric Latin display font drawn for FreeMotion.',
    })
    fb.setupOS2(version=4,fsType=0,sTypoAscender=1050,sTypoDescender=-330,sTypoLineGap=0,
                usWinAscent=1050,usWinDescent=330,sxHeight=500,sCapHeight=700,
                usWeightClass=700 if bold else 400,usWidthClass=4 if xs<1 else 5,
                fsSelection=0x20 if bold else 0x40)
    fb.setupPost(italicAngle=0,underlinePosition=-130,underlineThickness=50)
    fb.setupMaxp()
    font=fb.font
    font['head'].macStyle=1 if bold else 0
    # Small but useful pair set. FeatureCompiler makes GPOS pairs available to
    # web renderers and graphic editors that honor font kerning.
    pairs=[('A','V',-65),('A','W',-52),('A','Y',-62),('A','T',-35),
           ('F','A',-52),('L','T',-50),('L','V',-50),('L','Y',-58),
           ('P','A',-55),('T','A',-55),('T','a',-48),('T','e',-48),
           ('T','o',-52),('T','u',-35),('V','A',-60),('V','a',-38),
           ('V','e',-38),('V','o',-42),('W','A',-48),('W','a',-30),
           ('Y','A',-62),('Y','a',-55),('Y','e',-55),('Y','o',-55),
           ('Y','u',-42),('r','a',-22),('r','o',-22),('f','a',-25),
           ('f','e',-25),('f','o',-25)]
    feature='feature kern {\n'+''.join(f'  pos {a} {b} {round(v*xs)};\n' for a,b,v in pairs)+'} kern;\n'
    addOpenTypeFeaturesFromString(font,feature)
    stem=f'{slug}-{style_name.lower()}'
    ttf=OUT/f'{stem}.ttf'
    woff=OUT/f'{stem}.woff2'
    font.save(ttf)
    font.flavor='woff2'
    font.save(woff)
    return ttf,woff


def main():
    for family,slug,style,xs,regular,bold in FAMILIES:
        for wt,is_bold in ((regular,False),(bold,True)):
            ttf,woff=build(family,slug,style,xs,wt,is_bold)
            print(ttf.name,ttf.stat().st_size,'bytes;',woff.name,woff.stat().st_size,'bytes')
    print('Total characters per font:',len(GLYPHS))

if __name__=='__main__': main()
