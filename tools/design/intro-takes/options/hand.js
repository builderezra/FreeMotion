// Hand-drawn lane: a pencil test, a flipbook, a marker signature. Every frame comes from t alone.
(function () {
  'use strict';
  const TAU = Math.PI * 2;
  const cache = {};                                             // textures are read-only, so strip views can share them
  FMI.dropCaches.push(() => { for (const key in cache) delete cache[key]; });   // the player empties every canvas between takes
  function H(i, s) {
    let x = Math.imul((i | 0) + 0x9e3779b9, 0x85ebca6b) ^ Math.imul(s | 0, 0xc2b2ae35);
    x = Math.imul(x ^ (x >>> 13), 0x5bd1e995);
    return ((x ^ (x >>> 15)) >>> 0) / 4294967296;
  }
  function N1(x, s) {                                           // smooth noise, -1 to 1
    const i = Math.floor(x), f = x - i, u = f * f * (3 - 2 * f);
    return (H(i, s) * (1 - u) + H(i + 1, s) * u) * 2 - 1;
  }
  const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
  // A smooth line through the points (centripetal Catmull-Rom), sampled every `step` pixels.
  function spline(P, step) {
    step = step || 3;
    if (P.length < 2) return P.slice();
    if (P.length === 2) return seg(P[0], P[1], step);
    const out = [];
    const lp = (a, b, ta, tb, t) => {
      const u = (t - ta) / (tb - ta || 1e-6);
      return [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u];
    };
    const dd = (a, b) => Math.pow(dist(a, b) || 1e-3, 0.5);
    for (let i = 0; i < P.length - 1; i++) {
      const p1 = P[i], p2 = P[i + 1];
      const p0 = P[i - 1] || [2 * p1[0] - p2[0], 2 * p1[1] - p2[1]];
      const p3 = P[i + 2] || [2 * p2[0] - p1[0], 2 * p2[1] - p1[1]];
      const t0 = 0, t1 = t0 + dd(p0, p1), t2 = t1 + dd(p1, p2), t3 = t2 + dd(p2, p3);
      const n = Math.max(2, Math.ceil(dist(p1, p2) / step));
      for (let j = 0; j < n; j++) {
        const t = t1 + ((t2 - t1) * j) / n;
        const A1 = lp(p0, p1, t0, t1, t), A2 = lp(p1, p2, t1, t2, t), A3 = lp(p2, p3, t2, t3, t);
        const B1 = lp(A1, A2, t0, t2, t), B2 = lp(A2, A3, t1, t3, t);
        out.push(lp(B1, B2, t1, t2, t));
      }
    }
    out.push(P[P.length - 1].slice());
    return out;
  }
  function seg(a, b, step) {
    const n = Math.max(1, Math.ceil(dist(a, b) / (step || 6))), out = [];
    for (let i = 0; i <= n; i++) out.push([a[0] + ((b[0] - a[0]) * i) / n, a[1] + ((b[1] - a[1]) * i) / n]);
    return out;
  }
  function wob(pts, seed, amp, wl) {                            // the hand: every drawing wanders a little differently
    wl = wl || 34;
    const out = new Array(pts.length);
    let arc = 0;
    for (let i = 0; i < pts.length; i++) {
      if (i) arc += dist(pts[i], pts[i - 1]);
      out[i] = [pts[i][0] + amp * N1(arc / wl, seed), pts[i][1] + amp * N1(arc / wl, seed + 37)];
    }
    return out;
  }
  function pressLine(g, pts, lw, col, alpha, seed, flat) {      // a pencil line: pressure changes and it tapers at the ends
    const n = pts.length;
    if (n < 2) return;
    g.strokeStyle = col; g.lineCap = 'round'; g.lineJoin = 'round';
    const run = Math.max(2, Math.min(9, Math.ceil(n / 5)));
    for (let i = 0; i < n - 1; i += run) {
      const end = Math.min(n - 1, i + run), u = (i + end) / 2 / (n - 1);
      const tp = flat ? 1 : Math.min(1, u * 6 + 0.25, (1 - u) * 6 + 0.25);
      const pr = 0.72 + 0.28 * N1(i * 0.13, seed);
      g.globalAlpha = alpha * tp * (0.75 + 0.25 * pr);
      g.lineWidth = lw * (0.75 + 0.35 * pr) * (0.6 + 0.4 * tp);
      g.beginPath(); g.moveTo(pts[i][0], pts[i][1]);
      for (let j = i + 1; j <= end; j++) g.lineTo(pts[j][0], pts[j][1]);
      g.stroke();
    }
    g.globalAlpha = 1;
  }
  function toothTile(kit, seed) {                               // the tooth of the paper: pencil skips over its pits
    const key = 'tooth' + kit.dpr + seed;
    if (cache[key]) return cache[key];
    const size = 256, cell = Math.max(2, Math.round(1.25 * kit.dpr));
    const c = document.createElement('canvas'); c.width = c.height = size;
    const x = c.getContext('2d'), im = x.createImageData(size, size), r = kit.rng(seed);
    const gw = Math.ceil(size / cell), grid = new Float32Array(gw * gw);
    for (let i = 0; i < grid.length; i++) grid[i] = r();
    for (let py = 0; py < size; py++) for (let px = 0; px < size; px++) {
      const fx = px / cell, fy = py / cell, ix = Math.floor(fx), iy = Math.floor(fy), ax = fx - ix, ay = fy - iy;
      const a = grid[(iy % gw) * gw + (ix % gw)], b = grid[(iy % gw) * gw + ((ix + 1) % gw)];
      const cc = grid[((iy + 1) % gw) * gw + (ix % gw)], d = grid[((iy + 1) % gw) * gw + ((ix + 1) % gw)];
      const v = (a * (1 - ax) + b * ax) * (1 - ay) + (cc * (1 - ax) + d * ax) * ay;
      const fine = r() * 0.28;
      const o = (py * size + px) * 4;
      im.data[o + 3] = Math.max(0, Math.min(255, (v + fine - 0.7) * 3 * 255));
    }
    x.putImageData(im, 0, 0);
    return (cache[key] = c);
  }

  /* ================================================ PENCIL TEST ================================================ */
  function pencilPaper(kit) {
    const key = 'pp' + kit.w + 'x' + kit.h + 'x' + kit.dpr;
    if (cache[key]) return cache[key];
    const { w, h } = kit, L = kit.layer(w + 8, h + 8), g = L.g, r = kit.rng(211), k = w / 390;
    g.translate(4, 4);
    g.fillStyle = '#eee7d6'; g.fillRect(-4, -4, w + 8, h + 8);
    for (let i = 0; i < 46; i++) {                              // slow mottling in the sheet
      const x = r() * w, y = r() * h, R = 50 + r() * 170;
      const gr = g.createRadialGradient(x, y, 0, x, y, R);
      const dark = r() < 0.5;
      gr.addColorStop(0, dark ? 'rgba(120,96,58,.04)' : 'rgba(255,252,240,.06)');
      gr.addColorStop(1, 'rgba(120,96,58,0)');
      g.fillStyle = gr; g.fillRect(x - R, y - R, R * 2, R * 2);
    }
    g.lineCap = 'round';
    for (let i = 0; i < 2600; i++) {                            // fibres
      const x = r() * w, y = r() * h, a = r() * TAU, l = 3 + r() * 13, b = (r() - 0.5) * 6;
      g.strokeStyle = r() < 0.72 ? 'rgba(112,92,60,' + (0.03 + r() * 0.07) + ')' : 'rgba(255,253,245,' + (0.08 + r() * 0.16) + ')';
      g.lineWidth = 0.3 + r() * 0.42;
      g.beginPath(); g.moveTo(x, y);
      g.quadraticCurveTo(x + Math.cos(a) * l * 0.5 + b, y + Math.sin(a) * l * 0.5 - b, x + Math.cos(a) * l, y + Math.sin(a) * l);
      g.stroke();
    }
    for (let i = 0; i < 170; i++) {                             // flecks of wood in cheap bond
      g.fillStyle = 'rgba(70,56,36,' + (0.1 + r() * 0.3) + ')';
      g.fillRect(r() * w, r() * h, 0.5 + r() * 1.3, 0.5 + r() * 0.9);
    }
    // Old erasing: a thumb-smudge of grey here and there, too faint to read as anything.
    for (let i = 0; i < 5; i++) {
      const x = w * (0.1 + r() * 0.8), y = h * (0.1 + r() * 0.7), R = (24 + r() * 46) * k;
      const gr = g.createRadialGradient(x, y, 0, x, y, R);
      gr.addColorStop(0, 'rgba(84,82,82,.05)'); gr.addColorStop(1, 'rgba(84,82,82,0)');
      g.fillStyle = gr;
      g.save(); g.translate(x, y); g.rotate(r() * 3); g.scale(1.6, 0.6); g.translate(-x, -y);
      g.fillRect(x - R, y - R, R * 2, R * 2);
      g.restore();
    }
    // Field marks a layout artist ruled on the sheet: corners and a centre cross.
    g.strokeStyle = 'rgba(70,130,200,.3)'; g.lineWidth = 0.9;
    const mx = w * 0.07, mt = Math.max(66, h * 0.09), mb = h - Math.max(122, h * 0.15), ml = 15 * k;
    [[mx, mt, 1, 1], [w - mx, mt, -1, 1], [mx, mb, 1, -1], [w - mx, mb, -1, -1]].forEach((q) => {
      g.beginPath(); g.moveTo(q[0] + q[2] * ml, q[1] + r() * 0.8); g.lineTo(q[0], q[1]); g.lineTo(q[0] + r(), q[1] + q[3] * ml); g.stroke();
    });
    // The bottom of the sheet: Acme holes on a steel peg bar.
    const edge = h - 15 * k, py = edge - 40 * k;
    const bar = g.createLinearGradient(0, edge, 0, h + 4);
    bar.addColorStop(0, '#2d2e31'); bar.addColorStop(0.18, '#7b7e82'); bar.addColorStop(0.5, '#5b5e62'); bar.addColorStop(1, '#333538');
    g.fillStyle = bar; g.fillRect(-4, edge, w + 8, h - edge + 6);
    const peg = (cx, cy, pw, ph) => {
      const R = Math.min(pw, ph) / 2;
      g.fillStyle = '#17181a';                                   // the hole in the paper
      g.beginPath(); g.roundRect(cx - pw / 2 - 1.4, cy - ph / 2 - 1.4, pw + 2.8, ph + 2.8, R + 1.4); g.fill();
      const st = g.createLinearGradient(0, cy - ph / 2, 0, cy + ph / 2);
      st.addColorStop(0, '#d8dbde'); st.addColorStop(0.35, '#a5a8ac'); st.addColorStop(1, '#5e6165');
      g.fillStyle = st;
      g.beginPath(); g.roundRect(cx - pw / 2 + 0.6, cy - ph / 2 + 0.8, pw - 1.2, ph - 1.6, R); g.fill();
      g.strokeStyle = 'rgba(255,255,255,.55)'; g.lineWidth = 0.8;
      g.beginPath(); g.moveTo(cx - pw / 2 + R, cy - ph / 2 + 1.6); g.lineTo(cx + pw / 2 - R, cy - ph / 2 + 1.6); g.stroke();
      g.strokeStyle = 'rgba(70,50,20,.3)'; g.lineWidth = 1.2;     // the paper's cut edge catches a little shadow
      g.beginPath(); g.roundRect(cx - pw / 2 - 2.2, cy - ph / 2 - 2.2, pw + 4.4, ph + 4.4, R + 2); g.stroke();
    };
    peg(w / 2, py, 20 * k, 20 * k);
    peg(w / 2 - 118 * k, py, 46 * k, 13 * k);
    peg(w / 2 + 118 * k, py, 46 * k, 13 * k);
    // Lift the paper's torn-square edge off the bar.
    g.fillStyle = 'rgba(30,24,14,.5)'; g.fillRect(-4, edge, w + 8, 1.6);
    g.fillStyle = 'rgba(255,255,255,.5)'; g.fillRect(-4, edge - 1, w + 8, 1);
    // Camera falloff from a lunchbox rig with two desk lamps.
    const vg = g.createRadialGradient(w * 0.5, h * 0.42, Math.min(w, h) * 0.34, w * 0.5, h * 0.46, Math.max(w, h) * 0.76);
    vg.addColorStop(0, 'rgba(50,34,12,0)'); vg.addColorStop(1, 'rgba(50,34,12,.3)');
    g.fillStyle = vg; g.fillRect(-4, -4, w + 8, h + 8);
    return (cache[key] = L);
  }

  // One-stroke printed letters on a 1-high grid, the way a layout man letters a title card.
  const PRINT = {
    F: { w: 0.56, s: [[[0, 0.02], [0.01, 1]], [[-0.03, 0.02], [0.56, 0]], [[0, 0.47], [0.44, 0.46]]] },
    r: { w: 0.36, s: [[[0, 0.37], [0.01, 1]], [[0.01, 0.56], [0.1, 0.43], [0.24, 0.37], [0.36, 0.4]]] },
    e: { w: 0.46, s: [[[0.02, 0.68], [0.24, 0.68], [0.45, 0.66], [0.42, 0.5], [0.3, 0.38], [0.14, 0.39], [0.03, 0.52], [0, 0.72], [0.07, 0.92], [0.22, 1], [0.36, 0.98], [0.46, 0.88]]] },
    M: { w: 0.8, s: [[[0, 1], [0.03, 0.02]], [[0.03, 0], [0.4, 0.82]], [[0.4, 0.82], [0.76, 0]], [[0.76, 0], [0.8, 1]]] },
    o: { w: 0.48, s: [[[0.25, 0.37], [0.07, 0.45], [0, 0.68], [0.07, 0.92], [0.24, 1], [0.42, 0.92], [0.49, 0.68], [0.42, 0.45], [0.25, 0.37], [0.18, 0.39]]] },
    t: { w: 0.34, s: [[[0.13, 0.07], [0.12, 0.84], [0.18, 0.97], [0.29, 1], [0.37, 0.95]], [[-0.01, 0.38], [0.32, 0.37]]] },
    i: { w: 0.08, s: [[[0.04, 0.38], [0.05, 1]], [[0.03, 0.13], [0.06, 0.17]]] },
    n: { w: 0.44, s: [[[0, 0.37], [0.01, 1]], [[0.01, 0.56], [0.1, 0.43], [0.25, 0.37], [0.38, 0.43], [0.43, 0.6], [0.44, 1]]] },
  };

  FMI.add({
    id: 'hand-pencil',
    lane: 'Hand-drawn',
    name: 'Pencil test',
    blurb: 'Blue pencil roughs throw the three clips out of a spine with real overshoot, graphite cleans them up, teal pencil scribbles in the playhead, and a red pencil signs it off.',
    dur: 3.55,
    ground: '#eee7d6',
    make(stage, kit) {
      const { w, h, dpr, k: K } = kit;
      const g = kit.canvas({ alpha: false });
      const paper = pencilPaper(kit);
      const pl = kit.layer(w, h), c = pl.g;
      const toothPat = c.createPattern(toothTile(kit, 5), 'repeat');
      const s = Math.min((w * 0.74) / 92, (h - 60 - 110 - 24) / (107 * 1.27));
      const total = 107 * s + (1.35 * 92 * s) / 5.6;
      const fx = (w - 92 * s) / 2 - w * 0.012, fy = 60 + (h - 60 - 110 - total) * 0.4;
      const X = (u) => fx + (u - 14) * s, Y = (v) => fy + (v - 3) * s;
      const F = kit.F;
      const bars = F.clips.map((b) => ({ x0: X(b.x), yc: Y(b.y + b.h / 2), hh: b.h * s, len: b.w * s, r: b.r * s }));
      const spineTop = Y(10), spineBot = Y(106), spineH = spineBot - spineTop;
      const BLUE = '#3c86d8', LEAD = '#2b2a2d', TEAL = '#0fae94', RED = '#c9352c';

      // ---------- Timing, all on twos ----------
      const LEN = [
        [[0.2, 0.03], [0.27, 0, 'out2'], [0.34, 0.5, 'in2'], [0.42, 1.2, 'out2'], [0.5, 0.92, 'io2'], [0.59, 1.05, 'io2'], [0.67, 0.985, 'io2'], [0.76, 1, 'io2']],
        [[0.5, 0.05], [0.59, 0, 'out2'], [0.67, 0.74, 'in2'], [0.75, 1.17, 'out2'], [0.84, 0.95, 'io2'], [0.92, 1.03, 'io2'], [1.0, 1, 'io2']],
        [[0.92, 0.12], [1.0, 0, 'out2'], [1.09, 1.4, 'out2'], [1.17, 0.88, 'io2'], [1.25, 1.06, 'io2'], [1.34, 1, 'io2']],
      ];
      const BORN = [0.17, 0.5, 0.92];
      const leanAt = (t) => kit.k(t, [[0.26, 0], [0.34, -7], [0.43, 11, 'out2'], [0.55, -4, 'io2'], [0.67, 7, 'io2'], [0.76, 8], [0.87, -2, 'io2'], [0.98, -2], [1.09, 7, 'out2'], [1.2, -2, 'io2'], [1.34, 0, 'io2']]);
      const jolt = (t) => kit.k(t, [[2.3, 0], [2.39, 5.5, 'out2'], [2.47, -2.2, 'io2'], [2.56, 1, 'io2'], [2.65, 0, 'io2']]);
      const droopAt = (i, t) => {
        const t0 = [0.42, 0.75, 1.09][i], A = [17, 13, 8][i];
        if (t < t0 - 0.08) return i === 2 ? 0 : -A * 0.3;
        const q = Math.max(0, t - t0);
        return A * Math.exp(-q * 5.2) * Math.cos(q * 25);
      };
      const lenAt = (i, t) => kit.k(t, LEN[i]);
      const cleanP = [
        (t) => kit.ease.io2(kit.map(t, 1.38, 1.72)),
        (t) => kit.ease.io2(kit.map(t, 1.68, 1.9)),
        (t) => kit.ease.out2(kit.map(t, 1.88, 2.02)),
      ];

      // ---------- Clean-up lines, plotted once ----------
      function cleanOutline(b, i) {
        const r = b.r, x = b.x0, y = b.yc - b.hh / 2, W = b.len, HH = b.hh;
        const pts = [
          [x - 3, y + r * 0.2], [x + r * 0.5, y], [x + W * 0.5, y + 0.8], [x + W - r, y],
          [x + W - r * 0.2, y + r * 0.3], [x + W, y + HH * 0.5], [x + W - r * 0.25, y + HH - r * 0.3], [x + W - r, y + HH],
          [x + W * 0.5, y + HH - 0.5], [x + r, y + HH], [x + r * 0.2, y + HH - r * 0.3], [x, y + HH * 0.5], [x + 0.3, y + r * 0.5], [x + 3, y - 0.5],
        ];
        return spline(pts, 5);
      }
      const clean = bars.map(cleanOutline);
      // Hatching: the top clip is light and each one down the stack is worked harder, which is his grey grade in pencil.
      const hatch = bars.map((b, i) => {
        const sp = [4.6, 3.3, 2.3][i], lines = [];
        const pad = 2;
        for (let x = b.x0 + 2, n = 0; x < b.x0 + b.len - 1; x += sp * (0.75 + H(n, 40 + i) * 0.5), n++) {
          const over = (H(n, 50 + i) - 0.5) * 3.5, rise = b.hh * 0.42;
          const inset = Math.min(1, (x - b.x0) / b.r, (b.x0 + b.len - x) / b.r);
          const shave = (1 - inset) * b.hh * 0.22;
          lines.push([x - rise * 0.5, b.yc + b.hh / 2 - pad - shave + over, x + rise * 0.5, b.yc - b.hh / 2 + pad + shave - over * 0.6]);
        }
        return lines;
      });
      const triCx = X(F.head.tri[0][0]);
      const triTop = Y(F.head.tri[0][1]), triBot = Y(F.head.tri[2][1]), triTip = X(F.head.tri[1][0]), triMid = Y(F.head.tri[1][1]);
      const scrib = (() => {                                    // the triangle, filled the way anyone fills one in, back and forth
        const pts = [], n = 17;
        for (let i = 0; i <= n; i++) {
          const q = i / n, xx = triCx + (triTip - triCx) * q;
          const halfUp = (triMid - triTop) * (1 - q), halfDn = (triBot - triMid) * (1 - q);
          pts.push(i % 2 ? [xx, triMid - halfUp - 0.5] : [xx, triMid + halfDn + 0.5]);
        }
        return pts;
      })();
      const triLine = spline([[triCx, triTop - 1.2], [triTip + 1, triMid], [triCx, triBot + 1], [triCx - 0.5, triTop - 2.5]], 3);
      const stemX = X(F.head.x + F.head.w / 2), stemTop = Y(F.head.y), stemBot = Y(F.head.y + F.head.h);

      // ---------- The printed name ----------
      const cap = (92 * s) / 5.72;
      const wordY = Y(110) + cap * 1.34;
      const word = [];
      {
        const order = 'FreeMotion', when = [2.42, 2.5, 2.54, 2.59, 2.72, 2.8, 2.84, 2.89, 2.92, 2.98];
        let x = fx - cap * 0.02;
        for (let i = 0; i < order.length; i++) {
          const L = PRINT[order[i]], strokes = L.s.map((st) => {
            const pts = st.map((p) => [x + p[0] * cap, wordY - cap + p[1] * cap]);
            return pts.length === 2 ? seg(pts[0], pts[1], 4) : spline(pts, 3);
          });
          word.push({ strokes, t0: when[i], i });
          x += (L.w + 0.15) * cap;
        }
      }
      // ---------- The red OK ----------
      const okx = X(97), oky = Y(68), okR = Math.min(9.6 * s, (w - X(86)) * 0.42);
      const okStrokes = [
        spline([[okx - okR * 0.6, oky - okR * 0.42], [okx - okR * 0.86, oky], [okx - okR * 0.58, oky + okR * 0.4], [okx - okR * 0.28, oky], [okx - okR * 0.58, oky - okR * 0.42]], 2),
        seg([okx + okR * 0.06, oky - okR * 0.48], [okx + okR * 0.02, oky + okR * 0.46], 3),
        seg([okx + okR * 0.6, oky - okR * 0.5], [okx + okR * 0.06, oky + okR * 0.02], 3),
        seg([okx + okR * 0.16, oky - okR * 0.06], [okx + okR * 0.64, oky + okR * 0.5], 3),
        spline([[okx + okR * 0.7, oky - okR * 0.92], [okx - okR * 0.3, oky - okR * 1.02], [okx - okR * 1.22, oky - okR * 0.08], [okx - okR * 0.5, oky + okR * 0.98], [okx + okR * 0.72, oky + okR * 0.8], [okx + okR * 1.2, oky - okR * 0.3], [okx + okR * 0.2, oky - okR * 1.12]], 4),
      ];
      const noteY = Math.max(wordY + 22, h - 110 - 40);

      // ---------- One drawing ----------
      function roughBar(i, d, tt, jy, lean) {
        const b = bars[i], L = lenAt(i, tt), len = Math.max(0.01, L) * b.len;
        if (len < 6) return;
        const thick = Math.max(0.44, Math.min(1.6, 1 / Math.pow(Math.max(0.3, L), 1.15)));
        // While it is only rough it will not sit still: a wave runs out along the bar. The clean-up pencil pins it down.
        const pinned = kit.ease.io2(Math.min(1, cleanP[i](tt) * 1.6));
        // The ones still waiting get more nervous as the pencil works its way down to them.
        const wave = (1 - pinned) * kit.k(tt, [[1.04 + i * 0.03, 0], [1.3, 1, 'out2'], [1.4, 1], [1.72, 1 + i * 0.5, 'in2'], [1.9, 1 + i * 0.95, 'in2']]) * 8;
        const dr = droopAt(i, tt), hh = b.hh * thick;
        const pt = (x, side) => {
          const u = x / len;
          const yy = b.yc + jy + (side * hh) / 2 + dr * u * u + wave * u * Math.sin(u * 5.2 - tt * 19 - i * 1.1);
          return [b.x0 + x + (lean * (spineBot - yy)) / spineH, yy];
        };
        const edge = (side, a, e) => {
          const out = [];
          const n = Math.max(3, Math.ceil((e - a) / 12));
          for (let q = 0; q <= n; q++) out.push(pt(a + ((e - a) * q) / n, side));
          return out;
        };
        const amp = 1.4 + (1 - pinned) * 1.5;
        // Tone first: a fast loose zigzag across the body, so it has weight and is not a diagram.
        const zig = [];
        const zn = Math.max(3, Math.floor(len / (11 + H(d + i, 21) * 4)));
        for (let q = 0; q <= zn; q++) {
          const x = (len * (q + 0.5 * (q % 2))) / (zn + 0.5), side = q % 2 ? -0.82 : 0.82;
          zig.push(pt(x - hh * 0.2 * side, side + (H(q + d * 9, 22 + i) - 0.5) * 0.25));
        }
        pressLine(c, wob(zig, d * 7 + i, 1.2, 22), 1.5, BLUE, 0.3 + 0.16 * (1 - pinned), d + i, true);
        for (let pass = 0; pass < 3; pass++) {
          const sd = d * 13 + i * 100 + pass * 7;
          const a = -(5 + H(sd, 1) * 15), e = len + 3 + H(sd, 2) * 18;
          pressLine(c, wob(edge(-1 + (H(sd, 3) - 0.5) * 0.16, a, e), sd, amp, 34), 1.7, BLUE, 0.78, sd);
          pressLine(c, wob(edge(1 + (H(sd, 4) - 0.5) * 0.16, a - H(sd, 5) * 6, e + H(sd, 6) * 6), sd + 3, amp, 34), 1.7, BLUE, 0.78, sd + 2);
          // Free end: round the cap, past the start, the way a wrist does it.
          const over = pass === 0 ? 0.3 : 0.1;
          const capPts = [pt(len - hh * 0.5, -1.05), pt(len + hh * 0.06, -0.62), pt(len + hh * 0.14, 0.1), pt(len - hh * 0.03, 0.68), pt(len - hh * 0.4, 1 + over), pt(len - hh * 0.8, 1.02)];
          pressLine(c, wob(spline(capPts, 4), sd + 5, 1.5, 16), 1.6, BLUE, 0.82, sd + 4);
        }
        // Centre line, and the drawing's own tick where the free end landed.
        pressLine(c, wob(edge(0, -11, len + 15), d * 3 + i, 1.2, 44), 1, BLUE, 0.5, d + i);
        pressLine(c, wob(seg(pt(len, -1.32), pt(len, 1.36), 5), d * 5 + i, 0.9, 20), 1, BLUE, 0.55, d + 1);
        // Speed lines on the fast drawings, thrown behind the cap.
        const prev = lenAt(i, tt - 1 / 12) * b.len, v = len - prev;
        if (v > b.len * 0.16) {
          for (let q = 0; q < 6; q++) {
            const side = -1 + q * 0.4 + (H(d * 7 + q, 9) - 0.5) * 0.2;
            const back = v * (0.7 + H(d + q, 8) * 0.8);
            pressLine(c, wob(edge(side, len - back, len + hh * 0.1), d + q * 3, 1, 26), 1.3, BLUE, 0.68, d + q);
          }
        }
      }
      function drawAll(d, tt) {
        const lean = leanAt(tt), jy = jolt(tt);
        // Before anything is decided, the wrist goes round the whole shape, looking for it.
        if (d <= 6) {
          const fade = [1, 1, 0.9, 0.72, 0.5, 0.3, 0.16][d];
          for (let p = 0; p < 2; p++) {
            const sd = d * 23 + p * 5, j = (i) => (H(sd, i) - 0.5) * 30 * (w / 390);
            const pts = [[X(8) + j(1), Y(18) + j(2)], [X(60) + j(3), Y(7) + j(4)], [X(113) + j(5), Y(22) + j(6)], [X(98) + j(7), Y(45) + j(8)], [X(72) + j(9), Y(62) + j(10)], [X(50) + j(11), Y(80) + j(12)], [X(30) + j(13), Y(108) + j(14)], [X(5) + j(15), Y(92) + j(16)], [X(11) + j(17), Y(24) + j(18)], [X(40) + j(19), Y(12) + j(20)]];
            pressLine(c, wob(spline(pts, 7), sd, 2.2, 40), 1.6, BLUE, 0.55 * fade, sd);
          }
        }
        // Spine: thrown down in two drawings, gone over again in the third.
        if (d >= 0) {
          const q = d === 0 ? 0.46 : 1;
          const sd = d * 11 + 3;
          const a = [spineTop - 22 - H(d, 1) * 10, spineBot + 10 + H(d, 2) * 18];
          const yEnd = a[0] + (a[1] - a[0]) * q;
          const line = wob(seg([X(14) + lean, a[0]], [X(14) + 2 * (lean / 11), yEnd], 12), sd, 1.8, 60);
          pressLine(c, line, 1.5, BLUE, 0.8, sd);
          if (d >= 2) pressLine(c, wob(seg([X(14) - 1 + lean, spineTop - 8], [X(14) + 1, spineBot + 2], 12), sd + 2, 1.6, 44), 1.2, BLUE, 0.6, sd + 2);
        }
        // Ruled guides for the top and bottom of the mark.
        if (d >= 1) {
          const sd = d * 17;
          pressLine(c, wob(seg([X(14) - 18, Y(20) - 1], [X(106) + 24, Y(20) + 1], 16), sd, 1.1, 90), 0.8, BLUE, 0.32, sd);
          pressLine(c, wob(seg([X(14) - 14, Y(100)], [X(106) + 12, Y(100)], 16), sd + 2, 1.1, 90), 0.8, BLUE, 0.28, sd + 1);
        }
        const roughFade = 1;
        c.globalAlpha = roughFade;
        for (let i = 0; i < 3; i++) if (tt >= BORN[i]) roughBar(i, d, tt, jy * [0.55, 0.8, 1][i], lean);
        // Arc of the top clip's end: dots on the spacing, an animator's own working.
        if (tt > 0.3) {
          const b = bars[0];
          [0.5, 0.86, 1.2].forEach((q, i) => {
            const x = b.x0 + b.len * q, y = b.yc - b.hh * 0.9 - 7 - Math.sin(q * 2.6) * 4;
            if (tt > 0.3 + i * 0.09) { c.fillStyle = BLUE; c.globalAlpha = 0.55; c.beginPath(); c.arc(x + (H(d, i) - 0.5), y + (H(d, i + 5) - 0.5), 1.5, 0, TAU); c.fill(); c.globalAlpha = 1; }
          });
        }
        // Graphite clean-up.
        for (let i = 0; i < 3; i++) {
          const p = cleanP[i](tt);
          if (p <= 0) continue;
          const j = jy * [0.55, 0.8, 1][i], b = bars[i];
          c.save(); c.translate(0, j);
          // Side-of-the-lead tone laid first, then the hatch over it.
          const toneTo = Math.min(1, p * 1.18);
          c.fillStyle = 'rgba(46,44,48,' + [0.14, 0.22, 0.3][i] + ')';
          c.beginPath(); c.roundRect(b.x0 + 1, b.yc - b.hh / 2 + 1, Math.max(1, (b.len - 2) * toneTo), b.hh - 2, b.r * 0.8); c.fill();
          const nH = Math.floor(hatch[i].length * kit.ease.in2(Math.min(1, p * 1.05)));
          c.beginPath(); c.lineWidth = 1.05; c.strokeStyle = LEAD; c.lineCap = 'round'; c.globalAlpha = 0.56 + i * 0.07;
          for (let q = 0; q < nH; q++) {
            const l = hatch[i][q], jx = (H(q + d * 31, 2) - 0.5) * 0.8;
            c.moveTo(l[0] + jx, l[1]); c.lineTo(l[2] + jx, l[3]);
          }
          c.stroke(); c.globalAlpha = 1;
          const n = Math.max(2, Math.floor(clean[i].length * p));
          pressLine(c, wob(clean[i].slice(0, n), d * 3 + i * 9, 0.65, 42), 2, LEAD, 0.95, i * 5 + 1, true);
          if (p > 0.55) pressLine(c, wob(clean[i].slice(0, Math.floor(n * (p - 0.55) / 0.45)), d * 3 + i * 9 + 4, 0.9, 50), 1.1, LEAD, 0.55, i * 5 + 2, true);
          c.restore();
        }
        // Teal: triangle scribbled in, then one hard line down.
        const pTri = kit.map(tt, 2.06, 2.26), pStem = kit.map(tt, 2.26, 2.39);
        if (pTri > 0) {
          const n = Math.max(2, Math.floor(scrib.length * Math.min(1, pTri * 1.2)));
          pressLine(c, wob(scrib.slice(0, n), d * 2 + 1, 0.7, 10), 2.2, TEAL, 0.92, 3, true);
          if (pTri >= 0.8) pressLine(c, wob(triLine, d * 2 + 3, 0.6, 14), 1.7, TEAL, 0.95, 5, true);
        }
        if (pStem > 0) {
          const yEnd = stemTop + (stemBot - stemTop + 3) * Math.min(1, pStem * 1.04);
          pressLine(c, wob(seg([stemX - 0.4, stemTop - 1], [stemX + 0.4, yEnd], 9), d * 2 + 5, 0.55, 80), 3.7, TEAL, 0.97, 7, true);
          pressLine(c, wob(seg([stemX + 0.8, stemTop - 1], [stemX + 0.2, yEnd - 3], 9), d * 2 + 7, 0.7, 70), 1.7, TEAL, 0.8, 8, true);
        }
        // Accent ticks on the landing, for the two drawings it hits.
        if (tt >= 2.38 && tt < 2.56) {
          for (let q = 0; q < 6; q++) {
            const a = [Math.PI * 0.08, Math.PI * 0.26, Math.PI * 0.45, Math.PI * 0.6, Math.PI * 0.76, Math.PI * 0.92][q];
            const r0 = 9 + H(d + q, 3) * 4, r1 = r0 + 9 + H(d + q, 4) * 12;
            pressLine(c, seg([stemX + Math.cos(a) * r0, stemBot + Math.sin(a) * r0 * 0.7], [stemX + Math.cos(a) * r1, stemBot + Math.sin(a) * r1 * 0.7], 5), 1.3, BLUE, 0.8, q);
          }
        }
        // The name, lettered in graphite.
        for (const L of word) {
          if (tt < L.t0) continue;
          const fresh = tt < L.t0 + 1 / 11;
          L.strokes.forEach((st, si) => {
            const sd = d * 9 + L.i * 20 + si;
            pressLine(c, wob(st, sd, fresh ? 1.15 : 0.55, 16), Math.max(2.2, cap * 0.066), LEAD, 0.92, sd, true);
            if (!fresh) pressLine(c, wob(st, sd + 3, 0.8, 18), 1.2, LEAD, 0.6, sd + 1, true);
          });
        }
        // Red OK, from whoever signs the drawings off.
        if (tt >= 3.13) {
          const n = tt >= 3.22 ? 1 : 0.5;
          okStrokes.forEach((st, si) => {
            if (si === 4 && tt < 3.22) return;
            const sd = d + si * 6;
            pressLine(c, wob(st, sd, 0.7, 18), si === 4 ? 1.7 : 2.3, RED, 0.92 * (n > 0.5 ? 1 : 0.92), sd, true);
          });
        }
        // Margin notes that change sheet to sheet.
        c.save();
        c.textBaseline = 'alphabetic';
        const num = 1 + d * 2;
        const nx = w - w * 0.13, ny = noteY;
        c.translate(nx, ny); c.rotate((H(d, 33) - 0.5) * 0.09);
        c.fillStyle = LEAD; c.globalAlpha = 0.86; c.textAlign = 'center';
        c.font = Math.round(Math.max(23, w * 0.07)) + 'px "Reenie Beanie"';
        c.fillText(String(num), 0, 6);
        c.restore();
        pressLine(c, wob(spline([[nx + 15, ny - 13], [nx - 2, ny - 18], [nx - 19, ny - 7], [nx - 14, ny + 11], [nx + 7, ny + 13], [nx + 19, ny - 1], [nx + 9, ny - 17]], 4), d + 40, 0.9, 16), 1, LEAD, 0.6, d);
        // Timing chart: the ladder of spacing, ease out, an animator's curve.
        const chX = fx, chY = noteY - 2, chW = 92 * s * 0.54;
        pressLine(c, wob(seg([chX, chY], [chX + chW, chY + 0.6], 9), d * 2 + 77, 0.5, 70), 1, LEAD, 0.62, 70);
        [0, 0.34, 0.6, 0.79, 0.91, 1].forEach((q, i) => {
          const x = chX + chW * q, up = i === 0 || i === 5 ? 8 : 5;
          pressLine(c, seg([x + (H(d, i) - 0.5), chY - up], [x + (H(d, i + 9) - 0.5), chY + up], 3), 1, LEAD, 0.65, i, true);
        });
        c.fillStyle = LEAD; c.globalAlpha = 0.62; c.textAlign = 'center';
        c.font = Math.round(Math.max(15, w * 0.042)) + 'px "Reenie Beanie"';
        c.fillText('1', chX, chY + 22); c.fillText('9', chX + chW, chY + 22);
        c.textAlign = 'left';
        c.fillText('FM  sc.1', w * 0.08, Math.max(84, h * 0.115));
        c.globalAlpha = 1;
      }

      let shown = -1;                                           // one drawing lasts two frames at 24; never paint the same one twice
      return function seek(t) {
        const tt = kit.on(Math.min(t, 3.55), 12), d = kit.frame(Math.min(t, 3.55), 12);
        if (d === shown) return;
        shown = d;
        c.setTransform(dpr, 0, 0, dpr, 0, 0);
        c.globalCompositeOperation = 'source-over';
        c.clearRect(0, 0, w, h);
        drawAll(d, tt);
        // Knock the pencil out wherever the sheet's tooth is too low to take it. Every drawing is a different sheet.
        c.setTransform(1, 0, 0, 1, 0, 0);
        c.globalCompositeOperation = 'destination-out';
        const ox = Math.floor(H(d, 71) * 256), oy = Math.floor(H(d, 72) * 256);
        c.translate(ox, oy);
        c.fillStyle = toothPat;
        c.fillRect(-ox, -oy, pl.canvas.width, pl.canvas.height);
        c.setTransform(1, 0, 0, 1, 0, 0);
        c.globalCompositeOperation = 'source-over';
        // The sheet sits on the pegs and the rostrum camera has a little weave and a little lamp flicker.
        const wx = (H(d, 11) - 0.5) * 1.5, wy = (H(d, 12) - 0.5) * 1.5;
        g.drawImage(paper.canvas, -4 + wx * 0.5, -4 + wy * 0.5, w + 8, h + 8);
        g.drawImage(pl.canvas, wx, wy, w, h);
        const fl = H(d, 13);
        g.fillStyle = fl > 0.5 ? 'rgba(30,20,4,' + (fl - 0.5) * 0.09 + ')' : 'rgba(255,250,235,' + (0.5 - fl) * 0.08 + ')';
        g.fillRect(0, 0, w, h);
        // Now and then a hair or a speck on the rostrum glass, for one frame only.
        if (H(d, 90) < 0.14) {
          const x = H(d, 91) * w, y = H(d, 92) * h, a = H(d, 93) * TAU, l = (10 + H(d, 94) * 26) * (w / 390);
          g.strokeStyle = 'rgba(28,24,20,.62)'; g.lineWidth = 0.7;
          g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + Math.cos(a) * l * 0.5 + 6, y + Math.sin(a) * l * 0.5 - 6, x + Math.cos(a) * l, y + Math.sin(a) * l); g.stroke();
        }
      };
    },
  });

  /* ================================================== FLIPBOOK ================================================== */
  function deskLayer(kit) {
    const key = 'desk' + kit.w + 'x' + kit.h + 'x' + kit.dpr;
    if (cache[key]) return cache[key];
    const { w, h } = kit, L = kit.layer(w + 8, h + 8), g = L.g, r = kit.rng(303), q = w / 390;
    g.translate(4, 4);
    const base = g.createLinearGradient(0, 0, w, h);
    base.addColorStop(0, '#8a6742'); base.addColorStop(0.5, '#74522f'); base.addColorStop(1, '#5b3f25');
    g.fillStyle = base; g.fillRect(-4, -4, w + 8, h + 8);
    // Long grain, running up the desk, with a slow drift so no two lines stay parallel for long.
    g.lineCap = 'round';
    for (let i = 0; i < 520; i++) {
      const x0 = r() * (w + 60) - 30, drift = (r() - 0.5) * 34 * q, ph = r() * TAU, fr = 0.003 + r() * 0.005, A = 3 + r() * 13;
      const dark = r() < 0.78;
      g.strokeStyle = dark ? 'rgba(40,23,9,' + (0.04 + r() * 0.13) + ')' : 'rgba(205,165,115,' + (0.03 + r() * 0.09) + ')';
      g.lineWidth = 0.4 + r() * r() * 2.6;
      g.beginPath();
      const y0 = -20 + (r() < 0.3 ? r() * h : 0), y1 = r() < 0.3 ? y0 + r() * h : h + 20;
      for (let y = y0; y <= y1; y += 24) {
        const x = x0 + ((y / h) * drift) + Math.sin(y * fr + ph) * A;
        if (y === y0) g.moveTo(x, y); else g.lineTo(x, y);
      }
      g.stroke();
    }
    // Pores: tiny dashes along the grain.
    for (let i = 0; i < 1500; i++) {
      g.strokeStyle = 'rgba(30,16,6,' + (0.07 + r() * 0.24) + ')';
      g.lineWidth = 0.4 + r() * 0.5;
      const x = r() * w, y = r() * h, l = 2 + r() * 9;
      g.beginPath(); g.moveTo(x, y); g.lineTo(x + (r() - 0.5) * 0.8, y + l); g.stroke();
    }
    // Scratches and a ring from somebody's cup.
    for (let i = 0; i < 26; i++) {
      g.strokeStyle = 'rgba(232,206,170,' + (0.03 + r() * 0.1) + ')';
      g.lineWidth = 0.5 + r() * 0.7;
      const x = r() * w, y = r() * h, a = r() * TAU, l = 14 + r() * 70;
      g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); g.stroke();
    }
    g.strokeStyle = 'rgba(38,22,10,.13)'; g.lineWidth = 2.2 * q;
    g.beginPath(); g.ellipse(w * 0.86, h * 0.07, 40 * q, 38 * q, 0.2, 0.3, 5.2); g.stroke();
    // A pencil somebody left out, and the crumbs of its rubber.
    g.save();
    g.translate(w * 0.17, h * 0.078); g.rotate(0.11);
    const pl = 230 * q, pw2 = 9 * q;
    g.fillStyle = 'rgba(22,10,2,.32)'; g.fillRect(4 * q, -pw2 + 7 * q, pl, pw2 * 2);
    const body = g.createLinearGradient(0, -pw2, 0, pw2);
    body.addColorStop(0, '#c98a12'); body.addColorStop(0.3, '#f3bb2a'); body.addColorStop(0.36, '#fbd668'); body.addColorStop(0.62, '#e3a31c'); body.addColorStop(1, '#94600a');
    g.fillStyle = body; g.fillRect(28 * q, -pw2, pl - 64 * q, pw2 * 2);
    g.fillStyle = 'rgba(90,56,4,.5)'; g.fillRect(28 * q, -pw2 * 0.32, pl - 64 * q, 0.7); g.fillRect(28 * q, pw2 * 0.34, pl - 64 * q, 0.7);
    g.fillStyle = '#e2bd8c';
    g.beginPath(); g.moveTo(28 * q, -pw2); g.lineTo(4 * q, -1.4 * q); g.lineTo(4 * q, 1.4 * q); g.lineTo(28 * q, pw2); g.closePath(); g.fill();
    for (let i = 0; i < 4; i++) { g.fillStyle = '#f3bb2a'; g.beginPath(); g.moveTo(28 * q, -pw2 + i * pw2 * 0.66); g.quadraticCurveTo(22 * q, -pw2 * 0.68 + i * pw2 * 0.66, 28 * q, -pw2 * 0.34 + i * pw2 * 0.66); g.fill(); }
    g.fillStyle = '#2a2a2e';
    g.beginPath(); g.moveTo(9 * q, -2.6 * q); g.lineTo(0, 0); g.lineTo(9 * q, 2.6 * q); g.closePath(); g.fill();
    const fer = g.createLinearGradient(0, -pw2, 0, pw2);
    fer.addColorStop(0, '#7a7c80'); fer.addColorStop(0.32, '#eceef0'); fer.addColorStop(1, '#5b5d61');
    g.fillStyle = fer; g.fillRect(pl - 36 * q, -pw2 - 0.5, 15 * q, pw2 * 2 + 1);
    g.fillStyle = 'rgba(0,0,0,.28)'; for (let i = 1; i < 4; i++) g.fillRect(pl - 36 * q + i * 3.7 * q, -pw2 - 0.5, 0.8, pw2 * 2 + 1);
    const rub = g.createLinearGradient(0, -pw2, 0, pw2);
    rub.addColorStop(0, '#b0605f'); rub.addColorStop(0.35, '#e79f9c'); rub.addColorStop(1, '#8c4545');
    g.fillStyle = rub; g.beginPath(); g.roundRect(pl - 21 * q, -pw2 + 0.4, 15 * q, pw2 * 2 - 0.8, 3 * q); g.fill();
    g.restore();
    for (let i = 0; i < 26; i++) {
      g.strokeStyle = 'rgba(70,62,62,' + (0.5 + r() * 0.4) + ')'; g.lineWidth = (0.8 + r() * 0.9) * q; g.lineCap = 'round';
      const x = w * (0.04 + r() * 0.3), y = h * (0.86 + r() * 0.08), a = r() * TAU, l = (1.5 + r() * 5) * q;
      g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + l * 0.5, y + (r() - 0.5) * 3, x + Math.cos(a) * l, y + Math.sin(a) * l); g.stroke();
    }
    // A window off to the top left.
    const lt = g.createRadialGradient(w * 0.18, h * 0.05, 10, w * 0.3, h * 0.2, Math.max(w, h) * 1.02);
    lt.addColorStop(0, 'rgba(255,226,180,.22)'); lt.addColorStop(0.5, 'rgba(255,226,180,0)'); lt.addColorStop(1, 'rgba(18,8,0,.42)');
    g.fillStyle = lt; g.fillRect(-4, -4, w + 8, h + 8);
    return (cache[key] = L);
  }
  function thumbSprite(kit, q) {
    const W = 94 * q, LEN = 360 * q, lay = kit.layer(W + 46 * q, LEN), g = lay.g, cx = lay.w / 2 + 4 * q;
    const shape = (ox, oy, grow) => {
      const Wg = W + grow * 2;
      g.beginPath();
      g.moveTo(cx + ox - Wg * 0.42, LEN + 4);
      g.bezierCurveTo(cx + ox - Wg * 0.56, LEN * 0.56 + oy, cx + ox - Wg * 0.52, LEN * 0.22 + oy, cx + ox - Wg * 0.39, LEN * 0.09 + oy - grow);
      g.bezierCurveTo(cx + ox - Wg * 0.26, oy + 1 - grow, cx + ox + Wg * 0.26, oy + 1 - grow, cx + ox + Wg * 0.39, LEN * 0.09 + oy - grow);
      g.bezierCurveTo(cx + ox + Wg * 0.52, LEN * 0.22 + oy, cx + ox + Wg * 0.56, LEN * 0.56 + oy, cx + ox + Wg * 0.44, LEN + 4);
      g.closePath();
    };
    // Contact shadow on the paper, built from several loose copies. Thumbs do not have hard shadows.
    for (let i = 0; i < 7; i++) { g.fillStyle = 'rgba(32,18,6,.05)'; shape(-5 * q, 7 * q, i * 1.7 * q); g.fill(); }
    // Skin: rounder and darker to the edges.
    const skin = g.createLinearGradient(cx - W * 0.56, 0, cx + W * 0.56, 0);
    skin.addColorStop(0, '#9f6a4d'); skin.addColorStop(0.14, '#c78f6d'); skin.addColorStop(0.42, '#e6b799'); skin.addColorStop(0.68, '#deaa8a'); skin.addColorStop(0.9, '#b87f5f'); skin.addColorStop(1, '#8e5c43');
    g.fillStyle = skin; shape(0, 0, 0); g.fill();
    g.save(); shape(0, 0, 0); g.clip();
    // Blood near the tip, where it is pressing.
    const tip = g.createRadialGradient(cx, LEN * 0.05, 2, cx, LEN * 0.08, W * 0.72);
    tip.addColorStop(0, 'rgba(226,120,105,.42)'); tip.addColorStop(1, 'rgba(226,120,105,0)');
    g.fillStyle = tip; g.fillRect(0, 0, lay.w, LEN * 0.34);
    // Knuckle: a soft swell and a few real creases.
    const kn = LEN * 0.5;
    const sw = g.createLinearGradient(0, kn - 34 * q, 0, kn + 34 * q);
    sw.addColorStop(0, 'rgba(120,70,44,0)'); sw.addColorStop(0.5, 'rgba(120,70,44,.2)'); sw.addColorStop(1, 'rgba(120,70,44,0)');
    g.fillStyle = sw; g.fillRect(0, kn - 34 * q, lay.w, 68 * q);
    g.lineCap = 'round';
    for (let i = 0; i < 9; i++) {
      const y = kn - 18 * q + i * 4.4 * q + (H(i, 7) - 0.5) * 2, a = 0.2 + H(i, 8) * 0.34, half = W * (0.17 + H(i, 9) * 0.2), bow = (2.5 + H(i, 10) * 3) * q;
      g.strokeStyle = 'rgba(92,50,32,' + a + ')'; g.lineWidth = (0.6 + H(i, 11) * 0.6) * q;
      const off = (H(i, 12) - 0.5) * 12 * q;
      g.beginPath(); g.moveTo(cx + off - half, y); g.quadraticCurveTo(cx + off, y - bow, cx + off + half, y + (H(i, 13) - 0.5) * 2); g.stroke();
    }
    // Fine skin lines lengthways, barely there.
    for (let i = 0; i < 60; i++) {
      const y = LEN * (0.32 + H(i, 21) * 0.68), x = cx + (H(i, 22) - 0.5) * W * 0.9, l = (4 + H(i, 23) * 12) * q;
      g.strokeStyle = 'rgba(110,64,42,' + (0.05 + H(i, 24) * 0.09) + ')'; g.lineWidth = 0.5 * q;
      g.beginPath(); g.moveTo(x, y); g.lineTo(x + (H(i, 25) - 0.5) * 3, y + l); g.stroke();
    }
    g.restore();
    // The nail.
    const nw = W * 0.34, ny0 = LEN * 0.018, ny1 = LEN * 0.215;
    const nail = () => {
      g.beginPath();
      g.moveTo(cx - nw, ny1 - 8 * q);
      g.bezierCurveTo(cx - nw * 1.05, ny0 + 22 * q, cx - nw * 0.82, ny0 + 3 * q, cx, ny0);
      g.bezierCurveTo(cx + nw * 0.82, ny0 + 3 * q, cx + nw * 1.05, ny0 + 22 * q, cx + nw, ny1 - 8 * q);
      g.quadraticCurveTo(cx, ny1 + 8 * q, cx - nw, ny1 - 8 * q);
      g.closePath();
    };
    g.fillStyle = 'rgba(112,62,42,.45)'; g.save(); g.translate(0, 1.3 * q); g.scale(1, 1); nail(); g.fill(); g.restore();
    const nb = g.createLinearGradient(cx - nw, 0, cx + nw, 0);
    nb.addColorStop(0, '#d6a191'); nb.addColorStop(0.3, '#f2cfc3'); nb.addColorStop(0.55, '#f6dcd2'); nb.addColorStop(1, '#cf9a88');
    g.fillStyle = nb; nail(); g.fill();
    g.save(); nail(); g.clip();
    // Pale half-moon at the root, white free edge at the tip.
    g.fillStyle = 'rgba(255,246,240,.62)';
    g.beginPath(); g.ellipse(cx, ny1 + 3 * q, nw * 0.62, 17 * q, 0, 0, TAU); g.fill();
    g.fillStyle = 'rgba(255,250,240,.82)';
    g.beginPath(); g.moveTo(cx - nw * 1.1, ny0 + 10 * q); g.quadraticCurveTo(cx, ny0 + 3.5 * q + 7 * q, cx + nw * 1.1, ny0 + 10 * q); g.lineTo(cx + nw * 1.1, ny0 - 4); g.lineTo(cx - nw * 1.1, ny0 - 4); g.closePath(); g.fill();
    // A window in the nail, narrow and crooked.
    g.strokeStyle = 'rgba(255,255,255,.72)'; g.lineWidth = 3.6 * q;
    g.beginPath(); g.moveTo(cx - nw * 0.46, ny0 + 22 * q); g.quadraticCurveTo(cx - nw * 0.54, ny0 + 40 * q, cx - nw * 0.42, ny1 - 22 * q); g.stroke();
    g.restore();
    g.strokeStyle = 'rgba(100,54,36,.5)'; g.lineWidth = 0.8 * q; nail(); g.stroke();
    return lay;
  }

  FMI.add({
    id: 'hand-flipbook',
    lane: 'Hand-drawn',
    name: 'Flipbook',
    blurb: 'A thumb riffles a school exercise book where a stick man hauls the three clips out of the red margin, running out of puff on each one, until the playhead falls from the top of the page and he leans on it.',
    dur: 4.25,
    ground: '#6c4d2f',
    make(stage, kit) {
      const { w, h, dpr } = kit, q = w / 390;
      const g = kit.canvas({ alpha: false });
      const F = kit.F;
      const avail = h - 60 - 110 - 28;
      const pw = Math.min(w * 0.82, avail * 0.76), ph = Math.min(avail, pw * 1.5);
      const bx = (w - pw) / 2 + w * 0.042, by = 60 + (h - 60 - 110 - ph) * 0.42, tilt = -0.024;
      const s = (pw * 0.7) / 92, mx = pw * 0.13;
      const oy = (ph - 126 * s) * 0.42 - 3 * s;
      const UX = (x) => mx + (x - 14) * s, UY = (y) => oy + y * s;
      const INK = '#1c2030', TEAL = '#10b198', PAPER = '#f1ebd9';
      const desk = deskLayer(kit);

      // ---------- The sheet: ruled exercise-book paper, with the rules exactly where the man will walk ----------
      const sheet = kit.layer(pw, ph);
      {
        const c = sheet.g, r = kit.rng(404);
        c.fillStyle = PAPER; c.fillRect(0, 0, pw, ph);
        c.lineCap = 'round';
        for (let i = 0; i < 700; i++) {
          c.strokeStyle = r() < 0.7 ? 'rgba(120,100,70,' + (0.04 + r() * 0.09) + ')' : 'rgba(255,255,250,' + (0.12 + r() * 0.2) + ')';
          c.lineWidth = 0.35 + r() * 0.4;
          const x = r() * pw, y = r() * ph, a = r() * TAU, l = 2 + r() * 8;
          c.beginPath(); c.moveTo(x, y); c.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); c.stroke();
        }
        c.fillStyle = 'rgba(126,155,196,.62)';
        for (let k = -12; k < 30; k++) {
          const y = UY(42 + k * 14.5);
          if (y > 16 * q && y < ph - 6) c.fillRect(0, y - 0.5, pw, 1);
        }
        c.fillStyle = 'rgba(209,92,86,.72)'; c.fillRect(mx - 0.7, 0, 1.3, ph);
        c.fillStyle = 'rgba(209,92,86,.38)'; c.fillRect(mx + 2.4, 0, 0.8, ph);
        // Thumbed and handled: darker at the outer edge and the bottom corner.
        const e1 = c.createLinearGradient(pw * 0.72, ph * 0.72, pw, ph);
        e1.addColorStop(0, 'rgba(120,88,44,0)'); e1.addColorStop(1, 'rgba(120,88,44,.26)');
        c.fillStyle = e1; c.fillRect(0, 0, pw, ph);
        const e2 = c.createLinearGradient(0, 0, 28 * q, 0);
        e2.addColorStop(0, 'rgba(60,40,20,.34)'); e2.addColorStop(1, 'rgba(60,40,20,0)');
        c.fillStyle = e2; c.fillRect(0, 0, 28 * q, ph);
      }
      // ---------- The stack underneath: every page a hair out of true ----------
      const NP = 68, dxP = 0.2 * q, dyP = 0.27 * q;
      const stack = kit.layer(pw + 70 * q, ph + 70 * q);
      {
        const c = stack.g, ox = 8 * q, oyy = 8 * q;
        for (let i = 0; i < 9; i++) {                            // its shadow on the desk
          c.fillStyle = 'rgba(24,12,4,.055)';
          c.beginPath(); c.roundRect(ox - 4 * q + i * 0.9, oyy + 10 * q + i * 1.1, pw + NP * dxP + 8 * q + i * 2, ph + NP * dyP + i * 1.6, 4); c.fill();
        }
        for (let i = NP; i >= 0; i--) {
          const jx = (H(i, 61) - 0.5) * 1.6 * q, jy = (H(i, 62) - 0.5) * 1.2 * q;
          c.fillStyle = i % 2 ? '#e2dac3' : '#d5ccb2';
          c.fillRect(ox + i * dxP + jx, oyy + i * dyP + jy, pw, ph);
          c.strokeStyle = 'rgba(92,76,52,' + (0.22 + H(i, 63) * 0.3) + ')';
          c.lineWidth = 0.5;
          c.strokeRect(ox + i * dxP + jx, oyy + i * dyP + jy, pw, ph);
        }
      }
      // ---------- Cloth tape down the spine, and two staples ----------
      const tapeW = 26 * q, tape = kit.layer(tapeW + 14 * q, ph + 44 * q);
      {
        const c = tape.g, r = kit.rng(505), tx = 2 * q, th = ph + 28 * q;
        c.fillStyle = 'rgba(16,8,2,.3)'; c.fillRect(tx + 2 * q, 6, tapeW + 4 * q, th);
        const tg = c.createLinearGradient(tx, 0, tx + tapeW, 0);
        tg.addColorStop(0, '#17181c'); tg.addColorStop(0.35, '#31323a'); tg.addColorStop(0.6, '#26272e'); tg.addColorStop(1, '#101115');
        c.fillStyle = tg; c.fillRect(tx, 2, tapeW, th);
        for (let i = 0; i < 260; i++) {                          // the weave
          c.fillStyle = r() < 0.5 ? 'rgba(255,255,255,' + (0.02 + r() * 0.05) + ')' : 'rgba(0,0,0,' + (0.1 + r() * 0.2) + ')';
          const horiz = r() < 0.5;
          c.fillRect(tx + r() * tapeW, 2 + r() * th, horiz ? 3 : 0.7, horiz ? 0.7 : 3);
        }
        [0.14, 0.86].forEach((yy) => {
          const y = 2 + th * yy, sx = tx + tapeW * 0.56;
          c.fillStyle = 'rgba(0,0,0,.5)'; c.fillRect(sx - 0.6, y - 12 * q, 3, 25 * q);
          const st = c.createLinearGradient(sx, 0, sx + 2.4 * q, 0);
          st.addColorStop(0, '#f0f1f3'); st.addColorStop(1, '#85888d');
          c.fillStyle = st; c.fillRect(sx, y - 12.6 * q, 2.4 * q, 25 * q);
        });
      }
      const thumb = thumbSprite(kit, q);

      // ---------- The story, a page at a time ----------
      const P = [];
      const pull = (b, i, n, grip, tired) => {
        const u = i / n, L = b.len * Math.pow(u, b.pow);
        const st = { L: b.done.slice(), man: null };
        st.L[b.i] = L;
        const stg = tired ? Math.sin(i * 1.7) * tired * 1.2 : 0;
        st.man = { kind: 'haul', x: 14 + L + 8.5 + stg, y: grip + 11, ph: L / b.stride, grip: [14 + L, grip], tired };
        return st;
      };
      const full = [92, 0, 0], full2 = [92, 62, 0], full3 = [92, 62, 26];
      for (let i = 0; i <= 14; i++) P.push(pull({ i: 0, len: 92, pow: 1.25, stride: 15, done: [0, 0, 0] }, i, 14, 31, 0));
      P.push({ L: full, man: { kind: 'stand', x: 115.5, y: 42, face: 1, dust: 0 } });
      P.push({ L: full, man: { kind: 'land', x: 115.5, y: 42, face: 1 } });
      P.push({ L: full, man: { kind: 'jump', x: 116.5, y: 35, face: 1 } });
      P.push({ L: full, man: { kind: 'jump', x: 117.5, y: 52, face: 1 } });
      P.push({ L: full, man: { kind: 'land', x: 118, y: 71, face: -1, dust: 1 } });
      [112, 94, 76, 58, 41, 26].forEach((x, i) => P.push({ L: full, man: { kind: 'run', x, y: 71, ph: i * 0.46, speed: i < 5 } }));
      P.push({ L: full, man: { kind: 'stand', x: 22.5, y: 71, face: 1, dust: 1 } });
      for (let i = 0; i <= 11; i++) P.push(pull({ i: 1, len: 62, pow: 1.1, stride: 12, done: full }, i, 11, 60, 0.5));
      P.push({ L: full2, man: { kind: 'stand', x: 84.5, y: 71, face: 1, sweat: 1, slump: 1 } });
      P.push({ L: full2, man: { kind: 'jump', x: 85.5, y: 80, face: 1 } });
      P.push({ L: full2, man: { kind: 'land', x: 86, y: 100, face: -1, dust: 1, sweat: 1 } });
      [84, 72, 60, 49, 38, 27].forEach((x, i) => P.push({ L: full2, man: { kind: 'trudge', x, y: 100, ph: i * 0.5 } }));
      for (let i = 0; i <= 6; i++) P.push(pull({ i: 2, len: 26, pow: 0.92, stride: 7, done: full2 }, i, 6, 89, 1));
      [0.34, 0.72, 1].forEach((u, i) => P.push({ L: full3, man: { kind: 'fall', x: 49, y: 100, u, dust: i === 2 ? 1 : 0 } }));
      P.push({ L: full3, man: { kind: 'fall', x: 49, y: 100, u: 1, tongue: 1 } });              // flat out: the long hold starts here
      P.push({ L: full3, man: { kind: 'fall', x: 49, y: 100, u: 1, look: 1 } });                // something is coming
      P.push({ L: full3, head: -86, man: { kind: 'fall', x: 49, y: 100, u: 1, look: 2 } });
      P.push({ L: full3, head: -40, man: { kind: 'fall', x: 49, y: 100, u: 1, look: 2 } });
      P.push({ L: full3, head: 0, slam: 1, jy: 1.7, man: { kind: 'fall', x: 49, y: 92, u: 1, look: 2, flung: 1 } });
      P.push({ L: full3, head: 0, slam: 2, jy: -0.7, chars: 4, man: { kind: 'jump', x: 62, y: 83, face: 1 } });
      P.push({ L: full3, head: 0, chars: 6, man: { kind: 'land', x: 66, y: 100, face: 1, dust: 1 } });
      P.push({ L: full3, head: 0, chars: 9, man: { kind: 'stand', x: 68, y: 100, face: 1 } });
      P.push({ L: full3, head: 0, chars: 10, man: { kind: 'lean', x: 68, y: 100, ease: 0 } });
      P.push({ L: full3, head: 0, chars: 10, man: { kind: 'lean', x: 68, y: 100, ease: 1 } });
      const LAST = P.length - 1;
      // When each page lets go. Fast and a little uneven under the thumb, then the thumb runs out of pages.
      const hold = (n) => {
        const slow = [0.056, 0.068, 0.085, 0.13, 0.15, 0.115, 0.085, 0.16, 0.12, 0.14, 0.18, 0.2];
        const i = n - (LAST - slow.length);
        return i >= 0 ? slow[i] : 0.042 * (0.88 + 0.24 * H(n, 91));
      };
      const start = [0.13];
      for (let n = 0; n < LAST; n++) start[n + 1] = start[n] + hold(n);
      const flight = (n) => (n > LAST - 14 ? 0.12 : 0.085);
      const lastDown = start[LAST - 1] + flight(LAST - 1);

      // ---------- Drawing a page in biro and felt tip ----------
      const line = (c, pts) => { c.beginPath(); c.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) c.lineTo(pts[i][0], pts[i][1]); c.stroke(); };
      const limb = (a, b, l1, l2, bend) => {
        let dx = b[0] - a[0], dy = b[1] - a[1], d = Math.hypot(dx, dy) || 0.01;
        const mx2 = l1 + l2 - 0.02;
        let e = b;
        if (d > mx2) { e = [a[0] + (dx * mx2) / d, a[1] + (dy * mx2) / d]; dx = e[0] - a[0]; dy = e[1] - a[1]; d = mx2; }
        const aa = (l1 * l1 - l2 * l2 + d * d) / (2 * d), hh = Math.sqrt(Math.max(0, l1 * l1 - aa * aa));
        return [a, [a[0] + (dx * aa) / d - (bend * dy * hh) / d, a[1] + (dy * aa) / d + (bend * dx * hh) / d], e];
      };
      const LEG = 5.8, ARM = 5.3;
      function pose(m) {
        const { x, y } = m;
        let hip, neck, head, fa, fb, ha, hb, kneeBend = 1, face = m.face === undefined ? 1 : m.face;
        const fromLean = (h, lean, trunk, nk) => {
          const n = [h[0] + Math.sin(lean) * trunk, h[1] - Math.cos(lean) * trunk];
          return [n, [n[0] + Math.sin(lean) * nk + 0.2, n[1] - Math.cos(lean) * nk]];
        };
        switch (m.kind) {
          case 'haul': {
            const p = m.ph * TAU, A = 5.4 - (m.tired || 0) * 1.6, lean = 0.42 + (m.tired || 0) * 0.3;
            fa = [x - 1 + A * Math.cos(p), y - Math.max(0, Math.sin(p)) * 2.8];
            fb = [x - 1 - A * Math.cos(p), y - Math.max(0, -Math.sin(p)) * 2.8];
            hip = [x - 1.2, y - 10.3 + Math.abs(Math.sin(p)) * 0.5 + (m.tired || 0) * 0.7];
            [neck, head] = fromLean(hip, lean, 9, 4.7);
            ha = [m.grip[0], m.grip[1] - 1]; hb = [m.grip[0], m.grip[1] + 1.4];
            face = 1;
            break;
          }
          case 'run': {
            const p = m.ph * TAU, A = 8.2, lean = -0.56;
            fa = [x + A * Math.cos(p), y - Math.max(0, Math.sin(p)) * 5];
            fb = [x - A * Math.cos(p), y - Math.max(0, -Math.sin(p)) * 5];
            hip = [x, y - 9.8];
            [neck, head] = fromLean(hip, lean, 9, 4.7);
            ha = [neck[0] - 5.6 * Math.cos(p), neck[1] + 5 + 2.6 * Math.sin(p)];
            hb = [neck[0] + 5.6 * Math.cos(p), neck[1] + 5 - 2.6 * Math.sin(p)];
            kneeBend = -1; face = -1;
            break;
          }
          case 'trudge': {
            const p = m.ph * TAU, A = 3.8, lean = -0.3;
            fa = [x + A * Math.cos(p), y - Math.max(0, Math.sin(p)) * 1.4];
            fb = [x - A * Math.cos(p), y - Math.max(0, -Math.sin(p)) * 1.4];
            hip = [x, y - 10.4];
            [neck, head] = fromLean(hip, lean, 8.7, 4.5);
            head = [head[0] - 1.6, head[1] + 1.2];
            ha = [neck[0] - 2.2, neck[1] + 9.6]; hb = [neck[0] + 0.5, neck[1] + 9.8];
            kneeBend = -1; face = -1;
            break;
          }
          case 'jump': {
            hip = [x, y - 12];
            [neck, head] = fromLean(hip, 0.1 * face, 9, 4.7);
            fa = [x - 4.5, y - 5]; fb = [x + 5, y - 6.5];
            ha = [neck[0] - 7, neck[1] - 4.5]; hb = [neck[0] + 7, neck[1] - 5.5];
            break;
          }
          case 'land': {
            hip = [x, y - 5.8];
            [neck, head] = fromLean(hip, 0.2 * face, 8.8, 4.6);
            fa = [x - 6.5, y]; fb = [x + 6.5, y];
            ha = [neck[0] - 6.5, neck[1] + 5]; hb = [neck[0] + 6.5, neck[1] + 5];
            break;
          }
          case 'fall': {
            // Tips forward from the feet. By 1 he is flat on his face.
            const a = m.u * 1.5708, cs = Math.cos(a), sn = Math.sin(a);
            const R = (dx, dy) => [x + dx * cs - dy * sn, Math.min(y - 0.8, y + dx * sn + dy * cs)];
            const bend = 1 - m.u;
            hip = R(0, -(10.5 - bend * 3));
            neck = R(0.5, -19.5 + bend * 3);
            head = R(1, -24.5 + bend * 3);
            if (m.look) head = [head[0] + 0.8, head[1] - (m.look === 2 ? 3.2 : 2)];
            fa = R(-2 * bend - 1.5, 0); fb = R(2 * bend + 1.5, 0);
            ha = R(-6, -27); hb = R(6, -27);
            if (m.u < 1) { ha = R(-4, -16); hb = R(4, -15); }
            if (m.flung) { ha = [neck[0] - 3, neck[1] - 7]; hb = [neck[0] + 4, neck[1] - 8]; fa = [hip[0] - 7, hip[1] - 5]; fb = [hip[0] - 10, hip[1] + 2]; }
            break;
          }
          case 'lean': {
            hip = [x + 3, y - 10.2];
            neck = [x + 8.6, y - 18.6]; head = [x + 10.2, y - 23.2];
            fa = [x - 3, y]; fb = [x - 8.2, y - 1.8];
            ha = [neck[0] - 3.6, neck[1] + 3.2]; hb = [neck[0] - 1.6, neck[1] + 2.4];
            kneeBend = -1;
            break;
          }
          default: {
            hip = [x, y - 10.6];
            [neck, head] = fromLean(hip, m.slump ? 0.18 * face : 0.02, 9.2, 4.7);
            fa = [x - 2.6, y]; fb = [x + 2.6, y];
            ha = [neck[0] - 3.2, neck[1] + 9.2]; hb = [neck[0] + 3.2, neck[1] + 9.2];
          }
        }
        return { hip, neck, head, fa, fb, ha, hb, kneeBend, face };
      }
      function drawMan(c, m, n) {
        const j = pose(m), E = (p) => [UX(p[0]), UY(p[1])];
        c.strokeStyle = INK; c.lineWidth = 2.5 * q; c.lineCap = 'round'; c.lineJoin = 'round';
        const jj = (p, i) => { const pt = E(p); return [pt[0] + (H(n * 3 + i, 1) - 0.5) * 1.1 * q, pt[1] + (H(n * 3 + i, 2) - 0.5) * 1.1 * q]; };
        line(c, limb(j.hip, j.fa, LEG, LEG, j.kneeBend).map(jj));
        line(c, limb(j.hip, j.fb, LEG, LEG, j.kneeBend).map(jj));
        line(c, [jj(j.hip, 8), jj(j.neck, 9)]);
        line(c, limb(j.neck, j.ha, ARM, ARM, -1).map((p, i) => jj(p, 12 + i)));
        line(c, limb(j.neck, j.hb, ARM, ARM, 1).map((p, i) => jj(p, 16 + i)));
        const hd = E(j.head), R = 4.5 * s;
        c.fillStyle = PAPER;
        c.beginPath(); c.ellipse(hd[0], hd[1], R * (0.96 + H(n, 4) * 0.08), R * (0.96 + H(n, 5) * 0.08), H(n, 6) * 3, 0, TAU); c.fill(); c.stroke();
        // Face: two dots and whatever the mouth is up to.
        c.fillStyle = INK;
        const f = j.face, ex = hd[0] + f * R * 0.2, ey = hd[1] - R * 0.16, wide = m.look === 2 || m.flung ? 1.5 : 1;
        c.beginPath(); c.arc(ex - R * 0.28, ey, 1.05 * q * wide, 0, TAU); c.arc(ex + R * 0.32, ey, 1.05 * q * wide, 0, TAU); c.fill();
        c.lineWidth = 1.4 * q;
        if (m.tired > 0.7 || m.tongue || m.kind === 'trudge') {
          c.beginPath(); c.arc(ex + R * 0.06, hd[1] + R * 0.42, R * 0.2, 0, TAU); c.stroke();
        } else if (m.kind === 'lean') {
          c.beginPath(); c.moveTo(ex - R * 0.26, hd[1] + R * 0.34); c.quadraticCurveTo(ex + R * 0.12, hd[1] + R * 0.64, ex + R * 0.48, hd[1] + R * 0.26); c.stroke();
        } else if (m.look === 2 || m.flung) {
          c.beginPath(); c.arc(ex + R * 0.06, hd[1] + R * 0.44, R * 0.27, 0, TAU); c.fill();
        }
        // Sweat, once he has earned it.
        if (m.tired || m.sweat) {
          c.fillStyle = '#3a78c8';
          for (let i = 0; i < 2; i++) {
            const a = 3.8 + H(n + i, 8) * 1.2, d = R * (1.3 + H(n + i, 9) * 0.8), x = hd[0] + Math.cos(a) * d, y = hd[1] + Math.sin(a) * d;
            c.beginPath(); c.moveTo(x, y - 3.2 * q); c.quadraticCurveTo(x + 2.3 * q, y + 0.6 * q, x, y + 1.4 * q); c.quadraticCurveTo(x - 2.3 * q, y + 0.6 * q, x, y - 3.2 * q); c.fill();
          }
        }
        // Speed lines and scuffed-up dust, drawn the way anyone draws them.
        c.strokeStyle = INK; c.lineWidth = 1.2 * q;
        if (m.speed) {
          for (let i = 0; i < 4; i++) {
            const yy = UY(m.y - 5 - i * 5.5), x0 = UX(m.x + 9 + H(n + i, 3) * 3), l = (9 + H(n + i, 4) * 12) * s;
            c.beginPath(); c.moveTo(x0, yy); c.lineTo(x0 + l, yy + (H(n + i, 5) - 0.5) * 2); c.stroke();
          }
        }
        if (m.dust) {
          [-1, 1].forEach((sd) => {
            for (let i = 0; i < 2; i++) {
              const cx = UX(m.x + sd * (8 + i * 5)), cy = UY(m.y - 1.6 - i * 1.3), r = (2 - i * 0.5) * s;
              c.beginPath(); c.arc(cx, cy, r, 0.4, 5.6); c.stroke();
            }
          });
        }
      }
      function drawBar(c, i, len, n, jy) {
        const b = F.clips[i], x0 = UX(14), x1 = UX(14 + len), y0 = UY(b.y) + jy, y1 = UY(b.y + b.h) + jy;
        // Filled by scribbling across it fast: a new scribble every page, so it shimmers while it flicks.
        c.strokeStyle = INK; c.lineWidth = 1.2 * q; c.lineJoin = 'round'; c.lineCap = 'round'; c.globalAlpha *= 0.88;
        const slant = (y1 - y0) * 0.4, sp = [4.5, 3.9, 3.4][i] * q;
        c.beginPath();
        let x = x0 + 2, up = true, m = 0;
        c.moveTo(x, y1 - 2);
        while (x + slant * 0.5 < x1 - 1) {
          x += sp * (0.72 + 0.56 * H(m + n * 41, 3 + i));
          const near = kit.clamp((x1 - x) / (b.r * s));
          const y = up ? y0 + 2 + (H(m + n * 13, 7) - 0.5) * 2 + (1 - near) * 5 : y1 - 2 + (H(m + n * 17, 8) - 0.5) * 2 - (1 - near) * 5;
          c.lineTo(up ? Math.min(x1 - 1.5, x + slant * 0.5) : Math.min(x1 - 2, x - slant * 0.5), y);
          up = !up; m++;
        }
        c.stroke();
        c.globalAlpha /= 0.88;
        // The outline.
        c.lineWidth = 1.9 * q;
        const r = Math.min(b.r * s, (x1 - x0) * 0.5), e = 0.6 * q, J = (a, k2) => (H(n * 7 + k2, 20 + i) - 0.5) * e * 2 + a;
        c.beginPath();
        c.moveTo(J(x0 + r, 1), J(y0, 2));
        c.lineTo(J(x1 - r, 3), J(y0, 4));
        c.quadraticCurveTo(x1, y0, J(x1, 5), J(y0 + r, 6));
        c.lineTo(J(x1, 7), J(y1 - r, 8));
        c.quadraticCurveTo(x1, y1, J(x1 - r, 9), J(y1, 10));
        c.lineTo(J(x0 + r, 11), J(y1, 12));
        c.quadraticCurveTo(x0, y1, J(x0, 13), J(y1 - r, 14));
        c.lineTo(J(x0, 15), J(y0 + r, 16));
        c.quadraticCurveTo(x0, y0, J(x0 + r + 2, 1), J(y0 - 1, 2));
        c.stroke();
      }
      function drawHead(c, off, n) {
        const hd = F.head, x = UX(hd.x + hd.w / 2), top = UY(hd.y + off), bot = UY(hd.y + hd.h + off);
        c.strokeStyle = TEAL; c.fillStyle = TEAL; c.lineCap = 'round';
        const vis0 = Math.max(top, 4);
        if (bot < 4) return;
        c.lineWidth = hd.w * s * 0.76;
        line(c, [[x + (H(n, 1) - 0.5) * 0.8, vis0], [x + (H(n, 2) - 0.5) * 0.8, bot]]);
        if (off < 0) {                                           // falling: a few drawn streaks above it
          c.lineWidth = 1.5 * q;
          for (let i = -1; i <= 1; i++) line(c, [[x + i * 7 * q, Math.max(2, top - 10 * q)], [x + i * 7 * q, Math.max(2, top + 24 * q + Math.abs(i) * 9 * q)]]);
        }
        const tri = hd.tri.map((p) => [UX(p[0]), UY(p[1] + off)]);
        if (tri[0][1] > 2) {
          c.beginPath();
          tri.forEach((p, i) => { const qx = p[0] + (H(n + i, 11) - 0.5) * 1.4 * q, qy = p[1] + (H(n + i, 12) - 0.5) * 1.4 * q; if (i) c.lineTo(qx, qy); else c.moveTo(qx, qy); });
          c.closePath(); c.lineJoin = 'round'; c.lineWidth = 1.6 * q; c.fill(); c.stroke();
          // A felt tip leaves darker lines where it goes back over.
          c.strokeStyle = 'rgba(6,110,92,.5)'; c.lineWidth = 1 * q;
          line(c, [[tri[0][0] + 2, tri[0][1] + 3], [tri[1][0] - 4, tri[1][1]], [tri[2][0] + 2, tri[2][1] - 3]]);
        }
        c.strokeStyle = 'rgba(6,110,92,.42)'; c.lineWidth = 1 * q;
        line(c, [[x - hd.w * s * 0.18, vis0 + 4], [x - hd.w * s * 0.14, bot - 2]]);
      }
      const wordPx = (() => {
        const t = kit.layer(8, 8).g;
        t.font = '100px "Reenie Beanie"';
        return Math.min((100 * 92 * s * 1.02) / t.measureText('FreeMotion').width, 15 * s * 4.2);
      })();
      const wordAdv = (() => {                                     // measured once, so the letters cost nothing per frame
        const t = kit.layer(8, 8).g, whole = 'FreeMotion', out = [];
        t.font = wordPx + 'px "Reenie Beanie"';
        for (let i = 0; i < whole.length; i++) out.push(t.measureText(whole.slice(0, i + 1)).width - t.measureText(whole.slice(0, i)).width);
        return out;
      })();
      function drawInk(c, n, alpha) {
        const st = P[n];
        c.save();
        c.translate((H(n, 71) - 0.5) * 1.6 * q, (H(n, 72) - 0.5) * 1.6 * q);
        c.globalAlpha = alpha;
        const jy = (st.jy || 0) * s;
        for (let i = 0; i < 3; i++) if (st.L[i] > 1) drawBar(c, i, st.L[i], n, jy * [0.6, 0.8, 1][i]);
        if (st.head !== undefined) drawHead(c, st.head, n);
        c.strokeStyle = INK;
        if (st.slam) {                                           // the hit, in the only way a biro can draw one
          const cx = UX(82), cy = UY(100);
          c.lineWidth = 1.9 * q; c.lineCap = 'round';
          const R = st.slam === 1 ? 1 : 1.5;
          for (let i = 0; i < 7; i++) {
            const a = Math.PI + (i + 0.5) * (Math.PI / 7) + (H(n + i, 4) - 0.5) * 0.14;
            const r0 = (7 + H(i, 3) * 3) * s * R, r1 = r0 + (st.slam === 1 ? 9 : 4) * s;
            if (a > Math.PI * 1.34 && a < Math.PI * 1.62) continue;
            line(c, [[cx + Math.cos(a) * r0, cy + 9 * s + Math.sin(a) * r0 * 0.6], [cx + Math.cos(a) * r1, cy + 9 * s + Math.sin(a) * r1 * 0.6]]);
          }
        }
        if (st.man) drawMan(c, st.man, n);
        if (st.chars && alpha > 0.5) {
          c.fillStyle = INK; c.textAlign = 'left'; c.textBaseline = 'alphabetic';
          c.font = wordPx + 'px "Reenie Beanie"';
          // Written out again on every page, so no letter lands in quite the same place twice.
          let cx = UX(14) - 2 * q;
          for (let i = 0; i < st.chars; i++) {
            c.save();
            c.translate(cx + (H(n * 3 + i, 77) - 0.5) * 1.2 * q, UY(129) + (H(n * 3 + i, 78) - 0.5) * 1.8 * q);
            c.rotate((H(n * 3 + i, 79) - 0.5) * 0.07);
            c.fillText('FreeMotion'[i], 0, 0);
            c.restore();
            cx += wordAdv[i];
          }
        }
        // Page number in the corner, in pencil.
        if (alpha > 0.5) {
          c.fillStyle = 'rgba(70,70,80,.7)'; c.textAlign = 'right';
          c.font = Math.round(16 * q) + 'px "Reenie Beanie"';
          c.fillText(String(n + 1), pw - 9 * q, 19 * q);
        }
        c.restore();
      }
      const flat = (c, n) => { c.drawImage(sheet.canvas, 0, 0, pw, ph); drawInk(c, n, 1); };
      const RECT = [[0, 0], [pw, 0], [pw, ph], [0, ph]];
      function cut(poly, px, py, nx, ny, keep) {
        const out = [];
        for (let i = 0; i < poly.length; i++) {
          const a = poly[i], b = poly[(i + 1) % poly.length];
          const da = ((a[0] - px) * nx + (a[1] - py) * ny) * keep, db = ((b[0] - px) * nx + (b[1] - py) * ny) * keep;
          if (da >= 0) out.push(a);
          if (da >= 0 !== db >= 0) { const u = da / (da - db); out.push([a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u]); }
        }
        return out;
      }
      const trace = (c, poly) => { c.beginPath(); poly.forEach((p, i) => (i ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1]))); c.closePath(); };
      function flying(c, n, f) {
        // The sheet folds along a line that starts at the thumb's corner and rolls to the spine.
        const xb = pw * (1.02 - 1.02 * f), xt = pw * (2.1 - 2.1 * f);
        let dx = xt - xb, dy = -ph;
        const dl = Math.hypot(dx, dy); dx /= dl; dy /= dl;
        const nx = -dy, ny = dx, px = xb, py = ph;                 // normal points to the side that has already lifted
        // A sheet in the air stands up off the page, so from above it is foreshortened: a thin rolling strip, not a flat fold.
        const kk = f < 0.34 ? kit.lerp(0.74, 0.36, f / 0.34) : kit.lerp(0.36, 0.2, (f - 0.34) / 0.66);
        const a = dx * dx - kk * nx * nx, b = dx * dy - kk * nx * ny, d = dy * dy - kk * ny * ny;
        const e = px - a * px - b * py, ff = py - b * px - d * py;
        const refl = (p) => [a * p[0] + b * p[1] + e, b * p[0] + d * p[1] + ff];
        const stay = cut(RECT, px, py, nx, ny, -1), lift = cut(RECT, px, py, nx, ny, 1);
        if (stay.length > 2) { c.save(); trace(c, stay); c.clip(); flat(c, n); c.restore(); }
        // Shade on the page coming into view, right beside the crease.
        const sh = c.createLinearGradient(px, py, px + nx * 40 * q, py + ny * 40 * q);
        sh.addColorStop(0, 'rgba(40,24,8,.3)'); sh.addColorStop(1, 'rgba(40,24,8,0)');
        c.save(); trace(c, RECT); c.clip(); c.fillStyle = sh; c.beginPath();
        c.moveTo(px, py); c.lineTo(px + dx * 2 * ph, py + dy * 2 * ph); c.lineTo(px + dx * 2 * ph + nx * 40 * q, py + dy * 2 * ph + ny * 40 * q); c.lineTo(px + nx * 40 * q, py + ny * 40 * q); c.closePath(); c.fill(); c.restore();
        if (lift.length > 2) {
          const over = lift.map(refl);
          c.save();
          c.fillStyle = 'rgba(30,16,4,.2)';
          trace(c, over.map((p) => [p[0] - nx * 7 * q + 1, p[1] - ny * 7 * q + 3]));
          c.fill();
          trace(c, over); c.clip();
          c.save();
          c.transform(a, b, b, d, e, ff);
          c.drawImage(sheet.canvas, 0, 0, pw, ph);                 // the back of the same sheet, rules and all
          drawInk(c, n, 0.15);                                     // and the biro showing through
          c.restore();
          const sp = Math.max(24 * q, Math.min(pw * 0.95, 300 * q) * kk);
          const gr = c.createLinearGradient(px, py, px - nx * sp, py - ny * sp);
          gr.addColorStop(0, 'rgba(70,46,20,.55)'); gr.addColorStop(0.12, 'rgba(255,252,240,.55)'); gr.addColorStop(0.42, 'rgba(150,120,80,.08)'); gr.addColorStop(1, 'rgba(90,66,34,.34)');
          c.fillStyle = gr; c.fillRect(-pw, -ph, pw * 3, ph * 3);
          c.restore();
          c.strokeStyle = 'rgba(70,56,36,.5)'; c.lineWidth = 0.7; trace(c, over); c.stroke();
        }
      }
      const sc = (px, py) => {                                     // page position to screen
        const dx = px - pw / 2, dy = py - ph / 2, ct = Math.cos(tilt), st = Math.sin(tilt);
        return [bx + pw / 2 + dx * ct - dy * st, by + ph / 2 + dx * st + dy * ct];
      };
      const tipAt = sc(pw - 48 * q, ph - 34 * q);

      return function seek(t) {
        g.setTransform(dpr, 0, 0, dpr, 0, 0);
        g.drawImage(desk.canvas, -4, -4, w + 8, h + 8);
        // Which page is where.
        let base = LAST, fly = [], gone = 0;
        for (let n = 0; n < LAST; n++) {
          if (start[n] > t) { base = n; break; }
          const end = start[n] + flight(n);
          if (t < end) fly.push(n); else gone++;
        }
        g.save();
        g.translate(bx + pw / 2, by + ph / 2); g.rotate(tilt); g.translate(-pw / 2, -ph / 2);
        // Flipped pages lying open to the left of the spine.
        if (gone > 0) {
          const thick = gone * 0.14 * q;
          g.fillStyle = 'rgba(24,12,4,.3)'; g.fillRect(-pw - thick, 7 * q, pw + thick, ph + 2 * q);
          g.fillStyle = '#e6dfca'; g.fillRect(-pw - thick, 0, pw + thick, ph);
          g.fillStyle = 'rgba(70,46,20,.28)'; g.fillRect(-20 * q, 0, 20 * q, ph);
        }
        // What is left of the stack; it sinks as pages go.
        g.drawImage(stack.canvas, -8 * q - (gone * dxP), -8 * q - (gone * dyP), stack.w, stack.h);
        flat(g, base);
        for (let i = fly.length - 1; i >= 0; i--) {
          const n = fly[i], u = (t - start[n]) / flight(n);
          flying(g, n, Math.pow(u, 1.25));
        }
        g.drawImage(tape.canvas, -tapeW * 0.62, -14 * q, tape.w, tape.h);
        g.restore();
        // The thumb. It presses first, ticks once for every page that gets away, then lifts off when there are none left.
        const press = kit.k(t, [[0, -6], [0.12, 5, 'out2'], [0.2, 0, 'io2']]);
        let tick = 0;
        if (t >= start[0] && t < lastDown) {
          let nn = 0;
          for (let n = 0; n < LAST; n++) if (start[n] <= t) nn = n;
          const u = kit.clamp((t - start[nn]) / (start[nn + 1] - start[nn] || 1));
          tick = (1 - u) * 1.8;
        }
        const go = kit.ease.in3(kit.map(t, lastDown - 0.04, lastDown + 0.2));
        const ang = -0.42, ux = Math.sin(-ang), uy = Math.cos(ang);  // pointing up and to the left, so its way out is down and right
        if (go < 1) {
          const dist2 = press + tick + go * 420 * q;
          g.save();
          g.translate(tipAt[0] + ux * dist2 + 12 * q, tipAt[1] + uy * dist2 - 10 * q);
          g.rotate(ang);
          g.drawImage(thumb.canvas, -thumb.w / 2 - 4 * q, 0, thumb.w, thumb.h);
          g.restore();
        }
      };
    },
  });

  /* ============================================== MARKER SIGNATURE ============================================== */
  // A chisel nib is a short bar held at a fixed angle and dragged along the path. That one fact gives the thick downstrokes,
  // the thin upstrokes, the streaks when it moves fast and the blots where it stops.
  function makeStroke(kit, ctrl, o) {
    // Split the plotted points at corners so a cusp stays a cusp.
    let run = [];
    const px = [], py = [], corner = [];
    const flush = () => {
      if (run.length < 2) return;
      const sm = spline(run, o.step);
      for (let i = px.length ? 1 : 0; i < sm.length; i++) { px.push(sm[i][0]); py.push(sm[i][1]); corner.push(i === sm.length - 1 ? 1 : 0); }
    };
    ctrl.forEach((q) => {
      run.push([q[0], q[1]]);
      if (q[2]) { flush(); run = [[q[0], q[1]]]; }
    });
    flush();
    const n = px.length;
    const arc = new Float32Array(n), v = new Float32Array(n), T = new Float32Array(n), dry = new Float32Array(n), pool = new Float32Array(n);
    for (let i = 1; i < n; i++) arc[i] = arc[i - 1] + Math.hypot(px[i] - px[i - 1], py[i] - py[i - 1]);
    // Handwriting's own law: the hand slows where the line bends, by the cube root of the curvature.
    const W = 4;
    for (let i = 0; i < n; i++) {
      const a = Math.max(0, i - W), b = Math.min(n - 1, i + W);
      const a1 = Math.atan2(py[Math.min(n - 1, a + 1)] - py[a], px[Math.min(n - 1, a + 1)] - px[a]);
      const a2 = Math.atan2(py[b] - py[Math.max(0, b - 1)], px[b] - px[Math.max(0, b - 1)]);
      let da = a2 - a1;
      while (da > Math.PI) da -= TAU;
      while (da < -Math.PI) da += TAU;
      const ds = Math.max(0.5, arc[b] - arc[a]);
      v[i] = Math.pow(Math.abs(da) / ds + (o.k0 || 0.01), -1 / 3);
      if (corner[i]) v[i] *= 0.22;
    }
    for (let pass = 0; pass < 3; pass++) {                       // the arm has mass, so speed changes are never instant
      const tmp = Float32Array.from(v);
      for (let i = 0; i < n; i++) {
        let sum = 0, c = 0;
        for (let j = Math.max(0, i - 5); j <= Math.min(n - 1, i + 5); j++) { sum += tmp[j]; c++; }
        v[i] = sum / c;
      }
    }
    const rampIn = o.rampIn || 16, rampOut = o.rampOut || 0;
    for (let i = 0; i < n; i++) {
      const q = Math.min(1, 0.3 + (0.7 * arc[i]) / rampIn);
      const e = rampOut ? Math.min(1, 0.3 + (0.7 * (arc[n - 1] - arc[i])) / rampOut) : 1;
      v[i] *= q * e;
    }
    let vmax = 0, vsum = 0;
    for (let i = 0; i < n; i++) { if (v[i] > vmax) vmax = v[i]; vsum += v[i]; }
    const vmean = vsum / n;
    let tt = 0;
    for (let i = 1; i < n; i++) { tt += (arc[i] - arc[i - 1]) / Math.max(0.05, 0.5 * (v[i] + v[i - 1])); T[i] = tt; }
    for (let i = 0; i < n; i++) {
      T[i] = o.t0 + (T[i] / tt) * o.dur;
      const u = arc[i] / arc[n - 1];
      dry[i] = kit.clamp((v[i] / vmean - (o.dryFrom || 1.08)) / 0.55) * (o.dryGain === undefined ? 0.75 : o.dryGain);
      if (o.tailDry) dry[i] = Math.max(dry[i], kit.clamp((u - (1 - o.tailDry)) / o.tailDry) * 0.86);
      pool[i] = kit.clamp(1 - v[i] / (vmean * 0.56));
    }
    const S = { n, px, py, arc, T, dry, pool, o, nx: Math.cos(o.nib), ny: Math.sin(o.nib), sprites: [] };
    // Pre-draw finished lengths as small sprites; only the live end is drawn per frame.
    const chunk = o.chunk || 44, pad = o.len / 2 + o.thick + 8;
    for (let a = 0; a < n - 1; a += chunk) {
      const b = Math.min(n - 1, a + chunk);
      let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
      for (let i = a; i <= b; i++) { x0 = Math.min(x0, px[i]); y0 = Math.min(y0, py[i]); x1 = Math.max(x1, px[i]); y1 = Math.max(y1, py[i]); }
      const sx = Math.floor(x0 - pad), sy = Math.floor(y0 - pad), sw = Math.ceil(x1 - x0 + pad * 2), sh = Math.ceil(y1 - y0 + pad * 2);
      const L = kit.layer(sw, sh);
      L.g.translate(-sx, -sy);
      inkRange(L.g, S, a, b);
      S.sprites.push({ canvas: L.canvas, x: sx, y: sy, w: sw, h: sh, a, b, tEnd: T[b] });
    }
    return S;
  }
  function inkRange(g, S, a, b) {
    const o = S.o, B = o.bristles, lw = (o.len / B) * 1.75 + o.thick;
    g.strokeStyle = o.color; g.lineCap = 'round'; g.lineJoin = 'round'; g.lineWidth = lw;
    for (let bi = 0; bi < B; bi++) {
      const f = B > 1 ? (bi / (B - 1)) * 2 - 1 : 0, edge = Math.abs(f), off = (f * o.len) / 2;
      g.globalAlpha = o.alpha * (0.84 + 0.16 * H(bi, o.seed));
      const wl = 8 + H(bi, o.seed + 1) * 30, sd = o.seed + bi * 3;
      g.beginPath();
      let pen = false;
      for (let i = a; i <= b; i++) {
        const d = S.dry[i];
        if (d > 0.001 && N1(S.arc[i] / wl, sd) < -1 + 2 * d * (0.5 + 0.5 * edge)) { pen = false; continue; }
        const dx = N1(S.arc[i] / 40, sd + 5) * 0.5;
        const x = S.px[i] + S.nx * off + dx, y = S.py[i] + S.ny * off + dx;
        if (!pen) { g.moveTo(x, y); g.lineTo(x + 0.01, y); pen = true; } else g.lineTo(x, y);
      }
      g.stroke();
    }
    // Where the pen slows, the felt keeps giving: the line swells and goes dark.
    g.fillStyle = o.color;
    for (let i = a; i <= b; i += 2) {
      const pq = S.pool[i];
      if (pq < 0.3) continue;
      g.globalAlpha = 0.4 + 0.5 * pq;
      const r = (o.len * 0.34 + o.thick * 0.72) * (0.6 + 0.5 * pq);
      g.beginPath();
      for (let q = 0; q < 9; q++) {
        const an = (q / 9) * TAU, rr = r * (0.84 + 0.3 * H(q, i + o.seed));
        const x = S.px[i] + Math.cos(an) * rr, y = S.py[i] + Math.sin(an) * rr;
        if (q) g.lineTo(x, y); else g.moveTo(x, y);
      }
      g.closePath(); g.fill();
    }
    g.globalAlpha = 1;
  }
  function drawStroke(g, S, t) {
    if (t < S.T[0]) return;
    for (const sp of S.sprites) {
      if (sp.tEnd <= t) { g.drawImage(sp.canvas, sp.x, sp.y, sp.w, sp.h); continue; }
      if (t > S.T[sp.a]) {
        let lo = sp.a, hi = sp.b;
        while (lo < hi) { const m = (lo + hi + 1) >> 1; if (S.T[m] <= t) lo = m; else hi = m - 1; }
        if (lo > sp.a) inkRange(g, S, sp.a, lo);
      }
      break;
    }
  }
  function whiteboard(kit) {
    const key = 'wb' + kit.w + 'x' + kit.h + 'x' + kit.dpr;
    if (cache[key]) return cache[key];
    const { w, h } = kit, L = kit.layer(w + 8, h + 8), g = L.g, r = kit.rng(77), k = w / 390;
    g.translate(4, 4);
    const base = g.createLinearGradient(0, 0, w, h);
    base.addColorStop(0, '#e9ebe9'); base.addColorStop(0.45, '#f2f3f1'); base.addColorStop(1, '#e2e4e2');
    g.fillStyle = base; g.fillRect(-4, -4, w + 8, h + 8);
    // The ceiling lights in the gloss: two long soft bars, not quite parallel.
    g.save(); g.translate(w * 0.5, h * 0.4); g.rotate(-0.12);
    [[-0.3, 0.24, 0.5], [0.34, 0.15, 0.36]].forEach((q) => {
      const x = q[0] * w, bw = q[1] * w;
      const gr = g.createLinearGradient(x - bw, 0, x + bw, 0);
      gr.addColorStop(0, 'rgba(255,255,255,0)'); gr.addColorStop(0.5, 'rgba(255,255,255,' + q[2] + ')'); gr.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = gr; g.fillRect(x - bw, -h, bw * 2, h * 2);
    });
    g.restore();
    // Years of wiping: wide faint grey arcs that go nowhere.
    g.lineCap = 'round';
    for (let i = 0; i < 40; i++) {
      const x = r() * w, y = r() * h, R = 90 + r() * 240, a0 = r() * TAU, a1 = a0 + 0.3 + r() * 0.6;
      g.strokeStyle = 'rgba(96,104,112,' + (0.006 + r() * 0.012) + ')';
      g.lineWidth = (10 + r() * 40) * k;
      g.beginPath(); g.arc(x, y, R, a0, a1); g.stroke();
    }
    // Last meeting, wiped in a hurry. It never quite comes off.
    const ghost = (txt, x, y, px, rot, a, font, strike) => {
      g.save(); g.translate(x, y); g.rotate(rot);
      g.font = px + 'px "' + font + '"';
      g.fillStyle = 'rgba(70,78,92,' + a + ')';
      g.fillText(txt, 0, 0);
      if (strike) {
        const m = g.measureText(txt).width;
        g.strokeStyle = 'rgba(70,78,92,' + a * 0.9 + ')'; g.lineWidth = px * 0.09;
        g.beginPath(); g.moveTo(-px * 0.2, -px * 0.2); g.lineTo(m * 0.5, -px * 0.32); g.lineTo(m + px * 0.2, -px * 0.24); g.stroke();
      }
      g.restore();
    };
    ghost('intro v2', w * 0.09, h * 0.135, 24 * k, -0.03, 0.075, 'Permanent Marker');
    ghost('too AI', w * 0.62, h * 0.16, 19 * k, 0.04, 0.06, 'Permanent Marker', true);
    ghost('dogshit', w * 0.52, h * 0.79, 27 * k, -0.05, 0.07, 'Permanent Marker', true);
    ghost('thin bars??', w * 0.07, h * 0.83, 17 * k, 0.03, 0.05, 'Permanent Marker', true);
    // The wipe that half took them off.
    for (let i = 0; i < 90; i++) {
      const y = h * (i < 45 ? 0.09 + r() * 0.09 : 0.75 + r() * 0.1), x = r() * w;
      g.strokeStyle = 'rgba(244,245,243,' + (0.1 + r() * 0.22) + ')';
      g.lineWidth = 1 + r() * 4;
      g.beginPath(); g.moveTo(x - 40 * k, y); g.lineTo(x + 50 * k, y + (r() - 0.5) * 7); g.stroke();
    }
    // Fine scratches and dust in the coat.
    for (let i = 0; i < 420; i++) {
      g.strokeStyle = r() < 0.5 ? 'rgba(60,66,74,' + (0.02 + r() * 0.05) + ')' : 'rgba(255,255,255,' + (0.2 + r() * 0.4) + ')';
      g.lineWidth = 0.4 + r() * 0.4;
      const x = r() * w, y = r() * h, l = 3 + r() * 24, a = r() * TAU;
      g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); g.stroke();
    }
    for (let i = 0; i < 90; i++) {
      g.fillStyle = 'rgba(40,44,50,' + (0.06 + r() * 0.2) + ')';
      g.fillRect(r() * w, r() * h, 0.5 + r(), 0.5 + r());
    }
    // Aluminium frame at the top, tray at the bottom.
    const alu = (y, hh, flip) => {
      const gr = g.createLinearGradient(0, y, 0, y + hh);
      const stops = flip ? [[0, '#6f7377'], [0.2, '#c8ccd0'], [0.55, '#a0a4a8'], [1, '#55585c']] : [[0, '#c3c7cb'], [0.5, '#a4a8ac'], [0.86, '#d6dadd'], [1, '#62656a']];
      stops.forEach((s) => gr.addColorStop(s[0], s[1]));
      g.fillStyle = gr; g.fillRect(-4, y, w + 8, hh);
    };
    const shade = g.createLinearGradient(0, 11 * k, 0, 26 * k);
    shade.addColorStop(0, 'rgba(30,34,40,.24)'); shade.addColorStop(1, 'rgba(30,34,40,0)');
    g.fillStyle = shade; g.fillRect(-4, 11 * k, w + 8, 16 * k);
    alu(-4, 15 * k + 4, false);
    const trayY = h - 40 * k, shadeB = g.createLinearGradient(0, trayY - 12 * k, 0, trayY);
    shadeB.addColorStop(0, 'rgba(30,34,40,0)'); shadeB.addColorStop(1, 'rgba(30,34,40,.17)');
    g.fillStyle = shadeB; g.fillRect(-4, trayY - 12 * k, w + 8, 12 * k);
    alu(trayY, 44 * k + 4, true);
    return (cache[key] = L);
  }

  // One slash of a fat chisel marker: hundreds of fine streaks, wet and flat at the start, breaking into dry lines at the end.
  function slash(kit, x, y, L, HH, o) {
    const pad = 12, lay = kit.layer(L + pad * 2, HH + pad * 2 + 10), g = lay.g, seed = o.seed;
    const M = Math.round(HH / 1.15), cx = pad, cy = lay.h / 2;
    const bend = (xx) => 2.4 * N1(xx / 74, seed + 2) * (HH / 66) + (o.tilt || 0) * xx;
    g.lineCap = 'butt';
    for (let j = 0; j < M; j++) {
      const f = j / (M - 1), side = f * 2 - 1, edge = Math.abs(side);
      const yy = cy + side * (HH / 2) + N1(j * 0.4, seed + 9) * 0.3;
      const body = 0.56 + 0.1 * N1(j / 7, seed + 3) + 0.05 * N1(j / 1.4, seed + 4) + (edge > 0.93 ? 0.2 : 0);
      const skip = N1(j * 0.31, seed + 7) > 0.78 ? 0.7 : 1;
      const endX = L * (1 - o.tail * 0.42 * Math.pow(H(j, seed + 8), 1.5)) * (1 - edge * edge * 0.018);
      const startX = side * 3.5 + (H(j, seed + 6) - 0.5) * 1.2;
      const wl = 13 + H(j, seed + 5) * 48;
      g.lineWidth = 2.05;
      g.strokeStyle = o.color;
      g.globalAlpha = Math.min(1, body * skip);
      g.beginPath();
      let pen = false;
      for (let xx = startX; xx < endX; xx += 3) {
        const u = xx / L, d = kit.clamp((u - (1 - o.tail)) / o.tail);
        const dry = d * d * (0.8 + 0.2 * edge) + 0.035;
        if (N1(xx / wl, seed + j * 3 + 11) < -1 + 2 * dry) { pen = false; continue; }
        const px = cx + xx, py = yy + bend(xx);
        if (!pen) { g.moveTo(px, py); pen = true; } else g.lineTo(px, py);
      }
      g.stroke();
    }
    // Felt sitting still before it moves: a hard dark bar at the start.
    g.globalAlpha = 0.34; g.fillStyle = o.color;
    g.beginPath();
    g.moveTo(cx - 3.5, cy - HH / 2 + bend(0)); g.lineTo(cx + 7, cy - HH / 2 + bend(0)); g.lineTo(cx + 11, cy + HH / 2 + bend(0)); g.lineTo(cx + 3, cy + HH / 2 + bend(0));
    g.closePath(); g.fill();
    g.globalAlpha = 1;
    return { lay, pad, x, y, L, t0: o.t0, dur: o.dur, top: y - lay.h / 2 };
  }
  function drawSlash(g, S, t, dpr) {
    if (t < S.t0) return;
    const p = Math.min(1, Math.pow((t - S.t0) / S.dur, 1.3));
    const vis = S.pad + p * (S.L + S.pad);
    const c = S.lay.canvas;
    g.drawImage(c, 0, 0, Math.min(c.width, Math.ceil(vis * dpr)), c.height, S.x - S.pad, S.top, Math.min(S.lay.w, Math.ceil(vis * dpr) / dpr), S.lay.h);
  }
  // The marker itself, lying with its tip at the left of the sprite.
  function markerSprite(kit, ink, barrel, dark, q) {
    const L = 560 * q, W = 40 * q, lay = kit.layer(L, W + 2), g = lay.g, cy = lay.h / 2;
    const across = (y0, y1, stops) => {
      const gr = g.createLinearGradient(0, y0, 0, y1);
      stops.forEach((s) => gr.addColorStop(s[0], s[1]));
      return gr;
    };
    // Felt nib, slightly chewed.
    g.fillStyle = ink;
    g.beginPath(); g.moveTo(0, cy - 3 * q); g.lineTo(3 * q, cy - 6.5 * q); g.lineTo(21 * q, cy - 8 * q); g.lineTo(21 * q, cy + 8 * q); g.lineTo(5 * q, cy + 5.5 * q); g.closePath(); g.fill();
    g.fillStyle = 'rgba(255,255,255,.16)';
    g.beginPath(); g.moveTo(3 * q, cy - 6 * q); g.lineTo(21 * q, cy - 7.6 * q); g.lineTo(21 * q, cy - 3 * q); g.lineTo(5 * q, cy - 2.4 * q); g.closePath(); g.fill();
    // Grey plastic cone.
    g.fillStyle = across(cy - W * 0.44, cy + W * 0.44, [[0, '#6c6f73'], [0.22, '#e6e8ea'], [0.42, '#b4b7bb'], [1, '#55585c']]);
    g.beginPath(); g.moveTo(20 * q, cy - 9 * q); g.lineTo(58 * q, cy - W * 0.45); g.lineTo(58 * q, cy + W * 0.45); g.lineTo(20 * q, cy + 9 * q); g.closePath(); g.fill();
    // The barrel.
    const body = across(cy - W / 2, cy + W / 2, [[0, dark], [0.17, barrel], [0.28, 'rgba(255,255,255,.82)'], [0.36, barrel], [0.8, barrel], [1, dark]]);
    g.fillStyle = body;
    g.beginPath(); g.roundRect(58 * q, cy - W / 2, L - 58 * q, W, 2); g.fill();
    // Ring and label. No words on it.
    g.fillStyle = 'rgba(0,0,0,.34)'; g.fillRect(58 * q, cy - W / 2, 2.2 * q, W);
    g.fillStyle = across(cy - W / 2, cy + W / 2, [[0, '#7d7f82'], [0.2, '#f3f3f1'], [0.3, '#ffffff'], [0.42, '#ecebe8'], [0.82, '#dcdbd8'], [1, '#6f7073']]);
    g.fillRect(128 * q, cy - W / 2, 190 * q, W);
    g.fillStyle = barrel; g.globalAlpha = 0.9; g.fillRect(146 * q, cy - W / 2, 26 * q, W); g.fillRect(180 * q, cy - W / 2, 6 * q, W);
    g.globalAlpha = 0.3; g.fillRect(200 * q, cy + W * 0.1, 96 * q, 3 * q); g.fillRect(200 * q, cy + W * 0.26, 70 * q, 3 * q);
    g.globalAlpha = 1;
    return { lay, L, W: lay.h };
  }

  FMI.add({
    id: 'hand-marker',
    lane: 'Hand-drawn',
    name: 'Marker signature',
    blurb: 'On a used whiteboard a fat grey marker slashes the three clips, a black one signs FreeMotion under them, and a teal one underlines it and whips straight up to become the playhead and the t.',
    dur: 2.95,
    ground: '#f0f1ef',
    make(stage, kit) {
      const { w, h, dpr } = kit;
      const g = kit.canvas({ alpha: false });
      const board = whiteboard(kit);
      const F = kit.F;
      const q = w / 390;
      const s = (w * 0.74) / 92;
      const drop = 40 * q, tail = 60 * q;
      const fh = (100 - 3) * s + drop + tail;
      const x0 = w * 0.1, top = 60 + (h - 60 - 110 - fh) * 0.42;
      const X = (u) => x0 + (u - 14) * s, Y = (v) => top + (v - 3) * s;

      // ---------- The grey clips: three slashes, each faster and shorter than the last ----------
      const barY = F.clips.map((b) => Y(b.y + b.h / 2));
      const nibH = 22 * s, GREY = '#83878d';
      const G = [
        slash(kit, X(14), barY[0], 92 * s, nibH, { seed: 11, color: GREY, tail: 0.3, t0: 0.03, dur: 0.17, tilt: -0.016 }),
        slash(kit, X(14.5), barY[1], 61 * s, nibH, { seed: 12, color: GREY, tail: 0.36, t0: 0.27, dur: 0.1, tilt: 0.012 }),
        slash(kit, X(13.6), barY[2], 26.5 * s, nibH, { seed: 13, color: GREY, tail: 0.46, t0: 0.44, dur: 0.05, tilt: -0.02 }),
      ];

      // ---------- The name, hand-plotted, each letter in its own little coordinates: x-height 1, baseline 0 ----------
      const LET = [
        [0, [[-0.1, -2.45], [0.35, -2.8], [1.2, -2.95], [2.4, -3.02, 1], [1.7, -2.84], [1.3, -2.7, 1], [1.16, -1.6], [0.95, -0.5], [0.72, 0.38, 1], [0.6, -0.4], [0.5, -1.16, 1], [1.1, -1.32], [1.98, -1.46, 1], [1.78, -0.85], [1.8, -0.28], [2.06, -0.03]]],
        [2.06, [[0.3, -0.5], [0.5, -1.1, 1], [0.47, -0.08, 1], [0.56, -0.62], [0.78, -0.98], [1.1, -1.06, 1], [1.3, -0.8]]],
        [3.36, [[0.44, -0.68], [0.7, -0.92], [0.52, -1.14], [0.16, -0.88], [0.02, -0.4], [0.22, -0.03], [0.74, -0.2]]],
        [4.1, [[0.44, -0.52], [0.74, -0.86], [0.64, -1.12], [0.34, -1.08], [0.11, -0.7], [0.1, -0.24], [0.38, 0], [0.86, -0.24]]],
        [5.0, [[0.42, -1.3], [0.74, -2.7, 1], [0.96, -1.3], [1.2, -0.3, 1], [1.56, -1.3], [2.0, -2.85, 1], [2.06, -1.3], [2.02, -0.34], [2.18, -0.02], [2.5, -0.26]]],
        [7.5, [[0.36, -0.74], [0.54, -1.06], [0.18, -0.82], [0.08, -0.28], [0.34, -0.01], [0.72, -0.26], [0.82, -0.72], [0.56, -1.08], [0.66, -0.82], [0.98, -0.66]]],
        [8.48, [[0.28, -1.12, 1], [0.22, -0.34], [0.38, -0.02], [0.7, -0.34]]],             // only the low part of the t
        [9.18, [[0.26, -1.02, 1], [0.24, -0.3], [0.4, -0.01], [0.7, -0.32]]],
        [9.88, [[0.34, -0.82], [0.46, -1.06], [0.1, -0.78], [0.02, -0.26], [0.26, 0], [0.62, -0.26], [0.7, -0.72], [0.46, -1.06], [0.58, -0.82], [0.88, -0.68]]],
        [10.76, [[0.14, -1.04, 1], [0.12, -0.08, 1], [0.28, -0.7], [0.6, -1.06], [0.86, -0.72], [0.82, -0.22], [0.98, 0.01], [1.36, -0.2], [1.76, -0.5]]],
      ];
      const CTRL = [];
      LET.forEach((l) => l[1].forEach((p) => CTRL.push([p[0] + l[0], p[1], p[2]])));
      const kx = (w * 0.895) / 13.0, ky = kx * 1.3, shear = 0.13, tilt = -0.108;
      const ct = Math.cos(tilt), st = Math.sin(tilt);
      const stemX = X(F.head.x + F.head.w / 2);
      const place0 = (ux, uy) => {
        const x = ux * kx - shear * uy * ky, y = uy * ky;
        return [x * ct - y * st, x * st + y * ct];
      };
      const tStem = place0(8.74, -0.7);
      const ox = stemX - tStem[0], oy = Y(100) + drop + 8 * q;
      const place = (ux, uy) => { const p = place0(ux, uy); return [p[0] + ox, p[1] + oy]; };
      const ink = { step: 1.2, len: 6 * q, thick: 2 * q, nib: -0.72, bristles: 8, color: '#15161a', alpha: 0.92, dryGain: 0.85, dryFrom: 1.02, k0: 0.012 };
      const word = makeStroke(kit, CTRL.map((c) => { const p = place(c[0], c[1]); return [p[0], p[1], c[2]]; }), Object.assign({}, ink, { t0: 0.6, dur: 1.16, seed: 21, rampOut: 26, tailDry: 0.03 }));
      const tP = place(8.2, -1.34), tQ = place(9.32, -1.5);
      const cross = makeStroke(kit, [[tP[0], tP[1]], [(tP[0] + tQ[0]) / 2, (tP[1] + tQ[1]) / 2 - 1], [tQ[0], tQ[1]]], Object.assign({}, ink, { t0: 1.83, dur: 0.05, seed: 22, tailDry: 0.45 }));
      const dP = place(9.46, -1.68), dQ = place(9.56, -1.54);
      const dot = makeStroke(kit, [[dP[0], dP[1]], [dQ[0], dQ[1]]], Object.assign({}, ink, { t0: 1.93, dur: 0.03, seed: 23 }));

      // ---------- Teal: along under the name, back, and straight up through everything ----------
      const yU = (x) => oy + (x - ox) * Math.tan(tilt) + 25 * q;
      const yU2 = (x) => yU(x) + 14 * q;
      const stemTop = Y(F.head.y) + 1;
      const teal = [
        [w * 0.965, yU(w * 0.965) + 2], [w * 0.62, yU(w * 0.62) + 3], [w * 0.3, yU(w * 0.3)], [w * 0.09, yU(w * 0.09) + 3],
        [w * 0.045, yU(w * 0.045) + 10 * q], [w * 0.1, yU2(w * 0.1) + 2], [stemX * 0.6, yU2(stemX * 0.6)], [stemX - 13 * q, yU2(stemX) - 1], [stemX - 1.5 * q, yU2(stemX) - 13 * q],
        [stemX, (yU2(stemX) + stemTop) * 0.62], [stemX + 0.5, stemTop],
      ];
      const TEAL = '#0fb299';
      const T2 = makeStroke(kit, teal, { step: 1.8, len: 9 * q, thick: 2.3 * q, nib: Math.PI / 2 - 0.1, bristles: 12, color: TEAL, alpha: 0.82, t0: 2.1, dur: 0.46, seed: 31, dryGain: 0.9, dryFrom: 0.96, k0: 0.02, rampIn: 30 });
      // The triangle, tall as the logo's, filled by going back and forth inside the lines.
      const tx0 = X(F.head.tri[0][0]) - 2 * q, ty0 = Y(F.head.tri[0][1]) - 8 * q, tx1 = X(F.head.tri[1][0]) + 5 * q, ty1 = Y(F.head.tri[1][1]) - 4 * q, ty2 = Y(F.head.tri[2][1]);
      const triFill = [[stemX, stemTop, 1], [tx0 + 2, ty2 - 1, 1], [tx0 + 2, ty0 + 2, 1], [tx1 - 3, ty1, 1], [tx0 + 2, ty2 - 3, 1]];
      for (let i = 1; i < 6; i++) {
        const f = i / 6;
        const xx = tx0 + 2 + (tx1 - tx0 - 5) * f;
        triFill.push(i % 2 ? [xx, ty0 + 2 + (ty1 - ty0) * f, 1] : [xx, ty2 - 3 - (ty2 - ty1) * f, 1]);
      }
      const T3 = makeStroke(kit, triFill.map((p, i, a) => (i === a.length - 1 ? [p[0], p[1]] : p)), { step: 1.4, len: 4 * q, thick: 2.6 * q, nib: Math.PI / 2 - 0.1, bristles: 4, color: TEAL, alpha: 0.97, t0: 2.6, dur: 0.14, seed: 32, dryGain: 0.05, k0: 0.02, rampIn: 4 });

      // ---------- The three markers ----------
      const pens = [
        markerSprite(kit, '#70747a', '#8c9096', '#3e4145', q),
        markerSprite(kit, '#0b0c0e', '#26272b', '#050506', q),
        markerSprite(kit, '#0c9d86', '#14b9a0', '#07564a', q),
      ];
      const shadow = (() => {
        const lay = kit.layer(560 * q, 70 * q), c = lay.g;
        for (let i = 0; i < 6; i++) {
          c.fillStyle = 'rgba(30,34,44,.035)';
          const gx = 8 - i * 1.4;
          c.beginPath(); c.roundRect(40 * q - gx * 3, 35 * q - (20 * q + i * 3.2 * q), 560 * q, (20 * q + i * 3.2 * q) * 2, 20); c.fill();
        }
        return lay;
      })();
      const posIn = (S, t) => {
        let lo = 0, hi = S.n - 1;
        while (lo < hi) { const m = (lo + hi + 1) >> 1; if (S.T[m] <= t) lo = m; else hi = m - 1; }
        return [S.px[lo], S.py[lo]];
      };
      const off = [w + 200 * q, h * 0.8];
      const startOf = (S) => [S.px[0], S.py[0]], endOf = (S) => [S.px[S.n - 1], S.py[S.n - 1]];
      // Each marker's working life: what it draws, and when.
      const barPos = (S, t) => [S.x + Math.min(1, Math.pow(kit.clamp((t - S.t0) / S.dur), 1.3)) * S.L, S.y];
      const plan = [
        { pen: 0, in: -0.13, out: 0.6, jobs: G.map((S) => ({ a: S.t0, b: S.t0 + S.dur, pos: (t) => barPos(S, t), from: [S.x, S.y], to: [S.x + S.L, S.y] })) },
        { pen: 1, in: 0.49, out: 2.11, jobs: [word, cross, dot].map((S) => ({ a: S.T[0], b: S.T[S.n - 1], pos: (t) => posIn(S, t), from: startOf(S), to: endOf(S) })) },
        { pen: 2, in: 1.98, out: 2.92, jobs: [T2, T3].map((S) => ({ a: S.T[0], b: S.T[S.n - 1], pos: (t) => posIn(S, t), from: startOf(S), to: endOf(S) })) },
      ];
      function drawPen(P, t) {
        if (t < P.in || t > P.out) return;
        const J = P.jobs, first = J[0], last = J[J.length - 1];
        let p, lift = 0;
        if (t < first.a) {
          const u = kit.ease.out3(kit.map(t, P.in, first.a));
          p = [kit.lerp(off[0], first.from[0], u), kit.lerp(off[1], first.from[1], u)]; lift = 1 - u * 0.8;
        } else if (t >= last.b) {
          const u = kit.ease.in2(kit.map(t, last.b, P.out));
          p = [kit.lerp(last.to[0], off[0], u), kit.lerp(last.to[1], off[1], u)]; lift = Math.min(1, u * 4);
        } else {
          for (let i = 0; i < J.length; i++) {
            if (t >= J[i].a && t < J[i].b) { p = J[i].pos(t); break; }
            if (t >= J[i].b && J[i + 1] && t < J[i + 1].a) {
              const u = kit.ease.io2(kit.map(t, J[i].b, J[i + 1].a));
              p = [kit.lerp(J[i].to[0], J[i + 1].from[0], u), kit.lerp(J[i].to[1], J[i + 1].from[1], u)];
              lift = Math.sin(u * Math.PI);
              break;
            }
          }
        }
        if (!p) return;
        const a = 0.98 + (p[0] - w / 2) * (0.0009 / q) + (p[1] - h * 0.45) * (0.0005 / q);
        const sp = pens[P.pen];
        // Shadow on the board first: tight when the tip touches, drifting off when it lifts.
        g.save();
        g.translate(p[0] + (7 + lift * 20) * q, p[1] + (5 + lift * 16) * q);
        g.rotate(a);
        g.drawImage(shadow.canvas, 0, -35 * q, shadow.w, shadow.h);
        g.restore();
        g.save();
        g.translate(p[0] - lift * 2 * q, p[1] - lift * 5 * q);
        g.rotate(a);
        g.drawImage(sp.lay.canvas, -2 * q, -sp.W / 2, sp.L, sp.W);
        g.restore();
      }
      const thump = (t) => {
        const hit = (t0, a) => { const q2 = t - t0; return q2 < 0 ? 0 : a * Math.exp(-q2 * 26) * Math.cos(q2 * 62); };
        return hit(0.03, 2.2) + hit(0.27, 1.6) + hit(0.44, 1.2) + hit(0.6, 0.8) + hit(2.1, 1) + hit(2.56, 1.2) + hit(2.72, 1.1);
      };
      return function seek(t) {
        const th = thump(t) * q;
        g.setTransform(dpr, 0, 0, dpr, 0, 0);
        g.drawImage(board.canvas, -4, -4 + th * 0.5, w + 8, h + 8);
        g.translate(0, th);
        for (const S of G) drawSlash(g, S, t, dpr);
        drawStroke(g, word, t);
        drawStroke(g, cross, t);
        drawStroke(g, dot, t);
        if (t > 2.68) {                                         // by now the triangle has been gone over until it is solid
          g.fillStyle = TEAL; g.globalAlpha = kit.map(t, 2.68, 2.73);
          g.beginPath(); g.moveTo(tx0, ty0); g.lineTo(tx1, ty1); g.lineTo(tx0 + 0.6, ty2); g.closePath(); g.fill();
          g.globalAlpha = 1;
        }
        drawStroke(g, T3, t);
        drawStroke(g, T2, t);
        for (const P of plan) drawPen(P, t);
      };
    },
  });
})();
