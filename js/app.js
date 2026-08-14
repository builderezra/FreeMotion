/* FreeMotion — App wiring: global state, render loop, import, playback, panels, events. */
window.FM = window.FM || {};
(function (FM) {
  'use strict';

  FM.scene = FM.newScene();
  FM.time = 0;
  FM.playing = false;
  FM.loop = false;

  let canvas, ctx, readoutEl, dropHint;
  let renderQueued = false;
  let layerDragIdx = null;
  let rafId = null;
  /* Every FM.pause() bumps this, and requestPlay captures it before it awaits. A reversed or
   * frame-blend clip's decode takes SECONDS, and every navigation path (home.js, storage.js) only
   * calls FM.pause() — nothing cancelled the in-flight request, so the awaited continuation woke up
   * and called FM.play() for a screen that was no longer on. Verified live: at t=800ms Home is open
   * and playing is false; at t=3400ms, decode done, playing is true with Home still open, FM.time
   * advancing, #btn-play showing PAUSE, the clip's audio coming out of the project browser with no
   * transport in sight, and the rAF tick + full render loop running behind the overlay. With loop on
   * it never stopped by itself. Opening a DIFFERENT project was worse: the continuation started that
   * one playing on its own, and FM.media.get() on the dropped recs can throw on the way. */
  let _playGen = 0;
  let _lastDrawnFrame = -1;   // the project frame the canvas currently shows (see tick's frame-drop)

  /* ---------- rendering ---------- */
  let ghostC = null;
  // Onion skin: faint tinted ghosts of the selected animated layer at t±Δ (past=cyan, future=red).
  function drawOnionSkin() {
    const sel = FM.selectedLayer(FM.scene);
    if (!sel) return;
    // Walk the parent chain so a layer driven by an animated parent/null also gets ghosts, and so
    // applyParentChain can resolve the parents (they're included as invisible clones below).
    const chain = []; const seen = new Set([sel.id]); let pid = sel.parent;
    while (pid && !seen.has(pid)) { seen.add(pid); const pl = FM.scene.layers.find(l => l.id === pid); if (!pl) break; chain.push(pl); pid = pl.parent; }
    const animated = l => Object.keys(l.transform).some(k => FM.isAnimated(l.transform[k]));
    if (!animated(sel) && !chain.some(animated)) return;  // nothing moving (self or rig) → skip
    const P = FM.scene.project;
    if (!ghostC) ghostC = document.createElement('canvas');
    ghostC.width = P.width; ghostC.height = P.height;
    const gctx = ghostC.getContext('2d');
    // Parents included as invisible clones: resolvable by applyParentChain but never drawn; only `sel` renders.
    const mini = { project: Object.assign({}, P, { background: null }), layers: chain.map(pl => Object.assign({}, pl, { visible: false })).concat([sel]) };
    // These ghost renders jump the clock +/-0.2s on the SAME layer object, which walks Motion Blur
    // (Footage)'s per-layer time record backwards and forwards and leaves it resetting on every
    // paint — with onion skin on, the effect never blurred at all. The flag tells it to pass the
    // frame through untouched for the ghosts; cleared in the finally so a thrown render can't leave
    // it stuck on.
    FM._mfGhost = 1;
    try {
    [-0.2, 0.2].forEach(dt => {
      const tt = FM.time + dt;
      if (tt < sel.start || tt > sel.start + sel.duration) return;
      gctx.clearRect(0, 0, P.width, P.height);
      FM.renderScene(gctx, mini, tt);
      gctx.save();
      gctx.globalCompositeOperation = 'source-atop';
      gctx.fillStyle = dt < 0 ? 'rgba(80,200,255,0.55)' : 'rgba(255,110,110,0.55)';
      gctx.fillRect(0, 0, P.width, P.height);
      gctx.restore();
      // project coords → preview pixels (zoomed previews are supersampled and cropped)
      ctx.save(); if (FM.applyPreviewTransform) FM.applyPreviewTransform(ctx);
      ctx.globalAlpha = 0.4; ctx.drawImage(ghostC, 0, 0); ctx.restore();
    });
    } finally { FM._mfGhost = 0; }
  }
  // Rule-of-thirds grid + title-safe margin guides (preview only, never exported).
  function drawGuides() {
    const P = FM.scene.project, w = P.width, h = P.height, lw = Math.max(1, w / 960);
    ctx.save();
    if (FM.applyPreviewTransform) FM.applyPreviewTransform(ctx);   // same project→preview mapping renderScene uses
    ctx.lineWidth = lw; ctx.strokeStyle = 'rgba(255,255,255,.22)';
    for (let i = 1; i < 3; i++) {
      ctx.beginPath(); ctx.moveTo(w * i / 3, 0); ctx.lineTo(w * i / 3, h); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, h * i / 3); ctx.lineTo(w, h * i / 3); ctx.stroke();
    }
    ctx.strokeStyle = 'rgba(41,217,187,.65)'; ctx.lineWidth = lw * 1.5;
    const mx = w * 0.05, my = h * 0.05;
    ctx.strokeRect(mx, my, w - 2 * mx, h - 2 * my);   // title-safe 90%
    ctx.restore();
  }
  function render() {
    if (!ctx) return;
    FM.renderScene(ctx, FM.scene, FM.time);
    if (FM.onionSkin && !FM.playing) drawOnionSkin();
    if (FM.showGuides) drawGuides();
    if (FM.canvasEdit) FM.canvasEdit.update();
  }
  FM.requestRender = function () {
    if (renderQueued) return;
    renderQueued = true;
    requestAnimationFrame(() => {
      renderQueued = false;
      const _t0 = performance.now();
      render();
      noteMotion(performance.now() - _t0);
    });
  };

  // How many canvas pixels to keep per project pixel, so vector edges rasterise at the real screen
  // resolution instead of being a stretched bitmap. Zooming to 4x on a phone spreads a 1080px comp
  // across ~4600 device pixels — without this every shape edge is a 4px smear (the thing Ezra
  // photographed next to Alight Motion). Capped by a pixel budget: a 4K comp at 3x zoom on a 3x
  // screen would otherwise ask for a 100-megapixel canvas.
  const MAX_PREVIEW_PX = 12e6;   // ~12MP — comfortably above any phone screen, far below a GPU limit

  /* ---------- adaptive playback quality --------------------------------------------------------
   * Smoothness beats detail WHILE PLAYING, and detail beats everything when you stop to look. So
   * the preview drops resolution during playback and snaps back to full the moment you pause —
   * which is why other editors look softer in motion and sharpen on the last frame.
   *
   * It's adaptive rather than a fixed setting because the whole point is that the same build has to
   * be smooth on a phone AND use the headroom of a fast desktop. We measure how long a frame
   * actually takes to render and move a tier at a time, with hysteresis so it settles instead of
   * oscillating. A slow machine sinks to a tier it can hold; a fast one climbs back to 1.0 and
   * effectively never leaves it.
   */
  const PLAY_TIERS = [1, 0.8, 0.62, 0.48, 0.36, 0.28];
  let _playTier = 0, _renderAvg = 0, _tierCooldown = 0;
  /* A read-only window onto the adaptive ladder, for probes and the suite (queue 130). Ezra reports
   * "it also still doesn't compress the quality in the canvas playback" — a claim about this state
   * that was, until now, impossible to check from outside without reading the source and guessing.
   * Snapshot, not live refs: nothing outside may steer the ladder. */
  FM._perfState = function () {
    return { tier: _playTier, tiers: PLAY_TIERS.length, factor: PLAY_TIERS[Math.min(PLAY_TIERS.length - 1, _playTier)],
             renderAvg: _renderAvg, locked: !!_locked, lockAt: _lockAt, dropFrom: _dropFrom,
             cooldown: _tierCooldown, ctx: _costCtx,
             canvasPx: (typeof canvas !== 'undefined' && canvas) ? canvas.width * canvas.height : 0 };
  };
  // A tier drop has to EARN its place — see the payoff test in notePlaybackCost.
  const DROP_PAYOFF = 0.85;   // a drop must cut the average by 15%+ to be worth the softer picture
  const LOCK_ESCAPE = 1.35;   // once locked, only a cost this much higher re-opens the question
  let _dropFrom = 0, _dropPx = 0, _locked = 0, _lockAt = 0, _skipCost = 0, _costCtx = '';
  let _noLowerPx = 0;   // backing store at which we already learned no lower tier changes a pixel — see nextUsefulTier

  /* Playback is not the only time the picture is MOVING. Dragging the playhead, a layer on the
   * canvas, or a slider re-renders continuously too, and the same trade applies there: shed pixels
   * while it moves, snap back to full detail the moment it stops.
   * This is inferred from the render funnel rather than wired into each drag handler — there are
   * dozens of those across the timeline, canvas, trackpad and inspector, and one missed call site
   * would be an invisible hole. A burst of frames in one short window IS a drag, whatever caused it. */
  /* CONSECUTIVE renders, each within MOTION_GAP of the last — deliberately NOT "N frames inside a
   * fixed window". The old rule (5 frames in 250ms) was a RATE test in disguise: it required a frame
   * gap under 62.5ms, which a heavy scene structurally cannot reach, so the window reset before the
   * 5th frame every time. The quality relief was therefore available exactly when it was not needed
   * and unavailable exactly when it was. Measured on a 4-layer/4-effect scene at 390x844 dpr3:
   * scrub frame gap 108.3ms, _inMotion false for 100/100 frames, canvas stayed at 810x1440. With
   * glow off the same gesture ran at 35.4ms, _inMotion was true 91% of the time and the canvas
   * dropped a rung. MOTION_IDLE has to outlast ONE slow frame too — a 216ms frame was measured, and
   * at 200ms the idle timer fired mid-drag and snapped back to full resolution. (#123) */
  const MOTION_FRAMES = 3, MOTION_GAP = 500, MOTION_IDLE = 700;
  let _inMotion = false, _mFrames = 0, _mLast = 0, _mIdle = null;
  function noteMotion(ms) {
    if (FM.playing) return;                       // playback has its own measurement below
    const now = performance.now();
    if (now - _mLast > MOTION_GAP) _mFrames = 0;
    _mLast = now;
    _mFrames++;
    if (!_inMotion && _mFrames >= MOTION_FRAMES) { _inMotion = true; resizeCanvas(); }
    if (_inMotion) notePlaybackCost(ms);           // the same adaptive ladder, so a fast machine never drops at all
    clearTimeout(_mIdle);
    _mIdle = setTimeout(() => {
      _mFrames = 0;
      if (_inMotion) { _inMotion = false; resizeCanvas(); }   // stopped → repaint sharp
    }, MOTION_IDLE);
  }

  function playQualityFactor() {
    if (!FM.playing && !_inMotion) return 1;
    const mode = (FM.settings && FM.settings.get('playbackQuality')) || 'auto';
    if (mode === 'detail') return 1;                                   // never trade sharpness — for fast machines
    if (mode === 'smooth') return PLAY_TIERS[Math.max(2, _playTier)];   // start low and stay low
    return PLAY_TIERS[Math.min(PLAY_TIERS.length - 1, _playTier)];
  }
  /* The lowest tier BELOW the current one that would actually produce a different backing store, or
   * the current tier when there is none. previewScale() clamps (0.25 floor, MAX_PREVIEW_PX budget,
   * 'smooth' mode's tier-2 floor), so several PLAY_TIERS values routinely resolve to the same canvas
   * — walking those one rung at a time buys nothing and costs a resizeCanvas() plus a wiped cost
   * average each time. Asked only when a drop is about to happen (a few times per playback), and the
   * "nothing lower exists" answer is remembered against the backing store it was learned at, so a
   * struggling frame does not re-run this sweep every frame. */
  function nextUsefulTier() {
    const px = canvas.width * canvas.height;
    if (_noLowerPx === px) return _playTier;
    const save = _playTier, cur = previewScale();
    let found = _playTier;
    try {
      for (let k = _playTier + 1; k < PLAY_TIERS.length; k++) {
        _playTier = k;
        if (previewScale() !== cur) { found = k; break; }
      }
    } finally { _playTier = save; }
    _noLowerPx = (found === _playTier) ? px : 0;
    return found;
  }
  // Called once per rendered frame with the measured cost of that frame.
  function notePlaybackCost(ms) {
    if (!FM.playing && !_inMotion) return;
    const mode = (FM.settings && FM.settings.get('playbackQuality')) || 'auto';
    // 'detail' never trades sharpness, so the ladder controls nothing at all. Park it at the top
    // rather than let it walk down a ladder that changes no pixels — a tier abandoned down there
    // would bite the moment the mode went back to 'auto'.
    if (mode === 'detail') { _playTier = 0; _dropFrom = 0; _locked = 0; return; }
    // Playing and dragging are different cost regimes: a drag repaints a still frame with no video
    // decode, so it is materially cheaper. What was learned in one must never be used to judge the
    // other — a cost-to-beat carried out of a drag made playback undo a drop that was helping, then
    // locked adaptation out while it stuttered. The bookkeeping starts fresh when the regime changes.
    const ctx = FM.playing ? 'play' : 'drag';
    if (ctx !== _costCtx) { _costCtx = ctx; _renderAvg = 0; _dropFrom = 0; _locked = 0; _lockAt = 0; _noLowerPx = 0; }
    // The frame straight after a tier change repaints into a freshly allocated backing store and is
    // the dearest one in the run. Letting it seed the average makes every drop look like it made
    // things worse — which is exactly the judgement the payoff test below has to get right.
    if (_skipCost) { _skipCost = 0; return; }
    _renderAvg = _renderAvg ? (_renderAvg * 0.8 + ms * 0.2) : ms;
    if (_tierCooldown > 0) { _tierCooldown--; return; }
    const budget = 1000 / 60;                       // a frame's worth of time at display rate
    const before = _playTier;
    /* DID THE LAST DROP ACTUALLY HELP? Only part of a frame's cost is the pixels we control.
     * Decoding a video frame and handing it to the GPU costs the same whether it lands in a
     * 1.2-megapixel canvas or a 0.09-megapixel one: measured on one plain 2048x2048 clip with no
     * effects, thirteen times fewer pixels bought only 32% less time (12.2ms → 8.3ms) and the
     * tier-to-tier steps were noise. Left alone the ladder reads "still slow", sheds again, and walks
     * all the way to the bottom tier having achieved nothing but a soft preview — Ezra's "its having
     * to lower the quality when i do something as simple as just have one simple video".
     * So a drop has to pay for itself. If it didn't, put the tier back and stop probing for a while;
     * climbing stays allowed throughout, so nothing gets stuck low. */
    // The lock is a LATCH, not a timer. It records "at this cost, resolution is not the bottleneck",
    // so the question only re-opens when the scene gets materially heavier (a blur added, a second
    // clip). An expiring lock re-probed forever — it softened the preview for a moment every ten
    // seconds on exactly the plain video this was written to fix.
    if (_locked && _renderAvg > _lockAt * LOCK_ESCAPE) _locked = 0;
    /* A probe that did not actually change the rendered resolution proves nothing, so don't judge it
     * — just carry on down the ladder. Ask the CANVAS rather than the tier, because there are two
     * separate ways a tier step can move no pixels at all:
     *   - 'smooth' mode floors the factor at tier 2, so stepping 0→1→2 changes nothing (judging that
     *     read "no gain", undid it, and dead-ended the ladder before it ever reached tier 3);
     *   - previewScale()'s 0.25 floor and MAX_PREVIEW_PX budget can clamp two different factors to
     *     the same backing store on a big comp (a 2048² project clamps every tier below 0.735).
     * The backing-store size is the one thing that is true in both cases. */
    if (_dropFrom && canvas.width * canvas.height === _dropPx) _dropFrom = 0;
    if (_dropFrom && _renderAvg > _dropFrom * DROP_PAYOFF) {
      _playTier--; _locked = 1; _lockAt = _dropFrom; _dropFrom = 0;   // didn't pay — undo, and remember the cost at the tier we came BACK to
    } else if (_renderAvg > budget * 0.72 && _playTier < PLAY_TIERS.length - 1 && !_locked) {
      /* Step to the next tier that actually MOVES PIXELS, not merely the next tier. The guard above
       * stops a no-op probe being JUDGED; nothing stopped one being MADE, and on a dpr-1 PC
       * previewScale()'s 0.25 floor collapses the bottom of the ladder into one backing store.
       * Measured on a 13-layer 1080×1920 comp at 1280×900 dpr1: tiers 2, 3, 4 and 5 all produced
       * exactly 129,600 px, and the ladder still walked rungs 3/4/5 one at a time — three full
       * resizeCanvas() calls (forced reflow + re-render) and three wipes of the cost average, over
       * 3.1s→6.9s, for zero pixel change. */
      const nt = nextUsefulTier();
      if (nt > _playTier) { _dropFrom = _renderAvg; _dropPx = canvas.width * canvas.height; _playTier = nt; }   // struggling → shed pixels, remembering the cost AND the backing store to beat
    } else if (_renderAvg < budget * 0.30 && _playTier > 0) {
      _dropFrom = 0; _playTier--;                                     // lots of headroom → give detail back
    } else if (_renderAvg <= budget * 0.72) {
      _dropFrom = 0;                                                  // inside budget: the last drop did its job, stop judging it
    }
    // Playback wants a LONG settle — resolution pumping mid-shot is uglier than being one tier low.
    // A drag is short and you're watching position, not detail, so it may find its level quickly.
    if (_playTier !== before) { _tierCooldown = FM.playing ? 24 : 8; _renderAvg = 0; _skipCost = 1; resizeCanvas(); }
  }
  FM.playbackQualityInfo = function () {
    // `factor` is the tier's own value; `effective` is what previewScale() actually applies — the two
    // differ in 'smooth' (floored at tier 2) and 'detail' (always 1), and it was reading the tier
    // instead of the effective factor that hid a dead-ended ladder in smooth mode.
    return { tier: _playTier, factor: PLAY_TIERS[_playTier], effective: playQualityFactor(),
      avgFrameMs: +_renderAvg.toFixed(2), inMotion: _inMotion, mode: (FM.settings && FM.settings.get('playbackQuality')) || 'auto',
      // the payoff test's working: what the last drop had to beat, and whether probing is latched off
      dropFrom: +_dropFrom.toFixed(2), locked: !!_locked, lockAt: +_lockAt.toFixed(2), costCtx: _costCtx };
  };

  /* The comp is almost always DISPLAYED smaller than its own pixel size — a 1080×1920 project sits
   * in a stage a few hundred pixels wide, and on a phone in one barely 300 device pixels across.
   * The old floor ("never render BELOW project res") meant painting ~2.1 megapixels to show ~0.1,
   * and every pixel effect paid for all of them. Render a bit ABOVE display size instead and let
   * the browser do the last short step: PREVIEW_SS is the supersample margin that keeps shape and
   * text edges clean, and it never pushes past 1 (above that the canvas is already denser than the
   * screen, so extra pixels buy nothing and cost real time).
   * 'detail' playback quality keeps the old never-below-project floor for anyone who wants it. */
  const PREVIEW_SS = 1.5;
  const MIN_PREVIEW_SCALE = 0.34;
  function previewScale() {
    const P = FM.scene.project;
    const dpr = window.devicePixelRatio || 1;
    const zoom = (FM.viewport && FM.viewport.scale) || FM.canvasZoom || 1;
    const wrap = document.getElementById('canvas-wrap');
    const cssW = wrap ? wrap.clientWidth : 0;
    if (!cssW || !P.width) return 1;
    const detail = ((FM.settings && FM.settings.get('playbackQuality')) || 'auto') === 'detail';
    // device pixels the comp actually occupies on screen, expressed per project pixel
    let s = (cssW * dpr * zoom) / P.width;
    if (!detail && s < 1) s = Math.min(1, s * PREVIEW_SS);   // downscaling → keep a little headroom for edges
    const floor = detail ? 1 : MIN_PREVIEW_SCALE;            // a floor at all, so a tiny window is still legible
    s = Math.max(floor, Math.min(4, s));                     // never above 4x
    const budget = Math.sqrt(MAX_PREVIEW_PX / (P.width * P.height));
    if (s > budget) s = Math.max(floor, budget);
    // While playing, the adaptive tier may take it BELOW project resolution — that's the trade, and
    // it's what keeps the playhead moving evenly on a phone.
    const q = playQualityFactor();
    if (q < 1) s = Math.max(0.25, s * q);
    return Math.round(s * 100) / 100;
  }
  // VIEWPORT CROP. Zoomed in, most of the comp is off-screen — so paint only the part you can
  // actually see, at full device resolution. At 4x zoom roughly a sixteenth of the comp is visible,
  // which is why this buys real sharpness for LESS memory than rendering the whole comp coarsely.
  // The canvas element is repositioned inside the wrap to cover exactly that region; the wrap keeps
  // its comp-sized box, so selection handles and hit-testing (which work in comp space) are
  // untouched. Returns null whenever cropping isn't worth it or can't be measured — then we render
  // the whole comp exactly as before.
  const CROP_MARGIN = 0.18;        // render a bit past the edges so a small pan doesn't expose blank
  function previewCrop() {
    const P = FM.scene.project;
    const wrap = document.getElementById('canvas-wrap');
    const stage = document.getElementById('stage');
    const zoom = (FM.viewport && FM.viewport.scale) || 1;
    if (!wrap || !stage || zoom < 1.35) return null;          // at low zoom the whole comp fits — no point
    const wr = wrap.getBoundingClientRect(), sr = stage.getBoundingClientRect();
    if (!(wr.width > 0 && wr.height > 0 && sr.width > 0 && sr.height > 0)) return null;   // not laid out — never guess
    // getBoundingClientRect already includes the wrap's zoom/pan transform, so the visible slice is
    // just the overlap, expressed as a fraction of the wrap.
    let u0 = (Math.max(sr.left, wr.left) - wr.left) / wr.width;
    let u1 = (Math.min(sr.right, wr.right) - wr.left) / wr.width;
    let v0 = (Math.max(sr.top, wr.top) - wr.top) / wr.height;
    let v1 = (Math.min(sr.bottom, wr.bottom) - wr.top) / wr.height;
    if (!(u1 > u0 && v1 > v0)) return null;                   // scrolled fully out of view
    const mu = (u1 - u0) * CROP_MARGIN, mv = (v1 - v0) * CROP_MARGIN;
    u0 = Math.max(0, u0 - mu); u1 = Math.min(1, u1 + mu);
    v0 = Math.max(0, v0 - mv); v1 = Math.min(1, v1 + mv);
    if ((u1 - u0) > 0.92 && (v1 - v0) > 0.92) return null;    // basically the whole comp — not worth the special case
    return { x: u0 * P.width, y: v0 * P.height, w: (u1 - u0) * P.width, h: (v1 - v0) * P.height, u0: u0, v0: v0, u1: u1, v1: v1 };
  }

  function resizeCanvas() {
    _noLowerPx = 0;   // the ladder's "nothing lower changes a pixel" answer is only valid for one canvas geometry
    const P = FM.scene.project;
    const wrapEl = document.getElementById('canvas-wrap');
    // ALWAYS measure from an uncropped layout. The crop branch below lifts the canvas out of normal
    // flow, and #canvas-wrap is sized BY that canvas — so a wrap left over from a previous crop
    // measures 0 high, previewCrop bails on that ("not laid out — never guess"), the canvas drops
    // back into flow, the wrap re-inflates, and the next call crops again. The preview flip-flopped
    // between sharp-cropped and full-comp on every other resize, and while the wrap was collapsed
    // the selection box and handles — which are positioned against it — collapsed with it.
    // Resetting first costs one forced reflow per resize (not per frame) and makes the decision stable.
    if (wrapEl && (canvas.style.position === 'absolute' || wrapEl.style.height)) {
      canvas.style.position = ''; canvas.style.left = ''; canvas.style.top = '';
      canvas.style.width = ''; canvas.style.height = '';
      wrapEl.style.width = ''; wrapEl.style.height = '';
      void wrapEl.offsetHeight;
    }
    const crop = previewCrop();
    const dpr = window.devicePixelRatio || 1;
    const zoom = (FM.viewport && FM.viewport.scale) || 1;
    let w, h;
    if (crop) {
      // one device pixel per screen pixel over the visible slice, capped by the same pixel budget
      let s = ((wrapEl.getBoundingClientRect().width / P.width) * dpr);
      s = Math.max(1, Math.min(6, s));
      const q = playQualityFactor();
      if (q < 1) s = Math.max(0.25, s * q);   // playing: shed pixels here too, same trade as the full-comp path
      const px = crop.w * crop.h * s * s;
      if (px > MAX_PREVIEW_PX) s = Math.max(1, s * Math.sqrt(MAX_PREVIEW_PX / px));
      w = Math.max(1, Math.round(crop.w * s)); h = Math.max(1, Math.round(crop.h * s));
      canvas.__fmCrop = true; canvas.__fmRS = s; canvas.__fmOX = crop.x; canvas.__fmOY = crop.y;
      // Hold the wrap's box open at the size it has RIGHT NOW, while the canvas is still in flow —
      // everything positioned against the wrap (selection box, handles, overlays, hit-testing) works
      // in comp space and must keep its full comp-sized rectangle once the canvas leaves.
      const kw = wrapEl.offsetWidth, kh = wrapEl.offsetHeight;
      if (kw > 0 && kh > 0) { wrapEl.style.width = kw + 'px'; wrapEl.style.height = kh + 'px'; }
      canvas.style.position = 'absolute';
      canvas.style.left = (crop.u0 * 100) + '%';
      canvas.style.top = (crop.v0 * 100) + '%';
      canvas.style.width = ((crop.u1 - crop.u0) * 100) + '%';
      canvas.style.height = ((crop.v1 - crop.v0) * 100) + '%';
    } else {
      const s = previewScale();
      w = Math.max(1, Math.round(P.width * s)); h = Math.max(1, Math.round(P.height * s));
      canvas.__fmCrop = false; canvas.__fmRS = s; canvas.__fmOX = 0; canvas.__fmOY = 0;
      canvas.style.position = ''; canvas.style.left = ''; canvas.style.top = '';
      canvas.style.width = ''; canvas.style.height = '';
    }
    if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }   // assigning re-allocates the backing store, so only on a real change
    document.documentElement.style.setProperty('--comp-ar', P.width + ' / ' + P.height);   // canvas-wrap holds this aspect → preview always contains in the stage
    render();
    // The drawing overlay is sized and positioned off this canvas, so it has to be told. Not just on
    // window resize: the adaptive quality tier re-allocates the canvas mid-drag, which is precisely
    // when a stroke is in progress.
    if (FM.drawTool && FM.drawTool.sync) FM.drawTool.sync();
  }
  /* ---- ONE pointer→comp conversion for every on-canvas tool -----------------------------------
   * The preview canvas is NOT 1:1 with the comp. It is supersampled when the comp is displayed
   * larger than its own pixels, reduced when displayed smaller, and may hold only the visible crop.
   * The project extent it covers is canvas.width / __fmRS starting at __fmOX.
   * Six tools each rolled their own (canvas.width / rect.width) version of this, and every one was
   * wrong the moment the scale left exactly 1 — points landed hundreds of pixels from the touch.
   * New on-canvas tools MUST use these rather than writing it a seventh time.
   * (canvas-edit.js keeps its own identical copy plus a viewport-scale variant; it was the one that
   *  already had it right, and is left alone deliberately.) */
  FM.previewSpan = function () { return (canvas.width / (canvas.__fmRS || 1)) || FM.scene.project.width || 1; };
  FM.previewDispScale = function () { const r = canvas.getBoundingClientRect(); return (r.width / FM.previewSpan()) || 1; };   // CSS px per PROJECT px
  FM.eventToProject = function (e) {
    const r = canvas.getBoundingClientRect(), sc = canvas.__fmRS || 1;
    return {
      x: (canvas.__fmOX || 0) + ((e.clientX - r.left) / r.width) * (canvas.width / sc),
      y: (canvas.__fmOY || 0) + ((e.clientY - r.top) / r.height) * (canvas.height / sc),
    };
  };

  FM.previewCropInfo = function () { const c = previewCrop(); return c ? { crop: c, backing: canvas.width + '×' + canvas.height, scale: canvas.__fmRS } : null; };
  FM.resizeCanvas = resizeCanvas;
  // Zoom changed → the comp now covers a different number of device pixels, so re-rasterise for it.
  // Debounced: a pinch fires continuously, and reallocating a multi-megapixel backing store on every
  // move would stutter. The CSS transform keeps the view live in between.
  let _rsTimer = null, _lastKey = '';
  FM.refreshPreviewScale = function () {
    clearTimeout(_rsTimer);
    _rsTimer = setTimeout(() => {
      // PAN changes the visible slice too, not just zoom — so the key includes the crop rect.
      const c = previewCrop();
      const key = c ? ('c' + c.u0.toFixed(3) + ',' + c.v0.toFixed(3) + ',' + c.u1.toFixed(3) + ',' + c.v1.toFixed(3)) : ('f' + previewScale().toFixed(2));
      if (key === _lastKey) return;
      _lastKey = key;
      resizeCanvas();
    }, 120);
  };

  function updateReadout() {
    // AM-style timecode: MM:SS:FF for the current playhead time.
    const f = FM.scene.project.fps || 30;
    const tot = Math.round(FM.time * f), ff = tot % f, s = Math.floor(tot / f), m = Math.floor(s / 60), sec = s % 60;
    const p2 = n => (n < 10 ? '0' : '') + n;
    readoutEl.textContent = p2(m) + ':' + p2(sec) + ':' + p2(ff);
    const ds = Math.round(FM.scene.project.duration), mm = Math.floor(ds / 60), ss = ds % 60;   // round to whole seconds FIRST, else 119.7s → 1:60 instead of 2:00
    readoutEl.title = FM.scene.layers.length + (FM.scene.layers.length === 1 ? ' layer · ' : ' layers · ') + 'total ' + mm + ':' + String(ss).padStart(2, '0');
    // Parked on a benchmark? Light the timecode chip in marker yellow. A phone has no hover, so
    // this is the half that actually reports "you are ON a marker" on device. (#61)
    const mks = FM.scene.project.markers || [], halfF = 0.5 / f;
    readoutEl.classList.toggle('on-mark', mks.some(mk => Math.abs(mk.t - FM.time) <= halfF));
    // Keep the open Move & Transform readouts (value boxes, dial, scale strip) in step with the
    // playhead for animated props — every time-change path passes through here. (#2)
    if (FM.inspector && FM.inspector.syncTransform) FM.inspector.syncTransform();
    // The clip-action row swaps trim/split for move/extend when the playhead leaves the clip — this is
    // the one place every time-change passes through, and syncPlayhead only acts on the crossing.
    if (FM.inspector && FM.inspector.syncPlayhead) FM.inspector.syncPlayhead();
    if (FM.refreshEasing) FM.refreshEasing();   // re-pick the easing editor's segment when scrubbing past a keyframe

  }

  // Global preview playback speed (preview only — export is unaffected). 0.5×, 1×, 2×…
  FM.previewRate = 1;
  FM.setPreviewRate = function (r) {
    FM.previewRate = r || 1;
    // The transport clock multiplies real seconds by the rate, so a mid-play change has to re-origin
    // it at the current scene time — otherwise the new rate would be applied retroactively to the
    // whole pass and the playhead would jump.
    if (FM.playing && FM.reanchorClock) FM.reanchorClock();
    FM.scene.layers.forEach(layer => {
      if (layer.type !== 'video') return;
      const m = FM.media.get(layer.id);
      if (m && m.el && !layer.reversed) { try { m.el.playbackRate = Math.min(16, Math.max(0.0625, (FM.evalProp(layer.speed, FM.time) || 1) * FM.previewRate)); } catch (e) {} }
    });
    // reversed clips play synthesized Web Audio (not the <video>); re-anchor it to the current playhead so
    // a mid-play rate change re-syncs at the new speed (start() rebuilds nodes with playbackRate=previewRate).
    if (FM.playing && FM.audioPlay && FM.scene.layers.some(l => l.type === 'video' && l.reversed && l.visible !== false)) FM.audioPlay.start();
  };

  function updateDropHint() {
    dropHint.classList.toggle('hidden', FM.scene.layers.length > 0);
  }

  // Keep the composition EXACTLY as long as its clips — grows when a clip extends past the end,
  // shrinks when the furthest clip ends earlier. Runs on every refresh so the timeline never has
  // trailing empty space. Empty project keeps its configured length.
  FM.autoFitDuration = function () {
    // SINGLE SOURCE OF TRUTH for project length: the timeline is only ever as long as its clips —
    // the furthest clip end, or exactly 0 when there are no clips. No minimum/floor, so a 1s clip
    // makes a 1s timeline and an empty project is a true 0s timeline.
    // The CAMERA is not content — it is how the content is viewed — so it neither extends the
    // timeline nor gets measured for it. Counting it did two bad things: a camera could hold the
    // timeline open past the end of the real footage, and (much worse) its clip length was frozen at
    // whatever the comp happened to be when it was created, so adding a longer clip afterwards grew
    // the comp past the camera's end and the framing SNAPPED BACK mid-timeline with no warning —
    // measured as an 80px jump on a 320px frame plus a 2x size change between two adjacent frames.
    let end = 0;
    FM.scene.layers.forEach(l => { if (l.type === 'camera') return; const e = (l.start || 0) + (l.duration || 0); if (e > end) end = e; });
    end = Math.max(0, Math.round(end * 1000) / 1000);
    if (FM.scene.project.duration !== end) FM.scene.project.duration = end;
    // …and the camera SPANS whatever the comp turned out to be. Its clip length was frozen at
    // creation time, so any clip added afterwards grew the comp past the camera's end and the
    // framing snapped back to no-camera partway through.
    FM.scene.layers.forEach(l => { if (l.type === 'camera' && (l.start || 0) === 0 && l.duration !== end) l.duration = end; });
    if (FM.time > end) FM.time = end;   // never leave the playhead past the (possibly shorter) end
    // Clamp/clear a now-stale loop region: a loopIn past the new end made the playback tick wrap to a
    // point beyond the timeline every frame → a frozen infinite-wrap loop (100% CPU, no progress).
    const P = FM.scene.project;
    if (P.loopOut != null && P.loopOut > end) P.loopOut = end;
    if (P.loopIn != null && P.loopIn >= end - 0.01) { P.loopIn = null; P.loopOut = null; }
  };

  function refreshAll() {
    if (FM.autoFitDuration) FM.autoFitDuration();   // timeline length always tracks the clips
    FM.inspector.refresh();
    FM.timeline.rebuild();
    updateDropHint();
    updateReadout();
    render();
    syncTopBar();
    FM.syncSelectionChrome();
  }
  FM.refreshAll = refreshAll;

  // The multi-select chrome, DERIVED from the live selection. It used to be computed only inside
  // refreshAll — but selectLayer(null) (tap the background, Esc, the phone's back arrow) doesn't call
  // refreshAll, so deselecting a multi-selection left `sel-multi` stuck on the body. That class shows
  // the Group button and HIDES ⋯, settings and the project menu, which is why the fix for it was "I
  // couldn't get rid of the group options and I couldn't do anything" (Ezra). The timeline set both
  // classes by hand in two more places for the same reason. One function, called from every path that
  // can change the selection, and it recounts rather than trusting whoever called it.
  // v5.71: this also owns `m-editing`, and with it the WHOLE phone top bar. It used to own two of the
  // three classes while mobile.js owned the third from its own count, and the state nobody covered was
  // ONE layer selected in select mode — the first frame of every long-press (timeline.js
  // beginPaintSelect). Measured at 380x780 driving the real gesture: that frame kept the PROJECT header
  // (name · ⋯ · cog · Export at 334..372), and the very next frame — second row painted in, finger
  // still down — swapped it for the multi header and put the DELETE bin on 330..372, i.e. over 100% of
  // the pixels Export had held one frame earlier. Muscle-memory Export became Delete mid-gesture.
  // So: three states, decided here, from the live selection, and NOTHING else writes these classes or
  // a display style on those buttons — the stylesheet reads the classes and does the rest.
  //   (none)      nothing selected            → project header
  //   m-editing   exactly 1, not selecting    → clip header
  //   sel-mode    long-press select mode, OR any 2+ selection (shift-click, Select All) → selection header
  FM.syncSelectionChrome = function () {
    const n = FM.selectionIds ? FM.selectionIds().length : 0;
    if (n === 0 && FM.selectMode) FM.selectMode = false;   // select-mode ends when the selection empties
    const selOwns = !!FM.selectMode || n >= 2;             // the SELECTION owns the bar, not the project
    // m-editing is phone-only: it drives --head-w and the docked sheet, and the rules that read it are
    // all inside (max-width: 700px). Off at desktop width, which is what mobile.js's resize did by hand.
    const phone = !window.matchMedia || window.matchMedia('(max-width: 700px)').matches;
    document.body.classList.toggle('sel-multi', n >= 2);
    document.body.classList.toggle('sel-mode', selOwns);
    document.body.classList.toggle('m-editing', phone && n === 1 && !selOwns);
    // JS supplies the NUMBER; the stylesheet decides whether the label is on screen.
    const cnt = document.getElementById('m-selcount');
    if (cnt) cnt.textContent = n + (n === 1 ? ' layer selected' : ' layers selected');
  };

  // Desktop top bar: the name field shows the SELECTED LAYER's name (rename it there, AM-style) and
  // reverts to the project name when nothing is selected; the delete button appears only with a
  // selection. Called from refreshAll AND selectLayer so it tracks every selection change.
  // ===== AM layer actions (top-bar ⋯ menu when a clip is selected) =====
  FM.fitLayer = function (layer, mode) {   // 'fit' | 'fill' | 'stretch' to the composition area
    const P = FM.scene.project;
    const sz = FM.layerSize ? FM.layerSize(layer) : { w: 100, h: 100 };
    if (!sz.w || !sz.h) return;
    const t = FM.time;
    FM.setTransform(layer, 'x', Math.round(P.width / 2), t);
    FM.setTransform(layer, 'y', Math.round(P.height / 2), t);
    layer.transform.anchorX = 0.5; layer.transform.anchorY = 0.5;
    if (mode === 'stretch') {
      FM.setTransform(layer, 'scale', 1, t);
      layer.transform.scaleX = Math.round(P.width / sz.w * 1000) / 1000;
      layer.transform.scaleY = Math.round(P.height / sz.h * 1000) / 1000;
    } else {
      const s = (mode === 'fill' ? Math.max : Math.min)(P.width / sz.w, P.height / sz.h);
      FM.setTransform(layer, 'scale', Math.round(s * 1000) / 1000, t);
      layer.transform.scaleX = 1; layer.transform.scaleY = 1;
    }
    FM.requestRender(); if (FM.canvasEdit) FM.canvasEdit.update(); if (FM.inspector) FM.inspector.refresh();
    if (FM.history) FM.history.commit();
  };
  FM.flipLayer = function (layer, axis) {   // mirror without touching scale keyframes
    if (axis === 'h') layer.flipH = !layer.flipH; else layer.flipV = !layer.flipV;
    FM.requestRender(); if (FM.history) FM.history.commit();
  };
  FM.extractAudio = async function (layer) {   // audio-only twin of a video clip
    const before = new Set(FM.scene.layers.map(l => l.id));
    await FM.duplicateLayer(layer.id, true);
    const dup = FM.scene.layers.find(l => !before.has(l.id));
    if (!dup) return;
    dup.name = (layer.name || 'Clip') + ' (audio)';
    dup.transform.opacity = 0;      // picture invisible; the tick still plays its sound
    layer.muted = true;             // the original keeps the picture, the twin keeps the voice
    FM.refreshAll(); if (FM.history) FM.history.commit();
    if (FM.toast) FM.toast('Audio extracted to its own layer — original muted');
  };
  FM.mediaInfoToast = function (layer) {
    const m = FM.media.get(layer.id);
    const parts = [];
    if (m) {
      if (m.width || m.height) parts.push(m.width + '×' + m.height);
      if (m.duration) parts.push(m.duration.toFixed(2) + 's');
      if (m.file && m.file.size) parts.push((m.file.size / 1048576).toFixed(1) + ' MB');
      if (m.file && m.file.name) parts.push(m.file.name);
    } else if (layer.type === 'shape') parts.push('Shape ' + (layer.shape || 'rect'), (layer.shapeW || 0) + '×' + (layer.shapeH || 0));
    parts.push('clip ' + (layer.duration || 0).toFixed(2) + 's @ ' + (FM.scene.project.fps || 30) + 'fps');
    if (FM.toast) FM.toast(parts.join('  ·  '), 5000);
  };
  FM.convertToOutline = function (layer) {   // shape → editable path drawn as a stroke
    if (layer.type !== 'shape') return;
    const cv = FM.shapeToPoints(layer);
    layer.shape = 'path'; layer.subs = cv.subs; delete layer.points; layer.closed = cv.closed;
    layer.fillMode = 'none';
    if (!layer.stroke) layer.stroke = { enabled: true, width: 6, color: '#ffffff' };
    layer.stroke.enabled = true; if (!layer.stroke.width) layer.stroke.width = 6;
    FM.requestRender(); if (FM.inspector) FM.inspector.refresh(); if (FM.history) FM.history.commit();
    if (FM.toast) FM.toast('Converted to outline — Edit points to reshape it');
  };
  FM.toggleClippingMask = function (layer) {   // this layer clips everything below to its silhouette
    layer.blendMode = layer.blendMode === 'mask-include' ? 'normal' : 'mask-include';
    FM.requestRender(); if (FM.inspector) FM.inspector.refresh(); if (FM.history) FM.history.commit();
    if (FM.toast) FM.toast(layer.blendMode === 'mask-include' ? 'Clipping mask ON — layers below show only inside this layer' : 'Clipping mask off');
  };
  FM.setLayerLabel = function (layer, hex) {   // ⋯ menu swatch strip: a colour TAG on the layer header (not the fill). null clears it.
    if (hex == null) delete layer.labelColor; else layer.labelColor = hex;
    if (FM.timeline) FM.timeline.rebuild();
    if (FM.history) FM.history.commit();
    if (FM.toast) FM.toast(hex ? 'Layer tagged' : 'Tag cleared', 900);
  };
  // Each candidate shows its own THUMBNAIL, the same preview the timeline row carries, so you pick
  // the layer you can see rather than one of three things called "Copy Copy 2" — which is exactly
  // what Alight Motion's panel does in the screenshot Ezra sent.
  FM.openParentPicker = function (layer, x, y) {
    const mkThumb = (L) => { const cv = document.createElement('canvas'); cv.className = 'ctx-thumb'; cv.width = 38; cv.height = 24; if (FM.renderThumb) { try { FM.renderThumb(L, cv); } catch (e) {} } return cv; };
    const mkGlyph = (g) => { const s = document.createElement('span'); s.className = 'ctx-thumb ctx-thumb-glyph'; s.textContent = g; return s; };
    const cands = FM.scene.layers.filter(l => l.id !== layer.id && l.type !== 'camera' && !(FM.isAncestor && FM.isAncestor(FM.scene, layer.id, l.id)));
    const items = [{ label: (!layer.parent ? '✓ ' : '') + 'None', iconEl: mkGlyph('⊘'), action: () => { layer.parent = null; FM.refreshAll(); if (FM.history) FM.history.commit(); if (FM.toast) FM.toast('Parent removed', 1200); } }, { sep: true }];
    if (!cands.length) items.push({ label: 'No other layers to attach to', disabled: true });
    cands.forEach(c => items.push({ label: (layer.parent === c.id ? '✓ ' : '') + (c.name || c.type), iconEl: mkThumb(c), action: () => { layer.parent = c.id; if (!layer.parentMode) layer.parentMode = 'normal'; FM.refreshAll(); if (FM.history) FM.history.commit(); if (FM.toast) FM.toast('Parented to ' + (c.name || c.type), 1300); } }));
    if (FM.contextMenu) FM.contextMenu.show(Math.max(8, x), y, items);
  };

  function syncTopBar() {
    const sel = FM.selectedLayer ? FM.selectedLayer(FM.scene) : null;
    const pn = document.getElementById('proj-name');
    if (pn && document.activeElement !== pn) { pn.value = sel ? (sel.name || '') : (FM.scene.project.name || 'Untitled'); pn.title = sel ? 'Layer name' : 'Project name'; }
    /* Queue 146 — Ezra: "on pc get rid of the project name editor thats at the top, its already at the
     * bottom." He is right that it is a duplicate, and it is worth being precise about WHEN, because
     * this field is dual-purpose: with a layer selected it renames THAT LAYER, and only with nothing
     * selected does it show the project name. So it duplicates #proj-name-s exactly in the
     * nothing-selected case, and in the other case it is the only rename control in the top strip.
     * Hiding it outright would have quietly taken away layer renaming from the PC top bar, which he
     * did not ask for — so it hides only while it would be the second copy of the same project name.
     * Studio only: the classic layout has no #proj-name-s, so there the field is not duplicating
     * anything. Flagged in REQUESTS.md in case he did mean "remove it in both states". */
    if (pn) pn.classList.toggle('is-dupe', !sel);
    // The panel-header copy (v6.13) is ALWAYS the project name. #proj-name above is dual-purpose — it
    // renames the selected layer when there is one — and a second field that silently changed meaning
    // depending on the selection would be a trap, especially where it sits: directly above a panel that
    // is all about the selected layer.
    const pns = document.getElementById('proj-name-s');
    if (pns && document.activeElement !== pns) pns.value = FM.scene.project.name || 'Untitled';
    const delBtn = document.getElementById('btn-del-layer');
    if (delBtn) delBtn.style.display = sel ? '' : 'none';
    const parBtn = document.getElementById('btn-parent');
    if (parBtn) { parBtn.style.display = sel ? '' : 'none'; parBtn.classList.toggle('active', !!(sel && sel.parent)); }
    // Group appears at 2+, not at 1 — FM.groupSelection needs two members, and an always-visible
    // button that does nothing most of the time is how a control stops being believed. The phone's
    // #m-group holds its slot with `visibility` instead, because there the bin sits beside it and must
    // not move mid-gesture (see the note in styles.css); nothing here shifts under a thumb, so plain
    // display is right. (queue 53)
    const grpBtn = document.getElementById('btn-group');
    if (grpBtn) grpBtn.style.display = (FM.selectionIds ? FM.selectionIds().length : 0) >= 2 ? '' : 'none';
  }
  FM.syncTopBar = syncTopBar;

  // A media rec being DESTROYED (not deleted-with-undo) can't use audioFxLive.release(): that hands the
  // element through to the speakers on purpose, so a restored layer isn't silent. Nothing restores this
  // rec, so the chain — and the LFOs its modulated effects are running — must go with it.
  // Full teardown for a media rec that is being DESTROYED (project switch / reset / media replace) —
  // unlike audioFxLive.release(), which leaves _mes passing through because a deleted layer's rec
  // survives for undo. Exported: storage.open() drops the outgoing project's recs the same way, and
  // without this their LFOs keep running on the one shared AudioContext forever.
  function dropAudioGraph(m) {
    if (!m || !FM.audioFxLive) return;
    if (m._afxChain) { try { m._afxChain.dispose(); } catch (e) {} m._afxChain = null; }
    if (m._mes) { try { m._mes.disconnect(); } catch (e) {} m._mes = null; }
    m._afxSig = '';
  }
  FM.dropAudioGraph = dropAudioGraph;

  // Wipe the project back to a blank composition (drops all layers, media, markers, history).
  // Destructive + not undoable, so call sites confirm first.
  FM.resetProject = function () {
    if (FM.pause) FM.pause();
    const libKeys = new Set(FM.mediaLib && FM.mediaLib.keys ? FM.mediaLib.keys() : []);   // blobs the Media library holds survive a project reset
    (FM.scene.layers || []).forEach(l => {
      const m = FM.media.get(l.id); if (m && FM.clearFrameCache) FM.clearFrameCache(m);
      if (m && FM.clearClipStrip) FM.clearClipStrip(m);   // filmstrip ImageBitmaps are native memory, not JS heap — nothing else releases them
      dropAudioGraph(m);
      if (FM.media.remove) FM.media.remove(l.id);
      if (FM.storage && FM.storage.removeMedia && !libKeys.has(l.id)) { try { FM.storage.removeMedia(l.id); } catch (e) {} }
    });
    const blank = FM.newScene();
    FM.scene.project = blank.project;
    FM.scene.layers = blank.layers;
    exitDeadGroupContext();   // same gap as deleteSelected had: wiping every layer must also leave the group view
    FM.scene.selectedId = null;
    FM.scene.selectedIds = [];
    FM.time = 0;
    if (FM.history) FM.history.reset();
    if (FM.resizeCanvas) FM.resizeCanvas();
    refreshAll();
    if (FM.setTime) FM.setTime(0);
    const pnm = document.getElementById('proj-name-m'); if (pnm) pnm.value = FM.scene.project.name;
    if (FM.storage && FM.storage.save) FM.storage.save();
    if (FM.toast) FM.toast('Project reset', 1200);
  };

  // ===== Canvas (preview) zoom — view-only, never affects export. FM.viewport (canvas-edit.js) is
  // the single owner of the #canvas-wrap transform (zoom + pan); this is just the stepped-zoom API
  // the view-bar buttons use. Writing the transform here too would clobber the viewport's pan. =====
  FM.canvasZoom = 1;   // mirror of FM.viewport.scale, kept in step by viewport.apply()
  const CZOOMS = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 2, 3, 4, 6, 8];
  FM.setCanvasZoom = function (z) {
    z = Math.max(0.25, Math.min(8, z));
    if (FM.viewport) { FM.viewport.scale = z; FM.viewport.apply(); }
    else FM.canvasZoom = z;
  };
  FM.zoomCanvasStep = function (dir) {
    let i = CZOOMS.findIndex(v => v >= FM.canvasZoom - 1e-3);
    if (i < 0) i = CZOOMS.length - 1;
    FM.setCanvasZoom(CZOOMS[Math.max(0, Math.min(CZOOMS.length - 1, i + dir))]);
  };

  /* ---------- time / scrubbing ---------- */
  FM.seekVideosToTime = function () {
    FM.scene.layers.forEach(layer => {
      if (layer.type !== 'video') return;
      const m = FM.media.get(layer.id);
      if (!m) return;
      if (layer.reversed && m.frameCache) return; // the cache renders this synchronously
      const local = FM.layerLocalTime(layer, FM.time);
      if (local == null) return;
      try { m.el.currentTime = Math.min(Math.max(local, 0), Math.max(0, (m.duration || 0) - 0.001)); } catch (e) {}
    });
  };

  // Small status toast. AUTO-HIDES by default (omitting ms used to mean sticky — which left every
  // duration-less caller, e.g. "Grouped 3 layers", on screen forever). Pass ms=0 for a sticky
  // progress toast paired with FM.hideToast(). The seq guard stops an old timer from hiding a newer toast.
  let toastSeq = 0;
  FM.toast = function (msg, ms) {
    const t = document.getElementById('toast'); if (!t) return;
    t.textContent = msg; t.classList.remove('hidden');
    const my = ++toastSeq;
    if (ms === undefined) ms = 2200;
    if (ms) setTimeout(() => { if (my === toastSeq) FM.hideToast(); }, ms);
  };
  FM.hideToast = function () { const t = document.getElementById('toast'); if (t) t.classList.add('hidden'); };

  // Benchmarks = timeline markers. Tap the timecode to drop one at the playhead (tap again to remove it).
  // The skip buttons jump between these (and the selected clip's edges).
  FM.toggleMarkerAtPlayhead = function () {
    const P = FM.scene.project; if (!P.markers) P.markers = [];
    const t = FM.time;
    // "already here?" = SAME FRAME only (was 0.12s ≈ 3-4 frames — adding a benchmark on the very
    // next frame used to delete the previous one instead)
    const near = P.markers.find(m => !m.thumb && Math.abs(m.t - t) < 0.5 / (P.fps || 30));   // never let a benchmark tap eat the thumbnail-frame marker (they can share a frame)
    if (near) { P.markers = P.markers.filter(m => m !== near); if (FM.toast) FM.toast('Benchmark removed', 1000); }
    else { P.markers.push({ t: FM.snapFrame(t), label: 'Benchmark' }); if (FM.toast) FM.toast('Benchmark added', 1000); }   // markers live on exact frames
    if (FM.timeline) FM.timeline.rebuild();
    if (FM.history) FM.history.commit();
  };

  // Hold the timecode → pin the CURRENT frame as the project's card thumbnail (captured now, while the
  // video is correctly seeked here), and drop a distinct smaller "thumbnail" marker. Persisted + pinned
  // so the periodic autosave thumbnail no longer overwrites it with a random frame.
  FM.setThumbnailFrame = function () {
    if (FM.playing) FM.pause();
    if (!FM.projects || !FM.projects.pinThumbnail) { if (FM.toast) FM.toast('Thumbnail not available here'); return; }
    const P = FM.scene.project; if (!P.markers) P.markers = [];
    const t = FM.snapFrame(FM.time);
    // Hold again ON the already-pinned frame → UNPIN (back to the automatic thumbnail).
    const existing = P.markers.find(m => m.thumb);
    if (existing && Math.abs(existing.t - t) < 0.5 / (P.fps || 30)) {
      P.markers = P.markers.filter(m => !m.thumb);
      P.thumbPinned = false;
      if (FM.projects.touchCurrent) FM.projects.touchCurrent(true);   // regenerate an auto thumbnail now
      if (FM.timeline) FM.timeline.rebuild();
      if (FM.history) FM.history.commit();
      if (FM.toast) FM.toast('Thumbnail unpinned — back to automatic', 1500);
      return;
    }
    if (!FM.projects.pinThumbnail()) { if (FM.toast) FM.toast('Could not capture this frame'); return; }
    P.markers = P.markers.filter(m => !m.thumb);   // only one thumbnail marker at a time
    P.markers.push({ t: t, label: 'Thumbnail', thumb: true });
    if (FM.timeline) FM.timeline.rebuild();
    if (FM.history) FM.history.commit();
    if (navigator.vibrate) { try { navigator.vibrate(12); } catch (e) {} }
    if (FM.toast) FM.toast('★ This frame is now the project thumbnail', 1600);
  };

  // Ordered snap points the skip buttons step between: project start/end, every benchmark, and — when a
  // layer is selected — that clip's start & end edges. (So skip-left from past a clip lands on its right
  // edge; skip-right from before it lands on its start.)
  FM.timelineSnapPoints = function () {
    const P = FM.scene.project;
    const pts = [0, P.duration];
    (P.markers || []).forEach(m => { if (!m.thumb && m.t >= 0 && m.t <= P.duration) pts.push(m.t); });   // the thumbnail-frame pin is not a benchmark — skip buttons never land on it
    const sel = FM.scene.selectedId ? FM.layerById(FM.scene, FM.scene.selectedId) : null;
    if (sel) {
      pts.push(Math.max(0, sel.start)); pts.push(Math.min(P.duration, sel.start + sel.duration));
      // Playhead ON the selected clip → its KEYFRAMES join the skip stops (off the clip they don't).
      // …but only the ones you are ACTUALLY EDITING. Ezra: "make sure when you press the jump buttons,
      // they don't jump to key frames that you aren't currently editing." This used to take every
      // animated property on the layer, so a clip with position, scale, opacity and three effect
      // params turned the skip buttons into a crawl through diamonds you had no reason to visit.
      // FM.kfFocusProps is the same answer the TIMELINE already uses to decide which diamonds are
      // solid and draggable versus hollow and inert (js/timeline.js) — reusing it means the buttons
      // stop exactly where the live diamonds are, and a keyframe you cannot grab is never a stop.
      // null means nothing is armed, and that deliberately contributes NO keyframes: the clip edges,
      // benchmarks and project start/end still make the buttons useful with nothing focused.
      if (FM.time >= sel.start - 1e-6 && FM.time <= sel.start + sel.duration + 1e-6 && FM.animatedProps) {
        const focus = FM.kfFocusProps ? FM.kfFocusProps(sel) : null;
        if (focus && focus.length) {
          FM.animatedProps(sel).forEach(pr => {
            if (focus.indexOf(pr) < 0) return;
            pr.kf.forEach(k => { if (k.t >= 0 && k.t <= P.duration) pts.push(k.t); });
          });
        }
      }
    }
    return pts.sort((a, b) => a - b);
  };

  /* How many bytes of decoded frames we will hold, and at what resolution.
   * The old flat 384MB was written to stop a long reversed clip OOM-killing mobile Safari — but
   * 384MB of ImageBitmaps IS the thing that kills it. The two failure modes are not symmetric: a
   * budget that is too small only shortens the span that reverses smoothly, while one that is too
   * big loses the whole tab and the user's unsaved work. So phones get a fraction and desktops keep
   * exactly what they had.
   * navigator.deviceMemory is in GB and Chromium-only — Safari, the browser that actually does the
   * killing, never reports it — so fall back to the same fine-pointer test home.js uses for "this
   * machine has a keyboard". 48MB per GB puts an 8GB machine at the old 384MB and a 2GB phone at 96MB.
   * Export is unaffected: it passes no opts at all and gets full source resolution. */
  FM.frameCacheLimits = function () {
    const gb = navigator.deviceMemory;                       // 0.25 … 8, Chromium only
    const fine = !window.matchMedia || window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    let mb = gb ? Math.max(64, Math.min(384, Math.round(gb * 48))) : (fine ? 384 : 128);
    // A touch OS reclaims memory from a background tab far more readily than a desktop one, and
    // deviceMemory reports the DEVICE CLASS rather than what is actually free — so a tablet that
    // reports 8GB still gets a mobile-sized ceiling instead of the desktop budget.
    if (!fine) mb = Math.min(mb, 160);
    // A phone's preview canvas is a few hundred device pixels wide, so 960 spends memory on detail it
    // cannot show. 640 buys ~2.25x more CACHED FRAMES for the same bytes, and the frame COUNT is what
    // decides how much of a reversed clip plays smoothly.
    const maxDim = (!fine || mb <= 160) ? 640 : 960;
    return { maxDim: maxDim, maxBytes: mb * 1024 * 1024 };
  };

  // Decode a clip's frames once so reverse / frame-blend slow-mo plays + scrubs smoothly.
  FM.ensureReverseCache = async function (layer) {
    if (!layer || layer.type !== 'video') return;
    const m = FM.media.get(layer.id);
    if (!m || m.frameCache) return;
    const fps = Math.min(FM.scene.project.fps || 30, 24);
    FM.toast('Preparing frames…', 0);   // sticky progress toast — hidden by the finally below
    // Preview: downscale + byte-cap so a long reversed/slow clip can't OOM-kill mobile Safari.
    try { await FM.buildFrameCache(m, fps, p => FM.toast('Preparing frames… ' + Math.round(p * 100) + '%', 0), FM.frameCacheLimits()); }
    finally { FM.hideToast(); }
    render();
  };

  // Quantize to the project frame grid — EVERYTHING user-placed (playhead, keyframes, markers,
  // splits) lives on an exact frame, like AM. Playback itself stays smooth (tick bypasses setTime).
  FM.snapFrame = function (t) { const f = FM.scene.project.fps || 30; return Math.round(t * f) / f; };
  FM.setTime = function (t, noSnap) {
    if (!FM.playing && !noSnap) t = FM.snapFrame(t);   // momentum glide passes noSnap for a smooth ride; it snaps on settle
    FM.time = Math.max(0, Math.min(FM.scene.project.duration, t));
    if (!FM.playing) FM.seekVideosToTime();
    else clockAnchor(FM.time);                         // moving the playhead mid-play re-origins the clock, or the next tick would drag it straight back
    render();
    FM.timeline.updatePlayhead();
    updateReadout();
  };
  // Scrub variant of setTime for high-frequency pointer drags (timeline grab-scrub, scroll-scrub,
  // momentum). A finger fires pointermove at 60–120Hz; setTime's synchronous render() + video seek
  // per event is the main scrub lag. Here the heavy work is COALESCED to ≤1 per animation frame:
  // requestRender() already de-dupes compositor renders, and the video seek is rAF-throttled. Both
  // read the LATEST FM.time when they fire, so the final frame is always correct. Playhead + readout
  // stay synchronous (cheap DOM) so the line tracks the finger. Same pattern as the inspector sliders.
  let videoSeekQueued = false;
  FM.scrubTime = function (t, noSnap) {
    if (!FM.playing && !noSnap) t = FM.snapFrame(t);
    FM.time = Math.max(0, Math.min(FM.scene.project.duration, t));
    if (!FM.playing && !videoSeekQueued) {
      videoSeekQueued = true;
      requestAnimationFrame(() => { videoSeekQueued = false; if (!FM.playing) FM.seekVideosToTime(); });
    }
    if (FM.playing) clockAnchor(FM.time);              // same as setTime: a scrub during playback wins over the clock
    FM.requestRender();
    FM.timeline.updatePlayhead();
    updateReadout();
  };

  /* ---------- playback ---------- */

  /* ===== the transport clock =====================================================================
   * Playback used to advance the playhead by ACCUMULATING requestAnimationFrame deltas, which made
   * the main thread the transport clock. Sound does not run on the main thread: a <video> element's
   * audio and a Web Audio graph both play from their own threads and keep going while the
   * compositor is stuck on a heavy frame. So a slow render opened a gap between the playhead and
   * the sound, and the resync below closed that gap by ASSIGNING currentTime — a hard seek, which
   * on a playing element tears the waveform mid-slope and drops tens of ms of samples. The seek
   * then stalled the element, which guaranteed the next frame's gap was at least as big, which
   * fired another seek. Measured on a 24 s clip with a 300 ms busy-loop in the render path: 63
   * seeks in 63 frames, 45% of the timeline replaced by digital silence, 186 of 409 tone bursts
   * never emitted, 35+ hard discontinuities. Below ~150 ms of frame time the audio was perfect;
   * above it, roughly half of it disappeared. That cliff is the frame gap crossing the 0.15
   * threshold, not a tuning problem.
   *
   * So the clock is now READ, never accumulated, from whichever monotonic clock the sound is
   * actually played on:
   *   • AudioContext.currentTime when a context exists — it advances on the audio rendering thread
   *     and cannot be stalled by the main thread at all, and it is the clock audio-play.js already
   *     schedules reversed clips against.
   *   • performance.now() otherwise. We do NOT create a context just to read its clock: iOS caps
   *     live AudioContexts (~4) and audio-fx.js owns THE one, so a project with no effects and no
   *     reversed audio must not spend a slot just by pressing play (same line audioFxLive.resume()
   *     holds). Both clocks are continuous and can be evaluated at ANY instant, which is the part
   *     that matters — the playhead no longer only exists at frame boundaries.
   * ============================================================================================= */
  const CLK = { on: false, src: 'raf', t0: 0, a0: 0, w0: 0, rate: 1, wdA: 0, wdW: 0, bad: false };
  const CLK_WD_WIN = 0.35;   // watchdog window, seconds — see clockNow
  function wallNow() { return performance.now() / 1000; }
  function runningCtx() {
    const c = FM.audioCtxIfAny ? FM.audioCtxIfAny() : null;   // never CREATES one — see above
    return (c && c.state === 'running' && typeof c.currentTime === 'number') ? c : null;
  }
  // Anchor the clock at scene time t: play, every loop wrap, and anything that moves the playhead
  // or the preview rate underneath a running transport.
  function clockAnchor(t) {
    CLK.on = true;
    CLK.t0 = t;
    CLK.w0 = wallNow();
    CLK.rate = FM.previewRate || 1;
    const c = runningCtx();
    CLK.src = c ? 'audio' : 'raf';
    CLK.a0 = c ? c.currentTime : 0;
    CLK.wdA = 0; CLK.wdW = 0; CLK.bad = false;
    _lastDrawnFrame = -1;
  }
  // Move to the wall clock WITHOUT a jump — whatever the audio clock produced so far is kept — and
  // latch the context as unusable for the rest of this pass. Without the latch, clockAdopt below
  // takes the same dead context straight back on the next frame and the transport sawtooths between
  // the two clocks, advancing a few ms per watchdog cycle: measured, with a deliberately frozen
  // context, at 0.335 s of scene time in 1.6 s of playback. A fresh anchor (play, seek, loop wrap)
  // is what re-opens the question.
  function clockDemote(elapsed) {
    CLK.t0 = CLK.t0 + elapsed * CLK.rate;
    CLK.w0 = wallNow();
    CLK.src = 'raf';
    CLK.bad = true;
  }
  // A context that appears mid-play (an audio effect added, a reversed clip started) is adopted
  // at the CURRENT scene time, so upgrading the clock never shifts the playhead.
  function clockAdopt() {
    if (!CLK.on || CLK.src === 'audio' || CLK.bad) return;
    const c = runningCtx(); if (!c) return;
    CLK.t0 = FM.clockNow(); CLK.a0 = c.currentTime; CLK.w0 = wallNow(); CLK.src = 'audio';
  }
  // Scene time NOW — continuous, answered at the moment of the call rather than once per frame.
  FM.clockNow = function () {
    if (!CLK.on) return FM.time;
    const wall = wallNow() - CLK.w0;
    if (CLK.src === 'audio') {
      const c = runningCtx();
      if (c) {
        const a = c.currentTime - CLK.a0;
        // An interrupted context stops advancing (iOS phone call, a route change, a policy
        // suspend). Freezing the transport because the SPEAKER stopped would be worse than the bug
        // this replaces, so demote and carry on from exactly where the audio clock left off. The
        // comparison is against a TRAILING window, not against the whole pass: a stall two minutes
        // in has to be caught in a fraction of a second, not after it has swamped a two-minute
        // average. An audio clock that is alive tracks the wall clock to within crystal drift, so a
        // window that saw less than a quarter of the elapsed time is unambiguously stopped.
        if (wall - CLK.wdW > CLK_WD_WIN) {
          if (a - CLK.wdA < (wall - CLK.wdW) * 0.25) clockDemote(a);
          else { CLK.wdA = a; CLK.wdW = wall; return CLK.t0 + a * CLK.rate; }
        } else {
          return CLK.t0 + a * CLK.rate;
        }
      } else {
        clockDemote(wall);   // context closed, or never actually ran
      }
    }
    return CLK.t0 + (wallNow() - CLK.w0) * CLK.rate;
  };
  // Which clock the transport is on right now: 'audio', 'raf', or 'stopped'. Exposed for tests.
  FM.clockSource = function () { return CLK.on ? CLK.src : 'stopped'; };
  // Re-origin the running clock at the scene time it currently reads (setPreviewRate, which is
  // declared above this block, and anything else that changes the rate underneath playback).
  FM.reanchorClock = function () { if (CLK.on) clockAnchor(FM.clockNow()); };

  /* ===== keeping a free-running <video> element with the transport ===============================
   * A forward clip plays its own element audio, so the element and the transport are two clocks
   * that have to be held together. The old rule was "more than 150 ms apart → assign currentTime".
   * A hard seek is the one correction a listener can always hear, so it is now the LAST resort:
   *
   *   SYNC_DEAD 0.045 s  do nothing below this. An element's currentTime is quantised to its
   *     decoded frame — up to 41.7 ms at 24 fps — so a tighter band would chase quantisation noise
   *     and modulate the rate forever. It also sits under the ~100 ms at which A/V slip is noticed.
   *   SYNC_TRIM 0.10 / SYNC_TAU 1 s  the correction is a playbackRate trim of err/SYNC_TAU capped
   *     at ±10%: the element is asked to run slightly fast or slow and pull itself level over about
   *     a second. Nothing is cut, so there is nothing to hear but a brief, slight pitch shift.
   *   SYNC_HARD 0.35 s  above this a nudge is not a correction, it is a promise — at ±10% it needs
   *     3.5 s to close, and the picture would be visibly out of step for all of it. An error that
   *     large is not drift anyway (the element stalled on a decode, the playhead was moved, the
   *     clip was re-entered), so seek — but no more often than
   *   SEEK_MIN_GAP 400 ms, because the seek itself stalls the element for tens of ms and
   *     back-to-back seeks are precisely the storm being replaced. A suppressed seek still gets the
   *     full ±10% trim, so the element is always being pulled the right way.
   * ============================================================================================= */
  const SYNC_DEAD = 0.045, SYNC_TAU = 1.0, SYNC_TRIM = 0.10, SYNC_HARD = 0.35, SEEK_MIN_GAP = 400;
  /* Both added for queue 148 — see the long note at the sync call site for the measurement.
   * ERR_BIAS_ALPHA 0.01 is ~1.7s at 60fps: long enough that real drift (which accumulates) outruns
   * it and still gets corrected, short enough to learn a fresh output latency within a couple of
   * seconds of pressing play.
   * RATE_WRITE_GAP 250ms: a ±10% trim needs a full second to close 100ms of error, so four
   * re-decisions per second is already finer than the correction can act on. It was 55. */
  const ERR_BIAS_ALPHA = 0.01, RATE_WRITE_GAP = 250;
  FM.syncTuning = { dead: SYNC_DEAD, tau: SYNC_TAU, trim: SYNC_TRIM, hard: SYNC_HARD, seekGapMs: SEEK_MIN_GAP, biasAlpha: ERR_BIAS_ALPHA, rateWriteGapMs: RATE_WRITE_GAP };
  // The whole decision, as a pure function, so it can be tested without a media element:
  //   err        = local - element.currentTime  (positive → the element is BEHIND the playhead)
  //   base       = the rate the clip should play at (speed × previewRate)
  //   sinceSeek  = ms since this element was last hard-seeked (Infinity if never)
  FM.mediaSyncPlan = function (err, base, sinceSeek) {
    const a = Math.abs(err);
    if (a > SYNC_HARD && !(sinceSeek < SEEK_MIN_GAP)) return { action: 'seek', rate: base };
    if (a > SYNC_DEAD) {
      const trim = Math.max(-SYNC_TRIM, Math.min(SYNC_TRIM, err / SYNC_TAU));
      return { action: 'trim', rate: Math.min(16, Math.max(0.0625, base * (1 + trim))) };
    }
    return { action: 'hold', rate: base };
  };
  // Playback instrumentation — what the picture gave up so the sound could keep going.
  FM.playbackStats = { syncs: 0, renders: 0, drops: 0, seeks: 0, trims: 0 };

  // Jump the playhead to t and resync video/audio (used by loop + loop-region wrap).
  function wrapTo(t) {
    FM.time = t;
    const now = performance.now();
    FM.scene.layers.forEach(layer => {
      if (layer.type !== 'video') return;
      const m = FM.media.get(layer.id); if (!m) return;
      const local = FM.layerLocalTime(layer, t);
      if (!layer.reversed && local != null) { try { m.el.currentTime = local; m._syncAt = now; } catch (e) {} }
    });
    clockAnchor(t);                            // the wrap is a real discontinuity — re-origin the clock…
    if (FM.audioPlay) FM.audioPlay.start();
    clockAdopt();                              // …and adopt the context if that call just created one
    render(); FM.timeline.updatePlayhead(); updateReadout();
  }
  // Is there an active loop in/out region?
  FM.hasLoopRegion = function () { const P = FM.scene.project; return P.loopIn != null && P.loopOut != null && P.loopOut > P.loopIn + 0.01; };

  // Reconcile every media element with the playhead. Runs BEFORE the render in tick, so an
  // overrunning frame delays the picture and never the sound.
  function syncMediaToClock() {
    FM.playbackStats.syncs++;
    const now = performance.now();
    // Reversed clips with a frame cache render from it (smooth). Without a cache, fall
    // back to per-frame seeking (works, just choppy).
    FM.scene.layers.forEach(layer => {
      if (layer.type !== 'video') return;
      const m = FM.media.get(layer.id);
      if (!m || !m.el) return;
      if (layer.reversed) {
        /* Silence the element HERE, every tick, instead of trusting that it was never started. That
         * invariant is set at FM.play() time and neither reverse toggle re-established it, so ticking
         * "Reverse" mid-playback left the element emitting the clip's FORWARD audio at full level
         * over a backwards picture — and because this branch also skips the volume/fade/solo
         * reconcile below, that stray audio then ignored every later volume, fade or mute change
         * until you paused and played again. Enforcing it where it is READ costs one check a tick
         * and cannot be forgotten by a future caller. */
        try { if (!m.el.paused) m.el.pause(); m.el.muted = true; } catch (e) {}
        if (!m.frameCache) {
          const local = FM.layerLocalTime(layer, FM.time);
          if (local != null) { try { m.el.currentTime = local; } catch (e) {} }
        }
      } else {
        // Forward clips free-run their own <video> audio. Pause + mute the element the moment the
        // playhead leaves the clip window OR the layer is hidden, so a clip trimmed shorter than its
        // source (or hidden mid-play) stops dead instead of bleeding its source audio on. (#1,#8)
        const local = FM.layerLocalTime(layer, FM.time);
        if (local == null || layer.visible === false) { try { if (!m.el.paused) m.el.pause(); m.el.muted = true; } catch (e) {} return; }
        try {
          if (m.el.paused) {
            /* PAST THE END OF THE ACTUAL MEDIA = HOLD SILENT, NEVER RESUME.
             * DEFENSIVE, NOT A VERIFIED FIX FOR A SEEN BUG — stated plainly so nobody inherits a false
             * claim. The reasoning that stands on its own: if the transport is asking for a time at or
             * past the end of the source there is nothing left to play, so calling play() here can
             * only be wrong. The spec also permits play() on an ENDED element to seek back to the
             * earliest position first, which would restart the song from zero.
             * WHAT I COULD NOT REPRODUCE: tests/_restartloop.html drives that exact sequence on a real
             * element and Chrome does NOT rewind — play() resolves (rejected=false) and currentTime
             * stays at the duration. So the rewind is a real spec allowance and a real risk on other
             * engines (Ezra is on a phone), but it is NOT the explanation for the restarts observed in
             * the app. Those logged currentTime landing on 0.055, and assigning a past-the-end `local`
             * would clamp to the duration, not to 0.055 — so `local` itself was small, which points at
             * the speed-ramp integral in layerSourceAdvance, not at this line. See BUG-HUNT.
             * Gated on `paused` and on being genuinely at/past the end, so an ordinary resume — the
             * playhead re-entering the clip window — is untouched (measured in the same probe), and no
             * epsilon shaves the real final moments off a clip that simply ends. */
            const srcEnd = (isFinite(m.el.duration) && m.el.duration > 0) ? m.el.duration : Infinity;
            if (local >= srcEnd) { try { m.el.muted = true; } catch (e) {} return; }
            m.el.currentTime = local; m._syncAt = now; m.el.play().catch(() => {});   // re-entered the window → resume
          }
          else {
            // speed RAMP: follow the keyframed curve live; the trim rides on top of it.
            const base = Math.min(16, Math.max(0.0625, (FM.evalProp(layer.speed, FM.time) || 1) * (FM.previewRate || 1)));
            /* ============ THE SCRATCHY-AUDIO FIX (queue 148) ============
             * Ezra: "the audio i import is making a realy scratchy popping noise that hurts my ears
             * when im trying to play back stuff, this is related to the long on going lag issues."
             * MEASURED in a real browser (tests/_ratechurn.html), four seconds of playing ONE plain
             * audio clip — no effects, speed 1, nothing else in the project:
             *     208 of 240 sync decisions were a trim
             *     playbackRate was rewritten 221 times — FIFTY-FIVE TIMES A SECOND
             *     the rate wandered across the full ±10% band and sat pinned at the ceiling
             *     |err| had a median of 60ms and never converged
             * `preservesPitch` defaults to true, so a media element answers a rate change with a
             * TIME-STRETCHER, not a resample. Re-priming a WSOLA stretcher 55 times a second is
             * audible, and what it sounds like is scratchy. No sample is ever dropped, so none of
             * this showed up in the seek counter or as a hole in the waveform — which is why five
             * separate readings of this file found nothing.
             *
             * WHY IT NEVER CONVERGED, which is the actual defect. `el.currentTime` is not the
             * instantaneous audible position: it is latched to the last block the element handed the
             * audio device, so it sits a constant OUTPUT LATENCY behind — tens of ms, more on a busy
             * machine, which is exactly the link he drew to the lag. That constant is not drift, and
             * a proportional controller cannot remove a constant: it just leans on the throttle
             * forever. So the loop asked for +10% permanently and re-decided it every frame.
             *
             * Two changes, and neither weakens real drift correction:
             *   1. Learn the constant and subtract it. A slow EMA (~1.7s) absorbs a fixed offset
             *      completely, while genuine drift — which accumulates — outruns it and still leaves
             *      a residual for the trim to work on.
             *   2. Rate-limit the trim WRITES. Closing a 100ms error at 10% takes a full second, so
             *      re-deciding it 55 times inside that second buys nothing and costs a stretcher
             *      re-prime each time. A change in `base` (a speed ramp, a preview-rate change) is
             *      the user asking for a rate and is still honoured on the very next frame.
             * ============================================================================ */
            const rawErr = local - (m.el.currentTime || 0);
            if (m._errBias == null || !isFinite(m._errBias)) m._errBias = rawErr;
            else m._errBias += (rawErr - m._errBias) * ERR_BIAS_ALPHA;
            const plan = FM.mediaSyncPlan(rawErr - m._errBias, base, m._syncAt == null ? Infinity : now - m._syncAt);
            if (plan.action === 'seek') {
              m.el.currentTime = local; m._syncAt = now; FM.playbackStats.seeks++;
              m._errBias = null;   // the offset we learned belonged to the old position
            } else if (plan.action === 'trim') FM.playbackStats.trims++;
            const baseMoved = Math.abs((m._baseRate == null ? base : m._baseRate) - base) > 1e-4;
            m._baseRate = base;
            if (Math.abs((m.el.playbackRate || 1) - plan.rate) > 1e-4 &&
                (baseMoved || plan.action === 'seek' || now - (m._rateAt || 0) >= RATE_WRITE_GAP)) {
              m.el.playbackRate = plan.rate; m._rateAt = now;
            }
          }
          // Reconcile volume/mute every tick (fadeMul = 1 when there are no fades) so a volume/fade
          // edit mid-playback takes effect immediately instead of sticking.
          const vol = FM.layerVolume(layer, FM.time) * FM.fadeMul(layer, FM.time - layer.start, layer.duration);   // keyframed volume animates on forward clips
          // A soloed layer silences the others' AUDIO too, matching the picture (compositor) and the
          // exported soundtrack (exporter buildAudioMix). Mute rather than pause so un-soloing resumes
          // instantly without a re-seek.
          if (FM.soloSilenced(layer)) { m.el.muted = true; }
          else { m.el.muted = false; m.el.volume = Math.max(0, Math.min(1, vol)); }
        } catch (e) {}
      }
    });
  }

  function tick() {
    if (!FM.playing) return;
    const P = FM.scene.project;
    clockAdopt();                 // free unless a context appeared since the last frame
    let nt = FM.clockNow();       // READ the clock; never accumulate into it
    // loop-region wrap (takes priority over end-of-timeline when looping). Guard the wrap TARGET:
    // a stale loopIn at/after the end would re-fire this branch every frame with no progress (hang).
    if (FM.loop && FM.hasLoopRegion() && nt >= P.loopOut && P.loopIn < P.duration) {
      wrapTo(P.loopIn); rafId = requestAnimationFrame(tick); return;
    }
    if (nt >= P.duration) {
      if (FM.loop && P.duration > 0) {   // an empty timeline (duration 0) must fall through to pause, else the wrap spins forever at 100% CPU
        wrapTo(FM.hasLoopRegion() ? P.loopIn : 0);
        rafId = requestAnimationFrame(tick);
        return;
      }
      FM.time = P.duration;
      render(); FM.timeline.updatePlayhead(); updateReadout();
      FM.pause();
      return;
    }
    FM.time = nt;
    syncMediaToClock();                                   // sound first…
    if (FM.audioFxLive) FM.audioFxLive.applyAt(FM.time);   // keyframed audio-effect params follow the playhead
    // …picture second, and best-effort. Draw at most one canvas frame per PROJECT frame: whatever
    // the clock has already moved past is simply never drawn. Dropping frames is the correct
    // response to a comp that costs more than its frame budget — the alternative is to slow the
    // clock down to whatever the compositor can manage, which is the thing that used to shred the
    // audio. It also stops repainting an identical frame twice on a 60 Hz screen showing 30 fps.
    const fno = Math.floor(FM.time * (P.fps || 30) + 1e-6);
    if (fno !== _lastDrawnFrame) {
      if (_lastDrawnFrame >= 0 && fno > _lastDrawnFrame + 1) FM.playbackStats.drops += fno - _lastDrawnFrame - 1;
      _lastDrawnFrame = fno;
      FM.playbackStats.renders++;
      const _t0 = performance.now();
      render();
      notePlaybackCost(performance.now() - _t0);   // measures the RENDER, not the rAF gap — that's the part we can actually control
    }
    FM.timeline.updatePlayhead();
    updateReadout();
    rafId = requestAnimationFrame(tick);
  }

  FM.play = function () {
    if (FM.playing) return;
    if (FM.timeline && FM.timeline.stopMomentum) FM.timeline.stopMomentum();   // don't fight a timeline glide
    if (FM.time >= FM.scene.project.duration - 1e-3) FM.time = 0;
    FM.playing = true;
    FM.playbackStats = { syncs: 0, renders: 0, drops: 0, seeks: 0, trims: 0 };
    _renderAvg = 0; _tierCooldown = 8; _dropFrom = 0;   // let the first few frames settle before judging the machine, with no verdict pending from before
    resizeCanvas();                                     // …and re-size the canvas into playback quality
    // Play is the user gesture that unlocks the AudioContext; route the effected clips before they start.
    if (FM.audioFxLive) { FM.audioFxLive.resume(); FM.audioFxLive.syncAll(); }
    FM.scene.layers.forEach(layer => {
      if (layer.type !== 'video') return;
      const m = FM.media.get(layer.id);
      if (!m) return;
      const local = FM.layerLocalTime(layer, FM.time);
      if (local == null) { try { m.el.pause(); } catch (e) {} return; }
      // Forward clips play natively; reversed clips are drawn from the frame cache by tick.
      if (!layer.reversed) {
        try { m.el.currentTime = local; m._syncAt = performance.now(); } catch (e) {}
        // A new pass learns its own output latency from scratch (queue 148) — the offset from the
        // last one belongs to a different position, and on a phone often to a different device state.
        m._errBias = null; m._rateAt = 0; m._baseRate = null;
        try { m.el.playbackRate = Math.min(16, Math.max(0.0625, (FM.evalProp(layer.speed, FM.time) || 1) * (FM.previewRate || 1))); } catch (e) {}
        m.el.muted = FM.soloSilenced(layer);   // solo silences the others' audio, not just their picture
        m.el.volume = Math.max(0, Math.min(1, FM.layerVolume(layer, FM.time)));
        m.el.play().catch(() => {});
      }
    });
    // Start the clock here, alongside the audio it has to agree with: audioPlay.start() anchors
    // reversed buffers to audioCtx.currentTime, so both take their origin from the same reading.
    // If that call is what CREATED the context, adopt it immediately after, at the same scene time.
    clockAnchor(FM.time);
    if (FM.audioPlay) FM.audioPlay.start();   // reversed clips: play synthesized reversed audio
    clockAdopt();
    document.getElementById('btn-play').innerHTML = '<svg viewBox="0 0 24 24" class="tco" fill="currentColor"><rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/></svg>';   // pause icon
    rafId = requestAnimationFrame(tick);
  };

  // Ensure reversed + frame-blend clips are decoded before playback starts, then play.
  FM.requestPlay = async function () {
    const gen = ++_playGen;   // any pause (i.e. any navigation) invalidates this request — see _playGen
    const needCache = FM.scene.layers.filter(l => l.type === 'video' && FM.media.get(l.id) &&
      (l.reversed || (l.frameBlend && (FM.isAnimated(l.speed) || (l.speed || 1) < 1))));   // animated speed is an OBJECT — (obj||1)<1 is NaN<1=false, so a ramped frame-blend clip was never cached
    for (const l of needCache) {
      const m = FM.media.get(l.id);
      if (!m) continue;                                             // a project switch dropped the recs mid-await
      if (!m.frameCache) await FM.ensureReverseCache(l);            // frames for video
      if (gen !== _playGen) return;                                 // …checked after EVERY await, not just the last
      if (l.reversed && m.audioBuffer === undefined && m.file) m.audioBuffer = await FM.decodeAudio(m.file); // audio for reverse
      if (gen !== _playGen) return;
    }
    if (gen !== _playGen) return;
    FM.play();
  };

  FM.pause = function () {
    FM.playing = false;
    _playGen++;                 // cancels any requestPlay still waiting on a decode (see _playGen)
    CLK.on = false;                                             // the transport clock stops with the transport
    if (rafId) cancelAnimationFrame(rafId);
    FM.time = FM.snapFrame ? FM.snapFrame(FM.time) : FM.time;   // land ON a frame, never between two
    if (FM.audioPlay) FM.audioPlay.stop();
    FM.scene.layers.forEach(layer => {
      const m = FM.media.get(layer.id);
      if (m && m.el && m.el.pause) { try { m.el.pause(); m.el.muted = true; } catch (e) {} }
    });
    document.getElementById('btn-play').innerHTML = '<svg viewBox="0 0 24 24" class="tco" fill="currentColor"><path d="M7 4.5v15l12-7.5z"/></svg>';   // play icon
    // Stopped = you're looking at a frame, so put every pixel back. This is the visible "it sharpens
    // when you pause" moment, and it's the whole reason dropping quality during motion is acceptable.
    resizeCanvas();
    // Review play: any stop (button, space, end-of-timeline) returns the playhead to where review
    // started, so previewing never loses your working position.
    if (FM._reviewing) {
      FM._reviewing = false;
      const back = FM._reviewFrom; FM._reviewFrom = null;
      if (back != null && FM.setTime) FM.setTime(back);
    }
    if (FM.syncReviewButton) FM.syncReviewButton();   // revert the far-right button from ■ Stop back to the view icon
  };

  FM.togglePlay = function () { FM.playing ? FM.pause() : FM.requestPlay(); };

  // Review play (▶ at the far right of the transport): preview from the current frame, then snap back
  // to it when you stop — "play without moving the playhead". A second press stops + restores.
  FM.reviewPlay = function () {
    if (FM.playing) { FM.pause(); return; }
    FM._reviewFrom = FM.snapFrame ? FM.snapFrame(FM.time) : FM.time;
    FM._reviewing = true;
    // if playback never actually starts (a cache decode rejects), clear the flags so a later unrelated
    // pause() can't apply this stale review-origin and yank the playhead.
    Promise.resolve(FM.requestPlay()).catch(() => { FM._reviewing = false; FM._reviewFrom = null; });
  };

  // Re-anchor live audio to the current scene state mid-playback. Forward clips reconcile every frame
  // in tick(); reversed clips synthesize their audio once in audioPlay.start(), so a volume / mute /
  // fade / visibility / delete change needs that rebuilt to be heard. No-op unless something is playing
  // AND a reversed clip exists (so the common forward-only case stays free). (#6,#7,#8)
  FM.reconcileAudio = function () {
    // Routing follows the scene whether or not anything is playing, and whether or not a reversed clip
    // exists — so it runs ahead of both guards below. It self-skips layers with no audio effects.
    if (FM.audioFxLive) FM.audioFxLive.syncAll();
    if (!FM.playing || !FM.audioPlay) return;
    // No reversed clips left → STOP, don't just return. Un-reversing the last one used to leave its
    // AudioBufferSourceNode running to the end of the buffer, so the backwards audio played on top of
    // the element's forward audio that tick had meanwhile resumed.
    if (!FM.scene.layers.some(l => l.type === 'video' && l.reversed)) { FM.audioPlay.stop(); return; }
    FM.audioPlay.start();
  };

  /* ---------- layers ---------- */
  // Default length for a layer with no length of its own (photo, text, shape, drawing). Video keeps
  // its own duration. Settings owns the value; this clamps it so a hand-edited pref can't spawn a
  // zero-length or absurd layer.
  FM.defaultLayerDuration = function () {
    const v = FM.settings ? +FM.settings.get('layerDuration') : 5;
    return (isFinite(v) && v > 0) ? Math.min(60, v) : 5;
  };
  /* THE single place a new layer enters the scene. It exists because eight creators each did
   * `FM.scene.layers.unshift(layer)` by hand and only two of them — addEmptyGroup and groupSelection
   * — remembered to nest into the open group. Everything else (text, shapes, paths, camera, null,
   * adjustment, captions, imported media) landed with parent null, and the timeline's Edit Group view
   * filters on `inSubtree(layer, gctx)`, so a parentless layer is in NO subtree and never got a row.
   *
   * Measured in the running app: layers went 3 → 4 → 5 while the timeline stayed at 2 rows, with no
   * empty-state message either. The layer was selected and visibly drawn on the canvas but had no
   * clip — it could not be trimmed, moved in time, split, reordered or keyframed from the timeline,
   * and it was not really in the group, so animating the group afterwards left it behind. On a phone
   * the timeline IS the layer list, so it was unreachable until you happened to back out.
   *
   * A helper rather than eight more copies of the line, precisely so the ninth creator cannot forget
   * it. `!layer.parent` is deliberate: a caller that has already chosen a parent keeps it. */
  FM.insertLayer = function (layer) {
    if (FM.groupContext && !layer.parent) layer.parent = FM.groupContext;
    FM.scene.layers.unshift(layer);   // the ONE unshift — every creator routes through here
    return layer;
  };

  FM.addMediaLayer = function (rec) {
    const scene = FM.scene, P = scene.project;
    const first = scene.layers.length === 0;
    if (first && rec.width && rec.height) {
      P.width = rec.width; P.height = rec.height;
      resizeCanvas();
    }
    // Use the clip's FULL length — never cap it to the existing composition. A still has no length
    // of its own, so it takes the default from Settings.
    const dur = rec.kind === 'video' ? Math.max(0.1, rec.duration || 5) : FM.defaultLayerDuration();
    // Import AT THE PLAYHEAD (the first clip anchors at 0) — but never PAST THE END of the
    // composition. A playhead parked beyond everything (scrub to the end, then add) used to drop the
    // clip out there and grow the comp over the hole, so the import produced a silent gap of nothing
    // in front of it: measured 12.828s of comp, playhead at 16.828s, new clip at 16.828s, comp end
    // 29.656s — four seconds of black the user never asked for, with the clip they just added
    // stranded behind it. Clamped to the comp end it butts straight onto the existing work instead.
    const start = first ? 0 : Math.min(FM.time, P.duration || 0);
    const layer = FM.makeLayer(rec.kind, {
      name: rec.file ? rec.file.name.replace(/\.[^.]+$/, '') : rec.kind,
      x: P.width / 2, y: P.height / 2, start: start, duration: dur,
    });
    const fit = Math.min(P.width / rec.width, P.height / rec.height);
    layer.transform.scale = (isFinite(fit) && fit > 0) ? fit : 1;
    FM.media.set(layer.id, rec);
    if (rec.kind === 'video') {
      // Always re-render when a seek completes — including during playback, so reversed
      // clips (which we drive by seeking each frame) actually update while playing.
      rec.el.addEventListener('seeked', () => { if (FM._exporting || FM.playing) return; render(); });   // never repaint the PREVIEW mid-export: the exporter seeks every video every frame (#47)
      FM.wireVideoRepaint(rec);   // …and when the FIRST FRAME finally decodes, which no seek announces
    }
    // The playhead follows a clamped import, so you are looking AT the clip you just added rather
    // than at the empty time you happened to be parked in. Untouched in the normal case, where the
    // clip already starts exactly at the playhead.
    if (!first && start !== FM.time) FM.time = start;
    scene.layers.unshift(layer);
    scene.selectedId = layer.id;
    scene.selectedIds = [layer.id];
    // Composition grows to fit: the first clip sets the length; later clips extend it.
    if (first) P.duration = layer.start + layer.duration;
    else P.duration = Math.max(P.duration, layer.start + layer.duration);
    refreshAll();
    FM.seekVideosToTime();
    if (FM.history) FM.history.commit();
    if (FM.storage && FM.storage.save) FM.storage.save();   // write the new media blob to IDB now, not on the 600ms debounce → survives a quick tab background/close
    // Remember it in the Media library so it's one tap away next time — no picker, no Photos app.
    if (FM.mediaLib && rec.file) FM.mediaLib.add(rec, layer.id);
    // A clip the browser can OPEN but can't give a picture for (videoWidth/Height 0) renders as an
    // audio clip: the compositor's `cw = cr.w || w` becomes 0 and drawImage paints a zero-wide box.
    // That is right for an .m4a and is exactly the "it's like invisible" report when the file the
    // user picked was a VIDEO — measured with a 0-sized rec on v5.79: preview ink 0.00% at import,
    // 0.00% after 8.4s, 0.00% after a scrub, and not one alert, toast or console line. A layer that
    // can never show a picture has to SAY so; keyed on what the user picked (mediaKind), so importing
    // an actual song stays silent.
    if (rec.kind === 'video' && (!rec.width || !rec.height) && rec.file && FM.mediaKind && FM.mediaKind(rec.file) === 'video') {
      const nm = String(rec.file.name || 'that clip');
      // #toast shrink-fits inside the 50vw its left:50% containing block leaves it — ~190px at 380px.
      // Measured wrap of the full name + "added as audio only": 4 lines at 380px. This wording holds
      // 2 lines at 390px and 3 at 320px; the console line below keeps the untruncated name.
      const shortNm = nm.length > 16 ? nm.slice(0, 15) + '…' : nm;
      if (FM.toast) FM.toast('No picture in “' + shortNm + '” — audio only', 6000);
      try { console.warn('FreeMotion: “' + nm + '” reported 0×0 — this browser can read the file but not decode its video track, so the layer has sound and no picture.'); } catch (e) {}
    }
  }

  FM.addTextLayer = function () {
    const P = FM.scene.project;
    /* Sized off the SHORTER side, not the height (queue 134). Ezra: "Text is broken: 180pt renders
     * tiny." It was not broken — the size was reaching the renderer correctly, verified by measuring
     * the drawn ink at 40/160/180/400pt and finding it perfectly linear. The default was just wrong
     * for his frame: P.height/12 on his 4:3 2160p project gives exactly the 180 in his screenshot,
     * and 180 on a 2880-wide frame is 11.5% of the width where the same formula on 1080x1920 gives
     * 30%. Scaling by HEIGHT is only consistent while the height is the short side, i.e. portrait;
     * on anything landscape or square the word arrives about half the size it should be.
     * min(w,h)/6.75 is the same ratio expressed against whichever side is shorter — it returns 160 on
     * 1080x1920 exactly as before, so portrait projects are untouched, and 320 on 2880x2160 instead
     * of 180. */
    const shortSide = Math.min(P.width, P.height);
    const layer = FM.makeLayer('text', { name: 'Text', x: P.width / 2, y: P.height / 2, fontSize: Math.round(shortSide / 6.75), start: FM.time, duration: FM.defaultLayerDuration() });
    FM.insertLayer(layer);
    FM.scene.selectedId = layer.id;
    FM.scene.selectedIds = [layer.id];
    refreshAll();
    if (FM.history) FM.history.commit();
    // Jump straight into the AM-style focused text editor with the placeholder pre-selected, so the
    // first keystroke replaces it (matches AM: add text → keyboard up → type).
    if (FM.textEdit) FM.textEdit.start(layer.id, { selectAll: true });
  };

  // Null object: an invisible transform controller. Parent real layers to it and animate the
  // null to drive the whole rig (AM-style). Drawn as nothing; selectable via the timeline/canvas.
  FM.addNullLayer = function () {
    const P = FM.scene.project;
    const layer = FM.makeLayer('null', { name: 'Null', x: P.width / 2, y: P.height / 2, duration: P.duration || 5 });   // empty project (dur 0) → a usable 5s so the layer actually renders
    FM.insertLayer(layer);
    FM.scene.selectedId = layer.id;
    FM.scene.selectedIds = [layer.id];
    refreshAll();
    if (FM.history) FM.history.commit();
  };

  // Vector shape layer (any FM.traceShapePath kind, fill + stroke) — first-class graphics.
  // opts: { name, extra } — extra props (e.g. { sides: 6 } for a hexagon) land on the layer.
  // Natural default aspect (w×h multipliers) per shape kind — a Rectangle spawns landscape, an
  // arrow/line elongated, a semicircle as half a CIRCLE… instead of everything being an identical square.
  const SHAPE_ASPECT = {
    rect: [1.5, 1], line: [1.6, 0.4], arrow: [1.6, 0.8], semicircle: [1.3, 0.65],
    trapezoid: [1.4, 0.9], parallelogram: [1.5, 0.9],
    banner: [1.6, 0.7], cloud: [1.4, 0.95], boat: [1.1, 1.1],
    // these six come from traced references, so their aspect IS the reference's aspect
    check: [1.11, 0.9], thumbsup: [1.04, 0.96], pointhand: [0.94, 1.07],
    envelope: [1.33, 0.75], key: [0.7, 1.44],
    // CAR IS NOT ONE OF THEM ANY MORE — it must stay SQUARE. The v5.33 redraw stopped being a trace:
    // it is a landmark polyline carrying its OWN proportion inside the unit box (ink measures
    // 0.9576 x 0.5200 of it, i.e. 1.841:1) and it draws both tyres as true circles there. The box only
    // SCALES that drawing, so anything but 1:1 turns every wheel into an ellipse by exactly the box
    // ratio. The stale 1.76 x 0.57 left from the v3.96 trace is 3.093:1, which stretched the car to
    // 5.695:1 of ink and the wheels to 3.1:1 — Ezra: "really wide and streched out".
    // To draw a BIGGER car, scale both numbers together (e.g. [1.4, 1.4]); never one of them.
    car: [1, 1],
    // added shapes
    // A squircle is an app-icon shape — it's only itself when it's square. (Was 1.35:1, which made
    // the "Apple corners" pair at the top of the Shape tab spawn as a squashed rounded rectangle.)
    squircle: [1, 1], crown: [1.3, 0.85], eye: [1.5, 0.9], pin: [0.82, 1.1],
    lock: [0.88, 1], note: [0.9, 1],
  };
  FM.addShapeLayer = function (shape, opts) {
    opts = opts || {};
    const P = FM.scene.project;
    // Base size off the SHORTER project side so a shape is IDENTICAL in every format (9:16 / 16:9 /
    // 1:1 — never stretched by the canvas aspect), then apply the shape's own natural aspect so it
    // actually looks like what it's called (a circle stays a circle, a rectangle isn't a square).
    const d = Math.round(Math.min(P.width, P.height) / 3);
    // opts.aspect overrides the kind's natural one — how "Square" and "Rectangle" can both be `rect`.
    const asp = opts.aspect || SHAPE_ASPECT[shape || 'rect'] || [1, 1];
    const layer = FM.makeLayer('shape', {
      name: opts.name || (shape ? shape.charAt(0).toUpperCase() + shape.slice(1) : 'Shape'),
      shape: shape || 'rect', x: P.width / 2, y: P.height / 2,
      shapeW: Math.round(d * asp[0]), shapeH: Math.round(d * asp[1]),
      start: FM.time, duration: FM.defaultLayerDuration(),   // add AT THE PLAYHEAD (was start 0); a fixed 5s clip that extends the comp
      extra: opts.extra,
    });
    FM.insertLayer(layer);
    FM.scene.selectedId = layer.id;
    FM.scene.selectedIds = [layer.id];
    refreshAll();
    if (FM.history) FM.history.commit();
  };

  // Path shape layer from drawn points (freehand brush stroke / vector polygon). projPts are in
  // project pixels; stored normalized [0,1] inside a box fitted to their bounds so they scale/rotate
  // like any shape. opt: { closed, name, color, fill, stroke }.
  FM.addPathLayer = function (projPts, opt) {
    opt = opt || {};
    if (!projPts || projPts.length < 2) return null;
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    projPts.forEach(p => { if (p[0] < minX) minX = p[0]; if (p[0] > maxX) maxX = p[0]; if (p[1] < minY) minY = p[1]; if (p[1] > maxY) maxY = p[1]; });
    const w = Math.max(4, maxX - minX), h = Math.max(4, maxY - minY);
    // Keep the third element: [u,v,1] means "curve through this point" (see traceShapePath /
    // buildSubPath). Dropping it here is what forced every freehand stroke to render as a hard
    // polyline through its raw samples.
    const pts = projPts.map(p => (p.length > 2 ? [(p[0] - minX) / w, (p[1] - minY) / h, p[2]]
                                              : [(p[0] - minX) / w, (p[1] - minY) / h]));
    const P = FM.scene.project;
    const layer = FM.makeLayer('shape', {
      name: opt.name || 'Drawing', shape: 'path',
      x: minX + w / 2, y: minY + h / 2,
      shapeW: Math.round(w), shapeH: Math.round(h),
      start: FM.time, duration: FM.defaultLayerDuration(),   // appears at the playhead
      extra: { points: pts, closed: !!opt.closed },
    });
    if (opt.closed) {
      layer.fill = opt.fill || '#3a7bd5';
      layer.stroke = { enabled: false, width: 8, color: '#ffffff' };
    } else {
      layer.fill = opt.color || '#ffffff';   // open path is stroked with fill-as-colour (matches 'line')
      /* The border is OFF (queue 164). Ezra: "When I do freehand drawing and finish a stroke it will for
       * some reason make the stroke thicker when I let go of drawing."
       * Exactly double, and here is why. An open path is drawn twice by the compositor: a border
       * under-stroke at `lw * 2` — so half of it shows on each side of the line — and then the line
       * itself at `lw` in layer.fill. This used to hand it a border that was ENABLED and the SAME
       * COLOUR as the line, so the "outline" was invisible as an outline and simply made the mark
       * 2×lw wide. The live preview strokes at lw, so the stroke doubled at the instant of release.
       * The width still comes from here — the compositor reads stk.width whether or not the border is
       * enabled — so this only removes the doubling. Turning the border ON in Border & Shadow now does
       * what it says: an outline around the line, in whatever colour you pick. */
      layer.stroke = { enabled: false, width: opt.stroke || 6, color: opt.color || '#ffffff' };
    }
    FM.insertLayer(layer);
    FM.scene.selectedId = layer.id;
    FM.scene.selectedIds = [layer.id];
    refreshAll();
    if (FM.history) FM.history.commit();
    return layer;
  };

  // ---- multi-layer align & distribute (relative to the canvas; treats transform.x/y as centre) ----
  function alignTargets() {
    const ids = FM.selectionIds ? FM.selectionIds() : (FM.scene.selectedId ? [FM.scene.selectedId] : []);
    return FM.scene.layers.filter(l => ids.includes(l.id) && !l.locked);
  }
  function setAxis(layer, axis, val) {
    if (typeof layer.transform[axis] === 'number') layer.transform[axis] = val;
    else FM.setTransform(layer, axis, val, FM.time);   // animated → drop a keyframe at the playhead
  }
  FM.alignLayers = function (mode) {
    const P = FM.scene.project, layers = alignTargets();
    if (!layers.length) return;
    layers.forEach(layer => {
      const sz = FM.layerSize(layer), sc = FM.evalProp(layer.transform.scale, FM.time) || 1;
      const hw = sz.w * sc / 2, hh = sz.h * sc / 2;
      if (mode === 'left') setAxis(layer, 'x', Math.round(hw));
      else if (mode === 'hcenter') setAxis(layer, 'x', Math.round(P.width / 2));
      else if (mode === 'right') setAxis(layer, 'x', Math.round(P.width - hw));
      else if (mode === 'top') setAxis(layer, 'y', Math.round(hh));
      else if (mode === 'vcenter') setAxis(layer, 'y', Math.round(P.height / 2));
      else if (mode === 'bottom') setAxis(layer, 'y', Math.round(P.height - hh));
    });
    refreshAll(); FM.requestRender(); if (FM.canvasEdit) FM.canvasEdit.update(); if (FM.history) FM.history.commit();
  };
  FM.distributeLayers = function (axis) {
    const key = axis === 'h' ? 'x' : 'y', layers = alignTargets();
    if (layers.length < 3) return;
    const items = layers.map(l => ({ l, p: FM.evalProp(l.transform[key], FM.time) })).sort((a, b) => a.p - b.p);
    const first = items[0].p, last = items[items.length - 1].p, step = (last - first) / (items.length - 1);
    items.forEach((it, i) => { if (i === 0 || i === items.length - 1) return; setAxis(it.l, key, Math.round(first + step * i)); });
    refreshAll(); FM.requestRender(); if (FM.canvasEdit) FM.canvasEdit.update(); if (FM.history) FM.history.commit();
  };

  // Camera: a 2D camera the whole scene is viewed through — pan (x/y), zoom (scale), rotate.
  // Neutral by default (centred, zoom 1) so adding one doesn't change the frame until animated.
  FM.addCameraLayer = function () {
    const P = FM.scene.project;
    if (FM.scene.layers.some(l => l.type === 'camera')) { if (FM.toast) FM.toast('Scene already has a camera'); return; }
    const layer = FM.makeLayer('camera', { name: 'Camera', x: P.width / 2, y: P.height / 2, duration: P.duration || 5 });
    FM.insertLayer(layer);
    FM.scene.selectedId = layer.id;
    FM.scene.selectedIds = [layer.id];
    refreshAll();
    if (FM.history) FM.history.commit();
  };

  // Adjustment layer: an effect layer that grades/filters everything beneath it (AM-style).
  FM.addAdjustmentLayer = function () {
    const P = FM.scene.project;
    const layer = FM.makeLayer('adjustment', { name: 'Adjustment', x: P.width / 2, y: P.height / 2, duration: P.duration || 5 });
    layer.effects = [{ type: 'brightness', enabled: true, params: { amount: 1.15 } }, { type: 'saturate', enabled: true, params: { amount: 1.35 } }];
    FM.insertLayer(layer);
    FM.scene.selectedId = layer.id;
    FM.scene.selectedIds = [layer.id];
    refreshAll();
    if (FM.history) FM.history.commit();
  };

  FM.addCaptionLayer = function () {
    const P = FM.scene.project;
    const dur = P.duration || 5;   // empty project → a usable 5s track (was duration 0 = invisible)
    const layer = FM.makeLayer('text', { name: 'Captions', x: P.width / 2, y: Math.round(P.height * 0.82), fontSize: Math.round(P.height / 22), duration: dur });
    const seg = Math.max(0.5, Math.min(2.5, dur / 2));
    layer.captions = [{ start: 0, end: Math.min(seg, dur), text: 'First caption' }];
    if (dur > seg + 0.3) layer.captions.push({ start: seg, end: Math.min(dur, seg * 2), text: 'Second caption' });   // only if there's room (no zero-length segment on tiny projects)
    layer.text = '';
    layer.captionBg = true;
    FM.insertLayer(layer);
    FM.scene.selectedId = layer.id;
    FM.scene.selectedIds = [layer.id];
    refreshAll();
    if (FM.history) FM.history.commit();
    /* …and open the editor on the FIRST cue, exactly as addTextLayer does for a text layer. Without
     * this, adding a caption track dropped two placeholder cues on the timeline and left you looking
     * at them with no way in that you would find — the cue buttons are inside the Aa sheet, several
     * taps away. The scrub is what makes the editor bind to cue 0 rather than to wherever the
     * playhead happened to be: text-edit's bindCue asks captions.indexAt(layer, FM.time), and if the
     * playhead is past the seeded cues that call ADDS a third, empty one. Landing on the cue and
     * pre-selecting it means the first keystroke replaces "First caption" — the same "add → keyboard
     * up → type" run a text layer gives you. Mirrors the cue button in captions.js. */
    const c0 = layer.captions[0];
    if (c0 && FM.scrubTime) FM.scrubTime((layer.start || 0) + c0.start + Math.min(0.05, (c0.end - c0.start) / 2));
    if (FM.textEdit) FM.textEdit.start(layer.id, { selectAll: true });
  };

  // The current selection set (primary = FM.scene.selectedId, used by inspector/canvas-edit).
  FM.selectionIds = function () {
    const ids = FM.scene.selectedIds;
    if (ids && ids.length) return ids.filter(id => FM.layerById(FM.scene, id));
    return FM.scene.selectedId ? [FM.scene.selectedId] : [];
  };

  FM.selectLayer = function (id) {
    FM.selectMode = false;   // single-select anywhere (canvas/clip/head) exits multi-select mode (#r8)
    // Selecting a DIFFERENT layer must close the crop tool — it has no rAF loop and never self-closes,
    // so it stayed bound to the old layer (composited uncropped) while the inspector showed the new one.
    if (FM.cropTool && FM.cropTool.isActive() && FM.cropTool.layerId && FM.cropTool.layerId() !== id) FM.cropTool.stop();
    // Isolate is scoped to the layer it was armed on — selecting anything else drops it, so you can
    // never be left looking at a filtered scene and wondering why the others vanished.
    if (FM.isolate && FM.isolate.id !== id && FM.setIsolate) FM.setIsolate(0);
    FM.scene.selectedId = id;
    FM.scene.selectedIds = id ? [id] : [];
    FM.syncSelectionChrome();   // BEFORE the rebuild — sel-mode/sel-multi change what it renders
    /* ONE rebuild, not two. FM.layersPanel.refresh() is a compatibility shim whose whole body is
     * FM.timeline.rebuild() (see the alias below), so calling it here and rebuild() four lines later
     * rebuilt the ENTIRE timeline twice on the most common interaction in the app — autoFitDuration
     * over every layer, up to ~1,900 ruler divs through innerHTML, a row per clip, twice.
     * Measured (12 taps, 1440px, unthrottled): median tap 2.2 ms at 5 layers, 7.4 at 20, 17.0 at 40,
     * 32.8 ms at 80, with a constant 2.0 rebuilds per tap. */
    FM.inspector.refresh();
    FM.timeline.rebuild();
    if (FM.syncTopBar) FM.syncTopBar();   // name field ↔ layer name + delete button
    if (FM.canvasEdit) FM.canvasEdit.update();
  };

  // Scoped to the open group (Edit Group), not the whole project. Selecting layers you cannot even
  // see was wrong twice over: "Select All → Group Selection" swept the group you were INSIDE into its
  // own new child and bricked the project (a parent cycle — see FM.groupSelection), and "Select All →
  // Delete" inside a group deleted every layer in the document rather than the group's contents.
  FM.selectAll = function () {
    const pool = FM.groupContext ? FM.groupDescendants(FM.groupContext) : FM.scene.layers;
    const ids = pool.map(l => l.id);
    FM.scene.selectedIds = ids;
    FM.scene.selectedId = ids.length ? ids[0] : null;
    FM.refreshAll();   // FM.* so the multi-select chrome (Group button, sel-multi class, top bar) syncs
  };

  // Shift/Cmd-click: add or remove a layer from the selection set.
  FM.toggleSelect = function (id, silent) {
    let ids = FM.selectionIds().slice();
    if (ids.includes(id)) { ids = ids.filter(x => x !== id); FM.scene.selectedId = ids.length ? ids[ids.length - 1] : null; }
    else { ids.push(id); FM.scene.selectedId = id; }
    FM.scene.selectedIds = ids;
    if (silent) return;   // paint-select updates mid-gesture — a rebuild here would detach the pointer's target
    FM.refreshAll();   // sync the multi-select chrome (was inspector+timeline only → Group button/sel-multi never appeared)
  };

  // Delete every layer in the selection set (one history step).
  // Leave the Edit Group view if the group it is scoped to no longer exists. Shared by deleteSelected
  // and resetProject; deleteLayer and history.restore already had their own equivalent.
  function exitDeadGroupContext() {
    if (!FM.groupContext) return;
    if (FM.scene.layers.some(l => l.id === FM.groupContext)) return;
    if (FM.exitGroup) FM.exitGroup(true); else FM.groupContext = null;
  }

  FM.deleteSelected = function () {
    const sel = FM.selectionIds(); if (!sel.length) return;
    // Tear down any open overlay tool first (deleteLayer already does) — Delete during crop/point-edit
    // otherwise orphaned the overlay and left its "Done" button dead over a deleted layer.
    if (FM.cropTool && FM.cropTool.isActive && FM.cropTool.isActive()) FM.cropTool.stop();
    if (FM.pointEdit && FM.pointEdit.isActive && FM.pointEdit.isActive()) FM.pointEdit.stop();
    if (FM.fillDrag && FM.fillDrag.isActive && FM.fillDrag.isActive()) FM.fillDrag.stop();
    if (FM.textEdit && FM.textEdit.isActive && FM.textEdit.isActive()) FM.textEdit.stop();
    if (FM.touchupTool && FM.touchupTool.isOpen && FM.touchupTool.isOpen()) FM.touchupTool.close();
    // Cascade groups → their members (mirror deleteLayer) — deleting a group row must not leave its
    // members behind pointing at a dead parent id.
    const set = new Set(sel);
    sel.forEach(id => { const l = FM.layerById(FM.scene, id); if (l && l.type === 'group' && FM.groupDescendants) FM.groupDescendants(id).forEach(m => set.add(m.id)); });
    // Stop native/synth audio + drop the (rebuildable) frame cache — but DON'T destroy the media
    // registry entry or its IDB blob: undo restores the layer JSON, and a wiped blob = permanently
    // blank clip + lost footage (same fix as deleteLayer). Orphans are reaped by the boot sweep.
    set.forEach(id => { const m = FM.media.get(id); if (m) { if (m.el) { try { m.el.pause(); m.el.muted = true; } catch (e) {} } FM.clearFrameCache(m); if (FM.clearClipStrip) FM.clearClipStrip(m); if (FM.audioFxLive) FM.audioFxLive.release(id); } });
    FM.scene.layers = FM.scene.layers.filter(l => !set.has(l.id));
    /* …and if the group you were INSIDE was in that set, leave it. deleteLayer already validates this
     * and so does history.restore on undo; deleteSelected did not, and Select All inside a group
     * routinely includes the group itself (FM.selectAll takes every layer in the project, not just
     * the ones in scope). Left dangling, FM.groupContext still named the dead group: the crumb stayed
     * on screen with its name, body.group-editing stayed set, the timeline rendered ZERO rows with no
     * empty state, and any group created afterwards was written with `parent` pointing at a deleted
     * id — then autosaved. */
    exitDeadGroupContext();
    FM.scene.selectedId = FM.scene.layers[0] ? FM.scene.layers[0].id : null;
    FM.scene.selectedIds = FM.scene.selectedId ? [FM.scene.selectedId] : [];
    // Keyboard Delete/Backspace routes here; mirror deleteLayer's reversed-audio rebuild so a deleted
    // reversed clip's synthesized audio stops (forward elements were just paused above). (#6)
    if (FM.playing && FM.audioPlay) { FM.audioPlay.stop(); FM.audioPlay.start(); }
    FM.refreshAll();   // FM.* (not the local) so the mobile wrapper runs → deleting the last layer drops the sheet (#13)
    if (FM.history) FM.history.commit();
  };

  FM.deleteLayer = function (id, _nested) {
    if (FM.tracker && FM.tracker.isPicking && FM.tracker.isPicking()) FM.tracker.cancel();   // don't leave a dead tracking overlay
    if (FM.pointEdit && FM.pointEdit.isActive && FM.pointEdit.isActive()) FM.pointEdit.stop();
    if (FM.cropTool && FM.cropTool.isActive && FM.cropTool.isActive()) FM.cropTool.stop();
    if (FM.fillDrag && FM.fillDrag.isActive && FM.fillDrag.isActive()) FM.fillDrag.stop();
    if (FM.textEdit && FM.textEdit.isActive && FM.textEdit.isActive() && FM.textEdit.layerId() === id) FM.textEdit.stop();   // don't leave a dead text editor over a deleted layer
    if (FM.groupContext === id && FM.exitGroup) FM.exitGroup(true);   // deleting the group you're inside
    // Deleting a GROUP deletes its members too (AM). Recurse first so nested groups cascade and
    // each member's media/audio teardown runs through this same path — but refresh/undo commit
    // only once, at the outermost call (one Ctrl+Z restores the whole group). (#r7)
    const target = FM.scene.layers.find(l => l.id === id);
    if (target && target.type === 'group') {
      FM.scene.layers.filter(l => l.parent === id).forEach(child => FM.deleteLayer(child.id, true));
    }
    const m = FM.media.get(id);
    if (m) { if (m.el) { try { m.el.pause(); m.el.muted = true; } catch (e) {} } FM.clearFrameCache(m); if (FM.clearClipStrip) FM.clearClipStrip(m); if (FM.audioFxLive) FM.audioFxLive.release(id); }   // stop a deleted forward clip's native audio (#6)
    FM.scene.layers = FM.scene.layers.filter(l => l.id !== id);
    // Deliberately KEEP the media registry entry and its IndexedDB blob: undo restores the layer's
    // JSON only, so destroying media here made an undone delete come back permanently BLANK (the
    // worst kind of data loss). Truly orphaned blobs are reaped by the boot-time pruneOrphans sweep.
    if (_nested) return;   // outermost call finishes the teardown below exactly once (#r7)
    // A deleted clip's synthesized (reversed) audio plays from a flat node list not keyed by layer, so
    // it keeps sounding after the clip is gone. Rebuild the active nodes from the post-delete layer set.
    if (FM.playing && FM.audioPlay) { FM.audioPlay.stop(); FM.audioPlay.start(); }
    // VALIDATE, don't just compare to id: deleting a group cascades to its members, so selectedId may
    // point at a now-deleted DESCENDANT (not id itself) — a phone zombie edit-mode on a dead layer.
    if (!FM.layerById(FM.scene, FM.scene.selectedId)) FM.scene.selectedId = FM.scene.layers[0] ? FM.scene.layers[0].id : null;
    FM.scene.selectedIds = (FM.scene.selectedIds || []).filter(sid => FM.layerById(FM.scene, sid));
    if (!FM.scene.selectedIds.length && FM.scene.selectedId) FM.scene.selectedIds = [FM.scene.selectedId];
    FM.refreshAll();   // FM.* (not the local) so the mobile wrapper runs → deleting the last layer drops the sheet (#13)
    if (FM.history) FM.history.commit();
  };

  // An EMPTY group (Add → Elements). Grouping otherwise requires selecting two layers first, so there
  // was no way to make the container and then fill it — which is the order you actually work in when
  // you know a section is coming. A childless group draws nothing and is never pruned, so it simply
  // waits; parent layers to it, or drag them under it, and it starts behaving like any other group.
  FM.addEmptyGroup = function () {
    const P = FM.scene.project;
    const g = FM.makeLayer('group', { name: 'Group', x: 0, y: 0, start: 0, duration: P.duration || 5 });
    if (FM.groupContext) g.parent = FM.groupContext;   // made while editing a group → nests inside it
    FM.scene.layers.unshift(g);
    FM.selectLayer(g.id);
    if (FM.toast) FM.toast('Empty group — parent layers to it, or drag them under it', 2400);
    if (FM.history) FM.history.commit();
    return g;
  };

  // ---- AM-style grouping: a 'group' layer is an invisible transform parent; members follow it
  // via the existing parent chain. Timeline shows the group as a collapsible row.
  // opts.mask → MASKING group: the top member clips the rest (composited as one unit in renderScene).
  FM.groupSelection = function (opts) {
    opts = opts || {};
    const ids = FM.selectionIds();
    // A group can never contain something it lives INSIDE. FM.selectAll used to hand back every layer
    // in the project, so "Select All → Group Selection" while editing a group made the open group a
    // member of its own new child: G.parent === G2 while G2.parent === G. The first parent walk after
    // that threw, and because the cycle lives in FM.scene.layers the autosave persisted it — the
    // project could not be opened or deleted again. selectAll is scoped now; this is the second lock
    // on the same door, because ANY future path that offers an ancestor as a member is the same brick.
    const ancestors = new Set();
    for (let a = FM.groupContext, hops = 0; a && hops < 64; hops++) {
      ancestors.add(a);
      const up = FM.scene.layers.find(l => l.id === a);
      a = up && up.parent;
    }
    const members = FM.scene.layers.filter(l => ids.includes(l.id) && l.type !== 'camera' && !ancestors.has(l.id));
    if (members.length < 2) return;
    const start = Math.min.apply(null, members.map(l => l.start));
    const end = Math.max.apply(null, members.map(l => l.start + l.duration));
    // NEUTRAL transform (0,0) — the group becomes the members' PARENT, so any x/y here would
    // instantly displace every member by that amount the moment they're grouped.
    const g = FM.makeLayer('group', { name: opts.mask ? 'Mask Group' : 'Group', x: 0, y: 0, start: start, duration: end - start });
    if (opts.mask) g.maskGroup = true;
    if (FM.groupContext) g.parent = FM.groupContext;   // grouping while editing a group nests inside it
    // Re-parent only top-level members — a child whose parent is also being grouped keeps it.
    // Tested against MEMBERS, not the raw selection: a layer can be selected and still be refused as
    // a member (a camera, or an ancestor caught by the guard above), and if its children checked the
    // selection they would keep pointing at a non-member and the new group would come out empty.
    const memberIds = new Set(members.map(l => l.id));
    members.forEach(l => { if (!l.parent || !memberIds.has(l.parent)) l.parent = g.id; });
    // Pull members contiguous directly under the group row (top-most member's slot).
    const topIdx = FM.scene.layers.findIndex(l => members.includes(l));
    FM.scene.layers = FM.scene.layers.filter(l => !members.includes(l));
    FM.scene.layers.splice(Math.max(0, Math.min(topIdx, FM.scene.layers.length)), 0, g);
    Array.prototype.splice.apply(FM.scene.layers, [FM.scene.layers.indexOf(g) + 1, 0].concat(members));
    FM.selectMode = false;
    FM.selectLayer(g.id);
    if (FM.toast) FM.toast(opts.mask ? 'Masking group — its top layer clips the rest' : 'Grouped ' + members.length + ' layers');
    if (FM.history) FM.history.commit();
  };
  FM.ungroup = function (id) {
    const g = FM.scene.layers.find(l => l.id === id);
    if (!g || g.type !== 'group') return;
    if (FM.groupContext === id) FM.exitGroup(true);
    FM.scene.layers.forEach(l => { if (l.parent === id) l.parent = g.parent || null; });   // members lift into the parent context
    FM.scene.layers = FM.scene.layers.filter(l => l !== g);
    FM.selectLayer(null);
    FM.refreshAll();
    if (FM.history) FM.history.commit();
  };

  // ---- Edit Group (AM): open a group in its own timeline view — only its members show, edit them
  // individually, then back out (‹ back / the crumb pill). Purely a view scope; time stays global.
  FM.groupContext = null;
  function updateGroupCrumb() {
    const c = document.getElementById('group-crumb'); if (!c) return;
    const g = FM.groupContext ? FM.scene.layers.find(l => l.id === FM.groupContext) : null;
    if (g) { c.querySelector('.gc-name').textContent = g.name || 'Group'; c.classList.remove('hidden'); document.body.classList.add('group-editing'); }
    else { c.classList.add('hidden'); document.body.classList.remove('group-editing'); }
  }
  FM.enterGroup = function (id) {
    const g = FM.scene.layers.find(l => l.id === id && l.type === 'group');
    if (!g) return;
    FM.selectMode = false;
    FM.groupContext = id;
    FM.selectLayer(null);
    updateGroupCrumb();
    FM.refreshAll();
  };
  FM.exitGroup = function (silent) {
    const id = FM.groupContext;
    FM.groupContext = null;
    updateGroupCrumb();
    if (!silent && id && FM.scene.layers.some(l => l.id === id)) FM.selectLayer(id);
    else FM.refreshAll();
  };
  FM.groupDescendants = function (id) {
    const out = [], seen = new Set();
    const walk = gid => {
      if (seen.has(gid)) return;   // a parent cycle would recurse until the stack blew
      seen.add(gid);
      FM.scene.layers.forEach(l => { if (l.parent === gid) { out.push(l); if (l.type === 'group') walk(l.id); } });
    };
    walk(id);
    return out;
  };

  // Export the current frame as a PNG (clean render, no onion/overlays).
  FM.snapshotPNG = function () {
    const P = FM.scene.project;
    const c = document.createElement('canvas'); c.width = P.width; c.height = P.height;
    FM.renderScene(c.getContext('2d'), FM.scene, FM.time);
    const base = (P.name || 'frame').replace(/[^\w\- ]+/g, ' ').replace(/\s+/g, ' ').trim() || 'frame';
    c.toBlob(blob => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = base + '-' + FM.time.toFixed(2) + 's.png';
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    }, 'image/png');
  };

  // Trim (or grow) the project duration to end exactly at the last clip.
  FM.fitToContent = function () {
    if (!FM.scene.layers.length) return;
    const end = Math.max(0.5, ...FM.scene.layers.map(l => l.start + l.duration));
    FM.scene.project.duration = Math.round(end * 1000) / 1000;
    if (FM.time > FM.scene.project.duration) FM.setTime(FM.scene.project.duration);
    refreshAll();
    if (FM.history) FM.history.commit();
  };

  // Release a clip's decoded frame cache when neither reverse nor frame-blend-slow needs it anymore.
  FM.maybeClearCache = function (layer) {
    const m = FM.media.get(layer.id);
    if (m && !layer.reversed && !(layer.frameBlend && (FM.isAnimated(layer.speed) || (layer.speed || 1) < 1))) FM.clearFrameCache(m);   // keep the cache a ramped frame-blend clip still needs (animated speed is an object)
  };

  // Give a cloned layer its OWN fresh media element (never alias the source's — a shared <video>
  // would double-seek). Shared by duplicate / split.
  async function reloadMediaTo(srcId, dstId) {
    const rec = FM.media.get(srcId);
    if (!rec || !rec.file || (rec.kind !== 'video' && rec.kind !== 'image')) return;
    let nrec = null;
    try { nrec = rec.kind === 'video' ? await FM.loadVideoFile(rec.file) : await FM.loadImageFile(rec.file); } catch (e) { nrec = null; }
    if (nrec && nrec !== rec) {
      FM.media.set(dstId, nrec);
      if (nrec.kind === 'video') nrec.el.addEventListener('seeked', () => { if (FM._exporting || FM.playing) return; render(); });
    }
  }

  FM.duplicateLayer = async function (id, inPlace) {
    const src = FM.layerById(FM.scene, id);
    if (!src) return;
    if (src.type === 'camera') { if (FM.toast) FM.toast('Scene already has a camera'); return; }   // single-camera invariant — a 2nd (offset) camera would hijack the view
    // inPlace → a plain copy: same position AND no " copy" suffix or new clip colour. Since queue 156
    // an ordinary duplicate is also positionally exact; inPlace is now purely about the naming/colour.
    const copy = FM.cloneLayer(src, !!inPlace);
    await reloadMediaTo(id, copy.id);
    const inserts = [copy];
    if (src.type === 'group' && FM.groupDescendants) {
      // a group is just a parent link — duplicating ONLY the group row made an empty invisible group.
      // Clone its whole subtree with fresh ids and remap parents through an idMap (like pasteClipboard).
      const idMap = Object.create(null); idMap[src.id] = copy.id;
      for (const d of FM.groupDescendants(id)) {
        const dc = FM.cloneLayer(d, true);   // plain copy — the group offset already moved the block
        idMap[d.id] = dc.id;
        await reloadMediaTo(d.id, dc.id);
        inserts.push(dc);
      }
      inserts.forEach(l => {
        if (l.parent && idMap[l.parent]) l.parent = idMap[l.parent];
        // follow.targetId / audio.sourceId that point INSIDE the duplicated subtree must follow it —
        // otherwise the duplicate's behaviors silently keep driving off the ORIGINAL group's layers.
        if (Array.isArray(l.behaviors)) l.behaviors.forEach(bh => {
          if (!bh || !bh.params) return;
          ['targetId', 'sourceId'].forEach(k => { if (bh.params[k] && idMap[bh.params[k]]) bh.params[k] = idMap[bh.params[k]]; });
        });
        // Same rule for an effect's layer ref (Luma Matte / Compound Blur / Match Grade /
        // Displacement Map): a source INSIDE the duplicated subtree must follow the copy. A source
        // outside it is deliberately left alone — that layer is still in the scene, and both the
        // original and the copy legitimately matte off it.
        if (Array.isArray(l.effects)) l.effects.forEach(fx => {
          if (fx && fx.params && fx.params.source && idMap[fx.params.source]) fx.params.source = idMap[fx.params.source];
        });
        if (l.karaokeOf && idMap[l.karaokeOf]) l.karaokeOf = idMap[l.karaokeOf];
      });
    }
    const idx = FM.scene.layers.findIndex(l => l.id === id);
    FM.scene.layers.splice(Math.max(0, idx), 0, ...inserts);
    FM.scene.selectedId = copy.id;
    FM.scene.selectedIds = [copy.id];   // keep the selection SET in sync — a stale selectedIds made Delete hit the original
    FM.refreshAll();
    FM.seekVideosToTime();
    if (FM.history) FM.history.commit();
    if (FM.storage && FM.storage.save) FM.storage.save();   // persist the duplicated layer's media blob immediately
  };

  // Duplicate EVERY selected layer, not just the primary (Ezra: "when I selected multiple stuff I
  // can't duplicate all the stuff I have selected, I have to manually duplicate each thing"). Runs
  // them one at a time because duplicateLayer awaits a media reload per layer, and a group already
  // brings its whole subtree — so a descendant that is ALSO selected is skipped rather than copied
  // twice. One undo step for the lot, and the copies end up selected so the next move applies to them.
  FM.duplicateSelection = async function (inPlace) {
    const ids = FM.selectionIds ? FM.selectionIds() : (FM.scene.selectedId ? [FM.scene.selectedId] : []);
    if (!ids.length) return;
    if (ids.length === 1) { await FM.duplicateLayer(ids[0], inPlace); return; }
    const inside = {};
    ids.forEach(id => {
      const l = FM.layerById(FM.scene, id);
      if (l && l.type === 'group' && FM.groupDescendants) FM.groupDescendants(id).forEach(d => { inside[d.id] = 1; });
    });
    const todo = ids.filter(id => !inside[id]);
    const made = [];
    // duplicateLayer commits history itself, so the loop would leave one undo entry PER layer and
    // reversing a single button press would take three presses of undo. Muted for the run, then one
    // commit at the end — the whole duplication is one action, so it is one step back.
    const hist = FM.history, realCommit = hist && hist.commit;
    if (hist) hist.commit = function () {};
    try {
      for (const id of todo) {
        await FM.duplicateLayer(id, inPlace);
        if (FM.scene.selectedId && made.indexOf(FM.scene.selectedId) < 0) made.push(FM.scene.selectedId);
      }
    } finally { if (hist) hist.commit = realCommit; }
    if (made.length) { FM.scene.selectedIds = made; FM.scene.selectedId = made[made.length - 1]; }
    FM.refreshAll();
    if (FM.history) FM.history.commit();
    if (FM.toast) FM.toast('Duplicated ' + made.length + ' layers', 1600);
  };

  // ---- copy / paste layers (in-memory clipboard; survives across the session) ----
  FM.clipboard = [];
  FM.copySelection = function () {
    const ids = FM.selectionIds ? FM.selectionIds() : (FM.scene.selectedId ? [FM.scene.selectedId] : []);
    if (!ids.length) return 0;
    // Preserve array order so a copied parent/child keep their relative stacking.
    const ordered = FM.scene.layers.filter(l => ids.includes(l.id));
    FM.clipboard = ordered.map(layer => {
      const rec = FM.media.get(layer.id);
      return { snapshot: JSON.parse(JSON.stringify(layer)), file: (rec && rec.file) ? rec.file : null, kind: rec ? rec.kind : null };
    });
    return FM.clipboard.length;
  };
  // insertIndex: z-position to drop the pasted layers at (0 = top, layers.length = bottom).
  // Omitted → top, matching duplicate/add. The ⧉ Paste-Layer split-button's arrow passes a chosen index.
  FM.pasteClipboard = async function (insertIndex) {
    if (!FM.clipboard || !FM.clipboard.length) return;
    const idMap = Object.create(null);   // null-proto: a crafted parent/target id of 'constructor' must not "remap" to a prototype function
    const copies = FM.clipboard.map(entry => {
      // fresh id + " copy". No positional offset any more (queue 156) — a paste lands exactly on the
      // source's position, which matches the AM behaviour this function already follows for TIME
      // (it re-times to the playhead just below).
      const copy = FM.cloneLayer(entry.snapshot);
      idMap[entry.snapshot.id] = copy.id;
      return { copy, entry };
    });
    // Paste at the PLAYHEAD (like AM) instead of back on the source clip's original time.
    // Anchor the earliest copied clip to the playhead and keep the relative offsets between
    // clips that were copied together. autoFitDuration (via refreshAll) grows the timeline if
    // a pasted clip now runs past the end.
    const base = (typeof FM.snapFrame === 'function') ? FM.snapFrame(FM.time) : FM.time;
    const minStart = FM.clipboard.reduce((m, e) => Math.min(m, e.snapshot.start || 0), Infinity);
    const anchor = isFinite(minStart) ? minStart : 0;
    copies.forEach(({ copy, entry }) => {
      const orig = entry.snapshot.start || 0;
      copy.start = Math.max(0, base + (orig - anchor));
      if (FM.shiftLayerKeyframes) FM.shiftLayerKeyframes(copy, copy.start - orig);   // keyframes are absolute time — pasted animation must ride to the playhead
    });
    let insertAt = (typeof insertIndex === 'number' && insertIndex >= 0) ? Math.min(insertIndex, FM.scene.layers.length) : 0;   // TOP of the z-stack by default (layers[0] = top)
    for (const { copy, entry } of copies) {
      // Remap parent: a parent copied in the same batch → its new clone; else keep if still present, else drop.
      if (copy.parent) {
        if (idMap[copy.parent]) copy.parent = idMap[copy.parent];
        else if (!FM.layerById(FM.scene, copy.parent)) copy.parent = null;
      }
      // Behaviors carry CROSS-LAYER id refs too (follow.targetId / audio.sourceId) — same rule as
      // parent, mirroring storage.js reIdLayers: batch-mate → its clone; a live outside layer keeps;
      // a dead ref is cleared so the behavior no-ops instead of silently pointing at the old original.
      if (Array.isArray(copy.behaviors)) copy.behaviors.forEach(bh => {
        if (!bh || !bh.params) return;
        ['targetId', 'sourceId'].forEach(k => {
          const id0 = bh.params[k];
          if (!id0) return;
          if (idMap[id0]) bh.params[k] = idMap[id0];
          else if (!FM.layerById(FM.scene, id0)) bh.params[k] = '';
        });
      });
      // …and an effect's layer ref, by the same three-way rule.
      if (Array.isArray(copy.effects)) copy.effects.forEach(fx => {
        if (!fx || !fx.params || !fx.params.source) return;
        if (idMap[fx.params.source]) fx.params.source = idMap[fx.params.source];
        else if (!FM.layerById(FM.scene, fx.params.source)) fx.params.source = '';
      });
      if (copy.karaokeOf) {
        if (idMap[copy.karaokeOf]) copy.karaokeOf = idMap[copy.karaokeOf];
        else if (!FM.layerById(FM.scene, copy.karaokeOf)) copy.karaokeOf = null;
      }
      if (entry.file && entry.kind && entry.kind !== 'text') {
        let nrec = null;
        try {
          if (entry.kind === 'video') nrec = await FM.loadVideoFile(entry.file);
          else if (entry.kind === 'image') nrec = await FM.loadImageFile(entry.file);
        } catch (e) { nrec = null; }
        if (nrec) {
          FM.media.set(copy.id, nrec);
          if (nrec.kind === 'video') nrec.el.addEventListener('seeked', () => { if (FM._exporting || FM.playing) return; render(); });
        }
      }
      // Single-camera invariant. FM.duplicateLayer enforces it; paste did not, so Cmd-C then Cmd-V
      // on the camera made a SECOND one, and the composite takes the first it finds — the view was
      // then driven by a camera that was not the one being edited.
      if (copy.type === 'camera' && FM.scene.layers.some(l => l.type === 'camera')) {
        if (FM.toast) FM.toast('Scene already has a camera');
        continue;
      }
      FM.scene.layers.splice(insertAt++, 0, copy);
    }
    const newIds = copies.map(c => c.copy.id);
    FM.scene.selectedIds = newIds;
    FM.scene.selectedId = newIds[newIds.length - 1] || null;
    refreshAll();
    FM.seekVideosToTime();
    if (FM.history) FM.history.commit();
    if (FM.storage && FM.storage.save) FM.storage.save();   // persist pasted layers' media blobs immediately
  };

  // ---- replace a layer's media, keeping its transform / keyframes / timing / effects ----
  FM.replaceMediaWith = function (id, nrec) {
    const layer = FM.layerById(FM.scene, id);
    if (!layer || !nrec) return false;
    const old = FM.media.get(id);
    if (old && FM.clearFrameCache) FM.clearFrameCache(old);
    if (old && FM.clearClipStrip) FM.clearClipStrip(old);
    dropAudioGraph(old);   // the new rec brings a new element, so the old source node has nothing left to feed
    FM.media.set(id, nrec);
    layer.type = nrec.kind;                          // video ↔ image as needed
    if (nrec.kind === 'video' && nrec.el) { nrec.el.addEventListener('seeked', () => { if (FM._exporting || FM.playing) return; render(); }); FM.wireVideoRepaint(nrec); }
    // Re-clamp timing to the NEW source so a long clip doesn't freeze on the last frame (and audio
    // length doesn't diverge from the visible duration). Keeps transform/keyframes/effects/masks.
    if (nrec.kind === 'video' && nrec.duration) {
      layer.trimStart = Math.max(0, Math.min(layer.trimStart || 0, nrec.duration - 0.05));
      // FM.maxDurForSource, not raw division: an animated speed prop is an object (÷object = NaN)
      const avail = FM.maxDurForSource ? FM.maxDurForSource(layer, nrec.duration - layer.trimStart) : (nrec.duration - layer.trimStart) / (layer.speed || 1);
      layer.duration = Math.max(0.1, Math.min(layer.duration, avail));
    }
    return true;
  };
  FM.replaceMedia = function (id) {
    const layer = FM.layerById(FM.scene, id);
    if (!layer || layer.type === 'text' || layer.type === 'shape' || layer.type === 'null') return;
    const input = document.createElement('input');
    input.type = 'file'; input.accept = 'video/*,image/*'; input.style.display = 'none';
    input.addEventListener('change', async () => {
      const file = input.files && input.files[0]; input.remove();
      if (!file) return;
      const isVideo = /^video\//.test(file.type) || /\.(mp4|mov|webm|mkv|m4v)$/i.test(file.name);
      let nrec = null;
      try { nrec = isVideo ? await FM.loadVideoFile(file) : await FM.loadImageFile(file); } catch (e) { nrec = null; }
      if (!nrec) { if (FM.toast) FM.toast('Could not load that file'); return; }
      FM.replaceMediaWith(id, nrec);
      if (layer.reversed && FM.ensureReverseCache) { try { await FM.ensureReverseCache(layer); } catch (e) {} }
      /* The outgoing blob is NOT deleted any more, and the layer gets a serialisable marker.
       *
       * A replace only changes out-of-history state — the media registry and the IDB blob. On an
       * image→image swap (or a video whose duration clamp is a no-op) NOTHING in the layer's JSON
       * changed, so history.commit hit its "identical state" guard and added no undo step. The next
       * Ctrl+Z therefore landed on a previous, unrelated action while the media stayed replaced.
       * Verified in the report: after one Ctrl+Z an unrelated rectangle was deleted, the replaced
       * image stayed replaced, and further undos kept unwinding edits the user never meant to touch —
       * with the original footage already gone from both the registry and IndexedDB, unrecoverable.
       *
       * `mediaRev` puts the replace INSIDE the history snapshot, so the commit is a real step. Not
       * deleting the blob is the half that matters most: an undo step is no use if the file it would
       * come back to has been erased. Orphans are reaped by the boot sweep, which is the same rule
       * deleteLayer already follows for exactly this reason. */
      layer.mediaRev = (layer.mediaRev || 0) + 1;
      refreshAll(); FM.seekVideosToTime();
      if (FM.history) FM.history.commit();
      if (FM.storage && FM.storage.save) FM.storage.save();
      // The blob under this key is a DIFFERENT file now. Any library tile still anchored here would
      // show the old name and hand back the new footage — forget it (that also clears its cached
      // thumbnail), then register the replacement so it gets an honest tile of its own.
      if (FM.mediaLib) {
        FM.mediaLib.list().filter(e => e.key === id).forEach(e => FM.mediaLib.remove(e.mid));
        FM.mediaLib.add(nrec, id);
      }
    });
    document.body.appendChild(input);
    input.click();
  };

  // ===== Playhead-is-outside-the-clip actions (Alight Motion parity) =====
  // Trim-start / split / trim-end all need the playhead INSIDE the clip. Parked outside, they are three
  // dead buttons, so AM swaps them for the two that do make sense out there: slide the clip to the
  // playhead, or stretch its near edge out to meet it.
  //  -1 = playhead sits before the clip · 0 = inside it (the trim/split set applies) · 1 = after it
  FM.clipPlayheadSide = function (layer, t) {
    if (!layer) return 0;
    if (t == null) t = FM.time;
    if (t <= layer.start + 1e-4) return -1;
    if (t >= layer.start + layer.duration - 1e-4) return 1;
    return 0;
  };

  // MOVE: the clip slides until the edge NEAREST the playhead meets it — the same rule EXTEND below
  // already follows. Playhead parked BEFORE the clip, its start travels back to meet it; parked
  // AFTER, its END travels forward. (Ezra: "if you do it from the right side it just makes the clip
  // start from the playhead but it should just bring the end of the clip to the playhead.") Snapping
  // the start to the playhead from the right threw the clip forward by its own length.
  // Length, trim and speed are untouched — only when it plays changes. Keyframe times are absolute,
  // so they ride along or the animation detaches from the picture (the rule a clip drag follows too).
  FM.moveClipTo = function (layer, t) {
    if (!layer) return false;
    if (t == null) t = FM.time;
    const anchor = FM.clipPlayheadSide(layer, t) > 0 ? layer.start + layer.duration : layer.start;
    const d = t - anchor;
    if (Math.abs(d) < 1e-6) return false;
    layer.start = layer.start + d;
    if (FM.shiftLayerKeyframes) FM.shiftLayerKeyframes(layer, d);
    return true;
  };

  // EXTEND: the edge NEAREST the playhead stretches out to meet it; the far edge stays put. This is a
  // trim in reverse and obeys exactly the clamps the trim grips do — a video can only grow as far as it
  // has source (both directions), a ramped speed goes through the integral rather than a raw multiply
  // (an animated speed prop is an OBJECT, and ÷object is NaN), and a clip can never start before 0.
  // Keyframes deliberately do NOT ride along here: extending the head reveals earlier source while every
  // frame that was already on screen keeps the moment it played at.
  FM.extendClipTo = function (layer, t) {
    if (!layer) return false;
    if (t == null) t = FM.time;
    const side = FM.clipPlayheadSide(layer, t);
    if (!side) return false;                                   // inside the clip — extending is meaningless
    const m = layer.type === 'video' && FM.media.get ? FM.media.get(layer.id) : null;
    const srcDur = (m && m.duration) ? m.duration : Infinity;
    const ramped = FM.isAnimated(layer.speed), sp = ramped ? 1 : (layer.speed || 1);
    const s0 = layer.start, d0 = layer.duration, tr0 = layer.trimStart;
    if (side > 0) {                                            // stretch the TAIL out to the playhead
      let nd = Math.max(0.1, t - layer.start);
      if (layer.type === 'video' && isFinite(srcDur)) nd = Math.min(nd, FM.maxDurForSource(layer, srcDur - (layer.trimStart || 0), nd));
      layer.duration = nd;
    } else {                                                   // stretch the HEAD back to the playhead
      let delta = t - layer.start;                             // negative: the head travels left
      if (layer.start + delta < 0) delta = -layer.start;
      if (layer.duration - delta < 0.1) delta = layer.duration - 0.1;
      const spL = ramped ? FM.speedAt(layer, layer.start + delta) : sp;   // local source rate at the new head
      if (layer.type === 'video' && (layer.trimStart || 0) + delta * spL < 0) delta = -(layer.trimStart || 0) / spL;
      layer.start = layer.start + delta;
      layer.duration = layer.duration - delta;
      if (layer.type === 'video') layer.trimStart = (layer.trimStart || 0) + delta * spL;
    }
    // belt-and-braces: a non-finite number must NEVER reach the scene — it cascades into every layout
    if (!isFinite(layer.duration) || layer.duration < 0.1) layer.duration = d0;
    if (!isFinite(layer.start)) layer.start = s0;
    if (layer.trimStart != null && !isFinite(layer.trimStart)) layer.trimStart = tr0;
    return layer.start !== s0 || layer.duration !== d0;
  };

  // Split a clip into two at the current playhead time.
  FM.splitLayer = async function (id) {
    const layer = FM.layerById(FM.scene, id);
    if (!layer) return;
    if (['video', 'image', 'text', 'shape'].indexOf(layer.type) < 0) { if (FM.toast) FM.toast('Only video/image/text/shape clips can be split', 1600); return; }   // a camera/group/null/adjustment split would spawn a phantom duplicate
    const t = FM.time, end = layer.start + layer.duration;
    if (t <= layer.start + 0.02 || t >= end - 0.02) { if (FM.toast) FM.toast('Park the playhead inside the clip to split it', 1800); return; }   // a silent return here felt like a dead button
    const into = t - layer.start;
    const origTrim = layer.trimStart, origDur = layer.duration;
    // trimStart is SOURCE time — advance through the (possibly RAMPED) speed curve, not a flat multiply
    const advInto = FM.layerSourceAdvance ? FM.layerSourceAdvance(layer, into) : into * (layer.speed || 1);
    const advTotal = FM.layerSourceAdvance ? FM.layerSourceAdvance(layer, origDur) : origDur * (layer.speed || 1);
    const B = FM.cloneLayer(layer, true);                       // identical copy (new id)
    B.start = t;
    B.duration = end - t;
    if (layer.reversed) {
      // reversed plays source end→start: A keeps the END span, B keeps the START span
      B.trimStart = origTrim;
      layer.trimStart = origTrim + (advTotal - advInto);
    } else {
      B.trimStart = origTrim + advInto;                          // B resumes where A left off in the source (ramp-aware)
    }
    layer.duration = into;                                      // A = first half
    if (Array.isArray(layer.captions)) {
      // captions use LOCAL time (t − layer.start): re-base B's segments to its new start and trim A's to its new length
      const orig = layer.captions;
      B.captions = orig.map(c => ({ ...c, start: c.start - into, end: c.end - into })).filter(c => c.end > 0.01).map(c => ({ ...c, start: Math.max(0, c.start) }));
      layer.captions = orig.filter(c => c.start < into - 0.01).map(c => ({ ...c, end: Math.min(c.end, into) }));
    }
    // DIVIDE keyframes at the split (times are absolute): A keeps t ≤ split, B keeps t ≥ split, each
    // getting a boundary keyframe holding the interpolated value so the ENDPOINT value is seamless
    // (the interior easing of a split segment is a close approximation, not bit-exact). Without this
    // both halves owned the FULL set → stray diamonds drawn outside each clip's window.
    const splitAnimated = (lyr, keepLeft) => {
      FM.animatedProps(lyr).forEach(p => {
        // A looping prop (cycle/ping-pong) intentionally keeps its keyframes in a short span and
        // repeats them across the whole clip — dividing it kills the loop. Leave looping props whole.
        if (p.loopMode && p.loopMode !== 'none' && p.kf.length >= 2) return;
        // ARRAY-valued keyframes (an animated mask PATH — kf.v is a points array): evalProp's numeric
        // lerp on an array coerces to a garbage STRING ("100,100…NaN") which then autosaves and kills
        // the mask on both halves. Snap the boundary to a DEEP COPY of the kf at/just before the split
        // instead of interpolating.
        const arrKf = p.kf.some(k => Array.isArray(k.v));
        const before = arrKf ? [...p.kf].reverse().find(k => k.t <= t + 1e-9) : null;
        const v = arrKf
          ? JSON.parse(JSON.stringify((before || p.kf[0]).v))
          : FM.evalProp(p, t);
        const b = p.kf.find(k => k.t >= t - 1e-9);   // segment-END keyframe bracketing the split: its ease governs the segment we're cutting
        p.kf = p.kf.filter(k => keepLeft ? k.t <= t + 1e-4 : k.t >= t - 1e-4);
        if (!p.kf.some(k => Math.abs(k.t - t) < 1e-3)) {
          const nk = { t: t, v: v, e: (b && b.e) || 'linear' };   // inherit the cut segment's easing, not hardcoded linear
          if (b && b.bez) nk.bez = b.bez.slice();
          p.kf.push(nk);
        }
        p.kf.sort((k1, k2) => k1.t - k2.t);
      });
    };
    splitAnimated(layer, true); splitAnimated(B, false);
    if (layer.type !== 'text') await reloadMediaTo(id, B.id);
    const idx = FM.scene.layers.findIndex(l => l.id === id);
    if (idx < 0) return;   // A was deleted/undone during the await — never insert an orphaned half
    FM.scene.layers.splice(idx + 1, 0, B);
    FM.scene.selectedId = B.id;
    FM.scene.selectedIds = [B.id];
    FM.refreshAll();
    FM.seekVideosToTime();
    if (FM.history) FM.history.commit();
  };

  // Move a clip so it STARTS at the playhead (Ezra: park the playhead, jump the clip to it).
  // Same semantics as dragging the clip there: keyframes ride along (times are absolute project
  // time), a multi-selection keeps its relative offsets (the pressed clip lands ON the playhead),
  // and a group bar carries its members.
  FM.moveLayerToPlayhead = function (id) {
    const layer = FM.layerById(FM.scene, id);
    if (!layer) return;
    if (layer.locked) { if (FM.toast) FM.toast('Clip is locked', 1400); return; }
    const t = FM.time || 0;
    const selIds = FM.selectionIds ? FM.selectionIds() : [];
    const primaries = (selIds.length > 1 && selIds.indexOf(layer.id) >= 0)
      ? selIds.map(lid => FM.layerById(FM.scene, lid)).filter(Boolean)
      : [layer];
    const set = new Map();
    const addWithMembers = (l) => {
      if (set.has(l.id)) return;
      set.set(l.id, l);
      if (l.type === 'group' && FM.groupDescendants) FM.groupDescendants(l.id).forEach(addWithMembers);
    };
    primaries.forEach(addWithMembers);
    const delta = t - layer.start;
    if (Math.abs(delta) < 1e-6) { if (FM.toast) FM.toast('Clip already starts at the playhead', 1400); return; }
    set.forEach(l => {
      if (l.locked) return;
      const floor = -(l.duration - 0.1);   // same floor as dragging: a sliver must stay at/after 0
      const ns = Math.max(floor, l.start + delta);
      if (FM.shiftLayerKeyframes) FM.shiftLayerKeyframes(l, ns - l.start);
      l.start = ns;
    });
    if (FM.autoFitDuration) FM.autoFitDuration();
    FM.refreshAll();
    FM.seekVideosToTime();
    if (FM.history) FM.history.commit();
    if (FM.toast) FM.toast(set.size > 1 ? 'Moved ' + set.size + ' clips to the playhead' : 'Moved to playhead', 1300);
  };

  FM.layerMenuItems = function (layer) {
    // DECLARED FIRST, and it must stay that way. It used to be declared 36 lines further down beside
    // the grouping entries, and a const read before its declaration throws ReferenceError — which
    // killed the WHOLE menu: nothing on right-click, nothing from ⋯ with a layer selected. (Ezra:
    // "the three dots don't work when a layer selected.") The Duplicate labels that first exposed
    // that are gone as of v5.91, but the grouping entries below still read it, so the hazard is real.
    const selCount = FM.selectionIds ? FM.selectionIds().length : 0;
    /* v5.91. Ezra circled the first six entries and said "Remove the circled options in this menu":
       Duplicate, Duplicate in place, Copy, Paste Style…, Split at playhead, Move to playhead.
       Every one of them already has a door somewhere the hand actually is — ⧉ in the top bar carries
       Duplicate / Copy / Paste Style (js/app.js ~2486, and it is the surface AM uses for them), and
       Split sits beside the playhead in the transport row where it was moved deliberately in v5.x.
       This menu had become the place where a second copy of everything accumulated, which is the same
       complaint as queue 35 about the project ⋯ menu. The ACTIONS are untouched — FM.duplicateSelection,
       FM.copySelection, FM.openPasteStyle, FM.splitLayer and FM.moveLayerToPlayhead all still exist and
       are still called from their real homes and from the keyboard — only this duplicate listing goes.
       `selCount` is no longer read here; it stays declared because the grouping entries below use it,
       and the comment above it records why its POSITION is load-bearing. */
    const items = [];
    // cross-layer keyframe paste: the keyframe menu needs an existing diamond to long-press, so a
    // layer with NO keyframes had no touch path — this gives every platform the same entry
    if (FM.kfClipboard && FM.kfClipboard.length && FM.pasteKfAtPlayhead) items.push({ label: 'Paste keyframes at playhead', action: () => FM.pasteKfAtPlayhead() });
    if (layer.type === 'video' || layer.type === 'image') {
      items.push({ label: 'Replace media…', action: () => FM.replaceMedia(layer.id) });
    }
    items.push(...[
      { label: layer.locked ? 'Unlock' : 'Lock', action: () => { layer.locked = !layer.locked; FM.timeline.rebuild(); if (FM.history) FM.history.commit(); } },   // one rebuild — layersPanel.refresh() IS rebuild() (see FM.layersPanel)
      /* ONION SKIN LIVES HERE NOW (queue 122). Ezra: "shouldn't onion skin not be in the view options
       * and app settings? Idk why it would be there since it only effects one layer, it should just be
       * in the three dots when you have a layer selected."
       * He is right, and the code agrees with him: drawOnionSkin() begins `const sel =
       * FM.selectedLayer(...); if (!sel) return;` — it ghosts the SELECTED layer and does nothing at
       * all without one. So it was a per-layer tool sitting in two GLOBAL menus, one of which you can
       * open with nothing selected and toggle a switch that cannot do anything.
       * Moved rather than copied: both global entries are gone, so there is exactly one door. The
       * label carries the state because this menu has no switch furniture. */
      { label: (FM.onionSkin ? '✓ ' : '') + 'Onion skin', action: () => {
        const b = document.getElementById('btn-onion');
        if (b) b.click();   // the one implementation, so the toast and the button state stay in step
      } },
      { label: 'Reset transform', action: () => { const P = FM.scene.project, tr = layer.transform; tr.x = Math.round(P.width / 2); tr.y = Math.round(P.height / 2); tr.scale = 1; tr.rotation = 0; tr.opacity = 1; FM.requestRender(); if (FM.inspector) FM.inspector.refresh(); if (FM.canvasEdit) FM.canvasEdit.update(); if (FM.history) FM.history.commit(); } },
    ]);
    if (layer.type === 'video') {
      items.push({ label: layer.reversed ? 'Un-reverse' : 'Reverse', action: async () => {
        layer.reversed = !layer.reversed;
        if (layer.reversed) { if (FM.ensureReverseCache) await FM.ensureReverseCache(layer); } else if (FM.maybeClearCache) FM.maybeClearCache(layer);
        FM.timeline.rebuild(); FM.requestRender(); FM.seekVideosToTime();
        if (FM.reconcileAudio) FM.reconcileAudio();   // same reason as the Speed panel's checkbox — see there
        if (FM.history) FM.history.commit();
      } });
      if (FM.isAnimated(layer.speed) || Math.abs((layer.speed || 1) - 1) > 1e-3) {   // ramped speed is an object — offer reset for it too
        items.push({ label: 'Reset speed (1×)', action: () => {
          const span = FM.isAnimated(layer.speed) ? FM.layerSourceAdvance(layer, layer.duration) : layer.duration * (layer.speed || 1);
          layer.speed = 1; layer.duration = span;
          const end = layer.start + layer.duration;
          if (end > FM.scene.project.duration) FM.scene.project.duration = end;
          FM.timeline.rebuild(); FM.requestRender(); if (FM.history) FM.history.commit();
        } });
      }
    }
    // (Save audio as WAV / Remove vocals moved into the Volume section — discoverable there, and the
    //  ⋯ menu path was easy to miss on PC.)
    // grouping + reusable saves (selCount is declared at the top of this function)
    items.push({ sep: true });
    if (layer.type === 'group') {
      items.push({ label: 'Edit group', action: () => FM.enterGroup(layer.id) });
      items.push({ label: layer.maskGroup ? 'Masking: ON — make normal group' : 'Use as masking group', action: () => { layer.maskGroup = !layer.maskGroup; FM.requestRender(); if (FM.inspector) FM.inspector.refresh(); if (FM.history) FM.history.commit(); } });
      items.push({ label: 'Ungroup', action: () => FM.ungroup(layer.id) });
    }
    if (selCount >= 2) {
      items.push({ label: 'Group selection', action: () => FM.groupSelection() });
      items.push({ label: 'Masking group', action: () => FM.groupSelection({ mask: true }) });
    }
    items.push({ label: 'Save as preset…', action: () => FM.savePresetPrompt && FM.savePresetPrompt(layer) });
    items.push({ label: 'Save selection as element…', action: () => FM.saveElementPrompt && FM.saveElementPrompt() });
    // the layer extras (Flip/Fit/Clipping Mask/Outline/Extract Audio/Media Info/colour tag) used to
    // live ONLY in the desktop top-bar ⋯ — merged here so every surface shows one identical menu
    if (FM.layerMoreItems) { items.push({ sep: true }); FM.layerMoreItems(layer).forEach(it => items.push(it)); }
    items.push({ sep: true }, { label: 'Delete', danger: true, action: () => FM.deleteLayer(layer.id) });
    return items;
  };

  // Save the selected layer's LOOK + ANIMATIONS as a reusable preset (see inspector.js FM.layerPresets).
  FM.savePresetPrompt = function (layer) {
    layer = layer || FM.selectedLayer(FM.scene);
    if (!layer) { if (FM.toast) FM.toast('Select a layer first'); return; }
    const name = prompt('Preset name:', layer.name + ' look');
    if (!name || !name.trim()) return;
    FM.layerPresets.save(name.trim(), layer);
    if (FM.toast) FM.toast('Preset saved — apply it from any layer’s Presets section');
  };
  // Save the current selection as a reusable ELEMENT (insertable from Add → Object/Element).
  FM.saveElementPrompt = async function () {
    const ids = FM.selectionIds();
    const layers = FM.scene.layers.filter(l => ids.includes(l.id));
    if (!layers.length) { if (FM.toast) FM.toast('Select the layers to save first'); return; }
    const name = prompt('Element name:', layers.length === 1 ? layers[0].name : layers.length + ' layers');
    if (!name || !name.trim()) return;
    const ok = await FM.elements.save(name.trim(), layers);
    if (FM.toast) FM.toast(ok ? 'Element saved — find it under Add → Elements, or the Elements tab on Home' : 'Could not save element');
  };

  /* ---------- layers live in the timeline now (AM-style); this is a thin alias ---------- */
  FM.layersPanel = { refresh() { if (FM.timeline) FM.timeline.rebuild(); } };
  // (the old index-based FM.reorderLayer is gone — FM.moveLayers below is the one reorder entry
  // point: id-based, group-aware, no-op-guarded, used by the ≡ drag and the multi-select bar)

  // Alignment snap targets for one axis, shared by canvas dragging AND the Move & Transform scrubbers:
  // the composition centre + both edges, PLUS every value this layer already holds at its OTHER
  // keyframes — so you can re-align it to a position it was at earlier (AM behaviour). De-duped.
  FM.alignTargets = function (layer, axis) {
    const P = FM.scene.project;
    const out = axis === 'x' ? [P.width / 2, 0, P.width] : [P.height / 2, 0, P.height];
    const p = layer && layer.transform && layer.transform[axis];
    if (p && p.kf) p.kf.forEach(k => { if (out.indexOf(k.v) < 0) out.push(k.v); });
    return out;
  };
  // Snap a value to the nearest align target within `thr` (project px). Returns {v,hit,target}.
  FM.snapAxis = function (layer, axis, v, thr) {
    const targets = FM.alignTargets(layer, axis);
    let best = null, bd = (thr == null ? 8 : thr);
    for (let i = 0; i < targets.length; i++) { const d = Math.abs(v - targets[i]); if (d <= bd) { bd = d; best = targets[i]; } }
    return best == null ? { v: v, hit: false } : { v: best, hit: true, target: best };
  };

  // Move one OR several layers (by id) so they sit, as a contiguous block in their existing top-to-
  // bottom order, immediately BEFORE beforeId (or at the very bottom when beforeId is null). Used by
  // the timeline reorder drag — handles single- and multi-layer drags through one path.
  FM.moveLayers = function (ids, beforeId) {
    const arr = FM.scene.layers;
    const set = {}; ids.forEach(id => { set[id] = 1; });
    const moving = arr.filter(l => set[l.id]);          // preserves current order
    if (!moving.length) return;
    let rest = arr.filter(l => !set[l.id]);
    // if the drop target is itself a moving layer, slide down to the next layer that's staying put
    let at = rest.length;
    if (beforeId && !set[beforeId]) { const i = rest.findIndex(l => l.id === beforeId); if (i >= 0) at = i; }
    else if (beforeId && set[beforeId]) {
      const origIdx = arr.findIndex(l => l.id === beforeId);
      for (let j = origIdx; j < arr.length; j++) { if (!set[arr[j].id]) { const i = rest.findIndex(l => l.id === arr[j].id); if (i >= 0) { at = i; } break; } }
    }
    const result = rest.slice(0, at).concat(moving, rest.slice(at));
    if (result.length !== arr.length) return;           // safety: never drop/duplicate a layer
    if (result.every((l, i) => l === arr[i])) return;   // dropped back where it was → no-op, no undo entry
    arr.length = 0; Array.prototype.push.apply(arr, result);
    refreshAll();
    if (FM.history) FM.history.commit();
  };

  /* ---------- import ---------- */
  // What KIND of media is this? file.type is not trustworthy on a phone: picking a song out of the
  // iOS/Android Files app very often hands back an EMPTY type (.m4a, .flac, .opus and friends), and
  // the old three-way startsWith() chain then matched nothing and dropped the file on the floor with
  // no error — "import audio does nothing". Fall back to the extension, the same way the drop handler
  // (FM.loadDropped, ~line 1542) and the font importer already do.
  const RE_VIDEO = /\.(mp4|m4v|mov|webm|mkv|avi|3gp|ogv)$/i;
  const RE_AUDIO = /\.(mp3|m4a|aac|wav|flac|ogg|oga|opus|aif|aiff|caf|wma|amr|mp4a)$/i;
  const RE_IMAGE = /\.(png|jpe?g|gif|webp|bmp|heic|heif|avif|svg|tiff?)$/i;
  function mediaKind(file) {
    const t = (file.type || '').toLowerCase(), n = file.name || '';
    if (t.startsWith('video')) return 'video';
    if (t.startsWith('image')) return 'image';
    if (t.startsWith('audio')) return 'audio';
    if (RE_VIDEO.test(n)) return 'video';
    if (RE_AUDIO.test(n)) return 'audio';
    if (RE_IMAGE.test(n)) return 'image';
    return '';
  }
  FM.mediaKind = mediaKind;

  async function handleFiles(files) {
    for (const file of files) {
      try {
        const kind = mediaKind(file);
        if (kind === 'video') FM.addMediaLayer(await FM.loadVideoFile(file));
        else if (kind === 'image') FM.addMediaLayer(await FM.loadImageFile(file));
        // Audio rides the pictureless-video path: a <video> element plays mp3/m4a/wav fine, and a
        // 0×0-picture clip already gets the waveform lane, live mix, keyframed volume and export mix.
        else if (kind === 'audio') FM.addMediaLayer(await FM.loadVideoFile(file));
        // Never fail silently: an unusable file used to vanish without a word, which reads as the
        // importer being broken rather than the file being unsupported.
        else alert('Can’t use “' + file.name + '” — FreeMotion takes video, images and audio.');
      } catch (e) { console.error(e); alert(e.message || 'Could not load ' + file.name); }
    }
  }

  /* ---------- export ---------- */
  // The export settings are yours, not the project's (Ezra: "make it so whatever quality settings you
  // last used are remembered for when you make a new project"). They lived only in the DOM, so they
  // survived reopening the dialog and nothing else — a new project, a reload or a second device put
  // you back on the defaults and you re-picked 4K and 60fps every time.
  //
  // RESOLUTION is stored as the target SHORT SIDE, not as the scale factor the exporter uses: the
  // scale only means anything relative to one project's size, so 0.5 remembered from a 4K project
  // would silently mean 540p in a 1080p one. The short side survives the change of comp.
  const EXP_PREFS = 'fm.exportPrefs';
  function expPrefsRead() { try { return JSON.parse(localStorage.getItem(EXP_PREFS)) || {}; } catch (e) { return {}; } }
  function expPrefsSave() {
    const g = id => document.getElementById(id);
    const res = g('exp-res'), opt = res && res.options[res.selectedIndex];
    // "1080p — 608×1080" → 1080; "Full — 1080×1920" → 0, meaning native
    const short = opt ? (parseInt(String(opt.textContent).trim(), 10) || 0) : 0;
    try {
      localStorage.setItem(EXP_PREFS, JSON.stringify({
        format: (g('exp-format') || {}).value || 'mp4',
        short: short,
        fps: (g('exp-fps') || {}).value || '30',
        quality: (g('exp-quality') || {}).value || '',
      }));
    } catch (e) {}
  }
  function expPrefsApply() {
    const p = expPrefsRead(), g = id => document.getElementById(id);
    const set = (id, v) => { const el = g(id); if (el && v != null && v !== '' && [].some.call(el.options, o => o.value === String(v))) el.value = String(v); };
    set('exp-format', p.format); set('exp-fps', p.fps); set('exp-quality', p.quality);
    const res = g('exp-res');
    if (res && p.short) {   // match by short side; a project that can't reach it falls back to Full
      const hit = [].find.call(res.options, o => parseInt(String(o.textContent).trim(), 10) === p.short);
      if (hit) res.value = hit.value;
    }
  }
  function showExportDialog() {
    // Build resolution presets from THIS project's size. "p" = the shorter side (1080p portrait =
    // 1080 wide); value stays a SCALE factor so the exporter math is unchanged. Full first, then
    // each standard rung below the native short side (downscale only — no blurry upscales), each
    // labelled with its exact output pixels.
    const P = FM.scene.project, W = P.width, H = P.height, shortSide = Math.min(W, H);
    const sel = document.getElementById('exp-res');
    if (sel) {
      const prev = sel.value;
      sel.innerHTML = '';
      const add = (val, label) => { const o = document.createElement('option'); o.value = val; o.textContent = label; sel.appendChild(o); };
      add(1, 'Full — ' + W + '×' + H);
      [2160, 1440, 1080, 720, 480, 360].forEach(t => {
        if (t < shortSide - 1) { const s = t / shortSide; add(s, t + 'p — ' + Math.round(W * s) + '×' + Math.round(H * s)); }
      });
      // keep the previous choice if it still exists, else default to Full
      if (prev && [].some.call(sel.options, o => o.value === prev)) sel.value = prev;
    }
    // 'Selected clip only' and the solo checkbox need a selection — grey them out otherwise
    const selLayer = FM.selectedLayer ? FM.selectedLayer(FM.scene) : null;
    const rangeSel = document.getElementById('exp-range');
    if (rangeSel) {
      const clipOpt = [].find.call(rangeSel.options, o => o.value === 'clip');
      if (clipOpt) clipOpt.disabled = !selLayer;
      if (!selLayer && rangeSel.value === 'clip') rangeSel.value = 'whole';
    }
    const soloCb = document.getElementById('exp-solo-clip');
    if (soloCb) { if (!selLayer) soloCb.checked = false; soloCb.disabled = !selLayer; }
    expPrefsApply();   // after the resolution list is rebuilt for THIS project, so the match can land
    syncExportFormat();
    document.getElementById('export-dialog').classList.remove('hidden');
  }
  function hideExportDialog() { document.getElementById('export-dialog').classList.add('hidden'); }

  // Format picker → button label + transparent toggle + GIF note. MP4 can't carry alpha, so the
  // transparent checkbox is only available (and only shown) for GIF / PNG frames.
  function syncExportFormat() {
    const fmt = (document.getElementById('exp-format') || {}).value || 'mp4';
    const alphaOk = fmt === 'gif' || fmt === 'frames';
    const tField = document.getElementById('exp-transparent-field');
    const tCb = document.getElementById('exp-transparent');
    if (tField) tField.classList.toggle('hidden', !alphaOk);
    if (tCb) { tCb.disabled = !alphaOk; if (!alphaOk) tCb.checked = false; }
    const note = document.getElementById('exp-gif-note');
    if (note) note.classList.toggle('hidden', fmt !== 'gif');
    // Quality maps to H.264 bitrate — meaningless for a palette GIF and actively misleading for
    // lossless PNG frames (it implied the frames were compressed). MP4-only.
    const qEl = document.getElementById('exp-quality');
    const qField = qEl && (qEl.closest('.field') || qEl.parentElement);
    if (qField) qField.classList.toggle('hidden', fmt !== 'mp4');
    const go = document.getElementById('exp-go');
    if (go) go.textContent = fmt === 'gif' ? 'Export GIF' : (fmt === 'frames' ? 'Export frames' : 'Export MP4');
  }

  async function runExport() {
    expPrefsSave();   // whatever you just chose becomes the default everywhere, including a new project
    hideExportDialog();
    if (!FM.scene.layers.length) { alert('Add some media first.'); return; }
    /* "This frame (PNG)" is an export of one frame, so it lives on the format list — but it shares
       nothing else with the encoders: no range, no fps, no bitrate, no progress overlay to show for
       an operation that finishes instantly. Handled and returned right here, before any of that is
       computed, rather than threaded through the encoder branch as a special case that has to be
       skipped at five later points. (Ezra: "The button to save a frame as a PNG should just be inside
       of the export menu when you press the export button.") */
    if (((document.getElementById('exp-format') || {}).value) === 'frame') {
      if (FM.snapshotPNG) FM.snapshotPNG();
      else if (FM.toast) FM.toast('Frame capture unavailable');
      return;
    }
    const scale = parseFloat(document.getElementById('exp-res').value) || 1;
    const fps = parseInt(document.getElementById('exp-fps').value, 10) || 30;
    const qEl = document.getElementById('exp-quality');
    const qf = (qEl && parseFloat(qEl.value)) || 0.1;
    const P = FM.scene.project;
    const bitrate = Math.min(80e6, Math.round(P.width * scale * P.height * scale * fps * qf));
    // Resolve the range BEFORE showing the overlay so early exits can bounce back to the dialog.
    const rangeEl = document.getElementById('exp-range');
    const selLayer = FM.selectedLayer ? FM.selectedLayer(FM.scene) : null;
    let from = null, to = null;
    if (rangeEl && rangeEl.value === 'clip') {
      if (!selLayer) { if (FM.toast) FM.toast('Select a clip first, then export', 2200); showExportDialog(); return; }
      from = Math.max(0, selLayer.start);
      to = Math.min(P.duration, selLayer.start + selLayer.duration);
      if (!(to > from)) { if (FM.toast) FM.toast('That clip sits outside the project — nothing to export', 2200); showExportDialog(); return; }
    } else if (rangeEl && rangeEl.value === 'loop') {
      if (FM.hasLoopRegion && FM.hasLoopRegion()) { from = P.loopIn; to = P.loopOut; }
      else if (FM.toast) FM.toast('No region marked — press [ and ] or use the ⋯ menu to mark one; exporting whole project', 2600);
    }
    const overlay = document.getElementById('export-overlay');
    const bar = document.getElementById('export-bar');
    const status = document.getElementById('export-status');
    overlay.classList.remove('hidden');
    if (FM.playing) FM.pause();
    // 'Hide other layers' — temporarily solo the selected clip (solo already isolates picture AND
    // audio at render/export/preview). Restored in finally even on error/cancel; no history commit.
    const soloCb = document.getElementById('exp-solo-clip');
    let soloRestore = null;
    if (soloCb && soloCb.checked && selLayer) {
      soloRestore = FM.scene.layers.map(l => [l, l.solo]);
      selLayer.solo = true;
      if (selLayer.type === 'group' && FM.groupDescendants) FM.groupDescendants(selLayer.id).forEach(l => { l.solo = true; });
    }
    const fmt = (document.getElementById('exp-format') || {}).value || 'mp4';
    const tCb = document.getElementById('exp-transparent');
    const transparent = !!(tCb && tCb.checked && (fmt === 'gif' || fmt === 'frames'));
    try {
      const expName = (FM.scene.project.name || 'freemotion-export').replace(/[^\w\- ]+/g, ' ').replace(/\s+/g, ' ').trim() || 'freemotion-export';
      const onProgress = (p, what) => {
        bar.style.width = Math.round(p * 100) + '%';
        status.textContent = 'Encoding ' + what + '… ' + Math.round(p * 100) + '%';
      };
      if (fmt === 'gif') {
        await FM.exporter.runGif({ scale, fps, from, to, name: expName, transparent, dither: true, onProgress });
      } else if (fmt === 'frames') {
        await FM.exporter.runFrames({ scale, fps, from, to, name: expName, transparent, format: 'png', onProgress });
      } else {
        await FM.exporter.run({ scale, fps, bitrate, name: expName, from, to, onProgress });
      }
      status.textContent = 'Done — saved to your Downloads.';
      setTimeout(() => overlay.classList.add('hidden'), 900);
    } catch (e) {
      overlay.classList.add('hidden');
      if (e.message === 'NO_WEBCODECS') alert('Export needs the WebCodecs video encoder. Please open FreeMotion in Google Chrome.');
      else if (e.message === 'CANCELLED') { /* silent */ }
      else if (e.message === 'FRAMES_TOO_BIG') alert('That PNG sequence is too large to build in memory. Shorten the range, lower the frame rate, or drop the resolution and try again.');
      else if (e.message === 'NO_ZIP_WRITER') alert('The frame-sequence exporter failed to load. Please hard-refresh and try again.');
      else { console.error(e); alert('Export failed: ' + e.message); }
    } finally {
      if (soloRestore) { soloRestore.forEach(([l, v]) => { l.solo = v; }); FM.requestRender(); }
      bar.style.width = '0%';
      FM.seekVideosToTime();
    }
  }

  /* ---------- init ---------- */
  // Desktop timeline resizer: drag the top edge of #timeline-panel to trade height between the stage
  // and the timeline. Writes --tl-h on <html> (inline wins over the responsive stylesheet default),
  // clamped so neither the stage nor the timeline can collapse, and persisted across sessions.
  function setupTimelineResizer() {
    const rez = document.getElementById('tl-resizer');
    if (!rez) return;
    const root = document.documentElement;
    const isPhone = () => window.matchMedia('(max-width: 700px)').matches;
    /* The ceiling used to be a flat 72% of the viewport height, which is reasonable on a desktop and
     * ruinous on a phone held sideways. 844x390 is over 700px wide so it takes the Studio layout, and
     * a height you once dragged on a big screen is REMEMBERED — measured, a stored 270px band left a
     * 390px-tall viewport a 120px stage, worse than the default it replaced. So on a short viewport
     * the ceiling becomes the same responsive band the stylesheet falls back to (46vh). At 504px tall
     * and above this is exactly the old ceiling, so every desktop and tablet — and any height dragged
     * on one — is untouched; it only bites where 72% of the screen was never a sane timeline.
     * The window `resize` handler below re-clamps, so this also fixes the case that actually happens:
     * turning the phone sideways with a height stored from somewhere roomier. */
    const clampH = (h) => {
      const vh = window.innerHeight;
      const ceil = vh >= 504 ? Math.round(vh * 0.72) : Math.max(150, Math.round(vh * 0.46));
      return Math.max(150, Math.min(ceil, h));
    };
    FM.clampTimelineH = clampH;   // exposed so the suite tests the clamp that actually runs, not a copy of it
    let saved = 0;
    try { saved = parseInt(localStorage.getItem('fm_tl_h') || '', 10) || 0; } catch (_) {}
    if (saved && !isPhone()) root.style.setProperty('--tl-h', clampH(saved) + 'px');
    let dragging = false, startY = 0, startH = 0;
    rez.addEventListener('pointerdown', (e) => {
      if (isPhone()) return;
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      dragging = true; startY = e.clientY;
      const panel = document.getElementById('timeline-panel');
      startH = panel ? panel.getBoundingClientRect().height : 232;
      document.body.classList.add('tl-resizing');
      try { rez.setPointerCapture(e.pointerId); } catch (_) {}
      e.preventDefault();
    });
    rez.addEventListener('pointermove', (e) => {
      if (!dragging) return;
      const h = clampH(startH + (startY - e.clientY));   // drag UP → taller timeline
      root.style.setProperty('--tl-h', h + 'px');         // pure CSS-grid resize — no timeline reflow needed (height doesn't touch clip-x / pps math)
    });
    const end = () => {
      if (!dragging) return;
      dragging = false; document.body.classList.remove('tl-resizing');
      const cur = getComputedStyle(root).getPropertyValue('--tl-h').trim();
      try { if (cur) localStorage.setItem('fm_tl_h', parseInt(cur, 10) || 232); } catch (_) {}
    };
    rez.addEventListener('pointerup', end);
    rez.addEventListener('pointercancel', end);
    // window shrank below a stored height → re-clamp so the timeline can't exceed the viewport
    window.addEventListener('resize', () => {
      if (isPhone()) return;
      const cur = parseInt(getComputedStyle(root).getPropertyValue('--tl-h'), 10);
      if (cur) { const c = clampH(cur); if (c !== cur) root.style.setProperty('--tl-h', c + 'px'); }
    });
  }

  function init() {
    if (FM.settings) FM.settings.init();   // preferences first — layer durations and demo mode read them straight away
    canvas = document.getElementById('preview');
    ctx = canvas.getContext('2d');
    readoutEl = document.getElementById('time-readout');
    dropHint = document.getElementById('drop-hint');
    setupTimelineResizer();
    // Tap the timecode → drop / remove a benchmark at the playhead. Double-tap → type an exact time.
    // (A short timer distinguishes the two so a double-tap doesn't also leave a stray benchmark.)
    readoutEl.style.cursor = 'pointer';
    readoutEl.title = 'Tap: benchmark · double-click: type a time · hold: set this frame as the project thumbnail';
    let tcTapTimer = null;
    // HOLD the timecode → pin the current frame as the project thumbnail (suppresses the trailing tap so
    // it doesn't also drop a benchmark).
    let tcLp = null, tcLpFired = false, tcDown = null;
    readoutEl.addEventListener('pointerdown', (e) => {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      tcDown = { x: e.clientX, y: e.clientY }; tcLpFired = false;
      clearTimeout(tcLp);
      tcLp = setTimeout(() => { tcLp = null; tcLpFired = true; if (tcTapTimer) { clearTimeout(tcTapTimer); tcTapTimer = null; } if (FM.setThumbnailFrame) FM.setThumbnailFrame(); }, 550);
    });
    readoutEl.addEventListener('pointermove', (e) => { if (tcDown && Math.hypot(e.clientX - tcDown.x, e.clientY - tcDown.y) > 8) { clearTimeout(tcLp); tcLp = null; } });
    const tcLpEnd = () => { clearTimeout(tcLp); tcLp = null; tcDown = null; };
    readoutEl.addEventListener('pointerup', tcLpEnd);
    readoutEl.addEventListener('pointercancel', tcLpEnd);
    readoutEl.addEventListener('click', () => {
      if (tcLpFired) { tcLpFired = false; return; }   // the hold already handled this press
      if (tcTapTimer) return;                       // second click of a double-tap → ignore here
      tcTapTimer = setTimeout(() => { tcTapTimer = null; FM.toggleMarkerAtPlayhead(); }, 240);
    });
    // double-click the time readout to type an exact playhead time
    readoutEl.addEventListener('dblclick', () => {
      if (tcTapTimer) { clearTimeout(tcTapTimer); tcTapTimer = null; }   // cancel the pending benchmark tap
      const input = document.createElement('input');
      input.className = 'time-edit'; input.type = 'text'; input.value = FM.time.toFixed(2);
      readoutEl.style.display = 'none'; readoutEl.parentNode.insertBefore(input, readoutEl);
      const done = () => { if (!input.parentNode) return; const v = parseFloat(input.value); if (!isNaN(v)) { FM.pause(); FM.setTime(Math.max(0, Math.min(FM.scene.project.duration, v))); } input.remove(); readoutEl.style.display = ''; updateReadout(); };
      input.addEventListener('keydown', (ev) => { ev.stopPropagation(); if (ev.key === 'Enter') done(); else if (ev.key === 'Escape') { input.remove(); readoutEl.style.display = ''; } });
      input.addEventListener('blur', done);
      input.focus(); input.select();
    });

    resizeCanvas();
    FM.timeline.init();
    FM.inspector.init();
    FM.canvasEdit.init();
    if (FM.drawTools) FM.drawTools.init();   // freehand / vector drawing overlay + toolbar
    refreshAll();
    if (FM.history) FM.history.reset();
    if (FM.storage) FM.storage.load().then(restored => {
      if (restored && FM.history) FM.history.reset();
      if (FM.home) {
        FM.home.init();
        // Land on the home screen ONLY if that's where the user last was. A refresh (or the
        // version-label force-update, which reloads on a fresh URL) drops them straight back into
        // the project they were editing — home.js writes 'fm.view' on every open/close. The
        // restored-project guard keeps a deleted/first-boot project from opening an empty editor.
        let lastView = null; try { lastView = localStorage.getItem('fm.view'); } catch (e) {}
        if (!(restored && lastView === 'editor')) FM.home.open();
      }
      // Seed the Media library from media already sitting in existing projects, THEN sweep — the
      // sweep's keep-set reads the library, so seeding first is what stops it eating those blobs.
      if (FM.mediaLib) FM.mediaLib.backfill();
      if (FM.projects) FM.projects.pruneOrphans();   // boot sweep of orphaned media blobs
    }).catch(err => {
      // ONE unopenable document must never cost the user every OTHER project. FM.home.init() lives
      // inside the .then() above, so anything load() throws used to skip it entirely: the editor sat
      // over a document it could not draw, with no way back to the project browser — measured on both
      // v5.05 and v5.72 with a parent-cycled project (home.open() ran but the screen never appeared,
      // because init() had never built it). Whatever the cause, land on Home and say so.
      try { console.error('FreeMotion: project load failed', err); } catch (e) {}
      if (FM.home) { try { FM.home.init(); FM.home.open(); } catch (e) {} }
      // …and only SAY they are back at their projects if they actually are. init()/open() can throw
      // in their own right (a load that dies before FM.scene is usable takes home.init() with it),
      // and a toast that claims the screen is there when it is not sends someone hunting for a way
      // back that does not exist. Ask the DOM rather than trusting the two calls above.
      if (FM.toast) setTimeout(() => {
        const hs = document.getElementById('home-screen');
        const up = !!hs && !hs.classList.contains('hidden') && getComputedStyle(hs).display !== 'none';
        FM.toast(up ? 'That project could not be opened — you are back at your projects'
                    : 'That project could not be opened. Reload the app to get back to your projects.', 6000);
      }, 600);
      if (FM.mediaLib) { try { FM.mediaLib.backfill(); } catch (e) {} }
    });
    // ‹ crumb pill exits the Edit Group view
    const gcBack = document.getElementById('group-crumb');
    if (gcBack) gcBack.addEventListener('click', () => { if (FM.exitGroup) FM.exitGroup(); });
    // desktop: clicking the brand goes Home (mobile uses the ‹ back arrow)
    const brandEl = document.querySelector('#topbar .brand');
    if (brandEl) brandEl.addEventListener('click', (e) => { if (e.target.classList.contains('ver')) return; if (FM.home) FM.home.open(); });
    // The desktop back button (v6.13). Same ladder as the phone's #m-back, in the same order: a live
    // selection and an open group are things you are INSIDE, and back should leave the innermost one
    // first. Without this, pressing Back with a clip selected would jump you all the way out of the
    // project — which is the bug v5.71 fixed on the phone, and this button would have re-introduced.
    const backBtn = document.getElementById('btn-back');
    if (backBtn) backBtn.addEventListener('click', () => {
      if (FM.groupContext && FM.exitGroup) { FM.exitGroup(); return; }
      if (FM.home) FM.home.open();
    });

    // top bar
    const fileInput = document.getElementById('file-input');
    document.getElementById('btn-import').addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', () => { handleFiles(Array.from(fileInput.files)); fileInput.value = ''; });
    const txtBtn = document.getElementById('btn-add-text');   // removed from the toolbar (dup of the Add menu) — guard it
    if (txtBtn) txtBtn.addEventListener('click', () => FM.addTextLayer());
    const addBtn = document.getElementById('btn-add-layer');
    if (addBtn) addBtn.addEventListener('click', () => {
      const r = addBtn.getBoundingClientRect();
      const items = [
        { label: 'Rectangle', action: () => FM.addShapeLayer && FM.addShapeLayer('rect') },
        { label: 'Ellipse', action: () => FM.addShapeLayer && FM.addShapeLayer('ellipse') },
        { label: 'Camera', action: () => FM.addCameraLayer && FM.addCameraLayer() },
        { label: 'Adjustment layer', action: () => FM.addAdjustmentLayer && FM.addAdjustmentLayer() },
        { label: 'Null (rig control)', action: () => FM.addNullLayer && FM.addNullLayer() },
      ];
      if (FM.contextMenu) FM.contextMenu.show(r.left, r.bottom + 4, items);
    });
    const capBtn = document.getElementById('btn-captions');
    if (capBtn) capBtn.addEventListener('click', () => FM.addCaptionLayer());
    const sampleBtn = document.getElementById('btn-sample');
    if (sampleBtn) sampleBtn.addEventListener('click', async () => {
      sampleBtn.disabled = true; sampleBtn.textContent = 'Recording…';
      try { await FM.addSampleClip(); } catch (e) { console.error(e); alert('Sample clip failed: ' + e.message); }
      sampleBtn.disabled = false; sampleBtn.textContent = 'Sample clip';
    });
    document.getElementById('btn-export').addEventListener('click', showExportDialog);
    // Home's project ⋯ opens this same dialog, so it can't stay private to this module.
    FM.showExportDialog = showExportDialog;
    const helpBtn = document.getElementById('btn-help');
    if (helpBtn) helpBtn.addEventListener('click', () => { if (FM.shortcuts) FM.shortcuts.toggle(); });
    const fitBtn = document.getElementById('btn-fit');
    if (fitBtn) fitBtn.addEventListener('click', () => FM.fitToContent());
    const onionBtn = document.getElementById('btn-onion');
    /* SAY WHAT HAPPENED (queue 111). Ezra: "when you press the snapping and onion skin buttons it
     * actually tells you on screen what happened." He picked exactly the right two toggles: guides and
     * loop show their result the instant you press them, but onion skin changes NOTHING unless there
     * is a neighbouring frame to ghost, and snapping changes nothing until you next drag something —
     * so on a still frame both look like a dead button. The message says the resulting STATE rather
     * than the action ("Onion skin on", not "Toggled onion skin"), because the question being asked is
     * "is it on now?".
     * It lives on the OWNER of the toggle, not on the view-rail button, so every route to it — the
     * rail, the settings panel, the keyboard — reports identically. Same one-writer rule the rail
     * itself follows. */
    if (onionBtn) onionBtn.addEventListener('click', () => {
      FM.onionSkin = !FM.onionSkin; onionBtn.classList.toggle('active', FM.onionSkin); render();
      if (FM.toast) FM.toast(FM.onionSkin ? 'Onion skin on — ghosting the frames either side' : 'Onion skin off', 1500);
    });
    const snapBtn = document.getElementById('btn-snapshot');
    if (snapBtn) snapBtn.addEventListener('click', () => FM.snapshotPNG());
    const saveProjBtn = document.getElementById('btn-save-proj');
    if (saveProjBtn) saveProjBtn.addEventListener('click', () => { if (FM.storage && FM.storage.exportFile) FM.storage.exportFile(); });
    const openProjBtn = document.getElementById('btn-open-proj');
    if (openProjBtn) openProjBtn.addEventListener('click', () => { if (FM.storage && FM.storage.importFile) FM.storage.importFile(); });
    const parentBtn = document.getElementById('btn-parent');
    if (parentBtn) parentBtn.addEventListener('click', () => {
      const sel = FM.selectedLayer ? FM.selectedLayer(FM.scene) : null; if (!sel) return;
      const r = parentBtn.getBoundingClientRect();
      FM.openParentPicker(sel, Math.max(8, r.right - 220), r.bottom + 4);
    });
    // Mark / clear the export-loop region at the playhead — shared by the [ ] \ keys, the ⛶ view
    // bar's vb-markin/out/clear, and the phone's ⋯ (no bracket keys there, and the phone view bar's
    // lower half sits under the timeline, so the menu is its only touch path).
    const markRegionIn = () => { const P = FM.scene.project; P.loopIn = FM.time; if (P.loopOut != null && P.loopOut <= P.loopIn) P.loopOut = null; FM.timeline.rebuild(); if (FM.history) FM.history.commit(); };
    const markRegionOut = () => { const P = FM.scene.project; P.loopOut = FM.time; if (P.loopIn != null && P.loopIn >= P.loopOut) P.loopIn = null; FM.timeline.rebuild(); if (FM.history) FM.history.commit(); };
    const clearRegion = () => { FM.scene.project.loopIn = null; FM.scene.project.loopOut = null; FM.timeline.rebuild(); };
    // ---- SHARED menu builders (Ezra: mobile and PC must show the SAME menus in the same places).
    // One source of truth: the layer extras feed FM.layerMenuItems, so right-clicking a clip, right-
    // clicking its row head and the phone's ≡ are all identical lists. (The project menu below now
    // has a single caller — the phone's ⋯ — because the PC top bar's ⋯ is gone.)
    FM.layerMoreItems = function (sel) {
      const items = [];
      items.push({ label: (sel.flipH ? '✓ ' : '') + 'Flip Horizontally', action: () => FM.flipLayer(sel, 'h') });
      items.push({ label: (sel.flipV ? '✓ ' : '') + 'Flip Vertically', action: () => FM.flipLayer(sel, 'v') });
      if (sel.type !== 'group' && sel.type !== 'null') {
        items.push({ label: 'Fit Composition Area', action: () => FM.fitLayer(sel, 'fit') });
        items.push({ label: 'Fill Composition Area', action: () => FM.fitLayer(sel, 'fill') });
        items.push({ label: 'Stretch to Composition Area', action: () => FM.fitLayer(sel, 'stretch') });
      }
      items.push({ label: (sel.blendMode === 'mask-include' ? '✓ ' : '') + 'Create Clipping Mask', action: () => FM.toggleClippingMask(sel) });
      if (sel.type === 'shape' && sel.shape !== 'path') items.push({ label: 'Convert to Outline', action: () => FM.convertToOutline(sel) });
      if (sel.type === 'video') items.push({ label: 'Extract Audio', action: () => FM.extractAudio(sel) });
      items.push({ label: 'Media Info', action: () => FM.mediaInfoToast(sel) });
      items.push({ swatchLabel: 'Layer colour tag', swatches: ['#ff2d1e', '#e0245e', '#ff8b3d', '#ffd93d', '#2bd9c7', '#3d7bff', '#9b5cff'], onPick: (hex) => FM.setLayerLabel(sel, hex) });
      return items;
    };
    // FM.projectMoreItems lived here — the list behind the phone's project ⋯. Both the button and
    // this function are gone as of v6.13, which finishes queue 35: the PC top bar's ⋯ went first, and
    // the phone's followed once the canvas dialog gained an "App settings…" button, because that was
    // the thing standing in the way — FM.settings was reachable from the home screen only, so on a
    // phone the menu really had been the single door to snapping, onion skin, guides, trim and
    // save/reset. index.html records where every entry went.

    // The desktop cog (v6.13). It used to open FM.settings — the APP preferences panel — while the
    // phone's identical gear (#m-settings) opened Canvas settings. Ezra, twice: "settings cog on pc in
    // projects STILL opens up wrong settings menu." It wasn't that the panel was empty of project rows
    // (v5.x had already put Canvas / Loop / Onion / Snapping at the top of it); it was that the SAME
    // icon in the SAME place meant two different things depending on which device he was holding.
    // So the two agree now: inside a project, the cog is Canvas settings on every platform, and the
    // app-wide preferences are one clearly-labelled button away inside it (#cv-appset above).
    // On the HOME screen the cog is still FM.settings — there is no canvas there to configure.
    const setBtn = document.getElementById('btn-settings');
    if (setBtn) setBtn.addEventListener('click', () => {
      const inProject = !(FM.home && FM.home.isOpen && FM.home.isOpen());
      const cv = document.getElementById('btn-canvas');
      if (inProject && cv) { cv.click(); return; }
      if (FM.settings && FM.settings.open) FM.settings.open();
      else if (FM.toast) FM.toast('Settings unavailable');
    });
    const appSetBtn = document.getElementById('cv-appset');
    if (appSetBtn) appSetBtn.addEventListener('click', () => {
      const dlg = document.getElementById('canvas-dialog');
      if (dlg) dlg.classList.add('hidden');   // leave this dialog first, or the panel opens behind it
      if (FM.settings && FM.settings.open) FM.settings.open();
    });
    // The PC top bar's ⋯ (#btn-more) used to live here, opening FM.projectMoreItems with nothing
    // selected and FM.layerMenuItems with a clip selected. Both halves were duplicates by the end:
    // the layer half is exactly what right-clicking the clip or its row head already shows, and the
    // project half's last three homeless entries (Trim to last clip / Save a project file / Reset
    // project) are now rows in the settings cog next to Canvas. Removed rather than moved — queue 35
    // is about there being ONE door, so a relocated second copy would have missed the point.
    const prateEl = document.getElementById('preview-rate');
    if (prateEl) prateEl.addEventListener('change', () => FM.setPreviewRate(parseFloat(prateEl.value) || 1));
    const guidesBtn = document.getElementById('btn-guides');
    if (guidesBtn) guidesBtn.addEventListener('click', () => { FM.showGuides = !FM.showGuides; guidesBtn.classList.toggle('active', FM.showGuides); render(); });
    // Group / Masking Group on PC (queue 53) — the same two-item menu mobile.js hangs off #m-group,
    // so grouping means one thing on both. Deliberately NOT a third implementation: both entries call
    // FM.groupSelection, which is also what the ⧉ menu and the timeline right-click already call.
    const groupBtn = document.getElementById('btn-group');
    if (groupBtn) groupBtn.addEventListener('click', () => {
      const r = groupBtn.getBoundingClientRect();
      if (FM.contextMenu) FM.contextMenu.show(Math.max(8, r.right - 230), r.bottom + 6, [
        { label: 'Group', action: () => FM.groupSelection() },
        { label: 'Masking Group — top layer clips the rest', action: () => FM.groupSelection({ mask: true }) },
      ]); else if (FM.groupSelection) FM.groupSelection();
    });
    const undoBtn = document.getElementById('btn-undo'), redoBtn = document.getElementById('btn-redo');
    if (undoBtn) undoBtn.addEventListener('click', () => { if (FM.history) FM.history.undo(); });
    if (redoBtn) redoBtn.addEventListener('click', () => { if (FM.history) FM.history.redo(); });
    // ⧉ Layer-actions menu (AM): Select All / Duplicate / Copy / Save Preset / Paste / Paste Style.
    const layerMenuBtn = document.getElementById('btn-layermenu');
    if (layerMenuBtn) layerMenuBtn.addEventListener('click', () => {
      if (!FM.contextMenu) return;
      const r = layerMenuBtn.getBoundingClientRect();
      const hasSel = !!FM.scene.selectedId;
      const hasClip = !!(FM.clipboard && FM.clipboard.length);
      const hasStyle = !!(FM.clipboard && FM.clipboard[0] && FM.clipboard[0].snapshot);
      const selN = FM.selectionIds ? FM.selectionIds().length : 0;
      // The ▸ arrow on Paste Layer opens a position picker so you can drop the copy ABOVE a chosen
      // layer (or top / bottom) instead of always on top. (Ezra)
      const openPastePos = () => {
        const mkThumb = (L) => { const cv = document.createElement('canvas'); cv.className = 'ctx-thumb'; cv.width = 38; cv.height = 24; if (FM.renderThumb) { try { FM.renderThumb(L, cv); } catch (e) {} } return cv; };
        const mkGlyph = (g) => { const s = document.createElement('span'); s.className = 'ctx-thumb ctx-thumb-glyph'; s.textContent = g; return s; };
        const items = [{ label: 'On top', iconEl: mkGlyph('⤒'), action: () => FM.pasteClipboard(0) }];
        // each layer shows its own thumbnail (same preview as the timeline row's far-left), so you can
        // SEE which layer you're pasting above, not just read a name
        FM.scene.layers.forEach((L, i) => items.push({ label: 'Above: ' + (L.name || L.type || 'layer'), iconEl: mkThumb(L), action: () => FM.pasteClipboard(i) }));
        items.push({ label: 'At the bottom', iconEl: mkGlyph('⤓'), action: () => FM.pasteClipboard(FM.scene.layers.length) });
        FM.contextMenu.show(Math.max(8, r.right - 240), r.bottom + 4, items);
      };
      FM.contextMenu.show(Math.max(8, r.right - 200), r.bottom + 4, [
        { label: 'Select All Layers', action: () => { if (FM.selectAll) FM.selectAll(); } },
        { label: 'Group Selection', disabled: selN < 2, action: () => FM.groupSelection() },
        { label: 'Masking Group', disabled: selN < 2, action: () => FM.groupSelection({ mask: true }) },
        { label: (selN > 1 ? 'Duplicate ' + selN + ' Layers' : 'Duplicate Layer'), disabled: !hasSel, action: () => FM.duplicateSelection() },
        { label: 'Copy Layer', disabled: !hasSel, action: () => { if (FM.copySelection) FM.copySelection(); } },
        { label: 'Save Preset', disabled: !hasSel, action: () => FM.savePresetPrompt() },
        { label: 'Save Selection as Element…', disabled: !hasSel, action: () => FM.saveElementPrompt() },
        { label: 'Paste Layer', disabled: !hasClip, action: () => { if (FM.pasteClipboard) FM.pasteClipboard(); }, arrow: hasClip, arrowTitle: 'Choose where to paste', arrowAction: openPastePos },
        { label: 'Paste Style…', disabled: !(hasSel && hasStyle), action: () => { if (FM.openPasteStyle) FM.openPasteStyle(); } },
      ]);
    });
    // ⛶ → toggle AM's right-side VIEW toolbar (fit · grid · layers · camera · canvas zoom).
    const amFitBtn = document.getElementById('btn-amfit');
    const viewBar = document.getElementById('view-bar');
    if (amFitBtn && viewBar) {
      // TAP = toggle the view popup (grid · camera · zoom %). HOLD = review play (preview from here,
      // playhead snaps back on stop). While review IS running the button becomes a ■ STOP icon and a
      // single TAP stops it (no need to hold again). (Ezra: review play lives on this far-right button.)
      const AMFIT_VIEW_SVG = amFitBtn.innerHTML;
      const AMFIT_STOP_SVG = '<svg viewBox="0 0 24 24" class="tco" fill="currentColor"><rect x="6.5" y="6.5" width="11" height="11" rx="2.5"/></svg>';
      const setReviewIcon = (active) => {
        if (amFitBtn.classList.contains('reviewing') === !!active) return;   // idempotent: only touch the DOM on a real state change
        amFitBtn.classList.toggle('reviewing', !!active);
        amFitBtn.innerHTML = active ? AMFIT_STOP_SVG : AMFIT_VIEW_SVG;
        amFitBtn.title = active ? 'Stop review play' : 'View options (grid · camera · zoom) · hold to review-play';
      };
      FM.syncReviewButton = () => setReviewIcon(!!FM._reviewing);   // called from FM.pause when review ends (end-of-timeline, spacebar, project switch…)
      let vbLp = null, vbLpFired = false, vbDown = null;
      amFitBtn.addEventListener('pointerdown', (e) => {
        if (e.pointerType === 'mouse' && e.button !== 0) return;
        vbDown = { x: e.clientX, y: e.clientY }; vbLpFired = false;
        clearTimeout(vbLp);
        vbLp = setTimeout(() => {
          vbLp = null; vbLpFired = true;
          if (navigator.vibrate) { try { navigator.vibrate(12); } catch (er) {} }
          const wasReviewing = FM._reviewing;
          FM.reviewPlay();                                    // toggles: starts review, or stops if already reviewing
          FM.syncReviewButton();
          if (FM.toast) FM.toast(FM._reviewing ? 'Review play — playhead returns here on stop' : (wasReviewing ? 'Review stopped' : ''), 1400);
        }, 550);
      });
      amFitBtn.addEventListener('pointermove', (e) => { if (vbDown && Math.hypot(e.clientX - vbDown.x, e.clientY - vbDown.y) > 8) { clearTimeout(vbLp); vbLp = null; } });
      const vbLpEnd = () => { clearTimeout(vbLp); vbLp = null; vbDown = null; };
      amFitBtn.addEventListener('pointerup', vbLpEnd);
      amFitBtn.addEventListener('pointercancel', vbLpEnd);
      amFitBtn.addEventListener('click', () => {
        if (vbLpFired) { vbLpFired = false; return; }   // the hold already handled it (started/stopped review)
        if (FM._reviewing) { FM.pause(); return; }       // reviewing → a plain TAP stops it (no popup); FM.pause reverts the icon
        const open = viewBar.classList.toggle('hidden') === false;
        amFitBtn.classList.toggle('active', open);
        if (open && FM.syncViewBar) FM.syncViewBar();   // rate / loop / mark state can all change while it's shut
      });
    }
    const vbFit = document.getElementById('vb-fit');
    if (vbFit) vbFit.addEventListener('click', () => { if (FM.viewport) FM.viewport.reset(); else FM.setCanvasZoom(1); });   // fit = 100% AND re-centred (clears the pan too)
    /* The vb-grid button is gone (Ezra: "you've added the grid button twice in that menu"). It toggled
       FM.showGuides — the same state vb-guides toggles — so the rail carried two controls for one
       thing. This one was also the wrong one to keep: it flipped the flag directly, while the contract
       stated a few lines below is that every rail button PRESSES the control that owns the toggle, so
       the bar and the settings panel can never disagree. vb-guides obeys that; this did not. */
    const vbLayers = document.getElementById('vb-layers');
    /* ISOLATE (v5.27). Ezra: "make the layers button work, the one that weve had for ages that does
       nothing… if you have one clip selected, the first tap will make it so every other layer but
       this one is hidden, then another press makes it so all the other layers are there but this one
       goes on top of them all… and then pressing again sets it back to how it was. make sure you dont
       actually make it move on the timeline at all, this shouldnt change anything but just be its own
       little tool to help you visualise stuff."
       So it is a VIEW state and nothing else: FM.isolate is read by the compositor's layer loop and
       never written into the scene — no layer.visible, no reordering, no history entry, no autosave.
       Close the project or pick a different clip and it is simply gone. */
    FM.isolate = null;
    FM.setIsolate = function (mode) {
      const sel = FM.selectedLayer ? FM.selectedLayer(FM.scene) : null;
      if (!sel || !mode) { FM.isolate = null; }
      else FM.isolate = { id: sel.id, mode: mode };
      if (vbLayers) {
        vbLayers.classList.toggle('on', !!FM.isolate);
        vbLayers.title = !FM.isolate ? 'Isolate this layer'
          : FM.isolate.mode === 1 ? 'Isolating — tap again to bring it to the front'
          : 'On top — tap again to return to normal';
      }
      FM.requestRender();
    };
    if (vbLayers) vbLayers.addEventListener('click', () => {
      const ids = FM.selectionIds ? FM.selectionIds() : [];
      if (ids.length !== 1) { if (FM.toast) FM.toast(ids.length ? 'Select a single clip to isolate it' : 'Select a clip first', 1600); return; }
      const cur = (FM.isolate && FM.isolate.id === ids[0]) ? FM.isolate.mode : 0;
      FM.setIsolate(cur === 0 ? 1 : cur === 1 ? 2 : 0);
      if (FM.toast) FM.toast(cur === 0 ? 'Only this layer' : cur === 1 ? 'This layer on top' : 'Back to normal', 1200);
    });
    const vbCam = document.getElementById('vb-camera');
    if (vbCam) vbCam.addEventListener('click', () => { if (FM.addCameraLayer) FM.addCameraLayer(); });
    /* ---- view bar, second group (v5.03) --------------------------------------------------------
     * Ezra: "add the playback speed buttons in the menu that pops up when you press on the view
     * options button, along side loop playback, mark export start and mark export end, clear export
     * marks, and zoom timeline in buttons… if you hold them in they max zoom or max zoom out."
     * All of these were ⋯ entries; this is the second batch of that menu to find a real home. They
     * are LEFT in the ⋯ menu for now — Ezra asked to empty it gradually, not to cut it over. */
    const vbRateLbl = document.getElementById('vb-ratelabel');
    const syncViewBar = () => {
      if (vbRateLbl) vbRateLbl.textContent = (FM.previewRate || 1) + '×';
      const lb = document.getElementById('vb-loop'); if (lb) lb.classList.toggle('on', !!FM.loop);
      // Read back from where each one really lives — never from a copy. A second copy of "is snapping
      // on" is exactly how the old ⋯ menu used to show the wrong tick.
      const sb = document.getElementById('vb-snap');
      if (sb) sb.classList.toggle('on', !!(FM.timeline && FM.timeline.isSnapping && FM.timeline.isSnapping()));
      const gb = document.getElementById('vb-guides'); if (gb) gb.classList.toggle('on', !!FM.showGuides);
      const P = FM.scene && FM.scene.project;
      const marked = !!(P && (P.loopIn != null || P.loopOut != null));
      const mc = document.getElementById('vb-markclear'); if (mc) mc.classList.toggle('dim', !marked);
      const zi = document.getElementById('vb-tlin'), zo = document.getElementById('vb-tlout');
      const z = FM.timeline && FM.timeline.getZoom ? FM.timeline.getZoom() : null;
      if (z != null) { if (zi) zi.classList.toggle('dim', z >= 11.99); if (zo) zo.classList.toggle('dim', z <= 0.0201); }
    };
    FM.syncViewBar = syncViewBar;
    const bindVb = (id, fn) => { const b = document.getElementById(id); if (b) b.addEventListener('click', () => { fn(); syncViewBar(); }); return b; };
    bindVb('vb-slower', () => stepViewRate(-1));
    bindVb('vb-faster', () => stepViewRate(1));
    bindVb('vb-loop', () => { FM.loop = !FM.loop; if (typeof syncLoopUI === 'function') syncLoopUI(); });
    // Each one presses the control that OWNS the toggle rather than flipping a flag here — the same
    // contract the settings panel uses. One writer, so the bar and the panel can never disagree.
    const pressHidden = (id) => { const b = document.getElementById(id); if (b) b.click(); };
    // (no vb-onion binding — the button is gone from the view bar, queue 122. Onion skin is a
    //  per-layer tool and its one door is the layer ⋯ menu now.)
    bindVb('vb-snap', () => pressHidden('btn-snap'));
    bindVb('vb-guides', () => pressHidden('btn-guides'));
    bindVb('vb-markin', markRegionIn);
    bindVb('vb-markout', markRegionOut);
    bindVb('vb-markclear', clearRegion);
    // The same ladder the transport's speed mode uses, so the two controls can't disagree.
    function stepViewRate(dir) {
      const R = [0.1, 0.25, 0.5, 0.75, 1, 1.25, 1.5, 2, 3, 4, 6, 8], cur = FM.previewRate || 1;
      let i = 0, best = Infinity;
      R.forEach((v, k) => { const d = Math.abs(v - cur); if (d < best) { best = d; i = k; } });
      if (Math.abs(R[i] - cur) < 1e-6) i += dir; else if (dir > 0 && R[i] < cur) i += 1; else if (dir < 0 && R[i] > cur) i -= 1;
      i = Math.max(0, Math.min(R.length - 1, i));
      FM.setPreviewRate(R[i]);
      const pr = document.getElementById('preview-rate'); if (pr) pr.value = String(R[i]);
      const chip = document.getElementById('rate-chip');
      if (chip) { chip.textContent = R[i] + '×'; chip.classList.toggle('hidden', Math.abs(R[i] - 1) < 1e-6 && !chip.classList.contains('armed')); }
    }
    /* Timeline zoom: TAP steps, HOLD runs to the end of the range. Implemented as hold-to-JUMP rather
     * than hold-to-repeat because the range is 0.02–12 — a repeat fast enough to cross that is too
     * fast to stop on anything useful, and Ezra asked for "max zoom or max zoom out", not "keep
     * going while I hold". */
    [['vb-tlin', 1], ['vb-tlout', -1]].forEach(([id, dir]) => {
      const b = document.getElementById(id);
      if (!b) return;
      let lp = null, fired = false;
      b.addEventListener('pointerdown', () => {
        fired = false;
        lp = setTimeout(() => {
          lp = null; fired = true;
          if (FM.timeline && FM.timeline.setZoom) FM.timeline.setZoom(dir > 0 ? 12 : 0.02, FM.time);
          if (FM.toast) FM.toast(dir > 0 ? 'Timeline zoomed all the way in' : 'Timeline zoomed all the way out', 1200);
          syncViewBar();
        }, 480);
      });
      ['pointerup', 'pointerleave', 'pointercancel'].forEach(ev => b.addEventListener(ev, () => { if (lp) { clearTimeout(lp); lp = null; } }));
      b.addEventListener('click', () => {
        if (fired) { fired = false; return; }
        if (FM.timeline && FM.timeline.zoomBy) FM.timeline.zoomBy(dir > 0 ? 1.35 : 1 / 1.35, FM.time);
        syncViewBar();
      });
    });
    const vbZin = document.getElementById('vb-zoomin');
    if (vbZin) vbZin.addEventListener('click', () => FM.zoomCanvasStep(1));
    const vbZout = document.getElementById('vb-zoomout');
    if (vbZout) vbZout.addEventListener('click', () => FM.zoomCanvasStep(-1));

    // transport
    // Play button: tap = play/pause · HOLD = toggle loop mode (whole-timeline repeat). The long-press
    // sets a flag so the trailing click doesn't also toggle playback.
    const playBtn = document.getElementById('btn-play');
    const syncLoopUI = () => {
      const lb = document.getElementById('btn-loop'); if (lb) lb.classList.toggle('active', !!FM.loop);
      if (playBtn) playBtn.classList.toggle('loop-on', !!FM.loop);
    };
    let playLp = null, playLpFired = false, playDown = null;
    playBtn.addEventListener('pointerdown', (e) => {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      playDown = { x: e.clientX, y: e.clientY }; playLpFired = false;
      clearTimeout(playLp);
      playLp = setTimeout(() => {
        playLp = null; playLpFired = true;
        FM.loop = !FM.loop; syncLoopUI();
        if (navigator.vibrate) { try { navigator.vibrate(12); } catch (er) {} }
        if (FM.toast) FM.toast(FM.loop ? 'Loop ON — playback repeats start-to-end' : 'Loop off', 1500);
      }, 550);
    });
    playBtn.addEventListener('pointermove', (e) => { if (playDown && Math.hypot(e.clientX - playDown.x, e.clientY - playDown.y) > 8) { clearTimeout(playLp); playLp = null; } });
    const playLpEnd = () => { clearTimeout(playLp); playLp = null; playDown = null; };
    playBtn.addEventListener('pointerup', playLpEnd);
    playBtn.addEventListener('pointercancel', playLpEnd);
    playBtn.addEventListener('click', () => { if (playLpFired) { playLpFired = false; return; } FM.togglePlay(); });
    // Skip ◀ / ▶| step to the PREVIOUS / NEXT snap point (benchmark or selected-clip edge), falling back
    // to the project start / end when there's nothing closer.
    const toStart = document.getElementById('btn-tostart');
    const toEnd = document.getElementById('btn-toend');
    const jumpBack = () => {
      const t = FM.time, eps = 1e-3;
      const before = FM.timelineSnapPoints().filter(p => p < t - eps);
      FM.pause(); FM.setTime(before.length ? before[before.length - 1] : 0);
    };
    const jumpFwd = () => {
      const t = FM.time, eps = 1e-3;
      const next = FM.timelineSnapPoints().find(p => p > t + eps);
      FM.pause(); FM.setTime(next != null ? next : FM.scene.project.duration);
    };

    /* ---- SPEED MODE (v5.02) --------------------------------------------------------------------
     * Ezra: "if you hold those down, it'll change the play speed… when you hold down one of the
     * buttons, it switches it to a different button that is, like, a plus indicator… and you can spam
     * tap it to make the speed go up. And then once you hold on it again, it switches it back."
     *
     * So it is a MODE, not a hold-to-repeat: hold either jump button and BOTH morph — left to −,
     * right to + — and stay morphed until you hold again. That is what makes spam-tapping work, and
     * it is why both flip together rather than only the one you held: a + you can tap ten times with
     * no − beside it is a trap.
     *
     * The ladder is deliberately finer than the ⋯ menu's 0.25/0.5/1/2/4. That list was built for a
     * menu where each pick costs a trip through two levels, so big jumps made sense; here each step
     * is one tap, and doubling on every tap overshoots instantly. */
    const RATES = [0.1, 0.25, 0.5, 0.75, 1, 1.25, 1.5, 2, 3, 4, 6, 8];
    let speedMode = false;
    const rateChip = document.getElementById('rate-chip');
    // Captured from the DOM rather than hardcoded: the skip glyphs are a <line>+<polygon> pair in
    // index.html, and a hand-copied duplicate here would silently stop matching the moment either is
    // touched — restoring the button would quietly draw the wrong mark.
    const ICON_BACK = toStart ? (toStart.querySelector('svg') || {}).innerHTML || '' : '';
    const ICON_FWD  = toEnd ? (toEnd.querySelector('svg') || {}).innerHTML || '' : '';
    const ICON_MINUS = '<path d="M5 12h14"/>';
    const ICON_PLUS  = '<path d="M12 5v14M5 12h14"/>';
    function syncRateUI() {
      const r = FM.previewRate || 1;
      if (rateChip) {
        rateChip.textContent = (Number.isInteger(r) ? r : r) + '×';
        rateChip.classList.toggle('hidden', !speedMode && Math.abs(r - 1) < 1e-6);
        rateChip.classList.toggle('armed', speedMode);
      }
      [toStart, toEnd].forEach(b => { if (b) b.classList.toggle('speed-mode', speedMode); });
      const paint = (b, d) => { if (b) { const sv = b.querySelector('svg'); if (sv) sv.innerHTML = d; } };
      paint(toStart, speedMode ? ICON_MINUS : ICON_BACK);
      paint(toEnd, speedMode ? ICON_PLUS : ICON_FWD);
      if (toStart) toStart.title = speedMode ? 'Slower — tap to step down. Hold to go back to skip.' : 'Skip to previous benchmark / clip edge · hold for playback speed';
      if (toEnd) toEnd.title = speedMode ? 'Faster — tap to step up. Hold to go back to skip.' : 'Skip to next benchmark / clip edge · hold for playback speed';
    }
    function stepRate(dir) {
      const cur = FM.previewRate || 1;
      // nearest rung, then move one — so an odd rate set from the ⋯ menu still lands on the ladder
      let i = 0, best = Infinity;
      RATES.forEach((v, k) => { const d = Math.abs(v - cur); if (d < best) { best = d; i = k; } });
      if (Math.abs(RATES[i] - cur) < 1e-6) i += dir; else if (dir > 0 && RATES[i] < cur) i += 1; else if (dir < 0 && RATES[i] > cur) i -= 1;
      i = Math.max(0, Math.min(RATES.length - 1, i));
      FM.setPreviewRate(RATES[i]);
      const pr = document.getElementById('preview-rate'); if (pr) pr.value = String(RATES[i]);
      syncRateUI();
    }
    FM.toggleSpeedMode = function (on) { speedMode = on == null ? !speedMode : !!on; syncRateUI(); };
    // Hold on EITHER button toggles the mode. The click handler below checks a flag the hold sets, so
    // the release that ends a hold never also fires the tap action underneath it.
    [toStart, toEnd].forEach(b => {
      if (!b) return;
      let lp = null, fired = false;
      b._lpFired = () => fired;
      b.addEventListener('pointerdown', () => {
        fired = false;
        lp = setTimeout(() => { lp = null; fired = true; FM.toggleSpeedMode(); }, 480);
      });
      const end = () => { if (lp) { clearTimeout(lp); lp = null; } };
      ['pointerup', 'pointerleave', 'pointercancel'].forEach(ev => b.addEventListener(ev, end));
      b.addEventListener('click', () => {
        if (fired) { fired = false; return; }   // that click was the end of a hold
        if (speedMode) stepRate(b === toEnd ? 1 : -1);
        else (b === toEnd ? jumpFwd : jumpBack)();
      });
    });
    syncRateUI();
    const loopBtn = document.getElementById('btn-loop');
    if (loopBtn) loopBtn.addEventListener('click', () => { FM.loop = !FM.loop; syncLoopUI(); });
    const splitBtn = document.getElementById('btn-split');
    if (splitBtn) splitBtn.addEventListener('click', () => { if (FM.scene.selectedId) FM.splitLayer(FM.scene.selectedId); });
    const pn = document.getElementById('proj-name');
    if (pn) {
      pn.value = FM.scene.project.name || 'Untitled';
      pn.addEventListener('input', () => {
        const sel = FM.selectedLayer(FM.scene);   // typing renames the SELECTED layer, else the project
        if (sel) { sel.name = pn.value; if (FM.timeline) FM.timeline.rebuild(); }
        else FM.scene.project.name = pn.value;
      });
      pn.addEventListener('change', () => { if (FM.history) FM.history.commit(); });
    }
    // …and its copy in the inspector/Add panel header (v6.13). Writes the PROJECT name only, and pushes
    // the new value into the other two fields so all three never disagree.
    const pns = document.getElementById('proj-name-s');
    if (pns) {
      pns.value = FM.scene.project.name || 'Untitled';
      pns.addEventListener('input', () => {
        FM.scene.project.name = pns.value;
        const pnm = document.getElementById('proj-name-m');
        if (pnm && document.activeElement !== pnm) pnm.value = pns.value;
        if (pn && document.activeElement !== pn && !FM.selectedLayer(FM.scene)) pn.value = pns.value;
      });
      pns.addEventListener('change', () => { if (FM.history) FM.history.commit(); });
    }
    // Top-bar delete: removes the selected layer(s). Sits next to ⋯ / Export (the inspector's own
    // delete/duplicate/thumbnail header row was removed — those live on the timeline / top bar now).
    const btnDelLayer = document.getElementById('btn-del-layer');
    if (btnDelLayer) btnDelLayer.addEventListener('click', () => {
      const ids = FM.selectionIds ? FM.selectionIds() : [];
      if (ids.length > 1 && FM.deleteSelected) FM.deleteSelected();
      else if (FM.scene.selectedId) FM.deleteLayer(FM.scene.selectedId);
    });

    // canvas-size / aspect-ratio dialog (AM-style)
    let cvAspect = '9:16';
    const cvDialog = document.getElementById('canvas-dialog');
    const cvClampDim = v => Math.max(16, Math.min(7680, Math.round((parseInt(v, 10) || 16) / 2) * 2));   // even, sane bounds (matches import clamp)
    function cvCompute() {
      if (cvAspect === 'custom') return { w: cvClampDim(document.getElementById('cv-cw').value), h: cvClampDim(document.getElementById('cv-ch').value) };
      const base = parseInt(document.getElementById('cv-res').value, 10) || 1080;
      const pr = cvAspect.split(':').map(Number), a = pr[0], b = pr[1];
      let w, h;
      if (a >= b) { h = base; w = base * a / b; } else { w = base; h = base * b / a; }
      return { w: Math.round(w / 2) * 2, h: Math.round(h / 2) * 2 };
    }
    // Canvas background — 'none' means transparent (the compositor skips the fill). Without this the
    // choice made in the New project dialog was a one-way door: nothing else in the app writes it.
    let cvBg = '#000000';
    function cvBgSync() {
      const inp = document.getElementById('cv-bg');
      if (inp && /^#[0-9a-f]{6}$/i.test(cvBg)) inp.value = cvBg;
      document.querySelectorAll('#canvas-dialog .cv-bg-sw').forEach(b => {
        const on = b.dataset.bg === cvBg;
        b.classList.toggle('active', on);
        b.setAttribute('aria-pressed', on ? 'true' : 'false');
      });
    }
    function cvUpdate() {
      const custom = cvAspect === 'custom';
      const resRow = document.getElementById('cv-res-row'); if (resRow) resRow.classList.toggle('hidden', custom);
      const csRow = document.getElementById('cv-custom-size'); if (csRow) csRow.classList.toggle('hidden', !custom);
      const s = cvCompute();
      document.getElementById('cv-size').textContent = s.w + ' × ' + s.h;
      document.querySelectorAll('.aspect-chip').forEach(c => c.classList.toggle('on', c.dataset.aspect === cvAspect));
    }
    function cvDetect() {
      // Pick a preset ONLY when it exactly reproduces the current W×H (and sync cv-res to it); otherwise
      // fall back to Custom so reopening + Apply preserves a custom/non-preset size instead of silently
      // snapping the project to a different resolution.
      const W = FM.scene.project.width, H = FM.scene.project.height;
      const resSel = document.getElementById('cv-res');
      const aspects = ['16:9', '9:16', '4:5', '1:1', '4:3'];
      for (const asp of aspects) {
        const pr = asp.split(':').map(Number), a = pr[0], b = pr[1];
        for (const base of [720, 1080, 1440, 2160]) {
          let w, h;
          if (a >= b) { h = base; w = base * a / b; } else { w = base; h = base * b / a; }
          if (Math.round(w / 2) * 2 === W && Math.round(h / 2) * 2 === H) { cvAspect = asp; if (resSel) resSel.value = String(base); return; }
        }
      }
      cvAspect = 'custom';
    }
    const canvasBtn = document.getElementById('btn-canvas');
    if (canvasBtn && cvDialog) {
      const fpsSel = document.getElementById('cv-fps');
      const fpsNum = document.getElementById('cv-fps-num');
      const fpsCustomRow = document.getElementById('cv-custom-fps');
      const FPS_PRESETS = ['24', '25', '30', '50', '60'];
      canvasBtn.addEventListener('click', () => {
        cvDetect();
        // seed the custom W/H inputs from the live project so switching to Custom starts sensible
        const cw = document.getElementById('cv-cw'), ch = document.getElementById('cv-ch');
        if (cw) cw.value = FM.scene.project.width; if (ch) ch.value = FM.scene.project.height;
        // sync the fps control to the live project (a non-preset fps opens as Custom)
        const cur = String(FM.scene.project.fps || 30);
        if (fpsSel) {
          if (FPS_PRESETS.indexOf(cur) >= 0) { fpsSel.value = cur; if (fpsCustomRow) fpsCustomRow.classList.add('hidden'); }
          else { fpsSel.value = 'custom'; if (fpsNum) fpsNum.value = cur; if (fpsCustomRow) fpsCustomRow.classList.remove('hidden'); }
        }
        const pb = FM.scene.project.background;
        cvBg = /^#[0-9a-f]{6}$/i.test(String(pb || '')) ? pb : 'none';
        cvBgSync();
        cvUpdate();
        cvDialog.classList.remove('hidden');
      });
      document.querySelectorAll('#canvas-dialog .cv-bg-sw').forEach(b => b.addEventListener('click', () => { cvBg = b.dataset.bg; cvBgSync(); }));
      { const bgInp = document.getElementById('cv-bg'); if (bgInp) bgInp.addEventListener('input', () => { cvBg = bgInp.value; cvBgSync(); }); }
      document.querySelectorAll('.aspect-chip').forEach(chip => chip.addEventListener('click', () => { cvAspect = chip.dataset.aspect; cvUpdate(); }));
      document.getElementById('cv-res').addEventListener('change', cvUpdate);
      ['cv-cw', 'cv-ch'].forEach(id => { const inp = document.getElementById(id); if (inp) inp.addEventListener('input', cvUpdate); });
      if (fpsSel) fpsSel.addEventListener('change', () => { if (fpsCustomRow) fpsCustomRow.classList.toggle('hidden', fpsSel.value !== 'custom'); });
      document.getElementById('cv-cancel').addEventListener('click', () => cvDialog.classList.add('hidden'));
      document.getElementById('cv-go').addEventListener('click', () => {
        const s = cvCompute();
        FM.scene.project.width = s.w; FM.scene.project.height = s.h;
        const rawFps = (fpsSel && fpsSel.value === 'custom') ? (fpsNum ? fpsNum.value : 30) : (fpsSel ? fpsSel.value : 30);
        FM.scene.project.fps = Math.max(1, Math.min(120, parseInt(rawFps, 10) || 30));
        FM.scene.project.background = cvBg === 'none' ? null : cvBg;   // null = transparent
        resizeCanvas(); refreshAll();
        if (FM.history) FM.history.commit();
        cvDialog.classList.add('hidden');
      });
    }

    // export dialog
    document.getElementById('exp-cancel').addEventListener('click', hideExportDialog);
    document.getElementById('exp-go').addEventListener('click', runExport);
    { const ef = document.getElementById('exp-format'); if (ef) ef.addEventListener('change', syncExportFormat); }
    document.getElementById('export-cancel').addEventListener('click', () => { FM._exportCancel = true; });

    // drag + drop
    const stage = document.getElementById('stage');
    ['dragenter', 'dragover'].forEach(ev => stage.addEventListener(ev, e => { e.preventDefault(); stage.classList.add('dragover'); }));
    ['dragleave', 'drop'].forEach(ev => stage.addEventListener(ev, e => { e.preventDefault(); if (ev === 'drop' || e.target === stage) stage.classList.remove('dragover'); }));
    stage.addEventListener('drop', e => { if (e.dataTransfer && e.dataTransfer.files.length) handleFiles(Array.from(e.dataTransfer.files)); });

    /* ---- "does a full-screen overlay own the screen?" -------------------------------------------
     * Asked GEOMETRICALLY, never from a list of ids — the list is precisely what went stale. v5.07
     * shipped this guard as `FM.home.isOpen() || FM.settings.isOpen() || querySelector('#fx-browser,
     * #afx-browser, #export-dialog, #canvas-dialog')`. By v5.72 four more full-screen surfaces
     * existed that nobody thought to add to it, and all four were measured letting bare-key editor
     * shortcuts through to the project the user could not see:
     *
     *   #el-browser      Elements browser — shares its entire CSS rule with #fx-browser (styles.css)
     *   #export-overlay  up for the WHOLE export, minutes at a time
     *   .ps-overlay      Paste Style
     *   #shortcuts-overlay   the keyboard-help sheet, of all things
     *
     * Measured on v5.72 at 1280x900: with each of those up, Backspace ran deleteSelected(), Space
     * started playback, S split, M dropped a marker, [ set the loop-in — and the Backspace deletion
     * was written through to localStorage['fm.proj.<id>'] (3 layers in, 2 layers out) because
     * deleteSelected() commits and commit() autosaves. Permanent, silent, invisible.
     *
     * The rule now: hit-test the centre of the viewport and ask whether anything in that stack is
     * position:fixed and as big as the screen. A new full-screen surface answers yes the day it is
     * written — being full-screen IS the definition, so there is nothing to remember to add. A layer
     * you can click THROUGH (pointer-events:none) is skipped by the hit test, which is correct: it
     * is not owning anything.
     *
     * home/settings are kept as an explicit fast path because they are the two that actually lose
     * work, and their own isOpen() is authoritative even mid-transition when geometry is still
     * settling. They are API calls, not selectors: nothing here has to be kept in sync with the DOM.
     * If you add a full-screen overlay, you do NOT need to touch this function. */
    const OVERLAY_COVERS = 0.9;   // a bottom sheet / side panel is nowhere near this; every real overlay is inset:0
    FM.overlayOwnsScreen = function () {
      if (FM.home && FM.home.isOpen && FM.home.isOpen()) return true;
      if (FM.settings && FM.settings.isOpen && FM.settings.isOpen()) return true;
      const vw = window.innerWidth, vh = window.innerHeight;
      if (!vw || !vh || !document.elementsFromPoint) return false;
      const stack = document.elementsFromPoint(vw / 2, vh / 2) || [];
      for (let i = 0; i < stack.length; i++) {
        const el = stack[i];
        if (el === document.body || el === document.documentElement) break;   // reached the page itself: nothing above it covered
        if (getComputedStyle(el).position !== 'fixed') continue;
        const r = el.getBoundingClientRect();
        if (r.width >= vw * OVERLAY_COVERS && r.height >= vh * OVERLAY_COVERS) return true;
      }
      return false;
    };

    // keyboard
    let _nudged = false;
    window.addEventListener('keydown', e => {
      const mod = e.metaKey || e.ctrlKey;
      // Editable target = native <input>/<select>/<textarea> OR any contentEditable element
      // (the Move & Transform value boxes are contentEditable <div>s). When focused there, let the
      // browser handle the key (text edit / undo / copy) instead of firing app shortcuts — otherwise
      // Backspace deletes the selected LAYER while you're trying to fix a digit. (#1)
      const tgt = e.target;
      const inEdit = !!(tgt && (tgt.tagName === 'INPUT' || tgt.tagName === 'SELECT' || tgt.tagName === 'TEXTAREA' || tgt.isContentEditable));
      // A full-screen overlay owns the screen, but the PROJECT BEHIND IT IS STILL LOADED, still has a
      // selection, and still autosaves. Nothing here checked for that, so every bare-key editor
      // shortcut reached a document the user could not see: on the home/project browser, Backspace —
      // the habitual "go back" key, and where focus lands after the back button — ran deleteSelected(),
      // which commits, and commit() autosaves. The layer was gone next time they opened the project,
      // with no visible cause. Space was as bad in a quieter way: playback started behind an opaque
      // overlay, audio coming from nowhere. The overlay's own buttons are not INPUT/SELECT/TEXTAREA,
      // so `inEdit` above never covered any of this. See FM.overlayOwnsScreen above for why this is a
      // geometry question and not a list of ids.
      // Escape is deliberately still allowed through: it is how several of these overlays close.
      // Both key and code are checked — a synthesised event may carry only one of them.
      const isEscape = e.code === 'Escape' || e.key === 'Escape';
      if (!isEscape && FM.overlayOwnsScreen()) return;
      // The focused text editor is a MODE, and the rule above cannot see it. overlayOwnsScreen() asks
      // a GEOMETRY question — "is a fixed element covering the middle of the screen?" — and since
      // v6.17 the desktop editor is a 560x145 card docked at the bottom of the stage, which covers
      // nothing. `inEdit` above does not cover it either: it only asks where FOCUS is, and the whole
      // point of the desktop card is that you can click the canvas to look at what you typed, which
      // takes focus to BODY with the editor still open.
      // Measured on the shipped build, at 1920x1080: type "MY TITLE", click the canvas, press
      // Backspace once — FM.deleteSelected() ran and the text layer went with it (2 layers -> 1). 's'
      // split the clip, Space started playback. A phone cannot reach any of it (no physical Backspace
      // outside the field), which is why it survived three rounds of "text editing is fixed".
      // Escape still passes: it is how the editor is closed.
      if (!isEscape && FM.textEdit && FM.textEdit.isActive && FM.textEdit.isActive()) return;
      if (mod && (e.key === 'z' || e.key === 'Z')) {
        if (inEdit) return; // let field text-undo
        e.preventDefault();
        if (e.shiftKey) { if (FM.history) FM.history.redo(); } else { if (FM.history) FM.history.undo(); }
        return;
      }
      if (mod && (e.key === 'y' || e.key === 'Y')) { if (inEdit) return; e.preventDefault(); if (FM.history) FM.history.redo(); return; }
      if (mod && (e.key === 'd' || e.key === 'D')) {
        if (inEdit) return;
        e.preventDefault();
        if (FM.scene.selectedId) FM.duplicateSelection();
        return;
      }
      if (mod && (e.key === 'c' || e.key === 'C')) {
        if (inEdit) return;
        const sel = window.getSelection && window.getSelection();
        if (sel && String(sel).length) return;   // don't hijack a real text-selection copy
        e.preventDefault();
        if (FM.copySelection) FM.copySelection();
        return;
      }
      if (mod && (e.key === 'v' || e.key === 'V')) {
        if (inEdit) return;
        e.preventDefault();
        if (FM.pasteClipboard) FM.pasteClipboard();
        return;
      }
      if (mod && (e.key === 'a' || e.key === 'A')) {
        if (inEdit) return;
        e.preventDefault();
        if (FM.selectAll) FM.selectAll();
        return;
      }
      // Any OTHER modifier combo is the browser's / OS's (⌘S save, ⌘M minimise, ⌘←/→): the handled
      // combos above all return, so reaching here with a modifier held means we must NOT hijack the
      // bare-key chain below (⌘S was silently splitting the clip, ⌘M dropping a marker).
      if (mod) return;
      if (inEdit) return;
      if (e.code === 'Space') { e.preventDefault(); FM.togglePlay(); }
      else if (e.key === '?') { e.preventDefault(); if (FM.shortcuts) FM.shortcuts.toggle(); }
      else if (e.code.indexOf('Arrow') === 0) {
        const nudgeable = (FM.selectionIds ? FM.selectionIds() : (FM.scene.selectedId ? [FM.scene.selectedId] : []))
          .map(id => FM.layerById(FM.scene, id)).filter(l => l && !l.locked);
        if (nudgeable.length) {                                  // nudge all selected layers
          e.preventDefault();
          const step = e.shiftKey ? 10 : 1;
          let dx = 0, dy = 0;
          if (e.code === 'ArrowLeft') dx = -step; else if (e.code === 'ArrowRight') dx = step;
          else if (e.code === 'ArrowUp') dy = -step; else if (e.code === 'ArrowDown') dy = step;
          nudgeable.forEach(layer => {
            const tr = layer.transform;
            FM.setTransform(layer, 'x', Math.round(FM.evalProp(tr.x, FM.time) + dx), FM.time);
            FM.setTransform(layer, 'y', Math.round(FM.evalProp(tr.y, FM.time) + dy), FM.time);
          });
          FM.requestRender(); if (FM.inspector) FM.inspector.refresh(); if (FM.canvasEdit) FM.canvasEdit.update();
          _nudged = true;
        } else if (e.code === 'ArrowRight') { e.preventDefault(); FM.pause(); FM.setTime(FM.time + 1 / (FM.scene.project.fps || 30)); }
        else if (e.code === 'ArrowLeft') { e.preventDefault(); FM.pause(); FM.setTime(FM.time - 1 / (FM.scene.project.fps || 30)); }
      }
      else if (e.code === 'Comma') { e.preventDefault(); FM.pause(); FM.setTime(FM.time - 1 / (FM.scene.project.fps || 30)); }
      else if (e.code === 'Period') { e.preventDefault(); FM.pause(); FM.setTime(FM.time + 1 / (FM.scene.project.fps || 30)); }
      else if (e.code === 'Home') { e.preventDefault(); FM.pause(); FM.setTime(0); }
      else if (e.code === 'End') { e.preventDefault(); FM.pause(); FM.setTime(FM.scene.project.duration); }
      else if (e.code === 'BracketLeft') { e.preventDefault(); markRegionIn(); }
      else if (e.code === 'BracketRight') { e.preventDefault(); markRegionOut(); }
      else if (e.code === 'Backslash') { e.preventDefault(); clearRegion(); }
      else if (e.code === 'KeyM') { e.preventDefault(); if (e.repeat) return; if (FM.toggleMarkerAtPlayhead) FM.toggleMarkerAtPlayhead(); }   // toggle (dedups within 0.12s) + ignore OS autorepeat → no stacked duplicates / undo spam
      else if (e.code === 'Tab') { e.preventDefault(); const ls = FM.scene.layers; if (ls.length) { const i = ls.findIndex(l => l.id === FM.scene.selectedId); const n = ((i < 0 ? 0 : i + (e.shiftKey ? -1 : 1)) + ls.length) % ls.length; FM.selectLayer(ls[n].id); } }
      else if ((e.code === 'Equal' || e.code === 'NumpadAdd') && FM.timeline.zoomBy) { e.preventDefault(); FM.timeline.zoomBy(1.5); }
      else if ((e.code === 'Minus' || e.code === 'NumpadSubtract') && FM.timeline.zoomBy) { e.preventDefault(); FM.timeline.zoomBy(1 / 1.5); }
      // Number keys. With a layer SELECTED: 1..N open its category cards (Color & Fill, Border,
      // Blending, Move & Transform, …) — the badge on each card shows its key. With NOTHING selected:
      // 1-5 open the Add-menu tabs. Shift+1/2/3 always add Text / Freehand / Vector.
      else if (/^Digit[1-9]$/.test(e.code) && !mod) {
        const n = parseInt(e.code.slice(5), 10);
        if (e.shiftKey) { if (n <= 4 && FM.addMenu && FM.addMenu.instant) { e.preventDefault(); FM.addMenu.instant(n - 1); } }   // 4 rail entries now: Text / Captions / Freehand / Vector
        else if (FM.scene.selectedId && FM.inspector && FM.inspector.openCategoryByIndex) {
          if (FM.inspector.openCategoryByIndex(n)) e.preventDefault();
        }
        else if (n <= 5 && FM.addMenu && FM.addMenu.openTab) { e.preventDefault(); FM.addMenu.openTab(FM.addMenu.TAB_KEYS[n - 1]); }
      }
      // Esc: step BACK a page (effects → grid → deselect), not straight to closed. Also bails out of
      // any modal overlay / point-edit / tracking pick first.
      else if (e.code === 'Escape') {
        e.preventDefault();
        if (FM.shortcuts && FM.shortcuts.isOpen()) { FM.shortcuts.hide(); return; }
        if (FM.eyedropper && FM.eyedropper.isActive && FM.eyedropper.isActive()) { FM.eyedropper.stop(); return; }
        if (FM.cropTool && FM.cropTool.isActive && FM.cropTool.isActive()) { FM.cropTool.stop(); return; }
        if (FM.touchupTool && FM.touchupTool.isOpen && FM.touchupTool.isOpen()) { FM.touchupTool.close(); return; }
        if (FM.textEdit && FM.textEdit.isActive && FM.textEdit.isActive()) { FM.textEdit.stop(); return; }
        // standalone point-edit closes on Esc; EMBEDDED Edit Points is a view — inspector.back()
        // steps out of it (the refresh guard tears the overlay down with the view)
        if (FM.pointEdit && FM.pointEdit.isActive && FM.pointEdit.isActive() && !FM.pointEdit.isEmbedded()) { FM.pointEdit.stop(); return; }
        if (FM.tracker && FM.tracker.isPicking && FM.tracker.isPicking()) { FM.tracker.cancel(); return; }
        if (FM.inspector && FM.inspector.back) FM.inspector.back();
      }
      else if (e.code === 'KeyS') { e.preventDefault(); if (FM.scene.selectedId) FM.splitLayer(FM.scene.selectedId); }
      else if (e.code === 'Backspace' || e.code === 'Delete') { e.preventDefault(); FM.deleteSelected(); }
    });
    window.addEventListener('keyup', e => {
      if (_nudged && e.code.indexOf('Arrow') === 0) { _nudged = false; if (FM.history) FM.history.commit(); }
    });

    // Tap ANY empty background (the stage around the comp, the gaps between panels, etc.) → deselect,
    // which reveals the Add menu (PC) / drops the inspector sheet (phone). Tap-vs-drag aware so a
    // scrub/move never deselects. The canvas (#preview) and timeline (#timeline) own their OWN
    // select/deselect (and every clip/head/ruler/lane lives inside #timeline), so the deny-list keeps
    // them plus every interactive control; everything else counts as empty space.
    /* THE canonical answer to "is a modal canvas TOOL driving the screen right now?".
       This list already existed, spelled out inside the Escape handler above, and the tap-to-deselect
       guard below duplicated the same idea as a list of ELEMENT IDS instead — which is why the two
       drifted. Five separate tools have now shipped with their tap being read as an empty-background
       tap because someone added the tool and not its id: the eyedropper, crop, touch-up, fill-drag,
       and now the shape POINT EDITOR (Ezra: "when I am editing a shape and tap on the canvas to select
       an edit point it just closes the editing window").
       Asking the TOOLS rather than naming their overlays is true by construction: a tool that can be
       dismissed with Escape is, by definition, a tool that owns the canvas, so any future tool wired
       into Escape gets tap-protection for free and cannot be forgotten here. */
    FM.toolOwnsCanvas = function () {
      const on = (o, m) => !!(o && typeof o[m] === 'function' && o[m]());
      return on(FM.eyedropper, 'isActive') || on(FM.cropTool, 'isActive') ||
             on(FM.touchupTool, 'isOpen') || on(FM.textEdit, 'isActive') ||
             on(FM.pointEdit, 'isActive') || on(FM.tracker, 'isPicking') ||
             on(FM.fillDrag, 'isActive') || on(FM.maskTool, 'isActive');
    };

    (function deselectOnEmptyTap() {
      const KEEP = '#preview, #select-box, #timeline, #transport, #inspector-panel, #ai-panel,' +
        ' #ctx-menu, #shortcuts-overlay, #export-overlay, #export-dialog, #canvas-dialog, #add-sheet,' +
        ' #splash,' +   // tap-to-skip on the launch splash must NOT read as an empty-background tap (it deselected the restored layer)
        ' #topbar, #topbar-m, .sb-handle, button, input, select, textarea, label, a, option, [contenteditable],' +
        // full-screen TOOL overlays: the eyedropper's sample tap and the crop/touch-up box drags land on
        // these, and without them here that tap read as "empty background" → deselect → the open colour
        // picker / effect panel vanished mid-pick (the "colour picker closes my menu" bug)
        // #fd-overlay is the fill-drag surface and belongs here for exactly the reason the comment
        // above describes — it was left off when that tool landed, and a verifier measured the same
        // bug returning: a TAP (or any press ending within 6px of its start) anywhere on the comp,
        // INCLUDING on the shape being edited, deselected the layer and closed Colour & Fill. That is
        // strictly worse than before the tool existed, since canvas-edit only ever deselected a
        // stationary tap OFF the layer — and the tool's own hint invites the gesture that breaks it.
        // This listener is on document in the CAPTURE phase, so the overlay's own stopPropagation()
        // cannot reach it; being named here is the only thing that spares a surface.
        ' #ed-overlay, #ed-bar, #crop-overlay, #crop-bar, #touchup-overlay, #touchup-bar, #fd-overlay,' +
        ' #pe-overlay, #pe-bar';   // the shape point editor — the fifth tool to be missing from this list
      let dx = 0, dy = 0, keepAtDown = false, armed = false;
      document.addEventListener('pointerdown', (e) => {
        if (e.pointerType === 'mouse' && e.button !== 0) { armed = false; return; }
        // A modal canvas tool is driving: every tap belongs to it, wherever it lands.
        if (FM.toolOwnsCanvas && FM.toolOwnsCanvas()) { armed = false; return; }
        dx = e.clientX; dy = e.clientY; armed = true;
        // Decide NOW, while the target is still attached, whether it's a control / self-managing area.
        // Clicking a clip selects it → that calls timeline.rebuild() which DETACHES the clicked element,
        // so a closest('#timeline') check at pointerup would see a detached node (null) and wrongly
        // deselect. Capturing the decision at pointerdown survives the rebuild.
        keepAtDown = !!(e.target && e.target.closest && e.target.closest(KEEP));
      }, true);
      document.addEventListener('pointerup', (e) => {
        if (!armed) return; armed = false;
        const moved = Math.abs(e.clientX - dx) > 6 || Math.abs(e.clientY - dy) > 6;         // a drag, not a tap
        // The Add sheet behaves like a modal: a tap ANYWHERE outside it closes it and clears the
        // selection, so you never have to find the ✕. Checked before the KEEP list below, because
        // tapping the canvas or the timeline should dismiss it too — those are exactly the places
        // you tap when you've changed your mind. The FAB is excluded: it already toggles, and
        // closing here as well would cancel out its own tap.
        const sheet = document.getElementById('add-sheet');
        if (!moved && sheet && sheet.classList.contains('open') &&
            !(e.target && e.target.closest && e.target.closest('#add-sheet, #add-fab'))) {
          if (FM.mobile && FM.mobile.closeAdd) FM.mobile.closeAdd();
          if (FM.selectLayer) FM.selectLayer(null);
          return;
        }
        if (keepAtDown) return;                                                             // tapped a control / self-managing area
        if (moved) return;
        // The SAME staleness the keyboard guard had, in a second listener. KEEP above is a list of
        // selectors, and full-screen overlays have been added to it one at a time — #export-overlay,
        // #export-dialog, #canvas-dialog, #shortcuts-overlay, #splash are all there, while
        // #home-screen, #fx-browser, #afx-browser, #el-browser, .set-scrim and .ps-overlay never
        // were. Measured on v5.72: a tap on the empty part of the home browser (or the Elements
        // browser) ran FM.selectLayer(null) on the project underneath, so you came back to the editor
        // with your selection gone and nothing to explain it. Asking the geometry instead covers
        // every one of them, and every one added later: you cannot tap the editor's empty background
        // while you cannot see the editor.
        if (FM.overlayOwnsScreen && FM.overlayOwnsScreen()) return;
        if (!FM.scene || (!FM.scene.selectedId && !(FM.scene.selectedIds && FM.scene.selectedIds.length))) return;
        // Clicking anywhere off the inspector CLOSES it — deselect straight back to the Add menu so the
        // panel visibly clears (no matter how deep you were, e.g. the Effects sub-menu). Esc is the
        // gentler step-back (effects → grid → deselect).
        FM.selectLayer(null);
      }, true);
    })();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})(window.FM);
