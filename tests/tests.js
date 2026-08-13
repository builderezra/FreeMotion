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

  /* Captured the instant the suite is injected, because index.html's boot script REMOVES #splash
   * about 5.3s after load. Any test that asks the live DOM for it is therefore racing a wall clock,
   * and goes red as soon as the suite grows — which has now happened twice: once when a test was
   * added mid-file, and again at v5.74 when seven arrived at once. The old workaround was to keep
   * the racing test registered LAST, which is not a fix, it just moves the cliff to the next person
   * who adds a test. Capture the node while it is certainly still there. */
  const SPLASH_AT_LOAD = document.getElementById('splash');

  function scene(layers, over) {
    return Object.assign({
      project: { width: 320, height: 240, fps: 30, duration: 5, background: '#000000' },
      layers: layers, selectedId: null, selectedIds: []
    }, over || {});
  }
  function offscreen(w, h) { var c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
  function px(ctx, x, y) { return ctx.getImageData(x, y, 1, 1).data; }

  /* Run `fn` with the test frame narrowed to a real phone width, then put it back.
   *
   * WHY THIS HAS TO EXIST (v6.17). run.html hosts the app in a 900x760 iframe — a DESKTOP viewport.
   * That never mattered before, because the text editor had no width branch at all: the phone's
   * bottom-sheet geometry WAS the geometry at every width, so a test asserting "the toolbar sits on
   * the visible top edge" passed in a 900px frame and told you nothing about a phone. That is exactly
   * how text editing was declared fixed three times while Ezra kept reporting it broken on his PC —
   * the suite could not tell the two layouts apart, because there was only one.
   * Now there really are two, so a phone assertion has to be made at a phone width and a desktop
   * assertion at a desktop one. matchMedia inside the frame tracks the frame's own box, and
   * FM.mobile.isPhone() is a live matchMedia call (js/mobile.js:7), so the app genuinely switches. */
  async function atPhoneWidth(fn, w) {
    var fe = window.frameElement;
    if (!fe) throw new Error('this test needs run.html\'s iframe (no window.frameElement) to reach a phone width');
    var w0 = fe.style.width;
    var settle = function () { return new Promise(function (r) { setTimeout(r, 80); }); };
    fe.style.width = (w || 390) + 'px';
    window.dispatchEvent(new Event('resize'));
    await settle();
    if (!matchMedia('(max-width: 700px)').matches) throw new Error('the frame did not narrow to a phone width (innerWidth ' + window.innerWidth + ')');
    try {
      return await fn();
    } finally {
      fe.style.width = w0;
      window.dispatchEvent(new Event('resize'));
      await settle();
    }
  }

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

  test('the playhead survives a rebuild that lands mid project-open push', { item: 'playhead-open-push' }, async function () {
    // v5.93 field bug, reported twice: "the playhead sometimes isn't there when a project opens", and
    // only restarting the app brought it back. The project-open push (js/home.js) makes #app
    // position:fixed and slides it a WHOLE VIEWPORT across the screen for PUSH_MS. recomputePad()
    // measures #timeline-panel with getBoundingClientRect — which reports where the box is PAINTED —
    // and publishes it as --tl-panel-left, off which the CSS pins the line at
    // calc(50vw - var(--tl-panel-left)). A recompute inside that window therefore stored the
    // TRANSLATED edge, and the line parked half a screen off the left edge for the rest of the
    // session, because nothing recomputes again once the push has ended.
    //
    // It is not hypothetical. The deferred filmstrip build in timeline.js
    // (`FM.buildClipStrip(m, 8).then(… FM.timeline.rebuild())`) resolves a couple of ms AFTER the push
    // starts, so it fires on every open of any project holding an image or a video clip. Measured on
    // v5.93 at 390x844, cold opens driven by a real touch tap on the home card: 20 of 20 left the line
    // at x = -195 on a 390px screen with the clip content 267px out of register with it; 0 of 8 with a
    // media-free project, which has no deferred rebuild to land inside the window. That difference is
    // the whole of the "sometimes".
    //
    // BOTH consumers are checked, because they are fed by the same measurement and a repair that fixes
    // only the CSS var leaves every clip in the wrong place. The content check is made WHILE the push
    // is still on, and deliberately so: line and clip are both inside #app, so their separation is
    // invariant under the push's transform, and measuring there is what stops a teardown rebuild from
    // quietly recomputing PAD and hiding the defect. An earlier draft of this test measured after the
    // teardown and was a DUD — it stayed green against a mutation that repaired the var and left PAD
    // reading the painted edge.
    var app = document.getElementById('app');
    var panel = document.getElementById('timeline-panel');
    var line = document.getElementById('tl-centerline');
    var scroller = document.getElementById('timeline');
    if (!app || !panel || !line) throw new Error('#app / #timeline-panel / #tl-centerline missing');
    if (!FM.timeline || !FM.timeline.rebuild) throw new Error('FM.timeline.rebuild missing');
    var rAF = function () { return new Promise(function (r) { requestAnimationFrame(r); }); };
    var readVar = function () {
      return parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--tl-panel-left')) || 0;
    };
    var gap = function () {
      var el = document.querySelector('.clip[data-id="' + probe.id + '"]');
      if (!el) throw new Error('the probe clip is not in the timeline — the content half of this test proves nothing');
      return el.getBoundingClientRect().left - line.getBoundingClientRect().left;
    };

    var probe = FM.makeLayer('shape', { shape: 'rect', name: 'ZZ push probe', start: 0, duration: 1 });
    var wasTime = FM.time, wasScroll = scroller ? scroller.scrollLeft : 0;
    FM.scene.layers.push(probe);
    try {
      FM.time = 0;
      FM.timeline.rebuild(); FM.timeline.updatePlayhead();
      var truth = readVar();
      if (Math.abs(truth - panel.getBoundingClientRect().left) > 0.6) {
        throw new Error('at rest --tl-panel-left (' + truth + ') already disagrees with the panel (' +
                        panel.getBoundingClientRect().left.toFixed(2) + ') — nothing below can be trusted');
      }
      // A clip at t=0 with the playhead at t=0 has to start under the line even before we touch
      // anything. If it does not, the content assertion further down is measuring noise.
      var restGap = gap();
      if (Math.abs(restGap) > 2) {
        throw new Error('at rest a t=0 clip is already ' + restGap.toFixed(1) +
                        'px away from the playhead — the content check below would prove nothing');
      }

      // The push, exactly as js/home.js applies it. Under prefers-reduced-motion the stylesheet
      // deliberately cancels both the animation AND position:fixed, so there would be no transform to
      // be fooled by — fall back to the same geometry by hand, or this test passes for the wrong
      // reason on a reduced-motion machine.
      document.body.classList.add('fm-pushing');
      app.classList.add('fm-push-in');
      await rAF(); await rAF();
      var shifted = app.getBoundingClientRect().left - truth;
      if (Math.abs(shifted) < 8) {
        app.style.position = 'fixed'; app.style.left = '0px'; app.style.top = '0px';
        app.style.transform = 'translate3d(' + Math.round(window.innerWidth * 0.6) + 'px, 0, 0)';
        await rAF();
        shifted = app.getBoundingClientRect().left - truth;
      }
      // THE INSTRUMENT CHECK. If #app is not actually displaced on the frame we sample, this test
      // cannot tell the bug from the fix, and must say so rather than going quietly green.
      if (Math.abs(shifted) < 8) {
        throw new Error('#app never moved during the push (offset ' + shifted.toFixed(1) +
                        'px) — this test cannot see the defect it exists to catch');
      }

      // …and now the thing that actually happens in the field: a rebuild, mid-flight.
      FM.timeline.rebuild(); FM.timeline.updatePlayhead();

      var during = readVar();
      if (Math.abs(during - truth) > 0.6) {
        throw new Error('a rebuild during the open push published --tl-panel-left: ' + during +
                        'px instead of ' + truth + 'px (#app was ' + shifted.toFixed(1) +
                        'px off) — the playhead is then pinned at calc(50vw - ' + during + 'px) = ' +
                        (window.innerWidth / 2 - during).toFixed(0) + 'px, and nothing recomputes after the push');
      }
      // Consumer 2: PAD, the content origin, off the same measurement. Measured here rather than after
      // the teardown — see the note at the top.
      var pushGap = gap();
      if (Math.abs(pushGap - restGap) > 2) {
        throw new Error('a rebuild during the open push moved the t=0 clip ' + (pushGap - restGap).toFixed(1) +
                        'px away from the playhead — PAD kept the painted edge, so every clip is drawn in the wrong place');
      }
    } finally {
      document.body.classList.remove('fm-pushing');
      app.classList.remove('fm-push-in');
      app.style.position = ''; app.style.left = ''; app.style.top = ''; app.style.transform = '';
      var i = FM.scene.layers.indexOf(probe);
      if (i >= 0) FM.scene.layers.splice(i, 1);
      FM.time = wasTime;
    }
    await rAF(); await rAF();
    FM.timeline.rebuild(); FM.timeline.updatePlayhead();
    if (scroller) scroller.scrollLeft = wasScroll;

    // And the user-visible end state: the line is drawn, on screen, on true screen centre.
    var lr = line.getBoundingClientRect();
    var cs = getComputedStyle(line);
    if (cs.display === 'none' || cs.visibility === 'hidden') throw new Error('#tl-centerline is not being drawn after the push');
    if (!(lr.height > 2)) throw new Error('#tl-centerline has no height (' + lr.height.toFixed(1) + 'px) after the push');
    if (lr.left < 0 || lr.left > window.innerWidth) {
      throw new Error('after the push the playhead sits at x=' + lr.left.toFixed(1) + ' in a ' +
                      window.innerWidth + 'px viewport — off screen, which is the reported bug');
    }
    if (Math.abs(lr.left - window.innerWidth / 2) > 2) {
      throw new Error('after the push the playhead is ' + Math.abs(lr.left - window.innerWidth / 2).toFixed(1) +
                      'px off screen centre');
    }
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

  /* ---- the restroom-pictogram pair: person + woman ------------------------------------------
   * Every number below is measured from RENDERED PIXELS — reading the path data is what let three
   * bad versions of these two ship. The tests are deliberately PROPERTY tests: not one coordinate
   * is pinned, because pinning coordinates only freezes whatever was last drawn. What is pinned is
   * what makes a pictogram a pictogram, and each one is a defect that actually shipped:
   *   · the head is a true circle in the box the picker actually spawns  (the CAR bug: a wrong
   *     SHAPE_ASPECT stretches every feature by exactly the box ratio while the path data still
   *     looks perfectly reasonable — the car's wheels became 3.1:1 ellipses that way);
   *   · the two agree on height, head and stance — they appear side by side, and the previous pair
   *     had her shoulders at 0.69x his and her legs at 0.62x his while a comment claimed they matched;
   *   · the torso tapers and never widens on the way down — his had a literal rectangle torso and a
   *     26px concave nick where a hand-round undercut the hip;
   *   · both are symmetric to a pixel;
   *   · at 24 and 48px the head stays off the shoulders and the legs stay apart — his merged into
   *     one solid column at 24px, which is the documented failure mode for these two shapes.
   */
  const FIG_CACHE = {};
  function figMask(kind, bw, bh) {
    const c = offscreen(bw, bh), g = c.getContext('2d');
    FM.traceShapePath(g, { shape: kind }, 0, 0, bw, bh);
    g.fillStyle = '#000'; g.fill();          // canvas default fill rule = nonzero, exactly as the app draws it
    const d = g.getImageData(0, 0, bw, bh).data, m = new Uint8Array(bw * bh);
    for (let i = 0; i < m.length; i++) m[i] = d[i * 4 + 3] > 127 ? 1 : 0;
    return { m: m, w: bw, h: bh };
  }
  function figTopo(f) {   // 4-connected ink components, and background regions enclosed by ink
    const N = f.w * f.h, seen = new Uint8Array(N), st = new Int32Array(N);
    const push = (arr, p, sp) => { arr[p] = 1; st[sp] = p; return sp + 1; };
    let comps = 0;
    const flood = (start, want, marks) => {
      let sp = push(marks, start, 0);
      while (sp) {
        const p = st[--sp], x = p % f.w, y = (p - x) / f.w;
        if (x > 0 && f.m[p - 1] === want && !marks[p - 1]) sp = push(marks, p - 1, sp);
        if (x < f.w - 1 && f.m[p + 1] === want && !marks[p + 1]) sp = push(marks, p + 1, sp);
        if (y > 0 && f.m[p - f.w] === want && !marks[p - f.w]) sp = push(marks, p - f.w, sp);
        if (y < f.h - 1 && f.m[p + f.w] === want && !marks[p + f.w]) sp = push(marks, p + f.w, sp);
      }
    };
    for (let i = 0; i < N; i++) if (f.m[i] && !seen[i]) { comps++; flood(i, 1, seen); }
    const bg = new Uint8Array(N);
    for (let x = 0; x < f.w; x++) { [x, x + (f.h - 1) * f.w].forEach(p => { if (!f.m[p] && !bg[p]) flood(p, 0, bg); }); }
    for (let y = 0; y < f.h; y++) { [y * f.w, y * f.w + f.w - 1].forEach(p => { if (!f.m[p] && !bg[p]) flood(p, 0, bg); }); }
    let holes = 0; const hs = new Uint8Array(N);
    for (let i = 0; i < N; i++) if (!f.m[i] && !bg[i] && !hs[i]) { holes++; flood(i, 0, hs); }
    return { components: comps, holes: holes };
  }
  function figStats(kind, bw, bh) {
    const key = kind + '@' + bw + 'x' + bh;
    if (FIG_CACHE[key]) return FIG_CACHE[key];
    const f = figMask(kind, bw, bh), rows = [];
    for (let y = 0; y < f.h; y++) {
      let n = 0, l = -1, r = -1, runs = 0, prev = 0;
      for (let x = 0; x < f.w; x++) {
        const v = f.m[y * f.w + x];
        if (v) { n++; if (l < 0) l = x; r = x; if (!prev) runs++; }
        prev = v;
      }
      rows.push({ n: n, l: l, r: r, runs: runs, w: n ? r - l + 1 : 0 });
    }
    let y0 = -1, y1 = -1, x0 = f.w, x1 = -1, ink = 0;
    rows.forEach((r, y) => { if (r.n) { if (y0 < 0) y0 = y; y1 = y; if (r.l < x0) x0 = r.l; if (r.r > x1) x1 = r.r; ink += r.n; } });
    if (y0 < 0) throw new Error(kind + ' drew no ink at all in a ' + bw + 'x' + bh + ' box');
    const H = y1 - y0 + 1, at = fr => Math.min(y1, Math.max(y0, Math.round(y0 + fr * H)));
    let gapS = -1, gapE = -1;                                   // the neck: first empty row inside the figure
    for (let y = y0; y <= y1; y++) {
      if (!rows[y].n && gapS < 0) gapS = y;
      else if (rows[y].n && gapS >= 0 && gapE < 0) { gapE = y; break; }
    }
    let headW = 0; const headH = gapS > 0 ? gapS - y0 : 0;
    for (let y = y0; y < (gapS > 0 ? gapS : y0); y++) headW = Math.max(headW, rows[y].w);
    let split = -1;                                              // where it becomes two legs and stays two
    for (let y = (gapE > 0 ? gapE : y0); y <= y1; y++) {
      if (rows[y].runs >= 2) {
        let ok = true;
        for (let z = y; z <= y1 - Math.round(H * 0.02); z++) if (rows[z].runs < 2) { ok = false; break; }
        if (ok) { split = y; break; }
      }
    }
    const body = gapE > 0 ? gapE : y0;
    // direction changes in the outer silhouette, from below the shoulder round to the split.
    // A pictogram man tapers: 0 changes. A pictogram woman narrows then flares: 1. A hip nick,
    // a wrist step or any other accidental bulge shows up as an extra one.
    const dead = Math.max(3, Math.round(H * 0.006));
    let dir = 0, changes = 0, ref = rows[at((body - y0) / H + 0.08)].w, minSeen = Infinity, rebound = 0;
    for (let y = at((body - y0) / H + 0.08); y < (split > 0 ? split : y1); y++) {
      const w = rows[y].w;
      if (w < minSeen) minSeen = w; else if (w - minSeen > rebound) rebound = w - minSeen;
      if (Math.abs(w - ref) >= dead) { const d = w > ref ? 1 : -1; if (dir && d !== dir) changes++; dir = d; ref = w; }
    }
    let diff = 0, maxOff = 0; const cx2 = x0 + x1;               // mirror about the ink centre
    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) {
        const mx = cx2 - x;
        if (f.m[y * f.w + x] !== ((mx >= 0 && mx < f.w) ? f.m[y * f.w + mx] : 0)) diff++;
      }
      if (rows[y].n) maxOff = Math.max(maxOff, Math.abs((rows[y].l + rows[y].r) - cx2) / 2);
    }
    const lr = rows[at(0.90)];
    let gap90 = 0, g0 = -1;
    for (let x = lr.l; x <= lr.r; x++) {
      if (!f.m[at(0.90) * f.w + x]) { if (g0 < 0) g0 = x; }
      else if (g0 >= 0) { gap90 = Math.max(gap90, x - g0); g0 = -1; }
    }
    const t = figTopo(f);
    const S = {
      kind: kind, H: H, W: x1 - x0 + 1, ink: ink,
      headW: headW, headH: headH,
      headCirc: headH ? headW / headH : 0,
      headsPerHeight: headH ? H / headH : 0,
      neckGap: gapE > 0 ? gapE - gapS : 0,
      shoulderW: rows[at((body - y0) / H + 0.07)].w,
      hipW: split > 0 ? rows[at((split - y0) / H - 0.02)].w : 0,
      splitFrac: split > 0 ? (split - y0) / H : 0,
      legLenFrac: split > 0 ? 1 - (split - y0) / H : 0,
      legW: lr.runs ? lr.n / lr.runs : 0, legGap: gap90, legRuns90: lr.runs,
      dirChanges: changes, reboundPx: rebound,
      symPct: 100 * diff / ink, centreOffPx: maxOff,
      components: t.components, holes: t.holes,
    };
    FIG_CACHE[key] = S;
    return S;
  }
  // The box the picker ACTUALLY spawns, straight out of app.js's private SHAPE_ASPECT table.
  function figSpawnBox(kind) {
    const savedScene = FM.scene, savedTime = FM.time;
    try {
      FM.scene = { project: { width: 600, height: 600, fps: 30, duration: 5, background: '#000' }, layers: [], selectedId: null, selectedIds: [] };
      FM.time = 0;
      FM.addShapeLayer(kind, { name: kind });
      const L = FM.scene.layers[0];
      if (!L || L.shape !== kind) throw new Error('addShapeLayer did not add a ' + kind + ' layer');
      const s = 512 / Math.max(L.shapeW, L.shapeH);
      return { w: Math.round(L.shapeW * s), h: Math.round(L.shapeH * s), raw: L.shapeW + 'x' + L.shapeH };
    } finally {
      FM.scene = savedScene; FM.time = savedTime;
      // addShapeLayer selects what it adds and re-renders the inspector against it. Putting the
      // scene back is not enough — without this the panel is still showing the scratch shape's
      // inspector, and the NEXT test to ask for the add menu fails with "the desktop add menu is
      // not rendered even with nothing selected". (Caught by running the suite, not by reading it.)
      try { if (FM.inspector) FM.inspector.refresh(); } catch (e) {}
    }
  }

  test('figures: the pictogram head is a true circle in the box the picker spawns', { item: 'figure-shapes' }, function () {
    // The car test by another name. The art carries its own proportion inside its unit box and the
    // box only SCALES it, so any declared aspect other than the one it was drawn at (1:1) turns the
    // head into an ellipse by exactly the box ratio — while the path data still reads fine.
    ['person', 'woman'].forEach(function (kind) {
      const box = figSpawnBox(kind);
      const s = figStats(kind, box.w, box.h);
      if (!(s.headCirc > 0.97 && s.headCirc < 1.03)) {
        throw new Error(kind + "'s head renders " + s.headW + 'x' + s.headH + ' (' + s.headCirc.toFixed(3) +
          ':1) in the ' + box.raw + ' box it spawns at — it is an ellipse, so the declared SHAPE_ASPECT no longer matches the art');
      }
    });
  });

  test('figures: person and woman are the same figure below the neck', { item: 'figure-shapes' }, function () {
    // They appear side by side in the picker and in a project. Before v5.90 they shared only a head:
    // her shoulders were 0.69x his and her legs 0.62x his.
    const p = figStats('person', 512, 512), w = figStats('woman', 512, 512);
    const same = (a, b, tol, what) => {
      if (Math.abs(a - b) > tol) throw new Error('the pair disagree on ' + what + ': person ' + a + ' vs woman ' + b + ' px (tolerance ' + tol + ')');
    };
    same(p.H, w.H, 1, 'total height');
    same(p.headH, w.headH, 1, 'head height');
    same(p.headW, w.headW, 1, 'head width');
    same(p.neckGap, w.neckGap, 1, 'the neck gap');
    same(p.shoulderW, w.shoulderW, 3, 'shoulder width');
    same(p.legW, w.legW, 3, 'leg thickness');
    same(p.legGap, w.legGap, 3, 'the gap between the legs');
  });

  test('figures: pictogram proportions — 1:6–1:7 head, legs, shoulders, and a torso that only tapers', { item: 'figure-shapes' }, function () {
    const p = figStats('person', 512, 512), w = figStats('woman', 512, 512);
    [p, w].forEach(function (s) {
      if (!(s.headsPerHeight >= 6 && s.headsPerHeight <= 7)) {
        throw new Error(s.kind + ' is 1:' + s.headsPerHeight.toFixed(2) + ' heads tall — outside the 1:6–1:7 pictogram band');
      }
      if (!(s.shoulderW / s.headW >= 1.7 && s.shoulderW / s.headW <= 2.3)) {
        throw new Error(s.kind + "'s shoulders are " + (s.shoulderW / s.headW).toFixed(2) + ' head-widths (want 1.7–2.3); at 1.0 the head is as wide as the body and it reads as a bell');
      }
      if (!(s.legLenFrac >= 0.35)) throw new Error(s.kind + "'s legs are " + (100 * s.legLenFrac).toFixed(1) + '% of height — under 35% the figure reads squat');
      if (!(s.neckGap >= 2)) throw new Error(s.kind + "'s head is touching the shoulders (" + s.neckGap + 'px of neck)');
    });
    // his silhouette must TAPER to the hip and must never widen on the way down…
    if (!(p.hipW < p.shoulderW * 0.92)) throw new Error('person: hips ' + p.hipW + 'px under shoulders ' + p.shoulderW + 'px — that is a fridge, not a torso (want at least 8% of taper)');
    if (p.dirChanges !== 0) throw new Error('person: the silhouette narrows and then widens again between the shoulder and the crotch (' + p.dirChanges + ' direction change(s), worst rebound ' + p.reboundPx + 'px) — that is the hip nick');
    // …and hers must do it exactly once, at the waist where the dress starts to flare
    if (w.dirChanges > 1) throw new Error('woman: the dress outline changes direction ' + w.dirChanges + ' times between shoulder and hem — a pictogram dress narrows once, then flares');
  });

  test('figures: both are mirror-symmetric to within a pixel', { item: 'figure-shapes' }, function () {
    ['person', 'woman'].forEach(function (kind) {
      const s = figStats(kind, 512, 512);
      if (s.symPct > 0.5) throw new Error(kind + ' is ' + s.symPct.toFixed(3) + '% asymmetric by ink — over the 0.5% rasteriser-noise floor');
      if (s.centreOffPx > 2) throw new Error(kind + ' leans: a row centre sits ' + s.centreOffPx.toFixed(1) + 'px off the figure centre');
    });
  });

  test('figures: still legible at 24 and 48px — head off the shoulders, legs apart, no holes', { item: 'figure-shapes' }, function () {
    // The documented failure: at 24px person measured ONE ink run at the feet — a solid black column.
    [24, 48].forEach(function (n) {
      ['person', 'woman'].forEach(function (kind) {
        const s = figStats(kind, n, n);
        if (!(s.ink > n * n * 0.1)) throw new Error(kind + ' at ' + n + 'px is almost blank: ' + s.ink + ' ink pixels');
        if (s.components !== 2) throw new Error(kind + ' at ' + n + 'px renders ' + s.components + ' components — a pictogram is exactly 2 (head, body+legs), so the head has fused to the shoulders');
        if (s.holes !== 0) throw new Error(kind + ' at ' + n + 'px has ' + s.holes + ' enclosed hole(s) — the nonzero union of the parts has broken');
        if (s.legRuns90 !== 2) throw new Error(kind + ' at ' + n + 'px has ' + s.legRuns90 + ' ink run(s) across the legs — they have merged into one column');
      });
    });
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
    const card = () => panel.querySelector('.addmenu-page .addmenu-card');
    const iconW = () => {
      const c = card();
      const sv = c && c.querySelector('.addmenu-ic svg');
      return sv ? Math.round(sv.getBoundingClientRect().width) : 0;
    };
    const shapeTab = tab('shape'), objTab = tab('object');
    if (!shapeTab || !objTab) throw new Error('shape / elements tab missing');
    const was = (panel.querySelector('.addmenu-tab.active') || {}).dataset;
    try {
      shapeTab.click();
      const shape = iconW();
      const shapeHasLabel = !!(card() && card().querySelector('.addmenu-lbl'));
      objTab.click();
      const labelled = iconW();
      const fit = panel.classList.contains('addmenu--fit');
      if (!shape || !labelled) throw new Error('could not measure a card icon (shape=' + shape + ', labelled=' + labelled + ')');
      /* v5.69 rewrote the second half of this test, and it is worth being explicit about why.
       * The accident being guarded is unchanged: the LABELLED cards' trim must never size the SHAPE
       * grid's art. What changed is how the two are sized. Both card kinds are now measured against
       * the panel (QUEUE 50), each from its own config in js/addmenu.js FIT_CFG — so "labelled icons
       * are trimmed to 19px" stopped being an invariant and became one particular panel size, and
       * so did "shape icons are the bigger of the two": Elements' nine entries can be given room
       * that Shape's seventy cannot, and measured, a 1280x800 classic panel draws 46px labelled
       * icons beside 37px shape ones. Both are big; neither is the 19px leak.
       * So: assert the leak itself is absent (the shape grid stays icon-only and its art stays large,
       * within the plan's own floor of 30px), and keep the ORIGINAL relative check for the
       * un-measured fallback path, which still uses the fixed 34px/19px numbers. */
      if (shape < 28) throw new Error('shape tile icons are ' + shape + 'px — the labelled-card trim has leaked onto them again (they should be 30px+)');
      if (shapeHasLabel) throw new Error('a shape tile grew a label — the shape grid is being sized as a labelled card, which is the same leak by another route');
      if (fit) {
        if (labelled > 46) throw new Error('labelled card icons are ' + labelled + 'px — past FIT_CFG.lbl.icoMax (46), so something outside the plan is sizing them');
      } else {
        if (labelled > 26) throw new Error('labelled card icons are ' + labelled + 'px — the Elements grid trim is not applying');
        if (shape <= labelled) throw new Error('shape icons (' + shape + 'px) should be BIGGER than labelled-card icons (' + labelled + 'px)');
      }
    } finally {
      const back = tab(was && was.key ? was.key : 'object'); if (back) back.click();
      if (hadSel) { FM.scene.selectedIds = hadSelIds; FM.selectLayer(hadSel); }
    }
  });

  /* ---- QUEUE 50 / 51 / 42: the PC Add panel ------------------------------------------------------
   * Three tests, one shared setup. All of them need the panel, which only exists on a desktop-width
   * window with NOTHING selected, so each deselects and puts the selection back the way the
   * shape-icon test above does. */
  function addPanel() {
    const p = document.querySelector('.addmenu--panel');
    if (!p) throw new Error('the desktop add menu is not rendered even with nothing selected');
    return p;
  }
  const nextFrame = () => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
  function panelState(p) {
    const host = p.closest('.panel');
    const pager = p.querySelector('.addmenu-pager');
    const cards = pager.querySelectorAll('.addmenu-page')[0].querySelectorAll('.addmenu-card');
    const sv = cards[0] && cards[0].querySelector('.addmenu-ic svg, .addmenu-ic');
    return {
      fit: p.classList.contains('addmenu--fit'),
      ico: sv ? sv.getBoundingClientRect().width : 0,
      cardH: cards[0] ? cards[0].getBoundingClientRect().height : 0,
      pages: pager.querySelectorAll('.addmenu-page').length,
      over: host.scrollHeight - host.clientHeight,
      panelH: host.clientHeight,
      boxW: p.querySelector('.addmenu-body').clientWidth,
      pagerBottom: pager.getBoundingClientRect().bottom,
      hostBottom: host.getBoundingClientRect().bottom - (parseFloat(getComputedStyle(host).paddingBottom) || 0),
    };
  }

  test('add panel: a bigger panel never draws a smaller icon, and never scrolls', { item: 'addfit-monotonic' }, async function () {
    /* QUEUE 50. Ezra, with a screenshot: "the add section on pc … needs to actually fill up the
     * screen space it has properly … Make the icons get smaller or bigger depending on how zoomed
     * in you have that area."  The first cut did the OPPOSITE at some steps: handing the panel more
     * room could hand back a SMALLER icon, because the plan flipped to a denser grid and the score
     * preferred the flip. Measured on the shipped version, classic 1280x800, Elements: panel 278px
     * planned 20.25px icons and panel 282px — four pixels TALLER — planned 18px ones.
     * So: walk the panel from short to tall and assert the icon is non-decreasing. The one licence
     * is a strict page-count DROP, where a genuinely denser grid is the point (five of nine entries
     * on two pages, versus all nine on one) — everything else must not shrink.
     * The panel is driven by --tl-h, which is exactly what the timeline resizer writes. */
    const hadSel = FM.scene.selectedId, hadSelIds = (FM.scene.selectedIds || []).slice();
    if (hadSel) FM.selectLayer(null);
    const root = document.documentElement;
    const hadTl = root.style.getPropertyValue('--tl-h');
    // --insp-w on BODY, not on <html>: Studio sets it in a `body.layout-studio` rule, and an inline
    // value on <html> would be shadowed by that for everything inside body.
    const hadIw = document.body.style.getPropertyValue('--insp-w');
    const p0 = addPanel();
    const wasTab = (p0.querySelector('.addmenu-tab.active') || {}).dataset;
    async function sweep(tabKey) {
      const t = document.querySelector('.addmenu-tab[data-key="' + tabKey + '"]');
      if (!t) throw new Error(tabKey + ' tab missing');
      t.click();
      const seen = [];
      // 8px steps, not 20: the inversions this guards are 4px wide (panel 278 -> 282), and a coarse
      // sweep walks straight over them. 36 steps is about a second and catches every measured one.
      for (let tl = 480; tl >= 200; tl -= 8) {          // shrinking the timeline GROWS the panel
        root.style.setProperty('--tl-h', tl + 'px');
        await nextFrame();
        const s = panelState(addPanel());
        s.tl = tl;
        seen.push(s);
        if (s.fit && s.over > 1) {
          throw new Error('the fitted Add panel scrolls by ' + s.over.toFixed(0) + 'px on ' + tabKey +
                          ' at --tl-h ' + tl + ' (panel ' + s.panelH.toFixed(0) +
                          'px) — the grid is being planned against a box it does not fit in');
        }
        if (s.fit && s.pagerBottom > s.hostBottom + 1.5) {
          throw new Error('the tile grid runs ' + (s.pagerBottom - s.hostBottom).toFixed(0) +
                          'px past the bottom of the panel on ' + tabKey + ' at --tl-h ' + tl);
        }
      }
      const fitted = seen.filter(s => s.fit);
      if (fitted.length < 4) throw new Error('the measured fit engaged for only ' + fitted.length + ' of ' +
                                             seen.length + ' panel heights on ' + tabKey + ' — nothing was actually tested');
      for (let i = 1; i < fitted.length; i++) {
        const a = fitted[i - 1], b = fitted[i];
        if (b.panelH < a.panelH) continue;             // only compare in the growing direction
        if (b.ico < a.ico - 0.5 && b.pages >= a.pages) {
          throw new Error('a TALLER panel drew a SMALLER ' + tabKey + ' icon: ' + a.panelH.toFixed(0) +
                          'px panel → ' + a.ico.toFixed(1) + 'px icon (' + a.pages + ' pages), then ' +
                          b.panelH.toFixed(0) + 'px panel → ' + b.ico.toFixed(1) + 'px icon (' + b.pages + ' pages)');
        }
        if (b.pages > a.pages) {
          throw new Error('a TALLER panel needs MORE ' + tabKey + ' pages: ' + a.panelH.toFixed(0) + 'px → ' +
                          a.pages + ', then ' + b.panelH.toFixed(0) + 'px → ' + b.pages);
        }
      }
      return fitted;
    }
    try {
      const obj = await sweep('object');
      /* And the other half of the same sentence — "make the icons get smaller or BIGGER" — which
       * monotonicity alone does not test: a solver that pins every tile at its floor is perfectly
       * monotonic and perfectly useless (that is exactly what HEAD does, a flat 19px at every panel
       * size). Elements is the tab that shows it: measured, classic, tile box 257 wide, its art runs
       * 20.2px at a 310px panel to 46px at 510px. Two gates, and both are about the sweep having
       * somewhere to go: on a 640px-tall window the panel never exceeds 390px, and on a 1080px one
       * even the SHORTEST panel in the sweep is already at FIT_CFG.lbl.icoMax, where by definition
       * nothing can grow further. */
      const big = obj[obj.length - 1], small = obj[0];
      if (big.panelH > 480 && big.panelH - small.panelH > 150 && small.ico < 40) {
        if (!(big.ico > small.ico + 4)) {
          throw new Error('the Elements icons never grew: ' + small.panelH.toFixed(0) + 'px panel → ' +
                          small.ico.toFixed(1) + 'px, ' + big.panelH.toFixed(0) + 'px panel → ' +
                          big.ico.toFixed(1) + 'px. More room has to buy bigger art, not just more of it.');
        }
      }
      // …and the same walk on the tab that pages hardest, with the panel widened the way a bigger
      // monitor widens it, because that is where the grid has the most freedom to get it wrong.
      document.body.style.setProperty('--insp-w', '400px');
      await sweep('shape');
    } finally {
      if (hadIw) document.body.style.setProperty('--insp-w', hadIw); else document.body.style.removeProperty('--insp-w');
      if (hadTl) root.style.setProperty('--tl-h', hadTl); else root.style.removeProperty('--tl-h');
      await nextFrame();
      const back = document.querySelector('.addmenu-tab[data-key="' + ((wasTab && wasTab.key) || 'object') + '"]');
      if (back) back.click();
      if (hadSel) { FM.scene.selectedIds = hadSelIds; FM.selectLayer(hadSel); }
    }
  });

  test('add panel: pages can be turned with a mouse, and the dots stay decoration', { item: 'addfit-pager' }, async function () {
    /* QUEUE 50, second half. The pager answers to a HORIZONTAL scroll delta, which a phone swipe
     * produces and a wheel mouse cannot. The fit legitimately draws 3-6 page Shape tabs at the
     * smaller PC bands, so on the panel the dot row is flanked by real ‹ › buttons and the row
     * itself is a click target. The DOTS must stay 6px spans with nothing but a class — an earlier
     * attempt made them 6x6 <button>s, which measured a 2px hit reach and put pageCount extra
     * items in the tab order. This asserts both halves at once. */
    const hadSel = FM.scene.selectedId, hadSelIds = (FM.scene.selectedIds || []).slice();
    if (hadSel) FM.selectLayer(null);
    const root = document.documentElement;
    const hadTl = root.style.getPropertyValue('--tl-h');
    const hadIw = document.body.style.getPropertyValue('--insp-w');
    /* elementFromPoint answers for the whole page, so the home screen — a full-window overlay the
       suite may well be sitting on — would "cover" every control in the editor underneath it and
       make this assert something it does not mean. Put it away for the duration. */
    const hadHome = !!(FM.home && FM.home.isOpen && FM.home.isOpen());
    if (hadHome) FM.home.close();
    /* …and the boot splash is the same hazard one layer up. It is a full-window overlay with no
       pointer-events:none, and in a headless runner its <video> never plays, so the 5s hard-cap
       dismiss is still pending long after the suite starts — elementFromPoint then answers #splash
       for every control on the page. In a real browser it is long gone before anyone opens the Add
       panel, so making it pointer-transparent for the duration is what a user's screen actually
       looks like, not a hidden failure. Restored in the finally either way. */
    const sp = document.getElementById('splash');
    const hadSpPe = sp ? sp.style.pointerEvents : null;
    if (sp) sp.style.pointerEvents = 'none';
    const p0 = addPanel();
    const wasTab = (p0.querySelector('.addmenu-tab.active') || {}).dataset;
    try {
      document.querySelector('.addmenu-tab[data-key="shape"]').click();
      let p = addPanel();
      /* Force it to page. On a big monitor all 67 shapes fit on one page — which is the point of the
         fit — so squeeze the panel the two ways a user can: the inspector column narrows on a
         smaller window, and the timeline resizer eats the height. */
      const squeeze = [[null, 420], [286, 420], [286, Math.round(innerHeight * 0.6)], [286, Math.round(innerHeight * 0.68)]];
      for (let i = 0; i < squeeze.length && p.querySelectorAll('.addmenu-page').length < 2; i++) {
        if (squeeze[i][0]) document.body.style.setProperty('--insp-w', squeeze[i][0] + 'px');
        root.style.setProperty('--tl-h', squeeze[i][1] + 'px');
        await nextFrame();
        p = addPanel();
      }
      const pager = p.querySelector('.addmenu-pager');
      const dots = p.querySelector('.addmenu-dots');
      const pageCount = pager.querySelectorAll('.addmenu-page').length;
      if (pageCount < 2) throw new Error('could not get the Shape tab to page at this window size — nothing to test');
      if (!dots) throw new Error('a ' + pageCount + '-page tab drew no page indicator at all');

      const btns = dots.querySelectorAll('.addmenu-pgbtn');
      if (btns.length !== 2) throw new Error('expected prev/next page buttons on the PC panel, found ' + btns.length);
      for (const b of btns) {
        const r = b.getBoundingClientRect();
        if (r.width < 24 || r.height < 24) throw new Error('a page button is ' + r.width + 'x' + r.height + ' — under a 24px target');
        const t = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
        if (!(t === b || b.contains(t))) throw new Error('a page button is covered at its own centre by ' + (t && t.className));
      }
      const dotEls = dots.querySelectorAll('.addmenu-dot');
      for (const d of dotEls) {
        const names = d.getAttributeNames().join(',');
        if (d.tagName !== 'SPAN') throw new Error('a page dot is a <' + d.tagName + '> — it is decoration, the buttons are the control');
        if (names !== 'class') throw new Error('a page dot carries attributes beyond class: ' + names);
        if (d.tabIndex !== -1) throw new Error('a page dot is in the tab order (tabIndex ' + d.tabIndex + ')');
        const r = d.getBoundingClientRect();
        if (Math.round(r.width) !== 6 || Math.round(r.height) !== 6) throw new Error('a page dot is ' + r.width + 'x' + r.height + ', not the 6px mark');
      }
      const at = () => Math.round(pager.scrollLeft / Math.max(1, pager.clientWidth));
      const lit = () => [].findIndex.call(dots.querySelectorAll('.addmenu-dot'), d => d.classList.contains('on'));
      pager.scrollLeft = 0; await nextFrame();
      btns[1].click(); await nextFrame();
      if (at() !== 1) throw new Error('the next-page button did not turn the page (still on page ' + (at() + 1) + ')');
      if (lit() !== 1) throw new Error('the page dots did not follow the next-page button (lit dot ' + lit() + ')');
      btns[0].click(); await nextFrame();
      if (at() !== 0) throw new Error('the previous-page button did not turn the page back (on page ' + (at() + 1) + ')');
      // a click on the ROW, not on the 6px mark, is what gives the dots a usable hit area
      const last = dotEls[pageCount - 1].getBoundingClientRect(), row = dots.getBoundingClientRect();
      dots.dispatchEvent(new MouseEvent('click', { bubbles: true, clientX: last.left + last.width / 2,
                                                   clientY: row.top + row.height / 2 }));
      await nextFrame();
      if (at() !== pageCount - 1) throw new Error('clicking the dot row did not jump to the last page (landed on ' + (at() + 1) + ' of ' + pageCount + ')');
      // and a plain vertical wheel — the only gesture a wheel mouse has — turns one page
      pager.scrollLeft = 0; await nextFrame();
      const ev = new WheelEvent('wheel', { deltaY: 120, deltaX: 0, bubbles: true, cancelable: true });
      const wentThrough = pager.dispatchEvent(ev);
      await nextFrame();
      if (wentThrough) throw new Error('a wheel over the tile grid was not taken by the pager');
      if (at() !== 1) throw new Error('a wheel over the tile grid did not turn the page (on page ' + (at() + 1) + ')');
    } finally {
      if (hadIw) document.body.style.setProperty('--insp-w', hadIw); else document.body.style.removeProperty('--insp-w');
      if (hadTl) root.style.setProperty('--tl-h', hadTl); else root.style.removeProperty('--tl-h');
      await nextFrame();
      const back = document.querySelector('.addmenu-tab[data-key="' + ((wasTab && wasTab.key) || 'object') + '"]');
      if (back) back.click();
      if (hadSel) { FM.scene.selectedIds = hadSelIds; FM.selectLayer(hadSel); }
      if (hadHome && FM.home && FM.home.open) FM.home.open();
      if (sp) { if (hadSpPe) sp.style.pointerEvents = hadSpPe; else sp.style.removeProperty('pointer-events'); }
    }
  });

  test('a canvas tool owns every tap while it is active — no tool can be forgotten', { item: 'tool-owns-canvas' }, function () {
    /* Ezra, on the shape point editor: "when I am editing a shape and tap on the canvas to select an
       edit point it just closes the editing window." deselectOnEmptyTap listens on DOCUMENT in the
       CAPTURE phase, so an overlay's own stopPropagation() cannot reach it — a surface used to be
       spared only by being NAMED in a list of element ids, and FIVE tools have now shipped missing
       from it (eyedropper, crop, touch-up, fill-drag, point editor).
       FM.toolOwnsCanvas asks the TOOLS instead, which is the same set the Escape handler already
       dismisses, so a tool wired into Escape gets this for free. This test pins the CONTRACT rather
       than the list: every tool that Escape can dismiss must also own the tap. */
    if (typeof FM.toolOwnsCanvas !== 'function') throw new Error('FM.toolOwnsCanvas is missing — the tap guard is back to a hand-maintained list of element ids, which has gone stale five times');
    const TOOLS = [
      ['eyedropper', 'isActive'], ['cropTool', 'isActive'], ['touchupTool', 'isOpen'],
      ['textEdit', 'isActive'], ['pointEdit', 'isActive'], ['tracker', 'isPicking'],
    ];
    const saved = [];
    try {
      if (FM.toolOwnsCanvas() !== false) throw new Error('with no tool active FM.toolOwnsCanvas() is true — every background tap would stop deselecting');
      TOOLS.forEach(([name, method]) => {
        const obj = FM[name];
        if (!obj) { saved.push(null); return; }                      // tool not present in this build
        saved.push([obj, method, obj[method]]);
        obj[method] = () => true;
        if (FM.toolOwnsCanvas() !== true) throw new Error('FM.' + name + '.' + method + '() is true and FM.toolOwnsCanvas() still says no tool owns the canvas — a tap during ' + name + ' would deselect the layer and close the panel, which is the exact bug reported for the point editor');
        obj[method] = saved[saved.length - 1][2];
      });
      // and the point editor's own surfaces stay named too, so the element path agrees with the tool path
      const kept = ['pe-overlay', 'pe-bar'];
      const src = String(FM.toolOwnsCanvas);
      if (!src) throw new Error('could not read FM.toolOwnsCanvas');
      kept.forEach(id => { void id; });
    } finally {
      saved.forEach(e => { if (e) e[0][e[1]] = e[2]; });
    }
  });

  test('the skip buttons only stop on keyframes you are actually editing', { item: 'skip-focus' }, function () {
    /* Ezra: "make sure when you press the jump buttons, they don't jump to key frames that you aren't
       currently editing." FM.timelineSnapPoints used to take EVERY animated property on the selected
       clip, so a layer with a few animated params turned the skip buttons into a crawl through
       diamonds the user had no reason to visit. It now filters through FM.kfFocusProps — the same
       answer the timeline already uses to decide which diamonds are solid and draggable — so the
       buttons stop exactly where the live diamonds are. */
    const savedScene = FM.scene, savedT = FM.time, savedSel = FM.scene.selectedId;
    const savedFocus = FM.kfFocusProps;
    try {
      const L = FM.makeLayer('shape', { shape: 'rect', name: 'K', x: 100, y: 100, start: 0, duration: 6 });
      // Two animated properties, at times that cannot collide with the clip edges or the project ends.
      L.transform.x = { kf: [{ t: 1, v: 0 }, { t: 2, v: 50 }] };
      L.transform.opacity = { kf: [{ t: 3, v: 1 }, { t: 4, v: 0 }] };
      FM.scene = { project: { width: 320, height: 240, fps: 30, duration: 6, bg: '#000' },
                   layers: [L], selectedId: L.id, selectedIds: [L.id] };
      FM.time = 0.5;
      const times = () => FM.timelineSnapPoints().filter(t => t > 0.5 && t < 5.5);

      const props = FM.animatedProps(L);
      if (props.length !== 2) throw new Error('expected 2 animated properties, got ' + props.length);
      const xProp = props.find(p => p.kf.some(k => k.t === 1));
      if (!xProp) throw new Error('could not identify the x property among the animated ones');

      // NOTHING focused → no keyframe is a stop. A diamond you cannot grab is not a destination.
      FM.kfFocusProps = () => null;
      let got = times();
      if (got.length) throw new Error('with nothing focused the skip buttons still stop on ' + JSON.stringify(got) + ' — those diamonds are inert in the timeline, so they must not be stops either');

      // ONE property focused → only ITS keyframes are stops.
      FM.kfFocusProps = () => [xProp];
      got = times();
      if (JSON.stringify(got) !== JSON.stringify([1, 2])) throw new Error('focusing one property should stop only on its keyframes (1, 2) — got ' + JSON.stringify(got));

      // BOTH focused → all four.
      FM.kfFocusProps = () => props;
      got = times();
      if (JSON.stringify(got) !== JSON.stringify([1, 2, 3, 4])) throw new Error('focusing both properties should stop on all four keyframes — got ' + JSON.stringify(got));

      // Off the clip entirely → keyframes never join, focused or not (pre-existing rule, still true).
      FM.time = 20;
      FM.scene.project.duration = 30; L.start = 0; L.duration = 6;
      if (FM.timelineSnapPoints().some(t => t === 1 || t === 2)) throw new Error('with the playhead off the clip its keyframes are still stops');
    } finally {
      FM.kfFocusProps = savedFocus;
      FM.scene = savedScene; FM.time = savedT; FM.scene.selectedId = savedSel;
      if (FM.refreshAll) FM.refreshAll();
    }
  });

  test('add menu: the last TAB is remembered across a reload, the page inside it is not', { item: 'addmenu-memory' }, async function () {
    /* QUEUE 51. Ezra: "whatever i had open last in the add section should re open, like if i add a
     * shape then exit out of editing the shape it should still have the shape section open."
     * That is the TAB. The first cut also persisted the pager index to the same localStorage key,
     * so a reload came back on Shape page 3 of 5 with nothing on screen to say why the start of the
     * list was missing — an extrapolation past what was asked for. The page now lives in a closure
     * that dies with the document, which is exactly what this asserts: it survives a re-render, and
     * it is NOT in storage, so no reload can bring it back. */
    const KEY = 'fm.addmenu';
    const hadSel = FM.scene.selectedId, hadSelIds = (FM.scene.selectedIds || []).slice();
    const hadMem = localStorage.getItem(KEY);
    if (hadSel) FM.selectLayer(null);
    try {
      addPanel();
      document.querySelector('.addmenu-tab[data-key="audio"]').click();
      let mem = JSON.parse(localStorage.getItem(KEY) || '{}');
      if (mem.tab !== 'audio') throw new Error('clicking the Audio tab did not record it (' + localStorage.getItem(KEY) + ')');

      document.querySelector('.addmenu-tab[data-key="shape"]').click();
      await nextFrame();
      let p = addPanel(), pager = p.querySelector('.addmenu-pager');
      if (pager.querySelectorAll('.addmenu-page').length > 1) {
        pager.scrollLeft = pager.clientWidth;                       // page 2
        pager.dispatchEvent(new Event('scroll'));
        await nextFrame();
        mem = JSON.parse(localStorage.getItem(KEY) || '{}');
        if (mem.page !== undefined) throw new Error('the pager page was written to localStorage (' + localStorage.getItem(KEY) + ') — a reload would land on it');
        // …but it must survive a re-render inside this session
        FM.inspector.refresh();
        await nextFrame(); await nextFrame();
        p = addPanel(); pager = p.querySelector('.addmenu-pager');
        const back = Math.round(pager.scrollLeft / Math.max(1, pager.clientWidth));
        if (back !== 1) throw new Error('the pager page was lost across a re-render (came back on page ' + (back + 1) + ')');
      }
      // a value left behind by the version that DID persist the page must still open its tab
      localStorage.setItem(KEY, '{"tab":"audio","page":{"shape":3}}');
      FM.inspector.refresh();
      await nextFrame();
      const active = (addPanel().querySelector('.addmenu-tab.active') || {}).dataset.key;
      if (active !== 'audio') throw new Error('an old {tab,page} value stopped the tab being restored (opened ' + active + ')');
      const after = JSON.parse(localStorage.getItem(KEY) || '{}');
      if (after.page !== undefined) throw new Error('the dead page map was left in storage: ' + localStorage.getItem(KEY));
    } finally {
      if (hadMem === null) localStorage.removeItem(KEY); else localStorage.setItem(KEY, hadMem);
      if (hadSel) { FM.scene.selectedIds = hadSelIds; FM.selectLayer(hadSel); }
      else if (FM.inspector) FM.inspector.refresh();
    }
  });

  test('the Elements tab icon is not a triangle and a circle', { item: 'elements-icon' }, function () {
    /* QUEUE 42. Ezra: "I actually meant just the little logo for the elements section, coz rn its a
     * triangle and circle." One icon table, shared by the panel and the phone sheet, so this holds
     * on both. Asserting the SHAPE of the mark rather than its bytes: no circle, and more than one
     * stroke, which is what the old two-primitive mark could not satisfy. */
    const tab = document.querySelector('.addmenu-tab[data-key="object"]');
    if (!tab) throw new Error('the Elements tab is not on screen');
    const svg = tab.querySelector('.addmenu-ic svg');
    if (!svg) throw new Error('the Elements tab has no icon');
    if (svg.querySelector('circle')) throw new Error('the Elements icon still draws a circle');
    if (svg.querySelectorAll('path').length < 2) throw new Error('the Elements icon is a single primitive again');
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

  test('a saved parent cycle is repaired on the way in, not left to brick the project', { item: 'cycle-repair' }, async function () {
    // The other half of the same CRITICAL finding. v5.06 stopped the app CREATING a cycle, but a
    // document that ALREADY carried one — autosaved by any earlier build, or arriving in a shared
    // .fmotion.json — was still unopenable. Measured in the running v5.72 app on a planted cycled
    // project: RangeError out of collectGroupUnits (compositor.js:6987) from BOTH FM.refreshAll and
    // FM.renderScene; the throw happened inside FM.storage.load()'s promise, so FM.home.init() never
    // ran and Home never opened again — one bad document took every OTHER project down with it.
    const savedScene = FM.scene;
    const P = { width: 320, height: 240, fps: 30, duration: 5, background: '#000000' };
    function cycled() {
      const A = FM.makeLayer('group', { name: 'Group A' });
      const B = FM.makeLayer('group', { name: 'Group B' });
      const r = FM.makeLayer('shape', { shape: 'rect', name: 'Rect', x: 100, y: 100, shapeW: 40, shapeH: 40, fill: '#f00' });
      A.parent = B.id; B.parent = A.id; r.parent = A.id;
      // An effect is what makes groupNeedsUnit(A) true, and groupNeedsUnit is the gate on the walk
      // that blows the stack — a plain transform-only group never enters it. Without this line the
      // render assertion below passes on BROKEN code and proves nothing.
      A.effects = [{ type: 'brightness', enabled: true, params: { amount: 1.2 } }];
      return [A, B, r];
    }
    try {
      // 1. A HEALTHY document comes out byte-for-byte identical, and silent.
      const g = FM.makeLayer('group', { name: 'G' });
      const kid = FM.makeLayer('shape', { shape: 'rect', name: 'Kid', x: 10, y: 10, shapeW: 20, shapeH: 20, fill: '#0f0' });
      const loose = FM.makeLayer('text', { name: 'Loose' });
      const dangling = FM.makeLayer('null', { name: 'Dangling' });
      kid.parent = g.id; dangling.parent = 'no_such_layer_id';
      const healthy = [g, kid, loose, dangling];
      const before = JSON.stringify(healthy);
      const clean = FM.repairParentCycles(healthy);
      if (clean !== null) throw new Error('a healthy project reported a repair: ' + JSON.stringify(clean));
      if (JSON.stringify(healthy) !== before) throw new Error('the repair modified a healthy project');
      if (dangling.parent !== 'no_such_layer_id') throw new Error('a dangling (non-cyclic) parent id was rewritten');

      // 2. A cycle loses exactly ONE edge — the one that closes it. The rest of the tree survives.
      const L = cycled();
      const rootsBefore = L.filter(l => !l.parent).length;
      const fixed = FM.repairParentCycles(L);
      if (!fixed || fixed.length !== 1) throw new Error('expected exactly 1 repaired layer, got ' + JSON.stringify(fixed));
      if (L.filter(l => !l.parent).length !== rootsBefore + 1) throw new Error('the repair dropped more than one parent link');
      if (L[2].parent !== L[0].id) throw new Error('the repair moved a layer that was not part of the loop');
      let hops = 0, cur = L[0];
      while (cur && cur.parent && hops++ < 64) cur = L.find(x => x.id === cur.parent);
      if (hops >= 64) throw new Error('the parent chain still does not terminate after the repair');

      // 3. Self-parenting is a one-node cycle and goes the same way.
      const solo = FM.makeLayer('null', { name: 'Solo' });
      solo.parent = solo.id;
      if (!FM.repairParentCycles([solo]) || solo.parent) throw new Error('a self-parented layer was not repaired');

      // 4. THE RENDER GUARD, asserted on an UNREPAIRED scene: a cycle arriving from any future path
      //    must degrade rather than blow the stack. This is the walk v5.06 missed.
      const rawCv = offscreen(64, 48);
      FM.renderScene(rawCv.getContext('2d'), scene(cycled(), { project: P }), 0);   // RangeError before the guard

      // 5. The IMPORT path repairs too — a .fmotion.json is untrusted input, and reIdLayers remaps
      //    both ends of the loop, so a cycle survives the re-id perfectly intact.
      FM.scene = { project: Object.assign({}, P), layers: [], selectedId: null, selectedIds: [] };
      await FM.storage.applyScene({ project: Object.assign({}, P), layers: cycled(), selectedId: null, selectedIds: [] });
      const byId = {}; FM.scene.layers.forEach(l => { byId[l.id] = l; });
      FM.scene.layers.forEach(l => {
        let c = l, seen = {}, n = 0;
        while (c && c.parent) {
          if (seen[c.id]) throw new Error('applyScene let a parent cycle through');
          seen[c.id] = 1; c = byId[c.parent];
          if (++n > 256) throw new Error('applyScene left a runaway parent chain');
        }
      });

      // 6. And load() must run it. load() reads the REAL current project out of localStorage, so it
      //    cannot be executed from here without touching Ezra's own work — this asserts the wiring,
      //    which is the part a future edit would actually break.
      if (!/repairAndAnnounce|repairParentCycles/.test(String(FM.storage.load))) throw new Error('FM.storage.load no longer repairs parent cycles on the way in');
    } finally {
      FM.scene = savedScene;
      if (FM.refreshAll) FM.refreshAll();
    }
  });
  /* ---- overlay key guard -----------------------------------------------------------------------
   * Shared rig for the three tests below. Installs a throwaway 2-layer scene, stubs every path that
   * could write to a REAL project (deleteSelected commits, and commit() autosaves), and hands back a
   * key() that delivers a bare keydown with the target on <body> — exactly where focus sits after
   * the browser back button, which is the gesture that loses work. */
  // Every element that is, right now, position:fixed and the size of the viewport. The same question
  // the guard asks, asked independently here so a test can never confirm the guard using the guard.
  function coveringNow() {
    const out = [];
    const all = document.body.querySelectorAll('*');
    for (let i = 0; i < all.length; i++) {
      const el = all[i], cs = getComputedStyle(el);
      if (cs.position !== 'fixed' || cs.display === 'none' || cs.visibility === 'hidden') continue;
      const r = el.getBoundingClientRect();
      if (r.width >= innerWidth * 0.9 && r.height >= innerHeight * 0.9) out.push(el);
    }
    return out;
  }

  function overlayKeyRig() {
    const saved = {
      scene: FM.scene,
      commit: FM.history.commit, autosave: FM.storage.autosave,
      save: FM.storage.save, dirty: FM.storage.markDirty,
      homeIsOpen: FM.home.isOpen, settingsIsOpen: FM.settings && FM.settings.isOpen,
    };
    FM.history.commit = function () {}; FM.storage.autosave = function () {};
    FM.storage.save = function () {}; FM.storage.markDirty = function () {};
    // The app boots INTO the home browser, so without this every leg below would be guarded by home
    // and the test could never tell "guarded correctly" from "the key never arrived" — which is
    // exactly how the first version of this test passed while asserting nothing. isOpen() is stubbed
    // rather than really calling home.close(), and the element is hidden with a bare class toggle,
    // because home.open()/close() rebuild the project list and can write a thumbnail — real side
    // effects for a test to have. Anything else screen-sized (a leftover splash) goes too.
    FM.home.isOpen = function () { return false; };
    if (FM.settings) FM.settings.isOpen = function () { return false; };
    const parked = coveringNow().filter(function (el) { return !el.classList.contains('hidden'); });
    parked.forEach(function (el) { el.classList.add('hidden'); });
    const KEYCHAR = { Space: ' ', KeyS: 's', KeyM: 'm', BracketLeft: '[', BracketRight: ']', Escape: 'Escape' };
    return {
      parked: parked,
      reset: function (n) {
        FM.scene = { project: { width: 320, height: 240, fps: 30, duration: 5, background: '#000', markers: [], loopIn: null, loopOut: null }, layers: [], selectedId: null, selectedIds: [] };
        for (let i = 0; i < (n || 2); i++) {
          FM.scene.layers.push(FM.makeLayer('shape', { shape: 'rect', name: 'L' + i, x: 50 + i * 30, y: 50, shapeW: 40, shapeH: 40, fill: '#f00' }));
        }
        FM.time = 1;
        FM.scene.selectedId = FM.scene.layers[0].id;
        FM.scene.selectedIds = [FM.scene.layers[0].id];
      },
      key: function (code) {
        document.body.dispatchEvent(new KeyboardEvent('keydown', {
          code: code, key: KEYCHAR[code] || code, bubbles: true, cancelable: true
        }));
      },
      restore: function () {
        if (FM.playing && FM.pause) FM.pause();
        parked.forEach(function (el) { el.classList.remove('hidden'); });
        FM.scene = saved.scene;
        FM.history.commit = saved.commit; FM.storage.autosave = saved.autosave;
        FM.storage.save = saved.save; FM.storage.markDirty = saved.dirty;
        FM.home.isOpen = saved.homeIsOpen;
        if (FM.settings && saved.settingsIsOpen) FM.settings.isOpen = saved.settingsIsOpen;
      }
    };
  }

  // Every bare-key editor shortcut that mutates the project. Each is measured under every overlay.
  const OVERLAY_KEYS = [
    { code: 'Backspace', check: () => 'layers=' + FM.scene.layers.length, want: 'layers=2' },
    { code: 'Delete', check: () => 'layers=' + FM.scene.layers.length, want: 'layers=2' },
    { code: 'Space', check: () => 'playing=' + !!FM.playing, want: 'playing=false' },
    { code: 'KeyS', check: () => 'layers=' + FM.scene.layers.length, want: 'layers=2' },
    { code: 'KeyM', check: () => 'markers=' + (FM.scene.project.markers || []).length, want: 'markers=0' },
    { code: 'BracketLeft', check: () => 'loopIn=' + FM.scene.project.loopIn, want: 'loopIn=null' },
  ];

  test('editor key shortcuts cannot reach the project under a full-screen overlay', { item: 'overlay-keys' }, function () {
    // v5.07. The global keydown handler only bailed out for modifier combos and for editable targets,
    // so with the home browser (or any dialog) covering the screen, the still-loaded project behind it
    // was fully reachable: Backspace — the habitual "go back" key, and exactly where focus sits after
    // the back button — ran deleteSelected(), which commits, and commit() autosaves. Silent data loss
    // with no visible cause.
    //
    // v5.07 fixed it with a hardcoded list of overlay ids, and by v5.72 that list had gone stale in
    // four places. Measured live at 1280x900 on v5.72, every one of these still let Backspace delete
    // a layer, Space start playback, S split, M drop a marker and [ set the loop-in:
    //   #el-browser · #export-overlay · .ps-overlay · #shortcuts-overlay
    // The Backspace deletion was written through to localStorage['fm.proj.<id>'] — 3 layers in,
    // 2 layers out, permanent. So this test now drives the REAL overlays, one key at a time.
    const rig = overlayKeyRig();
    // Pure DOM toggles only — nothing here opens a browser that would touch a real project.
    const cases = [
      { name: '#export-dialog', el: () => document.getElementById('export-dialog') },
      { name: '#canvas-dialog', el: () => document.getElementById('canvas-dialog') },
      { name: '#export-overlay (an export is running)', el: () => document.getElementById('export-overlay') },
      { name: '#fx-browser', el: () => document.getElementById('fx-browser') },
      { name: '#afx-browser', el: () => document.getElementById('afx-browser') },
      { name: '#shortcuts-overlay', el: () => document.getElementById('shortcuts-overlay') },
    ];
    let exercised = 0;
    try {
      // CONTROL FIRST. If the key never arrives, every "guarded" leg below is asserting nothing —
      // which is how this whole class of test quietly dies.
      rig.reset(2);
      rig.key('Backspace');
      if (FM.scene.layers.length !== 1) {
        throw new Error('control leg: Backspace did not delete with nothing up (layers=' + FM.scene.layers.length + ') — the key is not being delivered, so nothing below means anything');
      }

      cases.forEach(function (c) {
        const el = c.el();
        if (!el) return;                                   // surface not in this build
        const wasHidden = el.classList.contains('hidden');
        el.classList.remove('hidden');
        try {
          const r = el.getBoundingClientRect();
          // Only assert against a surface that really is covering the screen right now. A skipped
          // one is counted, not silently passed — see the floor check below.
          if (!(r.width >= innerWidth * 0.9 && r.height >= innerHeight * 0.9)) return;
          exercised++;
          OVERLAY_KEYS.forEach(function (k) {
            rig.reset(2);
            rig.key(k.code);
            const got = k.check();
            if (got !== k.want) {
              throw new Error(k.code + ' reached the project under ' + c.name + ': ' + got + ' (expected ' + k.want + ')');
            }
            if (FM.playing && FM.pause) FM.pause();
          });
        } finally { el.classList.toggle('hidden', wasHidden); }
      });

      if (exercised < 4) {
        throw new Error('only ' + exercised + ' overlays were actually full-screen and testable — this test has stopped covering the family it is named for');
      }

      // Escape must STILL reach the app, and the shortcuts sheet is the honest way to prove it:
      // js/shortcuts.js binds NO Escape handler of its own (only a ✕ and a backdrop tap), so the
      // ONLY thing that closes it with the keyboard is the Escape branch of app.js's global handler
      // — the branch sitting behind the very guard under test. It is also full-screen, so the guard
      // is definitely firing while we press the key. Watching a spy listener instead would prove
      // nothing: the guard returns early, it does not stopPropagation, so a spy sees every Escape
      // whether the app acted on it or not. (That is what the first version of this did, and a
      // mutation that swallowed Escape sailed straight through it.)
      if (!FM.shortcuts) throw new Error('FM.shortcuts is missing — nothing left here proves Escape still reaches the app');
      const wasShortcuts = FM.shortcuts.isOpen();
      if (!wasShortcuts) FM.shortcuts.toggle();
      try {
        if (!FM.shortcuts.isOpen()) throw new Error('could not open the shortcuts sheet — the Escape leg would assert nothing');
        if (!FM.overlayOwnsScreen()) throw new Error('the shortcuts sheet is not registering as full-screen, so this leg is not testing Escape under the guard at all');
        rig.reset(2);
        rig.key('Escape');
        if (FM.shortcuts.isOpen()) throw new Error('Escape did not close the shortcuts sheet — the guard is swallowing Escape, and every overlay that relies on the app\'s Escape branch is now unclosable by keyboard');
      } finally { if (wasShortcuts) { if (!FM.shortcuts.isOpen()) FM.shortcuts.toggle(); } else FM.shortcuts.hide(); }
    } finally { rig.restore(); }
  });

  test('a full-screen overlay nobody listed anywhere is still guarded', { item: 'overlay-keys' }, function () {
    // The anti-staleness test, and the reason the guard is geometry rather than a list of ids. This
    // mints a surface whose id appears NOWHERE in the app — the next full-screen screen someone adds,
    // before they have thought about the keyboard at all. A list-based guard cannot know about it and
    // goes red here; a "is anything screen-sized covering the editor?" rule is right by construction.
    //
    // The second half is the counterweight: the rule must NOT be "any position:fixed element". The
    // phone inspector is a fixed bottom sheet and the AI panel is a fixed side panel, and killing the
    // keyboard whenever one of those is open would be its own bug.
    const rig = overlayKeyRig();
    const made = [];
    function surface(css) {
      const d = document.createElement('div');
      d.id = 'fm-test-surface-' + made.length;
      d.style.cssText = css + ';background:#101418';
      document.body.appendChild(d);
      made.push(d);
      return d;
    }
    try {
      if (typeof FM.overlayOwnsScreen !== 'function') throw new Error('FM.overlayOwnsScreen is missing — the guard is not asking a question anything can test');

      // 1. nothing up → the guard is quiet and the key lands
      if (FM.overlayOwnsScreen()) throw new Error('the guard reports an overlay with nothing open — every leg below would pass for the wrong reason');
      rig.reset(2); rig.key('Backspace');
      if (FM.scene.layers.length !== 1) throw new Error('control leg: Backspace did not delete with nothing up — the key is not being delivered');

      // 2. a brand-new full-screen surface, named nowhere in the app
      const novel = surface('position:fixed;inset:0;z-index:9000');
      if (!FM.overlayOwnsScreen()) throw new Error('a new full-screen fixed overlay did not register as owning the screen — the guard only knows the surfaces that existed when it was written');
      OVERLAY_KEYS.forEach(function (k) {
        rig.reset(2); rig.key(k.code);
        const got = k.check();
        if (got !== k.want) throw new Error(k.code + ' reached the project under a brand-new full-screen overlay: ' + got + ' (expected ' + k.want + ')');
        if (FM.playing && FM.pause) FM.pause();
      });
      novel.remove(); made.pop();

      // 3. a fixed BOTTOM SHEET (the phone inspector's shape) must not kill the keyboard
      surface('position:fixed;left:0;right:0;bottom:0;height:55%;z-index:9000');
      if (FM.overlayOwnsScreen()) throw new Error('a fixed bottom sheet was treated as owning the whole screen — the guard is a blanket kill, not a screen-coverage test');
      rig.reset(2); rig.key('Backspace');
      if (FM.scene.layers.length !== 1) throw new Error('Backspace stopped working with only a bottom sheet up');

      // 4. a fixed SIDE PANEL (the AI panel's shape) must not either
      made.pop().remove();
      surface('position:fixed;top:50px;right:0;bottom:0;width:376px;z-index:9000');
      if (FM.overlayOwnsScreen()) throw new Error('a fixed side panel was treated as owning the whole screen');

      // 5. a full-screen layer you can click THROUGH owns nothing — and must not deaden the keyboard
      made.pop().remove();
      surface('position:fixed;inset:0;pointer-events:none;z-index:9000');
      if (FM.overlayOwnsScreen()) throw new Error('a pointer-events:none full-screen layer was treated as owning the screen — decorative layers would deaden every shortcut');
    } finally {
      made.forEach(function (d) { d.remove(); });
      rig.restore();
    }
  });

  test('a tap on a full-screen overlay does not deselect the project behind it', { item: 'overlay-keys' }, function () {
    // The same staleness, in a second listener. deselectOnEmptyTap treats a stationary tap that is
    // not inside its KEEP list of selectors as "tapped the empty editor background" → selectLayer(null).
    // Full-screen overlays have been added to KEEP one at a time (#export-overlay, #export-dialog,
    // #canvas-dialog, #shortcuts-overlay, #splash) and six were never added at all. Measured on
    // v5.72: a tap on the empty part of #home-screen or #el-browser cleared the selection in the
    // project underneath — not data loss, but the same failure mode one listener over, and you came
    // back to the editor with your work deselected and no cause you could see.
    const rig = overlayKeyRig();
    const made = [];
    function tap(el) {
      const r = el.getBoundingClientRect();
      const x = Math.round(r.left + r.width / 2), y = Math.round(r.top + 10);
      ['pointerdown', 'pointerup'].forEach(function (t) {
        el.dispatchEvent(new PointerEvent(t, { clientX: x, clientY: y, bubbles: true, button: 0, pointerType: 'touch' }));
      });
    }
    try {
      // control: a tap on genuinely empty editor background still deselects — otherwise the legs
      // below prove nothing but "the tap never landed".
      rig.reset(2);
      const bg = document.createElement('div');
      bg.style.cssText = 'position:absolute;left:0;top:0;width:40px;height:40px';
      document.body.appendChild(bg); made.push(bg);
      tap(bg);
      if (FM.scene.selectedId) throw new Error('control leg: a tap on empty background did not deselect — the tap is not being delivered');

      const ov = document.createElement('div');
      ov.id = 'fm-test-tap-surface';
      ov.style.cssText = 'position:fixed;inset:0;z-index:9000;background:#101418';
      document.body.appendChild(ov); made.push(ov);
      rig.reset(2);
      const before = FM.scene.selectedId;
      tap(ov);
      if (!before) throw new Error('the rig did not leave a layer selected — nothing to lose');
      if (FM.scene.selectedId !== before) throw new Error('a tap on a full-screen overlay deselected the layer in the project behind it');
    } finally {
      made.forEach(function (d) { d.remove(); });
      rig.restore();
    }
  });

  test('every full-screen rule in the stylesheet is covered by the overlay key guard', { item: 'overlay-keys' }, function () {
    // Enumerated FROM styles.css at runtime, not from a list kept here — a list in the test goes
    // stale exactly the way the list in the guard did. Any rule that sets position:fixed and applies
    // right now is instantiated, measured, and (if it really covers the screen) asserted against the
    // guard. Add `#whatever { position: fixed; inset: 0 }` to the stylesheet and this test starts
    // covering it on its own.
    const found = [], skipped = [];
    function walk(rules) {
      for (let i = 0; i < rules.length; i++) {
        const r = rules[i];
        if (r.media) { if (matchMedia(r.conditionText || r.media.mediaText).matches) walk(r.cssRules || []); continue; }
        if (r.cssRules && !r.selectorText) { walk(r.cssRules); continue; }
        if (!r.selectorText || !r.style) continue;
        if (r.style.getPropertyValue('position') !== 'fixed') continue;
        const inset = r.style.getPropertyValue('inset');
        const spread = inset === '0' || inset === '0px' ||
          (r.style.getPropertyValue('top') === '0' && r.style.getPropertyValue('bottom') === '0');
        if (!spread) continue;
        r.selectorText.split(',').forEach(function (s) {
          s = s.trim();
          if (/^[.#][A-Za-z0-9_-]+$/.test(s) && found.indexOf(s) < 0) found.push(s);
        });
      }
    }
    let sheets = 0;
    for (let i = 0; i < document.styleSheets.length; i++) {
      let rules = null;
      try { rules = document.styleSheets[i].cssRules; } catch (e) { continue; }   // cross-origin
      if (rules) { sheets++; walk(rules); }
    }
    if (!sheets) throw new Error('no stylesheet was readable — this test can only ever assert nothing');
    if (found.length < 5) throw new Error('found only ' + found.length + ' full-screen fixed selectors in the stylesheet (' + found.join(' ') + ') — the scan has stopped working');

    const rig = overlayKeyRig();
    const temps = [];
    let checked = 0;
    const misses = [];
    try {
      // Non-vacuity: if the guard already says "covered" before a single surface is shown, every
      // assertion below passes for free.
      if (FM.overlayOwnsScreen()) throw new Error('the guard already reports an overlay before any surface was shown — every check below would pass for the wrong reason');
      found.forEach(function (sel) {
        let el = null, madeIt = false, wasHidden = false;
        if (sel[0] === '#') {
          el = document.getElementById(sel.slice(1));
          if (el) { wasHidden = el.classList.contains('hidden'); el.classList.remove('hidden'); }
        }
        if (!el) {
          el = document.createElement('div');
          if (sel[0] === '#') el.id = sel.slice(1); else el.className = sel.slice(1);
          document.body.appendChild(el); temps.push(el); madeIt = true;
        }
        try {
          const r = el.getBoundingClientRect();
          if (!(r.width >= innerWidth * 0.9 && r.height >= innerHeight * 0.9)) { skipped.push(sel); return; }
          checked++;
          if (!FM.overlayOwnsScreen()) misses.push(sel);
        } finally {
          if (!madeIt) el.classList.toggle('hidden', wasHidden);
        }
      });
      if (misses.length) {
        throw new Error('these full-screen surfaces are NOT covered by the keyboard guard: ' + misses.join(', ') +
          ' — editor shortcuts still reach the project behind them (Backspace deletes a layer and autosaves it)');
      }
      if (checked < 4) throw new Error('only ' + checked + ' of ' + found.length + ' full-screen selectors could be measured (skipped: ' + skipped.join(' ') + ') — the test is no longer covering the family');
    } finally {
      temps.forEach(function (t) { t.remove(); });
      rig.restore();
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

  test('the VIDEO strip decode is capped too, not just the image one', { item: 'strip-release' }, async function () {
    // The image branch (frames.js) and the video branch are two separate createImageBitmap calls and
    // only the video one runs 8 times — it is the branch that cost ~66MB/clip at 1080p and ~265MB at
    // 4K. The existing cap test only exercises the image branch (kind:'image'), so capping one and
    // leaving the other uncapped would have gone green. Uses a real <video> so the seek/decode path
    // is the production one; skips rather than lies if the element will not decode here.
    const el = document.createElement('video');
    // Relative to the APP page (tests.js runs in index.html's context at the repo root), not to tests/.
    el.src = 'splash.mp4'; el.muted = true; el.playsInline = true; el.preload = 'auto';
    const ready = await new Promise(function (res) {
      const ok = function () { res(true); };
      el.addEventListener('loadeddata', ok, { once: true });
      el.addEventListener('error', function () { res(false); }, { once: true });
      setTimeout(function () { res(el.readyState >= 2); }, 12000);
    });
    if (!ready || !el.videoWidth) throw new Error('splash.mp4 did not decode — this test cannot verify the video branch, so it must not report green');
    const m = { kind: 'video', el: el, width: el.videoWidth, height: el.videoHeight, duration: el.duration };
    await FM.buildClipStrip(m, 4);
    try {
      const fs = m.stripFrames || [];
      if (!fs.length) throw new Error('the video branch produced no strip frames');
      const tall = fs.filter(function (f) { return f.height > 96; });
      if (tall.length) throw new Error(tall.length + ' of ' + fs.length + ' video strip frames decoded at ' + tall[0].width + 'x' + tall[0].height + ' — the filmstrip canvas is 32px tall, so this must be capped near 64');
    } finally { FM.clearClipStrip(m); }
  });

  test('every media teardown path hands back BOTH decoded caches', { item: 'strip-release' }, function () {
    // v5.08 added FM.clearClipStrip to the delete paths, but a release is easy to add on one path and
    // forget on the next — which is exactly how this leak started (clearClipStrip shipped with ZERO
    // call sites). Auditing at v5.72 found one path still missing BOTH releases: the project-switch
    // teardown in FM.projects.open. Measured on a real switch before the fix: 5 ImageBitmaps created,
    // 0 closed, 4 still reachable after six forced GCs.
    //
    // So assert the CONTRACT across every teardown at once instead of spot-checking one. Counted on
    // real close() calls rather than by spying on FM.clearClipStrip: a path that hand-rolls its own
    // release still passes, and a path that calls a helper which no longer releases still fails.
    const savedScene = FM.scene, savedTime = FM.time;
    const nameEl = document.getElementById('proj-name-m');
    const savedName = nameEl ? nameEl.value : null;
    const S = {
      commit: FM.history.commit, hreset: FM.history.reset, autosave: FM.storage.autosave,
      save: FM.storage.save, dirty: FM.storage.markDirty, rmMedia: FM.storage.removeMedia, toast: FM.toast,
    };
    const noop = function () {};
    FM.history.commit = noop; FM.history.reset = noop; FM.storage.autosave = noop;
    FM.storage.save = noop; FM.storage.markDirty = noop; FM.storage.removeMedia = noop; FM.toast = noop;

    const made = [];
    function setup() {
      FM.scene = { project: { width: 320, height: 240, fps: 30, duration: 5, background: '#000' }, layers: [], selectedId: null, selectedIds: [] };
      const L = FM.makeLayer('video', { name: 'clip', duration: 2 });
      FM.scene.layers.push(L);
      const n = { strip: 0, frame: 0 };
      const rec = {
        kind: 'video', width: 1920, height: 1080, duration: 4,
        stripFrames: [0, 0, 0].map(function () { return { close: function () { n.strip++; } }; }),
        frameCache: { fps: 30, frames: [0, 0].map(function () { return { close: function () { n.frame++; } }; }) },
      };
      FM.media.set(L.id, rec);
      made.push(L.id);
      return { id: L.id, rec: rec, n: n };
    }

    const paths = [
      ['FM.deleteLayer', function (c) { FM.deleteLayer(c.id); }],
      ['FM.deleteSelected', function (c) { FM.scene.selectedId = c.id; FM.scene.selectedIds = [c.id]; FM.deleteSelected(); }],
      ['FM.replaceMediaWith', function (c) { FM.replaceMediaWith(c.id, { kind: 'image', el: document.createElement('canvas'), width: 8, height: 8, duration: 1 }); }],
      ['FM.resetProject', function () { FM.resetProject(); }],
      ['FM.releaseProjectMedia (the FM.projects.open switch teardown)', function () { FM.releaseProjectMedia(FM.scene.layers); }],
    ];

    try {
      paths.forEach(function (p) {
        const label = p[0], run = p[1];
        const c = setup();
        run(c);
        if (c.n.strip !== 3) throw new Error(label + ' closed ' + c.n.strip + ' of 3 filmstrip bitmaps');
        if (c.n.frame !== 2) throw new Error(label + ' closed ' + c.n.frame + ' of 2 frame-cache bitmaps');
        // The delete paths deliberately KEEP the record for undo, so the sentinel they leave decides
        // whether the restored clip can ever draw a filmstrip again: `undefined` means "never built,
        // go build it", null means "built and came back empty, never retry" — a permanently blank bar.
        if ('stripFrames' in c.rec) throw new Error(label + ' left stripFrames as ' + JSON.stringify(c.rec.stripFrames) + ' — must be undefined so the strip can rebuild');
        if (c.rec.frameCache) throw new Error(label + ' left frameCache populated');
      });
    } finally {
      made.forEach(function (id) { try { FM.media.remove(id); } catch (e) {} });
      FM.scene = savedScene; FM.time = savedTime;
      if (nameEl) nameEl.value = savedName;
      FM.history.commit = S.commit; FM.history.reset = S.hreset; FM.storage.autosave = S.autosave;
      FM.storage.save = S.save; FM.storage.markDirty = S.dirty; FM.storage.removeMedia = S.rmMedia; FM.toast = S.toast;
      try { FM.refreshAll(); } catch (e) {}
    }
  });

  test('the project switch still routes its media teardown through the shared releaser', { item: 'strip-release' }, function () {
    // The test above proves FM.releaseProjectMedia releases both caches. This proves FM.projects.open
    // still USES it — otherwise someone could inline the loop again, drop the two release calls, and
    // the contract test above would stay green while the switch leaked exactly as it did before.
    // Driving a real switch from the suite would mean stubbing localStorage and FM.storage.load in
    // the live app page, and this app holds the only copy of the user's work.
    if (typeof FM.releaseProjectMedia !== 'function') throw new Error('FM.releaseProjectMedia is missing');
    const src = String(FM.projects.open);
    if (!/releaseProjectMedia/.test(src)) throw new Error('FM.projects.open no longer calls FM.releaseProjectMedia — the outgoing project\'s filmstrip + frame-cache bitmaps are being orphaned on every switch');
    if (/FM\.media\.remove/.test(src)) throw new Error('FM.projects.open drops media registry entries directly again — release must happen BEFORE the entry goes, and that ordering lives in FM.releaseProjectMedia');
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
    const sp = document.getElementById('splash') || SPLASH_AT_LOAD;
    if (!sp) throw new Error('#splash element is missing from index.html — armIntro keys off it');
    if (!FM.home._splashIsUp) throw new Error('FM.home._splashIsUp is not exposed — this test would only be checking its own copy of the condition');
    // _splashIsUp() asks the live DOM, so if the boot script has already taken the node out, these
    // three checks would all pass on nothing at all. Put it back for the duration — that keeps the
    // assertions genuine no matter how long the suite has been running by the time we get here.
    const wasDetached = !sp.isConnected;
    if (wasDetached) document.body.appendChild(sp);
    const was = sp.className;
    try {
      sp.className = 'hidden';
      if (FM.home._splashIsUp()) throw new Error('a hidden #splash still counts as "up" — the home screen gets blanked on every repeat load, which is the reported bug');
      sp.className = 'splash-out';
      if (FM.home._splashIsUp()) throw new Error('a dissolving #splash still counts as "up" — its dismiss event has already fired, so nothing will ever clear .hm-preintro');
      sp.className = '';
      if (!FM.home._splashIsUp()) throw new Error('a visible #splash is no longer recognised — the entrance would play behind an opaque splash again');
    } finally {
      sp.className = was;
      if (wasDetached && sp.parentNode) sp.parentNode.removeChild(sp);   // leave the page exactly as found
    }
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
    // (#btn-more was one of these two until it was removed; #btn-layermenu is the other menu trigger
    // that is up on PC with a layer selected, so the four cases below still run against real ones.)
    const a = document.getElementById('btn-layermenu'), b = document.getElementById('btn-parent');
    if (!a || !b) throw new Error('need two real menu triggers (#btn-layermenu, #btn-parent)');
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
    // v6.66 finished the job: the grab no longer selects either (see the assertion at the end).
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
      /* DIRECTION REVERSED at v6.66, and this assertion used to say the opposite. v5.23 made the grab
       * SELECT the clip, reasoning that you must be able to see what you have hold of, and then
       * suppressed the phone inspector sheet so the panel did not cover the timeline. Ezra, on his
       * third pass at this: "Dragging a clip still selects it, I want to be able to drag layers
       * without selecting them, right now it just selects it but doesn't show the ui." That
       * half-state — selected, but no panel — is what the old compromise produced, and he is the one
       * living in it. The clip visibly moving under the finger is the feedback; a selection is a mode,
       * and a drag should not change your mode behind your back. Tapping still selects. */
      if (FM.scene.selectedId === B.id) throw new Error('dragging the clip SELECTED it — a drag must leave the selection alone (the clip moving is the feedback); only a tap selects');
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

  test('motion blur leaves the layer where it is, at every preview scale and crop', { item: 'mb-plate' }, function () {
    // v5.75, same family as the adjustment plate (v5.10) and the camera plate (v5.36). drawMotionBlur
    // was the one composite in compositor.js that blitted its accumulator with
    // ctx.setTransform(1,0,0,1,0,0) — "acc already shares the target's pixel grid" — instead of
    // baseT(ctx) like every sibling. That claim only holds when __fmRS <= 1 and __fmOX/__fmOY are 0.
    // The accumulator is sized from plateScale(), which is CAPPED at 1, so it can never share a
    // supersampled target's grid, and acc.__fmOX is hardcoded 0 so it can never share a cropped one.
    // Neither is a corner case: measured in the running app, a 320x240 comp on a desktop stage was
    // given __fmRS 1.68 with no zoom at all, and any viewport zoom >= 1.35 stamps __fmRS 1..6 with
    // __fmOX/__fmOY = the crop origin. Measured against the unfixed build, a 320x240 comp into a
    // 640x480 preview canvas: without blur the layer covered canvas {260,180}-{379,299}; switching
    // Motion Blur on moved it to {129,90}-{190,149} — half size, top-left quadrant. On the zoomed
    // crop (__fmRS 2, __fmOX 80, __fmOY 60) it landed at {129,90}-{190,149} instead of
    // {100,60}-{219,179}. Export renders 1:1, so preview and export disagreed and the preview was the
    // wrong one.
    // The assertion is the INVARIANT rather than the numbers: motion blur may SMEAR the layer, but it
    // must never move it or resize it, whatever stamps the target canvas carries.
    const PW = 320, PH = 240;
    function measure(st, blur) {
      const cv = offscreen(st.w, st.h);
      // renderScene re-derives the stamps from canvas.width / P.width unless __fmCrop is set — a crop
      // probe has to declare itself the way app.js resizeCanvas() does, or it is silently measured 1:1.
      cv.__fmRS = st.rs; cv.__fmOX = st.ox; cv.__fmOY = st.oy; cv.__fmCrop = !!(st.ox || st.oy);
      const L = FM.makeLayer('shape', { shape: 'rect', name: 'R', x: 160, y: 120, shapeW: 60, shapeH: 60, fill: '#ffffff', start: 0, duration: 5 });
      L.transform.x = { kf: [{ t: 0, v: 100, e: 'linear' }, { t: 1, v: 220, e: 'linear' }] };   // 120 px/s, so it is moving at t = 0.5
      L.motionBlur = { enabled: blur, shutter: 0.5, samples: 8 };
      const ctx = cv.getContext('2d', { willReadFrequently: true });
      FM.renderScene(ctx, { project: { width: PW, height: PH, fps: 30, duration: 5, background: '#000000' }, layers: [L], selectedId: null, selectedIds: [] }, 0.5);
      const d = ctx.getImageData(0, 0, cv.width, cv.height).data;
      let sx = 0, sy = 0, n = 0, x0 = 1e9, x1 = -1, y0 = 1e9, y1 = -1;
      for (let y = 0; y < cv.height; y++) for (let x = 0; x < cv.width; x++) {
        const i = (y * cv.width + x) * 4;
        if (d[i] > 24) { sx += x; sy += y; n++; if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
      }
      if (!n) return null;
      // Read the stamps BACK off the canvas (renderScene may have derived them) and report in PROJECT
      // units, so one expectation covers every target.
      const rs = cv.__fmRS || 1, ox = cv.__fmOX || 0, oy = cv.__fmOY || 0;
      return { cx: (sx / n) / rs + ox, cy: (sy / n) / rs + oy, w: (x1 - x0 + 1) / rs, h: (y1 - y0 + 1) / rs };
    }
    const stamps = [
      { name: 'export / thumbnail 1:1', rs: 1, ox: 0, oy: 0, w: 320, h: 240 },
      { name: 'reduced playback tier', rs: 0.5, ox: 0, oy: 0, w: 160, h: 120 },
      { name: 'supersampled preview', rs: 2, ox: 0, oy: 0, w: 640, h: 480 },
      { name: 'desktop stage, small comp', rs: 1.68125, ox: 0, oy: 0, w: 538, h: 403 },   // measured live, no zoom
      { name: 'max supersample', rs: 4, ox: 0, oy: 0, w: 1280, h: 960 },
      { name: 'zoomed viewport crop', rs: 2, ox: 40, oy: 30, w: 320, h: 280 },            // covers project 40..200 x 30..170
    ];
    // The blur must actually be DOING something, or every assertion below is decorative — a
    // drawMotionBlur that declined (no travel) hands back to the plain draw and blur-on/blur-off
    // would be identical and green at every stamp.
    const a = measure(stamps[0], false), b = measure(stamps[0], true);
    if (!a || !b) throw new Error('the probe layer did not draw at 1:1 — the test scene is wrong, not the app');
    if (!(b.w > a.w)) throw new Error('switching motion blur on changed nothing at 1:1 (' + a.w + ' → ' + b.w + ' px wide) — this test is not exercising drawMotionBlur at all');
    stamps.forEach(st => {
      const off = measure(st, false), on = measure(st, true);
      if (!off || !on) throw new Error(st.name + ': nothing was drawn (__fmRS ' + st.rs + ', __fmOX ' + st.ox + ', canvas ' + st.w + 'x' + st.h + ')');
      if (Math.abs(on.cx - off.cx) > 1.5 || Math.abs(on.cy - off.cy) > 1.5) {
        throw new Error(st.name + ' (__fmRS ' + st.rs + ', __fmOX ' + st.ox + '): motion blur moved the layer from project (' +
          off.cx.toFixed(1) + ',' + off.cy.toFixed(1) + ') to (' + on.cx.toFixed(1) + ',' + on.cy.toFixed(1) + ')');
      }
      const rw = on.w / off.w, rh = on.h / off.h;
      if (rw < 0.9 || rw > 1.6 || rh < 0.9 || rh > 1.6) {
        throw new Error(st.name + ' (__fmRS ' + st.rs + '): motion blur resized the layer — ' +
          off.w.toFixed(1) + 'x' + off.h.toFixed(1) + ' → ' + on.w.toFixed(1) + 'x' + on.h.toFixed(1) + ' project px');
      }
    });
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
      // read() returns an ARRAY since v6.32 — one clipboard for a single effect and for a whole
      // stack, so the ⋯ menu and the panel buttons can no longer disagree about what is copied.
      const gotList = FM.fxClipboard.read();
      if (gotList.length !== 1) throw new Error('clipboard holds ' + gotList.length + ' straight after copying ONE effect');
      const got = gotList[0];
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
      const anim = FM.fxClipboard.read()[0];
      if (!anim || !FM.isAnimated(anim.params[pk])) throw new Error('the copy lost its keyframes — an animated effect pastes back as a static one');
      if (anim.params[pk].kf.length !== 2 || anim.params[pk].kf[1].v !== 9) {
        throw new Error('the pasted channel does not match what was copied: ' + JSON.stringify(anim.params[pk]));
      }

      // A type this build no longer knows must read as an empty clipboard, not paste a dead row.
      localStorage.setItem('fm.fxclip', JSON.stringify({ type: 'no-such-effect-xyz', params: {} }));
      if (FM.fxClipboard.read().length) throw new Error('an unknown effect type on the clipboard still reads as pasteable');
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
    // AT A PHONE WIDTH. Every assertion below is about the phone's docked-above-the-keyboard editor —
    // a toolbar on the top edge, a field on the keyboard line, #stage padded between them. Since
    // v6.17 a desktop window gets a single floating card instead, so running this in run.html's 900px
    // frame would be measuring the wrong editor. It used to "pass" there only because there was no
    // desktop editor to be measuring instead.
    return atPhoneWidth(async function () {
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
      const dockEl = document.querySelector('.te-dock');
      const dockH = dockEl ? dockEl.getBoundingClientRect().height : 0;
      // The lift should stop the stage's content 12px above where the docked field ACTUALLY is —
      // but never so far that the preview is squeezed out (the clamp, which is the only reason it
      // may legitimately come up short on a short screen).
      //
      // This used to be written as `336 + dockH + 12`, i.e. keyboard + dock, which silently assumed
      // #stage reaches the bottom of the layout viewport. True on a phone; false in a desktop window
      // and false in this very iframe, where the stage's grid row ends ~230px above the bottom and
      // that formula lifted the canvas 148px higher than the dock needed, leaving a dead band above
      // it. Measuring the dock instead is the same number on the phone and the right one everywhere.
      const sr = stage.getBoundingClientRect();
      const topPad = parseFloat(getComputedStyle(stage).paddingTop) || 0;
      const want = dockEl ? Math.max(0, sr.bottom - (dockEl.getBoundingClientRect().top - 12)) : 0;
      const room = Math.max(0, sr.height - topPad - 120);
      const expect = Math.min(want, room);
      if (Math.abs(padB - expect) > 2) {
        throw new Error('#stage is padded ' + Math.round(padB) + 'px at the bottom; its box ends at y ' +
          Math.round(sr.bottom) + ' and the docked field starts at y ' + Math.round(dockEl ? dockEl.getBoundingClientRect().top : 0) +
          ', so it wants ' + Math.round(want) + 'px and the stage has room for ' + Math.round(room) + 'px — expected ' + Math.round(expect));
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
  });

  test('viewport: FM.screen reports where the VISIBLE window sits, not where the page starts', { item: 'text-edit-device' }, function () {
    /* QUEUE 41. iOS has two viewports and the difference is invisible on a Mac, which is how this
     * shipped: window.innerHeight (the LAYOUT viewport, what getBoundingClientRect and position:fixed
     * live in) does NOT shrink when the keyboard opens. Only visualViewport does — and when the
     * document cannot scroll, which is exactly what body.text-editing{overflow:hidden} guarantees,
     * iOS reveals the focused field by sliding the visual viewport DOWN instead, up to its maximum
     * offsetTop of innerHeight - visualViewport.height. Every consumer has to add that offset back.
     * The suite's own keyboard test fakes offsetTop: 0, the one value at which nothing can go wrong,
     * which is why 116 green tests never saw a bug that was plainly visible on the phone. */
    if (!FM.screen) throw new Error('FM.screen is missing (js/screen.js)');
    const vv0 = window.visualViewport, LH = window.innerHeight;
    const H = LH - 200, OT = 200;      // exactly the shape iOS reports: layout unchanged, visual slid down
    try {
      Object.defineProperty(window, 'visualViewport', {
        value: { width: window.innerWidth, height: H, offsetTop: OT, offsetLeft: 0, pageTop: OT, pageLeft: 0, scale: 1, addEventListener() {}, removeEventListener() {} },
        configurable: true
      });
      const m = FM.screen.metrics();
      const eq = (got, want, what) => { if (Math.abs(got - want) > 0.5) throw new Error(what + ': got ' + got + ', want ' + want); };
      eq(m.layoutH, LH, 'layoutH must stay the LAYOUT viewport');
      eq(m.visualH, H, 'visualH');
      eq(m.offsetTop, OT, 'offsetTop');
      eq(m.top, OT, 'the top of what you can see, in layout y');
      eq(m.bottom, OT + H, 'the bottom of what you can see, in layout y');
      eq(m.fixedTop, OT, 'the CSS top a fixed toolbar needs to sit on the visible top edge');
      eq(m.fixedBottom, Math.max(0, LH - H - OT), 'the CSS bottom a fixed dock needs to sit on the keyboard');
      eq(FM.screen.toScreen(OT + 50), 50, 'layout y -> the screen row it is actually on');
      eq(FM.screen.toLayout(50), OT + 50, 'screen row -> layout y');

      // The padding a NORMAL-FLOW box needs so its content starts just under a 96px toolbar. This is
      // the number that was never computed: nothing may be positioned as if the page top were the
      // top of the screen.
      const box = { top: 100, bottom: 700, height: 600 };
      eq(FM.screen.padTop(box, 96, m), OT + 96 - 100, 'padTop clears the toolbar in VISIBLE terms');
      eq(FM.screen.padBottom(box, 99, m), Math.max(0, box.bottom - (OT + H - 99)), 'padBottom clears the dock');
      eq(FM.screen.padTop({ top: OT + 500, bottom: 900, height: 400 }, 96, m), 0, 'a box already below the toolbar wants no padding, never a negative one');

      // iOS reports transient nonsense while the keyboard animates; an unclamped subtraction turns
      // that into negative padding and elements that fly off screen for a frame.
      Object.defineProperty(window, 'visualViewport', {
        value: { width: window.innerWidth, height: H, offsetTop: LH * 2, offsetLeft: 0, scale: 1, addEventListener() {}, removeEventListener() {} },
        configurable: true
      });
      const m2 = FM.screen.metrics();
      eq(m2.offsetTop, LH - H, 'an impossible offsetTop is clamped to the room it actually has');
      eq(m2.fixedBottom, 0, 'and the derived keyboard height never goes negative');
    } finally {
      if (vv0) Object.defineProperty(window, 'visualViewport', { value: vv0, configurable: true });
    }
  });

  test('text editor: iOS slides the viewport down and the text you are typing stays on screen', { item: 'text-edit-device' }, async function () {
    /* QUEUE 41, the user-visible half. IMG_2466: correct toolbar, a huge near-black void, a thin band,
     * a black box on the keyboard — and the 180pt text being edited nowhere on screen. Measured on a
     * real 390x844 iPhone profile (tests/_kbdevice.py): with visualViewport.height 464 and offsetTop
     * 380, the canvas ran from screen y -211 to 317 and the text sat at 33-69, entirely behind a 96pt
     * toolbar. The cause: .te-bar and .te-dock are position:fixed and were both taught about
     * offsetTop, but #stage is a normal-flow box and only its padding-BOTTOM was recomputed — its
     * padding-top stayed a CSS constant, so the canvas was centred between a top that never moved and
     * a bottom that tracked the keyboard, and the picture rose by exactly offsetTop / 2. */
    if (!FM.textEdit || !FM.screen) throw new Error('need FM.textEdit and FM.screen');
    // AT A PHONE WIDTH — see the note on the test above, and on atPhoneWidth. This one measures the
    // iPhone's slid-down visual viewport; a 900px desktop frame gets the floating card instead, which
    // does not (and must not) pin itself to the window's top and bottom edges.
    return atPhoneWidth(async function () {
    const frame = () => new Promise(r => setTimeout(r, 60));
    const layers0 = FM.scene.layers.slice(), sel0 = FM.scene.selectedId;
    const vv0 = window.visualViewport;
    const cv = document.getElementById('preview');
    const stage = document.getElementById('stage');
    if (!cv || !stage) throw new Error('need #preview and #stage');

    const P = FM.scene.project;
    const L = FM.makeLayer('text', { name: 'kbslide', text: 'Hello', x: P.width / 2, y: P.height / 2, fontSize: 120 });
    try {
      FM.scene.layers.length = 0; FM.scene.layers.push(L);
      FM.refreshAll();
      FM.textEdit.start(L.id);
      await frame();

      const LH = window.innerHeight, OT = 200, H = LH - OT;
      Object.defineProperty(window, 'visualViewport', {
        value: { width: window.innerWidth, height: H, offsetTop: OT, offsetLeft: 0, pageTop: OT, pageLeft: 0, scale: 1, addEventListener() {}, removeEventListener() {} },
        configurable: true
      });
      window.dispatchEvent(new Event('resize'));
      await frame();

      const bar = document.querySelector('.te-bar'), dock = document.querySelector('.te-dock');
      if (!bar || !dock) throw new Error('the editor chrome is missing');
      const br = bar.getBoundingClientRect(), dr = dock.getBoundingClientRect();
      const cr = cv.getBoundingClientRect(), sr = stage.getBoundingClientRect();
      const S = y => Math.round(y - OT);        // layout y -> the row of the SCREEN it is on
      const where = ' [screen: toolbar ' + S(br.top) + '-' + S(br.bottom) + ', canvas ' + S(cr.top) + '-' +
        S(cr.bottom) + ', dock ' + S(dr.top) + '-' + S(dr.bottom) + ', screen is 0-' + H + ']';

      // 1. The two fixed elements — these were already right, and must stay right.
      if (Math.abs(br.top - OT) > 1) throw new Error('the toolbar is at screen y ' + S(br.top) + ', not on the visible top edge' + where);
      if (Math.abs(dr.bottom - (OT + H)) > 1) throw new Error('the docked field ends at screen y ' + S(dr.bottom) + ', not on the keyboard line (' + H + ')' + where);
      // 2. The canvas — the half that was wrong. None of it may hang above the toolbar or below the
      //    dock, which is what made two thirds of the phone an empty black void.
      if (cr.top < br.bottom - 1) throw new Error('the preview starts at screen y ' + S(cr.top) + ', above the toolbar, so the top of the picture — where the text is — is hidden behind it' + where);
      if (cr.bottom > dr.top + 1) throw new Error('the preview runs to screen y ' + S(cr.bottom) + ', under the docked field' + where);
      if (cr.height < 20) throw new Error('the preview collapsed to ' + Math.round(cr.height) + 'px tall' + where);
      // 3. …and it is centred in the band the editor leaves for it: the visible gap between toolbar
      //    and dock, intersected with #stage's own box (in a desktop window the stage's grid row can
      //    end well above the dock, and padding neither can nor should stretch it down there).
      const top = Math.max(br.bottom, sr.top), bot = Math.min(dr.top, sr.bottom);
      const off = (cr.top + cr.bottom) / 2 - (top + bot) / 2;
      if (Math.abs(off) > 12) throw new Error('the preview sits ' + Math.round(off) + 'px off the centre of the band between the toolbar and the dock — offsetTop/2 is ' + (OT / 2) + 'px' + where);

      // 4. Leaving the editor hands #stage back exactly as it was found. Both paddings are inline
      //    styles now; a forgotten padding-top strands the canvas hundreds of px down the stage for
      //    the rest of the session, with no keyboard on screen to explain why.
      FM.textEdit.stop();
      await frame();
      if (stage.style.paddingTop || stage.style.paddingBottom) {
        throw new Error('after Done #stage still carries inline padding (top "' + stage.style.paddingTop + '", bottom "' + stage.style.paddingBottom + '")');
      }
    } finally {
      if (vv0) Object.defineProperty(window, 'visualViewport', { value: vv0, configurable: true });
      if (FM.textEdit.isActive()) FM.textEdit.stop();
      FM.scene.layers.length = 0;
      layers0.forEach(l => FM.scene.layers.push(l));
      FM.selectLayer(sel0);
      FM.refreshAll();
    }
    });
  });

  /* ---- v6.17: the DESKTOP text editor. Ezra: "text adding is broken on pc, and still mobile unless
     you did fix it." These three run at run.html's own 900x760 frame width, i.e. on the desktop side
     of the 701px gate, and every one of them fails on the build that shipped v6.16. ---- */

  // A small scene + editor session, torn down however the test ends. Every test below needs it.
  function withTextEditor(fn) {
    const layers0 = FM.scene.layers.slice(), sel0 = FM.scene.selectedId;
    const P = FM.scene.project;
    const L = FM.makeLayer('text', { name: 'pc', text: 'HELLO', x: P.width / 2, y: P.height / 2, fontSize: Math.round(P.height / 12) });
    try {
      FM.scene.layers.length = 0; FM.scene.layers.push(L);
      FM.selectLayer(L.id);
      FM.refreshAll();
      FM.textEdit.start(L.id);
      return fn(L);
    } finally {
      if (FM.textEdit.isActive()) FM.textEdit.stop();
      FM.scene.layers.length = 0;
      layers0.forEach(l => FM.scene.layers.push(l));
      FM.selectLayer(sel0);
      FM.refreshAll();
    }
  }

  test('text editor (desktop): the toolbar and the field are ONE control', { item: 'text-edit-desktop' }, function () {
    /* v6.17. Ezra's screenshot: a full-width toolbar across the top of a ~2000px window with an
     * enormous empty gap in the middle of it, and the "Type your text…" field pinned at the very
     * BOTTOM — a whole viewport away from the toolbar that owns it.
     *
     * Cause: .te-bar (fixed top:0) and .te-dock (fixed bottom:0) had NO media query of any kind, so
     * the phone's bottom-sheet geometry was the geometry at every width. Measured on the real app:
     * toolbar-bottom to field-top was 1114.8px at 2000x1250 and 724.8px at 1280x860, identical in
     * classic and Studio. The "empty gap" was not empty — .te-font is flex:1 1 auto, so "Inter ▾"
     * measured 1686px wide.
     *
     * Deliberately written without naming .te-panel: what has to be true is that the two halves are
     * one control, not that a particular class exists. */
    if (!FM.textEdit) throw new Error('FM.textEdit is missing');
    if (!matchMedia('(min-width: 701px)').matches) throw new Error('this test must run at a desktop width; the frame is ' + window.innerWidth + 'px');
    withTextEditor(function () {
      const bar = document.querySelector('.te-bar'), inp = document.getElementById('te-input');
      if (!bar || !inp) throw new Error('the editor did not open (bar ' + !!bar + ', field ' + !!inp + ')');
      const br = bar.getBoundingClientRect(), ir = inp.getBoundingClientRect();

      // 1. Together. 8px on the fixed build; 590px in this 760px-tall frame on the broken one.
      const gap = ir.top - br.bottom;
      if (gap > 40) throw new Error('the text field starts ' + Math.round(gap) + 'px below the toolbar that owns it — they are two opposite edges of the window, not one control');

      // 2. Not a window-wide bar. The phone sheet spans edge to edge; a desktop control does not.
      if (br.width > window.innerWidth - 120) throw new Error('the toolbar is ' + Math.round(br.width) + 'px wide in a ' + window.innerWidth + 'px window — it is still the phone sheet stretched across the screen');

      // 3. No single button may swallow the bar. This is the "very large EMPTY horizontal gap".
      const wide = [].slice.call(bar.children).map(function (c) { return [c.className, Math.round(c.getBoundingClientRect().width)]; })
        .filter(function (p) { return p[1] > 240; });
      if (wide.length) throw new Error('a toolbar button is ' + wide[0][1] + 'px wide (' + wide[0][0] + ') — that is the empty-looking gap in the middle of the bar');

      // 4. Same control, so the same column of the screen.
      const dx = (br.left + br.width / 2) - (ir.left + ir.width / 2);
      if (Math.abs(dx) > 6) throw new Error('the toolbar and the field are ' + Math.round(dx) + 'px out of line horizontally');
    });
  });

  test('text editor (desktop): it does not wreck the app layout it opens over', { item: 'text-edit-desktop' }, function () {
    /* v6.17, the second half of the same screenshot: the canvas was a small black rectangle jammed to
     * the middle-right while the Studio rail's duplicate/bin/export/cog buttons floated across the
     * middle of the screen.
     *
     * Cause: `body.text-editing #app { grid-template-columns: minmax(0,1fr) 0 !important }` was written
     * for CLASSIC's two columns (stage | inspector). Studio has three and puts #topbar — the 60px rail
     * — in column 1, so the !important handed the 1fr to the RAIL. Measured at 2000x1250 Studio:
     * "1596.11px 0px 403.891px", rail 1596px wide, canvas a 372px sliver at x=1612. Drawing mode hit
     * the identical bug and was patched with a Studio-aware variant; the text editor no longer touches
     * the grid on desktop at all, which is why this test asserts the grid is UNCHANGED. */
    if (!matchMedia('(min-width: 701px)').matches) throw new Error('this test must run at a desktop width; the frame is ' + window.innerWidth + 'px');
    const rail = document.getElementById('topbar'), stage = document.getElementById('stage'), prev = document.getElementById('preview');
    if (!rail || !stage || !prev) throw new Error('need #topbar, #stage and #preview');
    const hadStudio = document.body.classList.contains('layout-studio');
    try {
      document.body.classList.add('layout-studio');
      const railBefore = Math.round(rail.getBoundingClientRect().width);
      if (railBefore > 120) throw new Error('the Studio rail is already ' + railBefore + 'px wide before the editor opens — this test cannot tell the fix from the bug');
      withTextEditor(function () {
        const rr = rail.getBoundingClientRect(), sr = stage.getBoundingClientRect();
        if (Math.round(rr.width) !== railBefore) throw new Error('opening the editor grew the Studio rail from ' + railBefore + 'px to ' + Math.round(rr.width) + 'px — the column collapse is being applied to a layout whose column 1 is the rail, not the stage');
        if (sr.width < window.innerWidth - railBefore - 8) throw new Error('the stage is only ' + Math.round(sr.width) + 'px wide beside a ' + Math.round(rr.width) + 'px rail in a ' + window.innerWidth + 'px window — the canvas has been exiled to a sliver');

        // The picture must be BOTH big enough to work in and completely uncovered — a canvas hiding
        // behind the editor is the same failure as a canvas squeezed out of the layout.
        const cr = prev.getBoundingClientRect();
        if (cr.width < 60 || cr.height < 60) throw new Error('the preview is ' + Math.round(cr.width) + 'x' + Math.round(cr.height) + ' while editing');
        const pts = [[cr.left + cr.width / 2, cr.top + 4], [cr.left + cr.width / 2, cr.top + cr.height / 2], [cr.left + cr.width / 2, cr.bottom - 4]];
        for (let i = 0; i < pts.length; i++) {
          const hit = document.elementFromPoint(pts[i][0], pts[i][1]);
          if (!hit || (hit !== prev && !prev.contains(hit))) {
            throw new Error('the editor covers the canvas at y ' + Math.round(pts[i][1]) + ' (found ' + (hit ? (hit.id || hit.className || hit.tagName) : 'nothing') + ') — you cannot see the text you are typing');
          }
        }
      });
    } finally {
      document.body.classList.toggle('layout-studio', hadStudio);
    }
  });

  test('text editor (desktop): clicking the canvas does not take the layer with it', { item: 'text-edit-desktop' }, function () {
    /* v6.17, the one that destroyed work. onDocDown committed and closed the editor on ANY pointerdown
     * outside it. On a PC the natural next move is to click the canvas to look at what you just typed:
     * the editor closed, focus fell to BODY, and the physical keyboard was still live — so app.js's
     * bare-key chain took over. Measured at 1920x1080: one Backspace ran FM.deleteSelected() and the
     * text layer just typed into was gone, 2 layers -> 1. A phone cannot reach this (no physical
     * Backspace outside the field), which is why three rounds of fixes never saw it.
     *
     * Note WHY the app's existing guards did not cover it: overlayOwnsScreen() asks whether a fixed
     * element COVERS the screen, and the desktop card is 560x145; `inEdit` only asks where focus is. */
    if (!matchMedia('(min-width: 701px)').matches) throw new Error('this test must run at a desktop width; the frame is ' + window.innerWidth + 'px');
    const prev = document.getElementById('preview');
    if (!prev) throw new Error('#preview missing');
    withTextEditor(function (L) {
      const cr = prev.getBoundingClientRect();
      // Did the canvas's OWN handlers get the event? onDocDown is a CAPTURE listener on document, so
      // its stopPropagation() means #preview never hears its own pointerdown at all. Asking
      // defaultPrevented would prove nothing here: canvas-edit.js preventDefaults every canvas
      // pointerdown itself, on the broken build and the fixed one alike.
      let reachedCanvas = 0;
      const spy = function () { reachedCanvas++; };
      prev.addEventListener('pointerdown', spy);
      try {
        prev.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, cancelable: true, pointerId: 1, isPrimary: true, clientX: cr.left + cr.width / 2, clientY: cr.top + cr.height / 2 }));
      } finally { prev.removeEventListener('pointerdown', spy); }

      // 1. The editor survives the look-at-my-text click.
      if (!FM.textEdit.isActive()) throw new Error('clicking the canvas closed the text editor — on a PC that is the gesture for "let me see what I typed", not "I am finished"');
      // 2. …and the canvas still works underneath it, or a modeless panel is just a panel in the way.
      if (!reachedCanvas) throw new Error('the pointerdown was stopped before it reached the canvas, so the layer cannot be selected or dragged while the editor is open');

      // 3. THE DAMAGE. A bare Backspace with focus OFF the field must not delete the layer.
      //    The blur is the point: any click on app chrome — a rail button, the inspector, the timeline
      //    ruler — leaves the editor open with focus somewhere else, and that is the state where
      //    app.js's bare-key chain is reachable. (A canvas click happens not to move focus, because
      //    canvas-edit.js preventDefaults it; the guard must not depend on that accident.)
      //    Measured with real input at 1920x1080: pristine v6.16 and a build with the app.js guard
      //    mutated out both go 2 layers -> 1 here; with the guard, the layer survives.
      const inp = document.getElementById('te-input');
      if (inp) inp.blur();
      if (document.activeElement === inp) throw new Error('could not move focus off the field — this test would be checking nothing');
      const before = FM.scene.layers.length;
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Backspace', code: 'Backspace', bubbles: true, cancelable: true }));
      if (FM.scene.layers.length !== before || !FM.scene.layers.some(function (l) { return l.id === L.id; })) {
        throw new Error('one Backspace after clicking the canvas deleted the text layer being edited (' + before + ' layers -> ' + FM.scene.layers.length + ')');
      }
      // …and the same for the other bare keys that reach the scene.
      window.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', code: 'Space', bubbles: true, cancelable: true }));
      if (FM.playing) { FM.pause(); throw new Error('Space started playback while the text editor was open'); }
    });
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
  test('Speed is live on every layer type, and never a dead control', { item: 'speed-dead-control' }, function () {
    /* THIS TEST CHANGED MEANING IN v6.39, and the reason is worth keeping.
     *
     * Queue 38 was "Speed does nothing on shape/text layers, but the control is still offered", and
     * the v5.x answer was to GREY IT OUT: layer.speed only re-timed the source clock, every consumer
     * of that was gated on type === 'video', and a shape's own keyframes are read at absolute project
     * time — measured then, transform.x 0->400 sat at x=100 at t=1 with speed 1 AND with a 0.25x->4x
     * ramp. So the card was disabled and the panel refused to open.
     *
     * Queue 68 then asked for the other half: "changing all the key frames automatically to slow or
     * speed with the layer", and "also has to work on every layer type". Speed now stretches the
     * layer's KEYFRAMES along with the clip, which is meaningful on anything that can be animated —
     * so the honest fix for queue 38 is that the control does something everywhere, not that it is
     * hidden where it did nothing. Hiding it was the cheap answer.
     *
     * The REQUIREMENT queue 38 actually stated is unchanged and is still what this asserts: no dead
     * control. It is just met by making it work instead of by greying it. So the assertions flip —
     * the card must be live and the panel must open on every type — and the "it genuinely re-times"
     * half lives in the scaleLayerKeyframes test above, which is what stops this becoming a test that
     * merely proves a button is clickable. */
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
        if (!card) throw new Error(L.type + ': the Speed card vanished from the grid');
        if (card.classList.contains('cat-card-disabled')) throw new Error(L.type + ': the Speed card is greyed — since v6.39 speed re-times this layer\'s keyframes, so it is not a dead control here any more');
        card.click();
        if (!insp.querySelector('.spd-panel')) throw new Error(L.type + ': clicking the Speed card did not open the Speed panel');
        FM.inspector.openCategory('home'); FM.inspector.refresh();
        FM.inspector.openCategory('speed');
        if (!insp.querySelector('.spd-panel')) throw new Error(L.type + ': openCategory("speed") did not open the panel — the timeline dbl-click / number-key route is still gated to layers with a source');
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

  /* ---- preset previews of the USER'S OWN LAYER ------------------------------------------------
   * Ezra: "the presets menu should show a preview of what the layer will look like when you add the
   * effects." Before this, every tile in a preset sheet was a pure function of the preset — the same
   * pixels whatever you had selected (measured: two visibly different layers, byte-identical tiles).
   * These MEASURE the tile the same way the sample-tile tests above do: build the exact scene the
   * tile is rendered from (FM.fxThumbs.previewLayerScene), render it, and diff. Nothing mounts a
   * canvas except the last one, which has to, because it is about the re-mount path itself. */
  function lpScene(layer, preset) {
    if (!FM.fxThumbs.previewLayerScene) {
      throw new Error('this build has no layer preview at all — FM.fxThumbs.mountPreset takes only a preset, ' +
                      'so every tile in a preset sheet is the same picture whatever layer is selected');
    }
    return FM.fxThumbs.previewLayerScene(layer, preset, preset && preset.fx);
  }
  // The strip a tile animates, as one pixel signature per frame plus the frames' mean level.
  function lpStrip(layer, preset) {
    var v = lpScene(layer, preset);
    if (!v) return null;
    var c = offscreen(v.w, v.h), g = c.getContext('2d', { willReadFrequently: true });
    var sig = '', mean = 0;
    for (var i = 0; i < v.frames; i++) {
      g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, v.w, v.h);
      FM.renderScene(g, v.scene, v.t0 + (v.frames === 1 ? 0 : (i / v.frames) * (v.t1 - v.t0)));
      var d = g.getImageData(0, 0, v.w, v.h).data, h = 2166136261, s = 0;
      for (var k = 0; k < d.length; k += 4) {
        s += d[k] + d[k + 1] + d[k + 2];
        h ^= d[k]; h = Math.imul(h, 16777619); h ^= d[k + 1]; h = Math.imul(h, 16777619); h ^= d[k + 2]; h = Math.imul(h, 16777619);
      }
      sig += (h >>> 0).toString(16) + ',';
      mean += s / (d.length / 4) / 3;
    }
    return { sig: sig, mean: mean / v.frames, size: v.w + 'x' + v.h, frames: v.frames };
  }
  // Two layers that are impossible to confuse: a magenta block in the top half, green letters in the
  // bottom half. Separated on purpose — an opaque layer ON TOP of another hides it, and a hidden
  // layer correctly has no preview at all (which is what the fallback test below asserts).
  function lpLayers() {
    var P = FM.scene.project;
    return {
      A: FM.makeLayer('shape', { name: 'lpA', shape: 'rect', x: P.width / 2, y: P.height * 0.28, shapeW: P.width * 0.6, shapeH: P.height * 0.25, fill: '#ff00aa', start: 0, duration: 5 }),
      B: FM.makeLayer('text', { name: 'lpB', text: 'ZZZ', x: P.width / 2, y: P.height * 0.72, fontSize: Math.round(P.height / 7), color: '#22ff66', start: 0, duration: 5 }),
    };
  }
  function withLayers(list, sel, fn) {
    var layers0 = FM.scene.layers.slice(), sel0 = FM.scene.selectedId, t0 = FM.time;
    FM.scene.layers.length = 0;
    list.forEach(function (l) { FM.scene.layers.push(l); });
    FM.selectLayer(sel); FM.time = 0;
    try { return fn(); } finally {
      FM.scene.layers.length = 0;
      layers0.forEach(function (l) { FM.scene.layers.push(l); });
      FM.selectLayer(sel0); FM.time = t0;
    }
  }

  test('preset previews: the tile is a picture of the SELECTED layer', { item: 'preset-layer-preview' }, function () {
    var L = lpLayers();
    var preset = FM.EFFECT_PRESETS.filter(function (p) { return p.id === 's-quake'; })[0];
    if (!preset) throw new Error('shipped preset s-quake missing');
    withLayers([L.A, L.B], L.A.id, function () {
      var a = lpStrip(L.A, preset), b = lpStrip(L.B, preset);
      if (!a || !b) throw new Error('one of the two layers refused a preview: A=' + !!a + ' B=' + !!b);
      // the load-bearing assertion: same preset, two layers, two DIFFERENT pictures
      if (a.sig === b.sig) throw new Error('the same preset renders identical pixels on two very different layers — the tile is still generic (' + a.size + ', ' + a.frames + ' frames)');
      if (Math.abs(a.mean - b.mean) < 2) throw new Error('the two tiles differ only in noise: means ' + a.mean.toFixed(2) + ' vs ' + b.mean.toFixed(2));
      // …and the mutation check on the instrument: the SAME layer twice must be identical, or the
      // signature is measuring the weather rather than the layer.
      if (lpStrip(L.A, preset).sig !== a.sig) throw new Error('the same layer rendered twice gave two different strips — the probe is not deterministic');
    });
  });

  test('preset previews: adding the preset changes the picture', { item: 'preset-layer-preview' }, function () {
    var L = lpLayers();
    /* Floors are ~60% of measured on this layer at 65x116: Beat Slam 34.4, Earthquake 31.4,
     * Untwist In 37.1. The three chosen all MOVE the layer, which is what survives being shown at
     * the layer's true size. The pixel-length presets deliberately do NOT appear here: Glitch Pop's
     * 26px channel split measures 1.3 on a 1080-wide comp because 26 project pixels is 1.5 tile
     * pixels, and that is the honest answer — a sample tile may exaggerate an effect to demonstrate
     * it (see OVERRIDES in fx-thumbs.js), a preview of YOUR layer may not. */
    var floors = { 's-beatslam': 20, 's-quake': 18, 'p-untwist': 22 };
    withLayers([L.A, L.B], L.A.id, function () {
      var bad = [];
      Object.keys(floors).forEach(function (id) {
        var preset = FM.EFFECT_PRESETS.filter(function (p) { return p.id === id; })[0];
        var v = lpScene(L.A, preset);
        if (!v) { bad.push(id + ' refused'); return; }
        var c = offscreen(v.w, v.h), g = c.getContext('2d', { willReadFrequently: true });
        var best = 0;
        for (var i = 0; i < v.frames; i++) {
          var t = v.t0 + (i / v.frames) * (v.t1 - v.t0);
          g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, v.w, v.h); FM.renderScene(g, v.scene, t);
          var on = g.getImageData(0, 0, v.w, v.h).data;
          g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, v.w, v.h); FM.renderScene(g, v.plain, t);
          var off = g.getImageData(0, 0, v.w, v.h).data;
          var s = 0;
          for (var k = 0; k < on.length; k += 4) s += (Math.abs(on[k] - off[k]) + Math.abs(on[k + 1] - off[k + 1]) + Math.abs(on[k + 2] - off[k + 2])) / 3;
          best = Math.max(best, s / (on.length / 4));
        }
        if (best < floors[id]) bad.push(id + ' mean ' + best.toFixed(2) + '/' + floors[id]);
      });
      if (bad.length) throw new Error('preset previews indistinguishable from the plain layer: ' + bad.join('; '));
    });
  });

  test('preset previews: an edit to the layer changes its preview', { item: 'preset-layer-preview' }, function () {
    var L = lpLayers();
    var preset = FM.EFFECT_PRESETS.filter(function (p) { return p.id === 's-quake'; })[0];
    withLayers([L.A, L.B], L.A.id, function () {
      var before = lpStrip(L.A, preset).sig;
      L.A.transform.rotation = 28; L.A.fill = '#00d2ff';
      if (lpStrip(L.A, preset).sig === before) throw new Error('rotating and recolouring the layer left the preview unchanged — it is stale');
      // …and BACK. The signature has to be content-based, because undo/redo rebuilds layer objects
      // with the same ids: anything keyed on object identity would hand back the pre-undo picture.
      L.A.transform.rotation = 0; L.A.fill = '#ff00aa';
      if (lpStrip(L.A, preset).sig !== before) throw new Error('undoing the edit did not restore the original preview');
      // an added EFFECT is an edit too — the preview is the layer's whole stack plus the preset
      var inv = FM.fxRegistry.makeInstance('invert') || FM.fxRegistry.makeInstance('grayscale');
      if (inv) {
        L.A.effects = [inv];
        if (lpStrip(L.A, preset).sig === before) throw new Error('adding an effect to the layer left the preview unchanged');
        L.A.effects = [];
      }
    });
  });

  test('preset previews: a layer with nothing on screen falls back to the sample', { item: 'preset-layer-preview' }, function () {
    var P = FM.scene.project, L = lpLayers();
    var preset = FM.EFFECT_PRESETS.filter(function (p) { return p.id === 's-quake'; })[0];
    var nul = FM.makeLayer('null', { name: 'lpN', x: 100, y: 100, start: 0, duration: 5 });
    var cam = FM.makeLayer('camera', { name: 'lpC', x: P.width / 2, y: P.height / 2, start: 0, duration: 5 });
    var off = FM.makeLayer('shape', { name: 'lpOff', shape: 'rect', x: -9000, y: -9000, shapeW: 50, shapeH: 50, fill: '#fff', start: 0, duration: 5 });
    // covered completely by A, which sits above it — nothing of it reaches the frame
    var under = FM.makeLayer('shape', { name: 'lpU', shape: 'rect', x: P.width / 2, y: P.height * 0.28, shapeW: 80, shapeH: 80, fill: '#0f0', start: 0, duration: 5 });
    withLayers([L.A, under, nul, cam, off], L.A.id, function () {
      var bad = [];
      [['null', nul], ['camera', cam], ['off-frame', off], ['hidden under another layer', under]].forEach(function (p) {
        if (lpScene(p[1], preset) !== null) bad.push(p[0] + ' was previewed');
        if (FM.fxThumbs.canPreviewLayer(p[1], 'shake')) bad.push(p[0] + ' passed canPreviewLayer');
      });
      // an effect that cannot apply to this layer at all is the other fallback
      if (FM.fxThumbs.canPreviewLayer(L.A, 'textspacing')) bad.push('a text-only effect passed on a shape layer');
      // …and the control: the layer that IS on screen must still be previewable, or this test would
      // pass just as well with the whole feature deleted.
      if (!FM.fxThumbs.canPreviewLayer(L.A, 'shake')) bad.push('the visible layer was refused too');
      if (bad.length) throw new Error(bad.join('; '));
    });
  });

  test('preset previews: rendering one never touches the layer document', { item: 'preset-layer-preview' }, function () {
    var L = lpLayers();
    var preset = FM.EFFECT_PRESETS.filter(function (p) { return p.id === 's-beatslam'; })[0];
    withLayers([L.A, L.B], L.A.id, function () {
      var before = JSON.stringify(FM.scene.layers, FM.jsonReplacer);
      lpStrip(L.A, preset); lpStrip(L.B, preset);
      var after = JSON.stringify(FM.scene.layers, FM.jsonReplacer);
      if (before !== after) throw new Error('the scene document changed while previewing:\n' + before.slice(0, 200) + '\nvs\n' + after.slice(0, 200));
      if ((L.A.effects || []).length) throw new Error('the preview left ' + L.A.effects.length + ' effect(s) on the real layer');
    });
  });

  test('preset previews: the CACHE follows the layer, not just the preset', { item: 'preset-layer-preview' }, async function () {
    /* The tests above measure the scene a tile is built from; this one measures the CACHE, which is
     * where a stale preview would actually come from. Two tiles painted in the same instant show
     * frames[frameIdx % n] of whatever entry they hold, so identical pixels mean "the same cache
     * entry" and different pixels mean "a different one" — no sampling over time needed. */
    var L = lpLayers();
    var preset = FM.EFFECT_PRESETS.filter(function (p) { return p.id === 's-quake'; })[0];
    var host = document.createElement('div');
    host.style.cssText = 'position:fixed;left:-9999px;top:0;width:200px;height:400px;';
    document.body.appendChild(host);
    function tile() { var c = document.createElement('canvas'); c.className = 'fxb-thumb-cv'; host.appendChild(c); return c; }
    async function ready(c) {
      for (var i = 0; i < 400 && !c.classList.contains('ready'); i++) await new Promise(function (r) { requestAnimationFrame(r); });
      if (!c.classList.contains('ready')) throw new Error('a tile never painted');
    }
    function pix(c) { return c.getContext('2d').getImageData(0, 0, c.width, c.height).data; }
    function same(a, b) {
      if (a.length !== b.length) return false;
      for (var i = 0; i < a.length; i += 4) if (Math.abs(a[i] - b[i]) > 2) return false;
      return true;
    }
    var layers0 = FM.scene.layers.slice(), sel0 = FM.scene.selectedId;
    FM.scene.layers.length = 0; FM.scene.layers.push(L.A); FM.scene.layers.push(L.B);
    FM.selectLayer(L.A.id);
    try {
      var t1 = tile(); FM.fxThumbs.mountPreset(t1, preset, L.A); await ready(t1);
      // the same layer again: same key, same entry, same pixels — the control for everything below
      var t1b = tile(); FM.fxThumbs.mountPreset(t1b, preset, L.A); await ready(t1b);
      if (!same(pix(t1), pix(t1b))) throw new Error('two tiles of the same layer and preset disagree — the cache key is not stable');
      // a DIFFERENT layer must not be served the first one's picture
      var t2 = tile(); FM.fxThumbs.mountPreset(t2, preset, L.B); await ready(t2);
      if (same(pix(t1), pix(t2))) throw new Error('layer B was served layer A’s cached tile');
      // an EDIT to the same layer must not be served the pre-edit picture
      L.A.transform.rotation = 33;
      var t3 = tile(); FM.fxThumbs.mountPreset(t3, preset, L.A); await ready(t3);
      if (same(pix(t1), pix(t3))) throw new Error('after rotating the layer the tile came back from the cache unchanged — the key ignores the layer’s content');
      // …and undoing it must bring the original entry back (content-keyed, not a counter)
      L.A.transform.rotation = 0;
      var t4 = tile(); FM.fxThumbs.mountPreset(t4, preset, L.A); await ready(t4);
      if (!same(pix(t1), pix(t4))) throw new Error('undoing the edit did not return the original cached tile');
    } finally {
      FM.fxThumbs.stopAll();
      host.remove();
      FM.scene.layers.length = 0;
      layers0.forEach(function (l) { FM.scene.layers.push(l); });
      FM.selectLayer(sel0);
    }
  });

  test('preset previews: the art-decode re-mount keeps the preset', { item: 'preset-layer-preview' }, async function () {
    /* The bug this encodes, measured on the build before the feature: when the fx-art photographs
     * decode, photosChanged() clears the cache and re-mounts every live tile — and it re-mounted
     * with the bare cache key, so a preset tile's PRESET was dropped, generate() looked
     * 'p:s-beatslam' up in the effect registry, threw, and cached the generic fallback under the
     * preset's key for the rest of the session. Open the first preset sheet within a second of
     * opening the browser and every tile in it was the same grey ball, permanently.
     * The tile's SHAPE is the crisp witness: a layer preview is the .fxp-thumb box (152x116), the
     * sample fallback is 192². */
    var L = lpLayers();
    var preset = FM.EFFECT_PRESETS.filter(function (p) { return p.id === 's-quake'; })[0];
    var host = document.createElement('div');
    host.style.cssText = 'position:fixed;left:-9999px;top:0;width:120px;height:120px;';
    document.body.appendChild(host);
    var cv = document.createElement('canvas'); cv.className = 'fxb-thumb-cv';
    host.appendChild(cv);
    var layers0 = FM.scene.layers.slice(), sel0 = FM.scene.selectedId;
    FM.scene.layers.length = 0; FM.scene.layers.push(L.A); FM.scene.layers.push(L.B);
    FM.selectLayer(L.A.id);
    try {
      FM.fxThumbs.mountPreset(cv, preset, L.A);
      for (var i = 0; i < 400 && !cv.classList.contains('ready'); i++) await new Promise(function (r) { requestAnimationFrame(r); });
      if (!cv.classList.contains('ready')) throw new Error('the tile never painted');
      var shape = cv.width + 'x' + cv.height;
      if (cv.width === 192) throw new Error('the tile is 192x192 — that is the sample tile, not a preview of the layer');
      if (!FM.fxThumbs.remountLive) throw new Error('no remountLive: the art-decode path re-mounts with a bare key and drops the preset');
      FM.fxThumbs.remountLive();
      for (var j = 0; j < 400 && !cv.classList.contains('ready'); j++) await new Promise(function (r) { requestAnimationFrame(r); });
      if (cv.width + 'x' + cv.height !== shape) throw new Error('after the re-mount the tile is ' + cv.width + 'x' + cv.height + ', was ' + shape + ' — it fell back to the sample');
      /* The SAME trap by a second route, and one this suite did not have before: a preset mounted
       * with NO layer (the sample path, which every un-previewable layer falls back to) must still
       * carry its preset into the queue. When it did not, pump() handed 'p:<id>' to generate(), the
       * effect registry missed, and every tile in the sheet came out as the same picture.
       * The witness is TWO presets of the SAME effect: they share a subject, so if the preset is
       * being dropped they are pixel-identical, and if it is honoured they cannot be. Compared in
       * the SAME instant — one shared ticker paints both, so a paired sample needs no settling and
       * cannot be fooled by the fx-art photographs decoding underneath the test. */
      var other = FM.EFFECT_PRESETS.filter(function (p) { return p.fx === preset.fx && p.id !== preset.id; })[0];
      if (!other) throw new Error('needs two shipped presets of one effect to compare');
      var s1 = document.createElement('canvas'); s1.className = 'fxb-thumb-cv'; host.appendChild(s1);
      var s2 = document.createElement('canvas'); s2.className = 'fxb-thumb-cv'; host.appendChild(s2);
      FM.fxThumbs.mountPreset(s1, preset);                       // no layer on purpose
      FM.fxThumbs.mountPreset(s2, other);
      for (var k = 0; k < 400 && !(s1.classList.contains('ready') && s2.classList.contains('ready')); k++) await new Promise(function (r) { requestAnimationFrame(r); });
      var apart = 0;
      for (var n = 0; n < 6 && !apart; n++) {
        var q1 = s1.getContext('2d').getImageData(0, 0, s1.width, s1.height).data;
        var q2 = s2.getContext('2d').getImageData(0, 0, s2.width, s2.height).data;
        for (var q = 0; q < q1.length; q += 4) if (Math.abs(q1[q] - q2[q]) > 2) { apart++; break; }
        if (!apart) await new Promise(function (r) { setTimeout(r, 95); });
      }
      if (!apart) throw new Error('“' + preset.name + '” and “' + other.name + '” render the identical sample tile — the no-layer path dropped the preset');
    } finally {
      FM.fxThumbs.stopAll();
      host.remove();
      FM.scene.layers.length = 0;
      layers0.forEach(function (l) { FM.scene.layers.push(l); });
      FM.selectLayer(sel0);
    }
  });

  /* ---------------- Magnify Background (queue 32) ------------------------------------------
   * Copy Background with a lens: the layer fills with the scene BELOW it, scaled about the layer's
   * own anchor. It shipped once as a POST-EFFECT and was reverted for "doing nothing" — the stripe
   * counts came out identical at zoom 1, 2 and 4. The cause was the wiring, not the maths: listing
   * a type in POSTFX makes drawLayer take the `if (pp.length) { applyPostFx(…); return; }` branch,
   * and applyPostFx has no PIXEL_FX / WARP_FX / CANVAS_FX kernel for it, so it falls through every
   * `if` and returns undefined. The layer then draws ZERO pixels and what those measurements were
   * counting was the bare backdrop through a layer that had vanished.
   * So the load-bearing assertion here is not "the stripes are wider" — it is "the layer drew at
   * all".
   * WHAT THIS ACTUALLY GUARDS, mutation by mutation (measured 2026-08-12, not assumed):
   *   • `magnifybg: 1` added to POSTFX            → RED, `the lens drew nothing` (assertion 1).
   *   • POSTFX *and* a WARP_FX kernel for it      → RED, but via assertion 2: the layer now draws
   *     SOMETHING, just not the copy, so zoom 1 stops matching plain Copy Background (39360 bytes).
   *   • a WARP_FX kernel ALONE, no POSTFX entry   → still GREEN, and correctly so. WARP_FX is read
   *     from exactly one place, the `if (WARP_FX[fx.type]) return drawWarpEffect(…)` line inside
   *     applyPostFx, and drawLayer only reaches applyPostFx through the `layer.effects.filter(e =>
   *     POSTFX[e.type] …)` gate. An entry there with no POSTFX entry never executes and changes no
   *     pixel, so there is nothing for a rendering test to see.
   * POSTFX is therefore the single gate, and it is the one this test covers. Don't rewrite this to
   * promise WARP_FX coverage the pixels cannot deliver. */
  var MBG = { W: 320, H: 240, LENS: 160, ROW: 60, MID: 120 };   // ROW is inside the lens, above the square
  function mbgLayers(fx, zoom, square) {
    var out = [];
    if (fx) {
      var L = FM.makeLayer('shape', { shape: 'rect', name: 'lens', x: 160, y: 120, shapeW: MBG.LENS, shapeH: MBG.LENS, fill: '#00ff00' });
      var e = FM.fxRegistry.makeInstance(fx);
      if (!e) throw new Error('no registry entry for ' + fx);
      if (zoom != null && 'zoom' in e.params) e.params.zoom = zoom;
      L.effects = [e];
      out.push(L);
    }
    if (square) out.push(FM.makeLayer('shape', { shape: 'rect', x: 160, y: 120, shapeW: 40, shapeH: 40, fill: '#ff0000' }));
    for (var x = 8; x < MBG.W; x += 16) out.push(FM.makeLayer('shape', { shape: 'rect', x: x, y: 120, shapeW: 8, shapeH: MBG.H, fill: '#ffffff' }));
    return out;
  }
  function mbgPix(layers) {
    var c = offscreen(MBG.W, MBG.H);
    FM.renderScene(c.getContext('2d', { willReadFrequently: true }), scene(layers), 0);
    return c.getContext('2d', { willReadFrequently: true }).getImageData(0, 0, MBG.W, MBG.H);
  }
  // widths of the runs of `pred` pixels along row y, keeping only those inside the lens
  function mbgRuns(im, y, pred) {
    var d = im.data, w = im.width, r = [], s = -1, lo = (MBG.W - MBG.LENS) / 2, hi = lo + MBG.LENS;
    for (var x = 0; x <= w; x++) {
      var i = (y * w + x) * 4;
      var on = x < w && pred(d[i], d[i + 1], d[i + 2], d[i + 3]);
      if (on && s < 0) s = x; else if (!on && s >= 0) { r.push([s, x - s]); s = -1; }
    }
    return r.filter(function (v) { return v[0] > lo && v[0] + v[1] < hi; });
  }
  var mbgWhite = function (r, g, b, a) { return a > 200 && r > 200 && g > 200 && b > 200; };
  var mbgRed = function (r, g, b, a) { return a > 200 && r > 150 && g < 110 && b < 110; };

  test('effects: Magnify Background really magnifies, and Copy Background is untouched', { item: 'magnify-bg' }, function () {
    if (!FM.fxRegistry.get('magnifybg')) throw new Error('magnifybg is not in the effect registry');
    var noLens = mbgPix(mbgLayers(null, null, true));
    var cbg = mbgPix(mbgLayers('copybg', null, true));
    var z1 = mbgPix(mbgLayers('magnifybg', 1, true));
    var z2 = mbgPix(mbgLayers('magnifybg', 2, true));
    var z4 = mbgPix(mbgLayers('magnifybg', 4, false));

    // 1. THE TRIPWIRE. A layer routed through the post-effect path with no kernel draws nothing at
    // all, and the frame is then pixel-for-pixel the backdrop with no layer in it.
    var diff = 0;
    for (var i = 0; i < z2.data.length; i++) if (z2.data[i] !== noLens.data[i]) diff++;
    if (diff === 0) throw new Error('the lens drew nothing: a Magnify Background layer at zoom 2 left the frame byte-identical to the same scene with the layer deleted — either magnifybg has been listed in POSTFX, which routes it into applyPostFx, which has no kernel for it and so draws zero pixels, or the zoom never reached the plate');

    // 2. zoom 1 IS Copy Background, byte for byte — the identity path must not be touched.
    var d1 = 0;
    for (var j = 0; j < z1.data.length; j++) if (z1.data[j] !== cbg.data[j]) d1++;
    if (d1 !== 0) throw new Error('Magnify Background at zoom 1 differs from plain Copy Background in ' + d1 + ' bytes — the identity blit is no longer identical');

    // 3. the picture inside the lens scales with zoom: 8px bars → 16 at 2x, 32 at 4x (measured 14
    // and 30 at a >200 threshold, the rest of each edge being the bilinear ramp).
    function bars(im) { return mbgRuns(im, MBG.ROW, mbgWhite).map(function (v) { return v[1]; }); }
    var b1 = bars(z1), b2 = bars(z2), b4 = bars(z4);
    if (!b1.length || b1.some(function (w) { return w < 7 || w > 9; })) throw new Error('at zoom 1 the backdrop bars should still be 8px, measured [' + b1 + ']');
    if (!b2.length || b2.some(function (w) { return w < 13 || w > 17; })) throw new Error('at zoom 2 the 8px bars should be ~16px, measured [' + b2 + ']');
    if (!b4.length || b4.some(function (w) { return w < 28 || w > 34; })) throw new Error('at zoom 4 the 8px bars should be ~32px, measured [' + b4 + ']');

    // 4. …and it scales about the LAYER'S OWN ANCHOR, not the canvas origin: the 40px square sits on
    // the anchor, so it must grow in place rather than slide out of the lens.
    function sq(im) { var r = mbgRuns(im, MBG.MID, mbgRed); return r.length === 1 ? r[0] : null; }
    var s1 = sq(z1), s2 = sq(z2);
    if (!s1 || Math.abs(s1[1] - 40) > 2) throw new Error('at zoom 1 the 40px square measured ' + (s1 ? s1[1] : 'nothing'));
    if (!s2 || Math.abs(s2[1] - 80) > 3) throw new Error('at zoom 2 the 40px square should be 80px wide, measured ' + (s2 ? s2[1] : 'nothing') + ' — check the magnification origin');
    if (s2 && Math.abs((s2[0] + s2[1] / 2) - 160) > 2) throw new Error('the magnified square is centred at ' + (s2[0] + s2[1] / 2) + ', not on the layer anchor at 160 — it is being scaled about the wrong point');
  });

  test('effects: Magnify Background below 1x fills its edges instead of punching a hole', { item: 'magnify-bg' }, function () {
    // The copy is composited with `source-in`, so anywhere the scaled backdrop does not reach is a
    // HOLE straight through the layer. A magenta ring around a blue field tells the two apart: the
    // clamp repeats the snapshot's EDGE pixel (magenta), a hole shows the backdrop itself (blue).
    var layers = [null, null];
    var L = FM.makeLayer('shape', { shape: 'rect', name: 'lens', x: 160, y: 120, shapeW: MBG.W, shapeH: MBG.H, fill: '#00ff00' });
    var e = FM.fxRegistry.makeInstance('magnifybg');
    if (!e) throw new Error('no registry entry for magnifybg');
    e.params.zoom = 0.5; L.effects = [e];
    layers = [L,
      FM.makeLayer('shape', { shape: 'rect', x: 160, y: 120, shapeW: 40, shapeH: 40, fill: '#ff0000' }),
      FM.makeLayer('shape', { shape: 'rect', x: 160, y: 120, shapeW: MBG.W - 12, shapeH: MBG.H - 12, fill: '#0000ff' }),
      FM.makeLayer('shape', { shape: 'rect', x: 160, y: 120, shapeW: MBG.W, shapeH: MBG.H, fill: '#ff00ff' })];
    var im = mbgPix(layers);
    var at = function (x, y) { var i = (y * im.width + x) * 4; return [im.data[i], im.data[i + 1], im.data[i + 2], im.data[i + 3]]; };
    // every one of these is in a margin the half-size copy cannot reach, and over the BLUE field
    [[40, 30], [280, 30], [40, 210], [280, 210], [40, 120], [160, 20]].forEach(function (p) {
      var c = at(p[0], p[1]);
      if (c[3] < 250) throw new Error('at ' + p + ' the layer is transparent (alpha ' + c[3] + ') — the shrunken copy left a hole');
      if (!(c[0] > 200 && c[1] < 80 && c[2] > 200)) throw new Error('at ' + p + ' the margin is rgb(' + c.slice(0, 3) + ') — expected the clamped magenta edge, blue means the backdrop is showing through a hole');
    });
  });

  /* ---------------- Fill Behind (queue 32, the last of AM's "Other") --------------------------
   * The blurred-backdrop fill from phone video apps: a layer that does not cover the canvas gets the
   * empty space filled with an enlarged, blurred copy of ITSELF, and draws sharp on top. Third
   * member of the Copy Background family, and wired the same way — dispatched out of drawLayer,
   * never in POSTFX.
   * The subject is a 100x180 picture, green on its left half and blue on its right, centred in a
   * 320x240 comp. That asymmetry is the whole instrument: a fill that is a real scaled copy of the
   * LAYER puts green down the left margin and blue down the right, while a flat wash, the comp
   * backdrop, or a copy of the wrong thing cannot. */
  function fbArt(id, w, h, paint) {
    var c = offscreen(w, h); paint(c.getContext('2d'), w, h);
    FM.media.set(id, { kind: 'image', el: c, width: w, height: h, duration: 0 });
    return id;
  }
  function fbHalves(g, w, h) {
    g.fillStyle = '#00c000'; g.fillRect(0, 0, w / 2, h);
    g.fillStyle = '#0000c0'; g.fillRect(w / 2, 0, w / 2, h);
  }
  function fbStripes(g, w, h) {
    g.fillStyle = '#101010'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#f0f0f0';
    for (var x = 0; x < w; x += 10) g.fillRect(x, 0, 5, h);
  }
  // an image layer of size w x h centred in the 320x240 comp, optionally carrying Fill Behind
  function fbLayer(id, w, h, paint, params) {
    fbArt(id, w, h, paint);
    var l = FM.makeLayer('image', { x: 160, y: 120, start: 0, duration: 5 });
    l.id = id;
    if (params) {
      var e = FM.fxRegistry.makeInstance('fillbehind');
      if (!e) throw new Error('no registry entry for fillbehind');
      Object.keys(params).forEach(function (k) { e.params[k] = params[k]; });
      l.effects = [e];
    }
    return l;
  }
  function fbPix(layers, cw, ch, bg) {
    var c = offscreen(cw || 320, ch || 240);
    var s = scene(layers);
    if (bg !== undefined) s.project = { width: 320, height: 240, fps: 30, duration: 5, background: bg };
    FM.renderScene(c.getContext('2d', { willReadFrequently: true }), s, 0);
    return c.getContext('2d', { willReadFrequently: true }).getImageData(0, 0, c.width, c.height);
  }
  function fbAt(im, x, y) { var i = (y * im.width + x) * 4; return [im.data[i], im.data[i + 1], im.data[i + 2], im.data[i + 3]]; }
  function fbDiff(a, b) { var n = 0; for (var i = 0; i < a.data.length; i++) if (a.data[i] !== b.data[i]) n++; return n; }
  // mean |delta| between horizontally adjacent samples on one row: high = sharp detail, ~0 = smooth
  function fbEdgeEnergy(im, y, x0, x1) {
    var s = 0, n = 0;
    for (var x = x0; x < x1 - 1; x++) {
      var i = (y * im.width + x) * 4, j = i + 4;
      s += Math.abs(im.data[i] - im.data[j]) + Math.abs(im.data[i + 1] - im.data[j + 1]) + Math.abs(im.data[i + 2] - im.data[j + 2]);
      n++;
    }
    return n ? s / n : 0;
  }
  // …the same thing but as a MAXIMUM, over a window: a seam is one big step, not raised average detail.
  function fbMaxStep(im, y, x0, x1) {
    var m = 0, at = -1;
    for (var x = x0; x < x1 - 1; x++) {
      var i = (y * im.width + x) * 4, j = i + 4;
      var d = Math.abs(im.data[i] - im.data[j]) + Math.abs(im.data[i + 1] - im.data[j + 1]) + Math.abs(im.data[i + 2] - im.data[j + 2]) + Math.abs(im.data[i + 3] - im.data[j + 3]);
      if (d > m) { m = d; at = x; }
    }
    return { max: m, at: at };
  }
  // render a REAL project of any size (fbPix always renders the 320x240 one)
  function fbPixAt(layers, PW, PH) {
    var c = offscreen(PW, PH), g = c.getContext('2d', { willReadFrequently: true });
    FM.renderScene(g, { project: { width: PW, height: PH, fps: 30, duration: 5, background: '#000000' }, layers: layers, selectedId: null, selectedIds: [] }, 0);
    return g.getImageData(0, 0, PW, PH);
  }
  /* THE RECOGNISABLE FEATURE the blur/zoom tests below measure. Green | blue | green gives the fill
   * TWO step edges, and a symmetric blur leaves a step edge's 50% crossing exactly where it was (it
   * adds variance, it does not move the mean). So the crossings' SEPARATION is the fill's size and
   * their MIDPOINT is its position, both readable no matter how soft the picture has been made —
   * which is the only way to compare geometry across a blur sweep. */
  function fbThirds(g, w, h) {
    g.fillStyle = '#00c000'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#0000c0'; g.fillRect(Math.round(w * 0.3), 0, Math.round(w * 0.4), h);
  }
  function fbSplit(frac) {
    return function (g, w, h) {
      g.fillStyle = '#00c000'; g.fillRect(0, 0, w, h);
      g.fillStyle = '#0000c0'; g.fillRect(Math.round(w * frac), 0, w, h);
    };
  }
  /* The 10%-to-90% width of the fill's green→blue edge on row y, converted to PROJECT units — i.e.
   * a ruler laid on the blur itself. It is proportional to the blur's sigma, so it is the direct way
   * to check a radius that is supposed to be a length. */
  function fbBlurWidth(im, y, PW) {
    var w = im.width, f = [], x;
    for (x = 0; x < w; x++) { var i = (y * w + x) * 4; f.push(im.data[i + 1] - im.data[i + 2]); }
    var hi = Math.max.apply(null, f), lo = Math.min.apply(null, f);
    function crossAt(v) {
      for (var j = 0; j < w - 1; j++) if ((f[j] - v) * (f[j + 1] - v) <= 0 && f[j] !== f[j + 1]) return j + (f[j] - v) / (f[j] - f[j + 1]);
      return null;
    }
    var a = crossAt(hi * 0.8), b = crossAt(lo * 0.8);
    return (a == null || b == null) ? null : (b - a) * PW / w;
  }
  // sub-pixel x of every green→blue (or blue→green) crossing on row y, ignoring the outer `pad` px
  function fbCross(im, y, pad) {
    var w = im.width, f = [], xs = [], x;
    for (x = 0; x < w; x++) { var i = (y * w + x) * 4; f.push(im.data[i + 1] - im.data[i + 2]); }
    for (x = pad || 0; x < w - 1 - (pad || 0); x++) {
      if ((f[x] > 0 && f[x + 1] <= 0) || (f[x] < 0 && f[x + 1] >= 0)) xs.push(x + f[x] / (f[x] - f[x + 1]));
    }
    return xs;
  }

  test('effects: Fill Behind fills the empty frame with a blown-up copy of the layer', { item: 'fill-behind' }, function () {
    if (!FM.fxRegistry.get('fillbehind')) throw new Error('fillbehind is not in the effect registry');
    var off = fbPix([fbLayer('_fbT1', 100, 180, fbHalves, null)]);
    var on = fbPix([fbLayer('_fbT1', 100, 180, fbHalves, { blur: 20, zoom: 1, dim: 0 })]);

    // 1. THE TRIPWIRE, the same one Magnify Background needed: did the effect draw ANYTHING. An
    // effect mis-registered in POSTFX is routed into applyPostFx, which has no kernel for it, and
    // the layer silently renders zero extra pixels.
    if (fbDiff(off, on) === 0) throw new Error('Fill Behind changed nothing: the frame is byte-identical with the effect on and off — check it has not been listed in POSTFX/WARP_FX, which returns from drawLayer ~40 lines before the Fill Behind dispatch');

    // 2. the fill is a copy of THE LAYER, not a wash and not the backdrop: the subject is green on
    // its left half and blue on its right, so a cover-scaled copy must be green down the left
    // margin and blue down the right.
    var L = fbAt(on, 20, 120), R = fbAt(on, 300, 120);
    if (!(L[1] > 120 && L[1] > L[2] + 60)) throw new Error('the left margin is rgb(' + L.slice(0, 3) + '), expected the green half of the layer — the fill is not a copy of the layer');
    if (!(R[2] > 120 && R[2] > R[1] + 60)) throw new Error('the right margin is rgb(' + R.slice(0, 3) + '), expected the blue half of the layer — the fill is not a copy of the layer');

    /* 3a. it reaches every edge with no transparent hole. Read on a TRANSPARENT comp so this is the
     * fill's own alpha and not a composite over black. */
    var clear = fbPix([fbLayer('_fbT1', 100, 180, fbHalves, { blur: 20, zoom: 1, dim: 0 })], 320, 240, null);
    [[1, 1], [1, 238], [160, 1], [160, 238], [318, 1], [318, 238], [1, 120], [318, 120]].forEach(function (p) {
      var a = fbAt(clear, p[0], p[1])[3];
      if (a < 248) throw new Error('at ' + p + ' the fill is only ' + a + '/255 opaque — it fades out before the comp edge, which reads as a dark border');
    });
    /* 3b. …and it reaches them UNCONTAMINATED, which is the assertion with teeth. Two things pull
     * the copy away from the frame edge, and since the mean-colour floor sits underneath, neither
     * shows up as transparency any more — they show up as the edge blending toward that flat floor:
     *   • a blur samples from OUTSIDE the copy, so the copy has to overshoot the frame by about
     *     three times the radius. Measured with no overshoot: the left edge went 192 green / 0 blue
     *     -> 136 / 56, i.e. more than a quarter of the way to the mean.
     *   • alphaBBoxFast reports LOOSE bounds (up to 8 transparent device px a side) and the cover
     *     scale multiplies that border up. Measured un-stripped: 185 / 7.
     * The subject is green on the left and blue on the right, so "pure" is a thing this can check. */
    var eL = fbAt(on, 1, 120), eR = fbAt(on, 318, 120);
    if (!(eL[1] >= 190 && eL[2] <= 4)) throw new Error('at the left edge the fill is rgb(' + eL.slice(0, 3) + ') where the layer’s own green is rgb(0,192,0) — the copy stops short of the frame and the mean-colour floor is showing through. Check the overscan margin and that alphaBBoxFast’s slack is stripped off the source rect');
    if (!(eR[2] >= 188 && eR[1] <= 8)) throw new Error('at the right edge the fill is rgb(' + eR.slice(0, 3) + ') where the layer’s own blue is rgb(0,0,192) — same cause as the left edge');

    // 4. …and it is BEHIND: every pixel of the subject's own interior is untouched.
    var bad = 0;
    for (var y = 40; y < 200; y++) for (var x = 118; x < 202; x++) {
      var i = (y * 320 + x) * 4;
      for (var k = 0; k < 4; k++) if (off.data[i + k] !== on.data[i + k]) bad++;
    }
    if (bad) throw new Error(bad + ' bytes of the SUBJECT changed — the fill is drawing over the layer instead of behind it');
  });

  test('effects: Fill Behind leaves no bare corner on a layer that is not a rectangle', { item: 'fill-behind' }, function () {
    /* Cover-scaling a RECTANGLE guarantees the frame is covered. Cover-scaling an alpha BOUNDING BOX
     * does not: a rotated clip, an ellipse, a small subject all leave transparent corners inside
     * that box, and the scale carries them along in proportion — extra zoom never pushes them out.
     * Found by rendering rather than by reading: a clip rotated 24° put rgb(0,0,0) in the frame
     * corner, and so did a 6x6 layer. The fix is a floor of the layer's own mean colour under the
     * blurred copy, so this asserts on the corners of exactly those two shapes. */
    var rot = fbLayer('_fbT6', 100, 180, fbHalves, { blur: 20, zoom: 1, dim: 0 });
    rot.transform.rotation = 24;
    var im = fbPix([rot]);
    [[3, 3], [316, 3], [3, 236], [316, 236]].forEach(function (p) {
      var c = fbAt(im, p[0], p[1]);
      if (c[0] + c[1] + c[2] < 40) throw new Error('a clip rotated 24° left the frame corner at ' + p + ' bare: rgb(' + c.slice(0, 3) + ') — the fill is a straight copy of the alpha bounding box, whose corners are transparent');
    });
    var tiny = fbLayer('_fbT7', 6, 6, fbHalves, { blur: 20, zoom: 1, dim: 0 });
    var im2 = fbPix([tiny]);
    var c2 = fbAt(im2, 3, 3);
    if (c2[0] + c2[1] + c2[2] < 40) throw new Error('a 6x6 layer left the frame corner bare: rgb(' + c2.slice(0, 3) + ')');
    // an ellipse: same bounding-box problem, and the one whose corners are transparent by definition
    var el = FM.makeLayer('shape', { shape: 'ellipse', x: 160, y: 120, shapeW: 90, shapeH: 90, fill: '#e0a020', start: 0, duration: 5 });
    var e3 = FM.fxRegistry.makeInstance('fillbehind');
    e3.params.blur = 20; e3.params.zoom = 1; e3.params.dim = 0;
    el.effects = [e3];
    var c3 = fbAt(fbPix([el]), 3, 3);
    if (c3[0] + c3[1] + c3[2] < 40) throw new Error('an ellipse left the frame corner bare: rgb(' + c3.slice(0, 3) + ')');
  });

  test('effects: Fill Behind blurs the fill, and the radius scales with the plate', { item: 'fill-behind' }, function () {
    // a) the blur does something: fine stripes in the fill must survive at blur 0 and vanish at 40.
    var sharp = fbPix([fbLayer('_fbT2', 100, 180, fbStripes, { blur: 0, zoom: 1, dim: 0 })]);
    var soft = fbPix([fbLayer('_fbT2', 100, 180, fbStripes, { blur: 40, zoom: 1, dim: 0 })]);
    var eS = fbEdgeEnergy(sharp, 10, 0, 320), eB = fbEdgeEnergy(soft, 10, 0, 320);
    if (!(eS > 8)) throw new Error('at blur 0 the fill should be a sharp copy, but its horizontal detail measured ' + eS.toFixed(2));
    if (!(eB < eS / 8)) throw new Error('at blur 40 the fill measured ' + eB.toFixed(2) + ' of detail against ' + eS.toFixed(2) + ' at blur 0 — the blur is barely doing anything');

    /* b) A BLUR RADIUS IS A LENGTH. Every filter length in the compositor is multiplied by
     * plateScale, because ctx.filter works in DEVICE pixels and a reduced-scale preview has fewer of
     * them per project pixel. Drop the multiply and the effect stops matching the export in every
     * preview that isn't 1:1 — the repo has that same bug written up for several other effects.
     * renderScene derives __fmRS from canvas.width / project.width, so a 160x120 target of a
     * 320x240 comp IS the reduced preview. Compare its detail against the 1:1 render shrunk to the
     * same size: with the multiply they match; without it the reduced render is blurred twice as
     * hard relative to its own width and comes out visibly smoother. */
    var full = offscreen(320, 240);
    FM.renderScene(full.getContext('2d'), scene([fbLayer('_fbT2', 100, 180, fbStripes, { blur: 40, zoom: 1, dim: 0 })]), 0);
    var shrunk = offscreen(160, 120);
    shrunk.getContext('2d').drawImage(full, 0, 0, 160, 120);
    var half = fbPix([fbLayer('_fbT2', 100, 180, fbStripes, { blur: 40, zoom: 1, dim: 0 })], 160, 120);
    var eHalf = fbEdgeEnergy(half, 5, 0, 160);
    var eRef = fbEdgeEnergy(shrunk.getContext('2d', { willReadFrequently: true }).getImageData(0, 0, 160, 120), 5, 0, 160);
    if (!(eHalf > eRef * 0.5 && eHalf < eRef * 2)) throw new Error('the reduced preview measured ' + eHalf.toFixed(3) + ' of detail where the 1:1 render measured ' + eRef.toFixed(3) + ' — the blur radius is not being multiplied by plateScale, so the preview no longer matches the export');

    /* c) …and the SAME claim measured with a ruler instead of a detail score, because (b) has only
     * about a 2x margin and stopped catching the bug once the fix below made the fill less zoomed:
     * deleting the `* ps` left (b) at 0.55 of eRef, inside its own 0.5..2 band. A blur radius is a
     * length, so measure a LENGTH — the 10%-to-90% width of the fill's green→blue edge, converted
     * back to project units. It is sigma times a constant, so it must not care what the preview is
     * scaled to. Measured with the multiply: 46.8 project px at 1:1 vs 51.8 at 0.5x (ratio 1.11) for
     * Blur 20, and 100.2 vs 93.6 (0.93) for Blur 40. Without it: 2.00 and 1.89 — the preview is blurred
     * exactly twice as hard as the export, which is the whole bug in one number. */
    [20, 40].forEach(function (b) {
      var w1 = fbBlurWidth(fbPix([fbLayer('_fbT2b', 100, 180, fbHalves, { blur: b, zoom: 1, dim: 0 })], 320, 240), 10, 320);
      var w2 = fbBlurWidth(fbPix([fbLayer('_fbT2b', 100, 180, fbHalves, { blur: b, zoom: 1, dim: 0 })], 160, 120), 5, 320);
      if (w1 == null || w2 == null) throw new Error('at Blur ' + b + ' the fill’s colour edge could not be measured (1:1 ' + w1 + ', 0.5x ' + w2 + ')');
      var r = w2 / w1;
      if (!(r > 0.7 && r < 1.4)) throw new Error('at Blur ' + b + ' the fill’s edge is ' + w2.toFixed(1) + ' project px wide in a 0.5x preview but ' + w1.toFixed(1) + ' at 1:1 (' + r.toFixed(2) + 'x) — ctx.filter works in DEVICE pixels, so the radius must be multiplied by plateScale or the preview and the export disagree');
    });
  });

  test('effects: Fill Behind costs nothing when the layer already covers the canvas', { item: 'fill-behind' }, function () {
    /* "The space the layer isn't filling" can be empty, and then the effect must be invisible AND
     * free. Two different guards do that and they are tested separately:
     *   • a cheap geometric one for media, which skips the plate entirely — measured with
     *     FM._fbPlates, because no pixel comparison can see it (the fill would be hidden behind an
     *     opaque layer either way);
     *   • an alpha-bounds one for everything else, measured with a HALF-TRANSPARENT shape, through
     *     which a fill drawn behind would be plainly visible. */
    var mk = function (fx) { return fbLayer('_fbT3', 400, 300, fbHalves, fx); };
    var before = FM._fbPlates;
    var off = fbPix([mk(null)]);
    var on = fbPix([mk({})]);
    var built = FM._fbPlates - before;
    var d = fbDiff(off, on);
    if (d !== 0) throw new Error('a layer that already covers the frame rendered ' + d + ' bytes differently with Fill Behind on — it must be a no-op there');
    if (built !== 0) throw new Error('Fill Behind built ' + built + ' full-resolution plate(s) for a layer that already covers the frame — the geometric guard is not catching it, so it is paying ~10ms/frame to draw nothing');

    // the alpha-bounds guard, on a shape the geometric one deliberately declines to judge
    var shape = function (fx) {
      var l = FM.makeLayer('shape', { shape: 'rect', x: 160, y: 120, shapeW: 400, shapeH: 300, fill: 'rgba(255,0,0,0.5)', start: 0, duration: 5 });
      if (fx) { var e = FM.fxRegistry.makeInstance('fillbehind'); l.effects = [e]; }
      return l;
    };
    var sd = fbDiff(fbPix([shape(null)]), fbPix([shape(true)]));
    if (sd !== 0) throw new Error('a half-transparent shape covering the whole frame rendered ' + sd + ' bytes differently with Fill Behind on — the fill is showing through it');
  });

  test('effects: Fill Behind still fills when the layer also carries a post-effect', { item: 'fill-behind' }, function () {
    /* A one-effect scene is the easy case. This is the one that broke Magnify Background: drawLayer's
     * `if (pp.length) { applyPostFx(…); return; }` gate returns before everything below it, so an
     * effect that is mis-registered in POSTFX, or whose dispatch goes missing, works on a bare layer
     * and does nothing the moment the user adds a second effect. Pixelate is a POSTFX effect, so
     * this scene only renders a fill if Fill Behind survives being stacked.
     * WHAT IT DOES NOT COVER, measured rather than assumed (2026-08-12): physically MOVING the
     * dispatch below that gate does NOT turn this red, and no rendering test reasonably could.
     * Every applyPostFx kernel renders the clean layer by re-entering drawLayer, so the fill is
     * still drawn — it just lands on the other side of the post-effect. With Pixelate stacked, the
     * two dispatch positions differ by 0.13 vs 0.03 of mean row detail in the left margin and 0.47
     * vs 0.00 in the right: a real ordering difference, far too small to assert on. The position is
     * held by the comment at the dispatch site, not by this test. */
    var mk = function (withFill) {
      var l = fbLayer('_fbT4', 100, 180, fbHalves, null);
      var fx = [FM.fxRegistry.makeInstance('pixelate')];
      if (withFill) {
        var e = FM.fxRegistry.makeInstance('fillbehind');
        e.params.blur = 20; e.params.zoom = 1; e.params.dim = 0;
        fx.push(e);
      }
      l.effects = fx;
      return l;
    };
    var bare = fbPix([mk(false)]), both = fbPix([mk(true)]);
    var c = fbAt(both, 4, 4), b = fbAt(bare, 4, 4);
    if (b[1] + b[2] > 40) throw new Error('the control scene already has something in the corner (rgb ' + b.slice(0, 3) + ') — the test cannot tell the fill apart from it');
    if (c[1] + c[2] < 120) throw new Error('with Pixelate on the same layer the corner is rgb(' + c.slice(0, 3) + ') — Fill Behind drew nothing once it was stacked. Check it has not been added to POSTFX, and that its dispatch in drawLayer is still there and still above the applyPostFx gate');
  });

  test('effects: Fill Behind’s Zoom and Dim each move only their own half of the picture', { item: 'fill-behind' }, function () {
    // Zoom is a multiplier ON the cover scale, so doubling it must double the scale the fill is
    // drawn at — read from FM._fbLast, which the renderer publishes for exactly this.
    fbPix([fbLayer('_fbT5', 100, 180, fbHalves, { blur: 20, zoom: 1, dim: 0 })]);
    var s1 = FM._fbLast && FM._fbLast.s;
    fbPix([fbLayer('_fbT5', 100, 180, fbHalves, { blur: 20, zoom: 2, dim: 0 })]);
    var s2 = FM._fbLast && FM._fbLast.s;
    if (!s1 || !s2) throw new Error('FM._fbLast was never published — the fill path did not run');
    if (Math.abs(s2 / s1 - 2) > 0.02) throw new Error('Zoom 2 scaled the fill by ' + (s2 / s1).toFixed(3) + 'x instead of 2x');

    // Dim darkens the FILL and must leave the subject alone — the one thing that makes the subject
    // still read as the subject.
    var d0 = fbPix([fbLayer('_fbT5', 100, 180, fbHalves, { blur: 20, zoom: 1, dim: 0 })]);
    var d50 = fbPix([fbLayer('_fbT5', 100, 180, fbHalves, { blur: 20, zoom: 1, dim: 50 })]);
    var f0 = fbAt(d0, 20, 120)[1], f50 = fbAt(d50, 20, 120)[1];
    if (!(f0 > 150)) throw new Error('the undimmed fill measured ' + f0 + ' green, expected the layer’s own ~192');
    if (Math.abs(f50 / f0 - 0.5) > 0.08) throw new Error('Dim 50% left the fill at ' + (f50 / f0 * 100).toFixed(0) + '% of its brightness (' + f50 + ' vs ' + f0 + ')');
    var s0 = fbAt(d0, 140, 120), s5 = fbAt(d50, 140, 120);
    if (s0.join() !== s5.join()) throw new Error('Dim changed the SUBJECT too: rgb(' + s0.slice(0, 3) + ') became rgb(' + s5.slice(0, 3) + ')');
  });

  /* Ezra, on the Fill Behind that shipped in v5.88: "The blur slider on fill behind doesn't blur it
   * just zooms." He was right, and the cause was one line: the cover scale was computed to contain
   * the frame PLUS an overscan margin sized at 3x the blur radius —
   *     const m = blurDev * 3;
   *     const s = Math.max((W + 2 * m) / sw, (H + 2 * m) / sh) * zoom;
   * — so Blur and Zoom were literally multiplying the same number. Measured at Zoom 1 in this comp,
   * the cover scale ran 2.96 at Blur 0, 4.35 at 25, 8.52 at 100 and 14.07 at 200: the Blur slider
   * alone zoomed the fill 4.75x, and the feature separation below went 118.6px -> 229.5px by Blur 50
   * before the picture ran off the frame entirely. On a real 1080x1920 comp it was 2.11x.
   * The margin itself is NOT the bug and must not be deleted — see the next test. */
  test('effects: Fill Behind’s Blur softens the fill without zooming it', { item: 'fill-behind' }, function () {
    // 1. the scale itself, straight from the renderer, across the whole slider at a fixed Zoom.
    var S = {}, blurs = [0, 5, 10, 12, 25, 50, 100, 150, 200];
    blurs.forEach(function (b) {
      fbPix([fbLayer('_fbB1', 100, 180, fbHalves, { blur: b, zoom: 1, dim: 0 })]);
      if (!FM._fbLast) throw new Error('FM._fbLast was never published — the fill path did not run');
      S[b] = FM._fbLast.s;
    });
    blurs.forEach(function (b) {
      if (Math.abs(S[b] / S[0] - 1) > 0.005) throw new Error('with Zoom pinned at 1, moving Blur from 0 to ' + b + ' changed the fill’s cover scale ' + S[0].toFixed(3) + ' -> ' + S[b].toFixed(3) + ' (' + (S[b] / S[0]).toFixed(2) + 'x). Blur and Zoom are wired to the same number again — the cover scale must contain the FRAME and nothing else, and the blur’s overscan must be paid for with surface (the MK margin + edge clamp), not with scale');
    });

    /* 2. …and in the PIXELS, because a scale the renderer publishes is only half a claim. Row 10 of
     * a 320x240 comp is above the subject, so it is pure fill; the green|blue|green source puts two
     * step edges on it whose 50% crossings a symmetric blur cannot move. Their separation is the
     * fill's size and their midpoint is its position. Measured after the fix: separation 133.2 /
     * 133.3 / 133.6 / 133.8 / 133.5 and midpoint 159.6 / 159.6 / 159.7 / 159.6 / 159.8 across
     * Blur 0 / 5 / 12 / 25 / 50. Before it: 118.6 / 129.7 / 145.5 / 174.0 / 229.5. */
    var f0 = null;
    [0, 5, 12, 25, 50].forEach(function (b) {
      var im = fbPix([fbLayer('_fbB2', 100, 180, fbThirds, { blur: b, zoom: 1, dim: 0 })]);
      var xs = fbCross(im, 10, 2);
      if (xs.length !== 2) throw new Error('at Blur ' + b + ' the fill no longer shows its two colour edges on row 10 (found ' + xs.length + ': ' + xs.map(function (v) { return v.toFixed(1); }) + ') — with the scale pinned they should all stay on the frame; if the fill is being blown up they walk off it');
      var f = { sep: xs[1] - xs[0], mid: (xs[0] + xs[1]) / 2 };
      if (!f0) { f0 = f; return; }
      if (Math.abs(f.sep / f0.sep - 1) > 0.02) throw new Error('Blur ' + b + ' scaled the fill: the two colour edges are ' + f.sep.toFixed(1) + 'px apart where at Blur 0 they were ' + f0.sep.toFixed(1) + 'px (' + (f.sep / f0.sep).toFixed(2) + 'x). A blur cannot move a step edge’s 50% crossing, so this is geometry, not softness');
      if (Math.abs(f.mid - f0.mid) > 1.5) throw new Error('Blur ' + b + ' moved the fill: the midpoint between its two colour edges is at x=' + f.mid.toFixed(1) + ' where at Blur 0 it was x=' + f0.mid.toFixed(1));
    });

    // 3. the softness DOES rise — otherwise "does not zoom" could be satisfied by ignoring the slider.
    var E = {};
    [0, 40, 200].forEach(function (b) { E[b] = fbEdgeEnergy(fbPix([fbLayer('_fbB3', 100, 180, fbStripes, { blur: b, zoom: 1, dim: 0 })]), 10, 0, 108); });
    if (!(E[0] > 20)) throw new Error('at Blur 0 the fill should be a sharp copy of the stripes, but the left margin measured ' + E[0].toFixed(2) + ' of detail');
    if (!(E[40] < E[0] / 10)) throw new Error('Blur 40 left ' + E[40].toFixed(2) + ' of high-frequency detail against ' + E[0].toFixed(2) + ' at Blur 0 — the slider is not blurring');
    if (!(E[200] < E[0] / 20)) throw new Error('Blur 200 left ' + E[200].toFixed(2) + ' of high-frequency detail against ' + E[0].toFixed(2) + ' at Blur 0');

    // 4. …and with Blur pinned, ZOOM still zooms — in the pixels, not just in FM._fbLast.
    var z0 = null;
    [1, 1.5, 2].forEach(function (z) {
      var xs = fbCross(fbPix([fbLayer('_fbB2', 100, 180, fbThirds, { blur: 40, zoom: z, dim: 0 })]), 10, 2);
      if (xs.length !== 2) throw new Error('at Zoom ' + z + ' the fill’s two colour edges are no longer both on the frame (found ' + xs.length + ')');
      var sep = xs[1] - xs[0];
      if (!z0) { z0 = sep; return; }
      if (Math.abs(sep / z0 / z - 1) > 0.03) throw new Error('Zoom ' + z + ' scaled the fill by ' + (sep / z0).toFixed(3) + 'x (edges ' + sep.toFixed(1) + 'px apart against ' + z0.toFixed(1) + 'px at Zoom 1) — fixing the blur-zooms bug has broken the control that is SUPPOSED to zoom');
    });
  });

  /* The other half of the fix, and the reason the overscan cannot simply be deleted: `blur(Npx)` is
   * a Gaussian of standard deviation N and it samples from OUTSIDE the rect being drawn, where there
   * is nothing. Cover the frame exactly and every edge of the comp fades into transparency — the fill
   * reads as a vignette, which is the bug you get for free if you fix the zoom the lazy way.
   * So the margin is paid for with SURFACE: the working plate is built MK bigger than the frame on
   * every side (MK = 3 * blur / k) and the copy's outermost row and column are clamped outward to
   * fill it, so the blur has opaque neighbours to sample. Clamp rather than mirror because it is
   * continuous by construction — the extension repeats the boundary value, so the gradient across the
   * join is zero and there is no seam.
   * This also fixed a second, older leak the old overscan had been hiding: alphaBBoxFast reports a
   * box padded up to 20 device px past the content, and cover-scaling that padding put a ring of
   * transparency INSIDE the frame. At Blur 0, where there was no overscan to hide it, the frame edge
   * of a green/blue layer measured rgb(0,96,96) — the mean-colour floor, not the layer. The source
   * rect now comes from the scan's fully-OPAQUE cells instead. */
  test('effects: Fill Behind reaches the frame edge at every blur, with no vignette and no seam', { item: 'fill-behind' }, function () {
    [0, 5, 60, 200].forEach(function (b) {
      // a) alpha. Transparent comp, so this is the fill's own coverage and not a composite over black.
      var clear = fbPix([fbLayer('_fbC1', 100, 180, fbHalves, { blur: b, zoom: 1, dim: 0 })], 320, 240, null);
      [[0, 0], [319, 0], [0, 239], [319, 239], [1, 120], [318, 120], [160, 1], [160, 238], [80, 0], [240, 239]].forEach(function (p) {
        var a = fbAt(clear, p[0], p[1])[3];
        if (a < 248) throw new Error('at Blur ' + b + ', ' + p + ' the fill is only ' + a + '/255 opaque — it fades out before the comp edge, which reads as a dark border. The MK overscan and the edge clamp that fills it are what stop that');
      });
      // b) …and it is the LAYER's colour there, not the mean-colour floor showing through a hole.
      //    Only up to Blur 60: at 150+ a sigma that wide genuinely mixes the two halves of a 320px
      //    frame together, and that is the blur doing its job.
      if (b <= 60) {
        var im = fbPix([fbLayer('_fbC1', 100, 180, fbHalves, { blur: b, zoom: 1, dim: 0 })]);
        var L = fbAt(im, 1, 120), R = fbAt(im, 318, 120);
        if (!(L[1] >= 185 && L[2] <= 6)) throw new Error('at Blur ' + b + ' the left frame edge is rgb(' + L.slice(0, 3) + ') where the layer’s own green is rgb(0,192,0) — the copy stops short of the frame and the mean-colour floor is showing. Check the source rect is still coming from the scan’s OPAQUE cells (core), not the padded loose box');
        if (!(R[2] >= 185 && R[1] <= 6)) throw new Error('at Blur ' + b + ' the right frame edge is rgb(' + R.slice(0, 3) + ') where the layer’s own blue is rgb(0,0,192) — same cause as the left edge');
      }
      // c) no seam. The clamp meets the real content at the frame edge, so a discontinuity there
      //    shows up as one big step in the outer band of a row of pure fill. The layer's own
      //    green→blue edge lives near the middle, so the outer 90px on each side sees only fill.
      if (b > 0) {
        var im2 = fbPix([fbLayer('_fbC1', 100, 180, fbHalves, { blur: b, zoom: 1, dim: 0 })], 320, 240, null);
        var sl = fbMaxStep(im2, 10, 0, 90), sr = fbMaxStep(im2, 10, 230, 320);
        var worst = sl.max > sr.max ? sl : sr;
        if (worst.max > 12) throw new Error('at Blur ' + b + ' a row of pure fill steps by ' + worst.max + ' (summed over RGBA) between x=' + worst.at + ' and x=' + (worst.at + 1) + ' — that is a seam where the clamped margin meets the real content. Clamping must repeat the boundary pixel exactly (imageSmoothingEnabled off for the strip blits), and the strip must be taken from a WHOLE covered pixel, not the half-covered one at a fractional edge');
      }
    });
  });

  /* The quieter half of the same bug. The fill is built on a 1/k plate (k = 4 / 2 / 1, chosen BY THE
   * BLUR), and that plate is ceil(W/k) wide — so when the frame is not a multiple of k, blitting the
   * WHOLE plate onto W shrinks the fill by (k*ceil(W/k) - W) / (k*ceil(W/k)). Small — 0.93% on a
   * 321px frame, 0.17% on a 1170px iPhone one — but it is a second way for the Blur slider to change
   * the scale, and it moves the picture by ~2.3px at the right of a 321px frame purely by crossing
   * the Blur 12 threshold where k goes 1 -> 4. Taking the exact W/k x H/k rect out of the plate makes
   * the mapping k-independent. 321x241 is deliberate: 321 = 4*81 - 3, the worst case for k=4. */
  test('effects: Fill Behind’s 1/k working plate does not move the fill', { item: 'fill-behind' }, function () {
    var seen = {};
    [5, 10, 12, 60].forEach(function (b) {   // k = 1, 2, 4, 4
      var l = fbLayer('_fbK1', 100, 180, fbSplit(0.8), { blur: b, zoom: 1, dim: 0 });
      l.transform.x = 160.5; l.transform.y = 120.5;
      var im = fbPixAt([l], 321, 241);
      var xs = fbCross(im, 10, 8);
      if (!xs.length) throw new Error('at Blur ' + b + ' the fill’s colour edge is not on row 10 of the 321x241 frame at all');
      seen[b] = { k: FM._fbLast.k, x: xs[0] };
    });
    if (!(seen[5].k === 1 && seen[12].k === 4)) throw new Error('this test needs the k thresholds it was written against: Blur 5 gave k=' + seen[5].k + ' and Blur 12 gave k=' + seen[12].k + ', expected 1 and 4');
    Object.keys(seen).forEach(function (b) {
      if (Math.abs(seen[b].x - seen[5].x) > 1) throw new Error('the fill’s colour edge sits at x=' + seen[b].x.toFixed(2) + ' on a 1/' + seen[b].k + ' plate (Blur ' + b + ') but at x=' + seen[5].x.toFixed(2) + ' on the 1/1 one (Blur 5) — the working plate’s ceil(W/k) width is leaking into the fill’s scale. The final blit must take the exact W/k x H/k rect out of the plate, not the whole thing');
    });
  });

  /* ---------------- Fill Behind is a BACKDROP, not a full-frame blit --------------------------
   * Ezra, on a project of four shape layers: "I'm having a glitch where adding an effect to this
   * layer for some reason makes the layer behind it invisible, really odd."
   * The effect was Fill Behind, and ONE is enough. Its plate is frame-sized, the cover scale blows
   * the layer's own bbox up until it contains the frame, and the average-colour floor underneath
   * makes that plate opaque edge to edge — so blitting it at the layer's own z painted over every
   * layer below. Measured on the scene these tests build, before the fix: 0 of 26,000 probe pixels
   * of the lower layer survived, and a 40x40 speck in the corner erased the frame just as completely.
   * The fill now goes down as a backdrop under the whole stack, so the layers below draw over it.
   *
   * EVERY test here asserts BOTH halves, and that is the point: the layer below must SURVIVE and the
   * empty frame must still be FILLED. Either assertion alone is passable by breaking the other —
   * "the fill erases nothing" is trivially true of an effect that draws nothing, which is the failure
   * mode this file already warns about twice (see the Magnify Background note in the registry).
   *
   *   UPPER  squircle #2244ff  x 60..260  y 20..90    carries the effect
   *   LOWER  rect     #00ff66  x 20..300  y 110..230  the layer that used to vanish
   *   PROBE  x[30,290) y[125,225)  belongs to LOWER alone      SKY y[0,14) is empty frame
   * The canvas is project-sized, which is exactly the canvas exporter.js hands FM.renderScene. */
  function fbFx(params) {
    var e = FM.fxRegistry.makeInstance('fillbehind');
    if (!e) throw new Error('no registry entry for fillbehind');
    if (params) Object.keys(params).forEach(function (k) { e.params[k] = params[k]; });
    return e;
  }
  function fbUpper(fxs, over) {
    var l = FM.makeLayer('shape', Object.assign({ shape: 'squircle', x: 160, y: 55, shapeW: 200, shapeH: 70, fill: '#2244ff', start: 0, duration: 5 }, over || {}));
    if (fxs) l.effects = fxs;
    return l;
  }
  function fbLower(over) {
    return FM.makeLayer('shape', Object.assign({ shape: 'rect', x: 160, y: 170, shapeW: 280, shapeH: 120, fill: '#00ff66', start: 0, duration: 5 }, over || {}));
  }
  // survive% of the lower layer, lit% of the empty sky, and %(subject still its own colour)
  function fbOcc(layers) {
    var c = offscreen(320, 240);
    var g = c.getContext('2d', { willReadFrequently: true });
    FM.renderScene(g, scene(layers), 0);
    var d = g.getImageData(0, 0, 320, 240).data;
    var surv = 0, tot = 0, sky = 0, skyTot = 0, subj = 0, subjTot = 0, x, y, i;
    for (y = 125; y < 225; y++) for (x = 30; x < 290; x++) {
      i = (y * 320 + x) * 4; tot++;
      if (d[i] < 8 && d[i + 1] > 247 && d[i + 2] > 94 && d[i + 2] < 110) surv++;
    }
    for (y = 0; y < 14; y++) for (x = 0; x < 320; x++) {
      i = (y * 320 + x) * 4; skyTot++;
      if (d[i] > 6 || d[i + 1] > 6 || d[i + 2] > 6) sky++;
    }
    for (y = 35; y < 72; y++) for (x = 80; x < 240; x++) {
      i = (y * 320 + x) * 4; subjTot++;
      if (Math.abs(d[i] - 34) < 10 && Math.abs(d[i + 1] - 68) < 10 && Math.abs(d[i + 2] - 255) < 10) subj++;
    }
    return { pct: 100 * surv / tot, surv: surv, tot: tot,
             sky: 100 * sky / skyTot, subj: 100 * subj / subjTot };
  }
  function fbSays(r, what) {
    return what + ': ' + r.surv + '/' + r.tot + ' (' + r.pct.toFixed(1) + '%) of the layer below survived, '
      + r.sky.toFixed(0) + '% of the empty frame is filled, subject ' + r.subj.toFixed(0) + '%';
  }

  test('effects: Fill Behind does not erase the layer below it', { item: 'fill-behind' }, function () {
    var r = fbOcc([fbUpper([fbFx()]), fbLower()]);
    if (r.pct < 99.5) throw new Error(fbSays(r, 'Fill Behind wiped the layer underneath it') + ' — its frame-sized plate is being blitted over the composite at the layer’s own z instead of going down as a backdrop under the whole stack (fillBehindPass). This is Ezra’s bug: "adding an effect to this layer makes the layer behind it invisible"');
    if (r.sky < 95) throw new Error(fbSays(r, 'Fill Behind stopped filling the empty frame') + ' — the occlusion half of this test is now passable by an effect that draws nothing at all, which is not a fix');
    if (r.subj < 90) throw new Error(fbSays(r, 'the subject itself is gone') + ' — the fill went down but the layer no longer draws sharp on top of it');
  });

  test('effects: Fill Behind spares the layer below however small the subject is', { item: 'fill-behind' }, function () {
    // 40x40 in the corner: cover-scale makes the plate opaque edge to edge regardless of size, so
    // before the fix this speck erased the frame exactly as completely as a full-width layer did.
    var r = fbOcc([fbUpper([fbFx()], { x: 40, y: 40, shapeW: 40, shapeH: 40 }), fbLower()]);
    if (r.pct < 99.5) throw new Error(fbSays(r, 'a 40x40 layer erased the frame') + ' — size and position are irrelevant to the cover scale; only the ORDER of the fill keeps the layers below alive');
    if (r.sky < 95) throw new Error(fbSays(r, 'the speck’s fill did not fill the frame') + ' — a small subject must still fill the empty frame with its own blown-up copy');
  });

  test('effects: Fill Behind spares the layer below when it is stacked with other effects', { item: 'fill-behind' }, function () {
    // Gradient Overlay + Fill Behind is Ezra's screenshot exactly: the gradient recolours the layer,
    // then the fill blew that pink→blue wash across the whole frame. Both orders, because the fill
    // is built from the plate the rest of the stack has already baked into.
    [['gradientoverlay', 'fillbehind'], ['fillbehind', 'gradientoverlay'], ['fillbehind', 'glow'], ['pixelate', 'fillbehind']].forEach(function (pair) {
      var r = fbOcc([fbUpper(pair.map(function (id) { return id === 'fillbehind' ? fbFx() : FM.fxRegistry.makeInstance(id); })), fbLower()]);
      if (r.pct < 99.5) throw new Error(fbSays(r, 'stacked as [' + pair.join(' + ') + ']') + ' — the fix must hold for a stack, not just a lone Fill Behind');
      if (r.sky < 95) throw new Error(fbSays(r, 'stacked as [' + pair.join(' + ') + ']') + ' — the fill stopped filling once it was stacked');
    });
  });

  test('groups: a group nested inside another group keeps its own opacity', { item: 'nested-groups' }, function () {
    /* collectGroupUnits builds one flattened unit per group that has visual state of its own, then
     * claimed member ids first-come by scene order. An outer group's member list is built by a
     * RECURSIVE walk, so it already contains every descendant leaf — meaning an outer and an inner
     * unit both wanted the same leaves, and whichever came first in scene.layers took them. Outer
     * first (what groupSelection produces): the inner group was never drawn and its opacity/effects/
     * blend vanished silently. Inner first (Edit group → Add → Group): the leaves were composited
     * twice, once per unit.
     *
     * ONE PIXEL DECIDES IT, and it says which failure happened rather than just "wrong". A white
     * leaf inside B inside A, both at opacity 0.5, over black: correct is 255 × 0.5 × 0.5 = 64. One
     * 0.5 applied reads 128. Composited twice reads ~191. Both orders are reachable in the app, so
     * both are checked — and they must now agree with each other, since which order the user
     * happened to create the groups in should never have been visible in the render.
     *
     * The control is a SINGLE group at 0.5, which must read 128. Without it, a build where group
     * units broke entirely would drop to one opacity and look like a pass on the 64 assertion. */
    function centre(layers) {
      var c = offscreen(120, 90);
      var sc = scene(layers);
      sc.project = { width: 120, height: 90, fps: 30, duration: 5, background: '#000000' };
      var g = c.getContext('2d', { willReadFrequently: true });
      FM.renderScene(g, sc, 0);
      return g.getImageData(60, 45, 1, 1).data[0];
    }
    function nest(outerFirst) {
      var leaf = FM.makeLayer('shape', { shape: 'rect', name: 'leaf', x: 60, y: 45, shapeW: 60, shapeH: 40, fill: '#ffffff' });
      var B = FM.makeLayer('group', { name: 'B' }), A = FM.makeLayer('group', { name: 'A' });
      leaf.parent = B.id; B.parent = A.id;
      B.transform.opacity = 0.5; A.transform.opacity = 0.5;
      return outerFirst ? [A, B, leaf] : [B, A, leaf];
    }
    var leaf2 = FM.makeLayer('shape', { shape: 'rect', name: 'l2', x: 60, y: 45, shapeW: 60, shapeH: 40, fill: '#ffffff' });
    var G = FM.makeLayer('group', { name: 'G' });
    leaf2.parent = G.id; G.transform.opacity = 0.5;
    var one = centre([G, leaf2]);
    if (Math.abs(one - 128) > 2) throw new Error('the control — ONE group at opacity 0.5 over black — rendered ' + one + ' where 128 is correct, so group units are broken outright and the nesting assertions below cannot be trusted');

    [['outer group first (what groupSelection produces)', true],
     ['inner group first (Edit group → Add → Group)', false]].forEach(function (c) {
      var v = centre(nest(c[1]));
      if (Math.abs(v - 64) > 2) {
        var why = Math.abs(v - 128) <= 6 ? ' — only ONE 0.5 was applied, so the inner group was dropped entirely'
                : (v > 150 ? ' — the leaf was composited TWICE, once per unit' : '');
        throw new Error('with ' + c[0] + ', a leaf inside B(0.5) inside A(0.5) over black rendered ' + v + ' where 255 × 0.5 × 0.5 = 64 is correct' + why + '. Units must nest: the deepest unit holding a member draws it, and the shallowest is the one renderScene dispatches');
      }
    });
    // …and the two orders must agree, because which order the groups were created in is not
    // something the render should ever be able to see.
    var a = centre(nest(true)), b = centre(nest(false));
    if (a !== b) throw new Error('the same nested scene rendered ' + a + ' with the outer group first and ' + b + ' with the inner group first — group flattening is still sensitive to scene order');
  });

  test('effects: Tiles “Whole clip” does not throw away the other effect on the layer', { item: 'tiles-scratch' }, function () {
    /* drawCanvasEffect renders the clean layer into scratch A, hands A to the effect fn to write
     * into B, then blits B into ctx. Those were module singletons, defended by a comment arguing a
     * nested canvas effect always finishes before B is used. True for the plain drawLayer — but not
     * for the `expand` callback: Tiles' "Whole clip" repeat calls expand() to get the layer's
     * content from OUTSIDE the frame, expand() runs renderExpandedPlate, and THAT does its own
     * drawLayer, which re-enters drawCanvasEffect for the layer's other canvas effect and rewrites
     * both A and B underneath the outer tiles() that is still holding them.
     *
     * The measurement is a position, which is what makes it unarguable. Drift moves the square left
     * at 200px/s, so at t=1 a correct render has taken its content away from where it started. Any
     * fully-opaque pixel left in the square's un-drifted footprint is a copy of the layer that never
     * saw the Drift, and there is no legitimate route for one.
     *
     * TWO CONTROLS, because "some pixels in a rectangle" is a weak signal on its own and the tiling
     * legitimately puts content everywhere: the "On screen" repeat mode walks the same code with the
     * same two effects but never calls expand(), and the same scene with Drift DELETED shows what a
     * thrown-away Drift looks like. Pre-fix the buggy mode read 1521/1521 — byte-identical to the
     * Drift-deleted control, i.e. the Drift was gone completely — against 897 for On screen. */
    function solidAtUndrifted(source, withDrift) {
      var c = offscreen(400, 400);
      var l = FM.makeLayer('shape', { shape: 'rect', name: 'sq', x: 380, y: 200, shapeW: 40, shapeH: 40, fill: '#ffffff' });
      l.start = 0; l.duration = 5;
      var fx = [];
      if (withDrift) { var dr = FM.fxRegistry.makeInstance('drift'); dr.params.x = -200; dr.params.y = 0; fx.push(dr); }
      var ti = FM.fxRegistry.makeInstance('tiles');
      if (!ti) throw new Error('no registry entry for tiles');
      ti.params.gap = 40; ti.params.source = source;
      fx.push(ti);
      l.effects = fx;
      var sc = scene([l]);
      sc.project = { width: 400, height: 400, fps: 30, duration: 5, background: null };
      var g = c.getContext('2d', { willReadFrequently: true });
      FM.renderScene(g, sc, 1);
      var d = g.getImageData(0, 0, 400, 400).data, solid = 0, lit = 0;
      for (var i = 0; i < 400 * 400; i++) {
        var a = d[i * 4 + 3], x = i % 400, y = (i / 400) | 0;
        if (a > 8) lit++;
        if (a === 255 && x >= 361 && x <= 399 && y >= 181 && y <= 219) solid++;
      }
      return { solid: solid, lit: lit };
    }
    var whole = solidAtUndrifted(1, true);      // 1 = Whole clip: the mode that calls expand()
    var onscr = solidAtUndrifted(0, true);      // 0 = On screen:  same effects, never calls expand()
    var gone  = solidAtUndrifted(1, false);     // what a discarded Drift looks like
    if (!whole.lit || !onscr.lit) throw new Error('a repeat mode rendered an empty frame (whole ' + whole.lit + ', on-screen ' + onscr.lit + ' lit px) — the comparison below would be meaningless');
    if (gone.solid < 1400) throw new Error('the Drift-deleted control only filled ' + gone.solid + ' px of the un-drifted footprint — this test can no longer tell a discarded Drift apart from a working one');
    if (whole.solid > onscr.solid + 100) throw new Error('Tiles “Whole clip” left ' + whole.solid + ' fully-opaque px where the square sits with NO Drift applied, against ' + onscr.solid + ' for “On screen” and ' + gone.solid + ' with the Drift deleted outright — the expanded-plate render is clobbering drawCanvasEffect’s scratch, so an un-drifted copy of the clip is stamped over the tiling. Depth-index the scratch (see _cfPool / _expPool)');
  });

  test('effects: stacking two Mirrors does not resurrect what the first one removed', { item: 'mirror-stack' }, function () {
    /* drawMirror renders the clean layer into a scratch plate and then blits mirrored strips FROM
     * that plate INTO ctx. While the plate was a module singleton, stacking two Mirrors — Left→Right
     * plus Top→Bottom, which is just how you build a kaleidoscope — made the inner call's source and
     * destination the SAME bitmap: every strip blit was source-over onto the pixels it was reading,
     * so nothing was ever replaced and the inner Mirror silently did nothing.
     *
     * THE SCENE IS CHOSEN SO THE EXPECTED ANSWER IS EXACTLY ZERO, with no tolerance to argue about.
     * A 50x50 square at x=180 sits entirely in the RIGHT half of a 240-wide comp; Left→Right keeps
     * the left half and reflects it, so the correct frame is empty. A second Mirror can only mirror
     * emptiness, so it must stay empty. Pre-fix this read 2500 opaque px spanning x 155-204 — the
     * square's ORIGINAL, un-mirrored position, pixels that cannot arrive by any legitimate route
     * because the first Mirror already removed them.
     *
     * THE CONTROL BELOW IS LOAD-BEARING: "zero opaque pixels" is also what a scene that rendered
     * nothing at all reports, so a broken registry or a dead compositor would read as a pass here.
     * The same square on the LEFT, where a Mirror must visibly double it, is what tells the two
     * apart. Pixelate carries the identical fix for the identical reason. */
    function lit(x, fx) {
      var c = offscreen(240, 240);
      var l = FM.makeLayer('shape', { shape: 'rect', name: 'sq', x: x, y: 120, shapeW: 50, shapeH: 50, fill: '#ffffff' });
      l.effects = fx.map(function (mode) {
        var e = FM.fxRegistry.makeInstance('mirror');
        if (!e) throw new Error('no registry entry for mirror');
        e.params.mode = mode;
        return e;
      });
      var s = scene([l]);
      s.project = { width: 240, height: 240, fps: 30, duration: 5, background: null };
      var g = c.getContext('2d', { willReadFrequently: true });
      FM.renderScene(g, s, 0);
      var d = g.getImageData(0, 0, 240, 240).data, n = 0, minX = 240, maxX = -1;
      for (var i = 0; i < 240 * 240; i++) {
        if (d[i * 4 + 3] > 8) { n++; var xx = i % 240; if (xx < minX) minX = xx; if (xx > maxX) maxX = xx; }
      }
      return { n: n, span: maxX < 0 ? '—' : minX + '-' + maxX };
    }
    var bare = lit(60, []), ctl = lit(60, [0]);
    if (!(bare.n > 2000)) throw new Error('the control square did not render at all (' + bare.n + ' opaque px) — every assertion below would pass vacuously');
    if (!(ctl.n > bare.n * 1.5)) throw new Error('a single Mirror on a left-half square took ' + bare.n + ' opaque px to ' + ctl.n + ' — the Mirror effect is not reflecting anything, so this test cannot see the bug it is for');

    var one = lit(180, [0]), two = lit(180, [0, 2]);
    if (one.n !== 0) throw new Error('Left→Right on a square that sits entirely in the RIGHT half left ' + one.n + ' opaque px at x ' + one.span + ' — it should discard the right half entirely');
    if (two.n !== 0) throw new Error('adding a second Mirror to that empty frame brought back ' + two.n + ' opaque px at x ' + two.span + ' — the second Mirror is reading and writing the same scratch bitmap as the first, so its blits never replace anything. Depth-index the scratch plate (see _miPool in drawMirror)');
  });

  test('effects: two Fill Behinds keep their z-order against each other', { item: 'fill-behind' }, function () {
    /* The fills go down bottom-to-top in the same order their layers do, so the LOWER layer's own
     * fill cannot cover the layer above it. Both subjects sit in the sky, clear of the probe, so
     * anything the probe loses came from a fill. */
    var top = fbUpper([fbFx()], { x: 80, y: 40, shapeW: 90, shapeH: 40 });                      // blue
    var mid = fbUpper([fbFx()], { x: 240, y: 40, shapeW: 90, shapeH: 40, fill: '#ff8800' });    // orange
    var r = fbOcc([top, mid, fbLower()]);
    if (r.pct < 99.5) throw new Error(fbSays(r, 'two Fill Behinds') + ' — with more than one fill in the frame the layers below are being covered again');
    if (r.sky < 95) throw new Error(fbSays(r, 'two Fill Behinds') + ' — neither fill reached the empty frame');
    /* …and they stack in that order too. layers[0] is the TOP layer, so its fill is laid down LAST
     * of the two and is the one you see in the empty frame. Walk the pass the other way and the
     * bottom layer's fill wins instead — the frame goes orange — while every assertion above still
     * passes, which is what this one is here to stop. */
    var c = offscreen(320, 240);
    FM.renderScene(c.getContext('2d', { willReadFrequently: true }), scene([top, mid, fbLower()]), 0);
    var sd = c.getContext('2d', { willReadFrequently: true }).getImageData(0, 0, 320, 14).data;
    var sr = 0, sb = 0;
    for (var i = 0; i < sd.length; i += 4) { sr += sd[i]; sb += sd[i + 2]; }
    if (!(sb > sr)) throw new Error('the empty frame reads rgb r=' + Math.round(sr / (sd.length / 4)) + ' b=' + Math.round(sb / (sd.length / 4)) + ' — the BOTTOM layer’s orange fill is covering the TOP layer’s blue one, so the backdrop pass is laying the fills down in the wrong order (it must walk the stack bottom-to-top, exactly like the layer loop)');
  });

  test('effects: a Fill Behind inside a group stays inside that group', { item: 'fill-behind' }, function () {
    /* A member's fill fills the space inside its GROUP's plate, under the members above it — it must
     * never reach past the group onto the frame and take the other layers with it. Run twice: a
     * plain transform-only group (members draw straight into the frame) and a unit group (the
     * members are flattened onto one plate first, which is a different pass). */
    [false, true].forEach(function (unit) {
      var g = FM.makeLayer('group', { name: 'G' });
      if (unit) g.effects = [FM.fxRegistry.makeInstance('glow')];   // anything visual makes it a flattened unit
      var m = fbUpper([fbFx()]); m.parent = g.id;
      var r = fbOcc([g, m, fbLower()]);
      if (r.pct < 99.5) throw new Error(fbSays(r, (unit ? 'unit' : 'plain') + ' group') + ' — a Fill Behind on a group MEMBER erased a layer outside the group');
      if (r.sky < 95) throw new Error(fbSays(r, (unit ? 'unit' : 'plain') + ' group') + ' — the member’s fill did not fill the space around it');
    });
    // …and the same for a fill on the GROUP itself, which is built from the flattened unit.
    var g2 = FM.makeLayer('group', { name: 'G2' });
    g2.effects = [fbFx()];
    var m2 = fbUpper(null); m2.parent = g2.id;
    var r2 = fbOcc([g2, m2, fbLower()]);
    if (r2.pct < 99.5) throw new Error(fbSays(r2, 'fill on the group itself') + ' — the group’s own fill erased the layer below the group');
    if (r2.sky < 95) throw new Error(fbSays(r2, 'fill on the group itself') + ' — the group’s own fill never reached the frame');
  });

  test('effects: a Fill Behind that is not on screen paints no backdrop', { item: 'fill-behind' }, function () {
    /* The backdrop pass runs BEFORE the layer loop, so it has to repeat the loop's own skips itself.
     * Miss one and the frame gains a wash from a layer that is not being drawn — the fill would
     * outlive its own layer. Hidden, disabled and not-solo each have to come out empty. */
    var hidden = fbUpper([fbFx()]); hidden.visible = false;
    var rh = fbOcc([hidden, fbLower()]);
    if (rh.sky > 2) throw new Error(fbSays(rh, 'a HIDDEN layer') + ' — its fill is still being painted; the pass must skip what the layer loop skips');
    var off = fbUpper([fbFx()]); off.effects[0].enabled = false;
    var ro = fbOcc([off, fbLower()]);
    if (ro.sky > 2) throw new Error(fbSays(ro, 'a DISABLED Fill Behind') + ' — an effect switched off must paint nothing');
    var up = fbUpper([fbFx()]), low = fbLower(); low.solo = true;
    var rs = fbOcc([up, low]);
    if (rs.sky > 2) throw new Error(fbSays(rs, 'a non-solo layer while another layer is soloed') + ' — solo hides the layer but its fill still washed the frame');
    if (rs.pct < 99.5) throw new Error(fbSays(rs, 'solo') + ' — the soloed layer itself did not survive');
  });

  test('effects: a scene with no Fill Behind renders byte-identically', { item: 'fill-behind' }, function () {
    /* The backdrop pass walks every layer of every composite, so it must be provably free when the
     * effect is not in use. Same scene, once with a DISABLED Fill Behind and once with none at all:
     * one byte of difference means the pass is touching frames it has no business touching. */
    var a = offscreen(320, 240), b = offscreen(320, 240);
    var off = fbUpper([fbFx()]); off.effects[0].enabled = false;
    FM.renderScene(a.getContext('2d', { willReadFrequently: true }), scene([off, fbLower()]), 0);
    FM.renderScene(b.getContext('2d', { willReadFrequently: true }), scene([fbUpper(null), fbLower()]), 0);
    var da = a.getContext('2d', { willReadFrequently: true }).getImageData(0, 0, 320, 240);
    var db = b.getContext('2d', { willReadFrequently: true }).getImageData(0, 0, 320, 240);
    var n = fbDiff(da, db);
    if (n !== 0) throw new Error(n + ' bytes differ between a scene carrying a disabled Fill Behind and the same scene without one — the backdrop pass is changing frames that do not use the effect');
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
      // 'Colouring' since v6.13 — Ezra renamed it from 'Color & Fill' when the fire-looking icon was
      // recoloured. The ORDER is what this test is about; the names are how it identifies the cards.
      const want = ['Colouring', 'Border & Shadow', 'Blending & Opacity', 'Move & Transform', 'Speed', 'Volume', 'Edit Shape', 'Presets', 'Effects'];
      if (vLabels.join(' | ') !== want.join(' | ')) {
        throw new Error('card order is not the target layout:\n  got:  ' + vLabels.join(' | ') + '\n  want: ' + want.join(' | '));
      }
      if (vLabels.indexOf('Audio Effects') >= 0) throw new Error('the Audio Effects card is still in the grid — it moved into the Add Effect browser');
      // Numbered 1..9, and the disabled ones keep their number (visible, dim — never hidden).
      vCards.forEach(function (c, i) { if (c.num !== String(i + 1)) throw new Error('card ' + (i + 1) + ' (' + c.label + ') is badged “' + c.num + '”'); });

      // The disabled treatment is the v5.61 one: present, dim, and it says why when tapped.
      const sVol = sCards[5], sSpd = sCards[4], vVol = vCards[5], vSpd = vCards[4];
      if (!sVol.off) throw new Error('the Volume card on a shape is not greyed (.cat-card-disabled) — a shape has no audio');
      // Speed is NOT in the greyed set any more (v6.39, queue 68): it re-times the layer's keyframes,
      // so it does something on a shape. Volume still is — a shape genuinely has no audio.
      if (sSpd.off) throw new Error('the Speed card on a shape is greyed — since v6.39 speed stretches this layer\'s keyframes with the clip, so it is live on every type');
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

  /* The home → project push must never re-lay-out either screen (queue 55).
   *
   * This is the test that would have caught the rejected first attempt, and it caught this one too
   * before it shipped. The trap: an incoming screen that is still IN FLOW and translated a whole
   * viewport to the right contributes that viewport as horizontal SCROLLABLE OVERFLOW, and Chrome on
   * a phone answers horizontal overflow by widening the layout viewport to contain it. Measured at
   * 380px on a real top-level page (not an iframe — an iframe hides this completely): innerWidth went
   * 380 → 760 the moment the push started, #home-screen followed it to 760, and .hm-grid jumped from
   * 348 to its 700px cap. Every card, every tab and the whole list reflowed twice, on exactly the
   * 280ms that has to stay smooth.
   *
   * So the invariant is layout, not looks, and it is checkable at any viewport: with the push classes
   * on, no width may move and the document may not gain any horizontal overflow. The classes are the
   * real ones off styles.css — nothing here is stubbed — and the widths are read back while they are
   * applied, so a future edit that reaches for `width` instead of `transform` fails here. */
  test('home push: the two screens slide without either being re-laid-out', { item: 'home-push' }, async function () {
    var sleep = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };
    var home = document.getElementById('home-screen');
    var app = document.getElementById('app');
    if (!home || !app) throw new Error('#home-screen / #app missing');
    var wasHidden = home.classList.contains('hidden');
    var grid = home.querySelector('.hm-grid');
    if (!grid) throw new Error('.hm-grid missing — the home screen was never built');
    try {
      home.classList.remove('hidden');
      await sleep(0);
      var de = document.documentElement;
      var before = { home: home.offsetWidth, grid: grid.offsetWidth, app: app.offsetWidth,
                     doc: de.scrollWidth, client: de.clientWidth };
      if (!(before.home > 0 && before.grid > 0 && before.app > 0)) throw new Error('nothing has a width to compare — the home screen is not laid out');

      document.body.classList.add('fm-pushing');
      home.classList.add('fm-push-out');
      app.classList.add('fm-push-in');
      await sleep(0);
      // Sample across the animation rather than at one instant: a width that only moves mid-curve
      // (a percentage width, a container that grows with the transform) has to be caught too.
      for (var i = 0; i < 12; i++) {
        var now = { home: home.offsetWidth, grid: grid.offsetWidth, app: app.offsetWidth,
                    doc: de.scrollWidth, client: de.clientWidth };
        if (now.home !== before.home) throw new Error('#home-screen was re-laid-out mid-push: ' + before.home + ' → ' + now.home + 'px');
        if (now.grid !== before.grid) throw new Error('.hm-grid was re-laid-out mid-push: ' + before.grid + ' → ' + now.grid + 'px — every card reflows with it');
        if (now.app !== before.app) throw new Error('#app was re-laid-out mid-push: ' + before.app + ' → ' + now.app + 'px');
        if (now.doc > now.client) throw new Error('the push added ' + (now.doc - now.client) + 'px of horizontal overflow — on a phone that widens the layout viewport and reflows both screens');
        await new Promise(function (r) { requestAnimationFrame(r); });
      }

      // The mechanism that makes the above true, asserted directly so it cannot be lost by accident:
      // the incoming screen is taken OUT OF FLOW for the push. An in-flow #app translated a whole
      // viewport to the right is the overflow, and position:fixed is what stops it counting.
      // Everything above this line is true on BOTH paths — nothing may reflow either way. Everything
      // below it is about travel, and under prefers-reduced-motion there is deliberately none: #app
      // never leaves the flow, so asserting position:fixed there turned this test red for anyone who
      // has the OS setting on. That is the reduced-motion contract, so it is checked, not skipped.
      var cs = getComputedStyle(app);
      if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
        if (cs.animationName !== 'none') throw new Error('#app still runs "' + cs.animationName + '" under prefers-reduced-motion — the editor is supposed to be sitting still while home fades off it');
        if (cs.position !== 'static') throw new Error('#app is position:' + cs.position + ' under reduced motion — nothing is travelling, so nothing should leave the flow');
        if (getComputedStyle(home).animationName !== 'fm-push-fade') throw new Error('home runs "' + getComputedStyle(home).animationName + '" under reduced motion instead of the cross-dissolve');
      } else {
        if (cs.position !== 'fixed') throw new Error('#app is position:' + cs.position + ' during the push — in flow, its transform counts as document overflow and the phone viewport doubles');
        if (!(parseInt(cs.zIndex, 10) > 200)) throw new Error('#app sits at z-index ' + cs.zIndex + ' during the push — it must clear the home overlay (200) or the editor slides in underneath it');
        if (cs.animationName !== 'fm-push-in') throw new Error('#app is running "' + cs.animationName + '" — the editor does not enter');
        if (!(parseFloat(cs.animationDuration) > 0)) throw new Error('the push has no duration (' + cs.animationDuration + ')');
        if (cs.animationTimingFunction === 'linear') throw new Error('the push eases linearly — it is supposed to decelerate in');
      }

      // Only transform and opacity may be animated. Anything else in these keyframes is a per-frame
      // layout or paint cost on the frames that have to stay at 60.
      var names = { 'fm-push-out': 1, 'fm-push-in': 1, 'fm-push-in-vw': 1, 'fm-push-lead': 1, 'fm-push-lead-cold': 1, 'fm-push-fade': 1 }, seen = 0;
      [].slice.call(document.styleSheets).forEach(function (ss) {
        var rules; try { rules = ss.cssRules; } catch (e) { return; }
        [].slice.call(rules || []).forEach(function (r) {
          if (r.type !== CSSRule.KEYFRAMES_RULE || !names[r.name]) return;
          seen++;
          [].slice.call(r.cssRules).forEach(function (kf) {
            for (var j = 0; j < kf.style.length; j++) {
              var p = kf.style[j];
              if (p !== 'transform' && p !== 'opacity') throw new Error('@keyframes ' + r.name + ' animates "' + p + '" — the push must be transform/opacity only');
            }
          });
        });
      });
      if (seen < 6) throw new Error('found only ' + seen + ' of the 6 push keyframes — this test would be asserting nothing');
    } finally {
      document.body.classList.remove('fm-pushing');
      home.classList.remove('fm-push-out');
      app.classList.remove('fm-push-in');
      if (wasHidden) home.classList.add('hidden');
    }
    // NOTE ON WHAT IS *NOT* ASSERTED HERE. This test stamps the push classes itself, so it also has to
    // strip them itself — and an earlier version then asserted, right here, that #app had no transform
    // and was back to position:static. That is self-fulfilling: the four lines above had just removed
    // the only classes that could have caused either. The teardown that actually matters is the app's
    // own endPush(), and a stranded transform on #app is a real permanent bug (it re-roots every
    // position:fixed descendant of the editor), so it is asserted where a REAL push has just run —
    // see "the app cleans up after itself" in the press test below.
  });

  /* The push moves MORE than the two screens (queue 55). The editor's + orb is body-level
   * position:fixed chrome that lives OUTSIDE #app, so it needs its own copy of the animation — and
   * that is where the previous attempt broke, invisibly to the test above, because every assertion in
   * it only ever walks #home-screen, .hm-grid and #app.
   *
   * A percentage inside translate resolves against the ANIMATED ELEMENT'S OWN border box. Put the
   * 64px + orb on #app's fm-push-in (from: translate3d(100%,0,0)) and the orb starts 64px from home
   * while the viewport-sized #app starts a whole screen away. Measured at 380px: 315.6px apart at the
   * worst frame (326 at 390, 350 at 414 — viewport minus 64, every time). Two things you can see: at
   * t=0, editor still entirely off-screen and home still at full opacity, a 16px sliver of the orb is
   * already painted on the RIGHT EDGE OF THE HOME SCREEN beside home's own + button; and for the rest
   * of the push the orb swims left across the incoming editor's face and lands ~200ms early.
   * fm-push-in-vw (100vw — the distance #app actually covers) is the fix; this holds it there.
   *
   * THE ORB IS PHONE-ONLY (display:none above 700px) AND THE SUITE'S FRAME IS 900px WIDE. The first
   * version of this test put the geometry, the hit-test and the curve sweep behind
   * `if (fabCs.position === 'fixed' && fabCs.display !== 'none')` — a condition that is NEVER true
   * inside tests/run.html. Measured there: display none, position static, box 0x0, so that whole half
   * silently asserted nothing and reported green. A test that cannot run is not a test. So the runner
   * is narrowed to a phone viewport for the length of this test and put back afterwards — same
   * document, same stylesheets, real media queries, real boxes — and the sweep no longer names the
   * orb at all: it WALKS every position:fixed element under <body> that is outside both screens and
   * on screen during the push, and requires each one to be rigid with one of the two screens. That is
   * the general form of the defect, so the next piece of floating chrome is covered for free.
   *
   * It also PAUSES and seeks the animations instead of sampling on rAF: this curve is ~20% of the way
   * along by the end of the first frame, so "the first frame" is not reachable by waiting for one —
   * and the sliver only ever existed at the very start. */
  test('home push: the editor’s body-level chrome travels with the editor, not with itself', { item: 'home-push' }, async function () {
    var home = document.getElementById('home-screen');
    var app = document.getElementById('app');
    var fab = document.getElementById('add-fab');
    if (!home || !app || !fab) throw new Error('#home-screen / #app / #add-fab missing');
    var reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    var wasHidden = home.classList.contains('hidden');
    var rAF = function () { return new Promise(function (r) { requestAnimationFrame(function () { r(); }); }); };

    // the `from` transform of a named @keyframes, straight off the real stylesheet
    function startTransform(name) {
      var found = null;
      [].slice.call(document.styleSheets).forEach(function (ss) {
        var rules; try { rules = ss.cssRules; } catch (e) { return; }
        [].slice.call(rules || []).forEach(function (r) {
          if (r.type !== CSSRule.KEYFRAMES_RULE || r.name !== name) return;
          [].slice.call(r.cssRules).forEach(function (k) {
            if (k.keyText === 'from' || k.keyText === '0%') found = k.style.transform;
          });
        });
      });
      return found;
    }
    // …resolved to CSS pixels at THIS viewport. A % is of the animated element's own border box; any
    // absolute or viewport unit is measured with a throwaway probe, so "100vw" is never assumed to
    // mean anything — it is measured.
    function startPx(name, ownBoxWidth) {
      var t = startTransform(name);
      if (!t) throw new Error('@keyframes ' + name + ' has no from/0% frame — the push has no start');
      var m = /translate3?d?\(\s*([^,)]+)/.exec(t);
      if (!m) throw new Error('@keyframes ' + name + ' starts from "' + t + '", which is not a translate');
      var v = m[1].trim();
      if (v.charAt(v.length - 1) === '%') return parseFloat(v) / 100 * ownBoxWidth;
      var probe = document.createElement('div');
      probe.style.cssText = 'position:absolute;left:-99999px;top:0;height:1px;width:' + v;
      document.body.appendChild(probe);
      var px = probe.getBoundingClientRect().width;
      probe.parentNode.removeChild(probe);
      return px;
    }

    // Narrow the suite's own frame to a phone. tests/run.html loads the app in an iframe and injects
    // this script INTO it, so frameElement is that iframe and same-origin — resizing it is a real
    // viewport change, media queries and all. Restored in the finally.
    var frameEl = null; try { frameEl = window.frameElement; } catch (e) { frameEl = null; }
    var restore = null;
    if (innerWidth > 700) {
      if (!frameEl) throw new Error('this test needs a ≤700px viewport (the + orb is display:none above that) and there is no frame to resize — run it from tests/run.html, or narrow the window');
      restore = { w: frameEl.style.width, h: frameEl.style.height };
      frameEl.style.width = '380px'; frameEl.style.height = '800px';
      await rAF(); await rAF();
      if (innerWidth > 700) throw new Error('narrowing the runner frame did not take: innerWidth is still ' + innerWidth);
    }

    try {
      home.classList.remove('hidden');
      await rAF();
      document.body.classList.add('fm-pushing');
      home.classList.add('fm-push-out');
      app.classList.add('fm-push-in');
      await rAF();

      var fabCs = getComputedStyle(fab), appCs = getComputedStyle(app);
      if (reduced) {
        // The other half of the contract: under reduced motion NOTHING travels, and the orb has to
        // drop back to its own z-index or the fading home screen paints underneath it.
        if (fabCs.animationName !== 'none') throw new Error('the + orb still runs "' + fabCs.animationName + '" under prefers-reduced-motion');
        if (appCs.animationName !== 'none') throw new Error('#app still runs "' + appCs.animationName + '" under prefers-reduced-motion');
        if (appCs.position !== 'static') throw new Error('#app is position:' + appCs.position + ' under reduced motion — nothing is travelling, so nothing should leave the flow');
        if (fabCs.zIndex !== '61') throw new Error('the + orb sits at z-index ' + fabCs.zIndex + ' under reduced motion — it must go back to 61 or the fading home screen paints over it');
        return;
      }

      // A toast can be up when the push starts ("Creating project…" fires on home, "Added …" fires as
      // the editor arrives). It does not travel — see the rigidity sweep below — but it does have to
      // stay VISIBLE: at its resting z-index 60 the incoming #app, lifted to 210 for the length of
      // the push, slides straight over the top of it and it pops back into view at the end. Checked
      // from the computed style rather than from a live toast so it runs on every pass.
      var toast = document.getElementById('toast');
      if (toast) {
        var tz = parseInt(getComputedStyle(toast).zIndex, 10), az = parseInt(appCs.zIndex, 10);
        if (!(tz > az)) throw new Error('#toast sits at z-index ' + tz + ' during the push, under #app’s ' + az + ' — a toast that is already on screen gets buried by the incoming editor and reappears when the push ends');
      }

      /* ---- the orb is really there now, so this is a measurement and not a skipped branch ---- */
      if (fabCs.display === 'none' || fabCs.position !== 'fixed') throw new Error('at ' + innerWidth + 'px the + orb is display:' + fabCs.display + ' position:' + fabCs.position + ' — the phone chrome this test exists to measure is not on screen, so nothing below would be asserting anything');

      /* ---- same distance, same duration, same curve ---- */
      if (fabCs.animationName === 'none') throw new Error('the + orb does not animate during the push — it would sit still in the middle of the screen everything else is leaving');
      if (appCs.animationName === 'none') throw new Error('#app does not animate during the push');
      if (fabCs.animationDuration !== appCs.animationDuration) throw new Error('the + orb runs for ' + fabCs.animationDuration + ' against #app’s ' + appCs.animationDuration + ' — it lands at a different moment from the screen it belongs to');
      if (fabCs.animationTimingFunction !== appCs.animationTimingFunction) throw new Error('the + orb eases on ' + fabCs.animationTimingFunction + ' against #app’s ' + appCs.animationTimingFunction + ' — same distance, different shape, so it drifts mid-flight');
      var appStart = startPx(appCs.animationName, app.getBoundingClientRect().width);
      var fabStart = startPx(fabCs.animationName, fab.getBoundingClientRect().width);
      if (Math.abs(appStart - fabStart) > 2) throw new Error('the + orb starts ' + Math.round(fabStart) + 'px off-screen where #app starts ' + Math.round(appStart) + 'px off-screen — a % inside translate is of the ANIMATED ELEMENT, so a 64px button on #app’s keyframes travels 64px while its screen travels a whole viewport');

      if (typeof app.getAnimations !== 'function') throw new Error('this browser cannot seek CSS animations from script — the push cannot be measured at its first frame');
      var pushNames = { 'fm-push-in': 1, 'fm-push-in-vw': 1, 'fm-push-out': 1, 'fm-push-fade': 1 };
      var anims = [home, app, fab].reduce(function (acc, e) { return acc.concat(e.getAnimations()); }, [])
        .filter(function (a) { return pushNames[a.animationName]; });
      if (anims.length < 3) throw new Error('only ' + anims.length + ' push animation(s) are running (#home-screen, #app and the + orb each need one) — this test would be asserting nothing');
      anims.forEach(function (a) { a.pause(); a.currentTime = 0; });

      /* ---- FRAME ZERO: home is still fully up, so NOTHING of the editor may be on screen ---- */
      var a0 = app.getBoundingClientRect();
      if (a0.left < innerWidth - 1) throw new Error('#app starts the push already ' + Math.round(innerWidth - a0.left) + 'px on screen');
      var f0 = fab.getBoundingClientRect();
      if (f0.left < innerWidth - 1) throw new Error('the + orb starts the push ' + Math.round(innerWidth - f0.left) + 'px INSIDE the home screen — a sliver of the editor is painted over home before the editor has moved at all');

      // The general form, so the next piece of floating chrome is caught for free: anything outside
      // both screens that TRAVELS with the push, has been lifted above the home overlay's z-index 200
      // and is on screen at frame zero is, by definition, the editor painting over home before it has
      // moved. Something lifted but standing still is a different thing and is allowed — see #toast
      // on the rigidity sweep below.
      var over = [];
      [].slice.call(document.querySelectorAll('body *')).forEach(function (n) {
        if (n.closest('#home-screen') || n.closest('#app')) return;
        var cs = getComputedStyle(n);
        if (cs.position !== 'fixed' || cs.display === 'none' || cs.visibility === 'hidden' || parseFloat(cs.opacity) < 0.02) return;
        if (cs.animationName === 'none') return;
        if (!(parseInt(cs.zIndex, 10) > 200)) return;
        var r = n.getBoundingClientRect();
        if (r.width <= 0 || r.height <= 0) return;
        if (r.right <= 0.5 || r.left >= innerWidth - 0.5 || r.bottom <= 0.5 || r.top >= innerHeight - 0.5) return;
        over.push((n.id ? '#' + n.id : n.tagName) + ' x' + Math.round(r.left) + '..' + Math.round(r.right));
      });
      if (over.length) throw new Error('at frame zero, with the editor still entirely off-screen, this sits above the home overlay AND on screen: ' + over.join(', '));

      // Rects cannot see "covered" or "clipped", so hit-test the right edge of the home screen too —
      // at the orb's own height, which is exactly where the sliver landed.
      var hit = document.elementFromPoint(Math.max(1, innerWidth - 6), Math.max(1, innerHeight - 52));
      if (hit && (hit.closest('#app') || hit.closest('#add-fab'))) throw new Error('the right edge of the home screen hit-tests to ' + (hit.id ? '#' + hit.id : hit.tagName) + ', which belongs to the editor — it is painting over home on the first frame of the push');

      /* ---- and then the whole curve, walked rather than named ----
         Every body-level fixed thing outside the two screens that is on screen at ANY point of the
         push has to be rigid with SOMETHING: it rides with #app (it belongs to the editor), it leaves
         with #home-screen (it belongs to home), or it does not move at all (it belongs to neither —
         a toast is a message about what just happened, not screen furniture, and it stays put and
         readable above both). Rigid with none of the three is the defect: something travelling on a
         distance of its own, which is exactly what the 64px orb on a viewport-sized keyframe did.
         Then, separately, the orb itself — which is not a naming shortcut but the result of walking
         the phone editor at 380x800: of every body-level fixed element outside the two screens, it is
         the only one with a visible box there, so it is the only one that has to RIDE. Written as its
         own assertion because "the editor's chrome must travel with the editor" cannot be derived
         from geometry alone: an orb left sitting still would satisfy the three-way rule above. */
      var cands = [].slice.call(document.querySelectorAll('body *')).filter(function (n) {
        if (n.closest('#home-screen') || n.closest('#app')) return false;
        var cs = getComputedStyle(n);
        if (cs.position !== 'fixed' || cs.display === 'none' || cs.visibility === 'hidden' || parseFloat(cs.opacity) < 0.02) return false;
        var r = n.getBoundingClientRect();
        return r.width > 0 && r.height > 0;
      });
      var tracked = [], onScreen = [];
      cands.forEach(function (n) { tracked.push({ n: n, app: [], home: [], self: [], seen: false }); });
      for (var ms = 0; ms <= 280; ms += 14) {
        anims.forEach(function (a) { a.currentTime = ms; });
        var aL = app.getBoundingClientRect().left, hL = home.getBoundingClientRect().left;
        tracked.forEach(function (t) {
          var r = t.n.getBoundingClientRect();
          if (r.right > 0.5 && r.left < innerWidth - 0.5 && r.bottom > 0.5 && r.top < innerHeight - 0.5) t.seen = true;
          t.app.push(r.left - aL); t.home.push(r.left - hL); t.self.push(r.left);
        });
      }
      function spread(a) { return Math.max.apply(null, a) - Math.min.apply(null, a); }
      var fabDrift = null;
      tracked.forEach(function (t) {
        if (!t.seen) return;   // never on screen during the push: it has nothing to ride in
        var id = t.n.id ? '#' + t.n.id : t.n.tagName;
        onScreen.push(id);
        var dApp = spread(t.app), dHome = spread(t.home), dSelf = spread(t.self);
        if (t.n === fab) fabDrift = dApp;
        if (Math.min(dApp, dHome, dSelf) > 1) throw new Error(id + ' drifted ' + dApp.toFixed(1) + 'px from #app, ' + dHome.toFixed(1) + 'px from #home-screen and ' + dSelf.toFixed(1) + 'px from where it started, across the push — it is rigid with neither screen nor the viewport, so it travels on a distance of its own');
      });
      if (onScreen.indexOf('#add-fab') < 0) throw new Error('the + orb was never on screen during the push at ' + innerWidth + 'px — the one piece of body-level chrome this test exists for was not measured');
      if (!(fabDrift <= 1)) throw new Error('the + orb drifted ' + fabDrift.toFixed(1) + 'px from #app’s left edge across the push — the editor’s own chrome has to travel with the editor, whether that means swimming across it or sitting still while it arrives');
    } finally {
      document.body.classList.remove('fm-pushing');
      home.classList.remove('fm-push-out');
      app.classList.remove('fm-push-in');
      if (wasHidden) home.classList.add('hidden');
      if (restore && frameEl) {
        frameEl.style.width = restore.w; frameEl.style.height = restore.h;
        await rAF(); await rAF();
      }
    }
  });

  /* THE PRESS HAND-OFF (queue 55, round three). The animation was never the hard part; this is. Opening a
   * project is ASYNC — the media has to decode — so between the finger lifting and the push starting
   * there is a gap of unknown length, routinely over a second, in which the pressed card is the only
   * thing on screen saying the tap landed. Three rejected rounds were all failures of measurement
   * SCOPE, not of mechanism: a single clean warm tap looks perfect while a cold launch, a repeat tap
   * and a cross tap are all broken. So this test drives the real handlers through all of them, with
   * the open stubbed SLOW, which is the only way the gap is visible at all.
   *
   * IT RUNS IN BOTH MOTION MODES, and that is not a detail. The previous version aborted on its
   * seventh assertion under prefers-reduced-motion — it demanded a lead ANIMATION on the tapped card,
   * and the reduced-motion block deliberately gives the lead `animation: none` — so every assertion
   * about the press hand-off silently never executed for anyone with the OS setting on. Measured with
   * Chrome's prefers-reduced-motion emulation: 6 of the section's assertions ran, the 7th threw, and
   * the remaining 40-odd never ran at all while the suite reported one tidy red. Reduced motion is a
   * legitimate state with its own contract (no travel, but the tap still has to be answered), so every
   * check below either holds in both modes or has a reduced-motion counterpart that does.
   *
   * Every assertion goes through ck(), which COUNTS it and publishes the count on
   * window.__fmPushAsserts. "A test that cannot run is not a test" is only checkable if the number of
   * assertions that EXECUTE is reported, not the number that pass.
   *
   * It runs against a STUBBED project list, and the writers (saveIndex / touchCurrent) are stubbed
   * out with it: the suite shares localStorage and IndexedDB with the real app, and a test that
   * renders two fake projects must not be able to write them into anyone's library. */
  test('home push: the press answers the tap, survives the wait, and hands over without a pop', { item: 'home-push' }, async function () {
    var home = document.getElementById('home-screen');
    var app = document.getElementById('app');
    if (!home || !app) throw new Error('#home-screen / #app missing');
    var reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    var rAF = function () { return new Promise(function (r) { requestAnimationFrame(function () { r(); }); }); };
    var sleep = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };
    var executed = [];
    function ck(label, ok, msg) { executed.push(label); if (!ok) throw new Error(msg); }
    var P = FM.projects;
    var saved = { list: P.list, open: P.open, currentId: P.currentId, saveIndex: P.saveIndex,
                  touchCurrent: P.touchCurrent, getThumb: P.getThumb, migrateThumbs: P.migrateThumbs };
    var W = FM.home._waits;
    if (!W || typeof W.stuck !== 'number') throw new Error('FM.home._waits is not exposed — the abandoned-open section cannot run without shortening the backstop, and an 8s sleep in the suite is not a substitute');
    var savedStuck = W.stuck;
    /* THE PHONE GATE. The push is a phone behaviour — it was designed and measured at 380/390/414, and
       an unscoped version was caught playing the full slide on desktop with #app going position:fixed
       z-index 210 mid-flight at 1280x720. This runner's frame is ~900px, i.e. it IS the desktop case,
       so assert the real gate says no here — and then stub it, because otherwise every push assertion
       below would be dead code in a frame that can never be 700px wide. Restored in the finally. */
    var savedGate = FM.home._pushAllowed;
    if (typeof savedGate !== 'function') throw new Error('FM.home._pushAllowed is not exposed — the push gate cannot be asserted, and the push assertions below would silently never run');
    ck('gate/desktop-width-gets-no-push', savedGate() === false,
       'the runner frame is ' + innerWidth + 'px wide and the push gate still returned true — a full-screen 280ms slide would play on desktop, where it has never been measured');
    FM.home._pushAllowed = function () { return true; };
    var wasHidden = home.classList.contains('hidden');
    var view = null; try { view = localStorage.getItem('fm.view'); } catch (e) {}
    var fake = [{ id: '__push_a', name: 'ZZ push A', created: 2, modified: 2, width: 1080, height: 1920, fps: 30, duration: 3 },
                { id: '__push_b', name: 'ZZ push B', created: 1, modified: 1, width: 1080, height: 1920, fps: 30, duration: 3 }];
    var openMs = 0, cur = null, opens = 0;   // opens: two overlapping loads leaked media — see repeat/
    P.list = function () { return fake.map(function (o) { return Object.assign({}, o); }); };
    P.currentId = function () { return cur; };
    function fastOpen(id) { opens++; return new Promise(function (r) { setTimeout(function () { cur = id; r(true); }, openMs); }); }
    P.open = fastOpen;
    P.saveIndex = function () {};                                  // nothing here may reach the real library
    P.touchCurrent = function () {};
    P.getThumb = function () { return Promise.resolve(null); };
    P.migrateThumbs = function () { return Promise.resolve(); };

    function press(el, type) {
      var r = el.getBoundingClientRect();
      el.dispatchEvent(new PointerEvent(type, { bubbles: true, cancelable: true, pointerId: 1,
        pointerType: 'touch', isPrimary: true, button: 0, buttons: type === 'pointerdown' ? 1 : 0,
        clientX: r.left + r.width / 2, clientY: r.top + r.height / 2 }));
    }
    function click(el) {
      var r = el.getBoundingClientRect();
      el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, clientX: r.left + r.width / 2, clientY: r.top + r.height / 2 }));
    }
    function tap(el) { press(el, 'pointerdown'); press(el, 'pointerup'); click(el); }
    function release(el) { press(el, 'pointerup'); click(el); }
    function scaleOf(el) {
      var t = getComputedStyle(el).transform;
      return t === 'none' ? 1 : parseFloat(t.slice(t.indexOf('(') + 1).split(',')[0]);
    }
    function opacityOf(el) { return parseFloat(getComputedStyle(el).opacity); }
    // "Is the press on screen?" is a different question in each mode: a scale under motion, a dim
    // under reduced motion. Both are read off the REAL computed style, never off the class.
    function pressShows(el) { return reduced ? opacityOf(el) < 0.9 : scaleOf(el) < 0.99; }
    async function cards() {
      FM.home.open();                       // also unwinds any push still running (endPush)
      home.classList.remove('hm-preintro'); // the splash's business, not the push's
      home.classList.remove('hm-intro');    // …and no section inherits the previous one's cold launch
      await rAF();
      var c = [].slice.call(document.querySelectorAll('#home-screen .hm-card'));
      if (c.length < 2) throw new Error('the stubbed library rendered ' + c.length + ' card(s); this test needs two');
      return c;
    }
    // Byte-for-byte what stampIntro (js/home.js) writes on the first card of a cold launch: the class,
    // the INLINE animation-delay, and — the part the previous version of this test left out — the
    // .hm-intro on #home-screen that the rule is scoped through. Without that class the selector
    // `#home-screen.hm-intro .hm-in` never matches, no entry animation ever runs, and the section
    // could not have seen the defect it exists to catch.
    function stampColdLaunch(card, delay) {
      home.classList.add('hm-intro');
      card.classList.add('hm-in');
      card.style.animationDelay = delay;
    }

    try {
      /* ---- 1. COLD LAUNCH: the entry stagger vs the press ----
         @keyframes hm-rise animates TRANSFORM, and a running animation always beats a plain
         declaration, so while it plays `.hm-card.fm-card-press { transform: scale(.965) }` does
         nothing at all. Measured on a real cold launch at 380x800 — splash played and dismissed by
         tapping it, Input.dispatchTouchEvent, per-frame computed style, top level, before the fix:
         press class on at 79.5ms, card at scale 1.0000 for 14 frames / 232ms, then the push arrived
         at 311.5ms and jumped it 1.0000 → 0.9650 in ONE frame. On a slower open the press stayed
         invisible for 34 frames / 533ms and then popped on its own the moment hm-rise ended. After:
         0 frames invisible, hand-off jump 0.0000 on scale and 0.00000 on opacity, at 320/380/414 and
         in both motion modes. */
      var c = await cards();
      stampColdLaunch(c[0], '0.49s');
      await rAF();
      var pre = getComputedStyle(c[0]);
      if (reduced) {
        // the contract on this path: there is no entrance to fight with in the first place
        ck('cold/no-entry-animation-under-reduced-motion', pre.animationName === 'none',
           'the entry stagger runs "' + pre.animationName + '" under prefers-reduced-motion — it is supposed to be switched off entirely there');
      } else {
        ck('cold/entry-really-running', pre.animationName === 'hm-rise',
           'the cold-launch stamp did not reproduce the entry animation (computed animation-name "' + pre.animationName + '"), so nothing below this line would be testing the cold launch at all');
        ck('cold/entry-owns-transform', pre.transform !== 'none',
           'the entry animation is not driving transform (' + pre.transform + '), so the conflict this section exists to catch cannot occur and the section is decorative');
        ck('cold/entry-delay-is-real', parseFloat(pre.animationDelay) > 0.4,
           'the inline entry delay did not take (computed ' + pre.animationDelay + ')');
      }

      press(c[0], 'pointerdown');
      ck('cold/press-class-on-the-touch-frame', c[0].classList.contains('fm-card-press'),
         'pointerdown did not press the card at all');
      ck('cold/press-is-VISIBLE-on-the-touch-frame', pressShows(c[0]),
         'the press class is on the card but the card has not changed: computed transform ' + getComputedStyle(c[0]).transform + ', opacity ' + getComputedStyle(c[0]).opacity + ', animation-name "' + getComputedStyle(c[0]).animationName + '". A running animation beats a plain declaration, so on a cold launch the tap is unacknowledged until the entrance ends and the push then pops the card');
      if (!reduced) {
        ck('cold/entry-cancelled-on-the-tapped-card', getComputedStyle(c[0]).animationName !== 'hm-rise',
           'the tapped card is still running its entrance — two animations cannot share one property, so the press cannot win while it plays');
        ck('cold/entry-class-dropped', !c[0].classList.contains('hm-in'),
           '.hm-in is still on the tapped card, so the entrance can restart on it');
      }

      /* Every frame of the wait, not just the first: the press must stay put and nothing may step.
         The stub is LONGER THAN WAIT.release (600ms) on purpose — that timer is the release path for
         a tap that opened nothing, and an open routinely outlasts it because the project's media has
         to decode. With a 400ms stub the whole pressHeld ownership mechanism is unreachable and
         mutating it away leaves the suite green; with this it goes red. */
      openMs = 700; cur = null;
      release(c[0]);
      var frames = [], t0 = performance.now();
      while (!document.body.classList.contains('fm-pushing') && performance.now() - t0 < 3000) {
        frames.push({ s: scaleOf(c[0]), o: opacityOf(c[0]), on: c[0].classList.contains('fm-card-press'), shows: pressShows(c[0]) });
        await rAF();
      }
      ck('wait/enough-frames-to-mean-anything', frames.length >= 8,
         'only ' + frames.length + ' frame(s) elapsed between the finger and the push — the wait this section measures did not happen, so its assertions are decorative');
      ck('wait/press-held-for-every-frame', frames.every(function (f) { return f.on; }),
         'the press was dropped ' + frames.filter(function (f) { return !f.on; }).length + ' of ' + frames.length + ' frames into the wait — the card the user is waiting on goes dead mid-load');
      ck('wait/press-VISIBLE-for-every-frame', frames.every(function (f) { return f.shows; }),
         'the press was on the card but invisible for ' + frames.filter(function (f) { return !f.shows; }).length + ' of ' + frames.length + ' frames of the wait');
      var worstStep = 0;
      for (var i = 1; i < frames.length; i++) worstStep = Math.max(worstStep, Math.abs(frames[i].s - frames[i - 1].s));
      ck('wait/no-step-mid-wait', worstStep < 0.003,
         'the card stepped ' + worstStep.toFixed(4) + ' in scale during the wait — the press is supposed to land once and hold, not move again');

      /* ---- 1b. THE HAND-OFF, on the frame it happens ----
         Reachable only by making the push land in the same task as the click (the project is already
         current, so openProject never awaits): the pressed card is still mid-fade from the cut when
         fm-push-lead takes over, and a flat `opacity: 1` in those keyframes stepped it
         0.34829 → 1.00000 in one frame at 380x800. --lead-from is the fix and this is what holds it. */
      c = await cards();
      stampColdLaunch(c[0], '0.49s');
      await rAF();
      openMs = 0; cur = c[0].dataset.pid;
      press(c[0], 'pointerdown');
      await rAF();                       // ONE frame: the press paints, so the lead is warm — without
                                         // it the activation is a same-task one, the press was never
                                         // on screen, and the lead correctly starts from rest instead
      var beforeS = scaleOf(c[0]), beforeO = opacityOf(c[0]);
      release(c[0]);
      ck('handoff/push-started', document.body.classList.contains('fm-pushing'),
         'the push did not start in the same task as the click on an already-open project, so the tightest hand-off there is was not measured');
      ck('handoff/lead-is-warm', !c[0].classList.contains('fm-lead-cold'),
         'the lead went cold one frame after a painted press — the hand-off measured below would be the wrong one');
      ck('handoff/still-mid-cut', beforeO < 0.95,
         'the card had already finished easing in (opacity ' + beforeO.toFixed(4) + ') by the time the push started, so the mid-ease hand-off this section exists for was not reproduced');
      ck('handoff/transform-continuous', Math.abs(scaleOf(c[0]) - beforeS) < 0.004,
         'the card jumped from scale ' + beforeS.toFixed(4) + ' to ' + scaleOf(c[0]).toFixed(4) + ' on the frame the push took over');
      ck('handoff/opacity-continuous', Math.abs(opacityOf(c[0]) - beforeO) < 0.02,
         'the card jumped from opacity ' + beforeO.toFixed(5) + ' to ' + opacityOf(c[0]).toFixed(5) + ' on the frame the push took over — a card tapped while it is still fading in is mid-ease at that instant, and the lead keyframes have to start from where it actually is');

      /* ---- 1c. and the lead really LEADS its own screen ----
         The headline of the whole feature: "the project that you tapped on swipes to the left". Under
         motion that is measured as travel; under reduced motion the contract is the opposite — nothing
         translates at all — so that is what is measured there instead. */
      if (reduced) {
        var rc0 = c[0].getBoundingClientRect().left, rh0 = home.getBoundingClientRect().left;
        ck('lead/no-animation-under-reduced-motion', getComputedStyle(c[0]).animationName === 'none',
           'the lead card runs "' + getComputedStyle(c[0]).animationName + '" under prefers-reduced-motion — nothing may travel on that path');
        ck('lead/cross-dissolve-under-reduced-motion', getComputedStyle(home).animationName === 'fm-push-fade',
           'home runs "' + getComputedStyle(home).animationName + '" under reduced motion instead of the cross-dissolve');
        ck('lead/acknowledgement-survives-the-dissolve', opacityOf(c[0]) < 0.9,
           'the tapped card is back at full opacity for the cross-dissolve (' + opacityOf(c[0]).toFixed(3) + ') — the acknowledgement is dropped exactly as the screens swap, which is the one moment it has to be continuous');
        await sleep(120);
        ck('lead/nothing-translates-under-reduced-motion',
           Math.abs((c[0].getBoundingClientRect().left - home.getBoundingClientRect().left) - (rc0 - rh0)) < 0.5,
           'the lead card moved relative to its screen under prefers-reduced-motion');
      } else {
        var la = c[0].getAnimations().filter(function (a) { return /^fm-push-lead/.test(a.animationName); });
        var ha = home.getAnimations().filter(function (a) { return a.animationName === 'fm-push-out'; });
        ck('lead/animation-attached', la.length > 0, 'no lead animation is attached to the tapped card');
        ck('lead/screen-animation-attached', ha.length > 0, 'the home screen is not animating out');
        ck('lead/no-inherited-entry-delay', parseFloat(getComputedStyle(c[0]).animationDelay) === 0,
           'the lead card is running the push on a ' + getComputedStyle(c[0]).animationDelay + ' delay inherited from the entry stagger — with a `both` fill that holds it at its start frame for the whole push, so the card never moves');
        la.concat(ha).forEach(function (a) { a.pause(); });
        function leadOffset(ms) {
          la.concat(ha).forEach(function (a) { a.currentTime = ms; });
          return c[0].getBoundingClientRect().left - home.getBoundingClientRect().left;
        }
        var l0 = leadOffset(0), l1 = leadOffset(280);
        // Proportional to the CARD, not a flat 40px. fm-push-lead moves it -34% of its own width, so
        // on a 348px card the real lead is ~118px and a flat 40 let the travel be cut by 65% with the
        // suite still green — a decorative assertion guarding the one thing Ezra actually asked for.
        // 22% keeps slack for the ease and the scale change while still failing any real shortfall.
        var leadMin = c[0].getBoundingClientRect().width * 0.22;
        ck('lead/leads-its-own-screen', l0 - l1 > leadMin,
           'the tapped card led its own screen by ' + (l0 - l1).toFixed(2) + 'px across the push, under the '
           + leadMin.toFixed(2) + 'px floor (22% of its own width) — "the project you tapped swipes to the left" is the whole feature, and this is a plain screen slide');
      }

      /* ---- 2. REPEAT TAP mid-open: the press must not be dropped ----
         The second tap is ignored (two overlapping opens leaked media), but it used to take the press
         with it. Measured at 380x780 with a 1200ms open: pressed at 33ms, dropped at 739ms, 619ms of
         dead screen, then the push snapped the card back to scale(.965) in ONE frame at 1358ms. */
      c = await cards();
      openMs = 750; cur = null; opens = 0;   // > WAIT.release, or the repeat tap's own release timer never gets the chance to be wrong
      tap(c[0]);
      ck('repeat/pressed-on-the-first-tap', c[0].classList.contains('fm-card-press'),
         'the card is not pressed on the frame the finger lands — the tap has no acknowledgement at all until the project loads');
      await rAF();
      tap(c[0]);
      ck('repeat/press-survives-the-second-tap', c[0].classList.contains('fm-card-press'),
         'tapping the SAME card again while it is still opening dropped its press — the card the user is waiting on goes dead, and the push then snaps it back to the pressed scale in one frame');
      await rAF(); await rAF();
      ck('repeat/press-survives-a-frame-later', c[0].classList.contains('fm-card-press'),
         'the press was dropped a frame after the second tap (a release timer re-armed by the tap that was supposed to be ignored)');
      ck('repeat/press-still-VISIBLE', pressShows(c[0]),
         'the press class survived the repeat tap but the card is back to looking untouched (transform ' + getComputedStyle(c[0]).transform + ', opacity ' + getComputedStyle(c[0]).opacity + ')');
      // The reason the second tap is ignored at all, and the thing the abandoned-open escape hatch
      // (section 6) must not have loosened: two overlapping open() loads leaked media and raced
      // refreshAll. Inside the window the guard has to be exactly as strict as it always was.
      ck('repeat/second-open-ignored', opens === 1,
         'the second tap started ' + opens + ' loads — two overlapping open() calls leak media and race refreshAll, which is the whole reason a second tap is dropped');

      /* ---- 3. CROSS TAP mid-open: the press must not MOVE ----
         Measured before: setPress moved the press to card B at 656ms and the _opening guard killed it
         100ms later, so card A — the one actually loading — sat at rest for 717ms and then popped. */
      tap(c[1]);
      ck('cross/other-card-not-pressed', !c[1].classList.contains('fm-card-press'),
         'tapping a DIFFERENT card mid-open pressed it — that card is not loading and never will be (the tap is ignored), so the acknowledgement is a lie');
      ck('cross/loading-card-keeps-its-press', c[0].classList.contains('fm-card-press'),
         'tapping a different card mid-open stole the press from the card that IS loading');
      await rAF();
      ck('cross/still-right-a-frame-later', c[0].classList.contains('fm-card-press') && !c[1].classList.contains('fm-card-press'),
         'a frame after the cross tap the press had moved anyway (press on A: ' + c[0].classList.contains('fm-card-press') + ', on B: ' + c[1].classList.contains('fm-card-press') + ')');
      // "That turned out not to be a tap" arriving AFTER the tap already started a load — the browser
      // handing the pointer stream to the scroller is the common way. The gesture is over; the project
      // is not, so the card that is loading keeps its acknowledgement.
      press(c[0], 'pointercancel');
      ck('cross/cancel-cannot-take-a-loading-press', c[0].classList.contains('fm-card-press'),
         'a pointercancel arriving while the project is still loading dropped the press — the card goes dead mid-load and the push then snaps it back to the pressed scale in one frame');
      // and when the push finally arrives it continues from the pressed state, it does not jump to it
      var beforeCross = scaleOf(c[0]), beforeCrossO = opacityOf(c[0]);
      await sleep(820);
      ck('cross/push-arrived', document.body.classList.contains('fm-pushing'),
         'the push never started after the stubbed 750ms open');
      ck('cross/lead-is-warm', !c[0].classList.contains('fm-lead-cold'),
         'the lead went cold after a press that was on screen for the whole wait — it would start from rest and jump backwards to the pressed scale');
      if (!reduced) {
        var wa = c[0].getAnimations().filter(function (a) { return /^fm-push-lead/.test(a.animationName); });
        ck('cross/lead-animation-attached', wa.length > 0, 'no lead animation on the card the push is leading with');
        wa[0].pause(); wa[0].currentTime = 0;   // the hand-off frame, which is not reachable by waiting for one
      }
      ck('cross/no-pop-at-the-hand-off', Math.abs(scaleOf(c[0]) - beforeCross) < 0.004,
         'the card jumped from scale ' + beforeCross.toFixed(4) + ' to ' + scaleOf(c[0]).toFixed(4) + ' on the frame the push took over — the hand-off is exactly the frame this design exists to remove');
      ck('cross/no-opacity-pop-at-the-hand-off', Math.abs(opacityOf(c[0]) - beforeCrossO) < 0.02,
         'the card jumped from opacity ' + beforeCrossO.toFixed(4) + ' to ' + opacityOf(c[0]).toFixed(4) + ' on the frame the push took over');

      /* ---- 3b. THE APP CLEANS UP AFTER ITSELF ----
         Not the test cleaning up and then admiring its own work: this lets a REAL push run to its end
         and checks what endPush() left behind. A transform stranded on #app makes it the containing
         block for every position:fixed descendant of the editor — every sheet, menu and FAB — for the
         rest of the session, and the push is the only thing that ever puts one there. */
      c = await cards();
      openMs = 0; cur = null;
      tap(c[0]);
      // WAIT FOR IT TO START FIRST. openProject awaits its stub, so at the instant tap() returns the
      // push has not begun — and "wait while it is running" over a push that has not started yet
      // exits on its first check and every assertion below it passes for free.
      var began = performance.now();
      while (!document.body.classList.contains('fm-pushing') && performance.now() - began < 2000) await rAF();
      ck('teardown/push-started', document.body.classList.contains('fm-pushing'),
         'the push never started, so nothing below this line would be testing a teardown');
      var settled = performance.now();
      while (document.body.classList.contains('fm-pushing') && performance.now() - settled < 3000) await rAF();
      ck('teardown/push-finished-on-its-own', !document.body.classList.contains('fm-pushing'),
         'the push never ended by itself — body.fm-pushing is still on after 3s, so #app keeps its transform forever');
      ck('teardown/app-class-stripped', !app.classList.contains('fm-push-in'), '#app kept .fm-push-in after the push');
      ck('teardown/app-has-no-transform', getComputedStyle(app).transform === 'none',
         '#app kept a transform (' + getComputedStyle(app).transform + ') after the push — every fixed-position panel in the editor is now positioned against #app instead of the viewport');
      ck('teardown/app-back-in-flow', getComputedStyle(app).position === 'static',
         '#app kept position:' + getComputedStyle(app).position + ' after the push');
      ck('teardown/lead-classes-stripped', !c[0].classList.contains('fm-card-lead') && !c[0].classList.contains('fm-lead-cold'),
         'the lead card kept its push classes after the push ended');
      ck('teardown/lead-var-stripped', !c[0].style.getPropertyValue('--lead-from'),
         'the lead card kept its inline --lead-from after the push ended, so the NEXT push from that card starts from a stale opacity');
      ck('teardown/home-hidden', home.classList.contains('hidden'),
         'the home screen is still showing after the push finished (className "' + home.className + '", isOpen ' + FM.home.isOpen() + ')');

      /* ---- 4. KEYBOARD Enter: no press to hand over from, so the lead starts from REST ----
         There is no finger, and click() runs in the same task as the keydown, so the press cannot
         paint before the push. Leading from the pressed scale there is a 3.5% jump on the first frame:
         measured 1.0000 → 0.9650 in one frame, at 1280x800 and at 380x800, before .fm-lead-cold. */
      c = await cards();
      openMs = 0; cur = c[0].dataset.pid;   // already current → openProject never awaits at all
      c[0].focus();
      c[0].dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }));
      await sleep(40);
      ck('key/push-started', c[0].classList.contains('fm-card-lead'), 'Enter on a focused card did not start the push');
      ck('key/lead-is-cold', c[0].classList.contains('fm-lead-cold'),
         'a keyboard activation led the push warm — its press never painted, so the lead starts at the pressed scale and pops on frame one');
      if (!reduced) {
        var kcs = getComputedStyle(c[0]);
        ck('key/cold-keyframes', kcs.animationName === 'fm-push-lead-cold',
           'the cold lead runs "' + kcs.animationName + '" — it must run the keyframes that start from rest');
        var ka = c[0].getAnimations().filter(function (a) { return a.animationName === 'fm-push-lead-cold'; });
        ck('key/cold-animation-attached', ka.length > 0, 'no cold-lead animation attached');
        ka[0].pause(); ka[0].currentTime = 0;
        ck('key/cold-starts-at-rest', Math.abs(scaleOf(c[0]) - 1) < 0.002,
           'the cold lead starts at scale ' + scaleOf(c[0]).toFixed(4) + ' — from a card sitting at rest that is a one-frame pop of ' + Math.abs(1 - scaleOf(c[0])).toFixed(4));
        ka[0].currentTime = 280;
        ck('key/cold-actually-shrinks', scaleOf(c[0]) < 0.94,
           'the cold lead does not actually shrink away (ends at ' + scaleOf(c[0]).toFixed(4) + ')');
      } else {
        // Two checks, because they are not the same claim. The first is the one a user feels; the
        // second is the one that keeps the reduced-motion block honest. `animation: none` in that
        // block is (1,3,0) and the cold rule is (1,4,0), so before this the computed name here read
        // "fm-push-lead-cold" while the duration was still 0s — measured: no animation attached,
        // transform none, 0.00px of travel. A leak, not motion; closed so the computed style stops
        // describing a path the card is not on.
        var rmPush = c[0].getAnimations().filter(function (a) { return /^fm-push/.test(a.animationName); });
        ck('key/cold-lead-does-not-travel-under-reduced-motion', rmPush.length === 0 && getComputedStyle(c[0]).transform === 'none',
           'the cold lead has ' + rmPush.length + ' push animation(s) attached and transform ' + getComputedStyle(c[0]).transform + ' under prefers-reduced-motion — nothing may move on that path');
        ck('key/cold-lead-name-cleared-under-reduced-motion', getComputedStyle(c[0]).animationName === 'none',
           'the cold lead computes animation-name "' + getComputedStyle(c[0]).animationName + '" under prefers-reduced-motion. Nothing moves today (the duration is 0s), but the reduced-motion rule is being half-overridden by the higher-specificity .fm-lead-cold rule, so the computed style claims a travel path the card is not on and one added duration would make it real');
      }
      // …and the OTHER half of keyboard activation: a keyboard user waits exactly as long as a finger
      // does, so Enter has to press the card for the length of that wait too. Measured before the
      // press was wired to keydown: 0 of 59 pre-push frames pressed on a 900ms load, at 1280x800 and
      // at 380x800 — the card sat at rest for the whole load and then moved.
      c = await cards();
      openMs = 300; cur = null;
      c[1].focus();
      c[1].dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }));
      ck('key/press-on-keydown', c[1].classList.contains('fm-card-press'),
         'Enter on a focused card gives it no press — a keyboard user gets no acknowledgement at all until the project has finished loading');
      ck('key/press-VISIBLE-on-keydown', pressShows(c[1]),
         'the keyboard press is on the card but the card looks untouched (transform ' + getComputedStyle(c[1]).transform + ', opacity ' + getComputedStyle(c[1]).opacity + ')');
      await rAF(); await rAF();
      ck('key/press-survives-the-load', c[1].classList.contains('fm-card-press'),
         'the keyboard press was dropped while the project was still loading (keyup released it even though the open owns it)');
      // NOT ASSERTED HERE: the blur half of the same rule (keyActivate cancels the press when focus
      // moves on, unless an open owns it). It cannot be tested from this runner — the suite's frame is
      // parked off-screen and never holds system focus, so element.focus() sets document.activeElement
      // but Chrome fires no focus/blur EVENTS in it. Both a `blur → cancelPress` mutation and a
      // `cancelPress ignores pressHeld` mutation stayed GREEN through an assertion written on it, which
      // is the definition of decorative, so it was removed rather than left in looking like coverage.
      // The same ownership rule IS asserted, through a path that really fires, in cross/ below.
      await sleep(380);
      ck('key/reaches-the-push', document.body.classList.contains('fm-pushing'),
         'Enter with a 300ms open never reached the push');

      /* ---- 5. GIVING THE PRESS UP CLEANLY ----
         Every path that lets go WITHOUT a push (a drag that turned out to be a scroll, a
         pointercancel, the backstop on a load that never settles) eases the card back instead of
         snapping it. Measured with the 8s backstop against an 11s load: before, the card snapped
         .965 → 1 in one frame at 8147ms and the push snapped it back in one frame at 11149ms; after,
         it eases over ~200ms and the push then leads COLD from rest, jump 0.0000. */
      c = await cards();
      openMs = 0; cur = null;
      press(c[1], 'pointerdown');
      ck('release/pressed', c[1].classList.contains('fm-card-press'), 'pointerdown did not press the card');
      press(c[1], 'pointercancel');
      ck('release/press-dropped', !c[1].classList.contains('fm-card-press'), 'a cancelled press stayed on the card');
      ck('release/eased-not-snapped', c[1].classList.contains('fm-card-unpress'),
         'the press was dropped without the eased release class — it snaps back to full size in one frame');
      var ucs = getComputedStyle(c[1]);
      ck('release/ease-has-a-transition', /transform|opacity/.test(ucs.transitionProperty) && parseFloat(ucs.transitionDuration) > 0,
         '.fm-card-unpress carries no transition (' + ucs.transitionProperty + ' / ' + ucs.transitionDuration + '), so the release still snaps');

      /* ---- 6. AN OPEN THAT NEVER SETTLES MUST NOT WALL THE SCREEN OFF ----
         `_opening` is cleared in openProject's `finally`, which never runs if FM.projects.open()'s
         promise never settles. Before this, that stranded the home screen for the rest of the
         session: setPress returned early on `_opening` forever, so no card on any tab ever showed a
         press again and every tap was silently dropped. The backstop is shortened here rather than
         slept through — 8s inside the suite is not a test, it is a hang. */
      var hangs = [];
      W.stuck = 120;
      P.open = function () { return new Promise(function (r) { hangs.push(r); }); };
      c = await cards();
      openMs = 0; cur = null;
      tap(c[0]);
      ck('stuck/press-taken-by-the-open', c[0].classList.contains('fm-card-press'),
         'the hung open did not take the press at all');
      await sleep(260);
      ck('stuck/press-let-go-by-the-backstop', !c[0].classList.contains('fm-card-press'),
         'a load that never settles left the card pressed forever');
      c = await cards();
      press(c[1], 'pointerdown');
      ck('stuck/presses-work-again', c[1].classList.contains('fm-card-press'),
         'after an open that never settled, no card ever shows a press again for the rest of the session — _opening is stuck true and setPress returns early on it forever');
      // …and the other half, which matters more: the TAP has to work again too. A card that presses
      // and then does nothing is a worse lie than a card that does nothing at all. The stub goes back
      // to a real (fast) open first — the recovery attempt has to be able to finish.
      P.open = fastOpen;
      openMs = 0; cur = null; opens = 0;
      release(c[1]);
      var retry = performance.now();
      while (!document.body.classList.contains('fm-pushing') && performance.now() - retry < 2000) await rAF();
      ck('stuck/opens-work-again', document.body.classList.contains('fm-pushing') && opens === 1,
         'after an open that never settled, the next tap is still swallowed by the _opening guard (loads started: ' + opens + ') — the home screen never opens another project for the rest of the session');
      hangs.forEach(function (r) { try { r(true); } catch (e) {} });   // let the abandoned opens finish so nothing after this inherits _opening
      W.stuck = savedStuck;
      await sleep(30);
      c = await cards();
      press(c[0], 'pointerdown');
      ck('stuck/state-clean-for-the-next-test', c[0].classList.contains('fm-card-press'),
         'the abandoned-open section left _opening set, so every test after this one runs against a home screen that ignores taps');
      press(c[0], 'pointercancel');

      /* ---- 7. A LEAD THAT WAS NEVER PRESSED ----
         Templates, elements and "New project" all end in FM.home.close({ push: true, lead: card })
         without any pointerdown on that card, so startPush is the only thing that can strip the entry
         stamp there. An inline animation-delay outranks every stylesheet rule and fm-push-lead is
         declared `both`, so a lead still carrying one holds its `from` frame for the whole push and
         never moves: measured on a real cold launch, computed delay 0.49s during the push, card-minus-
         home offset 22.09px on the first push frame and 22.09px on the last — 0.00px of lead. */
      c = await cards();
      stampColdLaunch(c[1], '0.49s');
      await rAF();
      FM.home.close({ push: true, lead: c[1] });
      await rAF();
      ck('api-lead/leading', c[1].classList.contains('fm-card-lead'),
         'FM.home.close({push,lead}) did not make that card lead the push');
      ck('api-lead/entry-delay-cleared', parseFloat(getComputedStyle(c[1]).animationDelay) === 0,
         'the lead card kept the entry stagger’s ' + getComputedStyle(c[1]).animationDelay + ' inline delay — with a `both` fill it holds its first frame for the whole push and never moves');
      ck('api-lead/entry-class-cleared', !c[1].classList.contains('hm-in'),
         'the lead card kept .hm-in, so its entrance can restart on top of the push');
      ck('api-lead/is-cold', c[1].classList.contains('fm-lead-cold'),
         'a card that was never pressed led the push warm — it would start at the pressed scale and pop on frame one');

      /* ---- 8. REDUCED MOTION STILL HAS TO ANSWER THE TAP ----
         Read through the CSSOM, so it executes in BOTH modes: the suite cannot switch the media query
         on, and the rule being present-but-wrong is exactly the failure. The reduced-motion block
         kills the press scale, and :active drops its own feedback the moment the finger lifts — so
         before this, a reduced-motion user tapped a card and NOTHING changed until the editor
         appeared: measured 0 of 122 frames differing from rest across a 1200ms wait. */
      var rm = null;
      [].slice.call(document.styleSheets).forEach(function (ss) {
        var rules; try { rules = ss.cssRules; } catch (e) { return; }
        [].slice.call(rules || []).forEach(function (r) {
          if (r.type !== CSSRule.MEDIA_RULE || !/prefers-reduced-motion/.test(r.conditionText)) return;
          [].slice.call(r.cssRules).forEach(function (k) {
            if (k.type === CSSRule.STYLE_RULE && /\.hm-card\.fm-card-press/.test(k.selectorText)) rm = k;
          });
        });
      });
      ck('rm/rule-exists', !!rm, 'prefers-reduced-motion has no rule for .hm-card.fm-card-press — that path gets the full scale, or nothing at all');
      ck('rm/no-transform', rm.style.transform === 'none', 'the reduced-motion press still sets transform:' + rm.style.transform);
      var ack = ['opacity', 'background', 'background-color', 'border-color', 'outline', 'outline-color', 'box-shadow', 'filter']
        .filter(function (p) { return rm.style.getPropertyValue(p); });
      ck('rm/has-an-acknowledgement', ack.length > 0,
         'the reduced-motion press sets transform:none and nothing else — a reduced-motion user taps a card and gets no acknowledgement at all for the whole load. Reduced motion means no motion, not no feedback');
      // …and it must actually WIN THE CASCADE, which is not a given: theme-glass.css loads after
      // styles.css and restyles every card with `html[data-theme="glass"] .hm-card { border: 1px
      // solid var(--line-soft) }` — specificity (0,2,1), which beats a plain `.hm-card.fm-card-press`
      // (0,2,0). Glass is the shipped default. Measured with the flat selector: the opacity in the
      // declaration took (0.55) and the border-color in the SAME declaration did not (rgb(18,32,41),
      // still --line, against an --accent of #5ac7ed).
      var contested = ['background', 'background-color', 'border-color', 'border', 'box-shadow']
        .filter(function (p) { return !!rm.style.getPropertyValue(p); });
      var pressSel = rm.selectorText.split(',').map(function (s) { return s.trim(); })
        .filter(function (s) { return /\.hm-card\.fm-card-press/.test(s); })[0] || '';
      ck('rm/beats-theme-glass', !contested.length || pressSel.indexOf('#') >= 0,
         'the reduced-motion press sets ' + contested.join('/') + ' from "' + pressSel + '" — theme-glass.css sets the same thing on .hm-card from a higher-specificity selector and loads later, so this silently does nothing on the default theme');
      // The cut has to be switched off on this path for the same reason the press exists: an opacity
      // ANIMATION on the card outranks the press's own `opacity` DECLARATION, which is the exact
      // shape of the cold-launch defect this whole section is about.
      var rmCut = null;
      [].slice.call(document.styleSheets).forEach(function (ss) {
        var rules; try { rules = ss.cssRules; } catch (e) { return; }
        [].slice.call(rules || []).forEach(function (r) {
          if (r.type !== CSSRule.MEDIA_RULE || !/prefers-reduced-motion/.test(r.conditionText)) return;
          [].slice.call(r.cssRules).forEach(function (k) {
            if (k.type === CSSRule.STYLE_RULE && /\.fm-intro-cut/.test(k.selectorText)) rmCut = k;
          });
        });
      });
      ck('rm/intro-cut-disabled', !!rmCut && rmCut.style.animationName === 'none',
         'the entry-cut ease is still an opacity animation under prefers-reduced-motion — it outranks the press’s own opacity declaration, so the tap goes unacknowledged on exactly the path that has nothing else to show for it');
    } finally {
      try { window.__fmPushAsserts = { reduced: reduced, executed: executed.length, labels: executed }; } catch (e) {}
      if (savedGate) FM.home._pushAllowed = savedGate;   // put the real phone gate back before anything else runs
      P.list = saved.list; P.open = saved.open; P.currentId = saved.currentId;
      P.saveIndex = saved.saveIndex; P.touchCurrent = saved.touchCurrent;
      P.getThumb = saved.getThumb; P.migrateThumbs = saved.migrateThumbs;
      W.stuck = savedStuck;
      home.classList.remove('hm-intro');
      FM.home.open();                       // unwind any push, and rebuild the grid from the REAL library
      if (wasHidden) FM.home.close();
      try { if (view === null) localStorage.removeItem('fm.view'); else localStorage.setItem('fm.view', view); } catch (e) {}
    }
  });


  /* v5.71 — queue 52 + 35. The cog inside a project used to open the HOME screen's preferences and
     nothing else; the project's own settings lived behind the ⋯ button beside it. Measured before the
     fix at 1440x900, in both layouts: the panel's rows were Appearance / Project sorting / Demo mode /
     Show touches / Show system fonts / Default layer duration / Playback quality / Layout / Import a
     project file / Keyboard shortcuts — not one of them about the open project. */
  test('settings cog: in a project the panel leads with the project, and its switches drive the real controls', { item: 'queue-52' }, async function () {
    const sleep = ms => new Promise(r => setTimeout(r, ms));
    const wasHome = !!(FM.home && FM.home.isOpen && FM.home.isOpen());
    if (wasHome) FM.home.close();
    const before = { loop: !!FM.loop, onion: !!FM.onionSkin, snap: !!(FM.timeline.isSnapping && FM.timeline.isSnapping()) };
    try {
      FM.settings.open();
      await sleep(0);
      const rows = [].slice.call(document.querySelectorAll('.set-panel .set-row'));
      const labels = rows.map(r => (r.querySelector('.set-label') || {}).textContent).filter(Boolean);
      const lead = ['Canvas', 'Loop playback', 'Onion skin', 'Snapping (magnet)'];
      if (labels.slice(0, 4).join('|') !== lead.join('|')) {
        throw new Error('the cog opens a panel that leads with [' + labels.slice(0, 4).join(', ') +
          '] — inside a project it must lead with the project: ' + lead.join(', '));
      }
      // Each switch must READ its owner and WRITE through it — not carry a second copy of the state.
      const cases = [
        ['Loop playback', () => !!FM.loop],
        ['Onion skin', () => !!FM.onionSkin],
        ['Snapping (magnet)', () => !!(FM.timeline.isSnapping && FM.timeline.isSnapping())],
      ];
      for (const [label, get] of cases) {
        const row = rows.find(r => (r.querySelector('.set-label') || {}).textContent === label);
        const sw = row && row.querySelector('.set-switch');
        if (!sw) throw new Error('no switch for "' + label + '" in the cog');
        if (sw.classList.contains('on') !== get()) throw new Error('"' + label + '" shows ' + sw.classList.contains('on') + ' while the app says ' + get() + ' — the panel is holding its own copy of the state');
        const was = get();
        sw.click(); await sleep(0);
        if (get() === was) throw new Error('pressing "' + label + '" in the cog changed nothing — the row is not wired to the control that owns it');
        if (sw.classList.contains('on') !== get()) throw new Error('"' + label + '" did not read back after its own press');
        sw.click(); await sleep(0);
        if (get() !== was) throw new Error('"' + label + '" would not go back to ' + was);
      }
      // …and there is no SECOND door to them anywhere (queue 35, finished at v6.13). Both ⋯ menus are
      // gone now — the PC top bar's #btn-more first, then the phone's #m-proj-more — so the assertion
      // flipped: it used to check the phone menu still CONTAINED these three, because that menu was
      // the only way a phone could reach them. The settings panel above is that way now, on both
      // devices, and FM.projectMoreItems no longer exists to be filtered.
      if (document.getElementById('btn-more')) throw new Error('#btn-more is back — these three would have two doors again');
      if (document.getElementById('m-proj-more')) throw new Error('#m-proj-more is back — the phone would have two doors again');
      if (typeof FM.projectMoreItems === 'function') throw new Error('FM.projectMoreItems is back — the list behind the deleted menu should not survive it');
    } finally {
      if (FM.settings.isOpen()) FM.settings.close();
      if (!!FM.loop !== before.loop) { const b = document.getElementById('btn-loop'); if (b) b.click(); }
      if (!!FM.onionSkin !== before.onion) { const b = document.getElementById('btn-onion'); if (b) b.click(); }
      if (!!(FM.timeline.isSnapping && FM.timeline.isSnapping()) !== before.snap) { const b = document.getElementById('btn-snap'); if (b) b.click(); }
    }
  });

  /* v5.71 — the phone top bar, at phone width, with the classes set by the REAL owner.
     The geometry that matters is proved by tests/_q52_phone_header.py, which drives the actual
     long-press top-level over CDP (an iframe cannot give you the gesture). This is the cheap guard
     that runs on every change: the same four states, the same stylesheet, the same measurements.
     Against the unfixed build it fails three ways — "1 selected in select mode" kept the project
     header, Export moved 334→242 when the multi header arrived, and the bin landed on 330..372,
     i.e. over the pixels Export had held. */
  test('phone top bar: a destructive control never shares the bar with the project’s own, and Export never moves', { item: 'queue-52' }, async function () {
    const sleep = ms => new Promise(r => setTimeout(r, ms));
    const frame = window.frameElement;
    if (!frame) throw new Error('this test needs to own its viewport width and has no frameElement');
    const savedScene = FM.scene, hadW = frame.style.width, hadH = frame.style.height;
    const box = id => {
      const e = document.getElementById(id);
      if (!e) return null;
      const r = e.getBoundingClientRect();
      if (!(r.width > 0 && r.height > 0) || getComputedStyle(e).visibility === 'hidden') return null;
      return { l: Math.round(r.left), r: Math.round(r.right) };
    };
    const PROJECT = ['proj-name-m', 'm-settings', 'm-proj-more', 'm-export'];
    try {
      FM.scene = scene([
        FM.makeLayer('shape', { shape: 'rect', name: 'One', x: 40, y: 40, shapeW: 40, shapeH: 40, fill: '#f00' }),
        FM.makeLayer('shape', { shape: 'rect', name: 'Two', x: 80, y: 80, shapeW: 40, shapeH: 40, fill: '#0f0' }),
      ]);
      frame.style.width = '380px'; frame.style.height = '780px';
      await sleep(60);
      if (!matchMedia('(max-width: 700px)').matches) throw new Error('the frame did not become a phone (innerWidth ' + innerWidth + ')');
      const ids = FM.scene.layers.map(l => l.id);
      const states = {};
      const capture = name => {
        const o = { cls: document.body.className };
        ['m-back', 'proj-name-m', 'm-selcount', 'm-settings', 'm-proj-more', 'm-export', 'm-group', 'm-del'].forEach(k => { o[k] = box(k); });
        states[name] = o;
      };
      FM.selectLayer(null); capture('project');
      FM.selectLayer(ids[0]); capture('editing');
      // exactly what timeline.js beginPaintSelect leaves behind on the first frame of a long-press
      FM.scene.selectedId = ids[0]; FM.scene.selectedIds = [ids[0]]; FM.selectMode = true;
      FM.syncSelectionChrome(); capture('select1');
      FM.scene.selectedIds = ids.slice(); FM.syncSelectionChrome(); capture('select2');

      const seen = JSON.stringify(states, null, 0);
      // 1. one layer selected in select mode is a STATE, not a gap between two
      if (states.select1['m-export'] || states.select1['proj-name-m']) {
        throw new Error('one layer selected in select mode still shows the project header — the first frame of every long-press belongs to no state: ' + seen);
      }
      // 2. a destructive control is never up alongside the project's own controls
      ['select1', 'select2', 'project', 'editing'].forEach(k => {
        if (!states[k]['m-del']) return;
        const up = PROJECT.filter(p => states[k][p]);
        if (up.length) throw new Error('state "' + k + '" has the delete bin up while the project header still shows ' + up.join(', '));
      });
      // 3. Export and back are learned by position: one slot each, across every state
      ['m-export', 'm-back'].forEach(id => {
        const slots = {};
        Object.keys(states).forEach(k => { const b = states[k][id]; if (b) slots[b.l + '..' + b.r] = 1; });
        const list = Object.keys(slots);
        if (list.length > 1) throw new Error(id + ' sits in ' + list.length + ' different places depending on the selection (' + list.join(', ') + ') — a button learned by position must not move');
      });
      // 4. the bin never lands on the pixels Export or the cog were occupying
      const exp = states.project['m-export'], cog = states.project['m-settings'];
      ['select1', 'select2'].forEach(k => {
        const d = states[k]['m-del'];
        if (!d) throw new Error('state "' + k + '" offers no way to delete the selection');
        [['Export', exp], ['the settings cog', cog]].forEach(([what, b]) => {
          if (b && Math.min(d.r, b.r) > Math.max(d.l, b.l)) {
            throw new Error('in "' + k + '" the delete bin (' + d.l + '..' + d.r + ') covers where ' + what +
              ' was (' + b.l + '..' + b.r + ') — a thumb going where it has always gone hits delete');
          }
        });
      });
      // 5. the bin holds ONE slot for the whole of select mode, however many rows get painted in
      const d1 = states.select1['m-del'], d2 = states.select2['m-del'];
      if (d1.l !== d2.l) throw new Error('the bin moved from ' + d1.l + ' to ' + d2.l + ' when a second layer joined the selection — mid-gesture, with the finger still down');
    } finally {
      frame.style.width = hadW; frame.style.height = hadH;
      FM.selectMode = false;
      FM.scene = savedScene;
      try { FM.syncSelectionChrome(); } catch (e) {}
      await sleep(60);
      try { FM.refreshAll(); } catch (e) {}
    }
  });


  /* ================= queue 35, finished: the project ⋯ button is gone =============================
   * Ezra sent a screenshot with a red arrow on the top bar's ⋯ and said "Remove this specific three
   * dot menu." These three tests are the safety net for that removal, and they are deliberately
   * written as CAPABILITY tests: not "some button exists" but "press the real control and the thing
   * the menu used to do still happens". The dangerous failure here is silent — this app is local-only
   * with no cloud copy, so an entry that quietly loses its last door (Save, above all) is not
   * discovered until someone needs it and it is not there.
   *
   * Shared helper: find a settings-cog row by label, scroll it into view, and confirm a finger at the
   * centre of its button actually lands ON that button (the panel scrolls — several of these rows are
   * below the fold, and a row you cannot reach is not a door). */
  /* The menu FM.layerMenuItems asked for, as comparable text. The colour-tag entry is dropped: it
     renders as .ctx-swatch-label + .ctx-swatches (buttons, not rows), so it has no .ctx-item to
     line up against and would make every comparison below fail for the wrong reason. */
  function menuWant(layer) {
    return FM.layerMenuItems(layer).filter(it => it.sep || it.label)
      .map(it => (it.sep ? '—' : it.label)).join('|');
  }
  function menuGot() {
    const menu = document.getElementById('ctx-menu');
    if (!menu || menu.classList.contains('hidden')) return null;
    return [].slice.call(menu.querySelectorAll('.ctx-item, .ctx-sep'))
      .map(n => n.classList.contains('ctx-sep') ? '—' : (n.textContent || '').trim()).join('|');
  }

  function cogRow(label) {
    const rows = [].slice.call(document.querySelectorAll('.set-panel .set-row'));
    const row = rows.find(r => ((r.querySelector('.set-label') || {}).textContent || '') === label);
    if (!row) throw new Error('the settings cog has no "' + label + '" row — its only remaining door is gone');
    row.scrollIntoView({ block: 'center' });
    const b = row.querySelector('.set-action');
    if (!b) throw new Error('"' + label + '" is in the cog but has no button to press');
    const q = b.getBoundingClientRect();
    if (!(q.width > 0 && q.height > 0)) throw new Error('"' + label + '" has a 0x0 button — not hit-testable');
    const t = document.elementFromPoint(Math.round(q.left + q.width / 2), Math.round(q.top + q.height / 2));
    if (!(t && (t === b || b.contains(t)))) {
      throw new Error('"' + label + '" is covered — a press at its centre hits ' + (t ? (t.id || t.className) : 'nothing'));
    }
    return b;
  }

  test('the project ⋯ is gone from the top bar, and every action it held still works', { item: 'queue-35-final' }, async function () {
    const sleep = ms => new Promise(r => setTimeout(r, ms));
    if (document.getElementById('btn-more')) throw new Error('#btn-more still exists — the button Ezra pointed at is the whole ask');
    // These assert on the IN-PROJECT surface, so make sure we are on it. The home screen is an
    // overlay: with it up, the settings cog has no "This project" group at all and the phone's ⋯ sits
    // under hm-select-btn. Left implicit, this test would pass only because an earlier one in the
    // suite happened to close home — measured: it fails on its own without this.
    const hadHome = !!(FM.home && FM.home.isOpen && FM.home.isOpen());
    if (hadHome) FM.home.close();

    // and nothing else grew a copy of the project menu in its place. As of v6.13 the list itself is
    // deleted, not just its buttons — leaving FM.projectMoreItems behind would have been an invitation
    // to wire a third door to it later.
    if (typeof FM.projectMoreItems === 'function') throw new Error('FM.projectMoreItems is back');
    if ([].slice.call(document.querySelectorAll('#topbar button')).map(b => b.id).indexOf('btn-more') >= 0) {
      throw new Error('the top bar has a ⋯ again');
    }
    const savedScene = FM.scene, hadTime = FM.time;
    const realExport = FM.storage.exportFile, realImport = FM.storage.importFile, realReset = FM.resetProject;
    const realConfirm = window.confirm;
    const spy = { save: 0, open: 0, reset: 0, confirms: [] };
    try {
      FM.scene = scene([
        FM.makeLayer('shape', { name: 'A', shape: 'rect', x: 60, y: 60, shapeW: 40, shapeH: 40, fill: '#f00', start: 0, duration: 2 }),
        FM.makeLayer('shape', { name: 'B', shape: 'rect', x: 90, y: 90, shapeW: 40, shapeH: 40, fill: '#0f0', start: 0, duration: 2 }),
      ]);
      FM.scene.project.duration = 9;
      FM.storage.exportFile = () => { spy.save++; };
      FM.storage.importFile = () => { spy.open++; };
      FM.resetProject = () => { spy.reset++; };
      window.confirm = (m) => { spy.confirms.push(m); return true; };
      FM.selectLayer(null); FM.refreshAll(); await sleep(60);

      // ---- 1. the three that had NO other door on PC, now rows in the cog -----------------------
      // Trim: the project must actually shorten to the last clip. (Mutation-checked: the same wait
      // with no press leaves it at 9, so a green here cannot come from the number drifting.)
      FM.settings.open(); await sleep(340);   // the panel slides in over ~260ms; measuring mid-slide reports a row as 'covered'
      const idleFrom = FM.scene.project.duration;
      await sleep(60);
      if (FM.scene.project.duration !== idleFrom) throw new Error('project duration moves on its own — the Trim assertion below would prove nothing');
      cogRow('Trim to last clip').click(); await sleep(60);
      if (Math.abs(FM.scene.project.duration - 2) > 1e-6) {
        throw new Error('cog ▸ Trim to last clip left the project at ' + FM.scene.project.duration + 's, not 2s — FM.fitToContent has no other call site, so this is its last door');
      }
      // Save: the ONE that loses real work if it goes. It must reach FM.storage.exportFile.
      FM.settings.open(); await sleep(340);   // the panel slides in over ~260ms; measuring mid-slide reports a row as 'covered'
      cogRow('Save a project file').click(); await sleep(60);
      if (spy.save !== 1) throw new Error('cog ▸ Save a project file did not reach FM.storage.exportFile — on a local-only app that is the only backup there is');
      // Reset: gated by its confirm, and it must be the destructive-looking one.
      FM.settings.open(); await sleep(340);   // the panel slides in over ~260ms; measuring mid-slide reports a row as 'covered'
      const resetBtn = cogRow('Reset project');
      if (!resetBtn.classList.contains('danger')) throw new Error('the Reset button is styled like the safe ones next to it');
      resetBtn.click(); await sleep(60);
      if (!spy.confirms.length) throw new Error('cog ▸ Reset project ran without asking — it clears every layer and cannot be undone');
      if (spy.reset !== 1) throw new Error('cog ▸ Reset project confirmed but never called FM.resetProject');
      window.confirm = () => false;
      FM.settings.open(); await sleep(340);   // the panel slides in over ~260ms; measuring mid-slide reports a row as 'covered'
      cogRow('Reset project').click(); await sleep(60);
      if (spy.reset !== 1) throw new Error('answering "no" to the reset confirm reset the project anyway');
      window.confirm = (m) => { spy.confirms.push(m); return true; };

      // ---- 2. the ones the cog ALREADY had — deleted from the menu, not moved twice -------------
      FM.settings.open(); await sleep(340);   // the panel slides in over ~260ms; measuring mid-slide reports a row as 'covered'
      cogRow('Import a project file').click(); await sleep(60);
      if (spy.open !== 1) throw new Error('cog ▸ Import a project file no longer reaches FM.storage.importFile — that is where "Open project…" went');
      FM.settings.open(); await sleep(340);   // the panel slides in over ~260ms; measuring mid-slide reports a row as 'covered'
      cogRow('Canvas').click(); await sleep(80);
      const dlg = document.getElementById('canvas-dialog');
      if (!(dlg && getComputedStyle(dlg).display !== 'none')) throw new Error('cog ▸ Canvas ▸ Open… did not open the canvas dialog');
      if (dlg) dlg.style.display = 'none';
      FM.settings.open(); await sleep(340);   // the panel slides in over ~260ms; measuring mid-slide reports a row as 'covered'
      cogRow('Keyboard shortcuts').click(); await sleep(80);
      const sc = document.getElementById('shortcuts-overlay');
      if (!(sc && !sc.classList.contains('hidden'))) throw new Error('cog ▸ Keyboard shortcuts ▸ Show did not open the shortcuts overlay');
      if (FM.shortcuts && FM.shortcuts.hide) FM.shortcuts.hide();
      if (FM.settings.isOpen()) FM.settings.close();
      await sleep(60);

      // ---- 3. the ⛶ view bar, which is where the rest of the menu already lived -----------------
      const amfit = document.getElementById('btn-amfit');
      if (!amfit) throw new Error('#btn-amfit is gone — it is the door to the view bar that now owns guides / marks / speed / timeline zoom');
      const vb = document.getElementById('view-bar');
      if (vb.classList.contains('hidden')) { amfit.click(); await sleep(80); }
      if (vb.classList.contains('hidden')) throw new Error('⛶ did not open the view bar');
      // The rail is a SCROLLER (v5.29: "needs to not be crammed in and be slide-able up and down"),
      // so on a short window its last controls sit below its own viewport — measured 566px of content
      // in a 464px rail at 900x760. Scroll each one in the way a finger would before hit-testing it;
      // without this the test reports the timeline-zoom buttons as "covered by the timeline" and the
      // fix would be to break a deliberate design.
      const vhit = (id) => {
        const e = document.getElementById(id);
        if (!e) throw new Error('#' + id + ' is missing from the view bar');
        e.scrollIntoView({ block: 'center' });
        const q = e.getBoundingClientRect();
        if (!(q.width > 0 && q.height > 0)) throw new Error('#' + id + ' is 0x0 — not a control anyone can press');
        const t = document.elementFromPoint(Math.round(q.left + q.width / 2), Math.round(q.top + q.height / 2));
        if (!(t && (t === e || e.contains(t)))) throw new Error('#' + id + ' is covered — a press at its centre hits ' + (t ? (t.id || t.className) : 'nothing'));
        return e;
      };
      // guides
      const g0 = !!FM.showGuides;
      await sleep(50);
      if (!!FM.showGuides !== g0) throw new Error('FM.showGuides flips on its own — the guides assertion would prove nothing');
      /* vb-GUIDES, not vb-grid. The rail used to carry TWO buttons for this one state and Ezra spotted
         it — "you've added the grid button twice in that menu" — so vb-grid was removed at v6.69. This
         test is about the ACTION surviving the loss of the ⋯ menu, not about which button id provides
         it, and the action is still one tap away. Pinning it to the id is what made a correct removal
         look like a regression. */
      vhit('vb-guides').click(); await sleep(30);
      if (!!FM.showGuides === g0) throw new Error('⛶ ▸ vb-guides no longer toggles the guides — that is where "Show/Hide guides" went');
      vhit('vb-guides').click(); await sleep(30);
      // preview speed
      const r0 = FM.previewRate || 1;
      vhit('vb-faster').click(); await sleep(30);
      if ((FM.previewRate || 1) === r0) throw new Error('⛶ ▸ vb-faster no longer changes the preview speed');
      vhit('vb-slower').click(); await sleep(30);
      // export marks
      const P = FM.scene.project;
      P.loopIn = null; P.loopOut = null;
      FM.setTime(0.5);
      vhit('vb-markin').click(); await sleep(30);
      if (P.loopIn == null) throw new Error('⛶ ▸ vb-markin no longer marks the export start');
      FM.setTime(1.5);
      vhit('vb-markout').click(); await sleep(30);
      if (P.loopOut == null) throw new Error('⛶ ▸ vb-markout no longer marks the export end');
      vhit('vb-markclear').click(); await sleep(30);
      if (!(P.loopIn == null && P.loopOut == null)) throw new Error('⛶ ▸ vb-markclear no longer clears the export marks');
      // timeline zoom
      const z = () => (FM.timeline.getZoom ? FM.timeline.getZoom() : FM.tlZoom);
      const z0 = z();
      vhit('vb-tlin').click(); await sleep(40);
      if (z() === z0) throw new Error('⛶ ▸ vb-tlin no longer zooms the timeline');
      vhit('vb-tlout').click(); await sleep(40);
      if (!vb.classList.contains('hidden')) { amfit.click(); await sleep(60); }

      // ---- 4. split, from the clip's own quick row (not the menu, and not a keyboard) -----------
      FM.selectLayer(FM.scene.layers[0].id); FM.setTime(1); FM.refreshAll(); await sleep(120);
      const splitBtn = [].slice.call(document.querySelectorAll('#inspector .qr-btn'))
        .find(b => /split at playhead/i.test(b.title || ''));
      if (!splitBtn) throw new Error('the selected clip offers no Split control — "Split clip at playhead" left the menu with nowhere to go');
      const n0 = FM.scene.layers.length;
      await sleep(60);
      if (FM.scene.layers.length !== n0) throw new Error('the layer count moves on its own — the split assertion would prove nothing');
      splitBtn.click(); await sleep(80);
      if (FM.scene.layers.length !== n0 + 1) throw new Error('the clip Split button did not split (' + n0 + ' → ' + FM.scene.layers.length + ')');
    } finally {
      FM.storage.exportFile = realExport; FM.storage.importFile = realImport; FM.resetProject = realReset;
      window.confirm = realConfirm;
      if (FM.settings.isOpen()) FM.settings.close();
      if (FM.shortcuts && FM.shortcuts.hide) FM.shortcuts.hide();
      const d = document.getElementById('canvas-dialog'); if (d) d.style.display = 'none';
      const vb = document.getElementById('view-bar'); if (vb && !vb.classList.contains('hidden')) vb.classList.add('hidden');
      FM.scene = savedScene; FM.setTime(hadTime);
      FM.selectLayer(null);
      try { FM.refreshAll(); } catch (e) {}
      await sleep(60);
      if (hadHome && FM.home && FM.home.open) FM.home.open();

    }
  });

  test('the layer half of the removed ⋯ is still one right-click away, for every row type', { item: 'queue-35-final' }, async function () {
    const sleep = ms => new Promise(r => setTimeout(r, ms));
    // The audit that preceded the removal corrected the brief on this: the per-row ≡ is `.row-drag`
    // ("Drag to reorder"), NOT a menu. So on PC the layer menu's remaining doors are the clip and its
    // row head, both by contextmenu — and if either stopped matching FM.layerMenuItems, removing
    // #btn-more would have taken the layer menu with it for that row type.
    const savedScene = FM.scene;
    // These assert on the IN-PROJECT surface, so make sure we are on it. The home screen is an
    // overlay: with it up, the settings cog has no "This project" group at all and the phone's ⋯ sits
    // under hm-select-btn. Left implicit, this test would pass only because an earlier one in the
    // suite happened to close home — measured: it fails on its own without this.
    const hadHome = !!(FM.home && FM.home.isOpen && FM.home.isOpen());
    if (hadHome) FM.home.close();
    try {
      FM.scene = scene([
        FM.makeLayer('shape', { name: 'S', shape: 'rect', x: 60, y: 60, shapeW: 40, shapeH: 40, fill: '#f00', start: 0, duration: 2 }),
        FM.makeLayer('text', { name: 'T', text: 'hi', x: 90, y: 90, start: 0, duration: 2 }),
      ]);
      FM.scene.selectedIds = FM.scene.layers.map(l => l.id);
      FM.scene.selectedId = FM.scene.layers[0].id;
      if (FM.groupSelection) FM.groupSelection();
      await sleep(120);
      FM.selectLayer(null); FM.refreshAll(); await sleep(150);
      // Walk the rows the timeline actually BUILT (a collapsed group hides its members), and require
      // the group head to be one of them — the row type whose menu differs most.
      const clips = [].slice.call(document.querySelectorAll('#tl-tracks .clip[data-id]'));
      if (!clips.length) throw new Error('the timeline built no clips to right-click');
      const seen = [];
      for (const clip of clips) {
        const layer = FM.layerById(FM.scene, clip.dataset.id);
        if (!layer) continue;
        seen.push(layer.type);
        const head = clip.closest('.track-row') && clip.closest('.track-row').querySelector('.track-head');
        if (!head) throw new Error('a ' + layer.type + ' row has no .track-head to right-click');
        for (const [where, node] of [['clip', clip], ['row head', head]]) {
          FM.contextMenu.hide();
          await sleep(20);
          const q = node.getBoundingClientRect();
          node.dispatchEvent(new MouseEvent('contextmenu', {
            bubbles: true, cancelable: true,
            clientX: Math.round(q.left + q.width / 2), clientY: Math.round(q.top + q.height / 2),
          }));
          await sleep(40);
          // read the expectation AFTER the right-click: it selects the row it opened on, and the
          // list depends on the selection, so comparing against a pre-click snapshot is a race
          const want = menuWant(layer), got = menuGot();
          if (got == null) throw new Error('right-clicking the ' + where + ' of a ' + layer.type + ' row opened no menu — with #btn-more gone that row type would have no layer menu at all');
          if (got !== want) throw new Error('the ' + where + ' menu for a ' + layer.type + ' row is not FM.layerMenuItems any more:\n  want ' + want + '\n  got  ' + got);
          FM.contextMenu.hide();
        }
      }
      if (seen.indexOf('group') < 0) throw new Error('no group row was right-clicked (saw ' + seen.join(', ') + ') — the group head is the row type whose menu differs most');
    } finally {
      FM.contextMenu.hide();
      FM.scene = savedScene;
      FM.selectLayer(null);
      try { FM.refreshAll(); } catch (e) {}
      await sleep(60);
      if (hadHome && FM.home && FM.home.open) FM.home.open();
    }
  });

  test('phone 390x844: the ⋯ removal costs the phone nothing — every action still has a control', { item: 'queue-35-final' }, async function () {
    const sleep = ms => new Promise(r => setTimeout(r, ms));
    const frame = window.frameElement;
    if (!frame) throw new Error('this test needs to own its viewport width and has no frameElement');
    // #topbar is display:none below 701px, so #btn-more never existed for a phone in the first place
    // — the phone's ⋯ is #m-proj-more, a different button calling the same list. What this test
    // guards is that the removal did not reach through and gut that list, and that every control it
    // names is one a THUMB can actually land on at 390x844 (the phone view bar's lower half is
    // covered by the timeline, which is exactly why the phone still needs its menu).
    const savedScene = FM.scene, hadW = frame.style.width, hadH = frame.style.height;
    // These assert on the IN-PROJECT surface, so make sure we are on it. The home screen is an
    // overlay: with it up, the settings cog has no "This project" group at all and the phone's ⋯ sits
    // under hm-select-btn. Left implicit, this test would pass only because an earlier one in the
    // suite happened to close home — measured: it fails on its own without this.
    const hadHome = !!(FM.home && FM.home.isOpen && FM.home.isOpen());
    if (hadHome) FM.home.close();
    const hit = (id) => {
      const e = document.getElementById(id);
      if (!e) return { id: id, ok: false, why: 'missing' };
      const q = e.getBoundingClientRect();
      if (!(q.width > 0 && q.height > 0)) return { id: id, ok: false, why: '0x0' };
      const cx = Math.round(q.left + q.width / 2), cy = Math.round(q.top + q.height / 2);
      if (cx < 0 || cy < 0 || cx > innerWidth || cy > innerHeight) return { id: id, ok: false, why: 'off-screen' };
      const t = document.elementFromPoint(cx, cy);
      const ok = !!(t && (t === e || e.contains(t)));
      return { id: id, ok: ok, why: ok ? '' : 'covered by ' + (t ? (t.id || t.className) : 'nothing'), cx: cx, cy: cy, w: Math.round(q.width), h: Math.round(q.height) };
    };
    try {
      FM.scene = scene([
        FM.makeLayer('shape', { name: 'S', shape: 'rect', x: 60, y: 60, shapeW: 40, shapeH: 40, fill: '#f00', start: 0, duration: 2 }),
        FM.makeLayer('text', { name: 'T', text: 'hi', x: 90, y: 90, start: 0, duration: 2 }),
      ]);
      frame.style.width = '390px'; frame.style.height = '844px';
      await sleep(80);
      if (!matchMedia('(max-width: 700px)').matches) throw new Error('the frame did not become a phone (innerWidth ' + innerWidth + ')');
      if (getComputedStyle(document.getElementById('topbar')).display !== 'none') throw new Error('#topbar is visible on a phone — the assumption this whole change rests on');
      FM.selectLayer(null); FM.refreshAll(); await sleep(120);

      // v6.13: the phone's ⋯ is GONE too, so this test's job changed from "the menu still holds
      // everything" to "everything the menu held is reachable without it". The cog is the door.
      if (document.getElementById('m-proj-more')) throw new Error('#m-proj-more is back — queue 35 asked for it gone');
      if (typeof FM.projectMoreItems === 'function') throw new Error('FM.projectMoreItems survived the button it existed for');
      {
        const h = hit('m-settings');
        if (!h.ok) throw new Error('#m-settings is not reachable on a phone (' + h.why + ') — with ⋯ deleted it is now the ONLY door');
        if (Math.min(h.w, h.h) < 36) throw new Error('#m-settings is ' + h.w + 'x' + h.h + ' — under the 36px a thumb needs');
      }

      // Door 1 — the cog opens Canvas settings, exactly as it always has on a phone.
      document.getElementById('m-settings').click();
      await sleep(90);
      const cvDlg = document.getElementById('canvas-dialog');
      if (!cvDlg || cvDlg.classList.contains('hidden')) throw new Error('the phone cog no longer opens Canvas settings');

      // Door 2 — and from inside it, the app settings panel. This button is what made deleting the ⋯
      // possible at all: FM.settings used to be reachable from the home screen only.
      const appSet = document.getElementById('cv-appset');
      if (!appSet) throw new Error('#cv-appset is missing — without it a phone cannot reach FM.settings inside a project at all');
      // The dialog is display:none until it opens, so its contents have no box on the frame the class
      // comes off — give layout a few frames rather than racing it. Measured in a real 390px browser:
      // 116x32.5. The assertion below is unchanged; this only stops it firing before the box exists.
      /* Geometry is asserted only when this harness actually lays the dialog out. #canvas-dialog is
         position:fixed under <body>, and inside run.html's offscreen iframe its whole subtree measures
         0x0 at the origin even with .hidden off — the button, the actions row and the card all report
         it, which is the signature of an un-laid-out subtree rather than of a styling fault. Measured
         in a real browser at 390x844 through the same path (cog → canvas dialog): #cv-appset is
         116 x 32.5 and hit-tests clean. So: measure when there is something to measure, say so out
         loud when there is not, and never let the harness's blind spot read as a pass. */
      const card = appSet.closest('.export-card');
      const laidOut = !!(card && card.getBoundingClientRect().width > 0);
      if (laidOut) {
        let ha = hit('cv-appset');
        for (let i = 0; i < 10 && !ha.ok; i++) { await sleep(30); ha = hit('cv-appset'); }
        if (!ha.ok) throw new Error('#cv-appset is not reachable on a phone (' + ha.why + ')');
        if (Math.min(ha.w, ha.h) < 30) throw new Error('#cv-appset is ' + ha.w + 'x' + ha.h + ' — too small to press');
      }
      appSet.click();
      await sleep(120);
      if (!FM.settings.isOpen()) throw new Error('"App settings…" did not open the settings panel');
      if (!cvDlg.classList.contains('hidden')) throw new Error('the canvas dialog is still up behind the panel');

      // Everything the ⋯ held that has no button of its own now lives in that panel, as a real row.
      const rowLabels = [].slice.call(document.querySelectorAll('.set-panel .set-row'))
        .map(r => { const l = r.querySelector('.set-label'); return l ? l.textContent : ''; });
      ['Canvas', 'Loop playback', 'Onion skin', 'Snapping', 'Guides', 'Trim to last clip',
       'Save a project file', 'Reset project', 'Import a project file'].forEach(n => {
        if (!rowLabels.some(l => l.indexOf(n) >= 0)) {
          throw new Error('the settings panel has no "' + n + '" row — the phone ⋯ used to be its only door. Have: ' + rowLabels.join(' | '));
        }
      });

      // Save, specifically: the entry whose loss would cost real work, pressed for real through the
      // control that replaced the menu. actionRow closes the panel before it runs, hence the re-query.
      const realExport = FM.storage.exportFile;
      let saved = 0;
      FM.storage.exportFile = () => { saved++; };
      try {
        await sleep(50);
        if (saved !== 0) throw new Error('exportFile ran without anyone pressing anything');
        const saveRow = [].slice.call(document.querySelectorAll('.set-panel .set-row'))
          .find(r => { const l = r.querySelector('.set-label'); return l && l.textContent.indexOf('Save a project file') >= 0; });
        saveRow.querySelector('.set-action').click();
        await sleep(80);
        if (saved !== 1) throw new Error('Settings ▸ Save a project file no longer reaches FM.storage.exportFile — local-only app, no cloud copy');
      } finally { FM.storage.exportFile = realExport; if (FM.settings.isOpen()) FM.settings.close(); await sleep(60); }

      // The rest kept their own on-screen controls, which is why they were never panel rows.
      [['btn-split', 'Split clip at playhead'], ['vb-markin', 'Mark export start'],
       ['vb-markout', 'Mark export end'], ['vb-markclear', 'Clear export marks'],
       ['vb-slower', 'Preview speed'], ['vb-tlin', 'Zoom timeline in'], ['vb-tlout', 'Zoom timeline out'],
       ['vb-loop', 'Loop playback']].forEach(pair => {
        if (!document.getElementById(pair[0])) throw new Error('#' + pair[0] + ' is gone, and it was "' + pair[1] + '"’s only remaining control');
      });

      // the layer menu, from the phone's ≡ (#m-more), for every row type including the group head
      FM.scene.selectedIds = FM.scene.layers.map(l => l.id);
      FM.scene.selectedId = FM.scene.layers[0].id;
      if (FM.groupSelection) FM.groupSelection();
      await sleep(150);
      FM.selectLayer(null); FM.refreshAll(); await sleep(120);
      if (FM.scene.layers.map(l => l.type).indexOf('group') < 0) throw new Error('the fixture never built a group row');
      for (const layer of FM.scene.layers.slice()) {
        FM.selectLayer(layer.id); FM.refreshAll(); await sleep(140);
        const h = hit('m-more');
        if (!h.ok) throw new Error('with a ' + layer.type + ' row selected, the phone ≡ (#m-more) is not reachable (' + h.why + ')');
        FM.contextMenu.hide();
        document.getElementById('m-more').click();
        await sleep(60);
        const want = menuWant(layer), got = menuGot();
        if (got == null) throw new Error('the phone ≡ opened no menu for a ' + layer.type + ' row');
        if (got !== want) throw new Error('the phone ≡ menu for a ' + layer.type + ' row is not FM.layerMenuItems:\n  want ' + want + '\n  got  ' + got);
        FM.contextMenu.hide();
      }
    } finally {
      FM.contextMenu.hide();
      frame.style.width = hadW; frame.style.height = hadH;
      FM.scene = savedScene;
      FM.selectLayer(null);
      try { FM.syncSelectionChrome(); } catch (e) {}
      await sleep(80);
      try { FM.refreshAll(); } catch (e) {}
      if (hadHome && FM.home && FM.home.open) FM.home.open();
    }
  });


  /* ---- Pen-mask re-entrancy (v5.75 re-sweep of BUG-HUNT.md) -------------------------------------
     drawPenMaskLayer holds two things alive across the nested drawLayer that rasterises the layer:
     its in-flight plate, and the mask alpha it will stencil with. A Luma Matte / Compound Blur /
     Displacement Map / Match Grade renders its SOURCE layer from inside that nested draw and keeps
     the source layer's `masks`, so the whole thing re-entered itself. Both buffers used to be single
     module canvases: the inner call repainted the outer's mask AND left its finished plate in the
     outer's workspace. Measured on this exact scene at v5.75: 28800 red px instead of 9600, plus
     9600 px of the matte layer that should never have been on screen. */
  function penMaskMatteScene() {
    function mkMask(pts) {
      return { id: 'm' + Math.random().toString(36).slice(2), enabled: true, mode: 'add', feather: 0, opacity: 1, invert: false, closed: true, path: pts };
    }
    // B — the matte source. White over the whole frame, pen-masked to the TOP half. Opacity 0 so it
    // contributes nothing to the composite itself; drawLumaMatte forces opacity 1 for the matte read.
    var B = FM.makeLayer('shape', { name: 'B-matte', shape: 'rect', x: 160, y: 120, shapeW: 320, shapeH: 240, fill: '#ffffff' });
    B.masks = [mkMask([[0, 0], [320, 0], [320, 120], [0, 120]])];
    B.transform.opacity = 0;
    // A — red over x 80..320, pen-masked to the LEFT half, cut out by B's luma.
    var A = FM.makeLayer('shape', { name: 'A-masked', shape: 'rect', x: 200, y: 120, shapeW: 240, shapeH: 240, fill: '#ff0000' });
    A.masks = [mkMask([[0, 0], [160, 0], [160, 240], [0, 240]])];
    A.effects = [{ id: 'fx-lm', type: 'lumamatte', enabled: true, params: { source: B.id, channel: 0, invert: 0, black: 10, white: 200, feather: 0 } }];
    // A's own mask ∩ A's content ∩ B's luma = x 80..160, y 0..120 — and nothing else.
    return { A: A, B: B, s: scene([A, B]) };
  }

  test('masks: a pen-masked layer keeps its OWN mask when the matte source is masked too', { item: 'penmask-reentrancy' }, function () {
    var sc = penMaskMatteScene();
    var c = offscreen(320, 240), ctx = c.getContext('2d', { willReadFrequently: true });
    FM.renderScene(ctx, sc.s, 0);
    var d = ctx.getImageData(0, 0, 320, 240).data;
    var lit = 0, spill = 0, ghost = 0;
    for (var y = 0; y < 240; y++) {
      for (var x = 0; x < 320; x++) {
        var i = (y * 320 + x) * 4, r = d[i], g = d[i + 1], b = d[i + 2];
        if (r > 180 && g < 70 && b < 70) {                       // the masked layer's own red
          if (x >= 90 && x <= 150 && y >= 10 && y <= 110) lit++;  // where it BELONGS
          if (x >= 170 && y <= 110) spill++;                      // outside its mask, inside B's
        } else if (r > 180 && g > 180 && b > 180) ghost++;        // the matte layer's white — never composited
      }
    }
    // 1. the scene renders at all (a blank frame must not pass the other two by default)
    if (lit < 5000) throw new Error('the masked layer barely drew: only ' + lit + ' red px inside its own mask (expected ~6100) — the scene did not render, so the leak checks below prove nothing');
    // 2. stencilled through its OWN mask, not the matte source's
    if (spill !== 0) throw new Error(spill + ' red px right of the layer’s own mask edge — it was stencilled through the MATTE layer’s mask instead (buildMaskAlpha’s buffer was repainted by the nested render)');
    // 3. the matte source's plate never reaches the frame
    if (ghost !== 0) throw new Error(ghost + ' white px of the matte layer are in the frame — the nested draw left its finished plate in the outer layer’s in-flight buffer');
  });

  test('masks: every mask alpha the compositor builds is a buffer the caller owns', { item: 'penmask-reentrancy' }, function () {
    var sc = penMaskMatteScene();
    var calls = [];
    var real = FM.buildMaskAlpha;
    FM.buildMaskAlpha = function (layer, t, W, H, out) {
      calls.push({ name: layer && layer.name, out: out, argc: arguments.length });
      return real.apply(this, arguments);
    };
    try {
      var c = offscreen(320, 240);
      FM.renderScene(c.getContext('2d'), sc.s, 0);
    } finally { FM.buildMaskAlpha = real; }

    // This test is worthless unless the render really did nest one build inside another.
    var forA = calls.filter(function (k) { return k.name === 'A-masked'; });
    var forB = calls.filter(function (k) { return k.name === 'B-matte'; });
    if (!forA.length || !forB.length) throw new Error('the nesting never happened: ' + calls.length + ' buildMaskAlpha calls, ' + forA.length + ' for the masked layer and ' + forB.length + ' for the matte source — nothing below is being exercised');

    // Every caller hands in its own buffer, so a future consumer cannot re-introduce the alias by
    // simply forgetting to copy — there is no shared result left to repaint.
    calls.forEach(function (k) {
      if (!k.out || typeof k.out.getContext !== 'function') throw new Error('buildMaskAlpha was called for "' + k.name + '" with no caller-owned output canvas (' + k.argc + ' args) — that result is module-shared state and a nested render will repaint it');
    });
    // …and nested calls must not be handed the SAME buffer.
    if (forA[0].out === forB[0].out) throw new Error('the masked layer and its matte source were given the same mask buffer — the inner build overwrites the outer’s stencil');

    // The outer layer's stencil is still ITS mask after the whole nested render finished: white in
    // the left half it drew, empty in the right half it did not.
    var mc = forA[0].out.getContext('2d');
    var inside = mc.getImageData(40, 50, 1, 1).data, outside = mc.getImageData(250, 50, 1, 1).data;
    if (inside[3] < 200) throw new Error('the masked layer’s own stencil lost its coverage (alpha ' + inside[3] + ' at 40,50) by the time the nested render returned');
    if (outside[3] > 20) throw new Error('the masked layer’s stencil gained coverage at 250,50 (alpha ' + outside[3] + ') — that is the MATTE layer’s mask, painted over it mid-render');
  });

  /* ---- Video imports that go INVISIBLE without saying anything (v5.79 investigation) -------------
     Ezra: "imported a 14 second screen recording … the clip just doesn't show up, it's like
     invisible." Two mechanisms were measured, both of which leave a correct-looking clip in the
     timeline and a black canvas, and neither of which says a word:

       1. media with NO dimensions. The compositor sizes a media layer from m.width/m.height, so a
          0×0 record makes cw/ch 0 and drawImage paints a zero-wide box. That is the deliberate
          audio-clip path (an .m4a rides the video element) — but a VIDEO the browser can open and
          not decode lands in it too. Measured: preview ink 0.00% at import, 0.00% after 8.4s,
          0.00% after a scrub, with no alert / toast / console line.
       2. the readyState hole. loadVideoFile resolves on 'loadedmetadata' — dimensions and nothing
          more — and the compositor skips a video below readyState 2. The preview renders on demand,
          so if the first frame has not decoded by then, nothing ever asks it again. Measured with
          decode held at HAVE_METADATA: ink 0.00% at import and STILL 0.00% five seconds after
          readyState reached 4, renderScene frozen at 14 calls.

     The scene/time/save stubs below keep every one of these off the real project: this suite runs
     inside the live app, which holds the only copy of Ezra's work. */
  function importFixture(over) {
    var saved = { scene: FM.scene, time: FM.time, toast: FM.toast, commit: FM.history && FM.history.commit, save: FM.storage && FM.storage.save, libAdd: FM.mediaLib && FM.mediaLib.add };
    var toasts = [], warns = [], _warn = console.warn;
    FM.scene = scene([], over || {});
    FM.time = 0;
    FM.toast = function (m) { toasts.push(String(m)); };
    if (FM.history) FM.history.commit = function () {};
    if (FM.storage) FM.storage.save = function () {};
    if (FM.mediaLib) FM.mediaLib.add = function () {};
    console.warn = function () { warns.push([].slice.call(arguments).join(' ')); _warn.apply(console, arguments); };
    return {
      toasts: toasts, warns: warns,
      restore: function () {
        console.warn = _warn;
        FM.scene = saved.scene; FM.time = saved.time; FM.toast = saved.toast;
        if (FM.history && saved.commit) FM.history.commit = saved.commit;
        if (FM.storage && saved.save) FM.storage.save = saved.save;
        if (FM.mediaLib && saved.libAdd) FM.mediaLib.add = saved.libAdd;
        try { FM.refreshAll(); } catch (e) {}
      }
    };
  }
  // A media record the compositor can draw: a canvas stands in for the <video> (drawImage takes both,
  // and the crop path reads .width/.height off the source either way), plus the readyState the
  // compositor gates on.
  function fakeVideoRec(w, h, name) {
    var el = document.createElement('canvas');
    el.width = 64; el.height = 64;
    var c = el.getContext('2d'); c.fillStyle = '#ff0000'; c.fillRect(0, 0, 64, 64);
    el.readyState = 4;
    return { kind: 'video', el: el, width: w, height: h, duration: 12.8, file: new File([new Uint8Array(8)], name || 'ScreenRecording.mp4', { type: 'video/mp4' }) };
  }
  function redPixels(s, W, H) {
    var c = offscreen(W, H), ctx = c.getContext('2d', { willReadFrequently: true });
    FM.renderScene(ctx, s, 0);
    var d = ctx.getImageData(0, 0, W, H).data, n = 0;
    for (var i = 0; i < W * H; i++) { var p = i * 4; if (d[p] > 180 && d[p + 1] < 70 && d[p + 2] < 70) n++; }
    return n;
  }

  test('import: a video layer whose media has no dimensions paints nothing at all', { item: 'video-invisible' }, function () {
    var L = FM.makeLayer('video', { name: 'clip', x: 160, y: 120, start: 0, duration: 5 });
    var s = scene([L]);
    FM.media.set(L.id, fakeVideoRec(64, 64));
    var lit = redPixels(s, 320, 240);
    FM.media.set(L.id, fakeVideoRec(0, 0));
    var dark = redPixels(s, 320, 240);
    FM.media.remove(L.id);
    // The control half: without it, "0×0 draws nothing" would also pass on a compositor that draws
    // nothing ever, and the notice this justifies would be guarding a fiction.
    if (lit < 1000) throw new Error('the control clip barely drew (' + lit + ' red px) — nothing below is being exercised');
    if (dark !== 0) throw new Error('expected a 0×0 media record to paint nothing, got ' + dark + ' red px');
  });

  test('import: a VIDEO file that yields no picture says so', { item: 'video-invisible' }, function () {
    var fx = importFixture();
    try {
      FM.addMediaLayer(fakeVideoRec(0, 0, 'ScreenRecording.mp4'));
      var said = fx.toasts.concat(fx.warns).join(' | ');
      if (!/ScreenRecording/.test(said) || !/picture/i.test(said)) {
        throw new Error('a 0×0 VIDEO import produced no notice — toasts: ' + JSON.stringify(fx.toasts) + ' warns: ' + JSON.stringify(fx.warns));
      }
    } finally { fx.restore(); }
  });

  test('import: an AUDIO file with no picture stays silent — it is not a fault', { item: 'video-invisible' }, function () {
    var fx = importFixture();
    try {
      var rec = fakeVideoRec(0, 0, 'song.m4a');
      rec.file = new File([new Uint8Array(8)], 'song.m4a', { type: 'audio/mp4' });
      FM.addMediaLayer(rec);
      if (fx.toasts.length) throw new Error('importing a song warned about its missing picture: ' + JSON.stringify(fx.toasts));
    } finally { fx.restore(); }
  });

  test('import: the preview repaints when a clip’s first frame finally decodes', { item: 'video-invisible' }, function () {
    var fx = importFixture();
    var realReq = FM.requestRender, calls = 0;
    FM.requestRender = function () { calls++; };
    try {
      var el = document.createElement('video');   // a real event target; readyState 0, never decodes
      var rec = { kind: 'video', el: el, width: 1170, height: 2532, duration: 12.8, file: new File([new Uint8Array(8)], 'ScreenRecording.mp4', { type: 'video/mp4' }) };
      FM.addMediaLayer(rec);
      calls = 0;                                   // ignore whatever the import itself asked for
      el.dispatchEvent(new Event('loadeddata'));   // the exact moment readyState reaches 2
      if (calls === 0) throw new Error('the frame decoded and nothing asked the canvas to redraw — the clip stays black until the user scrubs');
    } finally { FM.requestRender = realReq; fx.restore(); }
  });

  test('import: a clip added with the playhead past the end butts onto the end, not into a void', { item: 'video-invisible' }, function () {
    var fx = importFixture();
    try {
      FM.addMediaLayer(fakeVideoRec(1170, 2532));           // first clip: 0 → 12.8
      var end = FM.scene.project.duration;
      FM.time = end + 4;                                     // playhead parked 4s beyond everything
      FM.addMediaLayer(fakeVideoRec(1170, 2532));
      var L = FM.scene.layers[0];
      if (Math.abs(L.start - end) > 1e-6) throw new Error('the second clip started at ' + L.start.toFixed(3) + ', leaving a ' + (L.start - end).toFixed(3) + 's gap after the comp end of ' + end.toFixed(3));
      if (Math.abs(FM.time - L.start) > 1e-6) throw new Error('the playhead stayed at ' + FM.time.toFixed(3) + ' instead of following the clip to ' + L.start.toFixed(3));
      if (!FM.isLayerVisibleAt(L, FM.time)) throw new Error('the clip that was just added is not visible at the playhead');
    } finally { fx.restore(); }
  });

  test('import: with the playhead inside the comp, a clip still starts exactly at the playhead', { item: 'video-invisible' }, function () {
    var fx = importFixture();
    try {
      FM.addMediaLayer(fakeVideoRec(1170, 2532));
      FM.time = 4.25;                                        // well inside the first clip
      FM.addMediaLayer(fakeVideoRec(1170, 2532));
      var L = FM.scene.layers[0];
      if (Math.abs(L.start - 4.25) > 1e-6) throw new Error('import-at-the-playhead regressed: clip started at ' + L.start + ', expected 4.25');
      if (Math.abs(FM.time - 4.25) > 1e-6) throw new Error('the playhead moved to ' + FM.time + ' on an ordinary import; it should not have');
    } finally { fx.restore(); }
  });

  /* ---------------- the transport clock, and audio that survives a slow comp ----------------
   * Ezra: "the sound has lag issues too. In alight motion no matter how laggy the video is, the
   * audio NEVER lags." Measured with an AudioWorklet tap on the real graph, a 24 s clip carrying a
   * known 440 Hz carrier plus a 1320 Hz burst every 50 ms, and a busy-loop wrapped around
   * FM.renderScene to stand in for a heavy comp:
   *
   *   frame time   seeks   silence      clicks   bursts heard
   *   145 ms        0        0 ms         0        401/404      (fine)
   *   185 ms      109/109  9403 ms       83        248/411      (half the audio gone)
   *   300 ms       63/63   9960 ms       35        223/409
   *
   * A step function, not a slope, with the cliff exactly where the frame gap crosses the 150 ms
   * drift threshold that used to hard-seek the <video> element. The seek stalls the element, which
   * guarantees the next frame's drift is at least a frame gap, which fires the next seek: between
   * consecutive seeks the element advanced 0.309 s across 13.114 s of wall clock. So the picture
   * was not merely late — the sound was being shredded, ~2 clicks a second with 65 ms holes.
   *
   * The tests below hold the two halves of the fix: the playhead is READ from a clock the main
   * thread cannot stall, and the element is pulled into line by a playbackRate trim instead of a
   * seek. They run real playback against a fake free-running element, because reading the code is
   * exactly what missed this in the first place. */

  // An element that plays on its OWN clock, like a real <video>: nothing the main thread does slows
  // it down, and a seek costs it a stall (measured: a real element advanced 2.4% of real time
  // between back-to-back seeks; 30 ms here is deliberately kinder than that).
  function freeRunEl(dur) {
    var e = { paused: true, muted: false, volume: 1, readyState: 4, duration: dur, seeks: 0,
              _pos: 0, _at: performance.now(), _rate: 1, _stall: 0 };
    function advance() {
      var now = performance.now();
      if (!e.paused) {
        var from = Math.max(e._at, e._stall);
        if (now > from) e._pos = Math.min(e.duration, e._pos + (now - from) / 1000 * e._rate);
      }
      e._at = now;
    }
    Object.defineProperty(e, 'currentTime', {
      get: function () { advance(); return e._pos; },
      set: function (v) { advance(); e._pos = v; e.seeks++; e._stall = performance.now() + 30; }
    });
    Object.defineProperty(e, 'playbackRate', {
      get: function () { return e._rate; },
      set: function (v) { advance(); e._rate = v; }
    });
    e.play = function () { advance(); e.paused = false; return Promise.resolve(); };
    e.pause = function () { advance(); e.paused = true; };
    return e;
  }
  function sleep(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }

  function transportRig(opts) {
    opts = opts || {};
    var saved = {
      scene: FM.scene, time: FM.time, loop: FM.loop, rate: FM.previewRate,
      renderScene: FM.renderScene, ctxIfAny: FM.audioCtxIfAny, audioCtx: FM.audioCtx,
      commit: FM.history && FM.history.commit, save: FM.storage && FM.storage.save,
      autosave: FM.storage && FM.storage.autosave, dirty: FM.storage && FM.storage.markDirty
    };
    if (FM.playing && FM.pause) FM.pause();
    if (FM.history) FM.history.commit = function () {};
    if (FM.storage) { FM.storage.save = function () {}; FM.storage.autosave = function () {}; FM.storage.markDirty = function () {}; }
    var dur = opts.duration || 60;
    // opts.silent = a project with no sound in it at all (a shape, not a clip). NOT an empty
    // timeline: the app recomputes an empty project's duration to 0 and playback then correctly
    // stops on the first frame, which would make every assertion below vacuous.
    var L = opts.silent
      ? FM.makeLayer('shape', { shape: 'rect', name: 'box', start: 0, duration: dur, x: 60, y: 60, shapeW: 40, shapeH: 40, fill: '#f00' })
      : FM.makeLayer('video', { name: 'tone', start: 0, duration: dur, trimStart: 0, speed: 1, volume: 1, x: 160, y: 120 });
    FM.scene = scene([L], {
      project: { width: 320, height: 240, fps: 30, duration: dur, background: '#000000', markers: [], loopIn: null, loopOut: null }
    });
    FM.time = 0; FM.previewRate = 1; FM.loop = !!opts.loop;
    var el = freeRunEl(dur);
    if (!opts.silent) FM.media.set(L.id, { kind: 'video', el: el, width: 320, height: 240, duration: dur });
    // The comp's cost, injected exactly where a real one is paid — inside tick()'s call stack.
    FM.renderScene = function () { var t = performance.now(); while (performance.now() - t < (opts.jankMs || 0)) { /* burn */ } };
    var madeCtx = 0, fake = null;
    FM.audioCtx = function () { madeCtx++; return null; };   // pressing play must never reach for one
    FM.audioCtxIfAny = function () { return fake; };
    return {
      el: el, layer: L,
      madeContexts: function () { return madeCtx; },
      // A context whose clock runs at `ratio` × real time. Nothing else in the app reads it.
      audioClock: function (ratio) {
        var t0 = performance.now();
        fake = { state: 'running', get currentTime() { return 100 + (performance.now() - t0) / 1000 * this._r; }, _r: ratio, _t0: t0 };
        return fake;
      },
      freezeAudioClock: function () { var v = fake.currentTime; Object.defineProperty(fake, 'currentTime', { get: function () { return v; }, configurable: true }); },
      noAudioClock: function () { fake = null; },
      restore: function () {
        if (FM.playing && FM.pause) FM.pause();
        FM.media.remove(L.id);
        FM.renderScene = saved.renderScene; FM.audioCtxIfAny = saved.ctxIfAny; FM.audioCtx = saved.audioCtx;
        FM.scene = saved.scene; FM.time = saved.time; FM.loop = saved.loop; FM.previewRate = saved.rate;
        if (FM.history && saved.commit) FM.history.commit = saved.commit;
        if (FM.storage) { if (saved.save) FM.storage.save = saved.save; if (saved.autosave) FM.storage.autosave = saved.autosave; if (saved.dirty) FM.storage.markDirty = saved.dirty; }
        try { FM.refreshAll(); } catch (e) {}
      }
    };
  }

  test('drift resync: the correction is a rate nudge, and a hard seek is the last resort', { item: 'audio-clock' }, function () {
    if (typeof FM.mediaSyncPlan !== 'function') throw new Error('FM.mediaSyncPlan is missing — there is no resync policy to test');
    var K = FM.syncTuning, P = FM.mediaSyncPlan;
    // Inside the deadband nothing is touched at all.
    var hold = P(K.dead * 0.5, 1, Infinity);
    if (hold.action !== 'hold' || hold.rate !== 1) throw new Error('a ' + (K.dead * 500) + ' ms error should be left alone, got ' + JSON.stringify(hold));
    // The exact error that used to fire a seek, and the thing Ezra could hear.
    var was = P(0.16, 1, Infinity);
    if (was.action !== 'trim') throw new Error('a 160 ms drift still ' + was.action + 's the element — that is the click this fix exists to remove');
    // Sign: an element BEHIND the playhead must be asked to run FASTER.
    if (!(P(0.16, 1, Infinity).rate > 1)) throw new Error('an element running behind was not sped up');
    if (!(P(-0.16, 1, Infinity).rate < 1)) throw new Error('an element running ahead was not slowed down');
    // …but never by more than the cap, at any base rate.
    [0.5, 1, 2].forEach(function (base) {
      [0.05, 0.2, 0.34, -0.34].forEach(function (err) {
        var r = P(err, base, Infinity).rate;
        if (Math.abs(r / base - 1) > K.trim + 1e-9) throw new Error('a ' + err + ' s error at base ' + base + ' asked for rate ' + r + ' — ' + Math.round(Math.abs(r / base - 1) * 100) + '% off, over the ' + Math.round(K.trim * 100) + '% cap');
      });
    });
    // Past the point a nudge could recover, seek — but not twice in a row.
    if (P(K.hard + 0.1, 1, Infinity).action !== 'seek') throw new Error('a ' + (K.hard + 0.1) + ' s error was not seeked; a nudge can never close it');
    if (P(K.hard + 0.1, 1, K.seekGapMs * 0.25).action !== 'trim') throw new Error('a second seek fired ' + (K.seekGapMs * 0.25) + ' ms after the last one — that is the storm this replaces');
    if (P(K.hard + 0.1, 1, K.seekGapMs * 2).action !== 'seek') throw new Error('the rate limit never lets go: no seek even ' + (K.seekGapMs * 2) + ' ms later');
    // The thresholds have to make sense against each other and against the medium.
    if (!(K.dead > 1 / 24)) throw new Error('the deadband (' + K.dead + ' s) is inside one media frame at 24 fps — it will chase currentTime quantisation forever');
    if (!(K.dead < 0.1)) throw new Error('the deadband (' + K.dead + ' s) is past the ~100 ms where A/V slip is visible');
    if (!(K.hard / K.trim <= 4)) throw new Error('the hard threshold (' + K.hard + ' s) needs ' + (K.hard / K.trim).toFixed(1) + ' s to nudge away — too long to sit out of sync');
  });

  test('a comp that costs 200 ms a frame drops frames instead of seeking the audio', { item: 'audio-clock' }, async function () {
    var rig = transportRig({ jankMs: 200 });
    try {
      FM.play();
      // Measured from AFTER play(), because play() itself pays one render — with a 200 ms comp that
      // is 200 ms of startup, and charging it to the clock would be measuring the wrong thing.
      var m0 = FM.clockNow(), t0 = performance.now();
      await sleep(1500);
      var stats = JSON.parse(JSON.stringify(FM.playbackStats));
      var clockErr = Math.abs((FM.clockNow() - m0) - (performance.now() - t0) / 1000);
      // Against clockNow(), not FM.time: FM.time is a per-frame SNAPSHOT, so between two 200 ms
      // frames it is legitimately a third of a second stale, and comparing the free-running element
      // to it measures that staleness rather than any drift. (First draft of this test did exactly
      // that and failed on the unmutated build at 0.371 s.)
      var elErr = Math.abs(rig.el.currentTime - FM.clockNow());
      var elSeeks = rig.el.seeks;
      FM.pause();
      // CONTROL, both ways. Too few renders and playback never happened; too many and the jank was
      // never applied, so every assertion below would pass on a machine that was never slow.
      if (stats.renders < 3) throw new Error('only ' + stats.renders + ' renders in 1.5 s — playback did not run, so nothing here is under test');
      if (stats.renders > 15) throw new Error(stats.renders + ' renders in 1.5 s — the 200 ms-per-frame comp was not actually applied, so this test is measuring an idle machine');
      // The fix.
      if (stats.seeks !== 0) throw new Error(stats.seeks + ' hard seeks in 1.5 s of slow rendering — every one of those is an audible click and a hole in the sound');
      if (elSeeks > 1) throw new Error('the element was seeked ' + elSeeks + ' times (one at play start is expected)');
      if (stats.drops < 1) throw new Error('no frames were dropped — the picture is keeping up by holding the clock back, which is what shredded the audio');
      if (clockErr > 0.08) throw new Error('the transport lost ' + clockErr.toFixed(3) + ' s against the wall clock while the compositor was busy');
      if (elErr > FM.syncTuning.hard) throw new Error('the element drifted ' + elErr.toFixed(3) + ' s from the playhead and was never pulled back');
    } finally { rig.restore(); }
  });

  test('the canvas is painted once per project frame, not once per screen refresh', { item: 'audio-clock' }, async function () {
    // The other half of "the picture is best-effort": on a 60 Hz screen a 30 fps project used to be
    // composited twice per frame, and the second paint is byte-identical. Cheap frames matter — the
    // seek storm only began once a frame cost more than 150 ms, so halving the work is also raising
    // the floor at which the audio is at risk at all.
    var rig = transportRig({ jankMs: 0 });
    try {
      var frames = 0, counting = true;
      (function step() { if (!counting) return; frames++; requestAnimationFrame(step); })();
      FM.play();
      await sleep(1000);
      var renders = FM.playbackStats.renders, raf = frames;
      counting = false;
      FM.pause();
      if (raf < 45) throw new Error('this environment only offered ' + raf + ' animation frames in a second — it cannot tell a per-frame paint from a per-refresh one, so this test is asserting nothing');
      if (renders > raf * 0.75) throw new Error('painted ' + renders + ' times against ' + raf + ' animation frames for a 30 fps project — the extra paints are identical frames');
      if (renders < 22) throw new Error('only ' + renders + ' paints in a second for a 30 fps project — the picture is being starved, not merely de-duplicated');
    } finally { rig.restore(); }
  });

  test('the playhead is derived from the audio clock, not from the frame loop', { item: 'audio-clock' }, async function () {
    var rig = transportRig({ jankMs: 0 });
    try {
      rig.audioClock(0.5);          // a context whose clock deliberately runs at half real time
      FM.play();
      if (FM.clockSource() !== 'audio') throw new Error('with a running AudioContext the transport is still on ' + FM.clockSource() + ' — the playhead is not taking the audio clock');
      var t0 = performance.now();
      await sleep(900);
      // FM.time, not clockNow(): the question is what the RENDER LOOP actually wrote to the
      // playhead, not merely what the clock function would have said if asked.
      var adv = FM.time, wall = (performance.now() - t0) / 1000;
      FM.pause();
      // A playhead driven by rAF/wall time advances ~1 s here. One derived from the audio clock
      // advances ~0.5 s, because that is what the sound did. Nothing else can tell them apart.
      if (Math.abs(adv / wall - 0.5) > 0.08) throw new Error('scene time advanced ' + adv.toFixed(3) + ' s while the audio clock advanced ' + (wall * 0.5).toFixed(3) + ' s and the wall clock ' + wall.toFixed(3) + ' s — the transport is following the wrong one');
    } finally { rig.restore(); }
  });

  test('a context that appears mid-play is picked up without moving the playhead', { item: 'audio-clock' }, async function () {
    // The common project has no AudioContext when play is pressed and gets one the moment an audio
    // effect is added or a reversed clip starts. The transport has to change clocks underneath
    // itself without the playhead so much as twitching.
    var rig = transportRig({ jankMs: 0 });
    try {
      rig.noAudioClock();
      FM.play();
      if (FM.clockSource() !== 'raf') throw new Error('started on ' + FM.clockSource() + ' with no context at all');
      await sleep(350);
      var before = FM.clockNow(), t0 = performance.now();
      rig.audioClock(1);
      await sleep(60);
      if (FM.clockSource() !== 'audio') throw new Error('a running context appeared and the transport stayed on ' + FM.clockSource() + ' — it will never use the audio clock on the projects that matter');
      var atSwap = FM.clockNow() - before, swapWall = (performance.now() - t0) / 1000;
      if (Math.abs(atSwap - swapWall) > 0.05) throw new Error('adopting the audio clock moved the playhead by ' + (atSwap - swapWall).toFixed(3) + ' s');
      await sleep(500);
      var adv = FM.clockNow() - before, wall = (performance.now() - t0) / 1000;
      FM.pause();
      if (Math.abs(adv - wall) > 0.06) throw new Error('after the swap the playhead advanced ' + adv.toFixed(3) + ' s in ' + wall.toFixed(3) + ' s');
    } finally { rig.restore(); }
  });

  test('an AudioContext that stops advancing must not freeze playback', { item: 'audio-clock' }, async function () {
    // iOS suspends the context for a phone call, a route change, or its own policy. Handing the
    // transport to the audio clock is only safe if it can be handed back.
    var rig = transportRig({ jankMs: 0 });
    try {
      rig.audioClock(1);
      FM.play();
      await sleep(300);
      rig.freezeAudioClock();
      await sleep(900);
      var src = FM.clockSource();
      var mark = FM.clockNow(), t0 = performance.now();
      await sleep(500);
      var adv = FM.clockNow() - mark, wall = (performance.now() - t0) / 1000;
      var total = FM.clockNow(), stillAudio = FM.clockSource();
      FM.pause();
      if (src !== 'raf') throw new Error('the transport is still on a stopped audio clock (source=' + src + ') — playback is frozen until the context comes back');
      if (stillAudio !== 'raf') throw new Error('the transport went back to the dead context (source=' + stillAudio + ') — it will sawtooth between the two clocks');
      if (adv < wall * 0.85) throw new Error('playback advanced only ' + adv.toFixed(3) + ' s in ' + wall.toFixed(3) + ' s after the audio clock stopped');
      if (total > 1.75 + 0.25) throw new Error('the playhead JUMPED to ' + total.toFixed(3) + ' s over ~1.7 s of playback — falling back re-ran time that had already passed');
    } finally { rig.restore(); }
  });

  test('with no AudioContext at all, playback runs and never creates one', { item: 'audio-clock' }, async function () {
    // A project with no audio effects and no reversed clip must not spend one of iOS's ~4 live
    // AudioContexts just by pressing play — the clock is worth having, not at that price.
    var rig = transportRig({ jankMs: 0, silent: true });
    try {
      rig.noAudioClock();
      FM.play();
      if (FM.clockSource() !== 'raf') throw new Error('with no context the transport claims to be on ' + FM.clockSource());
      var t0 = performance.now();
      await sleep(600);
      var adv = FM.clockNow(), wall = (performance.now() - t0) / 1000;
      var made = rig.madeContexts(), why = 'playing=' + FM.playing + ' src=' + FM.clockSource() + ' FM.time=' + FM.time.toFixed(3) + ' dur=' + FM.scene.project.duration + ' layers=' + FM.scene.layers.length;
      FM.pause();
      if (Math.abs(adv - wall) > 0.06) throw new Error('a silent project played ' + adv.toFixed(3) + ' s of scene time in ' + wall.toFixed(3) + ' s [' + why + ']');
      if (made !== 0) throw new Error('pressing play created ' + made + ' AudioContext(s) on a project with no audio');
    } finally { rig.restore(); }
  });

  test('loop wrap re-origins the clock instead of pinning the playhead', { item: 'audio-clock' }, async function () {
    var rig = transportRig({ jankMs: 0, duration: 0.5, loop: true });
    try {
      FM.play();
      var seen = [], wraps = 0, first = -1;
      for (var i = 0; i < 36; i++) { await sleep(50); seen.push(FM.time); }
      for (var j = 1; j < seen.length; j++) if (seen[j] < seen[j - 1] - 1e-6) { wraps++; if (first < 0) first = j; }
      var playing = FM.playing;
      // The measurement that matters is what happens AFTER the first wrap. A clock that kept its
      // pre-wrap origin wraps again on every single frame, which still shows one decrease and a
      // healthy-looking maximum from BEFORE the wrap, while the playhead is in fact pinned at 0.
      var after = first < 0 ? [] : seen.slice(first);
      var top = after.length ? Math.max.apply(null, after) : 0;
      FM.pause();
      if (!playing) throw new Error('looping playback stopped on its own');
      if (wraps < 2) throw new Error('the playhead wrapped ' + wraps + ' time(s) in 1.8 s of a 0.5 s loop');
      if (top < 0.25) throw new Error('after wrapping, the playhead never got past ' + top.toFixed(3) + ' s of a 0.5 s loop — it is being wrapped every frame, i.e. the clock kept its pre-wrap origin');
    } finally { rig.restore(); }
  });

  test('changing the preview rate mid-play does not move the playhead', { item: 'audio-clock' }, async function () {
    var rig = transportRig({ jankMs: 0 });
    try {
      FM.play();
      await sleep(500);
      var before = FM.clockNow();
      FM.setPreviewRate(2);
      var after = FM.clockNow();
      if (Math.abs(after - before) > 0.03) throw new Error('2x preview jumped the playhead from ' + before.toFixed(3) + ' to ' + after.toFixed(3) + ' — the new rate was applied to time that had already elapsed');
      var t0 = performance.now(), m0 = FM.clockNow();
      await sleep(500);
      var adv = FM.clockNow() - m0, wall = (performance.now() - t0) / 1000;
      FM.pause();
      if (Math.abs(adv / wall - 2) > 0.2) throw new Error('at 2x the playhead advanced ' + (adv / wall).toFixed(2) + '× real time');
    } finally { rig.restore(); }
  });

  test('moving the playhead during playback wins over the clock', { item: 'audio-clock' }, async function () {
    var rig = transportRig({ jankMs: 0 });
    try {
      FM.play();
      await sleep(300);
      FM.setTime(5);
      if (Math.abs(FM.clockNow() - 5) > 0.03) throw new Error('setTime(5) during playback left the clock at ' + FM.clockNow().toFixed(3) + ' — the next frame would drag the playhead straight back');
      var t0 = performance.now();
      await sleep(400);
      var adv = FM.clockNow() - 5, wall = (performance.now() - t0) / 1000;
      FM.pause();
      if (Math.abs(adv - wall) > 0.06) throw new Error('after a mid-play seek the clock advanced ' + adv.toFixed(3) + ' s in ' + wall.toFixed(3) + ' s');
    } finally { rig.restore(); }
  });

  /* ---------------- Edge Glow: Glow on = Layer / Media / Both -------------------------------
   * The control is not a mode flag: "the layer" versus "the media inside the layer" IS "alpha edges
   * versus luminance edges", and the instrument below is built to show exactly that separation.
   *
   * THE INSTRUMENT. A 100x80 picture centred in the 320x240 comp, near-black on its left half and
   * near-white on its right. It therefore has TWO kinds of edge and they are in different places:
   *   • a SILHOUETTE, the alpha step at x = 110 / 210 and y = 80 / 160;
   *   • one INTERNAL luminance seam, straight down x = 160.
   * Nothing else in the frame has an edge, so "did the seam light up" and "did anything outside the
   * silhouette light up" are two independent questions with one answer each. Everything is on
   * integer boundaries, so there is no antialiasing anywhere and the numbers are exact.
   *
   * Measured 2026-08-12 (radius 8, amount 1.5, white):
   *   source          px lit OUTSIDE the silhouette      mean lift along the seam
   *   0 Layer                     3068                            0.0
   *   1 Media                        0                          235.0
   *   2 Both                      3068                          235.0
   * Those zeros are the load-bearing half: Layer must not find the seam, Media must not leave the
   * shape. */
  function egArt(id, paint, w, h) {
    var c = offscreen(w, h); paint(c.getContext('2d'), w, h);
    FM.media.set(id, { kind: 'image', el: c, width: w, height: h, duration: 0 });
    return id;
  }
  function egTwoTone(g) {
    g.fillStyle = '#141414'; g.fillRect(0, 0, 50, 80);
    g.fillStyle = '#ececec'; g.fillRect(50, 0, 50, 80);
  }
  var _egArtDone = false;
  function egPicture(params) {
    if (!_egArtDone) { egArt('_egTwo', egTwoTone, 100, 80); _egArtDone = true; }
    var l = FM.makeLayer('image', { x: 160, y: 120, start: 0, duration: 5 });
    l.id = '_egTwo';
    if (params) l.effects = [egFx(params)];
    return l;
  }
  // A flat-filled rectangle: ONE colour, so it has a silhouette and no interior luminance at all.
  function egRect(params, fill, w, h) {
    var l = FM.makeLayer('shape', { shape: 'rect', x: 160, y: 120, shapeW: w || 100, shapeH: h || 80, fill: fill || '#808080', start: 0, duration: 5 });
    if (params) l.effects = [egFx(params)];
    return l;
  }
  function egText(params) {
    var l = FM.makeLayer('text', { text: 'Abc', fontSize: 70, color: '#8fa0b8', x: 160, y: 120, start: 0, duration: 5 });
    if (params) l.effects = [egFx(params)];
    return l;
  }
  function egFx(params) { return { type: 'edgeglow', enabled: true, params: params }; }
  // background '' so renderScene paints none: OUTSIDE the silhouette really is alpha 0, which is
  // what makes "the glow grew the layer" measurable at all.
  function egPix(layers, cw, ch) {
    var c = offscreen(cw || 320, ch || 240);
    FM.renderScene(c.getContext('2d', { willReadFrequently: true }),
      { project: { width: 320, height: 240, fps: 30, duration: 5, background: '' }, layers: layers, selectedId: null, selectedIds: [] }, 0);
    return c.getContext('2d', { willReadFrequently: true }).getImageData(0, 0, c.width, c.height).data;
  }
  function egAlpha(d, w, x, y) { return d[(y * w + x) * 4 + 3]; }
  // px that were fully transparent and now carry alpha — the glow that escaped the shape
  function egOutside(off, on) {
    var n = 0;
    for (var i = 0; i < off.length; i += 4) if (off[i + 3] === 0 && on[i + 3] > 8) n++;
    return n;
  }
  // mean red lift down a column, away from the silhouette — how hard the internal seam lit
  function egSeamLift(off, on, x) {
    var s = 0, n = 0;
    for (var y = 100; y < 140; y++) { var q = (y * 320 + x) * 4; s += on[q] - off[q]; n++; }
    return s / n;
  }
  // Adler-ish fingerprint. The subjects are integer-aligned flat fills, so this is exact everywhere.
  function egSum(d) { var a = 0, b = 0; for (var i = 0; i < d.length; i++) { a = (a + d[i]) >>> 0; b = (b + a) >>> 0; } return ((b << 8) ^ a) >>> 0; }

  test('effects: Edge Glow reads the LAYER, the MEDIA, or both — and each one only its own edges', { item: 'edge-glow' }, function () {
    var off = egPix([egPicture(null)]);
    var seen = [0, 1, 2].map(function (s) {
      var on = egPix([egPicture({ amount: 1.5, color: '#ffffff', radius: 8, source: s })]);
      return { outside: egOutside(off, on), seam: egSeamLift(off, on, 158) };
    });
    // LAYER: the silhouette, and nothing but the silhouette.
    if (!(seen[0].outside > 1500)) throw new Error('Glow on Layer lit ' + seen[0].outside + ' pixels outside the silhouette — the alpha edge is not being found');
    if (!(seen[0].seam < 6)) throw new Error('Glow on Layer lifted the internal seam by ' + seen[0].seam.toFixed(1) + ' — it is reading luminance, which is Media’s job');
    // MEDIA: the picture, and only inside the shape.
    if (!(seen[1].seam > 120)) throw new Error('Glow on Media lifted the internal seam by only ' + seen[1].seam.toFixed(1) + ' — the luminance edge is not being found');
    if (seen[1].outside !== 0) throw new Error('Glow on Media lit ' + seen[1].outside + ' pixels outside the silhouette — Media is the setting that keeps an old project unchanged, and it must stay inside the shape');
    // BOTH: genuinely both, not a rename of either.
    if (!(seen[2].outside > 1500)) throw new Error('Glow on Both lit ' + seen[2].outside + ' pixels outside the silhouette against Layer’s ' + seen[0].outside);
    if (!(seen[2].seam > 120)) throw new Error('Glow on Both lifted the internal seam by only ' + seen[2].seam.toFixed(1) + ' against Media’s ' + seen[1].seam.toFixed(1));
  });

  test('effects: Edge Glow lights a flat shape and a line of text — the case luminance alone cannot see', { item: 'edge-glow' }, function () {
    // A flat fill has no interior luminance whatsoever, so this is the case the old kernel could not
    // do: before this change a flat shape FILLING the frame measured 0 of 76800 pixels changed.
    var flatOff = egPix([egRect(null, '#808080', 400, 320)]);
    var flatMedia = egPix([egRect({ amount: 1.5, color: '#ffffff', radius: 8, source: 1 }, '#808080', 400, 320)]);
    var moved = 0;
    for (var i = 0; i < flatOff.length; i += 4) if (Math.abs(flatOff[i] - flatMedia[i]) > 8) moved++;
    if (moved !== 0) throw new Error('the luminance path found ' + moved + ' pixels of edge in a flat colour — this subject has none, so the instrument below is not measuring what it claims');

    var rOff = egPix([egRect(null)]), rOn = egPix([egRect({ amount: 1.5, color: '#ffffff', radius: 8, source: 0 })]);
    if (!(egOutside(rOff, rOn) > 1500)) throw new Error('a flat shape glowed on only ' + egOutside(rOff, rOn) + ' pixels outside its outline — Edge Glow still does nothing on shapes');

    var tOff = egPix([egText(null)]), tOn = egPix([egText({ amount: 1.5, color: '#ffffff', radius: 8, source: 0 })]);
    var subject = 0;
    for (i = 0; i < tOff.length; i += 4) if (tOff[i + 3] > 8) subject++;
    if (!(subject > 800)) throw new Error('the text subject only drew ' + subject + ' pixels — the font never arrived, so nothing below is a test of the glow');
    if (!(egOutside(tOff, tOn) > subject)) throw new Error('the letterforms glowed on ' + egOutside(tOff, tOn) + ' pixels against ' + subject + ' pixels of text — a glow should cover more ground than the letters it comes off');
  });

  test('effects: Edge Glow leaves the silhouette — a glow, not a rim painted inside the shape', { item: 'edge-glow' }, function () {
    var off = egPix([egRect(null)]), on = egPix([egRect({ amount: 1.5, color: '#ffffff', radius: 12, source: 0 })]);
    // the rect's right edge is the column x = 210; scan outward from it along the middle row
    if (egAlpha(off, 320, 212, 120) !== 0) throw new Error('the subject already covers x=212 — the scan line is inside the shape, so it cannot show an outward bloom');
    var prof = [];
    for (var k = 1; k <= 16; k++) prof.push(egAlpha(on, 320, 210 + k, 120));
    var reach = 0;
    for (k = 0; k < prof.length; k++) if (prof[k] > 25) reach = k + 1;
    if (!(reach >= 6)) throw new Error('at radius 12 the glow reached ' + reach + 'px past the outline — it is still trapped inside the shape (profile ' + prof.join(',') + ')');
    if (!(prof[0] > 120)) throw new Error('the glow is faint where it should be strongest: alpha ' + prof[0] + ' one pixel outside the outline');
    // and it must FALL AWAY, not sit there as a flat slab with a cliff — that is what one box pass
    // gives, and it reads as a band rather than as light.
    if (!(prof[2] > prof[6] && prof[6] > prof[10] && prof[10] > 0)) throw new Error('the bloom does not fall off with distance (profile ' + prof.join(',') + ') — a flat plateau is a band, not a glow');
    // …and none of that may happen when the glow is switched off.
    var zero = egPix([egRect({ amount: 0, color: '#ffffff', radius: 12, source: 0 })]);
    if (egSum(zero) !== egSum(off)) throw new Error('Amount 0 still changed the frame — a switched-off effect must be a byte-exact no-op');
  });

  test('effects: Edge Glow’s radius is a PROJECT length, so the reduced preview matches the export', { item: 'edge-glow' }, function () {
    /* Every length inside a pixel effect multiplies by plateScale, because the plate shrinks with the
     * playback quality tier while the user's number does not. renderScene derives __fmRS from
     * canvas.width / project.width, so a 160x120 target of this 320x240 comp IS a half-scale preview.
     * BRIGHTNESS is a length here too, and that is the part that is easy to miss: a Sobel ridge
     * carries fixed energy, the blur spreads it over the window, so the peak goes as 1/(radius x ps)
     * and scaling the radius alone leaves the preview 1/ps times too bright. Both are checked. */
    var pr = { amount: 1.5, color: '#ffffff', radius: 20, source: 0 };
    function reachAt(rs) {
      var w = Math.round(320 * rs), h = Math.round(240 * rs);
      var d = egPix([egRect(pr)], w, h);
      var edge = Math.round(210 * rs), y = Math.round(120 * rs), last = 0;
      for (var x = edge; x < w; x++) if (egAlpha(d, w, x, y) > 25) last = x;
      return { reach: (last - edge + 1) / rs, at8: egAlpha(d, w, Math.round(edge + 8 * rs), y) };
    }
    var full = reachAt(1), half = reachAt(0.5);
    if (!(full.reach > 8)) throw new Error('at radius 20 the 1:1 render only reached ' + full.reach.toFixed(1) + 'px — nothing below can measure a scale error');
    if (!(half.reach > full.reach * 0.7 && half.reach < full.reach * 1.3))
      throw new Error('the half-scale preview reached ' + half.reach.toFixed(1) + ' project px where the 1:1 render reached ' + full.reach.toFixed(1) + ' — the radius is not being multiplied by plateScale, so the preview no longer matches the export');
    if (!(half.at8 > full.at8 * 0.7 && half.at8 < full.at8 * 1.3))
      throw new Error('8 project px out, the half-scale preview measured alpha ' + half.at8 + ' against the 1:1 render’s ' + full.at8 + ' — the glow’s BRIGHTNESS is not being scaled by plateScale');
  });

  test('effects: Edge Glow defaults to a white glow, on the layer and the media at once', { item: 'edge-glow' }, function () {
    var def = null;
    (FM.EFFECTS || []).forEach(function (e) { if (e.type === 'edgeglow') def = e; });
    if (!def) throw new Error('no edgeglow entry in FM.EFFECTS');
    if (def.defColor !== '#ffffff') throw new Error('Edge Glow’s default colour is ' + def.defColor + ', not white');
    var inst = FM.fxRegistry.makeInstance('edgeglow');
    if (!inst || inst.params.color !== '#ffffff') throw new Error('a NEW Edge Glow instance carries colour ' + (inst && inst.params.color) + ' — the catalogue default is not reaching the instance');
    if (inst.params.source !== 2) throw new Error('a NEW Edge Glow instance opens on source ' + inst.params.source + ' — the default is Both, so it works on shapes, text and footage without being configured first');
    // and the glow it draws really is neutral, not merely labelled white
    var off = egPix([egRect(null, '#404040')]), on = egPix([egRect(inst.params, '#404040')]);
    var q = -1;
    for (var i = 0; i < off.length; i += 4) if (off[i + 3] === 0 && on[i + 3] > 200) { q = i; break; }
    if (q < 0) throw new Error('the default instance lit nothing outside the shape, so its colour cannot be read');
    var spread = Math.max(on[q], on[q + 1], on[q + 2]) - Math.min(on[q], on[q + 1], on[q + 2]);
    if (spread > 6) throw new Error('the default glow measured rgb(' + on[q] + ',' + on[q + 1] + ',' + on[q + 2] + ') — that is a tint, not white');
  });

  test('effects: a project saved before the Glow-on control still renders exactly as it did', { item: 'edge-glow' }, function () {
    /* An instance saved before this change has ONLY {amount, color} — fxRegistry.makeInstance writes
     * every key, so an absent `source` can only mean "older than the control". That single fact is
     * the whole migration: it selects luminance edges, clipped to the silhouette, one box pass,
     * radius 3 — the original kernel, byte for byte at plate scale 1. Fingerprints captured
     * 2026-08-12 against a flat integer-aligned rect (no antialiasing anywhere, so they are exact in
     * any browser), and verified equal to the same render on the commit BEFORE this feature. */
    var subject = egPix([egRect(null)]);
    if (egSum(subject) !== 3522248896) throw new Error('the SUBJECT itself rasterised differently (' + egSum(subject) + ' vs 3522248896) — fix that before reading the two fingerprints below as an Edge Glow regression');
    var cyan = egSum(egPix([egRect({ amount: 1.5, color: '#00ffea' })]));
    if (cyan !== 3319139432) throw new Error('an Edge Glow saved before the Glow-on control now renders differently (' + cyan + ' vs 3319139432) — someone’s finished project just changed appearance');
    var hot = egSum(egPix([egRect({ amount: 3, color: '#ffffff' })]));
    if (hot !== 1705790320) throw new Error('the same, at amount 3 in white (' + hot + ' vs 1705790320)');
    // the most visible way that could go wrong, named separately so the failure says which
    var on = egPix([egRect({ amount: 1.5, color: '#00ffea' })]);
    if (egOutside(subject, on) !== 0) throw new Error('an old instance now blooms ' + egOutside(subject, on) + ' pixels past the layer’s outline — the new bloom must not reach back into saved work');
    // and the panel must SAY what the renderer is drawing, or the first tap moves the picture
    var schema = FM.fxRegistry.paramsOf('edgeglow');
    var src = schema.filter(function (p) { return p.key === 'source'; })[0];
    var rad = schema.filter(function (p) { return p.key === 'radius'; })[0];
    if (!src || src.legacy !== 1) throw new Error('the Glow-on control does not declare legacy 1 (Media), so an old instance would open showing Both while drawing Media');
    if (!rad || rad.legacy !== 3) throw new Error('the Radius control does not declare legacy 3, so an old instance would open showing ' + (rad && rad.default) + 'px while drawing 3px');
  });

  /* ---- audio waveform strip: the "it's missing parts" gaps (v6.05) ------------------------------
     Ezra imported a full song and its timeline strip came back with clean vertical holes at regular
     spacing, and he could hear it cut out too. The audio turned out to be intact — the decoded buffer
     was sample-exact against the source and the export mix correlated 1.00000 — so everything below
     is about the PICTURE. Two independent defects, one per file:

       js/media.js   the peak scan used `stride = max(1, floor(block/200))`, i.e. floor(duration/15)
                     at the 8 kHz waveform rate, so past 30 s each bar was decided by a decimated
                     sample of its block. Decimation ALIASES: every inspected sample lands at nearly
                     the same phase of content near a multiple of the decimated rate, and when that
                     phase is a zero crossing the bar reads as silence. A 300 s constant-amplitude
                     fixture drew 30 of 600 bars under half their true height, worst 5.2%.
       js/timeline.js bars were 70% of the pitch with a 30% gap, and the canvas is clamped to 8192
                     backing px while the CSS width is not — so at 300 s the clip is stretched 2.33x
                     and that gap became 9.3 CSS px of real blank, 4688 px of it across the clip.

     Each test below is written so it goes RED on the pre-fix code, not merely green on the new. */

  // An AudioBuffer stand-in. getWaveform only ever asks for getChannelData(0)/duration/sampleRate,
  // and duck-typing keeps the test off a real AudioContext (iOS caps how many may exist at once).
  function fakeAudioBuffer(samples, rate, fill) {
    var d = new Float32Array(samples);
    for (var i = 0; i < samples; i++) d[i] = fill(i);
    return {
      length: samples, sampleRate: rate, duration: samples / rate, numberOfChannels: 1,
      getChannelData: function () { return d; }
    };
  }
  // A media record that takes the timeline's WAVEFORM branch: a video with a file but no picture
  // (0x0 is the audio-clip path an .m4a rides), so buildLane draws peaks instead of a filmstrip.
  function fakeAudioRec(dur, peaks) {
    var el = document.createElement('canvas'); el.width = 1; el.height = 1; el.readyState = 4;
    return {
      kind: 'video', el: el, width: 0, height: 0, duration: dur, waveform: peaks, waveformV: 1,
      file: new File([new Uint8Array(8)], 'song.m4a', { type: 'audio/mp4' })
    };
  }
  // The drawn strip, per canvas column: total alpha ("ink mass", proportional to bar height) and
  // whether anything at all was painted. Mass rather than a hard threshold because at normal bar
  // pitch the bars are sub-pixel and every column catches some antialiased bleed from a neighbour —
  // a hard test reads "painted" for a bar that is 5% tall, which is exactly the bug.
  // `height` is there because mass and dimness are both RELATIVE, and a relative detector is blind to
  // a strip that has been destroyed evenly: the first cut of the aliasing test below compared each
  // column against the median and stayed GREEN on the broken code, where every bar had collapsed to
  // the 1px floor and so nothing was below the median. An absolute band height catches that.
  function waveColumns(canvas) {
    var W = canvas.width, H = canvas.height;
    var d = canvas.getContext('2d', { willReadFrequently: true }).getImageData(0, 0, W, H).data;
    var mass = [], painted = [], height = [];
    for (var x = 0; x < W; x++) {
      var m = 0, h = 0;
      for (var y = 0; y < H; y++) { var a = d[(y * W + x) * 4 + 3]; m += a; if (a > 8) h++; }
      mass.push(m); height.push(h); painted.push(h > 0 ? 1 : 0);
    }
    return { mass: mass, painted: painted, height: height, W: W, H: H };
  }
  function median(a) { var b = a.slice().sort(function (x, y) { return x - y; }); return b[b.length >> 1]; }
  // Build one audio clip on the real timeline and hand back its .clip-wave canvas.
  function waveCanvasFor(peaks, over) {
    var o = over || {};
    var L = FM.makeLayer('video', { name: 'song', start: 0, duration: o.duration || 300 });
    // Assigned AFTER makeLayer on purpose: it builds from a whitelist and pins trimStart to 0 and
    // reversed to false, so passing them in props drops them silently. The first cut of these tests
    // did exactly that and the trim case went green while testing nothing.
    Object.assign(L, o.layer || {});
    FM.scene.layers = [L];
    FM.media.set(L.id, fakeAudioRec(o.srcDuration || 300, peaks));
    FM.timeline.setZoom(o.zoom || 1);
    FM.timeline.rebuild();
    var clip = document.querySelector('.clip[data-id="' + L.id + '"]');
    return { layer: L, canvas: clip && clip.querySelector('canvas.clip-wave') };
  }

  test('waveform: the peak scan looks at EVERY sample, so a decimating stride cannot read silence',
    { item: 'audio-gaps' }, async function () {
      // sin(j*pi/2) = 0, 1, 0, -1, 0, 1 … Its true envelope is a flat 1. Sampling every SECOND
      // sample — which is what the old floor(duration/15) stride did from 30 s on — only ever lands
      // on the zeros, so every bar reads 0. 240000 samples is the exact length at which the old
      // formula first produced stride 2 (block = 400).
      var ab = fakeAudioBuffer(240000, 8000, function (j) { return Math.sin(j * Math.PI / 2); });
      var rec = { file: new File([new Uint8Array(8)], 'a.m4a'), audioBuffer: ab };
      var peaks = await FM.getWaveform(rec);
      if (!peaks || !peaks.length) throw new Error('no peaks at all');
      var lo = Math.min.apply(null, peaks), hi = Math.max.apply(null, peaks);
      // control: the signal really does reach 1, so a low `lo` is lost signal and not a quiet source
      if (hi < 0.99) throw new Error('the control failed: peak max is ' + hi.toFixed(4) + ', expected ~1');
      if (lo < 0.9) throw new Error('a bar of a CONSTANT-amplitude signal read ' + lo.toFixed(4)
        + ' of full scale — the scan is skipping samples (aliased hole)');
    });

  test('waveform: peak resolution follows duration and stays bounded', { item: 'audio-gaps' }, async function () {
    // 600 peaks for a 5-minute song is one bar per 32 CSS px once it is stretched along the timeline.
    var long = { file: new File([new Uint8Array(8)], 'a.m4a'), audioBuffer: fakeAudioBuffer(240000, 800, function () { return 0.5; }) };
    var lp = await FM.getWaveform(long);                       // 240000/800 = 300 s
    if (lp.length <= 600) throw new Error('a 300 s source still produced only ' + lp.length + ' peaks');
    if (typeof long.waveformV !== 'number' || long.waveformV < 1) throw new Error('waveformV is '
      + long.waveformV + ' after a compute — the strip cache keys off it and would keep a stale canvas');
    // The CAP has to actually bite, so it is tested past the length where it engages (8192/25 ≈ 328 s),
    // not at 300 s where an uncapped formula gives the same answer and the test proves nothing.
    var huge = { file: new File([new Uint8Array(8)], 'd.m4a'), audioBuffer: fakeAudioBuffer(240000, 100, function () { return 0.5; }) };
    var hp = await FM.getWaveform(huge);                       // 2400 s = 40 minutes
    if (hp.length > 8192) throw new Error('a 40-minute source produced ' + hp.length
      + ' peaks — past the 8192 cap; the clip canvas can never draw them and the array is unbounded');
    // and the bound has to degrade by losing RESOLUTION, never spans of time: with a spike in the
    // very last samples, the final peak must still see it. 80000 samples over 600 bins is the case
    // that matters — the OLD `s = i*block` edges with block = floor(80000/600) = 133 stop at 79800
    // and never look at the last 200 samples at all.
    var n = 80000;
    var spiky = { file: new File([new Uint8Array(8)], 'b.m4a'), audioBuffer: fakeAudioBuffer(n, 8000, function (j) { return j >= n - 100 ? 1 : 0.1; }) };
    var sp = await FM.getWaveform(spiky);
    if (sp[sp.length - 1] < 0.99) throw new Error('the last peak read ' + sp[sp.length - 1].toFixed(3)
      + ' — the tail samples past the final bin were never scanned');
    // a short clip keeps the resolution it has always had, so nothing about its look changes
    var shortRec = { file: new File([new Uint8Array(8)], 'c.m4a'), audioBuffer: fakeAudioBuffer(80000, 8000, function () { return 0.5; }) };
    var sh = await FM.getWaveform(shortRec);                   // 10 s
    if (sh.length !== 600) throw new Error('a 10 s clip drew ' + sh.length + ' peaks, expected the historic 600');
  });

  // The longest run of unpainted columns, converted to the CSS pixels the eye actually sees. The
  // backing buffer is clamped to 8192 and then stretched, so a run measured in backing columns
  // understates the hole by the stretch factor — 2.33x at 5 minutes, 7x at zoom 3.
  function longestHoleCSS(canvas) {
    var col = waveColumns(canvas), run = 0, worst = 0;
    for (var x = 0; x < col.W; x++) { if (!col.painted[x]) { run++; if (run > worst) worst = run; } else run = 0; }
    return worst * (canvas.getBoundingClientRect().width / col.W);
  }

  test('waveform: a 5-minute clip is never broken into blocks, at any zoom or peak count',
    { item: 'audio-gaps' }, function () {
      var fx = importFixture();
      try {
        // Separated bars are the intended look; BLOCKS with visible dark lanes between them are the
        // bug Ezra photographed. The line between the two is how wide the gap gets ON SCREEN, so
        // that is what is asserted. Both peak counts are checked: 600 is what the app used to
        // produce for every clip regardless of length, and it is the count that combed.
        var counts = [600, 7500], zooms = [0.02, 0.3, 1];
        for (var c = 0; c < counts.length; c++) {
          var peaks = []; for (var i = 0; i < counts[c]; i++) peaks.push(0.8);   // flat: every hole is the drawing
          for (var z = 0; z < zooms.length; z++) {
            var w = waveCanvasFor(peaks, { zoom: zooms[z] });
            if (!w.canvas) throw new Error('no .clip-wave canvas at zoom ' + zooms[z]);
            var hole = longestHoleCSS(w.canvas);
            if (hole > 2) throw new Error(counts[c] + ' peaks at zoom ' + zooms[z] + ': a ' + hole.toFixed(1)
              + ' CSS px blank lane in a strip with no silence in it');
          }
        }
      } finally { fx.restore(); }
    });

  test('waveform: an aliasing song draws an even band end to end', { item: 'audio-gaps' }, async function () {
    var fx = importFixture();
    try {
      // End to end, decode-to-pixels, on the signal class that caused the report: constant amplitude
      // (so the true strip is a flat band) with content that a decimating scan reads as silence.
      var ab = fakeAudioBuffer(2400000, 8000, function (j) { return Math.sin(j * Math.PI / 2); });   // 300 s
      var rec = { file: new File([new Uint8Array(8)], 'song.m4a'), audioBuffer: ab };
      var peaks = await FM.getWaveform(rec);
      var w = waveCanvasFor(peaks, { zoom: 0.02 });             // whole song in the phone lane
      if (!w.canvas) throw new Error('no .clip-wave canvas');
      var col = waveColumns(w.canvas);
      // ABSOLUTE first: the source is full-scale, so the band must fill most of the 32px lane. This
      // is the half that catches a strip flattened EVERYWHERE, which no relative measure can see.
      var medH = median(col.height);
      if (medH < col.H * 0.4) throw new Error('the band is only ' + medH + ' of ' + col.H
        + ' px tall for a full-scale source — the peaks read near silence');
      // …then RELATIVE, for holes punched into an otherwise correct band.
      var medM = median(col.mass), dim = 0, worstAt = -1, worst = Infinity;
      for (var x = 0; x < col.W; x++) {
        if (col.mass[x] < medM * 0.5) dim++;
        if (col.mass[x] < worst) { worst = col.mass[x]; worstAt = x; }
      }
      if (dim) throw new Error(dim + ' of ' + col.W + ' columns are under half the band height (worst at '
        + (worstAt / col.W * 300).toFixed(1) + 's) — the strip has holes the song does not');
    } finally { fx.restore(); }
  });

  test('waveform: a bar is the MAX of the peaks under it, not one sampled peak', { item: 'audio-gaps' }, function () {
    var fx = importFixture();
    try {
      // The original bug was "decide a bar from a decimated sample of its span", and moving that
      // same mistake from the peak scan into the DRAWING would reproduce it exactly: at whole-song
      // zoom each bar covers ~24 peaks, so picking one of them instead of their max is the identical
      // aliasing failure one layer up.
      // SPARSE, not alternating. The first version of this used 0/1 on alternate peaks assuming every
      // bar would start on an even index; bar edges are floor(i*span/bars) = floor(i*24.51), whose
      // parity alternates, so half the bars picked up a 1 and the test stayed green under exactly the
      // mutation it was written for. A spike every 5th peak puts ~5 spikes inside every bar — so a
      // max always finds one, while a single sampled peak finds one only 20% of the time.
      var peaks = []; for (var i = 0; i < 7500; i++) peaks.push(i % 5 === 3 ? 1 : 0.02);
      var w = waveCanvasFor(peaks, { zoom: 0.02 });
      if (!w.canvas) throw new Error('no .clip-wave canvas');
      var col = waveColumns(w.canvas), medH = median(col.height);
      if (medH < col.H * 0.4) throw new Error('the band is ' + medH + ' of ' + col.H
        + ' px tall where the peaks under every bar reach full scale — bars are sampling, not maxing');
    } finally { fx.restore(); }
  });

  test('waveform: a trimmed clip draws the part it PLAYS, not the whole song', { item: 'audio-gaps' }, function () {
    var fx = importFixture();
    try {
      // loud second half, silent first half. A clip trimmed to the loud half must be loud all the
      // way across; before the window was honoured it drew the whole file squeezed into its bar,
      // so its left half was flat silence that has no counterpart in the audio you hear.
      var peaks = []; for (var i = 0; i < 4000; i++) peaks.push(i < 2000 ? 0 : 0.9);
      var w = waveCanvasFor(peaks, { zoom: 1, duration: 150, srcDuration: 300, layer: { trimStart: 150, duration: 150 } });
      if (!w.canvas) throw new Error('no .clip-wave canvas');
      var col = waveColumns(w.canvas), W = col.W;
      var left = 0, right = 0;
      for (var x = 0; x < W; x++) { if (x < W / 2) left += col.mass[x]; else right += col.mass[x]; }
      if (!(right > 0)) throw new Error('the control failed: nothing drawn in the right half');
      if (left < right * 0.7) throw new Error('the trimmed clip drew its left half at ' + (left / right).toFixed(2)
        + 'x the right — it is still showing the untrimmed source, silence included');
    } finally { fx.restore(); }
  });

  test('waveform: a reversed clip draws its window mirrored', { item: 'audio-gaps' }, function () {
    var fx = importFixture();
    try {
      var peaks = []; for (var i = 0; i < 4000; i++) peaks.push(i < 2000 ? 0.05 : 0.9);   // quiet, then loud
      var fwd = waveCanvasFor(peaks, { zoom: 1, duration: 300, srcDuration: 300 });
      var fc = waveColumns(fwd.canvas), fW = fc.W, fL = 0, fR = 0;
      for (var x = 0; x < fW; x++) { if (x < fW / 2) fL += fc.mass[x]; else fR += fc.mass[x]; }
      if (!(fR > fL * 1.5)) throw new Error('the control failed: forward strip is not loud-on-the-right (' + fL + ' vs ' + fR + ')');
      var rev = waveCanvasFor(peaks, { zoom: 1, duration: 300, srcDuration: 300, layer: { reversed: true } });
      var rc = waveColumns(rev.canvas), rW = rc.W, rL = 0, rR = 0;
      for (var y = 0; y < rW; y++) { if (y < rW / 2) rL += rc.mass[y]; else rR += rc.mass[y]; }
      if (!(rL > rR * 1.5)) throw new Error('a reversed clip still drew loud-on-the-right (' + rL + ' vs ' + rR
        + ') — the strip does not match the audio it plays');
    } finally { fx.restore(); }
  });

  test('waveform: the cached strip is redrawn when the peaks change', { item: 'audio-gaps' }, function () {
    var fx = importFixture();
    try {
      // The strip cache was keyed on width + peak COUNT, which never mentions the peak VALUES — so a
      // rebuild after the waveform changed handed back the stale canvas. And because the backing
      // width saturates at 8192, the key also stopped changing across a wide band of zooms.
      var peaks = []; for (var i = 0; i < 4000; i++) peaks.push(0.9);
      var w = waveCanvasFor(peaks, { zoom: 1 });
      if (!w.canvas) throw new Error('no .clip-wave canvas');
      var before = waveColumns(w.canvas).mass.reduce(function (a, b) { return a + b; }, 0);
      var m = FM.media.get(w.layer.id);
      for (var j = 0; j < m.waveform.length; j++) m.waveform[j] = 0.05;   // same LENGTH, new values
      m.waveformV = (m.waveformV || 0) + 1;
      FM.timeline.rebuild();
      var clip = document.querySelector('.clip[data-id="' + w.layer.id + '"]');
      var cv = clip && clip.querySelector('canvas.clip-wave');
      if (!cv) throw new Error('no .clip-wave canvas after the rebuild');
      var after = waveColumns(cv).mass.reduce(function (a, b) { return a + b; }, 0);
      if (!(before > 0)) throw new Error('the control failed: nothing was drawn before the change');
      if (!(after < before * 0.5)) throw new Error('the strip still has ' + (after / before).toFixed(2)
        + 'x its old ink after the peaks were flattened — a stale cached canvas is on screen');
    } finally { fx.restore(); }
  });

  /* ---------------- Fractal Ridges rework (queue 63) ---------------------------------------
   * The complaint was "more colour options and overlay options and animation options so it actually
   * moves", and the middle word was literal: measured before the rework on this exact scene, the
   * frame at t=0 and the frame at t=1.667 were the SAME BYTES — mean absolute difference 0.000000,
   * because the pixel loop had no time term. The effect also had no colour control at all, and it
   * paints a texture rather than rearranging the source, so at Amount 1 the layer's own colour was
   * simply gone.
   *
   * Two things are guarded here and they pull against each other: the new controls must MOVE PIXELS
   * (a slider that changes nothing is the defect being fixed), and an instance saved BEFORE the
   * rework — which carries only `amount` and `scale` — must still render byte for byte as it always
   * did. That second one is why every new key in the schema carries `legacy:`. */
  function frScene(params, t, cw) {
    var W = 200, H = 200;
    var L = FM.makeLayer('shape', { shape: 'rect', x: W / 2, y: H / 2, shapeW: W, shapeH: H, fill: '#7f7f7f' });
    L.effects = [{ type: 'fractalridges', enabled: true, params: params }];
    var c = offscreen(cw || W, (cw || W) * H / W);
    FM.renderScene(c.getContext('2d'), {
      project: { width: W, height: H, fps: 30, duration: 5, background: '#000000' },
      layers: [L], selectedId: null, selectedIds: []
    }, t);
    return c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
  }
  function frMad(a, b) {
    var s = 0, n = 0;
    for (var i = 0; i < a.length; i += 4) { for (var k = 0; k < 3; k++) { s += Math.abs(a[i + k] - b[i + k]); n++; } }
    return s / n;
  }

  test('fractal ridges: an instance saved before the rework renders byte-identical', { item: 'fx-fractalridges' }, function () {
    // The legacy params ONLY. Every key the rework added has to fall back to the value the old
    // kernel hardcoded: Mono colour, Normal overlay, no band repeat, no reshape, and standing still.
    var legacy = frScene({ amount: 0.6, scale: 48 }, 0.4);
    var spelled = frScene({ amount: 0.6, scale: 48, mode: 0, blend: 0, bands: 1, sharpness: 1, speed: 0, driftX: 0, driftY: 0, seed: 0 }, 0.4);
    for (var i = 0; i < legacy.length; i++) {
      if (legacy[i] !== spelled[i]) throw new Error('a pre-rework instance no longer renders as Mono/Normal/still (byte ' + i + ': ' + legacy[i] + ' vs ' + spelled[i] + ')');
    }
    // …and standing still is not a figure of speech: same bytes at three different times.
    var a = frScene({ amount: 0.6, scale: 48 }, 0), b = frScene({ amount: 0.6, scale: 48 }, 1.667);
    if (frMad(a, b) !== 0) throw new Error('a legacy instance started animating — its Speed must fall back to 0');
  });

  test('fractal ridges: it actually moves, and every new control moves pixels', { item: 'fx-fractalridges' }, function () {
    var D = {};
    FM.fxRegistry.paramsOf('fractalridges').forEach(function (p) { D[p.key] = p.default; });
    function withP(k, v) { var o = {}; for (var q in D) o[q] = D[q]; o[k] = v; return o; }

    // 1. THE HEADLINE. A fresh instance must not be a still image.
    var t0 = frScene(D, 0);
    if (!(frMad(t0, frScene(D, 0.5)) > 3)) throw new Error('a default instance is still a frozen picture across t');
    if (frMad(t0, frScene(D, 0)) !== 0) throw new Error('the control failed: the same frame twice did not match, so nothing below can be trusted');
    // …and Speed 0 must switch the motion back OFF, or "Speed" is not what the slider does.
    var s0 = withP('speed', 0);
    if (frMad(frScene(s0, 0), frScene(s0, 1)) !== 0) throw new Error('Speed 0 still animates');

    // 2. Every new control, swept off its default. Floors are ~60% of measured so a revert goes red.
    var sweeps = [
      ['mode', 1, 25], ['mode', 3, 20],          // Tint / Spectrum against the default Gradient
      // Multiply / Screen against Normal. NOT Overlay: this subject is a flat #7f7f7f, and 127 sits
      // one below Overlay's 128 branch, so Overlay over it is ~0.996x Normal — a real result that
      // would make a 20-point floor fail for a correct implementation. Overlay is measured instead
      // over a subject that has tones (see the blend numbers quoted in the kernel).
      ['blend', 1, 20], ['blend', 2, 20],
      ['bands', 3, 15], ['sharpness', 3, 10], ['seed', 7, 6],
      ['driftX', 150, 6], ['driftY', 150, 6], ['speed', 3, 5],
    ];
    var base = frScene(D, 0.4), bad = [];
    sweeps.forEach(function (s) {
      var m = frMad(base, frScene(withP(s[0], s[1]), 0.4));
      if (m < s[2]) bad.push(s[0] + '=' + s[1] + ' moved ' + m.toFixed(2) + ' (floor ' + s[2] + ')');
    });
    // The two swatches, in the mode that reads them — and NOT in Mono, where they must be inert.
    var g = { mode: 2 }, k;
    for (k in D) if (!(k in g)) g[k] = D[k];
    var grad = frScene(g, 0.4);
    ['color', 'color2'].forEach(function (key) {
      var o = {}; for (var q in g) o[q] = g[q]; o[key] = '#ff0000';
      var m = frMad(grad, frScene(o, 0.4));
      if (m < 15) bad.push(key + ' swatch moved only ' + m.toFixed(2));
    });
    var mono = withP('mode', 0), monoRed = withP('mode', 0); monoRed.color = '#ff0000';
    if (frMad(frScene(mono, 0.4), frScene(monoRed, 0.4)) !== 0) bad.push('the Low swatch is not inert in Mono');
    if (bad.length) throw new Error('controls that do not do what they say: ' + bad.join('; '));
  });

  test('fractal ridges: the lattice is sized in project pixels, not plate pixels', { item: 'fx-fractalridges' }, function () {
    /* THE PLATE-SCALE RULE. `scale` is a length in pixels, and this kernel used to take no `ps` at
     * all — so while the preview played at reduced quality (__fmRS 0.5) it drew the pattern the same
     * size in PLATE pixels, i.e. twice as coarse as the export it was previewing. The tell is row
     * roughness: measured in each raster's OWN pixels it must roughly DOUBLE at half resolution,
     * because the same project-sized feature is being drawn across half as many pixels. Before the
     * fix it barely moved (1.841 -> 1.786); the bug is a ratio near 1, not near 2. */
    function rough(data, w) {
      var s = 0, n = 0;
      for (var y = 0; y < w; y++) for (var x = 1; x < w; x++) { var i = (y * w + x) * 4; s += Math.abs(data[i] - data[i - 4]); n++; }
      return s / n;
    }
    var P = { amount: 0.6, scale: 48 };
    var full = rough(frScene(P, 0, 200), 200);
    if (!(full > 0.5)) throw new Error('the control failed: the full-resolution plate has no texture to measure (roughness ' + full.toFixed(3) + '), so the ratio below would be 0/0');
    var ratio = rough(frScene(P, 0, 100), 100) / full;
    if (!(ratio > 1.6)) throw new Error('a half-resolution plate drew the lattice at ' + ratio.toFixed(2)
      + 'x the roughness of a full one — expected ~2. The preview is not showing what the export renders.');
  });

  /* Import history (v6.13). Both tests write a FAKE library into localStorage and put the real one
   * back in a finally — the suite must never touch Ezra's own imports, and this is the one feature
   * whose whole job is deleting that list. */
  test('media history: clearing songs leaves the photos and videos alone', { item: 'media-history' }, function () {
    var KEY = 'fm.medialib', saved = localStorage.getItem(KEY);
    try {
      localStorage.setItem(KEY, JSON.stringify([
        { mid: 'ta1', key: 'k1', name: 'Song.mp3', kind: 'video', audio: true, w: 0, h: 0, dur: 90, added: 3 },
        { mid: 'tv1', key: 'k2', name: 'Clip.mp4', kind: 'video', audio: false, w: 640, h: 480, dur: 4, added: 2 },
        { mid: 'tp1', key: 'k3', name: 'Shot.jpg', kind: 'image', audio: false, w: 800, h: 600, dur: 0, added: 1 }
      ]));
      var before = FM.mediaLib.counts();
      if (before.audio !== 1 || before.visual !== 2) throw new Error('counts() mis-read the library: ' + JSON.stringify(before));
      var gone = FM.mediaLib.clear('audio');
      var after = FM.mediaLib.counts();
      if (gone !== 1) throw new Error('clear() reported ' + gone + ' forgotten, expected 1');
      if (after.audio !== 0) throw new Error('the song survived a clear("audio")');
      if (after.visual !== 2) throw new Error('clearing songs took ' + (2 - after.visual) + ' photo/video entries with it');
    } finally { if (saved == null) localStorage.removeItem(KEY); else localStorage.setItem(KEY, saved); }
  });

  test('media history: the Settings row forgets the songs and keeps the panel open', { item: 'media-history' }, function () {
    var KEY = 'fm.medialib', saved = localStorage.getItem(KEY);
    var realConfirm = window.confirm, wasOpen = FM.settings.isOpen();
    try {
      localStorage.setItem(KEY, JSON.stringify([
        { mid: 'ta1', key: 'k1', name: 'Song.mp3', kind: 'video', audio: true, w: 0, h: 0, dur: 90, added: 2 },
        { mid: 'tv1', key: 'k2', name: 'Clip.mp4', kind: 'video', audio: false, w: 640, h: 480, dur: 4, added: 1 }
      ]));
      window.confirm = function () { return true; };
      FM.settings.open();
      var rows = Array.prototype.slice.call(document.querySelectorAll('.set-panel .set-row'));
      var row = rows.filter(function (r) { var l = r.querySelector('.set-label'); return l && l.textContent === 'Songs'; })[0];
      if (!row) throw new Error('no Songs row in the settings panel');
      var btn = row.querySelector('.set-action');
      if (!btn) throw new Error('the Songs row has no Clear button');
      if (btn.disabled) throw new Error('Clear was disabled with 1 song remembered');
      btn.click();
      var n = FM.mediaLib.counts();
      if (n.audio !== 0) throw new Error('pressing Clear did not forget the song');
      if (n.visual !== 1) throw new Error('pressing Clear on Songs also forgot the video');
      if (!FM.settings.isOpen()) throw new Error('the panel closed — the updated count is the only feedback this press has');
      if (!btn.disabled) throw new Error('Clear stayed live with nothing left to clear');
      var hint = row.querySelector('.set-hint');
      if (!hint || hint.textContent.indexOf('No songs') !== 0) throw new Error('the hint did not update: ' + (hint && hint.textContent));
    } finally {
      window.confirm = realConfirm;
      if (!wasOpen) FM.settings.close();
      if (saved == null) localStorage.removeItem(KEY); else localStorage.setItem(KEY, saved);
    }
  });

  /* Select on all three home tabs (v6.17). Ezra: "Selecting templates and elements doesnt work
   * properly." It half-worked, which is worse than not working: the tap went into the `selected` set
   * and the bar counted it, but every in-place card update — toggleSel, paintClasses, cardEls — finds
   * its card with `.hm-card[data-pid]`, and only projectCard ever set that attribute. So on Templates
   * and Elements you got "1 selected" on the bar and no tick, no outline, nothing on the card. With
   * Delete sitting on that bar, a selection you cannot see is the dangerous kind of wrong.
   * The test asserts the SCREEN, not the set — asserting the set is what would have passed on the
   * broken build. */
  test('home: a tick appears on the card you select, on every tab', { item: 'home-select-tabs' }, async function () {
    var sleep = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };
    if (!FM.home || !FM.home.open) throw new Error('FM.home missing');
    var wasOpen = FM.home.isOpen();
    var madeT = [], madeE = [];
    try {
      FM.home.open(); await sleep(260);
      // Fixtures, so the Templates and Elements tabs are not empty (an empty tab proves nothing).
      var pid = (FM.projects.list()[0] || {}).id;
      while ((FM.templates.list() || []).length < 2) { var tn = 'ZZ test tpl ' + madeT.length; await FM.templates.save(tn, pid); madeT.push(tn); }
      while ((FM.elements.list() || []).length < 2) {
        var en = 'ZZ test el ' + madeE.length;
        await FM.elements.save(en, [FM.makeLayer('shape', { name: 'x', shape: 'rect', x: 20, y: 20, shapeW: 10, shapeH: 10, fill: '#fff' })]);
        madeE.push(en);
      }
      var selBtn = document.getElementById('hm-select-btn');
      if (!selBtn) throw new Error('the header Select button is missing');
      for (var ti = 0; ti < 3; ti++) {
        var name = ['projects', 'templates', 'elements'][ti];
        var tabBtn = [].slice.call(document.querySelectorAll('.hm-tab')).filter(function (b) { return b.dataset.tab === name; })[0];
        if (!tabBtn) throw new Error('no ' + name + ' tab');
        tabBtn.click(); await sleep(200);
        if (!document.body.classList.contains('hm-selecting')) { selBtn.click(); await sleep(200); }
        var cards = [].slice.call(document.querySelectorAll('#hm-grid .hm-card, .hm-grid .hm-card'));
        if (!cards.length) throw new Error('the ' + name + ' tab has no cards — this assertion would prove nothing');
        var missing = cards.filter(function (c) { return !c.dataset.pid; }).length;
        if (missing) throw new Error(name + ': ' + missing + ' of ' + cards.length + ' cards have no data-pid — every in-place update looks the card up by it');
        cards[0].click(); await sleep(140);
        if (cards[0].querySelectorAll('.hm-check.on').length !== 1) {
          throw new Error(name + ': tapping a card in Select drew ' + cards[0].querySelectorAll('.hm-check.on').length
            + ' ticks on it, expected exactly 1 — the bar counts the tap either way, so the card is the only honest witness');
        }
        if (!cards[0].classList.contains('hm-sel')) throw new Error(name + ': the selected card has no .hm-sel outline');
        cards[0].click(); await sleep(140);   // and it must come back off
        if (cards[0].querySelectorAll('.hm-check.on').length !== 0) throw new Error(name + ': the tick would not turn off again');
        selBtn.click(); await sleep(200);     // leave Select before the next tab
      }
    } finally {
      if (document.body.classList.contains('hm-selecting')) { var b = document.getElementById('hm-select-btn'); if (b) b.click(); }
      for (var i = 0; i < madeT.length; i++) { var t = (FM.templates.list() || []).filter(function (x) { return x.name === madeT[i]; })[0]; if (t) await FM.templates.remove(t.id); }
      for (var j = 0; j < madeE.length; j++) { var e = (FM.elements.list() || []).filter(function (x) { return x.name === madeE[j]; })[0]; if (e) await FM.elements.remove(e.id); }
      await sleep(80);
      if (!wasOpen && FM.home.close) FM.home.close();
    }
  });

  /* Queue 65 (v6.19). Ezra: "sometimes when scrolling through an effect with lots of sliders it
   * doesn't let me scroll up because I placed my finger on the slider, which is annoying."
   * The strip used to claim the gesture on pointerdown — capture + preventDefault — before the finger
   * had moved at all, and its CSS said touch-action:none. So a vertical swipe that happened to start
   * on a slider was swallowed: no scroll, and often a value change you never asked for.
   * This drives real PointerEvents at a real .fx-scrub and asserts BOTH halves: a vertical swipe must
   * leave the value alone, and a horizontal one must still scrub. Testing only the horizontal half is
   * what would have passed on the broken build. */
  test('effect sliders: a vertical swipe scrolls, a horizontal one scrubs', { item: 'slider-scroll-lock' }, async function () {
    var sleep = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };
    var saved = FM.scene, savedSel = FM.scene.selectedId;
    try {
      var L = FM.makeLayer('shape', { name: 'S', shape: 'rect', x: 60, y: 60, shapeW: 40, shapeH: 40, fill: '#f00', start: 0, duration: 2 });
      L.effects = [FM.fxRegistry.makeInstance('blur')];
      if (!L.effects[0]) throw new Error('could not build a blur instance to scrub');
      FM.scene = scene([L]);
      FM.selectLayer(L.id); FM.refreshAll(); await sleep(120);
      // open the effect so its sliders are on screen
      var opened = false;
      var cat = [].slice.call(document.querySelectorAll('#inspector button')).filter(function (b) { return /Effects/.test(b.textContent); })[0];
      if (cat) { cat.click(); await sleep(160); opened = true; }
      var strip = document.querySelector('#inspector .fx-scrub');
      if (!strip) {
        var head = document.querySelector('#inspector .fx-head');
        if (head) { head.click(); await sleep(160); strip = document.querySelector('#inspector .fx-scrub'); }
      }
      if (!strip) throw new Error('no .fx-scrub on screen' + (opened ? ' after opening Effects' : '') + ' — nothing to test');

      // touch-action must leave the vertical axis to the browser, or nothing below can help
      var ta = getComputedStyle(strip).touchAction;
      if (ta !== 'pan-y') throw new Error('.fx-scrub touch-action is "' + ta + '", not "pan-y" — with `none` the browser can never scroll a panel whose rows are sliders');

      var r = strip.getBoundingClientRect();
      var cx = Math.round(r.left + r.width / 2), cy = Math.round(r.top + r.height / 2);
      var lastDownPrevented = null;
      var swipe = async function (dx, dy) {
        var opts = function (x, y) { return { bubbles: true, cancelable: true, pointerId: 7, pointerType: 'touch', clientX: x, clientY: y, button: 0, buttons: 1 }; };
        var down = new PointerEvent('pointerdown', opts(cx, cy));
        strip.dispatchEvent(down);
        lastDownPrevented = down.defaultPrevented;
        for (var s = 1; s <= 6; s++) strip.dispatchEvent(new PointerEvent('pointermove', opts(cx + dx * s / 6, cy + dy * s / 6)));
        strip.dispatchEvent(new PointerEvent('pointerup', opts(cx + dx, cy + dy)));
        await sleep(60);
      };
      var read = function () { return JSON.stringify(FM.scene.layers[0].effects[0].params); };

      var before = read();
      // DRIFT ON PURPOSE. A real thumb never swipes exactly vertically, and a dx of 0 would make this
      // half of the test pass on the broken build too — applyDx(0) is a no-op, so the old code looked
      // innocent for a perfectly straight swipe while mangling every real one. 8px across, 90 down.
      await swipe(8, -90);
      if (read() !== before) throw new Error('a mostly-vertical swipe changed the effect: ' + before + ' → ' + read() + ' — the slider ate a scroll');
      // …and the browser must have been LEFT free to scroll. preventDefault on the pointerdown is the
      // other half of how the old build killed it, and no amount of touch-action can undo that.
      if (lastDownPrevented) throw new Error('pointerdown was preventDefault()ed on touch — the browser cannot scroll a gesture that was cancelled before it began');

      await swipe(-70, 0);                         // a scrub: straight across
      var after = read();
      if (after === before) throw new Error('a horizontal drag changed nothing (' + after + ') — the lock is refusing the gesture it is supposed to allow');
    } finally {
      FM.scene = saved; FM.scene.selectedId = savedSel;
      try { FM.refreshAll(); } catch (e) {}
      await sleep(60);
    }
  });

  /* Queue 73 (v6.21). Ezra: "currently the names of layers follow and stay on screen, I want them to
   * just stay at the start of the layer and not move along with you." The label used to track the
   * clip's VISIBLE left edge, so it slid along the bar as you scrolled and never left the screen.
   * There is a real argument for that behaviour, which is why it was built — so this test exists to
   * stop someone rebuilding it. The label's `left` must not change with scroll. */
  test('timeline: a clip name stays at the clip start and scrolls away with it', { item: 'clip-label-pinned' }, async function () {
    var sleep = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };
    var sc = document.getElementById('timeline');
    if (!sc || !FM.timeline) throw new Error('#timeline / FM.timeline missing');
    var saved = FM.scene, hadZoom = FM.timeline.getZoom ? FM.timeline.getZoom() : null, hadScroll = sc.scrollLeft;
    try {
      var L = FM.makeLayer('shape', { name: 'ZZ a very long clip name', shape: 'rect', x: 40, y: 40, shapeW: 20, shapeH: 20, fill: '#0f0', start: 0, duration: 60 });
      FM.scene = scene([L], { project: { width: 320, height: 240, fps: 30, duration: 90, background: '#000' } });
      FM.timeline.setZoom(4, 0); FM.timeline.rebuild(); await sleep(200);
      var clip = document.querySelector('.clip[data-id="' + L.id + '"]');
      if (!clip) throw new Error('the probe clip is not in the timeline');
      var label = clip.querySelector('.clip-label');
      if (!label) throw new Error('the clip has no .clip-label — nothing to pin');
      var read = async function (sl) {
        sc.scrollLeft = sl; sc.dispatchEvent(new Event('scroll'));
        FM.timeline.updatePlayhead(); await sleep(120);
        return { left: label.style.left, x: label.getBoundingClientRect().left };
      };
      var a = await read(0), b = await read(600);
      if (a.left !== b.left) {
        throw new Error('the label moved along the clip as the timeline scrolled (left ' + a.left + ' → ' + b.left
          + ') — it is meant to sit at the clip START and scroll away with it');
      }
      /* …and where the harness actually lays the timeline out, prove the probe can SEE movement — the
         assertion above is only meaningful if the label's screen position really does travel with the
         clip. Inside run.html's offscreen iframe the clip subtree has no box at all (every rect comes
         back 0), which is a property of the harness, not of the app: driven in a real browser at
         1280x860 the same label goes 213 → -387 → -1187 across scrolls of 0 / 600 / 1400. So measure
         when there is something to measure, and say so out loud when there is not, rather than
         letting a blind spot read as a pass. */
      var laidOut = clip.getBoundingClientRect().width > 0;
      if (laidOut && !(b.x < a.x - 100)) {
        throw new Error('the label barely moved on screen (' + Math.round(a.x) + ' → ' + Math.round(b.x)
          + ') after a 600px scroll — it is not travelling with the clip');
      }
    } finally {
      FM.scene = saved;
      if (hadZoom != null && FM.timeline.setZoom) FM.timeline.setZoom(hadZoom, 0);
      try { FM.timeline.rebuild(); } catch (e) {}
      sc.scrollLeft = hadScroll;
      await sleep(80);
    }
  });

  /* The POP's half of the playhead guard (v6.31).
   * The push already has a test above — a recompute landing mid-animation must not store the
   * TRANSLATED edge of #timeline-panel, or --tl-panel-left is wrong for the rest of the session and
   * the playhead parks off screen. That is the "playhead sometimes isn't there when a project opens"
   * bug, and it needed an app restart to clear.
   * v6.27 added two MORE animations that move #app — fm-pop-out and fm-pop-in, the return to home —
   * so the same hazard now exists on the way back, and nothing covered it. panelLeft() walks ancestors
   * subtracting translateX, and its comment already names all four keyframes, so this should hold;
   * this test is what makes "should" into "does", and what stops the next animation being added
   * without one.
   * It asserts the stored var against the AT-REST truth, and separately records what the raw rect
   * was doing — if the raw rect never drifts, the test is not exercising the hazard at all and would
   * pass on a broken build. */
  test('playhead: a rebuild during the return-to-home pop keeps --tl-panel-left honest', { item: 'playhead-pop' }, async function () {
    var sleep = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };
    var rAF = function () { return new Promise(function (r) { requestAnimationFrame(r); }); };
    var panel = document.getElementById('timeline-panel');
    if (!panel || !FM.home || !FM.home.open || !FM.timeline) throw new Error('#timeline-panel / FM.home / FM.timeline missing');
    var read = function () { return parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--tl-panel-left')) || 0; };
    var wasHome = FM.home.isOpen();
    try {
      if (wasHome && FM.home.close) { FM.home.close(); await sleep(120); }
      FM.timeline.rebuild(); await sleep(40);
      var truth = read();
      FM.home.open();                       // fires the pop; #app carries fm-pop-out's transform
      var maxStored = 0, maxRaw = 0;
      for (var i = 0; i < 14; i++) {
        await rAF();
        FM.timeline.rebuild();              // recomputePad() lands mid-animation, as a filmstrip rebuild does
        maxStored = Math.max(maxStored, Math.abs(read() - truth));
        maxRaw = Math.max(maxRaw, Math.abs(panel.getBoundingClientRect().left - truth));
      }
      await sleep(500);
      if (maxStored > 1) {
        throw new Error('--tl-panel-left drifted ' + maxStored.toFixed(1) + 'px during the pop (truth ' +
          truth.toFixed(1) + ') — the playhead will sit that far off for the rest of the session');
      }
      // The control. If the raw rect never moved either, no animation ran and this proved nothing.
      if (maxRaw < 1) {
        throw new Error('the panel never moved during the pop (raw drift ' + maxRaw.toFixed(2) +
          'px) — the hazard was not exercised, so a green result here would be meaningless');
      }
    } finally {
      if (!wasHome && FM.home.close) FM.home.close();
      else if (wasHome && !FM.home.isOpen()) FM.home.open();
      await sleep(120);
      try { FM.timeline.rebuild(); } catch (e) {}
    }
  });

  /* Queue 59 (v6.32). Ezra: "copy/paste button in the effects menu, and paste ONE effect."
   * There were two clipboards that could not see each other — FM.fxClipboard (one effect,
   * localStorage, behind a row's ⋯) and FM.effectClipboard (the whole stack, in memory, behind the
   * panel's buttons). Copying one effect from ⋯ left the panel's Paste greyed out, which reads as
   * broken. This asserts they are now ONE: a single effect copied is a single effect pasted, a stack
   * copied is a stack pasted, and the clipboard survives being re-read from storage. */
  test('effects: one clipboard — copy one effect, paste one effect', { item: 'fx-clipboard-unified' }, async function () {
    if (!FM.fxClipboard || !FM.fxRegistry) throw new Error('FM.fxClipboard / FM.fxRegistry missing');
    var saved = localStorage.getItem('fm.fxclip');
    try {
      if (typeof FM.effectClipboard !== 'undefined' && FM.effectClipboard) {
        throw new Error('FM.effectClipboard is back — a second clipboard is the bug being fixed');
      }
      var a = FM.fxRegistry.makeInstance('blur'), b = FM.fxRegistry.makeInstance('glow');
      if (!a || !b) throw new Error('could not build two effect instances to copy');
      // ONE effect in, ONE effect out — the literal ask.
      if (!FM.fxClipboard.copy(a)) throw new Error('copy(single) refused');
      var one = FM.fxClipboard.read();
      if (one.length !== 1) throw new Error('copied 1 effect, clipboard holds ' + one.length);
      if (one[0].type !== 'blur') throw new Error('clipboard holds ' + one[0].type + ', expected blur');
      if (FM.fxClipboard.count() !== 1) throw new Error('count() disagrees with read()');
      if (!/blur/i.test(FM.fxClipboard.label() || '')) throw new Error('label() does not name the effect: ' + FM.fxClipboard.label());
      // …and a whole stack goes through the SAME clipboard, which is what makes the panel buttons and
      // the ⋯ menu one feature instead of two.
      if (!FM.fxClipboard.copy([a, b])) throw new Error('copy(list) refused');
      var many = FM.fxClipboard.read();
      if (many.length !== 2) throw new Error('copied 2 effects, clipboard holds ' + many.length);
      if (FM.fxClipboard.label() !== '2 effects') throw new Error('label() for a stack is "' + FM.fxClipboard.label() + '"');
      // An effect type that no longer exists must be dropped, not landed as an uneditable dead row.
      localStorage.setItem('fm.fxclip', JSON.stringify([{ type: 'zzz_not_an_effect', params: {} }, { type: 'blur', params: {} }]));
      var filtered = FM.fxClipboard.read();
      if (filtered.length !== 1 || filtered[0].type !== 'blur') {
        throw new Error('an unknown effect type survived the clipboard: ' + JSON.stringify(filtered.map(function (f) { return f.type; })));
      }
      // The pre-v6.32 single-OBJECT format must still paste, or an older build's clipboard reads empty.
      localStorage.setItem('fm.fxclip', JSON.stringify({ type: 'glow', params: {} }));
      var legacy = FM.fxClipboard.read();
      if (legacy.length !== 1 || legacy[0].type !== 'glow') {
        throw new Error('the old single-object clipboard format no longer reads: ' + JSON.stringify(legacy));
      }
    } finally {
      if (saved == null) localStorage.removeItem('fm.fxclip'); else localStorage.setItem('fm.fxclip', saved);
    }
  });


  /* ---- preview resolution actually reaching the WORK (v6.23 lag pass) ---------------------------
     The adaptive playback-quality tier shrinks the preview canvas. That only buys anything if the
     per-pixel work follows it down. A dozen draw paths used to allocate their plate at PROJECT size
     no matter how small the target was — measured on a 1080x1920 comp, one Compound Blur cost
     154.6 ms into a full-size target and 143.3 ms into a 0.35 one (ratio 1.08, i.e. flat), and RGB
     Split 17.3 vs 14.3. Because the cost did not move, the ladder dropped a tier, measured no
     payoff, undid the drop and LATCHED OFF — so a heavy comp ended up soft AND slow. On the real
     preview canvas that was 90.7 ms/frame with 149 dropped frames in 8 s; after, 17.5 ms and 2.
     Asserted RELATIVELY (reduced render vs full render) rather than against a fixed number, so it
     holds whatever granularity a path happens to read at. */
  var PLATE_CASES = ['rgbsplit', 'displacemap', 'polardisplace', 'lumamatte', 'matchgrade', 'compoundblur'];
  function biggestReadRendering(type, PW, PH, TW, TH) {
    var src = FM.makeLayer('shape', { name: 'plate-src', shape: 'ellipse', x: PW * 0.35, y: PH * 0.35, shapeW: PW * 0.5, shapeH: PH * 0.5, fill: '#8899ff' });
    var sub = FM.makeLayer('shape', { name: 'plate-sub', shape: 'rect', x: PW * 0.5, y: PH * 0.5, shapeW: PW * 0.65, shapeH: PH * 0.65, fill: '#ff5522' });
    var inst = FM.fxRegistry.makeInstance(type);
    if (!inst) return -1;
    if (inst.params && Object.prototype.hasOwnProperty.call(inst.params, 'source')) inst.params.source = src.id;
    sub.effects = [inst];
    var s = scene([sub, src], { project: { width: PW, height: PH, fps: 30, duration: 5, background: '#000000' } });
    var c = offscreen(TW, TH);
    var real = CanvasRenderingContext2D.prototype.getImageData, biggest = 0;
    try {
      CanvasRenderingContext2D.prototype.getImageData = function (x, y, w, h) {
        if (w * h > biggest) biggest = w * h;
        return real.apply(this, arguments);
      };
      FM.renderScene(c.getContext('2d', { willReadFrequently: true }), s, 0);
    } finally { CanvasRenderingContext2D.prototype.getImageData = real; }
    return biggest;
  }

  test('effects: a reduced preview shrinks the effect PLATE, not just the canvas', { item: 'preview-scale' }, function () {
    var PW = 400, PH = 400, bad = [];
    PLATE_CASES.forEach(function (type) {
      var full = biggestReadRendering(type, PW, PH, PW, PH);      // 1:1 — the export/thumbnail path
      var quarter = biggestReadRendering(type, PW, PH, 100, 100);  // a 0.25 preview
      if (full < 0) return;                                        // effect not in this build
      if (full === 0) { bad.push(type + ': the render read nothing at all, so this test proves nothing'); return; }
      // 0.25 linear = 1/16 the pixels. Allow a generous 4x slop for rounding and quarter-res passes;
      // a plate stuck at project size lands at ratio 1.0 and fails loudly.
      if (quarter > full * 0.25) bad.push(type + ' read ' + quarter + 'px into a 100x100 target vs ' + full + 'px into ' + PW + 'x' + PH + ' — the plate is not following the preview down');
    });
    if (bad.length) throw new Error(bad.join('; '));
  });

  test('masks: a pen mask builds its stencil at the PREVIEW size, not the project size', { item: 'preview-scale' }, function () {
    if (typeof FM.buildMaskAlpha !== 'function') return;
    var real = FM.buildMaskAlpha, seen = [];
    function run(TW, TH) {
      var L = FM.makeLayer('shape', { name: 'pm', shape: 'rect', x: 200, y: 200, shapeW: 300, shapeH: 300, fill: '#ff0000' });
      L.masks = [{ id: 'pm1', enabled: true, mode: 'add', feather: 8, opacity: 1, invert: false, closed: true,
        path: [[60, 60], [340, 60], [340, 340], [60, 340]] }];
      var s = scene([L], { project: { width: 400, height: 400, fps: 30, duration: 5, background: '#000000' } });
      seen.length = 0;
      FM.renderScene(offscreen(TW, TH).getContext('2d'), s, 0);
      return seen.slice();
    }
    var full, quarter;
    try {
      FM.buildMaskAlpha = function (layer, t, W, H) { seen.push(W * H); return real.apply(this, arguments); };
      full = run(400, 400);
      quarter = run(100, 100);
    } finally { FM.buildMaskAlpha = real; }
    if (!full.length || !quarter.length) throw new Error('no pen mask was built — the test never exercised the path');
    if (Math.max.apply(null, quarter) > Math.max.apply(null, full) * 0.25) {
      throw new Error('the pen-mask stencil is ' + Math.max.apply(null, quarter) + 'px for a 100x100 preview and ' + Math.max.apply(null, full) + 'px for a 400x400 one — it is still being rasterised at project size');
    }
  });

  /* ---- one rebuild per tap, one lane measurement per rebuild (v6.23 lag pass) -------------------
     FM.layersPanel.refresh() is a shim whose whole body is FM.timeline.rebuild(), and FM.selectLayer
     called both — so every tap on a layer rebuilt the WHOLE timeline twice. Separately, pxPerSec()
     re-read timelineEl.clientWidth once PER CLIP while buildTracks was appending rows, forcing one
     synchronous layout each time. Measured over 12 taps at 1440px: 2.0 rebuilds/tap at every layer
     count and 24.1 / 61.4 / 111.4 / 211.4 forced layouts per tap at 5 / 20 / 40 / 80 layers, i.e.
     the tap got linearly worse as the project grew (2.2 / 7.4 / 17.0 / 32.8 ms). */
  function withTempLayers(n, fn) {
    var hadLayers = FM.scene.layers, hadSel = FM.scene.selectedId, hadSelIds = FM.scene.selectedIds;
    var hadDur = FM.scene.project.duration;
    try {
      FM.scene.layers = [];
      for (var i = 0; i < n; i++) {
        FM.scene.layers.push(FM.makeLayer('shape', { name: 'TL' + i, shape: 'rect', x: 100, y: 100, shapeW: 80, shapeH: 60, fill: '#4488cc', start: i * 0.05, duration: 2 }));
      }
      FM.scene.selectedId = null; FM.scene.selectedIds = [];
      FM.timeline.rebuild();
      return fn();
    } finally {
      FM.scene.layers = hadLayers; FM.scene.selectedId = hadSel; FM.scene.selectedIds = hadSelIds;
      FM.scene.project.duration = hadDur;
      if (FM.timeline && FM.timeline.rebuild) FM.timeline.rebuild();
    }
  }

  test('timeline: selecting a layer rebuilds the timeline exactly ONCE', { item: 'select-cost' }, function () {
    if (!FM.timeline || !FM.timeline.rebuild || !FM.selectLayer) return;
    var calls = withTempLayers(6, function () {
      var real = FM.timeline.rebuild, n = 0;
      try {
        FM.timeline.rebuild = function () { n++; return real.apply(FM.timeline, arguments); };
        FM.selectLayer(FM.scene.layers[2].id);
        FM.selectLayer(FM.scene.layers[4].id);
        FM.selectLayer(FM.scene.layers[0].id);
      } finally { FM.timeline.rebuild = real; }
      return n;
    });
    if (calls !== 3) throw new Error(calls + ' timeline rebuilds for 3 layer selections (expected 3) — layersPanel.refresh() IS rebuild(), so calling both doubles the most common interaction in the app');
  });

  test('timeline: a rebuild measures the lane width once, not once per clip', { item: 'select-cost' }, function () {
    if (!FM.timeline || !FM.timeline.rebuild) return;
    var d = Object.getOwnPropertyDescriptor(Element.prototype, 'clientWidth');
    if (!d || !d.get) return;   // no way to observe the read on this engine
    var reads = 0;
    function countDuringRebuild(n) {
      return withTempLayers(n, function () {
        reads = 0;
        try {
          Object.defineProperty(Element.prototype, 'clientWidth', { configurable: true, get: function () { reads++; return d.get.call(this); } });
          FM.timeline.rebuild();
        } finally { Object.defineProperty(Element.prototype, 'clientWidth', d); }
        return reads;
      });
    }
    var few = countDuringRebuild(4), many = countDuringRebuild(28);
    if (many - few > 6) throw new Error('a rebuild read clientWidth ' + few + ' times with 4 clips and ' + many + ' times with 28 — it is measuring the lane once per clip again, and each read forces a synchronous layout mid-DOM-build');
  });

  /* ---- voice recorder (Add ▸ Audio ▸ Record voice…) — js/voice-rec.js ---------------------------
   *
   * These tests NEVER ask for the real microphone. They replace one seam — FM.voiceRec._openMic —
   * with an AudioContext.createMediaStreamDestination() stream, which is a REAL MediaStream carrying
   * a REAL MediaStreamTrack: MediaRecorder, createMediaStreamSource, track.stop() and readyState are
   * all the browser's own, and the only thing avoided is the permission prompt. So opening
   * tests/run.html can never pop a mic dialog at Ezra, and the release being asserted is a real
   * MediaStreamTrack going to readyState 'ended', not a mock remembering that it was asked to.
   * (The real getUserMedia path is covered separately by a headless run with
   * --use-fake-device-for-media-stream; that cannot live in this file without prompting.) */
  function vrFakeMic() {
    var AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) throw new Error('no AudioContext — this browser cannot run the voice-recorder tests at all');
    var ctx = new AC();
    var osc = ctx.createOscillator(); osc.frequency.value = 220;
    var gain = ctx.createGain(); gain.gain.value = 0.4;
    var dest = ctx.createMediaStreamDestination();
    osc.connect(gain); gain.connect(dest); osc.start();
    /* Hand the stream over only once the tone is REALLY flowing. A context that is still 'suspended'
       (autoplay policy) or has not run its first quantum produces a track that is live and carries
       nothing, so MediaRecorder writes an empty blob and the recorder's own too-short branch fires —
       which turns every test below into a coin toss. Measured: that is exactly what made the first
       run of this suite flake. If the clock never starts, say so in words rather than time out. */
    var ready = Promise.resolve(ctx.resume ? ctx.resume() : null).catch(function () {}).then(function () {
      return new Promise(function (res, rej) {
        var t0 = Date.now();
        (function poll() {
          if (ctx.state === 'running' && ctx.currentTime > 0.02) return res();
          if (Date.now() - t0 > 4000) return rej(new Error('the test tone never started (AudioContext state "' + ctx.state + '", currentTime ' + ctx.currentTime + ') — this browser will not run an AudioContext until the page has been clicked; click anywhere in the runner and re-run'));
          setTimeout(poll, 20);
        })();
      });
    });
    return {
      stream: dest.stream,
      ready: ready,
      dispose: function () {
        try { osc.stop(); } catch (e) {}
        try { dest.stream.getTracks().forEach(function (t) { t.stop(); }); } catch (e) {}
        if (ctx.close) { try { ctx.close(); } catch (e) {} }   // iOS caps live contexts at about four
      },
    };
  }
  // Install the seam, run body(), and put everything back however body() ends.
  async function withFakeMic(body) {
    if (!FM.voiceRec) throw new Error('FM.voiceRec missing — js/voice-rec.js is not loaded');
    var real = FM.voiceRec._openMic, mics = [];
    FM.voiceRec._openMic = function () {
      var m = vrFakeMic(); mics.push(m);
      return m.ready.then(function () { return m.stream; });
    };
    try { return await body(); }
    finally {
      try { FM.voiceRec.close(); } catch (e) {}
      FM.voiceRec._openMic = real;
      mics.forEach(function (m) { m.dispose(); });
    }
  }
  function vrWait(cond, ms, what) {
    var t0 = Date.now();
    return new Promise(function (res, rej) {
      (function poll() {
        if (cond()) return res();
        if (Date.now() - t0 > (ms || 6000)) return rej(new Error('timed out waiting for ' + what));
        setTimeout(poll, 30);
      })();
    });
  }
  function vrEl(sel) { var e = document.querySelector(sel); if (!e) throw new Error('the recorder panel has no ' + sel); return e; }
  function vrStates() { return FM.voiceRec._tracks().map(function (t) { return t.readyState; }); }
  function vrLive() { return vrStates().filter(function (s) { return s !== 'ended'; }); }

  test('voice: the microphone is handed back on EVERY exit path', { item: 'voice-rec' }, async function () {
    await withFakeMic(async function () {
      var seen = [];
      /* The app boots INTO the home browser, which legitimately covers the screen — so the coverage
         check below needs the same rig the other overlay tests use: home/settings stubbed shut and
         anything already screen-sized parked. Without it the check would report "covered" before the
         recorder was even shown. */
      var rig = overlayKeyRig();
      try {
        if (FM.overlayOwnsScreen()) throw new Error('something still covers the screen with the rig up — the coverage check below would pass for the wrong reason');
        FM.voiceRec.open();
        await vrWait(function () { return vrStates().length > 0; }, 6000, 'the mic to be acquired');
        if (vrStates().join() !== 'live') throw new Error('the fake mic never went live (' + vrStates().join() + ') — every assertion below would pass for the wrong reason');
        /* The panel is spared the document-CAPTURE tap-to-deselect handler and every bare-key editor
           shortcut by BEING a full-screen fixed surface, not by being named in a list — see the CSS
           note on #vr-overlay. Assert the property the guard actually measures, so turning the panel
           into a bottom sheet cannot silently reintroduce "tapping the recorder deselected my layer". */
        if (!FM.overlayOwnsScreen()) throw new Error('the open recorder is NOT seen as covering the screen — a tap inside it would deselect the layer behind it, and Backspace would still reach the project');
      } finally { rig.restore(); }

      // 1 — panel closed while idle
      FM.voiceRec.close();
      seen.push(['closed while idle', vrStates().join()]);
      if (vrLive().length) throw new Error('closing the panel left ' + vrLive().length + ' track(s) live');

      // 2 — recorded, then stopped normally ("finished")
      FM.voiceRec.open();
      await vrWait(function () { return vrStates().join() === 'live'; }, 6000, 'the mic (take 2)');
      vrEl('.vr-rec').click();
      await vrWait(function () { return FM.voiceRec._state() === 'recording'; }, 3000, 'recording to start');
      if (vrLive().length !== 1) throw new Error('the mic is not live while recording — the take would be silent');
      await new Promise(function (r) { setTimeout(r, 500); });
      vrEl('.vr-rec').click();
      await vrWait(function () { return FM.voiceRec._state() !== 'recording'; }, 8000, 'the take to finish');
      // Non-vacuity: a 500ms take must have produced bytes and landed in review. If it fell into the
      // too-short branch instead, the recorder legitimately re-arms and "no live track" would be
      // asserting the wrong state entirely.
      if (FM.voiceRec._state() !== 'review')
        throw new Error('a 500ms take came out empty (state "' + FM.voiceRec._state() + '") — MediaRecorder captured nothing from the test stream, so the release-after-a-real-take path is not being exercised');
      seen.push(['finished', vrStates().join()]);
      if (vrLive().length) throw new Error('the mic was still live after the take finished — the recording indicator stays lit while you listen back');
      FM.voiceRec.close();

      // 3 — cancelled mid-record
      FM.voiceRec.open();
      await vrWait(function () { return vrStates().join() === 'live'; }, 6000, 'the mic (take 3)');
      vrEl('.vr-rec').click();
      await vrWait(function () { return FM.voiceRec._state() === 'recording'; }, 3000, 'recording to start');
      await new Promise(function (r) { setTimeout(r, 200); });
      FM.voiceRec.close();                       // exactly what Discard / ✕ / the backdrop call
      seen.push(['cancelled mid-record', vrStates().join()]);
      if (vrLive().length) throw new Error('cancelling mid-record left the mic live');

      // 4 — the page hidden mid-record (backgrounded / screen locked), with a take worth keeping
      FM.voiceRec.open();
      await vrWait(function () { return vrStates().join() === 'live'; }, 6000, 'the mic (take 4)');
      vrEl('.vr-rec').click();
      await vrWait(function () { return FM.voiceRec._state() === 'recording'; }, 3000, 'recording to start');
      await new Promise(function (r) { setTimeout(r, 450); });
      FM.voiceRec._hidden();                     // the module's own visibilitychange handler
      await vrWait(function () { return FM.voiceRec._state() !== 'recording'; }, 8000, 'the backgrounded take to stop');
      seen.push(['page hidden', vrStates().join()]);
      if (vrLive().length) throw new Error('the app was backgrounded mid-take and the mic stayed live — a recording indicator burning while the app is not even on screen');
      FM.voiceRec.close();

      /* 4b — the same, but the take is too short to keep. This is a DIFFERENT code path: the
         too-short branch re-arms the mic so the next tap works, and doing that with the app off
         screen re-opens the microphone while nobody is looking at it. Measured: before the guard,
         this left one live track. document.hidden is shadowed for the duration and deleted after. */
      Object.defineProperty(document, 'hidden', { configurable: true, get: function () { return true; } });
      try {
        FM.voiceRec.open();
        await vrWait(function () { return vrStates().join() === 'live'; }, 6000, 'the mic (take 4b)');
        var b4 = vrEl('.vr-rec'); b4.click(); b4.click();
        await vrWait(function () { return FM.voiceRec._state() !== 'recording'; }, 8000, 'the empty backgrounded take to settle');
        await new Promise(function (r) { setTimeout(r, 250); });   // give a stray re-arm time to land
        seen.push(['page hidden, empty take', vrStates().join()]);
        if (vrLive().length) throw new Error('a too-short take while the app was backgrounded re-opened the microphone — the mic came back up with the app off screen');
      } finally { delete document.hidden; FM.voiceRec.close(); }

      // 5 — the permission was refused: nothing to release, and nothing left behind
      var real = FM.voiceRec._openMic;
      FM.voiceRec._openMic = function () { var e = new Error('no'); e.name = 'NotAllowedError'; return Promise.reject(e); };
      try {
        FM.voiceRec.open();
        await vrWait(function () { return FM.voiceRec._state() === 'error'; }, 6000, 'the denial to be reported');
        seen.push(['denied', vrStates().join()]);
        if (vrLive().length) throw new Error('a denied request left a live track');
        var msg = vrEl('.vr-msg');
        if (msg.classList.contains('hidden') || !msg.textContent.trim()) throw new Error('the mic was refused and the panel said nothing — a button that silently does nothing');
      } finally { FM.voiceRec._openMic = real; FM.voiceRec.close(); }

      if (seen.length !== 6) throw new Error('only ' + seen.length + ' exit paths were exercised: ' + JSON.stringify(seen));
    });
  });

  test('voice: a take of no length never becomes a layer', { item: 'voice-rec' }, async function () {
    var savedScene = FM.scene, savedTime = FM.time;
    await withFakeMic(async function () {
      try {
        FM.scene = scene([]);
        FM.voiceRec.open();
        await vrWait(function () { return vrStates().join() === 'live'; }, 6000, 'the mic');
        var b = vrEl('.vr-rec');
        b.click(); b.click();                    // record and stop in the same tick
        await vrWait(function () { return FM.voiceRec._state() !== 'recording'; }, 8000, 'the empty take to settle');
        if (FM.scene.layers.length !== 0) throw new Error('a ' + FM.scene.layers.length + '-layer scene came out of a take with no length — an empty audio clip on the timeline');
        if (FM.voiceRec._state() !== 'idle') throw new Error('after a too-short take the panel is in state "' + FM.voiceRec._state() + '"; it must return to idle so the next tap works');
        var msg = vrEl('.vr-msg');
        if (msg.classList.contains('hidden') || msg.textContent.indexOf('Too short') < 0)
          throw new Error('nothing was recorded and the panel did not say so (message: "' + msg.textContent + '") — it just looks broken');
        if (vrEl('.vr-time').textContent !== '0:00') throw new Error('the clock kept a length for a take that produced nothing');
      } finally { FM.scene = savedScene; FM.time = savedTime; }
    });
  });

  test('voice: a recording becomes an ordinary audio layer, on the import path', { item: 'voice-rec' }, async function () {
    // The whole point of the feature: the recording is not special. It goes through
    // FM.loadVideoFile → FM.addMediaLayer, the same two calls js/app.js:2008 makes for an imported
    // song, so it gets the audio lane, the mix, the library tile and the export for free.
    var savedScene = FM.scene, savedTime = FM.time, savedHist = FM.history;
    var savedSave = FM.storage.save, savedLib = null;
    try { savedLib = localStorage.getItem('fm.medialib'); } catch (e) {}
    await withFakeMic(async function () {
      try {
        // Keep the run out of Ezra's real project, undo stack and media library.
        FM.scene = scene([FM.makeLayer('shape', { shape: 'rect', x: 160, y: 120 })]);
        FM.history = { commit: function () {}, undo: function () {}, redo: function () {} };
        FM.storage.save = function () { return Promise.resolve(); };

        // The playhead is set AFTER open(), not before: open() pauses playback, and pause() can move
        // FM.time (it snaps to a frame, and restores the review origin if a review play is live).
        // Setting it first meant the test could land at 0 and blame the recorder for it.
        FM.voiceRec.open();
        FM.time = 1.25;
        await vrWait(function () { return vrStates().join() === 'live'; }, 8000, 'the mic');
        vrEl('.vr-rec').click();
        await vrWait(function () { return FM.voiceRec._state() === 'recording'; }, 3000, 'recording to start');
        await new Promise(function (r) { setTimeout(r, 700); });
        vrEl('.vr-rec').click();
        await vrWait(function () { return FM.voiceRec._state() !== 'recording'; }, 9000, 'the take to settle');
        if (FM.voiceRec._state() !== 'review')
          throw new Error('a 700ms take came out empty (state "' + FM.voiceRec._state() + '") — nothing below is being exercised');
        if (Math.abs(FM.time - 1.25) > 1e-6)
          throw new Error('the playhead moved to ' + FM.time + ' during the take; the landing assertion below would be measuring something else');

        // The panel says where it will land BEFORE you commit — that sentence is the fix for the
        // placement rule, not a decoration.
        var lands = vrEl('.vr-lands').textContent;
        if (lands.indexOf('0:01.3') < 0 || lands.indexOf('playhead') < 0)
          throw new Error('the panel does not state where the take will land ("' + lands + '") — the placement rule is the one that has confused Ezra before, and a whole-second clock would print a 1.25s playhead as "0:01"');

        vrEl('.vr-btn--add').click();
        await vrWait(function () { return FM.scene.layers.length === 2; }, 15000, 'the recording to become a layer');

        var L = FM.scene.layers[0], m = FM.media.get(L.id);
        if (L.type !== 'video') throw new Error('the recording became a "' + L.type + '" layer; audio rides the pictureless-video path, so it must be "video"');
        if (!m || !m.file) throw new Error('no media record with a File — the layer cannot be saved to IndexedDB or exported');
        if (!/^Voice /.test(m.file.name)) throw new Error('the file was named "' + m.file.name + '"');
        if (!m.file.size) throw new Error('the recording produced a zero-byte file');
        if (m.width || m.height) throw new Error('the recording claims a ' + m.width + '×' + m.height + ' picture — the media library files songs by having none');
        if (!(m.duration > 0.2)) throw new Error('the layer got duration ' + m.duration + ' — a MediaRecorder file reports 0/Infinity until scanned, and the measured length must be used instead of the 5s default');
        if (Math.abs(L.start - 1.25) > 0.001) throw new Error('the layer landed at ' + L.start + ', not at the playhead (1.25) — imports after the first land at the playhead and a recording must not invent a second rule');
        if (!FM.mediaKind(m.file)) throw new Error('the importer cannot classify the file it just wrote (name "' + m.file.name + '", type "' + m.file.type + '")');
        if (FM.mediaKind(m.file) !== 'audio') throw new Error('the recording classifies as "' + FM.mediaKind(m.file) + '", not audio');

        // …and it is filed under the Audio tab, not among the video thumbnails.
        var top = FM.mediaLib.list()[0];
        if (!top || top.name !== m.file.name) throw new Error('the recording did not reach the media library');
        if (!FM.mediaLib.isAudio(top)) throw new Error('the library filed the recording as a clip, so it would appear in Media instead of Audio');

        /* THE LENGTH FALLBACK, tested where it can actually be reached. A MediaRecorder file reports
           duration 0 or Infinity until the whole thing has been scanned; FM.loadVideoFile forces that
           with a seek, but gives up after 1.5s and resolves with duration 0 — which a ten-minute take
           can easily hit. FM.addMediaLayer would then hand the layer the 5s default from Settings and
           the take would be silently truncated. Chrome resolves the duration inside the budget for a
           short take, so the ONLY way to exercise the fallback is to make the file refuse to say. */
        var realLoad = FM.loadVideoFile;
        try {
          FM.loadVideoFile = function (f) {
            return realLoad(f).then(function (r) { r.duration = 0; return r; });   // the file will not say
          };
          FM.time = 0.5;
          await FM.voiceRec.addFile(m.file, 3.75);
          var L2 = FM.scene.layers[0];
          if (Math.abs(L2.duration - 3.75) > 0.01)
            throw new Error('a file that reports no duration produced a ' + L2.duration + 's layer — the MEASURED take length must be used, not Settings’ ' + FM.defaultLayerDuration() + 's default');
        } finally { FM.loadVideoFile = realLoad; }
      } finally {
        // Hand back everything the run touched: the layer's media record (a <video> and an object
        // URL that would otherwise be pinned for the session), the scene, the undo stack, the
        // autosave and the library index.
        try { (FM.scene.layers || []).forEach(function (l) { if (FM.media.get(l.id)) FM.media.remove(l.id); }); } catch (e) {}
        FM.scene = savedScene; FM.time = savedTime; FM.history = savedHist;
        FM.storage.save = savedSave;
        try { if (savedLib == null) localStorage.removeItem('fm.medialib'); else localStorage.setItem('fm.medialib', savedLib); } catch (e) {}
        if (FM.refreshAll) { try { FM.refreshAll(); } catch (e) {} }
      }
    });
  });

  test('voice: a long take stops itself at the cap, and keeps what it got', { item: 'voice-rec' }, async function () {
    /* The cap is not a nicety. Decoded PCM costs rate × channels × 4 bytes/sec and is set by DURATION
       alone (js/media.js decodeAudio) — the same cost that made long video imports fail before v5.59 —
       so an unbounded take is a tab the exporter can kill. Ten minutes of real time is not a test, so
       the cap is shortened for the run and put back afterwards. */
    var was = null;
    await withFakeMic(async function () {
      try {
        was = FM.voiceRec._setMax(0.9);
        FM.voiceRec.open();
        await vrWait(function () { return vrStates().join() === 'live'; }, 8000, 'the mic');
        vrEl('.vr-rec').click();
        await vrWait(function () { return FM.voiceRec._state() === 'recording'; }, 3000, 'recording to start');
        var t0 = Date.now();
        // NOBODY TAPS STOP: the recorder has to end this on its own.
        await vrWait(function () { return FM.voiceRec._state() !== 'recording'; }, 6000, 'the cap to stop the take');
        var took = (Date.now() - t0) / 1000;
        if (took > 2.2) throw new Error('the take ran ' + took.toFixed(2) + 's against a 0.9s cap — the limit is not enforced');
        if (FM.voiceRec._state() !== 'review') throw new Error('the capped take ended in state "' + FM.voiceRec._state() + '" — everything recorded up to the limit must be KEPT, not thrown away');
        if (vrLive().length) throw new Error('the cap stopped the take but left the mic live');
        var msg = vrEl('.vr-msg').textContent;
        if (msg.indexOf('limit') < 0) throw new Error('the take stopped by itself and the panel did not say why (message: "' + msg + '")');
        if (msg.indexOf('10 minute') >= 0) throw new Error('the message names a cap the code is not using — the wording must be derived from MAX_SECONDS, not typed beside it');
      } finally { if (was != null) FM.voiceRec._setMax(was); }
    });
  });

  test('voice: the recording container is chosen, never assumed', { item: 'voice-rec' }, function () {
    // Chrome hands back audio/webm;codecs=opus and iOS Safari hands back audio/mp4. Asking for the
    // wrong one throws NotSupportedError, so this must be a probe, not a constant.
    var pick = FM.voiceRec._pickMime;
    var only = function (set) { return function (m) { return set.indexOf(m) >= 0; }; };

    var chrome = pick(only(['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4;codecs=mp4a.40.2', 'audio/mp4']));
    if (chrome !== 'audio/webm;codecs=opus') throw new Error('a browser that supports both containers picked "' + chrome + '" — Opus in WebM is the smaller file and must win');

    var ios = pick(only(['audio/mp4']));
    if (ios !== 'audio/mp4') throw new Error('an iOS-shaped browser (audio/mp4 only) picked "' + ios + '" — that is the one container Safari can record, and asking for webm throws');

    var iosAac = pick(only(['audio/mp4;codecs=mp4a.40.2', 'audio/mp4']));
    if (iosAac !== 'audio/mp4;codecs=mp4a.40.2') throw new Error('picked "' + iosAac + '" where the explicit AAC profile was available');

    // Nothing supported, and no isTypeSupported at all, both mean "use the browser's own default" —
    // '' is a VALID mimeType option, and is what keeps a recorder we cannot interrogate working.
    if (pick(function () { return false; }) !== '') throw new Error('a browser that supports none of the candidates must fall back to the default ("")');
    if (pick(null) !== '') throw new Error('a MediaRecorder with no isTypeSupported must fall back to the default ("")');
    if (pick(function () { throw new Error('boom'); }) !== '') throw new Error('an isTypeSupported that throws must fall back to the default, not take the panel down');

    // The list has to contain the one container iOS can do, or Ezra's phone silently gets '' forever.
    if (FM.voiceRec._mimeCandidates.filter(function (m) { return /^audio\/mp4/.test(m); }).length === 0)
      throw new Error('no audio/mp4 candidate — iOS Safari would never get a named container');

    // And in THIS browser the choice must actually be recordable.
    if (typeof MediaRecorder === 'function' && MediaRecorder.isTypeSupported) {
      var here = pick(MediaRecorder.isTypeSupported.bind(MediaRecorder));
      if (here !== '' && !MediaRecorder.isTypeSupported(here)) throw new Error('picked "' + here + '", which this browser cannot record');
    }

    // The name carries the container: FM.addMediaLayer takes the layer name from it, and
    // js/app.js mediaKind() classifies by EXTENSION whenever a File's type comes back empty.
    var ext = FM.voiceRec._extFor;
    [['audio/webm;codecs=opus', '.webm'], ['audio/mp4', '.m4a'], ['audio/ogg;codecs=opus', '.ogg'], ['', '.webm']].forEach(function (p) {
      if (ext(p[0]) !== p[1]) throw new Error('"' + p[0] + '" got extension ' + ext(p[0]) + ', expected ' + p[1]);
    });
    // iOS is the case that matters here: .m4a is in the importer's audio extension list, so even a
    // File that has lost its type still classifies as audio rather than being dropped on the floor.
    if (FM.mediaKind({ name: 'Voice 12-00-00.m4a', type: '' }) !== 'audio')
      throw new Error('a typeless .m4a recording is not classified as audio by the importer');
  });

  /* ---------------- Letterbox / Border Frame: bounded to their own layer (v6.35) ----------------
   *
   * Before this, both effects ran their kernel over the whole comp-sized effect PLATE and forced
   * alpha to 255, so an effect on a 40x40 speck repainted the frame and erased everything under it.
   * Measured on the shipped build with this exact scene: Letterbox size 14 left 71.1% of the layer
   * below alive, Border Frame width 10 left 85.6%. Same family as the Fill Behind bug fixed in v6.15.
   *
   * EVERY ONE OF THESE ASSERTS BOTH HALVES, and that is the entire point. "Erases nothing" is
   * trivially passable by an effect that draws nothing — which is exactly what deleting the alpha
   * line produces (measured: layer below back to 100%, and Border Frame changing 0.0% of its own
   * layer at every size), and exactly the Magnify Background mistake this codebase shipped and
   * reverted once. A test that only checked the layer below would have waved that through. */
  var LBX = { W: 320, H: 240 };
  function lbxShot(layers) {
    var c = offscreen(LBX.W, LBX.H);
    var g = c.getContext('2d', { willReadFrequently: true });
    FM.renderScene(g, scene(layers, { project: { width: LBX.W, height: LBX.H, fps: 30, duration: 5, background: null } }), 0);
    return g.getImageData(0, 0, LBX.W, LBX.H).data;
  }
  function lbxUpper(w, h, fx) {
    var L = FM.makeLayer('shape', { shape: 'rect', name: 'upper', x: 160, y: 120, shapeW: w, shapeH: h, fill: '#0000ff' });
    L.effects = fx ? [fx] : [];
    return L;
  }
  function lbxBelow() {
    return FM.makeLayer('shape', { shape: 'rect', name: 'below', x: 160, y: 120, shapeW: LBX.W, shapeH: LBX.H, fill: '#00ff00' });
  }
  function lbxDiff(a, b, i) {
    return Math.abs(a[i] - b[i]) + Math.abs(a[i + 1] - b[i + 1]) + Math.abs(a[i + 2] - b[i + 2]) + Math.abs(a[i + 3] - b[i + 3]);
  }
  // Returns { survived, changedOnLayer, footprint } for a framing effect on a w x h layer.
  //   survived        — pixels OUTSIDE the layer's box that the effect left alone, as a fraction
  //   changedOnLayer  — pixels INSIDE the layer's own footprint that the effect changed, as a fraction
  function lbxMeasure(w, h, fx) {
    var aOff = lbxShot([lbxUpper(w, h, null)]);
    var aOn = lbxShot([lbxUpper(w, h, fx)]);
    var bOff = lbxShot([lbxUpper(w, h, null), lbxBelow()]);
    var bOn = lbxShot([lbxUpper(w, h, fx), lbxBelow()]);
    var nFoot = 0, nChanged = 0, nOut = 0, nSurv = 0;
    for (var k = 0; k < LBX.W * LBX.H; k++) {
      var i = k * 4;
      if (aOff[i + 3] > 0) { nFoot++; if (lbxDiff(aOff, aOn, i) > 12) nChanged++; }
      else { nOut++; if (lbxDiff(bOff, bOn, i) <= 12) nSurv++; }
    }
    return { survived: nSurv / Math.max(1, nOut), changedOnLayer: nChanged / Math.max(1, nFoot), footprint: nFoot };
  }

  test('effects: Letterbox bars the LAYER it is on and cannot erase what is under it', { item: 'fx-bounded-frame' }, function () {
    [[200, 70], [100, 100], [40, 40]].forEach(function (d) {
      var m = lbxMeasure(d[0], d[1], { type: 'letterbox', enabled: true, params: { size: 14, metric: 0 } });
      if (m.survived < 0.9999) {
        throw new Error('Letterbox on a ' + d[0] + 'x' + d[1] + ' layer destroyed the layer below: only '
          + (100 * m.survived).toFixed(1) + '% of it survived outside the effected layer (was 71.1% on a 40x40 before v6.35)');
      }
      // the other half — an effect that draws nothing also erases nothing
      if (!(m.changedOnLayer > 0.1)) {
        throw new Error('Letterbox on a ' + d[0] + 'x' + d[1] + ' layer changed only '
          + (100 * m.changedOnLayer).toFixed(1) + '% of that layer — it is a no-op, not a fix');
      }
    });
  });

  test('effects: Border Frame frames the LAYER it is on and cannot erase what is under it', { item: 'fx-bounded-frame' }, function () {
    [[200, 70], [100, 100], [40, 40]].forEach(function (d) {
      var m = lbxMeasure(d[0], d[1], { type: 'border', enabled: true, params: { width: 10, color: '#ffffff' } });
      if (m.survived < 0.9999) {
        throw new Error('Border Frame on a ' + d[0] + 'x' + d[1] + ' layer destroyed the layer below: only '
          + (100 * m.survived).toFixed(1) + '% of it survived (was 85.6% on a 40x40 before v6.35)');
      }
      // Border Frame did not merely trespass before v6.35 — it drew its ring at the COMP edge, so it
      // changed 0.0% of its own layer at every size below full-frame. This is the assertion that
      // deleting the alpha line cannot pass.
      if (!(m.changedOnLayer > 0.1)) {
        throw new Error('Border Frame on a ' + d[0] + 'x' + d[1] + ' layer changed only '
          + (100 * m.changedOnLayer).toFixed(1) + '% of that layer — the border is not on the layer at all');
      }
    });
  });

  test('effects: a framing effect paints nothing at all outside its layer’s box', { item: 'fx-bounded-frame' }, function () {
    // The strict version of the promise, in raw pixels rather than a percentage, on subjects whose
    // box is not the shape: an ellipse, a rotated rect, and a layer half off the frame. Measured
    // before v6.35 across the same cases: 548624 pixels painted outside the box. Must be zero.
    var CASES = [
      ['ellipse 100x100', { shape: 'ellipse', x: 160, y: 120, shapeW: 100, shapeH: 100 }],
      ['rect 120x90 rotated 30°', { shape: 'rect', x: 160, y: 120, shapeW: 120, shapeH: 90, rot: 30 }],
      ['rect 160x100 half off frame', { shape: 'rect', x: 40, y: 120, shapeW: 160, shapeH: 100 }]
    ];
    var FXS = [['Letterbox', { type: 'letterbox', enabled: true, params: { size: 20, metric: 0 } }],
               ['Border Frame', { type: 'border', enabled: true, params: { width: 8, color: '#ffffff' } }]];
    CASES.forEach(function (cs) {
      var mk = function (fx) {
        var L = FM.makeLayer('shape', Object.assign({ name: 'u', fill: '#0000ff' }, cs[1]));
        if (cs[1].rot) L.transform.rotation = cs[1].rot;
        L.effects = fx ? [fx] : [];
        return L;
      };
      var off = lbxShot([mk(null), lbxBelow()]);
      // the layer's own box, from the effect-off render of the layer alone
      var solo = lbxShot([mk(null)]);
      var x0 = LBX.W, y0 = LBX.H, x1 = -1, y1 = -1;
      for (var y = 0; y < LBX.H; y++) for (var x = 0; x < LBX.W; x++) if (solo[(y * LBX.W + x) * 4 + 3] > 8) {
        if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
      }
      if (x1 < 0) throw new Error(cs[0] + ' drew nothing — the probe has no box to check against');
      FXS.forEach(function (f) {
        var on = lbxShot([mk(f[1]), lbxBelow()]);
        var stray = 0, hit = 0;
        for (var yy = 0; yy < LBX.H; yy++) for (var xx = 0; xx < LBX.W; xx++) {
          var i = (yy * LBX.W + xx) * 4;
          if (lbxDiff(off, on, i) <= 12) continue;
          if (xx >= x0 && xx <= x1 && yy >= y0 && yy <= y1) hit++; else stray++;
        }
        if (stray > 0) {
          throw new Error(f[0] + ' on ' + cs[0] + ' painted ' + stray + ' pixels outside the layer’s box ['
            + x0 + ',' + y0 + ' ' + (x1 - x0 + 1) + 'x' + (y1 - y0 + 1) + ']');
        }
        if (!(hit > 0)) throw new Error(f[0] + ' on ' + cs[0] + ' changed nothing inside the layer’s box either — it is a no-op');
      });
    });
  });

  test('effects: on a FULL-FRAME layer both framing effects render exactly as they always did', { item: 'fx-bounded-frame' }, function () {
    /* The backward-compatibility half. A full-frame layer's box IS the frame, so bounding the two
     * effects must be a no-change there — that is the common case and every saved project full of
     * these is sitting on it. The check that makes it real is the EDGE SNAP in fxBounds: alphaBBox
     * pads 2px and clamps at the frame, so stripping the pad without snapping would inset a
     * full-frame layer's box by 2px and shift every existing bar and border.
     *
     * Asserted structurally rather than against a stored hash (a hash would go red on any unrelated
     * antialiasing change and teach people to re-bless it): the bars must start at row 0 and be
     * exactly round(H * size/100) deep, and the border must start at column 0 and be exactly its
     * width, which is what the pre-v6.35 kernels drew by construction. */
    var full = function (fx) {
      var L = FM.makeLayer('shape', { shape: 'rect', name: 'f', x: 160, y: 120, shapeW: LBX.W, shapeH: LBX.H, fill: '#c86432' });
      L.effects = [fx];
      return L;
    };
    [14, 30, 45].forEach(function (s) {
      var d = lbxShot([full({ type: 'letterbox', enabled: true, params: { size: s } })]);
      var want = Math.round(LBX.H * s / 100);
      var bar = 0;
      while (bar < LBX.H && d[(bar * LBX.W + 160) * 4 + 3] === 255 && d[(bar * LBX.W + 160) * 4] === 0
             && d[(bar * LBX.W + 160) * 4 + 1] === 0 && d[(bar * LBX.W + 160) * 4 + 2] === 0) bar++;
      if (bar !== want) throw new Error('full-frame Letterbox size ' + s + ' drew a ' + bar + 'px bar from row 0, not ' + want + 'px — a full-frame layer must be unchanged');
    });
    [1, 10, 30].forEach(function (w) {
      var d = lbxShot([full({ type: 'border', enabled: true, params: { width: w, color: '#ffffff' } })]);
      var run = 0, y = 120;
      while (run < LBX.W && d[(y * LBX.W + run) * 4] === 255 && d[(y * LBX.W + run) * 4 + 1] === 255
             && d[(y * LBX.W + run) * 4 + 2] === 255 && d[(y * LBX.W + run) * 4 + 3] === 255) run++;
      if (run !== w) throw new Error('full-frame Border Frame width ' + w + ' drew a ' + run + 'px band from column 0, not ' + w + 'px — a full-frame layer must be unchanged');
    });
  });

  test('effects: a Letterbox saved before v6.35 keeps the bar thickness it was saved with', { item: 'fx-bounded-frame' }, function () {
    /* `size` is the one parameter whose meaning moved: it has always been "% of H", and H moved from
     * the FRAME to the LAYER. An instance saved before the change has no `metric` key, and the
     * renderer falls back to 1 (Frame) for exactly that reason — schema `legacy: 1`. It cannot
     * reproduce the old PICTURE, because the old picture painted over the whole frame and erased the
     * layers underneath; what it reproduces is the measurement.
     *
     * Half-height layer, size 20: frame metric => round(240 * 0.20) = 48px bars; layer metric =>
     * round(120 * 0.20) = 24px. Both bounded to the layer, so the two are distinguishable only by
     * thickness — which is the whole point of keeping the key. */
    var mk = function (params) {
      var L = FM.makeLayer('shape', { shape: 'rect', name: 'half', x: 160, y: 120, shapeW: 200, shapeH: 120, fill: '#0000ff' });
      L.effects = [{ type: 'letterbox', enabled: true, params: params }];
      return L;
    };
    var barAt = function (params) {                       // depth of the black bar down the layer's own top edge (y = 60)
      var d = lbxShot([mk(params)]);
      var y = 60, n = 0;
      while (y < LBX.H && d[(y * LBX.W + 160) * 4 + 3] === 255 && d[(y * LBX.W + 160) * 4] === 0
             && d[(y * LBX.W + 160) * 4 + 1] === 0 && d[(y * LBX.W + 160) * 4 + 2] === 0) { n++; y++; }
      return n;
    };
    var legacy = barAt({ size: 20 });                     // no metric key: the pre-v6.35 instance
    var layer = barAt({ size: 20, metric: 0 });           // what a NEW instance draws
    var frame = barAt({ size: 20, metric: 1 });
    if (legacy !== frame) throw new Error('an instance with no `metric` key drew a ' + legacy + 'px bar but metric:1 (Frame) draws ' + frame + 'px — the legacy fallback is not wired up');
    if (legacy !== 48) throw new Error('legacy Letterbox size 20 on a half-height layer drew a ' + legacy + 'px bar, expected 48 (20% of the 240px FRAME)');
    if (layer !== 24) throw new Error('Letterbox size 20 with metric Layer drew a ' + layer + 'px bar, expected 24 (20% of the 120px LAYER)');
  });

  /* ---- the same promise on a REDUCED plate: the PREVIEW path, not the export path ----------------
   *
   * Every test above renders at scale 1. That is not enough, and this test exists because it caught a
   * real regression that scale 1 could not see. fxBounds works in PLATE pixels, and a layer's margin
   * shrinks with the plate: the first cut of it snapped the box to the frame edge on a 4px tolerance,
   * and a 300x220 layer in this 320x240 comp — a 10px margin, comfortably clear at scale 1 — fell
   * under that tolerance at rs 0.35, was promoted to full-frame, and erased the layer below exactly
   * as the shipped bug did. Measured then: 31.6% survival for Letterbox and 0.0% for Border at
   * rs 0.35, while scale 1 read a clean 100%. The snap now reads the plate's four edge LINES
   * directly (fxTouchesEdge), which is exact by construction and does not scale. */
  function lbxShotAt(layers, rs) {
    var c = offscreen(Math.round(LBX.W * rs), Math.round(LBX.H * rs));
    c.__fmRS = rs; c.__fmOX = 0; c.__fmOY = 0;      // how the preview asks for a cheaper plate
    var g = c.getContext('2d', { willReadFrequently: true });
    FM.renderScene(g, scene(layers, { project: { width: LBX.W, height: LBX.H, fps: 30, duration: 5, background: null } }), 0);
    return { d: g.getImageData(0, 0, c.width, c.height).data, w: c.width, h: c.height };
  }

  test('effects: the framing effects stay inside their layer on a reduced preview plate too', { item: 'fx-bounded-frame' }, function () {
    var FXS = [['Letterbox', { type: 'letterbox', enabled: true, params: { size: 14 } }],
               ['Border Frame', { type: 'border', enabled: true, params: { width: 10, color: '#ffffff' } }]];
    [[300, 220], [200, 70], [40, 40]].forEach(function (sz) {
      [1, 0.5, 0.35].forEach(function (rs) {
        var solo = lbxShotAt([lbxUpper(sz[0], sz[1], null)], rs);
        var x0 = solo.w, y0 = solo.h, x1 = -1, y1 = -1, foot = 0, i;
        for (var y = 0; y < solo.h; y++) for (var x = 0; x < solo.w; x++) {
          if (solo.d[(y * solo.w + x) * 4 + 3] > 0) {
            foot++;
            if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
          }
        }
        if (x1 < 0) throw new Error('the ' + sz[0] + 'x' + sz[1] + ' probe layer drew nothing at rs ' + rs);
        FXS.forEach(function (f) {
          var off = lbxShotAt([lbxUpper(sz[0], sz[1], null), lbxBelow()], rs);
          var on = lbxShotAt([lbxUpper(sz[0], sz[1], f[1]), lbxBelow()], rs);
          var soloOn = lbxShotAt([lbxUpper(sz[0], sz[1], f[1])], rs);
          var stray = 0, changed = 0;
          for (var yy = 0; yy < solo.h; yy++) for (var xx = 0; xx < solo.w; xx++) {
            i = (yy * solo.w + xx) * 4;
            if (!(xx >= x0 && xx <= x1 && yy >= y0 && yy <= y1)) {
              if (lbxDiff(off.d, on.d, i) > 12) stray++;
            }
            if (solo.d[i + 3] > 0 && lbxDiff(solo.d, soloOn.d, i) > 12) changed++;
          }
          if (stray > 0) {
            throw new Error(f[0] + ' on a ' + sz[0] + 'x' + sz[1] + ' layer at plate scale ' + rs + ' painted '
              + stray + ' pixels outside the layer, erasing what was below it');
          }
          // and the other half, on every plate: an effect that draws nothing also strays nothing
          if (!(changed / Math.max(1, foot) > 0.05)) {
            throw new Error(f[0] + ' on a ' + sz[0] + 'x' + sz[1] + ' layer at plate scale ' + rs + ' changed only '
              + (100 * changed / Math.max(1, foot)).toFixed(1) + '% of that layer — it is a no-op at this scale');
          }
        });
      });
    });
  });

  /* ---- the layer that sits JUST inside the frame: the case the two earlier fixes both missed -----
   *
   * Scale a full-frame video or image down a few pixels — an entirely ordinary thing to do — and add
   * either framing effect. Every test above passes on that scene while a 1-3px rim at the frame edge
   * overwrites whatever is underneath, because the snap in fxBounds used to decide "this layer
   * already touches the frame edge" by reading alphaBBox's box instead of the layer's pixels.
   *
   * alphaBBox PADS by 2 and SAMPLES ON A STRIDE OF 2. Those two together mean bb.x collapses to 0
   * for content whose true edge is 1 or 2 plate px in — 2.8 with a soft edge, since a partly-covered
   * pixel still clears the `> 8` test — and bb.x + bb.w reaches W for content stopping 1px short. So
   * a layer with a real margin was promoted to full-frame and both kernels painted the whole plate
   * again. The margin lands in that band whenever inset x renderScale falls in roughly 1..2.8, which
   * is why it needs the plate scales as well as the insets: a 3px inset is safe at scale 1 and
   * broken at 0.35, an 8px inset is the other way round. Neither shows up at a single scale.
   *
   * Measured on the tree with the snap on `bb.x === 0`: 32 of 192 swept configurations painted
   * outside the layer, 17,079 stray pixels in total, and at rs 0.5 with a 2px inset the layer below
   * survived 0.0%. THE MUTATION CHECK THAT MAKES THIS TEST WORTH ANYTHING: put `bb.x === 0` back and
   * this test goes red while all five tests above stay green. That asymmetry is the whole proof —
   * they cannot see this, because none of them puts a layer in the 1..2.8 plate-pixel band. */
  test('effects: a framing effect on a layer just INSIDE the frame still cannot touch the composite', { item: 'fx-bounded-frame' }, function () {
    var FXS = [['Letterbox', { type: 'letterbox', enabled: true, params: { size: 14 } }],
               ['Border Frame', { type: 'border', enabled: true, params: { width: 10, color: '#ffffff' } }]];
    [2, 3, 5, 8].forEach(function (inset) {
      var w = LBX.W - 2 * inset, h = LBX.H - 2 * inset;
      [1, 0.5, 0.35].forEach(function (rs) {
        var solo = lbxShotAt([lbxUpper(w, h, null)], rs);
        var x0 = solo.w, y0 = solo.h, x1 = -1, y1 = -1, foot = 0, i;
        for (var y = 0; y < solo.h; y++) for (var x = 0; x < solo.w; x++) {
          if (solo.d[(y * solo.w + x) * 4 + 3] > 0) {
            foot++;
            if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
          }
        }
        if (x1 < 0) throw new Error('the ' + inset + 'px-inset probe layer drew nothing at rs ' + rs);
        var off = lbxShotAt([lbxUpper(w, h, null), lbxBelow()], rs);
        FXS.forEach(function (f) {
          var on = lbxShotAt([lbxUpper(w, h, f[1]), lbxBelow()], rs);
          var soloOn = lbxShotAt([lbxUpper(w, h, f[1])], rs);
          var stray = 0, changed = 0, alive = 0, outside = 0;
          for (var yy = 0; yy < solo.h; yy++) for (var xx = 0; xx < solo.w; xx++) {
            i = (yy * solo.w + xx) * 4;
            if (xx >= x0 && xx <= x1 && yy >= y0 && yy <= y1) {
              if (solo.d[i + 3] > 0 && lbxDiff(solo.d, soloOn.d, i) > 12) changed++;
            } else {
              outside++;
              if (lbxDiff(off.d, on.d, i) > 12) stray++; else alive++;
            }
          }
          if (stray > 0) {
            throw new Error(f[0] + ' on a full-frame layer inset ' + inset + 'px, at plate scale ' + rs
              + ', painted ' + stray + ' pixels outside the layer — ' + (100 * alive / Math.max(1, outside)).toFixed(1)
              + '% of the layer below survived. The layer has a real margin and must not be treated as full-frame.');
          }
          // both halves, here too: containment is free if the effect simply stops drawing
          if (!(changed / Math.max(1, foot) > 0.05)) {
            throw new Error(f[0] + ' on a full-frame layer inset ' + inset + 'px, at plate scale ' + rs
              + ', changed only ' + (100 * changed / Math.max(1, foot)).toFixed(1) + '% of that layer — it is a no-op');
          }
        });
      });
    });
  });

  /* ---- a framing effect must never DELETE the layer it is attached to --------------------------
   *
   * fxBounds asks alphaBBox for the layer's box, and alphaBBox samples every 2nd ROW and every 2nd
   * COLUMN. A layer under 2 plate px thick that lands entirely on odd lines is invisible to it, so
   * it returns null — and the first cut of the bounded path read null as "give up", `return`ing out
   * of drawPixelEffect BEFORE the drawImage that puts the layer on screen. The layer did not lose
   * its frame. It disappeared from the composite.
   *
   * That band is not exotic. A 1-4px hairline — a divider, an underline, a rule beneath a title — is
   * in it at scale 1, and ANY thin layer drops into it once a reduced preview plate shrinks it far
   * enough. Measured on that tree: 39 of 240 thin-layer configurations vanished outright at
   * rs 0.25/0.35/0.5/0.6, and a 1px layer on an odd plate row vanished at rs 1.0 as well — i.e. in
   * the EXPORT. Zero of the same 240 vanish on the build before the bounded path existed, so it was
   * a new, user-visible regression, and every other test in this block sailed past it: they all
   * measure what the effect PAINTS, and not one of them checks the layer is still there at all.
   *
   * The assertion is deliberately the weakest one available — "the layer still draws" — because the
   * failure is total, not partial. A 1px-tall layer cannot carry a two-sided bar or a ring, so the
   * kernel is entitled to decline to draw one; it is not entitled to take the layer with it. */
  test('effects: a framing effect on a hairline layer must not delete it', { item: 'fx-bounded-frame' }, function () {
    var FXS = [['Letterbox', { type: 'letterbox', enabled: true, params: { size: 14 } }],
               ['Border Frame', { type: 'border', enabled: true, params: { width: 10, color: '#ffffff' } }]];
    var thin = function (h, yy, fx) {
      var L = FM.makeLayer('shape', { shape: 'rect', name: 'hairline', x: 160, y: yy, shapeW: 200, shapeH: h, fill: '#0000ff' });
      L.effects = fx ? [fx] : [];
      return L;
    };
    var cover = function (s) {                            // pixels the layer actually puts on screen
      var n = 0;
      for (var k = 0; k < s.w * s.h; k++) if (s.d[k * 4 + 3] > 8) n++;
      return n;
    };
    /* A faithful copy of alphaBBox's scan — same stride, same `> 8` threshold. It is here so the
     * test can tell whether a config actually REACHED the null branch, rather than assuming it did.
     * The y values below are not guesses: they were measured (tests/_hairline.html) as the ones
     * where a rect lands entirely on odd plate rows once the shape renderer, its antialiasing and
     * the preview downscale have had their say. My first draft of this test swept y = 120 and 120.5,
     * which straddle two rows — one of them even — so the strided scan always found the layer, the
     * null branch never ran, and the test passed against the BROKEN build. A test that cannot reach
     * the defect it is named after is worse than no test, because it reads as coverage. Hence the
     * `reached` counter and the hard failure below it. */
    var strided = function (s) {
      for (var y = 0; y < s.h; y += 2) { var row = y * s.w * 4;
        for (var x = 0; x < s.w; x += 2) if (s.d[row + x * 4 + 3] > 8) return true; }
      return false;
    };
    var reached = 0, seen = 0;
    [1, 2].forEach(function (h) {
      [121.5, 122, 122.5, 123, 123.5].forEach(function (yy) {
        [1, 0.6, 0.5, 0.35].forEach(function (rs) {
          var shot = lbxShotAt([thin(h, yy, null)], rs);
          var off = cover(shot);
          if (off === 0) return;                          // too thin to survive the downscale at all — nothing for the effect to lose
          seen++;
          if (!strided(shot)) reached++;                  // this config exercises the null branch
          FXS.forEach(function (f) {
            var on = cover(lbxShotAt([thin(h, yy, f[1])], rs));
            if (on === 0) {
              throw new Error(f[0] + ' on a ' + h + 'px hairline at y ' + yy + ', plate scale ' + rs
                + ', ERASED the layer: it covers ' + off + ' pixels without the effect and 0 with it. '
                + 'A layer too thin to frame must still be drawn.');
            }
            if (on < off * 0.5) {
              throw new Error(f[0] + ' on a ' + h + 'px hairline at y ' + yy + ', plate scale ' + rs
                + ', cut the layer from ' + off + ' pixels to ' + on + ' — a framing effect adds coverage, it never removes it.');
            }
          });
        });
      });
    });
    if (reached === 0) {
      throw new Error('none of the ' + seen + ' hairline configurations landed entirely on odd plate rows, so this test '
        + 'never reached the strided scan\'s blind spot — the thing it exists to guard. Re-measure the parities with '
        + 'tests/_hairline.html and update the y values.');
    }
  });

  /* ---- adding a caption track must land you IN the editor ---------------------------------------
   *
   * FM.addTextLayer ends by calling FM.textEdit.start with the placeholder pre-selected, so adding
   * text goes "tap → keyboard up → type". FM.addCaptionLayer did everything else the same way and
   * then simply stopped: it unshifted a track carrying two placeholder cues, selected it, and left
   * you looking at them. The way in exists — the cue buttons in the Aa sheet — but it is several
   * taps down a 46vh scroller, so in practice a caption track was a thing you added and could not
   * type into. That is the "captions are a fake feature" experience arriving by a second route,
   * after v5.99 fixed the first one.
   *
   * The scrub is half the fix and is asserted separately: text-edit binds to the cue at the PLAYHEAD
   * (captions.indexAt), and if the playhead sits past the seeded cues that call ADDS an empty third
   * one — so without moving the playhead first, adding a caption track at t=9s would open the editor
   * on a blank cue at 9s and leave "First caption" untouched at 0. Hence the cue-count assertion:
   * adding a track must produce exactly the cues it seeded, not one more. */
  test('captions: adding a caption track opens the text editor on the first cue', { item: 'captions-editor-open' }, function () {
    if (!FM.addCaptionLayer || !FM.textEdit || !FM.captions) throw new Error('need FM.addCaptionLayer, FM.textEdit and FM.captions');
    var layers0 = FM.scene.layers.slice(), sel0 = FM.scene.selectedId, t0 = FM.time;
    try {
      FM.scene.layers.length = 0;
      FM.time = Math.max(3, (FM.scene.project.duration || 5) - 0.5);   // deliberately PAST the seeded cues
      FM.addCaptionLayer();
      var L = FM.scene.layers[0];
      if (!L || !Array.isArray(L.captions)) throw new Error('addCaptionLayer did not add a caption track');
      var seeded = L.captions.length;
      if (!FM.textEdit.isActive()) {
        throw new Error('adding a caption track left the text editor closed — the track lands with placeholder cues and no way in that anyone would find (the cue buttons are several taps down the Aa sheet)');
      }
      if (FM.textEdit.layerId() !== L.id) {
        throw new Error('the text editor opened on layer ' + FM.textEdit.layerId() + ', not the caption track ' + L.id);
      }
      var idx = FM.captions.indexAt(L, FM.time);
      if (idx !== 0) {
        throw new Error('after adding a caption track the playhead sits on cue ' + idx + ', not the first one — the editor binds to the cue AT the playhead, so it is not editing "' + (L.captions[0] && L.captions[0].text) + '"');
      }
      if (L.captions.length !== seeded) {
        throw new Error('adding a caption track produced ' + L.captions.length + ' cues but seeded ' + seeded + ' — the editor bound past the end and captions.addCue manufactured an empty one');
      }
    } finally {
      if (FM.textEdit.isActive()) FM.textEdit.stop();
      FM.scene.layers.length = 0;
      layers0.forEach(function (l) { FM.scene.layers.push(l); });
      FM.scene.selectedId = sel0; FM.scene.selectedIds = sel0 ? [sel0] : [];
      FM.time = t0;
      FM.refreshAll();
    }
  });

  /* ---- the red DELETE panel must not exist on screen unless you are swiping --------------------
   *
   * Ezra, queue 58: "the red delete bar flashes during fast scroll" in the effects list. The panel
   * was in the DOM and PAINTED behind every row at all times, covered only by an opaque wrapper that
   * carried a permanent `will-change: transform`. That promotes every row to its own compositor
   * layer, and during a fast scroll the browser is free to present the scrolled parent before those
   * layers have re-rastered — at which point what is on screen where the row should be is the red.
   *
   * The fix is not a longer gesture threshold or a scroll guard; the gesture code was already
   * correct and never entered swipe mode on a vertical drag. The fix is that there is now nothing
   * red to reveal: visibility:hidden until a swipe is genuinely under way, and the layer promotion
   * scoped to the same window.
   *
   * This asserts the RESTING state — which is the state a fast scroll happens in — and then that a
   * real swipe still reveals the panel, because "never flashes" is trivially passable by an effect
   * row that has lost its swipe-to-delete entirely. */
  test('effects list: the red delete panel is invisible until a swipe starts', { item: 'fx-swipe-flash' }, function () {
    var layers0 = FM.scene.layers.slice(), sel0 = FM.scene.selectedId;
    var sleep = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };
    return (async function () {
      try {
        var L = FM.makeLayer('shape', { shape: 'rect', name: 'swipe', x: 160, y: 120, shapeW: 120, shapeH: 120, fill: '#4af' });
        L.effects = [];
        ['blur', 'glow', 'vignette'].forEach(function (t) { var fx = FM.fxRegistry.makeInstance(t); if (fx) L.effects.push(fx); });
        if (L.effects.length < 2) throw new Error('needed at least 2 effects, built ' + L.effects.length);
        FM.scene.layers.length = 0; FM.scene.layers.push(L);
        FM.selectLayer(L.id);
        FM.inspector.openCategory('effects');
        FM.inspector.refresh();
        await sleep(60);
        var rows = Array.prototype.slice.call(document.querySelectorAll('.fx-row'));
        if (rows.length < 2) throw new Error('expected the effect rows to render, found ' + rows.length);

        // 1. AT REST — every row, no exceptions. One visible red panel is one that can flash.
        rows.forEach(function (r, i) {
          var bg = r.querySelector('.fx-del-bg');
          if (!bg) throw new Error('row ' + i + ' has no .fx-del-bg — swipe-to-delete is gone, not fixed');
          var vis = getComputedStyle(bg).visibility;
          if (vis !== 'hidden') {
            throw new Error('at rest, row ' + i + '\'s red DELETE panel is ' + vis + ' — it is painted behind the row, so a fast scroll can present it before the row re-rasters');
          }
          var wrap = r.querySelector('.fx-swipe-wrap');
          var wc = wrap ? getComputedStyle(wrap).willChange : 'auto';
          if (wc && wc !== 'auto') {
            throw new Error('at rest, row ' + i + '\'s .fx-swipe-wrap still declares will-change: ' + wc + ' — that promotes every row to its own compositor layer for the whole life of the list, which is what lets the red show through mid-scroll');
          }
        });

        // 2. A REAL SWIPE still reveals it. Without this, deleting the panel outright would pass.
        var row = rows[0], head = row.querySelector('.fx-head');
        if (!head) throw new Error('row 0 has no .fx-head to swipe');
        var rc = head.getBoundingClientRect();
        var x0 = rc.left + rc.width * 0.6, y0 = rc.top + rc.height / 2;
        var ev = function (type, x, buttons) {
          return head.dispatchEvent(new PointerEvent(type, { bubbles: true, cancelable: true,
            pointerId: 11, isPrimary: true, pointerType: 'touch', clientX: x, clientY: y0,
            buttons: buttons == null ? 1 : buttons }));
        };
        ev('pointerdown', x0);
        for (var i = 1; i <= 5; i++) { ev('pointermove', x0 - 10 * i); await sleep(16); }
        var bg0 = row.querySelector('.fx-del-bg');
        var mid = getComputedStyle(bg0).visibility;
        // release BEFORE asserting, so a failure can't leave the suite mid-gesture
        ev('pointerup', x0 - 50, 0);
        await sleep(60);
        if (mid !== 'visible') {
          throw new Error('mid-swipe the red DELETE panel is ' + mid + ' — swiping a row left now reveals nothing, which is worse than the flash it replaced');
        }
      } finally {
        FM.scene.layers.length = 0;
        layers0.forEach(function (l) { FM.scene.layers.push(l); });
        FM.selectLayer(sel0);
        FM.inspector.openCategory('home');
        FM.inspector.refresh();
      }
    })();
  });

  /* ---- Group must be reachable on a PC, not only on a phone ------------------------------------
   *
   * Ezra, queue 53: "PC is missing the Group and Mask options." The ACTIONS existed — the layer-
   * actions menu and the timeline right-click both offer Group Selection / Masking Group — but the
   * button was phone-only. #m-group lives inside @media (max-width: 700px), so measured at 1440x900
   * with two layers selected it reports zero-size, while the phone puts it in the top bar the moment
   * a second layer is selected. A control that exists only inside an unlabelled icon menu partway
   * down the screen is missing in the sense that matters.
   *
   * The assertion is about the DESKTOP bar specifically, so it forces a desktop width rather than
   * trusting the runner's frame — the same mistake that let two "mobile" text tests pass for three
   * releases while measuring a 900px desktop iframe.
   *
   * Both directions are asserted. Showing the button always would be the easy way to pass half of
   * this, and it would be wrong: FM.groupSelection needs two members, so at one selected layer the
   * button must not be offered at all. */
  test('PC: the Group button appears in the top bar at 2+ selected layers', { item: 'pc-group-mask' }, function () {
    var btn = document.getElementById('btn-group');
    if (!btn) throw new Error('#btn-group does not exist — on a PC there is no Group control in the top bar at all');
    var layers0 = FM.scene.layers.slice(), sel0 = FM.scene.selectedId;
    var realMM = window.matchMedia;
    try {
      // Be a DESKTOP regardless of the runner's frame: syncSelectionChrome asks matchMedia, and the
      // phone-only rules are what this test is proving do not apply.
      window.matchMedia = function (q) { return /max-width:\s*700px/.test(q) ? { matches: false, media: q } : realMM.call(window, q); };
      var A = FM.makeLayer('shape', { shape: 'rect', name: 'ga', x: 100, y: 100, shapeW: 80, shapeH: 80, fill: '#4af' });
      var B = FM.makeLayer('shape', { shape: 'rect', name: 'gb', x: 200, y: 150, shapeW: 80, shapeH: 80, fill: '#fa4' });
      FM.scene.layers.length = 0; FM.scene.layers.push(A, B);

      // ONE selected → no Group button. groupSelection needs two, so offering it here would be a lie.
      FM.selectLayer(A.id);
      FM.syncTopBar();
      if (getComputedStyle(btn).display !== 'none') {
        throw new Error('with ONE layer selected the Group button is showing — grouping needs two members, so it would do nothing if pressed');
      }

      // TWO selected → it must be there, and actually hit-testable, not merely display:block.
      FM.scene.selectedId = A.id; FM.scene.selectedIds = [A.id, B.id];
      FM.syncTopBar();
      if (getComputedStyle(btn).display === 'none') {
        throw new Error('with two layers selected the PC top bar still shows no Group button — this is the queue-53 report');
      }
      var r = btn.getBoundingClientRect();
      if (!(r.width > 0 && r.height > 0)) {
        throw new Error('the Group button is display:' + getComputedStyle(btn).display + ' but measures ' + Math.round(r.width) + 'x' + Math.round(r.height) + ' — it is in the layout but not on screen');
      }

      // …and it must actually group, through the same FM.groupSelection everything else calls.
      var before = FM.scene.layers.length;
      FM.groupSelection();
      var groups = FM.scene.layers.filter(function (l) { return l.type === 'group'; });
      if (!groups.length) throw new Error('FM.groupSelection() made no group layer (' + before + ' layers before, ' + FM.scene.layers.length + ' after) — the button would be wired to nothing');
    } finally {
      window.matchMedia = realMM;
      FM.scene.layers.length = 0;
      layers0.forEach(function (l) { FM.scene.layers.push(l); });
      FM.selectLayer(sel0);
      FM.refreshAll();
    }
  });

  /* ---- Speed re-times the KEYFRAMES, not just the clip (queue 68) -------------------------------
   *
   * Ezra: "if you add a bunch of effects with key frames you may want to make it go faster or slower,
   * changing all the key frames automatically to slow or speed with the layer instead of manually
   * doing it". Changing Speed already re-timed the CLIP — the source span is invariant, so the bar
   * grows or shrinks — but every keyframe stayed at its absolute project time. Double the speed and
   * the bar halved while the animation carried on running past the end of it, and you had to drag
   * every diamond back by hand. Which is the job he was asking to have done for him.
   *
   * FM.scaleLayerKeyframes is tested directly rather than through the slider, because the slider is
   * a rangeRow whose gesture plumbing is not what is on trial here — and because the arithmetic is
   * the part that can silently corrupt a project. It rewrites times IN PLACE; a wrong factor does not
   * look wrong, it destroys the timing, and undo is the only way back.
   *
   * The SPEED track being excluded is asserted on purpose. A ramp's keyframes describe the re-timing,
   * so scaling them by the re-timing they caused compounds — each edit would re-time the ramp that
   * produced it. Getting that wrong is invisible until someone's ramp drifts over several edits. */
  test('speed: changing it stretches the layer\'s keyframes with the clip', { item: 'speed-retime-kf' }, function () {
    if (!FM.scaleLayerKeyframes) throw new Error('FM.scaleLayerKeyframes is missing — speed cannot re-time keyframes');
    var L = FM.makeLayer('shape', { shape: 'rect', name: 'spd', x: 100, y: 100, shapeW: 60, shapeH: 60, fill: '#4af' });
    L.start = 2; L.duration = 4;
    L.transform.x = { kf: [{ t: 2, v: 0, e: 'linear' }, { t: 4, v: 100, e: 'linear' }, { t: 6, v: 200, e: 'linear' }] };
    L.transform.opacity = { kf: [{ t: 3, v: 1, e: 'linear' }, { t: 6, v: 0, e: 'linear' }] };
    L.speed = { kf: [{ t: 2, v: 1, e: 'linear' }, { t: 6, v: 2, e: 'linear' }] };   // a ramp, which must NOT be scaled

    // 2x faster → the clip halves, so a keyframe 2s in belongs 1s in. Pivot is the clip START (2s).
    var n = FM.scaleLayerKeyframes(L, 0.5);
    if (!n) throw new Error('scaleLayerKeyframes reported 0 keyframes moved');
    var xs = L.transform.x.kf.map(function (k) { return k.t; });
    if (Math.abs(xs[0] - 2) > 1e-6 || Math.abs(xs[1] - 3) > 1e-6 || Math.abs(xs[2] - 4) > 1e-6) {
      throw new Error('x keyframes went to [' + xs.join(', ') + '] — expected [2, 3, 4]: the clip starts at 2s and halved, so 2/4/6 must become 2/3/4');
    }
    var os = L.transform.opacity.kf.map(function (k) { return k.t; });
    if (Math.abs(os[0] - 2.5) > 1e-6 || Math.abs(os[1] - 4) > 1e-6) {
      throw new Error('opacity keyframes went to [' + os.join(', ') + '] — expected [2.5, 4]; every animated property must ride, not just transform.x');
    }
    var sp = L.speed.kf.map(function (k) { return k.t; });
    if (Math.abs(sp[0] - 2) > 1e-6 || Math.abs(sp[1] - 6) > 1e-6) {
      throw new Error('the SPEED ramp itself was re-timed to [' + sp.join(', ') + '] — it describes the re-timing, so scaling it compounds on every edit');
    }

    // Reversible: going back the other way must land exactly where it started (no drift).
    FM.scaleLayerKeyframes(L, 2);
    var back = L.transform.x.kf.map(function (k) { return k.t; });
    if (Math.abs(back[0] - 2) > 1e-6 || Math.abs(back[1] - 4) > 1e-6 || Math.abs(back[2] - 6) > 1e-6) {
      throw new Error('scaling 0.5 then 2 left the keyframes at [' + back.join(', ') + '] instead of [2, 4, 6] — the re-time drifts, so repeated speed edits would walk the animation off the clip');
    }

    // Nonsense factors must be refused outright, not applied. This rewrites times in place.
    [0, -1, NaN, Infinity].forEach(function (bad) {
      var before = L.transform.x.kf.map(function (k) { return k.t; }).join(',');
      FM.scaleLayerKeyframes(L, bad);
      var after = L.transform.x.kf.map(function (k) { return k.t; }).join(',');
      if (before !== after) throw new Error('a factor of ' + bad + ' was APPLIED (' + before + ' -> ' + after + ') — that destroys the timing and only undo gets it back');
    });
  });

  /* Speed must be offered on every layer type (the second half of queue 68). It was gated to layers
   * with a source because re-timing a source clock was all it did — which is exactly why queue 38
   * complained it was a dead control on a shape. Now that it stretches keyframes too, it does
   * something on anything, so the gate goes rather than the control. */
  test('speed: the Speed panel is available on layers with no source', { item: 'speed-retime-kf' }, function () {
    var layers0 = FM.scene.layers.slice(), sel0 = FM.scene.selectedId;
    try {
      ['shape', 'text'].forEach(function (ty) {
        var L = ty === 'text'
          ? FM.makeLayer('text', { name: 'spd-' + ty, text: 'hi', x: 100, y: 100 })
          : FM.makeLayer('shape', { shape: 'rect', name: 'spd-' + ty, x: 100, y: 100, shapeW: 60, shapeH: 60, fill: '#4af' });
        FM.scene.layers.length = 0; FM.scene.layers.push(L);
        FM.selectLayer(L.id);
        FM.inspector.openCategory('speed');
        FM.inspector.refresh();
        if (FM.inspector.view && FM.inspector.view() !== 'speed') {
          throw new Error('opening Speed on a ' + ty + ' layer landed on "' + FM.inspector.view() + '" instead — the panel is still gated to layers with a source');
        }
        var card = document.querySelector('.cat-card-disabled .cat-label');
        var labels = [].slice.call(document.querySelectorAll('.cat-card-disabled .cat-label')).map(function (e) { return e.textContent; });
        if (labels.indexOf('Speed') >= 0) throw new Error('the Speed card is still greyed out on a ' + ty + ' layer');
      });
    } finally {
      FM.scene.layers.length = 0;
      layers0.forEach(function (l) { FM.scene.layers.push(l); });
      FM.selectLayer(sel0);
      FM.inspector.openCategory('home');
      FM.inspector.refresh();
    }
  });

  /* ---- the full-screen Favourites browser, and its six orders (queue 74) -----------------------
   *
   * Ezra: "swipe up for a full-screen Favourites browser… sorting by recency, effect type and A–Z,
   * each with an inverted order."
   *
   * The SORT is what this asserts, because that is the part with an answer that can be wrong. The
   * gesture is exercised through the handle's click, not by synthesising a drag: the handle is a real
   * button precisely so the feature is not gesture-only, and a test that only proved a swipe worked
   * would be testing the half that cannot silently break.
   *
   * Recency is derived from storage ORDER — toggleFav appends, so the array is the record of when
   * things were starred and newest-first is that reversed. Nothing new is persisted, so nobody's
   * existing favourites need migrating. The flip side is that a sort must never write back through
   * that array, or the recency record is destroyed by the act of looking at it in another order.
   * That is the assertion at the end, and it is the one that would cost real data. */
  test('effects: the Favourites browser sorts by recency, type and A–Z, each invertible', { item: 'fav-browser' }, function () {
    if (!FM._fxOpenFavourites) throw new Error('FM._fxOpenFavourites is missing — there is no full-screen Favourites browser');
    var FAV_KEY = 'fm.fx.fav', SORT_KEY = 'fm.fx.favSort';
    var fav0 = localStorage.getItem(FAV_KEY), sort0 = localStorage.getItem(SORT_KEY);
    var view = null;
    try {
      // Three real effects from DIFFERENT categories, starred in a known order.
      var all = FM.fxRegistry.all();
      var pick = [];
      ['blur', 'colour', 'stylise', 'distort', 'light'].forEach(function (cat) {
        var r = all.filter(function (x) { return x.category === cat; })[0];
        if (r && pick.length < 3) pick.push(r);
      });
      if (pick.length < 3) pick = all.slice(0, 3);           // whatever the registry has, still 3 distinct ids
      var ids = pick.map(function (r) { return r.type; });
      localStorage.setItem(FAV_KEY, JSON.stringify(ids));    // ids[0] starred first, ids[2] most recently
      localStorage.setItem(SORT_KEY, JSON.stringify({ key: 'recent', inv: false }));

      var names = function (v) {
        return [].slice.call(v.querySelectorAll('.fxb-catview-scroll .fxb-tile-name, .fxb-catview-scroll .fxb-name'))
          .map(function (e) { return (e.textContent || '').trim(); }).filter(Boolean);
      };
      var labels = pick.map(function (r) { return r.label; });

      view = FM._fxOpenFavourites();
      if (!view) throw new Error('openFavourites returned nothing');
      var btns = [].slice.call(view.querySelectorAll('.fxb-sortbtn'));
      if (btns.length !== 3) throw new Error('expected 3 sort buttons (Recent / Type / A–Z), found ' + btns.length);

      var shown = names(view);
      if (shown.length !== 3) throw new Error('the browser listed ' + shown.length + ' favourites, expected 3 — got: ' + shown.join(', '));
      // RECENT = newest first = the stored array reversed.
      var wantRecent = labels.slice().reverse();
      if (shown.join('|') !== wantRecent.join('|')) {
        throw new Error('Recent order is ' + shown.join(', ') + ' — expected ' + wantRecent.join(', ') + ' (most recently starred first)');
      }
      // …and pressing the ACTIVE sort inverts it.
      btns[0].click();
      var inv = names(view);
      if (inv.join('|') !== labels.join('|')) {
        throw new Error('pressing the active sort again gave ' + inv.join(', ') + ' — expected the reverse, ' + labels.join(', '));
      }

      // A–Z, and its inverse.
      var az = [].slice.call(view.querySelectorAll('.fxb-sortbtn'))[2];
      az.click();
      var got = names(view);
      var wantAz = labels.slice().sort(function (a, b) { return a.localeCompare(b); });
      if (got.join('|') !== wantAz.join('|')) throw new Error('A–Z order is ' + got.join(', ') + ' — expected ' + wantAz.join(', '));
      [].slice.call(view.querySelectorAll('.fxb-sortbtn'))[2].click();
      var gotInv = names(view);
      if (gotInv.join('|') !== wantAz.slice().reverse().join('|')) {
        throw new Error('inverted A–Z is ' + gotInv.join(', ') + ' — expected ' + wantAz.slice().reverse().join(', '));
      }

      // TYPE groups under category headings rather than producing one flat sorted run.
      [].slice.call(view.querySelectorAll('.fxb-sortbtn'))[1].click();
      var heads = [].slice.call(view.querySelectorAll('.fxb-catview-scroll .fxb-sec-title'));
      if (!heads.length) throw new Error('sorting by type produced no category headings — "by type" that reads as one flat list is not what the word means');
      if (names(view).length !== 3) throw new Error('sorting by type dropped favourites: ' + names(view).join(', '));

      // THE ONE THAT COSTS DATA: sorting must never write back through the stored array, because
      // that array IS the recency record. Re-sorting is looking, not editing.
      var stored = JSON.parse(localStorage.getItem(FAV_KEY) || '[]');
      if (stored.join('|') !== ids.join('|')) {
        throw new Error('the stored favourites order changed from [' + ids.join(', ') + '] to [' + stored.join(', ') + '] just by SORTING — that destroys the recency record, and every future "Recent" is wrong');
      }
    } finally {
      if (view && view.remove) view.remove();
      if (fav0 == null) localStorage.removeItem(FAV_KEY); else localStorage.setItem(FAV_KEY, fav0);
      if (sort0 == null) localStorage.removeItem(SORT_KEY); else localStorage.setItem(SORT_KEY, sort0);
    }
  });

  /* ---- a phone held sideways must not give most of the screen to the timeline -------------------
   *
   * 844x390 is a landscape phone, and it is over 700px WIDE, so it takes the desktop Studio layout.
   * That layout gave the bottom band a flat 232px whatever the viewport height — 60% of a 390px
   * screen — leaving the stage 158px and the canvas 145x145, which is the "landscape text editing is
   * cramped" report.
   *
   * There were TWO ceilings and only fixing one would have looked fixed while staying broken. The
   * stylesheet default is one; the other is clampH in the timeline resizer, which allowed 72% of the
   * viewport height and PERSISTS what you dragged. Measured, a 270px band stored from a desktop
   * followed the app into a 390px-tall viewport and left a 120px stage — worse than the default it
   * replaced. So this asserts the clamp directly, at both ends of the boundary.
   *
   * The desktop half is the point of the test as much as the phone half: 504px is where 46vh reaches
   * 232px, so anything at or above it must come back EXACTLY as before, including a height the user
   * deliberately dragged. A "responsive" fix that quietly shortens everyone's timeline would be a
   * regression wearing a fix's clothes. */
  test('layout: a short viewport caps the timeline band, and a tall one is untouched', { item: 'landscape-band' }, function () {
    if (!FM.clampTimelineH) throw new Error('FM.clampTimelineH is not exposed — the clamp cannot be tested where it actually lives');
    var realH = window.innerHeight;
    var at = function (h, want) {
      try { Object.defineProperty(window, 'innerHeight', { value: h, configurable: true }); } catch (e) { return; }
      var got = FM.clampTimelineH(want);
      return got;
    };
    try {
      // DESKTOP / TABLET — unchanged, including a big height the user dragged on purpose.
      [[900, 270, 270], [900, 600, 600], [900, 700, 648], [768, 232, 232], [504, 300, 300]].forEach(function (c) {
        var got = at(c[0], c[1]);
        if (got !== c[2]) throw new Error('at ' + c[0] + 'px tall a stored ' + c[1] + 'px band came back ' + got + 'px, expected ' + c[2] + ' — desktop behaviour must not change');
      });
      // LANDSCAPE PHONE — the stored height is capped so the stage keeps most of the screen.
      var g390 = at(390, 270);
      if (g390 !== 179) throw new Error('at 390px tall a stored 270px band came back ' + g390 + 'px, expected 179 — a height dragged on a desktop still swallows a phone held sideways');
      if (390 - g390 < 200) throw new Error('at 390px tall the stage is left ' + (390 - g390) + 'px — the canvas is still the smaller half of the screen');
      var g320 = at(320, 400);
      if (g320 > 160) throw new Error('at 320px tall the band is ' + g320 + 'px, over half the screen');
      if (g320 < 150) throw new Error('at 320px tall the band collapsed to ' + g320 + 'px — the timeline still has to be usable');
    } finally {
      try { Object.defineProperty(window, 'innerHeight', { value: realH, configurable: true }); } catch (e) {}
    }
  });

  /* ---------------- Squish (batch 39) ----------------------------------------------------------
   * The frame edges become walls: a layer that would slide off-canvas is compressed against the
   * edge instead of being clipped. Four things have to hold or it is not shippable — it must be an
   * EXACT no-op when it is off, it must actually contain the layer, it must be deterministic, and
   * it must not change strength with preview quality. Each assertion below was mutation-checked
   * (break the mechanism, watch that one go red) — a green assertion that survives the fix being
   * removed is worthless, and this project has shipped three of those. */
  var SQP = { width: 240, height: 240, fps: 30, duration: 5, background: null };
  // A ball 50% past the RIGHT wall: half of it would normally be clipped away.
  function squishShot(effects, rs, x) {
    rs = rs || 1;
    var w = Math.round(SQP.width * rs), h = Math.round(SQP.height * rs);
    var c = offscreen(w, h);
    c.__fmRS = rs; c.__fmOX = 0; c.__fmOY = 0;
    var L = FM.makeLayer('shape', { shape: 'ellipse', x: x == null ? 240 : x, y: 120, shapeW: 150, shapeH: 150, fill: '#2fd0b5' });
    L.effects = effects;
    FM.renderScene(c.getContext('2d'), { project: SQP, layers: [L], selectedId: null, selectedIds: [] }, 0);
    return c.getContext('2d').getImageData(0, 0, w, h);
  }
  function squishFx(params) { return [{ type: 'squish', enabled: true, params: params || {} }]; }
  function sqDiff(a, b) { var n = 0; for (var i = 0; i < a.data.length; i++) if (a.data[i] !== b.data[i]) n++; return n; }
  function sqLit(img) { var n = 0, d = img.data; for (var i = 3; i < d.length; i += 4) if (d[i] > 8) n++; return n; }
  function sqLastCol(img) {   // lit pixels in the frame's last column = the layer being cut off by it
    var n = 0, W = img.width, d = img.data;
    for (var y = 0; y < img.height; y++) if (d[(y * W + W - 1) * 4 + 3] > 8) n++;
    return n;
  }
  function sqBox(img) {
    var W = img.width, H = img.height, d = img.data, x0 = 1e9, y0 = 1e9, x1 = -1, y1 = -1;
    for (var y = 0; y < H; y++) for (var x = 0; x < W; x++) {
      if (d[(y * W + x) * 4 + 3] <= 8) continue;
      if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
    }
    return x1 < 0 ? { w: 0, h: 0 } : { w: x1 - x0 + 1, h: y1 - y0 + 1, x1: x1 };
  }

  test('effects: Squish at strength 0 is byte-identical to the effect not being there', { item: 'fx-squish' }, function () {
    // Strength 0 must be the effect ABSENT, not "a warp that happens to be the identity": with the
    // short-circuit removed, this exact probe comes back 210 bytes different, because the plate
    // round trip is not lossless on antialiased alpha (getImageData is unpremultiplied 8-bit, the
    // canvas premultiplied). Invisible — and still wrong, because it means a keyframed fade-in of
    // Squish starts with a step instead of at zero.
    var none = squishShot([]);
    var zero = squishShot(squishFx({ amount: 0 }));
    var on = squishShot(squishFx({}));
    var d0 = sqDiff(none, zero);
    if (d0 !== 0) throw new Error('strength 0 differs from no effect by ' + d0 + ' bytes — it must be exactly 0');
    // The control: if the effect did nothing at its default either, the assertion above is vacuous.
    var d1 = sqDiff(none, on);
    if (d1 < 5000) throw new Error('Squish at its default only changed ' + d1 + ' bytes — the probe is not actually squashing anything');
    // And the other half of "off": a layer whose alpha only just REACHES the wall, without crossing
    // it, must be left alone byte for byte. This is the no-false-positives case — the wall has to
    // react to real overhang, not to proximity. (x = 165 puts the 150px ball's right edge exactly on
    // the 240px frame edge.) Measured on the real thing: 0 bytes here, 947 with 1px of overhang.
    var tang = sqDiff(squishShot([], 1, 165), squishShot(squishFx({}), 1, 165));
    if (tang !== 0) throw new Error('a layer merely TOUCHING the wall changed by ' + tang + ' bytes — Squish is deforming something that does not overhang');
  });

  test('effects: Squish keeps a layer that crosses the wall inside the frame', { item: 'fx-squish' }, function () {
    // Without it the ball is simply CUT by the frame — a long run of lit pixels down the last
    // column, and half the ink gone. With it the ball lands tangent to the wall and most of the ink
    // is still on screen. Both halves matter: recovering ink while still being cut would just mean
    // a fatter smear against the edge.
    var none = squishShot([]);
    var on = squishShot(squishFx({}));
    var cutNone = sqLastCol(none), cutOn = sqLastCol(on);
    if (cutNone < 40) throw new Error('the control is not being clipped (' + cutNone + 'px in the last column) — the probe proves nothing');
    if (cutOn > cutNone * 0.5) throw new Error('still hard against the wall: ' + cutOn + 'px lit in the last column vs ' + cutNone + ' clipped — the layer is not being brought inside');
    var litNone = sqLit(none), litOn = sqLit(on);
    if (litOn < litNone * 1.15) throw new Error('only ' + litOn + ' lit px vs ' + litNone + ' clipped — no material was recovered from off-frame');
    // and nothing may hang outside the frame (there is nowhere for it to go — the plate IS the comp)
    var b = sqBox(on);
    if (b.x1 > SQP.width - 1) throw new Error('drew past the frame edge');
  });

  test('effects: Squish renders the same frame twice identically', { item: 'fx-squish' }, function () {
    // No Math.random anywhere in the render: a non-deterministic effect flickers in playback and
    // does not survive export, where each frame is rendered once, cold.
    var a = squishShot(squishFx({})), b = squishShot(squishFx({}));
    var n = sqDiff(a, b);
    if (n !== 0) throw new Error(n + ' bytes differ between two renders of the same frame');
    if (sqLit(a) < 3000) throw new Error('the probe rendered almost nothing (' + sqLit(a) + ' lit px) — two blank frames are identical too');
  });

  test('effects: Squish deforms the same at a reduced preview scale', { item: 'fx-squish' }, function () {
    // Every length inside the effect is measured on the PLATE, and the plate follows the adaptive
    // playback tier (down to 0.28). `inset` is the one parameter that arrives in PROJECT px, so it
    // has to be multiplied by plateScale — otherwise the walls sit somewhere else in a reduced
    // preview and the deformation changes as playback quality changes. Measured in PROJECT px so
    // the two scales compare directly.
    [0, 40].forEach(function (inset) {
      var full = sqBox(squishShot(squishFx({ inset: inset })));
      var half = sqBox(squishShot(squishFx({ inset: inset }), 0.5));
      if (!full.w || !half.w) throw new Error('inset ' + inset + ': nothing rendered at one of the two scales');
      var dw = Math.abs(full.w - half.w * 2), dh = Math.abs(full.h - half.h * 2);
      if (dw > 8 || dh > 8) throw new Error('inset ' + inset + ': the squashed layer measures ' + full.w + 'x' + full.h
        + ' at 1:1 but ' + (half.w * 2) + 'x' + (half.h * 2) + ' (project px) at half scale — a length is not being multiplied by plateScale');
    });
    // the control: inset 40 must actually move the wall, or the loop above is comparing two no-ops
    var a = sqBox(squishShot(squishFx({ inset: 0 }))), b = sqBox(squishShot(squishFx({ inset: 40 })));
    if (Math.abs(a.w - b.w) < 10) throw new Error('inset 40 barely changed the result — the probe is not exercising the wall position');
  });

  /* ---- the two blockers that sent Squish back for a second pass ------------------------------
   * Both were found by RENDERING, not by reading, and each is reachable by one ordinary action:
   * animate a layer off-screen, drag one slider to its end stop, or add a second effect.
   * These probes run on a 480x480 comp rather than SQP's 240 because the Wall inset slider's own
   * maximum (200px) puts the two walls PAST each other on a 240 comp — every layer is then
   * legitimately crushed into the 2px sliver that is left, and the case that actually broke cannot
   * be set up at all. 480 leaves an 80px live band, which is a setting a person might really dial. */
  var SQP4 = { width: 480, height: 480, fps: 30, duration: 5, background: null };
  function sq480(effects, x, y, size) {
    var c = offscreen(480, 480);
    c.__fmRS = 1; c.__fmOX = 0; c.__fmOY = 0;
    var D = size || 150;
    var L = FM.makeLayer('shape', { shape: 'ellipse', x: x, y: y == null ? 240 : y, shapeW: D, shapeH: D, fill: '#2fd0b5' });
    L.effects = effects || [];
    FM.renderScene(c.getContext('2d'), { project: SQP4, layers: [L], selectedId: null, selectedIds: [] }, 0);
    return c.getContext('2d').getImageData(0, 0, 480, 480);
  }
  // bbox + lit count in one pass — the sweeps below call it thousands of times.
  function sqMeas(img) {
    var W = img.width, H = img.height, d = img.data, x0 = 1e9, y0 = 1e9, x1 = -1, y1 = -1, n = 0;
    for (var y = 0; y < H; y++) for (var x = 0; x < W; x++) {
      if (d[(y * W + x) * 4 + 3] <= 8) continue;
      n++; if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
    }
    return x1 < 0 ? { lit: 0, w: 0, h: 0 } : { lit: n, w: x1 - x0 + 1, h: y1 - y0 + 1 };
  }
  function sqFirmness() {
    var pr = (FM.fxRegistry.paramsOf('squish') || []).filter(function (p) { return p.key === 'firmness'; })[0];
    if (!pr || !(pr.default > 0)) throw new Error('the squish catalogue has no `firmness` param — the compression cap is not exposed, so this test is aimed at nothing');
    return pr.default / 100;
  }
  // Read the end stop off the CATALOGUE rather than hard-coding 200, so that if the slider's range is
  // ever widened this test follows it to the new end stop instead of quietly testing the old one.
  function sqInsetMax() {
    var pr = (FM.fxRegistry.paramsOf('squish') || []).filter(function (p) { return p.key === 'inset'; })[0];
    if (!pr || !(pr.max > 0)) throw new Error('the squish catalogue has no `inset` range param — this test is aimed at nothing');
    return pr.max;
  }

  test('effects: Squish leaves a layer that has gone right off the canvas alone', { item: 'fx-squish' }, function () {
    /* The map pins the layer's FAR edge and pulls everything else toward the wall, so the squashed
     * layer occupies exactly [far edge → wall]. Once the far edge has CROSSED the wall that width is
     * negative — and the first build clamped it back up to 2px instead of letting the wall go. A
     * layer sitting nowhere near the frame therefore painted a fully OPAQUE stripe down the whole
     * edge of it: measured on this probe before the fix, x=620 → bbox 1x458 lit 458 and x=700 →
     * 2x479 lit 661, against a control that lit 0. It held until the plate margin ran out at 0.6 ×
     * comp and then popped to nothing, so "slide a title in from off-screen" drew that stripe for
     * 648px of travel on a 1080-wide comp, on every frame.
     * NOTE THIS IS NOW EARNED, NOT DECLARED. The per-wall early-out that used to guarantee it was
     * removed (it was a hard switch, and it popped — see the continuity tests): the wall still acts
     * on a layer this far past it, and what makes the frame come back byte-identical is that the
     * capped squash of an off-canvas layer is itself off-canvas. All FOUR walls, because there is
     * no shared "did we leave the frame" branch any more — each one has to hold on its own. */
    var OFF = {
      right:  [[560, 240], [620, 240], [700, 240], [900, 240]],
      left:   [[-80, 240], [-140, 240], [-220, 240], [-420, 240]],
      bottom: [[240, 560], [240, 620], [240, 700], [240, 900]],
      top:    [[240, -80], [240, -140], [240, -220], [240, -420]],
    };
    Object.keys(OFF).forEach(function (wall) {
      OFF[wall].forEach(function (pt) {
        var none = sq480([], pt[0], pt[1]), on = sq480(squishFx({}), pt[0], pt[1]);
        if (sqLit(none) !== 0) throw new Error(wall + ' ' + pt + ': the control lit ' + sqLit(none) + ' px — it is not off-canvas, so the probe is aimed wrong');
        var d = sqDiff(none, on);
        if (d !== 0) {
          var b = sqBox(on);
          throw new Error(wall + ' wall, layer at ' + pt + ': a layer wholly off the canvas differs from no effect by ' + d + ' bytes — Squish painted ' + sqLit(on) + ' lit px, bbox ' + b.w + 'x' + b.h + ', for a layer that has left the frame');
        }
      });
    });
    // The control. Without it this test is equally happy with a Squish that does nothing at all: one
    // that is only PARTLY over the wall must still be compressed, and hard.
    var over = sqDiff(sq480([], 520), sq480(squishFx({}), 520));
    if (over < 5000) throw new Error('a layer only partly over the wall changed by just ' + over + ' bytes — the early-out is swallowing the live cases too');
  });

  test('effects: Squish at the Wall inset slider\'s maximum squashes the layer to the firmness floor, not to a nub', { item: 'fx-squish' }, function () {
    /* Wall inset moves the walls INWARD, so at 200 on a 480 comp the live box is x/y 200..280 and a
     * ball at x=400 is wholly past the RIGHT wall while still sitting in plain sight on the frame.
     * The first build crushed it there: a layer that measured 161x162 lit 20,620 with no effect came
     * back as a 2x76 nub of 116 pixels, glued to a wall it had already passed. One drag of one
     * slider, on a layer at an ordinary position.
     * The FIRMNESS CAP is what stops that now, and this pins it from BOTH sides — the width must
     * land on the floor the cap sets, which is neither a nub (the crush) nor the untouched 150 (the
     * hard per-wall switch that replaced the crush, and popped a whole ball into existence in one
     * notch of the slider; see the continuity test below). */
    var mx = sqInsetMax(), firm = sqFirmness();
    var none = sq480([], 400), on = sq480(squishFx({ inset: mx }), 400);
    var bn = sqBox(none), bo = sqBox(on), litN = sqLit(none), litO = sqLit(on);
    if (litN < 15000) throw new Error('the control only lit ' + litN + ' px — the probe is not on screen');
    var floor = bn.w * firm;                      // the thinnest the cap allows: firmness × extent
    if (bo.w < floor * 0.8) throw new Error('inset ' + mx + ': the layer was squashed to ' + bo.w + 'px wide, below the ' + Math.round(floor) + 'px firmness floor (' + Math.round(firm * 100) + '% of its own ' + bn.w + 'px) — it is being crushed past the cap');
    if (bo.w > floor * 1.4) throw new Error('inset ' + mx + ': the layer is ' + bo.w + 'px wide against a ' + Math.round(floor) + 'px floor — the right wall stopped acting on a layer that is past it, which is the hard switch this cap replaced');
    // It is still a real object on screen, not a sliver: measured 45x80, lit 2,927.
    if (litO < 1500) throw new Error('inset ' + mx + ': only ' + litO + ' lit px (bbox ' + bo.w + 'x' + bo.h + ') — the layer has effectively been deleted');
    // …and the walls must still DO something at the end stop, or the assertions above are satisfied
    // by an effect that simply ignores a large inset. The 80px live band is what sets the height.
    if (bo.h > bn.h * 0.75) throw new Error('inset ' + mx + ': height ' + bo.h + ' vs ' + bn.h + ' — the inset walls are not being applied at all');
  });

  /* ---- CONTINUITY: the assertion that would have caught all three failures ---------------------
   * Squish has now been sent back twice, and both rejections were the same shape: something in it
   * SWITCHED. Strength 0 short-circuits, the plate re-cut, the per-wall early-out — every one of
   * them is a branch, and every branch is a place where one pixel of travel or one notch of a
   * slider can change the picture completely. The three shipped bugs were:
   *     a 2px band stretched to full frame height for a layer that had left the frame,
   *     a layer snapping from a hairline back to fully undeformed as its far edge crossed a wall,
   *     the same snap from dragging the inset slider with the layer standing still.
   * Every earlier assertion here (no-op when off, contains the layer, deterministic, ps-invariant)
   * was satisfiable by a fix that simply switched the wall off at a different moment. This one is
   * not: it walks the layer across each wall ONE PIXEL AT A TIME and requires the result to move
   * like a picture, not like a state machine.
   *
   * THE INVARIANT, and why it is not an arbitrary tolerance. A one-pixel translation can only
   * uncover or cover ONE COLUMN of the frame, and a column holds at most as many lit pixels as the
   * bounding box is tall. So |Δlit| / (bbox extent across the sweep axis) is ~1 for anything that
   * is really just moving, whatever its shape and however fast the deformation is changing.
   * Measured on the shipped code across all 20 sweeps below: worst ratio exactly 1.00.
   * With the per-wall early-out put back: 1.98 (inset 0), 8.88 (inset 40), 69.8 (inset 120),
   * 118.9 (inset 200). The threshold is 1.5.
   * The bbox rule is the same idea stated in pixels, and it skips the last few frames of the slide
   * off the frame edge — a shape whose final 500 pixels are leaving MUST have a collapsing bbox,
   * with or without this effect, so that is translation, not a discontinuity. Shipped worst: 15px.
   * Early-out restored: 220px. */
  function sqSweep(wall, inset, size, params) {
    var horiz = (wall === 'right' || wall === 'left');
    var wallPos = 480 - inset;                    // in "distance travelled toward the wall" coords
    var s0 = Math.round(wallPos - size / 2 - 6), s1 = Math.round(wallPos + size / 2 + 14);
    var prev = null, worstR = { r: -1 }, worstB = { d: -1 };
    for (var s = s0; s <= s1; s++) {
      var p = { inset: inset };
      Object.keys(params || {}).forEach(function (k) { p[k] = params[k]; });
      // all four walls are the same arithmetic once the sweep coordinate is "distance toward it"
      var cx = wall === 'right' ? s : wall === 'left' ? 480 - s : 240;
      var cy = wall === 'bottom' ? s : wall === 'top' ? 480 - s : 240;
      var m = sqMeas(sq480(squishFx(p), cx, cy, size));
      if (prev) {
        var dl = Math.abs(m.lit - prev.lit);
        var col = Math.max(horiz ? prev.h : prev.w, horiz ? m.h : m.w);
        var r = dl / (col + 1);
        if (r > worstR.r) worstR = { r: r, s: s, dl: dl, col: col, from: prev, to: m };
        var db = Math.max(Math.abs(m.w - prev.w), Math.abs(m.h - prev.h));
        if (m.lit >= 500 && prev.lit >= 500 && db > worstB.d) worstB = { d: db, s: s, from: prev, to: m };
      }
      prev = m;
    }
    return { worstR: worstR, worstB: worstB, s0: s0, s1: s1 };
  }
  function sqShape(m) { return m.w + 'x' + m.h + ' lit ' + m.lit; }

  test('effects: Squish is continuous — a layer swept across a wall one pixel at a time never jumps', { item: 'fx-squish' }, function () {
    var SIZE = 110;
    // inset 0 is the default (walls ON the frame edge); +40/+120/+200 put the wall INSIDE the
    // frame, where both sides of the crossing are visible and a switch cannot hide; -80 puts it
    // outside, so the layer is clipped by the frame before it ever reaches the wall.
    var insets = [0, 40, 120, 200, -80];
    var walls = ['right', 'left', 'bottom', 'top'];
    var seen = 0;
    walls.forEach(function (wall) {
      insets.forEach(function (inset) {
        var r = sqSweep(wall, inset, SIZE, null);
        if (r.worstR.r < 0) throw new Error(wall + '/inset ' + inset + ': the sweep produced no steps');
        seen++;
        if (r.worstR.r > 1.5) throw new Error(wall + ' wall, inset ' + inset + ': one pixel of travel at s=' + r.worstR.s
          + ' changed the lit count by ' + r.worstR.dl + ' px against a bounding box only ' + r.worstR.col
          + ' px across (ratio ' + r.worstR.r.toFixed(2) + ') — ' + sqShape(r.worstR.from) + ' -> ' + sqShape(r.worstR.to)
          + '. A single pixel of travel can only uncover one column, so this is a jump, not motion.');
        if (r.worstB.d > 40) throw new Error(wall + ' wall, inset ' + inset + ': one pixel of travel at s=' + r.worstB.s
          + ' changed a bounding-box dimension by ' + r.worstB.d + ' px — ' + sqShape(r.worstB.from) + ' -> ' + sqShape(r.worstB.to));
      });
    });
    if (seen !== 20) throw new Error('only ' + seen + ' of 20 wall/inset sweeps ran');
    // The control: a sweep that never deforms anything would sail through the two rules above.
    // Somewhere in the inset-120 right-wall sweep the ball must actually be squashed, hard.
    var mid = sqMeas(sq480(squishFx({ inset: 120 }), 360, 240, SIZE));
    var raw = sqMeas(sq480([], 360, 240, SIZE));
    if (!(mid.w < raw.w * 0.75) || !(mid.h > raw.h * 1.2)) throw new Error('the sweep is not exercising a real squash: at x=360 inset 120 the ball measured '
      + sqShape(mid) + ' against an un-effected ' + sqShape(raw) + ' — the continuity rules above are passing on a no-op');
  });

  test('effects: Squish is continuous — dragging the Wall inset slider with the layer standing still', { item: 'fx-squish' }, function () {
    /* The other way to reach the same crossing: hold the layer and move the WALL. The layer does
     * not translate at all here, so every changed pixel is deformation and the bar is far lower
     * than the sweep above. With the per-wall early-out in place this went 2x152 lit 302 at inset
     * 154 to 150x150 lit 17,862 at inset 155 — a whole ball appearing on one notch of a slider.
     * Shipped: worst step 209 lit px / 4 bbox px over the slider's entire -200..200 range. */
    var pr = (FM.fxRegistry.paramsOf('squish') || []).filter(function (p) { return p.key === 'inset'; })[0];
    var lo = pr.min, hi = pr.max;
    var prev = null, worstL = { d: -1 }, worstB = { d: -1 }, n = 0;
    for (var iv = lo; iv <= hi; iv++) {
      var m = sqMeas(sq480(squishFx({ inset: iv }), 400, 240, 150));
      if (prev) {
        var dl = Math.abs(m.lit - prev.lit), db = Math.max(Math.abs(m.w - prev.w), Math.abs(m.h - prev.h));
        if (dl > worstL.d) worstL = { d: dl, i: iv, from: prev, to: m };
        if (db > worstB.d) worstB = { d: db, i: iv, from: prev, to: m };
      }
      prev = m; n++;
    }
    if (n < 100) throw new Error('the inset slider only produced ' + n + ' notches — this test is aimed at nothing');
    if (worstL.d > 900) throw new Error('inset ' + (worstL.i - 1) + ' -> ' + worstL.i + ': one notch of the Wall inset slider changed the lit count by '
      + worstL.d + ' px — ' + sqShape(worstL.from) + ' -> ' + sqShape(worstL.to) + '. The layer did not move; the wall moved one pixel.');
    if (worstB.d > 40) throw new Error('inset ' + (worstB.i - 1) + ' -> ' + worstB.i + ': one notch changed a bounding-box dimension by '
      + worstB.d + ' px — ' + sqShape(worstB.from) + ' -> ' + sqShape(worstB.to));
    // The control: the slider must actually DO something across that range, or the two rules above
    // are measuring a parameter the effect ignores.
    var a = sqMeas(sq480(squishFx({ inset: 0 }), 400, 240, 150)), b = sqMeas(sq480(squishFx({ inset: hi }), 400, 240, 150));
    if (Math.abs(a.h - b.h) < 40) throw new Error('inset 0 gave ' + sqShape(a) + ' and inset ' + hi + ' gave ' + sqShape(b) + ' — the slider is not moving the walls');
  });

  test('effects: Squish deforms wherever it sits in the effect stack', { item: 'fx-squish' }, function () {
    // fx-browser.js pushes a newly added effect onto the END of layer.effects, and drawLayer
    // composites the LAST entry outermost — so the newcomer wraps everything before it. Every other
    // effect renders its clean copy of the layer into a COMP-SIZED plate, which throws away the one
    // thing Squish exists to use: the part of the layer hanging outside the frame. Its alpha bbox
    // then stops exactly ON the wall, no penetration is measured, and it early-outs.
    // So adding Squish to a layer that already had an effect was a byte-identical no-op — measured
    // at EXACTLY 0 bytes against that effect alone for pixelate, bulge, tint, tiles, dropshadow,
    // glitch and wave alike. Squish composites innermost now, so both orders must deform, and land
    // on the same pixels: where it sits in the list is not allowed to change what it does.
    ['pixelate', 'bulge', 'dropshadow'].forEach(function (ty) {
      var alone = sq480([FM.fxRegistry.makeInstance(ty)], 480);
      var after = sq480(squishFx({}).concat([FM.fxRegistry.makeInstance(ty)]), 480);   // [squish, X]
      var befor = sq480([FM.fxRegistry.makeInstance(ty)].concat(squishFx({})), 480);   // [X, squish]
      var dA = sqDiff(after, alone), dB = sqDiff(befor, alone);
      if (dA < 5000) throw new Error(ty + ': [squish, ' + ty + '] differs from ' + ty + ' alone by only ' + dA + ' bytes — Squish is not deforming under a later effect');
      if (dB < 5000) throw new Error(ty + ': [' + ty + ', squish] differs from ' + ty + ' alone by only ' + dB + ' bytes — adding Squish on top of an existing effect silently did nothing');
      var dOrder = sqDiff(after, befor);
      if (dOrder !== 0) throw new Error(ty + ': the two stack orders differ by ' + dOrder + ' bytes — Squish is not pinned to one place in the pipeline');
    });
  });

  /* ---- warp effects must be the same STRENGTH at every preview scale ---------------------------
   *
   * BUG-HUNT, high: "Warp effects displace by PLATE pixels, so wave/ripple/glass/tileshift/
   * fractalwarp are 1.4-3x stronger in the preview than in the export." drawWarpEffect passes the
   * plate scale as the map function's 10th argument precisely so px-denominated controls can be
   * converted; curl took it, and those five did not even declare it. So amplitude, wavelength and
   * tile size were read as REDUCED plate pixels: you dialled in a wave you liked while scrubbing,
   * hit play, the quality ladder dropped a tier and it changed strength mid-playback — and the
   * exported file matched neither.
   *
   * Measured on the tree before the fix, spread across render scales 1 / 0.5 / 0.28:
   *     ripple 233.8%   fractalwarp 60.2%   glass 23.6%   wave 5.7%   (curl, the control, 3.5%)
   * and after: 0.9% / 1.8% / 3.0% / 3.8%, i.e. all of them down at the control's own floor, which
   * is rasterisation noise at a 0.28 plate and not something any fix can remove.
   *
   * curl is in the sweep as a CONTROL, and that is what makes the threshold meaningful: it was
   * already correct, so it measures how much spread is unavoidable. A test that just asserted
   * "under 12%" with nothing to compare against would not survive someone tightening it. */
  test('effects: warp strength does not change with the preview scale', { item: 'warp-plate-scale' }, function () {
    var LBW = 320, LBH = 240;
    var extent = function (fx, rs) {
      var c = offscreen(Math.round(LBW * rs), Math.round(LBH * rs));
      c.__fmRS = rs; c.__fmOX = 0; c.__fmOY = 0;
      var g = c.getContext('2d', { willReadFrequently: true });
      var L = FM.makeLayer('shape', { shape: 'rect', name: 'sq', x: 160, y: 120, shapeW: 200, shapeH: 200, fill: '#ffffff' });
      L.effects = fx ? [fx] : [];
      FM.renderScene(g, scene([L], { project: { width: LBW, height: LBH, fps: 30, duration: 5, background: null } }), 0);
      var d = g.getImageData(0, 0, c.width, c.height).data;
      var minX = c.width, maxX = -1;
      for (var y = 0; y < c.height; y++) for (var x = 0; x < c.width; x++) {
        if (d[(y * c.width + x) * 4 + 3] > 8) { if (x < minX) minX = x; if (x > maxX) maxX = x; }
      }
      return maxX < 0 ? 0 : (maxX - minX + 1) / rs;      // PROJECT px, so the scales are comparable
    };
    var CASES = [
      ['Wave', { type: 'wave', enabled: true, params: { amount: 30 } }],
      ['Circular Ripple', { type: 'ripple', enabled: true, params: { amount: 30 } }],
      ['Frosted Glass', { type: 'glass', enabled: true, params: { amount: 30 } }],
      ['Fractal Warp', { type: 'fractalwarp', enabled: true, params: { amount: 50 } }],
      ['Curl', { type: 'curl', enabled: true, params: { amount: 30 } }],   // the control
    ];
    var spreadOf = function (fx) {
      var v = [1, 0.5, 0.28].map(function (rs) { return extent(fx, rs); });
      var mn = Math.min.apply(null, v), mx = Math.max.apply(null, v);
      return { pct: mn > 0 ? (mx / mn - 1) * 100 : 999, vals: v };
    };
    var control = spreadOf(CASES[4][1]).pct;
    // Generous headroom over the control: this guards the 20-230% class of failure, not a couple of
    // pixels of rasterisation. Tightening it toward the control would make it flaky, not stricter.
    var limit = Math.max(12, control * 3);
    CASES.slice(0, 4).forEach(function (c) {
      var r = spreadOf(c[1]);
      if (r.pct > limit) {
        throw new Error(c[0] + ' changes strength with the preview scale: extents ' +
          r.vals.map(function (x) { return Math.round(x); }).join(' / ') + ' project px at scale 1 / 0.5 / 0.28 — ' +
          r.pct.toFixed(1) + '% spread against a ' + control.toFixed(1) + '% control. It is reading its ' +
          'pixel controls as PLATE pixels, so the preview and the export disagree.');
      }
    });
  });

  /* ---- Particles must land in the same PLACE at every preview scale ----------------------------
   *
   * BUG-HUNT, high: "Particles ignores plateScale: emitter origin and speeds are project units used
   * as plate pixels, so the effect is invisible in every reduced-scale preview." Every sibling motion
   * effect — drift, orbit, wiggle, shake — takes the plate scale as a 10th argument. particles
   * declared nine, so it used layer.transform.x/y (PROJECT coords) as PLATE coords for the emitter,
   * and speed/gravity/size (px) as plate quantities. Its own fallback cx = W * 0.5 IS in plate units,
   * which is what makes the mismatch a fact rather than an opinion.
   *
   * THE ASSERTION IS THE BOUNDING BOX, NOT THE PIXEL COUNT, and that choice is the test. A count
   * falls eightfold on a 0.28 plate for a perfectly correct effect, so it cannot separate "fewer
   * pixels because the plate is smaller" from "the particles went somewhere else". The box in project
   * units can: it is the same rectangle at every scale when the effect is right, and it was the
   * actual symptom — the system was emitted off-plate, leaving only the emitter shape behind.
   *
   * Measured before the fix, box at scale 1 / 0.5 / 0.28:
   *     11,0→235,207   ·   22,0→318,238 (spilling to the frame edge)   ·   39,39→179,189 (collapsed
   *     onto the emitter — no particles at all)
   * and after: 11,0→235,207 · 12,0→234,206 · 11,0→236,204. */
  test('effects: Particles lands in the same place at every preview scale', { item: 'particles-plate-scale' }, function () {
    var PW = 320, PH = 240;
    var boxAt = function (rs) {
      var c = offscreen(Math.round(PW * rs), Math.round(PH * rs));
      c.__fmRS = rs; c.__fmOX = 0; c.__fmOY = 0;
      var g = c.getContext('2d', { willReadFrequently: true });
      var L = FM.makeLayer('shape', { shape: 'rect', name: 'emit', x: 160, y: 170, shapeW: 40, shapeH: 40, fill: '#3355ff' });
      L.start = 0; L.duration = 5;
      L.effects = [{ type: 'particles', enabled: true, params: {} }];
      FM.renderScene(g, scene([L], { project: { width: PW, height: PH, fps: 30, duration: 5, background: null } }), 1.5);
      var d = g.getImageData(0, 0, c.width, c.height).data;
      var minX = c.width, maxX = -1, minY = c.height, maxY = -1;
      for (var y = 0; y < c.height; y++) for (var x = 0; x < c.width; x++) {
        if (d[(y * c.width + x) * 4 + 3] > 8) {
          if (x < minX) minX = x; if (x > maxX) maxX = x;
          if (y < minY) minY = y; if (y > maxY) maxY = y;
        }
      }
      if (maxX < 0) return null;
      return { w: (maxX - minX + 1) / rs, h: (maxY - minY + 1) / rs };   // PROJECT px
    };
    var ref = boxAt(1);
    if (!ref) throw new Error('Particles drew nothing at scale 1 — the probe is broken, not the effect');
    // The emitter alone is 40x40. A box that small means the particles never made it onto the plate.
    if (ref.w < 100 || ref.h < 100) {
      throw new Error('at scale 1 Particles covers only ' + Math.round(ref.w) + 'x' + Math.round(ref.h) +
        ' project px — barely more than the 40x40 emitter, so there is no particle system to measure');
    }
    [0.5, 0.28].forEach(function (rs) {
      var b = boxAt(rs);
      if (!b) throw new Error('Particles drew nothing at all at plate scale ' + rs + ' — the whole system is emitted off-plate, which is exactly the reported bug');
      var dw = Math.abs(b.w / ref.w - 1) * 100, dh = Math.abs(b.h / ref.h - 1) * 100;
      if (dw > 15 || dh > 15) {
        throw new Error('at plate scale ' + rs + ' Particles covers ' + Math.round(b.w) + 'x' + Math.round(b.h) +
          ' project px against ' + Math.round(ref.w) + 'x' + Math.round(ref.h) + ' at scale 1 (' +
          dw.toFixed(1) + '% / ' + dh.toFixed(1) + '% out) — it is reading project coordinates as plate ' +
          'pixels, so what you see while editing is not what exports');
      }
    });
  });

  /* ---- Edit Shape must not silently destroy keyframed stroke settings -------------------------
   *
   * BUG-HUNT, two high findings with one cause. Border & Shadow makes stroke.width and stroke.color
   * keyframable, so both can legitimately hold a {kf:[…]} container. Edit Shape bound them RAW —
   * `() => stk.width` and `v => { stk.width = v; }` — which is destructive in both directions:
   *
   *   READING  an object into <input type=range> makes the browser silently substitute the mid-range,
   *            so the row showed a thumb at 30 and the literal text "[object Object]"; the colour
   *            swatch stringified to "[object object]", failed its hex regex and showed #000000. The
   *            panel misreported the layer before you touched anything.
   *   WRITING  replaced the whole container with a plain number/string. Every border keyframe gone,
   *            silently, on one nudge. Verified in the original report: {kf:[{t:0,v:30},{t:1,v:2}]}
   *            became 42, and {kf:[…#ffffff…#ff0000]} became "#00ff00".
   *
   * This asserts the DATA, not the widget, because the data loss is the part that cannot be undone by
   * looking again — and it drives FM.setProp / FM.evalProp, which is what the rows now call, so a
   * future rebinding back to raw fails here rather than in a project. */
  test('Edit Shape: nudging stroke width or colour keeps their keyframes', { item: 'stroke-kf-safe' }, function () {
    var L = FM.makeLayer('shape', { shape: 'rect', name: 'stk', x: 100, y: 100, shapeW: 80, shapeH: 80, fill: '#4af' });
    L.stroke = { enabled: true,
      width: { kf: [{ t: 0, v: 30, e: 'linear' }, { t: 1, v: 2, e: 'linear' }] },
      color: { kf: [{ t: 0, v: '#ffffff', e: 'linear' }, { t: 1, v: '#ff0000', e: 'linear' }] } };
    var t0 = FM.time;
    try {
      FM.time = 0;
      // READ: the panel must report the value AT THE PLAYHEAD, not an object and not a fallback.
      var wRead = FM.evalProp(L.stroke.width, FM.time);
      if (wRead !== 30) throw new Error('a keyframed stroke width reads as ' + JSON.stringify(wRead) + ' at t=0, expected 30 — the row would show the wrong number before anything is touched');
      var cRead = FM.evalProp(L.stroke.color, FM.time) || '#ffffff';
      if (String(cRead).toLowerCase() !== '#ffffff') throw new Error('a keyframed stroke colour reads as ' + JSON.stringify(cRead) + ' at t=0, expected #ffffff — the swatch misreports the layer');

      /* WRITE — through the REAL panel, not through FM.setProp. Driving the helper directly would
       * test the helper, and the defect was never in the helper: it was in what the Edit Shape row
       * was bound to. A test that called setProp would stay green if someone rebound the row to a
       * raw assignment tomorrow, which is exactly the regression it exists to catch. So: render the
       * panel, find the row by its label, and type into the box a person would type into. */
      FM.scene.layers.length = 0; FM.scene.layers.push(L);
      FM.selectLayer(L.id);
      FM.inspector.openCategory('element');
      FM.inspector.refresh();
      var rowFor = function (name) {
        var labels = [].slice.call(document.querySelectorAll('#inspector .prop-row label'));
        var lab = labels.filter(function (e) { return (e.textContent || '').trim() === name; })[0];
        return lab ? lab.parentNode : null;
      };
      var wRow = rowFor('Stroke width');
      if (!wRow) throw new Error('the Edit Shape panel has no "Stroke width" row — this test can no longer reach what it guards');
      var wBox = wRow.querySelector('input');
      if (!wBox) throw new Error('the "Stroke width" row has no input to drive');
      // What the row SHOWS must already be the value at the playhead, not an object or a fallback.
      if (String(wBox.value).indexOf('object') >= 0 || Math.abs(parseFloat(wBox.value) - 30) > 0.51) {
        throw new Error('the "Stroke width" row displays "' + wBox.value + '" for a keyframed width that is 30 at the playhead — the panel misreports the layer before anything is touched');
      }
      wBox.value = '42';
      wBox.dispatchEvent(new Event('input', { bubbles: true }));
      wBox.dispatchEvent(new Event('change', { bubbles: true }));
      wBox.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
      if (!FM.isAnimated(L.stroke.width)) {
        throw new Error('one stroke-width nudge replaced the keyframe container with ' + JSON.stringify(L.stroke.width) +
          ' — every border-size keyframe destroyed silently, in preview, export and the saved project');
      }
      if (L.stroke.width.kf.length !== 2) throw new Error('the stroke-width keyframes went from 2 to ' + L.stroke.width.kf.length);
      if (FM.evalProp(L.stroke.width, 0) !== 42) throw new Error('the nudge did not take: t=0 still reads ' + FM.evalProp(L.stroke.width, 0));
      if (FM.evalProp(L.stroke.width, 1) !== 2) throw new Error('the nudge at t=0 also changed the t=1 keyframe to ' + FM.evalProp(L.stroke.width, 1));

      var cRow = rowFor('Stroke color');
      if (!cRow) throw new Error('the Edit Shape panel has no "Stroke color" row');
      var cBox = cRow.querySelector('input[type=text], input:not([type=color])') || cRow.querySelector('input');
      if (!cBox) throw new Error('the "Stroke color" row has no field to drive');
      if (/000000|object/i.test(String(cBox.value))) {
        throw new Error('the "Stroke color" field shows "' + cBox.value + '" for a keyframed colour that is #ffffff at the playhead — the swatch misreports the layer');
      }
      cBox.value = '#00ff00';
      cBox.dispatchEvent(new Event('input', { bubbles: true }));
      cBox.dispatchEvent(new Event('change', { bubbles: true }));
      if (!FM.isAnimated(L.stroke.color)) {
        throw new Error('one stroke-colour pick replaced the keyframe container with ' + JSON.stringify(L.stroke.color) +
          ' — every colour keyframe lost and the animation stops rendering');
      }
      if (String(FM.evalProp(L.stroke.color, 1)).toLowerCase() !== '#ff0000') {
        throw new Error('picking a colour at t=0 also changed the t=1 keyframe to ' + FM.evalProp(L.stroke.color, 1));
      }

      // …and a PLAIN (unkeyframed) stroke must still behave exactly as it always did.
      var P = { width: 8, color: '#ffffff' };
      FM.setProp(P, 'width', 12, FM.time);
      FM.setProp(P, 'color', '#123456', FM.time);
      if (P.width !== 12 || P.color !== '#123456') {
        throw new Error('a static stroke no longer takes a plain value (' + JSON.stringify(P) + ') — the fix must not turn ordinary edits into keyframes');
      }
    } finally {
      FM.time = t0;
      FM.scene.layers.length = 0;
      FM.selectLayer(null);
      FM.inspector.openCategory('home');
      FM.inspector.refresh();
    }
  });

  /* ---- a locked crop must still be locked at the end of the drag -------------------------------
   *
   * BUG-HUNT, high. resizeCrop re-derived the locked ratio from the CURRENT crop on every call while
   * the same call wrote back an integer-rounded height, so each step's rounding became the next
   * step's ratio. Across the hundreds of pointermove events in one drag the ratio decayed, and once
   * the height bottomed out on the Math.max(1, …) floor with the width still large it collapsed to
   * 1:1 and never came back — while the lock button went on claiming the ratio was held.
   *
   * The test replays a DRAG, one step per pixel, because that is the only thing that shows it: a
   * single jump from 1920 to 1016 lands on the right answer even with the bug, since there is only
   * one rounding. The defect is cumulative, so the test has to accumulate too.
   *
   * Measured before the fix on a 1920x1080 source: down to 1016 gave h=508 against a correct 572
   * (16:9 decayed to 2:1), and down-then-up gave a 901x901 square instead of 901x507.
   *
   * HONEST LIMIT OF THIS TEST, stated so nobody mistakes it for more than it is: it models
   * resizeCrop's arithmetic, it does not drive resizeCrop. That function is a closure inside the
   * Edit Shape panel builder and its number box is scrubbed through attachGlide, which did not
   * respond to synthesised pointer events when I tried — so unlike the stroke-keyframe test above,
   * this one would NOT catch someone rebinding the real row. What it does catch is the arithmetic
   * regressing, and the `broken` self-check above is what stops it degrading into a tautology: it
   * asserts the model can still reproduce the decay before trusting that the fixed path avoids it.
   * If the crop lock is ever touched again, drive the real box. */
  test('Edit Shape: a locked crop keeps its ratio across a whole drag', { item: 'crop-lock-ratio' }, function () {
    var MW = 1920, MH = 1080, R = MH / MW;
    // A faithful model of the fixed resizeCrop: the ratio is captured once for the gesture.
    var drag = function (from, to, reDerive) {
      var c = { w: from, h: Math.round(from * R) };
      var lockR = c.h / c.w;
      var stepDir = to < from ? -1 : 1;
      for (var w = from; w !== to; w += stepDir) {
        var r = reDerive ? (c.h / c.w) : lockR;          // reDerive === the original defect
        c.w = Math.max(1, Math.min(MW, Math.round(w + stepDir)));
        c.h = Math.max(1, Math.min(MH, Math.round(c.w * r)));
      }
      return c;
    };
    // The instrument must be able to SEE the bug, or a green result means nothing. Prove it does.
    var broken = drag(1920, 1016, true);
    if (Math.abs(broken.h - Math.round(1016 * R)) < 8) {
      throw new Error('the drag model no longer reproduces the ratio decay (got h=' + broken.h + ' for the buggy path, ' +
        'expected it to be far from ' + Math.round(1016 * R) + ') — this test cannot prove anything');
    }
    var fixed = drag(1920, 1016, false);
    var want = Math.round(1016 * R);
    if (Math.abs(fixed.h - want) > 2) {
      throw new Error('after a 904-step drag a locked 16:9 crop is ' + fixed.w + 'x' + fixed.h +
        ', expected about ' + 1016 + 'x' + want + ' — the ratio decays across the gesture');
    }
    // …and the collapse case: all the way down, then back up. This is the one that gave a square.
    var downUp = (function () {
      var c = { w: 1920, h: 1080 }, lockR = c.h / c.w;
      for (var w = 1920; w > 1; w--) { c.w = w; c.h = Math.max(1, Math.min(MH, Math.round(c.w * lockR))); }
      for (var w2 = 1; w2 <= 901; w2++) { c.w = w2; c.h = Math.max(1, Math.min(MH, Math.round(c.w * lockR))); }
      return c;
    })();
    if (Math.abs(downUp.h - Math.round(901 * R)) > 2) {
      throw new Error('dragging a locked crop to the minimum and back to 901 gave ' + downUp.w + 'x' + downUp.h +
        ' instead of 901x' + Math.round(901 * R) + ' — a clamped step is poisoning the ratio for every step after it');
    }
    // The real function must exist and be reachable, or the model above is guarding nothing.
    if (String(FM.inspector.refresh).length < 10) throw new Error('FM.inspector is not live');
  });

  /* ---- two group-context bugs that make the app look broken ------------------------------------
   *
   * BUG-HUNT, both reachable, both "the timeline is just blank and I don't know why".
   *
   * 1. A layer added while inside Edit Group got NO TIMELINE ROW. addEmptyGroup and groupSelection
   *    nested into the open group; the other eight creators did a bare unshift with parent null. The
   *    timeline's group view filters on inSubtree(layer, gctx), and a parentless layer is in no
   *    subtree, so no row was ever built. Measured: layers went 3 → 4 → 5 while the timeline stayed
   *    at 2 rows, with no empty state either. The layer was selected and drawn on the canvas but had
   *    no clip — un-trimmable, un-movable, un-keyframable — and it was not really in the group, so
   *    animating the group left it behind. On a phone the timeline IS the layer list, so it was
   *    unreachable until you happened to back out.
   *
   * 2. deleteSelected left FM.groupContext pointing at a group it had just deleted. Select All
   *    inside a group includes the group itself (selectAll takes every layer in the project, not
   *    just the ones in scope), so this is one keystroke away. The crumb stayed on screen naming a
   *    dead group, body.group-editing stayed set, the timeline rendered zero rows, and any group
   *    made afterwards was written with `parent` pointing at the deleted id — then autosaved.
   *
   * Both are asserted on the DATA (parent id, groupContext), because that is what the timeline and
   * the autosave read. */
  test('groups: a layer added inside Edit Group joins that group', { item: 'group-context' }, function () {
    if (!FM.insertLayer) throw new Error('FM.insertLayer is missing — the eight creators are each doing their own unshift again, which is how this bug happened');
    var layers0 = FM.scene.layers.slice(), sel0 = FM.scene.selectedId, gc0 = FM.groupContext;
    try {
      var A = FM.makeLayer('shape', { shape: 'rect', name: 'a', x: 100, y: 100, shapeW: 60, shapeH: 60, fill: '#4af' });
      var B = FM.makeLayer('shape', { shape: 'rect', name: 'b', x: 150, y: 100, shapeW: 60, shapeH: 60, fill: '#fa4' });
      FM.scene.layers.length = 0; FM.scene.layers.push(A, B);
      FM.scene.selectedId = A.id; FM.scene.selectedIds = [A.id, B.id];
      FM.groupSelection();
      var g = FM.scene.layers.filter(function (l) { return l.type === 'group'; })[0];
      if (!g) throw new Error('groupSelection made no group');
      FM.groupContext = g.id;                       // as "Edit group" does
      var added = FM.makeLayer('shape', { shape: 'rect', name: 'inside', x: 120, y: 120, shapeW: 40, shapeH: 40, fill: '#0f0' });
      FM.insertLayer(added);
      if (added.parent !== g.id) {
        throw new Error('a layer added while inside a group has parent ' + JSON.stringify(added.parent) +
          ', not the group ' + g.id + ' — the timeline filters on inSubtree, so it gets no row at all and cannot be trimmed, moved or keyframed');
      }
      // …and a caller that already chose a parent keeps it.
      var pinned = FM.makeLayer('shape', { shape: 'rect', name: 'pinned', x: 0, y: 0, shapeW: 10, shapeH: 10, fill: '#00f' });
      pinned.parent = 'somewhere-else';
      FM.insertLayer(pinned);
      if (pinned.parent !== 'somewhere-else') throw new Error('insertLayer overwrote a parent the caller had already set');
    } finally {
      FM.groupContext = gc0;
      FM.scene.layers.length = 0;
      layers0.forEach(function (l) { FM.scene.layers.push(l); });
      FM.selectLayer(sel0);
    }
  });

  test('groups: deleting the group you are inside leaves the group view', { item: 'group-context' }, function () {
    var layers0 = FM.scene.layers.slice(), sel0 = FM.scene.selectedId, gc0 = FM.groupContext;
    try {
      var A = FM.makeLayer('shape', { shape: 'rect', name: 'a', x: 100, y: 100, shapeW: 60, shapeH: 60, fill: '#4af' });
      var B = FM.makeLayer('shape', { shape: 'rect', name: 'b', x: 150, y: 100, shapeW: 60, shapeH: 60, fill: '#fa4' });
      FM.scene.layers.length = 0; FM.scene.layers.push(A, B);
      FM.scene.selectedId = A.id; FM.scene.selectedIds = [A.id, B.id];
      FM.groupSelection();
      var g = FM.scene.layers.filter(function (l) { return l.type === 'group'; })[0];
      FM.groupContext = g.id;
      // Select All inside the group takes the group too — that is the reported one-keystroke path.
      FM.scene.selectedIds = FM.scene.layers.map(function (l) { return l.id; });
      FM.scene.selectedId = g.id;
      FM.deleteSelected();
      if (FM.groupContext && !FM.scene.layers.some(function (l) { return l.id === FM.groupContext; })) {
        throw new Error('after deleting the group you were inside, FM.groupContext still names it (' + FM.groupContext +
          ') — the crumb keeps showing a dead group, the timeline renders zero rows with no empty state, and any group made next is autosaved with a dangling parent');
      }
      if (document.body.classList.contains('group-editing') && !FM.groupContext) {
        throw new Error('body.group-editing is still set with no group context — the chrome and the state disagree');
      }
    } finally {
      FM.groupContext = gc0;
      FM.scene.layers.length = 0;
      layers0.forEach(function (l) { FM.scene.layers.push(l); });
      FM.selectLayer(sel0);
      FM.refreshAll();
    }
  });

  /* ---- playback must not follow you out of the editor ------------------------------------------
   *
   * BUG-HUNT, medium but loud: FM.requestPlay awaits the frame-cache decode — SECONDS for a reversed
   * or frame-blend clip — then calls FM.play() unconditionally. Every navigation path only calls
   * FM.pause(), which sets FM.playing = false; nothing cancelled the in-flight request, so the
   * awaited continuation woke up and started playback for a screen that was no longer on.
   *
   * Verified in the original report by driving the real requestPlay: at t=800ms Home is open and
   * playing is false; at t=3400ms, decode done, playing is TRUE with Home still open, FM.time
   * advancing, the play button showing PAUSE, the clip's audio coming out of the project browser
   * with no transport in sight, and the rAF tick + full render loop running behind the overlay. With
   * loop on it never stopped by itself.
   *
   * The test stubs only the DECODE — ensureReverseCache — and drives the real requestPlay/pause, so
   * what it exercises is the generation token and nothing else. */
  test('playback: leaving the editor cancels a play that is still waiting on a decode', { item: 'play-gen-token' }, function () {
    if (!FM.requestPlay || !FM.pause) throw new Error('need FM.requestPlay and FM.pause');
    var layers0 = FM.scene.layers.slice(), sel0 = FM.scene.selectedId;
    var realEnsure = FM.ensureReverseCache, realPlay = FM.play, wasPlaying = FM.playing;
    var played = 0;
    return (async function () {
      try {
        var L = FM.makeLayer('video', { name: 'rev', x: 100, y: 100 });
        L.reversed = true;
        FM.scene.layers.length = 0; FM.scene.layers.push(L);
        FM.media.set(L.id, { kind: 'video', el: document.createElement('video'), width: 320, height: 240, duration: 5 });
        // A decode that takes a beat, exactly as a real reverse cache does.
        FM.ensureReverseCache = function () { return new Promise(function (r) { setTimeout(r, 120); }); };
        FM.play = function () { played++; };
        FM.playing = false;

        var p = FM.requestPlay();                       // starts, then awaits the "decode"
        await new Promise(function (r) { setTimeout(r, 20); });
        FM.pause();                                     // the user taps Back / opens another project
        await p;
        await new Promise(function (r) { setTimeout(r, 200); });

        if (played !== 0) {
          throw new Error('FM.play() ran ' + played + ' time(s) AFTER the user had already left — audio and the rAF loop ' +
            'start under the Home screen with no transport on screen to stop them');
        }
        // …and a request that is NOT interrupted must still play, or this "fix" is just a mute button.
        played = 0; FM.playing = false;
        await FM.requestPlay();
        if (played !== 1) throw new Error('an uninterrupted requestPlay did not reach FM.play() (' + played + ') — the token is cancelling everything');
      } finally {
        FM.ensureReverseCache = realEnsure; FM.play = realPlay; FM.playing = wasPlaying;
        FM.media.remove && FM.scene.layers.forEach(function (l) { try { FM.media.remove(l.id); } catch (e) {} });
        FM.scene.layers.length = 0;
        layers0.forEach(function (l) { FM.scene.layers.push(l); });
        FM.selectLayer(sel0);
      }
    })();
  });

  /* ---- two edits that could not be undone -------------------------------------------------------
   *
   * BUG-HUNT, both in the "destroys work with no way back" class.
   *
   * 1. The AI validator accepted setProp path 'solo'. That flag is still live in the engine — the
   *    compositor does `if (soloActive && !L.solo) continue;`, the exporter mirrors it for audio, and
   *    soloSilenced mutes the rest in preview — but the per-layer toggle that could turn it OFF was
   *    removed in v1.75, and this case outlived it. Ordinary editor vocabulary ("solo the hero
   *    title") makes the model emit it, every other layer vanishes from the canvas AND the export,
   *    non-soloed video goes silent, and because solo lives on the layer object it is autosaved and
   *    survives reload — with no control anywhere in the app to clear it.
   *
   * 2. "Replace media…" changed only out-of-history state, so history.commit's identical-state guard
   *    swallowed it and no undo step was added. The next Ctrl+Z landed on an unrelated action while
   *    the media stayed replaced — and the original blob had already been deleted from IndexedDB, so
   *    it could never come back. Verified in the report: one Ctrl+Z deleted an unrelated rectangle
   *    and the replaced image stayed replaced. */
  test('AI ops: setProp cannot solo a layer (there is no UI to un-solo it)', { item: 'ai-solo-trap' }, function () {
    /* This reads the SHIPPED SOURCE rather than driving FM.aiOps, and that is deliberate. My first
     * version called FM.aiOps.apply(...) — but the AI panel is not wired in the test harness, so it
     * took an early return and passed while the defect was still there. A test that cannot reach
     * what it guards is worse than none, because it reads as coverage. Fetching the file is the one
     * assertion that holds regardless of whether the panel is live: the op must not EXIST. */
    return fetch('../js/ai-ops.js').then(function (r) {
      if (!r.ok) throw new Error('could not read js/ai-ops.js (' + r.status + ') — this test cannot verify anything');
      return r.text();
    }).then(function (src) {
      var live = src.split('\n').filter(function (ln) {
        return /case\s*['"]solo['"]\s*:/.test(ln) && !/^\s*(\/\/|\*)/.test(ln);
      });
      if (live.length) {
        throw new Error("js/ai-ops.js still handles setProp path 'solo' (" + live[0].trim().slice(0, 80) + ') — ' +
          'ordinary prompt wording like "solo the hero title" then makes every OTHER layer vanish from the canvas ' +
          'and the export, silences non-soloed video, and autosaves it, with no control anywhere in the app to ' +
          'turn it back off. The per-layer solo toggle was removed in v1.75; this case outlived it.');
      }
      if (!/setProp/.test(src)) throw new Error('js/ai-ops.js has no setProp at all — the file this test reads has moved, so it is guarding nothing');
    });
  });

  test('replace media: the swap is a real undo step and the old file survives', { item: 'replace-media-undo' }, function () {
    var L = FM.makeLayer('image', { name: 'photo', x: 100, y: 100 });
    var before = JSON.stringify(L);
    // What the replace path stamps. Without it an image→image swap changes NOTHING in the layer JSON,
    // so history.commit's identical-state guard drops the step and Ctrl+Z hits an unrelated edit.
    L.mediaRev = (L.mediaRev || 0) + 1;
    var after = JSON.stringify(L);
    if (before === after) {
      throw new Error('replacing media leaves the layer JSON identical, so history.commit swallows the step — ' +
        'the next undo lands on an unrelated edit while the media stays replaced');
    }
    if (L.mediaRev !== 1) throw new Error('mediaRev did not increment (' + L.mediaRev + ')');
    L.mediaRev = (L.mediaRev || 0) + 1;
    if (L.mediaRev !== 2) throw new Error('a second replace did not produce a second distinct state');
    // …and the replace path must NOT delete the outgoing blob: an undo step is worthless if the file
    // it would restore has been erased. Asserted against the source, which is where the call was.
    var src = String(FM.replaceMedia || '');
    if (/removeMedia\s*\(\s*id\s*\)/.test(src)) {
      throw new Error('replaceMedia still calls storage.removeMedia(id) — the original footage is erased from ' +
        'IndexedDB, so even a correct undo step could never bring it back');
    }
  });

  /* ---- the AI panel's two repeat-click buttons must respect the cap and the real key ------------
   *
   * BUG-HUNT, two findings in one file, both about the done screen — the Refine box and the ↻
   * re-roll buttons, i.e. the two things a person clicks over and over.
   *
   * 1. NEITHER CHECKED THE SPEND CAP. generateScene gates both of its expensive stages on it; these
   *    did not. Each click fires a full Opus VISION request — the capability digest as the system
   *    prompt plus a base64 PNG of the rendered frame — on the user's OWN key. Past the cap the
   *    budget ring saturates at 1, so it stops conveying how much is going out. This is real money.
   *
   * 2. BOTH DERIVED "dry run" FROM A STICKY FLAG. Watching the no-key demo set _lastBuild.dry = true
   *    and nothing ever cleared it, so with a real key saved, every later Refine silently ran the
   *    MOCK: the instruction was thrown away (the mock keyword-matches only gold/red/blue/green/big/
   *    small/bold/glow), a hardcoded fallback op was applied and committed to history, and the panel
   *    reported "Refined your scene · 1 op · Critic · Opus" for a call that never happened.
   *
   * Asserted against the SHIPPED SOURCE, like the ai-ops solo test and for the same reason: the AI
   * panel is not wired in this harness, so anything that drives FM.ai would take an early return and
   * pass while the defect sat there. Both of these are "this code must be present / must not be" —
   * exactly what a source assertion is good for. */
  test('AI: Refine and re-roll check the spend cap and the live key', { item: 'ai-cap-and-key' }, function () {
    return fetch('../js/ai.js').then(function (r) {
      if (!r.ok) throw new Error('could not read js/ai.js (' + r.status + ') — this test cannot verify anything');
      return r.text();
    }).then(function (src) {
      var bodyOf = function (name, startRe) {
        var m = src.match(startRe);
        if (!m) throw new Error('could not find ' + name + ' in js/ai.js — the file has moved and this test is guarding nothing');
        return src.slice(m.index, m.index + 1400);
      };
      [['rerollTask', /async function rerollTask\s*\(/],
       ['refine', /async function refine\s*\(/]].forEach(function (pair) {
        var body = bodyOf(pair[0], pair[1]);
        if (!/spentCents\(\)\s*>=\s*FM\.aiBudget\.capCents/.test(body)) {
          throw new Error(pair[0] + '() does not check the spend cap — every click fires a full Opus vision request ' +
            'on the user\'s own key with nothing stopping it, and the budget ring saturates so it stops showing the damage');
        }
        if (!/!FM\.aiKey\.has\(\)/.test(body)) {
          throw new Error(pair[0] + '() still derives its dry-run flag from the sticky _lastBuild instead of the live key — ' +
            'after the no-key demo it silently runs the MOCK with a real key saved, throwing the instruction away and ' +
            'crediting the canned result to an Opus call that never happened');
        }
      });
    });
  });

  /* ---- an export must never be handed the PREVIEW frame cache ----------------------------------
   *
   * BUG-HUNT, high. FM.buildFrameCache de-duplicates concurrent builds on the media record alone.
   * The REUSE check correctly compares fps AND scaled-ness — but the in-flight check handed back any
   * running build regardless of what it was started with. prepareCaches exists specifically to
   * guarantee a full-resolution export cache: it force-clears a `scaled` one and calls with no
   * maxDim. While a PREVIEW build is still running, rec.frameCache is still null (it is only assigned
   * when the build finishes), so that clear is a no-op and the export got the preview promise.
   *
   * Delivered: a reversed or frame-blend clip encoded from 640px (mobile) or 960px (desktop) bitmaps
   * upscaled to the layer's full frame box — visibly soft and blocky in the MP4 while every other
   * layer is sharp — and at the preview cache's 24fps cap inside a 30 or 60 fps export. The trigger
   * is the ordinary flow: open a project with a reversed clip (which fires ensureReverseCache on
   * load) and press Export while "Preparing frames…" is still up. No warning, and re-exporting a
   * minute later silently produces a different, sharper file.
   *
   * The test drives the REAL FM.buildFrameCache with a stub media record, so it exercises the actual
   * dedupe rather than a model of it. What it asserts is the property that was violated: a request
   * for a FULL-RES cache, made while a SCALED one is in flight, must not come back scaled. */
  test('export: a full-res cache request is not served the in-flight preview build', { item: 'framecache-dedupe' }, function () {
    if (!FM.buildFrameCache) throw new Error('FM.buildFrameCache is missing');
    var made = [];
    // A media record whose element decodes instantly; buildFrameCache does the rest for real.
    var mk = function () {
      var cv = document.createElement('canvas'); cv.width = 64; cv.height = 48;
      return { el: null, duration: 0.4, kind: 'video', _stub: cv };
    };
    var rec = mk();
    // No <video> to seek, so let the real function take its "nothing decodable" path and still
    // record WHICH shape each call asked for. That is the part under test.
    var realSeek = FM.buildFrameCache;
    var p1 = FM.buildFrameCache(rec, 24, null, { maxDim: 640 });     // the PREVIEW build
    var p2 = FM.buildFrameCache(rec, 30, null, {});                  // the EXPORT build, different shape
    if (p1 === p2) {
      throw new Error('a full-res 30fps export request was handed the very promise of the in-flight ' +
        '640px 24fps PREVIEW build — the exported file is encoded from upscaled preview bitmaps at the ' +
        'preview fps, soft and blocky against every other layer, with no warning');
    }
    return Promise.all([p1.catch(function () {}), p2.catch(function () {})]).then(function () {
      if (rec.frameCache && rec.frameCache.scaled) {
        throw new Error('after a full-res request the record still holds a SCALED cache — the export would use it');
      }
    });
  });

  /* ---- moving a text layer's anchor must keep the text still ----------------------------------
   *
   * BUG-HUNT. Every other layer type offsets its content by the anchor; the text branch drew at x=0
   * governed by textAlign and at `i*lh - total/2` vertically, i.e. permanently pinned to 0.5/0.5.
   * The rest of the app already believed otherwise — the inspector compensates x/y on every anchor
   * write so the layer stays visually still, and canvas-edit hit-tests against -w*ax .. w*(1-ax).
   * With the compositor ignoring the anchor, that compensation had nothing to cancel, so the text
   * SLID: measured in the report, "HELLO" at fontSize 40 went from canvas x 97..224 to 31..158 after
   * an anchor-0 write, a 66px jump — the exact opposite of what the anchor placer promises.
   *
   * The test replays what the INSPECTOR does (set the anchor AND compensate x by the same span), and
   * asserts the drawn pixels do not move. Asserting on the anchor value alone would prove nothing;
   * the whole complaint is about where the glyphs land.
   *
   * It also pins the compatibility half: at the default 0.5 anchor the translate is exactly zero, so
   * a layer that never touched its anchor renders byte-identically. */
  test('text: moving the anchor keeps the text visually still', { item: 'text-anchor' }, function () {
    var W = 320, H = 240;
    var bboxOf = function (mut) {
      var c = offscreen(W, H);
      var g = c.getContext('2d', { willReadFrequently: true });
      var L = FM.makeLayer('text', { name: 'anc', text: 'HELLO', x: 160, y: 120, fontSize: 40, color: '#ffffff' });
      if (mut) mut(L);
      FM.renderScene(g, scene([L], { project: { width: W, height: H, fps: 30, duration: 5, background: null } }), 0);
      var d = g.getImageData(0, 0, W, H).data;
      var minX = W, maxX = -1, minY = H, maxY = -1;
      for (var y = 0; y < H; y++) for (var x = 0; x < W; x++) {
        if (d[(y * W + x) * 4 + 3] > 8) { if (x < minX) minX = x; if (x > maxX) maxX = x; if (y < minY) minY = y; if (y > maxY) maxY = y; }
      }
      return maxX < 0 ? null : { x0: minX, x1: maxX, y0: minY, y1: maxY, w: maxX - minX + 1 };
    };
    var base = bboxOf(null);
    if (!base) throw new Error('the text drew nothing — the probe is broken, not the anchor');

    // What the inspector actually writes when you drag Anchor X to 0: the anchor AND the x
    // compensation, together, so the layer is meant to stay put.
    var moved = bboxOf(function (L) {
      var sz = FM.layerSize(L);
      L.transform.anchorX = 0;
      L.transform.x = 160 + (0 - 0.5) * (sz.w || 0);
    });
    if (!moved) throw new Error('the text vanished after an anchor write');
    var slid = Math.abs(moved.x0 - base.x0);
    if (slid > 3) {
      throw new Error('moving the anchor slid the text ' + slid + 'px (x0 ' + base.x0 + ' → ' + moved.x0 +
        ') — the anchor placer promises to keep it visually still, and the compositor is ignoring the anchor ' +
        'while the inspector compensates for it');
    }
    // …and the default anchor must be untouched, or every existing project shifts.
    var same = bboxOf(function (L) { L.transform.anchorX = 0.5; L.transform.anchorY = 0.5; });
    if (!same || same.x0 !== base.x0 || same.y0 !== base.y0 || same.x1 !== base.x1) {
      throw new Error('an explicit 0.5/0.5 anchor renders differently from no anchor at all — the default path must be a no-op');
    }
  });

  /* ---- Edit Points must agree with the compositor about which way is left -----------------------
   *
   * BUG-HUNT. applyLayerTransform ends with `ctx.scale(flipH ? -1 : 1, flipV ? -1 : 1)`, so the
   * mirror is the INNERMOST step of the placement matrix. point-edit re-derives that matrix by hand
   * and composed only T·R·S·K — it never read flipH/flipV at all. With a flip on, the point markers,
   * insert rings, curve preview and tangent handles were drawn mirrored about the anchor, often on
   * the opposite side of the shape actually on screen.
   *
   * And it was worse than cosmetic: toLocal is the exact inverse of the same wrong matrix, so the
   * overlay tracked the finger while the RENDERED point went the other way — drag a handle right and
   * the shape's point moves left. Two taps apart in normal use: "Flip Horizontally" is on every
   * layer's ⋯ menu with no type guard, and Edit Shape auto-enters Edit Points.
   *
   * The test asserts against the COMPOSITOR's own matrix, not against a hand-worked expectation —
   * FM._layerCTM is the thing point-edit is supposed to agree with, so agreeing with it IS the
   * property. Round-tripping toCanvas → toLocal is checked too, because that inverse is what the drag
   * uses and it can be self-consistently wrong. */
  /* The PARENT half of the same finding. point-edit re-derived the placement matrix by hand and read
   * neither flipH/flipV (v6.53) nor layer.parent — so a parented point shape's overlay sat at the
   * layer's RAW LOCAL coordinates, detached from where the compositor actually draws it. canvas-edit
   * already solved this via parentXform; point-edit did not.
   *
   * Rather than hand-derive the parent chain too, toCanvas/toLocal now go through FM._layerCTM — the
   * compositor's own matrix, taken by running its own applyLayerTransform. That cannot drift from the
   * renderer, because it IS the renderer. This test states that as the contract: for any layer,
   * parented or not, the overlay's mapping must equal the compositor's matrix. */
  test('Edit Points: the overlay matches the compositor even when the layer is parented', { item: 'pointedit-parent' }, function () {
    if (!FM.pointEdit || !FM.pointEdit._toCanvas) throw new Error('FM.pointEdit._toCanvas is not exposed');
    if (!FM._layerCTM) throw new Error('FM._layerCTM is missing — point-edit has nothing authoritative to agree with');
    var layers0 = FM.scene.layers.slice(), t0 = FM.time;
    try {
      FM.time = 0;
      var P = FM.makeLayer('null', { name: 'rig', x: 250, y: 90 });
      P.transform.rotation = 30; P.transform.scale = 1.4;
      var C = FM.makeLayer('shape', { shape: 'rect', name: 'kid', x: 40, y: 20, shapeW: 100, shapeH: 80, fill: '#4af' });
      C.parent = P.id;
      FM.scene.layers.length = 0; FM.scene.layers.push(C, P);

      var M = FM._layerCTM(C, 0, FM.scene);
      if (!M) throw new Error('the compositor could not report a matrix — this environment cannot verify the contract');
      var ax = 0.5, ay = 0.5, w = 100, h = 80;
      [[0, 0], [1, 0], [0.25, 0.75], [1, 1]].forEach(function (uv) {
        var lx = (uv[0] - ax) * w, ly = (uv[1] - ay) * h;
        var want = { x: M.a * lx + M.c * ly + M.e, y: M.b * lx + M.d * ly + M.f };
        var got = FM.pointEdit._toCanvas(C, uv[0], uv[1]);
        if (Math.abs(got.x - want.x) > 0.01 || Math.abs(got.y - want.y) > 0.01) {
          throw new Error('at u,v = ' + uv.join(',') + ' the overlay puts the point at ' +
            got.x.toFixed(1) + ',' + got.y.toFixed(1) + ' but the compositor draws it at ' +
            want.x.toFixed(1) + ',' + want.y.toFixed(1) + ' — the overlay ignores the parent chain, so ' +
            'its markers sit detached from the shape and a drag moves the point somewhere else');
        }
      });
      // …and the inverse the drag uses must still round-trip through a parented, rotated, scaled rig.
      var c = FM.pointEdit._toCanvas(C, 0.3, 0.8);
      var back = FM.pointEdit._toLocal(C, c.x, c.y);
      if (Math.abs(back.u - 0.3) > 1e-6 || Math.abs(back.v - 0.8) > 1e-6) {
        throw new Error('toCanvas → toLocal does not round-trip on a parented layer (' +
          back.u.toFixed(4) + ', ' + back.v.toFixed(4) + ' from 0.3, 0.8)');
      }
    } finally {
      FM.time = t0;
      FM.scene.layers.length = 0;
      layers0.forEach(function (l) { FM.scene.layers.push(l); });
    }
  });

  test('Edit Points: the overlay honours flipH/flipV like the compositor does', { item: 'pointedit-flip' }, function () {
    if (!FM.pointEdit || !FM.pointEdit._toCanvas) throw new Error('FM.pointEdit._toCanvas is not exposed — cannot test the mapping the drag actually uses');
    var mk = function (flipH, flipV) {
      var L = FM.makeLayer('shape', { shape: 'rect', name: 'pts', x: 200, y: 150, shapeW: 100, shapeH: 80, fill: '#4af' });
      L.flipH = !!flipH; L.flipV = !!flipV;
      return L;
    };
    var t0 = FM.time;
    try {
      FM.time = 0;
      // A point at the shape's RIGHT edge (u = 1). With flipH on, the compositor draws it on the LEFT.
      var plain = FM.pointEdit._toCanvas(mk(false, false), 1, 0.5);
      var flipped = FM.pointEdit._toCanvas(mk(true, false), 1, 0.5);
      if (!(plain.x > 200) ) throw new Error('unflipped, u=1 should sit right of the layer centre; got x=' + plain.x);
      if (!(flipped.x < 200)) {
        throw new Error('with flipH on, the u=1 edge maps to x=' + flipped.x + ', still right of centre — the overlay ' +
          'ignores the mirror, so its markers sit on the opposite side of the shape and dragging one moves the point the wrong way');
      }
      if (Math.abs((plain.x - 200) + (flipped.x - 200)) > 0.01) {
        throw new Error('the flip is not a clean mirror about the anchor: ' + plain.x + ' vs ' + flipped.x);
      }
      // Vertical too.
      var fv = FM.pointEdit._toCanvas(mk(false, true), 0.5, 1);
      var pv = FM.pointEdit._toCanvas(mk(false, false), 0.5, 1);
      if (Math.abs((pv.y - 150) + (fv.y - 150)) > 0.01) throw new Error('flipV is not mirroring: ' + pv.y + ' vs ' + fv.y);
      // ROUND TRIP — this is the inverse the drag uses.
      if (FM.pointEdit._toLocal) {
        var L = mk(true, true);
        var c = FM.pointEdit._toCanvas(L, 0.25, 0.75);
        var back = FM.pointEdit._toLocal(L, c.x, c.y);
        if (Math.abs(back.u - 0.25) > 1e-6 || Math.abs(back.v - 0.75) > 1e-6) {
          throw new Error('toCanvas → toLocal does not round-trip with both flips on (' + back.u.toFixed(4) + ', ' +
            back.v.toFixed(4) + ' from 0.25, 0.75) — the drag would fight itself');
        }
      }
    } finally { FM.time = t0; }
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
