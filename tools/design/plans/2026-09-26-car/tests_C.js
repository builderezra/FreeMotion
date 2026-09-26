  /* ONLY IF HE PICKS C (the AIGA front view). Replaces the first two blocks of tests_new.js; carHubs() and the
     'car-aspect' retune stay exactly as they are (verified: both pass on C). A front view has no hubs — its two round
     holes in the lower half are the HEADLIGHTS, and its wheels are the two feet below the bumper. */
  test('961 — the Car reads as a car at the Shape menu\'s 34px: open headlights, feet below the bumper', { item: '961' }, function () {
    /* Measured for the plan, FM.renderScene at 1x in the icon's own 25.5px box: the v17.02 car's round holes (its hubs)
       are 2.19px across, 4.1px² open; the AIGA car's headlights 3.42px, 9.0px², and its feet hang 4px below the bumper. */
    const car = FM.SHAPE_POLYS && FM.SHAPE_POLYS.car;
    if (!car || !FM.renderScene || !FM.makeLayer) throw new Error('seams missing: SHAPE_POLYS.car / renderScene / makeLayer');
    const asp = (FM.SHAPE_ASPECT && FM.SHAPE_ASPECT.car) || [1, 1];
    const S = 34, k = (18 / Math.max(asp[0], asp[1])) * S / 24, bw = asp[0] * k, bh = asp[1] * k;
    const ox = (S - bw) / 2, oy = (S - bh) / 2;
    const c = offscreen(S, S), x = c.getContext('2d', { willReadFrequently: true });
    const L = FM.makeLayer('shape', { shape: 'car', name: 'Car', x: S / 2, y: S / 2, shapeW: bw, shapeH: bh, fill: '#ffffff', start: 0, duration: 5 });
    FM.renderScene(x, scene([L], { project: { width: S, height: S, fps: 30, duration: 5, background: '#000000' } }), 0);
    const d = x.getImageData(0, 0, S, S).data, ink = (px, py) => d[(py * S + px) * 4] / 255;
    let total = 0;
    for (let py = 0; py < S; py++) for (let px = 0; px < S; px++) total += ink(px, py);
    if (total < 60) throw new Error('the car drew only ' + total.toFixed(1) + 'px² of ink at 34px — nothing to measure');
    const H = carHubs(car);
    if (H.hubs.length !== 2) throw new Error('expected two round headlights (holes in the lower half of the car), found ' + H.hubs.length);
    const bottom = col => { let b = -1; for (let py = 0; py < S; py++) if (ink(col, py) >= 0.5) b = py; return b + 1; };
    const mid = Math.floor(ox + ((H.hubs[0].cx + H.hubs[1].cx) / 2) * bw);
    H.hubs.forEach((h, j) => {
      const cx = ox + h.cx * bw, cy = oy + h.cy * bh, r = h.r * bw, which = j ? 'right' : 'left';
      let open = 0, ring = 0, ringN = 0;
      for (let py = 0; py < S; py++) for (let px = 0; px < S; px++) {
        const dist = Math.hypot(px + 0.5 - cx, py + 0.5 - cy);
        if (dist <= r + 0.75) open += 1 - ink(px, py);
        else if (dist <= r + 1.4) { ring += ink(px, py); ringN++; }
      }
      if (!ringN || ring / ringN < 0.5) throw new Error('the ' + which + ' headlight is not surrounded by body at 34px (ring ink ' + (ringN ? (ring / ringN).toFixed(2) : 'none') + ') — the measurement is not looking at a headlight');
      if (open < 6) throw new Error('the ' + which + ' headlight is ' + open.toFixed(1) + 'px² of open space at the menu\'s 34px — it reads as a speck; 6px² is the line (v17.02\'s hubs 4.1, the AIGA headlights 9.0)');
      const hang = bottom(Math.floor(cx)) - bottom(mid);
      if (hang < 2) throw new Error('the ' + which + ' foot hangs ' + hang + 'px below the bumper at 34px — a front view needs its wheels to show (AIGA: 4)');
    });
  });

  test('the car shape is car-shaped: a symmetric front view, open windscreen and headlights, feet below the bumper', { item: 'car-shape' }, function () {
    // v5.33, retuned for queue 961 when the car became the AIGA transport sign's front view.
    const car = FM.SHAPE_POLYS && FM.SHAPE_POLYS.car;
    if (!car || car.length < 4) throw new Error('FM.SHAPE_POLYS.car is missing or too simple');
    const H = carHubs(car), b = H.body, mx = (b.x0 + b.x1) / 2;
    const lopsided = car[0].filter(p => !car[0].some(q => Math.abs((2 * mx - p[0]) - q[0]) < 0.005 && Math.abs(p[1] - q[1]) < 0.005));
    if (lopsided.length) throw new Error(lopsided.length + ' body points have no mirror partner — a front view leans, e.g. [' + lopsided[0].slice(0, 2).join(', ') + ']');
    if (H.holes < 3) throw new Error('only ' + H.holes + ' sub-paths wind against the body — the windscreen/headlights would fill in solid');
    if (H.hubs.length !== 2) throw new Error('could not find two round headlights in the shape (found ' + H.hubs.length + ')');
    const [w1, w2] = H.hubs;
    if (Math.abs(w1.cy - w2.cy) > 0.005) throw new Error('the headlights are not level');
    if (Math.abs(w1.r - w2.r) > 0.005) throw new Error('the two headlights are different sizes');
    const lowestAt = xq => {
      let m = -1;
      const o = car[0];
      for (let i = 0; i < o.length; i++) {
        const p = o[i], q = o[(i + 1) % o.length];
        if (p[0] === q[0] || (p[0] - xq) * (q[0] - xq) > 0) continue;
        m = Math.max(m, p[1] + (q[1] - p[1]) * (xq - p[0]) / (q[0] - p[0]));
      }
      return m;
    };
    const between = lowestAt(mx);
    [w1, w2].forEach((w, j) => {
      if (!(lowestAt(w.cx) - between > 0.05)) throw new Error('no ' + (j ? 'right' : 'left') + ' foot below the bumper under its headlight — a front-view car stands on its wheels');
    });
  });
