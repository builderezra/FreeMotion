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
  /* ═══ …AND WITH A SOFT KNEE (#482 polish 7.1, the Compressor's Auto makeup) ═════════════════════════════════════════
   * The same hidden gain for ANY knee: (1 / the curve's gain at 0 dBFS) ^ 0.6, where the curve is the spec engine's —
   * linear up to the threshold, then an exponential knee x ↦ T + (1 − e^(−k(x − T))) / k (linear units) whose k is found by
   * the engine's own 15-step search for the point where the knee's slope reaches 1/ratio, then the ratio's straight line.
   * Chromium's DynamicsCompressorKernel (KneeCurve / KAtSlope / Saturate) and WebKit's, the same code. Returned as the gain
   * that CANCELS it. With knee 0 it is exactly hardKneeMakeupCancel. At the Compressor's defaults (−24 dB, knee 30, 4:1)
   * the node lifts everything by 2.39 dB; at −40 dB, knee 6, 4:1 by 16.85 dB — that lift is "Auto makeup". */
  function makeupCancel(thresholdDb, kneeDb, ratio) {
    const lt = dbToLin(thresholdDb), slope = 1 / (ratio > 1 ? ratio : 1);
    const lin2db = x => 20 * Math.log10(x);
    const knee = (x, k) => (x < lt ? x : lt + (1 - Math.exp(-k * (x - lt))) / k);
    const slopeAt = (x, k) => { if (x < lt) return 1; const x2 = x * 1.001; return (lin2db(knee(x2, k)) - lin2db(knee(x, k))) / (lin2db(x2) - lin2db(x)); };
    const kneeEnd = dbToLin(thresholdDb + kneeDb);
    let lo = 0.1, hi = 10000, k = 5;
    for (let i = 0; i < 15; i++) { if (slopeAt(kneeEnd, k) < slope) hi = k; else lo = k; k = Math.sqrt(lo * hi); }
    const yEnd = lin2db(knee(kneeEnd, k));
    const full = 1 < kneeEnd ? knee(1, k) : dbToLin(yEnd + slope * (0 - (thresholdDb + kneeDb)));
    return Math.pow(full, 0.6);
  }
  FM._compMakeupCancel = makeupCancel;   // suite seam
  /* The level of the Limiter's safety clip under a ceiling of `ceilingDb`, as a linear gain (#482 batch 3 review; the
     reasons are at the Limiter). 1 dB above where its 20:1 line puts a full-scale sound (0.95·C), and never above full
     scale: exactly 0 dBFS at the default -1 dB ceiling. */
  function limHoldLin(ceilingDb) { return dbToLin(Math.min(0, (1 - 1 / 20) * Math.min(0, ceilingDb) + 1)); }
  /* How late a DynamicsCompressorNode's output is: floor(0.006 × rate) frames, never more than 1023 (the Compressor's note on
     its untouched path says how it was measured). The Compressor's dry copy and, since #482 polish 8.1, the Limiter's Mix
     wait this long, so a blend of the two lines up instead of combing. */
  function lookaheadSecs(ctx) { return Math.min(1023, Math.floor(0.006 * ctx.sampleRate)) / ctx.sampleRate; }
  // A WaveShaper that is the identity inside ±1 and holds ±1 outside it: a hard clip, no oversampling, no delay.
  const HARD_CLIP = new Float32Array([-1, 1]);
  /* ═══ HOW LATE AN OVERSAMPLED WAVESHAPER IS (#482 polish 8.1, the audio-reds hunt, 13 Oct) ═══════════════════════════
   * A WaveShaper oversampled '2x' or '4x' runs its curve between an up-sampler and a down-sampler, and both are linear-
   * phase FIR filters, so the shaped copy comes out a FIXED number of frames late, whatever the curve. MEASURED in the
   * suite's Chrome (HeadlessChrome 154, 48 kHz, an impulse through an identity curve at five positions): '2x' peaks 128
   * frames late and '4x' 192, at every position. That is Chromium's UpSampler / DownSampler (128- and 256-tap kernels,
   * each half counted at the rate it runs at; 4x is the 2x pair plus a second pair at twice the rate, which adds half its
   * own 128) — WebKit's, the same code; Firefox resamples its own way and is not measured. In FRAMES, so the same at every
   * sample rate; 'none' is not late at all.
   * A dry copy blended with an oversampled path has to wait these frames too, or the blend combs: a click comes out twice
   * and a steady sound is notched every 1 / (the gap) — every 375 Hz for 2x, every 250 Hz for 4x, at 48 kHz. The Limiter's
   * Mix (Clip at ceiling, mixOutput's dryLagWhile), Telephone's Mix (its 2x bite) and Distortion's Mix (its 4x curve and
   * its keyframed-Drive bank) all wait them. */
  const OVERSAMPLE_FRAMES = { none: 0, '2x': 128, '4x': 192 };
  function oversampleSecs(ctx, over) { return (OVERSAMPLE_FRAMES[over] || 0) / ctx.sampleRate; }
  // A dry copy held back by `secs`. The line is 0.1 s long so it holds 192 frames at any rate an engine allows (64 ms at 3 kHz).
  function dryLine(make, secs) { const n = make(0.1); n.delayTime.value = secs; return n; }
  // The Limiter's Clip at ceiling is oversampled this much: its build and its Mix's dry copy read the one value.
  const LIM_CLIP_OVER = '4x';

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
  /* ═══ DISTORTION'S TYPE (#482 polish 7.3) ═══════════════════════════════════════════════════════════════════════════
   * One curve, tanh, was the only distortion there was. Each Type is a transfer curve over −1…1 driven by the same
   * k = 0.35 × Drive, and `gain0` is its small-signal gain (its slope at 0) — what Auto level divides back out:
   *   0 Soft      tanh(kx) / tanh k                      — today's curve, the very same samples (driveCurve).
   *   1 Hard clip (1 + k)·x held at ±1                      — a flat top: brighter, harsher.
   *   2 Tube      tanh(kx + 0.2) − tanh 0.2, scaled       — leans to one side, so it adds the even harmonics (a warmer
   *               so its larger (negative) peak is 1        grit); a smooth curve, no kink at 0. Driven hard its top
   *                                                         half tops out at 0.67 of the bottom.
   *   3 Fuzz      1 − e^(−gx) above 0, −0.75·(…1.6×…) below, g = 1 + 3k — far harder, and lopsided.
   *   4 Wavefold  sin(π/2 · (1 + k/5) · x)                 — past full scale the wave folds back on itself (up to 4
   *               times at Drive 100): a metallic, bell-like edge rather than a clip.
   *   5 Rectify   |tanh(kx) / tanh k|                      — every negative half flipped up: the pitch an octave up.
   * Tube, Fuzz and Rectify are lopsided, so they also make a steady offset (DC); the build puts a 10 Hz highpass after
   * them (DIST_DC), and only after them, so Soft stays today's graph. Every curve is 4096 points like driveCurve, and a
   * curve is never mutated. */
  const DIST_TYPES = [[0, 'Soft'], [1, 'Hard clip'], [2, 'Tube'], [3, 'Fuzz'], [4, 'Wavefold'], [5, 'Rectify']];
  const DIST_DC = [false, false, true, true, false, true];
  const TUBE_B = 0.2;
  function distCurve(type, drive) {
    const k = clamp(drive, 0, 100) * 0.35;
    switch (type) {
      case 1: return curveFrom(x => clamp((1 + k) * x, -1, 1));
      case 2: {
        if (k < 1e-3) return curveFrom(x => x);
        const f = x => Math.tanh(k * x + TUBE_B) - Math.tanh(TUBE_B), n = Math.max(Math.abs(f(1)), Math.abs(f(-1)));
        return curveFrom(x => f(x) / n);
      }
      case 3: {
        const g = 1 + 3 * k, np = 1 - Math.exp(-g), nn = 1 - Math.exp(-1.6 * g);
        return curveFrom(x => (x >= 0 ? (1 - Math.exp(-g * x)) / np : -0.75 * (1 - Math.exp(1.6 * g * x)) / nn));
      }
      case 4: { const g = 1 + k / 5; return curveFrom(x => Math.sin(Math.PI / 2 * g * x)); }
      case 5: { if (k < 1e-3) return curveFrom(x => Math.abs(x)); const n = Math.tanh(k); return curveFrom(x => Math.abs(Math.tanh(k * x) / n)); }
      default: return driveCurve(drive);
    }
  }
  function distGain0(type, drive) {
    const k = clamp(drive, 0, 100) * 0.35;
    switch (type) {
      case 1: return 1 + k;
      case 2: { if (k < 1e-3) return 1; const t = Math.tanh(TUBE_B), n = Math.max(Math.abs(Math.tanh(k + TUBE_B) - t), Math.abs(Math.tanh(-k + TUBE_B) - t)); return k * (1 - t * t) / n; }
      case 3: { const g = 1 + 3 * k; return (g / (1 - Math.exp(-g)) + 0.75 * 1.6 * g / (1 - Math.exp(-1.6 * g))) / 2; }
      case 4: return Math.PI / 2 * (1 + k / 5);
      default: return k < 1e-3 ? 1 : k / Math.tanh(k);   // Soft, and Rectify (the curve it flips)
    }
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
  /* Telephone's Grit (#482 polish 7.4): the same curve with k = 0.06 × Grit, so Grit 30 IS the bite above (and returns that
     very array: 30 × 6 / 100 is exactly 1.8, but the build must not depend on it). 0 is a straight line. */
  function gritCurve(grit) {
    const g = clamp(grit, 0, 100);
    if (g === 30) return BITE;
    const k = g * 6 / 100;
    if (k < 1e-3) return curveFrom(x => x);
    const n = Math.tanh(k);
    return curveFrom(x => Math.tanh(k * x) / n);
  }
  /* Telephone's Squelch (#1154, the PM's call on sheet 1's "the Walkie-talkie squelch isn't built — wanted?"): a gate on the
     voice's level, built from plain nodes so the preview and an export run the same graph. RECT folds the voice to its size
     (|x|; an odd length, so silence lands exactly on the middle sample), a lowpass smooths that into a level, SQUELCH_PUSH
     lifts it into the part of KNEE that has the resolution, and KNEE turns the level into the line's gain: shut under about
     −48 dBFS of average level, open over about −38, a smooth step between so the edges do not click. */
  const SQUELCH_RECT = curveFrom(x => Math.abs(x), 4097);
  const SQUELCH_PUSH = 32;
  const SQUELCH_KNEE = curveFrom(x => { const u = clamp((x - 0.128) / (0.384 - 0.128), 0, 1); return u * u * (3 - 2 * u); }, 1025);
  /* Seeded white noise for an effect's hiss (#482 polish 7.4, Telephone's Noise), one buffer per (length, seed, rate),
     looped and started at the scene time's place in it (shop.noise), so the preview and every export hear the same hiss. */
  const _noiseCache = {};
  function noiseBuffer(ctx, secs, seed) {
    const sr = ctx.sampleRate, key = secs + '|' + seed + '|' + sr;
    if (_noiseCache[key]) return _noiseCache[key];
    const len = Math.max(2, Math.round(sr * secs)), buf = ctx.createBuffer(1, len, sr), d = buf.getChannelData(0), r = rng(seed);
    for (let i = 0; i < len; i++) d[i] = r() * 2 - 1;
    return (_noiseCache[key] = buf);
  }
  /* ═══ TAPE HISS AND RECORD CRACKLE (#482 polish 9.5, Lo-Fi) ══════════════════════════════════════════════════════════
   * Two more seeded loops for shop.bed, one buffer per (length, seed, rate) like the noise above, so the preview and every
   * export hear the same hiss and the same ticks at the same scene moment.
   * PINK, NOT WHITE: tape hiss has as much energy in each octave, so white noise (Telephone's) sounds like steam. White
   * noise goes through Paul Kellet's pink filter TWICE round the buffer: the first lap only settles the filter's memory,
   * the second writes, so the last sample leads into the first exactly as any two neighbours do and the loop has no seam.
   * Scaled to an RMS of PINK_RMS (peaks near 1). The build high-passes it at 2 kHz, so what is heard is the hiss's top.
   * CRACKLE: CRACKLE_PER_SEC short ticks a second, each a 0.2–1.5 ms burst of noise that dies away, at a seeded moment and
   * level — most faint, a few loud (0.08 + 0.92·u⁴) — written round the end of the buffer (modulo its length), so a tick
   * that straddles the loop point plays whole. Peak-normalised to 1. Both numbers are reasoned, not heard. */
  const PINK_RMS = 0.25, CRACKLE_PER_SEC = 12;
  const _bedCache = {};
  function pinkBuffer(ctx, secs, seed) {
    const sr = ctx.sampleRate, key = 'pink|' + secs + '|' + seed + '|' + sr;
    if (_bedCache[key]) return _bedCache[key];
    const len = Math.max(2, Math.round(sr * secs)), buf = ctx.createBuffer(1, len, sr), d = buf.getChannelData(0), r = rng(seed);
    const w = new Float64Array(len), y = new Float64Array(len);
    for (let i = 0; i < len; i++) w[i] = r() * 2 - 1;
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0, e = 0;
    for (let lap = 0; lap < 2; lap++) {
      for (let i = 0; i < len; i++) {
        const x = w[i];
        b0 = 0.99886 * b0 + x * 0.0555179; b1 = 0.99332 * b1 + x * 0.0750759; b2 = 0.969 * b2 + x * 0.153852;
        b3 = 0.8665 * b3 + x * 0.3104856; b4 = 0.55 * b4 + x * 0.5329522; b5 = -0.7616 * b5 - x * 0.016898;
        const p = b0 + b1 + b2 + b3 + b4 + b5 + b6 + x * 0.5362;
        b6 = x * 0.115926;
        if (lap) { y[i] = p; e += p * p; }
      }
    }
    const k = PINK_RMS / Math.sqrt(Math.max(1e-30, e / len));
    for (let i = 0; i < len; i++) d[i] = y[i] * k;
    return (_bedCache[key] = buf);
  }
  function crackleBuffer(ctx, secs, seed) {
    const sr = ctx.sampleRate, key = 'crackle|' + secs + '|' + seed + '|' + sr;
    if (_bedCache[key]) return _bedCache[key];
    const len = Math.max(2, Math.round(sr * secs)), buf = ctx.createBuffer(1, len, sr), d = buf.getChannelData(0), r = rng(seed);
    const acc = new Float64Array(len), n = Math.max(1, Math.round(secs * CRACKLE_PER_SEC));
    for (let k = 0; k < n; k++) {
      const at = Math.floor(r() * len), dur = Math.max(2, Math.round(sr * (0.0002 + 0.0013 * r()))), u = r();
      const lvl = 0.08 + 0.92 * u * u * u * u;
      for (let i = 0; i < dur; i++) acc[(at + i) % len] += lvl * (r() * 2 - 1) * Math.exp(-5 * i / dur);
    }
    let pk = 0;
    for (let i = 0; i < len; i++) pk = Math.max(pk, Math.abs(acc[i]));
    const g = pk > 0 ? 1 / pk : 0;
    for (let i = 0; i < len; i++) d[i] = acc[i] * g;
    return (_bedCache[key] = buf);
  }

  /* ---- reverb impulse ---- */
  // Deterministic noise: a Math.random IR would differ between the preview build and the export build,
  // so the same project would render a reverb tail it never played. Seeded per (size, decay, rate).
  function rng(seed) {
    let a = seed >>> 0;
    return function () { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), 1 | t); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  }
  const _irCache = {};   // "size|decay|rate" (+ "|damping" above 0, #482 9.8) -> AudioBuffer, so scrubbing Mix never regenerates noise
  /* The one warning label in this file, and it is his (the per-effect-slider entry): *"if audio key
     frames break the project and lag too much just put a warning next to it before use"*. It is shown
     only when Size or Decay is ACTUALLY animated, because a warning that is always on is wallpaper.
     Plain language on purpose — this is written for Ezra to read, not for a developer. */
  const AFX_REVERB_KF_WARN = 'Heads up: animating the room is the expensive one. Every different room has to be built and played at once, so a long tail that moves a lot can slow an export down and may stutter while you preview it. Short moves and short tails are cheap.';

  /* ═══ DAMPING (#482 polish 9.8) ═══════════════════════════════════════════════════════════════════════════════════════
   * A real room swallows the highs of its tail faster than its lows (air, curtains, people), so a reverb darkens as it
   * dies; this one stayed as bright at the end as at the start. Damping bakes that into the room as it is made: a one-pole
   * lowpass run along each channel of the IR, its corner sliding in log frequency from 4 × the sample rate — far above
   * Nyquist, so the head is left as it was — towards DAMP_HZ at the end: fc(x) = DAMP_HZ^(d·x) · (4·sr)^(1 − d·x), x the
   * place in the IR (0…1), d the Damping. At 1 the tail ends at 600 Hz; at 0.5 near 10.7 kHz (48 kHz). The same noise is
   * filtered, so only the colour moves. Damping 0 (or none: Auto-Pan's Realism room) never runs it and keeps the old cache
   * key, so it is the very IR it always was. Static only (the backlog): a room is an AudioBuffer, and an animated one
   * would multiply the animated-room bank (see the Reverb). */
  const DAMP_HZ = 600;
  function dampIR(d, sr, dmp) {
    const len = d.length, top = Math.log(4 * sr), bot = Math.log(DAMP_HZ);
    let y = 0;
    for (let i = 0; i < len; i++) {
      const u = dmp * i / len, a = 1 - Math.exp(-2 * Math.PI * Math.exp(bot * u + top * (1 - u)) / sr);
      y += a * (d[i] - y);
      d[i] = y;
    }
  }
  function impulse(ctx, size, decay, damping) {
    const sr = ctx.sampleRate, dmp = damping > 0 ? Math.min(1, damping) : 0;
    const key = size.toFixed(3) + '|' + decay.toFixed(3) + '|' + sr + (dmp > 0 ? '|' + dmp.toFixed(3) : '');
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
      if (dmp > 0) dampIR(d, sr, dmp);
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
  /* THE SHAPES (#482 polish 7.2): what the six modulation effects swing by besides a sine. Each runs −1…1, and all but
     Random start where the sine does — 0 at phase 0, rising, at the top a quarter of the way in (the saws half way) — so a
     change of Shape keeps the swing's timing and only changes its form. NOTHING JUMPS IN ONE SAMPLE, because a jump in a delay time (Vibrato, Chorus,
     Flanger) is a click: Square is tanh(6·sin)/tanh 6 (backlog 7.2), whose edges take about 8 % of a cycle; a Saw falls
     back across 2 % of the cycle (SAW_FALL) instead of resetting at once; Random's eight seeded steps each glide in over the
     first fifth of the step. Random is the same eight every time, so the preview and every export hear the same pattern. */
  const RND8 = (function () { const r = rng(0x5eed8); const v = []; for (let i = 0; i < 8; i++) v.push(r() * 2 - 1); return v; })();
  const SAW_FALL = 0.02;
  function sawUp(p) {
    const u = (p + 0.5) - Math.floor(p + 0.5) - 0.5, edge = 0.5 - SAW_FALL / 2;   // u: −½…½, 0 at phase 0
    if (u >= -edge && u <= edge) return u / edge;                                  // the rise, through 0 at phase 0
    const d = u > edge ? u - edge : u + 0.5 + SAW_FALL / 2;                       // 0…SAW_FALL into the fall
    return 1 - 2 * d / SAW_FALL;
  }
  const LFO_WAVE = {
    sine: p => Math.sin(2 * Math.PI * p),
    ramp: p => p,
    win: p => Math.sin(Math.PI * p),   // w(p)² + w(p+½)² = 1, and exactly 0 where `ramp` resets
    tri: p => (p < 0.25 ? 4 * p : (p < 0.75 ? 2 - 4 * p : 4 * p - 4)),
    square: p => Math.tanh(6 * Math.sin(2 * Math.PI * p)) / Math.tanh(6),
    sawup: sawUp,
    sawdown: p => -sawUp(p),
    random: p => {
      const x = p * 8, j = Math.min(7, Math.floor(x)), f = x - j, prev = RND8[(j + 7) % 8];
      return f < 0.2 ? prev + (RND8[j] - prev) * (0.5 - 0.5 * Math.cos(Math.PI * f / 0.2)) : RND8[j];
    },
  };
  /* HOW FAR BEHIND (#482 polish 8.6, Auto-Pan's Realism). `back:<shape>` turns a pan swing into how far behind the listener
     the sound is: started a quarter of a cycle on, it reads the swing's other axis — for a sine pan sin(2πp) that is
     −cos(2πp), 0 straight ahead, 1 straight behind — and doubles and clips it to 0…1, so the sound is fully "behind" from a
     third of the way round to two thirds and untouched across the front half. */
  function waveFn(name) {
    if (name.indexOf('back:') !== 0) return LFO_WAVE[name];
    const f = LFO_WAVE[name.slice(5)] || LFO_WAVE.sine;
    return p => Math.min(1, Math.max(0, -2 * f(p)));
  }
  const _lfoCache = {};   // "wave|secs|rate" -> AudioBuffer, shared by every LFO of a kind in a context
  function lfoBuffer(ctx, wave, secs) {
    const sr = ctx.sampleRate;
    const key = wave + '|' + secs.toFixed(4) + '|' + sr;
    if (_lfoCache[key]) return _lfoCache[key];
    const len = Math.max(2, Math.round(sr * secs));
    const buf = ctx.createBuffer(1, len, sr);
    const d = buf.getChannelData(0), fn = waveFn(wave);
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
        // spec.hzOf(rateFor): the rate when it is not simply a param's value — a rate synced to a tempo (#482 8.7).
        lfos.push({ n: n, hz: hz, key: spec.key || null, mul: spec.mul || 1, phase: spec.phase || 0, hzOf: spec.hzOf || null });
        return n;
      },
      // A looping seeded noise (#482 7.4). Armed like an LFO of one cycle per `secs`, so it starts at the place in the
      // buffer that scene time implies: the hiss an export from 1:00 hears is the hiss the whole render has there.
      noise: function (secs, seed) {
        const n = ctx.createBufferSource();
        n.buffer = noiseBuffer(ctx, secs, seed);
        n.loop = true;
        nodes.push(n); oscs.push(n);
        lfos.push({ n: n, hz: 1 / n.buffer.duration, key: null, mul: 1, phase: 0 });
        return n;
      },
      // Any looping seeded buffer (#482 9.5, Lo-Fi's Hiss and Crackle), armed exactly as noise() is: on scene time.
      bed: function (buf) {
        const n = ctx.createBufferSource();
        n.buffer = buf;
        n.loop = true;
        nodes.push(n); oscs.push(n);
        lfos.push({ n: n, hz: 1 / buf.duration, key: null, mul: 1, phase: 0 });
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
      /* What a live meter reads (#482 polish 3.7: the Compressor's gain-reduction bar), or null: { node } — the
         DynamicsCompressorNode — plus, when the effect blends its result with the untouched sound, the { dry, wet }
         gain params of that blend, so the meter can show what is HEARD (audioFxLive.reductionOf). Read only by the
         preview (buildAudioFxChain's meterOf); an export never looks at it. */
      meter: o.meter || null,
      // Non-null ONLY when set(key, v) is exactly param(key).setValueAtTime(v) — a caller that schedules
      // onto a returned param must not be able to desync a pair (mix) or skip a conversion (gain's dB).
      param: function (key) { return (aps[key] && !xf[key]) ? aps[key] : null; },
      /* `sceneT` is the scene time the value was read at (#482 3.5). Every caller in this file passes it; only a custom
         setter that folds TWO keys into one set of params needs it — Pitch Shift's Semitones and Fine tune, where the
         key that drives has to read the other one at the same moment. Every other setter ignores it. */
      set: function (key, v, when, sceneT) {
        const ap = aps[key];
        if (ap) { ap.setValueAtTime(xf[key] ? xf[key](v) : v, when); return; }
        if (custom[key]) custom[key](v, when, false, sceneT);
      },
      ramp: function (key, v, when, sceneT) {
        const ap = aps[key];
        if (ap) { ap.linearRampToValueAtTime(xf[key] ? xf[key](v) : v, when); return; }
        if (custom[key]) custom[key](v, when, true, sceneT);
      },
      // Start every LFO at the phase that scene time implies: phase = frac(rate × scene), so scene 0 is
      // phase 0 in every context and the export renders the sweep the preview played. A KEYFRAMED rate
      // makes that ill-defined (phase would be the integral of rate, not rate × t) — anchor on the rate
      // at sceneAtStart and let it drift from there; that is the price of a keyframed rate.
      arm: function (sceneAtStart, rateFor) {
        const list = o.lfos || [];
        for (let i = 0; i < list.length; i++) {
          const l = list[i];
          const hz = l.hzOf ? l.hzOf(rateFor) * l.mul : (l.key ? rateFor(l.key) * l.mul : l.hz);
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
  // through param(). Each entry is [param, factor] where factor is a number, a fn(v), or null (= v) —
  // or a whole setter fn(v, when, ramp) that schedules its own params (a bypass pair's switch, below).
  function multi(list) {
    return function (v, when, ramp) {
      for (let i = 0; i < list.length; i++) {
        if (typeof list[i] === 'function') { list[i](v, when, ramp); continue; }
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
   * Leaving the default flips the pair (a live move fades it over 20 ms, see pairTargets; a keyframe ramps it, a
   * 33 ms crossfade), and the value itself rides the node's own AudioParam, so a slider drag never rebuilds anything.
   * `nodeIn`/`nodeOut` may be one node (a filter) or the two ends of a little graph (Width's mid/side). */
  function bypassPair(s, from, nodeIn, nodeOut, on) {
    const gOn = s.gain(on ? 1 : 0), gOff = s.gain(on ? 0 : 1), sum = s.gain(1);
    from.connect(nodeIn); nodeOut.connect(gOn); gOn.connect(sum);
    from.connect(gOff); gOff.connect(sum);
    return { out: sum, gOn: gOn, gOff: gOff };
  }
  /* The pair's switch as a `multi` target, flipped by one test of the control's value.
   * A LIVE FLIP FADES (482 batch 3 review). The preview drives every key through set() once a frame, and a
   * set that stepped the pair switched the output in ONE SAMPLE from x to the filtered copy — a 25 Hz highpass
   * shifts the bass's phase, so Low cut 20 → 25 on the Echo jumped ~0.03–0.10 in a sample (measured), 250–500×
   * an ordinary notch. That is a click, and the export never made it: a keyframe ramps the pair over its 33 ms
   * step. So a set that CHANGES the state fades the pair over PAIR_FADE from wherever it is, and the next
   * frames' sets leave that fade alone until it lands (a fresh setValueAtTime inside a running ramp would cut it
   * short — the ramp would restart from the new event and step there).
   * The FIRST set a chain gets is its starting state, not a move — the export's set at ctx time 0 and the
   * preview's applyAt straight after a build — so it still steps, before any sound has gone through the pair,
   * and every default and every export renders the very samples it did. ramp (the export's keyframes) is
   * untouched. */
  const PAIR_FADE = 0.02;
  function pairTargets(pair, isOn) {
    const on = pair.gOn.gain, off = pair.gOff.gain;
    let target = null, from = 0, t0 = 0, t1 = 0;   // gOn's schedule: from at t0 → target at t1 (gOff = 1 − it)
    return [function (v, when, ramp) {
      const x = isOn(v) ? 1 : 0;
      if (ramp || target === null || (x === target && when >= t1)) {
        if (ramp) { on.linearRampToValueAtTime(x, when); off.linearRampToValueAtTime(1 - x, when); }
        else { on.setValueAtTime(x, when); off.setValueAtTime(1 - x, when); }
        target = from = x; t0 = t1 = when;
        return;
      }
      if (x === target) return;                     // still fading towards x: let it land
      const cur = when >= t1 ? target : from + (target - from) * (when - t0) / (t1 - t0);
      on.cancelScheduledValues(when); off.cancelScheduledValues(when);
      on.setValueAtTime(cur, when); off.setValueAtTime(1 - cur, when);
      on.linearRampToValueAtTime(x, when + PAIR_FADE); off.linearRampToValueAtTime(1 - x, when + PAIR_FADE);
      from = cur; target = x; t0 = when; t1 = when + PAIR_FADE;
    }];
  }
  /* A lowpass/highpass with no peak: Q −3.01 dB is Butterworth (the spec reads a lowpass/highpass Q as dB of
     resonance), so the response never rises above 1 anywhere. That matters inside an echo's feedback loop: a
     filter with a +1.25 dB bump (the node's own default Q of 1) at Feedback 0.9 is a loop gain of 1.04 at the
     bump, and the repeats would grow into a howl instead of dying away. */
  const BUTTERWORTH_DB = 20 * Math.log10(Math.SQRT1_2);
  /* Mid/side width on a stereo signal (Reverb's Width, #482 3.4; Ping-Pong's, 8.3): L = M + w·S, R = M − w·S. The M/S sum is
     NOT exact at w = 1 in floats ((L+R)/2 + (L−R)/2 can land an ulp off L), so a caller switches it in with a bypass pair.
     The splitter is discrete, so the input is up-mixed to two channels first, as the Stereo Width effect does. */
  function msWidth(s, w0) {
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
    return { input: msIn, output: merge, w: wG };
  }
  // A value written at once or ramped to, onto one AudioParam (a setter that works one out from several keys).
  function put(ap, x, when, ramp) { if (ramp) ap.linearRampToValueAtTime(x, when); else ap.setValueAtTime(x, when); }

  /* A FEEDBACK LOOP, UNROLLED (queue 986, hunts C16/C17). A loop's k-th time round is weighted fb^(k−1); these
     are the factors `multi` schedules onto the taps, and how many trips round each effect keeps (see Flanger and
     Phaser for what the rest of the tail is worth). */
  const FLANGE_TAPS = 16, PHASE_PASSES = 6;
  // The Flanger's Manual (#482 9.6) where its swing is today's ±3 ms × Depth: 4 ms, the centre it always had.
  const FLANGE_MANUAL = 4;
  /* Chorus Feedback (#482 7.8), unrolled the same way: 8 passes, so at its 0.6 maximum what is left out is 0.6^8 (1.7 %,
     −35 dB). */
  const CHORUS_TAPS = 8;
  /* Auto-Pan's Realism (#482 8.6): fully behind, the two lowpasses sit log2(20000 / 4000) octaves under 20 kHz (2786 cents),
     and the room is mixed in at Realism × 0.15. */
  const AUTOPAN_BEHIND_CENTS = 1200 * Math.log2(20000 / 4000), AUTOPAN_ROOM = 0.15;
  /* Lo-Fi's tape (#482 9.5, the backlog's numbers): Wow and Flutter as [Hz, swing in seconds] — at 1 the pitch drifts by
     ±0.79 % (Wow, 2π·0.5·2.5 ms) and shivers by ±1.26 % (Flutter, 2π·8·0.25 ms); Hiss and Crackle as the gain each gets at 1.
     Reasoned, not heard. */
  const LOFI_WOW = [0.5, 0.0025], LOFI_FLUTTER = [8, 0.00025], LOFI_HISS = 0.2, LOFI_CRACKLE = 0.3;
  /* Whether a control is in use at all — above 0, or keyframed (#482 7.8, rebuildIf): a Chorus builds its stereo Spread path
     only then, and an Auto-Pan its Realism (8.6). */
  function inUse(raw) { return (FM.isAnimated(raw) || (typeof raw === 'number' && raw > 0)) ? 1 : 0; }
  function powOf(k) { return function (v) { return Math.pow(v, k); }; }

  // A param's value at scene time t, guarded at every step: a missing/NaN/animated-object read falls back
  // to the default. NaN reaching an AudioParam throws and takes the whole chain down with it.
  /* …to `legacy` where the param declares one (#482 polish 7.1): the value a saved effect that lacks the key is played
     at, which the load sanitiser fills in the same way (storage.js sanitizeAudioFx). A choice reads as the nearest of its
     options and an on/off as 0 or 1, so a file carrying 1.4 or a slope of 30 plays as something the panel can show. */
  function valueAt(inst, p, t) {
    const raw = inst && inst.params ? inst.params[p.key] : undefined;
    let v = FM.isAnimated(raw) ? FM.evalProp(raw, t) : raw;
    if (typeof v !== 'number' || !isFinite(v)) v = p.legacy !== undefined ? p.legacy : p.def;
    v = clamp(v, p.min, p.max);
    if (p.options) {
      let best = p.options[0][0];
      for (let i = 1; i < p.options.length; i++) if (Math.abs(p.options[i][0] - v) < Math.abs(best - v)) best = p.options[i][0];
      return best;
    }
    if (p.toggle) return v >= 0.5 ? 1 : 0;
    return v;
  }
  /* The build-time value of a control that is not keyframable (a choice, an on/off, a `rebuild` slider), read exactly as
     the chain reads it (valueAt). REG is filled below; builds only ever run after it is. */
  function staticOf(inst, type, key) {
    const ps = (REG[type] && REG[type].params) || [];
    for (let i = 0; i < ps.length; i++) if (ps[i].key === key) return valueAt(inst, ps[i], 0);
    return 0;
  }
  // The registry entry of one param, for a setter that has to read another key at the same scene moment.
  function paramOf(type, key) { return ((REG[type] && REG[type].params) || []).filter(p => p.key === key)[0]; }
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
  /* ═══ A CHOICE, OR AN ON/OFF, IN AN AUDIO EFFECT (#482 polish 7.1 — the enabler the rest of batch 7 needs) ═══════════
   * Every audio control was a slider (inspector.js afxParam made each one a range), so "Sine or Square", "12 or 48 dB",
   * "Soft or Hard clip" had nowhere to live. Both new kinds are stored as plain whole numbers, like every other audio
   * value: a choice is the value of the option picked (options: [[value, label], …]) and an on/off is 0 or 1. So a saved
   * file and the load sanitiser see nothing new — min and max are the range of the option values — and neither can be
   * keyframed (a glide halfway between Sine and Square means nothing). The panel draws a choice with the visual effects'
   * own segmented control (inspector.js fxSegment) and an on/off with their tick box (fxToggle): one implementation each.
   * `rebuild: true` marks a control that changes the GRAPH rather than a value on it (which curve, how many voices). The
   * live preview rebuilds a chain only when its signature moves (audio-fx-live.js signature), and these values are now
   * part of it (audioFxRegistry.rebuildKey); everything else still rides applyAt, so a slider drag never rebuilds.
   * `legacy` (any kind) is what a saved effect that LACKS the key is played at, where that differs from what a new one
   * starts at (`def`): the sanitiser fills the key with it and valueAt reads it — the visual effects' rule. */
  function CHOICE(key, label, options, def, o) {
    const vals = options.map(x => x[0]);
    return Object.assign({ key: key, label: label, min: Math.min.apply(null, vals), max: Math.max.apply(null, vals), step: 1, def: def, unit: '', keyframable: false, options: options }, o || {});
  }
  function TOGGLE(key, label, def, o) {
    return Object.assign({ key: key, label: label, min: 0, max: 1, step: 1, def: def, unit: '', keyframable: false, toggle: true }, o || {});
  }
  /* ═══ THE SWING'S SHAPE (#482 polish 7.2) ═════════════════════════════════════════════════════════════════════════════
   * Tremolo, Auto-Pan, Vibrato, Chorus, Flanger and Phaser could only swing in a sine. Shape picks the LFO's wave (LFO_WAVE):
   * a Triangle sweeps at an even speed, a Square jumps between two states (a choppy tremolo, a pan that snaps side to side),
   * a Saw rises (or falls) and resets, Random wanders between eight steps. A rebuild — the wave is the LFO's buffer — and
   * Sine (0, the default and every saved effect) builds the very buffer it always did, so nothing already made changes. */
  const LFO_SHAPES = [[0, 'Sine'], [1, 'Triangle'], [2, 'Square'], [3, 'Saw up'], [4, 'Saw down'], [5, 'Random']];
  const SHAPE_WAVES = ['sine', 'tri', 'square', 'sawup', 'sawdown', 'random'];
  const SHAPE = () => CHOICE('shape', 'Shape', LFO_SHAPES, 0, { rebuild: true });
  function waveOf(inst, type) { return SHAPE_WAVES[staticOf(inst, type, 'shape')] || 'sine'; }
  const MIX = def => P('mix', 'Mix', 0, 1, 0.01, def, '', true);
  /* ═══ TEMPO SYNC (#482 polish 8.7) ══════════════════════════════════════════════════════════════════════════════════════
   * An echo that repeats on the beat, a tremolo that pulses in time: Tempo (BPM, 0 = off) and Note set the Echo's and the
   * Ping-Pong's Time, and the Tremolo's and the Auto-Pan's Rate, as (60 / BPM) × 4 × the note's share of a whole note
   * (one bar of four beats), a rate being one swing per that time — 120 BPM, 1/8 is 0.25 s, or 4 Hz. While Tempo is on,
   * Time / Rate is not used and says so; the panel shows what the note works out to under the Note buttons (`readout`),
   * kept to the control's own range (an Echo stops at 2 s). Not keyframable (the backlog: static only) and not a rebuild:
   * the synced value rides the same AudioParam the slider drives, so a drag never rebuilds, and an LFO's starting phase
   * reads the synced rate (shop.lfo hzOf), so the beat lands where scene time says, export and preview alike. Tempo 0 (the
   * default, and every saved effect) is today's Time / Rate. Any Tempo above 0 syncs, and the panel only offers 40–240. */
  const NOTES = [[0, '1/1'], [1, '1/2'], [2, '1/4'], [3, '1/8'], [4, '1/8·'], [5, '1/8T'], [6, '1/16']];
  const NOTE_OF_BAR = [1, 1 / 2, 1 / 4, 1 / 8, 3 / 16, 1 / 12, 1 / 16];   // 1/8· dotted, 1/8T a triplet
  /* Tempo is 0 (Off) or 40–240 (batch 8 review): `offUntil` makes the panel say Off at 0 and never rest in 1–39 — a value
     moved into that gap lands on 40 coming up (or typed) and on Off coming down (inspector.js offGapSnap). */
  const TEMPO_MIN = 40;
  // The synced time in seconds, or null while Tempo is off. A file carrying 1–39 (the panel cannot) plays it at 40.
  function syncSecs(inst, type) {
    const bpm = staticOf(inst, type, 'bpm');
    return bpm > 0 ? (60 / Math.max(TEMPO_MIN, bpm)) * 4 * NOTE_OF_BAR[staticOf(inst, type, 'note')] : null;
  }
  /* Tempo and Note for an effect whose `key` is a time ('s', lo…hi seconds) or a rate ('Hz'). The Note row carries the
     readout the panel shows under it; Time / Rate is marked as switched off while Tempo is on. */
  function TEMPO(type, key, lo, hi) {
    const rate = key === 'rate';
    const readout = function (inst) {
      const s = syncSecs(inst, type);
      if (s == null) return '';
      const raw = rate ? 1 / s : s, v = clamp(raw, lo, hi), lim = Math.abs(v - raw) > 1e-9 ? ' (as far as it goes)' : '';
      return '= ' + (rate ? v.toFixed(2) + ' Hz' : (v < 1 ? Math.round(v * 1000) + ' ms' : v.toFixed(2) + ' s')) + lim;
    };
    return [Object.assign(P('bpm', 'Tempo', 0, 240, 1, 0, 'BPM', false), { offUntil: TEMPO_MIN }),
      CHOICE('note', 'Note', NOTES, 2, { overriddenBy: 'bpm', deadAt: 0, deadAtText: 'Off', readout: readout, readoutBy: ['bpm'] })];
  }
  const SYNCED = p => Object.assign(p, { overriddenBy: 'bpm', liveWhen: 0, liveWhenText: 'Off' });
  /* The setters of a synced key and of Tempo and Note: each works out the value from all three read at the same scene
     moment (the Compressor's Auto makeup rule) and hands it to write(value, when, ramp, sceneT). `now(sceneT)` is that
     value, for a setter of another key that needs it (Ping-Pong's Right-side timing). */
  function tempoSync(inst, type, key, lo, hi, write) {
    const pd = paramOf(type, key), rate = key === 'rate';
    const now = function (sceneT, own) {
      const s = syncSecs(inst, type);
      if (s != null) return clamp(rate ? 1 / s : s, lo, hi);
      return own !== undefined ? own : valueAt(inst, pd, isFinite(sceneT) ? sceneT : 0);
    };
    const o = { now: now, hzOf: rf => { const s = syncSecs(inst, type); return s != null ? clamp(1 / s, lo, hi) : rf(key); } };
    o[key] = function (v, when, ramp, sceneT) { write(now(sceneT, v), when, ramp, sceneT); };
    o.bpm = o.note = function (v, when, ramp, sceneT) { write(now(sceneT), when, ramp, sceneT); };
    return o;
  }
  /* A CONTROL THAT DOES NOTHING WHILE ANOTHER IS AT 0 SAYS SO (#482 3.6 review). A shelf's or a band's corner moves a
     boost or a cut, and at 0 dB there is none: a Bass & Treble whose Bass at is dragged with Bass at 0 plays the clip
     bit for bit (measured on noise through the export chain) — and 0 dB is the default of every new and every saved
     one. The panel greys the row and says "Not used when Bass is 0", the rule the visual effects already follow
     (inspector.js markOverridden). `deadAt` is judged over every keyframe, like liveAbove: one keyframe off 0 wakes it. */
  const DEAD0 = (p, by) => Object.assign(p, { overriddenBy: by, deadAt: 0 });

  const DEFS = [];

  /* ---- EQ & Filter ---- */
  // The four plain filters differ only in biquad type and ranges.
  /* ═══ SLOPE (#482 polish 7.5) ═══════════════════════════════════════════════════════════════════════════════════════
   * Each was one biquad: a Low-/High-Pass falls 12 dB an octave past its corner, so "cut everything over 1 kHz" still let
   * 4 kHz through only 24 dB down. Slope stacks 1–4 biquads on the same Frequency (a rebuild; the value is the dB per
   * octave, 12 a stage). For Low-/High-Pass the inner stages carry the Butterworth Qs of the whole order — the flat,
   * peak-free ones (bwStageDb) — and the LAST carries the Resonance slider, so the corner's bump is still his to set; at 48
   * dB a 1 kHz Low-Pass has 4 kHz about 98 dB down by the spec's biquad formulas (24.5 at 12). A Band-Pass or Notch stacks the same filter on itself:
   * steeper skirts, a wider and deeper notch (its buttons say how steep in words — a band's skirts are not 12 dB/oct).
   * 12 (the default, and every saved filter) is today's single biquad, the very node it always was. */
  const SLOPES_DB = [[12, '12 dB'], [24, '24 dB'], [36, '36 dB'], [48, '48 dB']];
  const SLOPES_WORDS = [[12, 'Gentle'], [24, 'Steep'], [36, 'Steeper'], [48, 'Steepest']];
  // The Butterworth stage Qs of a 2N-order low/high-pass, lowest first, in the dB a lowpass/highpass biquad's Q is read in.
  function bwStageDb(N) {
    const out = [];
    for (let k = 1; k <= N; k++) out.push(20 * Math.log10(1 / (2 * Math.cos((2 * k - 1) * Math.PI / (4 * N)))));
    return out;
  }
  function filterDef(type, label, biq, fMin, fMax, fDef, qMin, qMax, qDef) {
    const lphp = biq === 'lowpass' || biq === 'highpass';
    return {
      type: type, label: label, category: 'eq',
      params: [P('freq', 'Frequency', fMin, fMax, 1, fDef, 'Hz', true), P('q', 'Resonance', qMin, qMax, 0.1, qDef, '', true),
        CHOICE('slope', 'Slope', lphp ? SLOPES_DB : SLOPES_WORDS, 12, { rebuild: true })],
      build: function (ctx, inst) {
        const s = shop(ctx);
        const N = Math.max(1, Math.round(staticOf(inst, type, 'slope') / 12));
        if (N === 1) {
          const n = s.biquad(biq, fDef, qDef);
          return unit({ input: n, output: n, nodes: s.nodes, oscs: s.oscs, params: { freq: n.frequency, q: n.Q } });
        }
        const bw = bwStageDb(N), st = [];
        for (let i = 0; i < N; i++) st.push(s.biquad(biq, fDef, (lphp && i < N - 1) ? bw[i] : qDef));
        for (let i = 1; i < N; i++) st[i - 1].connect(st[i]);
        const qOf = lphp ? [st[N - 1]] : st;   // the stages the Resonance slider drives
        return unit({ input: st[0], output: st[N - 1], nodes: s.nodes, oscs: s.oscs,
          custom: { freq: multi(st.map(n => [n.frequency, null])), q: multi(qOf.map(n => [n.Q, null])) } });
      },
    };
  }

  /* ═══ WHERE THE BASS AND THE TREBLE START (#482 polish 3.6) ═════════════════════════════════════════════════
   * The two shelves were fixed at 200 Hz and 3000 Hz (Bass & Treble) and 250 / 4000 Hz with a Mid of width Q 1
   * (3-Band EQ), so "more bass" always meant the same slab from 200 Hz down: a sub boost under a voice, or a
   * warmer 400 Hz, could not be had. "Bass at" / "Treble at" / "Low at" / "High at" are the shelves' own
   * corner frequencies, and "Mid width" is how wide the Mid band reaches — each one a real biquad AudioParam, so
   * it keyframes and glides like the gains beside it, and the preview (applyAt) and the export (schedule) drive
   * the very same param.
   * Their defaults are the numbers the build always used, so a project saved before they existed (the sanitiser
   * fills a missing key with its def) renders sample for sample what it did — MEASURED against v17.19 on
   * noise, a sweep and an impulse, export and preview paths (tools/design/482/polish3/tone/samecheck.py).
   * MID WIDTH IS 1/Q, NOT Q. The biquad's Q gets NARROWER as it grows, so a slider labelled "width" driving it
   * straight would narrow the band as you drag it wider. Width 1 is Q 1 exactly (1/1), so the default is the
   * old band to the bit; 0.1 is a narrow notch-like band (Q 10) and 10 is a broad tilt (Q 0.1). */
  DEFS.push({
    type: 'bassTreble', label: 'Bass & Treble', category: 'eq',
    params: [
      P('bass', 'Bass', -24, 24, 0.5, 0, 'dB', true), P('treble', 'Treble', -24, 24, 0.5, 0, 'dB', true),
      DEAD0(P('bassFreq', 'Bass at', 40, 500, 1, 200, 'Hz', true), 'bass'), DEAD0(P('trebleFreq', 'Treble at', 1000, 16000, 10, 3000, 'Hz', true), 'treble'),
    ],
    build: function (ctx) {
      const s = shop(ctx);
      const lo = s.biquad('lowshelf', 200, null, 0);
      const hi = s.biquad('highshelf', 3000, null, 0);
      lo.connect(hi);
      return unit({ input: lo, output: hi, nodes: s.nodes, oscs: s.oscs, params: { bass: lo.gain, treble: hi.gain, bassFreq: lo.frequency, trebleFreq: hi.frequency } });
    },
  }, {
    type: 'eq3', label: '3-Band EQ', category: 'eq',
    params: [
      P('low', 'Low', -24, 24, 0.5, 0, 'dB', true),
      P('mid', 'Mid', -24, 24, 0.5, 0, 'dB', true),
      P('high', 'High', -24, 24, 0.5, 0, 'dB', true),
      DEAD0(P('midFreq', 'Mid Freq', 200, 6000, 10, 1000, 'Hz', true), 'mid'),
      DEAD0(P('midWidth', 'Mid width', 0.1, 10, 0.1, 1, '×', true), 'mid'),
      DEAD0(P('lowFreq', 'Low at', 40, 1000, 1, 250, 'Hz', true), 'low'),
      DEAD0(P('highFreq', 'High at', 1000, 16000, 10, 4000, 'Hz', true), 'high'),
    ],
    build: function (ctx) {
      const s = shop(ctx);
      const lo = s.biquad('lowshelf', 250, null, 0);
      const mid = s.biquad('peaking', 1000, 1, 0);
      const hi = s.biquad('highshelf', 4000, null, 0);
      lo.connect(mid).connect(hi);
      return unit({
        input: lo, output: hi, nodes: s.nodes, oscs: s.oscs,
        params: { low: lo.gain, mid: mid.gain, high: hi.gain, midFreq: mid.frequency, midWidth: mid.Q, lowFreq: lo.frequency, highFreq: hi.frequency },
        xf: { midWidth: function (w) { return 1 / w; } },
      });
    },
  },
    filterDef('lowpass', 'Low-Pass', 'lowpass', 40, 20000, 8000, 0.1, 20, 1),
    filterDef('highpass', 'High-Pass', 'highpass', 20, 12000, 200, 0.1, 20, 1),
    filterDef('bandpass', 'Band-Pass', 'bandpass', 60, 12000, 1200, 0.1, 20, 2),
    filterDef('notch', 'Notch', 'notch', 40, 12000, 1000, 0.1, 30, 8),
  {
    type: 'telephone', label: 'Telephone', category: 'eq',
    /* ═══ WHICH LINE (#482 polish 7.4) ═══════════════════════════════════════════════════════════════════════════════
     * One sound, a phone: a fixed 300–3400 Hz band and a fixed bite. Low cut and High cut are the band's two edges (the
     * same Q-1 biquads, now with their own sliders), Grit is the bite (k = 0.06 × Grit, so 30 is today's tanh 1.8, a
     * keyframed Grit cross-fading a bank of curves like Distortion's Drive) and Noise is a seeded hiss mixed in ahead of
     * the band, so it is narrowed and bitten like the voice. Style is a set of starting points: a tap writes the four
     * values below it (inspector.js fxSegment `sets`) and the sound is those four — the kernel reads nothing else from
     * it, so moving a slider afterwards is heard at once. Every default is today's Telephone: Phone writes the numbers
     * the build always used, Noise 0 is a gain of 0 into the band (x + 0 = x).
     * The backlog's Walkie-talkie also wants a squelch, which is a gate on the voice's level, not one of these four: Squelch
     * (#1154) is its own on/off, so no Style writes it. Off (the default, and every saved Telephone) builds no gate at all:
     * the graph is today's, node for node. On, the bitten line (voice and hiss alike) is shut while the voice is quiet and
     * opens when it speaks (SQUELCH_KNEE); the untouched copy a Mix under 1 blends in is never gated. */
    params: [
      CHOICE('style', 'Style', [[0, 'Phone'], [1, 'Radio'], [2, 'Megaphone'], [3, 'Walkie-talkie'], [4, 'Old radio']], 0, { sets: {
        0: { lowcut: 300, highcut: 3400, grit: 30, noise: 0 },
        1: { lowcut: 150, highcut: 5000, grit: 20, noise: 0 },
        2: { lowcut: 500, highcut: 2800, grit: 70, noise: 0 },
        3: { lowcut: 400, highcut: 2600, grit: 55, noise: 0.1 },
        4: { lowcut: 200, highcut: 4000, grit: 25, noise: 0.35 },
      } }),
      P('lowcut', 'Low cut', 100, 1000, 1, 300, 'Hz', true),
      P('highcut', 'High cut', 1500, 8000, 10, 3400, 'Hz', true),
      P('grit', 'Grit', 0, 100, 1, 30, '', true),
      P('noise', 'Noise', 0, 1, 0.01, 0, '', true),
      TOGGLE('squelch', 'Squelch', 0, { rebuild: true, note: 'Walkie-talkie: the line goes silent between words, hiss and all, and opens again when you speak.' }),
      MIX(1),
    ],
    build: function (ctx, inst) {
      const s = shop(ctx);
      const input = s.gain(1), out = s.gain(1);
      const hp = s.biquad('highpass', initNum(inst, 'lowcut', 300, 100, 1000), 1);
      const lp = s.biquad('lowpass', initNum(inst, 'highcut', 3400, 1500, 8000), 1);
      let grit = initNum(inst, 'grit', 30, 0, 100);
      const over = '2x';                 // the bite and its keyframed-Grit bank alike
      const bite = s.shaper(gritCurve(grit), over);
      const bg = s.gain(1);              // the static bite's own level, so a keyframed Grit's bank can take over
      const wd = wetDry(s, inst, 'mix', 1);
      /* THE UNTOUCHED COPY WAITS FOR THE BITE (the audio-reds hunt, 13 Oct). The bite is oversampled 2×, so the bitten copy
         is 128 frames late (OVERSAMPLE_FRAMES) and an un-delayed dry copy combed every Mix under 1: notches every 375 Hz, a
         click twice. So the dry copy waits the same frames. Mix 1 (the default) is wet × 1 + dry × 0, today's sound. */
      const dryLag = dryLine(s.delay, oversampleSecs(ctx, over));
      input.connect(dryLag); dryLag.connect(wd.dry); wd.dry.connect(out);
      /* THE SQUELCH (#1154): the bitten line (bite and Grit bank alike) passes through `sq`, whose gain starts at 0 and IS the
         gate — the voice's level, read off `input` before the hiss joins it, smoothed (25 Hz) and stepped by SQUELCH_KNEE, then
         rounded once more (50 Hz) so it opens and shuts without a click. Built only when on, so off is today's graph. */
      let line = wd.wet;
      if (staticOf(inst, 'telephone', 'squelch') > 0) {
        const sq = s.gain(0), rect = s.shaper(SQUELCH_RECT), lvl = s.biquad('lowpass', 25, Math.SQRT1_2);
        const push = s.gain(SQUELCH_PUSH), knee = s.shaper(SQUELCH_KNEE), soft = s.biquad('lowpass', 50, Math.SQRT1_2);
        input.connect(rect); rect.connect(lvl); lvl.connect(push); push.connect(knee); knee.connect(soft); soft.connect(sq.gain);
        sq.connect(wd.wet); line = sq;
      }
      input.connect(hp); hp.connect(lp); lp.connect(bite); bite.connect(bg); bg.connect(line); wd.wet.connect(out);
      const hiss = s.noise(2, 0x7e1e), nG = s.gain(initNum(inst, 'noise', 0, 0, 1) * 0.12);   // Noise 1 ≈ −25 dBFS of hiss in the band
      hiss.connect(nG); nG.connect(hp);
      const bank = curveBank(s, lp, line, gritCurve, 0, 100, 12, over);
      return unit({
        input: input, output: out, nodes: s.nodes, oscs: s.oscs, lfos: s.lfos,
        params: { lowcut: hp.frequency, highcut: lp.frequency },
        custom: {
          grit: function (v, when, ramp) {
            v = clamp(v, 0, 100);
            if (!FM.isAnimated(inst.params && inst.params.grit)) {   // see the note on distortion's drive
              if (v !== grit) { grit = v; bite.curve = gritCurve(v); }
              return;
            }
            bank.at(v, when, ramp, bg.gain);
          },
          noise: multi([[nG.gain, 0.12]]),
          mix: wd.set,
        },
      });
    },
  });

  /* ---- Space & Stereo ---- */
  DEFS.push({
    type: 'reverb', label: 'Reverb', category: 'space',
    params: [
      P('size', 'Size', 0, 1, 0.01, 0.5, '', true), P('decay', 'Decay', 0.1, 8, 0.1, 2, 's', true),
      /* #482 polish 9.8: how much darker the tail gets as it dies (DAMP_HZ above). Baked into the room, so not keyframable;
         moving it swaps the room as Size and Decay do. 0 is today's room. */
      P('damping', 'Damping', 0, 1, 0.01, 0, '', false),
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
      // Width is mid/side on the wet (msWidth), switched in by a pair because the M/S sum is not exact at w = 1.
      const ms = msWidth(s, w0), wG = ms.w;
      const wp = bypassPair(s, lc.out, ms.input, ms.output, w0 < 1);
      pre.out.connect(conv); conv.connect(convG); convG.connect(wetBus);
      wp.out.connect(wd.wet); wd.wet.connect(out);
      let size = initNum(inst, 'size', 0.5, 0, 1), decay = initNum(inst, 'decay', 2, 0.1, 8);
      let damp = initNum(inst, 'damping', 0, 0, 1);   // #482 9.8: every room this Reverb makes, static or banked, is damped the same
      conv.buffer = impulse(ctx, size, decay, damp);

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
          c.buffer = impulse(ctx, r.sz, r.dc, damp);
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
            if (v !== size) { size = v; conv.buffer = impulse(ctx, size, decay, damp); }
          },
          decay: function (v) {
            v = clamp(v, 0.1, 8);
            if (banked) return;
            if (isAnim()) v = q(v, qDecay());
            if (v !== decay) { decay = v; conv.buffer = impulse(ctx, size, decay, damp); }
          },
          // #482 9.8: static, so a move only ever comes from the live panel (the export sets the value it was built with).
          damping: function (v) {
            v = clamp(v, 0, 1);
            if (banked) return;
            if (v !== damp) { damp = v; conv.buffer = impulse(ctx, size, decay, damp); }
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
      SYNCED(P('time', 'Time', 0.01, 2, 0.01, 0.35, 's', true)), ...TEMPO('delay', 'time', 0.01, 2),   // Tempo, Note: #482 8.7
      P('feedback', 'Feedback', 0, 0.9, 0.01, 0.35, '', true),
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
      // Time, or the Tempo and Note it is synced to (#482 8.7), onto both lines.
      const ts = tempoSync(inst, 'delay', 'time', 0.01, 2, (x, when, ramp) => { put(d.delayTime, x, when, ramp); put(dw.delayTime, x, when, ramp); });
      return unit({
        input: input, output: out, nodes: s.nodes, oscs: s.oscs, lfos: s.lfos, params: { feedback: fb.gain },
        custom: {
          time: ts.time, bpm: ts.bpm, note: ts.note,
          tone: multi([[lp.frequency, null]].concat(pairTargets(tone, v => v < 20000))),
          lowcut: multi([[hp.frequency, null]].concat(pairTargets(low, v => v > 20))),
          wobble: multi([[wAmp.gain, 0.002]].concat(pairTargets({ gOn: wOn, gOff: wOff }, v => v > 0))),
          mix: wd.set,
        },
      });
    },
  }, {
    type: 'pingpong', label: 'Ping-Pong Delay', category: 'space',
    params: [SYNCED(P('time', 'Time', 0.01, 1.5, 0.01, 0.3, 's', true)), ...TEMPO('pingpong', 'time', 0.01, 1.5),   // Tempo, Note: #482 8.7
      P('feedback', 'Feedback', 0, 0.85, 0.01, 0.4, '', true),
      /* #482 polish 8.3. Right-side timing stretches (or shortens) the right side's half of every bounce, so the echoes stop
         landing on an even left-right-left grid — at 1.5 the first right echo comes 2.5 × Time after the sound instead of
         2 ×. Tone takes the top off each side's line, so every bounce is darker than the one before (the Echo's Tone, 3.3);
         Width folds the bounces from full left-right towards the middle (Reverb's Width, 3.4). Every default is today's
         Ping-Pong: the right line at 1 × is today's line (a longer twin takes over off 1, a bypass pair — a delay's length
         changes how it rounds, the Pitch Shift lesson), Tone 20000 and Width 1 are bypass pairs. */
      P('offset', 'Right-side timing', 0.5, 2, 0.01, 1, '×', true),
      P('tone', 'Tone', 500, 20000, 10, 20000, 'Hz', true),
      P('width', 'Width', 0, 1, 0.01, 1, '', true),
      MIX(0.35)],
    build: function (ctx, inst) {
      const s = shop(ctx);
      const input = s.gain(1), out = s.gain(1);
      const wd = wetDry(s, inst, 'mix', 0.35);
      input.connect(wd.dry).connect(out);
      const off0 = initNum(inst, 'offset', 1, 0.5, 2), tone0 = initNum(inst, 'tone', 20000, 500, 20000), w0 = initNum(inst, 'width', 1, 0, 1);
      const dL = s.delay(1.7), dR = s.delay(1.7), dR2 = s.delay(3.2);
      dL.delayTime.value = 0.3; dR.delayTime.value = 0.3; dR2.delayTime.value = 0.3 * off0;
      const xL = s.gain(0.4), xR = s.gain(0.4);   // each cross-feed is one tap, so a round trip = feedback²
      const merge = s.merger(2);
      input.connect(dL);
      /* THE LOOP (8.3): dL → [Tone] → left out, and → xR → the right line (today's, or the twin when Right-side timing is off
         1) → [Tone] → right out, and → xL → dL. Each Tone sits on a line's output, so the first echo is darkened too and a
         drag is heard at Feedback 0 (the Echo's rule). */
      const lpL = s.biquad('lowpass', tone0, BUTTERWORTH_DB), lpR = s.biquad('lowpass', tone0, BUTTERWORTH_DB);
      const tL = bypassPair(s, dL, lpL, lpL, tone0 < 20000);
      tL.out.connect(merge, 0, 0); tL.out.connect(xR);
      xR.connect(dR); xR.connect(dR2);
      const offOn = Math.abs(off0 - 1) > 1e-9;
      const rOff = s.gain(offOn ? 0 : 1), rOn = s.gain(offOn ? 1 : 0), rSum = s.gain(1);
      dR.connect(rOff); rOff.connect(rSum); dR2.connect(rOn); rOn.connect(rSum);
      const tR = bypassPair(s, rSum, lpR, lpR, tone0 < 20000);
      tR.out.connect(merge, 0, 1); tR.out.connect(xL); xL.connect(dL);
      const ms = msWidth(s, w0);
      const wp = bypassPair(s, merge, ms.input, ms.output, w0 < 1);
      wp.out.connect(wd.wet); wd.wet.connect(out);
      /* Time (or the Tempo it is synced to, 8.7) and Right-side timing both drive the twin (Time × it), so each setter works
         it out from both read at the SAME scene moment (sceneT), the Compressor's Auto makeup rule: whichever writes last at
         a moment writes the same number. */
      const pO = paramOf('pingpong', 'offset');
      const offSwitch = pairTargets({ gOn: rOn, gOff: rOff }, v => Math.abs(v - 1) > 1e-9)[0];
      const ts = tempoSync(inst, 'pingpong', 'time', 0.01, 1.5, function (t, when, ramp, sceneT) {
        put(dL.delayTime, t, when, ramp); put(dR.delayTime, t, when, ramp);
        put(dR2.delayTime, t * valueAt(inst, pO, isFinite(sceneT) ? sceneT : 0), when, ramp);
      });
      return unit({
        input: input, output: out, nodes: s.nodes, oscs: s.oscs,
        custom: {
          time: ts.time, bpm: ts.bpm, note: ts.note,
          offset: function (v, when, ramp, sceneT) { put(dR2.delayTime, ts.now(sceneT) * v, when, ramp); offSwitch(v, when, ramp); },
          feedback: multi([[xL.gain, null], [xR.gain, null]]),
          tone: multi([[lpL.frequency, null], [lpR.frequency, null]].concat(pairTargets(tL, v => v < 20000), pairTargets(tR, v => v < 20000))),
          width: multi([[ms.w.gain, null]].concat(pairTargets(wp, v => v < 1))),
          mix: wd.set,
        },
      });
    },
  }, {
    type: 'width', label: 'Stereo Width', category: 'space',
    params: [P('width', 'Width', 0, 2, 0.01, 1.5, '', true),
      /* #482 polish 8.4. Widening pushes the bass apart too, and wide bass is what makes a mix sound hollow on a phone
         speaker and lopsided in headphones. Keep bass centred takes the difference between the sides (S) away below the
         frequency given — two Butterworth highpasses on S, 24 dB an octave, so 60 Hz under a 150 Hz setting keeps 1/40 of
         its width — and leaves everything above it as wide as Width says. 0 is Off, then 40–300 Hz: the panel says Off at 0
         and never rests in 1–39 (`offUntil`, the batch 8 review; a file that carries one plays it at 40). Auto trim turns the sound down as Width goes past 1 by √(2 / (1 + Width²)), which holds the level of an
         ordinary stereo sound (left and right unrelated) where it was: at 2 it would otherwise come out 4 dB louder. Both
         default to today's Width: Keep bass centred 0 is a bypass pair, Auto trim Off builds nothing (a rebuild). */
      Object.assign(P('monobass', 'Keep bass centred', 0, 300, 1, 0, 'Hz', true), { offUntil: 40 }),
      TOGGLE('trim', 'Auto trim', 0, { rebuild: true, note: 'Turns the sound down as it gets wider, so wider is not also louder.' }),
    ],
    build: function (ctx, inst) {
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
      // Keep bass centred (8.4): S → [two highpasses → on] + [off] → width, a bypass pair at 0.
      const mbHz = v => clamp(v, 40, 300), mb0 = initNum(inst, 'monobass', 0, 0, 300);
      const hp1 = s.biquad('highpass', mbHz(mb0), BUTTERWORTH_DB), hp2 = s.biquad('highpass', mbHz(mb0), BUTTERWORTH_DB);
      hp1.connect(hp2);
      const mb = bypassPair(s, side, hp1, hp2, mb0 > 0);
      const w = s.gain(1.5), wN = s.gain(-1);
      mb.out.connect(w); w.connect(wN);
      mid.connect(merge, 0, 0); w.connect(merge, 0, 0);             // L = M + S×width
      mid.connect(merge, 0, 1); wN.connect(merge, 0, 1);            // R = M − S×width
      input.connect(split);
      const custom = { monobass: multi([[hp1.frequency, mbHz], [hp2.frequency, mbHz]].concat(pairTargets(mb, v => v > 0))) };
      if (!(staticOf(inst, 'width', 'trim') > 0)) {
        merge.connect(out);
        return unit({ input: input, output: out, nodes: s.nodes, oscs: s.oscs, params: { width: w.gain }, custom: custom });
      }
      // Auto trim (8.4): one gain after the merge, following Width (keyframed too).
      const trimOf = v => (v > 1 ? Math.sqrt(2 / (1 + v * v)) : 1);
      const tg = s.gain(trimOf(initNum(inst, 'width', 1.5, 0, 2)));
      merge.connect(tg); tg.connect(out);
      custom.width = multi([[w.gain, null], [tg.gain, trimOf]]);
      return unit({ input: input, output: out, nodes: s.nodes, oscs: s.oscs, custom: custom });
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
    params: [SYNCED(P('rate', 'Rate', 0.05, 8, 0.01, 0.4, 'Hz', true)), ...TEMPO('autopan', 'rate', 0.05, 8),   // Tempo, Note: #482 8.7
      P('depth', 'Depth', 0, 1, 0.01, 1, '', true), SHAPE(),
      /* #482 polish 8.6. Centre moves the middle of the swing (−1 left … +1 right), so the sound can circle off to one side;
         the swing is clipped at the speaker it reaches. Realism is what makes "8D" sound like it goes round the head rather
         than from ear to ear: while the sound is behind, its top is taken off (two lowpasses dipping from 20 kHz to 4 kHz,
         the head's shadow), driven by a second scene-pinned LFO a quarter-cycle on from the pan (waveFn `back:`), and a
         little room is mixed in under it (Realism × 0.15 of a short reverb, the backlog's number). Both defaults are
         today's Auto-Pan: Centre 0 is the pan's own value, and Realism builds nothing until it is in use (rebuildIf, the
         Chorus Spread rule) — 20 kHz is not a lowpass that leaves a sound exactly alone. */
      P('centre', 'Centre', -1, 1, 0.01, 0, '', true),
      Object.assign(P('realism', 'Realism', 0, 1, 0.01, 0, '', true), { rebuild: true, rebuildIf: inUse }),
    ],
    build: function (ctx, inst) {
      const s = shop(ctx), wave = waveOf(inst, 'autopan');
      // Rate, or the Tempo and Note it is synced to (#482 8.7), onto every LFO's rate — and into where each one starts.
      const rates = [], ts = tempoSync(inst, 'autopan', 'rate', 0.05, 8, (x, when, ramp) => rates.forEach(ap => put(ap, x, when, ramp)));
      const p = s.panner(0);   // base stays centred (Centre moves it); the LFO swings ±depth around it
      const lfo = s.lfo(0.4, { key: 'rate', wave: wave, hzOf: ts.hzOf });
      rates.push(lfo.playbackRate);
      const amp = s.gain(1);
      lfo.connect(amp); amp.connect(p.pan);
      const custom = { rate: ts.rate, bpm: ts.bpm, note: ts.note };
      if (!inUse(inst.params && inst.params.realism)) {
        return unit({ input: p, output: p, nodes: s.nodes, oscs: s.oscs, lfos: s.lfos, params: { depth: amp.gain, centre: p.pan }, custom: custom });
      }
      // REALISM (8.6): in → two lowpasses (detuned down while behind) → the panner → out, plus in → a small room → out.
      const input = s.gain(1), out = s.gain(1), r0 = initNum(inst, 'realism', 0, 0, 1);
      const lp1 = s.biquad('lowpass', 20000, BUTTERWORTH_DB), lp2 = s.biquad('lowpass', 20000, BUTTERWORTH_DB);
      const back = s.lfo(0.4, { key: 'rate', wave: 'back:' + wave, phase: 0.25, hzOf: ts.hzOf });
      rates.push(back.playbackRate);
      const bd = s.gain(-AUTOPAN_BEHIND_CENTS * r0);
      back.connect(bd); bd.connect(lp1.detune); bd.connect(lp2.detune);
      input.connect(lp1); lp1.connect(lp2); lp2.connect(p); p.connect(out);
      const room = s.convolver(); room.buffer = impulse(ctx, 0.35, 1.2);
      const send = s.gain(AUTOPAN_ROOM * r0);
      input.connect(room); room.connect(send); send.connect(out);
      custom.realism = multi([[bd.gain, -AUTOPAN_BEHIND_CENTS], [send.gain, AUTOPAN_ROOM]]);
      return unit({ input: input, output: out, nodes: s.nodes, oscs: s.oscs, lfos: s.lfos, params: { depth: amp.gain, centre: p.pan }, custom: custom });
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
      /* #482 polish 3.7 (his #966: "as much choice as possible"). Output is a plain gain at the very end, after
         the blend; Mix blends the untouched sound back in under the squashed one (parallel compression: the
         loud parts stay tamed, the quiet detail keeps its life). Both defs are exactly today's graph — Output
         0 dB is a gain of 1 and Mix 1 puts the untouched path at 0, and x·1 + y·0 = x in floating point — so a
         saved Compressor (the sanitiser fills a missing key with def) renders sample for sample as before. */
      P('output', 'Output', -24, 24, 0.5, 0, 'dB', true),
      MIX(1),
      /* #482 polish 7.1 (backlog 3.7 left it for the enabler). The node turns everything it outputs up by a hidden amount
         that follows Threshold, Knee and Ratio (makeupCancel above): +2.4 dB at the defaults, +17 dB at −40 / 6 / 4:1, so
         lowering the threshold makes the quiet parts LOUDER, which is not what anyone expects a compressor to do. On (the
         default, and every saved Compressor) is today's sound — the graph is not touched at all. Off puts the cancelling
         gain after the node, so below the threshold the sound stays exactly at its own level and Output is the only lift.
         A rebuild: the on and off graphs differ (the setters below), and a toggle is not keyframed. */
      TOGGLE('automakeup', 'Auto makeup', 1, { rebuild: true, note: 'On: the Compressor turns the result back up by the amount it squashes the loudest sound. Off: quiet parts stay at their own level, and Output is the only boost.' }),
    ],
    /* A live meter: the Compressor row in the Audio effects panel draws how far this node is turning the sound
       down while the clip plays or is heard (inspector.js reductionMeter, read through audioFxLive.reductionOf). */
    meter: 'reduction',
    build: function (ctx, inst) {
      const s = shop(ctx);
      const input = s.gain(1), out = s.gain(1);
      const c = s.comp();
      const autoMakeup = staticOf(inst, 'compressor', 'automakeup') !== 0;
      /* THE UNTOUCHED PATH WAITS FOR THE SQUASHED ONE. A DynamicsCompressorNode looks ahead: its output is its
         input floor(0.006 × rate) samples late — but never more than 1023, the engine's pre-delay buffer (1024
         frames, minus one). MEASURED in the suite's Chrome by cross-correlation: 132 frames at 22.05 kHz, 264 at
         44.1, 288 at 48, 529 at 88.2, 576 at 96, and 1023 at BOTH 176.4 and 192 kHz, where 6 ms would be 1058
         and 1152 (the spec engine's fixed 6 ms pre-delay, the same code in WebKit). Blended against a copy
         that is late by a different amount, every Mix between 0 and 1 is a comb filter — a hollow, phasey
         sound with a notch every 1 / (the difference): every 167 Hz against an un-delayed copy, every 1.5 kHz
         at 192 kHz before the cap was counted (#482 batch 3 review; the live preview runs at the hardware's
         rate, so a Mac on a 192 kHz interface heard it). So the untouched copy is delayed by the same frames,
         cap included, and the two line up at every rate. */
      const lag = s.delay(0.05);
      lag.delayTime.value = lookaheadSecs(ctx);
      const wd = wetDry(s, inst, 'mix', 1);
      if (autoMakeup) {   // today's graph, node for node
        input.connect(c); c.connect(wd.wet); wd.wet.connect(out);
        input.connect(lag); lag.connect(wd.dry); wd.dry.connect(out);
        return unit({ input: input, output: out, nodes: s.nodes, oscs: s.oscs, meter: { node: c, dry: wd.dry.gain, wet: wd.wet.gain },
          params: { threshold: c.threshold, ratio: c.ratio, attack: c.attack, release: c.release, knee: c.knee, output: out.gain },
          xf: { output: dbToLin }, custom: { mix: wd.set } });
      }
      /* AUTO MAKEUP OFF: a gain after the node that cancels its lift. The lift follows THREE keys, and the chain hands
         each key its values separately (static ones once, keyframed ones every step), so each of the three setters works
         the gain out from all three read at the SAME scene moment (sceneT): whichever writes last at a given time writes
         the same number, and a keyframed threshold stays cancelled at every step. */
      const mk = s.gain(makeupCancel(staticOf(inst, 'compressor', 'threshold'), staticOf(inst, 'compressor', 'knee'), staticOf(inst, 'compressor', 'ratio')));
      input.connect(c); c.connect(mk); mk.connect(wd.wet); wd.wet.connect(out);
      input.connect(lag); lag.connect(wd.dry); wd.dry.connect(out);
      const curveKey = function (key) {
        return function (v, when, ramp, sceneT) {
          const at = k => (k === key ? v : valueAt(inst, paramOf('compressor', k), isFinite(sceneT) ? sceneT : 0));
          const g = makeupCancel(at('threshold'), at('knee'), at('ratio'));
          if (ramp) { c[key].linearRampToValueAtTime(v, when); mk.gain.linearRampToValueAtTime(g, when); }
          else { c[key].setValueAtTime(v, when); mk.gain.setValueAtTime(g, when); }
        };
      };
      return unit({ input: input, output: out, nodes: s.nodes, oscs: s.oscs, meter: { node: c, dry: wd.dry.gain, wet: wd.wet.gain },
        params: { attack: c.attack, release: c.release, output: out.gain },
        xf: { output: dbToLin }, custom: { threshold: curveKey('threshold'), knee: curveKey('knee'), ratio: curveKey('ratio'), mix: wd.set } });
    },
  }, {
    type: 'limiter', label: 'Limiter', category: 'dyn',
    // Its Mix (#482 polish 8.1) blends a dry copy held back by the node's look-ahead, as the Compressor's is (mixOutput)…
    dryLag: lookaheadSecs,
    /* …and, while Clip at ceiling is on, by the clip's oversampler as well (192 frames, OVERSAMPLE_FRAMES; the audio-reds
       hunt, 13 Oct): the dry copy rides a bypass pair of its own, switched by the same key as the clip's (mixOutput). */
    dryLagWhile: { key: 'clip', on: v => v > 0, over: LIM_CLIP_OVER },
    /* …and its Output only turns it down (batch 8 review): above 0 dB it would lift a limited sound past the Ceiling the
       effect exists to hold. Capped, not moved before the ceiling (that would be Input gain again), and Output only came
       with 8.1, so no saved Limiter carries a value above 0. */
    outputMax: 0,
    params: [
      P('ceiling', 'Ceiling', -24, 0, 0.5, -1, 'dB', true),
      /* #482 polish 3.8. Input gain pushes the sound INTO the ceiling (louder, with the peaks held at it);
         Release is how fast the limiter lets go after a peak (short = loud and pumping, long = smooth). Both
         defs are today's graph (see build) — so a saved Limiter renders sample for sample as before. */
      P('input', 'Input gain', 0, 24, 0.5, 0, 'dB', true),
      P('release', 'Release', 0.01, 1, 0.01, 0.05, 's', true),
      /* #482 polish 7.1 (backlog 3.8 left it for the enabler). The node's ratio stops at 20:1, so a full-scale sound still
         lands 1/20 of the way over the ceiling (0.95 × Ceiling: −11.4 dBFS under −12) and the first moments of a hit get
         past a 1 ms detector. Clip at ceiling cuts whatever is left over the ceiling itself — a hard clip, 4× oversampled so
         the cut does not fold back down as aliasing. Off (the default, and every saved Limiter) is today's graph exactly:
         a bypass pair (backlog §0.3), so switching it while the preview plays fades rather than clicks. */
      TOGGLE('clip', 'Clip at ceiling', 0, { note: 'Nothing gets past the ceiling, not even the start of a hit. Pushed hard it can sound crunchy.' }),
    ],
    build: function (ctx, inst) {
      const s = shop(ctx);
      const pre = s.gain(1);
      const c = s.comp();
      c.ratio.value = 20; c.knee.value = 0; c.attack.value = 0.001; c.release.value = 0.05;
      c.threshold.value = -1;
      // The node's hidden makeup, cancelled (queue 986, hunt C2 — see hardKneeMakeupCancel). The ceiling
      // drives the threshold AND this gain from one key, so a keyframed ceiling stays compensated at
      // every step: both are real AudioParams scheduled together.
      const trim = s.gain(hardKneeMakeupCancel(-1, 20));
      /* ═══ INPUT GAIN MUST NOT LIFT THE CEILING (#482 batch 3 review) ═══════════════════════════════════════
       * The node's ratio stops at 20:1, so it lets 1 dB through for every 20 dB it is pushed over. A plain
       * gain in front (the first build) therefore lifted the ceiling with the drive: MEASURED at the -1 dB
       * ceiling, a full-scale sine came out at +0.74 dBFS with Input gain 24, noise at +1.71 and a kick at
       * +1.58 — over full scale, which a phone plays as crackle — and 3 dB over a -6 ceiling.
       * Two parts, both exactly today's graph at Input gain 0:
       * 1) THE DRIVE MOVES THE KNEE DOWN BY G/19. With the knee at C − G/19 a 20:1 line lands a sound x dB
       *    below full scale at 0.95·C + x/20 however hard it is pushed: the drive cancels out, so nothing
       *    that reached the ceiling with no Input gain comes out any louder with it, and everything under
       *    the ceiling is lifted by the full G. It is done as gains, not by moving the node's threshold:
       *    the node sees the sound G + G/19 louder against the SAME threshold (so its makeup, which depends
       *    only on the threshold, stays cancelled by `trim`), and `post` takes the G/19 back off. The same
       *    curve as a moved threshold, and each gain follows ONE key, so a keyframed Input gain and a
       *    keyframed Ceiling schedule independently and still agree at every step. At G = 0 both are 1.
       * 2) A CLIP CATCHES WHAT THE DETECTOR MISSES. The node reacts in 1 ms, so the first moments of a hit
       *    still get through: with part 1 alone, noise and a kick at +24 still peaked at +0.54 and +0.47 dBFS.
       *    So while Input gain is above 0, the sound passes a hard clip (limHoldLin) 1 dB above where the
       *    20:1 line puts a full-scale sound, and never above 0 dBFS — exactly 0 dBFS at the default -1
       *    ceiling, -4.7 under -6, -10.4 under -12. Why not AT the line: the node's own gain ripples on a
       *    steady tone (MEASURED up to +0.57 dB over the line, a full-scale 1 kHz sine under -24 at +24), so
       *    a clip there cut the top off 20 % of every loud tone's samples (-32 dB of distortion, audible). At
       *    +1 dB it touches no steady tone at all (identical to the unclipped graph to 1e-7) and only the
       *    overshoot of hits: 0.5–2 % of noise samples, 2–11 % of a hard-driven kick's. The one exception is
       *    a ceiling above -1 dB: there the clip is capped at full scale, and the ripple over it IS clipped
       *    (at 0 dB and +24, the tops of a loud tone) — the alternative is the device clipping it. Everything driven
       *    then peaks within about 0.6 dB of what the same Limiter already let through with no Input gain
       *    (MEASURED: -0.63 → 0.00 dBFS at -1, -5.12 → -4.70 at -6, -10.54 → -10.40 at -12).
       *    Bypass pair (backlog §0.3): the clip is always built, and at Input gain 0 its gain is 0 and the
       *    straight path's is 1 — float-exact, so a saved Limiter is sample for sample what it was, and it
       *    never shaves the default's own transients. */
      const post = s.gain(1), out = s.gain(1);
      const clipIn = s.gain(1 / limHoldLin(-1)), clipOut = s.gain(limHoldLin(-1));
      const clip = s.shaper(HARD_CLIP);
      const gOn = s.gain(0), gOff = s.gain(1);
      pre.connect(c); c.connect(trim); trim.connect(post);
      post.connect(clipIn); clipIn.connect(clip); clip.connect(clipOut); clipOut.connect(gOn); gOn.connect(out);
      post.connect(gOff); gOff.connect(out);
      // Clip at ceiling (#482 7.1): out → [÷ceiling → hard clip (4×) → ×ceiling] in a bypass pair, after everything above.
      const ceil0 = staticOf(inst, 'limiter', 'ceiling');
      const cIn = s.gain(1 / dbToLin(ceil0)), cOut = s.gain(dbToLin(ceil0));
      const cClip = s.shaper(HARD_CLIP, LIM_CLIP_OVER);
      cIn.connect(cClip); cClip.connect(cOut);
      const atCeil = bypassPair(s, out, cIn, cOut, staticOf(inst, 'limiter', 'clip') > 0);
      return unit({ input: pre, output: atCeil.out, nodes: s.nodes, oscs: s.oscs,
        params: { release: c.release },
        custom: {
          ceiling: multi([[c.threshold, null], [trim.gain, v => hardKneeMakeupCancel(v, 20)],
            [clipIn.gain, v => 1 / limHoldLin(v)], [clipOut.gain, limHoldLin],
            [cIn.gain, v => 1 / dbToLin(v)], [cOut.gain, dbToLin]]),
          input: multi([[pre.gain, v => dbToLin(v * 20 / 19)], [post.gain, v => dbToLin(-v / 19)],
            [gOn.gain, v => (v > 0 ? 1 : 0)], [gOff.gain, v => (v > 0 ? 0 : 1)]]),
          clip: multi(pairTargets(atCeil, v => v > 0)),
        } });
    },
  }, {
    type: 'tremolo', label: 'Tremolo', category: 'dyn',
    params: [
      SYNCED(P('rate', 'Rate', 0.1, 20, 0.1, 5, 'Hz', true)), ...TEMPO('tremolo', 'rate', 0.1, 20),   // Tempo, Note: #482 8.7
      P('depth', 'Depth', 0, 1, 0.01, 0.7, '', true), SHAPE(),
      /* #482 polish 7.2. The right channel's swing runs this far round the cycle from the left's: at 180° one side dips while
         the other swells, so the sound rocks between the speakers instead of pulsing in the middle. A rebuild (an LFO's
         phase is set when it starts) and not keyframable; 0 (the default, every saved Tremolo) builds today's one carrier. */
      Object.assign(P('stereo', 'Stereo phase', 0, 180, 5, 0, '°', false), { rebuild: true }),
    ],
    build: function (ctx, inst) {
      const s = shop(ctx), wave = waveOf(inst, 'tremolo'), st = staticOf(inst, 'tremolo', 'stereo');
      // Rate, or the Tempo and Note it is synced to (#482 8.7), onto every LFO's rate — and into where each one starts.
      const rates = [], ts = tempoSync(inst, 'tremolo', 'rate', 0.1, 20, (x, when, ramp) => rates.forEach(ap => put(ap, x, when, ramp)));
      if (!(st > 0)) {
        const carrier = s.gain(1);
        const lfo = s.lfo(5, { key: 'rate', wave: wave, hzOf: ts.hzOf });
        rates.push(lfo.playbackRate);
        const amp = s.gain(0.35);
        lfo.connect(amp); amp.connect(carrier.gain);
        // depth 0 → base 1, no swing (unity). depth 1 → base 0.5 ± 0.5, dipping to silence.
        return unit({
          input: carrier, output: carrier, nodes: s.nodes, oscs: s.oscs, lfos: s.lfos,
          custom: { rate: ts.rate, bpm: ts.bpm, note: ts.note, depth: multi([[carrier.gain, v => 1 - v / 2], [amp.gain, v => v / 2]]) },
        });
      }
      // STEREO PHASE: a carrier per channel, the right one's LFO started st/360 of a cycle on. A mono clip is up-mixed to
      // both sides first (a splitter is discrete, so its right output would otherwise be silence — see Stereo Width).
      const input = s.gain(1), out = s.gain(1);
      input.channelCount = 2; input.channelCountMode = 'explicit'; input.channelInterpretation = 'speakers';
      const split = s.splitter(2), merge = s.merger(2);
      const cL = s.gain(1), cR = s.gain(1);
      const lfoL = s.lfo(5, { key: 'rate', wave: wave, hzOf: ts.hzOf }), lfoR = s.lfo(5, { key: 'rate', wave: wave, phase: st / 360, hzOf: ts.hzOf });
      rates.push(lfoL.playbackRate, lfoR.playbackRate);
      const aL = s.gain(0.35), aR = s.gain(0.35);
      lfoL.connect(aL); aL.connect(cL.gain); lfoR.connect(aR); aR.connect(cR.gain);
      input.connect(split); split.connect(cL, 0); split.connect(cR, 1);
      cL.connect(merge, 0, 0); cR.connect(merge, 0, 1); merge.connect(out);
      return unit({
        input: input, output: out, nodes: s.nodes, oscs: s.oscs, lfos: s.lfos,
        custom: {
          rate: ts.rate, bpm: ts.bpm, note: ts.note,
          depth: multi([[cL.gain, v => 1 - v / 2], [aL.gain, v => v / 2], [cR.gain, v => 1 - v / 2], [aR.gain, v => v / 2]]),
        },
      });
    },
  });

  /* ---- Character ---- */
  DEFS.push({
    type: 'distortion', label: 'Distortion', category: 'char',
    params: [
      P('drive', 'Drive', 0, 100, 1, 30, '', true),
      /* #482 polish 7.3 (fixes C19: at the default Drive a quiet sound came out about 20 dB louder, with nothing to trim it).
         Type picks the curve (DIST_TYPES above); Tone takes the fizz off the top of the distorted sound (a lowpass on the
         wet, in a bypass pair); Auto level divides the curve's own small-signal gain back out, so turning Drive up adds
         grit without turning quiet sound up; Output trims the whole effect. Every default is today's Distortion: Soft is the
         same curve, Tone 20000 and Output 0 dB are x·1 + y·0 and a gain of 1, Auto level Off is no node at all. */
      CHOICE('curve', 'Type', DIST_TYPES, 0, { rebuild: true }),
      P('tone', 'Tone', 500, 20000, 10, 20000, 'Hz', true),
      TOGGLE('autogain', 'Auto level', 0, { rebuild: true, note: 'Keeps quiet sound at its own level as Drive goes up, so Drive changes the grit, not the volume.' }),
      P('output', 'Output', -24, 6, 0.5, 0, 'dB', true),
      MIX(1),
    ],
    build: function (ctx, inst) {
      const s = shop(ctx);
      const input = s.gain(1), out = s.gain(1);
      const ct = staticOf(inst, 'distortion', 'curve'), autoLvl = staticOf(inst, 'distortion', 'autogain') > 0;
      const curveOf = v => distCurve(ct, v);
      let drive = initNum(inst, 'drive', 30, 0, 100);
      const over = '4x';                // the shaper and its keyframed-Drive bank alike
      const sh = s.shaper(curveOf(drive), over);
      const shg = s.gain(1);            // the static shaper's own level, so the bank can take over
      const wd = wetDry(s, inst, 'mix', 1);
      /* THE UNTOUCHED COPY WAITS FOR THE SHAPER (the audio-reds hunt, 13 Oct). Oversampled 4×, the distorted copy is 192
         frames late (OVERSAMPLE_FRAMES), so an un-delayed dry copy combed every Mix under 1 — notches every 250 Hz, a click
         twice. The dry copy waits the same frames; nothing else on the wet path is a fixed delay (the DC block, Auto level
         and Tone are a biquad, a gain and a biquad). Mix 1 (the default) is wet × 1 + dry × 0, today's sound. */
      const dryLag = dryLine(s.delay, oversampleSecs(ctx, over));
      input.connect(dryLag); dryLag.connect(wd.dry); wd.dry.connect(out);
      /* THE WET PATH (#482 7.3): shaper (+ the animated-drive bank) → wetSum → [10 Hz DC block: Tube, Fuzz, Rectify only]
         → [Auto level: only when on] → Tone (bypass pair) → wet. At the defaults every stage is ×1 or x·1 + y·0, exact. */
      const wetSum = s.gain(1);
      input.connect(sh); sh.connect(shg); shg.connect(wetSum);
      let tail = wetSum;
      if (DIST_DC[ct]) { const dc = s.biquad('highpass', 10, BUTTERWORTH_DB); tail.connect(dc); tail = dc; }
      const ag = autoLvl ? s.gain(1 / distGain0(ct, drive)) : null;
      if (ag) { tail.connect(ag); tail = ag; }
      const tone0 = initNum(inst, 'tone', 20000, 500, 20000);
      const lp = s.biquad('lowpass', tone0, BUTTERWORTH_DB);
      const tone = bypassPair(s, tail, lp, lp, tone0 < 20000);
      tone.out.connect(wd.wet); wd.wet.connect(out);
      const bank = curveBank(s, input, wetSum, curveOf, 0, 100, 12, over);
      return unit({
        input: input, output: out, nodes: s.nodes, oscs: s.oscs,
        params: { output: out.gain }, xf: { output: dbToLin },
        custom: {
          drive: function (v, when, ramp) {
            v = clamp(v, 0, 100);
            // Auto level follows Drive, keyframed or not (a real gain, so it ramps with the bank's cross-fade).
            if (ag) { const g = 1 / distGain0(ct, v); try { ramp ? ag.gain.linearRampToValueAtTime(g, when) : ag.gain.setValueAtTime(g, when); } catch (e) {} }
            /* STATIC MUST NEVER BUILD THE BANK. `when == null` is NOT the test — the static path calls
               set(key, value, 0), so `when` is 0 and not null, and an early version of this built a
               12-shaper bank for every plain Distortion in every project. The counter added for the
               suite caught it on the first measurement. The honest question is whether the PARAM is
               animated, so ask that. */
            if (!FM.isAnimated(inst.params && inst.params.drive)) {
              if (v !== drive) { drive = v; sh.curve = curveOf(v); }
              return;
            }
            bank.at(v, when, ramp, shg.gain);
          },
          tone: multi([[lp.frequency, null]].concat(pairTargets(tone, v => v < 20000))),
          mix: wd.set,
        },
      });
    },
  }, {
    type: 'bitcrush', label: 'Bit Crush', category: 'char',
    params: [P('bits', 'Bits', 1, 16, 1, 6, '', true),
      /* #482 polish 9.7, his #966 steer. A crushed sound's steps put a hard fizz all the way up the spectrum; Tone takes it
         off — a Butterworth lowpass on the crushed sound only (the Distortion's Tone), in a bypass pair, so 20000 (the
         default, and every saved Bit Crush) is today's sound sample for sample. The backlog's other two: Output already
         exists on every effect (#482 8.1, −24…+12 dB), and the sample-rate crush needs an AudioWorklet, which this file
         does not use — a question for Ezra (tools/design/plans/fx-b9/NOTES.md). */
      P('tone', 'Tone', 1000, 20000, 10, 20000, 'Hz', true),
      MIX(1)],
    build: function (ctx, inst) {
      const s = shop(ctx);
      const input = s.gain(1), out = s.gain(1);
      let bits = initNum(inst, 'bits', 6, 1, 16);
      const sh = s.shaper(crushCurve(bits), 'none');   // oversampling would interpolate the steps back out
      const shg = s.gain(1);
      const wd = wetDry(s, inst, 'mix', 1);
      input.connect(wd.dry).connect(out);
      /* THE WET PATH (9.7): the static shaper and the keyframed bank both feed wetSum, then Tone (a bypass pair) → wet. At
         20000 the pair is x·1 + y·0, so the crushed sound reaches the wet gain exactly as it always did. */
      const wetSum = s.gain(1);
      input.connect(sh); sh.connect(shg); shg.connect(wetSum);
      const tone0 = initNum(inst, 'tone', 20000, 1000, 20000);
      const lp = s.biquad('lowpass', tone0, BUTTERWORTH_DB);
      const tone = bypassPair(s, wetSum, lp, lp, tone0 < 20000);
      tone.out.connect(wd.wet); wd.wet.connect(out);
      /* 16 entries for 1..16 bits, so every bank entry IS an exact bit depth and the crossfade only
         ever runs between two whole values — no interpolation error anywhere. 'none' matters as much
         here as it does above: oversampling would interpolate the very steps this effect exists to
         make. This is also the effect the entry measured as the worst clicker (6.8x), and the reason
         it clicks is that at low bit counts one step changes every output sample — which a gain
         crossfade smooths and a curve swap cannot. */
      const bank = curveBank(s, input, wetSum, crushCurve, 1, 16, 16, 'none');
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
          tone: multi([[lp.frequency, null]].concat(pairTargets(tone, v => v < 20000))),
          mix: wd.set,
        },
      });
    },
  }, {
    type: 'lofi', label: 'Lo-Fi', category: 'char',
    params: [P('amount', 'Amount', 0, 1, 0.01, 0.6, '', true),
      /* #482 polish 9.5, his #966 steer. A tape or a record is not only a narrow, crushed band: it WOBBLES and it HISSES.
         Wow is the slow drift in pitch of a stretched tape (a 0.5 Hz swing of ±2.5 ms × Wow on a short delay), Flutter the
         fast shiver of a worn capstan (8 Hz, ±0.25 ms × Flutter), Hiss a pink tape hiss above 2 kHz and Crackle a record's
         dust ticks — both seeded loops on scene time (pinkBuffer / crackleBuffer), mixed in after the crush so they are not
         crushed themselves. Every one is 0 by default, and 0 is today's Lo-Fi sample for sample: Wow and Flutter each sit in
         a bypass pair (x·1 + y·0), Hiss and Crackle are gains of 0 into the wet sum (x + 0). Keyframable, all four. */
      P('wow', 'Wow', 0, 1, 0.01, 0, '', true), P('flutter', 'Flutter', 0, 1, 0.01, 0, '', true),
      P('hiss', 'Hiss', 0, 1, 0.01, 0, '', true), P('crackle', 'Crackle', 0, 1, 0.01, 0, '', true),
      MIX(1)],
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
      /* WOW, THEN FLUTTER (9.5), ahead of the band: each a short delay swung by its own scene-pinned sine (s.lfo), in its
         own bypass pair, so each key flips only its own pair. Two pairs, not one line driven by both keys: one pair switched
         by two keys would fight over it. The base delay is the swing's own size, so the line never reads ahead of now. */
      const wow0 = initNum(inst, 'wow', 0, 0, 1), flt0 = initNum(inst, 'flutter', 0, 0, 1);
      const wD = s.delay(0.01); wD.delayTime.value = LOFI_WOW[1];
      const wA = s.gain(wow0 * LOFI_WOW[1]);
      s.lfo(LOFI_WOW[0]).connect(wA); wA.connect(wD.delayTime);
      const wow = bypassPair(s, input, wD, wD, wow0 > 0);
      const fD = s.delay(0.01); fD.delayTime.value = LOFI_FLUTTER[1];
      const fA = s.gain(flt0 * LOFI_FLUTTER[1]);
      s.lfo(LOFI_FLUTTER[0]).connect(fA); fA.connect(fD.delayTime);
      const flutter = bypassPair(s, wow.out, fD, fD, flt0 > 0);
      flutter.out.connect(hp); hp.connect(lp); lp.connect(sh); sh.connect(shg); shg.connect(wd.wet); wd.wet.connect(out);
      /* HISS AND CRACKLE (9.5): into the wet sum, after the crush. Hiss is the pink loop through a 2 kHz Butterworth
         highpass; at 1 it sits near −31 dBFS, at Crackle 1 the loudest tick near −10 dBFS (LOFI_HISS / LOFI_CRACKLE). */
      const hiss = s.bed(pinkBuffer(ctx, 4, 0x415c)), hissHp = s.biquad('highpass', 2000, BUTTERWORTH_DB);
      const hissG = s.gain(initNum(inst, 'hiss', 0, 0, 1) * LOFI_HISS);
      hiss.connect(hissHp); hissHp.connect(hissG); hissG.connect(wd.wet);
      const crk = s.bed(crackleBuffer(ctx, 3, 0xc7ac)), crkG = s.gain(initNum(inst, 'crackle', 0, 0, 1) * LOFI_CRACKLE);
      crk.connect(crkG); crkG.connect(wd.wet);
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
        input: input, output: out, nodes: s.nodes, oscs: s.oscs, lfos: s.lfos,
        custom: {
          wow: multi([[wA.gain, LOFI_WOW[1]]].concat(pairTargets(wow, v => v > 0))),
          flutter: multi([[fA.gain, LOFI_FLUTTER[1]]].concat(pairTargets(flutter, v => v > 0))),
          hiss: multi([[hissG.gain, LOFI_HISS]]),
          crackle: multi([[crkG.gain, LOFI_CRACKLE]]),
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
    params: [
      P('rate', 'Rate', 0.05, 5, 0.01, 0.8, 'Hz', true), P('depth', 'Depth', 0, 1, 0.01, 0.5, '', true), SHAPE(),
      /* #482 polish 7.8. Voices is how many detuned copies sing together (1–6; 3 is today's three); Spread places them
         across the speakers — the first hard left, the last hard right at 1, the rest between — where today all three sit in
         the middle; Feedback sends each copy round again, a thicker, more metallic chorus. Feedback is a loop UNROLLED into
         CHORUS_TAPS swept delays (the Flanger's C16 lesson: a real loop comes back a render quantum late). Defaults are
         today's Chorus: Voices 3 builds the same three lines, Feedback 0 is a bypass pair on today's sum, and Spread 0 builds
         no stereo path at all — Spread is a rebuild across the line between 0 and in use (rebuildIf), because the spread
         path is stereo, and a mono Chorus turning stereo would change how an effect after it (a Pan) treats the sound. */
      Object.assign(P('voices', 'Voices', 1, 6, 1, 3, '', false), { rebuild: true }),
      Object.assign(P('spread', 'Spread', 0, 1, 0.01, 0, '', true), { rebuild: true, rebuildIf: inUse }),
      P('feedback', 'Feedback', 0, 0.6, 0.01, 0, '', true),
      MIX(0.5),
    ],
    build: function (ctx, inst) {
      const s = shop(ctx), wave = waveOf(inst, 'chorus');
      const input = s.gain(1), out = s.gain(1);
      const wd = wetDry(s, inst, 'mix', 0.5);
      input.connect(wd.dry).connect(out);
      const N = Math.round(staticOf(inst, 'chorus', 'voices')), spreadOn = inUse(inst.params && inst.params.spread);
      const sum = s.gain(1 / N);
      // The first three are today's voices, in today's order; three more for Voices 4–6.
      const rates = [1, 1.31, 0.77, 1.13, 0.89, 1.21], bases = [0.015, 0.021, 0.027, 0.018, 0.024, 0.030];
      const fb0 = initNum(inst, 'feedback', 0, 0, 0.6), sp0 = initNum(inst, 'spread', 0, 0, 1);
      const rateT = [], depthT = [], tapT = [], spreadT = [];
      const fbSum = s.gain(1 / N);          // every voice's feedback echoes (Spread off)
      const ssum = spreadOn ? s.gain(1) : null;
      for (let i = 0; i < N; i++) {
        const d = s.delay(0.08);
        d.delayTime.value = bases[i];   // ±4 ms of sweep never pushes these centres negative
        const lfo = s.lfo(0.8 * rates[i], { key: 'rate', mul: rates[i], wave: wave });
        const amp = s.gain(0.5 * 0.004);
        lfo.connect(amp); amp.connect(d.delayTime);
        input.connect(d);
        rateT.push([lfo.playbackRate, rates[i]]);
        depthT.push([amp.gain, 0.004]);
        // This voice's echoes: CHORUS_TAPS − 1 more passes through the same swept line, the k-th weighted Feedback^k.
        let vo = null;
        if (spreadOn) {
          vo = s.gain(1 / N);
          d.connect(vo);
          // Where this voice sits: −1 (left) … +1 (right) by its place in the list, times Spread. A balance, not a pan law:
          // the side it leans to keeps full level and the other side falls away, so a voice in the middle is untouched.
          const pos = N > 1 ? -1 + 2 * i / (N - 1) : 0;
          const up = s.gain(1);
          up.channelCount = 2; up.channelCountMode = 'explicit'; up.channelInterpretation = 'speakers';
          const split = s.splitter(2), merge = s.merger(2);
          const gL = s.gain(Math.min(1, 1 - sp0 * pos)), gR = s.gain(Math.min(1, 1 + sp0 * pos));
          vo.connect(up); up.connect(split); split.connect(gL, 0); split.connect(gR, 1);
          gL.connect(merge, 0, 0); gR.connect(merge, 0, 1); merge.connect(ssum);
          spreadT.push([gL.gain, v => Math.min(1, 1 - v * pos)], [gR.gain, v => Math.min(1, 1 + v * pos)]);
        } else d.connect(sum);
        let prev = d;
        for (let k = 1; k < CHORUS_TAPS; k++) {
          const dk = s.delay(0.08); dk.delayTime.value = bases[i];
          amp.connect(dk.delayTime);
          prev.connect(dk); prev = dk;
          const g = s.gain(Math.pow(fb0, k));
          dk.connect(g); g.connect(vo || fbSum);
          tapT.push([g.gain, powOf(k)]);
        }
      }
      if (spreadOn) ssum.connect(wd.wet);
      else {
        // FEEDBACK OFF IS TODAY'S SUM, EXACTLY: [sum] against [sum + echoes] in a bypass pair (x·1 + y·0 = x), so the sum
        // keeps exactly today's three inputs.
        const all = s.gain(1);
        sum.connect(all); fbSum.connect(all);
        const fbOn = s.gain(fb0 > 0 ? 1 : 0), fbOff = s.gain(fb0 > 0 ? 0 : 1), psum = s.gain(1);
        sum.connect(fbOff); fbOff.connect(psum); all.connect(fbOn); fbOn.connect(psum);
        psum.connect(wd.wet);
        tapT.push.apply(tapT, pairTargets({ gOn: fbOn, gOff: fbOff }, v => v > 0));
      }
      wd.wet.connect(out);
      return unit({ input: input, output: out, nodes: s.nodes, oscs: s.oscs, lfos: s.lfos,
        custom: { rate: multi(rateT), depth: multi(depthT), feedback: multi(tapT), spread: multi(spreadT), mix: wd.set } });
    },
  }, {
    type: 'flanger', label: 'Flanger', category: 'char',
    params: [P('rate', 'Rate', 0.05, 5, 0.01, 0.3, 'Hz', true), P('depth', 'Depth', 0, 1, 0.01, 0.6, '', true),
      /* #482 polish 9.6, his #966 steer. The sweep always sat round 4 ms: Manual moves it (0.5–10 ms — low is a tight jet,
         high a slow, wide one), and Depth's swing scales with it, ±75 % of Manual at Depth 1 (today's 1–7 ms round 4), so
         it never reaches below 0. Feedback now runs −0.9…+0.9: below 0 every other echo comes back upside down, so the
         resonances sit between today's (a hollower, more nasal flange). Stereo phase starts the right channel's sweep that
         far round the cycle from the left's (the Phaser's). Every default is today's Flanger: Manual 4 is the very 4 ms and a
         gain of exactly 1 on the swing, Feedback keeps its +0.5, and Stereo 0 builds today's one chain. */
      P('manual', 'Manual', 0.5, 10, 0.1, 4, 'ms', true),
      P('feedback', 'Feedback', -0.9, 0.9, 0.01, 0.5, '', true), SHAPE(), MIX(0.5),
      Object.assign(P('stereo', 'Stereo phase', 0, 180, 5, 0, '°', false), { rebuild: true })],
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
      const s = shop(ctx), wave = waveOf(inst, 'flanger');
      const input = s.gain(1), out = s.gain(1);
      const wd = wetDry(s, inst, 'mix', 0.5);
      input.connect(wd.dry).connect(out);
      const fb0 = initNum(inst, 'feedback', 0.5, -0.9, 0.9), m0 = initNum(inst, 'manual', 4, 0.5, 10);
      const st = staticOf(inst, 'flanger', 'stereo');
      const rateT = [], depthT = [], manT = [], tapT = [];
      /* One swept chain fed from `src`, its LFO `phase` round the cycle (9.6). LFO → amp (Depth × 3 ms) → span (Manual / 4,
         exactly 1 at today's 4 ms) → every tap's delayTime, which rests at Manual: the swing is ±75 % of Manual at Depth 1.
         Negative Feedback needs nothing more — tap k carries fb^k, which alternates in sign. */
      const lane = function (src, phase) {
        const lfo = s.lfo(0.3, { key: 'rate', wave: wave, phase: phase });
        rateT.push([lfo.playbackRate, null]);
        // Depth × 3 ms (1–7 ms round today's 4 ms), scaled by span, the same swing on every delay in the chain
        const amp = s.gain(0.6 * 0.003);
        const span = s.gain(m0 / FLANGE_MANUAL);
        lfo.connect(amp); amp.connect(span);
        depthT.push([amp.gain, 0.003]); manT.push([span.gain, v => v / FLANGE_MANUAL]);
        const sum = s.gain(1);
        let prev = src;
        for (let k = 0; k < FLANGE_TAPS; k++) {
          const d = s.delay(0.05); d.delayTime.value = m0 / 1000;
          span.connect(d.delayTime);
          manT.push([d.delayTime, v => v / 1000]);
          prev.connect(d); prev = d;
          const g = s.gain(Math.pow(fb0, k));   // echo k+1 carries fb^k
          d.connect(g); g.connect(sum);
          if (k) tapT.push([g.gain, powOf(k)]);
        }
        return { sum: sum, lfo: lfo };
      };
      const custom = { depth: multi(depthT), manual: multi(manT), feedback: multi(tapT), mix: wd.set };
      if (!(st > 0)) {
        // STEREO 0: today's one chain, its Rate on the LFO's own param as it always was.
        const one = lane(input, 0);
        one.sum.connect(wd.wet); wd.wet.connect(out);
        return unit({ input: input, output: out, nodes: s.nodes, oscs: s.oscs, lfos: s.lfos, params: { rate: one.lfo.playbackRate }, custom: custom });
      }
      // STEREO PHASE (9.6, the Phaser's): a chain per channel, a mono clip up-mixed to both first (a splitter is discrete).
      const up = s.gain(1);
      up.channelCount = 2; up.channelCountMode = 'explicit'; up.channelInterpretation = 'speakers';
      const split = s.splitter(2), merge = s.merger(2), gl = s.gain(1), gr = s.gain(1);
      input.connect(up); up.connect(split); split.connect(gl, 0); split.connect(gr, 1);
      lane(gl, 0).sum.connect(merge, 0, 0); lane(gr, st / 360).sum.connect(merge, 0, 1);
      merge.connect(wd.wet); wd.wet.connect(out);
      custom.rate = multi(rateT);
      return unit({ input: input, output: out, nodes: s.nodes, oscs: s.oscs, lfos: s.lfos, custom: custom });
    },
  }, {
    type: 'phaser', label: 'Phaser', category: 'char',
    params: [
      P('rate', 'Rate', 0.05, 5, 0.01, 0.5, 'Hz', true), P('depth', 'Depth', 0, 1, 0.01, 0.7, '', true), P('feedback', 'Feedback', 0, 0.9, 0.01, 0.4, '', true), SHAPE(),
      /* #482 polish 7.6. Stages is how many allpasses the sound goes through (each a 2nd-order allpass, so each adds one
         notch: 4 is today's four, 8 a denser, more liquid sweep, 2 a gentle one); Centre moves the whole sweep up or down
         (the four stages at 200–1600 Hz × Centre); Mix was welded at half and half — it is the depth of the notches, 0.5
         the deepest; Stereo phase starts the right channel's sweep that far round the cycle from the left's, so the swirl
         moves across the speakers. Every default is today's Phaser: four stages at 200/400/800/1600 Hz, Centre ×1 (a
         gain of exactly 1 on every sweep), Mix 0.5 (the same 0.5 / 0.5 pair), Stereo 0 (one chain for both sides). */
      CHOICE('stages', 'Stages', [[2, '2'], [4, '4'], [6, '6'], [8, '8']], 4, { rebuild: true }),
      P('centre', 'Centre', 0.25, 4, 0.01, 1, '×', true),
      MIX(0.5),
      Object.assign(P('stereo', 'Stereo phase', 0, 180, 5, 0, '°', false), { rebuild: true }),
    ],
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
      const s = shop(ctx), wave = waveOf(inst, 'phaser');
      const input = s.gain(1), out = s.gain(1);
      const wd = wetDry(s, inst, 'mix', 0.5);   // the notches ARE dry + allpass summed: 0.5 / 0.5 is today's pair exactly
      input.connect(wd.dry).connect(out);
      const n = staticOf(inst, 'phaser', 'stages'), st = staticOf(inst, 'phaser', 'stereo');
      // Four stages are today's literal centres; any other count spreads the same 200–1600 Hz span evenly in octaves.
      const bases = n === 4 ? [200, 400, 800, 1600] : Array.from({ length: n }, (_, i) => 200 * Math.pow(8, i / (n - 1)));
      const c0 = initNum(inst, 'centre', 1, 0.25, 4), fb0 = initNum(inst, 'feedback', 0.4, 0, 0.9);
      const rateT = [], depthT = [], centreT = [], tapT = [];
      /* One swept chain fed from `src` with its own LFO (`phase` round the cycle). Each stage sweeps in proportion to its
         own centre: one amp per stage (Depth) then one gain (Centre, exactly 1 by default) drives that stage in every pass. */
      const lane = function (src, phase) {
        const lfo = s.lfo(0.5, { key: 'rate', wave: wave, phase: phase });
        rateT.push([lfo.playbackRate, null]);
        const amps = bases.map(function (b) {
          const a = s.gain(0.7 * b * 0.7), cg = s.gain(c0);
          lfo.connect(a); a.connect(cg);
          depthT.push([a.gain, b * 0.7]); centreT.push([cg.gain, null]);
          return cg;
        });
        const sum = s.gain(1);
        let prev = src;
        for (let k = 0; k < PHASE_PASSES; k++) {
          bases.forEach(function (b, i) {
            const ap = s.biquad('allpass', b * c0, 1);
            amps[i].connect(ap.frequency);
            centreT.push([ap.frequency, b]);
            prev.connect(ap); prev = ap;
          });
          const g = s.gain(Math.pow(fb0, k));   // pass k+1 carries fb^k
          prev.connect(g); g.connect(sum);
          if (k) tapT.push([g.gain, powOf(k)]);
        }
        return sum;
      };
      if (!(st > 0)) lane(input, 0).connect(wd.wet);
      else {
        // STEREO PHASE: a chain per channel (a mono clip up-mixed to both first — a splitter is discrete).
        const up = s.gain(1);
        up.channelCount = 2; up.channelCountMode = 'explicit'; up.channelInterpretation = 'speakers';
        const split = s.splitter(2), merge = s.merger(2), gl = s.gain(1), gr = s.gain(1);
        input.connect(up); up.connect(split); split.connect(gl, 0); split.connect(gr, 1);
        lane(gl, 0).connect(merge, 0, 0); lane(gr, st / 360).connect(merge, 0, 1);
        merge.connect(wd.wet);
      }
      wd.wet.connect(out);
      return unit({ input: input, output: out, nodes: s.nodes, oscs: s.oscs, lfos: s.lfos,
        custom: { rate: multi(rateT), depth: multi(depthT), feedback: multi(tapT), centre: multi(centreT), mix: wd.set } });
    },
  }, {
    type: 'vibrato', label: 'Vibrato', category: 'char',
    params: [P('rate', 'Rate', 0.1, 12, 0.1, 5, 'Hz', true), P('depth', 'Depth', 0, 1, 0.01, 0.3, '', true), SHAPE()],
    build: function (ctx, inst) {
      const s = shop(ctx);
      const d = s.delay(0.05); d.delayTime.value = 0.005;   // 2–8 ms around a 5 ms centre, 100% wet
      const lfo = s.lfo(5, { key: 'rate', wave: waveOf(inst, 'vibrato') });
      const amp = s.gain(0.3 * 0.003);
      lfo.connect(amp); amp.connect(d.delayTime);
      return unit({ input: d, output: d, nodes: s.nodes, oscs: s.oscs, lfos: s.lfos, params: { rate: lfo.playbackRate }, custom: { depth: multi([[amp.gain, 0.003]]) } });
    },
  }, {
    type: 'ringmod', label: 'Ring Mod', category: 'char',
    params: [
      P('freq', 'Frequency', 10, 2000, 1, 220, 'Hz', true),
      /* #482 polish 7.7. Shape is the carrier's wave: a Square carrier adds sidebands round its odd harmonics too (a harsher,
         buzzier robot), a Triangle a softer version of that. Sweep rate and Sweep depth glide the carrier's pitch up and
         down — up to half its Frequency either way at depth 1, at the rate given — the classic wobbling sci-fi voice. The
         backlog's fix half (the carrier stopping at 1024 Hz, hunt C15) shipped in queue 986: the carrier already runs on a
         0.1 s cycle, its test (986 C15) passes, so only the controls are added. Defaults: Sine is today's buffer, and the
         sweep rides a TWIN carrier switched in by a bypass pair when Sweep depth leaves 0 — the default plays the very
         carrier it always did (nothing promises an engine plays a connected rate exactly like an unconnected one). */
      CHOICE('shape', 'Shape', [[0, 'Sine'], [1, 'Square'], [2, 'Triangle']], 0, { rebuild: true }),
      P('sweep', 'Sweep rate', 0, 5, 0.01, 0, 'Hz', true),
      P('sweepdepth', 'Sweep depth', 0, 1, 0.01, 0, '', true),
      MIX(1),
    ],
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
      const wave = ['sine', 'square', 'tri'][staticOf(inst, 'ringmod', 'shape')] || 'sine';
      const lfo = s.lfo(220, { key: 'freq', secs: RING_SECS, wave: wave });
      lfo.connect(ring.gain);
      // THE SWEPT TWIN (#482 7.7): the same carrier, its rate pushed by a scene-pinned sine of Sweep rate Hz, ±Sweep depth × ½.
      const f0 = initNum(inst, 'freq', 220, 10, 2000), sd0 = initNum(inst, 'sweepdepth', 0, 0, 1);
      const ringB = s.gain(0);
      const lfoB = s.lfo(220, { key: 'freq', secs: RING_SECS, wave: wave });
      lfoB.connect(ringB.gain);
      const sw = s.lfo(0, { key: 'sweep' });                    // 1 s cycle: its rate IS Sweep rate in Hz
      const swDepth = s.gain(sd0 * 0.5), swRate = s.gain(f0 * RING_SECS);
      sw.connect(swDepth); swDepth.connect(swRate); swRate.connect(lfoB.playbackRate);
      const rOff = s.gain(sd0 > 0 ? 0 : 1), rOn = s.gain(sd0 > 0 ? 1 : 0), rSum = s.gain(1);
      const wd = wetDry(s, inst, 'mix', 1);
      input.connect(wd.dry).connect(out);
      input.connect(ring); ring.connect(rOff); rOff.connect(rSum);
      input.connect(ringB); ringB.connect(rOn); rOn.connect(rSum);
      rSum.connect(wd.wet); wd.wet.connect(out);
      return unit({ input: input, output: out, nodes: s.nodes, oscs: s.oscs, lfos: s.lfos,
        params: { sweep: sw.playbackRate },
        custom: {
          freq: multi([[lfo.playbackRate, RING_SECS], [lfoB.playbackRate, RING_SECS], [swRate.gain, RING_SECS]]),
          sweepdepth: multi([[swDepth.gain, 0.5]].concat(pairTargets({ gOn: rOn, gOff: rOff }, v => v > 0))),
          mix: wd.set,
        } });
    },
  }, {
    type: 'vocalremove', label: 'Vocal Remove', category: 'char',
    params: [P('amount', 'Amount', 0, 1, 0.01, 1, '', true), Object.assign(P('bassKeep', 'Keep Bass', 0, 1, 0.01, 1, '', true), { overriddenBy: 'mode', liveWhen: 0 }),
      /* #482 polish 8.5. Cancelling the centre takes the kick and the bass with the voice, so the build hands back the sum of
         the two sides under 180 Hz — Keep bass below moves that line (60–400 Hz: up to 400 keeps a bass guitar's body, a
         voice's lowest notes come back with it). Keep highs hands back the shared sound above 8 kHz the same way (cymbals and
         air, which a cancel also hollows out; a voice has little up there). Mode turns it round: Centre only keeps what both
         speakers share — mostly the voice, but also anything else mixed to the middle, so it is labelled approximate. Every
         default is today's Vocal Remove: 180 Hz is the line it always used, Keep highs 0 adds a gain of 0, Remove vocals
         is today's graph (Mode is a rebuild). In Centre only the three keep controls do nothing, and say so. */
      Object.assign(P('bassFreq', 'Keep bass below', 60, 400, 1, 180, 'Hz', true), { overriddenBy: 'mode', liveWhen: 0, alsoGate: { by: 'bassKeep', deadAt: 0 } }),
      Object.assign(P('highKeep', 'Keep highs', 0, 1, 0.01, 0, '', true), { overriddenBy: 'mode', liveWhen: 0 }),
      CHOICE('mode', 'Mode', [[0, 'Remove vocals'], [1, 'Centre only']], 0, { rebuild: true, note: 'Centre only is approximate: it keeps what both speakers share, which is mostly the voice, but also the bass and anything else mixed to the middle.' }),
    ],
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
      if (staticOf(inst, 'vocalremove', 'mode') === 1) {
        // CENTRE ONLY (8.5): (L + R) / 2, up-mixed to both channels — a sound panned hard to one side comes out at half.
        const mid = s.gain(0.5);
        split.connect(mid, 0); split.connect(mid, 1);
        mid.connect(wd.wet); wd.wet.connect(out);
        return unit({ input: input, output: out, nodes: s.nodes, oscs: s.oscs, custom: { amount: wd.set } });
      }
      const sP = s.gain(1), sN = s.gain(-1), side = s.gain(1);
      split.connect(sP, 0); split.connect(sN, 1);
      sP.connect(side); sN.connect(side);            // L − R cancels the centred lead
      const mono = s.gain(0.5);
      split.connect(mono, 0); split.connect(mono, 1);
      const lp = s.biquad('lowpass', initNum(inst, 'bassFreq', 180, 60, 400), 0.5);
      const bass = s.gain(1);
      mono.connect(lp); lp.connect(bass);            // hand the kick/bass back — the cancel eats them too
      side.connect(wd.wet); bass.connect(wd.wet);    // mono result, up-mixed to both channels
      // Keep highs (8.5): the shared sound above 8 kHz, added at its own gain (0 by default: + 0, today's sum).
      const hp = s.biquad('highpass', 8000, BUTTERWORTH_DB), highs = s.gain(initNum(inst, 'highKeep', 0, 0, 1));
      mono.connect(hp); hp.connect(highs); highs.connect(wd.wet);
      wd.wet.connect(out);
      return unit({ input: input, output: out, nodes: s.nodes, oscs: s.oscs, params: { bassKeep: bass.gain, bassFreq: lp.frequency, highKeep: highs.gain }, custom: { amount: wd.set } });
    },
  }, {
    type: 'pitch', label: 'Pitch Shift', category: 'char',
    /* ═══ FINE TUNE, TWO OCTAVES, AND WHY IT LANDS LATE (#482 polish 3.5, hunt C20) ═══════════════════════════
     * Semitones stopped at an octave either way and moved in whole steps, so a voice could be a chipmunk or not,
     * but never "a touch higher", and a clip could not be nudged into tune with a song. Fine tune adds −100…+100
     * cents (a cent is 1/100 of a semitone) on top of Semitones, and Semitones now reaches two octaves (±24).
     * Fine tune is one more term in the same shift, not a second shifter: every param below is driven by
     * v = Semitones + Fine tune / 100, so a keyframed Fine tune glides exactly as a keyframed Semitones does.
     * At Fine tune 0 that sum IS Semitones (x + 0 = x), so a saved Pitch Shift renders sample for sample what it did.
     * Two octaves up slides one grain's delay across 0.3 s (0.32 with +100 cents on top), where one octave needed
     * 0.1 — more than the 0.2 s lines hold, so a second, longer pair takes over above an octave up (see THE LONG
     * PAIR below for why it is a second pair and not simply longer lines).
     * C20: the shifted copy is read from a delay line that slides across a grain, so on average it lands about
     * half that slide late — 25 ms at +7, 50 ms an octave up, 150 ms two octaves up. At Mix 100 % that is a small
     * lag behind the picture; below 100 % the dry sound plays on time beside it and the pair reads as a slap echo.
     * The hint line under the sliders says so in plain words. */
    params: [P('semitones', 'Semitones', -24, 24, 1, 0, 'st', true), P('cents', 'Fine tune', -100, 100, 1, 0, '¢', true),
      /* #482 polish 8.8. Grain is how long each slice of sound is before the two read heads hand over (G below, 100 ms until
         now): short grains (20–40 ms) keep drums and speech tight but buzz on a held note; long ones (150–200 ms) keep a sung
         note smooth but smear a beat and land later (the lag is half a grain an octave up). A rebuild — it is the length of
         the LFO buffers that drive the heads. 100 (the default, and every saved Pitch Shift) builds today's graph exactly. */
      Object.assign(P('grain', 'Grain', 20, 200, 1, 100, 'ms', false), { rebuild: true }),
      MIX(1)],
    hint: 'The shifted sound lands a little late (about 1/20 of a second an octave up, half the Grain). Keep Mix at 100% for a clean result: lower, the late copy sounds like an echo.',
    build: function (ctx, inst) {
      const s = shop(ctx);
      const input = s.gain(1), out = s.gain(1);
      const wd = wetDry(s, inst, 'mix', 1);
      input.connect(wd.dry).connect(out);
      /* Granular shift: a delay line read while its delayTime slides at exactly dτ/dt = 1 − ratio
       * resamples the signal by `ratio`. One line can only slide so far, so two run half a grain apart
       * and cross-fade, each windowed to silence at its own reset — that is where its delay jumps back.
       * G is the grain: shorter combs the tone, longer smears it into an echo — the Grain control (#482 8.8, 20–200 ms). */
      const G = staticOf(inst, 'pitch', 'grain') / 1000;
      const gA = s.delay(0.2), gB = s.delay(0.2);
      const mA = s.gain(0), mB = s.gain(0);
      const rampA = s.lfo(1 / G, { wave: 'ramp', secs: G }), rampB = s.lfo(1 / G, { wave: 'ramp', secs: G, phase: 0.5 });
      rampA.connect(mA); rampB.connect(mB);
      mA.connect(gA.delayTime); mB.connect(gB.delayTime);
      const lA = s.gain(1), lB = s.gain(1);   // window depth
      const wA = s.gain(0), wB = s.gain(0);   // gain 0 + a window LFO on .gain = the cross-fade itself
      const winA = s.lfo(1 / G, { wave: 'win', secs: G }), winB = s.lfo(1 / G, { wave: 'win', secs: G, phase: 0.5 });
      winA.connect(lA); lA.connect(wA.gain);
      winB.connect(lB); lB.connect(wB.gain);
      input.connect(gA); gA.connect(wA); wA.connect(wd.wet);
      input.connect(gB); gB.connect(wB); wB.connect(wd.wet);
      /* ═══ THE LONG PAIR — A BYPASS PAIR, NOT A LONGER LINE (#482 3.5) ═══════════════════════════════════════════
       * Two octaves up, one grain's slide is 0.3 s (0.32 with +100 cents), and the 0.2 s lines above cannot hold it.
       * Simply making them 0.5 s long was tried first and CHANGED EVERY SAVED PITCH SHIFT: Chrome's DelayNode works
       * out its read position in float32 as (write index + buffer length − delay), so a longer buffer rounds the
       * fraction differently. MEASURED against v17.19 (samecheck.py): +7 st on noise moved by up to −45 dB under the
       * peak, a keyframed 0→12 sweep by −44 dB — not audible, and not the same sound either.
       * So the 0.2 s lines stay exactly as they were for every shift up to an octave up — all of the old ±12 slider,
       * every down-shift to −24, and Fine tune on top up to +12 — and a second pair of 0.5 s lines sits beside them on the same ramps
       * and the same windows, silent (window depth 0 → gain exactly 0, and x + 0 = x) until the shift passes an
       * octave up. Then the pairs swap: one depth goes to 0 and the other to 1 — ramped across a scheduling step when
       * keyframed, so a glide through +12 st crossfades between two lines reading the same delay. Down-shifts never
       * need it: their slide is at most one grain (0.1 s). */
      const LONG_AT = 12;   // above an octave up, the long pair plays
      const SHORT_MAX = 0.2;   // an octave up slides one grain (D = G), and Grain stops at 200 ms, so these always hold it
      /* The long lines hold two octaves and 100 cents up, a slide of 3.24 grains: 0.5 s up to a Grain of 150 ms (and at the
         default, so a saved Pitch Shift reads the very lines it did), longer only for a longer Grain (#482 8.8). */
      const LONG_LEN = Math.max(0.5, 3.25 * G);
      const gA2 = s.delay(LONG_LEN), gB2 = s.delay(LONG_LEN);
      mA.connect(gA2.delayTime); mB.connect(gB2.delayTime);
      const lA2 = s.gain(0), lB2 = s.gain(0);
      const wA2 = s.gain(0), wB2 = s.gain(0);
      winA.connect(lA2); lA2.connect(wA2.gain);
      winB.connect(lB2); lB2.connect(wB2.gain);
      input.connect(gA2); gA2.connect(wA2); wA2.connect(wd.wet);
      input.connect(gB2); gB2.connect(wB2); wB2.connect(wd.wet);
      /* ═══ A SMALL SHIFT KEEPS ITS LEVEL (#482 3.5 review) ════════════════════════════════════════════════════════════
       * The two grains are cross-faded with equal-POWER windows (sin and cos, `win`), right when the two lines carry
       * DIFFERENT sound. Under a small shift they carry almost the SAME sound (the lines differ by half a grain's slide:
       * 29 µs at 1 cent, 3 ms at a semitone), and equal-power windows over equal signals sum to between 1 and 1.41 in
       * amplitude. Before Fine tune nothing could sit there — Semitones moves in whole steps — but Fine tune can.
       * MEASURED on the build before this (tools/design/482/polish3/tone/level.js, export path): a voice-like 140 Hz
       * tone came out +2.1 dB at 1 to 8 cents with a ±0.9 dB pump at the grain rate, so taking Fine tune off 0 by one
       * cent was an audible jump in level.
       * So for 0 < |v| < 1, a share of each window is its SQUARE (sin², cos²: equal-GAIN, summing to exactly 1 over
       * equal signals), handing back to today's window as the shift reaches a semitone: sin share b = |v|, sin² share
       * 1 − b. sin² is the sin window multiplied by itself (a gain node whose gain the window also drives), so it rides
       * the very same LFO and cannot drift out of phase with it.
       * ONLY WHILE FINE TUNE IS IN PLAY. A keyframed Semitones already glides through fractional values, and a saved
       * project's glide must sound exactly as it did, so with Fine tune at 0 the sin² depth is 0 (x + 0 = x) and every
       * window is today's, sample for sample. With Fine tune at 0 and Semitones static, v is a whole number anyway. */
      const sqA = s.gain(0), sqB = s.gain(0);   // gain 0 + the window on .gain, fed the window = the window squared
      winA.connect(sqA); winA.connect(sqA.gain);
      winB.connect(sqB); winB.connect(sqB.gain);
      const qA = s.gain(0), qB = s.gain(0);     // the squared window's depth — 0 unless Fine tune is in play
      sqA.connect(qA); qA.connect(wA.gain);
      sqB.connect(qB); qB.connect(wB.gain);
      wd.wet.connect(out);
      let st = Math.round(initNum(inst, 'semitones', 0, -24, 24));
      let ct = initNum(inst, 'cents', 0, -100, 100);   // Fine tune (#482 3.5)
      /* The values the knobs drive, as functions of v = Semitones + Fine tune / 100. Written once and read by EVERY path
         below (the build, a slider moved in the preview, the keyframed glide), because the static and animated versions
         differing by a stray sign is the kind of bug that only ever shows up as "the export sounds wrong", long after
         anyone would connect it to this. `fine` is the Fine tune term; only whether it is 0 matters (see above). */
      const dOf = function (v) { const r = Math.pow(2, v / 12); return Math.abs(1 - r) * G; };   // one grain's slide
      const upOf = function (v) { return Math.pow(2, v / 12) > 1; };
      const targets = function (v, fine) {
        const up = upOf(v), D = dOf(v);   // the ramp's slope IS 1 − ratio
        const long = v > LONG_AT, on = v ? 1 : 0;
        // the short lines never get asked for more than they hold (they are silent whenever it would be more)
        const Ds = Math.min(D, SHORT_MAX);
        const depth = long ? 0 : on, b = fine ? Math.min(1, Math.abs(v)) : 1;
        return [
          [gA.delayTime, up ? Ds : 0], [gB.delayTime, up ? Ds : 0],
          [gA2.delayTime, up ? D : 0], [gB2.delayTime, up ? D : 0],
          [mA.gain, up ? -D : D], [mB.gain, up ? -D : D],
          // At 0 st both lines carry the identical dry signal, and two equal-POWER windows over identical
          // signals sum to +3 dB, not unity. Hold line A wide open and mute line B instead — a real bypass.
          [lA.gain, depth * b], [lB.gain, depth * b], [qA.gain, depth * (1 - b)], [qB.gain, depth * (1 - b)],
          [wA.gain, v ? 0 : 1],
          [lA2.gain, long ? 1 : 0], [lB2.gain, long ? 1 : 0],
        ];
      };
      // At build: ASSIGNED, exactly as always — nothing is playing yet, and a saved project renders from these values.
      const built0 = targets(st + ct / 100, ct);
      built0.forEach(function (t) { t[0].value = t[1]; });
      /* ═══ A SLIDER MOVED WHILE THE PREVIEW PLAYS GLIDES, IT DOES NOT JUMP (#482 3.5 review) ═══════════════════════════
       * The live preview never rebuilds the chain for a moved value — applyAt hands the new value in, every frame. These
       * params used to be ASSIGNED, so each new value was a step: the grain delay jumped, the read position jumped with
       * it, and the sound clicked. Fine tune is the slider people drag in small steps while listening, so a drag crackled
       * end to end. MEASURED (tools/design/482/polish3/tone/clicks.js: applyAt every 16 ms in an OfflineAudioContext; a
       * click = the biggest jump in the waveform's slope in 2 ms, against the render's median): dragging Fine tune 0 → 60
       * scored 150, one step 30 → 31 cents 28, leaving 0 by one cent 49, a Semitones step 625; a steady tone scores 1.5.
       * So after the build every change RAMPS to where it is going, across SLEW (a screen frame and a bit).
       * ⚠️ A RAMP STILL UNDER WAY IS APPENDED TO, NEVER CANCELLED. The first version cancelled the ramp in flight and
       * re-anchored at "now" (cancelScheduledValues + setValueAtTime) — and still scored 32 on the drag, from ONE-SAMPLE
       * spikes at some frames and not others: an event time of ctx.currentTime can land a sample late once Chrome turns
       * it back into a frame, and that one sample then fell back to the value before the cancelled ramp. Only a ramp
       * shorter than a frame (never interrupted) was clean. So a new value is a linear ramp that starts where the last one
       * ends — nothing is ever removed from under the sample being played, and the path stays continuous however fast
       * the frames come. At rest, the ramp is anchored at the value the param rests on, which is known exactly.
       * THIS NEVER RUNS IN AN EXPORT: schedule() hands the static path the value the chain was built with, which changes
       * nothing (FM._pitchReshapes counts it), so every saved render is untouched. The KEYFRAMED preview (glide, set per
       * frame) is left as it was on purpose: ramping it would change today's keyframed-Semitones preview. */
      const SLEW = 0.02;
      let slewAt = -Infinity, slewTo = built0.map(function (t) { return t[1]; }), glided = false;
      const reshape = function (v, fine) {
        FM._pitchReshapes = (FM._pitchReshapes || 0) + 1;
        const now = ctx.currentTime, tg = targets(v, fine), end = now + SLEW;
        const again = now <= slewAt, moving = now < slewAt + SLEW;
        tg.forEach(function (t, i) {
          const ap = t[0];
          try {
            if (glided) { const cur = ap.value; ap.cancelScheduledValues(now); ap.setValueAtTime(cur, now); }   // a keyframed glide ran since
            else if (again) ap.cancelScheduledValues(end);   // a second move in the SAME frame (both keys at once): replace this frame's ramp, which has not begun
            else if (!moving) ap.setValueAtTime(slewTo[i], now);   // at rest: anchor on the value it rests at
            ap.linearRampToValueAtTime(t[1], end);
          } catch (e) { try { ap.value = t[1]; } catch (e2) {} }
        });
        slewAt = now; slewTo = tg.map(function (t) { return t[1]; }); glided = false;
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
      const kfd = function (key) { return FM.isAnimated(inst && inst.params ? inst.params[key] : undefined); };
      // The other key's value at the same scene moment, guarded like valueAt: a keyframed Fine tune read while
      // Semitones drives, or a plain Semitones read while a keyframed Fine tune drives.
      const other = function (key, t, lo, hi) {
        const raw = inst && inst.params ? inst.params[key] : undefined;
        let v = FM.isAnimated(raw) ? FM.evalProp(raw, isFinite(t) ? t : 0) : raw;
        if (typeof v !== 'number' || !isFinite(v)) v = 0;
        return clamp(v, lo, hi);
      };
      const glide = function (v, fine, when, ramp) {
        // Counted so the suite can prove a STATIC pitch never takes this path. Sound alone cannot police
        // that: scheduling one value 120 times renders identically to assigning it once. Same lesson as
        // the shaper-bank counter above, and as the motion-blur slice counter in queue 382.
        FM._pitchGlides = (FM._pitchGlides || 0) + 1;
        glided = true;
        targets(v, fine).forEach(function (t) {
          try { ramp ? t[0].linearRampToValueAtTime(t[1], when) : t[0].setValueAtTime(t[1], when); } catch (e) {}
        });
      };
      /* TWO KEYS, ONE SHIFT (#482 3.5). Both sliders feed v, and the scheduler hands each key its values separately
         (the whole window for Semitones, then the whole window for Fine tune), so the two cannot each glide on their
         own — the second would overwrite the first. So ONE key drives: Semitones when it is keyframed, reading Fine
         tune at the same scene moment (sceneT, which the chain passes), otherwise a keyframed Fine tune, reading the
         plain Semitones. The key that does not drive does nothing. With neither keyframed it is the static path, as
         before: whole semitones plus a plain Fine tune, assigned at the build and ramped when moved after it. */
      return unit({
        input: input, output: out, nodes: s.nodes, oscs: s.oscs, lfos: s.lfos,
        custom: {
          semitones: function (v, when, ramp, sceneT) {
            /* Gated on isAnimated, NOT on `when` — the static path calls set(key, value, 0), so `when`
               is 0 and not null. Guarding on `when == null` is exactly the bug the Distortion bank
               shipped with, where every static instance in every project quietly took the expensive
               path while sounding identical. */
            if (!kfd('semitones') && !kfd('cents')) { v = Math.round(clamp(v, -24, 24)); if (v !== st) { st = v; reshape(st + ct / 100, ct); } return; }
            if (!kfd('semitones')) return;   // a keyframed Fine tune drives, and reads this value itself
            const c = other('cents', sceneT, -100, 100);
            glide(clamp(v, -24, 24) + c / 100, c, Math.max(0, when || 0), !!ramp);
          },
          cents: function (v, when, ramp, sceneT) {
            if (!kfd('semitones') && !kfd('cents')) { v = clamp(v, -100, 100); if (v !== ct) { ct = v; reshape(st + ct / 100, ct); } return; }
            if (kfd('semitones')) return;    // a keyframed Semitones drives, and reads Fine tune at the same moment
            const c = clamp(v, -100, 100);
            glide(Math.round(other('semitones', sceneT, -24, 24)) + c / 100, c, Math.max(0, when || 0), !!ramp);
          },
          mix: wd.set,
        },
      });
    },
  });

  /* ═══ MIX AND OUTPUT ON EVERY EFFECT (#482 polish 8.1) ══════════════════════════════════════════════════════════════
   * Thirteen effects could be blended with the untouched sound and two could set their own level; the rest were all or
   * nothing at whatever level they came out. So every effect now ends in Output (−24…+12 dB, a gain after everything,
   * the Compressor's own control) and blends through Mix (0–1, untouched sound under the effect), both keyframable.
   * The effects that already have them keep their own — their Mix sits inside the effect, and the Compressor's ±24 dB and
   * the Distortion's −24…+6 dB Output keep their ranges, so nothing saved is clamped; the Limiter's stops at 0 dB
   * (`outputMax`, batch 8 review — above it Output would undo the Ceiling). Two do not get one: Gain / Boost,
   * whose one control IS its output (a Mix on a gain is only another gain), and Vocal Remove's Mix, which is its Amount.
   * HOW: around the effect's own build, never inside it (mixOutput): in → [the effect → wet] + [dry] → out, out's gain the
   * Output. The defaults are today's sound exactly: Mix 1 is wet × 1 + dry × 0 and Output 0 dB is × 1 (x·1 + y·0 = x in
   * IEEE floats), so a saved effect — the sanitiser fills both keys with def — renders the samples it always did. Three
   * gains and a sum for an effect that gains a Mix, one gain for an effect that only gains Output.
   * A DRY COPY THAT ARRIVES EARLY COMBS. Blending a sound with a copy of itself a few ms late notches it every 1 / (the
   * gap); the Limiter's node looks ahead 6 ms, so its Mix holds the dry copy back by the same frames (`dryLag`), exactly as
   * the Compressor's own Mix does. CLIP AT CEILING MAKES IT LATER STILL — not "a few frames": its 4× oversampler is 192
   * frames (4 ms at 48 kHz, OVERSAMPLE_FRAMES, measured in the suite's Chrome), so with the clip on and the dry copy held
   * back by the look-ahead alone, a click came out twice and a blend was notched every 250 Hz (the audio-reds hunt, 13 Oct).
   * So `dryLagWhile` ({ key, on, over }): while that key's switch is on, the dry copy also waits the oversampler's frames,
   * through a bypass pair of its own — [the extra frames → on] + [off] — switched by the same key with the same steps and
   * the same 20 ms live fade as the effect's own pair (pairTargets), so a live flip moves both copies together. Off is
   * x·1 + y·0: with the clip off the dry copy is the very samples it was.
   * Vibrato's 5 ms line is not lined up on purpose: a Vibrato blended with the dry sound IS a chorus, which is the point of
   * turning its Mix down. */
  // `outputMax` (batch 8 review): the Limiter's stops at 0 dB, so it cannot lift a sound past its own Ceiling.
  const outMax = d => (typeof d.outputMax === 'number' ? d.outputMax : 12);
  const OUTPUT_P = d => P('output', 'Output', -24, outMax(d), 0.5, 0, 'dB', true);
  const NO_MIX = { gain: 1, vocalremove: 1 }, NO_OUTPUT = { gain: 1 };
  function mixOutput(ctx, inst, d, u, addMix, addOut) {
    if (!u) return u;
    const nodes = [];
    const g = v => { const n = ctx.createGain(); n.gain.value = v; nodes.push(n); return n; };
    const out = g(addOut ? dbToLin(initNum(inst, 'output', 0, -24, outMax(d))) : 1);
    let input = u.input, mixSet = null, dryFlip = null;
    if (addMix) {
      const m0 = initNum(inst, 'mix', 1, 0, 1);
      const inG = g(1), wet = g(m0), dry = g(1 - m0);
      inG.connect(u.input); u.output.connect(wet); wet.connect(out);
      let from = inG;
      if (d.dryLag) { const lag = ctx.createDelay(0.05); lag.delayTime.value = d.dryLag(ctx); nodes.push(lag); inG.connect(lag); from = lag; }
      // While d.dryLagWhile's key is on, the dry copy also waits for the oversampler that key switches in (see above).
      if (d.dryLagWhile) {
        const w = d.dryLagWhile;
        const extra = dryLine(mx => { const n = ctx.createDelay(mx); nodes.push(n); return n; }, oversampleSecs(ctx, w.over));
        const pair = bypassPair({ gain: g }, from, extra, extra, w.on(staticOf(inst, d.type, w.key)));
        dryFlip = multi(pairTargets(pair, w.on));
        from = pair.out;
      }
      from.connect(dry); dry.connect(out);
      input = inG;
      mixSet = multi([[wet.gain, null], [dry.gain, x => 1 - x]]);
    } else u.output.connect(out);
    const own = key => (addMix && key === 'mix') || (addOut && key === 'output');
    const drive = function (key, v, when, ramp) {
      if (key === 'mix') { mixSet(v, when, ramp); return; }
      const x = dbToLin(v);
      if (ramp) out.gain.linearRampToValueAtTime(x, when); else out.gain.setValueAtTime(x, when);
    };
    // The effect's own setter still gets the key; the dry copy's pair follows it, value for value.
    const flipDry = function (key, v, when, ramp) { if (dryFlip && key === d.dryLagWhile.key) dryFlip(v, when, ramp); };
    return {
      input: input, output: out, window: u.window, meter: u.meter, arm: u.arm,
      param: function (key) { return own(key) ? null : u.param(key); },
      set: function (key, v, when, sceneT) { if (own(key)) drive(key, v, when, false); else { u.set(key, v, when, sceneT); flipDry(key, v, when, false); } },
      ramp: function (key, v, when, sceneT) { if (own(key)) drive(key, v, when, true); else { u.ramp(key, v, when, sceneT); flipDry(key, v, when, true); } },
      dispose: function () { u.dispose(); nodes.forEach(n => { try { n.disconnect(); } catch (e) {} }); },
    };
  }
  DEFS.forEach(function (d) {
    const has = k => d.params.some(p => p.key === k);
    const addMix = !has('mix') && !NO_MIX[d.type], addOut = !has('output') && !NO_OUTPUT[d.type];
    if (addOut) {   // just above Mix where the effect has one, as on the Compressor and the Distortion
      const mi = d.params.findIndex(p => p.key === 'mix');
      if (mi >= 0) d.params.splice(mi, 0, OUTPUT_P(d)); else d.params.push(OUTPUT_P(d));
    }
    if (addMix) d.params.push(MIX(1));
    if (!addMix && !addOut) return;
    const build = d.build;
    d.build = function (ctx, inst) { return mixOutput(ctx, inst, d, build.call(d, ctx, inst), addMix, addOut); };
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
    pitch: ['chipmunk', 'deep voice', 'helium', 'higher', 'lower', 'key', 'voice changer', 'fine tune', 'detune'],   // the last two: #482 3.5's Fine tune
  };
  DEFS.forEach(d => { d.tags = TAGS[d.type] || []; });

  /* ═══ STARTING POINTS INSIDE AN EFFECT (#482 polish 8.2) ═══════════════════════════════════════════════════════════════
   * The backlog's table: a few named settings per effect, each a set of values written in ONE go — the rule Telephone's
   * Style already follows (fxSegment `sets`: one tap, one undo step). Each names every control that shapes the character,
   * so the result does not depend on what was set before; Output is never in one, so a preset does not jump the level.
   * The numbers are reasoned, not yet heard (a small room is short and close, a cathedral long and late; a slapback is
   * one quick repeat): Ezra hears them and adjusts before they ship. THE CHIPS THAT OFFER THEM ARE NOT BUILT:
   * a new row of buttons at the top of an open effect is drawn and picked first (#545); this is the half they will call
   * (FM.audioFxPresets.apply) and "Save as my preset" (FM.audioFxPresets.save / mine). One table, read in one place. */
  const PRESETS = {
    reverb: [   // damping (#482 9.8): soft furnishings and big stone rooms darken; tiles and a plate stay bright
      ['Small room', { size: 0.25, decay: 0.6, damping: 0.4, predelay: 0.005, highcut: 9000, lowcut: 120, width: 0.7, mix: 0.2 }],
      ['Bathroom', { size: 0.15, decay: 1.2, damping: 0, predelay: 0.002, highcut: 12000, lowcut: 150, width: 0.6, mix: 0.35 }],
      ['Hall', { size: 0.75, decay: 2.8, damping: 0.3, predelay: 0.03, highcut: 8000, lowcut: 80, width: 1, mix: 0.3 }],
      ['Cathedral', { size: 1, decay: 6.5, damping: 0.5, predelay: 0.06, highcut: 6000, lowcut: 60, width: 1, mix: 0.4 }],
      ['Plate', { size: 0.55, decay: 1.8, damping: 0, predelay: 0.01, highcut: 14000, lowcut: 200, width: 0.9, mix: 0.3 }],
    ],
    delay: [   // Tempo 0 in each: a preset's Time is meant to be heard, not overridden by a tempo set earlier (8.7)
      ['Slapback', { time: 0.09, bpm: 0, feedback: 0.1, tone: 20000, lowcut: 20, wobble: 0, mix: 0.3 }],
      ['Tape', { time: 0.35, bpm: 0, feedback: 0.45, tone: 4500, lowcut: 150, wobble: 0.4, mix: 0.35 }],
      ['Canyon', { time: 1.2, bpm: 0, feedback: 0.6, tone: 6000, lowcut: 100, wobble: 0, mix: 0.4 }],
    ],
    compressor: [
      ['Voice', { threshold: -20, ratio: 3, attack: 0.01, release: 0.15, knee: 6 }],
      ['Glue', { threshold: -12, ratio: 2, attack: 0.03, release: 0.3, knee: 10 }],
      ['Squash', { threshold: -35, ratio: 10, attack: 0.002, release: 0.1, knee: 3 }],
    ],
    eq3: [
      ['Voice clarity', { low: -4, mid: 3, high: 3, lowFreq: 120, midFreq: 3000, midWidth: 1.2, highFreq: 8000 }],
      ['Bass boost', { low: 6, mid: 0, high: 0, lowFreq: 100, midFreq: 1000, midWidth: 1, highFreq: 4000 }],
      ['De-mud', { low: 0, mid: -5, high: 1, lowFreq: 250, midFreq: 350, midWidth: 1.2, highFreq: 6000 }],
    ],
    distortion: [   // Auto level on in all three, so picking one changes the grit and not the volume (batch 7, C19)
      ['Warm', { drive: 15, curve: 2, tone: 8000, autogain: 1 }],
      ['Crunch', { drive: 45, curve: 1, tone: 6000, autogain: 1 }],
      ['Fuzz', { drive: 80, curve: 3, tone: 5000, autogain: 1 }],
    ],
    pitch: [
      ['Chipmunk', { semitones: 7, cents: 0 }],
      ['Helium', { semitones: 12, cents: 0 }],
      ['Deep', { semitones: -5, cents: 0 }],
      ['Monster', { semitones: -12, cents: 0 }],
    ],
  };
  DEFS.forEach(d => { d.presets = PRESETS[d.type] || []; });

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
    /* The values of an instance's `rebuild` controls (#482 polish 7.1), for the live preview's signature: a chain built
       with one curve or one voice count is a different graph from another, so moving one must rebuild it. Read exactly as
       the build reads them (valueAt). '' for an effect with none, so every other effect's signature is what it was. */
    rebuildKey: function (inst) {
      const d = inst && REG[inst.type];
      if (!d) return '';
      let s = '';
      /* `rebuildIf` (#482 7.8, Chorus Spread): a keyframable control that only changes the graph across one line — being off
         or being in use at all — maps its STORED value (a number or keyframes) to what the build branches on, so a drag
         that stays on one side of the line never rebuilds. */
      for (let i = 0; i < d.params.length; i++) {
        const p = d.params[i];
        if (p.rebuild) s += ':' + p.key + '=' + (p.rebuildIf ? p.rebuildIf(inst.params ? inst.params[p.key] : undefined) : valueAt(inst, p, 0));
      }
      return s;
    },
    // The shipped starting points of one effect (#482 polish 8.2), as fresh copies: [{ name, params }].
    presetsOf: function (id) { return ((REG[id] && REG[id].presets) || []).map(p => ({ name: p[0], params: Object.assign({}, p[1]) })); },
  };

  /* ═══ APPLYING ONE, AND THE ONES HE SAVES (#482 polish 8.2) ═══════════════════════════════════════════════════════════
   * apply(inst, preset) writes a preset's values into an effect in one go and returns the keys it wrote (null if nothing
   * fitted): each value is read the way the chain reads it (valueAt — clamped into its range, a choice snapped to an
   * option, an on/off to 0/1), so a preset from an older build or a hand-edited store cannot put a value on an effect that
   * the effect cannot play; a key the effect does not have is skipped. A keyframed control it names is replaced by the
   * plain value, as Telephone's Style replaces its four. The caller commits once (afterAudioFx), so it is one undo step.
   * "Save as my preset" keeps the effect's plain values under a name, per effect, in localStorage (fx-presets.js's
   * pattern): a keyframed control is left out — a starting point is one setting, not a move. Every read re-checks the
   * store (type, name, keys, numbers), because anything can be in localStorage. */
  const AFX_PRESET_KEY = 'fm.afx.userpresets', AFX_PRESET_MAX = 120;
  function cleanValues(type, raw) {
    const out = {};
    if (!raw || typeof raw !== 'object') return out;
    ((REG[type] && REG[type].params) || []).forEach(p => {
      if (!Object.prototype.hasOwnProperty.call(raw, p.key)) return;
      const v = raw[p.key];
      if (typeof v === 'number' && isFinite(v)) out[p.key] = valueAt({ params: { [p.key]: v } }, p, 0);
    });
    return out;
  }
  function readMine() {
    let a = [];
    try { a = JSON.parse(localStorage.getItem(AFX_PRESET_KEY) || '[]'); } catch (e) { a = []; }
    return Array.isArray(a) ? a : [];
  }
  FM.audioFxPresets = {
    apply: function (inst, preset) {
      if (!inst || !REG[inst.type] || !preset) return null;
      const vals = cleanValues(inst.type, preset.params), keys = Object.keys(vals);
      if (!keys.length) return null;
      if (!inst.params || typeof inst.params !== 'object') inst.params = {};
      keys.forEach(k => { inst.params[k] = vals[k]; });
      return keys;
    },
    // His saved ones for one effect, newest first, each checked: [{ name, params }].
    mine: function (id) {
      if (!REG[id]) return [];
      return readMine().filter(x => x && x.type === id && typeof x.name === 'string' && x.name.trim())
        .map(x => ({ name: x.name.trim().slice(0, 40), params: cleanValues(id, x.params) }))
        .filter(x => Object.keys(x.params).length);
    },
    // Saves `inst`'s plain values as `name` (replacing one of the same name on the same effect). True only if it is on disk.
    save: function (inst, name) {
      const nm = String(name || '').trim().slice(0, 40);
      if (!inst || !REG[inst.type] || !nm) return false;
      const params = cleanValues(inst.type, inst.params);
      if (!Object.keys(params).length) return false;
      // The raw list, not mine(): an entry this build cannot read (an effect it does not have) is kept, never dropped.
      const arr = readMine().filter(x => !(x && x.type === inst.type && typeof x.name === 'string' && x.name.trim() === nm)).slice(0, AFX_PRESET_MAX - 1);
      arr.unshift({ type: inst.type, name: nm, params: params });
      try { localStorage.setItem(AFX_PRESET_KEY, JSON.stringify(arr)); return true; }
      catch (e) { if (FM.toast) FM.toast('Storage full — preset not saved', 3200); return false; }
    },
    remove: function (id, name) {
      const nm = String(name || '').trim();
      const arr = readMine().filter(x => !(x && x.type === id && typeof x.name === 'string' && x.name.trim() === nm));
      try { localStorage.setItem(AFX_PRESET_KEY, JSON.stringify(arr)); return true; } catch (e) { return false; }
    },
    _storageKey: AFX_PRESET_KEY,   // suite seam
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
          for (let j = 0; j < ps.length; j++) b.u.set(ps[j].key, valueAt(b.inst, ps[j], sceneTime), when, sceneTime);
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
                if (k === 0) b.u.set(p.key, v, ct, sceneT); else b.u.ramp(p.key, v, ct, sceneT);
              }
            } else {
              b.u.set(p.key, valueAt(b.inst, p, fromScene), 0, fromScene);
            }
          }
        }
      },
      /* The meter (unit.meter) the effect instance `inst` built in THIS chain (#482 polish 3.7), or null — matched by
         identity, the same way the live chain is tied to its instances (audio-fx-live.js chainIsCurrent). */
      meterOf: function (inst) {
        for (let i = 0; i < built.length; i++) if (built[i].inst === inst) return built[i].u.meter || null;
        return null;
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
