/* V10 — Your decisions (DESIGN §17 D1–D24, the "decided with the recommended option" pictures, the §8.9 words).
 *
 * 1 Oct, his answers (verbatim in ANS below): every pick he made that still stands is shown DECIDED, greyed, with his own
 * words, and cannot be re-picked here. Only the six still open are live picks: D3 and D14b (asked again, because his A on
 * each would change Full, his 1 Oct rule), D18 (rewritten after he answered), D22, D23 and D24 (new). "Do recommended" and
 * "Copy my answers" cover those six only. D24's pictures are the real-app sheets (cog/d24-*.jpg, cropped into img/).
 *
 * 1 Oct, his rule (DESIGN §0.4: Full keeps its design and function; the switch is the ⚙ cog's third block): D2 is SETTLED by his
 * words and shown as such (no pick, not counted); D3 and D14 are asked again in a form that leaves Full alone; D15 and D18 are
 * reworded for a play bar with no switch; D11 says the animation plays as the cog closes; D16 row 6 (the back button) is
 * withdrawn; D22 (a Settings row?) and D23 (does the cog close?) are new. Picks stored before this revision for D2, D3, D14,
 * D15 and D18 are dropped once (state version 2), because their options changed meaning.
 *
 * One card per decision: the question, why it matters, a drawn picture of every option (one marked Recommended),
 * tap to pick. The edit-behaviour pictures (D4–D8, D19, and the friend's-title case) are drawn from VIS.engine
 * runs on Beach day, so the "after" strips are the real rules, not drawings of them. Non-recommended options are
 * made by setting Stay put first (what "nothing follows" means) or by removing the title (D6 B).
 *
 * Picks live in localStorage (key vis.v10.v1, every access in try/catch). "Do recommended" fills every unpicked
 * one (pressed again, it makes every one recommended), with Undo. "Copy my answers" writes a plain message
 * ("D1 A, D2 B, …") with navigator.clipboard inside the click, falling back to selecting the textarea.
 * The name picked in D1 is used everywhere else on this page (spans .v10-nS / .v10-nF), so he sees his words.
 * CSS is injected once (id v10-css), so index.html needs no extra <link>.
 */
(function () {
  'use strict';
  const VIS = window.VIS;
  if (!VIS || !VIS.register) return;
  const E = VIS.engine, el = VIS.el, esc = VIS.esc, ICONS = VIS.ICONS;
  const KEY = 'vis.v10.v1';
  const reduced = () => !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);

  /* ------------------------------------------------------------ state ------------------------------------------------ */
  function load() {
    let s = null;
    try { s = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) { s = null; }
    s = s && typeof s === 'object' ? s : {};
    ['d', 'x', 'w', 'i'].forEach(k => { if (!s[k] || typeof s[k] !== 'object') s[k] = {}; });
    if (s.v !== 2 && s.v !== 3) { ['D2', 'D3', 'D14', 'D15', 'D18'].forEach(k => { delete s.d[k]; }); s.v = 2; }   // 1 Oct: these changed meaning
    if (s.v === 2) { Object.keys(s.d).forEach(k => { if (!['D3', 'D18', 'D22', 'D23'].includes(k)) delete s.d[k]; }); s.i = {}; s.v = 3; }   // his answers decide the rest
    return s;
  }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (e) { /* private mode: picks last this visit */ } }
  let st = load();

  const NAMES = { A: ['Simple', 'Full'], B: ['Quick', 'Full'], C: ['Clips', 'Layers'], D: ['Cut', 'Motion'] };
  const names = () => NAMES.A;                               // his D1 pick, 1 Oct: "Names: Simple / Full."

  /* His answers, 1 Oct, pasted from the decisions page: "My picks for the simple editor: D1 A, D2 ?, D3 A, D4 A, D5 A, D6 A,
     D7 A, D8 A, D9 A, D10 A, D11 B, D12 A, D13 A, D14 A, D15 A, D16 A, D17 B, D18 ?, D19 A, D20 A, D21 A / Not the recommended
     one: D11 B, D17 B, D20 A. / Not picked yet: D2, D18. / Names: Simple / Full." and, on D11, "Just do the one clip on the far
     left, morph i think it was". D3 A and D14 A's second half are NOT here: each would change Full (DESIGN §0.4), so they are
     asked again (D3, D14b). D2 is settled by his cog words; D18 was rewritten after he answered. */
  const ANS = {
    D1: { k: 'A', said: ['D1 A', 'Names: Simple / Full.'], note: 'Every page now says Simple and Full.' },
    D4: { k: 'A' }, D5: { k: 'A' }, D6: { k: 'A' }, D7: { k: 'A' }, D8: { k: 'A' }, D9: { k: 'A' }, D10: { k: 'A' },
    D11: { k: 'B', said: ['D11 B', 'Just do the one clip on the far left, morph i think it was'], note: 'Only the morph is built. Fold and Slide are dropped everywhere; V1 plays it.' },
    D12: { k: 'A' }, D13: { k: 'A' },
    D14: { k: 'A', note: 'This is the first half. Moving clips while a friend can edit is asked again below, as D14b.' },
    D15: { k: 'A', note: 'Applied to the revised plan: Phase 1 with the switch in the ⚙ cog and {F} untouched.' },
    D16: { k: 'A', note: 'You answered before row 1 became the cog block’s icon and pictures, and before row 6 was withdrawn, so A means the recommended one in each row as it stands now. You will see row 1 in place before it ships.' },
    D17: { k: 'B', note: 'A long song makes the video run on in black, as {F} does today. Nothing trims or fades music, and there is no Ends with the video switch. V2, V3 and V9 show it.' },
    D19: { k: 'A' },
    D20: { k: 'A', note: 'The panel opens inside the left band and scrolls. At 1280×800 it has about 100 px before it scrolls; the picture and the timeline are never covered. A phone held sideways still gets the sheet over the timeline. V4 shows it.' },
    D21: { k: 'A' }
  };
  const isDecided = d => !!ANS[d.id];
  const tag = (i, svg) => { const c = i ? 'v10-nF' : 'v10-nS', t = esc(names()[i]); return svg ? '<tspan class="' + c + '">' + t + '</tspan>' : '<span class="' + c + '">' + t + '</span>'; };
  const nm = (s, svg) => String(s).replace(/\{S\}/g, () => tag(0, svg)).replace(/\{F\}/g, () => tag(1, svg));
  const plain = s => String(s).replace(/\{S\}/g, names()[0]).replace(/\{F\}/g, names()[1]);

  /* ------------------------------------------------------------ drawing kit ------------------------------------------ */
  const C = { bg: '#0a141a', panel: '#0f1e26', panel3: '#172c36', line: '#1d3742', soft: '#16303a', text: '#e9f4f7', dim: '#93aeb9',
    faint: '#63808c', accent: '#5ac7ed', warn: '#ff9f5a', bad: '#ff6b7a', kf: '#ffce4a', good: '#5ad9b0', cap: '#f2c14e',
    txt: '#b18cff', ov: '#4fb3ff', fx: '#ff7aa2', au: '#3fd6a4', full: '#9b87f5', fullInk: '#c3b6ff', sam: '#ff8a5b' };
  const SEC = { text: [C.txt, '#695594'], overlay: [C.ov, '#306288'], effect: [C.fx, '#884559'], behind: ['#8195a0', '#34424a'], captions: [C.cap, '#8d7232'] };
  let uidN = 0;
  const uid = p => 'v10' + p + (++uidN);
  const f = n => Math.round(n * 10) / 10;
  const svg = (w, h, body) => '<svg viewBox="0 0 ' + w + ' ' + h + '" aria-hidden="true" focusable="false">' + body + '</svg>';
  const r = (x, y, w, h, rx, fill, extra) => '<rect x="' + f(x) + '" y="' + f(y) + '" width="' + f(Math.max(0, w)) + '" height="' + f(Math.max(0, h)) + '" rx="' + rx + '" fill="' + fill + '"' + (extra || '') + '/>';
  const SHADOW = ' paint-order="stroke" stroke="rgba(0,0,0,.55)" stroke-width="2.2" stroke-linejoin="round"';
  function t(x, y, s, o) {
    o = o || {};
    return '<text x="' + f(x) + '" y="' + f(y) + '" font-size="' + (o.size || 9.5) + '" fill="' + (o.fill || C.text) + '" font-weight="' + (o.weight || 600) + '"' +
      (o.anchor ? ' text-anchor="' + o.anchor + '"' : '') + (o.extra || '') + '>' + s + '</text>';
  }
  const fit = (s, w, size) => { const n = Math.floor(w / (size * 0.54)); if (n < 3) return ''; return s.length <= n ? s : s.slice(0, Math.max(1, n - 1)) + '…'; };

  /* glyphs on a 24 grid; ICONS are FreeMotion's own (kit), these are the extra marks this page needs */
  const GL = {
    qA: '<rect x="1.5" y="6.5" width="6.4" height="11" rx="1.8" fill="currentColor" stroke="none"/><rect x="8.8" y="6.5" width="6.4" height="11" rx="1.8" fill="currentColor" stroke="none"/><rect x="16.1" y="6.5" width="6.4" height="11" rx="1.8" fill="currentColor" stroke="none"/>',
    fA: '<rect x="2" y="3" width="13" height="4.6" rx="1.5" fill="currentColor" stroke="none"/><rect x="7" y="9.7" width="15" height="4.6" rx="1.5" fill="currentColor" stroke="none"/><rect x="4" y="16.4" width="11" height="4.6" rx="1.5" fill="currentColor" stroke="none"/>',
    qB: '<rect x="2.5" y="5" width="19" height="14" rx="2.2"/><path d="M8.8 5v14M15.2 5v14"/><path d="M4.7 7.6h1.8M4.7 16.4h1.8M11.1 7.6h1.8M11.1 16.4h1.8M17.5 7.6h1.8M17.5 16.4h1.8" stroke-width="1.5"/>',
    fB: '<path d="M12 3.2l8.8 4.4L12 12 3.2 7.6z" fill="currentColor" fill-opacity=".35"/><path d="M3.2 12L12 16.4l8.8-4.4"/><path d="M3.2 16.4L12 20.8l8.8-4.4"/>',
    qC: '<rect x="2" y="8" width="20" height="8" rx="2.4" fill="currentColor" stroke="none"/><path d="M9 6.5v11M15 6.5v11" stroke="#0a141a" stroke-width="2.2"/>',
    fC: '<path d="M3 6h18M3 12h12M3 18h15" stroke-width="2.4"/>',
    twin: '<rect x="3.5" y="3.5" width="12" height="12" rx="2"/><rect x="8.5" y="8.5" width="12" height="12" rx="2" fill="currentColor" fill-opacity=".25"/>',
    knob: '<circle cx="12" cy="12" r="8"/><path d="M12 4a8 8 0 0 1 0 16z" fill="currentColor" stroke="none"/>',
    shuffle: '<path d="M3 7h4l10 10h4M3 17h4l3-3M14 10l3-3h4"/><path d="M18.5 4.5L21 7l-2.5 2.5M18.5 14.5L21 17l-2.5 2.5"/>',
    clock: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
    okC: '<circle cx="12" cy="12" r="9" fill="currentColor" fill-opacity=".18"/><path d="M7.5 12.5l3 3 6-6.5"/>',
    shape: '<circle cx="8.5" cy="9" r="4.5"/><rect x="11" y="11" width="9.5" height="9.5" rx="1.5"/>',
    star: '<path d="M12 3.5l2.5 5.3 5.8.7-4.3 4 1.1 5.7L12 16.4l-5.1 2.8 1.1-5.7-4.3-4 5.8-.7z"/>',
    grid: '<rect x="3.5" y="3.5" width="7" height="7" rx="1.5"/><rect x="13.5" y="3.5" width="7" height="7" rx="1.5"/><rect x="3.5" y="13.5" width="7" height="7" rx="1.5"/><rect x="13.5" y="13.5" width="7" height="7" rx="1.5"/>',
    book: '<rect x="5" y="3.5" width="14" height="17" rx="2"/><path d="M8.5 8h7M8.5 12h7M8.5 16h4"/>',
    spark: '<path d="M12 3.5l1.6 6.9 6.9 1.6-6.9 1.6L12 20.5l-1.6-6.9L3.5 12l6.9-1.6z" fill="currentColor" stroke="none"/>',
    diamond: '<path d="M12 3.5l8.5 8.5-8.5 8.5L3.5 12z" fill="currentColor" stroke="none"/>',
    chevL: '<path d="M14.5 5.5L8 12l6.5 6.5"/>',
    chevR: '<path d="M9.5 5.5L16 12l-6.5 6.5"/>'
  };
  function ic(name, x, y, size, color, sw) {
    return '<g transform="translate(' + f(x) + ' ' + f(y) + ') scale(' + (size / 24).toFixed(3) + ')" color="' + (color || C.text) + '" fill="none" stroke="currentColor" stroke-width="' + (sw || 1.8) +
      '" stroke-linecap="round" stroke-linejoin="round">' + (GL[name] || ICONS[name] || '') + '</g>';
  }
  /* a play-bar button (34 px in the app, drawn at s) */
  function pb(x, y, s, g, o) {
    o = o || {};
    let out = '';
    if (o.on) out += r(x, y, s, s, 5, 'rgba(90,199,237,.16)');
    if (o.ring) out += r(x + 0.8, y + 0.8, s - 1.6, s - 1.6, 5, 'rgba(90,199,237,.08)', ' stroke="' + C.accent + '" stroke-width="1.4"');
    if (o.back) {                                              // the back-to-Quick button: ‹ plus the Quick glyph
      out += ic('chevL', x + s * 0.02, y + s * 0.26, s * 0.48, C.accent, 2.6) + ic('qA', x + s * 0.34, y + s * 0.22, s * 0.56, C.accent);
      return out;
    }
    const k = s * 0.62;
    out += '<g opacity="' + (o.dim ? 0.35 : 1) + '">' + ic(g, x + (s - k) / 2, y + (s - k) / 2, k, o.color || (o.on || o.ring ? C.accent : C.text)) + '</g>';
    return out;
  }
  const timePill = (x, y, w, h) => r(x, y, w, h, 5, 'rgba(255,255,255,.07)') + t(x + w / 2, y + h / 2 + 3, '00:03:12', { size: 8, anchor: 'middle' });
  const barBg = (y, h) => r(0, y, 150, h, 0, C.panel) + '<path d="M0 ' + y + 'h150M0 ' + (y + h) + 'h150" stroke="' + C.soft + '" stroke-width=".8"/>';
  function menu(x, y, w, rows) {
    const rh = 15;
    let out = r(x, y, w, rows.length * rh + 6, 6, C.panel3, ' stroke="' + C.line + '"');
    rows.forEach((rw, i) => {
      const yy = y + 3 + i * rh;
      if (rw.hl) out += r(x + 3, yy, w - 6, rh, 4, 'rgba(90,199,237,.18)');
      if (rw.g) out += ic(rw.g, x + 7, yy + 2.5, 10, rw.hl ? C.accent : C.dim);
      out += t(x + (rw.g ? 21 : 8), yy + 10.5, rw.text, { size: 8.5, fill: rw.hl ? C.text : C.dim });
    });
    return out;
  }
  function toggle(x, y, on) {
    return r(x, y, 20, 12, 6, on ? C.accent : '#2a3d46') + '<circle cx="' + f(on ? x + 14 : x + 6) + '" cy="' + f(y + 6) + '" r="4.3" fill="' + (on ? '#04161d' : C.dim) + '"/>';
  }
  function hatch(id, a, b, sz) {
    return '<pattern id="' + id + '" width="' + (sz || 5) + '" height="' + (sz || 5) + '" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="' + (sz || 5) + '" height="' + (sz || 5) + '" fill="' + a + '"/><rect width="' + ((sz || 5) / 2) + '" height="' + (sz || 5) + '" fill="' + b + '"/></pattern>';
  }

  /* ---- a timeline strip drawn from a real document (the engine's read model) ---- */
  const LAY_B = { top: [6, 15], clip: [26, 28], snd: [60, 12], lanes: 1 };     // "before", 320 × 80
  const LAY_S = { top: [5, 10], clip: [19, 23], snd: [47, 9], lanes: 1 };      // an option, 150 × 62
  const LAY_M = { top: [1, 16], clip: [20, 22], snd: [47, 9], lanes: 3 };      // the messy project, 3 lanes on top

  function tileSvg(l, x0, x1, y, h, o) {
    const w = Math.max(1.5, x1 - x0 - 0.8), id = uid('g'), lk = l.look || ['#7fa0b0', '#3a5360'];
    let s = '<defs><linearGradient id="' + id + '" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="' + lk[0] + '"/><stop offset="1" stop-color="' + lk[1] + '"/></linearGradient></defs>';
    s += r(x0, y, w, h, 3, 'url(#' + id + ')', ' stroke="rgba(255,255,255,.3)" stroke-width=".7"');
    for (let fx = x0 + 16; fx < x0 + w - 4; fx += 16) s += '<path d="M' + f(fx) + ' ' + f(y + 1) + 'v' + f(h - 2) + '" stroke="rgba(0,0,0,.25)" stroke-width=".8"/>';
    const lx = o.mark && o.mark.id === l.id && o.mark.kind === 'trim' ? o.mark.by * o.sx + 4 : 3.5;
    if (o.labels) { const n = fit(l.name, w - lx - 3, 8.5); if (n) s += t(x0 + lx, y + h - 5, esc(n), { size: 8.5, weight: 700, extra: SHADOW }); }
    if (l.locked) s += r(x0 + w - 11, y + 2, 9.5, 9.5, 2.5, 'rgba(0,0,0,.65)') + ic('lock', x0 + w - 10, y + 3, 7.5, '#ffd27a', 2.4);
    if (o.sel === l.id) s += r(x0 - 1, y - 1, w + 2, h + 2, 3.5, 'none', ' stroke="#fff" stroke-width="1.6"');
    const m = o.mark;
    if (m && m.id === l.id) {
      if (m.kind === 'del') {
        const cx = x0 + w / 2, cy = y + h / 2;
        s += r(x0, y, w, h, 3, 'rgba(255,107,122,.38)') + '<circle cx="' + f(cx) + '" cy="' + f(cy) + '" r="7" fill="' + C.bad + '" stroke="#fff" stroke-width="1.2"/>' +
          '<path d="M' + f(cx - 2.8) + ' ' + f(cy - 2.8) + 'l5.6 5.6M' + f(cx + 2.8) + ' ' + f(cy - 2.8) + 'l-5.6 5.6" stroke="#fff" stroke-width="1.6" stroke-linecap="round"/>';
      } else if (m.kind === 'trim') {
        const cut = m.by * o.sx;
        s += r(x0, y, cut, h, 3, 'rgba(0,0,0,.62)', ' stroke="' + C.warn + '" stroke-width=".9" stroke-dasharray="2 1.5"') +
          r(x0 + cut - 2, y - 1.5, 4, h + 3, 1.5, '#fff') + t(x0 + cut / 2, y + h / 2 + 3, '✂', { size: 9, anchor: 'middle', fill: C.warn });
      }
    }
    return s;
  }
  function strip(doc, o) {
    const R = E.classify(doc), L = o.lay, sx = o.w / o.span, X = v => o.x + Math.min(v, o.span) * sx;
    o.sx = sx;
    const byId = new Map(doc.layers.map(l => [l.id, l]));
    const [cy, ch] = L.clip, [ty, th] = L.top, [sy, sh] = L.snd;
    let defs = '', s = r(o.x, cy, o.w, ch, 3, 'rgba(255,255,255,.035)');
    if (o.black) {
      const id = uid('h'); defs += hatch(id, '#000', '#15191c', 5);
      s += r(X(o.black[0]) + 0.5, cy, X(o.black[1]) - X(o.black[0]) - 0.5, ch, 3, 'url(#' + id + ')', ' stroke="#3a4a52" stroke-width=".8" stroke-dasharray="2 1.5"');
      s += t((X(o.black[0]) + X(o.black[1])) / 2, cy + ch / 2 + 3, 'Black', { size: 8, anchor: 'middle', fill: C.dim });
    }
    // the clip row
    const mains = R.main.flatMap(e => e.slot ? e.members : [e.id]).map(id => byId.get(id)).filter(Boolean);
    mains.forEach(l => { s += tileSvg(l, X(l.start), X(l.start + l.duration), cy, ch, o); });
    R.main.forEach(e => {
      if (!e.seam || e.slot) return;
      const a = X(e.start), amt = e.seam.amt;
      if (e.seam.kind === 'gap') {
        const g0 = X(e.start - amt);
        s += r(g0 + 0.6, cy, a - g0 - 1.2, ch, 3, 'rgba(255,255,255,.02)', ' stroke="' + C.line + '" stroke-width="1" stroke-dasharray="2.5 2"');
        s += chipSvg((g0 + a) / 2, cy + ch / 2, amt.toFixed(1) + 's', 'gap', o.hot === 'gap');
      } else if (e.seam.kind === 'overlap') {
        s += r(a, cy, amt * sx, ch, 0, 'rgba(255,107,122,.35)');
        s += chipSvg(a + amt * sx / 2, cy + ch / 2, amt.toFixed(1) + 's', 'overlap');
      }
    });
    // things on top: text, overlays, effects, blocks, packed into lanes
    const tops = Object.keys(R.units).map(id => R.units[id]).filter(u => ['text', 'overlay', 'effect', 'behind'].includes(u.section) && byId.has(u.id))
      .sort((a, b) => a.start - b.start);
    const lanes = [], nL = L.lanes || 1, lh = (th - (nL - 1)) / nL;
    tops.forEach(u => {
      let k = lanes.findIndex(ln => ln.every(v => v.end <= u.start + 1e-6 || v.start >= u.end - 1e-6));
      if (k < 0) { k = lanes.length < nL ? lanes.length : nL - 1; if (!lanes[k]) lanes[k] = []; }
      lanes[k].push(u);
      const l = byId.get(u.id), x0 = X(u.start), w = Math.max(3, X(u.end) - x0 - 0.6), y = ty + k * (lh + 1);
      const col = SEC[u.section] || SEC.overlay, stay = !!(l.sm && l.sm.stay);
      let fill = col[1];
      if (u.kind === 'block') { const id = uid('h'); defs += hatch(id, '#2f2944', '#3a3350', 4); fill = 'url(#' + id + ')'; }
      s += r(x0, y, w, lh, 2.5, fill, ' stroke="' + col[0] + '" stroke-width=".8"' + (u.kind === 'block' ? ' stroke-dasharray="2 1.2"' : ''));
      if (u.kind === 'block' && w > 8) s += t(x0 + 2, y + lh - 1.2, '✦', { size: Math.min(8, lh + 2), fill: C.fullInk });
      if (o.labels && w > 22) { const n = fit(l.text || l.name, w - (stay ? 14 : 5), 7.2); if (n) s += t(x0 + 2.5, y + lh - 4, esc(n), { size: 7.5, weight: 700, extra: SHADOW }); }
      if (stay && w > 9) s += ic('pin', x0 + w - (lh > 11 ? 10 : 8), y + (lh - (lh > 11 ? 9 : 7)) / 2, lh > 11 ? 9 : 7, '#fff', 2.6);
      if (o.by && o.by[u.id]) s += '<circle cx="' + f(x0 + 0.5) + '" cy="' + f(y + lh / 2) + '" r="' + f(lh / 2 + 1.2) + '" fill="' + C.sam + '" stroke="#0a141a" stroke-width="1"/>' + t(x0 + 0.5, y + lh / 2 + 2.6, 'S', { size: 7, weight: 800, anchor: 'middle', fill: '#1a0d06' });
      if (o.warnId === u.id) s += '<circle cx="' + f(x0 + w + 4.5) + '" cy="' + f(y + lh / 2) + '" r="4.2" fill="' + C.warn + '"/>' + t(x0 + w + 4.5, y + lh / 2 + 3, '!', { size: 7.5, weight: 800, anchor: 'middle', fill: '#1a0d06' });
      if (o.links !== false && u.host && !stay) s += '<path d="M' + f(x0 + 1.5) + ' ' + f(y + lh) + 'V' + f(cy) + '" stroke="' + col[0] + '" stroke-width=".9" stroke-dasharray="1.8 1.4"/><circle cx="' + f(x0 + 1.5) + '" cy="' + f(cy) + '" r="1.5" fill="' + col[0] + '"/>';
    });
    // the sound row
    doc.layers.forEach(l => {
      const u = R.units[l.id]; if (!u || u.section !== 'audio') return;
      const x0 = X(l.start), x1 = X(l.start + l.duration), w = Math.max(2, x1 - x0), cut = l.start + l.duration > o.span;
      s += r(x0, sy, w, sh, 2, '#20654f', ' stroke="' + C.au + '" stroke-width=".7"');
      let d = '';
      const fade0 = o.fade ? X(l.start + l.duration - 2) : Infinity;
      const lab = o.labels && w > 40 ? esc(l.name) : '';
      for (let x = x0 + 2 + (lab ? l.name.length * 4.5 + 8 : 0), i = 0; x < x0 + w - 1.5; x += 2.2, i++) {
        let k = 0.3 + 0.62 * Math.abs(Math.sin(i * 1.7) * Math.cos(i * 0.63));
        if (x > fade0) k *= Math.max(0.08, 1 - (x - fade0) / (x1 - fade0));
        const hh = (sh - 3) * k;
        d += 'M' + f(x) + ' ' + f(sy + sh / 2 - hh / 2) + 'v' + f(hh);
      }
      s += '<path d="' + d + '" stroke="rgba(233,255,246,.6)" stroke-width=".9"/>';
      if (lab) s += t(x0 + 4, sy + sh - 2.6, lab, { size: 8, weight: 700, extra: SHADOW });
      if (cut) s += t(o.x + o.w - 2, sy + sh - 2, o.runLabel || '…', { size: 7, weight: 800, anchor: 'end', extra: SHADOW });
      (o.beats || []).forEach(b => {
        if (b < l.start - 1e-6 || b > l.start + l.duration + 1e-6 || b > o.span) return;
        const bx = X(b);
        if (o.guides) s += '<path d="M' + f(bx) + ' ' + f(cy - 1) + 'V' + f(sy) + '" stroke="' + C.kf + '" stroke-opacity=".55" stroke-width=".8" stroke-dasharray="1.5 1.5"/>';
        s += '<path d="M' + f(bx) + ' ' + f(sy - 3.2) + 'l2.4 2.4-2.4 2.4-2.4-2.4z" fill="' + C.kf + '"/>';
      });
    });
    return (defs ? '<defs>' + defs + '</defs>' : '') + s;
  }
  function chipSvg(cx, cy, text, kind, hot) {
    const w = Math.max(20, text.length * 4.6 + 8), col = kind === 'gap' ? C.warn : C.bad, bg = kind === 'gap' ? '#2a1f14' : '#2a1418';
    return (hot ? r(cx - w / 2 - 2.5, cy - 9.5, w + 5, 19, 9.5, 'none', ' stroke="#fff" stroke-width="1.4"') : '') +
      r(cx - w / 2, cy - 7, w, 14, 7, bg, ' stroke="' + col + '" stroke-width="1.2"') + t(cx, cy + 2.8, text, { size: 7.5, weight: 700, anchor: 'middle', fill: col });
  }

  /* the picture boxes */
  const LINE = l => {
    if (!l) return '<span class="v10-line note"></span>';
    if (l.note) return '<span class="v10-line note"><span>' + nm(l.note) + '</span></span>';
    return '<span class="v10-line app"><span class="v10-lt">' + nm(l.app) + '</span>' + (l.btn || []).map(b => '<span class="v10-lb">' + nm(b) + '</span>').join('') + '</span>';
  };
  const stripPic = (doc, o, line) => '<span class="v10-pic strip">' + svg(150, 62, strip(doc, Object.assign({ x: 5, w: 140, span: 14.4, lay: LAY_S }, o))) + LINE(line) + '</span>';
  const customStrip = (body, line) => '<span class="v10-pic strip">' + svg(150, 62, body) + LINE(line) + '</span>';
  const mock = body => '<span class="v10-pic">' + svg(150, 94, body) + '</span>';
  const before = (doc, o, cap) => '<span class="v10-pic wide">' + svg(320, 80, strip(doc, Object.assign({ x: 8, w: 304, span: 14.4, lay: LAY_B, labels: true }, o))) + '</span><figcaption>' + nm(cap) + '</figcaption>';

  /* documents for the pictures, each a real engine run */
  const beach = () => VIS.sample('beach');
  function after(steps, base) { const ed = E.editor(base || beach()); steps(ed); return ed.doc; }
  function gapDoc() {                                               // Beach day as Full left it: a 1.2 s gap before Sandcastle
    const d = beach();
    d.layers.forEach(l => { if (['c3', 'c4', 'sticker'].includes(l.id)) l.start += 1.2; if (l.sm) delete l.sm.main; });
    d.project.duration = 15.4; delete d.project.sm;
    return d;
  }
  function lockedDoc() { const d = beach(); d.layers.find(l => l.id === 'c3').locked = true; return d; }
  const BEATS = [3.4, 5.25, 7.1, 8.7, 10.35, 12.3];

  /* ------------------------------------------------------------ the decisions (§17, final) --------------------------- */
  const DEC = [
    { id: 'D1', q: 'What are the two editors called?', why: 'It is the word on the cog’s switch and its explanation, and on everything {S} shows. New project and Home no longer carry it.', rec: 'A',
      foot: '"Pro" is avoided: you use it for a paid version.',
      opts: [['A', 'Simple / Full', '<b>Simple / Full</b>: your own word, and "Full" promises nothing is taken away.'],
        ['B', 'Quick / Full', '<b>Quick / Full</b>.'], ['C', 'Clips / Layers', '<b>Clips / Layers</b>.'], ['D', 'Cut / Motion', '<b>Cut / Motion</b>.']],
      pic: k => { const [a, b] = NAMES[k]; return mock(nameCards(a, b)); } },
    { id: 'D2', settled: true, q: 'Where is the switch?', why: 'Settled by your words, 1 Oct: <q>the option to switch between the two editors should be in the settings cog, making a third section in there. it can be a small button that just switches between editors and should have a button that you press that says ‘What should you use?’</q>',
      said: '<b>Settled: the ⚙ cog’s third block.</b> Nothing is added to {F}’s play bar, its ⋯ menu or the video. The old choices (a button on {F}’s play bar, a first item in ⋯ with a back button, smaller buttons, menus only) are withdrawn.',
      opts: [['S', 'The ⚙ cog', 'The ⚙ cog’s third block.']], pic: () => mock(d2()) },
    { id: 'D3', q: 'How does a new project choose its editor?', why: 'It decides which editor you land in after Create.', rec: 'A',
      reask: 'You said <q>D3 A</q> on the old page, but that A put two editor cards in New project, a dialog you use in {F}, so your 1 Oct rule rules it out and it is not applied.',
      opts: [['A', 'Your last switch in ⚙', 'A new project opens in the editor this device last switched to in the ⚙ cog. New project itself is unchanged.'],
        ['B', 'Always {F}', 'Always start in {F}; switch in the cog after.']],
      pic: k => mock(d3(k)) },
    { id: 'D4', q: 'Do text, stickers and overlays follow their clip?', why: 'It decides whether titles stay on their picture when you move or cut clips.', rec: 'A',
      before: () => before(beach(), { mark: { id: 'c1', kind: 'del' } }, '<b>Before.</b> The title sits on Waves, the shell sticker on Sandcastle. You delete <b>Arriving</b>.'),
      opts: [['A', 'Yes, music stays put', 'Yes; music, voice-overs and long things stay put; anything can be set to Stay put; lyrics timed to the song are spotted and you are offered "Keep on the music".'],
        ['B', 'Nothing follows', 'Nothing follows (CapCut on the phone).'], ['C', 'Ask each time', 'Ask each time.']],
      pic: k => k === 'A' ? stripPic(after(ed => ed.run('deleteClip', { id: 'c1' })), {}, { note: 'The title and the shell move with their clips. The song stays.' })
        : k === 'B' ? stripPic(after(ed => { ed.run('stayPut', { id: 'title', on: true }); ed.run('stayPut', { id: 'sticker', on: true }); ed.run('deleteClip', { id: 'c1' }); }), {}, { note: 'They stay where they were, now over the wrong clips.' })
        : stripPic(after(ed => ed.run('deleteClip', { id: 'c1' })), {}, { app: 'Move 2 things with their clips?', btn: ['Yes', 'No'] }) },
    { id: 'D5', q: 'Deleting a clip that has things on it', why: 'A deleted clip either takes its titles with it or leaves them floating over the wrong picture.', rec: 'A',
      before: () => before(beach(), { mark: { id: 'c2', kind: 'del' } }, '<b>Before.</b> You delete <b>Waves</b>, which has the title on it.'),
      opts: [['A', 'They go too', 'They go too; a line says how many; Undo brings all back.'], ['B', 'They stay', 'They stay where they were.']],
      pic: k => {
        if (k === 'A') { const ed = E.editor(beach()); const res = ed.run('deleteClip', { id: 'c2' }); return stripPic(ed.doc, {}, { app: res.say || 'Deleted clip', btn: ['Undo'] }); }
        return stripPic(after(ed => { ed.run('stayPut', { id: 'title', on: true }); ed.run('deleteClip', { id: 'c2' }); }), { warnId: 'title' }, { app: 'Deleted clip', btn: ['Undo'] });
      } },
    { id: 'D6', q: 'Trimming away the part of a clip a title starts on', why: 'Without a rule the title would jump onto the next clip.', rec: 'A',
      before: () => before(beach(), { mark: { id: 'c2', kind: 'trim', by: 1.2 } }, '<b>Before.</b> You trim 1.2 s off the start of <b>Waves</b>. The title started in that part.'),
      opts: [['A', 'Title slides back', 'The title slides back so it stays on its clip.'], ['B', 'Title is deleted', 'The title is deleted too (Undo brings it back).'],
        ['C', 'Comes off, stays put', 'It comes off and stays where it was.']],
      pic: k => k === 'A' ? stripPic(after(ed => ed.run('trimHead', { id: 'c2', by: 1.2 })), {}, { note: 'It moves to the new start of Waves.' })
        : k === 'B' ? stripPic(after(ed => { ed.run('trimHead', { id: 'c2', by: 1.2 }); ed.doc.layers = ed.doc.layers.filter(l => l.id !== 'title'); }), {}, { note: 'The title is gone. Undo brings it back.' })
        : stripPic(after(ed => { ed.run('stayPut', { id: 'title', on: true }); ed.run('trimHead', { id: 'c2', by: 1.2 }); }), {}, { note: 'It stays at its old time, off its clip.' }) },
    { id: 'D7', q: 'A locked clip is in the way of an edit', why: 'A lock would otherwise block every edit that has to slide the clip along.', rec: 'A',
      before: () => before(lockedDoc(), { mark: { id: 'c1', kind: 'del' } }, '<b>Before.</b> Sandcastle is locked. You delete <b>Arriving</b>, so Sandcastle would have to slide along.'),
      opts: [['A', 'Stop, with "Do it anyway"', 'The edit stops and says how many are locked, with one tap to "Do it anyway": one step, and the lock stays on afterwards.'],
        ['B', 'It moves anyway', 'It moves along in time anyway; only its contents stay locked.']],
      pic: k => {
        if (k === 'A') { const ed = E.editor(lockedDoc()); const res = ed.run('deleteClip', { id: 'c1' }); return stripPic(ed.doc, {}, { app: res.say || '1 item is locked', btn: ['Do it anyway'] }); }
        return stripPic(after(ed => ed.run('deleteClip', { id: 'c1' }, { force: true }), lockedDoc()), {}, { note: 'Sandcastle slides along, still locked.' });
      } },
    { id: 'D8', q: 'Gaps in the clip row', why: 'It decides whether {S} ever tidies gaps you left on purpose in {F}.', rec: 'A',
      before: () => before(gapDoc(), { span: 15.6 }, '<b>Before.</b> A project made in {F}, with a 1.2 s gap before Sandcastle.'),
      opts: [['A', 'A block you tap to close', '{S} never makes them; gaps made in {F} show as a block you tap to close.'],
        ['B', 'Closed when you switch', '{S} closes every gap when you switch (this rewrites the project).'],
        ['C', 'A gaps switch on PC', 'A gaps on/off switch on PC (phone and PC would differ).']],
      pic: k => k === 'A' ? stripPic(gapDoc(), { span: 15.6, hot: 'gap' }, { app: 'Gap 1.2s', btn: ['Close gap'] })
        : k === 'B' ? stripPic(after(ed => ed.run('closeGap', { id: 'c3' }), gapDoc()), { span: 15.6 }, { note: 'Closed as soon as you switch. The project is rewritten.' })
        : customStrip(strip(gapDoc(), { x: 5, w: 140, span: 15.6, lay: LAY_S }) + r(104, 1, 42, 14, 7, C.panel3, ' stroke="' + C.line + '"') + t(109, 11, 'Gaps', { size: 8 }) + toggle(128, 2, true),
          { note: 'A switch, on a computer only. Phone and PC differ.' }) },
    { id: 'D9', q: 'An old project opened in {S}', why: 'It decides whether your existing projects need a setup step before {S} shows them.', rec: 'A',
      opts: [['A', 'Opens as it is', 'It opens as it is, the clip row worked out for you, nothing written until you arrange clips.'],
        ['B', 'A setup button first', 'A "Make a clip row" button first.'], ['C', 'Old ones stay {F} only', 'Old projects stay {F}-only.']],
      pic: k => k === 'A' ? stripPic(VIS.sample('messy'), { span: 22.4, lay: LAY_M }, { note: '"Cooking with Mia", as it is. Nothing is saved until you move clips.' })
        : k === 'B' ? customStrip(r(5, 19, 140, 23, 3, 'rgba(255,255,255,.035)', ' stroke="' + C.line + '" stroke-dasharray="2.5 2"') + r(33, 23, 84, 15, 7.5, C.accent) +
            t(75, 33.5, 'Make a clip row', { size: 8.5, weight: 700, anchor: 'middle', fill: '#04161d' }) + t(75, 56, 'nothing shown until you tap', { size: 8, anchor: 'middle', fill: C.faint }),
          { note: 'A setup step before you see the clips.' })
        : customStrip(r(8, 4, 134, 50, 7, C.panel3, ' stroke="' + C.line + '"') + r(14, 10, 44, 38, 4, 'url(#' + 'v10mia' + ')') +
            '<defs><linearGradient id="v10mia" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#e6c07a"/><stop offset="1" stop-color="#8c5a2b"/></linearGradient></defs>' +
            t(64, 22, 'Cooking with Mia', { size: 8.5, weight: 700 }) + r(64, 29, 38, 13, 6.5, 'rgba(155,135,245,.16)', ' stroke="rgba(155,135,245,.55)"') + ic('fA', 67, 31, 9, C.fullInk) +
            t(78, 38.6, tag(1, true), { size: 7.5, fill: C.fullInk }) + t(106, 38.6, 'only', { size: 7.5, fill: C.faint }),
          { note: 'Old projects open in {F} only.' }) },
    { id: 'D10', q: 'When a clip is selected', why: 'CapCut\'s worst trap is the main toolbar vanishing when a clip is tapped.', rec: 'A',
      opts: [['A', 'Its tools above the toolbar', 'Its tools appear in a row above the main toolbar, which never disappears.'], ['B', 'Its tools replace the toolbar', 'Its tools replace the toolbar, with a "‹ Done".']],
      pic: k => mock(d10(k)) },
    { id: 'D11', q: 'The switch animation', why: 'It decides what plays as the cog closes after a switch, so you see the timeline move into the other editor.', rec: 'A', anim: true,
      opts: [['A', 'All three, at random', 'Build all three (morph, fold, slide), played at random, and choose the keeper later.'], ['B', 'One now: the morph', 'Pick one now and build only that: the morph, the one on the far left.']],
      pic: k => mock(d11(k)) },
    { id: 'D12', q: 'The Assistant in {S}', why: 'It decides whether Ask is in {S} from the release that adds looks and captions.', rec: 'A',
      opts: [['A', 'Yes, an Ask button', 'An "Ask" button in the project tools when you have a key set, which edits through {S}\'s own commands (no gaps, one Undo).'],
        ['B', 'Not yet', 'Not in that release: Ask waits until it is wired into {S}\'s commands.']],
      pic: k => mock(d12(k)) },
    { id: 'D13', q: 'Transitions', why: 'It decides whether adding a transition changes your video\'s length.', rec: 'A',
      opts: [['A', 'Never shorter', 'They never make the video shorter.'], ['B', 'The video gets shorter', 'The two clips overlap, so the video gets shorter by the transition.']],
      pic: k => customStrip(d13(k), { note: k === 'A' ? 'Same length as before: 0:14.2.' : 'The clips overlap: 0.5 s shorter, 0:13.7.' }) },
    { id: 'D14', q: 'Friends and {S}: what works live with a friend in', why: 'It decides how soon you and a friend can edit one project in different editors.', rec: 'A',
      opts: [['A', 'Looks, text, captions, sound', 'Looks, text, captions and sound work together from the first release that edits.'],
        ['C', 'View only with friends', '{S} stays view-only while friends are in.']],
      pic: k => mock(d14(k)) },
    { id: 'D14b', q: 'Moving clips while a friend who can edit is connected', why: 'It decides whether you and a friend can ever both move clips at once, and whether that may change {F}.', rec: 'A',
      reask: 'Your <q>D14 A</q> on the old page included moving clips together later (Phase 4), and that release changes how {F} behaves with a friend in (its clip drag, refusals in {F}, undo waiting), so your 1 Oct rule rules it out and it is not applied to this half.',
      opts: [['A', 'It waits, for good', 'Moving clips waits while a friend who can edit is connected, for good; {F} is untouched.'],
        ['B', 'Build "together" later', 'Build "together" (Phase 4) later anyway, knowing it changes how {F} behaves in a session.']],
      pic: k => mock(d14b(k)) },
    { id: 'D15', q: 'Build it?', why: 'The go-ahead; nothing is built until you say so.', rec: 'A',
      opts: [['A', 'Build Phase 1', 'Build Phase 1 (see any project as clips, with the switch in the ⚙ cog and {F} untouched) and show you.'], ['B', 'Keep planning', 'Keep planning.'], ['C', 'Not now', 'Not now.']],
      pic: k => mock(d15(k)) },
    { id: 'D16', q: 'Icons and marks', why: 'You will look at these every day, and none may be copied. Drawn big and at their real size, none from CapCut or Alight Motion.', rec: 'A',
      opts: [['A', 'The set drawn for you', 'The set marked recommended on the sheet (open "See the rows" below).'], ['B', 'Pick per row', 'Pick per row, in "See the rows" below.']],
      pic: k => mock(d16(k)), extra: () => iconRows() },
    { id: 'D17', q: 'Music longer than your clips', why: 'It decides whether a long song makes the video run on in black.', rec: 'A',
      opts: [['A', 'Ends with the video', 'It ends with the video (fading out, up to 2 s), and a switch lets it run on.'], ['B', 'Runs on in black', 'The video runs on in black, as {F} does today.']],
      pic: k => {
        if (k === 'A') return stripPic(beach(), { span: 20, fade: true }, { note: 'The song fades out and ends with the clips, at 0:14.' });
        const d = beach(), s = d.layers.find(l => l.id === 'song'); s.duration = 95; s.sm = { stay: true }; d.project.duration = 95;
        return stripPic(d, { span: 20, black: [14.2, 20], runLabel: '→ 1:35' }, { note: 'The video runs on to 1:35, black after 0:14.' });
      } },
    { id: 'D18', q: 'The order of {S}\'s play-bar buttons on the phone', why: 'It decides where ✂ and |◀ sit under your thumb. {F}\'s bar stays ⋯ ⧉ ◐ |◀ either way.', rec: 'A',
      reask: 'You left this as <q>D18 ?</q>, and it was rewritten after you answered: the switch left the play bar for the ⚙ cog, so the bar has one slot fewer.',
      opts: [['A', '⋯ ✂ · |◀', '⋯ · ✂ · (gap) · |◀: |◀ stays where {F} has it, so it is under the same thumb in both editors.'], ['B', '⋯ ✂ |◀', '⋯ · ✂ · |◀ packed, |◀ one slot nearer the middle.']],
      pic: k => mock(d18(k)) },
    { id: 'D19', q: 'Benchmarks (the marks you tap on the beat)', why: 'It decides whether a mark stays on the song or moves with a clip when clips before it are removed.', rec: 'A',
      before: () => before(beach(), { mark: { id: 'c1', kind: 'del' }, beats: BEATS, guides: true }, '<b>Before.</b> Yellow marks you tapped on the beat, each on a cut or a moment in a clip. You delete <b>Arriving</b>.'),
      opts: [['A', 'They stay on the music', 'They stay on the music (music stays put too).'], ['B', 'They stick to the clip', 'A mark tapped over a clip sticks to that moment of the clip.']],
      pic: k => {
        const d = after(ed => ed.run('deleteClip', { id: 'c1' }));
        if (k === 'A') return stripPic(d, { beats: BEATS, guides: true }, { note: 'They stay on the beat of the song, off the cuts.' });
        return stripPic(d, { beats: BEATS.map(b => b - 3.4), guides: true }, { note: 'They move with Waves, Sandcastle and Sunset.' });
      } },
    { id: 'D20', q: 'On a computer, where a tool\'s panel (Look, Speed, Captions) opens', why: 'It decides whether the panel covers the picture, the timeline, or squeezes into the left band.', rec: 'C',
      foot: 'On a phone held sideways every option opens over the timeline.',
      opts: [['A', 'Inside the left band', 'Inside the left band, scrolling (at 1280×800 the band has about 100 px left for a panel).'],
        ['B', 'Over the picture', 'Rising over the bottom of the picture as a sheet (it covers the lower-left of the picture you are judging).'],
        ['C', 'Over the timeline', 'Rising over the timeline, exactly as on the phone: about twice A\'s room, and the picture is never covered.']],
      pic: k => mock(d20(k)) },
    { id: 'D21', q: 'Can you add shapes, saved elements and templates inside {S}?', why: 'Without it you switch to {F} for every lower third or template.', rec: 'A',
      opts: [['A', 'Yes, in Clips › Extras', 'Yes, under Clips › Extras, and what you drop in stays editable piece by piece.'],
        ['B', 'Only in {F}', 'Only in {F}, with one line in the Clips tool: "Shapes, elements and templates are in {F} ›".']],
      pic: k => mock(d21(k)) },
    { id: 'D22', q: 'Does a Settings row turn the cog’s Editor block on while {S} is being tested?', why: 'A new Settings row is a change to {F} you would see, and a second home for the switch.', rec: 'A', fresh: true,
      opts: [['A', 'No Settings row', 'No Settings row: the cog’s block is the only door, there from the release that brings {S}.'],
        ['B', 'A Settings row', 'A "{S} editor" row in Settings turns the cog’s block on while it is tested.']],
      pic: k => mock(d22(k)) },
    { id: 'D23', q: 'After you tap the switch, does the cog close?', why: 'Closing shows you the other editor at once: two taps in all.', rec: 'A', fresh: true,
      opts: [['A', 'It closes', 'It closes, so you see the other editor; it stays open only when Canvas settings has picks you have not applied, or Friends is open.'],
        ['B', 'It stays open', 'It stays open until you close it.']],
      pic: k => mock(d23(k)) },
    { id: 'D24', q: 'Your phone held sideways: where does the cog’s Editor block go?', why: 'Measured on the real app: on your phone sideways (956×440), and at 932×430 and 844×390, the Editor tile lands off the screen with Canvas or Friends open, so the switch cannot be reached, and in {S} the cog is the only way back to {F}. Each picture is the real app, with Canvas open.', rec: 'B', fresh: true, photos: true,
      before: () => '<span class="v10-pic photo wide"><img src="img/v10-d24-0-crop.jpg" width="1200" height="332" alt="The plan as written, on your phone sideways: with Canvas open the Editor tile is above the top edge; with Friends open the switch is off screen." loading="lazy" decoding="async"></span><figcaption><b>The problem.</b> The plan as written, on your phone sideways: the switch is above the top of the screen. <a href="img/v10-d24-0-the-problem.jpg" target="_blank" rel="noopener">The whole sheet</a></figcaption>',
      opts: [['A', 'Its own column', 'The Editor tile gets its own column at the far left, the same tile as on a computer. Where even that has no room (844×390) it falls back to B. Two looks to build and test, and on your phone the tile is about 520 px from the cog.'],
        ['B', 'On the cog’s row', 'The switch and "What should you use?" sit on the cog’s own row, just left of the cog. Canvas settings and Friends stay exactly as they are. One rule for every short sideways screen, beside the cog you just tapped, and it never moves during a swap.'],
        ['C', 'A strip by the cog', 'An Editor strip along the cog’s side of the pair. Canvas and Friends get 54 px shorter, which changes {F}, so your 1 Oct rule rules it out.']],
      pic: k => '<span class="v10-pic photo"><img src="img/v10-d24-' + k + '-crop.jpg" width="598" height="332" alt="Option ' + k + ' on your phone sideways, 956×440, with Canvas open" loading="lazy" decoding="async"></span>',
      foot: 'Under each option, "What should you use?" opens as the big block with Friends and Canvas as two bars beside it. Upright phones and computers are not part of this pick. The whole sheets, with 844×390, Friends open and upright: <a href="img/v10-d24-A-own-column.jpg" target="_blank" rel="noopener">A</a> · <a href="img/v10-d24-B-on-the-cog-row.jpg" target="_blank" rel="noopener">B</a> · <a href="img/v10-d24-C-strip-by-the-cog.jpg" target="_blank" rel="noopener">C</a>.' }
  ];
  const OPEN = DEC.filter(d => !d.settled && !isDecided(d)), NQ = OPEN.length;   // the six still to answer (D2 settled, the rest his)
  const DMAP = new Map(DEC.map(d => [d.id, d]));

  /* the "decided with the recommended option" pictures §17 asks V10 to draw: the chosen one first */
  const XDEC = [
    { id: 'pencil', label: 'The ✎ while something is picked', q: 'The phone\'s ✎ (notes) while something is selected', why: 'Your rule: the project buttons leave the top bar while something is selected.',
      opts: [['A', 'It hides', 'It hides, and its space is kept so nothing else moves.'], ['B', 'It stays', 'It stays on the top bar.']], pic: k => mock(x1(k)) },
    { id: 'friend', label: 'A friend\'s title on a clip you delete', q: 'A friend\'s title on a clip you delete, while you work together', why: 'Asking would interrupt a one-tap delete; the title can be deleted with one more tap.',
      opts: [['A', 'Kept, as Stay put', 'Kept as Stay put at its old time, without asking.'], ['B', 'Deleted with the clip', 'Deleted with the clip, like your own.']],
      pic: k => {
        if (k === 'A') return stripPic(after(ed => { ed.run('stayPut', { id: 'title', on: true }); ed.run('deleteClip', { id: 'c2' }); }), { by: { title: 1 } }, { app: 'Deleted clip · kept Sam\'s title', btn: ['Undo', 'Show'] });
        return stripPic(after(ed => ed.run('deleteClip', { id: 'c2' })), {}, { app: 'Deleted clip and 1 thing on it', btn: ['Undo'] });
      } },
    { id: 'settings', label: 'Where the Settings row sits (only under D22 B)', q: 'Where the {S} preview switch sits in Settings, only if D22 is B', why: 'Under D22 A (recommended) there is no Settings row at all.',
      opts: [['A', 'Its own group, above Work with friends', 'In its own untitled group, directly above Work with friends.'], ['B', 'Under "Try it early"', 'Under a group called "Try it early".']], pic: k => mock(x3(k)) },
    { id: 'offline', label: 'A friend who can edit goes offline', q: 'A friend who can edit goes offline', why: 'While they are away their changes wait, so clips stay put for everyone.',
      opts: [['A', 'Until they leave', 'Clips stay put until they leave, you remove them, or you tap Arrange anyway or Make Sam a Viewer. It does not end by itself.'],
        ['B', 'It ends after 24 hours', 'It ends by itself after 24 hours.']], pic: k => mock(x4(k)) }
  ];
  const XMAP = new Map(XDEC.map(d => [d.id, d]));
  const OTHER = [
    'A caption line cut by an added clip splits into two with the same words.',
    'On a trim at the start, things on the clip stay on the same footage (not the same time into the clip).',
    '"Use one speed" keeps the clip\'s length.',
    'A caption across a freeze frame stretches over the held picture.',
    'Shapes and elements you drop in never join the clip row.',
    'On a computer the left band reads from the bottom like the phone, with the project tools at the bottom edge.',
    'Things on a clip keep their own length when its speed changes; only where they start moves.',
    'Delete never cuts a block.',
    'No "Keep pitch" switch.',
    'A sound that runs more than 1 s past the clip it starts on stays put; a shorter one follows its clip.'
  ];

  /* the words (§8.9): one name everywhere; change any of them */
  const WORDS = [
    ['clipRow', 'The main track', 'Clip row'],
    ['follow', 'The follow switch', 'Stay put'],
    ['capSwitch', 'The caption-track switch', 'Follows the clips / Stays with the sound'],
    ['gap', 'A gap', 'Close gap · Close all gaps'],
    ['mute', 'Mute', 'Mute the clip row'],
    ['soundOut', 'Sound out of a clip', 'Take sound out'],
    ['ramp', 'A speed that changes over a clip', 'Speed changes over the clip · Use one speed'],
    ['order', 'Putting clips in order', 'Sort by date taken · Move earlier / Move later'],
    ['place', 'Where new clips go', 'At the end / After Clip N'],
    ['tools', 'The project tools', 'Clips · Text · Captions · Sound · Overlay · Look for all · Effects · Ask'],
    ['moreIn', 'Things only {F} shows', 'More in {F} ›'],
    ['moves', 'A clip with moves or effects', 'Has moves and effects · Open in {F}'],
    ['missing', 'Missing footage', 'No footage'],
    ['band', 'The black band at the end', 'End with the video · Keep as end card'],
    ['hint', 'The first hint (phone)', 'Tap a clip to change its speed or look · ✂ splits it at the line'],
    ['cogAsk', 'The cog block’s button', 'What should you use?'],
    ['cogFoot', 'The line under the explanation', 'Same project in both. Nothing is converted, and you can switch back any time.'],
    ['preview', 'The Settings row (only under D22 B)', 'See any project as clips — still being tested.']
  ];
  const FACES = { id: 'faces', rec: 'A', opts: [['A', '⤒ Lift off · ⤓ Into row'], ['B', '⤒ On top · ⤓ Into row'], ['C', 'Move to top layer · Put back in line']] };

  /* D16's rows (§17): each drawn big and at real size; candidate 1 is the recommended one. Row 6 (the back-to-Quick button
     in Full) is withdrawn with D2 (§0.4 V2); the rows keep §17's numbers, so the next one is 7. */
  const rowNo = row => row.id.slice(1);
  const ROWS = [
    { id: 'r1', name: 'The cog block’s icon and its two option pictures ({S}, {F})', W: 120, H: 34, big: 1.6, cands: [
      () => '<circle cx="15" cy="17" r="14" fill="rgba(90,199,237,.14)"/>' + ic('edblock', 6, 8, 18, C.accent) +
        r(36, 4, 17, 6, 3, '#9fb6c0') + r(34, 13, 18, 12, 2.4, '#cfe2e8') + r(53.5, 13, 18, 12, 2.4, '#cfe2e8') + r(73, 13, 18, 12, 2.4, '#cfe2e8') + r(34, 28, 57, 4, 2, '#6f8a95') +
        r(96, 3, 18, 5, 2.5, C.accent) + r(94, 10, 20, 5, 2.5, C.accent) + r(102, 17, 18, 5, 2.5, C.accent) + r(96, 24, 17, 5, 2.5, C.accent),
      () => '<circle cx="15" cy="17" r="14" fill="rgba(90,199,237,.14)"/>' + ic('gear', 6, 8, 18, C.accent) + ic('qA', 40, 3, 28, C.accent) + ic('fA', 82, 3, 28, C.fullInk)] },
    { id: 'r2', name: 'The Captions, Text and Overlay section marks', W: 84, H: 24, big: 2, cands: [
      () => ic('captions', 0, 0, 24, C.cap) + ic('text', 30, 0, 24, C.txt) + ic('overlay', 60, 0, 24, C.ov),
      () => r(1, 1, 22, 22, 6, C.cap) + t(12, 16, 'CC', { size: 9.5, weight: 800, anchor: 'middle', fill: '#1a1406' }) + r(31, 1, 22, 22, 6, C.txt) +
        t(42, 16.5, 'Aa', { size: 10, weight: 800, anchor: 'middle', fill: '#140c2a' }) + r(61, 1, 22, 22, 6, C.ov) + r(65, 5, 9, 9, 1.5, 'none', ' stroke="#061a2a" stroke-width="1.8"') + r(70, 10, 9, 9, 1.5, '#061a2a')] },
    { id: 'r3', name: 'The ✦ badge (has moves and effects)', W: 22, H: 14, big: 3, cands: [
      () => r(0, 0, 22, 14, 3.5, 'rgba(155,135,245,.9)') + ic('spark', 5.5, 1.5, 11, '#120c2a'),
      () => r(0, 0, 22, 14, 3.5, 'rgba(255,206,74,.9)') + ic('diamond', 6, 2, 10, '#2a1f06')] },
    { id: 'r4', name: 'A block, and the black band at the end', W: 84, H: 24, big: 2, cands: [
      () => { const a = uid('h'), b = uid('h'); return '<defs>' + hatch(a, '#2f2944', '#3a3350', 5) + hatch(b, '#000', '#15191c', 5) + '</defs>' +
        r(0.5, 0.5, 38, 23, 4, 'url(#' + a + ')', ' stroke="#8d74d6" stroke-dasharray="2.5 1.5"') + t(5, 16, '✦', { size: 10, fill: C.fullInk }) +
        r(43.5, 0.5, 40, 23, 4, 'url(#' + b + ')', ' stroke="#3a4a52" stroke-dasharray="2.5 1.5"'); },
      () => { const a = uid('d'); return '<defs><pattern id="' + a + '" width="4" height="4" patternUnits="userSpaceOnUse"><rect width="4" height="4" fill="#2f2944"/><circle cx="2" cy="2" r=".9" fill="#8d74d6"/></pattern></defs>' +
        r(0.5, 0.5, 38, 23, 4, 'url(#' + a + ')', ' stroke="#8d74d6"') + r(43.5, 0.5, 40, 23, 4, '#000', ' stroke="#3a4a52"') + '<path d="M44 3h39" stroke="' + C.bad + '" stroke-width="1.5"/>'; }] },
    { id: 'r5', name: 'The gap and overlap marks', W: 72, H: 24, big: 2, cands: [
      () => r(1, 2, 32, 20, 10, '#2a1f14', ' stroke="' + C.warn + '" stroke-width="1.5"') + t(17, 15.5, '1.5s', { size: 9, weight: 700, anchor: 'middle', fill: C.warn }) +
        r(39, 2, 32, 20, 10, '#2a1418', ' stroke="' + C.bad + '" stroke-width="1.5"') + t(55, 15.5, '0.4s', { size: 9, weight: 700, anchor: 'middle', fill: C.bad }),
      () => r(1, 2, 32, 20, 3, '#2a1f14', ' stroke="' + C.warn + '" stroke-width="1.5"') + '<path d="M7 12h20M7 12l3.5-3.5M7 12l3.5 3.5M27 12l-3.5-3.5M27 12l-3.5 3.5" stroke="' + C.warn + '" stroke-width="1.6" fill="none" stroke-linecap="round"/>' +
        r(39, 2, 32, 20, 3, '#2a1418', ' stroke="' + C.bad + '" stroke-width="1.5"') + '<path d="M44 12h7M59 12h7M51 12l-3-3M51 12l-3 3M59 12l3-3M59 12l3 3" stroke="' + C.bad + '" stroke-width="1.6" fill="none" stroke-linecap="round"/>'] },
    { id: 'r7', name: 'The tool icons (they must read without their words)', W: 174, H: 24, big: 1.25, cands: [
      () => ['clips', 'text', 'captions', 'music', 'overlay', 'look'].map((n, i) => ic(n, i * 30, 0, 24, C.text)).join(''),
      () => ['clips', 'text', 'captions', 'music', 'overlay', 'look'].map((n, i) => r(i * 30, 0, 24, 24, 6, 'rgba(90,199,237,.18)') + ic(n, i * 30 + 4, 4, 16, C.accent, 2)).join('')] }
  ];

  /* ------------------------------------------------------------ the mock pictures ------------------------------------ */
  /* the cog's small Editor bar, drawn at 150 wide: [icon] [a ⇄ b] [What should you use?]; knob on the editor you are in */
  function edBar(x, y, w, a, b, onB, hl) {
    const h = 24, sw = Math.min(72, w - 60);
    return r(x, y, w, h, 6, C.panel3, ' stroke="' + (hl ? C.accent : C.line) + '"' + (hl ? ' stroke-width="1.4"' : '')) +
      '<circle cx="' + f(x + 11) + '" cy="' + f(y + h / 2) + '" r="7.5" fill="rgba(90,199,237,.16)"/>' + ic('edblock', x + 5.5, y + h / 2 - 5.5, 11, C.accent) +
      r(x + 22, y + 4, sw, h - 8, (h - 8) / 2, 'rgba(0,0,0,.3)', ' stroke="' + C.line + '"') + r(x + 23.5 + (onB ? sw / 2 : 0), y + 5.5, sw / 2 - 3, h - 11, (h - 11) / 2, C.accent) +
      t(x + 22 + sw / 4, y + h / 2 + 2.6, a, { size: 6.8, anchor: 'middle', fill: onB ? C.dim : '#04161d' }) + t(x + 22 + sw * 3 / 4, y + h / 2 + 2.6, b, { size: 6.8, anchor: 'middle', fill: onB ? '#04161d' : C.dim }) +
      r(x + w - 34, y + 4, 30, h - 8, 4, 'rgba(255,255,255,.05)', ' stroke="' + C.line + '"') + t(x + w - 19, y + h / 2 - 0.5, 'What', { size: 5.6, anchor: 'middle', fill: C.text }) + t(x + w - 19, y + h / 2 + 5.5, 'to use?', { size: 5.6, anchor: 'middle', fill: C.text });
  }
  function nameCards(a, b) {
    return t(75, 26, esc(a) + '  ⇄  ' + esc(b), { size: 13, weight: 800, anchor: 'middle' }) + t(75, 42, 'the words on the cog’s switch', { size: 7.5, anchor: 'middle', fill: C.faint }) +
      edBar(4, 56, 142, esc(a), esc(b), true, false);
  }
  /* D2, settled: the cog's three blocks, the new one small on top */
  function d2() {
    return edBar(4, 3, 142, tag(0, true), tag(1, true), true, true) +
      r(4, 31, 142, 16, 5, C.panel3, ' stroke="' + C.line + '"') + ic('friends', 9, 34, 10, C.accent) + t(24, 42, 'Friends', { size: 7.5, weight: 700 }) +
      r(4, 51, 142, 40, 6, C.panel3, ' stroke="' + C.line + '"') + t(11, 63, 'Canvas settings', { size: 8, weight: 700 }) +
      [0, 1, 2, 3, 4, 5].map(i => r(11 + i * 21.5, 68, 18, 12, 2.5, i === 1 ? C.accent : C.panel, ' stroke="' + C.line + '"')).join('') + r(110, 83, 30, 6, 3, C.accent);
  }
  function d3(k) {
    let s = r(6, 4, 138, 70, 9, C.panel3, ' stroke="' + C.line + '"') + t(14, 18, 'New project', { size: 9.5, weight: 700 }) + t(140, 18, 'as today', { size: 7, anchor: 'end', fill: C.faint });
    s += t(14, 32, 'Name  Beach day', { size: 8, fill: C.dim }) + [0, 1, 2, 3].map(i => r(14 + i * 22, 38, 19, 14, 3, i === 0 ? C.accent : C.panel, ' stroke="' + C.line + '"')).join('') +
      r(100, 56, 38, 14, 6, C.accent) + t(119, 66, 'Create', { size: 8, weight: 700, anchor: 'middle', fill: '#04161d' });
    s += k === 'A'
      ? ic('gear', 8, 77, 12, C.accent) + t(24, 86.5, 'your last switch in ⚙: ' + tag(0, true), { size: 7.5, fill: C.dim })
      : ic('fA', 8, 77, 12, C.fullInk) + t(24, 86.5, 'always opens in ' + tag(1, true), { size: 7.5, fill: C.dim });
    return s;
  }
  function clipRowMock(y, h, selIdx) {
    const looks = [['#5fd3e6', '#1f6fa3'], ['#f3d27a', '#c98b4b'], ['#ff9966', '#6a3d7a']], xs = [[8, 56], [57, 104], [105, 144]];
    let s = '';
    xs.forEach((p, i) => {
      const id = uid('g');
      s += '<defs><linearGradient id="' + id + '" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="' + looks[i][0] + '"/><stop offset="1" stop-color="' + looks[i][1] + '"/></linearGradient></defs>' +
        r(p[0], y, p[1] - p[0] - 0.8, h, 3, 'url(#' + id + ')', ' stroke="rgba(255,255,255,.3)" stroke-width=".7"');
      if (i === selIdx) s += r(p[0] - 1, y - 1, p[1] - p[0] + 1.2, h + 2, 3.5, 'none', ' stroke="#fff" stroke-width="1.6"') + r(p[0] - 5, y - 1, 4.5, h + 2, 1.5, '#fff') + r(p[1] - 0.6, y - 1, 4.5, h + 2, 1.5, '#fff');
    });
    return s;
  }
  function d10(k) {
    let s = r(0, 0, 150, 94, 0, C.panel) + clipRowMock(6, 24, 1);
    const tray = ['speed', 'sound', 'lift', 'look', 'crop', 'delete'], tools = ['clips', 'text', 'captions', 'music', 'overlay', 'look'];
    if (k === 'A') {
      s += r(0, 36, 150, 24, 0, '#0f1e26') + '<path d="M0 36h150M0 60h150" stroke="' + C.soft + '"/>';
      tray.forEach((n, i) => { s += ic(n, 10 + i * 23, 41.5, 13, C.text); });
      tools.forEach((n, i) => { s += ic(n, 10 + i * 23, 66, 13, C.dim); });
      s += t(75, 90, 'the toolbar stays', { size: 7.5, anchor: 'middle', fill: C.faint });
    } else {
      s += '<path d="M0 60h150" stroke="' + C.soft + '"/>' + r(5, 66, 36, 18, 6, 'rgba(255,255,255,.08)') + t(23, 78, '‹ Done', { size: 8.5, weight: 700, anchor: 'middle' });
      tray.slice(0, 5).forEach((n, i) => { s += ic(n, 50 + i * 20, 68.5, 13, C.text); });
      s += t(75, 50, 'the toolbar is gone', { size: 7.5, anchor: 'middle', fill: C.faint });
    }
    return s;
  }
  function d11(k) {
    const Q = [[4, C.accent], [15.5, '#f3d27a'], [27, '#ff9966']];
    const quick = () => Q.map(q => r(q[0], 15, 10.5, 12, 2, q[1])).join('');
    const full = () => Q.map((q, i) => r(q[0], 5 + i * 12, 10.5, 8, 2, q[1])).join('');
    const cell = (x, kind) => {
      const inner = kind === 'morph'
        ? Q.map((q, i) => r(q[0], 15, 10.5, 12, 2, q[1], ' class="v10-mo" style="--dy:' + (-10 + i * 12) + 'px;animation-delay:' + (i * 0.07).toFixed(2) + 's"')).join('')
        : kind === 'fold' ? '<g class="v10-fa">' + full() + '</g><g class="v10-fb">' + quick() + '</g>'
          : '<g class="v10-sa">' + full() + '</g><g class="v10-sb">' + quick() + '</g>';
      return '<svg x="' + x + '" y="8" width="42" height="42" viewBox="0 0 42 42" overflow="hidden">' + r(0, 0, 42, 42, 6, C.panel3) + inner + '</svg>';
    };
    const kinds = [['morph', 'Morph'], ['fold', 'Fold'], ['slide', 'Slide']];
    let s = '';
    kinds.forEach((kd, i) => {
      const x = 6 + i * 48, keep = k === 'B' && i === 0;
      s += '<g opacity="' + (k === 'B' && !keep ? 0.32 : 1) + '">' + cell(x, kd[0]) + t(x + 21, 61, kd[1], { size: 8.5, anchor: 'middle' }) + '</g>';
      if (keep) s += r(x - 2, 6, 46, 46, 8, 'none', ' stroke="' + C.accent + '" stroke-width="1.6"');
    });
    s += k === 'A' ? ic('shuffle', 36, 71, 14, C.accent) + t(55, 82, 'one at random', { size: 8.5, fill: C.dim })
      : t(75, 82, 'the morph only', { size: 8.5, anchor: 'middle', fill: C.dim });
    return s;
  }
  function d12(k) {
    const tools = ['clips', 'text', 'captions', 'music', 'overlay', 'look', 'effects', 'ask'];
    let s = barBg(60, 34);
    (k === 'A' ? tools : tools.slice(0, 7)).forEach((n, i) => {
      const x = 4 + i * 18.2;
      if (n === 'ask') s += r(x - 2.5, 64, 18, 20, 5, 'rgba(90,199,237,.18)');
      s += ic(n, x, 67.5, 13, n === 'ask' ? C.accent : C.text);
    });
    if (k === 'A') s += r(26, 8, 118, 22, 8, C.panel3, ' stroke="' + C.line + '"') + '<path d="M128 30l6 7 1-7z" fill="' + C.panel3 + '"/>' + t(34, 22.5, '"Make the title bigger"', { size: 8.5 }) +
      r(26, 37, 60, 14, 7, 'rgba(90,199,237,.16)', ' stroke="rgba(90,199,237,.5)"') + t(56, 47, 'one Undo', { size: 7.5, weight: 700, anchor: 'middle', fill: C.accent });
    else s += r(4 + 7 * 18.2 - 2.5, 64, 18, 20, 5, 'none', ' stroke="' + C.faint + '" stroke-dasharray="2 2"') + t(75, 32, 'Ask comes later', { size: 9.5, anchor: 'middle', fill: C.dim });
    return s;
  }
  function d13(k) {
    let s = '';
    const tile = (x0, x1, lk, name) => { const id = uid('g'); return '<defs><linearGradient id="' + id + '" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="' + lk[0] + '"/><stop offset="1" stop-color="' + lk[1] + '"/></linearGradient></defs>' + r(x0, 19, x1 - x0, 23, 3, 'url(#' + id + ')', ' stroke="rgba(255,255,255,.3)" stroke-width=".7"') + t(x0 + 4, 37, name, { size: 8, weight: 700, extra: SHADOW }); };
    if (k === 'A') {
      s += tile(6, 76, ['#5fd3e6', '#1f6fa3'], 'Waves') + tile(76.8, 144, ['#f3d27a', '#c98b4b'], 'Sandcastle') +
        '<path d="M76.4 23.5l7 7-7 7-7-7z" fill="' + C.accent + '" stroke="#04161d" stroke-width="1.2"/>' +
        '<path d="M6 8h138M6 5v6M144 5v6" stroke="' + C.dim + '" stroke-width=".8"/>' + r(58, 2, 34, 12, 4, C.bg) + t(75, 11, '0:14.2', { size: 8, anchor: 'middle', fill: C.dim }) +
        r(6, 47, 138, 9, 2, '#20654f', ' stroke="' + C.au + '" stroke-width=".7"');
    } else {
      const hid = uid('h');
      s += '<defs>' + hatch(hid, 'rgba(255,107,122,.45)', 'rgba(255,107,122,.15)', 4) + '</defs>' + tile(6, 80, ['#5fd3e6', '#1f6fa3'], 'Waves') + tile(72, 139, ['#f3d27a', '#c98b4b'], 'Sandcastle') +
        r(72, 19, 8, 23, 0, 'url(#' + hid + ')') + '<path d="M6 8h133M6 5v6M139 5v6" stroke="' + C.dim + '" stroke-width=".8"/>' + r(56, 2, 34, 12, 4, C.bg) + t(73, 11, '0:13.7', { size: 8, anchor: 'middle', fill: C.dim }) +
        r(139.5, 19, 5, 23, 2, 'none', ' stroke="' + C.bad + '" stroke-dasharray="2 1.5"') + r(6, 47, 133, 9, 2, '#20654f', ' stroke="' + C.au + '" stroke-width=".7"');
    }
    return s;
  }
  function d14(k) {
    const rows = ['Looks', 'Text', 'Captions', 'Sound', 'Moving clips'];
    let s = r(4, 4, 142, 86, 8, C.panel3, ' stroke="' + C.line + '"');
    rows.forEach((name, i) => {
      const y = 18 + i * 16;
      s += t(12, y + 3, name, { size: 9.5, fill: i === 4 ? C.faint : C.text, weight: 600 });
      let g, col, word;
      if (i === 4) { g = null; word = 'D14b'; }
      else if (k === 'C') { g = 'eye'; col = C.dim; word = 'watch'; }
      else { g = 'okC'; col = C.good; word = 'live'; }
      s += t(118, y + 3, esc(word), { size: 7.5, anchor: 'end', fill: C.faint }) + (g ? ic(g, 122, y - 6.5, 13, col, 2) : t(128.5, y + 3, '?', { size: 9, weight: 800, anchor: 'middle', fill: C.faint }));
    });
    return s;
  }
  /* D14b: a friend who can edit is connected. A: moving clips waits, Full as today. B: "together" later, and Full changes. */
  function d14b(k) {
    const col = (x, title, sub) => r(x, 4, 69, 86, 8, C.panel3, ' stroke="' + C.line + '"') + t(x + 6, 17, title, { size: 8.5, weight: 700 }) + t(x + 6, 27, sub, { size: 7, fill: C.faint });
    let s = col(4, tag(0, true), 'you') + col(77, tag(1, true), 'Sam');
    s += clipRowMockMini(10, 36) + clipRowMockMini(83, 36);
    if (k === 'A') {
      s += ic('clock', 41, 36.5, 13, C.warn, 2) + t(10, 64, 'clips stay put', { size: 7.5, fill: C.dim }) + t(10, 75, 'while Sam edits', { size: 7, fill: C.faint }) +
        ic('okC', 114, 36.5, 13, C.good, 2) + t(83, 64, 'as today', { size: 7.5, fill: C.dim }) + t(83, 75, 'nothing new', { size: 7, fill: C.faint });
    } else {
      s += '<path d="M40 43h8M45 40l3 3-3 3" stroke="' + C.accent + '" stroke-width="1.4" fill="none" stroke-linecap="round"/>' + t(10, 64, 'both move clips', { size: 7.5, fill: C.dim }) + t(10, 75, 'later (Phase 4)', { size: 7, fill: C.faint }) +
        '<circle cx="120.5" cy="43" r="6" fill="' + C.bad + '"/>' + t(120.5, 46, '!', { size: 8, weight: 800, anchor: 'middle', fill: '#1a0d06' }) +
        t(83, 64, tag(1, true) + ' changes', { size: 7.5, fill: C.bad }) + t(83, 75, 'with a friend in', { size: 7, fill: C.faint });
    }
    return s;
  }
  function d15(k) {
    if (k === 'A') return edBar(4, 10, 142, tag(0, true), tag(1, true), true, true) + t(75, 50, 'the switch in the ⚙ cog', { size: 8.5, anchor: 'middle', fill: C.dim }) +
      r(6, 64, 42, 16, 8, 'rgba(90,199,237,.16)', ' stroke="rgba(90,199,237,.5)"') + t(27, 75.5, 'Phase 1', { size: 8, weight: 700, anchor: 'middle', fill: C.accent }) +
      t(54, 75.5, tag(1, true) + ' untouched', { size: 8, fill: C.faint });
    if (k === 'B') return ic('book', 57, 12, 36, C.dim) + t(75, 68, 'Keep planning', { size: 10, anchor: 'middle' });
    return '<circle cx="75" cy="32" r="18" fill="none" stroke="' + C.dim + '" stroke-width="1.8"/>' + r(68, 24, 4.5, 16, 1.2, C.dim) + r(77.5, 24, 4.5, 16, 1.2, C.dim) + t(75, 68, 'Not now', { size: 10, anchor: 'middle' });
  }
  function d16(k) {
    if (k === 'A') {
      const cells = [ROWS[0].cands[0](), ROWS[1].cands[0](), ROWS[4].cands[0]()];
      return '<g transform="translate(8 6) scale(.55)">' + cells[0] + '</g>' + '<g transform="translate(78 8) scale(.8)">' + cells[1] + '</g>' +
        '<g transform="translate(10 40)">' + r(0, 0, 22, 14, 3.5, 'rgba(155,135,245,.9)') + ic('spark', 5.5, 1.5, 11, '#120c2a') + '</g>' +
        '<g transform="translate(74 36) scale(.9)">' + cells[2] + '</g>' +
        t(75, 84, 'one set, drawn for you', { size: 8.5, anchor: 'middle', fill: C.dim });
    }
    let s = '';
    ROWS[0].cands.forEach((c, i) => { s += '<g transform="translate(' + (8 + i * 70) + ' 18) scale(.55)">' + c() + '</g>' + t(8 + i * 70 + 33, 50, String(i + 1), { size: 9, anchor: 'middle', fill: i === 1 ? C.accent : C.dim }); });
    return s + r(8 + 70 - 4, 12, 74, 44, 7, 'none', ' stroke="' + C.accent + '" stroke-width="1.4"') + t(75, 78, 'a pick for each row', { size: 8.5, anchor: 'middle', fill: C.dim });
  }
  function d18(k) {
    const S = [6, 31, 56, 81], y1 = 16, y2 = 62;
    let s = barBg(y1 - 3, 28) + barBg(y2 - 3, 28);
    s += t(6, 10, tag(0, true), { size: 8, fill: C.accent }) + t(6, 56, tag(1, true) + ', as today', { size: 8, fill: C.faint });
    const top = k === 'A' ? [{ g: 'more' }, { g: 'split' }, null, { g: 'toStart' }] : [{ g: 'more' }, { g: 'split' }, { g: 'toStart' }];
    top.forEach((it, i) => { if (it) s += pb(S[i], y1, 22, it.g, it); });
    [{ g: 'more' }, { g: 'layers' }, { g: 'knob' }, { g: 'toStart' }].forEach((it, i) => { s += pb(S[i], y2, 22, it.g, it); });
    s += timePill(108, y1 + 3, 38, 16) + timePill(108, y2 + 3, 38, 16);
    const hl = (x, ya, yb) => r(x - 2.5, ya, 27, yb - ya, 6, 'none', ' stroke="' + C.kf + '" stroke-width="1.2" stroke-dasharray="3 2"');
    if (k === 'A') s += hl(S[3], y1 - 2.5, y2 + 24.5);
    else s += hl(S[2], y1 - 2.5, y1 + 24.5) + hl(S[3], y2 - 2.5, y2 + 24.5);
    return s;
  }
  function d22(k) {
    const head = (y, text) => t(10, y, text, { size: 7, weight: 700, fill: C.faint, extra: ' letter-spacing=".6"' });
    const fr = y => r(6, y, 138, 24, 7, C.panel3, ' stroke="' + C.line + '"') + t(13, y + 15.5, 'Share live', { size: 8.5 }) + ic('chevR', 130, y + 6.5, 11, C.dim, 2);
    if (k === 'A') return t(10, 12, 'Settings', { size: 9, weight: 700 }) + t(140, 12, 'as today', { size: 7, anchor: 'end', fill: C.faint }) + head(30, 'WORK WITH FRIENDS') + fr(36) +
      t(75, 80, 'the switch is only in the ⚙ cog', { size: 8, anchor: 'middle', fill: C.dim });
    return r(6, 6, 138, 30, 7, C.panel3, ' stroke="' + C.accent + '"') + t(13, 19, 'See any project as clips', { size: 8.5, weight: 700 }) + t(13, 30, 'still being tested.', { size: 7.5, fill: C.dim }) + toggle(119, 15, true) +
      head(50, 'WORK WITH FRIENDS') + fr(56) + t(75, 90, 'a new row in ' + tag(1, true) + '’s Settings', { size: 7.5, anchor: 'middle', fill: C.warn });
  }
  function d23(k) {
    let s = edBar(4, 6, 92, tag(0, true), tag(1, true), false, true);
    if (k === 'A') {
      s += ic('chevR', 98, 10, 16, C.accent, 2.4) + r(116, 4, 30, 30, 5, C.panel) + clipRowMockMini(118, 12) +
        t(75, 56, 'tap the switch: the cog closes,', { size: 8, anchor: 'middle', fill: C.dim }) + t(75, 68, 'and you see the other editor', { size: 8, anchor: 'middle', fill: C.dim }) +
        t(75, 86, 'stays open if Canvas has unapplied picks', { size: 7, anchor: 'middle', fill: C.faint });
    } else {
      s += r(4, 34, 142, 18, 5, C.panel3, ' stroke="' + C.line + '"') + t(10, 46, 'Friends', { size: 7.5 }) + r(4, 56, 142, 18, 5, C.panel3, ' stroke="' + C.line + '"') + t(10, 68, 'Canvas', { size: 7.5 }) +
        t(75, 88, 'the cog stays until you close it', { size: 8, anchor: 'middle', fill: C.dim });
    }
    return s;
  }
  function clipRowMockMini(x, y) { return r(x, y, 8, 14, 1.5, '#5fd3e6') + r(x + 9, y, 8, 14, 1.5, '#f3d27a') + r(x + 18, y, 8, 14, 1.5, '#ff9966'); }
  function d20(k) {
    const id = uid('g');
    let s = '<defs><linearGradient id="' + id + '" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#5fd3e6"/><stop offset="1" stop-color="#1f6fa3"/></linearGradient></defs>' +
      r(3, 3, 144, 88, 6, '#060c0f', ' stroke="#22313a"') + r(3.5, 3.5, 143, 45, 0, '#101823') + r(56, 7, 38, 38, 2, 'url(#' + id + ')') + t(75, 29, 'Beach day!', { size: 6.5, weight: 800, anchor: 'middle', extra: SHADOW }) +
      r(3.5, 49, 48, 41.5, 0, C.panel) + r(52.5, 49, 94, 41.5, 0, C.panel) + '<path d="M52 49v41.5M3.5 49h143" stroke="' + C.line + '"/>';
    ['clips', 'text', 'captions', 'look'].forEach((n, i) => { s += ic(n, 6 + i * 11.5, 80, 8.5, C.dim); });
    [[56, 80, '#9ad1a8'], [80.5, 108, '#5fd3e6'], [108.5, 128, '#f3d27a'], [128.5, 144, '#ff9966']].forEach(c => { s += r(c[0], 66, c[1] - c[0], 11, 2, c[2]); });
    s += r(56, 80, 88, 5, 1.5, '#20654f');
    const panel = (x, y, w, h) => r(x, y, w, h, 4, C.panel3, ' stroke="' + C.accent + '" stroke-width="1.3"') + t(x + 5, y + 10, 'Look', { size: 7.5, weight: 700 }) +
      r(x + 5, y + 15, w - 12, 2.5, 1.2, C.line) + r(x + 5, y + 15, (w - 12) * 0.6, 2.5, 1.2, C.accent) + (h > 26 ? r(x + 5, y + 23, w - 12, 2.5, 1.2, C.line) + r(x + 5, y + 23, (w - 12) * 0.35, 2.5, 1.2, C.accent) : '');
    if (k === 'A') s += panel(6, 51, 43, 24) + r(46.5, 53, 1.8, 12, 1, C.dim);
    if (k === 'B') s += panel(4, 26, 86, 22.5);
    if (k === 'C') s += panel(53, 50, 93, 40);
    return s;
  }
  function d21(k) {
    let s = r(6, 6, 138, 84, 9, C.panel3, ' stroke="' + C.line + '"') + t(16, 20, 'Clips', { size: 9, weight: k === 'A' ? 600 : 700, fill: k === 'A' ? C.dim : C.text });
    if (k === 'A') {
      s += t(50, 20, 'Extras', { size: 9, weight: 700 }) + r(50, 23, 30, 2, 1, C.accent);
      [['shape', 'Shapes'], ['star', 'Elements'], ['grid', 'Templates']].forEach((it, i) => {
        const x = 14 + i * 43;
        s += r(x, 32, 36, 34, 6, C.panel, ' stroke="' + C.line + '"') + ic(it[0], x + 9, 37, 18, C.accent) + t(x + 18, 62, it[1], { size: 7, anchor: 'middle', fill: C.dim });
      });
      s += t(75, 82, 'edit each piece after', { size: 7.5, anchor: 'middle', fill: C.faint });
    } else {
      s += r(16, 23, 24, 2, 1, C.accent);
      [['#9ad1a8', '#3f7d6b'], ['#5fd3e6', '#1f6fa3'], ['#f3d27a', '#c98b4b'], ['#ff9966', '#6a3d7a']].forEach((lk, i) => {
        const id = uid('g');
        s += '<defs><linearGradient id="' + id + '" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="' + lk[0] + '"/><stop offset="1" stop-color="' + lk[1] + '"/></linearGradient></defs>' + r(14 + i * 31.5, 30, 28, 24, 4, 'url(#' + id + ')');
      });
      s += t(75, 70, 'Shapes, elements and templates', { size: 7.5, anchor: 'middle', fill: C.dim }) + t(75, 81, 'are in ' + tag(1, true) + ' ›', { size: 7.5, weight: 700, anchor: 'middle', fill: C.accent });
    }
    return s;
  }
  function x1(k) {
    const id = uid('g');
    let s = barBg(4, 30) + ic('back', 3, 11, 15, C.text) + t(21, 23, 'Beach day', { size: 9.5, weight: 700 }) + ic('help', 76, 11.5, 14, C.text) + ic('gear', 112, 11.5, 14, C.text) +
      r(128, 12, 19, 14, 4, 'rgba(90,199,237,.18)', ' stroke="rgba(188,230,239,.22)"') + ic('export', 131.5, 13.5, 11, C.text, 2.2);
    s += k === 'A' ? r(92, 10.5, 17, 17, 4, 'none', ' stroke="' + C.faint + '" stroke-dasharray="1.5 1.8"') : ic('notes', 93.5, 11.5, 14, C.text);
    s += '<defs><linearGradient id="' + id + '" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#5fd3e6"/><stop offset="1" stop-color="#1f6fa3"/></linearGradient></defs>' +
      r(0, 34, 150, 26, 0, '#101823') + r(62, 36, 26, 22, 2, 'url(#' + id + ')') + r(0, 60, 150, 34, 0, C.panel) + clipRowMock(66, 22, 0);
    return s;
  }
  function x3(k) {
    const head = (y, text) => t(10, y, text, { size: 7, weight: 700, fill: C.faint, extra: ' letter-spacing=".6"' });
    const row1 = y => r(6, y, 138, 30, 7, C.panel3, ' stroke="' + C.line + '"') + t(13, y + 13, 'See any project as clips', { size: 8.5, weight: 700 }) + t(13, y + 24, 'still being tested.', { size: 7.5, fill: C.dim }) + toggle(119, y + 9, false);
    const row2 = y => r(6, y, 138, 24, 7, C.panel3, ' stroke="' + C.line + '"') + t(13, y + 15.5, 'Share live', { size: 8.5 }) + ic('chevR', 130, y + 6.5, 11, C.dim, 2);
    if (k === 'A') return row1(6) + head(50, 'WORK WITH FRIENDS') + row2(56);
    return head(11, 'TRY IT EARLY') + row1(15) + head(58, 'WORK WITH FRIENDS') + row2(63);
  }
  function x4(k) {
    let s = '<circle cx="18" cy="16" r="9" fill="#3a4a52"/>' + t(18, 19.5, 'S', { size: 9, weight: 800, anchor: 'middle', fill: C.dim }) + '<circle cx="24.5" cy="22.5" r="3" fill="#63808c" stroke="' + C.bg + '" stroke-width="1.4"/>' +
      t(32, 19.5, 'Sam · offline', { size: 8.5, fill: C.dim });
    s += r(6, 30, 138, 34, 7, C.panel, ' stroke="' + C.line + '"') + t(13, 44, 'Sam is offline · clips stay put', { size: 8.5 }) + t(137, 57.5, 'Arrange anyway', { size: 8.5, weight: 700, anchor: 'end', fill: C.accent });
    s += k === 'A' ? t(75, 82, 'until Sam leaves or you choose', { size: 8.5, anchor: 'middle', fill: C.dim })
      : ic('clock', 22, 72, 14, C.warn) + t(40, 82, 'ends by itself after 24 h', { size: 8.5, fill: C.dim });
    return s;
  }

  /* ------------------------------------------------------------ the page -------------------------------------------- */
  const CHECK = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  let ui = null;                                              // live references after mount

  function optionButton(d, o, kind) {
    const [k, short] = o;
    const b = el('button', 'v10-opt');
    b.type = 'button'; b.dataset.k = k;
    const recWord = kind === 'x' ? 'Chosen' : 'Recommended';
    b.innerHTML = '<span class="v10-tick">' + CHECK + '</span>' + d.pic(k) +
      '<span class="v10-ol"><span class="v10-let">' + k + '</span><span class="v10-lab">' + nm(short) + '</span>' +
      (k === d.rec || (kind === 'x' && k === 'A') ? '<span class="v10-rec' + (kind === 'x' ? ' x' : '') + '">' + recWord + '</span>' : '') + '</span>';
    return b;
  }
  function buildCard(d, kind) {
    const c = el('article', 'v10-card' + (kind === 'x' ? ' x' : ''));
    c.id = 'v10-' + d.id; c.dataset.d = d.id;
    const hid = 'v10-h-' + d.id;
    const flag = d.reask ? '<span class="v10-flag re">Asked again</span>' : d.fresh ? '<span class="v10-flag new">New since you answered</span>' : '';
    c.innerHTML = '<header class="v10-q">' + (kind === 'x' ? '' : '<span class="v10-num">' + d.id + '</span>') + '<div class="v10-qt">' + flag + '<h3 id="' + hid + '" tabindex="-1">' + nm(d.q) + '</h3>' +
      '<p class="v10-why">' + nm(d.why) + '</p>' + (d.reask ? '<p class="v10-reask">' + nm(d.reask) + '</p>' : '') + '</div></header>' +
      (d.before ? '<figure class="v10-before' + (d.photos ? ' photo' : '') + '">' + d.before() + '</figure>' : '') +
      '<div class="v10-opts n' + d.opts.length + (d.photos ? ' photos' : '') + '" role="group" aria-labelledby="' + hid + '"></div><p class="v10-said"></p>' +
      (d.foot ? '<p class="v10-foot">' + nm(d.foot) + '</p>' : '');
    const box = c.querySelector('.v10-opts');
    if (kind !== 'x' && isDecided(d)) {                        // his 1 Oct answer: shown, greyed, not pickable here
      const a = ANS[d.id];
      c.classList.add('done', 'decided');
      box.removeAttribute('role');
      box.innerHTML = d.opts.map(([k, short]) => '<div class="v10-opt' + (k === a.k ? ' mine' : '') + '">' + (k === a.k ? '<span class="v10-tick">' + CHECK + '</span>' : '') + d.pic(k) +
        '<span class="v10-ol"><span class="v10-let">' + k + '</span><span class="v10-lab">' + nm(short) + '</span>' +
        (k === a.k ? '<span class="v10-rec mine">Your pick</span>' : k === d.rec ? '<span class="v10-rec was">Was recommended</span>' : '') + '</span></div>').join('');
      const o = d.opts.find(x => x[0] === a.k), words = (a.said || [d.id + ' ' + a.k]).map(w => '<q>' + esc(w) + '</q>').join(', then ');
      c.querySelector('.v10-said').innerHTML = '<span class="v10-tag dec">Decided</span> Your answer, 1 Oct: ' + words + '. <b>' + a.k + '.</b> ' + nm(o[2] || o[1]) +
        (a.k !== d.rec ? ' <span class="v10-tag own">Not the one recommended then</span>' : '') + (a.note ? '<span class="v10-note">' + nm(a.note) + '</span>' : '');
      if (d.extra) c.appendChild(d.extra());
      return c;
    }
    if (d.settled) {
      c.classList.add('done', 'settled');
      box.removeAttribute('role'); box.classList.add('settled');
      box.innerHTML = '<div class="v10-opt v10-settled">' + d.pic() + '<span class="v10-ol"><span class="v10-let">✓</span><span class="v10-lab">' + nm(d.opts[0][1]) + '</span><span class="v10-rec">Settled</span></span></div>';
      c.querySelector('.v10-said').innerHTML = nm(d.said);
      return c;
    }
    d.opts.forEach(o => {
      const b = optionButton(d, o, kind);
      b.addEventListener('click', () => kind === 'x' ? pickX(d.id, o[0]) : pick(d.id, o[0]));
      box.appendChild(b);
    });
    if (d.extra) c.appendChild(d.extra());
    return c;
  }
  function iconRows() {
    const det = el('details', 'v10-more');
    det.innerHTML = '<summary>See the rows, big and at real size</summary><p class="v10-foot">Your A means option 1 in every row. Each is shown big, then at the size it ships at. Row 6, the back button in Full, is withdrawn: Full gets no new button.</p>';
    const wrap = el('div', 'v10-rows');
    ROWS.forEach((row, ri) => {
      const d = el('div', 'v10-irow');
      d.innerHTML = '<p class="v10-iname"><b>' + rowNo(row) + '.</b> ' + nm(row.name) + '</p>';
      const cands = el('div', 'v10-icands');
      row.cands.forEach((c, j) => {
        const b = el('div', 'v10-icand');
        b.dataset.row = row.id; b.dataset.j = String(j + 1); b.setAttribute('aria-pressed', String(j === 0));
        const pic = (sc, cls) => '<span class="' + cls + '"><svg viewBox="0 0 ' + row.W + ' ' + row.H + '" width="' + f(row.W * sc) + '" height="' + f(row.H * sc) + '" aria-hidden="true" focusable="false">' + c() + '</svg></span>';
        b.innerHTML = pic(row.big, 'v10-ibig') + pic(1, 'v10-ireal') + '<span class="v10-icap">' + (j + 1) + (j === 0 ? ' · your pick (A)' : '') + '</span>';
        b.setAttribute('role', 'img'); b.setAttribute('aria-label', 'Row ' + rowNo(row) + ', option ' + (j + 1) + (j === 0 ? ', your pick' : ''));
        cands.appendChild(b);
      });
      d.appendChild(cands); wrap.appendChild(d);
    });
    det.appendChild(wrap);
    return det;
  }

  function mount(host) {
    injectCSS();
    st = load();
    uidN = 0;
    const root = el('div', 'v10');
    host.appendChild(root);
    const intro = el('div', 'v10-intro');
    intro.innerHTML = '<p><b>' + (['No', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven'][NQ] || NQ) + ' choices are still yours.</b> You answered the rest on 1 Oct; they are below, greyed, with your words. Two of your answers are asked again (D3, D14b), because each would have changed ' + esc(names()[1]) + ', and your rule says ' + esc(names()[1]) + ' stays exactly as it is. D18 was rewritten after you answered, and D22, D23 and D24 are new.</p>' +
      '<p class="h-note">Each open choice has a picture of every option, and the one I would build is marked <b>Recommended</b>. Tap a picture to pick it. <b>Do recommended</b> picks the recommended one for every open choice you have not touched. Then <b>Copy my answers</b> and paste the message to me. Your picks stay on this device.</p>';
    root.appendChild(intro);

    const bw = el('section', 'v10-boardwrap');
    bw.setAttribute('aria-label', 'Your picks at a glance');
    bw.innerHTML = '<p class="v10-lbl">Still open</p>';
    const board = el('div', 'v10-board'), board2 = el('div', 'v10-board done');
    const chips = {};
    DEC.forEach(d => {
      const b = el('button', 'v10-chip', '<span>' + d.id + '</span><b>–</b>');
      b.type = 'button';
      b.addEventListener('click', () => jump(d.id));
      (OPEN.includes(d) ? board : board2).appendChild(b); chips[d.id] = b;
    });
    bw.appendChild(board);
    const legend = el('p', 'v10-legend', '<span><i class="rec"></i>recommended</span><span><i class="own"></i>your own pick</span><span><i class="none"></i>not picked yet</span>');
    bw.appendChild(legend);
    bw.appendChild(el('p', 'v10-lbl', 'Decided by you on 1 Oct, and D2 settled'));
    bw.appendChild(board2);
    root.appendChild(bw);

    const cards = {};
    const list = el('div', 'v10-list');
    OPEN.forEach(d => { const c = buildCard(d, 'd'); cards[d.id] = c; list.appendChild(c); });
    root.appendChild(list);
    const decSec = el('section', 'v10-sec v10-decsec');
    decSec.innerHTML = '<h3 class="v10-h">Decided by you, 1 Oct</h3><p class="h-note">Your answers from the page as it was before the 1 Oct revision, each with your words. They are greyed because they are done; nothing here can be changed by a tap. If one is wrong, just tell me.</p>';
    const dlist = el('div', 'v10-list');
    DEC.filter(d => !OPEN.includes(d)).forEach(d => { const c = buildCard(d, 'd'); cards[d.id] = c; dlist.appendChild(c); });
    decSec.appendChild(dlist);
    root.appendChild(decSec);

    // already decided
    const xs = el('section', 'v10-sec');
    xs.innerHTML = '<h3 class="v10-h">Already decided</h3><p class="h-note">These went with the recommended option, so the list above stays short. Each has its other option drawn beside it. If one is wrong, tap the other and it goes in your message.</p>';
    const xcards = {};
    XDEC.forEach(d => { const c = buildCard(d, 'x'); xcards[d.id] = c; xs.appendChild(c); });
    const other = el('details', 'v10-more v10-other');
    other.innerHTML = '<summary>Ten more small calls, already decided</summary><ul>' + OTHER.map(s => '<li>' + nm(s) + '</li>').join('') + '</ul><p class="v10-foot">Each of these is drawn on V9 (the ripple maths). Tell me if one is wrong.</p>';
    xs.appendChild(other);
    root.appendChild(xs);

    // the words
    const ws = el('section', 'v10-sec');
    ws.innerHTML = '<h3 class="v10-h">The words on screen</h3><p class="h-note">One name for each thing. Only {S} and the cog’s third block show these words; {F}’s own words stay exactly as they are. Change any word and the change goes in your message.</p>';
    const faces = el('article', 'v10-card x');
    faces.id = 'v10-faces';
    faces.innerHTML = '<header class="v10-q"><div class="v10-qt"><h3 id="v10-h-faces" tabindex="-1">The two buttons that move a clip off the clip row and back</h3><p class="v10-why">Their full names stay "Make overlay" and "Put in the clip row". The bare word "Overlay" is kept for the tool that adds a picture on top.</p></div></header>' +
      '<div class="v10-faces" role="group" aria-labelledby="v10-h-faces"></div>';
    const fbox = faces.querySelector('.v10-faces');
    FACES.opts.forEach(([k, label]) => {
      const b = el('button', 'v10-face');
      b.type = 'button'; b.dataset.k = k;
      const parts = label.split(' · ');
      b.innerHTML = '<span class="fm v10-facepic">' + parts.map((p, i) => '<span class="v10-fbtn">' + (p[0] === '⤒' || p[0] === '⤓' ? VIS.icon(i ? 'drop' : 'lift') + '<span>' + esc(p.slice(2)) + '</span>' : '<span>' + esc(p) + '</span>') + '</span>').join('') + '</span>' +
        '<span class="v10-ol"><span class="v10-let">' + k + '</span>' + (k === 'A' ? '<span class="v10-rec">Recommended</span>' : '<span></span>') + '</span>';
      b.addEventListener('click', () => { if (k === 'A') delete st.w.__faces; else st.w.__faces = k; save(); refreshWords(); refreshMsg(); });
      fbox.appendChild(b);
    });
    ws.appendChild(faces);
    const wl = el('div', 'v10-words');
    const inputs = {};
    WORDS.forEach(([key, thing]) => {
      const row = el('label', 'v10-word');
      const iid = 'v10-w-' + key;
      row.setAttribute('for', iid);
      row.innerHTML = '<span class="v10-wthing">' + nm(thing) + '</span><span class="v10-wbox"><textarea id="' + iid + '" rows="1" autocomplete="off" spellcheck="false"></textarea><button type="button" class="v10-wreset" aria-label="Put the word back" title="Put the word back">↺</button></span>';
      const inp = row.querySelector('textarea');
      inp.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); inp.blur(); } });
      inp.addEventListener('input', () => {
        if (/\n/.test(inp.value)) inp.value = inp.value.replace(/\n+/g, ' ');
        grow(inp);
        const def = plain(WORDS.find(w => w[0] === key)[2]);
        if (inp.value.trim() === def || !inp.value.trim()) delete st.w[key]; else st.w[key] = inp.value;
        save(); markWord(key); refreshMsg();
      });
      row.querySelector('.v10-wreset').addEventListener('click', e => { e.preventDefault(); delete st.w[key]; save(); refreshWords(); refreshMsg(); inp.focus(); });
      inputs[key] = inp;
      wl.appendChild(row);
    });
    ws.appendChild(wl);
    if (typeof ResizeObserver !== 'undefined') { let lastW = 0; new ResizeObserver(es => { const w = Math.round(es[0].contentRect.width); if (w !== lastW) { lastW = w; Object.keys(inputs).forEach(k => grow(inputs[k])); } }).observe(wl); }
    root.appendChild(ws);

    // your message + the dock
    const ans = el('section', 'v10-sec v10-ans');
    ans.innerHTML = '<h3 class="v10-h">Your message</h3><p class="h-note">This is what <b>Copy my answers</b> puts on your clipboard: the six open ones, and anything you changed further up. Paste it into the chat.</p>' +
      '<textarea class="v10-msg" readonly rows="6" aria-label="Your answers as a message"></textarea><p><button type="button" class="v10-clear">Start again (clear the open picks)</button></p>';
    root.appendChild(ans);
    const dock = el('div', 'v10-dock');
    dock.setAttribute('role', 'region'); dock.setAttribute('aria-label', 'Your answers');
    dock.innerHTML = '<div class="v10-dtop"><span class="v10-count"></span><span class="v10-meter" aria-hidden="true"><i></i></span></div>' +
      '<div class="v10-dbtns"><button type="button" class="h-btn" data-a="rec">Do recommended</button><button type="button" class="h-btn primary" data-a="copy">Copy my answers</button></div>' +
      '<p class="v10-status" role="status" aria-live="polite"></p>';
    root.appendChild(dock);

    ui = { root, chips, cards, xcards, faces, inputs, msg: ans.querySelector('.v10-msg'), dock, count: dock.querySelector('.v10-count'), meter: dock.querySelector('.v10-meter i'),
      status: dock.querySelector('.v10-status'), copyBtn: dock.querySelector('[data-a="copy"]'), recBtn: dock.querySelector('[data-a="rec"]') };
    ui.recBtn.addEventListener('click', doRecommended);
    ui.copyBtn.addEventListener('click', copyAnswers);
    ans.querySelector('.v10-clear').addEventListener('click', () => {
      const snap = JSON.stringify(st);
      st = { d: {}, x: {}, w: {}, i: {}, v: 3 }; save(); refreshAll();
      say('Every open pick is cleared. Your 1 Oct answers stay.', snap);
    });

    // D11 plays its three animations only while its card is on screen
    if ('IntersectionObserver' in window) {
      const io = new IntersectionObserver(es => es.forEach(e => e.target.classList.toggle('v10-live', e.isIntersecting && !reduced())), { threshold: 0.2 });
      DEC.filter(d => d.anim).forEach(d => io.observe(cards[d.id]));
    }
    refreshAll();
  }

  /* ------------------------------------------------------------ picking --------------------------------------------- */
  function pick(id, k) {
    const prev = st.d[id];
    st.d[id] = k;
    save();
    refreshCard(id); refreshBoard(prev !== k ? [id] : []); refreshDock();
    refreshMsg();
  }
  function pickX(id, k) {
    if (k === 'A') delete st.x[id]; else st.x[id] = k;
    save(); refreshX(id); refreshMsg();
  }
  function jump(id) {
    const c = ui.cards[id]; if (!c) return;
    c.scrollIntoView({ behavior: reduced() ? 'auto' : 'smooth', block: 'start' });
    const h = c.querySelector('h3'); if (h) try { h.focus({ preventScroll: true }); } catch (e) { /* old browsers */ }
    c.classList.remove('flash'); void c.offsetWidth; c.classList.add('flash');
  }

  /* ------------------------------------------------------------ drawing the state ----------------------------------- */
  function saidHTML(d, k, kind) {
    const recK = kind === 'x' ? 'A' : d.rec;
    const use = k || recK, o = d.opts.find(x => x[0] === use);
    const full = o[2] || o[1];
    if (!k && kind !== 'x') return '<span class="v10-tag">Not picked yet</span> Recommended: <b>' + use + '.</b> ' + nm(full);
    return '<b>' + use + '.</b> ' + nm(full) + (use === recK ? '' : ' <span class="v10-tag own">' + (kind === 'x' ? 'You changed this' : 'Not the recommended one') + '</span>');
  }
  function refreshCard(id) {
    const d = DMAP.get(id), c = ui.cards[id], k = st.d[id];
    if (d.settled || isDecided(d)) return;
    c.classList.toggle('done', !!k);
    c.querySelectorAll('.v10-opts .v10-opt').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.k === k)));
    c.querySelector('.v10-said').innerHTML = saidHTML(d, k, 'd');
  }
  function refreshX(id) {
    const d = XMAP.get(id), c = ui.xcards[id], k = st.x[id] || 'A';
    c.querySelectorAll('.v10-opt').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.k === k)));
    c.querySelector('.v10-said').innerHTML = saidHTML(d, k, 'x');
  }
  function refreshBoard(popIds) {
    DEC.forEach(d => {
      const b = ui.chips[d.id], k = st.d[d.id];
      if (d.settled) { b.className = 'v10-chip set'; b.querySelector('b').textContent = '✓'; b.setAttribute('aria-label', d.id + ': settled by your words. Go to it.'); return; }
      if (isDecided(d)) { const a = ANS[d.id].k; b.className = 'v10-chip set'; b.querySelector('b').textContent = a; b.setAttribute('aria-label', d.id + ': decided, your answer ' + a + '. Go to it.'); return; }
      b.className = 'v10-chip' + (k ? (k === d.rec ? ' rec' : ' own') : '');
      b.querySelector('b').textContent = k || '–';
      b.setAttribute('aria-label', d.id + ': ' + (k ? k + (k === d.rec ? ', the recommended one' : ', your own pick') : 'not picked yet') + '. Go to it.');
    });
    (popIds || []).forEach((id, i) => {
      const b = ui.chips[id]; if (!b || reduced()) return;
      setTimeout(() => { b.classList.remove('pop'); void b.offsetWidth; b.classList.add('pop'); }, i * 28);
    });
  }
  function refreshDock() {
    const n = OPEN.filter(d => st.d[d.id]).length, own = OPEN.filter(d => st.d[d.id] && st.d[d.id] !== d.rec).length;
    ui.count.innerHTML = '<b>' + n + '</b> of ' + NQ + ' picked' + (own ? ' · <span class="v10-ownc">' + own + ' of your own</span>' : '');
    ui.meter.style.width = (n / NQ * 100) + '%';
  }
  function refreshNames() {
    const [a, b] = names();
    ui.root.querySelectorAll('.v10-nS').forEach(n => { n.textContent = a; });
    ui.root.querySelectorAll('.v10-nF').forEach(n => { n.textContent = b; });
    refreshWords();
  }
  function refreshIcons() { /* D16 is decided (A): the rows are shown with option 1 marked, and nothing is picked here */ }
  function grow(ta) { ta.style.height = 'auto'; if (ta.scrollHeight) ta.style.height = (ta.scrollHeight + 3) + 'px'; }
  function markWord(key) {
    const inp = ui.inputs[key], row = inp.closest('.v10-word');
    row.classList.toggle('changed', st.w[key] != null);
  }
  function refreshWords() {
    WORDS.forEach(([key, , def]) => {
      const inp = ui.inputs[key];
      const want = st.w[key] != null ? st.w[key] : plain(def);
      if (inp.value !== want && document.activeElement !== inp) inp.value = want;
      markWord(key); grow(inp);
    });
    const fk = st.w.__faces || 'A';
    ui.faces.querySelectorAll('.v10-face').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.k === fk)));
  }
  function refreshAll() {
    DEC.forEach(d => refreshCard(d.id));
    XDEC.forEach(d => refreshX(d.id));
    refreshBoard([]); refreshDock(); refreshNames(); refreshIcons(); refreshMsg();
  }

  /* ------------------------------------------------------------ the message ----------------------------------------- */
  function message() {
    const out = ['My picks on the open ones: ' + OPEN.map(d => d.id + ' ' + (st.d[d.id] || '?')).join(', ') + '. (The rest I answered on 1 Oct; D2 is settled: the cog.)'];
    const off = OPEN.filter(d => st.d[d.id] && st.d[d.id] !== d.rec).map(d => d.id + ' ' + st.d[d.id]);
    const none = OPEN.filter(d => !st.d[d.id]).map(d => d.id);
    if (!off.length && !none.length) out.push('All as recommended.');
    if (off.length) out.push('Not the recommended one: ' + off.join(', ') + '.');
    if (none.length) out.push('Not picked yet: ' + none.join(', ') + '.');
    const xs = XDEC.filter(d => st.x[d.id]).map(d => plain(d.label) + ': ' + st.x[d.id] + ' (' + plain(d.opts.find(o => o[0] === st.x[d.id])[1]) + ')');
    if (xs.length) out.push('Change these decided ones: ' + xs.join('; ') + '.');
    if (st.w.__faces) out.push('Clip buttons: ' + st.w.__faces + ' (' + FACES.opts.find(o => o[0] === st.w.__faces)[1] + ').');
    const ws = WORDS.filter(w => st.w[w[0]] != null).map(w => '"' + plain(w[2]) + '" → "' + String(st.w[w[0]]).trim() + '"');
    if (ws.length) out.push('Words: ' + ws.join('; ') + '.');
    return out.join('\n');
  }
  function refreshMsg() { if (ui) ui.msg.value = message(); }

  let sayTm = 0;
  function say(text, undoSnap) {
    const s = ui.status;
    s.innerHTML = '<span>' + esc(text) + '</span>';
    if (undoSnap) {
      const b = el('button', '', 'Undo'); b.type = 'button';
      b.addEventListener('click', () => { try { st = JSON.parse(undoSnap); } catch (e) { return; } save(); refreshAll(); say('Put back as it was.'); });
      s.appendChild(b);
    }
    clearTimeout(sayTm);
    sayTm = setTimeout(() => { s.innerHTML = ''; }, undoSnap ? 9000 : 4500);
  }
  function doRecommended() {
    const snap = JSON.stringify(st);
    const unpicked = OPEN.filter(d => !st.d[d.id]);
    const changed = unpicked.length ? unpicked : OPEN.filter(d => st.d[d.id] !== d.rec);
    if (!changed.length) { say('Every answer is already the recommended one.'); return; }
    changed.forEach(d => { st.d[d.id] = d.rec; });
    save();
    DEC.forEach(d => refreshCard(d.id));
    refreshBoard(changed.map(d => d.id)); refreshDock(); refreshNames(); refreshIcons(); refreshMsg();
    const own = OPEN.filter(d => st.d[d.id] !== d.rec).length;
    say(unpicked.length
      ? 'Picked the recommended one for ' + changed.length + (own ? '. ' + (own === 1 ? 'Your own pick is kept' : 'Your ' + own + ' own picks are kept') + '; press again to make ' + (own === 1 ? 'it' : 'them') + ' recommended too.' : '.')
      : 'All ' + NQ + ' are now the recommended one.', snap);
  }
  function copyAnswers() {
    const text = message(), ta = ui.msg, btn = ui.copyBtn;
    ta.value = text;
    const flash = () => { btn.textContent = 'Copied ✓'; setTimeout(() => { btn.textContent = 'Copy my answers'; }, 1800); };
    const fallback = () => {
      let ok = false;
      try { ta.readOnly = false; ta.focus({ preventScroll: true }); ta.select(); ta.setSelectionRange(0, text.length); ok = document.execCommand('copy'); } catch (e) { ok = false; }
      ta.readOnly = true;
      if (ok) { flash(); say('Copied. Paste it into the chat.'); }
      else { ta.scrollIntoView({ block: 'center', behavior: reduced() ? 'auto' : 'smooth' }); ta.focus({ preventScroll: true }); ta.select(); say('Your answers are selected in the box above. Copy them from there.'); }
    };
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(() => { flash(); say('Copied. Paste it into the chat.'); }, fallback);
      else fallback();
    } catch (e) { fallback(); }
  }

  /* ------------------------------------------------------------ styles ---------------------------------------------- */
  function injectCSS() {
    if (document.getElementById('v10-css')) return;
    const s = document.createElement('style');
    s.id = 'v10-css';
    s.textContent = `
.v10{display:grid;gap:22px;min-width:0;container-type:inline-size;container-name:v10}
.v10>*,.v10-list>*{min-width:0}
.v10 p{margin:0}
.v10-intro{display:grid;gap:8px;max-width:64ch;font-size:16px}
.v10-boardwrap{display:grid;gap:8px}
.v10-lbl{font-family:var(--h-mono);font-size:11.5px;letter-spacing:.08em;text-transform:uppercase;color:var(--h-muted)}
.v10-board{display:grid;grid-template-columns:repeat(auto-fill,minmax(44px,1fr));gap:6px}
@container v10 (min-width:700px){.v10-board{grid-template-columns:repeat(11,minmax(0,1fr))}}
.v10-chip{min-height:48px;border-radius:11px;border:1.5px dashed var(--h-rule);background:var(--h-surface);color:var(--h-muted);display:grid;place-items:center;align-content:center;gap:3px;cursor:pointer;font:600 10.5px/1 var(--h-mono);padding:5px 0;transition:background .2s,border-color .2s}
.v10-chip b{font:700 17px/1 var(--h-display);color:var(--h-faint)}
.v10-chip:hover{border-color:var(--h-accent)}
.v10-chip.rec{border-style:solid;border-color:color-mix(in srgb,var(--h-accent) 45%,var(--h-rule));background:var(--h-accent-soft)}
.v10-chip.rec b{color:var(--h-accent)}
.v10-chip.own{border-style:solid;border-color:color-mix(in srgb,var(--h-warn) 60%,var(--h-rule));background:color-mix(in srgb,var(--h-warn) 12%,var(--h-surface))}
.v10-chip.own b{color:var(--h-warn)}
.v10-chip.pop{animation:v10-pop .38s cubic-bezier(.2,.8,.2,1.35)}
.v10-chip.set{border-style:solid;border-color:var(--h-good);background:color-mix(in srgb,var(--h-good) 12%,var(--h-surface))}
.v10-chip.set b{color:var(--h-good)}
.v10-opts.settled{grid-template-columns:minmax(0,320px)}
.v10-opt.v10-settled{cursor:default;border-color:var(--h-good)}
.v10-card.settled .v10-why q{font-style:italic;color:var(--h-ink)}
@keyframes v10-pop{0%{transform:scale(.82)}100%{transform:none}}
.v10-legend{display:flex;flex-wrap:wrap;gap:4px 16px;font-size:13px;color:var(--h-muted)}
.v10-legend i{display:inline-block;width:11px;height:11px;border-radius:3px;margin-right:6px;vertical-align:-1px;border:1.5px solid var(--h-rule)}
.v10-legend i.rec{background:var(--h-accent-soft);border-color:var(--h-accent)}
.v10-legend i.own{background:color-mix(in srgb,var(--h-warn) 14%,transparent);border-color:var(--h-warn)}
.v10-legend i.none{border-style:dashed}
.v10-list{display:grid;gap:16px}
.v10-card{background:var(--h-surface);border:1px solid var(--h-rule);border-radius:18px;padding:14px 12px 14px;display:grid;gap:12px;scroll-margin-top:14px;box-shadow:var(--h-shadow);min-width:0}
@container v10 (min-width:560px){.v10-card{padding:18px 18px 16px}}
.v10-card.flash{animation:v10-flash 1.1s ease-out}
@keyframes v10-flash{0%{box-shadow:0 0 0 4px var(--h-accent),var(--h-shadow)}100%{box-shadow:0 0 0 0 transparent,var(--h-shadow)}}
.v10-q{display:flex;gap:10px;align-items:flex-start}
.v10-num{flex:none;font:700 12.5px/1 var(--h-mono);padding:7px 8px;border-radius:8px;background:var(--h-surface-2);color:var(--h-muted);margin-top:1px;transition:background .2s,color .2s}
.v10-card.done .v10-num{background:var(--h-accent);color:var(--h-accent-ink)}
.v10-qt{display:grid;gap:4px;min-width:0}
.v10-q h3{font:700 19px/1.2 var(--h-display);margin:0;letter-spacing:-.005em;text-wrap:balance;outline:none}
.v10-why{color:var(--h-muted);font-size:14.5px;line-height:1.4}
.v10-before{margin:0;display:grid;gap:6px;max-width:520px}
.v10-before figcaption{font-size:13.5px;color:var(--h-muted);line-height:1.4}
.v10-before figcaption b{color:var(--h-ink)}
.v10-opts{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}
@container v10 (min-width:640px){.v10-opts{grid-template-columns:repeat(4,minmax(0,1fr))}}
.v10-opt{position:relative;display:grid;gap:8px;align-content:start;text-align:left;padding:5px 5px 10px;border-radius:14px;border:1.5px solid var(--h-rule);background:var(--h-bg);color:var(--h-ink);cursor:pointer;font:inherit;min-width:0;-webkit-tap-highlight-color:transparent;transition:border-color .18s,box-shadow .18s,transform .15s,background .18s}
.v10-opt:hover{border-color:color-mix(in srgb,var(--h-accent) 55%,var(--h-rule))}
.v10-opt:active{transform:scale(.98)}
.v10-opt[aria-pressed="true"]{border-color:var(--h-accent);box-shadow:0 0 0 3px var(--h-accent-soft);background:var(--h-surface)}
.v10-tick{position:absolute;bottom:9px;right:9px;z-index:2;width:26px;height:26px;border-radius:50%;background:var(--h-accent);color:var(--h-accent-ink);display:grid;place-items:center;transform:scale(0);transition:transform .24s cubic-bezier(.2,.8,.2,1.4);box-shadow:0 2px 8px rgba(0,0,0,.35)}
.v10-tick svg{width:15px;height:15px}
.v10-opt[aria-pressed="true"] .v10-tick{transform:scale(1)}
.v10-pic{display:flex;flex-direction:column;border-radius:10px;overflow:hidden;background:radial-gradient(120% 70% at 50% -10%,rgba(90,199,237,.10),transparent 60%),#0a141a;border:1px solid #1d3742;color:#e9f4f7}
.v10-pic svg{display:block;width:100%;height:auto;aspect-ratio:150/94}
.v10-pic.strip svg{aspect-ratio:150/62}
.v10-pic.wide svg{aspect-ratio:320/80}
.v10-pic text{font-family:-apple-system,BlinkMacSystemFont,"SF Pro Display","Segoe UI",Inter,sans-serif}
.v10-line{display:flex;flex-wrap:wrap;align-items:center;gap:2px 8px;min-height:40px;padding:6px 8px;border-top:1px solid #16303a;font:500 11.5px/1.3 -apple-system,BlinkMacSystemFont,"Segoe UI",Inter,sans-serif}
.v10-line.app{background:#0f1e26;color:#93aeb9}
.v10-line.app .v10-lt{flex:1 1 auto;min-width:0;color:#e9f4f7}
.v10-line.app .v10-lb{color:#5ac7ed;font-weight:700}
.v10-line.note{color:#93aeb9;font-style:italic;display:block}
.v10-ol{display:grid;grid-template-columns:auto minmax(0,1fr);gap:4px 8px;padding:0 30px 0 4px;align-items:start}
.v10-let{width:24px;height:24px;border-radius:50%;display:grid;place-items:center;font:700 13px/1 var(--h-display);background:var(--h-surface-2);color:var(--h-ink);transition:background .18s,color .18s}
.v10-opt[aria-pressed="true"] .v10-let,.v10-face[aria-pressed="true"] .v10-let,.v10-icand[aria-pressed="true"] .v10-icap{background:var(--h-accent);color:var(--h-accent-ink)}
.v10-lab{font-size:14.5px;line-height:1.3;font-weight:700;padding-top:3px;overflow-wrap:anywhere}
.v10-rec{grid-column:2;justify-self:start;font:700 10.5px/1 var(--h-mono);letter-spacing:.06em;text-transform:uppercase;color:var(--h-good);padding:4px 6px;border-radius:6px;background:color-mix(in srgb,var(--h-good) 15%,transparent)}
.v10-rec.x{color:var(--h-muted);background:var(--h-surface-2)}
.v10-said{font-size:14.5px;line-height:1.45;color:var(--h-muted);padding:10px 12px;border-left:3px solid var(--h-accent);background:var(--h-accent-soft);border-radius:0 10px 10px 0}
.v10-said b{color:var(--h-ink)}
.v10-tag{display:inline-block;font:700 10.5px/1 var(--h-mono);letter-spacing:.05em;text-transform:uppercase;padding:4px 6px;border-radius:6px;background:var(--h-surface-2);color:var(--h-muted);vertical-align:1px;margin-right:4px}
.v10-tag.own{background:color-mix(in srgb,var(--h-warn) 16%,transparent);color:var(--h-warn);margin:0 0 0 4px}
.v10-foot{font-size:13.5px;color:var(--h-muted);line-height:1.4}
.v10-card.x{box-shadow:none;background:color-mix(in srgb,var(--h-surface) 70%,var(--h-bg))}
.v10-card.x .v10-said{border-left-color:var(--h-rule);background:var(--h-surface-2)}
.v10-sec{display:grid;gap:12px;padding-top:22px;border-top:1px solid var(--h-rule)}
.v10-h{font:700 23px/1.15 var(--h-display);margin:0}
.v10-more{border:1px solid var(--h-rule);border-radius:14px;background:var(--h-bg)}
.v10-more>summary{cursor:pointer;list-style:none;padding:12px 14px;min-height:48px;display:flex;align-items:center;gap:10px;font-weight:700;font-size:15px}
.v10-more>summary::-webkit-details-marker{display:none}
.v10-more>summary::after{content:"";margin-left:auto;width:8px;height:8px;border-right:2px solid var(--h-muted);border-bottom:2px solid var(--h-muted);transform:rotate(45deg);margin-top:-4px;transition:transform .18s;flex:none}
.v10-more[open]>summary::after{transform:rotate(-135deg);margin-top:4px}
.v10-more>.v10-foot{padding:0 14px 10px}
.v10-other ul{margin:0;padding:0 16px 10px 34px;display:grid;gap:7px;font-size:14.5px;line-height:1.4}
.v10-rows{display:grid;gap:16px;padding:4px 12px 14px}
.v10-irow{display:grid;gap:8px}
.v10-iname{font-size:14.5px;line-height:1.35}
.v10-icands{display:grid;grid-template-columns:repeat(auto-fill,minmax(128px,1fr));gap:8px}
.v10-icand{display:grid;gap:6px;justify-items:center;padding:10px 8px 8px;border-radius:12px;border:1.5px solid #1d3742;background:#0a141a;cursor:pointer;color:#e9f4f7;min-width:0;transition:border-color .18s,box-shadow .18s}
.v10-icand:hover{border-color:#37a8d4}
.v10-icand[aria-pressed="true"]{border-color:#5ac7ed;box-shadow:0 0 0 3px rgba(90,199,237,.22)}
.v10-ibig,.v10-ireal{display:grid;place-items:center;min-height:30px;max-width:100%}
.v10-ibig svg,.v10-ireal svg{display:block;max-width:100%;height:auto}
.v10-ireal{padding:5px 8px;border-radius:8px;background:#0f1e26}
.v10-icand text{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Inter,sans-serif}
.v10-icap{font:700 10.5px/1 var(--h-mono);white-space:nowrap;padding:5px 7px;border-radius:6px;background:#172c36;color:#93aeb9}
.v10-faces{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:10px}
.v10-face{display:grid;gap:8px;padding:5px 5px 10px;border-radius:14px;border:1.5px solid var(--h-rule);background:var(--h-bg);cursor:pointer;font:inherit;color:var(--h-ink);text-align:left;transition:border-color .18s,box-shadow .18s}
.v10-face[aria-pressed="true"]{border-color:var(--h-accent);box-shadow:0 0 0 3px var(--h-accent-soft);background:var(--h-surface)}
.v10-facepic{display:flex;gap:4px;justify-content:center;padding:10px 6px;border-radius:10px;background:#0f1e26;border:1px solid #1d3742}
.v10-fbtn{flex:1 1 0;min-width:0;display:flex;flex-direction:column;align-items:center;gap:4px;padding:4px 2px;border-radius:9px;color:#93aeb9;font-size:10.5px;line-height:1.15;text-align:center}
.v10-fbtn .ico{width:20px;height:20px;color:#e9f4f7}
.v10-words{display:grid;gap:10px}
.v10-word{display:grid;gap:5px;min-width:0}
@container v10 (min-width:640px){.v10-word{grid-template-columns:230px minmax(0,1fr);align-items:center;gap:12px}}
.v10-wthing{font-size:14px;color:var(--h-muted);line-height:1.3}
.v10-wbox{display:flex;gap:6px;min-width:0}
.v10-wbox textarea{flex:1;min-width:0;font:16px/1.35 var(--h-body);color:var(--h-ink);background:var(--h-bg);border:1.5px solid var(--h-rule);border-radius:10px;padding:10px 12px;min-height:44px;resize:none;overflow:hidden;display:block}
.v10-wbox textarea:focus{outline:none;border-color:var(--h-accent);box-shadow:0 0 0 3px var(--h-accent-soft)}
.v10-word.changed textarea{border-color:var(--h-warn);background:color-mix(in srgb,var(--h-warn) 7%,var(--h-bg))}
.v10-wreset{flex:none;width:44px;min-height:44px;border-radius:10px;border:1.5px solid var(--h-rule);background:var(--h-surface);color:var(--h-muted);font:700 18px/1 var(--h-body);cursor:pointer;display:none}
.v10-word.changed .v10-wreset{display:block}
.v10-msg{width:100%;min-height:150px;font:14px/1.5 var(--h-mono);padding:12px;border-radius:12px;border:1.5px solid var(--h-rule);background:var(--h-bg);color:var(--h-ink);resize:vertical;white-space:pre-wrap}
.v10-msg:focus{outline:none;border-color:var(--h-accent);font-size:16px}
.v10-clear{border:0;background:none;color:var(--h-muted);text-decoration:underline;text-underline-offset:3px;font:14px var(--h-body);cursor:pointer;padding:10px 0;min-height:44px}
.v10-dock{position:sticky;bottom:0;z-index:30;display:grid;gap:8px;padding:10px 12px calc(10px + env(safe-area-inset-bottom,0px));background:color-mix(in srgb,var(--h-surface) 97%,transparent);-webkit-backdrop-filter:blur(12px);backdrop-filter:blur(12px);border:1px solid var(--h-rule);border-bottom:0;border-radius:16px 16px 0 0;box-shadow:0 -8px 26px rgba(14,28,34,.12)}
.v10-dtop{display:flex;align-items:center;gap:10px;font-size:14px;min-width:0}
.v10-count{white-space:nowrap}
.v10-ownc{color:var(--h-warn)}
.v10-meter{flex:1;min-width:40px;height:6px;border-radius:3px;background:var(--h-surface-2);overflow:hidden}
.v10-meter i{display:block;height:100%;width:0;background:var(--h-accent);border-radius:3px;transition:width .4s cubic-bezier(.2,.8,.2,1)}
.v10-dbtns{display:grid;grid-template-columns:1fr 1fr;gap:8px}
.v10-dbtns .h-btn{padding:11px 6px;font-size:14.5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
@container v10 (min-width:640px){.v10-dock{grid-template-columns:minmax(0,1fr) auto;align-items:center;column-gap:18px}.v10-dbtns{grid-template-columns:auto auto}.v10-dbtns .h-btn{padding:11px 18px}.v10-status{grid-column:1/-1}}
.v10-status{font-size:13.5px;color:var(--h-ink);display:flex;flex-wrap:wrap;align-items:center;gap:2px 10px}
.v10-status:empty{display:none}
.v10-status button{border:0;background:none;color:var(--h-accent);font:700 14px var(--h-body);cursor:pointer;padding:6px 4px;min-height:36px}
/* D11: the three switch animations, only while the card is on screen */
.v10-mo,.v10-fa,.v10-fb,.v10-sa,.v10-sb{transform-box:fill-box}
.v10-fa{transform-origin:50% 100%;transform:scaleY(0)}
.v10-fb{transform-origin:50% 100%}
.v10-sa{transform:translateX(-44px)}
.v10-live .v10-mo{animation:v10-mo 3.4s cubic-bezier(.2,.8,.2,1) infinite}
.v10-live .v10-fa{animation:v10-fa 3.4s ease-in-out infinite}
.v10-live .v10-fb{animation:v10-fb 3.4s ease-in-out infinite}
.v10-live .v10-sa{animation:v10-sa 3.4s cubic-bezier(.2,.8,.2,1) infinite}
.v10-live .v10-sb{animation:v10-sb 3.4s cubic-bezier(.2,.8,.2,1) infinite}
@keyframes v10-mo{0%,18%{transform:translateY(var(--dy))}46%,72%{transform:none}96%,100%{transform:translateY(var(--dy))}}
@keyframes v10-fa{0%,15%{transform:scaleY(1)}35%,80%{transform:scaleY(0)}100%{transform:scaleY(1)}}
@keyframes v10-fb{0%,35%{transform:scaleY(0)}55%,78%{transform:scaleY(1)}92%,100%{transform:scaleY(0)}}
@keyframes v10-sa{0%,18%{transform:none}45%,75%{transform:translateX(-44px)}100%{transform:none}}
@keyframes v10-sb{0%,18%{transform:translateX(44px)}45%,75%{transform:none}100%{transform:translateX(44px)}}
/* 1 Oct: his answers, greyed and not pickable; the open ones carry a flag saying why they are open */
.v10-board.done{opacity:.8}
.v10-board.done .v10-chip.set{border-style:solid;border-color:var(--h-rule);background:var(--h-surface-2);color:var(--h-faint)}
.v10-board.done .v10-chip.set b{color:var(--h-muted)}
.v10-boardwrap>.v10-lbl+.v10-board.done{margin-top:-2px}
.v10-flag{justify-self:start;font:700 10.5px/1 var(--h-mono);letter-spacing:.06em;text-transform:uppercase;padding:4px 7px;border-radius:6px;margin-bottom:2px}
.v10-flag.re{color:var(--h-warn);background:color-mix(in srgb,var(--h-warn) 15%,transparent)}
.v10-flag.new{color:var(--h-accent);background:var(--h-accent-soft)}
.v10-reask{font-size:14px;line-height:1.4;color:var(--h-ink);padding:8px 10px;border-radius:10px;border:1px dashed color-mix(in srgb,var(--h-warn) 55%,var(--h-rule));background:color-mix(in srgb,var(--h-warn) 7%,transparent);margin-top:4px}
.v10-reask q,.v10-said q{font-style:italic;color:var(--h-ink)}
.v10-card.decided{box-shadow:none;background:color-mix(in srgb,var(--h-surface) 55%,var(--h-bg))}
.v10-card.decided .v10-num{background:var(--h-surface-2);color:var(--h-muted)}
.v10-card.decided .v10-q h3{color:var(--h-muted)}
.v10-card.decided .v10-opt{cursor:default;opacity:.5}
.v10-card.decided .v10-opt:hover{border-color:var(--h-rule)}
.v10-card.decided .v10-opt:active{transform:none}
.v10-card.decided .v10-opt .v10-pic{filter:grayscale(.85)}
.v10-card.decided .v10-opt.mine{opacity:.9;border-color:color-mix(in srgb,var(--h-good) 60%,var(--h-rule));background:var(--h-surface)}
.v10-card.decided .v10-opt.mine .v10-pic{filter:grayscale(.35)}
.v10-card.decided .v10-opt.mine .v10-tick{transform:scale(1);background:color-mix(in srgb,var(--h-good) 80%,#000)}
.v10-card.decided .v10-opt.mine .v10-let{background:color-mix(in srgb,var(--h-good) 75%,#000);color:#fff}
.v10-card.decided .v10-said{border-left-color:var(--h-good);background:color-mix(in srgb,var(--h-good) 9%,transparent)}
.v10-rec.mine{color:var(--h-good)}
.v10-rec.was{color:var(--h-muted);background:var(--h-surface-2)}
.v10-tag.dec{background:color-mix(in srgb,var(--h-good) 16%,transparent);color:var(--h-good)}
.v10-note{display:block;margin-top:6px;font-size:13.5px}
.v10-decsec .v10-list{gap:12px}
.v10-pic.photo{background:#0d1117}
.v10-pic.photo img{display:block;width:100%;height:auto}
.v10-opts.photos{grid-template-columns:minmax(0,1fr)}
@container v10 (min-width:640px){.v10-opts.photos{grid-template-columns:repeat(3,minmax(0,1fr))}}
.v10-before.photo{max-width:760px}
.v10-before a,.v10-foot a{color:var(--h-accent);font-weight:700;text-underline-offset:3px}
@media (prefers-reduced-motion: reduce){.v10 *{animation:none!important;transition:none!important}}
`;
    document.head.appendChild(s);
  }

  VIS.register('v10', {
    title: 'Your decisions',
    group: 'Your decisions',
    blurb: 'Six choices still open, each with a picture of the options and the recommended one marked; the rest you decided on 1 Oct, shown with your words.',
    mount
  });
})();
