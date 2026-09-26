#!/usr/bin/env python3
"""Apply the plan's exact hunks to a COPY of the app (never the repo). Usage: apply_patch.py <copy-dir> [--tests-only]
Each hunk must match exactly once, or this stops — the same promise the plan makes to the builder."""
import sys, os
D = sys.argv[1]; tests_only = '--tests-only' in sys.argv
M = os.path.dirname(os.path.abspath(__file__))

def sub(path, old, new):
    p = os.path.join(D, path); s = open(p, encoding='utf-8').read()
    n = s.count(old)
    if n != 1: sys.exit(f'{path}: anchor found {n} times, expected 1:\n{old[:200]}')
    open(p, 'w', encoding='utf-8').write(s.replace(old, new)); print('patched', path)

# ---- tests: both new tests, before the HUNT-a block (right after the 936 fresh-start test) ----
ANCHOR = "  /* ═══ HUNT-a (queue 690, fourth hunt)"
sub('tests/tests.js', ANCHOR, open(os.path.join(M, 'test_A.js')).read() + '\n' + open(os.path.join(M, 'test_B.js')).read() + '\n' + ANCHOR)
if tests_only: sys.exit(0)

# ---- (A) js/home-arrow.js ----
sub('js/home-arrow.js', """  'use strict';
  function draw(opts) {
    var NS = 'http://www.w3.org/2000/svg', ID = 'hm-arrow936';
    var old = document.getElementById(ID); if (old) old.remove();
    var home = document.getElementById('home-screen'), plus = document.getElementById('hm-new');
    var title = document.querySelector('#home-screen .hm-grid .hm-empty-title');
    if (!home || !plus || !title) return null;
    var t = title.getBoundingClientRect(), p = plus.getBoundingClientRect();
""", open(os.path.join(M, 'hunk_A1.js')).read())
sub('js/home-arrow.js', """  function clear() { const o = document.getElementById('hm-arrow936'); if (o) o.remove(); }
""", """  function clear() { gen++; const o = document.getElementById('hm-arrow936'); if (o) o.remove(); }   // queue 957: also voids a draw still waiting for the + to land
""")

# ---- (B) js/app.js amClamp ----
s = open(os.path.join(D, 'js/app.js'), encoding='utf-8').read()
start = s.index("      const amClamp = (h) => {\n")
end = s.index("      FM.clampAddMenuH = amClamp;")
if s.count("      const amClamp = (h) => {\n") != 1: sys.exit('amClamp anchor not unique')
s = s[:start] + open(os.path.join(M, 'hunk_B1.js')).read() + s[end:]
open(os.path.join(D, 'js/app.js'), 'w', encoding='utf-8').write(s); print('patched js/app.js (amClamp)')
sub('js/app.js', """      /* queue 807: a window that shrinks under a raised panel used to leave --am-h where the drag put it,
         so the handle could end up above the screen with no way to reach it; re-clamped to the same
         0.62·vh rule the drag obeys, and the sheet told to follow. */""", """      /* queue 807: a window that shrinks under a raised panel used to leave --am-h where the drag put it,
         so the handle could end up above the screen with no way to reach it; re-clamped by amClamp — the
         same rule the drag obeys (queue 958: up to the window's top, handle on screen) — and the sheet
         told to follow. */""")

# ---- the #807 test that assumed a ceiling below 0.95 of the window ----
sub('tests/tests.js', """      const tall = Math.round(window.innerHeight * 0.95);""",
    """      const tall = window.innerHeight + 100;   // queue 958: the drag may now reach the window's top, so "too tall" means taller than the window""")
