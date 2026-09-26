#!/usr/bin/env python3
"""apply963.py <tree> [--option A|B|C]  — apply every hunk of code/hunks.md (queue 963) to a FreeMotion tree.

It reads the code blocks OUT OF hunks.md, so the document the builder reads and what this script applies cannot differ.
Every anchor must be found exactly once or it stops with the hunk's name and changes nothing (it edits in memory and
writes all files only at the end). Used by the planning chat to run the hunks on a COPY of the tree; the builder can run
it on the real tree instead of pasting by hand:
    python3 tools/design/plans/2026-09-26-panels/code/apply963.py . --option C
The ?v= busters are bumped by +1 from whatever the tree has (index.html), and js/tilefit.js starts at ?v=1.
"""
import os, re, sys

HERE = os.path.dirname(os.path.abspath(__file__))
tree = sys.argv[1]
opt = 'C'
if '--option' in sys.argv: opt = sys.argv[sys.argv.index('--option') + 1].upper()

md = open(os.path.join(HERE, 'hunks.md')).read()
parts = re.split(r'\n### (H\d+b?)', md)
B = {parts[i]: re.findall(r'```[a-z]*\n(.*?)```', parts[i + 1], re.S) for i in range(1, len(parts), 2)}

files = {}
def get(rel):
    if rel not in files: files[rel] = open(os.path.join(tree, rel)).read()
    return files[rel]
def put(rel, s): files[rel] = s
def once(s, a, name):
    n = s.count(a)
    if n != 1: sys.exit('%s: anchor found %d times (want 1): %r' % (name, n, a[:90]))
    return s.index(a)
def replace_once(rel, a, b, name):
    s = get(rel); once(s, a, name); put(rel, s.replace(a, b, 1))
def span(rel, start, end, name, include_end=True):
    s = get(rel); i = once(s, start, name); j = s.index(end, i)
    return s, i, (j + len(end)) if include_end else j

# ---- H2 / H13 / tests: whole files
tf = open(os.path.join(HERE, 'tilefit.js')).read()
if opt == 'A': tf = tf.replace("const LADDER = ['stack', 'row', 'icon'];", "const LADDER = ['stack', 'icon'];")
if opt == 'B': tf = tf.replace("const LADDER = ['stack', 'row', 'icon'];", "const LADDER = ['stack'];").replace("const GATE = { stack: 22 };", "const GATE = {};").replace("const TAB_WORDS_GO = true;", "const TAB_WORDS_GO = false;")
files['js/tilefit.js'] = tf

# ---- H1 index.html busters
ix = get('index.html')
def bump(s, name):
    m = re.search(r'(%s\?v=)(\d+)' % re.escape(name), s)
    if not m: sys.exit('H1: no ?v= for ' + name)
    return s[:m.start(2)] + str(int(m.group(2)) + 1) + s[m.end(2):]
for n in ('js/addmenu.js', 'js/inspector.js', 'styles.css'): ix = bump(ix, n)
a = re.search(r'  <script src="js/addmenu\.js\?v=\d+"></script>\n', ix)
ix = ix[:a.start()] + '  <script src="js/tilefit.js?v=1"></script>\n' + ix[a.start():]
put('index.html', ix)

# ---- H3 addmenu.js: the solver moves out
h = B['H3']
replace_once('js/addmenu.js', h[0], '', 'H3a')
s, i, j = span('js/addmenu.js', h[1].rstrip('\n'), h[2].rstrip('\n'), 'H3b')
put('js/addmenu.js', s[:i] + h[3].rstrip('\n') + s[j:])

# ---- H4 applyPlan
s = get('js/addmenu.js')
i = once(s, '      function applyPlan(plan, box) {', 'H4')
j = s.index('      /* Deliberately built with textContent and appendChild rather than innerHTML:', i)
put('js/addmenu.js', s[:i] + B['H4'][0] + '\n' + s[j:])

# ---- H5 fitBox guard, tabsSettled, drawBody top
h = B['H5']
replace_once('js/addmenu.js', h[0], h[1], 'H5a')
s = get('js/addmenu.js')
k = once(s, h[1].rstrip('\n'), 'H5b') + len(h[1].rstrip('\n'))
k = s.index('\n      }\n', k) + len('\n      }\n')
put('js/addmenu.js', s[:k] + h[2] + s[k:])
replace_once('js/addmenu.js', h[3], h[3] + h[4], 'H5c')

# ---- H5b the observer watches the container too
h = B['H5b']; replace_once('js/addmenu.js', h[0], h[1], 'H5b')

# ---- H6 plan with the ladder
s = get('js/addmenu.js')
i = once(s, '        var plan = null, box = null;\n', 'H6')
j = s.index('        applyPlan(plan, box);\n', i) + len('        applyPlan(plan, box);\n')
put('js/addmenu.js', s[:i] + B['H6'][0] + s[j:])

# ---- H7 / H8 / H9 / H10 inspector.js
h = B['H7']; replace_once('js/inspector.js', h[0], h[0] + h[1], 'H7')
h = B['H8']; replace_once('js/inspector.js', h[0], h[0] + h[1], 'H8')
h = B['H9']; replace_once('js/inspector.js', h[0], h[1], 'H9')
h = B['H10']
s = get('js/inspector.js')
i = once(s, "    init() {\n      root = document.getElementById('inspector');\n", 'H10') + len("    init() {\n      root = document.getElementById('inspector');\n")
put('js/inspector.js', s[:i] + h[1] + s[i:])

# ---- H11 styles.css: delete the --tl-h arithmetic block
h = B['H11']
s = get('styles.css')
i = once(s, h[0].rstrip('\n'), 'H11')
j = once(s, h[1].rstrip('\n'), 'H11 end')
put('styles.css', s[:i] + h[2] + '\n' + s[j:])

# ---- H12 styles.css: the add menu's fit block keeps only the body + pager rules
s = get('styles.css')
i = once(s, '/* ---- QUEUE 50 (v5.69): PC ONLY — the tile grid is MEASURED against the panel', 'H12')
m0 = s.index('@media (min-width: 701px) {', i)
m1 = s.index('/* ---- Freehand / Vector drawing overlay + toolbar (v2.39) ---- */', m0)
put('styles.css', s[:m0] + B['H12'][0] + '\n' + open(os.path.join(HERE, 'tilefit.css')).read() + '\n' + s[m1:])   # H12 + H13
# H12's last line: the one comment that still names the old variable (review, 26 Sep: it was in hunks.md but not applied here)
replace_once('styles.css', 'pager height (`--am-pager`, a grid with a dots row)', 'pager height (`--tf-box` since queue 963, `--am-pager` before; a grid with a dots row)', 'H12 comment')

# ---- tests: append 963, retune 672 / 918.3 (H14 / H15)
t = get('tests/tests.js')
h = B['H14']; a14 = h[0].rstrip('\n').split('\n')
anchor = a14[0] + '\n' + a14[1] + '\n'
once(t, anchor + a14[2], 'H14'); t = t.replace(anchor + a14[2], anchor + h[1] + a14[2], 1)
h = B['H15']; once(t, h[0], 'H15'); t = t.replace(h[0], h[0] + h[1], 1)
tests963 = open(os.path.join(HERE, 'tests-963.js')).read()
# the suite file ends `  });\n\n})();` — the 963 block goes just inside that closing IIFE
end = t.rstrip().rfind('})();')
if end < 0: sys.exit('tests: no closing })(); at the end of tests/tests.js')
t = t[:end] + tests963.rstrip('\n') + '\n\n' + t[end:]
put('tests/tests.js', t)

for rel, s in files.items():
    with open(os.path.join(tree, rel), 'w') as f: f.write(s)
print('applied option %s to %s: %s' % (opt, tree, ', '.join(sorted(files))))
