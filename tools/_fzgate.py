#!/usr/bin/env python3
"""tools/_fzgate.py — WHEN THE COLLAB FUZZ BATTERY ('921 FZ') MUST RUN, AND WHETHER IT PASSED (17 Oct, the PM).

The thirteen convergence-fuzz seeds that once failed (hunt/fuzz-seeds → hunt/fz-seeds) are ~13 full fuzz passes, too long
for every suite pass. So every pass keeps one guard seed per family (43 and 28) and the battery is a slice of its own,
`?only=921 FZ`; in an ordinary pass it says NOT RUN HERE ("runs only in its own slice …"). tools/ship.sh's fz_pass runs the
slice, alone, whenever THIS release changes what the battery proves — and a red one refuses like any red:

  * any js/collab-*.js (the protocol, the host, the session, the diff, the bridge …), or
  * the fuzz's own helpers in tests/tests.js (FUZZ_FNS below): the fixture the seeds walk through. A change there re-rolls
    every seed, so the battery must be re-proved too.

  python3 tools/_fzgate.py changed           prints why it must run ("" = it need not); exit 2 when git could not answer
  python3 tools/_fzgate.py verdict <file>    exit 0 only when tests/_cdp.py's output says every named test RAN and passed
  python3 tools/_fzgate.py selftest          the rules above, on fixtures (ship.sh runs it every ship: it takes no time)

A refusal-shaped default: a git error, an unreadable output, a NOT RUN or zero tests is never a pass.
"""
import fnmatch, json, re, subprocess, sys

COLLAB_GLOBS = ["js/collab-*.js"]
FUZZ_FNS = ["kitchen921", "mutate921", "guest921", "invariants921", "convergenceFuzz921", "rng921", "jclone921", "need921"]


def fn_body(src, name):
    """the text of `  function name(` … up to its closing `  }` at the same indent, or None when it is not there"""
    lines = (src or '').split('\n')
    for i, l in enumerate(lines):
        if re.match(r'^  function ' + re.escape(name) + r'\s*\(', l):
            if l.count('{') and l.count('{') == l.count('}'):
                return l   # a one-line helper (jclone921): its own line is all of it
            for j in range(i + 1, len(lines)):
                if lines[j] == '  }':
                    return '\n'.join(lines[i:j + 1])
            return '\n'.join(lines[i:])
    return None


def why_changed(files, old_tests, new_tests):
    """the reasons the battery must run, from the release's files and tests.js before / after"""
    out = [p for p in files if any(fnmatch.fnmatch(p, g) for g in COLLAB_GLOBS)]
    if 'tests/tests.js' in files:
        out += ['tests/tests.js ' + n + '()' for n in FUZZ_FNS if fn_body(old_tests, n) != fn_body(new_tests, n)]
    return out


def sh(args):
    r = subprocess.run(args, capture_output=True, text=True)
    if r.returncode != 0:
        raise RuntimeError(' '.join(args) + ': ' + (r.stderr or '').strip())
    return r.stdout


def changed():
    try:
        files = sorted(set(sh(['git', 'diff', '--name-only', '--no-renames', 'HEAD']).split()
                           + sh(['git', 'ls-files', '-o', '--exclude-standard']).split()))
        old = sh(['git', 'show', 'HEAD:tests/tests.js']) if 'tests/tests.js' in files else ''
        new = open('tests/tests.js', encoding='utf-8').read() if 'tests/tests.js' in files else ''
    except Exception as e:
        print('❌ tools/_fzgate.py: ' + str(e), file=sys.stderr)
        return 2
    print(', '.join(why_changed(files, old, new)))
    return 0


def verdict_of(text):
    """(ok, why) from tests/_cdp.py's output: every named test RAN and passed, and at least one did"""
    m = re.search(r'"summary": "Regression (\d+)/(\d+)', text or '')
    if not m:
        return False, 'no summary in the driver output (it did not run)'
    p, t = int(m.group(1)), int(m.group(2))
    if not re.search(r'"ok": true', text):
        return False, 'the driver says not ok (%d of %d passed)' % (p, t)
    if t < 1 or p != t:
        return False, '%d of %d passed (a NOT RUN or a missing test is never a pass)' % (p, t)
    if 'NOT RUN HERE' in (re.search(r'"summary": "([^"]*)"', text).group(1)):
        return False, 'the summary carries a NOT RUN HERE'
    return True, '%d of %d passed' % (p, t)


def verdict(path):
    try:
        text = open(path, encoding='utf-8', errors='replace').read()
    except Exception as e:
        print('❌ cannot read %s: %s' % (path, e)); return 1
    ok, why = verdict_of(text)
    print(('✅ the collab fuzz battery (921 FZ): ' if ok else '❌ the collab fuzz battery (921 FZ): ') + why)
    return 0 if ok else 1


def selftest():
    fails = []
    def check(cond, what):
        if not cond: fails.append(what)
    T0 = "x\n  function mutate921(doc) {\n    a();\n  }\n  function other() {\n  }\n"
    T1 = T0.replace('a();', 'b();')
    T2 = T0.replace('  function other() {\n  }\n', '  function other() {\n    z();\n  }\n')
    check(fn_body(T0, 'mutate921') == "  function mutate921(doc) {\n    a();\n  }", 'fn_body reads one helper to its own close')
    check(fn_body(T0, 'guest921') is None, 'a helper that is not there is None')
    T3 = "  function jclone921(o) { return JSON.parse(JSON.stringify(o)); }\n  function other() {\n  }\n"
    check(fn_body(T3, 'jclone921') == "  function jclone921(o) { return JSON.parse(JSON.stringify(o)); }", 'a one-line helper is its own line, not the next close')
    check(why_changed(['js/collab-host.js'], '', '') == ['js/collab-host.js'], 'a collab file runs it')
    check(why_changed(['js/compositor.js', 'index.html'], '', '') == [], 'CONTROL: other app files do not')
    check(why_changed(['tests/tests.js'], T0, T1) == ['tests/tests.js mutate921()'], 'a fuzz helper changed runs it')
    check(why_changed(['tests/tests.js'], T0, T2) == [], 'CONTROL: another function in tests.js does not')
    check(why_changed(['tests/tests.js'], T0, T0.replace('mutate921', 'mutate9x')) == ['tests/tests.js mutate921()'], 'a helper removed or renamed runs it')
    ok, _ = verdict_of('{"summary": "Regression 1/1 ✓Pending 0/0 built", "ok": true}'); check(ok, 'a green slice of one passes')
    ok, _ = verdict_of('{"summary": "Regression 0/0 ✓Pending 0/0 built", "ok": true}'); check(not ok, 'zero tests is not a pass')
    ok, _ = verdict_of('{"summary": "Regression 0/1 ✓ · NOT RUN HERE 1 Pending 0/0 built", "ok": true}'); check(not ok, 'a NOT RUN is not a pass')
    ok, _ = verdict_of('{"summary": "Regression 0/1 Pending 0/0 built", "ok": false}'); check(not ok, 'a red one is not a pass')
    ok, _ = verdict_of('Traceback: the driver died'); check(not ok, 'no output is not a pass')
    for f in fails: print('❌ _fzgate selftest: ' + f)
    print('_fzgate selftest: %d rules, %d failed' % (13, len(fails)))
    return 1 if fails else 0


if __name__ == '__main__':
    a = sys.argv[1:] or ['selftest']
    if a[0] == 'changed': sys.exit(changed())
    if a[0] == 'verdict' and len(a) > 1: sys.exit(verdict(a[1]))
    if a[0] == 'selftest': sys.exit(selftest())
    print(__doc__); sys.exit(2)
