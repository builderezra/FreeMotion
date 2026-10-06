#!/usr/bin/env python3
"""Read what tests/_memrun.py measured (#1085) and say which tests grew the page, and by what.

    python3 tests/_memreport.py DIR                 # every slice in DIR: the top growers, with what each left alive
    python3 tests/_memreport.py DIR --rows 0-9      # one line per test for a slice (or --rows all)
    python3 tests/_memreport.py DIR --json OUT      # the per-test table as JSON

Growth of a test = (after it) - (after the test before it), both read after two forced garbage collections, so it is what
something still holds. "rend" is the page's renderer (the biggest renderer in the run's tree — the page with the app frame;
every other renderer is a component extension or a test's own extra frame), "all" is every Chrome process. Because the
footprint also moves with things no test holds (a cache filling, the allocator returning pages), the report also gives the
growth that STAYED: the lowest the renderer reads over the next K tests, minus where it stood before this one.
"""

import argparse, glob, json, os, re, sys

MB = 1e6


def load(path):
    names, recs = None, []
    for line in open(path):
        try:
            r = json.loads(line)
        except Exception:
            continue
        if "names" in r:
            names = r
            continue
        recs.append(r)
    return names, recs


def deepget(r, *ks, default=0):
    x = r
    for k in ks:
        if not isinstance(x, dict):
            return default
        x = x.get(k)
    return default if x is None else x


PAGE_PID = {}


def page_rend(r):
    """The page's renderer: the renderer that was biggest BEFORE THE FIRST TEST of the slice (the only one with the app in it
    then) — not the biggest now, because the collaboration tests boot extra app frames on h./a./b.localhost in renderers of
    their own, and one of those can outgrow the page's for a while. Falls back to the biggest when that pid is gone."""
    procs = r.get("procs") or {}
    pid = PAGE_PID.get("pid")
    if pid and pid in procs:
        return procs[pid][1]
    return r.get("rendMax") or max([v[1] for v in procs.values() if v[0] == "renderer"] or [0])


def browser_fp(r):
    return sum(v[1] for v in (r.get("procs") or {}).values() if v[0] == "browser")


def other_rend(r):
    procs = r.get("procs") or {}
    return sum(v[1] for k, v in procs.items() if v[0] == "renderer" and k != PAGE_PID.get("pid"))


FEATURES = [
    ("media", lambda r: deepget(r, "deep", "et", "media", "n")),
    ("mediaLoaded", lambda r: deepget(r, "deep", "et", "media", "loaded")),
    ("mediaDetLoaded", lambda r: deepget(r, "deep", "et", "media", "detachedLoaded")),
    ("mediaPx", lambda r: deepget(r, "deep", "et", "media", "px")),
    ("canvas", lambda r: deepget(r, "deep", "et", "canvas", "n")),
    ("canvasMPx", lambda r: deepget(r, "deep", "et", "canvas", "px") / 1e6),
    ("canvasDetMPx", lambda r: deepget(r, "deep", "et", "canvas", "detachedPx") / 1e6),
    ("imgMPx", lambda r: deepget(r, "deep", "et", "img", "px") / 1e6),
    ("audioCtx", lambda r: sum((deepget(r, "deep", "et", "ac") or {}).values())),
    ("workers", lambda r: deepget(r, "deep", "et", "by", "Worker")),
    ("bmpMPx", lambda r: deepget(r, "deep", "bmp", "px") / 1e6),
    ("vfOpen", lambda r: deepget(r, "deep", "vf", "open")),
    ("abMB", lambda r: deepget(r, "deep", "ab", "bytes") / MB),
    ("blobMB", lambda r: deepget(r, "deep", "blob", "bytes") / MB),
    ("audioBufMB", lambda r: deepget(r, "deep", "abuf", "bytes") / MB),
    ("glCtx", lambda r: deepget(r, "deep", "gl", "n") + deepget(r, "deep", "gl2", "n")),
    ("ocvMPx", lambda r: deepget(r, "deep", "ocv", "px") / 1e6),
    ("windows", lambda r: deepget(r, "deep", "win", "n")),
    ("urls", lambda r: deepget(r, "page", "urls")),
    ("urlMB", lambda r: deepget(r, "page", "urlBytes") / MB),
    ("lsMB", lambda r: deepget(r, "page", "lsChars") * 2 / MB),
    ("projects", lambda r: deepget(r, "page", "projects")),
    ("idbKeys", lambda r: deepget(r, "page", "idbKeys")),
    ("nodes", lambda r: r.get("nodes") or 0),
    ("docs", lambda r: r.get("docs") or 0),
    ("listeners", lambda r: r.get("listeners") or 0),
    ("heapMB", lambda r: (r.get("heapUsed") or 0) / MB),
    ("backingMB", lambda r: (r.get("backing") or 0) / MB),
]


def table(path, keep=8):
    names, recs = load(path)
    lo = int(os.path.basename(path).split("-")[0])   # the slice's first suite position: fmrange=lo-hi
    recs = [r for r in recs if isinstance(r.get("i"), int)]
    recs.sort(key=lambda r: r["seq"])
    PAGE_PID.clear()
    if recs:
        rp = [(v[1], k) for k, v in (recs[0].get("procs") or {}).items() if v[0] == "renderer"]
        if rp:
            PAGE_PID["pid"] = max(rp)[1]
    rows = []
    # PERSISTENT growth, decomposed exactly: the lowest the page renderer reads from test k to the slice's end, minus the same
    # from k-1. It only rises where something was added that nothing after it gave back, and the rises sum to the slice's
    # end-to-start growth (above its lowest point) — so a test that allocates and a later one that frees cancel out.
    pr = [page_rend(x) for x in recs]
    sufmin = pr[:]
    for k in range(len(pr) - 2, -1, -1):
        sufmin[k] = min(pr[k], sufmin[k + 1])
    for k in range(1, len(recs)):
        p, r = recs[k - 1], recs[k]
        ahead = [page_rend(x) for x in recs[k:k + keep]]
        row = {"gi": r["gi"] if isinstance(r.get("gi"), int) else lo + r["i"], "i": r["i"], "name": r.get("name", ""), "tms": r.get("tms"), "ok": r.get("ok"),
               "rend": page_rend(r) / MB, "dRend": (page_rend(r) - page_rend(p)) / MB,
               "stayRend": (min(ahead) - page_rend(p)) / MB, "persist": (sufmin[k] - sufmin[k - 1]) / MB,
               "dAll": ((r.get("allPost") or 0) - (p.get("allPost") or 0)) / MB,
               "dGpu": ((r.get("gpuPost") or 0) - (p.get("gpuPost") or 0)) / MB,
               "all": (r.get("allPost") or 0) / MB, "slice": os.path.basename(path)[:-4],
               "others": other_rend(r) / MB, "dOthers": (other_rend(r) - other_rend(p)) / MB,
               "nRend": sum(1 for v in (r.get("procs") or {}).values() if v[0] == "renderer"),
               "browser": browser_fp(r) / MB, "dBrowser": (browser_fp(r) - browser_fp(p)) / MB}
        for fn, f in FEATURES:
            try:
                row["d_" + fn] = f(r) - f(p)
                row[fn] = f(r)
            except Exception:
                pass
        if r.get("infra") and p.get("infra"):
            row["infra"] = True
        rows.append(row)
    return names, recs, rows


def infra_series(recs):
    """[(i, name, {allocator: MB})] for the page renderer at every record that carries a memory-infra dump."""
    out = []
    for r in recs:
        inf = r.get("infra")
        if not isinstance(inf, dict) or "err" in inf:
            continue
        rends = [(v.get("pf", 0), pid, v) for pid, v in inf.items() if isinstance(v, dict) and (v.get("name") or "").startswith("Renderer")]
        if not rends:
            # memory-infra does not always name the processes: take the biggest private footprint that is not Browser/GPU
            rends = [(v.get("pf", 0), pid, v) for pid, v in inf.items() if isinstance(v, dict) and v.get("name") not in ("Browser", "GPU Process")]
        if not rends:
            continue
        pf, pid, v = max(rends, key=lambda x: x[0])
        out.append((r["i"], r.get("name", ""), {k: round(val / MB, 1) for k, val in v.items() if isinstance(val, int)}))
    return out


def fmt_feat(row):
    bits = []
    for fn, _ in FEATURES:
        d = row.get("d_" + fn)
        if not d:
            continue
        if isinstance(d, float):
            if abs(d) < 0.05:
                continue
            bits.append("%s%+.1f" % (fn, d))
        else:
            bits.append("%s%+d" % (fn, d))
    return " ".join(bits)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("dir")
    ap.add_argument("--rows", default=None)
    ap.add_argument("--top", type=int, default=30)
    ap.add_argument("--json", default=None)
    ap.add_argument("--infra", action="store_true")
    ap.add_argument("--who", type=int, default=0, help="list the top N creators of what is alive at each slice's end")
    a = ap.parse_args()
    files = sorted(glob.glob(os.path.join(a.dir, "*.mem")), key=lambda f: int(os.path.basename(f).split("-")[0]))
    allrows = []
    for f in files:
        names, recs, rows = table(f)
        allrows.extend(rows)
        sl = os.path.basename(f)[:-4]
        if recs:
            first, last = recs[0], recs[-1]
            peak = max(rows, key=lambda x: x["all"]) if rows else None
            print("%-10s %4d tests  page renderer %6.0f → %6.0f MB (%+.0f)   other renderers %4.0f → %4.0f MB   all %6.0f → %6.0f MB (peak %.0f at %s)   heap %5.1f → %5.1f MB" % (
                sl, len(rows), page_rend(first) / MB, page_rend(last) / MB, (page_rend(last) - page_rend(first)) / MB,
                other_rend(first) / MB, other_rend(last) / MB,
                (first.get("allPost") or 0) / MB, (last.get("allPost") or 0) / MB, peak["all"] if peak else 0, peak["gi"] if peak else "-",
                (first.get("heapUsed") or 0) / MB, (last.get("heapUsed") or 0) / MB))
        res = f[:-4] + ".result"
        if os.path.exists(res):
            rr = json.load(open(res))
            if rr.get("verdict") != "finished":
                print("           ⚠️ " + rr["verdict"])
        if a.infra:
            for gi, nm, d in infra_series(recs):
                keys = ["pf", "malloc", "media/frame_buffers", "media/webmediaplayer", "partition_alloc", "blink_gc", "v8", "skia", "cc", "canvas"]
                print("    infra %4s %-50s %s" % (gi, nm[:50], " ".join("%s=%s" % (k.split("/")[-1], d.get(k)) for k in keys if k in d)))
        if a.who and recs:
            # what is still alive at the slice's end, by the test that made it (tests.js memInstall tags)
            last = recs[-1]
            who = deepget(last, "deep", "et", "who", default={}) or {}
            print("    alive at the end, by creator (%s creators):" % deepget(last, "deep", "et", "whoN"))
            for k, v in list(who.items())[:a.who]:
                print("      %-80s %s" % (k[:80], " ".join("%s=%s" % (kk, (round(vv / 1e6, 2) if kk.endswith("Px") else vv)) for kk, vv in v.items())))
            bw = deepget(last, "deep", "bmp", "who", default={}) or {}
            for k, v in list(bw.items())[:5]:
                print("      bitmap %-73s %.2f MPx" % (k[:73], v / 1e6))
        if a.rows and (a.rows == "all" or a.rows == sl):
            for r in rows:
                print("  %4d %+7.1f stay %+7.1f all %+7.1f oth %+7.1f  rend %6.0f nR %2d %5s ms  %-70s %s" % (
                    r["gi"], r["dRend"], r["stayRend"], r["dAll"], r["dOthers"], r["rend"], r["nRend"], r.get("tms"), r["name"][:70], fmt_feat(r)))
    if a.json:
        json.dump(allrows, open(a.json, "w"))
    print("\nTOP %d by growth that persisted to the slice's end (page renderer, MB):" % a.top)
    for r in sorted(allrows, key=lambda r: -r["persist"])[:a.top]:
        print("  %4d %+7.1f (next 8: %+7.1f, step %+7.1f, all %+7.1f) %-80s %s" % (r["gi"], r["persist"], r["stayRend"], r["dRend"], r["dAll"], r["name"][:80], fmt_feat(r)))
    print("\nTOP %d transient peaks (every Chrome process, MB above the slice's start):" % min(a.top, 15))
    starts = {}
    for r in allrows:
        starts.setdefault(r["slice"], r["all"] - r["dAll"])
    for r in sorted(allrows, key=lambda r: -(r["all"] - starts[r["slice"]]))[:min(a.top, 15)]:
        print("  %4d %+7.1f (other renderers %4.0f MB, %d renderers) %-80s" % (r["gi"], r["all"] - starts[r["slice"]], r["others"], r["nRend"], r["name"][:80]))
    print("\nTOTAL: the page renderer grew %+.0f MB over %d measured tests (sum of per-test steps inside the slices)" % (sum(r["dRend"] for r in allrows), len(allrows)))


if __name__ == "__main__":
    main()
