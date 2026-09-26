
  /* ═══ QUEUE 962 — THE EYE, TRACED FROM A REAL PICTOGRAM, AND THE SHAPE MENU AT ITS REAL PROPORTIONS ════════════════════════
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

  test('962 the eye has a round pupil in an even white ring, with a catchlight — in the box it spawns and at the menu-icon size', { item: '962' }, function () {
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

  test('962 every Shape-menu icon is drawn at the proportions its shape spawns at — the #159 aspect reaches the real menu', { item: '962' }, async function () {
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
        seen.push(b.title);
        // 3%: measured 26 Sep, at their aspect every icon agrees within 0.6%; the nearest wrong one (Thumbs up, drawn square) is 7.9% off
        if (!(Math.abs(icon / real - 1) <= 0.03)) bad.push(b.title + ' (icon ' + icon.toFixed(2) + ':1, spawns ' + real.toFixed(2) + ':1)');
      });
    } finally { host.remove(); }
    if (seen.length < 12 || seen.indexOf('Eye') < 0 || seen.indexOf('Gear') < 0) throw new Error('only found ' + seen.length + ' of the shape tiles (' + seen.join(', ') + ') — the labels moved, so this is not measuring the menu');
    if (bad.some(function (s) { return /^Gear /.test(s); })) throw new Error('the CONTROL disagrees — Gear is square both ways, so the measurement is broken, not the menu: ' + bad.join(' | '));
    if (bad.length) throw new Error('these Shape-menu icons are not drawn at the proportions the shape spawns at: ' + bad.join(' | '));
  });
