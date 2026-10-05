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
     the file) — a later fix to a line of sanitizeSmLayer that names nothing Simple (`if (typeof v === 'number') …`).
When it fires, a release is REFUSED unless tools/full-unchanged.sh printed PASS on this exact tree (the cache in
tools/.full-unchanged-pass names the hash below); refused if the newest POLISH-LOG line names any `queue NNN` other
than 980 (a Simple release ships alone, so any difference from HEAD is Simple's and a rollback takes it back alone); and
refused if it changes the INSTRUMENT (INSTRUMENT_FILES: the probe, the comparer, the plants, the driver, this gate, the
server, ship.sh). A release cannot loosen the lock that judges it — the review moved a clip 0.5 s and added one mask line
and the run said "same as HEAD". An instrument change ships in a release of its own first, one that does not fire this.

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
# (what it is, the pattern, the only files it applies to — None for every shared file)
HOOKS = [
    ('isSimple()', r'\bisSimple\(', None),
    ('the ed-simple body class', r'(?<![\w-])ed-simple\b', None),
    ('FM.editor', r'\bFM\.editor\b', None),
    ('FM.spine', r'\bFM\.spine\b', None),
    ('simpleTimeline', r'\bsimpleTimeline\b', None),
    ('the cog’s Editor block', r'\bcv-ed(?:itor\b|-)', None),
    ('a Simple id or class', r'(?<![\w-])sm-[a-z]|\bbtn-sm-split\b|(?<![\w-])ed-live\b', None),
    ('a "Simple mode" marker', r'(?i)\bsimple[ -]mode\b', None),
    ('the layer’s sm key', r'\.sm\b(?![-\w])|(?<![\w$-])sm\s*:', None),
    ('Simple’s sanitiser', r'\bsanitizeSm\w*|\bsmPlain\b|\bsmKeepUnknown\b|\bSM_FLAGS\b|\bSM_V\b', None),
    ('a shared helper step 1.2 adds', r'\bFM\.(?:timedLists|trimClipEdge|worldBox|groupNeedsUnit|seamKey|divideSegment|renderStill|pickReplacement|swapInMedia|setClipSpeed|docRev)\b', None),
    ('a plain helper field', r'\.src(?:W|H|Rev)\b|\bsrc(?:W|H|Rev)\s*:|[\'"]src(?:W|H|Rev)[\'"]', None),
    ('a pick', r'\.pick\b(?!\s*\()|\bpick\s*:\s*\{|[\'"]pick[\'"]|\bpick[BI]\b', None),
    ('a split-boundary mark', r'(?<![\w$-])sb\s*:\s*1\b|\.sb\b(?![-\w])', None),
    ('onSplit', r'\bonSplit\b', None),
    ('the schema project fixture', r'\bSCHEMA_PROJECT_FIXTURE\b', None),
    ('the size-aware layerAABB', r'\blayerAABB\([^)]*\bsize\b', None),
    ('handleFiles with opts', r'\bhandleFiles\(\s*files\s*,\s*opts\s*\)', None),
    ('addMediaLayer’s at', r'\bopts\.at\b', ['js/app.js']),
    ('FM.storage.hydrating', r'\.hydrating\b', None),
    ('a Simple-owned script', r'\b(?:spine|spine-words|simple-timeline|editor-mode|simple-tools)\.js\b', None),
]
HOOKS_RE = [(n, re.compile(p), f) for (n, p, f) in HOOKS]
# A line in HEAD's copy of a shared file that OPENS one of Simple's own functions: every line until its closing brace is
# Simple's, whatever it names.
REGION_HEAD = re.compile(r'\bfunction\s+(?:sanitizeSm\w*|smPlain|smKeepUnknown)\b|\bSCHEMA_PROJECT_FIXTURE\s*=|'
                         r'\bFM\.(?:spine|editor|timedLists|trimClipEdge|worldBox)\w*(?:\.\w+)*\s*=\s*(?:async\s+)?function')
SHARED = re.compile(r'^(js/.*\.js|[^/]+\.css|index\.html|sw\.js)$')
QUEUE = re.compile(r'queue (\d+)\b')
PASS_FILE = os.path.join('tools', '.full-unchanged-pass')
# THE INSTRUMENT: what measures, judges and runs the lock. A Simple release may not change any of it (see the docstring).
INSTRUMENT_FILES = ['tools/full-unchanged.sh', 'tools/_fu_compare.py', 'tools/_fu_gate.py', 'tools/full-unchanged-plants.json',
                    'tests/full-unchanged.html', 'tests/_cdp.py', 'tools/serve.sh', 'tools/ship.sh']

# What a PASS depends on. The app (every file it serves), plus the instrument itself: a changed probe, comparer or driver
# is a different measurement, so it must not inherit the old verdict.
HASH_DIRS = ['js', 'vendor', 'fx-art', 'launch']          # every folder index.html and the scripts load from (v17.21)
PROBE_FILES = ['tests/full-unchanged.html', 'tests/tests.js']   # served beside the app, from the TREE on both sides
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
        if files is not None and path not in files:
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
    """Hunks of a `git diff -U0` whose HEAD-side lines fall inside a region (or, for a pure insertion, land inside one)."""
    hits = []
    for line in diff_text.splitlines():
        m = HUNK.match(line)
        if not m:
            continue
        a, b = int(m.group(1)), int(m.group(2)) if m.group(2) is not None else 1
        lines = range(a, a + b) if b > 0 else []
        for (s, e) in regions:
            if (b > 0 and any(s < x < e for x in lines)) or (b == 0 and s <= a < e):
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
    """{line: sha} for the given 1-based HEAD lines of f, in one `git blame` call."""
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
    out = {}
    for t in sh(['git', 'blame', '--porcelain'] + ranges + ['HEAD', '--', f], root).splitlines():
        m = re.match(r'^([0-9a-f]{40}) \d+ (\d+)', t)
        if m:
            out[int(m.group(2))] = m.group(1)
    return out


def simple_owned_lines(root, f, diff, head_text):
    """[(HEAD line, sha, hunk header)] for every hunk of `diff` that changes a line a Simple release wrote."""
    if not head_text:
        return []
    nmax = head_text.count('\n') + (0 if head_text.endswith('\n') else 1)
    want, hunks = set(), []
    for line in diff.splitlines():
        m = HUNK.match(line)
        if not m:
            continue
        a, b = int(m.group(1)), int(m.group(2)) if m.group(2) is not None else 1
        ls = list(range(a, a + b)) if b > 0 else [a, a + 1]
        hunks.append((line, b, ls))
        want.update(ls)
    if not hunks:
        return []
    who = blame_lines(root, f, want, nmax)
    out = []
    for (hdr, b, ls) in hunks:
        shas = [(x, who.get(x)) for x in ls if 1 <= x <= nmax]
        if b > 0:
            hit = [(x, s) for (x, s) in shas if s and is_simple_commit(root, s)]
        else:   # an insertion: inside a Simple block only if the lines on BOTH sides are Simple's
            hit = shas if len(shas) == 2 and all(s and is_simple_commit(root, s) for (_, s) in shas) else []
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
    why = trigger(logline, files, hook_lines(root, files))
    if not why:
        return 0, 'NOT-TRIGGERED'
    others = other_queues(logline)
    if others:
        return 1, ('REFUSE: this is a Simple release (%s), and the newest POLISH-LOG line also names queue %s. A Simple release '
                   'ships ALONE, so any difference from HEAD is Simple’s and a rollback takes it back alone — ship the other '
                   'item(s) separately, or write them as #NNN if they are only mentioned.' % ('; '.join(why), ', '.join(others)))
    inst = instrument_changed(files)
    app = [f for f in files if is_app_path(f)]
    if inst and app:
        # (An instrument change with NO app file in the same release — the lock's own releases, which say queue 980 — is
        # allowed: it cannot hide a change to Full, because it carries none, and it still needs its own PASS below, so
        # the self-test proves the changed instrument still sees every plant.)
        return 1, ('REFUSE: this is a Simple release (%s), and it changes the instrument that judges it (%s) as well as the '
                   'app (%s). A release cannot loosen its own lock: ship the instrument change in a release of its own first '
                   '(one that changes no app file), then this one against it.'
                   % ('; '.join(why), ', '.join(inst), ', '.join(app[:4]) + (' …' if len(app) > 4 else '')))
    want = source_hash(root)
    try:
        got = open(os.path.join(root, PASS_FILE)).read().split()
    except OSError:
        got = []
    if not got or got[0] != want:
        return 1, ('REFUSE: this is a Simple release (%s), and tools/full-unchanged.sh has not printed PASS on this exact tree '
                   '(sources %s; the last PASS was for %s). Run tools/full-unchanged.sh IN THE BACKGROUND (about 20 minutes, '
                   'over the Bash tool’s 600 s cap) and ship again once it says PASS.' % ('; '.join(why), want, got[0] if got else 'nothing'))
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
]
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
    # the other-queue rule
    if other_queues('- v17.30 — queue 980 (partial) and queue 975') != ['975']:
        fails.append('another queue NNN in a Simple line is not seen')
    if other_queues('- v17.30 — queue 980 (partial); the bug #975 found') != []:
        fails.append('a #NNN mention is read as a second queue item')
    if other_queues('- v17.30 — queue 980 (partial), queue 980 again') != []:
        fails.append('queue 980 twice reads as another item')
    fails += selftest_repo()
    return fails, n_trig


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
        write('index.html', '<!doctype html>\n')
        write('tools/_fu_compare.py', '# the comparer\n')
        git('add', '-A')
        git('commit', '-q', '-m', 'v1')
        # the Simple release: one line of Full's function rewritten with nothing Simple on it, and a two-line block
        B = list(A)
        B[2] = '  const sz = size || layerSizeAt(l, t); if (!sz) return null;'
        B[3:3] = ['  // the box at its native size', '  if (sz.w > 0) { box.w = sz.w; }']
        LOG0 = LOG0 + '- v2 — queue 980 (partial): the engine\n'
        write('POLISH-LOG.md', LOG0)
        write('js/app.js', '\n'.join(B) + '\n')
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
        # (4) the instrument: a Simple release that also changes the comparer is refused for THAT; the lock's own
        # release (queue 980, the instrument and nothing in the app) is not — it needs its own PASS instead
        write('tools/_fu_compare.py', '# the comparer, loosened\n')
        write('js/spine.js', '// Simple\n')
        code, msg = gate('- v3 — queue 980 (partial): more')
        if code != 1 or 'instrument' not in msg:
            fails.append('the instrument lock: a Simple release that also changes the comparer was not refused for it (%s)' % msg[:160])
        os.remove(os.path.join(d, 'js/spine.js'))
        code, msg = gate('- v3 — queue 980 (partial): the lock itself')
        if code != 1 or 'instrument' in msg or 'has not printed PASS' not in msg:
            fails.append('the instrument lock: an instrument-only release was refused for the wrong reason (%s)' % msg[:200])
        # (5) the PASS cache: a PASS for this exact tree lets it through; ANY later change to a source refuses it again
        write(PASS_FILE, source_hash(d) + ' now HEAD=x\n')
        code, msg = gate('- v3 — queue 980 (partial): the lock itself')
        if code != 0 or not msg.startswith('OK'):
            fails.append('the PASS cache: a PASS for the instrument-only tree was not accepted (%s)' % msg[:200])
        write('tools/_fu_compare.py', '# the comparer\n')    # back to HEAD's: a Simple release with no instrument change
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
              'the regions, the instrument lock, the other-queue rule)' % (n, len(STEP_1_2), len(set(h for h, _, _ in STEP_1_2)), len(QUIET)))
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
        print('\n'.join(trigger(newest_log_line(root), files, hook_lines(root, files))) or 'not triggered')
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
