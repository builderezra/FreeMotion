#!/usr/bin/env python3
"""Does the app still boot with the network off? (queue 430 clause 2)

✅ WORKS. Run it before and after any change to the service worker's caching — queue 430 in particular,
which deletes cache entries and can therefore remove the very feature this checks.

    python3 tests/_offlineboot.py

Measured 20 Aug on v10.68, and this is the BASELINE to compare against:
    online boot: ok
    worker controlling the page: True
    OFFLINE boot: YES — the app came up

WHY IT IS NEEDED: the offline story is the entire reason the service worker caches anything, and nothing
in tests/tests.js covers it. A cache prune with no offline check is a change that can silently remove
the feature it is tidying.

WHY IT CANNOT LIVE IN tests/tests.js: going offline is a browser-level capability, not a DOM one. The
suite runs inside the page and cannot pull its own plug. This drives CDP instead — load once so the
worker installs and fills its cache, then `Network.emulateNetworkConditions` offline, reload, and ask
whether the app came up.

HOW IT WAS FIXED, since the first version wedged: after an offline reload a `Runtime.evaluate` may never
return, and _cdp.py's client has a 600s socket timeout — so the run hung instead of failing, and left
Chrome behind (24 stray processes were found that way). Now `cdp.ws.settimeout(8)` gives every call a
short deadline, `ask()` treats a timeout as "no answer yet", and `_stop()` from _shotlive.py guarantees
the browser dies even when something wedges.

"""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import time, tempfile
import _cdp as C
try:
    from _shotlive import _stop
except Exception:
    def _stop(p):
        try: p.terminate(); p.wait(timeout=5)
        except Exception:
            try: p.kill()
            except Exception: pass

URL = "http://localhost:8777/index.html"


def ask(cdp, expr, default=None):
    """One eval with a SHORT socket timeout. After an offline reload the reply may never come, and the
    default 600s timeout turns that into a wedged run instead of a failed one."""
    try:
        return cdp.eval(expr)
    except Exception:
        return default


def run():
    port = C.free_port(); prof = tempfile.mkdtemp()
    proc = C.launch(port, 420, 860, prof)
    out = []
    try:
        cdp = C.CDP(C.ws_url(port))
        cdp.ws.settimeout(8)                      # <- the fix: per-call, not 600s
        cdp.send("Page.enable"); cdp.send("Network.enable")
        cdp.send("Page.navigate", url=URL)
        t0 = time.time(); ready = False
        while time.time() - t0 < 45:
            if ask(cdp, "!!(window.FM && FM.scene)"): ready = True; break
            time.sleep(0.5)
        out.append("online boot: " + ("ok" if ready else "FAILED"))
        if not ready: return out
        t0 = time.time()
        while time.time() - t0 < 15:
            if ask(cdp, "!!(navigator.serviceWorker && navigator.serviceWorker.controller)"): break
            time.sleep(0.5)
        out.append("worker controlling the page: %s" % ask(cdp, "!!(navigator.serviceWorker && navigator.serviceWorker.controller)"))
        time.sleep(2.5)                            # let the asset fetches land in the cache
        cdp.send("Network.emulateNetworkConditions", offline=True, latency=0,
                 downloadThroughput=-1, uploadThroughput=-1)
        try: cdp.send("Page.reload", ignoreCache=False)
        except Exception: pass
        t0 = time.time(); booted = False
        while time.time() - t0 < 30:
            if ask(cdp, "!!(window.FM && FM.scene)"): booted = True; break
            time.sleep(0.5)
        ver = (ask(cdp, "(document.querySelector('.brand .ver')||{}).textContent", "") or "").strip()
        out.append("OFFLINE boot: " + ("YES — the app came up (version chip %r)" % ver if booted else "NO — it did not come up"))
        try: cdp.close()
        except Exception: pass
        return out
    finally:
        _stop(proc)


if __name__ == "__main__":
    for line in run(): print(line)
