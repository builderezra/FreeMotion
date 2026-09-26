// Corner-lines prototype for #t-sel (PC layer-action group). Injected by tools/shot.py --js-file.
// Nothing here is written to the repo: it adds one <style> element to the page and swaps its text.
// window.__ZOOM (set by a prefix line) renders the whole page at CSS zoom 2 to imitate a DPR-2 screen.
const sleep = ms => new Promise(r => setTimeout(r, ms));
const Z = window.__ZOOM || 1;
if (Z !== 1) (document.getElementById('timeline-panel') || document.getElementById('transport')).style.zoom = String(Z);   // only the panel: the whole page at zoom lays out at the full viewport and the row lands off-screen (measured: row top 2682 in an 1800 shot)
if (FM.home && FM.home.isOpen && FM.home.isOpen()) FM.home.close();
await sleep(500);
const P = FM.scene.project;
const mk = (name, shape, fill, x, y) => { const l = FM.makeLayer('shape', { name, shape, x: Math.round(P.width * x), y: Math.round(P.height * y), shapeW: Math.round(P.width * 0.3), shapeH: Math.round(P.width * 0.3), fill }); l.start = 0; l.duration = 4; return l; };
const A = mk('Person', 'rect', '#2fd06a', 0.5, 0.35), B = mk('Star', 'ellipse', '#3b6ff0', 0.3, 0.6), C3 = mk('Flame', 'rect', '#e0443a', 0.7, 0.7);
FM.scene.layers.push(A, B, C3);
FM.selectLayer(A.id); FM.refreshAll();
await sleep(500);

const V = {
  A: { w: 1.5, c: 'rgba(255,255,255,.6)',  rx: '60%', ry: '85%', solid: '25%' },
  B: { w: 1.5, c: 'var(--accent)',         rx: '60%', ry: '85%', solid: '25%' },
  C: { w: 2,   c: 'rgba(255,255,255,.85)', rx: '30%', ry: '70%', solid: '35%' },
  D: { w: 1.5, c: 'rgba(255,255,255,.5)',  rx: '95%', ry: '100%', solid: '15%' },
};
const mask = (o, at) => `radial-gradient(ellipse ${o.rx} ${o.ry} at ${at}, #000 ${o.solid}, transparent 100%)`;
const css = o => !o ? '' : `
html #t-sel.has-sel { position: relative; background: none; border: 0; padding: 1px 6px; }
html #t-sel.has-sel::before, html #t-sel.has-sel::after {
  content: ''; position: absolute; inset: 0; pointer-events: none; box-sizing: border-box;
  border-radius: inherit; border: ${o.w}px solid transparent; }
html #t-sel.has-sel::before { border-top-color: ${o.c}; border-right-color: ${o.c};
  -webkit-mask-image: ${mask(o, '100% 0')}; mask-image: ${mask(o, '100% 0')}; }
html #t-sel.has-sel::after { border-bottom-color: ${o.c}; border-left-color: ${o.c};
  -webkit-mask-image: ${mask(o, '0 100%')}; mask-image: ${mask(o, '0 100%')}; }`;
const st = document.createElement('style'); st.id = 'probe-corners'; document.head.appendChild(st);
const sel = document.getElementById('t-sel');
const row = document.getElementById('transport');
const r4 = el => { const r = el.getBoundingClientRect(); return [r.left, r.top, r.width, r.height].map(v => Math.round(v * 10) / 10); };

// the proving test's synchronous core, verbatim from plan.md — returns 'PASS' or the error it would throw
const alphaOf = c => { const n = (String(c).match(/[\d.]+/g) || []).map(Number); return n.length > 3 ? n[3] : (n.length === 3 ? 1 : 0); };
function check() {
  try {
    const r = sel.getBoundingClientRect();
    if (!sel.classList.contains('has-sel') || r.width < 60 || r.height < 24) throw new Error('control: group ' + Math.round(r.width) + 'x' + Math.round(r.height));
    const cs = getComputedStyle(sel);
    if (alphaOf(cs.backgroundColor) > 0.02 || cs.backgroundImage !== 'none') throw new Error('the group still has a background (' + cs.backgroundColor + ')');
    ['Top', 'Right', 'Bottom', 'Left'].forEach(s => { const w = parseFloat(cs['border' + s + 'Width']) || 0; if (w > 0 && alphaOf(cs['border' + s + 'Color']) > 0.02) throw new Error('the group still has its outline (' + s + ' ' + cs['border' + s + 'Width'] + ' ' + cs['border' + s + 'Color'] + ')'); });
    if (cs.boxShadow && cs.boxShadow !== 'none') throw new Error('box-shadow outline ' + cs.boxShadow);
    const corner = (pseudo, lit, dark, at, pos) => {
      const p = getComputedStyle(sel, pseudo);
      if (p.content === 'none' || p.display === 'none') throw new Error(pseudo + ' is not drawn — there is no ' + at + ' corner line');
      if (p.position !== 'absolute' || p.pointerEvents !== 'none') throw new Error(pseudo + ' ' + p.position + ' / ' + p.pointerEvents);
      lit.forEach(s => { if (!(parseFloat(p['border' + s + 'Width']) >= 1) || alphaOf(p['border' + s + 'Color']) < 0.3) throw new Error('the ' + at + ' corner has no visible ' + s + ' arm (' + p['border' + s + 'Width'] + ' ' + p['border' + s + 'Color'] + ')'); });
      dark.forEach(s => { if ((parseFloat(p['border' + s + 'Width']) || 0) > 0 && alphaOf(p['border' + s + 'Color']) > 0.02) throw new Error('the ' + at + ' corner also draws ' + s); });
      if (Math.abs(parseFloat(p.width) - r.width) > 1.5 || Math.abs(parseFloat(p.height) - r.height) > 1.5) throw new Error(at + ' corner box ' + p.width + 'x' + p.height + ' is not the group ' + r.width + 'x' + r.height);
      const m = String(p.maskImage && p.maskImage !== 'none' ? p.maskImage : (p.webkitMaskImage || 'none'));
      if (!/radial-gradient\(/.test(m) || !pos.test(m)) throw new Error('the ' + at + ' corner has no radial fade centred on it (mask: ' + m.slice(0, 120) + ')');
      const cols = m.match(/rgba?\([^)]*\)|transparent/g) || [];
      if (cols.length < 2 || alphaOf(cols[0]) < 0.99 || alphaOf(cols[cols.length - 1] === 'transparent' ? 'rgba(0,0,0,0)' : cols[cols.length - 1]) > 0.01) throw new Error('the ' + at + ' fade is not solid-then-gone (' + m.slice(0, 120) + ')');
    };
    corner('::before', ['Top', 'Right'], ['Bottom', 'Left'], 'top-right', /at (100%|right) (0(px|%)?|top)[ ,)]/);
    corner('::after', ['Bottom', 'Left'], ['Top', 'Right'], 'bottom-left', /at (0(px|%)?|left) (100%|bottom)[ ,)]/);
    const del = document.getElementById('btn-del-layer'), dr = del.getBoundingClientRect(), hit = document.elementFromPoint(dr.left + dr.width / 2, dr.top + dr.height / 2);
    if (!hit || !(hit === del || del.contains(hit))) throw new Error('delete is covered by ' + (hit && (hit.id || hit.className)));
    return 'PASS';
  } catch (e) { return 'FAIL: ' + e.message; }
}

// measure every variant synchronously, then put the page back to the current look
const out = { checks: {}, dpr: devicePixelRatio, iw: innerWidth, zoom: Z, studio: document.body.classList.contains('layout-studio'),
  theme: document.documentElement.getAttribute('data-theme'), rowRect: r4(row), rowBg: getComputedStyle(row).backgroundColor, panelBg: getComputedStyle(document.getElementById('timeline-panel') || row).backgroundColor,
  accent: getComputedStyle(document.documentElement).getPropertyValue('--accent').trim(), kids: [...sel.children].filter(k => k.getBoundingClientRect().width > 0).map(k => k.id), v: {} };
for (const k of ['CUR', 'A', 'B', 'C', 'D']) {
  st.textContent = css(V[k]);
  const cs = getComputedStyle(sel), b = getComputedStyle(sel, '::before'), a = getComputedStyle(sel, '::after');
  const del = document.getElementById('btn-del-layer'), dr = del.getBoundingClientRect();
  const hit = document.elementFromPoint(dr.left + dr.width / 2, dr.top + dr.height / 2);
  if (k === 'A') out.v[k] = { rect: r4(sel), bg: cs.backgroundColor, border: cs.borderTopWidth + ' ' + cs.borderTopColor, pad: cs.padding, radius: cs.borderTopLeftRadius,
    before: { content: b.content, bt: b.borderTopWidth + ' ' + b.borderTopColor, br: b.borderRightWidth + ' ' + b.borderRightColor, bb: b.borderBottomColor, mask: (b.maskImage || b.webkitMaskImage || '').slice(0, 90), rect: b.width + 'x' + b.height },
    after: { bb: a.borderBottomWidth + ' ' + a.borderBottomColor, bl: a.borderLeftColor, bt: a.borderTopColor, mask: (a.maskImage || a.webkitMaskImage || '').slice(0, 90) },
    delHit: hit && (hit === del || del.contains(hit)) };
  out.checks[k] = check();
}
// grows with the group: two selected (group + mask-group appear), then copy moved in (#425), variant A
st.textContent = css(V.A);
if (B) { FM.toggleSelect(B.id); FM.refreshAll(); await sleep(350);
  const far = document.getElementById('t-far'), onTop = id => { const e = document.getElementById(id); if (!e) return 'none'; const q = e.getBoundingClientRect(); const t = document.elementFromPoint(q.left + q.width / 2, q.top + q.height / 2); return (t === e || e.contains(t)) ? 'self' : ((t && (t.id || t.className)) || 'null'); };
  out.multi = { kids: [...sel.children].filter(k => k.getBoundingClientRect().width > 0).map(k => k.id), rect: r4(sel), far: far && r4(far), before: getComputedStyle(sel, '::before').width, after: getComputedStyle(sel, '::after').width, onTopMore: onTop('btn-more-layer'), onTopMask: onTop('btn-maskgroup') };
  out.checks.multiA = check();
  FM.selectLayer(A.id); FM.refreshAll(); await sleep(350); }
out.one = { rect: r4(sel), far: document.getElementById('t-far') && r4(document.getElementById('t-far')) }; out.checks.oneA = check();
FM.selectLayer(null); FM.refreshAll(); await sleep(250);
out.none = { rect: r4(sel), hasSel: sel.classList.contains('has-sel'), beforeContent: getComputedStyle(sel, '::before').content };
FM.selectLayer(A.id); FM.refreshAll(); await sleep(350);
st.textContent = '';

// the visual timeline: named states, one every GAP ms (screenshots are slow at 2880 wide — measured: 11 frames 600ms apart
// all landed late, the second frame already showing the sixth state), frames at GAP/2 + GAP*i (see --frames)
const lm = document.getElementById('btn-layermenu'), lmHome = lm && { p: lm.parentNode, n: lm.nextSibling };
const one = () => { FM.selectLayer(A.id); FM.refreshAll(); };
const two = () => { FM.selectLayer(A.id); FM.toggleSelect(B.id); FM.refreshAll(); };
const copyIn = on => { if (!lm) return; if (on) sel.insertBefore(lm, sel.firstChild); else if (lmHome) lmHome.p.insertBefore(lm, lmHome.n && lmHome.n.parentNode === lmHome.p ? lmHome.n : null); };
const theme = glass => { if (glass) document.documentElement.setAttribute('data-theme', 'glass'); else document.documentElement.removeAttribute('data-theme'); };
const STATES = {
  CUR:  () => { theme(1); copyIn(0); one(); st.textContent = ''; },
  A:    () => { theme(1); copyIn(0); one(); st.textContent = css(V.A); },
  B:    () => { theme(1); copyIn(0); one(); st.textContent = css(V.B); },
  C:    () => { theme(1); copyIn(0); one(); st.textContent = css(V.C); },
  D:    () => { theme(1); copyIn(0); one(); st.textContent = css(V.D); },
  CUR2: () => { theme(1); copyIn(0); two(); st.textContent = ''; },
  A2:   () => { theme(1); copyIn(0); two(); st.textContent = css(V.A); },
  B2:   () => { theme(1); copyIn(0); two(); st.textContent = css(V.B); },
  C2:   () => { theme(1); copyIn(0); two(); st.textContent = css(V.C); },
  Acopy: () => { theme(1); one(); copyIn(1); st.textContent = css(V.A); },
  Aclassic: () => { copyIn(0); one(); theme(0); st.textContent = css(V.A); },
  CURclassic: () => { copyIn(0); one(); theme(0); st.textContent = ''; },
};
const SEQ = window.__SEQ || Object.keys(STATES), GAP = window.__GAP || 600;
out.seq = SEQ; out.gap = GAP;
SEQ.forEach((k, i) => setTimeout(STATES[k], GAP * i));
return out;
