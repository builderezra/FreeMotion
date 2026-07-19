/* FreeMotion — Behaviors. Procedural, live modifiers layered on a layer's transform AFTER keyframes:
 * wiggle / oscillate / bounce / follow / audio-drive. One optional array — layer.behaviors — drives it;
 * absent or empty means the render is byte-for-byte the old one (behaviorValue early-outs here). The
 * compositor calls FM.behaviorValue for x/y/scale/rotation and FM.layerOpacity for opacity; storage and
 * the inspector read FM.behaviorRegistry. Params are static numbers/strings in v1 (no keyframes on them). */
window.FM = window.FM || {};
(function (FM) {
  'use strict';

  // Own-property lookups ONLY (a bare TABLE[userStr] walks the prototype chain, so a hostile type of
  // 'toString' would resolve to a function — a real class of bug in this codebase).
  const hasOwn = function (o, k) { return !!o && Object.prototype.hasOwnProperty.call(o, k); };
  const num = function (v, d) { return (typeof v === 'number' && isFinite(v)) ? v : d; };
  const clamp = function (v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; };
  // Byte-identical to compositor.js clamp01, so a layer with no behaviors resolves opacity exactly as before.
  const clamp01 = function (v) { return v < 0 ? 0 : v > 1 ? 1 : v; };

  // Deterministic value-noise basis. compositor.js's wiggle uses an identical function, but that one is
  // file-local (not on FM) so it is duplicated here — a pure sum of incommensurate sines: same time ->
  // same value, so behavior wiggle is flicker-free and exports identically.
  function wnoise(u) { return Math.sin(u * 6.283) * 0.5 + Math.sin(u * 14.77 + 1.3) * 0.3 + Math.sin(u * 28.6 + 2.7) * 0.2; }

  const BANDS = { overall: 1, bass: 1, mid: 1, treble: 1 };   // audio-drive band whitelist

  // ---- registry ---------------------------------------------------------------------------------
  const ALL_PROPS = ['x', 'y', 'scale', 'rotation', 'opacity'];
  const DEFAULT_PROP = { wiggle: 'x', oscillate: 'y', bounce: 'y', follow: 'x', audio: 'scale' };

  // Every param carries BOTH `def` and `default` (same value) so a consumer reading either key resolves
  // the default — the behaviors contract says `def`, fxRegistry says `default`, and the UI / import code
  // is authored in parallel; carrying both removes the naming mismatch as a coordination risk.
  function rng(key, label, min, max, step, def, unit) {
    return { key: key, label: label, type: 'range', min: min, max: max, step: step, def: def, 'default': def, unit: unit || '' };
  }
  function seg(key, label, options, def) {
    return { key: key, label: label, type: 'segment', options: options, def: def, 'default': def };
  }
  function layerPick(key, label, filter) {
    return { key: key, label: label, type: 'layer', filter: filter || '', def: '', 'default': '' };
  }

  const DEFS = [
    { type: 'wiggle', label: 'Wiggle', props: ALL_PROPS.slice(), params: [
      rng('amp', 'Amount', 0, 400, 0.5, 20, ''),
      rng('freq', 'Frequency', 0.1, 12, 0.1, 2, 'Hz'),
      rng('seed', 'Seed', 0, 1000, 1, 0, ''),
    ] },
    { type: 'oscillate', label: 'Oscillate', props: ALL_PROPS.slice(), params: [
      rng('amp', 'Amount', 0, 400, 0.5, 30, ''),
      rng('freq', 'Frequency', 0.05, 10, 0.05, 1, 'Hz'),
      rng('phase', 'Phase', 0, 360, 1, 0, '°'),
    ] },
    { type: 'bounce', label: 'Bounce', props: ALL_PROPS.slice(), params: [
      rng('elastic', 'Bounce', 0, 1, 0.01, 0.5, ''),
      rng('freq', 'Frequency', 0.1, 12, 0.1, 3, 'Hz'),
      rng('decay', 'Decay', 0.1, 20, 0.1, 4, '/s'),
    ] },
    { type: 'follow', label: 'Follow', props: ALL_PROPS.slice(), params: [
      layerPick('targetId', 'Follow layer', ''),
      rng('mult', 'Multiplier', -3, 3, 0.05, 1, '×'),
      rng('offset', 'Offset', -500, 500, 1, 0, ''),
      rng('delay', 'Delay', 0, 2, 0.01, 0, 's'),
    ] },
    { type: 'audio', label: 'Audio Drive', props: ALL_PROPS.slice(), params: [
      layerPick('sourceId', 'Audio from', 'video'),
      seg('band', 'Band', ['overall', 'bass', 'mid', 'treble'], 'overall'),
      rng('gain', 'Sensitivity', 0.5, 4, 0.1, 1, '×'),
      rng('amount', 'Amount', -400, 400, 1, 50, ''),
      rng('smooth', 'Smoothing', 0, 1, 0.01, 0.4, ''),
    ] },
  ];

  const REG = {};
  DEFS.forEach(function (d) { REG[d.type] = d; });

  FM.behaviorRegistry = {
    all: function () { return DEFS.slice(); },
    get: function (type) { return hasOwn(REG, type) ? REG[type] : null; },
    paramsOf: function (type) { return hasOwn(REG, type) ? REG[type].params.slice() : []; },
    // THE single creation path — one instance targeting `prop` (falls back to a sensible prop per type).
    makeInstance: function (type, prop) {
      if (!hasOwn(REG, type)) return null;
      const d = REG[type];
      const target = (d.props.indexOf(prop) >= 0) ? prop : (DEFAULT_PROP[type] || d.props[0]);
      const params = {};
      d.params.forEach(function (pp) {
        params[pp.key] = (pp.def != null) ? pp.def : (pp['default'] != null ? pp['default'] : 0);
      });
      // A wiggle needs its own phase so two wiggles on one prop don't move in lockstep; chosen once at
      // creation and stored (deterministic thereafter, like FM.randomFill's create-time colour).
      if (hasOwn(params, 'seed')) params.seed = Math.floor(Math.random() * 1000);
      return { type: type, prop: target, enabled: true, params: params };
    },
  };

  // ---- per-behavior evaluators (additive delta, except follow which returns a REPLACEMENT value) ----

  function wiggleDelta(params, t) {
    const amp = num(params.amp, 0), freq = num(params.freq, 0), seed = num(params.seed, 0);
    return amp * wnoise(t * freq + seed);
  }
  function oscillateDelta(params, t) {
    const amp = num(params.amp, 0), freq = num(params.freq, 0), phase = num(params.phase, 0);
    return amp * Math.sin(2 * Math.PI * freq * t + phase * Math.PI / 180);
  }
  // Inertial bounce AFTER each keyframe move: reads the RAW keyframed prop (needs >=2 kf), finds the most
  // recent keyframe at/<= t, and adds a decaying sine scaled by the value JUMP entering that keyframe.
  function bounceDelta(layer, key, params, t) {
    const p = layer.transform && layer.transform[key];
    if (!FM.isAnimated || !FM.isAnimated(p)) return 0;
    const kf = p.kf;
    if (!kf || kf.length < 2) return 0;
    let i = -1;
    for (let j = 0; j < kf.length; j++) { if (kf[j].t <= t) i = j; else break; }
    if (i <= 0) return 0;                       // before the first move, or no prior keyframe to jump from
    const jump = kf[i].v - kf[i - 1].v;
    if (!jump) return 0;                        // no move (also rejects NaN from a non-numeric kf value)
    const dt = t - kf[i].t;
    if (dt < 0) return 0;
    const elastic = num(params.elastic, 0.5), freq = num(params.freq, 3), decay = num(params.decay, 4);
    const d = jump * elastic * Math.exp(-decay * dt) * Math.sin(2 * Math.PI * freq * dt);
    return isFinite(d) ? d : 0;
  }
  // Audio-drive: amount * envelope(t). The SYNC accessor returns null while decoding (or if the source has
  // no audio) -> delta 0, a no-op that starts working once the background decode populates the cache.
  function audioDelta(params, t) {
    const sync = FM.audioEnvelopeSync;
    if (!sync) return 0;
    const scene = FM.scene; if (!scene) return 0;
    const srcId = params.sourceId;
    if (typeof srcId !== 'string' || !srcId) return 0;
    const src = FM.layerById(scene, srcId);
    if (!src) return 0;
    const band = BANDS[params.band] ? params.band : 'overall';
    const gain = num(params.gain, 1);
    const smooth = clamp(num(params.smooth, 0.4), 0, 1);
    const attack = 0.005 + smooth * 0.055, release = 0.03 + smooth * 0.37;   // one slider -> attack/release seconds
    const env = sync(src, { band: band, gain: gain, attack: attack, release: release });
    if (!env) return 0;
    const sampleAt = FM.audioEnvelopeSampleAt || sampleEnvFallback;
    const e = sampleAt(env, t);
    const d = num(params.amount, 0) * (isFinite(e) ? e : 0);
    return isFinite(d) ? d : 0;
  }
  // Linear-interp sampler (0 outside the clip span) used ONLY if audio-react.js hasn't defined
  // FM.audioEnvelopeSampleAt yet — identical semantics, so results match once the real one is present.
  function sampleEnvFallback(env, t) {
    if (!env) return 0;
    const cs = env.clipStart || 0, cd = env.clipDur || 0;
    if (!(t >= cs) || t > cs + cd) return 0;
    const vals = env.values, n = vals ? vals.length : 0;
    if (!n) return 0;
    if (n === 1) return vals[0] > 0 ? vals[0] : 0;
    const fps = env.fps || 30, f = (t - cs) * fps;
    if (f <= 0) return vals[0] > 0 ? vals[0] : 0;
    if (f >= n - 1) return vals[n - 1] > 0 ? vals[n - 1] : 0;
    const i = f | 0, frac = f - i, a = vals[i], b = vals[i + 1], v = a + (b - a) * frac;
    return v > 0 ? v : 0;
  }
  // Follow: REPLACES base with mult * (target's RAW prop at t-delay) + offset. Reads the target's raw
  // evalProp (NOT its own behaviors), so there is no recursion and cycles are structurally impossible; a
  // missing target, a self-reference, or a target already in `seen` falls back to base.
  function followValue(layer, key, base, t, params, seen) {
    const scene = FM.scene;
    if (!scene) return base;
    const targetId = params.targetId;
    if (typeof targetId !== 'string' || !targetId || targetId === layer.id) return base;
    if (seen && seen.has && seen.has(targetId)) return base;
    const target = FM.layerById(scene, targetId);
    if (!target || !target.transform) return base;
    const mult = num(params.mult, 1), offset = num(params.offset, 0), delay = num(params.delay, 0);
    const raw = FM.evalProp(target.transform[key], t - delay);
    const tv = (typeof raw === 'number' && isFinite(raw)) ? raw : 0;
    const v = mult * tv + offset;
    return isFinite(v) ? v : base;
  }

  // ---- the resolver the compositor calls --------------------------------------------------------

  // Apply every enabled behavior targeting `key` to the scalar `base` (already evalProp'd) and return the
  // result. Order within a prop: a follow REPLACES the base, then the additive behaviors (wiggle/oscillate/
  // bounce/audio) sum on top — so a follower can also be wiggled, regardless of array order among them.
  // No behaviors for `key` (or none at all) returns `base` UNCHANGED: the diff-free guarantee. Never NaN.
  FM.behaviorValue = function (layer, key, base, t, seen) {
    const bs = layer && layer.behaviors;
    if (!bs || !bs.length) return base;           // cheap early-out — byte-for-byte the old render
    let replaced = base, add = 0, touched = false;
    for (let i = 0; i < bs.length; i++) {
      const b = bs[i];
      if (!b || b.enabled === false || b.prop !== key || !hasOwn(REG, b.type)) continue;
      touched = true;
      const params = b.params || {};
      if (b.type === 'follow') {
        const v = followValue(layer, key, base, t, params, seen);
        if (isFinite(v)) replaced = v;
        continue;
      }
      let d = 0;
      if (b.type === 'wiggle') d = wiggleDelta(params, t);
      else if (b.type === 'oscillate') d = oscillateDelta(params, t);
      else if (b.type === 'bounce') d = bounceDelta(layer, key, params, t);
      else if (b.type === 'audio') d = audioDelta(params, t);
      if (isFinite(d)) add += d;
    }
    if (!touched) return base;                    // behaviors exist but none target this prop -> unchanged
    const out = replaced + add;
    return isFinite(out) ? out : base;            // never emit NaN — fall back to the plain base
  };

  // Opacity resolves through the same pipeline, clamped to [0,1]. Matches the old inline expression
  // clamp01(FM.evalProp(layer.transform.opacity, t)) exactly when the layer has no behaviors.
  FM.layerOpacity = function (layer, t) {
    return clamp01(FM.behaviorValue(layer, 'opacity', FM.evalProp(layer.transform.opacity, t), t));
  };
})(window.FM);
