/* #482 polish batch 5 (5.3 Teal & Orange, 5.4 Tint, 5.5 Duotone) — before/after strips for Ezra (#545: he sees every change
   first). Runs INSIDE the app (tools/design/482/polish5/looks/render5.py injects it, with window.__SHEET naming the strip).
   Every tile is the app's own renderer — FM.renderScene on a real photo layer from fx-art/ carrying a real effect from
   FM.fxRegistry.makeInstance, with only the named controls set — rendered at 640x640 and scaled into the tile.
   The FIRST tile is always today's default; the tiles after it are the new control doing something he would use.
   `zoom` adds a second row: the same tiles, one part of the frame at 2x, where the difference is. */
return (async function () {
  var R = 640;
  var SHEETS = {
    'tealorange-splitsby': {
      title: 'Teal & Orange — Splits by', photo: 'dog', fx: 'tealorange',
      note: 'Today the grade splits by brightness, so anything dark goes teal — the dog in shade turns blue. Splits by Hue sends warm colours (skin, fur, sand, sunset) to orange and cool ones (sea, sky) to teal, however bright they are.',
      cols: 2, zoom: [0.3, 0.32, 0.42, 0.42],
      tiles: [
        { name: 'Today (Brightness)', sub: 'the dark dog goes teal', set: {} },
        { name: 'Splits by Hue', sub: 'the dog stays brown, the sky goes teal', set: { mode: 1 }, rec: true },
      ] },
    'tealorange-protectskin': {
      title: 'Teal & Orange — Protect skin', photo: 'cat', fx: 'tealorange',
      note: 'Holds skin colours back from the grade so faces keep their own tone while the rest takes the look. The cat’s ginger coat is in the same colour range as skin, so it shows what a face would do. It covers pale, deep brown and rosy skin alike, so anything else that colour is held back too — here the brown stones in the gravel keep their warmth. Amount 1 here to make it plain.',
      cols: 2, zoom: [0.38, 0.38, 0.4, 0.4],
      tiles: [
        { name: 'Today (Protect skin 0%)', sub: 'the ginger coat goes grey-teal in shadow', set: { amount: 1 } },
        { name: 'Protect skin 100%', sub: 'the coat keeps its own colour, and so do the brown stones', set: { amount: 1, skin: 100 }, rec: true },
      ] },
    'tealorange-balance': {
      title: 'Teal & Orange — Balance', photo: 'tesla', fx: 'tealorange',
      note: 'Trades teal for orange. Below 0 the shadows go deeper teal and the lights stay closer to true; above 0 the lights go richer orange and the shadows stay closer to true.',
      cols: 2,
      tiles: [
        { name: 'Today (Balance 0)', sub: 'even teal and orange', set: { amount: 0.8 } },
        { name: 'Balance −70', sub: 'mostly teal: a cold, moody look', set: { amount: 0.8, balance: -70 }, rec: true },
        { name: 'Balance +70', sub: 'mostly orange: a warm, golden look', set: { amount: 0.8, balance: 70 } },
      ] },
    'tealorange-keepbrightness': {
      title: 'Teal & Orange — Keep brightness', photo: 'towers', fx: 'tealorange',
      note: 'Today the grade also darkens the shadows and brightens the lights a little. Keep brightness holds every pixel at its own brightness, so it is a colour change only. Amount 1 here to make it plain.',
      cols: 2, zoom: [0.5, 0.45, 0.45, 0.45],
      tiles: [
        { name: 'Today (Keep brightness 0%)', sub: 'shadows sink, lights lift', set: { amount: 1 } },
        { name: 'Keep brightness 100%', sub: 'same colours, the photo’s own light', set: { amount: 1, keep: 100 }, rec: true },
      ] },
    'tint-tintover': {
      title: 'Tint — Method', photo: 'revuelto', fx: 'tint', base: { color: '#2f6bff' },
      note: 'Today Tint replaces every colour with one colour — under a blue Tint the orange car is the same blue as the road. Tint over lays the colour over the photo instead: the car stays red rather than turning blue (the blue pulls it a little pinker) and the whole shot takes a cool cast.',
      cols: 2,
      tiles: [
        { name: 'Today (Colourise)', sub: 'blue Tint, Amount 1: one colour', set: {} },
        { name: 'Tint over', sub: 'blue Tint, Amount 1: a red-pink car, a cool shot', set: { mode: 1 }, rec: true },
      ] },
    'tint-rangewidth': {
      title: 'Tint — Range width', photo: 'city', fx: 'tint', base: { color: '#2f6bff', range: 1, amount: 0.8 },
      note: 'With Range on Shadows (or Midtones or Highlights), Range width says how far the tint reaches. 100% is today’s range. Under Range All there is no range to widen, so the row greys out.',
      cols: 2,
      tiles: [
        { name: 'Today (Range width 100%)', sub: 'blue in the shadows', set: {} },
        { name: 'Range width 200%', sub: 'reaches up into the midtones', set: { soft: 200 }, rec: true },
        { name: 'Range width 40%', sub: 'only the deepest shadows', set: { soft: 40 } },
      ] },
    'duotone-blend': {
      title: 'Duotone — Blend', photo: 'towers', fx: 'duotone',
      note: 'Today the two colours replace the photo. Soft light and Overlay lay them over it as a cast, so the photo’s own colours show through; Colour takes the two colours but keeps every bit of the photo’s light and detail.',
      cols: 2,
      tiles: [
        { name: 'Today (Replace)', sub: 'the two colours only', set: {} },
        { name: 'Colour', sub: 'their colours, the photo’s light', set: { blend: 3 }, rec: true },
        { name: 'Soft light', sub: 'a gentle two-colour cast', set: { blend: 1 } },
        { name: 'Overlay', sub: 'a stronger cast, more contrast', set: { blend: 2 } },
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
  var mid = '_482p5_' + S.photo;
  FM.media.set(mid, { kind: 'image', el: base, width: R, height: R, duration: 0 }); if (FM.media.pin) FM.media.pin(mid);
  function render(set) {
    var l = FM.makeLayer('image', { x: R / 2, y: R / 2, start: 0, duration: 4 }); l.id = mid; l.start = 0; l.duration = 4;
    var e = FM.fxRegistry.makeInstance(S.fx); Object.assign(e.params, S.base || {}, set || {}); l.effects = [e];
    var c = document.createElement('canvas'); c.width = R; c.height = R;
    FM.renderScene(c.getContext('2d', { willReadFrequently: true }), { project: { width: R, height: R, fps: 30, duration: 4, background: '#000000' }, layers: [l] }, 1.1);
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
  function crop(full, c) { var cv = document.createElement('canvas'); cv.width = R; cv.height = R; cv.getContext('2d').drawImage(full, c[0] * R, c[1] * R, c[2] * R, c[3] * R, 0, 0, R, R); return cv; }
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
    var zt = document.createElement('div'); zt.style.cssText = 'color:#7f8799;font-size:11.5px;margin:12px 0 6px'; zt.textContent = 'Close-up, 2x — same two pictures'; ov.appendChild(zt);
    var z = document.createElement('div');
    z.style.cssText = 'display:grid;grid-template-columns:repeat(' + (S.cols || S.tiles.length) + ',1fr);gap:10px';
    S.tiles.forEach(function (o, i) { var cell = document.createElement('div'); cell.appendChild(tileCanvas(crop(fulls[i], S.zoom), o.rec)); z.appendChild(cell); });
    ov.appendChild(z);
  }
  var last = ov.lastElementChild.getBoundingClientRect();
  return { sheet: window.__SHEET, contentBottom: Math.ceil(last.bottom + 16) };
})();
