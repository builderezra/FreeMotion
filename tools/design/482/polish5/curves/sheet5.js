/* #482 polish batch 5 (5.6 Gradient Map, 5.7 Cross Process, 5.8 Exposure) — before/after strips for Ezra (#545: he sees every
   change first). Runs INSIDE the app (render5.py injects it, with window.__SHEET naming the strip). Every tile is the app's own
   renderer — FM.renderScene on a real image layer (a photo from fx-art/) carrying a real effect from FM.fxRegistry.makeInstance,
   with only the named controls set — rendered at 640x640 and scaled into the tile. The FIRST tile is always today's default;
   the others are the new controls doing something he would use. */
return (async function () {
  var R = 640;
  var SHEETS = {
    'gradientmap-colours': {
      title: 'Gradient Map — Colours: Three, with a Midtones colour', photo: 'towers', fx: 'gradientmap',
      note: 'Three colours adds a Midtones colour that sits at the Midpoint, so the map can go dark → middle → light through any three colours you pick.',
      tiles: [
        { name: 'Today (Two colours)', sub: 'indigo shadows to peach highlights', set: {} },
        { name: 'Three colours', sub: 'the rose Midtones it starts with', set: { stops: 3 }, rec: true },
        { name: 'Three · teal Midtones', sub: 'Midpoint 40%', set: { stops: 3, color3: '#2a9d8f', midpoint: 40 } },
        { name: 'Three · your own trio', sub: 'navy · burnt orange · cream', set: { stops: 3, color: '#1b1035', color3: '#e76f51', color2: '#f4e9c8' } },
      ] },
    'gradientmap-reverse': {
      title: 'Gradient Map — Reverse', photo: 'bush', fx: 'gradientmap',
      note: 'Reverse swaps the ends: the darks take the Highlights colour and the lights take the Shadows colour. The Midpoint stays where it is.',
      tiles: [
        { name: 'Today (Off)', sub: 'dark → indigo, light → peach', set: {} },
        { name: 'Reverse On', sub: 'dark → peach, light → indigo', set: { reverse: 1 }, rec: true },
        { name: 'Three colours, Off', sub: 'rose in the middle', set: { stops: 3 } },
        { name: 'Three colours, Reverse On', sub: 'the ends swap, rose stays put', set: { stops: 3, reverse: 1 } },
      ] },
    'gradientmap-blend': {
      title: 'Gradient Map — Blend', photo: 'dusk', fx: 'gradientmap',
      note: 'How the map lands on the photo. Colour keeps the photo’s light and shade and takes the map’s colours — a toned photo rather than a poster. Luminosity does the opposite.',
      tiles: [
        { name: 'Today (Normal)', sub: 'the map replaces the photo', set: {} },
        { name: 'Colour', sub: 'photo’s light and shade, map’s colours', set: { blend: 8 }, rec: true },
        { name: 'Luminosity', sub: 'photo’s colours, map’s brightness', set: { blend: 9 } },
        { name: 'Soft light', sub: 'a gentle tint over the photo', set: { blend: 4 } },
      ] },
    'crossprocess-film': {
      title: 'Cross Process — Film', photo: 'dog', fx: 'crossprocess',
      note: 'Today’s look is slide film developed as a negative: punchy and warm. Negative (pastel) is the other way round: flat, soft and blue-green.',
      tiles: [
        { name: 'Today (Slide · punchy)', sub: 'Amount 0.6', set: {} },
        { name: 'Negative (pastel)', sub: 'Amount 0.6', set: { variant: 1 }, rec: true },
        { name: 'Slide · Amount 1', sub: 'the full punch', set: { amount: 1 } },
        { name: 'Negative · Amount 1', sub: 'the full pastel', set: { variant: 1, amount: 1 } },
      ] },
    'exposure-workin': {
      title: 'Exposure — Work in: Linear light', photo: 'cat', fx: 'exposure',
      note: 'Linear light adds light the way a camera does: one stop doubles the light, so the mids brighten and the bright parts keep their detail instead of blowing out to white.',
      tiles: [
        { name: 'Today (sRGB · +0.8)', sub: 'the default', set: {} },
        { name: 'Linear light · +0.8', sub: 'same stops, gentler, the fur keeps its detail', set: { space: 1 }, rec: true },
        { name: 'sRGB · +2', sub: 'the fur and path blow out', set: { stops: 2 } },
        { name: 'Linear light · +2', sub: 'brighter, still detailed', set: { stops: 2, space: 1 } },
      ] },
    'exposure-gamma': {
      title: 'Exposure — Gamma', photo: 'cat', fx: 'exposure',
      note: 'Gamma bends the middle tones and leaves pure black and pure white where they are. Above 1 opens up the shadows, below 1 makes the mids richer.',
      tiles: [
        { name: 'Today (Gamma 1 · +0.8)', sub: 'the default', set: {} },
        { name: 'Gamma 0.7 · +0.8', sub: 'richer mids, same highlights', set: { gamma: 0.7 }, rec: true },
        { name: 'Gamma 1.8 · 0 stops', sub: 'opens the shadows only', set: { stops: 0, gamma: 1.8 } },
        { name: 'Linear · +1 · Gamma 0.8', sub: 'bright and still contrasty', set: { stops: 1, space: 1, gamma: 0.8 } },
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
    var e = FM.fxRegistry.makeInstance(S.fx); Object.assign(e.params, set || {}); l.effects = [e];
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
  var g = document.createElement('div');
  g.style.cssText = 'display:grid;grid-template-columns:1fr 1fr;gap:12px 10px';
  S.tiles.forEach(function (o, i) {
    var cell = document.createElement('div');
    var cv = render(o.set);
    cv.style.cssText = 'width:100%;aspect-ratio:1;display:block;border-radius:8px;' + (o.rec ? 'outline:2px solid #4fd1a5;outline-offset:2px' : '');
    cell.appendChild(cv);
    label(cell, o, i === 0 ? 'BEFORE' : 'AFTER'); g.appendChild(cell);
  });
  ov.appendChild(g);
  var last = ov.lastElementChild.getBoundingClientRect();
  return { sheet: window.__SHEET, contentBottom: Math.ceil(last.bottom + 16) };
})();
