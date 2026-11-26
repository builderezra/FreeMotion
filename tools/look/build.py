#!/usr/bin/env python3
"""tools/look/build.py — THE NEW LOOK'S STYLESHEETS ARE GENERATED FROM THE APP'S OWN, NEVER WRITTEN BY HAND (#1255).

    python3 tools/look/build.py            write theme-cutline.css and theme-light.css, and their addresses in index.html
    python3 tools/look/build.py --check    what ship.sh runs: make them again in a temp folder, refuse if the tree's differ
    python3 tools/look/build.py --self-test

WHAT THEY ARE. The new look (warm charcoal and paper, one vermilion; his pick of 20 Nov, "I think orange looks really good")
is today's stylesheet with every colour, shadow, wash, corner and typeface passed through a map. light/gen/gen.py and
reskin/gen/lmin.py make the light one, reskin/gen/cgen.py the dark one; each ends with its hand-written tail (the tokens and
the per-surface fixes). Every rule is scoped under html[data-ui="cutline"] or html[data-ui="light"], and index.html fetches
a file only when that look is on (Settings, New look (preview)). With the preview off nothing here is even requested.

WHY A GATE. The files are made FROM styles.css and theme-glass.css. A release that changes one of those and does not make
them again would leave the preview showing today's colours on the new rule, quietly. ship.sh runs --check: the release
carries the regenerated files or it does not ship.

THE SIMPLE EDITOR'S LINES. About one line in fifteen styles the Simple editor (its ids and classes, the cog's Editor block).
The lock that keeps a Simple release from changing the Full editor reads an ADDED line that names those as Simple's, and
only a Simple release may add or change one. So the output has a fixed shape: each rule is written first WITHOUT its Simple
selectors and declarations, and then, right after it, the same rule for the Simple part alone. tools/look/MODE says whether
that second kind is written at all: "simple-lines: no" until a Simple release has added them, "yes" from then on. Going
from no to yes only ADDS lines, every one of them Simple's by the lock's own test, and the order of the cascade is the same
either way (asserted on every build).

The maps and tails under tools/look/ are the design run's own files (21 to 24 Nov), kept as they were apart from the paths
they read and three rules of his the run had not met (the real wordmark recoloured, never typed; no line under a pressed
tool). Change the look THERE (a map in a generator, a rule in a tail), run this, and ship what it writes.

THE NEW LAYOUTS. Where his pick gives a screen a new shape (the Home list, the dock), the rules are hand-written in
tools/look/layout/*.css with the look's name written LOOK (html:root[data-ui="LOOK"][data-theme] ...). Each generated
stylesheet ends with tokens-<look>.css (the names those files use, for that look) and then every layout file, in name order,
with LOOK replaced. They come last, so at the same prefix they win over the generated part and its tails.
"""
import hashlib, importlib.util, os, re, subprocess, sys, tempfile

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
LOOKS = (('cutline', 'theme-cutline.css', 'dark'), ('light', 'theme-light.css', 'light'))
MODE_FILE = os.path.join(HERE, 'MODE')
GROUPS = re.compile(r'@(media|supports|container|layer|document)\b', re.I)


def lock_gate():
    spec = importlib.util.spec_from_file_location('fug', os.path.join(ROOT, 'tools', '_fu_gate.py'))
    g = importlib.util.module_from_spec(spec); spec.loader.exec_module(g)
    return g


_G = [None]


def hooked(text):
    """Is this line the Simple editor's, by the lock gate's own test for an added line of a root stylesheet?"""
    if _G[0] is None: _G[0] = lock_gate()
    return bool(_G[0].hook_of('theme-cutline.css', text, text))


# ───────────────────────────── a small CSS reader: enough to re-write rules one by one ─────────────────────────────
def strip_comments(css):
    out, i, n, q = [], 0, len(css), None
    while i < n:
        c = css[i]
        if q:
            out.append(c)
            if c == '\\' and i + 1 < n: out.append(css[i + 1]); i += 2; continue
            if c == q: q = None
            i += 1; continue
        if c in '"\'': q = c; out.append(c); i += 1; continue
        if c == '/' and css[i + 1:i + 2] == '*':
            j = css.find('*/', i + 2); i = n if j < 0 else j + 2; out.append(' '); continue
        out.append(c); i += 1
    return ''.join(out)


def split_top(s, sep):
    parts, depth, q, cur = [], 0, None, []
    i, n = 0, len(s)
    while i < n:
        c = s[i]
        if q:
            cur.append(c)
            if c == '\\' and i + 1 < n: cur.append(s[i + 1]); i += 2; continue
            if c == q: q = None
        elif c in '"\'': q = c; cur.append(c)
        elif c in '([': depth += 1; cur.append(c)
        elif c in ')]': depth -= 1; cur.append(c)
        elif c == sep and depth == 0: parts.append(''.join(cur)); cur = []
        else: cur.append(c)
        i += 1
    parts.append(''.join(cur))
    return parts


def block_end(css, i):
    depth, q, n = 0, None, len(css)
    while i < n:
        c = css[i]
        if q:
            if c == '\\': i += 2; continue
            if c == q: q = None
        elif c in '"\'': q = c
        elif c == '{': depth += 1
        elif c == '}':
            depth -= 1
            if depth == 0: return i
        i += 1
    raise ValueError('a block is never closed')


def parse(css):
    """[('rule', selectors, body) | ('group', prelude, nodes) | ('raw', prelude, body) | ('stmt', text)]: 'raw' is a block kept
    whole (@keyframes, @font-face, @property, @page), 'stmt' an at-rule that ends at a semicolon."""
    nodes, i, n = [], 0, len(css)
    while i < n:
        j, depth, q = i, 0, None
        while j < n:
            c = css[j]
            if q:
                if c == '\\': j += 1
                elif c == q: q = None
            elif c in '"\'': q = c
            elif c == '(': depth += 1
            elif c == ')': depth -= 1
            elif depth == 0 and c in '{;}': break
            j += 1
        pre = ' '.join(css[i:j].split())
        if j >= n:
            if pre: raise ValueError('text after the last rule: ' + pre[:60])
            break
        if css[j] == '}': raise ValueError('a closing brace with no block open, after: ' + pre[:60])
        if css[j] == ';':
            if pre: nodes.append(('stmt', pre))
            i = j + 1; continue
        end = block_end(css, j); body = css[j + 1:end]; i = end + 1
        if pre.startswith('@'):
            if GROUPS.match(pre): nodes.append(('group', pre, parse(body)))
            else: nodes.append(('raw', pre, ' '.join(body.split())))
        else: nodes.append(('rule', pre, body))
    return nodes


def decls(body):
    out = []
    for d in split_top(body, ';'):
        d = ' '.join(d.split())
        if not d: continue
        if ':' not in d or '{' in d: raise ValueError('not a declaration: ' + d[:80])
        p, v = d.split(':', 1)
        out.append(p.strip() + ': ' + v.strip())
    return out


def emit(nodes, simple, indent=''):
    """The fixed shape. simple=False leaves every Simple line out; simple=True adds them, each right after its plain rule."""
    out = []
    def rule(sels, ds): return indent + (',\n' + indent).join(sels) + ' { ' + '; '.join(ds) + '; }\n'
    for nd in nodes:
        if nd[0] == 'stmt':
            line = indent + nd[1] + ';\n'
            if simple or not hooked(line): out.append(line)
        elif nd[0] == 'raw':
            line = indent + nd[1] + ' { ' + nd[2] + ' }\n'
            if simple or not hooked(line): out.append(line)
        elif nd[0] == 'group':
            inner = emit(nd[2], simple, indent + '  ')
            if inner: out.append(indent + nd[1] + ' {\n' + inner + indent + '}\n')
        else:
            sels = [' '.join(s.split()) for s in split_top(nd[1], ',') if s.strip()]
            ds = decls(nd[2])
            if not sels or not ds: continue
            sp, sh = [s for s in sels if not hooked(s)], [s for s in sels if hooked(s)]
            dp, dh = [d for d in ds if not hooked(d)], [d for d in ds if hooked(d)]
            if sp and dp: out.append(rule(sp, dp))
            if simple:
                if sp and dh: out.append(rule(sp, dh))
                if sh: out.append(rule(sh, ds))
    return ''.join(out)


def head(look, word):
    return ('/* FreeMotion, the new look (%s): GENERATED by tools/look/build.py from styles.css and theme-glass.css. Do not edit this\n'
            '   file: change a map or a tail under tools/look/ and run the build. Every rule applies only under html[data-ui="%s"]. */\n' % (word, look))


def mode():
    try: t = open(MODE_FILE, encoding='utf-8').read()
    except OSError: raise SystemExit('look/build: tools/look/MODE is missing')
    m = re.search(r'^simple-lines:\s*(yes|no)\s*$', t, re.M)
    if not m: raise SystemExit('look/build: tools/look/MODE must say "simple-lines: yes" or "simple-lines: no"')
    return m.group(1) == 'yes'


def generate(app, out):
    """Run the three generators on <app>'s stylesheets; the raw files land in <out>."""
    env = dict(os.environ, LOOK_APP=app, LOOK_OUT=out, PYTHONDONTWRITEBYTECODE='1')
    for cmd in (['light/gen/gen.py', '--app', app, '--out', os.path.join(out, 'theme-light.css')], ['reskin/gen/lmin.py'],
                ['reskin/gen/cgen.py', '--app', app, '--out', os.path.join(out, 'theme-cutline.css')]):
        r = subprocess.run([sys.executable, os.path.join(HERE, cmd[0])] + cmd[1:], env=env, capture_output=True, text=True)
        if r.returncode != 0: raise SystemExit('look/build: %s failed:\n%s' % (cmd[0], (r.stderr or r.stdout)[-800:]))


LAYOUT_DIR = os.path.join(HERE, 'layout')


def layout(look):
    """The hand-written layouts for one look: tokens-<look>.css as it is, then every other .css in tools/look/layout/ in name
    order with LOOK replaced by the look's name. '' when the folder holds none."""
    if not os.path.isdir(LAYOUT_DIR): return ''
    names = sorted(f for f in os.listdir(LAYOUT_DIR) if f.endswith('.css') and not f.startswith('tokens-'))
    if not names: return ''
    tok = os.path.join(LAYOUT_DIR, 'tokens-%s.css' % look)
    if not os.path.exists(tok): raise SystemExit('look/build: tools/look/layout/ holds layouts and no tokens-%s.css' % look)
    parts = [open(tok, encoding='utf-8').read()]
    if 'data-ui="%s"' % look not in parts[0] or 'LOOK' in parts[0]: raise SystemExit('look/build: tokens-%s.css must name its own look, written out' % look)
    for f in names:
        t = open(os.path.join(LAYOUT_DIR, f), encoding='utf-8').read()
        if 'data-ui="LOOK"' not in t: raise SystemExit('look/build: layout/%s has no rule under html[data-ui="LOOK"]' % f)
        t = t.replace('data-ui="LOOK"', 'data-ui="%s"' % look)
        for other, _, _ in LOOKS:
            if other != look and 'data-ui="%s"' % other in t: raise SystemExit('look/build: layout/%s names the %s look outright: write LOOK' % (f, other))
        parts.append(t)
    return '\n' + '\n'.join(parts)


def shaped(raw, look, word, simple):
    nodes = parse(strip_comments(raw))
    plain, full = emit(nodes, False), emit(nodes, True)
    bad = [l for l in plain.split('\n') if hooked(l)]
    if bad: raise SystemExit('look/build: a line the lock would read as the Simple editor\'s is in the plain part: ' + bad[0][:160])
    a, b = plain.split('\n'), full.split('\n')
    k = 0
    for l in b:
        if k < len(a) and l == a[k]: k += 1
        elif not hooked(l) and not re.match(r'\s*(@(media|supports|container|layer|document)\b.*\{|\})\s*$', l) and not l.rstrip().endswith(','):
            raise SystemExit('look/build: with the Simple lines in, a line appears that is neither in the plain file nor Simple\'s: ' + l[:160])
    if k != len(a): raise SystemExit('look/build: the plain file is not the full file with lines taken out (order moved)')
    return head(look, word) + (full if simple else plain)


def stamp(text):
    return hashlib.sha1(text.encode('utf-8')).hexdigest()[:10]


def build(app=ROOT):
    simple = mode()
    with tempfile.TemporaryDirectory(prefix='fm-look-') as tmp:
        generate(app, tmp)
        return {name: shaped(open(os.path.join(tmp, name), encoding='utf-8').read() + layout(look), look, word, simple) for look, name, word in LOOKS}, simple


ADDR = r"(%s:\s*')(%s\?v=)([0-9a-f]{10}|0)(')"


def addresses(html, made, write=False):
    """index.html's new-look script names each file with a stamp of its bytes, so a phone never keeps an old copy."""
    bad = []
    for look, name, _ in LOOKS:
        rx = re.compile(ADDR % (look, re.escape(name)))
        m = rx.findall(html)
        if len(m) != 1: raise SystemExit('look/build: index.html should name %s exactly once in the new-look script (found %d)' % (name, len(m)))
        want = stamp(made[name])
        if m[0][2] != want:
            bad.append(name)
            if write: html = rx.sub(lambda x: x.group(1) + x.group(2) + want + x.group(4), html)
    return html, bad


def self_test():
    bad = []
    def ok(c, what):
        if not c: bad.append(what)
    css = ('/* a note */ .a, #sm-bar .b { color: red; }\n@media (max-width: 700px) { .c { color: blue; animation: sm-pop 1s } #cv-editor { top: 0 } }\n'
           '@keyframes spin { from { opacity: 0 } to { opacity: 1 } }\n@font-face { font-family: X; src: url("x;y.woff2") }\n.d { content: "a;b}" ; color: green }\n')
    nodes = parse(strip_comments(css))
    ok([n[0] for n in nodes] == ['rule', 'group', 'raw', 'raw', 'rule'], 'the reader does not see a rule, a group, two kept blocks and a rule: %s' % [n[0] for n in nodes])
    plain, full = emit(nodes, False), emit(nodes, True)
    ok('.a { color: red; }' in plain and 'sm-bar' not in plain and 'cv-editor' not in plain and 'sm-pop' not in plain, 'the plain file holds a Simple selector or declaration')
    ok('.c { color: blue; }' in plain and '@font-face { font-family: X; src: url("x;y.woff2") }' in plain and '.d { content: "a;b}"; color: green; }' in plain, 'a plain rule, a kept block or a quoted semicolon was lost')
    ok('#sm-bar .b { color: red; }' in full and '.c { animation: sm-pop 1s; }' in full and '#cv-editor { top: 0; }' in full, 'the full file lacks a Simple rule')
    ok(full.index('.a { color: red; }') < full.index('#sm-bar .b { color: red; }') < full.index('.c { color: blue; }'), 'a Simple rule does not come right after its plain rule')
    try: shaped(css, 'cutline', 'dark', True); shaped(css, 'cutline', 'dark', False)
    except SystemExit as e: ok(False, 'the fixed shape refuses its own output: %s' % e)
    for broken in ('.a { color: red', '.a { color } }', '} .a { color: red }'):
        try: parse(strip_comments(broken)); emit(parse(strip_comments(broken)), True); ok(False, 'broken CSS was read without a word: ' + broken)
        except ValueError: pass
    h, b = addresses("var FILES = { cutline: 'theme-cutline.css?v=0', light: 'theme-light.css?v=0' };", {'theme-cutline.css': 'x', 'theme-light.css': 'y'}, True)
    ok(b == ['theme-cutline.css', 'theme-light.css'] and stamp('x') in h and stamp('y') in h, 'the addresses in index.html are not stamped')
    for x in bad: print('   ✗ look/build self-test: ' + x)
    return not bad


def main(argv):
    if '--self-test' in argv:
        good = self_test(); print('look/build self-test: %s' % ('ok' if good else 'FAILED')); return 0 if good else 1
    if not self_test(): print('❌ look/build: its own self-test failed'); return 1
    made, simple = build()
    ip = os.path.join(ROOT, 'index.html'); html = open(ip, encoding='utf-8').read()
    if '--check' in argv:
        stale = [n for _, n, _ in LOOKS if not os.path.exists(os.path.join(ROOT, n)) or open(os.path.join(ROOT, n), encoding='utf-8').read() != made[n]]
        _, addr = addresses(html, made)
        if stale or addr:
            if stale: print('❌ THE NEW LOOK\'S FILES ARE NOT WHAT THIS TREE\'S STYLESHEET MAKES: %s' % ', '.join(stale))
            if addr: print('❌ index.html names an old copy of: %s' % ', '.join(addr))
            print('   They are generated (tools/look/build.py). Run:  python3 tools/look/build.py   and ship what it writes.')
            print('   If the lines that moved are the Simple editor\'s, they can only ship in a Simple release (the lock gate will say so).')
            return 1
        print('✓ look/build: both generated stylesheets are what this tree makes (%s the Simple editor\'s lines)' % ('with' if simple else 'without'))
        return 0
    for _, n, _ in LOOKS: open(os.path.join(ROOT, n), 'w', encoding='utf-8', newline='\n').write(made[n])
    html2, addr = addresses(html, made, write=True)
    if html2 != html: open(ip, 'w', encoding='utf-8', newline='\n').write(html2)
    print('look/build: wrote %s (%s the Simple editor\'s lines)%s' % (', '.join('%s %d bytes' % (n, len(made[n].encode('utf-8'))) for _, n, _ in LOOKS), 'with' if simple else 'without', '; index.html re-stamped' if addr else ''))
    return 0


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
