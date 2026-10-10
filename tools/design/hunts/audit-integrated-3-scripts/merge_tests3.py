#!/usr/bin/env python3
"""Append each branch's NEW tests (what it added in front of `async function run()` since ITS OWN merge-base with origin/main) to main's tests.js, in order.
usage: merge_tests2.py BRANCH [BRANCH ...] (inside the worktree)"""
import subprocess, sys
def sh(*a): return subprocess.check_output(a, text=True).strip()
M = '  async function run() {\n    var results = [];'
def split(t): i = t.index(M); return t[:i], t[i:]
mpre, mpost = split(open('tests/tests.js').read())   # the CURRENT file: earlier merges' edits to existing tests must survive (INT2)
blocks = []
for b in sys.argv[1:]:
    base = sh('git', 'merge-base', 'origin/main', 'origin/hunt/' + b)
    bpre, _ = split(subprocess.check_output(['git', 'show', base + ':tests/tests.js'], text=True))
    pre, _ = split(subprocess.check_output(['git', 'show', 'origin/hunt/' + b + ':tests/tests.js'], text=True))
    assert pre.startswith(bpre), b + ' does not extend its base tests'
    blocks.append(pre[len(bpre):])
open('tests/tests.js', 'w').write(mpre + ''.join(blocks) + mpost)
