/* #482 polish batch 6 (6.5 Lens Flare, 6.6 Linear and Spin Streaks, 6.7 Glow Scan) — before/after strips for Ezra (#545: he
   sees every change first). Runs INSIDE the app (tools/design/482/polish6/flare/render6.py injects it, with window.__SHEET naming
   the strip). Every tile is the app's own renderer — FM.renderScene on a real fx-art photo, or a real text layer, carrying a real
   effect from FM.fxRegistry.makeInstance with only the named controls set — rendered at 640x640 and scaled into the tile.
   The FIRST tile (or row) is always today's default; the ones after it are the new control doing something he would use.
   A sheet with `frames` is a row of moments in time per setting (the Glow Scan sweeps), each frame labelled with its time.
   `crop` shows one part of the frame (x, y, w, h as fractions), where the difference is. */
return (async function () {
  var R = 640;
  var TITLE = { text: 'SALE', fontSize: 190, color: '#f2c14e' };
  var SHEETS = {
    /* ---- 6.5 Lens Flare ---- */
    'lensflare-coresize': {
      title: 'Lens Flare — Core size', photo: 'dusk', fx: 'lensflare', base: { x: 0.3, y: 0.25 },
      note: 'How big the bright centre of the flare is. Today it was fixed. 100% is today’s.',
      cols: 3,
      tiles: [
        { name: 'Today (100%)', sub: 'the fixed core', set: {} },
        { name: 'Core size 40%', sub: 'a tight pin of light', set: { size: 40 }, rec: true },
        { name: 'Core size 220%', sub: 'a big soft bloom', set: { size: 220 } },
      ] },
    'lensflare-rays': {
      title: 'Lens Flare — Rays', photo: 'dusk', fx: 'lensflare', base: { x: 0.3, y: 0.25, size: 50 },
      note: 'How many rays come out of the light, 0 to 16. Today it was always 6. More rays are thinner, so 16 still reads as 16 and not a blur. (Core size 50% here so the rays show.)',
      cols: 3,
      tiles: [
        { name: 'Today (6 rays)', sub: 'always six', set: {} },
        { name: '8 rays', sub: 'a classic star', set: { rays: 8 }, rec: true },
        { name: '16 rays', sub: 'a sparkle burst', set: { rays: 16 } },
        { name: '0 rays', sub: 'just the glow', set: { rays: 0 } },
        { name: '4 rays', sub: 'a cross', set: { rays: 4 } },
      ] },
    'lensflare-rotation': {
      title: 'Lens Flare — Rotation', photo: 'dusk', fx: 'lensflare', base: { x: 0.3, y: 0.25, size: 50 },
      note: 'Turns the rays round the light. Keyframe it and the star spins. It greys out when Rays is 0.',
      cols: 2,
      tiles: [
        { name: 'Today (0°)', sub: 'rays at fixed angles', set: {} },
        { name: 'Rotation 30°', sub: 'the same star, turned', set: { rotation: 30 }, rec: true },
      ] },
    'lensflare-ghosts': {
      title: 'Lens Flare — Ghosts', photo: 'dusk', fx: 'lensflare', base: { x: 0.25, y: 0.22 },
      note: 'The coloured discs a real lens throws, lined up from the light through the middle of the frame. Move the light and they swing round with it. They take the Flare colour, each a slightly different tint.',
      cols: 2,
      tiles: [
        { name: 'Today (0)', sub: 'no ghosts', set: {} },
        { name: 'Ghosts 6', sub: 'discs across to the far corner', set: { ghosts: 6 }, rec: true },
      ] },
    'lensflare-ring': {
      title: 'Lens Flare — Ring', photo: 'dusk', fx: 'lensflare', base: { x: 0.45, y: 0.4, size: 60 },
      note: 'A faint rainbow halo round the light — red on the outside, blue on the inside — in the Flare colour.',
      cols: 2,
      tiles: [
        { name: 'Today (0)', sub: 'no ring', set: {} },
        { name: 'Ring 0.8', sub: 'a halo round the light', set: { halo: 0.8 }, rec: true },
      ] },
    'lensflare-anamorphicstreak': {
      title: 'Lens Flare — Anamorphic streak', photo: 'dusk', fx: 'lensflare', base: { x: 0.4, y: 0.3 },
      note: 'The long sideways line a widescreen movie lens draws through a light. It takes the Rays & streak colour — set that blue for the film look.',
      cols: 2,
      tiles: [
        { name: 'Today (0)', sub: 'no streak', set: {} },
        { name: 'Streak 0.8, blue', sub: 'the movie-lens line', set: { streak: 0.8, color2: '#7fb2ff' }, rec: true },
        { name: 'Streak 0.8', sub: 'in the default warm white', set: { streak: 0.8 } },
      ] },
    /* ---- 6.6 Linear Streaks and Spin Streaks ---- */
    'linstreaks-bothways': {
      title: 'Linear Streaks — Both ways', layer: 'stars', stars: { amount: 0.1, size: 8, variation: 0.5 }, fx: 'linstreaks', base: { length: 40, angle: 0, samples: 32 },
      note: 'Today the lights smear out one way along the Angle. Both ways smears them out to both sides, like a star filter. (A night sky drawn with the app’s Starfield, so there are points of light to streak; close-up.)',
      cols: 2, crop: [0.3, 0.3, 0.4, 0.4],
      tiles: [
        { name: 'Today (One way)', sub: 'lights smear to the right only', set: {} },
        { name: 'Both ways', sub: 'lights smear left and right', set: { both: 1 }, rec: true },
      ] },
    'linstreaks-onlyabove': {
      title: 'Linear Streaks — Only above', photo: 'dusk', fx: 'linstreaks', base: { length: 80, angle: 0, samples: 32, both: 1 },
      note: 'Only parts brighter than this smear. Today every mid-tone smears a little, so the whole picture goes hazy; at 55% only the lights streak.',
      cols: 2,
      tiles: [
        { name: 'Today (Only above 0%)', sub: 'everything smears, hazy', set: {} },
        { name: 'Only above 55%', sub: 'just the lights streak', set: { threshold: 55 }, rec: true },
      ] },
    'linstreaks-tint': {
      title: 'Linear Streaks — Tint', layer: 'stars', stars: { amount: 0.1, size: 8, variation: 0.5 }, fx: 'linstreaks', base: { length: 40, angle: 0, samples: 32, both: 1 },
      note: 'Colours the streaks (not the lights themselves). White is today’s look. (Both ways, on a Starfield night sky; close-up.)',
      cols: 2, crop: [0.3, 0.3, 0.4, 0.4],
      tiles: [
        { name: 'Today (white)', sub: 'streaks the colour of the light', set: {} },
        { name: 'Tint blue', sub: 'cool blue streaks', set: { color: '#5aa0ff' }, rec: true },
      ] },
    'spinstreaks-onlyabove': {
      title: 'Spin Streaks — Only above', photo: 'dusk', fx: 'spinstreaks', base: { amount: 0.5, samples: 24 },
      note: 'Only parts brighter than this sweep round into arcs. Today the whole picture spins into a blur; at 55% the buildings stay sharp and only the lights swirl.',
      cols: 2,
      tiles: [
        { name: 'Today (Only above 0%)', sub: 'the whole picture swirls', set: {} },
        { name: 'Only above 55%', sub: 'only the lights swirl', set: { threshold: 55 }, rec: true },
      ] },
    'spinstreaks-direction': {
      title: 'Spin Streaks — Direction', photo: 'sunpath', fx: 'spinstreaks', base: { amount: 0.6, samples: 32, threshold: 70 },
      note: 'Which way round the centre the arcs trail from the bright parts. Today they always ran clockwise, so the sun above the centre trailed off to the right. (Only above 70% so just the sun and the sparkle sweep round; close-up of the sky.)',
      cols: 2, crop: [0.1, 0.0, 0.8, 0.5],
      tiles: [
        { name: 'Today (Clockwise)', sub: 'trails run clockwise', set: {} },
        { name: 'Anticlockwise', sub: 'the other way round', set: { dir: 1 }, rec: true },
      ] },
    /* ---- 6.7 Glow Scan: a row of moments per setting ---- */
    'glowscan-sweepsacross': {
      title: 'Glow Scan — Sweeps across', layer: 'title', proj: [540, 960], fontSize: 90, fx: 'glowscan', base: {},
      note: 'Today the band crosses the whole 9:16 FRAME, top to bottom, so a title in the middle only catches it for a moment. Layer runs it across the title itself, so the word gets the whole sweep. Four moments evenly through one sweep, close-up of the word.',
      frames: [0.083, 0.25, 0.417, 0.583], crop: [0.2, 0.4, 0.6, 0.2],
      tiles: [
        { name: 'Today (Frame)', sub: 'the band is elsewhere in the frame', set: {} },
        { name: 'Layer', sub: 'the band crosses the word', set: { span: 1 }, rec: true },
      ] },
    'glowscan-angle': {
      title: 'Glow Scan — Angle', photo: 'towers', fx: 'glowscan', base: {},
      note: 'Sweeps now has Angle as well as Down, Up, Right and Left, so the band can cross on a slant. 0° travels right, 90° travels down.',
      frames: [0.1, 0.25, 0.4, 0.55],
      tiles: [
        { name: 'Today (Down)', sub: 'a level band moving down', set: {} },
        { name: 'Angle 30°', sub: 'a slanted band moving right and down', set: { direction: 4, angle: 30 }, rec: true },
      ] },
    'glowscan-wait': {
      title: 'Glow Scan — Wait between sweeps', photo: 'towers', fx: 'glowscan', base: {},
      note: 'Rests between sweeps — and before the first, so the shine comes after the clip starts. Here 1 s: nothing, a sweep, nothing. Each sweep comes in off one edge and leaves off the other.',
      frames: [0.5, 1.15, 1.45, 2.0],
      tiles: [
        { name: 'Today (no wait)', sub: 'it never stops', set: {} },
        { name: 'Wait 1 s', sub: 'a pause, one sweep, a pause', set: { pause: 1 }, rec: true },
      ] },
    'glowscan-once': {
      title: 'Glow Scan — Once', photo: 'towers', fx: 'glowscan', base: {},
      note: 'Repeat Once sweeps a single time from the start of the clip, then the picture stays clean.',
      frames: [0.15, 0.45, 1.0, 2.5],
      tiles: [
        { name: 'Today (Loop)', sub: 'shines again and again', set: {} },
        { name: 'Once', sub: 'one shine, then clean', set: { loop: 1 }, rec: true },
      ] },
  };
  var S = SHEETS[window.__SHEET];
  if (!S) throw new Error('no sheet ' + window.__SHEET);
  var mid = null;
  if (S.photo) {
    var im = await new Promise(function (ok, bad) {
      var i = new Image(); i.onload = function () { ok(i); }; i.onerror = function () { bad(new Error('no photo ' + S.photo)); };
      i.src = 'fx-art/' + S.photo + '.jpg?v=1';
    });
    var base = document.createElement('canvas'); base.width = R; base.height = R;
    var bg = base.getContext('2d'); bg.imageSmoothingQuality = 'high';
    bg.drawImage(im, 0, 0, im.naturalWidth, im.naturalHeight, 0, 0, R, R);
    mid = '_482p6_' + S.photo;
    FM.media.set(mid, { kind: 'image', el: base, width: R, height: R, duration: 0 }); if (FM.media.pin) FM.media.pin(mid);
  }
  var PW = S.proj ? S.proj[0] : R, PH = S.proj ? S.proj[1] : R;
  function render(set, t) {
    var l;
    var pre = [];
    if (S.photo) { l = FM.makeLayer('image', { x: PW / 2, y: PH / 2, start: 0, duration: 6 }); l.id = mid; }
    else if (S.layer === 'stars') {   // a night sky: a dark full-frame shape with the app's own Starfield on it, so there are point lights to streak
      l = FM.makeLayer('shape', { shape: 'rect', x: PW / 2, y: PH / 2, shapeW: PW, shapeH: PH, fill: '#06080d', start: 0, duration: 6 });
      var sf = FM.fxRegistry.makeInstance('starfield'); Object.assign(sf.params, S.stars || {}); pre = [sf];
    }
    else { l = FM.makeLayer('text', { text: TITLE.text, x: PW / 2, y: PH / 2, fontSize: S.fontSize || TITLE.fontSize, color: TITLE.color, start: 0, duration: 6 }); l.bold = true; }
    l.start = 0; l.duration = 6;
    var e = FM.fxRegistry.makeInstance(S.fx); Object.assign(e.params, S.base || {}, set || {}); l.effects = pre.concat([e]);
    var c = document.createElement('canvas'); c.width = PW; c.height = PH;
    FM.renderScene(c.getContext('2d', { willReadFrequently: true }), { project: { width: PW, height: PH, fps: 30, duration: 6, background: S.photo ? '#000000' : '#14161c' }, layers: [l] }, t == null ? 1.1 : t);
    return c;
  }
  function crop(full, c) {
    if (!c) return full;
    var cv = document.createElement('canvas'); cv.width = Math.round(c[2] * PW); cv.height = Math.round(c[3] * PH);
    cv.getContext('2d').drawImage(full, c[0] * PW, c[1] * PH, c[2] * PW, c[3] * PH, 0, 0, cv.width, cv.height); return cv;
  }
  var ov = document.createElement('div');
  ov.style.cssText = 'position:fixed;inset:0;z-index:2147483647;background:#0f1117;color:#e9ecf3;font:14px -apple-system,system-ui,sans-serif;padding:16px 14px;box-sizing:border-box;overflow:hidden';
  var head = document.createElement('div'); head.style.cssText = 'font-weight:700;font-size:18px;letter-spacing:-.2px'; head.textContent = S.title; ov.appendChild(head);
  var nt = document.createElement('div'); nt.style.cssText = 'color:#a8afbf;font-size:12.5px;line-height:1.4;margin:5px 0 12px'; nt.textContent = S.note; ov.appendChild(nt);
  document.body.appendChild(ov);
  function label(parent, o, tag) {
    var t = document.createElement('div'); t.style.cssText = 'font-weight:650;font-size:13px;margin-top:6px;line-height:1.25';
    var k = document.createElement('span'); k.style.cssText = 'color:' + (tag === 'BEFORE' ? '#a8afbf' : '#ffc857') + ';font-size:10.5px;font-weight:800;letter-spacing:.4px;margin-right:5px';
    k.textContent = tag; t.appendChild(k); t.appendChild(document.createTextNode(o.name)); parent.appendChild(t);
    var s = document.createElement('div'); s.style.cssText = 'color:#a8afbf;font-size:11.5px;line-height:1.3;margin-top:1px'; s.textContent = o.sub; parent.appendChild(s);
  }
  function tileCanvas(cv, rec) { cv.style.cssText = 'width:100%;height:auto;display:block;border-radius:8px;' + (rec ? 'outline:2px solid #4fd1a5;outline-offset:2px' : ''); return cv; }
  if (S.frames) {
    S.tiles.forEach(function (o, i) {
      var block = document.createElement('div'); block.style.cssText = 'margin-bottom:12px';
      label(block, o, i === 0 ? 'BEFORE' : 'AFTER');
      var row = document.createElement('div'); row.style.cssText = 'display:grid;grid-template-columns:repeat(' + S.frames.length + ',1fr);gap:6px;margin-top:6px';
      S.frames.forEach(function (t) {
        var cell = document.createElement('div');
        cell.appendChild(tileCanvas(crop(render(o.set, t), S.crop), o.rec));
        var tl = document.createElement('div'); tl.style.cssText = 'color:#7f8799;font-size:11px;text-align:center;margin-top:3px'; tl.textContent = t.toFixed(2) + ' s';
        cell.appendChild(tl); row.appendChild(cell);
      });
      block.appendChild(row); ov.appendChild(block);
    });
  } else {
    var g = document.createElement('div');
    g.style.cssText = 'display:grid;grid-template-columns:repeat(' + (S.cols || S.tiles.length) + ',1fr);gap:12px 10px';
    S.tiles.forEach(function (o, i) {
      var cell = document.createElement('div');
      cell.appendChild(tileCanvas(crop(render(o.set), S.crop), o.rec));
      label(cell, o, i === 0 ? 'BEFORE' : 'AFTER'); g.appendChild(cell);
    });
    ov.appendChild(g);
  }
  var last = ov.lastElementChild.getBoundingClientRect();
  return { sheet: window.__SHEET, contentBottom: Math.ceil(last.bottom + 16) };
})();
