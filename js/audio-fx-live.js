/* FreeMotion — Live preview routing for audio effects.
 * A forward clip's <video> element audio can't be filtered while it plays itself, so a layer that has
 * audio effects gets its element pulled into Web Audio: el -> MediaElementSource -> chain -> speakers.
 * el.volume / el.muted stay upstream of the source node, so app.js's volume/fade/solo/mute reconcile
 * keeps working untouched. A layer with no audio effects is never routed at all — it keeps today's
 * exact native path.
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
   * A layer at or below 100% is still NEVER routed, and keeps today's exact native path. */
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

  // Structure = what forces a rebuild (order, types, enabled). Param values do not; they ride applyAt.
  // The boost STAGE's presence is structural too — its gain value is not, that rides setBoost.
  function signature(layer) {
    const fx = (layer && layer.audioFx) || [];
    let s = needsBoost(layer) ? 'B|' : '';
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
  function makeBoostStage(ctx) {
    const gain = ctx.createGain();
    gain.gain.value = 1;
    const lim = ctx.createDynamicsCompressor();
    try {
      lim.threshold.value = -1.5;    // dBFS — start holding just under the ceiling
      lim.knee.value = 0;            // hard knee: a limiter, not a compressor colouring the sound
      lim.ratio.value = 20;
      lim.attack.value = 0.003;
      lim.release.value = 0.12;
    } catch (e) {}
    gain.connect(lim);
    return { input: gain, output: lim, gain: gain };
  }

  // The element's source node is created ONCE per element, ever: a second call throws, and once it
  // exists the element's audio flows ONLY through Web Audio — so a dangling source = a permanently
  // silent clip. Cached on the media rec (underscore = never serialized), which is replaced together
  // with the element when media is swapped, so a new element naturally gets a new source.
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
    if (!m || !m._afxChain) return false;
    if (m._afxSig !== signature(layer)) return false;
    const list = (layer && layer.audioFx) || [];
    const cached = m._afxInsts;
    return !!cached && cached.length === list.length && cached.every((x, i) => x === list[i]);
  }

  FM.audioFxLive = {
    sync(layer) {
      if (!layer || layer.type !== 'video') return;
      const m = FM.media.get(layer.id);
      if (!m || !m.el) return;
      const has = (FM.layerHasAudioFx && FM.layerHasAudioFx(layer)) || needsBoost(layer);
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
      const sig = signature(layer);
      if (chainIsCurrent(m, layer)) return;
      try { mes.disconnect(); } catch (e) {}
      if (m._afxChain) { try { m._afxChain.dispose(); } catch (e) {} m._afxChain = null; }
      dropBoost(m);
      const chain = FM.buildAudioFxChain(ctx, layer);
      /* Boost stage LAST, after any audio effects — it is the output stage, and a limiter has to be
       * the final thing in the path or an effect downstream of it can push the signal back over the
       * ceiling it was there to hold. A layer routed only because of its volume has no fx chain at
       * all, and then the boost IS the whole chain. */
      const boost = needsBoost(layer) ? makeBoostStage(ctx) : null;
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
      const v = (typeof vol === 'number') ? vol
        : (FM.layerVolume ? FM.layerVolume(layer, FM.time || 0) : 1);
      const g = Math.max(1, Math.min(10, isFinite(v) ? v : 1));
      try {
        const ctx = FM.audioCtx();
        m._boost.gain.gain.setTargetAtTime(g, ctx.currentTime, 0.01);
      } catch (e) { try { m._boost.gain.gain.value = g; } catch (e2) {} }
      return true;
    },

    // Exposed so the suite can assert the routing decision without standing up a real graph.
    needsBoost(layer) { return needsBoost(layer); },
    boostOf(layer) { return boostOf(layer); },

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
