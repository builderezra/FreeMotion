#!/usr/bin/env python3
"""Draw FM Signal Pixel from original, hand-plotted 7×9 character grids.

The grids below are the source outlines. No font file, glyph, tracing data, or
image is read. The resulting square-step letterforms are for retro video titles,
game overlays, timers and interface graphics; they are deliberately unlike the
other FreeMotion families' pen, serif and continuous geometric constructions.
"""
from __future__ import annotations

import os
import tempfile
from pathlib import Path

from fontTools.feaLib.builder import addOpenTypeFeaturesFromString
from fontTools.fontBuilder import FontBuilder
from fontTools.pens.ttGlyphPen import TTGlyphPen
from shapely.geometry import GeometryCollection, MultiPolygon, Polygon, box
from shapely.geometry.polygon import orient
from shapely.ops import unary_union

HERE = Path(__file__).resolve().parent
DEST = HERE.parent
TTF_DEST = HERE / 'fonts'
PITCH = 80
CREATED = 3873903662

# Nine rows are cap height; six-row lowercase has a clear 480-unit x-height.
# Letters were plotted individually, including single-storey a/g, stepped
# diagonals and the angular curves that give this face its own rhythm.
PATTERNS = {
 'A': '..###../.#...#./#.....#/#.....#/#######/#.....#/#.....#/#.....#/#.....#',
 'B': '######./#.....#/#.....#/######./#.....#/#.....#/#.....#/#.....#/######.',
 'C': '..####./.#....#/#....../#....../#....../#....../#....../.#....#/..####.',
 'D': '#####../#....#./#.....#/#.....#/#.....#/#.....#/#.....#/#....#./#####..',
 'E': '#######/#....../#....../#####../#....../#....../#....../#....../#######',
 'F': '#######/#....../#....../#####../#....../#....../#....../#....../#......',
 'G': '..####./.#....#/#....../#....../#..####/#.....#/#.....#/.#....#/..####.',
 'H': '#.....#/#.....#/#.....#/#.....#/#######/#.....#/#.....#/#.....#/#.....#',
 'I': '#####/..#../..#../..#../..#../..#../..#../..#../#####',
 'J': '..#####/......#/......#/......#/......#/#.....#/#.....#/.#...#./..###..',
 'K': '#.....#/#....#./#...#../#..#.../###..../#..#.../#...#../#....#./#.....#',
 'L': '#....../#....../#....../#....../#....../#....../#....../#....../#######',
 'M': '#.....#/##...##/#.#.#.#/#..#..#/#.....#/#.....#/#.....#/#.....#/#.....#',
 'N': '#.....#/##....#/#.#...#/#..#..#/#...#.#/#....##/#.....#/#.....#/#.....#',
 'O': '..###../.#...#./#.....#/#.....#/#.....#/#.....#/#.....#/.#...#./..###..',
 'P': '######./#.....#/#.....#/#.....#/######./#....../#....../#....../#......',
 'Q': '..###../.#...#./#.....#/#.....#/#.....#/#...#.#/#....#./.#...#./..####.',
 'R': '######./#.....#/#.....#/#.....#/######./#..#.../#...#../#....#./#.....#',
 'S': '.#####./#.....#/#....../.#...../..###../.....#./......#/......#/.######',
 'T': '#######/...#.../...#.../...#.../...#.../...#.../...#.../...#.../...#...',
 'U': '#.....#/#.....#/#.....#/#.....#/#.....#/#.....#/#.....#/.#...#./..###..',
 'V': '#.....#/#.....#/#.....#/#.....#/.#...#./.#...#./..#.#../..#.#../...#...',
 'W': '#.....#/#.....#/#.....#/#.....#/#..#..#/#..#..#/#.#.#.#/##...##/#.....#',
 'X': '#.....#/.#...#./..#.#../...#.../...#.../...#.../..#.#../.#...#./#.....#',
 'Y': '#.....#/.#...#./..#.#../...#.../...#.../...#.../...#.../...#.../...#...',
 'Z': '#######/......#/.....#./....#../...#.../..#..../.#...../#....../#######',

 'a': '......./......./......./.####../.....#./.#####./#....#./#....#./.#####.',
 'b': '#....../#....../#....../#.####./##....#/#.....#/#.....#/#.....#/######.',
 'c': '......./......./......./..####./.#....#/#....../#....../.#....#/..####.',
 'd': '......#/......#/......#/.####.#/#....##/#.....#/#.....#/#....##/.####.#',
 'e': '......./......./......./..###../.#...#./#######/#....../.#....#/..####.',
 'f': '...###./..#...#/.#...../.#...../#####../.#...../.#...../.#...../.#.....',
 'g': '......./......./......./.#####./#....#./#....#./.#####./......#/......#/#....#./.####..',
 'h': '#....../#....../#....../#.####./##....#/#.....#/#.....#/#.....#/#.....#',
 'i': '.#./.../.../.#./.#./.#./.#./.#./.#.',
 'j': '..#./..../..../..#./..#./..#./..#./..#./..#./#.#./.#..',
 'k': '#....../#....../#....../#...#../#..#.../###..../#..#.../#...#../#....#.',
 'l': '.#./.#./.#./.#./.#./.#./.#./.#./.#.',
 'm': '........./........./........./##.###.../#.#...#../#.#...#../#.#...#../#.#...#../#.#...#..',
 'n': '......./......./......./#.####./##....#/#.....#/#.....#/#.....#/#.....#',
 'o': '......./......./......./..###../.#...#./#.....#/#.....#/.#...#./..###..',
 'p': '......./......./......./######./#.....#/#.....#/######./#....../#....../#....../#......',
 'q': '......./......./......./.######/#.....#/#.....#/.######/......#/......#/......#/......#',
 'r': '...../...../...../#.###/##..#/#..../#..../#..../#....',
 's': '......./......./......./.#####./#....../.####../.....#./#....#./.####..',
 't': '..#..../..#..../#####../..#..../..#..../..#..../..#..../..#...#/...###.',
 'u': '......./......./......./#.....#/#.....#/#.....#/#.....#/#....##/.####.#',
 'v': '......./......./......./#.....#/#.....#/.#...#./.#...#./..#.#../...#...',
 'w': '........./........./........./#...#...#/#...#...#/#...#...#/#.#.#.#.#/##.#.#.##/#...#...#',
 'x': '......./......./......./#.....#/.#...#./..#.#../..#.#../.#...#./#.....#',
 'y': '......./......./......./#.....#/#.....#/.#...#./..###../...#.../...#.../..#..../.#.....',
 'z': '......./......./......./#######/.....#./....#../..#..../.#...../#######',

 '0': '..###../.#...#./#...#.#/#..#..#/#..#..#/#.#...#/#.....#/.#...#./..###..',
 '1': '..#../.##../#.#../..#../..#../..#../..#../..#../#####',
 '2': '.#####./#.....#/......#/.....#./..###../.#...../#....../#....../#######',
 '3': '######./......#/......#/..####./......#/......#/......#/#.....#/.#####.',
 '4': '....#../...##../..#.#../.#..#../#...#../#######/....#../....#../....#..',
 '5': '#######/#....../#....../######./......#/......#/......#/#.....#/.#####.',
 '6': '..####./.#...../#....../######./#.....#/#.....#/#.....#/.#...#./..###..',
 '7': '#######/......#/.....#./....#../...#.../..#..../..#..../..#..../..#....',
 '8': '..###../.#...#./#.....#/.#...#./..###../.#...#./#.....#/.#...#./..###..',
 '9': '..###../.#...#./#.....#/#.....#/.######/......#/......#/.....#./.####..',

 '!': '.#./.#./.#./.#./.#./.#./.#./.../.#.',
 '"': '#.#/#.#/#.#/.../.../.../.../.../...',
 '#': '.#.#./.#.#./#####/.#.#./#####/.#.#./.#.#./...../.....',
 '$': '..#.../.#####/#.#.../#.#.../.#####/...#.#/...#.#/#####./..#...',
 '%': '##...#./##..#../...#.../..#..../.#...../#..##../#..##../......./.......',
 '&': '.###.../#...#../#...#../.###.../#.#..#./#..##../#...#../.###.##/.......',
 "'": '#/#/#/./././././.',
 '(': '..#./.#../#.../#.../#.../#.../#.../.#../..#.',
 ')': '.#../..#./...#/...#/...#/...#/...#/..#./.#..',
 '*': '..#../#.#.#/.###./#.#.#/..#../...../...../...../.....',
 '+': '...../..#../..#../#####/..#../..#../...../...../.....',
 ',': '.../.../.../.../.../.#./.#./#../...',
 '-': '...../...../...../#####/...../...../...../...../.....',
 '.': '.../.../.../.../.../.../.../.#./.#.',
 '/': '......#/.....#./....#../...#.../..#..../.#...../#....../......./.......',
 ':': '.../.#./.#./.../.../.../.#./.#./...',
 ';': '.../.#./.#./.../.../.#./.#./#../...',
 '<': '....#/...#./..#../.#.../#..../.#.../..#../...#./....#',
 '=': '...../...../#####/...../#####/...../...../...../.....',
 '>': '#..../.#.../..#../...#./....#/...#./..#../.#.../#....',
 '?': '.###./#...#/#...#/...#./..#../..#../...../..#../..#..',
 '@': '..###../.#...#./#..####/#.#...#/#.#.###/#..#.../#....../.#...#./..###..',
 '[': '####/##../##../##../##../##../##../##../####',
 '\\': '#....../.#...../..#..../...#.../....#../.....#./......#/......./.......',
 ']': '####/..##/..##/..##/..##/..##/..##/..##/####',
 '^': '..#../.#.#./#...#/...../...../...../...../...../.....',
 '_': '......./......./......./......./......./......./......./......./#######',
 '`': '#../.#./..#/.../.../.../.../.../...',
 '{': '..##/..#./..#./.##./##../.##./..#./..#./..##',
 '|': '#/#/#/#/#/#/#/#/#',
 '}': '##../.#../.#../.##./..##/.##./.#../.#../##..',
 '~': '......./......./.##..##/#..##../......./......./......./......./.......',
 '•': '.../.../.../.#./###/.#./.../.../...',
 'Ł': '#....../#....../#....../#####../#....../#....../#....../#....../#######',
 'ł': '.#./.#./.#./###/.#./.#./.#./.#./.#.',
}


def rows(data: str) -> list[str]:
    grid = data.split('/')
    assert len(grid) in (9, 11) and len({len(row) for row in grid}) == 1, data
    assert set(''.join(grid)) <= {'.', '#'}, data
    return grid


def glyph_name(ch: str) -> str:
    if ch == ' ': return 'space'
    if ch == '\ufffd': return '.notdef'
    if ch.isascii() and ch.isalnum(): return ch
    return 'uni%04X' % ord(ch)


def shape_of(data: str, bold: bool, marks=()):
    blocks = []
    for line, row in enumerate(rows(data)):
        for col, pixel in enumerate(row):
            if pixel == '#':
                x, y = 74 + col * PITCH, (8 - line) * PITCH
                blocks.append(box(x, y, x + PITCH, y + PITCH))
    blocks.extend(marks)
    if not blocks: return GeometryCollection()
    merged = unary_union(blocks)
    return merged.buffer(13, join_style=2) if bold else merged


def mark(kind: str, upper: bool, width: int):
    # Place a two-row grid above this face's own cap or x-height. The bitmap
    # accents retain the same stepped vocabulary as the base glyphs.
    y = 800 if upper else 640
    x = 74 + max(0, (width - 3) * PITCH // 2)
    cells = {
        'acute': [(1, 0), (2, 1)], 'grave': [(1, 0), (0, 1)],
        'circ': [(1, 1), (0, 0), (2, 0)],
        'dots': [(0, 0), (2, 0)],
        'tilde': [(0, 0), (1, 1), (2, 0)],
        'ring': [(0, 0), (1, 1), (2, 0), (1, -1)],
        'caron': [(0, 1), (1, 0), (2, 1)],
    }[kind]
    return unary_union([box(x + cx*PITCH, y + cy*PITCH,
                            x + (cx+1)*PITCH, y + (cy+1)*PITCH) for cx, cy in cells])


def contours(shape):
    pen = TTGlyphPen(None)
    def polygons(part):
        if isinstance(part, Polygon): yield part
        elif isinstance(part, MultiPolygon):
            for piece in part.geoms: yield piece
    for poly in polygons(shape):
        poly = orient(poly, sign=-1.0)
        for ring in [poly.exterior, *poly.interiors]:
            points = list(ring.coords)[:-1]
            if len(points) < 3: continue
            pen.moveTo(tuple(map(round, points[0])))
            for point in points[1:]: pen.lineTo(tuple(map(round, point)))
            pen.closePath()
    return pen.glyph()


def design(bold: bool):
    patterns = dict(PATTERNS)
    # All printable ASCII is present; space and a visible missing-glyph box
    # are separate from the nine-row source grids.
    patterns[' '] = '.../.../.../.../.../.../.../.../...'
    patterns['\ufffd'] = '#######/#.....#/#.#.#.#/#.....#/#.#.#.#/#.....#/#.#.#.#/#.....#/#######'
    assert all(chr(code) in patterns for code in range(32, 127))
    drawings = {}
    for ch, data in patterns.items():
        width = len(rows(data)[0])
        advance = (width + 2) * PITCH if ch != ' ' else 320
        drawings[ch] = (advance, shape_of(data, bold))

    accents = {
        'a': {'à':'grave','á':'acute','â':'circ','ã':'tilde','ä':'dots','å':'ring'},
        'A': {'À':'grave','Á':'acute','Â':'circ','Ã':'tilde','Ä':'dots','Å':'ring'},
        'e': {'è':'grave','é':'acute','ê':'circ','ë':'dots'},
        'E': {'È':'grave','É':'acute','Ê':'circ','Ë':'dots'},
        'i': {'ì':'grave','í':'acute','î':'circ','ï':'dots'},
        'I': {'Ì':'grave','Í':'acute','Î':'circ','Ï':'dots'},
        'o': {'ò':'grave','ó':'acute','ô':'circ','õ':'tilde','ö':'dots'},
        'O': {'Ò':'grave','Ó':'acute','Ô':'circ','Õ':'tilde','Ö':'dots'},
        'u': {'ù':'grave','ú':'acute','û':'circ','ü':'dots'},
        'U': {'Ù':'grave','Ú':'acute','Û':'circ','Ü':'dots'},
        'y': {'ý':'acute','ÿ':'dots'}, 'Y': {'Ý':'acute'},
        'n': {'ñ':'tilde'}, 'N': {'Ñ':'tilde'},
        'c': {'ć':'acute','č':'caron'}, 'C': {'Ć':'acute','Č':'caron'},
        's': {'ś':'acute','š':'caron'}, 'S': {'Ś':'acute','Š':'caron'},
        'z': {'ź':'acute','ž':'caron'}, 'Z': {'Ź':'acute','Ž':'caron'},
    }
    for base, variants in accents.items():
        data = patterns[base]
        width = len(rows(data)[0])
        if base == 'i':
            data = '.../.../.../.#./.#./.#./.#./.#./.#.'
        for ch, kind in variants.items():
            base_shape = shape_of(data, False)
            combined = unary_union([base_shape, mark(kind, base.isupper(), width)])
            if bold: combined = combined.buffer(13, join_style=2)
            drawings[ch] = (drawings[base][0], combined)
    return drawings


def build(style: str, stage: Path):
    bold = style == 'Bold'
    drawings = design(bold)
    glyphs, metrics, cmap = {}, {}, {}
    for ch, (advance, shape) in drawings.items():
        name = glyph_name(ch)
        glyphs[name] = contours(shape)
        metrics[name] = (advance, round(shape.bounds[0]) if not shape.is_empty else 0)
        if ch != '\ufffd': cmap[ord(ch)] = name
    order = ['.notdef'] + [glyph_name(ch) for ch in drawings if ch != '\ufffd']
    fb = FontBuilder(1000, isTTF=True)
    fb.setupGlyphOrder(order)
    fb.setupCharacterMap(cmap)
    fb.setupGlyf(glyphs)
    fb.setupHorizontalMetrics(metrics)
    fb.setupHorizontalHeader(ascent=1040, descent=-200, lineGap=0)
    fb.setupNameTable({
        'familyName': 'FM Signal Pixel', 'styleName': style,
        'uniqueFontIdentifier': 'FreeMotion original FM Signal Pixel ' + style + ' 1.0',
        'fullName': 'FM Signal Pixel ' + style,
        'psName': 'FMSignalPixel-' + style,
        'version': 'Version 1.000',
        'designer': 'FreeMotion original type design',
        'description': 'Original stepped pixel display face for retro motion titles.',
    })
    fb.setupOS2(version=4, fsType=0, sTypoAscender=1040, sTypoDescender=-200,
                sTypoLineGap=0, usWinAscent=1040, usWinDescent=200,
                sxHeight=480, sCapHeight=720, usWeightClass=700 if bold else 400,
                usWidthClass=5, fsSelection=0x20 if bold else 0x40)
    fb.setupPost(italicAngle=0, underlinePosition=-125, underlineThickness=65)
    fb.setupMaxp()
    font = fb.font
    font['head'].macStyle = 1 if bold else 0
    font['head'].created = font['head'].modified = CREATED
    font.recalcTimestamp = False
    slug = 'fm-signal-pixel-' + style.lower()
    ttf, woff = stage / (slug + '.ttf'), stage / (slug + '.woff2')
    font.save(ttf)
    font.flavor = 'woff2'
    font.save(woff)
    return ttf, woff, len(cmap)


def main():
    with tempfile.TemporaryDirectory(prefix='.signal-pixel-build-', dir=DEST) as temp:
        stage = Path(temp)
        files = [build('Regular', stage), build('Bold', stage)]
        TTF_DEST.mkdir(exist_ok=True)
        for ttf, woff, count in files:
            if woff.stat().st_size < 1000:
                raise RuntimeError('Incomplete face: ' + woff.name)
            os.replace(ttf, TTF_DEST / ttf.name)
            os.replace(woff, DEST / woff.name)
            print(f'{woff.name}: {(DEST / woff.name).stat().st_size} bytes, {count} mapped characters')


if __name__ == '__main__':
    main()
