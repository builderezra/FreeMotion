#!/usr/bin/env python3
"""Does FreeMotion actually open with no network? (queue 112)

    python3 tests/_swoffline.py          # needs an HTTP/1.1 server on 8791 — see below

WHY THIS IS NOT PART OF tests/_cdp.py: service workers cannot be exercised in the in-app browser at
all — a one-line control worker fails there with the same "unknown error occurred when fetching the
script" as the real one — so this needs its own headless Chrome. It also needs an HTTP/1.1 server;
`python -m http.server` answers HTTP/1.0. Start one with:

    python3 -c "import http.server,socketserver,os;os.chdir('.');\\
    H=type('H',(http.server.SimpleHTTPRequestHandler,),{'protocol_version':'HTTP/1.1'});\\
    S=type('S',(socketserver.ThreadingTCPServer,),{'allow_reuse_address':True});\\
    S(('127.0.0.1',8791),H).serve_forever()"
"""
# Queue 112, done properly. Two things the first attempt got wrong:
#   1. It went offline after ONE load. The worker registers on `load`, by which point every script has
#      already been fetched without it, so its cache was still EMPTY -- the second launch is the one
#      that fills it. The comment in sw.js says exactly this and the probe ignored it.
#   2. It left Chrome's own HTTP cache on, so the "offline" reload was served from there and would have
#      passed with no service worker at all. Network.setCacheDisabled is what makes the test mean
#      something: with it on, only the worker can answer.
import sys, os, time, tempfile, shutil
sys.path.insert(0, "/Users/ezrasmith/Claude/FreeMotion/tests")
import _cdp

URL = "http://127.0.0.1:8791/index.html"
dbg = _cdp.free_port(); profile = tempfile.mkdtemp(prefix="fm-swoff-")
proc = _cdp.launch(dbg, 900, 800, profile); cdp = None
def wait_for(expr, secs=40):
    end = time.time() + secs
    while time.time() < end:
        try:
            if cdp.eval(expr): return True
        except Exception: pass
        time.sleep(0.4)
    return False
def count():
    try: return cdp.eval("caches.open('freemotion-v1').then(c=>c.keys()).then(k=>k.length)", await_promise=True)
    except Exception: return "?"
try:
    cdp = _cdp.CDP(_cdp.ws_url(dbg))
    for m in ("Page.enable", "Runtime.enable", "Network.enable"): cdp.send(m)

    cdp.send("Page.navigate", url=URL)
    wait_for("!!(window.FM && FM.scene)")
    wait_for("!!navigator.serviceWorker.controller", 25)
    print("load 1: booted, worker controlling. cache =", count())

    cdp.send("Page.navigate", url=URL)          # now controlled from the very first byte
    wait_for("!!(window.FM && FM.scene)")
    time.sleep(3)
    n = count()
    print("load 2: cache =", n)

    cdp.send("Network.setCacheDisabled", cacheDisabled=True)   # only the worker can answer now
    cdp.send("Network.emulateNetworkConditions", offline=True, latency=0,
             downloadThroughput=0, uploadThroughput=0)
    print("\n--- HTTP cache disabled, network cut ---")
    cdp.send("Page.navigate", url=URL)
    ok = wait_for("!!(window.FM && FM.scene && FM.timeline && FM.compositor !== undefined || (window.FM && FM.scene && FM.timeline))", 40)
    print("OFFLINE, no HTTP cache -> FM booted:", ok)
    if ok:
        print("   version label:", cdp.eval("(document.querySelector('.ver')||{}).textContent"))
        print("   modules present:", cdp.eval(
            "['scene','timeline','storage','settings','addMenu'].filter(k=>window.FM&&FM[k]).join(', ')"))
    else:
        print("   body:", (cdp.eval("document.body ? document.body.innerText.slice(0,200) : '(none)'") or ""))
finally:
    if cdp: cdp.close()
    proc.terminate()
    try: proc.wait(timeout=10)
    except Exception: proc.kill()
    shutil.rmtree(profile, ignore_errors=True)
