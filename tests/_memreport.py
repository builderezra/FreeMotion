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


def page_rend(r):
    """The page's renderer: the biggest renderer footprint in the tree."""
    return r.get("rendMax") or max([v[1] for v in (r.get("procs") or {}).values() if v[0] == "renderer"] or [0])


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
    recs = [r for r in recs if isinstance(r.get("i"), int)]
    recs.sort(key=lambda r: r["seq"])
    rows = []
    for k in range(1, len(recs)):
        p, r = recs[k - 1], recs[k]
        ahead = [page_rend(x) for x in recs[k:k + keep]]
        row = {"gi": r.get("gi", r["i"]), "i": r["i"], "name": r.get("name", ""), "tms": r.get("tms"), "ok": r.get("ok"),
               "rend": page_rend(r) / MB, "dRend": (page_rend(r) - page_rend(p)) / MB,
               "stayRend": (min(ahead) - page_rend(p)) / MB,
               "dAll": ((r.get("allPost") or 0) - (p.get("allPost") or 0)) / MB,
               "dGpu": ((r.get("gpuPost") or 0) - (p.get("gpuPost") or 0)) / MB,
               "all": (r.get("allPost") or 0) / MB, "slice": os.path.basename(path)[:-4]}
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
        out.append((r.get("gi", r["i"]), r.get("name", ""), {k: round(val / MB, 1) for k, val in v.items() if isinstance(val, int)}))
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
    a = ap.parse_args()
    files = sorted(glob.glob(os.path.join(a.dir, "*.mem")), key=lambda f: int(os.path.basename(f).split("-")[0]))
    allrows = []
    for f in files:
        names, recs, rows = table(f)
        allrows.extend(rows)
        sl = os.path.basename(f)[:-4]
        if recs:
            first, last = recs[0], recs[-1]
            print("%-10s %4d tests  page renderer %6.0f → %6.0f MB (%+.0f)   all %6.0f → %6.0f MB   heap %5.1f → %5.1f MB" % (
                sl, len(rows), page_rend(first) / MB, page_rend(last) / MB, (page_rend(last) - page_rend(first)) / MB,
                (first.get("allPost") or 0) / MB, (last.get("allPost") or 0) / MB, (first.get("heapUsed") or 0) / MB, (last.get("heapUsed") or 0) / MB))
        res = f[:-4] + ".result"
        if os.path.exists(res):
            rr = json.load(open(res))
            if rr.get("verdict") != "finished":
                print("           ⚠️ " + rr["verdict"])
        if a.infra:
            for gi, nm, d in infra_series(recs):
                keys = ["pf", "malloc", "media/frame_buffers", "media/webmediaplayer", "partition_alloc", "blink_gc", "v8", "skia", "cc", "canvas"]
                print("    infra %4s %-50s %s" % (gi, nm[:50], " ".join("%s=%s" % (k.split("/")[-1], d.get(k)) for k in keys if k in d)))
        if a.rows and (a.rows == "all" or a.rows == sl):
            for r in rows:
                print("  %4d %+7.1f stay %+7.1f all %+7.1f  rend %6.0f  %5s ms  %-70s %s" % (
                    r["gi"], r["dRend"], r["stayRend"], r["dAll"], r["rend"], r.get("tms"), r["name"][:70], fmt_feat(r)))
    if a.json:
        json.dump(allrows, open(a.json, "w"))
    print("\nTOP %d by growth that stayed (page renderer, MB):" % a.top)
    for r in sorted(allrows, key=lambda r: -r["stayRend"])[:a.top]:
        print("  %4d %+7.1f (step %+7.1f, all %+7.1f) %-80s %s" % (r["gi"], r["stayRend"], r["dRend"], r["dAll"], r["name"][:80], fmt_feat(r)))
    print("\nTOTAL: the page renderer grew %+.0f MB over %d measured tests (sum of per-test steps inside the slices)" % (sum(r["dRend"] for r in allrows), len(allrows)))


if __name__ == "__main__":
    main()
