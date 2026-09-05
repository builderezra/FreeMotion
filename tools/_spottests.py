#!/usr/bin/env python3
"""The tests a commit is ABOUT: for every hunk it made in tests/tests.js, the test() declaration that
encloses the hunk in the post-commit file. Added tests and edited tests both land here. Used by
tools/spotcheck.sh; kept out of that script because a heredoc full of quotes inside "$( )" is exactly
the kind of thing macOS's bash 3.2 mis-parses. Prints one title per line.

    python3 tools/_spottests.py <commit>
"""
import re, subprocess, sys

def titles_for(h):
    """h = a commit, or '--worktree' for the uncommitted changes against HEAD (tools/prove.sh)."""
    if h == '--worktree':
        diff = subprocess.run(['git', 'diff', 'HEAD', '-U0', '--', 'tests/tests.js'], capture_output=True, text=True).stdout
        post = open('tests/tests.js', encoding='utf-8').read().split('\n')
    else:
        diff = subprocess.run(['git', 'show', '--format=', '-U0', h, '--', 'tests/tests.js'],
                              capture_output=True, text=True).stdout
        post = subprocess.run(['git', 'show', h + ':tests/tests.js'], capture_output=True, text=True).stdout.split('\n')
    head = re.compile(r"""^\s*test\(\s*(['"])""")
    def decl_title(line):
        """The JS string literal that opens a test() call, escapes honoured — a regex `(.*?)\1\s*,` stopped at the first
        quote followed by a comma INSIDE the title (v15.38's title carries one) and reported a truncated name."""
        m = head.match(line)
        if not m: return None
        q = m.group(1); i = m.end(); buf = []
        while i < len(line):
            c = line[i]
            if c == '\\' and i + 1 < len(line):
                buf.append(line[i + 1]); i += 2; continue
            if c == q: return ''.join(buf)
            buf.append(c); i += 1
        return None
    out, seen = [], set()
    for m in re.finditer(r'^@@ -\d+(?:,\d+)? \+(\d+)(?:,(\d+))? @@', diff, re.M):
        start = int(m.group(1)); n = int(m.group(2) or 1)
        for ln in range(max(start, 1), max(start, 1) + max(n, 1)):
            i = min(ln, len(post)) - 1
            while i >= 0:
                t = decl_title(post[i])
                if t is not None:
                    if t not in seen:
                        seen.add(t); out.append(t)
                    break
                if post[i].startswith('  });') or post[i].startswith('});'):
                    break          # walked back past the end of a previous test: the hunk is outside any test
                i -= 1
    return out

if __name__ == '__main__':
    for t in titles_for(sys.argv[1]):
        print(t)
