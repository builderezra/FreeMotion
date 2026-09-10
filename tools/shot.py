#!/usr/bin/env python3
"""Take a REAL screenshot of the app at a given size, and write it to a PNG.

Why this exists.  CLAUDE.md says every UI change is verified at ~380px "load, resize, screenshot,
read console" — and until now the only screenshot a session could take was one it looked at itself.
Ezra could not see it.  A picture he cannot open is not proof, and half the rules in this repo exist
because a claim went unchecked.  This writes the picture to disk so it can be sent to him.

  python3 tools/shot.py out.png --width 380 --height 820 \
      --setup 'FM.selectLayer(FM.scene.layers[0].id); FM.refreshAll();' --wait 600
  python3 tools/shot.py out.png --port 8778        # some other checkout, for a before/after pair
"""
import argparse, os, base64, sys, tempfile, time, importlib.util

_spec = importlib.util.spec_from_file_location(
    "_cdp", os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "tests", "_cdp.py"))
_cdp = importlib.util.module_from_spec(_spec); _spec.loader.exec_module(_cdp)


def shoot(out, port, width, height, setup, wait_ms, path):
    dbg = _cdp.free_port()
    prof = tempfile.mkdtemp(prefix="fm-shot-")
    proc = _cdp.launch(dbg, width, height, prof)
    try:
        c = _cdp.CDP(_cdp.ws_url(dbg))
        c.send("Page.enable")
        # the window size is the OUTER window headless, so pin the viewport itself
        c.send("Emulation.setDeviceMetricsOverride", width=width, height=height,
               deviceScaleFactor=2, mobile=True)
        c.send("Page.navigate", url=f"http://localhost:{port}{path}")
        time.sleep(4.0)
        # ⚠️ THE POINTER, NOT THE WIDTH, IS WHAT THE APP ASKS ABOUT — and a narrow headless window still
        # has a MOUSE.  `@media (hover: none) { .cat-num { display: none } }` is how queue 797 took the
        # 1-9 keycaps off the clip cards on a phone; without the two calls below the shot shows a badge on
        # every card that his phone does not show, and the picture then accuses a shipped fix of being
        # broken.  Both are issued AFTER the navigation on purpose: setEmulatedMedia sent before it is
        # dropped by the load (measured 7 Sep — matchMedia read false), and the media override only holds
        # once touch emulation is on.
        c.send("Emulation.setTouchEmulationEnabled", enabled=True, maxTouchPoints=5)
        c.send("Emulation.setEmulatedMedia", features=[{"name": "hover", "value": "none"},
                                                       {"name": "any-hover", "value": "none"},
                                                       {"name": "pointer", "value": "coarse"},
                                                       {"name": "any-pointer", "value": "coarse"}])
        if not c.eval("matchMedia('(hover: none)').matches"):
            raise RuntimeError("the shot is not a phone: (hover: none) does not match, so touch-only rules are off")
        # tolerant on purpose: this also shoots plain pages (a drawn-options sheet), where FM does not exist
        c.eval("(function(){ try { if (window.FM && FM.home && FM.home.isOpen && FM.home.isOpen()) FM.home.close(); } catch (e) {} })()")
        time.sleep(0.6)
        if setup:
            c.eval(f"(function(){{ {setup} }})()")
        time.sleep(wait_ms / 1000.0)
        png = c.send("Page.captureScreenshot", format="png")["data"]
        with open(out, "wb") as f:
            f.write(base64.b64decode(png))
        c.close()
    finally:
        proc.terminate()
    return out


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("out")
    ap.add_argument("--port", type=int, default=8777)
    ap.add_argument("--path", default="/index.html")
    ap.add_argument("--width", type=int, default=380)
    ap.add_argument("--height", type=int, default=820)
    ap.add_argument("--wait", type=int, default=800, help="ms to settle after the setup snippet")
    ap.add_argument("--setup", default="")
    a = ap.parse_args()
    print(shoot(a.out, a.port, a.width, a.height, a.setup, a.wait, a.path))
