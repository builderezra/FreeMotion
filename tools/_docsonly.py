#!/usr/bin/env python3
"""THE DOCS-ONLY FAST PATH (8 Oct — RULES-AUDIT B7, #1073). Used by tools/ship.sh.

    python3 tools/_docsonly.py paths  <path>...   # exit 0 when EVERY path is docs/process-only (and there is one), else 1
    python3 tools/_docsonly.py titles <path>...   # the tests in tests/tests.js that name a changed file, one per line
    python3 tools/_docsonly.py selftest

WHY. A release that changes only his record (REQUESTS.md, POLISH-LOG.md, LOOP.md…) or the process scripts that read it
(next.sh, tick.sh, inbox.sh, _classify.py) ran the whole suite twice — two hours on this laptop — for files the app never
loads. The 12-minute BATCH gate only ever postponed that cost; on 5 Oct 163 lines of his own words lived only on a Mac
that then rebooted. Such a release now runs every instant gate, then only the tests that NAME a changed file (a ?only=
slice), stages exactly those paths, and pushes. Anything else — one line of js/, styles.css, index.html, tests/, sw.js, a
gate script — gets the full suite as before: the allowlist is the audit's, and it is closed, not a pattern of "looks like
a doc".
"""
import os, re, sys

# The audit's list, exactly (RULES-AUDIT.md B7). Matched against repo-relative paths.
ALLOW = [
    re.compile(r'^(?:[^/]+/)*[^/]+\.md$'),                 # *.md anywhere (his record and the notes)
    re.compile(r'^tools/design/.+$'),                      # plans, sheets, PM state
    re.compile(r'^tools/unblock/.+$'),                     # the unblock list's source
    re.compile(r'^tools/\.spotcheck\.log$'),
    re.compile(r'^tools/\.weak-proofs\.log$'),
    re.compile(r'^tools/_classify\.py$'),                  # the queue classifier (self-tested by ship.sh's gates)
    re.compile(r'^tools/(next|tick|inbox|status)\.sh$'),   # the scripts that READ the queue and the inbox
]


def docs_only(paths):
    paths = [p.strip() for p in paths if p and p.strip()]
    if not paths:
        return False, []
    bad = [p for p in paths if not any(r.match(p) for r in ALLOW)]
    return not bad, bad


def titles(paths, tests_js):
    """Every test whose body (or title) names a changed file's basename — the cheap evidence that a process file still
    works. Found by its enclosing `  test('…'` declaration, so a basename in a comment counts too (better one test too many)."""
    names = sorted(set(os.path.basename(p.strip()) for p in paths if p.strip()))
    if not names:
        return []
    out, cur = [], None
    decl = re.compile(r"^  test\('((?:[^'\\]|\\.)*)'")
    for line in open(tests_js, encoding='utf-8'):
        m = decl.match(line)
        if m:
            cur = m.group(1).replace("\\'", "'")
        if cur and cur not in out and any(n in line for n in names):
            out.append(cur)
    return out


def selftest():
    bad = []
    def want(cond, what):
        if not cond:
            bad.append(what)
    ok, _ = docs_only(['REQUESTS.md', 'POLISH-LOG.md', 'tools/design/pm/PM-STATE.md', 'tools/next.sh', 'LOOP.md'])
    want(ok, 'his record + a design note + next.sh is docs-only')
    for p in ['js/app.js', 'styles.css', 'index.html', 'tests/tests.js', 'sw.js', 'tools/ship.sh', 'tools/prove.sh',
              'tools/_shipgates.py', 'tools/.test-floor', 'tools/.suite-seconds', 'manifest.json', 'tools/next.sh.bak',
              'tools/designs/x.md.js', 'vendor/mp4-muxer.js']:
        ok, b = docs_only(['REQUESTS.md', p])
        want(not ok and b == [p], 'a docs release with %s beside it is NOT docs-only, and names it' % p)
    ok, _ = docs_only([])
    want(not ok, 'an empty change list is never "docs-only" (nothing to ship is not a fast path)')
    ok, _ = docs_only(['tools/design/hunts/x.md', 'tools/unblock/unblock.html', 'tools/.spotcheck.log', 'tools/_classify.py'])
    want(ok, 'hunt notes, the unblock source, the spotcheck log and the classifier are docs-only')
    import tempfile
    d = tempfile.mkdtemp(prefix='fm-docsonly-')
    t = os.path.join(d, 'tests.js')
    open(t, 'w', encoding='utf-8').write(
        "  test('reads tools/next.sh output', {}, function () { run('next.sh'); });\n"
        "  test('unrelated', {}, function () {\n    x();\n  });\n"
        "  test('the version on screen matches the newest release in POLISH-LOG', {}, function () {\n"
        "    // reads POLISH-LOG.md\n  });\n"
        "  test('he\\'s quoted', {}, function () { /* LOOP.md */ });\n")
    got = titles(['tools/next.sh', 'POLISH-LOG.md', 'LOOP.md'], t)
    want(got == ['reads tools/next.sh output', 'the version on screen matches the newest release in POLISH-LOG', "he's quoted"],
         'titles: every test naming a changed basename, once, in order, quotes unescaped (got %r)' % (got,))
    want(titles(['tools/design/pm/zzz-nothing.md'], t) == [], 'a file no test names → no slice')
    if bad:
        print('❌ _docsonly self-test: ' + '; '.join(bad))
        return 1
    print('✅ _docsonly self-test: the allowlist, its refusals (%d non-docs paths) and the title slice' % 14)
    return 0


def main():
    if len(sys.argv) < 2:
        print(__doc__); return 2
    cmd, args = sys.argv[1], sys.argv[2:]
    if cmd == 'selftest':
        return selftest()
    if cmd == 'paths':
        ok, bad = docs_only(args)
        for b in bad:
            print(b)
        return 0 if ok else 1
    if cmd == 'titles':
        here = os.path.dirname(os.path.abspath(__file__))
        for t in titles(args, os.path.join(here, '..', 'tests', 'tests.js')):
            print(t)
        return 0
    print('unknown command ' + cmd); return 2


if __name__ == '__main__':
    sys.exit(main())
