/* FreeMotion — automated test suite (headless render + DOM assertions).
 *
 * Tests use SYNTHETIC scenes only — never personal media. They run in the app's
 * page context (FM already loaded). Two ways to run:
 *   • Open  /tests/run.html  in the preview for a green/red report.
 *   • Headless (agents / preview_eval):
 *       fetch('tests/tests.js').then(r=>r.text()).then(eval).then(()=>FMTests.run()).then(r=>JSON.stringify(r))
 *
 * Test tiers:
 *   regression — must ALWAYS be green; a red here blocks any commit.
 *   pending    — encodes an un-built BACKLOG gap; red is expected until that item ships,
 *                then it flips to green and graduates to regression.
 */
(function () {
  'use strict';

  function scene(layers, over) {
    return Object.assign({
      project: { width: 320, height: 240, fps: 30, duration: 5, background: '#000000' },
      layers: layers, selectedId: null, selectedIds: []
    }, over || {});
  }
  function offscreen(w, h) { var c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
  function px(ctx, x, y) { return ctx.getImageData(x, y, 1, 1).data; }

  var T = [];
  function test(name, opts, fn) {
    if (typeof opts === 'function') { fn = opts; opts = {}; }
    T.push({ name: name, pending: !!opts.pending, item: opts.item || '', fn: fn });
  }

  /* ---------------- regression (must stay green) ---------------- */

  test('render: a red shape draws red at its centre', { item: 'render-core' }, function () {
    var s = scene([FM.makeLayer('shape', { shape: 'rect', x: 160, y: 120, shapeW: 100, shapeH: 100, fill: '#ff0000' })]);
    var c = offscreen(320, 240); FM.renderScene(c.getContext('2d'), s, 0);
    var p = px(c.getContext('2d'), 160, 120);
    if (!(p[0] > 200 && p[1] < 60 && p[2] < 60)) throw new Error('centre pixel not red: ' + [p[0], p[1], p[2]]);
  });

  test('keyframes: ease-in x sits below the linear midpoint', { item: 'keyframes' }, function () {
    var L = FM.makeLayer('shape', { shape: 'rect', x: 0, y: 120, shapeW: 20, shapeH: 20, fill: '#fff' });
    L.transform.x = { kf: [{ t: 0, v: 0, e: 'easeIn', bez: [.42, 0, 1, 1] }, { t: 1, v: 100, e: 'easeIn', bez: [.42, 0, 1, 1] }] };
    var mid = FM.evalProp(L.transform.x, 0.5);
    if (!(mid < 45)) throw new Error('easeIn midpoint not < 45: ' + mid);
  });

  test('save/load: scene survives serialize → JSON → parse', { item: 'save-load' }, async function () {
    var s = scene([
      FM.makeLayer('text', { name: 'A', text: 'hi', x: 50, y: 50 }),
      FM.makeLayer('shape', { name: 'B', shape: 'rect', x: 100, y: 100 })
    ]);
    var obj = await FM.storage.serializeScene(s);
    var rt = JSON.parse(JSON.stringify(obj));
    var a = s.layers.map(function (l) { return l.id; }).join(',');
    var b = rt.layers.map(function (l) { return l.id; }).join(',');
    if (a !== b) throw new Error('layer ids changed across roundtrip: ' + a + ' vs ' + b);
  });

  /* ---- graduated 2026-08-08: these shipped and went green, so per the header rule they are
     regression tests now. They had been sitting as 'pending' long after the gap they encoded closed. ---- */

  test('touch: #preview has touch-action:none', { item: 'mobile-touch' }, function () {
    var el = document.getElementById('preview');
    if (!el) throw new Error('#preview missing');
    var ta = getComputedStyle(el).touchAction;
    if (ta !== 'none') throw new Error('#preview touch-action="' + ta + '", expected none (drags would scroll the page)');
  });

  test('touch: a selection-box handle has touch-action:none', { item: 'mobile-touch' }, function () {
    var el = document.querySelector('.sb-handle');
    if (!el) throw new Error('no .sb-handle in DOM');
    var ta = getComputedStyle(el).touchAction;
    if (ta !== 'none') throw new Error('.sb-handle touch-action="' + ta + '", expected none');
  });

  test('mobile: inspector drawer toggle exists', { item: 'mobile-layout' }, function () {
    if (!document.getElementById('insp-toggle')) throw new Error('no #insp-toggle (inspector unreachable on phone)');
  });

  /* ---------------- (also graduated 2026-08-08) ---------------- */

  test('blend: luminosity mode actually composites (not a normal-mode fallback)', { item: 'blend-modes' }, function () {
    var blue = FM.makeLayer('shape', { shape: 'rect', x: 160, y: 120, shapeW: 320, shapeH: 240, fill: '#0000ff' });
    var red = FM.makeLayer('shape', { shape: 'rect', x: 160, y: 120, shapeW: 320, shapeH: 240, fill: '#ff0000' });
    red.blendMode = 'luminosity';
    var c = offscreen(320, 240); FM.renderScene(c.getContext('2d'), scene([blue, red]), 0);
    var p = px(c.getContext('2d'), 160, 120);
    if (p[0] > 200 && p[2] < 60) throw new Error('luminosity fell back to normal (got pure red) — mode not in BLEND map');
  });

  test('audio: file input accepts audio/*', { item: 'audio-import' }, function () {
    var fi = document.getElementById('file-input');
    if (!fi || !/audio/.test(fi.accept || '')) throw new Error('file-input accept lacks audio: "' + (fi && fi.accept) + '"');
  });

  /* ---------------- regression: bugs that shipped broken once (v4.66 → v4.70) ----------------
   * Each of these encodes a defect that reached a release. Three were found by review rather than by
   * using the app, and one was a regression introduced by the fix for another — so they are exactly
   * the failures a suite is for. Keep them fast and synthetic; none of them touch media. */

  test('preview: on-screen size does not depend on the canvas backing store', { item: 'preview-shrink' }, function () {
    // v4.66: #canvas-wrap was content-sized, so it tracked canvas.width and the adaptive quality tier
    // physically shrank the picture (measured 508px -> 302px) instead of only softening it.
    var wrap = document.getElementById('canvas-wrap'), c = document.getElementById('preview');
    if (!wrap || !c) throw new Error('#canvas-wrap / #preview missing');
    var w0 = Math.round(wrap.getBoundingClientRect().width), ow = c.width, oh = c.height;
    if (!(w0 > 0)) throw new Error('#canvas-wrap has no width to compare');
    try {
      c.width = Math.max(1, Math.round(ow * 0.28)); c.height = Math.max(1, Math.round(oh * 0.28));
      void wrap.offsetHeight;
      var w1 = Math.round(wrap.getBoundingClientRect().width);
      if (Math.abs(w1 - w0) > 1) throw new Error('wrap went ' + w0 + 'px -> ' + w1 + 'px when the backing store shrank — dropping a quality tier would shrink the picture');
    } finally { c.width = ow; c.height = oh; if (FM.resizeCanvas) FM.resizeCanvas(); }
  });

  test('preview: a blur covers the same picture at any render scale', { item: 'filter-scale' }, function () {
    // v4.69: every length in ctx.filter / ctx.shadow* is DEVICE-space, so on a reduced preview a blur
    // covered proportionally more of the frame than it will in the export.
    function rampProjectPx(stamp) {
      var W = 320, H = 240;
      var L = FM.makeLayer('shape', { shape: 'rect', x: 240, y: 120, shapeW: 160, shapeH: 240, fill: '#ffffff' });
      L.effects = [{ type: 'blur', enabled: true, params: { radius: 8 } }];
      var c = offscreen(Math.round(W * stamp), Math.round(H * stamp));
      if (stamp !== 1) { c.__fmRS = stamp; c.__fmOX = 0; c.__fmOY = 0; }
      var x = c.getContext('2d', { willReadFrequently: true });
      FM.renderScene(x, scene([L]), 0);
      // Measure LUMA, not alpha: the project background is opaque, so alpha is 255 across the whole
      // row and an alpha ramp would always read zero. (This test failed that way when first written.)
      var row = x.getImageData(0, Math.round(120 * stamp), c.width, 1).data, i, max = 0;
      for (i = 0; i < c.width; i++) max = Math.max(max, row[i * 4]);
      if (!max) throw new Error('nothing rendered at render scale ' + stamp);
      var lo = null, hi = null;
      for (i = 0; i < c.width; i++) {
        var a = row[i * 4];
        if (lo === null && a >= max * 0.10) lo = i;
        if (hi === null && a >= max * 0.90) { hi = i; break; }
      }
      if (lo === null || hi === null) throw new Error('no edge ramp found at render scale ' + stamp);
      return (hi - lo) / stamp;                        // express the ramp in PROJECT pixels
    }
    var full = rampProjectPx(1), half = rampProjectPx(0.5);
    if (!(full > 2)) throw new Error('no measurable blur at full scale (' + full + 'px) — test is not exercising the blur');
    var ratio = half / full;
    if (ratio > 1.5) throw new Error('a half-scale preview blurs ' + ratio.toFixed(2) + 'x wider than the export — filter lengths need * plateScale(ctx)');
  });

  test('frame cache: the memory budget follows the device', { item: 'frame-cache-oom' }, function () {
    // v4.70: a flat 384MB of ImageBitmaps on every device is what OOM-kills mobile Safari.
    if (!FM.frameCacheLimits) throw new Error('FM.frameCacheLimits missing');
    var realDM = Object.getOwnPropertyDescriptor(Navigator.prototype, 'deviceMemory'), realMM = window.matchMedia;
    function env(gb, fine) {
      Object.defineProperty(navigator, 'deviceMemory', { value: gb, configurable: true });
      window.matchMedia = function (q) { return { matches: /pointer: fine/.test(q) ? fine : false, media: q }; };
      try { return FM.frameCacheLimits(); } finally {
        delete navigator.deviceMemory;
        if (realDM) Object.defineProperty(Navigator.prototype, 'deviceMemory', realDM);
        window.matchMedia = realMM;
      }
    }
    var MB = 1024 * 1024;
    var desktop = env(8, true), phone = env(2, false), tablet = env(8, false);
    if (desktop.maxBytes !== 384 * MB) throw new Error('an 8GB desktop must keep the full 384MB, got ' + (desktop.maxBytes / MB) + 'MB');
    if (phone.maxBytes > 128 * MB) throw new Error('2GB phone budget too large: ' + (phone.maxBytes / MB) + 'MB');
    if (tablet.maxBytes > 160 * MB) throw new Error('a touch OS must be capped whatever RAM it reports, got ' + (tablet.maxBytes / MB) + 'MB');
    if (phone.maxDim > 640) throw new Error('phone frames should be <= 640px, got ' + phone.maxDim);
  });

  test('solo: the per-layer S button stays gone, export keeps its own', { item: 'solo-withdrawn' }, function () {
    // Not a feature test — a guard. BACKLOG called the missing button a high-severity regression for a
    // month; it was removed at Ezra's request in v1.75 (69563ae). Soloing lives in the export dialog.
    if (document.querySelector('.th-solo')) throw new Error('a .th-solo button is back — it was removed deliberately in v1.75, do not restore it');
    if (!document.getElementById('exp-solo-clip')) throw new Error('#exp-solo-clip missing — "Hide other layers" is the solo entry point that IS wanted');
  });

  test('layout: Studio re-places the same panels, and never touches the phone', { item: 'studio-layout' }, function () {
    // v4.71. Studio is a pure grid re-placement of four regions that are all direct children of #app.
    // The two things worth guarding: (1) the inspector is ONE node — a second copy would drift out of
    // sync, and (2) the phone keeps its sheet layout no matter what the setting says.
    var app = document.getElementById('app');
    var insp = document.querySelectorAll('#inspector-panel');
    if (insp.length !== 1) throw new Error('expected exactly one #inspector-panel, found ' + insp.length + ' — Studio must re-place the panel, never duplicate it');
    if (insp[0].parentElement !== app) throw new Error('#inspector-panel must be a direct child of #app, else the grid cannot move it into the bottom band');

    var had = document.body.classList.contains('layout-studio');
    var desktop = !window.matchMedia || window.matchMedia('(min-width: 701px)').matches;
    try {
      document.body.classList.add('layout-studio');
      var stage = document.getElementById('stage').getBoundingClientRect();
      var ip = insp[0].getBoundingClientRect();
      var bar = document.getElementById('topbar').getBoundingClientRect();
      if (desktop) {
        var tlb = document.getElementById('timeline-panel').getBoundingClientRect();
        // bottom band: the inspector sits BELOW the stage and BESIDE the timeline
        if (!(ip.top >= stage.bottom - 2)) throw new Error('Studio: inspector top ' + Math.round(ip.top) + ' should be at/below the stage bottom ' + Math.round(stage.bottom));
        if (!(ip.right <= tlb.left + 2)) throw new Error('Studio: inspector should sit beside the timeline (its right ' + Math.round(ip.right) + ' vs timeline left ' + Math.round(tlb.left) + ') — that adjacency IS the feature');
        // The Studio grid template itself must be live. "narrow top bar" is NOT enough to prove that:
        // deleting the template leaves the grid-area rules pointing past the last column, which spawns
        // implicit tracks and collapses the bar to ~13px — passing a width check while being broken.
        // Two rows where classic has three IS the feature (the top bar's row handed to the canvas).
        var rows = getComputedStyle(app).gridTemplateRows.split(/\s+/).filter(Boolean);
        if (rows.length !== 2) throw new Error('Studio: #app should have 2 rows (stage + bottom band), got ' + rows.length + ' [' + rows.join(' ') + '] — the Studio grid template is not applying');
        if (!(bar.width >= 40 && bar.width <= 110)) throw new Error('Studio: #topbar should be a rail about --rail-w wide, got ' + Math.round(bar.width) + 'px');
        // the rail is chrome for the CANVAS and must stop there — the band below needs its full width
        if (!(bar.bottom <= ip.top + 2)) throw new Error('Studio: the rail runs down past the canvas into the bottom band (rail bottom ' + Math.round(bar.bottom) + ' vs band top ' + Math.round(ip.top) + ') — it should stop at the stage');
        if (!(ip.left < 2)) throw new Error('Studio: the bottom band should reach the window edge, inspector left=' + Math.round(ip.left));
        // …and the rail must never spill its controls over the panel below. The rail is only as tall as
        // the canvas now, and on a short window its buttons genuinely need more room than that (measured
        // 159px of content in a 125px rail), so "does everything fit" is a question about the window, not
        // about the code — asserting the geometry made this test pass or fail purely on viewport height.
        // What the code actually owes is a CLIPPING rail, which holds at every size.
        // (Takes BOTH axes to break: overflow-x:hidden alone forces overflow-y:visible to compute as
        // auto, so mutating only overflow-y cannot fail this — mutation-checked.)
        var oy = getComputedStyle(document.getElementById('topbar')).overflowY;
        if (oy === 'visible') throw new Error('Studio: the rail is overflow-y:visible — on a short window its buttons spill over the panel below instead of scrolling');
        if (!(bar.height > bar.width)) throw new Error('Studio: #topbar should be a vertical rail, got ' + Math.round(bar.width) + 'x' + Math.round(bar.height));
        if (!(stage.top < 2)) throw new Error('Studio: the stage should start at the top of the window (the top bar row is gone), got top=' + Math.round(stage.top));
      } else {
        // phone: the class must be inert — the inspector stays a fixed sheet
        if (getComputedStyle(insp[0]).position !== 'fixed') throw new Error('phone: layout-studio changed the inspector out of its fixed sheet — the phone layout must be untouched');
      }
    } finally {
      document.body.classList.toggle('layout-studio', had);
      if (FM.resizeCanvas) FM.resizeCanvas();
    }
  });

  test('import: a file with no MIME type is classified by extension', { item: 'typeless-import' }, function () {
    // v4.73. Picking a song out of the phone's Files app very often hands back an EMPTY file.type
    // (.m4a/.flac/.opus especially). handleFiles used to be a three-way file.type.startsWith() chain,
    // so a typeless file matched nothing and was dropped with no error at all — "import audio does
    // nothing". Classification now falls back to the extension.
    if (!FM.mediaKind) throw new Error('FM.mediaKind missing');
    var cases = [
      [{ name: 'song.m4a', type: '' }, 'audio'],
      [{ name: 'song.mp3', type: '' }, 'audio'],
      [{ name: 'track.flac', type: '' }, 'audio'],
      [{ name: 'voice.opus', type: '' }, 'audio'],
      [{ name: 'clip.mov', type: '' }, 'video'],
      [{ name: 'pic.heic', type: '' }, 'image'],
      [{ name: 'song.mp3', type: 'audio/mpeg' }, 'audio'],   // a real type still wins
      [{ name: 'notes.txt', type: '' }, ''],                 // genuinely unusable → caller warns
    ];
    cases.forEach(function (c) {
      var got = FM.mediaKind(c[0]);
      if (got !== c[1]) throw new Error(c[0].name + ' (type "' + c[0].type + '") classified as "' + got + '", expected "' + c[1] + '"');
    });
  });

  test('edit points: a finger gets a bigger target than a mouse', { item: 'point-hit-radius' }, function () {
    // v4.75. The hit radius was a flat 14 display px — mouse-sized. A fingertip missed far more often
    // than it hit, and every miss used to fall through the overlay to the canvas handler, which read it
    // as "deselect" and shut the whole edit panel. The miss is swallowed now (verified by dispatching a
    // touch pointerdown at the overlay centre: defaultPrevented true, zero events reaching #stage); this
    // guards the other half — that touch actually gets a reachable target.
    if (!FM.pointEdit || !FM.pointEdit.hitRadius) throw new Error('FM.pointEdit.hitRadius missing');
    var mouse = FM.pointEdit.hitRadius('mouse'), touch = FM.pointEdit.hitRadius('touch');
    var pen = FM.pointEdit.hitRadius('pen');
    if (!(touch > mouse)) throw new Error('touch target (' + touch + ') should exceed mouse (' + mouse + ')');
    if (!(touch >= 22)) throw new Error('touch target ' + touch + 'px is still smaller than a fingertip');
    if (pen !== touch) throw new Error('pen should get the coarse target too, got ' + pen);
  });

  test('edit points: a missed tap never escapes to the canvas', { item: 'point-miss-swallow' }, function () {
    // v4.75. THE bug: a tap that missed a point returned out of onDown without stopping the event, so
    // it reached the canvas handler underneath, which reads a tap on empty space as "deselect" — and
    // the whole edit panel shut. This drives the real overlay with a real PointerEvent rather than
    // asserting on source. It builds a throwaway layer and removes it again in the finally.
    if (!FM.pointEdit || !FM.pointEdit.start) throw new Error('FM.pointEdit missing');
    var scene = FM.scene, hadSel = scene.selectedId, added = null, wasActive = FM.pointEdit.isActive();
    try {
      added = FM.makeLayer('shape', { shape: 'star', x: (scene.project.width / 2) | 0, y: (scene.project.height / 2) | 0, shapeW: 160, shapeH: 160, fill: '#ffd24a' });
      scene.layers.unshift(added);
      if (FM.selectLayer) FM.selectLayer(added.id);
      FM.pointEdit.start(added.id);
      var ov = document.getElementById('pe-overlay');
      if (!ov) throw new Error('point-edit overlay never appeared');
      var r = ov.getBoundingClientRect();
      if (!(r.width > 0)) throw new Error('overlay has no size to aim at');

      var escaped = 0, spy = function () { escaped++; };
      var stage = document.getElementById('stage');
      stage.addEventListener('pointerdown', spy);
      // dead centre of a star's bounding box = between the arms, guaranteed miss
      var ev = new PointerEvent('pointerdown', {
        clientX: r.left + r.width / 2, clientY: r.top + r.height / 2,
        pointerId: 1, pointerType: 'touch', bubbles: true, cancelable: true });
      ov.dispatchEvent(ev);
      stage.removeEventListener('pointerdown', spy);

      if (!ev.defaultPrevented) throw new Error('a missed tap was not consumed by the point editor');
      if (escaped) throw new Error('a missed tap reached #stage (' + escaped + 'x) — the canvas handler will deselect and close the panel');
      if (!FM.pointEdit.isActive()) throw new Error('the point editor closed on a missed tap');
      if (FM.scene.selectedId !== added.id) throw new Error('the layer was deselected by a missed tap');
    } finally {
      try { if (FM.pointEdit.isActive() && !wasActive) FM.pointEdit.stop(); } catch (e) {}
      if (added) { var i = scene.layers.indexOf(added); if (i >= 0) scene.layers.splice(i, 1); }
      if (FM.selectLayer) FM.selectLayer(hadSel || null);
      if (FM.requestRender) FM.requestRender();
    }
  });

  test('keyframes: everything that draws a diamond can also be deleted', { item: 'delete-parity' }, function () {
    // v4.79. FM.animatedProps decides what draws a diamond on the clip; deleteKeyframesAt decides what
    // a delete can reach. They had drifted — trimPath, stroke.dash.offset, repeater, mask paths and
    // audioFx params drew diamonds you could never remove. Any container in one list must be in both,
    // and it matters more now that every slider owns its own track.
    if (!FM.animatedProps) throw new Error('FM.animatedProps missing');
    var kf = function (v) { return { kf: [{ t: 1, v: v, e: 'linear' }] }; };
    var L = FM.makeLayer('shape', { shape: 'rect', x: 10, y: 10, shapeW: 20, shapeH: 20, fill: '#fff' });
    L.transform.x = kf(10);
    L.trimPath = { start: kf(0), end: kf(1), offset: kf(0) };
    L.stroke = { width: kf(2), color: kf('#fff'), dash: { enabled: true, offset: kf(0) } };
    L.repeater = { enabled: true, copies: kf(3), offsetX: kf(4), offsetY: kf(0), rotation: kf(0), scale: kf(1), opacity: kf(1) };
    L.masks = [{ id: 'm1', enabled: true, path: kf([[0, 0], [1, 1]]) }];
    L.crop = { x: kf(0), y: kf(0), w: kf(1), h: kf(1) };
    L.shadow = { blur: kf(1), dx: kf(0), dy: kf(0), alpha: kf(1), color: kf('#000') };
    L.effects = [{ type: 'blur', enabled: true, params: { radius: kf(5) } }];
    L.audioFx = [{ type: 'gain', enabled: true, params: { gain: kf(1) } }];
    L.volume = kf(1); L.speed = kf(1); L.fill = kf('#fff');

    var before = FM.animatedProps(L).length;
    if (before < 20) throw new Error('scene did not build the animated props (' + before + ') — test is not exercising anything');
    if (!FM.timeline || !FM.timeline.deleteKeyframesAt) throw new Error('FM.timeline.deleteKeyframesAt not exposed');
    FM.timeline.deleteKeyframesAt(L, 1);
    var left = FM.animatedProps(L);
    if (left.length) {
      throw new Error(left.length + ' of ' + before + ' keyframed properties survived a delete at their own time — they draw diamonds that nothing can remove');
    }
  });

  test('elements: saved elements live behind a searchable browser, not loose in the tab', { item: 'elements-browser' }, function () {
    // v4.81. Saved elements used to be pushed onto the SAME list as Camera / Null / Adjustment /
    // Empty group, so structural layer types and everything you had ever saved sat in one flat grid
    // (Ezra: "make sure all the elements are grouped together and not siting loose"). They are behind
    // one button now, and the browser's whole reason to exist is the search.
    if (!FM.elementsBrowser) throw new Error('FM.elementsBrowser missing — the Browse elements button has nothing to open');
    if (!FM.elementsBrowser.open || !FM.elementsBrowser.close) throw new Error('elementsBrowser has no open/close');
    var all = [{ id: 'a', name: 'Logo sting' }, { id: 'b', name: 'Lower third' }, { id: 'c', name: 'Logo outro' }];
    var m = FM.elementsBrowser._match;
    if (m(all, '').length !== 3) throw new Error('an empty query should list everything, got ' + m(all, '').length);
    if (m(all, 'logo').length !== 2) throw new Error('"logo" should match 2, got ' + m(all, 'logo').length);
    if (m(all, 'LOGO').length !== 2) throw new Error('search must be case-insensitive');
    if (m(all, 'third').length !== 1) throw new Error('"third" should match 1, got ' + m(all, 'third').length);
    if (m(all, 'zzz').length !== 0) throw new Error('a non-match should return nothing');
  });

  test('tiles: "Whole clip" repeats a clip that is entirely off-canvas', { item: 'tiles-offcanvas' }, function () {
    // v4.82. Tiles' "Whole clip" mode builds its own plate reaching past the frame — but the call was
    // gated on the CANVAS bbox, so a clip dragged fully off-frame had no on-screen alpha, the effect
    // function never ran, and the tiles rendered NOTHING. Measured before the fix: centred 100% of the
    // frame lit, half off 100%, fully off 0%. Two earlier fixes missed it because both were downstream
    // of a call that never happened.
    var d = (FM.EFFECTS || []).filter(function (e) { return e.type === 'tiles'; })[0];
    if (!d) throw new Error('tiles effect missing from the registry');
    var P = {}; (d.params || []).forEach(function (q) { P[q.key] = q.def; });
    function litPct(x, params) {
      var L = FM.makeLayer('shape', { shape: 'rect', x: x, y: 120, shapeW: 70, shapeH: 70, fill: '#ffd24a' });
      L.effects = [{ type: 'tiles', enabled: true, params: params }];
      var c = offscreen(320, 240), g = c.getContext('2d', { willReadFrequently: true });
      FM.renderScene(g, scene([L]), 0);
      var im = g.getImageData(0, 0, 320, 240).data, n = 0;
      for (var i = 0; i < im.length; i += 4) if (im[i] + im[i + 1] + im[i + 2] > 40) n++;
      return n / (im.length / 4) * 100;
    }
    var whole = Object.assign({}, P);                      // source defaults to 1 = Whole clip
    var off = litPct(-60, whole), centre = litPct(160, whole);
    if (!(off > 60)) throw new Error('a clip fully off-canvas tiled ' + off.toFixed(1) + '% of the frame — "Whole clip" is repeating emptiness again');
    if (!(centre > 60)) throw new Error('the ordinary centred case broke: ' + centre.toFixed(1) + '% lit');
    // …and "On screen" must still mean on screen — fixing the blank must not merge the two modes
    var onScreen = Object.assign({}, P, { source: 0 });
    if (litPct(-60, onScreen) > 5) throw new Error('"On screen" mode now repeats off-frame content — the two modes have collapsed into one');
  });

  test('drawing mode gives the canvas MORE room, in either layout', { item: 'drawing-grid' }, function () {
    // v4.83. The generic drawing rule forces #app to TWO columns, which was written for classic
    // (stage | inspector). Studio has THREE and places its regions by explicit column lines, so the
    // override collided: measured, the rail swelled 60px -> 967px and the stage collapsed to 233px and
    // jumped to x=967 — Ezra's "puts the canvas in a weird spot". Drawing must never shrink or move the
    // stage; it exists to give the canvas the whole window.
    var desktop = !window.matchMedia || window.matchMedia('(min-width: 701px)').matches;
    if (!desktop) return;                       // phone drawing collapses rows instead; not this rule
    var app = document.getElementById('app'), stage = document.getElementById('stage');
    var hadStudio = document.body.classList.contains('layout-studio');
    var hadDrawing = document.body.classList.contains('drawing');
    try {
      [['classic', false], ['studio', true]].forEach(function (pair) {
        document.body.classList.toggle('layout-studio', pair[1]);
        var b = stage.getBoundingClientRect();
        document.body.classList.add('drawing');
        var d = stage.getBoundingClientRect();
        document.body.classList.remove('drawing');
        if (!(b.width > 0)) throw new Error(pair[0] + ': stage has no width to compare');
        if (d.width < b.width - 2) throw new Error(pair[0] + ': drawing SHRANK the stage ' + Math.round(b.width) + 'px -> ' + Math.round(d.width) + 'px — the grid override is fighting this layout');
        if (Math.abs(d.left - b.left) > 4) throw new Error(pair[0] + ': drawing MOVED the stage from x=' + Math.round(b.left) + ' to x=' + Math.round(d.left));
      });
    } finally {
      document.body.classList.toggle('layout-studio', hadStudio);
      document.body.classList.toggle('drawing', hadDrawing);
      if (FM.resizeCanvas) FM.resizeCanvas();
    }
  });

  test('undo / redo grey out when there is nothing behind or ahead', { item: 'undo-affordance' }, function () {
    // v4.84. The state always existed (index > 0 / index < stack.length - 1 are the guards undo() and
    // redo() already used) but was never shown, so both buttons looked live at the ends of the stack
    // and pressing them did nothing.
    if (!FM.history || !FM.history.canUndo) throw new Error('FM.history.canUndo missing');
    var u = document.getElementById('btn-undo'), r = document.getElementById('btn-redo');
    if (!u || !r) throw new Error('transport undo/redo buttons missing');
    var grey = function (b) { return b.classList.contains('is-off'); };
    var agree = function (where) {
      if (grey(u) === FM.history.canUndo()) throw new Error(where + ': undo button greyed=' + grey(u) + ' but canUndo=' + FM.history.canUndo());
      if (grey(r) === FM.history.canRedo()) throw new Error(where + ': redo button greyed=' + grey(r) + ' but canRedo=' + FM.history.canRedo());
    };
    FM.history.reset();
    if (FM.history.canUndo()) throw new Error('a freshly reset history should have nothing to undo');
    agree('fresh');
    var L = FM.makeLayer('shape', { shape: 'rect', x: 10, y: 10, shapeW: 20, shapeH: 20, fill: '#fff' });
    FM.scene.layers.unshift(L);
    FM.history.commit();
    if (!FM.history.canUndo()) throw new Error('after an edit there should be something to undo');
    if (FM.history.canRedo()) throw new Error('a fresh edit must leave nothing to redo');
    agree('after edit');
    FM.history.undo();
    if (!FM.history.canRedo()) throw new Error('after undo there should be something to redo');
    agree('after undo');
    FM.history.redo();
    agree('after redo');
  });

  /* ---------------- runner ---------------- */

  test('the + FAB never gets an overflow clip (it slices the glow into a box)', { item: 'fab-glow-clip' }, function () {
    // v4.95. Twice reported as "there's a box around the logo". The cause is CSS paint order: filter
    // is applied BEFORE the element's own clip, so an overflow:hidden on this button cuts its glow
    // off dead straight at the border box — a soft halo that stops on a hard line reads as a grey
    // panel around the artwork. WebKit enforces that order; Chrome does not, so a desktop check
    // cannot see the damage and this has to be asserted on the property rather than on pixels.
    // The orb (#hm-new) is deliberately exempt: its clip is a circle concentric with a circular
    // render and its ambient glow is a box-shadow, which overflow never touches.
    var f = document.getElementById('add-fab');
    if (!f) throw new Error('#add-fab missing');
    var ov = getComputedStyle(f);
    ['overflow', 'overflowX', 'overflowY'].forEach(function (k) {
      if (ov[k] === 'hidden' || ov[k] === 'clip' || ov[k] === 'scroll' || ov[k] === 'auto') {
        throw new Error('#add-fab has ' + k + ':' + ov[k] + ' — that clips its drop-shadow glow to a square');
      }
    });
    // and the glow it is protecting has to actually be there, or the assertion guards nothing
    if (ov.filter.indexOf('drop-shadow') < 0) throw new Error('#add-fab lost its drop-shadow glow: ' + ov.filter);
  });

  test('the playhead sits on true screen centre, and play follows it when there is room', { item: 'playhead-play-centre' }, function () {
    // v4.97. #tl-centerline is absolutely positioned inside #timeline-panel, so a raw viewport unit
    // measures from the PANEL's left edge — 0 on a phone and in classic, but ~406px in Studio at 1440
    // wide. `left: 50vw` therefore landed it at panelLeft + half the viewport (1126px), and v4.96's
    // panel-centre landed it at 923. Ezra wanted neither: "i meant i want the play head and button
    // centred to the screen not the timeline."
    //
    // Two DIFFERENT assertions, because the two elements have different freedom:
    //   the LINE can always reach screen centre — it is one absolutely positioned element.
    //   the BUTTON is inside a row that starts at the panel's left edge, and on a narrow window
    //     shifting the cluster far enough left would push it out over the inspector band. The CSS caps
    //     the shift for exactly that reason, so here the requirement is conditional: hit screen centre
    //     when the room exists, and never overlap the panel regardless. Asserting unconditional
    //     centring would have demanded the overlap the cap is there to prevent.
    var line = document.getElementById('tl-centerline'), play = document.getElementById('btn-play');
    var panel = document.getElementById('timeline-panel');
    var first = document.getElementById('btn-undo'), last = document.getElementById('btn-layermenu');
    if (!line || !play || !panel || !first || !last) throw new Error('transport / playhead elements missing');
    if (getComputedStyle(line).display === 'none') throw new Error('#tl-centerline is not being drawn');
    if (!window.innerWidth) throw new Error('no viewport width to measure against');
    var body = document.body, was = body.classList.contains('layout-studio');
    var bad = [];
    [false, true].forEach(function (studio) {
      // toggle the CLASS directly — never FM.settings.set, which writes through to the real
      // localStorage this frame shares with the app and would change Ezra's chosen layout.
      body.classList.toggle('layout-studio', studio);
      // rebuild() re-measures the panel and republishes --tl-panel-left; without it we would assert
      // against a stale offset and pass for the wrong reason.
      if (FM.timeline && FM.timeline.rebuild) FM.timeline.rebuild();
      var where = studio ? 'studio' : 'classic';
      var p = play.getBoundingClientRect();
      if (!p.width) { bad.push(where + ': play button has no box to measure'); return; }
      var centre = window.innerWidth / 2;
      var panelLeft = panel.getBoundingClientRect().left;

      var dLine = Math.abs(line.getBoundingClientRect().left - centre);
      if (dLine > 2) bad.push(where + ': playhead is ' + Math.round(dLine) + 'px off screen centre');

      // never draw over the inspector band to its left
      if (first.getBoundingClientRect().left < panelLeft - 0.5) {
        bad.push(where + ': the transport overflows ' + Math.round(panelLeft - first.getBoundingClientRect().left) + 'px past the panel');
      }
      // ...and when the cluster DOES fit left of centre, play must actually be centred
      var clusterHalf = Math.max(p.left + p.width / 2 - first.getBoundingClientRect().left,
                                 last.getBoundingClientRect().right - (p.left + p.width / 2));
      var roomy = (panelLeft + 14 + clusterHalf) <= centre;
      var dPlay = Math.abs((p.left + p.width / 2) - centre);
      if (roomy && dPlay > 2) bad.push(where + ': room for it, but play is ' + Math.round(dPlay) + 'px off screen centre');
    });
    body.classList.toggle('layout-studio', was);
    if (FM.timeline && FM.timeline.rebuild) FM.timeline.rebuild();
    if (bad.length) throw new Error(bad.join(' | '));
  });

  test('Select all on a non-project tab ticks THAT tab, never the projects', { item: 'select-cross-tab' }, async function () {
    // v5.04. Select used to be projects-only, and every part of it was hardwired to FM.projects —
    // including a `shownIds.length ? shownIds : FM.projects.list()` fallback in Select all. Opening
    // Select on the Templates tab without also filling shownIds for that tab would therefore have
    // ticked the PROJECT list and handed those ids to Delete. This asserts the property that stops
    // that: what gets ticked is what is on screen.
    if (!FM.home || !FM.templates) throw new Error('FM.home / FM.templates missing');
    const grid = document.querySelector('.hm-grid');
    if (!grid) throw new Error('home grid missing — is the home screen built?');
    // Seed two templates so there is something to tick, and put the store back in finally: this test
    // frame shares localStorage with the real app, so a throw mid-way must not leave junk behind.
    const before = FM.templates.list();
    const projectCount = FM.projects.list().length;
    if (projectCount < 1) throw new Error('need at least one project for this test to mean anything');
    try {
      localStorage.setItem('fm.templates', JSON.stringify([
        { id: 'test_t1', name: 'ZZ test template 1', width: 1080, height: 1920, duration: 1 },
        { id: 'test_t2', name: 'ZZ test template 2', width: 1080, height: 1920, duration: 1 },
      ]));
      FM.home.open();
      await new Promise(r => setTimeout(r, 60));
      const tab = [].find.call(document.querySelectorAll('.hm-tab'), b => b.dataset.tab === 'templates');
      if (!tab) throw new Error('templates tab missing');
      tab.click();
      const selBtn = document.getElementById('hm-select-btn');
      if (!selBtn) throw new Error('Select button missing');
      if (getComputedStyle(selBtn).display === 'none') throw new Error('Select is not offered on the Templates tab');
      selBtn.click();
      const all = [].find.call(document.querySelectorAll('.hm-selbtn'), b => b.textContent === 'Select all');
      if (!all) throw new Error('Select all button missing');
      all.click();
      const cards = document.querySelectorAll('.hm-grid .hm-card').length;
      const ticked = document.querySelectorAll('.hm-grid .hm-check.on').length;
      const label = (document.querySelector('.hm-selcount') || {}).textContent || '';
      const n = parseInt(label, 10);
      if (cards !== 2) throw new Error('expected the 2 seeded templates on screen, saw ' + cards);
      if (ticked !== 2) throw new Error('Select all ticked ' + ticked + ' of ' + cards + ' template cards');
      if (n !== 2) throw new Error('the bar says "' + label + '" — it should count the 2 templates');
      if (n === projectCount && projectCount !== 2) throw new Error('the bar counted the PROJECTS (' + projectCount + '), not the templates');
      // and Duplicate must not be offered here: neither store has one, so the button would throw
      if ([].some.call(document.querySelectorAll('.hm-selbtn'), b => b.textContent === 'Duplicate')) {
        throw new Error('Duplicate is offered on the Templates tab, but FM.templates has no duplicate()');
      }
    } finally {
      localStorage.setItem('fm.templates', JSON.stringify(before));
      const cancel = [].find.call(document.querySelectorAll('.hm-selbtn'), b => b.textContent === 'Cancel');
      if (cancel) cancel.click();
      const pt = [].find.call(document.querySelectorAll('.hm-tab'), b => b.dataset.tab === 'projects');
      if (pt) pt.click();
    }
  });

  test('shape tiles keep their big icons; only the labelled cards are trimmed', { item: 'shape-icon-size' }, function () {
    // v5.05. Trimming the Elements grid's cards used a 4-class selector, which outranks the shape
    // grid's own 2-class `.addmenu-card--ico` rule — so it also shrank every shape icon from 34px to
    // 19px. Ezra: "all of the shape icons have gone small." A pure-CSS specificity accident with no
    // JS involved, which is exactly the kind that no behavioural test would ever notice, so this
    // asserts the rendered sizes of both card kinds against each other.
    // The add menu only exists while NOTHING is selected, and the suite runs against whatever state
    // the app happens to be in. Deselect first and put the selection back afterwards, rather than
    // failing with "deselect first?" — a test that depends on unstated setup is a flaky test.
    const hadSel = FM.scene.selectedId;
    const hadSelIds = (FM.scene.selectedIds || []).slice();
    if (hadSel) { FM.selectLayer(null); }
    const panel = document.querySelector('.addmenu--panel');
    if (!panel) {
      if (hadSel) { FM.scene.selectedIds = hadSelIds; FM.selectLayer(hadSel); }
      throw new Error('the desktop add menu is not rendered even with nothing selected');
    }
    const tab = k => [].find.call(panel.querySelectorAll('.addmenu-tab'), b => b.dataset.key === k);
    const iconW = () => {
      const c = panel.querySelector('.addmenu-page .addmenu-card');
      const sv = c && c.querySelector('.addmenu-ic svg');
      return sv ? Math.round(sv.getBoundingClientRect().width) : 0;
    };
    const shapeTab = tab('shape'), objTab = tab('object');
    if (!shapeTab || !objTab) throw new Error('shape / elements tab missing');
    const was = (panel.querySelector('.addmenu-tab.active') || {}).dataset;
    try {
      shapeTab.click();
      const shape = iconW();
      objTab.click();
      const labelled = iconW();
      if (!shape || !labelled) throw new Error('could not measure a card icon (shape=' + shape + ', labelled=' + labelled + ')');
      if (shape < 30) throw new Error('shape tile icons are ' + shape + 'px — they should be ~34px (the Elements trim leaked onto them)');
      if (labelled > 26) throw new Error('labelled card icons are ' + labelled + 'px — the Elements grid trim is not applying');
      if (shape <= labelled) throw new Error('shape icons (' + shape + 'px) should be BIGGER than labelled-card icons (' + labelled + 'px)');
    } finally {
      const back = tab(was && was.key ? was.key : 'object'); if (back) back.click();
      if (hadSel) { FM.scene.selectedIds = hadSelIds; FM.selectLayer(hadSel); }
    }
  });

  test('grouping inside a group cannot build a parent cycle', { item: 'group-cycle' }, function () {
    // BUG-HUNT.md's only CRITICAL finding, fixed in v5.06. "Select All → Group Selection" while
    // editing a group used to sweep the OPEN group into its own new child: G.parent === G2 while
    // G2.parent === G. FM.groupBounds was the one parent walk with no cycle guard, so it blew the
    // stack — and because the cycle lived in FM.scene.layers the autosave persisted it, leaving a
    // project that threw on load and could not be opened OR deleted. Three guards, all asserted here.
    const savedScene = FM.scene, savedCtx = FM.groupContext;
    const commit = FM.history.commit, autosave = FM.storage.autosave, save = FM.storage.save, dirty = FM.storage.markDirty;
    // Never let a test scene reach a real project: grouping commits, and commit() autosaves.
    FM.history.commit = function () {}; FM.storage.autosave = function () {};
    FM.storage.save = function () {}; FM.storage.markDirty = function () {};
    function cycles() {
      const byId = {}; FM.scene.layers.forEach(l => { byId[l.id] = l; });
      return FM.scene.layers.some(l => {
        let cur = l, seen = {}, hops = 0;
        while (cur && cur.parent) {
          if (seen[cur.id]) return true;
          seen[cur.id] = 1; cur = byId[cur.parent];
          if (++hops > 256) return true;
        }
        return false;
      });
    }
    function fresh() {
      // groupContext MUST be cleared with the scene. Leaving it pointing at the previous case's group
      // made the next Select All resolve against an id that no longer exists → an empty selection →
      // groupSelection returning early, and case 2 silently asserted nothing. Mutation testing caught
      // that: removing the ancestor guard did not turn this test red until this line existed.
      FM.groupContext = null;
      FM.scene = { project: { width: 640, height: 480, fps: 30, duration: 5, background: '#000' }, layers: [], selectedId: null, selectedIds: [] };
      FM.scene.layers.push(FM.makeLayer('shape', { shape: 'rect', name: 'One', x: 100, y: 100, shapeW: 60, shapeH: 60, fill: '#f00' }));
      FM.scene.layers.push(FM.makeLayer('shape', { shape: 'rect', name: 'Two', x: 200, y: 140, shapeW: 60, shapeH: 60, fill: '#0f0' }));
    }
    try {
      // 1. Select All is scoped to the open group — the fix at the source.
      fresh();
      FM.selectAll(); FM.groupSelection();
      const gid = FM.scene.selectedId;
      FM.groupContext = gid;
      FM.selectAll();
      if (FM.selectionIds().indexOf(gid) >= 0) throw new Error('Select All inside a group selected the group itself');
      if (FM.selectionIds().length !== 2) throw new Error('Select All inside a group selected ' + FM.selectionIds().length + ' layers, expected the 2 members');
      FM.groupSelection();
      if (cycles()) throw new Error('grouping via Select All inside a group still builds a parent cycle');

      // 2. Even handed an ancestor directly, groupSelection must refuse it.
      fresh();
      FM.selectAll(); FM.groupSelection();
      const g2 = FM.scene.selectedId;
      FM.groupContext = g2;
      FM.scene.selectedIds = FM.scene.layers.map(l => l.id);   // the open group included on purpose
      FM.scene.selectedId = g2;
      FM.groupSelection();
      if (cycles()) throw new Error('groupSelection accepted an ancestor as a member and built a cycle');
      // Refusing the ancestor must not leave the new group EMPTY: its children decide whether to
      // re-parent by looking at the member set, not at the raw selection the ancestor is still in.
      const made = FM.scene.selectedId;
      const kids = FM.scene.layers.filter(l => l.parent === made).length;
      if (kids < 2) throw new Error('the new group came out with ' + kids + ' members, expected 2');

      // 3. And a cycle from ANY future path must degrade, not blow the stack.
      FM.scene = { project: { width: 640, height: 480, fps: 30, duration: 5, background: '#000' }, layers: [], selectedId: null, selectedIds: [] };
      const A = FM.makeLayer('group', { name: 'A' }), B = FM.makeLayer('group', { name: 'B' });
      A.parent = B.id; B.parent = A.id;
      FM.scene.layers.push(A, B);
      FM.groupBounds(A, FM.scene, 0);      // threw RangeError before the seen-guard
      FM.groupDescendants(A.id);
    } finally {
      FM.scene = savedScene; FM.groupContext = savedCtx;
      FM.history.commit = commit; FM.storage.autosave = autosave; FM.storage.save = save; FM.storage.markDirty = dirty;
    }
  });

  test('editor key shortcuts cannot reach the project under a full-screen overlay', { item: 'overlay-keys' }, function () {
    // v5.07. The global keydown handler only bailed out for modifier combos and for editable targets,
    // so with the home browser (or any dialog) covering the screen, the still-loaded project behind it
    // was fully reachable: Backspace — the habitual "go back" key, and exactly where focus sits after
    // the back button — ran deleteSelected(), which commits, and commit() autosaves. Silent data loss
    // with no visible cause. #export-dialog stands in for the overlay family here because showing it
    // is a pure class toggle with no side effects; the guard treats every one of them the same way.
    const savedScene = FM.scene;
    const commit = FM.history.commit, autosave = FM.storage.autosave, save = FM.storage.save, dirty = FM.storage.markDirty;
    FM.history.commit = function () {}; FM.storage.autosave = function () {};
    FM.storage.save = function () {}; FM.storage.markDirty = function () {};
    const dlg = document.getElementById('export-dialog');
    const wasHidden = dlg ? dlg.classList.contains('hidden') : true;
    // The app boots with the home browser up, so the home branch of the guard would swallow the
    // control leg and the test could never tell "guarded correctly" from "the key never arrived".
    // Reporting home's state is stubbed instead of really opening/closing it: home.open() rebuilds the
    // list and can write a project thumbnail, which is a real side effect for a test to have.
    const homeIsOpen = FM.home.isOpen;
    const key = code => document.body.dispatchEvent(new KeyboardEvent('keydown', { code: code, key: code === 'Space' ? ' ' : 'Backspace', bubbles: true, cancelable: true }));
    try {
      if (!dlg) throw new Error('#export-dialog is missing — the overlay guard has nothing to key off');
      FM.scene = { project: { width: 320, height: 240, fps: 30, duration: 5, background: '#000' }, layers: [], selectedId: null, selectedIds: [] };
      FM.scene.layers.push(FM.makeLayer('shape', { shape: 'rect', name: 'One', x: 50, y: 50, shapeW: 40, shapeH: 40, fill: '#f00' }));
      FM.scene.layers.push(FM.makeLayer('shape', { shape: 'rect', name: 'Two', x: 90, y: 90, shapeW: 40, shapeH: 40, fill: '#0f0' }));
      FM.scene.selectedId = FM.scene.layers[0].id;
      FM.scene.selectedIds = [FM.scene.layers[0].id];

      // 1. The home / project browser — the route that actually loses work.
      dlg.classList.add('hidden');
      FM.home.isOpen = function () { return true; };
      key('Backspace');
      if (FM.scene.layers.length !== 2) throw new Error('Backspace deleted a layer with the home browser up');

      // 2. A dialog overlay, and Space as well as Backspace.
      FM.home.isOpen = function () { return false; };
      dlg.classList.remove('hidden');
      key('Backspace');
      if (FM.scene.layers.length !== 2) throw new Error('Backspace deleted a layer with a dialog up');
      key('Space');
      if (FM.playing) { FM.pause(); throw new Error('Space started playback with a dialog up'); }

      // 3. …and the guard must be scoped, not a blanket kill: with everything closed the key works.
      dlg.classList.add('hidden');
      FM.scene.selectedId = FM.scene.layers[0].id;
      FM.scene.selectedIds = [FM.scene.layers[0].id];
      key('Backspace');
      if (FM.scene.layers.length !== 1) throw new Error('Backspace no longer deletes with nothing up (layers=' + FM.scene.layers.length + ') — the guard is too broad, or the test never delivered the key');
    } finally {
      FM.home.isOpen = homeIsOpen;
      if (dlg) dlg.classList.toggle('hidden', wasHidden);
      FM.scene = savedScene;
      FM.history.commit = commit; FM.storage.autosave = autosave; FM.storage.save = save; FM.storage.markDirty = dirty;
    }
  });

  test('deleting a clip releases its filmstrip bitmaps, and they can rebuild', { item: 'strip-release' }, function () {
    // v5.08. FM.clearClipStrip existed but had ZERO call sites — grep over the whole repo returned
    // only its own definition. Every teardown released the neighbouring frame cache and skipped this
    // one, and deleteLayer deliberately KEEPS the media record for undo, so the bitmaps stayed
    // reachable rather than merely uncollected. ImageBitmaps are native memory, invisible to the JS
    // heap and to GC pressure, so it just accumulated until iOS jetsammed the tab.
    const savedScene = FM.scene;
    const commit = FM.history.commit, autosave = FM.storage.autosave, save = FM.storage.save, dirty = FM.storage.markDirty;
    FM.history.commit = function () {}; FM.storage.autosave = function () {};
    FM.storage.save = function () {}; FM.storage.markDirty = function () {};
    let closed = 0;
    const fake = () => ({ close: function () { closed++; } });
    let id = null;
    try {
      FM.scene = { project: { width: 320, height: 240, fps: 30, duration: 5, background: '#000' }, layers: [], selectedId: null, selectedIds: [] };
      const L = FM.makeLayer('shape', { shape: 'rect', name: 'clip', x: 50, y: 50, shapeW: 40, shapeH: 40, fill: '#f00' });
      FM.scene.layers.push(L);
      id = L.id;
      const rec = { kind: 'video', width: 1920, height: 1080, duration: 4, stripFrames: [fake(), fake(), fake()] };
      FM.media.set(id, rec);

      FM.deleteLayer(id);
      if (closed !== 3) throw new Error('deleteLayer closed ' + closed + ' of 3 filmstrip bitmaps');
      // The record survives on purpose (undo restores the layer), so the sentinel it is left at
      // decides whether the restored clip can ever draw a filmstrip again.
      const after = FM.media.get(id);
      if (after && 'stripFrames' in after) throw new Error('stripFrames left as ' + JSON.stringify(after.stripFrames) + ' — must be undefined so the strip can rebuild after undo');
    } finally {
      if (id && FM.media.remove) { try { FM.media.remove(id); } catch (e) {} }
      FM.scene = savedScene;
      FM.history.commit = commit; FM.storage.autosave = autosave; FM.storage.save = save; FM.storage.markDirty = dirty;
    }
  });

  test('filmstrip frames decode at strip size, not source size', { item: 'strip-release' }, async function () {
    // The other half of the same leak: the decode was uncapped, so 8 frames of a 1080p clip cost
    // ~66MB of native surface (~265MB at 4K) to be drawn into a 32px-tall canvas. Asserted against a
    // real decode rather than by reading the options object.
    const src = document.createElement('canvas');
    src.width = 1920; src.height = 1080;
    const c = src.getContext('2d'); c.fillStyle = '#c33'; c.fillRect(0, 0, 1920, 1080);
    const m = { kind: 'image', el: src, width: 1920, height: 1080, duration: 1 };
    await FM.buildClipStrip(m, 1);
    const f = m.stripFrames && m.stripFrames[0];
    if (!f) throw new Error('no strip frame was produced');
    try {
      if (f.height > 96) throw new Error('strip frame decoded at ' + f.width + 'x' + f.height + ' — the filmstrip canvas is 32px tall, so this should be capped near 64');
      if (Math.abs((f.width / f.height) - (1920 / 1080)) > 0.05) throw new Error('strip frame aspect is wrong: ' + f.width + 'x' + f.height);
    } finally { FM.clearClipStrip(m); }
  });

  test('undo invalidates a live audio-effect chain', { item: 'afx-undo' }, function () {
    // v5.09. buildAudioFxChain captures each effect instance BY REFERENCE and applyAt reads
    // b.inst.params forever after, but sync() decided whether to rebuild from a signature that is
    // deliberately structure-only (type + enabled — params "ride applyAt"). history.restore() does
    // `FM.scene.layers = JSON.parse(str).layers`, which swaps every instance for a fresh object of
    // identical shape: byte-identical signature, completely different objects. So undo was INAUDIBLE
    // — the chain kept driving itself from the orphaned pre-undo instances — and from then on the
    // inspector edited the new object while the chain read the old one, so preview stopped responding
    // to that effect entirely while export (which builds fresh) rendered the correct value.
    // Asserted on the decision itself; standing up a real MediaElementSource needs a playing <video>.
    if (!FM.audioFxLive || !FM.audioFxLive.isChainCurrent) throw new Error('FM.audioFxLive.isChainCurrent is missing');
    const layer = FM.makeLayer('video', { name: 'clip' });
    layer.audioFx = [{ type: 'reverb', enabled: true, params: { mix: 0.3 } }];
    const m = { _afxChain: { fake: true }, _afxSig: null, _afxInsts: null };

    // A chain built now is current, and stays current across an in-place param edit (a slider drag
    // must NOT churn the graph — that is the whole reason the signature ignores params).
    m._afxInsts = layer.audioFx.slice();
    m._afxSig = 'reverb1|';   // signature() is private: type + (enabled ? '1' : '0') + '|'
    if (!FM.audioFxLive.isChainCurrent(m, layer)) throw new Error('a freshly built chain reports stale');
    layer.audioFx[0].params.mix = 0.9;
    if (!FM.audioFxLive.isChainCurrent(m, layer)) throw new Error('an in-place param edit forced a chain rebuild — that would click on every slider drag');

    // Now the undo: same shape, same signature, new objects.
    layer.audioFx = JSON.parse(JSON.stringify(layer.audioFx));
    if (FM.audioFxLive.isChainCurrent(m, layer)) throw new Error('chain reports current after its instances were replaced — undo would stay inaudible');

    // Structure changes must still invalidate (the original signature check has to survive).
    m._afxInsts = layer.audioFx.slice();
    layer.audioFx[0].enabled = false;
    if (FM.audioFxLive.isChainCurrent(m, layer)) throw new Error('disabling an effect no longer invalidates the chain');
  });

  test('an adjustment layer grades the whole frame at every preview scale', { item: 'adj-scale' }, function () {
    // v5.10. applyAdjustment allocated its plate at PROJECT size and left it unstamped, so baseT
    // resolved to the identity and the frame snapshot was an unscaled 1:1 blit — but the preview
    // canvas is not project-sized: it is P.width * s for the adaptive playback tier, which drops as
    // low as 0.28 on a phone. The result was a graded square in the top-left corner covering rs² of
    // the frame, shrinking as the tier dropped, snapping back to correct the moment playback stopped.
    // Export was always right, so preview and export disagreed exactly while the grade was being
    // judged. Measured here the same way it was found: the fraction of pixels the grade actually
    // changed, at three render scales.
    const W = 200, H = 120;
    function gradedFraction(rs) {
      const cv = offscreen(Math.round(W * rs), Math.round(H * rs));
      cv.__fmRS = rs; cv.__fmOX = 0; cv.__fmOY = 0;
      const c = cv.getContext('2d');
      const base = FM.makeLayer('shape', { shape: 'rect', name: 'bg', x: W / 2, y: H / 2, shapeW: W, shapeH: H, fill: '#808080' });
      const adj = FM.makeLayer('adjustment', { name: 'grade' });
      // Threshold is a PIXEL_ADJ: mid-grey is pushed to pure white everywhere it reaches.
      adj.effects = [{ type: 'threshold', enabled: true, params: { level: 0.2, softness: 0 } }];
      const s = scene([adj, base], { project: { width: W, height: H, fps: 30, duration: 5, background: '#000000' } });
      FM.renderScene(c, s, 0);
      const d = c.getImageData(0, 0, cv.width, cv.height).data;
      let hit = 0, tot = 0;
      for (let i = 0; i < d.length; i += 4) { tot++; if (d[i] > 200 && d[i + 1] > 200 && d[i + 2] > 200) hit++; }
      return tot ? hit / tot : 0;
    }
    const full = gradedFraction(1);
    if (full < 0.9) throw new Error('the grade does not cover the frame even at 1:1 (' + Math.round(full * 100) + '%) — the test scene is wrong, not the app');
    [0.62, 0.36].forEach(rs => {
      const f = gradedFraction(rs);
      // Before the fix these landed on rs² — 38% and 13%.
      if (f < 0.9) throw new Error('at render scale ' + rs + ' the grade covers only ' + Math.round(f * 100) + '% of the frame (rs² would be ' + Math.round(rs * rs * 100) + '%)');
    });
  });

  test('the modal layer outranks every piece of phone chrome', { item: 'modal-z' }, function () {
    // v5.11. The three app modals shared one z-index of 50, written before any of the phone chrome
    // existed; the inspector sheet is 55, #ai-panel 58, #toast 60, #add-fab 61, #add-sheet 63. Neither
    // #app nor #main creates a stacking context, so dialog and sheet competed in the ROOT context and
    // the sheet won. Measured at 380x720 with two layers multi-selected — which is the one state that
    // keeps the phone Export button visible AND holds the sheet open — elementFromPoint at the centre
    // of "Export MP4" and of "Cancel" both returned the sheet: a dialog with no reachable buttons,
    // where tapping Export dismissed the sheet instead.
    // Read from the STYLESHEET, not from computed style: the chrome's z-indexes live inside phone
    // media queries, so at the runner's 900px width they would all compute to auto and this would
    // pass against anything.
    const declared = {};
    const walk = rules => {
      for (let i = 0; i < rules.length; i++) {
        const r = rules[i];
        // Recurse AND read — not either/or. A CSSStyleRule now carries its own (usually empty)
        // cssRules list for CSS nesting, so "if (r.cssRules) continue" skips every plain rule in the
        // sheet and this test found nothing at all to compare.
        if (r.cssRules && r.cssRules.length) walk(r.cssRules);
        if (!r.selectorText || !r.style || !r.style.zIndex) continue;
        const z = parseInt(r.style.zIndex, 10);
        if (!isFinite(z)) continue;
        r.selectorText.split(',').forEach(sel => {
          sel = sel.trim();
          if (declared[sel] == null || z > declared[sel]) declared[sel] = z;
        });
      }
    };
    let seen = 0;
    for (let i = 0; i < document.styleSheets.length; i++) {
      try { walk(document.styleSheets[i].cssRules); seen++; } catch (e) {}   // a cross-origin sheet would throw
    }
    if (!seen) throw new Error('could not read any stylesheet');
    const modal = declared['#export-dialog'];
    if (modal == null) throw new Error('no z-index declared for #export-dialog');
    ['#inspector-panel', '#ai-panel', '#toast', '#add-fab', '#add-sheet'].forEach(sel => {
      const z = declared[sel];
      if (z == null) return;   // that chrome may have been renamed; the others still hold the line
      if (modal <= z) throw new Error(sel + ' is z-index ' + z + ', at or above the modal layer (' + modal + ') — its buttons would be unreachable on a phone');
    });
    // …and the modal must still sit UNDER the things that legitimately cover everything.
    ['#home-screen', '#ctx-menu'].forEach(sel => {
      const z = declared[sel];
      if (z != null && modal >= z) throw new Error('the modal layer (' + modal + ') is at or above ' + sel + ' (' + z + '), which must stay on top');
    });
  });

  test('an overshooting ease cannot switch off every filter on a layer', { item: 'filter-clamp' }, function () {
    // v5.13. effectFilter concatenated raw evalProp results into a CSS filter list with no domain
    // clamp. One out-of-domain function makes the WHOLE list a parse error, and an invalid string
    // assigned to ctx.filter is silently ignored — so a single negative frame dropped every filter
    // effect on the layer at once. The built-in Overshoot ease peaks at ~1.096, so on a DECREASING
    // keyframe pair it undershoots by ~10% of the span, which is below zero for any fade-to-0.
    // The exporter calls the same function, so the flash was baked into the MP4 as previewed.
    const L = FM.makeLayer('shape', { shape: 'rect', x: 160, y: 120, shapeW: 200, shapeH: 160, fill: '#ffffff' });
    L.effects = [{ type: 'grayscale', enabled: true, params: { amount: 1 } },
                 { type: 'brightness', enabled: true, params: { amount: -0.2 } }];
    const f = FM.effectFilter(L, 0, 1);
    if (/\(-/.test(f)) throw new Error('filter string still carries a negative value: ' + f);
    // …and prove it through an actual render: a white shape under grayscale+brightness(0) is black,
    // whereas an ignored filter string leaves it white.
    const c = offscreen(320, 240);
    const s = scene([L]);
    FM.renderScene(c.getContext('2d'), s, 0);
    const p = px(c.getContext('2d'), 160, 120);
    if (p[0] > 60 || p[1] > 60 || p[2] > 60) throw new Error('the layer rendered at [' + p[0] + ',' + p[1] + ',' + p[2] + '] — both filters were dropped, so the invalid string was handed to ctx.filter');
    // Blur radius and the glow's radius take the same treatment.
    const B = FM.makeLayer('shape', { shape: 'rect', x: 160, y: 120, shapeW: 100, shapeH: 100, fill: '#fff' });
    B.effects = [{ type: 'blur', enabled: true, params: { radius: -8 } },
                 { type: 'glow', enabled: true, params: { radius: -5, passes: 1 } }];
    const fb = FM.effectFilter(B, 0, 1);
    if (/\(-|\s-/.test(fb)) throw new Error('blur/glow radius not clamped: ' + fb);
    // hue-rotate must NOT be clamped — negative degrees are legal and meaningful.
    const H = FM.makeLayer('shape', { shape: 'rect', x: 160, y: 120, shapeW: 100, shapeH: 100, fill: '#fff' });
    H.effects = [{ type: 'hue', enabled: true, params: { deg: -90 } }];
    if (FM.effectFilter(H, 0, 1).indexOf('-90deg') < 0) throw new Error('hue-rotate lost its sign: ' + FM.effectFilter(H, 0, 1));
  });

  test('a keyframed anchor cannot make a layer vanish', { item: 'anchor-kf' }, function () {
    // v5.14. The compositor reads transform.anchorX/anchorY as RAW NUMBERS in eight places, never
    // through evalProp — that is deliberate, and the inspector withholds the ◆ button for the anchor
    // because of it. Nothing enforced the contract: the AI op path advertised the anchor as
    // keyframeable and wrote `transform.anchorX = {kf:[…]}` straight onto the layer. `-sw * {kf:[…]}`
    // is NaN, so the traced path is NaN and the layer draws nothing — no exception, nothing to see,
    // and the object serialises into the save, so the layer stays gone across reloads.
    // Count the SHAPE's own colour, not alpha: the scene paints an opaque background, so every
    // pixel on the canvas has alpha 255 whether the layer drew or not — an alpha count measures
    // nothing and passes no matter what. (Mutation testing caught that; the first version of this
    // test could not fail.)
    function lit(layer) {
      const c = offscreen(320, 240);
      FM.renderScene(c.getContext('2d'), scene([layer]), 0);
      const d = c.getContext('2d').getImageData(0, 0, 320, 240).data;
      let n = 0;
      for (let i = 0; i < d.length; i += 4) if (d[i] > 150 && d[i + 1] < 80 && d[i + 2] < 80) n++;
      return n;
    }
    const mk = () => FM.makeLayer('shape', { shape: 'rect', x: 160, y: 120, shapeW: 120, shapeH: 90, fill: '#ff0000' });
    const plain = lit(mk());
    if (plain < 1000) throw new Error('the control layer only lit ' + plain + ' pixels — the test scene is wrong');
    const kfd = mk();
    kfd.transform.anchorX = { kf: [{ t: 0, v: 0.5 }, { t: 2, v: 0 }] };
    const after = lit(kfd);
    if (after < plain * 0.9) throw new Error('a keyframed anchorX dropped the layer from ' + plain + ' to ' + after + ' lit pixels');
    // …and the op path that produced such an object must refuse to write it.
    if (FM.aiOps && FM.aiOps.applyOps) {
      const L = mk(); L.id = 'anchor-kf-probe';
      const saved = FM.scene;
      try {
        FM.scene = { project: { width: 320, height: 240, fps: 30, duration: 5, background: '#000' }, layers: [L], selectedId: L.id, selectedIds: [L.id] };
        FM.aiOps.applyOps([{ op: 'addKeyframe', layer: L.id, path: 'transform.anchorX', keys: [{ t: 0, v: 0.5 }, { t: 2, v: 0 }] }]);
        if (L.transform.anchorX && L.transform.anchorX.kf) throw new Error('the AI op path still writes a keyframed anchor');
      } finally { FM.scene = saved; }
    }
  });

  test('duplicating or importing a project keeps its effect layer references', { item: 'reid-fxsrc' }, function () {
    // v5.15. reIdLayers minted fresh ids and remapped exactly two classes of cross-layer reference:
    // l.parent and behaviors[].params.targetId/sourceId. It never touched effects[].params.source —
    // the layer id every effect declared `layer: true` writes (Luma Matte, Compound Blur, Match Grade,
    // Displacement Map, Polar Displacement). In the copy that id pointed at a layer that does not
    // exist, the compositor's lookup returned undefined, and it fell through to drawing the layer
    // PLAIN: the full uncut rectangle instead of the matte. No error, no toast, and the dead ref was
    // autosaved — so the duplicate rendered differently from the original, permanently. One code path
    // covers Duplicate project, .fmotion.json import, template use/insert and element insert.
    if (!FM.storage || !FM.storage._reIdLayers) throw new Error('FM.storage._reIdLayers is not exposed for testing');
    const matte = FM.makeLayer('shape', { shape: 'rect', name: 'Matte', x: 50, y: 50, shapeW: 40, shapeH: 40, fill: '#fff' });
    const subject = FM.makeLayer('shape', { shape: 'rect', name: 'Subject', x: 60, y: 60, shapeW: 80, shapeH: 80, fill: '#f00' });
    subject.effects = [{ type: 'lumamatte', enabled: true, params: { source: matte.id } }];
    subject.behaviors = [{ type: 'follow', params: { targetId: matte.id } }];
    const res = FM.storage._reIdLayers([matte, subject]);
    const out = res.layers;
    const newMatte = out.find(l => l.name === 'Matte'), newSubject = out.find(l => l.name === 'Subject');
    if (!newMatte || !newSubject) throw new Error('re-id lost a layer');
    if (newMatte.id === matte.id) throw new Error('re-id did not mint a new id');
    if (newSubject.behaviors[0].params.targetId !== newMatte.id) throw new Error('behaviour targetId was not remapped — the control case is broken');
    if (newSubject.effects[0].params.source !== newMatte.id) {
      throw new Error('effect source still points at ' + newSubject.effects[0].params.source + ' (the ORIGINAL matte) instead of the copy — the matte silently does nothing in the duplicate');
    }
    // A reference to something outside the pack must be CLEARED, not left dangling at a live id in
    // some other project.
    const orphan = FM.makeLayer('shape', { shape: 'rect', name: 'Orphan', x: 10, y: 10, shapeW: 10, shapeH: 10, fill: '#00f' });
    orphan.effects = [{ type: 'lumamatte', enabled: true, params: { source: 'layer_not_in_this_pack' } }];
    const o = FM.storage._reIdLayers([orphan]).layers[0];
    if (o.effects[0].params.source) throw new Error('a source pointing outside the pack survived as ' + o.effects[0].params.source);
  });

  test('the home screen is never left invisible waiting for a splash that will not dismiss', { item: 'preintro-stuck' }, async function () {
    // v5.16, and a live report: "when i exit a project nothing loads, i can still press on the screen
    // and load projects but they just arent visibly there… it happens if i refresh while in a
    // project." The splash plays once per SESSION, so on a refresh the boot script returns early and
    // never removes #splash's `hidden` class, never wires dismiss(), never dispatches
    // fm:splash-dismiss. armIntro tested for the ELEMENT rather than for a splash that is actually
    // up, took the "wait for it" branch, and applied .hm-preintro — `opacity: 0` on every child of
    // #home-screen. Six seconds of an invisible-but-clickable home screen until the backstop fired.
    // Refreshing inside a project is what exposes it: home is not opened at boot, so armIntro runs
    // for the first time on the way OUT of the project, long after the splash slot has passed.
    const root = document.getElementById('home-screen');
    if (!root) throw new Error('#home-screen missing');
    // "Is it stuck?" is a question about TIME. A single snapshot cannot tell a stuck home screen from
    // one that is legitimately mid-entrance, and on a cold session the splash genuinely holds
    // .hm-preintro for ~2.4s — which made this read red on every fresh load and green only when the
    // splash had already played. The invariant that actually encodes the bug is narrower: preintro
    // may only be up WHILE a splash is up. Sample it instead of guessing a sleep.
    // The handover is not instantaneous: the splash stops counting as "up" the moment it begins
    // dissolving, and preintro swaps to intro on the next frame. So orphaned-ness is only a fault
    // once it PERSISTS — 0.8s here against the 6s of blank screen that was reported.
    let orphaned = 0;
    for (let i = 0; i < 90; i++) {
      if (!root.classList.contains('hm-preintro')) break;
      orphaned = (FM.home._splashIsUp && FM.home._splashIsUp()) ? 0 : orphaned + 1;
      if (orphaned > 8) {
        throw new Error('#home-screen has sat in .hm-preintro for ' + (orphaned * 100) + 'ms with no splash up — its content is invisible and nothing is left to reveal it');
      }
      if (i === 89) throw new Error('#home-screen was still in .hm-preintro after 9s — the splash never dismissed');
      await new Promise(r => setTimeout(r, 100));
    }

    // The rule itself must still bite when it is legitimately applied, or this test proves nothing.
    root.classList.add('hm-preintro');
    const probe = document.createElement('div');
    root.appendChild(probe);
    const hidden = getComputedStyle(probe).opacity;
    root.removeChild(probe);
    root.classList.remove('hm-preintro');
    if (hidden !== '0') throw new Error('.hm-preintro no longer hides its children (opacity ' + hidden + ') — this test is checking nothing');

    // And the condition: a #splash that is present-but-hidden, or already dissolving, must NOT be
    // treated as "a splash is up". This is the exact state a refresh leaves behind.
    const sp = document.getElementById('splash');
    if (!sp) throw new Error('#splash element is missing from index.html — armIntro keys off it');
    if (!FM.home._splashIsUp) throw new Error('FM.home._splashIsUp is not exposed — this test would only be checking its own copy of the condition');
    const was = sp.className;
    try {
      sp.className = 'hidden';
      if (FM.home._splashIsUp()) throw new Error('a hidden #splash still counts as "up" — the home screen gets blanked on every repeat load, which is the reported bug');
      sp.className = 'splash-out';
      if (FM.home._splashIsUp()) throw new Error('a dissolving #splash still counts as "up" — its dismiss event has already fired, so nothing will ever clear .hm-preintro');
      sp.className = '';
      if (!FM.home._splashIsUp()) throw new Error('a visible #splash is no longer recognised — the entrance would play behind an opaque splash again');
    } finally { sp.className = was; }
  });

  test('a menu trigger toggles: tapping it again closes the menu', { item: 'menu-toggle' }, function () {
    // v5.17. Ezra: "when you tap on something that opens up the menu… tapping on it again should
    // close it, currently it just infinitely reopens." One tap fires TWO events: the pointerdown
    // lands outside the open menu and closes it, then the click runs the trigger's handler which
    // re-opens it. Fixed once in FM.contextMenu rather than in a dozen triggers.
    // Four cases, because three of them broke while getting the fourth right:
    //   · same trigger twice        → closes (the ask)
    //   · a DIFFERENT trigger       → opens ITS menu, does not just close (first attempt broke this)
    //   · the very first menu       → must toggle too (the document listeners were registered lazily
    //                                 inside ensure(), so the first trigger was never recorded)
    //   · menu already closed       → tapping the last trigger OPENS, never toggles a stale opener
    if (!FM.contextMenu || !FM.contextMenu.isOpen) throw new Error('FM.contextMenu.isOpen is missing');
    const a = document.getElementById('btn-more'), b = document.getElementById('btn-parent');
    if (!a || !b) throw new Error('need two real menu triggers (#btn-more, #btn-parent)');
    const tap = el => {
      const r = el.getBoundingClientRect();
      const o = { bubbles: true, cancelable: true, clientX: r.left + r.width / 2, clientY: r.top + r.height / 2, pointerId: 1, isPrimary: true };
      el.dispatchEvent(new PointerEvent('pointerdown', o));
      el.dispatchEvent(new PointerEvent('pointerup', o));
      el.dispatchEvent(new MouseEvent('click', o));
    };
    const hadSel = FM.scene.selectedId;
    if (!hadSel && FM.scene.layers.length) FM.selectLayer(FM.scene.layers[0].id);   // both triggers need a selection
    try {
      FM.contextMenu.hide();
      tap(a);
      if (!FM.contextMenu.isOpen()) throw new Error('the first tap did not open a menu at all');
      tap(a);
      if (FM.contextMenu.isOpen()) throw new Error('tapping the same trigger again did not close the menu — this is the reported bug');
      tap(a);
      if (!FM.contextMenu.isOpen()) throw new Error('a third tap did not re-open it');
      tap(b);
      if (!FM.contextMenu.isOpen()) throw new Error('tapping a DIFFERENT trigger while a menu was open closed everything instead of opening its own menu');
      FM.contextMenu.hide();
      tap(b);
      if (!FM.contextMenu.isOpen()) throw new Error('with no menu showing, tapping the last-used trigger toggled a stale opener shut instead of opening');
    } finally {
      FM.contextMenu.hide();
      if (!hadSel) FM.selectLayer(null); else FM.selectLayer(hadSel);
    }
  });

  test('a two-finger twist rotates the layer, and a plain pinch does not', { item: 'pinch-twist' }, function () {
    // v5.18. Ezra: "When pinching to zoom you should be able to pitch and twist to change the angle
    // as well." The two must not bleed into each other: fingers always rotate a little while they
    // pinch, so the twist only engages past a 7° dead zone, and the threshold is subtracted after
    // that so the angle starts from zero instead of jumping. Both directions are asserted, because
    // the failure mode nobody notices is a resize that quietly skews the layer a few degrees.
    const pv = document.getElementById('preview');
    if (!pv) throw new Error('#preview missing');
    const savedScene = FM.scene;
    const commit = FM.history.commit, autosave = FM.storage.autosave, save = FM.storage.save, dirty = FM.storage.markDirty;
    FM.history.commit = function () {}; FM.storage.autosave = function () {};
    FM.storage.save = function () {}; FM.storage.markDirty = function () {};
    try {
      FM.scene = { project: { width: 320, height: 240, fps: 30, duration: 5, background: '#000' }, layers: [], selectedId: null, selectedIds: [] };
      const L = FM.makeLayer('shape', { shape: 'rect', name: 'T', x: 160, y: 120, shapeW: 80, shapeH: 80, fill: '#f00' });
      FM.scene.layers.push(L); FM.scene.selectedId = L.id; FM.scene.selectedIds = [L.id];
      const r = pv.getBoundingClientRect();
      if (!r.width) throw new Error('#preview has no size to aim at');
      const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
      const ev = (type, id, x, y) => pv.dispatchEvent(new PointerEvent(type, { bubbles: true, cancelable: true, pointerId: id, pointerType: 'touch', isPrimary: id === 1, clientX: x, clientY: y, button: 0 }));
      const at = (deg, rad) => [cx + Math.cos(deg * Math.PI / 180) * rad, cy + Math.sin(deg * Math.PI / 180) * rad];
      const rot = () => FM.evalProp(L.transform.rotation, FM.time) || 0;
      const scl = () => FM.evalProp(L.transform.scale, FM.time) || 1;

      // 1. pure twist, constant separation → rotation moves, scale must not
      let a = at(180, 80), b = at(0, 80);
      ev('pointerdown', 1, a[0], a[1]); ev('pointerdown', 2, b[0], b[1]);
      for (let k = 1; k <= 8; k++) { const d = 40 * k / 8; a = at(180 + d, 80); b = at(d, 80); ev('pointermove', 1, a[0], a[1]); ev('pointermove', 2, b[0], b[1]); }
      ev('pointerup', 1, a[0], a[1]); ev('pointerup', 2, b[0], b[1]);
      const twisted = rot(), scaleAfterTwist = scl();
      if (twisted < 25 || twisted > 40) throw new Error('a 40° twist gave ' + twisted + '° of rotation (expected ~33 — 40 less the 7° dead zone)');
      if (Math.abs(scaleAfterTwist - 1) > 0.05) throw new Error('twisting also changed the scale to ' + scaleAfterTwist);

      // 2. pure pinch, constant angle → scale moves, rotation must not budge at all
      FM.setTransform(L, 'rotation', 0, FM.time); FM.setTransform(L, 'scale', 1, FM.time);
      ev('pointerdown', 1, cx - 60, cy); ev('pointerdown', 2, cx + 60, cy);
      for (let k = 1; k <= 8; k++) { const R = 60 + 60 * k / 8; ev('pointermove', 1, cx - R, cy); ev('pointermove', 2, cx + R, cy); }
      ev('pointerup', 1, cx - 120, cy); ev('pointerup', 2, cx + 120, cy);
      if (Math.abs(rot()) > 0.01) throw new Error('a straight pinch rotated the layer by ' + rot() + '° — the dead zone is not holding');
      if (scl() < 1.6) throw new Error('the pinch did not scale (got ' + scl() + ', expected ~2)');
    } finally {
      FM.scene = savedScene;
      FM.history.commit = commit; FM.storage.autosave = autosave; FM.storage.save = save; FM.storage.markDirty = dirty;
    }
  });

  test('adding a camera does not move layers that have depth', { item: 'cam-parallax' }, function () {
    // v5.20. Depth parallax was driven by the camera's ABSOLUTE position instead of its displacement
    // from the frame centre, so every z != 0 layer picked up a constant offset of centre*(1-pscale) —
    // merely ADDING a camera, before touching it, threw the scene's depth out and put the vanishing
    // point at the frame's bottom-right corner (2cx, 2cy) instead of the middle. At 1080x1920 a
    // z=-1000 layer jumped 190px left and 338px up. This asserts both halves: a camera at rest moves
    // nothing, and a camera that DOES pan still parallaxes by depth (the obvious wrong "fix" is to
    // drop the parallax altogether, which would also pass the first half).
    const W = 320, H = 240;
    function centroidX(layers) {
      const c = offscreen(W, H), ctx = c.getContext('2d');
      FM.renderScene(ctx, scene(layers, { project: { width: W, height: H, fps: 30, duration: 5, background: '#000000' } }), 0);
      const d = ctx.getImageData(0, 0, W, H).data;
      let sx = 0, n = 0;
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
        const i = (y * W + x) * 4;
        if (d[i] > 150 && d[i + 1] < 90 && d[i + 2] < 90) { sx += x; n++; }
      }
      return n ? sx / n : null;
    }
    const mk = z => { const L = FM.makeLayer('shape', { shape: 'rect', name: 'R', x: W / 2, y: H / 2, shapeW: 24, shapeH: 12, fill: '#ff0000' }); L.transform.z = z; return L; };
    const depths = [-120, -60, 60, 240];
    depths.forEach(z => {
      const bare = centroidX([mk(z)]);
      const rest = centroidX([mk(z), FM.makeLayer('camera', { name: 'Cam', x: W / 2, y: H / 2 })]);
      if (bare == null || rest == null) throw new Error('nothing rendered at z=' + z);
      if (Math.abs(rest - bare) > 1) throw new Error('a camera AT REST moved the z=' + z + ' layer by ' + (rest - bare).toFixed(1) + 'px');
    });
    // …and depth must still do something when the camera actually moves.
    const restNear = centroidX([mk(-120), FM.makeLayer('camera', { name: 'C', x: W / 2, y: H / 2 })]);
    const panNear  = centroidX([mk(-120), FM.makeLayer('camera', { name: 'C', x: W / 2 + 40, y: H / 2 })]);
    const restFar  = centroidX([mk(240),  FM.makeLayer('camera', { name: 'C', x: W / 2, y: H / 2 })]);
    const panFar   = centroidX([mk(240),  FM.makeLayer('camera', { name: 'C', x: W / 2 + 40, y: H / 2 })]);
    const dNear = panNear - restNear, dFar = panFar - restFar;
    if (!(dNear < -45)) throw new Error('a near layer (z=-120) barely parallaxed on a 40px pan: ' + dNear.toFixed(1) + 'px');
    if (!(dFar > -33)) throw new Error('a far layer (z=240) moved too much on a 40px pan: ' + dFar.toFixed(1) + 'px');
    if (!(dNear < dFar)) throw new Error('near did not move more than far (' + dNear.toFixed(1) + ' vs ' + dFar.toFixed(1) + ')');
  });

  test('the camera spans the comp, and there is only ever one', { item: 'cam-lifecycle' }, function () {
    // v5.21, from the camera audit. Two separate faults, both measured by driving the app.
    // 1. The camera clip's length was frozen at creation (duration: P.duration at the time), while
    //    autoFitDuration keeps growing the comp to the furthest clip. Add a longer clip afterwards
    //    and the camera simply stops applying partway through: measured as an 80px jump on a 320px
    //    frame plus a 2x size change between two adjacent frames, with no warning.
    // 2. The single-camera invariant was enforced in duplicateLayer but nowhere else, so Cmd-C /
    //    Cmd-V produced a second camera and the composite drives the view from whichever it finds
    //    first — not necessarily the one being edited.
    const savedScene = FM.scene;
    const commit = FM.history.commit, autosave = FM.storage.autosave, save = FM.storage.save, dirty = FM.storage.markDirty;
    FM.history.commit = function () {}; FM.storage.autosave = function () {};
    FM.storage.save = function () {}; FM.storage.markDirty = function () {};
    try {
      FM.scene = { project: { width: 320, height: 240, fps: 30, duration: 5, background: '#000' }, layers: [], selectedId: null, selectedIds: [] };
      const cam = FM.makeLayer('camera', { name: 'Cam', x: 160, y: 120, start: 0, duration: 5 });
      FM.scene.layers.push(cam);
      FM.scene.layers.push(FM.makeLayer('shape', { shape: 'rect', name: 'Long', x: 160, y: 120, shapeW: 40, shapeH: 40, fill: '#f00', start: 0, duration: 20 }));
      FM.autoFitDuration();
      if (Math.abs(FM.scene.project.duration - 20) > 0.01) throw new Error('the comp did not grow to the 20s clip (got ' + FM.scene.project.duration + ')');
      if (Math.abs(cam.duration - 20) > 0.01) throw new Error('the camera still ends at ' + cam.duration + 's on a ' + FM.scene.project.duration + 's comp — the framing would snap back partway through');
      // …and the camera must not be what holds the timeline open.
      FM.scene.layers = FM.scene.layers.filter(l => l.type !== 'shape');
      cam.duration = 30;
      FM.autoFitDuration();
      if (FM.scene.project.duration > 0.01) throw new Error('a lone camera held the timeline open at ' + FM.scene.project.duration + 's — it is not content');
    } finally {
      FM.scene = savedScene;
      FM.history.commit = commit; FM.storage.autosave = autosave; FM.storage.save = save; FM.storage.markDirty = dirty;
    }
  });

  test('dragging a rotated camera still moves the scene the way you drag', { item: 'cam-pan-rot' }, function () {
    // v5.22, from the camera audit. The campan drag divided the finger delta by zoom but never
    // un-rotated it, while the composite applies ctx.rotate(rot) to the whole scene. So the scene
    // came out off by exactly the camera angle: a 281px rightward drag gave (+281,0) at rot=0,
    // (+198,+198) at 45, straight DOWN at 90 and BACKWARDS at 180.
    // Asserted through the composite's own relation rather than by eye: screen displacement of a
    // scene point is R(rot) applied to -Δcamera, and that must come out as the drag, every time.
    const pv = document.getElementById('preview');
    if (!pv) throw new Error('#preview missing');
    const r = pv.getBoundingClientRect();
    if (!r.width) throw new Error('#preview has no size to aim at');
    const savedScene = FM.scene;
    const commit = FM.history.commit, autosave = FM.storage.autosave, save = FM.storage.save, dirty = FM.storage.markDirty;
    FM.history.commit = function () {}; FM.storage.autosave = function () {};
    FM.storage.save = function () {}; FM.storage.markDirty = function () {};
    try {
      [0, 45, 90, 180].forEach(deg => {
        FM.scene = { project: { width: 320, height: 240, fps: 30, duration: 5, background: '#000' }, layers: [], selectedId: null, selectedIds: [] };
        const cam = FM.makeLayer('camera', { name: 'C', x: 160, y: 120, start: 0, duration: 5 });
        FM.setTransform(cam, 'rotation', deg, 0);
        FM.scene.layers.push(cam);
        FM.selectLayer(cam.id);
        const x0 = FM.evalProp(cam.transform.x, 0), y0 = FM.evalProp(cam.transform.y, 0);
        const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
        const ev = (t, x, y) => pv.dispatchEvent(new PointerEvent(t, { bubbles: true, cancelable: true, pointerId: 1, pointerType: 'mouse', isPrimary: true, clientX: x, clientY: y, button: 0, buttons: 1 }));
        ev('pointerdown', cx, cy);
        for (let k = 1; k <= 6; k++) ev('pointermove', cx + 100 * k / 6, cy);
        ev('pointerup', cx + 100, cy);
        const dcx = FM.evalProp(cam.transform.x, 0) - x0, dcy = FM.evalProp(cam.transform.y, 0) - y0;
        // screen delta = R(rot) · (−Δcam)
        const rad = deg * Math.PI / 180, c = Math.cos(rad), s = Math.sin(rad);
        const sx = (-dcx) * c - (-dcy) * s, sy = (-dcx) * s + (-dcy) * c;
        if (Math.abs(sy) > Math.abs(sx) * 0.15) throw new Error('at ' + deg + '° a rightward drag moved the scene (' + Math.round(sx) + ',' + Math.round(sy) + ') — it should be almost purely horizontal');
        if (!(sx > 0)) throw new Error('at ' + deg + '° a rightward drag moved the scene LEFT (' + Math.round(sx) + ')');
      });
    } finally {
      FM.scene = savedScene;
      FM.history.commit = commit; FM.storage.autosave = autosave; FM.storage.save = save; FM.storage.markDirty = dirty;
    }
  });

  test('a phone hold moves an UNSELECTED clip, a quick drag still does not', { item: 'hold-drag' }, async function () {
    // v5.23. Ezra: "On mobile you can only drag clips on the timeline if you have them selected, you
    // should be able to drag clips by holding down on them without selecting." The hold-to-move path
    // was gated on `FM.scene.selectedId === layer.id`, which made moving a clip a two-gesture job.
    // The gate is gone, but the thing it was incidentally protecting must still hold: a finger that
    // is still TRAVELLING is a scrub, not a grab, so a quick drag must not drag the clip with it.
    const savedScene = FM.scene, savedTime = FM.time;
    const commit = FM.history.commit, autosave = FM.storage.autosave, save = FM.storage.save, dirty = FM.storage.markDirty;
    FM.history.commit = function () {}; FM.storage.autosave = function () {};
    FM.storage.save = function () {}; FM.storage.markDirty = function () {};
    try {
      FM.scene = { project: { width: 320, height: 240, fps: 30, duration: 10, background: '#000' }, layers: [], selectedId: null, selectedIds: [] };
      const A = FM.makeLayer('shape', { shape: 'rect', name: 'AAA', x: 80, y: 80, shapeW: 40, shapeH: 40, fill: '#f00', start: 1, duration: 4 });
      const B = FM.makeLayer('shape', { shape: 'rect', name: 'BBB', x: 80, y: 80, shapeW: 40, shapeH: 40, fill: '#0f0', start: 1, duration: 4 });
      FM.scene.layers.push(A, B);
      // NOTHING selected. That is the real phone scenario for this ask — and it has to be, because
      // with a layer selected the phone timeline SOLOS that layer's row, so an unselected clip has no
      // row to grab at all. (The first version of this test selected A first and passed only at
      // desktop width, where every row renders.)
      FM.selectLayer(null);
      const clip = [].find.call(document.querySelectorAll('.clip'), c => c.textContent.trim().indexOf('BBB') === 0);
      if (!clip) throw new Error('no timeline clip rendered with nothing selected');
      const r = clip.getBoundingClientRect();
      if (!r.width) throw new Error('the clip has no width to aim at');
      const x = r.left + r.width / 2, y = r.top + r.height / 2;
      const down = px => clip.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, cancelable: true, pointerId: 7, pointerType: 'touch', isPrimary: true, clientX: px, clientY: y, button: 0, buttons: 1 }));
      const move = px => document.dispatchEvent(new PointerEvent('pointermove', { bubbles: true, pointerId: 7, pointerType: 'touch', isPrimary: true, clientX: px, clientY: y, buttons: 1 }));
      const up = px => document.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, pointerId: 7, pointerType: 'touch', isPrimary: true, clientX: px, clientY: y }));

      const nap = ms => new Promise(res => setTimeout(res, ms));

      // 1. A quick drag, no settle, must leave the clip where it is — that gesture is a scrub.
      const before = B.start;
      down(x); for (let k = 1; k <= 8; k++) move(x + 120 * k / 8); up(x + 120);
      await nap(120);
      if (Math.abs(B.start - before) > 0.02) throw new Error('a quick drag moved the clip from ' + before + ' to ' + B.start + ' — that gesture is a scrub, not a grab');

      // 2. A HOLD on that same still-unselected clip grabs it, moves it, and selects it.
      FM.selectLayer(null);
      const clip2 = [].find.call(document.querySelectorAll('.clip'), c => c.textContent.trim().indexOf('BBB') === 0);
      if (!clip2) throw new Error('the clip vanished before the hold');
      const r2 = clip2.getBoundingClientRect(), x2 = r2.left + r2.width / 2, y2 = r2.top + r2.height / 2;
      clip2.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, cancelable: true, pointerId: 8, pointerType: 'touch', isPrimary: true, clientX: x2, clientY: y2, button: 0, buttons: 1 }));
      await nap(620);   // 350ms arm + the 150ms settle check, with headroom
      for (let k = 1; k <= 6; k++) document.dispatchEvent(new PointerEvent('pointermove', { bubbles: true, pointerId: 8, pointerType: 'touch', isPrimary: true, clientX: x2 + 120 * k / 6, clientY: y2, buttons: 1 }));
      await nap(60);
      document.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, pointerId: 8, pointerType: 'touch', isPrimary: true, clientX: x2 + 120, clientY: y2 }));
      await nap(150);
      if (!(B.start > before + 0.1)) throw new Error('holding an unselected clip did not move it (start still ' + B.start + ') — this is the whole ask');
      if (FM.scene.selectedId !== B.id) throw new Error('the grabbed clip was not selected, so you cannot see what you are dragging');
      if (Math.abs(A.start - 1) > 0.02) throw new Error('the other clip moved too (' + A.start + ')');
    } finally {
      FM.scene = savedScene; FM.time = savedTime;
      FM.history.commit = commit; FM.storage.autosave = autosave; FM.storage.save = save; FM.storage.markDirty = dirty;
    }
  });

  test('isolate cycles three ways and never touches the scene', { item: 'isolate' }, function () {
    // v5.27. The ⧉ layers button used to toast "coming soon". Ezra: "if you have one clip selected,
    // the first tap will make it so every other layer but this one is hidden, then another press
    // makes it so all the other layers are there but this one goes on top of them all… and then
    // pressing again sets it back… make sure you dont actually make it move on the timeline at all,
    // this shouldnt change anything but just be its own little tool to help you visualise stuff."
    // That last sentence is the important half and is what this test is really for: it is a VIEW
    // state read by the compositor, so layer order, visibility, history and autosave must all be
    // untouched no matter which mode is armed.
    const savedScene = FM.scene;
    const commit = FM.history.commit, autosave = FM.storage.autosave, save = FM.storage.save, dirty = FM.storage.markDirty;
    let commits = 0, saves = 0;
    FM.history.commit = function () { commits++; }; FM.storage.autosave = function () { saves++; };
    FM.storage.save = function () { saves++; }; FM.storage.markDirty = function () {};
    try {
      if (!FM.setIsolate) throw new Error('FM.setIsolate is missing — the layers button does nothing again');
      const W = 200, H = 200;
      FM.scene = { project: { width: W, height: H, fps: 30, duration: 5, background: '#000000' }, layers: [], selectedId: null, selectedIds: [] };
      // Front overlaps Back but also sticks out to the right, so the three modes are distinguishable:
      // with both fully overlapping they render identically and the test would prove nothing.
      const back = FM.makeLayer('shape', { shape: 'rect', name: 'Back', x: 80, y: 100, shapeW: 100, shapeH: 100, fill: '#0000ff' });
      const front = FM.makeLayer('shape', { shape: 'rect', name: 'Front', x: 130, y: 100, shapeW: 100, shapeH: 100, fill: '#ff0000' });
      FM.scene.layers.push(front, back);
      const order0 = FM.scene.layers.map(l => l.name).join(',');
      const vis0 = FM.scene.layers.map(l => l.visible !== false).join(',');
      const at = (x, y) => {
        const c = offscreen(W, H); FM.renderScene(c.getContext('2d'), FM.scene, 0);
        const d = c.getContext('2d').getImageData(x, y, 1, 1).data;
        return (d[0] > 140 && d[1] < 90) ? 'RED' : ((d[2] > 140 && d[0] < 90) ? 'BLUE' : 'bg');
      };
      FM.selectLayer(back.id);
      if (at(100, 100) !== 'RED' || at(170, 100) !== 'RED') throw new Error('the control render is wrong before isolating');
      FM.setIsolate(1);
      if (at(100, 100) !== 'BLUE' || at(170, 100) !== 'bg') throw new Error('mode 1 should hide every other layer');
      FM.setIsolate(2);
      if (at(100, 100) !== 'BLUE') throw new Error('mode 2 should draw the chosen layer OVER the others');
      if (at(170, 100) !== 'RED') throw new Error('mode 2 should still show the other layers');
      FM.setIsolate(0);
      if (at(100, 100) !== 'RED') throw new Error('turning isolate off did not restore the normal render');

      FM.setIsolate(2);
      if (FM.scene.layers.map(l => l.name).join(',') !== order0) throw new Error('isolate REORDERED the layers — it must only change the draw');
      if (FM.scene.layers.map(l => l.visible !== false).join(',') !== vis0) throw new Error('isolate changed layer.visible — it must only change the draw');
      if (commits || saves) throw new Error('isolate wrote history/autosave (' + commits + ' commits, ' + saves + ' saves) — it is a view tool, not an edit');
      FM.selectLayer(front.id);
      if (FM.isolate) throw new Error('isolate survived a selection change — you would be left wondering where the other layers went');
    } finally {
      if (FM.setIsolate) FM.setIsolate(0);
      FM.scene = savedScene;
      FM.history.commit = commit; FM.storage.autosave = autosave; FM.storage.save = save; FM.storage.markDirty = dirty;
    }
  });

  test('the view rail can be scrolled to its last control, and nothing is squashed', { item: 'view-rail' }, function () {
    // v5.29. Ezra, of the phone: "the view row is kinda ruined, needs to not be crammed in and be
    // slide-able up and down." The rail is pinned to the CANVAS's height and has carried a lot more
    // since v5.03 — fit, grid, layers, camera, canvas zoom, rate, loop, three export marks, timeline
    // zoom. Measured at 380x820 it was 316px tall holding 566px of controls, so 252px of them were
    // simply unreachable; his screenshot has mark-out sliced in half by the canvas edge.
    // Both halves are asserted: it must SCROLL, and the buttons must keep their full touch target
    // (shrinking them to fit would be the "crammed" he was complaining about).
    const bar = document.getElementById('view-bar');
    if (!bar) throw new Error('#view-bar missing');
    const wasHidden = bar.classList.contains('hidden');
    if (wasHidden) bar.classList.remove('hidden');
    const wasScroll = bar.scrollTop;
    try {
      const cs = getComputedStyle(bar);
      if (cs.overflowY !== 'auto' && cs.overflowY !== 'scroll') {
        throw new Error('the rail does not scroll (overflow-y: ' + cs.overflowY + ') — anything past the canvas edge is unreachable');
      }
      const btns = [].slice.call(bar.querySelectorAll('.vb-btn'));
      if (!btns.length) throw new Error('no .vb-btn in the rail to measure');
      const squashed = btns.filter(b => b.getBoundingClientRect().height > 0 && b.getBoundingClientRect().height < 34);
      if (squashed.length) throw new Error(squashed.length + ' rail buttons were squashed below 34px — the flex container is shrinking them instead of scrolling');
      // If it overflows at this size, prove the far end can actually be reached.
      if (bar.scrollHeight - bar.clientHeight > 4) {
        const last = bar.lastElementChild;
        bar.scrollTop = bar.scrollHeight;
        const lr = last.getBoundingClientRect(), br = bar.getBoundingClientRect();
        if (lr.bottom > br.bottom + 2) throw new Error('scrolling to the end still does not bring the last control into view');
      }
    } finally {
      bar.scrollTop = wasScroll;
      if (wasHidden) bar.classList.add('hidden');
    }
  });

  test('effects sized in pixels cover the same fraction of frame at any preview scale', { item: 'plate-scale' }, function () {
    // v5.32, and the head of BUG-HUNT.md's largest block. The preview canvas is rendered at
    // P.width * s for the adaptive playback tier (down to 0.28), so an effect whose parameter is a
    // LENGTH must multiply by that scale or it draws the same number of PLATE pixels — a much bigger
    // thing in project terms, and one that never reaches the export. drawPixelEffect has always
    // passed the scale as a 6th argument saying exactly this; only 4 of 67 effects were taking it.
    //
    // THE PROBE MATTERS AS MUCH AS THE ASSERTION. Measuring at DEFAULT parameters on a flat rectangle
    // put mattefringe at 3.63 and hextiles at 8.45 — both pure noise, because each changed under 1%
    // of the frame and the ratio was dominated by edge antialiasing. With a parameter that actually
    // does something, on a shape with real detail, mattefringe measures 1.09 and always did.
    // So: meaningful parameters, a star (concave, plenty of edge), and a coverage floor.
    const P = { width: 240, height: 180, fps: 30, duration: 5, background: null };
    function frac(type, params, rs) {
      const mk = fx => {
        const c = offscreen(Math.round(P.width * rs), Math.round(P.height * rs));
        c.__fmRS = rs; c.__fmOX = 0; c.__fmOY = 0;
        const L = FM.makeLayer('shape', { shape: 'star', x: 120, y: 90, shapeW: 150, shapeH: 130, fill: '#c8c8c8' });
        L.effects = fx;
        FM.renderScene(c.getContext('2d'), { project: P, layers: [L], selectedId: null, selectedIds: [] }, 0);
        return c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
      };
      const a = mk([]), b = mk([{ type: type, enabled: true, params: params }]);
      let n = 0;
      for (let i = 0; i < a.length; i += 4) {
        if (Math.abs(a[i] - b[i]) + Math.abs(a[i + 1] - b[i + 1]) + Math.abs(a[i + 2] - b[i + 2]) + Math.abs(a[i + 3] - b[i + 3]) > 12) n++;
      }
      return n / (a.length / 4);
    }
    // Ratios BEFORE the scaling was threaded through: stroke 3.89, mosaic 2.02.
    [['stroke', { width: 12 }], ['mosaic', { size: 40 }], ['mattefringe', { width: 12 }]].forEach(pair => {
      const type = pair[0], params = pair[1];
      const full = frac(type, params, 1);
      if (full < 0.05) throw new Error(type + ' changed only ' + (full * 100).toFixed(1) + '% of the frame at 1:1 — the probe is too weak to measure anything, not the effect too good');
      const ratio = frac(type, params, 0.36) / full;
      // 1.6 catches the real bug (stroke was 3.89) while allowing the integer quantisation that is
      // unavoidable when a 12px feature lands on a 0.36 plate.
      if (ratio > 1.6) throw new Error(type + ' covers ' + ratio.toFixed(2) + 'x as much of the frame at a 0.36 preview scale as at 1:1 — its size is being applied in plate pixels, so the preview disagrees with the export');
    });
  });

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

  test('camera focus blur is symmetric about the focus plane', { item: 'cam-focus' }, function () {
    // v5.34, from the camera audit. The blur radius was divided by the layer's perspective scale.
    // That looks like pre-compensating for the scale applied afterwards, but ctx.filter is applied in
    // DEVICE space and is not touched by the transform — the same fact that makes plateScale
    // necessary — so it simply made the blur depend on depth a SECOND time, on top of camDefocus
    // which already measures distance from the focus plane. Anything behind the plane was smeared
    // away; anything in front of it barely blurred. Measured near 29px vs far 64px for layers the
    // same distance either side; now 58 vs 59.
    const W = 400, H = 260;
    function ramp(z) {
      const c = offscreen(W, H);
      c.__fmRS = 1; c.__fmOX = 0; c.__fmOY = 0;
      const cam = FM.makeLayer('camera', { name: 'C', x: W / 2, y: H / 2, start: 0, duration: 5 });
      cam.focus = { enabled: true, distance: 0, dof: 40, blur: 1 };
      const L = FM.makeLayer('shape', { shape: 'rect', name: 'R', x: W / 2, y: H / 2, shapeW: 100, shapeH: 80, fill: '#ffffff' });
      L.transform.z = z;
      FM.renderScene(c.getContext('2d'), { project: { width: W, height: H, fps: 30, duration: 5, background: '#000000' }, layers: [L, cam], selectedId: null, selectedIds: [] }, 0);
      const d = c.getContext('2d').getImageData(0, 0, W, H).data;
      const y = H >> 1, at = x => d[(y * W + x) * 4];
      let x = W >> 1;
      while (x < W - 1 && at(x) > 230) x++;
      const start = x;
      while (x < W - 1 && at(x) > 25) x++;
      return x - start;
    }
    if (ramp(0) > 3) throw new Error('a layer ON the focus plane is blurred (' + ramp(0) + 'px of ramp) — it should be sharp');
    const near = ramp(-260), far = ramp(260);
    if (near < 8 || far < 8) throw new Error('focus blur is not engaging at all (near ' + near + ', far ' + far + ') — check the focus field names, since a focus object missing its fields silently means no blur');
    const ratio = Math.max(near, far) / Math.max(1, Math.min(near, far));
    if (ratio > 1.5) throw new Error('layers the same distance either side of the focus plane blur by ' + near + 'px and ' + far + 'px (ratio ' + ratio.toFixed(2) + ') — the blur is depth-dependent twice over');
  });

  test('a camera does not stop blends and adjustments seeing the background', { item: 'cam-bg' }, function () {
    // v5.35, two HIGH findings from the camera audit with one cause. The project background is
    // painted on the real canvas rather than into the camera's plate, deliberately, so it stays put
    // when the camera pans — Ezra: "the background is usually one solid colour so would you even
    // notice the panning? Keep the background unaffected." But painting it ONLY there left the plate
    // transparent where the background should be, so a blend mode had nothing to blend against and an
    // adjustment layer had nothing to grade: both silently stopped working the moment a camera existed.
    // It is now also laid into the plate, INVERSE-MAPPED through the camera transform, so the
    // composite puts it exactly over the frame and it still does not move. All three properties are
    // asserted, because fixing either one alone is easy and wrong.
    const W = 300, H = 220, BG = '#3060c0';
    function px(layers, camX) {
      const c = offscreen(W, H);
      c.__fmRS = 1; c.__fmOX = 0; c.__fmOY = 0;
      const ls = layers.slice();
      if (camX != null) ls.push(FM.makeLayer('camera', { name: 'C', x: camX, y: H / 2, start: 0, duration: 5 }));
      FM.renderScene(c.getContext('2d'), { project: { width: W, height: H, fps: 30, duration: 5, background: BG }, layers: ls, selectedId: null, selectedIds: [] }, 0);
      const d = c.getContext('2d').getImageData(0, 0, W, H).data;
      const rd = (x, y) => { const i = (y * W + x) * 4; return d[i] + ',' + d[i + 1] + ',' + d[i + 2]; };
      return { corner: rd(20, 20), far: rd(W - 20, H - 20), centre: rd(W >> 1, H >> 1) };
    }
    // 1. the background must not move with the camera
    const rest = px([], W / 2), panned = px([], W / 2 + 70);
    if (rest.corner !== panned.corner || rest.far !== panned.far) {
      throw new Error('the background moved when the camera panned (' + rest.corner + ' → ' + panned.corner + ') — it is meant to stay fixed');
    }
    // 2. a blend mode must composite against it, exactly as it does with no camera
    const mkBlend = () => { const b = FM.makeLayer('shape', { shape: 'rect', name: 'B', x: W / 2, y: H / 2, shapeW: 120, shapeH: 90, fill: '#ffffff' }); b.blendMode = 'difference'; return b; };
    const noCam = px([mkBlend()], null).centre, withCam = px([mkBlend()], W / 2).centre;
    if (noCam === '255,255,255') throw new Error('the blend did not apply even without a camera — the probe is wrong, not the app');
    if (withCam !== noCam) throw new Error('a difference blend renders ' + withCam + ' with a camera and ' + noCam + ' without — the camera plate has no background to blend against');
    // 3. an adjustment layer must grade it
    const adj = FM.makeLayer('adjustment', { name: 'grade' });
    adj.effects = [{ type: 'invert', enabled: true, params: { amount: 1 } }];
    if (px([adj], W / 2).corner === rest.corner) {
      throw new Error('an adjustment layer left the background untouched with a camera present — it cannot see it');
    }
  });

  test('a camera scene is rendered on the preview\u2019s own pixel grid', { item: 'cam-plate' }, function () {
    // v5.36, from the camera audit and the same class as the adjustment-layer plate fixed in v5.10.
    // The camera composites through an offscreen plate that was allocated at exactly P.width x
    // P.height and never stamped with __fmRS/__fmOX/__fmOY. Two consequences: plateScale() read an
    // undefined scale on it and returned 1, so inside a camera scene the adaptive playback quality
    // tier did nothing whatsoever; and a zoomed preview could not supersample, so the plate had to be
    // UPSCALED to the canvas and everything went soft. Measured at a 2x zoomed preview: a hard edge
    // came out as a 2px ramp with a camera against 0px without. This asserts the camera path matches
    // the no-camera path, which is the property that was broken.
    const W = 320, H = 240, rs = 2;
    function edgeRamp(withCam) {
      const c = offscreen(Math.round(W * rs), Math.round(H * rs));
      c.__fmRS = rs; c.__fmOX = 0; c.__fmOY = 0;
      const L = FM.makeLayer('shape', { shape: 'rect', name: 'R', x: W / 2, y: H / 2, shapeW: 120, shapeH: 90, fill: '#ffffff' });
      const ls = [L];
      if (withCam) ls.push(FM.makeLayer('camera', { name: 'C', x: W / 2, y: H / 2, start: 0, duration: 5 }));
      FM.renderScene(c.getContext('2d'), { project: { width: W, height: H, fps: 30, duration: 5, background: '#000000' }, layers: ls, selectedId: null, selectedIds: [] }, 0);
      const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
      const y = c.height >> 1, at = x => d[(y * c.width + x) * 4];
      let x = c.width >> 1;
      while (x < c.width - 1 && at(x) > 240) x++;
      const s0 = x;
      while (x < c.width - 1 && at(x) > 15) x++;
      return x - s0;
    }
    const plain = edgeRamp(false), withCam = edgeRamp(true);
    if (withCam > plain + 1) {
      throw new Error('on a 2x zoomed preview a hard edge is ' + withCam + 'px of ramp with a camera against ' + plain + 'px without — the camera plate is being upscaled instead of rendered at the preview\u2019s resolution');
    }
  });

  test('home: the OPEN badge says OPEN over any thumbnail', { item: 'open-badge-ink' }, async function () {
    // The badge art was keyed out of a black backdrop, which knocked the letters out along with the
    // background — so the word was a hole wearing whatever project thumbnail sat behind it, and it
    // vanished on a busy one. Guard the ASSET, not the CSS: a re-export with the same mistake is
    // exactly how this comes back. Interior transparency is found by flooding inward from the border,
    // so the pill's own soft outer edge is not mistaken for a hole.
    var url = new URL('../open-badge.png', document.baseURI).href;
    var img = await new Promise(function (res, rej) {
      var i = new Image();
      i.onload = function () { res(i); };
      i.onerror = function () { rej(new Error('open-badge.png did not load from ' + url)); };
      i.src = url + '?t=' + Math.random();
    });
    var W = img.naturalWidth, H = img.naturalHeight;
    if (!W || !H) throw new Error('open-badge.png decoded to 0x0');
    var c = offscreen(W, H), cx = c.getContext('2d');
    cx.drawImage(img, 0, 0);
    var a = cx.getImageData(0, 0, W, H).data;
    var alpha = function (x, y) { return a[(y * W + x) * 4 + 3]; };

    var outside = new Uint8Array(W * H), q = [];
    var push = function (x, y) {
      var i = y * W + x;
      if (!outside[i] && alpha(x, y) < 250) { outside[i] = 1; q.push(i); }
    };
    for (var x = 0; x < W; x++) { push(x, 0); push(x, H - 1); }
    for (var y = 0; y < H; y++) { push(0, y); push(W - 1, y); }
    for (var h = 0; h < q.length; h++) {
      var i = q[h], qx = i % W, qy = (i / W) | 0;
      if (qx > 0) push(qx - 1, qy);
      if (qx < W - 1) push(qx + 1, qy);
      if (qy > 0) push(qx, qy - 1);
      if (qy < H - 1) push(qx, qy + 1);
    }
    var holes = 0;
    for (var j = 0; j < W * H; j++) if (!outside[j] && a[j * 4 + 3] < 250) holes++;
    if (holes) {
      throw new Error(holes + ' of ' + (W * H) + ' pixels inside the OPEN badge are see-through — the ' +
        'lettering is a cut-out again, so the word takes the colour of the thumbnail behind it');
    }

    // …and the letters must still be legible against the glass they sit on, not merely opaque.
    var lum = function (o) {
      var f = function (v) { v /= 255; return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
      return 0.2126 * f(a[o]) + 0.7152 * f(a[o + 1]) + 0.0722 * f(a[o + 2]);
    };
    var dark = [], light = [];
    for (var yy = (H * 0.28) | 0; yy < (H * 0.58) | 0; yy++) {
      for (var xx = (W * 0.16) | 0; xx < (W * 0.84) | 0; xx++) {
        var o = (yy * W + xx) * 4;
        if (a[o + 3] < 250) continue;
        (lum(o) < 0.06 ? dark : light).push(lum(o));
      }
    }
    if (dark.length < 200) throw new Error('found only ' + dark.length + ' ink pixels in the badge’s text band — the lettering is missing or no longer dark');
    var med = light.sort(function (p, r) { return p - r; })[(light.length / 2) | 0];
    var ratio = (med + 0.05) / (0.05);
    if (ratio < 4.5) throw new Error('ink against the median glass around it is only ' + ratio.toFixed(2) + ':1 — under the 4.5:1 readable floor');
  });

  test('effects: an effect can be copied off one layer and pasted onto another', { item: 'fx-copy-paste' }, function () {
    // v5.39. Ezra: "in the three dots for each effect, add options to copy effect and paste effect."
    // Driven through the REAL ⋯ menu rather than by calling the clipboard directly, because the whole
    // feature is two menu entries — a clipboard that works behind a menu that never offers it is the
    // failure worth catching.
    if (!FM.fxClipboard) throw new Error('FM.fxClipboard is missing');
    const menuLabels = () => Array.prototype.slice.call(document.querySelectorAll('#ctx-menu .ctx-item'))
      .map(n => (n.textContent || '').trim());
    const openMore = () => {
      // The effect list lives behind the inspector's Effects CATEGORY — a plain refresh() leaves the
      // panel on its category grid and renders no .fx-row at all.
      FM.inspector.openCategory('effects');
      const btn = document.querySelector('.fx-row.fx-open .fx-head .fx-icon-btn[title="More"]');
      if (!btn) throw new Error('no ⋯ button on the open effect row');
      btn.click();
      return menuLabels();
    };

    const saved = localStorage.getItem('fm.fxclip');
    const layers0 = FM.scene.layers.slice(), sel0 = FM.scene.selectedId;
    try {
      localStorage.removeItem('fm.fxclip');

      const src = FM.makeLayer('shape', { shape: 'rect', name: 'src', x: 100, y: 100, shapeW: 80, shapeH: 80, fill: '#ff0000' });
      const dst = FM.makeLayer('shape', { shape: 'rect', name: 'dst', x: 200, y: 100, shapeW: 80, shapeH: 80, fill: '#00ff00' });
      const fx = FM.fxRegistry.makeInstance('blur');
      if (!fx) throw new Error('no blur effect in the registry to test with');
      // A non-default value AND an animated one: a copy that silently drops keyframes would still pass
      // if the only thing checked were a scalar.
      const pk = Object.keys(fx.params)[0];
      if (pk == null) throw new Error('the blur effect has no params to carry');
      fx.params[pk] = 7.5;
      fx._expanded = true;
      src.effects = [fx];
      dst.effects = [];
      FM.scene.layers.push(src, dst);

      FM.selectLayer(src.id);
      let labels = openMore();
      if (!labels.some(l => /^Copy effect$/.test(l))) throw new Error('the ⋯ menu has no "Copy effect": ' + JSON.stringify(labels));
      if (labels.some(l => /^Paste /.test(l))) throw new Error('a "Paste" entry is offered with an empty clipboard: ' + JSON.stringify(labels));

      if (!FM.fxClipboard.copy(fx)) throw new Error('FM.fxClipboard.copy returned false');
      if (FM.fxClipboard.label() !== (FM.fxRegistry.get('blur') || {}).label) {
        throw new Error('the clipboard does not name the copied effect: ' + FM.fxClipboard.label());
      }

      // The destination has no effects, so it has no row to open a ⋯ on — check the entry on the
      // SOURCE's stack, where there is one, and apply the paste to the destination by hand below.
      FM.selectLayer(src.id);
      labels = openMore();
      const paste = labels.find(l => /^Paste /.test(l));
      if (!paste) throw new Error('no "Paste" entry after copying: ' + JSON.stringify(labels));
      if (!/Paste .+/.test(paste)) throw new Error('the paste entry does not name the effect: ' + paste);

      // Apply it the way the menu does, onto the OTHER layer.
      const got = FM.fxClipboard.read();
      if (!got) throw new Error('clipboard read back null straight after a successful copy');
      if (got.params[pk] !== 7.5) throw new Error('the copy lost its edited parameter: ' + got.params[pk]);
      if ('_expanded' in got) throw new Error('the copy carried the runtime _expanded flag, so a paste arrives with its editor already open');
      dst.effects.push(got);
      if (dst.effects.length !== 1 || dst.effects[0].type !== 'blur') throw new Error('paste did not land on the destination layer');

      // …and again with that parameter ANIMATED. A keyframed param is not a number, it is a channel
      // object living in the same slot, so a clipboard that flattened values would still have passed
      // everything above while quietly turning every animation into a still.
      fx.params[pk] = { kf: [{ t: 0, v: 3 }, { t: 1, v: 9 }] };
      if (!FM.isAnimated(fx.params[pk])) throw new Error('the probe channel is not what FM calls animated — this check would prove nothing');
      if (!FM.fxClipboard.copy(fx)) throw new Error('copying an animated effect returned false');
      const anim = FM.fxClipboard.read();
      if (!anim || !FM.isAnimated(anim.params[pk])) throw new Error('the copy lost its keyframes — an animated effect pastes back as a static one');
      if (anim.params[pk].kf.length !== 2 || anim.params[pk].kf[1].v !== 9) {
        throw new Error('the pasted channel does not match what was copied: ' + JSON.stringify(anim.params[pk]));
      }

      // A type this build no longer knows must read as an empty clipboard, not paste a dead row.
      localStorage.setItem('fm.fxclip', JSON.stringify({ type: 'no-such-effect-xyz', params: {} }));
      if (FM.fxClipboard.read()) throw new Error('an unknown effect type on the clipboard still reads as pasteable');
      if (FM.fxClipboard.label()) throw new Error('an unknown effect type still produces a menu label');
    } finally {
      if (FM.contextMenu && FM.contextMenu.hide) FM.contextMenu.hide();
      if (saved == null) localStorage.removeItem('fm.fxclip'); else localStorage.setItem('fm.fxclip', saved);
      FM.scene.layers.length = 0;
      layers0.forEach(l => FM.scene.layers.push(l));
      FM.selectLayer(sel0);
      FM.inspector.refresh();
    }
  });

  test('text: a wrap width breaks the lines, and the picture obeys it', { item: 'text-wrap' }, function () {
    // v5.40. Ezra: "you should be able to drag the border of the text to decide when the text wraps
    // and stops going on to the right." Text had NO wrapping at all before this — four separate places
    // did split('\n') and a long line simply ran off the frame.
    if (!FM.textLines) throw new Error('FM.textLines is missing');
    const LONG = 'the quick brown fox jumps over the lazy dog again and again';
    const mk = ww => FM.makeLayer('text', { text: LONG, x: 160, y: 120, size: 24, fontSize: 24, wrapWidth: ww });

    const c = offscreen(10, 10).getContext('2d');
    c.font = '24px sans-serif';
    const wide = FM.textLines(c, { wrapWidth: 0 }, LONG);
    if (wide.length !== 1) throw new Error('with no wrap width the text should stay on one line, got ' + wide.length);

    const WW = 140;
    const lines = FM.textLines(c, { wrapWidth: WW }, LONG);
    if (lines.length < 2) throw new Error('a ' + WW + 'px column did not break a ' + Math.round(c.measureText(LONG).width) + 'px line');
    lines.forEach(l => {
      if (c.measureText(l).width > WW + 0.5) throw new Error('a wrapped line is ' + Math.round(c.measureText(l).width) + 'px wide, past the ' + WW + 'px column: "' + l + '"');
    });
    if (lines.join(' ').replace(/\s+/g, ' ').trim() !== LONG) throw new Error('wrapping changed the words: "' + lines.join(' ') + '"');

    // A single word wider than the whole column has to be broken, not left hanging out past the
    // border the user just dragged — and it is the case the greedy loop gets wrong first, because the
    // word starts its line and so never reaches the "does not fit after what is already here" branch.
    const solo = FM.textLines(c, { wrapWidth: 60 }, 'Supercalifragilistic');
    if (solo.length < 2) throw new Error('an over-long single word was not broken: ' + JSON.stringify(solo));
    solo.forEach(l => { if (c.measureText(l).width > 60.5) throw new Error('a broken piece is still ' + Math.round(c.measureText(l).width) + 'px wide: "' + l + '"'); });

    // …and the PICTURE has to obey it, not just the helper. Measure the drawn ink both ways.
    const inkBox = layer => {
      const cv = offscreen(320, 240), cx = cv.getContext('2d');
      FM.renderScene(cx, scene([layer]), 0);
      const d = cx.getImageData(0, 0, 320, 240).data;
      let x0 = 1e9, x1 = -1, y0 = 1e9, y1 = -1;
      for (let y = 0; y < 240; y++) for (let x = 0; x < 320; x++) {
        const o = (y * 320 + x) * 4;
        if (d[o] + d[o + 1] + d[o + 2] > 90) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
      }
      return x1 < 0 ? null : { w: x1 - x0 + 1, h: y1 - y0 + 1 };
    };
    const off = inkBox(mk(0)), on = inkBox(mk(WW));
    if (!off || !on) throw new Error('the text did not render at all — this test would be measuring an empty canvas');
    if (!(on.w < off.w - 10)) throw new Error('the drawn text is ' + on.w + 'px wide with a ' + WW + 'px wrap and ' + off.w + 'px without — the renderer is ignoring wrapWidth');
    if (!(on.h > off.h + 4)) throw new Error('wrapping did not add any lines to the picture (h ' + off.h + ' → ' + on.h + ')');
    if (on.w > WW + 4) throw new Error('the wrapped text still draws ' + on.w + 'px wide, past its ' + WW + 'px column');

    // The selection box has to agree with the picture, or the handle you drag stops matching the border.
    const sz = FM.layerSize(mk(WW));
    if (Math.abs(sz.w - WW) > 0.5) throw new Error('layerSize reports ' + sz.w + ' for a ' + WW + 'px column — the box and the text would disagree');

    // The handles themselves: text-only, and really in the DOM.
    const sb = document.getElementById('select-box');
    if (!sb) throw new Error('#select-box missing');
    if (sb.querySelectorAll('.sb-wrap').length !== 2) throw new Error('expected two wrap handles, found ' + sb.querySelectorAll('.sb-wrap').length);
    const probe = sb.querySelector('.sb-wrap');
    sb.classList.remove('sb-has-wrap');
    if (getComputedStyle(probe).display !== 'none') throw new Error('the wrap handles show on a non-text layer');
    sb.classList.add('sb-has-wrap');
    if (getComputedStyle(probe).display === 'none') throw new Error('the wrap handles stay hidden on a text layer');
    sb.classList.remove('sb-has-wrap');
  });

  test('text editor: the selection box follows the canvas when the keyboard opens', { item: 'text-edit-mobile' }, async function () {
    // v5.41. Ezra: "when you're in the text edit screen on mobile and you are typing it is glitchy and
    // doesn't let you edit the other options on screen… and also pushes the screen down." Opening the
    // keyboard shrinks the visual viewport, and the editor answers by re-padding #stage — which
    // resizes the canvas. Nothing told the selection box: a padding change fires no window resize, so
    // the box stayed where the canvas USED to be, parked in a corner of the frame with the text
    // somewhere else entirely.
    if (!FM.textEdit) throw new Error('FM.textEdit is missing');
    // setTimeout, not rAF: this suite runs inside an offscreen iframe, where rAF is throttled and a
    // promise waiting on it never settles — which hangs the whole run rather than failing a test.
    const frame = () => new Promise(r => setTimeout(r, 60));
    const layers0 = FM.scene.layers.slice(), sel0 = FM.scene.selectedId;
    const vv0 = window.visualViewport;
    const cv = document.getElementById('preview');
    const box = document.getElementById('select-box');
    if (!cv || !box) throw new Error('need #preview and #select-box');

    const P = FM.scene.project;
    const L = FM.makeLayer('text', { name: 'kbtest', text: 'Type here', x: P.width / 2, y: P.height * 0.4, fontSize: 90 });
    try {
      FM.scene.layers.length = 0; FM.scene.layers.push(L);
      FM.refreshAll();
      FM.textEdit.start(L.id);
      await frame();

      let geom = '';
      const drift = () => {
        const r = cv.getBoundingClientRect(), b = box.getBoundingClientRect();
        const ex = r.left + (FM.evalProp(L.transform.x, FM.time) / P.width) * r.width;
        const ey = r.top + (FM.evalProp(L.transform.y, FM.time) / P.height) * r.height;
        geom = ' [canvas ' + [r.left, r.top, r.width, r.height].map(Math.round) +
               ' | box ' + [b.left, b.top, b.width, b.height].map(Math.round) +
               ' | disp ' + (box.style.display || 'auto') + ' | sel ' + (FM.scene.selectedId === L.id) +
               ' | vp ' + (FM.viewport ? FM.viewport.scale + ',' + FM.viewport.x + ',' + FM.viewport.y : '?') + ']';
        return Math.hypot((b.left + b.width / 2) - ex, (b.top + b.height / 2) - ey);
      };
      const before = drift();
      if (before > 6) throw new Error('the box is already ' + Math.round(before) + 'px off the text before any keyboard — this test cannot tell the fix from the bug');

      // Fake the keyboard: the visual viewport is what actually changes, and it is read-only, so the
      // whole object is swapped for the duration.
      const fake = { height: window.innerHeight - 336, width: window.innerWidth, offsetTop: 0, offsetLeft: 0, pageTop: 0, pageLeft: 0, scale: 1, addEventListener() {}, removeEventListener() {} };
      Object.defineProperty(window, 'visualViewport', { value: fake, configurable: true });
      window.dispatchEvent(new Event('resize'));
      await frame();

      const stage = document.getElementById('stage');
      const padB = parseFloat(getComputedStyle(stage).paddingBottom) || 0;
      const dockH = document.querySelector('.te-dock') ? document.querySelector('.te-dock').getBoundingClientRect().height : 0;
      // The lift should clear the keyboard AND the docked field — but never by more than that (a
      // hardcoded guess used to overshoot), and never so far that the preview is squeezed out (the
      // clamp, which is the only reason it may legitimately come up short on a short screen).
      const stageH = stage.getBoundingClientRect().height;
      const topPad = parseFloat(getComputedStyle(stage).paddingTop) || 0;
      const want = 336 + dockH + 12, room = Math.max(0, stageH - topPad - 120);
      const expect = Math.min(want, room);
      if (Math.abs(padB - expect) > 2) {
        throw new Error('#stage is padded ' + Math.round(padB) + 'px; a 336px keyboard plus a ' + Math.round(dockH) +
          'px dock wants ' + Math.round(want) + 'px and the stage has room for ' + Math.round(room) + 'px, so it should be ' + Math.round(expect));
      }
      // …and the lift must never eat the preview entirely. A picture partly behind the keyboard beats
      // no picture at all, which is what a short screen used to get.
      const cr = cv.getBoundingClientRect();
      if (cr.width < 20 || cr.height < 20) throw new Error('the preview collapsed to ' + Math.round(cr.width) + 'x' + Math.round(cr.height) + ' when the keyboard opened');

      const after = drift();
      if (after > 6) throw new Error('after the keyboard opened the selection box sits ' + Math.round(after) + 'px away from the text it belongs to (was ' + Math.round(before) + 'px)' + geom);

      // The toolbar must not steal focus: on iOS a tap that blurs the field closes the keyboard and
      // re-flows the whole screen, which is what made the options unusable while typing.
      const btn = document.querySelector('.te-bar .te-btn');
      if (!btn) throw new Error('no toolbar button to test');
      const ev = new PointerEvent('pointerdown', { bubbles: true, cancelable: true, pointerId: 1, isPrimary: true });
      btn.dispatchEvent(ev);
      if (!ev.defaultPrevented) throw new Error('a pointerdown on a toolbar button is not prevented — on iOS the field blurs and the keyboard closes on every tap');
    } finally {
      if (vv0) Object.defineProperty(window, 'visualViewport', { value: vv0, configurable: true });
      if (FM.textEdit.isActive()) FM.textEdit.stop();
      FM.scene.layers.length = 0;
      layers0.forEach(l => FM.scene.layers.push(l));
      FM.selectLayer(sel0);
      FM.refreshAll();
    }
  });

  test('keyframes: inert outlines until you open the editor that owns them', { item: 'kf-idle-live' }, function () {
    // v5.42, from Ezra's Alight Motion screenshots. Tapping a layer shows every keyframe but arms
    // none of them — "they're clearly showing you where they are but you can't move them yet or hover
    // over them or anything at all". Opening a property's editor arms just that property's keyframes;
    // the rest stay outlines. Selecting a clip used to arm every diamond on the layer.
    const layers0 = FM.scene.layers.slice(), sel0 = FM.scene.selectedId, t0 = FM.time;
    const L = FM.makeLayer('shape', { shape: 'rect', name: 'kf', x: 100, y: 100, shapeW: 60, shapeH: 60, fill: '#fff' });
    try {
      // Two DIFFERENT properties animated, so "only the open editor's keyframes" is actually testable.
      L.transform.x = { kf: [{ t: 0, v: 100 }, { t: 1, v: 300 }] };
      L.transform.opacity = { kf: [{ t: 0, v: 1 }, { t: 2, v: 0 }] };
      FM.scene.layers.length = 0; FM.scene.layers.push(L);
      FM.selectLayer(L.id);

      const dots = () => Array.prototype.slice.call(document.querySelectorAll('#tl-tracks .kf-dot'));
      const cls = c => dots().filter(d => d.classList.contains(c));

      // 1) Nothing focused — the state right after tapping the layer.
      FM.inspector.openCategory('home');
      FM.timeline.rebuild();
      const all = dots();
      if (all.length < 4) throw new Error('expected 4 keyframe diamonds, found ' + all.length + ' — this test would be checking nothing');
      if (cls('kf-live').length) throw new Error(cls('kf-live').length + ' keyframes are live with no property editor open — selecting a clip should arm none of them');
      if (cls('kf-idle').length !== all.length) throw new Error('only ' + cls('kf-idle').length + ' of ' + all.length + ' keyframes are outlines');
      const idleStyle = getComputedStyle(all[0]);
      if (idleStyle.pointerEvents !== 'none') throw new Error('an idle keyframe still takes pointer events (' + idleStyle.pointerEvents + ') — it can be grabbed when it should be inert');
      if (idleStyle.backgroundImage === 'none' && idleStyle.backgroundColor !== 'rgba(0, 0, 0, 0)') {
        throw new Error('an idle keyframe is still a filled diamond (' + idleStyle.backgroundColor + ') rather than an outline');
      }
      if (parseFloat(idleStyle.borderTopWidth) < 1) throw new Error('an idle keyframe has no outline to read (border ' + idleStyle.borderTopWidth + ')');

      // 2) Move & Transform, Move mode — x is armed, opacity is not.
      FM.inspector.openCategory('transform');
      FM._mtMode = 'move';
      FM.timeline.rebuild();
      const live = cls('kf-live'), idle = cls('kf-idle');
      if (live.length !== 2) throw new Error('expected the 2 position keyframes to be live in Move mode, got ' + live.length);
      if (idle.length !== 2) throw new Error('expected the 2 opacity keyframes to stay outlines, got ' + idle.length);
      if (getComputedStyle(live[0]).pointerEvents === 'none') throw new Error('a live keyframe is not interactive — you could not drag the very thing you opened the editor for');

      // 3) The live keyframe under the playhead lights up.
      FM.time = 0;
      FM.timeline.updatePlayhead();
      const here = dots().filter(d => d.classList.contains('kf-here'));
      if (!here.length) throw new Error('no live keyframe lit at the playhead (t=0, where a position keyframe sits)');
      if (here.some(d => d.classList.contains('kf-idle'))) throw new Error('an idle keyframe lit up at the playhead — only the armed ones should');
      FM.time = 1.5;
      FM.timeline.updatePlayhead();
      if (dots().filter(d => d.classList.contains('kf-here')).length) throw new Error('a keyframe is still lit with the playhead nowhere near one');
    } finally {
      FM.time = t0;
      FM.scene.layers.length = 0;
      layers0.forEach(l => FM.scene.layers.push(l));
      FM.selectLayer(sel0);
      FM.inspector.openCategory('home');
      FM.timeline.rebuild();
    }
  });

  test('move & transform: tapping Z turns the pad into a depth slider', { item: 'mt-z-pad' }, function () {
    // v5.43. Ezra, from an AM screenshot: "it's showing what the z position editing looks like and I
    // would like you to add z position editing as well… you just tap on z and then it switches to
    // this version." A sub-mode of the move pad, not a fifth button on the mode rail.
    const layers0 = FM.scene.layers.slice(), sel0 = FM.scene.selectedId;
    const L = FM.makeLayer('shape', { shape: 'rect', name: 'z', x: 200, y: 200, shapeW: 80, shapeH: 80, fill: '#fff' });
    try {
      FM.scene.layers.length = 0; FM.scene.layers.push(L);
      FM.selectLayer(L.id);
      FM.inspector.openCategory('transform');
      FM._mtMode = 'move';
      FM.inspector.refresh();

      const chips = () => Array.prototype.slice.call(document.querySelectorAll('.mt-vbox-axis'));
      const chip = name => chips().find(c => (c.textContent || '').trim() === name);
      if (chips().length !== 3) throw new Error('expected X, Y and Z to be tappable axis chips, found ' + chips().length);
      if (!chip('Z')) throw new Error('no Z chip: ' + chips().map(c => c.textContent).join(','));
      if (!chip('X').classList.contains('on')) throw new Error('Move mode should start on the X/Y pad');
      if (document.querySelector('.mt-zpad')) throw new Error('the Z pad is showing before Z was tapped');
      if (!document.querySelector('.mt-trackpad')) throw new Error('no move pad at all');

      // Tap Z.
      chip('Z').click();
      const zpad = document.querySelector('.mt-zpad');
      if (!zpad) throw new Error('tapping Z did not switch the pad');
      if (document.querySelectorAll('.mt-trackpad').length !== 1) throw new Error('the X/Y pad is still there alongside the Z pad');
      if (!chip('Z').classList.contains('on')) throw new Error('the Z chip does not read as the active axis');
      if (chip('X').classList.contains('on')) throw new Error('X still reads as active while the pad is editing Z');
      const hint = zpad.querySelector('.mt-trackpad-hint');
      if (!hint || !/Z position/i.test(hint.textContent)) throw new Error('the Z pad does not say what it does: "' + (hint && hint.textContent) + '"');
      if (zpad.querySelectorAll('.mt-zpad-arrow').length !== 2) throw new Error('the Z pad has no up/down affordance');

      // Drag it. DOWN pushes the layer away, so z grows — the pad drags the object, not the number.
      const z0 = FM.evalProp(L.transform.z, FM.time) || 0;
      const ev = (type, y, buttons) => zpad.dispatchEvent(new PointerEvent(type, { bubbles: true, cancelable: true, pointerId: 1, isPrimary: true, pointerType: 'mouse', clientX: 100, clientY: y, buttons: buttons == null ? 1 : buttons }));
      ev('pointerdown', 100); ev('pointermove', 160); ev('pointerup', 160, 0);
      const zDown = FM.evalProp(L.transform.z, FM.time) || 0;
      if (!(zDown > z0)) throw new Error('swiping DOWN on the Z pad did not push the layer away (z ' + z0 + ' → ' + zDown + ')');
      ev('pointerdown', 160); ev('pointermove', 60); ev('pointerup', 60, 0);
      const zUp = FM.evalProp(L.transform.z, FM.time) || 0;
      if (!(zUp < zDown)) throw new Error('swiping UP did not bring the layer back toward the camera (z ' + zDown + ' → ' + zUp + ')');

      // …and back.
      chip('X').click();
      if (document.querySelector('.mt-zpad')) throw new Error('tapping X did not return the pad to X/Y');
      if (!document.querySelector('.mt-trackpad')) throw new Error('the X/Y pad did not come back');

      // Leaving Move & Transform must not strand the pad in Z mode. Switch BACK to Z first — checking
      // this from the X/Y state would pass whether or not anything resets.
      chip('Z').click();
      if (!document.querySelector('.mt-zpad')) throw new Error('could not get back into Z mode to test the reset');
      FM.inspector.openCategory('home');
      FM.inspector.openCategory('transform');
      FM._mtMode = 'move'; FM.inspector.refresh();
      if (document.querySelector('.mt-zpad')) throw new Error('the pad is still in Z mode after leaving and re-entering Move & Transform');
    } finally {
      FM._mtAxis = 'xy';
      FM.scene.layers.length = 0;
      layers0.forEach(l => FM.scene.layers.push(l));
      FM.selectLayer(sel0);
      FM.inspector.openCategory('home');
    }
  });

  test('edit points: a dragged point snaps to the other points', { item: 'point-snap' }, function () {
    // v5.44. Ezra: "the shape editor point editor thing doesn't have grid snapping to the other
    // points." Snapped in the shape's OWN local units, so lining two points up means they share an
    // edge of the geometry — and keeps meaning that when the layer is rotated.
    if (!FM.pointEdit || !FM.pointEdit.start) throw new Error('FM.pointEdit missing');
    const scene = FM.scene, sel0 = scene.selectedId, wasActive = FM.pointEdit.isActive();
    let added = null;
    try {
      added = FM.makeLayer('shape', { shape: 'rect', x: (scene.project.width / 2) | 0, y: (scene.project.height / 2) | 0, shapeW: 600, shapeH: 600, fill: '#ffd24a' });
      scene.layers.unshift(added);
      FM.selectLayer(added.id);
      FM.pointEdit.start(added.id);
      const pts = added.subs ? added.subs[0] : added.points;
      if (!pts || pts.length < 4) throw new Error('the rect did not convert to an editable path (' + (pts && pts.length) + ' points)');

      const ov = document.getElementById('pe-overlay');
      const cv = document.getElementById('preview');
      if (!ov || !cv) throw new Error('no point-edit overlay / preview');
      const r = cv.getBoundingClientRect();
      if (!(r.width > 0)) throw new Error('the preview has no size to aim at');
      // local (u,v) → client px. Anchor is centred and the layer is unrotated, so this is the plain
      // inverse of toCanvas; anything cleverer would just be re-implementing the module under test.
      const client = (u, v) => ({
        x: r.left + ((added.transform.x + (u - 0.5) * added.shapeW) / scene.project.width) * r.width,
        y: r.top + ((added.transform.y + (v - 0.5) * added.shapeH) / scene.project.height) * r.height,
      });
      const send = (type, c, buttons) => ov.dispatchEvent(new PointerEvent(type, {
        bubbles: true, cancelable: true, pointerId: 1, isPrimary: true, pointerType: 'mouse',
        clientX: c.x, clientY: c.y, buttons: buttons == null ? 1 : buttons }));

      // Grab point 0 and drop it a hair off point 1's u — close enough to catch, far enough that an
      // un-snapped drag would land somewhere else.
      const p0 = pts[0].slice(), p1 = pts[1];
      const nudge = 0.004;   // ~2.4px on a 600px shape: inside the 7px catch, outside float noise
      send('pointerdown', client(p0[0], p0[1]));
      send('pointermove', client(p1[0] + nudge, p0[1] + 0.25));
      const caughtU = pts[0][0];
      send('pointerup', client(p1[0] + nudge, p0[1] + 0.25), 0);
      if (Math.abs(caughtU - p1[0]) > 1e-6) {
        throw new Error('the dragged point landed at u=' + caughtU.toFixed(4) + ' instead of snapping to the neighbouring point at u=' + p1[0].toFixed(4));
      }

      // …and it must NOT snap when it is nowhere near. Otherwise the check above would pass on a
      // control that snapped everything to everything.
      const far = 0.5 * (p1[0] + p0[0]) + 0.31;
      send('pointerdown', client(pts[0][0], pts[0][1]));
      send('pointermove', client(far, 0.5));
      const freeU = pts[0][0];
      send('pointerup', client(far, 0.5), 0);
      const others = pts.slice(1).map(q => q[0]);
      if (others.some(u => Math.abs(u - freeU) < 1e-6)) {
        throw new Error('a point dragged far from anything still snapped to u=' + freeU.toFixed(4) + ' — the threshold is not being applied');
      }
    } finally {
      if (FM.pointEdit.isActive() && !wasActive) FM.pointEdit.stop();
      if (added) { const i = scene.layers.indexOf(added); if (i >= 0) scene.layers.splice(i, 1); }
      FM.selectLayer(sel0);
      FM.refreshAll();
    }
  });

  test('text: the wrap handles sit beside the text, never on it', { item: 'wrap-handle-clearance' }, function () {
    // v5.45. Ezra: "Edit text menu is broken." Nothing was thrown and every control worked — what was
    // broken was the PICTURE. The v5.40 wrap handles were a fixed 26px tall sitting ON the border, so
    // on a one-line caption they were taller than the box and clamped over the first and last glyph,
    // and their 14px touch pads then swallowed taps meant for the letters. They were also drawn
    // inside the focused text editor, on top of the very text being typed.
    const box = document.getElementById('select-box');
    if (!box) throw new Error('#select-box missing');
    const h = box.querySelector('.sb-w');
    if (!h) throw new Error('no west wrap handle');
    const layers0 = FM.scene.layers.slice(), sel0 = FM.scene.selectedId;
    const hadEditing = document.body.classList.contains('text-editing');
    try {
      const L = FM.makeLayer('text', { name: 'clr', text: 'Hi', x: FM.scene.project.width / 2, y: FM.scene.project.height / 2, fontSize: 60 });
      FM.scene.layers.length = 0; FM.scene.layers.push(L);
      FM.selectLayer(L.id);
      FM.refreshAll();
      if (FM.canvasEdit) FM.canvasEdit.update();
      document.body.classList.remove('text-editing');

      const br = box.getBoundingClientRect(), hr = h.getBoundingClientRect();
      if (!(br.width > 0 && hr.width > 0)) throw new Error('nothing to measure (box ' + Math.round(br.width) + ', handle ' + Math.round(hr.width) + ')');
      // BESIDE, with real clearance — not merely "does not overlap". Ending exactly on the border still
      // puts the bar over the first glyph's edge and its touch pad well across it, which is the state
      // that looked broken; a few px of gap is what makes it read as a handle on the border.
      const CLEAR = 3;
      if (hr.right > br.left - CLEAR) {
        throw new Error('the west wrap handle ends ' + Math.round(br.left - hr.right) + 'px from the text box (want ' + CLEAR + 'px clear) — it sits on the glyphs instead of beside them');
      }
      // …and never taller than the thing it is a handle for.
      if (hr.height > br.height + 0.5) {
        throw new Error('the wrap handle is ' + Math.round(hr.height) + 'px tall on a ' + Math.round(br.height) + 'px box — it reads as a clamp, not a handle');
      }

      // Inside the focused text editor they have no job and must be gone.
      document.body.classList.add('text-editing');
      if (getComputedStyle(h).display !== 'none') {
        throw new Error('the wrap handles still draw inside the text editor, on top of the text being typed');
      }
    } finally {
      document.body.classList.toggle('text-editing', hadEditing);
      FM.scene.layers.length = 0;
      layers0.forEach(l => FM.scene.layers.push(l));
      FM.selectLayer(sel0);
      FM.refreshAll();
    }
  });

  test('add menu: the tab row fills, and every tab is the same height', { item: 'add-tabs-even' }, function () {
    // v5.46. Ezra: "I want the top row of all the addable stuff to take up the whole row neatly, also
    // I want every tab in the add section on mobile to be the same height, currently some are lower
    // than others and it makes going between them all feel jumpy and shit." Measured before the fix:
    // the row overflowed by 4px (5 fixed 66px tabs + gaps = 358 in a 354px row) and the sheet ran
    // 209px on Media/Audio/Template against 356px on Shape — 147px of movement per tab change.
    //
    // The phone sheet only exists below the mobile breakpoint, and this suite runs wide, so the real
    // class structure is built at a fixed width and measured. That is still the shipped CSS doing the
    // layout — only the viewport is staged.
    const host = document.createElement('div');
    host.style.cssText = 'position:absolute;left:-10000px;top:0;width:354px;';
    const mk = (cls, html) => { const n = document.createElement('div'); n.className = cls; if (html) n.innerHTML = html; return n; };
    const build = cardCount => {
      const root = mk('addmenu addmenu--sheet');
      const main = mk('addmenu-main');
      const tabs = mk('addmenu-tabs');
      ['Elements', 'Shape', 'Media', 'Audio', 'Template'].forEach(l => {
        const b = document.createElement('button');
        b.className = 'addmenu-tab';
        b.innerHTML = '<span class="addmenu-ic"></span><span class="addmenu-lbl">' + l + '</span>';
        tabs.appendChild(b);
      });
      const body = mk('addmenu-body');
      const grid = mk('addmenu-grid');
      for (let i = 0; i < cardCount; i++) grid.appendChild(mk('addmenu-card', '<span class="addmenu-ic"></span><span class="addmenu-lbl">x</span>'));
      body.appendChild(grid);
      main.appendChild(tabs); main.appendChild(body);
      root.appendChild(main);
      return { root, tabs, body };
    };
    try {
      document.body.appendChild(host);
      // One card (the Audio tab's shape) against twenty (the Shape catalogue's shape).
      const thin = build(1), fat = build(20);
      host.appendChild(thin.root); host.appendChild(fat.root);

      const rowW = thin.tabs.getBoundingClientRect().width;
      const tabEls = Array.prototype.slice.call(thin.tabs.querySelectorAll('.addmenu-tab'));
      if (tabEls.length !== 5) throw new Error('expected 5 tabs, built ' + tabEls.length);
      if (thin.tabs.scrollWidth > Math.round(rowW) + 1) {
        throw new Error('the tab row overflows: ' + thin.tabs.scrollWidth + 'px of tabs in a ' + Math.round(rowW) + 'px row — it scrolls instead of sitting flush');
      }
      const sum = tabEls.reduce((a, t) => a + t.getBoundingClientRect().width, 0);
      const gaps = parseFloat(getComputedStyle(thin.tabs).columnGap || 0) * (tabEls.length - 1);
      if (Math.abs((sum + gaps) - rowW) > 2) {
        throw new Error('the tabs fill ' + Math.round(sum + gaps) + ' of ' + Math.round(rowW) + 'px — the row is not neatly full');
      }
      // …and they are equal to each other, not merely adding up.
      const widths = tabEls.map(t => t.getBoundingClientRect().width);
      if (Math.max.apply(null, widths) - Math.min.apply(null, widths) > 1.5) {
        throw new Error('the tabs are uneven: ' + widths.map(Math.round).join(', '));
      }

      const hThin = thin.body.getBoundingClientRect().height;
      const hFat = fat.body.getBoundingClientRect().height;
      if (!(hThin > 20)) throw new Error('the sheet body collapsed to ' + Math.round(hThin) + 'px — this is the failure mode of the three earlier attempts');
      if (Math.abs(hThin - hFat) > 1) {
        throw new Error('a 1-card tab is ' + Math.round(hThin) + 'px and a 20-card tab is ' + Math.round(hFat) + 'px — the sheet still jumps by ' + Math.round(Math.abs(hThin - hFat)) + 'px between tabs');
      }
      // The tall one must SCROLL rather than grow, or "equal height" would just be clipping content.
      if (fat.body.scrollHeight <= hFat + 1) throw new Error('the 20-card tab did not overflow at all — the test is not exercising the scrolling case');
      if (!/auto|scroll/.test(getComputedStyle(fat.body).overflowY)) {
        throw new Error('the sheet body does not scroll (overflow-y: ' + getComputedStyle(fat.body).overflowY + ') — content past the fold would be unreachable');
      }
    } finally {
      if (host.parentElement) host.parentElement.removeChild(host);
    }
  });

  test('easing: every parameterised preset lands exactly on its keyframes', { item: 'ease-families' }, function () {
    // v5.47. The families Ezra asked for (bezier / bounce / steps, each with its own presets and its
    // own grab points). The one invariant that matters more than any shape: an easing must return
    // EXACTLY 0 at the start and EXACTLY 1 at the end, at every corner of its parameter range. Miss it
    // and the layer jumps off its own keyframe — which is precisely what elastic did at high
    // amplitude on the first pass (1.002 instead of 1), and what the period rescale could have
    // reintroduced. Swept, not spot-checked.
    if (!FM.EASE_FAMILIES || !FM.easeApply) throw new Error('the easing families never loaded');
    const RANGES = { n: [1, 2, 8, 12], d: [0.15, 1.5, 3], a: [0, 0.05, 1, 2], p: [1, 3, 8], c: [1, 8], j: [2, 32], seed: [0, 99], w: [0, 1] };
    let checked = 0;
    FM.EASE_FAMILIES.forEach(F => {
      if (F.bez) return;
      F.presets.forEach(P => {
        const keys = Object.keys(P.defaults);
        let combos = [{}];
        keys.forEach(k => {
          const vals = RANGES[k] || [P.defaults[k]];
          const next = [];
          combos.forEach(c => vals.forEach(v => { const d = Object.assign({}, c); d[k] = v; next.push(d); }));
          combos = next;
        });
        combos.forEach(c => {
          const prm = Object.assign({}, P.defaults, c);
          const y0 = P.fn(0, prm), y1 = P.fn(1, prm);
          if (Math.abs(y0) > 1e-9) throw new Error(F.key + '/' + P.key + ' starts at ' + y0 + ' not 0 with ' + JSON.stringify(prm) + ' — the layer jumps at the first keyframe');
          if (Math.abs(y1 - 1) > 1e-9) throw new Error(F.key + '/' + P.key + ' ends at ' + y1 + ' not 1 with ' + JSON.stringify(prm) + ' — the layer overshoots its last keyframe');
          for (let s = 0; s <= 40; s++) { const y = P.fn(s / 40, prm); if (!Number.isFinite(y)) throw new Error(F.key + '/' + P.key + ' is ' + y + ' at t=' + (s / 40) + ' with ' + JSON.stringify(prm)); }
          checked++;
        });
        // Every declared grab point must sit somewhere real, or the editor draws a handle at NaN.
        (P.points || []).forEach(pt => {
          const at = pt.at(P.defaults);
          if (!at || !Number.isFinite(at.x) || !Number.isFinite(at.y)) throw new Error(F.key + '/' + P.key + ' point "' + pt.key + '" sits at ' + JSON.stringify(at));
          const np = pt.drag(P.defaults, 0.5, 0.5);
          if (!np || typeof np !== 'object') throw new Error(F.key + '/' + P.key + ' point "' + pt.key + '" returned ' + np + ' from a drag');
          if (!Number.isFinite(P.fn(0.5, Object.assign({}, P.defaults, np)))) throw new Error(F.key + '/' + P.key + ' point "' + pt.key + '" dragged the curve to a non-finite value');
        });
      });
    });
    if (checked < 40) throw new Error('only ' + checked + ' parameter combinations swept — the sweep is not covering the ranges');

    // Backwards compatibility, which is the other half of shipping a new keyframe field.
    if (FM.easeApply(null, 0.5) !== null) throw new Error('an absent ez should resolve to null so evalProp falls through to the old chain');
    if (FM.easeApply({ fam: 'nope', preset: 'nope' }, 0.5) !== null) throw new Error('an unknown family still resolves — an older project or a hostile import could produce a broken curve');
    // …and a keyframe from before this existed must behave EXACTLY as it used to.
    const oldStyle = { kf: [{ t: 0, v: 0 }, { t: 1, v: 100, e: 'bounce' }] };
    const wantOld = 0 + (100 - 0) * FM.EASES.bounce(0.5);
    if (Math.abs(FM.evalProp(oldStyle, 0.5) - wantOld) > 1e-9) throw new Error('a pre-existing e:"bounce" keyframe changed meaning: ' + FM.evalProp(oldStyle, 0.5) + ' vs ' + wantOld);

    // …and a new one actually routes through the family maths, not the old chain.
    const P0 = FM.easePreset('steps', 'steps');
    const neu = { kf: [{ t: 0, v: 0 }, { t: 1, v: 100, e: 'easeInOut', ez: { fam: 'steps', preset: 'steps', p: { n: 4 } } }] };
    const wantNew = 100 * P0.fn(0.5, { n: 4 });
    if (Math.abs(FM.evalProp(neu, 0.5) - wantNew) > 1e-9) throw new Error('evalProp ignored ez: got ' + FM.evalProp(neu, 0.5) + ', the steps preset says ' + wantNew);
    if (Math.abs(FM.evalProp(neu, 0) - 0) > 1e-9 || Math.abs(FM.evalProp(neu, 1) - 100) > 1e-9) throw new Error('a parameterised keyframe does not land on its own values');
  });

  test('shell: the page reaches the screen edges, and nothing hides under the system UI', { item: 'safe-area-cover' }, function () {
    // v5.49. Ezra: "at the very top of the screen there's a cut off, and I feel it looks very ugly,
    // the design should just flow to the very top seamlessly." Cause: the viewport meta had no
    // viewport-fit=cover, so iOS letterboxes a standalone web app BELOW the status bar and paints that
    // strip with the page background — the flat black band with a hard seam. The rest of the app was
    // already written for cover mode (a dozen rules consume the bottom inset), so those env() values
    // were resolving to 0 and doing nothing.
    //
    // A real safe-area inset cannot be produced in a headless browser, so this asserts the two things
    // that CAUSE the seam rather than the seam itself: cover mode is on, and every element pinned to
    // an edge of the screen consumes the inset on that edge. Both are exactly what regressed.
    const mv = document.querySelector('meta[name="viewport"]');
    if (!mv) throw new Error('no viewport meta');
    if (!/viewport-fit\s*=\s*cover/.test(mv.content)) {
      throw new Error('the viewport meta has no viewport-fit=cover ("' + mv.content + '") — iOS will letterbox the app below the status bar and fill the strip with the page background');
    }

    // Walk the stylesheet for the rules that pin something to the top or bottom of the SCREEN, and
    // insist each one pays the matching inset. Reading the CSS text, because these are declarations
    // that resolve to 0 here — a computed-style check would pass no matter what.
    const want = [
      { sel: '.hm-top', edge: 'top' },          // home header — the wordmark would sit under the clock
      { sel: '#topbar-m', edge: 'top' },        // editor top bar
      { sel: '#add-fab', edge: 'bottom' },      // the + orb, over the home indicator
      { sel: '#add-sheet', edge: 'bottom' },    // the add sheet's last row
    ];
    let css = '';
    for (const sheet of document.styleSheets) {
      let rules; try { rules = sheet.cssRules; } catch (e) { continue; }   // cross-origin sheets throw
      if (!rules) continue;
      const walk = rs => { for (const r of rs) { if (r.cssText) css += r.cssText + '\n'; if (r.cssRules) walk(r.cssRules); } };
      walk(rules);
    }
    if (css.length < 5000) throw new Error('only ' + css.length + ' chars of CSS were readable — this test would pass without checking anything');
    // Split into rule blocks rather than regexing across the whole sheet — a greedy prefix walks past
    // closing braces and silently reads the WRONG block, which is how the first version of this
    // reported #topbar-m as missing an inset it has had all along.
    const blocks = css.split('}').map(b => { const i = b.lastIndexOf('{'); return i < 0 ? null : { sel: b.slice(0, i), body: b.slice(i + 1) }; }).filter(Boolean);
    want.forEach(w => {
      const hit = blocks.some(b => b.sel.indexOf(w.sel) >= 0 && b.body.indexOf('safe-area-inset-' + w.edge) >= 0);
      if (!hit) throw new Error(w.sel + ' is pinned to the ' + w.edge + ' of the screen but never consumes env(safe-area-inset-' + w.edge + ') — under viewport-fit=cover its content sits under the system UI');
    });
  });

  test('home: both backdrop layers actually drift', { item: 'backdrop-motion' }, function () {
    // v5.49. Ezra: "the background design needs more animation, currently it's a bit stiff." It was
    // stiff for two reasons and only one was speed: just ONE of the two gradient layers was animated
    // at all, and the OTHER had its drift silently replaced — #home-screen.hm-intro::before is more
    // specific than the plain ::before rule and listed only the bloom, and .hm-intro stays on the
    // element, so that layer sat frozen on its first keyframe forever. Its ::after sibling chained
    // both animations, which is why the bug was invisible.
    const el = document.getElementById('home-screen');
    if (!el) throw new Error('#home-screen missing');
    const named = which => {
      const a = getComputedStyle(el, which).animationName || '';
      const d = (getComputedStyle(el, which).animationDuration || '').split(',').map(s => parseFloat(s));
      return { names: a.split(',').map(s => s.trim()), secs: d };
    };
    ['::before', '::after'].forEach(w => {
      const g = named(w);
      const drift = g.names.findIndex(n => /drift/.test(n));
      if (drift < 0) throw new Error('#home-screen' + w + ' has no drift animation (has: ' + g.names.join(', ') + ') — that layer is a still image');
      const secs = g.secs[drift];
      if (!(secs > 0 && secs <= 30)) throw new Error('#home-screen' + w + ' drifts over ' + secs + 's — too slow to read as movement');
    });
    // The two must not share a period, or they slide as one flat sheet instead of rearranging.
    const a = named('::before'), b = named('::after');
    const sa = a.secs[a.names.findIndex(n => /drift/.test(n))], sb = b.secs[b.names.findIndex(n => /drift/.test(n))];
    if (Math.abs(sa - sb) < 1) throw new Error('both backdrop layers drift on the same ' + sa + 's period — they travel together and read as one sheet');
  });

  test('effects: an OPEN effect row can still be dragged to reorder', { item: 'fx-reorder-open' }, async function () {
    // v5.52. Ezra: "dragging and layering effects is broken." Reordering worked on a COLLAPSED row and
    // silently did nothing on an open one — beginReorder bailed out on fx._expanded and the grip was
    // not even drawn. Since the stack is an accordion (opening one closes the rest), the effect you
    // had just tapped to look at was precisely the one you could not move, with no feedback.
    const layers0 = FM.scene.layers.slice(), sel0 = FM.scene.selectedId;
    const sleep = ms => new Promise(r => setTimeout(r, ms));
    try {
      const L = FM.makeLayer('shape', { shape: 'rect', name: 'ord', x: 200, y: 200, shapeW: 120, shapeH: 120, fill: '#f80' });
      L.effects = [];
      ['blur', 'vignette', 'glow'].forEach(t => { const fx = FM.fxRegistry.makeInstance(t); if (fx) { fx._expanded = false; L.effects.push(fx); } });
      if (L.effects.length !== 3) throw new Error('needed 3 effects, built ' + L.effects.length);
      FM.scene.layers.length = 0; FM.scene.layers.push(L);
      FM.selectLayer(L.id);
      FM.inspector.openCategory('effects');

      let rows = Array.prototype.slice.call(document.querySelectorAll('.fx-row'));
      if (rows.length !== 3) throw new Error('expected 3 effect rows, found ' + rows.length);
      // Open the first one, the way tapping it does.
      rows[0].querySelector('.fx-head').click();
      await sleep(60);
      rows = Array.prototype.slice.call(document.querySelectorAll('.fx-row'));
      if (!rows[0].classList.contains('fx-open')) throw new Error('the first row did not open');
      if (document.querySelectorAll('.fx-grip').length !== 3) {
        throw new Error('only ' + document.querySelectorAll('.fx-grip').length + ' of 3 rows show a drag grip — an open row looks unmovable');
      }

      const head = rows[0].querySelector('.fx-head');
      const r0 = rows[0].getBoundingClientRect(), rl = rows[rows.length - 1].getBoundingClientRect();
      const ev = (type, y, buttons) => head.dispatchEvent(new PointerEvent(type, {
        bubbles: true, cancelable: true, pointerId: 1, isPrimary: true, pointerType: 'mouse',
        clientX: r0.left + r0.width * 0.4, clientY: y, buttons: buttons == null ? 1 : buttons }));
      const before = L.effects.map(e => e.type).join('>');
      ev('pointerdown', r0.top + 20);
      await sleep(360);                                   // past the 280ms press-hold
      if (!document.querySelector('.fx-dragging')) throw new Error('the press-hold never armed a drag on the open row');
      ev('pointermove', r0.top + 40);
      ev('pointermove', rl.top + rl.height / 2 + 6);
      await sleep(40);
      ev('pointerup', rl.top + rl.height / 2 + 6, 0);
      // The browser fires a click after pointerup on the same element. THAT is what used to slam the
      // accordion shut (Ezra: "if I only have two effects and I try to drag the top one down it just
      // closes the menu") — dropping rebuilds every row, so the per-row "was dragged" flag the toggle
      // checked belonged to a node that no longer existed.
      head.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
      await sleep(80);
      // NOTE: no assertion here about the editor staying open. A synthetic click dispatched on the
      // pre-rebuild node still carries the old row's "was dragged" flag, so it can never reproduce the
      // real browser's post-drop click — an assertion here passed with the fix REMOVED, which makes it
      // worse than no assertion at all. See the v5.56 note in POLISH-LOG.
      const after = L.effects.map(e => e.type).join('>');
      if (after === before) throw new Error('dragging the open row to the end changed nothing (still ' + after + ')');
      if (L.effects[L.effects.length - 1].type !== 'blur') throw new Error('expected blur to land last, got ' + after);
    } finally {
      FM.scene.layers.length = 0;
      layers0.forEach(l => FM.scene.layers.push(l));
      FM.selectLayer(sel0);
      FM.inspector.openCategory('home');
    }
  });

  test('freehand: hand tremor is smoothed out of a stroke', { item: 'freehand-smooth' }, function () {
    // v5.53, and Ezra's FOURTH report on this: "free hand drawing is still fucked… make sure this
    // gets solved and it works fine and looks good."
    //
    // The v5.19 attempt ran Ramer-Douglas-Peucker ALONE, which is the wrong tool used first. RDP is a
    // simplifier: it keeps the points that deviate MOST from a chord and discards the ones lying close
    // to it. Hand tremor IS the deviating points, so RDP preserved the wobble and threw away the
    // smooth parts — which is why raising its epsilon never helped and only started clipping corners
    // off deliberate shapes. Filtering first and simplifying second is the fix.
    //
    // "Shaky" is measured as TOTAL ABSOLUTE TURNING along the path. A smooth arc turns steadily and
    // accumulates about pi; a tremulous line reverses direction constantly and racks up many times
    // that. Measured against a clean version of the SAME arc, so the arc's own curvature cancels out.
    if (!FM._smoothFreehand) throw new Error('FM._smoothFreehand is not exposed');
    const arc = jitter => {
      const out = []; let seed = 12345;
      const rnd = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff - 0.5; };
      for (let i = 0; i <= 120; i++) {
        const t = i / 120;
        out.push([-140 + 280 * t + rnd() * jitter, 120 - Math.sin(t * Math.PI) * 240 + rnd() * jitter]);
      }
      return out;
    };
    const turning = pts => {
      let total = 0, prev = null;
      for (let i = 1; i < pts.length; i++) {
        const a = pts[i - 1], b = pts[i];
        const h = Math.atan2(b[1] - a[1], b[0] - a[0]);
        if (prev !== null) { let d = h - prev; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI; total += Math.abs(d); }
        prev = h;
      }
      return total;
    };
    const clean = FM._smoothFreehand(arc(0));
    const shaky = FM._smoothFreehand(arc(5.5));
    if (clean.length < 3 || shaky.length < 3) throw new Error('the smoother returned ' + clean.length + '/' + shaky.length + ' points — nothing to measure');
    const tc = turning(clean), ts = turning(shaky);
    const excess = ts - tc;
    // RDP alone measured ~65 rad of excess here. Anything in that neighbourhood is a visibly shaky line.
    if (excess > 6) throw new Error('a stroke with hand tremor carries ' + excess.toFixed(1) + ' rad of turning beyond the same arc drawn cleanly (' + ts.toFixed(1) + ' vs ' + tc.toFixed(1) + ') — the wobble is still in the path');
    // …and the smoothing must not have flattened the arc itself into a straight line.
    if (tc < 1.5) throw new Error('a clean arc only turns ' + tc.toFixed(2) + ' rad after smoothing — the curve has been flattened away');
    // Curve flags: the renderer only rounds a point marked [u,v,1]; without them this is a polyline.
    const mid = shaky.slice(1, -1);
    if (!mid.length || !mid.every(p => p[2] === 1)) throw new Error('interior points are not marked smooth, so the stroke renders as straight segments');
    if (shaky[0][2] === 1 || shaky[shaky.length - 1][2] === 1) throw new Error('the end points should stay hard so the stroke starts and stops crisply');
  });

  test('rotate: the degree readout sits dead centre in the dial, at every value', { item: 'dial-read-centre' }, function () {
    // THE bug: .mt-dial-read was a child of .mt-dial, which is position:static, so `inset:0` resolved
    // against #inspector-panel — the number centred on the PANEL and floated ~35px above the ring.
    // Measured, not read: the ring's rect vs the readout's, at four widths of string.
    if (!FM.inspector || !FM.inspector.openCategory) throw new Error('FM.inspector missing');
    var scene = FM.scene, hadSel = scene.selectedId, hadMode = FM._mtMode, added = null;
    try {
      added = FM.makeLayer('shape', { shape: 'rect', x: (scene.project.width / 2) | 0, y: (scene.project.height / 2) | 0, shapeW: 120, shapeH: 120, fill: '#5ac7ed' });
      scene.layers.unshift(added);
      FM.selectLayer(added.id);
      FM._mtMode = 'rotate';
      FM.inspector.openCategory('transform');
      var ring = document.querySelector('.mt-dial-ring');
      if (!ring) throw new Error('no .mt-dial-ring — the rotate dial did not build');
      if (!(ring.getBoundingClientRect().width > 0)) throw new Error('the dial has no laid-out size to measure');
      [0, 90, -45, 180].forEach(function (deg) {
        added.transform.rotation = deg;
        FM._mtMode = 'rotate';
        FM.inspector.refresh();
        var rg = document.querySelector('.mt-dial-ring'), rd = document.querySelector('.mt-dial-read');
        if (!rd) throw new Error('no .mt-dial-read at ' + deg + '°');
        var a = rg.getBoundingClientRect(), b = rd.getBoundingClientRect();
        var dx = (b.left + b.width / 2) - (a.left + a.width / 2);
        var dy = (b.top + b.height / 2) - (a.top + a.height / 2);
        if (Math.abs(dx) > 1.5 || Math.abs(dy) > 1.5) throw new Error('"' + rd.textContent + '" is off the dial centre by ' + dx.toFixed(1) + ',' + dy.toFixed(1) + 'px (ring centre ' + (a.left + a.width / 2).toFixed(1) + ',' + (a.top + a.height / 2).toFixed(1) + ' vs readout ' + (b.left + b.width / 2).toFixed(1) + ',' + (b.top + b.height / 2).toFixed(1) + ')');
        // …and it must hug the string, not span the panel — a full-bleed box can be "centred" by luck.
        if (b.width > a.width) throw new Error('the readout box is ' + b.width.toFixed(0) + 'px wide against a ' + a.width.toFixed(0) + 'px ring — it is centring on something bigger than the dial');
      });
    } finally {
      if (added) { var i = scene.layers.indexOf(added); if (i >= 0) scene.layers.splice(i, 1); }
      FM._mtMode = hadMode;
      FM.selectLayer(hadSel || null);
      try { FM.inspector.openCategory('home'); } catch (e) {}
      if (FM.requestRender) FM.requestRender();
    }
  });

  // Registered LAST on purpose. The preintro-stuck test above races a wall clock — index.html's boot
  // script removes #splash ~5.3s after load — so every test that runs BEFORE it eats into that margin.
  // Adding this one further up turned that test red (measured: 63/64 with it mid-file, 64/64 here).
  test('Speed is disabled on layers with no source to re-time', { item: 'speed-dead-control' }, function () {
    // Queue 38. layer.speed only retimes the SOURCE clock (FM.layerSourceAdvance -> FM.layerLocalTime),
    // and every consumer of that is gated on layer.type === 'video'. A shape/text layer's own keyframes
    // are read at absolute project time, so a speed ramp on one changed nothing on screen — measured:
    // transform.x 0->400 sat at x=100 at t=1 with speed 1 AND with a 0.25x->4x ramp. Images are stills
    // (the compositor draws m.el with no time argument), so they have nothing to retime either. The
    // card now greys out like Volume already does, instead of opening a panel whose slider is inert.
    var savedScene = FM.scene;
    try {
      FM.scene = { project: { width: 320, height: 240, fps: 30, duration: 5, background: '#000' }, layers: [], selectedId: null, selectedIds: [] };
      var shape = FM.makeLayer('shape', { shape: 'rect', name: 'S', x: 50, y: 50, shapeW: 40, shapeH: 40, fill: '#f00' });
      var text = FM.makeLayer('text', { name: 'T', text: 'hi', x: 60, y: 60 });
      var image = FM.makeLayer('image', { name: 'I', x: 60, y: 60 });
      var video = FM.makeLayer('video', { name: 'V', x: 60, y: 60 });
      FM.scene.layers.push(shape, text, image, video);
      FM.media.set(video.id, { kind: 'video', el: document.createElement('video'), width: 640, height: 480, duration: 10 });   // a real picture, so it isn't read as an audio-only clip
      var insp = document.getElementById('inspector');
      var speedCard = function () {
        return [].find.call(insp.querySelectorAll('.cat-card'), function (c) {
          var l = c.querySelector('.cat-label'); return l && l.textContent === 'Speed';
        });
      };
      [shape, text, image].forEach(function (L) {
        FM.selectLayer(L.id);
        var card = speedCard();
        if (!card) throw new Error(L.type + ': the Speed card vanished — it should still be shown, just disabled (AM parity)');
        if (!card.classList.contains('cat-card-disabled')) throw new Error(L.type + ': Speed card class="' + card.className + '" — expected cat-card-disabled, the panel does nothing on this layer');
        card.click();
        if (insp.querySelector('.spd-panel')) throw new Error(L.type + ': clicking the disabled Speed card still opened the Speed panel');
        FM.inspector.openCategory('speed');
        if (insp.querySelector('.spd-panel')) throw new Error(L.type + ': openCategory("speed") opened the panel — the timeline dbl-click / number-key route is still unguarded');
      });
      // …and it must stay fully live where it does work. Video used to park Speed in the quick-action
      // icon strip; since queue 45 it is card 5 there too, exactly as it already was on a shape —
      // which is the point: one layout, and the only difference between layer kinds is which cards
      // are greyed. (The rest of this test is unchanged: the greying rule is what it guards.)
      FM.selectLayer(video.id);
      var vCard = speedCard();
      if (!vCard) throw new Error('video: no Speed card in the grid');
      if (vCard.classList.contains('cat-card-disabled')) throw new Error('video: the Speed card is greyed — speed genuinely retimes video/audio');
      if ([].some.call(insp.querySelectorAll('.qr-btn'), function (b) { return /^Speed/.test(b.title || ''); })) {
        throw new Error('video: Speed is STILL in the quick-action icon strip as well as on a card — it has one home');
      }
      vCard.click();
      if (!insp.querySelector('.spd-panel')) throw new Error('video: the Speed panel did not open');
    } finally {
      FM.media.remove(video && video.id);
      FM.scene = savedScene;
      FM.selectLayer(FM.scene.selectedId || null);
    }
  });

  test('every full-screen browser panel ID is in the styled selector list', { item: 'browser-root-geometry' }, function () {
    // Ezra: "when I press the custom elements button literally nothing happens." #el-browser was
    // missing from the `#fx-browser` selector list in styles.css, so it opened with display:block,
    // visibility:visible, opacity:1 — and a measured rect of 0x247. position:static, no width, no
    // z-index: present, working, and completely invisible.
    //
    // The geometry has always come from the ID. js/elements-browser.js gives its root the class
    // `fxb-root` to borrow the effect browser's look, but that class has NO rules anywhere — which is
    // exactly why this was so easy to miss by reading.
    //
    // Tested by inserting a bare probe element per ID rather than by opening the real panels: the
    // effect browser refuses to open without a selected layer in this harness, so driving it would
    // measure the harness. A probe measures the STYLESHEET, which is where the bug lived.
    var ids = ['fx-browser', 'afx-browser', 'el-browser'];
    ids.forEach(function (id) {
      if (document.getElementById(id)) return;   // the real one is present; it is already covered
      var probe = document.createElement('div');
      probe.id = id;
      document.body.appendChild(probe);
      try {
        var cs = getComputedStyle(probe);
        if (cs.position !== 'fixed') throw new Error('#' + id + ' computes position:' + cs.position + ' — it is not in the browser-panel selector list, so it will lay out as an inline box behind the app');
        if (cs.zIndex === 'auto' || +cs.zIndex < 100) throw new Error('#' + id + ' computes z-index:' + cs.zIndex + ' — it would render under the editor chrome');
      } finally {
        probe.remove();
      }
    });
  });

  /* ---- captions (v43): the feature Ezra called fake. Data + render existed; the EDITOR and the
     timeline did not, so typing on a caption track changed nothing you could see. ---- */

  test('captions: the text editor writes the CUE at the playhead, not the dead layer.text', { item: 'captions' }, function () {
    var saved = FM.scene, savedT = FM.time;
    try {
      FM.scene = scene([]);
      var L = FM.makeLayer('text', { name: 'Caps', x: 160, y: 120, fontSize: 40 });
      L.text = ''; L.duration = 5;
      L.captions = [{ start: 0, end: 2, text: 'one' }, { start: 2, end: 4, text: 'two' }];
      FM.scene.layers.push(L);
      FM.time = 0.5;
      FM.textEdit.start(L.id);
      var ta = document.getElementById('te-input');
      if (!ta) throw new Error('the text editor did not open');
      if (ta.value !== 'one') throw new Error('field showed "' + ta.value + '" — it must load the cue live at the playhead, not layer.text');
      ta.value = 'ONE EDITED';
      ta.dispatchEvent(new Event('input', { bubbles: true }));
      if (L.captions[0].text !== 'ONE EDITED') throw new Error('typing did not reach the cue (cue is still "' + L.captions[0].text + '") — this is the "captions do nothing" bug');
      if (L.text !== '') throw new Error('typing wrote layer.text ("' + L.text + '"), which a caption track never renders');
      // and the render must follow
      var c = offscreen(320, 240); FM.renderScene(c.getContext('2d'), FM.scene, 0.5);
      var d = c.getContext('2d').getImageData(0, 0, 320, 240).data, lit = 0;
      for (var i = 0; i < d.length; i += 4) if (d[i] > 40) lit++;
      if (lit < 50) throw new Error('the edited cue did not draw (bright px ' + lit + ')');
      FM.textEdit.stop();
    } finally { if (FM.textEdit.isActive()) FM.textEdit.stop(); FM.scene = saved; FM.time = savedT; }
  });

  test('captions: cue times are LAYER-LOCAL, so cues travel with the clip', { item: 'captions' }, function () {
    var L = FM.makeLayer('text', { name: 'Caps', x: 160, y: 120, fontSize: 40 });
    L.text = ''; L.start = 0; L.duration = 5;
    L.captions = [{ start: 0.5, end: 1.5, text: 'X' }];
    if (FM.activeCaption(L, 1.0) !== 'X') throw new Error('cue not live at t=1.0 with the clip at 0');
    L.start = 3;   // move the clip 3s later
    if (FM.activeCaption(L, 1.0) !== null) throw new Error('cue still live at t=1.0 after the clip moved — times are being read as absolute');
    if (FM.activeCaption(L, 4.0) !== 'X') throw new Error('cue not live at t=4.0 after the clip moved to 3s');
  });

  test('captions: speech detection finds the bursts and ignores a steady tone', { item: 'captions-vad' }, async function () {
    if (!FM.detectSpeech) throw new Error('FM.detectSpeech missing (js/captions-vad.js not loaded)');
    var RATE = 8000, DUR = 8, n = RATE * DUR, d = new Float32Array(n);
    // deterministic PRNG — a test that uses Math.random cannot be trusted when it goes red
    var seed = 99, rnd = function () { seed |= 0; seed = seed + 0x6D2B79F5 | 0; var t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
    for (var i = 0; i < n; i++) d[i] = (rnd() * 2 - 1) * 0.0008;                       // room tone
    var bursts = [[1.0, 2.4], [4.0, 6.0]], lp = 0;
    bursts.forEach(function (b, bi) {
      var s = Math.round(b[0] * RATE), e = Math.round(b[1] * RATE), atk = Math.round(0.03 * RATE);
      for (var i = s; i < e; i++) {
        var tt = (i - s) / RATE;
        var am = 0.35 + 0.65 * Math.pow(0.5 + 0.5 * Math.sin(2 * Math.PI * 4.3 * tt + bi), 2);
        var env = Math.min(1, (i - s) / atk) * Math.min(1, (e - i) / atk);
        var a = 0.55 + 0.4 * Math.sin(2 * Math.PI * 2.1 * tt + bi * 0.7);
        var white = rnd() * 2 - 1; lp = lp + (1 - a) * (white - lp);
        d[i] += (a > 0.75 ? white : lp * 2.2) * am * env * 0.28;
      }
    });
    // A 220 ms pause INSIDE the second burst — a breath between words. Shorter than minGap (300 ms)
    // so it must NOT split the cue in two, and longer than 2x the 80 ms onset padding, so a split
    // could not be papered back over by the padding merge either.
    for (var z = Math.round(4.8 * RATE); z < Math.round(5.02 * RATE); z++) d[z] = (rnd() * 2 - 1) * 0.0008;
    var r = await FM.detectSpeech({ sampleRate: RATE, data: d });
    if (r.segments.length !== 2) throw new Error('expected 2 speech segments, got ' + r.segments.length + ' — ' + JSON.stringify(r.segments) + ' (a 220ms pause inside a burst must not split it: minGap is 300ms)');
    bursts.forEach(function (b, i) {
      var g = r.segments[i];
      if (Math.abs(g.start - b[0]) > 0.2 || Math.abs(g.end - b[1]) > 0.2)
        throw new Error('segment ' + i + ' is ' + g.start.toFixed(2) + '-' + g.end.toFixed(2) + ', expected ~' + b[0] + '-' + b[1] + ' (200ms tolerance covers the deliberate 80ms pad)');
    });
    // THE SAME CLIP 34 dB QUIETER must still work: the gate adapts to each clip's own noise floor,
    // so a whispered phone recording and a loud interview both caption. A fixed dB gate fails here.
    var quiet = new Float32Array(n);
    for (var q = 0; q < n; q++) quiet[q] = d[q] * 0.02;
    var rq = await FM.detectSpeech({ sampleRate: RATE, data: quiet });
    if (rq.segments.length !== 2) throw new Error('quiet copy of the same clip gave ' + rq.segments.length + ' segments, not 2 — the threshold is not adapting to the clip (enterDb=' + rq.stats.enterDb + ', loudDb=' + rq.stats.loudDb + ')');
    // a steady tone is not speech, at any level — the gate is derived from the clip's own floor
    var tone = new Float32Array(RATE * 6);
    for (var j = 0; j < tone.length; j++) tone[j] = Math.sin(2 * Math.PI * 440 * j / RATE) * 0.3;
    var rt = await FM.detectSpeech({ sampleRate: RATE, data: tone });
    if (rt.segments.length) throw new Error('a steady 440 Hz tone was read as ' + rt.segments.length + ' speech segments');
  });

  test('effects (phone): dragging a row’s grip must not throw the inspector sheet away', { item: 'fx-drag-sheet-dismiss' }, async function () {
    // Ezra: "if I only have two effects and I try to drag the top one down it just closes the menu."
    //
    // This is what actually happens, driven with REAL touch events against the live app on a 390x844
    // phone (CDP, not synthetic): pointerdown lands on .fx-grip and starts a reorder — and it ALSO
    // arms the bottom sheet's swipe-down-to-dismiss, because the sheet is scrolled to the top and the
    // grip is not on its "controls that own vertical drags" exclusion list. On the second pointermove
    // the sheet claims the gesture and calls panel.setPointerCapture(), which RETARGETS every
    // remaining move and the pointerup at the panel. Measured targets: fx-grip → fx-head → panel,
    // panel, panel … panel. The effect row never sees another event, so:
    //   • endReorder() never runs → the drop is silently dropped (order unchanged), and the row is
    //     left mid-drag: measured .fx-dragging still set, style.transform still translateY(8.6px);
    //   • _fxReorderAt is therefore never stamped — the v5.56 400ms "a drag just dropped here" guard
    //     is UNREACHABLE on this path, which is why it never fixed anything;
    //   • past 33% of the sheet's height the drop deselects the layer outright (FM.selectLayer(null)),
    //     and the whole panel goes away. That is the "it just closes the menu".
    // Two effects is not strictly required (5 does it too) — with two, the only row to swap with sits
    // 221px down past the open editor, which is double the sheet's dismiss threshold, so it fires
    // every single time.
    //
    // Here in the suite the events are synthetic, so the capture theft cannot be reproduced (a made-up
    // pointerId makes setPointerCapture throw). What DOES reproduce is the half that runs on
    // window-level listeners: the sheet claiming the drag and dismissing. So that is what is asserted.
    const layers0 = FM.scene.layers.slice(), sel0 = FM.scene.selectedId;
    const insp = document.getElementById('inspector-panel');
    const realMM = window.matchMedia, top0 = insp.style.top, max0 = insp.style.maxHeight;
    const sleep = ms => new Promise(r => setTimeout(r, ms));
    try {
      // Be a phone without resizing the runner's frame: mobile.js asks matchMedia at EVENT time.
      window.matchMedia = function (q) { return /max-width:\s*700px/.test(q) ? { matches: true, media: q } : realMM.call(window, q); };
      const L = FM.makeLayer('shape', { shape: 'rect', name: 'sheet', x: 160, y: 120, shapeW: 120, shapeH: 120, fill: '#4af' });
      L.effects = [];
      ['blur', 'glow'].forEach(t => { const fx = FM.fxRegistry.makeInstance(t); if (fx) L.effects.push(fx); });
      if (L.effects.length !== 2) throw new Error('needed exactly 2 effects, built ' + L.effects.length);
      L.effects[0]._expanded = true;                    // the TOP one is OPEN, exactly as reported
      FM.scene.layers.length = 0; FM.scene.layers.push(L);
      FM.selectLayer(L.id);
      FM.inspector.openCategory('effects');
      FM.inspector.refresh();                           // refresh is where mobile.js syncs the sheet
      await sleep(60);
      if (!insp.classList.contains('open')) throw new Error('the phone sheet never opened — there is nothing to dismiss, so this test would prove nothing');
      insp.scrollTop = 0;                               // at the top is what ARMS swipe-to-dismiss
      const rows = Array.prototype.slice.call(document.querySelectorAll('.fx-row'));
      if (rows.length !== 2) throw new Error('expected 2 effect rows, found ' + rows.length);
      const grip = rows[0].querySelector('.fx-grip');
      if (!grip) throw new Error('the top row has no .fx-grip — nothing to drag by');
      const h = insp.getBoundingClientRect().height, r = grip.getBoundingClientRect();
      const x = r.left + r.width / 2, y0 = r.top + r.height / 2;
      const dy = Math.max(h * 0.45, 130);               // past the sheet's 33%-of-height dismiss point
      const ev = (type, y, buttons) => grip.dispatchEvent(new PointerEvent(type, {
        bubbles: true, cancelable: true, pointerId: 7, isPrimary: true, pointerType: 'touch',
        clientX: x, clientY: y, buttons: buttons == null ? 1 : buttons }));
      ev('pointerdown', y0);
      await sleep(40);
      for (let i = 1; i <= 8; i++) { ev('pointermove', y0 + dy * i / 8); await sleep(16); }
      ev('pointerup', y0 + dy, 0);
      await sleep(80);
      // Both of these were checked with the fix removed and both go red, one after the other.
      // (There is deliberately NO assertion on insp.classList 'open': with a single clip selected the
      // sheet is DOCKED — body.m-editing — and that branch of the dismiss deselects the layer instead
      // of closing the panel, so an 'open' assertion could never fire here. Unfireable assertions are
      // how the v5.56 guard came to be believed in the first place.)
      if (FM.scene.selectedId !== L.id) throw new Error('dragging the effect grip DESELECTED the layer — the sheet ate the drag as a swipe-to-dismiss');
      const left = document.querySelectorAll('.fx-row').length;
      if (left !== 2) throw new Error('the effects list went from 2 rows to ' + left + ' — the menu closed itself mid-drag');
    } finally {
      window.matchMedia = realMM;
      insp.style.transform = ''; insp.style.top = top0; insp.style.maxHeight = max0;
      insp.classList.remove('open');
      document.body.classList.remove('insp-open', 'm-editing');
      const tgl = document.getElementById('insp-toggle'); if (tgl) tgl.classList.remove('on');
      FM.scene.layers.length = 0;
      layers0.forEach(l => FM.scene.layers.push(l));
      FM.selectLayer(sel0);
      FM.inspector.openCategory('home');
    }
  });

  /* ---- Add-Effect thumbnails (queue item 30) ------------------------------------------------
   * Both of these MEASURE the tile: build the exact scene fx-thumbs renders (FM.fxThumbs.
   * previewScene), render it, render it again with the effect stripped out, and diff. Nothing here
   * mounts a tile in the DOM — mount() is async and removing a mounted tile breaks every later
   * mount, which has produced two confident wrong conclusions about this file already. */
  // ONE surface for every tile render: the temporal effects (motion blur, denoise) hold per-plate
  // state, and handing them a fresh canvas each frame resets it — which reads as "the effect does
  // nothing" when in fact it never got a second frame to work from.
  var thumbCv = null, thumbCtx = null;
  function thumbPix(scene, t) {
    if (!thumbCv) { thumbCv = offscreen(96, 96); thumbCtx = thumbCv.getContext('2d', { willReadFrequently: true }); }
    thumbCtx.setTransform(1, 0, 0, 1, 0, 0);
    thumbCtx.clearRect(0, 0, 96, 96);
    FM.renderScene(thumbCtx, scene, t);
    return thumbCtx.getImageData(0, 0, 96, 96).data;
  }
  // mean absolute RGB difference over the tile, and the largest single-pixel difference.
  function thumbDiff(a, b) {
    var sum = 0, n = 0, max = 0;
    for (var i = 0; i < a.length; i += 4) {
      var d = (Math.abs(a[i] - b[i]) + Math.abs(a[i + 1] - b[i + 1]) + Math.abs(a[i + 2] - b[i + 2])) / 3;
      var da = Math.abs(a[i + 3] - b[i + 3]);
      if (da > d) d = da;
      sum += d; n++; if (d > max) max = d;
    }
    return { mean: sum / n, max: max };
  }
  function thumbWithout(scene, type) {   // same scene, that one effect removed
    return {
      project: scene.project,
      layers: scene.layers.map(function (l) {
        var c = Object.assign({}, l);
        if (c.effects) c.effects = c.effects.filter(function (e) { return e.type !== type; });
        return c;
      })
    };
  }

  test('effects browser: each section demonstrates on its own subject', { item: 'fx-thumb-subjects' }, function () {
    // One example subject per section, so a blur shows fine detail, a warp shows straight lines and
    // a matte shows a foreground/background split. Before this, eleven sections shared one landscape.
    var probe = { color: 'brightness', blur: 'blur', distort: 'wave', proc: 'clouds', stylize: 'scanlines',
      drawing: 'edge', move: 'spin', repeat: 'gridrepeat', matte: 'wipe', opacity: 'blink', threed: 'cube3d' };
    var seen = [];
    Object.keys(probe).forEach(function (cat) {
      var type = probe[cat];
      if (!FM.fxRegistry.get(type)) throw new Error('probe effect missing from the registry: ' + type);
      // the SUBJECT, i.e. the tile with its effect taken away — that is what must differ per section
      var px = thumbPix(thumbWithout(FM.fxThumbs.previewScene(type), type), 0);
      seen.forEach(function (s) {
        var d = thumbDiff(px, s.px);
        if (d.mean < 6) throw new Error('sections "' + cat + '" and "' + s.cat + '" draw the same subject (mean diff ' + d.mean.toFixed(2) + ')');
      });
      seen.push({ cat: cat, px: px });
    });
  });

  test('effects browser: no thumbnail is a picture of the subject doing nothing', { item: 'fx-thumb-visible' }, function () {
    // Every one of these measured as indistinguishable from its un-effected subject: either nothing
    // moved (mean < 8/255) or nothing moved far (no pixel past 35/255). Usually a comp-scale pixel
    // length or a threshold the tile never crosses — fixed with a demo-only parameter, never by
    // touching the effect's real default. Floors are ~60% of measured, so a revert goes red.
    var floors = {
      halation: 8, lightglow: 8, softglow: 8, bumpmap: 30, levels: 20, hslbands: 25, faded: 22,
      saturate: 20, contrast: 24, colorbalance: 35, temporaldenoise: 9, roughenedges: 8,
      smoothedges: 9, stretchseg: 15, lumakey: 30, lightwrap: 8, rasterextrude: 8, filmgrain: 14,
      noise: 24, posterize: 24, pixelsort: 11, unsharpmask: 9, tiltshift: 30, zoomstreaks: 8, sharpen: 9,
    };
    var bad = [];
    Object.keys(floors).forEach(function (type) {
      var scene = FM.fxThumbs.previewScene(type), off = thumbWithout(scene, type);
      var ts = [0.2, 0.7, 1.2], on = [], no = [];            // temporal effects need more than one frame,
      ts.forEach(function (t) { no.push(thumbPix(off, t)); });   // and they must be rendered in ascending t
      thumbPix(scene, 0);                                    // warm-up, exactly as generate() does
      ts.forEach(function (t) { on.push(thumbPix(scene, t)); });
      var best = { mean: 0, max: 0 };
      on.forEach(function (px, i) { var d = thumbDiff(px, no[i]); if (d.mean > best.mean) best = d; });
      // mean: did enough of the tile change. max: did anything change FAR — a whole-frame grade can
      // move every pixel by 13/255 and still read as the same picture, which is the original bug.
      if (best.mean < floors[type] || best.max < 36) {
        bad.push(type + ' mean ' + best.mean.toFixed(2) + '/' + floors[type] + ' max ' + best.max);
      }
    });
    if (bad.length) throw new Error('tiles indistinguishable from their subject: ' + bad.join('; '));
  });

  /* ---------------- safe-area insets under viewport-fit=cover (queue 46) ----------------
   * v5.49 added viewport-fit=cover, so every position:fixed overlay now starts at the PHYSICAL top
   * of the screen and has to pay for the status bar itself. #topbar-m, .hm-top, .set-head and .te-bar
   * all do; the Add-Effect browser's headers did not, and its ✕ / magnifier landed level with the
   * clock and the battery — Ezra: "the buttons at the top of the effect menu are unreachable."
   *
   * Headless Chrome has NO safe area, so env(safe-area-inset-*) resolves to 0 and the bug is
   * invisible to a plain measurement. These tests simulate one: they read the SPECIFIED value of the
   * padding straight out of the CSSOM, swap env() for a var() the probe sets to a real iPhone inset,
   * and measure a live clone. Delete the fix and the specified value falls back to the shorthand's
   * 14px, the clone's button lands at y=14 inside a 62px inset, and these go red. */
  var IPHONE_SAT = 62, IPHONE_SAB = 34;   // iPhone 16 Pro Max, 440x956pt (Dynamic Island / home indicator)

  // The specified (not computed) value of one property on the first rule matching `sel`.
  function specified(sel, prop) {
    var sheets = document.styleSheets;
    for (var i = 0; i < sheets.length; i++) {
      var rules; try { rules = sheets[i].cssRules; } catch (e) { continue; }
      if (!rules) continue;
      for (var j = 0; j < rules.length; j++) {
        var r = rules[j];
        if (r.selectorText && r.selectorText.split(',').some(function (s) { return s.trim() === sel; })) {
          var v = r.style.getPropertyValue(prop);
          if (v) return v;
        }
      }
    }
    return '';
  }
  function withFakeInset(v) {
    return String(v).replace(/env\(\s*safe-area-inset-(top|bottom|left|right)\s*(?:,[^()]*)?\)/g, 'var(--tsa-$1, 0px)');
  }
  // A 440px-wide off-screen box carrying an iPhone's insets as custom properties.
  function insetSandbox() {
    var box = document.createElement('div');
    box.style.cssText = 'position:fixed;left:-10000px;top:0;width:440px;height:956px;' +
      '--tsa-top:' + IPHONE_SAT + 'px;--tsa-bottom:' + IPHONE_SAB + 'px;--tsa-left:0px;--tsa-right:0px;';
    document.body.appendChild(box);
    return box;
  }

  test('safe area: the Add-Effect headers clear the status bar (viewport-fit=cover)', { item: 'safe-area-top' }, function () {
    var box = insetSandbox();
    try {
      [['.fxb-top', '#fx-browser .fxb-top'], ['.fxb-catview-top', null]].forEach(function (pair) {
        var sel = pair[0];
        var pt = withFakeInset(specified(sel, 'padding-top'));
        if (!pt) throw new Error(sel + ': no padding-top in the CSSOM at all');
        // live clone of the real header if one exists, else the minimum markup the browser builds
        function build() {
          var src = pair[1] && document.querySelector(pair[1]);
          if (src) return src.cloneNode(true);
          var n = document.createElement('div'); n.className = 'fxb-catview-top';
          var b = document.createElement('button'); b.className = 'fxb-back'; b.textContent = '‹ Back'; n.appendChild(b);
          var t = document.createElement('div'); t.className = 'fxb-catview-title'; t.textContent = 'Blur'; n.appendChild(t);
          return n;
        }
        // Two copies of the SAME header, differing only in the inset the padding resolves against.
        // `notched` is the phone under test; `flat` is the control the fix must not have cost anything.
        var notched = build(), flat = build();
        notched.style.paddingTop = pt; notched.style.setProperty('--tsa-top', IPHONE_SAT + 'px');
        flat.style.paddingTop = pt;    flat.style.setProperty('--tsa-top', '0px');
        box.appendChild(notched); box.appendChild(flat);

        var hb = notched.getBoundingClientRect(), top = box.getBoundingClientRect().top;
        var on = [].slice.call(notched.querySelectorAll('button')).filter(function (b) { var r = b.getBoundingClientRect(); return r.width > 0 && r.height > 0; });
        var off = [].slice.call(flat.querySelectorAll('button'));
        if (!on.length) throw new Error(sel + ': clone has no visible buttons to measure');
        if (hb.height <= flat.getBoundingClientRect().height + 0.5) {
          throw new Error(sel + ': the header did not grow at all under a ' + IPHONE_SAT +
            'px inset (' + Math.round(hb.height) + 'px either way) — padding-top is "' + pt + '", which ignores the inset');
        }
        on.forEach(function (b, i) {
          var r = b.getBoundingClientRect(), base = off[i].getBoundingClientRect();
          var who = sel + ' "' + (b.className || b.textContent) + '"';
          // 1. clear of the status bar…
          if (r.top - top < IPHONE_SAT - 0.5) {
            throw new Error(who + ' sits ' + Math.round(IPHONE_SAT - (r.top - top)) + 'px INSIDE a ' + IPHONE_SAT +
              'px status-bar inset (y=' + Math.round(r.top - top) + ') — unreachable on a notched phone');
          }
          // 2. …and NOT by shrinking or clipping it. A "fits" test that hides what it measures is the
          //    trap this suite fell into once before, so both are asserted alongside the fit itself.
          if (r.bottom > hb.bottom + 0.5 || r.top < hb.top - 0.5) {
            throw new Error(who + ' is not fully inside its header box (btn ' + Math.round(r.top) + '..' + Math.round(r.bottom) +
              ' vs header ' + Math.round(hb.top) + '..' + Math.round(hb.bottom) + ')');
          }
          if (r.height < base.height - 0.5 || r.width < base.width - 0.5) {
            throw new Error(who + ' shrank from ' + Math.round(base.width) + 'x' + Math.round(base.height) + ' to ' +
              Math.round(r.width) + 'x' + Math.round(r.height) + ' under the inset — it must be paid for with padding, not by squashing the control');
          }
        });
        // the two round chrome buttons Ezra could not reach must still be full-size targets
        [].slice.call(notched.querySelectorAll('.fxb-close, .fxb-search-btn')).forEach(function (b) {
          var r = b.getBoundingClientRect();
          if (r.height < 36 || r.width < 36) throw new Error(sel + ' ' + b.className + ' is only ' + Math.round(r.width) + 'x' + Math.round(r.height) + 'px — below its 38px design size');
        });
      });
    } finally { box.remove(); }
  });

  test('safe area: the audio-effect category bar clears the home indicator', { item: 'safe-area-bottom' }, function () {
    // .afxb-catnav is the last child of a fixed inset:0 overlay, so its bottom edge IS the screen's.
    var box = insetSandbox();
    try {
      var pb = withFakeInset(specified('.afxb-catnav', 'padding-bottom'));
      if (!pb) throw new Error('.afxb-catnav: no padding-bottom in the CSSOM at all');
      function bar(inset, bottom) {
        var n = document.createElement('div'); n.className = 'fxb-catnav afxb-catnav';
        ['‹ Dynamics', 'Space ›'].forEach(function (label) {
          var b = document.createElement('button'); b.className = 'fxb-back afxb-catnav-btn'; b.textContent = label; n.appendChild(b);
        });
        n.style.paddingBottom = pb; n.style.setProperty('--tsa-bottom', inset + 'px');
        n.style.position = 'absolute'; n.style.left = '0'; n.style.right = '0'; n.style.bottom = bottom + 'px';
        box.appendChild(n); return n;
      }
      var notched = bar(IPHONE_SAB, 0), flat = bar(0, 400);   // `flat` = the same bar with no inset, parked clear
      var bb = box.getBoundingClientRect(), nb = notched.getBoundingClientRect();
      var safeBottom = bb.bottom - IPHONE_SAB;
      if (nb.height <= flat.getBoundingClientRect().height + 0.5) {
        throw new Error('.afxb-catnav did not grow at all under a ' + IPHONE_SAB + 'px inset (' +
          Math.round(nb.height) + 'px either way) — padding-bottom is "' + pb + '", which ignores the inset');
      }
      var off = [].slice.call(flat.querySelectorAll('button'));
      [].slice.call(notched.querySelectorAll('button')).forEach(function (b, i) {
        var r = b.getBoundingClientRect(), base = off[i].getBoundingClientRect();
        if (r.bottom > safeBottom + 0.5) {
          throw new Error('.afxb-catnav "' + b.textContent + '" ends ' + Math.round(r.bottom - safeBottom) +
            'px inside a ' + IPHONE_SAB + 'px home-indicator band');
        }
        if (r.bottom > nb.bottom + 0.5 || r.top < nb.top - 0.5) throw new Error('.afxb-catnav "' + b.textContent + '" is not fully inside the bar');
        if (r.height < base.height - 0.5 || r.width < base.width - 0.5) {
          throw new Error('.afxb-catnav "' + b.textContent + '" shrank from ' + Math.round(base.width) + 'x' + Math.round(base.height) +
            ' to ' + Math.round(r.width) + 'x' + Math.round(r.height) + ' under the inset');
        }
      });
    } finally { box.remove(); }
  });

  test('parameter rows: tapping a name selects that one property’s keyframes', { item: 'param-row-select' }, function () {
    // The explicit counterpart to v5.42. Ezra, from Alight Motion: "to tell what slider you
    // have selected — hence forth what key frames ur gonna be editing, it shows by making the item ur
    // changing have a different colour on the name of it, you can also tap on the name to select the
    // row." Selection is per-PROPERTY (his screenshot has Offset's X green and its Y not), and it
    // NARROWS the panel-implied focus rather than running beside it.
    var layers0 = FM.scene.layers.slice(), sel0 = FM.scene.selectedId, t0 = FM.time;
    var L = FM.makeLayer('shape', { shape: 'rect', name: 'sel', x: 100, y: 100, shapeW: 60, shapeH: 60, fill: '#fff' });
    try {
      // Distinct keyframe TIMES per property, so "which ones are live" is answerable, not just countable.
      L.transform.x = { kf: [{ t: 0, v: 100 }, { t: 1, v: 300 }] };
      L.transform.y = { kf: [{ t: 0, v: 100 }, { t: 2, v: 300 }] };
      L.transform.scale = { kf: [{ t: 3, v: 1 }, { t: 4, v: 2 }] };   // a second MODE with keyframes, for the stale-selection check
      FM.scene.layers.length = 0; FM.scene.layers.push(L);
      FM.selectLayer(L.id);

      var insp = document.getElementById('inspector');
      var dots = function () { return Array.prototype.slice.call(document.querySelectorAll('#tl-tracks .kf-dot')); };
      var live = function () { return dots().filter(function (d) { return d.classList.contains('kf-live'); }); };
      var times = function (ds) { return ds.map(function (d) { return d.dataset.t; }).sort().join(','); };
      var name = function (sel, txt) {
        return Array.prototype.slice.call(insp.querySelectorAll(sel)).filter(function (n) { return n.textContent.trim() === txt; })[0];
      };

      // --- Move & Transform ---------------------------------------------------------------------
      FM.inspector.openCategory('transform'); FM._mtMode = 'move'; FM._mtAxis = 'xy';
      FM.inspector.refresh(); FM.timeline.rebuild();
      if (live().length !== 4) throw new Error('with nothing selected the whole panel should stay armed — ' + live().length + ' of 4 live');
      if (insp.querySelector('.kf-sel')) throw new Error('a panel opened with a row already selected — opening must not silently freeze the other properties');
      var X = name('.mt-vbox-lab', 'X');
      if (!X) throw new Error('no X name element in Move & Transform');
      if (!X.classList.contains('kf-selectable')) throw new Error('the X name is not offered as a row selector');
      X.click();
      X = name('.mt-vbox-lab', 'X');
      var Y = name('.mt-vbox-lab', 'Y');
      if (!X.classList.contains('kf-sel')) throw new Error('tapping the X name did not select it (classes: ' + X.className + ')');
      if (Y.classList.contains('kf-sel')) throw new Error('Y got selected too — selection must be one property, not the row/control pair');
      if (live().length !== 2) throw new Error('expected only X’s 2 keyframes live after selecting X, got ' + live().length);
      if (times(live()) !== '0,1') throw new Error('the live keyframes are not X’s (want t=0,1; Y sits at 0,2) — got ' + times(live()));
      // it has to LOOK selected, and be big enough to hit, and not spill out of its own box
      var cs = getComputedStyle(X), cu = getComputedStyle(Y);
      if (cs.color === cu.color) throw new Error('the selected name is the same colour as an unselected one (' + cs.color + ')');
      if (cs.backgroundColor === cu.backgroundColor) throw new Error('the selected name has no pill behind it (' + cs.backgroundColor + ')');
      var r = X.getBoundingClientRect(), box = X.closest('.mt-vbox').getBoundingClientRect();
      if (r.height < 20) throw new Error('the tappable name is only ' + r.height.toFixed(1) + 'px tall');
      if (r.left < box.left - 0.5 || r.right > box.right + 0.5 || r.top < box.top - 0.5 || r.bottom > box.bottom + 0.5) {
        throw new Error('the selected name spills outside its value box');
      }
      // ONE source of truth, the load-bearing half: the panel's SCOPE decides, and a selection that
      // is no longer inside it is stale by definition. Switching mode here does NOT go through the
      // mode rail (which clears), so only the scope check can save this — if a stale key were allowed
      // to resolve, Scale's keyframes would be frozen by a row that belongs to Move.
      FM._mtMode = 'scale'; FM.inspector.refresh(); FM.timeline.rebuild();
      if (insp.querySelector('.kf-sel')) throw new Error('a Move selection is still painted as selected in Scale mode');
      if (times(live()) !== '3,4') throw new Error('a stale Move selection is still deciding focus in Scale mode — live keyframes at ' + (times(live()) || 'none') + ', want Scale’s 3,4');
      FM._mtMode = 'move'; FM.inspector.refresh(); FM.timeline.rebuild();
      if (times(live()) !== '0,1') throw new Error('returning to Move did not restore the X row’s focus — got ' + times(live()));

      name('.mt-vbox-lab', 'X').click();
      if (live().length !== 4) throw new Error('tapping the selected name again should deselect it — ' + live().length + ' live, want 4');
      if (insp.querySelector('.kf-sel')) throw new Error('a name is still marked selected after deselecting');

      // --- Effect parameters --------------------------------------------------------------------
      var fx = FM.fxRegistry.makeInstance('dropshadow');
      fx.params.distance = { kf: [{ t: 0, v: 5 }, { t: 1, v: 40 }] };
      fx.params.angle = { kf: [{ t: 0, v: 0 }, { t: 2, v: 300 }] };
      fx._expanded = true;
      L.effects = [fx];
      FM.inspector.openCategory('effects'); FM.inspector.refresh(); FM.timeline.rebuild();
      if (live().length !== 4) throw new Error('an open effect should arm all of its animated params — ' + live().length + ' of 4 live');
      var dist = name('.fx-scrub-label', 'Distance');
      if (!dist) throw new Error('no Distance name element in the effect editor');
      dist.click();
      dist = name('.fx-scrub-label', 'Distance');
      if (!dist.classList.contains('kf-sel')) throw new Error('tapping the Distance name did not select it (classes: ' + dist.className + ')');
      if (name('.fx-scrub-label', 'Angle').classList.contains('kf-sel')) throw new Error('Angle got selected as well');
      if (live().length !== 2) throw new Error('expected only Distance’s 2 keyframes live, got ' + live().length);
      if (times(live()) !== '0,1') throw new Error('the live keyframes are not Distance’s — got ' + times(live()));
      var dr = dist.getBoundingClientRect(), row = dist.closest('.fx-scrub-row').getBoundingClientRect();
      if (dr.height < 20) throw new Error('the tappable effect-param name is only ' + dr.height.toFixed(1) + 'px tall');
      if (dr.top < row.top - 0.5 || dr.bottom > row.bottom + 0.5) throw new Error('the selected effect-param name spills outside its row');

      // --- ONE source of truth: a selection can never outlive the panel that scoped it ------------
      FM.inspector.openCategory('transform'); FM._mtMode = 'move'; FM.inspector.refresh(); FM.timeline.rebuild();
      if (insp.querySelector('.kf-sel')) throw new Error('an effect-param selection is still showing in Move & Transform');
      if (live().length !== 4) throw new Error('Move & Transform did not fall back to whole-panel focus — ' + live().length + ' live');
    } finally {
      FM.time = t0;
      FM.scene.layers.length = 0;
      layers0.forEach(function (l) { FM.scene.layers.push(l); });
      FM.selectLayer(sel0);
      FM.inspector.openCategory('home');
      FM.timeline.rebuild();
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

  /* ---- queue 45 (v5.70) — one options layout for every layer ------------------------------------
     Ezra, with two screenshots: "some layers look like the first image with the button option layout
     and some look like the second image. I want them both to look like the second image, just move
     the audio effects to the effects menu but put a toggle at the top that switches from showing you
     either the normal effects or audio ones, you can just grey it out and make it not selectable if
     a layer has no audio."
     A VIDEO parked Speed and Volume in the icon strip and carried an Audio Effects card; a SHAPE had
     them as cards 5 and 6 (Volume greyed) and no audio card at all. The shape is the target. ---- */

  // A shared fixture: one video layer (with a media record) and one shape, both in the live scene.
  // The playhead is parked INSIDE both clips: outside one, the icon strip's middle three deliberately
  // become the two nudge buttons, and this is a test about the strip's contents.
  function q45Fixture() {
    const vid = FM.makeLayer('video', { name: 'q45 clip', duration: 5 });
    const shp = FM.makeLayer('shape', { shape: 'rect', name: 'q45 box', x: 100, y: 100, shapeW: 60, shapeH: 60, fill: '#3a7bd5' });
    FM.scene.layers.push(vid, shp);
    FM.media.set(vid.id, { kind: 'video', width: 640, height: 360, duration: 5 });
    FM.time = 2;
    return { vid: vid, shp: shp };
  }
  function q45Cards() {
    return Array.prototype.slice.call(document.querySelectorAll('#inspector .cat-card')).map(function (c) {
      const lb = c.querySelector('.cat-label'), nm = c.querySelector('.cat-num');
      return { label: lb ? lb.textContent : '(no label)', num: nm ? nm.textContent : '', off: c.classList.contains('cat-card-disabled'), el: c };
    });
  }
  function q45Restore(saved) {
    FM.scene.layers.length = 0;
    saved.layers.forEach(function (l) { FM.scene.layers.push(l); });
    saved.media.forEach(function (id) { FM.media.remove(id); });
    FM.time = saved.time;
    FM.selectLayer(saved.sel);
    FM.inspector.openCategory('home');
  }
  // A real, decodable WAV as a File — the only honest way to test "this layer HAS an audio track".
  function q45WavFile() {
    const OAC = window.OfflineAudioContext || window.webkitOfflineAudioContext;
    const ctx = new OAC(1, 4410, 44100);
    const buf = ctx.createBuffer(1, 4410, 44100);
    const d = buf.getChannelData(0);
    for (let i = 0; i < 4410; i++) d[i] = Math.sin(i / 8) * 0.4;
    if (ctx.close) { try { ctx.close(); } catch (e) {} }
    return new File([FM.audioBufferToWav(buf)], 'q45-tone.wav', { type: 'audio/wav' });
  }
  // …and a file with nothing decodable in it: a silent screen recording, as far as the probe can tell.
  function q45SilentFile() {
    return new File([new Uint8Array([0, 0, 0, 24, 102, 116, 121, 112, 1, 2, 3, 4, 5, 6, 7, 8])], 'q45-silent.mp4', { type: 'video/mp4' });
  }

  test('layer options: Speed and Volume are CARDS on a video too — the icon strip is just trim/split/trim', { item: 'q45-one-layout' }, function () {
    const saved = { layers: FM.scene.layers.slice(), sel: FM.scene.selectedId, media: [], time: FM.time };
    try {
      const f = q45Fixture(); saved.media.push(f.vid.id);

      FM.selectLayer(f.vid.id); FM.inspector.openCategory('home');
      const vCards = q45Cards();
      const vLabels = vCards.map(function (c) { return c.label; });
      FM.selectLayer(f.shp.id); FM.inspector.openCategory('home');
      const sCards = q45Cards();
      const sLabels = sCards.map(function (c) { return c.label; });

      // The whole ask in one line: the two layer kinds offer the SAME cards in the same order.
      if (vLabels.join(' | ') !== sLabels.join(' | ')) {
        throw new Error('video and shape still show different option cards:\n  video: ' + vLabels.join(' | ') + '\n  shape: ' + sLabels.join(' | '));
      }
      const want = ['Color & Fill', 'Border & Shadow', 'Blending & Opacity', 'Move & Transform', 'Speed', 'Volume', 'Edit Shape', 'Presets', 'Effects'];
      if (vLabels.join(' | ') !== want.join(' | ')) {
        throw new Error('card order is not the target layout:\n  got:  ' + vLabels.join(' | ') + '\n  want: ' + want.join(' | '));
      }
      if (vLabels.indexOf('Audio Effects') >= 0) throw new Error('the Audio Effects card is still in the grid — it moved into the Add Effect browser');
      // Numbered 1..9, and the disabled ones keep their number (visible, dim — never hidden).
      vCards.forEach(function (c, i) { if (c.num !== String(i + 1)) throw new Error('card ' + (i + 1) + ' (' + c.label + ') is badged “' + c.num + '”'); });

      // The disabled treatment is the v5.61 one: present, dim, and it says why when tapped.
      const sVol = sCards[5], sSpd = sCards[4], vVol = vCards[5], vSpd = vCards[4];
      if (!sVol.off) throw new Error('the Volume card on a shape is not greyed (.cat-card-disabled) — a shape has no audio');
      if (!sSpd.off) throw new Error('the Speed card on a shape is not greyed — a shape has no source clock to re-time');
      if (vVol.off) throw new Error('the Volume card is greyed on a VIDEO, which does have audio');
      if (vSpd.off) throw new Error('the Speed card is greyed on a VIDEO, which does have frames to re-time');
      if (Number(getComputedStyle(sVol.el).opacity) > 0.7) throw new Error('.cat-card-disabled no longer dims its card (opacity ' + getComputedStyle(sVol.el).opacity + ') — this check would prove nothing');
      // …and it is still a live button, so the explanation can be shown.
      if (sVol.el.disabled) throw new Error('the greyed Volume card is a disabled <button> — it can never toast the reason');

      // The icon strip: three buttons, the same three a shape gets. Speed and Volume have left it.
      FM.selectLayer(f.vid.id); FM.inspector.openCategory('home');
      const vBtns = Array.prototype.slice.call(document.querySelectorAll('#inspector .quick-row .qr-btn'));
      const vTitles = vBtns.map(function (b) { return b.title; });
      if (vBtns.length !== 3) throw new Error('the video icon strip has ' + vBtns.length + ' buttons, expected 3 (trim-in / split / trim-out): ' + vTitles.join(' · '));
      if (vTitles.some(function (t) { return /^Speed/.test(t) || /^Audio/.test(t); })) {
        throw new Error('Speed and/or Audio are still in the icon strip: ' + vTitles.join(' · '));
      }
      FM.selectLayer(f.shp.id); FM.inspector.openCategory('home');
      const sTitles = Array.prototype.slice.call(document.querySelectorAll('#inspector .quick-row .qr-btn')).map(function (b) { return b.title; });
      if (vTitles.join(' · ') !== sTitles.join(' · ')) {
        throw new Error('the icon strips still differ:\n  video: ' + vTitles.join(' · ') + '\n  shape: ' + sTitles.join(' · '));
      }
    } finally { q45Restore(saved); }
  });

  test('audio detection: “has audio” is a decoded track, not the word “video”', { item: 'q45-has-audio' }, async function () {
    const saved = { layers: FM.scene.layers.slice(), sel: FM.scene.selectedId, media: [], time: FM.time };
    try {
      if (!FM.hasAudioTrack || !FM.probeAudioTrack) throw new Error('FM.hasAudioTrack / FM.probeAudioTrack are missing — nothing can tell a silent screen recording from a clip with sound');
      const f = q45Fixture(); saved.media.push(f.vid.id);

      // A shape can never have sound: answered synchronously, no decode, no media record needed.
      if (FM.hasAudioTrack(f.shp) !== false) throw new Error('a shape layer does not report “no audio”: ' + FM.hasAudioTrack(f.shp));
      if (await FM.probeAudioTrack(f.shp) !== false) throw new Error('probing a shape did not resolve false');

      // A silent screen recording — a real video layer whose file has no decodable audio track.
      const silent = FM.makeLayer('video', { name: 'q45 silent' });
      FM.scene.layers.push(silent); saved.media.push(silent.id);
      FM.media.set(silent.id, { kind: 'video', width: 640, height: 360, duration: 5, file: q45SilentFile() });
      if (await FM.probeAudioTrack(silent) !== false) throw new Error('a video whose file has NO decodable audio still reports as having sound — “is a video” is not “has audio”');
      if (FM.hasAudioTrack(silent) !== false) throw new Error('the probe result was not cached back onto the media record');

      // …and one that really does carry sound.
      const loud = FM.makeLayer('video', { name: 'q45 loud' });
      FM.scene.layers.push(loud); saved.media.push(loud.id);
      FM.media.set(loud.id, { kind: 'video', width: 640, height: 360, duration: 5, file: q45WavFile() });
      if (await FM.probeAudioTrack(loud) !== true) throw new Error('a clip with a real decodable audio track reports as silent');

      // Cheap: the probe must not park full-rate PCM on the media record (v5.59's whole point).
      const rec = FM.media.get(loud.id);
      if (rec.audioBuffer && rec.audioBuffer.sampleRate > 16000) throw new Error('the probe cached a ' + rec.audioBuffer.sampleRate + 'Hz buffer on the media record — it must decode cheap and throw the PCM away');
    } finally { q45Restore(saved); }
  });

  test('Add Effect browser: a Visual/Audio toggle above Featured switches the whole browser', { item: 'q45-fx-toggle' }, async function () {
    const saved = { layers: FM.scene.layers.slice(), sel: FM.scene.selectedId, media: [], time: FM.time };
    try {
      const f = q45Fixture(); saved.media.push(f.vid.id);
      const loud = FM.makeLayer('video', { name: 'q45 loud2' });
      FM.scene.layers.push(loud); saved.media.push(loud.id);
      FM.media.set(loud.id, { kind: 'video', width: 640, height: 360, duration: 5, file: q45WavFile() });
      await FM.probeAudioTrack(loud);          // pre-warm so the toggle renders its final state at once
      await FM.probeAudioTrack(f.shp);

      const scroll = document.querySelector('#fx-browser .fxb-scroll');
      const mode = function () { return scroll.querySelector('.fxmode'); };
      const btn = function (name) {
        return Array.prototype.slice.call(scroll.querySelectorAll('.fxmode-btn')).find(function (b) { return (b.textContent || '').trim() === name; });
      };

      // --- a layer with NO audio: the toggle is there, the audio half is greyed and inert ---
      FM.selectLayer(f.shp.id);
      FM.fxBrowser.open(f.shp);
      if (!mode()) throw new Error('no .fxmode toggle in the Add Effect browser');
      if (scroll.firstElementChild !== mode()) throw new Error('the toggle is not the first thing in the browser — it has to sit ABOVE Featured');
      const feat = scroll.querySelector('.fxb-sec-title');
      if (!feat || !(mode().compareDocumentPosition(feat) & Node.DOCUMENT_POSITION_FOLLOWING)) throw new Error('“' + (feat && feat.textContent) + '” is not below the toggle');
      if (!btn('Audio') || !btn('Effects')) throw new Error('the toggle does not offer both sides: ' + Array.prototype.slice.call(scroll.querySelectorAll('.fxmode-btn')).map(function (b) { return b.textContent; }).join('/'));
      if (!btn('Effects').classList.contains('on')) throw new Error('the visual side is not the selected one on a layer with no audio');
      // A control you cannot press is not a control: BOTH halves have to be a real thumb target and
      // sit fully inside the browser's own box — greyed or not, the dim one still has to be tappable
      // to say why it is dim.
      const box = scroll.getBoundingClientRect();
      Array.prototype.slice.call(scroll.querySelectorAll('.fxmode-btn')).forEach(function (b) {
        const r = b.getBoundingClientRect();
        if (r.height < 36) throw new Error('the “' + b.textContent + '” half of the toggle is ' + Math.round(r.height) + 'px tall — under the 36px thumb minimum');
        if (r.width < 60) throw new Error('the “' + b.textContent + '” half of the toggle is only ' + Math.round(r.width) + 'px wide');
        if (r.left < box.left - 1 || r.right > box.right + 1 || r.top < box.top - 1) {
          throw new Error('the “' + b.textContent + '” half spills outside the browser panel (' + Math.round(r.left) + '–' + Math.round(r.right) + ' vs ' + Math.round(box.left) + '–' + Math.round(box.right) + ')');
        }
      });
      if (!btn('Audio').classList.contains('off')) throw new Error('the Audio side is not greyed on a layer with no audio');
      if (Number(getComputedStyle(btn('Audio')).opacity) > 0.7) throw new Error('.fxmode-btn.off does not dim (opacity ' + getComputedStyle(btn('Audio')).opacity + ') — this check would prove nothing');
      btn('Audio').click();
      if (!document.getElementById('afx-browser').classList.contains('hidden')) throw new Error('the greyed Audio side still switched the browser — it must not be selectable');
      if (document.getElementById('fx-browser').classList.contains('hidden')) throw new Error('tapping the greyed Audio side closed the browser');
      FM.fxBrowser.close();

      // --- a layer WITH audio: the toggle swaps the whole browser, categories included ---
      FM.selectLayer(loud.id);
      FM.fxBrowser.open(loud);
      const visualCats = Array.prototype.slice.call(scroll.querySelectorAll('.fxb-banner-label')).map(function (n) { return n.textContent; });
      if (!visualCats.length) throw new Error('the visual browser rendered no category banners');
      if (btn('Audio').classList.contains('off')) throw new Error('the Audio side is greyed on a clip that HAS a decodable audio track');
      btn('Audio').click();
      if (!document.getElementById('fx-browser').classList.contains('hidden')) throw new Error('switching to Audio left the visual browser up');
      const aScroll = document.querySelector('#afx-browser .fxb-scroll');
      if (document.getElementById('afx-browser').classList.contains('hidden')) throw new Error('switching to Audio did not open the audio browser');
      const aMode = aScroll.querySelector('.fxmode');
      if (!aMode || aScroll.firstElementChild !== aMode) throw new Error('the audio side has no toggle at the top — there would be no way back');
      const aAudioBtn = Array.prototype.slice.call(aScroll.querySelectorAll('.fxmode-btn')).find(function (b) { return (b.textContent || '').trim() === 'Audio'; });
      if (!aAudioBtn || !aAudioBtn.classList.contains('on')) throw new Error('the audio browser does not show Audio as the selected side');
      const audioCats = Array.prototype.slice.call(aScroll.querySelectorAll('.fxb-banner-label')).map(function (n) { return n.textContent; });
      const wantCats = FM.audioFxRegistry.categories().map(function (c) { return c.label; });
      if (audioCats.join(',') !== wantCats.join(',')) throw new Error('the CATEGORIES did not switch with the toggle: ' + audioCats.join(',') + ' vs ' + wantCats.join(','));
      // …and back again.
      const aVisBtn = Array.prototype.slice.call(aScroll.querySelectorAll('.fxmode-btn')).find(function (b) { return (b.textContent || '').trim() === 'Effects'; });
      aVisBtn.click();
      if (!document.getElementById('afx-browser').classList.contains('hidden') || document.getElementById('fx-browser').classList.contains('hidden')) throw new Error('the toggle is one-way — Effects did not bring the visual browser back');
    } finally {
      if (FM.fxBrowser) FM.fxBrowser.close();
      if (FM.audioFxBrowser) FM.audioFxBrowser.close();
      q45Restore(saved);
    }
  });

  test('Effects panel: the same Visual/Audio toggle, so an added audio effect still has an editor', { item: 'q45-fx-toggle' }, async function () {
    const saved = { layers: FM.scene.layers.slice(), sel: FM.scene.selectedId, media: [], time: FM.time };
    try {
      const f = q45Fixture(); saved.media.push(f.vid.id);
      const loud = FM.makeLayer('video', { name: 'q45 loud3' });
      FM.scene.layers.push(loud); saved.media.push(loud.id);
      FM.media.set(loud.id, { kind: 'video', width: 640, height: 360, duration: 5, file: q45WavFile() });
      await FM.probeAudioTrack(loud); await FM.probeAudioTrack(f.shp);

      const panelBtn = function (name) {
        return Array.prototype.slice.call(document.querySelectorAll('#inspector .fxmode-btn')).find(function (b) { return (b.textContent || '').trim() === name; });
      };
      FM.selectLayer(loud.id); FM.inspector.openCategory('effects');
      if (!document.querySelector('#inspector .fxmode')) throw new Error('the Effects panel has no Visual/Audio toggle — an added audio effect would have no editor to live in');
      if (!panelBtn('Effects').classList.contains('on')) throw new Error('the Effects panel does not open on the visual stack');
      const addLabel = function () {
        const b = document.querySelector('#inspector .fx-add-btn');
        return b ? (b.textContent || '').trim() : '(no add button)';
      };
      if (addLabel() !== '+ Add Effect') throw new Error('the visual side does not offer “+ Add Effect”, it offers “' + addLabel() + '”');
      panelBtn('Audio').click();
      if (addLabel() !== '+ Add Audio Effect') throw new Error('switching the panel to Audio did not show the audio stack — its add button reads “' + addLabel() + '”');
      if (!panelBtn('Audio').classList.contains('on')) throw new Error('the Audio side did not latch on');
      // Same geometry rule as the browser's copy: a real thumb target, inside the panel it lives in.
      const pBox = document.getElementById('inspector').getBoundingClientRect();
      Array.prototype.slice.call(document.querySelectorAll('#inspector .fxmode-btn')).forEach(function (b) {
        const r = b.getBoundingClientRect();
        if (r.height < 36) throw new Error('the panel toggle’s “' + b.textContent + '” half is ' + Math.round(r.height) + 'px tall — under the 36px thumb minimum');
        if (r.left < pBox.left - 1 || r.right > pBox.right + 1) throw new Error('the panel toggle’s “' + b.textContent + '” half spills outside the inspector');
      });

      // A layer with no audio: the panel keeps the toggle, greyed, and stays on the visual stack.
      FM.selectLayer(f.shp.id); FM.inspector.openCategory('effects');
      if (!panelBtn('Audio')) throw new Error('the Effects panel drops the toggle on a layer with no audio — it should be visible and dim');
      if (!panelBtn('Audio').classList.contains('off')) throw new Error('the Audio side is selectable on a layer with no audio');
      panelBtn('Audio').click();
      if (addLabel() !== '+ Add Effect') throw new Error('the greyed Audio side still switched the panel');

      // A SONG (mp3/wav rides the video path with a 0×0 picture) is the mirror image: pinned to the
      // audio side, with the VISUAL half as the greyed one. Its Audio Effects card is gone like every
      // other layer's, so Effects has to be the way in or the audio stack is unreachable on a song.
      const song = FM.makeLayer('video', { name: 'q45 song' });
      FM.scene.layers.push(song); saved.media.push(song.id);
      FM.media.set(song.id, { kind: 'video', width: 0, height: 0, duration: 30, file: q45WavFile() });
      await FM.probeAudioTrack(song);
      FM.selectLayer(song.id); FM.inspector.openCategory('home');
      const songCards = q45Cards().map(function (c) { return c.label; });
      if (songCards.join(' | ') !== 'Speed | Volume | Effects') throw new Error('a song’s cards are “' + songCards.join(' | ') + '” — expected Speed | Volume | Effects');
      FM.inspector.openCategory('effects');
      if (addLabel() !== '+ Add Audio Effect') throw new Error('a song’s Effects card did not open on the audio side — its add button reads “' + addLabel() + '”');
      if (!panelBtn('Effects').classList.contains('off')) throw new Error('the visual side is selectable on a song — a 0×0 layer has no picture for an effect to change');
    } finally { q45Restore(saved); }
  });


  test('easing editor: the whole panel fits, and every rail button is really on screen', { item: 'ease-panel-fit' }, async function () {
    // v5.70. The inline easing editor overflowed #inspector-panel at every size it ships at — measured
    // 224px over on a 390x800 phone, 304px over in Studio at 1280x720, 49px over even at 1024x768.
    // The preset rail was a vertical column 351px tall inside a panel that is 290px on a phone.
    //
    // BOTH halves are asserted here, and the second half is the whole point. "scrollHeight <=
    // clientHeight" is satisfiable by HIDING a control: both rails used to be overflow-y:auto with
    // scrollbar-width:none + ::-webkit-scrollbar{display:none}, so a button parked below the fold was
    // invisible, still clickable, and still counted as "fits". Two earlier attempts at this shipped
    // exactly that. So every preset and every family button must be measurably INSIDE its rail's
    // visible box, inside the panel's visible box, and still 36px tall — and the graph they share the
    // panel with must not have been squeezed to nothing to make room.
    const sleep = ms => new Promise(r => setTimeout(r, ms));
    const panel = document.getElementById('inspector-panel');
    if (!panel) throw new Error('#inspector-panel missing');
    const savedScene = FM.scene, commit = FM.history.commit, autosave = FM.storage.autosave,
          save = FM.storage.save, dirty = FM.storage.markDirty;
    const hadH = panel.style.height, hadMaxH = panel.style.maxHeight, hadMinH = panel.style.minHeight;
    FM.history.commit = function () {}; FM.storage.autosave = function () {};
    FM.storage.save = function () {}; FM.storage.markDirty = function () {};
    try {
      FM.scene = { project: { width: 1080, height: 1080, fps: 30, duration: 5, background: '#000000' }, layers: [], selectedId: null, selectedIds: [] };
      const L = FM.makeLayer('shape', { shape: 'star', name: 'Star', x: 300, y: 500, shapeW: 260, shapeH: 260, fill: '#7a5cff' });
      L.transform.x = { kf: [{ t: 0, v: 200, e: 'easeInOut' }, { t: 2, v: 800, e: 'easeInOut' }] };
      FM.scene.layers.push(L);
      FM.time = 2;
      FM.selectLayer(L.id);
      FM.inspector.openCategory('transform');
      FM._mtMode = 'move'; FM.inspector.refresh();
      const easeBtn = document.querySelector('.mt-ease');
      if (!easeBtn) throw new Error('no easing button on the Move & Transform rail');
      easeBtn.click();
      await sleep(0);
      if (!document.querySelector('.es-inline')) throw new Error('the easing editor never mounted');

      // The visible box of an element: border box minus border, minus any scrollbar gutter.
      const box = el => {
        const r = el.getBoundingClientRect();
        return { l: r.left + el.clientLeft, t: r.top + el.clientTop, r: r.left + el.clientLeft + el.clientWidth, b: r.top + el.clientTop + el.clientHeight };
      };
      const EPS = 0.5;
      function assertFits(where) {
        const pb = box(panel);
        const over = panel.scrollHeight - panel.clientHeight;
        if (over > 0) throw new Error(where + ': the inspector overflows by ' + over + 'px (' + panel.scrollHeight + ' of content in ' + panel.clientHeight + 'px) — the editor does not fit the panel');
        // Guard against the cheapest way to pass this: an empty rail. Every family carries at least
        // two presets, and the family rail is always the full three.
        const nPre = document.querySelectorAll('.es-preset').length, nFam = document.querySelectorAll('.es-fam').length;
        if (nPre < 2 || nFam !== 3) throw new Error(where + ': the rails hold ' + nPre + ' presets and ' + nFam + ' families — they did not build, so there is nothing to prove fits');
        const btns = [].slice.call(document.querySelectorAll('.es-preset, .es-fam, .es-loop'));
        btns.forEach(b => {
          const rail = b.parentElement, rb = box(rail), r = b.getBoundingClientRect();
          const key = (b._key || '?') + ' (' + b.className + ')';
          if (r.height < 36 - EPS) throw new Error(where + ': ' + key + ' is only ' + r.height.toFixed(1) + 'px tall — squashed below a 36px touch target to make the panel fit');
          if (r.bottom > rb.b + EPS || r.top < rb.t - EPS) throw new Error(where + ': ' + key + ' is outside its rail vertically (button ' + r.top.toFixed(1) + '–' + r.bottom.toFixed(1) + ' vs rail ' + rb.t.toFixed(1) + '–' + rb.b.toFixed(1) + ') — a rail that clips its own buttons is how "it fits" gets faked');
          if (r.right > rb.r + EPS || r.left < rb.l - EPS) throw new Error(where + ': ' + key + ' is outside its rail horizontally (button ' + r.left.toFixed(1) + '–' + r.right.toFixed(1) + ' vs rail ' + rb.l.toFixed(1) + '–' + rb.r.toFixed(1) + ')');
          if (r.bottom > pb.b + EPS || r.top < pb.t - EPS) throw new Error(where + ': ' + key + ' sits outside the visible panel (button ' + r.top.toFixed(1) + '–' + r.bottom.toFixed(1) + ' vs panel ' + pb.t.toFixed(1) + '–' + pb.b.toFixed(1) + ') — you would have to scroll to reach it');
          if (!b.getClientRects().length) throw new Error(where + ': ' + key + ' has no box at all');
        });
        // …and the graph must still be a graph. Everything above is also satisfied by an editor whose
        // curve has been shrunk to a dot, which is not a fix.
        const cv = document.querySelector('.es-canvas');
        if (!cv) throw new Error(where + ': no .es-canvas');
        const cr = cv.getBoundingClientRect();
        if (cr.height < 40) throw new Error(where + ': the curve graph collapsed to ' + cr.height.toFixed(1) + 'px — the rails were made to fit by taking everything from the graph');
        if (Math.abs(cr.width - cr.height) > 1.5) throw new Error(where + ': the graph is ' + cr.width.toFixed(1) + 'x' + cr.height.toFixed(1) + ' — a squashed curve reads as the wrong easing');
      }

      // Pin the panel to the heights it actually gets on the devices this ships to: a docked phone
      // sheet, the short Studio band at 720p, and the classic side column on a small laptop. Pinning
      // is what makes those measurable from one harness window; the pin is verified, not assumed.
      const HEIGHTS = [420, 348, 290, 257, 231, 217];
      for (const h of HEIGHTS) {
        panel.style.minHeight = panel.style.maxHeight = panel.style.height = h + 'px';
        await sleep(0);
        if (Math.abs(panel.clientHeight - h) > 3) throw new Error('could not pin the panel to ' + h + 'px (clientHeight ' + panel.clientHeight + ') — this sweep would be measuring nothing');
        // every family, because each one fills the preset rail with a different number of buttons
        const fams = [].slice.call(document.querySelectorAll('.es-fam'));
        if (fams.length < 3) throw new Error('the family rail has ' + fams.length + ' buttons, expected 3');
        assertFits(h + 'px / bezier');
        for (let i = 0; i < fams.length; i++) {
          const f = [].slice.call(document.querySelectorAll('.es-fam'))[i];
          f.click();
          await sleep(0);
          assertFits(h + 'px / ' + f._key);
        }
        // back to bezier for the next height
        const bez = [].slice.call(document.querySelectorAll('.es-fam')).filter(x => x._key === 'bezier')[0];
        if (bez) { bez.click(); await sleep(0); }
      }

      // The rail may only offer curves a cubic bezier can BE — that is what made room. bounce and
      // elastic are sampled functions and 'hold' is a step; they belong to the other two families.
      const bezKeys = [].slice.call(document.querySelectorAll('.es-preset')).map(b => b._key);
      const wantBez = ['linear', 'easeIn', 'easeOut', 'easeInOut', 'overshoot', 'anticipate'];
      if (bezKeys.join(',') !== wantBez.join(',')) throw new Error('the bezier rail is [' + bezKeys.join(',') + '], expected [' + wantBez.join(',') + ']');
      bezKeys.forEach(k => { if (!FM.EASE_PRESETS[k]) throw new Error('"' + k + '" is on the bezier rail but has no cubic bezier in FM.EASE_PRESETS — it cannot be drawn or dragged as one'); });
      if (document.querySelectorAll('.es-car-arrow').length) throw new Error('the pager arrows are back — every preset of the active family is on screen, so they cost height for nothing');

      // Hold has to stay reachable, and a keyframe that already says e:"hold" has to keep working.
      const steps = [].slice.call(document.querySelectorAll('.es-fam')).filter(x => x._key === 'steps')[0];
      if (!steps) throw new Error('no Steps family button');
      steps.click(); await sleep(0);
      const hold = [].slice.call(document.querySelectorAll('.es-preset')).filter(x => x._key === 'hold')[0];
      if (!hold) throw new Error('Hold is not reachable from any rail — trimming the bezier rail dropped it instead of moving it');
      hold.click(); await sleep(0);
      if (L.transform.x.kf[1].e !== 'hold') throw new Error('picking Hold wrote e=' + L.transform.x.kf[1].e + ', not "hold" — older builds and evalProp both read that string');
      if (L.transform.x.kf[1].ez) throw new Error('picking Hold left an ez behind, so the parameterised curve is still what evalProp uses');

      const label = () => (document.querySelector('.es-car-label') || {}).textContent;
      const litFam = () => [].slice.call(document.querySelectorAll('.es-fam.on')).map(x => x._key).join(',');
      const LEGACY = { hold: 'Hold (step)', bounce: 'Bounce', elastic: 'Elastic' };
      Object.keys(LEGACY).forEach(e => {
        L.transform.x.kf[1].e = e;
        delete L.transform.x.kf[1].bez; delete L.transform.x.kf[1].ez;
        FM.refreshEasing();
        if (label() !== LEGACY[e]) throw new Error('a keyframe carrying e:"' + e + '" reads as "' + label() + '" — an older project looks like it lost its easing');
      });
      L.transform.x.kf[1].e = 'hold'; FM.refreshEasing();
      if (litFam() !== 'steps') throw new Error('e:"hold" lights the "' + litFam() + '" family — a step belongs to the Steps rail, and that is where Hold now lives');
      if (![].slice.call(document.querySelectorAll('.es-preset')).some(b => b._key === 'hold' && b.classList.contains('on'))) {
        throw new Error('e:"hold" does not light the Hold button on the rail it is supposed to live on');
      }

      // A REBUILD of the editor DOM must come back with a filled rail. buildPresetRail caches which
      // family the rail was last filled for; that cache outlives the DOM, so any inspector.refresh()
      // with the family unchanged — a keyframe toggle, the mobile sheet re-syncing — used to hand back
      // a brand-new, permanently empty preset rail.
      FM.inspector.refresh();
      await sleep(0);
      const afterRebuild = document.querySelectorAll('.es-preset').length;
      if (afterRebuild < 2) throw new Error('rebuilding the panel left ' + afterRebuild + ' presets on the rail — the rail cache is keyed to a DOM node that no longer exists');
    } finally {
      panel.style.height = hadH; panel.style.maxHeight = hadMaxH; panel.style.minHeight = hadMinH;
      FM.scene = savedScene;
      FM._mtEasing = false;
      FM.history.commit = commit; FM.storage.autosave = autosave; FM.storage.save = save; FM.storage.markDirty = dirty;
      try { FM.inspector.refresh(); } catch (e) {}
    }
  });


  async function run() {
    var results = [];
    for (var i = 0; i < T.length; i++) {
      var t = T[i], ok = true, err = null;
      try { var r = t.fn(); if (r && typeof r.then === 'function') await r; }
      catch (e) { ok = false; err = String((e && e.message) || e); }
      results.push({ name: t.name, item: t.item, pending: t.pending, ok: ok, error: err });
    }
    var reg = results.filter(function (r) { return !r.pending; });
    var pend = results.filter(function (r) { return r.pending; });
    return {
      regressionPass: reg.filter(function (r) { return r.ok; }).length,
      regressionTotal: reg.length,
      regressionGreen: reg.every(function (r) { return r.ok; }),
      pendingPass: pend.filter(function (r) { return r.ok; }).length,
      pendingTotal: pend.length,
      results: results
    };
  }

  window.FMTests = { tests: T, run: run };
})();
