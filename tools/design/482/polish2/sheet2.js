/* #482 polish batch 2 (2.5 Speed Lines, 2.7 Glitch) — before/after strips for Ezra (#545: he sees every change first).
   Runs INSIDE the app (tools/design/482/polish2/render2.py injects it, with window.__SHEET naming the strip). Every tile is
   the app's own renderer — FM.renderScene on a real image layer carrying a real effect from FM.fxRegistry.makeInstance,
   with only the named controls set — rendered at 640x640 (the export scale for this project) and scaled into the tile.
   LEFT is always today's default; the tiles to its right are the new control doing something he would use. */
return (async function () {
  var R = 640;
  var SHEETS = {
    'speedlines-boil': {
      title: 'Speed Lines — Boil', photo: 'mclaren', fx: 'speedlines',
      note: 'Four moments a tenth of a second apart, the top-left corner of the frame at 2x. Boil redraws the lines that many times a second — the shimmer of a hand-drawn panel.',
      crop: [0, 0, 0.5, 0.5],
      rows: [
        { name: 'Today (Boil 0)', sub: 'the lines stand still', set: {}, times: [0, 0.1, 0.2, 0.3] },
        { name: 'Boil 12', sub: 'redrawn 12 times a second', set: { boil: 12 }, times: [0, 0.1, 0.2, 0.3], rec: true },
      ] },
    'speedlines-style': {
      title: 'Speed Lines — Style and Angle', photo: 'mclaren', fx: 'speedlines',
      note: 'Parallel lays the lines side by side instead of driving them in to a point. Angle turns them (live only in Parallel).',
      tiles: [
        { name: 'Today (Radial)', sub: 'lines drive in to the car', set: {} },
        { name: 'Parallel · Angle 0°', sub: 'the across-the-panel rush', set: { mode: 1, angle: 0 }, rec: true },
        { name: 'Parallel · Angle −25°', sub: 'white ink, Blend Add', set: { mode: 1, angle: -25, color: '#ffffff', blend: 1 } },
      ] },
    'speedlines-clearzoneshape': {
      title: 'Speed Lines — Clear zone shape', photo: 'mclaren', fx: 'speedlines',
      note: 'The clear space around your subject can be an oval now — wide for a car, tall for a person. 100% is today’s circle.',
      tiles: [
        { name: 'Today (100%)', sub: 'Clear zone 40%: a circle, lines cut into the car’s sides', set: { inner: 40 } },
        { name: 'Clear zone shape 240%', sub: 'Clear zone 40%: a wide oval that fits the car', set: { inner: 40, aspect: 240 }, rec: true },
      ] },
    'glitch-unevenslices': {
      title: 'Glitch — Uneven slices', photo: 'huracan', fx: 'glitch', t: 0.43,
      note: 'Today every slice is the same height. Uneven slices mixes thin and thick ones, and re-rolls them with the tear.',
      tiles: [
        { name: 'Today (0%)', sub: '14 slices, all one height', set: { amount: 0.7 } },
        { name: 'Uneven slices 100%', sub: 'thin and thick slices mixed', set: { amount: 0.7, jitter: 100 }, rec: true },
      ] },
    'glitch-blockdamage': {
      title: 'Glitch — Block damage', photo: 'huracan', fx: 'glitch', t: 0.43,
      note: 'Broken rectangles on top of the slices — each one slipped sideways with its colours swapped round, like a corrupt file.',
      tiles: [
        { name: 'Today (0)', sub: 'slices only', set: { amount: 0.7 } },
        { name: 'Block damage 0.6', sub: 'slipped, colour-swapped blocks', set: { amount: 0.7, blocks: 0.6 }, rec: true },
      ] },
    'glitch-pattern': {
      title: 'Glitch — Pattern', photo: 'huracan', fx: 'glitch', t: 0.43,
      note: 'Today two Glitch layers tear in exactly the same places at the same moment. Pattern gives each one its own tear.',
      tiles: [
        { name: 'Today (Pattern 0)', sub: 'every Glitch tears like this at 0.43 s', set: { amount: 0.7 } },
        { name: 'Pattern 7', sub: 'its own tear, same moment', set: { amount: 0.7, seed: 7 }, rec: true },
      ] },
    'glitch-edges': {
      title: 'Glitch — Edges', photo: 'huracan', fx: 'glitch', t: 3.65, crop: [0, 0.2, 0.5, 0.5],   // 3.65 s: most slices slip right, away from the left edge
      note: 'What a slipped slice shows at the frame edge it moved away from. Each picture is the left half of the frame at 2x — look down its left side.',
      tiles: [
        { name: 'Today (Wrap around)', sub: 'the end pops out the other side', set: { amount: 1, bands: 8 } },
        { name: 'Stretch edge', sub: 'its last pixel smeared', set: { amount: 1, bands: 8, wrap: 1 }, rec: true },
        { name: 'Leave gap', sub: 'a clean gap behind it', set: { amount: 1, bands: 8, wrap: 2 } },
      ] },
    'glitch-updown': {
      title: 'Glitch — the new controls tear Up / down too', photo: 'huracan', fx: 'glitch', t: 0.43,
      note: 'Tears Up / down turns the whole glitch on its side, so Uneven slices, Block damage, Pattern and Edges come with it.',
      tiles: [
        { name: 'Today (Up / down)', sub: 'even columns', set: { amount: 0.7, dir: 1 } },
        { name: 'Up / down + new', sub: 'Uneven 100% · Blocks 0.5 · Leave gap', set: { amount: 0.7, dir: 1, jitter: 100, blocks: 0.5, wrap: 2 }, rec: true },
      ] },
  };
  var S = SHEETS[window.__SHEET];
  if (!S) throw new Error('no sheet ' + window.__SHEET);
  var im = await new Promise(function (ok, bad) {
    var i = new Image(); i.onload = function () { ok(i); }; i.onerror = function () { bad(new Error('no photo ' + S.photo)); };
    i.src = 'fx-art/' + S.photo + '.jpg?v=1';
  });
  var base = document.createElement('canvas'); base.width = R; base.height = R;
  var bg = base.getContext('2d'); bg.imageSmoothingQuality = 'high';
  bg.drawImage(im, 0, 0, im.naturalWidth, im.naturalHeight, 0, 0, R, R);
  var mid = '_482p2_' + S.photo;
  FM.media.set(mid, { kind: 'image', el: base, width: R, height: R, duration: 0 }); if (FM.media.pin) FM.media.pin(mid);
  function render(set, t) {
    var l = FM.makeLayer('image', { x: R / 2, y: R / 2, start: 0, duration: 4 }); l.id = mid; l.start = 0; l.duration = 4;
    if (S.scale) l.transform.scale = S.scale;
    var e = FM.fxRegistry.makeInstance(S.fx); Object.assign(e.params, set || {}); l.effects = [e];
    var c = document.createElement('canvas'); c.width = R; c.height = R;
    FM.renderScene(c.getContext('2d', { willReadFrequently: true }), { project: { width: R, height: R, fps: 30, duration: 4, background: '#000000' }, layers: [l] }, t);
    return c;
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
  function tileCanvas(cv, rec) { cv.style.cssText = 'width:100%;aspect-ratio:1;display:block;border-radius:8px;' + (rec ? 'outline:2px solid #4fd1a5;outline-offset:2px' : ''); return cv; }
  if (S.rows) {
    S.rows.forEach(function (row, ri) {
      var wrap = document.createElement('div'); wrap.style.cssText = 'margin-bottom:12px';
      var g = document.createElement('div'); g.style.cssText = 'display:grid;grid-template-columns:repeat(' + row.times.length + ',1fr);gap:6px';
      row.times.forEach(function (tt) {
        var cell = document.createElement('div');
        var full = render(row.set, tt), cv = full;
        if (S.crop) {   // a corner at 2x, so a change in the strokes can be seen in a still
          cv = document.createElement('canvas'); cv.width = R; cv.height = R;
          cv.getContext('2d').drawImage(full, S.crop[0] * R, S.crop[1] * R, S.crop[2] * R, S.crop[3] * R, 0, 0, R, R);
        }
        cell.appendChild(tileCanvas(cv, row.rec));
        var tl = document.createElement('div'); tl.style.cssText = 'color:#7f8799;font-size:10.5px;margin-top:3px;text-align:center'; tl.textContent = tt.toFixed(1) + ' s';
        cell.appendChild(tl); g.appendChild(cell);
      });
      wrap.appendChild(g); label(wrap, row, ri === 0 ? 'BEFORE' : 'AFTER'); ov.appendChild(wrap);
    });
  } else {
    var n = S.tiles.length, g = document.createElement('div');
    g.style.cssText = 'display:grid;grid-template-columns:repeat(' + n + ',1fr);gap:' + (n > 2 ? 8 : 10) + 'px';
    S.tiles.forEach(function (o, i) {
      var cell = document.createElement('div');
      var full = render(o.set, S.t == null ? 1.1 : S.t), cv = full;
      if (S.crop) {   // a part of the frame at 2x, where the difference is
        cv = document.createElement('canvas'); cv.width = R; cv.height = R;
        cv.getContext('2d').drawImage(full, S.crop[0] * R, S.crop[1] * R, S.crop[2] * R, S.crop[3] * R, 0, 0, R, R);
      }
      cell.appendChild(tileCanvas(cv, o.rec));
      label(cell, o, i === 0 ? 'BEFORE' : 'AFTER'); g.appendChild(cell);
    });
    ov.appendChild(g);
  }
  var last = ov.lastElementChild.getBoundingClientRect();
  return { sheet: window.__SHEET, contentBottom: Math.ceil(last.bottom + 16) };
})();
