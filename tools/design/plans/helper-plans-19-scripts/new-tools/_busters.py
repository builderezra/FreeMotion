#!/usr/bin/env python3
"""The cache-buster gate, driven by the REFERENCES instead of a list of file names (#1064).

sw.js serves any same-origin `?v=` URL from cache without revalidating (#112, by design), so a changed file whose `?v=`
did not change is served stale from every installed copy. tools/ship.sh used to guard only js/*.js and the two
stylesheets, by a regex written three times (find, bump, re-check). Not covered: vendor/mp4-muxer.js, manifest.json, the two
icons, brand-wordmark-m.png (index.html AND six lines of styles.css) and fx-art/<key>.jpg (built in js/fx-thumbs.js).
None had changed since it got its buster, so nobody had hit it; this closes the door anyway.

Rule: a changed file is a MISS when a source text (index.html, the two stylesheets, js/*.js) references it as `<path>?v=N`, or
as a templated path (TEMPLATED), and that reference reads the same buster as at HEAD. A reference that is new since HEAD is
exempt (nothing to differ from), and a changed file that nothing references is not cached, so it is not a miss. Shipped code
(js/*.js, styles.css, theme-glass.css) is covered by the same rule through index.html's script and link tags.

  python3 tools/_busters.py --miss        print one line per miss ("path (still ?v=N in source)"), nothing when clean
  python3 tools/_busters.py --bump        add 1 to every missed buster in every source that carries it, print what it did
  python3 tools/_busters.py --selftest    prove the rules in a temp repo (ship.sh refuses to ship if this fails)
"""
import os
import re
import subprocess
import sys
import tempfile

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from _shipgates import sh  # a failed git exits 3, never "nothing changed"

REF = re.compile(r'([A-Za-z0-9_./-]+\.[A-Za-z0-9]+)\?v=([0-9.]+)')
# A path built at run time can not be found by text: name the prefix and the one line that holds its buster.
TEMPLATED = {'fx-art/': ('js/fx-thumbs.js', re.compile(r"('fx-art/' \+ key \+ '\.jpg\?v=)([0-9.]+)(')"))}
STATIC_SOURCES = ('index.html', 'styles.css', 'theme-glass.css')   # sw.js only names assets in comments


def source_names(listing):
    return [f for f in STATIC_SOURCES if f in listing] + sorted(f for f in listing if re.match(r'^js/.*\.js$', f))


def refs_of(path, text):
    """every buster `path` carries in `text` (a list: styles.css names the wordmark six times)"""
    return [m.group(2) for m in REF.finditer(text) if m.group(1) == path]


def templ_of(prefix, text):
    m = TEMPLATED[prefix][1].search(text)
    return m.group(2) if m else None


def misses(changed, now, was):
    """changed: set of paths. now/was: path -> text (None when absent). Returns [(path, source, buster)]."""
    out = []
    for f in sorted(changed):
        for src in now:
            if src == f:
                continue
            a, b = refs_of(f, now[src] or ''), refs_of(f, (was.get(src) or ''))
            if a and a == b:   # carried before, carries the same buster now (a reference new since HEAD has b == [] and is exempt)
                out.append((f, src, a[0]))
        for prefix, (src, _) in TEMPLATED.items():
            if f.startswith(prefix) and src in now:
                a, b = templ_of(prefix, now[src] or ''), templ_of(prefix, was.get(src) or '')
                if a is not None and b is not None and a == b:
                    out.append((f, src, a))
    return out


def bump(missed, now):
    """returns {source: new text} and the lines to print; a non-integer buster is left for a human (the re-check then refuses)"""
    new, said = dict(now), []
    for f, src, v in missed:
        if not re.fullmatch(r'[0-9]+', v):
            continue
        n = str(int(v) + 1)
        if f.startswith(tuple(TEMPLATED)) and src in TEMPLATED_SRC:
            rx = TEMPLATED[[p for p in TEMPLATED if f.startswith(p)][0]][1]
            new[src] = rx.sub(lambda m: m.group(1) + n + m.group(3), new[src], count=1)
        else:
            new[src] = re.sub(re.escape(f) + r'\?v=' + re.escape(v) + r'(?![0-9.])', f + '?v=' + n, new[src])
        said.append('%s ?v=%s -> ?v=%s (%s)' % (f, v, n, src))
    return new, said


TEMPLATED_SRC = {v[0] for v in TEMPLATED.values()}


def settle(changed, now, was):
    """bump until nothing is stale. A bump edits a source (styles.css for the wordmark, js/fx-thumbs.js for fx-art), and that
    edit makes the source itself a changed file whose own buster in index.html is now stale: so go round again (at most 6 times)."""
    changed, said, cur = set(changed), [], dict(now)
    for _ in range(6):
        m = misses(changed, cur, was)
        if not m:
            break
        nxt, s = bump(m, cur)
        if nxt == cur:
            break   # a non-integer buster: left for the re-check to refuse
        said += s
        changed |= {src for src in nxt if nxt[src] != cur[src]}
        cur = nxt
    return cur, said


def _read(path):
    try:
        with open(path, encoding='utf-8') as fh:
            return fh.read()
    except (OSError, UnicodeDecodeError):
        return None


def _show(path):
    r = subprocess.run(['git', 'show', 'HEAD:' + path], capture_output=True, text=True)
    return r.stdout if r.returncode == 0 else None


def _state():
    changed = set()
    for line in sh('git status --porcelain').splitlines():
        changed.add(line[3:].split(' -> ')[-1].strip())
    listing = sh('git ls-files').splitlines()
    names = source_names(set(listing) | {c for c in changed})
    now = {n: _read(n) for n in names if _read(n) is not None}
    was = {n: _show(n) for n in names}
    return changed, now, was


def cmd_miss():
    changed, now, was = _state()
    for f, src, v in misses(changed, now, was):
        print('%s (still ?v=%s in %s)' % (f, v, src))


def cmd_bump():
    changed, now, was = _state()
    new, said = settle(changed, now, was)
    for src, text in new.items():
        if text != now[src]:
            with open(src, 'w', encoding='utf-8') as fh:
                fh.write(text)
    for s in said:
        print('   ✅ ' + s)


def selftest():
    fails = []

    def check(name, cond, extra=''):
        if not cond:
            fails.append(name + (' :: ' + extra if extra else ''))

    index = ('<script src="js/app.js?v=3"></script>\n<script src="js/fx-thumbs.js?v=5"></script>\n<link rel="stylesheet" href="styles.css?v=7">\n<script src="vendor/mp4-muxer.js?v=9"></script>\n'
             '<link rel="manifest" href="manifest.json?v=2">\n<img src="brand-wordmark-m.png?v=1">\n')
    css = ".a{background:url('brand-wordmark-m.png?v=1')}\n.b{background:url('brand-wordmark-m.png?v=1')}\n"
    thumbs = "im.src = 'fx-art/' + key + '.jpg?v=1';\n"
    base = {'index.html': index, 'styles.css': css, 'js/fx-thumbs.js': thumbs, 'js/app.js': 'x\n',
            'vendor/mp4-muxer.js': 'm\n', 'manifest.json': '{}\n', 'brand-wordmark-m.png': 'png\n', 'fx-art/cat.jpg': 'jpg\n', 'tests/x.js': 't\n'}

    def run(edit):
        with tempfile.TemporaryDirectory() as d:
            def w(p, t):
                os.makedirs(os.path.dirname(os.path.join(d, p)) or d, exist_ok=True)
                with open(os.path.join(d, p), 'w', encoding='utf-8') as fh:
                    fh.write(t)
            for p, t in base.items():
                w(p, t)
            subprocess.run('git init -q && git add -A && git -c user.email=a@b -c user.name=t commit -qm base', shell=True, cwd=d, check=True)
            edit(w)
            here = os.getcwd(); os.chdir(d)
            try:
                changed, now, was = _state()
                m = misses(changed, now, was)
                new, said = settle(changed, now, was)
            finally:
                os.chdir(here)
            return m, new, now

    def names(m): return sorted({x[0] for x in m})

    m, _, _ = run(lambda w: w('js/app.js', 'y\n'))
    check('control: a changed js/app.js with its ?v= untouched is a miss', names(m) == ['js/app.js'], str(m))
    m, _, _ = run(lambda w: w('vendor/mp4-muxer.js', 'm2\n'))
    check('a changed vendor/mp4-muxer.js is a miss', names(m) == ['vendor/mp4-muxer.js'], str(m))
    m, _, _ = run(lambda w: w('manifest.json', '{"a":1}\n'))
    check('a changed manifest.json is a miss', names(m) == ['manifest.json'], str(m))
    m, new, now = run(lambda w: w('brand-wordmark-m.png', 'png2\n'))
    check('a changed wordmark is a miss in BOTH index.html and styles.css', sorted(x[1] for x in m) == ['index.html', 'styles.css'], str(m))
    check('bumping the wordmark moves all three references together', new.get('styles.css', '').count('?v=2') == 2 and 'brand-wordmark-m.png?v=2' in new.get('index.html', ''))
    m, new, now = run(lambda w: w('fx-art/cat.jpg', 'jpg2\n'))
    check('a changed fx-art picture is a miss in js/fx-thumbs.js', names(m) == ['fx-art/cat.jpg'] and m[0][1] == 'js/fx-thumbs.js', str(m))
    check('bumping an fx-art picture moves the one templated buster', "'.jpg?v=2'" in new.get('js/fx-thumbs.js', ''))
    m, new, now = run(lambda w: w('brand-wordmark-m.png', 'png2\n'))
    check('the cascade: bumping the wordmark edits styles.css, so styles.css gets its own new buster in index.html', 'styles.css?v=8' in new.get('index.html', ''), new.get('index.html', ''))
    m, new, now = run(lambda w: w('fx-art/cat.jpg', 'jpg2\n'))
    check('the cascade: bumping fx-art edits js/fx-thumbs.js, so it gets its own new buster in index.html', 'js/fx-thumbs.js?v=6' in new.get('index.html', ''), new.get('index.html', ''))
    m, _, _ = run(lambda w: w('tests/x.js', 't2\n'))
    check('a changed file nothing references is not a miss', m == [], str(m))
    m, _, _ = run(lambda w: (w('js/app.js', 'y\n'), w('index.html', index.replace('js/app.js?v=3', 'js/app.js?v=4'))))
    check('an already-bumped buster is not a miss', m == [], str(m))
    m, _, _ = run(lambda w: (w('brand-wordmark-m.png', 'png2\n'), w('index.html', index.replace('wordmark-m.png?v=1', 'wordmark-m.png?v=2'))))
    check('bumped in index.html but not in styles.css is still a miss, naming styles.css', [x[1] for x in m] == ['styles.css'], str(m))
    m, _, _ = run(lambda w: w('js/new.js', 'n\n'))
    check('a brand-new file with no reference is not a miss', m == [], str(m))
    m, _, _ = run(lambda w: (w('vendor/mp4-muxer.js', 'm2\n'), w('manifest.json', '{"a":1}\n'), w('fx-art/cat.jpg', 'j2\n'), w('js/app.js', 'y\n')))
    check('four stale files at once are all named', names(m) == ['fx-art/cat.jpg', 'js/app.js', 'manifest.json', 'vendor/mp4-muxer.js'], str(m))
    if fails:
        print('❌ _busters.py self-test failed:')
        for f in fails:
            print('   · ' + f)
        return 1
    print('✅ _busters.py self-test passed (14 checks)')
    return 0


if __name__ == '__main__':
    a = sys.argv[1] if len(sys.argv) > 1 else ''
    if a == '--miss': cmd_miss()
    elif a == '--bump': cmd_bump()
    elif a == '--selftest': sys.exit(selftest())
    else:
        print(__doc__); sys.exit(2)
