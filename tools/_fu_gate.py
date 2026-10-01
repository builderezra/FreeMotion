#!/usr/bin/env python3
"""The "Full unchanged" gate's rules, in ONE place (queue 980; BUILD-PLAN.md §3.2 point 3; DESIGN.md §0.4.5, §21 F10).

His rule, 1 Oct: "i dont want the original editor changing in design and function". tools/full-unchanged.sh is the
instrument; this file decides WHEN tools/ship.sh must have seen it say PASS, and what "this tree" means for the cache.

    python3 tools/_fu_gate.py selftest     # every rule below, against cases that already went wrong once (or would)
    python3 tools/_fu_gate.py hash         # the source hash a PASS is cached under
    python3 tools/_fu_gate.py check        # what ship.sh runs: prints REFUSE: <why> and exits 1, or OK / NOT-TRIGGERED

The gate FIRES when any one of these is true (§3.2 point 3, and §21 F10 — "a Simple fix logged as a hunt finding or under
a later queue number must not skip the lock"):
  1. the newest POLISH-LOG line says `queue 980` (with or without "(partial)");
  2. the diff against HEAD touches a Simple-owned file (SIMPLE_FILES), added, changed or deleted;
  3. the diff adds — or removes — a line matching SIMPLE_HOOK in any OTHER js/*.js, styles.css or index.html.
When it fires, a release is REFUSED unless tools/full-unchanged.sh printed PASS on this exact tree (the cache in
tools/.full-unchanged-pass names the hash below), and refused if the newest POLISH-LOG line names any `queue NNN` other
than 980 (a Simple release ships alone, so any difference from HEAD is Simple's and a rollback takes it back alone).

Deliberate widenings of the plan's wording, both conservative (they can only make the lock fire MORE often):
  · a REMOVED hook line counts too: taking a Simple hook out of a shared file changes Full's code path just as adding one;
  · `sm-` is matched only at the start of a word (`prism-`, `chasm-` are not Simple), the one sub-pattern loose enough to
    fire on ordinary words. Measured on v17.21: every SIMPLE_HOOK alternative matches 0 lines of the shipped sources.
"""
import hashlib, io, os, re, subprocess, sys

SIMPLE_FILES = ['js/spine.js', 'js/spine-words.js', 'js/simple-timeline.js', 'js/editor-mode.js', 'js/simple-tools.js']
SIMPLE_HOOK = re.compile(r'isSimple|ed-simple|FM\.editor|FM\.spine|simpleTimeline|cv-ed|cv-editor|(?<![A-Za-z0-9_])sm-')
SHARED = re.compile(r'^(js/.*\.js|styles\.css|index\.html)$')
QUEUE = re.compile(r'queue (\d+)\b')
PASS_FILE = os.path.join('tools', '.full-unchanged-pass')

# What a PASS depends on. The app (every file it serves), plus the instrument itself: a changed probe, comparer or driver
# is a different measurement, so it must not inherit the old verdict.
HASH_DIRS = ['js', 'vendor', 'fx-art', 'launch']          # every folder index.html and the scripts load from (v17.21)
PROBE_FILES = ['tests/full-unchanged.html', 'tests/tests.js']   # served beside the app, from the TREE on both sides
HASH_FILES = PROBE_FILES + ['tests/_cdp.py', 'tools/full-unchanged.sh', 'tools/_fu_compare.py', 'tools/_fu_gate.py', 'tools/serve.sh']


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


def hook_lines(root, files):
    """(file, '+'/'-', text) for every added or removed line in the shared files that matches SIMPLE_HOOK."""
    hits = []
    shared = [f for f in files if SHARED.match(f) and f not in SIMPLE_FILES]
    untracked = set(sh(['git', 'ls-files', '--others', '--exclude-standard'], root).splitlines())
    for f in shared:
        if f in untracked:
            try:
                for t in io.open(os.path.join(root, f), encoding='utf-8', errors='replace'):
                    if SIMPLE_HOOK.search(t):
                        hits.append((f, '+', t.rstrip('\n')))
            except Exception:
                pass
            continue
        for t in sh(['git', 'diff', '-U0', 'HEAD', '--', f], root).splitlines():
            if (t.startswith('+') and not t.startswith('+++')) or (t.startswith('-') and not t.startswith('---')):
                if SIMPLE_HOOK.search(t[1:]):
                    hits.append((f, t[0], t[1:]))
    return hits


def trigger(logline, files, hooks):
    """-> list of reasons the gate fires (empty: it does not)."""
    why = []
    if '980' in QUEUE.findall(logline):
        why.append('the newest POLISH-LOG line says queue 980')
    owned = [f for f in files if f in SIMPLE_FILES]
    if owned:
        why.append('the diff touches Simple-owned ' + ', '.join(owned))
    if hooks:
        f, sign, t = hooks[0]
        why.append('the diff %s a Simple hook in %s (%s%s)%s' % ('adds' if sign == '+' else 'removes', f, sign, t.strip()[:90],
                                                               (' and %d more' % (len(hooks) - 1)) if len(hooks) > 1 else ''))
    return why


def other_queues(logline):
    return sorted(set(q for q in QUEUE.findall(logline) if q != '980'), key=int)


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
    want = source_hash(root)
    try:
        got = open(os.path.join(root, PASS_FILE)).read().split()
    except OSError:
        got = []
    if not got or got[0] != want:
        return 1, ('REFUSE: this is a Simple release (%s), and tools/full-unchanged.sh has not printed PASS on this exact tree '
                   '(sources %s; the last PASS was for %s). Run: tools/full-unchanged.sh' % ('; '.join(why), want, got[0] if got else 'nothing'))
    return 0, 'OK: full-unchanged PASS on this tree (%s) — %s' % (want, '; '.join(why))


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
    expect('a Simple hook added to app.js under a later number', trigger('- v17.30 — queue 1001', ['js/app.js'], [('js/app.js', '+', 'if (FM.spine && FM.spine.running) return;')]), True)
    expect('a Simple hook removed from timeline.js', trigger('- v17.30', ['js/timeline.js'], [('js/timeline.js', '-', 'if (FM.editor.isSimple()) return;')]), True)
    expect('an ordinary release', trigger('- v17.30 — queue 975: the export sheet', ['js/app.js', 'styles.css'], []), False)
    # the hook pattern itself: what it must see, and the ordinary words it must not
    for s in ['FM.editor.request(\'full\')', 'body.ed-simple #transport', '#cv-editor { }', '.cv-ed-bar', 'isSimple()',
              'FM.spine.shiftKeys', 'simpleTimeline.rebuild()', '#sm-timeline', 'class="sm-chip"']:
        if not SIMPLE_HOOK.search(s):
            fails.append('the hook pattern misses %r' % s)
    for s in ['prism-shine', 'chasm-edge', 'transform-origin', 'smooth-scroll', '.cv-mini-exp', 'FM.editPoints']:
        if SIMPLE_HOOK.search(s):
            fails.append('the hook pattern fires on ordinary %r' % s)
    # the other-queue rule
    if other_queues('- v17.30 — queue 980 (partial) and queue 975') != ['975']:
        fails.append('another queue NNN in a Simple line is not seen')
    if other_queues('- v17.30 — queue 980 (partial); the bug #975 found') != []:
        fails.append('a #NNN mention is read as a second queue item')
    if other_queues('- v17.30 — queue 980 (partial), queue 980 again') != []:
        fails.append('queue 980 twice reads as another item')
    return fails


def main():
    root = os.environ.get('FU_ROOT') or os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
    cmd = sys.argv[1] if len(sys.argv) > 1 else 'check'
    if cmd == 'selftest':
        f = selftest()
        if f:
            print('❌ the full-unchanged gate self-test failed:')
            for x in f:
                print('   · ' + x)
            return 1
        print('✅ the full-unchanged gate self-test passed (%d trigger cases, the hook pattern, the other-queue rule)' % 9)
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
    code, msg = check(root)
    print(msg)
    return code


if __name__ == '__main__':
    sys.exit(main())
