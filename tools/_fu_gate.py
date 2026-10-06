#!/usr/bin/env python3
"""The "Full unchanged" gate's rules, in ONE place (queue 980; BUILD-PLAN.md §3.2 point 3; DESIGN.md §0.4.5, §21 F10).

His rule, 1 Oct: "i dont want the original editor changing in design and function". tools/full-unchanged.sh is the
instrument; this file decides WHEN tools/ship.sh must have seen it say PASS, and what "this tree" means for the cache.

    python3 tools/_fu_gate.py selftest     # every rule below, against cases that already went wrong once (or would)
    python3 tools/_fu_gate.py hash         # the source hash a PASS is cached under
    python3 tools/_fu_gate.py check        # what ship.sh runs: prints REFUSE: <why> and exits 1, or OK / NOT-TRIGGERED
    python3 tools/_fu_gate.py why          # which rules fire on the tree as it stands

The gate FIRES when any one of these is true (§3.2 point 3, and §21 F10 — "a Simple fix logged as a hunt finding or under
a later queue number must not skip the lock"):
  1. the newest POLISH-LOG line says `queue 980` (with or without "(partial)");
  2. the diff against HEAD touches a Simple-owned file (SIMPLE_FILES), added, changed or deleted;
  3. the diff adds — or removes — a line matching one of HOOKS in a shared file (SHARED: js/*.js, every root .css,
     index.html, sw.js);
  4. the diff changes a line INSIDE one of Simple's own functions in a shared file (REGION_HEAD, found in HEAD's copy of
     the file) — a later fix to a line of sanitizeSmLayer that names nothing Simple (`if (typeof v === 'number') …`);
  5. the diff changes a line a Simple release wrote (provenance, by git blame) — but never a line it only RE-NUMBERED: the
     version label and a ?v= buster ship in every release's one commit, so they are nobody's (the second review, 6 Oct);
  6. the diff changes the lock's OWN files at all (LOCK_FILES: the probe, the comparer, the plants, the driver script, this
     gate), or the lock's part of the shared tooling it runs on (tests/_cdp.py's probe channels, ship.sh's gate calls,
     serve.sh), whatever the release is labelled (the second review: a group's comparison switched off by code and
     'box-shadow' dropped from the probe, logged as an ordinary item, was NOT-TRIGGERED). Such a release needs
     `INSTRUMENT CHANGE: <what>` in its POLISH-LOG line, a PASS of its own, and a plant caught in every group the probe
     runs and in every run of FU_RUNS. An ordinary release that changes ship.sh or tests/_cdp.py for the SUITE does not
     fire (replayed 6 Oct: 12 of the last 60 ordinary releases did, and every one would have been refused for ever).
When it fires, a release is REFUSED unless tools/full-unchanged.sh printed PASS on this exact tree (the cache in
tools/.full-unchanged-pass names the hash below); refused if the newest POLISH-LOG line names any `queue NNN` other
than 980 (a Simple release ships alone, so any difference from HEAD is Simple's and a rollback takes it back alone); and
refused if it changes the INSTRUMENT (INSTRUMENT_FILES: the probe, the comparer, the plants, the driver, this gate, the
server, ship.sh). A release cannot loosen the lock that judges it — the review moved a clip 0.5 s and added one mask line
and the run said "same as HEAD". An instrument change ships in a release of its own first, one that changes no app file.
And whatever ANY release is labelled, gate or no gate: if its instrument sees less than HEAD's (a key added to
FU_INVISIBLE, a tolerance or threshold raised, a plant taken out, a region taken out of the pictures), it is refused unless
its POLISH-LOG line says `LOOSENS THE LOCK: <why>` — so the two-release route (loosen first, then ship what it hides) is
a line he reads, never a quiet edit.

THE HOOKS (review of v1): v1's pattern was UI hooks only — `isSimple|ed-simple|FM.editor|FM.spine|simpleTimeline|cv-ed|
cv-editor|sm-` — and 17 of step 1.2's 22 shared-file hunks contain no line it matches (the whole sanitizeSmLayer, the
compositor's worldBox and groupNeedsUnit, every collab-core schema change, the app.js writes of srcW, pick and sm.twin).
It also fired on ordinary names (isSimpleShape, cv-edge, FM.editorState, .fx-sm-thumb, --sm-gap), which would refuse an
ordinary release that can never get a PASS. So each hook is now one of Simple's actual names, anchored, plus the
identifiers step 1.2 puts into shared files, plus the "Simple mode" marker every one of its hunks carries in a comment.
Measured 1 Oct on v17.21: every hook matches 0 lines of the shipped sources (one, `opts.at`, is kept to js/app.js because
js/ai-ops.js already has two). A bare SCHEMA_REV / SCHEMA_FP bump is deliberately NOT a hook: every #482 polish batch
makes one (v17.19, v17.20, v17.21), and such a release changes Full on purpose, so it could never get a PASS — the bump in
step 1.2 fires anyway, by its "Simple mode" comment and by the sanitiser lines it travels with.
"""
import hashlib, io, os, re, subprocess, sys

SIMPLE_FILES = ['js/spine.js', 'js/spine-words.js', 'js/simple-timeline.js', 'js/editor-mode.js', 'js/simple-tools.js']
# (what it is, the pattern, the files it applies to: None for every shared file, 'js' for the shared scripts only, or a list)
# THE SECOND REVIEW (6 Oct): four of these were a bare word, and an ordinary "queue 975" release was refused — with no
# override — for `const PAD = { sm: 4 }`, `.chip.sm { … }`, `.hm-card.hydrating { … }`, `el.classList.add('pick')`,
# `const fn = FM.eyedropper.pick;` and a comment saying "simple mode". Each now names Simple's OWN identifier in its
# context (BUILD-PLAN §4.1's lines, verbatim in STEP_1_2 below, are what they must still see), and the six are in QUIET.
HOOKS = [
    ('isSimple()', r'\bisSimple\(', None),
    ('the ed-simple body class', r'(?<![\w-])ed-simple\b', None),
    ('FM.editor', r'\bFM\.editor\b', None),
    ('FM.spine', r'\bFM\.spine\b', None),
    ('simpleTimeline', r'\bsimpleTimeline\b', None),
    ('the cog’s Editor block', r'\bcv-ed(?:itor\b|-)', None),
    ('a Simple id or class', r'(?<![\w-])sm-[a-z]|\bbtn-sm-split\b|(?<![\w-])ed-live\b', None),
    # capital S, as every hunk of the plans writes it ("Simple mode P1", "Simple mode Phase 1", "Simple mode P2.2")
    ('a "Simple mode" marker', r'\bSimple mode\b', None),
    # the layer's / project's / an effect's `sm`: a layer-ish name before it, one of its own keys after it, or an object
    # literal that opens with one of its keys — never a bare `sm:` (a size scale) and never a CSS class
    ('the layer’s sm key', r'\b(?:l|L|layer|lay|f|fx|out|p|P|proj|project|c|copy)\.sm\b(?![-\w])|'
                          r'\bsm\.(?:main|stay|tail|tailEnd|twin|unit|muteByMode|v|adopted|home|muteClips|mrev|row)\b|'
                          r'(?<![\w$.-])sm\s*:\s*\{\s*(?:main|v|stay|tail|twin|adopted|home|unit)\b', 'js'),
    ('Simple’s sanitiser', r'\bsanitizeSm\w*|\bsmPlain\b|\bsmKeepUnknown\b|\bSM_FLAGS\b|\bSM_V\b', None),
    ('a shared helper step 1.2 adds', r'\bFM\.(?:timedLists|trimClipEdge|worldBox|groupNeedsUnit|seamKey|divideSegment|renderStill|pickReplacement|swapInMedia|setClipSpeed|docRev)\b', None),
    ('a plain helper field', r'\.src(?:W|H|Rev)\b|\bsrc(?:W|H|Rev)\s*:|[\'"]src(?:W|H|Rev)[\'"]', None),
    # a layer's pick stamp: `l.pick`, `pick: { b`, `'pick' in`, pickB / pickI — never a class name or eyedropper.pick
    ('a pick', r'\b(?:l|L|layer|lay|c|copy|out)\.pick\b|\bpick\s*:\s*\{\s*b\b|[\'"]pick[\'"]\s+in\b|\bpick[BI]\b', 'js'),
    ('a split-boundary mark', r'(?<![\w$-])sb\s*:\s*1\b|\.sb\b(?![-\w])', None),
    ('onSplit', r'\bonSplit\b', None),
    ('the schema project fixture', r'\bSCHEMA_PROJECT_FIXTURE\b', None),
    ('the size-aware layerAABB', r'\blayerAABB\([^)]*\bsize\b', None),
    ('handleFiles with opts', r'\bhandleFiles\(\s*files\s*,\s*opts\s*\)', None),
    ('addMediaLayer’s at', r'\bopts\.at\b', ['js/app.js']),
    ('FM.storage.hydrating', r'\bFM\.storage\.hydrating\b', None),
    ('a Simple-owned script', r'\b(?:spine|spine-words|simple-timeline|editor-mode|simple-tools)\.js\b', None),
]
HOOKS_RE = [(n, re.compile(p), f) for (n, p, f) in HOOKS]
# A line in HEAD's copy of a shared file that OPENS one of Simple's own functions: every line until its closing brace is
# Simple's, whatever it names. EXACT names (the second review: `FM.editor\w*` took an ordinary FM.editorHints for Simple's,
# so its first release shipped quietly and the next one-line fix inside it was refused).
REGION_HEAD = re.compile(r'\bfunction\s+(?:sanitizeSm\w*|smPlain|smKeepUnknown)\s*\(|\bSCHEMA_PROJECT_FIXTURE\s*=|'
                         r'\bFM\.(?:spine|editor|timedLists|trimClipEdge|worldBox)\b(?:\.\w+)*\s*=\s*(?:async\s+)?function|'
                         r'\bFM\.(?:spine|editor)\s*=\s*\{')
SHARED = re.compile(r'^(js/.*\.js|[^/]+\.css|index\.html|sw\.js)$')
QUEUE = re.compile(r'queue (\d+)\b')
PASS_FILE = os.path.join('tools', '.full-unchanged-pass')
# THE INSTRUMENT: what measures, judges and runs the lock. A Simple release may not change any of it (see the docstring).
INSTRUMENT_FILES = ['tools/full-unchanged.sh', 'tools/_fu_compare.py', 'tools/_fu_gate.py', 'tools/full-unchanged-plants.json',
                    'tests/full-unchanged.html', 'tests/_cdp.py', 'tools/serve.sh', 'tools/ship.sh']

# What a PASS depends on. The app (every file it serves), plus the instrument itself: a changed probe, comparer or driver
# is a different measurement, so it must not inherit the old verdict.
HASH_DIRS = ['js', 'vendor', 'fx-art', 'launch']          # every folder index.html and the scripts load from (v17.21)
# Served beside the app, from the TREE on both sides. NOT tests/tests.js any more (the second review, 6 Oct): FU5 used to run
# it inside the measured app frame for its kitchen921 fixtures, so a Simple release could change Full and, in the same commit,
# put a top-level line in tests.js that neutered the sanitiser on BOTH sides — tests.js is not instrument, and a Simple
# release may change it. The fixture builder lives in the probe now; nothing of the suite runs in the frame being measured.
PROBE_FILES = ['tests/full-unchanged.html']
HASH_FILES = PROBE_FILES + ['tests/_cdp.py', 'tools/full-unchanged.sh', 'tools/_fu_compare.py', 'tools/_fu_gate.py',
                            'tools/full-unchanged-plants.json', 'tools/serve.sh']


def is_app_path(rel):
    """The files the app serves: root-level files (not dotfiles, not the .md notes) and the asset folders. The ONE rule
    the hash and both snapshots read, so the PASS cache and the thing measured cannot drift apart."""
    parts = rel.split('/')
    if len(parts) == 1:
        return not rel.startswith('.') and not rel.endswith('.md')
    return parts[0] in HASH_DIRS and not parts[-1].startswith('.')


def snapshot_head(root, dest):
    """HEAD's app, extracted from `git archive HEAD` (no worktree and no stash: both are shared state), plus the TREE's
    probe files — the same probe must measure both sides, and at HEAD it may not exist yet."""
    import tarfile, shutil
    os.makedirs(dest, exist_ok=True)
    proc = subprocess.Popen(['git', 'archive', '--format=tar', 'HEAD'], cwd=root, stdout=subprocess.PIPE)
    n = 0
    with tarfile.open(fileobj=proc.stdout, mode='r|') as tf:
        for m in tf:
            if m.isfile() and is_app_path(m.name):
                tf.extract(m, dest)
                n += 1
    proc.wait()
    for rel in PROBE_FILES:
        os.makedirs(os.path.join(dest, os.path.dirname(rel)), exist_ok=True)
        shutil.copyfile(os.path.join(root, rel), os.path.join(dest, rel))
    return n


def snapshot_tree(root, dest):
    """The working tree's app as it is NOW (tracked and untracked), so an edit made during a run cannot change what is
    being measured half-way through; the hash is re-read at the end and a moved tree earns no PASS."""
    import shutil
    n = 0
    for rel in app_paths(root) + PROBE_FILES:
        src = os.path.join(root, rel)
        if not os.path.isfile(src):
            continue
        os.makedirs(os.path.join(dest, os.path.dirname(rel)) or dest, exist_ok=True)
        shutil.copyfile(src, os.path.join(dest, rel))
        n += 1
    return n


def app_paths(root):
    paths = []
    for name in sorted(os.listdir(root)):
        if os.path.isfile(os.path.join(root, name)) and is_app_path(name):
            paths.append(name)
    for d in HASH_DIRS:
        for base, dirs, fs in os.walk(os.path.join(root, d)):
            dirs.sort()
            for f in sorted(fs):
                rel = os.path.relpath(os.path.join(base, f), root)
                if is_app_path(rel):
                    paths.append(rel)
    return paths


def sh(args, root):
    try:
        return subprocess.run(args, cwd=root, capture_output=True, text=True).stdout
    except Exception:
        return ''


def newest_log_line(root):
    try:
        lines = [l for l in io.open(os.path.join(root, 'POLISH-LOG.md'), encoding='utf-8') if l.startswith('- v')]
        return lines[-1] if lines else ''
    except Exception:
        return ''


def changed_files(root):
    """Tracked files that differ from HEAD (added, changed, deleted, renamed) plus untracked, not-ignored files."""
    out = set()
    for line in sh(['git', 'diff', '--name-status', 'HEAD'], root).splitlines():
        parts = line.split('\t')
        for p in parts[1:]:
            out.add(p.strip())
    for p in sh(['git', 'ls-files', '--others', '--exclude-standard'], root).splitlines():
        out.add(p.strip())
    return sorted(x for x in out if x)


def hook_of(path, text):
    """The name of the first hook `text` (one line of `path`) matches, or None."""
    for name, rx, files in HOOKS_RE:
        if files == 'js':
            if not path.endswith('.js'):
                continue
        elif files is not None and path not in files:
            continue
        if rx.search(text):
            return name
    return None


# ─── REGIONS: Simple's own functions inside a shared file ───────────────────────────────────────────────────────────────
def strip_js(line, in_comment):
    """`line` with its string literals and comments removed (enough to count braces), and whether a /* comment is still
    open at its end."""
    out, i, n = [], 0, len(line)
    while i < n:
        if in_comment:
            j = line.find('*/', i)
            if j < 0:
                return ''.join(out), True
            i, in_comment = j + 2, False
            continue
        c = line[i]
        if line.startswith('//', i):
            break
        if line.startswith('/*', i):
            in_comment, i = True, i + 2
            continue
        if c in '\'"`':
            j = i + 1
            while j < n and line[j] != c:
                j += 2 if line[j] == '\\' else 1
            i = j + 1
            continue
        out.append(c)
        i += 1
    return ''.join(out), in_comment


def simple_regions(text):
    """[(first line, last line)] (1-based) of every block a REGION_HEAD line opens, found by matching its braces."""
    regions, stack, depth, inc = [], [], 0, False
    for i, line in enumerate(text.split('\n'), 1):
        code, inc = strip_js(line, inc)
        opens, closes = code.count('{'), code.count('}')
        if REGION_HEAD.search(line) and opens > closes:
            stack.append((i, depth))
        depth += opens - closes
        while stack and depth <= stack[-1][1]:
            s, _ = stack.pop()
            regions.append((s, i))
    return regions


HUNK = re.compile(r'^@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@')


def hunks_in_regions(diff_text, regions):
    """Hunks of a `git diff -U0` whose HEAD-side lines fall inside a region (or, for a pure insertion, land inside one).
    A region's CLOSING line is its own (6 Oct: step 1.2's SCHEMA_PROJECT_FIXTURE ends in a lone `};` that git's diff
    attributes to the release before, so neither the hooks nor the provenance saw a later fix to it — 1 of 127 lines)."""
    hits = []
    for line in diff_text.splitlines():
        m = HUNK.match(line)
        if not m:
            continue
        a, b = int(m.group(1)), int(m.group(2)) if m.group(2) is not None else 1
        lines = range(a, a + b) if b > 0 else []
        for (s, e) in regions:
            if (b > 0 and any(s < x <= e for x in lines)) or (b == 0 and s <= a < e):
                hits.append((s, e, line))
                break
    return hits


def hook_lines(root, files):
    """(file, '+'/'-'/'~', text, hook) for every added or removed line in the shared files that matches a hook, and every
    hunk that lands inside one of Simple's functions in HEAD's copy of the file ('~')."""
    hits = []
    shared = [f for f in files if SHARED.match(f) and f not in SIMPLE_FILES]
    untracked = set(sh(['git', 'ls-files', '--others', '--exclude-standard'], root).splitlines())
    for f in shared:
        if f in untracked:
            try:
                for t in io.open(os.path.join(root, f), encoding='utf-8', errors='replace'):
                    h = hook_of(f, t)
                    if h:
                        hits.append((f, '+', t.rstrip('\n'), h))
            except Exception:
                pass
            continue
        diff = sh(['git', 'diff', '-U0', 'HEAD', '--', f], root)
        for t in diff.splitlines():
            if (t.startswith('+') and not t.startswith('+++')) or (t.startswith('-') and not t.startswith('---')):
                h = hook_of(f, t[1:])
                if h:
                    hits.append((f, t[0], t[1:], h))
        head_text = sh(['git', 'show', 'HEAD:' + f], root)
        if head_text and REGION_HEAD.search(head_text):
            for (s, e, hunk) in hunks_in_regions(diff, simple_regions(head_text)):
                hits.append((f, '~', '%s inside lines %d–%d of HEAD' % (hunk, s, e), 'a line of one of Simple’s own functions'))
        for (ln, sha, hunk) in simple_owned_lines(root, f, diff, head_text):
            hits.append((f, '~', '%s changes line %d of HEAD, which Simple release %s wrote' % (hunk, ln, sha[:8]),
                         'a line a Simple release wrote'))
    return hits


# ─── PROVENANCE: the lines a Simple release wrote into a shared file (review of v1, finding 9) ──────────────────────────
# The hooks see a line that NAMES something Simple. Step 1.2 also writes lines that name nothing Simple — a comment, a
# closing brace, `const sz = size || layerSizeAt(l, t);` inside Full's own layerAABB, a helper like isPlainObj — and the
# regions only cover Simple's own functions. Measured on BUILD-PLAN §4.1 applied to v17.23: 30 of its 131 added lines in
# shared files would let a later one-line fix, logged as a hunt, skip the lock. So the gate also asks git WHO WROTE each
# line a hunk changes: a line last written by a Simple release (a commit the gate would have fired on — it touched a
# Simple-owned file, its POLISH-LOG line says queue 980, or a line it added to a shared file matches a hook) is Simple's,
# whatever it says. A pure insertion counts when BOTH lines around it are Simple's (it lands inside a Simple block).
_SIMPLE_SHA = {}
# ⚠️ A RELEASE NUMBER IS NOT A LINE OF SIMPLE'S (the second review, 6 Oct). ship.sh commits a release as ONE commit, and that
# commit carries index.html's version label and every ?v= buster it bumped — so git blame credited those lines to the Simple
# release, and the NEXT ordinary release, which has to bump the label again, was refused as "a line a Simple release wrote"
# (and could never get the PASS it was then told to get: it changes Full on purpose). With no override, every #482 batch and
# hunt fix would have stopped the day Simple shipped. So a line whose only change is the version label or a buster's number
# is nobody's: a hunk that only re-numbers is skipped, and a line a Simple commit only re-numbered is not Simple's.
_BUMP = [(re.compile(r'>v\d+(?:\.\d+)*<'), '>v#<'), (re.compile(r'\?v=[0-9][0-9.]*'), '?v=#')]


def bump_mask(s):
    for rx, rep in _BUMP:
        s = rx.sub(rep, s)
    return s


def diff_hunks(diff_text):
    """[(header, a, b, c, d, removed lines, added lines)] of a `git diff -U0` / `git show -U0` for one file."""
    out, cur = [], None
    for line in diff_text.splitlines():
        m = HUNK.match(line)
        if m:
            a, b = int(m.group(1)), int(m.group(2)) if m.group(2) is not None else 1
            c, d = int(m.group(3)), int(m.group(4)) if m.group(4) is not None else 1
            cur = (line, a, b, c, d, [], [])
            out.append(cur)
        elif cur is not None and line.startswith('-') and not line.startswith('---'):
            cur[5].append(line[1:])
        elif cur is not None and line.startswith('+') and not line.startswith('+++'):
            cur[6].append(line[1:])
    return out


def bump_only(rem, add):
    """A hunk that only re-numbers: the same lines, pair by pair, once the label and the busters are masked."""
    return bool(rem) and len(rem) == len(add) and all(bump_mask(x) == bump_mask(y) for x, y in zip(rem, add))


_RENUMBERED = {}


def renumbered_by(root, sha, fname, orig_line):
    """Did commit `sha` only re-number line `orig_line` (its own numbering) of `fname`? Then the line is not its own."""
    key = (sha, fname)
    if key not in _RENUMBERED:
        _RENUMBERED[key] = diff_hunks(sh(['git', 'show', '--format=', '-U0', sha, '--', fname], root))
    for (_, a, b, c, d, rem, add) in _RENUMBERED[key]:
        if d > 0 and c <= orig_line < c + d:
            i = orig_line - c
            return b == d and i < len(rem) and i < len(add) and bump_mask(rem[i]) == bump_mask(add[i])
    return False


def is_simple_commit(root, sha):
    if sha in _SIMPLE_SHA:
        return _SIMPLE_SHA[sha]
    ok = False
    if sha and not sha.startswith('0000000'):
        names = sh(['git', 'show', '--format=', '--name-only', sha], root).split()
        if any(n in SIMPLE_FILES for n in names):
            ok = True
        if not ok and 'POLISH-LOG.md' in names:
            for t in sh(['git', 'show', '--format=', '-U0', sha, '--', 'POLISH-LOG.md'], root).splitlines():
                if t.startswith('+- v') and '980' in QUEUE.findall(t):
                    ok = True
                    break
        if not ok:
            shared = [n for n in names if SHARED.match(n) and n not in SIMPLE_FILES]
            if shared:
                cur = None
                for t in sh(['git', 'show', '--format=', '-U0', sha, '--'] + shared, root).splitlines():
                    if t.startswith('+++ b/'):
                        cur = t[6:]
                    elif t.startswith('+') and not t.startswith('+++') and cur and hook_of(cur, t[1:]):
                        ok = True
                        break
    _SIMPLE_SHA[sha] = ok
    return ok


def blame_lines(root, f, lines, nmax):
    """{line: (sha, its line number in that commit, the file's name there)} for the given 1-based HEAD lines of f, in one
    `git blame` call."""
    lines = sorted(set(x for x in lines if 1 <= x <= nmax))
    if not lines:
        return {}
    ranges, a = [], lines[0]
    prev = a
    for x in lines[1:] + [None]:
        if x is not None and x == prev + 1:
            prev = x
            continue
        ranges += ['-L', '%d,%d' % (a, prev)]
        if x is not None:
            a = prev = x
    out, names, last = {}, {}, None
    for t in sh(['git', 'blame', '--porcelain'] + ranges + ['HEAD', '--', f], root).splitlines():
        m = re.match(r'^([0-9a-f]{40}) (\d+) (\d+)', t)
        if m:
            last = (m.group(1), int(m.group(2)), int(m.group(3)))
            out[last[2]] = last
            continue
        if t.startswith('filename ') and last:
            names[last[0]] = t[9:]
    return dict((k, (sha, ol, names.get(sha, f))) for k, (sha, ol, _) in out.items())


def simple_owned_lines(root, f, diff, head_text):
    """[(HEAD line, sha, hunk header)] for every hunk of `diff` that changes a line a Simple release wrote. A hunk that only
    re-numbers (the version label, a buster) is nobody's, and so is a line a Simple commit only re-numbered."""
    if not head_text:
        return []
    nmax = head_text.count('\n') + (0 if head_text.endswith('\n') else 1)
    want, hunks = set(), []
    for (hdr, a, b, c, d, rem, add) in diff_hunks(diff):
        if b > 0 and bump_only(rem, add):
            continue
        ls = list(range(a, a + b)) if b > 0 else [a, a + 1]
        hunks.append((hdr, b, ls))
        want.update(ls)
    if not hunks:
        return []
    who = blame_lines(root, f, want, nmax)

    def simple_line(x):
        w = who.get(x)
        if not w or not is_simple_commit(root, w[0]):
            return None
        return None if renumbered_by(root, w[0], w[2], w[1]) else w[0]
    out = []
    for (hdr, b, ls) in hunks:
        shas = [(x, simple_line(x)) for x in ls if 1 <= x <= nmax]
        if b > 0:
            hit = [(x, s) for (x, s) in shas if s]
        else:   # an insertion: inside a Simple block only if the lines on BOTH sides are Simple's
            hit = shas if len(shas) == 2 and all(s for (_, s) in shas) else []
        if hit:
            out.append((hit[0][0], hit[0][1], hdr))
    return out


def trigger(logline, files, hooks):
    """-> list of reasons the gate fires (empty: it does not)."""
    why = []
    if '980' in QUEUE.findall(logline):
        why.append('the newest POLISH-LOG line says queue 980')
    owned = [f for f in files if f in SIMPLE_FILES]
    if owned:
        why.append('the diff touches Simple-owned ' + ', '.join(owned))
    if hooks:
        h = hooks[0]
        f, sign, t = h[0], h[1], h[2]
        name = h[3] if len(h) > 3 else 'a Simple hook'
        verb = {'+': 'adds', '-': 'removes', '~': 'changes'}.get(sign, 'touches')
        why.append('the diff %s %s in %s (%s%s)%s' % (verb, name, f, sign, t.strip()[:90],
                                                     (' and %d more' % (len(hooks) - 1)) if len(hooks) > 1 else ''))
    return why


def other_queues(logline):
    return sorted(set(q for q in QUEUE.findall(logline) if q != '980'), key=int)


def instrument_changed(files):
    return [f for f in files if f in INSTRUMENT_FILES]


# ─── WHICH INSTRUMENT CHANGES FIRE THE GATE BY THEMSELVES (fix of the second review's finding 4, 6 Oct) ───────────────────
# The lock's own files fire on any change. tests/_cdp.py and tools/ship.sh are shared with the suite and the ship, and ordinary
# releases change them for those (replayed on the last 60 releases: 12 did — Chrome flags, the CPU throttle, the fetch-first
# check — and under "any change fires" each needed a two-hour PASS it had no reason to need, with no override). So for these
# a change fires when it is in the lock's part: a changed line, or one within six lines of it, that names the probe's own
# channels (`__fmWantSetup`, `__fmWantShot`, --dump, --shots, the phone base, reduced motion) or queue 980 in _cdp.py, or the
# gate or the lock in ship.sh. serve.sh is small and the lock's own server: any change fires. A Simple release may still
# change NONE of INSTRUMENT_FILES (check(), below). And a driver change that blinds the lock where these markers do not
# reach is what the self-test is for: the next PASS runs every plant through the changed driver (`pixels` proves the
# pictures, `touch` / `hold500` / `scrubrate` the fingers, `hover` / `ctxhover` the mouse).
LOCK_FILES = ['tools/full-unchanged.sh', 'tools/_fu_compare.py', 'tools/_fu_gate.py', 'tools/full-unchanged-plants.json',
              'tests/full-unchanged.html']
LOCK_PART = {
    'tests/_cdp.py': re.compile(r'980|__fmWant(?:Setup|Shot)\b|__fm(?:Setup|Shot)(?:Done|Err)\b|\ba\.(?:dump|shots)\b|'
                                r'--(?:dump|shots)\b|_dump_open|touch_base|prefers-reduced-motion|captureScreenshot'),
    'tools/ship.sh': re.compile(r'_fu_gate|full-unchanged|\b980\b'),
    'tools/serve.sh': None,
}


def instrument_firing(root, files):
    """The changed instrument files whose change fires the gate on its own (see LOCK_PART)."""
    out = []
    untracked = set(sh(['git', 'ls-files', '--others', '--exclude-standard'], root).splitlines())
    for f in instrument_changed(files):
        rx = LOCK_PART.get(f, None) if f not in LOCK_FILES else None
        if f in LOCK_FILES or rx is None or f in untracked:
            out.append(f)
            continue
        diff = sh(['git', 'diff', '-U6', 'HEAD', '--', f], root)
        if not diff.strip() and os.path.exists(os.path.join(root, f)) is False:
            out.append(f)          # deleted
            continue
        for hunk in re.split(r'\n(?=@@ )', diff):
            if hunk.startswith('@@') and rx.search(hunk):
                out.append(f)
                break
    return out


# ─── LOOSENING THE INSTRUMENT IS A DECLARATION, NEVER A QUIET EDIT (review finding 10, its second route) ────────────────
# A Simple release cannot change the instrument (check() below). But the lock's own releases can, and they carry no app
# change, so their PASS is HEAD against HEAD — a loosened mask passes that by construction. Two releases in a row would
# then do what one may not: first add `layer.start` to FU_INVISIBLE (the review's selfloosen.py: a clip moved 0.5 s and
# the run said "same as HEAD"), then ship the Simple change it hides. So ANY release whose instrument sees less than
# HEAD's did — a key added to FU_INVISIBLE, a picture tolerance or threshold raised, a plant taken out, a region taken out
# of the pictures — is refused unless its POLISH-LOG line says so in words he reads: `LOOSENS THE LOCK: <why>`. Whatever
# the line's queue number, and whether or not the gate fires: the label is exactly what such a release would get wrong.
LOOSEN_MARK = 'LOOSENS THE LOCK:'
TOL_VARS = ('FU_TOL_PX', 'FU_CHAN', 'FU_FAINT_TOL_PX', 'FU_FAINT_CHAN', 'FU_GRID_TOL', 'FU_AUDIO_TOL', 'FU_BYTES_PCT')   # a larger number sees less
# ⚠️ AND ANY CHANGE TO THE INSTRUMENT IS A RELEASE OF ITS OWN THAT SAYS SO (the second review, 6 Oct). The rule above read
# four knobs (FU_INVISIBLE, the tolerances, plant names, PNG_UNSTABLE) — and `if 'FU6' in groups and False:` in the comparer
# with 'box-shadow' dropped from the probe's STYLES, logged as an ordinary "queue 975", was NOT-TRIGGERED; the next Simple
# release would then have been judged by the weaker instrument. No list of knobs can see every way code goes blind, so:
#   · ANY release that changes an instrument file fires the gate, whatever its label: it needs a PASS on its exact tree
#     (the self-test then proves every plant is still caught BY THE CHANGED INSTRUMENT) and a line he reads,
#     `INSTRUMENT CHANGE: <what>` (or `LOOSENS THE LOCK: <why>`) in its POLISH-LOG line;
#   · and every group the probe runs must have a plant caught IN it (plant_gaps), so switching a group's comparison off
#     cannot pass that PASS — FU6 had none until now;
#   · and the probe's own lists (the styles, attributes, keys, sizes, environments, widths it measures) shrinking is a
#     loosening, read like the four knobs.
INSTRUMENT_MARK = 'INSTRUMENT CHANGE:'
# THE LISTS ARE READ AS JAVASCRIPT, not by a regex (6 Oct): v2's reader took every quoted string in a list's text, and the
# probe's comments carry apostrophes — HOLDS's "HEAD's threshold, the driver's wait", HOVER_MORE's "its picture's margin" —
# so it paired quotes ACROSS them and read junk like `', 350, 200, 430, '`: HOVER_MORE's selectors were not read at all
# (an entry taken out read as nothing), and HOLDS's numbers only by that accident. Now comments are stripped outside
# strings and each list is split at its own top-level commas:
#   · a list of plain words (STYLES, ATTRS …): each word;
#   · a list of entries whose parts are plain (KEYS, FU6_SIZES, HOLDS …): each entry WHOLE — a hold's wait moved from 430
#     to 600, straight past a timer moved to 500 (the review's own escape), reads as the old entry lost;
#   · a list of entries with lists or functions inside (HOVER, HOVER_MORE, FRIEND): each part as `name › part`, so a
#     selector taken out of an entry is lost, and one added is not a loosening;
#   · ENV_SETTINGS, an object (the Settings the env-* runs turn off their defaults): its `key: value` pairs — one taken
#     out, or set back to its default, is a Setting no longer measured off it.
PROBE_LISTS = ('STYLES', 'ATTRS', 'SVG_ATTRS', 'PSEUDO', 'KEYS', 'KEYS_TWICE', 'SWEEP_CODES', 'SWEEP_MODS', 'FU6_SIZES',
               'HOVER', 'HOVER_MORE', 'HOLDS', 'FRIEND', 'ALL', 'ENV_SETTINGS')
NO_PLANT_GROUPS = ('FU7',)   # a record of "no switch yet" (it refuses PASS by itself once one exists): nothing to plant in it


def _js_scan(text, i, n=None):
    """The index just past the string, line comment or block comment that starts at text[i], or None if none does."""
    n = len(text) if n is None else n
    c = text[i]
    if c in '\'"`':
        j = i + 1
        while j < n and text[j] != c:
            j += 2 if text[j] == '\\' else 1
        return min(j + 1, n)
    if text.startswith('//', i):
        j = text.find('\n', i)
        return n if j < 0 else j
    if text.startswith('/*', i):
        j = text.find('*/', i + 2)
        return n if j < 0 else j + 2
    return None


def _js_literal(text, name):
    """('[' or '{', the literal's inside) for `var NAME = [...]` / `{...}`, matched by depth outside strings and comments."""
    m = re.search(r'\bvar %s\s*=\s*([\[{])' % name, text or '')
    if not m:
        return None, None
    i0 = m.start(1)
    depth, j, n = 0, i0, len(text)
    while j < n:
        k = _js_scan(text, j, n)
        if k is not None:
            j = k
            continue
        c = text[j]
        if c in '([{':
            depth += 1
        elif c in ')]}':
            depth -= 1
            if depth == 0:
                return m.group(1), text[i0 + 1:j]
        j += 1
    return None, None


def _js_items(body):
    """The top-level comma-separated parts of a literal's inside, comments dropped, whitespace collapsed."""
    items, cur, depth, j, n = [], [], 0, 0, len(body)
    while j < n:
        k = _js_scan(body, j, n)
        if k is not None:
            if body[j] in '\'"`':
                cur.append(body[j:k])
            else:
                cur.append(' ')
            j = k
            continue
        c = body[j]
        if c in '([{':
            depth += 1
        elif c in ')]}':
            depth -= 1
        if c == ',' and depth == 0:
            items.append(''.join(cur))
            cur = []
        else:
            cur.append(c)
        j += 1
    items.append(''.join(cur))
    return [re.sub(r'\s+', ' ', x).strip() for x in items if x.strip()]


def _js_words(x):
    return [m.group(2) for m in re.finditer(r"(['\"`])((?:(?!\1)[^\\]|\\.)*)\1", x)]


def probe_lists(text):
    """{list name: set of its entries} for the probe's measured lists (how each kind is read: the comment above)."""
    out = {}
    for name in PROBE_LISTS:
        kind, body = _js_literal(text, name)
        if kind is None:
            continue
        items = _js_items(body)
        if kind == '{':
            out[name] = set(items)
            continue
        if not any(x.startswith('[') for x in items):
            out[name] = set(w for x in items for w in _js_words(x))
            continue
        got = set()
        for x in items:
            parts = _js_items(x[1:-1]) if x.startswith('[') and x.endswith(']') else [x]
            if not any(p.startswith('[') or p.startswith('function') or p.startswith('async') or '=>' in p for p in parts):
                got.add(x)
                continue
            nm = (_js_words(parts[0]) or [parts[0]])[0]
            for p in parts[1:]:
                if p.startswith('[') and p.endswith(']'):
                    got.update('%s › %s' % (nm, q) for q in _js_items(p[1:-1]))
                else:
                    got.add('%s › %s' % (nm, p))
        out[name] = got
    return out


def probe_groups(text):
    m = re.search(r"\bvar ALL = \[([^\]]*)\];", text or '')
    return [x.strip().strip('\'"') for x in m.group(1).split(',') if x.strip()] if m else []


def plant_gaps(probe_text, plants_text, sh_text=None):
    """The probe groups no plant is caught in (a plant is caught in the LAST group of its prefix) — and, when the driver's
    text is given, the runs of its FU_RUNS no plant is measured in (the second review: a run nobody plants in could have
    its comparison switched off and still PASS)."""
    import json
    try:
        ps = json.loads(plants_text).get('plants') or []
    except Exception:
        return ['(the plants file does not read)']
    caught, labels = set(), set()
    for p in ps:
        gs = [g for g in str(p.get('groups') or '').split(',') if g]
        if gs:
            caught.add(gs[-1])
        labels.update(p.get('widths') or [])
    gaps = [g for g in probe_groups(probe_text) if g not in caught and g not in NO_PLANT_GROUPS]
    if sh_text is not None:
        gaps += ['the run %s' % r for r in sorted(shell_runs(sh_text)) if r not in labels]
    return gaps


def shell_runs(sh_text):
    """{label: (size, input, env, set of groups)} of the driver's FU_RUNS block (the second review: where Full is measured)."""
    m = re.search(r"^FU_RUNS='\n(.*?)\n'", sh_text or '', re.M | re.S)
    out = {}
    if not m:
        return out
    for line in m.group(1).split('\n'):
        f = line.split('#', 1)[0].split()
        if len(f) >= 5:
            out[f[0]] = (f[1], f[2], f[3], set(g for g in f[4].split(',') if g))
    return out


def shell_widths(sh_text):
    """The runs' labels (v2 called them widths)."""
    return set(shell_runs(sh_text))


def instrument_terms(sh_text, cmp_text, plants_text):
    """(the FU_INVISIBLE keys, {tolerance: value}, the plant names, the PNG_UNSTABLE entries) of one copy of the instrument."""
    import json
    inv, tol, names, unstable = set(), {}, set(), set()
    m = re.search(r"^FU_INVISIBLE='\n(.*?)\n'", sh_text or '', re.M | re.S)
    if m:
        for line in m.group(1).split('\n'):
            line = line.split('#', 1)[0].strip()
            if line:
                inv.add(line.split()[0])
    for k in TOL_VARS:
        t = re.search(r'^%s=(\d+)' % k, sh_text or '', re.M)
        if t:
            tol[k] = int(t.group(1))
    try:
        names = set(p.get('name') for p in json.loads(plants_text).get('plants') or [])
    except Exception:
        names = set()
    u = re.search(r'^PNG_UNSTABLE\s*=\s*\[([^\]]*)\]', cmp_text or '', re.M)
    if u:
        unstable = set(x.strip().strip('\'"') for x in u.group(1).split(',') if x.strip())
    return inv, tol, names, unstable


def loosenings(root):
    """What the tree's instrument stops seeing that HEAD's saw. Empty when HEAD has no instrument (nothing to loosen)."""
    files = ('tools/full-unchanged.sh', 'tools/_fu_compare.py', 'tools/full-unchanged-plants.json', 'tests/full-unchanged.html')
    head = [sh(['git', 'show', 'HEAD:' + f], root) for f in files]
    if not head[0]:
        return []
    now = []
    for f in files:
        try:
            now.append(io.open(os.path.join(root, f), encoding='utf-8').read())
        except OSError:
            now.append('')
    hi, ht, hp, hu = instrument_terms(*head[:3])
    ni, nt, np_, nu = instrument_terms(*now[:3])
    out = ['FU_INVISIBLE gains %s' % k for k in sorted(ni - hi)]
    for k in TOL_VARS:
        if k in ht and (k not in nt or nt[k] > ht[k]):
            out.append('%s %s → %s' % (k, ht[k], nt.get(k, 'gone')))
    out += ['the %s plant is gone' % n for n in sorted(hp - np_)]
    out += ['the pictures stop comparing %s' % u for u in sorted(nu - hu)]
    # the probe's own lists, and the widths the driver runs
    hl, nl = probe_lists(head[3]), probe_lists(now[3])
    for name in PROBE_LISTS:
        if name in hl:
            gone = sorted(hl[name] - nl.get(name, set()))
            if gone:
                out.append('the probe’s %s loses %s' % (name, ', '.join(gone[:4]) + (' …' if len(gone) > 4 else '')))
    hr, nr = shell_runs(head[0]), shell_runs(now[0])
    gw = sorted(set(hr) - set(nr))
    if gw:
        out.append('the runs measured lose %s' % ', '.join(gw))
    for lab in sorted(set(hr) & set(nr)):
        a, b = hr[lab], nr[lab]
        if a[:3] != b[:3]:
            out.append('the run %s is no longer %s %s %s' % (lab, a[0], a[1], a[2]))
        lost = sorted(a[3] - b[3])
        if lost:
            out.append('the run %s loses %s' % (lab, ', '.join(lost)))
    return out


def source_hash(root):
    h = hashlib.sha256()
    h.update(('HEAD ' + sh(['git', 'rev-parse', 'HEAD'], root).strip() + '\n').encode())
    paths = app_paths(root) + HASH_FILES
    for rel in paths:
        p = os.path.join(root, rel)
        h.update(rel.encode() + b'\0')
        try:
            h.update(hashlib.sha256(open(p, 'rb').read()).hexdigest().encode())
        except OSError:
            h.update(b'missing')
        h.update(b'\n')
    return h.hexdigest()[:24]


def stale_busters(root):
    """Changed js / css files whose ?v= in index.html still equals HEAD's. tools/ship.sh BUMPS these before this gate
    runs, which changes index.html — so a PASS measured before the bump is for a tree that never ships, and the gate
    refuses it after a ninety-minute measurement. tools/full-unchanged.sh asks this first and will not measure until
    they are bumped (the same rule ship.sh's buster gate reads: js/*.js, styles.css, theme-glass.css)."""
    try:
        now = io.open(os.path.join(root, 'index.html'), encoding='utf-8').read()
    except OSError:
        return []
    was = sh(['git', 'show', 'HEAD:index.html'], root)
    out = []
    for f in changed_files(root):
        if not re.match(r'^(js/.*\.js|styles\.css|theme-glass\.css)$', f):
            continue
        a = re.search(re.escape(f) + r'\?v=([0-9.]+)', now)
        b = re.search(re.escape(f) + r'\?v=([0-9.]+)', was)
        if a and b and a.group(1) == b.group(1):
            out.append('%s (still ?v=%s)' % (f, a.group(1)))
    return out


def check(root):
    """For tools/ship.sh. Returns (code, message): 0 OK / not triggered, 1 refuse."""
    logline = newest_log_line(root)
    files = changed_files(root)
    inst = instrument_changed(files)           # any instrument file: a Simple release may change none of them
    fire = instrument_firing(root, inst)       # …and the ones whose change fires the gate on its own
    if inst and LOOSEN_MARK not in logline:
        loose = loosenings(root)
        if loose:
            return 1, ('REFUSE: this release makes the Full-unchanged lock see less than HEAD’s did (%s), and its POLISH-LOG '
                       'line does not say so. Write "%s <why>" in that line, so the loosening is a line he reads, not a '
                       'quiet edit — or put the instrument back.' % ('; '.join(loose[:4]) + (' …' if len(loose) > 4 else ''), LOOSEN_MARK))
    simple = trigger(logline, files, hook_lines(root, files))
    if not simple and not fire:
        return 0, 'NOT-TRIGGERED'
    why = list(simple)
    if fire:
        why.append('the diff changes the Full-unchanged instrument (%s)' % ', '.join(fire))
        if INSTRUMENT_MARK not in logline and LOOSEN_MARK not in logline:
            return 1, ('REFUSE: this release changes the instrument that judges every Simple release (%s), and its POLISH-LOG '
                       'line does not say so. Write "%s <what>" in that line — whatever the item it ships under — and give it '
                       'a PASS of its own (tools/full-unchanged.sh), so the changed instrument is proved to still catch every '
                       'plant before anything is judged by it.' % (', '.join(fire), INSTRUMENT_MARK))
        try:
            gaps = plant_gaps(io.open(os.path.join(root, 'tests/full-unchanged.html'), encoding='utf-8').read(),
                              io.open(os.path.join(root, 'tools/full-unchanged-plants.json'), encoding='utf-8').read(),
                              io.open(os.path.join(root, 'tools/full-unchanged.sh'), encoding='utf-8').read())
        except OSError:
            gaps = ['(the probe, the plants file or the driver is missing)']
        if gaps and LOOSEN_MARK not in logline:
            return 1, ('REFUSE: this release changes the instrument (%s), and no self-test plant is caught in %s — so a PASS '
                       'could not show that part still sees anything (switching its comparison off would pass). Add a plant '
                       'caught there (tools/full-unchanged-plants.json: its groups ending in that group, or that run in its widths).'
                       % (', '.join(fire), ', '.join(gaps)))
    others = other_queues(logline)
    if simple and others:
        return 1, ('REFUSE: this is a Simple release (%s), and the newest POLISH-LOG line also names queue %s. A Simple release '
                   'ships ALONE, so any difference from HEAD is Simple’s and a rollback takes it back alone — ship the other '
                   'item(s) separately, or write them as #NNN if they are only mentioned.' % ('; '.join(simple), ', '.join(others)))
    app = [f for f in files if is_app_path(f)]
    if inst and app:
        # (An instrument change with NO app file in the same release — the lock's own releases, which say queue 980 — is
        # allowed: it cannot hide a change to Full, because it carries none, and it still needs its own PASS below, so
        # the self-test proves the changed instrument still sees every plant.)
        return 1, ('REFUSE: this release fires the Full-unchanged gate (%s), and it changes the instrument (%s) as well as the '
                   'app (%s). A release cannot loosen the lock that judges it: ship the instrument change in a release of its '
                   'own first (one that changes no app file), then this one against it.'
                   % ('; '.join(why), ', '.join(inst), ', '.join(app[:4]) + (' …' if len(app) > 4 else '')))
    want = source_hash(root)
    try:
        got = open(os.path.join(root, PASS_FILE)).read().split()
    except OSError:
        got = []
    if not got or got[0] != want:
        return 1, ('REFUSE: this release fires the Full-unchanged gate (%s), and tools/full-unchanged.sh has not printed PASS on this exact tree '
                   '(sources %s; the last PASS was for %s). Run it DETACHED — `nohup tools/full-unchanged.sh > /dev/null '
                   '2>&1 &` (over an hour, far over the Bash tool’s cap) — and ship again once tools/.full-unchanged-report '
                   'ends in PASS.' % ('; '.join(why), want, got[0] if got else 'nothing'))
    return 0, 'OK: full-unchanged PASS on this tree (%s) — %s' % (want, '; '.join(why))


# ─── THE SELF-TEST'S FIXTURES ───────────────────────────────────────────────────────────────────────────────────────────
# One added line from EVERY hunk BUILD-PLAN §4.1 puts into a shared file (step 1.2, re-anchored 1 Oct on v17.21), verbatim.
# The review counted 17 of 22 that v1's pattern could not see; each one must fire now.
STEP_1_2 = [
    ('1.2.1', 'js/storage.js', '    sanitizeSmLayer(l);   // Simple mode P1: runs wherever this does — load, import, undo restore, the collab clone, export'),
    ('1.2.1', 'js/storage.js', "  const SM_FLAGS = ['main', 'stay', 'tail', 'twin', 'muteByMode', 'unit'];"),
    ('1.2.1', 'js/storage.js', '  function smPlain(v, depth) {'),
    ('1.2.1', 'js/storage.js', "    ['srcW', 'srcH'].forEach(k => { if (k in l && !(typeof l[k] === 'number' && l[k] > 0 && l[k] <= 16384)) delete l[k]; });"),
    ('1.2.1', 'js/storage.js', "    if ('pick' in l) {"),
    ('1.2.1', 'js/storage.js', '    if (sm.main) { delete sm.stay; delete sm.tail; delete sm.tailEnd; }   // main wins; a main clip is never a tail item'),
    ('1.2.2', 'js/storage.js', '    sanitizeSmProject(p);   // Simple mode P1 (§2.3): project.sm — v, adopted, home, muteClips, mrev, unknown plain keys kept'),
    ('1.2.3', 'js/storage.js', '      if (f.sm === 1) out.sm = 1;   // Simple mode P1: "added in Simple" (§8.5c) — kept only as exactly 1, top level and children alike'),
    ('1.2.4', 'js/storage.js', '  FM.storage.hydrating = function () { return !!_hydrating; };'),
    ('1.2.5', 'js/compositor.js', '  function layerAABB(l, t, scene, size) {'),
    ('1.2.6', 'js/compositor.js', '  FM.worldBox = function (layer, t, scene, size) { return layerAABB(layer, t, scene, size); };'),
    ('1.2.7', 'js/compositor.js', '  FM.groupNeedsUnit = groupNeedsUnit;   // Simple mode P1: a group that composites as ONE piece is a block (§2.5) — one rule, shared'),
    ('1.2.8', 'js/collab-core.js', '  /* Bumped to 7 by Simple mode Phase 1 (DESIGN.md §2.3, §14.2): the sanitiser now puts `layer.sm`, `project.sm`, an'),
    ('1.2.9', 'js/collab-core.js', "      sm: { main: 'yes', stay: true, row: 2, future: { a: 1 } }, srcW: 1920, srcH: -4, srcRev: 0, pick: { b: 'pk1', i: 2, x: 1 }"),
    ('1.2.9', 'js/collab-core.js', "      effects: [{ type: 'blur', enabled: true, params: { radius: 3 } }, { type: 'blur', enabled: true, sm: 1, params: { radius: 2 } }, { type: 'blur', enabled: true, sm: 'x', params: { radius: 1 } }],"),
    ('1.2.10', 'js/collab-core.js', '    const PJ = SCHEMA_PROJECT_FIXTURE();'),
    ('1.2.11', 'js/collab-core.js', "                    '|p' + P.canon(PJ) + '|smv' + (FM.SM_V || 0));   // SM_V moves only with a SCHEMA_REV bump (§2.3)"),
    ('1.2.12', 'js/collab-core.js', '  C.SCHEMA_FP = 123;   // Simple mode P1 (SCHEMA_REV 7): measured by `921 S1 the schema fingerprint gate` on the tree shipped'),
    ('1.2.13', 'js/app.js', '  FM.addMediaLayer = function (rec, opts) {   // opts (Simple mode P1): { at: seconds, pick: {b, i} } — Simple\'s + lays a pick end to end'),
    ('1.2.14', 'js/app.js', "    const at = (opts && typeof opts.at === 'number' && isFinite(opts.at)) ? Math.max(0, opts.at) : null;"),
    ('1.2.15', 'js/app.js', '    if (rec.width > 0 && rec.height > 0 && rec.width <= 16384 && rec.height <= 16384) { layer.srcW = rec.width; layer.srcH = rec.height; layer.srcRev = layer.mediaRev || 0; }'),
    ('1.2.16', 'js/app.js', '    return layer;   // Simple mode P1: the layer that landed — handleFiles\' {at} advances by it; every other caller ignores it'),
    ('1.2.17', 'js/app.js', '  FM._handleFiles = function (files, opts) { return handleFiles(files, opts); };'),
    ('1.2.18', 'js/app.js', "    const pickB = 'pk' + Date.now().toString(36).slice(-6) + Math.floor(Math.random() * 1296).toString(36);"),
    ('1.2.18', 'js/app.js', '  async function handleFiles(files, opts) {'),
    ('1.2.19', 'js/app.js', "    if (FM.spine && FM.spine.onCopy) FM.spine.onCopy(inserts, 'duplicate');   // Simple mode P1: a copy is not a second main clip"),
    ('1.2.20', 'js/app.js', "    if (FM.spine && FM.spine.onCopy) FM.spine.onCopy(copies.map(c => c.copy), 'paste');   // Simple mode P1 (§12.2)"),
    ('1.2.21', 'js/ai-ops.js', "            if (FM.spine && FM.spine.onCopy) FM.spine.onCopy(copy, 'aiClone');   // Simple mode P1 (§12.2): never a second main clip"),
    ('1.2.22', 'index.html', '  <script src="js/spine.js?v=1"></script>         <!-- Simple mode P1: FM.spine, the read side — after scene.js, before compositor/storage -->'),
]
# Ordinary lines that must stay quiet (an ordinary release that adds one would be refused for ever: it changes Full on
# purpose, so it could never get a PASS). The review's nine, and the shipped lines each new hook nearly caught.
QUIET = [
    ('styles.css', '.fx-sm-thumb { }'), ('js/app.js', 'const isSimpleShape = s => s.type === "rect";'),
    ('js/app.js', 'function isSimplePath(p) {'), ('index.html', '<div id="cv-edge-hint"></div>'), ('js/app.js', 'FM.editorState = {};'),
    ('index.html', '<div class="ins-sm-row">'), ('styles.css', '  --sm-gap: 4px;'), ('js/app.js', "  el('div', 'cv-edit-row');"),
    ('styles.css', '.thumb-sm-wrap { }'), ('styles.css', '  border-radius: var(--radius-sm);'), ('styles.css', '  --radius-sm: 6px;'),
    ('styles.css', '.sb-handle::before, .sb-rot::before { content: ""; }'), ('js/app.js', "  ' #topbar, #topbar-m, .sb-handle, button,'"),
    ('js/timeline.js', '    const srcW = Math.max(8, Math.round((m.duration / sd.rate) * sd.pps));'),
    ('js/variant.js', '    writeLog({ name: String(name), pick: pick, t: Date.now() });'),
    ('js/inspector.js', '      drop.addEventListener(\'click\', () => FM.eyedropper.pick(c => { apply(c); }));'),
    ('js/ai-ops.js', "    var at = (opts && typeof opts.at === 'number' && isFinite(opts.at)) ? opts.at : (FM.time || 0);"),
    ('js/motion-path.js', "      const sm = mkBtn('Smooth path', 'mp-smooth');"), ('js/exporter.js', '        if (sm && (sm.file || sm.audioBuffer)) {'),
    ('js/collab-core.js', '  C.SCHEMA_REV = 7;   // #482 polish batch 6: four more effects gained controls'),
    ('js/collab-core.js', '  C.SCHEMA_FP = 836365476955739;   // #482 polish batch 5 (SCHEMA_REV 6): eight grading effects gained controls'),
    ('js/compositor.js', '  function groupNeedsUnit(g, t) {'), ('js/storage.js', '    if (FM._mediaBusy) return 0;               // a pack is hydrating; its ids are in flight'),
    ('styles.css', 'prism-shine'), ('styles.css', 'chasm-edge'), ('styles.css', 'transform-origin'), ('styles.css', 'smooth-scroll'),
    ('js/app.js', "document.getElementById('cv-mini-exp')"), ('js/app.js', 'FM.editPoints()'),
    # the second review's six (6 Oct): each refused an ordinary "queue 975" release, with no override — common idioms all
    ('js/timeline.js', 'const PAD = { sm: 4, md: 8, lg: 16 };'), ('styles.css', '.hm-card.hydrating { opacity: .6; }'),
    ('js/home.js', "  el.classList.add('pick');"), ('js/inspector.js', '  const fn = FM.eyedropper.pick;'),
    ('styles.css', '.chip.sm { padding: 2px 6px; }'), ('js/app.js', "  if (mode === 'simple mode') return;   // the export sheet's simple mode"),
    ('js/app.js', '  FM.editorHints = function () { return 1; };'), ('js/app.js', '  FM.spineless = true;'),
]
# Lines that OPEN a block REGION_HEAD must not take for one of Simple's own functions (the second review: an ordinary helper
# named FM.editorHints shipped quietly, and the next one-line fix inside it was refused as Simple's — a prefix, not a name).
QUIET_REGIONS = ['  FM.editorHints = function () {', '  FM.spineless = function () {', '  FM.worldBoxes = function (a) {',
                 '  FM.timedListsCache = async function () {', '  function smPlainish(v) {']
REGION_FIXTURE = '\n'.join([
    "  function ordinary(a) {",                        # 1
    "    return a + 1;",                               # 2
    "  }",                                             # 3
    "  function sanitizeSmLayer(l) {",                 # 4  ← a region opens
    "    if (!l || typeof l !== 'object') return;",    # 5
    "    const s = '{ not a brace }'; /* { nor this */",  # 6
    "    if (x) {",                                    # 7
    "      y();",                                      # 8
    "    }",                                           # 9
    "    // } and not this",                           # 10
    "    if (typeof v === 'number') return isFinite(v);",  # 11
    "  }",                                             # 12 ← it closes
    "  function after(b) {",                           # 13
    "    return b;",                                   # 14
    "  }",                                             # 15
])


def selftest():
    """Each case is a way the lock could fail to fire, or fire on something that is not Simple. Run by ship.sh before the
    gate is trusted, as tools/_classify.py's self-test is."""
    fails = []

    def expect(name, got, want):
        if bool(got) != want:
            fails.append('%s: expected %s, got %r' % (name, 'FIRE' if want else 'quiet', got))
    expect('queue 980 (partial) in the log', trigger('- v17.30 — queue 980 (partial): the engine', [], []), True)
    expect('queue 980 in the log', trigger('- v17.31 — queue 980: done', [], []), True)
    expect('queue 9801 is not 980', trigger('- v17.30 — queue 9801', [], []), False)
    expect('#980 is a mention, not a claim', trigger('- v17.30 — queue 975 (see #980)', [], []), False)
    expect('a Simple-owned file changed, logged under a hunt (§21 F10)', trigger('- v17.30 — (hunt HIGH #3) fix', ['js/spine.js'], []), True)
    expect('a NEW Simple-owned file', trigger('- v17.30 — queue 1001', ['js/editor-mode.js'], []), True)
    expect('a Simple hook added to app.js under a later number', trigger('- v17.30 — queue 1001', ['js/app.js'], [('js/app.js', '+', 'if (FM.spine && FM.spine.running) return;', 'FM.spine')]), True)
    expect('a Simple hook removed from timeline.js', trigger('- v17.30', ['js/timeline.js'], [('js/timeline.js', '-', 'if (FM.editor.isSimple()) return;', 'FM.editor')]), True)
    expect('a line inside sanitizeSmLayer changed', trigger('- v17.30 — (hunt HIGH #3)', ['js/storage.js'], [('js/storage.js', '~', '@@ -11 +11 @@ inside lines 4–12 of HEAD', 'a region')]), True)
    expect('an ordinary release', trigger('- v17.30 — queue 975: the export sheet', ['js/app.js', 'styles.css'], []), False)
    n_trig = 10
    # the hook rules: every step-1.2 hunk fires, by at least one of its lines
    by_hunk = {}
    for hunk, f, line in STEP_1_2:
        if not SHARED.match(f):
            fails.append('step %s’s file %s is not a shared file — SHARED misses it' % (hunk, f))
        by_hunk.setdefault(hunk, []).append(hook_of(f, line))
    for hunk, got in sorted(by_hunk.items(), key=lambda kv: [int(x) for x in kv[0].split('.')]):
        if not any(got):
            fails.append('step %s of BUILD-PLAN §4.1 has no line any hook matches — a later fix there would skip the lock' % hunk)
    # (a line deep inside sanitizeSmLayer that names nothing Simple — `if (sm.main) { delete sm.stay; … }` — is covered by
    # its hunk's other lines when it is added, and by the REGION rule when it is changed later: see the regions below)
    # …and v1's own cases still fire
    for s in ['FM.editor.request(\'full\')', 'body.ed-simple #transport', '#cv-editor { }', '.cv-ed-bar', 'isSimple()',
              'FM.spine.shiftKeys', 'simpleTimeline.rebuild()', '#sm-timeline', 'class="sm-chip"', '#btn-sm-split { display: none }',
              "document.getElementById('ed-live')", 'layer.sm.twin = true;', 'l.pick = { b: pickB, i: pickI++ };']:
        if not hook_of('js/app.js', s):
            fails.append('the hooks miss %r' % s)
    for f, s in QUIET:
        h = hook_of(f, s)
        if h:
            fails.append('the hooks fire (%s) on the ordinary %s line %r' % (h, f, s))
    for s in QUIET_REGIONS:
        if REGION_HEAD.search(s):
            fails.append('REGION_HEAD takes the ordinary %r for one of Simple’s own functions (a prefix, not a name)' % s)
    for s in ['  FM.spine = function () {', '  FM.editor = { request: function () {', '  FM.timedLists = function (layer) {',
              '  FM.worldBox = function (layer, t, scene, size) {', '  function sanitizeSmLayer(l) {', '  FM.spine.classify = function (doc) {']:
        if not REGION_HEAD.search(s):
            fails.append('REGION_HEAD misses Simple’s own %r' % s)
    # the version label and a ?v= buster, masked, are the same line (the second review: ship.sh writes both into the Simple
    # release's one commit, and git blame then credited them to Simple for ever)
    if bump_mask('<span class="ver" title="x">v17.24</span>') != bump_mask('<span class="ver" title="x">v17.25</span>'):
        fails.append('bump_mask does not hide the version label')
    if bump_mask('  <script src="js/app.js?v=469"></script>') != bump_mask('  <script src="js/app.js?v=470"></script>'):
        fails.append('bump_mask does not hide a ?v= buster')
    if bump_mask('  <script src="js/app.js?v=469"></script>') == bump_mask('  <script src="js/spine.js?v=469"></script>'):
        fails.append('bump_mask hides more than the number (a renamed script reads as a bump)')
    # the shared files: the review found theme-glass.css loaded by index.html and outside SHARED
    for f in ['js/app.js', 'styles.css', 'theme-glass.css', 'index.html', 'sw.js']:
        if not SHARED.match(f):
            fails.append('SHARED does not cover %s' % f)
    for f in ['tests/tests.js', 'tools/ship.sh', 'REQUESTS.md']:
        if SHARED.match(f):
            fails.append('SHARED wrongly covers %s' % f)
    # regions: braces in strings and comments are not braces; an edit inside fires, one outside does not
    regs = simple_regions(REGION_FIXTURE)
    if regs != [(4, 12)]:
        fails.append('simple_regions found %r in the fixture, want [(4, 12)]' % regs)
    if not hunks_in_regions('@@ -11 +11 @@', regs):
        fails.append('a change to line 11 (inside sanitizeSmLayer, no Simple name on it) does not fire')
    if not hunks_in_regions('@@ -7,0 +8 @@', regs):
        fails.append('an insertion after line 7 (inside sanitizeSmLayer) does not fire')
    if not hunks_in_regions('@@ -12 +12 @@', regs):
        fails.append('a change to line 12 (sanitizeSmLayer’s own closing brace) does not fire')
    if hunks_in_regions('@@ -2 +2 @@', regs) or hunks_in_regions('@@ -14 +14 @@', regs) or hunks_in_regions('@@ -12,0 +13 @@', regs):
        fails.append('a change OUTSIDE sanitizeSmLayer fires')
    # the instrument lock
    if instrument_changed(['js/app.js', 'tools/_fu_compare.py']) != ['tools/_fu_compare.py']:
        fails.append('a changed comparer is not seen as an instrument change')
    for f in ['tools/full-unchanged.sh', 'tools/_fu_gate.py', 'tools/full-unchanged-plants.json', 'tests/full-unchanged.html', 'tests/_cdp.py', 'tools/ship.sh']:
        if not instrument_changed([f]):
            fails.append('%s is not part of the instrument' % f)
    if instrument_changed(['js/app.js', 'tests/tests.js', 'POLISH-LOG.md']):
        fails.append('an app or log file is read as an instrument change')
    for f in ['tools/full-unchanged-plants.json']:
        if f not in HASH_FILES:
            fails.append('%s is not in the PASS hash' % f)
    if 'tests/tests.js' in PROBE_FILES:
        fails.append('tests/tests.js is served to the probe again — the suite would run inside the frame being measured')
    # the other-queue rule
    if other_queues('- v17.30 — queue 980 (partial) and queue 975') != ['975']:
        fails.append('another queue NNN in a Simple line is not seen')
    if other_queues('- v17.30 — queue 980 (partial); the bug #975 found') != []:
        fails.append('a #NNN mention is read as a second queue item')
    if other_queues('- v17.30 — queue 980 (partial), queue 980 again') != []:
        fails.append('queue 980 twice reads as another item')
    fails += selftest_repo()
    fails += selftest_ship_order(os.path.abspath(os.path.join(os.path.dirname(__file__), 'ship.sh')))
    return fails, n_trig


def selftest_ship_order(path):
    """WHERE tools/ship.sh asks (review of v1, finding 10): once before prove.sh and the suite passes, and AGAIN after the
    last of them and immediately before `git add -A`, with nothing between that second check and the add that could
    change the tree — or an edit made during the ninety-minute suite is committed under the earlier PASS. check() itself
    refuses a changed tree (selftest_repo, step 5); this proves ship.sh still asks it at the moment that matters."""
    fails = []
    try:
        src = io.open(path, encoding='utf-8').read()
    except OSError:
        return ['tools/ship.sh could not be read for the gate-order check']
    code = '\n'.join(l for l in src.split('\n') if not l.lstrip().startswith('#'))
    calls = [m.start() for m in re.finditer(r'python3 tools/_fu_gate\.py check\b', code)]
    selft = code.find('python3 tools/_fu_gate.py selftest')
    prove = code.find('tools/prove.sh')
    suite = [m.start() for m in re.finditer(r'tests/_cdp\.py', code)]
    add = code.find('git add -A')
    if len(calls) != 2:
        return ['tools/ship.sh asks the full-unchanged gate %d time(s), not twice (before the proof, and again just before the commit)' % len(calls)]
    if not (0 <= selft < calls[0] < prove):
        fails.append('tools/ship.sh does not run the gate self-test, then the gate, before prove.sh')
    if not (suite and suite[-1] < calls[1] < add):
        fails.append('tools/ship.sh does not ask the gate again AFTER its last suite run and BEFORE git add -A')
    between = code[calls[1]:add]
    # only the refusal's own words may run there: an if, an echo (to the terminal, never redirected into a file), an exit
    others = [l.strip() for l in between.split('\n')[1:] if l.strip() and
              (not re.match(r'^(if |fi$|then$|echo |_WHY=|exit |\[ |_FU_)', l.strip()) or re.search(r'>>|>\s*[^&\s|]', l))]
    if others:
        fails.append('tools/ship.sh runs something between the second gate check and git add -A: %r' % others[:3])
    return fails


def selftest_repo():
    """The rules that need a real repository — provenance, the instrument lock, the PASS cache — run against a scratch git
    repo made here (two releases: an ordinary one, then a Simple one), and the tree edited the ways that went wrong once."""
    import tempfile, shutil
    fails = []
    d = tempfile.mkdtemp(prefix='fu-gate-')
    env = dict(os.environ)
    if os.path.exists('/Library/Developer/CommandLineTools/usr/bin/git'):
        env['DEVELOPER_DIR'] = '/Library/Developer/CommandLineTools'
    env.update(GIT_AUTHOR_NAME='fu', GIT_AUTHOR_EMAIL='fu@x', GIT_COMMITTER_NAME='fu', GIT_COMMITTER_EMAIL='fu@x')

    def git(*a):
        return subprocess.run(['git'] + list(a), cwd=d, env=env, capture_output=True, text=True)

    def write(rel, text):
        p = os.path.join(d, rel)
        os.makedirs(os.path.dirname(p) or d, exist_ok=True)
        with io.open(p, 'w', encoding='utf-8') as fh:
            fh.write(text)

    def gate(log):
        write('POLISH-LOG.md', LOG0 + log + '\n')
        return check(d)
    try:
        git('init', '-q')
        LOG0 = '# log\n- v1 — queue 975: an ordinary release\n'
        A = ['function layerAABB(l, t) {', '  const box = l.box;', '  const sz = layerSizeAt(l, t);', '  return box;', '}',
             'function after() {', '  return 2;', '}']
        write('POLISH-LOG.md', LOG0)
        write('js/app.js', '\n'.join(A) + '\n')
        write('styles.css', '.a { color: red; }\n')
        IX = ['<!doctype html>', '<div class="brand">FreeMotion <span class="ver" title="x">v1.0</span></div>',
              '<script src="js/scene.js?v=10"></script>', '<script src="js/app.js?v=20"></script>',
              '<script src="js/storage.js?v=30"></script>', '</body>']
        write('index.html', '\n'.join(IX) + '\n')
        write('tools/_fu_compare.py', "# the comparer\nif 'FU2' in groups:\n    pass\n")
        SH0 = ("#!/bin/bash\nFU_INVISIBLE='\nlayer.srcW       # I2\nmeta.SCHEMA_REV  # N1\n'\nFU_TOL_PX=3   # measured\nFU_CHAN=24\nFU_GRID_TOL=4\n"
               "FU_RUNS='\n380   380x800   touch  -   FU1,FU2,FU7\n1280  1280x800  mouse  -   FU1,FU2,FU7\n440x956  440x956  touch  -  FU1,FU2   # his phone\n'\n")
        PL0 = '{"plants": [{"name": "margin", "groups": "FU1", "widths": ["380", "1280"]}, {"name": "toast", "groups": "FU1,FU2", "widths": ["440x956"]}]}\n'
        PR0 = ("<script>\n  var ALL = ['FU1', 'FU2', 'FU7'];\n  var STYLES = ['display', 'box-shadow',\n    'outline'];\n  var PSEUDO = ['::before', '::after'];\n"
               "  var ENV_SETTINGS = { sort: 'name', demoMode: true,\n    homeLight: false };\n"
               # the comments carry apostrophes, as the probe's do (v2's reader paired quotes across them)
               "  var HOLDS = [   // [what, HEAD's threshold, the driver's wait short of it, past it (ms), and the two steps' names]\n"
               "    ['the clip hold', 350, 200, 430, 'hold 200 ms', 'hold 430 ms']\n  ];\n"
               # HOVER_MORE as the probe has it (6 Oct), word for word: v2's reader saw NONE of its selectors
               "  var HOVER_MORE = [   // [what, candidate selectors, how it is reached, canvases hidden for its picture, its picture's margin (null: its own size; -1: no picture)]\n"
               "    ['menu item', ['#ctx-menu .ctx-item:not(.disabled) ~ .ctx-item:not(.disabled)'], 'the layer menu', '', null],\n"
               "    ['add tab', ['.addmenu-tab:not(.active)'], 'nothing selected', '', null],\n"
               "    ['clip grip', ['#tl-tracks .clip.selected .clip-grip.right', '#tl-tracks .clip .clip-grip.right'], 'Clip A selected', '', null],\n"
               "    ['effect category', ['#fx-browser .fxb-banner'], 'the effects browser', '', -1],\n"
               "    ['cog bar', ['#cv-fr-bar', '#cv-fr-exp'], 'the cog', '', null]\n  ];\n</script>\n")
        write('tools/full-unchanged.sh', SH0)
        write('tools/full-unchanged-plants.json', PL0)
        write('tests/full-unchanged.html', PR0)
        CDP0 = ['def launch():', '    args = ["--headless=new", "--no-first-run"]', '    return args', '', '', '', '', '', '', '', '',
                'def loop():', '    want_shot = cdp.eval("window.__fmWantShot")', '    shot = cdp.send("Page.captureScreenshot", clip=c, scale=1)', '    return shot']
        SHIP0 = ['#!/bin/bash', 'run_suite() { python3 tests/_cdp.py --port 8777; }', '', '', '', '', '', '', '', '', '',
                 'python3 tools/_fu_gate.py check || exit 1', 'git add -A']
        write('tests/_cdp.py', '\n'.join(CDP0) + '\n')
        write('tools/ship.sh', '\n'.join(SHIP0) + '\n')
        git('add', '-A')
        git('commit', '-q', '-m', 'v1')
        # the Simple release: one line of Full's function rewritten with nothing Simple on it, and a two-line block — and,
        # as ship.sh writes it, the version label and two busters bumped in the same commit, plus one line of its own
        B = list(A)
        B[2] = '  const sz = size || layerSizeAt(l, t); if (!sz) return null;'
        B[3:3] = ['  // the box at its native size', '  if (sz.w > 0) { box.w = sz.w; }']
        LOG0 = LOG0 + '- v2 — queue 980 (partial): the engine\n'
        write('POLISH-LOG.md', LOG0)
        write('js/app.js', '\n'.join(B) + '\n')
        IX2 = list(IX)
        IX2[1] = IX[1].replace('v1.0', 'v1.1')
        IX2[3] = IX[3].replace('?v=20', '?v=21')
        IX2[4] = IX[4].replace('?v=30', '?v=31')
        IX2[5] = '<i class="hint"></i></body>'
        write('index.html', '\n'.join(IX2) + '\n')
        git('add', '-A')
        git('commit', '-q', '-m', 'v2')
        head = git('rev-parse', 'HEAD').stdout.strip()
        if not is_simple_commit(d, head):
            fails.append('provenance: a commit whose POLISH-LOG line says queue 980 is not read as a Simple release')
        if is_simple_commit(d, git('rev-parse', 'HEAD~1').stdout.strip()):
            fails.append('provenance: an ordinary release is read as a Simple one')

        def edit(lines, log='- v3 — (hunt HIGH #3) a one-line fix'):
            write('js/app.js', '\n'.join(lines) + '\n')
            return gate(log)
        # (1) a hunt fix to the Simple release's line that names nothing Simple: fires (no PASS, so REFUSE)
        C = list(B); C[2] = '  const sz = size || layerSizeAt(l, t, 1); if (!sz) return null;'
        code, msg = edit(C)
        if code != 1 or 'Simple release' not in msg:
            fails.append('provenance: a hunt fix to a line the Simple release wrote did not fire (%s)' % msg[:120])
        # (2) …and to an ordinary line next to it: quiet
        C = list(B); C[1] = '  const box = l.box || null;'
        code, msg = edit(C)
        if code != 0 or msg != 'NOT-TRIGGERED':
            fails.append('provenance: a fix to an ordinary line fired (%s)' % msg[:160])
        # (3) an insertion INSIDE the Simple block fires; one between two ordinary lines does not
        C = list(B); C[4:4] = ['  box.n = 1;']
        if edit(C)[0] != 1:
            fails.append('provenance: a line inserted inside the Simple release’s block did not fire')
        C = list(B); C[7:7] = ['  const x = 1;']
        if edit(C) != (0, 'NOT-TRIGGERED'):
            fails.append('provenance: a line inserted between two ordinary lines fired')
        write('js/app.js', '\n'.join(B) + '\n')
        # (3b) THE NEXT ORDINARY RELEASE AFTER A SIMPLE ONE (the second review's blocker): it bumps the version label and the
        #      same busters again — lines git blame credits to the Simple commit — and must not be read as Simple's
        IX3 = list(IX2)
        IX3[1] = IX2[1].replace('v1.1', 'v1.2')
        IX3[3] = IX2[3].replace('?v=21', '?v=22')
        IX3[4] = IX2[4].replace('?v=31', '?v=32')
        write('index.html', '\n'.join(IX3) + '\n')
        write('styles.css', '.a { color: red; }\n.b { color: blue; }\n')
        code, msg = gate('- v3 — queue 975: an ordinary release')
        if (code, msg) != (0, 'NOT-TRIGGERED'):
            fails.append('provenance: an ordinary release that bumps the label and busters a Simple release last bumped was read as Simple’s (%s)' % msg[:200])
        # (3c) …and a script line inserted between two busters the Simple release only re-numbered
        IX4 = list(IX2)
        IX4[4:4] = ['<script src="js/new.js?v=1"></script>']
        write('index.html', '\n'.join(IX4) + '\n')
        code, msg = gate('- v3 — queue 975: an ordinary release')
        if (code, msg) != (0, 'NOT-TRIGGERED'):
            fails.append('provenance: a line inserted between two busters a Simple release only re-numbered fired (%s)' % msg[:200])
        # (3d) CONTROL: the line the Simple release REALLY wrote in index.html is still Simple's
        IX5 = list(IX2)
        IX5[5] = '<i class="hint2"></i></body>'
        write('index.html', '\n'.join(IX5) + '\n')
        code, msg = gate('- v3 — queue 975: an ordinary release')
        if code != 1 or 'Simple release' not in msg:
            fails.append('provenance CONTROL: a change to a line the Simple release really wrote in index.html did not fire (%s)' % msg[:200])
        write('index.html', '\n'.join(IX2) + '\n')
        write('styles.css', '.a { color: red; }\n')
        # (4) the instrument: a Simple release that also changes the comparer is refused for THAT; the lock's own
        # release (queue 980, the instrument and nothing in the app) is not — it needs its declaration and its own PASS
        write('tools/_fu_compare.py', "# the comparer, tightened\nif 'FU2' in groups:\n    pass\n")
        write('js/spine.js', '// Simple\n')
        code, msg = gate('- v3 — queue 980 (partial): more. INSTRUMENT CHANGE: the comparer')
        if code != 1 or 'as well as the app' not in msg:
            fails.append('the instrument lock: a Simple release that also changes the comparer was not refused for it (%s)' % msg[:160])
        os.remove(os.path.join(d, 'js/spine.js'))
        code, msg = gate('- v3 — queue 980 (partial): the lock itself. INSTRUMENT CHANGE: the comparer')
        if code != 1 or 'as well as the app' in msg or 'has not printed PASS' not in msg:
            fails.append('the instrument lock: an instrument-only release was refused for the wrong reason (%s)' % msg[:200])
        # (4b) THE SECOND REVIEW'S ROUTE: any instrument change fires, whatever its label, and says so in a line he reads
        for log in ('- v3 — queue 980 (partial): the lock itself', '- v3 — queue 975: a tidy-up of the probe', '- v3 — (hunt LOW #2) the comparer'):
            code, msg = gate(log)
            if code != 1 or INSTRUMENT_MARK not in msg:
                fails.append('the instrument rule: an instrument change logged as %r was not refused for its missing declaration (%s)' % (log, msg[:160]))
        code, msg = gate('- v3 — queue 975: a tidy-up. %s the comparer’s words' % INSTRUMENT_MARK)
        if code != 1 or 'has not printed PASS' not in msg:
            fails.append('the instrument rule: a declared instrument change under an ordinary label did not need its PASS (%s)' % msg[:200])
        # (4b') THE REPLAY (6 Oct): an ordinary release that changes the SUITE's part of tests/_cdp.py or ship.sh is not an
        #       instrument change — 12 of the last 60 releases did, and each would have been refused with no way through —
        #       while one that changes the lock's part of either is
        write('tools/_fu_compare.py', "# the comparer\nif 'FU2' in groups:\n    pass\n")
        for rel, lines, at, new, fires in (
                ('tests/_cdp.py', CDP0, 1, '    args = ["--headless=new", "--no-first-run", "--disable-mdns"]', False),
                ('tests/_cdp.py', CDP0, 13, '    shot = cdp.send("Page.captureScreenshot", clip=c, scale=0.5)', True),
                ('tools/ship.sh', SHIP0, 1, 'run_suite() { python3 tests/_cdp.py --port 8777 --timeout 3600; }', False),
                ('tools/ship.sh', SHIP0, 11, 'python3 tools/_fu_gate.py check || true', True)):
            ed = list(lines); ed[at] = new
            write(rel, '\n'.join(ed) + '\n')
            code, msg = gate('- v3 — queue 975: an ordinary release')
            if fires and (code != 1 or INSTRUMENT_MARK not in msg):
                fails.append('the instrument rule: a change to the lock’s part of %s (%r) did not fire (%s)' % (rel, new, msg[:160]))
            if not fires and (code, msg) != (0, 'NOT-TRIGGERED'):
                fails.append('the instrument rule: an ordinary release changing the suite’s part of %s (%r) fired (%s)' % (rel, new, msg[:200]))
            if not fires:   # …and a Simple release still may not change it at all
                write('js/spine.js', '// Simple\n')
                code, msg = gate('- v3 — queue 980 (partial): more')
                if code != 1 or 'as well as the app' not in msg:
                    fails.append('the instrument lock: a Simple release that also changes %s was not refused for it (%s)' % (rel, msg[:160]))
                os.remove(os.path.join(d, 'js/spine.js'))
            write(rel, '\n'.join(lines) + '\n')
        write('tools/_fu_compare.py', "# the comparer, tightened\nif 'FU2' in groups:\n    pass\n")
        # (4c) a group with no plant caught in it: the PASS could not show it still sees anything
        write('tools/full-unchanged-plants.json', '{"plants": [{"name": "margin", "groups": "FU1", "widths": ["380", "1280"]}, {"name": "toast", "groups": "FU1", "widths": ["440x956"]}]}\n')
        code, msg = gate('- v3 — queue 975: a tidy-up. %s the plants' % INSTRUMENT_MARK)
        if code != 1 or 'no self-test plant is caught in FU2' not in msg:
            fails.append('the instrument rule: a probe group with no plant caught in it was not refused (%s)' % msg[:200])
        # (4c') …and a RUN of FU_RUNS that no plant is measured in (the second review: a run nobody plants in can go blind)
        write('tools/full-unchanged-plants.json', '{"plants": [{"name": "margin", "groups": "FU1", "widths": ["380", "1280"]}, {"name": "toast", "groups": "FU1,FU2", "widths": ["380"]}]}\n')
        code, msg = gate('- v3 — queue 975: a tidy-up. %s the plants' % INSTRUMENT_MARK)
        if code != 1 or 'the run 440x956' not in msg:
            fails.append('the instrument rule: a run with no plant measured in it was not refused (%s)' % msg[:200])
        write('tools/full-unchanged-plants.json', PL0)
        # (4d) the review's loosen.py: a group's comparison switched off by code and 'box-shadow' dropped from the probe's
        #      STYLES, declared only as a tidy-up — the list's shrink is a loosening
        write('tests/full-unchanged.html', PR0.replace("'box-shadow',\n", '\n'))
        write('tools/_fu_compare.py', "# the comparer\nif 'FU2' in groups and False:\n    pass\n")
        code, msg = gate('- v3 — queue 975: a tidy-up of the probe. %s tidy' % INSTRUMENT_MARK)
        if code != 1 or LOOSEN_MARK not in msg or 'box-shadow' not in msg:
            fails.append('the loosening rule: dropping box-shadow from the probe’s STYLES was not refused as a loosening (%s)' % msg[:200])
        write('tests/full-unchanged.html', PR0)
        write('tools/_fu_compare.py', "# the comparer, tightened\nif 'FU2' in groups:\n    pass\n")
        # (5) the PASS cache: a PASS for this exact tree lets it through; ANY later change to a source refuses it again
        write(PASS_FILE, source_hash(d) + ' now HEAD=x\n')
        code, msg = gate('- v3 — queue 980 (partial): the lock itself. INSTRUMENT CHANGE: the comparer')
        if code != 0 or not msg.startswith('OK'):
            fails.append('the PASS cache: a PASS for the instrument-only tree was not accepted (%s)' % msg[:200])
        write('tools/_fu_compare.py', "# the comparer\nif 'FU2' in groups:\n    pass\n")    # back to HEAD's: a Simple release with no instrument change
        code, msg = gate('- v3 — queue 980 (partial): the lock itself')
        if code != 1 or 'has not printed PASS' not in msg:
            fails.append('the PASS cache: a PASS taken with a different comparer was accepted (%s)' % msg[:160])
        write(PASS_FILE, source_hash(d) + ' now HEAD=x\n')
        code, msg = gate('- v3 — queue 980 (partial): the lock itself')
        if code != 0 or not msg.startswith('OK'):
            fails.append('the PASS cache: a PASS for this exact tree was not accepted (%s)' % msg[:200])
        for rel, text in (('styles.css', '.a { color: red; }\n.b{}\n'), ('js/new-file.js', '//\n'), ('index.html', '<!doctype html><p>\n')):
            old = io.open(os.path.join(d, rel), encoding='utf-8').read() if os.path.exists(os.path.join(d, rel)) else None
            write(rel, text)
            code, msg = gate('- v3 — queue 980 (partial): the lock itself')
            if code != 1 or 'has not printed PASS' not in msg:
                fails.append('the PASS cache: a later change to %s did not invalidate it (%s)' % (rel, msg[:160]))
            if old is None:
                os.remove(os.path.join(d, rel))
            else:
                write(rel, old)
        if gate('- v3 — queue 980 (partial): the lock itself')[0] != 0:
            fails.append('the PASS cache: putting the tree back did not restore the PASS (the hash is not a function of the tree)')
        # (6) the instrument may not see less than HEAD's without saying so — whatever the line's label, gate or no gate
        #     (the review's selfloosen.py: one added mask line, and a clip moved 0.5 s read "same as HEAD")
        for what, rel, text in (('a key added to FU_INVISIBLE', 'tools/full-unchanged.sh', SH0.replace("meta.SCHEMA_REV  # N1\n", "meta.SCHEMA_REV  # N1\nlayer.start      # I99\n")),
                                ('a picture tolerance raised', 'tools/full-unchanged.sh', SH0.replace('FU_TOL_PX=3', 'FU_TOL_PX=12')),
                                ('a threshold raised', 'tools/full-unchanged.sh', SH0.replace('FU_CHAN=24', 'FU_CHAN=40')),
                                ('a plant taken out', 'tools/full-unchanged-plants.json', '{"plants": [{"name": "margin", "groups": "FU1,FU2"}]}\n'),
                                ('a run taken out', 'tools/full-unchanged.sh', SH0.replace('440x956  440x956  touch  -  FU1,FU2   # his phone\n', '')),
                                ('a group taken from a run', 'tools/full-unchanged.sh', SH0.replace('440x956  440x956  touch  -  FU1,FU2', '440x956  440x956  touch  -  FU1')),
                                ('a run moved to another size', 'tools/full-unchanged.sh', SH0.replace('440x956  440x956  touch', '440x956  380x800  touch')),
                                ('the pseudo-elements no longer read', 'tests/full-unchanged.html', PR0.replace("var PSEUDO = ['::before', '::after'];", "var PSEUDO = ['::before'];")),
                                # the env runs' Settings (an object, not a list): one taken out, one set back to its default
                                ('a Setting the env runs no longer turn', 'tests/full-unchanged.html', PR0.replace(" demoMode: true,", "")),
                                ('a Setting set back to its default', 'tests/full-unchanged.html', PR0.replace("homeLight: false", "homeLight: true")),
                                # a bracketed hold's "past" wait moved past a 500 ms timer, its step's words kept
                                ('a hold’s wait moved, its name kept', 'tests/full-unchanged.html', PR0.replace("350, 200, 430,", "350, 200, 600,")),
                                # a hovered kind taken out, and a selector taken out of one
                                ('a hovered kind taken out', 'tests/full-unchanged.html', PR0.replace("    ['cog bar', ['#cv-fr-bar', '#cv-fr-exp'], 'the cog', '', null]\n", "").replace("'the effects browser', '', -1],", "'the effects browser', '', -1]")),
                                ('a hovered kind’s selector taken out', 'tests/full-unchanged.html', PR0.replace("'#tl-tracks .clip.selected .clip-grip.right', '#tl-tracks .clip .clip-grip.right'", "'#tl-tracks .clip.selected .clip-grip.right'")),
                                ('a hovered kind’s selector swapped for a looser one', 'tests/full-unchanged.html', PR0.replace("'#ctx-menu .ctx-item:not(.disabled) ~ .ctx-item:not(.disabled)'", "'#ctx-menu .ctx-item'"))):
            old = io.open(os.path.join(d, rel), encoding='utf-8').read()
            write(rel, text)
            for log in ('- v3 — queue 980 (partial): the lock itself', '- v3 — queue 975: a tidy-up', '- v3 — (hunt LOW #2) the probe'):
                code, msg = gate(log)
                if code != 1 or LOOSEN_MARK not in msg:
                    fails.append('the loosening rule: %s, logged as %r, was not refused for it (%s)' % (what, log, msg[:160]))
            code, msg = gate('- v3 — queue 980 (partial): %s the probe needed it (measured)' % LOOSEN_MARK)
            if 'see less' in msg:
                fails.append('the loosening rule: %s was refused even though the line declares it' % what)
            write(rel, old)
        write('tools/full-unchanged.sh', SH0.replace('FU_TOL_PX=3', 'FU_TOL_PX=2'))   # TIGHTER: never a loosening
        if 'see less' in gate('- v3 — queue 980 (partial): the lock itself')[1]:
            fails.append('the loosening rule: a LOWER tolerance was read as a loosening')
        write('tools/full-unchanged.sh', SH0)
        for what, text in (('one more Setting in the env runs', PR0.replace("homeLight: false", "homeLight: false, playbackQuality: 'detail'")),
                           ('one more selector for a hovered kind', PR0.replace("['#cv-fr-bar', '#cv-fr-exp']", "['#cv-fr-bar', '#cv-fr-exp', '#cv-fr-x']")),
                           ('one more hovered kind', PR0.replace("'the cog', '', null]\n", "'the cog', '', null],\n    ['key rail', ['#key-s'], 'Clip A selected', '', null]\n"))):
            write('tests/full-unchanged.html', text)   # MORE measured: never a loosening
            if 'see less' in gate('- v3 — queue 980 (partial): the lock itself')[1]:
                fails.append('the loosening rule: %s was read as a loosening' % what)
        write('tests/full-unchanged.html', PR0)
    except Exception as e:
        fails.append('the repository self-test could not run: %s' % e)
    finally:
        shutil.rmtree(d, ignore_errors=True)
    return fails


def main():
    root = os.environ.get('FU_ROOT') or os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
    cmd = sys.argv[1] if len(sys.argv) > 1 else 'check'
    if cmd == 'selftest':
        f, n = selftest()
        if f:
            print('❌ the full-unchanged gate self-test failed:')
            for x in f:
                print('   · ' + x)
            return 1
        print('✅ the full-unchanged gate self-test passed (%d trigger cases, %d step-1.2 lines over %d hunks, %d quiet lines, '
              'the regions, the instrument lock, the other-queue rule; on a scratch repo: provenance, the instrument rule, the PASS '
              'cache, the loosening rule; and where ship.sh asks — before the proof and again just before the commit)' % (n, len(STEP_1_2), len(set(h for h, _, _ in STEP_1_2)), len(QUIET)))
        return 0
    if cmd == 'hash':
        print(source_hash(root))
        return 0
    if cmd == 'snapshot-head':
        print(snapshot_head(root, sys.argv[2]))
        return 0
    if cmd == 'snapshot-tree':
        print(snapshot_tree(root, sys.argv[2]))
        return 0
    if cmd == 'why':
        files = changed_files(root)
        why = trigger(newest_log_line(root), files, hook_lines(root, files))
        if instrument_firing(root, instrument_changed(files)):
            why.append('the diff changes the Full-unchanged instrument (%s)' % ', '.join(instrument_firing(root, instrument_changed(files))))
        print('\n'.join(why) or 'not triggered')
        return 0
    if cmd == 'stale-busters':
        s = stale_busters(root)
        if s:
            print(', '.join(s))
            return 1
        return 0
    code, msg = check(root)
    print(msg)
    return code


if __name__ == '__main__':
    sys.exit(main())
