#!/usr/bin/env python3
"""Does the app still boot with the network off? (queue 430 clause 2)

    python3 tests/_offlineboot.py

The offline story is the whole reason the service worker caches anything, and NOTHING in the suite
covers it — which matters now, because queue 430 wants to start deleting cache entries. A prune with no
offline check is a change that can silently remove the feature it is tidying.

The suite cannot do this from inside the page: going offline is a browser-level capability, not a DOM
one. So this drives CDP directly — load once so the worker installs and caches, then
`Network.emulateNetworkConditions` with offline:true, reload, and ask whether the app came up.
"""
import sys, time, tempfile, os

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import _cdp as C

URL = "http://localhost:8777/index.html"


def boot_offline():
    port = C.free_port()
    prof = tempfile.mkdtemp()
    proc = C.launch(port, 420, 860, prof)
    out = []
    try:
        cdp = C.CDP(C.ws_url(port))
        cdp.send("Page.enable")
        cdp.send("Network.enable")

        # 1. online load — the worker installs and fills its cache
        cdp.send("Page.navigate", url=URL)
        deadline = time.time() + 60
        ready = False
        while time.time() < deadline:
            if cdp.eval("!!(window.FM && FM.scene)"):
                ready = True
                break
            time.sleep(0.5)
        out.append("online boot: %s" % ("ok" if ready else "FAILED — the app never came up online"))
        if not ready:
            return out
        # let the worker take control and cache the assets it was asked for
        for _ in range(20):
            if cdp.eval("!!(navigator.serviceWorker && navigator.serviceWorker.controller)"):
                break
            time.sleep(0.5)
        controlled = cdp.eval("!!(navigator.serviceWorker && navigator.serviceWorker.controller)")
        out.append("service worker controlling the page: %s" % controlled)
        time.sleep(2.0)   # give the asset fetches time to land in the cache

        # 2. pull the plug and reload
        cdp.send("Network.emulateNetworkConditions", offline=True, latency=0,
                 downloadThroughput=-1, uploadThroughput=-1)
        cdp.send("Page.reload", ignoreCache=False)
        deadline = time.time() + 45
        booted = False
        while time.time() < deadline:
            if cdp.eval("!!(window.FM && FM.scene)"):
                booted = True
                break
            time.sleep(0.5)
        title = cdp.eval("document.title") or ""
        ver = cdp.eval("(document.querySelector('.brand .ver')||{}).textContent") or "?"
        out.append("OFFLINE boot: %s   (title %r, version chip %r)" % ("✅ the app came up" if booted else "❌ FAILED", title, ver.strip()))
        cdp.close()
        return out
    finally:
        proc.terminate()


if __name__ == "__main__":
    for line in boot_offline():
        print(line)
