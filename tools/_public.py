#!/usr/bin/env python3
"""WHAT THE SITE HANDS OUT (#1254, 17 Nov 2026). Used by tools/ship.sh and tools/tick.sh.

    python3 tools/_public.py check      # instant, local: exit 1 names every path that would go public without being the app
    python3 tools/_public.py live       # asks the live site: exit 1 if a private file answers, or an app file does not; 2 = no verdict
    python3 tools/_public.py selftest

WHY. His words, 16 Nov: "that should not be findable … if there is on the GitHub any old versions that's really bad". GitHub Pages
builds this repo with Jekyll and, with no config, published EVERY file: CLAUDE.md, BEFORE-PUBLISHING.md, REQUESTS.md, the tests and
the tools all answered 200 on the live site, and the notes were rendered as web pages too. A root `_config.yml` now leaves out
everything that is not the app. That list is a thing a session has to remember to extend, so it is not left to memory:

  * `check` reads what git tracks (and what the next `git add -A` would add) and refuses the release when a top-level path is
    neither an APP path listed below nor matched by `_config.yml`'s `exclude:` — a new note can never go public by being forgotten.
    It also refuses an exclude that would take an app path off the site, and a note or script sitting inside an app folder.
  * `live` asks the site itself, after the deploy: every excluded file (and its rendered .html twin) must answer 404 and a sample
    of the app must answer 200. While the site still shows an older version than the tree it says so and gives no verdict.

Jekyll 3 (GitHub Pages) drops an entry when a pattern equals it, glob-matches it from the repo root (`*` crosses `/`, which is why
`*.md` is NOT used: it would take the lessons in tutorials/ with it), or is a prefix of its path. Names starting with `.` or `_` are
never published. This file reproduces exactly that, so the verdict is the site's.
"""
import fnmatch, io, os, re, subprocess, sys

SITE = 'https://builderezra.github.io/FreeMotion/'

# The app, by its top-level paths. Everything the page, the worker or a lazy loader fetches lives under one of these.
APP = {
    'index.html', 'styles.css', 'theme-glass.css', 'sw.js', 'manifest.json',
    'js', 'vendor', 'fx-art', 'fx-pics', 'launch', 'tutorials',
    'apple-touch-icon.png', 'icon-192.png', 'icon-512.png', 'brand-wordmark.png', 'brand-wordmark-m.png',
    'export-btn.png', 'fab-cross.png', 'fab-plus.png', 'open-badge.png', 'splash-poster.png', 'splash.mp4', 'splash-v2.mp4',
}
# Inside an app folder, a file with one of these endings is a note or a script that slipped in, not the app.
STRAY = ('.md', '.py', '.sh', '.txt', '.log', '.bak', '.orig', '.diff', '.patch')
STRAY_OK = re.compile(r'^tutorials/(?:[^/]+/)*[^/]+\.md$')      # the lessons ARE markdown (tutorials/ and tutorials/simple/), fetched by js/tutorials.js


def read_excludes(text):
    """The `exclude:` list of _config.yml, read strictly (one `  - name` per line) so the gate never guesses."""
    out, on = [], False
    for raw in text.split('\n'):
        line = raw.split('#', 1)[0].rstrip()
        if not line.strip():
            continue
        if re.match(r'^exclude:\s*$', line):
            on = True
            continue
        if on:
            m = re.match(r'^\s+-\s+(.+?)\s*$', line)
            if m:
                out.append(m.group(1).strip('"\''))
                continue
            on = False
    return out


def hidden(path):
    """Jekyll never publishes a dot- or underscore-name (.gitignore, _config.yml, js/_x.js), whatever the list says."""
    return any(p.startswith(('.', '_')) for p in path.split('/'))


def matched(path, pats):
    """Jekyll 3's EntryFilter, the LIST's half: an entry is dropped when a pattern equals it, glob-matches it from the root, or
    starts its path — for the entry or any folder above it."""
    parts = path.split('/')
    for i in range(1, len(parts) + 1):
        entry = '/' + '/'.join(parts[:i])
        for p in pats:
            item = '/' + p.strip('/')
            if fnmatch.fnmatchcase(entry, item) or entry.startswith(item):
                return True
    return False


def excluded(path, pats):
    return hidden(path) or matched(path, pats)


def probes_for(pats, files):
    """What `live` asks the site for: one real file per exclude line, and a note's rendered .html twin. NEVER a hidden file: the
    first version took `.gitignore` for every line (a dot-name is 'excluded' under any pattern), asked for it 25 times, got 25
    404s and called a site that was serving every note clean (17 Nov, caught the same hour by asking with curl)."""
    out = []
    for p in pats:
        hit = next((f for f in files if not hidden(f) and matched(f, [p])), None)
        if hit:
            out.append(hit)
            if hit.endswith('.md'):
                out.append(hit[:-3] + '.html')
    return out


def judge(files, pats):
    """→ (problems, private, served): what would go public that is not the app, and what the app would lose."""
    problems, private, served = [], [], []
    seen_top = set()
    for f in files:
        top = f.split('/', 1)[0]
        if excluded(f, pats):
            private.append(f)
            if top in APP and top not in seen_top and excluded(top, pats):
                seen_top.add(top)
                problems.append("_config.yml's exclude takes the app path '%s' off the site" % top)
            continue
        served.append(f)
        if top not in APP:
            if top not in seen_top:
                seen_top.add(top)
                problems.append("'%s' would be PUBLIC on the site and is not the app: add it to _config.yml's exclude "
                                "(or, if the app really loads it, to APP in tools/_public.py)" % top)
        elif f.lower().endswith(STRAY) and not STRAY_OK.match(f):
            problems.append("'%s' is a note or a script inside an app folder, so it would be PUBLIC: move it out" % f)
    return problems, private, served


def tracked(root):
    def sh(a):
        return subprocess.check_output(a, cwd=root).decode('utf-8', 'replace').split('\n')
    files = [f for f in sh(['git', 'ls-files']) + sh(['git', 'ls-files', '--others', '--exclude-standard']) if f.strip()]
    return sorted(set(f for f in files if os.path.exists(os.path.join(root, f))))


def cmd_check(root):
    cfg = os.path.join(root, '_config.yml')
    if not os.path.exists(cfg):
        print("❌ there is no _config.yml: GitHub Pages would publish every file in the repo (#1254)")
        return 1
    pats = read_excludes(io.open(cfg, encoding='utf-8').read())
    if not pats:
        print("❌ _config.yml has no readable `exclude:` list (one `  - name` per line)")
        return 1
    files = tracked(root)
    problems, private, served = judge(files, pats)
    stale = [p for p in pats if not any(matched(f, [p]) for f in files)]
    for p in problems:
        print('❌ ' + p)
    if problems:
        print("   Nothing may reach the live site but the app (#1254). Fix the list, then run: python3 tools/_public.py check")
        return 1
    print('   ✅ the site is the app only: %d files served, %d kept private by %d exclude lines%s'
          % (len(served), len(private), len(pats), (' (matching nothing now: ' + ', '.join(stale) + ')') if stale else ''))
    return 0


def cmd_live(root):
    import urllib.request, urllib.error
    def get(path):
        try:
            req = urllib.request.Request(SITE + path, headers={'User-Agent': 'fm-public-check', 'Cache-Control': 'no-cache'})
            with urllib.request.urlopen(req, timeout=15) as r:
                return r.status, r.read(4096)
        except urllib.error.HTTPError as e:
            return e.code, b''
        except Exception as e:                            # no network, DNS, a timeout: not a verdict
            return None, str(e).encode()
    st, body = get('index.html')
    if st != 200:
        print('⚠️ the live site did not answer for index.html (%s) — no verdict on what it serves' % (st if st else body.decode()[:80]))
        return 2
    live = (re.search(rb'<meta name="fm-build" content="(v[0-9.]+)"', body) or [None, b'?'])[1].decode()
    here = (re.search(r'<meta name="fm-build" content="(v[0-9.]+)"', io.open(os.path.join(root, 'index.html'), encoding='utf-8').read()) or [None, '?'])[1]
    pats = read_excludes(io.open(os.path.join(root, '_config.yml'), encoding='utf-8').read()) if os.path.exists(os.path.join(root, '_config.yml')) else []
    files = tracked(root)
    _, private, served = judge(files, pats)
    probes = probes_for(pats, files)
    if not probes:
        print('⚠️ no private file to ask the live site for (is _config.yml there, with its exclude list?) — no verdict')
        return 2
    app =[f for f in ('styles.css', 'js/app.js', 'sw.js', 'manifest.json', 'tutorials/index.json', 'vendor/mp4-muxer.js', 'icon-192.png') if f in served]
    app += [f for f in served if f.startswith('fx-art/')][:1] + [f for f in served if STRAY_OK.match(f)][:1] + [f for f in served if f.startswith('fx-pics/')][:1]
    public = [p for p in probes if get(p)[0] == 200]
    missing = [a for a in app if get(a)[0] != 200]
    if live != here:
        print('⏳ the live site is %s and this tree is %s — the deploy has not landed (or this tree is not shipped yet); '
              'asked anyway: %d private file(s) answer' % (live, here, len(public)) + ((': ' + ', '.join(public[:6])) if public else ''))
        return 2
    if public:
        print('❌ PRIVATE FILES ARE PUBLIC on the live site (%s): %s — anyone can read them. _config.yml must exclude them (#1254).' % (live, ', '.join(public[:10])))
        return 1
    if missing:
        print('❌ THE LIVE APP IS MISSING FILES (%s): %s — an exclude took part of the app off the site (#1254).' % (live, ', '.join(missing)))
        return 1
    print('✅ the live site (%s) serves the app and none of the %d private files asked for' % (live, len(probes)))
    return 0


def cmd_selftest():
    bad = []
    def want(c, what):
        if not c:
            bad.append(what)
    pats = read_excludes('# a note\nexclude:\n  - CLAUDE.md\n  - "LOOP.md"\n  - tools   # the scripts\n  - tests\nother: 1\n  - not-this\n')
    want(pats == ['CLAUDE.md', 'LOOP.md', 'tools', 'tests'], 'read_excludes reads the list and stops at the next key: %r' % pats)
    want(excluded('CLAUDE.md', pats) and excluded('tools/ship.sh', pats) and excluded('tests/x/y.js', pats), 'a listed file and everything under a listed folder are private')
    want(not excluded('js/app.js', pats) and not excluded('tutorials/01-first-video.md', pats), 'the app and the lessons stay public')
    want(not excluded('LOOP-HISTORY.md', pats), "a prefix match is on the whole path: 'LOOP.md' does not take LOOP-HISTORY.md")
    want(excluded('toolshed.js', pats), "…but Jekyll's prefix rule does take 'toolshed.js' with 'tools' (the reason check names stray excludes)")
    want(excluded('.gitignore', []) and excluded('_config.yml', []) and excluded('js/_x.js', []), 'dot- and underscore-names are never published')
    want(excluded('tutorials/a.md', ['*.md']), "the trap this file avoids: '*.md' crosses folders and would take the lessons")
    p, priv, served = judge(['index.html', 'js/app.js', 'CLAUDE.md', 'NEW-NOTE.md', 'tools/ship.sh', 'js/notes.md', 'tutorials/01.md'], pats)
    want(any("'NEW-NOTE.md' would be PUBLIC" in x for x in p), 'a new top-level note is refused: %r' % p)
    want(any("'js/notes.md' is a note" in x for x in p), 'a note inside an app folder is refused')
    want(not any('tutorials/01.md' in x for x in p) and not any('index.html' in x for x in p), 'the app and a lesson raise nothing')
    want('CLAUDE.md' in priv and 'tools/ship.sh' in priv and 'js/app.js' in served, 'judge sorts private from served')
    p2, _, _ = judge(['js/app.js', 'index.html'], ['js'])
    want(any("takes the app path 'js'" in x for x in p2), 'an exclude that takes the app off the site is refused')
    want(not any('tutorials/simple/01.md' in x for x in judge(['tutorials/simple/01.md'], pats)[0]), 'a lesson in a sub-folder of tutorials/ is the app too')
    pr = probes_for(pats, ['.gitignore', '_config.yml', 'CLAUDE.md', 'LOOP.md', 'js/app.js', 'tests/_cdp.py', 'tests/run.html', 'tools/ship.sh'])
    want(pr == ['CLAUDE.md', 'CLAUDE.html', 'LOOP.md', 'LOOP.html', 'tools/ship.sh', 'tests/run.html'],
         'live asks for one real file per line and a note\'s .html twin, never a hidden file (the 17 Nov bug asked for .gitignore 25 times): %r' % pr)
    for b in bad:
        print('❌ _public.py selftest: ' + b)
    print('_public.py selftest: %d case(s) failed' % len(bad) if bad else '_public.py selftest: ok')
    return 1 if bad else 0


if __name__ == '__main__':
    root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    mode = sys.argv[1] if len(sys.argv) > 1 else 'check'
    if mode == 'selftest':
        sys.exit(cmd_selftest())
    if mode == 'live':
        sys.exit(cmd_live(root))
    if mode == 'check':
        rc = cmd_selftest()
        sys.exit(rc or cmd_check(root))
    print(__doc__)
    sys.exit(64)
