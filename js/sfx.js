/* FreeMotion — sound effects (queue 196).
 *
 * Ezra: "in the audio tab we will add a button that is sound effects and you will be able to use that
 * to add sound effects to the project, we will have a sound effects menu with a bunch of our own sound
 * effects and some royalty free ones we find online, that we can legally use for free." — and then, of
 * the plan below: "Good ideas btw for the sound effects menu."
 *
 * THESE ARE SYNTHESISED, NOT SAMPLED, and that is the whole design decision:
 *   · Licence. "Royalty free ones we find online" needs sources whose terms are explicit, and a wrong
 *     guess is the kind of mistake that follows an app around. Sound built out of oscillators and noise
 *     has no licence question at all — it is ours by construction.
 *   · Weight. This is a local-only, no-build app that everyone downloads whole and the service worker
 *     then caches. A folder of WAVs is megabytes on every first load; this file is a few kilobytes and
 *     renders on demand.
 *   · They are OURS. A pack of stock whooshes is what every other editor ships. These are tuned to this
 *     app, and any of them can be re-tuned by changing a number here rather than by finding a new file.
 * The menu takes real files later without changing: everything below produces a WAV Blob, and the add
 * path is the same one the voice recorder already uses (File → FM.loadVideoFile → FM.addMediaLayer),
 * so an effect arrives in the timeline as an ordinary audio clip that trims, fades and exports like any
 * other. Nothing downstream knows it was generated.
 */
window.FM = window.FM || {};
(function (FM) {
  'use strict';

  const SR = 44100;

  // ---- little DSP helpers -----------------------------------------------------------------------
  // Every recipe below is written against these, so the catalogue reads as sound design rather than
  // as Web Audio boilerplate.
  /* SEEDED, NOT Math.random (queue 709). This file's own promise — "the same effect renders the same twice" —
     was false for every recipe that used this buffer: each render drew fresh noise, so a preview and its added
     clip differed, and Glass break's peak sat at 1.0 ± 1% and failed its test one run in several. mulberry32
     seeded from the request itself (length, colour, rate) gives identical samples for identical requests and
     different noise for different buffers, which is all the ear ever needed. */
  function seeded(seed) { let a = seed >>> 0; return function () { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  /* ═══ …BUT NOT THE SAME NOISE TWICE IN ONE SOUND (queue 986, hunt C11) ═══════════════════════════════════
     Seeded by (length, colour, rate) alone, every buffer of the same length and colour in one render was the
     SAME noise. MEASURED at 768c83d0: Fire crackle's 10 crackles were one buffer ten times, Ticking build's
     29 ticks one buffer 29 times, Camera shutter's two clicks one buffer twice — a fire that crackles the same
     crackle, a clock with one tick. So the seed also counts how many times it has already been handed out IN
     THIS CONTEXT: the first request for a seed gets exactly the stream it always did (every sound with no
     repeated buffer renders byte-for-byte as before, and so does each sound's first crackle), a repeat gets a
     stream of its own. Still stateless where it matters: Add and the ▶ each render into a FRESH
     OfflineAudioContext and the recipes ask in a fixed order, so the same sound renders the same twice. And it
     is structural, so a recipe written tomorrow cannot fall into it. */
  const _seedUse = new WeakMap();   // context -> Map(seed -> times already handed out in it)
  function noiseSeed(ctx, base) {
    let used = _seedUse.get(ctx);
    if (!used) { used = new Map(); _seedUse.set(ctx, used); }
    const k = used.get(base) || 0;
    used.set(base, k + 1);
    return k ? (Math.imul(base ^ 0x5bd1e995, 0x9E3779B1) + Math.imul(k, 0x85EBCA6B)) >>> 0 : base;
  }
  function noiseBuffer(ctx, secs, colour) {
    const n = Math.max(1, Math.floor(secs * ctx.sampleRate));
    const buf = ctx.createBuffer(1, n, ctx.sampleRate);
    const d = buf.getChannelData(0);
    const rnd = seeded(noiseSeed(ctx, n * 31 + (colour === 'brown' ? 7 : colour === 'pink' ? 11 : 3) + Math.floor(ctx.sampleRate / 100)));
    let last = 0, b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
    for (let i = 0; i < n; i++) {
      const w = rnd() * 2 - 1;
      /* 'pink' WAS WHITE (queue 743, hunt MEDIUM #26): two recipes asked for it and got static. Paul Kellet's filter — the
         usual 1/f approximation, −3 dB per octave — so a pass-by and a vinyl crackle sit between air and hiss. */
      if (colour === 'pink') {
        b0 = 0.99886 * b0 + w * 0.0555179; b1 = 0.99332 * b1 + w * 0.0750759; b2 = 0.96900 * b2 + w * 0.1538520;
        b3 = 0.86650 * b3 + w * 0.3104856; b4 = 0.55000 * b4 + w * 0.5329522; b5 = -0.7616 * b5 - w * 0.0168980;
        d[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362) * 0.11; b6 = w * 0.115926;
        continue;
      }
      // 'brown' integrates white noise: far more low end, which is what makes a whoosh feel like air
      // rather than like static.
      if (colour === 'brown') { last = (last + 0.02 * w) / 1.02; d[i] = last * 3.5; }
      else d[i] = w;
    }
    return buf;
  }
  function env(param, t0, pts) {           // [[timeOffset, value], …] with the first set flat
    param.setValueAtTime(pts[0][1], t0 + pts[0][0]);
    for (let i = 1; i < pts.length; i++) param.linearRampToValueAtTime(pts[i][1], t0 + pts[i][0]);
  }
  function expTo(param, t0, from, to, secs) {
    param.setValueAtTime(from, t0);
    param.exponentialRampToValueAtTime(Math.max(1e-4, to), t0 + secs);
  }

  /* ═══ NATURE BEDS AT USABLE LENGTHS (#482 polish 9.3, his #966 steer; backlog C21's second half) ═══════════════
     Wind, Rain, Fire crackle and Vinyl crackle are 2.2–2.6 s long and fade to nothing at both ends, so the only way to
     cover a 30 s shot was to lay copies end to end — and every join dips to silence. Each of the four now has a BED: the
     same sound held for as long as asked (BED_LENGTHS, the backlog's 2.5 / 10 / 30 / 60 s), with fixed 0.3 s fades at
     the very start and end (BED_EDGE), or LOOP-READY: no fades at all, and the last half second crossfaded into the first
     (loopFold), so the clip's end runs straight on into its start and a looped clip has no seam.
     NOTHING CHANGES UNTIL AN OPTION IS ASKED FOR. renderBuffer(def) with no options (every row in the list, every Add
     today) runs the recipe exactly as before, sample for sample; a bed is only built from options, which the "options
     before adding" drawer (backlog 9.2, drawn and shown to him first) will offer. Until then the bed is reached through
     FM.sfx.renderBuffer / preview / add with an options object. Seeded throughout (never Math.random), so the same
     options render the same twice — this file's queue 709 promise. */
  const BED_LENGTHS = [2.5, 10, 30, 60];
  const BED_MIN = 2.5, BED_MAX = 60, BED_EDGE = 0.3, LOOP_XFADE = 0.5;
  /* A ▶ of a long bed plays its first PREVIEW_MAX seconds (backlog 9.3: "preview capped at about 8 s"): the buffer is the
     one Add puts on the timeline (queue 986 C10), only the listening stops early. */
  const PREVIEW_MAX = 8;
  /* The options a sound takes, cleaned (a drawer, a file or a test can hand in anything): null when there are none — and
     then the sound is today's recipe. `length` a number of seconds (2.5–60), `loop` true; Rain also takes `intensity`
     and `surface` (9.4). */
  function bedOpts(def, opts) {
    if (!def || typeof def.bed !== 'function' || !opts || typeof opts !== 'object') return null;
    const o = {};
    if (typeof opts.length === 'number' && isFinite(opts.length)) o.length = Math.max(BED_MIN, Math.min(BED_MAX, opts.length));
    if (opts.loop === true) o.loop = true;
    (def.bedExtras || []).forEach(k => { const allowed = BED_EXTRAS[k]; if (allowed && allowed.indexOf(opts[k]) >= 0) o[k] = opts[k]; });
    return Object.keys(o).length ? o : null;
  }
  const BED_EXTRAS = { intensity: ['light', 'medium', 'heavy'], surface: ['open', 'roof'] };   // the values each extra takes (9.4)
  // Rain's Intensity (9.4): drops a second, the wash's level under them, and its top (Hz). Reasoned numbers, not yet heard.
  const RAIN_DROPS = { light: { rate: 20, bed: 0.2, top: 6000 }, medium: { rate: 60, bed: 0.28, top: 7000 }, heavy: { rate: 120, bed: 0.38, top: 8000 } };
  /* LOOP-READY: `buf` was rendered `secs` + LOOP_XFADE long with no fades. The first LOOP_XFADE of the result is the
     render's own start fading in under the half second that followed `secs` fading out — equal power (sin / cos), because
     the two are unrelated noise — so sample 0 IS the render's sample at `secs`, the very next one after the result's last.
     Played round, the clip runs on with no join. */
  function loopFold(ctx, buf, secs) {
    const N = Math.round(secs * buf.sampleRate), X = buf.length - N, src = buf.getChannelData(0);
    const out = ctx.createBuffer(1, N, buf.sampleRate), d = out.getChannelData(0);
    d.set(src.subarray(0, N));
    for (let i = 0; i < X && i < N; i++) {
      const w = (i / X) * Math.PI / 2;
      d[i] = src[i] * Math.sin(w) + src[N + i] * Math.cos(w);
    }
    return out;
  }
  /* A TRACK OF SHORT SOUNDS (9.3 / 9.4). A minute of Fire holds about 250 crackles and a minute of heavy Rain 7200 drops;
     as nodes that is three nodes each, a graph no phone should be asked to run. So each event is written straight into
     one buffer — the same recipe the short sound plays with nodes (a seeded noise burst through a band-pass, or a little
     triangle tone, under a linear attack and an exponential fall to 1e-4) — and one source plays the lot. The band-pass is
     the Web Audio one (RBJ, 0 dB at its centre). `rnd` is a seeded stream. */
  function burst(d, sr, rnd, at, o) {
    const i0 = Math.round(at * sr), n = Math.min(d.length - i0, Math.ceil(o.len * sr));
    if (i0 < 0 || n <= 0) return;
    let k = null, x1 = 0, x2 = 0, y1 = 0, y2 = 0, ph = 0;
    if (o.f) { const w0 = 2 * Math.PI * Math.min(o.f, sr * 0.45) / sr, al = Math.sin(w0) / (2 * o.q), a0 = 1 + al; k = [al / a0, 0, -al / a0, -2 * Math.cos(w0) / a0, (1 - al) / a0]; }
    for (let i = 0; i < n; i++) {
      const t = i / sr;
      let x;
      if (o.tone) { const p = ph - Math.floor(ph); x = p < 0.25 ? 4 * p : (p < 0.75 ? 2 - 4 * p : 4 * p - 4); ph += o.tone / sr; }
      else x = rnd() * 2 - 1;
      let y = x;
      if (k) { y = k[0] * x + k[1] * x1 + k[2] * x2 - k[3] * y1 - k[4] * y2; x2 = x1; x1 = x; y2 = y1; y1 = y; }
      const e = t < o.atk ? o.peak * t / o.atk : (t < o.dec ? o.peak * Math.pow(1e-4 / o.peak, (t - o.atk) / (o.dec - o.atk)) : 1e-4);
      d[i0 + i] += y * e;
    }
  }
  // A buffer of `secs` filled by fill(d, sr), played from t0 into `out` — the one source a track needs.
  function playTrack(ctx, t0, secs, out, fill) {
    const buf = ctx.createBuffer(1, Math.max(1, Math.ceil(secs * ctx.sampleRate)), ctx.sampleRate);
    fill(buf.getChannelData(0), ctx.sampleRate);
    const src = ctx.createBufferSource(); src.buffer = buf;
    src.connect(out); src.start(t0); src.stop(t0 + secs);
  }
  // Seeded event times: a gap of mean `mean` seconds (never under `min`) from `from` to `to`.
  function eventTimes(rnd, from, to, mean, min) {
    const ts = [];
    for (let t = from + rnd() * mean; t < to; t += Math.max(min, -Math.log(1 - rnd() * 0.999) * mean)) ts.push(t);
    return ts;
  }

  /* ---- the catalogue ---------------------------------------------------------------------------
   * Each entry renders itself into an OfflineAudioContext. `dur` is the whole tail, so a clip lands in
   * the timeline at its real length — a whoosh cut off by its own clip length is the first thing that
   * would get reported. */
  const SFX = [
    // ---------- movement ----------
    {
      id: 'whoosh', name: 'Whoosh', cat: 'Movement', dur: 0.9,
      render(ctx, t0, d, out) {
        const src = ctx.createBufferSource(); src.buffer = noiseBuffer(ctx, d, 'brown');
        const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.Q.value = 1.1;
        // the sweep IS the movement: low → high → low reads as something passing you
        env(bp.frequency, t0, [[0, 320], [d * 0.45, 2600], [d, 420]]);
        const g = ctx.createGain();
        env(g.gain, t0, [[0, 0], [d * 0.28, 0.9], [d * 0.55, 0.55], [d, 0]]);
        src.connect(bp); bp.connect(g); g.connect(out);
        src.start(t0); src.stop(t0 + d);
      },
    },
    {
      id: 'swish', name: 'Swish', cat: 'Movement', dur: 0.34,
      render(ctx, t0, d, out) {
        const src = ctx.createBufferSource(); src.buffer = noiseBuffer(ctx, d, 'white');
        const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.Q.value = 2.4;
        env(bp.frequency, t0, [[0, 1200], [d, 5200]]);
        const g = ctx.createGain();
        env(g.gain, t0, [[0, 0], [0.02, 0.85], [d, 0]]);
        src.connect(bp); bp.connect(g); g.connect(out);
        src.start(t0); src.stop(t0 + d);
      },
    },
    {
      id: 'reverse-whoosh', name: 'Reverse whoosh', cat: 'Movement', dur: 1.1,
      render(ctx, t0, d, out) {
        const src = ctx.createBufferSource(); src.buffer = noiseBuffer(ctx, d, 'brown');
        const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.Q.value = 1.3;
        env(bp.frequency, t0, [[0, 300], [d, 4200]]);
        const g = ctx.createGain();
        // swells INTO the cut instead of decaying away from it — the point of a reverse
        env(g.gain, t0, [[0, 0], [d * 0.85, 0.95], [d, 0]]);
        src.connect(bp); bp.connect(g); g.connect(out);
        src.start(t0); src.stop(t0 + d);
      },
    },
    // ---------- impact ----------
    {
      id: 'impact', name: 'Impact', cat: 'Impact', dur: 1.4,
      render(ctx, t0, d, out) {
        const o = ctx.createOscillator(); o.type = 'sine';
        expTo(o.frequency, t0, 150, 32, d * 0.8);       // the drop is what makes it hit
        const og = ctx.createGain(); env(og.gain, t0, [[0, 0.95], [d * 0.9, 0.06], [d, 0]]);
        o.connect(og); og.connect(out);
        o.start(t0); o.stop(t0 + d);
        const n = ctx.createBufferSource(); n.buffer = noiseBuffer(ctx, 0.14, 'white');
        const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 1800;
        const ng = ctx.createGain(); env(ng.gain, t0, [[0, 0.5], [0.13, 0]]);
        n.connect(lp); lp.connect(ng); ng.connect(out);
        n.start(t0); n.stop(t0 + 0.14);
      },
    },
    {
      id: 'thud', name: 'Thud', cat: 'Impact', dur: 0.5,
      render(ctx, t0, d, out) {
        const o = ctx.createOscillator(); o.type = 'sine';
        expTo(o.frequency, t0, 190, 55, d * 0.5);
        const g = ctx.createGain(); env(g.gain, t0, [[0, 0.9], [d * 0.6, 0.05], [d, 0]]);
        o.connect(g); g.connect(out);
        o.start(t0); o.stop(t0 + d);
      },
    },
    {
      id: 'sub-drop', name: 'Sub drop', cat: 'Impact', dur: 1.9,
      render(ctx, t0, d, out) {
        const o = ctx.createOscillator(); o.type = 'sine';
        expTo(o.frequency, t0, 90, 24, d * 0.85);
        const g = ctx.createGain(); env(g.gain, t0, [[0, 0], [0.05, 0.95], [d * 0.8, 0.5], [d, 0]]);
        o.connect(g); g.connect(out);
        o.start(t0); o.stop(t0 + d);
      },
    },
    // ---------- build ----------
    {
      id: 'riser', name: 'Riser', cat: 'Build', dur: 2.2,
      render(ctx, t0, d, out) {
        const src = ctx.createBufferSource(); src.buffer = noiseBuffer(ctx, d, 'white');
        const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.Q.value = 3.2;
        expTo(bp.frequency, t0, 400, 8000, d);
        const g = ctx.createGain(); env(g.gain, t0, [[0, 0.05], [d * 0.92, 0.85], [d, 0]]);
        src.connect(bp); bp.connect(g); g.connect(out);
        src.start(t0); src.stop(t0 + d);
        const o = ctx.createOscillator(); o.type = 'sawtooth';
        expTo(o.frequency, t0, 110, 1500, d);
        const og = ctx.createGain(); env(og.gain, t0, [[0, 0], [d * 0.9, 0.22], [d, 0]]);
        o.connect(og); og.connect(out);
        o.start(t0); o.stop(t0 + d);
      },
    },
    {
      id: 'build-tick', name: 'Ticking build', cat: 'Build', dur: 2.0,
      render(ctx, t0, d, out) {
        /* Ticks accelerate toward the end — tension without a pitch sweep.
         * THE GAP NEEDS A FLOOR. Written as `gap *= 0.82` with no lower bound it is a geometric series:
         * the intervals sum to 0.24/(1−0.82) = 1.33s and `t` can never reach a 2s duration, so the loop
         * never ends. It hung the render outright — sixteen effects, no output, no error. A floor makes
         * it terminate AND is the better sound: below about 45ms apart, ticks stop being countable and
         * turn into a buzz. */
        let t = 0, gap = 0.24;
        while (t < d - 0.02) {
          const n = ctx.createBufferSource(); n.buffer = noiseBuffer(ctx, 0.03, 'white');
          const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 2600;
          const g = ctx.createGain();
          env(g.gain, t0 + t, [[0, 0.5 * (0.4 + 0.6 * (t / d))], [0.028, 0]]);
          n.connect(hp); hp.connect(g); g.connect(out);
          n.start(t0 + t); n.stop(t0 + t + 0.03);
          t += gap; gap = Math.max(0.045, gap * 0.82);
        }
      },
    },
    // ---------- interface ----------
    {
      id: 'click', level: 0.55, name: 'Click', cat: 'Interface', dur: 0.09,
      render(ctx, t0, d, out) {
        const n = ctx.createBufferSource(); n.buffer = noiseBuffer(ctx, d, 'white');
        const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 1800;
        const g = ctx.createGain(); env(g.gain, t0, [[0, 0.75], [0.05, 0]]);
        n.connect(hp); hp.connect(g); g.connect(out);
        n.start(t0); n.stop(t0 + d);
      },
    },
    {
      id: 'pop', level: 0.7, name: 'Pop', cat: 'Interface', dur: 0.22,
      render(ctx, t0, d, out) {
        const o = ctx.createOscillator(); o.type = 'sine';
        expTo(o.frequency, t0, 520, 180, 0.12);
        const g = ctx.createGain(); env(g.gain, t0, [[0, 0], [0.008, 0.9], [0.16, 0]]);
        o.connect(g); g.connect(out);
        o.start(t0); o.stop(t0 + d);
      },
    },
    {
      id: 'ding', name: 'Ding', cat: 'Interface', dur: 1.5,
      render(ctx, t0, d, out) {
        // two partials a fifth apart, the upper decaying faster — a bell rather than a beep
        [[880, 0.55, 1.0], [1320, 0.3, 0.55]].forEach(([f, a, dec]) => {
          const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.value = f;
          const g = ctx.createGain();
          g.gain.setValueAtTime(0, t0);
          g.gain.linearRampToValueAtTime(a, t0 + 0.006);
          g.gain.exponentialRampToValueAtTime(0.0001, t0 + d * dec);
          o.connect(g); g.connect(out);
          o.start(t0); o.stop(t0 + d);
        });
      },
    },
    /* BELL (queue 563). Ezra: "Add a bell sound effect also".
     * ⚠️ THE HARD PART WAS NOT MAKING A SOUND, IT WAS NOT DUPLICATING `ding` — which sits directly above
     * this and whose own comment already claims to be "a bell rather than a beep". Two sine partials a
     * fifth apart is a chime; adding a third would have given him the same sound under a second name.
     * So this is built the way a struck bell actually behaves, and the differences are audible:
     *  · INHARMONIC partials. A bell's overtones are not integer multiples — the ratios below are the
     *    classic hum / prime / TIERCE / quint / nominal set, and the tierce at 1.2x is a MINOR third,
     *    which is the interval that makes a bell sound like a bell rather than like an organ.
     *  · THE HIGH PARTIALS DIE FIRST (decay falls 1.0 -> 0.16 as the ratio rises), so the tone darkens
     *    as it rings out. A bell that decays evenly sounds synthetic.
     *  · A STRIKE. 18ms of band-passed noise at the attack is the clapper hitting metal; without it the
     *    note fades in like a synth pad no matter how fast the envelope is.
     *  · A SMALL DETUNE on the prime, so the two closest partials beat slowly against each other. That
     *    shimmer is what stops it sounding like a sampled loop.
     * Measured against `ding` rather than assumed: see queue 563 in REQUESTS.md. */
    {
      id: 'bell', name: 'Bell', cat: 'Interface', dur: 2.6,
      render(ctx, t0, d, out) {
        const F = 523.25;   // C5 — bright enough to cut through, low enough not to be shrill
        // [ratio, amplitude, decay as a fraction of d, detune cents]
        /* ⚠️ THESE AMPLITUDES ARE SET FOR THE **PREVIEW**, WHICH IS NOT NORMALISED. `renderBuffer`
           runs `normalise()` so an ADDED clip is always safe whatever these say — but `preview()`
           plays the raw render through a fixed 0.82 gain, so a recipe that sums past ~1.2 clips on
           the ▶ and nowhere else. Measured: at the first values I wrote, eight partials plus the
           strike peaked at 1.244 raw = **1.02 in preview**, i.e. clipping. Scaled to 1.03 raw =
           0.85 in preview, which sits just under Punch (0.946) and beside Heartbeat (0.818). */
        [[0.5, 0.13, 1.00, 0], [1.0, 0.42, 0.92, 0], [1.0, 0.13, 0.88, 7],
         [1.2, 0.25, 0.62, 0], [1.5, 0.14, 0.48, 0], [2.0, 0.17, 0.40, 0],
         [2.66, 0.09, 0.26, 0], [4.2, 0.06, 0.16, 0]].forEach(([r, a, dec, cents]) => {
          const o = ctx.createOscillator(); o.type = 'sine';
          o.frequency.value = F * r;
          if (cents) o.detune.value = cents;
          const g = ctx.createGain();
          g.gain.setValueAtTime(0, t0);
          g.gain.linearRampToValueAtTime(a, t0 + 0.004);
          g.gain.exponentialRampToValueAtTime(0.0001, t0 + d * dec);
          o.connect(g); g.connect(out);
          o.start(t0); o.stop(t0 + d);
        });
        // the clapper: a short bright scrape, gone before the tone establishes itself
        const src = ctx.createBufferSource(); src.buffer = noiseBuffer(ctx, 0.05, 'white');
        const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 3800; bp.Q.value = 0.9;
        const sg = ctx.createGain();
        env(sg.gain, t0, [[0, 0.28], [0.018, 0.05], [0.05, 0]]);
        src.connect(bp); bp.connect(sg); sg.connect(out);
        src.start(t0); src.stop(t0 + 0.05);
      },
    },
    {
      id: 'typewriter', level: 0.6, name: 'Typewriter key', cat: 'Interface', dur: 0.14,
      render(ctx, t0, d, out) {
        const n = ctx.createBufferSource(); n.buffer = noiseBuffer(ctx, d, 'white');
        const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 2200; bp.Q.value = 1.6;
        const g = ctx.createGain(); env(g.gain, t0, [[0, 0.8], [0.03, 0.12], [0.1, 0]]);
        n.connect(bp); bp.connect(g); g.connect(out);
        n.start(t0); n.stop(t0 + d);
        const o = ctx.createOscillator(); o.type = 'triangle'; o.frequency.value = 190;
        const og = ctx.createGain(); env(og.gain, t0, [[0, 0.35], [0.05, 0]]);
        o.connect(og); og.connect(out);
        o.start(t0); o.stop(t0 + 0.06);
      },
    },
    {
      id: 'shutter', level: 0.7, name: 'Camera shutter', cat: 'Interface', dur: 0.26,
      render(ctx, t0, d, out) {
        [0, 0.11].forEach((off, i) => {
          const n = ctx.createBufferSource(); n.buffer = noiseBuffer(ctx, 0.05, 'white');
          const bp = ctx.createBiquadFilter(); bp.type = 'bandpass';
          bp.frequency.value = i ? 1500 : 2600; bp.Q.value = 1.1;
          const g = ctx.createGain(); env(g.gain, t0 + off, [[0, i ? 0.7 : 0.85], [0.045, 0]]);
          n.connect(bp); bp.connect(g); g.connect(out);
          n.start(t0 + off); n.stop(t0 + off + 0.05);
        });
      },
    },
    // ---------- texture ----------
    {
      id: 'sparkle', level: 0.75, name: 'Sparkle', cat: 'Texture', dur: 1.2,
      render(ctx, t0, d, out) {
        // fixed offsets, not Math.random — the same effect renders the same twice (queue 709; Glass break's rule)
        const SPARK = [0.03, 0.61, 0.22, 0.48, 0.09, 0.67, 0.35, 0.14, 0.55, 0.27, 0.42, 0.69, 0.18, 0.51];
        const PITCH = [0.72, 0.18, 0.44, 0.91, 0.06, 0.63, 0.29, 0.85, 0.37, 0.12, 0.58, 0.77, 0.23, 0.49];
        for (let i = 0; i < 14; i++) {
          const at = t0 + SPARK[i] * d;
          const o = ctx.createOscillator(); o.type = 'sine';
          o.frequency.value = 1800 + PITCH[i] * 3600;
          const g = ctx.createGain();
          g.gain.setValueAtTime(0, at);
          g.gain.linearRampToValueAtTime(0.16, at + 0.004);
          g.gain.exponentialRampToValueAtTime(0.0001, at + 0.22 + PITCH[(i + 5) % 14] * 0.2);
          o.connect(g); g.connect(out);
          o.start(at); o.stop(Math.min(t0 + d, at + 0.5));
        }
      },
    },
    {
      id: 'zap', name: 'Zap', cat: 'Texture', dur: 0.4,
      render(ctx, t0, d, out) {
        const o = ctx.createOscillator(); o.type = 'sawtooth';
        expTo(o.frequency, t0, 2400, 120, d * 0.7);
        const bp = ctx.createBiquadFilter(); bp.type = 'lowpass'; bp.frequency.value = 5200;
        const g = ctx.createGain(); env(g.gain, t0, [[0, 0.7], [d * 0.7, 0.08], [d, 0]]);
        o.connect(bp); bp.connect(g); g.connect(out);
        o.start(t0); o.stop(t0 + d);
      },
    },
    {
      id: 'bubble', level: 0.7, name: 'Bubble', cat: 'Texture', dur: 0.3,
      render(ctx, t0, d, out) {
        const o = ctx.createOscillator(); o.type = 'sine';
        expTo(o.frequency, t0, 240, 900, 0.16);
        const g = ctx.createGain(); env(g.gain, t0, [[0, 0], [0.01, 0.6], [0.2, 0]]);
        o.connect(g); g.connect(out);
        o.start(t0); o.stop(t0 + d);
      },
    },

    /* ---------- MORE OF THEM (queue 290) ----------
     * "give the sound effects menu more sound effects". Twelve added to the sixteen, and they go into
     * the categories that already exist rather than inventing new headings for the sake of it — except
     * NATURE, which earns one: wind, rain and fire are the set's obvious gap and calling them "Texture"
     * would bury them under the glitch and static.
     * Everything here is synthesised the same way the originals are, which is the point of this menu:
     * "These are generated in the app, so they cost nothing to download." No file ships. */

    // ---------- movement ----------
    {
      id: 'swoosh-by', name: 'Pass by', cat: 'Movement', dur: 1.2,
      render(ctx, t0, d, out) {
        /* A doppler-ish pass: the band climbs and falls while the gain peaks in the middle, so the
           loudest moment is also the highest — which is what "it went past me" sounds like. */
        const src = ctx.createBufferSource(); src.buffer = noiseBuffer(ctx, d, 'pink');
        const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.Q.value = 1.6;
        env(bp.frequency, t0, [[0, 500], [d * 0.5, 3200], [d, 700]]);
        const g = ctx.createGain();
        env(g.gain, t0, [[0, 0], [d * 0.5, 0.95], [d, 0]]);
        src.connect(bp); bp.connect(g); g.connect(out);
        src.start(t0); src.stop(t0 + d);
      },
    },
    {
      id: 'slide-up', name: 'Slide up', cat: 'Movement', dur: 0.55,
      render(ctx, t0, d, out) {
        const o = ctx.createOscillator(); o.type = 'sawtooth';
        env(o.frequency, t0, [[0, 180], [d, 900]]);
        const lp = ctx.createBiquadFilter(); lp.type = 'lowpass';
        env(lp.frequency, t0, [[0, 700], [d, 4200]]);
        const g = ctx.createGain();
        env(g.gain, t0, [[0, 0], [0.03, 0.5], [d * 0.8, 0.4], [d, 0]]);
        o.connect(lp); lp.connect(g); g.connect(out);
        o.start(t0); o.stop(t0 + d);
      },
    },
    // ---------- impact ----------
    {
      id: 'punch', name: 'Punch', cat: 'Impact', dur: 0.5,
      render(ctx, t0, d, out) {
        // a body thump plus a short noise slap: neither reads as a hit on its own
        const o = ctx.createOscillator(); o.type = 'sine';
        env(o.frequency, t0, [[0, 180], [d * 0.5, 55]]);
        const og = ctx.createGain();
        env(og.gain, t0, [[0, 0], [0.008, 1], [d * 0.6, 0]]);
        o.connect(og); og.connect(out); o.start(t0); o.stop(t0 + d);
        const n = ctx.createBufferSource(); n.buffer = noiseBuffer(ctx, d, 'white');
        const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.Q.value = 0.9; bp.frequency.value = 1500;
        const ng = ctx.createGain();
        env(ng.gain, t0, [[0, 0], [0.005, 0.55], [0.1, 0]]);
        n.connect(bp); bp.connect(ng); ng.connect(out); n.start(t0); n.stop(t0 + d);
      },
    },
    {
      id: 'glass-break', name: 'Glass break', cat: 'Impact', dur: 1.1,
      render(ctx, t0, d, out) {
        /* One crack, then shards: a scatter of short high partials at irregular times. Deterministic
           offsets rather than Math.random, so the same effect renders the same twice — this file is
           rendered offline and cached, and a sound that changed between renders would be a bug. */
        const n = ctx.createBufferSource(); n.buffer = noiseBuffer(ctx, d, 'white');
        const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 2200;
        const ng = ctx.createGain();
        // 0.84, not 0.9 — same reason as Reverse swell above: 1.233 raw = 1.011 in preview (queue 566).
        env(ng.gain, t0, [[0, 0], [0.004, 0.84], [0.09, 0.06], [d, 0]]);
        n.connect(hp); hp.connect(ng); ng.connect(out); n.start(t0); n.stop(t0 + d);
        [[0.06, 5200], [0.11, 3900], [0.17, 6400], [0.24, 4600], [0.33, 7100], [0.45, 5000]].forEach(function (p) {
          const o = ctx.createOscillator(); o.type = 'triangle'; o.frequency.value = p[1];
          const g = ctx.createGain();
          g.gain.setValueAtTime(0, t0 + p[0]);
          g.gain.linearRampToValueAtTime(0.28, t0 + p[0] + 0.004);
          g.gain.exponentialRampToValueAtTime(0.0001, t0 + p[0] + 0.16);
          o.connect(g); g.connect(out); o.start(t0 + p[0]); o.stop(t0 + p[0] + 0.2);
        });
      },
    },
    // ---------- build ----------
    {
      id: 'reverse-cymbal', name: 'Reverse swell', cat: 'Build', dur: 1.8,
      render(ctx, t0, d, out) {
        const n = ctx.createBufferSource(); n.buffer = noiseBuffer(ctx, d, 'white');
        const hp = ctx.createBiquadFilter(); hp.type = 'highpass';
        env(hp.frequency, t0, [[0, 900], [d, 5200]]);
        const g = ctx.createGain();
        /* 0.72, not 0.85 (queue 566). `renderBuffer` normalises, so an ADDED clip is unaffected by this
           number — but `preview()` plays the raw render through a fixed 0.82 gain and does NOT normalise,
           so a loud recipe clips on the ▶ and nowhere else. Measured: this peaked 1.367 raw = **1.121 in
           preview**, the loudest of all 30. */
        env(g.gain, t0, [[0, 0], [d * 0.92, 0.72], [d, 0]]);   // all swell, cut at the top
        n.connect(hp); hp.connect(g); g.connect(out);
        n.start(t0); n.stop(t0 + d);
      },
    },
    {
      id: 'heartbeat', name: 'Heartbeat', cat: 'Build', dur: 1.6,
      render(ctx, t0, d, out) {
        [[0, 1], [0.34, 0.72]].forEach(function (p) {
          const o = ctx.createOscillator(); o.type = 'sine';
          env(o.frequency, t0 + p[0], [[0, 90], [0.22, 42]]);
          const g = ctx.createGain();
          env(g.gain, t0 + p[0], [[0, 0], [0.02, p[1]], [0.26, 0]]);
          o.connect(g); g.connect(out); o.start(t0 + p[0]); o.stop(t0 + p[0] + 0.3);
        });
      },
    },
    // ---------- interface ----------
    {
      id: 'success', name: 'Success', cat: 'Interface', dur: 0.7,
      render(ctx, t0, d, out) {
        [[0, 660], [0.09, 880], [0.18, 1320]].forEach(function (p) {   // a rising third: "done"
          const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.value = p[1];
          const g = ctx.createGain();
          g.gain.setValueAtTime(0, t0 + p[0]);
          g.gain.linearRampToValueAtTime(0.5, t0 + p[0] + 0.008);
          g.gain.exponentialRampToValueAtTime(0.0001, t0 + p[0] + 0.42);
          o.connect(g); g.connect(out); o.start(t0 + p[0]); o.stop(t0 + p[0] + 0.5);
        });
      },
    },
    {
      id: 'error', name: 'Error', cat: 'Interface', dur: 0.45,
      render(ctx, t0, d, out) {
        [[0, 330], [0.14, 247]].forEach(function (p) {   // and a falling one: "no"
          const o = ctx.createOscillator(); o.type = 'square'; o.frequency.value = p[1];
          const g = ctx.createGain();
          env(g.gain, t0 + p[0], [[0, 0], [0.01, 0.32], [0.13, 0]]);
          o.connect(g); g.connect(out); o.start(t0 + p[0]); o.stop(t0 + p[0] + 0.16);
        });
      },
    },
    {
      id: 'swipe', level: 0.7, name: 'Swipe', cat: 'Interface', dur: 0.22,
      render(ctx, t0, d, out) {
        const n = ctx.createBufferSource(); n.buffer = noiseBuffer(ctx, d, 'white');
        const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.Q.value = 3.2;
        env(bp.frequency, t0, [[0, 2400], [d, 6000]]);
        const g = ctx.createGain();
        env(g.gain, t0, [[0, 0], [0.015, 0.6], [d, 0]]);
        n.connect(bp); bp.connect(g); g.connect(out); n.start(t0); n.stop(t0 + d);
      },
    },
    // ---------- texture ----------
    {
      id: 'vinyl', name: 'Vinyl crackle', cat: 'Texture', dur: 2.2,
      render(ctx, t0, d, out) {
        const n = ctx.createBufferSource(); n.buffer = noiseBuffer(ctx, d, 'pink');
        const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 1800;
        const g = ctx.createGain(); g.gain.value = 0.22;
        n.connect(hp); hp.connect(g); g.connect(out); n.start(t0); n.stop(t0 + d);
        // the pops on top, at fixed offsets so the render is repeatable
        [0.13, 0.41, 0.66, 1.02, 1.28, 1.55, 1.9].forEach(function (at, i) {
          const o = ctx.createOscillator(); o.type = 'triangle'; o.frequency.value = 900 + i * 130;
          const pg = ctx.createGain();
          pg.gain.setValueAtTime(0, t0 + at);
          pg.gain.linearRampToValueAtTime(0.3, t0 + at + 0.002);
          pg.gain.exponentialRampToValueAtTime(0.0001, t0 + at + 0.03);
          o.connect(pg); pg.connect(out); o.start(t0 + at); o.stop(t0 + at + 0.05);
        });
      },
      // The bed (9.3): the same hiss held for `d`, and the same pops (a triangle tone, up in 2 ms, gone by 30 ms) about
      // three a second at seeded moments, each at one of the seven pitches above.
      bed(ctx, t0, d, out) {
        const n = ctx.createBufferSource(); n.buffer = noiseBuffer(ctx, d, 'pink');
        const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 1800;
        const g = ctx.createGain(); g.gain.value = 0.22;
        n.connect(hp); hp.connect(g); g.connect(out); n.start(t0); n.stop(t0 + d);
        const r = seeded(0x7a11c);
        playTrack(ctx, t0, d, out, (buf, sr) => eventTimes(r, 0.05, d - 0.05, 0.31, 0.06).forEach(at =>
          burst(buf, sr, r, at, { len: 0.05, tone: 900 + Math.floor(r() * 7) * 130, peak: 0.3 * (0.7 + 0.3 * r()), atk: 0.002, dec: 0.03 })));
      },
    },
    // ---------- nature ----------
    {
      id: 'wind', name: 'Wind', cat: 'Nature', dur: 2.6,
      render(ctx, t0, d, out) {
        const n = ctx.createBufferSource(); n.buffer = noiseBuffer(ctx, d, 'brown');
        const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.Q.value = 0.7;
        // it BREATHES — a steady band reads as static, a moving one as air
        env(bp.frequency, t0, [[0, 400], [d * 0.3, 900], [d * 0.6, 520], [d, 1000]]);
        const g = ctx.createGain();
        env(g.gain, t0, [[0, 0], [d * 0.2, 0.7], [d * 0.55, 0.45], [d * 0.8, 0.75], [d, 0]]);
        n.connect(bp); bp.connect(g); g.connect(out); n.start(t0); n.stop(t0 + d);
      },
      /* The bed (9.3): the breath above, again and again — each one its own (seeded): 2–3.3 s long, every turn of the band
         and of the level moved up to a fifth either way, so a minute of wind gusts rather than repeating one gust. The level
         never drops to nothing between breaths (only the bed's own edges fade). */
      bed(ctx, t0, d, out) {
        const n = ctx.createBufferSource(); n.buffer = noiseBuffer(ctx, d, 'brown');
        const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.Q.value = 0.7;
        const g = ctx.createGain();
        const r = seeded(0x9e3a7), v = () => 0.8 + 0.4 * r();
        const fp = [], gp = [];
        for (let t = 0; t < d; ) {
          const c = 2.6 * (0.75 + 0.5 * r());
          fp.push([t, 400 * v()], [t + c * 0.3, 900 * v()], [t + c * 0.6, 520 * v()], [t + c * 0.85, 1000 * v()]);
          gp.push([t, 0.5 * v()], [t + c * 0.2, Math.min(0.85, 0.7 * v())], [t + c * 0.55, 0.45 * v()], [t + c * 0.8, Math.min(0.85, 0.75 * v())]);
          t += c;
        }
        env(bp.frequency, t0, fp); env(g.gain, t0, gp);
        n.connect(bp); bp.connect(g); g.connect(out); n.start(t0); n.stop(t0 + d);
      },
    },
    {
      id: 'rain', name: 'Rain', cat: 'Nature', dur: 2.6,
      render(ctx, t0, d, out) {
        const n = ctx.createBufferSource(); n.buffer = noiseBuffer(ctx, d, 'white');
        const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 1100;
        const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 7000;
        const g = ctx.createGain();
        env(g.gain, t0, [[0, 0], [0.3, 0.6], [d - 0.3, 0.6], [d, 0]]);
        n.connect(hp); hp.connect(lp); lp.connect(g); g.connect(out); n.start(t0); n.stop(t0 + d);
      },
      /* The bed (9.3): the same band of noise held level for `d` (its 0.3 s fades were already the bed's edges).
         RAIN WITH DROPS (9.4; backlog C21's first half, "Rain is flat static"): with an Intensity the bed is quieter and
         drops fall on it — 20, 60 or 120 a second (Light / Medium / Heavy), each a 3–8 ms tick of noise band-passed
         somewhere between 2 and 6 kHz, at a seeded moment and level (most small, a few close). On a roof the wash is
         darker (500 Hz – 3.5 kHz) and the drops land as duller 8–18 ms taps at 0.7–2.5 kHz. A roof with no Intensity is
         Medium. Without either, the bed is the plain Rain above, held. */
      bedExtras: ['intensity', 'surface'],
      bed(ctx, t0, d, out, o) {
        const roof = !!(o && o.surface === 'roof'), inten = (o && o.intensity) || (roof ? 'medium' : null);
        const k = inten ? RAIN_DROPS[inten] : null;
        const n = ctx.createBufferSource(); n.buffer = noiseBuffer(ctx, d, 'white');
        const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = roof ? 500 : 1100;
        const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = roof ? 3500 : (k ? k.top : 7000);
        const g = ctx.createGain(); g.gain.value = k ? k.bed : 0.6;
        n.connect(hp); hp.connect(lp); lp.connect(g); g.connect(out); n.start(t0); n.stop(t0 + d);
        if (!k) return;
        const r = seeded(roof ? 0x2f00f : 0xd2095);
        playTrack(ctx, t0, d, out, (buf, sr) => eventTimes(r, 0.02, d - 0.03, 1 / k.rate, 0.002).forEach(at => {
          const len = roof ? 0.008 + 0.01 * r() : 0.003 + 0.005 * r();
          const f = roof ? 700 * Math.pow(2500 / 700, r()) : 2000 * Math.pow(3, r());
          // `len` is how long it is heard: it falls ~40 dB by then and is written out to twice that, so nothing is cut off
          burst(buf, sr, r, at, { len: 2 * len, f: f, q: roof ? 0.8 : 0.9, peak: 1 + 2 * r() * r(), atk: roof ? 0.0008 : 0.0004, dec: 2 * len });
        }));
      },
    },
    {
      id: 'fire', name: 'Fire crackle', cat: 'Nature', dur: 2.4,
      // The bed (9.3): the same low roar held for `d`, and the same crackles (a band of noise up in 3 ms, gone by 45 ms, at one
      // of the four centres above) about four a second at seeded moments, so no two seconds crackle alike.
      bed(ctx, t0, d, out) {
        const n = ctx.createBufferSource(); n.buffer = noiseBuffer(ctx, d, 'brown');
        const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 1400;
        const g = ctx.createGain(); g.gain.value = 0.45;
        n.connect(lp); lp.connect(g); g.connect(out); n.start(t0); n.stop(t0 + d);
        const r = seeded(0xf17ec);
        playTrack(ctx, t0, d, out, (buf, sr) => eventTimes(r, 0.05, d - 0.06, 0.24, 0.05).forEach(at =>
          burst(buf, sr, r, at, { len: 0.05, f: 1800 + Math.floor(r() * 4) * 700, q: 2, peak: 0.5, atk: 0.003, dec: 0.045 })));
      },
      render(ctx, t0, d, out) {
        const n = ctx.createBufferSource(); n.buffer = noiseBuffer(ctx, d, 'brown');
        const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 1400;
        const g = ctx.createGain();
        env(g.gain, t0, [[0, 0], [0.2, 0.45], [d - 0.2, 0.45], [d, 0]]);
        n.connect(lp); lp.connect(g); g.connect(out); n.start(t0); n.stop(t0 + d);
        [0.18, 0.37, 0.52, 0.79, 0.96, 1.21, 1.44, 1.7, 1.95, 2.16].forEach(function (at, i) {
          const c = ctx.createBufferSource(); c.buffer = noiseBuffer(ctx, 0.05, 'white');
          const cb = ctx.createBiquadFilter(); cb.type = 'bandpass'; cb.Q.value = 2; cb.frequency.value = 1800 + (i % 4) * 700;
          const cg = ctx.createGain();
          cg.gain.setValueAtTime(0, t0 + at);
          cg.gain.linearRampToValueAtTime(0.5, t0 + at + 0.003);
          cg.gain.exponentialRampToValueAtTime(0.0001, t0 + at + 0.045);
          c.connect(cb); cb.connect(cg); cg.connect(out); c.start(t0 + at); c.stop(t0 + at + 0.06);
        });
      },
    },
  ];

  /* ═══ NEW PACKS (#966 backlog §B: B4 Cartoon, B5 Beeps, B12 Transitions & glitch, B13 8-bit Game) ═══════════════════════
     His steer (#966): "you can add new sound effects … more choices always better … this is the complex version we want as
     much choice as possible". They live in this block, below the thirty above and beside batch 9's beds (hunt/fx-b9), so
     neither touches a line of the other.
     · BUILT, NOT YET PICKED. His #545 rule: he hears them before they ship. The listen sheet and what it plays are in
       tools/design/plans/fxnew-sfx/NOTES.md. Names, levels and recipes are reasoned, not yet heard.
     · SYNTHESISED like every sound above: nothing downloaded, nothing anyone else owns, and no tune copied from a game.
     · SEEDED, never Math.random. Noise comes through noiseSeed, so two buffers in one sound are two noises (queue 986, C11);
       every other random choice comes from a stream seeded by the sound's id and its Variation. The same sound renders the
       same samples every time, so the ▶ — which plays the very buffer renderBuffer made (queue 986, C10) — is the clip.
     · OPTIONS WITHOUT TOUCHING THE SHARED PATH. Each sound lists the `choices` it takes: Pitch (−12..+12 st), Variation (1–8;
       1 is the recipe as written), Length (0.5–3×, a stretch), and a few of its own (a bleep's length and tone, a
       countdown's gap, a flatline). FM.sfx.variant(def, options) hands back a SOUND — an ordinary def with its own id,
       length and name ("Boing (+3 st, variation 2)") — that renderBuffer, preview and add take exactly as they take a row,
       and Add names the clip after it. No options, nonsense or only defaults: the row itself. Nothing offers them yet —
       the options drawer is backlog 9.2, drawn and shown to him first. */
  const packSemis = st => Math.pow(2, st / 12);
  function packHash(s) { let h = 0x811c9dc5; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193); } return h >>> 0; }
  // A seeded stream of a sound's own: fixed for Variation 1 (the sound as written), another for each other Variation.
  function packRnd(id, variation, salt) { return seeded((packHash(id + '#' + salt) ^ Math.imul(variation || 1, 0x9E3779B1)) >>> 0); }
  // Variation moves a recipe's numbers: j(spread) is exactly 1 for Variation 1, else 1 ± up to `spread`, seeded.
  function packJitter(id, variation) {
    if (!(variation > 1)) return () => 1;
    const r = packRnd(id, variation, 'jitter');
    return spread => 1 + spread * (r() * 2 - 1);
  }
  /* White noise of `secs` for a pack sound, seeded by the sound, its Variation and what it is for — through noiseSeed, so
     asking twice in one render gives two noises (C11), and a render asks in the same order every time. */
  function packNoise(ctx, secs, id, variation, salt) {
    const n = Math.max(1, Math.floor(secs * ctx.sampleRate)), buf = ctx.createBuffer(1, n, ctx.sampleRate), d = buf.getChannelData(0);
    const rnd = seeded(noiseSeed(ctx, (packHash(id + '~' + salt) ^ Math.imul(variation || 1, 0x85EBCA6B) ^ n) >>> 0));
    for (let i = 0; i < n; i++) d[i] = rnd() * 2 - 1;
    return buf;
  }
  function packOsc(ctx, type, f) { const o = ctx.createOscillator(); o.type = type; if (f != null) o.frequency.value = f; return o; }
  // Up to `peak` in `atk` s, then an exponential fall to nothing at `end` s — the file's usual strike.
  function packDecay(param, t0, peak, atk, end) { param.setValueAtTime(0, t0); param.linearRampToValueAtTime(peak, t0 + atk); param.exponentialRampToValueAtTime(0.0001, t0 + end); }
  // A gentle drive (tanh, 2×) for the Air horn: one curve, made once.
  let _packDrive = null;
  function packDriveCurve() {
    if (!_packDrive) { _packDrive = new Float32Array(1025); for (let i = 0; i < 1025; i++) _packDrive[i] = Math.tanh(2 * (i / 512 - 1)) / Math.tanh(2); }
    return _packDrive;
  }

  /* ---- choices ----------------------------------------------------------------------------------
     What a pack sound can be asked for. A number is clamped to its range and rounded to its step; a listed value must be
     one of its values; anything else — or a default — is dropped, because a drawer, a file or a test can hand in anything.
     `say` is how the clip's name reads it. */
  const CH_PITCH = { min: -12, max: 12, step: 1, def: 0, unit: 'st', say: v => (v > 0 ? '+' : '') + v + ' st' };
  const CH_VARIATION = { min: 1, max: 8, step: 1, def: 1, say: v => 'variation ' + v };
  const CH_LENGTH = { min: 0.5, max: 3, step: 0.05, def: 1, unit: 'x', say: v => v + 'x length' };
  function packOpts(def, opts) {
    const ch = def && def.choices;
    if (!ch || !opts || typeof opts !== 'object') return null;
    const o = {};
    Object.keys(ch).forEach(k => {
      const c = ch[k], v = opts[k];
      if (c.values) { if (c.values.indexOf(v) >= 0 && v !== c.def) o[k] = v; return; }
      if (typeof v !== 'number' || !isFinite(v)) return;
      const q = Math.round(Math.round(Math.max(c.min, Math.min(c.max, v)) / c.step) * c.step * 1000) / 1000;
      if (q !== c.def) o[k] = q;
    });
    return Object.keys(o).length ? o : null;
  }
  // Every choice a sound takes, filled in: the cleaned options where given, the defaults elsewhere.
  function packFill(def, o) { const p = {}; Object.keys(def.choices).forEach(k => { p[k] = o && k in o ? o[k] : def.choices[k].def; }); return p; }
  function packLabel(def, o) { return Object.keys(def.choices).filter(k => k in o).map(k => def.choices[k].say(o[k])).join(', '); }
  /* A pack sound with options, as a sound of its own: its id says the options (so the render cache keeps it apart from the
     row), its length follows them, its name is the clip's name. The row itself when there is nothing to change. */
  function variant(def, opts) {
    const o = packOpts(def, opts);
    if (!o) return def;
    const v = {
      id: def.id + '|' + JSON.stringify(o), name: def.name + ' (' + packLabel(def, o) + ')', cat: def.cat, level: def.levelFor ? def.levelFor(packFill(def, o)) : def.level, tags: def.tags,
      variantOf: def.id, options: o, dur: def.durFor(packFill(def, o)),
      render(ctx, t0, d, out) { def.render(ctx, t0, d, out, o); },
    };
    // A loop-ready bed (#966 B35, an Ambience sound's `loop` choice): renderBuffer folds it to exactly its length (ambFold).
    if (o.loop === true) v.loop = true;
    return v;
  }
  // What a pack sound can take, plain data for a drawer (9.2): null for the thirty older sounds and for a variant.
  function packOptionsFor(def) {
    if (!def || !def.choices) return null;
    const res = {};
    Object.keys(def.choices).forEach(k => {
      const c = def.choices[k];
      res[k] = c.values ? { values: c.values.slice(), def: c.def } : { min: c.min, max: c.max, step: c.step, def: c.def, unit: c.unit || '' };
    });
    return res;
  }
  /* A pack sound: an ordinary row (id, name, cat, dur, render — the shape every caller already knows) plus its search words
     (`tags`, for backlog 9.1's search) and its `choices`. render(ctx, t0, d, out[, options]): the four-argument call that
     renderBuffer and every test make is the sound as written; the fifth argument is how a variant asks. `make` gets every
     choice filled in, and the sound's id for its seeds. */
  function packSound(spec) {
    const def = { id: spec.id, name: spec.name, cat: spec.cat, tags: spec.tags, choices: spec.choices };
    if (spec.level != null) def.level = spec.level;
    def.durFor = spec.durFor || (p => Math.round(spec.dur * (p.length || 1) * 1000) / 1000);
    def.dur = def.durFor(packFill(def, null));
    // A level that follows the options (#966 B23: far thunder lands quieter than near); the row takes the defaults' level.
    if (spec.levelFor) { def.levelFor = spec.levelFor; def.level = spec.levelFor(packFill(def, null)); }
    def.render = function (ctx, t0, d, out, o) { spec.make(ctx, t0, d, out, packFill(def, packOpts(def, o)), def.id); };
    return def;
  }

  /* ---------- CARTOON (B4) ----------
     The backlog's five — Boing, Slide whistle (up and down: two rows, because the direction is the whole sound), Sad
     trombone, Air horn, Wobble — and Bonk, the cartoon hit. Pitch, Variation and Length on all of them. */
  const CARTOON = { pitch: CH_PITCH, variation: CH_VARIATION, length: CH_LENGTH };
  /* A slide whistle: a sine gliding 600 ↔ 1800 Hz over 0.72 s (exponential, so it moves evenly by ear), the player's 6 Hz
     vibrato coming in after the attack, and breath — seeded noise band-passed around the note, following it. */
  function slideWhistle(up) {
    return function (ctx, t0, d, out, p, id) {
      const k = packSemis(p.pitch), ls = p.length, j = packJitter(id, p.variation);
      const lo = 600 * k * j(0.1), hi = 1800 * k * j(0.1), T = 0.72 * ls;
      const o = packOsc(ctx, 'sine'); expTo(o.frequency, t0, up ? lo : hi, up ? hi : lo, T);
      const lfo = packOsc(ctx, 'sine', 6 * j(0.2)), vd = ctx.createGain();
      env(vd.gain, t0, [[0, 0], [0.12 * ls, 25], [d, 30]]);   // cents
      lfo.connect(vd); vd.connect(o.detune);
      const n = ctx.createBufferSource(); n.buffer = packNoise(ctx, d, id, p.variation, 'breath');
      const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.Q.value = 6; expTo(bp.frequency, t0, up ? lo : hi, up ? hi : lo, T);
      const g = ctx.createGain(), ng = ctx.createGain();
      env(g.gain, t0, [[0, 0], [0.03 * ls, 0.6], [d - 0.08 * ls, 0.55], [d, 0]]);
      env(ng.gain, t0, [[0, 0], [0.03 * ls, 0.5], [d - 0.08 * ls, 0.46], [d, 0]]);
      o.connect(g); g.connect(out); n.connect(bp); bp.connect(ng); ng.connect(out);
      [o, lfo, n].forEach(s => { s.start(t0); s.stop(t0 + d); });
    };
  }
  SFX.push(
    packSound({
      id: 'boing', name: 'Boing', cat: 'Cartoon', dur: 0.9, choices: CARTOON,
      tags: ['boing', 'spring', 'bounce', 'bouncy', 'jump', 'twang', 'cartoon', 'comedy'],
      make(ctx, t0, d, out, p, id) {
        // A sine falling 400 → 150 Hz with a 12 Hz wobble of its pitch that dies away (220 → 6 cents), and a partial three
        // times up that dies sooner — a spring, not a slide.
        const k = packSemis(p.pitch), ls = p.length, j = packJitter(id, p.variation);
        const f0 = 400 * k * j(0.12), f1 = 150 * k * j(0.12);
        const lfo = packOsc(ctx, 'sine', 12 * j(0.25)), wob = ctx.createGain();
        expTo(wob.gain, t0, 220, 6, d);
        lfo.connect(wob);
        [[1, 0.8, 1], [3, 0.18, 0.4]].forEach(([m, a, dec]) => {
          const o = packOsc(ctx, 'sine'); expTo(o.frequency, t0, f0 * m, f1 * m, 0.6 * ls);
          wob.connect(o.detune);
          const g = ctx.createGain();
          env(g.gain, t0, [[0, 0], [0.006, a], [0.45 * d * dec, a * 0.45], [d * dec, 0]]);
          o.connect(g); g.connect(out); o.start(t0); o.stop(t0 + d);
        });
        lfo.start(t0); lfo.stop(t0 + d);
      },
    }),
    packSound({
      id: 'bonk', name: 'Bonk', cat: 'Cartoon', dur: 0.45, choices: CARTOON,
      tags: ['bonk', 'bop', 'conk', 'knock', 'hit', 'head', 'wood block', 'cartoon', 'comedy'],
      make(ctx, t0, d, out, p, id) {
        // A hollow body that drops a fifth in its first 60 ms (the drop is the "onk"), an overtone at 2.3× that dies
        // faster, and the knock itself: 12 ms of seeded noise band-passed at 2.4 kHz.
        const k = packSemis(p.pitch), ls = p.length, j = packJitter(id, p.variation), f = 620 * k * j(0.15);
        [[1, 0.7, 0.42], [2.3, 0.22, 0.12]].forEach(([m, a, dec]) => {
          const o = packOsc(ctx, 'sine'); expTo(o.frequency, t0, f * m * 1.5, f * m, 0.06 * ls);
          const g = ctx.createGain(); packDecay(g.gain, t0, a, 0.002, dec * ls);
          o.connect(g); g.connect(out); o.start(t0); o.stop(t0 + d);
        });
        const n = ctx.createBufferSource(); n.buffer = packNoise(ctx, 0.02, id, p.variation, 'knock');
        const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 2400 * k; bp.Q.value = 1.2;
        const ng = ctx.createGain(); env(ng.gain, t0, [[0, 0.5], [0.012, 0]]);
        n.connect(bp); bp.connect(ng); ng.connect(out); n.start(t0); n.stop(t0 + 0.02);
      },
    }),
    packSound({
      id: 'slide-whistle-up', name: 'Slide whistle up', cat: 'Cartoon', dur: 0.85, choices: CARTOON,
      tags: ['slide whistle', 'whistle', 'up', 'rise', 'rising', 'cartoon', 'comedy'],
      make: slideWhistle(true),
    }),
    packSound({
      id: 'slide-whistle-down', name: 'Slide whistle down', cat: 'Cartoon', dur: 0.85, choices: CARTOON,
      tags: ['slide whistle', 'whistle', 'down', 'fall', 'falling', 'drop', 'cartoon', 'comedy'],
      make: slideWhistle(false),
    }),
    packSound({
      id: 'sad-trombone', name: 'Sad trombone', cat: 'Cartoon', dur: 2.45, choices: CARTOON,
      tags: ['sad trombone', 'trombone', 'wah wah', 'fail', 'lose', 'sad', 'brass', 'cartoon', 'comedy'],
      make(ctx, t0, d, out, p, id) {
        /* B♭3 – A3 – A♭3 – G3: three short and the last held, each on two saws ±5 cents through a lowpass that opens to
           1.2 kHz and closes again like a hand on a mute ("wah"), the last one with a vibrato that grows. */
        const k = packSemis(p.pitch), ls = p.length, j = packJitter(id, p.variation);
        [233.08, 220.00, 207.65, 196.00].forEach((f, i) => {
          const last = i === 3, at = t0 + i * 0.36 * ls, len = (last ? 1.25 : 0.32) * ls;
          const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.Q.value = 2;
          env(lp.frequency, at, [[0, 350], [0.1 * ls, 1200], [len, last ? 450 : 650]]);
          const g = ctx.createGain(); env(g.gain, at, [[0, 0], [0.03 * ls, 0.3], [len - 0.05 * ls, 0.24], [len, 0]]);
          lp.connect(g); g.connect(out);
          let vib = null;
          if (last) {
            const lfo = packOsc(ctx, 'sine', 5.5 * j(0.15)); vib = ctx.createGain();
            env(vib.gain, at, [[0, 0], [0.25 * ls, 0], [len, 40]]);   // cents
            lfo.connect(vib); lfo.start(at); lfo.stop(at + len);
          }
          [-5, 5].forEach(c => {
            const o = packOsc(ctx, 'sawtooth', f * k); o.detune.value = c * j(0.6);
            if (vib) vib.connect(o.detune);
            o.connect(lp); o.start(at); o.stop(at + len);
          });
        });
      },
    }),
    packSound({
      id: 'air-horn', name: 'Air horn', cat: 'Cartoon', dur: 1.35, level: 0.8, choices: CARTOON,
      tags: ['air horn', 'airhorn', 'horn', 'hype', 'meme', 'party', 'stadium', 'celebrate', 'cartoon'],
      make(ctx, t0, d, out, p, id) {
        /* B♭4 on three detuned saws (−14 / +3 / +11 cents), driven a little: da, da, daaa. Each blast scoops up into the
           note over 30 ms — a horn's blat. Level 0.8 (the backlog's): loud, not the loudest thing in the list.
           ⚠️ NO NODE HERE TAKES MORE THAN TWO INPUTS (15 Oct). Chrome adds a node's inputs in an order of its own on each render,
           and in floats (a + b) + c is not always (c + b) + a. With the three saws straight into one gain, two plain renders of
           this very sound came out up to 2.85e-6 apart (5 of 5 re-renders differed) once the drive, the filters and the
           normalising had grown that last bit — past the 1e-6 that '482 9.3' holds every sound to, while no other sound
           jittered more than 1.79e-7. a + b is b + a exactly, so two at a time renders the same samples every time. The two
           unity gains (`pair`, `late`) only add; Variation's draws are taken in the order they always were. */
        const k = packSemis(p.pitch), ls = p.length, j = packJitter(id, p.variation), f = 466.16 * k;
        const drive = ctx.createWaveShaper(); drive.curve = packDriveCurve();
        const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 240;
        const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 5200;
        const og = ctx.createGain(); og.gain.value = 0.7;
        drive.connect(hp); hp.connect(lp); lp.connect(og); og.connect(out);
        const late = ctx.createGain(); late.connect(drive);   // blasts 2 and 3 meet here, and blast 1 meets them in drive
        [[0, 0.15], [0.21, 0.15], [0.42, 0.83]].forEach(([s, l], b) => {
          const at = t0 + s * ls, len = l * ls * j(0.12);
          const g = ctx.createGain(); env(g.gain, at, [[0, 0], [0.01, 0.22], [len - 0.03, 0.2], [len, 0]]);
          g.connect(b ? late : drive);
          const pair = ctx.createGain(); pair.connect(g);   // the first two saws meet here, and the third meets them in g
          [-14, 3, 11].forEach((c, i) => {
            const o = packOsc(ctx, 'sawtooth');
            o.frequency.setValueAtTime(f * 0.97, at); o.frequency.exponentialRampToValueAtTime(f, at + 0.03);
            o.detune.value = c * j(0.4);
            o.connect(i < 2 ? pair : g); o.start(at); o.stop(at + len);
          });
        });
      },
    }),
    packSound({
      id: 'wobble', name: 'Wobble', cat: 'Cartoon', dur: 1.2, choices: CARTOON,
      tags: ['wobble', 'wobbly', 'jelly', 'jiggle', 'wiggle', 'shake', 'dizzy', 'cartoon', 'comedy'],
      make(ctx, t0, d, out, p, id) {
        // A jelly settling: a triangle (and its octave) whose pitch swings and whose level pulses together, fast and wide
        // at first (11 Hz, ±260 cents), slower and narrower as it settles (5 Hz, ±20).
        const k = packSemis(p.pitch), j = packJitter(id, p.variation), f = 240 * k * j(0.12);
        const lfo = packOsc(ctx, 'sine'); expTo(lfo.frequency, t0, 11 * j(0.2), 5, d);
        const swing = ctx.createGain(); expTo(swing.gain, t0, 260, 20, d);
        const pulse = ctx.createGain(); expTo(pulse.gain, t0, 0.16, 0.01, d);
        lfo.connect(swing); lfo.connect(pulse);
        const g = ctx.createGain(); env(g.gain, t0, [[0, 0], [0.01, 0.42], [d * 0.7, 0.3], [d, 0]]);
        pulse.connect(g.gain);
        [['triangle', 1, 1], ['sine', 2, 0.35]].forEach(([type, m, a]) => {
          const o = packOsc(ctx, type, f * m); swing.connect(o.detune);
          const og = ctx.createGain(); og.gain.value = a;
          o.connect(og); og.connect(g); o.start(t0); o.stop(t0 + d);
        });
        g.connect(out); lfo.start(t0); lfo.stop(t0 + d);
      },
    })
  );

  /* ---------- BEEPS (B5) ----------
     Under Interface, beside Ding and Error (his call if they want a heading of their own — NOTES.md). The backlog's four:
     the Censor bleep (its Length and Tone are its options: 0.1–5 s, 400–2000 Hz), the Countdown (3-2-1-Go, a second or
     half a second apart), the Message ping, the Heart monitor (with a flatline). A beep is a sine with 5 ms edges — the
     edges stop it clicking, and nothing about it drifts, so its pitch is exactly what it says. */
  function packBeep(ctx, out, at, f, len, amp, oct) {
    const g = ctx.createGain(); env(g.gain, at, [[0, 0], [0.005, amp], [len - 0.005, amp], [len, 0]]);
    g.connect(out);
    [[1, 1], [2, oct || 0]].forEach(([m, a]) => {
      if (!a || f * m > 0.45 * ctx.sampleRate) return;
      const o = packOsc(ctx, 'sine', f * m), og = ctx.createGain(); og.gain.value = a;
      o.connect(og); og.connect(g); o.start(at); o.stop(at + len);
    });
  }
  SFX.push(
    packSound({
      id: 'censor-bleep', name: 'Censor bleep', cat: 'Interface', level: 0.75,
      tags: ['bleep', 'beep', 'censor', 'swear', 'curse', 'bleep out', 'mute', 'tone'],
      choices: {
        length: { min: 0.1, max: 5, step: 0.05, def: 0.6, unit: 's', say: v => v + ' s' },
        tone: { min: 400, max: 2000, step: 10, def: 1000, unit: 'Hz', say: v => v + ' Hz' },
      },
      durFor: p => p.length,
      // 1 kHz for 0.6 s: the broadcast bleep. A pure sine, so it covers a word without buzzing.
      make(ctx, t0, d, out, p) { packBeep(ctx, out, t0, p.tone, p.length, 0.8, 0); },
    }),
    packSound({
      id: 'countdown', name: 'Countdown', cat: 'Interface', level: 0.8,
      tags: ['countdown', 'count down', '3 2 1', 'three two one', 'race start', 'start', 'go', 'timer', 'beep'],
      choices: { gap: { values: [1, 0.5], def: 1, say: v => v + ' s apart' }, pitch: CH_PITCH },
      durFor: p => Math.round((3 * p.gap + 0.45) * 1000) / 1000,
      make(ctx, t0, d, out, p) {
        // three, two, one: 880 Hz for 0.12 s, a second apart (or half); then go: 1760 Hz for 0.4 s. A little octave in each
        // so it cuts through music the way a real start beep does.
        const k = packSemis(p.pitch);
        for (let i = 0; i < 3; i++) packBeep(ctx, out, t0 + i * p.gap, 880 * k, 0.12, 0.6, 0.12);
        packBeep(ctx, out, t0 + 3 * p.gap, 1760 * k, 0.4, 0.6, 0.12);
      },
    }),
    packSound({
      id: 'message-ping', name: 'Message ping', cat: 'Interface', dur: 0.6, level: 0.8,
      tags: ['ping', 'message', 'notification', 'text', 'alert', 'chime', 'new message', 'beep'],
      choices: { pitch: CH_PITCH, variation: CH_VARIATION },
      make(ctx, t0, d, out, p) {
        // E6 (1318.5 Hz) with a quiet partial four times up that dies first, struck twice 0.13 s apart. Variation moves the
        // second ping (the same note for 1; then up a fourth, a fifth, an octave, down a fourth, …).
        const k = packSemis(p.pitch), f = 1318.51 * k, up = [0, 5, 7, 12, -5, 4, 3, 9][p.variation - 1];
        [[0, f], [0.13, f * packSemis(up)]].forEach(([s, fr]) => {
          [[1, 0.5, 0.32], [4, 0.12, 0.07]].forEach(([m, a, dec]) => {
            if (fr * m > 0.45 * ctx.sampleRate) return;
            const o = packOsc(ctx, 'sine', fr * m), g = ctx.createGain();
            packDecay(g.gain, t0 + s, a, 0.003, dec);
            o.connect(g); g.connect(out); o.start(t0 + s); o.stop(t0 + s + dec + 0.02);
          });
        });
      },
    }),
    packSound({
      id: 'heart-monitor', name: 'Heart monitor', cat: 'Interface', level: 0.8,
      tags: ['heart monitor', 'hospital', 'ecg', 'ekg', 'pulse', 'heartbeat', 'flatline', 'medical', 'beep'],
      choices: { flatline: { values: [false, true], def: false, say: () => 'flatline' }, pitch: CH_PITCH },
      durFor: p => p.flatline ? 4.4 : 3.2,
      make(ctx, t0, d, out, p) {
        // 1 kHz for 0.1 s every 0.8 s, four beats; or three beats and then the tone that does not stop.
        const f = 1000 * packSemis(p.pitch);
        for (let i = 0; i < (p.flatline ? 3 : 4); i++) packBeep(ctx, out, t0 + i * 0.8, f, 0.1, 0.6, 0);
        if (p.flatline) packBeep(ctx, out, t0 + 2.4, f, 1.95, 0.6, 0);
      },
    })
  );

  /* ---------- TRANSITIONS & GLITCH (B12) ----------
     Under Texture, where this file already keeps "the glitch and static" (a "Transitions" heading is his call — NOTES.md).
     Record scratch, Tape stop, Radio tuning, Digital glitch. */
  // A buffer of `secs` written sample by sample by fill(d, sr), played once from t0 into `out` (the scratch, the glitch, the
  // Game pack). One buffer, one source: nothing is replayed (C11).
  function packTrack(ctx, t0, secs, out, fill) {
    const sr = ctx.sampleRate, buf = ctx.createBuffer(1, Math.max(1, Math.ceil(secs * sr)), sr);
    fill(buf.getChannelData(0), sr);
    const src = ctx.createBufferSource(); src.buffer = buf;
    src.connect(out); src.start(t0); src.stop(t0 + secs);
  }
  /* RECORD SCRATCH: a hand pushing a record back and forth under the needle. The record is a chord (A2 E3 A3 C♯4, three
     harmonics each) over a dark bed of seeded noise; the needle reads it wherever the hand has it, and the hand moves in
     smooth pushes — [direction, seconds, top speed in times normal play] — so a fast push is high and bright and a
     turnaround is silent. Written sample by sample into one buffer. Variation is another hand (each push ±25 % in time and
     speed) on another record. */
  const SCRATCH = [[-1, 0.15, 3.2], [1, 0.13, 4.2], [-1, 0.09, 5.0], [1, 0.11, 2.6]];
  const SCRATCH_CHORD = [110, 164.81, 220, 277.18];
  function scratchStrokes(p) {
    const j = packJitter('record-scratch', p.variation);
    return SCRATCH.map(([dir, s, v]) => [dir, s * p.length * j(0.25), v * j(0.25)]);
  }
  SFX.push(
    packSound({
      id: 'record-scratch', name: 'Record scratch', cat: 'Texture', choices: { pitch: CH_PITCH, variation: CH_VARIATION, length: CH_LENGTH },
      tags: ['record scratch', 'scratch', 'vinyl', 'dj', 'turntable', 'rewind', 'stop', 'transition'],
      durFor: p => Math.round((scratchStrokes(p).reduce((a, s) => a + s[1], 0) + 0.08) * 1000) / 1000,
      make(ctx, t0, d, out, p, id) {
        const k = packSemis(p.pitch), sr = ctx.sampleRate, strokes = scratchStrokes(p);
        let x = 0, lo = 0, hi = 0;   // the stretch of record the hand covers (each push moves one way, so its ends bound it)
        strokes.forEach(([dir, s, v]) => { x += dir * v * s * 2 / Math.PI; lo = Math.min(lo, x); hi = Math.max(hi, x); });
        const rec0 = lo - 0.05, nN = Math.ceil((hi - lo + 0.1) * sr) + 2, bed = new Float32Array(nN);
        const rnd = seeded(noiseSeed(ctx, (packHash(id + '~record') ^ Math.imul(p.variation, 0x85EBCA6B)) >>> 0));
        const a = 1 - Math.exp(-2 * Math.PI * 800 / sr);   // the bed's one-pole lowpass: 800 Hz of RECORD time, so a fast push brightens it
        for (let i = 0, y = 0; i < nN; i++) { y += a * ((rnd() * 2 - 1) - y); bed[i] = y * 1.6; }
        const read = xp => {
          const fi = (xp - rec0) * sr, i0 = Math.floor(fi), fr = fi - i0;
          let v = bed[i0] * (1 - fr) + bed[i0 + 1] * fr;
          for (const c of SCRATCH_CHORD) for (let h = 1; h <= 3; h++) v += Math.sin(2 * Math.PI * c * k * h * xp) * 0.07 / h;
          return v;
        };
        const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 140;   // a slow record is rumble, not tone
        const g = ctx.createGain(); g.gain.value = 0.8;
        hp.connect(g); g.connect(out);
        packTrack(ctx, t0, d, hp, dd => {
          let i = 0, xa = 0;
          for (const [dir, s, v] of strokes) {
            const n = Math.round(s * sr);
            for (let m = 0; m < n && i < dd.length; m++, i++) {
              const u = m / n, speed = v * Math.sin(Math.PI * u);   // a push: still, fast, still
              dd[i] = Math.min(1, speed / 1.2) * read(xa + dir * v * s * (1 - Math.cos(Math.PI * u)) / Math.PI);
            }
            xa += dir * v * s * 2 / Math.PI;
          }
        });
      },
    }),
    packSound({
      id: 'tape-stop', name: 'Tape stop', cat: 'Texture', dur: 0.9, choices: { pitch: CH_PITCH, length: CH_LENGTH },
      tags: ['tape stop', 'tape', 'slow down', 'power down', 'wind down', 'record stop', 'stop', 'transition'],
      make(ctx, t0, d, out, p) {
        // The reels running down evenly: a saw (and a sine an octave under it) falling 220 → 20 Hz over 0.8 s in a straight
        // line — so it sags slowly and then dives — through a lowpass closing 5 kHz → 180 Hz, the level sagging with it.
        const k = packSemis(p.pitch), T = 0.8 * p.length;
        const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.Q.value = 0.9; expTo(lp.frequency, t0, 5000, 180, T);
        const g = ctx.createGain(); env(g.gain, t0, [[0, 0], [0.008, 1], [T * 0.6, 0.9], [T, 0]]);
        lp.connect(g); g.connect(out);
        [['sawtooth', 1, 0.5], ['sine', 0.5, 0.2]].forEach(([type, m, a]) => {
          const o = packOsc(ctx, type); o.frequency.setValueAtTime(220 * k * m, t0); o.frequency.linearRampToValueAtTime(20 * k * m, t0 + T);
          const og = ctx.createGain(); og.gain.value = a;
          o.connect(og); og.connect(lp); o.start(t0); o.stop(t0 + d);
        });
      },
    }),
    packSound({
      id: 'radio-tuning', name: 'Radio tuning', cat: 'Texture', dur: 1.6, level: 0.8, choices: { variation: CH_VARIATION, length: CH_LENGTH },
      tags: ['radio', 'tuning', 'static', 'dial', 'shortwave', 'interference', 'between stations', 'transition', 'noise'],
      make(ctx, t0, d, out, p, id) {
        // Static through a band that wanders as the dial turns (a seeded random walk, 400 Hz – 4.5 kHz, a step every 45 ms),
        // and three whistles — a station's carrier beating against the dial, gliding as it goes past.
        const ls = p.length, r = packRnd(id, p.variation, 'dial');
        const n = ctx.createBufferSource(); n.buffer = packNoise(ctx, d, id, p.variation, 'static');
        const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.Q.value = 3.5;
        const walk = []; let f = 1200;
        for (let t = 0; t <= d; t += 0.045 * ls) { walk.push([t, f]); f = Math.max(400, Math.min(4500, f * Math.pow(2, (r() - 0.5) * 1.2))); }
        env(bp.frequency, t0, walk);
        const g = ctx.createGain(); env(g.gain, t0, [[0, 0], [0.05, 0.9], [d - 0.08, 0.8], [d, 0]]);
        n.connect(bp); bp.connect(g); g.connect(out); n.start(t0); n.stop(t0 + d);
        for (let i = 0; i < 3; i++) {
          const at = t0 + (0.15 + 0.45 * i + 0.1 * r()) * ls, len = (0.18 + 0.1 * r()) * ls;
          const fa = 600 + 2600 * r(), fb = 250 + 900 * r();
          const o = packOsc(ctx, 'sine'); o.frequency.setValueAtTime(fa, at); o.frequency.exponentialRampToValueAtTime(fb, at + len);
          const og = ctx.createGain(); env(og.gain, at, [[0, 0], [len * 0.3, 0.22], [len * 0.7, 0.18], [len, 0]]);
          o.connect(og); og.connect(out); o.start(at); o.stop(at + len);
        }
      },
    }),
    packSound({
      id: 'digital-glitch', name: 'Digital glitch', cat: 'Texture', dur: 0.8, level: 0.75, choices: { variation: CH_VARIATION, length: CH_LENGTH },
      tags: ['glitch', 'digital', 'error', 'stutter', 'corrupt', 'data', 'computer', 'malfunction', 'transition'],
      make(ctx, t0, d, out, p, id) {
        /* Slices of 20–60 ms, each a square burst (80 Hz – 2.4 kHz), a crushed noise burst (sample-and-hold, 8 levels), a
           stutter of the slice before (8–16 ms of it, over and over) or a hard gate — every fourth slice is a gate, so it
           always cuts out. Written sample by sample, hard edges and all: the clicks are the glitch. */
        const r = packRnd(id, p.variation, 'slices'), ls = p.length;
        packTrack(ctx, t0, d, out, (dd, sr) => {
          const end = d - 0.04 * ls;
          let at = 0, idx = 0, prev = -1, prevN = 0;
          while (at < end - 0.005) {
            const len = Math.min(end - at, (0.02 + 0.04 * r()) * ls), i0 = Math.round(at * sr), n = Math.max(0, Math.min(dd.length - i0, Math.round(len * sr)));
            const pick = idx % 4 === 3 ? 'gate' : ['square', 'square', 'noise', 'stutter'][Math.floor(r() * 4)];
            const amp = 0.35 + 0.3 * r();
            if (pick === 'square') {
              const per = sr / (80 * Math.pow(30, r()));
              for (let m = 0; m < n; m++) dd[i0 + m] = (m % per) < per / 2 ? amp : -amp;
            } else if (pick === 'noise') {
              const gr = packRnd(id, p.variation, 'grain' + idx), hold = 1 + Math.floor(gr() * 12);
              let v = 0;
              for (let m = 0; m < n; m++) { if (m % hold === 0) v = Math.round((gr() * 2 - 1) * amp * 8) / 8; dd[i0 + m] = v; }
            } else if (pick === 'stutter' && prev >= 0) {
              const rep = Math.max(1, Math.min(prevN, Math.round(0.008 * sr * (1 + r()))));
              for (let m = 0; m < n; m++) dd[i0 + m] = dd[prev + (m % rep)];
            }
            if (pick !== 'gate' && n > 0) { prev = i0; prevN = n; }
            at += len; idx++;
          }
        });
      },
    })
  );

  /* ---------- 8-BIT GAME (B13) ----------
     A new Game category: Coin, Jump, Power-up, Laser, Game over, Extra life. Every one is WRITTEN sample by sample — square
     and pulse voices and a triangle, the way an old console makes them — and the mix goes out through 4 BITS: 15 levels,
     −7..+7 sevenths, with a level at zero so silence stays silent. Written rather than built from oscillators and a
     WaveShaper, because a shaper's curve is interpolated: a sample landing on a step could fall either way on two renders,
     and "the same sound renders the same twice" (queue 709) would be a coin flip again. The tunes are written for this
     file; none is a game's. Level 0.7: a square wave is loud for its peak. Pitch, Variation and Length on all six. */
  // Piecewise-linear in t through [[t, v], …], held after the last point: an old console's volume steps down in lines.
  function packLin(pts) {
    return t => {
      if (t <= pts[0][0]) return pts[0][1];
      for (let i = 1; i < pts.length; i++) if (t <= pts[i][0]) return pts[i - 1][1] + (pts[i][1] - pts[i - 1][1]) * (t - pts[i - 1][0]) / (pts[i][0] - pts[i - 1][0]);
      return pts[pts.length - 1][1];
    };
  }
  /* The 8-bit writer. A voice: { at, len (s), wave: a pulse's duty (0.5 square, 0.25 the thinner one; zero-mean, so +1 and
     −duty/(1−duty)) or 'tri', freq(t) Hz, amp(t) 0..1 }, t from the voice's start. Phase is accumulated sample by sample,
     so a sweep is a sweep. The mix is quantised to 4 bits at the end and played at 0.8. */
  function chip(ctx, t0, d, out, voices) {
    packTrack(ctx, t0, d, out, (dd, sr) => {
      const mix = new Float64Array(dd.length);
      voices.forEach(v => {
        const i0 = Math.max(0, Math.round(v.at * sr)), n = Math.max(0, Math.min(mix.length - i0, Math.round(v.len * sr))), w = v.wave;
        let ph = w === 'tri' ? 0.25 : 0;   // a triangle starts at its zero
        for (let i = 0; i < n; i++) {
          const t = i / sr, s = w === 'tri' ? (ph < 0.5 ? 4 * ph - 1 : 3 - 4 * ph) : (ph < w ? 1 : -w / (1 - w));
          mix[i0 + i] += s * v.amp(t);
          ph += v.freq(t) / sr; ph -= Math.floor(ph);
        }
      });
      for (let i = 0; i < dd.length; i++) dd[i] = 0.8 * Math.max(-7, Math.min(7, Math.round(mix[i] * 7))) / 7;
    });
  }
  const GAME = { pitch: CH_PITCH, variation: CH_VARIATION, length: CH_LENGTH };
  SFX.push(
    packSound({
      id: 'coin', name: 'Coin', cat: 'Game', dur: 0.6, level: 0.7, choices: GAME,
      tags: ['coin', 'pickup', 'pick up', 'collect', 'money', 'score', 'point', '8-bit', '8 bit', 'retro', 'game', 'chiptune'],
      make(ctx, t0, d, out, p) {
        // B5 for 80 ms, then E6 (a fourth up) ringing down in a straight line. Variation picks another interval.
        const k = packSemis(p.pitch), ls = p.length, f = 987.77 * k, up = packSemis([5, 7, 4, 12, 3, 9, 8, 10][p.variation - 1]);
        chip(ctx, t0, d, out, [{ at: 0, len: 0.5 * ls, wave: 0.5, freq: t => t < 0.08 * ls ? f : f * up, amp: packLin([[0, 0.8], [0.08 * ls, 0.8], [0.5 * ls, 0]]) }]);
      },
    }),
    packSound({
      id: 'jump', name: 'Jump', cat: 'Game', dur: 0.25, level: 0.7, choices: GAME,
      tags: ['jump', 'hop', 'leap', 'platform', 'platformer', '8-bit', '8 bit', 'retro', 'game', 'chiptune'],
      make(ctx, t0, d, out, p, id) {
        // A square sweeping 300 → 700 Hz over 0.15 s, then gone by 0.22 s.
        const k = packSemis(p.pitch), ls = p.length, j = packJitter(id, p.variation), T = 0.15 * ls;
        const f0 = 300 * k * j(0.1), f1 = 700 * k * j(0.12);
        chip(ctx, t0, d, out, [{ at: 0, len: 0.22 * ls, wave: 0.5, freq: t => f0 + (f1 - f0) * Math.min(1, t / T), amp: packLin([[0, 0.75], [T, 0.6], [0.22 * ls, 0]]) }]);
      },
    }),
    packSound({
      id: 'power-up', name: 'Power-up', cat: 'Game', dur: 0.7, level: 0.7, choices: GAME,
      tags: ['power up', 'powerup', 'power-up', 'level up', 'upgrade', 'bonus', 'arpeggio', '8-bit', '8 bit', 'retro', 'game', 'chiptune'],
      make(ctx, t0, d, out, p, id) {
        /* C–E–G–C and on up to C7, 60 ms a note on the thin pulse, a triangle an octave under it; the top note rings. Variation
           picks the chord (1 major, then sus4, minor, sixth, fifths, sus2, augmented, fourth-and-sixth) and nudges the speed. */
        const k = packSemis(p.pitch), ls = p.length, j = packJitter(id, p.variation);
        const CH = [[0, 4, 7], [0, 5, 7], [0, 3, 7], [0, 4, 9], [0, 7, 12], [0, 2, 7], [0, 4, 8], [0, 5, 9]][p.variation - 1];
        const notes = CH.concat(CH.map(s => s + 12), [24]), step = 0.06 * ls * j(0.2), T = step * (notes.length - 1), end = T + 0.2 * ls;
        const f = t => 523.25 * k * packSemis(notes[Math.min(notes.length - 1, Math.floor(t / step))]);
        chip(ctx, t0, d, out, [
          { at: 0, len: end, wave: 0.25, freq: f, amp: packLin([[0, 0.6], [T, 0.6], [end, 0]]) },
          { at: 0, len: end, wave: 'tri', freq: t => f(t) / 2, amp: packLin([[0, 0.3], [T, 0.3], [end, 0]]) },
        ]);
      },
    }),
    packSound({
      id: 'laser', name: 'Laser', cat: 'Game', dur: 0.35, level: 0.7, choices: GAME,
      tags: ['laser', 'pew', 'pew pew', 'shoot', 'shot', 'blaster', 'zap', 'space', 'sci-fi', '8-bit', '8 bit', 'retro', 'game'],
      make(ctx, t0, d, out, p, id) {
        // 1800 → 200 Hz in 0.3 s (exponential) with a 30 Hz shake of the pitch, ±0.1 octave.
        const k = packSemis(p.pitch), ls = p.length, j = packJitter(id, p.variation), T = 0.3 * ls;
        const f0 = 1800 * k * j(0.15), f1 = 200 * k * j(0.15), rate = 30 * j(0.3);
        chip(ctx, t0, d, out, [{ at: 0, len: 0.33 * ls, wave: 0.5,
          freq: t => f0 * Math.pow(f1 / f0, Math.min(1, t / T)) * Math.pow(2, 0.1 * Math.sin(2 * Math.PI * rate * t)),
          amp: packLin([[0, 0.8], [0.25 * ls, 0.5], [0.33 * ls, 0]]) }]);
      },
    }),
    packSound({
      id: 'game-over', name: 'Game over', cat: 'Game', dur: 1.4, level: 0.7, choices: GAME,
      tags: ['game over', 'lose', 'lost', 'fail', 'death', 'die', 'defeat', 'wrong', '8-bit', '8 bit', 'retro', 'game'],
      make(ctx, t0, d, out, p, id) {
        // Down a minor chord — C5, G4, E♭4, C4, 0.16 s each, a triangle an octave under — then the dive: C4 sliding to C3
        // over 0.55 s with a 7 Hz wobble, fading.
        const k = packSemis(p.pitch), ls = p.length, j = packJitter(id, p.variation);
        const NOTES = [523.25, 392.00, 311.13, 261.63], step = 0.16 * ls * j(0.08), T = 4 * step, dive = 0.55 * ls * j(0.08), end = T + dive + 0.1 * ls;
        const f = t => t < T ? NOTES[Math.min(3, Math.floor(t / step))] * k
          : 261.63 * k * Math.pow(0.5, Math.min(1, (t - T) / dive)) * Math.pow(2, 0.04 * Math.sin(2 * Math.PI * 7 * (t - T)));
        chip(ctx, t0, d, out, [
          { at: 0, len: end, wave: 0.5, freq: f, amp: packLin([[0, 0.55], [T, 0.55], [end, 0]]) },
          { at: 0, len: T, wave: 'tri', freq: t => f(t) / 2, amp: packLin([[0, 0.3], [T - 0.02 * ls, 0.3], [T, 0]]) },
        ]);
      },
    }),
    packSound({
      id: 'extra-life', name: 'Extra life', cat: 'Game', dur: 0.65, level: 0.7, choices: GAME,
      tags: ['extra life', '1-up', '1up', 'one up', 'life', 'bonus', 'reward', '8-bit', '8 bit', 'retro', 'game', 'chiptune'],
      make(ctx, t0, d, out, p) {
        // Up in fifths, zig-zagging — G5 D6, A5 E6, B5 F♯6 — and G6 ringing, 55 ms a note on the thin pulse. Written for this
        // file. Variation moves the whole figure (up a tone, down a tone, up a fourth, …).
        const k = packSemis(p.pitch) * packSemis([0, 2, -2, 5, 3, -3, 7, 4][p.variation - 1]), ls = p.length;
        const ST = [0, 7, 2, 9, 4, 11, 12], step = 0.055 * ls, T = step * (ST.length - 1), end = T + 0.22 * ls;
        chip(ctx, t0, d, out, [{ at: 0, len: end, wave: 0.25, freq: t => 783.99 * k * packSemis(ST[Math.min(ST.length - 1, Math.floor(t / step))]),
          amp: packLin([[0, 0.7], [T, 0.7], [end, 0]]) }]);
      },
    })
  );

  /* ---------- EXPLOSION & THUNDER (B23) ----------
     The backlog's "Size small/big, Length, Variation". Explosion sits under Impact (beside Impact, Thud and Sub drop, which
     are hits; this is a blast with a tail), Thunder under Nature (beside Wind, Rain and Fire crackle: the storm's other
     half). Both are seeded noise (packNoise, so two buffers in one render are two noises, C11) and a sine: the same
     Variation renders the same samples, so the ▶ is the clip (C10). Level 1 — "a click SHOULD be quieter than a boom".
     · EXPLOSION: a low thump (a sine dropping hard), a noisy body (the blast) through a lowpass falling from bright to dark
       as the fireball turns to smoke, and a long rumble tail (noise under ~100 Hz) that swells in behind the blast and rolls
       away for the rest of the sound. Big is lower and darker all through, and twice as long. Size is an option, not two
       rows; the row is Big.
     · THUNDER: the crack (three ripping strikes of bright noise in the first fifth of a second), then the roll: two layers
       of dark noise whose level swells and sags at seeded moments as it dies away. FAR is darker (the air takes the top
       off), softer (its own level, 0.6 of Near's, so Add lays it in quieter) and half a second later: sound is slower than
       the flash, so a Far clip dropped on the lightning's frame arrives the way thunder does. */
  const BOOM = {
    // thump: a sine from, to (Hz), gone by (s) · body: its lowpass from, to (Hz), over (s) · rumble: its lowpass (Hz), its swell's top (s)
    big: { thump: [85, 26, 1.1], body: [2600, 140, 1.6], rumble: 110, swell: 0.18 },
    small: { thump: [150, 48, 0.5], body: [5200, 380, 0.75], rumble: 220, swell: 0.08 },
  };
  SFX.push(
    packSound({
      id: 'explosion', name: 'Explosion', cat: 'Impact',
      tags: ['explosion', 'explode', 'boom', 'blast', 'bang', 'bomb', 'detonate', 'kaboom', 'fireball', 'action'],
      choices: { size: { values: ['small', 'big'], def: 'big', say: v => v }, variation: CH_VARIATION, length: CH_LENGTH },
      durFor: p => Math.round((p.size === 'small' ? 1.6 : 3.2) * p.length * 1000) / 1000,
      make(ctx, t0, d, out, p, id) {
        const B = BOOM[p.size], ls = p.length, j = packJitter(id, p.variation);
        // the thump: hit hard, dropping as it goes
        const o = packOsc(ctx, 'sine'); expTo(o.frequency, t0, B.thump[0] * j(0.1), B.thump[1] * j(0.1), B.thump[2] * 0.6 * ls);
        const og = ctx.createGain(); packDecay(og.gain, t0, 0.55, 0.003, B.thump[2] * ls);
        o.connect(og); og.connect(out); o.start(t0); o.stop(t0 + d);
        // the body: the blast, its lowpass closing from bright to dark
        const n = ctx.createBufferSource(); n.buffer = packNoise(ctx, d, id, p.variation, 'body');
        const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.Q.value = 0.7;
        expTo(lp.frequency, t0, B.body[0] * j(0.15), B.body[1] * j(0.15), B.body[2] * ls);
        const ng = ctx.createGain(); packDecay(ng.gain, t0, 0.5, 0.004, d * 0.7);
        n.connect(lp); lp.connect(ng); ng.connect(out); n.start(t0); n.stop(t0 + d);
        // the rumble tail: swelling in behind the blast, then rolling away to the end
        const r = ctx.createBufferSource(); r.buffer = packNoise(ctx, d, id, p.variation, 'rumble');
        const rl = ctx.createBiquadFilter(); rl.type = 'lowpass'; rl.Q.value = 0.9; rl.frequency.value = B.rumble * j(0.15);
        const rg = ctx.createGain(); env(rg.gain, t0, [[0, 0], [B.swell * ls, 2.4], [d * 0.45, 0.9], [d * 0.8, 0.18], [d, 0]]);
        r.connect(rl); rl.connect(rg); rg.connect(out); r.start(t0); r.stop(t0 + d);
      },
    }),
    packSound({
      id: 'thunder', name: 'Thunder', cat: 'Nature',
      tags: ['thunder', 'thunderclap', 'thunderstorm', 'storm', 'lightning', 'rumble', 'crack', 'weather'],
      choices: { distance: { values: ['near', 'far'], def: 'near', say: v => v }, variation: CH_VARIATION, length: CH_LENGTH },
      // Far starts half a second later and rolls for as long; Length stretches the roll, not the delay
      durFor: p => Math.round(((p.distance === 'far' ? 0.5 : 0) + 3.6 * p.length) * 1000) / 1000,
      levelFor: p => p.distance === 'far' ? 0.6 : 1,
      make(ctx, t0, d, out, p, id) {
        const far = p.distance === 'far', ls = p.length, j = packJitter(id, p.variation), r = packRnd(id, p.variation, 'roll');
        const at = far ? 0.45 * j(0.2) : 0.015;
        // the crack: three strikes, each its own noise (C11), the first the loudest; Far's top is taken off by the air
        [[0, 1], [0.07, 0.6], [0.16, 0.45]].forEach(([s, a], i) => {
          const ts = t0 + at + s * j(0.35), len = 0.14;
          const c = ctx.createBufferSource(); c.buffer = packNoise(ctx, len, id, p.variation, 'strike' + i);
          const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = (far ? 1400 : 6500) * j(0.15);
          const g = ctx.createGain(); packDecay(g.gain, ts, a * (far ? 0.4 : 0.7), 0.002, len * (far ? 1 : 0.8));
          c.connect(lp); lp.connect(g); g.connect(out); c.start(ts); c.stop(ts + len);
        });
        // the roll: silent until the crack, up in 60 ms (Far: 250), then a swell or a sag every 0.22–0.47 s on a fall to 2 %
        const pts = [[0, 0], [at, 0], [at + (far ? 0.25 : 0.06) * ls, 1]];
        for (let t = pts[2][0] + 0.3 * ls; t < d - 0.05; t += (0.22 + 0.25 * r()) * ls) pts.push([t, Math.pow(0.02, (t - at) / (d - at)) * (0.45 + 0.55 * r())]);
        pts.push([d, 0]);
        const rg = ctx.createGain(); env(rg.gain, t0, pts);
        rg.connect(out);
        // a growl and a deep layer under it
        [[far ? 200 : 380, 1.2], [far ? 70 : 90, 2.4]].forEach(([f, a], i) => {
          const n = ctx.createBufferSource(); n.buffer = packNoise(ctx, d - at, id, p.variation, 'roll' + i);
          const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.Q.value = 0.8; lp.frequency.value = f * j(0.15);
          const g = ctx.createGain(); g.gain.value = a;
          n.connect(lp); lp.connect(g); g.connect(rg); n.start(t0 + at); n.stop(t0 + d);
        });
      },
    })
  );

  /* ---------- DRUMS (B22) ----------
     A new Drums category: Kick, Snare, Clap, Hi-hat (closed, or open), Ba-dum-tss (the joke sting) and Drumroll. The backlog
     asks for "the recipes from the audio inventory"; that inventory was merged into the backlog and its recipes were not kept
     (tools/design/plans/fxnew-drums/NOTES.md says what was found), so these are the classic analogue drum-machine recipes,
     written for this file — synthesised like everything here, nothing sampled, no machine named. Reasoned, not yet heard:
     his #545 rule is that he listens and picks before they ship.
     · KICK: a sine falling 150 → 50 Hz in 70 ms and settling to 43 Hz as it dies, and the beater's click (6 ms of bright
       noise). Decay is how long it booms.
     · SNARE: the shell (sines at 185 and 330 Hz, its two lowest modes, knocked down a quarter as they sound) and the wires
       (seeded noise between a high-pass and a low-pass, the longer part). Tone is the wires' band and their share: dark,
       normal or bright.
     · CLAP: several hands — three short bursts of band-passed noise about 11 ms apart, each gone before the next, then a
       fourth with the room behind it (Decay is the room).
     · HI-HAT: noise and six square waves a little out of tune with each other (their partials land between each other's:
       metal, not hiss), all above 7 kHz. Closed is gone in a tenth of a second; open rings for most of a second.
     · BA-DUM-TSS: "ba" a snare, "dum" a low tom with the kick 0.16 s later, "tss" the cymbal at 0.55 s — a burst of sizzle,
       then the ring (Decay is the ring).
     · DRUMROLL: snare strokes 55 ms apart (18 a second, the hands alternating and a little loose), building from 60 % to
       full, for Length seconds (0.5–6); then, unless asked not to, the crash: the kick and the cymbal together.
     Seeded like the packs above (packNoise through noiseSeed, C11; packJitter and packRnd by id and Variation), so the ▶ is
     the clip (C10). Levels: Kick 1; Snare, Ba-dum-tss and Drumroll 0.9; Clap 0.85; Hi-hat 0.6 (a hat sits under a beat). */
  const CH_DECAY = { min: 0.5, max: 2, step: 0.05, def: 1, unit: 'x', say: v => v + 'x decay' };
  /* A filter at f Hz, never past 0.45 of the context's rate: queue 709 renders every sound at 22.05 kHz too, and a high-pass
     set above Nyquist passes nothing. q is the Web Audio Q (in dB for a high- or a low-pass). */
  function drumFilter(ctx, type, f, q) {
    const b = ctx.createBiquadFilter(); b.type = type; b.frequency.value = Math.min(0.45 * ctx.sampleRate, f);
    if (q != null) b.Q.value = q;
    return b;
  }
  // A kick at `at` s, `amp` loud: k the pitch ratio, j the Variation's jitter, gone by `end` s, its click's noise from `click`.
  function drumKick(ctx, out, at, amp, k, j, end, click) {
    const o = packOsc(ctx, 'sine');
    o.frequency.setValueAtTime(150 * k * j(0.12), at);
    o.frequency.exponentialRampToValueAtTime(50 * k * j(0.1), at + 0.07);
    o.frequency.exponentialRampToValueAtTime(43 * k * j(0.1), at + end);
    const g = ctx.createGain(); packDecay(g.gain, at, amp, 0.002, end);
    o.connect(g); g.connect(out); o.start(at); o.stop(at + end + 0.01);
    const c = ctx.createBufferSource(); c.buffer = click;
    const hp = drumFilter(ctx, 'highpass', 2500 * k, 0), cg = ctx.createGain();
    packDecay(cg.gain, at, 0.22 * amp, 0.0005, 0.006);
    c.connect(hp); hp.connect(cg); cg.connect(out); c.start(at); c.stop(at + 0.01);
  }
  // The snare's three tones: the wires' band (Hz) and their level, and the shell's level.
  const SNARE_TONE = {
    dark: { hp: 900, lp: 4200, wires: 0.5, body: 0.5 },
    normal: { hp: 1600, lp: 7500, wires: 0.6, body: 0.4 },
    bright: { hp: 2600, lp: 11000, wires: 0.65, body: 0.3 },
  };
  // A snare at `at` s: T one of SNARE_TONE, the wires gone by `end` s, their noise from `wires` (end + 0.01 s of it at least).
  function drumSnare(ctx, out, at, amp, k, j, T, end, wires) {
    [[185, 1], [330, 0.55]].forEach(([f, a]) => {
      const o = packOsc(ctx, 'sine');
      o.frequency.setValueAtTime(1.25 * f * k * j(0.06), at);
      o.frequency.exponentialRampToValueAtTime(f * k * j(0.06), at + 0.03);
      const g = ctx.createGain(); packDecay(g.gain, at, T.body * a * amp, 0.0015, 0.14);
      o.connect(g); g.connect(out); o.start(at); o.stop(at + 0.15);
    });
    const n = ctx.createBufferSource(); n.buffer = wires;
    const hp = drumFilter(ctx, 'highpass', T.hp * k * j(0.1), 0), lp = drumFilter(ctx, 'lowpass', T.lp * k * j(0.1), 0), g = ctx.createGain();
    packDecay(g.gain, at, T.wires * amp, 0.001, end);
    n.connect(hp); hp.connect(lp); lp.connect(g); g.connect(out); n.start(at); n.stop(at + end + 0.01);
  }
  /* Metal, the hi-hat's and the cymbal's: seeded noise and six square waves a little out of tune with each other, above a
     high-pass at f Hz, under one envelope — up to `amp` in 1 ms, then exponential through pts = [[s after the strike, × amp],
     …]. `noise` must last to the last point. */
  const DRUM_METAL = [205.3, 304.4, 369.6, 522.7, 540, 800];
  function drumMetal(ctx, out, at, amp, f, k, j, pts, noise) {
    const end = pts[pts.length - 1][0], hp = drumFilter(ctx, 'highpass', f * k * j(0.08), 0), g = ctx.createGain(), mg = ctx.createGain();
    g.gain.setValueAtTime(0, at); g.gain.linearRampToValueAtTime(amp, at + 0.001);
    pts.forEach(([s, v]) => g.gain.exponentialRampToValueAtTime(amp * v, at + s));
    hp.connect(g); g.connect(out); mg.gain.value = 0.12; mg.connect(hp);
    const n = ctx.createBufferSource(); n.buffer = noise; n.connect(hp); n.start(at); n.stop(at + end);
    DRUM_METAL.forEach(m => { const o = packOsc(ctx, 'square', m * k * j(0.03)); o.connect(mg); o.start(at); o.stop(at + end); });
  }
  const DRUM = { pitch: CH_PITCH, decay: CH_DECAY, variation: CH_VARIATION };
  SFX.push(
    packSound({
      id: 'kick', name: 'Kick', cat: 'Drums', choices: DRUM,
      tags: ['kick', 'kick drum', 'bass drum', 'drum', 'drums', 'beat', 'thump', 'percussion'],
      durFor: p => Math.round(0.6 * p.decay * 1000) / 1000,
      make(ctx, t0, d, out, p, id) {
        drumKick(ctx, out, t0, 0.95, packSemis(p.pitch), packJitter(id, p.variation), 0.55 * p.decay, packNoise(ctx, 0.01, id, p.variation, 'click'));
      },
    }),
    packSound({
      id: 'snare', name: 'Snare', cat: 'Drums', level: 0.9,
      tags: ['snare', 'snare drum', 'drum', 'drums', 'hit', 'beat', 'backbeat', 'crack', 'percussion'],
      choices: { tone: { values: ['dark', 'normal', 'bright'], def: 'normal', say: v => v }, pitch: CH_PITCH, decay: CH_DECAY, variation: CH_VARIATION },
      durFor: p => Math.round(0.4 * p.decay * 1000) / 1000,
      make(ctx, t0, d, out, p, id) {
        const end = 0.36 * p.decay;
        drumSnare(ctx, out, t0, 1, packSemis(p.pitch), packJitter(id, p.variation), SNARE_TONE[p.tone], end, packNoise(ctx, end + 0.02, id, p.variation, 'wires'));
      },
    }),
    packSound({
      id: 'clap', name: 'Clap', cat: 'Drums', level: 0.85, choices: DRUM,
      tags: ['clap', 'hand clap', 'handclap', 'claps', 'clapping', 'drum', 'drums', 'beat', 'percussion'],
      durFor: p => Math.round((0.04 + 0.36 * p.decay) * 1000) / 1000,
      make(ctx, t0, d, out, p, id) {
        // One noise through the hands' band; its level is the hands: three bursts, each gone before the next, then the last
        // one with the room behind it.
        const k = packSemis(p.pitch), j = packJitter(id, p.variation);
        const n = ctx.createBufferSource(); n.buffer = packNoise(ctx, d, id, p.variation, 'hands');
        const hp = drumFilter(ctx, 'highpass', 450 * k, 0), bp = drumFilter(ctx, 'bandpass', 1150 * k * j(0.1), 1.1), g = ctx.createGain();
        n.connect(hp); hp.connect(bp); bp.connect(g); g.connect(out);
        g.gain.setValueAtTime(0, t0);
        let t = 0;
        [0.8, 0.62, 0.9].forEach(a => {
          const gap = 0.011 * j(0.2);
          g.gain.linearRampToValueAtTime(a * j(0.1), t0 + t + 0.0008);
          g.gain.exponentialRampToValueAtTime(0.0001, t0 + t + 0.85 * gap);
          t += gap;
        });
        g.gain.linearRampToValueAtTime(1, t0 + t + 0.0008);
        g.gain.exponentialRampToValueAtTime(0.0001, t0 + t + 0.36 * p.decay);
        n.start(t0); n.stop(t0 + d);
      },
    }),
    packSound({
      id: 'hi-hat', name: 'Hi-hat', cat: 'Drums', level: 0.6,
      tags: ['hi-hat', 'hihat', 'hi hat', 'hat', 'cymbal', 'tss', 'tick', 'drum', 'drums', 'beat', 'percussion'],
      choices: { hat: { values: ['closed', 'open'], def: 'closed', say: v => v }, pitch: CH_PITCH, variation: CH_VARIATION },
      durFor: p => p.hat === 'open' ? 0.75 : 0.16,
      make(ctx, t0, d, out, p, id) {
        // closed: the stick's tick, gone in a tenth of a second · open: the same strike left to ring
        const open = p.hat === 'open', pts = open ? [[0.08, 0.6], [0.7, 0.0002]] : [[0.02, 0.35], [0.16, 0.0002]];
        drumMetal(ctx, out, t0, 0.6, 7000, packSemis(p.pitch), packJitter(id, p.variation), pts, packNoise(ctx, pts[1][0] + 0.01, id, p.variation, open ? 'open' : 'closed'));
      },
    }),
    packSound({
      id: 'rimshot', name: 'Ba-dum-tss', cat: 'Drums', level: 0.9, choices: DRUM,
      tags: ['rimshot', 'ba dum tss', 'ba-dum-tss', 'badum tss', 'ba dum', 'joke', 'punchline', 'comedy', 'sting', 'drum', 'drums', 'cymbal'],
      // the cymbal comes at 0.55 s and rings for 1.25 s (× Decay)
      durFor: p => Math.round((0.6 + 1.3 * p.decay) * 1000) / 1000,
      make(ctx, t0, d, out, p, id) {
        const k = packSemis(p.pitch), j = packJitter(id, p.variation), v = p.variation;
        const dum = 0.16 * j(0.1), tss = 0.55 * j(0.08);
        // ba: the snare, a little lighter and shorter than its row
        drumSnare(ctx, out, t0, 0.8, k, j, SNARE_TONE.normal, 0.2, packNoise(ctx, 0.22, id, v, 'ba'));
        // dum: a low tom (a sine falling 125 → 98 Hz) with the kick under it
        const o = packOsc(ctx, 'sine');
        o.frequency.setValueAtTime(125 * k * j(0.08), t0 + dum);
        o.frequency.exponentialRampToValueAtTime(98 * k * j(0.08), t0 + dum + 0.12);
        const g = ctx.createGain(); packDecay(g.gain, t0 + dum, 0.3, 0.002, 0.35);
        o.connect(g); g.connect(out); o.start(t0 + dum); o.stop(t0 + dum + 0.36);
        drumKick(ctx, out, t0 + dum, 0.5, k, j, 0.45, packNoise(ctx, 0.01, id, v, 'dum'));
        // tss: the cymbal, a burst of sizzle and then the ring
        const ring = 1.25 * p.decay;
        /* 1 — set in CHROME (15 Oct, the first browser run). It went 0.65 → 3 on node's numbers (14–15 Oct: the cymbal at 3
           struck 0.156 in 2 ms RMS against a dum of 0.571, so the dum came down to tom 0.3, kick 0.5), but node's stand-in Web
           Audio (the helper's wa.js, naive squares and its own biquads) makes this cymbal about a seventh as loud, beside the
           drums, as Chrome does. In Chrome, in the test's own 2 ms frames before normalising: the ba 0.30, the dum 0.65, and the
           cymbal 0.54 for every 1 of level — so at 3 it struck 1.61, the onset line (a quarter of the loudest) rose to 0.40, OVER
           the ba, and the sting read as two strikes (0.164, 0.551); once normalised to the cymbal's peak the ba and the dum
           played at a fifth and two fifths of it. At 1 the dum is the loudest again and the cymbal sits just under it (after
           normalising: ba 0.18, dum 0.39, tss 0.32) — over the row and thirteen variants (Variation 2–8, ±12 st, Decay 0.5 and
           2) the ba strikes at 1.73× the line or more (the row 1.85×), the dum at 4×, the cymbal at 2.11× or more (the row
           3.3×), and nothing between or after them comes within 0.64 of it. (The −12 st variant reads a fourth strike at
           0.227 s: the dum's body there falls to ~25 Hz, whose zero crossings a 2 ms frame sees as 20 ms of quiet — the
           detector, not a strike, and the same at every level tried; the row and the other twelve read exactly three.) */
        drumMetal(ctx, out, t0 + tss, 1, 5200, k, j, [[0.06, 0.2], [ring, 0.0002]], packNoise(ctx, ring + 0.01, id, v, 'tss'));
      },
    }),
    packSound({
      id: 'drumroll', name: 'Drumroll', cat: 'Drums', level: 0.9,
      tags: ['drumroll', 'drum roll', 'roll', 'snare roll', 'suspense', 'reveal', 'announcement', 'tension', 'drum', 'drums', 'cymbal', 'crash'],
      choices: {
        length: { min: 0.5, max: 6, step: 0.1, def: 2, unit: 's', say: v => v + ' s' },
        crash: { values: [true, false], def: true, say: v => v ? 'crash' : 'no crash' },
        pitch: CH_PITCH, variation: CH_VARIATION,
      },
      // the roll, then the crash ringing 1.5 s (or the last stroke's 0.11 s)
      durFor: p => Math.round((p.length + (p.crash ? 1.6 : 0.12)) * 1000) / 1000,
      make(ctx, t0, d, out, p, id) {
        const k = packSemis(p.pitch), j = packJitter(id, p.variation), r = packRnd(id, p.variation, 'hands'), L = p.length, v = p.variation;
        const S = 0.055 * j(0.12), ts = [];
        for (let t = 0; t < L - 0.5 * S; t += S * (1 + 0.08 * (r() * 2 - 1))) ts.push(t);
        // one noise for the wires and one sine for the shell, their levels a stroke at a time: up in 2 ms, down to 4 % by the
        // next stroke (the sizzle between), the hands alternating (the left 12 % lighter), building from 60 % to full
        const n = ctx.createBufferSource(); n.buffer = packNoise(ctx, L + 0.12, id, v, 'wires');
        const hp = drumFilter(ctx, 'highpass', 1500 * k * j(0.1), 0), lp = drumFilter(ctx, 'lowpass', 7000 * k * j(0.1), 0), g = ctx.createGain();
        const o = packOsc(ctx, 'sine', 200 * k * j(0.08)), bg = ctx.createGain();
        n.connect(hp); hp.connect(lp); lp.connect(g); g.connect(out); o.connect(bg); bg.connect(out);
        g.gain.setValueAtTime(0, t0); bg.gain.setValueAtTime(0, t0);
        ts.forEach((t, i) => {
          const a = (0.6 + 0.4 * Math.pow(t / L, 1.5)) * (i % 2 ? 0.88 : 1) * (1 + 0.06 * (r() * 2 - 1)), last = i === ts.length - 1;
          const to = t0 + (last ? t + 0.11 : ts[i + 1] - 0.0005), fl = last ? 0.0002 : 0.04;
          g.gain.linearRampToValueAtTime(0.62 * a, t0 + t + 0.0015); g.gain.exponentialRampToValueAtTime(0.62 * a * fl, to);
          bg.gain.linearRampToValueAtTime(0.22 * a, t0 + t + 0.0015); bg.gain.exponentialRampToValueAtTime(0.22 * a * fl, to);
        });
        n.start(t0); n.stop(t0 + L + 0.12); o.start(t0); o.stop(t0 + L + 0.12);
        if (!p.crash) return;
        // the crash on the beat after the roll: the kick and the cymbal together
        drumKick(ctx, out, t0 + L, 0.45, k, j, 0.45, packNoise(ctx, 0.01, id, v, 'crash-kick'));
        drumMetal(ctx, out, t0 + L, 0.6, 5200, k, j, [[0.08, 0.4], [1.5, 0.0003]], packNoise(ctx, 1.51, id, v, 'crash'));
      },
    })
  );

  /* ---------- AMBIENCE (B35) ----------
     A new Ambience category of BEDS — sound to lay under a shot, not a hit: Ocean surf, Crickets at night, Morning birds and
     Room tone. Ported from ChatGPT's pile (05116900, never landed) and rebuilt on the packs' machinery above: its four were
     one fixed 8 s take each (noiseBuffer, hand-placed chirps and calls, no options), faded in and out — so copies laid end to
     end dipped at every join — with a 60 Hz hum. Here: seeded by the sound and its Variation (packNoise through noiseSeed,
     C11; packRnd / packJitter), so the ▶ is the clip (C10); Length 4–60 s in whole seconds (8 by default: a whole number of
     frames at 24, 25, 30 or 60 fps); and Faded or LOOP-READY. Wind, Rain, Fire crackle and Thunder (Nature) are short sounds with tails; these are
     the long, level beds beside them. Synthesised, nothing downloaded. Reasoned, not yet heard: his #545 rule is that he
     listens and picks before they ship (tools/design/plans/pile-ambience/NOTES.md).
     · FADED (the row): 0.3 s fades in and out (AMB_EDGE) and the 0.05 s tail every sound has — lay it down alone and it
       starts and stops without a step.
     · LOOP-READY: no fades, rendered AMB_FOLD past its end, and that overrun crossfaded over its start (ambFold, from
       renderBuffer) — the clip is exactly its length and its last sample runs on into its first, so copies laid end to end,
       or a looped clip, have no join. For that every bed keeps its events (chirps, calls) out of the first AMB_FOLD and
       ends them before its end, and anything that changes slowly (the sea's swell) comes round every `d` seconds (ambCycle).
     · OCEAN SURF: the roar (brown noise under ~500 Hz) and the foam (pink noise in a band that brightens as the wave
       breaks, a moment after the roar peaks), both swelling with a wave every ~4 s — a whole number of them in the bed, each
       placed and sized by the seed: building over 0.45 of its spacing, washing out over the rest. Level 0.42.
     · CRICKETS AT NIGHT: night air (pink noise under ~1.1 kHz, faint) and two crickets — a near one chirping ~2.4 times a
       second, three 14 ms pulses of a ~4.4 kHz tone a chirp, and a fainter one further off (~4.95 kHz, four pulses, ~1.8 a
       second). Level 0.35.
     · MORNING BIRDS: morning air (pink noise around 1.2 kHz, faint) and three singers picked by the seed from five calls (a
       rising tweet said 2–4 times, a falling chip, an up-slurred wheet, a slow whistle, a trill), each its own pitch and
       distance, one call at a time, 0.25–0.95 s apart. Level 0.4.
     · ROOM TONE: pink noise between ~90 Hz and ~3.2 kHz, level, nothing happening in it, and a faint mains hum at 50 Hz
       (the pile had America's 60; Perth's mains are 50) — Hum on, or off ("no hum"). Level 0.25.
     The levels are the pile's: a bed sits under speech and music. */
  const AMB_FOLD = 0.5, AMB_EDGE = 0.3;
  const AMB = {
    length: { min: 4, max: 60, step: 1, def: 8, unit: 's', say: v => v + ' s' },
    loop: { values: [false, true], def: false, say: v => v ? 'loop-ready' : 'faded' },
    variation: CH_VARIATION,
  };
  /* The fold: `buf` ran AMB_FOLD past `secs`. The first AMB_FOLD of the result is the render's own start fading in under the
     overrun fading out — equal power (sin / cos), because the two are unrelated noise and their powers add — so sample 0 IS
     the render's sample at `secs`, the very next one after the result's last. Cut to exactly `secs`. */
  function ambFold(ctx, buf, secs) {
    const sr = buf.sampleRate, n = Math.round(secs * sr), src = buf.getChannelData(0), x = Math.min(Math.round(AMB_FOLD * sr), buf.length - n);
    const res = ctx.createBuffer(1, n, sr), d = res.getChannelData(0);
    d.set(src.subarray(0, Math.min(n, src.length)));
    for (let i = 0; i < x; i++) {
      const w = (i / x) * Math.PI / 2;
      d[i] = src[i] * Math.sin(w) + src[n + i] * Math.cos(w);
    }
    return res;
  }
  // Where a bed's layers go: straight to `out` when loop-ready (the fold makes its edges), else through the 0.3 s fades.
  function ambOut(ctx, t0, d, out, loop) {
    if (loop) return out;
    const g = ctx.createGain(); env(g.gain, t0, [[0, 0], [AMB_EDGE, 1], [d - AMB_EDGE, 1], [d, 0]]); g.connect(out);
    return g;
  }
  /* Seeded noise for a bed (packNoise, so every buffer is its own, C11), tinted the way noiseBuffer tints the older sounds'
     noise: 'pink' (Paul Kellet's filter, -3 dB an octave) or 'brown' (a leaky sum: the low end that makes air and sea). */
  function ambNoise(ctx, secs, id, v, salt, colour) {
    const buf = packNoise(ctx, secs, id, v, salt), d = buf.getChannelData(0);
    let last = 0, b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
    for (let i = 0; i < d.length; i++) {
      const w = d[i];
      if (colour === 'brown') { last = (last + 0.02 * w) / 1.02; d[i] = last * 3.5; continue; }
      b0 = 0.99886 * b0 + w * 0.0555179; b1 = 0.99332 * b1 + w * 0.0750759; b2 = 0.96900 * b2 + w * 0.1538520;
      b3 = 0.86650 * b3 + w * 0.3104856; b4 = 0.55000 * b4 + w * 0.5329522; b5 = -0.7616 * b5 - w * 0.0168980;
      d[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362) * 0.11; b6 = w * 0.115926;
    }
    return buf;
  }
  /* A level that comes round every `d` s: f(u) for u in [0, d), set every 0.05 s from 0 out to `end` (d, or d + AMB_FOLD when
     loop-ready), so the overrun the fold lays over the start carries the level the start had. d is whole seconds, so the
     0.05 s grid lands on d exactly. */
  function ambCycle(param, t0, d, end, f) {
    const pts = [];
    for (let k = 0; k * 0.05 <= end + 1e-9; k++) { const t = k * 0.05; pts.push([t, f(t >= d ? t - d : t)]); }
    env(param, t0, pts);
  }
  /* A bird's note: a sine sliding from f0 to f1 Hz over `len` s (exponentially, so it moves evenly by ear), a vibrato when
     asked ([rate, depth] Hz: the trill), up in 8 ms and away in the last 15. */
  function ambNote(ctx, dst, ts, len, f0, f1, vib, amp) {
    const o = packOsc(ctx, 'sine'); expTo(o.frequency, ts, f0, f1, len);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, ts); g.gain.linearRampToValueAtTime(amp, ts + 0.008);
    g.gain.setValueAtTime(amp, ts + len - 0.015); g.gain.linearRampToValueAtTime(0, ts + len);
    o.connect(g); g.connect(dst);
    o.start(ts); o.stop(ts + len + 0.01);
    if (!vib) return;
    const lfo = packOsc(ctx, 'sine', vib[0]), vd = ctx.createGain(); vd.gain.value = vib[1];
    lfo.connect(vd); vd.connect(o.frequency); lfo.start(ts); lfo.stop(ts + len + 0.01);
  }
  // Morning birds' calls: [what, a note [length s, from Hz, to Hz], said how many times [fewest, most], the gap between (s), vibrato]
  const AMB_CALLS = [
    ['tweet', [0.07, 2300, 3700], [2, 4], 0.05, null],
    ['chip', [0.05, 4200, 2800], [1, 3], 0.07, null],
    ['wheet', [0.16, 1900, 3300], [1, 2], 0.18, null],
    ['whistle', [0.32, 2500, 3100], [1, 1], 0, null],
    ['trill', [0.28, 3200, 3200], [1, 1], 0, [28, 350]],
  ];
  const AMB_WORDS = ['ambience', 'ambient', 'atmosphere', 'background', 'bed'];
  SFX.push(
    packSound({
      id: 'amb-ocean', name: 'Ocean surf', cat: 'Ambience', level: 0.42,
      tags: ['ocean', 'sea', 'surf', 'waves', 'beach', 'shore', 'coast', 'water', 'nature'].concat(AMB_WORDS),
      choices: AMB,
      durFor: p => p.length,
      make(ctx, t0, d, out, p, id) {
        const v = p.variation, j = packJitter(id, v), r = packRnd(id, v, 'waves'), end = d + (p.loop ? AMB_FOLD : 0), dst = ambOut(ctx, t0, d, out, p.loop);
        // the waves: a whole number of them in the bed (one every ~4 s), each placed and sized by the seed
        const n = Math.max(1, Math.round(d / 4)), P = d / n, waves = [];
        for (let k = 0; k < n; k++) waves.push([(k + 0.5 + 0.2 * (r() - 0.5)) * P, 0.75 + 0.25 * r()]);
        // a wave at u s (lagged by `lag`): building for 0.45 of the spacing to the break, washing out over the 0.55 after it,
        // a raised cosine each side; read round the bed (mod d), so it comes round
        const wave = (u, lag) => {
          let s = 0;
          waves.forEach(([c, a]) => {
            const x = (((u - c - lag + 0.45 * P) % d) + d) % d - 0.45 * P;
            if (x < 0) s += a * (0.5 + 0.5 * Math.cos(Math.PI * x / (0.45 * P)));
            else if (x < 0.55 * P) s += a * Math.pow(0.5 + 0.5 * Math.cos(Math.PI * x / (0.55 * P)), 1.5);
          });
          return s;
        };
        // the roar: brown noise under ~500 Hz, never quite gone (the sea is always there), swelling with each wave
        const low = ctx.createBufferSource(); low.buffer = ambNoise(ctx, end, id, v, 'roar', 'brown');
        const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.Q.value = 0.5; lp.frequency.value = 500 * j(0.15);
        const lg = ctx.createGain(); ambCycle(lg.gain, t0, d, end, u => 0.15 + 0.6 * wave(u, 0));
        low.connect(lp); lp.connect(lg); lg.connect(dst);
        // the foam: pink noise in a band that brightens as the wave breaks, a moment after the roar peaks, and hisses away
        const lag = 0.35 * j(0.3);
        const foam = ctx.createBufferSource(); foam.buffer = ambNoise(ctx, end, id, v, 'foam', 'pink');
        const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.Q.value = 0.6;
        ambCycle(bp.frequency, t0, d, end, u => 700 + 1500 * Math.min(1, wave(u, lag)));
        const fg = ctx.createGain(); ambCycle(fg.gain, t0, d, end, u => 0.06 + 1.2 * wave(u, lag));
        foam.connect(bp); bp.connect(fg); fg.connect(dst);
        [low, foam].forEach(s => { s.start(t0); s.stop(t0 + end); });
      },
    }),
    packSound({
      id: 'amb-crickets', name: 'Crickets at night', cat: 'Ambience', level: 0.35,
      tags: ['crickets', 'cricket', 'night', 'insects', 'chirping', 'evening', 'summer', 'countryside', 'nature'].concat(AMB_WORDS),
      choices: AMB,
      durFor: p => p.length,
      make(ctx, t0, d, out, p, id) {
        const v = p.variation, j = packJitter(id, v), r = packRnd(id, v, 'chirps'), end = d + (p.loop ? AMB_FOLD : 0), dst = ambOut(ctx, t0, d, out, p.loop);
        // the night air: pink noise under ~1.1 kHz, faint and level
        const air = ctx.createBufferSource(); air.buffer = ambNoise(ctx, end, id, v, 'air', 'pink');
        const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 1100 * j(0.15);
        const ag = ctx.createGain(); ag.gain.value = 0.1;
        air.connect(lp); lp.connect(ag); ag.connect(dst); air.start(t0); air.stop(t0 + end);
        // two crickets, [its tone (Hz), a chirp every (s), pulses a chirp, how loud]: the near one, and one further off
        [[4400, 0.42, 3, 1], [4950, 0.55, 4, 0.3]].forEach(([hz, every, pulses, amp], c) => {
          const o = packOsc(ctx, 'sine', hz * j(0.06)), g = ctx.createGain(), P = every * j(0.12);
          g.gain.setValueAtTime(0, t0);
          o.connect(g); g.connect(dst);
          // its chirps, from the end of the fold to just before the end, each a few 14 ms pulses 26 ms apart, a little uneven
          for (let t = AMB_FOLD + (c ? 0.1 + 0.17 * r() : 0.02 * r()); t + (pulses - 1) * 0.026 + 0.014 < d - 0.02; t += P * (1 + 0.05 * (r() * 2 - 1))) {
            const a = 0.18 * amp * (1 + 0.1 * (r() * 2 - 1));
            for (let k = 0; k < pulses; k++) {
              const ts = t0 + t + k * 0.026;
              g.gain.setValueAtTime(0, ts); g.gain.linearRampToValueAtTime(a, ts + 0.002);
              g.gain.linearRampToValueAtTime(0.6 * a, ts + 0.011); g.gain.linearRampToValueAtTime(0, ts + 0.014);
            }
          }
          o.start(t0); o.stop(t0 + end);
        });
      },
    }),
    packSound({
      id: 'amb-birds', name: 'Morning birds', cat: 'Ambience', level: 0.4,
      tags: ['birds', 'bird', 'birdsong', 'chirp', 'tweet', 'morning', 'dawn', 'park', 'garden', 'forest', 'nature'].concat(AMB_WORDS),
      choices: AMB,
      durFor: p => p.length,
      make(ctx, t0, d, out, p, id) {
        const v = p.variation, j = packJitter(id, v), r = packRnd(id, v, 'birds'), end = d + (p.loop ? AMB_FOLD : 0), dst = ambOut(ctx, t0, d, out, p.loop);
        // the morning air: pink noise in a broad band around 1.2 kHz (leaves, a far road), faint and level
        const air = ctx.createBufferSource(); air.buffer = ambNoise(ctx, end, id, v, 'air', 'pink');
        const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.Q.value = 0.5; bp.frequency.value = 1200 * j(0.2);
        const ag = ctx.createGain(); ag.gain.value = 0.09;
        air.connect(bp); bp.connect(ag); ag.connect(dst); air.start(t0); air.stop(t0 + end);
        // three singers, each a call of its own (picked by the seed), its own pitch (within 4 semitones) and distance
        const pool = AMB_CALLS.slice(), birds = [];
        for (let k = 0; k < 3; k++) birds.push({ c: pool.splice(Math.floor(r() * pool.length), 1)[0], k: packSemis(4 * (r() * 2 - 1)), amp: [1, 0.7, 0.45][k] });
        // one call at a time, by a singer picked at random, 0.25 - 0.95 s after the last one ended; none in the fold, none
        // running past the end
        for (let t = AMB_FOLD + 0.1 * r(); ;) {
          const b = birds[Math.floor(r() * birds.length)], note = b.c[1], times = b.c[2], gap = b.c[3];
          const n = times[0] + Math.floor(r() * (times[1] - times[0] + 1)), len = n * note[0] + (n - 1) * gap;
          if (t + len > d - 0.02) break;
          for (let i = 0; i < n; i++) ambNote(ctx, dst, t0 + t + i * (note[0] + gap), note[0], note[1] * b.k, note[2] * b.k, b.c[4], 0.23 * b.amp);
          t += len + 0.25 + 0.7 * r();
        }
      },
    }),
    packSound({
      id: 'amb-room', name: 'Room tone', cat: 'Ambience', level: 0.25,
      tags: ['room tone', 'room', 'tone', 'silence', 'quiet', 'air', 'hum', 'indoor', 'interior', 'fill'].concat(AMB_WORDS),
      choices: { length: AMB.length, loop: AMB.loop, hum: { values: [true, false], def: true, say: v => v ? 'hum' : 'no hum' }, variation: CH_VARIATION },
      durFor: p => p.length,
      make(ctx, t0, d, out, p, id) {
        const v = p.variation, j = packJitter(id, v), end = d + (p.loop ? AMB_FOLD : 0), dst = ambOut(ctx, t0, d, out, p.loop);
        // the room's air: pink noise between ~90 Hz and ~3.2 kHz, level; nothing in it happens
        const air = ctx.createBufferSource(); air.buffer = ambNoise(ctx, end, id, v, 'air', 'pink');
        const hp = drumFilter(ctx, 'highpass', 90 * j(0.2)), lp = drumFilter(ctx, 'lowpass', 3200 * j(0.2)), g = ctx.createGain();
        g.gain.value = 0.2;
        air.connect(hp); hp.connect(lp); lp.connect(g); g.connect(dst); air.start(t0); air.stop(t0 + end);
        if (!p.hum) return;
        // the mains hum, faint (reasoned ~4 % of the room's power, -14 dB; the pile's 0.008 was ~10 %): 50 Hz, a whole number
        // of cycles in any whole-second bed, so it comes round too
        const hum = packOsc(ctx, 'sine', 50), hg = ctx.createGain(); hg.gain.value = 0.005;
        hum.connect(hg); hg.connect(dst); hum.start(t0); hum.stop(t0 + end);
      },
    })
  );

  /* ---------- EVERYDAY FOLEY (#966 B36) ----------
     A new Foley category: Door knock, Footsteps, Tick-tock, Phone vibrate, Typing and Ka-ching — the backlog's "Everyday
     foley: knock, footsteps, tick-tock, vibrate, typing, ka-ching". Ported by hand from ChatGPT's pile (ae637420): its six
     sounds, ids, names, the Foley heading and the rows' levels, rebuilt on the packs' machinery with choices; what was taken
     and what changed is in tools/design/plans/pile-foley/NOTES.md. Synthesised like everything here, nothing sampled.
     Reasoned, not yet heard: his #545 rule is that he listens and picks before they ship.
     · DOOR KNOCK: a knuckle (30 ms of band-passed noise) on a door (two of the panel's modes, sines at ~180 Hz and 2.37x
       that, dying in about a tenth of a second), about 0.17 s apart and a little uneven, the first the firmest. Knocks 1-6
       (3 by default). Force: soft (duller, slower, quieter), firm, or pound (a fist: lower, longer, slower and louder).
     · FOOTSTEPS: each step a heel and then its toe 50 ms later (30 ms running) — thuds of low-passed noise, a hard floor
       adding the heel's click — the feet alternating (one 14 % lighter), a steady ~1.9 steps a second walking or ~3.1
       running. Steps 2-16 (6 by default). A soft floor (carpet, grass) is duller and quieter.
     · TICK-TOCK: a clock's escapement once a second (or twice): a click, the ring it sets off and the case answering low,
       the tick at ~2.6 kHz and the tock at ~1.9 kHz, alternating. Length in whole seconds, one tick a second.
     · PHONE VIBRATE: the motor (a saw at ~175 Hz spinning up and down) in buzzes of ~0.38 s, one every 0.62 s. Buzzes 1-8
       (3 by default). On a table it rattles an octave up, brighter; in a pocket it is muffled, and quieter.
     · TYPING: words of 2-7 keys at an uneven typing rhythm, then the space bar (lower, longer) and a pause before the next
       word. Each key is its own click (band-passed noise, each key its own pitch) and its bottoming out. Length in whole
       seconds; steady (~6 keys a second) or fast (~10); a mechanical keyboard clicks harder and higher, and louder.
     · KA-CHING: the "ka" — the lever's clack and, 30 ms later, the drawer's clunk — then the "ching": a small bell struck
       0.13 s in (three inharmonic partials and a twin a hair sharp, so it shimmers), ringing about a second. Pitch moves the
       bell, Length its ring.
     Seeded like the packs above (packNoise through noiseSeed, C11; packJitter and packRnd by id and Variation; Variation 1 is
     the recipe as written), so the same choices render the same samples and the ▶ is the clip (C10). A choice that sounds
     softer IS quieter — it has its own level (levelFor), so Add lays it in lower: knock soft 0.4 / firm 0.68 / pound 1;
     footsteps hard 0.58 / soft 0.4 (running 1.2x); vibrate on a table 0.48 / in a pocket 0.3; typing on a laptop 0.45 /
     mechanical 0.6. Tick-tock 0.43 and Ka-ching 0.65. The rows keep the pile's levels. */
  // A tap: `noise` band-passed at f Hz (Q q), up to `amp` in 1 ms and gone by `len` s — a knuckle, a heel's click, a key.
  function foleyTap(ctx, out, at, amp, f, q, len, noise) {
    const bp = drumFilter(ctx, 'bandpass', f, q), g = ctx.createGain();
    packDecay(g.gain, at, amp, 0.001, len);
    const n = ctx.createBufferSource(); n.buffer = noise;
    n.connect(bp); bp.connect(g); g.connect(out); n.start(at); n.stop(at + len);
  }
  // A thud: `noise` low-passed at f Hz, up to `amp` in `atk` s and gone by `len` s — a heel, a toe.
  function foleyThud(ctx, out, at, amp, f, atk, len, noise) {
    const lp = drumFilter(ctx, 'lowpass', f, 0), g = ctx.createGain();
    packDecay(g.gain, at, amp, atk, len);
    const n = ctx.createBufferSource(); n.buffer = noise;
    n.connect(lp); lp.connect(g); g.connect(out); n.start(at); n.stop(at + len);
  }
  /* A ring: a sine at f Hz, up to `amp` in `atk` s and falling exponentially to a thousandth of that at `len` s — a door's
     mode, a clock's ping, a bell's partial. Left out above 0.45 of the context's rate (queue 709 renders at 22.05 kHz too). */
  function foleyRing(ctx, out, at, amp, f, atk, len) {
    if (!(f < 0.45 * ctx.sampleRate)) return;
    const o = packOsc(ctx, 'sine', f), g = ctx.createGain();
    g.gain.setValueAtTime(0, at); g.gain.linearRampToValueAtTime(amp, at + atk); g.gain.exponentialRampToValueAtTime(amp * 0.001, at + len);
    o.connect(g); g.connect(out); o.start(at); o.stop(at + len);
  }
  /* gap: s between knocks · tap: the knuckle's band (Hz), weight and length (s) · door: the panel's lowest mode (Hz), its
     weight and how long it rings (s) · level: the clip's level (a soft knock lands quieter, a pound louder) */
  const KNOCK = {
    soft: { gap: 0.2, tap: 650, tapAmp: 1, tapLen: 0.03, door: 170, doorAmp: 0.6, ring: 0.1, level: 0.4 },
    firm: { gap: 0.17, tap: 1100, tapAmp: 1.6, tapLen: 0.03, door: 180, doorAmp: 0.6, ring: 0.12, level: 0.68 },
    pound: { gap: 0.26, tap: 700, tapAmp: 1.4, tapLen: 0.05, door: 115, doorAmp: 0.8, ring: 0.2, level: 1 },
  };
  // gap: s between steps · toe: s from the heel to the toe
  const FOLEY_STEP = { walk: { gap: 0.52, toe: 0.05 }, run: { gap: 0.32, toe: 0.03 } };
  // the heel's (and toe's) low-pass (Hz), attack (s), length (s) and weight · click: the hard heel's click (its weight; 0 = none)
  const FOLEY_FLOOR = { hard: { lp: 700, atk: 0.002, len: 0.07, amp: 4, click: 1 }, soft: { lp: 350, atk: 0.006, len: 0.09, amp: 5, click: 0 } };
  // the motor's low-pass (Hz), and the rattle an octave up (its weight; 0 = none)
  const FOLEY_BUZZ = { table: { lp: 1400, rattle: 0.25 }, pocket: { lp: 280, rattle: 0 } };
  // each key's click (Hz, ±20 % key to key), its Q and length (s) · bottom: the key bottoming out, `after` s later, its band and weight
  const FOLEY_KEYS = {
    laptop: { click: 2600, q: 1.4, len: 0.025, after: 0.008, bottom: 900, weight: 0.5 },
    mechanical: { click: 3400, q: 2.5, len: 0.02, after: 0.012, bottom: 1100, weight: 0.8 },
  };
  SFX.push(
    packSound({
      id: 'foley-knock', name: 'Door knock', cat: 'Foley',
      tags: ['knock', 'door knock', 'knocking', 'door', 'knuckles', 'visitor', 'wood', 'foley'],
      choices: {
        knocks: { min: 1, max: 6, step: 1, def: 3, unit: '', say: v => v + (v === 1 ? ' knock' : ' knocks') },
        force: { values: ['soft', 'firm', 'pound'], def: 'firm', say: v => v },
        variation: CH_VARIATION,
      },
      // the first knock 30 ms in, the gaps at their longest (+19 %), the last knock's ring and a breath after it
      durFor: p => Math.round((0.03 + (p.knocks - 1) * KNOCK[p.force].gap * 1.19 + KNOCK[p.force].ring + 0.08) * 1000) / 1000,
      levelFor: p => KNOCK[p.force].level,
      make(ctx, t0, d, out, p, id) {
        const K = KNOCK[p.force], v = p.variation, j = packJitter(id, v), r = packRnd(id, v, 'hand');
        const gap = K.gap * j(0.1), door = K.door * j(0.06), tap = K.tap * j(0.1);
        let at = t0 + 0.03;
        for (let i = 0; i < p.knocks; i++) {
          // the first knock the firmest, the rest 82-97 % of it; each knuckle its own noise and a little higher or lower
          const a = i === 0 ? 1 : 0.82 + 0.15 * r();
          foleyTap(ctx, out, at, K.tapAmp * a, tap * (0.94 + 0.12 * r()), 1.2, K.tapLen, packNoise(ctx, K.tapLen, id, v, 'knuckle' + i));
          foleyRing(ctx, out, at, K.doorAmp * a, door, 0.001, K.ring);
          foleyRing(ctx, out, at, 0.4 * K.doorAmp * a, door * 2.37, 0.001, 0.6 * K.ring);
          // a hand is a little early or late: each gap ±8 %
          at += gap * (1 + 0.08 * (r() * 2 - 1));
        }
      },
    }),
    packSound({
      id: 'foley-footsteps', name: 'Footsteps', cat: 'Foley',
      tags: ['footsteps', 'footstep', 'steps', 'walking', 'walk', 'running', 'run', 'feet', 'foley'],
      choices: {
        steps: { min: 2, max: 16, step: 1, def: 6, unit: '', say: v => v + ' steps' },
        pace: { values: ['walk', 'run'], def: 'walk', say: v => v },
        floor: { values: ['hard', 'soft'], def: 'hard', say: v => v + ' floor' },
        variation: CH_VARIATION,
      },
      // the first step 50 ms in, the gaps at their longest (+9 %), the last toe and a breath after it
      durFor: p => Math.round((0.05 + (p.steps - 1) * FOLEY_STEP[p.pace].gap * 1.09 + 0.3) * 1000) / 1000,
      levelFor: p => Math.round((p.floor === 'soft' ? 0.4 : 0.58) * (p.pace === 'run' ? 1.2 : 1) * 1000) / 1000,
      make(ctx, t0, d, out, p, id) {
        const S = FOLEY_STEP[p.pace], F = FOLEY_FLOOR[p.floor], v = p.variation, j = packJitter(id, v), r = packRnd(id, v, 'feet');
        const gap = S.gap * j(0.05), toe = S.toe * j(0.08), lp = F.lp * j(0.1), click = 2200 * j(0.1);
        let at = t0 + 0.05;
        for (let i = 0; i < p.steps; i++) {
          // the feet alternate (one 14 % lighter), each step a little firmer or lighter (±6 %)
          const a = (i % 2 ? 0.86 : 1) * (1 + 0.06 * (r() * 2 - 1));
          foleyThud(ctx, out, at, F.amp * a, lp, F.atk, F.len, packNoise(ctx, F.len, id, v, 'heel' + i));
          if (F.click) foleyTap(ctx, out, at, F.click * a, click, 1.5, 0.02, packNoise(ctx, 0.02, id, v, 'click' + i));
          foleyThud(ctx, out, at + toe, 0.5 * F.amp * a, lp * 1.2, F.atk, 0.05, packNoise(ctx, 0.05, id, v, 'toe' + i));
          if (F.click) foleyTap(ctx, out, at + toe, 0.4 * F.click * a, click * 1.15, 1.5, 0.015, packNoise(ctx, 0.015, id, v, 'toeclick' + i));
          // a steady pace: each gap ±3 %
          at += gap * (1 + 0.03 * (r() * 2 - 1));
        }
      },
    }),
    packSound({
      id: 'foley-clock', name: 'Tick-tock', cat: 'Foley', level: 0.43,
      tags: ['tick-tock', 'tick tock', 'ticking', 'clock', 'tick', 'tock', 'time', 'waiting', 'foley'],
      choices: {
        length: { min: 2, max: 30, step: 1, def: 4, unit: 's', say: v => v + ' s' },
        rate: { values: [1, 2], def: 1, say: v => v === 2 ? 'twice a second' : 'once a second' },
        variation: CH_VARIATION,
      },
      durFor: p => p.length,
      make(ctx, t0, d, out, p, id) {
        const v = p.variation, j = packJitter(id, v), r = packRnd(id, v, 'clock');
        const tick = 2600 * j(0.05), tock = 1900 * j(0.05), n = Math.round(p.length * p.rate);
        for (let i = 0; i < n; i++) {
          // the tick the louder; each a hair firmer or softer (±5 %) — the beat itself is a clock's, exact
          const at = t0 + 0.05 + i / p.rate, f = i % 2 ? tock : tick, a = (i % 2 ? 0.8 : 1) * (1 + 0.05 * (r() * 2 - 1));
          // the escapement's click (6 ms of bright noise), the ring it sets off, and the case answering it, low
          foleyTap(ctx, out, at, 1.5 * a, 3500, 0.8, 0.006, packNoise(ctx, 0.006, id, v, 'click' + i));
          foleyRing(ctx, out, at, 0.5 * a, f, 0.001, 0.05);
          foleyRing(ctx, out, at, 0.15 * a, f * 0.2, 0.001, 0.03);
        }
      },
    }),
    packSound({
      id: 'foley-vibrate', name: 'Phone vibrate', cat: 'Foley',
      tags: ['vibrate', 'vibration', 'phone', 'buzz', 'buzzing', 'notification', 'mobile', 'silent', 'foley'],
      choices: {
        buzzes: { min: 1, max: 8, step: 1, def: 3, unit: '', say: v => v + (v === 1 ? ' buzz' : ' buzzes') },
        surface: { values: ['table', 'pocket'], def: 'table', say: v => v === 'pocket' ? 'in a pocket' : 'on a table' },
        variation: CH_VARIATION,
      },
      // the first buzz 30 ms in, the gaps and the buzz at their longest (+5 %, +8 %), and a breath after it
      durFor: p => Math.round((0.03 + (p.buzzes - 1) * 0.62 * 1.05 + 0.38 * 1.08 + 0.08) * 1000) / 1000,
      levelFor: p => p.surface === 'pocket' ? 0.3 : 0.48,
      make(ctx, t0, d, out, p, id) {
        const B = FOLEY_BUZZ[p.surface], v = p.variation, j = packJitter(id, v);
        const f = 175 * j(0.06), len = 0.38 * j(0.08), every = 0.62 * j(0.05);
        const lp = drumFilter(ctx, 'lowpass', B.lp * j(0.1), 0);
        lp.connect(out);
        for (let i = 0; i < p.buzzes; i++) {
          const at = t0 + 0.03 + i * every, g = ctx.createGain();
          // up in 20 ms, steady, down in 30 ms
          g.gain.setValueAtTime(0, at); g.gain.linearRampToValueAtTime(1, at + 0.02); g.gain.setValueAtTime(1, at + len - 0.03); g.gain.linearRampToValueAtTime(0, at + len);
          g.connect(lp);
          // the motor: a saw spinning up from 60 % of its speed in 50 ms and running down to 70 % as it stops; on a table the rattle an octave up
          const voices = [['sawtooth', 1, 0.5]].concat(B.rattle ? [['square', 2, B.rattle]] : []);
          voices.forEach(([type, m, amp]) => {
            const o = packOsc(ctx, type), og = ctx.createGain(); og.gain.value = amp;
            o.frequency.setValueAtTime(0.6 * f * m, at); o.frequency.linearRampToValueAtTime(f * m, at + 0.05);
            o.frequency.setValueAtTime(f * m, at + len - 0.04); o.frequency.linearRampToValueAtTime(0.7 * f * m, at + len);
            o.connect(og); og.connect(g); o.start(at); o.stop(at + len);
          });
        }
      },
    }),
    packSound({
      id: 'foley-typing', name: 'Typing', cat: 'Foley',
      tags: ['typing', 'keyboard', 'keys', 'type', 'computer', 'laptop', 'office', 'writing', 'foley'],
      choices: {
        length: { min: 1, max: 20, step: 1, def: 3, unit: 's', say: v => v + ' s' },
        speed: { values: ['steady', 'fast'], def: 'steady', say: v => v },
        keyboard: { values: ['laptop', 'mechanical'], def: 'laptop', say: v => v + ' keys' },
        variation: CH_VARIATION,
      },
      durFor: p => p.length,
      levelFor: p => p.keyboard === 'mechanical' ? 0.6 : 0.45,
      make(ctx, t0, d, out, p, id) {
        const K = FOLEY_KEYS[p.keyboard], v = p.variation, j = packJitter(id, v), r = packRnd(id, v, 'hands');
        const g = (p.speed === 'fast' ? 0.1 : 1 / 6) * j(0.1), end = p.length - 0.15;
        let t = 0.06, i = 0;
        while (t < end) {
          // a word of 2-7 keys, unevenly spaced (0.5-1.4 of the beat), the last one followed by the space bar
          const word = 2 + Math.floor(r() * 6);
          for (let k = 0; k < word && t < end; k++, i++) {
            const a = 0.6 + 0.4 * r(), kt = t0 + t;
            foleyTap(ctx, out, kt, a, K.click * (0.8 + 0.4 * r()) * j(0.08), K.q, K.len, packNoise(ctx, K.len, id, v, 'key' + i));
            foleyTap(ctx, out, kt + K.after, K.weight * a, K.bottom * (0.9 + 0.2 * r()), 1, 0.03, packNoise(ctx, 0.03, id, v, 'bottom' + i));
            t += g * (k < word - 1 ? 0.5 + 0.9 * r() : 0.6 + 0.8 * r());
          }
          if (t >= end) break;
          // the space bar: lower and longer, with its stabiliser's rattle; then a pause (0.8-2.4 of the beat) before the next word
          const st = t0 + t;
          foleyTap(ctx, out, st, 1.3, 650 * j(0.08), 0.9, 0.05, packNoise(ctx, 0.05, id, v, 'space' + i));
          foleyTap(ctx, out, st + 0.006, 0.4, 1800 * j(0.08), 1.2, 0.04, packNoise(ctx, 0.04, id, v, 'rattle' + i));
          i++;
          t += g * (0.8 + 1.6 * r());
        }
      },
    }),
    packSound({
      id: 'foley-kaching', name: 'Ka-ching', cat: 'Foley', level: 0.65,
      tags: ['ka-ching', 'kaching', 'cha-ching', 'cash register', 'cash', 'till', 'money', 'sale', 'sold', 'foley'],
      choices: { pitch: CH_PITCH, variation: CH_VARIATION, length: CH_LENGTH },
      // the ka, the bell struck at 0.13 s, its ring (1.2 s, stretched by Length) and a breath after it
      durFor: p => Math.round((0.13 + 1.2 * p.length + 0.07) * 1000) / 1000,
      make(ctx, t0, d, out, p, id) {
        const k = packSemis(p.pitch), v = p.variation, j = packJitter(id, v), ls = p.length, ch = t0 + 0.13;
        // ka: the lever's clack, then 30 ms later the drawer's clunk and its thump
        foleyTap(ctx, out, t0 + 0.005, 1.6, 2400 * j(0.1), 1.2, 0.03, packNoise(ctx, 0.03, id, v, 'clack'));
        foleyTap(ctx, out, t0 + 0.035, 1.4, 500 * j(0.1), 1, 0.05, packNoise(ctx, 0.05, id, v, 'clunk'));
        foleyRing(ctx, out, t0 + 0.035, 0.35, 140 * j(0.08), 0.002, 0.06);
        // ching: the striker's tick, then the bell — its partial, a twin a hair sharp (the shimmer), and two higher partials dying sooner
        const f = 2200 * k * j(0.03);
        foleyTap(ctx, out, ch, 0.6, 6000, 1, 0.01, packNoise(ctx, 0.01, id, v, 'strike'));
        [[1, 0.5, 1.2], [1.004, 0.25, 1.1], [2.32, 0.22, 0.7], [4.1, 0.1, 0.4]].forEach(([m, a, len]) => foleyRing(ctx, out, ch, a, f * m, 0.002, len * ls));
      },
    })
  );

  /* Icons for the new headings — PLACEHOLDERS: the real ones are a #545 design item, drawn and picked with him. Drawn to
     the audio browser's rules (js/audio-fx-browser.js AUDIO_CAT_ICON): a 24 × 24 box, stroked, no fill, and each says what
     it draws. Nothing shows them yet — the sheet's headings are words; the place for an icon is backlog 9.1's category
     chips, drawn first. */
  const SFX_CAT_ICON = {
    // a coiled spring with a ball on top: the boing
    Cartoon: '<circle cx="12" cy="4.6" r="2"/><path d="M7.5 9.2h9l-9 3h9l-9 3h9l-9 3h9M8 20.6h8"/>',
    // a game pad: the cross on the left, two buttons on the right
    Game: '<rect x="3.2" y="7.6" width="17.6" height="9.6" rx="4.8"/><path d="M8 10.4v4.4M5.8 12.6h4.4"/><circle cx="15.4" cy="11.4" r=".9"/><circle cx="17.6" cy="13.8" r=".9"/>',
    // a drum with its two sticks resting on the head (#966 B22)
    Drums: '<ellipse cx="12" cy="11" rx="7.5" ry="2.6"/><path d="M4.5 11v6c0 1.44 3.36 2.6 7.5 2.6s7.5-1.16 7.5-2.6v-6M10.2 9.4 6.4 3.4M13.8 9.4l3.8-6"/>',
    // a low sun on the horizon, its rays, and two lines of waves under it (#966 B35)
    Ambience: '<path d="M3 12h18M7 12a5 5 0 0 1 10 0M12 3.6v1.8M6.4 5.9l1.3 1.3M17.6 5.9l-1.3 1.3"/><path d="M3 16c1.5-1.2 3-1.2 4.5 0s3 1.2 4.5 0 3-1.2 4.5 0 3 1.2 4.5 0M6 19.5c1.5-1.2 3-1.2 4.5 0s3 1.2 4.5 0 3-1.2 4.5 0"/>',
    // a door on its floor, its handle, and the knock's two marks beside it (#966 B36)
    Foley: '<path d="M6 21V3.8h9.4V21M3.6 21h16.8"/><circle cx="13.2" cy="12.4" r=".9"/><path d="M18.2 7.6l2.2-1.2M18.2 10.6h2.6"/>',
  };
  function catIcon(cat) {
    const p = Object.prototype.hasOwnProperty.call(SFX_CAT_ICON, cat) ? SFX_CAT_ICON[cat] : null;
    return p ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + p + '</svg>' : null;
  }

  // ---- render + encode --------------------------------------------------------------------------
  /* A little headroom, applied to EVERY effect through one node rather than by hand-tuning sixteen
   * recipes: the pieces above are written to sound right relative to each other, and a master trim is
   * the one place to keep the set clear of 0 dBFS.
   * Every recipe is handed its OUTPUT NODE rather than reaching for ctx.destination. The first cut
   * passed a proxy context with `destination` overridden — which throws "Illegal invocation" on the
   * first createGain(), because a native method called with a plain object as `this` is refused. All
   * sixteen failed identically; the probe caught it before any of this was wired to a button. */
  const MASTER = 0.82;

  function offlineCtx(secs) {
    const AC = window.OfflineAudioContext || window.webkitOfflineAudioContext;
    if (!AC) return null;
    return new AC(1, Math.max(1, Math.ceil(secs * SR)), SR);
  }

  /* NORMALISED AFTER RENDERING, not tuned by hand. Measured across the set as first written, peaks ran
   * from 0.08 (Reverse whoosh) to 0.90 (Impact) — an eleven-fold spread, because a bandpassed noise
   * sweep and a sine drop simply do not arrive at the same level from similar-looking gain envelopes.
   * Left alone, adding a whoosh after an impact sounds like nothing happened.
   * So each effect is scaled to a common peak, and `level` is how a recipe asks to sit deliberately
   * below it — a click SHOULD be quieter than a boom. That makes relative loudness a decision in the
   * catalogue rather than a side effect of the synthesis. */
  const TARGET_PEAK = 0.89;

  function normalise(buf, level) {
    const d = buf.getChannelData(0);
    let peak = 0;
    for (let i = 0; i < d.length; i++) { const a = Math.abs(d[i]); if (a > peak) peak = a; }
    if (peak < 1e-5) return buf;                       // silent: nothing to scale, and the probe reports it
    const k = (TARGET_PEAK * (level == null ? 1 : level)) / peak;
    for (let i = 0; i < d.length; i++) d[i] *= k;
    return buf;
  }

  function renderBuffer(def, opts) {
    const o = bedOpts(def, opts);
    if (o) return renderBed(def, o);
    /* A LOOP-READY bed (#966 B35) renders AMB_FOLD past its end instead of the 0.05 s tail, and ambFold lays that overrun over
       its start and cuts it to exactly `dur`, so its last sample runs on into its first. Every other sound: as it always was. */
    const ctx = offlineCtx(def.dur + (def.loop ? AMB_FOLD : 0.05));
    if (!ctx) return Promise.reject(new Error('no OfflineAudioContext'));
    // Everything the recipes connect to goes through the trim first.
    const trim = ctx.createGain(); trim.gain.value = MASTER;
    trim.connect(ctx.destination);
    def.render(ctx, 0, def.dur, trim);
    return ctx.startRendering().then(buf => normalise(def.loop ? ambFold(ctx, buf, def.dur) : buf, def.level));
  }
  /* A bed (9.3): `o.length` seconds (the sound's own length if none is asked for), its 0.3 s edges faded — or, loop-ready,
     rendered half a second longer with no fades and folded (loopFold). Normalised like every sound, after the fold. */
  function renderBed(def, o) {
    const secs = o.length || def.dur, extra = o.loop ? LOOP_XFADE : 0;
    const ctx = offlineCtx(secs + (o.loop ? extra : 0.05));
    if (!ctx) return Promise.reject(new Error('no OfflineAudioContext'));
    const trim = ctx.createGain(); trim.gain.value = MASTER;
    trim.connect(ctx.destination);
    let out = trim;
    if (!o.loop) { out = ctx.createGain(); env(out.gain, 0, [[0, 0], [BED_EDGE, 1], [secs - BED_EDGE, 1], [secs, 0]]); out.connect(trim); }
    def.bed(ctx, 0, secs + extra, out, o);
    return ctx.startRendering().then(buf => normalise(o.loop ? loopFold(ctx, buf, secs) : buf, def.level));
  }

  /* WAV, not WebM: this is decoded again immediately by FM.loadVideoFile, and 16-bit PCM is the one
   * container every engine reads without a codec question. A 2-second mono effect is ~176 KB, which
   * never touches disk — it goes straight into the media pipeline. */
  /* WAV writer. Sound effects are mono, and this used to hard-code that: it read getChannelData(0)
   * and declared 1 channel in the header. Correct for its original job, and silently WRONG the
   * moment the audio-only export (queue 216) handed it the project mix, which is stereo — the whole
   * right channel went in the bin and nothing said a word. Measured, not guessed: a 2-second stereo
   * mix came out as a 192KB file where 384KB was expected.
   * It follows the buffer's own channel count now and interleaves. A mono buffer produces byte-for-
   * byte what it always did, so nothing the sound effects do changes. */
  function encodeWav(buf) {
    const n = buf.length;
    const nch = Math.max(1, buf.numberOfChannels || 1);
    const chans = [];
    for (let c = 0; c < nch; c++) chans.push(buf.getChannelData(c));
    const blockAlign = nch * 2;                     // 16-bit samples
    const bytes = 44 + n * blockAlign;
    const dv = new DataView(new ArrayBuffer(bytes));
    const str = (off, s) => { for (let i = 0; i < s.length; i++) dv.setUint8(off + i, s.charCodeAt(i)); };
    str(0, 'RIFF'); dv.setUint32(4, bytes - 8, true); str(8, 'WAVE');
    str(12, 'fmt '); dv.setUint32(16, 16, true); dv.setUint16(20, 1, true); dv.setUint16(22, nch, true);
    dv.setUint32(24, buf.sampleRate, true); dv.setUint32(28, buf.sampleRate * blockAlign, true);
    dv.setUint16(32, blockAlign, true); dv.setUint16(34, 16, true);
    str(36, 'data'); dv.setUint32(40, n * blockAlign, true);
    let off = 44;
    for (let i = 0; i < n; i++) {
      for (let c = 0; c < nch; c++) {
        const v = Math.max(-1, Math.min(1, chans[c][i]));
        dv.setInt16(off, v < 0 ? v * 0x8000 : v * 0x7fff, true);
        off += 2;
      }
    }
    return new Blob([dv.buffer], { type: 'audio/wav' });
  }

  function byId(id) { return SFX.find(s => s.id === id) || null; }

  // ---- preview (live) ---------------------------------------------------------------------------
  let liveCtx = null;
  /* ⚠️ NO PROTOTYPE-PROXY. THAT IS WHAT MADE EVERY PREVIEW SILENT (queue 562).
   * This used to build `Object.create(liveCtx)` and redefine `destination` on it, so the recipes would
   * connect to the trim gain instead of the speakers. A plain object with the context as its PROTOTYPE
   * has none of the context's internal slots, and native methods check for those — so the first line of
   * any recipe threw. Measured: `createOscillator()`, `createBuffer()`, `currentTime` and `sampleRate`
   * all throw **TypeError: Illegal invocation** through such an object; only `destination` worked,
   * because it was the one own property redefined on it.
   * And the whole body sat inside `catch (e) {}`, so the throw was swallowed and every ▶ did nothing
   * with no error anywhere. That silent catch is why this survived — it now says so instead.
   * ⚠️ THE PROXY WAS NEVER NEEDED. `renderBuffer` — the ADD path, which works — already calls
   * `def.render(ctx, 0, dur, trim)`: every recipe takes its destination as a FOURTH ARGUMENT and 36 of
   * them end in `connect(out)`. Preview simply was not passing it.
   * ⚠️ AND `resume()` IS AWAITED. It returns a promise; the old code scheduled against `currentTime`
   * immediately after calling it, and a suspended context's clock does not advance, so on a phone the
   * first tap could schedule into the past. (Measured here the context was already `running`, so this
   * was not the fault — it is fixed because it is wrong, not because it was the cause.) */

  /* ═══ THE ▶ PLAYS WHAT Add GIVES YOU (queue 986, hunt C10) ═══════════════════════════════════════════
   * The ▶ used to render the recipe LIVE, raw, through the 0.82 trim, while Add renders it offline and
   * normalises it (0.89 × level ÷ its own peak). MEASURED in the suite's Chrome, the clip Add put on the
   * timeline was up to 9.9× louder than its ▶ (Reverse whoosh 0.09 → 0.89, Whoosh 7.8×, Swoosh-by 5.9×),
   * Click was 1.8× QUIETER, and Punch, Glass break and Reverse cymbal peaked OVER full scale on the ▶
   * (1.00–1.04) — so the list could not tell him how loud a sound would land. It also rendered at the
   * device's own rate, which seeds different noise than Add's 44.1 kHz.
   * So both paths take the same buffer: rendered once (renderBuffer, normalised), cached by id, played
   * at unity through an AudioBufferSource. `add` reuses the cache. The render is a few milliseconds;
   * FM.audioCtx() still runs inside the tap, before anything is awaited, because that call is what
   * unlocks audio on an iPhone (it resumes the context in the gesture — audio-fx-browser.js says the same).
   * Returns a promise that settles once the sound has been started (or refused), for the suite. */
  const _rendered = new Map();   // key -> Promise<AudioBuffer>; a handful at most, mono, a few seconds each
  const RENDER_CACHE_MAX = 8;
  /* Keyed by the sound AND its options (9.3): a 30 s Rain is not the 2.6 s one. A bed longer than 10 s is up to 10 MB, so
     at most two of those are kept (the oldest goes first). With no options the key is the id, as it always was. */
  const LONG_KEEP = 2;
  function cacheKey(def, opts) { const o = bedOpts(def, opts); return o ? def.id + '|' + JSON.stringify(o) : def.id; }
  function isLong(def, key) { const o = key === def.id ? null : bedOpts(def, JSON.parse(key.slice(def.id.length + 1))); return !!(o && (o.length || def.dur) > 10); }
  function rendered(def, opts) {
    const key = cacheKey(def, opts);
    let p = _rendered.get(key);
    if (p) { _rendered.delete(key); _rendered.set(key, p); return p; }   // most recent last
    p = renderBuffer(def, opts);
    _rendered.set(key, p);
    p.catch(() => { if (_rendered.get(key) === p) _rendered.delete(key); });   // a failed render is not remembered
    while (_rendered.size > RENDER_CACHE_MAX) _rendered.delete(_rendered.keys().next().value);
    const longs = [..._rendered.keys()].filter(k => { const d = byId(k.split('|')[0]); return d && isLong(d, k); });
    while (longs.length > LONG_KEEP) _rendered.delete(longs.shift());
    return p;
  }

  /* ONE preview at a time, and it knows its row (queue 986, hunt C12). The row's highlight used to be cleared
     by its own timer and nothing else, so hearing a second sound left the first row lit for the rest of its
     length, and nothing could stop a sound once started — tapping it again only restarted it. Now starting
     a sound stops the one before AND unlights its row at once, the highlight goes out when the sound really
     ends, and tapping the row that is playing stops it.
     KEYED BY THE SOUND, NOT BY ONE ROW (986 review). The ★ rebuilds the list, and a starred sound sits in
     two rows (Favourites and its category). Tied to the row that was tapped, the playing state was lost on
     a ★ tap — the sound played on with no lit row and a "Hear" ▶, so a tap restarted it instead of stopping
     it — and the other copy of a starred sound restarted it too. So every row of the playing sound is lit,
     a row built while it plays comes back lit (rowFor), and a tap on any of them stops it. */
  let _cur = null;   // { def, src } — the preview in flight, if any
  /* ▶ BECOMES ■ WHILE IT PLAYS (#482 polish 3.1). Since queue 986 a tap on the playing row stops it, but the button
     kept drawing ▶ — only its spoken label said Stop — so on screen the one control that stops a sound still promised
     to start one. Now the glyph says what a tap does. The square is 11 px of the triangle's 11 x 14 box, centred (the
     triangle's 1 px nudge right is optical centring for a triangle, and a square does not want it). */
  const PLAY_GLYPH = '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>';
  const STOP_GLYPH = '<svg viewBox="0 0 24 24" fill="currentColor"><rect x="6.5" y="6.5" width="11" height="11" rx="1.5"/></svg>';
  function paintRow(row, on, def) {
    row.classList.toggle('playing', !!on);
    const play = row.querySelector('.sfx-play');
    if (play) {
      const say = (on ? 'Stop ' : 'Hear ') + def.name;
      play.title = say; play.setAttribute('aria-label', say);
      const g = on ? 'stop' : 'play';
      if (play.dataset.glyph !== g) { play.dataset.glyph = g; play.innerHTML = on ? STOP_GLYPH : PLAY_GLYPH; }
    }
  }
  function markRow(def, on) {   // every row of this sound in the open sheet
    document.querySelectorAll('.sfx-row .sfx-star[data-sfxid]').forEach(star => {
      const row = star.dataset.sfxid === def.id && star.closest('.sfx-row');
      if (row) paintRow(row, on, def);
    });
  }
  function preview(def, opts) {
    stopPreview();
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) { if (FM.toast) FM.toast('This browser cannot play sound effects'); return Promise.resolve(false); }
    try {
      // THE one context (queue 740, hunt MEDIUM #23): audio-fx.js owns it and says never to construct another. This built a
      // second live AudioContext for previews and never closed it; iOS caps a page at about four, after which everything is silent.
      liveCtx = FM.audioCtx ? FM.audioCtx() : (liveCtx && liveCtx.state !== 'closed' ? liveCtx : new AC());
    } catch (e) {
      if (FM.reportError) FM.reportError('starting audio for a sound effect', e);   // queue 674
      if (FM.toast) FM.toast('Could not start audio \u2014 the details are in Settings \u2192 Last error \u2192 Copy', 6000);
      return Promise.resolve(false);
    }
    const me = { def: def, src: null };
    _cur = me;
    markRow(def, true);
    const ctx = liveCtx;
    const fail = (e) => {
      if (_cur === me) { _cur = null; markRow(def, false); }
      /* SAID, NOT SWALLOWED. A preview that fails silently is indistinguishable from one that works
         on a muted phone, which is exactly how this lasted. */
      if (FM.reportError) FM.reportError('playing the sound effect ' + def.name, e);   // queue 674
      if (FM.toast) FM.toast('Could not play ' + def.name + ' \u2014 the details are in Settings \u2192 Last error \u2192 Copy', 6000);
      return false;
    };
    const go = (buf) => {
      if (_cur !== me) return false;            // stopped, or another sound started, while this one rendered
      try {
        const src = ctx.createBufferSource();
        src.buffer = buf;                         // the very samples Add puts on the timeline, at unity
        src.connect(ctx.destination);
        src.onended = () => { if (_cur === me) { _cur = null; markRow(def, false); } try { src.disconnect(); } catch (e) {} };
        // A long bed (9.3) is heard for its first PREVIEW_MAX seconds; anything shorter starts exactly as it always did.
        if (buf.duration > PREVIEW_MAX) src.start(ctx.currentTime + 0.01, 0, PREVIEW_MAX); else src.start(ctx.currentTime + 0.01);
        me.src = src;
        return true;
      } catch (e) { return fail(e); }
    };
    return rendered(def, opts).then(buf => {
      if (_cur !== me) return false;
      if (ctx.state === 'suspended') return ctx.resume().then(() => go(buf), () => go(buf));
      return go(buf);
    }, fail);
  }
  function stopPreview() {
    const me = _cur;
    if (!me) return;
    _cur = null;
    if (me.src) { try { me.src.stop(); } catch (e) {} try { me.src.disconnect(); } catch (e) {} }
    markRow(me.def, false);
  }
  function previewing() { return _cur ? _cur.def.id : null; }   // suite seam: which sound is playing, if any

  // ---- add to the project -----------------------------------------------------------------------
  /* The clip's name says how it was made (backlog 9.2: "the file name records them"): "Rain (30 s, loop-ready).wav".
     With no options it is the sound's own name, as it always was. */
  function fileName(def, opts) {
    const o = bedOpts(def, opts);
    if (!o) return def.name + '.wav';
    const parts = [];
    if (o.length) parts.push((Math.round(o.length * 10) / 10) + ' s');
    if (o.intensity) parts.push(o.intensity);
    if (o.surface === 'roof') parts.push('on a roof');
    if (o.loop) parts.push('loop-ready');
    return def.name + ' (' + parts.join(', ') + ').wav';
  }
  async function add(def, opts) {
    /* 1176 leftover (the doors js/app.js handleFiles does not cover): A NEW BUILD WAITS UNTIL THE SOUND IS IN. The render and the
       load below take a moment (a long bed, seconds), with nothing showing busy, so a build landing then reloaded the app and the
       sound never arrived. Counted in FM._importing, which index.html's fmSwBusy reads, until the finally. The try is not
       re-indented, so the lines it wraps keep their history. */
    FM._importing = (FM._importing || 0) + 1;
    try {
    const buf = await rendered(def, opts);   // the buffer the ▶ played, when it has been heard (queue 986)
    const blob = encodeWav(buf);
    const name = fileName(def, opts);
    let file;
    try { file = new File([blob], name, { type: 'audio/wav' }); }
    catch (e) { file = blob; file.name = name; }   // very old Safari has no File constructor
    const rec = await FM.loadVideoFile(file);
    FM.addMediaLayer(rec);
    if (FM.toast) FM.toast('Added ' + def.name);
    } finally { FM._importing = Math.max(0, (FM._importing || 1) - 1); }
  }

  /* ---- the panel -------------------------------------------------------------------------------
   * Deliberately the notepad's shape (a scrim + a card), not a full-screen browser: this is a short
   * list you pick one thing from, and the effects browser's machinery — search, favourites, live
   * thumbnails — would be scaffolding around sixteen rows. Every row previews on tap and adds with a
   * button, because the whole difficulty with sound effects is that you cannot tell what one is from
   * its name. */
  function el(tag, cls, text) { const n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; }

  function close() { stopPreview(); document.querySelectorAll('.sfx-scrim').forEach(n => n.remove()); }

  /* ---------- STARRING (queue 311) ---------------------------------------------------------------
   * His words: *"Make it so you can star sound effects and they show up at the top of the sound effect
   * list"*. The visual effects browser has had this for ages (js/fx-browser.js), so this is the same
   * idea in the one place that lacked it rather than a new invention — same star, same "favourites
   * first" reading, its own key because the two lists share no ids.
   *
   * IDS FROM STORAGE ARE FILTERED THROUGH byId, NOT TRUSTED. That is not caution for its own sake: the
   * visual browser was taken down on open by exactly this, when a stored id of `toString` survived a
   * naive lookup and handed a FUNCTION to the tile builder. `byId` is a find over a real array, so an
   * id that is not a sound effect returns null and drops out here.
   */
  const FAV_KEY = 'fm.sfx.fav';
  function readFavs() {
    try {
      const a = JSON.parse(localStorage.getItem(FAV_KEY) || '[]');
      return Array.isArray(a) ? a.filter(id => !!byId(id)) : [];
    } catch (e) { return []; }
  }
  function writeFavs(a) { try { localStorage.setItem(FAV_KEY, JSON.stringify(a)); } catch (e) {} }
  /* bughunt7 #8 (bughunt6 #15's fault, here): readFavs filters for SHOWING only. The star wrote readFavs' answer back, so starring
     any sound deleted every favourite this build does not know (after a rollback, or a sound since retired). The star now edits
     the list as it is STORED: every string kept whatever it names, anything that is not a string dropped. What is drawn is
     still readFavs', through byId, so a stored 'toString' still never reaches a row. */
  function readStoredFavs() {
    try {
      const a = JSON.parse(localStorage.getItem(FAV_KEY) || '[]');
      return Array.isArray(a) ? a.filter(id => typeof id === 'string') : [];
    } catch (e) { return []; }
  }
  function isFav(id) { return readFavs().indexOf(id) >= 0; }
  function toggleFav(id) {
    if (!byId(id)) return false;
    const a = readStoredFavs(), i = a.indexOf(id);
    if (i >= 0) a.splice(i, 1); else a.push(id);
    writeFavs(a);
    return i < 0;
  }

  function open() {
    close();
    const scrim = el('div', 'sfx-scrim');
    const card = el('div', 'sfx-card');
    /* The signature travelling edge-light (queue 291). Same element shape and same CSS as the open
       project card and the add-menu tab wear — see .hm-glint / .am-glint in styles.css — so the three
       cannot drift apart into three slightly different signatures. */
    FM.glintRing(card, 'sfx-glint');
    card.setAttribute('role', 'dialog');
    card.setAttribute('aria-modal', 'true');
    card.setAttribute('aria-label', 'Sound effects');
    const head = el('div', 'sfx-head');
    head.appendChild(el('div', 'sfx-title', 'Sound effects'));
    card.appendChild(head);
    card.appendChild(el('div', 'sfx-hint', 'Tap a name to hear it. These are generated in the app, so they cost nothing to download.'));

    const body = el('div', 'sfx-list');
    /* ONE ROW BUILDER for both the favourites block and the categories. The obvious way to add a
       "starred at the top" section is to copy the row-building loop, and this file already carries a
       note about what happens when two things meant to be identical each get their own copy — the
       ★ would be wired in one of them and dead in the other the first time either changed. */
    function rowFor(def) {
      const row = el('div', 'sfx-row');
      const play = el('button', 'sfx-play');
      play.type = 'button';
      play.title = 'Hear ' + def.name;
      play.setAttribute('aria-label', 'Hear ' + def.name);
      play.innerHTML = PLAY_GLYPH; play.dataset.glyph = 'play';
      const name = el('button', 'sfx-name', def.name);
      name.type = 'button';
      const secs = el('span', 'sfx-dur', def.dur.toFixed(2).replace(/0$/, '') + 's');
      // Tap = hear it; tap a row of the sound that is playing = stop it (queue 986). preview() owns the highlight now.
      const hear = () => { if (_cur && _cur.def.id === def.id) { stopPreview(); return; } preview(def); };
      play.addEventListener('click', hear);
      name.addEventListener('click', hear);
      const star = el('button', 'sfx-star' + (isFav(def.id) ? ' on' : ''), '★');
      star.type = 'button';
      star.dataset.sfxid = def.id;
      star.title = isFav(def.id) ? 'Remove from favourites' : 'Favourite — starred sounds sit at the top';
      star.setAttribute('aria-pressed', isFav(def.id) ? 'true' : 'false');
      star.addEventListener('click', (e) => {
        e.stopPropagation();          // starring is not hearing
        toggleFav(def.id);
        /* REDRAWN IMMEDIATELY, not on the next open. He has already reported the other half of this
           once — *"when you save a preset you have to exit and go back into the menu, make it auto
           update the menu"* — and a star whose whole visible effect is a reordering that only happens
           later is the same complaint waiting to be made. The scroll position is carried across so the
           list does not jump out from under the finger that pressed it. */
        const top = body.scrollTop;
        fillList();
        body.scrollTop = top;
      });
      const addBtn = el('button', 'btn sfx-add', 'Add');
      addBtn.type = 'button';
      addBtn.addEventListener('click', async () => {
        addBtn.disabled = true; addBtn.textContent = '…';
        try { await add(def); close(); }
        catch (e) { addBtn.disabled = false; addBtn.textContent = 'Add'; if (FM.toast) FM.toast('Could not add that sound'); }
      });
      row.append(play, name, secs, star, addBtn);
      if (_cur && _cur.def.id === def.id) paintRow(row, true, def);   // rebuilt (the ★) while it plays: still lit, still Stop
      return row;
    }
    function fillList() {
      body.innerHTML = '';
      /* FAVOURITES FIRST — *"they show up at the top of the sound effect list"*. In the order they were
         starred, which is the order the stored list already holds; re-sorting them by name or category
         would make a list he built himself come back arranged by something else.
         The section only exists when something is in it: an empty "Favourites" heading above the real
         list is a row of nothing that pushes every actual sound down, which is the thing queue 301 was
         about. */
      const favs = readFavs().map(byId).filter(Boolean);
      if (favs.length) {
        body.appendChild(el('div', 'sfx-cat', '★ Favourites'));
        favs.forEach(def => body.appendChild(rowFor(def)));
      }
      categoriesOf().forEach(cat => {
        body.appendChild(el('div', 'sfx-cat', cat));
        SFX.filter(s => s.cat === cat).forEach(def => body.appendChild(rowFor(def)));
      });
    }
    fillList();
    card.appendChild(body);

    const actions = el('div', 'sfx-actions');
    const done = el('button', 'btn sfx-done', 'Close');
    done.addEventListener('click', close);
    actions.appendChild(done);
    card.appendChild(actions);

    scrim.appendChild(card);
    document.body.appendChild(scrim);
    scrim.addEventListener('pointerdown', e => { if (e.target === scrim) close(); });
  }
  function categoriesOf() { return SFX.reduce((a, s) => (a.indexOf(s.cat) < 0 ? a.concat(s.cat) : a), []); }

  FM.sfx = {
    _noiseBuffer: noiseBuffer,   // suite seam (queue 743)
    open: open,
    close: close,
    list: () => SFX.slice(),
    isFav: isFav, toggleFav: toggleFav, favs: readFavs,   // seams: the suite drives the real store
    categories: categoriesOf,
    byId: byId,
    renderBuffer: renderBuffer,   // exposed so the suite can measure what each recipe actually makes; (def, options) since 9.3
    /* What the options drawer (backlog 9.2, not drawn yet) can offer a sound (#482 polish 9.3 / 9.4): null for a sound with
       no bed, else { lengths, loop, and the extras with the values each takes }. */
    optionsFor: def => (def && typeof def.bed === 'function') ? Object.assign({ lengths: BED_LENGTHS.slice(), loop: true },
      ...(def.bedExtras || []).map(k => ({ [k]: BED_EXTRAS[k].slice() }))) : null,
    fileName: fileName,           // the clip name Add gives (def, options)
    PREVIEW_MAX: PREVIEW_MAX,     // seconds of a long bed the ▶ plays
    encodeWav: encodeWav,
    preview: preview,
    stopPreview: stopPreview,
    previewing: previewing,   // suite seam (queue 986): the id of the sound the ▶ is playing, or null
    add: add,
  };
  // #966 B4 / B5 / B12 / B13 — the new packs' seams, on lines of their own so batch 9's additions to the object above merge beside them.
  FM.sfx.variant = variant;                 // (def, options) → a sound with those options (or the row itself); preview / add / renderBuffer take it
  FM.sfx.packOptionsFor = packOptionsFor;   // what a pack sound can take, for the options drawer (9.2); null for the thirty older sounds
  FM.sfx.catIcon = catIcon;                 // a category's icon (placeholder SVG), or null
})(window.FM);
