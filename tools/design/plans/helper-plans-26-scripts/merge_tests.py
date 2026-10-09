#!/usr/bin/env python3
"""Append each branch's NEW tests (what it added in front of `async function run()` since the commit it forked from) to main's tests/tests.js,
in order. Every audit branch appends at the same spot, so a git merge conflicts there every time; this is the union, and it parses.
usage: merge_tests.py BASE_SHA BRANCH [BRANCH ...]   (run inside the worktree; rewrites tests/tests.js; main = origin/main)"""
import subprocess, sys
def sh(*a): return subprocess.check_output(a, text=True)
M = '  async function run() {\n    var results = [];'
def split(t):
    i = t.index(M); return t[:i], t[i:]
base = sys.argv[1]
bpre, _ = split(sh('git', 'show', base + ':tests/tests.js'))
mpre, mpost = split(sh('git', 'show', 'origin/main:tests/tests.js'))
blocks = []
for b in sys.argv[2:]:
    pre, _ = split(sh('git', 'show', 'origin/hunt/' + b + ':tests/tests.js'))
    assert pre.startswith(bpre), b + ' did not fork from ' + base
    blocks.append(pre[len(bpre):])
open('tests/tests.js', 'w').write(mpre + ''.join(blocks) + mpost)
