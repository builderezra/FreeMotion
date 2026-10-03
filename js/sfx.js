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

  // Short drum voices reused by the one-shots and the two fills below. Every
  // voice is scheduled inside its own OfflineAudioContext, so Hear and Add agree.
  function drumKick(ctx, at, out, power) {
    const o = ctx.createOscillator(); o.type = 'sine';
    expTo(o.frequency, at, 150, 47, 0.28);
    const g = ctx.createGain(); env(g.gain, at, [[0, 0.95 * power], [0.13, 0.55 * power], [0.43, 0]]);
    o.connect(g); g.connect(out); o.start(at); o.stop(at + 0.44);
    const click = ctx.createBufferSource(); click.buffer = noiseBuffer(ctx, 0.018, 'white');
    const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 1800;
    const cg = ctx.createGain(); env(cg.gain, at, [[0, 0.23 * power], [0.017, 0]]);
    click.connect(hp); hp.connect(cg); cg.connect(out); click.start(at); click.stop(at + 0.018);
  }
  function drumSnare(ctx, at, out, power) {
    const n = ctx.createBufferSource(); n.buffer = noiseBuffer(ctx, 0.24, 'white');
    const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 2100; bp.Q.value = 0.8;
    const ng = ctx.createGain(); env(ng.gain, at, [[0, 0.85 * power], [0.04, 0.55 * power], [0.23, 0]]);
    n.connect(bp); bp.connect(ng); ng.connect(out); n.start(at); n.stop(at + 0.24);
    const o = ctx.createOscillator(); o.type = 'triangle'; o.frequency.value = 175;
    const og = ctx.createGain(); env(og.gain, at, [[0, 0.27 * power], [0.08, 0]]);
    o.connect(og); og.connect(out); o.start(at); o.stop(at + 0.08);
  }
  function drumHat(ctx, at, out, power) {
    const n = ctx.createBufferSource(); n.buffer = noiseBuffer(ctx, 0.15, 'white');
    const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 6800;
    const g = ctx.createGain(); env(g.gain, at, [[0, 0.85 * power], [0.07, 0.22 * power], [0.14, 0]]);
    n.connect(hp); hp.connect(g); g.connect(out); n.start(at); n.stop(at + 0.15);
  }
  function foleyClick(ctx, at, out, hz, power, length) {
    const n = ctx.createBufferSource(); n.buffer = noiseBuffer(ctx, length, 'white');
    const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = hz; bp.Q.value = 1.3;
    const g = ctx.createGain(); env(g.gain, at, [[0, 0], [0.003, power], [length, 0]]);
    n.connect(bp); bp.connect(g); g.connect(out); n.start(at); n.stop(at + length);
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
    // ---------- drums ----------
    { id: 'drum-kick', name: 'Kick', cat: 'Drums', level: 0.85, dur: 0.48,
      render(ctx, t0, d, out) { drumKick(ctx, t0, out, 1); } },
    { id: 'drum-snare', name: 'Snare', cat: 'Drums', level: 0.8, dur: 0.3,
      render(ctx, t0, d, out) { drumSnare(ctx, t0, out, 1); } },
    { id: 'drum-clap', name: 'Clap', cat: 'Drums', level: 0.75, dur: 0.38,
      render(ctx, t0, d, out) {
        const n = ctx.createBufferSource(); n.buffer = noiseBuffer(ctx, d, 'white');
        const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 1600; bp.Q.value = 0.65;
        const g = ctx.createGain();
        env(g.gain, t0, [[0, 0.75], [0.02, 0], [0.035, 0.6], [0.06, 0], [0.075, 0.9], [0.13, 0.45], [d, 0]]);
        n.connect(bp); bp.connect(g); g.connect(out); n.start(t0); n.stop(t0 + d);
      } },
    { id: 'drum-hat', name: 'Hi-hat', cat: 'Drums', level: 0.5, dur: 0.2,
      render(ctx, t0, d, out) { drumHat(ctx, t0, out, 1); } },
    { id: 'drum-rimshot', name: 'Ba-dum-tss', cat: 'Drums', level: 0.82, dur: 0.9,
      render(ctx, t0, d, out) {
        drumKick(ctx, t0, out, 0.65); drumKick(ctx, t0 + 0.23, out, 0.85);
        drumHat(ctx, t0 + 0.53, out, 1.1);
      } },
    { id: 'drum-roll', name: 'Drumroll', cat: 'Drums', level: 0.82, dur: 1.55,
      render(ctx, t0, d, out) {
        for (let i = 0; i < 12; i++) {
          const at = i * 0.105 - i * i * 0.0025;
          drumSnare(ctx, t0 + at, out, 0.3 + i * 0.045);
        }
        drumSnare(ctx, t0 + 1.1, out, 1);
      } },
    // Size, length and variation are set in the picker. Each setting combination
    // gets its own render-cache key, so the preview is the WAV Add will insert.
    { id: 'explosion', name: 'Explosion', cat: 'Impact', dur: 2.2, variant: true,
      render(ctx, t0, d, out, options) {
        options = options || { size: 'big', variation: 1 };
        const big = options.size === 'big', v = options.variation;
        const n = ctx.createBufferSource(); n.buffer = noiseBuffer(ctx, d, 'brown');
        const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = (big ? 650 : 1400) + v * 95;
        const g = ctx.createGain(); env(g.gain, t0, [[0, 0.95], [Math.min(0.08, d * 0.08), 0.8], [d * 0.42, 0.4], [d, 0]]);
        n.connect(lp); lp.connect(g); g.connect(out); n.start(t0); n.stop(t0 + d);
        const sub = ctx.createOscillator(); sub.type = 'sine';
        expTo(sub.frequency, t0, big ? 95 + v * 4 : 150 + v * 8, big ? 28 : 50, Math.min(d * 0.7, 1.5));
        const sg = ctx.createGain(); env(sg.gain, t0, [[0, big ? 0.8 : 0.45], [d * 0.6, 0.18], [d, 0]]);
        sub.connect(sg); sg.connect(out); sub.start(t0); sub.stop(t0 + d);
      } },
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
    },
    {
      id: 'fire', name: 'Fire crackle', cat: 'Nature', dur: 2.4,
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
    { id: 'thunder', name: 'Thunder', cat: 'Nature', dur: 3, variant: true,
      render(ctx, t0, d, out, options) {
        options = options || { size: 'big', variation: 1 };
        const big = options.size === 'big', v = options.variation;
        const n = ctx.createBufferSource(); n.buffer = noiseBuffer(ctx, d, 'brown');
        const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = (big ? 460 : 850) + v * 65;
        const g = ctx.createGain();
        env(g.gain, t0, [[0, 0], [d * 0.08, 0.8], [d * (0.25 + v * 0.035), 0.45], [d * 0.62, 0.58], [d, 0]]);
        n.connect(lp); lp.connect(g); g.connect(out); n.start(t0); n.stop(t0 + d);
        const crack = ctx.createBufferSource(); crack.buffer = noiseBuffer(ctx, Math.min(0.16, d * 0.12), 'white');
        const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 1200 + v * 210;
        const cg = ctx.createGain(); env(cg.gain, t0, [[0, big ? 0.8 : 0.45], [Math.min(0.15, d * 0.11), 0]]);
        crack.connect(hp); hp.connect(cg); cg.connect(out); crack.start(t0); crack.stop(t0 + Math.min(0.16, d * 0.12));
      } },
    // Long, synthesised atmosphere beds. Lower catalogue levels leave room for dialogue and music.
    { id: 'amb-ocean', name: 'Ocean surf', cat: 'Ambience', dur: 8, level: 0.42,
      render(ctx, t0, d, out) {
        const low = ctx.createBufferSource(); low.buffer = noiseBuffer(ctx, d, 'brown');
        const lowpass = ctx.createBiquadFilter(); lowpass.type = 'lowpass'; lowpass.frequency.value = 520;
        const lg = ctx.createGain(); env(lg.gain, t0, [[0, 0], [0.7, 0.38], [2.5, 0.7], [4.2, 0.22], [6.4, 0.63], [d, 0]]);
        low.connect(lowpass); lowpass.connect(lg); lg.connect(out); low.start(t0); low.stop(t0 + d);
        const foam = ctx.createBufferSource(); foam.buffer = noiseBuffer(ctx, d, 'pink');
        const band = ctx.createBiquadFilter(); band.type = 'bandpass'; band.Q.value = 0.6;
        env(band.frequency, t0, [[0, 850], [2.2, 1800], [4.4, 700], [6.3, 2100], [d, 850]]);
        const fg = ctx.createGain(); env(fg.gain, t0, [[0, 0], [0.8, 0.08], [2.4, 0.48], [4.2, 0.06], [6.4, 0.42], [d, 0]]);
        foam.connect(band); band.connect(fg); fg.connect(out); foam.start(t0); foam.stop(t0 + d);
      } },
    { id: 'amb-crickets', name: 'Crickets at night', cat: 'Ambience', dur: 8, level: 0.35,
      render(ctx, t0, d, out) {
        const air = ctx.createBufferSource(); air.buffer = noiseBuffer(ctx, d, 'pink');
        const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 1100;
        const ag = ctx.createGain(); env(ag.gain, t0, [[0, 0], [0.25, 0.1], [d - 0.3, 0.1], [d, 0]]);
        air.connect(lp); lp.connect(ag); ag.connect(out); air.start(t0); air.stop(t0 + d);
        for (let i = 0; i < 28; i++) {
          const at = 0.36 + i * 0.26 + (i % 4) * 0.035, len = 0.085 + (i % 3) * 0.018;
          if (at + len >= d) break;
          const o = ctx.createOscillator(); o.type = 'sine';
          const hz = 3900 + (i % 5) * 170;
          env(o.frequency, t0 + at, [[0, hz], [len, hz + 150]]);
          const g = ctx.createGain(); env(g.gain, t0 + at, [[0, 0], [0.012, 0.18], [len * 0.65, 0.15], [len, 0]]);
          o.connect(g); g.connect(out); o.start(t0 + at); o.stop(t0 + at + len);
        }
      } },
    { id: 'amb-birds', name: 'Morning birds', cat: 'Ambience', dur: 8, level: 0.4,
      render(ctx, t0, d, out) {
        const air = ctx.createBufferSource(); air.buffer = noiseBuffer(ctx, d, 'pink');
        const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 1200; bp.Q.value = 0.5;
        const ag = ctx.createGain(); env(ag.gain, t0, [[0, 0], [0.3, 0.09], [d - 0.3, 0.09], [d, 0]]);
        air.connect(bp); bp.connect(ag); ag.connect(out); air.start(t0); air.stop(t0 + d);
        [0.45, 0.72, 1.65, 2.01, 2.38, 3.45, 3.76, 4.68, 5.01, 5.38, 6.22, 6.59, 7.13].forEach((at, i) => {
          const len = 0.18 + (i % 3) * 0.07, base = 1700 + (i % 4) * 280;
          const o = ctx.createOscillator(); o.type = 'sine';
          env(o.frequency, t0 + at, [[0, base], [len * 0.35, base * 1.38], [len, base * 1.08]]);
          const g = ctx.createGain(); env(g.gain, t0 + at, [[0, 0], [0.035, 0.23], [len * 0.6, 0.18], [len, 0]]);
          o.connect(g); g.connect(out); o.start(t0 + at); o.stop(t0 + at + len);
        });
      } },
    { id: 'amb-room', name: 'Room tone', cat: 'Ambience', dur: 8, level: 0.25,
      render(ctx, t0, d, out) {
        const air = ctx.createBufferSource(); air.buffer = noiseBuffer(ctx, d, 'pink');
        const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 90;
        const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 3200;
        const g = ctx.createGain(); env(g.gain, t0, [[0, 0], [0.25, 0.2], [d - 0.25, 0.2], [d, 0]]);
        air.connect(hp); hp.connect(lp); lp.connect(g); g.connect(out); air.start(t0); air.stop(t0 + d);
        const hum = ctx.createOscillator(); hum.type = 'sine'; hum.frequency.value = 60;
        const hg = ctx.createGain(); env(hg.gain, t0, [[0, 0], [0.25, 0.008], [d - 0.25, 0.008], [d, 0]]);
        hum.connect(hg); hg.connect(out); hum.start(t0); hum.stop(t0 + d);
      } },
    // Everyday sounds use short, varied events rather than replaying one identical sample.
    { id: 'foley-knock', name: 'Door knock', cat: 'Foley', dur: 0.72, level: 0.68,
      render(ctx, t0, d, out) {
        [0.04, 0.3].forEach((at, i) => {
          foleyClick(ctx, t0 + at, out, 650 - i * 80, 0.55, 0.095);
          const wood = ctx.createOscillator(); wood.type = 'triangle'; wood.frequency.value = 160 - i * 10;
          const g = ctx.createGain(); env(g.gain, t0 + at, [[0, 0.42], [0.13, 0]]);
          wood.connect(g); g.connect(out); wood.start(t0 + at); wood.stop(t0 + at + 0.13);
        });
      } },
    { id: 'foley-footsteps', name: 'Footsteps', cat: 'Foley', dur: 1.8, level: 0.58,
      render(ctx, t0, d, out) {
        for (let i = 0; i < 5; i++) {
          const at = t0 + 0.08 + i * 0.34, power = i % 2 ? 0.43 : 0.58;
          const n = ctx.createBufferSource(); n.buffer = noiseBuffer(ctx, 0.16, 'brown');
          const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 500 + (i % 3) * 100;
          const g = ctx.createGain(); env(g.gain, at, [[0, 0], [0.014, power], [0.16, 0]]);
          n.connect(lp); lp.connect(g); g.connect(out); n.start(at); n.stop(at + 0.16);
          foleyClick(ctx, at, out, 1200 + (i % 3) * 170, power * 0.25, 0.055);
        }
      } },
    { id: 'foley-clock', name: 'Tick-tock', cat: 'Foley', dur: 2, level: 0.43,
      render(ctx, t0, d, out) {
        for (let i = 0; i < 4; i++) {
          const at = t0 + 0.12 + i * 0.46;
          foleyClick(ctx, at, out, i % 2 ? 1250 : 2100, i % 2 ? 0.34 : 0.48, 0.055);
        }
      } },
    { id: 'foley-vibrate', name: 'Phone vibrate', cat: 'Foley', dur: 1.05, level: 0.48,
      render(ctx, t0, d, out) {
        [0.04, 0.35, 0.66].forEach((at, i) => {
          const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = 145 + i * 5;
          const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 650;
          const g = ctx.createGain(); env(g.gain, t0 + at, [[0, 0], [0.018, 0.25], [0.19, 0.23], [0.22, 0]]);
          o.connect(lp); lp.connect(g); g.connect(out); o.start(t0 + at); o.stop(t0 + at + 0.22);
        });
      } },
    { id: 'foley-typing', name: 'Typing', cat: 'Foley', dur: 1.65, level: 0.45,
      render(ctx, t0, d, out) {
        [0.08, 0.2, 0.35, 0.46, 0.59, 0.77, 0.88, 1.03, 1.17, 1.3, 1.42].forEach((at, i) => {
          foleyClick(ctx, t0 + at, out, 1900 + (i % 4) * 370, 0.28 + (i % 3) * 0.05, 0.045);
        });
      } },
    { id: 'foley-kaching', name: 'Ka-ching', cat: 'Foley', dur: 1.4, level: 0.65,
      render(ctx, t0, d, out) {
        foleyClick(ctx, t0 + 0.02, out, 1400, 0.6, 0.08);
        [870, 1340, 2050].forEach((hz, i) => {
          const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.value = hz;
          const g = ctx.createGain(); env(g.gain, t0 + 0.14, [[0, 0], [0.008, 0.26 - i * 0.05], [0.45, 0.12 - i * 0.025], [1.2, 0]]);
          o.connect(g); g.connect(out); o.start(t0 + 0.14); o.stop(t0 + 1.34);
        });
      } },
  ];

  const variantOptions = new Map();
  function variantOf(def, input) {
    if (!def || !def.variant) return def;
    input = input || {};
    const size = input.size === 'small' ? 'small' : 'big';
    const length = Math.max(0.8, Math.min(5, Math.round((Number(input.length) || def.dur) * 10) / 10));
    const variation = Math.max(1, Math.min(4, Math.round(Number(input.variation) || 1)));
    return Object.assign({}, def, {
      id: def.id + ':' + size + ':' + length.toFixed(1) + ':' + variation,
      baseId: def.id, dur: length, variant: false,
      render(ctx, t0, d, out) { def.render(ctx, t0, d, out, { size, variation }); },
    });
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

  function renderBuffer(def) {
    const ctx = offlineCtx(def.dur + 0.05);
    if (!ctx) return Promise.reject(new Error('no OfflineAudioContext'));
    // Everything the recipes connect to goes through the trim first.
    const trim = ctx.createGain(); trim.gain.value = MASTER;
    trim.connect(ctx.destination);
    def.render(ctx, 0, def.dur, trim);
    return ctx.startRendering().then(buf => normalise(buf, def.level));
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
  const _rendered = new Map();   // id -> Promise<AudioBuffer>; a handful at most, mono, a few seconds each
  const RENDER_CACHE_MAX = 8;
  function rendered(def) {
    let p = _rendered.get(def.id);
    if (p) { _rendered.delete(def.id); _rendered.set(def.id, p); return p; }   // most recent last
    p = renderBuffer(def);
    _rendered.set(def.id, p);
    p.catch(() => { if (_rendered.get(def.id) === p) _rendered.delete(def.id); });   // a failed render is not remembered
    while (_rendered.size > RENDER_CACHE_MAX) _rendered.delete(_rendered.keys().next().value);
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
      const row = star.dataset.sfxid === (def.baseId || def.id) && star.closest('.sfx-row');
      if (row) paintRow(row, on, def);
    });
  }
  function preview(def) {
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
        src.start(ctx.currentTime + 0.01);
        me.src = src;
        return true;
      } catch (e) { return fail(e); }
    };
    return rendered(def).then(buf => {
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
  function previewing() { return _cur ? (_cur.def.baseId || _cur.def.id) : null; }   // suite seam: which sound is playing, if any

  // ---- add to the project -----------------------------------------------------------------------
  async function add(def) {
    const buf = await rendered(def);   // the buffer the ▶ played, when it has been heard (queue 986)
    const blob = encodeWav(buf);
    const name = def.name + '.wav';
    let file;
    try { file = new File([blob], name, { type: 'audio/wav' }); }
    catch (e) { file = blob; file.name = name; }   // very old Safari has no File constructor
    const rec = await FM.loadVideoFile(file);
    FM.addMediaLayer(rec);
    if (FM.toast) FM.toast('Added ' + def.name);
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
  function isFav(id) { return readFavs().indexOf(id) >= 0; }
  function toggleFav(id) {
    if (!byId(id)) return false;
    const a = readFavs(), i = a.indexOf(id);
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
      const chosen = () => variantOf(def, variantOptions.get(def.id));
      const hear = () => { if (_cur && (_cur.def.baseId || _cur.def.id) === def.id) { stopPreview(); return; } preview(chosen()); };
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
        try { await add(chosen()); close(); }
        catch (e) { addBtn.disabled = false; addBtn.textContent = 'Add'; if (FM.toast) FM.toast('Could not add that sound'); }
      });
      row.append(play, name, secs, star, addBtn);
      if (_cur && (_cur.def.baseId || _cur.def.id) === def.id) paintRow(row, true, def);   // rebuilt (the ★) while it plays: still lit, still Stop
      if (!def.variant) return row;
      const opts = variantOptions.get(def.id) || { size: 'big', length: def.dur, variation: 1 };
      variantOptions.set(def.id, opts);
      secs.textContent = opts.length.toFixed(1) + 's';
      const card = el('div', 'sfx-variant-card'); card.dataset.sfxid = def.id;
      const controls = el('div', 'sfx-variant-controls');
      const size = document.createElement('select'); size.className = 'sfx-size'; size.setAttribute('aria-label', def.name + ' size');
      [['small', 'Small'], ['big', 'Big']].forEach(([value, label]) => { const o = document.createElement('option'); o.value = value; o.textContent = label; size.appendChild(o); });
      size.value = opts.size;
      const length = document.createElement('input'); length.className = 'sfx-length'; length.type = 'range'; length.min = '0.8'; length.max = '5'; length.step = '0.1'; length.value = String(opts.length);
      length.setAttribute('aria-label', def.name + ' length in seconds');
      const variation = document.createElement('select'); variation.className = 'sfx-variation'; variation.setAttribute('aria-label', def.name + ' variation');
      for (let n = 1; n <= 4; n++) { const o = document.createElement('option'); o.value = String(n); o.textContent = 'Variation ' + n; variation.appendChild(o); }
      variation.value = String(opts.variation);
      const update = () => {
        opts.size = size.value; opts.length = Number(length.value); opts.variation = Number(variation.value);
        document.querySelectorAll('.sfx-variant-card').forEach(copy => {
          if (copy.dataset.sfxid !== def.id) return;
          copy.querySelector('.sfx-size').value = opts.size;
          copy.querySelector('.sfx-length').value = String(opts.length);
          copy.querySelector('.sfx-variation').value = String(opts.variation);
          copy.querySelector('.sfx-dur').textContent = opts.length.toFixed(1) + 's';
        });
        if (_cur && (_cur.def.baseId || _cur.def.id) === def.id) stopPreview();
      };
      size.addEventListener('change', update); length.addEventListener('input', update); variation.addEventListener('change', update);
      controls.append(size, el('span', 'sfx-length-label', 'Length'), length, variation);
      card.append(row, controls);
      return card;
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
    variantOf: variantOf,
    renderBuffer: renderBuffer,   // exposed so the suite can measure what each recipe actually makes
    encodeWav: encodeWav,
    preview: preview,
    stopPreview: stopPreview,
    previewing: previewing,   // suite seam (queue 986): the id of the sound the ▶ is playing, or null
    add: add,
  };
})(window.FM);
