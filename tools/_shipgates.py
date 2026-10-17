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
#   THE PHONE-SPEED BUDGETS (8 Oct, ship 11 of v17.26 — the PM's pick A): "921 S8 a 500-layer project under a 4× CPU throttle"
#     says NOT RUN when this machine's code-free benchmark is too slow to stand in for the phone (heat, a busy host). It times
#     the collab commit hook (collab-session beforeSnap/afterCommit → collab-diff), the hot tick (collab-session) and the full
#     diff (collab-diff, over collab-bridge's view) — read 8 Oct: those paths call nothing outside js/collab-*.js — entered
#     from history.commit (js/history.js). So a change THERE refuses until the test RUNS; a CSS edit is not that test's to stop.
#   ANYTHING ELSE (reason None): a NOT RUN reason no entry above claims refuses any shipped source too. A renamed reason, or a
#     new kind of NOT RUN test, can then only make the gate STRICTER, never wave a release past it unnoticed.
SHIPPED = ["index.html", "styles.css", "theme-glass.css", "sw.js", "manifest.json", "js/*", "vendor/*"]
FEATURES = [
    {"name": "the AAC export audio", "reason": r"needs an AAC audio encoder",
     "globs": ["js/exporter.js", "js/export-resume.js", "js/audio-*.js", "vendor/mp4-muxer.js"], "lines": {}},
    {"name": "the QR code (BarcodeDetector)", "reason": r"needs a working BarcodeDetector",
     "globs": ["js/collab-qr.js", "js/collab-ui.js"],
     # A WORD, not a run of letters (11 Oct): `(?i)…|scan` matched "otherS CAN Edit" inside FM.collab.othersCanEdit and refused
     # v17.38, which touches no QR at all. The words count where a word starts, or where a camelCase name starts a new part
     # (showQR, scanQR, jsQR, BarcodeDetector) — never in the middle of one.
     "lines": {"js/collab-ui.js": r"(?<![A-Za-z0-9])(?i:qr|barcode|jsqr|scan)|(?<=[a-z0-9])(?:QR|Qr|Barcode|Scan)"}},
    {"name": "the app under a real finger (touch emulation)", "reason": r"needs real touch emulation",
     "globs": SHIPPED, "lines": {}},
    {"name": "the pictures and sounds pinned to the Mac (a per-OS baseline)", "reason": r"no baseline recorded for |the \S+ baseline for ",
     "globs": SHIPPED, "lines": {}},
    {"name": "the collab speed budgets at phone speed (921 S8)", "reason": r"this machine is too slow to stand in for the phone",
     "globs": ["js/collab-*.js", "js/history.js"], "lines": {}},
    # THE COLLAB FUZZ BATTERY ('921 FZ', 17 Oct — the PM): NOT RUN by design in an ordinary pass; tools/ship.sh's fz_pass runs
    # it, alone, whenever the release changes js/collab-*.js (or the fuzz's helpers, which are not shipped source) and clears
    # it from NOT RUN when it is green. So it is still NOT RUN here only when fz_pass did not run it — which refuses for collab
    # code, as it should, and leaves every other change alone (a CSS edit is not this battery's to stop).
    {"name": "the collab fuzz battery (921 FZ)", "reason": r"runs only in its own slice",
     "globs": ["js/collab-*.js"], "lines": {}},
    {"name": "the app (a NOT RUN reason this gate has no narrower map for)", "reason": None,
     "globs": SHIPPED, "lines": {}},
]

# the features whose tests NO pass on a machine without them can run (the finger pass clears touch; heat clears 921 S8):
# the only ones ship.sh asks about BEFORE the suites, from this machine's last ship (feature-gate --early)
EARLY = ("the AAC export audio", "the QR code (BarcodeDetector)")


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


def label_only(diff_text, path):
    """True when `path` is index.html and its every changed line differs only in the version label or a ?v= buster. Every
    release bumps both, so read literally the touch and baseline NOT RUN lines — permanent off the Mac — would refuse every
    release from the laptop (7 Oct, v17.24). Masked, the removed and added lines must be the same lines."""
    import re
    if path != 'index.html':
        return False
    lines = changed_lines_signed(diff_text, path)
    if not lines:
        return False
    mask = lambda t: re.sub(r'\?v=\d+', '?v=#', re.sub(r'(class="ver"[^>]*>)v[0-9.]+(<)', r'\1v#\2', t))
    minus = sorted(mask(l[1:]) for l in lines if l[0] == '-')
    plus = sorted(mask(l[1:]) for l in lines if l[0] == '+')
    return minus == plus


def changed_lines_signed(diff_text, path):
    """the + and - lines of `path` in a unified diff, WITH their sign (headers excluded)"""
    out, cur = [], None
    for l in diff_text.split('\n'):
        if l.startswith('diff --git '):
            cur = l.split(' b/', 1)[-1] if ' b/' in l else None
        elif cur == path and l[:1] in ('+', '-') and not l.startswith('+++') and not l.startswith('---'):
            out.append(l)
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
            if label_only(diff_text, p):
                continue   # a release's own version label and ?v= busters are not code (7 Oct, see label_only)
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


# ---- RE-PINS: (14 Oct, #1151 → the PM's option A, #1152) ----------------------------------------------------------------
# A deliberate change that moves a picture the Mac pinned (#1110: Glitch's fringe at half scale) could not ship from the
# laptop: tests/baselines.json is recorded only from a released commit and ships alone, and the feature gate refuses a
# release whose pinned test has no baseline — circular for the release that moves it. The way through is a DECLARATION he
# reads, like UNPROVABLE: and DROPS TEST: — the newest POLISH-LOG line says
#     RE-PINS: "<pinned test title, or a unique part of it>", "<another>" because <why>
# and `tools/record-baselines.sh --candidate` re-records THOSE tests' tables from the tree being shipped, stamped with that
# tree's hash (candidate_hash). The baseline gate below then lets the recording ride beside the code that moves it, but only
# for the named tests, only on exactly this tree, and only if every named test really moved. A pin that moved without being
# named still fails the suites, as before. (The Mac's literals in tests.js are not touched: a Mac ship re-pins them by hand.)
def repins_of(line):
    """(titles, why, error) from a POLISH-LOG line's RE-PINS: declaration — (None, None, None) when it has none."""
    import re
    i = (line or '').find('RE-PINS:')
    if i < 0:
        return None, None, None
    rest = line[i + len('RE-PINS:'):]
    j = rest.find(' because ')
    titles = [t.strip() for t in re.findall(r'"([^"]+)"', rest[:j] if j >= 0 else rest) if t.strip()]
    if not titles:
        return [], '', 'RE-PINS: names no test — quote each one: RE-PINS: "<pinned test title>", … because <why>'
    if j < 0:
        return titles, '', 'RE-PINS: says what moves but not why — end it with: because <why>'
    why = rest[j + len(' because '):].strip()
    if len(why) < 12:
        return titles, why, 'RE-PINS: the reason ("%s") is too short to tell him what moved and why' % why
    return titles, why, None


def newest_log_line(root='.'):
    import io, os
    try:
        lines = [l.rstrip('\n') for l in io.open(os.path.join(root, 'POLISH-LOG.md'), encoding='utf-8') if l.startswith('- v')]
    except OSError:
        return ''
    return lines[-1] if lines else ''


def candidate_hash(root='.'):
    """What a candidate recording is keyed on, like the lock's PASS: HEAD and every file git sees in the tree, except the
    notes (*.md), tools/design/, tools/ dotfiles and the recording itself (tests/baselines.json). Any other edit after the
    recording — the app, tests/tests.js, a tool — makes it some other tree's recording, and the gate refuses it."""
    import hashlib, os
    h = hashlib.sha256()
    h.update(('HEAD ' + sh(['git', 'rev-parse', 'HEAD']).strip() + '\n').encode())
    names = sorted(set(n for n in sh(['git', '-C', root, 'ls-files', '-co', '--exclude-standard', '-z']).split('\0') if n))
    for rel in names:
        if rel.endswith('.md') or rel.startswith(('tools/design/', 'tools/.', '.claude/')) or rel == 'tests/baselines.json':
            continue
        h.update(rel.encode() + b'\0')
        try:
            h.update(hashlib.sha256(open(os.path.join(root, rel), 'rb').read()).hexdigest().encode())
        except OSError:
            h.update(b'missing')
        h.update(b'\n')
    return h.hexdigest()[:24]


def _title_of(key):
    return key.rsplit(' / ', 1)[0]


# ---- THE BASELINE GATE (6 Oct, the port audit, MAJOR) -----------------------------------------------------------------
# tests/baselines.json is what the pinned 482 / 986 tests compare against on every OS but the Mac — so a release that
# re-records it can make a pinned test pass against the very regression it carries. Two rules, both about the release:
#   • it ships ALONE: tests/baselines.json beside any shipped source refuses (a recording blesses code, so the code it
#     blesses must already be out, proven by the Mac);
#   • every OS section it changes names the commit it was recorded on, and that commit is RELEASED (in ssh/main).
# tools/record-baselines.sh records only HEAD as committed, and into this file only from a released HEAD; this is the lock
# on the other door — a hand edit, an old copy of the recorder, a merge.
def baseline_gate(files, old, new, released, cosmetic=lambda p: False, repins=None, cand=None):
    """refusal lines. files: the release's changed paths; old / new: tests/baselines.json at HEAD and in the tree (dicts;
    new None = unreadable); released(commit) -> True / False; cosmetic(path) -> True for a shipped file whose only change is
    what every release bumps (index.html's version label and ?v= busters). repins: the titles a RE-PINS: line names (or None);
    cand: this tree's candidate_hash."""
    import fnmatch
    if 'tests/baselines.json' not in files:
        return []
    out = []
    # "SHIPS ALONE" IS ABOUT A RECORDING (7 Oct, v17.24 was refused for creating the file with only its "_about" note): only a
    # changed OS section blesses anything. And a label- or buster-only index.html is not code that draws — read literally,
    # "beside any shipped source" could never ship a recording, because every release bumps that label.
    oldd = old if isinstance(old, dict) else {}
    recorded = new is None or any(not k.startswith('_') and oldd.get(k) != (new or {}).get(k) for k in set(oldd) | set(new or {}))
    src = [p for p in files if any(fnmatch.fnmatch(p, g) for g in SHIPPED) and not cosmetic(p)]
    if src and recorded and not repins:
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
        cs = sec.get('candidate') if isinstance(sec, dict) else None
        if cs and repins:
            if cs != cand:
                out.append("❌ the '%s' baselines were recorded on a candidate tree (%s) that is not the tree being shipped (%s) — "
                           "record them again: tools/record-baselines.sh --candidate" % (osn, cs, cand))
        elif cs:
            out.append("❌ the '%s' baselines were recorded on a candidate tree, but the newest POLISH-LOG line has no RE-PINS: "
                       "declaration — say which pinned tests move and why, or record from a released commit." % osn)
        elif not c:
            out.append("❌ the '%s' baselines changed and name no commit they were recorded on — record them with "
                       "tools/record-baselines.sh on a released commit." % osn)
        elif not released(str(c)):
            out.append("❌ the '%s' baselines were recorded on %s, which is not a released commit (not in ssh/main) — "
                       "only code a ship has passed on the Mac may be recorded." % (osn, c))
    if repins:
        moved = set()
        for osn in (k for k in new if not k.startswith('_')):
            o = oldd.get(osn) if isinstance(oldd.get(osn), dict) else {}
            n = new[osn] if isinstance(new[osn], dict) else {}
            for part in ('tables', 'tols'):
                ot, nt = o.get(part) or {}, n.get(part) or {}
                moved |= set(k for k in set(ot) | set(nt) if ot.get(k) != nt.get(k))
        loose = sorted(k for k in moved if not any(t in _title_of(k) for t in repins))
        if loose:
            out.append("❌ RE-PINS: names %s, but these pinned tables moved too and no declared title covers them: %s — name their "
                       "tests (and why), or record only the named ones." % (', '.join('"%s"' % t for t in repins), '; '.join(loose[:5])))
        idle = [t for t in repins if not any(t in _title_of(k) for k in moved)]
        if idle:
            out.append("❌ RE-PINS: names %s, but no pinned table of it moved in tests/baselines.json — a re-pin that moves nothing "
                       "is not one: drop it from the line, or record it (tools/record-baselines.sh --candidate)." % ', '.join('"%s"' % t for t in idle))
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
        def cosmetic(path):
            # index.html changed ONLY in its version label and ?v= busters (both masked, then compared whole)
            if path != 'index.html' or subprocess.run(['git', 'cat-file', '-e', 'HEAD:index.html'], capture_output=True).returncode != 0:
                return False
            import re as _re
            mask = lambda t: _re.sub(r'\?v=\d+', '?v=#', _re.sub(r'(class="ver"[^>]*>)v[0-9.]+(<)', r'\1v#\2', t))
            try:
                return mask(sh(['git', 'show', 'HEAD:index.html'])) == mask(open('index.html', encoding='utf-8').read())
            except OSError:
                return False
        titles, why, err = repins_of(newest_log_line())
        if err:
            lines = ["❌ " + err]
        else:
            lines = baseline_gate(sorted(files), old, new, released, cosmetic, repins=titles,
                                  cand=candidate_hash() if titles else None)
    else:
        lines = []
    for l in lines:
        print(l)
    sys.exit(1 if lines else 0)


if __name__ == "__main__" and len(sys.argv) > 1 and sys.argv[1] == "repins":
    # tools/record-baselines.sh --candidate: the titles the newest POLISH-LOG line declares, one per line (exit 1 + why if none)
    titles, why, err = repins_of(newest_log_line())
    if titles is None:
        print('the newest POLISH-LOG line has no RE-PINS: declaration — write RE-PINS: "<pinned test title>", … because <why>')
        sys.exit(1)
    if err:
        print(err)
        sys.exit(1)
    print('\n'.join(titles))
    sys.exit(0)


if __name__ == "__main__" and len(sys.argv) > 1 and sys.argv[1] == "candidate-hash":
    print(candidate_hash())
    sys.exit(0)


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
    nr_in = sys.stdin.read().split('\n')
    if "--early" in args:
        # ASKED BEFORE THE SUITES (11 Oct): only the features no pass on this machine can ever run — a finger test's NOT RUN
        # is cleared by the finger pass, and a too-slow 921 S8 by a cooler run, so neither may refuse a release early
        nr_in = [l for l in nr_in if '\t' in l and claimed_by(l.split('\t', 1)[1]) in EARLY]
    refusals = feature_gate(files, diff_text, nr_in)
    def first(xs, k, sep):
        return sep.join(xs[:k]) + (' … and %d more' % (len(xs) - k) if len(xs) > k else '')
    for name, hit, missing in refusals:
        print("❌ THIS RELEASE CHANGES %s (%s) BUT %d OF ITS TESTS DID NOT RUN HERE: %s"
              % (name, first(hit, 6, ', '), len(missing), first(missing, 6, '; ')))
    sys.exit(1 if refusals else 0)
