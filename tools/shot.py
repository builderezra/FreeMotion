#!/usr/bin/env python3
"""Screenshot the app in a throwaway headless Chrome, after running your own JS in it.

    python3 tools/shot.py --out /path/a.png                      # home screen, 380x800, light home
    python3 tools/shot.py --home dark --out b.png                # the dark home look
    python3 tools/shot.py --js "document.querySelector('[aria-label=Settings]').click()" --wait 900 --out c.png
    python3 tools/shot.py --width 1280 --height 900 --js-file probe.js --out d.png
    python3 tools/shot.py --frames 0,120,240 --js "..." --out e.png   # e-0.png, e-120.png, e-240.png: an animation, mid-flight

Why it exists (22 Sep, #912): several agents had to LOOK at menus in light and dark at phone width at the
same time, and the built-in browser pane is one shared tab — two drivers in it corrupt each other's state.
Each call here gets its own Chrome, its own profile and its own port, so they cannot collide.

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
    ap.add_argument('--frames', default=None, help='comma list of ms offsets after --js: one PNG each')
    ap.add_argument('--out', required=True)
    a = ap.parse_args()

    profile = tempfile.mkdtemp(prefix='fm-shot-')
    dport = _cdp.free_port()
    proc = _cdp.launch(dport, a.width, a.height, profile)
    cdp = None
    try:
        cdp = _cdp.CDP(_cdp.ws_url(dport))
        cdp.send('Emulation.setDeviceMetricsOverride', width=a.width, height=a.height,
                 deviceScaleFactor=2 if a.width < 768 else 1, mobile=a.width < 768)
        cdp.send('Page.enable')
        cdp.send('Page.navigate', url=f'http://localhost:{a.port}{a.path}')
        deadline = time.time() + 30
        while time.time() < deadline:
            try:
                if cdp.eval("!!(window.FM && FM.scene && document.readyState === 'complete')"):
                    break
            except Exception:
                pass
            time.sleep(0.25)
        time.sleep(1.2)   # the intro and the home cards' rise
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
