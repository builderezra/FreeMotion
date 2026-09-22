#!/usr/bin/env python3
"""The APP SOURCE files a change touches substantively — used by tools/spotcheck.sh and tools/prove.sh to decide
whether there is a fix to revert. index.html counts only if its diff has a line that is not the version label
or a ?v= cache-buster bump: a tests-only release bumps both and has nothing to prove (v15.48 was accused of a
DEAD test for exactly that on 5 Sep). Prints one path per line.

    python3 tools/_srcfiles.py <commit>        # the commit's changes
    python3 tools/_srcfiles.py --worktree      # uncommitted changes against HEAD (tracked and untracked)
"""
import re, subprocess, sys
h = sys.argv[1]
SRC = re.compile(r'^(index\.html|styles\.css|theme-glass\.css|sw\.js|manifest\.json|js/[^/]+\.js)$')
TRIVIAL = re.compile(r'class="ver"|\?v=[0-9.]+')
def run(*a): return subprocess.run(list(a), capture_output=True, text=True).stdout
if h == '--worktree':
    files = [l[3:].split(' -> ')[-1].strip() for l in run('git', 'status', '--porcelain').splitlines()]
    def diff(f): return run('git', 'diff', 'HEAD', '--', f)
else:
    # Against the FIRST PARENT, not `git show` / plain diff-tree: for a MERGE those print nothing (a combined diff
    # lists only files that differ from every parent), so a merged branch read as "no app source changed" and was
    # never proved (22 Sep, #912 — two merges of real CSS/JS came back "TESTS/DOCS ONLY"). For an ordinary
    # commit h^1..h is exactly what `show` printed, so nothing else moves.
    files = run('git', 'diff', '--name-only', h + '^1', h).split()
    def diff(f): return run('git', 'diff', h + '^1', h, '--', f)
for f in sorted(set(files)):
    if not SRC.match(f): continue
    if f == 'index.html':
        body = [l for l in diff(f).splitlines() if (l.startswith('+') or l.startswith('-')) and not l.startswith('+++') and not l.startswith('---')]
        if body and all(TRIVIAL.search(l) for l in body): continue   # version label / busters only
    print(f)
