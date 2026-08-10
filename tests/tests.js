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

  /* ---------------- runner ---------------- */

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
