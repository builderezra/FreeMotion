#!/usr/bin/env python3
"""Screenshot a fixture in REAL TIME, for anything _shot.sh cannot photograph.

    python3 tests/_shotlive.py /tests/_yourfixture.html out.png [width] [height]

WHY THIS EXISTS (20 Aug 2026, found while chasing queue 428). `tests/_shot.sh` passes
`--virtual-time-budget`, which lets the home intro finish before the frame is taken — and that is
exactly why it is the wrong tool for a lot of screens: under virtual time the clock does not advance
normally, so **a CSS transition never completes**. The phone Add sheet is `transform: translateY(100%)`
with a transition, so `_shot.sh` photographs it still parked BELOW THE SCREEN, every time, however long
you wait. An hour went into "the tabs are broken" before it turned out the sheet had simply never opened
in the shot.

So: `_shot.sh` for static screens (it is faster and gives you dpr 2 for free), and THIS for anything
that slides, fades, flings, or is otherwise waiting on a real clock. It drives the same CDP path the
suite uses (`tests/_cdp.py`), with `Emulation.setDeviceMetricsOverride` for a 2x device pixel ratio, and
waits for the fixture to set `document.title` to 'ready' (or 'ERR …'), the same handshake every fixture
here already uses.

There is a companion pattern for measurements rather than pictures: launch the same way and read a
value out of the page with `cdp.eval(...)` — see the probes referenced from REQUESTS.md 387 and 428.
"""
import sys, time, tempfile, base64, os

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__))))
import _cdp as C


def shoot(path, out, w=400, h=840, wait=120):
    port = C.free_port()
    prof = tempfile.mkdtemp()
    proc = C.launch(port, w, h, prof)
    try:
        cdp = C.CDP(C.ws_url(port))
        cdp.send("Page.enable")
        # dpr 2 so type and gradients are judgeable, matching _shot.sh's --force-device-scale-factor=2
        cdp.send("Emulation.setDeviceMetricsOverride", width=w, height=h, deviceScaleFactor=2, mobile=False)
        cdp.send("Page.navigate", url="http://localhost:8777" + path)
        deadline = time.time() + wait
        title = ""
        while time.time() < deadline:
            title = cdp.eval("document.title") or ""
            if "ready" in title or "ERR" in title:
                break
            time.sleep(0.5)
        shot = cdp.send("Page.captureScreenshot", format="png")
        with open(out, "wb") as fh:
            fh.write(base64.b64decode(shot["data"]))
        cdp.close()
        return title
    finally:
        proc.terminate()


if __name__ == "__main__":
    if len(sys.argv) < 3:
        print(__doc__)
        sys.exit(2)
    p, o = sys.argv[1], sys.argv[2]
    W = int(sys.argv[3]) if len(sys.argv) > 3 else 400
    H = int(sys.argv[4]) if len(sys.argv) > 4 else 840
    print("wrote %s   (fixture title: %s)" % (o, shoot(p, o, W, H)))
