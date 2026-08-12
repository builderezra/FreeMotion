#!/usr/bin/env python3
"""Run one of the dev-only probe pages (tests/_*.html) and print what it measured.

_cdp.py drives the full regression SUITE: it polls #sum and exits non-zero on a red run. The probe
pages are a different shape — each one renders frames, measures pixels, writes a report into #out
and sets window.__done. This runner exists so a probe can be read from the terminal in one call
instead of four browser round-trips, which matters because probes get run twice: once against the
fix and once against the pre-fix build, since a probe that cannot see the defect proves nothing.

    python3 tests/_probe.py tests/_mirrorstack.html [--port 8777] [--timeout 120]

Exit status is 0 if the page finished, 2 if it never set __done (a thrown exception, usually) — in
which case the last console error is printed, because that is always the actual answer.
"""
import argparse
import json
import os
import shutil
import sys
import tempfile
import time

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from _cdp import CDP, free_port, launch, ws_url          # noqa: E402  (same Chrome plumbing)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("page", help="path under the repo root, e.g. tests/_mirrorstack.html")
    ap.add_argument("--port", type=int, default=8777, help="dev server port")
    ap.add_argument("--timeout", type=int, default=120)
    ap.add_argument("--width", type=int, default=1280)
    ap.add_argument("--height", type=int, default=900)
    a = ap.parse_args()

    url = "http://localhost:%d/%s" % (a.port, a.page.lstrip("/"))
    dbg = free_port()
    profile = tempfile.mkdtemp(prefix="fm-probe-")
    proc = launch(dbg, a.width, a.height, profile)
    cdp = None
    try:
        cdp = CDP(ws_url(dbg))
        cdp.send("Page.enable")
        cdp.send("Runtime.enable")
        cdp.send("Page.navigate", url=url)

        deadline = time.time() + a.timeout
        out = None
        while time.time() < deadline:
            try:
                out = cdp.eval("(function(){ if(!window.__done) return null;"
                               "var o=document.getElementById('out');"
                               "return o ? o.textContent : '(no #out element)'; })()")
            except Exception:
                out = None                 # navigation can tear the context down mid-poll
            if out:
                break
            time.sleep(0.5)

        if not out:
            # A probe that never finishes threw. Say what, rather than "timed out" — the exception
            # text is the finding, and hunting it by hand in a browser is a wasted round-trip.
            err = ""
            try:
                err = cdp.eval("(function(){ var o=document.getElementById('out');"
                               "return o ? o.textContent.slice(0, 400) : ''; })()") or ""
            except Exception:
                pass
            print(json.dumps({"ok": False, "error": "probe did not finish within %ds" % a.timeout,
                              "pageText": err}))
            return 2

        print(out)
        return 0
    finally:
        if cdp:
            cdp.close()
        proc.terminate()
        try:
            proc.wait(timeout=10)
        except Exception:
            proc.kill()
        shutil.rmtree(profile, ignore_errors=True)


if __name__ == "__main__":
    sys.exit(main())
