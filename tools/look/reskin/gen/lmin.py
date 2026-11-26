#!/usr/bin/env python3
"""The Cutline MINIMALISM + TYPE pass for the LIGHT theme (reskin/REVIEW.md H1, H3): light becomes dark's mirror.

  python3 light/gen/gen.py && python3 reskin/gen/lmin.py        # (reskin/gen/lbuild.sh does both)

Reads <app>/theme-light.css as light/gen/gen.py just wrote it, and rewrites it in place:
  1. the GENERATED part (before the light-tail.css marker) gets cgen.py's minimalism, applied to the already-light
     colours: coloured glows, white blooms and inset lit rims go; radial washes and translucent rainbow washes go;
     neutral two-tone washes collapse to one flat paper; vermilion key gradients become one flat vermilion.
  2. a TYPE + RADIUS block is inserted after it: every font stack of styles.css / theme-glass.css re-pointed at
     Instrument Sans (monospace untouched) and every radius snapped to the token set, exactly as cgen.py does for dark,
     scoped with gen.py's own selector rules (so the cascade between those declarations is kept).
  3. light-tail.css (the light agent's hand rules) follows unchanged, then reskin/gen/light-cutline-tail.css (wins).
Refuses to run twice on the same file (it would minimise its own output): run gen.py first.
"""
import importlib.util, os, re, sys
sys.dont_write_bytecode = True
HERE = os.path.dirname(os.path.abspath(__file__))
P = os.path.dirname(os.path.dirname(HERE))
sys.path.insert(0, HERE)
import base as G                                      # noqa: E402
import cgen as CG                                     # noqa: E402  (map_font, map_radius, GRAD, LEN)
spec = importlib.util.spec_from_file_location('lgen', os.path.join(P, 'light', 'gen', 'gen.py'))
L = importlib.util.module_from_spec(spec)
spec.loader.exec_module(L)

APP = os.environ.get('LOOK_APP', '/home/ezra/fm-design')
OUT = os.environ.get('LOOK_OUT', APP)
MARK = '\n/* ======================== light-tail.css (hand-written, wins) ======================== */\n'
MINE = '/* ======================== reskin/gen/lmin.py'
ST = dict(killed=0, flattened=0, keys=0, fonts=0, radius=0)
PAPERS = ['#fffcf6', '#f8f3ea', '#f3eee5', '#efe8dc', '#ebe3d6', '#e6ddcf', '#ddd3c3']
VERM = '#c63c1b'


def col(m):
    t = m.group(0)
    if m.group('hex'):
        return G.hx(t)
    if m.group('pct'):
        return None
    if m.group('fn'):
        return G.parse_fn(t)
    return [255, 255, 255, 1.0] if t.lower() == 'white' else [0, 0, 0, 1.0]


def neutral(c):
    return G.chroma(c) < 0.22


def vermilion(c):
    h, l, s = G.hls(c)
    d = h * 360
    return (d <= 22 or d >= 350) and G.chroma(c) > 0.45 and 0.25 <= l <= 0.65


# ---------------------------------------------------------------- shadows
def min_layer(Lr, kind):
    cm = G.COLOR_RE.search(Lr)
    if not cm:
        return Lr
    c = col(cm)
    if c is None:
        return Lr
    inset = bool(re.search(r'\binset\b', Lr))
    rest = Lr[:cm.start()] + ' ' + Lr[cm.end():]
    nums = [float(re.sub(r'[a-z]+$', '', x)) for x in CG.LEN.findall(re.sub(r'\binset\b', '', rest))]
    ox, oy = (nums + [0, 0])[:2]
    blur = nums[2] if len(nums) > 2 else 0
    spread = nums[3] if len(nums) > 3 else 0

    def kill():
        ST['killed'] += 1
        return Lr[:cm.start()] + 'transparent' + Lr[cm.end():]
    if c[3] == 0:
        return Lr
    if kind == 'box' and blur == 0 and (spread != 0 or (ox == 0 and oy == 0)) and not (inset and spread == 0):
        return Lr                       # a ring: functional (focus, selected outline, inner border)
    if kind == 'box' and inset:
        return kill()                   # lit edges, inner glows, inner shades
    if not neutral(c):
        if kind == 'text' and c[3] >= 0.6 and blur <= 2:
            return Lr
        return kill()                   # every coloured glow
    if G.hls(c)[1] > 0.5:
        return kill()                   # white blooms and light-from-above
    if kind == 'text':
        return Lr
    nc = c[:3] + [round(c[3] * 0.75, 3)]   # a neutral drop: kept, a quarter lighter
    return Lr[:cm.start()] + G.fmt(nc) + Lr[cm.end():]


def min_shadow(v, kind):
    if v.strip() in ('none', 'inherit', 'initial', 'unset') or 'var(' in v and not G.COLOR_RE.search(v):
        return v
    return ', '.join(min_layer(x.strip(), kind) for x in G.split_top(v, ','))


def min_filter(v):
    def rep(m):
        inner = m.group(0)[len('drop-shadow('):-1]
        out = min_layer(inner, 'drop')
        return 'drop-shadow(0 0 0 transparent)' if 'transparent' in out and 'transparent' not in inner else 'drop-shadow(' + out + ')'
    return re.sub(r'drop-shadow\((?:[^()]|\([^()]*\))*\)', rep, v)


# ---------------------------------------------------------------- gradients
def stops(g):
    out = []
    for m in G.COLOR_RE.finditer(g):
        c = col(m)
        if c is not None:
            out.append(c)
    for _ in re.finditer(r'(?<![-\w])transparent(?![-\w])', g):
        out.append([0, 0, 0, 0.0])
    return out


def snap_paper(c):
    if G.hls(c)[1] < 0.75 or c[3] < 0.9:
        return c
    best = min(PAPERS, key=lambda p: abs(G.lum(G.hx(p)) - G.lum(c)))
    return G.hx(best)


def min_gradient(g):
    st = stops(g)
    if not st or 'var(' in g:
        return g
    alphas = [c[3] for c in st]
    chrom = [c for c in st if not neutral(c) and c[3] > 0.02]
    hues = sorted(G.hls(c)[0] * 360 for c in chrom)
    if len(hues) >= 3:
        gaps = [b - a for a, b in zip(hues, hues[1:])] + [hues[0] + 360 - hues[-1]]
        if 360 - max(gaps) > 100:
            if min(alphas) >= 0.9:
                return g                 # an opaque spectrum: functional
            ST['flattened'] += 1
            return 'linear-gradient(transparent, transparent)'
    if g.startswith(('radial', 'repeating-radial')) and max(alphas) < 0.5:
        ST['flattened'] += 1
        return 'linear-gradient(transparent, transparent)'
    if chrom and all(vermilion(c) for c in chrom) and min(alphas) >= 0.85:
        ST['keys'] += 1
        return 'linear-gradient(%s, %s)' % (VERM, VERM)
    if max(alphas) - min(alphas) > 0.45 or g.startswith('repeating'):
        return g                         # a fade to transparent, or a pattern: it does a job
    if not chrom or all(c[3] < 0.35 for c in chrom):
        tot = sum(c[3] for c in st) or 1
        avg = [sum(c[i] * c[3] for c in st) / tot for i in range(3)] + [sum(alphas) / len(alphas)]
        avg = snap_paper(avg)
        ST['flattened'] += 1
        f = G.fmt(avg)
        return 'linear-gradient(%s, %s)' % (f, f)
    return g


def min_bg(v):
    return CG.GRAD.sub(lambda m: min_gradient(m.group(0)), v)


SHADOW_VAR = re.compile(r'^--[-\w]*(shadow|rim|lift|glow|ring|halo)', re.I)


def min_decl(p, v):
    pl = p.lower()
    if pl in ('box-shadow', '-webkit-box-shadow') or (pl.startswith('--') and SHADOW_VAR.match(pl) and 'gradient' not in v):
        return min_shadow(v, 'box')
    if pl == 'text-shadow':
        return min_shadow(v, 'text')
    if pl in ('filter', '-webkit-filter') or (pl.startswith('--') and 'drop-shadow' in v):
        return min_filter(v)
    if pl in ('background', 'background-image') or (pl.startswith('--') and 'gradient(' in v):
        return min_bg(v)
    if pl in ('backdrop-filter', '-webkit-backdrop-filter'):
        return 'none'
    return v


def emit(nodes, indent=''):
    out = []
    for nd in nodes:
        if nd[0] == 'at':
            inner = emit(nd[2], indent + '  ')
            if inner.strip():
                out.append('%s%s {\n%s%s}\n' % (indent, nd[1], inner, indent))
        elif nd[0] == 'kf':
            body = []
            for r in G.parse(nd[3]):
                if r[0] == 'rule':
                    body.append(' %s { %s; }' % (r[1], '; '.join('%s: %s%s' % (p, min_decl(p, v), imp) for p, v, imp in G.decls(r[2]))))
            out.append('%s%s {%s }\n' % (indent, nd[2], ''.join(body)))
        else:
            ds = ['%s: %s%s' % (p, min_decl(p, v), imp) for p, v, imp in G.decls(nd[2])]
            if ds:
                out.append('%s%s { %s; }\n' % (indent, nd[1], '; '.join(ds)))
    return ''.join(out)


# ---------------------------------------------------------------- type + radii (cgen's pass, light's selector rules)
def type_nodes(nodes, indent=''):
    out = []
    for nd in nodes:
        if nd[0] == 'at':
            if nd[1].lstrip().startswith(('@font-face', '@keyframes', '@-webkit-keyframes')):
                continue
            inner = type_nodes(nd[2], indent + '  ')
            if inner.strip():
                out.append('%s%s {\n%s%s}\n' % (indent, nd[1], inner, indent))
        elif nd[0] == 'rule':
            scoped = L.scope_selector(nd[1])
            if not scoped:
                continue
            ds = []
            for p, v, imp in G.decls(nd[2]):
                pl = p.lower()
                if pl in ('font-family', 'font'):
                    v2 = CG.map_font(v, pl == 'font')
                    if v2:
                        ST['fonts'] += 'Instrument' in v2 and 'Instrument' not in v
                        ds.append('font-family: %s%s' % (v2, imp))
                elif 'radius' in pl and not pl.startswith('--'):
                    v2 = CG.map_radius(v)
                    if v2:
                        ST['radius'] += v2 != v
                        ds.append('%s: %s%s' % (p, v2, imp))
            if ds:
                out.append('%s%s { %s; }\n' % (indent, ',\n'.join(indent + x if i else x for i, x in enumerate(scoped)), '; '.join(ds)))
    return ''.join(out)


def main():
    path = os.path.join(OUT, 'theme-light.css')
    css = open(path, encoding='utf-8').read()
    if MINE in css:
        sys.exit('lmin.py: %s already minimised; run light/gen/gen.py first (reskin/gen/lbuild.sh)' % path)
    i = css.index(MARK)
    gen_part, tail = css[:i], css[i:]
    head_end = gen_part.index('*/') + 2
    head, body = gen_part[:head_end], gen_part[head_end:]
    mini = emit(G.parse(G.strip_comments(body)))
    srcs = [open(os.path.join(APP, n), encoding='utf-8').read() for n in ('styles.css', 'theme-glass.css')]
    typ = ''.join(type_nodes(G.parse(G.strip_comments(s))) for s in srcs)
    mine = open(os.path.join(HERE, 'light-cutline-tail.css'), encoding='utf-8').read()
    out = (head + '\n/* MINIMISED by reskin/gen/lmin.py (glows, washes, lit rims and blur removed; see its docstring). */\n' + mini
           + '\n/* ======================== reskin/gen/lmin.py: TYPE + RADII (Instrument Sans, token radii) ======================== */\n'
           + typ + tail
           + '\n' + MINE + ': light-cutline-tail.css (reskin/REVIEW.md fixes, wins) ======================== */\n' + mine)
    open(path, 'w', encoding='utf-8').write(out)
    print('lmin: wrote %s %d bytes; %s' % (path, len(out), ST))


if __name__ == '__main__':
    main()
