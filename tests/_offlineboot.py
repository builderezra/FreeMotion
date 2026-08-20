#!/usr/bin/env python3
"""Does the app still boot with the network off? (queue 430 clause 2)

⚠️ UNFINISHED — IT HANGS. Kept rather than deleted, because the CHECK is needed and the approach is
right; only the plumbing is wrong.

WHY IT IS NEEDED: the offline story is the entire reason the service worker caches anything, and nothing
in the suite covers it. Queue 430 wants to start DELETING cache entries, and a prune with no offline
check is a change that can silently remove the feature it is tidying. That check has to exist first.

WHY IT CANNOT LIVE IN tests/tests.js: going offline is a browser-level capability, not a DOM one. The
suite runs inside the page and cannot pull its own plug. This drives CDP instead — load once so the
worker installs and fills its cache, then `Network.emulateNetworkConditions` with offline:true, reload,
and ask whether the app came up.

WHAT GOES WRONG: after `Page.reload` with the network off, a `Runtime.evaluate` never returns. The CDP
client in tests/_cdp.py has a 600s socket timeout and blocks on a reply that never comes, so the run
wedges instead of failing — and it leaves Chrome behind (24 stray processes were found on 20 Aug, which
is what led to the `_stop()` helper in _shotlive.py).

WHAT TO DO INSTEAD, for whoever finishes it:
  · give the CDP client a SHORT per-call timeout, or
  · drive the reload off `Page.loadEventFired` rather than polling `Runtime.evaluate`, and
  · reuse `_shotlive._stop(proc)` so a wedged run still cleans up after itself.
Do NOT simply raise the outer timeout — that hides the wedge instead of removing it.
"""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

if __name__ == "__main__":
    print(__doc__)
    print("Not run: this probe is known to hang. See the notes above before using it.")
