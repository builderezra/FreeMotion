"""Local rasteriser for FreeMotion S-format shapes (nonzero fill, the same bezier walk as FM.buildSubPath).
Used only to iterate and to measure before the in-app renders; the pictures shown to Ezra come from the app."""
import json, math, re
import numpy as np

REPO = '/Users/ezrasmith/Claude/FreeMotion'


def current_car():
    src = open(REPO + '/js/compositor.js').read()
    a = src.index('    S.car = [')
    b = src.index('\n    ];', a)
    body = src[a + len('    S.car = '): b + len('\n    ]')]
    body = re.sub(r'//[^\n]*', '', body)
    body = re.sub(r',\s*([\]\}])', r'\1', body)
    return json.loads(body)


def bez(p0, c1, c2, p1, t):
    u = 1 - t
    return (u * u * u * p0[0] + 3 * u * u * t * c1[0] + 3 * u * t * t * c2[0] + t * t * t * p1[0],
            u * u * u * p0[1] + 3 * u * u * t * c1[1] + 3 * u * t * t * c2[1] + t * t * t * p1[1])


def ctrl(q):
    if len(q) >= 3 and q[2] == 1:
        if len(q) >= 5:
            return (q[0] + q[3], q[1] + q[4]), (q[0] - q[3], q[1] - q[4])
    return (q[0], q[1]), (q[0], q[1])


def pointctrl(pts, i):
    """FM.pointCtrl for a CLOSED path (auto Catmull-Rom for [u,v,1] without handles)."""
    n = len(pts); p = pts[i % n]
    if not (len(p) >= 3 and p[2] == 1):
        return (p[0], p[1]), (p[0], p[1])
    if len(p) >= 5:
        return (p[0] + p[3], p[1] + p[4]), (p[0] - p[3], p[1] - p[4])
    a = pts[(i - 1) % n]; b = pts[(i + 1) % n]
    tx = (b[0] - a[0]) / 6; ty = (b[1] - a[1]) / 6
    return (p[0] + tx, p[1] + ty), (p[0] - tx, p[1] - ty)


def flatten(pts, n=48):
    N = len(pts); out = []
    for i in range(N):
        a = pts[i]; b = pts[(i + 1) % N]
        sa = len(a) >= 3 and a[2] == 1; sb = len(b) >= 3 and b[2] == 1
        if not sa and not sb:
            out.append((a[0], a[1])); continue
        c1 = pointctrl(pts, i)[0]; c2 = pointctrl(pts, i + 1)[1]
        for k in range(n):
            out.append(bez((a[0], a[1]), c1, c2, (b[0], b[1]), k / n))
    return out


def raster(subs, W, H, ox, oy, sw, sh, ss=8):
    """Coverage (0..1) of the shape drawn in box (ox, oy, sw, sh) on a W x H canvas."""
    polys = [[(ox + p[0] * sw, oy + p[1] * sh) for p in flatten(s)] for s in subs]
    edges = []
    for P in polys:
        for i in range(len(P)):
            (x0, y0), (x1, y1) = P[i], P[(i + 1) % len(P)]
            if y0 != y1:
                edges.append((x0, y0, x1, y1))
    E = np.array(edges)
    cov = np.zeros((H, W))
    for row in range(H):
        for s in range(ss):
            y = row + (s + 0.5) / ss
            ymin = np.minimum(E[:, 1], E[:, 3]); ymax = np.maximum(E[:, 1], E[:, 3])
            m = (y >= ymin) & (y < ymax)
            if not m.any():
                continue
            e = E[m]
            t = (y - e[:, 1]) / (e[:, 3] - e[:, 1])
            xs = e[:, 0] + t * (e[:, 2] - e[:, 0])
            w = np.where(e[:, 3] > e[:, 1], 1, -1)
            order = np.argsort(xs); xs = xs[order]; w = w[order]
            wind = 0
            for j in range(len(xs) - 1):
                wind += w[j]
                if wind != 0:
                    xa, xb = max(0.0, xs[j]), min(float(W), xs[j + 1])
                    if xb <= xa:
                        continue
                    ia, ib = int(math.floor(xa)), int(math.floor(xb))
                    if ia == ib:
                        if ia < W: cov[row, ia] += (xb - xa) / ss
                    else:
                        cov[row, ia] += (ia + 1 - xa) / ss
                        if ib > ia + 1: cov[row, ia + 1:ib] += 1.0 / ss
                        if ib < W: cov[row, ib] += (xb - ib) / ss
    return np.clip(cov, 0, 1)


def icon(subs, px=34, asp=(1, 1)):
    """The Shape-menu icon: viewBox 24 shown at px; longest side of the aspect box = 18 units (js/addmenu.js icoPoly)."""
    k = 18 / max(asp); bw, bh = asp[0] * k, asp[1] * k
    s = px / 24.0
    return raster(subs, px, px, (24 - bw) / 2 * s, (24 - bh) / 2 * s, bw * s, bh * s)
