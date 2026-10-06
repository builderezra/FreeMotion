"""The git reader tools/ship.sh's Python gates share (6 Oct, the PM's port review, minor).

Each gate had its own `def sh(c): return subprocess.run(c, shell=True, capture_output=True, text=True).stdout`, and the
order gate an `except Exception: diff = ''`. A git that FAILS — "dubious ownership" on a repo another user cloned, a
\\\\wsl.localhost path, a broken index — then printed nothing, which every caller read as "nothing changed": the buster
gate saw no changed file, the order gate saw no closed item. The port fixed the same shape in _srcfiles.py and
_spottests.py; this is ship.sh's copy. A failure is now said on stderr and ends the gate with exit 3, which ship.sh
turns into a refusal.
"""
import subprocess
import sys

GIT_FAILED = 3


def sh(cmd):
    """stdout of a shell command, or exit GIT_FAILED with the command and git's own words on stderr."""
    r = subprocess.run(cmd, shell=isinstance(cmd, str), capture_output=True, text=True)
    if r.returncode != 0:
        sys.stderr.write("❌ git could not answer (%s, exit %d): %s\n"
                         % (cmd if isinstance(cmd, str) else ' '.join(cmd), r.returncode, (r.stderr or '').strip()[:300]))
        sys.exit(GIT_FAILED)
    return r.stdout


# ---- THE FEATURE GATE (6 Oct, #1071 — his answer: the recommended plan) -----------------------------------------------
# A test that needs a feature this machine lacks says NOT RUN HERE (tests/tests.js) and the release goes on — EXCEPT when
# the release changes the very code that test is the only proof of. Then it refuses: those tests must have RUN, and passed,
# on the machine shipping this tree (the Mac has every feature). Each feature: the NOT RUN reason its tests give (a regex
# matched at the START of the reason tests.js writes), the files that are its code, and — for a file that is mostly about
# something else — the words a changed line must carry to count. Chosen globs (fnmatch, repo-relative):
#   AAC export audio: js/exporter.js, js/export-resume.js, js/audio-*.js, vendor/mp4-muxer.js — the export's audio track,
#     its mix and effects, and the muxer that writes it; the 215 / 690 tests that need an AAC encoder are their proof.
#   QR / BarcodeDetector: js/collab-qr.js (all of it), and js/collab-ui.js lines that mention qr, barcode, jsqr or scan —
#     the Share panel's QR and the [Scan QR] reader; the QR read in 921 S6 and the native reader in 921 S8 are their proof.
#   REAL TOUCH and THE PINNED PICTURES (6 Oct, the port audit, MAJOR): ~80 real-finger tests (924, and every test that sends
#     a touch through realInput924) and the 22 pinned 482 / 986 tests. What they prove is not one file: a finger reaches the
#     whole UI (styles.css's touch-only rules, the fine-pointer JS in app.js, timeline.js, home.js, settings.js, the collab
#     files…) and a pinned picture is drawn by the whole render path. So while one of them is NOT RUN, ANY change to shipped
#     source refuses. The gate used to know only AAC and QR, and off the Mac these were listed and the release went on.
#   ANYTHING ELSE (reason None): a NOT RUN reason no entry above claims refuses any shipped source too. A renamed reason, or a
#     new kind of NOT RUN test, can then only make the gate STRICTER, never wave a release past it unnoticed.
SHIPPED = ["index.html", "styles.css", "theme-glass.css", "sw.js", "manifest.json", "js/*", "vendor/*"]
FEATURES = [
    {"name": "the AAC export audio", "reason": r"needs an AAC audio encoder",
     "globs": ["js/exporter.js", "js/export-resume.js", "js/audio-*.js", "vendor/mp4-muxer.js"], "lines": {}},
    {"name": "the QR code (BarcodeDetector)", "reason": r"needs a working BarcodeDetector",
     "globs": ["js/collab-qr.js", "js/collab-ui.js"], "lines": {"js/collab-ui.js": r"(?i)qr|barcode|jsqr|scan"}},
    {"name": "the app under a real finger (touch emulation)", "reason": r"needs real touch emulation",
     "globs": SHIPPED, "lines": {}},
    {"name": "the pictures and sounds pinned to the Mac (a per-OS baseline)", "reason": r"no baseline recorded for |the \S+ baseline for ",
     "globs": SHIPPED, "lines": {}},
    {"name": "the app (a NOT RUN reason this gate has no narrower map for)", "reason": None,
     "globs": SHIPPED, "lines": {}},
]


def claimed_by(why):
    """the name of the feature whose NOT RUN reason `why` is: the first named entry that matches, else the catch-all"""
    import re
    for f in FEATURES:
        if f["reason"] is not None and re.match(f["reason"], why or ''):
            return f["name"]
    return next(f["name"] for f in FEATURES if f["reason"] is None)


def changed_lines(diff_text, path):
    """the + and - lines of `path` in a unified diff (headers excluded)"""
    out, cur = [], None
    for l in diff_text.split('\n'):
        if l.startswith('diff --git '):
            cur = l.split(' b/', 1)[-1] if ' b/' in l else None
        elif cur == path and l[:1] in '+-' and not l.startswith('+++') and not l.startswith('---'):
            out.append(l[1:])
    return out


def feature_gate(files, diff_text, notrun_lines):
    """The refusals, one per feature: [(feature, [files that touch it], [its tests that did not run])]. notrun_lines are
    tools/_testfloor.sh notrun_list's "name<TAB>reason"; a "?" line (a driver that could not say) counts against every
    feature this release touches — unknown is not "ran"."""
    import fnmatch, re
    nr = [l.split('\t', 1) + [''] for l in notrun_lines if l.strip()]
    out = []
    for f in FEATURES:
        hit = []
        for p in files:
            if not any(fnmatch.fnmatch(p, g) for g in f["globs"]):
                continue
            pat = f["lines"].get(p)
            if pat and not any(re.search(pat, l) for l in changed_lines(diff_text, p)):
                continue
            hit.append(p)
        if not hit:
            continue
        missing = [n for n, why, *_ in nr if n == '?' or claimed_by(why) == f["name"]]
        if missing:
            out.append((f["name"], hit, missing))
    return out


# ---- THE BASELINE GATE (6 Oct, the port audit, MAJOR) -----------------------------------------------------------------
# tests/baselines.json is what the pinned 482 / 986 tests compare against on every OS but the Mac — so a release that
# re-records it can make a pinned test pass against the very regression it carries. Two rules, both about the release:
#   • it ships ALONE: tests/baselines.json beside any shipped source refuses (a recording blesses code, so the code it
#     blesses must already be out, proven by the Mac);
#   • every OS section it changes names the commit it was recorded on, and that commit is RELEASED (in ssh/main).
# tools/record-baselines.sh records only HEAD as committed, and into this file only from a released HEAD; this is the lock
# on the other door — a hand edit, an old copy of the recorder, a merge.
def baseline_gate(files, old, new, released):
    """refusal lines. files: the release's changed paths; old / new: tests/baselines.json at HEAD and in the tree (dicts;
    new None = unreadable); released(commit) -> True / False."""
    import fnmatch
    if 'tests/baselines.json' not in files:
        return []
    out = []
    src = [p for p in files if any(fnmatch.fnmatch(p, g) for g in SHIPPED)]
    if src:
        out.append("❌ THIS RELEASE CHANGES tests/baselines.json AND SHIPPED SOURCE (%s) — a recording blesses whatever the code "
                   "draws, so it ships on its own, after the code it was recorded on has shipped from the Mac."
                   % (', '.join(src[:6]) + (' … and %d more' % (len(src) - 6) if len(src) > 6 else '')))
    if new is None:
        out.append("❌ tests/baselines.json is not readable JSON — every pinned test would say NOT RUN on it.")
        return out
    for osn in sorted(k for k in new if not k.startswith('_')):
        sec = new[osn]
        if isinstance(old, dict) and old.get(osn) == sec:
            continue
        c = sec.get('commit') if isinstance(sec, dict) else None
        if not c:
            out.append("❌ the '%s' baselines changed and name no commit they were recorded on — record them with "
                       "tools/record-baselines.sh on a released commit." % osn)
        elif not released(str(c)):
            out.append("❌ the '%s' baselines were recorded on %s, which is not a released commit (not in ssh/main) — "
                       "only code a ship has passed on the Mac may be recorded." % (osn, c))
    return out


if __name__ == "__main__" and len(sys.argv) > 1 and sys.argv[1] == "baseline-gate":
    # tools/ship.sh, in the one-second gates (after the fetch): the release's files and both copies of the file from git
    import json
    files = set(sh(['git', 'diff', '--name-only', 'HEAD']).split() + sh(['git', 'ls-files', '--others', '--exclude-standard']).split())
    if 'tests/baselines.json' in files:
        at_head = subprocess.run(['git', 'cat-file', '-e', 'HEAD:tests/baselines.json'], capture_output=True).returncode == 0
        try:
            old = json.loads(sh(['git', 'show', 'HEAD:tests/baselines.json'])) if at_head else {}
        except ValueError:
            old = {}
        try:
            new = json.load(open('tests/baselines.json', encoding='utf-8'))
            new = new if isinstance(new, dict) else None
        except FileNotFoundError:
            new = {}
        except ValueError:
            new = None
        sh(['git', 'rev-parse', '--verify', '-q', 'ssh/main'])   # no ssh/main: git cannot say what is released — exit 3

        def released(c):
            r = subprocess.run(['git', 'merge-base', '--is-ancestor', c, 'ssh/main'], capture_output=True, text=True)
            return r.returncode == 0   # 1 = not an ancestor; 128 = no such commit here — neither is released
        lines = baseline_gate(sorted(files), old, new, released)
    else:
        lines = []
    for l in lines:
        print(l)
    sys.exit(1 if lines else 0)


if __name__ == "__main__" and len(sys.argv) > 1 and sys.argv[1] == "feature-gate":
    # tools/ship.sh: NOT RUN lines on stdin; the release's files and diff from git (--files / --diff-file for the self-test)
    args = sys.argv[2:]
    if "--files" in args:
        files = [x for x in args[args.index("--files") + 1].split(',') if x]
        diff_text = open(args[args.index("--diff-file") + 1], encoding='utf-8').read() if "--diff-file" in args else ''
    else:
        files = sorted(set(sh(['git', 'diff', '--name-only', 'HEAD']).split()
                           + sh(['git', 'ls-files', '--others', '--exclude-standard']).split()))
        diff_text = sh(['git', 'diff', 'HEAD'])
    refusals = feature_gate(files, diff_text, sys.stdin.read().split('\n'))
    def first(xs, k, sep):
        return sep.join(xs[:k]) + (' … and %d more' % (len(xs) - k) if len(xs) > k else '')
    for name, hit, missing in refusals:
        print("❌ THIS RELEASE CHANGES %s (%s) BUT %d OF ITS TESTS DID NOT RUN HERE: %s"
              % (name, first(hit, 6, ', '), len(missing), first(missing, 6, '; ')))
    sys.exit(1 if refusals else 0)
