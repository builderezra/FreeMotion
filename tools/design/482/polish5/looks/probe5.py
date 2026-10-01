"""#482 polish batch 5 looks - load the app on PORT, run a JS file's body as an async function, print its JSON.
Usage: python3 probe.py PORT file.js [width]"""
import os, sys, time, json, tempfile, shutil
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', '..', '..', '..', 'tests'))
import _cdp  # noqa: E402

PORT = int(sys.argv[1])
SRC = open(sys.argv[2]).read()
W = int(sys.argv[3]) if len(sys.argv) > 3 else 1280
H = 900
profile = tempfile.mkdtemp(prefix='fm-probe-b5-')
dport = _cdp.free_port()
proc = _cdp.launch(dport, W, H, profile)
cdp = None
try:
    cdp = _cdp.CDP(_cdp.ws_url(dport))
    cdp.send('Page.enable')
    cdp.send('Page.navigate', url='http://localhost:%d/index.html' % PORT)
    for _ in range(200):
        try:
            if cdp.eval("!!(window.FM && FM.scene && FM.renderScene && FM.fxRegistry && FM.filters && document.readyState === 'complete')"):
                break
        except Exception:
            pass
        time.sleep(0.25)
    time.sleep(1.0)
    val = cdp.eval('(async () => { %s\n })()' % SRC, await_promise=True)
    print(json.dumps(val, indent=1))
finally:
    if cdp:
        cdp.close()
    proc.terminate()
    try:
        proc.wait(timeout=5)
    except Exception:
        proc.kill()
    shutil.rmtree(profile, ignore_errors=True)
