#!/usr/bin/env python3
"""Screenshot the app in a throwaway headless Chrome, after running your own JS in it.

TWO WAYS TO CALL IT. The original (v16.07) form still works exactly as before — positional out, --setup,
and it CLOSES Home first so the shot is the editor:
    python3 tools/shot.py out.png --width 380 --height 820 --setup 'FM.selectLayer(FM.scene.layers[0].id)'
The #912 form stays on Home unless your JS leaves it, and prints what the JS returns:

    python3 tools/shot.py --out /path/a.png                      # home screen, 380x800, light home
    python3 tools/shot.py --home dark --out b.png                # the dark home look
    python3 tools/shot.py --js "document.querySelector('[aria-label=Settings]').click()" --wait 900 --out c.png
    python3 tools/shot.py --width 1280 --height 900 --js-file probe.js --out d.png
    python3 tools/shot.py --frames 0,120,240 --js "..." --out e.png   # e-0.png, e-120.png, e-240.png: an animation, mid-flight

Why it exists (22 Sep, #912): several agents had to LOOK at menus in light and dark at phone width at the
same time, and the built-in browser pane is one shared tab — two drivers in it corrupt each other's state.
Each call here gets its own Chrome, its own profile and its own port, so they cannot collide.
⚠️ 22 Sep: the #912 rewrite REPLACED the v16.07 tool without noticing it existed, and dropped its phone
emulation (touch + hover:none — the app asks about the POINTER, not the width; see queue 797). Both are
back: any width under 768 is shot as a touch phone, and the call refuses if (hover: none) does not match.

--js runs AFTER the app has loaded (and, with --home, after the home look is applied). Its value — if it
returns one, or a Promise — is printed as JSON, so one call can both act and measure. Throws are printed,
and the screenshot is still taken, because "what does the screen look like when this failed" is usually
the question. Needs the dev server on --port (tools/serve.sh).
"""
import argparse, json, os, shutil, sys, tempfile, time

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'tests'))
import _cdp  # noqa: E402  (launch / ws_url / CDP)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--port', type=int, default=8777)
    ap.add_argument('--path', default='/index.html')
    ap.add_argument('--width', type=int, default=380)
    ap.add_argument('--height', type=int, default=800)
    ap.add_argument('--home', choices=['light', 'dark'], default=None, help='force the Home look before --js')
    ap.add_argument('--js', default=None)
    ap.add_argument('--js-file', default=None)
    ap.add_argument('--wait', type=int, default=600, help='ms to wait after --js before the shot')
    ap.add_argument('--safe-top', type=int, default=0, help='emulate an iPhone notch: env(safe-area-inset-top) in px (47 = iPhone 14/15)')
    ap.add_argument('--safe-bottom', type=int, default=0)
    ap.add_argument('--frames', default=None, help='comma list of ms offsets after --js: one PNG each')
    ap.add_argument('out_pos', nargs='?', default=None, help='(v16.07 form) the PNG to write')
    ap.add_argument('--out', default=None)
    ap.add_argument('--setup', default=None, help='(v16.07 form) JS run AFTER Home is closed')
    a = ap.parse_args()
    a.out = a.out or a.out_pos
    if not a.out:
        ap.error('give the PNG path (positional, or --out)')

    profile = tempfile.mkdtemp(prefix='fm-shot-')
    dport = _cdp.free_port()
    proc = _cdp.launch(dport, a.width, a.height, profile)
    cdp = None
    try:
        cdp = _cdp.CDP(_cdp.ws_url(dport))
        cdp.send('Emulation.setDeviceMetricsOverride', width=a.width, height=a.height,
                 deviceScaleFactor=2 if a.width < 768 else 1, mobile=a.width < 768)
        cdp.send('Page.enable')
        if a.safe_top or a.safe_bottom:
            # #920: the top-of-screen strip lives in the iPhone's safe area, which a desktop browser does not have — so every
            # earlier attempt measured env(safe-area-inset-top) = 0 and could not see it. Chrome ≥136 can fake the insets.
            cdp.send('Emulation.setSafeAreaInsetsOverride', insets={'top': a.safe_top, 'bottom': a.safe_bottom, 'left': 0, 'right': 0})
        cdp.send('Page.navigate', url=f'http://localhost:{a.port}{a.path}')
        deadline = time.time() + 30
        while time.time() < deadline:
            try:
                if cdp.eval("!!(window.FM && FM.scene && document.readyState === 'complete')"):
                    break
            except Exception:
                pass
            time.sleep(0.25)
        if a.width < 768:
            # the PHONE is a finger, not a narrow mouse: issued after the navigation (sent before it, the load
            # drops it — measured 7 Sep), and the media override only holds once touch emulation is on
            cdp.send('Emulation.setTouchEmulationEnabled', enabled=True, maxTouchPoints=5)
            cdp.send('Emulation.setEmulatedMedia', features=[{'name': 'hover', 'value': 'none'},
                                                            {'name': 'any-hover', 'value': 'none'},
                                                            {'name': 'pointer', 'value': 'coarse'},
                                                            {'name': 'any-pointer', 'value': 'coarse'}])
            if not cdp.eval("matchMedia('(hover: none)').matches"):
                raise RuntimeError('the shot is not a phone: (hover: none) does not match, so touch-only rules are off')
        time.sleep(1.2)   # the intro and the home cards' rise
        if a.setup is not None:
            cdp.eval("(function(){ try { if (window.FM && FM.home && FM.home.isOpen && FM.home.isOpen()) FM.home.close(); } catch (e) {} })()")
            time.sleep(0.6)
            try:
                cdp.eval('(function(){ %s })()' % a.setup)
            except Exception as e:
                print(json.dumps({'setup_error': str(e)[:1200]}))
        if a.home:
            cdp.eval("(FM.settings && FM.settings.set) ? FM.settings.set('homeLight', %s) : 0; "
                     "document.documentElement.setAttribute('data-home', '%s'); 1"
                     % ('true' if a.home == 'light' else 'false', a.home))
            time.sleep(0.3)
        js = a.js
        if a.js_file:
            js = open(a.js_file).read()
        if js:
            try:
                val = cdp.eval('(async () => { %s\n })()' % js if 'return' in js else js, await_promise=True)
                print(json.dumps({'js': val})[:4000])
            except Exception as e:
                print(json.dumps({'js_error': str(e)[:1200]}))
        offsets = [int(x) for x in a.frames.split(',')] if a.frames else [a.wait]
        t0 = time.time()
        base, ext = os.path.splitext(a.out)
        for off in offsets:
            lag = off / 1000 - (time.time() - t0)
            if lag > 0:
                time.sleep(lag)
            shot = cdp.send('Page.captureScreenshot', format='png')
            path = a.out if not a.frames else f'{base}-{off}{ext or ".png"}'
            import base64
            with open(path, 'wb') as f:
                f.write(base64.b64decode(shot['data']))
            print(path)
    finally:
        if cdp:
            cdp.close()
        proc.terminate()
        try:
            proc.wait(timeout=5)
        except Exception:
            proc.kill()
        shutil.rmtree(profile, ignore_errors=True)


if __name__ == '__main__':
    main()
