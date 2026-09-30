/* #482 polish batch 3 (tone) — before/after pictures for Ezra (#545). Sound cannot be shown, so each sheet shows what the
   control DOES, measured from the app's OWN audio chain: FM.buildAudioFxChain on an OfflineAudioContext, the builder both
   the export and the live preview use — nothing is drawn by hand.
     · EQ curves are the chain's real frequency response: an impulse through the effect, then how loud each pitch comes out.
     · Pitch is read off a buzzy 220 Hz tone (voice-like, full of harmonics) by autocorrelation — what an ear hears as the
       note. A pure sine would be the wrong probe: this shifter turns a sine into a comb 20 Hz apart (see the tests).
     · "How late" is where a click's energy lands after the effect.
   Today = top (the old default, which the new default reproduces bit for bit); New = underneath.
   Injected by render.py with window.__sheet482t set to the sheet name. */
return (async function () {
  var SHEET = window.__sheet482t, SR = 48000;
  async function render(fx, sig, n, anchor) {
    var oac = new OfflineAudioContext(1, n, SR), b = oac.createBuffer(1, n, SR), d = b.getChannelData(0);
    for (var i = 0; i < n; i++) d[i] = sig(i);
    var src = oac.createBufferSource(); src.buffer = b;
    var chain = FM.buildAudioFxChain(oac, { audioFx: fx }, anchor || 0);
    chain.schedule(anchor || 0, (anchor || 0) + n / SR);
    src.connect(chain.input); chain.output.connect(oac.destination); src.start(0);
    var r = await oac.startRendering(); try { chain.dispose(); } catch (e) {}
    return r.getChannelData(0);
  }
  var FREQS = []; for (var k = 0; k <= 170; k++) FREQS.push(20 * Math.pow(1000, k / 170));
  async function response(fx) {
    var n = 16384, h = await render(fx, function (i) { return i === 0 ? 1 : 0; }, n);
    return FREQS.map(function (f) {
      var w = 2 * Math.PI * f / SR, re = 0, im = 0;
      for (var i = 0; i < n; i++) { re += h[i] * Math.cos(w * i); im -= h[i] * Math.sin(w * i); }
      return [f, 20 * Math.log10(Math.sqrt(re * re + im * im))];
    });
  }
  var saw = function (f) { return function (i) { var p = (i * f / SR) % 1; return 0.3 * (2 * p - 1); }; };
  function acPitch(d, want) {
    var fmin = want / 1.25, fmax = want * 1.25, a = Math.round(0.3 * SR), lo = Math.floor(SR / fmax), hi = Math.ceil(SR / fmin);
    var n = d.length - a - hi - 2, r = {}, best = -1e9, bl = lo;
    for (var L = lo - 1; L <= hi + 1; L++) { var s = 0; for (var i = a; i < a + n; i += 2) s += d[i] * d[i + L]; r[L] = s; if (L >= lo && L <= hi && s > best) { best = s; bl = L; } }
    var y0 = r[bl - 1], y1 = r[bl], y2 = r[bl + 1], off = 0.5 * (y0 - y2) / (y0 - 2 * y1 + y2);
    return SR / (bl + off);
  }
  async function pitchOf(st, ct) {
    var want = 220 * Math.pow(2, (st + ct / 100) / 12);
    var d = await render([{ type: 'pitch', enabled: true, params: { semitones: st, cents: ct, mix: 1 } }], saw(220), Math.round(1.6 * SR));
    return acPitch(d, want);
  }

  // ---- drawing ----
  var ov = document.createElement('div');
  ov.style.cssText = 'position:fixed;inset:0;z-index:2147483647;background:#0f1117;color:#e9ecf3;font:14px -apple-system,system-ui,sans-serif;padding:16px 14px;box-sizing:border-box;overflow:hidden';
  document.body.appendChild(ov);
  function h(tag, css, text) { var e = document.createElement(tag); if (css) e.style.cssText = css; if (text != null) e.textContent = text; return e; }
  function title(t, sub) {
    ov.appendChild(h('div', 'font-weight:700;font-size:18px;letter-spacing:-.2px', t));
    ov.appendChild(h('div', 'color:#a8afbf;font-size:12.5px;line-height:1.4;margin:5px 0 8px', sub));
  }
  function head(t, isNew) { ov.appendChild(h('div', 'font-weight:650;font-size:14px;margin:12px 0 4px' + (isNew ? ';color:#4fd1a5' : ''), t)); }
  function note(t) { ov.appendChild(h('div', 'color:#8b93a5;font-size:11.5px;line-height:1.4;margin-top:10px', t)); }
  var NS = 'http://www.w3.org/2000/svg';
  function S(tag, attrs, parent) { var e = document.createElementNS(NS, tag); for (var k in attrs) e.setAttribute(k, attrs[k]); if (parent) parent.appendChild(e); return e; }
  function txt(parent, x, y, s, attrs) { var t = S('text', Object.assign({ x: x, y: y, fill: '#8b93a5', 'font-size': 10.5, 'font-family': '-apple-system,system-ui,sans-serif' }, attrs || {}), parent); t.textContent = s; return t; }
  /* o: { w, h, xLog, x0, x1, y0, y1, xt:[[v,label]], yt:[[v,label]], series:[{pts,color,w,dash,label,lx,ly}], bands:[[a,b,label]], words:[[v,label]] } */
  function chart(o) {
    var W = o.w || 362, H = o.h || 190, L = 34, R = 8, T = o.words ? 18 : 8, B = 20;
    var svg = S('svg', { width: W, height: H, viewBox: '0 0 ' + W + ' ' + H });
    svg.style.display = 'block';
    S('rect', { x: 0, y: 0, width: W, height: H, rx: 10, fill: '#161a22' }, svg);
    var X = function (v) { var t = o.xLog ? (Math.log(v) - Math.log(o.x0)) / (Math.log(o.x1) - Math.log(o.x0)) : (v - o.x0) / (o.x1 - o.x0); return L + t * (W - L - R); };
    var Y = function (v) { var t = o.yLog ? (Math.log(v) - Math.log(o.y0)) / (Math.log(o.y1) - Math.log(o.y0)) : (v - o.y0) / (o.y1 - o.y0); return H - B - t * (H - T - B); };
    (o.bands || []).forEach(function (b) { S('rect', { x: X(b[0]), y: T, width: X(b[1]) - X(b[0]), height: H - T - B, fill: b[3] || 'rgba(255,255,255,.05)' }, svg); if (b[2]) txt(svg, (X(b[0]) + X(b[1])) / 2, T + 12, b[2], { 'text-anchor': 'middle', fill: '#6f7788', 'font-size': 9.5 }); });
    (o.yt || []).forEach(function (t) { S('line', { x1: L, x2: W - R, y1: Y(t[0]), y2: Y(t[0]), stroke: 'rgba(255,255,255,.07)' }, svg); txt(svg, L - 4, Y(t[0]) + 3.5, t[1], { 'text-anchor': 'end' }); });
    (o.xt || []).forEach(function (t) { S('line', { x1: X(t[0]), x2: X(t[0]), y1: T, y2: H - B, stroke: 'rgba(255,255,255,.05)' }, svg); txt(svg, X(t[0]), H - 6, t[1], { 'text-anchor': 'middle' }); });
    (o.words || []).forEach(function (t) { txt(svg, X(t[0]), 12, t[1], { 'text-anchor': 'middle', fill: '#6f7788', 'font-size': 9.5 }); });
    (o.series || []).forEach(function (s) {
      var d = s.pts.map(function (p, i) { return (i ? 'L' : 'M') + X(p[0]).toFixed(1) + ' ' + Y(Math.max(o.y0, Math.min(o.y1, p[1]))).toFixed(1); }).join(' ');
      if (!s.dots) S('path', { d: d, fill: 'none', stroke: s.color, 'stroke-width': s.w || 2.2, 'stroke-dasharray': s.dash || '', 'stroke-linejoin': 'round', 'stroke-linecap': 'round' }, svg);
      if (s.dots) s.pts.forEach(function (p) { S('circle', { cx: X(p[0]), cy: Y(p[1]), r: s.r || 4.5, fill: s.color }, svg); if (p[2]) txt(svg, X(p[0]) + (p[3] || 0), Y(p[1]) + (p[4] || -9), p[2], { 'text-anchor': 'middle', fill: s.color, 'font-size': 10 }); });
      if (s.label) txt(svg, X(s.lx), Y(s.ly), s.label, { fill: s.color, 'font-size': 11, 'font-weight': 600, 'text-anchor': s.anchor || 'start' });
    });
    (o.marks || []).forEach(function (m) { S('line', { x1: X(m[0]), x2: X(m[0]), y1: T, y2: H - B, stroke: m[2] || '#e9ecf3', 'stroke-dasharray': '3 3', 'stroke-width': 1 }, svg); if (m[1]) txt(svg, X(m[0]) + (m[3] || 4), T + (m[4] || 24), m[1], { fill: m[2] || '#e9ecf3', 'font-size': 10, 'text-anchor': m[5] || 'start' }); });
    ov.appendChild(svg);
    return svg;
  }
  var FX = [[20, '20 Hz'], [50, '50'], [100, '100'], [200, '200'], [500, '500'], [1000, '1k'], [2000, '2k'], [5000, '5k'], [10000, '10k'], [20000, '20k']];
  var WORDS = [[35, 'rumble'], [110, 'bass'], [700, 'voice'], [4000, 'bite'], [13000, 'air']];
  var DBT = [[0, '0'], [6, '+6'], [12, '+12']];
  function eqChart(series, marks) {
    return chart({ w: 362, h: 176, xLog: true, x0: 20, x1: 20000, y0: -1.5, y1: 13.5, xt: FX, yt: DBT, words: WORDS, series: series, marks: marks });
  }
  var C = ['#4fd1a5', '#f2b04a', '#6aa8ff'];
  var GREY = '#aeb5c4';
  var dbNote = 'The line is how much louder each pitch comes out (dB: +6 is a clear lift, +12 a big one), measured by sending a click through the app’s own audio chain — the one both the preview and the export use. The default is today’s sound exactly: nothing changes on a saved project until you move the new control.';

  async function eqSheet(o) {
    title(o.title, o.sub);
    head(o.todayHead);
    var today = await response(o.fx(o.def));
    eqChart([{ pts: today, color: GREY, label: o.todayLabel, lx: o.todayAt[0], ly: o.todayAt[1] }], [[o.def, o.markLabel(o.def), GREY, o.mx || 4, 24, (o.mx || 4) < 0 ? 'end' : 'start']]);
    head(o.newHead, true);
    var ser = [], marks = [];
    for (var i = 0; i < o.vals.length; i++) {
      var r = await response(o.fx(o.vals[i]));
      ser.push({ pts: r, color: C[i], label: o.labels[i], lx: o.legend[0], ly: o.legend[1] - i * 1.9, anchor: o.legend[2] || 'start' });   // a legend in the chart's empty corner
      if (o.markNew !== false) marks.push([o.vals[i], '', C[i]]);
    }
    eqChart(ser, marks);
    note(o.note || dbNote);
  }

  var out = {};
  if (SHEET === 'basstreble-bassat') {
    await eqSheet({
      title: 'Bass & Treble · Bass at', sub: 'Bass lifts everything below one pitch. Today that pitch is always 200 Hz. Bass at moves it: down for a deep sub boost that leaves the voice alone, up for a warmer, fuller sound.',
      fx: function (v) { return [{ type: 'bassTreble', enabled: true, params: { bass: 12, treble: 0, bassFreq: v } }]; },
      def: 200, todayHead: 'Today — Bass +12, always from 200 Hz down', todayLabel: 'Bass +12', todayAt: [700, 7.5],
      markLabel: function () { return 'starts at 200 Hz'; }, mx: 5,
      vals: [60, 200, 500], newHead: 'New — the same Bass +12, Bass at 60 / 200 / 500 Hz',
      labels: ['at 60 Hz: sub only', 'at 200 (today)', 'at 500 Hz: warmer'], legend: [1300, 11.2],
    });
  } else if (SHEET === 'basstreble-trebleat') {
    await eqSheet({
      title: 'Bass & Treble · Treble at', sub: 'Treble lifts everything above one pitch. Today that is always 3000 Hz. Treble at moves it: low to brighten a whole voice, high to add only sparkle and air.',
      fx: function (v) { return [{ type: 'bassTreble', enabled: true, params: { bass: 0, treble: 12, trebleFreq: v } }]; },
      def: 3000, todayHead: 'Today — Treble +12, always from 3000 Hz up', todayLabel: 'Treble +12', todayAt: [60, 10],
      markLabel: function () { return 'starts at 3000 Hz'; }, mx: -4,
      vals: [1000, 3000, 10000], newHead: 'New — the same Treble +12, Treble at 1000 / 3000 / 10000 Hz',
      labels: ['at 1000 Hz: brighter voice', 'at 3000 (today)', 'at 10000: air only'], legend: [24, 11.2],
    });
  } else if (SHEET === 'eq3-lowat') {
    await eqSheet({
      title: '3-Band EQ · Low at', sub: 'Low lifts or cuts everything below one pitch. Today that is always 250 Hz. Low at moves it: down to touch only the deepest rumble, up to reach into the body of a voice.',
      fx: function (v) { return [{ type: 'eq3', enabled: true, params: { low: 12, mid: 0, high: 0, midFreq: 1000, lowFreq: v } }]; },
      def: 250, todayHead: 'Today — Low +12, always from 250 Hz down', todayLabel: 'Low +12', todayAt: [900, 7.5],
      markLabel: function () { return 'starts at 250 Hz'; }, mx: 5,
      vals: [60, 250, 800], newHead: 'New — the same Low +12, Low at 60 / 250 / 800 Hz',
      labels: ['at 60 Hz', 'at 250 (today)', 'at 800 Hz'], legend: [2200, 11.2],
    });
  } else if (SHEET === 'eq3-highat') {
    await eqSheet({
      title: '3-Band EQ · High at', sub: 'High lifts or cuts everything above one pitch. Today that is always 4000 Hz. High at moves it: down to reach the whole top of a voice, up to touch only hiss and air.',
      fx: function (v) { return [{ type: 'eq3', enabled: true, params: { low: 0, mid: 0, high: 12, midFreq: 1000, highFreq: v } }]; },
      def: 4000, todayHead: 'Today — High +12, always from 4000 Hz up', todayLabel: 'High +12', todayAt: [60, 10],
      markLabel: function () { return 'starts at 4000 Hz'; }, mx: -4,
      vals: [1500, 4000, 12000], newHead: 'New — the same High +12, High at 1500 / 4000 / 12000 Hz',
      labels: ['at 1500 Hz', 'at 4000 (today)', 'at 12000 Hz'], legend: [24, 11.2],
    });
  } else if (SHEET === 'eq3-midwidth') {
    await eqSheet({
      title: '3-Band EQ · Mid width', sub: 'Mid lifts or cuts a band around Mid Freq. Today the band is always the same width. Mid width sets how wide: narrow to pick out one ringing note, wide for a gentle lift of the whole middle.',
      fx: function (v) { return [{ type: 'eq3', enabled: true, params: { low: 0, mid: 12, high: 0, midFreq: 1000, midWidth: v } }]; },
      def: 1, todayHead: 'Today — Mid +12 at 1000 Hz, one width', todayLabel: 'Mid +12', todayAt: [1300, 12.2],
      markLabel: function () { return ''; },
      vals: [0.3, 1, 4], newHead: 'New — the same Mid +12, Mid width 0.3 / 1 / 4', markNew: false,
      labels: ['0.3: narrow', '1 (today)', '4: wide'], legend: [24, 11.6],
      note: 'Bigger Mid width = a wider band (the dragging direction and the word agree). The line is how much louder each pitch comes out (dB: +6 is a clear lift, +12 a big one), measured by sending a click through the app’s own audio chain — the one both the preview and the export use. Width 1 is today’s band exactly.',
    });
  } else if (SHEET === 'pitch-finetune') {
    title('Pitch Shift · Fine tune', 'Semitones moves a sound in whole musical steps. Fine tune moves it in between — 100 cents is one step — so a voice can go a touch higher, or a clip can be nudged into tune with a song.');
    var steps = [];
    for (var s = -1; s <= 2; s++) steps.push([s * 100, await pitchOf(s, 0)]);
    var fine = [];
    for (var c = -100; c <= 200; c += 25) fine.push([c, await pitchOf(Math.floor(c / 100), c - 100 * Math.floor(c / 100))]);
    out.steps = steps; out.fine = fine;
    var yl = [[207.65, 'G#'], [220, 'A'], [233.08, 'A#'], [246.94, 'B']];
    var ax = { w: 362, h: 180, xLog: false, x0: -120, x1: 220, y0: 202, y1: 252, yLog: true, xt: [[-100, '−1 step'], [0, '0'], [100, '+1 step'], [200, '+2 steps']], yt: yl.map(function (p) { return [p[0], p[1]]; }) };
    head('Today — a whole step or nothing');
    chart(Object.assign({}, ax, { series: [{ dots: true, pts: steps.map(function (p) { return [p[0], p[1], p[1].toFixed(1) + ' Hz', 0, p[0] === 200 ? 16 : -9]; }), color: GREY }] }));
    head('New — Fine tune lands in between (every 25 cents)', true);
    chart(Object.assign({}, ax, { series: [{ pts: fine, color: 'rgba(79,209,165,.35)', w: 1.5 }, { dots: true, r: 3.6, pts: fine.map(function (p) { return [p[0], p[1], (p[0] % 100 === 50) ? p[1].toFixed(1) + ' Hz' : '', 0, 14]; }), color: '#4fd1a5' }] }));
    note('Each dot is the pitch a buzzy, voice-like 220 Hz tone comes out at, measured after the app’s own Pitch Shift. Fine tune adds to Semitones, and it can be keyframed: it glides smoothly, as Semitones does. Fine tune 0 is today’s sound exactly.');
  } else if (SHEET === 'pitch-semitones') {
    title('Pitch Shift · Semitones to ±24', 'Semitones used to stop at 12 steps (one octave) either way. It now reaches 24 (two octaves): a voice can drop to a deep monster growl or rise to a tiny squeak.');
    var pts = [];
    for (var st = -24; st <= 24; st += 3) pts.push([st, await pitchOf(st, 0)]);
    out.pts = pts;
    var axs = { w: 362, h: 230, xLog: false, x0: -26, x1: 26, y0: 45, y1: 1000, yLog: true, xt: [[-24, '−24'], [-12, '−12'], [0, '0'], [12, '+12'], [24, '+24']], yt: [[55, '55'], [110, '110'], [220, '220'], [440, '440'], [880, '880']] };
    head('Today — the slider stopped at ±12 (up = pitch in Hz)');
    chart(Object.assign({}, axs, { bands: [[-12, 12, 'the old slider', 'rgba(255,255,255,.06)']], series: [{ pts: pts.filter(function (p) { return Math.abs(p[0]) <= 12; }), color: GREY, dots: true, r: 3.6 }], marks: [[-12, 'stopped', GREY, -4, 40, 'end'], [12, 'stopped', GREY, 4, 40]] }));
    head('New — two octaves each way', true);
    chart(Object.assign({}, axs, { bands: [[-12, 12, '', 'rgba(255,255,255,.04)']], series: [{ pts: pts, color: '#4fd1a5', dots: true, r: 3.6 }, { dots: true, pts: [[-24, pts[0][1], pts[0][1].toFixed(0) + ' Hz', 20, 4], [24, pts[pts.length - 1][1], pts[pts.length - 1][1].toFixed(0) + ' Hz', -26, 4]], color: '#4fd1a5', r: 0.1 }] }));
    note('Each dot is the pitch a buzzy, voice-like 220 Hz tone comes out at after the app’s own Pitch Shift — left is the slider, up is the pitch you hear. The tone doubles every 12 steps. Everything the old slider reached sounds exactly as it did.');
  } else if (SHEET === 'pitch-late') {
    title('Pitch Shift · the “lands late” line', 'Pitch Shift works by reading the sound from a short, sliding delay, so the shifted sound always arrives a little after the original. The open effect now says so, in one line under the sliders.');
    var lags = [];
    for (var sv of [1, 7, 12, 24]) {
      var cl = await render([{ type: 'pitch', enabled: true, params: { semitones: sv, mix: 1 } }], function (i) { return i === Math.round(0.5 * SR) ? 1 : 0; }, Math.round(1.2 * SR));
      var m = 0, w = 0; for (var i2 = 0; i2 < cl.length; i2++) { var e2 = cl[i2] * cl[i2]; m += e2 * i2; w += e2; }
      lags.push([sv, (m / w / SR - 0.5) * 1000]);
    }
    out.lags = lags;
    head('How late the shifted sound lands');
    var bw = 362, bh = 150, svg = S('svg', { width: bw, height: bh, viewBox: '0 0 ' + bw + ' ' + bh }); svg.style.display = 'block';
    S('rect', { x: 0, y: 0, width: bw, height: bh, rx: 10, fill: '#161a22' }, svg);
    lags.forEach(function (p, i) {
      var y = 14 + i * 33, len = (p[1] / 160) * (bw - 170);
      txt(svg, 12, y + 15, '+' + p[0] + ' steps', { fill: '#e9ecf3', 'font-size': 11.5 });
      if (p[0] >= 12) txt(svg, 12, y + 27, p[0] === 12 ? 'one octave' : 'two octaves', { fill: '#8b93a5', 'font-size': 9.5 });
      S('rect', { x: 92, y: y + 4, width: Math.max(2, len), height: 15, rx: 4, fill: p[0] === 12 ? '#4fd1a5' : '#5d6678' }, svg);
      txt(svg, 98 + Math.max(2, len), y + 15.5, Math.round(p[1]) + ' ms' + (p[0] === 12 ? '  ≈ 1/20 s' : ''), { fill: '#e9ecf3', 'font-size': 11.5 });
    });
    ov.appendChild(svg);
    head('Why Mix below 100% sounds like an echo', true);
    // a hand clap: 25 ms of decaying noise at 0.10 s, then through +12 at Mix 100% and 50%
    var seed = 7, rnd = function () { seed = (seed * 1103515245 + 12345) >>> 0; return seed / 4294967296 * 2 - 1; };
    var clap = new Float32Array(Math.round(0.4 * SR)); for (var j = 0; j < 0.025 * SR; j++) clap[Math.round(0.1 * SR) + j] = rnd() * Math.exp(-j / (0.006 * SR)) * 0.9;
    var sig = function (i) { return clap[i] || 0; };
    var rows = [['a clap', null], ['Mix 100%: the clap arrives late, smeared a little', 1], ['Mix 50%: the clap on time, then the late copy = echo', 0.5]];
    var ws = S('svg', { width: 362, height: 164, viewBox: '0 0 362 164' }); ws.style.display = 'block';
    S('rect', { x: 0, y: 0, width: 362, height: 164, rx: 10, fill: '#161a22' }, ws);
    for (var ri = 0; ri < rows.length; ri++) {
      var dd = rows[ri][1] == null ? clap : await render([{ type: 'pitch', enabled: true, params: { semitones: 12, mix: rows[ri][1] } }], sig, clap.length);
      var y0 = 14 + ri * 48, mid = y0 + 22;
      txt(ws, 12, y0 + 6, rows[ri][0], { fill: ri ? (ri === 2 ? '#f2b04a' : '#4fd1a5') : '#e9ecf3', 'font-size': 11 });
      var pth = '';
      for (var px = 0; px < 338; px++) {
        var a0 = Math.round((0.05 + px / 338 * 0.25) * SR), a1 = Math.round((0.05 + (px + 1) / 338 * 0.25) * SR), pk = 0;
        for (var q = a0; q < a1; q++) pk = Math.max(pk, Math.abs(dd[q] || 0));
        pth += 'M' + (12 + px) + ' ' + (mid - pk * 16).toFixed(1) + 'V' + (mid + pk * 16).toFixed(1);
      }
      S('path', { d: pth, stroke: ri ? (ri === 2 ? '#f2b04a' : '#4fd1a5') : '#aeb5c4', 'stroke-width': 1 }, ws);
    }
    [0.1, 0.15, 0.2, 0.25].forEach(function (t) { var x = 12 + (t - 0.05) / 0.25 * 338; S('line', { x1: x, x2: x, y1: 10, y2: 150, stroke: 'rgba(255,255,255,.08)' }, ws); txt(ws, x, 160, (t * 1000 - 100) + ' ms', { 'text-anchor': 'middle', 'font-size': 9.5 }); });
    ov.appendChild(ws);
    head('The line under the sliders');
    ov.appendChild(h('div', 'background:#161a22;border-radius:10px;padding:10px 12px;color:#a8afbf;font-size:12.5px;line-height:1.4', FM.audioFxRegistry.get('pitch').hint));
    note('Measured through the app’s own Pitch Shift: where a click’s sound lands on average, and a clap through +12 steps. The shifter reads the sound in short overlapping pieces, so a sharp hit comes out spread over about a tenth of a second. The lag grows with the shift, which is why the line gives the octave figure. The sound itself did not change; this line explains it.');
  }
  await new Promise(function (r) { setTimeout(r, 50); });
  var last = ov.lastElementChild, bottom = last ? last.getBoundingClientRect().bottom + 16 : 800;
  out.contentBottom = Math.ceil(bottom);
  return out;
})();
