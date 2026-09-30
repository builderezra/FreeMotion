"""#482 polish 3.7 / 3.8 — prove the new Compressor and Limiter defaults are today's sound, sample for sample.
Usage: python3 tools/design/482/polish3/dyn/exact-defaults.py PORT [BASE_COMMIT]
  PORT         a running tools/serve.sh serving THIS tree
  BASE_COMMIT  the release before the change (default 7bbeb5bc, v17.19)
The base commit's js/audio-fx.js is read with `git show` and evaluated inside the app into its own FM, then
exact-defaults.js renders every case through both builders and compares every sample. Exit 0 only when every
render is identical AND the control (a new key a hair off its default) is seen as different."""
import os, sys, time, json, tempfile, shutil, subprocess
HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..', '..', '..', '..'))
sys.path.insert(0, os.path.join(ROOT, 'tests'))
import _cdp  # noqa: E402

PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 9071
BASE = sys.argv[2] if len(sys.argv) > 2 else '7bbeb5bcd1c56e5fb78cf16c9048fc6772f7297c'
OLD_SRC = subprocess.check_output(['git', '-C', ROOT, 'show', BASE + ':js/audio-fx.js']).decode('utf-8')
BODY = open(os.path.join(HERE, 'exact-defaults.js')).read()

profile = tempfile.mkdtemp(prefix='fm-482-exact-')
dport = _cdp.free_port()
proc = _cdp.launch(dport, 900, 800, profile)
cdp = None
ok = False
try:
    cdp = _cdp.CDP(_cdp.ws_url(dport))
    cdp.send('Page.enable')
    cdp.send('Page.navigate', url='http://localhost:%d/index.html' % PORT)
    for _ in range(160):
        try:
            if cdp.eval("!!(window.FM && FM.buildAudioFxChain && FM.storage && FM.storage._sanitizeLayers && document.readyState === 'complete')"):
                break
        except Exception:
            pass
        time.sleep(0.25)
    time.sleep(0.5)
    expr = '(async () => { const OLD_SRC = %s; return (async function(OLD_SRC){ %s\n })(OLD_SRC); })()' % (json.dumps(OLD_SRC), BODY)
    res = cdp.eval(expr, await_promise=True)
    rows = res['rows']
    for r in rows:
        print('%-10s %-58s %-9s %dch %-7s differing %d of %d%s' % (r['type'], r['what'][:58], r['signal'], r['chans'], r['path'], r['differing'], r['samples'], '' if not r['differing'] else '  worst %.3g' % r['worst']))
    print('control (one new key a hair off its default must differ):')
    for c in res['control']:
        print('  %-10s %-8s = %-5s differing %d samples, the old code has the key: %s' % (c['type'], c['key'], c['v'], c['differing'], c['oldHasKey']))
    print('new defaults:', json.dumps(res['newDefaults']))
    ok = bool(res['allIdentical'] and res['controlSeesIt'])
    print('ALL %d RENDERS SAMPLE-IDENTICAL TO %s' % (len(rows), BASE[:8]) if ok else 'NOT IDENTICAL')
finally:
    if cdp:
        cdp.close()
    proc.terminate()
    try:
        proc.wait(timeout=5)
    except Exception:
        proc.kill()
    shutil.rmtree(profile, ignore_errors=True)
sys.exit(0 if ok else 1)
