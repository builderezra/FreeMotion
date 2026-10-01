/* #482 polish batch 5 (5.1 colour effects on adjustment layers, 5.2 Highlights & Shadows) — before/after strips for Ezra
   (#545: he sees every change first). Runs INSIDE the app (render5.py injects it, with window.__SHEET naming the strip).
   Every tile is the app's own renderer — FM.renderScene on a real image layer from fx-art/ carrying a real effect from
   FM.fxRegistry.makeInstance, with only the named controls set — rendered at 640x640 and scaled into the tile.
   LEFT is always today; the tiles to its right are the new control doing something he would use. */
return (async function () {
  var R = 640;
  var SHEETS = {
    'adjustment-colour-effects': {
      title: 'Adjustment layer — colour effects grade what is under it', photo: 'towers', adj: true,
      note: 'An adjustment layer above a photo and a title. Teal & Orange, Exposure, Gradient Map and 17 more colour effects could not go on one before — now they grade everything below it, the same as on the clip itself.',
      tiles: [
        { name: 'Today', sub: 'Teal & Orange is refused on an adjustment layer — nothing changes', fx: null },
        { name: 'Teal & Orange', sub: 'photo and title graded together', fx: ['tealorange', { amount: 0.9 }], rec: true },
        { name: 'Gradient Map', sub: 'deep blue to gold, over everything below', fx: ['gradientmap', { color: '#0b1640', color2: '#ffc65a' }] },
        { name: 'Exposure + Bleach Bypass', sub: 'two grades stacked on one adjustment layer', fx: [['exposure', { stops: -0.3 }], ['bleachbypass', { amount: 0.85 }]] },
      ] },
    'highlightsshadows-localradius': {
      title: 'Highlights & Shadows — Local radius', photo: 'dog',
      note: 'Shadows +70 on a dark dog. Before, it lifts everything dark by the same amount, so the blacks go milky grey. With Local radius each area is lifted by how dark its surroundings are: the dog opens up and black stays black.',
      tiles: [
        { name: 'Original', sub: 'no effect', none: true },
        { name: 'Shadows +70 (today)', sub: 'the whole picture lifted — milky blacks, flat sand', set: { highlights: 0, shadows: 70 } },
        { name: 'Shadows +70 · Local radius 40', sub: 'the dog opens up, the sand keeps its bite', set: { highlights: 0, shadows: 70, radius: 40 }, rec: true },
        { name: 'Shadows +100 · Local radius 40', sub: 'pushed further — the dog opens right up, the blacks stay black', set: { highlights: 0, shadows: 100, radius: 40 } },
      ] },
    'highlightsshadows-tonalwidth': {
      title: 'Highlights & Shadows — Tonal width', photo: 'tesla',
      note: 'How far up from black counts as a shadow. 100% (today) lifts the dark car and greys the mid-tones with it; a narrow width lifts only the deepest shadows and leaves the rest alone.',
      tiles: [
        { name: 'Shadows +80 (today, 100%)', sub: 'car lifted — sky and road go flat too', set: { highlights: 0, shadows: 80 } },
        { name: 'Tonal width 35%', sub: 'only the deep shadows lift', set: { highlights: 0, shadows: 80, width: 35 }, rec: true },
      ] },
    'highlightsshadows-whites': {
      title: 'Highlights & Shadows — Whites', photo: 'bush',
      note: 'Moves the white end on its own, leaving the shadows where they are. Pull it to calm a burnt-out sky and bright water, push it to make them glow.',
      tiles: [
        { name: 'Today', sub: 'Highlights & Shadows has no way to move the white end on its own', set: { highlights: 0, shadows: 0 } },
        { name: 'Whites −90', sub: 'the sky and the water calmed down', set: { highlights: 0, shadows: 0, whites: -90 }, rec: true },
        { name: 'Whites +80', sub: 'brighter, glowing highlights', set: { highlights: 0, shadows: 0, whites: 80 } },
      ] },
    'highlightsshadows-blacks': {
      title: 'Highlights & Shadows — Blacks', photo: 'figures',
      note: 'Moves the black end on its own. Pull it to get deep blacks back after a shadow lift, push it for a soft matte film fade.',
      tiles: [
        { name: 'Today (Blacks 0)', sub: 'default Shadows +50 — the silhouettes go grey', set: {} },
        { name: 'Blacks −80', sub: 'deep black silhouettes again', set: { blacks: -80 }, rec: true },
        { name: 'Blacks +60', sub: 'a matte, faded-film black', set: { blacks: 60 } },
      ] },
    'highlightsshadows-colourboost': {
      title: 'Highlights & Shadows — Colour boost', photo: 'revuelto',
      note: 'A shadow lift washes the colour out of what it lifts. Colour boost puts it back (or takes more out), only where Highlights and Shadows moved the picture. (Named Colour correction in the first draw — too long for the PC panel.)',
      tiles: [
        { name: 'Shadows +80 (today)', sub: 'the lifted shade goes grey and washed', set: { highlights: 0, shadows: 80 } },
        { name: 'Colour boost +60', sub: 'the lifted areas keep their colour', set: { highlights: 0, shadows: 80, sat: 60 }, rec: true },
        { name: 'Colour boost −60', sub: 'muted, desaturated shade', set: { highlights: 0, shadows: 80, sat: -60 } },
      ] },
    /* #482 5.1 review: a filter fitted to an adjustment layer now keeps its colour grades AND runs them after its Contrast /
       Saturation, the clip's order — the build ran them before, which turned Infrared into a hot magenta wash. */
    'adjustment-filter-infrared': {
      title: 'Adjustment layer — the Infrared filter', photo: 'bush', adj: true,
      note: 'The Infrared filter put on an adjustment layer over a photo and a title. Today it keeps only its Contrast and Saturation there. Now it keeps its Colour Balance and Highlights & Shadows too, applied in the same order as on the clip, so it looks like Infrared.',
      tiles: [
        { name: 'Photo', sub: 'no filter', fx: null, none: true },
        { name: 'Today', sub: 'on an adjustment layer: only Contrast and Saturation survive', filter: 'infrared', keep: 'today' },
        { name: 'Now', sub: 'on an adjustment layer: the whole Infrared look', filter: 'infrared', keep: 'now', rec: true },
        { name: 'Infrared on the photo itself', sub: 'the look to match (the title stays white here)', filter: 'infrared', onClip: true },
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
  function fxOf(type, set) { var e = FM.fxRegistry.makeInstance(type); Object.assign(e.params, set || {}); return e; }
  function render(o) {
    var l = FM.makeLayer('image', { x: R / 2, y: R / 2, start: 0, duration: 4 }); l.id = mid; l.start = 0; l.duration = 4;
    var layers = [l];
    if (S.adj) {
      var title = FM.makeLayer('text', { text: 'SUNSET DRIVE', fontSize: 70, x: R / 2, y: R * 0.82, color: '#ffffff' }); title.start = 0; title.duration = 4; title.bold = true;
      var A = FM.makeLayer('adjustment', { name: 'grade' }); A.start = 0; A.duration = 4;
      var list = !o.fx ? [] : (Array.isArray(o.fx[0]) ? o.fx : [o.fx]);
      A.effects = list.map(function (f) {
        if (!FM.fxRegistry.supportsLayer(f[0], A)) throw new Error(f[0] + ' is refused on an adjustment layer');
        return fxOf(f[0], f[1]);
      });
      if (o.filter && o.onClip) { l.effects = [FM.filters.makeInstance(o.filter)]; A.effects = []; }
      else if (o.filter) {
        var box = FM.fxRegistry.fitToLayer(FM.filters.makeInstance(o.filter), A);
        /* TODAY (v17.20) an adjustment layer kept only these sixteen (fx-registry ADJ_OK before #482 5.1) */
        var OLD = { blur: 1, brightness: 1, contrast: 1, saturate: 1, hue: 1, grayscale: 1, sepia: 1, invert: 1, glow: 1, posterize: 1, tint: 1, threshold: 1, duotone: 1, rgbsplit: 1, pixelate: 1, levels: 1 };
        if (o.keep === 'today') box.effects = box.effects.filter(function (k) { return OLD[k.type]; });
        A.effects = [box];
      }
      layers = [A, title, l];
    } else if (!o.none) l.effects = [fxOf('highlightsshadows', o.set)];
    var c = document.createElement('canvas'); c.width = R; c.height = R;
    FM.renderScene(c.getContext('2d', { willReadFrequently: true }), { project: { width: R, height: R, fps: 30, duration: 4, background: '#000000' }, layers: layers }, 1.1);
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
  var n = S.tiles.length, cols = n === 3 ? 3 : 2, g = document.createElement('div');
  g.style.cssText = 'display:grid;grid-template-columns:repeat(' + cols + ',1fr);gap:' + (cols > 2 ? '10px 8px' : '12px 10px');
  var before = S.tiles.filter(function (o) { return !o.none; })[0];
  S.tiles.forEach(function (o) {
    var cell = document.createElement('div');
    var cv = render(o);
    cv.style.cssText = 'width:100%;aspect-ratio:1;display:block;border-radius:8px;' + (o.rec ? 'outline:2px solid #4fd1a5;outline-offset:2px' : '');
    cell.appendChild(cv);
    label(cell, o, o.none ? 'PHOTO' : (o.onClip ? 'ON THE CLIP' : (o === before ? 'BEFORE' : 'AFTER'))); g.appendChild(cell);
  });
  ov.appendChild(g);
  var last = ov.lastElementChild.getBoundingClientRect();
  return { sheet: window.__SHEET, contentBottom: Math.ceil(last.bottom + 16) };
})();
