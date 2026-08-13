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

Exit code is 0 only when regression is all-green, so it can gate a commit.
"""

import argparse, json, os, shutil, socket, subprocess, sys, tempfile, time
import urllib.request

import websocket  # websocket-client

CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"


def free_port():
    s = socket.socket()
    s.bind(("127.0.0.1", 0))
    p = s.getsockname()[1]
    s.close()
    return p


def launch(port, width, height, profile):
    args = [
        CHROME,
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
        # the suite renders to canvas constantly; software GL is the reliable one headless
        "--use-gl=swiftshader",
        "--enable-unsafe-swiftshader",
        "--autoplay-policy=no-user-gesture-required",
        "about:blank",
    ]
    return subprocess.Popen(args, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)


def ws_url(port, timeout=25):
    """Wait for the DevTools endpoint, then return the first page target's websocket."""
    deadline = time.time() + timeout
    while time.time() < deadline:
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


class CDP:
    def __init__(self, url):
        self.ws = websocket.create_connection(url, timeout=600)
        self.n = 0

    def send(self, method, **params):
        self.n += 1
        self.ws.send(json.dumps({"id": self.n, "method": method, "params": params}))
        while True:
            msg = json.loads(self.ws.recv())
            if msg.get("id") == self.n:
                if "error" in msg:
                    raise RuntimeError(f"{method}: {msg['error']}")
                return msg.get("result", {})
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


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--port", type=int, default=8777, help="dev server port")
    ap.add_argument("--url", default=None)
    ap.add_argument("--width", type=int, default=1280)
    ap.add_argument("--height", type=int, default=900)
    ap.add_argument("--timeout", type=int, default=600, help="seconds to wait for the suite")
    ap.add_argument("--quiet", action="store_true", help="only print the summary line")
    a = ap.parse_args()

    url = a.url or f"http://localhost:{a.port}/tests/run.html"
    dbg = free_port()
    profile = tempfile.mkdtemp(prefix="fm-cdp-")
    proc = launch(dbg, a.width, a.height, profile)
    cdp = None
    try:
        cdp = CDP(ws_url(dbg))
        cdp.send("Page.enable")
        cdp.send("Runtime.enable")
        cdp.send("Page.navigate", url=url)

        # The runner replaces #sum's text once FMTests.run() resolves. Poll that rather than a
        # fixed sleep: the suite's wall-clock swings with the machine.
        deadline = time.time() + a.timeout
        payload = None
        last_seen = ""
        while time.time() < deadline:
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
            time.sleep(1.0)

        if not payload:
            # say WHERE it stopped rather than just "timed out" — a hang is always a specific test
            try:
                last_seen = cdp.eval("(function(){var f=document.getElementById('app');"
                                     "return f&&f.contentWindow&&f.contentWindow.__fmLastTest||'';})()") or ""
            except Exception:
                pass
            print(json.dumps({"ok": False, "error": "suite did not finish within %ds" % a.timeout,
                              "lastTest": last_seen}))
            return 2

        data = json.loads(payload)
        green = "✓" in data["sum"] and "Error" not in data["sum"]
        if a.quiet:
            # --quiet trims the PASSING noise, never the failures. It used to print the summary alone,
            # which lost the one thing worth having: on 2026-08-13 a desktop run came back 230/231 and
            # the name of the failing test went with it, so a real (if rare) flake could not be chased.
            print(data["sum"])
            for row in data["fails"]:
                print("   FAIL: " + row.replace("\n", " ")[:300])
        else:
            print(json.dumps({"ok": green, "summary": data["sum"], "failures": data["fails"]},
                             indent=1, ensure_ascii=False))
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


if __name__ == "__main__":
    sys.exit(main())
