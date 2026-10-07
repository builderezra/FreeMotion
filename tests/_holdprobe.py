#!/usr/bin/env python3
"""What does THIS machine's Chrome make of a finger held still for N ms? (7 Oct, #1097 — the 4 keyframe-diamond-hold reds.)

    python3 tests/_holdprobe.py            # one Chrome, a blank test page, ~15 s; runs on the Mac and on Linux alike

The cloud helper (H17) found the easing menu opening at the pointerup of a 650 ms emulated hold and then hidden 7 ms later,
when a compat mousedown/mouseup/click landed on the diamond after the touchend — as if Chrome had read the hold as a TAP. A
phone reads 650 ms as a long press (no click). This prints, for holds of several lengths with real touch emulation, which
events the page got and when (ms after touchstart): if a long press here needs longer than a phone's, the 650 ms holds are
taps on this machine and the reds are the harness, not the app. Run it on both machines and compare the tables.
"""
import json, os, shutil, sys, tempfile, time
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
sys.dont_write_bytecode = True
import _cdp  # noqa: E402

PAGE = ("data:text/html,<!doctype html><title>hold</title><body style='margin:0'><div id=t tabindex=0 "
        "style='width:300px;height:300px;background:%23ccc'>hold</div><script>window.E=[];var t0=0;"
        "['touchstart','touchend','pointerdown','pointerup','pointercancel','mousedown','mouseup','click','contextmenu'].forEach("
        "function(n){document.addEventListener(n,function(e){if(n==='touchstart')t0=performance.now();"
        "E.push(n+(e.pointerType?'('+e.pointerType+')':'')+'@'+Math.round(performance.now()-t0))},true)});</script>")


def main():
    port = _cdp.free_port()
    prof = tempfile.mkdtemp(prefix="fm-holdprobe-")
    proc = _cdp.launch(port, 900, 700, prof)
    c = _cdp.CDP(_cdp.ws_url(port, proc=proc))
    try:
        v = c.send("Browser.getVersion")
        print("browser:", v.get("product"), "| os:", sys.platform)
        c.send("Page.enable"); c.send("Runtime.enable")
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
        print("media under emulation:", c.eval("JSON.stringify({coarse:matchMedia('(pointer: coarse)').matches,"
                                                "hoverNone:matchMedia('(hover: none)').matches,mtp:navigator.maxTouchPoints})"))
        for hold in (150, 400, 500, 650, 800, 1000, 1200, 1600):
            c.eval("window.E=[]")
            c.send("Input.dispatchTouchEvent", type="touchStart", touchPoints=[{"x": 100, "y": 100, "id": 1}])
            time.sleep(hold / 1000.0)
            c.send("Input.dispatchTouchEvent", type="touchEnd", touchPoints=[])
            time.sleep(0.5)
            ev = c.eval("E.join(' ')")
            tap = any(e.startswith("click") for e in ev.split())
            lp = any(e.startswith("contextmenu") for e in ev.split())
            print("hold %5d ms: %-5s %-12s %s" % (hold, "CLICK" if tap else "-", "contextmenu" if lp else "-", ev))
    finally:
        c.close(); proc.terminate()
        try:
            proc.wait(timeout=10)
        except Exception:
            proc.kill()
        shutil.rmtree(prof, ignore_errors=True)


if __name__ == "__main__":
    main()
