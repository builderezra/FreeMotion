/* #482 polish batch 6 (6.3 Drop Shadow, 6.4 Stroke Colour) — before/after strips for Ezra (#545: he sees every change first).
   Runs INSIDE the app (render6.py injects it, with window.__SHEET naming the strip). Every tile is the app's own renderer —
   FM.renderScene on a photo from fx-art/ with a real bold text layer on top carrying real effects from
   FM.fxRegistry.makeInstance, with only the named controls set — rendered at 640x640 and scaled into the tile. The FIRST tile
   is always today's default; the others are the new controls doing something he would use. */
return (async function () {
  var R = 640;
  var SHEETS = {
    'dropshadow-spread': {
      title: 'Drop Shadow — Spread', photo: 'shore', word: 'SUMMER', size: 128,
      note: 'Spread turns the soft edge solid. 0% is today’s soft shadow; 100% is a hard shadow as big as the Softness — a bold, printed look.',
      tiles: [
        { name: 'Today (default)', sub: 'Distance 18 · Softness 6', fx: [['dropshadow', {}]] },
        { name: 'Spread 100%', sub: 'Softness 14 · a hard, bold shadow', fx: [['dropshadow', { spread: 100, softness: 14 }]], rec: true },
        { name: 'Spread 50%', sub: 'Softness 24 · solid, then soft', fx: [['dropshadow', { spread: 50, softness: 24 }]] },
        { name: 'Spread 80% · pink · Distance 0', sub: 'Softness 22 · a thick backing', fx: [['dropshadow', { spread: 80, softness: 22, distance: 0, color: '#ff2d75' }]] },
      ] },
    'dropshadow-smoothness': {
      title: 'Drop Shadow — Smoothness', photo: 'shore', word: 'SUMMER', size: 128,
      note: 'Smoothness softens the edge 1, 2 or 3 times, so a big soft shadow fades out like a real one instead of in a straight ramp. Compare the two on the bottom row.',
      tiles: [
        { name: 'Today (default)', sub: 'Softness 6 · Smoothness 1', fx: [['dropshadow', {}]] },
        { name: 'Smoothness 3', sub: 'Softness 6 · a gentler edge', fx: [['dropshadow', { smooth: 3 }]] },
        { name: 'Softness 20 · Smoothness 1', sub: 'the softest shadow today', fx: [['dropshadow', { softness: 20 }]] },
        { name: 'Softness 20 · Smoothness 3', sub: 'the same, fading out smoothly', fx: [['dropshadow', { softness: 20, smooth: 3 }]], rec: true },
      ] },
    'dropshadow-shadowonly': {
      title: 'Drop Shadow — Shadow only', photo: 'shore', word: 'SUMMER', size: 128,
      note: 'Shadow only hides the layer and keeps its whole shadow — a cut-out look, or a shadow you can place under something else.',
      tiles: [
        { name: 'Today (default)', sub: 'the words and their shadow', fx: [['dropshadow', {}]] },
        { name: 'Shadow only', sub: 'the words gone, their shadow stays', fx: [['dropshadow', { shadowonly: 1 }]], rec: true },
        { name: 'Shadow only · soft', sub: 'Distance 0 · Softness 18 · Smoothness 3', fx: [['dropshadow', { shadowonly: 1, distance: 0, softness: 18, smooth: 3 }]] },
        { name: 'Shadow only · white', sub: 'Distance 10 · Softness 0 · Opacity 80', fx: [['dropshadow', { shadowonly: 1, distance: 10, softness: 0, opacity: 80, color: '#ffffff' }]] },
      ] },
    'dropshadow-distance-softness': {
      title: 'Drop Shadow — Distance to 300, Softness to 80', photo: 'shore', word: 'SUMMER', size: 128,
      note: 'Distance stopped at 60 px and Softness at 20 px. Now they go to 300 and 80, for long poster shadows and big soft ones. The defaults are the same.',
      tiles: [
        { name: 'Today (default)', sub: 'Distance 18 · Softness 6', fx: [['dropshadow', {}]] },
        { name: 'Distance 100 · Angle 300', sub: 'Softness 14 · Spread 30 · Smoothness 2 · a long shadow up into the sky', fx: [['dropshadow', { distance: 100, angle: 300, softness: 14, spread: 30, smooth: 2 }]], rec: true },
        { name: 'Distance 300', sub: 'Softness 0 · Angle 70 · a poster drop', fx: [['dropshadow', { distance: 300, softness: 0, angle: 70, color: '#1d3557' }]] },
        { name: 'Softness 60 · Distance 0', sub: 'Spread 40 · Smoothness 2 · a big dark halo', fx: [['dropshadow', { distance: 0, softness: 60, spread: 40, smooth: 2 }]] },
      ] },
    /* #482 6.3 review fixes. A see-through card with a solid word on it: Spread grows each part at its own strength (the
       first build turned the whole card's shadow solid black the moment anything on it was solid). */
    'dropshadow-spread-seethrough': {
      title: 'Drop Shadow — Spread on a see-through card', photo: 'shore', card: true,
      note: 'A 45% white card with a solid word on it. Spread grows each part at its own strength: the card’s shadow stays as light as the card, the word’s shadow grows solid.',
      tiles: [
        { name: 'Today (default)', sub: 'Distance 18 · Softness 6', fx: [['dropshadow', {}]] },
        { name: 'Spread 100%', sub: 'Softness 14 · the card light, the word solid', fx: [['dropshadow', { spread: 100, softness: 14 }]], rec: true },
        { name: 'Spread 60%', sub: 'Softness 24 · Distance 30', fx: [['dropshadow', { spread: 60, softness: 24, distance: 30 }]] },
        { name: 'Spread 100% · Distance 0', sub: 'Softness 10 · pink · a backing that follows the card', fx: [['dropshadow', { spread: 100, softness: 10, distance: 0, color: '#ff2d75' }]] },
      ] },
    /* …and a title the frame cuts: with Shadow only its shadow now runs right to the frame edge (it stopped Distance px short). */
    'dropshadow-shadowonly-edge': {
      title: 'Drop Shadow — Shadow only at the frame edge', photo: 'shore', word: 'SUMMER', size: 150, wordX: 0.66,
      note: 'A title sliding in from the right, cut by the frame. With Shadow only its shadow runs right up to the edge, as if the words carried on past it.',
      tiles: [
        { name: 'Today (default)', sub: 'the words and their shadow', fx: [['dropshadow', {}]] },
        { name: 'Shadow only', sub: 'Distance 30 · Angle 180 · the shadow reaches the edge', fx: [['dropshadow', { shadowonly: 1, distance: 30, angle: 180, softness: 4 }]], rec: true },
        { name: 'Shadow only · Spread 60%', sub: 'Softness 16 · Distance 24', fx: [['dropshadow', { shadowonly: 1, distance: 24, softness: 16, spread: 60 }]] },
        { name: 'Shadow only · white', sub: 'Distance 14 · Softness 0 · Opacity 80', fx: [['dropshadow', { shadowonly: 1, distance: 14, softness: 0, opacity: 80, color: '#ffffff' }]] },
      ] },
    'stroke-offset': {
      title: 'Stroke Colour — Offset', photo: 'dusk', word: 'WOW', size: 190, color: '#ff3d7f',
      note: 'Offset leaves a clear gap between the layer and its outline. Stack two strokes for the sticker double outline. Only for Position: Outside.',
      tiles: [
        { name: 'Today (default)', sub: 'white outline, 4 px', fx: [['stroke', {}]] },
        { name: 'Offset 8', sub: 'Width 5 · a gap, then the outline', fx: [['stroke', { gap: 8, width: 5 }]], rec: true },
        { name: 'Sticker double outline', sub: 'white 10, then blue 5 with Offset 6', fx: [['stroke', { width: 10 }], ['stroke', { width: 5, gap: 6, color: '#22c3ff' }]] },
        { name: 'Offset 12 · Round corners', sub: 'Width 3 · yellow', fx: [['stroke', { gap: 12, width: 3, shape: 1, color: '#ffd23f' }]] },
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
  var mid = '_482p6_' + S.photo;
  FM.media.set(mid, { kind: 'image', el: base, width: R, height: R, duration: 0 }); if (FM.media.pin) FM.media.pin(mid);
  /* a see-through card with a solid word on it (S.card): a real image layer, its own pixels at 45% and 100% */
  var cid = '_482p6_card';
  if (S.card) {
    var cc = document.createElement('canvas'); cc.width = 420; cc.height = 230; var cg = cc.getContext('2d');
    cg.fillStyle = 'rgba(255,255,255,0.45)'; cg.beginPath(); if (cg.roundRect) cg.roundRect(0, 0, 420, 230, 34); else cg.rect(0, 0, 420, 230); cg.fill();
    cg.fillStyle = '#ffffff'; cg.font = 'bold 120px Helvetica Neue, Arial, sans-serif'; cg.textAlign = 'center'; cg.textBaseline = 'middle'; cg.fillText('SALE', 210, 122);
    FM.media.set(cid, { kind: 'image', el: cc, width: 420, height: 230, duration: 0 }); if (FM.media.pin) FM.media.pin(cid);
  }
  function render(fxs) {
    var l = FM.makeLayer('image', { x: R / 2, y: R / 2, start: 0, duration: 4 }); l.id = mid; l.start = 0; l.duration = 4;
    var tx;
    if (S.card) { tx = FM.makeLayer('image', { x: R / 2, y: R * 0.46, start: 0, duration: 4 }); tx.id = cid; tx.transform.scale = 1; }
    else tx = FM.makeLayer('text', { text: S.word, x: R * (S.wordX || 0.5), y: R * 0.46, fontSize: S.size, color: S.color || '#ffffff', fontFamily: 'Helvetica Neue, Arial, sans-serif', start: 0, duration: 4 });
    tx.bold = true; tx.start = 0; tx.duration = 4;
    tx.effects = fxs.map(function (f) { var e = FM.fxRegistry.makeInstance(f[0]); Object.assign(e.params, f[1] || {}); return e; });
    var c = document.createElement('canvas'); c.width = R; c.height = R;
    FM.renderScene(c.getContext('2d', { willReadFrequently: true }), { project: { width: R, height: R, fps: 30, duration: 4, background: '#000000' }, layers: [tx, l] }, 1.1);   // the first layer is the TOP one
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
    var cv = render(o.fx);
    cv.style.cssText = 'width:100%;aspect-ratio:1;display:block;border-radius:8px;' + (o.rec ? 'outline:2px solid #4fd1a5;outline-offset:2px' : '');
    cell.appendChild(cv);
    label(cell, o, i === 0 ? 'BEFORE' : 'AFTER'); g.appendChild(cell);
  });
  ov.appendChild(g);
  var last = ov.lastElementChild.getBoundingClientRect();
  return { sheet: window.__SHEET, contentBottom: Math.ceil(last.bottom + 16) };
})();
