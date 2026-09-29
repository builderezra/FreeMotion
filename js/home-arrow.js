/* home-arrow.js — the drawn arrow from the empty Projects screen to the + (queue 936).
 *
 * Ezra, 26 Sep: *"actually make it say lets see what you're made of. and have drawn arrow thats stylish and points towards to
 * plus button"*; of three drawn options he picked A — *"Question 1 - A"* — "the doodle swoop": one tapered marker stroke leaves
 * the title, swings out to the right with one small curl, and comes back in to point at the + (#hm-new), coloured with the
 * +'s own cyan -> mint -> violet (deeper inks on the light Home, a soft glow on the dark one). It draws itself on in about a
 * second (static under reduced motion), redraws without replaying on resize or a look change, and draws nothing when there is
 * no room for the swoop or the + is hidden. Built only with createElementNS — nothing here is HTML.
 * home.js calls draw() when the Projects tab renders EMPTY, and clear() at the top of every render (queue 957: which also
 * voids a draw still waiting for the + to finish rising in). */
window.FM = window.FM || {};
(function (FM) {
  'use strict';
  /* queue 957 — AIM AT WHERE THE + STANDS, NOT WHERE IT IS MID-ENTRANCE. Ezra, 26 Sep, on his phone at v17.02: *"The hour
     [arrow] is inside of the plus button"*. The tip is aimed from the +'s getBoundingClientRect(), and on the first open this
     ran ~280 ms into Home's intro — while the + was still held in its own entrance (hm-rise-fab, delay 0.545 s: opacity 0,
     translateY(18px) scale(.86)). Measured on a real first launch at 440x956: the + read 49.9 px wide with its centre 18 px
     low, so the tip landed 25.3 px from the centre of a 29 px-radius + — inside it; aimed at rest it is 41.0 (29 + 12).
     So while the + has a FINITE animation running (its entrance, or any transition) this waits for it and draws then. Its
     hue drift is infinite and is not waited for. `gen` voids a wait that Home has re-rendered past — render() calls clear()
     first — so a tab change can never receive a late arrow.
     ⚠️ AND A TIMER AS WELL AS `finished`, for the reason arrowSoon() keeps one: a page the browser is not painting (hidden,
     or an off-screen frame) need not advance its animations. Measured: waiting on `finished` alone, the suite's off-screen
     fresh-boot #936 instance never drew its arrow at all. The timer fires when the entrance should have ended; the second
     pass (`landed`) draws without waiting again. */
  var gen = 0;
  /* queue 989 — A RE-RENDER CARRIES THE DRAW ON, IT NEVER STARTS IT AGAIN. Ezra, 29 Sep: *"The drawn arrow is currently a
     bit buggy and broken when you refresh the page it draws from the middle and start at the same time"*. MEASURED with a
     real reload at 390 (a reload inside the session, so no intro): the arrow starts at ~200 ms, and ~450 ms later Home's
     thumbnail grab (home.js captureThumbSoon → grab → render) re-renders the grid; render() cleared the half-drawn arrow —
     it had reached the curl in the MIDDLE — and drew a new one from the start. Every open of Home that is not hidden behind
     the intro does the same (coming back from a project, deleting the last one), and a grab after the draw had finished
     replayed it from nothing.
     So each arrow carries its own clock (`_fm989`: its draw animations), and a redraw over an arrow that is still there
     starts where that one had got to — mid-draw it carries on, finished it is drawn finished. Two pieces make "still
     there" true across a re-render: clear({ soft: true }) (render() on a Home that is on screen) leaves the arrow up until
     the end of the current task, and hold() (arrowSoon(), in the same render, when the tab is still empty) keeps it until
     the redraw replaces it. A render that does NOT come back to the empty tab never calls hold(), so the arrow still goes
     the moment a project exists; and an open() renders while Home is still hidden, which clears hard — so the draw-on is
     still seen every time Home is opened. */
  var DRAW_END = 1270;                                              // the last flick ends at 1080 + 190 ms (times[] below)
  var dropping = null;
  /* ⚠️ THE ARROW'S CLOCK IS ITS LATEST STROKE, NOT ITS FIRST (989 review). Each stroke's animation stops at its OWN end —
     the main stroke's at 1000 ms — so reading anims[0] said a finished arrow was 1000 ms in, never DRAW_END, and every
     redraw (a resize frame, a look change, a tap on Projects, a late thumbnail grab) drew both barbs of the head again;
     measured, a 1 s window drag at 1280 left 59 of 112 frames with part of the head missing. So: every stroke finished
     is drawn in full, and otherwise the clock is the furthest any stroke has got (the last flick runs to 1270 ms). */
  function progressOf(svg) {                                        // ms into its draw; Infinity once it is drawn in full
    var rec = svg && svg._fm989;
    if (!rec) return null;
    if (!rec.anims || !rec.anims.length) return Infinity;
    if (rec.anims.every(function (an) { return an.playState === 'finished'; })) return Infinity;
    var t = 0;
    rec.anims.forEach(function (an) { var c = an.currentTime; if (typeof c === 'number' && isFinite(c) && c > t) t = c; });
    return t;
  }
  function settling(el) {
    if (!el.getAnimations) return [];
    return el.getAnimations().filter(function (an) {
      var ct = an.effect && an.effect.getComputedTiming ? an.effect.getComputedTiming() : null;
      return !!ct && isFinite(ct.endTime) && an.playState !== 'finished' && an.playState !== 'idle';
    });
  }
  function draw(opts) {
    var NS = 'http://www.w3.org/2000/svg', ID = 'hm-arrow936';
    var old = document.getElementById(ID);
    var home = document.getElementById('home-screen'), plus = document.getElementById('hm-new');
    var title = document.querySelector('#home-screen .hm-grid .hm-empty-title');
    var drop = function () {
      if (!old) return;
      if (old._fm989 && old._fm989.anims) old._fm989.anims.forEach(function (an) { try { an.cancel(); } catch (e) {} });
      old.remove(); if (dropping === old) dropping = null;
    };
    if (!home || !plus || !title) { drop(); return null; }
    var moving = opts && opts.landed ? [] : settling(plus);
    if (moving.length) {
      // queue 989: an arrow already up stays up (and keeps drawing) until the landed draw replaces it and takes over its clock
      if (dropping === old) dropping = null;
      var mine = ++gen, left = 0;
      moving.forEach(function (an) { left = Math.max(left, an.effect.getComputedTiming().endTime - (an.currentTime || 0)); });
      var go = function () { if (mine !== gen) return; gen++; draw({ still: !!(opts && opts.still), landed: true }); };
      Promise.all(moving.map(function (an) { return an.finished.catch(function () {}); })).then(go);
      setTimeout(go, Math.min(3000, left + 150));
      return null;
    }
    var t = title.getBoundingClientRect(), p = plus.getBoundingClientRect();
    if (!t.width || !p.width || getComputedStyle(plus).visibility === 'hidden') { drop(); return null; }
    var light = document.documentElement.getAttribute('data-home') === 'light';
    var still = (opts && opts.still) || matchMedia('(prefers-reduced-motion: reduce)').matches;
    var vw = document.documentElement.clientWidth, pr = p.width / 2, pcx = p.left + pr, pcy = p.top + pr;
    var S = [t.left + t.width / 2 + Math.min(34, t.width * 0.13), t.bottom + 12];
    var H = p.top - 12 - S[1]; if (H < 110) { drop(); return null; }  // no room for a swoop: draw nothing
    var k = Math.max(0.75, Math.min(1.2, H / 250));
    var a = -52 * Math.PI / 180, u = [Math.cos(a), Math.sin(a)];      // from the +'s centre out to the tip (up-right)
    var E = [pcx + u[0] * (pr + 12), pcy + u[1] * (pr + 12)];
    var rho = 15 * k, M = [Math.min(vw - 32 - 1.7 * rho, S[0] + H * 0.4), S[1] + H * 0.42];   // the widest point of the swing
    function swoop() {                                               // two soft cubics S->M->E, plus ONE curl at the widest point
      var dx1 = M[0] - S[0], dy1 = M[1] - S[1], c2 = Math.hypot(E[0] - M[0], E[1] - M[1]);
      var segs = [[S, [S[0] + dx1 * 0.6, S[1] + dy1 * 0.1], [M[0], M[1] - dy1 * 0.55], M],
                  [M, [M[0], M[1] + c2 * 0.4], [E[0] + u[0] * c2 * 0.45, E[1] + u[1] * c2 * 0.45], E]];
      var bez = function (q) { var C = segs[q < 0.5 ? 0 : 1]; q = q < 0.5 ? q * 2 : q * 2 - 1; var m = 1 - q;
        return [0, 1].map(function (i) {
        return m * m * m * C[0][i] + 3 * m * m * q * C[1][i] + 3 * m * q * q * C[2][i] + q * q * q * C[3][i]; }); };
      var tab = [], L = 0, prev = bez(0), out = [];
      for (var i = 0; i <= 400; i++) { var b = bez(i / 400); L += Math.hypot(b[0] - prev[0], b[1] - prev[1]); tab.push([L, b]); prev = b; }
      var j = 1, s0 = L * 0.5, span = 40 * k;
      for (var s = 0; s <= L; s += 1.5) {
        while (j < tab.length - 1 && tab[j][0] < s) j++;
        var A = tab[j - 1], B = tab[j], fr = (s - A[0]) / ((B[0] - A[0]) || 1), dx = B[1][0] - A[1][0], dy = B[1][1] - A[1][1];
        var dl = Math.hypot(dx, dy) || 1, T = [dx / dl, dy / dl], N = [T[1], -T[0]];
        var q = (s - (s0 - span / 2)) / span, ph = q <= 0 || q >= 1 ? 0 : 2 * Math.PI * q * q * (3 - 2 * q);
        var sx = 1.25 * rho * Math.sin(ph), sy = 0.8 * rho * (1 - Math.cos(ph));
        out.push([A[1][0] + dx * fr + T[0] * sx + N[0] * sy, A[1][1] + dy * fr + T[1] * sx + N[1] * sy]);
      }
      out.push(E); return out;
    }
    var pts = swoop();
    function ss(e0, e1, x) { x = Math.max(0, Math.min(1, (x - e0) / (e1 - e0))); return x * x * (3 - 2 * x); }
    function f(v) { return v[0].toFixed(1) + ' ' + v[1].toFixed(1); }
    function ribbon(P, wf) {                                         // a filled outline, so the line can taper like a marker
      var A = [], B = [], n = P.length;
      for (var i = 0; i < n; i++) {
        var a = P[Math.max(0, i - 1)], b = P[Math.min(n - 1, i + 1)], dx = b[0] - a[0], dy = b[1] - a[1];
        var l = Math.hypot(dx, dy) || 1, h = wf(i / (n - 1)) / 2;
        A.push([P[i][0] - dy / l * h, P[i][1] + dx / l * h]); B.push([P[i][0] + dy / l * h, P[i][1] - dx / l * h]);
      }
      var r1 = (wf(1) / 2).toFixed(2), r0 = (wf(0) / 2).toFixed(2);
      return 'M' + A.map(f).join('L') + 'A' + r1 + ' ' + r1 + ' 0 0 0 ' + f(B[n - 1]) + 'L' + B.reverse().map(f).join('L') +
             'A' + r0 + ' ' + r0 + ' 0 0 0 ' + f(A[0]) + 'Z';
    }
    function el(tag, attrs, parent) { var e = document.createElementNS(NS, tag);
      for (var key in attrs) e.setAttribute(key, attrs[key]); if (parent) parent.appendChild(e); return e; }
    var svg = el('svg', { id: ID, 'aria-hidden': 'true', width: vw, height: innerHeight });
    svg.style.cssText = 'position:fixed;left:0;top:0;pointer-events:none;overflow:visible;z-index:auto;' +
      (light ? '' : 'filter:drop-shadow(0 0 5px rgba(150,125,255,.45));');
    var defs = el('defs', {}, svg);
    var g = el('linearGradient', { id: ID + '-g', gradientUnits: 'userSpaceOnUse', x1: S[0], y1: S[1], x2: E[0], y2: E[1] }, defs);
    (light ? ['#1590D4', '#0E9C7E', '#8A3BE6'] : ['#7FD4FF', '#6BF0C8', '#C86BFF']).forEach(function (c, i) {
      el('stop', { offset: [0, 0.5, 1][i], 'stop-color': c }, g); });
    var mask = el('mask', { id: ID + '-m', maskUnits: 'userSpaceOnUse', x: 0, y: 0, width: vw, height: innerHeight }, defs);
    var ink = el('g', { fill: 'url(#' + ID + '-g)', mask: 'url(#' + ID + '-m)' }, svg);
    var wMain = function (x) { return (1 + 3.6 * ss(0, 0.16, x)) * (1 - 0.22 * ss(0.72, 1, x)) * Math.min(1.15, k); };
    var d = [(E[0] - pts[pts.length - 6][0]), (E[1] - pts[pts.length - 6][1])], dl2 = Math.hypot(d[0], d[1]);
    var back = Math.atan2(-d[1] / dl2, -d[0] / dl2), strokes = [[pts, wMain]];
    [[0.52, 19], [-0.46, 16]].forEach(function (bb) {              // the two flicks of an open, hand-drawn head
      var th = back + bb[0], len = bb[1] * Math.min(1.15, k), end = [E[0] + Math.cos(th) * len, E[1] + Math.sin(th) * len];
      var bow = [(E[0] + end[0]) / 2 - Math.sin(th) * 1.6, (E[1] + end[1]) / 2 + Math.cos(th) * 1.6], Q = [];
      for (var i = 0; i <= 12; i++) { var q = i / 12, m = 1 - q;
        Q.push([m * m * E[0] + 2 * m * q * bow[0] + q * q * end[0], m * m * E[1] + 2 * m * q * bow[1] + q * q * end[1]]); }
      strokes.push([Q, function (x) { return (3.3 - 2.1 * x) * Math.min(1.15, k); }]);
    });
    var times = [[0, 1000], [960, 190], [1080, 190]];
    /* queue 989: the arrow already up hands on its clock — mid-draw this one carries on from there, drawn in full it is
       drawn in full (a still arrow). Read BEFORE the old one goes: cancelling its animations resets their time. */
    var from = old ? progressOf(old) : null;
    drop();
    if (from != null && from >= DRAW_END) still = true;
    var anims = [];
    strokes.forEach(function (st, i) {
      el('path', { d: ribbon(st[0], st[1]) }, ink);
      var len = 0; for (var j = 1; j < st[0].length; j++) len += Math.hypot(st[0][j][0] - st[0][j - 1][0], st[0][j][1] - st[0][j - 1][1]);
      var mp = el('path', { d: 'M' + st[0].map(f).join('L'), fill: 'none', stroke: '#fff', 'stroke-width': 9,
        'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, mask);
      if (still || !mp.animate) return;
      mp.style.strokeDasharray = (len + 2) + ' ' + (len + 2);
      var an = mp.animate([{ strokeDashoffset: len + 2 }, { strokeDashoffset: 0 }], { duration: times[i][1], delay: times[i][0],
        easing: i ? 'ease-out' : 'cubic-bezier(.5,.05,.3,1)', fill: 'both' });
      if (from) an.currentTime = from;
      anims.push(an);
    });
    svg._fm989 = { anims: anims };
    home.insertBefore(svg, plus.parentNode === home ? plus : null);
    if (!window.__hmArrow936On) {                                    // one set of listeners, however often this is called
      window.__hmArrow936On = 1; var raf = 0;
      // a resize or a look change redraws over the arrow that is up, so it carries on from where that one was (queue 989)
      // rather than jumping to finished — and one drawn in full is redrawn in full, as it always was
      var again = function () { cancelAnimationFrame(raf); raf = requestAnimationFrame(function () {
        if (document.getElementById(ID)) draw(); }); };
      addEventListener('resize', again);
      new MutationObserver(again).observe(document.documentElement, { attributes: true, attributeFilter: ['data-home'] });
    }
    return svg;
  }

  /* queue 957: clear() also voids a draw still waiting for the + to land. queue 989: { soft: true } is render() on a Home
     that is on screen — the arrow stays up to the end of this task, and hold() (arrowSoon, in the same render) keeps it
     until the redraw takes over its clock; nothing holds it, and it goes, exactly as a hard clear. */
  function remove(o) {
    if (!o) return;
    if (o._fm989 && o._fm989.anims) o._fm989.anims.forEach(function (an) { try { an.cancel(); } catch (e) {} });
    o.remove();
  }
  function clear(opts) {
    gen++;
    var o = document.getElementById('hm-arrow936');
    if (!o) { dropping = null; return; }
    if (!(opts && opts.soft)) { dropping = null; remove(o); return; }
    dropping = o;
    Promise.resolve().then(function () { if (dropping === o) { dropping = null; remove(o); } });
  }
  function hold() { dropping = null; }
  FM.homeArrow = { draw: draw, clear: clear, hold: hold, progress: function () { return progressOf(document.getElementById('hm-arrow936')); } };
})(window.FM);
