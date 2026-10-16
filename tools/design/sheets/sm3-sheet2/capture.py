#!/usr/bin/env python3
"""tools/design/sheets/sm3-sheet2/capture.py - takes the pictures for Ezra's SECOND Simple Phase 3 sheet. Run it through capture.sh
(which serves this worktree on a free port, detaches into its own session and cleans up), never on its own:

    tools/design/sheets/sm3-sheet2/run-all.sh                  # capture + build + split, the one command
    tools/design/sheets/sm3-sheet2/capture.sh --only r6b,r6c   # those scenes again (shots.json keeps the others)

Copied from the first sheet's capture.py (tools/design/sheets/sm3-sheet/, never edited) with its own scenes, its own page global
(SM3SHEET2) and its own Chrome profile prefix (fm-sm3sheet2-, which no reaper in this repo matches and which the first sheet's
cleanup does not match either). Per viewport (380x800 phone, 1280x800 PC, 900x700 small PC): one throwaway Chrome of its OWN (it
kills only the Chrome it started), the phone as a finger exactly as tools/shot.py does it (touch emulation and hover:none, device
scale 2), the PC with a mouse (refused if it has none). Then for each scene: a fresh load of the app, capture.js evaluated in it, and
each step of the scene run and shot the moment it returns - <name>-<tag>.png (the whole screen) and, when the step names a crop,
<name>-<tag>-crop.png at twice the size. What every step measured goes to shots.json, which build.py turns into the sheet's words.

A step that cannot find what it expects FAILS BY NAME (capture.js need / count / needTools): its scene stops, the screen as it was
is kept as FAILED-<scene>-<step>-<tag>.png, and the run ends with exit 1 listing every failure. Nothing is shot as if it were the
picture when the thing in it is missing.
"""
import argparse, base64, datetime, json, os, shutil, signal, sys, tempfile, time

HERE = os.path.dirname(os.path.abspath(__file__))
TREE = os.path.abspath(os.path.join(HERE, '..', '..', '..', '..'))
sys.path.insert(0, os.path.join(TREE, 'tests'))
sys.dont_write_bytecode = True
import _cdp  # noqa: E402  (launch / ws_url / CDP / free_port, the suite's own)
_platform = _cdp._platform

PROFILE_PREFIX = 'fm-sm3sheet2-'
VIEWPORTS = [
    {'tag': '380', 'w': 380, 'h': 800, 'phone': True},
    {'tag': '1280', 'w': 1280, 'h': 800, 'phone': False},
    {'tag': '900', 'w': 900, 'h': 700, 'phone': False},
]
# Before any of the app's own scripts, in every page: the intro film is skipped (it plays once per browser session and would
# cover the first second of every shot), the "Simple editor. Switch back any time from the cog" toast counts as seen, and every
# load counts as the app's first (fm.session gone, index.html queue 942), so the boot ALWAYS ends by opening Home once its own
# project restore is done - capture.js waits for Home and only then makes its project, so a late restore cannot replace it.
SEED = ("try { sessionStorage.setItem('fm.splashed', '1'); sessionStorage.removeItem('fm.session'); "
        "localStorage.setItem('fm.editor.hint', '1'); } catch (e) {}")
PHONE_MEDIA = [{'name': 'hover', 'value': 'none'}, {'name': 'any-hover', 'value': 'none'},
               {'name': 'pointer', 'value': 'coarse'}, {'name': 'any-pointer', 'value': 'coarse'},
               {'name': 'prefers-reduced-motion', 'value': 'no-preference'}]
PC_MEDIA = [{'name': 'prefers-reduced-motion', 'value': 'no-preference'}]
# capture.js SCENES, for --only
SCENES = ['r6', 'r6full', 'r6b', 'r6c', 'clips', 'xsheet', 'xwith', 'fxtray', 'fxover', 'filllock', 'fillframe', 'tie5']


def log(*a):
    print(*a, flush=True)


def load(cdp, url):
    """Navigate and wait for THIS load's app (the old page is marked first, so it cannot answer for the new one)."""
    try:
        cdp.eval('window.__sm3old = 1')
    except Exception:
        pass
    cdp.send('Page.navigate', url=url)
    deadline = time.time() + 45
    while time.time() < deadline:
        try:
            if cdp.eval("!window.__sm3old && document.readyState === 'complete' && !!(window.FM && FM.scene && FM.editor && FM.simpleTools)"):
                time.sleep(1.2)
                return
        except Exception:
            pass
        time.sleep(0.25)
    raise RuntimeError('the app did not come up at %s within 45 s' % url)


def device(cdp, vp):
    if vp['phone']:
        # a phone is a FINGER, not a narrow mouse - the app asks about the pointer (queue 797, tools/shot.py)
        cdp.send('Emulation.setTouchEmulationEnabled', enabled=True, maxTouchPoints=5)
        cdp.send('Emulation.setEmulatedMedia', features=PHONE_MEDIA)
        if not cdp.eval("matchMedia('(hover: none)').matches"):
            raise RuntimeError('this is not a phone: (hover: none) does not match, so touch-only rules are off')
    else:
        cdp.send('Emulation.setEmulatedMedia', features=PC_MEDIA)
        if not cdp.eval('matchMedia(%s).matches' % json.dumps(_platform.MOUSE_QUERY)):
            raise RuntimeError('this is not a PC: %s does not match, so mouse-only rules are off' % _platform.MOUSE_QUERY)


def shoot(cdp, path, clip=None, scale=1):
    params = {'format': 'png'}
    if clip:
        params['clip'] = {'x': float(clip['x']), 'y': float(clip['y']), 'width': float(clip['w']), 'height': float(clip['h']), 'scale': scale}
    r = cdp.send('Page.captureScreenshot', **params)
    with open(path, 'wb') as f:
        f.write(base64.b64decode(r['data']))
    return path


def run_viewport(vp, a, js, url, shots, failures, pidfile):
    profile = tempfile.mkdtemp(prefix=PROFILE_PREFIX)
    dport = _cdp.free_port()
    proc = _cdp.launch(dport, vp['w'], vp['h'], profile)
    if pidfile:
        with open(pidfile, 'a') as f:
            f.write('%d\n' % proc.pid)
    cdp = None
    tag = vp['tag']
    try:
        cdp = _cdp.CDP(_cdp.ws_url(dport, proc=proc))
        cdp.send('Page.enable')
        cdp.send('Emulation.setDeviceMetricsOverride', width=vp['w'], height=vp['h'],
                 deviceScaleFactor=2 if vp['phone'] else 1, mobile=vp['phone'])
        cdp.send('Page.addScriptToEvaluateOnNewDocument', source=SEED)
        # a warm-up load: the FIRST navigation drops a touch emulation sent before it (tools/shot.py, measured 7 Sep), so the
        # finger goes on after it, and every scene's own load below boots already a phone
        load(cdp, url + '?sm3sheet2=0')
        device(cdp, vp)
        cdp.eval(js)
        scenes = cdp.eval('JSON.stringify(SM3SHEET2.list(%s))' % json.dumps(tag))
        scenes = json.loads(scenes or '[]')
        if a.only:
            scenes = [s for s in scenes if s in a.only]
        for n, scene in enumerate(scenes, 1):
            load(cdp, url + '?sm3sheet2=%s-%d' % (tag, n))
            device(cdp, vp)
            cdp.eval(js)
            steps = cdp.eval('SM3SHEET2.count(%s)' % json.dumps(scene))
            log('  %s @ %s: %s step(s)' % (scene, tag, steps))
            for i in range(int(steps or 0)):
                try:
                    res = cdp.eval('SM3SHEET2.step(%s, %d, %s)' % (json.dumps(scene), i, json.dumps(tag)), await_promise=True)
                except Exception as e:
                    res = {'ok': False, 'error': 'the page threw: %s' % str(e)[:600]}
                if not isinstance(res, dict) or not res.get('ok'):
                    err = (res or {}).get('error', 'no answer') if isinstance(res, dict) else 'no answer'
                    bad = 'FAILED-%s-%d-%s.png' % (scene, i, tag)
                    try:
                        shoot(cdp, os.path.join(a.out, bad))
                    except Exception:
                        bad = None
                    failures.append({'scene': scene, 'step': i, 'tag': tag, 'error': err, 'screen': bad})
                    log('  FAIL %s step %d @ %s: %s' % (scene, i, tag, err))
                    break
                if res.get('skip'):
                    log('    step %d: nothing to shoot here (skipped by design)' % i)
                    continue
                name = '%s-%s' % (res['name'], tag)
                shoot(cdp, os.path.join(a.out, name + '.png'))
                rec = {'name': name, 'scene': scene, 'tag': tag, 'file': name + '.png', 'meta': res.get('meta') or {}}
                if res.get('crop'):
                    # twice the size, so words stay sharp on his phone (build.py shrinks every picture to what the sheet shows)
                    shoot(cdp, os.path.join(a.out, name + '-crop.png'), res['crop'], scale=2)
                    rec['crop'] = name + '-crop.png'
                shots[name] = rec
                log('    %s.png%s  %s' % (name, ' (+crop)' if res.get('crop') else '', json.dumps(rec['meta'], ensure_ascii=True)[:300]))
    except Exception as e:
        failures.append({'scene': '*', 'step': -1, 'tag': tag, 'error': 'the %s run died: %s' % (tag, str(e)[:600]), 'screen': None})
        log('  FAIL the %s run: %s' % (tag, e))
    finally:
        if cdp:
            cdp.close()
        proc.terminate()
        try:
            proc.wait(timeout=10)
        except Exception:
            proc.kill()
        shutil.rmtree(profile, ignore_errors=True)
        if os.path.exists(profile):
            time.sleep(1.0)
            shutil.rmtree(profile, ignore_errors=True)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--port', type=int, required=True, help='the port capture.sh serves this worktree on')
    ap.add_argument('--out', default=HERE)
    ap.add_argument('--only', default='', help='comma list of scenes (%s)' % ', '.join(SCENES))
    ap.add_argument('--tags', default='380,1280,900', help='which viewports: 380, 1280, 900')
    ap.add_argument('--pids', default=None, help='file each Chrome pid is appended to (capture.sh kills only those)')
    ap.add_argument('--tree', default='', help='the commit the pictures are of (capture.sh passes it)')
    a = ap.parse_args()
    a.only = [s for s in a.only.split(',') if s]
    odd = [s for s in a.only if s not in SCENES] + [t for t in a.tags.split(',') if t not in [v['tag'] for v in VIEWPORTS]]
    if odd:
        log('capture.py: no such scene or size: %s (scenes: %s; sizes: 380, 1280, 900)' % (', '.join(odd), ', '.join(SCENES)))
        return 2
    js = open(os.path.join(HERE, 'capture.js'), encoding='utf-8').read()
    url = 'http://localhost:%d/index.html' % a.port
    try:
        _platform.chrome_path()
    except _platform.ChromeNotFound as e:
        log('capture.py: %s' % e)
        return 2
    sj = os.path.join(a.out, 'shots.json')
    shots = {}
    if a.only and os.path.exists(sj):
        # a partial run keeps every picture it did not retake
        try:
            shots = {s['name']: s for s in json.load(open(sj, encoding='utf-8')).get('shots', [])}
        except Exception:
            shots = {}
    if not a.only:
        for f in os.listdir(a.out):
            if f.startswith('FAILED-') and f.endswith('.png'):
                os.remove(os.path.join(a.out, f))
    failures = []
    t0 = time.time()
    for vp in VIEWPORTS:
        if vp['tag'] not in a.tags.split(','):
            continue
        log('%s x %s (%s):' % (vp['w'], vp['h'], 'phone' if vp['phone'] else 'PC'))
        run_viewport(vp, a, js, url, shots, failures, a.pids)
    out = {'taken': datetime.datetime.now().isoformat(timespec='minutes'), 'tree': a.tree,
           'shots': sorted(shots.values(), key=lambda s: s['name']), 'failures': failures}
    with open(sj, 'w', encoding='utf-8') as f:
        json.dump(out, f, indent=1, ensure_ascii=True)
    log('%d picture(s), %d failure(s), %d s' % (len(shots), len(failures), round(time.time() - t0)))
    for fl in failures:
        log('  FAILED %s step %s @ %s: %s%s' % (fl['scene'], fl['step'], fl['tag'], fl['error'], ('  (screen: %s)' % fl['screen']) if fl['screen'] else ''))
    return 1 if failures else 0


if __name__ == '__main__':
    def _on_term(signum, _frame):
        raise SystemExit(128 + signum)   # so every run_viewport finally closes its own Chrome
    signal.signal(signal.SIGTERM, _on_term)
    signal.signal(signal.SIGHUP, _on_term)
    sys.exit(main())
