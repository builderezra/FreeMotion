
const REG = [];
let PREFIX = '';
function test(name, opts, fn) { REG.push({ name: PREFIX + name, fn: fn }); }
function scene(layers, over) { return Object.assign({ project: { width: 320, height: 240, fps: 30, duration: 5, background: '#000000' }, layers: layers, selectedId: null, selectedIds: [] }, over || {}); }
function offscreen(w, h) { var c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
PREFIX = 'OLD ';
  test('the car shape is car-shaped: level wheels, open holes, nothing below the ground line', { item: 'car-shape' }, function () {
    // v5.33. Rejected twice by eye, so this pins the properties that were actually wrong rather than
    // the look. The old shape had rings printed on a blobby body with the floor line running straight
    // through them, tyres below the floor, and an ink box that was literally square (57x58) — which is
    // why all three judges called it a bubble-van blob.
    const car = FM.SHAPE_POLYS && FM.SHAPE_POLYS.car;
    if (!car || car.length < 5) throw new Error('FM.SHAPE_POLYS.car is missing or too simple');
    const bbox = sub => sub.reduce((a, p) => ({
      x0: Math.min(a.x0, p[0]), x1: Math.max(a.x1, p[0]),
      y0: Math.min(a.y0, p[1]), y1: Math.max(a.y1, p[1]),
    }), { x0: 1e9, x1: -1e9, y0: 1e9, y1: -1e9 });
    const area = sub => {   // signed — the sign IS the winding, which decides whether a hole fills in
      let s = 0;
      for (let i = 0; i < sub.length; i++) { const a = sub[i], b = sub[(i + 1) % sub.length]; s += a[0] * b[1] - b[0] * a[1]; }
      return s / 2;
    };
    const body = bbox(car[0]);
    if ((body.x1 - body.x0) < (body.y1 - body.y0) * 1.4) {
      throw new Error('the car is ' + (body.x1 - body.x0).toFixed(2) + ' wide by ' + (body.y1 - body.y0).toFixed(2) + ' tall — a car in profile is a WIDE shape; this is the blob the old one was');
    }
    // Holes must wind against the body, or nonzero fill paints them solid.
    const bodyWind = Math.sign(area(car[0]));
    const holes = car.slice(1).filter(sub => Math.sign(area(sub)) !== bodyWind);
    if (holes.length < 3) throw new Error('only ' + holes.length + ' sub-paths wind against the body — the windows/hubs would fill in solid');
    // The two tyres: same size, same centre line.
    const rings = car.slice(1).map(bbox).filter(b => (b.x1 - b.x0) > 0.12 && Math.abs((b.x1 - b.x0) - (b.y1 - b.y0)) < 0.02);
    if (rings.length < 2) throw new Error('could not find two round wheels in the shape');
    const [w1, w2] = rings.slice(0, 2);
    const cy1 = (w1.y0 + w1.y1) / 2, cy2 = (w2.y0 + w2.y1) / 2;
    if (Math.abs(cy1 - cy2) > 0.005) throw new Error('the wheels are not level (centres at y ' + cy1.toFixed(3) + ' and ' + cy2.toFixed(3) + ')');
    if (Math.abs((w1.x1 - w1.x0) - (w2.x1 - w2.x0)) > 0.01) throw new Error('the two wheels are different sizes');
    // Tyres sit IN arches: they reach below the body's underside, and stay inside its width.
    if (!(Math.max(w1.y1, w2.y1) > body.y1)) throw new Error('the tyres do not reach below the body — they are discs laid on a slab, not wheels in arches');
    if (Math.min(w1.x0, w2.x0) < body.x0 - 0.001 || Math.max(w1.x1, w2.x1) > body.x1 + 0.001) {
      throw new Error('a wheel pokes outside the body outline');
    }
  });
  test('shapes: an added Car renders with ROUND wheels', { item: 'car-aspect' }, function () {
    // v5.65: SHAPE_ASPECT.car still carried [1.76, 0.57] from the v3.96 image trace, but the v5.33
    // redraw carries its own proportion inside the unit box (ink 0.9576 x 0.5200 of it) and draws
    // both tyres as true circles there. The box only scales that drawing, so a non-square box turned
    // every wheel into an ellipse by exactly the box ratio - 3.09:1, "really wide and streched out".
    // Measured in PIXELS, not read off the declaration: the two tyres are separate ink blobs from the
    // body (the arch cavity is open at the bottom), so each wheel's bbox comes off the rendered image.
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
    // Same box ratio, rendered big enough that the 0.023-normalized tyre/arch gap survives even when
    // the aspect is wrong (so a failure reports the ellipse, not "could not find the wheels").
    var k = 600 / Math.max(L.shapeW, L.shapeH), S = 680;
    // position lives in layer.transform, NOT on the layer - a top-level x/y here is silently ignored
    // and the car renders half off the canvas (which is how this test first failed, on a good fix)
    var cl = Object.assign({}, L, { start: 0, duration: 5, fill: '#ffffff',
      transform: Object.assign({}, L.transform, { x: S / 2, y: S / 2 }),
      shapeW: Math.round(L.shapeW * k), shapeH: Math.round(L.shapeH * k) });
    var c = offscreen(S, S), x = c.getContext('2d', { willReadFrequently: true });
    FM.renderScene(x, scene([cl], { project: { width: S, height: S, fps: 30, duration: 5, background: '#000000' } }), 0);
    var d = x.getImageData(0, 0, S, S).data, n = S * S, mask = new Uint8Array(n), i;
    for (i = 0; i < n; i++) mask[i] = d[i * 4] > 127 ? 1 : 0;
    var lab = new Int32Array(n).fill(-1), st = new Int32Array(n), blobs = [];
    for (var p = 0; p < n; p++) {
      if (!mask[p] || lab[p] >= 0) continue;
      var id = blobs.length, sp = 0, cnt = 0, x0 = 1e9, y0 = 1e9, x1 = -1, y1 = -1;
      st[sp++] = p; lab[p] = id;
      while (sp > 0) {
        var q = st[--sp], qx = q % S, qy = (q / S) | 0;
        cnt++;
        if (qx < x0) x0 = qx; if (qx > x1) x1 = qx; if (qy < y0) y0 = qy; if (qy > y1) y1 = qy;
        if (qx > 0     && mask[q - 1] && lab[q - 1] < 0) { lab[q - 1] = id; st[sp++] = q - 1; }
        if (qx < S - 1 && mask[q + 1] && lab[q + 1] < 0) { lab[q + 1] = id; st[sp++] = q + 1; }
        if (qy > 0     && mask[q - S] && lab[q - S] < 0) { lab[q - S] = id; st[sp++] = q - S; }
        if (qy < S - 1 && mask[q + S] && lab[q + S] < 0) { lab[q + S] = id; st[sp++] = q + S; }
      }
      if (cnt > 40) blobs.push({ n: cnt, x0: x0, w: x1 - x0 + 1, h: y1 - y0 + 1 });
    }
    if (!blobs.length) throw new Error('the car rendered nothing at ' + cl.shapeW + 'x' + cl.shapeH);
    // never measure a clipped picture: any ink on the border means part of the car is off-canvas
    for (i = 0; i < S; i++) {
      if (mask[i] || mask[(S - 1) * S + i] || mask[i * S] || mask[i * S + S - 1])
        throw new Error('the car render touches the canvas edge - it is clipped, refusing to measure it');
    }
    if (blobs.length !== 3) throw new Error('expected 3 ink blobs (body + 2 tyres), got ' + blobs.length +
      ' at box ' + cl.shapeW + 'x' + cl.shapeH + ' - the wheels cannot be isolated, which itself means the car is distorted');
    blobs.sort(function (a, b) { return b.n - a.n; });
    blobs.slice(1).sort(function (a, b) { return a.x0 - b.x0; }).forEach(function (wl, j) {
      if (Math.abs(wl.w - wl.h) > 1)
        throw new Error((j ? 'front' : 'rear') + ' wheel is ' + wl.w + 'x' + wl.h + 'px (' + (wl.w / wl.h).toFixed(2) +
          ':1), not a circle - SHAPE_ASPECT.car must stay square, but a Car spawned at ' + L.shapeW + 'x' + L.shapeH);
    });
  });
PREFIX = 'NEW ';
  /* ---- the Car, rebuilt from a published pictogram (queue NNN) ---------------------------------------------------
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

  test('NNN — the Car reads as a car at the Shape menu\'s 34px: open hubs, wheels below the body', { item: 'NNN' }, function () {
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
    // v5.33, retuned for queue NNN. Still pins the properties that were actually wrong in the car he rejected
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
    // v5.65, retuned for queue NNN. SHAPE_ASPECT.car must stay [1, 1]: the drawing carries its own proportion
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

PREFIX = 'CV ';
  /* ONLY IF HE PICKS C (the AIGA front view). Replaces the first two blocks of tests_new.js; carHubs() and the
     'car-aspect' retune stay exactly as they are (verified: both pass on C). A front view has no hubs — its two round
     holes in the lower half are the HEADLIGHTS, and its wheels are the two feet below the bumper. */
  test('NNN — the Car reads as a car at the Shape menu\'s 34px: open headlights, feet below the bumper', { item: 'NNN' }, function () {
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
    // v5.33, retuned for queue NNN when the car became the AIGA transport sign's front view.
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

const OPTS = Object.assign({ now: JSON.parse(JSON.stringify(FM.SHAPE_POLYS.car)) }, {"A":[[[0.6745,0.2382],[0.8055,0.4127],[0.8927,0.4127,1,0.0484,0.0],[0.98,0.5,1,0.0,0.0484],[0.98,0.6309],[0.8927,0.6309],[0.8824,0.6819,1,-0.0066,0.0157],[0.8544,0.7235,1,-0.0178,0.0178],[0.7618,0.7618,1,-0.0361,0.0],[0.6693,0.7235,1,-0.0178,-0.0178],[0.6412,0.6819,1,-0.0066,-0.0157],[0.6309,0.6309],[0.3691,0.6309],[0.3588,0.6819,1,-0.0066,0.0157],[0.3307,0.7235,1,-0.0178,0.0178],[0.2382,0.7618,1,-0.0361,0.0],[0.1456,0.7235,1,-0.0178,-0.0178],[0.1176,0.6819,1,-0.0066,-0.0157],[0.1073,0.6309],[0.02,0.6309],[0.02,0.5,1,0.0,-0.0242],[0.0455,0.4382,1,0.0158,-0.0158],[0.1073,0.4127],[0.2382,0.2382]],[[0.4345,0.3036],[0.2709,0.3036],[0.1884,0.4127],[0.4345,0.4127]],[[0.5,0.3036],[0.5,0.4127],[0.7243,0.4127],[0.6418,0.3036]],[[0.2382,0.5655,1,-0.0361,0.0],[0.1727,0.6309,1,0.0,0.0361],[0.2382,0.6964,1,0.0361,0.0],[0.3036,0.6309,1,0.0,-0.0361]],[[0.7618,0.5655,1,-0.0361,0.0],[0.6964,0.6309,1,0.0,0.0361],[0.7618,0.6964,1,0.0361,0.0],[0.8273,0.6309,1,0.0,-0.0361]]],"B":[[[0.98,0.4699,1,0.0,0.0331],[0.98,0.6199,1,0.0,0.0331],[0.92,0.6799,1,-0.0331,0.0],[0.8562,0.6799],[0.8136,0.7449,1,-0.0205,0.0159],[0.74,0.7701,1,-0.0274,0.0],[0.6664,0.7449,1,-0.0205,-0.0159],[0.6238,0.6799],[0.3763,0.6799],[0.3336,0.7449,1,-0.0205,0.0159],[0.26,0.7701,1,-0.0274,0.0],[0.1864,0.7449,1,-0.0205,-0.0159],[0.1438,0.6799],[0.08,0.6799,1,-0.0331,0.0],[0.02,0.6199,1,0.0,-0.0331],[0.02,0.4399,1,0.0,-0.0059],[0.025,0.4232,1,0.0033,-0.0049],[0.1363,0.2566,1,0.0111,-0.0166],[0.1861,0.2299,1,0.02,0.0],[0.6076,0.2299,1,0.0159,-0.0001],[0.65,0.2475,1,0.0112,0.0113],[0.8124,0.4099],[0.92,0.4099,1,0.0331,0.0]],[[0.1063,0.4099],[0.7276,0.4099],[0.6076,0.2899],[0.1861,0.2899]],[[0.32,0.6499,1,0.0,-0.0331],[0.26,0.5899,1,-0.0331,0.0],[0.2,0.6499,1,0.0,0.0331],[0.26,0.7099,1,0.0331,0.0]],[[0.8,0.6499,1,0.0,-0.0331],[0.74,0.5899,1,-0.0331,0.0],[0.68,0.6499,1,0.0,0.0331],[0.74,0.7099,1,0.0331,0.0]]],"C":[[[0.4997,0.1024],[0.5929,0.1025],[0.7068,0.1042,1,0.043,-0.0015],[0.8096,0.1666,1,0.0229,0.05],[0.8923,0.3732],[0.9582,0.4141,1,0.0142,0.0175],[0.98,0.4694,1,0.0007,0.0179],[0.98,0.7401],[0.9007,0.7401],[0.9007,0.8312,1,0.0038,0.0868],[0.7591,0.8304,1,-0.0032,-0.0911],[0.7574,0.741],[0.2427,0.741],[0.241,0.8305,1,-0.0032,0.0911],[0.0993,0.8313,1,0.0038,-0.0868],[0.0993,0.7401],[0.02,0.7401],[0.02,0.4694,1,0.0007,-0.0179],[0.0418,0.4141,1,0.0142,-0.0175],[0.1077,0.3733],[0.1904,0.1666,1,0.0229,-0.05],[0.2933,0.1042,1,0.043,0.0015],[0.4072,0.1025]],[[0.3028,0.176],[0.2702,0.1829,1,-0.009,0.0054],[0.2496,0.2132,1,-0.0046,0.0156],[0.1908,0.3691],[0.81,0.3699],[0.7505,0.2096,1,-0.0145,-0.0323],[0.6873,0.1774,1,-0.0342,0.0008],[0.314,0.1762,1,-0.0038,-0.0002]],[[0.1057,0.5171,1,0.0,0.037],[0.1727,0.5842,1,0.037,0.0],[0.2398,0.5171,1,0.0,-0.037],[0.1727,0.4501,1,-0.037,0.0]],[[0.764,0.5171,1,0.0,0.037],[0.831,0.5842,1,0.037,0.0],[0.8981,0.5171,1,0.0,-0.037],[0.831,0.4501,1,-0.037,0.0]]]});
const out = {};
for (const k of ['now', 'A', 'B', 'C']) {
  FM.SHAPE_POLYS.car = OPTS[k];
  out[k] = {};
  for (const t of REG) {
    try { t.fn(); out[k][t.name.slice(0, 40)] = 'PASS'; } catch (e) { out[k][t.name.slice(0, 40)] = 'FAIL: ' + String(e.message).slice(0, 230); }
  }
}
FM.SHAPE_POLYS.car = OPTS.now;
return out;
