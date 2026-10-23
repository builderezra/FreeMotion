# Renders the 44 timeline-F logo options as 1024x1024 app-icon PNGs (PIL + numpy, 2x supersampled).
import os, sys
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

OUT = os.path.dirname(os.path.abspath(__file__))
N = 2048            # work size; saved at 1024
FINAL = 1024
BG = '#0b0b0d'

def rgb(h):
    h = h.lstrip('#')
    return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))

class Ctx:
    def __init__(self, cx, cy, frac=0.62, span=107.0):
        self.u = frac * N / span
        self.ox = N / 2 - cx * self.u
        self.oy = N / 2 - cy * self.u
        ys, xs = np.mgrid[0:N, 0:N].astype(np.float32)
        self.VX = (xs + 0.5 - self.ox) / self.u
        self.VY = (ys + 0.5 - self.oy) / self.u
    def p(self, x, y):
        return (self.ox + x * self.u, self.oy + y * self.u)

# ---- paints ----------------------------------------------------------------------------------
def solid(c): return ('solid', c)
def lin(stops, x1=0, y1=0, x2=0, y2=1, units='bbox'): return ('lin', stops, x1, y1, x2, y2, units)
def rad(stops, cx, cy, r): return ('rad', stops, cx, cy, r)

def interp(stops, t):
    offs = [s[0] for s in stops]
    cols = [rgb(s[1]) for s in stops]
    out = np.empty(t.shape + (3,), np.float32)
    for ch in range(3):
        out[..., ch] = np.interp(t, offs, [c[ch] for c in cols])
    return out

def paint_rgb(ctx, paint, bbox):
    if paint[0] == 'solid':
        return np.broadcast_to(np.array(rgb(paint[1]), np.float32), (N, N, 3))
    if paint[0] == 'lin':
        _, stops, x1, y1, x2, y2, units = paint
        if units == 'bbox':
            bx, by, bw, bh = bbox
            nx = (ctx.VX - bx) / bw
            ny = (ctx.VY - by) / bh
        else:
            nx, ny = ctx.VX, ctx.VY
        dx, dy = x2 - x1, y2 - y1
        t = ((nx - x1) * dx + (ny - y1) * dy) / (dx * dx + dy * dy)
        return interp(stops, np.clip(t, 0, 1))
    if paint[0] == 'rad':
        _, stops, cx, cy, r = paint
        t = np.sqrt((ctx.VX - cx) ** 2 + (ctx.VY - cy) ** 2) / r
        return interp(stops, np.clip(t, 0, 1))
    raise ValueError(paint)

# ---- shapes -> masks ---------------------------------------------------------------------------
def m_rrect(ctx, x, y, w, h, r):
    im = Image.new('L', (N, N), 0)
    if w <= 0 or h <= 0:
        return im
    x0, y0 = ctx.p(x, y)
    x1, y1 = ctx.p(x + w, y + h)
    ImageDraw.Draw(im).rounded_rectangle([x0, y0, x1, y1], radius=max(0.0, r * ctx.u), fill=255)
    return im

def m_poly(ctx, pts):
    im = Image.new('L', (N, N), 0)
    ImageDraw.Draw(im).polygon([ctx.p(x, y) for x, y in pts], fill=255)
    return im

def m_circle(ctx, cx, cy, r):
    im = Image.new('L', (N, N), 0)
    x0, y0 = ctx.p(cx - r, cy - r)
    x1, y1 = ctx.p(cx + r, cy + r)
    ImageDraw.Draw(im).ellipse([x0, y0, x1, y1], fill=255)
    return im

def put(canvas, ctx, mask, paint, bbox, opacity=1.0):
    col = paint_rgb(ctx, paint, bbox)
    a = (np.asarray(mask, np.float32) / 255.0) * opacity
    layer = np.dstack([col, a[..., None] * 255.0]).clip(0, 255).astype(np.uint8)
    return Image.alpha_composite(canvas, Image.fromarray(layer, 'RGBA'))

# ---- op list renderer -------------------------------------------------------------------------
def render(ctx, ops, canvas):
    for op in ops:
        k = op[0]
        if k == 'rect':
            _, x, y, w, h, r, paint, *rest = op
            canvas = put(canvas, ctx, m_rrect(ctx, x, y, w, h, r), paint, (x, y, w, h), rest[0] if rest else 1.0)
        elif k == 'srect':                       # stroked rect, stroke centred on the edge like SVG
            _, x, y, w, h, r, sw, paint, *rest = op
            outer = np.asarray(m_rrect(ctx, x - sw / 2, y - sw / 2, w + sw, h + sw, r + sw / 2), np.float32)
            inner = np.asarray(m_rrect(ctx, x + sw / 2, y + sw / 2, w - sw, h - sw, max(r - sw / 2, 0)), np.float32)
            m = Image.fromarray(np.clip(outer - inner, 0, 255).astype(np.uint8), 'L')
            canvas = put(canvas, ctx, m, paint, (x, y, w, h), rest[0] if rest else 1.0)
        elif k == 'poly':
            _, pts, paint, *rest = op
            xs = [p[0] for p in pts]; ys = [p[1] for p in pts]
            bb = (min(xs), min(ys), max(xs) - min(xs) or 1, max(ys) - min(ys) or 1)
            canvas = put(canvas, ctx, m_poly(ctx, pts), paint, bb, rest[0] if rest else 1.0)
        elif k == 'circle':
            _, cx, cy, r, paint = op
            canvas = put(canvas, ctx, m_circle(ctx, cx, cy, r), paint, (cx - r, cy - r, 2 * r, 2 * r))
        elif k == 'glow':                        # feGaussianBlur + feMerge(blur x n, source)
            _, sigma, merges, sub = op
            layer = render(ctx, sub, Image.new('RGBA', (N, N), (0, 0, 0, 0)))
            blurred = layer.filter(ImageFilter.GaussianBlur(sigma * ctx.u))
            for _ in range(merges):
                canvas = Image.alpha_composite(canvas, blurred)
            canvas = Image.alpha_composite(canvas, layer)
        elif k == 'blur':                        # blurred-only group (soft light blobs)
            _, sigma, opacity, sub = op
            layer = render(ctx, sub, Image.new('RGBA', (N, N), (0, 0, 0, 0)))
            layer = layer.filter(ImageFilter.GaussianBlur(sigma * ctx.u))
            arr = np.asarray(layer).astype(np.float32)
            arr[..., 3] *= opacity
            canvas = Image.alpha_composite(canvas, Image.fromarray(arr.clip(0, 255).astype(np.uint8), 'RGBA'))
        elif k == 'clipx':                       # keep only x < xmax (the "played" part)
            _, xmax, sub = op
            layer = render(ctx, sub, Image.new('RGBA', (N, N), (0, 0, 0, 0)))
            arr = np.asarray(layer).astype(np.float32)
            arr[..., 3] *= (ctx.VX < xmax)
            canvas = Image.alpha_composite(canvas, Image.fromarray(arr.clip(0, 255).astype(np.uint8), 'RGBA'))
        else:
            raise ValueError(k)
    return canvas

# ---- building blocks (the circled geometry) ---------------------------------------------------
TOP, MID, FOOT = (14, 20, 92, 22), (14, 49, 62, 22), (14, 78, 26, 22)

def bars(pt, pm, pf, ot=1.0, om=1.0, of=1.0):
    return [('rect', *TOP, 5, pt, ot), ('rect', *MID, 5, pm, om), ('rect', *FOOT, 5, pf, of)]

def bars1(p, o=(1.0, 1.0, 1.0)):
    return bars(p, p, p, *o)

def ph(c):       # thin playhead with a play triangle on top (the circled look)
    return [('rect', 80.5, 14, 3, 96, 1.5, solid(c)), ('poly', [(77, 3), (89, 8.5), (77, 14)], solid(c))]

def back(c=BG, w=5):   # a dark sliver behind the playhead so it separates from bright clips
    return [('rect', 82 - w / 2, 14, w, 96, w / 2, solid(c))]

def php(c, x=82):  # playhead with a pentagon cap (Main sheet style)
    return [('rect', x - 1.5, 12, 3, 98, 1.5, solid(c)),
            ('poly', [(x - 6, 2), (x + 6, 2), (x + 6, 9), (x, 14), (x - 6, 9)], solid(c))]

def vgrad(a, b): return lin([(0, a), (1, b)])
def hgrad(*cols):
    n = len(cols) - 1
    return lin([(i / n, c) for i, c in enumerate(cols)], 0, 0, 1, 0)

GREY_T, GREY_M, GREY_F = vgrad('#a6a6ab', '#7d7d82'), vgrad('#8a8a8f', '#626267'), vgrad('#6e6e73', '#4a4a4f')

SPINE = lambda stem, arm1, arm2: [
    ('poly', [(9, 8), (33, 8), (33, 20), (21, 29), (9, 20)], solid(stem)),
    ('rect', 17, 24, 8, 88, 4, solid(stem)),
    ('rect', 33, 30, 76, 20, 5, solid(arm1)),
    ('rect', 33, 60, 50, 20, 5, solid(arm2))]

def diamond(cx, cy, r, c):
    return ('poly', [(cx, cy - r), (cx + r, cy), (cx, cy + r), (cx - r, cy)], solid(c))

WAVE = [(16, 8), (21, 14), (26, 20), (31, 12), (36, 22), (41, 16), (46, 10), (51, 18), (56, 22), (61, 12), (66, 8), (71, 14)]

def ruler():
    out = []
    for x in range(10, 111, 10):
        if x == 80:
            continue
        hgt = 6 if x in (10, 50, 100) else 3
        out.append(('rect', x - 0.75, 4, 1.5, hgt, 0.5, solid('#3a3a3f')))
    return out

def ghosts(c):
    out = []
    for (x, y, w, h) in (TOP, MID, FOOT):
        out += [('rect', x - 12, y, w, h, 5, solid(c), 0.14), ('rect', x - 6, y, w, h, 5, solid(c), 0.32), ('rect', x, y, w, h, 5, solid(c))]
    return out

def outline(c, sw):
    return [('srect', 14 + sw / 2, 20 + sw / 2, 92 - sw, 22 - sw, 4, sw, solid(c)),
            ('srect', 14 + sw / 2, 49 + sw / 2, 62 - sw, 22 - sw, 4, sw, solid(c)),
            ('srect', 14 + sw / 2, 78 + sw / 2, 26 - sw, 22 - sw, 4, sw, solid(c))]

def glass(fillc, fo, strokec, so, sw=1.5):
    out = []
    for (x, y, w, h) in (TOP, MID, FOOT):
        out.append(('rect', x, y, w, h, 5, solid(fillc), fo))
        out.append(('srect', x + 0.75, y + 0.75, w - 1.5, h - 1.5, 4.5, sw, solid(strokec), so))
    return out

TEAL = '#29d9bb'
W = '#f5f5f7'

# ---- the 44 options: (file name, background, centre, ops) ---------------------------------
C0 = (60, 57)
V = []
# Main sheet
V.append(('01-Edit-Grid', BG, C0, bars(solid('#9a9a9f'), solid('#77777c'), solid('#5c5c61')) + ph(W)))
V.append(('02-Spine', BG, (59, 60), SPINE(W, '#a1a1a6', '#6e6e73')))
V.append(('03-Tracks', BG, (60, 53), ruler() + [('rect', 6, y, 108, 26, 4, solid('#1d1d21')) for y in (18, 47, 76)]
          + bars(solid('#9a9a9f'), solid('#77777c'), solid('#5c5c61')) + php(TEAL)))
V.append(('04-Split', BG, C0, [('rect', 14, 20, 38, 22, 5, solid('#9a9a9f')), ('rect', 60, 20, 46, 22, 5, solid('#9a9a9f')),
                                ('rect', 14, 49, 38, 22, 5, solid('#77777c')), ('rect', 60, 49, 16, 22, 5, solid('#77777c')),
                                ('rect', 14, 78, 26, 22, 5, solid('#5c5c61'))] + php(W, x=56)))
V.append(('05-Keyframes', BG, (62, 60), bars(solid('#9a9a9f'), solid('#77777c'), solid('#5c5c61'))
          + [diamond(106, 31, 10, BG), diamond(106, 31, 8, W), diamond(76, 60, 10, BG), diamond(76, 60, 8, W), diamond(40, 89, 10, BG), diamond(40, 89, 8, W)]))
V.append(('06-Clip-Colours', BG, C0, bars(solid('#4f8cff'), solid('#ff9a3c'), solid('#a77bff')) + php(W)))
V.append(('07-Trim', BG, (60, 60), [('rect', 15.25, 21.25, 89.5, 19.5, 4, solid('#2a2a2e')), ('srect', 15.25, 21.25, 89.5, 19.5, 4, 2.5, solid(TEAL)),
                                    ('rect', 14, 20, 7, 22, 2.5, solid(TEAL)), ('rect', 99, 20, 7, 22, 2.5, solid(TEAL)),
                                    ('rect', 16.75, 27, 1.5, 8, 0.75, solid(BG)), ('rect', 101.75, 27, 1.5, 8, 0.75, solid(BG)),
                                    ('rect', *MID, 5, solid('#77777c')), ('rect', *FOOT, 5, solid('#5c5c61'))]))
V.append(('08-Waveform', BG, C0, [('rect', *TOP, 5, solid('#9a9a9f'))] + [('rect', x, 60 - h / 2, 3, h, 1.5, solid('#a1a1a6')) for x, h in WAVE]
          + [('rect', *FOOT, 5, solid('#5c5c61'))] + php(W)))
V.append(('09-Outline', BG, C0, outline(W, 3) + php(TEAL)))
V.append(('10-Knockout', BG, C0, [('rect', 14, 20, 48, 22, 5, solid(W)), ('rect', 67, 20, 39, 22, 5, solid(W)), ('rect', 14, 49, 48, 22, 5, solid(W)),
                                   ('rect', 67, 49, 9, 22, 4, solid(W)), ('rect', 14, 78, 26, 22, 5, solid(W)),
                                   ('poly', [(58, 4), (71, 4), (71, 10), (64.5, 15), (58, 10)], solid(W))]))
V.append(('11-Motion-Trail', BG, C0, ghosts(W) + php(TEAL)))
V.append(('12-App-Icon', '#1f1f23', (59, 60), SPINE(TEAL, W, '#a1a1a6')))
# A · greys and metals
V.append(('A1-Baseline', BG, C0, bars(GREY_T, GREY_M, GREY_F) + ph(W)))
V.append(('A2-Soft-Sheen', BG, C0, bars(GREY_T, GREY_M, GREY_F)
          + [('rect', 17, 21, 86, 1.5, 0.75, solid('#ffffff'), 0.4), ('rect', 17, 50, 56, 1.5, 0.75, solid('#ffffff'), 0.4), ('rect', 17, 79, 20, 1.5, 0.75, solid('#ffffff'), 0.4)]
          + [('glow', 2.2, 1, ph(W))]))
V.append(('A3-Brushed-Silver', BG, C0, bars1(lin([(0, '#e4e4e8'), (0.3, '#a5a6ac'), (0.55, '#eeeef1'), (0.8, '#8f9096'), (1, '#c8c9ce')], 0, 0, 1, 0), (1, 0.85, 0.7))
          + back(w=4) + ph(W)))
V.append(('A4-Chrome', BG, C0, bars1(lin([(0, '#ffffff'), (0.45, '#a4a6ad'), (0.5, '#3f4148'), (0.58, '#6b6e76'), (1, '#d3d5db')])) + back() + ph(W)))
V.append(('A5-Gunmetal', BG, C0, bars1(vgrad('#7a8492', '#343a43'), (1, 0.8, 0.62)) + ph(W)))
V.append(('A6-Graphite-Bloom', BG, C0, bars(solid('#45454a'), solid('#3a3a3f'), solid('#303035')) + [('glow', 4, 2, ph('#ffffff'))]))
V.append(('A7-Frosted-Glass', BG, C0, [('blur', 11, 0.9, [('circle', 38, 44, 24, solid(TEAL)), ('circle', 86, 80, 24, solid('#7a5cff'))])]
          + glass('#ffffff', 0.16, '#ffffff', 0.5) + ph(W)))
V.append(('A8-Light-Mode', '#f4f4f5', C0, bars(vgrad('#3f3f44', '#222226'), vgrad('#626267', '#444449'), vgrad('#85858a', '#68686d'))
          + back('#f4f4f5') + ph('#0b0b0d')))
# B · teal
V.append(('B1-Teal-Steps', BG, C0, bars(vgrad('#3ee6c9', '#1fbfa4'), vgrad('#22a993', '#178a77'), vgrad('#16796a', '#0f584d')) + back() + ph(W)))
V.append(('B2-Teal-Playhead', BG, C0, bars(GREY_T, GREY_M, GREY_F) + [('glow', 2.6, 1, ph(TEAL))]))
V.append(('B3-Teal-to-Blue', BG, C0, bars1(hgrad(TEAL, '#3a7bff'), (1, 0.85, 0.7)) + back() + ph(W)))
V.append(('B4-Mint-Glow', BG, C0, [('glow', 3.5, 1, bars1(solid(TEAL), (1, 0.78, 0.56)))] + back() + ph(W)))
V.append(('B5-Teal-Glass', BG, C0, glass(TEAL, 0.22, TEAL, 0.9) + ph(W)))
V.append(('B6-Duotone', BG, C0, bars(vgrad('#3ee6c9', '#1fb59c'), solid('#4a4a4f'), solid('#37373c')) + back() + ph(W)))
V.append(('B7-Neon-Outline', BG, C0, [('glow', 2.4, 2, outline(TEAL, 2.5) + ph(W))]))
V.append(('B8-Deep-Ocean', '#0c1517', C0, bars1(vgrad(TEAL, '#0b4f5c'), (1, 0.85, 0.7)) + back('#0c1517') + ph('#e9fffb')))
# C · colour grades
V.append(('C1-Teal-and-Orange', BG, C0, bars1(hgrad('#1fb5a4', '#d9b38c', '#ff7a2f'), (1, 0.85, 0.7)) + back() + ph(W)))
V.append(('C2-Sunset', BG, C0, bars(hgrad('#ffc15e', '#ff7a59'), hgrad('#ff7a95', '#e0457b'), hgrad('#b35cff', '#7b2ff7')) + back() + ph(W)))
V.append(('C3-Aurora', BG, C0, bars1(hgrad('#5cf2a8', TEAL, '#7a5cff'), (1, 0.85, 0.7)) + back() + ph(W)))
V.append(('C4-Cyber', BG, C0, bars1(hgrad('#00e5ff', '#ff2bd6'), (1, 0.85, 0.7)) + back() + [('glow', 2.6, 1, ph('#ffffff'))]))
V.append(('C5-Warm-Film', '#17130f', C0, bars1(vgrad('#f6e7c8', '#c98b4a'), (1, 0.82, 0.64)) + back('#17130f') + ph('#fff6e6')))
V.append(('C6-Cool-Night', '#0b0f17', C0, bars1(vgrad('#d6ebff', '#3d5a8a'), (1, 0.82, 0.64)) + back('#0b0f17') + ph('#e8f3ff')))
V.append(('C7-Holographic', BG, C0, bars1(hgrad('#a8c0ff', '#f6b6ff', '#b9fbc0', '#ffe3a3'), (1, 0.85, 0.7)) + back() + ph(W)))
V.append(('C8-Ember', BG, C0, bars1(hgrad('#ff3d3d', '#ff9a3c', '#ffd23c'), (1, 0.85, 0.7)) + back() + ph(W)))
# D · one gradient across the whole F
V.append(('D1-Teal-to-Violet', BG, C0, bars1(lin([(0, TEAL), (1, '#7a5cff')], 14, 20, 106, 100, 'user')) + back() + ph(W)))
V.append(('D2-Light-From-Above', BG, C0, bars1(lin([(0, W), (1, '#3a3a3f')], 0, 20, 0, 100, 'user')) + back() + ph(TEAL)))
V.append(('D3-Spotlight', BG, C0, bars1(rad([(0, '#ffffff'), (0.45, '#9a9a9f'), (1, '#2e2e33')], 82, 12, 105)) + back() + [('glow', 2.6, 1, ph('#ffffff'))]))
V.append(('D4-Sunset-Sweep', BG, C0, bars1(lin([(0, '#ffc15e'), (0.5, '#ff6b8b'), (1, '#8a4dff')], 14, 0, 106, 0, 'user')) + back() + ph(W)))
V.append(('D5-Played-in-Teal', BG, C0, bars1(solid('#4a4a4f')) + [('clipx', 82, bars1(lin([(0, '#1fb59c'), (1, '#3ee6c9')], 14, 0, 82, 0, 'user')))] + back() + ph(W)))
V.append(('D6-Played-in-White', BG, C0, bars1(solid('#34343a')) + [('clipx', 82, bars1(solid(W)))] + [('glow', 2.6, 1, ph(TEAL))]))
V.append(('D7-Aurora-Rising', BG, C0, bars1(lin([(0, '#7a5cff'), (0.5, TEAL), (1, '#5cf2a8')], 14, 100, 106, 20, 'user')) + back() + ph(W)))
V.append(('D8-Iridescent', BG, C0, bars1(lin([(0, TEAL), (0.3, '#4f8cff'), (0.55, '#a77bff'), (0.78, '#ff6bd6'), (1, '#ffb347')], 14, 20, 106, 100, 'user')) + back() + ph(W)))

only = set(sys.argv[1:])
ctx_cache = {}
for name, bg, centre, ops in V:
    if only and name.split('-')[0] not in only:
        continue
    ctx = ctx_cache.get(centre) or ctx_cache.setdefault(centre, Ctx(*centre))
    canvas = Image.new('RGBA', (N, N), rgb(bg) + (255,))
    canvas = render(ctx, ops, canvas)
    out = canvas.convert('RGB').resize((FINAL, FINAL), Image.LANCZOS)
    path = os.path.join(OUT, 'FreeMotion-%s.png' % name)
    out.save(path, optimize=True)
    print(path)
print('done', len(V))
