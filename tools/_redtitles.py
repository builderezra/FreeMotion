#!/usr/bin/env python3
"""The titles of the tests a full pass reported red (8 Oct — RULES-AUDIT B6, the PASSES-ALONE diagnosis). Used by ship.sh.

    python3 tools/_redtitles.py <driver output file> [max]   # one red test's exact title per line (at most max, default 6)
    python3 tools/_redtitles.py selftest

A failure row is "FAIL" + title + " — " + message, and a TITLE may itself contain " — " (\"1065 the phone top bar has no
? help button — the PC keeps its own…\"), so splitting on the dash would cut real titles in half. Instead each row is
matched against the real titles in tests/tests.js: the LONGEST title the row starts with is the one that failed.
"""
import json, os, re, sys

HERE = os.path.dirname(os.path.abspath(__file__))


def all_titles(tests_js):
    src = open(tests_js, encoding='utf-8').read()
    return [m.group(1).replace("\\'", "'") for m in re.finditer(r"^  test\('((?:[^'\\]|\\.)*)'", src, re.M)]


def red_titles(raw, titles, most=6):
    i = raw.find('{')
    try:
        d = json.loads(raw[i:])
    except Exception:
        return []
    out = []
    by_len = sorted(set(titles), key=len, reverse=True)
    for f in d.get('failures') or []:
        row = f.replace('\n', ' ')
        if not row.startswith('FAIL'):
            continue
        body = row[4:]
        t = next((t for t in by_len if body.startswith(t)), None)
        if t and t not in out:
            out.append(t)
        if len(out) >= most:
            break
    return out


def selftest():
    titles = ['a', 'the phone top bar has no ? help button', 'the phone top bar has no ? help button — the PC keeps its own',
              'he\'s quoted', 'unrelated']
    raw = 'noise\n' + json.dumps({"ok": False, "failures": [
        "FAILthe phone top bar has no ? help button — the PC keeps its own — the PC ? (#btn-help) is gone too",
        "FAILhe's quoted — boom", "FAILhe's quoted — boom again", "not a fail row", "FAILno such test — x"]})
    got = red_titles(raw, titles)
    want = ['the phone top bar has no ? help button — the PC keeps its own', "he's quoted"]
    ok = got == want and red_titles('not json', titles) == [] and red_titles(raw, titles, 1) == want[:1]
    print(('✅' if ok else '❌') + ' _redtitles self-test: the LONGEST real title a failure row starts with, once each, capped' +
          ('' if ok else ' (got %r)' % (got,)))
    return 0 if ok else 1


def main():
    if len(sys.argv) > 1 and sys.argv[1] == 'selftest':
        return selftest()
    if len(sys.argv) < 2:
        print(__doc__); return 2
    most = int(sys.argv[2]) if len(sys.argv) > 2 else 6
    for t in red_titles(open(sys.argv[1], encoding='utf-8').read(), all_titles(os.path.join(HERE, '..', 'tests', 'tests.js')), most):
        print(t)
    return 0


if __name__ == '__main__':
    sys.exit(main())
