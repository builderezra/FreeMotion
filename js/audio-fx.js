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
    if (!_ac) { const AC = window.AudioContext || window.webkitAudioContext; _ac = new AC(); }
    if (_ac.state === 'suspended') _ac.resume();
    return _ac;
  };

  function clamp(v, lo, hi) { return v < lo ? lo : (v > hi ? hi : v); }
  function dbToLin(db) { return Math.pow(10, db / 20); }

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
  function crushCurve(bits) {
    const step = 2 / Math.pow(2, Math.round(clamp(bits, 1, 16)));
    return curveFrom(x => Math.round(x / step) * step, 8192);
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
    params: [P('size', 'Size', 0, 1, 0.01, 0.5, '', false), P('decay', 'Decay', 0.1, 8, 0.1, 2, 's', false), MIX(0.3)],
    build: function (ctx, inst) {
      const s = shop(ctx);
      const input = s.gain(1), out = s.gain(1);
      const conv = s.convolver();   // normalize stays on: size/decay then change the room, not the level
      const wd = wetDry(s, inst, 'mix', 0.3);
      input.connect(wd.dry).connect(out);
      input.connect(conv); conv.connect(wd.wet); wd.wet.connect(out);
      let size = initNum(inst, 'size', 0.5, 0, 1), decay = initNum(inst, 'decay', 2, 0.1, 8);
      conv.buffer = impulse(ctx, size, decay);
      return unit({
        input: input, output: out, nodes: s.nodes, oscs: s.oscs,
        custom: {
          size: function (v) { v = clamp(v, 0, 1); if (v !== size) { size = v; conv.buffer = impulse(ctx, size, decay); } },
          decay: function (v) { v = clamp(v, 0.1, 8); if (v !== decay) { decay = v; conv.buffer = impulse(ctx, size, decay); } },
          mix: wd.set,
        },
      });
    },
  }, {
    type: 'delay', label: 'Echo / Delay', category: 'space',
    params: [P('time', 'Time', 0.01, 2, 0.01, 0.35, 's', true), P('feedback', 'Feedback', 0, 0.9, 0.01, 0.35, '', true), MIX(0.35)],
    build: function (ctx, inst) {
      const s = shop(ctx);
      const input = s.gain(1), out = s.gain(1);
      const d = s.delay(2.2); d.delayTime.value = 0.35;
      const fb = s.gain(0.35);
      const wd = wetDry(s, inst, 'mix', 0.35);
      input.connect(wd.dry).connect(out);
      input.connect(d);
      d.connect(fb).connect(d);
      d.connect(wd.wet); wd.wet.connect(out);
      return unit({ input: input, output: out, nodes: s.nodes, oscs: s.oscs, params: { time: d.delayTime, feedback: fb.gain }, custom: { mix: wd.set } });
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
    ],
    build: function (ctx) {
      const s = shop(ctx);
      const c = s.comp();
      return unit({ input: c, output: c, nodes: s.nodes, oscs: s.oscs, params: { threshold: c.threshold, ratio: c.ratio, attack: c.attack, release: c.release } });
    },
  }, {
    type: 'limiter', label: 'Limiter', category: 'dyn',
    params: [P('ceiling', 'Ceiling', -24, 0, 0.5, -1, 'dB', true)],
    build: function (ctx) {
      const s = shop(ctx);
      const c = s.comp();
      c.ratio.value = 20; c.knee.value = 0; c.attack.value = 0.001; c.release.value = 0.05;
      c.threshold.value = -1;
      return unit({ input: c, output: c, nodes: s.nodes, oscs: s.oscs, params: { ceiling: c.threshold } });
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
    params: [P('drive', 'Drive', 0, 100, 1, 30, '', false), MIX(1)],
    build: function (ctx, inst) {
      const s = shop(ctx);
      const input = s.gain(1), out = s.gain(1);
      let drive = initNum(inst, 'drive', 30, 0, 100);
      const sh = s.shaper(driveCurve(drive), '4x');
      const wd = wetDry(s, inst, 'mix', 1);
      input.connect(wd.dry).connect(out);
      input.connect(sh); sh.connect(wd.wet); wd.wet.connect(out);
      return unit({
        input: input, output: out, nodes: s.nodes, oscs: s.oscs,
        custom: {
          drive: function (v) { v = clamp(v, 0, 100); if (v !== drive) { drive = v; sh.curve = driveCurve(v); } },
          mix: wd.set,
        },
      });
    },
  }, {
    type: 'bitcrush', label: 'Bit Crush', category: 'char',
    params: [P('bits', 'Bits', 1, 16, 1, 6, '', false), MIX(1)],
    build: function (ctx, inst) {
      const s = shop(ctx);
      const input = s.gain(1), out = s.gain(1);
      let bits = initNum(inst, 'bits', 6, 1, 16);
      const sh = s.shaper(crushCurve(bits), 'none');   // oversampling would interpolate the steps back out
      const wd = wetDry(s, inst, 'mix', 1);
      input.connect(wd.dry).connect(out);
      input.connect(sh); sh.connect(wd.wet); wd.wet.connect(out);
      return unit({
        input: input, output: out, nodes: s.nodes, oscs: s.oscs,
        custom: {
          bits: function (v) { v = clamp(Math.round(v), 1, 16); if (v !== bits) { bits = v; sh.curve = crushCurve(v); } },
          mix: wd.set,
        },
      });
    },
  }, {
    type: 'lofi', label: 'Lo-Fi', category: 'char',
    params: [P('amount', 'Amount', 0, 1, 0.01, 0.6, '', false), MIX(1)],
    build: function (ctx, inst) {
      const s = shop(ctx);
      const input = s.gain(1), out = s.gain(1);
      let amount = initNum(inst, 'amount', 0.6, 0, 1);
      const hp = s.biquad('highpass', 20, 0.7);
      const lp = s.biquad('lowpass', 20000, 0.7);
      const sh = s.shaper(null, 'none');
      const wd = wetDry(s, inst, 'mix', 1);
      // One knob closes the band toward 500–4000 Hz while the curve adds crush and drive together.
      const shape = function (a) {
        hp.frequency.value = 20 + a * 480;
        lp.frequency.value = 20000 - a * 16000;
        sh.curve = lofiCurve(a);
      };
      shape(amount);
      input.connect(wd.dry).connect(out);
      input.connect(hp); hp.connect(lp); lp.connect(sh); sh.connect(wd.wet); wd.wet.connect(out);
      return unit({
        input: input, output: out, nodes: s.nodes, oscs: s.oscs,
        custom: {
          amount: function (v) { v = clamp(v, 0, 1); if (v !== amount) { amount = v; shape(v); } },
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
    build: function (ctx, inst) {
      const s = shop(ctx);
      const input = s.gain(1), out = s.gain(1);
      const wd = wetDry(s, inst, 'mix', 0.5);
      input.connect(wd.dry).connect(out);
      const d = s.delay(0.05); d.delayTime.value = 0.004;   // 1–7 ms sweep
      const lfo = s.lfo(0.3, { key: 'rate' });
      const amp = s.gain(0.6 * 0.003);
      lfo.connect(amp); amp.connect(d.delayTime);
      const fb = s.gain(0.5);
      input.connect(d);
      d.connect(fb).connect(d);
      d.connect(wd.wet); wd.wet.connect(out);
      return unit({
        input: input, output: out, nodes: s.nodes, oscs: s.oscs, lfos: s.lfos, params: { rate: lfo.playbackRate, feedback: fb.gain },
        custom: { depth: multi([[amp.gain, 0.003]]), mix: wd.set },
      });
    },
  }, {
    type: 'phaser', label: 'Phaser', category: 'char',
    params: [P('rate', 'Rate', 0.05, 5, 0.01, 0.5, 'Hz', true), P('depth', 'Depth', 0, 1, 0.01, 0.7, '', true), P('feedback', 'Feedback', 0, 0.9, 0.01, 0.4, '', true)],
    build: function (ctx) {
      const s = shop(ctx);
      const input = s.gain(1), out = s.gain(1);
      const dry = s.gain(0.5), wet = s.gain(0.5);   // the notches ARE dry + allpass summed — no mix knob
      input.connect(dry).connect(out);
      const lfo = s.lfo(0.5, { key: 'rate' });
      const bases = [200, 400, 800, 1600];
      const depthT = [];
      let first = null, prev = null;
      bases.forEach(function (b) {
        const ap = s.biquad('allpass', b, 1);
        const amp = s.gain(0.7 * b * 0.7);   // each stage sweeps in proportion to its own centre
        lfo.connect(amp); amp.connect(ap.frequency);
        if (prev) prev.connect(ap); else first = ap;
        prev = ap;
        depthT.push([amp.gain, b * 0.7]);
      });
      input.connect(first);
      prev.connect(wet); wet.connect(out);
      const fb = s.gain(0.4);
      const fbd = s.delay(0.02); fbd.delayTime.value = 0.001;   // Web Audio mutes a cycle with no DelayNode in it
      prev.connect(fb); fb.connect(fbd); fbd.connect(first);
      return unit({ input: input, output: out, nodes: s.nodes, oscs: s.oscs, lfos: s.lfos, params: { rate: lfo.playbackRate, feedback: fb.gain }, custom: { depth: multi(depthT) } });
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
      const lfo = s.lfo(220, { key: 'freq' });
      lfo.connect(ring.gain);
      const wd = wetDry(s, inst, 'mix', 1);
      input.connect(wd.dry).connect(out);
      input.connect(ring); ring.connect(wd.wet); wd.wet.connect(out);
      return unit({ input: input, output: out, nodes: s.nodes, oscs: s.oscs, lfos: s.lfos, params: { freq: lfo.playbackRate }, custom: { mix: wd.set } });
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
    params: [P('semitones', 'Semitones', -12, 12, 1, 0, 'st', false), MIX(1)],
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
      const shape = function (v) {
        const ratio = Math.pow(2, v / 12), up = ratio > 1;
        const D = Math.abs(1 - ratio) * G;   // one grain's worth of slide, so the ramp's slope IS 1 − ratio
        gA.delayTime.value = up ? D : 0; gB.delayTime.value = up ? D : 0;
        mA.gain.value = up ? -D : D; mB.gain.value = up ? -D : D;
        // At 0 st both lines carry the identical dry signal, and two equal-POWER windows over identical
        // signals sum to +3 dB, not unity. Hold line A wide open and mute line B instead — a real bypass.
        lA.gain.value = v ? 1 : 0; wA.gain.value = v ? 0 : 1;
        lB.gain.value = v ? 1 : 0;
      };
      shape(st);
      return unit({
        input: input, output: out, nodes: s.nodes, oscs: s.oscs, lfos: s.lfos,
        custom: {
          semitones: function (v) { v = Math.round(clamp(v, -12, 12)); if (v !== st) { st = v; shape(v); } },
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

  const CATEGORY_LABELS = { eq: 'EQ & Filter', space: 'Space & Stereo', dyn: 'Dynamics', char: 'Character' };
  const CATEGORY_ORDER = ['eq', 'space', 'dyn', 'char'];

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
