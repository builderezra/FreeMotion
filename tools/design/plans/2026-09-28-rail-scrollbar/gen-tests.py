#!/usr/bin/env python3
"""Build scene-tests.js: the proposed tests (code/tests-rail.js) plus the two existing tests most likely to break
(queue 565's dots test and queue 463's one-row test, extracted VERBATIM from tests/tests.js), run twice in one page —
first on the app as it is (HEAD), then with option A switched on by injection. Expected: the new tests FAIL on HEAD and
PASS on A; 565 and 463 PASS on both. The real-mouse test is listed and skipped (it needs tests/_cdp.py's real input).

    python3 gen-tests.py && ./run.sh scene-tests.js "$S/t.png" --width 900 --height 760
"""
import os, re

HERE = os.path.dirname(os.path.abspath(__file__))
SUITE = os.path.join(HERE, '..', '..', '..', '..', 'tests', 'tests.js')
src = open(SUITE).read().split('\n')


def extract(prefix):
    start = next(i for i, l in enumerate(src) if l.startswith("  test('" + prefix))
    end = next(i for i in range(start + 1, len(src)) if src[i] == '  });')
    return '\n'.join(src[start:end + 1])


HARNESS = r"""
const results = {};
async function runAll() {
  const out = [];
  for (const t of TESTS) {
    const name = t.n.slice(0, 70);
    if (/real mouse/.test(t.n)) { out.push('SKIP  ' + name + '  (needs tests/_cdp.py real input)'); continue; }
    const t0 = Date.now();
    try { await t.f(); out.push('PASS  ' + name + '  ' + (Date.now() - t0) + 'ms'); }
    catch (e) { out.push('FAIL  ' + name + '  — ' + String(e && e.message || e).slice(0, 260)); }
  }
  return out;
}
try { if (FM.home && FM.home.isOpen && FM.home.isOpen()) FM.home.close(); } catch (e) {}
await sleep(400);
results.HEAD = await runAll();
// switch option A on: its CSS, and the rows wrapped the moment the filters tab or the effects browser renders them
PROTO.style('proto-rail', RAIL_CSS); PROTO.style('proto-old', PROTO.cssOld);
const openTab0 = FM.inspector.openFxTab, openB0 = FM.fxBrowser.open;
FM.inspector.openFxTab = function () { const r = openTab0.apply(this, arguments); PROTO.wrap(); setTimeout(PROTO.wrap, 50); return r; };
FM.fxBrowser.open = function () { const r = openB0.apply(this, arguments); PROTO.wrapFeatured(); setTimeout(PROTO.wrapFeatured, 50); return r; };
results.A = await runAll();
// 917.13 reads the New row's title through row.parentElement; on A that must still work (its atPhoneWidth needs the runner)
{ const L = FM.makeLayer('shape', { shape: 'rect', x: 1, y: 1, shapeW: 9, shapeH: 9, fill: '#fff' }); L.start = 0; L.duration = 2;
  FM.scene.layers.push(L); FM.selectLayer(L.id); FM.refreshAll(); await sleep(150); FM.fxBrowser.open(L); await sleep(400);
  const row = document.querySelector('#fx-browser .fxb-featured');
  results.t917_13_titleViaParent = !!(row && row.parentElement.querySelector('.fxb-sec-title'));
  const sec = row.parentElement, a = sec.querySelector('.fm-rail-arrow--next'), cr = row.querySelector('.fxb-card').getBoundingClientRect(), ar = a.getBoundingClientRect();
  results.newRowArrow = { secTop: Math.round(sec.getBoundingClientRect().top), rowTop: Math.round(row.getBoundingClientRect().top), scTopVar: sec.style.getPropertyValue('--rail-sc-top'),
    arrowCentreY: Math.round(ar.top + ar.height / 2 - cr.top), cardPictureCentre: 47, arrowX: [Math.round(ar.left), Math.round(ar.right)], sheetX: Math.round(document.getElementById('fx-browser').getBoundingClientRect().left) };
  FM.fxBrowser.close(); }
return results;
"""

MUTANTS = r"""
// Each mutant breaks ONE thing in option A; test 1 must go red for each, or its assertion is dead.
const runT1 = async () => { try { await TESTS.filter(t => /^NNN: on a mouse/.test(t.n))[0].f(); return 'PASS (assertion DEAD)'; } catch (e) { return 'CAUGHT — ' + String(e.message).slice(0, 170); } };
try { if (FM.home && FM.home.isOpen && FM.home.isOpen()) FM.home.close(); } catch (e) {}
await sleep(400);
const out = {};
const openTab0 = FM.inspector.openFxTab;
const arm = (css, wrap) => { PROTO.style('proto-rail', css); PROTO.style('proto-old', PROTO.cssOld);
  FM.inspector.openFxTab = function () { const r = openTab0.apply(this, arguments); wrap(); setTimeout(wrap, 50); return r; }; };
const wrapNoMark = () => { PROTO.wrap(); document.querySelectorAll('.flt-grid').forEach(g => g.removeEventListener('scroll', protoMark)); };
arm(RAIL_CSS, PROTO.wrap); out.control_A = await runT1();
arm(RAIL_CSS, wrapNoMark); out.m1_old_dot_formula = await runT1();
arm(RAIL_CSS.replace('.fm-rail-arrow { display: none; }', ''), PROTO.wrap); out.m2_arrows_not_hidden_on_touch = await runT1();
arm(RAIL_CSS, () => { PROTO.wrap(); document.querySelectorAll('.fm-rail-arrow').forEach(b => { b.tabIndex = 0; }); }); out.m3_arrows_in_tab_order = await runT1();
arm(RAIL_CSS, () => { PROTO.wrap(); document.querySelectorAll('.flt-rail').forEach(r => { r.classList.add('can-r'); }); }); out.m4_fitting_row_offers_arrow = await runT1();
arm(RAIL_CSS, PROTO.wrap); PROTO.style('proto-old', '@media (hover: hover) and (pointer: fine) { .flt-grid { scrollbar-width: thin; } }'); out.m5_old_bar_kept = await runT1();
return out;
"""

TFILL = r"""
// the template screen's slot rail: NOW vs A, and the existing template test on both
const tfTest = TESTS[0];
const facts = () => { const s = document.querySelector('#tpl-fill .tfill-slots'), r = s.getBoundingClientRect(), f = s.querySelector('.tfill-slot').getBoundingClientRect();
  return { barPx: s.offsetHeight - s.clientHeight, sw: s.scrollWidth, cw: s.clientWidth, x: [Math.round(r.left), Math.round(r.width)], firstSlotFromEdge: Math.round(f.left - r.left),
    rail: s.parentNode.className, sbw: getComputedStyle(s).scrollbarWidth }; };
const openWith16 = async () => { const Ls = []; for (let i = 0; i < 16; i++) { const l = FM.makeLayer('shape', { name: 'S' + i, shape: 'rect', x: 20, y: 20, shapeW: 40, shapeH: 40, fill: '#3a7bd5' }); l.start = 0; l.duration = 4; Ls.push(l); }
  FM.scene.layers.length = 0; Ls.forEach(l => FM.scene.layers.push(l)); FM.refreshAll(); await sleep(200); FM.templateFill.open(); await sleep(600); };
const close = async () => { const d = document.querySelector('#tpl-fill .tfill-done'); if (d) d.click(); await sleep(300); };
try { if (FM.home && FM.home.isOpen && FM.home.isOpen()) FM.home.close(); } catch (e) {}
await sleep(400);
const out = {};
try { tfTest.f(); out.templateTestHEAD = 'PASS'; } catch (e) { out.templateTestHEAD = 'FAIL ' + e.message.slice(0, 200); }
await close();
await openWith16(); out.HEAD = facts(); await close();
PROTO.style('proto-rail', RAIL_CSS); PROTO.style('proto-tfill', PROTO.cssTfill);
const open0 = FM.templateFill.open; FM.templateFill.open = function () { const r = open0.apply(this, arguments); PROTO.wrapTfill(); return r; };
try { tfTest.f(); out.templateTestA = 'PASS'; } catch (e) { out.templateTestA = 'FAIL ' + e.message.slice(0, 200); }
await close();
await openWith16(); await sleep(300); out.A = facts();
const s = document.querySelector('#tpl-fill .tfill-slots'), rail = s.parentNode;
out.A.state = rail.className;
rail.querySelector('.fm-rail-arrow--next').click(); await sleep(900);
const st = s.querySelector('.tfill-slot').getBoundingClientRect().width + 10;
out.A.afterOneClick = { scrollLeft: Math.round(s.scrollLeft), stride: st, per: FM._railGeometry(s, '.tfill-slot').per, state: rail.className };
await close();
return out;
"""

import sys
if len(sys.argv) > 1 and sys.argv[1] == 'tfill':
    parts = ['const TESTS = []; const test = (n, o, f) => TESTS.push({ n: n, f: f });',
             extract('templates: the Insert-your-Media screen lists the clips'), TFILL]
    open(os.path.join(HERE, 'scene-tfill.js'), 'w').write('\n'.join(parts))
    print('wrote scene-tfill.js')
    sys.exit(0)
if len(sys.argv) > 1 and sys.argv[1] == 'mutants':
    parts = ['const TESTS = []; const test = (n, o, f) => TESTS.push({ n: n, f: f });',
             open(os.path.join(HERE, 'code', 'tests-rail.js')).read(), MUTANTS]
    open(os.path.join(HERE, 'scene-mutants.js'), 'w').write('\n'.join(parts))
    print('wrote scene-mutants.js')
    sys.exit(0)

parts = ['const TESTS = []; const test = (n, o, f) => TESTS.push({ n: n, f: f });',
         extract('565:'),
         extract('a long filter section is one swipeable row'),
         open(os.path.join(HERE, 'code', 'tests-rail.js')).read(),
         HARNESS]
open(os.path.join(HERE, 'scene-tests.js'), 'w').write('\n'.join(parts))
print('wrote scene-tests.js')
