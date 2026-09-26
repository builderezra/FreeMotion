  /* ---- the Car, rebuilt from a published pictogram (queue 961) ---------------------------------------------------
     Ezra, 26 Sep: "The car shape needs to be improved." Rebuilt the way the people finally landed (#929): traced from a
     real published pictogram instead of drawn from landmarks — Pictogrammers Material Design Icons `car-side`,
     Apache-2.0 — through the plan's converter into this format. Three tests: the new proof (the wheels read at the
     menu's 34px), and the two older car tests retuned to the new construction, where the tyre is PART of the
     silhouette and the hub is the hole, exactly as every published car pictogram draws it. ---- */

  // Shared by the three: the car's two wheel hubs, found in the DATA — the round holes in the lower half.
  function carHubs(car) {
    const bbox = sub => sub.reduce((a, p) => ({
      x0: Math.min(a.x0, p[0]), x1: Math.max(a.x1, p[0]), y0: Math.min(a.y0, p[1]), y1: Math.max(a.y1, p[1]),
    }), { x0: 1e9, x1: -1e9, y0: 1e9, y1: -1e9 });
    const area = sub => {   // signed — the sign IS the winding, which decides whether a hole fills in
      let s = 0;
      for (let i = 0; i < sub.length; i++) { const a = sub[i], b = sub[(i + 1) % sub.length]; s += a[0] * b[1] - b[0] * a[1]; }
      return s / 2;
    };
    const body = bbox(car[0]), wind = Math.sign(area(car[0])), midY = (body.y0 + body.y1) / 2;
    const hubs = car.slice(1).filter(sub => Math.sign(area(sub)) !== wind).map(bbox)
      .filter(b => Math.abs((b.x1 - b.x0) - (b.y1 - b.y0)) < 0.01 && (b.y0 + b.y1) / 2 > midY)
      .map(b => ({ cx: (b.x0 + b.x1) / 2, cy: (b.y0 + b.y1) / 2, r: (b.x1 - b.x0) / 2 }))
      .sort((a, b) => a.cx - b.cx);
    return { body: body, hubs: hubs, holes: car.slice(1).filter(sub => Math.sign(area(sub)) !== wind).length };
  }

  test('961 — the Car reads as a car at the Shape menu\'s 34px: open hubs, wheels below the body', { item: '961' }, function () {
    /* The v17.02 car's own comment named its weak point: the tyre-to-arch gap is 0.023 of the box, 0.59px at the
       menu's icon, so the tyre ring runs into the body and the wheels read as small dots. Measured for the plan,
       FM.renderScene at 1x into the icon's own 25.5px box: the v17.02 hubs are 2.19px across, 4.1px² of open area
       each; the MDI car's are 3.34px, 7.9px². 6px² sits between them. Measured at 1x on purpose — at arm's length a
       CSS pixel is about what an eye resolves, whatever the screen's DPR. */
    const car = FM.SHAPE_POLYS && FM.SHAPE_POLYS.car;
    if (!car || !FM.renderScene || !FM.makeLayer) throw new Error('seams missing: SHAPE_POLYS.car / renderScene / makeLayer');
    // The menu icon's box, as js/addmenu.js icoPoly builds it: the longer side of SHAPE_ASPECT fills 18 of the
    // 24-unit viewBox, and the tile shows that viewBox at 34px.
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
    if (H.hubs.length !== 2) throw new Error('expected two round wheel hubs (holes in the lower half of the car), found ' + H.hubs.length);
    const bottom = col => { let b = -1; for (let py = 0; py < S; py++) if (ink(col, py) >= 0.5) b = py; return b + 1; };
    const mid = Math.floor(ox + ((H.hubs[0].cx + H.hubs[1].cx) / 2) * bw);
    H.hubs.forEach((h, j) => {
      const cx = ox + h.cx * bw, cy = oy + h.cy * bh, r = h.r * bw, which = j ? 'front' : 'rear';
      let open = 0, ring = 0, ringN = 0;
      for (let py = 0; py < S; py++) for (let px = 0; px < S; px++) {
        const dist = Math.hypot(px + 0.5 - cx, py + 0.5 - cy);
        if (dist <= r + 0.75) open += 1 - ink(px, py);
        else if (dist <= r + 1.4) { ring += ink(px, py); ringN++; }
      }
      // CONTROL: the hole must be IN ink. A hub located off the car would read as wide open and pass for nothing.
      if (!ringN || ring / ringN < 0.5) throw new Error('the ' + which + ' hub is not surrounded by tyre at 34px (ring ink ' + (ringN ? (ring / ringN).toFixed(2) : 'none') + ') — the measurement is not looking at a wheel');
      if (open < 6) throw new Error('the ' + which + ' wheel\'s hub is ' + open.toFixed(1) + 'px² of open space at the menu\'s 34px (' + (2 * r).toFixed(2) + 'px across) — it reads as a dot, not a wheel; 6px² is the line (v17.02 measured 4.1, the MDI car 7.9)');
      const hang = bottom(Math.floor(cx)) - bottom(mid);
      if (hang < 2) throw new Error('the ' + which + ' wheel hangs ' + hang + 'px below the body at 34px — the wheels have to stand proud of the underside to read (v17.02: 2, the MDI car: 4)');
    });
  });

  test('the car shape is car-shaped: level wheels, open holes, the wheels part of the silhouette', { item: 'car-shape' }, function () {
    // v5.33, retuned for queue 961. Still pins the properties that were actually wrong in the car he rejected
    // twice (a square blob, rings printed on a body, a floor line through the tyres) — but the tyres are no longer
    // separate rings sitting in arches. Every published car pictogram draws the tyre AS PART OF the silhouette, a
    // round bump below the body, with the hub as the hole: that is what keeps the wheel legible at icon size, where
    // the old 0.023 arch gap closed up.
    const car = FM.SHAPE_POLYS && FM.SHAPE_POLYS.car;
    if (!car || car.length < 4) throw new Error('FM.SHAPE_POLYS.car is missing or too simple');
    const H = carHubs(car), b = H.body;
    if ((b.x1 - b.x0) < (b.y1 - b.y0) * 1.4) {
      throw new Error('the car is ' + (b.x1 - b.x0).toFixed(2) + ' wide by ' + (b.y1 - b.y0).toFixed(2) + ' tall — a car in profile is a WIDE shape; this is the blob the old one was');
    }
    if (H.holes < 3) throw new Error('only ' + H.holes + ' sub-paths wind against the body — the windows/hubs would fill in solid');
    if (H.hubs.length !== 2) throw new Error('could not find two round wheel hubs in the shape (found ' + H.hubs.length + ')');
    const [w1, w2] = H.hubs;
    if (Math.abs(w1.cy - w2.cy) > 0.005) throw new Error('the wheels are not level (hub centres at y ' + w1.cy.toFixed(3) + ' and ' + w2.cy.toFixed(3) + ')');
    if (Math.abs(w1.r - w2.r) > 0.005) throw new Error('the two wheels are different sizes');
    if (w1.cx - w1.r < b.x0 || w2.cx + w2.r > b.x1) throw new Error('a wheel pokes outside the body outline');
    // The tyre is the silhouette: under each hub the BODY outline reaches well below where it runs between the wheels.
    // (read off the outline's on-curve points joined straight — plenty for "is the bottom here or there")
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
    const between = lowestAt((w1.cx + w2.cx) / 2);
    [w1, w2].forEach((w, j) => {
      const under = lowestAt(w.cx);
      if (!(under - between > w.r)) throw new Error('the ' + (j ? 'front' : 'rear') + ' tyre is not part of the silhouette: the body reaches y ' + under.toFixed(3) + ' under its hub against ' + between.toFixed(3) + ' between the wheels — a separate ring in an arch, which closes up at icon size');
    });
  });

  test('shapes: an added Car renders with ROUND wheels', { item: 'car-aspect' }, function () {
    // v5.65, retuned for queue 961. SHAPE_ASPECT.car must stay [1, 1]: the drawing carries its own proportion
    // inside the unit box, so any other box stretches the wheels by exactly the box ratio ("really wide and
    // streched out"). The v5.33 car's tyres were separate ink blobs; the rebuilt car's tyre is part of the
    // silhouette, so the wheel is measured by its HUB — the round hole — off the rendered image.
    var savedScene = FM.scene, commit = FM.history.commit, autosave = FM.storage.autosave,
        save = FM.storage.save, dirty = FM.storage.markDirty;
    FM.history.commit = function () {}; FM.storage.autosave = function () {};
    FM.storage.save = function () {}; FM.storage.markDirty = function () {};
    var L;
    try {
      FM.scene = { project: { width: 1080, height: 1080, fps: 30, duration: 5, background: '#000000' }, layers: [], selectedId: null, selectedIds: [] };
      FM.addShapeLayer('car', { name: 'Car' });
      L = FM.scene.layers[0];
    } finally {
      FM.scene = savedScene;
      FM.history.commit = commit; FM.storage.autosave = autosave; FM.storage.save = save; FM.storage.markDirty = dirty;
    }
    if (!L || L.shape !== 'car') throw new Error('FM.addShapeLayer("car") did not add a car layer');
    var S = 680;
    function hubsAt(w, h) {
      // position lives in layer.transform, NOT on the layer - a top-level x/y here is silently ignored
      var cl = Object.assign({}, L, { start: 0, duration: 5, fill: '#ffffff',
        transform: Object.assign({}, L.transform, { x: S / 2, y: S / 2 }), shapeW: w, shapeH: h });
      var c = offscreen(S, S), x = c.getContext('2d', { willReadFrequently: true });
      FM.renderScene(x, scene([cl], { project: { width: S, height: S, fps: 30, duration: 5, background: '#000000' } }), 0);
      var d = x.getImageData(0, 0, S, S).data, n = S * S, bg = new Uint8Array(n), i;
      for (i = 0; i < n; i++) bg[i] = d[i * 4] <= 127 ? 1 : 0;
      for (i = 0; i < S; i++) {
        if (!bg[i] || !bg[(S - 1) * S + i] || !bg[i * S] || !bg[i * S + S - 1])
          throw new Error('the car render touches the canvas edge at ' + w + 'x' + h + ' - it is clipped, refusing to measure it');
      }
      // the HOLES: background not reachable from the border
      var lab = new Int32Array(n).fill(-1), st = new Int32Array(n), sp = 0, holes = [], id, p, q, qx, qy;
      var flood = function (seed, tag, rec) {
        sp = 0; st[sp++] = seed; lab[seed] = tag;
        while (sp > 0) {
          q = st[--sp]; qx = q % S; qy = (q / S) | 0;
          if (rec) { rec.n++; if (qx < rec.x0) rec.x0 = qx; if (qx > rec.x1) rec.x1 = qx; if (qy < rec.y0) rec.y0 = qy; if (qy > rec.y1) rec.y1 = qy; }
          if (qx > 0     && bg[q - 1] && lab[q - 1] < 0) { lab[q - 1] = tag; st[sp++] = q - 1; }
          if (qx < S - 1 && bg[q + 1] && lab[q + 1] < 0) { lab[q + 1] = tag; st[sp++] = q + 1; }
          if (qy > 0     && bg[q - S] && lab[q - S] < 0) { lab[q - S] = tag; st[sp++] = q - S; }
          if (qy < S - 1 && bg[q + S] && lab[q + S] < 0) { lab[q + S] = tag; st[sp++] = q + S; }
        }
      };
      flood(0, 0, null);
      for (p = 0; p < n; p++) {
        if (!bg[p] || lab[p] >= 0) continue;
        var rec = { n: 0, x0: 1e9, y0: 1e9, x1: -1, y1: -1 };
        flood(p, holes.length + 1, rec);
        if (rec.n > 40) holes.push({ n: rec.n, x0: rec.x0, w: rec.x1 - rec.x0 + 1, h: rec.y1 - rec.y0 + 1, cy: (rec.y0 + rec.y1) / 2 });
      }
      // the hubs are the two holes lowest in the picture (the windows are above them)
      return holes.sort(function (a, b) { return b.cy - a.cy; }).slice(0, 2).sort(function (a, b) { return a.x0 - b.x0; });
    }
    var k = 600 / Math.max(L.shapeW, L.shapeH);
    var hubs = hubsAt(Math.round(L.shapeW * k), Math.round(L.shapeH * k));
    if (hubs.length !== 2) throw new Error('could not find the two wheel hubs as holes in the rendered car');
    hubs.forEach(function (hb, j) {
      if (Math.abs(hb.w - hb.h) > 1)
        throw new Error((j ? 'front' : 'rear') + ' hub is ' + hb.w + 'x' + hb.h + 'px (' + (hb.w / hb.h).toFixed(2) +
          ':1), not a circle - SHAPE_ASPECT.car must stay square, but a Car spawned at ' + L.shapeW + 'x' + L.shapeH);
    });
    // CONTROL: the same measure on a car deliberately stretched 3:2 must SEE the ellipse, or the check above proves nothing.
    var bad = hubsAt(600, 400);
    if (bad.length !== 2 || Math.abs(bad[0].w - bad[0].h) < 4)
      throw new Error('control failed: a car stretched to 600x400 still measured round hubs (' + (bad[0] ? bad[0].w + 'x' + bad[0].h : 'none') + ') — this measurement cannot see a stretched wheel');
  });
