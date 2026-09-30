"""#482 polish batch 3 (tone review fixes) — run one measurement script in the real app, on one or more servers.
Usage: python3 tools/design/482/polish3/tone/probe.py SCRIPT.js PORT [PORT ...]
Each PORT is a running tools/serve.sh (for a before/after: one serving the old tree, one this tree). The script is an
async function body that returns a JSON-able value; it runs after the app has booted, with FM ready. `pre` (from
data.py) is JS run first, e.g. options for the script. Prints '<port> <json>' per server. Every number the review
fixes quote was measured through this and the scripts beside it (clicks.js, level.js, pitch50.js)."""
import os, sys, time, json, tempfile, shutil
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, '..', '..', '..', '..', '..', 'tests'))
import _cdp  # noqa: E402


def run(port, js, pre=''):
    profile = tempfile.mkdtemp(prefix='fm-482tf-')
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
        return cdp.eval('%s\n(async () => { %s\n })()' % (pre, js), await_promise=True)
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
    JS = open(sys.argv[1]).read()
    for p in sys.argv[2:]:
        print(p, json.dumps(run(int(p), JS)))
