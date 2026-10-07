#!/usr/bin/env python3
"""FreeMotion — headless test driver.

Why this file is in the repo and not in /tmp: the previous copy lived in the system temp
directory and a laptop reboot deleted it mid-session, taking the only way to run the suite
with it. Dev tooling that the work is GATED on belongs next to the work.

What it does: launches Chrome headless with the DevTools protocol on, points it at
tests/run.html, waits for the runner to publish its result, and prints it as JSON.

Headless matters for more than speed. A dozen tests in the suite await requestAnimationFrame
(the project-open push, the add-panel measuring pass, the easing editor's layout). A browser
tab that is not visible has rAF throttled or stopped outright, so those tests do not run
slowly — they hang forever. A headless window always paints.

Usage:
    python3 tests/_cdp.py                     # assumes a server on :8777
    python3 tests/_cdp.py --port 8777         # …or say which
    python3 tests/_cdp.py --url http://localhost:8777/tests/run.html
    python3 tests/_cdp.py --width 380         # phone width; some tests want <=700px
    FM_CHROME=/path/to/chrome python3 tests/_cdp.py   # a Chrome other than the Mac app / google-chrome on PATH

Exit code is 0 only when regression is all-green, so it can gate a commit (1 = red, 2 = the suite did NOT run — a missing
module, a Chrome that never started, a crash in this driver: anything that is not a verdict, 6 Oct).
"""

import argparse, glob, json, os, shutil, socket, subprocess, sys, tempfile, time
import urllib.request

try:
    import websocket  # websocket-client
except ImportError as _e:
    # ⚠️ A MISSING MODULE IS "DID NOT RUN", NOT A TRACEBACK (6 Oct, the PM's port review). On a fresh Ubuntu the first run died
    # here with ModuleNotFoundError and exit 1 — the code for "ran and was RED" — and ship.sh, which reads the JSON "error",
    # then said "THE SUITE DID NOT RUN" with no reason at all. The answer every reader understands, with the cure in it.
    print(json.dumps({"ok": False, "error": "the Python module websocket-client is not installed (%s) — Linux: sudo apt install "
                      "python3-websocket; Mac: pip3 install websocket-client. The suite did NOT run to a verdict." % _e,
                      "lastTest": ""}))
    sys.exit(2)

# WHAT DIFFERS BETWEEN THE MAC'S CHROME AND THIS MACHINE'S lives in tests/_platform.py (6 Oct, the WSL port): which Chrome,
# its GL flags, the flags that give Linux headless the Mac's mouse and overlay scrollbars, the reap pattern, and how real
# touch is sent. Found from THIS file's folder, so every tool that loads _cdp gets it however it loaded it — and no .pyc
# for it: nothing ignores __pycache__ on Linux, and tick.sh reads the litter as unshipped work.
_HERE = os.path.dirname(os.path.abspath(__file__))
if _HERE not in sys.path:
    sys.path.insert(0, _HERE)
sys.dont_write_bytecode = True
import _platform  # noqa: E402

# The Chrome binary ($FM_CHROME, else the Mac app, else google-chrome… on PATH). Still a module attribute because probes
# compare against it; None when there is none, and launch() then refuses, naming everything it tried.
CHROME = _platform.find_chrome()


def free_port():
    s = socket.socket()
    s.bind(("127.0.0.1", 0))
    p = s.getsockname()[1]
    s.close()
    return p


def launch(port, width, height, profile):
    chrome = CHROME or _platform.chrome_path()   # chrome_path() raises ChromeNotFound with the whole story
    args = [
        chrome,
        "--headless=new",
        f"--remote-debugging-port={port}",
        f"--user-data-dir={profile}",
        f"--window-size={width},{height}",
        "--no-first-run",
        "--no-default-browser-check",
        # Chrome ≥111 rejects the DevTools websocket unless the connecting Origin is allow-listed,
        # and websocket-client always sends one. Local debug port on a local profile — nothing to
        # protect against here, and without it every connection 403s.
        "--remote-allow-origins=*",
        "--disable-background-timer-throttling",
        "--disable-backgrounding-occluded-windows",
        "--disable-renderer-backgrounding",
        # the suite renders to canvas constantly; software GL is the reliable one headless.
        # ⚠️ AND IT SILENTLY INVALIDATES ANY GPU MEASUREMENT TAKEN HERE (28 Aug). A WebGL probe for the
        # oldest queue item reported "6.4x" and "the read-back costs 30 ms" — both were SwiftShader,
        # a CPU renderer, so neither number said anything about the device Ezra actually uses.
        # `FM_GL=angle tools/probe.sh …` opts a single probe out onto the real GPU. The DEFAULT stays
        # swiftshader, because the suite's stability is worth more than one probe's convenience, and a
        # flag that changed it for everyone would trade a known-good 1030-test run for a measurement.
        # The flags themselves are tests/_platform.py gl_flags(): unchanged on the Mac; on Linux the state those flags only
        # reach there after crash-looping the GPU process (software canvas and raster, WebGL on SwiftShader), asked for directly.
        *_platform.gl_flags(),
        "--autoplay-policy=no-user-gesture-required",
        # NO SOUND OUT OF HIS SPEAKERS (5 Oct, #1070). His words: "when u do testing you play audio noises but for some reason i
        # hear them out of my speakers which means i have to constantly have my pc muted". A headless Chrome still plays to the
        # Mac's real output. This mutes only the OUTPUT: the audio graph, analysers, decoding, media clocks, recording a
        # MediaStream and the export mix all run exactly as before (nothing in the app uses speechSynthesis, which would
        # bypass it). If a test ever needs to HEAR the output, that test is wrong — it would depend on his volume knob.
        # …AND ON LINUX (6 Oct, the WSL port): on the Mac the suite's sound went to the Mac's speakers; under WSL it
        # goes through WSLg's PulseAudio to the Windows speakers. Measured with it on: the AudioContext still runs, at 44100,
        # so no test sees a difference.
        "--mute-audio",
        # NO LOGIN-KEYCHAIN READ PER LAUNCH (7 Oct). On macOS a fresh --user-data-dir asks the login keychain for "Chrome Safe Storage"
        # through secd, and secd was the busiest process on this Mac every time it nearly fell over (17:36, 23:07, the v17.24 pass).
        # MEASURED, AND INCONCLUSIVE: secd ran 31-84% with this flag and 34-84% without, against 63-98% with no test Chrome at all —
        # other apps drive most of it. Kept because it removes one keychain read per launch and changes nothing a test sees
        # (921 S0, 12/12 both ways). The PM's lead; do not credit it with fixing a stall unless a run proves it.
        "--use-mock-keychain",
        # WEBRTC PAIRS MUST NOT DEPEND ON macOS's mDNS SERVICE (5 Oct, v17.23). By default Chrome hides each host candidate
        # behind a random "<uuid>.local" name (measured), and the OTHER side of an in-page pair has to resolve it through
        # mDNSResponder. Two phone passes in a row went red on 967 7c / 967 B4 4 / 971 with "the two data channels never
        # opened (ice new/new)" — ICE never started on either side for 20 s — while every one passed alone. WHY the pairs
        # stalled is NOT proven: it was first blamed on ChatGPT's browsers, and that was wrong — the PM checked every 10 min
        # and ChatGPT ran none during those passes. What is certain is the dependency: these two flags make the candidates
        # plain addresses (127.0.0.1 included), so a pair needs nothing outside this browser. If ice new/new comes back with
        # them in, the cause is elsewhere. Nothing in the suite asserts mDNS hiding; the swap-code codec carries IPv4, IPv6
        # and mDNS alike (js/collab-signal.js); the flags merge into headless's own --disable-features list (PM, measured).
        "--disable-features=WebRtcHideLocalIpsWithMdns",
        "--allow-loopback-in-peer-connection",
        # …and on Linux, what makes headless Chrome answer like the Mac's: a mouse, 0-width scrollbars (empty on the Mac)
        *_platform.chrome_extra_flags(),
        "about:blank",
    ]
    # Chrome's stderr goes to a file IN THE PROFILE (deleted with it), so a Chrome that cannot start can say why. It went to
    # /dev/null, and the only sign of a missing library or a crashing GPU process was "the DevTools endpoint never came up"
    # 25 s later. On Linux its temp files go in the profile too (chrome_env): /tmp is RAM under WSL.
    os.makedirs(profile, exist_ok=True)
    with open(os.path.join(profile, "chrome-stderr.log"), "wb") as log:
        return subprocess.Popen(args, stdout=subprocess.DEVNULL, stderr=log, env=_platform.chrome_env(profile))


def chrome_stderr_tail(profile, n=10):
    """The last lines Chrome wrote to stderr (launch() keeps them in the profile), one line, for a 'did not start' message."""
    try:
        with open(os.path.join(profile, "chrome-stderr.log"), "rb") as f:
            lines = [l.strip() for l in f.read().decode("utf-8", "replace").splitlines() if l.strip()][-n:]
    except OSError:
        return "(no stderr was captured)"
    # ship.sh reads FAIL anywhere in this script's output as a RED suite; a Chrome that never started ran no test
    return (" | ".join(lines) or "(Chrome wrote nothing to stderr)").replace("FAIL", "fail").replace('"', "'")


def ws_url(port, timeout=25, proc=None):
    """Wait for the DevTools endpoint, then return the first page target's websocket. Given the Chrome `proc`, a Chrome
    that has already exited is reported at once instead of waited out."""
    deadline = time.time() + timeout
    while time.time() < deadline:
        if proc is not None and proc.poll() is not None:
            raise RuntimeError("Chrome exited (code %s) before its DevTools endpoint came up" % proc.returncode)
        try:
            with urllib.request.urlopen(f"http://127.0.0.1:{port}/json/list", timeout=2) as r:
                targets = json.load(r)
            for t in targets:
                if t.get("type") == "page" and t.get("webSocketDebuggerUrl"):
                    return t["webSocketDebuggerUrl"]
        except Exception:
            pass
        time.sleep(0.25)
    raise RuntimeError("Chrome's DevTools endpoint never came up")


def _dump_open(path):
    """queue 980: where --dump writes. A path ending .gz is written gzipped — a full probe record is ~10 MB of JSON, and the
    lock writes a dozen of them on a disk that ran out mid-run on 1 Oct."""
    if path.endswith(".gz"):
        import gzip
        return gzip.open(path, "wt", encoding="utf-8")
    return open(path, "w", encoding="utf-8")


class CDP:
    def __init__(self, url):
        self.ws = websocket.create_connection(url, timeout=600)
        self.n = 0
        # A CRASHED RENDERER NEVER ANSWERS (6 Oct, measured in WSL): Chrome sends no reply to a command already waiting on
        # the page, only Inspector.targetCrashed (after Inspector.enable). Seen here, so a send() stops waiting, and main()
        # ends the run as DID NOT RUN instead of sitting on a dead page until --timeout — 13 silent minutes and counting.
        self.crashed = False

    def send(self, method, **params):
        if self.crashed:
            raise RuntimeError(f"{method}: the page's renderer has crashed")
        self.n += 1
        self.ws.send(json.dumps({"id": self.n, "method": method, "params": params}))
        while True:
            msg = json.loads(self.ws.recv())
            if msg.get("id") == self.n:
                if "error" in msg:
                    raise RuntimeError(f"{method}: {msg['error']}")
                return msg.get("result", {})
            if msg.get("method") == "Inspector.targetCrashed":
                self.crashed = True
                raise RuntimeError(f"{method}: the page's renderer crashed while this was waiting")
            # everything else is an event we did not subscribe to caring about

    def eval(self, expr, await_promise=False):
        r = self.send("Runtime.evaluate", expression=expr, returnByValue=True,
                      awaitPromise=await_promise)
        res = r.get("result", {})
        if r.get("exceptionDetails"):
            raise RuntimeError(json.dumps(r["exceptionDetails"])[:600])
        return res.get("value")

    def close(self):
        try:
            self.ws.close()
        except Exception:
            pass


# WHICH BROWSER RAN, IN EVERY RESULT (6 Oct, the PM's port review). Nothing recorded it, so a run on a different Chrome — or on
# Chromium, which differs in exactly what the app probes (H.264, AAC) — read the same as one on the Mac's. The path is known
# from launch, the product ("HeadlessChrome/154.0…") once DevTools answers; a did-not-run result carries what was known.
BROWSER = {"path": "", "product": ""}


def _browser():
    return (BROWSER["path"] + (" " + BROWSER["product"] if BROWSER["product"] else "")).strip()


def _did_not_run(error, last=""):
    """Print the runner's 'the suite did NOT run' answer (exit code 2) — never a FAIL, which ship.sh would read as red."""
    print(json.dumps({"ok": False, "error": error.replace("FAIL", "fail") + " The suite did NOT run to a verdict.",
                      "lastTest": last.replace("FAIL", "fail"), "browser": _browser()}))   # a title can carry FAIL ('967 7c … FAILED …')
    return 2


def _driver_world(cdp, fresh=False):
    """An ISOLATED WORLD in the top document (6 Oct, the PM's port review): the driver's own JavaScript globals, which no
    page script can replace — a test stubbing window.matchMedia (991 does, in the app frame) cannot answer for the browser
    here. Created once per document, re-made when the page navigated (the context id then fails)."""
    if fresh or not getattr(cdp, "world", None):
        frame = cdp.send("Page.getFrameTree")["frameTree"]["frame"]["id"]
        cdp.world = cdp.send("Page.createIsolatedWorld", frameId=frame, worldName="fm-driver")["executionContextId"]
    return cdp.world


def _mouse_state(cdp):
    """True / False for (hover: hover) and (pointer: fine), asked of the TOP document — the page's answer, which every frame
    in it shares — in the driver's ISOLATED world, so no stub in the page can answer for it (6 Oct, the PM's review: it was
    asked of run.html's own matchMedia, which page script can replace). None when the page cannot be asked right now."""
    expr = "matchMedia(%s).matches" % json.dumps(_platform.MOUSE_QUERY)
    for fresh in (False, True):
        try:
            r = cdp.send("Runtime.evaluate", expression=expr, contextId=_driver_world(cdp, fresh), returnByValue=True)
            v = r.get("result", {}).get("value")
            return v if isinstance(v, bool) else None
        except Exception:
            continue                 # the world went with a navigation: make it again, once
    return None


FONT_JS = r"""(function(){
  var f = document.getElementById('app'), w = f && f.contentWindow; if (!w || !w.document || !w.document.body) return null;
  var stack = w.getComputedStyle(w.document.body).fontFamily || '';
  var c = w.document.createElement('canvas').getContext('2d'), REF = %s;
  function width(ff) { c.font = '16px ' + ff; return c.measureText(REF).width; }
  // the first family in the stack this browser HAS: a family it lacks falls back, so it measures the same as the fallback
  var fams = stack.split(',').map(function (s) { return s.trim(); }), used = '';
  var GENERIC = /^(serif|sans-serif|monospace|cursive|fantasy|system-ui|ui-sans-serif|ui-serif|ui-monospace|math|emoji)$/i;
  for (var i = 0; i < fams.length && !used; i++) {
    var x = fams[i];
    if (GENERIC.test(x)) { used = x; break; }
    if (width(x + ', monospace') !== width('monospace') || width(x + ', serif') !== width('serif')) used = x;
  }
  return JSON.stringify({ stack: stack, resolved: used.replace(/"/g, ''), width: Math.round(width(stack) * 100) / 100 });
})()"""


def _font_parity(cdp):
    """The app's resolved font and the width of a reference string in it, compared with the Mac's (tests/_platform.py
    MAC_FONT). Reported, never judged: {"resolved", "width", "mac", "same"} — "same" None when the Mac's width is not
    recorded yet. None when it could not be measured (the app frame was gone)."""
    try:
        got = json.loads(cdp.eval(FONT_JS % json.dumps(_platform.FONT_REF)) or "null")
    except Exception:
        return None
    if not isinstance(got, dict):
        return None
    mac = _platform.MAC_FONT
    same = None
    if mac.get("width") is not None:
        same = (got.get("resolved") == mac.get("resolved")
                and abs(float(got.get("width") or 0) - float(mac["width"])) <= _platform.FONT_TOLERANCE_PX)
    got.update({"mac": mac, "same": same})
    return got


def _confirm_mouse(cdp, seconds=3.0):
    """Poll until the page reports a mouse again, up to `seconds`. True when it does. Called BEFORE a real-input batch is
    answered (6 Oct, the review): the answer used to go first and the gate re-checked at the next loop, ~1 s of four False
    answers later — so the next test could start, and report, on a page that had lost its mouse."""
    t_end = time.time() + seconds
    while True:
        if _mouse_state(cdp) is True:
            return True
        if time.time() >= t_end:
            return False
        time.sleep(0.1)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--port", type=int, default=8777, help="dev server port")
    ap.add_argument("--url", default=None)
    ap.add_argument("--width", type=int, default=1280)
    ap.add_argument("--height", type=int, default=900)
    ap.add_argument("--timeout", type=int, default=600, help="seconds to wait for the suite")
    ap.add_argument("--quiet", action="store_true", help="only print the summary line")
    ap.add_argument("--progress", default=None, help="file to rewrite every ~5 s with the running test and how long it has run")
    # WHICH TESTS RAN, BY NAME (6 Oct, RULES-AUDIT B4). The output only ever carried a count and the FAILURES, so a slice
    # run with ?only=a%0Ab could not say whether `b` matched anything at all — a title that ran nothing read exactly like
    # a title that passed. tools/mutate.sh --only needs that difference (a mutation is only SURVIVED by a test that RAN),
    # so this adds "ran": [{name, ok, pending}] to the JSON. Opt-in: a full pass's output stays the size it was.
    ap.add_argument("--names", action="store_true", help="also print the name and verdict of every test that ran")
    # PER-OS BASELINES (6 Oct, #1071): tools/record-baselines.sh runs ?pinned=1&fmrecord=1 and needs what the page captured
    # (tests.js window.__fmBaselineRecord). Written to FILE; a run that published none writes null, and the recorder refuses.
    ap.add_argument("--record-baselines", default=None, metavar="FILE", help="write the page's baseline recording here")
    # queue 980 (the "Full unchanged" lock, tools/full-unchanged.sh). Both are OPT-IN and change nothing for the suite:
    # without them this file behaves exactly as before. --dump writes the TOP page's `window.__fmDump` (JSON) to a file
    # when the page reports done; --shots answers the top page's `window.__fmWantShot = {seq, name, x, y, w, h}` with a
    # PNG of that clip written to DIR/<name>.png, and sizes the viewport to exactly --width x --height (headless Chrome
    # will not make a window narrower than 500 px, so a 380 px screenshot needs the metrics override).
    ap.add_argument("--dump", default=None, help="write the page's window.__fmDump (JSON) here when it finishes")
    ap.add_argument("--shots", default=None, help="directory: answer window.__fmWantShot requests with PNG files")
    a = ap.parse_args()

    url = a.url or f"http://localhost:{a.port}/tests/run.html"

    # ⚠️ THIS SCRIPT DOES NOT START THE SERVER — it assumes one is already up (see Usage above), and
    # for four years that assumption was only ever stated in a docstring. Point it at a port with
    # nothing on it and Chrome loads a connection-refused page, the runner never appears, and this
    # waits out the ENTIRE --timeout before reporting `"ok": false, "lastTest": ""` — which reads as
    # a hung or failing suite rather than "wrong port". On 25 Aug that cost two runs and forty
    # minutes, the second one waiting a full 1800s for a page that was never going to load.
    # One HTTP probe turns a half-hour of nothing into an instant, specific error.
    try:
        with urllib.request.urlopen(url, timeout=5) as r:
            if r.status != 200:
                raise RuntimeError(f"HTTP {r.status}")
    except Exception as e:
        print(json.dumps({"ok": False, "error": f"nothing is serving {url} ({e}) — this script does "
                                                f"not start a server, it expects one already running "
                                                f"on port {a.port}. The suite did NOT run.",
                          "lastTest": ""}))
        return 2

    # NO CHROME IS SAID AS "DID NOT RUN", IN A SECOND (6 Oct, the WSL port). The Mac path was hard-coded, and on Linux the
    # launch below died with a FileNotFoundError traceback and exit 1 — the same code as "ran and was red" — and leaked its
    # profile. Resolved before anything is created; the lookup order is tests/_platform.py's, shared with tools/_platform.sh.
    try:
        _platform.chrome_path()
    except _platform.ChromeNotFound as e:
        return _did_not_run(str(e))

    # ⚠️ REAP ANY CHROME A KILLED RUN LEFT BEHIND — the cleanup at the end of main() cannot do it, and
    # that is exactly the point. Its `finally` terminates Chrome and deletes the profile, which is
    # right for a run that ENDS; it never executes for a run that is KILLED, and this repo kills runs
    # routinely. CLAUDE.md's own timeout section says ship.sh exceeds the Bash tool's 600s cap and
    # either lands in the background or is SIGKILLed, and a mutation run that outlives its timeout goes
    # the same way. Every one of those orphans a Chrome.
    #
    # MEASURED, 1 Sep, after a night of ~17 releases and their mutation runs: SIXTEEN stale `fm-cdp-`
    # Chromes were still resident and the next suite never started at all — it reported
    # `"lastTest": ""` and timed out at 1800s, which reads exactly like a hung suite and is not one.
    # That cost a release and the time to diagnose it.
    #
    # Reaping at STARTUP is the self-healing shape — but ONLY when this is the only run in flight.
    #
    # 🚨 THE FIRST VERSION OF THIS SAID "two suite runs never overlap (ship.sh runs them in sequence)"
    # AND THAT WAS WRONG WITHIN THE HOUR. ship.sh's own two runs are sequential, yes — but ship.sh is
    # routinely BACKGROUNDED (CLAUDE.md's timeout section is about exactly that), and a suite run
    # started while one is in flight then reaps the SHIPPING run's browser and kills a release that was
    # halfway through. Measured, 1 Sep: it killed 8 processes belonging to a live ship.sh, and the
    # release had to be re-run.
    #
    # So the guard is not a timestamp heuristic — it is the direct question. If another _cdp.py is
    # alive, some run owns those processes and NONE of them are stale, so reap nothing. A leaked
    # Chrome is cheap to leave for one more run; killing a live one is not.
    #
    # ⚠️ THE PATTERN IS THE CHROME BINARY'S, NOT THE BARE PREFIX (6 Oct). This matched plain 'fm-cdp-', which also matches any
    # SHELL whose command line carries it — and what matches is SIGKILLed. ship.sh anchored its copy to the binary for that
    # reason; both now take one per-OS pattern (tests/_platform.py reap_pattern, tools/_platform.sh fm_chrome_reap_pattern).
    # Housekeeping still never stops a run — but when it cannot happen it SAYS so, on stderr.
    # ⚠️ "ANOTHER RUN IS ALIVE" MEANS A PYTHON RUNNING _cdp.py (6 Oct, the PM's port review). `pgrep -f _cdp.py` also matched
    # any shell running or waiting on one (the Bash tool's wrapper, `timeout … python3 tests/_cdp.py`, an until-loop) and a
    # ship.sh whose commit message names it — and stood down WITHOUT A WORD on exactly the runs most likely to leave orphans.
    # Anchored to the interpreter now (tests/_platform.py driver_pattern), and standing down names who it stood down for.
    try:
        _others = subprocess.run(["pgrep", "-f", _platform.driver_pattern()], capture_output=True, text=True)
        _live = [int(x) for x in _others.stdout.split() if x.strip().isdigit() and int(x) not in (os.getpid(), os.getppid())]
    except FileNotFoundError:
        print("(reaper skipped: pgrep is not installed, so a killed run's Chrome cannot be found)", file=sys.stderr)
        _live = [1]
    except Exception:
        _live = [1]                              # cannot tell → assume company, reap nothing
    try:
        if _live:
            try:
                _who = subprocess.run(["ps", "-o", "pid=,command=", "-p", ",".join(str(p) for p in _live[:5])],
                                      capture_output=True, text=True).stdout.strip().replace("\n", " | ")
            except Exception:
                _who = ", ".join(str(p) for p in _live[:5])
            print("(reaper stood down: another suite run is alive — %s)" % _who[:400], file=sys.stderr)
            raise RuntimeError("another suite run is in flight — its browser is not stale")
        _pat = _platform.reap_pattern()
        if not _pat:
            print("(reaper skipped: no Chrome reap pattern for %s)" % sys.platform, file=sys.stderr)
            raise RuntimeError("no reap pattern")
        _ps = subprocess.run(["pgrep", "-f", _pat], capture_output=True, text=True)
        _stale = [int(x) for x in _ps.stdout.split() if x.strip().isdigit() and int(x) != os.getpid()]
        for _pid in _stale:
            try:
                os.kill(_pid, 9)
            except Exception:
                pass
        if _stale:
            print("(reaped %d Chrome process(es) left behind by a killed run)" % len(_stale), file=sys.stderr)
        # …and the PROFILES those runs left: a killed run never reaches the rmtree in its finally. On Linux the temp dir is
        # tmpfs, i.e. RAM, until WSL restarts. Safe for the same reason as the kill: no other run is alive to own one.
        _left = [d for d in glob.glob(os.path.join(tempfile.gettempdir(), "fm-cdp-*")) if os.path.isdir(d)]
        for _d in _left:
            shutil.rmtree(_d, ignore_errors=True)
        if _left:
            print("(removed %d profile folder(s) left behind by earlier runs)" % len(_left), file=sys.stderr)
    except Exception:
        pass                      # housekeeping must never stop a suite run

    dbg = free_port()
    profile = tempfile.mkdtemp(prefix="fm-cdp-")
    BROWSER["path"] = CHROME or _platform.find_chrome() or ""
    try:
        proc = launch(dbg, a.width, a.height, profile)
    except Exception as e:
        shutil.rmtree(profile, ignore_errors=True)
        return _did_not_run("Chrome could not be launched (%s)." % e)
    cdp = None
    try:
        try:
            cdp = CDP(ws_url(dbg, proc=proc))
        except Exception as e:
            # a Chrome that never came up ran no test: say so with its own last words, not a traceback (exit 1 = "red")
            return _did_not_run("Chrome did not start (%s). Its stderr: %s" % (e, chrome_stderr_tail(profile)))
        try:
            BROWSER["product"] = str(cdp.send("Browser.getVersion").get("product") or "")
        except Exception:
            BROWSER["product"] = "(version not reported)"
        cdp.send("Page.enable")
        cdp.send("Runtime.enable")
        try:
            cdp.send("Inspector.enable")   # for Inspector.targetCrashed — see CDP.crashed
        except Exception:
            pass
        if a.shots:
            os.makedirs(a.shots, exist_ok=True)
            cdp.send("Emulation.setDeviceMetricsOverride", width=a.width, height=a.height, deviceScaleFactor=1, mobile=False)
        cdp.send("Page.navigate", url=url)
        # THE SUITE IS WRITTEN FOR A BROWSER WITH A MOUSE, AND THAT IS NOW CHECKED, NOT ASSUMED (6 Oct, the WSL port). The
        # Mac's headless Chrome reports (hover: hover) and (pointer: fine): test 991's PC case throws without it, the 976
        # rail tests `return` early and so PASS without testing anything, and every hover/pointer branch in the app takes
        # the finger's path. Linux headless reports no pointer at all unless tests/_platform.py's flag says otherwise, and
        # one touch-emulation OFF wipes that for the rest of the page. So it is asked at the start and again after every
        # real-input batch; a page that has lost its mouse ends the run as DID NOT RUN, because every mouse-gated test
        # after that point would pass or fail for the wrong reason. Four answers in a row (~1 s), so a switch that lands a
        # frame late is not mistaken for a lost mouse.
        mouse = {"check": True, "no": 0, "after": "at the start of the run"}

        # The runner replaces #sum's text once FMTests.run() resolves. Poll that rather than a
        # fixed sleep: the suite's wall-clock swings with the machine.
        deadline = time.time() + a.timeout
        payload = None
        last_seen = ""
        cpu = [1]
        media = [False]   # reduced motion emulated (a test asked through __fmWantMedia)
        inp = {"touch_emu": False, "touch_down": False, "mouse_down": False, "touch_base": False}   # the real-input channel's state across requests (queue 924)
        # WHERE THE TIME GOES, WHILE IT GOES (30 Sep, v17.18). A timeout used to read lastTest ONCE, at the end — and when the
        # page had stopped answering by then it printed `"lastTest": ""`, which says nothing about an hour of suite. So the
        # running test is sampled every ~5 s: the timeout names the last test the page reported and how long it sat on it,
        # and says whether the page was still answering. `--progress FILE` writes the same thing live, so a slow run can be
        # watched instead of waited out.
        track = {"name": "", "since": time.time(), "last_ok": time.time(), "n": 0, "polls": 0}
        while time.time() < deadline:
            if cdp.crashed:
                return _did_not_run("THE PAGE'S RENDERER CRASHED (last test seen: '%s'), so nothing after it ran. On Linux, "
                                    "look for 'exceed data ulimit' in dmesg: a sandboxed Chrome renderer may hold 8 GB of data "
                                    "there and none on the Mac (tests/_platform.py)." % track["name"], track["name"])
            if mouse["check"]:
                m = _mouse_state(cdp)
                if m is True:
                    mouse["check"], mouse["no"] = False, 0
                elif m is False:
                    mouse["no"] += 1
                    if mouse["no"] >= 4:
                        return _did_not_run("This browser reports NO MOUSE %s: (hover: hover) and (pointer: fine) is false, "
                                            "while the suite is written for the Mac's headless Chrome, which reports one — "
                                            "every mouse-gated test would pass or fail for the wrong reason (see "
                                            "tests/_platform.py)." % mouse["after"], track["name"])
            track["polls"] += 1
            if track["polls"] % 20 == 1:
                try:
                    cur = cdp.eval("(function(){var f=document.getElementById('app');var w=f&&f.contentWindow;"
                                   "return w?JSON.stringify([w.__fmLastTest||'', (w.__fmResultsSoFar||0)]):null;})()")
                    track["last_ok"] = time.time()
                    if cur:
                        nm = json.loads(cur)[0]
                        if nm != track["name"]:
                            track["name"], track["since"], track["n"] = nm, time.time(), track["n"] + 1
                except Exception:
                    pass
                if a.progress:
                    try:
                        with open(a.progress, "w") as pf:
                            pf.write(json.dumps({"test": track["name"], "on_it_s": round(time.time() - track["since"]),
                                                 "tests_seen": track["n"], "page_silent_s": round(time.time() - track["last_ok"]),
                                                 "elapsed_s": round(time.time() - (deadline - a.timeout))}) + "\n")
                    except Exception:
                        pass
            # A TEST MAY ASK FOR A CPU THROTTLE, AND ONLY THIS DRIVER CAN GIVE ONE (queue 921 S8). The page cannot
            # slow itself down — `Emulation.setCPUThrottlingRate` is a DevTools call — and a performance budget
            # measured on a fast Mac says nothing about a phone. So a test writes `window.__fmWantCpu =
            # {rate, until}` in the app frame, this loop applies it and answers `__fmCpuRate`, and the test
            # waits for the answer before it measures. `until` is the lock on the other door: a test that dies
            # mid-measure (a timeout, a throw before its finally) must not leave the REST of the suite running
            # four times slower, which would read as a hundred unrelated failures. Past `until` the rate goes
            # back to 1 whatever the page says. Every tool reaches the suite through here (ship, prove,
            # spotcheck, mutate), so the throttle is the same on every path.
            try:
                want = cdp.eval("(function(){var f=document.getElementById('app');"
                                "var w=f&&f.contentWindow;var q=w&&w.__fmWantCpu;"
                                "if(!q||typeof q.rate!=='number') return 1;"
                                "if(!(q.until>Date.now())) return 1;"
                                "return Math.max(1,Math.min(20,q.rate));})()")
                want = want if isinstance(want, (int, float)) else 1
                if want != cpu[0]:
                    cdp.send("Emulation.setCPUThrottlingRate", rate=want)
                    cpu[0] = want
                # …and what this driver can do for a real-input request (tests.js realInput924 reads it before sending
                # touch: a browser that cannot emulate it reports the test NOT RUN HERE instead of a finger on the mouse layout)
                cdp.eval("(function(){var f=document.getElementById('app');var w=f&&f.contentWindow;"
                         "if(w){w.__fmCpuRate=%s;w.__fmDriverCaps=%s;}})()" % (json.dumps(cpu[0]), json.dumps(
                             {"touchEmulation": bool(_platform.REAL_TOUCH_VIA_EMULATION), "why": _platform.REAL_TOUCH_WHY})))
            except Exception:
                pass
            # A TEST MAY ASK FOR REDUCED MOTION, AND ONLY THIS DRIVER CAN GIVE IT TO THE STYLESHEET (#980, 5 Oct). A test
            # that stubs window.matchMedia changes what SCRIPT sees and nothing CSS sees: the first Simple-mode cog test did
            # exactly that and passed alone while the stylesheet's own reduced-motion rule was losing the cascade to the
            # shake it was meant to stop. `Emulation.setEmulatedMedia` is a DevTools call, so a test writes
            # `window.__fmWantMedia = {reduce: true, until}` in the app frame and waits for `__fmMediaReduce === true`.
            # `until` works as it does for the CPU throttle: a test that dies mid-check cannot leave the rest of the suite
            # running with motion off, which would quietly skip every animation assertion after it.
            try:
                want_m = cdp.eval("(function(){var f=document.getElementById('app');"
                                  "var w=f&&f.contentWindow;var q=w&&w.__fmWantMedia;"
                                  "return !!(q&&q.reduce===true&&q.until>Date.now());})()")
                want_m = want_m is True
                if want_m != media[0]:
                    cdp.send("Emulation.setEmulatedMedia", features=[{"name": "prefers-reduced-motion", "value": "reduce" if want_m else ""}])
                    media[0] = want_m
                cdp.eval("(function(){var f=document.getElementById('app');var w=f&&f.contentWindow;"
                         "if(w) w.__fmMediaReduce=%s;})()" % json.dumps(media[0]))
            except Exception:
                pass
            # A TEST MAY ASK FOR REAL INPUT, AND ONLY THIS DRIVER CAN GIVE IT (queue 924). A synthetic pointer event
            # from page script is untrusted: setPointerCapture refuses it, the browser does no hit-testing of its own,
            # and touch never becomes pointer events the way a finger does. The add switch was declared live after
            # #438, #533, #570 and #865 on synthetic drags, and he reported it frozen a fifth time. So a test writes
            # `window.__fmWantInput = {seq, steps:[{t, x, y, ms}]}` (coordinates in the APP FRAME's CSS pixels),
            # this loop turns each step into Input.dispatchTouchEvent / Input.dispatchMouseEvent at the frame's
            # position on the page, sleeps `ms` after it, and answers `__fmInputDone = seq`. Touch emulation is
            # switched on only for a run of touch steps and off again after, so no other test sees a touch device.
            # ⚠️ EXCEPT ON LINUX (6 Oct): there, switching it OFF leaves the page with no mouse for good (measured — see
            # tests/_platform.py REAL_TOUCH_VIA_EMULATION). Sending the touch WITHOUT emulation was tried and the PM's review
            # struck it (a finger on the mouse layout), so a touch batch is refused there and the test says NOT RUN HERE.
            # The Mac path is unchanged.
            # The frame must be on screen for the events to reach it — the test moves it and puts it back.
            try:
                want_in = cdp.eval("(function(){var f=document.getElementById('app');var w=f&&f.contentWindow;"
                                   "var q=w&&w.__fmWantInput;if(!q||typeof q.seq!=='number'||w.__fmInputDone===q.seq) return null;"
                                   "var r=f.getBoundingClientRect();return JSON.stringify({seq:q.seq,steps:q.steps||[],ox:r.left,oy:r.top,"
                                   "name:w.__fmLastTest||''});})()")
                if want_in:
                    q = json.loads(want_in)
                    err = ''
                    # TOUCH THAT CANNOT BE EMULATED IS NOT SENT AT ALL (6 Oct, the port review's MAJOR): not one step of the
                    # batch, so no half-gesture is left behind; the answer starts "NOTRUN: " and the test says NOT RUN HERE.
                    _touch = any(str(st.get("t", "")).startswith("touch") for st in q["steps"])
                    if _touch and not _platform.REAL_TOUCH_VIA_EMULATION:
                        err = "NOTRUN: needs real touch emulation (the phone's media state during a finger) — " + _platform.REAL_TOUCH_WHY
                        q["steps"] = []
                    try:
                        for st in q["steps"]:
                            t = st.get("t", "")
                            x = float(st.get("x", 0)) + q["ox"]
                            y = float(st.get("y", 0)) + q["oy"]
                            if t.startswith("touch"):
                                if not inp["touch_emu"] and _platform.REAL_TOUCH_VIA_EMULATION:
                                    cdp.send("Emulation.setTouchEmulationEnabled", enabled=True, maxTouchPoints=5)
                                    inp["touch_emu"] = True
                                typ = {"touchStart": "touchStart", "touchMove": "touchMove", "touchEnd": "touchEnd", "touchCancel": "touchCancel"}[t]
                                pts = [] if typ in ("touchEnd", "touchCancel") else [{"x": x, "y": y, "id": 1}]
                                # queue 980 (the second review): `pts` is several fingers at once — the probe's pinch
                                if isinstance(st.get("pts"), list) and typ not in ("touchEnd", "touchCancel"):
                                    pts = [{"x": float(p.get("x", 0)) + q["ox"], "y": float(p.get("y", 0)) + q["oy"], "id": i + 1}
                                           for i, p in enumerate(st["pts"])]
                                cdp.send("Input.dispatchTouchEvent", type=typ, touchPoints=pts)
                                inp["touch_down"] = typ in ("touchStart", "touchMove")
                            elif t == "wheel":
                                # a real wheel / trackpad scroll (queue 931: the PC half of pausing the New strip).
                                # `mods` is the CDP modifier mask (1 Alt, 2 Ctrl, 4 Meta, 8 Shift): a trackpad PINCH reaches a page as
                                # a wheel with Ctrl held and a small deltaY (queue 690, hunt 6c), so a test can send exactly that.
                                cdp.send("Input.dispatchMouseEvent", type="mouseWheel", x=x, y=y, deltaX=float(st.get("dx", 0)), deltaY=float(st.get("dy", 0)),
                                         modifiers=int(st.get("mods", 0) or 0))
                            elif t == "key":
                                # A REAL KEY (queue 690, hunt 6c). A KeyboardEvent dispatched from page script is untrusted and does
                                # nothing by default: it types no character into a focused box, moves no focus and presses no focused
                                # button — so a synthetic Space can never show that the keyboard was still inside a text field. This
                                # goes through the browser's own key pipeline to whatever has focus, like his keyboard.
                                # {t:'key', key, code, vk, text?, mods?}: `text` makes it a typing key (keyDown + the character),
                                # without it a bare shortcut (rawKeyDown). Always followed by its keyUp.
                                mods = int(st.get("mods", 0) or 0)
                                kd = {"key": st.get("key", ""), "code": st.get("code", ""), "windowsVirtualKeyCode": int(st.get("vk", 0) or 0),
                                      "nativeVirtualKeyCode": int(st.get("vk", 0) or 0), "modifiers": mods}
                                txt = st.get("text")
                                if txt:
                                    cdp.send("Input.dispatchKeyEvent", type="keyDown", text=txt, unmodifiedText=txt, **kd)
                                else:
                                    cdp.send("Input.dispatchKeyEvent", type="rawKeyDown", **kd)
                                cdp.send("Input.dispatchKeyEvent", type="keyUp", **kd)
                            elif t.startswith("mouse"):
                                typ = {"mouseDown": "mousePressed", "mouseMove": "mouseMoved", "mouseUp": "mouseReleased"}[t]
                                if typ == "mouseMoved":
                                    btns = 1 if inp["mouse_down"] else 0
                                else:
                                    btns = 1 if typ == "mousePressed" else 0
                                cdp.send("Input.dispatchMouseEvent", type=typ, x=x, y=y, button="left" if typ != "mouseMoved" or inp["mouse_down"] else "none",
                                         buttons=btns, clickCount=1 if typ != "mouseMoved" else 0)
                                if typ == "mousePressed":
                                    inp["mouse_down"] = True
                                elif typ == "mouseReleased":
                                    inp["mouse_down"] = False
                            ms = float(st.get("ms", 0) or 0)
                            if ms > 0:
                                time.sleep(min(ms, 2000) / 1000.0)
                    except Exception as ex:
                        err = str(ex)[:300]
                        # a batch that died mid-gesture must not leave a finger or a button down for every later test
                        # (Chrome then refuses the next touchStart and every later real-input test fails for us)
                        try:
                            if inp["touch_down"]:
                                cdp.send("Input.dispatchTouchEvent", type="touchCancel", touchPoints=[])
                                inp["touch_down"] = False
                            if inp["mouse_down"]:
                                cdp.send("Input.dispatchMouseEvent", type="mouseReleased", x=0, y=0, button="left", buttons=0, clickCount=1)
                                inp["mouse_down"] = False
                        except Exception:
                            pass
                    finally:
                        # touch emulation stays on only while a finger is still down — a test may split one gesture across
                        # two requests (hold, act, then move and lift) — and goes off the moment none is
                        # …unless the page asked for a PHONE at setup (queue 980's probe): touch emulation is then the device
                        # itself, on before the app loaded, and switching it off would turn the phone into a narrow PC
                        if inp["touch_emu"] and not inp["touch_down"] and not inp["touch_base"]:
                            try:
                                cdp.send("Emulation.setTouchEmulationEnabled", enabled=False)
                            except Exception:
                                pass
                            inp["touch_emu"] = False
                        if not inp["touch_emu"]:
                            # the page must have its mouse back before the next test (the gate above the input channel)
                            mouse.update(check=True, no=0, after="after the real-input batch of '%s'" % (q.get("name") or track["name"]))
                    # …and the mouse is CONFIRMED before the test hears its batch is done (6 Oct, the review): otherwise the
                    # test carries on, and can finish and report, inside the second the loop's own check needs to notice.
                    if not inp["touch_emu"] and not _confirm_mouse(cdp):
                        return _did_not_run("This browser reports NO MOUSE after the real-input batch of '%s' — (hover: hover) "
                                            "and (pointer: fine) did not come back within 3 s, so the test that sent it, and "
                                            "every mouse-gated test after it, would pass or fail for the wrong reason "
                                            "(tests/_platform.py)." % (q.get("name") or track["name"]), track["name"])
                    cdp.eval("(function(){var f=document.getElementById('app');var w=f&&f.contentWindow;"
                             "if(w){w.__fmInputErr=%s;w.__fmInputDone=%s;}})()" % (json.dumps(err), json.dumps(q["seq"])))
            except Exception:
                pass
            # A TEST MAY ASK FOR A REAL GARBAGE COLLECTION AND THE BROWSER'S OWN COUNTS (queue 690, hunt f). A leak is
            # "memory that is still held AFTER the collector has run", and the page cannot run the collector itself —
            # without one, a node that is merely waiting to be collected and a node something still holds look the same.
            # So a test writes `window.__fmWantGc = {seq}`, this loop runs HeapProfiler.collectGarbage (twice, so objects
            # freed by the first pass's finalizers go too) and answers `__fmGc = {seq, nodes, listeners, heapMB}` from
            # Performance.getMetrics — the same DOM-node and listener counters DevTools shows — plus `__fmGcDone = seq`.
            # Asked only by a test, never on its own, so no other test ever pays for a collection it did not want.
            try:
                want_gc = cdp.eval("(function(){var f=document.getElementById('app');var w=f&&f.contentWindow;"
                                   "var q=w&&w.__fmWantGc;if(!q||typeof q.seq!=='number'||w.__fmGcDone===q.seq) return null;"
                                   "return q.seq;})()")
                if isinstance(want_gc, (int, float)):
                    gerr = ''
                    got = {}
                    try:
                        cdp.send("HeapProfiler.collectGarbage")
                        cdp.send("HeapProfiler.collectGarbage")
                        cdp.send("Performance.enable")
                        got = {m["name"]: m["value"] for m in cdp.send("Performance.getMetrics").get("metrics", [])}
                    except Exception as ex:
                        gerr = str(ex)[:300]
                    ans = {"seq": want_gc, "nodes": got.get("Nodes"), "listeners": got.get("JSEventListeners"),
                           "heapMB": round((got.get("JSHeapUsedSize") or 0) / 1e6, 2), "err": gerr}
                    cdp.eval("(function(){var f=document.getElementById('app');var w=f&&f.contentWindow;"
                             "if(w){w.__fmGc=%s;w.__fmGcDone=%s;}})()" % (json.dumps(ans), json.dumps(want_gc)))
            except Exception:
                pass
            # THE "FULL UNCHANGED" PROBE'S TWO ASKS (queue 980, tests/full-unchanged.html). Asked by the TOP page, never by
            # the suite, so a suite run never reaches either branch.
            #  · `window.__fmWantSetup = {phone, reduce, init}` — answered ONCE with `__fmSetupDone` (1, or the error text), and the
            #    probe waits for it before it loads the app frame, so the app boots already set up:
            #      phone: a phone is a FINGER, not a narrow mouse — the app asks about the pointer (queue 797;
            #             tools/shot.py does the same), so touch and (hover: none) go on;
            #      init:  a script run in every NEW document before any of its own (Page.addScriptToEvaluateOnNewDocument)
            #             — the probe seeds Math.random in the app frame with it, so a boot-time draw (which drop-hint
            #             variant, the first shape hue) is the same on two runs of the same build.
            #  · `window.__fmWantShot = {seq, name, x, y, w, h}`: a PNG of that clip, written to --shots/<name>.png, answered
            #    with `__fmShotDone = seq` (and `__fmShotErr`). Ignored without --shots, so a page cannot write anywhere.
            try:
                want_set = cdp.eval("(function(){var q=window.__fmWantSetup;return (q && !window.__fmSetupDone) ? JSON.stringify(q) : null;})()")
                if want_set:
                    q = json.loads(want_set)
                    perr = ''
                    try:
                        if q.get("init"):
                            cdp.send("Page.addScriptToEvaluateOnNewDocument", source=str(q["init"]))
                        feats = []
                        if q.get("phone"):
                            cdp.send("Emulation.setTouchEmulationEnabled", enabled=True, maxTouchPoints=5)
                            inp["touch_emu"] = True
                            inp["touch_base"] = True
                            feats += [{"name": "hover", "value": "none"}, {"name": "any-hover", "value": "none"},
                                      {"name": "pointer", "value": "coarse"}, {"name": "any-pointer", "value": "coarse"}]
                        #  reduce: the OS asking for less motion (queue 980, the second review: Full's reduced-motion path was
                        #          never measured) — one emulation call, with the phone's features when it is a phone too
                        if q.get("reduce"):
                            feats.append({"name": "prefers-reduced-motion", "value": "reduce"})
                        if feats:
                            cdp.send("Emulation.setEmulatedMedia", features=feats)
                        if q.get("phone") and not cdp.eval("matchMedia('(hover: none)').matches"):
                            perr = 'the phone emulation did not take: (hover: none) does not match'
                        if q.get("reduce") and not cdp.eval("matchMedia('(prefers-reduced-motion: reduce)').matches"):
                            perr = 'the reduced-motion emulation did not take: (prefers-reduced-motion: reduce) does not match'
                    except Exception as ex:
                        perr = str(ex)[:300]
                    cdp.eval("window.__fmSetupDone = %s" % json.dumps(perr or 1))
                want_shot = cdp.eval("(function(){var q=window.__fmWantShot;if(!q||typeof q.seq!=='number'||window.__fmShotDone===q.seq) return null;"
                                     "return JSON.stringify(q);})()") if a.shots else None
                if want_shot:
                    q = json.loads(want_shot)
                    serr = ''
                    try:
                        name = "".join(ch for ch in str(q.get("name", "shot")) if ch.isalnum() or ch in "-_.")[:120] or "shot"
                        shot = cdp.send("Page.captureScreenshot", format="png",
                                        clip={"x": float(q.get("x", 0)), "y": float(q.get("y", 0)),
                                              "width": float(q.get("w", a.width)), "height": float(q.get("h", a.height)), "scale": 1})
                        import base64
                        with open(os.path.join(a.shots, name + ".png"), "wb") as fh:
                            fh.write(base64.b64decode(shot["data"]))
                    except Exception as ex:
                        serr = str(ex)[:300]
                    cdp.eval("window.__fmShotErr=%s;window.__fmShotDone=%s;" % (json.dumps(serr), json.dumps(q["seq"])))
            except Exception:
                pass
            try:
                payload = cdp.eval("(function(){"
                                   "var s=document.getElementById('sum');"
                                   "if(!s) return null;"
                                   "if(s.textContent.indexOf('Regression')<0 && s.textContent.indexOf('Error')<0) return null;"
                                   "var rows=[].slice.call(document.querySelectorAll('#list .row.fail'))"
                                   "  .map(function(r){return r.textContent.trim();});"
                                   "return JSON.stringify({sum:s.textContent, fails:rows});"
                                   "})()")
            except Exception:
                payload = None            # navigation can tear the context down mid-poll
            if payload:
                break
            # A throttle request is answered within a quarter of a second rather than a whole one; the poll itself
            # is two evaluations and costs nothing measurable against the suite.
            time.sleep(0.25)

        if not payload:
            # say WHERE it stopped rather than just "timed out" — a hang is always a specific test
            try:
                last_seen = cdp.eval("(function(){var f=document.getElementById('app');"
                                     "return f&&f.contentWindow&&f.contentWindow.__fmLastTest||'';})()") or ""
            except Exception:
                pass
            slow = []
            try:
                slow = cdp.eval("(function(){var f=document.querySelector('iframe');"
                                "return (f&&f.contentWindow&&f.contentWindow.__fmSlow)||[];})()") or []
            except Exception:
                pass
            # the eight slowest tests so far (ms, name): on 2 Sep the suite silently doubled in length and this
            # was the only way to say which tests had grown
            if not last_seen and track["name"]:
                last_seen = track["name"]
            if a.dump:
                # queue 980: how far the probe got, for the timeout message (its own __fmDump.step says where it was)
                try:
                    with _dump_open(a.dump) as fh:
                        fh.write(cdp.eval("JSON.stringify({timedOut:true, partial: window.__fmDump || null})") or "null")
                except Exception:
                    pass
            print(json.dumps({"ok": False, "error": "suite did not finish within %ds" % a.timeout,
                              "lastTest": last_seen, "onItSeconds": round(time.time() - track["since"]),
                              "testsSeen": track["n"], "pageSilentSeconds": round(time.time() - track["last_ok"]),
                              "slowest": slow, "browser": _browser()}))
            return 2

        data = json.loads(payload)
        if a.dump:
            # queue 980: the probe's records, written whatever the verdict — a probe that died half-way still says how far it got
            try:
                dumped = cdp.eval("(function(){try{return JSON.stringify(window.__fmDump===undefined?null:window.__fmDump);}"
                                  "catch(e){return JSON.stringify({dumpError:String(e)});}})()")
                with _dump_open(a.dump) as fh:
                    fh.write(dumped or "null")
            except Exception as ex:
                with _dump_open(a.dump) as fh:
                    fh.write(json.dumps({"dumpError": str(ex)[:300]}))
        # queue 996: what each test left in the shared scene (tests.js records it; report only)
        try:
            leaks = cdp.eval("(function(){var f=document.getElementById('app');var w=f&&f.contentWindow;"
                             "return JSON.stringify((w&&w.__fmSceneLeaks)||[]);})()")
            data["sceneLeaks"] = json.loads(leaks or "[]")
        except Exception:
            pass
        try:
            data["slowest"] = cdp.eval("(function(){var f=document.querySelector('iframe');"
                                       "return (f&&f.contentWindow&&f.contentWindow.__fmSlow)||[];})()") or []
        except Exception:
            data["slowest"] = []
        if a.record_baselines:
            try:
                rec = cdp.eval("(function(){var f=document.getElementById('app');var w=f&&f.contentWindow;"
                               "return JSON.stringify((w&&w.__fmBaselineRecord)||null);})()") or "null"
            except Exception:
                rec = "null"
            with open(a.record_baselines, "w", encoding="utf-8") as rf:
                rf.write(rec)
        ran = None
        if a.names:
            # run.html publishes the full pass/fail list as window.__fmResults on the runner page (not the app frame)
            try:
                ran = json.loads(cdp.eval("JSON.stringify((window.__fmResults||null) && window.__fmResults.map(function(r){"
                                          "return {name: r.name, ok: !!r.ok, pending: !!r.pending, notRun: r.notRun || ''};}))") or "null")
            except Exception:
                ran = None
        # NOT RUN HERE, BY NAME AND REASON, IN EVERY RESULT (6 Oct, #1071). tests.js's third verdict: a test that needs what this
        # machine lacks (an AAC encoder, a BarcodeDetector, touch emulation, a baseline for this OS). Never a pass, never a FAIL row
        # (run.html gives it its own), and always present — [] when none — so a reader can tell "none" from "not reported".
        # ship.sh prints it, _spotjudge.py / spotcheck.sh / mutate.sh read a listed test as "did not run".
        try:
            not_run = json.loads(cdp.eval("JSON.stringify((window.__fmNotRun||[]).map(function(r){"
                                          "return {name: r.name, item: r.item || '', reason: r.reason};}))") or "[]")
        except Exception:
            not_run = None
        if not isinstance(not_run, list):
            # the runner finished but its NOT RUN list could not be read: that is not "none", so it is not green either
            return _did_not_run("the runner's NOT RUN HERE list (window.__fmNotRun) could not be read, so whether every test "
                                "ran is unknown.", track["name"])
        green = "✓" in data["sum"] and "Error" not in data["sum"]
        # THE FONT THE TEXT WAS MEASURED IN (6 Oct, the PM's review) — reported, never judged: see tests/_platform.py MAC_FONT
        font = _font_parity(cdp)
        if a.quiet:
            # --quiet trims the PASSING noise, never the failures. It used to print the summary alone,
            # which lost the one thing worth having: on 2026-08-13 a desktop run came back 230/231 and
            # the name of the failing test went with it, so a real (if rare) flake could not be chased.
            print(data["sum"] + "   [" + _browser() + "]")
            for row in data["fails"]:
                print("   FAIL: " + row.replace("\n", " ")[:300])
            for r in not_run:
                print("   NOT RUN HERE: " + str(r.get("name", ""))[:160] + " — " + str(r.get("reason", "")).replace("FAIL", "fail")[:200])
            if font and font.get("same") is False:
                print("   ⚠️ FONT: text was measured in %s (%.2f px) — the Mac's is %s (%s px); widths, wraps and clipping here are "
                      "not the Mac's or his iPhone's" % (font.get("resolved"), font.get("width") or 0, font["mac"].get("resolved"), font["mac"].get("width")))
        else:
            out = {"ok": green, "summary": data["sum"], "failures": data["fails"], "notRun": not_run, "browser": _browser(),
                   "fontParity": font, "slowest": data.get("slowest", []), "sceneLeaks": data.get("sceneLeaks", [])}
            if a.names:
                out["ran"] = ran          # null when the runner page published no list — a reader must then say so, not guess
            print(json.dumps(out, indent=1, ensure_ascii=False))
        return 0 if green else 1
    finally:
        if cdp:
            cdp.close()
        proc.terminate()
        try:
            proc.wait(timeout=10)
        except Exception:
            proc.kill()
        shutil.rmtree(profile, ignore_errors=True)
        if os.path.exists(profile):
            # the browser has exited but a helper can still be writing its state into the profile (measured on Linux:
            # the network service's files landed after the delete), so one more pass a moment later
            time.sleep(1.0)
            shutil.rmtree(profile, ignore_errors=True)


if __name__ == "__main__":
    # A SIGTERM IS AN EXIT, SO THE `finally` RUNS (queue 980 review, 1 Oct). Python's default for SIGTERM is to die on the
    # spot, which skips main()'s finally — Chrome is left running and its fm-cdp- profile (~50 MB) is left in $TMPDIR. A run
    # in the background cannot be stopped with SIGINT either (a backgrounded child inherits it as ignored), so TERM is how
    # tools/full-unchanged.sh, ship.sh and a timed-out Bash call stop this — and now it cleans up after itself.
    import signal

    def _on_term(signum, _frame):
        raise SystemExit(128 + signum)

    signal.signal(signal.SIGTERM, _on_term)
    # EXIT 1 MEANS "RAN AND WAS RED", AND NOTHING ELSE MAY SAY IT (6 Oct, the PM's port review). An uncaught exception —
    # Page.enable refused, a result that is not JSON — used to leave a traceback and exit 1, the red code, with nothing a
    # reader could act on. Whatever escapes main() is a run that did not reach a verdict: exit 2, with the error in the JSON.
    try:
        sys.exit(main())
    except SystemExit:
        raise
    except BaseException as _e:   # KeyboardInterrupt included: an interrupted run did not run
        import traceback
        _tb = traceback.format_exc().strip().splitlines()
        sys.exit(_did_not_run("the driver itself failed: %s: %s (at %s)" % (type(_e).__name__, str(_e)[:300],
                                                                            (_tb[-3] if len(_tb) >= 3 else '').strip()[:200])))
