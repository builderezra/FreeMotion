/* FreeMotion — Live preview routing for audio effects.
 * A forward clip's <video> element audio can't be filtered while it plays itself, so a layer that has
 * audio effects gets its element pulled into Web Audio: el -> MediaElementSource -> chain -> speakers.
 * el.volume / el.muted stay upstream of the source node, so app.js's volume/fade/solo/mute reconcile
 * keeps working untouched. A layer with no audio effects is never routed at all — it keeps today's
 * exact native path. (One exception, queue 690: on an iPhone el.volume cannot be set, so a clip whose
 * level is not a flat 100% is routed through a gain there — see volumeLocked / needsLevel.)
 */
window.FM = window.FM || {};
(function (FM) {
  'use strict';

  /* ---- Volume above 100% (queue 195) ---------------------------------------------------------
   * His words: "I want to be able adjust the volume up to like 1000%." Measured before building
   * (tests/_volclamp.html), the two audio paths DISAGREED above unity: the preview sets
   * `el.volume`, an HTMLMediaElement property where assigning 2 THROWS and the value stays 1, while
   * the export runs a Web Audio GainNode that happily amplifies. Widening the slider alone would
   * have meant hearing nothing while you dragged and then getting a loud, distorted file.
   *
   * So a boost needs Web Audio in the PREVIEW too — and that is the risky part, which is why it
   * lives here instead of in a new module. Creating a MediaElementSource is irreversible: a second
   * call throws, and once one exists the element's audio flows ONLY through the graph, so a dangling
   * source is a permanently silent clip. This file already owns that hazard and already gets it
   * right — one source per element, cached on the media rec, `passthrough` on every exit. Boost
   * simply becomes another reason to route, so there is exactly one place that can get it wrong.
   *
   * A layer at or below 100% is still NEVER routed, and keeps today's exact native path — except on an
   * iPhone, where el.volume is read-only and a level below 100% has nowhere else to go (queue 690). */
  function boostOf(layer) {
    if (!layer || layer.muted) return 1;
    const v = layer.volume;
    if (v == null) return 1;
    if (typeof v === 'number') return v > 1 ? v : 1;
    // Keyframed: the chain has to exist for the whole clip if ANY keyframe goes above unity,
    // because it cannot be built halfway through a drag without a gap in the sound.
    const kf = v && v.kf;
    if (!Array.isArray(kf)) return 1;
    let peak = 1;
    for (let i = 0; i < kf.length; i++) { const k = kf[i]; if (k && k.v > peak) peak = k.v; }
    return peak;
  }
  function needsBoost(layer) { return boostOf(layer) > 1.0001; }
  FM._audioNeedsBoost = needsBoost;   // read by the suite

  /* ═══ ON AN IPHONE, el.volume DOES NOTHING (queue 690, audio hunt) ═══════════════════════════════════
   * His words for the hunt: "go re audit, find some bugs coz theres a shit load".
   * Everything below 100% — a clip at 25%, a fade, a volume keyframe, the de-click — reached a forward clip
   * through ONE line in the playback tick: `m.el.volume = vol`. On an iPhone a page cannot set a media
   * element's volume at all: Apple's Safari audio guide says the property is not settable from JavaScript
   * on iOS and always reads 1, because the level belongs to the hardware buttons. So on his phone every
   * one of those was silently ignored while editing — and the export honours all of them, so what he mixed
   * by ear on the phone was not what the file contained.
   * DETECTED, NOT SNIFFED: write a level, read it back. An element that will not keep it is one whose
   * level has to come from Web Audio instead, and the element's own `volume` then only ever reads 1, so
   * the gain stage carries the WHOLE level rather than just the part above 100%. Asked once per element
   * and remembered on the media rec (underscore = never saved), which is replaced together with the
   * element, so a new element is asked again. MUTE does not need any of this — el.muted IS settable on
   * iOS, and the playback tick now uses it for every level of zero (js/app.js). */
  function volumeLocked(m) {
    if (!m || !m.el) return false;
    if (m._volLocked != null) return m._volLocked;
    let locked = false;
    try {
      const el = m.el, was = el.volume;
      const probe = was > 0.5 ? 0.25 : 0.75;
      el.volume = probe;
      locked = Math.abs(el.volume - probe) > 0.01;
      el.volume = was;
    } catch (e) { locked = false; }
    m._volLocked = locked;
    return locked;
  }
  /* Does this layer's level need the gain stage on an element that cannot set its own volume? Only when
   * the level is not a flat 100%: a plain song at 100% keeps the native path on the phone exactly as
   * today, and never spends an audio context. Muted is el.muted's job, and it works on iOS. */
  function needsLevel(layer, m) {
    if (!layer || layer.muted || !volumeLocked(m)) return false;
    const v = layer.volume;
    const flat = v == null || (typeof v === 'number' && Math.abs(v - 1) < 1e-4);
    const w = FM.fadeWindows ? FM.fadeWindows(layer, layer.duration) : { fi: layer.fadeIn || 0, fo: layer.fadeOut || 0 };
    return !flat || w.fi > 0 || w.fo > 0;
  }

  // Structure = what forces a rebuild (order, types, enabled). Param values do not; they ride applyAt.
  // The boost STAGE's presence is structural too — its gain value is not, that rides setBoost.
  function signature(layer, m) {
    const fx = (layer && layer.audioFx) || [];
    if (m === undefined) m = layer && FM.media.get(layer.id);
    // 'L|' is the level stage an iPhone needs below 100% (queue 690): a gain with no limiter, see makeLevelStage.
    let s = needsBoost(layer) ? 'B|' : (needsLevel(layer, m) ? 'L|' : '');
    for (let i = 0; i < fx.length; i++) {
      const f = fx[i]; if (!f) continue;
      s += f.type + (f.enabled === false ? '0' : '1') + '|';
    }
    return s;
  }

  /* Gain, then a limiter. The limiter is not optional garnish: at 1000% anything already near full
   * scale clips hard, and hard clipping sounds like a broken file rather than a loud one, which is
   * the next bug report. A DynamicsCompressor with a high ratio just below 0 dBFS is a limiter —
   * it only engages on what would have clipped, so ordinary boosts pass through unshaped.
   * The EXPORT gets the identical stage (exporter.js), because a preview that disagrees with the
   * file is the exact failure this whole entry exists to prevent. */
  /* The limiter on its own, so the REVERSED preview (audio-play.js) can put the very same one at the end
   * of its path (queue 916, clause 5) — one definition, not a second copy of five numbers to drift. */
  function makeLimiter(ctx) {
    const lim = ctx.createDynamicsCompressor();
    try {
      lim.threshold.value = -1.5;    // dBFS — start holding just under the ceiling
      lim.knee.value = 0;            // hard knee: a limiter, not a compressor colouring the sound
      lim.ratio.value = 20;
      lim.attack.value = 0.003;
      lim.release.value = 0.12;
    } catch (e) {}
    return lim;
  }
  function makeBoostStage(ctx) {
    const gain = ctx.createGain();
    gain.gain.value = 1;
    const lim = makeLimiter(ctx);
    gain.connect(lim);
    return { input: gain, output: lim, gain: gain };
  }
  /* THE LEVEL STAGE (queue 690): the same gain, and NO limiter, because it only ever turns a clip DOWN.
   * A limiter sitting at -1.5 dBFS would squash the peaks of a song mastered near full scale even at 90%,
   * and nothing is being boosted here. A layer that also goes above 100% gets the boost stage instead,
   * whose gain then carries the whole level (setBoost), limiter and all. */
  function makeLevelStage(ctx) {
    const gain = ctx.createGain();
    gain.gain.value = 1;
    return { input: gain, output: gain, gain: gain };
  }

  // The element's source node is created ONCE per element, ever: a second call throws, and once it
  // exists the element's audio flows ONLY through Web Audio — so a dangling source = a permanently
  // silent clip. Cached on the media rec (underscore = never serialized), which is replaced together
  // with the element when media is swapped, so a new element naturally gets a new source.
  /* The one audition in flight, if any. Module-level and singular on purpose: two clips auditioning at
     once is two things to listen to, and the stop paths (collapse, edit, panel close) would each have to
     know which one they meant. */
  let _aud = null;

  /* WHERE ON THE TIMELINE THE AUDITIONED SOUND IS (queue 916, clause 10). The audition plays the
   * element itself, so all it knows is a SOURCE position — and keyframed effect params are read at
   * SCENE time. This used to be `start + (currentTime - trimStart)`, which is only the inverse of
   * FM.layerLocalTime at 1x: on a 2x clip one source second is half a timeline second, so a keyframed
   * sweep was driven at the wrong moment — out of step with the real playback and the export, which
   * both read the params at the true timeline time. Static speed is a divide; a ramp inverts the same
   * advance integral the picture uses (bisection — it is monotonic, speed never drops below 0.05x, and
   * layerSourceAdvance is a table lookup, so thirty steps a frame cost nothing). Reversed clips never
   * get here: audition() refuses them. */
  function auditionSceneTime(layer, srcT) {
    const start = layer.start || 0, dur = layer.duration || 0;
    const adv = srcT - (layer.trimStart || 0);
    if (!(FM.isAnimated && FM.isAnimated(layer.speed))) return start + adv / (FM.speedAt ? FM.speedAt(layer, start) : 1);
    if (!(adv > 0)) return start;
    if (FM.layerSourceAdvance(layer, dur) <= adv) return start + dur;
    let lo = 0, hi = dur;
    for (let i = 0; i < 30; i++) {
      const mid = (lo + hi) / 2;
      if (FM.layerSourceAdvance(layer, mid) > adv) hi = mid; else lo = mid;
    }
    return start + (lo + hi) / 2;
  }

  function sourceFor(m) {
    if (m._mes) return m._mes;
    try { m._mes = FM.audioCtx().createMediaElementSource(m.el); } catch (e) { m._mes = null; }
    return m._mes;
  }

  // Every exit path from a routed element ends here or at a chain — m._mes is never left unconnected.
  function passthrough(m) {
    if (!m._mes) return;
    try { m._mes.disconnect(); } catch (e) {}
    if (m._afxChain) { try { m._afxChain.dispose(); } catch (e) {} m._afxChain = null; }
    dropBoost(m);
    try { m._mes.connect(FM.audioCtx().destination); } catch (e) {}
    m._afxSig = '';
    m._afxInsts = null;
  }

  function dropBoost(m) {
    if (!m || !m._boost) return;
    try { m._boost.input.disconnect(); } catch (e) {}
    try { m._boost.output.disconnect(); } catch (e) {}
    m._boost = null;
  }

  // Is the live chain still the one this layer describes? The signature answers that for STRUCTURE,
  // which is only half the question: buildAudioFxChain captures each effect instance BY REFERENCE and
  // applyAt reads b.inst.params forever after, so the chain is also tied to those exact objects.
  // history.restore() does `FM.scene.layers = JSON.parse(str).layers`, which replaces every instance
  // with a fresh object of identical shape — byte-identical signature, completely different objects.
  // Without the identity half, undo was inaudible: the chain kept driving itself from the orphaned
  // pre-undo instances, and every later slider drag edited the new object while the chain read the old
  // one, so preview silently stopped responding at all (export, which builds fresh, disagreed).
  // Identity is compared over the WHOLE audioFx array rather than the built subset, so this never has
  // to re-derive buildAudioFxChain's filter; a normal param drag mutates in place and stays equal.
  function chainIsCurrent(m, layer) {
    if (!m) return false;
    /* ⚠️ A BOOST-ONLY ROUTING IS A REAL, CURRENT ROUTING — it just has no fx chain (queue 885).
     * This used to bail on `!m._afxChain`, and sync()'s boost-only branch deliberately never sets one:
     * it writes _afxSig and leaves _afxChain null, because when a layer is routed purely for its
     * volume the boost IS the whole path. So every such layer answered "not current" on EVERY call,
     * and sync() went on to disconnect the source, throw away the live GainNode and DynamicsCompressor
     * and build fresh ones at gain 1 — which setBoost then ramps back toward the target over 10ms.
     * AUDIBLE, and it is his own repeated complaint. Drag "Fade in" on a boosted song while it plays:
     * that setter calls FM.reconcileAudio directly on every pointermove, so syncAll runs ~60 times a
     * second, the gain never reaches its target, and the clip warbles between 1.0x and ~2.6x with a
     * click on every reconnect instead of holding a steady 3x.
     * signature() encodes exactly what forces a REBUILD — the boost's presence, and each effect's type
     * and enabled flag — and deliberately NOT the values that ride applyAt/setBoost. So comparing it is
     * the right question on this path too, and a volume or fade change correctly does not rebuild. */
    if (!m._afxChain) {
      if (!m._boost) return false;                                          // not routed at all yet
      if (FM.layerHasAudioFx && FM.layerHasAudioFx(layer)) return false;    // it needs a chain now and has none
      return m._afxSig === signature(layer, m);
    }
    if (m._afxSig !== signature(layer, m)) return false;
    const list = (layer && layer.audioFx) || [];
    const cached = m._afxInsts;
    return !!cached && cached.length === list.length && cached.every((x, i) => x === list[i]);
  }

  FM.audioFxLive = {
    sync(layer) {
      if (!layer || layer.type !== 'video') return;
      const m = FM.media.get(layer.id);
      if (!m || !m.el) return;
      const has = (FM.layerHasAudioFx && FM.layerHasAudioFx(layer)) || needsBoost(layer) || needsLevel(layer, m);   // …or an iPhone level below 100% (queue 690)
      if (!has) {
        if (m._mes) passthrough(m);   // was routed; can't un-route an element, so hand it straight through
        return;                       // never routed and nothing to route: touch nothing, build no context
      }
      // A reversed clip's element is muted — its audio is synthesized in audio-play.js, which builds its
      // own chain. Don't reroute an element that has no signal; if it flips forward, sync routes it then.
      if (layer.reversed && !m._mes) return;
      const ctx = FM.audioCtx();
      const mes = sourceFor(m);
      if (!mes) return;
      const sig = signature(layer, m);
      if (chainIsCurrent(m, layer)) return;
      try { mes.disconnect(); } catch (e) {}
      if (m._afxChain) { try { m._afxChain.dispose(); } catch (e) {} m._afxChain = null; }
      dropBoost(m);
      const chain = FM.buildAudioFxChain(ctx, layer);
      /* Boost stage LAST, after any audio effects — it is the output stage, and a limiter has to be
       * the final thing in the path or an effect downstream of it can push the signal back over the
       * ceiling it was there to hold. A layer routed only because of its volume has no fx chain at
       * all, and then the boost IS the whole chain. */
      const boost = needsBoost(layer) ? makeBoostStage(ctx) : (needsLevel(layer, m) ? makeLevelStage(ctx) : null);
      m._boost = boost;
      const tail = boost ? boost.input : ctx.destination;
      if (!chain) {
        try { mes.connect(tail); } catch (e) {}
        if (boost) { try { boost.output.connect(ctx.destination); } catch (e) {} }
        m._afxSig = boost ? sig : '';
        m._afxInsts = null;
        if (boost) this.setBoost(layer);
        return;
      }
      mes.connect(chain.input);
      chain.output.connect(tail);
      if (boost) { try { boost.output.connect(ctx.destination); } catch (e) {} }
      m._afxChain = chain;
      m._afxSig = sig;
      m._afxInsts = ((layer.audioFx) || []).slice();   // the exact objects the chain now reads from
      chain.applyAt(FM.time || 0);
      if (boost) this.setBoost(layer);
    },

    /* The live gain, called from app.js's volume reconcile every frame. `el.volume` still carries
     * everything up to unity — it is upstream of the source node, so fades, solo, mute and the
     * de-click all keep working exactly as they did — and this carries only the part ABOVE it. The
     * two multiply, so the total is the volume you asked for and nothing had to be reimplemented.
     * Ramped, not assigned: a bare assignment to gain.value on a live graph clicks. */
    setBoost(layer, vol) {
      const m = layer && FM.media.get(layer.id);
      if (!m || !m._boost) return false;
      /* ⚠️ THE FALLBACK MUST INCLUDE THE FADE (queue 886). sync() seeds the stage by calling this with
       * no vol, and reading the RAW layer volume meant a clip with a fade-in came up at FULL boost
       * while its element was still fading from silence — audibly too loud for the first frames, before
       * the playback tick could correct it. The tick's own figure is layerVolume x fadeMul x declick;
       * the first two are what matter at seed time (declick is a transient the tick owns), and using
       * them here means the graph starts where the fade says it should. */
      const _t = FM.time || 0;
      const v = (typeof vol === 'number') ? vol
        : (FM.layerVolume
            ? FM.layerVolume(layer, _t) * (FM.fadeMul ? FM.fadeMul(layer, _t - (layer.start || 0), layer.duration) : 1)
            : 1);
      /* Floored at 1 where el.volume carries everything up to unity — and at 0 on an element whose volume
         cannot be set (an iPhone, queue 690), where this stage is the only thing that can turn it down. */
      const g = Math.max(volumeLocked(m) ? 0 : 1, Math.min(10, isFinite(v) ? v : 1));
      try {
        const ctx = FM.audioCtx();
        m._boost.gain.gain.setTargetAtTime(g, ctx.currentTime, 0.01);
      } catch (e) { try { m._boost.gain.gain.value = g; } catch (e2) {} }
      return true;
    },

    /* ═══ HEAR IT WHILE YOU ARE CHANGING IT (queue 653) ══════════════════════════════════════════
     * Ezra: "Note that we need a way to hear audio effects while messing with them".
     *
     * 🔑 WHY THIS COULD NOT BE DONE BY JUST PRESSING PLAY, which is the whole reason the entry exists
     * and is written down nowhere else. Two facts close that door:
     *   1. `applyAt` — the only thing that pushes a slider's new value into the live audio nodes — is
     *      driven from ONE place, inside the playback tick. Paused, every element is paused and muted,
     *      so a paused project is silent by construction.
     *   2. And the obvious workaround defeats itself: an audio-fx slider writes through `FM.setProp`,
     *      whose FIRST line is `if (FM.playing && FM.pause) FM.pause()`. So you press play, touch the
     *      slider, and the transport stops on the first applied value. You get about one frame of
     *      sound. THAT is what he is describing.
     * ⚠️ So this must NOT go through the transport, and `FM.setProp` must not be "fixed" either — that
     * pause exists to stop a transform edit writing keyframes at a moving time, and loosening it would
     * touch every slider in the app.
     *
     * The audition therefore plays the element itself, with its own frame loop driving `applyAt`, while
     * `FM.playing` stays false. Nothing about the transport changes, and a drag cannot kill the sound.
     *
     * ⚠️ IT ROUTES THROUGH `sync()` AND NEVER BUILDS ITS OWN SOURCE NODE. See `sourceFor` above: an
     * element's MediaElementSource can be created once ever, and a dangling one is a permanently silent
     * clip. It also refuses the cases where auditioning would be a lie: a reversed clip (its element is
     * muted and its audio is synthesized elsewhere), a hidden or muted layer, and one silenced by solo —
     * auditioning a clip that is silent in the real project would be worse than not offering it. */
    audition(layer, opts) {
      if (!layer || layer.type !== 'video') return false;
      if (layer.reversed) return 'reversed';
      if (layer.visible === false || layer.muted) return 'silent';
      if (FM.soloSilenced && FM.soloSilenced(layer)) return 'solo';
      const m = FM.media.get(layer.id);
      if (!m || !m.el) return false;
      this.stopAudition();
      this.sync(layer);                     // builds/refreshes the chain and routes the element
      try { FM.audioCtx(); } catch (e) {}   // inside the click stack, or iOS never starts it
      const seconds = (opts && opts.seconds) || 2.5;
      const ctl = (opts && opts.control) || null;   // the selector of the button that stops it — see the tick
      /* Start from where the playhead is if it is over the clip, and from the clip's own start if it
         is not — auditioning silence because the playhead happens to sit past the end is the kind of
         "it does nothing" that reads as a broken button. */
      let t0 = 0;
      try {
        const local = FM.layerLocalTime ? FM.layerLocalTime(layer, FM.time) : null;
        t0 = (local != null && local >= 0 && local <= (m.el.duration || Infinity)) ? local : (layer.trimStart || 0);
      } catch (e) { t0 = layer.trimStart || 0; }
      const wasMuted = m.el.muted, wasTime = m.el.currentTime, wasVol = m.el.volume, wasRate = m.el.playbackRate;
      /* AT THE CLIP'S OWN SPEED, like the real playback (queue 916). The element keeps whatever rate it
         was last given — 1 for a clip that has never played — so a 2x clip auditioned at 1x, and since
         a sped-up clip now sounds sped up (clause 1), that is a different sound from the one it makes
         in the project. A ramp is followed frame by frame in the tick below. */
      const rateAt = function (srcT) {
        const sp = FM.speedAt ? FM.speedAt(layer, auditionSceneTime(layer, srcT)) : 1;
        return Math.min(16, Math.max(0.0625, sp || 1));
      };
      /* Volume and mute are reconciled inside the playback tick, which is not running — so they are set
         by hand here, and put back on stop. Without this the element is still muted from the last frame
         of playback and the audition is silent for a reason nothing on screen would explain. */
      try {
        m.el.muted = false;
        const v = FM.layerVolume ? FM.layerVolume(layer, FM.time) : 1;
        m.el.volume = Math.max(0, Math.min(1, v == null ? 1 : v));
        m.el.currentTime = t0;
        if (FM.pitchFollowsSpeed) FM.pitchFollowsSpeed(m.el);
        try { m.el.playbackRate = rateAt(t0); } catch (e) {}
        const pr = m.el.play();
        if (pr && pr.catch) pr.catch(() => {});
      } catch (e) { return false; }
      const self = this;
      _aud = {
        layer: layer, m: m, t0: t0, wasMuted: wasMuted, wasTime: wasTime, wasVol: wasVol, wasRate: wasRate, raf: 0,
      };
      const tick = function () {
        if (!_aud || _aud.m !== m) return;
        /* FOUR WAYS IT MUST STOP ITSELF, all of them states where the button that would stop it is no
           longer reachable. Sound with no visible source is the worst stuck state this app can have,
           because there is nothing on screen to connect it to.
           NOT stopped on an effect edit, deliberately: toggling an effect off while auditioning is how
           you hear what it was doing, and the chain is rebuilt under us — `applyAt` reads m._afxChain
           fresh every frame, so that keeps working by construction. */
        if (FM.playing) { self.stopAudition(); return; }                                   // the transport takes over
        /* …and an EXPORT takes over too (queue 916, clause 2). The audition keeps FM.playing false on
           purpose, so the line above never saw one — and its loop below jumps the element back to t0
           every 2.5s, undoing the exporter's per-frame seeks: frames past that point were drawn from the
           wrong moment, and the clip was still looping after the export finished. The export entry
           points stop it before they begin; this is the backstop for any that forgets. */
        if (FM._exporting) { self.stopAudition(); return; }
        const layers = (FM.scene && FM.scene.layers) || [];
        if (layers.indexOf(layer) < 0) { self.stopAudition(); return; }                    // the layer was deleted
        /* …and the one that covers every door out of the panel at once (queue 690): THE STOP BUTTON IS
           GONE. An audition started from a Hear button names that button's selector (opts.control), and
           the moment no such button is on screen it stops. Only collapsing the row used to stop it, so
           backing out with ‹ Effects, tapping away to deselect the clip, switching to the visual tab or
           opening Home all left the same 2.5 s of his song looping over a panel with no stop on it — the
           hunt measured it still playing 3 s after ‹ Effects, with 0 stop buttons on screen. Checking the
           button rather than patching each exit is the point: a new way out of the panel is covered
           without anyone remembering this. A call with no control (the suite drives audition() directly)
           keeps the three rules above and nothing else. getClientRects is empty for an element that is
           gone or under display:none; one query a frame, only while an audition runs. */
        if (ctl) {
          const b = document.querySelector(ctl);
          const home = FM.home && FM.home.isOpen && FM.home.isOpen();   // Home covers the editor without removing it
          if (!b || !b.getClientRects().length || home) {
            self.stopAudition();
            if (b && FM.inspector) FM.inspector.refresh();   // a button still in the panel (under Home) must not stay lit as Stop
            return;
          }
        }
        if (m.el.ended) { try { m.el.currentTime = _aud.t0; m.el.play(); } catch (e) {} }   // ran off the end
        try {
          if (m.el.currentTime - _aud.t0 > seconds) m.el.currentTime = _aud.t0;   // a short loop, so you hear the change repeatedly
          /* THE LINE THE WHOLE FEATURE RESTS ON. applyAt re-reads the effect's params every call, so a
             slider being dragged right now is heard on the next frame — that is "hear it while you are
             messing with it", and it costs nothing extra because the chain already works this way.
             Scene time through the clip's SPEED (queue 916, clause 10) — see auditionSceneTime. */
          const scene = auditionSceneTime(layer, m.el.currentTime);
          if (m._afxChain) m._afxChain.applyAt(scene);
          if (FM.isAnimated && FM.isAnimated(layer.speed)) {   // a ramp: follow the curve, as the playback tick does
            const r = rateAt(m.el.currentTime);
            if (Math.abs((m.el.playbackRate || 1) - r) > 1e-3) m.el.playbackRate = r;
          }
        } catch (e) {}
        _aud.raf = requestAnimationFrame(tick);
      };
      _aud.raf = requestAnimationFrame(tick);
      return true;
    },

    stopAudition() {
      if (!_aud) return false;
      const a = _aud; _aud = null;
      if (a.raf) { try { cancelAnimationFrame(a.raf); } catch (e) {} }
      try {
        a.m.el.pause();
        a.m.el.muted = a.wasMuted;
        a.m.el.volume = a.wasVol;
        if (a.wasRate > 0) a.m.el.playbackRate = a.wasRate;
        // Put the picture back where it was — unless an export already owns the element, in which case
        // its seeks are the truth and a restore here would be one more jump backwards (queue 916).
        if (!FM._exporting) a.m.el.currentTime = a.wasTime;
      } catch (e) {}
      if (FM.requestRender) FM.requestRender();
      return true;
    },

    auditioning(layer) { return !!_aud && (!layer || _aud.layer === layer); },

    // Exposed so the suite can assert the routing decision without standing up a real graph.
    needsBoost(layer) { return needsBoost(layer); },
    volumeLocked(m) { return volumeLocked(m); },            // queue 690: an iPhone element whose el.volume is read-only
    needsLevel(layer) { return needsLevel(layer, layer && FM.media.get(layer.id)); },
    boostOf(layer) { return boostOf(layer); },
    makeLimiter(ctx) { return makeLimiter(ctx); },   // the reversed preview's output stage (queue 916)

    // Exposed so the invariant above can be asserted without standing up a real audio graph.
    isChainCurrent(m, layer) { return chainIsCurrent(m, layer); },

    syncAll() {
      const layers = (FM.scene && FM.scene.layers) || [];
      for (let i = 0; i < layers.length; i++) if (layers[i].type === 'video') this.sync(layers[i]);
    },

    // Runs every rAF frame: only layers that actually built a chain cost anything.
    applyAt(sceneTime) {
      const layers = (FM.scene && FM.scene.layers) || [];
      for (let i = 0; i < layers.length; i++) {
        const l = layers[i];
        if (l.type !== 'video') continue;
        const m = FM.media.get(l.id);
        if (m && m._afxChain) m._afxChain.applyAt(sceneTime);
      }
      // Reversed clips own their chains inside audio-play.js; animate them from the same tick.
      if (FM.audioPlay && FM.audioPlay.applyAt) FM.audioPlay.applyAt(sceneTime);
    },

    // Delete keeps the media rec alive for undo, so drop the chain but leave the element handed
    // through — restoring the layer must not come back silent.
    release(layerId) {
      const m = FM.media.get(layerId);
      if (m && m._mes) passthrough(m);
      else if (m) m._afxSig = '';
    },

    // FM.audioCtx() CREATES the context, so only reach for it when this project actually needs one —
    // a project with no effects and no reversed audio must not spend one of iOS's ~4 live contexts just
    // by pressing play. audioPlay.start() holds the same line for reversed clips; both must, or neither does.
    resume() {
      const layers = (FM.scene && FM.scene.layers) || [];
      let need = false;
      for (let i = 0; i < layers.length && !need; i++) {
        const l = layers[i];
        if (l.type !== 'video') continue;
        const m = FM.media.get(l.id);
        if ((m && m._mes) || (FM.layerHasAudioFx && FM.layerHasAudioFx(l))) need = true;
      }
      if (!need) return;
      try { FM.audioCtx(); } catch (e) {}   // creates if absent, resume()s if suspended
    },
  };
})(window.FM);
