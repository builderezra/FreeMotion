"""#929 — heart options in FreeMotion's point format, and the measurement of the shipped heart's fault.

Every option uses the SAME eight-anchor layout as the shipped heart (tip, lower flank, widest, crown, notch,
mirrored), so Edit Points behaves exactly as it does today; only positions and handle lengths change. The
reference outlines are sampled densely and the anchors are FITTED to them (Nelder-Mead on the mean and the
worst distance), so 'modelled on X' is a measured claim: the fit error is printed and recorded.

    python3 hearts.py            # prints the fit report and the JSON, writes hearts.json (a few minutes)

Sources: Material Symbols 'favorite' (outlined, fill1) — https://github.com/google/material-design-icons,
Apache License 2.0; the classic heart is plain geometry (a square on its corner + two semicircles), no licence.
"""
import json, math, re
import numpy as np

SHIPPED = [[0.5, 1], [0.155, 0.66, 1, -0.02, -0.028], [0, 0.297, 1, 0, -0.18], [0.297, 0, 1, 0.165, 0], [0.5, 0.18],
           [0.703, 0, 1, 0.165, 0], [1, 0.297, 1, 0, 0.18], [0.845, 0.66, 1, -0.02, 0.028]]


# ---------------------------------------------------------------- the app's curve, exactly (FM.pointCtrl)
def ctrl(pts, i):
    n = len(pts); p = pts[i % n]
    if len(p) < 3 or p[2] != 1:
        return (p[0], p[1]), (p[0], p[1])
    if len(p) >= 5:
        return (p[0] + p[3], p[1] + p[4]), (p[0] - p[3], p[1] - p[4])
    a = pts[(i - 1) % n]; b = pts[(i + 1) % n]
    tx = (b[0] - a[0]) / 6; ty = (b[1] - a[1]) / 6
    return (p[0] + tx, p[1] + ty), (p[0] - tx, p[1] - ty)


def segments(pts):
    n = len(pts); out = []
    for i in range(n):
        p1, p2 = pts[i], pts[(i + 1) % n]
        if (len(p1) < 3 or p1[2] != 1) and (len(p2) < 3 or p2[2] != 1):
            c1, c2 = (p1[0], p1[1]), (p2[0], p2[1])
        else:
            c1 = ctrl(pts, i)[0]; c2 = ctrl(pts, i + 1)[1]
        out.append(((p1[0], p1[1]), c1, c2, (p2[0], p2[1])))
    return out


def bez(s, t):
    P0, P1, P2, P3 = [np.array(q, float) for q in s]
    t = np.asarray(t)[:, None]; mt = 1 - t
    return mt**3 * P0 + 3 * mt * mt * t * P1 + 3 * mt * t * t * P2 + t**3 * P3


def sample(pts, n=80, sx=1.0):
    out = [bez(s, np.linspace(0, 1, n, endpoint=False)) for s in segments(pts)]
    a = np.vstack(out); a[:, 0] *= sx
    return a


def curvature(pts, sx=1.0, n=400):
    """(position, direction deg, signed curvature) along every segment, in an isotropic frame."""
    res = []
    for si, s in enumerate(segments(pts)):
        P = [np.array([q[0] * sx, q[1]]) for q in s]
        for t in np.linspace(0.0005, 0.9995, n):
            mt = 1 - t
            d = 3 * mt * mt * (P[1] - P[0]) + 6 * mt * t * (P[2] - P[1]) + 3 * t * t * (P[3] - P[2])
            dd = 6 * mt * (P[2] - 2 * P[1] + P[0]) + 6 * t * (P[3] - 2 * P[2] + P[1])
            sp = math.hypot(*d)
            k = (d[0] * dd[1] - d[1] * dd[0]) / sp**3 if sp > 1e-9 else float('nan')
            res.append((si, t, math.degrees(math.atan2(d[1], d[0])), k))
    return res


# ---------------------------------------------------------------- a tiny SVG path flattener (M L H V C S Q T Z)
def svg_samples(d, per=60):
    toks = re.findall(r'[A-Za-z]|-?\d*\.?\d+(?:e-?\d+)?', d)
    i = 0; cur = np.zeros(2); start = np.zeros(2); prev_c = None; prev_q = None; cmd = None; pts = []

    def num():
        nonlocal i
        v = float(toks[i]); i += 1; return v

    def cubic(p0, p1, p2, p3):
        for t in np.linspace(0, 1, per, endpoint=False):
            mt = 1 - t
            pts.append(mt**3 * p0 + 3 * mt * mt * t * p1 + 3 * mt * t * t * p2 + t**3 * p3)

    while i < len(toks):
        if re.match(r'[A-Za-z]', toks[i]):
            cmd = toks[i]; i += 1
        rel = cmd.islower(); C = cmd.upper(); base = cur.copy() if rel else np.zeros(2)
        if C == 'Z':
            cubic(cur, cur, start, start); cur = start.copy(); prev_c = prev_q = None; continue
        if C == 'M':
            cur = base + np.array([num(), num()]); start = cur.copy(); cmd = 'l' if rel else 'L'; prev_c = prev_q = None; continue
        if C == 'L':
            p = base + np.array([num(), num()]); cubic(cur, cur, p, p); cur = p; prev_c = prev_q = None
        elif C == 'H':
            x = num(); p = np.array([(cur[0] + x) if rel else x, cur[1]]); cubic(cur, cur, p, p); cur = p; prev_c = prev_q = None
        elif C == 'V':
            y = num(); p = np.array([cur[0], (cur[1] + y) if rel else y]); cubic(cur, cur, p, p); cur = p; prev_c = prev_q = None
        elif C == 'C':
            c1 = base + np.array([num(), num()]); c2 = base + np.array([num(), num()]); p = base + np.array([num(), num()])
            cubic(cur, c1, c2, p); prev_c = c2; prev_q = None; cur = p
        elif C == 'S':
            c1 = 2 * cur - prev_c if prev_c is not None else cur.copy()
            c2 = base + np.array([num(), num()]); p = base + np.array([num(), num()])
            cubic(cur, c1, c2, p); prev_c = c2; prev_q = None; cur = p
        elif C in 'QT':
            if C == 'Q':
                q = base + np.array([num(), num()])
            else:
                q = 2 * cur - prev_q if prev_q is not None else cur.copy()
            p = base + np.array([num(), num()])
            cubic(cur, cur + 2 / 3 * (q - cur), p + 2 / 3 * (q - p), p); prev_q = q; prev_c = None; cur = p
        else:
            raise ValueError('unsupported ' + cmd)
    return np.array(pts)


def to_box(a):
    x0, y0 = a.min(0); x1, y1 = a.max(0)
    return np.column_stack([(a[:, 0] - x0) / (x1 - x0), (a[:, 1] - y0) / (y1 - y0)]), (x1 - x0) / (y1 - y0)


# ---------------------------------------------------------------- the eight-anchor template
def build(params, yN):
    # The flank handle is NOT a free parameter: it lies along the straight run from the tip, so the side
    # leaves the tip dead straight and turns into the lobe with no kink — the shipped heart's fault, by
    # construction impossible here.
    xS, yS, lS, yW, lW, xC, lC = params
    aS = math.atan2(yS - 1, xS - 0.5)
    hS = (lS * math.cos(aS), lS * math.sin(aS))
    left = [[0.5, 1], [xS, yS, 1, hS[0], hS[1]], [0, yW, 1, 0, -lW], [xC, 0, 1, lC, 0], [0.5, yN]]
    right = [[1 - p[0], p[1], 1, p[3], -p[4]] for p in (left[3], left[2], left[1])]
    return left + right


def dist(a, b):
    # mean and max of nearest distances, both ways
    d = np.sqrt(((a[:, None, :] - b[None, :, :]) ** 2).sum(-1))
    m1 = d.min(1); m2 = d.min(0)
    return max(m1.mean(), m2.mean()), max(m1.max(), m2.max())


def nelder_mead(f, x0, step, iters=1500):
    n = len(x0); pts = [np.array(x0, float)]
    for k in range(n):
        x = np.array(x0, float); x[k] += step[k]; pts.append(x)
    vals = [f(p) for p in pts]
    for _ in range(iters):
        order = np.argsort(vals); pts = [pts[j] for j in order]; vals = [vals[j] for j in order]
        c = np.mean(pts[:-1], 0)
        xr = c + (c - pts[-1]); fr = f(xr)
        if fr < vals[0]:
            xe = c + 2 * (c - pts[-1]); fe = f(xe)
            pts[-1], vals[-1] = (xe, fe) if fe < fr else (xr, fr)
        elif fr < vals[-2]:
            pts[-1], vals[-1] = xr, fr
        else:
            xc = c + 0.5 * (pts[-1] - c); fc = f(xc)
            if fc < vals[-1]:
                pts[-1], vals[-1] = xc, fc
            else:
                pts = [pts[0] + 0.5 * (p - pts[0]) for p in pts]; vals = [f(p) for p in pts]
    j = int(np.argmin(vals)); return pts[j], vals[j]


def fit(target_unit, aspect, yN, x0):
    tgt = target_unit.copy(); tgt[:, 0] *= aspect
    tgt = tgt[::max(1, len(tgt) // 900)]

    def f(p):
        pts = build(p, yN)
        mean, worst = dist(sample(pts, 50, aspect), tgt)
        pen = 0
        if p[2] < 0.01 or p[4] < 0.01 or p[6] < 0.01: pen += 1
        return mean + 0.35 * worst + pen

    best, _ = nelder_mead(f, x0, [0.03, 0.03, 0.03, 0.03, 0.03, 0.03, 0.03])
    best, _ = nelder_mead(f, best, [0.01, 0.01, 0.01, 0.01, 0.01, 0.01, 0.01])
    pts = build(best, yN)
    mean, worst = dist(sample(pts, 120, aspect), tgt)
    return pts, mean, worst


def r4(v):
    return round(v * 1e4) / 1e4


def clean(pts):
    return [[r4(v) if k != 2 else v for k, v in enumerate(p)] for p in pts]


# ---------------------------------------------------------------- the references
MATERIAL_FAVORITE = ('m480-120-58-52q-101-91-167-157T150-447.5Q111-500 95.5-544T80-634q0-94 63-157t157-63q52 0 99 22'
                     't81 62q34-40 81-62t99-22q94 0 157 63t63 157q0 46-15.5 90T810-447.5Q771-395 705-329T538-172l-58 52Z')


def classic_samples(n=2000):
    """The textbook heart: a square turned 45 degrees with a semicircle on each of its two upper sides."""
    r2 = math.sqrt(2) / 2
    pts = []
    for t in np.linspace(-135, 45, n // 3):          # right lobe, notch -> right corner
        a = math.radians(t); pts.append((r2 / 2 + 0.5 * math.cos(a), r2 / 2 + 0.5 * math.sin(a)))
    for t in np.linspace(0, 1, n // 6):              # right corner -> tip
        pts.append((r2 * (1 - t), r2 + r2 * t))
    for t in np.linspace(0, 1, n // 6):              # tip -> left corner
        pts.append((-r2 * t, math.sqrt(2) - r2 * t))
    for t in np.linspace(135, 315, n // 3):          # left lobe, left corner -> notch
        a = math.radians(t); pts.append((-r2 / 2 + 0.5 * math.cos(a), r2 / 2 + 0.5 * math.sin(a)))
    return np.array(pts)


def fixed_shipped(L=0.12):
    """The shipped heart with ONE change: the lower-flank anchor's handle lies ALONG the straight run from
    the tip (so the side cannot kink) and is long enough to carry the turn into the lobe gradually."""
    tip, S = SHIPPED[0], SHIPPED[1]
    d = np.array([S[0] - tip[0], S[1] - tip[1]]); d /= np.linalg.norm(d)
    h = d * L
    pts = [list(p) for p in SHIPPED]
    pts[1] = [S[0], S[1], 1, float(h[0]), float(h[1])]
    pts[7] = [1 - S[0], S[1], 1, float(h[0]), float(-h[1])]
    return pts


def kink_report(pts, sx=1.0):
    """Biggest direction change inside 2% of the outline's length, and whether curvature ever reverses
    on the lower flank (tip -> widest point) — the two things that read as a 'bulge'."""
    c = curvature(pts, sx)
    flank = [r for r in c if r[0] in (0, 1)]
    ks = [r[3] for r in flank if not math.isnan(r[3])]
    rev = sum(1 for a, b in zip(ks, ks[1:]) if a * b < 0 and min(abs(a), abs(b)) > 0.05)
    return {'max_curv_flank': round(float(max(abs(k) for k in ks)), 2), 'curv_reversals': rev}


def _opts():
    out = {}
    # A — the shipped (Ezra-referenced, v4.21 / v4.85) heart, flank fixed. Choose the handle length whose
    # curvature on the flank rises smoothly with no reversal, the shortest that does.
    best = None
    for L in np.arange(0.06, 0.20, 0.01):
        rep = kink_report(fixed_shipped(float(L)))
        if rep['curv_reversals'] == 0 and (best is None or rep['max_curv_flank'] < best[1]['max_curv_flank']):
            best = (float(L), rep)
    out['fixed'] = {'heart': [clean(fixed_shipped(best[0]))], 'aspect': [1, 1], 'L': round(best[0], 3), 'kink': best[1]}
    # B — Material Symbols 'favorite'
    raw = svg_samples(MATERIAL_FAVORITE)
    unit, asp = to_box(raw)
    yN = float((-770 - (-854)) / 734)
    x0 = [0.19, 0.83, 0.1, 0.30, 0.15, 0.27, 0.13]
    pts, mean, worst = fit(unit, asp, yN, x0)
    out['material'] = {'heart': [clean(pts)], 'aspect': [round(float(asp), 3), 1], 'fit_mean': round(float(mean), 4), 'fit_worst': round(float(worst), 4),
                       'kink': kink_report(pts, asp)}
    # C — classic geometric
    raw = classic_samples()
    unit, asp = to_box(raw)
    yN = float((0 - raw[:, 1].min()) / (raw[:, 1].max() - raw[:, 1].min()))
    x0 = [0.23, 0.78, 0.1, 0.33, 0.15, 0.29, 0.13]
    pts, mean, worst = fit(unit, asp, yN, x0)
    out['classic'] = {'heart': [clean(pts)], 'aspect': [round(float(asp), 3), 1], 'fit_mean': round(float(mean), 4), 'fit_worst': round(float(worst), 4),
                      'kink': kink_report(pts, asp)}
    return out


import os
_CACHE = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'hearts.json')

if __name__ == '__main__':
    OPTIONS = _opts()          # the fit takes a few minutes; the result is cached for build.py / render.py
    with open(_CACHE, 'w') as f:
        json.dump({'shipped_kink': kink_report(SHIPPED), 'options': OPTIONS}, f, indent=1)
    print('shipped:', kink_report(SHIPPED))
    for k, v in OPTIONS.items():
        print(k, {kk: vv for kk, vv in v.items() if kk != 'heart'})
        print('   ', json.dumps(v['heart']))   # an ARRAY OF POLYGONS, like every FM.SHAPE_POLYS entry
else:
    with open(_CACHE) as f:
        OPTIONS = json.load(f)['options']
