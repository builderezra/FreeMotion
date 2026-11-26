#!/usr/bin/env python3
"""Generate theme-light.css for the FreeMotion COPY (/home/ezra/fm-design).

  python3 gen.py [--app /home/ezra/fm-design] [--out <app>/theme-light.css] [--stats]

How it works (the whole idea in five lines):
  1. Parse every rule of styles.css, theme-glass.css and index.html's inline <style> blocks, in document order.
  2. Keep only COLOUR-BEARING declarations (color, background*, border*, outline*, box-shadow, text-shadow, fill,
     stroke, filter drop-shadows, colour custom properties, animations that run colour keyframes).
  3. Re-emit each one under [data-ui="light"] (a uniform +(0,1,0) of specificity, so the original cascade between
     these declarations is preserved exactly), with every literal colour passed through a context-aware map
     (text / background / border / shadow) onto the Cutline light palette (identity/tokens.css .fm-light).
  4. Keyframes that animate colours are re-emitted under a "-fmL" name and the animations that use them renamed.
  5. light-tail.css (hand-written: the tokens, the stage, the timeline, per-surface fixes) is appended LAST.
Rules that only apply to the DARK Home ([data-home="dark"], :not([data-home="light"])) are dropped: under the light UI
the Home is always light. Rules already written for the light Home are warmed (cool white -> paper) rather than inverted.
"""
import argparse, colorsys, os, re, sys

HERE = os.path.dirname(os.path.abspath(__file__))
SCOPE = '[data-ui="light"]'

# ------------------------------------------------------------------ palette (identity/tokens.css .fm-light)
PAL = dict(
    bg='#f3eee5', s1='#fffcf6', s2='#f8f3ea', s3='#ebe3d6', border='#ddd3c3', border_strong='#c3b6a2',
    t1='#1e1a15', t2='#564d42', t3='#6c6256', accent='#c63c1b', accent_ink='#b33619', on_accent='#ffffff',
    success='#2f7a3c', warning='#8f6400', danger='#b8284a', stage='#bdb9b2', kf='#b07d00')
INK = (43, 33, 22)        # the ink every translucent dark film is made of
SHADOW = (60, 40, 20)     # warm shadow


def hx(h):
    h = h.lstrip('#')
    if len(h) in (3, 4):
        h = ''.join(c * 2 for c in h)
    r, g, b = int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16)
    a = int(h[6:8], 16) / 255 if len(h) == 8 else 1.0
    return [r, g, b, a]


def fmt(c):
    r, g, b, a = [int(round(max(0, min(255, c[0])))), int(round(max(0, min(255, c[1])))), int(round(max(0, min(255, c[2])))), c[3]]
    a = max(0.0, min(1.0, a))
    if a >= 0.995:
        return '#%02x%02x%02x' % (r, g, b)
    s = ('%.3f' % a).rstrip('0').rstrip('.')
    if s.startswith('0.'):
        s = s[1:]
    return 'rgba(%d,%d,%d,%s)' % (r, g, b, s or '0')


def lin(v):
    v /= 255
    return v / 12.92 if v <= 0.03928 else ((v + 0.055) / 1.055) ** 2.4


def lum(c):
    return 0.2126 * lin(c[0]) + 0.7152 * lin(c[1]) + 0.0722 * lin(c[2])


def contrast(a, b):
    la, lb = lum(a), lum(b)
    return (max(la, lb) + 0.05) / (min(la, lb) + 0.05)


def hls(c):
    return colorsys.rgb_to_hls(c[0] / 255, c[1] / 255, c[2] / 255)


def from_hls(h, l, s, a):
    r, g, b = colorsys.hls_to_rgb(h, max(0, min(1, l)), max(0, min(1, s)))
    return [r * 255, g * 255, b * 255, a]


def chroma(c):
    return (max(c[:3]) - min(c[:3])) / 255


def mix(c1, c2, t):
    return [c1[i] + (c2[i] - c1[i]) * t for i in range(3)] + [c1[3] if len(c1) > 3 else 1]


def ramp(stops, x):
    """stops: [(x, '#hex')...] ascending; returns rgb list interpolated."""
    if x <= stops[0][0]:
        return hx(stops[0][1])
    for (x0, c0), (x1, c1) in zip(stops, stops[1:]):
        if x <= x1:
            t = (x - x0) / (x1 - x0) if x1 > x0 else 0
            return mix(hx(c0), hx(c1), t)
    return hx(stops[-1][1])


# HSL-lightness of a dark-UI neutral -> the light-UI neutral that plays the same role
BG_RAMP = [(0.0, '#efe9df'), (0.045, '#f3eee5'), (0.075, '#fffcf6'), (0.11, '#f8f3ea'), (0.16, '#efe8dc'),
           (0.24, '#e6ddcf'), (0.34, '#ddd3c3'), (0.5, '#c3b6a2'), (0.7, '#8c8073'), (0.8, '#3a332b'), (0.86, '#1e1a15')]
TEXT_RAMP = [(0.0, '#fffcf6'), (0.22, '#fffcf6'), (0.3, '#968b7e'), (0.42, '#72675a'), (0.52, '#665c50'), (0.66, '#544b40'),
             (0.8, '#3a332b'), (0.88, '#1e1a15')]
BORDER_RAMP = [(0.0, '#e9e1d4'), (0.12, '#e3dacb'), (0.22, '#ddd3c3'), (0.32, '#cfc3b0'), (0.5, '#b5a790'), (0.7, '#7d7164'),
               (0.85, '#1e1a15')]

ACCENT_HEX = {tuple(hx(h)[:3]) for h in ['#29d9bb', '#18b89c', '#5ce0c8', '#1ed760', '#2fd0b5', '#47e0c4']}
LAYER_HEX = {tuple(hx(h)[:3]) for h in ['#2bbfa8', '#e0913f', '#df5b5b', '#9b6dff', '#46c98a', '#4d8bf0', '#e85f9e', '#d9b13f']}


def is_accent(c):
    if KEEP_HUES[0]:
        return False
    key = tuple(int(round(v)) for v in c[:3])
    if key in LAYER_HEX:
        return False
    if key in ACCENT_HEX:
        return True
    h, l, s = hls(c)
    deg = h * 360
    return chroma(c) >= 0.22 and 183 <= deg <= 212 and l >= 0.3


def warm(c, target_rgb):
    """Neutral of the same lightness as c, tinted like target (paper or ink)."""
    h, l, s = hls(c)
    th, tl, ts = hls(target_rgb + [1])
    return from_hls(th, l, ts * (0.6 if l < 0.5 else 1.0), c[3])


CUR_BG = [None]   # the mapped, opaque-ish background of the rule being emitted (set by emit_nodes), or None
INK_DARK = [20, 17, 13]
INK_WHITE = [255, 255, 255]


def map_color(c, ctx, light_scoped=False, inset=False):
    if KEEP_SHEEN[0] and ctx == 'bg' and c[3] < 0.85 and chroma(c) < 0.22 and hls(c)[1] > 0.6:
        return c
    out = _map_color(c, ctx, light_scoped, inset)
    # A NEUTRAL text colour in a rule that also paints its own background: the ink is chosen against THAT ground
    # (dark text sat on bright fills in the dark UI: cyan buttons now vermilion, white chips now ink, pastel layer
    # colours unchanged), never assumed.
    bg = CUR_BG[0]
    if ctx == 'text' and bg is not None and chroma(c) < 0.22 and not light_scoped:
        if contrast(out[:3] + [1], bg) < 4.5:
            pick = INK_WHITE if contrast(INK_WHITE + [1], bg) >= contrast(INK_DARK + [1], bg) else INK_DARK
            return pick + [max(out[3], 0.86)]
    return out


def _map_color(c, ctx, light_scoped=False, inset=False):
    """c = [r,g,b,a]; ctx in text|bg|border|shadow|icon."""
    r, g, b, a = c
    h, l, s = hls(c)
    ch = chroma(c)
    neutral = ch < 0.22
    if light_scoped:
        # already designed for a light ground: warm the cool neutrals, swap the blue accent for vermilion
        if neutral:
            if l > 0.5:
                return warm(c, hx(PAL['bg']))
            out = warm(c, hx(PAL['t1']))
            if ctx == 'text':   # a touch deeper: the warm ink sits on warm paper, which costs a little contrast
                h2, l2, s2 = hls(out)
                out = from_hls(h2, l2 - 0.04, s2, out[3])
            return out
        deg = h * 360
        if 180 <= deg <= 215 and ch >= 0.22:
            if ctx in ('text', 'icon', 'border'):
                base = hx(PAL['accent_ink'])
            else:
                base = hx(PAL['accent'])
            return base[:3] + [a]
        return c
    if ctx == 'shadow':
        if neutral and l > 0.55:
            # light glows and lit inner edges
            if inset:
                return [255, 255, 255, min(0.9, a * 1.2)]
            return list(SHADOW) + [min(0.18, a * 0.25)]
        if neutral:
            return list(SHADOW) + [max(0.04, min(0.32, a * 0.42))]
        if is_accent(c):
            return hx(PAL['accent'])[:3] + [a * 0.55]
        return [r, g, b, a * 0.6]
    if is_accent(c):
        if ctx in ('text', 'icon'):
            return hx(PAL['accent_ink'])[:3] + [max(a, 0.92) if a > 0.5 else a * 1.15]
        if ctx == 'border':
            return hx(PAL['accent'])[:3] + [min(1, a * 1.05)]
        # bg
        if a >= 0.9:
            return hx(PAL['accent'])
        return hx(PAL['accent'])[:3] + [min(1, a * 0.85)]
    if not neutral:
        if ctx in ('text', 'icon'):
            # deepen until it reads on paper (4.5:1 on #fffcf6), keep the hue
            out = [r, g, b, 1]
            ground = hx(PAL['s1'])
            ll = l
            while contrast(out, ground) < 5.2 and ll > 0.05:
                ll -= 0.02
                out = from_hls(h, ll, min(1, s * 1.02), 1)
            return out[:3] + [a if a < 0.5 else max(a, 0.9)]
        if ctx == 'border':
            if a >= 0.9 and l > 0.7:
                return from_hls(h, l - 0.18, s, a)
            return [r, g, b, min(1, a * 1.15)]
        # bg: keep the colour (layer bars, tiles); translucent tints get a touch more body on paper
        if a < 0.9:
            return [r, g, b, min(1, a * 1.15)]
        return c
    # ---- neutrals
    if a >= 0.9:
        if ctx == 'bg':
            out = ramp(BG_RAMP, l)
        elif ctx == 'border':
            out = ramp(BORDER_RAMP, l)
        else:
            out = ramp(TEXT_RAMP, l)
        return out[:3] + [a]
    # translucent neutrals
    if l > 0.5:   # white films / rims on dark
        if ctx == 'bg':
            return list(INK) + [min(0.18, a * 0.8)]
        if ctx == 'border':
            return list(INK) + [min(0.32, 0.07 + a * 0.6)]
        # text
        return hx(PAL['t1'])[:3] + [min(1, max(0.64, a * 1.05))]
    # dark films
    if ctx == 'bg':
        if l < 0.04:                       # black shade / scrim
            return list(INK) + [min(0.42, a * 0.48)]
        if a >= 0.5:                       # a tinted dark material: becomes frosted paper
            return [255, 252, 246, max(0.86, min(0.97, a + 0.06))]
        return list(INK) + [a * 0.4]
    if ctx == 'border':
        return list(INK) + [min(0.3, 0.06 + a * 0.4)]
    return hx(PAL['on_accent'])[:3] + [max(a, 0.85)]


# ------------------------------------------------------------------ colour tokens inside a value
NUM = r'[-+]?(?:\d+\.?\d*|\.\d+)'
COLOR_RE = re.compile(
    r'(?P<hex>#[0-9a-fA-F]{8}\b|#[0-9a-fA-F]{6}\b|#[0-9a-fA-F]{4}\b|#[0-9a-fA-F]{3}\b)'
    r'|(?P<pct>%23(?:[0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{3})(?![0-9a-fA-F]))'
    r'|(?P<fn>\b(?:rgba?|hsla?)\(\s*[^()]*\))'
    r'|(?P<name>(?<![-\w])(?:white|black)(?![-\w]))', re.I)


def parse_fn(t):
    name = t[:t.index('(')].lower()
    inner = t[t.index('(') + 1:-1].replace('/', ' ').replace(',', ' ').split()
    vals = []
    for x in inner:
        try:
            if x.endswith('%'):
                vals.append(('%', float(x[:-1])))
            elif x.endswith('deg'):
                vals.append(('n', float(x[:-3])))
            else:
                vals.append(('n', float(x)))
        except ValueError:
            return None
    if len(vals) < 3:
        return None
    if name.startswith('rgb'):
        rgb = [v[1] * 2.55 if v[0] == '%' else v[1] for v in vals[:3]]
    else:
        hh = vals[0][1] / 360 % 1
        ss = vals[1][1] / 100
        ll = vals[2][1] / 100
        rgb = list(x * 255 for x in colorsys.hls_to_rgb(hh, ll, ss))
    a = 1.0
    if len(vals) >= 4:
        a = vals[3][1] / 100 if vals[3][0] == '%' else vals[3][1]
    return rgb + [a]


def map_value(val, ctx, light_scoped=False):
    """Replace every literal colour in val, respecting per-layer context for shadows and data: URIs."""
    if ctx == 'shadow':
        # split shadow layers at top-level commas so 'inset' is known per layer
        layers = split_top(val, ',')
        return ', '.join(map_one(L, 'shadow', light_scoped, inset=bool(re.search(r'\binset\b', L))) for L in layers)
    return map_one(val, ctx, light_scoped)


def paints_colour(val):
    """True when a background value carries an opaque CHROMATIC colour (a coloured key, a gold bar, a tile)."""
    for cm in COLOR_RE.finditer(val):
        t = cm.group(0)
        c = hx(t[3:] if cm.group('pct') else t) if (cm.group('hex') or cm.group('pct')) else parse_fn(t) if cm.group('fn') else None
        if c and c[3] >= 0.85 and chroma(c) >= 0.22:
            return True
    return False


KEEP_SHEEN = [False]
KEEP_HUES = [False]


def multicolour(val):
    """A rainbow / prism: chromatic stops whose hues spread wider than 100 degrees. Its cyan is one colour of many,
    not the accent, so it must not turn vermilion."""
    hues = []
    for cm in COLOR_RE.finditer(val):
        t = cm.group(0)
        c = hx(t[3:] if cm.group('pct') else t) if (cm.group('hex') or cm.group('pct')) else parse_fn(t) if cm.group('fn') else None
        if c and chroma(c) >= 0.22:
            hues.append(hls(c)[0] * 360)
    if len(hues) < 3:
        return False
    hues.sort()
    gaps = [b - a for a, b in zip(hues, hues[1:])] + [hues[0] + 360 - hues[-1]]
    return 360 - max(gaps) > 100


def map_one(val, ctx, light_scoped, inset=False):
    # a white sheen layered over a coloured fill is light ON that fill, in either look: keep it white
    KEEP_SHEEN[0] = ctx == 'bg' and paints_colour(val)
    KEEP_HUES[0] = multicolour(val)
    out, pos = [], 0
    # data: URIs inside url(...) are icons: map their colours as icon ink
    for m in re.finditer(r'url\((?:[^()"\']|"[^"]*"|\'[^\']*\')*\)', val):
        out.append(map_plain(val[pos:m.start()], ctx, light_scoped, inset))
        u = m.group(0)
        if 'data:' in u and 'svg' in u:
            u = map_plain(u, 'icon', light_scoped, inset)
        out.append(u)
        pos = m.end()
    out.append(map_plain(val[pos:], ctx, light_scoped, inset))
    return ''.join(out)


def map_plain(val, ctx, light_scoped, inset):
    def rep(m):
        t = m.group(0)
        if m.group('hex'):
            c = hx(t)
            return fmt(map_color(c, ctx, light_scoped, inset))
        if m.group('pct'):
            c = hx(t[3:])
            c[3] = 1.0
            return '%23' + fmt(map_color(c, ctx, light_scoped, inset))[1:]
        if m.group('fn'):
            c = parse_fn(t)
            if c is None:
                return t
            return fmt(map_color(c, ctx, light_scoped, inset))
        c = [255, 255, 255, 1.0] if t.lower() == 'white' else [0, 0, 0, 1.0]
        return fmt(map_color(c, ctx, light_scoped, inset))
    return COLOR_RE.sub(rep, val)


def has_color(val):
    return bool(COLOR_RE.search(val))


# ------------------------------------------------------------------ CSS parsing
def strip_comments(css):
    out, i, n = [], 0, len(css)
    q = None
    while i < n:
        c = css[i]
        if q:
            out.append(c)
            if c == '\\' and i + 1 < n:
                out.append(css[i + 1]); i += 2; continue
            if c == q:
                q = None
            i += 1
            continue
        if c in '"\'':
            q = c; out.append(c); i += 1; continue
        if c == '/' and i + 1 < n and css[i + 1] == '*':
            j = css.find('*/', i + 2)
            i = n if j < 0 else j + 2
            out.append(' ')
            continue
        out.append(c); i += 1
    return ''.join(out)


def split_top(s, sep):
    parts, depth, q, cur = [], 0, None, []
    for i, c in enumerate(s):
        if q:
            cur.append(c)
            if c == q:
                q = None
            continue
        if c in '"\'':
            q = c
        elif c in '([':
            depth += 1
        elif c in ')]':
            depth -= 1
        elif c == sep and depth == 0:
            parts.append(''.join(cur)); cur = []; continue
        cur.append(c)
    parts.append(''.join(cur))
    return parts


def find_block_end(css, i):
    """css[i] == '{'; return index of the matching '}'."""
    depth, q, n = 0, None, len(css)
    while i < n:
        c = css[i]
        if q:
            if c == '\\':
                i += 2; continue
            if c == q:
                q = None
        elif c in '"\'':
            q = c
        elif c == '{':
            depth += 1
        elif c == '}':
            depth -= 1
            if depth == 0:
                return i
        i += 1
    return n


def parse(css):
    """-> list of nodes: ('rule', sel, body) | ('at', prelude, [nodes]) | ('kf', name, prelude, body_text)"""
    nodes, i, n = [], 0, len(css)
    while i < n:
        # read prelude up to { or ; at depth 0
        j, depth, q = i, 0, None
        while j < n:
            c = css[j]
            if q:
                if c == q:
                    q = None
            elif c in '"\'':
                q = c
            elif c == '(':
                depth += 1
            elif c == ')':
                depth -= 1
            elif depth == 0 and c in '{;}':
                break
            j += 1
        if j >= n:
            break
        pre = css[i:j].strip()
        if css[j] in ';}':
            i = j + 1
            continue
        end = find_block_end(css, j)
        body = css[j + 1:end]
        i = end + 1
        if pre.startswith('@'):
            low = pre.lower()
            if re.match(r'@(-webkit-)?keyframes', low):
                nodes.append(('kf', pre.split(None, 1)[1].strip() if ' ' in pre else '', pre, body))
            elif re.match(r'@(media|supports|container|layer|document)', low):
                nodes.append(('at', pre, parse(body)))
            # @font-face, @page, @property: no colours we need
        else:
            nodes.append(('rule', pre, body))
    return nodes


def decls(body):
    out = []
    for d in split_top(body, ';'):
        if ':' not in d:
            continue
        if '{' in d:   # nested rule (CSS nesting) - skip
            continue
        p, v = d.split(':', 1)
        p = p.strip()
        v = v.strip()
        if not p or not v:
            continue
        imp = ''
        m = re.search(r'!\s*important\s*$', v, re.I)
        if m:
            imp = ' !important'
            v = v[:m.start()].rstrip()
        out.append((p, v, imp))
    return out


TEXT_PROPS = {'color', '-webkit-text-fill-color', 'caret-color', 'fill', 'stroke', 'text-decoration-color', 'text-decoration',
              '-webkit-text-stroke', '-webkit-text-stroke-color', 'column-rule', 'column-rule-color', 'text-emphasis-color',
              'stop-color', 'flood-color', 'accent-color', 'scrollbar-color'}
BG_PROPS = {'background', 'background-color', 'background-image', '-webkit-tap-highlight-color'}
SHADOW_PROPS = {'box-shadow', 'text-shadow', '-webkit-box-shadow'}
FILTER_PROPS = {'filter', '-webkit-filter', 'backdrop-filter', '-webkit-backdrop-filter'}
ANIM_PROPS = {'animation', 'animation-name', '-webkit-animation', '-webkit-animation-name'}


def ctx_of(prop, val):
    p = prop.lower()
    if p.startswith('--'):
        if not has_color(val):
            return None
        name = p
        if re.search(r'\d+(\.\d+)?px', val) and re.search(r'(px\s+){2,}', val + ' ') and 'gradient' not in val:
            return 'shadow'
        if re.search(r'(text|ink|fg|label|icon|glyph|-c$|color$|tone)', name):
            return 'text'
        if re.search(r'(line|rim|border|stroke|edge|ring|outline)', name):
            if 'drop-shadow' in val:
                return 'filter'
            return 'border'
        if 'drop-shadow' in val:
            return 'filter'
        return 'bg'
    if p in TEXT_PROPS:
        return 'text'
    if p in BG_PROPS:
        return 'bg'
    if p.startswith('border') or p.startswith('outline'):
        if p in ('border-radius', 'border-width', 'border-style', 'border-collapse', 'border-spacing', 'border-image-slice',
                 'outline-offset', 'outline-width', 'outline-style') or 'radius' in p or 'width' in p and 'color' not in p:
            return None
        return 'border'
    if p in SHADOW_PROPS:
        return 'shadow'
    if p in FILTER_PROPS:
        return 'filter'
    if p in ANIM_PROPS:
        return 'anim'
    return None


def map_filter(val, light_scoped):
    # drop-shadow(...) colours are shadows; brightness(0)/invert are left for the hand-written tail
    def rep(m):
        return map_value(m.group(0), 'shadow', light_scoped)
    return re.sub(r'drop-shadow\((?:[^()]|\([^()]*\))*\)', rep, val)


# ------------------------------------------------------------------ selector scoping
DROP_SEL = re.compile(r'splash|data-home="dark"|:not\(\[data-home="light"\]\)|data-theme="(?!glass)')
LIGHT_SEL = re.compile(r'data-home="light"|\.fm-ask-light|\.collab-light|\.ctx-light')


# Things the theme must NOT touch: the preview canvas (project content), the notepad (already a paper object in both
# looks), the favourite star that sits on effect pictures. Matched on the LAST compound of a complex selector.
SKIP_LAST = re.compile(r'(#preview|\.np-[-\w]+|\.fxb-star|\.sm-caplook-s)(?![-\w])[^\s>+~]*$')


def scope_selector(sel):
    out = []
    for s in split_top(sel, ','):
        s = s.strip()
        if not s or DROP_SEL.search(s) or SKIP_LAST.search(s):
            continue
        m = re.match(r'(html|:root)(?![-\w])', s, re.I)
        if m:
            s = s[:m.end()] + SCOPE + s[m.end():]
        elif re.match(r'body(?![-\w])', s, re.I):
            s = SCOPE + ' ' + s
        elif s.startswith(('::', '*')) and False:
            pass
        else:
            s = SCOPE + ' ' + s
        out.append(s)
    return out


# ------------------------------------------------------------------ main
STATS = dict(rules=0, decls=0, literals=0, mapped=0, kf=0, dropped=0)
VAR_BG = {'--accent': PAL['accent'], '--accent-2': '#a8321a', '--am-green': PAL['accent'], '--lg-fill': PAL['accent'],
          '--panel': PAL['s1'], '--panel-2': PAL['s2'], '--panel-3': '#efe8dc', '--bg': PAL['bg'], '--kf': '#ffce4a',
          '--text': PAL['t1'], '--good': '#5ad9b0'}


def block_bg(dl, light_scoped):
    """The ground this rule paints under its own text, as the LIGHT UI will show it (or None if it paints none)."""
    for p, v, imp in dl:
        if p.lower() not in ('background', 'background-color', 'background-image'):
            continue
        m = re.match(r'\s*var\((--[-\w]+)', v)
        if m and m.group(1) in VAR_BG:
            return hx(VAR_BG[m.group(1)])
        for cm in COLOR_RE.finditer(v):
            if cm.group('pct'):
                continue
            t = cm.group(0)
            c = hx(t) if cm.group('hex') else parse_fn(t) if cm.group('fn') else ([255, 255, 255, 1.0] if t.lower() == 'white' else [0, 0, 0, 1.0])
            if c is None:
                continue
            mc = _map_color(c, 'bg', light_scoped)
            if mc[3] >= 0.6:
                return mc[:3] + [1]
    return None


def emit_nodes(nodes, kf_map, light_ctx=False, indent=''):
    out = []
    for nd in nodes:
        if nd[0] == 'at':
            inner = emit_nodes(nd[2], kf_map, light_ctx, indent + '  ')
            if inner.strip():
                out.append('%s%s {\n%s%s}\n' % (indent, nd[1], inner, indent))
        elif nd[0] == 'kf':
            name, pre, body = nd[1], nd[2], nd[3]
            if name in kf_map:
                new = kf_map[name]
                body2 = map_kf_body(body)
                out.append('%s%s {%s}\n' % (indent, pre.replace(name, new), body2))
                STATS['kf'] += 1
        else:
            sel, body = nd[1], nd[2]
            scoped = scope_selector(sel)
            if not scoped:
                STATS['dropped'] += 1
                continue
            light_scoped = bool(LIGHT_SEL.search(sel))
            ds = []
            dl = decls(body)
            CUR_BG[0] = block_bg(dl, light_scoped)
            for p, v, imp in dl:
                c = ctx_of(p, v)
                if not c:
                    continue
                if c == 'anim':
                    v2 = rename_anims(v, kf_map)
                    if v2 == v and not any(k in v for k in kf_map):
                        # identity re-emit keeps the cascade for animation intact only when it matters
                        ds.append('%s: %s%s' % (p, v, imp))
                        continue
                    ds.append('%s: %s%s' % (p, v2, imp))
                    continue
                n_lit = len(COLOR_RE.findall(v))
                STATS['literals'] += n_lit
                if c == 'filter':
                    v2 = map_filter(v, light_scoped)
                else:
                    v2 = map_value(v, c, light_scoped)
                if v2 != v:
                    STATS['mapped'] += 1
                ds.append('%s: %s%s' % (p, v2, imp))
            if ds:
                STATS['rules'] += 1
                STATS['decls'] += len(ds)
                out.append('%s%s { %s; }\n' % (indent, ',\n'.join(indent + x if i else x for i, x in enumerate(scoped)), '; '.join(ds)))
    return ''.join(out)


def map_kf_body(body):
    CUR_BG[0] = None
    out = []
    for nd in parse(body):
        if nd[0] != 'rule':
            continue
        ds = []
        for p, v, imp in decls(nd[2]):
            c = ctx_of(p, v)
            if c in ('text', 'bg', 'border', 'shadow'):
                v = map_value(v, c)
            elif c == 'filter':
                v = map_filter(v, False)
            ds.append('%s: %s' % (p, v))
        out.append(' %s { %s; }' % (nd[1], '; '.join(ds)))
    return ''.join(out) + ' '


def rename_anims(v, kf_map):
    def rep(m):
        w = m.group(0)
        return kf_map.get(w, w)
    return re.sub(r'[-\w]+', rep, v)


def collect_kf(nodes, acc):
    for nd in nodes:
        if nd[0] == 'at':
            collect_kf(nd[2], acc)
        elif nd[0] == 'kf':
            body = nd[3]
            if any(ctx_of(p, v) in ('text', 'bg', 'border', 'shadow', 'filter') and has_color(v)
                   for r in parse(body) if r[0] == 'rule' for p, v, _ in decls(r[2])):
                acc[nd[1]] = nd[1] + '-fmL'


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--app', default='/home/ezra/fm-design')
    ap.add_argument('--out', default=None)
    a = ap.parse_args()
    out_path = a.out or os.path.join(a.app, 'theme-light.css')
    html = open(os.path.join(a.app, 'index.html'), encoding='utf-8').read()
    inline = '\n'.join(re.findall(r'<style[^>]*>(.*?)</style>', html, re.S))
    sources = [('styles.css', open(os.path.join(a.app, 'styles.css'), encoding='utf-8').read()),
               ('theme-glass.css', open(os.path.join(a.app, 'theme-glass.css'), encoding='utf-8').read())]
    parsed = [(nm, parse(strip_comments(css))) for nm, css in sources]
    kf_map = {}
    for _, nodes in parsed:
        collect_kf(nodes, kf_map)
    parts = ['/* FreeMotion LIGHT UI (prototype on the design copy). GENERATED by polish/light/gen/gen.py, then light-tail.css.\n'
             '   Everything here is scoped under html[data-ui="light"]; with data-ui="dark" (the default) nothing in this file applies.\n'
             '   Do not hand-edit the generated part: change the mapping in gen.py or add a rule to light-tail.css. */\n']
    for nm, nodes in parsed:
        parts.append('\n/* ======================== mapped from %s ======================== */\n' % nm)
        parts.append(emit_nodes(nodes, kf_map))
    tail = open(os.path.join(HERE, 'light-tail.css'), encoding='utf-8').read()
    parts.append('\n/* ======================== light-tail.css (hand-written, wins) ======================== */\n')
    parts.append(tail)
    css = ''.join(parts)
    open(out_path, 'w', encoding='utf-8').write(css)
    print('wrote %s: %d bytes; rules %d, decls %d, literals %d, mapped decls %d, keyframes %d, dropped-dark-only %d'
          % (out_path, len(css), STATS['rules'], STATS['decls'], STATS['literals'], STATS['mapped'], STATS['kf'], STATS['dropped']))


if __name__ == '__main__':
    main()
