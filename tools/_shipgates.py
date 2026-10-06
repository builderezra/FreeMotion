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
# on the machine shipping this tree (the Mac has every feature). Each feature: the NOT RUN reason its tests give (the
# prefix tests.js writes), the files that are its code, and — for a file that is mostly about something else — the words a
# changed line must carry to count. Chosen globs (fnmatch, repo-relative):
#   AAC export audio: js/exporter.js, js/export-resume.js, js/audio-*.js, vendor/mp4-muxer.js — the export's audio track,
#     its mix and effects, and the muxer that writes it; the 215 / 690 tests that need an AAC encoder are their proof.
#   QR / BarcodeDetector: js/collab-qr.js (all of it), and js/collab-ui.js lines that mention qr, barcode, jsqr or scan —
#     the Share panel's QR and the [Scan QR] reader; 921 S6 / S8 are their proof.
FEATURES = [
    {"name": "the AAC export audio", "reason": "needs an AAC audio encoder",
     "globs": ["js/exporter.js", "js/export-resume.js", "js/audio-*.js", "vendor/mp4-muxer.js"], "lines": {}},
    {"name": "the QR code (BarcodeDetector)", "reason": "needs a working BarcodeDetector",
     "globs": ["js/collab-qr.js", "js/collab-ui.js"], "lines": {"js/collab-ui.js": r"(?i)qr|barcode|jsqr|scan"}},
]


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
        missing = [n for n, why, *_ in nr if n == '?' or why.startswith(f["reason"])]
        if missing:
            out.append((f["name"], hit, missing))
    return out


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
    for name, hit, missing in refusals:
        print("❌ THIS RELEASE CHANGES %s (%s) BUT ITS TESTS DID NOT RUN HERE: %s" % (name, ', '.join(hit), '; '.join(missing[:6])))
    sys.exit(1 if refusals else 0)
