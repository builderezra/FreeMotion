const O = {"A": [[[0.0864, 0.5], [0.5, 0.03, 1, 0.3102, 0.0], [0.9136, 0.5], [0.5, 0.97, 1, -0.3102, 0.0]], [[0.5, 0.1867, 1, -0.1038, 0.0], [0.312, 0.5, 1, 0.0, 0.173], [0.5, 0.8133, 1, 0.1038, 0.0], [0.688, 0.5, 1, 0.0, -0.173]], [[0.5, 0.312, 1, 0.0623, 0.0], [0.6128, 0.5, 1, 0.0, 0.1038], [0.5, 0.688, 1, -0.0623, 0.0], [0.3872, 0.5, 1, 0.0, -0.1038]]], "B": [[[0.0898, 0.5], [0.5, 0.03, 1, 0.2564, 0.0], [0.9102, 0.5], [0.5, 0.97, 1, -0.2564, 0.0]], [[0.5, 0.2009, 1, -0.0991, 0.0], [0.3205, 0.5, 1, 0.0, 0.1652], [0.5, 0.7991, 1, 0.0991, 0.0], [0.6795, 0.5, 1, 0.0, -0.1652]], [[0.5, 0.2864, 1, 0.0708, 0.0], [0.6282, 0.5, 1, 0.0, 0.118], [0.5, 0.7136, 1, -0.0708, 0.0], [0.3718, 0.5, 1, 0.0, -0.118]], [[0.4615, 0.3654, 1, -0.0234, 0.0], [0.4192, 0.4359, 1, 0.0, 0.0389], [0.4615, 0.5064, 1, 0.0234, 0.0], [0.5038, 0.4359, 1, 0.0, -0.0389]]], "C": [[[0.1645, 0.5856], [0.5, 0.2012, 1, 0.2097, 0.0], [0.8355, 0.5856], [0.5, 0.97, 1, -0.2097, 0.0]], [[0.5, 0.341, 1, -0.0811, 0.0], [0.3532, 0.5856, 1, 0.0, 0.1351], [0.5, 0.8302, 1, 0.0811, 0.0], [0.6468, 0.5856, 1, 0.0, -0.1351]], [[0.5, 0.4109, 1, 0.0579, 0.0], [0.6048, 0.5856, 1, 0.0, 0.0965], [0.5, 0.7603, 1, -0.0579, 0.0], [0.3952, 0.5856, 1, 0.0, -0.0965]], [[0.4686, 0.4755, 1, -0.0191, 0.0], [0.434, 0.5332, 1, 0.0, 0.0318], [0.4686, 0.5909, 1, 0.0191, 0.0], [0.5031, 0.5332, 1, 0.0, -0.0318]], [[0.299, 0.3967], [0.2574, 0.3426, 1], [0.2189, 0.273], [0.2706, 0.307, 1], [0.3259, 0.343]], [[0.3848, 0.2972], [0.3574, 0.2051, 1], [0.3362, 0.1031], [0.3796, 0.1814, 1], [0.424, 0.2635]], [[0.478, 0.2501], [0.4868, 0.1401, 1], [0.5, 0.03], [0.5132, 0.1401, 1], [0.522, 0.2501]], [[0.576, 0.2635], [0.6204, 0.1814, 1], [0.6638, 0.1031], [0.6426, 0.2051, 1], [0.6152, 0.2972]], [[0.6741, 0.343], [0.7294, 0.307, 1], [0.7811, 0.273], [0.7426, 0.3426, 1], [0.701, 0.3967]]]};
// eye probe — injected by tools/shot.py --js-file. Nothing here touches app files: the options are put into
// FM.SHAPE_POLYS under temporary keys (eyeA/eyeB/eyeC), which is the same table the compositor and the menu read.
const sleep = ms => new Promise(r => setTimeout(r, ms));
const OUT = { dpr: devicePixelRatio, vw: innerWidth };
for (const k of ['A', 'B', 'C']) { FM.SHAPE_POLYS['eye' + k] = O[k]; FM.SHAPE_ASPECT['eye' + k] = FM.SHAPE_ASPECT.eye; }

// ---- replica of js/addmenu.js icoPoly (fill branch), checked below against the real tile ----
function icoPoly(kind) {
  const polys = FM.SHAPE_POLYS[kind] || [], asp = FM.SHAPE_ASPECT[kind] || [1, 1];
  const k = 18 / Math.max(asp[0], asp[1]), bw = asp[0] * k, bh = asp[1] * k, ox = (24 - bw) / 2, oy = (24 - bh) / 2;
  const M = p => [ox + p[0] * bw, oy + p[1] * bh], f = q => q[0].toFixed(2) + ' ' + q[1].toFixed(2);
  const sub = pl => {
    const n = pl.length; let out = 'M' + f(M(pl[0]));
    for (let i = 0; i < n; i++) {
      const p1 = pl[i], p2 = pl[(i + 1) % n];
      if (p1[2] !== 1 && p2[2] !== 1) { out += ' L' + f(M(p2)); continue; }
      const c1 = FM.pointCtrl(pl, i, true).out, c2 = FM.pointCtrl(pl, i + 1, true).in;
      out += ' C' + f(M(c1)) + ' ' + f(M(c2)) + ' ' + f(M(p2));
    }
    return out + ' Z';
  };
  return '<svg viewBox="0 0 24 24"><path d="' + polys.map(sub).join(' ') + '" fill="currentColor" stroke="none"></path></svg>';
}

// ---- the measurement the proving test will make (dry run) ----
function eyeStats(kind, w, h) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d');
  FM.traceShapePath(g, { shape: kind }, 0, 0, w, h); g.fillStyle = '#000'; g.fill();
  const d = g.getImageData(0, 0, w, h).data, N = w * h, m = new Uint8Array(N);
  for (let i = 0; i < N; i++) m[i] = d[i * 4 + 3] > 127 ? 1 : 0;
  const lab = new Int32Array(N), st = new Int32Array(N), comps = [];
  for (let i = 0; i < N; i++) {
    if (!m[i] || lab[i]) continue;
    const id = comps.length + 1, b = { x0: w, y0: h, x1: -1, y1: -1, n: 0 };
    let sp = 0; st[sp++] = i; lab[i] = id;
    while (sp) {
      const p = st[--sp], x = p % w, y = (p - x) / w; b.n++;
      if (x < b.x0) b.x0 = x; if (x > b.x1) b.x1 = x; if (y < b.y0) b.y0 = y; if (y > b.y1) b.y1 = y;
      const nb = [x > 0 ? p - 1 : -1, x < w - 1 ? p + 1 : -1, y > 0 ? p - w : -1, y < h - 1 ? p + w : -1];
      for (const q of nb) if (q >= 0 && m[q] && !lab[q]) { lab[q] = id; st[sp++] = q; }
    }
    comps.push(b);
  }
  // enclosed background regions (holes), as figTopo counts them
  const bg = new Uint8Array(N);
  const flood0 = (s0, marks) => { let sp = 0; st[sp++] = s0; marks[s0] = 1; while (sp) { const p = st[--sp], x = p % w, y = (p - x) / w;
    const nb = [x > 0 ? p - 1 : -1, x < w - 1 ? p + 1 : -1, y > 0 ? p - w : -1, y < h - 1 ? p + w : -1];
    for (const q of nb) if (q >= 0 && !m[q] && !marks[q]) { marks[q] = 1; st[sp++] = q; } } };
  for (let x = 0; x < w; x++) { if (!m[x] && !bg[x]) flood0(x, bg); const q = x + (h - 1) * w; if (!m[q] && !bg[q]) flood0(q, bg); }
  for (let y = 0; y < h; y++) { const a = y * w, b2 = a + w - 1; if (!m[a] && !bg[a]) flood0(a, bg); if (!m[b2] && !bg[b2]) flood0(b2, bg); }
  let holes = 0; const hs = new Uint8Array(N);
  for (let i = 0; i < N; i++) if (!m[i] && !bg[i] && !hs[i]) { holes++; flood0(i, hs); }
  // the pupil: the SMALLEST component whose box holds the centre of the shape's box
  const cx = w / 2, cy = h / 2;
  const holding = comps.filter(b => b.x0 <= cx && b.x1 >= cx && b.y0 <= cy && b.y1 >= cy).sort((a, b) => (a.x1 - a.x0) * (a.y1 - a.y0) - (b.x1 - b.x0) * (b.y1 - b.y0));
  const P = holding.length > 1 ? holding[0] : null;
  let gapTop = -1, gapSide = -1, lidTop = -1;
  if (P) {
    const pcx = Math.round((P.x0 + P.x1) / 2), pcy = Math.round((P.y0 + P.y1) / 2);
    let y = P.y0 - 1; while (y >= 0 && !m[y * w + pcx]) y--; gapTop = P.y0 - 1 - y;
    let ly = y; while (ly >= 0 && m[ly * w + pcx]) ly--; lidTop = y - ly;           // ink thickness of the lid above the white
    let x = P.x1 + 1; while (x < w && !m[pcy * w + x]) x++; gapSide = x - P.x1 - 1;
  }
  return { comps: comps.length, holes, pupil: P ? [P.x1 - P.x0 + 1, P.y1 - P.y0 + 1] : null,
           pupilAsp: P ? +((P.x1 - P.x0 + 1) / (P.y1 - P.y0 + 1)).toFixed(3) : null, gapTop, gapSide,
           evenRing: (gapTop > 0) ? +(gapSide / gapTop).toFixed(2) : null, lidTop,
           ink: +(comps.reduce((s, b) => s + b.n, 0) / N).toFixed(3) };
}

  function offscreen(w, h) { var c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
  function figMask(kind, bw, bh) {
    const c = offscreen(bw, bh), g = c.getContext('2d');
    FM.traceShapePath(g, { shape: kind }, 0, 0, bw, bh);
    g.fillStyle = '#000'; g.fill();          // canvas default fill rule = nonzero, exactly as the app draws it
    const d = g.getImageData(0, 0, bw, bh).data, m = new Uint8Array(bw * bh);
    for (let i = 0; i < m.length; i++) m[i] = d[i * 4 + 3] > 127 ? 1 : 0;
    return { m: m, w: bw, h: bh };
  }
  function figTopo(f) {   // 4-connected ink components, and background regions enclosed by ink
    const N = f.w * f.h, seen = new Uint8Array(N), st = new Int32Array(N);
    const push = (arr, p, sp) => { arr[p] = 1; st[sp] = p; return sp + 1; };
    let comps = 0;
    const flood = (start, want, marks) => {
      let sp = push(marks, start, 0);
      while (sp) {
        const p = st[--sp], x = p % f.w, y = (p - x) / f.w;
        if (x > 0 && f.m[p - 1] === want && !marks[p - 1]) sp = push(marks, p - 1, sp);
        if (x < f.w - 1 && f.m[p + 1] === want && !marks[p + 1]) sp = push(marks, p + 1, sp);
        if (y > 0 && f.m[p - f.w] === want && !marks[p - f.w]) sp = push(marks, p - f.w, sp);
        if (y < f.h - 1 && f.m[p + f.w] === want && !marks[p + f.w]) sp = push(marks, p + f.w, sp);
      }
    };
    for (let i = 0; i < N; i++) if (f.m[i] && !seen[i]) { comps++; flood(i, 1, seen); }
    const bg = new Uint8Array(N);
    for (let x = 0; x < f.w; x++) { [x, x + (f.h - 1) * f.w].forEach(p => { if (!f.m[p] && !bg[p]) flood(p, 0, bg); }); }
    for (let y = 0; y < f.h; y++) { [y * f.w, y * f.w + f.w - 1].forEach(p => { if (!f.m[p] && !bg[p]) flood(p, 0, bg); }); }
    let holes = 0; const hs = new Uint8Array(N);
    for (let i = 0; i < N; i++) if (!f.m[i] && !bg[i] && !hs[i]) { holes++; flood(i, 0, hs); }
    return { components: comps, holes: holes };
  }
  function figSpawnBox(kind) {
    const savedScene = FM.scene, savedTime = FM.time;
    try {
      FM.scene = { project: { width: 600, height: 600, fps: 30, duration: 5, background: '#000' }, layers: [], selectedId: null, selectedIds: [] };
      FM.time = 0;
      FM.addShapeLayer(kind, { name: kind });
      const L = FM.scene.layers[0];
      if (!L || L.shape !== kind) throw new Error('addShapeLayer did not add a ' + kind + ' layer');
      const s = 512 / Math.max(L.shapeW, L.shapeH);
      return { w: Math.round(L.shapeW * s), h: Math.round(L.shapeH * s), raw: L.shapeW + 'x' + L.shapeH };
    } finally {
      FM.scene = savedScene; FM.time = savedTime;
      // addShapeLayer selects what it adds and re-renders the inspector against it. Putting the
      // scene back is not enough — without this the panel is still showing the scratch shape's
      // inspector, and the NEXT test to ask for the add menu fails with "the desktop add menu is
      // not rendered even with nothing selected". (Caught by running the suite, not by reading it.)
      try { if (FM.inspector) FM.inspector.refresh(); } catch (e) {}
    }
  }
const tests = {}; function test(name, opts, fn) { tests[name] = fn; }

  /* ═══ QUEUE NNN — THE EYE, TRACED FROM A REAL PICTOGRAM, AND THE SHAPE MENU AT ITS REAL PROPORTIONS ════════════════════════
     His words, 26 Sep: *"the eye shape needs to be heavily improved."* The old eye was a thin almond ring around a pupil drawn as a
     circle in the UNIT box — and the box it spawns in is 1.5 x 0.9 (SHAPE_ASPECT.eye), so the pupil rendered as a 1.66:1 ellipse and
     the white beside it was 3.2x wider than the white above it (512x307: pupil 174x105, white 94px beside vs 29px above). Now it is
     Bootstrap Icons' "eye-fill" (MIT) with a catchlight, drawn so that its circles are circles in the SPAWNED box.
     The menu half: the Shape tab's icons were built when addmenu.js loads, before app.js defines FM.SHAPE_ASPECT, so every shape icon
     was drawn in a square (queue 159 never reached the real menu). The new eye, drawn for 5:3, would have come out TALL there. */
  function eyeParts(w, h) {
    const f = figMask('eye', w, h), m = f.m, N = w * h, lab = new Int32Array(N), st = new Int32Array(N), boxes = [];
    for (let i = 0; i < N; i++) {
      if (!m[i] || lab[i]) continue;
      const id = boxes.length + 1, b = { x0: w, y0: h, x1: -1, y1: -1 };
      let sp = 0; st[sp++] = i; lab[i] = id;
      while (sp) {
        const p = st[--sp], x = p % w, y = (p - x) / w;
        if (x < b.x0) b.x0 = x; if (x > b.x1) b.x1 = x; if (y < b.y0) b.y0 = y; if (y > b.y1) b.y1 = y;
        [x > 0 ? p - 1 : -1, x < w - 1 ? p + 1 : -1, y > 0 ? p - w : -1, y < h - 1 ? p + w : -1].forEach(function (q) {
          if (q >= 0 && m[q] && !lab[q]) { lab[q] = id; st[sp++] = q; }
        });
      }
      boxes.push(b);
    }
    // the pupil is the SMALLEST ink part whose box holds the centre of the shape's box
    const holding = boxes.filter(function (b) { return b.x0 <= w / 2 && b.x1 >= w / 2 && b.y0 <= h / 2 && b.y1 >= h / 2; })
      .sort(function (a, b) { return (a.x1 - a.x0) * (a.y1 - a.y0) - (b.x1 - b.x0) * (b.y1 - b.y0); });
    const P = holding.length > 1 ? holding[0] : null, topo = figTopo(f);
    if (!P) return { topo: topo, P: null };
    const cx = Math.round((P.x0 + P.x1) / 2), cy = Math.round((P.y0 + P.y1) / 2);
    let y = P.y0 - 1; while (y >= 0 && !m[y * w + cx]) y--;
    let x = P.x1 + 1; while (x < w && !m[cy * w + x]) x++;
    return { topo: topo, P: P, pw: P.x1 - P.x0 + 1, ph: P.y1 - P.y0 + 1, gapTop: P.y0 - 1 - y, gapSide: x - P.x1 - 1 };
  }

  test('NNN the eye has a round pupil in an even white ring, with a catchlight — in the box it spawns and at the menu-icon size', { item: 'NNN' }, function () {
    const box = figSpawnBox('eye');
    /* The icon: the Shape tab's svg is 34px and icoPoly draws the eye in 18 of its 24 units at SHAPE_ASPECT, so at the phone's 2x
       the eye's box is 51x31 device pixels (measured 26 Sep: svg 34x34 at 380 and 440 wide). Tolerances from measurement:
       the new eye reads 1.008:1 and 1.00x at the spawn box and exactly 1:1 / 1.0x at 51x31; the old one 1.657:1 / 3.24x and 1.55:1 / 3.0x. */
    [[box.w, box.h, 'a ' + box.w + 'x' + box.h + ' render of the ' + box.raw + ' box it spawns in', 0.05, 1.3], [51, 31, 'the 51x31 menu icon', 0.2, 1.6]].forEach(function (c) {
      const s = eyeParts(c[0], c[1]), where = c[2];
      // POSITIVE CONTROL: a pupil standing clear of the lids inside an enclosed white. Without it the ratios below could pass on a
      // drawing that has no pupil at all.
      if (s.topo.components < 2 || s.topo.holes < 1 || !s.P) throw new Error('at ' + where + ' the eye renders ' + s.topo.components + ' ink part(s) and ' + s.topo.holes + ' enclosed white(s) — the pupil does not stand clear of the lids');
      const asp = s.pw / s.ph;
      if (Math.abs(asp - 1) > c[3]) throw new Error('at ' + where + ' the pupil renders ' + s.pw + 'x' + s.ph + ' (' + asp.toFixed(2) + ':1) — an ellipse, so it was drawn round in the unit box and stretched by SHAPE_ASPECT.eye');
      if (!(s.gapTop > 0) || s.gapSide / s.gapTop > c[4]) throw new Error('at ' + where + ' the white beside the pupil is ' + s.gapSide + 'px and above it ' + s.gapTop + 'px (' + (s.gapSide / Math.max(1, s.gapTop)).toFixed(2) + 'x) — the iris is not an even ring');
      // B: the catchlight is a second enclosed white, and it survives at the icon size (measured: 2 holes at 51x31)
      if (s.topo.holes < 2) throw new Error('at ' + where + ' the eye has ' + s.topo.holes + ' enclosed white(s) — the catchlight in the pupil is missing or has closed up');
    });
  });

  test('NNN every Shape-menu icon is drawn at the proportions its shape spawns at — the #159 aspect reaches the real menu', { item: 'NNN' }, async function () {
    /* Measured 26 Sep: the real Eye tile's path began "M3.99 12.00 C3.99 12.00 9.33 5.79 12.00 5.79" — mapped into an 18x18 SQUARE,
       because addmenu.js built the Shape tab's icons when it loaded, before app.js had defined FM.SHAPE_ASPECT. The labels below are
       the library shapes whose SHAPE_ASPECT is not square; Gear is square on purpose — THE CONTROL, which agrees before and after,
       so a disagreement elsewhere is the menu and not this measurement. */
    const KIND = { 'Banner': 'banner', 'Silk ribbon': 'ribbon', 'Cloud': 'cloud', 'Check': 'check', 'Thumbs up': 'thumbsup',
      'Pointing hand': 'pointhand', 'Envelope': 'envelope', 'Key': 'key', 'Crown': 'crown', 'Eye': 'eye', 'Map pin': 'pin',
      'Lock': 'lock', 'Music note': 'note', 'Gear': 'gear' };
    const inkAsp = function (draw, w, h) {
      const c = offscreen(w, h), g = c.getContext('2d'); draw(g);
      const d = g.getImageData(0, 0, w, h).data; let x0 = w, x1 = -1, y0 = h, y1 = -1;
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (d[(y * w + x) * 4 + 3] > 127) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
      return x1 < 0 ? NaN : (x1 - x0 + 1) / (y1 - y0 + 1);
    };
    const host = document.createElement('div');
    host.style.cssText = 'position:fixed;left:-10000px;top:0;width:340px;height:620px';
    document.body.appendChild(host);
    const bad = [], seen = [];
    try {
      FM.addMenu.render(host, { variant: 'panel' });
      await sleep(80);
      const tb = host.querySelector('.addmenu-tab[data-key="shape"]');
      if (!tb) throw new Error('the Add menu has no Shape tab to read');
      tb.click(); await sleep(80);
      [].slice.call(host.querySelectorAll('button')).forEach(function (b) {
        const kind = KIND[b.title]; if (!kind) return;
        const path = b.querySelector('.addmenu-ic svg path'); if (!path) return;
        // 40x: a thin icon (Banner is 41px tall at 10x) quantises by up to 5% at 10x; at 40x it is under 1.5%
        const icon = inkAsp(function (g) { g.scale(40, 40); g.fill(new Path2D(path.getAttribute('d'))); }, 960, 960);
        const box = figSpawnBox(kind);
        const real = inkAsp(function (g) { FM.traceShapePath(g, { shape: kind }, 0, 0, box.w, box.h); g.fillStyle = '#000'; g.fill(); }, box.w, box.h);
        seen.push(b.title); (window.__r = window.__r || []).push(b.title + ' ' + (icon / real).toFixed(3));
        // 3%: measured 26 Sep, at their aspect every icon agrees within 0.6%; the nearest wrong one (Thumbs up, drawn square) is 7.9% off
        if (!(Math.abs(icon / real - 1) <= 0.03)) bad.push(b.title + ' (icon ' + icon.toFixed(2) + ':1, spawns ' + real.toFixed(2) + ':1)');
      });
    } finally { host.remove(); }
    if (seen.length < 12 || seen.indexOf('Eye') < 0 || seen.indexOf('Gear') < 0) throw new Error('only found ' + seen.length + ' of the shape tiles (' + seen.join(', ') + ') — the labels moved, so this is not measuring the menu');
    if (bad.some(function (s) { return /^Gear /.test(s); })) throw new Error('the CONTROL disagrees — Gear is square both ways, so the measurement is broken, not the menu: ' + bad.join(' | '));
    if (bad.length) throw new Error('these Shape-menu icons are not drawn at the proportions the shape spawns at: ' + bad.join(' | '));
  });

const LBL = { 'Banner': 'banner', 'Silk ribbon': 'ribbon', 'Cloud': 'cloud', 'Check': 'check', 'Thumbs up': 'thumbsup', 'Pointing hand': 'pointhand',
  'Envelope': 'envelope', 'Key': 'key', 'Crown': 'crown', 'Eye': 'eye', 'Map pin': 'pin', 'Lock': 'lock', 'Music note': 'note', 'Gear': 'gear', 'Boat': 'boat', 'Car': 'car' };
async function runAll() { const r = []; for (const n of Object.keys(tests)) { try { await tests[n](); r.push('PASS'); } catch (e) { r.push('FAIL: ' + String(e && e.message || e).slice(0, 210)); } } return r; }
try { if (FM.home && FM.home.isOpen && FM.home.isOpen()) FM.home.close(); } catch (e) {}
await sleep(600);
OUT.names = Object.keys(tests).map(n => n.slice(0, 40));
window.__r = []; OUT.HEAD = await runAll(); OUT.ratiosHEAD = window.__r.join(', ');
const orig = FM.SHAPE_POLYS.eye;
FM.SHAPE_POLYS.eye = O.B; OUT.B_dataOnly = await runAll();
const st = FM.addMenu._tabs().find(t => t.key === 'shape');
OUT.shapeOptsIsArray = Array.isArray(st.options);
(st.options || []).forEach(o => { const k = LBL[o.label]; if (k) Object.defineProperty(o, 'icon', { get: () => icoPoly(k), configurable: true }); });
window.__r = []; OUT.B_plus_menuFix = await runAll(); OUT.ratiosFixed = window.__r.join(', ');
FM.SHAPE_POLYS.eye = O.A; OUT.A_plus_menuFix = await runAll();
FM.SHAPE_POLYS.eye = O.C; OUT.C_plus_menuFix = await runAll();
FM.SHAPE_POLYS.eye = orig; OUT.OLD_plus_menuFix = await runAll();
return OUT;
