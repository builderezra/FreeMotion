/* #482 polish batch 6 light (6.1 Vignette, 6.2 Light / Soft / Dark Glow) — before/after strips for Ezra (#545: he sees every
   change first). Runs INSIDE the app (tools/design/482/polish6/light/render6.py injects it, with window.__SHEET naming the
   strip). Every tile is the app's own renderer — FM.renderScene on his fx-art photos (and, for the title strips, a real text
   layer over a photo) carrying a real effect from FM.fxRegistry.makeInstance, with only the named controls set.
   The FIRST tile is always today's look; the tiles after it are the new control doing something he would use.
   `zoom` adds a second row: the same tiles, one part of the frame at 2x, where the difference is. */
return (async function () {
  var R = 640;
  var SHEETS = {
    'vignette-roundness': {
      title: 'Vignette — Roundness', photo: 'cat', tall: true, fx: 'vignette', base: { amount: 0.85 },
      note: 'On a 9:16 phone video the vignette was a circle, so it darkened the top and bottom far more than the sides — two dark bands. Roundness 0 fits it to the frame: the sides and the top darken alike, the corners stay darkest. Amount 0.85 here to make it plain.',
      cols: 2,
      tiles: [
        { name: 'Today (Roundness 100)', sub: 'dark bands top and bottom, sides untouched', set: {} },
        { name: 'Roundness 0', sub: 'an even frame all round', set: { round: 0 }, rec: true },
      ] },
    'vignette-feather': {
      title: 'Vignette — Feather', photo: 'dog', fx: 'vignette', base: { amount: 0.8 },
      note: 'How soft the fade is. Higher starts it nearer the middle for a gentle, wide darkening; lower makes a sharper ring, like an old lens. Amount 0.8 here to make it plain.',
      cols: 3,
      tiles: [
        { name: 'Today (100%)', sub: 'the fade it always had', set: {} },
        { name: 'Feather 300%', sub: 'soft and wide', set: { feather: 300 }, rec: true },
        { name: 'Feather 30%', sub: 'a sharp ring', set: { feather: 30 } },
      ] },
    'vignette-centre': {
      title: 'Vignette — Centre X / Y', photo: 'revuelto', fx: 'vignette', base: { amount: 0.85, size: 10 },
      note: 'Moves the clear middle of the vignette onto what matters, instead of always the centre of the frame. Here it sits on the orange car. Amount 0.85 and Size 10 here to make it plain.',
      cols: 2,
      tiles: [
        { name: 'Today (centred)', sub: 'the light falls between the cars', set: {} },
        { name: 'Centre X 24%, Y 72%', sub: 'the light sits on the orange car', set: { x: 24, y: 72 }, rec: true },
      ] },
    'vignette-mode': {
      title: 'Vignette — Mode', photo: 'shore', fx: 'vignette', base: { amount: 0.8, size: 25 },
      note: 'Darken is the vignette you have. Lighten fades the edges to white — a soft, dreamy frame. Colour fades them to any colour you pick (the Colour row wakes up). Amount 0.8 here to make it plain.',
      cols: 3,
      tiles: [
        { name: 'Today (Darken)', sub: 'dark edges', set: {} },
        { name: 'Lighten', sub: 'white, dreamy edges', set: { mode: 1 }, rec: true },
        { name: 'Colour (deep blue)', sub: 'edges fade to blue', set: { mode: 2, color: '#14206e' } },
      ] },
    'vignette-protecthighlights': {
      title: 'Vignette — Protect highlights', photo: 'dusk', fx: 'vignette', base: { amount: 1, size: 10 },
      note: 'Keeps the brightest things in the picture — lamps, windows, the sun — lit even where the vignette darkens. Mid-tones still darken, only the bright parts are spared. A strong vignette (Amount 1, Size 10) to show it; look at the lit windows bottom right.',
      cols: 2, zoom: [0.55, 0.55, 0.45, 0.45],
      tiles: [
        { name: 'Today (0%)', sub: 'the lit windows go dim with the corner', set: {} },
        { name: 'Protect highlights 100%', sub: 'the windows stay lit, the rest still darkens', set: { hilite: 100 }, rec: true },
      ] },
    'lightglow-thresholdsoftness': {
      title: 'Light Glow — Threshold softness', photo: 'ramp', fx: 'lightglow', base: { amount: 1, radius: 4, threshold: 45 },
      note: 'Light Glow switched fully on at the Threshold, so a smooth sky got a hard line where its brightness crossed it. Threshold softness fades the glow in across the threshold instead — no line. Amount 1 and Threshold 45 here to make it plain; the close-up is the sky above the horizon.',
      cols: 2, zoom: [0.3, 0.2, 0.4, 0.4],
      tiles: [
        { name: 'Today (0%)', sub: 'a hard edge where the glow starts', set: {} },
        { name: 'Threshold softness 100%', sub: 'the glow fades in, no edge', set: { knee: 100 }, rec: true },
      ] },
    'lightglow-smoothness': {
      title: 'Light Glow — Smoothness', photo: 'figures', fx: 'lightglow', base: { amount: 1, radius: 30, threshold: 70 },
      note: 'The glow was one quick blur, so a round light got a square-ish halo with a hard rim. Smoothness 3 blurs it three times: a round, soft halo that fades out naturally. Amount 1 and Radius 30 here to make it plain; the close-up is the sky round the sun.',
      cols: 2, zoom: [0.2, 0.12, 0.6, 0.6],
      tiles: [
        { name: 'Today (1)', sub: 'a boxy halo with a hard rim', set: {} },
        { name: 'Smoothness 3', sub: 'a round halo that fades out', set: { passes: 3 }, rec: true },
      ] },
    'lightglow-glowpasttheedges': {
      title: 'Light Glow — Glow past the edges', photo: 'figures', title2: { text: 'GLOW', color: '#fff2c0' }, fx: 'lightglow', base: { amount: 1, radius: 14, threshold: 50 },
      note: 'On a title the glow stopped dead at the letters, because it could only light the layer’s own pixels. Glow past the edges lets it spill into the space round them — a real neon halo. Amount 1 and Radius 14.',
      cols: 2,
      tiles: [
        { name: 'Today (Off)', sub: 'no halo round the letters', set: {} },
        { name: 'Glow past the edges On', sub: 'the halo spills round the title', set: { outside: 1 }, rec: true },
      ] },
    'lightglow-blend': {
      title: 'Light Glow — Blend', photo: 'city', fx: 'lightglow', base: { amount: 1, radius: 16, threshold: 55 },
      note: 'How the glow lands on the picture. Screen is today’s. Add burns hotter and brighter. Soft light lifts the bright parts but keeps the darks dark, so the picture is not washed out. Amount 1 here to make it plain.',
      cols: 3,
      tiles: [
        { name: 'Today (Screen)', sub: 'a bright haze', set: {} },
        { name: 'Add', sub: 'hotter, burns out', set: { blend: 1 } },
        { name: 'Soft light', sub: 'glowing, keeps the darks', set: { blend: 2 }, rec: true },
      ] },
    'lightglow-colourfrom': {
      title: 'Light Glow — Colour from', photo: 'sunpath', fx: 'lightglow', base: { amount: 1, radius: 20, threshold: 50 },
      note: 'The glow was always one colour (the Glow colour, white unless he picks one). Source colour makes each bright area glow its own colour — the sun glows orange. The Glow colour row greys out while it is on.',
      cols: 2,
      tiles: [
        { name: 'Today (Chosen colour, white)', sub: 'a white haze over the sun', set: {} },
        { name: 'Source colour', sub: 'the sun glows its own orange', set: { from: 1 }, rec: true },
      ] },
    'softglow-glowpasttheedges': {
      title: 'Soft Glow — Glow past the edges', photo: 'figures', title2: { text: 'SOFT', color: '#ffd6f0' }, fx: 'softglow', base: { amount: 1, radius: 120, threshold: 30 },
      note: 'Soft Glow had the same wall at the layer’s edge. With Glow past the edges On its dreamy bloom spreads off the letters. Amount 1, Radius 120% and Smoothness 2 here.',
      cols: 2,
      tiles: [
        { name: 'Today (Off)', sub: 'the bloom stays inside the letters', set: {} },
        { name: 'Glow past the edges On', sub: 'a soft bloom round the title', set: { outside: 1, passes: 2 }, rec: true },
      ] },
    'softglow-colourfrom': {
      title: 'Soft Glow — Colour from', photo: 'clouds', fx: 'softglow', base: { amount: 1, radius: 150, threshold: 30 },
      note: 'Source colour lets the soft bloom take the picture’s own colours — a pink sky blooms pink instead of washing out white. Amount 1 here to make it plain.',
      cols: 2,
      tiles: [
        { name: 'Today (Chosen colour, white)', sub: 'a white wash over the sky', set: {} },
        { name: 'Source colour', sub: 'the pink sky blooms pink', set: { from: 1 }, rec: true },
      ] },
    'darkglow-glowpasttheedges': {
      title: 'Dark Glow — Glow past the edges', photo: 'shore', title2: { text: 'DARK', color: '#1a1420' }, fx: 'darkglow', base: { amount: 1, radius: 12 },
      note: 'Dark Glow spreads the dark parts. On a dark title it now spreads past the letters too — a soft dark haze behind them that makes the title read on a bright sky. Amount 1, Radius 12, Smoothness 2.',
      cols: 2,
      tiles: [
        { name: 'Today (Off)', sub: 'nothing round the letters', set: {} },
        { name: 'Glow past the edges On', sub: 'a soft dark haze behind the title', set: { outside: 1, passes: 2 }, rec: true },
      ] },
    'darkglow-blend': {
      title: 'Dark Glow — Blend', photo: 'tesla', fx: 'darkglow', base: { amount: 1, radius: 10, threshold: 45 },
      note: 'How the dark glow lands. Multiply is today’s. Subtract sinks the shadows harder and deeper. Soft light deepens the darks gently without crushing them to black. Amount 1 here to make it plain.',
      cols: 3,
      tiles: [
        { name: 'Today (Multiply)', sub: 'darker shadows', set: {} },
        { name: 'Subtract', sub: 'deep, heavy shadows', set: { blend: 1 } },
        { name: 'Soft light', sub: 'gentle, keeps detail', set: { blend: 2 }, rec: true },
      ] },
  };
  var S = SHEETS[window.__SHEET];
  if (!S) throw new Error('no sheet ' + window.__SHEET);
  var im = await new Promise(function (ok, bad) {
    var i = new Image(); i.onload = function () { ok(i); }; i.onerror = function () { bad(new Error('no photo ' + S.photo)); };
    i.src = 'fx-art/' + S.photo + '.jpg?v=1';
  });
  /* A 9:16 strip gets a 9:16 CLIP (the photo centre-cropped into it), because a vignette fits the clip's own frame. */
  var FW = S.tall ? 360 : R, FH = S.tall ? 640 : R;
  var base = document.createElement('canvas'); base.width = FW; base.height = FH;
  var bg = base.getContext('2d'); bg.imageSmoothingQuality = 'high';
  var sw = im.naturalWidth, sh = im.naturalHeight, sx = 0, sy = 0;
  if (sw / sh > FW / FH) { var nw = sh * FW / FH; sx = (sw - nw) / 2; sw = nw; } else { var nh = sw * FH / FW; sy = (sh - nh) / 2; sh = nh; }
  bg.drawImage(im, sx, sy, sw, sh, 0, 0, FW, FH);
  var mid = '_482p6l_' + S.photo + (S.tall ? '_tall' : '');
  FM.media.set(mid, { kind: 'image', el: base, width: FW, height: FH, duration: 0 }); if (FM.media.pin) FM.media.pin(mid);
  function render(set) {
    var l = FM.makeLayer('image', { x: FW / 2, y: FH / 2, start: 0, duration: 4 }); l.id = mid; l.start = 0; l.duration = 4;
    var e = FM.fxRegistry.makeInstance(S.fx); Object.assign(e.params, S.base || {}, set || {});
    var layers = [l];
    if (S.title2) {   // a real text layer carrying the effect, over the photo carrying nothing
      var T = FM.makeLayer('text', { text: S.title2.text, x: FW / 2, y: FH * 0.42, fontSize: 168, color: S.title2.color }); T.start = 0; T.duration = 4; T.bold = true; T.letterSpacing = 4;
      T.effects = [e]; layers = [T, l];
    } else l.effects = [e];
    var c = document.createElement('canvas'); c.width = FW; c.height = FH;
    FM.renderScene(c.getContext('2d', { willReadFrequently: true }), { project: { width: FW, height: FH, fps: 30, duration: 4, background: '#000000' }, layers: layers }, 1.1);
    return c;
  }
  var ov = document.createElement('div');
  ov.style.cssText = 'position:fixed;inset:0;z-index:2147483647;background:#0f1117;color:#e9ecf3;font:14px -apple-system,system-ui,sans-serif;padding:16px 14px;box-sizing:border-box;overflow:hidden';
  var head = document.createElement('div'); head.style.cssText = 'font-weight:700;font-size:18px;letter-spacing:-.2px'; head.textContent = S.title; ov.appendChild(head);
  var nt = document.createElement('div'); nt.style.cssText = 'color:#a8afbf;font-size:12.5px;line-height:1.4;margin:5px 0 12px'; nt.textContent = S.note; ov.appendChild(nt);
  document.body.appendChild(ov);
  function label(parent, o, tag) {
    var t = document.createElement('div'); t.style.cssText = 'font-weight:650;font-size:' + ((S.cols || 2) >= 3 ? 12 : 13) + 'px;margin-top:6px;line-height:1.25';
    var k = document.createElement('span'); k.style.cssText = 'display:block;color:' + (tag === 'BEFORE' ? '#a8afbf' : '#ffc857') + ';font-size:10.5px;font-weight:800;letter-spacing:.4px';
    k.textContent = tag + (o.rec ? ' · RECOMMENDED' : ''); t.appendChild(k); t.appendChild(document.createTextNode(o.name)); parent.appendChild(t);
    var s = document.createElement('div'); s.style.cssText = 'color:#a8afbf;font-size:11.5px;line-height:1.3;margin-top:1px'; s.textContent = o.sub; parent.appendChild(s);
  }
  function tileCanvas(cv, rec) { cv.style.cssText = 'width:100%;aspect-ratio:' + FW + '/' + FH + ';display:block;border-radius:8px;' + (rec ? 'outline:2px solid #4fd1a5;outline-offset:2px' : ''); return cv; }
  function crop(full, c) { var cv = document.createElement('canvas'); cv.width = FW; cv.height = FH; cv.getContext('2d').drawImage(full, c[0] * FW, c[1] * FH, c[2] * FW, c[3] * FH, 0, 0, FW, FH); return cv; }
  var fulls = S.tiles.map(function (o) { return render(o.set); });
  var g = document.createElement('div');
  g.style.cssText = 'display:grid;grid-template-columns:repeat(' + (S.cols || S.tiles.length) + ',1fr);gap:12px 10px';
  S.tiles.forEach(function (o, i) {
    var cell = document.createElement('div');
    cell.appendChild(tileCanvas(fulls[i], o.rec));
    label(cell, o, i === 0 ? 'BEFORE' : 'AFTER'); g.appendChild(cell);
  });
  ov.appendChild(g);
  if (S.zoom) {
    var zt = document.createElement('div'); zt.style.cssText = 'color:#7f8799;font-size:11.5px;margin:12px 0 6px'; zt.textContent = 'Close-up, ' + (1 / S.zoom[2]).toFixed(1).replace('.0', '') + 'x — same pictures'; ov.appendChild(zt);
    var z = document.createElement('div');
    z.style.cssText = 'display:grid;grid-template-columns:repeat(' + (S.cols || S.tiles.length) + ',1fr);gap:10px';
    S.tiles.forEach(function (o, i) { var cell = document.createElement('div'); cell.appendChild(tileCanvas(crop(fulls[i], S.zoom), o.rec)); z.appendChild(cell); });
    ov.appendChild(z);
  }
  var last = ov.lastElementChild.getBoundingClientRect();
  return { sheet: window.__SHEET, contentBottom: Math.ceil(last.bottom + 16) };
})();
