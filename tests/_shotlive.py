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
        _stop(proc)


def _stop(proc):
    """Kill the browser and WAIT for it. `terminate()` alone leaked processes all night on 20 Aug —
    24 of them were found still running, because SIGTERM to the parent does not always take the helpers
    with it and nothing waited to find out. Terminate, wait, then kill."""
    try:
        proc.terminate()
        proc.wait(timeout=5)
    except Exception:
        try:
            proc.kill()
            proc.wait(timeout=5)
        except Exception:
            pass


def read(path, wait=180, throttle=0, w=400, h=840):
    """Run a fixture in REAL TIME and return whatever it wrote into `#out` — the measurement half.

    Most probes in tests/ report NUMBERS, not pictures: they build a scene, measure something, write the
    result into a `<pre id="out">` and set `document.title = 'ready'`. Eight were written that way on
    20 Aug alone (playback cost, the video play/scrub comparison, add-menu tabs, the + under scroll, the
    pill's colour across a play, audio codec support, the playhead across project opens). Every one of
    them needed this launcher, and it lived in a scratchpad that does not survive the session — so the
    next person rebuilds it before they can run any of them.

    `throttle` maps to `Emulation.setCPUThrottlingRate`: pass 4-6 to approximate a phone. That is the
    ONLY honest way to get phone-ish timings out of this harness, and it is why `_shot.sh` cannot be used
    for them — see the note at the top of this file about virtual time.
    """
    port = C.free_port()
    prof = tempfile.mkdtemp()
    proc = C.launch(port, w, h, prof)
    try:
        cdp = C.CDP(C.ws_url(port))
        cdp.send("Page.enable")
        if throttle and throttle > 1:
            cdp.send("Emulation.setCPUThrottlingRate", rate=throttle)
        cdp.send("Page.navigate", url="http://localhost:8777" + path)
        deadline = time.time() + wait
        while time.time() < deadline:
            t = cdp.eval("document.title") or ""
            if "ready" in t or "ERR" in t:
                break
            time.sleep(0.5)
        out = cdp.eval("(document.getElementById('out')||{}).textContent") or ""
        title = cdp.eval("document.title") or ""
        cdp.close()
        return out if out.strip() else "(no #out content; title: %s)" % title
    finally:
        _stop(proc)


if __name__ == "__main__":
    if len(sys.argv) < 3:
        print(__doc__)
        sys.exit(2)
    # `--read [throttle]` runs a measuring probe and prints its #out; otherwise it screenshots.
    if sys.argv[2] == "--read":
        thr = float(sys.argv[3]) if len(sys.argv) > 3 else 0
        print(read(sys.argv[1], throttle=thr))
    else:
        p, o = sys.argv[1], sys.argv[2]
        W = int(sys.argv[3]) if len(sys.argv) > 3 else 400
        H = int(sys.argv[4]) if len(sys.argv) > 4 else 840
        print("wrote %s   (fixture title: %s)" % (o, shoot(p, o, W, H)))
