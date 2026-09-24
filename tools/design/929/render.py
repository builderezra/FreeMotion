#!/usr/bin/env python3
"""#929 renderer: drives the REAL app (served by tools/serve.sh) in a throwaway headless Chrome and writes
every picture the two option sheets need into tools/design/929/img/.

    python3 tools/design/929/render.py --port 8795 [--only people|hearts]

Phone = 380x820 at DPR 3 with touch emulation (his iPhone), PC = 1280x900 at DPR 1. Tiles are screenshots of
the real Add -> Shape menu after the option's geometry is swapped into FM.SHAPE_POLYS and js/addmenu.js is
re-evaluated (so its own icoPoly() draws them); big pictures are FM.renderScene on a scratch scene."""
import argparse, base64, json, os, shutil, sys, tempfile, time

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..', '..'))
sys.path.insert(0, os.path.join(ROOT, 'tests'))
import _cdp  # noqa: E402

IMG = os.path.join(HERE, 'img')


def open_app(port, phone):
    w, h = (380, 820) if phone else (1280, 900)
    prof = tempfile.mkdtemp(prefix='fm-929-')
    dport = _cdp.free_port()
    proc = _cdp.launch(dport, w, h, prof)
    c = _cdp.CDP(_cdp.ws_url(dport))
    c.send('Emulation.setDeviceMetricsOverride', width=w, height=h, deviceScaleFactor=3 if phone else 1, mobile=phone)
    c.send('Page.enable')
    c.send('Page.navigate', url='http://localhost:%d/index.html' % port)
    t0 = time.time()
    while time.time() - t0 < 40:
        try:
            if c.eval("!!(window.FM && FM.scene && FM.addMenu && document.readyState === 'complete')"):
                break
        except Exception:
            pass
        time.sleep(0.25)
    if phone:
        c.send('Emulation.setTouchEmulationEnabled', enabled=True, maxTouchPoints=5)
        c.send('Emulation.setEmulatedMedia', features=[{'name': 'hover', 'value': 'none'}, {'name': 'any-hover', 'value': 'none'},
                                                      {'name': 'pointer', 'value': 'coarse'}, {'name': 'any-pointer', 'value': 'coarse'}])
        assert c.eval("matchMedia('(hover: none)').matches"), 'not a phone'
    time.sleep(1.4)
    c.eval(open(os.path.join(HERE, 'page.js')).read())
    r = c.eval('__fm929.init()', await_promise=True)
    assert r and r.get('ok'), r
    return c, proc, prof


def close(c, proc, prof):
    try:
        c.close()
    except Exception:
        pass
    proc.terminate()
    try:
        proc.wait(timeout=5)
    except Exception:
        proc.kill()
    shutil.rmtree(prof, ignore_errors=True)


def ev(c, js):
    return c.eval(js, await_promise=True)


def shot(c, rect, path, pad=4):
    x, y, w, h = rect
    s = c.send('Page.captureScreenshot', format='png',
               clip={'x': max(0, x - pad), 'y': max(0, y - pad), 'width': w + 2 * pad, 'height': h + 2 * pad, 'scale': 1})
    with open(path, 'wb') as f:
        f.write(base64.b64decode(s['data']))
    return path


def save_dataurl(url, path):
    with open(path, 'wb') as f:
        f.write(base64.b64decode(url.split(',', 1)[1]))
    return path


def opt_js(o):
    return json.dumps(o)


def people_jobs():
    # (id, option dict for apply) — 'current' applies nothing, i.e. what ships today
    return [('current', {})] + [(k, {'person': 'OPT929.people.%s.person' % k, 'woman': 'OPT929.people.%s.woman' % k})
                                for k in ('aiga', 'maki', 'material')]


def apply_expr(o):
    parts = []
    for key, val in o.items():
        if isinstance(val, str) and val.startswith('OPT929.'):
            parts.append('%s: %s' % (json.dumps(key), val))
        else:
            parts.append('%s: %s' % (json.dumps(key), json.dumps(val)))
    return '__fm929.apply({%s})' % ', '.join(parts)


# option -> kind -> (reference file in ref/, the viewBox that holds just that figure)
PEOPLE_REFS = {
    'aiga': {'person': ('Toilets_unisex.svg', [385, -5, 240, 585]), 'woman': ('Toilets_unisex.svg', [-5, -5, 285, 585])},
    'maki': {'person': ('maki_toilet.svg', [8.8, 0, 6.2, 15]), 'woman': ('maki_toilet.svg', [0, 0, 8.75, 15])},
    'material': {'person': ('ms_rounded_man_fill1_24px.svg', [0, -960, 960, 960]), 'woman': ('ms_rounded_woman_fill1_24px.svg', [0, -960, 960, 960])},
}
HEART_REFS = {   # option -> reference drawn under it (None = today's heart, drawn by the app from the shipped points)
    'fixed': None,
    'material': ('ms_outlined_favorite_fill1_24px.svg', [0, -960, 960, 960]),
    'classic': ('classic_heart.svg', [-90, -20, 180, 166]),
}


def summarise_legib(rows):
    """[{n, components, holes, legRuns90}] -> {'fused': [n..], 'holes': [n..], 'legs': [n..]}"""
    out = {'fused': [], 'holes': [], 'legs': []}
    for q in rows:
        if q['components'] < 2: out['fused'].append(q['n'])
        if q['holes']: out['holes'].append(q['n'])
        if q['legRuns90'] != 2: out['legs'].append(q['n'])
    return out


def run_people(port):
    jobs = people_jobs()
    legib = {}
    for phone in (True, False):
        tag = 'phone' if phone else 'pc'
        c, proc, prof = open_app(port, phone)
        try:
            for oid, o in jobs:
                ev(c, apply_expr(o))
                ev(c, '__fm929.openShapes(%s)' % ('true' if phone else 'false'))
                for title, kind in (('Person', 'person'), ('Woman', 'woman')):
                    r = ev(c, '__fm929.tileRect(%s, %s)' % ('true' if phone else 'false', json.dumps(title)))
                    assert 'error' not in r, r
                    shot(c, r['tile'], os.path.join(IMG, 'ppl-%s-%s-tile-%s.png' % (oid, kind, tag)), pad=3)
                    if kind == 'person':
                        shot(c, r['page'], os.path.join(IMG, 'ppl-%s-page-%s.png' % (oid, tag)), pad=2)
                    print(oid, tag, title, [round(v, 1) for v in r['tile']], r.get('svg'))
                if phone:
                    for bg, ink, nm in (('#f2f4f7', '#17202b', 'light'), ('#0b0f14', '#f4f6f9', 'dark')):
                        url = ev(c, '__fm929.renderBig(1200, 800, %s, [{kind:"person", x:330, y:400, box:740, fill:%s}, {kind:"woman", x:870, y:400, box:740, fill:%s}])'
                                 % (json.dumps(bg), json.dumps(ink), json.dumps(ink)))
                        save_dataurl(url, os.path.join(IMG, 'ppl-%s-big-%s.png' % (oid, nm)))
                    if oid in PEOPLE_REFS:
                        # the published original, laid out exactly like the big pictures (figure 725px tall, top 37),
                        # then ours traced over it by the app. Grey = theirs, pink line = ours.
                        figs = []
                        for kind, cx in (('person', 330), ('woman', 870)):
                            fn, vb = PEOPLE_REFS[oid][kind]
                            figs.append({'svg': open(os.path.join(HERE, 'ref', fn)).read(), 'vb': vb, 'kind': kind, 'cx': cx, 'top': 37, 'h': 725})
                        r = ev(c, '__fm929.refFigure(%s)' % json.dumps({'W': 1200, 'H': 800, 'bg': '#f2f4f7', 'refFill': '#17202b', 'figs': figs}))
                        save_dataurl(r['url'], os.path.join(IMG, 'ppl-%s-ref.png' % oid))
                        r = ev(c, '__fm929.refFigure(%s)' % json.dumps({'W': 1200, 'H': 800, 'bg': '#f2f4f7', 'refFill': '#bcc5cf', 'overlay': True,
                                                                         'line': '#e2245a', 'lineW': 7, 'figs': figs}))
                        save_dataurl(r['url'], os.path.join(IMG, 'ppl-%s-overlay.png' % oid))
                        print(oid, 'reference overlay', r['report'])
                    # what he would SEE: fused head / pinholes / merged legs, box sizes 16..240 (tests.js figMask method)
                    legib[oid] = ev(c, '(function(){var z=[];for(var n=16;n<=240;n++)z.push(n);return {person:__fm929.legib("person",z), woman:__fm929.legib("woman",z)};})()')
        finally:
            close(c, proc, prof)
    with open(os.path.join(IMG, 'ppl-legib.json'), 'w') as f:
        json.dump({o: {k: summarise_legib(v) for k, v in d.items()} for o, d in legib.items()}, f, indent=1)


STRIP = [('Triangle', 'triangle'), ('Heart', 'heart'), ('Plus', 'plus'), ('Arrow', 'arrow'), ('Chevron', 'chevron'),
         ('Trapezoid', 'trapezoid'), ('Parallelogram', 'parallelogram')]


def run_hearts(port):
    with open(os.path.join(HERE, 'hearts.json')) as f:
        ids = ['current'] + list(json.load(f)['options'].keys())
    tink = {'phone': {}, 'pc': {}}
    for phone in (True, False):
        tag = 'phone' if phone else 'pc'
        c, proc, prof = open_app(port, phone)
        try:
            for oid in ids:
                variants = [('baked', 'baked')] if oid == 'current' else []
                variants += [('outline', 'outline'), ('fill', 'fill')]
                if oid in ('current', 'fixed'):
                    variants += [('alloutline', 'alloutline')]   # every data-shape tile drawn from its geometry
                if oid == 'fixed':
                    variants += [('allfill', 'allfill')]         # …the same, with the heart tile solid
                for vname, tile in variants:
                    o = {'tile': tile}
                    if oid != 'current':
                        o['heart'] = 'OPT929.hearts.%s.heart' % oid
                        o['heartAspect'] = 'OPT929.hearts.%s.aspect' % oid
                    ev(c, apply_expr(o))
                    ev(c, '__fm929.openShapes(%s)' % ('true' if phone else 'false'))
                    r = ev(c, '__fm929.tileRect(%s, "Heart")' % ('true' if phone else 'false'))
                    assert 'error' not in r, r
                    shot(c, r['tile'], os.path.join(IMG, 'hrt-%s-%s-tile-%s.png' % (oid, vname, tag)), pad=3)
                    shot(c, r['page'], os.path.join(IMG, 'hrt-%s-%s-page-%s.png' % (oid, vname, tag)), pad=2)
                    print(oid, vname, tag, [round(v, 1) for v in r['tile']], r.get('svg'))
                    if (oid, vname) in (('current', 'baked'), ('fixed', 'alloutline')):
                        # every tile the icon fix redraws, before and after, cut to the icon at actual size
                        state = 'now' if oid == 'current' else 'after'
                        tink[tag][state] = ev(c, '__fm929.tileInk(%s, %s)' % ('true' if phone else 'false', json.dumps([t for t, _ in STRIP])))
                        for title, kind in STRIP:
                            rr = ev(c, '__fm929.tileRect(%s, %s)' % ('true' if phone else 'false', json.dumps(title)))
                            shot(c, rr['icon'], os.path.join(IMG, 'strip-%s-%s-%s.png' % (state, kind, tag)), pad=6 if phone else 4)
                if phone:
                    o = {} if oid == 'current' else {'heart': 'OPT929.hearts.%s.heart' % oid, 'heartAspect': 'OPT929.hearts.%s.aspect' % oid}
                    ev(c, apply_expr(o))
                    for bg, ink, nm in (('#f2f4f7', '#e2245a', 'light'), ('#0b0f14', '#e2245a', 'dark')):
                        url = ev(c, '__fm929.renderBig(900, 900, %s, [{kind:"heart", x:450, y:450, box:820, fill:%s}])' % (json.dumps(bg), json.dumps(ink)))
                        save_dataurl(url, os.path.join(IMG, 'hrt-%s-big-%s.png' % (oid, nm)))
                    url = ev(c, '__fm929.renderBig(900, 900, "#0b0f14", [{kind:"heart", x:450, y:450, box:820, fill:"#e2245a", noFill:true, stroke:{width:10, color:"#ffffff"}}])')
                    save_dataurl(url, os.path.join(IMG, 'hrt-%s-big-stroke.png' % oid))
                    if oid in HEART_REFS:
                        ref = HEART_REFS[oid]
                        fig = {'kind': 'heart', 'cx': 450, 'top': 110, 'h': 680}
                        if ref is None:
                            fig.update({'polys': '__ORIG__', 'aspect': [1, 1]})
                        else:
                            fig.update({'svg': open(os.path.join(HERE, 'ref', ref[0])).read(), 'vb': ref[1]})
                        js = json.dumps({'W': 900, 'H': 900, 'bg': '#f2f4f7', 'refFill': '#bcc5cf', 'overlay': True, 'line': '#e2245a', 'lineW': 8, 'figs': [fig]})
                        js = js.replace('"__ORIG__"', '__fm929.st.orig.heart')
                        r = ev(c, '__fm929.refFigure(%s)' % js)
                        save_dataurl(r['url'], os.path.join(IMG, 'hrt-%s-overlay.png' % oid))
                        print(oid, 'reference overlay', r['report'])
                    if oid in ('material', 'classic'):
                        # a heart ALREADY in a project keeps the square box it was added with; the new shape is wider
                        # same HEIGHT, as they would be: a new heart spawns d*aspect wide and d tall, an old one d x d
                        with open(os.path.join(HERE, 'hearts.json')) as f:
                            a0 = json.load(f)['options'][oid]['aspect'][0]
                        url = ev(c, '__fm929.renderBig(1200, 620, "#f2f4f7", [{kind:"heart", x:320, y:310, box:520, fill:"#e2245a"}, {kind:"heart", x:880, y:310, box:%d, fill:"#e2245a", aspect:[1,1]}])' % round(520 / a0))
                        save_dataurl(url, os.path.join(IMG, 'hrt-%s-oldbox.png' % oid))
                    if oid == 'current':
                        url = ev(c, '__fm929.overlayIcon(900, "#0b0f14", "#e2245a")')
                        save_dataurl(url, os.path.join(IMG, 'hrt-current-icon-overlay.png'))
                else:
                    o = {} if oid == 'current' else {'heart': 'OPT929.hearts.%s.heart' % oid, 'heartAspect': 'OPT929.hearts.%s.aspect' % oid}
                    ev(c, apply_expr(o))
                    # ONE fill for all four, so colour is not read as part of the option (the app picks a new one per add)
                    r = ev(c, '__fm929.editor("heart", {points: true, frac: 0.92, fill: "#e2245a"})')
                    time.sleep(0.5)
                    shot(c, r['canvas'], os.path.join(IMG, 'hrt-%s-points-pc.png' % oid), pad=0)
                    r = ev(c, '__fm929.editor("heart", {points: false, frac: 0.92, fill: "#e2245a"})')
                    time.sleep(0.4)
                    shot(c, r['canvas'], os.path.join(IMG, 'hrt-%s-editor-pc.png' % oid), pad=0)
        finally:
            close(c, proc, prof)
    with open(os.path.join(IMG, 'tiles-ink.json'), 'w') as f:
        json.dump(tink, f, indent=1)


if __name__ == '__main__':
    ap = argparse.ArgumentParser()
    ap.add_argument('--port', type=int, default=8795)
    ap.add_argument('--only', default=None)
    a = ap.parse_args()
    os.makedirs(IMG, exist_ok=True)
    if a.only in (None, 'people'):
        run_people(a.port)
    if a.only in (None, 'hearts'):
        run_hearts(a.port)
