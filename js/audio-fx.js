/* FreeMotion — Audio effect registry + signal chain. Mirrors fx-registry.js: the defs here are the
 * source of truth, the UI derives from them, and ONE builder wires a layer's chain (layer.audioFx) for
 * BOTH preview (live AudioContext) and export (OfflineAudioContext). Every effect is a pure node graph —
 * no ScriptProcessor, no worklet, no timers — so the render is what you heard. Modulation is pinned to
 * SCENE time (scene 0 = LFO phase 0), so an export renders the same sweep wherever its range starts;
 * preview pins that phase when the chain is BUILT, so it re-syncs on a rebuild rather than on each seek.
 */
window.FM = window.FM || {};
(function (FM) {
  'use strict';

  // iOS caps live AudioContexts (~4). This is THE one; never construct another live context.
  let _ac = null;
  FM.audioCtx = function () {
    FM.playbackSession();   // before the context exists, so its very first sound is in the right session (queue 690)
    if (!_ac) { const AC = window.AudioContext || window.webkitAudioContext; _ac = new AC(); }
    if (_ac.state === 'suspended') _ac.resume();
    return _ac;
  };
  /* ═══ WEB AUDIO MUST BE "PLAYBACK", OR THE SILENT SWITCH MUTES IT (queue 690, audio hunt) ═══════════════
   * His #562: "Previewing sound effects in the sound effect menu doesn't work". v12.78 fixed a real throw
   * there; this is the half a desktop can never show.
   * On an iPhone, WebKit chooses the audio session from what the page is playing: an audible media element
   * gets the PLAYBACK session, but a page playing only Web Audio gets AMBIENT — and ambient is exactly what
   * Silent mode mutes. The ▶ in Add ▸ Audio ▸ Sound effects is Web Audio alone (js/sfx.js preview), and so
   * are reversed clips (js/audio-play.js), while every clip's element sits paused and muted whenever the
   * transport is stopped. So with the phone on silent every ▶ made no sound at all, while his ordinary
   * clips played. navigator.audioSession (Safari 16.4+) is the page's way to say "this is media": WebKit
   * takes that type ahead of its own guess.
   * Asked every time the shared context is reached, not once, because a browser that grows the API later
   * and a microphone that has just been released both need it put back — and it is one property read.
   * Only ever moved off 'auto', so nothing the page chose on purpose is overwritten. WHILE THE MIC IS OPEN
   * it is left alone: WebKit picks play-and-record for a capture itself, and an override would take
   * precedence over that — js/voice-rec.js hands the choice back to WebKit before it asks for the mic.
   * A browser without the API keeps today's behaviour exactly. */
  FM.playbackSession = function () {
    let s = null;
    try { s = navigator.audioSession; } catch (e) { s = null; }
    if (!s) return false;
    try {
      if (FM.voiceRec && FM.voiceRec.micLive && FM.voiceRec.micLive()) return false;
      if (s.type === 'auto') s.type = 'playback';
      return s.type === 'playback';
    } catch (e) { return false; }
  };
  // The context if there IS one, without creating or resuming anything. app.js's transport clock
  // reads this: it wants the audio clock when one is already running, but pressing play on a
  // project with no effects and no reversed audio must not spend one of iOS's ~4 context slots.
  FM.audioCtxIfAny = function () { return _ac; };

  function clamp(v, lo, hi) { return v < lo ? lo : (v > hi ? hi : v); }
  function dbToLin(db) { return Math.pow(10, db / 20); }

  /* ═══ A HARD-KNEE DynamicsCompressor TURNS EVERYTHING UP, AND NOTHING SAYS SO (queue 986, hunt C2) ═══════
   * The Web Audio spec gives every DynamicsCompressorNode an automatic makeup gain it cannot switch off:
   * (1 / the curve's gain at 0 dBFS) ^ 0.6. With a hard knee and ratio R that is −0.6·(1 − 1/R)·T dB
   * — +0.57 dB for each dB the threshold T sits below 0 at 20:1. So a "Ceiling" of −6 was really a
   * 20:1 compressor followed by +3.4 dB: MEASURED in the suite's Chrome, a full-scale sine came out at
   * −2.1 dBFS, not near −6, and at a −24 ceiling a quiet −40 dBFS line came out 13.7 dB LOUDER
   * (−26.3) while a full-scale one sat at −8.6. The boost limiter on a clip above 100 % (−1.5 dBFS,
   * js/audio-fx-live.js) carried the same +0.86 dB and let a 1000 % sine out at 1.11 — over full scale.
   * This is the gain that cancels it, applied after the node: below the threshold the level is then
   * untouched, and above it the 20:1 slope is all that is left (a full-scale sine lands within ~1.7 dB of
   * a −24 ceiling, within 0.5 dB of −6 — the node's ratio stops at 20, which is as hard as it gets).
   * Spec maths, not a tuned number: the same line holds in every engine that follows the spec. */
  function hardKneeMakeupCancel(thresholdDb, ratio) {
    const r = ratio > 1 ? ratio : 1;
    return dbToLin(0.6 * (1 - 1 / r) * Math.min(0, thresholdDb));
  }
  FM._hardKneeMakeupCancel = hardKneeMakeupCancel;   // one definition: the boost limiter (audio-fx-live.js) uses it too

  /* ---- curves ---- */
  // A WaveShaper curve sampled over its input domain [-1, 1]. Shared between instances (never mutated).
  function curveFrom(fn, n) {
    n = n || 4096;
    const c = new Float32Array(n);
    for (let i = 0; i < n; i++) c[i] = fn((i / (n - 1)) * 2 - 1);
    return c;
  }
  function driveCurve(drive) {
    const k = clamp(drive, 0, 100) * 0.35;
    if (k < 1e-3) return curveFrom(x => x);
    const norm = Math.tanh(k);
    return curveFrom(x => Math.tanh(k * x) / norm);
  }
  /* ═══ BITS 13–16 WERE THE DRY SOUND (queue 986, hunt C18) ═══════════════════════════════════════════════
     A WaveShaper interpolates LINEARLY between its curve points, so a staircase only survives while each step
     spans several points. At 8192 points a 13-bit step is one point wide and the staircase interpolates back
     into a straight line: MEASURED at 768c83d0 on a −40 dBFS sine, bits 14, 15 and 16 rendered byte-identical
     (error −121 dB — float noise, i.e. the dry signal) where a real quantiser leaves −92.5 / −95.4 / −101.1 dB;
     12 bits was 5 dB too clean and 11 bits 1.5 dB. So the top quarter of the slider did nothing.
     Now a curve has 8 points per step whatever the depth (2^bits × 8 + 1, so every point lands on an exact
     multiple of step/8 and each riser is 1/8 of a step wide). Up to 10 bits that is ≤ 8192 and the curve is
     left EXACTLY as it was, so the default 6 bits — and every depth that already worked — is byte-identical.
     16 bits is 2 MB of curve, so each depth is built once and shared (a curve is never mutated; setting
     `.curve` copies it). */
  const _crushCache = {};
  function crushCurve(bits) {
    const b = Math.round(clamp(bits, 1, 16));
    if (_crushCache[b]) return _crushCache[b];
    const step = 2 / Math.pow(2, b);
    return (_crushCache[b] = curveFrom(x => Math.round(x / step) * step, b <= 10 ? 8192 : Math.pow(2, b) * 8 + 1));
  }
  function lofiCurve(amount) {
    const a = clamp(amount, 0, 1);
    const step = 2 / Math.pow(2, Math.max(2, Math.round(16 - a * 10)));
    const k = a * 3;
    const norm = Math.tanh(k) || 1;
    return curveFrom(x => { const q = Math.round(x / step) * step; return k < 1e-3 ? q : Math.tanh(k * q) / norm; }, 8192);
  }
  const BITE = curveFrom(x => Math.tanh(1.8 * x) / Math.tanh(1.8));   // the little bit of grit that sells a phone line

  /* ---- reverb impulse ---- */
  // Deterministic noise: a Math.random IR would differ between the preview build and the export build,
  // so the same project would render a reverb tail it never played. Seeded per (size, decay, rate).
  function rng(seed) {
    let a = seed >>> 0;
    return function () { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), 1 | t); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  }
  const _irCache = {};   // "size|decay|rate" -> AudioBuffer, so scrubbing Mix never regenerates noise
  /* The one warning label in this file, and it is his (the per-effect-slider entry): *"if audio key
     frames break the project and lag too much just put a warning next to it before use"*. It is shown
     only when Size or Decay is ACTUALLY animated, because a warning that is always on is wallpaper.
     Plain language on purpose — this is written for Ezra to read, not for a developer. */
  const AFX_REVERB_KF_WARN = 'Heads up: animating the room is the expensive one. Every different room has to be built and played at once, so a long tail that moves a lot can slow an export down and may stutter while you preview it. Short moves and short tails are cheap.';

  function impulse(ctx, size, decay) {
    const sr = ctx.sampleRate;
    const key = size.toFixed(3) + '|' + decay.toFixed(3) + '|' + sr;
    if (_irCache[key]) return _irCache[key];
    const len = Math.max(1, Math.floor(sr * decay));
    const buf = ctx.createBuffer(2, len, sr);
    const density = 0.1 + size * 0.9;   // a small room reflects off fewer surfaces → sparser, tighter tail
    const pow = 2.4 - size * 1.4;       // …and dies faster at the head
    for (let ch = 0; ch < 2; ch++) {
      const d = buf.getChannelData(ch);
      const r = rng(Math.floor(size * 1e4) * 31 + Math.floor(decay * 1e4) * 7 + ch * 977 + 1);
      for (let i = 0; i < len; i++) {
        const env = Math.pow(1 - i / len, pow);
        d[i] = r() < density ? (r() * 2 - 1) * env : 0;
      }
    }
    const keys = Object.keys(_irCache);
    if (keys.length > 12) delete _irCache[keys[0]];
    _irCache[key] = buf;
    return buf;
  }

  /* ---- LFO waveforms ---- */
  // One cycle per buffer, so an LFO's frequency is playbackRate / buffer.duration. These ride a looping
  // AudioBufferSource rather than an OscillatorNode for two reasons: start(when, offset) makes the offset
  // a real PHASE control, which an oscillator has none of; and `ramp` is an EXACT linear ramp, where an
  // oscillator's sawtooth is a truncated Fourier series that reads 0.424 at quarter-phase (measured)
  // against a true ramp's 0.5 — a warp the granular pitch shifter cannot absorb.
  const LFO_WAVE = {
    sine: p => Math.sin(2 * Math.PI * p),
    ramp: p => p,
    win: p => Math.sin(Math.PI * p),   // w(p)² + w(p+½)² = 1, and exactly 0 where `ramp` resets
  };
  const _lfoCache = {};   // "wave|secs|rate" -> AudioBuffer, shared by every LFO of a kind in a context
  function lfoBuffer(ctx, wave, secs) {
    const sr = ctx.sampleRate;
    const key = wave + '|' + secs.toFixed(4) + '|' + sr;
    if (_lfoCache[key]) return _lfoCache[key];
    const len = Math.max(2, Math.round(sr * secs));
    const buf = ctx.createBuffer(1, len, sr);
    const d = buf.getChannelData(0), fn = LFO_WAVE[wave];
    for (let i = 0; i < len; i++) d[i] = fn(i / len);   // i/len, not i/(len−1): sample `len` must BE sample 0
    const keys = Object.keys(_lfoCache);
    if (keys.length > 12) delete _lfoCache[keys[0]];
    _lfoCache[key] = buf;
    return buf;
  }

  /* ---- build helpers ---- */
  // Per-build node factory: everything it mints is tracked for dispose(). LFO sources are deliberately
  // NOT started here — only buildAudioFxChain knows which scene time ctx time 0 is, and that is the
  // phase (see arm()). Every source is stopped on dispose.
  function shop(ctx) {
    const nodes = [], oscs = [], lfos = [];
    return {
      nodes: nodes, oscs: oscs, lfos: lfos,
      gain: function (v) { const n = ctx.createGain(); if (v != null) n.gain.value = v; nodes.push(n); return n; },
      delay: function (max) { const n = ctx.createDelay(max || 1); nodes.push(n); return n; },
      biquad: function (type, freq, q, gain) { const n = ctx.createBiquadFilter(); n.type = type; if (freq != null) n.frequency.value = freq; if (q != null) n.Q.value = q; if (gain != null) n.gain.value = gain; nodes.push(n); return n; },
      shaper: function (curve, over) { const n = ctx.createWaveShaper(); if (curve) n.curve = curve; n.oversample = over || 'none'; nodes.push(n); return n; },
      panner: function (v) { const n = ctx.createStereoPanner(); if (v != null) n.pan.value = v; nodes.push(n); return n; },
      comp: function () { const n = ctx.createDynamicsCompressor(); nodes.push(n); return n; },
      convolver: function () { const n = ctx.createConvolver(); nodes.push(n); return n; },
      splitter: function (c) { const n = ctx.createChannelSplitter(c || 2); nodes.push(n); return n; },
      merger: function (c) { const n = ctx.createChannelMerger(c || 2); nodes.push(n); return n; },
      // hz = cycles per SCENE second. spec.key names the param that drives the rate, so arm() can read the
      // instance's real value rather than this build-time default; spec.mul scales it (chorus' three
      // detuned lines); spec.phase offsets this LFO within the cycle; spec.secs sets the cycle length —
      // the default 1 s makes playbackRate the rate in Hz, so `rate` still schedules onto a real AudioParam.
      lfo: function (hz, spec) {
        spec = spec || {};
        const secs = spec.secs || 1;
        const n = ctx.createBufferSource();
        n.buffer = lfoBuffer(ctx, spec.wave || 'sine', secs);
        n.loop = true;
        n.playbackRate.value = hz * secs;
        nodes.push(n); oscs.push(n);
        lfos.push({ n: n, hz: hz, key: spec.key || null, mul: spec.mul || 1, phase: spec.phase || 0 });
        return n;
      },
    };
  }

  /* One built effect. `params` = keys that ARE a single AudioParam taking the UI value as-is. `xf` =
   * that param needs the value converted first (dB → linear). `custom` = keys that drive several params
   * at once or rebuild a node, handled by hand. */
  function unit(o) {
    const aps = o.params || {}, xf = o.xf || {}, custom = o.custom || {};
    return {
      input: o.input, output: o.output,
      /* THE WHOLE-WINDOW HOOK, and why one effect needs it (Reverb; the per-effect-slider entry).
       * Every other animated param is driven one value at a time through set/ramp, which is all an
       * AudioParam needs. A ConvolverNode is different in a way that no per-value API can paper over:
       * its room is an AudioBuffer, and **an OfflineAudioContext gives you no moment during the render
       * at which to swap one**. The graph that renders is the graph that existed before rendering
       * started. So an effect whose animation changes its BUFFER has to see the entire window up front,
       * build every room it will need, and cross-fade between them with gains — and this is the hook
       * that hands it the window. Null for all thirty-odd other effects. */
      window: o.window || null,
      // Non-null ONLY when set(key, v) is exactly param(key).setValueAtTime(v) — a caller that schedules
      // onto a returned param must not be able to desync a pair (mix) or skip a conversion (gain's dB).
      param: function (key) { return (aps[key] && !xf[key]) ? aps[key] : null; },
      set: function (key, v, when) {
        const ap = aps[key];
        if (ap) { ap.setValueAtTime(xf[key] ? xf[key](v) : v, when); return; }
        if (custom[key]) custom[key](v, when, false);
      },
      ramp: function (key, v, when) {
        const ap = aps[key];
        if (ap) { ap.linearRampToValueAtTime(xf[key] ? xf[key](v) : v, when); return; }
        if (custom[key]) custom[key](v, when, true);
      },
      // Start every LFO at the phase that scene time implies: phase = frac(rate × scene), so scene 0 is
      // phase 0 in every context and the export renders the sweep the preview played. A KEYFRAMED rate
      // makes that ill-defined (phase would be the integral of rate, not rate × t) — anchor on the rate
      // at sceneAtStart and let it drift from there; that is the price of a keyframed rate.
      arm: function (sceneAtStart, rateFor) {
        const list = o.lfos || [];
        for (let i = 0; i < list.length; i++) {
          const l = list[i];
          const hz = l.key ? rateFor(l.key) * l.mul : l.hz;
          const cyc = (isFinite(hz) ? hz : 0) * sceneAtStart + l.phase;
          const ph = isFinite(cyc) ? cyc - Math.floor(cyc) : 0;
          try { l.n.start(l.n.context.currentTime, ph * l.n.buffer.duration); } catch (e) {}
        }
      },
      dispose: function () {
        (o.oscs || []).forEach(n => { try { n.stop(); } catch (e) {} });
        (o.nodes || []).forEach(n => { try { n.disconnect(); } catch (e) {} });
      },
    };
  }

  // One UI key → several AudioParams (ping-pong's two delay lines, chorus' three LFOs, a wet/dry pair).
  // Every target is a real AudioParam, so the key still schedules smoothly; it just can't be handed out
  // through param(). Each entry is [param, factor] where factor is a number, a fn(v), or null (= v).
  function multi(list) {
    return function (v, when, ramp) {
      for (let i = 0; i < list.length; i++) {
        const ap = list[i][0], f = list[i][1];
        const x = typeof f === 'function' ? f(v) : v * (f == null ? 1 : f);
        if (ramp) ap.linearRampToValueAtTime(x, when); else ap.setValueAtTime(x, when);
      }
    };
  }

  /* ═══ THE BYPASS PAIR (#482 polish 3 — the idle backlog's §0.3 rule for every new audio control) ═══════════
   * Audio has no `legacy`: storage.js's sanitiser fills a key a saved project lacks with its `def`, so a new
   * control's default has to BE today's sound, sample for sample — not close, identical. And a node may not be
   * put in only once a value leaves its default, because that is a structural change and the live preview
   * would have to rebuild the chain in the middle of a drag.
   * So the node is ALWAYS built, and it is wired  from → [node … → gOn] + [gOff] → out.  At the default
   * gOn is 0 and gOff is 1, and x·1 + y·0 = x is exact in IEEE floats in every engine — so the default renders
   * the very samples it did before the control existed, on any browser, whatever the node does to its copy.
   * Leaving the default flips the pair (one setValueAtTime each; a keyframe ramps it, a 33 ms crossfade), and
   * the value itself rides the node's own AudioParam, so a slider drag never rebuilds anything.
   * `nodeIn`/`nodeOut` may be one node (a filter) or the two ends of a little graph (Width's mid/side). */
  function bypassPair(s, from, nodeIn, nodeOut, on) {
    const gOn = s.gain(on ? 1 : 0), gOff = s.gain(on ? 0 : 1), sum = s.gain(1);
    from.connect(nodeIn); nodeOut.connect(gOn); gOn.connect(sum);
    from.connect(gOff); gOff.connect(sum);
    return { out: sum, gOn: gOn, gOff: gOff };
  }
  // The pair's two gains as `multi` targets, switched by one test of the control's value.
  function pairTargets(pair, isOn) {
    return [[pair.gOn.gain, v => (isOn(v) ? 1 : 0)], [pair.gOff.gain, v => (isOn(v) ? 0 : 1)]];
  }
  /* A lowpass/highpass with no peak: Q −3.01 dB is Butterworth (the spec reads a lowpass/highpass Q as dB of
     resonance), so the response never rises above 1 anywhere. That matters inside an echo's feedback loop: a
     filter with a +1.25 dB bump (the node's own default Q of 1) at Feedback 0.9 is a loop gain of 1.04 at the
     bump, and the repeats would grow into a howl instead of dying away. */
  const BUTTERWORTH_DB = 20 * Math.log10(Math.SQRT1_2);

  /* A FEEDBACK LOOP, UNROLLED (queue 986, hunts C16/C17). A loop's k-th time round is weighted fb^(k−1); these
     are the factors `multi` schedules onto the taps, and how many trips round each effect keeps (see Flanger and
     Phaser for what the rest of the tail is worth). */
  const FLANGE_TAPS = 16, PHASE_PASSES = 6;
  function powOf(k) { return function (v) { return Math.pow(v, k); }; }

  // A param's value at scene time t, guarded at every step: a missing/NaN/animated-object read falls back
  // to the default. NaN reaching an AudioParam throws and takes the whole chain down with it.
  function valueAt(inst, p, t) {
    const raw = inst && inst.params ? inst.params[p.key] : undefined;
    let v = FM.isAnimated(raw) ? FM.evalProp(raw, t) : raw;
    if (typeof v !== 'number' || !isFinite(v)) v = p.def;
    return clamp(v, p.min, p.max);
  }
  // Build-time read for a rebuild-style (keyframable:false) param — static is the whole story there.
  function initNum(inst, key, dflt, lo, hi) {
    let v = inst && inst.params ? inst.params[key] : undefined;
    if (FM.isAnimated(v)) v = FM.evalProp(v, 0);
    if (typeof v !== 'number' || !isFinite(v)) v = dflt;
    return clamp(v, lo, hi);
  }

  // dry(1−mix) + wet(mix) summed into the output. Both are real AudioParams so `mix` schedules like any
  // other param — set/ramp just have to touch the pair.
  function wetDry(s, inst, key, dflt) {
    const v = initNum(inst, key, dflt, 0, 1);
    const dry = s.gain(1 - v), wet = s.gain(v);
    return { dry: dry, wet: wet, set: multi([[wet.gain, null], [dry.gain, x => 1 - x]]) };
  }

  /* ---- A CURVE THAT CAN BE ANIMATED (the unnumbered per-effect-slider entry) ----------------------
   * Ezra: *"each effect slider having its own key frames still doesn't exist fully"*, and later, on the
   * six audio sliders that were left out: *"I just want options... put a warning next to it"*.
   * WHY THEY WERE LEFT OUT, AND WHY THE FLAG ALONE WOULD HAVE BEEN A LIE. Distortion, Bit Crush and
   * Lo-Fi do not drive an AudioParam — they REBUILD A TRANSFER CURVE. The scheduler calls
   * `u.set(key, value, when)` sixty times a second across the render; an AudioParam honours `when` and
   * lands in the future, but a custom setter that rebuilds a curve applies instantly, so all sixty
   * values would be applied during schedule() and the LAST one would win. Measured before this existed:
   * a drive animated 0 -> 100 rendered byte-identical to a static drive of 0 (head RMS 0.3504, tail
   * 0.3536, against 0.9737/0.9816 for a static 100). Keyframe diamonds that do nothing.
   * WHAT THIS DOES. You cannot ramp a curve — swapping one is a step change, which is exactly why these
   * effects click when swept (measured at 6.8x, 2.8x and 1.7x worse than static). But you CAN ramp a
   * GAIN. So: build K shapers spanning the range once, feed the input to all of them, and crossfade
   * between the two nearest with real AudioParams. Schedulable in both the live and offline contexts,
   * and the crossfade is what removes the click rather than merely warning about it.
   * THE STATIC PATH IS UNTOUCHED. The bank is built lazily, on the first SCHEDULED call, and a project
   * whose drive is a plain number never creates a single extra node — so nothing already made changes. */
  function curveBank(s, input, dest, makeCurve, lo, hi, steps, over) {
    const N = Math.max(3, steps || 12);
    let built = null, muted = false;
    function ensure() {
      if (built) return built;
      // Counted so the suite can prove a STATIC param never builds one. The picture — or here the
      // sound — cannot police that on its own: a bank that merely reproduces the static value renders
      // identically while costing N shapers. See the same lesson in the motion-blur work (queue 382).
      FM._curveBanksBuilt = (FM._curveBanksBuilt || 0) + 1;
      built = [];
      for (let i = 0; i < N; i++) {
        const v = lo + (hi - lo) * (i / (N - 1));
        const n = s.shaper(makeCurve(v), over || '4x');
        const g = s.gain(0);
        input.connect(n); n.connect(g); g.connect(dest);
        built.push({ v: v, g: g.gain });
      }
      return built;
    }
    return {
      at: function (v, when, ramp, staticGain) {
        const b = ensure();
        // Hand over from the single static shaper the first time, or its output would sum with the
        // bank's and the effect would be applied twice.
        if (!muted) { muted = true; try { staticGain.setValueAtTime(0, Math.max(0, when)); } catch (e) {} }
        const span = (hi - lo) / (N - 1);
        let idx = Math.floor((v - lo) / span);
        if (idx < 0) idx = 0; if (idx > N - 2) idx = N - 2;
        const w = Math.max(0, Math.min(1, (v - b[idx].v) / span));
        for (let i = 0; i < N; i++) {
          const target = i === idx ? 1 - w : (i === idx + 1 ? w : 0);
          try { ramp ? b[i].g.linearRampToValueAtTime(target, when) : b[i].g.setValueAtTime(target, when); } catch (e) {}
        }
      },
    };
  }

  function P(key, label, min, max, step, def, unit, kf) {
    return { key: key, label: label, min: min, max: max, step: step, def: def, unit: unit || '', keyframable: !!kf };
  }
  const MIX = def => P('mix', 'Mix', 0, 1, 0.01, def, '', true);

  const DEFS = [];

  /* ---- EQ & Filter ---- */
  // The four plain filters differ only in biquad type and ranges.
  function filterDef(type, label, biq, fMin, fMax, fDef, qMin, qMax, qDef) {
    return {
      type: type, label: label, category: 'eq',
      params: [P('freq', 'Frequency', fMin, fMax, 1, fDef, 'Hz', true), P('q', 'Resonance', qMin, qMax, 0.1, qDef, '', true)],
      build: function (ctx) {
        const s = shop(ctx);
        const n = s.biquad(biq, fDef, qDef);
        return unit({ input: n, output: n, nodes: s.nodes, oscs: s.oscs, params: { freq: n.frequency, q: n.Q } });
      },
    };
  }

  DEFS.push({
    type: 'bassTreble', label: 'Bass & Treble', category: 'eq',
    params: [P('bass', 'Bass', -24, 24, 0.5, 0, 'dB', true), P('treble', 'Treble', -24, 24, 0.5, 0, 'dB', true)],
    build: function (ctx) {
      const s = shop(ctx);
      const lo = s.biquad('lowshelf', 200, null, 0);
      const hi = s.biquad('highshelf', 3000, null, 0);
      lo.connect(hi);
      return unit({ input: lo, output: hi, nodes: s.nodes, oscs: s.oscs, params: { bass: lo.gain, treble: hi.gain } });
    },
  }, {
    type: 'eq3', label: '3-Band EQ', category: 'eq',
    params: [
      P('low', 'Low', -24, 24, 0.5, 0, 'dB', true),
      P('mid', 'Mid', -24, 24, 0.5, 0, 'dB', true),
      P('high', 'High', -24, 24, 0.5, 0, 'dB', true),
      P('midFreq', 'Mid Freq', 200, 6000, 10, 1000, 'Hz', true),
    ],
    build: function (ctx) {
      const s = shop(ctx);
      const lo = s.biquad('lowshelf', 250, null, 0);
      const mid = s.biquad('peaking', 1000, 1, 0);
      const hi = s.biquad('highshelf', 4000, null, 0);
      lo.connect(mid).connect(hi);
      return unit({ input: lo, output: hi, nodes: s.nodes, oscs: s.oscs, params: { low: lo.gain, mid: mid.gain, high: hi.gain, midFreq: mid.frequency } });
    },
  },
    filterDef('lowpass', 'Low-Pass', 'lowpass', 40, 20000, 8000, 0.1, 20, 1),
    filterDef('highpass', 'High-Pass', 'highpass', 20, 12000, 200, 0.1, 20, 1),
    filterDef('bandpass', 'Band-Pass', 'bandpass', 60, 12000, 1200, 0.1, 20, 2),
    filterDef('notch', 'Notch', 'notch', 40, 12000, 1000, 0.1, 30, 8),
  {
    type: 'telephone', label: 'Telephone', category: 'eq',
    params: [MIX(1)],
    build: function (ctx, inst) {
      const s = shop(ctx);
      const input = s.gain(1), out = s.gain(1);
      const hp = s.biquad('highpass', 300, 1);
      const lp = s.biquad('lowpass', 3400, 1);
      const bite = s.shaper(BITE, '2x');
      const wd = wetDry(s, inst, 'mix', 1);
      input.connect(wd.dry).connect(out);
      input.connect(hp); hp.connect(lp); lp.connect(bite); bite.connect(wd.wet); wd.wet.connect(out);
      return unit({ input: input, output: out, nodes: s.nodes, oscs: s.oscs, custom: { mix: wd.set } });
    },
  });

  /* ---- Space & Stereo ---- */
  DEFS.push({
    type: 'reverb', label: 'Reverb', category: 'space',
    params: [
      P('size', 'Size', 0, 1, 0.01, 0.5, '', true), P('decay', 'Decay', 0.1, 8, 0.1, 2, 's', true),
      /* #482 polish 3.4, his #966 steer. The room could only be bigger or longer. Pre-delay holds the reverb back
         after the sound (a big hall answers late, and a voice stays clear in front of its own room); Tone takes
         the top off the reverb alone, Low cut its boom, and Width folds it from full stereo towards the middle.
         All four work on the WET path only — the dry sound is never touched — and each sits in a bypass pair at
         a default that is today's reverb, sample for sample. The animated-room bank (below) is fed from the
         same pre-delay and drains into the same Tone / Low cut / Width, so a moving room is shaped the same. */
      P('predelay', 'Pre-delay', 0, 0.25, 0.001, 0, 's', true),
      P('highcut', 'Tone', 1000, 20000, 10, 20000, 'Hz', true),
      P('lowcut', 'Low cut', 20, 1000, 1, 20, 'Hz', true),
      P('width', 'Width', 0, 1, 0.01, 1, '', true),
      MIX(0.3),
    ],
    /* THE WARNING EZRA ASKED FOR LIVES ON THESE TWO, and only on these two. His answer on the six audio
       sliders that could not be keyframed: *"if audio key frames break the project and lag too much just
       put a warning next to it before use"*. The other four turned out not to need one — Distortion, Bit
       Crush and Lo-Fi cross-fade a bank of cheap shapers, and Pitch Shift drives ordinary audio params.
       These two are the expensive pair he was actually being warned about. Measured, rendering four
       seconds of audio: one room costs 25 ms, six cost about 140 ms, and six LONG rooms about 460 ms. */
    warn: { size: AFX_REVERB_KF_WARN, decay: AFX_REVERB_KF_WARN },
    build: function (ctx, inst) {
      const s = shop(ctx);
      const input = s.gain(1), out = s.gain(1);
      const conv = s.convolver();   // normalize stays on: size/decay then change the room, not the level
      /* A gain of exactly 1 in front of the wet sum, so the STATIC room can be handed over to the bank
         without disconnecting it mid-render. Multiplying by 1.0 is exact in floating point, so a project
         that never animates these renders the same samples it did before this existed. */
      const convG = s.gain(1);
      const wd = wetDry(s, inst, 'mix', 0.3);
      input.connect(wd.dry).connect(out);
      /* THE WET CHAIN (#482 polish 3.4): input → Pre-delay → every room → wetBus → Tone → Low cut → Width → wet.
         Each stage is a bypass pair (bypassPair above), so at its default it passes the room through ×1 exactly. */
      const pd0 = initNum(inst, 'predelay', 0, 0, 0.25), hc0 = initNum(inst, 'highcut', 20000, 1000, 20000);
      const lc0 = initNum(inst, 'lowcut', 20, 20, 1000), w0 = initNum(inst, 'width', 1, 0, 1);
      const pd = s.delay(0.3); pd.delayTime.value = pd0;
      const pre = bypassPair(s, input, pd, pd, pd0 > 0);
      const wetBus = s.gain(1);             // where the static room and every banked room meet
      const lp = s.biquad('lowpass', hc0, BUTTERWORTH_DB);
      const hc = bypassPair(s, wetBus, lp, lp, hc0 < 20000);
      const hp = s.biquad('highpass', lc0, BUTTERWORTH_DB);
      const lc = bypassPair(s, hc.out, hp, hp, lc0 > 20);
      /* Width is mid/side on the wet: L = M + w·S, R = M − w·S. The M/S sum is NOT exact at w = 1 in floats
         ((L+R)/2 + (L−R)/2 can land an ulp off L), which is exactly why it too is switched in by a pair. The
         splitter is discrete, so the wet is up-mixed to two channels first, as the Stereo Width effect does. */
      const msIn = s.gain(1);
      msIn.channelCount = 2; msIn.channelCountMode = 'explicit'; msIn.channelInterpretation = 'speakers';
      const split = s.splitter(2), merge = s.merger(2);
      const mid = s.gain(0.5);
      split.connect(mid, 0); split.connect(mid, 1);
      const sP = s.gain(0.5), sN = s.gain(-0.5), side = s.gain(1);
      split.connect(sP, 0); split.connect(sN, 1); sP.connect(side); sN.connect(side);
      const wG = s.gain(w0), wN = s.gain(-1);
      side.connect(wG); wG.connect(wN);
      mid.connect(merge, 0, 0); wG.connect(merge, 0, 0);
      mid.connect(merge, 0, 1); wN.connect(merge, 0, 1);
      msIn.connect(split);
      const wp = bypassPair(s, lc.out, msIn, merge, w0 < 1);
      pre.out.connect(conv); conv.connect(convG); convG.connect(wetBus);
      wp.out.connect(wd.wet); wd.wet.connect(out);
      let size = initNum(inst, 'size', 0.5, 0, 1), decay = initNum(inst, 'decay', 2, 0.1, 8);
      conv.buffer = impulse(ctx, size, decay);

      const pdef = (key) => ((REG['reverb'] || {}).params || []).filter(p => p.key === key)[0];
      const isAnim = () => !!(inst && inst.params && (FM.isAnimated(inst.params.size) || FM.isAnimated(inst.params.decay)));

      /* ---- ANIMATED SIZE / DECAY: A BANK OF ROOMS, CROSS-FADED (the per-effect-slider entry) --------
       * This is the last two of the six, and the entry is emphatic that neither the shaper bank nor the
       * Pitch Shift fix may be copied here. Both warnings are correct, for the same underlying reason:
       * this effect's "parameter" is an AudioBuffer full of a room, not a number on a node.
       * WHY A BANK IS THE ONLY SHAPE THAT WORKS. Assigning `conv.buffer` is instant and ignores `when`,
       * so scheduling it would apply every value at once and the last would win — the same lie the flag
       * alone would have told for Distortion. And it cannot be fixed by swapping the buffer at the right
       * moment either, because **an offline render has no such moment**: whatever graph exists when
       * startRendering() is called is the graph that renders. Every room must therefore exist up front.
       * SAMPLED ALONG THE ANIMATION, NOT ACROSS THE RANGE. Size and decay are two knobs but ONE room, so
       * a bank across each range separately would need a K × K grid. Sampling the animation's own path
       * through time collapses that back to K: the rooms we need are the ones the automation actually
       * visits. Identical neighbours collapse further, so a decay that creeps from 2.0 to 2.1 builds one.
       * K IS A BUDGET, NOT A CONSTANT. A room costs in proportion to its length, so a long tail buys
       * fewer rooms: roughly sixteen convolver-seconds total, between two and six rooms.
       * EQUAL POWER, NOT LINEAR. Two reverb tails are uncorrelated noise, so cross-fading them with
       * straight gains dips 3 dB in the middle of every hand-over — an audible pumping right where the
       * sweep is supposed to be smooth. The curves are sqrt-weighted triangles, written with
       * setValueCurveAtTime so each gain carries one continuous curve for the whole window. */
      let banked = false, windowed = false;
      const buildBank = function (fromScene, toScene) {
        // Only schedule() calls this, so it doubles as "we are rendering a known window" — which the
        // setters below need in order to tell an OFFLINE render from live preview.
        windowed = true;
        if (banked || !isAnim()) return;
        const span = Math.max(0, (toScene || 0) - fromScene);
        if (span <= 0) return;
        const sP = pdef('size'), dP = pdef('decay');
        if (!sP || !dP) return;
        /* SAMPLE THE ANIMATION'S OWN SPAN, NOT THE EXPORT WINDOW. The window handed in is the whole
           export range, which can be minutes long while the reverb move lasts two seconds. Sampling K
           points across THAT would step 36 s at a time through a three-minute export and walk straight
           past the change — the rooms would be right and the moment would be wrong. The keyframes say
           where the movement is, so they choose where to look. Outside that span the value is constant
           by definition, and the end rooms hold. */
        let lo = Infinity, hi = -Infinity;
        ['size', 'decay'].forEach(function (k) {
          const raw = inst && inst.params ? inst.params[k] : null;
          if (!FM.isAnimated(raw)) return;
          raw.kf.forEach(function (f) { if (f && typeof f.t === 'number') { lo = Math.min(lo, f.t); hi = Math.max(hi, f.t); } });
        });
        const a = Math.max(lo, fromScene), b = Math.min(hi, toScene);
        // The movement misses this export entirely — every value inside the window is constant, so the
        // ordinary one-room path is not merely adequate, it is correct. Leave `banked` false for it.
        if (!(b > a)) return;
        // Longest room the automation asks for sets the budget, so cost is bounded rather than K fixed.
        let maxDecay = 0.1;
        for (let k = 0; k <= 24; k++) maxDecay = Math.max(maxDecay, valueAt(inst, dP, a + (b - a) * (k / 24)));
        const K = Math.max(2, Math.min(6, Math.round(16 / maxDecay)));
        // The rooms the automation actually visits, in order, with identical neighbours collapsed — so a
        // decay that creeps from 2.0 to 2.1 builds ONE room and costs what it did before.
        const rooms = [];
        for (let i = 0; i < K; i++) {
          const t = a + (b - a) * (i / (K - 1));
          const sz = valueAt(inst, sP, t), dc = valueAt(inst, dP, t);
          const key = sz.toFixed(2) + '|' + dc.toFixed(2);
          const prev = rooms[rooms.length - 1];
          if (prev && prev.key === key) { prev.t1 = t; continue; }
          rooms.push({ key: key, sz: sz, dc: dc, t0: t, t1: t });
        }
        if (rooms.length < 2) return;   // the animation never leaves one room — the static path is right
        banked = true;                  // …set ONLY once a bank really exists, or the setters below
                                        // would be switched off with nothing to replace them.
        // Counted so the suite can prove a STATIC reverb builds nothing. Sound cannot police this: a
        // bank that merely reproduces the static room renders identically while costing N convolvers.
        FM._irBanksBuilt = (FM._irBanksBuilt || 0) + 1;
        FM._irBankRooms = (FM._irBankRooms || 0) + rooms.length;
        // Hand the static room over at time 0 — without this its output sums with the bank's and the
        // reverb is applied twice.
        try { convG.gain.setValueAtTime(0, 0); } catch (e) {}
        // Centres in window-normalised time. Enough curve points for ~50 ms resolution, so a quick move
        // inside a long export is not smeared by the crossfade's own sampling.
        const cs = rooms.map(r => ((r.t0 + r.t1) / 2 - fromScene) / span);
        const N = Math.max(128, Math.min(4096, Math.round(span * 20)));
        for (let i = 0; i < rooms.length; i++) {
          const r = rooms[i];
          const c = s.convolver();
          c.buffer = impulse(ctx, r.sz, r.dc);
          const g = s.gain(0);
          // From the pre-delay and into the wet bus, like the static room (#482 polish 3.4): a moving room is
          // held back, filtered and narrowed exactly as a still one is.
          pre.out.connect(c); c.connect(g); g.connect(wetBus);
          const curve = new Float32Array(N);
          for (let n = 0; n < N; n++) {
            const x = n / (N - 1);
            let w;
            if (x <= cs[i]) w = (i === 0) ? 1 : Math.max(0, (x - cs[i - 1]) / Math.max(1e-6, cs[i] - cs[i - 1]));
            else w = (i === rooms.length - 1) ? 1 : Math.max(0, (cs[i + 1] - x) / Math.max(1e-6, cs[i + 1] - cs[i]));
            curve[n] = Math.sqrt(w);   // triangle basis sums to 1, so SQRT of it sums to 1 in POWER
          }
          try { g.gain.setValueCurveAtTime(curve, 0, Math.max(0.001, span)); } catch (e) {}
        }
      };

      /* LIVE PREVIEW is the per-frame path and gets no window, so it keeps rebuilding the one room — but
         QUANTISED while animating. Un-quantised it would rebuild on every frame at up to 12.5 ms each,
         which is the lag his answer was about; rounded to a twentieth of the size range and a quarter of
         a second of decay, a sweep rebuilds a handful of times and the IR cache catches the repeats.
         The static path is deliberately NOT quantised — dragging the slider by hand must still land on
         the exact value the number beside it shows.
         AN OFFLINE RENDER USES A MUCH FINER GRID, and that distinction is not a nicety — it was a bug,
         caught by rendering a reverb whose keyframes sit outside the exported range. There the bank
         correctly declines to build (nothing moves inside the window), the ordinary path takes over, and
         the LIVE quantum rounded a 0.4 s decay to 0.5 s: an export quietly different from the project.
         Two hundredths matches the grid the bank keys its rooms on, so repeated values still collapse to
         one rebuild instead of a hundred and twenty. */
      const q = (v, step) => Math.round(v / step) * step;
      const qSize = () => (windowed ? 0.01 : 0.05), qDecay = () => (windowed ? 0.01 : 0.25);
      return unit({
        input: input, output: out, nodes: s.nodes, oscs: s.oscs,
        window: buildBank,
        custom: {
          size: function (v) {
            v = clamp(v, 0, 1);
            if (banked) return;                      // the bank owns the wet path now
            if (isAnim()) v = q(v, qSize());
            if (v !== size) { size = v; conv.buffer = impulse(ctx, size, decay); }
          },
          decay: function (v) {
            v = clamp(v, 0.1, 8);
            if (banked) return;
            if (isAnim()) v = q(v, qDecay());
            if (v !== decay) { decay = v; conv.buffer = impulse(ctx, size, decay); }
          },
          predelay: multi([[pd.delayTime, null]].concat(pairTargets(pre, v => v > 0))),
          highcut: multi([[lp.frequency, null]].concat(pairTargets(hc, v => v < 20000))),
          lowcut: multi([[hp.frequency, null]].concat(pairTargets(lc, v => v > 20))),
          width: multi([[wG.gain, null]].concat(pairTargets(wp, v => v < 1))),
          mix: wd.set,
        },
      });
    },
  }, {
    type: 'delay', label: 'Echo / Delay', category: 'space',
    params: [
      P('time', 'Time', 0.01, 2, 0.01, 0.35, 's', true), P('feedback', 'Feedback', 0, 0.9, 0.01, 0.35, '', true),
      /* #482 polish 3.3, his #966 steer (*"this is the complex version we want as much choice as possible"*). Every
         repeat used to be a perfect copy of the one before, so a long Feedback piled up into a bright metallic smear.
         Tone and Low cut sit INSIDE the loop, so each trip round loses a little more top (or bottom) — the way a
         tape or bucket-brigade echo darkens as it fades — and they sit before the wet tap as well, so the first
         repeat already changes and a drag is heard even at Feedback 0. Tape wobble swings the delay time by up to
         ±2 ms at 0.7 Hz: the pitch of each repeat drifts, like a worn tape echo. Its LFO is pinned to SCENE time like
         every other LFO here, so the export wobbles where the preview did. All three default to off, in a bypass
         pair, so a saved echo renders exactly as it did. */
      P('tone', 'Tone', 500, 20000, 10, 20000, 'Hz', true),
      P('lowcut', 'Low cut', 20, 1000, 1, 20, 'Hz', true),
      P('wobble', 'Tape wobble', 0, 1, 0.01, 0, '', true),
      MIX(0.35),
    ],
    build: function (ctx, inst) {
      const s = shop(ctx);
      const input = s.gain(1), out = s.gain(1);
      const d = s.delay(2.2); d.delayTime.value = 0.35;
      /* TAPE WOBBLE RIDES A TWIN OF THE LINE, never the line itself. Driving the one delay's time from an LFO
         at depth 0 does render the same samples in the suite's Chrome (measured), but only because that engine's
         swept and steady delay paths happen to round alike — nothing promises the iPhone's does. A second line
         fed the same signal, switched in by the bypass pair, keeps the default exact by arithmetic instead. */
      const dw = s.delay(2.2); dw.delayTime.value = 0.35;
      const fb = s.gain(0.35);
      const wd = wetDry(s, inst, 'mix', 0.35);
      input.connect(wd.dry).connect(out);
      input.connect(d); input.connect(dw);
      const wob0 = initNum(inst, 'wobble', 0, 0, 1), tone0 = initNum(inst, 'tone', 20000, 500, 20000), low0 = initNum(inst, 'lowcut', 20, 20, 1000);
      const wOn = s.gain(wob0 > 0 ? 1 : 0), wOff = s.gain(wob0 > 0 ? 0 : 1), line = s.gain(1);
      d.connect(wOff); wOff.connect(line); dw.connect(wOn); wOn.connect(line);
      const lfo = s.lfo(0.7);
      const wAmp = s.gain(wob0 * 0.002);   // ±2 ms at Tape wobble 1
      lfo.connect(wAmp); wAmp.connect(dw.delayTime);
      const lp = s.biquad('lowpass', tone0, BUTTERWORTH_DB);
      const tone = bypassPair(s, line, lp, lp, tone0 < 20000);
      const hp = s.biquad('highpass', low0, BUTTERWORTH_DB);
      const low = bypassPair(s, tone.out, hp, hp, low0 > 20);
      const tap = low.out;                  // every repeat, darkened and thinned: it goes round again and out
      tap.connect(fb); fb.connect(d); fb.connect(dw);
      tap.connect(wd.wet); wd.wet.connect(out);
      return unit({
        input: input, output: out, nodes: s.nodes, oscs: s.oscs, lfos: s.lfos, params: { feedback: fb.gain },
        custom: {
          time: multi([[d.delayTime, null], [dw.delayTime, null]]),
          tone: multi([[lp.frequency, null]].concat(pairTargets(tone, v => v < 20000))),
          lowcut: multi([[hp.frequency, null]].concat(pairTargets(low, v => v > 20))),
          wobble: multi([[wAmp.gain, 0.002], [wOn.gain, v => (v > 0 ? 1 : 0)], [wOff.gain, v => (v > 0 ? 0 : 1)]]),
          mix: wd.set,
        },
      });
    },
  }, {
    type: 'pingpong', label: 'Ping-Pong Delay', category: 'space',
    params: [P('time', 'Time', 0.01, 1.5, 0.01, 0.3, 's', true), P('feedback', 'Feedback', 0, 0.85, 0.01, 0.4, '', true), MIX(0.35)],
    build: function (ctx, inst) {
      const s = shop(ctx);
      const input = s.gain(1), out = s.gain(1);
      const wd = wetDry(s, inst, 'mix', 0.35);
      input.connect(wd.dry).connect(out);
      const dL = s.delay(1.7), dR = s.delay(1.7);
      dL.delayTime.value = 0.3; dR.delayTime.value = 0.3;
      const xL = s.gain(0.4), xR = s.gain(0.4);   // each cross-feed is one tap, so a round trip = feedback²
      const merge = s.merger(2);
      input.connect(dL);
      dL.connect(xR).connect(dR);
      dR.connect(xL).connect(dL);
      dL.connect(merge, 0, 0);
      dR.connect(merge, 0, 1);
      merge.connect(wd.wet); wd.wet.connect(out);
      return unit({
        input: input, output: out, nodes: s.nodes, oscs: s.oscs,
        custom: { time: multi([[dL.delayTime, null], [dR.delayTime, null]]), feedback: multi([[xL.gain, null], [xR.gain, null]]), mix: wd.set },
      });
    },
  }, {
    type: 'width', label: 'Stereo Width', category: 'space',
    params: [P('width', 'Width', 0, 2, 0.01, 1.5, '', true)],
    build: function (ctx) {
      const s = shop(ctx);
      const input = s.gain(1), out = s.gain(1);
      // A ChannelSplitter is "explicit"/"discrete" by spec and immutably so: a MONO input reaches it as
      // [L, 0], and output 1 is SILENCE, not a copy of L. S would then be 0.5L, inverting the right
      // channel at the default width and killing it outright at width 1. Up-mix to L=R here instead —
      // "speakers" duplicates mono into both channels, which is exactly what the M/S maths below assumes.
      input.channelCount = 2; input.channelCountMode = 'explicit'; input.channelInterpretation = 'speakers';
      const split = s.splitter(2), merge = s.merger(2);
      const mid = s.gain(0.5);
      split.connect(mid, 0); split.connect(mid, 1);                 // M = (L+R)/2
      const sP = s.gain(0.5), sN = s.gain(-0.5), side = s.gain(1);
      split.connect(sP, 0); split.connect(sN, 1);
      sP.connect(side); sN.connect(side);                           // S = (L−R)/2
      const w = s.gain(1.5), wN = s.gain(-1);
      side.connect(w); w.connect(wN);
      mid.connect(merge, 0, 0); w.connect(merge, 0, 0);             // L = M + S×width
      mid.connect(merge, 0, 1); wN.connect(merge, 0, 1);            // R = M − S×width
      input.connect(split); merge.connect(out);
      return unit({ input: input, output: out, nodes: s.nodes, oscs: s.oscs, params: { width: w.gain } });
    },
  }, {
    type: 'pan', label: 'Pan', category: 'space',
    params: [P('pan', 'Pan', -1, 1, 0.05, 0, '', true)],
    build: function (ctx) {
      const s = shop(ctx);
      const p = s.panner(0);
      return unit({ input: p, output: p, nodes: s.nodes, oscs: s.oscs, params: { pan: p.pan } });
    },
  }, {
    type: 'autopan', label: 'Auto-Pan (8D)', category: 'space',
    params: [P('rate', 'Rate', 0.05, 8, 0.01, 0.4, 'Hz', true), P('depth', 'Depth', 0, 1, 0.01, 1, '', true)],
    build: function (ctx) {
      const s = shop(ctx);
      const p = s.panner(0);   // base stays centred; the LFO swings ±depth around it
      const lfo = s.lfo(0.4, { key: 'rate' });
      const amp = s.gain(1);
      lfo.connect(amp); amp.connect(p.pan);
      return unit({ input: p, output: p, nodes: s.nodes, oscs: s.oscs, lfos: s.lfos, params: { rate: lfo.playbackRate, depth: amp.gain } });
    },
  });

  /* ---- Dynamics ---- */
  DEFS.push({
    type: 'gain', label: 'Gain / Boost', category: 'dyn',
    params: [P('gain', 'Gain', -24, 24, 0.5, 0, 'dB', true)],
    build: function (ctx) {
      const s = shop(ctx);
      const g = s.gain(1);   // the user edits dB; the AudioParam is linear, so xf converts before scheduling
      return unit({ input: g, output: g, nodes: s.nodes, oscs: s.oscs, params: { gain: g.gain }, xf: { gain: dbToLin } });
    },
  }, {
    type: 'compressor', label: 'Compressor', category: 'dyn',
    params: [
      P('threshold', 'Threshold', -60, 0, 0.5, -24, 'dB', true),
      P('ratio', 'Ratio', 1, 20, 0.1, 4, ':1', true),
      P('attack', 'Attack', 0, 0.5, 0.001, 0.01, 's', true),
      P('release', 'Release', 0.01, 1, 0.01, 0.25, 's', true),
      /* THE KNEE WAS NEVER SET (queue 986, hunt C14), so every Compressor ran on the node's own 30 dB
         soft knee with no way to see or change it — at the default −24 threshold that knee spans −24 to
         +6 dBFS, so "4:1" never fully applied to anything a clip can hold. Now it is a control. Its def
         IS the node's default, so every saved Compressor (which the sanitiser fills with def) sounds
         exactly as it always has. */
      P('knee', 'Knee', 0, 40, 0.5, 30, 'dB', true),
    ],
    build: function (ctx) {
      const s = shop(ctx);
      const c = s.comp();
      return unit({ input: c, output: c, nodes: s.nodes, oscs: s.oscs, params: { threshold: c.threshold, ratio: c.ratio, attack: c.attack, release: c.release, knee: c.knee } });
    },
  }, {
    type: 'limiter', label: 'Limiter', category: 'dyn',
    params: [P('ceiling', 'Ceiling', -24, 0, 0.5, -1, 'dB', true)],
    build: function (ctx) {
      const s = shop(ctx);
      const c = s.comp();
      c.ratio.value = 20; c.knee.value = 0; c.attack.value = 0.001; c.release.value = 0.05;
      c.threshold.value = -1;
      // The node's hidden makeup, cancelled (queue 986, hunt C2 — see hardKneeMakeupCancel). The ceiling
      // drives the threshold AND this gain from one key, so a keyframed ceiling stays compensated at
      // every step: both are real AudioParams scheduled together.
      const trim = s.gain(hardKneeMakeupCancel(-1, 20));
      c.connect(trim);
      return unit({ input: c, output: trim, nodes: s.nodes, oscs: s.oscs,
        custom: { ceiling: multi([[c.threshold, null], [trim.gain, v => hardKneeMakeupCancel(v, 20)]]) } });
    },
  }, {
    type: 'tremolo', label: 'Tremolo', category: 'dyn',
    params: [P('rate', 'Rate', 0.1, 20, 0.1, 5, 'Hz', true), P('depth', 'Depth', 0, 1, 0.01, 0.7, '', true)],
    build: function (ctx) {
      const s = shop(ctx);
      const carrier = s.gain(1);
      const lfo = s.lfo(5, { key: 'rate' });
      const amp = s.gain(0.35);
      lfo.connect(amp); amp.connect(carrier.gain);
      // depth 0 → base 1, no swing (unity). depth 1 → base 0.5 ± 0.5, dipping to silence.
      return unit({
        input: carrier, output: carrier, nodes: s.nodes, oscs: s.oscs, lfos: s.lfos, params: { rate: lfo.playbackRate },
        custom: { depth: multi([[carrier.gain, v => 1 - v / 2], [amp.gain, v => v / 2]]) },
      });
    },
  });

  /* ---- Character ---- */
  DEFS.push({
    type: 'distortion', label: 'Distortion', category: 'char',
    params: [P('drive', 'Drive', 0, 100, 1, 30, '', true), MIX(1)],
    build: function (ctx, inst) {
      const s = shop(ctx);
      const input = s.gain(1), out = s.gain(1);
      let drive = initNum(inst, 'drive', 30, 0, 100);
      const sh = s.shaper(driveCurve(drive), '4x');
      const shg = s.gain(1);            // the static shaper's own level, so the bank can take over
      const wd = wetDry(s, inst, 'mix', 1);
      input.connect(wd.dry).connect(out);
      input.connect(sh); sh.connect(shg); shg.connect(wd.wet); wd.wet.connect(out);
      const bank = curveBank(s, input, wd.wet, driveCurve, 0, 100);
      return unit({
        input: input, output: out, nodes: s.nodes, oscs: s.oscs,
        custom: {
          drive: function (v, when, ramp) {
            v = clamp(v, 0, 100);
            /* STATIC MUST NEVER BUILD THE BANK. `when == null` is NOT the test — the static path calls
               set(key, value, 0), so `when` is 0 and not null, and an early version of this built a
               12-shaper bank for every plain Distortion in every project. The counter added for the
               suite caught it on the first measurement. The honest question is whether the PARAM is
               animated, so ask that. */
            if (!FM.isAnimated(inst.params && inst.params.drive)) {
              if (v !== drive) { drive = v; sh.curve = driveCurve(v); }
              return;
            }
            bank.at(v, when, ramp, shg.gain);
          },
          mix: wd.set,
        },
      });
    },
  }, {
    type: 'bitcrush', label: 'Bit Crush', category: 'char',
    params: [P('bits', 'Bits', 1, 16, 1, 6, '', true), MIX(1)],
    build: function (ctx, inst) {
      const s = shop(ctx);
      const input = s.gain(1), out = s.gain(1);
      let bits = initNum(inst, 'bits', 6, 1, 16);
      const sh = s.shaper(crushCurve(bits), 'none');   // oversampling would interpolate the steps back out
      const shg = s.gain(1);
      const wd = wetDry(s, inst, 'mix', 1);
      input.connect(wd.dry).connect(out);
      input.connect(sh); sh.connect(shg); shg.connect(wd.wet); wd.wet.connect(out);
      /* 16 entries for 1..16 bits, so every bank entry IS an exact bit depth and the crossfade only
         ever runs between two whole values — no interpolation error anywhere. 'none' matters as much
         here as it does above: oversampling would interpolate the very steps this effect exists to
         make. This is also the effect the entry measured as the worst clicker (6.8x), and the reason
         it clicks is that at low bit counts one step changes every output sample — which a gain
         crossfade smooths and a curve swap cannot. */
      const bank = curveBank(s, input, wd.wet, crushCurve, 1, 16, 16, 'none');
      return unit({
        input: input, output: out, nodes: s.nodes, oscs: s.oscs,
        custom: {
          bits: function (v, when, ramp) {
            v = clamp(Math.round(v), 1, 16);
            if (!FM.isAnimated(inst.params && inst.params.bits)) {   // see the note on distortion's drive
              if (v !== bits) { bits = v; sh.curve = crushCurve(v); }
              return;
            }
            bank.at(v, when, ramp, shg.gain);
          },
          mix: wd.set,
        },
      });
    },
  }, {
    type: 'lofi', label: 'Lo-Fi', category: 'char',
    params: [P('amount', 'Amount', 0, 1, 0.01, 0.6, '', true), MIX(1)],
    build: function (ctx, inst) {
      const s = shop(ctx);
      const input = s.gain(1), out = s.gain(1);
      let amount = initNum(inst, 'amount', 0.6, 0, 1);
      const hp = s.biquad('highpass', 20, 0.7);
      const lp = s.biquad('lowpass', 20000, 0.7);
      const sh = s.shaper(null, 'none');
      const shg = s.gain(1);
      const wd = wetDry(s, inst, 'mix', 1);
      // One knob closes the band toward 500–4000 Hz while the curve adds crush and drive together.
      const shape = function (a) {
        hp.frequency.value = 20 + a * 480;
        lp.frequency.value = 20000 - a * 16000;
        sh.curve = lofiCurve(a);
      };
      shape(amount);
      input.connect(wd.dry).connect(out);
      input.connect(hp); hp.connect(lp); lp.connect(sh); sh.connect(shg); shg.connect(wd.wet); wd.wet.connect(out);
      /* THE HYBRID CASE (the per-effect-slider entry). Lo-Fi's one knob drives THREE things, and they
         are not the same kind of thing: two biquad frequencies, which are real AudioParams and simply
         ramp, and a transfer curve, which cannot be ramped at all and needs the crossfaded bank the
         other two Character effects use. Both halves have to move together or the band closes while the
         crush stays put.
         The bank feeds from `lp`, NOT from the input — the shapers must receive the already-filtered
         signal, exactly as the static `sh` does. Feeding it from the input would leave the animated
         path unfiltered and quietly brighter than the static one. */
      const bank = curveBank(s, lp, wd.wet, lofiCurve, 0, 1, 12, 'none');
      return unit({
        input: input, output: out, nodes: s.nodes, oscs: s.oscs,
        custom: {
          amount: function (v, when, ramp) {
            v = clamp(v, 0, 1);
            if (!FM.isAnimated(inst.params && inst.params.amount)) {   // see the note on distortion's drive
              if (v !== amount) { amount = v; shape(v); }
              return;
            }
            const hz1 = 20 + v * 480, hz2 = 20000 - v * 16000;
            try { ramp ? hp.frequency.linearRampToValueAtTime(hz1, when) : hp.frequency.setValueAtTime(hz1, when); } catch (e) {}
            try { ramp ? lp.frequency.linearRampToValueAtTime(hz2, when) : lp.frequency.setValueAtTime(hz2, when); } catch (e) {}
            bank.at(v, when, ramp, shg.gain);
          },
          mix: wd.set,
        },
      });
    },
  }, {
    type: 'chorus', label: 'Chorus', category: 'char',
    params: [P('rate', 'Rate', 0.05, 5, 0.01, 0.8, 'Hz', true), P('depth', 'Depth', 0, 1, 0.01, 0.5, '', true), MIX(0.5)],
    build: function (ctx, inst) {
      const s = shop(ctx);
      const input = s.gain(1), out = s.gain(1);
      const wd = wetDry(s, inst, 'mix', 0.5);
      input.connect(wd.dry).connect(out);
      const sum = s.gain(1 / 3);
      const rates = [1, 1.31, 0.77], bases = [0.015, 0.021, 0.027];
      const rateT = [], depthT = [];
      for (let i = 0; i < 3; i++) {
        const d = s.delay(0.08);
        d.delayTime.value = bases[i];   // ±4 ms of sweep never pushes these centres negative
        const lfo = s.lfo(0.8 * rates[i], { key: 'rate', mul: rates[i] });
        const amp = s.gain(0.5 * 0.004);
        lfo.connect(amp); amp.connect(d.delayTime);
        input.connect(d); d.connect(sum);
        rateT.push([lfo.playbackRate, rates[i]]);
        depthT.push([amp.gain, 0.004]);
      }
      sum.connect(wd.wet); wd.wet.connect(out);
      return unit({ input: input, output: out, nodes: s.nodes, oscs: s.oscs, lfos: s.lfos, custom: { rate: multi(rateT), depth: multi(depthT), mix: wd.set } });
    },
  }, {
    type: 'flanger', label: 'Flanger', category: 'char',
    params: [P('rate', 'Rate', 0.05, 5, 0.01, 0.3, 'Hz', true), P('depth', 'Depth', 0, 1, 0.01, 0.6, '', true), P('feedback', 'Feedback', 0, 0.9, 0.01, 0.5, '', true), MIX(0.5)],
    /* ═══ THE FEEDBACK CAME BACK ONE RENDER QUANTUM LATE (queue 986, hunt C16) ═══════════════════════════════
     * The feedback was a loop through the swept delay itself (d → fb → d). Web Audio only allows a cycle with a
     * DelayNode in it, and an engine pays for the cycle with one render quantum (128 frames) on every trip:
     * MEASURED at 768c83d0 in the suite's Chrome, an impulse at the bottom of the sweep (τ = 1 ms, Feedback 0.5)
     * came back at 1.00, 4.67, 8.35, 12.06 ms — τ, then τ + 2.67 ms each time — instead of 1, 2, 3, 4; at the top
     * (τ = 7 ms) at 7.0, 16.6, 26.3 instead of 7, 14, 21; 44.1 kHz the same with 2.90 ms. (The backlog read this as
     * the sweep being clamped at the bottom; measured, the first pass does reach 1 ms — it is every echo after it
     * that is late.) So the resonances Feedback adds sat on a comb 1/(τ + 2.67 ms) apart while the notches sit
     * 1/τ apart: Feedback did not sharpen the flange, it laid a second, unrelated comb over it, at every setting.
     * THE LOOP IS UNROLLED, SO THERE IS NO CYCLE AT ALL. y = x(t−τ) + fb·y(t−τ) IS the sum of its echoes,
     * Σ fb^(k−1)·x(t−kτ), and a chain of delays, each swept by the same LFO, produces exactly those echoes: the
     * k-th delay's output has been through k sweeps, the same time-varying path the recursion takes. Each tap is
     * weighted fb^(k−1), so a keyframed Feedback still schedules as real gains. FLANGE_TAPS echoes: the rest of
     * the tail is fb^16 — 0.0015 % at the default 0.5, and at the 0.9 maximum the resonance peaks 1.8 dB under a
     * perfect loop (the price of no cycle; the old loop reached full height at the wrong frequencies). Delays are
     * cheap: measured, a second of stereo renders in 8 ms against 2 ms before (a Reverb takes 25). The first
     * pass — the sweep itself, Feedback 0 — is the same node doing the same thing it always did, and renders
     * sample-for-sample what it did at 768c83d0. */
    build: function (ctx, inst) {
      const s = shop(ctx);
      const input = s.gain(1), out = s.gain(1);
      const wd = wetDry(s, inst, 'mix', 0.5);
      input.connect(wd.dry).connect(out);
      const lfo = s.lfo(0.3, { key: 'rate' });
      const amp = s.gain(0.6 * 0.003);   // 1–7 ms sweep around 4 ms, the same swing on every delay in the chain
      lfo.connect(amp);
      const fb0 = initNum(inst, 'feedback', 0.5, 0, 0.9);
      const sum = s.gain(1), tapT = [];
      let prev = input;
      for (let k = 0; k < FLANGE_TAPS; k++) {
        const d = s.delay(0.05); d.delayTime.value = 0.004;
        amp.connect(d.delayTime);
        prev.connect(d); prev = d;
        const g = s.gain(Math.pow(fb0, k));   // echo k+1 carries fb^k
        d.connect(g); g.connect(sum);
        if (k) tapT.push([g.gain, powOf(k)]);
      }
      sum.connect(wd.wet); wd.wet.connect(out);
      return unit({
        input: input, output: out, nodes: s.nodes, oscs: s.oscs, lfos: s.lfos, params: { rate: lfo.playbackRate },
        custom: { depth: multi([[amp.gain, 0.003]]), feedback: multi(tapT), mix: wd.set },
      });
    },
  }, {
    type: 'phaser', label: 'Phaser', category: 'char',
    params: [P('rate', 'Rate', 0.05, 5, 0.01, 0.5, 'Hz', true), P('depth', 'Depth', 0, 1, 0.01, 0.7, '', true), P('feedback', 'Feedback', 0, 0.9, 0.01, 0.4, '', true)],
    /* ═══ FEEDBACK WAS A FIXED COMB, NOT A SHARPER PHASER (queue 986, hunt C17) ══════════════════════════════
     * The feedback ran round a loop — the four allpasses, then back through a 1 ms DelayNode, because Web Audio
     * mutes a cycle without one — and the engine adds a render quantum to every trip round a cycle. MEASURED at
     * 768c83d0 (Depth 0, so the allpasses hold still): the response fits a loop of 1 ms + 128 frames = 3.67 ms to
     * 0.00 dB, and misses the loop a phaser means (none) by 7.6 dB rms at Feedback 0.9, 3.6 dB at the default 0.4.
     * A 3.67 ms loop is a comb every 272 Hz that stands still while the notches sweep — so turning Feedback up
     * added a fixed metallic ring instead of the moving resonance it is for.
     * THE LOOP IS UNROLLED. y = A(x + fb·y), with no delay in the loop, is y = Σ fb^(k−1)·A^k(x): the input
     * through the allpass chain once, twice, three times…, each pass weighted fb^(k−1). PHASE_PASSES copies of
     * the chain in series give exactly those terms with no cycle anywhere — every copy swept by the same LFO
     * through the same four amps, so the resonances move with the notches. What is left out is fb^6: measured
     * against a perfect loop, 0.03 dB rms at the default 0.4, and 3.3 dB rms at the 0.9 maximum, where the
     * resonant peaks land about 6 dB under full height (768c83d0's loop: 3.6 and 7.6 dB off, at the wrong
     * frequencies). Six passes, not more, for the phone: each is four swept biquads, and measured a second of
     * stereo now renders in 48 ms against 9.5 ms before (eight passes: 58 ms; a Reverb: 25). Sweeping the later
     * passes at k-rate would nearly have halved that (measured 33 ms), but at Rate 5 / Depth 1 / Feedback 0.9 a
     * sine then came out differing from the sample-accurate render by a signal only 4.4 dB under the sound itself
     * — the later passes lagging the first, the resonance off its notch — so every pass sweeps sample-accurately.
     * Feedback 0 is the first copy alone — the same four nodes, the same wiring — so it renders sample-for-sample
     * what it did at 768c83d0, and Feedback schedules as real gains, keyframed or not. */
    build: function (ctx, inst) {
      const s = shop(ctx);
      const input = s.gain(1), out = s.gain(1);
      const dry = s.gain(0.5), wet = s.gain(0.5);   // the notches ARE dry + allpass summed — no mix knob
      input.connect(dry).connect(out);
      const lfo = s.lfo(0.5, { key: 'rate' });
      const bases = [200, 400, 800, 1600];
      // each stage sweeps in proportion to its own centre; one amp per stage drives that stage in every copy
      const amps = bases.map(function (b) { const a = s.gain(0.7 * b * 0.7); lfo.connect(a); return a; });
      const depthT = bases.map(function (b, i) { return [amps[i].gain, b * 0.7]; });
      const fb0 = initNum(inst, 'feedback', 0.4, 0, 0.9);
      const sum = s.gain(1), tapT = [];
      let prev = input;
      for (let k = 0; k < PHASE_PASSES; k++) {
        bases.forEach(function (b, i) {
          const ap = s.biquad('allpass', b, 1);
          amps[i].connect(ap.frequency);
          prev.connect(ap); prev = ap;
        });
        const g = s.gain(Math.pow(fb0, k));   // pass k+1 carries fb^k
        prev.connect(g); g.connect(sum);
        if (k) tapT.push([g.gain, powOf(k)]);
      }
      sum.connect(wet); wet.connect(out);
      return unit({ input: input, output: out, nodes: s.nodes, oscs: s.oscs, lfos: s.lfos, params: { rate: lfo.playbackRate }, custom: { depth: multi(depthT), feedback: multi(tapT) } });
    },
  }, {
    type: 'vibrato', label: 'Vibrato', category: 'char',
    params: [P('rate', 'Rate', 0.1, 12, 0.1, 5, 'Hz', true), P('depth', 'Depth', 0, 1, 0.01, 0.3, '', true)],
    build: function (ctx) {
      const s = shop(ctx);
      const d = s.delay(0.05); d.delayTime.value = 0.005;   // 2–8 ms around a 5 ms centre, 100% wet
      const lfo = s.lfo(5, { key: 'rate' });
      const amp = s.gain(0.3 * 0.003);
      lfo.connect(amp); amp.connect(d.delayTime);
      return unit({ input: d, output: d, nodes: s.nodes, oscs: s.oscs, lfos: s.lfos, params: { rate: lfo.playbackRate }, custom: { depth: multi([[amp.gain, 0.003]]) } });
    },
  }, {
    type: 'ringmod', label: 'Ring Mod', category: 'char',
    params: [P('freq', 'Frequency', 10, 2000, 1, 220, 'Hz', true), MIX(1)],
    build: function (ctx, inst) {
      const s = shop(ctx);
      const input = s.gain(1), out = s.gain(1);
      const ring = s.gain(0);   // gain 0 + an LFO on .gain = a multiplier; nothing else may write it
      /* A 0.1 s CYCLE, NOT THE LFO's USUAL 1 s (queue 986, hunt C15). On a 1 s buffer the playbackRate
         IS the frequency, and an AudioBufferSourceNode's rate stops at 1024 in Chromium and WebKit —
         MEASURED in the suite's Chrome: 1100, 1500 and 2000 Hz all came out at exactly 1024 Hz, so the
         top half of the Frequency slider did nothing. At 0.1 s the rate is Hz / 10 (≤ 200 at 2000 Hz),
         and 0.1 s is a whole number of samples at 44.1, 48 and 96 kHz, so the cycle is exact. */
      const RING_SECS = 0.1;
      const lfo = s.lfo(220, { key: 'freq', secs: RING_SECS });
      lfo.connect(ring.gain);
      const wd = wetDry(s, inst, 'mix', 1);
      input.connect(wd.dry).connect(out);
      input.connect(ring); ring.connect(wd.wet); wd.wet.connect(out);
      return unit({ input: input, output: out, nodes: s.nodes, oscs: s.oscs, lfos: s.lfos, custom: { freq: multi([[lfo.playbackRate, RING_SECS]]), mix: wd.set } });
    },
  }, {
    type: 'vocalremove', label: 'Vocal Remove', category: 'char',
    params: [P('amount', 'Amount', 0, 1, 0.01, 1, '', true), P('bassKeep', 'Keep Bass', 0, 1, 0.01, 1, '', true)],
    build: function (ctx, inst) {
      const s = shop(ctx);
      const input = s.gain(1), out = s.gain(1);
      const wd = wetDry(s, inst, 'amount', 1);
      input.connect(wd.dry).connect(out);
      // The splitter is "discrete" by spec, so a MONO clip would arrive as [L, 0] and L−R would BE the
      // lead vocal, passed through untouched. Up-mix to L=R first ("speakers" duplicates mono) so a mono
      // clip really does cancel to silence and only the low-passed sum survives. Nothing down here can
      // detect that the clip was mono to begin with — the UI warns instead.
      input.channelCount = 2; input.channelCountMode = 'explicit'; input.channelInterpretation = 'speakers';
      const split = s.splitter(2);
      input.connect(split);
      const sP = s.gain(1), sN = s.gain(-1), side = s.gain(1);
      split.connect(sP, 0); split.connect(sN, 1);
      sP.connect(side); sN.connect(side);            // L − R cancels the centred lead
      const mono = s.gain(0.5);
      split.connect(mono, 0); split.connect(mono, 1);
      const lp = s.biquad('lowpass', 180, 0.5);
      const bass = s.gain(1);
      mono.connect(lp); lp.connect(bass);            // hand the kick/bass back — the cancel eats them too
      side.connect(wd.wet); bass.connect(wd.wet);    // mono result, up-mixed to both channels
      wd.wet.connect(out);
      return unit({ input: input, output: out, nodes: s.nodes, oscs: s.oscs, params: { bassKeep: bass.gain }, custom: { amount: wd.set } });
    },
  }, {
    type: 'pitch', label: 'Pitch Shift', category: 'char',
    params: [P('semitones', 'Semitones', -12, 12, 1, 0, 'st', true), MIX(1)],
    build: function (ctx, inst) {
      const s = shop(ctx);
      const input = s.gain(1), out = s.gain(1);
      const wd = wetDry(s, inst, 'mix', 1);
      input.connect(wd.dry).connect(out);
      /* Granular shift: a delay line read while its delayTime slides at exactly dτ/dt = 1 − ratio
       * resamples the signal by `ratio`. One line can only slide so far, so two run half a grain apart
       * and cross-fade, each windowed to silence at its own reset — that is where its delay jumps back.
       * G is the grain: shorter combs the tone, longer smears it into an echo. */
      const G = 0.1;
      const gA = s.delay(0.2), gB = s.delay(0.2);
      const mA = s.gain(0), mB = s.gain(0);
      s.lfo(1 / G, { wave: 'ramp', secs: G }).connect(mA);
      s.lfo(1 / G, { wave: 'ramp', secs: G, phase: 0.5 }).connect(mB);
      mA.connect(gA.delayTime); mB.connect(gB.delayTime);
      const lA = s.gain(1), lB = s.gain(1);   // window depth
      const wA = s.gain(0), wB = s.gain(0);   // gain 0 + a window LFO on .gain = the cross-fade itself
      s.lfo(1 / G, { wave: 'win', secs: G }).connect(lA); lA.connect(wA.gain);
      s.lfo(1 / G, { wave: 'win', secs: G, phase: 0.5 }).connect(lB); lB.connect(wB.gain);
      input.connect(gA); gA.connect(wA); wA.connect(wd.wet);
      input.connect(gB); gB.connect(wB); wB.connect(wd.wet);
      wd.wet.connect(out);
      let st = Math.round(initNum(inst, 'semitones', 0, -12, 12));
      /* The seven values the knob drives, as functions of v. Written once and read by BOTH paths below,
         because the static and animated versions differing by a stray sign is the kind of bug that only
         ever shows up as "the export sounds wrong", long after anyone would connect it to this. */
      const dOf = function (v) { const r = Math.pow(2, v / 12); return Math.abs(1 - r) * G; };   // one grain's slide
      const upOf = function (v) { return Math.pow(2, v / 12) > 1; };
      const shape = function (v) {
        const up = upOf(v), D = dOf(v);   // the ramp's slope IS 1 − ratio
        gA.delayTime.value = up ? D : 0; gB.delayTime.value = up ? D : 0;
        mA.gain.value = up ? -D : D; mB.gain.value = up ? -D : D;
        // At 0 st both lines carry the identical dry signal, and two equal-POWER windows over identical
        // signals sum to +3 dB, not unity. Hold line A wide open and mute line B instead — a real bypass.
        lA.gain.value = v ? 1 : 0; wA.gain.value = v ? 0 : 1;
        lB.gain.value = v ? 1 : 0;
      };
      /* ---- THE ANIMATED PATH (the unnumbered per-effect-slider entry) ----------------------------
       * Pitch Shift is the last of the six, and it is NOT the crossfaded-shaper-bank fix that Distortion,
       * Bit Crush and Lo-Fi got — the entry warns twice against copying it here, and it is right: there
       * is no transfer curve to swap. All seven targets above are ALREADY real AudioParams. The only
       * reason this slider could not be keyframed is that the setter assigned `.value` and threw `when`
       * away, so the scheduler's thirty values a second all landed at once and the last one won.
       * The whole fix is therefore to schedule rather than assign. No bank, no extra nodes, nothing to
       * warn about — this is the cheapest of the six, not the most expensive.
       * IT GLIDES THROUGH FRACTIONAL SEMITONES rather than stepping between whole ones. The static path
       * rounds, because the slider's step is 1 st, but rounding an ANIMATED value would turn a rise into
       * a staircase of twelve jumps, each a step change in delayTime — which is the clicking the other
       * three had to be rescued from. Ramped through, it is a portamento, and it still passes through the
       * exact whole numbers at the keyframes themselves.
       * Crossing zero stays continuous, and not by luck: D → 0 as v → 0, so the `up` flip happens exactly
       * where its two branches meet. The bypass pair is the one truly binary thing here, and it RAMPS
       * across a scheduling step (33 ms) instead of switching, so leaving 0 st is a crossfade. */
      const animated = function () { return FM.isAnimated(inst && inst.params ? inst.params.semitones : undefined); };
      const glide = function (v, when, ramp) {
        // Counted so the suite can prove a STATIC pitch never takes this path. Sound alone cannot police
        // that: scheduling one value 120 times renders identically to assigning it once. Same lesson as
        // the shaper-bank counter above, and as the motion-blur slice counter in queue 382.
        FM._pitchGlides = (FM._pitchGlides || 0) + 1;
        const up = upOf(v), D = dOf(v), on = v ? 1 : 0;
        const at = function (ap, x) {
          try { ramp ? ap.linearRampToValueAtTime(x, when) : ap.setValueAtTime(x, when); } catch (e) {}
        };
        at(gA.delayTime, up ? D : 0); at(gB.delayTime, up ? D : 0);
        at(mA.gain, up ? -D : D); at(mB.gain, up ? -D : D);
        at(lA.gain, on); at(wA.gain, 1 - on); at(lB.gain, on);
      };
      shape(st);
      return unit({
        input: input, output: out, nodes: s.nodes, oscs: s.oscs, lfos: s.lfos,
        custom: {
          semitones: function (v, when, ramp) {
            /* Gated on isAnimated, NOT on `when` — the static path calls set(key, value, 0), so `when`
               is 0 and not null. Guarding on `when == null` is exactly the bug the Distortion bank
               shipped with, where every static instance in every project quietly took the expensive
               path while sounding identical. */
            if (!animated()) { v = Math.round(clamp(v, -12, 12)); if (v !== st) { st = v; shape(v); } return; }
            glide(clamp(v, -12, 12), Math.max(0, when || 0), !!ramp);
          },
          mix: wd.set,
        },
      });
    },
  });

  /* ---- registry ---- */
  // Null prototype, not {}: every lookup below takes an id straight off an imported .fmproj, and on a
  // plain object REG['constructor'] would answer with an inherited function — truthy enough to pass
  // storage.js's whitelist and land a nameless ghost row in the stack.
  const REG = Object.create(null);

  const CATEGORY_LABELS = { eq: 'EQ / Filter', space: 'Space / Stereo', dyn: 'Dynamics', char: 'Character' };
  const CATEGORY_ORDER = ['eq', 'space', 'dyn', 'char'];

  /* ═══ WHAT PEOPLE CALL THEM (queue 986, hunt C13) ═════════════════════════════════════════════════════════
     Search matched an effect's label, its type id and its category, and nothing else — so the words people
     actually type found nothing. MEASURED at 768c83d0 in the real browser: karaoke, robot, chipmunk, muffled,
     underwater, radio, bass boost and 8-bit all said "No audio effects match", although this file itself calls
     Vocal Remove "karaoke" and Pitch Shift "a chipmunk". These are the names for the SOUND each one makes, read
     by js/audio-fx-browser.js's search alongside the label. One table so it is read in one place. */
  const TAGS = {
    bassTreble: ['bass boost', 'bass', 'treble', 'tone', 'warmer', 'brighter'],
    eq3: ['equaliser', 'equalizer', 'eq', 'tone', 'mids'],
    lowpass: ['muffled', 'underwater', 'next room', 'through a wall', 'dull', 'dark'],
    highpass: ['thin', 'rumble', 'cut bass', 'wind noise'],
    bandpass: ['focus', 'narrow'],
    notch: ['hum', 'buzz', 'remove hum'],
    telephone: ['phone', 'phone call', 'radio', 'walkie', 'walkie talkie', 'megaphone', 'call'],
    reverb: ['room', 'hall', 'church', 'cave', 'cathedral', 'echo'],
    delay: ['repeat', 'echo'],
    pingpong: ['bounce', 'left right', 'stereo echo'],
    width: ['wide', 'stereo', 'mono', 'narrow'],
    pan: ['left', 'right', 'balance'],
    autopan: ['8d', '8d audio', 'spatial', 'rotate', 'surround', 'spin'],
    gain: ['louder', 'quieter', 'volume', 'boost'],
    compressor: ['podcast', 'level', 'even out', 'punch'],   // not 'voice': as one word of 'robot voice' it would list the Compressor
    limiter: ['loud', 'loudness', 'clipping', 'maximise', 'maximize'],
    tremolo: ['wobble', 'pulse', 'throb'],
    distortion: ['fuzz', 'overdrive', 'crunch', 'guitar', 'distorted', 'blown out'],
    bitcrush: ['8-bit', '8 bit', 'retro', 'game', 'chiptune', 'crushed'],
    lofi: ['vintage', 'cassette', 'tape', 'old', 'retro', 'lo fi'],
    chorus: ['double', 'thicken', 'shimmer', 'ensemble'],
    flanger: ['jet', 'whoosh', 'sweep'],
    phaser: ['swirl', 'sweep', 'swoosh'],
    vibrato: ['warble', 'wobble', 'wavy'],
    ringmod: ['robot', 'robot voice', 'dalek', 'metallic', 'alien'],
    vocalremove: ['karaoke', 'instrumental', 'acapella', 'a cappella', 'remove vocals', 'no vocals', 'backing track'],
    pitch: ['chipmunk', 'deep voice', 'helium', 'higher', 'lower', 'key', 'voice changer'],
  };
  DEFS.forEach(d => { d.tags = TAGS[d.type] || []; });

  FM.AUDIO_EFFECTS = DEFS;
  DEFS.forEach(d => { REG[d.type] = d; });
  FM.AFX_CATEGORIES = CATEGORY_ORDER
    .filter(k => DEFS.some(d => d.category === k))
    .map(k => ({ key: k, label: CATEGORY_LABELS[k] || k }));
  // The eight that carry a clip, newest first: a chipmunk, a room, an echo, a tone shape, a leveller,
  // karaoke, a phone, 8D.
  FM.AFX_FEATURED = ['pitch', 'reverb', 'delay', 'eq3', 'compressor', 'vocalremove', 'telephone', 'autopan'];

  FM.audioFxRegistry = {
    get: function (id) { return REG[id] || null; },
    all: function () { return DEFS.slice(); },
    byCategory: function (catKey) { return DEFS.filter(d => d.category === catKey); },
    categories: function () { return FM.AFX_CATEGORIES; },
    paramsOf: function (id) { return (REG[id] && REG[id].params) || []; },
    // THE single creation path — returns exactly ONE instance.
    makeInstance: function (id) {
      const d = REG[id]; if (!d) return null;
      const params = {};
      d.params.forEach(p => { params[p.key] = p.def; });
      return { type: d.type, enabled: true, params: params };
    },
    // Audio rides ONLY on video layers — an mp3/wav is a video layer with a 0×0 picture.
    supportsLayer: function (id, layer) { return !!(REG[id] && layer && layer.type === 'video'); },
  };

  // Unknown types are excluded here as well as in buildAudioFxChain, so "has effects" can never disagree
  // with "built a chain" (a project saved by a newer build must not silently mute its clip).
  FM.layerHasAudioFx = function (layer) {
    const fx = layer && layer.audioFx;
    return !!(fx && fx.length && fx.some(f => f && f.enabled !== false && REG[f.type]));
  };

  /* The layer's whole signal chain: input → fx0 → fx1 → … → output. A disabled effect is skipped
   * entirely, not bypassed with a gain. Null when there is nothing to build.
   * `sceneAtCtxZero` is the scene time that ctx time 0 stands for — the ONE fact an LFO needs to put its
   * phase where scene time says it belongs (export: the range start; live: FM.time − ctx.currentTime).
   * It is optional and defaults to 0: omit it and the chain takes the anchor from whichever of
   * schedule()/applyAt() runs first, since each of those states that same mapping outright. */
  FM.buildAudioFxChain = function (ctx, layer, sceneAtCtxZero) {
    const list = ((layer && layer.audioFx) || []).filter(f => f && f.enabled !== false && REG[f.type]);
    if (!list.length) return null;
    const input = ctx.createGain(), output = ctx.createGain();
    const built = [];
    let prev = input;
    list.forEach(inst => {
      const def = REG[inst.type];
      let u = null;
      try { u = def.build(ctx, inst); } catch (e) { u = null; }   // one bad effect must not silence the clip
      if (!u) return;
      prev.connect(u.input);
      prev = u.output;
      built.push({ u: u, inst: inst, def: def });
    });
    prev.connect(output);

    const anchor = (typeof sceneAtCtxZero === 'number' && isFinite(sceneAtCtxZero)) ? sceneAtCtxZero : null;
    let armed = false;
    function rateAt(b, key, sceneT) {
      const ps = b.def.params;
      for (let i = 0; i < ps.length; i++) if (ps[i].key === key) return valueAt(b.inst, ps[i], sceneT);
      return 0;
    }
    // Sources start exactly once, at the phase scene time implies. Nothing can restart them afterwards,
    // so a seek does not re-phase a live chain — only a rebuild does.
    function arm(anchorScene) {
      if (armed) return;
      armed = true;
      const sceneAtStart = anchorScene + ctx.currentTime;
      for (let i = 0; i < built.length; i++) {
        const b = built[i];
        try { b.u.arm(sceneAtStart, key => rateAt(b, key, sceneAtStart)); } catch (e) {}
      }
    }
    if (anchor !== null) arm(anchor);

    return {
      input: input,
      output: output,
      // Every param at its value for `sceneTime`. Preview calls this each rAF tick — no allocation.
      applyAt: function (sceneTime) {
        const when = ctx.currentTime;
        if (!armed) arm(anchor !== null ? anchor : sceneTime - when);   // "the scene is at sceneTime NOW"
        for (let i = 0; i < built.length; i++) {
          const b = built[i], ps = b.def.params;
          for (let j = 0; j < ps.length; j++) b.u.set(ps[j].key, valueAt(b.inst, ps[j], sceneTime), when);
        }
      },
      // Offline render: animated params sampled at 30 Hz across the window in ctx time (= scene − from),
      // exactly the way exporter.js schedules the volume envelope. Static params land once at 0.
      schedule: function (fromScene, toScene) {
        fromScene = fromScene || 0;
        if (!armed) arm(anchor !== null ? anchor : fromScene);   // ctxTime = sceneTime − fromScene, below
        const span = Math.max(0, (toScene || 0) - fromScene);
        for (let i = 0; i < built.length; i++) {
          const b = built[i], ps = b.def.params;
          // Before any per-value scheduling: an effect that animates a BUFFER rather than a param needs
          // the whole window, because offline rendering offers no later moment to change one.
          if (b.u.window) { try { b.u.window(fromScene, toScene || fromScene); } catch (e) { console.warn('fx window hook failed', e); } }
          for (let j = 0; j < ps.length; j++) {
            const p = ps[j];
            const raw = b.inst.params ? b.inst.params[p.key] : undefined;
            if (p.keyframable && span > 0 && FM.isAnimated(raw)) {
              const steps = Math.max(2, Math.ceil(span * 30));
              for (let k = 0; k <= steps; k++) {
                const sceneT = fromScene + span * (k / steps);
                const v = valueAt(b.inst, p, sceneT);
                const ct = Math.max(0, sceneT - fromScene);
                if (k === 0) b.u.set(p.key, v, ct); else b.u.ramp(p.key, v, ct);
              }
            } else {
              b.u.set(p.key, valueAt(b.inst, p, fromScene), 0);
            }
          }
        }
      },
      dispose: function () {
        built.forEach(b => { try { b.u.dispose(); } catch (e) {} });
        try { input.disconnect(); } catch (e) {}
        try { output.disconnect(); } catch (e) {}
        built.length = 0;
      },
    };
  };
})(window.FM);
