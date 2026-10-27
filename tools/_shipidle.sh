#!/bin/bash
# WHAT TO BUILD WHILE A SHIP RUNS — printed by tools/tick.sh during a ship (11 Oct).
#
#   tools/_shipidle.sh [repo dir] [idle minutes, default 15]
#
# WHY. "Build in a worktree meanwhile" was one sentence under the ship line, and a tick that read only the ship line
# did nothing else for twenty minutes while Ezra watched: "the builder looks like its slacking again" (11 Oct, the
# third time — his rule from 5 and 10 Oct is never to idle through a ship). Remembering failed, so the tick computes it:
# the next workable item (tools/_classify.py next_up, the same rule ship.sh's order gate reads), how long ago anything in
# a worktree last changed, and — past the limit — a line that cannot be read as progress.
set -uo pipefail
R="${1:-$(cd "$(dirname "$0")/.." && pwd)}"; LIM="${2:-15}"
cd "$R" || exit 1
python3 - "$LIM" <<'PY'
import glob, os, subprocess, sys, time
lim = int(sys.argv[1])
nx = 'nothing workable'
try:
    sys.path.insert(0, 'tools')
    import _classify as c
    r = c.next_up(open('REQUESTS.md', encoding='utf-8').read())
    if r: nx = r[2].strip()[:120]
except Exception as e:
    nx = '? (the classifier could not say: %s)' % str(e)[:60]
best, where = 0.0, ''
trees, seen = [], set()
main = os.path.realpath('.')
def add_tree(p):
    key = os.path.realpath(p)
    if key != main and key not in seen and os.path.isdir(p):
        seen.add(key)
        trees.append(p)
try:
    listing = subprocess.check_output(['git', 'worktree', 'list', '--porcelain', '-z'], stderr=subprocess.DEVNULL)
    registered = [os.fsdecode(field[9:]) for field in listing.split(b'\0') if field.startswith(b'worktree ')]
    if registered:
        main = os.path.realpath(registered[0])
    for p in registered:
        add_tree(p)
except (OSError, subprocess.CalledProcessError):
    pass
for p in sorted(glob.glob('.claude/worktrees/*')):
    add_tree(p)
roots = os.environ.get('FM_WORKTREE_ROOTS')
if roots is None:
    roots = os.pathsep.join(os.path.expanduser('~/' + name) for name in ('fm-helper-wt', 'fm-codex-wt'))
for root in roots.split(os.pathsep):
    if not root:
        continue
    try:
        with os.scandir(root) as entries:
            for entry in entries:
                if entry.is_dir():
                    add_tree(entry.path)
    except OSError:
        continue
for tree in trees:
    # Hundreds of stale worktrees share these roots: never walk whole trees (assets, caches and dependencies).
    paths = [os.path.join(tree, 'index.html')]
    for pattern in ('*.css', 'js/*.js', 'tests/*.js', 'tests/*.py', 'tools/*.sh', 'tools/*.py'):
        paths.extend(glob.glob(os.path.join(tree, pattern)))
    try:
        with open(os.path.join(tree, '.git'), encoding='utf-8') as f:
            pointer = f.readline().strip()
        if pointer.startswith('gitdir: '):
            gitdir = os.path.join(tree, pointer[8:])
            paths.append(os.path.normpath(os.path.join(gitdir, 'logs', 'HEAD')))
    except OSError:
        pass
    for p in paths:
        try:
            m = os.stat(p).st_mtime
        except OSError:
            continue
        if m > best:
            best, where = m, p
print('   next workable (oldest first): ' + nx)
if not where:
    print('⚠️ IDLE DURING SHIP: there is no worktree with a file in it — make one and build: ' + nx)
    sys.exit(0)
age = int((time.time() - best) // 60)
print('   newest edit in a worktree: %d min ago (%s)' % (age, where))
if age >= lim:
    print('⚠️ IDLE DURING SHIP: %d min since the last worktree edit — build, in a worktree (code only; no browser beside the ship): %s' % (age, nx))
PY
