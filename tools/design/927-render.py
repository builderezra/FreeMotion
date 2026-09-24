#!/usr/bin/env python3
"""Every picture on the #927 sheet, rendered through the REAL app (queue 927 — Notes and Shortcuts/tips go BIG).

    python3 tools/design/927-render.py --port 8796            # needs tools/serve.sh on that port
    python3 tools/design/927-render.py --port 8796 --only fold

Writes JPEGs to tools/design/927/ and then the sheet itself (927-options.html → 927-options.jpg) beside it.

WHY NOT tools/shot.py --frames: that takes a screenshot at wall-clock offsets, and a screenshot at 1280 costs
50–100 ms, so the frames drift and a 360 ms animation comes out as three frames at random points. Here every
animation on the page is PAUSED the instant it starts and then SCRUBBED to exact times (document.getAnimations()
→ currentTime), so frame "120 ms" really is 120 ms into the real animation. Each job gets its own Chrome, so the
jobs run side by side.

The drags on the grip are synthetic pointer events here — this is a picture, not a proof. The PROOF is the 927
tests in tests/tests.js, which drive real mouse and touch input through tests/_cdp.py.
"""
import argparse, base64, json, os, shutil, subprocess, sys, tempfile, time
from concurrent.futures import ThreadPoolExecutor

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..'))
sys.path.insert(0, os.path.join(ROOT, 'tests'))
import _cdp  # noqa: E402

OUT = os.path.join(HERE, '927')

HELPERS = r"""
window.R = (function () {
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const R = {};
  R.sleep = sleep;
  R.prep = async function (look, size) {
    const sp = document.getElementById('splash');
    if (sp && !sp.classList.contains('hidden')) sp.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
    await sleep(450);
    if (FM.home && FM.home.isOpen && FM.home.isOpen()) FM.home.close();
    await sleep(450);
    /* A real project's worth of notes — fourteen, some long — so BIG is judged on a full pad, not an empty page
       (the first sheet had three short ones and every BIG picture was mostly blank paper). */
    FM.scene.project.notes = [
      ['Swap the intro music for the slower version — the 92 bpm one in the shared folder, not the remix.', true],
      ['Check the logo is not cut off on the 9:16 export', false],
      ['Colour-match the beach clips before the title card — the second one is warmer than the rest and it shows when they cut together.', true],
      ['Captions: fix “there / their” at 0:14', false],
      ['Ask Sam if we can use the drone shot of the headland, and whether they want a credit on the end card.', false],
      ['Lower the voice-over about 2 dB under the chorus', true],
      ['Trim the dead air at the start of clip 4', false],
      ['Try the whip-pan between the kitchen and the deck instead of the crossfade. If it feels like too much, keep the crossfade but make it 8 frames, not 15.', false],
      ['Export a square version for Instagram as well', true],
      ['Title font — Inter or the rounded one? Decide before Friday.', false],
      ['Stabilise the handheld walk-through (clip 7) — it wobbles at 0:32', false],
      ['Add the agent’s phone number to the last frame', true],
      ['Cut a 15-second version for Stories: open on the view, three rooms, logo.', false],
      ['Back up the project before trying the new colour grade', false]
    ].map((n, i) => ({ id: 'n' + (i + 1), text: n[0], remind: n[1] }));
    if (FM.notepad && FM.notepad.sync) FM.notepad.sync();
    document.documentElement.setAttribute('data-pb-look', look || 'arc');
    document.documentElement.setAttribute('data-pb-size', size || 'focus');
    return true;
  };
  R.open = async function (which, big) {
    try { localStorage.setItem('fm.panelBig', JSON.stringify(big ? { [which]: true } : {})); } catch (e) {}
    if (which === 'notes') FM.notepad.open(); else FM.shortcuts.show();
    await sleep(750);
    return R.geom(which);
  };
  R.card = which => document.querySelector(which === 'notes' ? '.np-card' : '.shortcuts-card');
  R.geom = function (which) {
    const c = R.card(which), g = c.querySelector('.pb-grip');
    const r = c.getBoundingClientRect(), q = g.getBoundingClientRect();
    return { card: [r.left, r.top, r.width, r.height], grip: [q.left, q.top, q.width, q.height], corner: c.getAttribute('data-pb-corner'), big: c.classList.contains('pb-big') };
  };
  /* A drawn pointer, because a screenshot has no cursor: the diagonal resize arrow on PC, a fingertip on a phone. */
  R.cursor = function (x, y, kind) {
    let el = document.getElementById('r927-cur');
    if (!el) { el = document.createElement('div'); el.id = 'r927-cur'; el.style.cssText = 'position:fixed;z-index:2147483647;pointer-events:none;'; document.body.appendChild(el); }
    if (kind === 'none') { el.remove(); return; }
    if (kind === 'finger') {
      el.innerHTML = '<div style="width:42px;height:42px;border-radius:50%;background:rgba(255,255,255,.34);border:2px solid rgba(255,255,255,.85);box-shadow:0 2px 10px rgba(0,0,0,.45)"></div>';
      el.style.left = (x - 21) + 'px'; el.style.top = (y - 21) + 'px';
    } else if (kind === 'arrow') {
      el.innerHTML = '<svg width="22" height="30" viewBox="0 0 22 30"><path d="M2 2v22l6-5.5 4.5 9 3.6-1.7-4.4-8.8H20z" fill="#000" stroke="#fff" stroke-width="1.6" stroke-linejoin="round"/></svg>';
      el.style.left = (x - 2) + 'px'; el.style.top = (y - 2) + 'px';
    } else {
      const rot = kind === 'nesw' ? 90 : kind === 'ns' ? 45 : kind === 'ew' ? -45 : 0;
      el.innerHTML = '<svg width="24" height="24" viewBox="0 0 30 30" style="transform:rotate(' + rot + 'deg)"><path d="M4 4h9.5l-3.4 3.4 12.5 12.5 3.4-3.4V26h-9.5l3.4-3.4L7.4 10.1 4 13.5z" fill="#000" stroke="#fff" stroke-width="1.7" stroke-linejoin="round"/></svg>';
      el.style.left = (x - 12) + 'px'; el.style.top = (y - 12) + 'px';
    }
  };
  let P = null;
  R.down = function (which, kind, sel) {
    const g = R.card(which).querySelector(sel || '.pb-grip'), r = g.getBoundingClientRect();
    P = { g: g, x: r.left + r.width / 2, y: r.top + r.height / 2, kind: kind || 'mouse' };
    g.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, cancelable: true, clientX: P.x, clientY: P.y, pointerId: 7, pointerType: P.kind, button: 0, buttons: 1, isPrimary: true }));
    return [P.x, P.y];
  };
  R.move = function (dx, dy) {
    const x = P.x + dx, y = P.y + dy;
    P.g.dispatchEvent(new PointerEvent('pointermove', { bubbles: true, cancelable: true, clientX: x, clientY: y, pointerId: 7, pointerType: P.kind, buttons: 1, isPrimary: true }));
    return [x, y];
  };
  R.up = function (dx, dy) {
    const x = P.x + dx, y = P.y + dy;
    P.g.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, cancelable: true, clientX: x, clientY: y, pointerId: 7, pointerType: P.kind, button: 0, buttons: 0, isPrimary: true }));
    return [x, y];
  };
  /* Pause every running animation the instant it starts, then scrub. */
  let frozen = [];
  R.freeze = function () { frozen = document.getAnimations().filter(a => a.playState === 'running'); frozen.forEach(a => a.pause()); return frozen.length; };
  R.seek = function (t) { frozen.forEach(a => { try { a.currentTime = t; } catch (e) {} }); return frozen.length; };
  /* Let everything land: finish(), not play() — play() on an animation already at its end starts it again. */
  R.land = function () { frozen.forEach(a => { try { a.finish(); } catch (e) {} }); frozen = []; return true; };
  R.box = function (sel) { const e = document.querySelector(sel); if (!e) return null; const r = e.getBoundingClientRect(); return [r.left, r.top, r.width, r.height]; };
  return R;
})();
"""


class Page:
    def __init__(self, port, w, h):
        self.w, self.h = w, h
        self.profile = tempfile.mkdtemp(prefix='fm-927-')
        dport = _cdp.free_port()
        self.proc = _cdp.launch(dport, w, h, self.profile)
        self.cdp = _cdp.CDP(_cdp.ws_url(dport))
        phone = w < 768
        self.dsf = 2 if phone else 1
        self.cdp.send('Emulation.setDeviceMetricsOverride', width=w, height=h, deviceScaleFactor=self.dsf, mobile=phone)
        self.cdp.send('Page.enable')
        self.cdp.send('Page.navigate', url=f'http://localhost:{port}/index.html')
        deadline = time.time() + 30
        while time.time() < deadline:
            try:
                if self.cdp.eval("!!(window.FM && FM.scene && FM.notepad && document.readyState === 'complete')"):
                    break
            except Exception:
                pass
            time.sleep(0.25)
        if phone:
            self.cdp.send('Emulation.setTouchEmulationEnabled', enabled=True, maxTouchPoints=5)
            self.cdp.send('Emulation.setEmulatedMedia', features=[{'name': 'hover', 'value': 'none'}, {'name': 'any-hover', 'value': 'none'},
                                                                  {'name': 'pointer', 'value': 'coarse'}, {'name': 'any-pointer', 'value': 'coarse'}])
        time.sleep(1.0)
        self.cdp.eval(HELPERS)

    def js(self, expr):
        return self.cdp.eval('(async () => { %s\n })()' % expr, await_promise=True)

    def hover(self, x, y):
        self.cdp.send('Input.dispatchMouseEvent', type='mouseMoved', x=x, y=y, button='none', buttons=0)

    def shot(self, name, clip=None):
        kw = {'format': 'png'}
        if clip:
            kw['clip'] = clip
        data = self.cdp.send('Page.captureScreenshot', **kw)['data']
        # JPEG, not PNG: 80 screenshots as PNG came to 8.4 MB, and this folder is committed (and deployed to Pages)
        from PIL import Image
        import io
        path = os.path.join(OUT, name + '.jpg')
        Image.open(io.BytesIO(base64.b64decode(data))).convert('RGB').save(path, quality=84, optimize=True)
        return path

    def close(self):
        try:
            self.cdp.close()
        finally:
            self.proc.terminate()
            try:
                self.proc.wait(timeout=5)
            except Exception:
                self.proc.kill()
            shutil.rmtree(self.profile, ignore_errors=True)


# ---- jobs -----------------------------------------------------------------------------------------------------------

def job_states(port, w, h, look, size, tag, sizes_only=False, panels=('notes', 'shortcuts')):
    """Each panel small and big, full screen."""
    p = Page(port, w, h)
    out = []
    try:
        p.js("return R.prep(%s, %s)" % (json.dumps(look), json.dumps(size)))
        for which in panels:
            for big in ((True,) if sizes_only else (False, True)):
                g = p.js("return R.open(%s, %s)" % (json.dumps(which), 'true' if big else 'false'))
                out.append(p.shot('%s-%s-%s' % (tag, which, 'big' if big else 'small')))
                p.js("if (%s === 'notes') FM.notepad.close({ now: true }); else FM.shortcuts.hide({ now: true }); await R.sleep(200); return 1" % json.dumps(which))
    finally:
        p.close()
    return out


def job_grips(port, look):
    """The grab corner close up (4x) and at real size, on both panels, on PC (rest + hover) and on a phone."""
    out = []
    p = Page(port, 1280, 800)
    try:
        p.js("return R.prep(%s, 'focus')" % json.dumps(look))
        for which in ('notes', 'shortcuts'):
            g = p.js("return R.open(%s, false)" % json.dumps(which))
            cx, cy = g['card'][0], g['card'][1]
            clip = {'x': cx - 14, 'y': cy - 12, 'width': 120, 'height': 64, 'scale': 4}
            p.hover(640, 300)
            time.sleep(0.25)
            out.append(p.shot('grip-%s-pc-%s' % (look, which), clip))
            # a little in from the corner, so the drawn cursor sits beside the mark rather than on top of it
            gx, gy = g['grip'][0] + g['grip'][2] * 0.78, g['grip'][1] + g['grip'][3] * 0.78
            p.hover(gx, gy)
            p.js("R.cursor(%f, %f, %s); return 1" % (gx, gy, json.dumps('nwse' if g['corner'] == 'tl' else 'nesw')))
            time.sleep(0.3)
            out.append(p.shot('grip-%s-pc-%s-hover' % (look, which), clip))
            p.js("R.cursor(0, 0, 'none'); return 1")
            # real size: the whole small card, 1:1
            r = g['card']
            out.append(p.shot('grip-%s-pc-%s-1x' % (look, which), {'x': r[0] - 8, 'y': r[1] - 8, 'width': 400, 'height': 150, 'scale': 1}))
            p.hover(640, 300)
            p.js("if (%s === 'notes') FM.notepad.close({ now: true }); else FM.shortcuts.hide({ now: true }); await R.sleep(200); return 1" % json.dumps(which))
    finally:
        p.close()
    p = Page(port, 380, 820)
    try:
        p.js("return R.prep(%s, 'focus')" % json.dumps(look))
        for which in ('notes', 'shortcuts'):
            g = p.js("return R.open(%s, false)" % json.dumps(which))
            r = g['card']
            clip = {'x': r[0] + r[2] - 110, 'y': r[1] - 10, 'width': 120, 'height': 64, 'scale': 2}
            out.append(p.shot('grip-%s-phone-%s' % (look, which), clip))
            out.append(p.shot('grip-%s-phone-%s-1x' % (look, which), {'x': 6, 'y': max(0, r[1] - 12), 'width': 368, 'height': 150, 'scale': 1}))
            p.js("if (%s === 'notes') FM.notepad.close({ now: true }); else FM.shortcuts.hide({ now: true }); await R.sleep(200); return 1" % json.dumps(which))
    finally:
        p.close()
    return out


def job_expand(port, w, h, which, tag):
    """Grab → pull → the outline → let go → it grows into the middle."""
    phone = w < 768
    kind = 'touch' if phone else 'mouse'
    out = []
    p = Page(port, w, h)
    try:
        p.js("return R.prep('arc', 'focus')")
        g = p.js("return R.open(%s, false)" % json.dumps(which))
        gx, gy = g['grip'][0] + g['grip'][2] / 2, g['grip'][1] + g['grip'][3] / 2
        sx = -1 if g['corner'] == 'tl' else 1
        cur = 'finger' if phone else ('nwse' if g['corner'] == 'tl' else 'nesw')
        if not phone:
            p.hover(gx, gy)
        p.js("R.cursor(%f, %f, %s); return 1" % (gx, gy, json.dumps(cur)))
        time.sleep(0.3)
        out.append(p.shot('%s-a0' % tag))
        d1 = 16 if not phone else 14
        x, y = p.js("R.down(%s, %s); return R.move(%f, %f)" % (json.dumps(which), json.dumps(kind), sx * d1, -d1))
        p.js("R.cursor(%f, %f, %s); return 1" % (x, y, json.dumps(cur)))
        time.sleep(0.25)
        out.append(p.shot('%s-a1' % tag))
        d2 = 64 if not phone else 58
        x, y = p.js("R.move(%f, %f); return R.move(%f, %f)" % (sx * d2 * .6, -d2 * .6, sx * d2, -d2))
        p.js("R.cursor(%f, %f, %s); return 1" % (x, y, json.dumps(cur)))
        time.sleep(0.4)
        out.append(p.shot('%s-a2' % tag))
        n = p.js("R.up(%f, %f); return R.freeze()" % (sx * d2, -d2))
        p.js("R.cursor(0, 0, 'none'); return 1")
        for t in (40, 110, 180, 260, 359):
            p.js("R.seek(%d); return 1" % t)
            time.sleep(0.08)
            out.append(p.shot('%s-m%03d' % (tag, t)))
    finally:
        p.close()
    return out


def job_shrink(port, w, h, which, tag):
    """Clause 6 — BIG → grab it → push it back in → the SMALL outline → let go → it goes back above its button.
    On PC the hand takes the BOTTOM-RIGHT corner (every edge and corner of a big panel takes the drag); on a phone,
    the finger takes the grip."""
    phone = w < 768
    kind = 'touch' if phone else 'mouse'
    out, geo = [], {}
    p = Page(port, w, h)
    try:
        p.js("return R.prep('arc', 'focus')")
        p.js("return R.open(%s, true)" % json.dumps(which))
        sel = '.pb-grip' if phone else '.pb-z-se'
        b = p.js("const e = R.card(%s).querySelector(%s); const r = e.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2, getComputedStyle(e).cursor, getComputedStyle(e).display]"
                 % (json.dumps(which), json.dumps(sel)))
        geo['handle'] = b
        gx, gy = b[0], b[1]
        # inward: from the top-right grip that is down-left; from the bottom-right corner, up-left
        ix, iy = (-1, 1) if phone else (-1, -1)
        cur = 'finger' if phone else 'nwse'
        if not phone:
            p.hover(gx, gy)
        p.js("R.cursor(%f, %f, %s); return 1" % (gx, gy, json.dumps(cur)))
        time.sleep(0.3)
        out.append(p.shot('%s-s0' % tag))
        d = 62
        x, y = p.js("R.down(%s, %s, %s); R.move(%f, %f); return R.move(%f, %f)" % (json.dumps(which), json.dumps(kind), json.dumps(sel), ix * d * .5, iy * d * .5, ix * d, iy * d))
        p.js("R.cursor(%f, %f, %s); return 1" % (x, y, json.dumps(cur)))
        time.sleep(0.4)
        geo['ghost'] = p.js("return R.box('.pb-ghost.on')")
        out.append(p.shot('%s-s1' % tag))
        p.js("R.up(%f, %f); return R.freeze()" % (ix * d, iy * d))
        p.js("R.cursor(0, 0, 'none'); return 1")
        for t in (60, 150, 230):
            p.js("R.seek(%d); return 1" % t)
            time.sleep(0.08)
            out.append(p.shot('%s-s%03d' % (tag, t)))
        p.js("return R.land()")
        time.sleep(0.5)
        geo['rest'] = p.js("return R.geom(%s)" % json.dumps(which))
        out.append(p.shot('%s-s-rest' % tag))
    finally:
        p.close()
    print(tag, 'shrink geometry', json.dumps(geo))
    return out


def job_fold(port, w, h, which, tag, btn_sel):
    """Big → close → shrinks onto itself (writing still on it) → folds into its button → the button bumps.
    Full frames for the first beats; for the arrival and the bump, a close-up round the button as well, because at
    sheet size a 28px button is a few pixels."""
    phone = w < 768
    out, geo = [], {}
    p = Page(port, w, h)
    try:
        p.js("return R.prep('arc', 'focus')")
        p.js("return R.open(%s, true)" % json.dumps(which))
        b = p.js("const c = R.card(%s); const d = c.querySelector(%s); const r = d.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]"
                 % (json.dumps(which), json.dumps('.np-done' if which == 'notes' else '.shortcuts-foot .btn:not(.shortcuts-tut)')))
        bb = p.js("return R.box(%s)" % json.dumps(btn_sel))
        geo['button'] = bb
        bcx, bcy = bb[0] + bb[2] / 2, bb[1] + bb[3] / 2
        cw, ch = (190, 120) if phone else (300, 170)
        clip = {'x': max(0, min(w - cw, bcx - cw / 2)), 'y': max(0, min(h - ch, bcy - ch / 2)), 'width': cw, 'height': ch, 'scale': 2 if phone else 2.4}
        if not phone:
            p.hover(b[0], b[1])
        p.js("R.cursor(%f, %f, %s); return 1" % (b[0], b[1], json.dumps('finger' if phone else 'arrow')))
        time.sleep(0.3)
        out.append(p.shot('%s-f-rest' % tag))
        p.js("R.cursor(0, 0, 'none'); return 1")
        out.append(p.shot('%s-z-rest' % tag, clip))
        p.js("if (%s === 'notes') FM.notepad.close(); else FM.shortcuts.hide(); return R.freeze()" % json.dumps(which))
        for t in (100, 200, 300, 400, 460, 500, 590, 800):
            p.js("R.seek(%d); return 1" % t)
            time.sleep(0.1)
            geo['card@%d' % t] = p.js("const c = R.card(%s); if (!c || !c.isConnected) return null; const r = c.getBoundingClientRect(); return [Math.round(r.left), Math.round(r.top), Math.round(r.width), Math.round(r.height), +getComputedStyle(c).opacity]" % json.dumps(which))
            out.append(p.shot('%s-f%03d' % (tag, t)))
            if t >= 400:
                out.append(p.shot('%s-z%03d' % (tag, t), clip))
    finally:
        p.close()
    print(tag, 'fold geometry', json.dumps(geo))
    return out


def job_home(port):
    """Shortcuts opened over the LIGHT Home screen (Settings › Keyboard shortcuts): the grip's light-theme colour, the
    centred card's top-right corner, and closing while big where there is no button on screen — it shrinks and fades
    where it is."""
    out = []
    p = Page(port, 1280, 800)
    try:
        p.js("await R.prep('arc', 'focus'); if (FM.settings && FM.settings.set) FM.settings.set('homeLight', true); document.documentElement.setAttribute('data-home', 'light'); FM.home.open(); await R.sleep(900); return FM.home.isOpen()")
        g = p.js("return R.open('shortcuts', false)")
        out.append(p.shot('home-shortcuts-small'))
        r = g['card']
        out.append(p.shot('home-grip', {'x': r[0] + r[2] - 110, 'y': r[1] - 12, 'width': 120, 'height': 64, 'scale': 4}))
        p.js("FM.shortcuts.hide({ now: true }); await R.sleep(200); return 1")
        p.js("return R.open('shortcuts', true)")
        out.append(p.shot('home-shortcuts-big'))
        p.js("FM.shortcuts.hide(); return R.freeze()")
        for t in (120, 260, 420):
            p.js("R.seek(%d); return 1" % t)
            time.sleep(0.1)
            out.append(p.shot('home-f%03d' % t))
    finally:
        p.close()
    return out


def job_lean(port):
    """The lean on a phone stays on the glass: the card's box at the furthest pull, against the screen."""
    p = Page(port, 380, 820)
    try:
        p.js("return R.prep('arc', 'focus')")
        p.js("return R.open('notes', false)")
        res = p.js("R.down('notes', 'touch'); let worst = 0; for (let k = 1; k <= 12; k++) { R.move(k * 8, -k * 14); const r = R.card('notes').getBoundingClientRect(); worst = Math.max(worst, r.right); } R.up(96, -168); return { maxRight: worst, innerWidth: innerWidth }")
        print('phone lean', json.dumps(res))
    finally:
        p.close()
    return []


def job_sheet(port):
    """The sheet: 927-options.html rendered at 900px wide, full height, to one JPG he can read on his phone."""
    from PIL import Image
    profile = tempfile.mkdtemp(prefix='fm-927s-')
    dport = _cdp.free_port()
    proc = _cdp.launch(dport, 900, 1200, profile)
    try:
        cdp = _cdp.CDP(_cdp.ws_url(dport))
        cdp.send('Emulation.setDeviceMetricsOverride', width=900, height=1200, deviceScaleFactor=1, mobile=False)
        cdp.send('Page.enable')
        cdp.send('Page.navigate', url=f'http://localhost:{port}/tools/design/927-options.html')
        time.sleep(1.0)
        for _ in range(60):
            if cdp.eval("document.readyState === 'complete' && [].every.call(document.images, i => i.complete)"):
                break
            time.sleep(0.25)
        h = int(cdp.eval("Math.ceil(document.documentElement.scrollHeight)"))
        # In slices, stitched: one capture of a page this tall (over 16384px) comes back blank below the GPU's
        # texture limit.
        import io
        sheet = Image.new('RGB', (900, h))
        step = 4000
        for y in range(0, h, step):
            hh = min(step, h - y)
            data = cdp.send('Page.captureScreenshot', format='png', captureBeyondViewport=True, clip={'x': 0, 'y': y, 'width': 900, 'height': hh, 'scale': 1})['data']
            sheet.paste(Image.open(io.BytesIO(base64.b64decode(data))).convert('RGB'), (0, y))
        jpg = os.path.join(HERE, '927-options.jpg')
        sheet.save(jpg, quality=84, optimize=True, progressive=True)
        cdp.close()
        return [jpg]
    finally:
        proc.terminate()
        try:
            proc.wait(timeout=5)
        except Exception:
            proc.kill()
        shutil.rmtree(profile, ignore_errors=True)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--port', type=int, default=8796)
    ap.add_argument('--only', default=None, help='states | sizes | grips | expand | shrink | fold | home | lean | sheet')
    a = ap.parse_args()
    os.makedirs(OUT, exist_ok=True)
    port = a.port
    jobs = []
    want = lambda k: a.only is None or k in a.only.split(',')
    if want('states'):
        jobs.append(lambda: job_states(port, 1280, 800, 'arc', 'focus', 'pc'))
        jobs.append(lambda: job_states(port, 380, 820, 'arc', 'focus', 'phone'))
    if want('sizes'):
        jobs.append(lambda: job_states(port, 1280, 800, 'arc', 'roomy', 'size-roomy', True, ('notes',)))
        jobs.append(lambda: job_states(port, 1280, 800, 'arc', 'most', 'size-most', True, ('notes',)))
    if want('grips'):
        for look in ('arc', 'lines', 'chip'):
            jobs.append(lambda look=look: job_grips(port, look))
    if want('expand'):
        jobs.append(lambda: job_expand(port, 1280, 800, 'notes', 'x-pc-notes'))
        jobs.append(lambda: job_expand(port, 380, 820, 'notes', 'x-phone-notes'))
    if want('shrink'):
        jobs.append(lambda: job_shrink(port, 1280, 800, 'notes', 'x-pc-notes'))
        jobs.append(lambda: job_shrink(port, 380, 820, 'notes', 'x-phone-notes'))
    if want('fold'):
        jobs.append(lambda: job_fold(port, 1280, 800, 'notes', 'x-pc-notes', '#btn-notes'))
        jobs.append(lambda: job_fold(port, 1280, 800, 'shortcuts', 'x-pc-shortcuts', '#btn-help'))
        jobs.append(lambda: job_fold(port, 380, 820, 'notes', 'x-phone-notes', '#m-notes'))
    if want('home'):
        jobs.append(lambda: job_home(port))
    if want('lean'):
        jobs.append(lambda: job_lean(port))
    with ThreadPoolExecutor(max_workers=4) as ex:
        for res in ex.map(lambda f: f(), jobs):
            for pth in res:
                print(os.path.relpath(pth, ROOT))
    if want('sheet'):   # last: it is made of everything above
        for pth in job_sheet(port):
            print(os.path.relpath(pth, ROOT))


if __name__ == '__main__':
    main()
