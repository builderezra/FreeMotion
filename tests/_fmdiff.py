#!/usr/bin/env python3
"""Capture the FULL pass/fail list from a suite run, and diff two of them.

Why this exists: _cdp.py prints only the failures, which is the right thing for a commit gate and the
wrong thing for a change that turns three unrelated tests red. #115 (auto-scroll the timeline while
dragging a clip) has been attempted three times and backed out three times, and each attempt guessed at
a mechanism from the three reds alone. The three reds are almost certainly DOWNSTREAM of something
earlier that still passed — a test that ran first and left the app in a different state. Finding the
first test that behaves differently between a clean run and a broken one is a diff, not a hypothesis.

    python3 tests/_fmdiff.py capture clean.json          # run the suite, save every result
    python3 tests/_fmdiff.py capture broken.json
    python3 tests/_fmdiff.py diff clean.json broken.json # first divergence, then all of them

Needs run.html to publish window.__fmResults, which it does at the top of its .then().
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


def capture(port, out_path, width, height, timeout):
    dbg = free_port()
    profile = tempfile.mkdtemp(prefix="fm-diff-")
    proc = launch(dbg, width, height, profile)
    cdp = None
    try:
        cdp = CDP(ws_url(dbg))
        cdp.send("Page.enable")
        cdp.send("Runtime.enable")
        cdp.send("Page.navigate", url="http://localhost:%d/tests/run.html" % port)
        deadline = time.time() + timeout
        payload = None
        while time.time() < deadline:
            try:
                payload = cdp.eval("window.__fmResults ? JSON.stringify(window.__fmResults) : null")
            except Exception:
                payload = None            # navigation can tear the context down mid-poll
            if payload:
                break
            time.sleep(1.0)
        if not payload:
            print(json.dumps({"ok": False, "error": "the suite did not finish within %ds" % timeout}))
            return 2
        rows = json.loads(payload)
        with open(out_path, "w") as f:
            json.dump(rows, f, indent=1)
        bad = [r for r in rows if not r["ok"] and not r["pending"]]
        print("%d tests captured to %s — %d red" % (len(rows), out_path, len(bad)))
        for r in bad:
            print("   FAIL: %s — %s" % (r["name"], r["error"][:200]))
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


def diff(a_path, b_path):
    a = json.load(open(a_path))
    b = json.load(open(b_path))
    by_a = {r["name"]: r for r in a}
    # Report in RUN ORDER, because order is the whole point: the first divergence is the lead, and
    # everything after it may simply be inheriting the state that one left behind.
    changed = []
    for i, rb in enumerate(b):
        ra = by_a.get(rb["name"])
        if ra is None:
            changed.append((i, rb["name"], "NEW", rb["ok"], rb.get("error", "")))
        elif ra["ok"] != rb["ok"]:
            changed.append((i, rb["name"], "was " + ("PASS" if ra["ok"] else "FAIL"), rb["ok"], rb.get("error", "")))
    missing = [r["name"] for r in a if r["name"] not in {x["name"] for x in b}]

    if not changed and not missing:
        print("no test changed verdict between the two runs (%d vs %d tests)" % (len(a), len(b)))
        return 0
    if changed:
        i, name, was, ok, err = changed[0]
        print("FIRST DIVERGENCE — test #%d in run order:" % i)
        print("   %s" % name)
        print("   %s -> %s" % (was, "PASS" if ok else "FAIL"))
        if err:
            print("   %s" % err[:400])
        print("")
    print("%d test(s) changed verdict:" % len(changed))
    for i, name, was, ok, err in changed:
        print("  #%-4d %-5s %s" % (i, "PASS" if ok else "FAIL", name))
    for name in missing:
        print("  GONE       %s" % name)
    return 1


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    sub = ap.add_subparsers(dest="cmd", required=True)
    c = sub.add_parser("capture")
    c.add_argument("out")
    c.add_argument("--port", type=int, default=8777)
    c.add_argument("--width", type=int, default=900)
    c.add_argument("--height", type=int, default=760)
    c.add_argument("--timeout", type=int, default=300)
    d = sub.add_parser("diff")
    d.add_argument("a")
    d.add_argument("b")
    a = ap.parse_args()
    if a.cmd == "capture":
        sys.exit(capture(a.port, a.out, a.width, a.height, a.timeout))
    sys.exit(diff(a.a, a.b))
