#!/usr/bin/env python3
"""The ?only= query for a list of test titles, short enough for the dev server — tools/prove.sh's.

    python3 tools/_onlykeys.py <titles file> <tests.js>      # prints the url-encoded query value
    python3 tools/_onlykeys.py --selftest

WHY (15 Oct, v17.50). prove.sh put every changed test's whole title in ONE ?only=, and v17.50's 150 titles came to 74,454
bytes; tools/serve.sh (the stdlib's handler) refuses a request line over 64 KiB with a 414, so every test read "nothing is
serving" and the release was refused before one was judged. serve.sh is part of the lock's instrument (tools/_fu_gate.py
INSTRUMENT_FILES), so the fix lives here instead: tests.js keeps a test when its name CONTAINS any line of ?only=, so each
title is sent as the shortest leading piece of it (40, 50, 60 … characters) that no OTHER title in tests.js contains —
the very same tests run. A title with no such piece is sent whole. While the whole list already fits (under 48 KB
encoded), nothing changes: the query is the one prove.sh always built.
"""
import re, sys, urllib.parse

LIMIT = 48 * 1024
HEAD = re.compile(r"""^\s*test\(\s*(['"])""")


def decl_title(line):
    """The JS string literal opening a test() call, escapes honoured (tools/_spottests.py's rule)."""
    m = HEAD.match(line)
    if not m:
        return None
    q = m.group(1); i = m.end(); buf = []
    while i < len(line):
        c = line[i]
        if c == '\\' and i + 1 < len(line):
            buf.append(line[i + 1]); i += 2; continue
        if c == q:
            return ''.join(buf)
        buf.append(c); i += 1
    return None


def enc(lines):
    return urllib.parse.quote('\n'.join(lines), safe='')


def keys(wanted, every):
    """For each wanted title, the shortest leading piece (from 40 characters, in steps of 10) that no other title contains."""
    others_of = {}
    out = []
    for t in wanted:
        key = t
        n = 40
        while n < len(t):
            p = t[:n]
            if not any(p in o for o in every if o != t):
                key = p
                break
            n += 10
        out.append(key)
    return out


def query(wanted, every):
    full = enc(wanted)
    if len(full) <= LIMIT:
        return full
    return enc(keys(wanted, every))


def selftest():
    every = ['alpha one: the first test', 'alpha one: the first test, again with more', 'beta two', 'gamma three ' + 'x' * 200]
    bad = []
    # 1. a short list goes out exactly as before
    if query(['beta two'], every) != enc(['beta two']):
        bad.append('a short list changed')
    # 2. a key selects exactly what its whole title selected (substring semantics, as tests.js) — never more. A title that
    #    sits inside another already brought that one along when it was sent whole; the key must not change that either way.
    ks = keys(every, every)
    for t, k in zip(every, ks):
        hits = [o for o in every if k in o]; whole = [o for o in every if t in o]
        if hits != whole:
            bad.append('key %r selects %r, the whole title selected %r' % (k, hits, whole))
    # 3. a title that is a prefix of another keeps its whole self (no shorter piece is unique)
    if ks[0] != every[0]:
        bad.append('a title contained in another must go whole, got %r' % ks[0])
    # 4. a long list is shortened below the limit and still names every test (CONTROL: the full list is over it)
    big = ['some long shared-prefix title · with — wide characters, the same for every case, number %03d ' % i + 'y' * 400 for i in range(150)]
    if len(enc(big)) <= LIMIT:
        bad.append('CONTROL: the long fixture fits already — it cannot test the shortening')
    q = query(big, big)
    sel = urllib.parse.unquote(q).split('\n')
    if len(q) > LIMIT:
        bad.append('the long list is still %d bytes encoded' % len(q))
    if [sum(1 for t in big if k in t) for k in sel] != [1] * len(big):
        bad.append('a shortened key selects other than exactly its own test')
    # 5. CONTROL for 2: a piece too short to be unique (the first 40 characters shared by the long fixture) selects many
    if sum(1 for t in big if big[0][:40] in t) == 1:
        bad.append('CONTROL: a 40-character shared prefix selects one test — the uniqueness check is not being exercised')
    print('\n'.join('  ❌ ' + b for b in bad) if bad else '  ✅ _onlykeys: short lists unchanged; long lists shortened under the limit; every key selects exactly what its whole title did')
    return 1 if bad else 0


if __name__ == '__main__':
    if sys.argv[1:] == ['--selftest']:
        sys.exit(selftest())
    wanted = [l for l in open(sys.argv[1], encoding='utf-8').read().split('\n') if l]
    every = [t for t in (decl_title(l) for l in open(sys.argv[2], encoding='utf-8').read().split('\n')) if t is not None]
    print(query(wanted, every))
