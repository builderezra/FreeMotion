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
    /* The ghost plate belongs on the TARGET's pixel grid, like every plate in the compositor (v9.26).
     * It was project-sized AND reassigned every frame — and assigning width/height reallocates the
     * backing store, which the compositor's own guards exist to avoid. On the 12.2-megapixel project
     * from queue 202 that is a 48 MB allocation thrown away twice per frame while onion skin is on.
     * renderScene derives __fmRS from the canvas it is handed, so sizing it here is all that is
     * needed for the ghost render itself to follow. */
    const gps = Math.min(1, ctx.canvas.__fmRS || 1);
    const gw = Math.max(1, Math.round(P.width * gps)), gh = Math.max(1, Math.round(P.height * gps));
    if (ghostC.width !== gw || ghostC.height !== gh) { ghostC.width = gw; ghostC.height = gh; }
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
      ctx.globalAlpha = 0.4; ctx.drawImage(ghostC, 0, 0, P.width, P.height); ctx.restore();   // plate is target px, ctx is project units
    });
    } finally { FM._mfGhost = 0; }
  }
  FM._onionGhostSize = () => (ghostC ? [ghostC.width, ghostC.height] : null);   // suite seam: the plate is a SIZE claim
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
    /* THE PREVIEW ONLY (queue 549). Ezra: "when you go to the end of a layer you can't see it anymore…
       even if it wasn't the last thing it should still be visible when you're at the end of it".
       A layer's window is half-open, which is the right convention — and the EXPORTER must keep it, or a
       2s clip lands 61 frames long (an existing test caught exactly that when this nudge lived inside
       renderScene). But the playhead can be PARKED on an exact boundary, and there the alternative is
       staring at an empty canvas. So the nudge is here, on the preview path, and the file is untouched.
       `_endInstantTime` returns t unchanged unless nothing is live at t and something ends exactly
       there — so a cut still shows the incoming clip. */
    FM.renderScene(ctx, FM.scene, FM._endInstantTime ? FM._endInstantTime(FM.scene, FM.time) : FM.time);
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
             renderAvg: _renderAvg, gapAvg: _gapAvg, locked: !!_locked, lockAt: _lockAt, dropFrom: _dropFrom,
             cooldown: _tierCooldown, ctx: _costCtx,
             canvasPx: (typeof canvas !== 'undefined' && canvas) ? canvas.width * canvas.height : 0 };
  };
  // A tier drop has to EARN its place — see the payoff test in notePlaybackCost.
  const DROP_PAYOFF = 0.85;   // a drop must cut the average by 15%+ to be worth the softer picture
  const LOCK_ESCAPE = 1.35;   // once locked, only a cost this much higher re-opens the question
  // How late a frame INTERVAL has to be before it counts as evidence at all: 2.5 display intervals,
  // i.e. a sustained rate under ~24fps. Below that it is jitter, and reacting to jitter softens the
  // preview on machines that are keeping up perfectly well. (queue 125)
  const LATE_FACTOR = 2.5;
  let _dropFrom = 0, _dropPx = 0, _locked = 0, _lockAt = 0, _skipCost = 0, _costCtx = '';
  // The frame INTERVAL average, alongside the JS-time one. See the note in notePlaybackCost: it is
  // the only one of the two that can see GPU filter work or video decode. (queue 125)
  let _gapAvg = 0;
  /* Last playback repaint, for the frame interval above. Cleared on stop so resuming after a pause
     cannot hand the estimator the length of the pause as if it were a frame. */
  let _lastPlayPaint = 0;
  FM._resetPlayPaint = function () { _lastPlayPaint = 0; };
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
    const gap = _mLast ? (now - _mLast) : 0;
    if (now - _mLast > MOTION_GAP) _mFrames = 0;
    _mLast = now;
    _mFrames++;
    if (!_inMotion && _mFrames >= MOTION_FRAMES) { _inMotion = true; resizeCanvas(); }
    /* The gap between CONSECUTIVE renders is a real frame interval and is handed to the ladder as the
     * one signal that can see GPU filter cost — see the long note in notePlaybackCost. Only when the
     * two renders were genuinely back to back: a gap wider than MOTION_GAP means the user paused, and
     * feeding idle time to a cost estimator would read a still hand as a struggling machine. (queue 125) */
    if (_inMotion) notePlaybackCost(ms, (gap > 0 && gap <= MOTION_GAP) ? gap : 0);
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
  /* How long a frame is ALLOWED to take, in the regime we are currently in. Extracted so the suite
     can read the real value instead of re-deriving it — an assertion that recomputes the formula
     agrees with itself no matter what the app does, which is how the first version of this test
     passed against a deliberately broken budget. */
  function costBudgetMs() {
    const projFps = (FM.scene && FM.scene.project && FM.scene.project.fps) || 30;
    return FM.playing ? (1000 / Math.max(1, Math.min(120, projFps))) : (1000 / 60);
  }
  FM._costBudgetMs = costBudgetMs;
  /* The ladder's own input, exposed so the suite can drive it directly (queue 202). Every existing
     test of this ladder checks the BUDGET — what counts as a late frame — and none checks the thing
     Ezra's sample actually questioned: whether it ever STEPS DOWN. Driving real playback to find out
     is slow and flaky (the note on 'playback feeds the ladder a frame interval at all' says so), and
     the production render loop already calls this on every frame, so it is a real seam rather than a
     decoration. */
  FM._notePlaybackCost = notePlaybackCost;

  function notePlaybackCost(ms, gapMs) {
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
    if (ctx !== _costCtx) { _costCtx = ctx; _renderAvg = 0; _gapAvg = 0; _dropFrom = 0; _locked = 0; _lockAt = 0; _noLowerPx = 0; }
    // The frame straight after a tier change repaints into a freshly allocated backing store and is
    // the dearest one in the run. Letting it seed the average makes every drop look like it made
    // things worse — which is exactly the judgement the payoff test below has to get right.
    if (_skipCost) { _skipCost = 0; return; }
    _renderAvg = _renderAvg ? (_renderAvg * 0.8 + ms * 0.2) : ms;
    if (gapMs > 0) _gapAvg = _gapAvg ? (_gapAvg * 0.8 + gapMs * 0.2) : gapMs;
    if (_tierCooldown > 0) { _tierCooldown--; return; }
    /* THE BUDGET DEPENDS ON WHICH REGIME WE ARE IN (queue 202/125, from his first on-device sample).
     * A scrub should repaint every display interval, so 1000/60 is right for it. PLAYBACK should not:
     * a 30fps comp on a 60Hz screen renders every OTHER rAF by design, so a perfectly healthy
     * playback has a 33ms gap between renders. Judging that against the display interval would call
     * flawless playback permanently late — which is exactly why the playback path used to send no
     * gap at all, and why the note there said measuring against the PROJECT frame time was "a
     * separate change and is not this one". This is that change.
     * His measurement is what made it necessary: p95 38ms, worst 494ms, 14 late frames of 446 — and
     * the app's own `avgGapMs` reading ZERO, because playback never fed one. So the ladder sat on
     * tier 0 of 6 in *smooth* mode through half-second freezes, which is the "nothing much ever gets
     * resolved" of #125 with a number attached. */
    const budget = costBudgetMs();
    const before = _playTier;
    /* WHAT A FRAME REALLY COST US — and the reason queue 125 ("major lag with barely any layers")
     * survived three profiling passes that all came back clean.
     *
     * `ms` is the time our JavaScript spent inside render(). It is blind to the two costs most likely
     * to be behind the lag: canvas `filter` effects, which are done by the GPU after we return, and
     * video decode, which happens off-thread. MEASURED: six Gaussian blurs plus six glows on a
     * 1080x1920 comp at 6x CPU throttle reported **1.1 ms a frame**, so `_renderAvg` sat at a tenth of
     * budget, no rung was ever shed, and the app cheerfully reported itself healthy while stuttering.
     * The adaptive quality ladder was inert on exactly the scenes it exists for.
     *
     * The FRAME INTERVAL sees all of it, because a frame that the GPU cannot finish delays the next
     * rAF. But the raw interval is not a cost: a perfectly healthy 60fps frame is 16.7ms apart, almost
     * all of it idle waiting for the display. Subtracting one display interval turns it into "how far
     * we OVERRAN" — zero while we are keeping up, and growing precisely when we are not.
     *
     * Taking the max means every existing behaviour is untouched whenever frames arrive on time, and
     * the payoff test below now judges a drop by the same signal that asked for it. That matters: a
     * GPU-bound drop judged on the JS clock would always read "no improvement" and be undone, which
     * would have made this fix do nothing at all.
     *
     * THE THRESHOLD IS THE WHOLE DIFFICULTY, and the first cut got it wrong in the dangerous
     * direction. Simply taking `gap - budget` as the overrun means a 28.7ms frame — ONE dropped frame,
     * which is ordinary jitter on any machine — already reads as 12ms of overrun and trips the drop.
     * Measured: a single small shape with no effects and no throttle walked down two rungs. An app
     * that softens its own preview for no reason is a worse bug than the lag this is here to fix.
     * So the interval is only admitted as evidence once it is UNAMBIGUOUS: a sustained average below
     * about 24fps, which no amount of vsync jitter produces and which is squarely what "major lag"
     * means. Under that bar the ladder behaves exactly as it always did, on the JS clock alone. */
    const late = _gapAvg > budget * LATE_FACTOR ? Math.max(0, _gapAvg - budget) : 0;
    const cost = Math.max(_renderAvg, late);
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
    if (_locked && cost > _lockAt * LOCK_ESCAPE) _locked = 0;
    /* A probe that did not actually change the rendered resolution proves nothing, so don't judge it
     * — just carry on down the ladder. Ask the CANVAS rather than the tier, because there are two
     * separate ways a tier step can move no pixels at all:
     *   - 'smooth' mode floors the factor at tier 2, so stepping 0→1→2 changes nothing (judging that
     *     read "no gain", undid it, and dead-ended the ladder before it ever reached tier 3);
     *   - previewScale()'s 0.25 floor and MAX_PREVIEW_PX budget can clamp two different factors to
     *     the same backing store on a big comp (a 2048² project clamps every tier below 0.735).
     * The backing-store size is the one thing that is true in both cases. */
    if (_dropFrom && canvas.width * canvas.height === _dropPx) _dropFrom = 0;
    if (_dropFrom && cost > _dropFrom * DROP_PAYOFF) {
      _playTier--; _locked = 1; _lockAt = _dropFrom; _dropFrom = 0;   // didn't pay — undo, and remember the cost at the tier we came BACK to
    } else if (cost > budget * 0.72 && _playTier < PLAY_TIERS.length - 1 && !_locked) {
      /* Step to the next tier that actually MOVES PIXELS, not merely the next tier. The guard above
       * stops a no-op probe being JUDGED; nothing stopped one being MADE, and on a dpr-1 PC
       * previewScale()'s 0.25 floor collapses the bottom of the ladder into one backing store.
       * Measured on a 13-layer 1080×1920 comp at 1280×900 dpr1: tiers 2, 3, 4 and 5 all produced
       * exactly 129,600 px, and the ladder still walked rungs 3/4/5 one at a time — three full
       * resizeCanvas() calls (forced reflow + re-render) and three wipes of the cost average, over
       * 3.1s→6.9s, for zero pixel change. */
      const nt = nextUsefulTier();
      if (nt > _playTier) { _dropFrom = cost; _dropPx = canvas.width * canvas.height; _playTier = nt; }   // struggling → shed pixels, remembering the cost AND the backing store to beat
    } else if (cost < budget * 0.30 && _playTier > 0) {
      _dropFrom = 0; _playTier--;                                     // lots of headroom → give detail back
    } else if (cost <= budget * 0.72) {
      _dropFrom = 0;                                                  // inside budget: the last drop did its job, stop judging it
    }
    // Playback wants a LONG settle — resolution pumping mid-shot is uglier than being one tier low.
    // A drag is short and you're watching position, not detail, so it may find its level quickly.
    if (_playTier !== before) { _tierCooldown = FM.playing ? 24 : 8; _renderAvg = 0; _gapAvg = 0; _skipCost = 1; resizeCanvas(); }
    // `spent` is computed HERE, where the ladder's own state lives, and passed in — so the offer's
    // rule ("the ladder is out of moves and we are still late") can be driven by a test without
    // reaching into module-private tier bookkeeping.
    maybeOfferPerfProbe(cost, budget, _playTier >= PLAY_TIERS.length - 1 || !!_locked);
  }

  /* ═══ OFFER THE MEASUREMENT AT THE MOMENT IT IS TRUE (queue 95, 125, 202, and the unnumbered
   * "editing lags" item — FOUR entries, all stalled on the same missing sentence: "needs a number
   * from HIS phone").
   *
   * `js/perf-probe.js` has existed for a while and is the right tool. Nobody ever ran it, and the
   * reason is plain once you count the taps: it lives inside App settings, which on a phone is the
   * cog → the canvas dialog → "App settings…" → scroll. He would have to go looking for a feature
   * he has no reason to know exists, at a moment when what he actually wants is for the lag to stop.
   * So the discovery problem was never going to be solved by him remembering. The app already knows
   * when it is failing — that is what the quality ladder above is for — so it can ask.
   *
   * THE BAR IS DELIBERATELY HIGH, because a prompt that cries wolf gets dismissed forever after and
   * takes the feature with it (the exporter's own note says the same about its diagnostics):
   *   · PLAYING only. Playback is what he reports; a drag has a different cost regime entirely.
   *   · The ladder must be SPENT — bottom rung, or latched off because it proved resolution is not
   *     the bottleneck. While it still has moves left, the honest answer is "it is handling it".
   *   · Still over budget after that, for ~120 consecutive decisions (a couple of seconds, not a
   *     stutter). One bad frame is jitter; this is the sustained kind he means by "laggy".
   *   · ONCE per page load, ever. */
  const STRUGGLE_HITS = 120;
  let _struggleHits = 0, _perfOffered = 0;
  FM._perfOfferState = function () { return { hits: _struggleHits, offered: !!_perfOffered }; };
  FM._resetPerfOffer = function () { _struggleHits = 0; _perfOffered = 0; };

  function maybeOfferPerfProbe(cost, budget, spent) {
    if (_perfOffered) return;
    /* ⚠️ NOT PLAYING MEANS THE RUN IS BROKEN (queue 492). This used to return WITHOUT clearing the
       count, so "~120 consecutive decisions" was really a running total across separate playbacks,
       drags and pauses. One late frame after an unrelated pause could tip a counter that had been
       sitting at 119 since earlier — the "one bad frame is jitter" case the note above says must not
       trigger it. And because the offer is one-shot per page load, that false alarm spends the only
       one he ever gets. This function is still CALLED while he drags (notePlaybackCost runs for
       motion as well as playback), which is exactly where the stale count used to survive. */
    if (!FM.playing || FM._exporting) { _struggleHits = 0; return; }
    if (!FM.perfProbe || !FM.perfProbe.run || FM.perfProbe.running) return;
    // "the ladder has played every card it has, and it is STILL late"
    if (!(spent && cost > budget)) { _struggleHits = 0; return; }
    if (++_struggleHits < STRUGGLE_HITS) return;
    _perfOffered = 1;
    FM.toast('Playback is struggling — tap to measure what\u2019s slow', 7000, FM.startPerfMeasure);
  }
  FM._maybeOfferPerfProbe = maybeOfferPerfProbe;

  /* Shared by the offer above and by the Measure button in App settings, so there is one definition
   * of what measuring does. It samples while he keeps USING the app — stopping to watch a progress
   * bar would measure the wrong thing. */
  FM.startPerfMeasure = function (ms) {
    if (!FM.perfProbe || !FM.perfProbe.run || FM.perfProbe.running) return false;
    FM.toast('Measuring for ten seconds — keep using the app', 3200);
    return FM.perfProbe.run(ms || 10000, (report) => {
      try { localStorage.setItem('fm.lastPerfReport', report); } catch (e) {}
      /* THE LAST STEP USED TO BE FOUR TAPS, and the reasoning that put it there was half right.
       * It said: copying needs a user gesture and this lands ten seconds after the tap, so an
       * automatic write would fail on iOS exactly when it mattered — true, and why it pointed at the
       * Copy button in App settings instead. But that is cog → canvas dialog → App settings → scroll →
       * Copy, on a phone, for a report the app just asked him to produce, and FIVE entries (95, 125,
       * 148, 202, 387) are waiting on him sending it.
       * **A TAPPABLE toast supplies the gesture.** The tap IS the user activation the clipboard wants,
       * so the write is allowed — and if it is still refused, the old four-tap route is named as the
       * fallback rather than leaving him with a failure. */
      if (FM.toast) FM.toast('Measurement ready — tap to copy it', 9000, () => {
        const say = (m) => { if (FM.toast) FM.toast(m, 4000); };
        try {
          navigator.clipboard.writeText(report).then(
            () => say('Copied — paste it to me'),
            () => say('Could not copy here — Settings ▸ App settings ▸ What\u2019s slow ▸ Copy'));
        } catch (e) {
          say('Could not copy here — Settings ▸ App settings ▸ What\u2019s slow ▸ Copy');
        }
      });
    });
  };
  FM.playbackQualityInfo = function () {
    // `factor` is the tier's own value; `effective` is what previewScale() actually applies — the two
    // differ in 'smooth' (floored at tier 2) and 'detail' (always 1), and it was reading the tier
    // instead of the effective factor that hid a dead-ended ladder in smooth mode.
    return { tier: _playTier, factor: PLAY_TIERS[_playTier], effective: playQualityFactor(),
      avgFrameMs: +_renderAvg.toFixed(2), avgGapMs: +_gapAvg.toFixed(2), inMotion: _inMotion, mode: (FM.settings && FM.settings.get('playbackQuality')) || 'auto',
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
  /* 1.5 -> 1.25 (27 Aug). MEASURED, and shown to Ezra as a picture before it moved — the standing rule
   * for a visual change. The margin costs the SQUARE of itself in pixels, so 1.5 was rendering 2.23x the
   * pixels the screen can show and every one of the 198 effects paid for all of them. On the real
   * phone-width layout (wrap 249 CSS px, dpr 2, a 1080x1350 project) one kaleidoscope pass measured:
   *     1.5  -> 747x934  29.0 ms          1.25 -> 598x747  16.5 ms          1.0 -> 498x623  11.7 ms
   * ⚠️ Those are KERNEL-ONLY figures and they overstate it. Through the REAL render path, interleaved and
   * warmed, the canvas went 745x931 -> 626x783 (scale 0.69 -> 0.58) and kaleidoscope 57.6 -> 38.6 ms:
   * **1.49x, not 1.76x.** It tracks the pixel ratio of 1.42 almost exactly, which is what makes it
   * believable. Quote 1.49x. (Control drifted to 0.886 on that run — the win clears it comfortably, but
   * it is not a clean 1.000.)
   * 1.0 was rendered side by side at real size and at 2x and REJECTED — visibly rougher strokes with
   * colour fringing on fine text. At 1.25 the difference is not findable at real viewing size.
   * ⚠️ This is a QUALITY TRADE, not a free win: it is preview only (export is untouched), and anyone who
   * wants the old never-below-project sharpness still has playbackQuality 'detail'. If a future report
   * says the preview looks soft, THIS IS THE FIRST THING TO PUT BACK. */
  const PREVIEW_SS = 1.25;
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
      /* THE STAGE'S OWN SIZE IS PART OF THE KEY (BUG-HUNT: "Zoomed preview renders stretched/wrong-aspect
         after any stage resize"). Without it a pure resize — drag the timeline splitter, rotate the
         phone — produces the same crop rect and the same zoom, so this early-returns and the canvas keeps
         the box it was measured into. In the zoomed branch the wrap is pinned to hard pixels, which
         overrides its `aspect-ratio`, so it cannot self-correct either: a 1:1 circle was measured
         rendering as a 2.13x-wide ellipse. */
      const st = document.getElementById('stage');
      const sr = st ? st.getBoundingClientRect() : null;
      const stageKey = sr ? ('|' + Math.round(sr.width) + 'x' + Math.round(sr.height)) : '';
      const key = (c ? ('c' + c.u0.toFixed(3) + ',' + c.v0.toFixed(3) + ',' + c.u1.toFixed(3) + ',' + c.v1.toFixed(3)) : ('f' + previewScale().toFixed(2))) + stageKey;
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
    /* …and KEEP the gesture hint on it (queue 536 clause 1). This line runs on every readout update and
       was silently overwriting the title set at init, so the pill's own tooltip advertised the project
       stats and nothing else — the tap, the double-click and the hold were all undiscoverable from the
       control that carries them. Measured: after one refresh the title read "1 layer · total 0:06".
       The stats stay (they are useful and he can see them nowhere else); the gestures are appended. */
    readoutEl.title = FM.scene.layers.length + (FM.scene.layers.length === 1 ? ' layer · ' : ' layers · ') + 'total ' + mm + ':' + String(ss).padStart(2, '0')
      + '\nTap: play / pause · double-click: type a time · hold: loop playback on/off';
    // Parked on a benchmark? Light the timecode chip in marker yellow. A phone has no hover, so
    // this is the half that actually reports "you are ON a marker" on device. (#61)
    const mks = FM.scene.project.markers || [], halfF = 0.5 / f;
    const onMark = mks.some(mk => Math.abs(mk.t - FM.time) <= halfF);
    readoutEl.classList.toggle('on-mark', onMark);
    /* …and the PLAYHEAD's head goes yellow with it (queue 364, towards clause 2). The head is where you
       tap to add or remove a bookmark now, so it has to say which of the two your tap will do. */
    const _cl = document.getElementById('tl-centerline');
    if (_cl) _cl.classList.toggle('on-mark', onMark);
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
  /* ═══ EVERY DISPLAY OF THE RATE FOLLOWS THE WRITER (queue 622) ═══════════════════════════════════
   * Ezra: *"When you use these buttons to change the speed by holding on the jump buttons to change
   * them, it doesn't live update the view settings tab to reflect what speed u have it at"*.
   * He was looking at a rail reading 1× while he changed the speed with the transport.
   * THE CAUSE IS NOT A MATHS BUG AND NOT A MISSING CALL — it is that there are THREE displays of one
   * value (`#rate-chip`, `#preview-rate`, `#vb-ratelabel`) and TWO writers, and each writer hand-patched
   * a DIFFERENT SUBSET of them: the transport's stepRate refreshed the chip and the select and never
   * the view rail; the view bar's stepViewRate patched the chip inline. Fixing the one wiring he
   * noticed would have left the next writer free to forget again — and a third display, or a third
   * writer, is one feature away.
   * So the WRITER notifies. Anything that paints the rate subscribes once and can never fall behind,
   * whoever changed it and from where. This is the "make it structural, not remembered" rule applied
   * to a UI binding: there is now no way to change the rate without every display hearing about it. */
  FM._rateWatchers = [];
  FM.onPreviewRate = function (fn) {
    if (typeof fn === 'function' && FM._rateWatchers.indexOf(fn) < 0) FM._rateWatchers.push(fn);
  };
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
    /* The <select> is a display like any other, so it is driven from here rather than patched by each
       caller — two of them were already doing it by hand, which is the same duplication in miniature. */
    const _prSel = document.getElementById('preview-rate');
    if (_prSel && _prSel.value !== String(FM.previewRate)) _prSel.value = String(FM.previewRate);
    /* One bad subscriber must not stop the others repainting — a half-updated UI is the bug this
       whole mechanism exists to remove. */
    for (let i = 0; i < FM._rateWatchers.length; i++) {
      try { FM._rateWatchers[i](FM.previewRate); } catch (e) { console.warn('rate watcher failed', e); }
    }
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
  /* ═══ A GROUP FOLLOWS ITS CONTENTS WHEN THEY ARE RE-TIMED (queue 626) ════════════════════════════
   * Ezra: *"even tho every clip ends at the end and I sped them up the same amount so they all end at
   * the same time, the end of the clip is blank. Makes no sense unless something in the ground
   * mechanics is broken."* He was right that it is mechanical.
   * MEASURED (tests/_626group.html): two clips in a group, both set to 1.7x. The children shrink
   * 2.000 → 1.176 and **the group stays at 2.000**, leaving an 0.824s empty tail INSIDE it. Bright
   * pixels went 5184 at t=0.20 to **0 at t=1.95** — black, exactly as he photographed. The project
   * stays long because `autoFitDuration` measures the GROUP's end, not its contents'.
   * A group's span IS its members' span — `groupSelection` defines it that way at creation
   * (start = min member start, duration = end − start). It was simply never recomputed afterwards.
   *
   * ⚠️ WHY THIS IS NOT DONE INSIDE autoFitDuration, tempting as that was. That runs on EVERY rebuild,
   * and a group can be TRIMMED like any other clip — the grips carry no type guard. Refitting on every
   * rebuild would silently undo a deliberate trim, which is a worse bug than the one being fixed and
   * would be very hard to attribute. So it is called from the RE-TIME sites only: the contents changing
   * under you is the one moment the group's length is stale through no choice of yours.
   * ⚠️ START IS LEFT ALONE. Speeding up shortens from the END; moving `start` would shift the group and
   * everything parented to it, for no reason this entry asked for. */
  FM.refitGroupsFor = function (layer) {
    if (!layer || !FM.scene || !FM.scene.layers) return;
    const L = FM.scene.layers;
    const byId = new Map(L.map(l => [l.id, l]));
    // Walk UP from the changed layer, innermost group first, so a nested group settles before its
    // parent measures it.
    let pid = layer.parent, hops = 0;
    while (pid && hops++ < 64) {
      const g = byId.get(pid);
      if (!g) break;
      if (g.type === 'group') {
        const kids = L.filter(k => k.parent === g.id);
        // An EMPTY group keeps whatever span it has — collapsing it to nothing would make a row he can
        // still see disappear, which is not what a re-time asked for.
        if (kids.length) {
          const end = Math.max.apply(null, kids.map(k => (k.start || 0) + (k.duration || 0)));
          const nd = Math.max(0.1, Math.round((end - (g.start || 0)) * 1000) / 1000);
          if (Math.abs((g.duration || 0) - nd) > 1e-4) g.duration = nd;
        }
      }
      pid = g.parent;
    }
  };

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
    /* SECOND CHOKE POINT FOR QUEUE 523, and it is needed: `FM.selectLayer` is the named API, but every
       layer CREATOR (addCamera, addAdjustmentLayer and a dozen more) writes `FM.scene.selectedId`
       directly and then calls this. Hooking only selectLayer would leave the editor stranded whenever a
       new layer was made while it was open. No argument here — the assignment has already happened, so
       it reads the live selection. */
    if (FM.textEdit && FM.textEdit.syncToSelection) FM.textEdit.syncToSelection();
    FM.inspector.refresh();
    /* …and re-dock the phone's option sheet (queue 531). Same reasoning as the line above, and the same
       root cause: every layer CREATOR writes scene.selectedId directly and lands here, never going
       through FM.selectLayer where the dock used to be wired — so a freshly added layer opened its panel
       at whatever top the previous dock left and never re-measured. rAF because the row it measures has
       to be laid out first; the dock self-guards on phone + m-editing. */
    if (FM._dockSheet) requestAnimationFrame(FM._dockSheet);
    FM.timeline.rebuild();
    updateDropHint();
    updateReadout();
    render();
    syncTopBar();
    FM.syncSelectionChrome();
    // PC: build the one-row transport once, then keep its selection-dependent buttons honest (queue 168)
    if (FM.pcTransportLayout) { FM.pcTransportLayout(); FM.pcTransportSync(); }
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
  /* ═══ THE WHITE-CHROME LOOK, AND ITS OFF SWITCH (queue 501 + 503).
     Ezra asked for the add-row switch to be white at rest (501) and for the play button to lose its blue
     fill and wear a white outline (503) — in his words, "to hopefully make that row of buttons look more
     coherent". He also said, in the same breath: "But I may want to undo this so make sure you have a
     way to quickly un do if I decide to."
     So both changes are gated on ONE body class, set from the single constant below. Every rule for the
     new look is written under `body.white-chrome` in styles.css and nothing else changes behaviour —
     flip this to `false` and the row is exactly what it was, in one line and one release. */
  const WHITE_CHROME = true;
  try { document.body.classList.toggle('white-chrome', WHITE_CHROME); } catch (e) {}
  FM._whiteChrome = WHITE_CHROME;   // read by the suite

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
    /* "4 selected", not "4 layers selected", and it is a measurement rather than a style preference
       (queue 436). The phone header is a flex row where this label is the only `flex: 1` item, so it
       pays for every button beside it. Adding the masking-group twin he asked for costs 46px, and at
       380px that leaves this ~88px — "4 layers selected" measured 136.5px and would have truncated
       mid-word. The desktop is untouched: it has room, and the longer phrase reads better there. */
    if (cnt) cnt.textContent = phone ? (n + ' selected') : (n + (n === 1 ? ' layer selected' : ' layers selected'));
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
    /* AND IT HAS TO LOOK LIKE AUDIO (queue 70). Ezra: "it doesn't show it like an audio file, with the
     * bumps to volume or whatever it's called" — i.e. a waveform.
     * The twin is a copy of the VIDEO layer, so the timeline saw a video that has a picture and drew it
     * a filmstrip: a strip of invisible frames, identical to the original it was extracted from, with
     * nothing to say it is the sound. The waveform path already exists and is thorough (it honours
     * trim, speed and reverse) — it was simply only reachable by a video that has no picture at all.
     * This flag says "treat me as audio", which is what the layer actually is. */
    dup.audioOnly = true;
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
    // Follows the label (queue 368): this names the feature in prose, so leaving it as "Edit points"
    // would send you looking for a button that no longer exists under that name.
    if (FM.toast) FM.toast('Converted to outline — Customise Points to reshape it');
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
    /* THE ONE NAME FIELD ON DESKTOP (v7.80, queue 231). Ezra: "when you click on a layer, it goes from
     * showing the name of the project to showing the name of the layer, and you can then edit the
     * layers name. I think that'd be a lot cleaner and make a lot more sense."
     * The note this replaces argued the opposite — that a field which silently changed meaning with the
     * selection would be a trap, "especially where it sits: directly above a panel that is all about the
     * selected layer". He has looked at both and disagreed, and on reflection the panel below is the
     * argument FOR it rather than against: everything under this header is already about the selected
     * layer, so its name belongs at the top of that, and the label says which it is. */
    const pns = document.getElementById('proj-name-s');
    if (pns && document.activeElement !== pns) {
      pns.value = sel ? (sel.name || '') : (FM.scene.project.name || 'Untitled');
      pns.title = sel ? 'Layer name' : 'Project name';
      pns.setAttribute('aria-label', pns.title);
    }
    const pnsLbl = document.querySelector('#inspector-panel .panel-title-label');
    if (pnsLbl) pnsLbl.textContent = sel ? 'Layer' : 'Inspector';
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
    const nSel = (FM.selectionIds ? FM.selectionIds().length : 0);
    if (grpBtn) grpBtn.style.display = nSel >= 2 ? '' : 'none';
    /* …and its new twin travels with it (queue 376). ONE writer for both, here, because this function is
       already the single owner of the group button's visibility — the note above says so, and a second
       writer is how two authorities end up disagreeing about whether a control is on screen. */
    const mgBtn = document.getElementById('btn-maskgroup');
    if (mgBtn) mgBtn.style.display = nSel >= 2 ? '' : 'none';
    // …and the two that moved into the transport row beside it (queue 168). Here rather than only in
    // refreshAll, because this is the function that runs whenever the selection chrome changes — and
    // BUILD from here too (it is idempotent), so the row is assembled by the first chrome sync rather
    // than waiting for a full refreshAll that some paths never make.
    if (FM.pcTransportLayout) FM.pcTransportLayout();
    if (FM.pcTransportSync) FM.pcTransportSync();
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
  /* HOW LONG THE SOURCE REALLY IS, and whether a given moment is past it — ONE answer, two readers.
   *
   * A clip can outlive the file behind it: a speed ramp, a trim, or simply a layer longer than its
   * media leaves an overhang where the timeline still has clip but the source has run out. Playing an
   * element that has already ended does not sit still — it REWINDS and plays from the beginning, which
   * is the "the audio restarts from the start" report.
   * syncMediaToClock has refused to resume past this point for a while. FM.play() never did: it seeks
   * and calls play() unconditionally, so pressing Play inside the overhang restarted the sound, and the
   * tick could not correct it afterwards because the element was then playing rather than paused.
   * That is one rule written down in one place and missing from the other — the same shape as the
   * timeline-origin bug that had to be fixed twice. So it lives here now and both paths read it.
   *
   * TAKE WHICHEVER LENGTH IS LONGER. The element believes its container header, which routinely
   * undersells the file — a song claiming 11.21s that really runs 26.38s had everything past 11.21s
   * treated as "off the end", and even a well-formed control disagreed by 60ms, giving every import a
   * small dead tail. The decoded figure wins where we have one; the header is only a fallback. */
  FM.sourceEnd = function (m) {
    const elEnd = (m && m.el && isFinite(m.el.duration) && m.el.duration > 0) ? m.el.duration : 0;
    const decEnd = (m && isFinite(m.duration) && m.duration > 0) ? m.duration : 0;
    return Math.max(elEnd, decEnd) || Infinity;
  };
  FM.pastSourceEnd = function (m, local) { return local != null && local >= FM.sourceEnd(m); };

  FM.seekVideosToTime = function () {
    FM.scene.layers.forEach(layer => {
      if (layer.type !== 'video') return;
      const m = FM.media.get(layer.id);
      /* `m.el`, NOT JUST `m`. A record can outlive its element — js/media.js's release() drops the
         element while another layer still shares the record, and an import has a record before it has
         a decoded video — and `m.el.currentTime` below then throws. It threw INSIDE a forEach, so it
         did not just skip one layer: it took the whole seek pass down and the `render()` after it never
         ran, freezing the canvas. Found when queue 303 turned the effects sheet's 24fps preview loop on
         at desktop widths and every setTime went through here; the same crash was reachable before that
         and stopPreview already carries a comment about it happening. */
      if (!m || !m.el) return;
      if (FM.seekBusy && FM.seekBusy(m)) return;   // a frame-cache build owns this element's seeks (see FM.seekBusy)
      if (layer.reversed && m.frameCache) return; // the cache renders this synchronously
      const local = FM.layerLocalTime(layer, FM.time);
      if (local == null) return;
      const target = Math.min(Math.max(local, 0), Math.max(0, (m.duration || 0) - 0.001));
      /* DON'T RE-SEEK TO WHERE WE ALREADY ARE (queue 125). This write was unconditional, and writing
       * currentTime restarts the element's seek algorithm — which means CANCELLING a decode that was
       * already in flight. It matters because scrubTime snaps to the frame grid first, so a slow
       * finger produces many animation frames that all resolve to the SAME time, and every one of them
       * re-issued an identical seek. The decoder was therefore being interrupted and restarted for a
       * frame it was already fetching, over and over, for no picture change at all: a no-op seek emits
       * no 'seeked' either (js/media.js:125), so it does not even repaint.
       * The exporter has had exactly this guard since #15 (js/exporter.js) — the preview never did.
       * Half a frame at 30fps, so a genuine step to the next frame always passes. */
      const cur = m.el.currentTime || 0;
      if (Math.abs(cur - target) < (0.5 / (FM.scene.project.fps || 30))) return;
      try { m.el.currentTime = target; } catch (e) {}
    });
  };

  // Small status toast. AUTO-HIDES by default (omitting ms used to mean sticky — which left every
  // duration-less caller, e.g. "Grouped 3 layers", on screen forever). Pass ms=0 for a sticky
  // progress toast paired with FM.hideToast(). The seq guard stops an old timer from hiding a newer toast.
  let toastSeq = 0;
  /* ---------- "you are looking at an old build, and here is why" (queue 306) --------------------
   * His report, for weeks: *"an older version of our project shows up when you refresh"*, *"The glitch
   * that shows the old version of FreeMotion that has a more alight motion look STILL shows up when I
   * press refresh… it's such a big issue, PLEASE"*. It has never been reproduced on this machine, and
   * the one path that fits the WHOLE description is the service worker answering a failed navigation
   * from cache: the stale index.html names old `?v=` script urls, which the worker then serves
   * cache-first, so you get a complete older build rather than a slightly-off page.
   *
   * The reason it has survived this long is that it is SILENT. So sw.js now leaves a note when it does
   * it, and this reads the note. One look at his own phone then settles what no amount of guessing here
   * has: if this message appears, that was the cause; if the glitch happens and this never appears, the
   * service worker is exonerated and the search moves on. Either answer is worth more than another
   * theory.
   *
   * Split from the reading so the wording is testable without a live service worker — installing one in
   * the suite is exactly the thing the last two sessions could not get to work, and a warning nobody
   * can test is a warning that will be broken on the day it is needed. `null` in, `null` out: no note,
   * no message, and the caller does nothing.
   */
  FM.staleShellNotice = function (ver) {
    if (!ver) return null;
    const which = (/^v\d/.test(ver)) ? ver : 'an older build';
    return 'Your connection dropped on refresh, so FreeMotion loaded ' + which +
           ' from its offline copy — that is why it looks old. Tap the version chip to get the latest.';
  };
  FM.checkStaleShell = function () {
    if (!window.caches || !navigator.serviceWorker) return Promise.resolve(null);
    return caches.open('freemotion-v1')
      .then(c => c.match('served-stale-shell').then(r => r ? r.text().then(t => ({ c: c, v: t })) : null))
      .then(hit => {
        if (!hit) return null;
        // Clear it first: the note describes THIS load, and one left behind would cry wolf on the next.
        try { hit.c.delete('served-stale-shell'); } catch (_) {}
        const msg = FM.staleShellNotice(hit.v);
        if (msg && FM.toast) FM.toast(msg, 9000);
        return msg;
      })
      .catch(() => null);
  };

  /* The optional THIRD argument makes a toast tappable. Added for the "playback is struggling"
   * offer (queue 95/125/202): the app knows the moment it is failing, and that is the only moment
   * asking him to measure is any use — a minute later he has moved on. Strictly additive, because
   * 244 call sites pass two arguments and none of them may change behaviour. */
  FM.toast = function (msg, ms, onTap) {
    const t = document.getElementById('toast'); if (!t) return;
    t.textContent = msg;
    t.onclick = null; t.onkeydown = null; t.classList.remove('toast-tap'); t.removeAttribute('role'); t.removeAttribute('tabindex');
    if (typeof onTap === 'function') {
      t.classList.add('toast-tap');
      t.setAttribute('role', 'button'); t.setAttribute('tabindex', '0');
      const fire = function () { FM.hideToast(); try { onTap(); } catch (e) {} };
      t.onclick = fire;
      /* ⚠️ role="button" DOES NOT MAKE ENTER AND SPACE WORK (queue 496). Only a real <button> gets that
         for free; this is a div, so it announced itself as a button, accepted focus, and then did
         nothing at all when pressed. The offers it carries are the two most valuable taps in the app —
         "tap to measure what's slow" and "tap to fix the lag" — so on a keyboard or a switch they were
         simply unreachable. Space is prevented as well as handled, or the page scrolls underneath. */
      t.onkeydown = function (e) {
        const k = e.key;
        if (k === 'Enter' || k === ' ' || k === 'Spacebar') { e.preventDefault(); fire(); }
        else if (k === 'Escape' || k === 'Esc') { e.preventDefault(); FM.hideToast(); }
      };
    }
    t.classList.remove('hidden');
    const my = ++toastSeq;
    if (ms === undefined) ms = 2200;
    /* …and it must not vanish out from under someone who is on their way to pressing it. Nine seconds
       is generous for a tap and short for a switch device, so while the toast HAS FOCUS the countdown
       waits. Escape (above) and Tab are the ways out. */
    if (ms) {
      const expire = function () {
        if (my !== toastSeq) return;
        if (t.getAttribute('role') === 'button' && document.activeElement === t) { setTimeout(expire, 1000); return; }
        FM.hideToast();
      };
      setTimeout(expire, ms);
    }
  };
  FM.hideToast = function () {
    const t = document.getElementById('toast');
    if (t) { t.classList.add('hidden'); t.onclick = null; t.onkeydown = null; t.classList.remove('toast-tap'); }
  };

  // Benchmarks = timeline markers. Tap the timecode to drop one at the playhead (tap again to remove it).
  // The skip buttons jump between these (and the selected clip's edges).
  /* Exposed for the timeline's own "Add marker here" (context menu), which adds to the same array from
     another module and had the identical omission (queue 243). */
  FM.updateReadout = () => updateReadout();
  FM.toggleMarkerAtPlayhead = function () {
    const P = FM.scene.project; if (!P.markers) P.markers = [];
    const t = FM.time;
    // "already here?" = SAME FRAME only (was 0.12s ≈ 3-4 frames — adding a benchmark on the very
    // next frame used to delete the previous one instead)
    const near = P.markers.find(m => !m.thumb && Math.abs(m.t - t) < 0.5 / (P.fps || 30));   // never let a benchmark tap eat the thumbnail-frame marker (they can share a frame)
    if (near) { P.markers = P.markers.filter(m => m !== near); if (FM.toast) FM.toast('Benchmark removed', 1000); }
    else { P.markers.push({ t: FM.snapFrame(t), label: 'Benchmark' }); if (FM.toast) FM.toast('Benchmark added', 1000); }   // markers live on exact frames
    if (FM.timeline) FM.timeline.rebuild();
    /* RE-DERIVE THE CHIP (queue 243). Ezra: "when you add a benchmark it doesnt show up as yellow,
     * youve made it so if you add a bench mark, go away from it then go back itll show the timer as
     * yellow but it should also show up straight away."
     * He read the behaviour exactly right. `on-mark` is decided inside updateReadout, which runs on
     * TIME changes — and adding a benchmark does not change the time, it changes the markers. So the
     * state was correct and simply never recomputed: you were already standing on the thing that should
     * have lit, and scrubbing away and back was the only way to make the app look again.
     * Marker changes are a second input to that class, so they have to poke it too. */
    updateReadout();
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
    updateReadout();   // same reason as the benchmark toggle above (queue 243)
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
  /* SYNC_WARMUP 0.25s of the element's OWN time before the latency estimate is seeded (queue 148).
   * An element that has just been told to play has not reached its steady output latency yet, and the
   * bias was seeded from the first sample regardless. Measured on a real import: the seed lands at
   * 48ms while the true settled latency is ~87ms, and the ~1.7s EMA only creeps to 51.6ms by 850ms —
   * so the controller sees a phantom ~37ms of error, decides the sound is running late, and leans on
   * the throttle. That is the "+9.6% over four audible steps at the start" this entry recorded as
   * noted-but-not-fixed: EVERY press of play began roughly a semitone sharp and slid back.
   * Measured settling from ~230ms, so a quarter-second of the element's own progress is the gate.
   * It is the element's clock, not the wall clock, deliberately: a stalled element must not warm up
   * on time it never played. */
  const SYNC_WARMUP = 0.25;
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
  /* DE-CLICK THE EDGES (queue 148) -----------------------------------------------------------------
   * Ezra: "the audio i import is making a realy scratchy popping noise that hurts my ears."
   * Measured (tests/_pops.html) that the sync controller is NOT the cause — under real load it makes
   * zero seeks and zero trims. What it did not test, because six seconds of continuous playback never
   * crosses one, is a clip BOUNDARY: the element was paused and resumed with no ramp at all, cutting
   * the waveform dead at whatever sample it happened to be on. That is the textbook way to make a
   * click, and a loop crosses one every lap.
   *
   * ANTICIPATORY, not a fade-on-pause. Easing down only once the boundary has arrived would bleed the
   * source audio past the end of the clip — which is exactly what #1/#8 fixed and what the comment on
   * the pause line defends. So the envelope is computed from the transport clock and reaches zero AT
   * the boundary, not after it.
   *
   * 45ms because it has to survive coarse sampling: this is evaluated once per sync tick, and under
   * the load in that same measurement the ticks were 100ms apart. A 5ms ramp — enough in a sample-
   * accurate graph — would be stepped straight over and do nothing at all on exactly the struggling
   * machine that needs it. 45ms is inaudible as a fade and cannot be skipped.
   *
   * It MULTIPLIES the user's own fades rather than replacing them, so a clip that already fades out
   * over a second is unaffected: it is at zero long before this envelope starts. */
  const DECLICK_S = 0.045;
  /* …EXCEPT AT A SEAM (bug hunt, 21 Aug). The two halves of a split are the same continuous audio butted
   * together, so there is no discontinuity to protect against — but each half applied its own 45ms ramp
   * to its own new edge, and the two met as a V-shaped duck to COMPLETE SILENCE about 90ms wide, right at
   * the cut. Measured (tests/_splitdeclick.html): a flat 1.00 across the same window before the split,
   * and 1.00 → 0.00 → 1.00 after it. Preview only — the export does not build the envelope this way —
   * which is worse rather than better, because it makes the render sound different from the edit.
   * Only an edge that actually TOUCHES a sibling half is exempt, so dragging the halves apart brings the
   * de-click straight back. Gated on `splitOf`: a clip that was never split never scans. */
  function seamAt(layer, edgeT) {
    if (!layer.splitOf || !FM.scene) return false;
    const ls = FM.scene.layers;
    for (let i = 0; i < ls.length; i++) {
      const l = ls[i];
      if (l === layer || l.splitOf !== layer.splitOf) continue;
      if (Math.abs((l.start || 0) - edgeT) < 1e-3) return true;                        // a sibling starts here
      if (Math.abs((l.start || 0) + (l.duration || 0) - edgeT) < 1e-3) return true;    // …or ends here
    }
    return false;
  }
  function declickGain(layer, t, m, now) {
    let k = 1;
    const into = t - layer.start;
    const left = (layer.start + layer.duration) - t;
    if (into < DECLICK_S && !seamAt(layer, layer.start)) k = Math.min(k, Math.max(0, into) / DECLICK_S);
    if (left < DECLICK_S && !seamAt(layer, layer.start + layer.duration)) k = Math.min(k, Math.max(0, left) / DECLICK_S);
    /* …and the same courtesy when playback STARTS mid-clip, which the clip-relative terms above cannot
     * see. Scrubbing into the middle of a song and pressing play used to open the element at full
     * volume on an arbitrary sample — the same click, in the one place you notice it most. */
    if (m && m._resumedAt) {
      const since = (now - m._resumedAt) / 1000;
      if (since < DECLICK_S) k = Math.min(k, Math.max(0, since) / DECLICK_S);
      else m._resumedAt = 0;
    }
    return Math.max(0, Math.min(1, k));
  }
  FM._declickGain = declickGain;   // exposed for the suite

  /* `rateWrites` and `errs` are what queue 148 turned on, and they are not the same as `trims`.
   * A trim is a DECISION; a write is what the element actually hears, and `preservesPitch` makes a
   * write a PITCH change — 85 writes in four seconds is the scratchy warble he reported, and the
   * decision count did not show it. `errs` holds |sync error| samples so the report can give a
   * median rather than a worst case, which is the number that says whether sync is the problem at
   * all. Both are read by js/perf-probe.js, so his own device can answer the question this entry
   * has been asking his ears. */
  FM.playbackStats = { syncs: 0, renders: 0, drops: 0, seeks: 0, trims: 0, rateWrites: 0, errs: [], errT: [] };
  /* THE COLLECTOR ITSELF, as a function rather than three lines inside the sync tick (queue 491) — so
     the suite can drive the real thing. A test that pushes into the array with its own copy of this
     logic proves only that its own copy works: the first version of the 491 test did exactly that, and
     a mutation restoring the old first-600 cap sailed through it. */
  const ERR_KEEP = 600;
  /* One step of the sync loop's bias tracking, as a function so the suite can drive the real thing
     across a seek (queue 493). `fresh` says the bias was just learned from this very sample, which
     makes the de-biased error exactly zero — a fact about the arithmetic, not about the audio. */
  FM._syncBiasStep = function (m, rawErr) {
    const fresh = (m._errBias == null || !isFinite(m._errBias));
    if (fresh) m._errBias = rawErr;
    else m._errBias += (rawErr - m._errBias) * ERR_BIAS_ALPHA;
    return { deBiased: rawErr - m._errBias, fresh: fresh };
  };
  FM._noteSyncError = function (v, now) {
    const p = FM.playbackStats; if (!p) return;
    const es = p.errs || (p.errs = []), et = p.errT || (p.errT = []);
    es.push(v); et.push(now);
    if (es.length > ERR_KEEP) { es.shift(); et.shift(); }
  };

  // Jump the playhead to t and resync video/audio (used by loop + loop-region wrap).
  function wrapTo(t) {
    FM.time = t;
    const now = performance.now();
    FM.scene.layers.forEach(layer => {
      if (layer.type !== 'video') return;
      const m = FM.media.get(layer.id); if (!m) return;
      const local = FM.layerLocalTime(layer, t);
      if (!layer.reversed && local != null && !(FM.seekBusy && FM.seekBusy(m))) { try { m.el.currentTime = local; m._syncAt = now; } catch (e) {} }
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
  /* Exposed for the suite (queue 96): the resume gate is the thing under test, and driving it through
     a real play() would now be defeated by the start-wait added in queue 95 — a fake element that never
     advances is exactly what that wait is for, so the tick would never reach here. */
  FM._syncMediaToClock = function () { return syncMediaToClock(); };
  function syncMediaToClock() {
    FM.playbackStats.syncs++;
    const now = performance.now();
    // Reversed clips with a frame cache render from it (smooth). Without a cache, fall
    // back to per-frame seeking (works, just choppy).
    FM.scene.layers.forEach(layer => {
      if (layer.type !== 'video') return;
      const m = FM.media.get(layer.id);
      if (!m || !m.el) return;
      /* STAND DOWN WHILE A BUILD OWNS THE ELEMENT. This runs every animation frame and writes
         currentTime on three paths below (the reversed seek, the forward resume that also calls
         play(), and the drift correction) — all of them on the very element buildFrameCache is
         stepping. Pausing and muting matches what the builder itself does, so nothing is left
         audible; the picture holds on the build's frames for the second or two it takes. */
      if (FM.seekBusy && FM.seekBusy(m)) { try { if (!m.el.paused) m.el.pause(); m.el.muted = true; } catch (e) {} return; }
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
            /* THE SOURCE'S REAL LENGTH, NOT THE ELEMENT'S CLAIM (queue 96). Ezra: "adding a SONG is
             * really buggy and sometimes will not play at all, as the only clip."
             * FM.loadVideoFile deliberately trusts a decode over the container header (js/media.js,
             * from queue 72), because plenty of files lie about their length — so `m.duration` is the
             * song's TRUE length and the layer is built from it. But this gate asked the ELEMENT, which
             * still believes the header. For a file claiming 11.21s that really runs 26.38s, everything
             * past 11.21s was treated as "off the end of the source": the element was muted and left
             * paused for the rest of the clip while the playhead ran on. The song stopped and the
             * transport carried on without it — measured, exactly that file plays only its first 11s.
             * It is not only broken files, either: a well-formed control still disagreed by 60ms
             * (26.383625 decoded against 26.323125 claimed), so EVERY song import had a small dead tail
             * at the end. The mechanism is general; only its size varies.
             * Take whichever is longer. The element's figure is only trusted when we have nothing
             * better, and a source is never cut short by a container that undersold it. */
            if (FM.pastSourceEnd(m, local)) { try { m.el.muted = true; } catch (e) {} return; }   // see FM.sourceEnd
            // Open SILENT and let declickGain bring it up: play() on an arbitrary sample at full volume
            // is the same click as pausing on one, and this is the path a loop takes every lap. (#148)
            try { m.el.volume = 0; } catch (e) {}
            m._resumedAt = now;
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
            /* DON'T LEARN THE LATENCY UNTIL THE ELEMENT IS ACTUALLY RUNNING (queue 148). See
               SYNC_WARMUP: seeding from a spin-up sample teaches the controller a latency that is too
               small, and everything after it reads as the sound being late. Skipping the correction
               for a quarter-second of the element's own playback costs nothing — real drift needs far
               longer than that to become audible — and removes a pitch ramp on every single play. */
            const ct = m.el.currentTime || 0;
            if (m._warmCt == null) m._warmCt = ct;
            if (ct - m._warmCt < SYNC_WARMUP) {
              /* Note the base but correct NOTHING. Deliberately not a `return`: the volume/fade
                 reconcile below runs every tick, and skipping it here would freeze a fade for the
                 first quarter-second of every clip — trading an audible pitch ramp for an audible
                 volume one. */
              m._baseRate = base;
            } else {
            /* ⚠️ TAKE THE DE-BIASED ERROR BEFORE A SEEK THROWS THE BIAS AWAY (queue 493). The recorded
               sample used to be computed at the BOTTOM of this block as `rawErr - m._errBias` — and on
               a seek tick the seek has already set `_errBias = null` a few lines below, so that
               subtraction is `rawErr - 0` and what got stored was the RAW error, output latency and
               all. That is the very constant v11.70 identified and removed, put straight back into the
               "worst" figure the report prints. Computed once, here, from the bias the controller is
               actually acting on. */
            const step = FM._syncBiasStep(m, rawErr);
            const plan = FM.mediaSyncPlan(step.deBiased, base, m._syncAt == null ? Infinity : now - m._syncAt);
            if (plan.action === 'seek') {
              m.el.currentTime = local; m._syncAt = now; FM.playbackStats.seeks++;
              m._errBias = null;   // the offset we learned belonged to the old position
            } else if (plan.action === 'trim') FM.playbackStats.trims++;
            const baseMoved = Math.abs((m._baseRate == null ? base : m._baseRate) - base) > 1e-4;
            m._baseRate = base;
            if (Math.abs((m.el.playbackRate || 1) - plan.rate) > 1e-4 &&
                (baseMoved || plan.action === 'seek' || now - (m._rateAt || 0) >= RATE_WRITE_GAP)) {
              m.el.playbackRate = plan.rate; m._rateAt = now; FM.playbackStats.rateWrites++;
            }
            /* The error the controller actually acted on, bias removed. Rolling window, not a
               first-600 cap (queue 491) — see FM._noteSyncError.
               NOTHING IS RECORDED ON THE TICK THAT LEARNS THE BIAS (queue 493): the bias is set to the
               raw error itself there, so the de-biased value is exactly 0 by construction. Storing it
               dropped a guaranteed zero into the list after every seek and at the start of every clip,
               pulling the median toward a number that describes the arithmetic rather than the audio. */
            if (!step.fresh) FM._noteSyncError(Math.abs(step.deBiased), now);
            }
          }
          // Reconcile volume/mute every tick (fadeMul = 1 when there are no fades) so a volume/fade
          // edit mid-playback takes effect immediately instead of sticking.
          const vol = FM.layerVolume(layer, FM.time) * FM.fadeMul(layer, FM.time - layer.start, layer.duration)
                    * declickGain(layer, FM.time, m, now);   // keyframed volume animates on forward clips; the last term is the edge de-click (#148)
          // A soloed layer silences the others' AUDIO too, matching the picture (compositor) and the
          // exported soundtrack (exporter buildAudioMix). Mute rather than pause so un-soloing resumes
          // instantly without a re-seek.
          if (FM.soloSilenced(layer)) { m.el.muted = true; }
          else {
            m.el.muted = false;
            /* SPLIT AT UNITY (queue 195). `el.volume` cannot go above 1 — assigning 2 throws
             * IndexSizeError and the value stays 1 — so everything up to unity stays here, where
             * fades, solo, mute and the de-click already live and keep working untouched, and only
             * the part ABOVE unity is handed to the Web Audio boost stage. The two multiply, so the
             * result is the volume asked for without reimplementing any of the above. A layer at or
             * below 100% never reaches setBoost and is never routed into Web Audio at all. */
            m.el.volume = Math.max(0, Math.min(1, vol));
            if (vol > 1 && FM.audioFxLive && FM.audioFxLive.setBoost) FM.audioFxLive.setBoost(layer, vol);
          }
        } catch (e) {}
      }
    });
  }

  /* How long the transport will wait for sound before giving up and starting anyway (queue 95).
   * 400ms comfortably covers the ~200ms measured start-up while staying short enough that a silent
   * or blocked clip does not feel stuck. */
  const START_WAIT_MS = 400;
  let _startWait = null;

  function tick() {
    if (!FM.playing) return;
    const P = FM.scene.project;
    clockAdopt();                 // free unless a context appeared since the last frame
    /* Still waiting for the audio to actually begin? Re-anchor to the CURRENT frame each pass, so no
     * time elapses and the sync controller has nothing to correct — rather than letting the playhead
     * run ahead of the sound and then dragging the sound up to it by playbackRate. */
    if (_startWait) {
      const started = _startWait.els.some(w => (w.el.currentTime || 0) > w.from + 0.008);
      if (started || performance.now() > _startWait.until) _startWait = null;
      else {
        clockAnchor(FM.time);
        render(); FM.timeline.updatePlayhead(); updateReadout();
        rafId = requestAnimationFrame(tick);
        return;
      }
    }
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
      /* THE FRAME INTERVAL, now that the estimator judges playback against the PROJECT frame time
       * rather than the display interval (see notePlaybackCost). Withholding it was right while the
       * budget was 1000/60 — a 30fps comp renders every other rAF by design, so a healthy playback
       * would have read as permanently late — but it left the ladder watching only main-thread render
       * time during playback, which is the one thing that cannot see GPU or decode cost.
       * His first on-device sample is the proof: real gaps of p95 38ms and worst 494ms, 14 late frames
       * of 446, and the app's own avgGapMs reporting 0. Blind, on tier 0 of 6, in smooth mode.
       * Only CONSECUTIVE renders count — a gap spanning a pause, a seek or a tab switch is not a
       * frame interval, and feeding one would read a still hand as a struggling machine. */
      const _now = performance.now();
      const _gap = (_lastPlayPaint && _now - _lastPlayPaint < 2000) ? (_now - _lastPlayPaint) : 0;
      _lastPlayPaint = _now;
      notePlaybackCost(_now - _t0, _gap);
    }
    FM.timeline.updatePlayhead();
    updateReadout();
    rafId = requestAnimationFrame(tick);
  }

  FM.play = function () {
    if (FM.playing) return;
    if (FM._panelGlowOff) FM._panelGlowOff();   // the cursor glow stands down for playback (queue 286)
    if (FM.timeline && FM.timeline.stopMomentum) FM.timeline.stopMomentum();   // don't fight a timeline glide
    if (FM.time >= FM.scene.project.duration - 1e-3) FM.time = 0;
    FM.playing = true;
    _struggleHits = 0;      // a fresh run of frames — never inherit a count from the last one (queue 492)
    /* `rateWrites` and `errs` are what queue 148 turned on, and they are not the same as `trims`.
   * A trim is a DECISION; a write is what the element actually hears, and `preservesPitch` makes a
   * write a PITCH change — 85 writes in four seconds is the scratchy warble he reported, and the
   * decision count did not show it. `errs` holds |sync error| samples so the report can give a
   * median rather than a worst case, which is the number that says whether sync is the problem at
   * all. Both are read by js/perf-probe.js, so his own device can answer the question this entry
   * has been asking his ears. */
  FM.playbackStats = { syncs: 0, renders: 0, drops: 0, seeks: 0, trims: 0, rateWrites: 0, errs: [], errT: [] };
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
        /* THE OVERHANG. Past the source's real end there is nothing left to play, and calling play()
           on an ended element rewinds it to zero — which is the bug this guard exists for. Leave it
           paused and silent; the tick applies the same rule every frame from here. */
        if (FM.pastSourceEnd(m, local)) { try { m.el.pause(); m.el.muted = true; } catch (e) {} return; }
        try { m.el.currentTime = local; m._syncAt = performance.now(); } catch (e) {}
        // A new pass learns its own output latency from scratch (queue 148) — the offset from the
        // last one belongs to a different position, and on a phone often to a different device state.
        m._errBias = null; m._rateAt = 0; m._baseRate = null; m._warmCt = null;
        try { m.el.playbackRate = Math.min(16, Math.max(0.0625, (FM.evalProp(layer.speed, FM.time) || 1) * (FM.previewRate || 1))); } catch (e) {}
        m.el.muted = FM.soloSilenced(layer);   // solo silences the others' audio, not just their picture
        // Pressing PLAY is the other place a waveform gets opened at an arbitrary sample — and the one
        // you hear most often. Start at zero; the sync tick's declickGain lifts it over 45ms. (#148)
        m._resumedAt = performance.now();
        m.el.volume = 0;
        m.el.play().catch(() => {});
      }
    });
    /* WAIT FOR THE SOUND BEFORE THE CLOCK RUNS (queue 95).
     * Measured: every press of Play started the transport immediately while the element carrying the
     * audio took ~200ms to produce any. el.currentTime sat at 0.000 for the first ~120ms and had
     * reached only 0.028s at t=222ms, with the playhead already at 0.220s — a gap peaking at 183ms.
     * That is UNDER the hard-seek threshold (350ms), so nothing ever seeked; instead the sync
     * controller pinned playbackRate at its +10% ceiling for 55 consecutive decisions, which is a
     * pitched-up catch-up at the start of every single play. That is the "audio does not play
     * smoothly" in this entry.
     * So the clock is held at the current frame until an element that is SUPPOSED to make sound
     * actually advances. The picture holds for those ~200ms instead of the sound being resampled —
     * the same trade every editor makes, and the one #69 already makes everywhere else.
     * The deadline is not optional: autoplay can be blocked, a device can be missing, a file can carry
     * no audio at all. If nothing has advanced by then the transport starts regardless, so this can
     * never hang playback. */
    _startWait = null;
    try {
      const waiters = [];
      FM.scene.layers.forEach(l => {
        const m = FM.media.get(l.id);
        if (!m || !m.el || m.el.muted) return;
        if (!FM.isLayerVisibleAt(l, FM.time)) return;
        if (!(FM.layerVolume(l, FM.time) > 0)) return;
        waiters.push({ el: m.el, from: m.el.currentTime || 0 });
      });
      if (waiters.length) _startWait = { until: performance.now() + START_WAIT_MS, els: waiters };
    } catch (e) { _startWait = null; }
    // Start the clock here, alongside the audio it has to agree with: audioPlay.start() anchors
    // reversed buffers to audioCtx.currentTime, so both take their origin from the same reading.
    // If that call is what CREATED the context, adopt it immediately after, at the same scene time.
    clockAnchor(FM.time);
    if (FM.audioPlay) FM.audioPlay.start();   // reversed clips: play synthesized reversed audio
    clockAdopt();
    document.getElementById('btn-play').innerHTML = '<svg viewBox="0 0 24 24" class="tco" fill="currentColor"><rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/></svg>';   // pause icon
    document.body.classList.add('fm-playing');      // the pill is the play control now (queue 364) — it has to be able to say it is playing
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
    _lastPlayPaint = 0;   // a resume must not read the pause as a frame interval (queue 202)
    _startWait = null;            // never let a stale wait outlive the pass that created it
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
    document.body.classList.remove('fm-playing');
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

  /* ⚠️ TAP THE CANVAS WHILE THE EFFECTS MENU IS OPEN → PAUSE (queue 538). Ezra: *"Make it so if you tap
     the canvas when in the effects menu it pauses the playback, make it have a nice pause animation and
     a little pause button appears briefly before fading away"*.
     SCOPED, exactly as he wrote it — *"when in the effects menu"*. This is NOT a blanket tap-to-pause on
     the canvas: outside that menu a canvas tap selects and drags layers, and turning every one of those
     into a pause would break the editor.
     ⚠️ CAPTURE PHASE, AND IT NEVER STOPS PROPAGATION. The entry's own warning: pausing has to COEXIST
     with what the tap already does, not replace it. Capture means it runs before canvas-edit's
     startMove regardless of z-order; not stopping propagation means the selection or drag still
     happens. The tap does both things, which is what he asked for — he said pause, not "and stop
     selecting".
     ⚠️ Only while PLAYING. A tap on a paused canvas that bloomed a pause glyph would be a lie. */
  (function () {
    /* ⚠️ BOUND ON THE DOCUMENT, NOT ON THE CANVAS OR ITS WRAPPER — and this cost two wrong attempts,
       so it is worth writing down. Holding a reference to #preview did not work: measured, a capture
       listener registered on that element saw ZERO taps once the effects browser had been opened and
       playback started. Re-binding to #canvas-wrap did not work either, for the same reason. Something
       in that path rebuilds the canvas area, so ANY listener held on a node from load time is on a
       corpse by the time this feature is used — and this feature ONLY runs in that state, so it was
       broken in exactly the situation it exists for.
       A document-level capture listener cannot go stale. The `closest` check keeps the scope exactly
       where he put it: taps on the canvas area, not on the sheet below it. */
    const fx = document.getElementById('pause-fx');
    /* Re-tapping mid-fade has to RESTART the bloom, not be swallowed by the animation still running —
       "it cannot be left stuck on screen if you tap again mid-fade". Removing the class and forcing a
       reflow before re-adding is what makes the browser start the keyframes over. */
    FM.flashPause = function () {
      if (!fx) return;
      fx.classList.remove('on');
      void fx.offsetWidth;          // reflow: without this the re-added class is a no-op mid-animation
      fx.classList.add('on');
    };
    const fxMenuOpen = () => {
      const root = document.getElementById('fx-browser');
      if (!root) return false;
      if (root.classList.contains('hidden')) return false;
      return getComputedStyle(root).display !== 'none';
    };
    FM._fxMenuOpen = fxMenuOpen;    // suite seam: the real condition, not a copy of it
    document.addEventListener('pointerdown', (e) => {
      if (!FM.playing || !fxMenuOpen()) return;
      const t = e.target;
      if (!t || !t.closest || !t.closest('#canvas-wrap')) return;   // the canvas area only — not the sheet
      FM.pause();
      FM.flashPause();
    }, true);
  })();

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
  /* WHERE the Add row is sitting (queue 294, clause 5). An index into scene.layers: 0 puts it above
   * everything, layers.length puts it at the bottom. This is the whole of "the actual cool
   * functionality part" of his idea — "you can drag that first and then add stuff and when you do add
   * something it'll just go below the add one" — because the row draws at this index and new layers
   * land at it, which leaves the row sitting directly above whatever you just made.
   * It lives here rather than in the timeline because the timeline is a VIEW: the add path has to know
   * the number even when the timeline has not been built (a fresh project, an AI op, an import). */
  FM.addAt = 0;
  /* Moves the marker and shows it moving. A shortcut whose only feedback is a line jumping somewhere
     off-screen is a shortcut nobody trusts, so it scrolls the marker into view after the rebuild. */
  function moveAddMarker(to) {
    if (FM.groupContext) return;
    FM.addAt = to;
    FM.clampAddAt();
    if (FM.syncAddSwitch) FM.syncAddSwitch();   // the switch shows WHERE the row is, so it follows every move (queue 373)
    if (FM.timeline && FM.timeline.rebuild) FM.timeline.rebuild();
    else if (FM.refreshAll) FM.refreshAll();
    const el = document.querySelector('.tl-addrow');
    if (el && el.scrollIntoView) { try { el.scrollIntoView({ block: 'nearest' }); } catch (_) {} }
  }
  FM.moveAddMarker = moveAddMarker;   // exposed so the suite drives the same path the key does

  /* THE ADD-ROW SWITCH (queue 373, clauses 4-7). His words: "if the switch is facing up it's at the top,
     if it's facing down it's at the bottom, if it's anywhere in the middle the switch will gradually move
     closer from the top to the bottom depending on how far down you've moved the add row button, and
     press it while it's mid way just forces it in the direction it's furthest from, so if it's close to
     the top you press the switch and it goes to the bottom."
     The proportion is real and needed nothing invented: FM.addAt is a boundary index clamped
     0..layers.length, and the add row is already draggable to any boundary. So the knob's offset is
     literally addAt / layers.length — 0 at the top, 1 at the bottom, and every drag position in between
     lands where it should without a special case.
     "The direction it's furthest from" is why this is `p < 0.5 ? bottom : top` rather than a flip: at 0.4
     the far end is the BOTTOM, so it goes down; a plain toggle would send it up. */
  function addSwitchProportion() {
    const n = (FM.scene && FM.scene.layers) ? FM.scene.layers.length : 0;
    if (!n) return 0;                                   // nothing to sit between — it is at the top
    /* MID-DRAG, THE LIVE INDEX WINS (queue 438). A layer reorder is deferred — nothing is committed
       until the drop — so `FM.addAt` is stale for the whole gesture while the add row is visibly
       sliding on screen. js/timeline.js publishes where the row currently SITS as `FM.dragAddAt`, on
       the same lifetime as `FM.dragLayerId`, and this prefers it while it exists. Reading it rather
       than writing addAt is what keeps a cancelled drag from leaving a half-applied index behind. */
    const live = (typeof FM.dragAddAt === 'number') ? FM.dragAddAt
               : (FM.clampAddAt ? FM.clampAddAt() : FM.addAt);
    return Math.max(0, Math.min(1, live / n));
  }
  FM._addSwitchProportion = addSwitchProportion;        // for the suite
  function syncAddSwitch() {
    const b = document.getElementById('btn-addside');
    if (!b) return;
    const p = addSwitchProportion();
    b.style.setProperty('--sw', String(p));
    /* WHILE YOU ARE DRAGGING A LAYER, THE SWITCH WEARS ITS COLOUR (queue 416). Ezra: "Genius idea, make it
       so when you're dragging a layer the toggle button will change colour to the colour of that layer
       then when you press the toggle button while dragging a layer it will jump that layer to the top or
       bottom."
       The colour comes from the timeline's own `clipColorOf`, not a second copy of that expression — the
       switch and the clip must agree about which layer you are holding, and two copies is how they stop
       agreeing. Cleared the moment the drag ends. */
    const dragId = FM.dragLayerId;
    const dragged = dragId && FM.layerById ? FM.layerById(FM.scene, dragId) : null;
    if (dragged && FM._clipColorOf) {
      b.classList.add('sw-dragging');
      b.style.setProperty('--sw-colour', FM._clipColorOf(dragged));
    } else {
      b.classList.remove('sw-dragging');
      b.style.removeProperty('--sw-colour');
    }
    b.title = p <= 0.001 ? 'Add row is at the TOP — tap to send it to the bottom'
            : p >= 0.999 ? 'Add row is at the BOTTOM — tap to send it to the top'
            : 'Add row is ' + Math.round(p * 100) + '% down — tap to send it to the far end';
  }
  FM.syncAddSwitch = syncAddSwitch;
  FM.toggleAddSide = function () {
    const n = (FM.scene && FM.scene.layers) ? FM.scene.layers.length : 0;
    /* PRESSED MID-DRAG, IT THROWS THE LAYER INSTEAD OF THE ADD ROW (queue 416 clause 2). Same rule as the
       add row's own (queue 373 clause 7): to the end it is FURTHEST from, so a layer near the top goes to
       the bottom. Answering clause 3 by reusing that rule rather than inventing a second one — the switch
       should mean one thing whatever it is holding. */
    const dragId = FM.dragLayerId;
    const layers = (FM.scene && FM.scene.layers) || [];
    const i = dragId ? layers.findIndex(l => l.id === dragId) : -1;
    if (i >= 0 && n > 1) {
      const toTop = (i / n) >= 0.5;                     // nearer the bottom → throw it to the top
      const target = toTop ? layers[0] : null;          // beforeId null = the very end
      if (FM.moveLayers) FM.moveLayers([dragId], toTop ? target.id : null);
      if (FM.timeline && FM.timeline.rebuild) FM.timeline.rebuild();
      if (FM.history) FM.history.commit();
      syncAddSwitch();
      return;
    }
    const p = addSwitchProportion();
    moveAddMarker(p < 0.5 ? n : 0);                     // to the end it is FURTHEST from
    syncAddSwitch();
  };

  FM.clampAddAt = function () {
    const n = (FM.scene && FM.scene.layers) ? FM.scene.layers.length : 0;
    FM.addAt = Math.max(0, Math.min(typeof FM.addAt === 'number' ? FM.addAt : 0, n));
    return FM.addAt;
  };
  FM.insertLayer = function (layer) {
    if (FM.groupContext && !layer.parent) layer.parent = FM.groupContext;
    /* INSIDE EDIT GROUP the flat index means nothing — the rows on screen are one group's subtree, not
       scene.layers — so that path keeps the old top-insert until the Add row understands subtrees.
       Getting this wrong would put a layer you added while editing a group somewhere outside it, which
       is the exact failure this helper was written for in the first place. */
    const at = FM.groupContext ? 0 : FM.clampAddAt();
    FM.scene.layers.splice(at, 0, layer);   // the ONE insert — every creator routes through here
    return layer;
  };

  /* THE BIGGEST PROJECT THE APP MAY CHOOSE FOR YOU.
   *
   * Its own Canvas settings picker tops out at 2160p — for a portrait comp that is 2160x3840 — and
   * nothing should be able to silently create a project bigger than the largest size the UI offers.
   * Until now the first import did exactly that: addMediaLayer took the file's pixel dimensions
   * verbatim, so dropping a photo straight off a phone (3024x4032 is a stock iPhone still) into an
   * empty project produced a **12.2-MEGAPIXEL** composition. That is the project in his own
   * measurement in queue 202 — 8 layers, 2 effects, 4 cores, half-second frame stalls — and it is a
   * photograph's shape, not a video's. No export target is a 12 MP still-shaped video.
   *
   * The cap is on the SHORT side because that is what the picker's "2160p" means for a portrait comp.
   * Aspect is preserved and both sides come out even, which H.264 requires. Anyone who genuinely wants
   * bigger can still type it into Canvas settings — this governs only the size the app picks unasked.
   */
  const MAX_AUTO_SHORT = 2160;

  /* ═══ TELL HIM HIS PROJECT IS THE PROBLEM, ON THE DEVICE (queue 202 Finding 1, and 125 / 95).
   *
   * Finding 1 of his own on-device report is a **12.2-megapixel project** — 3024x4032, a photograph's
   * dimensions, inherited from the first image he imported, on a four-core phone. Every frame
   * composites 12.2M pixels. It is still described in queue 202 as *"the biggest number in that
   * report"*, and both halves of the answer already shipped: v9.27 capped the import so it cannot
   * happen again, and v9.28 added **Scale the layers to fit** so an existing one can be brought down
   * with the work intact.
   *
   * What never shipped is anyone TELLING HIM. The instruction lives in REQUESTS.md — *"open the big
   * project, Canvas settings, pick a smaller resolution, Apply"* — which is a file he does not read,
   * about a project the app can identify by itself in one comparison. Same failure as queue 129's
   * console.warn: the app knows and does not say.
   *
   * The bar: only a project BIGGER THAN THE APP'S OWN PICKER OFFERS, which is exactly the condition
   * fitProjectSize() already refuses to create. So this can never fire on a comp the app made, or on
   * anything a person deliberately typed in that is within range — only on the ones that were built
   * unasked before v9.27, which is the case it exists for. Once per project per session. */
  let _oversizeTold = '';
  FM.projectIsOversize = function (P) {
    P = P || (FM.scene && FM.scene.project);
    if (!P || !P.width || !P.height) return false;
    return Math.min(P.width, P.height) > MAX_AUTO_SHORT;
  };
  FM.warnOversizeProject = function () {
    const P = FM.scene && FM.scene.project;
    if (!P || FM._exporting || !FM.projectIsOversize(P)) return false;
    const key = (P.name || '') + ':' + P.width + 'x' + P.height;
    if (_oversizeTold === key) return false;          // already said, this project, this session
    _oversizeTold = key;
    const mp = (P.width * P.height / 1e6).toFixed(1);
    if (FM.toast) FM.toast('This project is ' + mp + ' megapixels — tap to fix the lag', 9000, () => {
      /* NO SECOND TOAST (queue 490). This used to explain what to do in an 11-second toast and then
         open the dialog over the top of it 400ms later, which covered it completely. The explanation
         now lives inside the dialog itself (see cvUpdate), where it is readable for as long as he is
         choosing rather than for four tenths of a second. */
      const cv = document.getElementById('btn-canvas');
      if (cv) cv.click();
    });
    return true;
  };
  FM._resetOversizeWarning = function () { _oversizeTold = ''; };
  /* Split out so the boot path's decision is testable without reloading the page (queue 487). The
     landing is read from where he ENDED UP rather than re-deriving it from `fm.view`, so this cannot
     drift out of step with the home-screen rule above it. */
  FM._warnOversizeAfterLanding = function (restored) {
    const onHome = !!(FM.home && FM.home.isOpen && FM.home.isOpen());
    if (!restored || onHome) return false;
    return !!(FM.warnOversizeProject && FM.warnOversizeProject());
  };
  const evenDim = v => Math.max(2, Math.round(v / 2) * 2);
  FM.fitProjectSize = function (w, h) {
    w = Math.max(2, Math.round(w || 0)); h = Math.max(2, Math.round(h || 0));
    const short = Math.min(w, h);
    if (!isFinite(short) || short <= MAX_AUTO_SHORT) return { w: evenDim(w), h: evenDim(h), capped: false };
    const k = MAX_AUTO_SHORT / short;
    return { w: evenDim(w * k), h: evenDim(h * k), capped: true };
  };

  FM.addMediaLayer = function (rec) {
    // A just-added clip cannot draw until its decoder produces a frame — measured at ~0.5s here and far
    // longer on a phone — so say so rather than showing an empty canvas (queue 201).
    setTimeout(function () { if (FM.loadingDot) FM.loadingDot.check(); }, 0);
    const scene = FM.scene, P = scene.project;
    const first = scene.layers.length === 0;
    if (first && rec.width && rec.height) {
      const fit = FM.fitProjectSize(rec.width, rec.height);
      P.width = fit.w; P.height = fit.h;
      // Say so rather than quietly disagreeing with the file — a capped project is a real choice the
      // app made on his behalf, and Canvas settings is where to undo it.
      if (fit.capped && FM.toast) FM.toast('Project set to ' + fit.w + '\u00d7' + fit.h + ' — ' + rec.width + '\u00d7' + rec.height + ' is bigger than any preset. Change it in Canvas settings.', 4600);
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
      /* requestRender, NOT the bare synchronous render() this used to call (queue 125). Two reasons,
       * and the second is the one that mattered. It COALESCES: a scrub lands a 'seeked' per frame and
       * each one was forcing a whole extra out-of-band render on top of the scrub's own, so a scrub of
       * a video layer was paying for two full renders a frame. And it is MEASURED: FM.requestRender
       * times the render and feeds noteMotion, while a bare render() is invisible to it — so roughly
       * half of a video scrub's real cost never reached the adaptive quality ladder at all, which is a
       * direct part of why "measure the render path" kept coming back clean.
       * (js/storage.js already wired its three copies of this listener the right way; these four were
       * the odd ones out.) */
      rec.el.addEventListener('seeked', () => { if (FM._exporting || FM.playing) return; FM.requestRender(); });   // never repaint the PREVIEW mid-export: the exporter seeks every video every frame (#47)
      FM.wireVideoRepaint(rec);   // …and when the FIRST FRAME finally decodes, which no seek announces
    }
    /* The playhead follows the import, so you are looking AT the clip you just added rather than at
     * the empty time you happened to be parked in. Untouched in the normal case, where the clip
     * already starts exactly at the playhead.
     *
     * The FIRST clip used to be excluded from this, and that is half of "I just tried adding a song
     * and it won't even play at all sometimes, and it's the only thing in the timeline" (queue 96).
     * The first clip lands at 0 and sets the composition length — but the playhead keeps whatever
     * value it was left at by whatever was in the project before. Land somewhere inside the song and
     * it plays from the middle for no visible reason; land PAST the new (possibly short) duration and
     * pressing play does nothing at all, because there is nothing left to play. Both read as broken.
     * The first clip in an empty project should start you at its beginning. */
    if (start !== FM.time) FM.time = start;
    /* THROUGH THE ONE INSERT (queue 298). This unshifted straight to the top, so every imported clip —
     * video, image, audio, a sound effect, the sample clip — ignored the Add-layer marker and landed
     * above everything, which is his report word for word: "the tap to add layer button doesn't actually
     * make layers land below it, they just go to the top still".
     * The comment on insertLayer already LISTS "imported media" among the creators it was written to
     * cover; this one was simply missed when that refactor happened, so the note has been describing a
     * fix that was never applied here. Imported media is also the most common thing anyone adds, which
     * is why the marker looked broken rather than partly working. */
    FM.insertLayer(layer);
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
    const layer = FM.makeLayer('text', { name: 'Text', x: P.width / 2, y: P.height / 2, fontSize: FM.defaultTextSize(), start: FM.time, duration: FM.defaultLayerDuration() });
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
    const layer = FM.makeLayer('null', { name: 'Controller', x: P.width / 2, y: P.height / 2, duration: P.duration || 5 });   // empty project (dur 0) → a usable 5s so the layer actually renders. TYPE stays 'null' (queue 363): the rename is user-facing only, so saved projects keep working.
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
  /* EXPOSED (queue 159) because the add-menu icon has to draw at the same proportions the shape will
     actually spawn at. js/addmenu.js used to map every shape's unit box into a SQUARE, so anything with
     a non-square aspect here — banner, arrow, trapezoid, parallelogram, cloud, crown, eye, envelope,
     key… — was advertised at proportions the app would never give you. Measured before the fix with
     tests/_shapedrift.html: banner's icon ink was 1.84:1 against the real 4.08:1.
     One table, read by both, so the two can no longer disagree. */
  const SHAPE_ASPECT = FM.SHAPE_ASPECT = {
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
  /* Re-fit an existing path layer around a NEW set of sub-strokes, in project pixels (queue 167).
   * Ezra: "when you draw with free hand drawing it creates multiple layers, it should all be inside
   * the one drawing you just made not keep creating more."
   * Every stroke used to become its own layer — nine strokes, nine timeline rows — which is also why
   * he could not scroll the timeline (#166). A drawing session is ONE layer now, and each new stroke
   * re-fits it: the box grows to the union of every stroke, and all of them are re-normalised into
   * that box, because subs are stored in [0,1] of the layer's own box and a stroke drawn outside the
   * old box would otherwise land outside the drawing.
   * The layer keeps its id, its place in the stack and its selection — this only moves geometry. */
  FM.refitPathLayer = function (layer, projSubs) {
    if (!layer || !projSubs || !projSubs.length) return layer;
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    projSubs.forEach(sub => sub.forEach(p => {
      if (p[0] < minX) minX = p[0]; if (p[0] > maxX) maxX = p[0];
      if (p[1] < minY) minY = p[1]; if (p[1] > maxY) maxY = p[1];
    }));
    if (!isFinite(minX)) return layer;
    const w = Math.max(4, maxX - minX), h = Math.max(4, maxY - minY);
    layer.subs = projSubs.map(sub => sub.map(p => (p.length > 2
      ? [(p[0] - minX) / w, (p[1] - minY) / h, p[2]]
      : [(p[0] - minX) / w, (p[1] - minY) / h])));
    layer.points = null;                       // subs win in traceShapePath; don't leave a stale single path
    layer.shapeW = Math.round(w); layer.shapeH = Math.round(h);
    layer.transform.x = minX + w / 2; layer.transform.y = minY + h / 2;
    return layer;
  };

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
    // …and the text editor, for the same reason the crop tool is stopped two lines up: it is bound to
    // ONE layer and never self-closes, so deselecting left the whole editing surface up, still asking
    // for the blue tick (queue 523). Passed the INCOMING id, because selectedId has not been written
    // yet at this point.
    if (FM.textEdit && FM.textEdit.syncToSelection) FM.textEdit.syncToSelection(id);
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
  // (and, until queue 177 removed it, resetProject); deleteLayer and history.restore already had their own equivalent.
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
    /* ⚠️ DELETING SELECTS NOTHING (queue 556). Ezra: *"When deleting a layer it shouldn't select the
       last layer selected but just close every layer and leave you in the timeline"*.
       It was falling back to `layers[0]`, which on a phone immediately re-opens THAT layer's option
       sheet over the timeline he was trying to get back to — so a delete ended with a panel up for a
       layer he never chose. Nothing selected is also the honest state: he deleted the thing he was
       working on. */
    FM.scene.selectedId = null;
    FM.scene.selectedIds = [];
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
    // …and the same on this path (queue 556) — see the note in deleteSelected. Still VALIDATED rather
    // than blindly cleared: deleting a group cascades to its members, so a selection that survived the
    // delete is a selection he still has, and only a dead one becomes "nothing".
    if (!FM.layerById(FM.scene, FM.scene.selectedId)) FM.scene.selectedId = null;
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
    // Same insert as everything else (queue 298) — it honours the Add-layer marker, and it does the
    // group-context parenting this line used to do by hand, so the two cannot disagree.
    FM.insertLayer(g);
    FM.selectLayer(g.id);
    // …and the toast says the same words as the tile that made it (queue 412).
    if (FM.toast) FM.toast('New group — parent layers to it, or drag them under it', 2400);
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
    /* A NEW GROUP STARTS CLOSED (queue 192/193). Ezra: "when I group stuff I want the layers grouped to
     * move inside the group not be duplicated and left outside the group", and "groups inside groups
     * should show up on the original timeline, only when you go inside the group".
     * Nothing was ever duplicated — groupSelection re-inserts the very same layer objects and the scene
     * grows by exactly one row, the group itself. What he was seeing is that a new group opened
     * EXPANDED, so its members stayed listed on the top-level timeline underneath it, which looks
     * exactly like copies left outside; and with nested groups, every level was listed at once (his
     * screenshot: four Group rows stacked, then the two shapes). Starting closed makes grouping do
     * visually what it does structurally — the layers go in — and the chevron, or entering the group,
     * is how you look inside. */
    const g = FM.makeLayer('group', { name: opts.mask ? 'Mask Group' : 'Group', x: 0, y: 0, start: start, duration: end - start });
    g.collapsed = true;
    if (opts.mask) g.maskGroup = true;
    if (FM.groupContext) g.parent = FM.groupContext;   // grouping while editing a group nests inside it
    // Re-parent only top-level members — a child whose parent is also being grouped keeps it.
    // Tested against MEMBERS, not the raw selection: a layer can be selected and still be refused as
    // a member (a camera, or an ancestor caught by the guard above), and if its children checked the
    // selection they would keep pointing at a non-member and the new group would come out empty.
    const memberIds = new Set(members.map(l => l.id));
    /* A MEMBER THAT IS ITSELF A GROUP BRINGS ITS WHOLE SUBTREE (bug hunt, 21 Aug). Only the selected
     * members were pulled contiguous under the new row; a member group's CHILDREN are not in the
     * selection, so they stayed where they were in the array while their group row moved — and the
     * layer array IS the stacking order, so the picture silently re-stacked.
     * Measured (tests/_groupstack.html): group two shapes, then group THAT group with a layer sitting
     * below them, and the overlap pixel went from red to blue — a layer that was behind came to the
     * front, from a structural edit that draws nothing.
     * Computed BEFORE the re-parent below: after it, a top-level member's parent is `g`, which is not
     * in scene.layers yet, so FM.isAncestor's walk would break at the first hop and find nothing. */
    const movingIds = new Set();
    FM.scene.layers.forEach(l => {
      if (memberIds.has(l.id)) { movingIds.add(l.id); return; }
      for (let i = 0; i < members.length; i++) {
        if (members[i].type === 'group' && FM.isAncestor(FM.scene, members[i].id, l.id)) { movingIds.add(l.id); return; }
      }
    });
    const moving = FM.scene.layers.filter(l => movingIds.has(l.id));   // current array order = current stacking
    members.forEach(l => { if (!l.parent || !memberIds.has(l.parent)) l.parent = g.id; });
    // Pull them contiguous directly under the group row (top-most mover's slot).
    const topIdx = FM.scene.layers.findIndex(l => movingIds.has(l.id));
    FM.scene.layers = FM.scene.layers.filter(l => !movingIds.has(l.id));
    FM.scene.layers.splice(Math.max(0, Math.min(topIdx, FM.scene.layers.length)), 0, g);
    Array.prototype.splice.apply(FM.scene.layers, [FM.scene.layers.indexOf(g) + 1, 0].concat(moving));
    FM.selectMode = false;
    FM.selectLayer(g.id);
    if (FM.toast) FM.toast(opts.mask ? 'Masking group — its top layer clips the rest' : 'Grouped ' + members.length + ' layers');
    if (FM.history) FM.history.commit();
  };
  /* BAKE THE GROUP'S TRANSFORM INTO ITS MEMBERS ON THE WAY OUT (bug hunt, 21 Aug).
   * `groupSelection` is careful on the way IN — the group is created with a neutral (0,0) transform,
   * because "any x/y here would instantly displace every member the moment they're grouped". Ungroup
   * did not have the matching care on the way OUT: it re-parented the members and deleted the group,
   * transform and all. So if you had MOVED the group, every layer snapped back.
   * Measured by rendering (tests/_groupxform.html): three shapes at ink box 44,89..155,199, grouped and
   * the group moved to 74,54..185,194, then ungrouped — **back to 44,89..155,199**, exactly where they
   * were before the move. A positioning decision silently thrown away.
   * The maths is the same composition `applyParentChain` does: the parent's rotate/scale act on the
   * child's local position, its rotation adds, its scale multiplies.
   * ⚠️ ANIMATED group transforms are NOT baked, and that is deliberate rather than an oversight: a
   * keyframed group position cannot be folded into a child without resampling the child's own curve,
   * and a silent approximation of someone's animation is worse than saying so. Those keep the old
   * behaviour and SAY it, which is the one thing the old behaviour never did. */
  function bakeGroupTransform(g) {
    const gt = g.transform || {};
    const anim = ['x', 'y', 'rotation', 'scale'].some(k => FM.isAnimated && FM.isAnimated(gt[k]));
    const gx = FM.evalProp(gt.x, 0) || 0, gy = FM.evalProp(gt.y, 0) || 0;
    const grot = FM.evalProp(gt.rotation, 0) || 0, gsc = FM.evalProp(gt.scale, 0);
    const sc = (typeof gsc === 'number' && isFinite(gsc) && gsc !== 0) ? gsc : 1;
    const identity = !gx && !gy && !grot && sc === 1;
    if (identity) return { baked: 0, skipped: 0 };
    if (anim) return { baked: 0, skipped: -1 };            // -1 = "there was something, and it is animated"
    const rad = grot * Math.PI / 180, cos = Math.cos(rad), sin = Math.sin(rad);
    let baked = 0;
    FM.scene.layers.forEach(l => {
      if (l.parent !== g.id) return;
      const t = l.transform; if (!t) return;
      // A member with its OWN animated position cannot be shifted by editing one number either.
      if (FM.isAnimated && (FM.isAnimated(t.x) || FM.isAnimated(t.y))) return;
      const lx = FM.evalProp(t.x, 0) || 0, ly = FM.evalProp(t.y, 0) || 0;
      t.x = gx + (cos * lx - sin * ly) * sc;
      t.y = gy + (sin * lx + cos * ly) * sc;
      if (grot && !(FM.isAnimated && FM.isAnimated(t.rotation))) t.rotation = (FM.evalProp(t.rotation, 0) || 0) + grot;
      if (sc !== 1 && !(FM.isAnimated && FM.isAnimated(t.scale))) {
        const ls = FM.evalProp(t.scale, 0);
        t.scale = ((typeof ls === 'number' && isFinite(ls)) ? ls : 1) * sc;
      }
      baked++;
    });
    return { baked: baked, skipped: 0 };
  }

  /* WHAT ELSE THE GROUP WAS CARRYING (bug hunt, 21 Aug). bakeGroupTransform above settles WHERE the
   * members end up; this settles how they LOOK, and ungroup was dropping both of these outright.
   * Measured by rendering (tests/_ungroupkeeps.html), with a plain group as the control:
   *   · a group at 35% opacity → its members snapped to full brightness (mean 89 → 255)
   *   · a HIDDEN group → everything inside it reappeared (ink 0 → 1800)
   * Both fold exactly onto the members: opacity multiplies, hidden is inherited. Kept OUT of
   * bakeGroupTransform on purpose — that one returns early when the transform is identity, and a group
   * can easily be faded or hidden without ever having been moved.
   * The group's EFFECTS are deliberately NOT baked, because they do not fold: a group effect runs once
   * over the composited group, and running it again on each member is a different picture, not the same
   * one. Same for a blend mode, and for an ANIMATED group opacity. Those are named out loud instead of
   * disappearing quietly — the same discipline as the animated-position toast below. */
  function bakeGroupLook(g) {
    const gt = g.transform || {};
    const animOp = !!(FM.isAnimated && FM.isAnimated(gt.opacity));
    let gop = 1;
    if (!animOp) { const v = FM.evalProp(gt.opacity, 0); gop = (typeof v === 'number' && isFinite(v)) ? v : 1; }
    const hidden = g.visible === false;
    const lost = [];
    if (animOp) lost.push('its fading');
    if (Array.isArray(g.effects) && g.effects.some(e => e && e.enabled !== false)) lost.push('its effects');
    if (g.blendMode && g.blendMode !== 'normal') lost.push('its blend mode');
    FM.scene.layers.forEach(l => {
      if (l.parent !== g.id) return;
      if (hidden) l.visible = false;
      const t = l.transform; if (!t) return;
      if (gop !== 1 && !(FM.isAnimated && FM.isAnimated(t.opacity))) {
        const lo = FM.evalProp(t.opacity, 0);
        t.opacity = ((typeof lo === 'number' && isFinite(lo)) ? lo : 1) * gop;
      }
    });
    return lost;
  }

  FM.ungroup = function (id) {
    const g = FM.scene.layers.find(l => l.id === id);
    if (!g || g.type !== 'group') return;
    if (FM.groupContext === id) FM.exitGroup(true);
    const bake = bakeGroupTransform(g);                     // BEFORE the members are re-parented
    const lost = bakeGroupLook(g);                          // …and so is everything that is not position
    if (bake.skipped === -1 && FM.toast) FM.toast('This group’s position is animated — ungrouping cannot carry that onto the layers, so they go back to their own positions', 6000);
    else if (lost.length && FM.toast) FM.toast('Ungrouped — but ' + lost.join(' and ') + ' belonged to the group itself and cannot be carried onto the layers individually', 6000);
    FM.scene.layers.forEach(l => { if (l.parent === id) l.parent = g.parent || null; });   // members lift into the parent context
    FM.scene.layers = FM.scene.layers.filter(l => l !== g);
    FM.selectLayer(null);
    FM.refreshAll();
    if (FM.history) FM.history.commit();
  };

  // ---- Edit Group (AM): open a group in its own timeline view — only its members show, edit them
  // individually, then back out (‹ back / the crumb pill). Purely a view scope; time stays global.
  FM.groupContext = null;
  /* The floating "‹ Editing group  Group" pill is GONE (queue 190). Ezra: "Get rid of the editing group
     go back button pop up, the top left back button works fine." He is right — both back buttons already
     leave the group before they leave the project (#btn-back here, #m-back in js/mobile.js, deliberately
     the same ladder), so the pill was a second door to the same place parked across the bottom of the
     inspector. Checked that the remaining door works on BOTH before removing it, which is the lesson of
     queue 53, where Group's action survived and every way to reach it did not.
     What SURVIVES is `body.group-editing`: other rules key off it (the + FAB hides inside a group,
     because adding happens at project level), so this still runs — it just has no pill to update. */
  function updateGroupCrumb() {
    document.body.classList.toggle('group-editing', !!FM.groupContext);
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
      if (nrec.kind === 'video') nrec.el.addEventListener('seeked', () => { if (FM._exporting || FM.playing) return; FM.requestRender(); });   // coalesced AND measured — see the note at the first of these (queue 125)
    }
  }

  /* EVERY CROSS-LAYER REFERENCE A COPY CARRIES, REMAPPED IN ONE PLACE (bug hunt, 21 Aug).
   * This rule existed twice — inside duplicateLayer for a group's own subtree, and in paste — and a
   * MULTI-LAYER duplicate had neither, because it duplicates one layer at a time and each pass only
   * knows about its own subtree. So selecting two layers that reference each other and pressing
   * Duplicate gave you copies still wired to the ORIGINALS: measured, all four kinds of link failed —
   * a Follow target, an Audio Drive source, a parent link and an effect's source layer
   * (tests/_dupsel.html). Move the original afterwards and the "copy" follows it.
   * Two-way rather than paste's three-way rule on purpose: when duplicating, every original is still in
   * the scene, so there is no dead reference to clear — a ref that is not a batch mate is a deliberate
   * link to a layer that still exists, and both the original and the copy may legitimately use it. */
  FM.remapLayerRefs = function (layer, idMap) {
    if (!layer || !idMap) return;
    if (layer.parent && idMap[layer.parent]) layer.parent = idMap[layer.parent];
    if (Array.isArray(layer.behaviors)) layer.behaviors.forEach(bh => {
      if (!bh || !bh.params) return;
      ['targetId', 'sourceId'].forEach(k => { if (bh.params[k] && idMap[bh.params[k]]) bh.params[k] = idMap[bh.params[k]]; });
    });
    if (FM.eachFx) FM.eachFx(layer, fx => {
      if (fx && fx.params && fx.params.source && idMap[fx.params.source]) fx.params.source = idMap[fx.params.source];
    });
    if (layer.karaokeOf && idMap[layer.karaokeOf]) layer.karaokeOf = idMap[layer.karaokeOf];
  };

  FM.duplicateLayer = async function (id, inPlace) {
    const src = FM.layerById(FM.scene, id);
    if (!src) return;
    if (src.type === 'camera') { if (FM.toast) FM.toast('Scene already has a camera'); return; }   // single-camera invariant — a 2nd (offset) camera would hijack the view
    // inPlace → a plain copy: same position AND no " copy" suffix or new clip colour. Since queue 156
    // an ordinary duplicate is also positionally exact; inPlace is now purely about the naming/colour.
    const copy = FM.cloneLayer(src, !!inPlace);
    await reloadMediaTo(id, copy.id);
    const inserts = [copy];
    const dupMap = Object.create(null); dupMap[id] = copy.id;
    FM._lastDupMap = dupMap;                 // duplicateSelection stitches these into ONE batch map
    if (src.type === 'group' && FM.groupDescendants) {
      // a group is just a parent link — duplicating ONLY the group row made an empty invisible group.
      // Clone its whole subtree with fresh ids and remap parents through an idMap (like pasteClipboard).
      const idMap = dupMap;
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
        FM.eachFx(l, fx => {
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
    const made = [], batch = Object.create(null);
    // duplicateLayer commits history itself, so the loop would leave one undo entry PER layer and
    // reversing a single button press would take three presses of undo. Muted for the run, then one
    // commit at the end — the whole duplication is one action, so it is one step back.
    const hist = FM.history, realCommit = hist && hist.commit;
    if (hist) hist.commit = function () {};
    try {
      for (const id of todo) {
        await FM.duplicateLayer(id, inPlace);
        Object.assign(batch, FM._lastDupMap || {});
        if (FM.scene.selectedId && made.indexOf(FM.scene.selectedId) < 0) made.push(FM.scene.selectedId);
      }
    } finally { if (hist) hist.commit = realCommit; }
    /* THE WHOLE BATCH AT ONCE, once every copy exists. A per-layer pass cannot do this: when layer A is
     * duplicated, layer B's copy does not exist yet, so a link from A to B has nothing to point at.
     * Idempotent over the per-subtree remap duplicateLayer already did — those refs are copy ids now,
     * and a copy id is never a key in the batch map. */
    const copyIds = new Set(Object.keys(batch).map(k => batch[k]));
    FM.scene.layers.forEach(l => { if (copyIds.has(l.id)) FM.remapLayerRefs(l, batch); });
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
  // Omitted → wherever the Add row is sitting (queue 294 clause 11), which is also where a plain add
  // goes, so paste and add agree. The ⧉ Paste-Layer split-button's arrow still passes a chosen index.
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
    /* Default: WHERE THE ADD ROW IS (queue 294, clause 11 — "when you copy and paste stuff it could go
       there like I would go to wear that liners"). An explicit index still wins, which is what the ⧉
       Paste-Layer split-button's arrow passes, so choosing a position by hand is unaffected. Inside
       Edit Group the flat index means nothing — same reason `insertLayer` skips it there — so paste
       falls back to the top. */
    const _dflt = FM.groupContext ? 0 : (FM.clampAddAt ? FM.clampAddAt() : 0);
    let insertAt = (typeof insertIndex === 'number' && insertIndex >= 0) ? Math.min(insertIndex, FM.scene.layers.length) : _dflt;
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
      FM.eachFx(copy, fx => {
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
          if (nrec.kind === 'video') nrec.el.addEventListener('seeked', () => { if (FM._exporting || FM.playing) return; FM.requestRender(); });   // coalesced AND measured — see the note at the first of these (queue 125)
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
    // coalesced AND measured — see the note at the first of these (queue 125)
    if (nrec.kind === 'video' && nrec.el) { nrec.el.addEventListener('seeked', () => { if (FM._exporting || FM.playing) return; FM.requestRender(); }); FM.wireVideoRepaint(nrec); }
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
    /* A GROUP BAR CARRIES ITS MEMBERS (bug hunt, 21 Aug). FM.moveLayerToPlayhead below already knew
     * this — its own comment says "a group bar carries its members" — and this one did not, which is the
     * same shape of fault as the caption rule in FM.extendClipTo: a second mover of the same thing that
     * had lost half the rule. Measured (tests/_movegroup.html): the bar went 1..4 -> 3..6 while both
     * layers inside stayed at 1..4, so the picture never moved at all and the group's window no longer
     * contained its own contents.
     * Members' keyframes are in absolute project time, so they shift with their clip exactly the way
     * moveLayerToPlayhead shifts them. */
    const movers = [layer];
    if (layer.type === 'group' && FM.groupDescendants) FM.groupDescendants(layer.id).forEach(m => { if (m && !m.locked) movers.push(m); });
    movers.forEach(l => {
      l.start = l.start + d;
      if (FM.shiftLayerKeyframes) FM.shiftLayerKeyframes(l, d);
    });
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
    const ramped = FM.isAnimated(layer.speed), sp = ramped ? 1 : FM.speedAt(layer, layer.start);   // speedAt for the static case (queue 451)
    const s0 = layer.start, d0 = layer.duration, tr0 = layer.trimStart;
    /* Same reversed branch as the timeline's trim grips (BUG-HUNT names both sites): a reversed clip's
       head is the source window's END and its tail is the window's START, so without this the button
       edits the opposite end from the one it says it does. */
    const rev = layer.type === 'video' && !!layer.reversed;
    if (side > 0) {                                            // stretch the TAIL out to the playhead
      let nd = Math.max(0.1, t - layer.start);
      if (rev) {
        // the tail is the window START: eat source below trimStart — through the ramp's INTEGRAL, not a
        // flat multiply (which used sp = 1 for a ramp and threw the whole clip a full second out).
        /* Cap the growth against the source that is actually THERE, solved on the real curve: the old
         * `d0 + tr0 / sp` used a flat rate (1x for any ramp), so the source consumed did not equal the
         * source given up and the whole clip slid by the difference. */
        if (FM.speedAdvanceSolve) nd = Math.max(0.1, FM.speedAdvanceSolve(layer, d0, nd, tr0 || 0));
        let extra = FM.speedAdvanceOver ? FM.speedAdvanceOver(layer, d0, nd) : (nd - d0) * sp;
        let nt = (tr0 || 0) - extra;
        if (nt < 0) { nt = 0; }
        layer.trimStart = nt;
        layer.duration = nd;
      } else {
        if (layer.type === 'video' && isFinite(srcDur)) nd = Math.min(nd, FM.maxDurForSource(layer, srcDur - (layer.trimStart || 0), nd));
        layer.duration = nd;
      }
    } else {                                                   // stretch the HEAD back to the playhead
      let delta = t - layer.start;                             // negative: the head travels left
      if (layer.start + delta < 0) delta = -layer.start;
      if (layer.duration - delta < 0.1) delta = layer.duration - 0.1;
      if (rev) {
        if (isFinite(srcDur)) {                                // the head is the window END: only duration moves
          const maxDur = (srcDur - (tr0 || 0)) / sp;
          if (d0 - delta > maxDur) delta = d0 - maxDur;
        }
        layer.start = layer.start + delta;
        layer.duration = layer.duration - delta;
      } else {
        // Source consumed by the head movement, through the ramp's integral (see FM.headSourceDelta).
        const spL = ramped ? FM.speedAt(layer, layer.start + delta) : sp;   // still needed to re-solve a clamped delta
        let srcD = FM.headSourceDelta ? FM.headSourceDelta(layer, delta) : delta * spL;
        if (layer.type === 'video' && (layer.trimStart || 0) + srcD < 0) {
          delta = -(layer.trimStart || 0) / spL;                            // approximate re-solve, then re-integrate exactly
          srcD = FM.headSourceDelta ? FM.headSourceDelta(layer, delta) : delta * spL;
        }
        layer.start = layer.start + delta;
        layer.duration = layer.duration - delta;
        if (layer.type === 'video') layer.trimStart = (layer.trimStart || 0) + srcD;
      }
    }
    // belt-and-braces: a non-finite number must NEVER reach the scene — it cascades into every layout
    if (!isFinite(layer.duration) || layer.duration < 0.1) layer.duration = d0;
    if (!isFinite(layer.start)) layer.start = s0;
    if (layer.trimStart != null && !isFinite(layer.trimStart)) layer.trimStart = tr0;
    /* Captions are stored in time LOCAL to the clip, so any head movement has to be taken back out of
     * them or every cue slides across the timeline with the edge — the same rule FM.trimLayerHead
     * applies, now shared rather than re-written (bug hunt, 21 Aug: this branch had lost it, and one
     * press of Extend dragged every caption a full second early).
     * Driven off what ACTUALLY landed rather than the intended delta, so a clamp above — or the
     * belt-and-braces reset just above this — leaves the cues alone by construction. */
    const applied = layer.start - s0;
    if (applied && FM.shiftLayerCues) FM.shiftLayerCues(layer, applied);
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
    /* FADES BELONG TO THE OUTER EDGES ONLY (bug hunt, 21 Aug). `FM.fadeMul` measures from each clip's
     * OWN start and end, so leaving both halves holding both fades makes the cut fade the picture to
     * black and the sound to silence and back — measured at a full 1.0 deviation right at the split
     * (tests/_splitfade.html). A split is meant to be invisible. The head half keeps the fade-IN, the
     * tail half keeps the fade-OUT, and the two together reproduce the original curve exactly.
     * Unconditional on `reversed`: reversal swaps which part of the SOURCE each half plays, but the
     * fades are timeline-local, and A is still the half at the head of the timeline. */
    B.fadeIn = 0; layer.fadeOut = 0;
    /* A text layer's in/out animation is timed the SAME edge-anchored way (`t - layer.start` and
     * `layer.start + layer.duration - t` in drawAnimatedText), so it divides for the same reason —
     * and it is the louder of the two: measured, the title VANISHED for 1.2s across the cut, not
     * merely dimmed. `stagger` goes with durIn because with durIn 0 the units still pop in one at a
     * time; `durIn` cannot simply be deleted either, since it defaults to 0.6 when absent. */
    /* Time-driven canvas effects run on "seconds since this clip began" (FM.fxLocalTime), so without
     * this the tail half restarts them at the cut — Drift jumped 211px of a 320px canvas. Chains, so
     * splitting an already-split half stays correct. */
    B.fxTimeOffset = (parseFloat(layer.fxTimeOffset) || 0) + into;
    /* Children resolve their parent at any absolute time, so without a shared lineage they keep
     * following the HEAD half — which has just had its keyframes truncated at the cut and therefore
     * stops moving. Both halves are stamped, so `!p.splitOf` stays the cheap gate in FM.parentAt. */
    { const lineage = layer.splitOf || layer.id; layer.splitOf = lineage; B.splitOf = lineage; }
    if (layer.textAnim) layer.textAnim.durOut = 0;
    if (B.textAnim) { B.textAnim.durIn = 0; B.textAnim.stagger = 0; }
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
          // `split: 1` marks this as a SEAM keyframe rather than one the user placed. A Bounce behavior
          // rings off the jump between consecutive keyframes, and an unmarked seam masks the real
          // transition that triggered the ring — see bounceDelta in js/behaviors.js (bug hunt, 21 Aug).
          const nk = { t: t, v: v, e: (b && b.e) || 'linear', split: 1 };   // inherit the cut segment's easing, not hardcoded linear
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

  /* ---- "Improve quality" (queue 203) ----------------------------------------------------------
   * His words: "so if your video or photo is low quality then you can add pixels or whatever to
   * enhance it."
   *
   * BE STRAIGHT ABOUT WHAT THIS IS. Nothing in a browser invents detail that is not in the file —
   * there is no film-and-TV "enhance", and a button that implied there was would read as broken the
   * first time it did not rescue a genuinely soft clip. What DOES help, and helps visibly, is
   * sharpening the detail that IS there once the picture is being stretched over more pixels than it
   * has. So the action is named for what it does, it tells you the real numbers, and it says plainly
   * that it is not adding detail.
   *
   * The amount is tuned to how far the clip is actually being stretched rather than being a fixed
   * dose: a 4x upscale needs a wider radius than a 1.2x one, and applying the 4x settings to a clip
   * that barely needs it produces the crunchy halo that makes "enhanced" footage look worse than the
   * original. Capped at both ends for the same reason. */
  FM.improveQuality = function (layer) {
    if (!layer || (layer.type !== 'video' && layer.type !== 'image')) return null;
    const m = FM.media.get(layer.id);
    const P = (FM.scene && FM.scene.project) || { width: 1080, height: 1920 };
    const sw = (m && m.width) || 0, sh = (m && m.height) || 0;
    if (!sw || !sh) {
      if (FM.toast) FM.toast('That clip has not reported its size yet — try again once it has loaded', 3000);
      return null;
    }
    // How far the source is stretched to fill the canvas. Compared against the PROJECT raster, which
    // is what actually gets exported — not the on-screen preview, which is a scaled-down view of it.
    const stretch = Math.max(P.width / sw, P.height / sh);
    layer.effects = layer.effects || [];
    const already = layer.effects.find(e => e && e.type === 'unsharpmask' && e._iq);
    if (already) {
      /* Toggle, not stack. Pressing it twice used to be the obvious way to "improve it more", and two
       * unsharp masks on one clip is a halo, not detail. */
      layer.effects.splice(layer.effects.indexOf(already), 1);
      if (FM.timeline) FM.timeline.rebuild();
      if (FM.inspector) FM.inspector.refresh();
      FM.requestRender(); if (FM.history) FM.history.commit();
      if (FM.toast) FM.toast('Sharpening removed', 2000);
      return { applied: false, stretch: stretch };
    }
    const inst = FM.fxRegistry.makeInstance('unsharpmask');
    if (!inst) return null;
    /* Radius follows the stretch — a softer, wider halo for a picture spread over more pixels — and
     * amount rises with it but far more gently, because overshoot is what reads as "over-sharpened".
     * Both clamped: below 1x there is nothing to recover, and past ~4x extra sharpening only
     * amplifies the compression blocks. */
    const k = Math.max(1, Math.min(4, stretch));
    inst.params = { amount: +(0.5 + 0.35 * (k - 1)).toFixed(2), radius: Math.max(1, Math.min(6, Math.round(k * 1.5))) };
    inst._iq = 1;                       // so the toggle above can find the one WE added
    layer.effects.push(inst);
    if (FM.timeline) FM.timeline.rebuild();
    if (FM.inspector) FM.inspector.refresh();
    FM.requestRender(); if (FM.history) FM.history.commit();
    if (FM.toast) {
      /* The honest sentence. It names the real ratio, and it says what this is NOT — because "improve
       * quality" invites exactly the expectation the web cannot meet, and being told up front beats
       * discovering it on a clip you were counting on. */
      const msg = stretch > 1.05
        ? 'Sharpened for a ' + (Math.round(stretch * 10) / 10) + '× stretch (' + sw + '×' + sh + ' into ' + P.width + '×' + P.height + '). This sharpens the detail that is there — it cannot add detail the file never had.'
        : 'This clip is already at or above the canvas resolution (' + sw + '×' + sh + '), so there is nothing to recover — light sharpening added anyway. Undo if it looks worse.';
      FM.toast(msg, 5200);
    }
    return { applied: true, stretch: stretch, params: inst.params };
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
      /* Named for what it DOES, not for what he asked it to be called (queue 203). "Improve quality"
         promises invented pixels; this sharpens what is there when the clip is being stretched. The
         label is the first place to be honest, and the toast is the second. */
      {
        const on = (layer.effects || []).some(e => e && e.type === 'unsharpmask' && e._iq);
        items.push({ label: on ? 'Remove sharpening' : 'Sharpen for upscaling…', action: () => FM.improveQuality(layer) });
      }
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
    /* "Save WHOLE LOOK as preset" (queue 406, correcting queue 182's wording with his own later words).
       queue 182 asked for "save layers effects as preset" because a bare "Save as preset" did not say what
       it captured — right problem, and the label it produced names the OWNER while getting the CONTENT
       wrong. The old comment even admitted it in a parenthesis: this stores the fill, stroke, shadow, blend
       mode, colour grade, corner radius AND the transform's animation as well as the effects.
       That parenthesis is what cost him an afternoon: "I assumed presets are just effects anyways so I'm
       confused". The label said effects. It is not effects. There are THREE savers in this app and each
       one now says what it takes:
         · this one              — the whole look, including movement
         · Effects card → button — the effects list and nothing else
         · an effect row's ⋯     — that ONE effect's settings */
    items.push({ label: 'Save whole look as preset…', action: () => FM.savePresetPrompt && FM.savePresetPrompt(layer) });
    items.push({ label: 'Save selection as element…', action: () => FM.saveElementPrompt && FM.saveElementPrompt() });
    // the layer extras (Flip/Fit/Clipping Mask/Outline/Extract Audio/Media Info/colour tag) used to
    // live ONLY in the desktop top-bar ⋯ — merged here so every surface shows one identical menu
    if (FM.layerMoreItems) { items.push({ sep: true }); FM.layerMoreItems(layer).forEach(it => items.push(it)); }
    /* NO Delete here (queue 221). His words, with a screenshot of this menu: "Get rid of the delete
       button in this menu." The bin icon sits in the top bar two inches away, so this was a second door
       to the most destructive action in the app — at the END of a long scrolling list, under the colour
       swatches, where a mis-tap lands. Nothing else in this menu is irreversible; that is the point. */
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
    // A missing list is not an empty one — `null.forEach` throws, and this is a public entry point with
    // two callers today and no reason to think there will not be a third (bug hunt, 21 Aug: swept over
    // all 441 subset×target combinations, every one correct; this was the only input that threw, and it
    // is not reachable from either caller — both pass a real array).
    if (!Array.isArray(ids) || !ids.length) return;
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

  /* TAKE THE SOUND OUT OF A VIDEO (queue 448). Ezra: "When you press import audio then choose from
   * camera role it should auto extract the audio from the video and make it like an audio layer."
   * Nothing new is needed to do it: FM.decodeAudio already turns any file the browser can read into an
   * AudioBuffer, FM.audioBufferToWav already writes one back out as a File (js/audio-tools.js does this
   * exact round trip for "remove vocals"), and addMediaLayer takes it from there. So it is
   * decode → WAV → import, with no new dependency.
   *
   * THREE HONEST FAILURES rather than one silent one, because each is a different thing to tell him:
   *   · the clip has NO audio track — adding a silent layer would look like the feature working;
   *   · the browser cannot decode that audio — #215's lesson, say which file and why;
   *   · the decode threw part-way.
   * In every case the video is imported AS A VIDEO instead, which is the nearest useful thing to what
   * he asked for and better than an import that does nothing.
   * ⚠️ WAV is uncompressed — roughly 10MB a minute in IndexedDB. Named in queue 448 against #430's
   * storage work; if that turns out to matter, FM.exporter.encodeM4A (v10.72) is now a real alternative. */
  async function audioFromVideo(file) {
    let buf = null;
    try { buf = await FM.decodeAudio(file); }
    catch (e) { console.warn('[import] could not decode the audio of ' + file.name, e); buf = null; }
    if (!buf || !buf.length) return null;
    const base = String(file.name || 'clip').replace(/\.[^.]+$/, '');
    return new File([FM.audioBufferToWav(buf)], base + ' (audio).wav', { type: 'audio/wav' });
  }

  // Seams for the suite (queue 448): the import decision and the extraction itself. Without them the
  // only way to test this is a real file picker, which no test can drive.
  FM._handleFiles = function (files) { return handleFiles(files); };
  FM._audioFromVideo = function (file) { return audioFromVideo(file); };

  async function handleFiles(files) {
    // Consumed here, once, for THIS batch — see audioImport in js/addmenu.js.
    const wantAudio = !!FM._wantAudioOnly; FM._wantAudioOnly = false;
    for (const file of files) {
      try {
        const kind = mediaKind(file);
        if (wantAudio && kind === 'video') {
          if (FM.loadingDot) FM.loadingDot.check();
          if (FM.toast) FM.toast('Taking the audio out of “' + (file.name || 'that clip') + '”…', 2200);
          const wav = await audioFromVideo(file);
          if (wav) {
            FM.addMediaLayer(await FM.loadVideoFile(wav));
            if (FM.toast) FM.toast('Added the audio from “' + (file.name || 'that clip') + '”');
          } else {
            // Say what happened and still do the useful thing, rather than importing nothing.
            if (FM.toast) FM.toast('No sound could be read from “' + (file.name || 'that clip') + '” — added it as a video instead', 5200);
            FM.addMediaLayer(await FM.loadVideoFile(file));
          }
          continue;
        }
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
  /* PREFS SCHEMA 2 (queue 173). Ezra: "Quality should default on high."
   * Changing the <option selected> alone would have been a fix that only worked on a device that had
   * never exported: since queue 121 the quality IS remembered, so his own browser would have restored
   * the Medium it saved months ago and he would have reported the same thing again. So prefs written
   * before this change drop their remembered quality exactly once, which lets the new default win, and
   * the next save stamps v:2 so a quality chosen from here on is kept. */
  const EXP_PREFS_V = 2;
  function expPrefsRead() {
    let p; try { p = JSON.parse(localStorage.getItem(EXP_PREFS)) || {}; } catch (e) { return {}; }
    if (p.v !== EXP_PREFS_V) delete p.quality;
    return p;
  }
  /* WHAT EXPORT REMEMBERS, AND WHAT IT INHERITS (queue 121).
   * Ezra: "the settings menu and export menu should replicate each other, so if I change a setting in
   * the cog it should go to the export section as that" — and then the half that decides the design:
   * "But if you change a setting in the export menu it shouldn't change the cog menu."
   * So the cog is the SOURCE OF TRUTH and export inherits from it. A naive two-way binding is exactly
   * what he ruled out — but so is what this used to do, which was subtler and had the same effect:
   * export REMEMBERED its frame rate and resolution and restored them on the next open, so a choice
   * made once outranked the cog forever. Set the project to 48fps in Canvas settings and the dialog
   * still opened on the 60 you picked last week. The cog was not the source of truth; the memory was.
   * The split is by OWNERSHIP, which also keeps the earlier "remember my export quality" request
   * intact:
   *   · fps and resolution are the COG's — they inherit every time, and an export-time change is a
   *     one-off for that export;
   *   · format and quality belong to nothing else, so they are remembered as before. */
  function expPrefsSave() {
    const g = id => document.getElementById(id);
    try {
      localStorage.setItem(EXP_PREFS, JSON.stringify({
        v: EXP_PREFS_V,
        format: (g('exp-format') || {}).value || 'mp4',
        quality: (g('exp-quality') || {}).value || '',
      }));
    } catch (e) {}
  }
  FM._expPrefsSave = expPrefsSave;   // the suite writes the memory directly, to prove it is not consulted for fps/res
  function expPrefsApply() {
    const p = expPrefsRead(), g = id => document.getElementById(id);
    const set = (id, v) => { const el = g(id); if (el && v != null && v !== '' && [].some.call(el.options, o => o.value === String(v))) el.value = String(v); };
    set('exp-format', p.format); set('exp-quality', p.quality);
    // Deliberately NOT restoring fps or resolution — see above. They come from the project every time.
  }
  /* THE REMINDER GATE (queue 139). Ezra: "so anytime you press export it'll give you a pop up first
   * showing the reminder."
   * It lives HERE rather than on the buttons because showExportDialog is the one funnel every export
   * route already goes through — the top-bar button, the phone bar, and home's ⋯ → Export video all
   * call it — so gating it once covers all of them and cannot drift when a fourth route appears.
   * It resolves immediately when nothing is ticked, so an ordinary export is not made slower by a
   * feature that has nothing to say. */
  async function showExportDialog() {
    /* STOP THE TRANSPORT FIRST (queue 247). Ezra: "when you open the export menu playback should pause."
     * Before the notepad confirm on purpose — that is itself a modal, so leaving the transport running
     * through it would keep the very thing he is complaining about, just behind one more sheet. And
     * before the dialog builds, because the resolution presets are read off the project while the
     * playhead may still be moving.
     * Guarded on FM.playing so it cannot disturb a paused transport or bump the play generation for
     * nothing — every FM.pause() invalidates an in-flight requestPlay (see the note at the top of this
     * file), and calling it unconditionally on a dialog open is exactly the kind of thing that causes a
     * later "I pressed play and nothing happened". */
    if (FM.playing) FM.pause();
    if (FM.notepad && FM.notepad.confirmExport) {
      const go = await FM.notepad.confirmExport();
      if (!go) return;
    }
    return showExportDialogNow();
  }
  function showExportDialogNow() {
    // Build resolution presets from THIS project's size. "p" = the shorter side (1080p portrait =
    // 1080 wide); value stays a SCALE factor so the exporter math is unchanged. Full first, then
    // each standard rung below the native short side (downscale only — no blurry upscales), each
    // labelled with its exact output pixels.
    const P = FM.scene.project, W = P.width, H = P.height, shortSide = Math.min(W, H);
    /* Queue 141: name the project's OWN frame rate on the "Same as project" option, and make it the
       selection whenever the project's rate is not one of the fixed rungs — which is the whole defect
       he reported ("if you made a custom fps or other things etc there's no way to export at that").
       Built here rather than in the markup for the same reason the resolution list is: it depends on
       the project. */
    const fpsSel = document.getElementById('exp-fps');
    if (fpsSel) {
      const pf = Math.round((P.fps || 30) * 100) / 100;
      const same = fpsSel.querySelector('option[value="project"]');
      if (same) same.textContent = 'Same as project — ' + pf + ' fps';
      /* RESET TO THE PROJECT ON EVERY OPEN (queue 121, fixed 22 Aug). This used to reset only when the
         project's rate was OFF the ladder — `if (!onLadder)` — which meant that for almost every real
         project (15/25/30/50/60/120 all being rungs) a rate picked once stayed selected for the rest of
         the session. Measured: project at 25, pick 60 for one export, change the project to 50 in the
         cog, reopen Export → it still read 60. That is the exact thing #121 asked for the opposite of —
         *"Settings ↔ Export should mirror ONE WAY"*, the cog being the source of truth — and the comment
         on expPrefsApply already claimed it ("They come from the project every time"). The prose was
         right and the code was not, same shape as the stray `selected` in #471 and the stale FPS mirror
         in #118. The "project" rung is labelled with the real rate, so it always reads correctly. */
      fpsSel.value = 'project';
      /* The Custom row (queue 141), wired exactly like the resolution's syncCustom below. Seeded from the
         project so it opens on something valid rather than empty, and the listener is guarded so repeated
         opens do not stack handlers. Not persisted: #121 makes the cog the source of truth, so a custom
         export rate is a one-off override for this render. */
      const fpsCf = document.getElementById('exp-custom-fps');
      const fpsNum = document.getElementById('exp-fps-num');
      const syncCustomFps = () => {
        const on = fpsSel.value === 'custom';
        if (fpsCf) fpsCf.classList.toggle('hidden', !on);
        if (on && fpsNum && !fpsNum.value) fpsNum.value = pf;
      };
      if (!fpsSel._customWired) { fpsSel._customWired = 1; fpsSel.addEventListener('change', syncCustomFps); }
      syncCustomFps();
    }
    const sel = document.getElementById('exp-res');
    if (sel) {
      /* NO CARRY-OVER OF THE PREVIOUS PICK (queue 121). See the fps note above — and this half was worse,
         because the value stored here is a SCALE, not a size. Measured: pick 720p on a 1080×1920 project
         (scale 0.667), resize the canvas to 2160×3840 in the cog, reopen Export → the same 0.667 re-applied
         and now read "1440p — 1440×2560". A resolution chosen for one project silently followed into a
         different one as a size he never picked. The list is rebuilt with "Same as project" first, so
         dropping the restore lands there naturally. */
      sel.innerHTML = '';
      const add = (val, label) => { const o = document.createElement('option'); o.value = val; o.textContent = label; sel.appendChild(o); };
      /* "SAME AS PROJECT", not "Full" (queue 172). Ezra: "Resolution should have a same as project
         option as well" — and it always did; this top rung IS the project's own size. The word was the
         problem. The frame-rate list right above it says "Same as project — 30 fps", so a list that
         answered the same question with a different word read as a list that did not answer it. */
      add(1, 'Same as project — ' + W + '×' + H);
      [2160, 1440, 1080, 720, 480, 360].forEach(t => {
        if (t < shortSide - 1) { const s = t / shortSide; add(s, t + 'p — ' + Math.round(W * s) + '×' + Math.round(H * s)); }
      });
      /* CUSTOM SIZE, last (queue 141). Ezra: "there's no way to do custom export ratios, or fps."
         Every rung above is a uniform SCALE of the project, so the list could only ever offer the
         project's own aspect. This one hands width and height to the exporter directly. */
      add('custom', 'Custom size…');
      // …and it opens on the project's own size, every time (queue 121).
      const cf = document.getElementById('exp-custom-field');
      const cw = document.getElementById('exp-cw'), ch = document.getElementById('exp-ch');
      const syncCustom = () => {
        const on = sel.value === 'custom';
        if (cf) cf.classList.toggle('hidden', !on);
        // Seed from the project the first time, so it opens on something valid rather than empty.
        if (on && cw && !cw.value) cw.value = W;
        if (on && ch && !ch.value) ch.value = H;
      };
      if (!sel._customWired) { sel._customWired = 1; sel.addEventListener('change', syncCustom); }
      syncCustom();
    }
    // 'Selected clip only' and the solo checkbox need a selection — grey them out otherwise
    const selLayer = FM.selectedLayer ? FM.selectedLayer(FM.scene) : null;
    const rangeSel = document.getElementById('exp-range');
    if (rangeSel) {
      const clipOpt = [].find.call(rangeSel.options, o => o.value === 'clip');
      if (clipOpt) clipOpt.disabled = !selLayer;
      if (!selLayer && rangeSel.value === 'clip') rangeSel.value = 'whole';
    }
    /* The layer picker (queue 174). It opens on "All layers" every time rather than remembering a
     * choice: soloing one layer is a deliberate, one-off thing to do to an export, and an export that
     * silently repeats last week's solo would produce a file with most of the project missing and no
     * clue why. Deliberately NOT in the remembered prefs for the same reason. */
    expSoloId = null;
    bindSoloBtn();   // the dialog's markup exists from the start, but bind lazily so this is the only entry point
    syncSoloBtn();
    expPrefsApply();   // after the resolution list is rebuilt for THIS project, so the match can land
    syncExportFormat();
    document.getElementById('export-dialog').classList.remove('hidden');
    /* POP OUT OF THE ⬆️ BUTTON (queue 548). It opened dead centre at 555,249 with no animation.
       After the class is removed, because popFrom measures the card and a hidden card has no size. */
    if (FM.popFrom) {
      if (FM._expPop) { FM._expPop(); FM._expPop = null; }
      const card = document.querySelector('#export-dialog .export-card');
      FM._expPop = FM.popFrom(card, document.getElementById('btn-export'));
    }
    checkExportAudioSupport();
  }

  /* ═══ SAY THE EXPORT WILL BE SILENT BEFORE HE RENDERS IT, NOT AFTER (queue 215).
   *
   * His report is *"I just exported and got no audio even tho the video had audio."* v7.91 found the
   * cause and made it speak — the browser refusing to encode AAC — but it speaks DURING the export,
   * after he has already waited out a render. The entry itself records the crucial property: **AAC
   * support belongs to the BROWSER, not to the project or the settings.** So it is knowable the
   * moment the dialog opens, before he has committed anything to it.
   *
   * A block in the card rather than a toast, deliberately: a toast about a render he has not started
   * yet would be gone by the time he pressed Export.
   *
   * TWO CONDITIONS, and the second is what stops this being noise: the browser must actually refuse
   * AAC, AND the project must actually have sound to lose. Warning "this will be silent" on a project
   * with no audio in it is a false alarm on every silent animation he ever exports. */
  let _aacOK = null;
  FM.canEncodeAAC = async function () {
    if (_aacOK !== null) return _aacOK;
    if (typeof AudioEncoder === 'undefined') { _aacOK = false; return false; }
    try {
      const s = await AudioEncoder.isConfigSupported({ codec: 'mp4a.40.2', sampleRate: 48000, numberOfChannels: 2, bitrate: 160000 });
      _aacOK = !!(s && s.supported);
    } catch (e) { _aacOK = false; }
    return _aacOK;
  };
  FM._resetAacProbe = function () { _aacOK = null; };

  /* Does this project have anything to lose? Audio rides the 'video' layer type (an mp3 becomes a
   * 0x0 'video' layer — see the compositor), so the test is "a layer with a media record that is not
   * silenced", not "a layer of type audio". */
  FM.projectHasAudio = function () {
    const ls = (FM.scene && FM.scene.layers) || [];
    return ls.some(l => {
      if (l.type !== 'video' || l.muted) return false;
      const m = FM.media && FM.media.get && FM.media.get(l.id);
      return !!m;
    });
  };

  /* WHICH FORMATS CAN ACTUALLY BE SILENCED BY A MISSING AAC ENCODER (queue 495). Only the two that
     encode AAC. WAV comes out of OfflineAudioContext as raw samples and needs no codec at all — which
     is the stated reason it is the first audio option — and GIF / PNG frames have no soundtrack to
     lose. The check used to run once when the dialog opened and never again, so picking WAV left the
     biggest, loudest thing in the dialog telling him the export would be silent, about the one option
     that cannot fail for want of a codec. */
  const AAC_FORMATS = { mp4: 1, audiom4a: 1 };
  let _audioWarnSeq = 0;
  async function checkExportAudioSupport() {
    const seq = ++_audioWarnSeq;
    const box = document.getElementById('exp-noaudio-warn');
    if (!box) return false;
    box.classList.add('hidden'); box.textContent = '';
    if (!FM.projectHasAudio()) return false;
    const fmt = (document.getElementById('exp-format') || {}).value || 'mp4';
    if (!AAC_FORMATS[fmt]) return false;
    if (await FM.canEncodeAAC()) return false;
    /* …and the answer above is awaited, so a fast switch from MP4 to WAV could otherwise let THIS
       call finish afterwards and put the warning back on a format it does not apply to. */
    if (seq !== _audioWarnSeq) return false;
    box.textContent = '';
    const b = document.createElement('b');
    b.textContent = 'This export will have no sound. ';
    box.appendChild(b);
    box.appendChild(document.createTextNode(
      'This browser cannot encode AAC audio. The picture will be fine. To keep the sound, open FreeMotion in Safari and export there.'));
    box.classList.remove('hidden');
    return true;
  }
  FM._checkExportAudioSupport = checkExportAudioSupport;
  /* WHICH layer the export should isolate — null means all of them (queue 174). Held here rather than
   * read off the selection, because the whole point of the change is that you can pick a layer without
   * first selecting it. The hidden #exp-solo-clip mirrors it so the export path below, and anything
   * else that reads that field, keeps one thing to look at. */
  let expSoloId = null;
  // Read by the suite: which layer the export will isolate, null for all of them. Exposed because the
  // solo itself happens deep inside run(), so without this the picker's EFFECT is untestable and only
  // its label gets guarded — which is how a control that looks right but does nothing ships.
  FM._exportSoloId = () => expSoloId;
  function syncSoloBtn() {
    const btn = document.getElementById('exp-solo-btn');
    const L = expSoloId ? FM.layerById(FM.scene, expSoloId) : null;
    if (!L) expSoloId = null;
    if (!btn) return;
    btn.textContent = L ? (L.name || L.type || 'Layer') : 'All layers';
    btn.classList.toggle('btn-accent', !!L);
    btn.title = L ? 'Exporting only "' + (L.name || L.type) + '" — press to change' : 'Export every layer — press to isolate one';
  }
  function bindSoloBtn() {
    const btn = document.getElementById('exp-solo-btn');
    if (!btn || btn._bound) return;
    btn._bound = 1;
    btn.addEventListener('click', () => {
      if (!FM.contextMenu) return;
      const r = btn.getBoundingClientRect();
      const items = [{ label: 'All layers', action: () => { expSoloId = null; syncSoloBtn(); } }, { sep: true }];
      // Top-down, the order they read on the timeline, so the list matches what he is looking at.
      FM.scene.layers.slice().reverse().forEach(l => {
        items.push({ label: (l.name || l.type || 'Layer'), action: () => { expSoloId = l.id; syncSoloBtn(); } });
      });
      if (items.length <= 2) { if (FM.toast) FM.toast('This project has no layers to isolate', 1800); return; }
      FM.contextMenu.show(Math.max(8, r.right - 230), r.bottom + 6, items);
    });
  }
  /* THE ONE PLACE THE EXPORT FRAME RATE IS DECIDED — and it is exposed on purpose (queue 141).
   * The suite must drive THIS, not a copy of it. The first test written for the Custom rung
   * reimplemented these three branches inside the test file, so deleting the custom branch from the app
   * left every assertion green: it was checking its own arithmetic, not the app's. A helper both sides
   * call is the only version of that test that can fail.
   *  · 'project' → the project's own rate, custom values included.
   *  · 'custom'  → whatever is typed, clamped to the same 1-120 the canvas dialog allows, falling back to
   *                the project's rate when the box is empty, zero or unreadable.
   *  · anything else → the rung's own value. */
  FM._exportFps = function () {
    const sel = document.getElementById('exp-fps');
    const raw = sel ? sel.value : 'project';
    const proj = (FM.scene && FM.scene.project && FM.scene.project.fps) || 30;
    if (raw === 'project') return proj;
    if (raw === 'custom') {
      const el = document.getElementById('exp-fps-num');
      const typed = Math.round(parseFloat(el && el.value));
      return Math.max(1, Math.min(120, typed || proj));
    }
    return parseFloat(raw) || 30;
  };

  function hideExportDialog() {
    if (FM._expPop) { FM._expPop(); FM._expPop = null; }   // or the card keeps `position: fixed` and the button stays lifted
    document.getElementById('export-dialog').classList.add('hidden');
  }

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
    /* AUDIO ONLY hides everything about the PICTURE (queue 216). The entry asks for exactly this —
       "the export dialog's resolution/fps controls should hide themselves when it is chosen, rather
       than sitting there meaning nothing". A control that cannot affect the output is worse than no
       control: it invites you to set it and then quietly ignores you. */
    const audioOnly = fmt === 'audio' || fmt === 'audiom4a';
    ['exp-res', 'exp-fps', 'exp-custom-field', 'exp-custom-fps', 'exp-transparent-field'].forEach(function (id) {
      const n = document.getElementById(id);
      const f = n && (n.classList.contains('field') ? n : (n.closest('.field') || n.parentElement));
      if (!f) return;
      if (audioOnly) { f.dataset.audioHid = '1'; f.classList.add('hidden'); }
      else if (f.dataset.audioHid) { delete f.dataset.audioHid; if (id !== 'exp-custom-field' && id !== 'exp-custom-fps' && id !== 'exp-transparent-field') f.classList.remove('hidden'); }
    });
    const go = document.getElementById('exp-go');
    if (go) go.textContent = fmt === 'gif' ? 'Export GIF' : (fmt === 'frames' ? 'Export frames'
      : (audioOnly ? 'Export audio' : (fmt === 'frame' ? 'Save frame' : 'Export MP4')));
    /* The silent-export warning belongs to the FORMAT, so it is re-asked whenever the format changes
       (queue 495). Deliberately not awaited: this runs on every change of the dropdown, and the answer
       is cached — the sequence guard inside is what keeps a slow first answer from landing late. */
    checkExportAudioSupport();
  }

  // Seam: the dialog's own format sync. Without it the M4A option can only be checked as MARKUP, and a
  // format that is listed but not wired into audioOnly would ship looking correct — the same "a control
  // that looks right but does nothing" trap FM._exportSoloId exists for.
  FM._syncExportFormat = syncExportFormat;

  /* WHICH RANGE IS BEING EXPORTED — one definition, read by the video path and the audio-only path
   * (queue 216). Pulled out of runExport rather than copied, because two copies of "whole project /
   * this clip / the loop region" is exactly how an audio export ends up covering a different span
   * from the video it is supposed to accompany. Returns nulls for "the whole project", which is what
   * the exporter already treats as its default. */
  function exportRange() {
    const P = FM.scene.project;
    const rangeEl = document.getElementById('exp-range');
    const selLayer = FM.selectedLayer ? FM.selectedLayer(FM.scene) : null;
    if (rangeEl && rangeEl.value === 'clip') {
      if (!selLayer) { if (FM.toast) FM.toast('Select a clip first, then export', 2200); return { stop: true }; }
      const f = Math.max(0, selLayer.start), t = Math.min(P.duration, selLayer.start + selLayer.duration);
      if (!(t > f)) { if (FM.toast) FM.toast('That clip sits outside the project — nothing to export', 2200); return { stop: true }; }
      return { from: f, to: t };
    }
    if (rangeEl && rangeEl.value === 'loop') {
      /* CLAMPED, exactly like the clip branch above — the two were not equally careful, and the loop
         one returned `{ from: P.loopIn, to: P.loopOut }` RAW (bug hunt, 21 Aug).
         `autoFitDuration` does tidy a stale region, so a loopOut past the end is corrected by the next
         refreshAll and a reopen comes back clamped — measured (tests/_looprange.html): loopOut 999 with
         a 4s project came back as 4. But it only ever looks UPWARD (`loopOut > end`), so a NEGATIVE
         loopIn reaches here untouched: measured `{from: -5, to: 3}`, which would start the render
         before the project does.
         Reaching that needs a document the UI did not write — `markRegionIn` stores `FM.time`, which is
         never negative — so this is hardening of the same class as the load-path sanitisers, not
         something he can hit today. It costs one line and removes the asymmetry that made it possible. */
      if (FM.hasLoopRegion && FM.hasLoopRegion()) {
        const lf = Math.max(0, Math.min(P.duration, +P.loopIn));
        const lt = Math.max(0, Math.min(P.duration, +P.loopOut));
        if (isFinite(lf) && isFinite(lt) && lt > lf) return { from: lf, to: lt };
        // Fall through to the whole project rather than export a nonsense span.
      }
      if (FM.toast) FM.toast('No region marked — press [ and ] or use the ⋯ menu to mark one; exporting whole project', 2600);
    }
    return { from: null, to: null };
  }
  FM.exportRange = exportRange;

  /* The soundtrack, on its own, as a WAV (queue 216). WAV rather than m4a on purpose: the mix comes
   * out of OfflineAudioContext as raw samples and WAV needs no codec, which matters because #215
   * established that a browser can simply refuse to encode AAC. An audio export that cannot fail for
   * want of a codec is worth more than a smaller one that sometimes hands you silence. */
  async function runAudioOnlyExport(opts) {
    const wantM4A = opts && opts.m4a !== undefined
      ? !!opts.m4a
      : ((document.getElementById('exp-format') || {}).value) === 'audiom4a';
    const P = FM.scene.project;
    const range = exportRange();
    if (range.stop) return;
    const from = range.from == null ? 0 : range.from;
    const to = range.to == null ? (P.duration || 0) : range.to;
    if (!(to > from)) { if (FM.toast) FM.toast('Nothing to export — the range is empty'); return; }
    if (FM.toast) FM.toast('Mixing audio…', 1500);
    let mix = null;
    try { mix = await FM.exporter.buildAudioMix(FM.scene, from, to); }
    catch (e) { console.warn('audio-only mix failed', e); mix = null; }
    if (!mix) {
      // buildAudioMix already toasts WHY when it drops clips (v7.90); this covers "there was no audio
      // at all", which is otherwise an export that silently produces a file of silence.
      if (FM.toast) FM.toast('No audio to export — nothing in this range makes a sound', 3500);
      return;
    }
    /* buildAudioMix returns { audioBuffer, sampleRate, channels }, NOT a bare AudioBuffer — handing
       the wrapper straight to encodeWav produced no file at all, silently. Caught by running the
       export for real against a synthesised tone rather than trusting the shape. */
    const abuf = mix.audioBuffer || mix;
    /* M4A IS AN OPT-IN THAT FALLS BACK, NEVER A SILENT FAILURE (queue 395, and queue 215's lesson).
       AAC is a property of the BROWSER, not of the project — the same file exports with sound in one and
       without it in another — so the format he picked is attempted, and if this browser cannot do it the
       export SAYS WHY and writes the WAV rather than producing nothing or, worse, an empty track that
       plays silently in one player and is refused by another. */
    let blob = null, ext = 'wav', fellBack = '';
    if (wantM4A && FM.exporter && FM.exporter.encodeM4A) {
      let r = null;
      try { r = await FM.exporter.encodeM4A(mix); }
      catch (e) { console.warn('m4a export failed', e); r = null; }
      if (r && r.blob) { blob = r.blob; ext = 'm4a'; }
      else fellBack = (r && r.reason) || 'failed';
    }
    if (!blob) {
      try { blob = FM.sfx && FM.sfx.encodeWav ? FM.sfx.encodeWav(abuf) : null; }
      catch (e) { console.warn('wav encode failed', e); blob = null; }
      ext = 'wav';
    }
    if (!blob) { if (FM.toast) FM.toast('Could not write the audio file'); return; }
    if (fellBack && FM.toast) {
      FM.toast(fellBack === 'aac-unavailable' || fellBack === 'no-muxer'
        ? 'This browser cannot encode AAC — exported as WAV instead'
        : 'The M4A encode failed — exported as WAV instead', 5200);
    }
    FM._lastAudioExport = { ext: ext, fellBack: fellBack, bytes: blob.size };   // read by the suite
    const name = ((P.name || 'project').replace(/[^\w\- ]+/g, ' ').replace(/\s+/g, ' ').trim()) || 'project';
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = name + '.' + ext;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    if (FM.toast) FM.toast('Audio exported — ' + (Math.round((to - from) * 10) / 10) + 's', 2600);
  }
  FM._runAudioOnlyExport = runAudioOnlyExport;   // read by the suite

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
    /* AUDIO ONLY (queue 216) — handled here for the same reason the single frame is: it shares almost
       nothing with the video encoders. No renderer, no bitrate, no frame loop, no resume; just the
       mix the exporter already builds, written straight out.
       It reuses buildAudioMix, which is the SAME mixer the MP4 path uses, so this cannot drift into
       a second definition of "the soundtrack" that disagrees with the video — and it inherits the
       drop reporting added in v7.90 for free, so a clip the mixer cannot read still says so. */
    const _fmt = ((document.getElementById('exp-format') || {}).value);
    if (_fmt === 'audio' || _fmt === 'audiom4a') {
      await runAudioOnlyExport();
      return;
    }
    /* Custom size hands the exporter explicit dimensions; every other rung is a uniform scale of the
       project (queue 141). The frame is CONTAINED in whatever is typed — see FM.exportFitRect. */
    const resVal = document.getElementById('exp-res').value;
    const isCustom = resVal === 'custom';
    const scale = isCustom ? 1 : (parseFloat(resVal) || 1);
    const cwEl = document.getElementById('exp-cw'), chEl = document.getElementById('exp-ch');
    const clampDim = (v, fallback) => {
      const n = Math.round(parseFloat(v));
      return (isFinite(n) && n >= 16) ? Math.min(7680, n) : fallback;
    };
    const outW = isCustom ? clampDim(cwEl && cwEl.value, FM.scene.project.width) : 0;
    const outH = isCustom ? clampDim(chEl && chEl.value, FM.scene.project.height) : 0;
    // 'project' resolves to the project's own rate, custom values included (queue 141).
    const fps = FM._exportFps();
    const qEl = document.getElementById('exp-quality');
    const qf = (qEl && parseFloat(qEl.value)) || 0.1;
    const P = FM.scene.project;
    // Sized off the REAL output, which is not P*scale once a custom size is in play (queue 141) —
    // otherwise a large custom render would be encoded at the project's bitrate and look starved.
    const bpW = outW || (P.width * scale), bpH = outH || (P.height * scale);
    const bitrate = Math.min(80e6, Math.round(bpW * bpH * fps * qf));
    // Resolve the range BEFORE showing the overlay so early exits can bounce back to the dialog.
    const rr = exportRange();
    if (rr.stop) { showExportDialog(); return; }
    let from = rr.from, to = rr.to;
    const overlay = document.getElementById('export-overlay');
    const bar = document.getElementById('export-bar');
    const status = document.getElementById('export-status');
    overlay.classList.remove('hidden');
    if (FM.playing) FM.pause();
    // 'Hide other layers' — temporarily solo the selected clip (solo already isolates picture AND
    // audio at render/export/preview). Restored in finally even on error/cancel; no history commit.
    // Solo the layer the PICKER chose (queue 174). One source of truth — the old checkbox is gone, so
    // there is no second way to ask for this and nothing to keep in step.
    const soloTarget = expSoloId ? FM.layerById(FM.scene, expSoloId) : null;
    let soloRestore = null;
    if (soloTarget) {
      soloRestore = FM.scene.layers.map(l => [l, l.solo]);
      soloTarget.solo = true;
      if (soloTarget.type === 'group' && FM.groupDescendants) FM.groupDescendants(soloTarget.id).forEach(l => { l.solo = true; });
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
        await FM.exporter.run({ scale, fps, bitrate, name: expName, from, to, outW, outH, onProgress,
                                onReady: showExportReady });
      }
      /* The MP4 path now ends on its own card, which has already said what happened and hidden the
       * progress overlay — repeating "saved to your Downloads" behind it would be a second, and often
       * wrong, answer (it may have gone to Photos, or been discarded). Every other format still
       * downloads straight away and still gets told so. (queue 141 part 4) */
      if (fmt !== 'mp4') {
        status.textContent = 'Done — saved to your Downloads.';
        setTimeout(() => overlay.classList.add('hidden'), 900);
      } else {
        overlay.classList.add('hidden');
      }
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

  /* "Export ready" — our card in front of the OS save sheet (queue 141 part 4).
   *
   * Ezra: "Maybe instead of the apple pop up we should have our own pop up so it looks finished and
   * good." The sheet itself is not ours to replace: navigator.share only opens from a real user
   * gesture, and nothing on the web writes to a camera roll without it. What WAS ours — and what made
   * it feel unfinished — is that the sheet arrived unannounced the instant the render stopped, with no
   * sight of what had been made. Now the render ends on this, and the sheet opens because Save was
   * pressed.
   *
   * It also fixes a real defect rather than just dressing one up. exporter.js's deliver() has always
   * had to fall back to a plain download when a long render outlived the tap that started it, because
   * share() needs transient activation and a five-minute export has none left. Save is a fresh tap, so
   * the sheet can actually open — the fallback stops being the common case on exactly the long exports
   * where landing the file in Photos matters most.
   *
   * Returns a promise the exporter awaits, so `finally` (which frees the export frame caches and drops
   * the crash-resume data) does not run until the file has been handed over or deliberately discarded. */
  function showExportReady(out) {
    return new Promise(function (resolve) {
      const overlay = document.getElementById('export-ready');
      const prog = document.getElementById('export-overlay');
      if (!overlay) { out.save().then(resolve, resolve); return; }   // no card in this document — behave as before
      if (prog) prog.classList.add('hidden');

      const poster = document.getElementById('xr-poster');
      if (poster && out.poster) {
        poster.width = out.poster.width; poster.height = out.poster.height;
        poster.getContext('2d').drawImage(out.poster, 0, 0);
        poster.classList.remove('hidden');
      } else if (poster) { poster.classList.add('hidden'); }

      document.getElementById('xr-name').textContent = out.name;
      // Size, length and shape — the three things you would check before saving, and the three the OS
      // sheet does not tell you. MB to one decimal: a file is not interesting to the byte.
      const mb = (out.blob.size / 1048576);
      const secs = Math.round(out.seconds || 0);
      const mmss = Math.floor(secs / 60) + ':' + String(secs % 60).padStart(2, '0');
      document.getElementById('xr-meta').textContent =
        (mb < 0.1 ? (Math.round(out.blob.size / 1024) + ' KB') : (mb.toFixed(1) + ' MB')) +
        ' · ' + mmss + ' · ' + out.width + '×' + out.height + ' · ' + Math.round(out.fps) + ' fps';

      const saveBtn = document.getElementById('xr-save');
      const discardBtn = document.getElementById('xr-discard');
      let done = false;
      function finish() {
        if (done) return; done = true;
        saveBtn.removeEventListener('click', onSave);
        discardBtn.removeEventListener('click', onDiscard);
        overlay.classList.add('hidden');
        resolve();
      }
      function onSave() {
        // Disabled while the sheet is up: a second tap would open a second share sheet for the same
        // file, and on iOS that is a sheet that never closes.
        saveBtn.disabled = true;
        out.save().then(function () { finish(); }, function () { finish(); });
      }
      function onDiscard() { finish(); }
      saveBtn.disabled = false;
      saveBtn.addEventListener('click', onSave);
      discardBtn.addEventListener('click', onDiscard);
      overlay.classList.remove('hidden');
      saveBtn.focus();
    });
  }
  FM._showExportReady = showExportReady;   // exposed for the suite; nothing in the app calls it by name

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
    /* THE SELECTION OUTLINE HAS TO BE TOLD (queue 284). Ezra: "when you drag the timeline up and down
       while having a layer selected the layers outline starts moving somewhere else, when you press
       back on a layer it goes back to normal but this shouldnt be happening."
       The gizmo is laid out in SCREEN pixels against the preview's box, and dragging either resizer
       changes that box without the WINDOW resizing — so canvas-edit's `resize` listener never hears
       about it and the outline keeps the geometry it had. Measured before the fix at 1280x800: the
       canvas went 197px wide to 300 and the outline stayed put, landing at 0.33 across the frame
       instead of dead centre on the layer.
       Called explicitly rather than observed: a ResizeObserver on #preview logs zero callbacks in the
       browser this is developed and tested against, which is why the same fix was written and reverted
       once already. */
    const stageResized = () => {
      if (FM.canvasEdit && FM.canvasEdit.stageResized) FM.canvasEdit.stageResized();
      /* …AND THE PREVIEW ITSELF (BUG-HUNT, the entry queue 284 named as "the same root cause, so fix
         both together rather than twice"). Nothing re-ran resizeCanvas when the stage changed size —
         there is no window resize hook for it anywhere in the codebase — so a zoomed preview kept a
         pinned wrap box and rendered stretched, and even unzoomed the backing store stayed at a stale
         resolution (measured: 961x1709 painted every frame where 367x653 was correct, 6.8x the pixels).
         It goes through the SAME door as the selection gizmo for the same reason that door exists: the
         ResizeObserver this was originally written around fires in neither browser available here, which
         is why the fix was attempted and reverted once already. `refreshPreviewScale` debounces 120ms,
         so a drag re-measures once at the end rather than reallocating per frame. */
      if (FM.refreshPreviewScale) FM.refreshPreviewScale();
    };

    const clampH = (h) => {
      const vh = window.innerHeight;
      const ceil = vh >= 504 ? Math.round(vh * 0.72) : Math.max(150, Math.round(vh * 0.46));
      return Math.max(150, Math.min(ceil, h));
    };
    FM.clampTimelineH = clampH;   // exposed so the suite tests the clamp that actually runs, not a copy of it
    let saved = 0;
    try { saved = parseInt(localStorage.getItem('fm_tl_h') || '', 10) || 0; } catch (_) {}
    if (saved && !isPhone()) root.style.setProperty('--tl-h', clampH(saved) + 'px');
    /* SHARED BY BOTH RESIZERS (queue 244). The snap belongs to the LINE between the two, not to one
       handle: "if you start dragging it back down and hit the level of the timeline it should pause and
       snap for a second, showing a little blue flash… and also dragging the timeline brings the add menu
       with it… until you reach to where the add menu is at then it will do the same thing but the other
       way around by snapping them back together." One flag, one flash, so a gesture from either side
       cannot fire it twice or leave the other side unable to. */
    const STICK244 = 9;
    let snapFlashed = false;
    const flashDivider = () => {
      if (snapFlashed) return;
      snapFlashed = true;
      const p = document.getElementById('inspector-panel');
      if (!p) return;
      p.classList.remove('am-snap'); void p.offsetWidth; p.classList.add('am-snap');
      setTimeout(() => p.classList.remove('am-snap'), 420);
    };
    const amHeightNow = () => parseInt(getComputedStyle(root).getPropertyValue('--am-h'), 10) || 0;

    let dragging = false, startY = 0, startH = 0;
    rez.addEventListener('pointerdown', (e) => {
      if (isPhone()) return;
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      dragging = true; startY = e.clientY; snapFlashed = false;
      const panel = document.getElementById('timeline-panel');
      startH = panel ? panel.getBoundingClientRect().height : 232;
      document.body.classList.add('tl-resizing');
      try { rez.setPointerCapture(e.pointerId); } catch (_) {}
      e.preventDefault();
    });
    rez.addEventListener('pointermove', (e) => {
      if (!dragging) return;
      // Same lost-pointer hole as the add-menu resizer above — see the note there. (queue 511)
      if (e.pointerType === 'mouse' && e.buttons === 0) { end(); return; }
      const want = clampH(startH + (startY - e.clientY));   // drag UP → taller timeline
      /* THE OTHER DIRECTION (queue 244, the clause that was left unbuilt at v8.30): "dragging the
         timeline brings the add menu with it unless they arent connected, until you reach to where the
         add menu is at then it will do the same thing but the other way around by snapping them back
         together."
         While they are connected — the add menu is not floating — this needs nothing at all: they are
         one grid row, so the timeline's height IS the add menu's. The case to build is the raised one.
         Coming UP into a floating menu, the timeline holds at the menu's height and flashes the same
         divider, and only once the pointer has travelled the same 9px past it do the two re-couple:
         the float drops and from there one height moves both. Mirrors the add menu's own rule with the
         roles swapped, which is exactly how he described it. */
      const amH = document.body.classList.contains('am-floating') ? amHeightNow() : 0;
      if (amH && want >= amH) {
        flashDivider();
        if (want <= amH + STICK244) { root.style.setProperty('--tl-h', amH + 'px'); return; }
        if (FM.dropAddMenuFloat) FM.dropAddMenuFloat();     // snapped back together
      }
      root.style.setProperty('--tl-h', want + 'px');       // pure CSS-grid resize — no timeline reflow needed (height doesn't touch clip-x / pps math)
      stageResized();
    });
    const end = () => {
      if (!dragging) return;
      dragging = false; document.body.classList.remove('tl-resizing');
      const cur = getComputedStyle(root).getPropertyValue('--tl-h').trim();
      try { if (cur) localStorage.setItem('fm_tl_h', parseInt(cur, 10) || 232); } catch (_) {}
    };
    rez.addEventListener('pointerup', end);
    rez.addEventListener('pointercancel', end);

    /* ---- The ADD MENU drags independently, over the canvas (queue 244) -------------------------
     * His words: "Make it so you can seperatly drag up and down the add menu, on pc, but you cant
     * drag lower than what the timeline is dragged too… if you keep dragging down it drags the
     * timeline down with it… when dragging the add menu seperatly it shouldnt push the canvas to be
     * smaller but just go over the canvas."
     *
     * THAT LAST CLAUSE IS A STRUCTURAL REQUIREMENT, NOT A PREFERENCE, and measuring is what showed
     * it: in the Studio layout the inspector band and the timeline are not two things with two
     * heights — they are THE SAME GRID ROW (measured at 1280x800: both at top 616, both 264 tall,
     * 0px apart in either). So "raise the add menu while the timeline stays put" is impossible
     * inside the grid. The only way it can work at all is for the menu to leave the grid and float
     * above the stage, which is exactly what he asked for.
     * So: while dragged above the floor the panel is absolutely positioned against #app and its grid
     * slot keeps the undragged height, so nothing reflows and the canvas never shrinks. The floor is
     * the CURRENT --tl-h, read rather than re-measured — one source of truth. Pushed back down onto
     * that floor it sticks for a beat and flashes the divider; pushed past the sticky threshold it
     * writes --tl-h instead, and the timeline follows.
     * Built with the effects browser in mind, which he says is coming: "the add menu is going to
     * become a tall, resizable browser that must never cover the canvas". */
    const amRez = document.getElementById('am-resizer');
    if (amRez) {
      const STICK = STICK244;             // px of travel past the floor before the two couple (draw-tool's snapCursor uses the same idea)
      const amFloor = () => parseInt(getComputedStyle(root).getPropertyValue('--tl-h'), 10) || 232;
      const amClamp = (h) => {
        const vh = window.innerHeight;
        /* How far up it may go. This was 0.82 of the window, which leaves about 140px of stage on a
           1280x800 screen — with the sideways bug on top of it, that is the "takes up the whole
           screen" he reported. 0.62 keeps roughly a third of the window as canvas, which is the point
           of a menu that floats OVER the canvas rather than replacing it. A judgement call rather than
           a measured one, so it is a single number in one place if he wants it taller.
           ⚠️ …AND IT MUST NEVER BE LOWER THAN WHAT THE TIMELINE DRAG CAN ALREADY PRODUCE (queue 512).
           Ezra: "it gets to a limit on how far it can be dragged up by itself. But if you drag it up
           with the timeline at the same time, then it lets it drag up higher, which is really weird."
           He is describing this exactly, and the numbers are stark — measured at a 820px window: this
           ceiling is 508px, the timeline's is 590px, and the panel's FLOOR is `--tl-h`. The floor is
           applied with Math.max AFTER the Math.min below, so once the timeline has been dragged to its
           own 590 the floor overrides this ceiling and the panel goes to 590 — while dragging the panel
           on its own still stopped dead at 508. Two paths to one size, 82px apart.
           So the ceiling now asks the timeline's own clamp what IT would allow and never sits below it.
           Tied to the function rather than to a copy of the number, so the two cannot drift apart again
           — which is how they got 82px apart in the first place. */
        const ceil = Math.max(200, Math.round(vh * 0.62),
                              FM.clampTimelineH ? FM.clampTimelineH(vh) : 0);
        return Math.max(amFloor(), Math.min(ceil, h));
      };
      FM.clampAddMenuH = amClamp;         // exposed so the suite tests the clamp that runs, not a copy
      /* No layout test any more (queue 293): there is one desktop layout, so "not a phone and the band
         is showing the add menu" is the whole condition. */
      const studioAdd = () => !isPhone() && !!document.querySelector('#inspector-panel .addmenu--panel');
      let amDrag = false, amStartY = 0, amStartH = 0, amStuck = 0;
      /* PIN THE SLOT BEFORE LEAVING IT. The panel floats while it is raised, and a floating box needs
         to be told where its other three edges are or it resolves against the page — which is what it
         did, spanning the whole window and covering the timeline. Measured here, while the panel is
         still IN the grid, so these are its real column: only the top edge is left free to move.
         Re-read on every pointerdown rather than cached, because the column moves when the window is
         resized or the inspector is widened. */
      const amPinSlot = () => {
        const p = document.getElementById('inspector-panel');
        if (!p) return;
        const r = p.getBoundingClientRect();
        root.style.setProperty('--am-left', Math.round(r.left) + 'px');
        root.style.setProperty('--am-width', Math.round(r.width) + 'px');
        root.style.setProperty('--am-bottom', Math.round(window.innerHeight - r.bottom) + 'px');
      };
      /* ═══ AND RE-PIN WHEN THE WINDOW CHANGES SIZE (queue 478).
       * Ezra: *"Just had a glitch where a black bar appeared between the add menu and the timeline"*.
       * Reproduced at 1440x900: raise the panel, widen the window to 1800, and the panel is still
       * `position: fixed` at the column it measured on POINTERDOWN — 346px wide — while the grid's
       * column has moved out to 400. The 54px between them is bare `#app` with a transparent
       * background, which paints as a black bar exactly where he says. Narrowing does the mirror
       * image and the panel OVERLAPS the timeline by 46px instead.
       * The pin comment three lines up already knew the column moves on resize; the answer it reached
       * was to re-read on every pointerdown, which covers picking the drag up again and not the window
       * changing under a panel that is ALREADY raised.
       * Measuring has to happen with the panel back in the grid — while it floats, its rect IS the
       * stale pin, so re-reading it would just re-pin the wrong numbers. Dropping the class, forcing
       * layout and restoring it happens inside one frame, so nothing paints in between. */
      const amRepin = () => {
        if (!document.body.classList.contains('am-floating')) return;
        const p = document.getElementById('inspector-panel');
        if (!p) return;
        document.body.classList.remove('am-floating');
        amPinSlot();                        // its getBoundingClientRect forces the grid layout for us
        document.body.classList.add('am-floating');
      };
      FM._amRepin = amRepin;                // suite seam: the defect is geometry after a resize
      window.addEventListener('resize', amRepin);

      amRez.addEventListener('pointerdown', (e) => {
        if (!studioAdd()) return;
        if (e.pointerType === 'mouse' && e.button !== 0) return;
        amDrag = true; amStartY = e.clientY; amStuck = 0; snapFlashed = false;
        const p = document.getElementById('inspector-panel');
        amStartH = p ? p.getBoundingClientRect().height : amFloor();
        amPinSlot();                        // measured in the grid, before anything floats
        document.body.classList.add('am-resizing');
        try { amRez.setPointerCapture(e.pointerId); } catch (_) {}
        e.preventDefault();
      });
      amRez.addEventListener('pointermove', (e) => {
        if (!amDrag) return;
        /* ⚠️ THE BUTTON CAME UP AND WE NEVER HEARD (queue 511 clause 2, same shape as queue 541).
           If the pointer is lost without a `pointerup` or `pointercancel` — a browser-stolen pointer, an
           OS window switch, a right-click — `amDrag` stays true forever. Measured: after that, EVERY
           ordinary mouse move went on resizing the panel with no button held, 432 → 492 → 232px, and it
           dragged the timeline down to 150 on the way. The panel simply follows the mouse around the
           screen. That is his "really weird and inconsistent and random" as literally as it gets.
           Scoped to a MOUSE on purpose. For a mouse, `buttons === 0` mid-drag is impossible unless the
           release was missed, so it is proof rather than a guess. A touch reports 1 while the finger is
           down and delivers no moves after it lifts, so this can never cut a real touch drag short —
           which is the failure mode queue 541 hit when a blanket `buttons === 0` test reddened two trim
           tests, and the reason that one settled on the softer signal instead. */
        if (e.pointerType === 'mouse' && e.buttons === 0) { amEnd(); return; }
        const want = amStartH + (amStartY - e.clientY);       // drag UP → taller menu
        const floor = amFloor();
        if (want >= floor) {
          /* Above the floor: float, and leave the grid alone. amStuck resets so coming back down has
             to earn the coupling again — otherwise one deep drag would leave the two permanently
             joined and the menu could never be raised a second time. */
          amStuck = 0;
          root.style.setProperty('--am-h', amClamp(want) + 'px');
          document.body.classList.add('am-floating');
          stageResized();
        } else {
          // At or below the floor. Hold here until the pointer has travelled STICK past it.
          amStuck = floor - want;
          root.style.setProperty('--am-h', floor + 'px');
          flashDivider();
          if (amStuck > STICK) {
            document.body.classList.remove('am-floating');
            root.style.setProperty('--tl-h', clampH(floor - (amStuck - STICK)) + 'px');
            stageResized();
          }
        }
      });
      const amEnd = () => {
        if (!amDrag) return;
        amDrag = false;
        document.body.classList.remove('am-resizing');
        /* ⚠️ THE PANEL'S OWN HEIGHT IS NOT PERSISTED, AND THAT IS NOW DELIBERATE (queue 511).
           It used to be written to `fm_am_h` here on every drag — and **nothing in the app has ever read
           that key**. A dead write is worth removing on its own, but there is a stronger reason now: the
           raised state is TRANSIENT by design, dropped the moment the panel stops showing the add menu
           (see FM.syncAddMenuFloat). Restoring a height across a reload would put the panel back up
           while contradicting the rule that just took it down, which is more of the inconsistency this
           queue item is about, not less.
           The TIMELINE's height is persisted and always has been — that one is read back at startup. If
           he wants the panel to remember its height too, that is a real feature and a decision for him,
           not something to resurrect by leaving a write nobody reads. */
        try { const tl = parseInt(getComputedStyle(root).getPropertyValue('--tl-h'), 10); if (tl) localStorage.setItem('fm_tl_h', tl); } catch (_) {}
      };
      amRez.addEventListener('pointerup', amEnd);
      amRez.addEventListener('pointercancel', amEnd);
      /* The menu must never be left floating over a canvas it is no longer showing — closing the add
         menu, or switching layout, drops it back into the band. */
      FM.dropAddMenuFloat = function () {
        document.body.classList.remove('am-floating');
        root.style.removeProperty('--am-h');
        ['--am-left', '--am-width', '--am-bottom'].forEach(v => root.style.removeProperty(v));
      };
      window.addEventListener('resize', () => { if (!studioAdd()) FM.dropAddMenuFloat(); });
      /* ⚠️ …AND A SELECTION CHANGE IS THE CASE THAT WAS MISSING (queue 511 clause 1).
         The comment above `dropAddMenuFloat` states the rule plainly — "the menu must never be left
         floating over a canvas it is no longer showing" — and it was enforced for a window resize and a
         layout switch, but NOT for the one thing that happens constantly: selecting a layer. The panel
         only shows the add menu while NOTHING is selected, so tapping any layer swaps its contents.
         Measured: raise the add menu to 582px, then select a layer. The panel stays floating at 582px
         over the canvas while showing the layer's category list instead of the add menu — and
         `#am-resizer` is `display: none` in that state, because it only appears alongside the add menu.
         **So the panel is stuck tall over the canvas with no handle to pull it back down.** Deselecting
         does not clear it either; nothing does, short of a window resize.
         That is his *"very inconsistent and bugs a lot depending on what order you do stuff"* — the same
         two taps in the other order behave completely differently.
         Checked on the one path every selection change already runs through, rather than at each of the
         dozen call sites that can change what is selected. */
      FM.syncAddMenuFloat = function () {
        if (!document.body.classList.contains('am-floating')) return;
        if (studioAdd()) return;            // the add menu is still what the panel is showing — leave it raised
        FM.dropAddMenuFloat();
        stageResized();
      };
    }
    /* A WINDOW RESIZE OR A PHONE ROTATION IS A STAGE RESIZE TOO, and it is the case the BUG-HUNT entry
       leads with ("rotate the phone / resize the window / open the on-screen keyboard"). Kept separate
       from the clamp below, which is desktop-only — this half matters most on a phone. */
    window.addEventListener('resize', () => { stageResized(); });
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
    /* TAP THE TIMECODE → PLAY / PAUSE (queue 364 clause 1). Ezra drew an arrow from the ▶ down to the
       pill: "Make it so that the play button is now the project time pill and when you press on it it
       pauses and plays the project."
       The benchmark gesture this tap used to carry has MOVED to the top of the playhead (clause 3), which
       had to happen in the same release — it was the only way to add one on a phone.
       Double-click (type a time) and hold (pin the thumbnail) are unchanged: neither collides with a tap,
       and both are already how you reach them. */
    readoutEl.style.cursor = 'pointer';
    readoutEl.title = 'Tap: play / pause · double-click: type a time · hold: loop playback on/off';
    let tcTapTimer = null;
    // HOLD the timecode → pin the current frame as the project thumbnail (suppresses the trailing tap so
    // it doesn't also drop a benchmark).
    let tcLp = null, tcLpFired = false, tcDown = null;
    readoutEl.addEventListener('pointerdown', (e) => {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      tcDown = { x: e.clientX, y: e.clientY }; tcLpFired = false;
      clearTimeout(tcLp);
      /* ⚠️ HOLD = LOOP, NOT THUMBNAIL (queue 536 clause 1). Ezra: *"The play button now sets the projects
         thumbnail but it should function like it used to where it would activate looped playback"*.
         Queue 364 made this pill the play button and moved the benchmark gesture off it, but the
         thumbnail hold was left behind — so the control that IS the play button had a hold that did
         something unrelated to playing. The thumbnail hold is not lost: it moves to the bookmark button
         on the playhead (clause 2), which is where he asked for it.
         `syncLoopUI` rather than just flipping the flag — there are two loop buttons on screen
         (#btn-loop and #vb-loop) and a `loop-on` class on the play control, and a hold that changed the
         behaviour without lighting them would be a state you cannot see. */
      tcLp = setTimeout(() => {
        tcLp = null; tcLpFired = true;
        if (tcTapTimer) { clearTimeout(tcTapTimer); tcTapTimer = null; }
        FM.loop = !FM.loop;
        if (typeof syncLoopUI === 'function') syncLoopUI();
        if (FM.toast) FM.toast(FM.loop ? 'Looped playback ON' : 'Looped playback off', 1400);
      }, 550);
    });
    readoutEl.addEventListener('pointermove', (e) => { if (tcDown && Math.hypot(e.clientX - tcDown.x, e.clientY - tcDown.y) > 8) { clearTimeout(tcLp); tcLp = null; } });
    const tcLpEnd = () => { clearTimeout(tcLp); tcLp = null; tcDown = null; };
    readoutEl.addEventListener('pointerup', tcLpEnd);
    readoutEl.addEventListener('pointercancel', tcLpEnd);
    readoutEl.addEventListener('click', () => {
      if (tcLpFired) { tcLpFired = false; return; }   // the hold already handled this press
      if (tcTapTimer) return;                       // second click of a double-tap → ignore here
      // …and the 240ms wait stays, because a double-click must not also toggle playback on its way past.
      tcTapTimer = setTimeout(() => { tcTapTimer = null; if (FM.togglePlay) FM.togglePlay(); }, 240);
    });
    /* THE PLAYHEAD'S TOP IS WHERE BOOKMARKS LIVE NOW (queue 364 clause 3). Its own element, because
       #tl-centerline is pointer-events:none and its triangle is a ::before that cannot take events.
       Wired here rather than in timeline.js so it sits beside the gesture it replaced — one place to
       read if "how do I add a bookmark" is ever asked again. */
    const headTap = document.getElementById('tl-headtap');
    if (headTap) {
      /* HOLD IT → PIN THE THUMBNAIL FRAME (queue 536 clause 2). Ezra: *"make the book mark button that
         now exists as the playhead actually be holdable to set thumbnail"*. Clause 1 freed that gesture
         off the play pill, and this is where he asked for it — which makes sense: both things this
         button does are about marking the frame you are parked on.
         Same shape as the pill's hold so the two feel identical: 550ms, cancelled by an 8px drag, and it
         suppresses the trailing click so a hold never also drops a bookmark. */
      let hLp = null, hFired = false, hDown = null;
      const hEnd = () => { clearTimeout(hLp); hLp = null; hDown = null; };
      headTap.addEventListener('pointerdown', (e) => {
        e.stopPropagation();   // must not start a scrub, or the line jumps out from under the finger
        if (e.pointerType === 'mouse' && e.button !== 0) return;
        hDown = { x: e.clientX, y: e.clientY }; hFired = false;
        clearTimeout(hLp);
        hLp = setTimeout(() => { hLp = null; hFired = true; if (FM.setThumbnailFrame) FM.setThumbnailFrame(); }, 550);
      });
      headTap.addEventListener('pointermove', (e) => { if (hDown && Math.hypot(e.clientX - hDown.x, e.clientY - hDown.y) > 8) { clearTimeout(hLp); hLp = null; } });
      headTap.addEventListener('pointerup', hEnd);
      headTap.addEventListener('pointercancel', hEnd);
      headTap.addEventListener('click', (e) => {
        e.preventDefault(); e.stopPropagation();          // never let it fall through to a scrub
        if (hFired) { hFired = false; return; }            // the hold already handled this press
        if (FM.toggleMarkerAtPlayhead) FM.toggleMarkerAtPlayhead();
      });
      headTap.title = 'Tap: add or remove a bookmark here · hold: set this frame as the project thumbnail';
    }
    // double-click the time readout to type an exact playhead time
    readoutEl.addEventListener('dblclick', () => {
      if (tcTapTimer) { clearTimeout(tcTapTimer); tcTapTimer = null; }   // cancel the pending play/pause tap
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
      /* ⚠️ WARN ABOUT THE PROJECT HE IS ACTUALLY IN (queue 487). `warnOversizeProject` had exactly one
         caller — `projects.open()` — and a refresh does not go through it: the boot above restores the
         last document and drops him straight back into the editor. So the one case the warning exists
         for, his 12.2-megapixel project resumed on his phone, was the one case it stayed silent for.
         He could only ever see it by opening a DIFFERENT project and coming back to this one.
         Only when he has actually landed in the editor — on Home there is no project to be too big,
         and `projects.open()` still covers what he opens from there. */
      FM._warnOversizeAfterLanding(restored);
      // Seed the Media library from media already sitting in existing projects, THEN sweep — the
      // sweep's keep-set reads the library, so seeding first is what stops it eating those blobs.
      if (FM.mediaLib) { FM.mediaLib.backfill(); FM.mediaLib.repairBackfilled(); }   // heal indexes poisoned before the fix
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
      if (FM.mediaLib) { try { FM.mediaLib.backfill(); FM.mediaLib.repairBackfilled(); } catch (e) {} }
    });
    // ‹ crumb pill exits the Edit Group view

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
        { label: 'Controller (rig control)', action: () => FM.addNullLayer && FM.addNullLayer() },
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
    ['btn-notes', 'm-notes'].forEach(id => {   // the desktop bar's and the phone's (queue 171) — same panel, same handler
      const b = document.getElementById(id);
      if (b) b.addEventListener('click', () => { if (FM.notepad) FM.notepad.open(); });
    });
    // Home's project ⋯ opens this same dialog, so it can't stay private to this module.
    FM.showExportDialog = showExportDialog;
    /* Both "?" buttons open the same overlay — the desktop one and the phone one added in queue 248.
       One handler over both, rather than a second copy that could drift. */
    document.querySelectorAll('#btn-help, #m-help').forEach((b) => {
      b.addEventListener('click', () => { if (FM.shortcuts) FM.shortcuts.toggle(); });
    });
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
      /* ⚠️ "COMING SOON", AND REWORDED, ON HIS INSTRUCTION (queue 534). Ezra explained what Alight
         Motion's button actually does, and it is not what ours does: *"in alight motion every shape has
         very thought out edit points you can grab and change before even pressing the edit points
         button… the convert to outline button just gets rid of those points and just makes it one
         outline that hugs the shape"*. So it FLATTENS a shape's editable points into a single outline —
         and the thing it removes is a feature we do not have yet (*"we havent yet put the effort to add
         those practical points yet"*).
         Ours did something else entirely: it turned the shape into a stroked path with no fill. That is
         a perfectly good LOOK, and it belongs in the effects menu where looks live — which is his second
         clause and is already served by the **Outline** effect ("Draws an outline around the layer's own
         shape"). So the menu item stops doing it and says what it is waiting for.
         Kept visible rather than deleted: he asked for "coming soon", not for it to vanish, and a name
         that disappears is a feature nobody can find when it arrives. Renamed because the old label
         described something we are not doing. */
      if (sel.type === 'shape' && sel.shape !== 'path') {
        items.push({ label: 'Flatten to One Outline — coming soon', action: () => {
          /* Names the effect EXACTLY as the menu lists it. The first draft of this line said "the
             Outline effect" — there is no effect by that name; the one that draws an outline is called
             **Stroke Colour**, which is precisely why he could not find it and asked for the behaviour
             to be put in the effects menu when it was already there. A pointer to a name that does not
             exist is worse than no pointer. */
          if (FM.toast) FM.toast('Coming soon — it will flatten a shape’s edit points into one outline. For the LOOK now, add the “Stroke Colour” effect.', 4600);
        } });
      }
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
      /* A quarter turn on press (queue 241). Ezra: "Make the cog do a little turn animation when you
       * click it." Restarted by hand — remove, force a reflow, add — because a class that is already
       * present does not replay its animation, so a second click would do nothing at all. */
      /* RESTARTING THIS IS FIDDLIER THAN IT LOOKS (queue 255). Ezra: "the setttings cog rotates once
         but never again until you refresh." The remove/reflow/add trick was right in shape and broken
         in detail: `ic` is an <svg>, and `offsetWidth` is an HTMLElement property that is UNDEFINED on
         SVGElement — so the read forced no layout, the browser coalesced the remove and the add into
         no change, and the animation ran exactly once, ever.
         So the reflow is forced on the BUTTON, which is a real HTMLElement, and any in-flight run is
         cancelled first so a fast double-press restarts instead of being swallowed. */
      const ic = setBtn.querySelector('.ico');
      if (ic) {
        if (ic.getAnimations) { ic.getAnimations().forEach(a => { try { a.cancel(); } catch (e) {} }); }
        ic.classList.remove('cog-turn');
        void setBtn.offsetWidth;                 // NOT ic.offsetWidth — see above
        ic.classList.add('cog-turn');
      }
      const inProject = !(FM.home && FM.home.isOpen && FM.home.isOpen());
      const cv = document.getElementById('btn-canvas');
      if (inProject && cv) {
        // Remember which control opened the canvas dialog, so it can anchor to it (queue 241).
        FM.settings = FM.settings || {};
        FM.settings.lastCanvasOpener = setBtn;
        cv.click();
        return;
      }
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
    /* ONE TAP EACH, NO MENU (queue 376). Ezra: "When group together, instead of one button with a drop
       down, make it two buttons with one function each."
       The common action was costing two taps and a read, for a choice most groupings never make. Both
       still call the SAME `FM.groupSelection` — the whole reason the menu existed was to pass one flag,
       and a second button passes it just as well without a menu to open, aim at and dismiss. */
    const groupBtn = document.getElementById('btn-group');
    if (groupBtn) groupBtn.addEventListener('click', () => { if (FM.groupSelection) FM.groupSelection(); });
    const maskGrpBtn = document.getElementById('btn-maskgroup');
    if (maskGrpBtn) maskGrpBtn.addEventListener('click', () => { if (FM.groupSelection) FM.groupSelection({ mask: true }); });
    const undoBtn = document.getElementById('btn-undo'), redoBtn = document.getElementById('btn-redo');
    if (undoBtn) undoBtn.addEventListener('click', () => { if (FM.history) FM.history.undo(); });
    if (redoBtn) redoBtn.addEventListener('click', () => { if (FM.history) FM.history.redo(); });
    /* ⋯ Layer OPTIONS (queue 233) — the full clip menu, which on desktop had no button at all and was
     * reachable only by right-clicking a clip. Opens exactly FM.layerMenuItems, the same set the phone's
     * ⋯ opens and the same set the right-click opens, so this is a second DOOR to one menu rather than a
     * second menu to keep in sync. Anchored under the button and right-aligned, like the phone's. */
    const moreLayerBtn = document.getElementById('btn-more-layer');
    if (moreLayerBtn) moreLayerBtn.addEventListener('click', () => {
      const L = FM.selectedLayer ? FM.selectedLayer(FM.scene) : null;
      if (!L || !FM.contextMenu || !FM.layerMenuItems) return;
      const r = moreLayerBtn.getBoundingClientRect();
      FM.contextMenu.show(Math.max(8, r.right - 230), r.bottom + 6, FM.layerMenuItems(L));
    });
    // ⧉ Layer-actions menu. Re-ordered and re-worded away from AM's list at queue 437 — see the note
    // on the item array below for the rule his two examples imply.
    const layerMenuBtn = document.getElementById('btn-layermenu');
    if (layerMenuBtn) layerMenuBtn.addEventListener('click', () => {
      if (!FM.contextMenu) return;
      const r = layerMenuBtn.getBoundingClientRect();
      const hasSel = !!FM.scene.selectedId;
      const hasClip = !!(FM.clipboard && FM.clipboard.length);
      const hasStyle = !!(FM.clipboard && FM.clipboard[0] && FM.clipboard[0].snapshot);
      const selN = FM.selectionIds ? FM.selectionIds().length : 0;
      // The ▸ arrow on "Paste on timeline" opens a position picker so you can drop the copy ABOVE a chosen
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
      /* ---- OUR OWN MENU, NOT ALIGHT MOTION'S (queue 437) --------------------------------------
       * Ezra, unprompted: "With this drop down menu also re order the buttons in it because it's the
       * same layout and wording as alight motion, if you can come up with different wording as well,
       * like instead of paste layer just paste on timeline. And copy selected instead of copy layer."
       * This is BEFORE-PUBLISHING.md work arriving early — that file records that the UI is modelled
       * on AM and has to be made ours before any public release — and it is worth taking his two
       * examples as the rule rather than as two one-off edits.
       *
       * THE RULE HIS EXAMPLES IMPLY: name the OBJECT the way the app talks about it, and say WHERE a
       * thing lands. AM's list says "Layer" five times about a selection that is often several layers;
       * "selected" is what the rest of this app already calls it (the top bar says "4 selected"). And
       * "Paste Layer" does not say where the paste goes, while "Paste on timeline" does — which also
       * distinguishes it from Paste look, the other paste in the same menu.
       *
       * THE ORDER IS BY JOB, not AM's interleave. Selection first, then the clipboard trio in the
       * order you actually use it (copy → duplicate → paste), then the two SAVE-for-later entries,
       * which are a different kind of act and now sit together instead of splitting the pastes.
       * Separators carry that grouping so it reads as three families rather than seven rows.
       *
       * "Paste look…" rather than "Paste Style…" pairs it with "Save look as preset" — one word for
       * one idea, where AM had two. */
      FM.contextMenu.show(Math.max(8, r.right - 200), r.bottom + 4, [
        { label: 'Select all layers', action: () => { if (FM.selectAll) FM.selectAll(); } },
        { sep: true },
        /* GROUPING IS NOT IN THIS MENU ANY MORE (queue 436). Ezra, with "Group Selection" circled:
           "Remove the group selection button from this menu, and also I wanted the ability to group
           every layer selected in the top right with an icon for the two options." Both entries go,
           not just the one he circled: leaving Masking Group behind would keep a half-family in a menu
           whose other half had moved, which is the sort of split that gets reported later as "why is
           this here". Both are buttons in the top bar now — #m-group / #m-maskgroup on a phone,
           #btn-group / #btn-maskgroup on desktop — so nothing has lost a door. */
        { label: 'Copy selected', disabled: !hasSel, action: () => { if (FM.copySelection) FM.copySelection(); } },
        { label: (selN > 1 ? 'Duplicate ' + selN + ' layers' : 'Duplicate selected'), disabled: !hasSel, action: () => FM.duplicateSelection() },
        { label: 'Paste on timeline', disabled: !hasClip, action: () => { if (FM.pasteClipboard) FM.pasteClipboard(); }, arrow: hasClip, arrowTitle: 'Choose where to paste', arrowAction: openPastePos },
        { label: 'Paste look…', disabled: !(hasSel && hasStyle), action: () => { if (FM.openPasteStyle) FM.openPasteStyle(); } },
        { sep: true },
        { label: 'Save look as preset', disabled: !hasSel, action: () => FM.savePresetPrompt() },
        { label: 'Save as element…', disabled: !hasSel, action: () => FM.saveElementPrompt() },
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
    /* THE CAMERA BUTTON IS A STATE MACHINE (queue 365). His words: "the camera button in the view menu
       works like this - tap to add camera, tap again to hide camera, tap again to unhide camera, hold to
       open camera settings."
       Present tense, but it was a spec rather than a description: this handler was one line that called
       addCameraLayer, and addCameraLayer REFUSES when a camera already exists and toasts "Scene already
       has a camera". So the second tap was a dead end with a scolding.
       The single-camera invariant stays and is exactly why hide is the right second action: a second
       camera would hijack the view, so the button had no useful second thing to do. Nothing here ever
       DELETES a camera — hide and unhide are the only states after the first tap. */
    const addSide = document.getElementById('btn-addside');
    if (addSide) {
      addSide.addEventListener('click', () => {
        FM.toggleAddSide();
        /* FLASH BLUE TO SAY IT MOVED (queue 501). Ezra: "if you press it to move the add button then it
           will change to the blue colour for a second or whatever to signify you moved the add button".
           The knob is white at rest now, so the accent colour is free to mean "that press did something"
           — which is the one thing this control could not previously tell you, since the row it moves is
           often scrolled out of sight. Restarted rather than queued, so a second press re-flashes
           instead of being swallowed by the first one still running. */
        addSide.classList.remove('sw-moved');
        void addSide.offsetWidth;                       // reflow, or removing and re-adding in one frame is a no-op
        addSide.classList.add('sw-moved');
        clearTimeout(addSide._swFlash);
        addSide._swFlash = setTimeout(() => addSide.classList.remove('sw-moved'), 900);
      });
      syncAddSwitch();
    }
    const vbCam = document.getElementById('vb-camera');
    if (vbCam) {
      const cam = () => FM.scene.layers.filter(l => l.type === 'camera')[0] || null;
      const syncCam = () => {
        const c = cam();
        vbCam.classList.toggle('on', !!c && c.visible !== false);
        vbCam.classList.toggle('cam-off', !!c && c.visible === false);
        vbCam.title = !c ? 'Add a camera' : (c.visible === false ? 'Camera hidden — tap to show · hold for its settings' : 'Camera on — tap to hide · hold for its settings');
      };
      FM._syncCameraBtn = syncCam;
      syncCam();
      /* Hold opens the settings. A timer rather than a long-press library, and the click that ENDS the
         hold has to be swallowed or the release would also toggle visibility — the same guard the
         timecode's hold uses two hundred lines up. */
      let camLp = null, camLpFired = false, camDown = null;
      vbCam.addEventListener('pointerdown', (e) => {
        if (e.pointerType === 'mouse' && e.button !== 0) return;
        camDown = { x: e.clientX, y: e.clientY }; camLpFired = false;
        clearTimeout(camLp);
        camLp = setTimeout(() => {
          camLp = null; camLpFired = true;
          const c = cam();
          if (!c) { if (FM.toast) FM.toast('No camera yet — tap to add one'); return; }
          FM.selectLayer(c.id);
          if (FM.inspector && FM.inspector.openCategory) FM.inspector.openCategory('cameraopts');
          else if (FM.inspector) FM.inspector.refresh();
        }, 550);
      });
      vbCam.addEventListener('pointermove', (e) => { if (camDown && Math.hypot(e.clientX - camDown.x, e.clientY - camDown.y) > 8) { clearTimeout(camLp); camLp = null; } });
      const camEnd = () => { clearTimeout(camLp); camLp = null; camDown = null; };
      vbCam.addEventListener('pointerup', camEnd);
      vbCam.addEventListener('pointercancel', camEnd);
      vbCam.addEventListener('click', () => {
        if (camLpFired) { camLpFired = false; return; }   // the hold already answered this press
        const c = cam();
        if (!c) { if (FM.addCameraLayer) FM.addCameraLayer(); }
        else {
          c.visible = c.visible === false;                // hide ⇄ unhide, never delete
          if (FM.toast) FM.toast(c.visible === false ? 'Camera hidden' : 'Camera shown', 1100);
          if (FM.timeline) FM.timeline.rebuild();
          if (FM.requestRender) FM.requestRender();
          if (FM.history) FM.history.commit();
        }
        syncCam();
      });
    }
    /* ---- view bar, second group (v5.03) --------------------------------------------------------
     * Ezra: "add the playback speed buttons in the menu that pops up when you press on the view
     * options button, along side loop playback, mark export start and mark export end, clear export
     * marks, and zoom timeline in buttons… if you hold them in they max zoom or max zoom out."
     * All of these were ⋯ entries; this is the second batch of that menu to find a real home. They
     * are LEFT in the ⋯ menu for now — Ezra asked to empty it gradually, not to cut it over. */
    const vbRateLbl = document.getElementById('vb-ratelabel');
    /* Subscribed below, once it is defined — this is the rail that read 1× while he was changing the
       speed from the transport (queue 622). */
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
    /* PC: ONE row, no side rail (queue 168). His words: "on pc we can lokey remove the side bar, put
   * export on the far left of the row with the play buttons…", amended to: back button far left; the
   * refresh chip, settings cog and export at the far right, in that order, with view options outermost.
   *
   * The buttons are MOVED, not duplicated. A second copy would mean two ids, two click handlers and two
   * things to keep in sync, and this app has already paid for that once — the whole point of the rail
   * going away is that there is one door to each action, not two.
   *
   * Play cannot drift as the row fills, which he specifically warned about: the desktop transport is a
   * 1fr/auto/1fr grid, so the flanking columns are equal BY CONSTRUCTION and the centre stays centred
   * however many buttons land on either side.
   *
   * "they only show up when they should, not always there" — delete/bind/group are selection-dependent,
   * so the row grows and shrinks rather than showing three permanently-dimmed buttons. */
  function pcTransportLayout() {
    const t = document.getElementById('transport');
    if (!t) return;
    const pc = !window.matchMedia || window.matchMedia('(min-width: 701px)').matches;
    if (!pc) { if (t._pcBuilt) pcTransportTeardown(t); return; }   // …and a narrowed window gives them back (queue 405)
    if (t._pcBuilt) return;                // idempotent: refreshAll calls this a lot
    const right = t.querySelector('.t-right');
    const menu = document.getElementById('btn-layermenu');
    /* REMEMBER WHERE EVERY BORROWED CONTROL CAME FROM, so this can be undone (queue 405).
       The build MOVES five controls out of the top bar into this row, and it used to be one-way: `_pcBuilt`
       latched true and nothing put them back. Narrow a desktop window past 701px and the phone got a
       thirteen-control row wrapped onto two lines — a real bug nobody had reported, and the thing that made
       a width sweep impossible to write, because `atPhoneWidth` produces exactly that state and it is an
       artefact of the resize rather than anything a phone renders.
       The home is captured at MOVE time, next-sibling included, so a restore puts each control back in its
       original order rather than appending them all at the end. */
    const homes = (t._pcHomes = []);
    const grab = id => {
      const el = document.getElementById(id);
      if (el && el.parentNode) homes.push({ el: el, parent: el.parentNode, next: el.nextSibling });
      return el;
    };
    if (!right || !menu) return;

    /* far left — leaving a project is where it was on the rail, and nothing else.
     * v7.75 put the name field here too; v7.80 took it back out (queue 231). His words: "on the left
     * side, for some reason, that layers text edit box pops up, and it's really messy. Instead, that
     * layers text edit button that pops up should instead be replacing the projects text edit button."
     * So there is ONE name field on desktop and it lives in the inspector header, where the project
     * name already was — it shows the layer's name while one is selected and the project's otherwise.
     * A field that appears and disappears beside the back button was the "messy" part, and a second
     * copy of the project name was the reason it had to appear and disappear. */
    const home = document.createElement('div'); home.id = 't-home';
    const back = grab('btn-back'); if (back) home.appendChild(back);
    if (home.childNodes.length) t.appendChild(home);

    // …after the duplicate button, the three that depend on what is selected
    /* PARENT first, then delete (v7.81, queue 232). Ezra: "instead of it being the first one to the
     * right of the select layers button… it should be like one over. So the one that's next to the
     * select layers button should be the parenting button." Group is unmentioned and goes last: it only
     * appears at 2+ selected, and putting it third keeps delete exactly "one over" as asked in both the
     * one-layer and the many-layer case. */
    const sel = document.createElement('span'); sel.id = 't-sel';
    /* ON THE RIGHT, AND ALL FOUR IN ONE PILL (queue 425). Ezra, with a desktop screenshot: "THE three
       buttons on pc with trash copy and parent need to be on the right side not left and also the
       background they have is too subtle".
       COPY (#btn-layermenu) DELIBERATELY STAYS ON THE LEFT, and that is a conflict with his own words
       rather than an oversight. Queue 373, one day earlier: "move the copy paste to where they were on
       the left side and on its right put a little switch toggle that moves the add menu button to the
       top of to the bottom of the timeline" — so copy's position on the left is something he asked for
       explicitly, and the add-row switch is placed RELATIVE to it. Moving copy would undo that and leave
       the switch anchored to nothing. Building it either way silently would overwrite one instruction
       with the other, so the layer-action group moves and copy does not, and the entry asks him which he
       meant. One word from him moves it.
       APPENDED to the right side, so the group ends up outermost there exactly as it was outermost on the
       left — a mirror of where it was, not a new arrangement. The pill's own contrast is in styles.css.
       The centring is safe by construction (the flanking tracks are minmax(0,1fr), #373 clause 8) and
       `playhead-play-centre` proves it. */
    ['btn-parent', 'btn-del-layer', 'btn-group', 'btn-maskgroup', 'btn-more-layer'].forEach(id => { const b = grab(id); if (b) sel.appendChild(b); });
    if (sel.childNodes.length) right.appendChild(sel);

    // far right — refresh chip, NOTES, cog, export, then view options OUTERMOST (his amendment)
    /* btn-notes was left behind by v7.52 and he caught it: "you still havent moved all the buttons on
     * the pc version to where they should be, like the notepad button" (queue 229). Everything else in
     * .top-actions came down to this row; notes did not, so it was stranded alone in a 50px header that
     * otherwise held nothing but the wordmark. The order below is the one queue 171 wrote down and the
     * comment beside the button in index.html has claimed ever since — refresh · notes · cog · export
     * — which was true while they all lived in the top bar and quietly stopped being true when the rest
     * of them moved. */
    const far = document.createElement('div'); far.id = 't-far';
    /* …and the version chip goes through the same recorder (queue 405). It is the ONE control this build
       moves by querySelector rather than by id, so the first version of the teardown did not know where it
       came from and deleted it with the wrapper — the suite's "the version on screen matches POLISH-LOG"
       test went red with "no version label in the header", which is exactly the sort of thing a one-way
       build hides until someone tries to undo it. */
    const ver = document.querySelector('.brand .ver');
    if (ver && ver.parentNode) { homes.push({ el: ver, parent: ver.parentNode, next: ver.nextSibling }); far.appendChild(ver); }
    /* "On pc it can go on the play button row along side everything else" (queue 248) — so btn-help
       comes DOWN out of the desktop top bar and rides here, before notes, matching the phone's order.
       Adding it to this list is the whole PC half: #171's order becomes ver · ? · notes · cog ·
       Export · ⛶. The suite's Studio test carries the list, so dropping one in a future migration is
       red rather than shipped — which is exactly how btn-notes went missing in v7.52. */
      ['btn-help', 'btn-notes', 'btn-settings', 'btn-export', 'btn-amfit'].forEach(id => { const b = grab(id); if (b) far.appendChild(b); });
    if (far.childNodes.length) t.appendChild(far);

    t._pcBuilt = true;
    pcTransportSync();
  }
  /* "they only show up when they should, not always there."
   *
   * Delete and Bind ONLY. btn-group already has an owner — syncTopBar has set its display since queue
   * 53 — and a second writer for the same button is how two authorities end up disagreeing about
   * whether it is on screen. It cost this change one red test to remember that.
   * These two had no owner because they lived in #topbar-extra, which is display:none on PC: moving
   * them into the row is the first time either has ever been visible here, so the rule is new, not
   * duplicated. The #t-sel wrapper is never hidden itself — flex drops display:none children from
   * layout, so an empty one is already 0 wide and hiding it would be a third thing to keep in sync. */
  function pcTransportSync() {
    if (!document.getElementById('t-sel')) return;
    const n = FM.selectionIds ? FM.selectionIds().length : ((FM.scene && FM.scene.selectedId) ? 1 : 0);
    const total = (FM.scene && FM.scene.layers) ? FM.scene.layers.length : 0;
    const show = (id, on) => { const b = document.getElementById(id); if (b) b.style.display = on ? '' : 'none'; };
    show('btn-del-layer', n >= 1);
    show('btn-parent', n >= 1 && total >= 2);
    show('btn-more-layer', n >= 1);   // queue 233 — the full clip menu had no button on PC at all
    /* The group's own ground (queue 242) has to leave with its buttons: hidden children still leave the
     * wrapper's padding and background behind, which is an empty 10px pill sitting in the row. */
    const selWrap = document.getElementById('t-sel');
    if (selWrap) selWrap.classList.toggle('has-sel', n >= 1);
    /* GREY OUT LAYER ACTIONS WITH NOTHING SELECTED (queue 280). Ezra circled this button: "make this
       button greyed out when a layer isnt selected." It opens the actions for the selected layer, so
       with no selection there is nothing for it to open — it either did nothing or complained, and
       looked exactly as live as every button beside it either way.
       It is DIMMED, not hidden: the ones in #t-sel above disappear entirely because they belong to a
       group that has its own ground, while this one sits in the plain transport row where a hole would
       shuffle the other controls sideways every time you deselected. `is-off` is the app's existing
       word for this — undo and redo already wear it — rather than a second look meaning the same. */
    const lm = document.getElementById('btn-layermenu');
    if (lm) {
      lm.classList.toggle('is-off', n < 1);
      lm.setAttribute('aria-disabled', n < 1 ? 'true' : 'false');
    }
  }
  /* THE UNDO for pcTransportLayout (queue 405). Restores every borrowed control to the exact parent and
     position it was taken from, then removes the three wrappers the build created. Without this the row
     could only ever grow: `_pcBuilt` latched and a window narrowing past 701px kept a desktop row on a
     phone-width screen, wrapped onto two lines. */
  function pcTransportTeardown(t) {
    t = t || document.getElementById('transport');
    if (!t || !t._pcBuilt) return;
    const homes = t._pcHomes || [];
    for (let i = homes.length - 1; i >= 0; i--) {
      const h = homes[i];
      if (!h || !h.el || !h.parent) continue;
      try { h.parent.insertBefore(h.el, h.next && h.next.parentNode === h.parent ? h.next : null); } catch (e) {}
    }
    ['t-home', 't-sel', 't-far'].forEach(id => { const w = document.getElementById(id); if (w && !w.childNodes.length) w.remove(); else if (w) w.remove(); });
    t._pcHomes = null; t._pcBuilt = false;
  }
  FM.pcTransportTeardown = pcTransportTeardown;
  FM.pcTransportLayout = pcTransportLayout;
  FM.pcTransportSync = pcTransportSync;
  /* Build it at STARTUP, not on the first refresh. The row is part of the app's chrome, so anything
   * that reads the layout before a render — the suite's layout test does exactly this — must find it
   * already assembled rather than in whatever state the markup shipped in. Idempotent, so the calls
   * from refreshAll and syncTopBar remain harmless. */
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', pcTransportLayout);
  else pcTransportLayout();

  /* ---- THE PANEL REACTS TO THE CURSOR (queue 286) ---------------------------------------------
   * Ezra: "on the add menu and layer edit menu on pc a glow should follow ur curser… its not just a
   * simple glow on ur curser but it makes it feel like the area around ur curser knows its there and
   * is reacting to it."
   * That distinction decides the whole implementation. A blob parented to the pointer is one element
   * moving; what he described is the SURFACE responding — so nothing here draws a glow at the cursor.
   * The cards' own borders light on the side the cursor is near, and the panel carries a soft wash
   * under them, so the light belongs to the panel and the cursor is only where it happens to fall.
   * ONE PAIR OF NUMBERS DOES ALL OF IT. The card rings are painted with a gradient at
   * `background-attachment: fixed`, which resolves against the VIEWPORT rather than each element — so
   * every card samples the same screen-space spotlight from the same two variables, and no card needs
   * its own coordinates. Writing per-card positions would have meant a getBoundingClientRect per card
   * per frame, on a panel that can hold seventy of them.
   * Cost, because this app is frame-tight and the quality ladder exists for a reason: pointermove only
   * stores two numbers, one rAF writes two custom properties, and the whole thing stands down while
   * FM.playing — a decoration must never take frames from playback. Off entirely under
   * prefers-reduced-motion, and desktop-only, which is what he asked for. */
  function setupPanelGlow() {
    const panel = document.getElementById('inspector-panel');
    if (!panel) return;
    if (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    /* COALESCED ON A CLOCK, NOT ON requestAnimationFrame — and that is not a style preference.
       rAF was the obvious throttle and it made the feature impossible to demonstrate: it does not fire
       at all in the browser pane this is developed in, and it did not fire under headless Chrome's
       virtual time either, so both probes reported an unwritten variable and a dead glow for code that
       was fine. An undemonstrable mechanism is the exact thing that got the queue-284 resize hook
       written and reverted once already.
       A 16ms gate costs the same and is observable anywhere: pointermove arrives at most ~120/s, this
       drops it to one write per frame, and the work per write is two custom properties — no layout is
       read, which is where a cursor effect would actually cost frames. */
    let on = false, last = -1e9;
    panel.addEventListener('pointermove', (e) => {
      if (e.pointerType === 'touch') return;             // a finger has no hover; this is the PC feature
      if (!matchMedia('(min-width: 701px)').matches) return;
      if (FM.playing) return;                            // never spend a playback frame on a decoration
      const now = (window.performance && performance.now) ? performance.now() : Date.now();
      if (now - last < 16) return;
      last = now;
      if (!on) { on = true; panel.classList.add('glow-on'); }
      panel.style.setProperty('--glow-x', Math.round(e.clientX) + 'px');
      panel.style.setProperty('--glow-y', Math.round(e.clientY) + 'px');
    });
    const off = () => { on = false; panel.classList.remove('glow-on'); };
    panel.addEventListener('pointerleave', off);
    /* Playback starting mid-hover would otherwise leave the ring lit at a stale position for as long as
       it ran, which reads as a stuck highlight rather than as something reacting. FM.play calls this;
       there is no play EVENT to listen for, and inventing one would have been a second source of truth
       for something the function already knows. */
    FM._panelGlowOff = off;
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', setupPanelGlow);
  else setupPanelGlow();

  FM.syncViewBar = syncViewBar;
    const bindVb = (id, fn) => { const b = document.getElementById(id); if (b) b.addEventListener('click', () => { fn(); syncViewBar(); }); return b; };
    FM.onPreviewRate(syncViewBar);   // queue 622 — the rail follows the transport, not just its own buttons
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
    /* HOLD A VIEW-RAIL BUTTON TO SEE WHAT IT IS (queue 108). Ezra asked what two of them do, and the
     * note in REQUESTS.md is right that a control needing to be explained is a design problem — but the
     * fix cannot be labels under the icons. He already had this rail fixed once for being "crammed in",
     * and it is 46px wide and scrolls because it is full; captions would roughly double its height.
     * A hold costs no space and teaches on the device where `title` does nothing — a phone.
     * TWO buttons already own the hold gesture (timeline zoom in/out, hold = go all the way), so they
     * are skipped rather than fighting over it. And a hold that showed a label swallows the click that
     * follows, so learning what a control is never also toggles it — the whole point is to ask without
     * committing. */
    (function viewRailHints() {
      const rail = document.getElementById('view-bar');
      if (!rail) return;
      const OWNS_HOLD = { 'vb-tlin': 1, 'vb-tlout': 1 };
      let chip = null, timer = 0, shown = false;
      const hide = () => { if (chip) { chip.remove(); chip = null; } if (timer) { clearTimeout(timer); timer = 0; } };
      rail.addEventListener('pointerdown', (e) => {
        const b = e.target.closest ? e.target.closest('.vb-btn, .vb-z') : null;
        if (!b || OWNS_HOLD[b.id]) return;
        const label = b.getAttribute('title') || b.getAttribute('aria-label');
        if (!label) return;
        shown = false;
        timer = setTimeout(() => {
          timer = 0; shown = true;
          hideChipOnly();
          chip = document.createElement('div');
          chip.className = 'vb-hint';
          chip.textContent = label.split(' — ')[0].split(' · ')[0];   // the name, not the whole explanation
          document.body.appendChild(chip);
          const r = b.getBoundingClientRect(), c = chip.getBoundingClientRect();
          chip.style.top = Math.round(r.top + r.height / 2 - c.height / 2) + 'px';
          chip.style.left = Math.round(r.left - c.width - 10) + 'px';
          if (navigator.vibrate) { try { navigator.vibrate(6); } catch (_) {} }
        }, 380);
      });
      function hideChipOnly() { if (chip) { chip.remove(); chip = null; } }
      ['pointerup', 'pointercancel', 'pointerleave'].forEach(ev =>
        rail.addEventListener(ev, () => { if (timer) { clearTimeout(timer); timer = 0; } setTimeout(hideChipOnly, 900); }));
      rail.addEventListener('click', (e) => {
        if (!shown) return;
        shown = false;
        e.stopPropagation(); e.preventDefault();   // asked what it is; did not ask to press it
      }, true);
    })();

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
    /* PLAY PLAYS. It used to also carry a 550ms hold that toggled Loop and SWALLOWED the tap, and that
     * is the other half of "I just tried adding a song and it won't even play at all sometimes"
     * (queue 96): hold the button a fraction too long — which on a phone is most presses — and the
     * transport does not start, while a setting you did not ask for silently flips. A control that
     * sometimes does nothing and sometimes does something else is worse than one that does less.
     *
     * Removed rather than retuned, because Loop already has a home and he chose it: "Get rid of loop
     * play back out of the settings menu, it should only be in view options." It is the ⟳ on the view
     * rail, which also names itself on hold (queue 108). A second, invisible door to the same toggle
     * that costs you the press is not worth having. */
    playBtn.addEventListener('click', () => FM.togglePlay());
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
    FM.onPreviewRate(syncRateUI);      // queue 622 — repaint whoever changed it
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
    /* The inspector/Add panel header field (v6.13), and since v7.80 the ONLY name field on desktop
     * (queue 231). It writes whichever name it is currently SHOWING — the selected layer's, or the
     * project's — and pushes a project rename into the other two copies so none of them can disagree. */
    const pns = document.getElementById('proj-name-s');
    if (pns) {
      pns.value = FM.scene.project.name || 'Untitled';
      pns.addEventListener('input', () => {
        const sel = FM.selectedLayer(FM.scene);
        if (sel) { sel.name = pns.value; if (FM.timeline) FM.timeline.rebuild(); return; }
        FM.scene.project.name = pns.value;
        const pnm = document.getElementById('proj-name-m');
        if (pnm && document.activeElement !== pnm) pnm.value = pns.value;
        if (pn && document.activeElement !== pn) pn.value = pns.value;
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
      /* THE OVERSIZE INSTRUCTION BELONGS IN THE DIALOG (queue 490). It used to be an 11-second toast
         fired on tapping the warning, after which this dialog opened 400ms later and covered it — so
         he got 0.4s to read ~110 characters, and the guidance he needed WHILE choosing a size spent the
         remaining 10.6s as a blurred ghost behind the card. Here it stays on screen for exactly as long
         as he is deciding, and it shows for anyone who opens this dialog on a too-big project, not only
         for the one person who tapped the toast. */
      const ovr = document.getElementById('cv-oversize');
      if (ovr) {
        const P0 = FM.scene && FM.scene.project;
        const tooBig = !!(P0 && FM.projectIsOversize && FM.projectIsOversize(P0));
        ovr.classList.toggle('hidden', !tooBig);
        if (tooBig) {
          ovr.textContent = 'This project is ' + (P0.width * P0.height / 1e6).toFixed(1) + ' megapixels ('
            + P0.width + ' × ' + P0.height + ') and every frame has to draw all of it. Pick a smaller size below — '
            + 'leave “Scale the layers to fit” on and your work comes with it.';
        }
      }
      // Only offer to move the work when there IS work — on a new project the row is just a question
      // about nothing, and the dialog is already long on a phone.
      const scaleRow = document.getElementById('cv-scale-row');
      if (scaleRow) scaleRow.classList.toggle('hidden', !(FM.scene && FM.scene.layers && FM.scene.layers.length));
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
      /* NO HARDCODED COPY OF THE LIST (queue 118, fixed 22 Aug). This used to be
         `['24','25','30','50','60']` — a second source of truth for rows that live in index.html, added
         at v3.28 and never updated when queue 118 rewrote those rows to 15/25/30/50/60/120. Ezra's own
         instruction there was "drop 24, keep 25, add 15 and 120", and the dropdowns did change; this
         mirror did not, so the two disagreed about exactly the rates he had just changed.
         MEASURED CONSEQUENCE, not a tidy-up: a **24 fps project** matched the stale list, so the code took
         the preset branch and set `fpsSel.value = '24'` — a row that no longer exists. The select landed
         on selectedIndex -1 and rendered BLANK, and Apply then read '' → `parseInt('') || 30` and
         rewrote his project from 24 fps to 30. The setting was destroyed by opening the dialog and
         pressing Apply. (15 and 120 merely opened on "Custom…" instead of their own rows — cosmetic, and
         they round-tripped.) The entry itself promised "Custom still reaches 24 either way".
         Asking the CONTROL removes the mirror entirely, so it can never drift from index.html again.
         Same shape js/home.js:2059-2064 already uses for the new-project dialog. */
      const fpsHasRow = (v) => {
        if (!fpsSel) return false;
        for (let i = 0; i < fpsSel.options.length; i++) if (fpsSel.options[i].value === v) return true;
        return false;
      };
      canvasBtn.addEventListener('click', () => {
        cvDetect();
        // seed the custom W/H inputs from the live project so switching to Custom starts sensible
        const cw = document.getElementById('cv-cw'), ch = document.getElementById('cv-ch');
        if (cw) cw.value = FM.scene.project.width; if (ch) ch.value = FM.scene.project.height;
        // sync the fps control to the live project (a non-preset fps opens as Custom)
        const cur = String(FM.scene.project.fps || 30);
        if (fpsSel) {
          if (fpsHasRow(cur)) { fpsSel.value = cur; if (fpsCustomRow) fpsCustomRow.classList.add('hidden'); }
          else { fpsSel.value = 'custom'; if (fpsNum) fpsNum.value = cur; if (fpsCustomRow) fpsCustomRow.classList.remove('hidden'); }
        }
        const pb = FM.scene.project.background;
        cvBg = /^#[0-9a-f]{6}$/i.test(String(pb || '')) ? pb : 'none';
        cvBgSync();
        cvUpdate();
        /* ANCHOR IT TO THE COG on desktop (queue 241 b/c). Ezra: "on pc make the canvas settings row
         * show up next to where the button is instead of the middle and make it kinda of come out of
         * the button… so the settings button wouldnt be blured like everything else."
         * The cog's position is only knowable at runtime — it lives in the transport row, whose x moves
         * with the layout and whose y moves with the timeline's drag height — so the two coordinates go
         * out as CSS variables and the stylesheet does the rest. The button that OPENED the dialog is
         * used rather than #btn-settings by name, because on desktop the cog forwards its click here
         * and on the phone this dialog has other doors; anchoring to whichever control was actually
         * pressed is right in both cases and needs no special-casing.
         * `cv-anchored` is what lifts the cog out of the scrim's blur, and it goes on <body> because
         * the button is not inside the dialog. */
        const src = (FM.settings && FM.settings.lastCanvasOpener) || document.getElementById('btn-settings');
        const sr = src && src.getBoundingClientRect();
        if (sr && sr.width > 0 && window.matchMedia('(min-width: 701px)').matches) {
          cvDialog.style.setProperty('--cv-anchor-right', Math.max(8, Math.round(window.innerWidth - sr.right)) + 'px');
          /* WHICHEVER SIDE HAS ROOM (queue 252). He asked for it to open UPWARD, and on his layout
             that is right — the cog sits on the transport row low on the screen, so hanging downward
             gave the card the scraps underneath and made it scroll (measured at 1440x900: 473px of
             content into 206px of space, with 634px sitting empty above).
             But "always upward" is just the old bug mirrored. The cog is not always low: in the other
             desktop layout it rides near the TOP, and anchoring upward there would push the card off
             the screen — which is exactly what the suite caught, with the cog at y=126. So the side is
             chosen by measurement, and upward wins ties because that is the arrangement he asked for. */
          const roomAbove = sr.top - 16, roomBelow = window.innerHeight - sr.bottom - 16;
          const up = roomAbove >= roomBelow;
          document.body.classList.toggle('cv-up', up);
          cvDialog.style.setProperty('--cv-anchor-top', Math.round(sr.bottom + 8) + 'px');
          cvDialog.style.setProperty('--cv-anchor-bottom', Math.max(8, Math.round(window.innerHeight - sr.top + 8)) + 'px');
          document.body.classList.add('cv-anchored');
          /* THE TAIL, and ONLY the tail (queue 548). The cog already pops from its button with its own
             cv-grow, and two suite tests pin that placement — so it takes the comic tail the other three
             now have and keeps everything else. `placed: true` is what says "decorate, do not move". */
          if (FM.popFrom) {
            if (FM._cvPop) { FM._cvPop(); FM._cvPop = null; }
            const cvCard = cvDialog.querySelector('.export-card');
            if (cvCard) FM._cvPop = FM.popFrom(cvCard, src, { placed: true });
          }
        } else {
          cvDialog.style.removeProperty('--cv-anchor-right');
          cvDialog.style.removeProperty('--cv-anchor-top');
        cvDialog.style.removeProperty('--cv-anchor-bottom');
        document.body.classList.remove('cv-up');
          (FM._cvPop && (FM._cvPop(), FM._cvPop = null), document.body.classList.remove('cv-anchored', 'cv-up'));
        }
        cvDialog.classList.remove('hidden');
      });
      document.querySelectorAll('#canvas-dialog .cv-bg-sw').forEach(b => b.addEventListener('click', () => { cvBg = b.dataset.bg; cvBgSync(); }));
      { const bgInp = document.getElementById('cv-bg'); if (bgInp) bgInp.addEventListener('input', () => { cvBg = bgInp.value; cvBgSync(); }); }
      document.querySelectorAll('.aspect-chip').forEach(chip => chip.addEventListener('click', () => { cvAspect = chip.dataset.aspect; cvUpdate(); }));
      document.getElementById('cv-res').addEventListener('change', cvUpdate);
      ['cv-cw', 'cv-ch'].forEach(id => { const inp = document.getElementById(id); if (inp) inp.addEventListener('input', cvUpdate); });
      if (fpsSel) fpsSel.addEventListener('change', () => { if (fpsCustomRow) fpsCustomRow.classList.toggle('hidden', fpsSel.value !== 'custom'); });
      /* Tap anywhere outside to close (queue 252). His words: "make it so you press anywhere on the
         screen out side of it it wil close the menu." It closes WITHOUT applying — the same as Cancel
         — because a stray tap on the backdrop must never silently resize someone's project.
         On the BACKDROP only (`e.target === cvDialog`), so a click that lands on the card itself, or
         on anything inside it, is untouched. And on pointerdown rather than click: a drag that starts
         inside the card and releases outside it would otherwise count as an outside click and shut
         the dialog mid-gesture. The cog itself is excluded — it sits above the scrim now (v8.10), and
         without this a click on it would close and immediately reopen the dialog. */
      cvDialog.addEventListener('pointerdown', (e) => {
        if (e.target !== cvDialog) return;
        (FM._cvPop && (FM._cvPop(), FM._cvPop = null), document.body.classList.remove('cv-anchored', 'cv-up'));
        cvDialog.classList.add('hidden');
      });
      document.getElementById('cv-cancel').addEventListener('click', () => ((FM._cvPop && (FM._cvPop(), FM._cvPop = null), document.body.classList.remove('cv-anchored', 'cv-up')), cvDialog.classList.add('hidden')));
      document.getElementById('cv-go').addEventListener('click', () => {
        const s = cvCompute();
        /* MOVE THE WORK WITH THE FRAME. Changing the size here used to change two numbers and nothing
           else, so every layer kept coordinates that meant something in the OLD frame — resize a
           finished composition and it scattered, silently. It is also what made the v9.27 import cap
           unable to repair an already-oversized project: shrinking it would have wrecked the layout. */
        const P0w = FM.scene.project.width, P0h = FM.scene.project.height;
        const scaleBox = document.getElementById('cv-scale');
        const wantScale = !scaleBox || scaleBox.checked;
        if (wantScale && FM.scene.layers.length && (s.w !== P0w || s.h !== P0h)) {
          const r = FM.rescaleProjectContents(FM.scene.layers, P0w, P0h, s.w, s.h);
          if (r && FM.toast && Math.abs(r.k - 1) > 1e-6) {
            FM.toast('Canvas ' + s.w + '\u00d7' + s.h + ' — ' + r.layers + ' layer' + (r.layers === 1 ? '' : 's') + ' scaled to match. Undo puts it back.', 3600);
          }
        }
        FM.scene.project.width = s.w; FM.scene.project.height = s.h;
        const rawFps = (fpsSel && fpsSel.value === 'custom') ? (fpsNum ? fpsNum.value : 30) : (fpsSel ? fpsSel.value : 30);
        FM.scene.project.fps = Math.max(1, Math.min(120, parseInt(rawFps, 10) || 30));
        FM.scene.project.background = cvBg === 'none' ? null : cvBg;   // null = transparent
        resizeCanvas(); refreshAll();
        if (FM.history) FM.history.commit();
        ((FM._cvPop && (FM._cvPop(), FM._cvPop = null), document.body.classList.remove('cv-anchored', 'cv-up')), cvDialog.classList.add('hidden'));
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
      /* SHIFT+HOME / SHIFT+END send the Add marker to the top or the bottom (queue 294, clause 12):
         "we could add shortcuts on the keyboard to quickly push it up to the top… push it up to the
         bottom so that you don't have to go and find it and then drag it up or down."
         Paired with the plain keys on purpose — Home/End already mean "jump to the start/end" for the
         PLAYHEAD, so the shifted pair means the same thing for the marker and there is one idea to
         remember rather than two arbitrary keys. Nothing else in the app binds a shifted Home or End.
         Not while editing a group, for the same reason the marker is hidden there: the index is
         ignored, so the shortcut would silently do nothing. */
      else if (e.code === 'Home' && e.shiftKey) { e.preventDefault(); moveAddMarker(0); }
      else if (e.code === 'End' && e.shiftKey) { e.preventDefault(); moveAddMarker(FM.scene.layers.length); }
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
        /* THE EFFECTS MENU EATS THE TAP THAT DISMISSES IT (queue 401). Ezra: "Tapping anywhere on the
           screen when you're in the effects menu should close the effects menu but not the layer."
           This has to happen on POINTERDOWN, and the first attempt on pointerup proved why: the timeline
           and the canvas deselect from their OWN handlers, which run long before a document-level
           pointerup — so the menu closed and the layer was gone anyway, which is exactly the half he was
           complaining about. Closing here and stopping the event means the dismissing tap belongs to the
           menu and reaches nothing underneath it.
           The exit goes through the browser's own path so picks are applied rather than binned (queue
           389 — a tap-away is an exit like any other), and `armed = false` stops the pointerup branch
           below from treating the same gesture as a second tap. */
        const fxbOpen = document.getElementById('fx-browser');
        if (fxbOpen && !fxbOpen.classList.contains('hidden') &&
            !(e.target && e.target.closest && e.target.closest('#fx-browser'))) {
          if (FM._fxExitBrowser) FM._fxExitBrowser();
          else if (FM.fxBrowser && FM.fxBrowser.close) FM.fxBrowser.close();
          armed = false; keepAtDown = true;
          e.stopPropagation();
          return;                                                                           // …the layer stays selected
        }
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
