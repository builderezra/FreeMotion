"""queue 974 — frames of every option now in the app, rendered BY THE APP (no prototype): the real Home, the real
New project card, the real empty project, each option forced through FM.variant.force and SEEKED (paused Web/CSS
animations) at fixed times, so every frame is exact rather than a lucky screenshot.

Usage: python3 tools/design/974/render.py <port> <outdir> [which ...]      which: 947 964 964start clapper (default all)
Needs the dev server on <port> (tools/serve.sh). Writes PNG frames into <outdir>/frames and composes strips + GIFs
into <outdir> with tools/design/974/compose.py."""
import base64, json, os, shutil, sys, tempfile, time

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, '..', '..', '..', 'tests'))
import _cdp  # noqa: E402

PORT = int(sys.argv[1])
OUT = sys.argv[2]
WHICH = sys.argv[3:] or ['947', '964', '964start', 'clapper']
FR = os.path.join(OUT, 'frames')
os.makedirs(FR, exist_ok=True)
W, H = 390, 844


def boot(cdp):
    cdp.send('Emulation.setDeviceMetricsOverride', width=W, height=H, deviceScaleFactor=2, mobile=True)
    cdp.send('Page.enable')
    cdp.send('Page.addScriptToEvaluateOnNewDocument', source="try { localStorage.setItem('fm.test.seedProject', '1'); } catch (e) {}")
    cdp.send('Page.navigate', url='http://localhost:%d/index.html' % PORT)
    for _ in range(160):
        try:
            if cdp.eval("!!(window.FM && FM.scene && document.readyState === 'complete')"):
                break
        except Exception:
            pass
        time.sleep(0.25)
    cdp.send('Emulation.setTouchEmulationEnabled', enabled=True, maxTouchPoints=5)
    cdp.send('Emulation.setEmulatedMedia', features=[{'name': 'hover', 'value': 'none'}, {'name': 'pointer', 'value': 'coarse'}])
    for _ in range(80):
        if not cdp.eval("document.documentElement.classList.contains('splash-on')"):
            break
        time.sleep(0.25)
    time.sleep(2.0)


def snap(cdp, name, clip=None):
    time.sleep(0.08)
    params = {'format': 'png'}
    if clip:
        params['clip'] = dict(clip, scale=1)
    d = cdp.send('Page.captureScreenshot', **params)['data']
    with open(os.path.join(FR, name + '.png'), 'wb') as f:
        f.write(base64.b64decode(d))


def ev(cdp, js):
    r = cdp.eval(js, await_promise=True)
    return r


# The app tears its entrance / press layers down on REAL-TIME timers (by design: #571). A seeked frame series takes
# seconds of real time, so those timers are held back for the one call that starts each series. Render-only.
HOLD = ("window.__st = window.__st || window.setTimeout; window.setTimeout = function (fn, ms) {"
        " if ([680, 490, 1150, 1250].indexOf(ms) >= 0) return 0; return window.__st.apply(window, arguments); };")
FREE = "window.setTimeout = window.__st || window.setTimeout;"


profile = tempfile.mkdtemp(prefix='fm-974-')
dport = _cdp.free_port()
proc = _cdp.launch(dport, W, H, profile)
cdp = None
meta = {}
try:
    cdp = _cdp.CDP(_cdp.ws_url(dport))
    boot(cdp)

    if '947' in WHICH:
        for look in ['dark', 'light']:
            ev(cdp, "(async () => { FM.settings.set('homeLight', %s); document.documentElement.setAttribute('data-home', '%s');"
                    " if (!FM.home.isOpen()) FM.home.open(); await new Promise(r => setTimeout(r, 1500));"
                    " const t = document.querySelector('.hm-tab[data-tab=\"projects\"]'); if (t) t.click(); return 1; })()"
               % ('true' if look == 'light' else 'false', look))
            time.sleep(1.2)
            for v in ['A', 'B', 'C']:
                ev(cdp, ("(async () => { const d = document.getElementById('hm-dialog'); d.classList.add('hidden');"
                         " await new Promise(r => setTimeout(r, 60)); FM.variant.force('newproject', '%s');" % v) + HOLD +
                        " document.getElementById('hm-new').click();" + FREE +
                        " window.__np = document.getAnimations().filter(a => /^np947-/.test(a.id || ''));"
                        " window.__np.forEach(a => a.pause()); return window.__np.length; })()")
                for i in range(0, 17):
                    t = 640 * i / 16
                    ev(cdp, "(() => { window.__np.forEach(a => { a.currentTime = %f; }); return 1; })()" % t)
                    snap(cdp, '947-%s-%s-%02d' % (v, look, i))
                ev(cdp, "(() => { window.__np.forEach(a => a.play()); document.getElementById('hm-dialog').classList.add('hidden'); return 1; })()")
                time.sleep(0.3)
            # A's Cancel, backwards
            ev(cdp, "(async () => { FM.variant.force('newproject', 'A'); document.getElementById('hm-new').click();"
                    " await new Promise(r => setTimeout(r, 900));" + HOLD + " document.getElementById('hm-cancel').click();" + FREE +
                    " window.__np = document.getAnimations().filter(a => /^np947-/.test(a.id || '')); window.__np.forEach(a => a.pause()); return window.__np.length; })()")
            for i in range(0, 9):
                t = 460 * i / 8
                ev(cdp, "(() => { window.__np.forEach(a => { a.currentTime = %f; }); return 1; })()" % t)
                snap(cdp, '947-Aback-%s-%02d' % (look, i))
            ev(cdp, "(() => { window.__np.forEach(a => a.play()); document.getElementById('hm-dialog').classList.add('hidden'); return 1; })()")
            time.sleep(0.8)
        ev(cdp, "(() => { FM.variant.force('newproject', null); FM.settings.set('homeLight', false); document.documentElement.setAttribute('data-home', 'dark'); return 1; })()")

    if '964' in WHICH or '964start' in WHICH or 'clapper' in WHICH:
        ev(cdp, "(async () => { if (FM.home.isOpen()) FM.home.close(); await new Promise(r => setTimeout(r, 900));"
                " FM.scene.layers.length = 0; FM.selectLayer(null); FM.refreshAll(); FM.timeline.rebuild();"
                " await new Promise(r => setTimeout(r, 500)); return 1; })()")
        area = ev(cdp, "(() => { const tl = document.getElementById('timeline'), r = tl.getBoundingClientRect(), ru = document.getElementById('tl-rulerrow').getBoundingClientRect();"
                       " const panel = document.getElementById('timeline-panel').getBoundingClientRect();"
                       " return { left: r.left, top: ru.bottom, width: tl.clientWidth, height: r.bottom - ru.bottom, ptop: panel.top }; })()")
        meta['area'] = area
        clip = {'x': 0, 'y': max(0, area['ptop'] - 8), 'width': W, 'height': H - max(0, area['ptop'] - 8)}
        PRESS = ("(() => { const tl = document.getElementById('timeline'), p = document.getElementById('timeline-panel');"
                 " p.querySelectorAll('.tl-areafx').forEach(n => n.remove());"
                 " const o = { bubbles: true, cancelable: true, clientX: %f, clientY: %f, pointerId: 9, pointerType: 'touch', isPrimary: true, button: 0 };"
                 + HOLD + " tl.dispatchEvent(new PointerEvent('pointerdown', Object.assign({}, o, { buttons: 1 })));" + FREE +
                 " tl.dispatchEvent(new PointerEvent('pointerup', Object.assign({}, o, { buttons: 0 })));"
                 " window.__fx = [].slice.call(p.querySelectorAll('.tl-areafx'));"
                 " window.__fx.forEach(h => { h._fxSeeking = true; h.getAnimations({ subtree: true }).forEach(a => a.pause()); });"
                 " return window.__fx.map(h => h.className + ' ' + (h.dataset.variant || h.dataset.start || '')); })()")
        SEEK = ("(() => { window.__fx.forEach(h => { h.getAnimations({ subtree: true }).forEach(a => { a.currentTime = %f; });"
                " if (h._fxDraw) h._fxDraw(%f); }); return 1; })()")
        plus = (area['left'] + area['width'] / 2, area['top'] + area['height'] * 0.36)
        if '964' in WHICH:
            for v in ['A', 'B', 'C']:
                ev(cdp, "(() => { FM.variant.force('emptytap.colour', '%s'); FM.variant.force('emptytap.start', 'bottom'); return 1; })()" % v)
                meta['964-' + v] = ev(cdp, PRESS % plus)
                for i, t in enumerate([0, 60, 120, 180, 240, 300, 360, 450, 560, 700, 850, 1000]):
                    ev(cdp, SEEK % (t, t))
                    snap(cdp, '964-%s-%02d' % (v, i), clip)
                ev(cdp, "(() => { document.querySelectorAll('.tl-areafx').forEach(n => n.remove()); return 1; })()")
        if '964start' in WHICH:
            left = (area['left'] + 18, area['top'] + area['height'] * 0.55)
            for s in ['bottom', 'nearest']:
                ev(cdp, "(() => { FM.variant.force('emptytap.colour', 'A'); FM.variant.force('emptytap.start', '%s'); return 1; })()" % s)
                meta['964start-' + s] = ev(cdp, PRESS % left)
                # outline only: hide the colour layer so the lap reads
                ev(cdp, "(() => { document.querySelectorAll('.tl-areafx--press').forEach(n => n.style.visibility = 'hidden'); return 1; })()")
                for i, t in enumerate([0, 60, 120, 180, 240, 300, 360, 480, 700]):
                    ev(cdp, SEEK % (t, t))
                    snap(cdp, '964start-%s-%02d' % (s, i), clip)
                ev(cdp, "(() => { document.querySelectorAll('.tl-areafx').forEach(n => n.remove()); return 1; })()")
        ev(cdp, "(() => { FM.variant.force('emptytap.colour', null); FM.variant.force('emptytap.start', null); return 1; })()")

        if 'clapper' in WHICH:
            hint = ev(cdp, "(() => { const r = document.querySelector('#drop-hint .dh-icon').getBoundingClientRect(); return { x: r.left, y: r.top, w: r.width, h: r.height }; })()")
            cclip = {'x': hint['x'] - 30, 'y': hint['y'] - 30, 'width': hint['w'] + 60, 'height': hint['h'] + 50}
            for v in ['A', 'B', 'C']:
                for col in ['cyan', 'grey']:
                    ev(cdp, "(async () => { FM.variant.force('clapper.timing', '%s'); FM.variant.force('clapper.lines', '%s');"
                            " FM.scene.layers.push(FM.makeLayer('shape', { shape: 'rect', name: 'r', x: 100, y: 100, shapeW: 60, shapeH: 60, fill: '#f00' }));"
                            " FM.refreshAll(); await new Promise(r => setTimeout(r, 60)); FM.scene.layers.length = 0; FM.refreshAll();"
                            " await new Promise(r => setTimeout(r, 80));"
                            " window.__dh = document.getElementById('drop-hint').getAnimations({ subtree: true }).filter(a => /^dh-/.test(a.animationName || ''));"
                            " window.__dh.forEach(a => a.pause()); return window.__dh.map(a => a.animationName); })()" % (v, col))
                    # 8 s of the empty project at 10 frames a second (the time is from the moment it opens: 0.4 s delay first)
                    n = 0
                    for ms in range(0, 8001, 100):
                        ev(cdp, "(() => { window.__dh.forEach(a => { a.currentTime = %d; }); return 1; })()" % ms)
                        snap(cdp, 'clap-%s-%s-%03d' % (v, col, n), cclip)
                        n += 1
                    ev(cdp, "(() => { window.__dh.forEach(a => a.play()); return 1; })()")
            ev(cdp, "(() => { FM.variant.force('clapper.timing', null); FM.variant.force('clapper.lines', null); return 1; })()")
finally:
    if cdp:
        cdp.close()
    proc.terminate()
    try:
        proc.wait(timeout=5)
    except Exception:
        proc.kill()
    shutil.rmtree(profile, ignore_errors=True)
print(json.dumps(meta)[:3000])
