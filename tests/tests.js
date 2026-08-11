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
