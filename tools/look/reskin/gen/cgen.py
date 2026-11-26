#!/usr/bin/env python3
"""Generate theme-cutline.css for the FreeMotion COPY (/home/ezra/fm-design): the Cutline DARK look, minimal.

  python3 cgen.py [--app /home/ezra/fm-design] [--out <app>/theme-cutline.css]

Same machinery as light/gen/gen.py (base.py here is a frozen copy of its parser), different map:
  1. Parse styles.css + theme-glass.css in cascade order; keep only colour-bearing declarations (+ font-family,
     border-radius, backdrop-filter), re-emit each under [data-ui="cutline"] (uniform +(0,1,0), cascade kept).
  2. Every literal colour goes through map_color(): navy/teal neutrals -> the warm charcoal ramp of .fm-dark,
     cool whites -> paper whites, the cyan/teal accent family -> vermilion, every other hue -> its Cutline twin
     (marker yellow, rose danger, success green, blueprint blue), with alpha kept.
  3. MINIMAL: decorative light is removed, not recoloured: inset lit rims, coloured and white glows, radial washes,
     specular catches and translucent rainbow washes become transparent; gradients made only of neutrals collapse
     to one flat colour (fades that run to transparent are kept: they do a job); backdrop blur goes (identity rule:
     no blur, opaque chrome) and the translucent materials it needed become opaque.
  4. cutline-tail.css (hand-written, last) holds the tokens, fonts and the per-surface fixes.
Rules for the LIGHT Home are dropped: under Cutline dark the Home is always the dark Home.
"""
import argparse, os, re, sys
sys.dont_write_bytecode = True
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import base as G
from base import hx, fmt, hls, from_hls, chroma, mix, ramp, contrast, COLOR_RE, parse_fn, split_top

SCOPE = '[data-ui="cutline"]'
STATS = dict(rules=0, decls=0, literals=0, mapped=0, kf=0, dropped=0, killed_glow=0, flattened=0, blur_off=0, radius=0, fonts=0)
LOG = {}   # (ctx, from) -> to   : the colour map, written beside the css

# ---- Cutline dark (identity/tokens.css .fm-dark)
PAL = dict(bg='#121110', s1='#1b1a18', s2='#232120', s3='#2d2a27', border='#33302c', border_strong='#4a453f',
           t1='#f5f0e8', t2='#bdb4a8', t3='#9a9084', accent='#ff5a36', accent_ink='#ff7656', on_accent='#1d0904',
           yellow='#f2c14e', blue='#86b8dc', success='#86d18f', danger='#ff5c7a', stage='#0c0b0a')
PAPER = (245, 240, 232)   # every white film / rim becomes this warm white
SOOT = (10, 9, 8)         # every black shade becomes this warm black

BG_RAMP = [(0.0, '#0c0b0a'), (0.04, '#121110'), (0.075, '#1b1a18'), (0.11, '#232120'), (0.155, '#2d2a27'),
           (0.21, '#36332f'), (0.3, '#4a453f'), (0.5, '#7a7168'), (0.7, '#bdb4a8'), (0.85, '#e9e3d9'),
           (0.95, '#f5f0e8'), (1.0, '#fffaf2')]
TEXT_RAMP = [(0.0, '#0c0b0a'), (0.1, '#14110d'), (0.25, '#4a453f'), (0.4, '#8a8076'), (0.47, '#9a9084'),
             (0.6, '#a89e92'), (0.66, '#bdb4a8'), (0.8, '#e2dbd0'), (0.9, '#f5f0e8'), (1.0, '#fffaf2')]
BORDER_RAMP = [(0.0, '#121110'), (0.1, '#262422'), (0.19, '#33302c'), (0.3, '#4a453f'), (0.5, '#7a7168'),
               (0.7, '#bdb4a8'), (1.0, '#f5f0e8')]

ACCENT_HEX = {tuple(hx(h)[:3]) for h in ['#29d9bb', '#18b89c', '#5ce0c8', '#1ed760', '#2fd0b5', '#47e0c4', '#5ac7ed',
                                         '#37a8d4', '#3585a1', '#00d2ff', '#4fc3ff', '#7ad6f2']}
LAYER_HEX = {tuple(hx(h)[:3]) for h in ['#2bbfa8', '#e0913f', '#df5b5b', '#9b6dff', '#46c98a', '#4d8bf0', '#e85f9e', '#d9b13f']}
# the spawn palette's CSS uses (Simple items, swatches) take the Cutline layer twins
LAYER_TWIN = {'#2bbfa8': '#86b8dc', '#e0913f': '#e9a07a', '#df5b5b': '#ec88a4', '#9b6dff': '#c6a6f0',
              '#46c98a': '#93cc9b', '#4d8bf0': '#86b8dc', '#e85f9e': '#ec88a4', '#d9b13f': '#f2c14e'}
LAYER_TWIN = {tuple(hx(k)[:3]): hx(v) for k, v in LAYER_TWIN.items()}


BLUE_SEL = [False]
# selectors whose cyan is a CATEGORY colour (Simple's overlay lane, effect/audio category art, tracker marks), never the accent
BLUE_RE = re.compile(r'sm-k-overlay|sm-k-block|sm-sec-overlay|sm-overlay|overlay-lane|mask-mark|trk-|tracker|'
                     r'data-cat=|data-h=|(?<!slider-)(?<!range-)thumb\b|fxb-banner|tut-g\d')


def key(c):
    return tuple(int(round(v)) for v in c[:3])


def neutral(c):
    return chroma(c) < 0.22


def is_accent(c):
    k = key(c)
    if k in LAYER_HEX:
        return False
    if k in ACCENT_HEX:
        return True
    h, l, s = hls(c)
    deg = h * 360
    return chroma(c) >= 0.22 and 165 <= deg <= 212 and l >= 0.28


def hue_twin(c, ctx):
    """A non-accent chromatic colour -> its Cutline twin, alpha kept."""
    a = c[3]
    k = key(c)
    if k in LAYER_TWIN:
        return LAYER_TWIN[k][:3] + [a]
    h, l, s = hls(c)
    deg = h * 360
    if deg >= 340 or deg < 15:          # reds: the rose danger, never the accent
        tgt = hx(PAL['danger'])
        if ctx == 'bg' and l < 0.5:      # deep red fills (Delete keys) stay deep
            return from_hls(350 / 360, l, s * 0.85, a)
        return tgt[:3] + [a]
    if 15 <= deg < 55:                   # orange + gold: marker yellow (orange would fight the vermilion)
        if l < 0.3:
            return from_hls(42 / 360, l, s * 0.7, a)
        return hx(PAL['yellow'])[:3] + [a]
    if 55 <= deg < 165:                  # greens: success
        if l < 0.3:
            return from_hls(127 / 360, l, s * 0.6, a)
        return hx(PAL['success'])[:3] + [a]
    if 212 < deg < 250:                  # blues: blueprint blue
        if l < 0.3:
            return from_hls(205 / 360, l, s * 0.6, a)
        return hx(PAL['blue'])[:3] + [a]
    if 165 <= deg <= 212:                # dark cyans that missed the accent test (l < .28): warm neutral
        return G.ramp(BG_RAMP, l)[:3] + [a]
    # violets and pinks: keep the hue, calm the saturation
    return from_hls(h, l, s * 0.75, a)


def map_color(c, ctx, inset=False):
    r, g, b, a = c
    h, l, s = hls(c)
    if ctx == 'shadow':
        return c  # handled per layer in map_shadow_layer
    if is_accent(c) and BLUE_SEL[0]:
        # a cyan that is a CATEGORY colour, not the accent (Simple's overlay lane): the Cutline blueprint blue
        return hx(PAL['blue'])[:3] + [a]
    if is_accent(c):
        if ctx in ('text', 'icon'):
            if l > 0.78:   # pale cyan text (on dark): a pale vermilion
                return hx('#ffb29f')[:3] + [a]
            return hx(PAL['accent_ink'])[:3] + [a]
        return hx(PAL['accent'])[:3] + [a]
    if not neutral(c):
        return hue_twin(c, ctx)
    # ---- neutrals
    if a >= 0.9:
        rp = BG_RAMP if ctx == 'bg' else BORDER_RAMP if ctx == 'border' else TEXT_RAMP
        return ramp(rp, l)[:3] + [a]
    if l > 0.5:   # white films / rims / text
        return list(PAPER) + [a]
    if ctx == 'bg':
        if l < 0.055:   # near-black shades and scrims (rgba(4,7,14,.62) is l=.035): stay see-through
            # a scrim that relied on blur to push the screen back gets a little more body instead (no blur in Cutline)
            return list(SOOT) + [min(0.86, round(a * 1.15, 3)) if a >= 0.4 else a]
        if a >= 0.5:   # a tinted dark MATERIAL (glass): opaque chrome now that the blur is gone
            return ramp(BG_RAMP, l)[:3] + [max(a, 0.97)]
        return list(SOOT) + [a]
    if ctx == 'border':
        return list(SOOT) + [a]
    return ramp(TEXT_RAMP, l)[:3] + [a]


# ------------------------------------------------------------------ shadows (where most of the decoration lives)
LEN = re.compile(r'(?<![\w.#-])-?(?:\d+\.?\d*|\.\d+)(?:px|em|rem)?(?![\w%.])')


def color_of_token(m):
    t = m.group(0)
    if m.group('hex'):
        return hx(t)
    if m.group('pct'):
        return None
    if m.group('fn'):
        return parse_fn(t)
    return [255, 255, 255, 1.0] if t.lower() == 'white' else [0, 0, 0, 1.0]


def map_shadow_layer(L, kind):
    """One shadow layer. kind = 'box' | 'text' | 'drop'. Returns the new layer text."""
    if 'var(' in L and not COLOR_RE.search(L):
        return L
    inset = bool(re.search(r'\binset\b', L))
    cm = COLOR_RE.search(L)
    if not cm:
        return L
    c = color_of_token(cm)
    if c is None:
        return L
    rest = L[:cm.start()] + ' ' + L[cm.end():]
    nums = [float(re.sub(r'[a-z]+$', '', x)) for x in LEN.findall(re.sub(r'\binset\b', '', rest))]
    ox, oy = (nums + [0, 0])[:2]
    blur = nums[2] if len(nums) > 2 else 0
    spread = nums[3] if len(nums) > 3 else 0
    h, l, s = hls(c)
    neu = neutral(c)

    def kill():
        STATS['killed_glow'] += 1
        return L[:cm.start()] + 'transparent' + L[cm.end():]

    def put(nc):
        return L[:cm.start()] + fmt(nc) + L[cm.end():]

    if kind == 'box' and blur == 0 and (spread != 0 or (ox == 0 and oy == 0)) and not (inset and spread == 0):
        # a RING (focus, selected outline, inner border): functional, map like a border
        return put(map_color(c, 'border'))
    if kind == 'box' and inset and blur <= 1 and spread == 0 and (abs(oy) <= 1 or abs(ox) <= 1):
        # a 1px lit edge / bottom edge: ornament
        return kill()
    if kind == 'box' and inset:
        # inner glow / inner shade: ornament (rings were caught above)
        return kill()
    if not neu:
        if kind == 'text' and c[3] >= 0.6 and blur <= 2:   # an outline-like coloured text stroke
            return put(map_color(c, 'text'))
        return kill()     # every coloured glow
    if l > 0.5:
        if kind == 'text' and blur <= 1.5 and c[3] >= 0.4:   # an engraved-text highlight is ink choice, keep quiet
            return kill()
        return kill()     # white glows and blooms
    # neutral dark drop: keep, warm black, a touch lighter (minimal: no heavy shadows)
    if kind == 'text':
        return put(list(SOOT) + [c[3]])
    return put(list(SOOT) + [round(c[3] * 0.75, 3)])


def map_shadow(val, kind='box'):
    if val.strip() in ('none', 'inherit', 'initial', 'unset'):
        return val
    return ', '.join(map_shadow_layer(L.strip(), kind) for L in split_top(val, ','))


def map_filter(val):
    def rep(m):
        inner = m.group(0)[len('drop-shadow('):-1]
        out = map_shadow_layer(inner, 'drop')
        if 'transparent' in out and 'transparent' not in inner:
            return 'drop-shadow(0 0 0 transparent)'
        return 'drop-shadow(' + out + ')'
    return re.sub(r'drop-shadow\((?:[^()]|\([^()]*\))*\)', rep, val)


# ------------------------------------------------------------------ backgrounds (gradients flattened)
GRAD = re.compile(r'(?:repeating-)?(?:linear|radial|conic)-gradient\((?:[^()]|\((?:[^()]|\([^()]*\))*\))*\)')


def stops_of(g):
    out = []
    for m in COLOR_RE.finditer(g):
        c = color_of_token(m)
        if c is not None:
            out.append(c)
        elif m.group(0).lower() == 'transparent':
            out.append([0, 0, 0, 0])
    for m in re.finditer(r'(?<![-\w])transparent(?![-\w])', g):
        out.append([0, 0, 0, 0.0])
    return out


def map_plain(val, ctx):
    def rep(m):
        t = m.group(0)
        if m.group('pct'):
            c = hx(t[3:]); c[3] = 1.0
            nc = map_color(c, 'icon')
            return '%23' + fmt(nc[:3] + [1])[1:]
        c = color_of_token(m)
        if c is None:
            return t
        nc = map_color(c, ctx)
        k = (ctx, fmt(c), fmt(nc))
        LOG[k] = LOG.get(k, 0) + 1
        return fmt(nc)
    return COLOR_RE.sub(rep, val)


def map_gradient(g):
    st = stops_of(g)
    if not st:
        return g
    if 'var(' in g:          # a gradient built on tokens: keep the tokens, map only the fallbacks
        return map_plain(g, 'bg')
    alphas = [c[3] for c in st]
    chrom = [c for c in st if not neutral(c) and c[3] > 0.02]
    hues = sorted(hls(c)[0] * 360 for c in chrom)
    multi = False
    if len(hues) >= 3:
        gaps = [b - a for a, b in zip(hues, hues[1:])] + [hues[0] + 360 - hues[-1]]
        multi = 360 - max(gaps) > 100
    if multi:
        if min(alphas) >= 0.9:          # an opaque spectrum: a hue strip, a colour picker, a preview. Functional.
            return g
        STATS['flattened'] += 1
        return 'linear-gradient(transparent, transparent)'   # a translucent rainbow wash: ornament
    if g.startswith(('radial', 'repeating-radial')) and max(alphas) < 0.5:
        STATS['flattened'] += 1
        return 'linear-gradient(transparent, transparent)'   # glows, specular catches, light from above
    if chrom and all(is_accent(c) for c in chrom) and min(alphas) >= 0.85 and not BLUE_SEL[0]:
        STATS['flattened'] += 1
        return 'linear-gradient(%s, %s)' % (PAL['accent'], PAL['accent'])   # a cyan key: one flat vermilion
    if max(alphas) - min(alphas) > 0.45 or g.startswith('repeating'):
        return map_plain(g, 'bg')     # a fade to transparent, or a pattern (hatching, checkerboard): it does a job
    if not chrom or all(c[3] < 0.35 for c in chrom):
        # a wash of neutrals (or faint tints): one flat colour, the mean of its stops
        mapped = [map_color(c, 'bg') if c[3] > 0 else [0, 0, 0, 0] for c in st]
        n = len(mapped)
        avg = [sum(m[i] for m in mapped) / n for i in range(3)] + [sum(m[3] for m in mapped) / n]
        STATS['flattened'] += 1
        f = fmt(avg)
        return 'linear-gradient(%s, %s)' % (f, f)
    return map_plain(g, 'bg')


def map_bg(val):
    out, pos = [], 0
    for m in re.finditer(r'url\((?:[^()"\']|"[^"]*"|\'[^\']*\')*\)|' + GRAD.pattern, val):
        out.append(map_plain(val[pos:m.start()], 'bg'))
        t = m.group(0)
        if t.startswith('url('):
            if 'data:' in t and 'svg' in t:
                t = map_plain(t, 'icon')
            out.append(t)
        else:
            out.append(map_gradient(t))
        pos = m.end()
    out.append(map_plain(val[pos:], 'bg'))
    return ''.join(out)


def map_value(val, ctx):
    if ctx == 'shadow':
        return map_shadow(val)
    if ctx == 'bg':
        return map_bg(val)
    out, pos = [], 0
    for m in re.finditer(r'url\((?:[^()"\']|"[^"]*"|\'[^\']*\')*\)', val):
        out.append(map_plain(val[pos:m.start()], ctx))
        u = m.group(0)
        if 'data:' in u and 'svg' in u:
            u = map_plain(u, 'icon')
        out.append(u)
        pos = m.end()
    out.append(map_plain(val[pos:], ctx))
    return ''.join(out)


# ------------------------------------------------------------------ type + radii
SYS_FONT = re.compile(r'-apple-system|system-ui|BlinkMacSystemFont|"SF Pro|Segoe UI|\bInter\b|Helvetica|Arial|sans-serif', re.I)


def map_font(v, shorthand=False):
    """-> the font-family to re-emit (always, when one can be read: the cascade between family declarations is kept)."""
    if v.strip() in ('inherit', 'initial', 'unset'):
        return v.strip()
    if 'var(' in v:
        return None
    if 'mono' in v.lower() or 'Instrument' in v or 'Newsreader' in v or not SYS_FONT.search(v):
        if shorthand:
            m = re.search(r'(?:\d+(?:\.\d+)?|\.\d+)(?:px|em|rem|%)(?:\s*/\s*[\w.%-]+)?\s+', v)
            return v[m.end():].strip() if m else None
        return v
    if shorthand:
        # only the FAMILY is re-emitted (as font-family): re-emitting the whole shorthand at +(0,1,0) would beat a later
        # font-size on the same element and move layout
        m = re.search(r'(?:\d+(?:\.\d+)?|\.\d+)(?:px|em|rem|%)(?:\s*/\s*[\w.%-]+)?\s+', v)
        if not m:
            return None
        return "'Instrument Sans', " + v[m.end():].strip()
    return "'Instrument Sans', " + v


def snap_r(px):
    if px <= 4:
        return px
    if px <= 7.5:
        return 6
    if px <= 10.5:
        return 9
    if px <= 14.5:
        return 12
    if px <= 22:
        return 16
    return px


def map_radius(v):
    """Always re-emitted (snapped where it is plain px) so the cascade between radius declarations is kept."""
    if 'var(' in v or 'calc(' in v:
        return v
    def rep(m):
        n = float(m.group(1))
        return '%gpx' % snap_r(n)
    return re.sub(r'(?<![\w.])(\d+(?:\.\d+)?)px', rep, v)


# ------------------------------------------------------------------ selectors
DROP_SEL = re.compile(r'splash|data-home="light"|data-theme="(?!glass)|\.fm-ask-light|\.collab-light|\.ctx-light|data-ui="light"')
SKIP_LAST = re.compile(r'(#preview|\.np-[-\w]+|\.fxb-star|\.sm-caplook-s)(?![-\w])[^\s>+~]*$')


def scope_selector(sel):
    out = []
    for s in split_top(sel, ','):
        s = s.strip()
        # judged with the :not(...) groups taken out: `html:not(.splash-on)` and `:not([data-home="light"])` are the
        # DARK editor and DARK Home, which Cutline must theme, not splash or light-Home rules
        if not s or DROP_SEL.search(re.sub(r':not\((?:[^()]|\([^()]*\))*\)', '', s)) or SKIP_LAST.search(s) \
                or re.search(r'\.np-[-\w]+', s):   # anything INSIDE the notepad too: it is a paper object in every look
            continue
        # REVIEW M2: a generic .btn rule must not reach the notepad's own buttons (+ Add a note, Done): the notepad is a
        # paper object in every look. :where() adds no specificity, so the cascade is unchanged everywhere else.
        s = re.sub(r'\.btn(?![-\w])(?=[^\s>+~]*$)', '.btn:where(:not(.np-card *))', s, count=1)
        m = re.match(r'(html|:root)(?![-\w])', s, re.I)
        if m:
            s = s[:m.end()] + SCOPE + s[m.end():]
        else:
            s = SCOPE + ' ' + s
        out.append(s)
    return out


TEXTP = G.TEXT_PROPS
BGP = G.BG_PROPS


def ctx_of(p, v):
    pl = p.lower()
    if pl == 'font-family':
        return 'font'
    if pl == 'font':
        return 'fontsh'
    if 'radius' in pl:
        return 'radius'
    if pl in ('backdrop-filter', '-webkit-backdrop-filter'):
        return 'blur'
    if pl in ('filter', '-webkit-filter'):
        return 'filter' if 'drop-shadow' in v and COLOR_RE.search(v) else None
    if pl == 'text-shadow':
        return 'tshadow'
    if pl.startswith('--') and 'drop-shadow' in v:
        return 'filter'
    c = G.ctx_of(p, v)
    return c


def emit_nodes(nodes, kf_map, indent=''):
    out = []
    for nd in nodes:
        if nd[0] == 'at':
            inner = emit_nodes(nd[2], kf_map, indent + '  ')
            if inner.strip():
                out.append('%s%s {\n%s%s}\n' % (indent, nd[1], inner, indent))
        elif nd[0] == 'kf':
            name, pre, body = nd[1], nd[2], nd[3]
            if name in kf_map:
                out.append('%s%s {%s}\n' % (indent, pre.replace(name, kf_map[name]), map_kf_body(body)))
                STATS['kf'] += 1
        else:
            sel, body = nd[1], nd[2]
            scoped = scope_selector(sel)
            if not scoped:
                STATS['dropped'] += 1
                continue
            ds = []
            BLUE_SEL[0] = bool(BLUE_RE.search(sel))
            for p, v, imp in G.decls(body):
                c = ctx_of(p, v)
                if not c:
                    continue
                if c in ('font', 'fontsh'):
                    v2 = map_font(v, c == 'fontsh')
                    if v2:
                        STATS['fonts'] += 'Instrument' in v2 and 'Instrument' not in v
                        ds.append('font-family: %s%s' % (v2, imp))
                    continue
                if c == 'radius':
                    v2 = map_radius(v)
                    if v2:
                        STATS['radius'] += v2 != v
                        ds.append('%s: %s%s' % (p, v2, imp))
                    continue
                if c == 'blur':
                    if v.strip() != 'none':
                        STATS['blur_off'] += 1
                        ds.append('%s: none%s' % (p, imp))
                    continue
                if c == 'anim':
                    v2 = G.rename_anims(v, kf_map)
                    ds.append('%s: %s%s' % (p, v2, imp))
                    continue
                STATS['literals'] += len(COLOR_RE.findall(v))
                if c == 'filter':
                    v2 = map_filter(v)
                elif c == 'tshadow':
                    v2 = map_shadow(v, 'text')
                elif c == 'shadow':
                    v2 = map_shadow(v, 'box')
                else:
                    v2 = map_value(v, c)
                if v2 != v:
                    STATS['mapped'] += 1
                ds.append('%s: %s%s' % (p, v2, imp))
            if ds:
                STATS['rules'] += 1
                STATS['decls'] += len(ds)
                out.append('%s%s { %s; }\n' % (indent, ',\n'.join(indent + x if i else x for i, x in enumerate(scoped)), '; '.join(ds)))
    return ''.join(out)


def map_kf_body(body):
    out = []
    for nd in G.parse(body):
        if nd[0] != 'rule':
            continue
        ds = []
        for p, v, imp in G.decls(nd[2]):
            c = ctx_of(p, v)
            if c in ('text', 'bg', 'border'):
                v = map_value(v, c)
            elif c == 'shadow':
                v = map_shadow(v, 'box')
            elif c == 'tshadow':
                v = map_shadow(v, 'text')
            elif c == 'filter':
                v = map_filter(v)
            ds.append('%s: %s' % (p, v))
        out.append(' %s { %s; }' % (nd[1], '; '.join(ds)))
    return ''.join(out) + ' '


def collect_kf(nodes, acc):
    for nd in nodes:
        if nd[0] == 'at':
            collect_kf(nd[2], acc)
        elif nd[0] == 'kf':
            if any(ctx_of(p, v) in ('text', 'bg', 'border', 'shadow', 'tshadow', 'filter') and G.has_color(v)
                   for r in G.parse(nd[3]) if r[0] == 'rule' for p, v, _ in G.decls(r[2])):
                acc[nd[1]] = nd[1] + '-fmC'


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--app', default='/home/ezra/fm-design')
    ap.add_argument('--out', default=None)
    a = ap.parse_args()
    out_path = a.out or os.path.join(a.app, 'theme-cutline.css')
    sources = [('styles.css', open(os.path.join(a.app, 'styles.css'), encoding='utf-8').read()),
               ('theme-glass.css', open(os.path.join(a.app, 'theme-glass.css'), encoding='utf-8').read())]
    parsed = [(nm, G.parse(G.strip_comments(css))) for nm, css in sources]
    kf_map = {}
    for _, nodes in parsed:
        collect_kf(nodes, kf_map)
    parts = ['/* FreeMotion CUTLINE (dark, minimal) - prototype on the design copy. GENERATED by polish/reskin/gen/cgen.py,\n'
             '   then cutline-tail.css. Everything is scoped under html[data-ui="cutline"]; under dark or light nothing here applies.\n'
             '   Do not hand-edit the generated part: change the map in cgen.py or add a rule to cutline-tail.css. */\n']
    for nm, nodes in parsed:
        parts.append('\n/* ======================== mapped from %s ======================== */\n' % nm)
        parts.append(emit_nodes(nodes, kf_map))
    parts.append('\n/* ======================== cutline-tail.css (hand-written, wins) ======================== */\n')
    parts.append(open(os.path.join(HERE, 'cutline-tail.css'), encoding='utf-8').read())
    css = ''.join(parts)
    open(out_path, 'w', encoding='utf-8').write(css)
    with open(os.environ.get('LOOK_MAP') or os.devnull, 'w') as f:
        f.write('uses\tcontext\tfrom\tto\n')
        for (ctx, fr, to), n in sorted(LOG.items(), key=lambda x: (-x[1], x[0])):
            f.write('%d\t%s\t%s\t%s\n' % (n, ctx, fr, to))
    print('wrote %s: %d bytes; %s; distinct literal->colour pairs %d' % (out_path, len(css), STATS, len(LOG)))


if __name__ == '__main__':
    main()
