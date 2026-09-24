"""Shared geometry for the #929 option builder: rounded polygons and circles emitted in FreeMotion's
own point format ([u,v] corner, [u,v,1,hx,hy] smooth with a manual symmetric handle), so every option
is a drop-in replacement for FM.SHAPE_POLYS[kind].

Arcs are EXACT cubic arcs: each piece of <=90 degrees gets handles of (4/3)tan(theta/4)*r along the
tangent, so a rounded corner is a true circle and a straight edge between two arcs stays dead straight
(both controls lie on the line). That matters here: the heart's 'bulge near the bottom' is exactly an
anchor whose handle was too short and aimed off the line it continues."""
import math

K43 = 4.0 / 3.0


def _n(x, y):
    L = math.hypot(x, y)
    return (x / L, y / L)


def _rot(v, a):
    c, s = math.cos(a), math.sin(a)
    return (v[0] * c - v[1] * s, v[0] * s + v[1] * c)


def rounded_poly(verts):
    """verts: [(x, y, r)] CLOCKWISE on screen (y down). r=0 is a hard corner. Returns points as dicts
    {x, y, h:(hx,hy)|None} in the same units."""
    n = len(verts)
    out = []
    for i in range(n):
        x, y, r = verts[i]
        px, py, _ = verts[i - 1]
        nx, ny, _ = verts[(i + 1) % n]
        if r <= 0:
            out.append({'x': x, 'y': y, 'h': None})
            continue
        din = _n(x - px, y - py)
        dout = _n(nx - x, ny - y)
        cross = din[0] * dout[1] - din[1] * dout[0]
        cosv = max(-1.0, min(1.0, din[0] * dout[0] + din[1] * dout[1]))
        phi = math.acos(cosv)                      # turning angle
        if phi < 1e-6:
            out.append({'x': x, 'y': y, 'h': None}); continue
        t = r * math.tan(phi / 2)
        e_in = math.hypot(x - px, y - py); e_out = math.hypot(nx - x, ny - y)
        if t > e_in * 1.002 or t > e_out * 1.002:
            raise ValueError('radius %.3f too big at vertex %d (needs %.3f, edges %.3f / %.3f)' % (r, i, t, e_in, e_out))
        sgn = 1 if cross > 0 else -1
        T1 = (x - din[0] * t, y - din[1] * t)
        nrm = (-din[1] * sgn, din[0] * sgn)
        C = (T1[0] + nrm[0] * r, T1[1] + nrm[1] * r)
        m = max(1, int(math.ceil(phi / (math.pi / 2) - 0.01)))   # a 90.5-degree cap is still one piece
        dth = phi / m
        L = K43 * math.tan(dth / 4) * r
        v0 = (T1[0] - C[0], T1[1] - C[1])
        for j in range(m + 1):
            a = sgn * dth * j
            pv = _rot(v0, a)
            tv = _rot(din, a)
            out.append({'x': C[0] + pv[0], 'y': C[1] + pv[1], 'h': (tv[0] * L, tv[1] * L)})
    # merge coincident neighbours (an edge wholly eaten by the two arcs at its ends — a semicircle cap)
    ext = max(max(abs(v[0]), abs(v[1])) for v in verts)
    tol = 2e-4 * ext
    merged = []
    for p in out:
        if merged and math.hypot(p['x'] - merged[-1]['x'], p['y'] - merged[-1]['y']) < tol:
            q = merged[-1]
            if q['h'] and p['h']:
                q['h'] = ((q['h'][0] + p['h'][0]) / 2, (q['h'][1] + p['h'][1]) / 2)
            continue
        merged.append(p)
    if len(merged) > 1 and math.hypot(merged[0]['x'] - merged[-1]['x'], merged[0]['y'] - merged[-1]['y']) < tol:
        q = merged[0]; p = merged.pop()
        if q['h'] and p['h']:
            q['h'] = ((q['h'][0] + p['h'][0]) / 2, (q['h'][1] + p['h'][1]) / 2)
    return merged


def circle(cx, cy, r):
    k = 0.5522847498 * r
    return [{'x': cx, 'y': cy - r, 'h': (k, 0)}, {'x': cx + r, 'y': cy, 'h': (0, k)},
            {'x': cx, 'y': cy + r, 'h': (-k, 0)}, {'x': cx - r, 'y': cy, 'h': (0, -k)}]


def r4(v):
    return round(v * 1e4) / 1e4


def to_unit(polys, top, H, axis=0.0, fill=0.98, top_pad=0.01, sx=1.0):
    """Reference units -> the unit box: the figure fills `fill` of the height, centred on x=0.5.
    sx stretches x (for a box that is not square)."""
    s = fill / H
    res = []
    for pl in polys:
        o = []
        for p in pl:
            u = 0.5 + (p['x'] - axis) * s * sx
            v = top_pad + (p['y'] - top) * s
            if p['h'] is None:
                o.append([r4(u), r4(v)])
            else:
                o.append([r4(u), r4(v), 1, r4(p['h'][0] * s * sx), r4(p['h'][1] * s)])
        res.append(o)
    return res


def area(pl):
    a = 0
    for i in range(len(pl)):
        q, r = pl[i], pl[(i + 1) % len(pl)]
        a += q[0] * r[1] - r[0] * q[1]
    return a


def mirror_verts(half):
    """Given the RIGHT half of a symmetric outline as clockwise verts from the top centre to the bottom
    centre, return the full clockwise list (right half, then the left half mirrored)."""
    left = [(-x, y, r) for (x, y, r) in reversed(half)]
    return half + left
