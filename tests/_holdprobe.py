#!/usr/bin/env python3
"""What does THIS machine's Chrome make of a finger held still, or moved, for N ms? (7 Oct, #1097 — the keyframe-diamond holds.)

    python3 tests/_holdprobe.py            # one Chrome, a blank test page, ~20 s; runs on the Mac and on Linux alike

The cloud helper (H17) found the easing menu opening at the pointerup of a 650 ms emulated hold and hidden 7 ms later, when a
compat mousedown/mouseup/click landed on the diamond after the touchend — Chrome had read the hold as a TAP. A phone never
does that after a held finger (a long press) or one that moved past the touch slop (a drag). Two tables:

  RAW     what this Chrome sends, unaided, for holds of several lengths and for moves of several sizes.
  GUARDED the same with tests/_cdp.py's COMPAT_GUARD and tests/_platform.py phone_cancels_tap() — what a one-finger-test page
          gets on Linux (FM_TOUCH_PAGE=1). A quick still tap must still CLICK (the positive control); a long hold and a drag
          must not.

Run it on both machines and compare the RAW tables.
"""
import json, os, shutil, sys, tempfile, time
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
sys.dont_write_bytecode = True
import _cdp, _platform  # noqa: E402

PAGE = ("data:text/html,<!doctype html><title>hold</title><body style='margin:0'><div id=t tabindex=0 "
        "style='width:300px;height:300px;background:%23ccc'>hold</div><script>window.E=[];var t0=0;"
        "['touchstart','touchend','pointerdown','pointerup','pointercancel','mousedown','mouseup','click','contextmenu'].forEach("
        "function(n){document.addEventListener(n,function(e){if(n==='touchstart')t0=performance.now();"
        "E.push(n+(e.pointerType?'('+e.pointerType+')':'')+'@'+Math.round(performance.now()-t0))},true)});</script>")

CASES = [("tap, still", 100, 0), ("hold, still", 400, 0), ("hold, still", 650, 0), ("hold, still", 1200, 0),
         ("tap, 4 px wobble", 120, 4), ("drag, 30 px", 300, 30), ("hold then drag 30 px", 700, 30)]


def run(c, guarded):
    print("\n%s" % ("GUARDED (COMPAT_GUARD + phone_cancels_tap, as a one-finger-test page on Linux)" if guarded else "RAW (this Chrome, unaided)"))
    for label, ms, move in CASES:
        c.eval("window.E=[]")
        t0 = time.time()
        c.send("Input.dispatchTouchEvent", type="touchStart", touchPoints=[{"x": 100, "y": 100, "id": 1}])
        steps = 6 if move else 0
        for k in range(steps):
            time.sleep(ms / 1000.0 / (steps + 1))
            c.send("Input.dispatchTouchEvent", type="touchMove", touchPoints=[{"x": 100 + move * (k + 1) / steps, "y": 100, "id": 1}])
        time.sleep(max(0, ms / 1000.0 - (time.time() - t0)))
        if guarded and hasattr(_platform, "phone_cancels_tap") and _platform.phone_cancels_tap(time.time() - t0, float(move)):
            c.eval("window.__fmSwallowCompat={until:Date.now()+300,mousedown:1,mouseup:1,click:1,n:0}")
        c.send("Input.dispatchTouchEvent", type="touchEnd", touchPoints=[])
        time.sleep(0.5)
        ev = [e for e in c.eval("E.join(' ')").split() if not e.startswith("pointerdown")]   # its time is the previous round's
        click = any(e.startswith("click") for e in ev)
        print("  %-22s %5d ms  %-5s %-11s %s" % (label, ms, "CLICK" if click else "-",
                                                "contextmenu" if any(e.startswith("contextmenu") for e in ev) else "-", " ".join(ev)))


def main():
    for guarded in (False, True):
        port = _cdp.free_port()
        prof = tempfile.mkdtemp(prefix="fm-holdprobe-")
        proc = _cdp.launch(port, 900, 700, prof)
        c = _cdp.CDP(_cdp.ws_url(port, proc=proc))
        try:
            if not guarded:
                print("browser:", c.send("Browser.getVersion").get("product"), "| os:", sys.platform)
            c.send("Page.enable"); c.send("Runtime.enable")
            if guarded:
                if not hasattr(_cdp, "COMPAT_GUARD"):
                    print("\nGUARDED: tests/_cdp.py has no COMPAT_GUARD here — skipped"); continue
                c.send("Page.addScriptToEvaluateOnNewDocument", source=_cdp.COMPAT_GUARD)
            c.send("Page.navigate", url=PAGE)
            for _ in range(100):
                try:
                    if c.eval("document.title") == "hold":
                        break
                except Exception:
                    pass
                time.sleep(0.05)
            c.send("Emulation.setTouchEmulationEnabled", enabled=True, maxTouchPoints=5)
            time.sleep(0.2)
            if not guarded:
                print("media under emulation:", c.eval("JSON.stringify({coarse:matchMedia('(pointer: coarse)').matches,"
                                                        "hoverNone:matchMedia('(hover: none)').matches,mtp:navigator.maxTouchPoints})"))
            run(c, guarded)
        finally:
            c.close(); proc.terminate()
            try:
                proc.wait(timeout=10)
            except Exception:
                proc.kill()
            shutil.rmtree(prof, ignore_errors=True)


if __name__ == "__main__":
    main()
