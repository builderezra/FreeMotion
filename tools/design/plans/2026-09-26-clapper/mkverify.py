import json, sys, gen
# harness: capture the suite-style tests, shim the width helpers to "run only if this shot is that layout"
HARN = r'''
const __T = [];
const test = (name, opts, fn) => __T.push({ name, fn });
const atPhoneWidth = async (fn, w) => matchMedia('(max-width: 700px)').matches ? fn() : 'skipped';
const atWideWidth = async (fn, w) => !matchMedia('(max-width: 700px)').matches ? fn() : 'skipped';
%TESTS%
const __run = async (label) => { const out = {}; for (const t of __T) { const t0 = performance.now(); try { await t.fn(); out[t.name.slice(0, 12)] = 'PASS in ' + Math.round(performance.now() - t0) + 'ms'; } catch (e) { out[t.name.slice(0, 12)] = 'FAIL: ' + String(e.message || e).slice(0, 230); } } return out; };
'''
tests = open('test-new.js').read() + '\n' + open('test-917.js').read()
mode = sys.argv[1]
if mode == 'plain':
    js = HARN.replace('%TESTS%', tests) + r'''
if (FM.home && FM.home.isOpen && FM.home.isOpen()) FM.home.close();
await new Promise(r => setTimeout(r, 500));
return { plain: await __run() };
'''
else:
    # proto: reuse the probe's setup (it returns info) then run the tests and the mutations
    setup = gen.probe({}, sys.argv[2] if len(sys.argv) > 2 else 'A').replace('return info;', '')
    js = HARN.replace('%TESTS%', tests) + setup + r'''
const R = { proto: await __run() };
const css = document.getElementById('proto-clap-css').textContent, svgHTML = d.querySelector('.dh-icon').innerHTML;
const __chk = (c) => c; const reset = () => { document.getElementById('proto-clap-css').textContent = css; d.querySelector('.dh-icon').innerHTML = svgHTML; const x = document.getElementById('mut'); if (x) x.remove(); };
const fp = () => document.getElementById('proto-clap-css').textContent + d.querySelector('.dh-icon').innerHTML + (document.getElementById('mut') ? 'M' : '');
const mut = async (name, fn) => { reset(); const f0 = fp(); fn(); if (fp() === f0) { R[name] = 'NO-OP MUTATION'; return; } await new Promise(r => setTimeout(r, 60)); R[name] = (await __run())['NNN the empt']; reset(); };
await mut('M1 hinge via transform-origin only (no translate wrappers)', () => { d.querySelectorAll('.dh-icon g[transform]').forEach(g => g.setAttribute('transform', 'translate(0 0)')); });
await mut('M2 stick not animated', () => { const s = document.createElement('style'); s.id = 'mut'; s.textContent = '.dh-stick { animation-name: none !important; }'; document.head.appendChild(s); });
await mut('M3 no whack lines animation', () => { const s = document.createElement('style'); s.id = 'mut'; s.textContent = '.dh-whack path { animation-name: none !important; }'; document.head.appendChild(s); });
await mut('M4 no home-open stop', () => { document.getElementById('proto-clap-css').textContent = css.replace('body.home-open .dh-stick, body.home-open .dh-body, body.home-open .dh-whack path { animation: none; }', ''); });
await mut('M5 gentle 600ms close', () => { document.getElementById('proto-clap-css').textContent = css.replace('6.333% { transform: rotate(-23.32deg); animation-timing-function: cubic-bezier(.6, 0, 1, .6); }', '').replace('5% { transform: rotate(-20.32deg); animation-timing-function: cubic-bezier(.45, 0, .25, 1); }', '0.2% { transform: rotate(-20.32deg); animation-timing-function: ease; }'); });
await mut('M6 no reduced-motion rule', () => { document.getElementById('proto-clap-css').textContent = css.replace(/@media \(prefers-reduced-motion[^\n]*/, ''); });
return R;
'''
open('verify-%s%s.js' % (mode, sys.argv[2] if len(sys.argv) > 2 else ''), 'w').write(js)
print(len(js))
