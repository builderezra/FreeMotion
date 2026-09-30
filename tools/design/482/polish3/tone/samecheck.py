"""#482 polish batch 3 (tone) — prove the new keys' defaults render today's sound SAMPLE-EXACT.
Usage: python3 tools/design/482/polish3/tone/samecheck.py OLD_PORT NEW_PORT
Both ports are running tools/serve.sh servers: OLD of the release before (v17.19), NEW of this tree. samecheck.js renders
every touched effect (Bass & Treble, 3-Band EQ, Pitch Shift, and a chain of the three) with params saved before the new
keys existed, through FM.buildAudioFxChain — export path and preview path — on noise, a sweep and an impulse, and this
compares every Float32 sample bit for bit. Prints one line per render and exits 1 on any difference."""
import os, sys, time, json, base64, struct, tempfile, shutil
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, '..', '..', '..', '..', '..', 'tests'))
import _cdp  # noqa: E402

JS = open(os.path.join(HERE, 'samecheck.js')).read()


def grab(port):
    profile = tempfile.mkdtemp(prefix='fm-482t-')
    dport = _cdp.free_port()
    proc = _cdp.launch(dport, 1000, 800, profile)
    cdp = None
    try:
        cdp = _cdp.CDP(_cdp.ws_url(dport))
        cdp.send('Page.enable')
        cdp.send('Page.navigate', url='http://localhost:%d/index.html' % port)
        for _ in range(200):
            try:
                if cdp.eval("!!(window.FM && FM.buildAudioFxChain && FM.storage && FM.storage._sanitizeLayers && document.readyState === 'complete')"):
                    break
            except Exception:
                pass
            time.sleep(0.25)
        time.sleep(1.0)
        return cdp.eval(JS, await_promise=True)
    finally:
        if cdp:
            cdp.close()
        proc.terminate()
        try:
            proc.wait(timeout=5)
        except Exception:
            proc.kill()
        shutil.rmtree(profile, ignore_errors=True)


def floats(b):
    raw = base64.b64decode(b)
    return struct.unpack('<%df' % (len(raw) // 4), raw)


old = grab(int(sys.argv[1]))
new = grab(int(sys.argv[2]))
bad = 0
for k in sorted(old):
    a, b = old[k], new.get(k)
    if not b:
        print('MISSING', k); bad += 1; continue
    if a['h'] == b['h'] and a['b64'] == b['b64']:
        print('identical  ', k)
        continue
    fa, fb = floats(a['b64']), floats(b['b64'])
    worst = max(abs(x - y) for x, y in zip(fa, fb))
    ndiff = sum(1 for x, y in zip(fa, fb) if x != y)
    peak = max(abs(x) for x in fa) or 1
    print('DIFFERENT  ', k, 'samples differing %d of %d, worst %.3g (%.1f dB under the peak)' % (ndiff, len(fa), worst, 20 * __import__('math').log10(max(worst, 1e-30) / peak)))
    bad += 1
print('%d of %d renders identical' % (len(old) - bad, len(old)))
sys.exit(1 if bad else 0)
