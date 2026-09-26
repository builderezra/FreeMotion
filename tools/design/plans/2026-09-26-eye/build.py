#!/usr/bin/env python3
"""Eye options for FreeMotion S.eye, traced from published pictograms and written in the app's own
point format ([x,y] corner, [x,y,1,hx,hy] smooth with a manual symmetric handle; out = p+h, in = p-h).

The shape keeps SHAPE_ASPECT.eye = [1.5, 0.9] (box 5:3). Every option is drawn in its reference's
own units, then mapped into the unit box with the per-axis correction so a circle in the reference is
a circle in the SPAWNED box (unit-u per real unit = 0.6 x unit-v per real unit).

Writes work/opts.json (all options + the current eye) and prints fit errors and metrics.
"""
import json, math, os, sys
import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
K = 0.5522847498            # cubic kappa for a quarter circle
BOX = (1.5, 0.9)            # SHAPE_ASPECT.eye, unchanged
FILL = 0.94                 # the limiting side of the ink fills 94% of the box (6% air, the current eye has 5.5% in x)

def r4(v):
    return round(v * 1e4) / 1e4

# ---------- sampling the app's curve model (mirror of FM.pointCtrl + FM.buildSubPath) ----------
def ctrl(pts, i):
    n = len(pts); p = pts[i % n]
    if len(p) < 3 or p[2] != 1:
        return (p[0], p[1]), (p[0], p[1])
    if len(p) >= 5:
        return (p[0] + p[3], p[1] + p[4]), (p[0] - p[3], p[1] - p[4])
    a, b = pts[(i - 1) % n], pts[(i + 1) % n]
    tx, ty = (b[0] - a[0]) / 6, (b[1] - a[1]) / 6
    return (p[0] + tx, p[1] + ty), (p[0] - tx, p[1] - ty)

def bez(p0, p1, p2, p3, n):
    t = np.linspace(0, 1, n)[:, None]
    p0, p1, p2, p3 = map(np.array, (p0, p1, p2, p3))
    return (1 - t) ** 3 * p0 + 3 * (1 - t) ** 2 * t * p1 + 3 * (1 - t) * t ** 2 * p2 + t ** 3 * p3

def sample(pts, n=80):
    out = []
    N = len(pts)
    for i in range(N):
        p1, p2 = pts[i], pts[(i + 1) % N]
        c1 = ctrl(pts, i)[0]; c2 = ctrl(pts, i + 1)[1]
        out.append(bez(p1[:2], c1, c2, p2[:2], n)[:-1])
    return np.vstack(out)

def shoelace(pts):
    a = 0
    for i in range(len(pts)):
        q, r = pts[i], pts[(i + 1) % len(pts)]
        a += q[0] * r[1] - r[0] * q[1]
    return a / 2

# ---------- building blocks in REAL (reference) units ----------
def circle(cx, cy, r, cw=True):
    """4-anchor circle with kappa handles. cw=True winds like a body (positive shoelace, y down)."""
    k = K * r
    if cw:   # top -> right -> bottom -> left
        return [[cx, cy - r, 1, k, 0], [cx + r, cy, 1, 0, k], [cx, cy + r, 1, -k, 0], [cx - r, cy, 1, 0, -k]]
    return [[cx, cy - r, 1, -k, 0], [cx - r, cy, 1, 0, k], [cx, cy + r, 1, k, 0], [cx + r, cy, 1, 0, -k]]

def lens(cx, cy, half_w, half_h, top_h, mid=None):
    """Pointed almond, clockwise: left corner -> (mid) -> top -> (mid) -> right corner -> (mid) -> bottom -> (mid).
    top_h: the top/bottom anchors' horizontal handle length. mid: optional (dx, dy, hx, hy) for the
    upper-left quarter, relative to the centre (dx<0, dy<0), handle along traversal (hx>0, hy<0);
    the other three quarters are its mirrors."""
    L = [cx - half_w, cy]; R = [cx + half_w, cy]
    T = [cx, cy - half_h, 1, top_h, 0]; B = [cx, cy + half_h, 1, -top_h, 0]
    if not mid:
        return [L, T, R, B]
    dx, dy, hx, hy = mid
    m1 = [cx + dx, cy + dy, 1, hx, hy]          # upper left, moving right+up
    m2 = [cx - dx, cy + dy, 1, hx, -hy]         # upper right, moving right+down
    m3 = [cx - dx, cy - dy, 1, -hx, -hy]        # lower right, moving left+down
    m4 = [cx + dx, cy - dy, 1, -hx, hy]         # lower left, moving left+up
    return [L, m1, T, m2, R, m3, B, m4]

# ---------- a tiny Nelder-Mead (no scipy here) ----------
def nelder_mead(f, x0, step, iters=4000):
    n = len(x0)
    pts = [np.array(x0, float)]
    for i in range(n):
        x = np.array(x0, float); x[i] += step[i]; pts.append(x)
    vals = [f(p) for p in pts]
    for _ in range(iters):
        order = np.argsort(vals); pts = [pts[i] for i in order]; vals = [vals[i] for i in order]
        c = np.mean(pts[:-1], axis=0)
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
                for i in range(1, len(pts)):
                    pts[i] = pts[0] + 0.5 * (pts[i] - pts[0]); vals[i] = f(pts[i])
    i = int(np.argmin(vals)); return pts[i], vals[i]

def hausdorff(a, b):
    d = np.sqrt(((a[:, None, :] - b[None, :, :]) ** 2).sum(-1))
    return max(d.min(1).max(), d.min(0).max())

# ---------- A: Google Material Icons "visibility" (filled), Apache-2.0 ----------
# M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5z  (+ r5 hole, r3 disc)
# Its lid LEAVES the corner along a handle (1.73,-4.39). The app's corner points have no handle, so the
# quarter is refitted: one extra smooth anchor per quarter, fitted to the reference curve.
ref_q = bez((1, 12), (2.73, 7.61), (7, 4.5), (12, 4.5), 400)
def quarter_err(x):
    dx, dy, hx, hy, th = x
    pts = [[1, 12], [12 + dx, 12 + dy, 1, hx, hy], [12, 4.5, 1, th, 0], [23, 12]]   # open probe: C, M, T (+ R to close)
    # sample only C->M->T
    s1 = bez((1, 12), (1, 12), (12 + dx - hx, 12 + dy - hy), (12 + dx, 12 + dy), 200)
    s2 = bez((12 + dx, 12 + dy), (12 + dx + hx, 12 + dy + hy), (12 - th, 4.5), (12, 4.5), 200)
    return hausdorff(np.vstack([s1, s2])[::2], ref_q[::2])
# single-segment fit for comparison (no mid anchor): only the top handle
def quarter_err0(x):
    th = x[0]
    s = bez((1, 12), (1, 12), (12 - th, 4.5), (12, 4.5), 400)
    return hausdorff(s[::2], ref_q[::2])

def fitA():
    b0, e0 = nelder_mead(quarter_err0, [5.0], [1.0], 300)
    b, e = [0,0,0,0,0], -1   # a mid anchor bought nothing (0.060 vs 0.057), so A stays four anchors
    return b0, e0, b, e

# ---------- build the options ----------
def build():
    b0, e0, b, e = fitA()
    dx, dy, hx, hy, th = b
    A = {
        'label': 'A Classic (Material "visibility")',
        'src': 'Google Material Icons "visibility", filled - Apache License 2.0 (github.com/google/material-design-icons)',
        'fit': {'no_mid_max_err_units': round(float(e0), 3), 'with_mid_max_err_units': round(float(e), 3), 'ref_width_units': 22},
        'real': [lens(12, 12, 11, 7.5, float(b0[0])), circle(12, 12, 5, cw=False), circle(12, 12, 3, cw=True)],
        'top_handle_units': round(float(b0[0]), 4),
    }
    # B: Bootstrap Icons "eye-fill", MIT. Exact in the app's format: the lids leave the corners with NO handle
    # (the SVG's s-command reflects nothing), so the corners are true corners and the tops carry (+-5, 0).
    # M0 8s3-5.5 8-5.5S16 8 16 8s-3 5.5-8 5.5S0 8 0 8  + hole r3.5 + disc r2.5, all centred (8,8).
    # The catchlight is ours, placed the way Fluent Emoji "Eye" (MIT) places its highlight: up-left of the pupil.
    pr = 2.5; hlr = 0.33 * pr; off = 0.30 * pr
    B = {
        'label': 'B Almond + catchlight (Bootstrap "eye-fill")',
        'src': 'Bootstrap Icons "eye-fill" - MIT (github.com/twbs/icons); catchlight placement after Fluent Emoji "Eye" - MIT (github.com/microsoft/fluentui-emoji)',
        'fit': {'exact': True},
        'real': [lens(8, 8, 8, 5.5, 5), circle(8, 8, 3.5, cw=False), circle(8, 8, pr, cw=True), circle(8 - off, 8 - off, hlr, cw=False)],
    }
    # C: B plus five lashes on the upper lid (our own drawing on the traced lid - there is no permissively
    # licensed open-eye-with-lashes pictogram in Material / Bootstrap / Lucide / Tabler / Phosphor).
    lid = np.vstack([bez((0, 8), (0, 8), (3, 2.5), (8, 2.5), 400), bez((8, 2.5), (13, 2.5), (16, 8), (16, 8), 400)[1:]])
    lashes = []
    for xq, L, w, bend in ((3.0, 1.9, 1.0, 0.55), (5.4, 2.3, 1.05, 0.35), (8.0, 2.45, 1.05, 0.0), (10.6, 2.3, 1.05, 0.35), (13.0, 1.9, 1.0, 0.55)):
        i = int(np.argmin(abs(lid[:, 0] - xq)))
        p = lid[i]; t = lid[min(i + 1, len(lid) - 1)] - lid[max(i - 1, 0)]; t = t / np.linalg.norm(t)
        nrm = np.array([t[1], -t[0]])                        # outward (up) normal of the upper lid
        if nrm[1] > 0: nrm = -nrm
        fan = (xq - 8) / 8 * 0.30                             # outer lashes lean further out
        c, s_ = math.cos(fan), math.sin(fan)
        d = np.array([nrm[0] * c - nrm[1] * s_, nrm[0] * s_ + nrm[1] * c])
        side = np.array([-d[1], d[0]])
        out = side if (side[0] * (xq - 8)) > 0 else -side      # the side AWAY from the middle of the eye
        b0 = p - d * 0.7                                      # rooted 0.7 inside the lid's ink
        tip = p + d * L + out * bend * L * 0.35               # the tip flicks outward: a curl, not a spike
        q = (b0 + tip) / 2 + out * bend * L * 0.12
        def C(tt): return (1 - tt) ** 2 * b0 + 2 * (1 - tt) * tt * q + tt ** 2 * tip
        mid = C(0.5); tg = C(0.55) - C(0.45); tg = tg / np.linalg.norm(tg); nn = np.array([-tg[1], tg[0]])
        bl, br = b0 - side * w / 2, b0 + side * w / 2
        ml, mr = mid - nn * w * 0.3, mid + nn * w * 0.3
        # make ml the one on bl's side
        if np.dot(ml - mid, bl - b0) < 0: ml, mr = mr, ml
        poly = [[float(bl[0]), float(bl[1])], [float(ml[0]), float(ml[1]), 1], [float(tip[0]), float(tip[1])],
                [float(mr[0]), float(mr[1]), 1], [float(br[0]), float(br[1])]]
        if shoelace(poly) < 0: poly = poly[::-1]
        lashes.append(poly)
    C = {
        'label': 'C Lashes (B + five lashes)',
        'src': 'B (Bootstrap Icons "eye-fill", MIT) + lashes drawn for FreeMotion',
        'fit': {'exact_base': True},
        'real': B['real'] + lashes,
    }
    return {'A': A, 'B': B, 'C': C}

def to_unit(real):
    samp = np.vstack([sample(sp) for sp in real])
    x0, y0 = samp.min(0); x1, y1 = samp.max(0)
    Wr, Hr = x1 - x0, y1 - y0
    R = BOX[0] / BOX[1]
    if Wr / Hr > R:
        su = FILL / Wr; sv = su * R
    else:
        sv = FILL / Hr; su = sv / R
    cx, cy = (x0 + x1) / 2, (y0 + y1) / 2
    out = []
    for sp in real:
        q = []
        for p in sp:
            u = [r4(0.5 + (p[0] - cx) * su), r4(0.5 + (p[1] - cy) * sv)]
            if len(p) >= 5: u += [1, r4(p[3] * su), r4(p[4] * sv)]
            elif len(p) == 3: u += [1]
            q.append(u)
        out.append(q)
    return out, {'ink_aspect_real': round(Wr / Hr, 4), 'su': su, 'sv': sv}

CUR = [[[0.055,0.5],[0.5,0.155,1],[0.945,0.5],[0.5,0.845,1]],
       None, None]
def cur_eye():
    import math as m
    def circleS(cx, cy, rx, ry, n):
        return [[r4(cx + rx * m.cos(-m.pi / 2 + i * 2 * m.pi / n)), r4(cy + ry * m.sin(-m.pi / 2 + i * 2 * m.pi / n)), 1] for i in range(n)]
    hole = [[0.145,0.5],[0.5,0.235,1],[0.855,0.5],[0.5,0.765,1]]
    if shoelace(hole) > 0: hole = hole[::-1]
    return [[[0.055,0.5],[0.5,0.155,1],[0.945,0.5],[0.5,0.845,1]], hole, circleS(0.5, 0.5, 0.17, 0.17, 10)]

if __name__ == '__main__':
    opts = build()
    res = {'cur': {'label': 'Current eye', 'unit': cur_eye()}}
    for k, o in opts.items():
        u, meta = to_unit(o['real'])
        o['unit'] = u; o['meta'] = meta
        winds = [round(shoelace(sp), 5) for sp in u]
        o['winding'] = winds
        res[k] = {kk: vv for kk, vv in o.items() if kk != 'real'}
    json.dump(res, open(os.path.join(HERE, 'opts.json'), 'w'))
    for k in ('A', 'B', 'C'):
        o = res[k]
        print(k, o['label'], '| fit', o['fit'], '| meta', {kk: (round(v, 4) if isinstance(v, float) else v) for kk, v in o['meta'].items()})
        print('   winding per subpath', o['winding'])
        print('   subpaths', len(o['unit']), 'points', sum(len(s) for s in o['unit']))
