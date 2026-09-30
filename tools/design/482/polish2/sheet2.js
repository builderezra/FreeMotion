/* #482 polish batch 2 — before/after pictures of every new Wiggle, Shake, Pulse, Swing, Orbit and Drift control, for his
   phone (his rule #545: he sees every change). Runs INSIDE the app (tools/design/482/polish2/render2.py injects it and calls
   window.__482b(id) once per picture). Every frame is the app's own renderer — FM.renderScene on real layers carrying real
   effects from FM.fxRegistry.makeInstance, with only the named params set — rendered at 540x540 and scaled into its tile, so
   what he sees is what the effect does. Motion is shown as frames in a row; where the PATH is the point (Pattern, Vertical
   amount, Roughness, the orbit shapes, the wrap) the path of the layer's middle over the whole clip is drawn over each frame,
   measured from the same renderer (the centroid of the layer drawn on its own), not sketched. */
return (async function () {
  var R = 540;
  var load = function (name) {
    return new Promise(function (ok, bad) { var i = new Image(); i.onload = function () { ok(i); }; i.onerror = function () { bad(new Error('no photo ' + name)); }; i.src = 'fx-art/' + name + '.jpg?v=1'; });
  };
  var photos = {};
  for (var n of ['huracan', 'mclaren', 'bay', 'dog', 'tesla']) photos[n] = await load(n);
  /* media: a card cut from a photo (cover crop), a full-frame photo, and a grid backdrop so a still frame shows where things are. */
  function card(name, w, h, id) {
    var c = document.createElement('canvas'); c.width = w; c.height = h;
    var g = c.getContext('2d'), im = photos[name], s = Math.max(w / im.naturalWidth, h / im.naturalHeight);
    var sw = w / s, sh = h / s; g.imageSmoothingQuality = 'high';
    g.drawImage(im, (im.naturalWidth - sw) / 2, (im.naturalHeight - sh) / 2, sw, sh, 0, 0, w, h);
    g.strokeStyle = 'rgba(255,255,255,.9)'; g.lineWidth = 4; g.strokeRect(2, 2, w - 4, h - 4);
    FM.media.set(id, { kind: 'image', el: c, width: w, height: h, duration: 0 }); if (FM.media.pin) FM.media.pin(id);
    return id;
  }
  var gridId = '_482b_grid';
  (function () {
    var c = document.createElement('canvas'); c.width = R; c.height = R; var g = c.getContext('2d');
    g.fillStyle = '#161c28'; g.fillRect(0, 0, R, R); g.strokeStyle = '#2b3448'; g.lineWidth = 2;
    for (var k = 0; k <= R; k += 45) { g.beginPath(); g.moveTo(k, 0); g.lineTo(k, R); g.stroke(); g.beginPath(); g.moveTo(0, k); g.lineTo(R, k); g.stroke(); }
    FM.media.set(gridId, { kind: 'image', el: c, width: R, height: R, duration: 0 }); if (FM.media.pin) FM.media.pin(gridId);
  })();
  var CAR = card('huracan', 170, 110, '_482b_car'), CAR2 = card('mclaren', 170, 110, '_482b_car2'), DOG = card('dog', 130, 130, '_482b_dog');
  var BAR = card('tesla', 260, 70, '_482b_bar');
  var FULL = card('bay', R, R, '_482b_full'), BACK = card('bay', R, R, '_482b_back');
  /* A ticker three frames long (the review's long-ticker fix): a red band with START and END at its two ends and numbered
     marks between, so a missing end or a gap in the middle is plain to see. */
  var TICK = (function () {
    var w = 3 * R, h = 64, c = document.createElement('canvas'); c.width = w; c.height = h; var g = c.getContext('2d');
    g.fillStyle = '#c0392b'; g.fillRect(0, 0, w, h); g.strokeStyle = '#ffffff'; g.lineWidth = 4; g.strokeRect(2, 2, w - 4, h - 4);
    g.fillStyle = '#ffffff'; g.font = '800 30px -apple-system, system-ui, sans-serif'; g.textBaseline = 'middle';
    g.textAlign = 'left'; g.fillText('START ▸', 16, h / 2); g.textAlign = 'right'; g.fillText('◂ END', w - 16, h / 2);
    g.textAlign = 'center'; for (var k = 1; k <= 8; k++) g.fillText('· ' + k + ' ·', k * w / 9, h / 2);
    FM.media.set('_482b_tick', { kind: 'image', el: c, width: w, height: h, duration: 0 }); if (FM.media.pin) FM.media.pin('_482b_tick');
    return '_482b_tick';
  })();
  function img(id, x, y, fx, sc) { var l = FM.makeLayer('image', { x: x, y: y, start: 0, duration: 8 }); l.id = id; l.start = 0; l.duration = 8; if (sc) l.transform.scale = sc; l.effects = fx || []; return l; }
  function grid() { return img(gridId, R / 2, R / 2, []); }
  function fx(type, params) { var e = FM.fxRegistry.makeInstance(type); Object.assign(e.params, params || {}); return e; }
  function scene(layers, bg) { return { project: { width: R, height: R, fps: 30, duration: 8, background: bg || '#161c28' }, layers: layers, selectedId: null, selectedIds: [] }; }
  function frame(layers, t, px, bg) {
    var big = document.createElement('canvas'); big.width = R; big.height = R;
    FM.renderScene(big.getContext('2d', { willReadFrequently: true }), scene(layers, bg), t);
    var c = document.createElement('canvas'); c.width = px; c.height = px; var g = c.getContext('2d'); g.imageSmoothingQuality = 'high';
    g.drawImage(big, 0, 0, px, px); return c;
  }
  /* The path of one layer's middle: it is rendered ALONE on a transparent 135 px plate at 30 points a second and its alpha
     centroid taken — the renderer's own motion, nothing re-derived. */
  function path(layer, t0, t1) {
    var pts = [], S = 135, c = document.createElement('canvas'); c.width = S; c.height = S; c.__fmRS = S / R; c.__fmOX = 0; c.__fmOY = 0;
    var g = c.getContext('2d', { willReadFrequently: true });
    for (var t = t0; t <= t1 + 1e-9; t += 1 / 30) {
      g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, S, S);
      FM.renderScene(g, { project: { width: R, height: R, fps: 30, duration: 8, background: null }, layers: [layer], selectedId: null, selectedIds: [] }, t);
      var d = g.getImageData(0, 0, S, S).data, n = 0, sx = 0, sy = 0;
      for (var i = 0; i < d.length; i += 4) if (d[i + 3] > 128) { n++; sx += (i / 4) % S; sy += Math.floor(i / 4 / S); }
      pts.push(n ? [(sx / n + 0.5) * R / S, (sy / n + 0.5) * R / S] : null);
    }
    return pts;
  }
  function drawPath(c, pts, col) {
    var g = c.getContext('2d'), k = c.width / R; g.save(); g.strokeStyle = col; g.lineWidth = 2.2; g.lineJoin = 'round'; g.globalAlpha = 0.95;
    var open = false;
    pts.forEach(function (p, i) {
      if (!p) { open = false; return; }
      var prev = pts[i - 1];
      if (open && prev && Math.hypot(p[0] - prev[0], p[1] - prev[1]) > R * 0.3) open = false;   // a wrap: lift the pen
      if (!open) { g.beginPath(); g.moveTo(p[0] * k, p[1] * k); open = true; } else { g.lineTo(p[0] * k, p[1] * k); g.stroke(); g.beginPath(); g.moveTo(p[0] * k, p[1] * k); }
    });
    g.restore();
  }
  function restBox(c, x, y, w, h) {   // a dashed outline where the layer sits with no effect
    var g = c.getContext('2d'), k = c.width / R; g.save(); g.setLineDash([5, 4]); g.strokeStyle = 'rgba(255,214,102,.85)'; g.lineWidth = 1.6;
    g.strokeRect((x - w / 2) * k, (y - h / 2) * k, w * k, h * k); g.restore();
  }
  function cross(c, x, y) { var g = c.getContext('2d'), k = c.width / R; g.save(); g.strokeStyle = 'rgba(255,214,102,.9)'; g.lineWidth = 1.6; g.beginPath(); g.moveTo(x * k - 6, y * k); g.lineTo(x * k + 6, y * k); g.moveTo(x * k, y * k - 6); g.lineTo(x * k, y * k + 6); g.stroke(); g.restore(); }

  /* A picture: a title, one line on what the control does, then rows of frames. Each row: its label and a make() that returns
     { layers, bg, paths: [[layer, colour]], rest: [x, y, w, h] | null, cross: [x, y] | null }. */
  var C1 = '#4fd1a5', C2 = '#ff8a5c';
  var SPECS = {
    'wiggle-pattern': { title: 'Wiggle · Pattern', sub: 'Two cards with the same Wiggle. Today they wiggle as one. Give one its own Pattern and they move apart.', times: [0.4, 1.0, 1.6, 2.2], rows: [
      { label: 'Today — both on the same wiggle (in lockstep)', make: function () { var a = img(CAR, 150, 270, [fx('wiggle', { amount: 70, speed: 0.8 })]), b = img(CAR2, 390, 270, [fx('wiggle', { amount: 70, speed: 0.8 })]); return { layers: [a, b, grid()], paths: [[a, C1], [b, C2]] }; } },
      { label: 'New — right card on Pattern 7', make: function () { var a = img(CAR, 150, 270, [fx('wiggle', { amount: 70, speed: 0.8 })]), b = img(CAR2, 390, 270, [fx('wiggle', { amount: 70, speed: 0.8, seed: 7 })]); return { layers: [a, b, grid()], paths: [[a, C1], [b, C2]] }; } } ] },
    'wiggle-vertical-amount': { title: 'Wiggle · Vertical amount', sub: 'Up-and-down set on its own. Until you set it, it follows Amount — the wiggle you have today. 0 = side to side only.', times: [0.4, 1.0, 1.6, 2.2], rows: [
      { label: 'Today — Amount 80 both ways', make: function () { var a = img(CAR, 270, 270, [fx('wiggle', { amount: 80, speed: 0.8 })]); return { layers: [a, grid()], paths: [[a, C1]], rest: [270, 270, 170, 110] }; } },
      { label: 'New — Vertical amount 0 (side to side only)', make: function () { var a = img(CAR, 270, 270, [fx('wiggle', { amount: 80, speed: 0.8, amounty: 0 })]); return { layers: [a, grid()], paths: [[a, C1]], rest: [270, 270, 170, 110] }; } } ] },
    'wiggle-rotation': { title: 'Wiggle · Rotation wiggle', sub: 'The card also tips back and forth on the same wiggle, about its middle.', times: [0.3, 0.8, 1.3, 1.8], rows: [
      { label: 'Today — it only slides', make: function () { var a = img(CAR, 270, 270, [fx('wiggle', { amount: 40, speed: 1 })]); return { layers: [a, grid()], rest: [270, 270, 170, 110] }; } },
      { label: 'New — Rotation wiggle 30°', make: function () { var a = img(CAR, 270, 270, [fx('wiggle', { amount: 40, speed: 1, rotate: 30 })]); return { layers: [a, grid()], rest: [270, 270, 170, 110] }; } } ] },
    'wiggle-scale': { title: 'Wiggle · Scale wiggle', sub: 'The card also grows and shrinks on the same wiggle — a nervous, breathing wobble.', times: [0.3, 0.8, 1.3, 1.8], rows: [
      { label: 'Today — always the same size', make: function () { var a = img(CAR, 270, 270, [fx('wiggle', { amount: 40, speed: 1 })]); return { layers: [a, grid()], rest: [270, 270, 170, 110] }; } },
      { label: 'New — Scale wiggle 40%', make: function () { var a = img(CAR, 270, 270, [fx('wiggle', { amount: 40, speed: 1, scale: 40 })]); return { layers: [a, grid()], rest: [270, 270, 170, 110] }; } } ] },
    'wiggle-roughness': { title: 'Wiggle · Roughness', sub: 'Finer shakes on top of the slow float. The line is the path of the card over 3 seconds — the same float, rougher.', times: [0.5, 1.2, 1.9, 2.6], rows: [
      { label: 'Today — Roughness 1 (smooth float)', make: function () { var a = img(DOG, 270, 270, [fx('wiggle', { amount: 110, speed: 0.4 })]); return { layers: [a, grid()], paths: [[a, C1]], cross: [270, 270] }; } },
      { label: 'New — Roughness 4', make: function () { var a = img(DOG, 270, 270, [fx('wiggle', { amount: 110, speed: 0.4, octaves: 4 })]); return { layers: [a, grid()], paths: [[a, C1]], cross: [270, 270] }; } } ] },
    'shake-pattern': { title: 'Shake · Pattern', sub: 'Two cards with the same Shake. Today they shake as one. Give one its own Pattern and each has its own hits.', times: [0.2, 0.45, 0.7, 0.95], rows: [
      { label: 'Today — both on the same shake', make: function () { var p = { amount: 40, speed: 3, twist: 6, zoom: 0, smear: 0 }; var a = img(CAR, 150, 270, [fx('shake', p)]), b = img(CAR2, 390, 270, [fx('shake', p)]); return { layers: [a, b, grid()], paths: [[a, C1], [b, C2]] }; } },
      { label: 'New — right card on Pattern 5', make: function () { var p = { amount: 40, speed: 3, twist: 6, zoom: 0, smear: 0 }; var a = img(CAR, 150, 270, [fx('shake', p)]), b = img(CAR2, 390, 270, [fx('shake', Object.assign({ seed: 5 }, p))]); return { layers: [a, b, grid()], paths: [[a, C1], [b, C2]] }; } } ] },
    'shake-hide-edges': { title: 'Shake · Hide edges', sub: 'A full-screen clip shaken hard shows the empty frame behind it. Hide edges zooms in just enough that it never does — the same zoom wherever the clip is, and only on a layer that fills the frame.', times: [0.15, 0.4, 0.65, 0.9], bg: '#000000', rows: [
      { label: 'Today — black edges show', make: function () { var a = img(FULL, R / 2, R / 2, [fx('shake', { amount: 45, speed: 5, twist: 6 })]); return { layers: [a], bg: '#000000' }; } },
      { label: 'New — Hide edges On', make: function () { var a = img(FULL, R / 2, R / 2, [fx('shake', { amount: 45, speed: 5, twist: 6, overscan: 1 })]); return { layers: [a], bg: '#000000' }; } },
      { label: 'New — Hide edges On, sliding in: one zoom all the way', make: function () { var a = img(FULL, R / 2, R / 2, [fx('shake', { amount: 45, speed: 5, twist: 6, overscan: 1 })]); a.transform.x = { kf: [{ t: 0, v: 740, e: 'linear' }, { t: 1, v: 270, e: 'linear' }] }; return { layers: [a], bg: '#000000' }; } },
      { label: 'New — Hide edges On, a caption: nothing to hide, it keeps its size', make: function () { var a = img(BAR, 270, 430, [fx('shake', { amount: 45, speed: 5, twist: 6, overscan: 1 })]); return { layers: [a, img(BACK, R / 2, R / 2, [])], bg: '#000000', rest: [270, 430, 260, 70] }; } } ] },
    'pulse-wave': { title: 'Pulse · Wave', sub: 'The shape of each beat. Frames across one beat; the dashed box is the card at rest.', times: [0.06, 0.13, 0.3, 0.62], rows: [
      { label: 'Today — Sine (grows, then shrinks as much)', make: function () { return { layers: [img(DOG, 270, 270, [fx('pulse', { amount: 0.35, speed: 1 })]), grid()], rest: [270, 270, 130, 130] }; } },
      { label: 'New — Heartbeat (two beats, then rest; never shrinks)', make: function () { return { layers: [img(DOG, 270, 270, [fx('pulse', { amount: 0.35, speed: 1, wave: 1 })]), grid()], rest: [270, 270, 130, 130] }; } },
      { label: 'New — Square (snaps between two sizes)', make: function () { return { layers: [img(DOG, 270, 270, [fx('pulse', { amount: 0.35, speed: 1, wave: 3 })]), grid()], rest: [270, 270, 130, 130] }; } } ] },
    'pulse-squash-stretch': { title: 'Pulse · Squash & stretch', sub: 'As it grows wider it gets shorter, like a bouncing ball (−1 = taller as it grows).', times: [0.0, 0.25, 0.5, 0.75], rows: [
      { label: 'Today — grows evenly', make: function () { return { layers: [img(DOG, 270, 270, [fx('pulse', { amount: 0.35, speed: 1 })]), grid()], rest: [270, 270, 130, 130] }; } },
      { label: 'New — Squash & stretch 1', make: function () { return { layers: [img(DOG, 270, 270, [fx('pulse', { amount: 0.35, speed: 1, stretch: 1 })]), grid()], rest: [270, 270, 130, 130] }; } } ] },
    'pulse-pivot': { title: 'Pulse · Pivot', sub: 'Where it grows from. Pivot Y 100 = the bottom edge stays on the floor (the yellow line) and it grows upward.', times: [0.0, 0.25, 0.5, 0.75], rows: [
      { label: 'Today — grows from the middle', make: function () { return { layers: [img(DOG, 270, 300, [fx('pulse', { amount: 0.35, speed: 1 })]), grid()], rest: [270, 300, 130, 130], floor: 365 }; } },
      { label: 'New — Pivot Y 100 (grows up off the floor)', make: function () { return { layers: [img(DOG, 270, 300, [fx('pulse', { amount: 0.35, speed: 1, pivoty: 100 })]), grid()], rest: [270, 300, 130, 130], floor: 365 }; } } ] },
    'swing-damping': { title: 'Swing · Damping', sub: 'The swing dies away, like a sign that stops rocking. Frames at the top of each swing, one second apart.', times: [0.25, 1.25, 2.25, 3.25], rows: [
      { label: 'Today — swings for ever', make: function () { return { layers: [img(BAR, 270, 200, [fx('swing', { angle: 35, speed: 1 })]), grid()], cross: [270, 165] }; } },
      { label: 'New — Damping 0.8', make: function () { return { layers: [img(BAR, 270, 200, [fx('swing', { angle: 35, speed: 1, damping: 0.8 })]), grid()], cross: [270, 165] }; } } ] },
    'orbit-ellipse': { title: 'Orbit · Ellipse', sub: 'The orbit squashed into an oval (100 = the circle you have today). The line is its path.', times: [0, 0.5, 1, 1.5], rows: [
      { label: 'Today — a circle', make: function () { var a = img(DOG, 270, 270, [fx('orbit', { radius: 150, speed: 0.5 })], 0.6); return { layers: [a, grid()], paths: [[a, C1]], cross: [270, 270] }; } },
      { label: 'New — Ellipse 40%', make: function () { var a = img(DOG, 270, 270, [fx('orbit', { radius: 150, speed: 0.5, ry: 40 })], 0.6); return { layers: [a, grid()], paths: [[a, C1]], cross: [270, 270] }; } } ] },
    'orbit-depth': { title: 'Orbit · Depth', sub: 'Smaller on the far side (the top), full size close to you — the orbit looks tilted away. Both on Ellipse 45%.', times: [0, 0.5, 1, 1.5], rows: [
      { label: 'Depth 0 (today) — the same size all the way round', make: function () { var a = img(DOG, 270, 270, [fx('orbit', { radius: 150, speed: 0.5, ry: 45 })], 0.8); return { layers: [a, grid()], paths: [[a, C1]], cross: [270, 270] }; } },
      { label: 'New — Depth 80%', make: function () { var a = img(DOG, 270, 270, [fx('orbit', { radius: 150, speed: 0.5, ry: 45, depth: 80 })], 0.8); return { layers: [a, grid()], paths: [[a, C1]], cross: [270, 270] }; } } ] },
    'orbit-face-direction': { title: 'Orbit · Face direction of travel', sub: 'The layer turns to point along its path — a car drives round instead of sliding round.', times: [0, 0.5, 1, 1.5], rows: [
      { label: 'Today — stays upright', make: function () { var a = img(CAR, 270, 270, [fx('orbit', { radius: 150, speed: 0.5 })], 0.7); return { layers: [a, grid()], paths: [[a, C1]], cross: [270, 270] }; } },
      { label: 'New — Face direction of travel On', make: function () { var a = img(CAR, 270, 270, [fx('orbit', { radius: 150, speed: 0.5, face: 1 })], 0.7); return { layers: [a, grid()], paths: [[a, C1]], cross: [270, 270] }; } } ] },
    'drift-wrap': { title: 'Drift · Wrap around frame', sub: 'A ticker: what drifts off one edge comes straight back in at the other, for ever.', times: [0.4, 1.4, 2.4, 3.4], rows: [
      { label: 'Today — drifts off and is gone', make: function () { return { layers: [img(CAR, 200, 270, [fx('drift', { x: 220, y: 0 })]), grid()] }; } },
      { label: 'New — Wrap around frame On', make: function () { return { layers: [img(CAR, 200, 270, [fx('drift', { x: 220, y: 0, wrap: 1 })]), grid()] }; } },
      { label: 'New — a ticker 3 frames long scrolls all of itself, then START comes round', make: function () { return { layers: [img(TICK, 270, 270, [fx('drift', { x: -400, y: 0, wrap: 1 })]), grid()] }; } },
      { label: 'New — parked past the right edge: it scrolls in from there, then loops', make: function () { return { layers: [img(CAR, 700, 270, [fx('drift', { x: -300, y: 0, wrap: 1 })]), grid()] }; } } ] },
  };
  window.__482b = function (id) {
    var sp = SPECS[id]; if (!sp) throw new Error('no picture ' + id);
    var old = document.getElementById('ov482b'); if (old) old.remove();
    var ov = document.createElement('div'); ov.id = 'ov482b';
    ov.style.cssText = 'position:fixed;inset:0;z-index:2147483647;background:#0f1117;color:#e9ecf3;font:14px -apple-system,system-ui,sans-serif;padding:14px 10px;box-sizing:border-box;overflow:hidden';
    var h = document.createElement('div'); h.style.cssText = 'font-weight:700;font-size:18px;letter-spacing:-.2px'; h.textContent = sp.title; ov.appendChild(h);
    var s = document.createElement('div'); s.style.cssText = 'color:#a8afbf;font-size:12px;line-height:1.35;margin:4px 0 10px'; s.textContent = sp.sub; ov.appendChild(s);
    document.body.appendChild(ov);
    var TILE = Math.floor((370 - 3 * 6) / 4), PX = TILE * 2;
    sp.rows.forEach(function (row, ri) {
      var lab = document.createElement('div'); lab.style.cssText = 'font-weight:650;font-size:12.5px;margin:' + (ri ? 10 : 0) + 'px 0 5px;color:' + (ri ? '#4fd1a5' : '#e9ecf3'); lab.textContent = row.label; ov.appendChild(lab);
      var strip = document.createElement('div'); strip.style.cssText = 'display:flex;gap:6px'; ov.appendChild(strip);
      var m = row.make();
      var paths = (m.paths || []).map(function (q) { return [path(q[0], 0, 3), q[1]]; });
      sp.times.forEach(function (t) {
        var cell = document.createElement('div'); cell.style.cssText = 'width:' + TILE + 'px';
        var c = frame(m.layers, t, PX, m.bg || sp.bg);
        if (m.rest) restBox(c, m.rest[0], m.rest[1], m.rest[2], m.rest[3]);
        if (m.cross) cross(c, m.cross[0], m.cross[1]);
        if (m.floor) { var fg = c.getContext('2d'), fk = c.width / R; fg.save(); fg.strokeStyle = 'rgba(255,214,102,.9)'; fg.lineWidth = 2; fg.beginPath(); fg.moveTo(0, m.floor * fk); fg.lineTo(c.width, m.floor * fk); fg.stroke(); fg.restore(); }
        paths.forEach(function (q) { drawPath(c, q[0], q[1]); });
        c.style.cssText = 'width:' + TILE + 'px;height:' + TILE + 'px;display:block;border-radius:6px;' + (ri ? 'outline:2px solid #4fd1a5;outline-offset:1px' : '');
        cell.appendChild(c);
        var tl = document.createElement('div'); tl.style.cssText = 'color:#8b93a5;font-size:10.5px;text-align:center;margin-top:3px'; tl.textContent = t.toFixed(2).replace(/0$/, '') + ' s'; cell.appendChild(tl);
        strip.appendChild(cell);
      });
    });
    var foot = document.createElement('div'); foot.style.cssText = 'color:#8b93a5;font-size:10.5px;margin-top:10px;line-height:1.35';
    foot.textContent = 'Drawn by the app’s own renderer. The default is today’s motion exactly — nothing changes on a saved project until you move the new control.';
    ov.appendChild(foot);
    return { contentBottom: Math.ceil(foot.getBoundingClientRect().bottom + 12) };
  };
  return Object.keys(SPECS);
})();
