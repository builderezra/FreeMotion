#!/usr/bin/env python3
"""The driver's own browser-level checks — the parts of tests/_cdp.py that only a real Chrome can answer (6 Oct, the PM's
port review). One Chrome, a few seconds, no server (the page is a data: URL), nothing of the app loaded.

    python3 tests/_drivercheck.py          # exit 0 = every check passed; 1 = one failed; 2 = could not run (no Chrome…)

1. THE MOUSE GATE CANNOT BE FOOLED BY THE PAGE. The page replaces window.matchMedia so the mouse query answers false in the
   page's own world (the CONTROL: that stub must really work there), and the driver's _mouse_state must still read the
   browser's real answer (true) from its isolated world. The old gate asked the page's world, and read false.
2. THE BROWSER IS NAMED. Browser.getVersion answers a product, which every result now carries.
Extra arguments (--url, --width…) are accepted and ignored, so the slice launcher can run it like the driver.
"""
import json, os, shutil, sys, tempfile, time

_HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, _HERE)
sys.dont_write_bytecode = True
import _cdp        # noqa: E402
import _platform   # noqa: E402

PAGE = ("data:text/html,<!doctype html><title>stub</title><script>"
        "window.matchMedia = function () { return { matches: false, addListener: function () {}, "
        "addEventListener: function () {} }; };</script><body>a page that says it has no mouse</body>")


def main():
    try:
        _platform.chrome_path()
    except _platform.ChromeNotFound as e:
        print("could not run: %s" % e)
        return 2
    port = _cdp.free_port()
    # NOT an fm-cdp- profile (6 Oct, measured): this process is not a tests/_cdp.py, so another run's reaper — which stands
    # down only for a live _cdp.py — read this Chrome as an orphan and SIGKILLed it at launch ("Chrome exited (code -9)")
    profile = tempfile.mkdtemp(prefix="fm-drvchk-")
    proc = None
    cdp = None
    bad = []
    try:
        proc = _cdp.launch(port, 800, 600, profile)
        cdp = _cdp.CDP(_cdp.ws_url(port, proc=proc))
        product = str(cdp.send("Browser.getVersion").get("product") or "")
        print(("  ✅ the browser names itself: %s" % product) if product else "  ❌ Browser.getVersion gave no product")
        if not product:
            bad.append("product")
        cdp.send("Page.enable")
        cdp.send("Runtime.enable")
        cdp.send("Page.navigate", url=PAGE)
        for _ in range(50):
            try:
                if cdp.eval("document.title") == "stub":
                    break
            except Exception:
                pass
            time.sleep(0.1)
        main_world = cdp.eval("matchMedia(%s).matches" % json.dumps(_platform.MOUSE_QUERY))
        if main_world is False:
            print("  ✅ control: in the page's own world the stub answers 'no mouse'")
        else:
            print("  ❌ control: the stub did not take (%r) — this check proves nothing" % main_world)
            bad.append("control")
        got = _cdp._mouse_state(cdp)
        if got is True:
            print("  ✅ the driver's mouse gate reads the browser's real answer (a mouse) — the page's stub cannot answer for it")
        else:
            print("  ❌ the driver's mouse gate read %r: a page script answered for the browser" % got)
            bad.append("isolated")
        ok = _cdp._confirm_mouse(cdp, 1.0) if hasattr(_cdp, "_confirm_mouse") else None
        if ok is True:
            print("  ✅ _confirm_mouse sees it too (it is what a real-input batch waits on before answering)")
        else:
            print("  ❌ _confirm_mouse: %r" % ok)
            bad.append("confirm")
    except Exception as e:
        print("could not run: %s: %s" % (type(e).__name__, e))
        return 2
    finally:
        if cdp:
            cdp.close()
        if proc:
            proc.terminate()
            try:
                proc.wait(timeout=10)
            except Exception:
                proc.kill()
        shutil.rmtree(profile, ignore_errors=True)
    print("✅ driver: every check passed" if not bad else "❌ driver: %d check(s) FAILED" % len(bad))
    return 1 if bad else 0


if __name__ == "__main__":
    sys.exit(main())
