#!/usr/bin/env python3
"""queue 981 — render the tap → add-menu frame strips (one per colour option) at 390x844.

    python3 tools/design/981/strip.py --port 8881 [--runs A:bottom,B:nearest,C:bottom]

One throwaway Chrome per run, set up exactly like tools/shot.py (phone emulation: touch, hover:none, DPR 2).
strip.js taps the empty area and pauses every animation; this script then SEEKS each moment (window.__981seek) and
shoots it, one after the other, so the frames are exact moments after the press however slow the machine is.
(A first version scheduled the seeks on page timers and shot with shot.py --frames: under load a shot took longer
than the gap and every later frame showed the last seek.) Writes tools/design/981/strip-<colour>.png and the single
frames under frames/.
"""
import argparse, base64, json, os, shutil, sys, tempfile, time
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..', '..'))
sys.path.insert(0, os.path.join(ROOT, 'tests'))
import _cdp  # noqa: E402

FRAMES = [60, 160, 260, 360, 440, 700]
RUNS = [('A', 'bottom'), ('B', 'nearest'), ('C', 'bottom')]
W, H = 390, 844


def run(port, colour, start, frames):
    profile = tempfile.mkdtemp(prefix='fm-981-')
    dport = _cdp.free_port()
    proc = _cdp.launch(dport, W, H, profile)
    cdp = None
    shots = []
    try:
        cdp = _cdp.CDP(_cdp.ws_url(dport))
        cdp.send('Emulation.setDeviceMetricsOverride', width=W, height=H, deviceScaleFactor=2, mobile=True)
        cdp.send('Page.enable')
        cdp.send('Page.addScriptToEvaluateOnNewDocument', source="try { localStorage.setItem('fm.test.seedProject', '1'); } catch (e) {}")
        cdp.send('Page.navigate', url='http://localhost:%d/index.html' % port)
        deadline = time.time() + 40
        while time.time() < deadline:
            try:
                if cdp.eval("!!(window.FM && FM.scene && document.readyState === 'complete')"):
                    break
            except Exception:
                pass
            time.sleep(0.25)
        cdp.send('Emulation.setTouchEmulationEnabled', enabled=True, maxTouchPoints=5)
        cdp.send('Emulation.setEmulatedMedia', features=[{'name': 'hover', 'value': 'none'}, {'name': 'any-hover', 'value': 'none'},
                                                        {'name': 'pointer', 'value': 'coarse'}, {'name': 'any-pointer', 'value': 'coarse'}])
        if not cdp.eval("matchMedia('(hover: none)').matches"):
            raise RuntimeError('not a phone: (hover: none) does not match')
        time.sleep(1.5)
        js = 'window.__981 = %s;\n%s' % (json.dumps({'colour': colour, 'start': start}), open(os.path.join(HERE, 'strip.js')).read())
        val = cdp.eval('(async () => { %s\n })()' % js, await_promise=True)
        print(json.dumps(val))
        if not (val and val.get('open') and val.get('rim')):
            raise RuntimeError('the tap did not open the menu with its rim: %s' % json.dumps(val))
        for t in frames:
            cdp.eval('window.__981seek(%d)' % t)
            time.sleep(0.35)
            shot = cdp.send('Page.captureScreenshot', format='png')
            path = os.path.join(HERE, 'frames', '%s-%s-%03d.png' % (colour, start, t))
            with open(path, 'wb') as f:
                f.write(base64.b64decode(shot['data']))
            shots.append(path)
    finally:
        if cdp:
            cdp.close()
        proc.terminate()
        try:
            proc.wait(timeout=5)
        except Exception:
            proc.kill()
        shutil.rmtree(profile, ignore_errors=True)
    return shots


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--port', type=int, required=True)
    ap.add_argument('--runs', default=None, help='e.g. A:bottom,B:nearest')
    a = ap.parse_args()
    runs = [tuple(r.split(':')) for r in a.runs.split(',')] if a.runs else RUNS
    os.makedirs(os.path.join(HERE, 'frames'), exist_ok=True)
    for colour, start in runs:
        paths = run(a.port, colour, start, FRAMES)
        ims = [Image.open(p).convert('RGB') for p in paths]
        w, h = ims[0].size
        sw, sh, pad = w // 2, h // 2, 16
        strip = Image.new('RGB', (len(ims) * (sw + pad) + pad, sh + 2 * pad), (24, 24, 28))
        for i, im in enumerate(ims):
            strip.paste(im.resize((sw, sh), Image.LANCZOS), (pad + i * (sw + pad), pad))
        dst = os.path.join(HERE, 'strip-%s.png' % colour)
        strip.save(dst)
        print(dst)


if __name__ == '__main__':
    main()
