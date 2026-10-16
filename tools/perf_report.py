#!/usr/bin/env python3
"""PC SPEED BESIDE PHONE SPEED, AS A RESULT OF ITS OWN (#1098 clause 2, 17 Oct).

    python3 tools/perf_report.py <driver output file> [<which pass>]
    python3 tools/perf_report.py .claude/ship/suite-desktop.out "desktop pass"

His words, 7 Oct: "yeah i guess slowing it to work like the phone makes sense because you are testing it for phone users.
i guess you can switch between to see its pc potential". The speed tests measure at the PHONE's speed (a CPU throttle the
driver applies) and judge their budgets there; each also records the same measurement at this machine's own speed
(tests.js perfNote), and tests/_cdp.py hands the list over as "perf" in its JSON. Before this the PC number lived only
inside one test's message ("commit unthrottled median …"), and nothing collected PC-speed numbers at all.

Prints one line per metric, sorted by test then metric:

    PC speed · <test short name> · <metric>: phone <x> ms · PC <y> ms (×<phone ÷ PC>)

With a second argument the lines start "PC speed (<it>) · ". When there are none it says so plainly, and it tells "none"
(an empty list) apart from "unknown" (a list the driver could not read, or a result from a driver that has no such list).

The file is what ship.sh saves of a pass (tests/_cdp.py's JSON, maybe after a few stderr lines) or tests/_slow_pass.py's
--out file; both carry "perf". REPORT ONLY: it never refuses anything. Exit 0 whenever it read a result; 1 only when the
file holds none (missing, or no JSON in it) — ship.sh ignores the code either way. tools/test-perf-report.sh is its test.
"""
import io, json, sys


def find_result(raw):
    """The first JSON object in `raw` (at a line start) that is a driver result ("ok") or carries "perf". None if none."""
    dec = json.JSONDecoder()
    for i in [0] + [k + 1 for k, c in enumerate(raw) if c == "\n"]:
        if raw.startswith("{", i):
            try:
                o, _ = dec.raw_decode(raw, i)
            except ValueError:
                continue
            if isinstance(o, dict) and ("ok" in o or "perf" in o):
                return o
    return None


def num(x):
    return x if isinstance(x, (int, float)) and not isinstance(x, bool) and x == x and abs(x) != float("inf") else None


def fmt(v):
    """3 significant-ish figures: 213 · 13.7 · 3.42 · 0.80"""
    a = abs(v)
    return "%.0f" % v if a >= 100 else "%.1f" % v if a >= 10 else "%.2f" % v


def flat(s, n=200):
    return " ".join(str(s or "").split())[:n]


def line(r, label):
    test, metric = flat(r.get("test") or r.get("title") or "?", 90), flat(r.get("metric") or "?", 80)
    unit = flat(r.get("unit") or "ms", 12)
    ph, pc, why = num(r.get("phone")), num(r.get("pc")), flat(r.get("why"), 160)
    left = "phone %s %s" % (fmt(ph), unit) if ph is not None else "phone not measured"
    if pc is None:
        right = "PC not measured" + (" (%s)" % why if why else "")
    else:
        right = "PC %s %s" % (fmt(pc), unit)
        if ph is not None and pc > 0:
            k = ph / pc
            right += " (×%s)" % ("%.2f" % k if k < 1 else "%.1f" % k)
        elif why and ph is None:
            right += " (%s)" % why
    head = "PC speed (%s)" % label if label else "PC speed"
    return "%s · %s · %s: %s · %s" % (head, test, metric, left, right)


def report(raw, label=""):
    """-> (lines, code)."""
    where = "PC speed (%s)" % label if label else "PC speed"
    d = find_result(raw)
    if d is None:
        return ["%s: no driver result in this file, so no PC-speed numbers either (unknown, not none)" % where], 1
    if "perf" not in d:
        return ["%s: this result carries no perf list (a driver from before #1098, or a run that did not reach a verdict) — "
                "unknown, not none" % where], 0
    p = d.get("perf")
    if not isinstance(p, list):
        return ["%s: the driver could not read the page's speed records (perf: %s) — unknown, not none"
                % (where, json.dumps(p)[:40])], 0
    rows = [r for r in p if isinstance(r, dict)]
    if not rows:
        return ["%s: none — no test in this run recorded a phone-speed / PC-speed pair (perf: [])" % where], 0
    rows.sort(key=lambda r: (flat(r.get("test") or r.get("title") or "?", 90), flat(r.get("metric") or "?", 80)))
    return [line(r, label) for r in rows], 0


def main(argv):
    if len(argv) < 2:
        print("usage: python3 tools/perf_report.py <driver output file> [<which pass>]")
        return 2
    label = flat(argv[2], 40) if len(argv) > 2 else ""
    try:
        raw = io.open(argv[1], encoding="utf-8", errors="replace").read()
    except OSError as e:
        where = "PC speed (%s)" % label if label else "PC speed"
        print("%s: could not read %s (%s) — unknown, not none" % (where, argv[1], e.strerror or e))
        return 1
    lines, code = report(raw, label)
    for l in lines:
        print(l)
    return code


if __name__ == "__main__":
    sys.exit(main(sys.argv))
