#!/usr/bin/env python3
"""Car shape options (FreeMotion, planning for the 'car shape needs to be improved' inbox item, 26 Sep).

Converts real published pictograms (SVG path data, quoted below with source + licence) into FreeMotion's
FM.SHAPE_POLYS point format and checks the conversion against the source geometry.

S format (js/compositor.js FM.pointCtrl / FM.buildSubPath):
  [u, v]            hard corner: both bezier controls sit ON the point
  [u, v, 1, hx, hy] smooth point with a SYMMETRIC manual handle: out = p + h, in = p - h
A segment between two corners is a straight line; otherwise it is the cubic (p1, out(p1), in(p2), p2).
The body winds clockwise (positive shoelace, y down) and every hole anticlockwise; nonzero fill.

Output: options.json  { key: { subs: [...], note, src, licence, view } }  and one  <key>.js  per option that
installs it into a running app (FM.SHAPE_POLYS.car = ...) for tools/shot.py --js-file.
Usage: python3 build.py OUTDIR
"""
import json, math, os, re, sys

OUT = sys.argv[1] if len(sys.argv) > 1 else os.path.dirname(os.path.abspath(__file__))

# ------------------------------------------------------------------------------------------------ sources
SOURCES = {
    # Microsoft Fluent UI System Icons, vehicle_car_profile_ltr_24_filled. MIT licence.
    # Fetched 26 Sep 2026 from https://api.iconify.design/fluent/vehicle-car-profile-ltr-24-filled.svg
    # (the Iconify mirror of github.com/microsoft/fluentui-system-icons). viewBox 0 0 24 24.
    'X1': dict(view='side', name='Fluent hatchback (side)', licence='MIT',
              src='Microsoft Fluent UI System Icons - vehicle_car_profile_ltr_24_filled',
              d='M8.028 4a2.75 2.75 0 0 0-2.654 2.026L4.422 9.52A2.75 2.75 0 0 0 2 12.25v2.25c0 .865.4 1.636 1.023 2.14'
                'a3.25 3.25 0 0 0 6.32.61h4.814a3.252 3.252 0 0 0 6.258-.258A2.75 2.75 0 0 0 22 14.5v-1.688'
                'a2.75 2.75 0 0 0-2.083-2.668l-2.183-.546l-2.508-4.246A2.75 2.75 0 0 0 12.858 4z'
                'M6.822 6.421A1.25 1.25 0 0 1 8.028 5.5H9.5v4H5.982z'
                'M11 9.5v-4h1.858c.443 0 .852.234 1.077.614l2 3.386z'
                'm-4.75 5a1.75 1.75 0 1 1 0 3.5a1.75 1.75 0 0 1 0-3.5'
                'm9.25 1.75a1.75 1.75 0 1 1 3.5 0a1.75 1.75 0 0 1-3.5 0'),
    # Phosphor Icons, car-profile (fill weight). MIT licence.
    # Fetched 26 Sep 2026 from https://raw.githubusercontent.com/phosphor-icons/core/main/assets/fill/car-profile-fill.svg
    # viewBox 0 0 256 256.
    'B': dict(view='side', name='Phosphor saloon (side)', licence='MIT',
              src='Phosphor Icons - car-profile-fill',
              d='M240,112H211.31L168,68.69A15.86,15.86,0,0,0,156.69,64H44.28A16,16,0,0,0,31,71.12L1.34,115.56'
                'A8.07,8.07,0,0,0,0,120v48a16,16,0,0,0,16,16H33a32,32,0,0,0,62,0h66a32,32,0,0,0,62,0h17'
                'a16,16,0,0,0,16-16V128A16,16,0,0,0,240,112Z'
                'M44.28,80H156.69l32,32H23Z'
                'M64,192a16,16,0,1,1,16-16A16,16,0,0,1,64,192Z'
                'm128,0a16,16,0,1,1,16-16A16,16,0,0,1,192,192Z'),
    # AIGA / US DOT Symbol Signs (1974), the car from 'Car Rental' (the same car as 'Taxi'). Public domain.
    # Fetched 26 Sep 2026 from https://upload.wikimedia.org/wikipedia/commons/3/30/Aiga_carrental.svg (2nd path;
    # the key above the car is the 1st path and is not used). fill-rule evenodd in the source.
    'C': dict(view='front', name='AIGA transport sign (front)', licence='Public domain (US DOT / AIGA symbol signs)',
              src='AIGA/US DOT Symbol Signs - Car Rental (car only)',
              d='m178.9,181.03c-17.187,0.008-34.314,0.0292-34.314,0.0292l-42.225,0.61536c-15.959-0.56461-29.701,4.6029-38.182,23.149'
                'l-30.651,76.627c-22.311,6.1512-32.012,22.365-32.526,35.662v100.39h29.42v33.786c-1.4258,32.198,51.36,33.485,52.54-0.29303'
                'l0.61536-33.171h190.88l0.61,33.16c1.18,33.778,53.966,32.491,52.54,0.29302v-33.786h29.391v-100.39'
                'c-0.51457-13.296-10.215-29.51-32.526-35.662l-30.651-76.627c-8.481-18.546-22.193-23.714-38.152-23.149'
                'l-42.225-0.61536c-0.13484-0.035-17.362-0.038-34.548-0.0292z'
                'm-73.023,27.252c1.3348-0.007,2.7047,0.03,4.1317,0.0879l138.46,0.43954c12.671-0.29562,18.054-0.0242,23.442,11.956'
                'l22.065,59.455-229.65-0.32234,21.801-57.814c3.4-11.578,10.406-13.75,19.75-13.802z'
                'm-48.232,101.65c13.731,0,24.878,11.118,24.878,24.849s-11.147,24.878-24.878,24.878-24.849-11.147-24.849-24.878,11.118-24.849,24.849-24.849z'
                'm244.09,0c13.731,0,24.878,11.118,24.878,24.849s-11.147,24.878-24.878,24.878-24.849-11.147-24.849-24.878,11.118-24.849,24.849-24.849z'),
    # Pictogrammers Material Design Icons (MDI), car-side. Apache-2.0.
    # Fetched 26 Sep 2026 from https://api.iconify.design/mdi/car-side.svg (Iconify mirror of github.com/Templarian/MaterialDesign;
    # the collection's licence, per Iconify's collection info: Apache 2.0, author Pictogrammers). viewBox 0 0 24 24.
    'A': dict(view='side', name='MDI hatchback (side)', licence='Apache-2.0',
              src='Pictogrammers Material Design Icons - car-side',
              d='m16 6l3 4h2c1.11 0 2 .89 2 2v3h-2a3 3 0 0 1-3 3a3 3 0 0 1-3-3H9a3 3 0 0 1-3 3a3 3 0 0 1-3-3H1v-3'
                'c0-1.11.89-2 2-2l3-4z'
                'm-5.5 1.5H6.75L4.86 10h5.64z'
                'm1.5 0V10h5.14l-1.89-2.5z'
                'm-6 6A1.5 1.5 0 0 0 4.5 15A1.5 1.5 0 0 0 6 16.5A1.5 1.5 0 0 0 7.5 15A1.5 1.5 0 0 0 6 13.5'
                'm12 0a1.5 1.5 0 0 0-1.5 1.5a1.5 1.5 0 0 0 1.5 1.5a1.5 1.5 0 0 0 1.5-1.5a1.5 1.5 0 0 0-1.5-1.5'),
    # Google Material Icons, directions_car (filled). Apache-2.0.
    # Fetched 26 Sep 2026 from https://raw.githubusercontent.com/google/material-design-icons/master/src/maps/directions_car/materialicons/24px.svg
    'X2': dict(view='front', name='Material (front)', licence='Apache-2.0',
              src='Google Material Icons - directions_car',
              d='M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1'
                'c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99z'
                'M6.5 16c-.83 0-1.5-.67-1.5-1.5S5.67 13 6.5 13s1.5.67 1.5 1.5S7.33 16 6.5 16z'
                'm11 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5z'
                'M5 11l1.5-4.5h11L19 11H5z'),
}

# ------------------------------------------------------------------------------------------------ path parsing
NUM = r'[-+]?(?:\d+\.?\d*|\.\d+)(?:[eE][-+]?\d+)?'


def tokenize(d):
    toks = []
    i = 0
    while i < len(d):
        c = d[i]
        if c in 'MmLlHhVvCcSsQqTtAaZz':
            toks.append(c); i += 1
        elif c in ' ,\t\n':
            i += 1
        else:
            m = re.match(NUM, d[i:])
            if not m:
                raise ValueError('bad path at ' + d[i:i + 20])
            toks.append(m.group(0)); i += len(m.group(0))
    return toks


def arc_to_cubics(p0, rx, ry, phi, fa, fs, p1, max_seg=None):
    """SVG arc (spec F.6.5) -> list of cubic pieces [(c1, c2, p)], plus centre/radius/angles for the caller."""
    x1, y1 = p0; x2, y2 = p1
    if rx == 0 or ry == 0:
        return [('L', p1)], None
    rx, ry = abs(rx), abs(ry)
    cph, sph = math.cos(math.radians(phi)), math.sin(math.radians(phi))
    dx, dy = (x1 - x2) / 2, (y1 - y2) / 2
    x1p = cph * dx + sph * dy; y1p = -sph * dx + cph * dy
    lam = x1p * x1p / (rx * rx) + y1p * y1p / (ry * ry)
    if lam > 1:
        s = math.sqrt(lam); rx *= s; ry *= s
    num = rx * rx * ry * ry - rx * rx * y1p * y1p - ry * ry * x1p * x1p
    den = rx * rx * y1p * y1p + ry * ry * x1p * x1p
    co = math.sqrt(max(0, num / den)) if den else 0
    if fa == fs:
        co = -co
    cxp = co * rx * y1p / ry; cyp = -co * ry * x1p / rx
    cx = cph * cxp - sph * cyp + (x1 + x2) / 2
    cy = sph * cxp + cph * cyp + (y1 + y2) / 2

    def ang(ux, uy, vx, vy):
        a = math.atan2(ux * vy - uy * vx, ux * vx + uy * vy)
        return a
    th1 = ang(1, 0, (x1p - cxp) / rx, (y1p - cyp) / ry)
    dth = ang((x1p - cxp) / rx, (y1p - cyp) / ry, (-x1p - cxp) / rx, (-y1p - cyp) / ry)
    if not fs and dth > 0:
        dth -= 2 * math.pi
    elif fs and dth < 0:
        dth += 2 * math.pi
    return dict(cx=cx, cy=cy, rx=rx, ry=ry, phi=phi, th1=th1, dth=dth), None


def arc_pieces(A, n):
    """Split an arc (dict from arc_to_cubics) into n equal cubic pieces."""
    out = []
    cph, sph = math.cos(math.radians(A['phi'])), math.sin(math.radians(A['phi']))
    d = A['dth'] / n
    k = 4.0 / 3.0 * math.tan(d / 4)

    def pt(t):
        x = A['rx'] * math.cos(t); y = A['ry'] * math.sin(t)
        return (A['cx'] + cph * x - sph * y, A['cy'] + sph * x + cph * y)

    def der(t):
        x = -A['rx'] * math.sin(t); y = A['ry'] * math.cos(t)
        return (cph * x - sph * y, sph * x + cph * y)
    for i in range(n):
        a0 = A['th1'] + d * i; a1 = a0 + d
        p0 = pt(a0); p1 = pt(a1); d0 = der(a0); d1 = der(a1)
        out.append(((p0[0] + k * d0[0], p0[1] + k * d0[1]), (p1[0] - k * d1[0], p1[1] - k * d1[1]), p1))
    return out


def parse(d, arc_max_deg=90.0):
    """-> list of subpaths; each a list of segments ('L', p0, p1) or ('C', p0, c1, c2, p1)."""
    toks = tokenize(d)
    subs = []; cur = None; start = None; pos = (0.0, 0.0); cmd = None; i = 0
    last_c2 = None

    def num():
        nonlocal i
        v = float(toks[i]); i += 1; return v

    def flag():
        nonlocal i
        t = toks[i]
        if t in ('0', '1'):
            i += 1; return int(t)
        # compact flags, e.g. '01' — split the first char off
        toks[i] = t[1:]; return int(t[0])

    while i < len(toks):
        t = toks[i]
        if re.match(r'[A-Za-z]', t):
            cmd = t; i += 1
            if cmd in 'Zz':
                if cur is not None:
                    if math.hypot(pos[0] - start[0], pos[1] - start[1]) > 1e-9:
                        cur.append(('L', pos, start))
                    pos = start
                    subs.append(cur); cur = None
                last_c2 = None
                continue
        rel = cmd.islower(); C = cmd.upper()
        ox, oy = (pos if rel else (0.0, 0.0))
        if C == 'M':
            x, y = num() + ox, num() + oy
            if cur:
                subs.append(cur)
            cur = []; start = (x, y); pos = (x, y)
            cmd = 'l' if rel else 'L'; last_c2 = None
        elif C == 'L':
            x, y = num() + ox, num() + oy
            cur.append(('L', pos, (x, y))); pos = (x, y); last_c2 = None
        elif C == 'H':
            x = num() + (pos[0] if rel else 0)
            cur.append(('L', pos, (x, pos[1]))); pos = (x, pos[1]); last_c2 = None
        elif C == 'V':
            y = num() + (pos[1] if rel else 0)
            cur.append(('L', pos, (pos[0], y))); pos = (pos[0], y); last_c2 = None
        elif C == 'C':
            c1 = (num() + ox, num() + oy); c2 = (num() + ox, num() + oy); p = (num() + ox, num() + oy)
            cur.append(('C', pos, c1, c2, p)); pos = p; last_c2 = c2
        elif C == 'S':
            c1 = (2 * pos[0] - last_c2[0], 2 * pos[1] - last_c2[1]) if last_c2 else pos
            c2 = (num() + ox, num() + oy); p = (num() + ox, num() + oy)
            cur.append(('C', pos, c1, c2, p)); pos = p; last_c2 = c2
        elif C == 'A':
            rx, ry, phi = num(), num(), num(); fa = flag(); fs = flag()
            p = (num() + ox, num() + oy)
            A, _ = arc_to_cubics(pos, rx, ry, phi, fa, fs, p)
            if isinstance(A, list):
                cur.append(('L', pos, p))
            else:
                n = max(1, int(math.ceil(abs(math.degrees(A['dth'])) / arc_max_deg - 1e-9)))
                q = pos
                for (c1, c2, pp) in arc_pieces(A, n):
                    cur.append(('C', q, c1, c2, pp)); q = pp
            pos = p; last_c2 = None
        else:
            raise ValueError('unsupported command ' + cmd)
    if cur:
        # an unclosed subpath (Fluent's hub circles end without z): close it
        if math.hypot(pos[0] - start[0], pos[1] - start[1]) > 1e-6:
            cur.append(('L', pos, start))
        subs.append(cur)
    # drop zero-length segments
    clean = []
    for s in subs:
        s2 = [g for g in s if math.hypot(g[-1][0] - g[1][0], g[-1][1] - g[1][1]) > 1e-6 or g[0] == 'C' and
              math.hypot(g[2][0] - g[1][0], g[2][1] - g[1][1]) > 1e-6]
        clean.append(s2)
    return clean


# ------------------------------------------------------------------------------------------------ geometry
def bez(p0, c1, c2, p1, t):
    u = 1 - t
    return (u * u * u * p0[0] + 3 * u * u * t * c1[0] + 3 * u * t * t * c2[0] + t * t * t * p1[0],
            u * u * u * p0[1] + 3 * u * u * t * c1[1] + 3 * u * t * t * c2[1] + t * t * t * p1[1])


def split(seg, t=0.5):
    _, p0, c1, c2, p1 = seg
    L = lambda a, b: (a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t)
    a = L(p0, c1); b = L(c1, c2); c = L(c2, p1); d = L(a, b); e = L(b, c); m = L(d, e)
    return ('C', p0, a, d, m), ('C', m, e, c, p1)


def flatten_segs(segs, n=24):
    pts = []
    for g in segs:
        if g[0] == 'L':
            pts.append(g[1])
        else:
            for k in range(n):
                pts.append(bez(g[1], g[2], g[3], g[4], k / n))
    return pts


def unit(v):
    L = math.hypot(v[0], v[1])
    return (v[0] / L, v[1] / L) if L > 1e-12 else (0.0, 0.0)


def to_nodes(segs, kink_deg=10.0):
    """Segments of ONE closed subpath -> S-format nodes in SOURCE units ([x,y] or [x,y,1,hx,hy])."""
    n = len(segs); nodes = []
    for i in range(n):
        prev = segs[i - 1]; nxt = segs[i]
        p = nxt[1]
        inH = None; outH = None
        if prev[0] == 'C':
            v = (p[0] - prev[3][0], p[1] - prev[3][1])
            if math.hypot(*v) > 1e-9: inH = v
        if nxt[0] == 'C':
            v = (nxt[2][0] - p[0], nxt[2][1] - p[1])
            if math.hypot(*v) > 1e-9: outH = v
        tin = unit(inH) if inH else unit((p[0] - prev[1][0], p[1] - prev[1][1]))
        tout = unit(outH) if outH else unit((nxt[-1][0] - p[0], nxt[-1][1] - p[1]))
        dot = max(-1, min(1, tin[0] * tout[0] + tin[1] * tout[1]))
        angle = math.degrees(math.acos(dot))
        if (inH is None and outH is None) or angle > kink_deg:
            nodes.append([p[0], p[1]])
            continue
        if inH and outH:
            dirv = unit((tin[0] + tout[0], tin[1] + tout[1]))
            L = (math.hypot(*inH) + math.hypot(*outH)) / 2
        elif outH:
            dirv = unit(outH); L = math.hypot(*outH)
        else:
            dirv = unit(inH); L = math.hypot(*inH)
        nodes.append([p[0], p[1], 1, dirv[0] * L, dirv[1] * L])
    return nodes


def render_nodes(nodes, n=24):
    """Flatten an S-format closed subpath exactly the way FM.buildSubPath draws it."""
    N = len(nodes); pts = []

    def ctrl(k):
        q = nodes[k % N]
        if len(q) >= 5 and q[2] == 1:
            return (q[0] + q[3], q[1] + q[4]), (q[0] - q[3], q[1] - q[4])
        return (q[0], q[1]), (q[0], q[1])
    for i in range(N):
        a = nodes[i]; b = nodes[(i + 1) % N]
        if not (len(a) > 2 and a[2] == 1) and not (len(b) > 2 and b[2] == 1):
            pts.append((a[0], a[1])); continue
        c1 = ctrl(i)[0]; c2 = ctrl(i + 1)[1]
        for k in range(n):
            pts.append(bez((a[0], a[1]), c1, c2, (b[0], b[1]), k / n))
    return pts


def seg_dist(p, a, b):
    vx, vy = b[0] - a[0], b[1] - a[1]; wx, wy = p[0] - a[0], p[1] - a[1]
    L = vx * vx + vy * vy
    t = 0 if L == 0 else max(0, min(1, (wx * vx + wy * vy) / L))
    return math.hypot(wx - t * vx, wy - t * vy)


def poly_dist(p, poly):
    return min(seg_dist(p, poly[i], poly[(i + 1) % len(poly)]) for i in range(len(poly)))


def open_dist(p, poly):
    return min(seg_dist(p, poly[i], poly[i + 1]) for i in range(len(poly) - 1))


def hausdorff(A, B):
    return max(max(poly_dist(p, B) for p in A[::2]), max(poly_dist(p, A) for p in B[::2]))


def refine(segs, tol, max_iter=6):
    """Subdivide source cubics until the S-format rendering sits within tol of the source (source units)."""
    for _ in range(max_iter):
        nodes = to_nodes(segs)
        N = len(nodes)
        # simple global check, then split every cubic whose own rendering strays
        err = 0; worst = []
        for i, g in enumerate(segs):
            if g[0] != 'C':
                continue
            s_pts = [bez(g[1], g[2], g[3], g[4], k / 16) for k in range(17)]
            # the S rendering of this segment: nodes i -> i+1
            a = nodes[i]; b = nodes[(i + 1) % N]

            def ctrl(q):
                if len(q) >= 5 and q[2] == 1:
                    return (q[0] + q[3], q[1] + q[4]), (q[0] - q[3], q[1] - q[4])
                return (q[0], q[1]), (q[0], q[1])
            c1 = ctrl(a)[0]; c2 = ctrl(b)[1]
            r_pts = [bez((a[0], a[1]), c1, c2, (b[0], b[1]), k / 16) for k in range(17)]
            e = max(max(open_dist(p, s_pts) for p in r_pts), max(open_dist(p, r_pts) for p in s_pts))
            if e > tol:
                worst.append(i)
            err = max(err, e)
        if not worst:
            return segs, err
        new = []
        for i, g in enumerate(segs):
            if i in worst:
                new.extend(split(g))
            else:
                new.append(g)
        segs = new
    return segs, err


def shoelace(pts):
    return sum(pts[i][0] * pts[(i + 1) % len(pts)][1] - pts[(i + 1) % len(pts)][0] * pts[i][1] for i in range(len(pts))) / 2


def reverse_nodes(nodes):
    out = []
    for q in reversed(nodes):
        if len(q) >= 5:
            out.append([q[0], q[1], 1, -q[3], -q[4]])
        else:
            out.append(list(q))
    return out


def build(key, spec, fit=0.96, tol_frac=0.004):
    subs = parse(spec['d'])
    allpts = [p for s in subs for p in flatten_segs(s, 32)]
    x0 = min(p[0] for p in allpts); x1 = max(p[0] for p in allpts)
    y0 = min(p[1] for p in allpts); y1 = max(p[1] for p in allpts)
    W, H = x1 - x0, y1 - y0
    tol = tol_frac * max(W, H)
    out = []; errs = []; body_sign = None
    for si, s in enumerate(subs):
        s, e = refine(s, tol)
        errs.append(e / max(W, H))
        nodes = to_nodes(s)
        area = shoelace(render_nodes(nodes, 8))
        if si == 0:
            if area < 0:
                nodes = reverse_nodes(nodes)
        else:
            if area > 0:
                nodes = reverse_nodes(nodes)
        out.append(nodes)
    # into the unit square at the source's own proportion: longer side = fit, centred (SHAPE_ASPECT.car stays [1,1])
    k = fit / max(W, H)
    ox = (1 - W * k) / 2; oy = (1 - H * k) / 2
    r4 = lambda v: round(v, 4)
    S = []
    for nodes in out:
        pl = []
        for q in nodes:
            u = r4(ox + (q[0] - x0) * k); v = r4(oy + (q[1] - y0) * k)
            if len(q) >= 5:
                pl.append([u, v, 1, r4(q[3] * k), r4(q[4] * k)])
            else:
                pl.append([u, v])
        # tidy: a node within 0.0006 of its predecessor is the source's closing point landing on its start
        # (AIGA ends 0.0001 from where it began) — one point, keeping whichever carries the handle
        tidy = []
        for q in pl:
            if tidy and math.hypot(q[0] - tidy[-1][0], q[1] - tidy[-1][1]) < 0.0006:
                if len(q) > len(tidy[-1]):
                    tidy[-1] = q
                continue
            tidy.append(q)
        if len(tidy) > 2 and math.hypot(tidy[0][0] - tidy[-1][0], tidy[0][1] - tidy[-1][1]) < 0.0006:
            if len(tidy[-1]) > len(tidy[0]):
                tidy[0] = tidy[-1]
            tidy.pop()
        pl = [[(0.0 if v == 0 else v) for v in q] for q in tidy]
        S.append(pl)
    return dict(subs=S, view=spec['view'], name=spec['name'], src=spec['src'], licence=spec['licence'],
                ink=[r4(W * k), r4(H * k)], err=[round(e, 5) for e in errs],
                points=sum(len(p) for p in S))


def main():
    os.makedirs(OUT, exist_ok=True)
    res = {}
    for key, spec in SOURCES.items():
        r = build(key, spec)
        res[key] = r
        print(key, spec['name'], 'subpaths', len(r['subs']), 'points', r['points'], 'ink', r['ink'],
              'max err (fraction of long side)', max(r['err']))
        with open(os.path.join(OUT, key + '.js'), 'w') as f:
            f.write('/* car option %s: %s — %s (%s) */\n' % (key, spec['name'], spec['src'], spec['licence']))
            f.write('window.__carOpt = %s;\n' % json.dumps(r['subs'], separators=(',', ':')))
    with open(os.path.join(OUT, 'options.json'), 'w') as f:
        json.dump(res, f, indent=1)


if __name__ == '__main__':
    main()
